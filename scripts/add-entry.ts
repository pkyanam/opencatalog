#!/usr/bin/env bun
/*
 * opencatalog.sh — Add entry CLI.
 *
 * Creates a candidate entry in staging/ either interactively or from a
 * JSON file. After creating, runs the staging validator automatically.
 *
 * Usage:
 *   bun run add-entry                              # interactive mode
 *   bun run add-entry --file ./my-candidate.json   # from file
 *   bun run add-entry --kind alternative --slug logseq --name "Logseq"  # quick mode
 *
 * Interactive mode prompts for required fields. Quick mode accepts flags
 * and fills optionals with defaults. File mode reads a JSON file that
 * matches the candidate schema (minus the submitter block, which is
 * added automatically).
 */

import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import {
  Candidate,
  type Candidate as CandidateType,
  type CandidateKind,
  candidateFilePath,
} from "../src/lib/candidate-schema";

// ─── CLI arg parsing ───────────────────────────────────────────────────────

const args = process.argv.slice(2);
const fileMode = args.includes("--file");
const fileIdx = args.indexOf("--file");
const filePath = fileIdx >= 0 ? args[fileIdx + 1] : null;

const kindIdx = args.indexOf("--kind");
const kindArg = kindIdx >= 0 ? args[kindIdx + 1] : null;

const slugIdx = args.indexOf("--slug");
const slugArg = slugIdx >= 0 ? args[slugIdx + 1] : null;

const nameIdx = args.indexOf("--name");
const nameArg = nameIdx >= 0 ? args[nameIdx + 1] : null;

const sourceIdx = args.indexOf("--source");
const sourceArg = sourceIdx >= 0 ? args[sourceIdx + 1] : "manual";

const identityIdx = args.indexOf("--identity");
const identityArg = identityIdx >= 0 ? args[identityIdx + 1] : null;

const notesIdx = args.indexOf("--notes");
const notesArg = notesIdx >= 0 ? args[notesIdx + 1] : null;

// ─── Interactive prompt ────────────────────────────────────────────────────

async function prompt(question: string, defaultValue?: string): Promise<string> {
  const defaultHint = defaultValue ? ` [${defaultValue}]` : "";
  process.stdout.write(`${question}${defaultHint}: `);
  const line = await new Promise<string>((resolve) => {
    process.stdin.once("data", (data) => resolve(data.toString().trim()));
  });
  return line || defaultValue || "";
}

async function promptMulti(question: string, hint?: string): Promise<string[]> {
  const line = await prompt(question, hint);
  if (!line) return [];
  return line.split(",").map((s) => s.trim()).filter(Boolean);
}

async function promptLong(question: string, hint?: string): Promise<string> {
  process.stdout.write(`${question}${hint ? ` (${hint})` : ""}:\n`);
  process.stdout.write("  (multi-line, end with Ctrl+D or empty line + Enter)\n");
  const lines: string[] = [];
  while (true) {
    process.stdout.write("> ");
    const line = await new Promise<string>((resolve) => {
      process.stdin.once("data", (data) => resolve(data.toString().replace(/\n$/, "")));
    });
    if (line === "" && lines.length > 0) break;
    lines.push(line);
  }
  return lines.join("\n");
}

// ─── Submitter block ───────────────────────────────────────────────────────

function buildSubmitter(): { source: string; identity: string; submittedAt: string; notes?: string } {
  const identity = identityArg || process.env.USER || "unknown";
  return {
    source: sourceArg as "manual" | "ai-agent" | "scraper" | "community-pr",
    identity,
    submittedAt: new Date().toISOString(),
    notes: notesArg,
  };
}

// ─── Interactive: build candidate by kind ──────────────────────────────────

async function buildAlternativeCandidate(): Promise<CandidateType> {
  const slug = slugArg || await prompt("Slug (e.g. 'logseq')");
  const name = nameArg || await prompt("Name (e.g. 'Logseq')");
  const tagline = await prompt("Tagline (optional)");
  const description = await promptLong("Description", "what this tool is and does");
  const categories = await promptMulti("Categories (comma-separated slugs)", "e.g. note-taking,knowledge-management");
  const replaces = await promptMulti("Replaces (comma-separated paid product slugs)", "e.g. notion,evernote");
  const licenseSlug = await prompt("License slug", "e.g. agpl-3.0");
  const deployment = await promptMulti("Deployment (comma-separated)", "e.g. self-hosted,desktop,web");

  return {
    kind: "alternative",
    slug,
    name,
    tagline: tagline || undefined,
    description,
    categories,
    replaces,
    licenseSlug,
    deployment,
    installPaths: [],
    maturity: [],
    knownGaps: [],
    sources: [],
    submitter: buildSubmitter(),
  };
}

