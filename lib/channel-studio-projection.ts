import type { ChannelStudioProjection, ContentBand } from "@/app/channel-studio-contract";
import { ChannelNotFoundError } from "@/lib/portfolio-projection";

type Statement = { bind: (...values: unknown[]) => Statement; all: <T>() => Promise<{ results?: T[] }> };
type DB = { prepare: (query: string) => Statement };
type RuntimeEnv = { DB?: DB };
type Row = Record<string, unknown>;

async function database() { const { env } = await import("cloudflare:workers"); const runtime = env as unknown as RuntimeEnv; if (!runtime.DB) throw new Error("Canonical database binding is unavailable"); return runtime.DB; }
async function rows(db: DB, query: string, ...values: unknown[]) { return (await db.prepare(query).bind(...values).all<Row>()).results || []; }
function text(value: unknown) { return String(value ?? "").trim(); }
function number(value: unknown) { return Number(value || 0); }
function band(status: string): ContentBand {
  if (/OPPORTUNITY|IDEA|DISCOVER|SCORE/i.test(status)) return "OPPORTUNITY";
  if (/BACKLOG|RESEARCH/i.test(status)) return "BACKLOG";
  if (/PLAN|SCRIPT|STORYBOARD/i.test(status)) return "PLANNED";
  if (/PRODUC|RENDER|ASSEMB|EDIT|VOICE/i.test(status)) return "PRODUCTION";
  if (/COMPLETE|PUBLISH|CANCEL|REJECT|ARCHIVE/i.test(status)) return "TERMINAL";
  return "UNKNOWN";
}

export async function channelStudioProjection(channelId?: string | null): Promise<ChannelStudioProjection> {
  const db = await database();
  const channels = await rows(db, "SELECT id,name,market,language,niche,created_at FROM channels ORDER BY created_at,id");
  if (channelId && !channels.some((channel) => text(channel.id) === channelId)) throw new ChannelNotFoundError(`Channel ${channelId} does not exist`);
  const selected = channelId ? channels.find((channel) => text(channel.id) === channelId) || null : channels[0] || null;
  const effectiveId = text(selected?.id);
  const videos = effectiveId ? await rows(db, "SELECT id,channel_id,title,pillar,status,opportunity_score,progress,next_action,updated_at FROM video_projects WHERE channel_id=? ORDER BY opportunity_score DESC,updated_at DESC,id", effectiveId) : [];
  const programs = effectiveId ? await rows(db, "SELECT id,status,updated_at FROM v7_program_contracts WHERE channel_id=? ORDER BY updated_at DESC,id", effectiveId) : [];
  const programId = text(programs[0]?.id);
  const artifacts = programId ? await rows(db, "SELECT id,stage_key,lifecycle_state,content_json,updated_at FROM v7_intelligence_artifacts WHERE program_id=? AND stage_key='01' ORDER BY updated_at DESC,id", programId) : [];
  let recommendation: string | null = null;
  if (artifacts[0]) {
    const payload = JSON.parse(text(artifacts[0].content_json)) as Record<string, unknown>;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error(`Artifact ${text(artifacts[0].id)} has an invalid canonical payload`);
    const champion = payload.champion;
    recommendation = champion && typeof champion === "object" && !Array.isArray(champion) ? text((champion as Record<string, unknown>).title) || null : null;
  }
  const portfolio = videos.map((video) => ({ id: text(video.id), title: text(video.title), pillar: text(video.pillar), rawStatus: text(video.status), band: band(text(video.status)), score: number(video.opportunity_score), progress: number(video.progress), nextAction: text(video.next_action), updatedAt: text(video.updated_at) }));
  const bands: ContentBand[] = ["OPPORTUNITY", "BACKLOG", "PLANNED", "PRODUCTION", "TERMINAL", "UNKNOWN"];
  const summary = Object.fromEntries(bands.map((key) => [key, portfolio.filter((item) => item.band === key).length])) as Record<ContentBand, number>;
  const pillarCounts = new Map<string, number>();
  for (const item of portfolio) pillarCounts.set(item.pillar || "Unassigned", (pillarCounts.get(item.pillar || "Unassigned") || 0) + 1);
  const gaps = ["Canonical channel-strategy aggregate is not implemented.", "Approved content-pillar and series identities are not implemented.", "Editorial calendar persistence is not implemented."];
  const notes: string[] = [];
  if (selected && !programId) notes.push("Selected channel has no mapped canonical V7 program.");
  if (summary.UNKNOWN) notes.push(`${summary.UNKNOWN} project status value(s) require lifecycle reconciliation.`);
  return {
    contract: "CHANNEL_STUDIO_PROJECTION_V1",
    generatedAt: new Date().toISOString(),
    sourceState: "CANONICAL_CHANNEL_PLUS_READ_ONLY_CONTENT_BRIDGE",
    scope: { mode: channelId ? "CHANNEL" : "PORTFOLIO", channelId: channelId || null },
    channels: channels.map((channel) => ({ id: text(channel.id), name: text(channel.name), market: text(channel.market), language: text(channel.language), niche: text(channel.niche) })),
    selectedChannel: selected ? { id: text(selected.id), name: text(selected.name), market: text(selected.market), language: text(selected.language), niche: text(selected.niche) } : null,
    nicheDecision: { currentNiche: text(selected?.niche) || null, provenance: "CHANNEL_FIELD_COMPATIBILITY_ONLY", recommendation, decisionAuthority: "OWNER_EXPERT_REQUIRED" },
    strategy: { state: "CANONICAL_AGGREGATE_NOT_IMPLEMENTED", viewerPromise: null, differentiation: null, gaps },
    pillars: [...pillarCounts.entries()].map(([label, itemCount]) => ({ label, itemCount, provenance: "LEGACY_TEXT_LABEL" as const })),
    series: { state: "CANONICAL_AGGREGATE_NOT_IMPLEMENTED", items: [] },
    portfolio,
    summary,
    editorialQueue: { state: "CANONICAL_AGGREGATE_NOT_IMPLEMENTED", compatibilityItems: portfolio.filter((item) => item.band === "PLANNED" || item.band === "PRODUCTION").length },
    productionHandoff: { state: "COMMAND_NOT_AUTHORIZED", eligibleCompatibilityItems: portfolio.filter((item) => item.band === "PLANNED" && item.score >= 85).length, blockers: ["No approved canonical strategy version", "No approved editorial-item identity", "Production intake command is outside this read slice"] },
    integrity: { state: notes.length ? "RECONCILIATION_REQUIRED" : "READY", notes },
  };
}
