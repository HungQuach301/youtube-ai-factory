export const NICHE_OPPORTUNITY_PORTFOLIO_VERSION = "NICHE_OPPORTUNITY_PORTFOLIO_V2" as const;
export const NICHE_OPPORTUNITY_POLICY_VERSION = "NICHE_OPPORTUNITY_POLICY_V2" as const;

export type HypothesisOrigin = "SYSTEM_DISCOVERED" | "EXPERT_SEEDED";
export type EvidenceDirection = "SUPPORTS" | "CONTRADICTS" | "UNKNOWN";
export type OpportunityState =
  | "DISCOVERED"
  | "EVIDENCE_GATHERING"
  | "COMPARABLE"
  | "EXPERT_PRIORITIZED"
  | "SELECTED_PENDING_COMMITMENT"
  | "COMMITTED";

export type NicheHypothesis = {
  hypothesisId: string;
  portfolioId: string;
  version: number;
  origin: HypothesisOrigin;
  title: string;
  description: string;
  submittedBy: string;
  rationale: string;
  audienceAssumptions: string[];
  demandAssumptions: string[];
  knownCompetitors: string[];
  winningThesis: string;
  createdAt: string;
};

export type ResearchPlan = {
  planId: string;
  version: number;
  supportingQuestions: string[];
  contradictingQuestions: string[];
  unknownQuestions: string[];
  sourceClasses: string[];
};

export type EvidenceClaim = {
  claimId: string;
  claimType:
    | "MARKET_DEMAND"
    | "MARKET_TREND"
    | "AUDIENCE_NEED"
    | "AUDIENCE_PAIN"
    | "AUDIENCE_PREFERENCE"
    | "COMPETITOR_STRENGTH"
    | "CONTENT_SATURATION"
    | "UNSERVED_GAP"
    | "MONETIZATION"
    | "PRODUCTION_FEASIBILITY"
    | "WIN_CONDITION";
  statement: string;
  direction: EvidenceDirection;
  sourceRefs: string[];
  sourceAuthority: "PRIMARY" | "SECONDARY" | "INFERRED";
  observedAt: string;
  freshness: "CURRENT" | "AGING" | "EXPIRED";
  confidence: number;
  verificationState: "UNREVIEWED" | "VERIFIED" | "DISPUTED";
  affectedAxis: "MARKET_ATTRACTIVENESS" | "ABILITY_TO_WIN" | "EVIDENCE_CONFIDENCE";
};

export type MarketPotentialProfile = {
  demandSignals: string[];
  growthSignals: string[];
  monetizationPaths: string[];
  saturationRisks: string[];
  geographyAndLanguage: string[];
  evidenceClaimIds: string[];
};

export type AudienceSegmentProfile = {
  segmentId: string;
  label: string;
  characteristics: string[];
  needs: string[];
  preferences: string[];
  pains: string[];
  jobsToBeDone: string[];
  evidenceClaimIds: string[];
};

export type CompetitorProfile = {
  competitorId: string;
  name: string;
  strengths: string[];
  weaknesses: string[];
  defensibility: string[];
  contentAdvantages: string[];
  exploitableGaps: string[];
  evidenceClaimIds: string[];
};

export type CapabilityProfile = {
  capabilityId: string;
  label: string;
  currentLevel: number;
  evidence: string[];
  owner: string;
};

export type WinCondition = {
  conditionId: string;
  kind: "PREREQUISITE" | "WINNING_CRITERION";
  label: string;
  rationale: string;
  requiredLevel: number;
  currentCapabilityLevel: number;
  gap: number;
  status: "PASS" | "GAP" | "UNKNOWN";
  evidenceClaimIds: string[];
  capabilityId: string;
  closingAction: string;
  estimatedTimeDays: number;
  estimatedCostUsd: number;
  proofMethod: string;
};

export type ScoreAxis = {
  score: number;
  rationale: string;
  evidenceClaimIds: string[];
};

export type NicheScorecard = {
  marketAttractiveness: ScoreAxis;
  abilityToWin: ScoreAxis;
  evidenceConfidence: ScoreAxis;
};

export type ExpertPriority = {
  priority: number;
  actorRole: "OWNER_EXPERT";
  rationale: string;
  recordedAt: string;
} | null;

