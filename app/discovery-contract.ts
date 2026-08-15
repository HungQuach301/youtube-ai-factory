export type DiscoveryCandidate = {
  id: string;
  title: string;
  centralQuestion: string;
  viewerPromise: string;
  novelty: number;
  evergreenFit: number;
  visualPotential: number;
  score: number;
  readiness: "EVIDENCE_READY_EXPERT_DECISION_REQUIRED" | "REVIEW_REQUIRED" | "INSUFFICIENT_EVIDENCE";
  risks: string[];
  recommendationState: "RESEARCH_CANDIDATE" | "RESEARCH_CHAMPION";
};

export type DiscoveryProjection = {
  contract: "DISCOVERY_PROJECTION_V1";
  generatedAt: string;
  scope: { mode: "PORTFOLIO" | "CHANNEL"; channelId: string | null };
  sourceState: "CANONICAL_V7_READ_ONLY";
  channels: Array<{ id: string; name: string; market: string; language: string; currentNiche: string; programId: string | null }>;
  market: { thesis: string | null; targetMarket: string | null; targetLanguage: string | null; clusters: Array<Record<string, unknown>> };
  audience: { segments: Array<Record<string, unknown>> };
  competitors: { references: Array<Record<string, unknown>>; patterns: string[]; gaps: string | null; antiCloneControls: string[] };
  niche: { currentNiche: string | null; researchChampion: string | null; candidates: DiscoveryCandidate[]; decisionAuthority: "OWNER_EXPERT_REQUIRED" };
  evidence: { artifactCount: number; frozenStage01: boolean; verifiedSources: number; primarySources: number; claims: number; p0Claims: number; runs: number; lineageIds: string[] };
  integrity: { state: "READY" | "RECONCILIATION_REQUIRED"; notes: string[] };
};
