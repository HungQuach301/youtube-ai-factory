import { nichePortfolioProjection } from "@/lib/niche-portfolio-projection";
import { ChannelNotFoundError } from "@/lib/portfolio-projection";

export async function GET(request: Request) {
  try {
    const channel = new URL(request.url).searchParams.get("channel");
    return Response.json(await nichePortfolioProjection(channel), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const status = error instanceof ChannelNotFoundError ? 404 : 503;
    return Response.json({ error: error instanceof Error ? error.message : "Niche portfolio projection is unavailable", fallback: false }, { status, headers: { "cache-control": "no-store" } });
  }
}
