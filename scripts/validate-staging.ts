#!/usr/bin/env bun
/*
 * opencatalog.sh — Staging validator.
 *
 * Validates all candidate files in staging/ against the candidate schema.
 * Checks cross-references (license slugs, paid product slugs, category slugs)
 * against the existing curated catalog.
 *
 * Exit codes:
 *   0 — all candidates valid
 *   1 — one or more candidates invalid
 *   2 — staging directory does not exist (nothing to validate)
 */

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { Candidate, type Candidate as CandidateType } from "../src/lib/candidate-schema";
import { buildApiEnvelope } from "../src/lib/data";

const STAGING_DIR = path.join(process.cwd(), "staging");

type ValidationResult = {
  file: string;
  valid: boolean;
  errors: string[];
  candidate?: CandidateType;
};

async function* walkDir(dir: string): AsyncGenerator<string> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return;
  }
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

async function validateCrossRefs(candidate: CandidateType, knownSlugs: {
  paid: Set<string>;
  alternatives: Set<string>;
  categories: Set<string>;
  licenses: Set<string>;
}): Promise<string[]> {
  const errors: string[] = [];

  switch (candidate.kind) {
    case "paid-product": {
      for (const altSlug of candidate.rankedAlternativeSlugs) {
        if (!knownSlugs.alternatives.has(altSlug) && !knownSlugs.alternatives.has(altSlug)) {
          // Check staging too — the alt might be a fellow candidate
          errors.push(`rankedAlternativeSlugs: "${altSlug}" not found in curated alternatives (must exist or be staged simultaneously)`);
        }
      }
      if (!knownSlugs.categories.has(candidate.category)) {
        errors.push(`category: "${candidate.category}" not found in curated categories`);
      }
      break;
    }
    case "alternative": {
      if (!knownSlugs.licenses.has(candidate.licenseSlug)) {
        errors.push(`licenseSlug: "${candidate.licenseSlug}" not found in curated licenses`);
      }
      for (const paidSlug of candidate.replaces) {
        if (!knownSlugs.paid.has(paidSlug)) {
          errors.push(`replaces: "${paidSlug}" not found in curated paid products`);
        }
      }
      for (const catSlug of candidate.categories) {
        if (!knownSlugs.categories.has(catSlug)) {
          errors.push(`categories: "${catSlug}" not found in curated categories`);
        }
      }
      break;
    }
    case "category": {
      for (const neighborSlug of candidate.neighborCategories) {
        if (!knownSlugs.categories.has(neighborSlug)) {
          errors.push(`neighborCategories: "${neighborSlug}" not found in curated categories`);
        }
      }
      break;
    }
    case "license":
      // No cross-refs to check
      break;
  }

  return errors;
}

async function main() {
  // Check staging dir exists
  try {
    await stat(STAGING_DIR);
  } catch {
    console.log("ℹ staging/ does not exist — nothing to validate");
    process.exit(2);
  }

  // Build known slug sets from curated catalog
  const envelope = await buildApiEnvelope();
  const knownSlugs = {
    paid: new Set(envelope.paidProducts.map((p) => p.slug)),
    alternatives: new Set(envelope.alternatives.map((a) => a.slug)),
    categories: new Set(envelope.categories.map((c) => c.slug)),
    licenses: new Set(envelope.licenses.map((l) => l.slug)),
  };

  // Also collect staging slugs (for cross-ref between staged entries)
  const stagingSlugs = {
    paid: new Set<string>(),
    alternatives: new Set<string>(),
    categories: new Set<string>(),
    licenses: new Set<string>(),
  };

  const files: string[] = [];
  for await (const f of walkDir(STAGING_DIR)) {
    files.push(f);
  }

  if (files.length === 0) {
    console.log("ℹ staging/ is empty — nothing to validate");
    process.exit(0);
  }

  // First pass: parse and collect staging slugs
  const parsed: Array<{ file: string; raw: unknown; candidate?: CandidateType; parseError?: string }> = [];
  for (const file of files) {
    const raw = JSON.parse(await readFile(file, "utf-8"));
    const result = Candidate.safeParse(raw);
    if (result.success) {
      parsed.push({ file, raw, candidate: result.data });
      // Register slug in staging sets
      const c = result.data;
      switch (c.kind) {
        case "paid-product": stagingSlugs.paid.add(c.slug); break;
        case "alternative": stagingSlugs.alternatives.add(c.slug); break;
        case "category": stagingSlugs.categories.add(c.slug); break;
        case "license": stagingSlugs.licenses.add(c.slug); break;
      }
    } else {
      parsed.push({
        file,
        raw,
        parseError: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }
  }

  // Merge staging slugs into known slugs for cross-ref
  for (const s of stagingSlugs.paid) knownSlugs.paid.add(s);
  for (const s of stagingSlugs.alternatives) knownSlugs.alternatives.add(s);
  for (const s of stagingSlugs.categories) knownSlugs.categories.add(s);
  for (const s of stagingSlugs.licenses) knownSlugs.licenses.add(s);

  // Second pass: validate cross-refs
  const results: ValidationResult[] = [];
  for (const p of parsed) {
    if (!p.candidate) {
      results.push({
        file: path.relative(process.cwd(), p.file),
        valid: false,
        errors: [p.parseError ?? "unknown parse error"],
      });
      continue;
    }
    const xrefErrors = await validateCrossRefs(p.candidate, knownSlugs);
    results.push({
      file: path.relative(process.cwd(), p.file),
      valid: xrefErrors.length === 0,
      errors: xrefErrors,
      candidate: p.candidate,
    });
  }

  // Report
  const valid = results.filter((r) => r.valid);
  const invalid = results.filter((r) => !r.valid);

  for (const r of results) {
    const status = r.valid ? "✓" : "✗";
    console.log(`  ${status} ${r.file}`);
    if (!r.valid) {
      for (const err of r.errors) {
        console.log(`      ${err}`);
      }
    }
  }

  console.log("");
  if (invalid.length === 0) {
    console.log(`✓ all staging candidates valid (${valid.length} file${valid.length === 1 ? "" : "s"})`);
    process.exit(0);
  } else {
    console.log(`✗ ${invalid.length} of ${results.length} staging candidate${results.length === 1 ? "" : "s"} invalid`);
    process.exit(1);
  }
}

main();
