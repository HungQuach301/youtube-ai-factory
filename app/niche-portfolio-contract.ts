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
  lifecycleState: "EVIDENCE_GATHERING" | "COMPARABLE" | "EXPERT_PRIORITIZED";
  eligibility: "ELIGIBLE" | "BLOCKED_BY_PREREQUISITE" | "RESEARCH_REQUIRED";
  systemRank: number | null;
  systemRankBasis: "SLICE_5_LEXICOGRAPHIC_EVIDENCE_ORDER" | "UNRANKED_PENDING_ASSESSMENT";
  expertPriority: number | null;
  expertPriorityBasis: "SLICE_6_VERSIONED_FACT" | "STALE_VERSIONED_FACT" | "NOT_RECORDED";
  expertPriorityFact: NicheExpertPriorityFact;
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
  decisionState: "RESEARCH_IN_PROGRESS" | "PORTFOLIO_COMPARABLE" | "EXPERT_PRIORITIZATION_RECORDED" | "EXPERT_PRIORITIZATION_STALE";
  summary: { opportunities: number; comparable: number; prioritized: number; priorityVersion: number; eligible: number; blockedByPrerequisite: number; researchRequired: number; expertSeeded: number; researchPlans: number; validationApprovals: number; evidenceReviewed: number; scoringAssessments: number; excludedLegacyContentTopics: number };
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
  rankingPolicy: {
    systemRank: "SLICE_5_LEXICOGRAPHIC_THREE_AXIS_EVIDENCE_ORDER";
    expertPriority: "SEPARATE_VERSIONED_FACT";
    totalScore: null;
    note: string;
  };
  authority: { activation: "EVIDENCE_SCORING_AND_EXPERT_PRIORITIZATION"; v2Commands: "SUBMIT_HYPOTHESIS_SLICE_4_EVIDENCE_SLICE_5_SCORING_AND_SLICE_6_PRIORITY_ZERO_SPEND"; providerRequests: 0; spendUsd: 0; hypothesisAppend: true; researchPlanning: true; validationApproval: true; evidenceReview: true; scoringAssessment: true; comparisonMutation: true; expertPriorityMutation: true; systemRankMutation: false; axisMutation: false; evidenceSufficiencyMutation: false; eligibilityMutation: false; nicheSelection: false; nicheCommitment: false; channelNicheMutation: false; channelStrategyActivation: false };
  downstreamGate: { consumer: "CHANNEL_STRATEGY"; state: "BLOCKED"; reason: string };
  integrity: { state: "READY" | "RECONCILIATION_REQUIRED"; notes: string[] };
};