export type NicheOpportunity = {
  opportunityId: string;
  portfolioId: string;
  version: number;
  state: OpportunityState;
  hypothesis: NicheHypothesis;
  researchPlan: ResearchPlan;
  evidenceClaims: EvidenceClaim[];
  marketPotential: MarketPotentialProfile;
  audiences: AudienceSegmentProfile[];
  competitors: CompetitorProfile[];
  capabilityProfile: CapabilityProfile[];
  winConditions: WinCondition[];
  scorecard: NicheScorecard;
  expertPriority: ExpertPriority;
};

export type NichePortfolioInput = {
  portfolioId: string;
  portfolioVersion: number;
  policyVersion: typeof NICHE_OPPORTUNITY_POLICY_VERSION;
  opportunities: NicheOpportunity[];
};

export type NicheCommand =
  | "SUBMIT_NICHE_HYPOTHESIS"
  | "PREPARE_NICHE_RESEARCH_PLAN"
  | "REQUEST_NICHE_VALIDATION"
  | "RECORD_EVIDENCE_REVIEW"
  | "SET_NICHE_PRIORITY"
  | "REQUEST_NICHE_PILOT"
  | "SELECT_NICHE_FOR_COMMITMENT"
  | "COMMIT_NICHE"
  | "ACTIVATE_CHANNEL_STRATEGY";

export type NicheCommandContract = {
  command: NicheCommand;
  autonomy: "A1_RECOMMEND" | "A2_APPROVAL_REQUIRED" | "A3_BOUNDED";
  authority: "SYSTEM_WITHIN_POLICY" | "OWNER_EXPERT" | "PORTFOLIO_GOVERNANCE";
  activation: "DECLARED_NOT_ROUTED" | "ROUTED_ZERO_SPEND";
  preconditions: string[];
  ceilings: { maximumLogicalAttempts: number; providerRequests: number; spendUsd: number };
};

export type PortfolioMatrixRow = {
  opportunityId: string;
  title: string;
  origin: HypothesisOrigin;
  lifecycleState: OpportunityState;
  eligibility: "ELIGIBLE" | "BLOCKED_BY_PREREQUISITE" | "RESEARCH_REQUIRED";
  systemRank: number | null;
  expertPriority: number | null;
  marketAttractiveness: number;
  abilityToWin: number;
  evidenceConfidence: number;
  prerequisiteGaps: string[];
  winningCriteria: Array<{ label: string; status: WinCondition["status"]; gap: number; proofMethod: string }>;
  allowedNextActions: string[];
};

export type NichePortfolioResult = {
  contract: typeof NICHE_OPPORTUNITY_PORTFOLIO_VERSION;
  policyVersion: typeof NICHE_OPPORTUNITY_POLICY_VERSION;
  portfolio: { portfolioId: string; version: number };
  decisionState: "CONTRACT_INVALID" | "RESEARCH_IN_PROGRESS" | "PORTFOLIO_COMPARABLE" | "EXPERT_PRIORITIZATION_RECORDED";
  errors: string[];
  comparison: PortfolioMatrixRow[];
  rankingPolicy: {
    method: "ELIGIBILITY_THEN_LEXICOGRAPHIC_AXES";
    axisOrder: ["MARKET_ATTRACTIVENESS", "ABILITY_TO_WIN", "EVIDENCE_CONFIDENCE"];
    totalScore: null;
    note: string;
  };
  commandContracts: NicheCommandContract[];
  downstreamGate: { consumer: "CHANNEL_STRATEGY"; state: "BLOCKED"; reason: string };
  improvement: {
    signals: string[];
    proposalPath: string[];
    expertApprovalRequired: string[];
    automaticPromotion: false;
  };
};

