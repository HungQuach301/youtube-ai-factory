export type PortfolioAxis = {
  score: number | null;
  state: "RECORDED" | "COMPATIBILITY_DERIVED" | "NOT_RECORDED";
  basis: string;
};

export type PortfolioCondition = {
  id: string;
  label: string;
  rationale: string | null;
  status: "PASS" | "GAP" | "UNKNOWN";
  gap: number | null;
  closingAction: string | null;
  proofMethod: string | null;
};

export type PortfolioAudience = {
  label: string;
  characteristics: string[];
  needs: string[];
  preferences: string[];
  pains: string[];
  jobsToBeDone: string[];
  tensions: string[];
};

export type PortfolioCompetitor = {
  name: string;
  strengths: string[];
  weaknesses: string[];
  defensibility: string[];
  contentAdvantages: string[];
  exploitableGaps: string[];
};

export type NicheEvidenceReview = {
  eventId: string;
  evidenceVersion: number;
  direction: "SUPPORTS" | "CONTRADICTS" | "UNKNOWN";
  statement: string;
  sourceRef: string;
  sourceAuthority: "PRIMARY" | "SECONDARY" | "EXPERT_OBSERVATION";
  observedAt: string;
  freshness: "CURRENT" | "AGING" | "STALE" | "UNKNOWN";
  confidence: number;
  affectedAxis: "MARKET_ATTRACTIVENESS" | "ABILITY_TO_WIN" | "EVIDENCE_CONFIDENCE" | "PREREQUISITE" | "WINNING_CRITERION";
  disposition: "ACCEPTED" | "REJECTED" | "NEEDS_MORE_RESEARCH";
  decisionImpact: string;
  reviewedBy: string;
  createdAt: string;
};

export type NicheEvidenceWorkflow = {
  contract: "NICHE_EVIDENCE_WORKFLOW_V1";
  evidenceVersion: number;
  state: "NOT_STARTED" | "PLAN_READY" | "VALIDATION_APPROVED" | "EVIDENCE_UNDER_REVIEW";
  plan: null | {
    eventId: string;
    version: number;
    supportingQuestions: string[];
    contradictingQuestions: string[];
    unknownQuestions: string[];
    sourceClasses: string[];
    providerAllowlist: string[];
    maxSources: number;
    maxProviderRequests: number;
    maxSpendUsd: number;
    balanced: true;
    createdAt: string;
  };
  validation: null | { requestId: string; planVersion: number; status: "APPROVED_NOT_DISPATCHED"; providerRequests: 0; spendUsd: 0; approvedAt: string };
  reviews: NicheEvidenceReview[];
  directionCoverage: { supports: number; contradicts: number; unknown: number };
  scoringGate: { state: "READY_FOR_SLICE_5" | "EVIDENCE_INSUFFICIENT"; reason: string };
};

export type NicheScoringAssessment = {
  contract: "NICHE_SCORING_ASSESSMENT_V1";
  scoringVersion: number;
  evidenceVersion: number;
  state: "NOT_ASSESSED" | "SUFFICIENT" | "INSUFFICIENT";
  sufficiencyGaps: string[];
  comparisonEligibility: "ELIGIBLE" | "BLOCKED_BY_PREREQUISITE" | "RESEARCH_REQUIRED";
  axes: { marketAttractiveness: PortfolioAxis; abilityToWin: PortfolioAxis; evidenceConfidence: PortfolioAxis };
  prerequisites: PortfolioCondition[];
  winningCriteria: PortfolioCondition[];
  assessedBy: string | null;
  assessedAt: string | null;
  rankingMethod: "LEXICOGRAPHIC_THREE_AXIS_NO_TOTAL";
};

export type NicheExpertPriorityFact = {
  contract: "NICHE_EXPERT_PRIORITY_V1";
  state: "NOT_RECORDED" | "ACTIVE" | "STALE";
  prioritySetId: string | null;
  priorityVersion: number;
  priority: number | null;
  rationale: string | null;
  portfolioRationale: string | null;
  boundEvidenceVersion: number | null;
  boundScoringVersion: number | null;
  recordedBy: string | null;
  recordedAt: string | null;
};

export type NicheSelectionFact = {
  contract: "NICHE_SELECTION_V1";
  state: "NOT_RECORDED" | "ACTIVE" | "STALE";
  selectionId: string | null;
  selectionVersion: number;
  rationale: string | null;
  tradeoffs: string[];
  commitmentConditions: string[];
  recordedBy: string | null;
  recordedAt: string | null;
};

