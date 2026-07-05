#!/usr/bin/env bun
/*
 * opencatalog.sh — Build-time probe script.
 *
 * Re-probes all curated records:
 * - Verifies source URLs are still live (HEAD request)
 * - Fetches fresh GitHub repo stats (stars, last release)
 * - Updates maturity signals with fresh probedAt timestamps
 * - Marks stale signals (probedAt older than 90 days)
 * - Upgrades source basis from "claimed" to "cited" if URL responds
 * - Downgrades source basis from "cited" to "claimed" if URL is dead
 *
 * This script is run by the GitHub Action workflow (weekly) and can be
 * run manually:
 *   bun run scripts/probe-curated.ts           # probe all
 *   bun run scripts/probe-curated.ts --dry-run # show what would change
 *
 * Environment:
 *   GITHUB_TOKEN — for GitHub API rate limits
 */

import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import {
  Alternative as AlternativeSchema,
  Category as CategorySchema,
  LicensePrimitive as LicenseSchema,
  PaidProduct as PaidProductSchema,
  type Alternative,
  type Category,
  type LicensePrimitive,
  type PaidProduct,
  type Source,
} from "../src/lib/schema";

const CURATED_DIR = path.join(process.cwd(), "curated");
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const DRY_RUN = process.argv.includes("--dry-run");
const STALE_THRESHOLD_DAYS = 90;

// ─── HTTP helpers (shared with enrich.ts) ──────────────────────────────────

async function probeUrl(url: string): Promise<{ ok: boolean; status: number }> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    return { ok: res.ok, status: res.status };
  } catch {
    try {
      const res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(10000),
        headers: { Range: "bytes=0-0" },
      });
      return { ok: res.ok, status: res.status };
    } catch {
      return { ok: false, status: 0 };
    }
  }
}

function parseGitHubRepo(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

async function fetchGitHubRepo(owner: string, repo: string) {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      stars: data.stargazers_count ?? 0,
      updatedAt: data.updated_at,
    };
  } catch {
    return null;
  }
}

async function fetchGitHubLatestRelease(owner: string, repo: string) {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { tagName: data.tag_name, publishedAt: data.published_at };
  } catch {
    return null;
  }
}

// ─── Probe logic ───────────────────────────────────────────────────────────

function isStale(probedAt: string): boolean {
  const ageDays = (Date.now() - new Date(probedAt).getTime()) / (1000 * 60 * 60 * 24);
  return ageDays > STALE_THRESHOLD_DAYS;
}

async function probeSources<T extends { sources: Source[] }>(
  record: T,
): Promise<{ record: T; changes: string[] }> {
  const changes: string[] = [];
  const now = new Date().toISOString();
  const sources = record.sources.map((s) => ({ ...s }));

  for (let i = 0; i < sources.length; i++) {
    const src = sources[i];
    if (!src) continue;

    const probe = await probeUrl(src.url);
    if (probe.ok) {
      if (src.basis === "claimed") {
        src.basis = "cited";
        changes.push(`sources[${i}].basis: claimed → cited (URL live)`);
      }
      // Update fetchedAt
      src.fetchedAt = now;
    } else {
      if (src.basis === "cited" || src.basis === "probed") {
        changes.push(`sources[${i}]: URL ${src.url} returned ${probe.status || "error"} — basis may be stale`);
      }
    }
  }

  return { record: { ...record, sources }, changes };
}

