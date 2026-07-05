import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api.json", "/api.schema.json"],
    },
    sitemap: "https://opencatalog.sh/sitemap.xml",
  };
}
