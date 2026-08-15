import { discoveryProjection } from "@/lib/discovery-projection";
import { ChannelNotFoundError } from "@/lib/portfolio-projection";

export async function GET(request: Request) {
  try {
    const channel = new URL(request.url).searchParams.get("channel");
    const projection = await discoveryProjection(channel);
    return Response.json(projection, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const status = error instanceof ChannelNotFoundError ? 404 : 503;
    return Response.json({ error: error instanceof Error ? error.message : "Discovery projection is unavailable", fallback: false }, { status, headers: { "cache-control": "no-store" } });
  }
}
