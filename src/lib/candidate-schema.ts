import { z } from "zod";

/*
 * opencatalog.sh — Candidate submission schema.
 *
 * This is the relaxed schema for entries entering the pipeline via CLI,
 * API, scraper, or community PR. It allows partial data — the enrichment
 * and promotion steps fill in gaps and upgrade to the full curated schema.
 *
 * Key differences from the curated schema:
 * - Fields are optional where the curated schema requires them
 * - `basis` defaults to "claimed" (enrichment upgrades to "probed"/"cited")
 * - `sources` can be empty (enrichment adds them)
 * - `generatedAt` and `verified` are set by the pipeline, not the submitter
 * - A `submitter` block records provenance
 * - A `kind` field distinguishes the entity type
 *
 * The pipeline:
 *   candidate → validate-staging → enrich → promote → curated record
 */

export const CandidateKind = z.enum(["paid-product", "alternative", "category", "license"]);
export type CandidateKind = z.infer<typeof CandidateKind>;

export const Submitter = z.object({
  source: z.enum(["manual", "ai-agent", "scraper", "community-pr"]),
  identity: z.string().min(1).max(120).describe("Who/what submitted this (e.g. 'pkyanam', 'claude-sonnet-4', 'github-trending-scraper')"),
  submittedAt: z.string().datetime().describe("ISO timestamp of submission"),
  notes: z.string().max(500).optional().describe("Free-form notes from the submitter"),
});
export type Submitter = z.infer<typeof Submitter>;

export const CandidateSource = z.object({
  url: z.string().url(),
  label: z.string().min(1).max(120),
  basis: z.enum(["probed", "cited", "claimed"]).default("claimed"),
  fetchedAt: z.string().datetime().optional(),
});
export type CandidateSource = z.infer<typeof CandidateSource>;

// ─── Paid product candidate ────────────────────────────────────────────────

export const PaidProductCandidate = z.object({
  kind: z.literal("paid-product"),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/).max(80).describe("URL slug, e.g. 'adobe-photoshop'"),
  name: z.string().min(1).max(120),
  tagline: z.string().max(200).optional(),
  description: z.string().min(10).max(2000),
  category: z.string().min(1).describe("Primary category slug"),
  secondaryCategories: z.array(z.string()).default([]),
  pricingShape: z.string().min(1).max(80).describe("e.g. 'subscription', 'perpetual license', 'freemium'"),
  pricingNote: z.string().max(300).optional(),
  workflows: z.array(
    z.object({
      slug: z.string().min(1).max(80),
      label: z.string().min(1).max(120),
    }),
  ).min(1).describe("Workflows this product supports"),
  rankedAlternativeSlugs: z.array(z.string()).min(1).describe("Slugs of alternatives that replace this product"),
  exportImport: z.object({
    formats: z.array(z.string()).default([]),
    apis: z.array(z.string().url()).default([]),
    note: z.string().max(500).optional(),
    basis: z.enum(["probed", "cited", "claimed"]).default("claimed"),
  }).optional(),
  sources: z.array(CandidateSource).default([]),
  submitter: Submitter,
});
export type PaidProductCandidate = z.infer<typeof PaidProductCandidate>;

// ─── Alternative candidate ─────────────────────────────────────────────────

export const InstallPathCandidate = z.object({
  platform: z.string().min(1).max(60),
  kind: z.string().min(1).max(60).describe("e.g. 'homebrew', 'flatpak', 'docker', 'binary'"),
  command: z.string().max(300).optional(),
  url: z.string().url().optional(),
  note: z.string().max(300).optional(),
  basis: z.enum(["probed", "cited", "claimed"]).default("claimed"),
});

export const MaturitySignalCandidate = z.object({
  kind: z.string().min(1).max(60).describe("e.g. 'repo-stars', 'last-release', 'contributors'"),
  value: z.string().min(1).max(120),
  probedAt: z.string().datetime().optional().describe("When this signal was last probed (enrichment fills this)"),
  stale: z.boolean().default(false),
});

