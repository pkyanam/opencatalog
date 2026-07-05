import { buildApiEnvelope } from "@/lib/data";

export const metadata = {
  title: "Browse the catalog",
  description: "All paid products, FOSS alternatives, categories, and licenses in opencatalog.sh.",
};

export default async function BrowsePage() {
  const envelope = await buildApiEnvelope();

  return (
    <div className="container">
      <nav className="crumb" aria-label="Breadcrumb">
        <a href="/">opencatalog.sh</a>
        <span className="sep">/</span>
        <span>browse</span>
      </nav>

      <section className="paid-hero">
        <h1>Browse the catalog</h1>
        <p className="paid-desc">
          {envelope.paidProducts.length} paid products, {envelope.alternatives.length} FOSS alternatives,
          {" "}{envelope.categories.length} categories, {envelope.licenses.length} licenses.
        </p>
      </section>

      <section className="escape-routes" style={{ marginTop: 40 }}>
        <div className="sec-header">
          <span className="sec-label">paid products</span>
          <span className="sec-note">{envelope.paidProducts.length}</span>
        </div>
        <div className="route-grid">
          {envelope.paidProducts.map((p) => (
            <a key={p.slug} href={`/${p.slug}/`} className="route-card">
              <span className="route-name">{p.name}</span>
              <span className="route-tagline">{p.tagline ?? p.description.slice(0, 90)}</span>
              <span className="route-meta">
                <span className="route-alt-count">{p.rankedAlternatives.length} alt{p.rankedAlternatives.length === 1 ? "" : "s"}</span>
              </span>
            </a>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 48 }}>
        <div className="sec-header">
          <span className="sec-label">FOSS alternatives</span>
          <span className="sec-note">{envelope.alternatives.length}</span>
        </div>
        <div className="route-grid">
          {envelope.alternatives.map((a) => (
            <a key={a.slug} href={`/alt/${a.slug}/`} className="route-card">
              <span className="route-name">{a.name}</span>
              <span className="route-tagline">{a.tagline ?? a.description.slice(0, 90)}</span>
              <span className="route-meta">
                <span className="route-alt-count">{a.license.name}</span>
              </span>
            </a>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 48 }}>
        <div className="sec-header">
          <span className="sec-label">categories</span>
          <span className="sec-note">{envelope.categories.length}</span>
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {envelope.categories.map((c) => (
            <a key={c.slug} href={`/category/${c.slug}/`} className="chip chip-agent" style={{ fontSize: 13, padding: "8px 14px" }}>
              {c.name}
            </a>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 32 }}>
        <div className="sec-header">
          <span className="sec-label">licenses</span>
          <span className="sec-note">{envelope.licenses.length}</span>
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {envelope.licenses.map((l) => (
            <a key={l.slug} href={`/license/${l.slug}/`} className="chip" style={{ fontSize: 13, padding: "8px 14px" }}>
              {l.name}
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
