#!/usr/bin/env bun
/*
 * validate-curated.ts — mechanical validation of curated records.
 *
 * Runs in CI and locally via `bun run validate`. Checks:
 *  1. Every JSON file parses against its Zod schema.
 *  2. No placeholder fields remain (TODO, FIXME, <placeholder>, "TBD").
 *  3. `verified: true` records meet the grounding rules from DEFINITIONS.md:
 *     - license is grounded (basis probed or cited)
 *     - at least one install path is grounded
 *     - load-bearing workflow fit facts are probed or cited
 *     - maturity probes have timestamps
 *  4. No paid-product slug collides with a reserved namespace.
 *  5. Every rankedAlternative.altSlug resolves to an existing alternative.
 *  6. Every alternative.replaces slug resolves to an existing paid product.
 *  7. Every category reference resolves.
 *
 * Exit code 0 = clean, 1 = violations found.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  Alternative as AlternativeSchema,
  Category as CategorySchema,
  LicensePrimitive as LicenseSchema,
  PaidProduct as PaidProductSchema,
  RESERVED_SLUGS,
} from "../src/lib/schema";

const CURATED_DIR = path.join(process.cwd(), "curated");
const PLACEHOLDER_PATTERNS = [
  /\bTODO\b/i,
  /\bFIXME\b/i,
  /\bTBD\b/i,
  /<placeholder>/i,
  /<your-.*>/i,
  /example\.com/i,
];

let violations = 0;

function fail(msg: string): void {
  console.error(`  ✗ ${msg}`);
  violations++;
}

function ok(msg: string): void {
  console.log(`  ✓ ${msg}`);
}

function checkPlaceholders(obj: unknown, pathStr: string): string[] {
  const found: string[] = [];
  if (typeof obj === "string") {
    for (const pat of PLACEHOLDER_PATTERNS) {
      if (pat.test(obj)) found.push(`${pathStr}: "${obj.slice(0, 60)}"`);
    }
  } else if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      found.push(...checkPlaceholders(obj[i], `${pathStr}[${i}]`));
    }
  } else if (obj && typeof obj === "object") {
    for (const [key, val] of Object.entries(obj)) {
      found.push(...checkPlaceholders(val, `${pathStr}.${key}`));
    }
  }
  return found;
}

async function readDir(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
}

type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: { issues: { message: string; path: PropertyKey[] }[] } };

async function loadDir<T>(
  subdir: string,
  schema: { safeParse: (v: unknown) => SafeParseResult<T> },
): Promise<{ name: string; data: T }[]> {
  const dir = path.join(CURATED_DIR, subdir);
  const files = (await readDir(dir)).filter((f) => f.endsWith(".json"));
  const out: { name: string; data: T }[] = [];
  for (const file of files) {
    const raw = await readFile(path.join(dir, file), "utf8");
    const json: unknown = JSON.parse(raw);
    const result = schema.safeParse(json);
    if (!result.success) {
      fail(`${subdir}/${file} schema errors:`);
      for (const issue of result.error.issues) {
        fail(`    ${issue.path.join(".")}: ${issue.message}`);
      }
      continue;
    }
    const placeholders = checkPlaceholders(result.data, "");
    if (placeholders.length > 0) {
      fail(`${subdir}/${file} has placeholder values:`);
      for (const p of placeholders) fail(`    ${p}`);
      continue;
    }
    out.push({ name: file, data: result.data });
  }
  return out;
}

async function main(): Promise<void> {
  console.log("validate-curated: checking curated/ records...\n");

  const paidProducts = await loadDir("paid", PaidProductSchema);
  const alternatives = await loadDir("alternatives", AlternativeSchema);
  const categories = await loadDir("categories", CategorySchema);
  const licenses = await loadDir("licenses", LicenseSchema);

  console.log(`\nloaded: ${paidProducts.length} paid, ${alternatives.length} alternatives, ${categories.length} categories, ${licenses.length} licenses\n`);

  const altSlugs = new Set(alternatives.map((a) => a.data.slug));
  const paidSlugs = new Set(paidProducts.map((p) => p.data.slug));
  const catSlugs = new Set(categories.map((c) => c.data.slug));
  const licenseSlugs = new Set(licenses.map((l) => l.data.slug));

  // Reserved-slug collision check
  for (const p of paidProducts) {
    if ((RESERVED_SLUGS as readonly string[]).includes(p.data.slug)) {
      fail(`paid/${p.name}: slug "${p.data.slug}" is a reserved route namespace`);
    }
  }

  // Cross-reference integrity
  for (const p of paidProducts) {
    if (!catSlugs.has(p.data.category)) {
      fail(`paid/${p.name}: category "${p.data.category}" not found in categories/`);
    }
    for (const c of p.data.secondaryCategories) {
      if (!catSlugs.has(c)) fail(`paid/${p.name}: secondary category "${c}" not found`);
    }
    for (const ra of p.data.rankedAlternatives) {
      if (!altSlugs.has(ra.altSlug)) {
        fail(`paid/${p.name}: ranked alternative "${ra.altSlug}" not found in alternatives/`);
      }
    }
  }

  for (const a of alternatives) {
    for (const r of a.data.replaces) {
      if (!paidSlugs.has(r)) {
        fail(`alternatives/${a.name}: replaces "${r}" not found in paid/`);
      }
    }
    for (const c of a.data.categories) {
      if (!catSlugs.has(c)) fail(`alternatives/${a.name}: category "${c}" not found`);
    }
    if (!licenseSlugs.has(a.data.license.slug)) {
      fail(`alternatives/${a.name}: license "${a.data.license.slug}" not found in licenses/`);
    }
  }

  // Grounding rules for verified records
  for (const a of alternatives) {
    if (!a.data.verified) continue;
    if (a.data.license.basis === "claimed") {
      fail(`alternatives/${a.name}: verified but license basis is "claimed"`);
    }
    const groundedInstall = a.data.installPaths.some(
      (ip) => ip.basis === "probed" || ip.basis === "cited",
    );
    if (!groundedInstall) {
      fail(`alternatives/${a.name}: verified but no install path is probed/cited`);
    }
    if (a.data.maturity.length === 0) {
      fail(`alternatives/${a.name}: verified but no maturity signals`);
    }
  }

  for (const p of paidProducts) {
    if (!p.data.verified) continue;
    for (const ra of p.data.rankedAlternatives) {
      for (const wf of ra.workflowFit) {
        if (wf.basis === "claimed" && wf.status !== "unknown") {
          fail(`paid/${p.name}: verified but workflow "${wf.workflowSlug}" fit is "claimed" (not unknown)`);
        }
      }
    }
  }

  console.log("");
  if (violations === 0) {
    ok("all curated records valid");
    process.exit(0);
  } else {
    console.error(`\n${violations} violation(s) found.`);
    process.exit(1);
  }
}

main();
