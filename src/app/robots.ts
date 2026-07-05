import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api.json", "/api.schema.json", "/api/paid/", "/api/alt/", "/api/category/", "/api/license/"],
    },
    sitemap: "https://www.opencatalog.sh/sitemap.xml",
  };
}
