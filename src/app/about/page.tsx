import { SCHEMA_VERSION } from "@/lib/schema";

export const metadata = {
  title: "About opencatalog.sh",
  description: "Why opencatalog.sh exists, how it works, and what its trust model is.",
};

export default function AboutPage() {
  return (
    <div className="container">
      <nav className="crumb" aria-label="Breadcrumb">
        <a href="/">opencatalog.sh</a>
        <span className="sep">/</span>
        <span>about</span>
      </nav>

      <section className="paid-hero">
        <h1>About opencatalog.sh</h1>
        <p className="paid-desc">
          opencatalog.sh is a map from paid software to serious FOSS alternatives. Every claim
          is grounded, every install path is verified, every gap is labeled. The page you
          read and the JSON an agent fetches are the same content.
        </p>
      </section>

      <section style={{ marginTop: 40, maxWidth: 680 }}>
        <div className="sec-header">
          <span className="sec-label">why</span>
        </div>
        <div className="prose" style={{ marginTop: 14 }}>
          <p>
            Most "alternatives" sites are listicles. They rank tools by popularity, not by
            whether they actually replace the paid product for a specific workflow. They
            don&apos;t tell you the license obligations. They don&apos;t tell you what
            doesn&apos;t work. They don&apos;t tell you how to install anything.
          </p>
          <p>
            opencatalog.sh is the opposite: a field manual. Each paid product page is a switch
            map — a grid of workflows × alternatives, with every cell grounded in a source
            you can click. Each alternative page lists install paths, maturity signals, and
            known gaps. Every record carries a freshness timestamp and a verification badge.
          </p>
        </div>
      </section>

      <section style={{ marginTop: 40, maxWidth: 680 }}>
        <div className="sec-header">
          <span className="sec-label">trust model</span>
        </div>
        <div className="prose" style={{ marginTop: 14 }}>
          <p>
            Every load-bearing fact carries a <strong>basis</strong>:{" "}
            <code>probed</code> (we checked the source directly),{" "}
            <code>cited</code> (we read the documentation), or{" "}
            <code>claimed</code> (asserted without independent verification).
          </p>
          <p>
            A record is <strong>verified</strong> only if its license is grounded, at least
            one install path is probed or cited, and load-bearing workflow facts are not
            merely claimed. The validator enforces this mechanically —{" "}
            <code>bun run validate</code> fails the build if a verified record has a
            claimed-only license.
          </p>
          <p>
            Every record carries <code>generatedAt</code>. Maturity signals carry{" "}
            <code>probedAt</code> and a derived <code>stale</code> flag. Stale probes are
            visible on the page — we do not hide decay.
          </p>
        </div>
      </section>

      <section style={{ marginTop: 40, maxWidth: 680 }}>
        <div className="sec-header">
          <span className="sec-label">for agents</span>
        </div>
        <div className="prose" style={{ marginTop: 14 }}>
          <p>
            The entire catalog is available as a static JSON envelope at{" "}
            <a href="/api.json"><code>/api.json</code></a> and as a JSON Schema document at{" "}
            <a href="/api.schema.json"><code>/api.schema.json</code></a>. Schema version:{" "}
            <code>{SCHEMA_VERSION}</code>.
          </p>
          <p>
            Agents can fetch the envelope, validate against the schema, and reason about
            FOSS alternatives without scraping HTML. The JSON and the HTML are generated
            from the same curated records — there is no separate API model.
          </p>
        </div>
      </section>

      <section style={{ marginTop: 40, maxWidth: 680 }}>
        <div className="sec-header">
          <span className="sec-label">what is not here yet</span>
        </div>
        <div className="prose" style={{ marginTop: 14 }}>
          <p>
            At launch, opencatalog.sh is a curated seed. There is no public contribution UI,
            no raw-feed normalizer, no community submission flow. Those are post-launch.
            The curated records in <code>curated/</code> are hand-written against a Zod
            schema and validated in CI.
          </p>
          <p>
            Source-available tools (non-OSI licenses) are modeled as excluded, not silently
            omitted. When the raw-feed pipeline ships, uncurated records will appear with a
            visible <code>uncurated</code> badge — never mixed into verified results.
          </p>
        </div>
      </section>
    </div>
  );
}
