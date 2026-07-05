import { z } from "zod";

/*
 * OpenCatalog — Zod schema (source of truth).
 *
 * Every rule here encodes a contract from DEFINITIONS.md or PLAN.md:
 * - Every load-bearing fact carries a `basis`: probed | cited | claimed.
 * - `verified: true` requires grounding (enforced in validate-curated.ts, not
 *   here, because the rule spans multiple fields).
 * - Every record carries generatedAt, schemaVersion, sources.
 * - OSI-approved licenses only for FOSS alternatives.
 * - Deployment is a primary field: desktop | self-hosted | web-deployable | hosted-service.
 * - Source-available tools are excluded/not-foss, never silently omitted.
 */

export const SCHEMA_VERSION = "0.1.0" as const;

/* ─── Primitives ─────────────────────────────────────────────────────────── */

export const Basis = z.enum(["probed", "cited", "claimed"]);
export type Basis = z.infer<typeof Basis>;

export const DeploymentShape = z.enum([
  "desktop",
  "self-hosted",
  "web-deployable",
  "hosted-service",
]);
export type DeploymentShape = z.infer<typeof DeploymentShape>;

export const FitTier = z.enum(["best-fit", "partial-fit", "different-philosophy"]);
export type FitTier = z.infer<typeof FitTier>;

export const WorkflowFitStatus = z.enum(["supported", "partial", "missing", "unknown"]);
export type WorkflowFitStatus = z.infer<typeof WorkflowFitStatus>;

export const InstallPathKind = z.enum([
  "package-manager",
  "download",
  "container",
  "source",
  "hosted",
]);
export type InstallPathKind = z.infer<typeof InstallPathKind>;

export const Platform = z.enum([
  "macos",
  "windows",
  "linux",
  "ios",
  "android",
  "browser",
  "server",
  "docker",
  "kubernetes",
]);
export type Platform = z.infer<typeof Platform>;

export const MaturityKind = z.enum([
  "repo-stars",
  "last-commit",
  "last-release",
  "package-presence",
  "contributor-count",
  "issue-velocity",
]);
export type MaturityKind = z.infer<typeof MaturityKind>;

export const PricingShape = z.enum([
  "subscription",
  "one-time",
  "freemium",
  "per-seat",
  "usage-based",
  "bundle-only",
]);
export type PricingShape = z.infer<typeof PricingShape>;

/* ─── Source / citation ──────────────────────────────────────────────────── */

export const Source = z.object({
  url: z.string().url(),
  label: z.string().min(1),
  fetchedAt: z.string().datetime().optional(),
  basis: Basis,
});
export type Source = z.infer<typeof Source>;

/* ─── Fact<T> — a value with its grounding ───────────────────────────────── */

export function Fact<T extends z.ZodTypeAny>(valueSchema: T) {
  return z.object({
    value: valueSchema,
    basis: Basis,
    sources: z.array(Source).default([]),
  });
}

/* ─── License ────────────────────────────────────────────────────────────── */

export const LicenseRef = z.object({
  slug: z.string().regex(/^[a-z0-9.-]+$/),
  name: z.string().min(1),
  osiApproved: z.boolean(),
  basis: Basis,
  sources: z.array(Source).default([]),
});
export type LicenseRef = z.infer<typeof LicenseRef>;

export const LicensePrimitive = z.object({
  slug: z.string().regex(/^[a-z0-9.-]+$/),
  name: z.string().min(1),
  spdxId: z.string().min(1),
  osiApproved: z.boolean(),
  permits: z.array(z.string()).default([]),
  requires: z.array(z.string()).default([]),
  networkDeploymentNote: z.string().optional(),
  practicalCallout: z.string().optional(),
  sources: z.array(Source).default([]),
  generatedAt: z.string().datetime(),
  schemaVersion: z.literal(SCHEMA_VERSION),
});
export type LicensePrimitive = z.infer<typeof LicensePrimitive>;

/* ─── Install path ───────────────────────────────────────────────────────── */

export const InstallPath = z.object({
  kind: InstallPathKind,
  platform: z.string().min(1),
  command: z.string().optional(),
  url: z.string().url().optional(),
  note: z.string().optional(),
  basis: Basis,
  sources: z.array(Source).default([]),
});
export type InstallPath = z.infer<typeof InstallPath>;

/* ─── Maturity signal ────────────────────────────────────────────────────── */

export const MaturitySignal = z.object({
  kind: MaturityKind,
  value: z.union([z.string(), z.number()]),
  probedAt: z.string().datetime(),
  stale: z.boolean(),
  source: z.string().url().optional(),
});
export type MaturitySignal = z.infer<typeof MaturitySignal>;

