# OpenCatalog - vocabulary

Working definitions. These terms appear in URLs, navigation, schema fields,
generated content, and page copy. `PLAN.md` explains product direction; this
file defines the nouns and trust rules the implementation must preserve.

## Launch Scope

v1 covers **FOSS alternatives to paid end-user software**.

Included:

- Desktop applications.
- Self-hosted applications.
- Web-deployable applications a user or team can run.
- FOSS projects that also offer an official hosted service, as long as the
  software itself is available under an OSI-approved license.

Excluded at launch:

- Pure libraries, frameworks, SDKs, and infrastructure primitives.
- "Source available" products whose license is not OSI-approved.
- Freemium proprietary products that are free to use but not FOSS.
- Community plugins, themes, and templates unless they are part of a larger
  FOSS alternative record.

At launch, **FOSS** means the project has an OSI-approved license that is
grounded from the actual repository license file or authoritative package
metadata. If licensing cannot be grounded, the project can exist in raw data but
cannot be a verified curated alternative.

The community layer is schema-ready but not rendered at launch. See
`Contribution`.

## Paid Product

The proprietary or paid thing being replaced: **Adobe Photoshop**, **Notion**,
**Figma**, **GitHub Copilot**, **Linear**, **1Password**.

A paid product owns:

- **Feature surface** - what it does, expressed as workflows granular enough to
  compare alternatives. Example: Photoshop is not just "image editing"; it is
  layer-based raster editing, RAW workflow, CMYK/prepress, masks, plugin
  ecosystem, file compatibility, and batch processing.
- **Pricing shape** - subscription, one-time, freemium, per-seat, usage-based,
  or bundle-only. Exact prices drift and should be cited only when they are
  directly relevant.
- **Category membership** - one primary category and optional secondary
  categories.
- **Export/import surface** - where relevant, the formats or APIs users need to
  leave the paid product.

Paid products are the unit of the main SEO landing page and the primary unit of
curation. They are not compositions: "Adobe Creative Cloud" is not a paid
product for v1; Photoshop, Lightroom, and Illustrator are separate paid
products. A brand can appear as metadata but does not get a brand page at
launch.

URL: `/adobe-photoshop/`, `/notion/`

Schema: `curated/paid/<paid-slug>.json`

## Alternative

A FOSS application that replaces, partially replaces, or intentionally
reframes one or more paid products: **GIMP**, **Krita**, **Logseq**,
**AppFlowy**, **Continue**, **Bitwarden**, **Outline**.

Use **alternative** as the entity name because it matches search behavior. Use
**replacement** only when copy is describing a strong fit for a specific paid
product. Do not imply full parity when the workflow fit is partial.

An alternative owns:

- **Deployment shape** - one or more of `desktop`, `self-hosted`,
  `web-deployable`, `hosted-service`.
- **Platform support** - macOS, Windows, Linux, iOS, Android, browser, server,
  Docker, Kubernetes, or other grounded target.
- **Install path** - canonical command, package ID, download page, or deploy
  path per platform.
- **License** - normalized to a license primitive slug and grounded from a
  license file or authoritative package metadata.
- **Maturity signals** - repo stars, last commit, last release, package
  presence, contributor count, and probe timestamps.
- **Workflow fit** - supported, partial, or missing workflows for each paid
  product it replaces.
- **Known gaps** - important limitations that users would otherwise discover
  too late.

Every curated alternative gets a stable page at launch. Even if it replaces
only one paid product, the page is useful for license, install, maturity, and
long-tail search queries.

URL: `/alt/gimp/`, `/alt/logseq/`

Schema: `curated/alternatives/<alt-slug>.json`

## Category

The space a paid product and its alternatives share: **image-editing**,
**note-taking**, **design-collaboration**, **ai-coding-assistant**,
**password-manager**, **project-management**.

A category owns:

- **Definition** - one boundary-setting sentence.
- **Primary workflows** - the recurring jobs users expect tools in this
  category to perform.
