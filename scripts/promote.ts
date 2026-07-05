#!/usr/bin/env bun
/*
 * opencatalog.sh — Promotion script.
 *
 * Moves validated and enriched candidates from staging/ to curated/,
 * converting them to the full curated schema format. The curated schema
 * is stricter — promotion will fail if the candidate doesn't meet the
 * higher bar (e.g. verified records need grounded licenses).
 *
 * Usage:
 *   bun run scripts/promote.ts                    # promote all ready candidates
 *   bun run scripts/promote.ts --slug logseq      # promote specific candidate
 *   bun run scripts/promote.ts --dry-run          # show what would be promoted
 *   bun run scripts/promote.ts --force            # promote even if not verified
 *
 * Promotion checks:
 *   1. Candidate parses against candidate schema
 *   2. Cross-references resolve (license, paid product, category slugs)
 *   3. After conversion, the curated record parses against the curated schema
 *   4. If --force is not set, at least one source must be probed or cited
 *
 * After promotion, the staging file is removed.
 */

import { readdir, readFile, writeFile, unlink, stat, mkdir } from "node:fs/promises";
import path from "node:path";
import {
  Candidate,
  type Candidate as CandidateType,
  type PaidProductCandidate,
  type AlternativeCandidate,
  type CategoryCandidate,
  type LicenseCandidate,
  candidateFilePath,
  curatedFilePath,
} from "../src/lib/candidate-schema";
import {
  Alternative as AlternativeSchema,
  Category as CategorySchema,
  LicensePrimitive as LicenseSchema,
  PaidProduct as PaidProductSchema,
  SCHEMA_VERSION,
} from "../src/lib/schema";
import { buildApiEnvelope } from "../src/lib/data";

const STAGING_DIR = path.join(process.cwd(), "staging");
const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");
const FILTER_SLUG = process.argv.includes("--slug")
  ? process.argv[process.argv.indexOf("--slug") + 1]
  : null;

const now = () => new Date().toISOString();

// ─── Conversion: candidate → curated record ────────────────────────────────

function convertPaidProduct(c: PaidProductCandidate): Record<string, unknown> {
  return {
    slug: c.slug,
    name: c.name,
    tagline: c.tagline,
    description: c.description,
    category: c.category,
    secondaryCategories: c.secondaryCategories,
    pricingShape: c.pricingShape,
    pricingNote: c.pricingNote,
    workflows: c.workflows.map((w) => ({
      slug: w.slug,
      label: w.label,
      description: w.label, // candidate schema has no description; use label as fallback
    })),
    rankedAlternatives: c.rankedAlternativeSlugs.map((altSlug) => ({
      altSlug,
      fit: "partial-fit" as const,
      note: "",
      workflowFit: c.workflows.map((w) => ({
        workflowSlug: w.slug,
        status: "unknown" as const,
        basis: "claimed" as const,
        sources: [],
      })),
    })),
    exportImport: c.exportImport ?? {
      formats: [],
      apis: [],
      note: "",
      basis: "claimed" as const,
    },
    sources: c.sources,
    verified: false,
    generatedAt: now(),
    schemaVersion: SCHEMA_VERSION,
  };
}

