export const EVALUATION_FOUNDATION_VERSION = "EVALUATION_FOUNDATION_V1" as const;
export const CORPUS_VERIFICATION_POLICY_VERSION = "CORPUS_VERIFICATION_POLICY_V1" as const;
export const CORPUS_VERIFICATION_MAXIMUM_BATCH = 20 as const;
export const CORPUS_VERIFICATION_MAXIMUM_OBJECT_BYTES = 100_000_000 as const;

export type CorpusEvidenceConflict = {
  candidateKind?: string;
  artifactType?: string;
  bytesState?: string;
  checksumState?: string;
  provenanceState?: string;
  reconciliationReasonsJson?: string;
  candidateDeclaredHash?: string;
  candidateDeclaredBytes?: number;
  sourceArtifactId?: string;
  sourcePackageId?: string;
  sourceHash?: string;
  sourceBytes?: number;
  sourceEngineVersion?: string;
  computedHash?: string;
  actualBytes?: number;
  objectMetadataJson?: string;
};

export type CorpusEvidenceConflictSummary = {
  blockedCandidates: number;
  reasonCounts: Array<{ key: string; count: number }>;
  factCounts: Array<{ key: string; count: number }>;
  stateCounts: Array<{ key: string; count: number }>;
  kindCounts: Array<{ key: string; count: number }>;
};

export type EvaluationRightsQueueItem = { candidateKind?: string; rightsBasis?: string };
export type EvaluationRightsQueueSummary = { basisCounts: Array<{ key: string; count: number }>; kindCounts: Array<{ key: string; count: number }> };

export type CorpusArtifactEvidence = {
  candidateId: string;
  sourceArtifactId: string;
  sourcePackageId: string;
  storageKey: string;
  declaredHash?: string;
  computedHash?: string;
  declaredBytes?: number;
  actualBytes?: number;
  mimeType?: string;
  artifactType?: string;
  engineVersion?: string;
  rightsDeclaredState?: string;
  provenance?: Record<string, unknown> | null;
  objectFound: boolean;
  objectMetadata?: Record<string, string>;
};

const clean = (value: unknown) => String(value ?? "").trim();
const acceptedRightsDeclarations = new Set(["CHANNEL_OWNED_OR_PROVIDER_COMMERCIAL", "CHANNEL_OWNED_ORIGINAL", "COMMERCIAL_LICENSE_VERIFIED"]);
const knownConflictReasons = new Set([
  "OBJECT_MISSING", "OBJECT_SIZE_LIMIT_EXCEEDED", "BYTE_SIZE_MISMATCH", "DECLARED_HASH_MISSING", "CHECKSUM_MISMATCH",
  "PROVENANCE_JSON_INVALID", "LEGACY_SOURCE_ISOLATION_UNPROVEN", "R2_OBJECT_METADATA_MISMATCH",
  "DECLARATION_NOT_ELIGIBLE", "PROVIDER_TERMS_RECEIPT_MISSING", "AUTHORSHIP_EVIDENCE_INCOMPLETE",
]);

const increment = (target: Map<string, number>, key: string) => target.set(key, (target.get(key) ?? 0) + 1);
const rankedCounts = (source: Map<string, number>) => [...source.entries()].map(([key, count]) => ({ key, count })).sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));
const comparableNumber = (value: unknown) => clean(value) !== "" && Number.isFinite(Number(value));
const knownRightsBases = new Set(["DECLARATION_NOT_ELIGIBLE", "PROVIDER_TERMS_RECEIPT_MISSING", "AUTHORSHIP_EVIDENCE_INCOMPLETE"]);

export function summarizeEvaluationRightsQueue(rows: EvaluationRightsQueueItem[]): EvaluationRightsQueueSummary {
  const bases = new Map<string, number>(), kinds = new Map<string, number>();
  for (const row of rows) {
    const basis = clean(row.rightsBasis);
    increment(bases, knownRightsBases.has(basis) ? basis : basis ? "UNKNOWN_RIGHTS_BASIS" : "RIGHTS_BASIS_MISSING");
    increment(kinds, clean(row.candidateKind) || "UNKNOWN_KIND");
  }
  return { basisCounts: rankedCounts(bases), kindCounts: rankedCounts(kinds) };
}