- **Members** - paid products and alternatives in the space.
- **Neighbor categories** - adjacent spaces that should not be collapsed into
  the same page.

Categories are breadth landing pages. They answer queries like "open source
image editing" without forcing users to start from a specific paid product.

URL: `/category/image-editing/`, `/category/note-taking/`

Schema: `curated/categories/<cat-slug>.json`

## Workflow

A user-visible job a paid product performs and an alternative may or may not
cover. Workflows are the comparison unit on paid-product pages.

Examples:

- `layered-raster-editing`
- `raw-photo-processing`
- `team-wiki`
- `kanban-planning`
- `password-sharing`
- `code-completion`
- `figma-file-import`

A workflow has:

- **Label** - short human-readable name.
- **Description** - what the user is trying to accomplish.
- **Fit status per alternative** - `supported`, `partial`, `missing`, or
  `unknown`.
- **Basis** - the proof for the fit status.

Workflows prevent vague claims like "GIMP is a Photoshop alternative" from
doing too much work. The useful question is which Photoshop workflows GIMP
covers and which it does not.

Schema: embedded in paid-product records; reusable workflow slugs can later be
promoted to `curated/workflows/<slug>.json` if duplication becomes painful.

## Deployment Shape

How a user can run or access an alternative.

- **`desktop`** - installed locally as an app or command-line end-user tool.
- **`self-hosted`** - deployable on infrastructure the user controls.
- **`web-deployable`** - can be deployed as a web app, including static or
  server-rendered apps, but may not be packaged as a turnkey self-host product.
- **`hosted-service`** - the FOSS project also offers an official hosted
  service. This is metadata, not a reason to exclude the project.

Deployment is a primary filter because it maps directly to user intent:
"self-hosted alternative to Notion" and "desktop alternative to Photoshop" are
different searches.

## Install Path

A grounded way to obtain or run an alternative.

Kinds:

- `package-manager` - Homebrew, winget, Flatpak, Snap, F-Droid, AUR, npm,
  crates.io, PyPI, or similar.
- `download` - official download page, release asset, app store, or package
  page.
- `container` - Docker image, Docker Compose, Helm chart, or documented
  container deploy path.
- `source` - build-from-source instructions when no better path exists.
- `hosted` - official hosted service URL when relevant.

Install paths should be platform-specific where possible. A vague homepage URL
is not a verified install path unless the project itself only publishes that
entry point.

## License Primitive

A reusable license explained once, site-wide: **GPL-3.0**, **AGPL-3.0**,
**Apache-2.0**, **MIT**, **MPL-2.0**, **BSD-3-Clause**, **Unlicense**, and
other OSI-approved licenses as encountered.

Each license page covers:

- What it permits.
- What it requires.
- Whether modifications must be shared.
- Whether network deployment changes obligations.
- Practical implications for teams adopting an alternative.

AGPL pages and AGPL alternative rows must include a deployment callout:
if modified software is exposed to users over a network, those users may be
owed corresponding source under the license terms. This is a practical flag,
not legal advice.

URL: `/license/agpl-3.0/`, `/license/gpl-3.0/`

Schema: `curated/licenses/<license-slug>.json`

## Maturity Signal

A machine-checkable fact about an alternative's maintenance health. Maturity is
not a single rating; it is a set of visible facts.

Signals:

- **Repo stars** - GitHub/GitLab/Codeberg equivalent where available.
- **Last commit** - flagged stale if older than one year unless the project is
  intentionally stable and releases/packages are still active.
- **Last release** - from forge releases or package-manager metadata.
- **Package presence** - ecosystems carrying the project.
- **Contributor count** - proxy for bus factor.
- **Issue velocity** - optional later signal; useful but easy to misread.

Every signal carries `probed_at`. Render raw values and staleness flags; avoid
collapsing them into a fake "good/bad" score in the UI.

## Fit Status

How well an alternative covers a paid-product workflow.

- **`best-fit`** - strong recommendation for the paid-product use case.
- **`partial-fit`** - useful for some workflows but has meaningful gaps.
- **`different-philosophy`** - solves the underlying job differently enough that
  parity framing would mislead users.

