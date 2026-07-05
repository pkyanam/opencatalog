import {
  type Alternative,
  type Category,
  type LicensePrimitive,
  type PaidProduct,
  SCHEMA_VERSION,
} from "./schema";
import { buildApiEnvelope } from "./data";

/*
 * Agent guide content generator.
 *
 * Produces the markdown body for /agents.md and /skills.md from live catalog
 * data at build time. Both files expose the same endpoints, slugs, schema
 * reference, and submission flow — agents.md is a flat reference, skills.md
 * is re-framed as agent capabilities.
 */

const BASE = "https://www.opencatalog.sh";

export interface CatalogSummary {
  schemaVersion: string;
  generatedAt: string;
  paidProducts: PaidProduct[];
  alternatives: Alternative[];
  categories: Category[];
  licenses: LicensePrimitive[];
}

export async function loadCatalogSummary(): Promise<CatalogSummary> {
  const envelope = await buildApiEnvelope();
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: envelope.generatedAt,
    paidProducts: envelope.paidProducts,
    alternatives: envelope.alternatives,
    categories: envelope.categories,
    licenses: envelope.licenses,
  };
}

/* ─── Shared blocks ─────────────────────────────────────────────────────── */

function endpointTable(c: CatalogSummary): string {
  return [
    "| Method | Path | Returns | Notes |",
    "|--------|------|---------|-------|",
    `| GET | \`/api.json\` | Full envelope | All ${c.paidProducts.length} paid products, ${c.alternatives.length} alternatives, ${c.categories.length} categories, ${c.licenses.length} licenses in one response |`,
    "| GET | `/api.schema.json` | JSON Schema (draft 2020-12) | Validate envelopes client-side |",
    `| GET | \`/api/paid/{slug}\` | Single \`PaidProduct\` | Available slugs: ${c.paidProducts.map((p) => `\`${p.slug}\``).join(", ")} |`,
    `| GET | \`/api/alt/{slug}\` | Single \`Alternative\` | Available slugs: ${c.alternatives.map((a) => `\`${a.slug}\``).join(", ")} |`,
    `| GET | \`/api/category/{slug}\` | Single \`Category\` | Available slugs: ${c.categories.map((cat) => `\`${cat.slug}\``).join(", ")} |`,
    `| GET | \`/api/license/{slug}\` | Single \`LicensePrimitive\` | Available slugs: ${c.licenses.map((l) => `\`${l.slug}\``).join(", ")} |`,
    "| POST | `/api/submit` | Submission receipt | Submit a candidate entry (see below) |",
  ].join("\n");
}

function trustModel(): string {
  return [
    "### Basis field",
    "",
    "Every load-bearing fact carries a `basis` value:",
    "",
    "| Value | Meaning |",
    "|-------|---------|",
    "| `probed` | Verified by direct probe at the source URL |",
    "| `cited` | Sourced from documentation or official statement |",
    "| `claimed` | Asserted without independent verification |",
    "",
    "### Verified records",
    "",
    "A record is `verified: true` only if:",
    "- Its license is grounded (probed or cited)",
    "- At least one install path is probed or cited",
    "- Load-bearing workflow facts are not merely claimed",
    "",
    "### Freshness",
    "",
    "- Every record carries `generatedAt` (ISO 8601 datetime)",
    "- Maturity signals carry `probedAt` and a derived `stale` boolean",
    "- Stale probes are visible — the catalog does not hide decay",
  ].join("\n");
}

function schemaReference(): string {
  return [
    "### Top-level envelope (`ApiEnvelope`)",
    "",
    "```",
    "{",
    '  "schemaVersion": "0.1.0",',
    '  "generatedAt": "<ISO datetime>",',
    '  "paidProducts":   PaidProduct[],',
    '  "alternatives":   Alternative[],',
    '  "categories":     Category[],',
    '  "licenses":       LicensePrimitive[]',
    "}",
    "```",
    "",
    "### Key types",
    "",
    "- **PaidProduct** — a commercial product with `rankedAlternatives[]` linking to FOSS alternatives by slug, `workflows[]`, `exportImport`, `pricingShape`, `sources[]`",
    "- **Alternative** — a FOSS tool with `license` (ref), `deployment[]`, `platforms[]`, `installPaths[]`, `maturity[]` signals, `knownGaps[]`, `replaces[]` (paid product slugs), `categories[]`",
    "- **Category** — groups paid products and alternatives; has `neighborCategories[]`",
    "- **LicensePrimitive** — SPDX-aligned: `spdxId`, `osiApproved`, `permits[]`, `requires[]`, `networkDeploymentNote`",
    "- **Source** — `{ url, label, basis, fetchedAt? }` — every load-bearing fact links to its evidence",
    "",
    "### Enums",
    "",
    "- `Basis`: `probed | cited | claimed`",
    "- `DeploymentShape`: `desktop | self-hosted | web-deployable | hosted-service`",
    "- `FitTier`: `best-fit | partial-fit | different-philosophy`",
    "- `WorkflowFitStatus`: `supported | partial | missing | unknown`",
    "- `InstallPathKind`: `package-manager | download | container | source | hosted`",
    "- `Platform`: `macos | windows | linux | ios | android | browser | server | docker | kubernetes`",
    "- `PricingShape`: `subscription | one-time | freemium | per-seat | usage-based | bundle-only`",
    "",
    "Fetch `/api.schema.json` for the full machine-readable JSON Schema (draft 2020-12).",
  ].join("\n");
}

