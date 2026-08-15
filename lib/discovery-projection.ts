import type { DiscoveryCandidate, DiscoveryProjection } from "@/app/discovery-contract";
import { ChannelNotFoundError } from "@/lib/portfolio-projection";

type Statement = { bind: (...values: unknown[]) => Statement; all: <T>() => Promise<{ results?: T[] }> };
type DB = { prepare: (query: string) => Statement };
type RuntimeEnv = { DB?: DB };
type Row = Record<string, unknown>;

async function database() {
  const { env } = await import("cloudflare:workers");
  const runtime = env as unknown as RuntimeEnv;
  if (!runtime.DB) throw new Error("Canonical database binding is unavailable");
  return runtime.DB;
}
async function rows(db: DB, query: string, ...values: unknown[]) { return (await db.prepare(query).bind(...values).all<Row>()).results || []; }
function text(value: unknown) { return String(value ?? "").trim(); }
function number(value: unknown) { return Number(value || 0); }
function objects(value: unknown) { return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : []; }
function strings(value: unknown) { return Array.isArray(value) ? value.map(text).filter(Boolean) : []; }
function parseArtifact(row: Row | undefined) {
  if (!row) return null;
  const content = JSON.parse(text(row.content_json));
  if (!content || typeof content !== "object" || Array.isArray(content)) throw new Error(`Artifact ${text(row.id)} has an invalid canonical payload`);
  return content as Record<string, unknown>;
}

export async function discoveryProjection(channelId?: string | null): Promise<DiscoveryProjection> {
  const db = await database();
  const channelRows = await rows(db, "SELECT id,name,market,language,niche,created_at FROM channels ORDER BY created_at,id");
  if (channelId && !channelRows.some((channel) => text(channel.id) === channelId)) throw new ChannelNotFoundError(`Channel ${channelId} does not exist`);
  const selectedChannels = channelId ? channelRows.filter((channel) => text(channel.id) === channelId) : channelRows;
  const allPrograms = await rows(db, "SELECT id,channel_id,status,updated_at FROM v7_program_contracts ORDER BY updated_at DESC,id");
  const latestPrograms = new Map<string, Row>();
  for (const program of allPrograms) if (!latestPrograms.has(text(program.channel_id))) latestPrograms.set(text(program.channel_id), program);
  const programs = selectedChannels.map((channel) => latestPrograms.get(text(channel.id))).filter((item): item is Row => Boolean(item));
  const programIds = programs.map((program) => text(program.id));
  const placeholders = programIds.map(() => "?").join(",");
  const [artifacts, sources, claims, runs, lineage] = programIds.length ? await Promise.all([
    rows(db, `SELECT id,program_id,run_id,stage_key,artifact_type,title,lifecycle_state,content_json,source_count,updated_at FROM v7_intelligence_artifacts WHERE program_id IN (${placeholders}) ORDER BY updated_at DESC,id`, ...programIds),
    rows(db, `SELECT id,program_id,stage_key,authority_tier,verification_state FROM v7_intelligence_sources WHERE program_id IN (${placeholders})`, ...programIds),
    rows(db, `SELECT id,program_id,risk_level,status FROM v7_claim_nodes WHERE program_id IN (${placeholders})`, ...programIds),
    rows(db, `SELECT id,program_id,stage_key,status,score,threshold,completed_at FROM v7_intelligence_runs WHERE program_id IN (${placeholders}) ORDER BY started_at DESC`, ...programIds),
    rows(db, `SELECT id,program_id,entity_type,lifecycle_state FROM v7_evidence_lineage WHERE program_id IN (${placeholders}) ORDER BY updated_at DESC`, ...programIds),
  ]) : [[], [], [], [], []];

  const stage01Row = artifacts.find((artifact) => text(artifact.stage_key) === "01");
  const stage02Row = artifacts.find((artifact) => text(artifact.stage_key) === "02");
  const stage01 = parseArtifact(stage01Row);
  const stage02 = parseArtifact(stage02Row);
  const verifiedSources = sources.filter((source) => /VERIFIED|WEB_GROUNDED|CONTROLLED/i.test(text(source.verification_state))).length;
  const primarySources = sources.filter((source) => text(source.authority_tier) === "TIER_1_PRIMARY").length;
  const frozenStage01 = text(stage01Row?.lifecycle_state) === "FROZEN";
  const champion = stage01?.champion && typeof stage01.champion === "object" ? stage01.champion as Record<string, unknown> : null;
  const championTitle = text(champion?.title);
  const candidates: DiscoveryCandidate[] = objects(stage01?.candidates).map((candidate, index) => {
    const score = number(candidate.score);
    const title = text(candidate.title);
    const readiness = score >= 85 && frozenStage01 && verifiedSources >= 10
      ? "EVIDENCE_READY_EXPERT_DECISION_REQUIRED"
      : score >= 75 ? "REVIEW_REQUIRED" : "INSUFFICIENT_EVIDENCE";
    return {
      id: `${text(stage01Row?.id) || "unbound"}:${index + 1}`,
      title,
      centralQuestion: text(candidate.centralQuestion),
      viewerPromise: text(candidate.viewerPromise),
      novelty: number(candidate.novelty), evergreenFit: number(candidate.evergreenFit), visualPotential: number(candidate.visualPotential), score,
      readiness,
      risks: title === championTitle ? strings(champion?.risks) : [],
      recommendationState: title === championTitle ? "RESEARCH_CHAMPION" : "RESEARCH_CANDIDATE",
    };
  }).sort((a, b) => b.score - a.score);
  const selected = selectedChannels[0];
  const notes: string[] = [];
  if (selectedChannels.length && programs.length !== selectedChannels.length) notes.push("One or more channels have no mapped canonical V7 program.");
  if (!stage01) notes.push("No Stage 01 market and audience artifact exists for this scope.");
  return {
    contract: "DISCOVERY_PROJECTION_V1",
    generatedAt: new Date().toISOString(),
    scope: { mode: channelId ? "CHANNEL" : "PORTFOLIO", channelId: channelId || null },
    sourceState: "CANONICAL_V7_READ_ONLY",
    channels: selectedChannels.map((channel) => ({ id: text(channel.id), name: text(channel.name), market: text(channel.market), language: text(channel.language), currentNiche: text(channel.niche), programId: text(latestPrograms.get(text(channel.id))?.id) || null })),
    market: { thesis: text(stage01?.channelThesis) || null, targetMarket: text(stage01?.targetMarket) || text(selected?.market) || null, targetLanguage: text(stage01?.targetLanguage) || text(selected?.language) || null, clusters: objects(stage01?.topicClusters) },
    audience: { segments: objects(stage01?.audienceSegments) },
    competitors: { references: objects(stage02?.references), patterns: strings(stage02?.crossReferencePatterns), gaps: text(stage02?.gapStatement) || null, antiCloneControls: strings(stage02?.antiCloneControls) },
    niche: { currentNiche: text(selected?.niche) || (channelId ? null : "PORTFOLIO_SCOPE"), researchChampion: championTitle || null, candidates, decisionAuthority: "OWNER_EXPERT_REQUIRED" },
    evidence: { artifactCount: artifacts.length, frozenStage01, verifiedSources, primarySources, claims: claims.length, p0Claims: claims.filter((claim) => text(claim.risk_level) === "P0").length, runs: runs.length, lineageIds: lineage.slice(0, 12).map((item) => text(item.id)) },
    integrity: { state: notes.length ? "RECONCILIATION_REQUIRED" : "READY", notes },
  };
}
