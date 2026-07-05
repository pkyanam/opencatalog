import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiEnvelope } from "@/lib/schema";

// JSON Schema export for agent consumers that prefer schema over TypeScript types.
// Uses Zod 4's native z.toJSONSchema() — the deprecated zod-to-json-schema
// package recommended switching to this in November 2025.
export const dynamic = "force-static";
export const revalidate = false;

export async function GET() {
  const schema = z.toJSONSchema(ApiEnvelope);
  return NextResponse.json(schema, {
    headers: {
      "Content-Type": "application/schema+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
