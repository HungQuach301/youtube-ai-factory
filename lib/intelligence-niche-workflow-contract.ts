export const INTELLIGENCE_NICHE_WORKFLOW_VERSION = "INTELLIGENCE_NICHE_WORKFLOW_V1" as const;
export const INTELLIGENCE_NICHE_POLICY_VERSION = "INTELLIGENCE_NICHE_POLICY_V1" as const;

export type Candidate = { id: string; version: number; title: string; score: number; evidenceVersion: number };
export type ExpertDecision = {
  decisionId: string; channelId: string; actorRole: "OWNER_EXPERT";
  action: "ACCEPT" | "REJECT" | "REQUEST_MORE_EVIDENCE";
  candidateId: string; candidateVersion: number; evidenceVersion: number; decidedAt: string; rationale: string;
  reusableAsset: { type: "RULE" | "RUBRIC_ANCHOR" | "EXAMPLE" | "ANTI_PATTERN" | "EXCEPTION_PATTERN"; summary: string };
};
export type IntelligenceNicheWorkflowInput = {
  portfolioId: string; channelId: string; aggregateVersion: number; currentNiche: string | null; researchChampionId: string | null;
  candidates: Candidate[];
  evidence: { version: number; marketArtifactState: "FROZEN" | "DRAFT" | "MISSING"; verifiedSources: number; primarySources: number; unresolvedP0Claims: number; contradictionsReviewed: boolean };
  expertDecision: ExpertDecision | null;
};
type CommandContract = {
  command: "REQUEST_EVIDENCE_REFRESH" | "SUBMIT_EXPERT_DECISION" | "PROPOSE_POLICY_IMPROVEMENT" | "PROMOTE_POLICY_VERSION";
  autonomy: "A1_RECOMMEND" | "A2_APPROVAL_REQUIRED" | "A3_BOUNDED";
  authority: "SYSTEM_WITHIN_POLICY" | "OWNER_EXPERT" | "EXPERT_AND_ENGINEERING";
  activation: "DECLARED_NOT_ROUTED";
  preconditions: string[];
  ceilings: { maximumLogicalAttempts: number; providerRequests: number; spendUsd: number };
};
export type IntelligenceNicheWorkflowResult = {
  contract: typeof INTELLIGENCE_NICHE_WORKFLOW_VERSION; policyVersion: typeof INTELLIGENCE_NICHE_POLICY_VERSION;
  aggregate: { portfolioId: string; channelId: string; version: number };
  state: "CONTRACT_INVALID" | "INSUFFICIENT_EVIDENCE" | "EXPERT_DECISION_REQUIRED" | "MORE_EVIDENCE_REQUIRED" | "NICHE_REJECTED" | "NICHE_ACCEPTED";
  readiness: "FAIL_CLOSED" | "INSUFFICIENT_EVIDENCE" | "EVIDENCE_READY_EXPERT_DECISION_REQUIRED" | "EXPERT_DECIDED";
  recommendation: { candidateId: string; candidateVersion: number; title: string; score: number } | null;
  commitment: { niche: string; decisionId: string; decisionVersion: number } | null;
  errors: string[]; allowedNextActions: string[];
  downstreamGate: { consumer: "CHANNEL_STRATEGY"; state: "BLOCKED" | "READY_FOR_TYPED_HANDOFF"; reason: string; handoffId: string | null };
  commandContracts: CommandContract[];
  controls: { prevent: string[]; detect: string[]; contain: string[] };
  improvement: { signals: string[]; automaticallyProposed: string[]; expertApprovalRequired: string[]; promotionPath: string[]; automaticDemotionTriggers: string[] };
};

