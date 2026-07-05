import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllCategorySlugs, getCategory, loadAlternatives, loadPaidProducts } from "@/lib/data";

export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await getAllCategorySlugs();
  return slugs.map((slug) => ({ catSlug: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ catSlug: string }>;
}): Promise<Metadata> {
  const { catSlug } = await params;
  const cat = await getCategory(catSlug);
  if (!cat) return {};
  return {
    title: `${cat.name} — category`,
    description: cat.definition.slice(0, 140),
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ catSlug: string }>;
}) {
  const { catSlug } = await params;
  const cat = await getCategory(catSlug);
  if (!cat) notFound();

  const [allPaid, allAlts] = await Promise.all([loadPaidProducts(), loadAlternatives()]);
  const paidInCat = allPaid.filter((p) => p.category === catSlug || p.secondaryCategories.includes(catSlug));
  const altsInCat = allAlts.filter((a) => a.categories.includes(catSlug));

  return (
    <div className="container">
      <nav className="crumb" aria-label="Breadcrumb">
        <a href="/">opencatalog.sh</a>
        <span className="sep">/</span>
        <a href="/browse/">browse</a>
        <span className="sep">/</span>
        <span>category/{cat.slug}</span>
      </nav>

      <section className="paid-hero">
        <h1>{cat.name}</h1>
        <p className="paid-desc">{cat.definition}</p>
        <div className="paid-meta">
          <span className="chip">{paidInCat.length} paid product{paidInCat.length === 1 ? "" : "s"}</span>
          <span className="chip chip-accent">{altsInCat.length} FOSS alternative{altsInCat.length === 1 ? "" : "s"}</span>
        </div>
      </section>

      {cat.primaryWorkflows.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <div className="sec-header">
            <span className="sec-label">primary workflows</span>
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {cat.primaryWorkflows.map((w) => (
              <span key={w} className="chip">{w}</span>
            ))}
          </div>
        </section>
      )}

      {paidInCat.length > 0 && (
        <section className="escape-routes" style={{ marginTop: 48 }}>
          <div className="sec-header">
            <span className="sec-label">paid products in this category</span>
          </div>
          <div className="route-grid">
            {paidInCat.map((p) => (
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
      )}

      {altsInCat.length > 0 && (
        <section style={{ marginTop: 48 }}>
          <div className="sec-header">
            <span className="sec-label">FOSS alternatives in this category</span>
          </div>
          <div className="route-grid" style={{ marginTop: 16 }}>
            {altsInCat.map((a) => (
              <a key={a.slug} href={`/alt/${a.slug}/`} className="route-card">
                <span className="route-name">{a.name}</span>
                <span className="route-tagline">{a.tagline ?? a.description.slice(0, 90)}</span>
                <span className="route-meta">
                  <span className="route-alt-count">{a.license.name}</span>
                  <span>· {a.deployment.join(", ")}</span>
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {cat.neighborCategories.length > 0 && (
        <section style={{ marginTop: 48 }}>
          <div className="sec-header">
            <span className="sec-label">neighbor categories</span>
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {cat.neighborCategories.map((slug) => (
              <a key={slug} href={`/category/${slug}/`} className="chip" style={{ fontSize: 13, padding: "6px 12px" }}>
                {slug}
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