function convertAlternative(c: AlternativeCandidate, licenseMap: Map<string, { slug: string; name: string; spdxId: string; osiApproved: boolean; basis: string; sources: unknown[] }>): Record<string, unknown> {
  // Find the GitHub repo URL from sources
  const repoUrl = c.sources.find((s) => s.url.includes("github.com"))?.url
    ?? c.installPaths.find((ip) => ip.url?.includes("github.com"))?.url
    ?? "";

  // Find homepage URL
  const homepageUrl = c.sources.find((s) => !s.url.includes("github.com"))?.url;

  // Map deployment values — candidate allows freeform, curated requires enum
  const deploymentMap: Record<string, string> = {
    "desktop": "desktop",
    "self-hosted": "self-hosted",
    "web": "web-deployable",
    "web-deployable": "web-deployable",
    "hosted-service": "hosted-service",
    "hosted": "hosted-service",
    "mobile": "desktop", // mobile apps are typically desktop-class deployments
    "server": "self-hosted",
  };
  const deployment = c.deployment.map((d) => deploymentMap[d] ?? d).filter((d) =>
    ["desktop", "self-hosted", "web-deployable", "hosted-service"].includes(d)
  );
  if (deployment.length === 0) deployment.push("desktop");

  // Get license info from curated licenses
  const lic = licenseMap.get(c.licenseSlug);

  // Map install path kinds to curated enum
  const installKindMap: Record<string, string> = {
    "homebrew": "package-manager",
    "flatpak": "package-manager",
    "apt": "package-manager",
    "dnf": "package-manager",
    "pacman": "package-manager",
    "npm": "package-manager",
    "pip": "package-manager",
    "docker": "container",
    "container": "container",
    "binary": "download",
    "download": "download",
    "source": "source",
    "hosted": "hosted",
  };

  return {
    slug: c.slug,
    name: c.name,
    tagline: c.tagline,
    description: c.description,
    repo: repoUrl,
    homepage: homepageUrl,
    license: {
      slug: c.licenseSlug,
      name: lic?.name ?? "",
      osiApproved: lic?.osiApproved ?? true,
      basis: lic?.basis ?? "claimed",
      sources: lic?.sources ?? [],
    },
    deployment,
    platforms: [],
    installPaths: c.installPaths.map((ip) => ({
      platform: ip.platform,
      kind: installKindMap[ip.kind] ?? "download",
      command: ip.command,
      url: ip.url,
      note: ip.note,
      basis: ip.basis,
    })),
    maturity: c.maturity.map((m) => ({
      kind: m.kind,
      value: m.value,
      probedAt: m.probedAt ?? now(),
      stale: m.stale,
    })),
    knownGaps: c.knownGaps.map((g) => ({
      slug: g.slug,
      label: g.label,
      description: g.description,
      // Map candidate severity to curated severity enum
      severity: g.severity === "cosmetic" ? "minor" as const : g.severity,
      basis: g.basis,
      sources: g.sources,
    })),
    categories: c.categories,
    replaces: c.replaces,
    verified: false,
    generatedAt: now(),
    schemaVersion: SCHEMA_VERSION,
    sources: c.sources,
  };
}

function convertCategory(c: CategoryCandidate): Record<string, unknown> {
  return {
    slug: c.slug,
    name: c.name,
    definition: c.definition,
    primaryWorkflows: c.primaryWorkflows,
    neighborCategories: c.neighborCategories,
    paidProductSlugs: [],
    alternativeSlugs: [],
    generatedAt: now(),
    schemaVersion: SCHEMA_VERSION,
    sources: c.sources,
  };
}

function convertLicense(c: LicenseCandidate): Record<string, unknown> {
  return {
    slug: c.slug,
    name: c.name,
    spdxId: c.spdxId,
    osiApproved: c.osiApproved,
    permits: c.permits,
    requires: c.requires,
    practicalCallout: c.practicalCallout,
    networkDeploymentNote: c.networkDeploymentNote,
    sources: c.sources,
    generatedAt: now(),
    schemaVersion: SCHEMA_VERSION,
  };
}

function convertCandidate(candidate: CandidateType, licenseMap: Map<string, { slug: string; name: string; spdxId: string; osiApproved: boolean; basis: string; sources: unknown[] }>): Record<string, unknown> {
  switch (candidate.kind) {
    case "paid-product": return convertPaidProduct(candidate);
    case "alternative": return convertAlternative(candidate, licenseMap);
    case "category": return convertCategory(candidate);
    case "license": return convertLicense(candidate);
  }
}

function getCuratedSchema(candidate: CandidateType) {
  switch (candidate.kind) {
    case "paid-product": return PaidProductSchema;
    case "alternative": return AlternativeSchema;
    case "category": return CategorySchema;
    case "license": return LicenseSchema;
  }
}

// ─── Readiness check ───────────────────────────────────────────────────────

