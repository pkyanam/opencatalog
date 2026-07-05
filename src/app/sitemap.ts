import type { MetadataRoute } from "next";
import { buildApiEnvelope } from "@/lib/data";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const envelope = await buildApiEnvelope();
  const base = "https://www.opencatalog.sh";
  const lastModified = new Date();

  const routes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/browse/`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/about/`, lastModified, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/api.json`, lastModified, changeFrequency: "weekly", priority: 0.6 },
  ];

  for (const p of envelope.paidProducts) {
    routes.push({
      url: `${base}/${p.slug}/`,
      lastModified: new Date(p.generatedAt),
      changeFrequency: "monthly",
      priority: 0.9,
    });
  }
  for (const a of envelope.alternatives) {
    routes.push({
      url: `${base}/alt/${a.slug}/`,
      lastModified: new Date(a.generatedAt),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }
  for (const c of envelope.categories) {
    routes.push({
      url: `${base}/category/${c.slug}/`,
      lastModified: new Date(c.generatedAt),
      changeFrequency: "monthly",
      priority: 0.5,
    });
  }
  for (const l of envelope.licenses) {
    routes.push({
      url: `${base}/license/${l.slug}/`,
      lastModified: new Date(l.generatedAt),
      changeFrequency: "yearly",
      priority: 0.4,
    });
  }

  return routes;
}
