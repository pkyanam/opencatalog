import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BasisBadge } from "@/components/basis-badge";
import { PaidProductInteractions } from "@/components/paid-product-interactions";
import { StatusMark } from "@/components/status-mark";
import {
  getAllPaidProductSlugs,
  getAlternative,
  getPaidProduct,
  isReservedSlug,
} from "@/lib/data";

export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await getAllPaidProductSlugs();
  return slugs.map((slug) => ({ paidSlug: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ paidSlug: string }>;
}): Promise<Metadata> {
  const { paidSlug } = await params;
  const paid = await getPaidProduct(paidSlug);
  if (!paid) return {};
  return {
    title: `${paid.name} → FOSS alternatives`,
    description: `${paid.tagline ?? paid.description.slice(0, 120)} — ${paid.rankedAlternatives.length} grounded FOSS alternatives, with workflow fit, install paths, and known gaps.`,
  };
}

export default async function PaidProductPage({
  params,
}: {
  params: Promise<{ paidSlug: string }>;
}) {
  const { paidSlug } = await params;
  if (isReservedSlug(paidSlug)) notFound();
  const paid = await getPaidProduct(paidSlug);
  if (!paid) notFound();

  // Resolve all alternatives referenced by this paid product
  const alternatives = await Promise.all(
    paid.rankedAlternatives.map((ra) => getAlternative(ra.altSlug)),
  );
  const validAlts = alternatives.filter((a) => a !== null);

  // Collect all known gaps from alternatives
  const allGaps = validAlts.flatMap((a) =>
    a!.knownGaps.map((g) => ({ ...g, altName: a!.name, altSlug: a!.slug })),
  );

  return (
    <div className="container">
      <nav className="crumb" aria-label="Breadcrumb">
        <a href="/">opencatalog</a>
        <span className="sep">/</span>
        <span>{paid.slug}</span>
      </nav>

      {/* Hero */}
      <section className="paid-hero">
        <h1>{paid.name}</h1>
        {paid.tagline && <p className="paid-tagline">{paid.tagline}</p>}
        <div className="paid-meta">
          <span className="chip">{paid.category}</span>
          <span className="chip">{paid.pricingShape}</span>
          {paid.verified && <StatusMark status="verified" timestamp={paid.generatedAt} />}
          <span className="sec-note">generated {paid.generatedAt.slice(0, 10)}</span>
        </div>
        <p className="paid-desc">{paid.description}</p>
        {paid.pricingNote && (
          <p className="sec-note" style={{ marginTop: 8 }}>{paid.pricingNote}</p>
        )}
      </section>

      {/* Interactive: switch map + ranked board + proof drawer + compare tray */}
      <PaidProductInteractions paid={paid} alternatives={validAlts} />

      {/* Known gaps — aggregated across alternatives */}
      {allGaps.length > 0 && (
        <section className="known-gaps">
          <div className="sec-header">
            <span className="sec-label">known gaps</span>
            <span className="sec-note">what these alternatives do not do</span>
          </div>
          <div className="gaps-list">
            {allGaps.map((gap) => (
              <div key={`${gap.altSlug}-${gap.slug}`} className="gap-item">
                <div className="gap-header">
                  <span className="gap-label">{gap.label}</span>
                  {gap.severity && <span className="gap-severity">{gap.severity}</span>}
                  <span className="sec-note" style={{ marginLeft: "auto" }}>
                    <a href={`/alt/${gap.altSlug}/`}>{gap.altName}</a>
                  </span>
                </div>
                <p className="gap-desc">{gap.description}</p>
                <div style={{ marginTop: 6, display: "flex", gap: 6, alignItems: "center" }}>
                  <BasisBadge basis={gap.basis} />
                  {gap.sources.length > 0 && (
                    <span className="sec-note">{gap.sources.length} source{gap.sources.length === 1 ? "" : "s"}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Export/import surface */}
      {paid.exportImport && (
        <section style={{ marginTop: 56 }}>
          <div className="sec-header">
            <span className="sec-label">export &amp; import</span>
            <span className="sec-note">how to get your data out</span>
          </div>
          <dl className="kv">
            <dt>formats</dt>
            <dd>{paid.exportImport.formats.join(", ")}</dd>
            {paid.exportImport.apis.length > 0 && (
              <>
                <dt>API</dt>
                <dd>
                  {paid.exportImport.apis.map((url) => (
                    <a key={url} href={url}>{url}</a>
                  ))}
                </dd>
              </>
            )}
            {paid.exportImport.note && (
              <>
                <dt>note</dt>
                <dd>{paid.exportImport.note}</dd>
              </>
            )}
          </dl>
          <div style={{ marginTop: 10, display: "flex", gap: 6, alignItems: "center" }}>
            <BasisBadge basis={paid.exportImport.basis} />
          </div>
        </section>
      )}

      {/* Sources for the paid product itself */}
      {paid.sources.length > 0 && (
        <section style={{ marginTop: 56 }}>
          <div className="sec-header">
            <span className="sec-label">sources</span>
            <span className="sec-note">{paid.sources.length} citation{paid.sources.length === 1 ? "" : "s"}</span>
          </div>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {paid.sources.map((src, i) => (
              <a key={`${src.url}-${i}`} href={src.url} className="proof-source" target="_blank" rel="noopener noreferrer">
                <span className="src-label">{src.label}</span>
                <span className="src-url">{src.url}</span>
                <span className="src-meta">
                  <BasisBadge basis={src.basis} />
                  {src.fetchedAt && <span className="sec-note">fetched {src.fetchedAt.slice(0, 10)}</span>}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Agent card */}
      <section className="agent-card" style={{ marginTop: 56 }}>
        <p className="sec-label">for agents</p>
        <h2>Fetch this page as JSON.</h2>
        <p>
          The entire catalog — including this paid product and all its ranked alternatives —
          is available at <code>/api.json</code>. Filter client-side by{" "}
          <code>paidProducts[].slug === &quot;{paid.slug}&quot;</code>.
        </p>
        <div className="agent-endpoints">
          <div className="agent-endpoint">
            <span className="agent-method">GET</span>
            <a href="/api.json" className="agent-url">/api.json</a>
          </div>
          <div className="agent-endpoint">
            <span className="agent-method">GET</span>
            <a href="/api.schema.json" className="agent-url">/api.schema.json</a>
          </div>
        </div>
      </section>
    </div>
  );
}
