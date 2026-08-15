type Statement = { bind: (...values: unknown[]) => Statement; all: <T>() => Promise<{ results?: T[] }> };
type DB = { prepare: (query: string) => Statement };
type RuntimeEnv = { DB?: DB };
type Row = Record<string, unknown>;

export class ChannelNotFoundError extends Error {}

async function database() {
  const { env } = await import("cloudflare:workers");
  const runtime = env as unknown as RuntimeEnv;
  if (!runtime.DB) throw new Error("Canonical database binding is unavailable");
  return runtime.DB;
}

async function rows(db: DB, query: string, ...values: unknown[]) {
  return (await db.prepare(query).bind(...values).all<Row>()).results || [];
}

function text(value: unknown) { return String(value ?? "").trim(); }
function number(value: unknown) { return Number(value || 0); }
function sum(items: Row[], field: string) { return items.reduce((total, item) => total + number(item[field]), 0); }

export async function portfolioProjection() {
  const db = await database();
  const [channels, videos, programs, stages, costs, usage] = await Promise.all([
    rows(db, "SELECT id,name,market,language,niche,created_at FROM channels ORDER BY created_at,id"),
    rows(db, "SELECT id,channel_id,title,status,opportunity_score,progress,spent_usd,next_action,updated_at FROM video_projects ORDER BY updated_at DESC,id"),
    rows(db, "SELECT id,channel_id,status,execution_mode,quality_policy,production_authorized,updated_at FROM v7_program_contracts ORDER BY updated_at DESC,id"),
    rows(db, "SELECT program_id,status,blocker,updated_at FROM v7_stage_states ORDER BY sequence"),
    rows(db, "SELECT program_id,status,estimated_usd,actual_usd FROM v7_cost_events"),
    rows(db, "SELECT program_id,actual_usd,pricing_status FROM v7_ai_usage_events"),
  ]);
  const channelIds = new Set(channels.map((item) => text(item.id)));
  const programByChannel = new Map<string, Row>();
  for (const program of programs) if (!programByChannel.has(text(program.channel_id))) programByChannel.set(text(program.channel_id), program);
  const stageByProgram = new Map<string, Row[]>();
  for (const stage of stages) stageByProgram.set(text(stage.program_id), [...(stageByProgram.get(text(stage.program_id)) || []), stage]);
  const costByProgram = (programId: string) => costs.filter((item) => text(item.program_id) === programId);
  const usageByProgram = (programId: string) => usage.filter((item) => text(item.program_id) === programId);

  const items = channels.map((channel) => {
    const channelId = text(channel.id);
    const channelVideos = videos.filter((video) => text(video.channel_id) === channelId);
    const program = programByChannel.get(channelId);
    const programId = text(program?.id);
    const programStages = stageByProgram.get(programId) || [];
    const programCosts = costByProgram(programId);
    const programUsage = usageByProgram(programId);
    const blockers = programStages.filter((stage) => text(stage.blocker)).length;
    return {
      id: channelId, name: text(channel.name), market: text(channel.market), language: text(channel.language), niche: text(channel.niche),
      program: program ? { id: programId, status: text(program.status), executionMode: text(program.execution_mode), qualityPolicy: text(program.quality_policy), productionAuthorized: Boolean(program.production_authorized) } : null,
      videos: { count: channelVideos.length, active: channelVideos.filter((video) => !/COMPLETE|PUBLISHED|CANCEL/i.test(text(video.status))).length, averageProgress: channelVideos.length ? Math.round(channelVideos.reduce((total, video) => total + number(video.progress), 0) / channelVideos.length) : 0 },
      operations: { stageCount: programStages.length, blockerCount: blockers, actualCostUsd: Number(sum(programCosts, "actual_usd").toFixed(4)), measuredUsageUsd: Number(sum(programUsage, "actual_usd").toFixed(4)), billingState: "RECORDED_USAGE_NOT_VERIFIED_BILLING" as const },
      integrity: program ? "READY" as const : "RECONCILIATION_REQUIRED" as const,
      nextAction: blockers ? "Resolve the owning stage blocker" : program ? "Inspect channel operating state" : "Map a canonical V7 program",
    };
  });
  return {
    contract: "PORTFOLIO_PROJECTION_V1" as const,
    generatedAt: new Date().toISOString(),
    sourceState: "CANONICAL_PLUS_READ_ONLY_MIGRATION_BRIDGE" as const,
    summary: { channels: items.length, activeVideos: items.reduce((total, item) => total + item.videos.active, 0), blockedStages: items.reduce((total, item) => total + item.operations.blockerCount, 0), recordedCostUsd: Number(items.reduce((total, item) => total + item.operations.actualCostUsd, 0).toFixed(4)) },
    channels: items,
    reconciliation: { orphanVideos: videos.filter((video) => !channelIds.has(text(video.channel_id))).length, orphanPrograms: programs.filter((program) => !channelIds.has(text(program.channel_id))).length },
    capabilities: [
      { id: "INTELLIGENCE", label: "Market intelligence", href: "/market-intelligence", state: "AVAILABLE" },
      { id: "NICHE", label: "Niche discovery", href: "/niche-discovery", state: "AVAILABLE" },
      { id: "STUDIO", label: "Channel studio", href: "/channel-studio", state: "AVAILABLE" },
      { id: "PRODUCTION", label: "Video Production Engine", href: "/control-plane", state: "COMPATIBILITY_EXECUTION" },
    ],
  };
}

