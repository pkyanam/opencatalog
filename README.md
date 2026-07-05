# opencatalog.sh

The map from paid software to serious FOSS alternatives. Every claim grounded, every install path verified, every gap labeled. Read the page or fetch `/api.json`.

## What this is

opencatalog.sh is a field manual, not a listicle. Each paid product page is a switch map — a grid of workflows x alternatives, with every cell grounded in a source you can click. Each alternative page lists install paths, maturity signals, and known gaps. Every record carries a freshness timestamp and a verification badge.

The page you read and the JSON an agent fetches are the same content.

## Tech stack

- **Framework**: Next.js 16 App Router (static generation) on Vercel
- **Language**: TypeScript strict (exactOptionalPropertyTypes, noUncheckedIndexedAccess)
- **Schema**: Zod 4 with native JSON Schema export
- **Styling**: Tailwind CSS 4.3 with custom CSS-variable token system
- **Fonts**: IBM Plex Mono + Sans (self-hosted)
- **Search**: Orama 3.1 (client-side, faceted)
- **Palette**: cmdk
- **Animation**: Motion
- **Tests**: Bun test + Playwright
- **Lint**: Biome
- **Package manager**: Bun 1.3

## Getting started

```bash
bun install
bun run dev          # http://localhost:3000
```

### Verification

```bash
bun run validate     # validate curated records
bun run build        # build all static pages
bun test             # unit tests (15)
bun run test:e2e     # Playwright E2E (15)
```

## The catalog

Curated records live in `curated/` as hand-written JSON files validated against Zod schemas:

```
curated/
  paid/          # paid products (Notion, Adobe Photoshop, ...)
  alternatives/  # FOSS tools (AppFlowy, Logseq, GIMP, Krita, Joplin, ...)
  categories/    # categories (note-taking, image-editing, ...)
  licenses/      # licenses (AGPL-3.0, GPL-3.0, MIT, MPL-2.0)
```

The full catalog is available as JSON:
- `GET /api.json` — full envelope
- `GET /api.schema.json` — JSON Schema (draft 2020-12)

## Submitting new entries

There are four ways to submit. All go through the same pipeline: **staging -> validate -> enrich -> promote -> curated**.

### 1. CLI (local)

```bash
# Interactive
bun run add-entry

# Quick mode
bun run add-entry --kind alternative --slug my-tool --name "My Tool"

# From a JSON file
bun run add-entry --file ./my-candidate.json
```

### 2. Public API (programmatic)

```bash
curl -X POST https://opencatalog.sh/api/submit \
  -H "Content-Type: application/json" \
  -H "X-Submit-Source: ai-agent" \
  -H "X-Submit-Identity: my-bot" \
  -d '{
    "kind": "alternative",
    "slug": "my-tool",
    "name": "My Tool",
    "description": "A free tool that does X",
    "categories": ["some-category"],
    "replaces": ["some-paid-product"],
    "licenseSlug": "mit",
    "deployment": ["desktop"],
    "installPaths": [],
    "maturity": [],
    "knownGaps": [],
    "sources": []
  }'
```

No auth required. Rate limited to 10 submissions per IP per hour. Submissions are stored in Vercel KV and synced to git via a GitHub Action that creates PRs for review.

### 3. GitHub Issue

Open an issue using the "Submit a new entry" template. A maintainer will run the pipeline.

### 4. Pull Request

Add a candidate JSON file to `staging/` and open a PR. See `src/lib/candidate-schema.ts` for the schema.

### Pipeline steps

```bash
bun run validate:staging   # validate candidates in staging/
bun run enrich             # probe URLs, fetch GitHub stats, upgrade basis
bun run promote            # convert to curated schema, move to curated/
bun run validate           # validate curated records
bun run build              # build the site
```

## Trust model

Every load-bearing fact carries a **basis**:

| Basis | Meaning |
|-------|---------|
| `probed` | Verified by direct probe at the source URL |
| `cited` | Sourced from documentation or official statement |
| `claimed` | Asserted without independent verification |

A record is **verified** only if its license is grounded, at least one install path is probed or cited, and load-bearing workflow facts are not merely claimed. The validator enforces this mechanically.

Every record carries `generatedAt`. Maturity signals carry `probedAt` and a derived `stale` flag. Stale probes are visible on the page.

## Automated probes

A GitHub Action runs weekly to re-probe all curated records:

- Verifies source URLs are still live
- Fetches fresh GitHub repo stats (stars, releases)
- Updates maturity signals and staleness flags
- Creates a PR with the refreshed data

## Infrastructure

| Component | Service |
|-----------|---------|
| Hosting | Vercel (static + serverless) |
| Submission queue | Upstash Redis (free tier: 10k commands/day) |
| CI/CD | GitHub Actions |
| Domain | opencatalog.sh |

### Upstash Redis setup

The public submission API (`POST /api/submit`) stores entries in Upstash Redis. Without it, the API returns 503.

1. **Create an Upstash Redis database** via Vercel:
   - Vercel dashboard → your project → Storage → Upstash (marketplace)
   - Vercel auto-provisions env vars: `KV_REST_API_URL` and `KV_REST_API_TOKEN`
   - No manual env var setup needed

2. **Add the same credentials to GitHub** (for the sync Action):
   - GitHub repo → Settings → Secrets and variables → Actions
   - Add `KV_REST_API_URL` and `KV_REST_API_TOKEN` (copy values from Vercel env vars)

After that, `POST /api/submit` works for anyone. Submissions land in Redis, the GitHub Action syncs them to PRs every 2 hours.

## License

MIT
