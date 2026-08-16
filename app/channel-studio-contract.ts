export type ContentBand = "OPPORTUNITY" | "BACKLOG" | "PLANNED" | "PRODUCTION" | "TERMINAL" | "UNKNOWN";

export type ChannelStudioProjection = {
  contract: "CHANNEL_STUDIO_PROJECTION_V1";
  generatedAt: string;
  sourceState: "CANONICAL_CHANNEL_PLUS_READ_ONLY_CONTENT_BRIDGE";
  scope: { mode: "PORTFOLIO" | "CHANNEL"; channelId: string | null };
  channels: Array<{ id: string; name: string; market: string; language: string; niche: string }>;
  selectedChannel: { id: string; name: string; market: string; language: string; niche: string } | null;
  nicheDecision: { currentNiche: string | null; provenance: "CHANNEL_FIELD_COMPATIBILITY_ONLY" | "SLICE_8_COMMITTED_OPPORTUNITY_BINDING"; decisionAuthority: "OWNER_EXPERT_REQUIRED" | "PORTFOLIO_GOVERNANCE_ACTIVATED" };
  strategy: { state: "CANONICAL_AGGREGATE_NOT_IMPLEMENTED" | "ACTIVE" | "STALE"; version: number; activationId: string | null; owner: string | null; viewerPromise: string | null; differentiation: string | null; audienceFocus: string | null; contentBoundaries: string[]; successMeasures: string[]; gaps: string[] };
  pillars: Array<{ label: string; provenance: "LEGACY_TEXT_LABEL"; itemCount: number }>;
  series: { state: "CANONICAL_AGGREGATE_NOT_IMPLEMENTED"; items: never[] };
  legacyTopicCandidates: Array<{ id: string; entityType: "VIDEO_TOPIC_CANDIDATE"; title: string; centralQuestion: string | null; viewerPromise: string | null; score: number; provenance: "LEGACY_V1_VIDEO_TOPIC_CANDIDATE" }>;
  contentResearchChampion: { title: string; provenance: "LEGACY_V1_VIDEO_TOPIC_CHAMPION" } | null;
  portfolio: Array<{ id: string; title: string; pillar: string; rawStatus: string; band: ContentBand; score: number; progress: number; nextAction: string; updatedAt: string }>;
  summary: Record<ContentBand, number>;
  editorialQueue: { state: "CANONICAL_AGGREGATE_NOT_IMPLEMENTED"; compatibilityItems: number };
  productionHandoff: { state: "COMMAND_NOT_AUTHORIZED"; eligibleCompatibilityItems: number; blockers: string[] };
  integrity: { state: "READY" | "RECONCILIATION_REQUIRED"; notes: string[] };
};
