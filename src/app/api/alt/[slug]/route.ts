import { NextResponse } from "next/server";
import { getAlternative, getAllAlternativeSlugs } from "@/lib/data";

export const dynamic = "force-static";
export const revalidate = false;

export async function generateStaticParams() {
  const slugs = await getAllAlternativeSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const alt = await getAlternative(slug);
  if (!alt) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(alt, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
