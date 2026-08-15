import type { DiscoveryCandidate, DiscoveryProjection } from "@/app/discovery-contract";
import { assessIntelligenceNicheEvidence, compileIntelligenceNicheWorkflow, type ExpertDecision, type IntelligenceNicheWorkflowInput, type IntelligenceNicheWorkflowResult } from "@/lib/intelligence-niche-workflow-contract";
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
  const row = rows[0];
  if (!row) return { decision: null, invalid: false };
  const action = text(row.action);
  const assetType = text(row.reusable_asset_type);
  if (!text(row.id) || number(row.aggregate_version) !== aggregateVersion || !text(row.created_at) || !text(row.channel_id)
    || text(row.actor_role) !== "OWNER_EXPERT" || !text(row.actor_email) || !text(row.idempotency_key) || !text(row.request_hash)
    || !["ACCEPT", "REJECT", "REQUEST_MORE_EVIDENCE"].includes(action) || !text(row.candidate_id)
    || !Number.isInteger(Number(row.candidate_version)) || !Number.isInteger(Number(row.evidence_version))
    || !text(row.rationale) || !["RULE", "RUBRIC_ANCHOR", "EXAMPLE", "ANTI_PATTERN", "EXCEPTION_PATTERN"].includes(assetType)
    || !text(row.reusable_asset_summary)) return { decision: null, invalid: true };
  return { decision: {
    decisionId: text(row.id), channelId: text(row.channel_id), actorRole: "OWNER_EXPERT",
    action: action as ExpertDecision["action"], candidateId: text(row.candidate_id), candidateVersion: number(row.candidate_version),
    evidenceVersion: number(row.evidence_version), decidedAt: text(row.created_at), rationale: text(row.rationale),
    reusableAsset: { type: assetType as ExpertDecision["reusableAsset"]["type"], summary: text(row.reusable_asset_summary) },
  } satisfies ExpertDecision, invalid: false };
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
    rows(db, `SELECT id,program_id,channel_id,aggregate_version,decision_version,action,candidate_id,candidate_version,evidence_version,actor_email,actor_role,rationale,reusable_asset_type,reusable_asset_summary,idempotency_key,request_hash,created_at FROM niche_expert_decisions WHERE program_id IN (${placeholders}) ORDER BY decision_version DESC,created_at DESC`, ...programIds),
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
  const selected = selectedChannels[0];
  const selectedProgram = selected ? latestPrograms.get(text(selected.id)) : null;
  const stage01Run = runs.find((run) => text(run.id) === text(stage01Row?.run_id));
  const evidenceVersion = number(stage01Run?.attempt);
  const contradictionRows = objects(stage01?.contradictions);
  const contradictionsReviewed = stage01?.contradictionsReviewed === true || (contradictionRows.length > 0 && contradictionRows.every((item) => resolvedClaim(item.status)));
  const unresolvedP0Claims = claims.filter((claim) => text(claim.risk_level) === "P0" && !resolvedClaim(claim.status)).length;
  let candidates: DiscoveryCandidate[] = objects(stage01?.candidates).map((candidate, index) => {
    const score = number(candidate.score);
    const title = text(candidate.title);
    return {
      id: `${text(stage01Row?.id) || "unbound"}:${index + 1}`,
      title,
      centralQuestion: text(candidate.centralQuestion),
      viewerPromise: text(candidate.viewerPromise),
      novelty: number(candidate.novelty), evergreenFit: number(candidate.evergreenFit), visualPotential: number(candidate.visualPotential), score,
      readiness: score >= 75 ? "REVIEW_REQUIRED" : "INSUFFICIENT_EVIDENCE",
      risks: title === championTitle ? strings(champion?.risks) : [],
      recommendationState: title === championTitle ? "RESEARCH_CHAMPION" : "RESEARCH_CANDIDATE",
    };
  }).sort((a, b) => b.score - a.score);
  const championCandidate = candidates.find((candidate) => candidate.recommendationState === "RESEARCH_CHAMPION") || null;
  const evidenceInput: IntelligenceNicheWorkflowInput = {
    portfolioId: "CANONICAL_PORTFOLIO", channelId: channelId || text(selected?.id) || "PORTFOLIO_SCOPE",
    aggregateVersion: Math.max(1, number(selectedProgram?.version)), currentNiche: text(selected?.niche) || null,
    researchChampionId: championCandidate?.id || null,
    candidates: candidates.map((candidate) => ({ id: candidate.id, version: Math.max(1, evidenceVersion), title: candidate.title, score: candidate.score, evidenceVersion: Math.max(1, evidenceVersion) })),
    evidence: { version: Math.max(1, evidenceVersion), marketArtifactState: frozenStage01 ? "FROZEN" : stage01Row ? "DRAFT" : "MISSING", verifiedSources, primarySources, unresolvedP0Claims, contradictionsReviewed },
    expertDecision: null,
  };
  const evidenceAssessment = assessIntelligenceNicheEvidence(evidenceInput);
  const foundationReady = evidenceAssessment.criteria.filter((criterion) => !["RESEARCH_CHAMPION_BOUND", "CHAMPION_SCORE_FLOOR"].includes(criterion.id)).every((criterion) => criterion.passed);
  candidates = candidates.map((candidate) => ({ ...candidate, readiness: candidate.score >= 85 && foundationReady ? "EVIDENCE_READY_EXPERT_DECISION_REQUIRED" : candidate.score >= 75 ? "REVIEW_REQUIRED" : "INSUFFICIENT_EVIDENCE" }));
  const workflowBlockers: string[] = [];
  let workflowResult: IntelligenceNicheWorkflowResult | null = null;
  let decisionCommand: DiscoveryProjection["workflow"]["decisionCommand"] = null;
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
    workflowResult = compileIntelligenceNicheWorkflow({
      portfolioId: "CANONICAL_PORTFOLIO", channelId, aggregateVersion, currentNiche: text(selected?.niche) || null,
      researchChampionId: championCandidate?.id || null,
      candidates: candidates.map((candidate) => ({ id: candidate.id, version: evidenceVersion, title: candidate.title, score: candidate.score, evidenceVersion })),
      evidence: {
        version: evidenceVersion, marketArtifactState: frozenStage01 ? "FROZEN" : "DRAFT", verifiedSources, primarySources,
        unresolvedP0Claims,
        contradictionsReviewed,
      },
      expertDecision: boundDecision.decision,
    });
    if (!boundDecision.invalid && championCandidate && ["EVIDENCE_READY_EXPERT_DECISION_REQUIRED", "EXPERT_DECIDED"].includes(workflowResult.readiness)) {
      decisionCommand = {
        activation: "ROUTED_ZERO_SPEND",
        programId: text(selectedProgram.id),
        expectedAggregateVersion: aggregateVersion,
        expectedDecisionVersion: number(programDecisions[0]?.decision_version),
        candidateId: championCandidate.id,
        candidateVersion: evidenceVersion,
        evidenceVersion,
        providerRequests: 0,
        spendUsd: 0,
      };
    }
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
    workflow: { contract: "DISCOVERY_WORKFLOW_PROJECTION_V1", scopeState: workflowScopeState, decisionBinding, result: workflowResult, blockers: workflowBlockers, decisionCommand },
    evidence: { artifactCount: artifacts.length, frozenStage01, verifiedSources, primarySources, claims: claims.length, p0Claims: claims.filter((claim) => text(claim.risk_level) === "P0").length, runs: runs.length, lineageIds: lineage.slice(0, 12).map((item) => text(item.id)) },
    integrity: { state: notes.length ? "RECONCILIATION_REQUIRED" : "READY", notes },
  };
}
