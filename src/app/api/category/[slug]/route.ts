import { NextResponse } from "next/server";
import { getCategory, getAllCategorySlugs } from "@/lib/data";

export const dynamic = "force-static";
export const revalidate = false;

export async function generateStaticParams() {
  const slugs = await getAllCategorySlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const cat = await getCategory(slug);
  if (!cat) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(cat, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
