import { AudienceGoldenClient } from "./audience-golden-client";
import { audienceGoldenSnapshot, type AudienceGoldenDB } from "@/lib/youtube-audience-golden";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audience Golden Sequence · YouTube AI Factory" };

export default async function AudienceGoldenPage() {
  let initial: Record<string, unknown> = { nextAction: "UNAVAILABLE" };
  try { const { env } = await import("cloudflare:workers") as unknown as { env: { DB?: AudienceGoldenDB } }; if (env.DB) initial = await audienceGoldenSnapshot(env.DB); } catch { /* client exposes explicit unavailable state */ }
  return <AudienceGoldenClient initial={initial}/>;
}
