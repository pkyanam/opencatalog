import { NextResponse } from "next/server";
import { getLicense, getAllLicenseSlugs } from "@/lib/data";

export const dynamic = "force-static";
export const revalidate = false;

export async function generateStaticParams() {
  const slugs = await getAllLicenseSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const lic = await getLicense(slug);
  if (!lic) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(lic, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
