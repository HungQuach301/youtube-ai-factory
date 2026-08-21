export const EVALUATION_FOUNDATION_VERSION = "EVALUATION_FOUNDATION_V1" as const;

export const OWNER_STANDING_AUTHORITY = {
  version: "OWNER_STANDING_PRODUCTION_AUTHORITY_V1",
  grantedAt: "2026-08-21",
  authority: ["PRODUCTION_DEPLOY", "PRODUCTION_MIGRATION", "PRODUCTION_QA", "PROVIDER_DISPATCH"] as const,
  prerequisites: [
    "ACTIVE_ROADMAP_SCOPE",
    "TYPED_OPERATION_PLAN",
    "CAPABILITY_AND_SETTINGS_CURRENT",
    "ATOMIC_BUDGET_RESERVATION",
    "RIGHTS_ELIGIBLE",
    "SAFETY_SCOPE_PASS",
    "IDEMPOTENCY_AND_FENCING_VALID",
  ] as const,
  excluded: ["AUTO_PUBLISH", "PUBLICATION", "DELETE_HISTORICAL_EVIDENCE", "WEAKEN_HARD_GATE"] as const,
} as const;

export type CandidateVerificationInput = {
  bytesState: string;
  checksumState: string;
  provenanceState: string;
  ownerDecisionState: string;
  defectLabelState: string;
  rightsVerificationState: string;
  correlationGroup?: string;
  duplicateCount?: number;
  releaseEligible?: boolean;
};

export function evaluateCandidateVerification(input: CandidateVerificationInput) {
  const reasons: string[] = [];
  if (input.bytesState !== "READBACK_VERIFIED") reasons.push("BYTES_NOT_READBACK_VERIFIED");
  if (input.checksumState !== "PASS") reasons.push("CHECKSUM_NOT_VERIFIED");
  if (input.provenanceState !== "PASS") reasons.push("PROVENANCE_NOT_VERIFIED");
  if (input.ownerDecisionState !== "OWNER_CONFIRMED") reasons.push("OWNER_DECISION_NOT_CONFIRMED");
  if (input.defectLabelState !== "LABELLED") reasons.push("DEFECT_LABEL_NOT_VERIFIED");
  if (input.rightsVerificationState !== "PASS") reasons.push("RIGHTS_NOT_VERIFIED");
  if (!input.correlationGroup?.trim()) reasons.push("CORRELATION_GROUP_MISSING");
  if ((input.duplicateCount ?? 1) > 1) reasons.push("CORRELATED_OR_DUPLICATE_REVISION");
  if (input.releaseEligible) reasons.push("EVALUATION_FIXTURE_CANNOT_BE_RELEASE_CANDIDATE");
  return {
    eligible: reasons.length === 0,
    lifecycleState: reasons.length === 0 ? "GOLD_ELIGIBLE" as const : "CANDIDATE_EVIDENCE" as const,
    reasons,
  };
}

export type InventoryCandidate = CandidateVerificationInput & {
  id: string;
  contentHash?: string;
};

export function summarizeEvaluationInventory(candidates: InventoryCandidate[]) {
  const hashCounts = new Map<string, number>();
  for (const candidate of candidates) if (candidate.contentHash) hashCounts.set(candidate.contentHash, (hashCounts.get(candidate.contentHash) ?? 0) + 1);
  const evaluated = candidates.map((candidate) => evaluateCandidateVerification({
    ...candidate,
    duplicateCount: candidate.contentHash ? hashCounts.get(candidate.contentHash) : candidate.duplicateCount,
  }));
  return {
    candidates: candidates.length,
    duplicateHashes: [...hashCounts.values()].filter((count) => count > 1).length,
    fullyVerified: evaluated.filter((item) => !item.reasons.some((reason) => reason !== "CORRELATED_OR_DUPLICATE_REVISION" && reason !== "EVALUATION_FIXTURE_CANNOT_BE_RELEASE_CANDIDATE")).length,
    goldEligible: evaluated.filter((item) => item.eligible).length,
  };
}

export type DefectFamilyQualification = {
  defectKey: string;
  severity: "P0" | "P1" | "P2";
  approvedRecallFloor?: number;
  recall?: number;
  precision?: number;
  repeatability?: number;
  p0EscapeCount: number;
};

export type AssuranceQualificationInput = {
  datasetState: string;
  blinded: boolean;
  correlatedItems: number;
  distinctItems: number;
  minimumDistinctItems: number;
  maximumCostUsd: number;
  actualCostUsd: number;
  families: DefectFamilyQualification[];
};

export function evaluateAssuranceQualification(input: AssuranceQualificationInput) {
  const reasons: string[] = [];
  if (input.datasetState !== "SEALED") reasons.push("SEALED_DATASET_REQUIRED");
  if (!input.blinded) reasons.push("BLINDED_EVALUATION_REQUIRED");
  if (input.correlatedItems > 0) reasons.push("CORRELATED_ITEMS_EXCLUDED_FROM_COUNTS");
  if (input.distinctItems < input.minimumDistinctItems) reasons.push("MINIMUM_DISTINCT_SAMPLE_NOT_MET");
  if (input.actualCostUsd > input.maximumCostUsd) reasons.push("QUALIFICATION_COST_CEILING_EXCEEDED");
  const p0Families = input.families.filter((family) => family.severity === "P0");
  if (p0Families.length === 0) reasons.push("P0_DEFECT_FAMILIES_REQUIRED");
  for (const family of p0Families) {
    if (family.approvedRecallFloor === undefined) reasons.push(`RECALL_FLOOR_CALIBRATION_REQUIRED:${family.defectKey}`);
    else if (family.recall === undefined || family.recall < family.approvedRecallFloor) reasons.push(`P0_RECALL_FLOOR_NOT_MET:${family.defectKey}`);
    if (family.p0EscapeCount > 0) reasons.push(`P0_ESCAPE_DETECTED:${family.defectKey}`);
    if (family.precision === undefined) reasons.push(`PRECISION_NOT_MEASURED:${family.defectKey}`);
    if (family.repeatability === undefined) reasons.push(`REPEATABILITY_NOT_MEASURED:${family.defectKey}`);
  }
  const calibrationRequired = reasons.some((reason) => reason.includes("CALIBRATION_REQUIRED") || reason.includes("NOT_MEASURED"));
  return {
    eligible: reasons.length === 0,
    state: reasons.length === 0 ? "QUALIFIED" as const : calibrationRequired ? "CALIBRATION_REQUIRED" as const : "BLOCKED" as const,
    reasons,
  };
}

export function standingAuthorityCovers(action: string) {
  return (OWNER_STANDING_AUTHORITY.authority as readonly string[]).includes(action)
    && !(OWNER_STANDING_AUTHORITY.excluded as readonly string[]).includes(action);
}
