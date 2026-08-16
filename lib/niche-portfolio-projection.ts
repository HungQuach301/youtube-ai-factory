import type { NicheEvidenceWorkflow, NicheOpportunityProjection, NichePortfolioProjection, NicheScoringAssessment, PortfolioAudience, PortfolioAxis, PortfolioCompetitor, PortfolioCondition } from "@/app/niche-portfolio-contract";
import { NICHE_OPPORTUNITY_POLICY_VERSION } from "@/lib/niche-opportunity-portfolio-contract";
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
function numberOrNull(value: unknown) { const parsed = Number(value); return value !== null && value !== undefined && value !== "" && Number.isFinite(parsed) ? parsed : null; }
function record(value: unknown): Row { return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {}; }
function objects(value: unknown) { return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : []; }
function strings(value: unknown) {
  if (Array.isArray(value)) return value.flatMap((item) => typeof item === "string" || typeof item === "number" ? [text(item)] : []).filter(Boolean);
  const single = text(value); return single ? [single] : [];
}
function unique(values: string[]) { return [...new Set(values.map((value) => value.trim()).filter(Boolean))]; }
async function sha256(value: string) { const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join(""); }
function nested(row: Row, ...keys: string[]) { let value: unknown = row; for (const key of keys) value = record(value)[key]; return value; }
function resolvedClaim(value: unknown) { return /VERIFIED|RESOLVED|PASS|CONTROLLED|APPROVED/i.test(text(value)); }
function parseArtifact(row: Row | undefined) {
  if (!row) return null;
  const parsed = JSON.parse(text(row.content_json));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(`Artifact ${text(row.id)} has an invalid canonical payload`);
  return parsed as Row;
}
function parseJsonArray(value: unknown) {
  try { return strings(JSON.parse(text(value))); }
  catch { return []; }
}
function evidenceWorkflow(opportunityId: string, events: Row[]): NicheEvidenceWorkflow {
  const opportunityEvents = events.filter((item) => text(item.opportunity_id) === opportunityId);
  const planRows = opportunityEvents.filter((item) => text(item.action) === "PREPARE_NICHE_RESEARCH_PLAN").sort((a, b) => Number(b.plan_version) - Number(a.plan_version));
  const planRow = planRows[0];
  const planVersion = Number(planRow?.plan_version || 0);
  const validationRow = opportunityEvents.filter((item) => text(item.action) === "REQUEST_NICHE_VALIDATION" && Number(item.plan_version) === planVersion).sort((a, b) => Number(b.evidence_version) - Number(a.evidence_version))[0];
  const reviewRows = opportunityEvents.filter((item) => text(item.action) === "RECORD_NICHE_EVIDENCE_REVIEW" && Number(item.plan_version) === planVersion).sort((a, b) => Number(a.evidence_version) - Number(b.evidence_version));
  const reviews = reviewRows.map((item) => ({
    eventId: text(item.id), evidenceVersion: Number(item.evidence_version), direction: text(item.claim_direction) as "SUPPORTS" | "CONTRADICTS" | "UNKNOWN",
    statement: text(item.claim_statement), sourceRef: text(item.source_ref), sourceAuthority: text(item.source_authority) as "PRIMARY" | "SECONDARY" | "EXPERT_OBSERVATION",
    observedAt: text(item.observed_at), freshness: text(item.freshness) as "CURRENT" | "AGING" | "STALE" | "UNKNOWN", confidence: Number(item.confidence),
    affectedAxis: text(item.affected_axis) as "MARKET_ATTRACTIVENESS" | "ABILITY_TO_WIN" | "EVIDENCE_CONFIDENCE" | "PREREQUISITE" | "WINNING_CRITERION",
    disposition: text(item.review_disposition) as "ACCEPTED" | "REJECTED" | "NEEDS_MORE_RESEARCH", decisionImpact: text(item.decision_impact),
    reviewedBy: text(item.actor_display_name) || text(item.actor_email), createdAt: text(item.created_at),
  }));
  const latestEvidenceVersion = opportunityEvents.reduce((latest, item) => Math.max(latest, Number(item.evidence_version) || 0), 0);
  return {
    contract: "NICHE_EVIDENCE_WORKFLOW_V1", evidenceVersion: latestEvidenceVersion,
    state: reviews.length ? "EVIDENCE_UNDER_REVIEW" : validationRow ? "VALIDATION_APPROVED" : planRow ? "PLAN_READY" : "NOT_STARTED",
    plan: planRow ? {
      eventId: text(planRow.id), version: planVersion, supportingQuestions: parseJsonArray(planRow.supporting_questions_json), contradictingQuestions: parseJsonArray(planRow.contradicting_questions_json),
      unknownQuestions: parseJsonArray(planRow.unknown_questions_json), sourceClasses: parseJsonArray(planRow.source_classes_json), providerAllowlist: parseJsonArray(planRow.provider_allowlist_json),
      maxSources: Number(planRow.max_sources), maxProviderRequests: Number(planRow.max_provider_requests), maxSpendUsd: Number(planRow.max_spend_cents) / 100, balanced: true, createdAt: text(planRow.created_at),
    } : null,
    validation: validationRow ? { requestId: text(validationRow.id), planVersion, status: "APPROVED_NOT_DISPATCHED", providerRequests: 0, spendUsd: 0, approvedAt: text(validationRow.created_at) } : null,
    reviews,
    directionCoverage: { supports: reviews.filter((item) => item.direction === "SUPPORTS").length, contradicts: reviews.filter((item) => item.direction === "CONTRADICTS").length, unknown: reviews.filter((item) => item.direction === "UNKNOWN").length },
    scoringGate: reviews.filter((item) => item.disposition === "ACCEPTED").length >= 5
      ? { state: "READY_FOR_SLICE_5", reason: "Accepted evidence reviews are available for a separate sufficiency and three-axis assessment." }
      : { state: "EVIDENCE_INSUFFICIENT", reason: "Record accepted reviews for all three axes, prerequisites and winning criteria before scoring." },
  };
}
function axis(candidate: Row, key: "marketAttractiveness" | "abilityToWin" | "evidenceConfidence"): PortfolioAxis {
  const explicit = numberOrNull(nested(candidate, "scorecard", key, "score")) ?? numberOrNull(candidate[key]);
  if (explicit !== null && explicit >= 0 && explicit <= 100) return { score: explicit, state: "COMPATIBILITY_DERIVED", basis: `Stage 01 hypothesis only; Slice 5 evidence assessment not recorded` };
  return { score: null, state: "NOT_RECORDED", basis: `The niche opportunity does not separately record ${key}` };
}
function scoringAssessment(opportunityId: string, assessments: Row[]): NicheScoringAssessment {
  const row = assessments.filter((item) => text(item.opportunity_id) === opportunityId).sort((a, b) => Number(b.scoring_version) - Number(a.scoring_version))[0];
  if (!row) return { contract: "NICHE_SCORING_ASSESSMENT_V1", scoringVersion: 0, evidenceVersion: 0, state: "NOT_ASSESSED", sufficiencyGaps: ["No Slice 5 scoring assessment is recorded"], comparisonEligibility: "RESEARCH_REQUIRED", axes: { marketAttractiveness: { score: null, state: "NOT_RECORDED", basis: "Awaiting evidence-bound Slice 5 assessment" }, abilityToWin: { score: null, state: "NOT_RECORDED", basis: "Awaiting evidence-bound Slice 5 assessment" }, evidenceConfidence: { score: null, state: "NOT_RECORDED", basis: "Awaiting evidence-bound Slice 5 assessment" } }, prerequisites: [], winningCriteria: [], assessedBy: null, assessedAt: null, rankingMethod: "LEXICOGRAPHIC_THREE_AXIS_NO_TOTAL" };
  const parseConditions = (value: unknown) => { try { return objects(JSON.parse(text(value))).map((item, index) => ({ id: text(item.id) || `condition:${index + 1}`, label: text(item.label), rationale: text(item.basis) || null, status: (["PASS", "GAP"].includes(text(item.status)) ? text(item.status) : "UNKNOWN") as "PASS" | "GAP" | "UNKNOWN", gap: null, closingAction: text(item.closingAction) || null, proofMethod: text(item.proofMethod) || null })); } catch { return []; } };
  const scoredAxis = (score: unknown, basis: unknown): PortfolioAxis => ({ score: numberOrNull(score), state: "RECORDED", basis: text(basis) });
  return { contract: "NICHE_SCORING_ASSESSMENT_V1", scoringVersion: Number(row.scoring_version), evidenceVersion: Number(row.evidence_version), state: text(row.sufficiency_state) === "SUFFICIENT" ? "SUFFICIENT" : "INSUFFICIENT", sufficiencyGaps: parseJsonArray(row.sufficiency_gaps_json), comparisonEligibility: text(row.comparison_eligibility) as NicheScoringAssessment["comparisonEligibility"], axes: { marketAttractiveness: scoredAxis(row.market_attractiveness_score, row.market_attractiveness_basis), abilityToWin: scoredAxis(row.ability_to_win_score, row.ability_to_win_basis), evidenceConfidence: scoredAxis(row.evidence_confidence_score, row.evidence_confidence_basis) }, prerequisites: parseConditions(row.prerequisites_json), winningCriteria: parseConditions(row.winning_criteria_json), assessedBy: text(row.actor_display_name) || text(row.actor_email) || null, assessedAt: text(row.created_at) || null, rankingMethod: "LEXICOGRAPHIC_THREE_AXIS_NO_TOTAL" };
}
function emptyPriorityFact() {
  return { contract: "NICHE_EXPERT_PRIORITY_V1" as const, state: "NOT_RECORDED" as const, prioritySetId: null, priorityVersion: 0, priority: null, rationale: null, portfolioRationale: null, boundEvidenceVersion: null, boundScoringVersion: null, recordedBy: null, recordedAt: null };
}
function emptySelectionFact() { return { contract: "NICHE_SELECTION_V1" as const, state: "NOT_RECORDED" as const, selectionId: null, selectionVersion: 0, rationale: null, tradeoffs: [] as string[], commitmentConditions: [] as string[], recordedBy: null, recordedAt: null }; }
function emptyCommitmentFact() { return { contract: "NICHE_COMMITMENT_V1" as const, state: "NOT_RECORDED" as const, commitmentId: null, commitmentVersion: 0, governanceOwner: null, rationale: null, riskAcceptance: null, reviewCadenceDays: null, revisitTriggers: [] as string[], committedBy: null, committedAt: null }; }
function emptyActivationFact() { return { contract: "CHANNEL_STRATEGY_ACTIVATION_V1" as const, state: "NOT_ACTIVATED" as const, activationId: null, activationVersion: 0, channelStrategyVersion: 0, owner: null, rationale: null, viewerPromise: null, differentiation: null, audienceFocus: null, contentBoundaries: [] as string[], successMeasures: [] as string[], reviewCadenceDays: null, activatedBy: null, activatedAt: null }; }
function coverage(present: number, expected: number) { return present === 0 ? "MISSING" as const : present >= expected ? "RECORDED" as const : "PARTIAL" as const; }
function condition(item: unknown, id: string): PortfolioCondition | null {
  if (typeof item === "string") return { id, label: item, rationale: null, status: "UNKNOWN", gap: null, closingAction: null, proofMethod: null };
  const source = record(item), label = text(source.label) || text(source.title) || text(source.condition);
  if (!label) return null;
  const rawStatus = text(source.status).toUpperCase();
  return {
    id: text(source.id) || id, label, rationale: text(source.rationale) || null,
    status: rawStatus === "PASS" ? "PASS" : rawStatus === "GAP" ? "GAP" : "UNKNOWN",
    gap: numberOrNull(source.gap), closingAction: text(source.closingAction) || text(source.action) || null,
    proofMethod: text(source.proofMethod) || text(source.proof) || null,
  };
}
function conditions(candidate: Row, kind: "PREREQUISITE" | "WINNING_CRITERION") {
  const direct = kind === "PREREQUISITE" ? candidate.prerequisites : candidate.winningCriteria;
  const combined = Array.isArray(direct) ? direct : objects(candidate.winConditions).filter((item) => text(item.kind) === kind);
  return (Array.isArray(combined) ? combined : []).map((item, index) => condition(item, `${kind.toLowerCase()}:${index + 1}`)).filter((item): item is PortfolioCondition => Boolean(item));
}
function audience(source: Row): PortfolioAudience {
  return {
    label: text(source.label) || text(source.segment) || text(source.title) || "Unlabelled audience segment",
    characteristics: strings(source.characteristics), needs: strings(source.needs), preferences: strings(source.preferences), pains: strings(source.pains),
    jobsToBeDone: strings(source.jobsToBeDone), tensions: unique([...strings(source.tensions), ...strings(source.tension)]),
  };
}
function competitor(source: Row): PortfolioCompetitor {
  return {
    name: text(source.name) || text(source.title) || "Unlabelled competitor",
    strengths: strings(source.strengths), weaknesses: strings(source.weaknesses), defensibility: strings(source.defensibility),
    contentAdvantages: strings(source.contentAdvantages), exploitableGaps: unique([...strings(source.exploitableGaps), ...strings(source.gaps)]),
  };
}
function marketSignals(candidate: Row, stage01: Row) {
  const potential = record(candidate.marketPotential);
  return {
    thesis: text(potential.thesis) || text(stage01.channelThesis) || null,
    targetMarket: text(potential.targetMarket) || text(stage01.targetMarket) || null,
    demandSignals: unique([...strings(potential.demandSignals), ...strings(candidate.demandSignals)]),
    growthSignals: unique([...strings(potential.growthSignals), ...strings(candidate.growthSignals)]),
    monetizationPaths: unique([...strings(potential.monetizationPaths), ...strings(candidate.monetizationPaths)]),
    saturationRisks: unique([...strings(potential.saturationRisks), ...strings(candidate.saturationRisks)]),
    geographyAndLanguage: unique([...strings(potential.geographyAndLanguage), text(stage01.targetMarket), text(stage01.targetLanguage)]),
  };
}
function isTypedNicheOpportunity(candidate: Row, stage01: Row) {
  const potential = record(candidate.marketPotential);
  const audiences = objects(candidate.audienceSegments);
  const hasRecurringNeed = audiences.some((item) => strings(item.needs).length || strings(item.pains).length || strings(item.jobsToBeDone).length);
  const hasContentTerritory = strings(candidate.contentTerritories).length || strings(candidate.contentPillars).length;
  return text(candidate.entityType) === "NICHE_OPPORTUNITY"
    && Boolean(text(candidate.title) && (text(potential.targetMarket) || text(stage01.targetMarket)) && text(candidate.viewerPromise))
    && audiences.length > 0 && hasRecurringNeed && Boolean(hasContentTerritory);
}

