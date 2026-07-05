import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BasisBadge } from "@/components/basis-badge";
import { StatusMark } from "@/components/status-mark";
import { getAllAlternativeSlugs, getAlternative } from "@/lib/data";

export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await getAllAlternativeSlugs();
  return slugs.map((slug) => ({ altSlug: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ altSlug: string }>;
}): Promise<Metadata> {
  const { altSlug } = await params;
  const alt = await getAlternative(altSlug);
  if (!alt) return {};
  return {
    title: `${alt.name} — FOSS alternative`,
    description: alt.tagline ?? alt.description.slice(0, 140),
  };
}

export default async function AlternativePage({
  params,
}: {
  params: Promise<{ altSlug: string }>;
}) {
  const { altSlug } = await params;
  const alt = await getAlternative(altSlug);
  if (!alt) notFound();

  return (
    <div className="container">
      <nav className="crumb" aria-label="Breadcrumb">
        <a href="/">opencatalog.sh</a>
        <span className="sep">/</span>
        <a href="/browse/">browse</a>
        <span className="sep">/</span>
        <span>alt/{alt.slug}</span>
      </nav>

      <section className="paid-hero">
        <h1>{alt.name}</h1>
        {alt.tagline && <p className="paid-tagline">{alt.tagline}</p>}
        <div className="paid-meta">
          <span className="chip chip-accent">{alt.license.name}</span>
          {alt.deployment.map((d) => (
            <span key={d} className="chip">{d}</span>
          ))}
          {alt.verified ? (
            <StatusMark status="verified" timestamp={alt.generatedAt} />
          ) : (
            <StatusMark status="uncurated" />
          )}
          <span className="sec-note">generated {alt.generatedAt.slice(0, 10)}</span>
        </div>
        <p className="paid-desc">{alt.description}</p>
      </section>

      {/* Replaces */}
      {alt.replaces.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <div className="sec-header">
            <span className="sec-label">replaces</span>
            <span className="sec-note">paid products this tool substitutes for</span>
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {alt.replaces.map((slug) => (
              <a key={slug} href={`/${slug}/`} className="chip" style={{ fontSize: 13, padding: "6px 12px" }}>
                {slug}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Install paths */}
      <section style={{ marginTop: 48 }}>
        <div className="sec-header">
          <span className="sec-label">install paths</span>
          <span className="sec-note">platform-aware · verified</span>
        </div>
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {alt.installPaths.map((ip, i) => (
            <div key={`${ip.platform}-${i}`} style={{ border: "var(--rule) solid var(--rule-line)", borderRadius: "var(--radius-tight)", padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span className="chip">{ip.platform}</span>
                <span className="chip">{ip.kind}</span>
                <BasisBadge basis={ip.basis} />
              </div>
              {ip.command && <pre className="code-block" style={{ margin: "8px 0 0" }}>{ip.command}</pre>}
              {ip.url && (
                <a href={ip.url} className="sec-note" style={{ display: "inline-block", marginTop: 8, textDecoration: "underline", textUnderlineOffset: 2 }}>
                  {ip.url}
                </a>
              )}
              {ip.note && <p className="sec-note" style={{ marginTop: 8 }}>{ip.note}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Maturity signals */}
      {alt.maturity.length > 0 && (
        <section style={{ marginTop: 48 }}>
          <div className="sec-header">
            <span className="sec-label">maturity signals</span>
            <span className="sec-note">probed · freshness tracked</span>
          </div>
          <dl className="kv" style={{ marginTop: 16 }}>
            {alt.maturity.map((m, i) => (
              <div key={`${m.kind}-${i}`} style={{ display: "contents" }}>
                <dt>{m.kind}</dt>
                <dd>
                  {m.value}
                  <span className="sec-note" style={{ marginLeft: 10 }}>
                    probed {m.probedAt.slice(0, 10)}
                    {m.stale && " · stale"}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Known gaps */}
      {alt.knownGaps.length > 0 && (
        <section className="known-gaps" style={{ marginTop: 48 }}>
          <div className="sec-header">
            <span className="sec-label">known gaps</span>
            <span className="sec-note">what this tool does not do</span>
          </div>
          <div className="gaps-list">
            {alt.knownGaps.map((gap) => (
              <div key={gap.slug} className="gap-item">
                <div className="gap-header">
                  <span className="gap-label">{gap.label}</span>
                  {gap.severity && <span className="gap-severity">{gap.severity}</span>}
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

      {/* Sources */}
      {alt.sources.length > 0 && (
        <section style={{ marginTop: 48 }}>
          <div className="sec-header">
            <span className="sec-label">sources</span>
            <span className="sec-note">{alt.sources.length} citation{alt.sources.length === 1 ? "" : "s"}</span>
          </div>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {alt.sources.map((src, i) => (
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
    </div>
  );
}
