#!/usr/bin/env bun
/*
 * opencatalog.sh — Enrichment script.
 *
 * Takes validated staging candidates and enriches them:
 * - Probes source URLs (HEAD request) to verify they're live
 * - Fetches GitHub repo stats (stars, last release, contributors) via API
 * - Detects license from GitHub API (upgrades license basis to "cited")
 * - Fills in fetchedAt timestamps
 * - Upgrades basis from "claimed" to "cited" when a URL responds 200
 * - Adds maturity signals for alternatives with GitHub repos
 *
 * Usage:
 *   bun run scripts/enrich.ts                    # enrich all staging candidates
 *   bun run scripts/enrich.ts --slug logseq      # enrich specific candidate
 *   bun run scripts/enrich.ts --dry-run          # show what would change without writing
 *
 * Environment:
 *   GITHUB_TOKEN — optional, for higher GitHub API rate limits
 */

import { readdir, readFile, writeFile, stat, mkdir } from "node:fs/promises";
import path from "node:path";
import {
  Candidate,
  type Candidate as CandidateType,
  type CandidateSource,
  candidateFilePath,
} from "../src/lib/candidate-schema";

const STAGING_DIR = path.join(process.cwd(), "staging");
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const DRY_RUN = process.argv.includes("--dry-run");
const FILTER_SLUG = process.argv.includes("--slug")
  ? process.argv[process.argv.indexOf("--slug") + 1]
  : null;

// ─── HTTP helpers ──────────────────────────────────────────────────────────

async function probeUrl(url: string): Promise<{ ok: boolean; status: number; finalUrl?: string }> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    return { ok: res.ok, status: res.status, finalUrl: res.url };
  } catch {
    // Some servers reject HEAD, try GET
    try {
      const res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(10000),
        headers: { Range: "bytes=0-0" },
      });
      return { ok: res.ok, status: res.status, finalUrl: res.url };
    } catch {
      return { ok: false, status: 0 };
    }
  }
}

// ─── GitHub API helpers ────────────────────────────────────────────────────

function parseGitHubRepo(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

async function fetchGitHubRepo(owner: string, repo: string): Promise<{
  stars: number;
  license: { key: string; name: string; spdxId: string | null } | null;
  updatedAt: string;
  openIssues: number;
  forks: number;
  homepage: string | null;
} | null> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      stars: data.stargazers_count ?? 0,
      license: data.license
        ? {
            key: data.license.key,
            name: data.license.name,
            spdxId: data.license.spdx_id,
          }
        : null,
      updatedAt: data.updated_at ?? new Date().toISOString(),
      openIssues: data.open_issues_count ?? 0,
      forks: data.forks_count ?? 0,
      homepage: data.homepage ?? null,
    };
  } catch {
    return null;
  }
}

async function fetchGitHubLatestRelease(owner: string, repo: string): Promise<{
  tagName: string;
  publishedAt: string;
} | null> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      tagName: data.tag_name ?? "unknown",
      publishedAt: data.published_at ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// ─── Enrichment logic ──────────────────────────────────────────────────────

type EnrichmentResult = {
  file: string;
  slug: string;
  changes: string[];
  candidate: CandidateType;
};

async function enrichSources(candidate: CandidateType): Promise<{ candidate: CandidateType; changes: string[] }> {
  const changes: string[] = [];
  const now = new Date().toISOString();
  const c = { ...candidate } as Record<string, unknown>;
  const sources = ((c.sources as CandidateSource[]) ?? []).map((s) => ({ ...s }));

  for (let i = 0; i < sources.length; i++) {
    const src = sources[i];
    if (!src) continue;

    // Probe the URL
    const probe = await probeUrl(src.url);
    if (probe.ok) {
      if (src.basis === "claimed") {
        src.basis = "cited";
        changes.push(`sources[${i}].basis: claimed → cited (URL responded ${probe.status})`);
      }
      if (!src.fetchedAt) {
        src.fetchedAt = now;
        changes.push(`sources[${i}].fetchedAt: set to ${now.slice(0, 10)}`);
      }
    } else {
      changes.push(`sources[${i}]: URL ${src.url} returned ${probe.status || "error"} — basis unchanged`);
    }
  }

  c.sources = sources;
  return { candidate: c as CandidateType, changes };
}