const commandContracts: NicheCommandContract[] = [
  ["SUBMIT_NICHE_HYPOTHESIS", "A2_APPROVAL_REQUIRED", "OWNER_EXPERT", ["Authenticated expert", "Portfolio scope", "Explicit assumptions and winning thesis"]],
  ["PREPARE_NICHE_RESEARCH_PLAN", "A1_RECOMMEND", "SYSTEM_WITHIN_POLICY", ["Canonical hypothesis", "Support, contradiction and unknown questions"]],
  ["REQUEST_NICHE_VALIDATION", "A3_BOUNDED", "OWNER_EXPERT", ["Approved research plan", "Source and spend ceiling", "Idempotency"]],
  ["RECORD_EVIDENCE_REVIEW", "A2_APPROVAL_REQUIRED", "OWNER_EXPERT", ["Immutable evidence claims", "Contradictions visible", "Version binding"]],
  ["SET_NICHE_PRIORITY", "A2_APPROVAL_REQUIRED", "OWNER_EXPERT", ["Comparable portfolio", "Priority rationale", "No implicit selection"]],
  ["REQUEST_NICHE_PILOT", "A2_APPROVAL_REQUIRED", "OWNER_EXPERT", ["Eligible opportunity", "Pilot success criteria", "Bounded budget"]],
  ["SELECT_NICHE_FOR_COMMITMENT", "A2_APPROVAL_REQUIRED", "OWNER_EXPERT", ["Expert priority", "Prerequisites passed", "Current evidence"]],
  ["COMMIT_NICHE", "A2_APPROVAL_REQUIRED", "PORTFOLIO_GOVERNANCE", ["Separate selection record", "Optimistic concurrency", "Audit lineage"]],
  ["ACTIVATE_CHANNEL_STRATEGY", "A2_APPROVAL_REQUIRED", "PORTFOLIO_GOVERNANCE", ["Committed niche", "Separate strategy command", "Version-bound handoff"]],
].map(([command, autonomy, authority, preconditions]) => ({
  command: command as NicheCommand,
  autonomy: autonomy as NicheCommandContract["autonomy"],
  authority: authority as NicheCommandContract["authority"],
  activation: ["SUBMIT_NICHE_HYPOTHESIS", "SELECT_NICHE_FOR_COMMITMENT", "COMMIT_NICHE", "ACTIVATE_CHANNEL_STRATEGY"].includes(String(command)) ? "ROUTED_ZERO_SPEND" as const : "DECLARED_NOT_ROUTED" as const,
  preconditions: preconditions as string[],
  ceilings: { maximumLogicalAttempts: 1, providerRequests: 0, spendUsd: 0 },
}));

const transitions: Record<OpportunityState, OpportunityState[]> = {
  DISCOVERED: ["EVIDENCE_GATHERING"],
  EVIDENCE_GATHERING: ["COMPARABLE"],
  COMPARABLE: ["EVIDENCE_GATHERING", "EXPERT_PRIORITIZED"],
  EXPERT_PRIORITIZED: ["EVIDENCE_GATHERING", "SELECTED_PENDING_COMMITMENT"],
  SELECTED_PENDING_COMMITMENT: ["EXPERT_PRIORITIZED", "COMMITTED"],
  COMMITTED: [],
};

export function isNicheOpportunityTransitionAllowed(from: OpportunityState, to: OpportunityState) {
  return transitions[from].includes(to);
}

