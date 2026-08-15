import assert from "node:assert/strict";
import { channelStudioProjection } from "../lib/channel-studio-projection";
import { discoveryProjection } from "../lib/discovery-projection";
import { NicheDecisionCommandError, submitNicheExpertDecision } from "../lib/niche-expert-decision-command";
import { ChannelNotFoundError, channelProjection, portfolioProjection } from "../lib/portfolio-projection";

type Row = Record<string, unknown>;
type Statement = { query: string; bindings: unknown[]; bind: (...values: unknown[]) => Statement; all: <T>() => Promise<{ results?: T[] }>; run: () => Promise<{ meta: { changes: number } }> };
type Database = { prepare: (query: string) => Statement; batch: (statements: Statement[]) => Promise<Array<{ meta: { changes: number } }>> };

const stage01 = {
  channelThesis: "Explain the invisible systems that shape everyday money decisions.",
  targetMarket: "United States",
  targetLanguage: "English",
  topicClusters: [{ title: "Invisible payment rails" }],
  audienceSegments: [{ title: "Curious professionals" }],
  candidates: [{
    title: "The Hidden Cost of Convenience",
    centralQuestion: "Who pays when a transaction feels free?",
    viewerPromise: "See the fee chain end to end.",
    novelty: 91,
    evergreenFit: 89,
    visualPotential: 93,
    score: 91,
  }],
  champion: { title: "The Hidden Cost of Convenience", risks: ["Avoid unsupported fee claims"] },
  contradictionsReviewed: true,
};

const stage02 = {
  references: [{ title: "Reference channel A", role: "FORMAT_REFERENCE_ONLY" }],
  crossReferencePatterns: ["Strong system-level hooks"],
  gapStatement: "Few competitors trace incentives across the complete system.",
  antiCloneControls: ["Do not reuse reference phrasing"],
};

