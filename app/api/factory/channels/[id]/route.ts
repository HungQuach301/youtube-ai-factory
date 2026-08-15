import { ChannelNotFoundError, channelProjection } from "@/lib/portfolio-projection";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const projection = await channelProjection(id);
    return Response.json(projection, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const status = error instanceof ChannelNotFoundError ? 404 : 503;
    return Response.json({ error: error instanceof Error ? error.message : "Channel projection is unavailable", fallback: false }, { status, headers: { "cache-control": "no-store" } });
  }
}
