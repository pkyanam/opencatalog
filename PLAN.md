# opencatalog.sh - product plan

*Last updated: 2026-07-04. This doc captures the product shape and the path
from empty repo to launch. It is the source of truth for what we're building
and why; `DEFINITIONS.md` is the source of truth for vocabulary and schema
meaning.*

## Thesis

Proprietary software wins on distribution and discoverability more often than
it wins on product quality. For every paid tool with a marketing site, a launch
budget, and ten SEO landing pages, there is often a free, open-source tool that
does 80-100% of the job - buried on GitHub, scattered across package managers,
or known only to the forum thread that answered the question three years ago.

opencatalog.sh is the map from paid software to serious FOSS alternatives. Type a
paid product, category, file format, or workflow and get the grounded answer:
which FOSS tools are credible, what they replace, how to install them, what
license obligations matter, how mature they are, and what gaps remain. The page
a human reads and the JSON an agent fetches are generated from the same data.

The product bet is **proof over listicles**. "10 free alternatives to
Photoshop" is already solved and mostly low-trust. opencatalog.sh should feel like
a field guide: fast, visual, opinionated, and inspectable. Every load-bearing
claim is either probed from a live machine source or cited to a fetched source;
everything else is visibly labeled as a claim.

## Product Feel

opencatalog.sh should not look like a generic SaaS directory. It should feel like
a cross between a terminal-native field manual, a software museum label, and a
radar screen for escaping subscription software.

Design direction:

- **Visual language**: ink, paper, chartreuse/accent green, muted amber for
  warnings, and steel-blue for agent/API surfaces. Keep the grayscale discipline
  from the reference, but add a sharper opencatalog.sh identity rather than
  cloning integrations.sh.
- **Typography**: use an expressive editorial sans for headlines plus a crisp
  mono for facts, slugs, commands, citations, and probe metadata. Avoid default
  system-stack blandness.
- **Motion**: restrained but memorable. Search results should snap in with a
  command-palette feel; proof drawers and comparison rows can slide open; no
  decorative motion that slows reading.
- **Texture**: subtle halftone/grid/noise backgrounds, thin rule lines, dense
  fact chips, and "evidence cards" that make grounding visible.
- **Tone**: direct and useful. No hype copy, no "AI-powered" vagueness, no fake
  objectivity. When a FOSS alternative has a gap, say it plainly.

The cool part is not animation alone. The cool part is that a user lands on
`/notion/`, instantly sees a "switch map" from Notion workflows to Logseq,
AppFlowy, Anytype, and Outline, can filter to self-hosted or desktop-only, open
the citation drawer for any claim, copy the install command, and export the
same grounded answer as JSON.

## Product Shape

- **`/` homepage** - a high-signal search-first landing page. Includes instant
  search, "escape routes" for famous paid tools, category counts, a live
  verification count, and a prominent `/api.json` callout. The hero should be
  interactive: typing "Photoshop", "Notion", "1Password", or "Figma" should
  visibly route users into the catalog rather than just decorate the page.
- **`/<paid-slug>/` curated pages** - the main SEO and product asset. Examples:
  `/adobe-photoshop/`, `/notion/`, `/github-copilot/`. Each page leads with the
  paid product being replaced, then shows a ranked replacement board grouped by
  `best-fit`, `partial-fit`, and `different-philosophy`. Rows include install
  paths, deployment shape, license, maturity signals, supported workflows,
  missing workflows, citations, and proof status. A sticky compare tray lets the
  user compare 2-4 alternatives.
- **`/category/<cat-slug>/`** - breadth landing pages for queries like "open
  source image editing" or "self-hosted project management". Category hubs
  aggregate paid products and alternatives, expose filters, and funnel into
  paid-product pages.
- **`/alt/<alt-slug>/`** - one page per meaningful FOSS alternative. Launch
  should generate these for every alternative, not only multi-product
  alternatives, because users search "is GIMP maintained", "Krita license", and
  "Logseq self hosted" directly. Single-product alternatives can be simpler,
  but they should still have stable URLs.
- **`/license/<license-slug>/`** - reusable license explainers for OSI-approved
  license primitives. These are practical pages, not legal essays: "can I use
  this at work?", "what must I share?", "what changes if I host it for users?".