export type NicheCommitmentFact = {
  contract: "NICHE_COMMITMENT_V1";
  state: "NOT_RECORDED" | "ACTIVE" | "STALE";
  commitmentId: string | null;
  commitmentVersion: number;
  governanceOwner: string | null;
  rationale: string | null;
  riskAcceptance: string | null;
  reviewCadenceDays: number | null;
  revisitTriggers: string[];
  committedBy: string | null;
  committedAt: string | null;
};

export type ChannelStrategyActivationFact = {
  contract: "CHANNEL_STRATEGY_ACTIVATION_V1";
  state: "NOT_ACTIVATED" | "ACTIVE" | "STALE";
  activationId: string | null;
  activationVersion: number;
  channelStrategyVersion: number;
  owner: string | null;
  rationale: string | null;
  viewerPromise: string | null;
  differentiation: string | null;
  audienceFocus: string | null;
  contentBoundaries: string[];
  successMeasures: string[];
  reviewCadenceDays: number | null;
  activatedBy: string | null;
  activatedAt: string | null;
};

export type NicheOpportunityProjection = {
  entityType: "NICHE_OPPORTUNITY";
  provenance: "V2_SYSTEM_DISCOVERY" | "EXPERT_HYPOTHESIS_APPEND";
  opportunityId: string;
  channel: { id: string; name: string; market: string; language: string };
  program: { id: string; version: number };
  title: string;
  description: string | null;
  viewerPromise: string | null;
  centralQuestion: string | null;
  origin: "SYSTEM_DISCOVERED" | "EXPERT_SEEDED";
  lifecycleState: "EVIDENCE_GATHERING" | "COMPARABLE" | "EXPERT_PRIORITIZED" | "SELECTED_PENDING_COMMITMENT" | "COMMITTED" | "CHANNEL_STRATEGY_ACTIVATED";
  eligibility: "ELIGIBLE" | "BLOCKED_BY_PREREQUISITE" | "RESEARCH_REQUIRED";
  systemRank: number | null;
  systemRankBasis: "SLICE_5_LEXICOGRAPHIC_EVIDENCE_ORDER" | "UNRANKED_PENDING_ASSESSMENT";
  expertPriority: number | null;
  expertPriorityBasis: "SLICE_6_VERSIONED_FACT" | "STALE_VERSIONED_FACT" | "NOT_RECORDED";
  expertPriorityFact: NicheExpertPriorityFact;
  selectionFact: NicheSelectionFact;
  commitmentFact: NicheCommitmentFact;
  channelStrategyActivationFact: ChannelStrategyActivationFact;
  axes: {
    marketAttractiveness: PortfolioAxis;
    abilityToWin: PortfolioAxis;
    evidenceConfidence: PortfolioAxis;
  };
  hypothesis: {
    version: number | null;
    rationale: string | null;
    audienceAssumptions: string[];
    demandAssumptions: string[];
    knownCompetitors: string[];
    winningThesis: string | null;
    submittedBy: string | null;
    createdAt: string | null;
  };
  marketPotential: {
    thesis: string | null;
    targetMarket: string | null;
    demandSignals: string[];
    growthSignals: string[];
    monetizationPaths: string[];
    saturationRisks: string[];
    geographyAndLanguage: string[];
  };
  audiences: PortfolioAudience[];
  competitors: PortfolioCompetitor[];
  competitorPatterns: string[];
  competitorGap: string | null;
  prerequisites: PortfolioCondition[];
  winningCriteria: PortfolioCondition[];
  risks: string[];
  researchPlan: { supportingQuestions: string[]; contradictingQuestions: string[]; unknownQuestions: string[]; balanced: boolean };
  evidence: {
    artifactId: string;
    artifactState: string;
    verifiedSources: number;
    primarySources: number;
    unresolvedP0Claims: number;
    contradictionsReviewed: boolean;
  };
  evidenceWorkflow: NicheEvidenceWorkflow;
  scoringAssessment: NicheScoringAssessment;
  coverage: {
    marketPotential: "RECORDED" | "PARTIAL" | "MISSING";
    audience: "RECORDED" | "PARTIAL" | "MISSING";
    competitor: "RECORDED" | "PARTIAL" | "MISSING";
    conditionsToWin: "RECORDED" | "PARTIAL" | "MISSING";
    threeAxisScorecard: "RECORDED" | "PARTIAL" | "MISSING";
  };
  allowedNextActions: string[];
};

