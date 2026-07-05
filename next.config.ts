import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Catalog pages and /api.json are fully static at build time.
  // No experimental features needed at launch.
  trailingSlash: true,
};

export default config;
