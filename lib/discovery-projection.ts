import type { DiscoveryCandidate, DiscoveryProjection } from "@/app/discovery-contract";
import { compileIntelligenceNicheWorkflow, type ExpertDecision, type IntelligenceNicheWorkflowResult } from "@/lib/intelligence-niche-workflow-contract";
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
function resolvedClaim(value: unknown) { return /VERIFIED|RESOLVED|PASS|CONTROLLED|APPROVED/i.test(text(value)); }
function parseArtifact(row: Row | undefined) {
  if (!row) return null;
  const content = JSON.parse(text(row.content_json));
  if (!content || typeof content !== "object" || Array.isArray(content)) throw new Error(`Artifact ${text(row.id)} has an invalid canonical payload`);
  return content as Record<string, unknown>;
}

function expertDecision(rows: Row[], aggregateVersion: number) {
  const row = rows.find((item) => text(item.decision_code) === "NICHE_EXPERT_DECISION_V1");
  if (!row) return { decision: null, invalid: false };
  try {
    const payload = JSON.parse(text(row.rationale)) as Record<string, unknown>;
    const action = text(row.status);
    const reusableAsset = payload.reusableAsset && typeof payload.reusableAsset === "object" && !Array.isArray(payload.reusableAsset)
      ? payload.reusableAsset as Record<string, unknown> : null;
    const assetType = text(reusableAsset?.type);
    if (!text(row.id) || number(row.effective_version) !== aggregateVersion || !text(row.created_at) || !text(payload.channelId) || !["ACCEPT", "REJECT", "REQUEST_MORE_EVIDENCE"].includes(action)
      || !text(payload.candidateId) || !Number.isInteger(Number(payload.candidateVersion)) || !Number.isInteger(Number(payload.evidenceVersion))
      || !text(payload.rationale) || !["RULE", "RUBRIC_ANCHOR", "EXAMPLE", "ANTI_PATTERN", "EXCEPTION_PATTERN"].includes(assetType)
      || !text(reusableAsset?.summary)) return { decision: null, invalid: true };
    return { decision: {
      decisionId: text(row.id), channelId: text(payload.channelId), actorRole: "OWNER_EXPERT",
      action: action as ExpertDecision["action"], candidateId: text(payload.candidateId), candidateVersion: number(payload.candidateVersion),
      evidenceVersion: number(payload.evidenceVersion), decidedAt: text(row.created_at), rationale: text(payload.rationale),
      reusableAsset: { type: assetType as ExpertDecision["reusableAsset"]["type"], summary: text(reusableAsset?.summary) },
    } satisfies ExpertDecision, invalid: false };
  } catch {
    return { decision: null, invalid: true };
  }
}

