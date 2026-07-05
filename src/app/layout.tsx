import type { Metadata } from "next";
import { plexMono, plexSans } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.opencatalog.sh"),
  title: {
    default: "opencatalog.sh — FOSS alternatives to paid software",
    template: "%s · opencatalog.sh",
  },
  description:
    "The map from paid software to serious FOSS alternatives. Every claim grounded, every install path verified, every gap labeled. Read the page or fetch /api.json.",
  applicationName: "opencatalog.sh",
  authors: [{ name: "opencatalog.sh" }],
  generator: "Next.js",
  keywords: [
    "open source",
    "foss",
    "alternatives",
    "free software",
    "self-hosted",
    "adobe photoshop alternative",
    "notion alternative",
    "figma alternative",
  ],
  referrer: "origin-when-cross-origin",
  robots: { index: true, follow: true },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

const reservedSlugs = [
  "alt",
  "category",
  "license",
  "browse",
  "about",
  "api.json",
  "api.schema.json",
  "agents.md",
  "skills.md",
  "llms.txt",
];

export { reservedSlugs };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "opencatalog.sh",
    description:
      "The map from paid software to serious FOSS alternatives. Every claim grounded, every install path verified, every gap labeled.",
    url: "https://www.opencatalog.sh",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://www.opencatalog.sh/browse/?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <div className="frame-guides" aria-hidden="true" />
        <nav className="site" aria-label="Primary">
          <div className="container">
            <a href="/" className="wordmark" aria-label="opencatalog.sh home">
              opencatalog<span className="dot">.</span>sh
            </a>
            <div className="nav-spacer" />
            <a href="/browse/" className="nav-link">
              browse
            </a>
            <a href="/about/" className="nav-link hide-mobile">
              about
            </a>
            <a href="/api.json" className="nav-link">
              api.json
            </a>
          </div>
        </nav>
        <main id="main">{children}</main>
        <footer className="site-footer">
          <div className="container">
            <p className="footer-mark">
              opencatalog<span className="dot">.</span>sh{" "}
              <span className="footer-note">
                proof over listicles · every claim grounded ·{" "}
                <a href="/api.json">/api.json</a>
              </span>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
