import localFont from "next/font/local";

/*
 * opencatalog.sh typography — IBM Plex family, mono-forward.
 *
 * Plex Mono is the display/headline face (the "terminal field manual" signature)
 * and the facts/code/chips face. Plex Sans is the body/UI face. Both are OFL-1.1,
 * self-hosted, designed together by IBM. See globals.css for the token mapping.
 *
 * We load three weights per family (Regular 400, SemiBold 600, Bold 700) — enough
 * for body, emphasis, and display without shipping the full 16-weight family.
 */

export const plexSans = localFont({
  src: [
    { path: "./fonts/IBMPlexSans-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/IBMPlexSans-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/IBMPlexSans-Bold.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-plex-sans",
  fallback: ["-apple-system", "BlinkMacSystemFont", "sans-serif"],
});

export const plexMono = localFont({
  src: [
    { path: "./fonts/IBMPlexMono-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/IBMPlexMono-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/IBMPlexMono-Bold.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-plex-mono",
  fallback: ["ui-monospace", "SF Mono", "Menlo", "monospace"],
});