function submissionSection(): string {
  return [
    "### Endpoint",
    "",
    "`POST /api/submit` — public, no auth required. Rate limited to 10 submissions per IP per hour.",
    "",
    "### Headers",
    "",
    "| Header | Required | Values |",
    "|--------|----------|--------|",
    "| `Content-Type` | yes | `application/json` |",
    "| `X-Submit-Source` | no | `manual \\| ai-agent \\| scraper \\| community-pr` |",
    "| `X-Submit-Identity` | no | Your name or agent identifier |",
    "",
    "### Body",
    "",
    "The body is a `Candidate` — a discriminated union on `kind`:",
    "",
    "- `kind: \"paid-product\"` — submit a new paid product to map",
    "- `kind: \"alternative\"` — submit a new FOSS alternative",
    "- `kind: \"category\"` — submit a new category",
    "- `kind: \"license\"` — submit a new license entry",
    "",
    "The candidate schema is relaxed vs. the curated schema: fields are optional where enrichment fills gaps, `basis` defaults to `claimed`, and `sources` can be empty. A `submitter` block is injected from headers.",
    "",
    "### Example: submit a FOSS alternative",
    "",
    "```bash",
    `curl -X POST ${BASE}/api/submit \\`,
    "  -H \"Content-Type: application/json\" \\",
    "  -H \"X-Submit-Source: ai-agent\" \\",
    "  -H \"X-Submit-Identity: my-agent\" \\",
    "  -d '{",
    "    \"kind\": \"alternative\",",
    "    \"slug\": \"my-tool\",",
    "    \"name\": \"My Tool\",",
    "    \"description\": \"A free tool that does X\",",
    "    \"categories\": [\"some-category\"],",
    "    \"replaces\": [\"some-paid-product\"],",
    "    \"licenseSlug\": \"mit\",",
    "    \"deployment\": [\"desktop\"],",
    "    \"installPaths\": [],",
    "    \"maturity\": [],",
    "    \"knownGaps\": [],",
    "    \"sources\": []",
    "  }'",
    "```",
    "",
    "### Response",
    "",
    "| Status | Meaning |",
    "|--------|---------|",
    "| 201 | Submission queued — returns `{ ok, submissionId, slug, kind, message, rateLimit }` |",
    "| 400 | Validation error — returns `{ ok: false, error, errors[] }` |",
    "| 409 | Duplicate slug already pending |",
    "| 429 | Rate limited — returns `Retry-After` header |",
    "| 503 | Redis not configured (server-side issue) |",
    "",
    "### Pipeline after submission",
    "",
    "Submissions land in a Redis queue. A GitHub Action syncs them every 2 hours:",
    "",
    "``",
    "POST /api/submit → Redis queue → GitHub Action writes to staging/ → opens PR → review → enrich → promote → curated/",
    "```",
    "",
    "The candidate schema is defined in `src/lib/candidate-schema.ts`. Fetch `/api/submit` (GET) for inline docs.",
  ].join("\n");
}