Per-workflow statuses:

- **`supported`** - grounded evidence shows the alternative supports the
  workflow.
- **`partial`** - evidence shows support with constraints.
- **`missing`** - evidence or documented gap shows the workflow is not
  supported.
- **`unknown`** - not enough grounded information. Unknown must not contribute
  to a verified positive claim.

## Fact Basis

Every nontrivial curated fact carries a basis tag.

- **`probed`** - re-verifiable from a machine signal the project publishes:
  repo metadata, license file, package-manager metadata, release feed, or
  install/deploy resolution.
- **`cited`** - read from a fetched source with the source URL carried on the
  fact: official docs, README, issue, forum thread, migration guide, or pricing
  page.
- **`claimed`** - the project's own positioning with no independent grounding,
  or a lead from a directory/feed that has not been verified.

Claimed facts may render if labeled, but they cannot justify `verified: true`
and should not be used as the sole basis for ranking.

## Verified

`verified: true` means grounding actually happened. It does not mean the
alternative is endorsed, perfect, secure, or best for every user.

A curated paid-product record can be verified only when:

- The paid product feature/workflow surface is cited.
- Every ranked alternative has a grounded license.
- Every ranked alternative has at least one grounded install or deploy path.
- Load-bearing workflow fit facts are `probed` or `cited`.
- Known gaps are cited when they affect ranking or warnings.
- Live probes for repo/package maturity pass or stale status is explicitly
  shown.
- `generatedAt`, `schemaVersion`, and `sources` are present.

An alternative record can be verified only when:

- License is grounded.
- Repo or authoritative project source exists.
- At least one install path is grounded.
- Maturity probes have timestamps.
- Deployment shape is grounded.

## Raw Record

A normalized but uncurated item from public feeds. Raw records exist for breadth
and discovery, not for user trust.

Raw records may have:

- Duplicate or conflicting names.
- Inferred categories.
- Unverified license strings.
- Missing install paths.
- Stale repository data.
- False alternative edges from third-party directories.

Raw records render with an `uncurated` badge and never outrank verified curated
records for the same query.

Schema: `output/*.json`

## Contribution

Community-shared context attached to one or more alternatives. Designed in the
schema at launch, rendered later.

Kinds:

- **`migration-note`** - walkthrough for moving from a paid product to a FOSS
  alternative. Carries `from`, `to`, `steps`, and citations.
- **`gap-report`** - community-confirmed limitation. Carries `alt`, `gap`,
  `verified_at`, and source link.
- **`deploy-recipe`** - self-hosting or deployment walkthrough. Carries `alt`,
  `target`, `steps`, and dependencies such as databases or object storage.

Trust is enforced at the citation level, not the attribution level. Unlinked
opinions are rejected. Contributions can improve the catalog only when they add
source-backed facts.

## Relationships

```text
license primitive  <-referenced by-  alternative  -replaces->  paid product
                                          ^                          |
                                          |                          |
                                   belongs to / fits          belongs to
                                          |                          |
                                       category  <-------------------

paid product  -has-> workflows <-fit facts- alternative
alternative   -has-> install paths, deployment shapes, maturity signals
```

Visitor questions map cleanly:

- "What's a free alternative to Photoshop?" -> paid-product page.
- "What's open source for image editing?" -> category hub.
- "Is GIMP maintained?" -> alternative page.
- "Can I deploy an AGPL app for my team?" -> license page plus AGPL callout.
- "How do I install Krita?" -> alternative page install paths.
- "What does Logseq miss compared with Notion?" -> workflow fit and known gaps.

## Naming Rules

- Prefer **alternative** for the entity.
- Use **FOSS** in methodology and filters; use **open source** in SEO copy
  where it matches user language.
- Avoid **free** when the meaning could be price rather than license. Use
  "free and open-source" in page titles only when SEO requires it.
- Use **verified** only for grounding status, never for quality endorsement.
- Use **known gap** instead of "con" or "weakness" to keep the tone factual.
