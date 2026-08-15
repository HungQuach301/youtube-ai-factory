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

export type NicheOpportunityProjection = {
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
  systemRank: number;
  systemRankBasis: "CANONICAL_V1_CANDIDATE_ORDER";
  expertPriority: number | null;
  expertPriorityBasis: "RECORDED_IN_SOURCE" | "NOT_RECORDED";
  axes: {
    marketAttractiveness: PortfolioAxis;
    abilityToWin: PortfolioAxis;
    evidenceConfidence: PortfolioAxis;
  };
  legacyScore: number | null;
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
  sourceState: "CANONICAL_V7_READ_ONLY_COMPATIBILITY_BRIDGE";
  scope: { mode: "PORTFOLIO" | "CHANNEL"; channelId: string | null };
  channels: Array<{ id: string; name: string; market: string; language: string }>;
  decisionState: "RESEARCH_IN_PROGRESS" | "PORTFOLIO_COMPARABLE" | "EXPERT_PRIORITIZATION_RECORDED";
  summary: { opportunities: number; comparable: number; eligible: number; blockedByPrerequisite: number; researchRequired: number; expertSeeded: number };
  comparison: NicheOpportunityProjection[];
  rankingPolicy: {
    systemRank: "CANONICAL_V1_CANDIDATE_ORDER";
    expertPriority: "SEPARATE_VERSIONED_FACT";
    totalScore: null;
    note: string;
  };
  authority: { activation: "READ_ONLY"; v2Commands: "DECLARED_NOT_ROUTED"; providerRequests: 0; spendUsd: 0; productionDataMutation: false };
  downstreamGate: { consumer: "CHANNEL_STRATEGY"; state: "BLOCKED"; reason: string };
  integrity: { state: "READY" | "RECONCILIATION_REQUIRED"; notes: string[] };
};