async function buildPaidProductCandidate(): Promise<CandidateType> {
  const slug = slugArg || await prompt("Slug (e.g. 'adobe-photoshop')");
  const name = nameArg || await prompt("Name (e.g. 'Adobe Photoshop')");
  const tagline = await prompt("Tagline (optional)");
  const description = await promptLong("Description", "what this product is");
  const category = await prompt("Primary category slug", "e.g. image-editing");
  const pricingShape = await prompt("Pricing shape", "e.g. subscription");
  const workflowInput = await prompt("Workflows (comma-separated label:slug pairs)", "e.g. 'Layer editing:layer-editing,Brush tools:brush-tools'");
  const workflows = workflowInput.map((w) => {
    const [label, slug] = w.split(":").map((s) => s.trim());
    return { label: label ?? w, slug: slug ?? w.toLowerCase().replace(/\s+/g, "-") };
  });
  const rankedAltSlugs = await promptMulti("Ranked alternative slugs", "e.g. gimp,krita");

  return {
    kind: "paid-product",
    slug,
    name,
    tagline: tagline || undefined,
    description,
    category,
    secondaryCategories: [],
    pricingShape,
    pricingNote: undefined,
    workflows,
    rankedAlternativeSlugs: rankedAltSlugs,
    sources: [],
    submitter: buildSubmitter(),
  };
}

async function buildCategoryCandidate(): Promise<CandidateType> {
  const slug = slugArg || await prompt("Slug (e.g. 'note-taking')");
  const name = nameArg || await prompt("Name (e.g. 'Note-taking')");
  const definition = await promptLong("Definition", "what this category covers");
  const primaryWorkflows = await promptMulti("Primary workflows (optional)");

  return {
    kind: "category",
    slug,
    name,
    definition,
    primaryWorkflows,
    neighborCategories: [],
    sources: [],
    submitter: buildSubmitter(),
  };
}

async function buildLicenseCandidate(): Promise<CandidateType> {
  const slug = slugArg || await prompt("Slug (e.g. 'agpl-3.0')");
  const name = nameArg || await prompt("Name (e.g. 'GNU Affero General Public License')");
  const spdxId = await prompt("SPDX ID", "e.g. AGPL-3.0");
  const osiApprovedInput = await prompt("OSI approved? (y/n)", "y");
  const osiApproved = osiApprovedInput.toLowerCase().startsWith("y");
  const permits = await promptMulti("Permits (optional)", "e.g. commercial-use,modification,distribution");
  const requires = await promptMulti("Requires (optional)", "e.g. source-disclosure,same-license");

  return {
    kind: "license",
    slug,
    name,
    spdxId,
    osiApproved,
    permits,
    requires,
    sources: [],
    submitter: buildSubmitter(),
  };
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  let candidate: CandidateType;

  if (fileMode && filePath) {
    // File mode: read JSON, add submitter block
    const raw = JSON.parse(await readFile(filePath, "utf-8"));
    const submitter = buildSubmitter();
    candidate = { ...raw, submitter };
  } else if (kindArg) {
    // Quick mode: build from flags + interactive prompts for missing fields
    switch (kindArg as CandidateKind) {
      case "alternative": candidate = await buildAlternativeCandidate(); break;
      case "paid-product": candidate = await buildPaidProductCandidate(); break;
      case "category": candidate = await buildCategoryCandidate(); break;
      case "license": candidate = await buildLicenseCandidate(); break;
      default:
        console.error(`Unknown kind: ${kindArg}. Must be one of: alternative, paid-product, category, license`);
        process.exit(1);
    }
  } else {
    // Fully interactive mode
    console.log("opencatalog.sh — add entry\n");
    console.log("What kind of entry?");
    console.log("  1. Alternative (FOSS tool)");
    console.log("  2. Paid product");
    console.log("  3. Category");
    console.log("  4. License");
    const choice = await prompt("Choose (1-4)", "1");
    switch (choice) {
      case "1": candidate = await buildAlternativeCandidate(); break;
      case "2": candidate = await buildPaidProductCandidate(); break;
      case "3": candidate = await buildCategoryCandidate(); break;
      case "4": candidate = await buildLicenseCandidate(); break;
      default:
        console.error("Invalid choice");
        process.exit(1);
    }
  }

  // Validate against candidate schema
  const result = Candidate.safeParse(candidate);
  if (!result.success) {
    console.error("\n✗ Candidate validation failed:");
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  const validated = result.data;
  const stagingPath = candidateFilePath(validated);
  const fullPath = path.join(process.cwd(), stagingPath);

  // Check if already exists
  try {
    await stat(fullPath);
    console.error(`\n✗ Already exists: ${stagingPath}`);
    console.error("  Remove the existing file first if you want to replace it.");
    process.exit(1);
  } catch {
    // Good — doesn't exist
  }

  // Create directory and write
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, `${JSON.stringify(validated, null, 2)}\n`);

  console.log(`\n✓ Created staging candidate: ${stagingPath}`);
  console.log("\nNext steps:");
  console.log("  1. Add sources (URLs) to the candidate file");
  console.log("  2. Run: bun run scripts/enrich.ts");
  console.log("  3. Run: bun run scripts/promote.ts");
  console.log("  4. Run: bun run validate && bun run build");
}

main();