export async function channelProjection(channelId: string) {
  const db = await database();
  const channels = await rows(db, "SELECT id,name,market,language,niche,created_at FROM channels WHERE id=?", channelId);
  const channel = channels[0];
  if (!channel) throw new ChannelNotFoundError(`Channel ${channelId} does not exist`);
  const videos = await rows(db, "SELECT id,channel_id,title,pillar,status,opportunity_score,progress,budget_usd,spent_usd,next_action,updated_at FROM video_projects WHERE channel_id=? ORDER BY updated_at DESC,id", channelId);
  const programs = await rows(db, "SELECT id,channel_id,status,execution_mode,quality_policy,production_authorized,overall_floor,critical_floor,dimension_floor,p0_tolerance,p1_tolerance,updated_at FROM v7_program_contracts WHERE channel_id=? ORDER BY updated_at DESC,id", channelId);
  const program = programs[0] || null;
  const programId = text(program?.id);
  const [stages, evidence, assets, decisions, costs, usage, intelligenceArtifacts, sources, claims] = program ? await Promise.all([
    rows(db, "SELECT stage_key,sequence,stage_name,status,threshold,attempt,artifact_id,blocker,evidence_summary,frozen_at,updated_at FROM v7_stage_states WHERE program_id=? ORDER BY sequence", programId),
    rows(db, "SELECT id,project_id,entity_type,title,lifecycle_state,storage_state,rights_state,cost_state,quarantine_state,updated_at FROM v7_evidence_lineage WHERE program_id=? ORDER BY updated_at DESC", programId),
    rows(db, "SELECT id,project_id,name,asset_class,lifecycle_state,sync_state,rights_state,quarantined,cost_usd,updated_at FROM v7_asset_registry WHERE program_id=? ORDER BY updated_at DESC", programId),
    rows(db, "SELECT id,decision_code,title,status,effective_version,rationale,created_at FROM v7_decision_records WHERE program_id=? ORDER BY created_at DESC", programId),
    rows(db, "SELECT project_id,stage_key,status,estimated_usd,actual_usd,currency,updated_at FROM v7_cost_events WHERE program_id=? ORDER BY updated_at DESC", programId),
    rows(db, "SELECT stage_key,model_id,provider_status,total_tokens,actual_usd,pricing_status,measured_at FROM v7_ai_usage_events WHERE program_id=? ORDER BY measured_at DESC", programId),
    rows(db, "SELECT id,stage_key,artifact_type,title,lifecycle_state,source_count,updated_at FROM v7_intelligence_artifacts WHERE program_id=? ORDER BY updated_at DESC", programId),
    rows(db, "SELECT id,stage_key,authority_tier,verification_state FROM v7_intelligence_sources WHERE program_id=?", programId),
    rows(db, "SELECT id,claim_class,risk_level,status FROM v7_claim_nodes WHERE program_id=?", programId),
  ]) : [[], [], [], [], [], [], [], [], []];
  return {
    contract: "CHANNEL_DETAIL_PROJECTION_V1" as const,
    generatedAt: new Date().toISOString(),
    sourceState: "CANONICAL_PLUS_READ_ONLY_MIGRATION_BRIDGE" as const,
    channel: { id: text(channel.id), name: text(channel.name), market: text(channel.market), language: text(channel.language), niche: text(channel.niche) },
    intelligence: { artifacts: intelligenceArtifacts.length, sources: sources.length, primarySources: sources.filter((item) => text(item.authority_tier) === "TIER_1_PRIMARY").length, claims: claims.length, p0Claims: claims.filter((item) => text(item.risk_level) === "P0").length, latestArtifacts: intelligenceArtifacts.slice(0, 5) },
    strategy: { state: program ? "FOUNDATION_ONLY" : "RECONCILIATION_REQUIRED", program: program ? { id: programId, status: text(program.status), executionMode: text(program.execution_mode), qualityPolicy: text(program.quality_policy), productionAuthorized: Boolean(program.production_authorized), floors: { overall: number(program.overall_floor), critical: number(program.critical_floor), dimension: number(program.dimension_floor) } } : null },
    contentSystem: { state: "READ_ONLY_MIGRATION_BRIDGE", videos: videos.map((video) => ({ id: text(video.id), title: text(video.title), pillar: text(video.pillar), status: text(video.status), score: number(video.opportunity_score), progress: number(video.progress), budgetUsd: number(video.budget_usd), spentUsd: number(video.spent_usd), nextAction: text(video.next_action) })) },
    production: { stages, evidenceCount: evidence.length, assetCount: assets.length, quarantinedAssets: assets.filter((asset) => Boolean(asset.quarantined)).length },
    learning: { decisions, lineage: evidence.slice(0, 8) },
    financial: { recordedCostUsd: Number(sum(costs, "actual_usd").toFixed(4)), estimatedCostUsd: Number(sum(costs, "estimated_usd").toFixed(4)), measuredUsageUsd: Number(sum(usage, "actual_usd").toFixed(4)), billingState: "RECORDED_USAGE_NOT_VERIFIED_BILLING" },
    integrity: { state: program ? "READY" : "RECONCILIATION_REQUIRED", notes: program ? [] : ["No canonical V7 program is mapped to this channel."] },
  };
}