/* ─── Workflow + fit ─────────────────────────────────────────────────────── */

export const Workflow = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  description: z.string().min(1),
});
export type Workflow = z.infer<typeof Workflow>;

export const WorkflowFit = z.object({
  workflowSlug: z.string().regex(/^[a-z0-9-]+$/),
  status: WorkflowFitStatus,
  note: z.string().optional(),
  basis: Basis,
  sources: z.array(Source).default([]),
});
export type WorkflowFit = z.infer<typeof WorkflowFit>;

/* ─── Known gap ──────────────────────────────────────────────────────────── */

export const KnownGap = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(["blocking", "nuisance", "minor"]).optional(),
  basis: Basis,
  sources: z.array(Source).default([]),
});
export type KnownGap = z.infer<typeof KnownGap>;

/* ─── Alternative (FOSS) ─────────────────────────────────────────────────── */

export const Alternative = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  tagline: z.string().optional(),
  description: z.string().min(1),
  repo: z.string().url(),
  homepage: z.string().url().optional(),
  license: LicenseRef,
  deployment: z.array(DeploymentShape).min(1),
  platforms: z.array(Platform).default([]),
  installPaths: z.array(InstallPath).min(1),
  maturity: z.array(MaturitySignal).default([]),
  knownGaps: z.array(KnownGap).default([]),
  categories: z.array(z.string().regex(/^[a-z0-9-]+$/)).min(1),
  replaces: z.array(z.string().regex(/^[a-z0-9-]+$/)).default([]),
  verified: z.boolean(),
  generatedAt: z.string().datetime(),
  schemaVersion: z.literal(SCHEMA_VERSION),
  sources: z.array(Source).default([]),
});
export type Alternative = z.infer<typeof Alternative>;

/* ─── Ranked alternative (embedded in paid product) ──────────────────────── */

export const RankedAlternative = z.object({
  altSlug: z.string().regex(/^[a-z0-9-]+$/),
  fit: FitTier,
  note: z.string().optional(),
  workflowFit: z.array(WorkflowFit).default([]),
});
export type RankedAlternative = z.infer<typeof RankedAlternative>;

/* ─── Paid product ───────────────────────────────────────────────────────── */

export const ExportImportSurface = z.object({
  formats: z.array(z.string()).default([]),
  apis: z.array(z.string().url()).default([]),
  note: z.string().optional(),
  basis: Basis,
  sources: z.array(Source).default([]),
});

export const PaidProduct = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  brand: z.string().optional(),
  tagline: z.string().optional(),
  description: z.string().min(1),
  category: z.string().regex(/^[a-z0-9-]+$/),
  secondaryCategories: z.array(z.string().regex(/^[a-z0-9-]+$/)).default([]),
  pricingShape: PricingShape,
  pricingNote: z.string().optional(),
  workflows: z.array(Workflow).min(1),
  exportImport: ExportImportSurface.optional(),
  rankedAlternatives: z.array(RankedAlternative).min(1),
  verified: z.boolean(),
  generatedAt: z.string().datetime(),
  schemaVersion: z.literal(SCHEMA_VERSION),
  sources: z.array(Source).default([]),
});
export type PaidProduct = z.infer<typeof PaidProduct>;

/* ─── Category ───────────────────────────────────────────────────────────── */

export const Category = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  definition: z.string().min(1),
  primaryWorkflows: z.array(z.string()).default([]),
  neighborCategories: z.array(z.string().regex(/^[a-z0-9-]+$/)).default([]),
  paidProductSlugs: z.array(z.string().regex(/^[a-z0-9-]+$/)).default([]),
  alternativeSlugs: z.array(z.string().regex(/^[a-z0-9-]+$/)).default([]),
  generatedAt: z.string().datetime(),
  schemaVersion: z.literal(SCHEMA_VERSION),
  sources: z.array(Source).default([]),
});
export type Category = z.infer<typeof Category>;

/* ─── API envelope ───────────────────────────────────────────────────────── */

export const ApiEnvelope = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  generatedAt: z.string().datetime(),
  paidProducts: z.array(PaidProduct),
  alternatives: z.array(Alternative),
  categories: z.array(Category),
  licenses: z.array(LicensePrimitive),
});
export type ApiEnvelope = z.infer<typeof ApiEnvelope>;

/* ─── Reserved slugs (route namespaces that paid products cannot use) ────── */

export const RESERVED_SLUGS = [
  "alt",
  "category",
  "license",
  "browse",
  "about",
  "api",
  "api.json",
  "api.schema.json",
] as const;