export async function discoveryProjection(channelId?: string | null, databaseOverride?: DB): Promise<DiscoveryProjection> {
  const db = databaseOverride || await database();
  const channelRows = await rows(db, "SELECT id,name,market,language,niche,created_at FROM channels ORDER BY created_at,id");
  if (channelId && !channelRows.some((channel) => text(channel.id) === channelId)) throw new ChannelNotFoundError(`Channel ${channelId} does not exist`);
  const selectedChannels = channelId ? channelRows.filter((channel) => text(channel.id) === channelId) : channelRows;
  const allPrograms = await rows(db, "SELECT id,channel_id,version,status,updated_at FROM v7_program_contracts ORDER BY updated_at DESC,id");
  const latestPrograms = new Map<string, Row>();
  for (const program of allPrograms) if (!latestPrograms.has(text(program.channel_id))) latestPrograms.set(text(program.channel_id), program);
  const programs = selectedChannels.map((channel) => latestPrograms.get(text(channel.id))).filter((item): item is Row => Boolean(item));
  const programIds = programs.map((program) => text(program.id));
  const placeholders = programIds.map(() => "?").join(",");
  const [artifacts, sources, claims, runs, lineage, decisions] = programIds.length ? await Promise.all([
    rows(db, `SELECT id,program_id,run_id,stage_key,artifact_type,title,lifecycle_state,content_json,source_count,updated_at FROM v7_intelligence_artifacts WHERE program_id IN (${placeholders}) ORDER BY updated_at DESC,id`, ...programIds),
    rows(db, `SELECT id,program_id,stage_key,authority_tier,verification_state FROM v7_intelligence_sources WHERE program_id IN (${placeholders})`, ...programIds),
    rows(db, `SELECT id,program_id,risk_level,status FROM v7_claim_nodes WHERE program_id IN (${placeholders})`, ...programIds),
    rows(db, `SELECT id,program_id,stage_key,attempt,status,score,threshold,completed_at FROM v7_intelligence_runs WHERE program_id IN (${placeholders}) ORDER BY started_at DESC`, ...programIds),
    rows(db, `SELECT id,program_id,entity_type,lifecycle_state FROM v7_evidence_lineage WHERE program_id IN (${placeholders}) ORDER BY updated_at DESC`, ...programIds),
    rows(db, `SELECT id,program_id,decision_code,status,effective_version,rationale,created_at FROM v7_decision_records WHERE program_id IN (${placeholders}) ORDER BY created_at DESC`, ...programIds),
  ]) : [[], [], [], [], [], []];

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
  const selectedProgram = selected ? latestPrograms.get(text(selected.id)) : null;
  const stage01Run = runs.find((run) => text(run.id) === text(stage01Row?.run_id));
  const workflowBlockers: string[] = [];
  let workflowResult: IntelligenceNicheWorkflowResult | null = null;
  let workflowScopeState: DiscoveryProjection["workflow"]["scopeState"] = channelId ? "CANONICAL_PREREQUISITES_MISSING" : "CHANNEL_SCOPE_REQUIRED";
  let decisionBinding: DiscoveryProjection["workflow"]["decisionBinding"] = channelId ? "NO_VERSION_BOUND_EXPERT_DECISION" : "NOT_APPLICABLE";
  if (!channelId) workflowBlockers.push("Select one channel before compiling a channel-isolated workflow.");
  if (channelId && !selectedProgram) workflowBlockers.push("No canonical V7 program is mapped to this channel.");
  if (channelId && !stage01Row) workflowBlockers.push("No canonical Stage 01 artifact is available.");
  if (channelId && !stage01Run) workflowBlockers.push("The Stage 01 artifact is not bound to a canonical intelligence run version.");
  if (channelId && selectedProgram && stage01Row && stage01Run) {
    const programDecisions = decisions.filter((item) => text(item.program_id) === text(selectedProgram.id));
    const aggregateVersion = number(selectedProgram.version);
    const boundDecision = expertDecision(programDecisions, aggregateVersion);
    decisionBinding = boundDecision.invalid ? "INVALID_VERSION_BOUND_EXPERT_DECISION" : boundDecision.decision ? "VERSION_BOUND_EXPERT_DECISION" : "NO_VERSION_BOUND_EXPERT_DECISION";
    if (boundDecision.invalid) workflowBlockers.push("A NICHE_EXPERT_DECISION_V1 record is malformed and cannot grant downstream authority.");
    const evidenceVersion = number(stage01Run.attempt);
    const championCandidate = candidates.find((candidate) => candidate.recommendationState === "RESEARCH_CHAMPION") || null;
    const contradictionRows = objects(stage01?.contradictions);
    const contradictionsReviewed = stage01?.contradictionsReviewed === true || (contradictionRows.length > 0 && contradictionRows.every((item) => resolvedClaim(item.status)));
    workflowResult = compileIntelligenceNicheWorkflow({
      portfolioId: "CANONICAL_PORTFOLIO", channelId, aggregateVersion, currentNiche: text(selected?.niche) || null,
      researchChampionId: championCandidate?.id || null,
      candidates: candidates.map((candidate) => ({ id: candidate.id, version: evidenceVersion, title: candidate.title, score: candidate.score, evidenceVersion })),
      evidence: {
        version: evidenceVersion, marketArtifactState: frozenStage01 ? "FROZEN" : "DRAFT", verifiedSources, primarySources,
        unresolvedP0Claims: claims.filter((claim) => text(claim.risk_level) === "P0" && !resolvedClaim(claim.status)).length,
        contradictionsReviewed,
      },
      expertDecision: boundDecision.decision,
    });
    workflowScopeState = boundDecision.invalid ? "DECISION_RECONCILIATION_REQUIRED" : "COMPILED";
  }
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
    workflow: { contract: "DISCOVERY_WORKFLOW_PROJECTION_V1", scopeState: workflowScopeState, decisionBinding, result: workflowResult, blockers: workflowBlockers },
    evidence: { artifactCount: artifacts.length, frozenStage01, verifiedSources, primarySources, claims: claims.length, p0Claims: claims.filter((claim) => text(claim.risk_level) === "P0").length, runs: runs.length, lineageIds: lineage.slice(0, 12).map((item) => text(item.id)) },
    integrity: { state: notes.length ? "RECONCILIATION_REQUIRED" : "READY", notes },
  };
}