const tables: Record<string, Row[]> = {
  channels: [{ id: "channel-1", name: "Hidden Systems", market: "United States", language: "English", niche: "Hidden Systems Behind Money", created_at: "2026-08-01T00:00:00.000Z" }],
  video_projects: [
    { id: "video-1", channel_id: "channel-1", title: "Why Free Payments Are Not Free", pillar: "Payment rails", status: "PLANNED", opportunity_score: 91, progress: 40, budget_usd: 10, spent_usd: 2, next_action: "Freeze editorial brief", updated_at: "2026-08-14T00:00:00.000Z" },
    { id: "video-2", channel_id: "channel-1", title: "The Settlement Clock", pillar: "Payment rails", status: "COMPLETE", opportunity_score: 88, progress: 100, budget_usd: 8, spent_usd: 7, next_action: "Measure learning", updated_at: "2026-08-13T00:00:00.000Z" },
  ],
  v7_program_contracts: [{ id: "program-1", channel_id: "channel-1", version: 7, status: "STAGE_09_MOTION_PROOF_REQUIRED", execution_mode: "CONTROLLED", quality_policy: "UNIVERSAL_QUALITY_GATE", production_authorized: 0, overall_floor: 90, critical_floor: 90, dimension_floor: 80, p0_tolerance: 0, p1_tolerance: 0, updated_at: "2026-08-14T00:00:00.000Z" }],
  v7_stage_states: [
    { program_id: "program-1", stage_key: "01", sequence: 1, stage_name: "Market and audience intelligence", status: "FROZEN", threshold: 85, attempt: 1, artifact_id: "artifact-01", blocker: null, evidence_summary: "Evidence frozen", frozen_at: "2026-08-10T00:00:00.000Z", updated_at: "2026-08-10T00:00:00.000Z" },
    { program_id: "program-1", stage_key: "09", sequence: 9, stage_name: "Material production", status: "MOTION_PROOF_REQUIRED", threshold: 92, attempt: 1, artifact_id: null, blocker: "Motion proof required", evidence_summary: "Production remains locked", frozen_at: null, updated_at: "2026-08-14T00:00:00.000Z" },
  ],
  v7_cost_events: [{ program_id: "program-1", project_id: "video-1", stage_key: "09", status: "RECORDED", estimated_usd: 3, actual_usd: 2, currency: "USD", updated_at: "2026-08-14T00:00:00.000Z" }],
  v7_ai_usage_events: [{ program_id: "program-1", stage_key: "09", model_id: "gpt-5", provider_status: "completed", total_tokens: 1200, actual_usd: 1.5, pricing_status: "RECORDED", measured_at: "2026-08-14T00:00:00.000Z" }],
  v7_intelligence_artifacts: [
    { id: "artifact-01", program_id: "program-1", run_id: "run-01", stage_key: "01", artifact_type: "MARKET_AUDIENCE_INTELLIGENCE", title: "Market and audience intelligence", lifecycle_state: "FROZEN", content_json: JSON.stringify(stage01), source_count: 10, updated_at: "2026-08-10T00:00:00.000Z" },
    { id: "artifact-02", program_id: "program-1", run_id: "run-02", stage_key: "02", artifact_type: "COMPETITOR_INTELLIGENCE", title: "Competitor intelligence", lifecycle_state: "FROZEN", content_json: JSON.stringify(stage02), source_count: 4, updated_at: "2026-08-11T00:00:00.000Z" },
  ],
  v7_intelligence_sources: Array.from({ length: 10 }, (_, index) => ({ id: `source-${index + 1}`, program_id: "program-1", stage_key: "01", authority_tier: index < 4 ? "TIER_1_PRIMARY" : "TIER_2_AUTHORITY", verification_state: "VERIFIED" })),
  v7_claim_nodes: [{ id: "claim-1", program_id: "program-1", claim_class: "SYSTEM_FACT", risk_level: "P0", status: "VERIFIED" }],
  v7_intelligence_runs: [{ id: "run-01", program_id: "program-1", stage_key: "01", attempt: 4, status: "PASS", score: 91, threshold: 85, started_at: "2026-08-10T00:00:00.000Z", completed_at: "2026-08-10T01:00:00.000Z" }],
  v7_evidence_lineage: [{ id: "lineage-1", program_id: "program-1", project_id: "video-1", entity_type: "INTELLIGENCE", title: "Stage 01 evidence", lifecycle_state: "FROZEN", storage_state: "D1_STORED", rights_state: "VERIFIED", cost_state: "RECORDED", quarantine_state: "CLEAR", updated_at: "2026-08-10T00:00:00.000Z" }],
  v7_asset_registry: [{ id: "asset-1", program_id: "program-1", project_id: "video-1", name: "Owned diagram", asset_class: "OWNED_MOTION", lifecycle_state: "VERIFIED", sync_state: "SYNCED", rights_state: "OWNED", quarantined: 0, cost_usd: 0, updated_at: "2026-08-12T00:00:00.000Z" }],
  v7_decision_records: [{ id: "decision-1", program_id: "program-1", decision_code: "NICHE_REVIEW", title: "Owner niche review", status: "PENDING_OWNER", effective_version: null, rationale: "Research recommendation is not a commitment", created_at: "2026-08-12T00:00:00.000Z" }],
  niche_expert_decisions: [],
  niche_expert_decision_audits: [],
};

function queryRows(query: string, bindings: unknown[]) {
  const normalized = query.replace(/\s+/g, " ").trim().toLowerCase();
  const table = normalized.match(/\bfrom\s+([a-z0-9_]+)/)?.[1];
  assert.ok(table && tables[table], `Primary projection fixture does not cover query: ${query}`);
  let result = tables[table].map((row) => ({ ...row }));
  if (normalized.includes("where id=?")) result = result.filter((row) => row.id === bindings[0]);
  if (normalized.includes("where channel_id=?")) result = result.filter((row) => row.channel_id === bindings[0]);
  if (normalized.includes("where program_id=?")) result = result.filter((row) => row.program_id === bindings[0]);
  if (normalized.includes("idempotency_key=?")) result = result.filter((row) => row.idempotency_key === bindings[0]);
  if (normalized.includes("decision_version=?")) result = result.filter((row) => row.decision_version === bindings[1]);
  if (normalized.includes("where program_id in")) {
    const programIds = new Set(bindings);
    result = result.filter((row) => programIds.has(row.program_id));
  }
  if (normalized.includes("stage_key='01'")) result = result.filter((row) => row.stage_key === "01");
  if (normalized.includes("order by decision_version desc")) result.sort((a, b) => Number(b.decision_version || 0) - Number(a.decision_version || 0));
  return result;
}

