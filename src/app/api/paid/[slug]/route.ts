import { NextResponse } from "next/server";
import { getPaidProduct, getAllPaidProductSlugs } from "@/lib/data";

export const dynamic = "force-static";
export const revalidate = false;

export async function generateStaticParams() {
  const slugs = await getAllPaidProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const paid = await getPaidProduct(slug);
  if (!paid) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(paid, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
