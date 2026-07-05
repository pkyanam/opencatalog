import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllLicenseSlugs, getLicense, loadAlternatives } from "@/lib/data";
import { BasisBadge } from "@/components/basis-badge";

export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await getAllLicenseSlugs();
  return slugs.map((slug) => ({ licenseSlug: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ licenseSlug: string }>;
}): Promise<Metadata> {
  const { licenseSlug } = await params;
  const lic = await getLicense(licenseSlug);
  if (!lic) return {};
  return {
    title: `${lic.name} — license`,
    description: lic.practicalCallout?.slice(0, 140) ?? `SPDX: ${lic.spdxId}`,
  };
}

export default async function LicensePage({
  params,
}: {
  params: Promise<{ licenseSlug: string }>;
}) {
  const { licenseSlug } = await params;
  const lic = await getLicense(licenseSlug);
  if (!lic) notFound();

  const allAlts = await loadAlternatives();
  const altsUsingLic = allAlts.filter((a) => a.license.slug === lic.slug);

  return (
    <div className="container">
      <nav className="crumb" aria-label="Breadcrumb">
        <a href="/">opencatalog.sh</a>
        <span className="sep">/</span>
        <span>license/{lic.slug}</span>
      </nav>

      <section className="paid-hero">
        <h1>{lic.name}</h1>
        <div className="paid-meta">
          <span className="chip">SPDX: {lic.spdxId}</span>
          <span className={`chip ${lic.osiApproved ? "chip-accent" : "chip-warn"}`}>
            {lic.osiApproved ? "OSI-approved" : "not OSI-approved"}
          </span>
        </div>
      </section>

      {lic.practicalCallout && (
        <section style={{ marginTop: 32 }}>
          <div className="sec-header">
            <span className="sec-label">practical callout</span>
          </div>
          <p className="paid-desc" style={{ marginTop: 14 }}>{lic.practicalCallout}</p>
        </section>
      )}

      <section style={{ marginTop: 40 }}>
        <div className="sec-header">
          <span className="sec-label">what it permits</span>
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {lic.permits.map((p) => (
            <span key={p} className="chip chip-accent">{p}</span>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 32 }}>
        <div className="sec-header">
          <span className="sec-label">what it requires</span>
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {lic.requires.map((r) => (
            <span key={r} className="chip chip-warn">{r}</span>
          ))}
        </div>
      </section>

      {lic.networkDeploymentNote && (
        <section style={{ marginTop: 32 }}>
          <div className="sec-header">
            <span className="sec-label">network deployment note</span>
          </div>
          <p className="paid-desc" style={{ marginTop: 14 }}>{lic.networkDeploymentNote}</p>
        </section>
      )}

      {altsUsingLic.length > 0 && (
        <section style={{ marginTop: 48 }}>
          <div className="sec-header">
            <span className="sec-label">tools using this license</span>
            <span className="sec-note">{altsUsingLic.length} alternative{altsUsingLic.length === 1 ? "" : "s"}</span>
          </div>
          <div className="route-grid" style={{ marginTop: 16 }}>
            {altsUsingLic.map((a) => (
              <a key={a.slug} href={`/alt/${a.slug}/`} className="route-card">
                <span className="route-name">{a.name}</span>
                <span className="route-tagline">{a.tagline ?? a.description.slice(0, 90)}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {lic.sources.length > 0 && (
        <section style={{ marginTop: 48 }}>
          <div className="sec-header">
            <span className="sec-label">sources</span>
          </div>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {lic.sources.map((src, i) => (
              <a key={`${src.url}-${i}`} href={src.url} className="proof-source" target="_blank" rel="noopener noreferrer">
                <span className="src-label">{src.label}</span>
                <span className="src-url">{src.url}</span>
                <span className="src-meta">
                  <BasisBadge basis={src.basis} />
                </span>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