function statement(query: string, bindings: unknown[] = []): Statement {
  return {
    query, bindings,
    bind: (...values) => statement(query, values),
    all: async <T>() => ({ results: queryRows(query, bindings) as T[] }),
    run: async () => ({ meta: { changes: 0 } }),
  };
}

function executeMutation(item: Statement) {
  const normalized = item.query.replace(/\s+/g, " ").trim().toLowerCase();
  const values = item.bindings;
  if (normalized.startsWith("insert into niche_expert_decisions")) {
    const program = tables.v7_program_contracts.find((row) => row.id === values[22] && row.channel_id === values[23] && row.version === values[24]);
    if (!program) return { meta: { changes: 0 } };
    if (tables.niche_expert_decisions.some((row) => row.idempotency_key === values[16] || (row.program_id === values[3] && row.decision_version === values[5]))) throw new Error("UNIQUE constraint failed");
    const columns = ["id", "portfolio_id", "channel_id", "program_id", "aggregate_version", "decision_version", "action", "candidate_id", "candidate_version", "evidence_version", "actor_email", "actor_display_name", "actor_role", "rationale", "reusable_asset_type", "reusable_asset_summary", "idempotency_key", "request_hash", "correlation_id", "causation_id", "supersedes_decision_id", "created_at"];
    tables.niche_expert_decisions.unshift(Object.fromEntries(columns.map((column, index) => [column, values[index]])));
    return { meta: { changes: 1 } };
  }
  if (normalized.startsWith("insert into niche_expert_decision_audits")) {
    if (!tables.niche_expert_decisions.some((row) => row.id === values[1])) throw new Error("FOREIGN KEY constraint failed");
    const columns = ["id", "decision_id", "program_id", "channel_id", "event_type", "actor_email", "actor_role", "idempotency_key", "request_hash", "correlation_id", "causation_id", "evidence_lineage_id", "created_at"];
    tables.niche_expert_decision_audits.push(Object.fromEntries(columns.map((column, index) => [column, values[index]])));
    return { meta: { changes: 1 } };
  }
  if (normalized.startsWith("insert into v7_evidence_lineage")) {
    tables.v7_evidence_lineage.push({ id: values[0], program_id: values[1], project_id: values[2], entity_type: values[3], title: values[4], lifecycle_state: "FROZEN", upstream_evidence_id: values[5], artifact_key: values[6], content_hash: values[7], storage_state: "CANONICAL_D1", rights_state: "NOT_APPLICABLE", cost_state: "ZERO_SPEND", quarantine_state: "CLEAR", pipeline_version: 7, created_at: values[8], updated_at: values[9] });
    return { meta: { changes: 1 } };
  }
  throw new Error(`Primary projection fixture does not cover mutation: ${item.query}`);
}

const database: Database = {
  prepare: (query) => statement(query),
  batch: async (statements) => {
    const backup = structuredClone(tables);
    try { return statements.map(executeMutation); }
    catch (error) { for (const key of Object.keys(tables)) tables[key] = backup[key]; throw error; }
  },
};

const portfolio = await portfolioProjection(database);
assert.equal(portfolio.contract, "PORTFOLIO_PROJECTION_V1");
assert.deepEqual(portfolio.summary, { channels: 1, activeVideos: 1, blockedStages: 1, recordedCostUsd: 2 });
assert.deepEqual(portfolio.reconciliation, { orphanVideos: 0, orphanPrograms: 0 });
assert.equal(portfolio.channels[0].program?.productionAuthorized, false);