function htmlMapping(c: CatalogSummary): string {
  const paidRows = c.paidProducts
    .map((p) => `| ${BASE}/${p.slug}/ | ${p.name} |`)
    .join("\n");
  const altRows = c.alternatives
    .map((a) => `| ${BASE}/alt/${a.slug}/ | ${a.name} |`)
    .join("\n");
  const catRows = c.categories
    .map((cat) => `| ${BASE}/category/${cat.slug}/ | ${cat.name} |`)
    .join("\n");
  const licRows = c.licenses
    .map((l) => `| ${BASE}/license/${l.slug}/ | ${l.name} |`)
    .join("\n");

  return [
    "The HTML site mirrors the JSON 1:1. These URLs are for reference or for presenting results to humans:",
    "",
    "### Paid products",
    "",
    "| URL | Name |",
    "|-----|------|",
    paidRows,
    "",
    "### FOSS alternatives",
    "",
    "| URL | Name |",
    "|-----|------|",
    altRows,
    "",
    "### Categories",
    "",
    "| URL | Name |",
    "|-----|------|",
    catRows,
    "",
    "### Licenses",
    "",
    "| URL | Name |",
    "|-----|------|",
    licRows,
  ].join("\n");
}

/* ─── agents.md ─────────────────────────────────────────────────────────── */

export function generateAgentsMd(c: CatalogSummary): string {
  return [
    `# opencatalog.sh — Agent Guide`,
    "",
    `> Schema version: \`${c.schemaVersion}\` · Generated: ${c.generatedAt}`,
    "",
    "opencatalog.sh maps paid software to serious FOSS alternatives. Every claim",
    "is grounded with a citeable source, every install path is verified, every gap",
    "is labeled. The HTML site and the JSON API serve the same content — there is",
    "no separate API model.",
    "",
    "This file is the single entry point for AI agents and LLMs. It lists every",
    "endpoint, every available record slug, the schema, the trust model, and the",
    "submission flow. Fetch this file, then fetch `/api.json` for the data.",
    "",
    "## Endpoints",
    "",
    endpointTable(c),
    "",
    "All GET endpoints are static (CDN-served) and return `Cache-Control: public, max-age=3600, s-maxage=86400`.",
    "",
    "## Schema reference",
    "",
    schemaReference(),
    "",
    "## Trust model",
    "",
    trustModel(),
    "",
    "## Submitting new entries",
    "",
    submissionSection(),
    "",
    "## HTML page map",
    "",
    htmlMapping(c),
    "",
    "## How to use this site as an agent",
    "",
    "1. **Discover what exists**: fetch `/api.json` for the full envelope, or read the slug lists in the endpoint table above.",
    "2. **Get a single record**: fetch `/api/paid/{slug}`, `/api/alt/{slug}`, `/api/category/{slug}`, or `/api/license/{slug}`.",
    "3. **Validate**: fetch `/api.schema.json` and validate any response against it.",
    "4. **Submit a new entry**: `POST /api/submit` with a candidate body (see submission section above).",
    "5. **Link a human to results**: use the HTML page map above — the HTML and JSON are the same content.",
    "",
    "## Conventions",
    "",
    "- All JSON uses `Content-Type: application/json; charset=utf-8`",
    "- Datetimes are ISO 8601 (UTC)",
    "- Slugs are lowercase, hyphen-separated, matching `/^[a-z0-9-]+$/`",
    "- Reserved slugs (cannot be paid product slugs): `alt`, `category`, `license`, `browse`, `about`, `api`, `api.json`, `api.schema.json`",
    "",
    `## See also: ${BASE}/skills.md`,
    "",
  ].join("\n");
}

/* ─── skills.md ─────────────────────────────────────────────────────────── */