function isScore(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

function researchComplete(plan: ResearchPlan) {
  return plan.supportingQuestions.length > 0 && plan.contradictingQuestions.length > 0 && plan.unknownQuestions.length > 0 && plan.sourceClasses.length > 0;
}

function validationErrors(input: NichePortfolioInput) {
  const errors: string[] = [];
  if (!input.portfolioId.trim()) errors.push("PORTFOLIO_ID_REQUIRED");
  if (!Number.isInteger(input.portfolioVersion) || input.portfolioVersion < 1) errors.push("PORTFOLIO_VERSION_INVALID");
  if (input.policyVersion !== NICHE_OPPORTUNITY_POLICY_VERSION) errors.push("POLICY_VERSION_MISMATCH");
  if (new Set(input.opportunities.map((item) => item.opportunityId)).size !== input.opportunities.length) errors.push("DUPLICATE_OPPORTUNITY_ID");

  for (const opportunity of input.opportunities) {
    const prefix = opportunity.opportunityId || "UNKNOWN_OPPORTUNITY";
    if (opportunity.portfolioId !== input.portfolioId || opportunity.hypothesis.portfolioId !== input.portfolioId) errors.push(`${prefix}:CROSS_PORTFOLIO_REFERENCE`);
    if (!opportunity.hypothesis.title.trim() || !opportunity.hypothesis.description.trim() || !opportunity.hypothesis.rationale.trim() || !opportunity.hypothesis.winningThesis.trim()) errors.push(`${prefix}:HYPOTHESIS_INCOMPLETE`);
    if (!researchComplete(opportunity.researchPlan)) errors.push(`${prefix}:BALANCED_RESEARCH_PLAN_REQUIRED`);
    if (!opportunity.marketPotential.demandSignals.length || !opportunity.marketPotential.monetizationPaths.length) errors.push(`${prefix}:MARKET_POTENTIAL_INCOMPLETE`);
    if (!opportunity.audiences.length || opportunity.audiences.some((audience) => !audience.needs.length || !audience.preferences.length || !audience.pains.length)) errors.push(`${prefix}:AUDIENCE_PROFILE_INCOMPLETE`);
    if (!opportunity.competitors.length || opportunity.competitors.some((competitor) => !competitor.strengths.length || !competitor.exploitableGaps.length)) errors.push(`${prefix}:COMPETITOR_PROFILE_INCOMPLETE`);
    if (!opportunity.winConditions.some((condition) => condition.kind === "PREREQUISITE")) errors.push(`${prefix}:PREREQUISITE_REQUIRED`);
    if (!opportunity.winConditions.some((condition) => condition.kind === "WINNING_CRITERION")) errors.push(`${prefix}:WINNING_CRITERION_REQUIRED`);
    for (const condition of opportunity.winConditions) {
      const expectedGap = Math.max(0, condition.requiredLevel - condition.currentCapabilityLevel);
      if (!condition.label.trim() || !condition.rationale.trim() || !condition.proofMethod.trim() || !condition.closingAction.trim()) errors.push(`${prefix}:WIN_CONDITION_INCOMPLETE:${condition.conditionId}`);
      if (condition.gap !== expectedGap) errors.push(`${prefix}:CAPABILITY_GAP_INCONSISTENT:${condition.conditionId}`);
    }
    for (const [axis, value] of Object.entries(opportunity.scorecard)) {
      if (!isScore(value.score) || !value.rationale.trim() || !value.evidenceClaimIds.length) errors.push(`${prefix}:SCORE_AXIS_INVALID:${axis}`);
    }
    if (opportunity.expertPriority && (!Number.isInteger(opportunity.expertPriority.priority) || opportunity.expertPriority.priority < 1 || !opportunity.expertPriority.rationale.trim())) errors.push(`${prefix}:EXPERT_PRIORITY_INVALID`);
  }
  const priorities = input.opportunities.flatMap((item) => item.expertPriority ? [item.expertPriority.priority] : []);
  if (new Set(priorities).size !== priorities.length) errors.push("DUPLICATE_EXPERT_PRIORITY");
  return errors;
}

function eligibility(opportunity: NicheOpportunity): PortfolioMatrixRow["eligibility"] {
  if (!researchComplete(opportunity.researchPlan) || opportunity.scorecard.evidenceConfidence.score < 60 || opportunity.state === "DISCOVERED" || opportunity.state === "EVIDENCE_GATHERING") return "RESEARCH_REQUIRED";
  return opportunity.winConditions.some((condition) => condition.kind === "PREREQUISITE" && condition.status !== "PASS") ? "BLOCKED_BY_PREREQUISITE" : "ELIGIBLE";
}

export function compileNicheOpportunityPortfolio(input: NichePortfolioInput): NichePortfolioResult {
  const errors = validationErrors(input);
  const base = {
    contract: NICHE_OPPORTUNITY_PORTFOLIO_VERSION,
    policyVersion: NICHE_OPPORTUNITY_POLICY_VERSION,
    portfolio: { portfolioId: input.portfolioId, version: input.portfolioVersion },
    rankingPolicy: {
      method: "ELIGIBILITY_THEN_LEXICOGRAPHIC_AXES" as const,
      axisOrder: ["MARKET_ATTRACTIVENESS", "ABILITY_TO_WIN", "EVIDENCE_CONFIDENCE"] as ["MARKET_ATTRACTIVENESS", "ABILITY_TO_WIN", "EVIDENCE_CONFIDENCE"],
      totalScore: null,
      note: "Prerequisites are hard gates. Scores remain separate; no aggregate score can compensate for a failed prerequisite.",
    },
    commandContracts,
    downstreamGate: { consumer: "CHANNEL_STRATEGY" as const, state: "BLOCKED" as const, reason: "Portfolio comparison, expert priority, selection, commitment and strategy activation are separate facts." },
    improvement: {
      signals: ["Expert reprioritization", "Evidence contradiction", "Pilot outcome", "Channel outcome", "Capability-gap closure", "Calibration drift"],
      proposalPath: ["OBSERVE", "QUALIFY", "PROPOSE", "BACKTEST", "SHADOW", "EXPERT_REVIEW", "BOUNDED_CANARY", "RETAIN_OR_ROLLBACK"],
      expertApprovalRequired: ["Weight or threshold change", "Policy promotion", "Niche selection or commitment", "Autonomy or spend expansion"],
      automaticPromotion: false as const,
    },
  };

  if (errors.length) return { ...base, decisionState: "CONTRACT_INVALID", errors, comparison: [] };

  const ordered = [...input.opportunities].sort((a, b) => {
    const eligibilityOrder = { ELIGIBLE: 0, BLOCKED_BY_PREREQUISITE: 1, RESEARCH_REQUIRED: 2 };
    const gate = eligibilityOrder[eligibility(a)] - eligibilityOrder[eligibility(b)];
    if (gate) return gate;
    return b.scorecard.marketAttractiveness.score - a.scorecard.marketAttractiveness.score
      || b.scorecard.abilityToWin.score - a.scorecard.abilityToWin.score
      || b.scorecard.evidenceConfidence.score - a.scorecard.evidenceConfidence.score
      || a.opportunityId.localeCompare(b.opportunityId);
  });
  const comparable = ordered.filter((item) => eligibility(item) !== "RESEARCH_REQUIRED");
  const comparison = ordered.map((opportunity) => {
    const itemEligibility = eligibility(opportunity);
    const rank = comparable.findIndex((item) => item.opportunityId === opportunity.opportunityId);
    const prerequisiteGaps = opportunity.winConditions.filter((condition) => condition.kind === "PREREQUISITE" && condition.status !== "PASS").map((condition) => condition.label);
    const allowedNextActions = itemEligibility === "RESEARCH_REQUIRED"
      ? ["PREPARE_NICHE_RESEARCH_PLAN", "REQUEST_NICHE_VALIDATION"]
      : itemEligibility === "BLOCKED_BY_PREREQUISITE"
        ? ["REVIEW_CAPABILITY_GAPS", "REQUEST_NICHE_PILOT"]
        : ["SET_NICHE_PRIORITY", "REQUEST_NICHE_PILOT"];
    return {
      opportunityId: opportunity.opportunityId,
      title: opportunity.hypothesis.title,
      origin: opportunity.hypothesis.origin,
      lifecycleState: opportunity.state,
      eligibility: itemEligibility,
      systemRank: rank >= 0 ? rank + 1 : null,
      expertPriority: opportunity.expertPriority?.priority ?? null,
      marketAttractiveness: opportunity.scorecard.marketAttractiveness.score,
      abilityToWin: opportunity.scorecard.abilityToWin.score,
      evidenceConfidence: opportunity.scorecard.evidenceConfidence.score,
      prerequisiteGaps,
      winningCriteria: opportunity.winConditions.filter((condition) => condition.kind === "WINNING_CRITERION").map((condition) => ({ label: condition.label, status: condition.status, gap: condition.gap, proofMethod: condition.proofMethod })),
      allowedNextActions,
    } satisfies PortfolioMatrixRow;
  });

  const hasPortfolio = comparable.length >= 2;
  const prioritiesRecorded = hasPortfolio && comparable.every((item) => item.expertPriority !== null);
  return {
    ...base,
    decisionState: !hasPortfolio ? "RESEARCH_IN_PROGRESS" : prioritiesRecorded ? "EXPERT_PRIORITIZATION_RECORDED" : "PORTFOLIO_COMPARABLE",
    errors: [],
    comparison,
  };
}