export type NichePortfolioProjection = {
  contract: "NICHE_PORTFOLIO_PROJECTION_V2";
  policyVersion: "NICHE_OPPORTUNITY_POLICY_V2";
  generatedAt: string;
  sourceState: "NICHE_OPPORTUNITY_ONLY_WITH_EXPERT_HYPOTHESIS_APPEND";
  scope: { mode: "PORTFOLIO" | "CHANNEL"; channelId: string | null };
  channels: Array<{ id: string; name: string; market: string; language: string }>;
  intakeContexts: Array<{ channelId: string; channelName: string; programId: string; aggregateVersion: number; expectedHypothesisVersion: number }>;
  decisionState: "RESEARCH_IN_PROGRESS" | "PORTFOLIO_COMPARABLE" | "EXPERT_PRIORITIZATION_RECORDED" | "EXPERT_PRIORITIZATION_STALE" | "SELECTED_PENDING_COMMITMENT" | "NICHE_COMMITTED" | "CHANNEL_STRATEGY_ACTIVATED" | "GOVERNANCE_STALE" | "ACTIVATION_STALE";
  summary: { opportunities: number; comparable: number; prioritized: number; priorityVersion: number; selected: number; selectionVersion: number; committed: number; commitmentVersion: number; activated: number; activationVersion: number; eligible: number; blockedByPrerequisite: number; researchRequired: number; expertSeeded: number; researchPlans: number; validationApprovals: number; evidenceReviewed: number; scoringAssessments: number; excludedLegacyContentTopics: number };
  comparison: NicheOpportunityProjection[];
  priorityWorkspace: {
    contract: "NICHE_EXPERT_PRIORITY_V1";
    state: "NOT_READY" | "READY" | "ACTIVE" | "STALE";
    priorityVersion: number;
    comparableSetHash: string;
    comparableCount: number;
    prioritizedCount: number;
    portfolioRationale: string | null;
    recordedBy: string | null;
    recordedAt: string | null;
    reason: string;
  };
  governanceWorkspace: {
    contract: "NICHE_COMMITMENT_GOVERNANCE_V1";
    state: "PRIORITY_REQUIRED" | "READY_FOR_SELECTION" | "SELECTED_PENDING_COMMITMENT" | "COMMITTED" | "STALE";
    selectionVersion: number;
    commitmentVersion: number;
    selectedOpportunityId: string | null;
    selectionId: string | null;
    committedOpportunityId: string | null;
    commitmentId: string | null;
    reason: string;
  };
  activationWorkspace: {
    contract: "CHANNEL_STRATEGY_ACTIVATION_V1";
    state: "COMMITMENT_REQUIRED" | "READY_FOR_ACTIVATION" | "ACTIVE" | "STALE";
    activationVersion: number;
    channelStrategyVersion: number;
    commitmentId: string | null;
    commitmentVersion: number;
    channelId: string | null;
    opportunityId: string | null;
    activationId: string | null;
    reason: string;
  };
  rankingPolicy: {
    systemRank: "SLICE_5_LEXICOGRAPHIC_THREE_AXIS_EVIDENCE_ORDER";
    expertPriority: "SEPARATE_VERSIONED_FACT";
    totalScore: null;
    note: string;
  };
  authority: { activation: "FULL_NICHE_DECISION_TO_CHANNEL_STRATEGY"; v2Commands: "SLICE_3_TO_8_ROUTED_ZERO_SPEND"; providerRequests: 0; spendUsd: 0; hypothesisAppend: true; researchPlanning: true; validationApproval: true; evidenceReview: true; scoringAssessment: true; comparisonMutation: true; expertPriorityMutation: true; systemRankMutation: false; axisMutation: false; evidenceSufficiencyMutation: false; eligibilityMutation: false; nicheSelection: true; nicheCommitment: true; legacyChannelNicheMutation: false; channelStrategyBindingMutation: true; channelStrategyActivation: true };
  downstreamGate: { consumer: "CHANNEL_STRATEGY"; state: "BLOCKED" | "ACTIVATED" | "STALE"; reason: string };
  integrity: { state: "READY" | "RECONCILIATION_REQUIRED"; notes: string[] };
};