export function summarizeCorpusEvidenceConflicts(rows: CorpusEvidenceConflict[]): CorpusEvidenceConflictSummary {
  const reasons = new Map<string, number>(), facts = new Map<string, number>(), states = new Map<string, number>(), kinds = new Map<string, number>();
  for (const row of rows) {
    const parsedReasons = (() => { try { const value = JSON.parse(clean(row.reconciliationReasonsJson)); return Array.isArray(value) ? value : []; } catch { return []; } })();
    const normalizedReasons = parsedReasons.map(clean).filter(Boolean);
    if (normalizedReasons.length === 0) increment(reasons, "RECONCILIATION_REASON_MISSING");
    for (const reason of normalizedReasons) increment(reasons, knownConflictReasons.has(reason) ? reason : "UNKNOWN_RECONCILIATION_REASON");
    const metadata = (() => { try { const value = JSON.parse(clean(row.objectMetadataJson)); return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; } catch { return {}; } })();
    const candidateHash = clean(row.candidateDeclaredHash).toLowerCase(), sourceHash = clean(row.sourceHash).toLowerCase(), computedHash = clean(row.computedHash).toLowerCase(), metadataHash = clean(metadata.sha256).toLowerCase();
    if (clean(metadata.artifactId) !== clean(row.sourceArtifactId)) increment(facts, "R2_ARTIFACT_ID_FIELD_MISMATCH");
    if (clean(metadata.packageId) !== clean(row.sourcePackageId)) increment(facts, "R2_PACKAGE_ID_FIELD_MISMATCH");
    if (metadataHash !== candidateHash) increment(facts, "R2_METADATA_HASH_DECLARATION_MISMATCH");
    if (clean(metadata.engineVersion) !== clean(row.sourceEngineVersion)) increment(facts, "R2_ENGINE_VERSION_FIELD_MISMATCH");
    if (candidateHash !== sourceHash) increment(facts, "CANDIDATE_SOURCE_HASH_MISMATCH");
    if (sourceHash !== computedHash) increment(facts, "SOURCE_HASH_OBJECT_BYTES_MISMATCH");
    if (metadataHash !== computedHash) increment(facts, "R2_METADATA_HASH_OBJECT_BYTES_MISMATCH");
    if (comparableNumber(row.candidateDeclaredBytes) && comparableNumber(row.sourceBytes) && Number(row.candidateDeclaredBytes) !== Number(row.sourceBytes)) increment(facts, "CANDIDATE_SOURCE_BYTE_SIZE_MISMATCH");
    if (comparableNumber(row.sourceBytes) && comparableNumber(row.actualBytes) && Number(row.sourceBytes) !== Number(row.actualBytes)) increment(facts, "SOURCE_BYTE_SIZE_OBJECT_MISMATCH");
    increment(states, `${clean(row.bytesState) || "UNKNOWN_BYTES"}/${clean(row.checksumState) || "UNKNOWN_CHECKSUM"}/${clean(row.provenanceState) || "UNKNOWN_PROVENANCE"}`);
    increment(kinds, clean(row.candidateKind) || "UNKNOWN_KIND");
  }
  return { blockedCandidates: rows.length, reasonCounts: rankedCounts(reasons), factCounts: rankedCounts(facts), stateCounts: rankedCounts(states), kindCounts: rankedCounts(kinds) };
}

export function reconcileCorpusArtifactEvidence(input: CorpusArtifactEvidence) {
  const reasons: string[] = [];
  const metadata = input.objectMetadata ?? {};
  const provenance = input.provenance && typeof input.provenance === "object" && !Array.isArray(input.provenance) ? input.provenance : null;
  const declaredHash = clean(input.declaredHash).toLowerCase(), computedHash = clean(input.computedHash).toLowerCase();
  const bytesState = !input.objectFound ? "OBJECT_MISSING"
    : Number(input.actualBytes) > CORPUS_VERIFICATION_MAXIMUM_OBJECT_BYTES ? "OBJECT_SIZE_LIMIT_EXCEEDED"
    : "READBACK_VERIFIED";
  if (bytesState !== "READBACK_VERIFIED") reasons.push(bytesState);
  if (bytesState === "READBACK_VERIFIED" && Number(input.declaredBytes) !== Number(input.actualBytes)) reasons.push("BYTE_SIZE_MISMATCH");
  const checksumState = bytesState === "READBACK_VERIFIED" && /^[a-f0-9]{64}$/.test(declaredHash) && declaredHash === computedHash ? "PASS" : "FAIL";
  if (checksumState !== "PASS") reasons.push(!declaredHash ? "DECLARED_HASH_MISSING" : "CHECKSUM_MISMATCH");
  const metadataMatches = clean(metadata.artifactId) === clean(input.sourceArtifactId)
    && clean(metadata.packageId) === clean(input.sourcePackageId)
    && clean(metadata.sha256).toLowerCase() === declaredHash
    && clean(metadata.engineVersion) === clean(input.engineVersion);
  const provenanceState = provenance && provenance.legacySources === 0 && metadataMatches ? "PASS" : "FAIL";
  if (!provenance) reasons.push("PROVENANCE_JSON_INVALID");
  if (provenance && provenance.legacySources !== 0) reasons.push("LEGACY_SOURCE_ISOLATION_UNPROVEN");
  if (!metadataMatches) reasons.push("R2_OBJECT_METADATA_MISMATCH");

  const mime = clean(input.mimeType).toLowerCase();
  const providerBound = ["audio/", "video/"].some((prefix) => mime.startsWith(prefix)) || Boolean(clean(provenance?.provider));
  const explicitRightsReceipt = Boolean(clean(provenance?.rightsReceiptHash) || clean(provenance?.licenseReceiptHash) || clean(provenance?.termsVersion));
  const channelAuthored = !providerBound && Boolean(clean(provenance?.author) || clean(provenance?.actor) || clean(provenance?.executor));
  const declaredRightsAccepted = acceptedRightsDeclarations.has(clean(input.rightsDeclaredState));
  const rightsPass = provenanceState === "PASS" && declaredRightsAccepted && (channelAuthored || explicitRightsReceipt);
  const rightsVerificationState = rightsPass ? "PASS" : "RECEIPT_REQUIRED";
  const rightsBasis = rightsPass
    ? channelAuthored ? "CHANNEL_AUTHORED_EVALUATION_USE" : "EXPLICIT_RIGHTS_RECEIPT"
    : !declaredRightsAccepted ? "DECLARATION_NOT_ELIGIBLE" : providerBound && !explicitRightsReceipt ? "PROVIDER_TERMS_RECEIPT_MISSING" : "AUTHORSHIP_EVIDENCE_INCOMPLETE";
  if (!rightsPass) reasons.push(rightsBasis);

  return {
    bytesState,
    checksumState,
    provenanceState,
    rightsVerificationState,
    rightsBasis,
    verificationState: bytesState === "READBACK_VERIFIED" && checksumState === "PASS" && provenanceState === "PASS"
      ? rightsPass ? "EVIDENCE_VERIFIED" as const : "PARTIAL_RIGHTS_PENDING" as const
      : "BLOCKED" as const,
    reasons: [...new Set(reasons)],
  };
}

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