const channel = await channelProjection("channel-1", database);
assert.equal(channel.contract, "CHANNEL_DETAIL_PROJECTION_V1");
assert.equal(channel.strategy.program?.id, "program-1");
assert.equal(channel.production.stages.length, 2);
assert.equal(channel.financial.billingState, "RECORDED_USAGE_NOT_VERIFIED_BILLING");

const discovery = await discoveryProjection("channel-1", database);
assert.equal(discovery.contract, "DISCOVERY_PROJECTION_V1");
assert.equal(discovery.evidence.verifiedSources, 10);
assert.equal(discovery.niche.candidates[0].readiness, "EVIDENCE_READY_EXPERT_DECISION_REQUIRED");
assert.equal(discovery.niche.decisionAuthority, "OWNER_EXPERT_REQUIRED");
assert.notEqual(discovery.niche.currentNiche, discovery.niche.researchChampion);
assert.equal(discovery.workflow.scopeState, "COMPILED");
assert.equal(discovery.workflow.decisionBinding, "NO_VERSION_BOUND_EXPERT_DECISION");
assert.equal(discovery.workflow.result?.aggregate.version, 7);
assert.equal(discovery.workflow.result?.recommendation?.candidateVersion, 4);
assert.equal(discovery.workflow.result?.state, "EXPERT_DECISION_REQUIRED");
assert.equal(discovery.workflow.result?.evidenceAssessment.ready, true);
assert.equal(discovery.workflow.result?.evidenceAssessment.passedCount, 7);
assert.equal(discovery.workflow.result?.downstreamGate.state, "BLOCKED");
assert.equal(discovery.workflow.decisionCommand?.activation, "ROUTED_ZERO_SPEND");
assert.deepEqual(discovery.workflow.decisionCommand && { aggregate: discovery.workflow.decisionCommand.expectedAggregateVersion, decision: discovery.workflow.decisionCommand.expectedDecisionVersion, candidate: discovery.workflow.decisionCommand.candidateVersion, evidence: discovery.workflow.decisionCommand.evidenceVersion }, { aggregate: 7, decision: 0, candidate: 4, evidence: 4 });
assert.equal(discovery.workflow.result?.commandContracts.find((command) => command.command === "SUBMIT_EXPERT_DECISION")?.activation, "ROUTED_ZERO_SPEND");
assert.ok(discovery.workflow.result?.commandContracts.every((command) => command.ceilings.providerRequests === 0 && command.ceilings.spendUsd === 0));

tables.niche_expert_decisions.unshift({
  id: "decision-accept-1", portfolio_id: "CANONICAL_PORTFOLIO", channel_id: "channel-1", program_id: "program-1", aggregate_version: 7, decision_version: 1,
  action: "ACCEPT", candidate_id: "artifact-01:1", candidate_version: 4, evidence_version: 4, actor_email: "owner@example.com", actor_display_name: "Owner", actor_role: "OWNER_EXPERT",
  rationale: "Evidence package and differentiation were reviewed by the owner expert.", reusable_asset_type: "RUBRIC_ANCHOR", reusable_asset_summary: "Prefer system-level differentiation with explicit factual-risk controls.",
  idempotency_key: "niche-test:accepted", request_hash: "hash-accepted", correlation_id: "correlation-accepted", causation_id: null, supersedes_decision_id: null, created_at: "2026-08-15T00:00:00.000Z",
});
const acceptedDiscovery = await discoveryProjection("channel-1", database);
assert.equal(acceptedDiscovery.workflow.decisionBinding, "VERSION_BOUND_EXPERT_DECISION");
assert.equal(acceptedDiscovery.workflow.result?.state, "NICHE_ACCEPTED_PENDING_COMMITMENT");
assert.equal(acceptedDiscovery.workflow.result?.commitment, null);
assert.equal(acceptedDiscovery.workflow.result?.downstreamGate.state, "READY_FOR_TYPED_HANDOFF");
tables.niche_expert_decisions[0].aggregate_version = 6;
const staleAggregateDecision = await discoveryProjection("channel-1", database);
assert.equal(staleAggregateDecision.workflow.scopeState, "DECISION_RECONCILIATION_REQUIRED");
assert.equal(staleAggregateDecision.workflow.decisionBinding, "INVALID_VERSION_BOUND_EXPERT_DECISION");
assert.equal(staleAggregateDecision.workflow.result?.state, "EXPERT_DECISION_REQUIRED");
assert.equal(staleAggregateDecision.workflow.result?.downstreamGate.state, "BLOCKED");
tables.niche_expert_decisions.shift();

