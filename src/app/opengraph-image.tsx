import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const alt = "OpenCatalog — FOSS alternatives to paid software";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-static";

async function loadFont(weight: "400" | "600" | "700"): Promise<ArrayBuffer> {
  const file =
    weight === "400"
      ? "IBMPlexMono-Regular.ttf"
      : weight === "600"
        ? "IBMPlexMono-SemiBold.ttf"
        : "IBMPlexMono-Bold.ttf";
  const fontPath = path.join(process.cwd(), "src", "app", "fonts", file);
  const buf = await readFile(fontPath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

export default async function OpengraphImage() {
  const [regular, semibold, bold] = await Promise.all([
    loadFont("400"),
    loadFont("600"),
    loadFont("700"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "#0a0a0a",
          color: "#ededed",
          fontFamily: "IBMPlexMono",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.01em" }}>
            opencatalog
          </span>
          <span style={{ fontSize: 28, color: "#6f9c2a" }}>.</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", fontSize: 56, fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.03em" }}>
            The map from paid software
          </div>
          <div style={{ display: "flex", fontSize: 56, fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.03em" }}>
            <span>to serious </span>
            <span style={{ color: "#8bb83a" }}>FOSS</span>
            <span>.</span>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 22, color: "#7a7a7a" }}>
          <span>proof over listicles · every claim grounded</span>
          <span>opencatalog /api.json</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "IBMPlexMono", data: regular, weight: 400, style: "normal" },
        { name: "IBMPlexMono", data: semibold, weight: 600, style: "normal" },
        { name: "IBMPlexMono", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}
