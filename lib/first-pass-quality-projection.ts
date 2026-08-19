const numeric = (value: unknown) => Number(value ?? 0);
const clean = (value: unknown) => String(value ?? "").trim();
const STAGE_ORDER = ["00", "01", "02", "03", "04", "05", "06", "07A", "07B", "08", "09", "10", "11", "12", "13", "14", "15", "16"];

const rootKeysFromOwner = (owner: string) => owner.match(/(?:07A|07B|\d{2})/g) ?? [];

export function deriveRootStageKeys(
  goldenState: string,
  goldenQuality: Record<string, unknown>,
  goldenScan: Record<string, unknown>,
  gaps: Array<{ owningStage: string; status?: string; evidenceRequired?: string[] }>,
) {
  const roots = new Set<string>();
  const motion = (goldenScan.motionProvenance ?? {}) as Record<string, unknown>;
  const segments = numeric(motion.segmentCount);
  const cameraOnlyRatio = segments > 0 ? numeric(motion.cameraOnlySegmentCount) / segments : 0;
  const semanticMotionRatio = segments > 0 ? numeric(motion.semanticAnimationSegmentCount) / segments : 0;
  const sourceVideoRatio = segments > 0 ? numeric(motion.sourceVideoSegmentCount) / segments : 0;
  const unresolvedVisualGap = gaps.some((gap) => /(?:08|09)/.test(gap.owningStage)
    && (gap.evidenceRequired ?? []).some((kind) => ["PIXELS", "MOTION", "MASTER"].includes(kind))
    && gap.status !== "PASS");
  const visualRepair = goldenState === "REPAIR_REQUIRED" && (
    cameraOnlyRatio > .35 ||
    (segments > 0 && semanticMotionRatio < .45) ||
    (segments > 0 && sourceVideoRatio < .2) ||
    (numeric(motion.visualTreatmentCount) > 0 && numeric(motion.visualTreatmentCount) < 3) ||
    unresolvedVisualGap
  );
  if (visualRepair) ["07B", "08", "09"].forEach((key) => roots.add(key));
  const audioAudit = (goldenQuality.perceptualAudioAudit ?? {}) as Record<string, unknown>;
  if (clean(audioAudit.decision) === "REPAIR_REQUIRED") ["07A", "10"].forEach((key) => roots.add(key));
  if (goldenState === "REPAIR_REQUIRED" && roots.size === 0) {
    for (const gap of gaps) rootKeysFromOwner(gap.owningStage).forEach((key) => roots.add(key));
  }
  return [...roots].sort((a, b) => STAGE_ORDER.indexOf(a) - STAGE_ORDER.indexOf(b));
}