const commandBody = {
  channelId: "channel-1", programId: "program-1", expectedAggregateVersion: 7, expectedDecisionVersion: 0,
  candidateId: "artifact-01:1", candidateVersion: 4, evidenceVersion: 4, action: "ACCEPT" as const,
  rationale: "The evidence package supports a differentiated, durable niche with controlled factual risk.",
  reusableAsset: { type: "RUBRIC_ANCHOR" as const, summary: "Prefer system-level differentiation when primary-source coverage and contradiction review are complete." },
};
const command = { body: commandBody, actor: { email: "owner@example.com", displayName: "Owner Expert", role: "OWNER_EXPERT" as const }, idempotencyKey: "niche-command:test-001" };
const recorded = await submitNicheExpertDecision(database, command);
assert.equal(recorded.outcome, "RECORDED");
assert.equal(recorded.decision.version, 1);
assert.deepEqual(recorded.authority, { authenticated: true, authorized: true, providerRequests: 0, spendUsd: 0, channelNicheMutation: false, channelStrategyActivation: false });
assert.equal(tables.niche_expert_decisions.length, 1);
assert.equal(tables.niche_expert_decision_audits.length, 1);
assert.equal(tables.v7_evidence_lineage.filter((row) => row.entity_type === "NICHE_EXPERT_DECISION").length, 1);
assert.equal(tables.channels[0].niche, "Hidden Systems Behind Money");
const replay = await submitNicheExpertDecision(database, command);
assert.equal(replay.outcome, "IDEMPOTENT_REPLAY");
assert.equal(tables.niche_expert_decisions.length, 1);
await assert.rejects(() => submitNicheExpertDecision(database, { ...command, body: { ...commandBody, rationale: `${commandBody.rationale} Different payload.` } }), (error: unknown) => error instanceof NicheDecisionCommandError && error.code === "IDEMPOTENCY_KEY_REUSED" && error.status === 409);
await assert.rejects(() => submitNicheExpertDecision(database, { ...command, idempotencyKey: "niche-command:test-002" }), (error: unknown) => error instanceof NicheDecisionCommandError && error.code === "DECISION_VERSION_CONFLICT" && error.status === 409);
const postCommandProjection = await discoveryProjection("channel-1", database);
assert.equal(postCommandProjection.workflow.result?.state, "NICHE_ACCEPTED_PENDING_COMMITMENT");
assert.equal(postCommandProjection.workflow.result?.commitment, null);
assert.equal(postCommandProjection.workflow.decisionCommand?.expectedDecisionVersion, 1);

const studio = await channelStudioProjection("channel-1", database);
assert.equal(studio.contract, "CHANNEL_STUDIO_PROJECTION_V1");
assert.equal(studio.summary.PLANNED, 1);
assert.equal(studio.summary.TERMINAL, 1);
assert.equal(studio.strategy.state, "CANONICAL_AGGREGATE_NOT_IMPLEMENTED");
assert.equal(studio.productionHandoff.state, "COMMAND_NOT_AUTHORIZED");
assert.notEqual(studio.nicheDecision.currentNiche, studio.nicheDecision.recommendation);

for (const projection of [
  () => channelProjection("missing", database),
  () => discoveryProjection("missing", database),
  () => channelStudioProjection("missing", database),
]) await assert.rejects(projection, ChannelNotFoundError);

console.log("Canonical-data primary projection contract passed portfolio, channel detail, discovery and channel studio with recommendation, expert-decision and command-authority boundaries intact.");