- **`/browse/`** - the full catalog explorer. Client-side search and filters
  over the generated API payload: category, deployment shape, license family,
  platform, maturity, verified status, and source count.
- **`/about/`** - the narrative and methodology. Explain why opencatalog.sh
  exists, how grounding works, what `verified` means, and where the catalog is
  intentionally conservative.
- **`/api.json`** - one envelope containing curated paid products, alternatives,
  categories, licenses, raw records, and schema version. The page you read and
  the data your agent fetches are the same content.

URL decisions for launch:

- Keep paid-product pages at root for SEO and memorability.
- Reserve namespaces for all other entity kinds: `/alt/`, `/category/`,
  `/license/`, `/browse/`, `/about/`, `/api.json`.
- Add a reserved-slug list before scaffold so paid products cannot collide with
  route namespaces.
- If a paid product and a FOSS project share a slug, paid product keeps the root
  slug and the FOSS project uses `/alt/<slug>/`.

## Differentiating Features

These are required for the site to feel special, not optional polish:

- **Switch map** - on paid-product pages, map paid-product workflows to FOSS
  alternatives. Example: Photoshop workflows become "layered raster editing",
  "RAW photo workflow", "CMYK/prepress", "plugin ecosystem". Each alternative
  shows `supported`, `partial`, or `missing` per workflow.
- **Proof drawer** - every nontrivial row can open an evidence panel showing
  citations, probe timestamps, source URLs, and the exact fact each source
  supports. This makes trust visible instead of buried in JSON.
- **Install paths that respect platform** - desktop alternatives should show
  Homebrew/winget/Flatpak/AppImage/DMG where available; self-hosted alternatives
  should show Docker Compose or documented deploy path; web-deployable tools
  should show hosted/open-core caveats when relevant.
- **Comparison tray** - let users pin alternatives and compare deployment,
  license, workflow fit, maturity, import/export, and known gaps.
- **Agent card** - each page exposes a small "for agents" block: canonical URL,
  API path, schema version, `generatedAt`, and whether the record is verified.
- **Known gaps** - missing or weak capabilities are first-class facts. A page
  that only says nice things is less trustworthy.

## Data Model

Two-layer model:

- **Raw catalog** (`output/*.json`, from `scripts/normalize.ts`): aggregated
  from public feeds such as AlternativeTo, Wikidata, GitHub/GitLab topics,
  F-Droid, Repology, Flathub, Snapcraft, Homebrew, winget, and package
  registries. Raw data is noisy by design and optimized for breadth. Never
  hand-edit it; fix the pipeline.
- **Curated records** (`curated/paid/<paid-slug>.json`,
  `curated/alternatives/<alt-slug>.json`, `curated/categories/<cat-slug>.json`,
  `curated/licenses/<license-slug>.json`): typed, cited, user-facing records.
  Paid-product records carry replacement rankings and workflow fit. Alternative
  records carry install paths, license, maturity, deployment shape, and known
  gaps. Licenses and categories are primitives referenced across pages.

Minimum launch schema contracts:

- Every fact that affects ranking, verification, license, installability,
  maturity, deployment shape, workflow fit, or gap display must carry a
  `basis`: `probed`, `cited`, or `claimed`.
- `verified: true` is allowed only when all load-bearing facts are `probed` or
  `cited`, license is read from a license file or package metadata, install
  path resolves, repo exists, and staleness checks pass.
- Every curated record carries `generatedAt`, `schemaVersion`, and `sources`.
- Raw-only records render with an `uncurated` badge and never outrank verified
  curated records for the same query.

## Content Pipeline

Curated records should come from a repeatable batch pipeline, not hand-editing
and not main-loop agent improvisation:

1. **Select** the next N paid products by demand signal: search-console
   queries once live, obvious high-volume proprietary tools, GitHub-star delta
   among known alternatives, AlternativeTo popularity, and category coverage
   gaps.
2. **Gather** grounding: official paid-product feature/pricing/export pages;
   candidate alternative README/docs/LICENSE/release pages; package-manager
   listings; issue trackers for known gaps; and raw-catalog edges as leads.
3. **Generate** with a cheap model using `curated/GENERATION.md`, emitting the
   schema and preserving source URLs per fact.
4. **Verify** mechanically with `scripts/validate-curated.ts` plus live probes:
   repo exists, license found, stars/contributors/last commit pulled, release or
   package date pulled, install command or package identifier resolves, and no
   placeholder fields remain.
