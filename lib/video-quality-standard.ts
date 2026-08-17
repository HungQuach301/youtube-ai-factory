export const VIDEO_QUALITY_STANDARD_VERSION = "VIDEO_PRODUCTION_QUALITY_STANDARD_V2" as const;

export type VideoQualityScope = "CHANNEL" | "PILLAR" | "SERIES" | "EPISODE" | "BEAT" | "SHOT" | "CUE";
export type VideoQualityLevel = "M0" | "M1" | "M2" | "M3" | "M4";
export type VideoQualityFailureAction = "STOP" | "REOPEN" | "REPAIR" | "WARN" | "LEARN";
export type VideoQualityEvidenceKind = "SOURCE" | "TRANSCRIPT" | "AUDIO" | "WAVEFORM" | "PIXELS" | "MOTION" | "MIX" | "MASTER" | "ANALYTICS";

export type VideoQualityStandard = {
  standardId: string;
  version: typeof VIDEO_QUALITY_STANDARD_VERSION;
  scope: VideoQualityScope;
  scopeKey: string;
  enforcementLevel: VideoQualityLevel;
  trigger: string;
  metric: string;
  thresholdOrRange: string;
  evidenceRequired: VideoQualityEvidenceKind[];
  owningStage: string;
  failureAction: VideoQualityFailureAction;
  waiverPolicy: "NONE" | "PRE_PRODUCTION_VERSION_ONLY";
  active: boolean;
};

export type VideoQualityRoute = {
  channel: string;
  pillar?: string;
  series?: string;
  episode?: string;
  beat?: string;
  shot?: string;
  cue?: string;
};

export type VideoQualityEvidence = {
  standardId: string;
  status: "PASS" | "FAIL" | "BLOCKED" | "NOT_EVALUATED";
  evidenceKind: VideoQualityEvidenceKind;
  evidenceHash?: string;
  measuredValue?: number | string;
  artifactId?: string;
};

const scopeOrder: VideoQualityScope[] = ["CHANNEL", "PILLAR", "SERIES", "EPISODE", "BEAT", "SHOT", "CUE"];
const hardLevels = new Set<VideoQualityLevel>(["M0", "M1", "M2"]);

function routeKey(route: VideoQualityRoute, scope: VideoQualityScope) {
  if (scope === "CHANNEL") return route.channel;
  if (scope === "PILLAR") return route.pillar;
  if (scope === "SERIES") return route.series;
  if (scope === "EPISODE") return route.episode;
  if (scope === "BEAT") return route.beat;
  if (scope === "SHOT") return route.shot;
  return route.cue;
}

export function resolveVideoQualityStandards(registry: VideoQualityStandard[], route: VideoQualityRoute) {
  const applicable = registry.filter((standard) => standard.active && routeKey(route, standard.scope) === standard.scopeKey);
  const byId = new Map<string, VideoQualityStandard>();
  for (const scope of scopeOrder) {
    for (const standard of applicable.filter((item) => item.scope === scope)) {
      const inherited = byId.get(standard.standardId);
      if (inherited && hardLevels.has(inherited.enforcementLevel) && !hardLevels.has(standard.enforcementLevel)) {
        throw new Error(`VIDEO_QUALITY_STANDARD_WEAKENING:${standard.standardId}`);
      }
      byId.set(standard.standardId, standard);
    }
  }
  return [...byId.values()].sort((left, right) => scopeOrder.indexOf(left.scope) - scopeOrder.indexOf(right.scope) || left.standardId.localeCompare(right.standardId));
}

export function evaluateVideoQualityEligibility(standards: VideoQualityStandard[], evidence: VideoQualityEvidence[]) {
  const latest = new Map(evidence.map((item) => [item.standardId, item]));
  const hard = standards.filter((item) => hardLevels.has(item.enforcementLevel));
  const gaps = hard.flatMap((standard) => {
    const result = latest.get(standard.standardId);
    if (result?.status === "PASS" && result.evidenceHash && standard.evidenceRequired.includes(result.evidenceKind)) return [];
    return [{
      standardId: standard.standardId,
      level: standard.enforcementLevel,
      owningStage: standard.owningStage,
      failureAction: standard.failureAction,
      status: result?.status ?? "NOT_EVALUATED",
      evidenceRequired: standard.evidenceRequired,
    }];
  });
  return {
    standardVersion: VIDEO_QUALITY_STANDARD_VERSION,
    eligibility: gaps.length ? "BLOCKED_VIDEO_STANDARD_V2" as const : "VIDEO_EXCELLENCE_ELIGIBLE" as const,
    resolvedStandards: standards.length,
    hardStandards: hard.length,
    passedHardStandards: hard.length - gaps.length,
    gaps,
    nextValidAction: gaps.length
      ? `Repair ${[...new Set(gaps.map((gap) => gap.owningStage))].join(", ")} evidence before Stage 11.`
      : "Stage 11 may start through its typed command boundary.",
  };
}

export const VIDEO_01_QUALITY_ROUTE: VideoQualityRoute = {
  channel: "channel-hidden-systems",
  pillar: "everyday-transaction-tollbooths",
  series: "follow-the-fee",
  episode: "what-really-happens-to-a-100-card-purchase",
};

export const REQUIRED_GOLDEN_SEQUENCE_GATES = [
  "VQ-M0-FACTUAL-TRACEABILITY",
  "VQ-M1-NARRATION-VOICE",
  "VQ-M1-AUDIO-MIX",
  "VQ-M1-TEMPORAL-PIXELS",
  "VQ-M1-SEMANTIC-ALIGNMENT",
  "VQ-M1-MOBILE-LEGIBILITY",
  "VQ-M2-PILLAR-TRANSACTION-CHAIN",
  "VQ-M2-SERIES-FOLLOW-THE-FEE",
  "VQ-M1-GOLDEN-PLAYBACK",
] as const;
