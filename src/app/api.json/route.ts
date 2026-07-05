import { NextResponse } from "next/server";
import { buildApiEnvelope } from "@/lib/data";

// Static at build time — the entire catalog is files plus generated JSON.
// Served from the CDN. No runtime computation.
export const dynamic = "force-static";
export const revalidate = false;

export async function GET() {
  const envelope = await buildApiEnvelope();
  return NextResponse.json(envelope, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