export const KnownGapCandidate = z.object({
  slug: z.string().min(1).max(80),
  label: z.string().min(1).max(120),
  description: z.string().min(10).max(500),
  severity: z.enum(["blocking", "minor", "cosmetic"]).optional(),
  basis: z.enum(["probed", "cited", "claimed"]).default("claimed"),
  sources: z.array(CandidateSource).default([]),
});

export const AlternativeCandidate = z.object({
  kind: z.literal("alternative"),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/).max(80),
  name: z.string().min(1).max(120),
  tagline: z.string().max(200).optional(),
  description: z.string().min(10).max(2000),
  categories: z.array(z.string()).min(1),
  replaces: z.array(z.string()).min(1).describe("Slugs of paid products this replaces"),
  licenseSlug: z.string().min(1).describe("License slug from curated licenses"),
  deployment: z.array(z.string()).min(1).describe("e.g. ['self-hosted', 'desktop', 'web']"),
  installPaths: z.array(InstallPathCandidate).default([]).describe("Enrichment can fill these"),
  maturity: z.array(MaturitySignalCandidate).default([]),
  knownGaps: z.array(KnownGapCandidate).default([]),
  sources: z.array(CandidateSource).default([]),
  submitter: Submitter,
});
export type AlternativeCandidate = z.infer<typeof AlternativeCandidate>;

// ─── Category candidate ────────────────────────────────────────────────────

export const CategoryCandidate = z.object({
  kind: z.literal("category"),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/).max(80),
  name: z.string().min(1).max(120),
  definition: z.string().min(10).max(500),
  primaryWorkflows: z.array(z.string()).default([]),
  neighborCategories: z.array(z.string()).default([]),
  sources: z.array(CandidateSource).default([]),
  submitter: Submitter,
});
export type CategoryCandidate = z.infer<typeof CategoryCandidate>;

// ─── License candidate ─────────────────────────────────────────────────────

export const LicenseCandidate = z.object({
  kind: z.literal("license"),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/).max(80),
  name: z.string().min(1).max(120),
  spdxId: z.string().min(1).max(40).describe("SPDX identifier, e.g. 'AGPL-3.0'"),
  osiApproved: z.boolean(),
  permits: z.array(z.string()).default([]),
  requires: z.array(z.string()).default([]),
  practicalCallout: z.string().max(500).optional(),
  networkDeploymentNote: z.string().max(500).optional(),
  sources: z.array(CandidateSource).default([]),
  submitter: Submitter,
});
export type LicenseCandidate = z.infer<typeof LicenseCandidate>;

// ─── Discriminated union ───────────────────────────────────────────────────

export const Candidate = z.discriminatedUnion("kind", [
  PaidProductCandidate,
  AlternativeCandidate,
  CategoryCandidate,
  LicenseCandidate,
]);
export type Candidate = z.infer<typeof Candidate>;

// ─── Helper: file path for a candidate ─────────────────────────────────────

export function candidateFilePath(candidate: Candidate): string {
  switch (candidate.kind) {
    case "paid-product":
      return `staging/paid/${candidate.slug}.json`;
    case "alternative":
      return `staging/alternatives/${candidate.slug}.json`;
    case "category":
      return `staging/categories/${candidate.slug}.json`;
    case "license":
      return `staging/licenses/${candidate.slug}.json`;
  }
}

// ─── Helper: curated file path for promotion ───────────────────────────────

export function curatedFilePath(candidate: Candidate): string {
  switch (candidate.kind) {
    case "paid-product":
      return `curated/paid/${candidate.slug}.json`;
    case "alternative":
      return `curated/alternatives/${candidate.slug}.json`;
    case "category":
      return `curated/categories/${candidate.slug}.json`;
    case "license":
      return `curated/licenses/${candidate.slug}.json`;
  }
}