export function generateSkillsMd(c: CatalogSummary): string {
  return [
    `# opencatalog.sh — Agent Skills`,
    "",
    `> Schema version: \`${c.schemaVersion}\` · Generated: ${c.generatedAt}`,
    "",
    "opencatalog.sh maps paid software to serious FOSS alternatives. This file",
    "describes the same site as `/agents.md` but organized as capabilities an",
    "agent can invoke. Each skill lists the endpoint, inputs, outputs, and an",
    "example. The underlying data, schema, and trust model are identical.",
    "",
    "## Skill: Query the full catalog",
    "",
    "**Endpoint**: `GET /api.json`",
    "",
    "Returns the complete catalog as a single JSON envelope. Use this when you",
    "need to browse, search, or cross-reference records without multiple",
    "requests.",
    "",
    "**Output**: `ApiEnvelope` — `{ schemaVersion, generatedAt, paidProducts[], alternatives[], categories[], licenses[] }`",
    "",
    "**Current contents**:",
    `- ${c.paidProducts.length} paid products: ${c.paidProducts.map((p) => `\`${p.slug}\``).join(", ")}`,
    `- ${c.alternatives.length} FOSS alternatives: ${c.alternatives.map((a) => `\`${a.slug}\``).join(", ")}`,
    `- ${c.categories.length} categories: ${c.categories.map((cat) => `\`${cat.slug}\``).join(", ")}`,
    `- ${c.licenses.length} licenses: ${c.licenses.map((l) => `\`${l.slug}\``).join(", ")}`,
    "",
    "## Skill: Fetch a single record",
    "",
    "Fetch one record by type and slug without downloading the full envelope.",
    "",
    "| Capability | Endpoint | Output type |",
    "|-----------|----------|-------------|",
    "| Get a paid product | `GET /api/paid/{slug}` | `PaidProduct` |",
    "| Get a FOSS alternative | `GET /api/alt/{slug}` | `Alternative` |",
    "| Get a category | `GET /api/category/{slug}` | `Category` |",
    "| Get a license | `GET /api/license/{slug}` | `LicensePrimitive` |",
    "",
    "**Available slugs**:",
    "",
    `- Paid products: ${c.paidProducts.map((p) => `\`${p.slug}\``).join(", ")}`,
    `- Alternatives: ${c.alternatives.map((a) => `\`${a.slug}\``).join(", ")}`,
    `- Categories: ${c.categories.map((cat) => `\`${cat.slug}\``).join(", ")}`,
    `- Licenses: ${c.licenses.map((l) => `\`${l.slug}\``).join(", ")}`,
    "",
    '**On 404**: `{ "error": "not found" }`',
    "",
    "## Skill: Validate data against the schema",
    "",
    "**Endpoint**: `GET /api.schema.json`",
    "",
    "Returns a JSON Schema (draft 2020-12) generated from the Zod source of",
    "truth. Use this to validate envelopes or individual records before acting",
    "on them.",
    "",
    "**Output**: `application/schema+json`",
    "",
    "## Skill: Submit a new entry",
    "",
    submissionSection(),
    "",
    "## Skill: Understand trust and freshness",
    "",
    trustModel(),
    "",
    "## Skill: Link humans to results",
    "",
    "The HTML site mirrors the JSON 1:1. Use these URLs when presenting results",
    "to a human:",
    "",
    htmlMapping(c),
    "",
    "## Schema reference",
    "",
    schemaReference(),
    "",
    "## Conventions",
    "",
    "- All JSON uses `Content-Type: application/json; charset=utf-8`",
    "- Datetimes are ISO 8601 (UTC)",
    "- Slugs are lowercase, hyphen-separated, matching `/^[a-z0-9-]+$/`",
    "- Reserved slugs (cannot be paid product slugs): `alt`, `category`, `license`, `browse`, `about`, `api`, `api.json`, `api.schema.json`",
    "",
    `## See also: ${BASE}/agents.md`,
    "",
  ].join("\n");
}

/* ─── llms.txt ──────────────────────────────────────────────────────────── */

export function generateLlmsTxt(c: CatalogSummary): string {
  return [
    "# opencatalog.sh",
    "",
    `> The map from paid software to serious FOSS alternatives. Schema version ${c.schemaVersion}.`,
    "",
    `opencatalog.sh maps paid software to FOSS alternatives. ${c.paidProducts.length} paid products, ${c.alternatives.length} FOSS alternatives, ${c.categories.length} categories, ${c.licenses.length} licenses. Every claim is grounded with a citeable source.`,
    "",
    "## Agent entry points",
    "",
    `- ${BASE}/agents.md — full agent guide (endpoints, schema, trust model, submission flow)`,
    `- ${BASE}/skills.md — same content organized as agent skills/capabilities`,
    `- ${BASE}/api.json — complete catalog as JSON (${c.paidProducts.length + c.alternatives.length + c.categories.length + c.licenses.length} records)`,
    `- ${BASE}/api.schema.json — JSON Schema (draft 2020-12) for validation`,
    "",
    "## Per-record JSON",
    "",
    `- GET /api/paid/{slug} — individual paid product`,
    `- GET /api/alt/{slug} — individual FOSS alternative`,
    `- GET /api/category/{slug} — individual category`,
    `- GET /api/license/{slug} — individual license`,
    "",
    "## Submission",
    "",
    `- POST /api/submit — submit a new candidate entry (no auth, rate-limited)`,
    "",
  ].join("\n");
}
