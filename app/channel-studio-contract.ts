export type ContentBand = "OPPORTUNITY" | "BACKLOG" | "PLANNED" | "PRODUCTION" | "TERMINAL" | "UNKNOWN";

export type ChannelStudioProjection = {
  contract: "CHANNEL_STUDIO_PROJECTION_V1";
  generatedAt: string;
  sourceState: "CANONICAL_CHANNEL_PLUS_READ_ONLY_CONTENT_BRIDGE";
  scope: { mode: "PORTFOLIO" | "CHANNEL"; channelId: string | null };
  channels: Array<{ id: string; name: string; market: string; language: string; niche: string }>;
  selectedChannel: { id: string; name: string; market: string; language: string; niche: string } | null;
  nicheDecision: { currentNiche: string | null; provenance: "CHANNEL_FIELD_COMPATIBILITY_ONLY"; recommendation: string | null; decisionAuthority: "OWNER_EXPERT_REQUIRED" };
  strategy: { state: "CANONICAL_AGGREGATE_NOT_IMPLEMENTED"; viewerPromise: string | null; differentiation: string | null; gaps: string[] };
  pillars: Array<{ label: string; provenance: "LEGACY_TEXT_LABEL"; itemCount: number }>;
  series: { state: "CANONICAL_AGGREGATE_NOT_IMPLEMENTED"; items: never[] };
  portfolio: Array<{ id: string; title: string; pillar: string; rawStatus: string; band: ContentBand; score: number; progress: number; nextAction: string; updatedAt: string }>;
  summary: Record<ContentBand, number>;
  editorialQueue: { state: "CANONICAL_AGGREGATE_NOT_IMPLEMENTED"; compatibilityItems: number };
  productionHandoff: { state: "COMMAND_NOT_AUTHORIZED"; eligibleCompatibilityItems: number; blockers: string[] };
  integrity: { state: "READY" | "RECONCILIATION_REQUIRED"; notes: string[] };
};
