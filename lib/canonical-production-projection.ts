import type { audienceGoldenSnapshot } from "@/lib/youtube-audience-golden";

export type AudienceGoldenSnapshot = Awaited<ReturnType<typeof audienceGoldenSnapshot>>;

export type CanonicalGoldenProjection = {
  authority: "YOUTUBE_AUDIENCE_GOLDEN" | "LEGACY_GOLDEN_FALLBACK";
  revision?: number;
  blueprintId?: string;
  materializationId?: string;
  state: string;
  nextAction: string;
  masterUrl?: string;
  masterSha256?: string;
  masterBytes?: number;
  durationSeconds: number;
  probe?: { width?: number; height?: number; durationSeconds?: number; averageFrameRate?: number };
  visualQa?: { decisionState: string; overallScore: number; p0Count: number; p1Count: number; p2Count: number } | null;
  audioQa?: { decisionState: string; overallScore: number; p0Count: number; p1Count: number; p2Count: number } | null;
  browserQa?: { decisionState: string; overallScore: number; p0Count: number; p1Count: number; p2Count: number } | null;
  materialsHref: "/video-engine/audience-golden";
};

type LegacyGolden = {
  state: string;
  nextAction?: string;
  masterUrl?: string;
  masterSha256?: string;
  durationSeconds: number;
  probe?: CanonicalGoldenProjection["probe"];
};

const revisionFromBlueprint = (id?: string) => {
  const match = id?.match(/:r(\d+)$/);
  return match ? Number(match[1]) : undefined;
};

export function reconcileCanonicalGolden(legacy: LegacyGolden, audience?: AudienceGoldenSnapshot | null): CanonicalGoldenProjection {
  if (!audience?.blueprint) return {
    authority: "LEGACY_GOLDEN_FALLBACK",
    state: legacy.state,
    nextAction: legacy.nextAction || legacy.state,
    masterUrl: legacy.masterUrl,
    masterSha256: legacy.masterSha256,
    durationSeconds: legacy.durationSeconds,
    probe: legacy.probe,
    materialsHref: "/video-engine/audience-golden",
  };

  const visual = audience.factoryVisualQa;
  const audio = audience.factoryAudioQa;
  const browser = audience.browserQa;
  const state = audience.freeze ? "FROZEN_AUDIENCE_GOLDEN"
    : visual?.decisionState === "FAIL" || audio?.decisionState === "FAIL" || browser?.decisionState === "FAIL" ? "REPAIR_REQUIRED"
    : audience.nextAction;
  const materialization = audience.materialization;
  return {
    authority: "YOUTUBE_AUDIENCE_GOLDEN",
    revision: revisionFromBlueprint(audience.blueprint.id),
    blueprintId: audience.blueprint.id,
    materializationId: materialization?.id,
    state,
    nextAction: audience.nextAction,
    masterUrl: materialization?.masterUrl,
    masterSha256: materialization?.masterHash,
    masterBytes: materialization?.masterBytes,
    durationSeconds: materialization?.durationSeconds ?? 0,
    probe: materialization ? { width: materialization.width, height: materialization.height, durationSeconds: materialization.durationSeconds, averageFrameRate: materialization.frameRate } : undefined,
    visualQa: visual,
    audioQa: audio,
    browserQa: browser,
    materialsHref: "/video-engine/audience-golden",
  };
}

export function canonicalGoldenRootStages(golden: CanonicalGoldenProjection, fallback: string[]) {
  if (golden.authority !== "YOUTUBE_AUDIENCE_GOLDEN") return fallback;
  const stages = new Set<string>();
  if (golden.visualQa?.decisionState === "FAIL") ["07B", "08", "09"].forEach((stage) => stages.add(stage));
  if (golden.audioQa?.decisionState === "FAIL") ["07A", "10"].forEach((stage) => stages.add(stage));
  if (golden.browserQa?.decisionState === "FAIL") ["11", "12", "14"].forEach((stage) => stages.add(stage));
  return [...stages];
}
