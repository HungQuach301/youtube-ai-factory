import assert from "node:assert/strict";
import { channelStudioProjection } from "../lib/channel-studio-projection";
import { discoveryProjection } from "../lib/discovery-projection";
import { nichePortfolioProjection } from "../lib/niche-portfolio-projection";
import { NicheEvidenceCommandError, submitNicheEvidenceCommand } from "../lib/niche-evidence-command";
import { NicheScoringCommandError, submitNicheScoringCommand } from "../lib/niche-scoring-command";
import { NichePriorityCommandError, submitNichePriorityCommand } from "../lib/niche-priority-command";
import { NicheGovernanceCommandError, submitNicheGovernanceCommand } from "../lib/niche-governance-command";
import { NicheHypothesisCommandError, submitNicheHypothesis } from "../lib/niche-hypothesis-command";
import { NicheDecisionCommandError, submitNicheExpertDecision } from "../lib/niche-expert-decision-command";
import { ChannelNotFoundError, channelProjection, portfolioProjection } from "../lib/portfolio-projection";

type Row = Record<string, unknown>;
type Statement = { query: string; bindings: unknown[]; bind: (...values: unknown[]) => Statement; all: <T>() => Promise<{ results?: T[] }>; run: () => Promise<{ meta: { changes: number } }> };
type Database = { prepare: (query: string) => Statement; batch: (statements: Statement[]) => Promise<Array<{ meta: { changes: number } }>> };

const stage01 = {
  channelThesis: "Explain the invisible systems that shape everyday money decisions.",
  targetMarket: "United States",
  targetLanguage: "English",
  topicClusters: [{ title: "Invisible payment rails", demandSignal: "Recurring questions about hidden transaction fees", growthSignal: "Digital payment adoption keeps the system relevant" }],
  audienceSegments: [{ title: "Curious professionals", characteristics: ["Time poor", "Financially curious"], needs: ["System-level clarity"], preferences: ["Evidence-led visual explanations"], pains: ["Fragmented financial explanations"], jobsToBeDone: ["Understand incentives before making decisions"] }],
  nicheOpportunities: [{
    entityType: "NICHE_OPPORTUNITY", opportunityId: "niche-money-systems", title: "Hidden systems shaping everyday money decisions",
    description: "A bounded US-market channel territory for evidence-led explanations of invisible financial systems.", viewerPromise: "Understand the system before making a costly money decision.", centralQuestion: "Which invisible financial systems repeatedly shape household outcomes?", contentTerritories: ["Payments", "Credit", "Pricing incentives"],
    audienceSegments: [{ title: "Time-poor curious professionals", characteristics: ["Time poor", "Financially curious"], needs: ["System-level clarity"], preferences: ["Evidence-led visual explanations"], pains: ["Fragmented financial explanations"], jobsToBeDone: ["Understand incentives before making decisions"] }],
    competitors: [{ title: "Reference channel A", strengths: ["Large audience"], weaknesses: ["Shallow source disclosure"], defensibility: ["Established brand"], contentAdvantages: ["Strong hooks"], exploitableGaps: ["End-to-end incentive tracing"] }],
    scorecard: { marketAttractiveness: { score: 90 }, abilityToWin: { score: 84 }, evidenceConfidence: { score: 86 } },
    marketPotential: { targetMarket: "United States", demandSignals: ["Stable demand for system explanations"], growthSignals: ["Financial products keep increasing in complexity"], monetizationPaths: ["YouTube ads", "Financial education sponsorship"], saturationRisks: ["Large personal-finance incumbents"] },
    researchPlan: { supportingQuestions: ["Which demand signals are durable?"], contradictingQuestions: ["Which evidence would falsify the opportunity?"], unknownQuestions: ["Which segment has the strongest repeat intent?"] },
    prerequisites: [{ label: "Primary-source research", status: "PASS", gap: 0, rationale: "Money claims require defensible sources.", closingAction: "Maintain source rubric", proofMethod: "Pilot scripts pass source audit" }],
    winningCriteria: [{ label: "Evidence-led system storytelling", status: "GAP", gap: 12, rationale: "Depth must be repeatable.", closingAction: "Pilot three repeatable formats", proofMethod: "Retention and trust targets pass" }],
  }, {
    entityType: "NICHE_OPPORTUNITY", opportunityId: "niche-credit-incentives", title: "Consumer credit incentives for first-generation wealth builders",
    description: "A bounded US-market channel territory revealing how credit-product incentives affect first-generation wealth builders.", viewerPromise: "See who benefits from each credit design before choosing a product.", centralQuestion: "How do recurring credit incentives shape first-generation wealth decisions?", contentTerritories: ["Credit products", "Risk pricing", "Household behavior"],
    audienceSegments: [{ title: "First-generation wealth builders", characteristics: ["Digitally active", "Building financial confidence"], needs: ["Product-incentive clarity"], preferences: ["Concrete visual comparisons"], pains: ["Advice without system context"], jobsToBeDone: ["Choose credit products with fewer hidden tradeoffs"] }],
    competitors: [{ title: "Advice-led finance channels", strengths: ["High publishing cadence"], weaknesses: ["Limited incentive tracing"], defensibility: ["Established distribution"], contentAdvantages: ["Actionable tips"], exploitableGaps: ["Cross-party incentive maps"] }],
    scorecard: { marketAttractiveness: { score: 86 }, abilityToWin: { score: 89 }, evidenceConfidence: { score: 82 } },
    marketPotential: { targetMarket: "United States", demandSignals: ["Persistent credit-product questions"], growthSignals: ["Consumer credit choices remain complex"], monetizationPaths: ["YouTube ads"], saturationRisks: ["Advice-heavy incumbents"] },
    researchPlan: { supportingQuestions: ["What proves recurring audience demand?"], contradictingQuestions: ["Where are competitors already complete?"], unknownQuestions: ["Which format best reveals incentives?"] },
    prerequisites: [{ label: "Controlled financial claims", status: "PASS", gap: 0, proofMethod: "Zero unsupported P0 claims" }],
    winningCriteria: [{ label: "Cross-party incentive maps", status: "PASS", gap: 0, proofMethod: "Pilot comprehension score passes" }],
  }],
  candidates: [{
    title: "The Hidden Cost of Convenience",
    centralQuestion: "Who pays when a transaction feels free?",
    viewerPromise: "See the fee chain end to end.",
    novelty: 91,
    evergreenFit: 89,
    visualPotential: 93,
    score: 91,
    marketAttractiveness: 90,
    abilityToWin: 84,
    evidenceConfidence: 86,
    marketPotential: { demandSignals: ["Stable demand for payment explanations"], growthSignals: ["Payment complexity is increasing"], monetizationPaths: ["YouTube ads", "Financial education sponsorship"], saturationRisks: ["Large personal-finance incumbents"] },
    researchPlan: { supportingQuestions: ["Which demand signals are durable?"], contradictingQuestions: ["Which evidence would falsify the opportunity?"], unknownQuestions: ["Which segment has the strongest repeat intent?"] },
    prerequisites: [{ label: "Primary-source research", status: "PASS", gap: 0, rationale: "Money claims require defensible sources.", closingAction: "Maintain source rubric", proofMethod: "Pilot scripts pass source audit" }],
    winningCriteria: [{ label: "Evidence-led system storytelling", status: "GAP", gap: 12, rationale: "Depth must be repeatable.", closingAction: "Pilot three repeatable formats", proofMethod: "Retention and trust targets pass" }],
  }, {
    title: "The Incentives Behind Everyday Credit",
    centralQuestion: "Who benefits from the way consumer credit is designed?",
    viewerPromise: "Trace incentives from product design to household behavior.",
    novelty: 88, evergreenFit: 91, visualPotential: 85, score: 88,
    marketAttractiveness: 86, abilityToWin: 89, evidenceConfidence: 82,
    marketPotential: { demandSignals: ["Persistent credit-product questions"], growthSignals: ["Consumer credit choices remain complex"], monetizationPaths: ["YouTube ads"], saturationRisks: ["Advice-heavy incumbents"] },
    researchPlan: { supportingQuestions: ["What proves recurring audience demand?"], contradictingQuestions: ["Where are competitors already complete?"], unknownQuestions: ["Which format best reveals incentives?"] },
    prerequisites: [{ label: "Controlled financial claims", status: "PASS", gap: 0, proofMethod: "Zero unsupported P0 claims" }],
    winningCriteria: [{ label: "Cross-party incentive maps", status: "PASS", gap: 0, proofMethod: "Pilot comprehension score passes" }],
  }],
  champion: { title: "The Hidden Cost of Convenience", risks: ["Avoid unsupported fee claims"] },
  contradictionsReviewed: true,
};