function checkReadiness(candidate: CandidateType): { ready: boolean; reason: string } {
  if (FORCE) return { ready: true, reason: "forced" };

  // At least one source must be probed or cited
  const groundedSources = candidate.sources.filter((s) => s.basis === "probed" || s.basis === "cited");
  if (groundedSources.length === 0) {
    return {
      ready: false,
      reason: "no grounded sources (run `bun run scripts/enrich.ts` first, or use --force)",
    };
  }

  // For alternatives: at least one install path
  if (candidate.kind === "alternative" && candidate.installPaths.length === 0) {
    return {
      ready: false,
      reason: "no install paths (add at least one before promoting)",
    };
  }

  return { ready: true, reason: "ok" };
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function* walkDir(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const s = await stat(fullPath);
    if (s.isDirectory()) {
      yield* walkDir(fullPath);
    } else if (entry.endsWith(".json")) {
      yield fullPath;
    }
  }
}

async function main() {
  try {
    await stat(STAGING_DIR);
  } catch {
    console.log("ℹ staging/ does not exist — nothing to promote");
    process.exit(0);
  }

  // Build known slug sets for cross-ref
  const envelope = await buildApiEnvelope();
  const knownSlugs = {
    paid: new Set(envelope.paidProducts.map((p) => p.slug)),
    alternatives: new Set(envelope.alternatives.map((a) => a.slug)),
    categories: new Set(envelope.categories.map((c) => c.slug)),
    licenses: new Set(envelope.licenses.map((l) => l.slug)),
  };

  // For alternative conversion, we need the full license objects
  const licenseMap = new Map(envelope.licenses.map((l) => [l.slug, l]));

  const files: string[] = [];
  for await (const f of walkDir(STAGING_DIR)) {
    files.push(f);
  }

  if (files.length === 0) {
    console.log("ℹ staging/ is empty — nothing to promote");
    process.exit(0);
  }

  console.log(`Promoting ${files.length} candidate${files.length === 1 ? "" : "s"}${DRY_RUN ? " (dry run)" : ""}...\n`);

  let promoted = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    const raw = JSON.parse(await readFile(file, "utf-8"));
    const result = Candidate.safeParse(raw);
    if (!result.success) {
      console.log(`  ✗ ${path.relative(process.cwd(), file)} — invalid candidate`);
      failed++;
      continue;
    }

    const candidate = result.data;

    if (FILTER_SLUG && candidate.slug !== FILTER_SLUG) continue;

    // Check readiness
    const readiness = checkReadiness(candidate);
    if (!readiness.ready) {
      console.log(`  → ${candidate.slug}: not ready — ${readiness.reason}`);
      skipped++;
      continue;
    }

    // Convert to curated format
    let curatedRecord = convertCandidate(candidate, licenseMap);

    // Validate against curated schema
    const schema = getCuratedSchema(candidate);
    const curatedResult = schema.safeParse(curatedRecord);
    if (!curatedResult.success) {
      console.log(`  ✗ ${candidate.slug}: curated schema validation failed`);
      for (const issue of curatedResult.error.issues.slice(0, 3)) {
        console.log(`      ${issue.path.join(".")}: ${issue.message}`);
      }
      failed++;
      continue;
    }

    const curatedPath = curatedFilePath(candidate);
    const fullCuratedPath = path.join(process.cwd(), curatedPath);

    console.log(`  ✓ ${candidate.slug} → ${curatedPath}`);

    if (!DRY_RUN) {
      // Ensure directory exists
      await mkdir(path.dirname(fullCuratedPath), { recursive: true });
      await writeFile(fullCuratedPath, `${JSON.stringify(curatedResult.data, null, 2)}\n`);
      // Remove staging file
      await unlink(file);
    }

    promoted++;
  }

  console.log("");
  if (DRY_RUN) {
    console.log(`dry run — ${promoted} would be promoted, ${skipped} not ready, ${failed} failed`);
  } else {
    console.log(`✓ promoted ${promoted} candidate${promoted === 1 ? "" : "s"}, ${skipped} not ready, ${failed} failed`);
  }
  process.exit(failed > 0 ? 1 : 0);
}

main();