5. **Review** diffs in PRs. Generated content lands as commits, never directly
   to production.
6. **Refresh** quarterly, and sooner when probes fail. Surface `generatedAt`
   and stale probes on-page.

## Ranking Rules

Default ranking must be explainable. Do not hide a black-box score.

Paid-product page ranking:

1. Verified records first.
2. Better workflow coverage first.
3. Deployment match to active filter.
4. Maintained projects first: recent commit/release/package activity.
5. Installability: package-manager presence and clear deploy path.
6. License clarity: OSI-approved, normalized, cited/probed.
7. Popularity only as a tie-breaker, not the main signal.

Raw quality score:

- Has live repo.
- Has normalized OSI license.
- Has install/deploy path.
- Appears in multiple independent feeds.
- Has recent activity.
- Has category and deployment inferred with confidence.

## SEO Strategy

- Target queries: "free alternative to {paid-product}", "open source
  {category}", "{paid-product} alternative open source", "self-hosted
  {category}", "is {alternative} maintained", "{alternative} license".
- Static HTML, canonical URLs, sitemap, robots.txt, OG images, and JSON-LD from
  day one. Use `SoftwareApplication`, `ItemList`, `TechArticle`, and
  `dateModified` where appropriate.
- Paid-product pages are the highest-value landing pages; category hubs capture
  category demand; alternative pages catch long-tail trust and install queries.
- Page titles should be direct: "Open source alternatives to Notion" beats
  clever branding.
- The API is also distribution. FOSS recommenders, package-picker agents, and
  "find me a tool for X" prompts should be able to fetch `/api.json` and cite
  opencatalog.sh as the source of the mapping.

## Stack

- **Next.js 16** App Router on **Vercel**, using static generation for catalog
  pages and route handlers for JSON/API surfaces. The official docs list 16.2.10
  as current on 2026-07-04; do not scaffold on Next 15 unless dependency
  constraints force it.
- **React 19** through the Next App Router default.
- **TypeScript strict** throughout.
- **Tailwind CSS 4** for styling. The official docs show v4.3 on 2026-07-04.
  Use CSS variables for the opencatalog.sh visual system instead of scattering
  one-off utility colors.
- **Bun** as package manager and script runner.
- **Zod or Valibot** for schema validation, selected during scaffold. The
  validator must run in CI and locally with `bun run validate`.
- No hosted database at launch. Catalog data is files plus generated JSON. Add
  persistence only when community submissions or analytics-driven queues need
  it.

## Launch Plan

1. Scaffold the Next.js app with static routes, global visual system, data
   loading utilities, `/api.json`, sitemap, and placeholder seed data.
2. Define schemas in code before writing real content: paid products,
   alternatives, categories, licenses, fact basis, citation, probe, and API
   envelope.
3. Build the core UI with 6-10 hand-curated seed paid products across distinct
   categories: Photoshop, Notion, Figma, GitHub Copilot, 1Password, Linear,
   Slack, Lightroom, Zapier, and Airtable.
4. Add validators and snapshot tests for generated routes/API shape.
5. Implement the raw normalizer only after the curated path renders well. Raw
   breadth should not drive the first design.
6. Add batch generation docs and scripts once the schema and seed pages prove
   the desired page shape.

## Resolved Decisions

- Use **alternative** as the entity name. It matches search behavior. Use
  "replacement" only for page copy where the fit is strong.
- Use root paid-product URLs at launch, with reserved route namespaces to avoid
  collisions.
- Include `deployment` as a primary field from day one: `desktop`,
  `self-hosted`, `web-deployable`, and `hosted-service` when the FOSS project
  also offers an official hosted option.
- Generate `/alt/<slug>/` pages for all curated alternatives at launch.
- Include practical AGPL deployment callouts on license pages and any
  AGPL-licensed self-hosted alternative row.
- Keep one `/api.json` envelope at launch. Split later only if payload size or
  consumer ergonomics demand it.

## Open Questions

- Which 6-10 seed paid products should launch first if we optimize for visual
  impact instead of search volume?
- Should opencatalog.sh accept "source available" tools in a separate excluded
  state, or omit them entirely until after launch?
- Do we want a public contribution flow at launch as GitHub PR templates, or
  keep contributions private until the curated pipeline is stable?