export async function nichePortfolioProjection(channelId?: string | null, databaseOverride?: DB): Promise<NichePortfolioProjection> {
  const db = databaseOverride || await database();
  const channelRows = await rows(db, "SELECT id,name,market,language,created_at FROM channels ORDER BY created_at,id");
  if (channelId && !channelRows.some((channel) => text(channel.id) === channelId)) throw new ChannelNotFoundError(`Channel ${channelId} does not exist`);
  const selectedChannels = channelId ? channelRows.filter((channel) => text(channel.id) === channelId) : channelRows;
  const allPrograms = await rows(db, "SELECT id,channel_id,version,status,updated_at FROM v7_program_contracts ORDER BY updated_at DESC,id");
  const latestPrograms = new Map<string, Row>();
  for (const program of allPrograms) if (!latestPrograms.has(text(program.channel_id))) latestPrograms.set(text(program.channel_id), program);
  const programs = selectedChannels.map((channel) => latestPrograms.get(text(channel.id))).filter((item): item is Row => Boolean(item));
  const programIds = programs.map((program) => text(program.id));
  const placeholders = programIds.map(() => "?").join(",");
  const [artifacts, sources, claims, bridgedOpportunities, hypotheses, evidenceEvents, scoringAssessments, prioritySets, priorityItems, selections, commitments, activations] = programIds.length ? await Promise.all([
    rows(db, `SELECT id,program_id,stage_key,lifecycle_state,content_json,updated_at FROM v7_intelligence_artifacts WHERE program_id IN (${placeholders}) ORDER BY updated_at DESC,id`, ...programIds),
    rows(db, `SELECT id,program_id,stage_key,authority_tier,verification_state FROM v7_intelligence_sources WHERE program_id IN (${placeholders})`, ...programIds),
    rows(db, `SELECT id,program_id,risk_level,status FROM v7_claim_nodes WHERE program_id IN (${placeholders})`, ...programIds),
    rows(db, `SELECT id,bridge_run_id,program_id,source_artifact_id,lifecycle_state,content_json,content_hash,created_at FROM niche_intelligence_opportunities WHERE program_id IN (${placeholders}) ORDER BY created_at,id`, ...programIds),
    rows(db, `SELECT * FROM niche_hypotheses WHERE program_id IN (${placeholders}) ORDER BY created_at,id`, ...programIds),
    rows(db, `SELECT * FROM niche_evidence_workflow_events WHERE program_id IN (${placeholders}) ORDER BY evidence_version,id`, ...programIds),
    rows(db, `SELECT * FROM niche_scoring_assessments WHERE program_id IN (${placeholders}) ORDER BY scoring_version,id`, ...programIds),
    rows(db, "SELECT * FROM niche_expert_priority_sets WHERE portfolio_id='CANONICAL_PORTFOLIO' ORDER BY priority_version DESC,id"),
    rows(db, "SELECT * FROM niche_expert_priority_items WHERE portfolio_id='CANONICAL_PORTFOLIO' ORDER BY priority_version,expert_priority,id"),
    rows(db, "SELECT * FROM niche_portfolio_selections WHERE portfolio_id='CANONICAL_PORTFOLIO' ORDER BY selection_version DESC,id"),
    rows(db, "SELECT * FROM niche_portfolio_commitments WHERE portfolio_id='CANONICAL_PORTFOLIO' ORDER BY commitment_version DESC,id"),
    rows(db, "SELECT * FROM channel_strategy_activations WHERE portfolio_id='CANONICAL_PORTFOLIO' ORDER BY activation_version DESC,id"),
  ]) : [[], [], [], [], [], [], [], [], [], [], [], []];

  const comparison: NicheOpportunityProjection[] = [];
  const notes: string[] = [];
  let excludedLegacyContentTopics = 0;
  for (const channel of selectedChannels) {
    const program = latestPrograms.get(text(channel.id));
    if (!program) { notes.push(`Channel ${text(channel.name) || text(channel.id)} has no canonical program.`); continue; }
    const programArtifacts = artifacts.filter((item) => text(item.program_id) === text(program.id));
    const stage01Row = programArtifacts.find((item) => text(item.stage_key) === "01");
    const stage01 = parseArtifact(stage01Row);
    if (!stage01 || !stage01Row) { notes.push(`Channel ${text(channel.name) || text(channel.id)} has no canonical Stage 01 artifact.`); continue; }
    const programSources = sources.filter((item) => text(item.program_id) === text(program.id));
    const verifiedSources = programSources.filter((item) => /VERIFIED|WEB_GROUNDED|CONTROLLED/i.test(text(item.verification_state))).length;
    const primarySources = programSources.filter((item) => text(item.authority_tier) === "TIER_1_PRIMARY").length;
    const unresolvedP0Claims = claims.filter((item) => text(item.program_id) === text(program.id) && text(item.risk_level) === "P0" && !resolvedClaim(item.status)).length;
    const contradictionRows = objects(stage01.contradictions);
    const contradictionsReviewed = stage01.contradictionsReviewed === true || (contradictionRows.length > 0 && contradictionRows.every((item) => resolvedClaim(item.status)));
    excludedLegacyContentTopics += objects(stage01.candidates).length;
    const artifactCandidates = objects(stage01.nicheOpportunities).map((candidate) => ({
      candidate, artifactId: text(stage01Row.id), artifactState: text(stage01Row.lifecycle_state),
    }));
    const bridgeCandidates = bridgedOpportunities
      .filter((item) => text(item.program_id) === text(program.id))
      .map((item) => {
        try {
          const candidate = JSON.parse(text(item.content_json));
          return candidate && typeof candidate === "object" && !Array.isArray(candidate)
            ? { candidate: candidate as Row, artifactId: text(item.source_artifact_id), artifactState: text(item.lifecycle_state) || "FROZEN" }
            : null;
        } catch { return null; }
      })
      .filter((item): item is { candidate: Row; artifactId: string; artifactState: string } => Boolean(item));
    const declaredNicheOpportunities = [...artifactCandidates, ...bridgeCandidates];
    const validNicheOpportunities = declaredNicheOpportunities.filter(({ candidate }) => isTypedNicheOpportunity(candidate, stage01));
    if (validNicheOpportunities.length !== declaredNicheOpportunities.length) notes.push(`Program ${text(program.id)} contains ${declaredNicheOpportunities.length - validNicheOpportunities.length} invalid niche-opportunity record(s); they were excluded fail-closed.`);
    const sortedCandidates = validNicheOpportunities
      .map((item, originalIndex) => ({ ...item, originalIndex }))
      .sort((a, b) => (numberOrNull(nested(b.candidate, "scorecard", "marketAttractiveness", "score")) ?? -1) - (numberOrNull(nested(a.candidate, "scorecard", "marketAttractiveness", "score")) ?? -1) || a.originalIndex - b.originalIndex);
    sortedCandidates.forEach(({ candidate, artifactId, artifactState }, index) => {
      const opportunityId = text(candidate.opportunityId) || text(candidate.id) || `${text(stage01Row.id)}:niche:${index + 1}`;
      const market = marketSignals(candidate, stage01);
      const audiences = objects(candidate.audienceSegments).map(audience);
      const competitors = objects(candidate.competitors).map(competitor);
      const sourcePrerequisites = conditions(candidate, "PREREQUISITE");
      const sourceWinningCriteria = conditions(candidate, "WINNING_CRITERION");
      const compatibilityAxes = {
        marketAttractiveness: axis(candidate, "marketAttractiveness"),
        abilityToWin: axis(candidate, "abilityToWin"),
        evidenceConfidence: axis(candidate, "evidenceConfidence"),
      };
      const researchPlan = record(candidate.researchPlan);
      const plan = {
        supportingQuestions: strings(researchPlan.supportingQuestions), contradictingQuestions: strings(researchPlan.contradictingQuestions), unknownQuestions: strings(researchPlan.unknownQuestions),
        balanced: false,
      };
      plan.balanced = Boolean(plan.supportingQuestions.length && plan.contradictingQuestions.length && plan.unknownQuestions.length);
      const workflow = evidenceWorkflow(opportunityId, evidenceEvents);
      const scoring = scoringAssessment(opportunityId, scoringAssessments);
      const axes = scoring.state === "NOT_ASSESSED" ? compatibilityAxes : scoring.axes;
      const prerequisites = scoring.prerequisites.length ? scoring.prerequisites : sourcePrerequisites;
      const winningCriteria = scoring.winningCriteria.length ? scoring.winningCriteria : sourceWinningCriteria;
      const marketPresence = [market.demandSignals.length, market.growthSignals.length, market.monetizationPaths.length, market.saturationRisks.length].filter(Boolean).length;
      const audiencePresence = audiences.length ? audiences.flatMap((item) => [item.characteristics.length, item.needs.length, item.preferences.length, item.pains.length, item.jobsToBeDone.length, item.tensions.length]).filter(Boolean).length : 0;
      const competitorPresence = competitors.length ? competitors.flatMap((item) => [item.strengths.length, item.weaknesses.length, item.defensibility.length, item.contentAdvantages.length, item.exploitableGaps.length]).filter(Boolean).length : 0;
      const conditionsPresence = Number(prerequisites.length > 0) + Number(winningCriteria.length > 0);
      const axesPresence = Object.values(scoring.axes).filter((item) => item.state === "RECORDED").length;
      const comparable = scoring.state === "SUFFICIENT";
      const eligibility = scoring.comparisonEligibility;
      comparison.push({
        entityType: "NICHE_OPPORTUNITY", provenance: "V2_SYSTEM_DISCOVERY",
        opportunityId, channel: { id: text(channel.id), name: text(channel.name), market: text(channel.market), language: text(channel.language) },
        program: { id: text(program.id), version: Math.max(1, numberOrNull(program.version) ?? 1) }, title: text(candidate.title) || `Unlabelled niche opportunity ${index + 1}`,
        description: text(candidate.description) || null, viewerPromise: text(candidate.viewerPromise) || null, centralQuestion: text(candidate.centralQuestion) || null,
        origin: text(candidate.origin) === "EXPERT_SEEDED" ? "EXPERT_SEEDED" : "SYSTEM_DISCOVERED",
        lifecycleState: comparable ? "COMPARABLE" : "EVIDENCE_GATHERING",
        eligibility, systemRank: null, systemRankBasis: "UNRANKED_PENDING_ASSESSMENT", expertPriority: null,
        expertPriorityBasis: "NOT_RECORDED", expertPriorityFact: emptyPriorityFact(), selectionFact: emptySelectionFact(), commitmentFact: emptyCommitmentFact(), channelStrategyActivationFact: emptyActivationFact(), axes,
        hypothesis: { version: null, rationale: null, audienceAssumptions: [], demandAssumptions: [], knownCompetitors: [], winningThesis: null, submittedBy: null, createdAt: null }, marketPotential: market,
        audiences, competitors, competitorPatterns: strings(candidate.competitorPatterns), competitorGap: text(candidate.competitorGap) || null, prerequisites, winningCriteria,
        risks: strings(candidate.risks), researchPlan: plan,
        evidence: { artifactId, artifactState, verifiedSources, primarySources, unresolvedP0Claims, contradictionsReviewed },
        evidenceWorkflow: workflow, scoringAssessment: scoring,
        coverage: {
          marketPotential: coverage(marketPresence, 4), audience: coverage(audiencePresence, 5), competitor: coverage(competitorPresence, 4),
          conditionsToWin: coverage(conditionsPresence, 2), threeAxisScorecard: coverage(axesPresence, 3),
        },
        allowedNextActions: workflow.state === "NOT_STARTED" ? ["PREPARE_NICHE_RESEARCH_PLAN"] : workflow.state === "PLAN_READY" ? ["REQUEST_NICHE_VALIDATION", "REVISE_NICHE_RESEARCH_PLAN"] : scoring.state === "SUFFICIENT" ? ["COMPARE_PORTFOLIO", "REASSESS_NICHE_SCORING"] : ["RECORD_NICHE_EVIDENCE_REVIEW", "RECORD_NICHE_SCORING_ASSESSMENT", "REVISE_NICHE_RESEARCH_PLAN"],
      });
    });
  }
  for (const hypothesis of hypotheses) {
    const channel = selectedChannels.find((item) => text(item.id) === text(hypothesis.channel_id));
    const program = programs.find((item) => text(item.id) === text(hypothesis.program_id));
    if (!channel || !program) { notes.push(`Expert hypothesis ${text(hypothesis.id)} has an invalid channel/program binding.`); continue; }
    const workflow = evidenceWorkflow(text(hypothesis.id), evidenceEvents);
    const scoring = scoringAssessment(text(hypothesis.id), scoringAssessments);
    const comparable = scoring.state === "SUFFICIENT";
    comparison.push({
      entityType: "NICHE_OPPORTUNITY", provenance: "EXPERT_HYPOTHESIS_APPEND",
      opportunityId: text(hypothesis.id),
      channel: { id: text(channel.id), name: text(channel.name), market: text(channel.market), language: text(channel.language) },
      program: { id: text(program.id), version: Math.max(1, numberOrNull(program.version) ?? 1) },
      title: text(hypothesis.title) || "Unlabelled expert hypothesis", description: text(hypothesis.description) || null,
      viewerPromise: null, centralQuestion: null, origin: "EXPERT_SEEDED", lifecycleState: comparable ? "COMPARABLE" : "EVIDENCE_GATHERING", eligibility: scoring.comparisonEligibility,
      systemRank: null, systemRankBasis: "UNRANKED_PENDING_ASSESSMENT", expertPriority: null, expertPriorityBasis: "NOT_RECORDED", expertPriorityFact: emptyPriorityFact(), selectionFact: emptySelectionFact(), commitmentFact: emptyCommitmentFact(), channelStrategyActivationFact: emptyActivationFact(), axes: scoring.axes,
      hypothesis: {
        version: numberOrNull(hypothesis.hypothesis_version), rationale: text(hypothesis.rationale) || null,
        audienceAssumptions: parseJsonArray(hypothesis.audience_assumptions_json), demandAssumptions: parseJsonArray(hypothesis.demand_assumptions_json),
        knownCompetitors: parseJsonArray(hypothesis.known_competitors_json), winningThesis: text(hypothesis.winning_thesis) || null,
        submittedBy: text(hypothesis.actor_display_name) || text(hypothesis.actor_email) || null, createdAt: text(hypothesis.created_at) || null,
      },
      marketPotential: { thesis: null, targetMarket: null, demandSignals: [], growthSignals: [], monetizationPaths: [], saturationRisks: [], geographyAndLanguage: [] },
      audiences: [], competitors: [], competitorPatterns: [], competitorGap: null, prerequisites: scoring.prerequisites, winningCriteria: scoring.winningCriteria, risks: [],
      researchPlan: { supportingQuestions: [], contradictingQuestions: [], unknownQuestions: [], balanced: false },
      evidence: { artifactId: text(hypothesis.id), artifactState: "HYPOTHESIS_SUBMITTED", verifiedSources: 0, primarySources: 0, unresolvedP0Claims: 0, contradictionsReviewed: false },
      evidenceWorkflow: workflow, scoringAssessment: scoring,
      coverage: { marketPotential: "MISSING", audience: "MISSING", competitor: "MISSING", conditionsToWin: scoring.prerequisites.length && scoring.winningCriteria.length ? "RECORDED" : "MISSING", threeAxisScorecard: scoring.state === "NOT_ASSESSED" ? "MISSING" : "RECORDED" },
      allowedNextActions: workflow.state === "NOT_STARTED" ? ["PREPARE_NICHE_RESEARCH_PLAN"] : workflow.state === "PLAN_READY" ? ["REQUEST_NICHE_VALIDATION", "REVISE_NICHE_RESEARCH_PLAN"] : scoring.state === "SUFFICIENT" ? ["COMPARE_PORTFOLIO", "REASSESS_NICHE_SCORING"] : ["RECORD_NICHE_EVIDENCE_REVIEW", "RECORD_NICHE_SCORING_ASSESSMENT", "REVISE_NICHE_RESEARCH_PLAN"],
    });
  }
  comparison.sort((a, b) => {
    const order = { ELIGIBLE: 0, BLOCKED_BY_PREREQUISITE: 1, RESEARCH_REQUIRED: 2 };
    return order[a.eligibility] - order[b.eligibility]
      || (b.axes.marketAttractiveness.score ?? -1) - (a.axes.marketAttractiveness.score ?? -1)
      || (b.axes.abilityToWin.score ?? -1) - (a.axes.abilityToWin.score ?? -1)
      || (b.axes.evidenceConfidence.score ?? -1) - (a.axes.evidenceConfidence.score ?? -1)
      || a.channel.name.localeCompare(b.channel.name) || (a.systemRank ?? Number.MAX_SAFE_INTEGER) - (b.systemRank ?? Number.MAX_SAFE_INTEGER)
      || (a.hypothesis.version ?? 0) - (b.hypothesis.version ?? 0);
  });
  let evidenceRank = 0;
  for (const item of comparison) if (item.scoringAssessment.state === "SUFFICIENT") { item.systemRank = ++evidenceRank; item.systemRankBasis = "SLICE_5_LEXICOGRAPHIC_EVIDENCE_ORDER"; }
  const comparable = comparison.filter((item) => item.lifecycleState !== "EVIDENCE_GATHERING");
  const latestPrioritySet = prioritySets.sort((a, b) => Number(b.priority_version) - Number(a.priority_version))[0];
  const latestPriorityVersion = Number(latestPrioritySet?.priority_version || 0);
  const latestPriorityItems = latestPrioritySet ? priorityItems.filter((item) => text(item.priority_set_id) === text(latestPrioritySet.id)) : [];
  const currentComparableIds = comparable.map((item) => item.opportunityId).sort();
  const recordedComparableIds = latestPriorityItems.map((item) => text(item.opportunity_id)).sort();
  const membershipCurrent = currentComparableIds.length >= 2 && currentComparableIds.length === recordedComparableIds.length && currentComparableIds.every((id, index) => id === recordedComparableIds[index]);
  const bindingsCurrent = membershipCurrent && latestPriorityItems.every((priority) => {
    const opportunity = comparison.find((item) => item.opportunityId === text(priority.opportunity_id));
    return opportunity && opportunity.program.id === text(priority.program_id) && opportunity.program.version === Number(priority.aggregate_version)
      && opportunity.scoringAssessment.evidenceVersion === Number(priority.evidence_version) && opportunity.scoringAssessment.scoringVersion === Number(priority.scoring_version);
  });
  const prioritySetActive = Boolean(latestPrioritySet && bindingsCurrent);
  for (const priority of latestPriorityItems) {
    const opportunity = comparison.find((item) => item.opportunityId === text(priority.opportunity_id)); if (!opportunity) continue;
    opportunity.expertPriority = Number(priority.expert_priority);
    opportunity.expertPriorityBasis = prioritySetActive ? "SLICE_6_VERSIONED_FACT" : "STALE_VERSIONED_FACT";
    opportunity.expertPriorityFact = { contract: "NICHE_EXPERT_PRIORITY_V1", state: prioritySetActive ? "ACTIVE" : "STALE", prioritySetId: text(latestPrioritySet.id), priorityVersion: latestPriorityVersion, priority: Number(priority.expert_priority), rationale: text(priority.rationale) || null, portfolioRationale: text(latestPrioritySet.portfolio_rationale) || null, boundEvidenceVersion: Number(priority.evidence_version), boundScoringVersion: Number(priority.scoring_version), recordedBy: text(latestPrioritySet.actor_display_name) || text(latestPrioritySet.actor_email) || null, recordedAt: text(latestPrioritySet.created_at) || null };
    if (prioritySetActive && opportunity.scoringAssessment.state === "SUFFICIENT") opportunity.lifecycleState = "EXPERT_PRIORITIZED";
  }
  for (const opportunity of comparable) if (!opportunity.allowedNextActions.includes("SET_NICHE_PRIORITY")) opportunity.allowedNextActions.push("SET_NICHE_PRIORITY");
  const prioritiesRecorded = prioritySetActive && comparable.every((item) => item.expertPriorityFact.state === "ACTIVE");
  const comparableSetHash = await sha256(JSON.stringify([...comparable].sort((a, b) => a.opportunityId.localeCompare(b.opportunityId)).map((item) => ({ opportunityId: item.opportunityId, channelId: item.channel.id, programId: item.program.id, aggregateVersion: item.program.version, evidenceVersion: item.scoringAssessment.evidenceVersion, scoringVersion: item.scoringAssessment.scoringVersion, eligibility: item.eligibility, marketAttractiveness: item.axes.marketAttractiveness.score, abilityToWin: item.axes.abilityToWin.score, evidenceConfidence: item.axes.evidenceConfidence.score }))));
  const priorityWorkspace = {
    contract: "NICHE_EXPERT_PRIORITY_V1" as const,
    state: comparable.length < 2 ? "NOT_READY" as const : prioritySetActive ? "ACTIVE" as const : latestPrioritySet ? "STALE" as const : "READY" as const,
    priorityVersion: latestPriorityVersion, comparableSetHash, comparableCount: comparable.length, prioritizedCount: prioritySetActive ? latestPriorityItems.length : 0,
    portfolioRationale: text(latestPrioritySet?.portfolio_rationale) || null, recordedBy: text(latestPrioritySet?.actor_display_name) || text(latestPrioritySet?.actor_email) || null, recordedAt: text(latestPrioritySet?.created_at) || null,
    reason: comparable.length < 2 ? "At least two evidence-sufficient opportunities are required." : prioritySetActive ? "The expert-priority set is bound to the current Slice 5 comparable portfolio." : latestPrioritySet ? "The comparable set or a bound Slice 5 version changed; record a new priority version." : "The comparable portfolio is ready for an independent expert-priority ordering.",
  };
  const latestSelection = selections.sort((a, b) => Number(b.selection_version) - Number(a.selection_version))[0];
  const selectedOpportunity = latestSelection ? comparison.find((item) => item.opportunityId === text(latestSelection.opportunity_id)) : undefined;
  const selectionActive = Boolean(latestSelection && prioritySetActive && selectedOpportunity && selectedOpportunity.eligibility === "ELIGIBLE"
    && text(latestSelection.priority_set_id) === text(latestPrioritySet?.id) && Number(latestSelection.priority_version) === latestPriorityVersion
    && text(latestSelection.comparable_set_hash) === comparableSetHash && selectedOpportunity.program.version === Number(latestSelection.aggregate_version)
    && selectedOpportunity.scoringAssessment.evidenceVersion === Number(latestSelection.evidence_version) && selectedOpportunity.scoringAssessment.scoringVersion === Number(latestSelection.scoring_version));
  if (selectedOpportunity && latestSelection) {
    selectedOpportunity.selectionFact = { contract: "NICHE_SELECTION_V1", state: selectionActive ? "ACTIVE" : "STALE", selectionId: text(latestSelection.id), selectionVersion: Number(latestSelection.selection_version), rationale: text(latestSelection.rationale) || null, tradeoffs: parseJsonArray(latestSelection.tradeoffs_json), commitmentConditions: parseJsonArray(latestSelection.commitment_conditions_json), recordedBy: text(latestSelection.actor_display_name) || text(latestSelection.actor_email) || null, recordedAt: text(latestSelection.created_at) || null };
    if (selectionActive) { selectedOpportunity.lifecycleState = "SELECTED_PENDING_COMMITMENT"; selectedOpportunity.allowedNextActions.push("COMMIT_NICHE"); }
  }
  const latestCommitment = commitments.sort((a, b) => Number(b.commitment_version) - Number(a.commitment_version))[0];
  const committedOpportunity = latestCommitment ? comparison.find((item) => item.opportunityId === text(latestCommitment.opportunity_id)) : undefined;
  const commitmentActive = Boolean(latestCommitment && selectionActive && committedOpportunity && text(latestCommitment.selection_id) === text(latestSelection?.id)
    && Number(latestCommitment.selection_version) === Number(latestSelection?.selection_version) && text(latestCommitment.priority_set_id) === text(latestPrioritySet?.id)
    && Number(latestCommitment.priority_version) === latestPriorityVersion && text(latestCommitment.comparable_set_hash) === comparableSetHash
    && committedOpportunity.program.version === Number(latestCommitment.aggregate_version) && committedOpportunity.scoringAssessment.evidenceVersion === Number(latestCommitment.evidence_version)
    && committedOpportunity.scoringAssessment.scoringVersion === Number(latestCommitment.scoring_version));
  if (committedOpportunity && latestCommitment) {
    committedOpportunity.commitmentFact = { contract: "NICHE_COMMITMENT_V1", state: commitmentActive ? "ACTIVE" : "STALE", commitmentId: text(latestCommitment.id), commitmentVersion: Number(latestCommitment.commitment_version), governanceOwner: text(latestCommitment.governance_owner) || null, rationale: text(latestCommitment.rationale) || null, riskAcceptance: text(latestCommitment.risk_acceptance) || null, reviewCadenceDays: Number(latestCommitment.review_cadence_days) || null, revisitTriggers: parseJsonArray(latestCommitment.revisit_triggers_json), committedBy: text(latestCommitment.actor_display_name) || text(latestCommitment.actor_email) || null, committedAt: text(latestCommitment.created_at) || null };
    if (commitmentActive) { committedOpportunity.lifecycleState = "COMMITTED"; committedOpportunity.allowedNextActions = committedOpportunity.allowedNextActions.filter((action) => action !== "COMMIT_NICHE"); }
  }
  const selectionVersion = Number(latestSelection?.selection_version || 0), commitmentVersion = Number(latestCommitment?.commitment_version || 0);
  const governanceWorkspace = {
    contract: "NICHE_COMMITMENT_GOVERNANCE_V1" as const,
    state: !prioritySetActive ? (latestSelection || latestCommitment ? "STALE" as const : "PRIORITY_REQUIRED" as const) : commitmentActive ? "COMMITTED" as const : selectionActive ? "SELECTED_PENDING_COMMITMENT" as const : latestSelection || latestCommitment ? "STALE" as const : "READY_FOR_SELECTION" as const,
    selectionVersion, commitmentVersion, selectedOpportunityId: latestSelection ? text(latestSelection.opportunity_id) : null, selectionId: latestSelection ? text(latestSelection.id) : null,
    committedOpportunityId: latestCommitment ? text(latestCommitment.opportunity_id) : null, commitmentId: latestCommitment ? text(latestCommitment.id) : null,
    reason: !prioritySetActive ? "An active Slice 6 priority set is required." : commitmentActive ? "The explicit commitment is current. Channel Strategy remains blocked until Slice 8 activation." : selectionActive ? "The selected niche is pending an explicit governance commitment." : latestSelection || latestCommitment ? "Upstream priority, evidence or scoring changed; record a new selection before commitment." : "The active expert-priority portfolio is ready for a separate niche selection.",
  };
  const latestActivation = activations.sort((a, b) => Number(b.activation_version) - Number(a.activation_version))[0];
  const activatedOpportunity = latestActivation ? comparison.find((item) => item.opportunityId === text(latestActivation.opportunity_id)) : undefined;
  const activationActive = Boolean(latestActivation && commitmentActive && activatedOpportunity && text(latestActivation.commitment_id) === text(latestCommitment?.id)
    && Number(latestActivation.commitment_version) === commitmentVersion && text(latestActivation.selection_id) === text(latestSelection?.id)
    && Number(latestActivation.selection_version) === selectionVersion && text(latestActivation.priority_set_id) === text(latestPrioritySet?.id)
    && Number(latestActivation.priority_version) === latestPriorityVersion && text(latestActivation.comparable_set_hash) === comparableSetHash
    && activatedOpportunity.program.version === Number(latestActivation.aggregate_version) && activatedOpportunity.scoringAssessment.evidenceVersion === Number(latestActivation.evidence_version)
    && activatedOpportunity.scoringAssessment.scoringVersion === Number(latestActivation.scoring_version));
  if (activatedOpportunity && latestActivation) {
    activatedOpportunity.channelStrategyActivationFact = { contract: "CHANNEL_STRATEGY_ACTIVATION_V1", state: activationActive ? "ACTIVE" : "STALE", activationId: text(latestActivation.id), activationVersion: Number(latestActivation.activation_version), channelStrategyVersion: Number(latestActivation.channel_strategy_version), owner: text(latestActivation.strategy_owner) || null, rationale: text(latestActivation.rationale) || null, viewerPromise: text(latestActivation.viewer_promise) || null, differentiation: text(latestActivation.differentiation) || null, audienceFocus: text(latestActivation.audience_focus) || null, contentBoundaries: parseJsonArray(latestActivation.content_boundaries_json), successMeasures: parseJsonArray(latestActivation.success_measures_json), reviewCadenceDays: Number(latestActivation.review_cadence_days) || null, activatedBy: text(latestActivation.actor_display_name) || text(latestActivation.actor_email) || null, activatedAt: text(latestActivation.created_at) || null };
    if (activationActive) { activatedOpportunity.lifecycleState = "CHANNEL_STRATEGY_ACTIVATED"; activatedOpportunity.allowedNextActions = activatedOpportunity.allowedNextActions.filter((action) => action !== "ACTIVATE_CHANNEL_STRATEGY"); }
  }
  if (commitmentActive && committedOpportunity && !activationActive) committedOpportunity.allowedNextActions.push("ACTIVATE_CHANNEL_STRATEGY");
  const activationVersion = Number(latestActivation?.activation_version || 0), channelStrategyVersion = activations.filter((item) => text(item.channel_id) === text(latestCommitment?.channel_id)).reduce((latest, item) => Math.max(latest, Number(item.channel_strategy_version || 0)), 0);
  const activationWorkspace = { contract: "CHANNEL_STRATEGY_ACTIVATION_V1" as const, state: activationActive ? "ACTIVE" as const : latestActivation ? "STALE" as const : commitmentActive ? "READY_FOR_ACTIVATION" as const : "COMMITMENT_REQUIRED" as const, activationVersion, channelStrategyVersion, commitmentId: latestCommitment ? text(latestCommitment.id) : null, commitmentVersion, channelId: latestCommitment ? text(latestCommitment.channel_id) : null, opportunityId: latestCommitment ? text(latestCommitment.opportunity_id) : null, activationId: latestActivation ? text(latestActivation.id) : null, reason: activationActive ? "The canonical Channel Strategy binding is active and version-bound to the current commitment." : latestActivation ? "The activation is stale against current upstream facts; activate a new version after recommitment." : commitmentActive ? "The active commitment is ready for a separate Channel Strategy activation." : "An active Slice 7 commitment is required before activation." };
  return {
    contract: "NICHE_PORTFOLIO_PROJECTION_V2", policyVersion: NICHE_OPPORTUNITY_POLICY_VERSION, generatedAt: new Date().toISOString(),
    sourceState: "NICHE_OPPORTUNITY_ONLY_WITH_EXPERT_HYPOTHESIS_APPEND", scope: { mode: channelId ? "CHANNEL" : "PORTFOLIO", channelId: channelId || null },
    channels: channelRows.map((channel) => ({ id: text(channel.id), name: text(channel.name), market: text(channel.market), language: text(channel.language) })),
    intakeContexts: programs.map((program) => {
      const channel = selectedChannels.find((item) => text(item.id) === text(program.channel_id));
      const latestHypothesisVersion = hypotheses.filter((item) => text(item.program_id) === text(program.id)).reduce((latest, item) => Math.max(latest, numberOrNull(item.hypothesis_version) ?? 0), 0);
      return { channelId: text(program.channel_id), channelName: text(channel?.name) || text(program.channel_id), programId: text(program.id), aggregateVersion: Math.max(1, numberOrNull(program.version) ?? 1), expectedHypothesisVersion: latestHypothesisVersion };
    }),
    decisionState: activationActive ? "CHANNEL_STRATEGY_ACTIVATED" : latestActivation ? "ACTIVATION_STALE" : commitmentActive ? "NICHE_COMMITTED" : selectionActive ? "SELECTED_PENDING_COMMITMENT" : (latestSelection || latestCommitment) && !selectionActive ? "GOVERNANCE_STALE" : comparable.length < 2 ? "RESEARCH_IN_PROGRESS" : prioritiesRecorded ? "EXPERT_PRIORITIZATION_RECORDED" : latestPrioritySet ? "EXPERT_PRIORITIZATION_STALE" : "PORTFOLIO_COMPARABLE",
    summary: {
      opportunities: comparison.length, comparable: comparable.length, prioritized: prioritySetActive ? latestPriorityItems.length : 0, priorityVersion: latestPriorityVersion, selected: selectionActive ? 1 : 0, selectionVersion, committed: commitmentActive ? 1 : 0, commitmentVersion, activated: activationActive ? 1 : 0, activationVersion, eligible: comparison.filter((item) => item.eligibility === "ELIGIBLE").length,
      blockedByPrerequisite: comparison.filter((item) => item.eligibility === "BLOCKED_BY_PREREQUISITE").length,
      researchRequired: comparison.filter((item) => item.eligibility === "RESEARCH_REQUIRED").length, expertSeeded: comparison.filter((item) => item.origin === "EXPERT_SEEDED").length,
      researchPlans: comparison.filter((item) => item.evidenceWorkflow.plan).length,
      validationApprovals: comparison.filter((item) => item.evidenceWorkflow.validation).length,
      evidenceReviewed: comparison.filter((item) => item.evidenceWorkflow.reviews.length).length,
      scoringAssessments: comparison.filter((item) => item.scoringAssessment.state !== "NOT_ASSESSED").length,
      excludedLegacyContentTopics,
    }, comparison, priorityWorkspace, governanceWorkspace, activationWorkspace,
    rankingPolicy: { systemRank: "SLICE_5_LEXICOGRAPHIC_THREE_AXIS_EVIDENCE_ORDER", expertPriority: "SEPARATE_VERSIONED_FACT", totalScore: null, note: "Eligible and prerequisite-blocked niches are ordered by eligibility tier, then Market Attractiveness, Ability to Win and Evidence Confidence. No aggregate score is calculated." },
    authority: { activation: "FULL_NICHE_DECISION_TO_CHANNEL_STRATEGY", v2Commands: "SLICE_3_TO_8_ROUTED_ZERO_SPEND", providerRequests: 0, spendUsd: 0, hypothesisAppend: true, researchPlanning: true, validationApproval: true, evidenceReview: true, scoringAssessment: true, comparisonMutation: true, expertPriorityMutation: true, systemRankMutation: false, axisMutation: false, evidenceSufficiencyMutation: false, eligibilityMutation: false, nicheSelection: true, nicheCommitment: true, legacyChannelNicheMutation: false, channelStrategyBindingMutation: true, channelStrategyActivation: true },
    downstreamGate: { consumer: "CHANNEL_STRATEGY", state: activationActive ? "ACTIVATED" : latestActivation ? "STALE" : "BLOCKED", reason: activationActive ? "Slice 8 activated the canonical Channel Strategy binding from the current committed niche." : commitmentActive ? "The current commitment is ready for explicit Slice 8 activation." : "Explicit selection and commitment are required before Channel Strategy activation." },
    integrity: { state: notes.length ? "RECONCILIATION_REQUIRED" : "READY", notes },
  };
}
