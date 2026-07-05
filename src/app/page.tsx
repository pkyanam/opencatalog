import { SearchPalette } from "@/components/search-palette";
import { buildApiEnvelope } from "@/lib/data";

export default async function HomePage() {
  const envelope = await buildApiEnvelope();
  const verifiedCount = envelope.alternatives.filter((a) => a.verified).length;
  const probedCount = envelope.alternatives.reduce(
    (acc, a) => acc + a.maturity.filter((m) => !m.stale).length,
    0,
  );

  return (
    <div className="container">
      {/* Hero — search-first */}
      <section className="hero">
        <p className="sec-label hero-eyebrow">field manual · v0.1 · {envelope.generatedAt.slice(0, 10)}</p>
        <h1>
          The map from paid software <br />
          to serious <span className="accent">FOSS</span>.
        </h1>
        <p className="hero-lede">
          Type a paid product, category, or workflow. Get the grounded answer: which
          FOSS tools are credible, what they replace, how to install them, what license
          obligations matter, and what gaps remain. The page you read and the JSON an
          agent fetches are the same content.
        </p>
        <div className="hero-search">
          <SearchPalette envelope={envelope} />
        </div>
      </section>

      {/* Stats strip */}
      <section className="stats-strip" aria-label="Catalog coverage">
        <div className="stat">
          <span className="stat-num">{envelope.paidProducts.length}</span>
          <span className="stat-label">paid products mapped</span>
        </div>
        <div className="stat">
          <span className="stat-num accent">{envelope.alternatives.length}</span>
          <span className="stat-label">foss alternatives</span>
        </div>
        <div className="stat">
          <span className="stat-num">{verifiedCount}</span>
          <span className="stat-label">verified records</span>
        </div>
        <div className="stat">
          <span className="stat-num">{probedCount}</span>
          <span className="stat-label">fresh probes</span>
        </div>
        <div className="stat">
          <span className="stat-num">{envelope.categories.length}</span>
          <span className="stat-label">categories</span>
        </div>
        <div className="stat">
          <span className="stat-num">{envelope.licenses.length}</span>
          <span className="stat-label">licenses documented</span>
        </div>
      </section>

      {/* Escape routes — the paid products, each a door out */}
      <section className="escape-routes">
        <div className="sec-header">
          <span className="sec-label">escape routes</span>
          <span className="sec-note">paid products with grounded alternatives</span>
        </div>
        <div className="route-grid">
          {envelope.paidProducts.map((p) => (
            <a key={p.slug} href={`/${p.slug}/`} className="route-card">
              <span className="route-name">{p.name}</span>
              <span className="route-tagline">{p.tagline ?? p.description.slice(0, 90)}</span>
              <span className="route-meta">
                <span className="route-alt-count">
                  {p.rankedAlternatives.length} alternative{p.rankedAlternatives.length === 1 ? "" : "s"}
                </span>
                <span>· {p.pricingShape}</span>
                {p.verified && <span> · verified</span>}
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* Agent card — the machine-readable surface */}
      <section className="agent-card">
        <p className="sec-label">for agents</p>
        <h2>The same catalog, as JSON.</h2>
        <p>
          Every record on this site is also available as a static JSON envelope and a
          JSON Schema document. Fetch the envelope, validate against the schema, and
          reason about FOSS alternatives without scraping HTML.
        </p>
        <div className="agent-endpoints">
          <div className="agent-endpoint">
            <span className="agent-method">GET</span>
            <a href="/api.json" className="agent-url">/api.json</a>
            <span className="sec-note">— full envelope, schemaVersion {envelope.schemaVersion}</span>
          </div>
          <div className="agent-endpoint">
            <span className="agent-method">GET</span>
            <a href="/api.schema.json" className="agent-url">/api.schema.json</a>
            <span className="sec-note">— JSON Schema (draft 2020-12)</span>
          </div>
        </div>
      </section>
    </div>
  );
}
