import { loadCatalogSummary, generateSkillsMd } from "@/lib/agent-guide";

export const dynamic = "force-static";
export const revalidate = false;

export async function GET() {
  const catalog = await loadCatalogSummary();
  const body = generateSkillsMd(catalog);
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
