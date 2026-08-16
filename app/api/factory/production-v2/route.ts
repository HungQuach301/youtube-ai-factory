import { productionV2Projection, type ProductionV2DB } from "@/lib/production-v2-projection";

export const dynamic = "force-dynamic";
const NO_STORE = { "cache-control": "no-store" };
type RuntimeEnv = { DB?: ProductionV2DB };
async function runtime() { const { env } = await import("cloudflare:workers"); return env as unknown as RuntimeEnv; }
function failure(code: string, message: string, status: number) {
  return Response.json({ error: { code, message }, fallback: false }, { status, headers: NO_STORE });
}

export async function GET(request: Request) {
  try {
    const channelId = new URL(request.url).searchParams.get("channel") || "channel-hidden-systems";
    const env = await runtime();
    if (!env.DB) return failure("CANONICAL_DATABASE_UNAVAILABLE", "Canonical database binding is unavailable", 503);
    return Response.json(await productionV2Projection(channelId, env.DB), { headers: NO_STORE });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Production Engine V2 projection is unavailable";
    return failure(message === "CHANNEL_NOT_FOUND" ? "CHANNEL_NOT_FOUND" : "PRODUCTION_V2_PROJECTION_UNAVAILABLE", message, message === "CHANNEL_NOT_FOUND" ? 404 : 503);
  }
}