const commandContracts: CommandContract[] = [
  { command: "REQUEST_EVIDENCE_REFRESH", autonomy: "A3_BOUNDED", authority: "SYSTEM_WITHIN_POLICY", activation: "DECLARED_NOT_ROUTED", preconditions: ["Canonical channel scope", "Expired, missing or contradictory evidence", "No active logical refresh"], ceilings: { maximumLogicalAttempts: 1, providerRequests: 0, spendUsd: 0 } },
  { command: "SUBMIT_EXPERT_DECISION", autonomy: "A2_APPROVAL_REQUIRED", authority: "OWNER_EXPERT", activation: "DECLARED_NOT_ROUTED", preconditions: ["Evidence-ready candidate", "Matching aggregate, candidate and evidence versions", "Reusable expert knowledge asset"], ceilings: { maximumLogicalAttempts: 1, providerRequests: 0, spendUsd: 0 } },
  { command: "PROPOSE_POLICY_IMPROVEMENT", autonomy: "A1_RECOMMEND", authority: "SYSTEM_WITHIN_POLICY", activation: "DECLARED_NOT_ROUTED", preconditions: ["Immutable learning record", "Qualified trigger", "Affected and unaffected scope"], ceilings: { maximumLogicalAttempts: 1, providerRequests: 0, spendUsd: 0 } },
  { command: "PROMOTE_POLICY_VERSION", autonomy: "A2_APPROVAL_REQUIRED", authority: "EXPERT_AND_ENGINEERING", activation: "DECLARED_NOT_ROUTED", preconditions: ["Representative backtest", "Shadow evidence", "Rollback target", "Explicit approval"], ceilings: { maximumLogicalAttempts: 1, providerRequests: 0, spendUsd: 0 } },
];

function base(input: IntelligenceNicheWorkflowInput) {
  return {
    contract: INTELLIGENCE_NICHE_WORKFLOW_VERSION,
    policyVersion: INTELLIGENCE_NICHE_POLICY_VERSION,
    aggregate: { portfolioId: input.portfolioId, channelId: input.channelId, version: input.aggregateVersion },
    commandContracts,
    controls: {
      prevent: ["Canonical portfolio/channel/candidate IDs", "Version-bound evidence and expert decision", "No implicit commitment from ranking"],
      detect: ["Evidence coverage and primary-source floors", "P0 and contradiction checks", "Stale or cross-channel decision detection"],
      contain: ["Fail-closed invalid state", "Owner/expert commitment gate", "Downstream Channel Strategy handoff blocked until accepted"],
    },
    improvement: {
      signals: ["Evidence expiry", "Expert override", "Decision reversal", "Calibration drift", "Observed niche outcome"],
      automaticallyProposed: ["Evidence refresh", "Candidate reorder within approved weights", "Rule/rubric/eval candidate"],
      expertApprovalRequired: ["Threshold or weight change", "Niche commitment", "Policy promotion", "Autonomy expansion"],
      promotionPath: ["BACKTEST", "SHADOW", "EXPERT_REVIEW", "BOUNDED_CANARY", "MONITOR", "RETAIN_OR_ROLLBACK"],
      automaticDemotionTriggers: ["Severe evidence defect", "Calibration regression", "Material override increase", "Cross-channel leakage", "Cost anomaly"],
    },
  } as const;
}

function validationErrors(input: IntelligenceNicheWorkflowInput) {
  const errors: string[] = [];
  if (!input.portfolioId.trim()) errors.push("PORTFOLIO_ID_REQUIRED");
  if (!input.channelId.trim()) errors.push("CHANNEL_ID_REQUIRED");
  if (!Number.isInteger(input.aggregateVersion) || input.aggregateVersion < 1) errors.push("AGGREGATE_VERSION_INVALID");
  if (!Number.isInteger(input.evidence.version) || input.evidence.version < 1) errors.push("EVIDENCE_VERSION_INVALID");
  if (new Set(input.candidates.map((candidate) => candidate.id)).size !== input.candidates.length) errors.push("DUPLICATE_CANDIDATE_ID");
  const champion = input.candidates.find((candidate) => candidate.id === input.researchChampionId);
  if (input.researchChampionId && !champion) errors.push("RESEARCH_CHAMPION_NOT_FOUND");
  if (champion && champion.evidenceVersion !== input.evidence.version) errors.push("RESEARCH_CHAMPION_EVIDENCE_STALE");
  const decision = input.expertDecision;
  if (decision) {
    const target = input.candidates.find((candidate) => candidate.id === decision.candidateId);
    if (decision.channelId !== input.channelId) errors.push("CROSS_CHANNEL_DECISION_REJECTED");
    if (!target) errors.push("DECISION_CANDIDATE_NOT_FOUND");
    if (decision.candidateId !== input.researchChampionId) errors.push("DECISION_RESEARCH_CHAMPION_MISMATCH");
    if (target && decision.candidateVersion !== target.version) errors.push("DECISION_CANDIDATE_VERSION_STALE");
    if (decision.evidenceVersion !== input.evidence.version) errors.push("DECISION_EVIDENCE_VERSION_STALE");
    if (!decision.rationale.trim()) errors.push("DECISION_RATIONALE_REQUIRED");
    if (!decision.reusableAsset.summary.trim()) errors.push("REUSABLE_EXPERT_ASSET_REQUIRED");
  }
  return errors;
}

