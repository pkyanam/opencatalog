/*
 * opencatalog.sh — Public submission API endpoint.
 *
 * POST /api/submit
 *
 * Accepts a candidate entry from anyone — human, AI agent, scraper, or
 * community member. No auth required. Submissions are stored in Upstash
 * Redis as "pending" entries, then synced to git by a scheduled GitHub
 * Action that creates PRs for review.
 *
 * Rate limiting: IP-based, stored in Redis. 10 submissions per IP per hour.
 *
 * Flow:
 *   POST /api/submit → validate → store in Redis (pending:<id>)
 *                      → return submission ID
 *
 *   GitHub Action (every 2 hours) → pull pending entries from Redis
 *                                 → write to staging/ as candidate files
 *                                 → create PR for review
 *                                 → mark entries as "synced" in Redis
 *
 * Environment (auto-provisioned by Vercel when you create an Upstash Redis
 * store via the Storage marketplace):
 *   KV_REST_API_URL — Upstash Redis REST endpoint
 *   KV_REST_API_TOKEN — Upstash Redis auth token
 *
 * If Redis is not configured, the endpoint returns 503 with instructions.
 */

import { Redis } from "@upstash/redis";
import { Candidate, type Candidate as CandidateType } from "@/lib/candidate-schema";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

const RATE_LIMIT_PER_HOUR = 10;

function getRedis(): Redis | null {
  // Vercel marketplace auto-provisions KV_REST_API_URL / KV_REST_API_TOKEN
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

// ─── Rate limiting ─────────────────────────────────────────────────────────

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

// ─── POST: submit a candidate ──────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  const redis = getRedis();
  if (!redis) {
    return Response.json(
      {
        ok: false,
        error:
          "Redis not configured. Create an Upstash Redis store (via upstash.com or Vercel Storage marketplace) and set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars.",
      },
      { status: 503 },
    );
  }

  // Rate limit
  const ip = getClientIp(request);
  const rateLimitKey = `ratelimit:submit:${ip}`;
  const count = await redis.incr(rateLimitKey);
  if (count === 1) {
    await redis.expire(rateLimitKey, 3600);
  }
  if (count > RATE_LIMIT_PER_HOUR) {
    return Response.json(
      {
        ok: false,
        error: `Rate limit exceeded. ${RATE_LIMIT_PER_HOUR} submissions per hour. Try again later.`,
      },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }
  const remaining = Math.max(0, RATE_LIMIT_PER_HOUR - count);

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  // Determine submitter info from headers (optional, no auth required)
  const sourceHeader = request.headers.get("x-submit-source");
  const identityHeader = request.headers.get("x-submit-identity");
  const source = (sourceHeader as CandidateType["submitter"]["source"]) || "community-pr";
  const identity = identityHeader || `ip:${ip}`;

  // Add submitter block
  const candidateWithSubmitter = {
    ...(body as Record<string, unknown>),
    submitter: {
      source,
      identity,
      submittedAt: new Date().toISOString(),
    },
  };

  // Validate against candidate schema
  const result = Candidate.safeParse(candidateWithSubmitter);
  if (!result.success) {
    return Response.json(
      {
        ok: false,
        error: "Candidate validation failed",
        errors: result.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  const candidate = result.data;

  // Check for duplicate slug in pending queue
  const existing = await redis.get(`pending:slug:${candidate.slug}`);
  if (existing) {
    return Response.json(
      { ok: false, error: `A pending submission already exists for slug "${candidate.slug}"` },
      { status: 409 },
    );
  }

  // Store in Redis
  const submissionId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await redis.set(`pending:${submissionId}`, JSON.stringify(candidate));
  await redis.set(`pending:slug:${candidate.slug}`, submissionId);
  await redis.sadd("pending:queue", submissionId);

  return Response.json(
    {
      ok: true,
      submissionId,
      slug: candidate.slug,
      kind: candidate.kind,
      message: "Submission received and queued for review. It will appear as a GitHub PR after the next sync.",
      rateLimit: { remaining: remaining - 1, limit: RATE_LIMIT_PER_HOUR },
    },
    { status: 201 },
  );
}

// ─── GET: API docs ─────────────────────────────────────────────────────────

export async function GET(): Promise<Response> {
  return Response.json({
    endpoint: "POST /api/submit",
    description: "Submit a candidate entry to opencatalog.sh. Public, no auth required.",
    rateLimit: `${RATE_LIMIT_PER_HOUR} submissions per IP per hour`,
    headers: {
      "Content-Type": "application/json",
      "X-Submit-Source": "optional: manual | ai-agent | scraper | community-pr",
      "X-Submit-Identity": "optional: your name or agent identifier",
    },
    body: {
      kind: "required: alternative | paid-product | category | license",
      slug: "required: URL-friendly identifier",
      name: "required: display name",
      description: "required: what this is",
      "...": "see src/lib/candidate-schema.ts for full schema",
    },
    response: {
      "201": "Submission queued",
      "400": "Validation error",
      "429": "Rate limited",
      "503": "Redis not configured",
    },
    flow: "POST -> Redis queue -> GitHub Action syncs to staging/ -> PR for review -> enrich -> promote -> curated/",
  });
}
