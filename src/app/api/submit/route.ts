/*
 * opencatalog.sh — Submission API endpoint.
 *
 * POST /api/submit
 *
 * Accepts a candidate entry (JSON body matching the candidate schema, minus
 * the submitter block which is filled from request context). Writes the
 * candidate to staging/ as a JSON file.
 *
 * This endpoint is NOT statically generated — it's a runtime endpoint that
 * requires a server. On Vercel, this runs as a serverless function.
 *
 * Authentication:
 *   - Bearer token via SUBMIT_TOKEN env var (if set)
 *   - If SUBMIT_TOKEN is not set, submissions are rejected in production
 *     and allowed only in development
 *
 * Rate limiting:
 *   - Relies on Vercel's edge rate limiting in production
 *   - No in-app rate limiting (keep it simple for now)
 *
 * Response:
 *   201 Created — { ok: true, slug, stagingPath }
 *   400 Bad Request — { ok: false, errors: [...] }
 *   401 Unauthorized — { ok: false, error: "..." }
 *   409 Conflict — { ok: false, error: "entry already exists" }
 *   500 Internal Error — { ok: false, error: "..." }
 */

import { writeFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { Candidate, candidateFilePath, type Candidate as CandidateType } from "@/lib/candidate-schema";

export const dynamic = "force-dynamic";

function authenticate(request: Request): { ok: boolean; error?: string; source?: string; identity?: string } {
  const submitToken = process.env.SUBMIT_TOKEN;
  const isProduction = process.env.NODE_ENV === "production";

  if (!submitToken) {
    if (isProduction) {
      return { ok: false, error: "SUBMIT_TOKEN not configured — submissions disabled in production" };
    }
    // Dev mode: allow without token
    return { ok: true, source: "manual", identity: "dev-mode" };
  }

  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return { ok: false, error: "Missing or invalid Authorization header (expected: Bearer <token>)" };
  }

  const token = auth.slice(7);
  if (token !== submitToken) {
    return { ok: false, error: "Invalid token" };
  }

  // Determine source from header or default
  const sourceHeader = request.headers.get("x-submit-source");
  const identityHeader = request.headers.get("x-submit-identity");
  const source = (sourceHeader as CandidateType["submitter"]["source"]) || "ai-agent";
  const identity = identityHeader || "api";

  return { ok: true, source, identity };
}

export async function POST(request: Request): Promise<Response> {
  // Authenticate
  const auth = authenticate(request);
  if (!auth.ok) {
    return Response.json({ ok: false, error: auth.error }, { status: 401 });
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  // Add submitter block
  const candidateWithSubmitter = {
    ...(body as Record<string, unknown>),
    submitter: {
      source: auth.source,
      identity: auth.identity,
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
  const stagingPath = candidateFilePath(candidate);
  const fullPath = path.join(process.cwd(), stagingPath);

  // Check if already exists
  try {
    await stat(fullPath);
    return Response.json(
      { ok: false, error: `Entry already exists: ${stagingPath}` },
      { status: 409 },
    );
  } catch {
    // Good — doesn't exist
  }

  // Write to staging
  try {
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, `${JSON.stringify(candidate, null, 2)}\n`);
  } catch (err) {
    return Response.json(
      { ok: false, error: `Failed to write staging file: ${err}` },
      { status: 500 },
    );
  }

  return Response.json(
    {
      ok: true,
      slug: candidate.slug,
      kind: candidate.kind,
      stagingPath,
      message: "Candidate submitted to staging. Run enrich + promote to publish.",
    },
    { status: 201 },
  );
}

// GET endpoint returns API docs
export async function GET(): Promise<Response> {
  return Response.json({
    endpoint: "POST /api/submit",
    description: "Submit a candidate entry to the opencatalog.sh staging queue",
    auth: "Bearer token via SUBMIT_TOKEN env var (required in production)",
    headers: {
      "Authorization": "Bearer <token>",
      "X-Submit-Source": "manual | ai-agent | scraper | community-pr",
      "X-Submit-Identity": "string identifying the submitter",
    },
    body: "Candidate JSON (see /api.schema.json for the full schema, or src/lib/candidate-schema.ts)",
    response: {
      "201": "Candidate created in staging/",
      "400": "Validation error",
      "401": "Authentication failed",
      "409": "Entry already exists",
    },
  });
}