export function compileIntelligenceNicheWorkflow(input: IntelligenceNicheWorkflowInput): IntelligenceNicheWorkflowResult {
  const shared = base(input), errors = validationErrors(input);
  const candidate = input.candidates.find((item) => item.id === input.researchChampionId) || null;
  if (errors.length) return { ...shared, state: "CONTRACT_INVALID", readiness: "FAIL_CLOSED", recommendation: null, commitment: null, errors, allowedNextActions: ["RECONCILE_CANONICAL_STATE"], downstreamGate: { consumer: "CHANNEL_STRATEGY", state: "BLOCKED", reason: errors.join(" | "), handoffId: null } };
  const evidenceReady = Boolean(candidate) && candidate!.score >= 85 && input.evidence.marketArtifactState === "FROZEN" && input.evidence.verifiedSources >= 10 && input.evidence.primarySources >= 3 && input.evidence.unresolvedP0Claims === 0 && input.evidence.contradictionsReviewed;
  const recommendation = candidate ? { candidateId: candidate.id, candidateVersion: candidate.version, title: candidate.title, score: candidate.score } : null;
  if (!evidenceReady) return { ...shared, state: "INSUFFICIENT_EVIDENCE", readiness: "INSUFFICIENT_EVIDENCE", recommendation, commitment: null, errors: [], allowedNextActions: ["REQUEST_BOUNDED_EVIDENCE_REFRESH", "REVIEW_EVIDENCE_GAPS"], downstreamGate: { consumer: "CHANNEL_STRATEGY", state: "BLOCKED", reason: "Evidence readiness contract has not passed", handoffId: null } };
  const decision = input.expertDecision;
  if (!decision) return { ...shared, state: "EXPERT_DECISION_REQUIRED", readiness: "EVIDENCE_READY_EXPERT_DECISION_REQUIRED", recommendation, commitment: null, errors: [], allowedNextActions: ["ACCEPT", "REJECT", "REQUEST_MORE_EVIDENCE"], downstreamGate: { consumer: "CHANNEL_STRATEGY", state: "BLOCKED", reason: "Owner/expert commitment is required", handoffId: null } };
  if (decision.action === "REQUEST_MORE_EVIDENCE") return { ...shared, state: "MORE_EVIDENCE_REQUIRED", readiness: "EXPERT_DECIDED", recommendation, commitment: null, errors: [], allowedNextActions: ["REQUEST_BOUNDED_EVIDENCE_REFRESH"], downstreamGate: { consumer: "CHANNEL_STRATEGY", state: "BLOCKED", reason: "Expert requested more evidence", handoffId: null } };
  if (decision.action === "REJECT") return { ...shared, state: "NICHE_REJECTED", readiness: "EXPERT_DECIDED", recommendation, commitment: null, errors: [], allowedNextActions: ["REVIEW_NEXT_CANDIDATE", "REQUEST_BOUNDED_EVIDENCE_REFRESH"], downstreamGate: { consumer: "CHANNEL_STRATEGY", state: "BLOCKED", reason: "Expert rejected the recommended candidate", handoffId: null } };
  return { ...shared, state: "NICHE_ACCEPTED", readiness: "EXPERT_DECIDED", recommendation, commitment: { niche: candidate!.title, decisionId: decision.decisionId, decisionVersion: input.aggregateVersion }, errors: [], allowedNextActions: ["PREPARE_CHANNEL_STRATEGY_HANDOFF"], downstreamGate: { consumer: "CHANNEL_STRATEGY", state: "READY_FOR_TYPED_HANDOFF", reason: "Evidence-ready niche accepted by owner/expert", handoffId: `${input.channelId}:strategy:${input.aggregateVersion}:${candidate!.id}:v${candidate!.version}:e${input.evidence.version}:${decision.decisionId}` } };
}