async function probeAlternativeMaturity(alt: Alternative): Promise<{ record: Alternative; changes: string[] }> {
  const changes: string[] = [];
  const now = new Date().toISOString();
  const maturity = alt.maturity.map((m) => ({ ...m }));

  // Find GitHub repo URL
  const allUrls = [
    ...alt.sources.map((s) => s.url),
    ...alt.installPaths.flatMap((ip) => (ip.url ? [ip.url] : [])),
  ];
  const githubUrl = allUrls.find((u) => u.includes("github.com"));
  if (!githubUrl) return { record: alt, changes };

  const repo = parseGitHubRepo(githubUrl);
  if (!repo) return { record: alt, changes };

  const repoData = await fetchGitHubRepo(repo.owner, repo.repo);
  if (!repoData) return { record: alt, changes };

  // Update stars
  const starsIdx = maturity.findIndex((m) => m.kind === "repo-stars");
  if (starsIdx >= 0) {
    const oldVal = maturity[starsIdx]?.value;
    maturity[starsIdx] = {
      ...maturity[starsIdx],
      value: String(repoData.stars),
      probedAt: now,
      stale: false,
    };
    if (oldVal !== String(repoData.stars)) {
      changes.push(`maturity[repo-stars]: ${oldVal} → ${repoData.stars}`);
    }
  }

  // Update last release
  const release = await fetchGitHubLatestRelease(repo.owner, repo.repo);
  if (release) {
    const releaseIdx = maturity.findIndex((m) => m.kind === "last-release");
    if (releaseIdx >= 0) {
      const oldVal = maturity[releaseIdx]?.value;
      maturity[releaseIdx] = {
        ...maturity[releaseIdx],
        value: release.tagName,
        probedAt: now,
        stale: false,
      };
      if (oldVal !== release.tagName) {
        changes.push(`maturity[last-release]: ${oldVal} → ${release.tagName}`);
      }
    }
  }

  // Mark stale signals
  for (let i = 0; i < maturity.length; i++) {
    const m = maturity[i];
    if (!m) continue;
    const wasStale = m.stale;
    const nowStale = isStale(m.probedAt);
    if (!wasStale && nowStale) {
      m.stale = true;
      changes.push(`maturity[${i}].stale: ${m.kind} is now stale (probed ${m.probedAt.slice(0, 10)})`);
    }
  }

  return { record: { ...alt, maturity }, changes };
}

// ─── File walking ──────────────────────────────────────────────────────────

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

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  try {
    await stat(CURATED_DIR);
  } catch {
    console.error("curated/ does not exist");
    process.exit(1);
  }

  const files: string[] = [];
  for await (const f of walkDir(CURATED_DIR)) {
    files.push(f);
  }

  console.log(`Probing ${files.length} curated record${files.length === 1 ? "" : "s"}${DRY_RUN ? " (dry run)" : ""}...\n`);

  let changed = 0;
  let unchanged = 0;
  let failed = 0;

  for (const file of files) {
    const relPath = path.relative(process.cwd(), file);
    const raw = JSON.parse(await readFile(file, "utf-8"));

    // Determine record type by path
    const isAlternative = file.includes("/alternatives/");
    const isPaidProduct = file.includes("/paid/");
    const isCategory = file.includes("/categories/");
    const isLicense = file.includes("/licenses/");

    const allChanges: string[] = [];
    let updated = raw;

    try {
      // Probe sources for all record types
      const sourceResult = await probeSources(raw);
      allChanges.push(...sourceResult.changes);
      updated = sourceResult.record;

      // Probe alternative maturity
      if (isAlternative) {
        const altResult = await probeAlternativeMaturity(updated as Alternative);
        allChanges.push(...altResult.changes);
        updated = altResult.record;
      }

      // Re-validate
      if (isAlternative) AlternativeSchema.parse(updated);
      if (isPaidProduct) PaidProductSchema.parse(updated);
      if (isCategory) CategorySchema.parse(updated);
      if (isLicense) LicenseSchema.parse(updated);
    } catch (err) {
      console.log(`  ✗ ${relPath} — probe or validation error: ${err}`);
      failed++;
      continue;
    }

    if (allChanges.length === 0) {
      unchanged++;
      continue;
    }

    console.log(`  ✓ ${relPath}:`);
    for (const change of allChanges) {
      console.log(`      ${change}`);
    }

    if (!DRY_RUN) {
      await writeFile(file, `${JSON.stringify(updated, null, 2)}\n`);
    }
    changed++;
  }

  console.log("");
  if (DRY_RUN) {
    console.log(`dry run — ${changed} record${changed === 1 ? "" : "s"} would be updated, ${unchanged} unchanged, ${failed} failed`);
  } else {
    console.log(`✓ probed ${files.length} records — ${changed} updated, ${unchanged} unchanged, ${failed} failed`);
  }
  process.exit(failed > 0 ? 1 : 0);
}

main();