const stage02 = {
  references: [{ title: "Reference channel A", role: "FORMAT_REFERENCE_ONLY", strengths: ["Large audience", "Fast publishing cadence"], weaknesses: ["Shallow source disclosure"], defensibility: ["Established brand"], contentAdvantages: ["Strong hooks"], exploitableGaps: ["End-to-end incentive tracing"] }],
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
  niche_hypotheses: [],
  niche_hypothesis_audits: [],
  niche_evidence_workflow_events: [],
  niche_evidence_workflow_audits: [],
  niche_scoring_assessments: [
    { id: "score-1", portfolio_id: "CANONICAL_PORTFOLIO", channel_id: "channel-1", program_id: "program-1", opportunity_id: "niche-money-systems", opportunity_origin: "SYSTEM_DISCOVERED", aggregate_version: 7, evidence_version: 8, scoring_version: 1, sufficiency_state: "SUFFICIENT", sufficiency_gaps_json: "[]", market_attractiveness_score: 90, market_attractiveness_basis: "Accepted demand evidence supports durable recurring need.", ability_to_win_score: 84, ability_to_win_basis: "Accepted competitive evidence supports a differentiated format.", evidence_confidence_score: 86, evidence_confidence_basis: "Balanced current evidence includes a primary source.", prerequisites_json: JSON.stringify([{ id: "p1", label: "Primary-source research", status: "PASS", basis: "The source protocol is operating.", closingAction: "Maintain source rubric", proofMethod: "Pilot scripts pass source audit" }]), winning_criteria_json: JSON.stringify([{ id: "w1", label: "Evidence-led system storytelling", status: "GAP", basis: "Repeatability still needs proof.", closingAction: "Pilot three repeatable formats", proofMethod: "Retention and trust targets pass" }]), comparison_eligibility: "ELIGIBLE", actor_email: "owner@example.com", actor_display_name: "Owner Expert", created_at: "2026-08-15T00:00:00.000Z" },
    { id: "score-2", portfolio_id: "CANONICAL_PORTFOLIO", channel_id: "channel-1", program_id: "program-1", opportunity_id: "niche-credit-incentives", opportunity_origin: "SYSTEM_DISCOVERED", aggregate_version: 7, evidence_version: 8, scoring_version: 1, sufficiency_state: "SUFFICIENT", sufficiency_gaps_json: "[]", market_attractiveness_score: 86, market_attractiveness_basis: "Accepted demand evidence supports persistent audience need.", ability_to_win_score: 89, ability_to_win_basis: "Accepted gap evidence supports incentive-map differentiation.", evidence_confidence_score: 82, evidence_confidence_basis: "Balanced current evidence includes a primary source.", prerequisites_json: JSON.stringify([{ id: "p2", label: "Controlled financial claims", status: "PASS", basis: "The claims protocol is operating.", closingAction: "Maintain claim control", proofMethod: "Zero unsupported P0 claims" }]), winning_criteria_json: JSON.stringify([{ id: "w2", label: "Cross-party incentive maps", status: "PASS", basis: "Pilot maps meet the comprehension target.", closingAction: "Maintain map rubric", proofMethod: "Pilot comprehension score passes" }]), comparison_eligibility: "ELIGIBLE", actor_email: "owner@example.com", actor_display_name: "Owner Expert", created_at: "2026-08-15T00:00:00.000Z" },
  ],
  niche_scoring_assessment_audits: [],
  niche_expert_priority_sets: [],
  niche_expert_priority_items: [],
  niche_expert_priority_audits: [],
  niche_portfolio_selections: [],
  niche_portfolio_selection_audits: [],
  niche_portfolio_commitments: [],
  niche_portfolio_commitment_audits: [],
};