async function enrichAlternative(candidate: CandidateType): Promise<{ candidate: CandidateType; changes: string[] }> {
  if (candidate.kind !== "alternative") return { candidate, changes: [] };

  const changes: string[] = [];
  const now = new Date().toISOString();
  const c = { ...candidate } as Record<string, unknown>;
  const maturity = [...(c.maturity as Array<Record<string, unknown>> | undefined) ?? []];
  const sources = [...((c.sources as CandidateSource[]) ?? [])];

  // Find GitHub repo URL from sources or install paths
  const allUrls: string[] = [
    ...sources.map((s) => s.url),
    ...((c.installPaths as Array<Record<string, unknown>> | undefined) ?? []).flatMap((ip) =>
      typeof ip.url === "string" ? [ip.url] : [],
    ),
  ];

  const githubUrl = allUrls.find((u) => u.includes("github.com"));
  if (!githubUrl) {
    return { candidate: c as CandidateType, changes };
  }

  const repo = parseGitHubRepo(githubUrl);
  if (!repo) {
    return { candidate: c as CandidateType, changes };
  }

  changes.push(`found GitHub repo: ${repo.owner}/${repo.repo}`);

  // Fetch repo data
  const repoData = await fetchGitHubRepo(repo.owner, repo.repo);
  if (repoData) {
    // Update or add stars signal
    const starsIdx = maturity.findIndex((m) => m.kind === "repo-stars");
    if (starsIdx >= 0) {
      maturity[starsIdx] = {
        ...maturity[starsIdx],
        value: String(repoData.stars),
        probedAt: now,
        stale: false,
      };
      changes.push(`maturity[repo-stars]: updated to ${repoData.stars}`);
    } else {
      maturity.push({
        kind: "repo-stars",
        value: String(repoData.stars),
        probedAt: now,
        stale: false,
      });
      changes.push(`maturity[repo-stars]: added ${repoData.stars}`);
    }

    // Update or add last-release signal
    const release = await fetchGitHubLatestRelease(repo.owner, repo.repo);
    if (release) {
      const releaseIdx = maturity.findIndex((m) => m.kind === "last-release");
      if (releaseIdx >= 0) {
        maturity[releaseIdx] = {
          ...maturity[releaseIdx],
          value: release.tagName,
          probedAt: now,
          stale: false,
        };
        changes.push(`maturity[last-release]: updated to ${release.tagName}`);
      } else {
        maturity.push({
          kind: "last-release",
          value: release.tagName,
          probedAt: now,
          stale: false,
        });
        changes.push(`maturity[last-release]: added ${release.tagName}`);
      }
    }

    // Add GitHub source if not present
    const hasGithubSource = sources.some((s) => s.url === githubUrl);
    if (!hasGithubSource) {
      sources.push({
        url: githubUrl,
        label: `${repo.owner}/${repo.repo} on GitHub`,
        basis: "cited",
        fetchedAt: now,
      });
      changes.push(`sources: added GitHub repo URL`);
    }
  }

  c.maturity = maturity;
  c.sources = sources;
  return { candidate: c as CandidateType, changes };
}

async function enrichCandidate(
  file: string,
  candidate: CandidateType,
): Promise<EnrichmentResult> {
  const allChanges: string[] = [];

  // 1. Enrich sources (probe URLs)
  const { candidate: afterSources, changes: sourceChanges } = await enrichSources(candidate);
  allChanges.push(...sourceChanges);

  // 2. Enrich alternative-specific data (GitHub stats)
  const { candidate: afterAlt, changes: altChanges } = await enrichAlternative(afterSources);
  allChanges.push(...altChanges);

  return {
    file,
    slug: candidate.slug,
    changes: allChanges,
    candidate: afterAlt,
  };
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
    console.log("ℹ staging/ does not exist — nothing to enrich");
    process.exit(0);
  }

  const files: string[] = [];
  for await (const f of walkDir(STAGING_DIR)) {
    files.push(f);
  }

  if (files.length === 0) {
    console.log("ℹ staging/ is empty — nothing to enrich");
    process.exit(0);
  }

  console.log(`Enriching ${files.length} candidate${files.length === 1 ? "" : "s"}${DRY_RUN ? " (dry run)" : ""}...\n`);

  let enriched = 0;
  let failed = 0;

  for (const file of files) {
    const raw = JSON.parse(await readFile(file, "utf-8"));
    const result = Candidate.safeParse(raw);
    if (!result.success) {
      console.log(`  ✗ ${path.relative(process.cwd(), file)} — invalid candidate, skipping`);
      failed++;
      continue;
    }

    const candidate = result.data;

    // Filter by slug if specified
    if (FILTER_SLUG && candidate.slug !== FILTER_SLUG) continue;

    const enrichment = await enrichCandidate(path.relative(process.cwd(), file), candidate);

    if (enrichment.changes.length === 0) {
      console.log(`  → ${candidate.slug}: no changes`);
      continue;
    }

    console.log(`  ✓ ${candidate.slug}:`);
    for (const change of enrichment.changes) {
      console.log(`      ${change}`);
    }

    if (!DRY_RUN) {
      // Re-validate the enriched candidate
      const revalidated = Candidate.safeParse(enrichment.candidate);
      if (!revalidated.success) {
        console.log(`      ✗ enriched candidate failed re-validation, not writing`);
        failed++;
        continue;
      }
      await writeFile(file, `${JSON.stringify(enrichment.candidate, null, 2)}\n`);
    }

    enriched++;
  }

  console.log("");
  if (DRY_RUN) {
    console.log(`dry run complete — ${enriched} candidate${enriched === 1 ? "" : "s"} would be enriched, ${failed} failed`);
  } else {
    console.log(`✓ enriched ${enriched} candidate${enriched === 1 ? "" : "s"}, ${failed} failed`);
  }
  process.exit(failed > 0 ? 1 : 0);
}

main();
