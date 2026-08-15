import { portfolioProjection } from "@/lib/portfolio-projection";

export async function GET() {
  try {
    const projection = await portfolioProjection();
    return Response.json(projection, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Portfolio projection is unavailable", fallback: false }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