function queryRows(query: string, bindings: unknown[]) {
  const normalized = query.replace(/\s+/g, " ").trim().toLowerCase();
  const table = normalized.match(/\bfrom\s+([a-z0-9_]+)/)?.[1];
  assert.ok(table && tables[table], `Primary projection fixture does not cover query: ${query}`);
  let result = tables[table].map((row) => ({ ...row }));
  if (normalized.includes("where id=?")) result = result.filter((row) => row.id === bindings[0]);
  if (normalized.includes("where id=? and channel_id=?")) result = result.filter((row) => row.channel_id === bindings[1]);
  if (normalized.includes("where channel_id=?")) result = result.filter((row) => row.channel_id === bindings[0]);
  if (normalized.includes("where program_id=?")) result = result.filter((row) => row.program_id === bindings[0]);
  if (normalized.includes("where opportunity_id=?")) result = result.filter((row) => row.opportunity_id === bindings[0]);
  if (normalized.includes("where priority_set_id=?")) result = result.filter((row) => row.priority_set_id === bindings[0]);
  if (normalized.includes("where portfolio_id=?")) result = result.filter((row) => row.portfolio_id === bindings[0]);
  if (normalized.includes("and channel_id=?")) result = result.filter((row) => row.channel_id === bindings[1]);
  if (normalized.includes("and program_id=?")) result = result.filter((row) => row.program_id === bindings[2]);
  if (normalized.includes("idempotency_key=?")) result = result.filter((row) => row.idempotency_key === bindings[0]);
  if (normalized.includes("decision_version=?")) result = result.filter((row) => row.decision_version === bindings[1]);
  if (normalized.includes("where program_id in")) {
    const programIds = new Set(bindings);
    result = result.filter((row) => programIds.has(row.program_id));
  }
  if (normalized.includes("stage_key='01'")) result = result.filter((row) => row.stage_key === "01");
  if (normalized.includes("action='prepare_niche_research_plan'")) result = result.filter((row) => row.action === "PREPARE_NICHE_RESEARCH_PLAN");
  if (normalized.includes("action='request_niche_validation'")) result = result.filter((row) => row.action === "REQUEST_NICHE_VALIDATION");
  if (normalized.includes("and plan_version=?")) result = result.filter((row) => row.plan_version === bindings[1]);
  if (normalized.includes("order by decision_version desc")) result.sort((a, b) => Number(b.decision_version || 0) - Number(a.decision_version || 0));
  if (normalized.includes("order by hypothesis_version desc")) result.sort((a, b) => Number(b.hypothesis_version || 0) - Number(a.hypothesis_version || 0));
  if (normalized.includes("order by evidence_version desc")) result.sort((a, b) => Number(b.evidence_version || 0) - Number(a.evidence_version || 0));
  if (normalized.includes("order by scoring_version desc")) result.sort((a, b) => Number(b.scoring_version || 0) - Number(a.scoring_version || 0));
  if (normalized.includes("order by priority_version desc")) result.sort((a, b) => Number(b.priority_version || 0) - Number(a.priority_version || 0));
  if (normalized.includes("order by selection_version desc")) result.sort((a, b) => Number(b.selection_version || 0) - Number(a.selection_version || 0));
  if (normalized.includes("order by commitment_version desc")) result.sort((a, b) => Number(b.commitment_version || 0) - Number(a.commitment_version || 0));
  if (normalized.includes("order by expert_priority")) result.sort((a, b) => Number(a.expert_priority || 0) - Number(b.expert_priority || 0));
  if (normalized.includes("order by plan_version desc")) result.sort((a, b) => Number(b.plan_version || 0) - Number(a.plan_version || 0));
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
  if (normalized.startsWith("insert into niche_hypotheses")) {
    const program = tables.v7_program_contracts.find((row) => row.id === values[20] && row.channel_id === values[21] && row.version === values[22]);
    if (!program) return { meta: { changes: 0 } };
    if (tables.niche_hypotheses.some((row) => row.idempotency_key === values[15] || (row.program_id === values[3] && row.hypothesis_version === values[5]))) throw new Error("UNIQUE constraint failed");
    const columns = ["id", "portfolio_id", "channel_id", "program_id", "aggregate_version", "hypothesis_version", "title", "description", "rationale", "audience_assumptions_json", "demand_assumptions_json", "known_competitors_json", "winning_thesis", "actor_email", "actor_display_name", "idempotency_key", "request_hash", "correlation_id", "causation_id", "created_at"];
    const row = Object.fromEntries(columns.map((column, index) => [column, values[index]]));
    Object.assign(row, { origin: "EXPERT_SEEDED", lifecycle_state: "EVIDENCE_GATHERING", actor_role: "OWNER_EXPERT" });
    tables.niche_hypotheses.push(row);
    return { meta: { changes: 1 } };
  }
  if (normalized.startsWith("insert into niche_hypothesis_audits")) {
    if (!tables.niche_hypotheses.some((row) => row.id === values[1])) throw new Error("FOREIGN KEY constraint failed");
    const columns = ["id", "hypothesis_id", "program_id", "channel_id", "event_type", "actor_email", "actor_role", "idempotency_key", "request_hash", "correlation_id", "causation_id", "evidence_lineage_id", "created_at"];
    tables.niche_hypothesis_audits.push(Object.fromEntries(columns.map((column, index) => [column, values[index]])));
    return { meta: { changes: 1 } };
  }
  if (normalized.startsWith("insert into niche_evidence_workflow_events")) {
    const columns = normalized.slice(normalized.indexOf("(") + 1, normalized.indexOf(")")).split(",").map((column) => column.trim());
    const row = Object.fromEntries(columns.map((column, index) => [column, values[index]]));
    if (tables.niche_evidence_workflow_events.some((item) => item.idempotency_key === row.idempotency_key || (item.opportunity_id === row.opportunity_id && item.evidence_version === row.evidence_version))) throw new Error("UNIQUE constraint failed");
    tables.niche_evidence_workflow_events.push(row);
    return { meta: { changes: 1 } };
  }
  if (normalized.startsWith("insert into niche_evidence_workflow_audits")) {
    if (!tables.niche_evidence_workflow_events.some((row) => row.id === values[1])) throw new Error("FOREIGN KEY constraint failed");
    const columns = ["id", "event_id", "program_id", "channel_id", "opportunity_id", "event_type", "actor_email", "actor_role", "idempotency_key", "request_hash", "correlation_id", "causation_id", "evidence_lineage_id", "created_at"];
    tables.niche_evidence_workflow_audits.push(Object.fromEntries(columns.map((column, index) => [column, values[index]])));
    return { meta: { changes: 1 } };
  }
  if (normalized.startsWith("insert into niche_scoring_assessments")) {
    if (tables.niche_scoring_assessments.some((row) => row.idempotency_key === values[25] || (row.opportunity_id === values[4] && row.scoring_version === values[8]))) throw new Error("UNIQUE constraint failed");
    const columns = ["id", "portfolio_id", "channel_id", "program_id", "opportunity_id", "opportunity_origin", "aggregate_version", "evidence_version", "scoring_version", "sufficiency_state", "sufficiency_gaps_json", "market_attractiveness_score", "market_attractiveness_basis", "market_attractiveness_evidence_json", "ability_to_win_score", "ability_to_win_basis", "ability_to_win_evidence_json", "evidence_confidence_score", "evidence_confidence_basis", "evidence_confidence_evidence_json", "prerequisites_json", "winning_criteria_json", "comparison_eligibility", "actor_email", "actor_display_name", "idempotency_key", "request_hash", "correlation_id", "causation_id", "created_at"];
    const row = Object.fromEntries(columns.map((column, index) => [column, values[index]])); Object.assign(row, { action: "RECORD_NICHE_SCORING_ASSESSMENT", actor_role: "OWNER_EXPERT" }); tables.niche_scoring_assessments.push(row); return { meta: { changes: 1 } };
  }
  if (normalized.startsWith("insert into niche_scoring_assessment_audits")) {
    if (!tables.niche_scoring_assessments.some((row) => row.id === values[1])) throw new Error("FOREIGN KEY constraint failed");
    const columns = ["id", "assessment_id", "program_id", "channel_id", "opportunity_id", "actor_email", "idempotency_key", "request_hash", "correlation_id", "causation_id", "evidence_lineage_id", "created_at"]; const row = Object.fromEntries(columns.map((column, index) => [column, values[index]])); Object.assign(row, { event_type: "NICHE_SCORING_ASSESSMENT_RECORDED", actor_role: "OWNER_EXPERT" }); tables.niche_scoring_assessment_audits.push(row); return { meta: { changes: 1 } };
  }
  if (normalized.startsWith("insert into niche_expert_priority_sets")) {
    const columns = ["id", "portfolio_id", "priority_version", "action", "comparable_set_hash", "item_count", "portfolio_rationale", "actor_email", "actor_display_name", "actor_role", "idempotency_key", "request_hash", "correlation_id", "causation_id", "created_at"];
    const row = Object.fromEntries(columns.map((column, index) => [column, values[index]]));
    if (tables.niche_expert_priority_sets.some((item) => item.idempotency_key === row.idempotency_key || (item.portfolio_id === row.portfolio_id && item.priority_version === row.priority_version))) throw new Error("UNIQUE constraint failed");
    tables.niche_expert_priority_sets.push(row); return { meta: { changes: 1 } };
  }
  if (normalized.startsWith("insert into niche_expert_priority_items")) {
    const columns = ["id", "priority_set_id", "portfolio_id", "priority_version", "channel_id", "program_id", "opportunity_id", "opportunity_origin", "aggregate_version", "evidence_version", "scoring_version", "expert_priority", "rationale", "created_at"];
    const row = Object.fromEntries(columns.map((column, index) => [column, values[index]]));
    if (!tables.niche_expert_priority_sets.some((item) => item.id === row.priority_set_id)) throw new Error("FOREIGN KEY constraint failed");
    if (tables.niche_expert_priority_items.some((item) => item.priority_set_id === row.priority_set_id && (item.opportunity_id === row.opportunity_id || item.expert_priority === row.expert_priority))) throw new Error("UNIQUE constraint failed");
    tables.niche_expert_priority_items.push(row); return { meta: { changes: 1 } };
  }
  if (normalized.startsWith("insert into niche_expert_priority_audits")) {
    if (!tables.niche_expert_priority_sets.some((row) => row.id === values[1])) throw new Error("FOREIGN KEY constraint failed");
    const columns = ["id", "priority_set_id", "portfolio_id", "actor_email", "idempotency_key", "request_hash", "correlation_id", "causation_id", "evidence_lineage_id", "created_at"];
    const row = Object.fromEntries(columns.map((column, index) => [column, values[index]])); Object.assign(row, { event_type: "NICHE_EXPERT_PRIORITY_SET_RECORDED", actor_role: "OWNER_EXPERT" }); tables.niche_expert_priority_audits.push(row); return { meta: { changes: 1 } };
  }
  if (normalized.startsWith("insert into niche_portfolio_selections")) {
    const columns = normalized.slice(normalized.indexOf("(") + 1, normalized.indexOf(")")).split(",").map((column) => column.trim()); const row = Object.fromEntries(columns.map((column, index) => [column, values[index]]));
    if (tables.niche_portfolio_selections.some((item) => item.idempotency_key === row.idempotency_key || (item.portfolio_id === row.portfolio_id && item.selection_version === row.selection_version))) throw new Error("UNIQUE constraint failed"); tables.niche_portfolio_selections.push(row); return { meta: { changes: 1 } };
  }
  if (normalized.startsWith("insert into niche_portfolio_selection_audits")) { const columns = ["id", "selection_id", "portfolio_id", "actor_email", "idempotency_key", "request_hash", "correlation_id", "causation_id", "evidence_lineage_id", "created_at"]; const row = Object.fromEntries(columns.map((column, index) => [column, values[index]])); Object.assign(row, { event_type: "NICHE_SELECTED_PENDING_COMMITMENT", actor_role: "OWNER_EXPERT" }); tables.niche_portfolio_selection_audits.push(row); return { meta: { changes: 1 } }; }
  if (normalized.startsWith("insert into niche_portfolio_commitments")) {
    const columns = normalized.slice(normalized.indexOf("(") + 1, normalized.indexOf(")")).split(",").map((column) => column.trim()); const row = Object.fromEntries(columns.map((column, index) => [column, values[index]]));
    if (tables.niche_portfolio_commitments.some((item) => item.idempotency_key === row.idempotency_key || (item.portfolio_id === row.portfolio_id && item.commitment_version === row.commitment_version))) throw new Error("UNIQUE constraint failed"); tables.niche_portfolio_commitments.push(row); return { meta: { changes: 1 } };
  }
  if (normalized.startsWith("insert into niche_portfolio_commitment_audits")) { const columns = ["id", "commitment_id", "portfolio_id", "actor_email", "idempotency_key", "request_hash", "correlation_id", "causation_id", "evidence_lineage_id", "created_at"]; const row = Object.fromEntries(columns.map((column, index) => [column, values[index]])); Object.assign(row, { event_type: "NICHE_COMMITTED", actor_role: "PORTFOLIO_GOVERNANCE" }); tables.niche_portfolio_commitment_audits.push(row); return { meta: { changes: 1 } }; }
  if (normalized.startsWith("insert into v7_evidence_lineage")) {
    const hypothesisLineage = values[3] === "NICHE_HYPOTHESIS";
    tables.v7_evidence_lineage.push({ id: values[0], program_id: values[1], project_id: values[2], entity_type: values[3], title: values[4], lifecycle_state: "FROZEN", upstream_evidence_id: hypothesisLineage ? null : values[5], artifact_key: hypothesisLineage ? values[5] : values[6], content_hash: hypothesisLineage ? values[6] : values[7], storage_state: "CANONICAL_D1", rights_state: "NOT_APPLICABLE", cost_state: "ZERO_SPEND", quarantine_state: "CLEAR", pipeline_version: 7, created_at: hypothesisLineage ? values[7] : values[8], updated_at: hypothesisLineage ? values[8] : values[9] });
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

const nichePortfolio = await nichePortfolioProjection("channel-1", database);
assert.equal(nichePortfolio.contract, "NICHE_PORTFOLIO_PROJECTION_V2");
assert.equal(nichePortfolio.sourceState, "NICHE_OPPORTUNITY_ONLY_WITH_EXPERT_HYPOTHESIS_APPEND");
assert.equal(nichePortfolio.summary.opportunities, 2);
assert.equal(nichePortfolio.summary.excludedLegacyContentTopics, 2);
assert.equal(nichePortfolio.summary.comparable, 2);
assert.equal(nichePortfolio.decisionState, "PORTFOLIO_COMPARABLE");
assert.equal(nichePortfolio.rankingPolicy.totalScore, null);
assert.equal(nichePortfolio.comparison[0].axes.marketAttractiveness.state, "RECORDED");
assert.equal(nichePortfolio.comparison[0].audiences[0].needs[0], "System-level clarity");
assert.equal(nichePortfolio.comparison[0].competitors[0].strengths[0], "Large audience");
assert.equal(nichePortfolio.comparison[0].prerequisites[0].status, "PASS");
assert.equal(nichePortfolio.comparison[0].winningCriteria.length, 1);
assert.equal(nichePortfolio.comparison[0].expertPriority, null);
assert.ok(nichePortfolio.comparison.every((item) => item.entityType === "NICHE_OPPORTUNITY" && item.provenance === "V2_SYSTEM_DISCOVERY"));
assert.ok(nichePortfolio.comparison.every((item) => !stage01.candidates.some((topic) => topic.title === item.title)));
assert.equal(nichePortfolio.authority.v2Commands, "SUBMIT_HYPOTHESIS_SLICE_4_EVIDENCE_SLICE_5_SCORING_SLICE_6_PRIORITY_AND_SLICE_7_GOVERNANCE_ZERO_SPEND");
assert.deepEqual({ providerRequests: nichePortfolio.authority.providerRequests, spendUsd: nichePortfolio.authority.spendUsd, scoringAssessment: nichePortfolio.authority.scoringAssessment, comparisonMutation: nichePortfolio.authority.comparisonMutation, expertPriorityMutation: nichePortfolio.authority.expertPriorityMutation, systemRankMutation: nichePortfolio.authority.systemRankMutation }, { providerRequests: 0, spendUsd: 0, scoringAssessment: true, comparisonMutation: true, expertPriorityMutation: true, systemRankMutation: false });
assert.equal(nichePortfolio.downstreamGate.state, "BLOCKED");
const stage01Artifact = tables.v7_intelligence_artifacts.find((row) => row.id === "artifact-01");
assert.ok(stage01Artifact);
const stage01ArtifactJson = String(stage01Artifact.content_json);
const topicOnlyArtifact = JSON.parse(stage01ArtifactJson) as Record<string, unknown>;
delete topicOnlyArtifact.nicheOpportunities;
stage01Artifact.content_json = JSON.stringify(topicOnlyArtifact);
const topicOnlyPortfolio = await nichePortfolioProjection("channel-1", database);
assert.equal(topicOnlyPortfolio.summary.opportunities, 0);
assert.equal(topicOnlyPortfolio.summary.excludedLegacyContentTopics, 2);
assert.equal(topicOnlyPortfolio.decisionState, "RESEARCH_IN_PROGRESS");
stage01Artifact.content_json = stage01ArtifactJson;

const hypothesisBody = {
  channelId: "channel-1", programId: "program-1", expectedAggregateVersion: 7, expectedHypothesisVersion: 0,
  title: "Invisible systems behind healthcare prices",
  description: "Explain the hidden incentives and price-setting systems that shape routine healthcare decisions.",
  rationale: "Expert observation suggests recurring confusion, high decision cost and weak system-level explanation from existing channels.",
  audienceAssumptions: ["Time-poor households making costly care decisions"],
  demandAssumptions: ["Recurring need to understand opaque healthcare prices"],
  knownCompetitors: ["Consumer health education channels"],
  winningThesis: "Win through primary-source price-chain maps and repeatable decision-oriented visual explanations.",
};
const hypothesisCommand = { body: hypothesisBody, actor: { email: "owner@example.com", displayName: "Owner Expert", role: "OWNER_EXPERT" as const }, idempotencyKey: "niche-hypothesis:test-001" };
const hypothesisRecorded = await submitNicheHypothesis(database, hypothesisCommand);
assert.equal(hypothesisRecorded.outcome, "RECORDED");
assert.equal(hypothesisRecorded.hypothesis.version, 1);
assert.equal(hypothesisRecorded.nextAction, "PREPARE_NICHE_RESEARCH_PLAN");
assert.deepEqual(hypothesisRecorded.authority, { authenticated: true, authorized: true, providerRequests: 0, spendUsd: 0, comparisonEligibility: false, expertPriorityMutation: false, nicheSelection: false, nicheCommitment: false, channelNicheMutation: false, channelStrategyActivation: false });
assert.equal(tables.niche_hypotheses.length, 1);
assert.equal(tables.niche_hypothesis_audits.length, 1);
assert.equal(tables.v7_evidence_lineage.filter((row) => row.entity_type === "NICHE_HYPOTHESIS").length, 1);
assert.equal(tables.channels[0].niche, "Hidden Systems Behind Money");
const hypothesisReplay = await submitNicheHypothesis(database, hypothesisCommand);
assert.equal(hypothesisReplay.outcome, "IDEMPOTENT_REPLAY");
await assert.rejects(() => submitNicheHypothesis(database, { ...hypothesisCommand, body: { ...hypothesisBody, rationale: `${hypothesisBody.rationale} Different payload.` } }), (error: unknown) => error instanceof NicheHypothesisCommandError && error.code === "IDEMPOTENCY_KEY_REUSED" && error.status === 409);
await assert.rejects(() => submitNicheHypothesis(database, { ...hypothesisCommand, idempotencyKey: "niche-hypothesis:test-002" }), (error: unknown) => error instanceof NicheHypothesisCommandError && error.code === "HYPOTHESIS_VERSION_CONFLICT" && error.status === 409);
await assert.rejects(() => submitNicheHypothesis(database, { ...hypothesisCommand, idempotencyKey: "niche-hypothesis:test-003", body: { ...hypothesisBody, channelId: "channel-missing" } }), (error: unknown) => error instanceof NicheHypothesisCommandError && error.code === "CROSS_CHANNEL_PROGRAM_REFERENCE" && error.status === 409);
const hypothesisPortfolio = await nichePortfolioProjection("channel-1", database);
const expertInput = hypothesisPortfolio.comparison.find((item) => item.opportunityId === hypothesisRecorded.hypothesis.id);
assert.ok(expertInput);
assert.equal(hypothesisPortfolio.summary.opportunities, 3);
assert.equal(hypothesisPortfolio.summary.expertSeeded, 1);
assert.equal(expertInput.systemRank, null);
assert.equal(expertInput.eligibility, "RESEARCH_REQUIRED");
assert.equal(expertInput.axes.marketAttractiveness.score, null);
assert.equal(expertInput.expertPriority, null);
assert.equal(expertInput.hypothesis.audienceAssumptions[0], hypothesisBody.audienceAssumptions[0]);
assert.deepEqual(expertInput.allowedNextActions, ["PREPARE_NICHE_RESEARCH_PLAN"]);
assert.equal(hypothesisPortfolio.downstreamGate.state, "BLOCKED");

const evidenceActor = { email: "owner@example.com", displayName: "Owner Expert", role: "OWNER_EXPERT" as const };
const planBody = {
  action: "PREPARE_NICHE_RESEARCH_PLAN" as const, channelId: "channel-1", programId: "program-1", opportunityId: hypothesisRecorded.hypothesis.id,
  opportunityOrigin: "EXPERT_SEEDED" as const, expectedAggregateVersion: 7, expectedEvidenceVersion: 0,
  supportingQuestions: ["Which primary demand signals support recurring audience need?"], contradictingQuestions: ["Which evidence would falsify the demand thesis?"],
  unknownQuestions: ["Which audience segment changes the investment decision?"], sourceClasses: ["Audience primary research", "YouTube first-party signals"],
  providerAllowlist: [], maxSources: 12, maxProviderRequests: 0, maxSpendUsd: 0,
};
const planCommand = { body: planBody, actor: evidenceActor, idempotencyKey: "niche-evidence:plan-test-001" };
const planRecorded = await submitNicheEvidenceCommand(database, planCommand);
assert.equal(planRecorded.event.planVersion, 1);
assert.equal(planRecorded.event.evidenceVersion, 1);
assert.equal(planRecorded.authority.providerRequests, 0);
assert.equal(planRecorded.authority.comparisonEligibility, false);
assert.equal((await submitNicheEvidenceCommand(database, planCommand)).outcome, "IDEMPOTENT_REPLAY");
const validationRecorded = await submitNicheEvidenceCommand(database, { actor: evidenceActor, idempotencyKey: "niche-evidence:validation-test-001", body: { action: "REQUEST_NICHE_VALIDATION", channelId: "channel-1", programId: "program-1", opportunityId: hypothesisRecorded.hypothesis.id, opportunityOrigin: "EXPERT_SEEDED", expectedAggregateVersion: 7, expectedEvidenceVersion: 1, planVersion: 1, approvalRationale: "The plan balances confirming, falsifying and decision-changing questions within a zero-spend envelope." } });
assert.equal(validationRecorded.event.evidenceVersion, 2);
assert.equal(validationRecorded.authority.spendUsd, 0);
const reviewRecorded = await submitNicheEvidenceCommand(database, { actor: evidenceActor, idempotencyKey: "niche-evidence:review-test-001", body: { action: "RECORD_NICHE_EVIDENCE_REVIEW", channelId: "channel-1", programId: "program-1", opportunityId: hypothesisRecorded.hypothesis.id, opportunityOrigin: "EXPERT_SEEDED", expectedAggregateVersion: 7, expectedEvidenceVersion: 2, planVersion: 1, direction: "CONTRADICTS", claimStatement: "Audience interviews did not yet show a repeat viewing need for price-chain explanations.", sourceRef: "research://interview-wave-1", sourceAuthority: "PRIMARY", observedAt: "2026-08-15", freshness: "CURRENT", confidence: 76, affectedAxis: "MARKET_ATTRACTIVENESS", disposition: "NEEDS_MORE_RESEARCH", decisionImpact: "Run a second interview wave before any market-attractiveness scoring is attempted." } });
assert.equal(reviewRecorded.event.evidenceVersion, 3);
assert.equal(tables.niche_evidence_workflow_events.length, 3);
assert.equal(tables.niche_evidence_workflow_audits.length, 3);
assert.equal(tables.v7_evidence_lineage.filter((row) => row.entity_type === "NICHE_EVIDENCE_EVENT").length, 3);
await assert.rejects(() => submitNicheEvidenceCommand(database, { ...planCommand, idempotencyKey: "niche-evidence:stale-test-001" }), (error: unknown) => error instanceof NicheEvidenceCommandError && error.code === "EVIDENCE_VERSION_CONFLICT" && error.status === 409);
const evidencePortfolio = await nichePortfolioProjection("channel-1", database);
const evidencedInput = evidencePortfolio.comparison.find((item) => item.opportunityId === hypothesisRecorded.hypothesis.id);
assert.ok(evidencedInput);
assert.equal(evidencedInput.evidenceWorkflow.state, "EVIDENCE_UNDER_REVIEW");
assert.equal(evidencedInput.evidenceWorkflow.plan?.version, 1);
assert.equal(evidencedInput.evidenceWorkflow.validation?.status, "APPROVED_NOT_DISPATCHED");
assert.equal(evidencedInput.evidenceWorkflow.directionCoverage.contradicts, 1);
assert.equal(evidencedInput.eligibility, "RESEARCH_REQUIRED");
assert.equal(evidencedInput.systemRank, null);
assert.equal(evidencePortfolio.summary.researchPlans, 1);
assert.equal(evidencePortfolio.summary.validationApprovals, 1);
assert.equal(evidencePortfolio.summary.evidenceReviewed, 1);
assert.equal(evidencedInput.evidenceWorkflow.scoringGate.state, "EVIDENCE_INSUFFICIENT");

const acceptedReviews = [
  ["SUPPORTS", "MARKET_ATTRACTIVENESS", "PRIMARY", "Current first-party demand evidence supports recurring audience need."],
  ["CONTRADICTS", "ABILITY_TO_WIN", "SECONDARY", "A strong incumbent weakens the assumed distribution advantage."],
  ["UNKNOWN", "EVIDENCE_CONFIDENCE", "SECONDARY", "The repeat-viewing threshold remains a decision-changing unknown."],
  ["SUPPORTS", "PREREQUISITE", "PRIMARY", "The source-control prerequisite passed a documented pilot audit."],
  ["SUPPORTS", "WINNING_CRITERION", "SECONDARY", "The visual price-chain format passed the pilot comprehension threshold."],
] as const;
const acceptedIds: Record<string, string[]> = {};
for (const [index, [direction, affectedAxis, sourceAuthority, claimStatement]] of acceptedReviews.entries()) {
  const recorded = await submitNicheEvidenceCommand(database, { actor: evidenceActor, idempotencyKey: `niche-evidence:accepted-${index + 1}`, body: { action: "RECORD_NICHE_EVIDENCE_REVIEW", channelId: "channel-1", programId: "program-1", opportunityId: hypothesisRecorded.hypothesis.id, opportunityOrigin: "EXPERT_SEEDED", expectedAggregateVersion: 7, expectedEvidenceVersion: 3 + index, planVersion: 1, direction, claimStatement, sourceRef: `research://accepted-${index + 1}`, sourceAuthority, observedAt: "2026-08-15", freshness: "CURRENT", confidence: 84, affectedAxis, disposition: "ACCEPTED", decisionImpact: "Bind this accepted review to the next evidence-sufficiency and scoring assessment." } });
  (acceptedIds[affectedAxis] ||= []).push(recorded.event.id);
}
const scoringBody = {
  action: "RECORD_NICHE_SCORING_ASSESSMENT" as const, channelId: "channel-1", programId: "program-1", opportunityId: hypothesisRecorded.hypothesis.id, opportunityOrigin: "EXPERT_SEEDED" as const,
  expectedAggregateVersion: 7, expectedEvidenceVersion: 8, expectedScoringVersion: 0,
  marketAttractiveness: { score: 78, basis: "Primary demand evidence supports a meaningful recurring audience need.", evidenceEventIds: acceptedIds.MARKET_ATTRACTIVENESS },
  abilityToWin: { score: 66, basis: "The proposed format differentiates, but incumbent distribution remains strong.", evidenceEventIds: acceptedIds.ABILITY_TO_WIN },
  evidenceConfidence: { score: 74, basis: "The evidence set is balanced, current and includes primary-source review.", evidenceEventIds: acceptedIds.EVIDENCE_CONFIDENCE },
  prerequisites: [{ id: "source-control", label: "Primary-source control", status: "PASS" as const, basis: "The documented pilot audit confirms the prerequisite is operating.", evidenceEventIds: acceptedIds.PREREQUISITE, closingAction: "Maintain the source-control rubric", proofMethod: "Every pilot passes the source audit" }],
  winningCriteria: [{ id: "visual-chain", label: "Visual price-chain explanation", status: "GAP" as const, basis: "One pilot passed, but repeatability across the content line is unproven.", evidenceEventIds: acceptedIds.WINNING_CRITERION, closingAction: "Run two additional format pilots", proofMethod: "Three pilots pass comprehension targets" }],
};
const scoringCommand = { body: scoringBody, actor: evidenceActor, idempotencyKey: "niche-scoring:test-001" };
const scoringRecorded = await submitNicheScoringCommand(database, scoringCommand);
assert.equal(scoringRecorded.assessment.sufficiencyState, "SUFFICIENT");
assert.equal(scoringRecorded.assessment.comparisonEligibility, "ELIGIBLE");
assert.equal(scoringRecorded.authority.aggregateScore, null);
assert.equal(scoringRecorded.authority.expertPriorityMutation, false);
assert.equal((await submitNicheScoringCommand(database, scoringCommand)).outcome, "IDEMPOTENT_REPLAY");
await assert.rejects(() => submitNicheScoringCommand(database, { ...scoringCommand, idempotencyKey: "niche-scoring:stale-001" }), (error: unknown) => error instanceof NicheScoringCommandError && error.code === "SCORING_VERSION_CONFLICT");
const extraConfidence = await submitNicheEvidenceCommand(database, { actor: evidenceActor, idempotencyKey: "niche-evidence:accepted-confidence-support", body: { action: "RECORD_NICHE_EVIDENCE_REVIEW", channelId: "channel-1", programId: "program-1", opportunityId: hypothesisRecorded.hypothesis.id, opportunityOrigin: "EXPERT_SEEDED", expectedAggregateVersion: 7, expectedEvidenceVersion: 8, planVersion: 1, direction: "SUPPORTS", claimStatement: "A second current source supports the reliability of the evidence package.", sourceRef: "research://accepted-confidence-support", sourceAuthority: "SECONDARY", observedAt: "2026-08-15", freshness: "CURRENT", confidence: 82, affectedAxis: "EVIDENCE_CONFIDENCE", disposition: "ACCEPTED", decisionImpact: "Use this review to exercise the server-side direction-sufficiency gate." } });
await assert.rejects(() => submitNicheScoringCommand(database, { ...scoringCommand, idempotencyKey: "niche-scoring:stale-evidence", body: { ...scoringBody, expectedScoringVersion: 1 } }), (error: unknown) => error instanceof NicheScoringCommandError && error.code === "EVIDENCE_VERSION_CONFLICT");
const insufficient = await submitNicheScoringCommand(database, { actor: evidenceActor, idempotencyKey: "niche-scoring:test-002", body: { ...scoringBody, expectedEvidenceVersion: 9, expectedScoringVersion: 1, evidenceConfidence: { ...scoringBody.evidenceConfidence, evidenceEventIds: [extraConfidence.event.id] } } });
assert.equal(insufficient.assessment.sufficiencyState, "INSUFFICIENT");
assert.equal(insufficient.assessment.comparisonEligibility, "RESEARCH_REQUIRED");
assert.ok(insufficient.assessment.sufficiencyGaps.some((gap) => gap.includes("unknown")));
const prerequisiteBlocked = await submitNicheScoringCommand(database, { actor: evidenceActor, idempotencyKey: "niche-scoring:test-003", body: { ...scoringBody, expectedEvidenceVersion: 9, expectedScoringVersion: 2, prerequisites: scoringBody.prerequisites.map((item) => ({ ...item, status: "GAP" as const, basis: "The latest audit found a prerequisite gap that must be closed before eligibility." })) } });
assert.equal(prerequisiteBlocked.assessment.sufficiencyState, "SUFFICIENT");
assert.equal(prerequisiteBlocked.assessment.comparisonEligibility, "BLOCKED_BY_PREREQUISITE");
const scoredPortfolio = await nichePortfolioProjection("channel-1", database);
const scoredExpertInput = scoredPortfolio.comparison.find((item) => item.opportunityId === hypothesisRecorded.hypothesis.id);
assert.ok(scoredExpertInput);
assert.equal(scoredExpertInput.lifecycleState, "COMPARABLE");
assert.equal(scoredExpertInput.axes.marketAttractiveness.score, 78);
assert.equal(scoredExpertInput.eligibility, "BLOCKED_BY_PREREQUISITE");
assert.equal(scoredExpertInput.systemRankBasis, "SLICE_5_LEXICOGRAPHIC_EVIDENCE_ORDER");
assert.equal(scoredExpertInput.expertPriority, null);
assert.equal(scoredPortfolio.rankingPolicy.totalScore, null);
assert.equal(tables.channels[0].niche, "Hidden Systems Behind Money");

const comparableForPriority = scoredPortfolio.comparison.filter((item) => item.scoringAssessment.state === "SUFFICIENT");
const slice5BeforePriority = new Map(comparableForPriority.map((item) => [item.opportunityId, { systemRank: item.systemRank, axes: structuredClone(item.axes), eligibility: item.eligibility, scoringVersion: item.scoringAssessment.scoringVersion, evidenceVersion: item.scoringAssessment.evidenceVersion }]));
const priorityBody = {
  action: "SET_NICHE_PRIORITY" as const, expectedPriorityVersion: 0, expectedComparableSetHash: scoredPortfolio.priorityWorkspace.comparableSetHash,
  portfolioRationale: "Prioritize opportunities by strategic learning value and capability adjacency while preserving the system evidence order as an independent fact.",
  priorities: comparableForPriority.map((item, index) => ({ opportunityId: item.opportunityId, priority: comparableForPriority.length - index, rationale: `Expert ordering for ${item.title} reflects sequencing, learning value and operating fit beyond the unchanged system evidence rank.` })),
};
const priorityCommand = { body: priorityBody, actor: evidenceActor, idempotencyKey: "niche-priority:test-001" };
const priorityRecorded = await submitNichePriorityCommand(database, priorityCommand);
assert.equal(priorityRecorded.outcome, "RECORDED");
assert.equal(priorityRecorded.prioritySet.version, 1);
assert.equal(priorityRecorded.prioritySet.itemCount, comparableForPriority.length);
assert.deepEqual(priorityRecorded.authority, { authenticated: true, authorized: true, providerRequests: 0, spendUsd: 0, aggregateScore: null, expertPriorityMutation: true, systemRankMutation: false, axisMutation: false, evidenceSufficiencyMutation: false, eligibilityMutation: false, nicheSelection: false, nicheCommitment: false, channelNicheMutation: false, channelStrategyActivation: false });
assert.equal(tables.niche_expert_priority_sets.length, 1);
assert.equal(tables.niche_expert_priority_items.length, comparableForPriority.length);
assert.equal(tables.niche_expert_priority_audits.length, 1);
assert.equal(tables.v7_evidence_lineage.filter((row) => row.entity_type === "NICHE_EXPERT_PRIORITY_SET").length, 1);
assert.equal((await submitNichePriorityCommand(database, priorityCommand)).outcome, "IDEMPOTENT_REPLAY");
await assert.rejects(() => submitNichePriorityCommand(database, { ...priorityCommand, body: { ...priorityBody, portfolioRationale: `${priorityBody.portfolioRationale} Changed.` } }), (error: unknown) => error instanceof NichePriorityCommandError && error.code === "IDEMPOTENCY_KEY_REUSED");
await assert.rejects(() => submitNichePriorityCommand(database, { ...priorityCommand, idempotencyKey: "niche-priority:stale-version-001" }), (error: unknown) => error instanceof NichePriorityCommandError && error.code === "PRIORITY_VERSION_CONFLICT");
await assert.rejects(() => submitNichePriorityCommand(database, { ...priorityCommand, idempotencyKey: "niche-priority:partial-001", body: { ...priorityBody, expectedPriorityVersion: 1, priorities: priorityBody.priorities.slice(1).map((item, index) => ({ ...item, priority: index + 1 })) } }), (error: unknown) => error instanceof NichePriorityCommandError && error.code === "COMPARABLE_PORTFOLIO_CONFLICT");
const prioritizedPortfolio = await nichePortfolioProjection("channel-1", database);
assert.equal(prioritizedPortfolio.priorityWorkspace.state, "ACTIVE");
assert.equal(prioritizedPortfolio.priorityWorkspace.priorityVersion, 1);
assert.equal(prioritizedPortfolio.summary.prioritized, comparableForPriority.length);
assert.equal(prioritizedPortfolio.decisionState, "EXPERT_PRIORITIZATION_RECORDED");
for (const item of prioritizedPortfolio.comparison.filter((opportunity) => opportunity.scoringAssessment.state === "SUFFICIENT")) {
  const before = slice5BeforePriority.get(item.opportunityId); assert.ok(before);
  assert.equal(item.systemRank, before.systemRank); assert.deepEqual(item.axes, before.axes); assert.equal(item.eligibility, before.eligibility);
  assert.equal(item.expertPriorityFact.state, "ACTIVE"); assert.equal(item.lifecycleState, "EXPERT_PRIORITIZED");
}
assert.equal(tables.channels[0].niche, "Hidden Systems Behind Money");
const governanceActor = { email: "owner@example.com", displayName: "Portfolio Governor", role: "PORTFOLIO_GOVERNANCE" as const };
await assert.rejects(() => submitNicheGovernanceCommand(database, { actor: governanceActor, idempotencyKey: "niche-commitment:direct-001", body: { action: "COMMIT_NICHE", expectedCommitmentVersion: 0, expectedSelectionVersion: 1, selectionId: "missing-selection", governance: { owner: "Portfolio Governance", rationale: "A direct commitment must remain impossible without a separately recorded selection fact.", riskAcceptance: "Accept only risks explicitly reviewed against current evidence.", reviewCadenceDays: 30, revisitTriggers: ["Evidence materially contradicts the niche thesis"], evidenceReviewed: true, priorityReviewed: true, noActivationAcknowledged: true } } }), (error: unknown) => error instanceof NicheGovernanceCommandError && error.code === "ACTIVE_SELECTION_REQUIRED");
const selectedCandidate = prioritizedPortfolio.comparison.filter((item) => item.eligibility === "ELIGIBLE").sort((a, b) => (a.expertPriority ?? 999) - (b.expertPriority ?? 999))[0]; assert.ok(selectedCandidate);
const beforeGovernance = { systemRank: selectedCandidate.systemRank, expertPriority: selectedCandidate.expertPriority, axes: structuredClone(selectedCandidate.axes), eligibility: selectedCandidate.eligibility, niche: tables.channels[0].niche };
const selectionCommand = { actor: evidenceActor, idempotencyKey: "niche-selection:test-001", body: { action: "SELECT_NICHE_FOR_COMMITMENT" as const, expectedSelectionVersion: 0, expectedPriorityVersion: 1, expectedComparableSetHash: prioritizedPortfolio.priorityWorkspace.comparableSetHash, opportunityId: selectedCandidate.opportunityId, rationale: "Select the strongest expert-priority opportunity for an explicit governance review without changing evidence facts.", tradeoffs: ["Sequencing this niche defers learning from lower-priority opportunities"], commitmentConditions: ["Maintain every prerequisite in PASS state through governance review"] } };
const selectedReceipt = await submitNicheGovernanceCommand(database, selectionCommand);
assert.equal(selectedReceipt.state, "SELECTED_PENDING_COMMITMENT"); assert.equal(selectedReceipt.authority.nicheSelection, true); assert.equal(selectedReceipt.authority.nicheCommitment, false); assert.equal(selectedReceipt.authority.aggregateScore, null);
assert.equal((await submitNicheGovernanceCommand(database, selectionCommand)).outcome, "IDEMPOTENT_REPLAY");
await assert.rejects(() => submitNicheGovernanceCommand(database, { ...selectionCommand, body: { ...selectionCommand.body, rationale: `${selectionCommand.body.rationale} Changed.` } }), (error: unknown) => error instanceof NicheGovernanceCommandError && error.code === "IDEMPOTENCY_KEY_REUSED");
const selectedPortfolio = await nichePortfolioProjection("channel-1", database); const selectedProjection = selectedPortfolio.comparison.find((item) => item.opportunityId === selectedCandidate.opportunityId); assert.ok(selectedProjection);
assert.equal(selectedPortfolio.decisionState, "SELECTED_PENDING_COMMITMENT"); assert.equal(selectedProjection.lifecycleState, "SELECTED_PENDING_COMMITMENT"); assert.equal(selectedProjection.systemRank, beforeGovernance.systemRank); assert.equal(selectedProjection.expertPriority, beforeGovernance.expertPriority); assert.deepEqual(selectedProjection.axes, beforeGovernance.axes); assert.equal(selectedProjection.eligibility, beforeGovernance.eligibility); assert.equal(tables.channels[0].niche, beforeGovernance.niche);
const commitmentCommand = { actor: governanceActor, idempotencyKey: "niche-commitment:test-001", body: { action: "COMMIT_NICHE" as const, expectedCommitmentVersion: 0, expectedSelectionVersion: 1, selectionId: selectedReceipt.selection.id, governance: { owner: "Portfolio Governance", rationale: "Commit the explicitly selected niche after reviewing current evidence, priority and prerequisite lineage.", riskAcceptance: "Accept format-learning risk while preserving factual-risk controls and revisit triggers.", reviewCadenceDays: 30, revisitTriggers: ["A prerequisite leaves PASS state", "Fresh contradictory evidence changes the niche thesis"], evidenceReviewed: true as const, priorityReviewed: true as const, noActivationAcknowledged: true as const } } };
const committedReceipt = await submitNicheGovernanceCommand(database, commitmentCommand); assert.equal(committedReceipt.state, "COMMITTED"); assert.equal(committedReceipt.authority.nicheCommitment, true); assert.equal(committedReceipt.authority.channelStrategyActivation, false);
assert.equal((await submitNicheGovernanceCommand(database, commitmentCommand)).outcome, "IDEMPOTENT_REPLAY");
const committedPortfolio = await nichePortfolioProjection("channel-1", database); const committedProjection = committedPortfolio.comparison.find((item) => item.opportunityId === selectedCandidate.opportunityId); assert.ok(committedProjection);
assert.equal(committedPortfolio.decisionState, "NICHE_COMMITTED"); assert.equal(committedPortfolio.governanceWorkspace.state, "COMMITTED"); assert.equal(committedProjection.lifecycleState, "COMMITTED"); assert.equal(committedProjection.systemRank, beforeGovernance.systemRank); assert.equal(committedProjection.expertPriority, beforeGovernance.expertPriority); assert.deepEqual(committedProjection.axes, beforeGovernance.axes); assert.equal(committedProjection.eligibility, beforeGovernance.eligibility); assert.equal(tables.channels[0].niche, beforeGovernance.niche); assert.equal(committedPortfolio.downstreamGate.state, "BLOCKED");
const systemAssessment = tables.niche_scoring_assessments.find((row) => row.id === "score-1"); assert.ok(systemAssessment);
tables.niche_scoring_assessments.push({ ...systemAssessment, id: "score-1-reassessment", scoring_version: 2, created_at: "2026-08-16T00:00:00.000Z" });
const stalePriorities = await nichePortfolioProjection("channel-1", database);
assert.equal(stalePriorities.priorityWorkspace.state, "STALE");
assert.equal(stalePriorities.decisionState, "GOVERNANCE_STALE");
assert.equal(stalePriorities.governanceWorkspace.state, "STALE");
assert.equal(stalePriorities.comparison.find((item) => item.opportunityId === "niche-money-systems")?.expertPriorityFact.state, "STALE");
tables.niche_scoring_assessments.pop();

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
assert.equal(studio.legacyTopicCandidates.length, 2);
assert.ok(studio.legacyTopicCandidates.every((item) => item.entityType === "VIDEO_TOPIC_CANDIDATE" && item.provenance === "LEGACY_V1_VIDEO_TOPIC_CANDIDATE"));
assert.equal(studio.contentResearchChampion?.title, stage01.champion.title);
assert.notEqual(studio.nicheDecision.currentNiche, studio.contentResearchChampion?.title);

for (const projection of [
  () => channelProjection("missing", database),
  () => discoveryProjection("missing", database),
  () => channelStudioProjection("missing", database),
]) await assert.rejects(projection, ChannelNotFoundError);

console.log("Canonical-data primary projection contract passed portfolio, channel detail, discovery and channel studio with recommendation, expert-decision and command-authority boundaries intact.");
