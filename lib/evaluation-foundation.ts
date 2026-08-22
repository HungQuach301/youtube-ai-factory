export const EVALUATION_FOUNDATION_VERSION = "EVALUATION_FOUNDATION_V1" as const;
export const CORPUS_VERIFICATION_POLICY_VERSION = "CORPUS_VERIFICATION_POLICY_V1" as const;
export const CORPUS_VERIFICATION_MAXIMUM_BATCH = 20 as const;
export const CORPUS_VERIFICATION_MAXIMUM_OBJECT_BYTES = 100_000_000 as const;
export const EVALUATION_RIGHTS_EVIDENCE_POLICY_VERSION = "EVALUATION_RIGHTS_EVIDENCE_POLICY_V1" as const;
export const EVALUATION_OWNER_LABEL_POLICY_VERSION = "EVALUATION_OWNER_LABEL_POLICY_V1" as const;
export const EVALUATION_OWNER_REVIEW_UX_VERSION = "EVALUATION_OWNER_REVIEW_UX_V2" as const;
export const FACTORY_FIRST_QA_POLICY_VERSION = "FACTORY_FIRST_QA_POLICY_V1" as const;
export const FACTORY_FIRST_QA_MAXIMUM_BATCH = 5;
export const FACTORY_FIRST_QA_MAXIMUM_REQUEST_RESERVATION_USD = 0.08;
export const EVALUATION_CORRELATION_CONTROL_VERSION = "EVALUATION_CORRELATION_CONTROL_V1" as const;

export type OwnerLabelStatus = "PRESENT" | "ABSENT" | "NOT_APPLICABLE";
export type OwnerLabelDecision = "REJECTED_DEFECT_PRESENT" | "CLEAN_NEGATIVE_CONTROL" | "EXCLUDE_UNUSABLE";
export type OwnerLabelSubmission = {
  taskArtifactHash?: string;
  expectedArtifactHash?: string;
  rightsVerificationState?: string;
  verificationState?: string;
  lifecycleState?: string;
  releaseEligible?: boolean;
  decisionState?: string;
  rationale?: string;
  activeDefectKeys: string[];
  ownerObservableDefectKeys?: string[];
  labels: Array<{ defectKey?: string; status?: string; confidence?: number }>;
};

export type FactoryQaLabel = {
  defectKey?: string;
  status?: string;
  confidence?: number;
  rationale?: string;
};

export type FactoryQaResult = {
  decisionState?: string;
  summary?: string;
  labels?: FactoryQaLabel[];
};

export type OwnerObservableDefectInput = {
  defectModality?: string;
  candidateKind?: string;
  mimeType?: string;
};

export type CorrelationAssignment = {
  candidateId: string;
  exactArtifactHash: string;
  lineageGroupKey: string;
  representativeCandidateId: string;
  queueRole: "PRIMARY_REPRESENTATIVE" | "EXACT_DUPLICATE_DEFERRED" | "CORRELATED_VARIANT_DEFERRED";
  independentCountEligible: boolean;
};

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

export type EvaluationRightsQueueItem = { candidateKind?: string; rightsBasis?: string; provider?: string };
export type EvaluationRightsQueueSummary = { basisCounts: Array<{ key: string; count: number }>; kindCounts: Array<{ key: string; count: number }>; providerCounts: Array<{ key: string; count: number }> };

export type ProviderRightsEvidenceInput = {
  providerFamily?: string;
  providerRequestState?: string;
  providerResponseId?: string;
  artifactHash?: string;
  boundArtifactHash?: string;
  generationAt?: string;
  termsEffectiveAt?: string;
  termsSnapshotHash?: string;
  accountPlan?: string;
  planValidFrom?: string;
  planValidUntil?: string;
  planEvidenceHash?: string;
  commercialUseState?: string;
  modelId?: string;
};

export type CompositeRightsEvidenceInput = {
  artifactHash?: string;
  parentArtifactIds?: string[];
  parentArtifactHashes?: string[];
  parentRightsReceiptIds?: string[];
};

export type AuthorshipEvidenceInput = {
  artifactHash?: string;
  authorshipType?: string;
  authorIdentity?: string;
  sourceManifestId?: string;
  sourceManifestHash?: string;
  commercialUseState?: string;
  territory?: string;
  validFrom?: string;
};

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

export function normalizeOwnerLabelsForReceipt(labels: OwnerLabelSubmission["labels"]) {
  return labels.map((item) => {
    const status = clean(item.status);
    return {
      defectKey: clean(item.defectKey),
      status,
      confidence: status === "NOT_APPLICABLE" ? null : Number(item.confidence ?? 0),
    };
  }).sort((left, right) => left.defectKey.localeCompare(right.defectKey));
}

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
  const bases = new Map<string, number>(), kinds = new Map<string, number>(), providers = new Map<string, number>();
  for (const row of rows) {
    const basis = clean(row.rightsBasis);
    const provider = clean(row.provider).toLowerCase();
    const providerFamily = !provider ? "NO_PROVIDER_DECLARED"
      : provider.includes("eleven") ? "ELEVENLABS"
      : provider.includes("openai") || provider.includes("gpt") || provider.includes("dall-e") ? "OPENAI"
      : provider.includes("pexels") ? "PEXELS"
      : provider.includes("pixabay") ? "PIXABAY"
      : "OTHER_PROVIDER";
    increment(bases, knownRightsBases.has(basis) ? basis : basis ? "UNKNOWN_RIGHTS_BASIS" : "RIGHTS_BASIS_MISSING");
    increment(kinds, clean(row.candidateKind) || "UNKNOWN_KIND");
    increment(providers, providerFamily);
  }
  return { basisCounts: rankedCounts(bases), kindCounts: rankedCounts(kinds), providerCounts: rankedCounts(providers) };
}

const hash64 = (value: unknown) => /^[a-f0-9]{64}$/i.test(clean(value));
const parseTime = (value: unknown) => { const time = Date.parse(clean(value)); return Number.isFinite(time) ? time : null; };

export function isOwnerObservableDefect(input: OwnerObservableDefectInput) {
  const modality = clean(input.defectModality).toUpperCase(), kind = clean(input.candidateKind).toUpperCase(), mime = clean(input.mimeType).toLowerCase();
  const hasVisual = mime.startsWith("image/") || mime.startsWith("video/");
  const hasAudio = mime.startsWith("audio/") || mime.startsWith("video/");
  const hasContentContext = kind === "MASTER" || kind === "CLIP" || mime.startsWith("video/");
  if (modality === "VISUAL") return hasVisual;
  if (modality === "AUDIO") return hasAudio;
  if (modality === "AUDIO_VISUAL") return hasAudio && hasVisual;
  if (modality === "CONTENT") return hasContentContext;
  if (modality === "CONTENT_VISUAL") return hasContentContext && hasVisual;
  if (modality === "PACKAGING") return kind === "PACKAGING";
  return false;
}

export function evaluateOwnerLabelSubmission(input: OwnerLabelSubmission) {
  const reasons: string[] = [], activeKeys = input.activeDefectKeys.map(clean).filter(Boolean), seen = new Set<string>();
  const observableKeys = input.ownerObservableDefectKeys ? new Set(input.ownerObservableDefectKeys.map(clean).filter(Boolean)) : null;
  const expectedHash = clean(input.expectedArtifactHash).toLowerCase(), taskHash = clean(input.taskArtifactHash).toLowerCase();
  if (!hash64(expectedHash) || expectedHash !== taskHash) reasons.push("EXACT_ARTIFACT_HASH_BINDING_REQUIRED");
  if (input.rightsVerificationState !== "PASS") reasons.push("RIGHTS_PASS_REQUIRED");
  if (input.verificationState !== "EVIDENCE_VERIFIED") reasons.push("EVIDENCE_VERIFIED_REQUIRED");
  if (input.lifecycleState !== "CANDIDATE_EVIDENCE") reasons.push("CANDIDATE_EVIDENCE_STATE_REQUIRED");
  if (input.releaseEligible) reasons.push("RELEASE_ELIGIBLE_EVIDENCE_FORBIDDEN");
  if (!(["REJECTED_DEFECT_PRESENT", "CLEAN_NEGATIVE_CONTROL", "EXCLUDE_UNUSABLE"] as string[]).includes(clean(input.decisionState))) reasons.push("OWNER_DECISION_INVALID");
  if (clean(input.rationale).length < 12 || clean(input.rationale).length > 2000) reasons.push("OWNER_RATIONALE_LENGTH_INVALID");
  if (activeKeys.length === 0 || new Set(activeKeys).size !== activeKeys.length) reasons.push("ACTIVE_TAXONOMY_INVALID");
  let presentCount = 0, absentCount = 0, notApplicableCount = 0;
  for (const label of input.labels) {
    const key = clean(label.defectKey), status = clean(label.status);
    if (!key || seen.has(key)) reasons.push("DEFECT_LABEL_DUPLICATE_OR_MISSING_KEY");
    seen.add(key);
    if (!activeKeys.includes(key)) reasons.push(`UNKNOWN_DEFECT_KEY:${key || "EMPTY"}`);
    if (!["PRESENT", "ABSENT", "NOT_APPLICABLE"].includes(status)) reasons.push(`DEFECT_LABEL_STATUS_INVALID:${key || "EMPTY"}`);
    if (observableKeys && !observableKeys.has(key) && status !== "NOT_APPLICABLE") reasons.push(`SYSTEM_EVIDENCE_LABEL_MUST_BE_NOT_APPLICABLE:${key || "EMPTY"}`);
    if (status !== "NOT_APPLICABLE" && (!Number.isFinite(label.confidence) || Number(label.confidence) < 0 || Number(label.confidence) > 1)) reasons.push(`DEFECT_LABEL_CONFIDENCE_INVALID:${key || "EMPTY"}`);
    if (status === "PRESENT") presentCount += 1;
    if (status === "ABSENT") absentCount += 1;
    if (status === "NOT_APPLICABLE") notApplicableCount += 1;
  }
  if (seen.size !== activeKeys.length || activeKeys.some((key) => !seen.has(key))) reasons.push("FULL_TAXONOMY_COVERAGE_REQUIRED");
  if (observableKeys && [...observableKeys].some((key) => !activeKeys.includes(key))) reasons.push("OWNER_OBSERVABLE_TAXONOMY_INVALID");
  if (input.decisionState === "REJECTED_DEFECT_PRESENT" && presentCount === 0) reasons.push("REJECTED_DECISION_REQUIRES_PRESENT_DEFECT");
  if (input.decisionState === "CLEAN_NEGATIVE_CONTROL" && presentCount > 0) reasons.push("CLEAN_CONTROL_FORBIDS_PRESENT_DEFECT");
  return { eligible: reasons.length === 0, presentCount, absentCount, notApplicableCount, reasons: [...new Set(reasons)] };
}

export function evaluateFactoryQaResult(input: { result: FactoryQaResult; observableDefectKeys: string[] }) {
  const reasons: string[] = [];
  const expected = [...new Set(input.observableDefectKeys.map(clean).filter(Boolean))].sort();
  const labels = Array.isArray(input.result.labels) ? input.result.labels : [];
  const seen = new Set<string>();
  if (!["LIKELY_DEFECT_PRESENT", "LIKELY_CLEAN", "NEEDS_OWNER"].includes(clean(input.result.decisionState))) reasons.push("FACTORY_QA_DECISION_INVALID");
  if (clean(input.result.summary).length < 12 || clean(input.result.summary).length > 1200) reasons.push("FACTORY_QA_SUMMARY_INVALID");
  let presentCount = 0, uncertainCount = 0;
  for (const label of labels) {
    const key = clean(label.defectKey), status = clean(label.status), confidence = Number(label.confidence);
    if (!key || seen.has(key)) reasons.push("FACTORY_QA_LABEL_DUPLICATE_OR_MISSING");
    seen.add(key);
    if (!expected.includes(key)) reasons.push(`FACTORY_QA_LABEL_NOT_OBSERVABLE:${key || "EMPTY"}`);
    if (!["PRESENT", "ABSENT", "UNCERTAIN"].includes(status)) reasons.push(`FACTORY_QA_LABEL_STATUS_INVALID:${key || "EMPTY"}`);
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) reasons.push(`FACTORY_QA_CONFIDENCE_INVALID:${key || "EMPTY"}`);
    if (clean(label.rationale).length < 4 || clean(label.rationale).length > 500) reasons.push(`FACTORY_QA_RATIONALE_INVALID:${key || "EMPTY"}`);
    if (status === "PRESENT") presentCount += 1;
    if (status === "UNCERTAIN") uncertainCount += 1;
  }
  if (seen.size !== expected.length || expected.some((key) => !seen.has(key))) reasons.push("FACTORY_QA_FULL_OBSERVABLE_COVERAGE_REQUIRED");
  if (input.result.decisionState === "LIKELY_DEFECT_PRESENT" && presentCount === 0) reasons.push("FACTORY_QA_DEFECT_DECISION_REQUIRES_PRESENT");
  if (input.result.decisionState === "LIKELY_CLEAN" && (presentCount > 0 || uncertainCount > 0)) reasons.push("FACTORY_QA_CLEAN_REQUIRES_ALL_ABSENT");
  if (input.result.decisionState === "NEEDS_OWNER" && uncertainCount === 0) reasons.push("FACTORY_QA_OWNER_DECISION_REQUIRES_UNCERTAINTY");
  return { eligible: reasons.length === 0, presentCount, uncertainCount, reasons: [...new Set(reasons)] };
}

export function evaluateCorrelationAssignments(items: CorrelationAssignment[]) {
  const reasons: string[] = [], candidateIds = new Set<string>(), lineages = new Map<string, CorrelationAssignment[]>(), hashes = new Map<string, CorrelationAssignment[]>();
  for (const item of items) {
    if (!clean(item.candidateId) || candidateIds.has(item.candidateId)) reasons.push("CORRELATION_CANDIDATE_DUPLICATE_OR_MISSING");
    candidateIds.add(item.candidateId);
    if (!hash64(item.exactArtifactHash)) reasons.push(`CORRELATION_HASH_INVALID:${clean(item.candidateId)}`);
    if (!clean(item.lineageGroupKey)) reasons.push(`CORRELATION_LINEAGE_MISSING:${clean(item.candidateId)}`);
    const lineage = lineages.get(item.lineageGroupKey) ?? []; lineage.push(item); lineages.set(item.lineageGroupKey, lineage);
    const hash = hashes.get(clean(item.exactArtifactHash).toLowerCase()) ?? []; hash.push(item); hashes.set(clean(item.exactArtifactHash).toLowerCase(), hash);
    if ((item.queueRole === "PRIMARY_REPRESENTATIVE") !== item.independentCountEligible) reasons.push(`CORRELATION_INDEPENDENCE_ROLE_MISMATCH:${clean(item.candidateId)}`);
  }
  for (const [key, group] of lineages) {
    const primaries = group.filter((item) => item.queueRole === "PRIMARY_REPRESENTATIVE");
    if (primaries.length !== 1) reasons.push(`CORRELATION_PRIMARY_CARDINALITY:${key}`);
    const representative = primaries[0]?.candidateId;
    if (representative && group.some((item) => item.representativeCandidateId !== representative)) reasons.push(`CORRELATION_REPRESENTATIVE_BINDING_MISMATCH:${key}`);
  }
  for (const [hash, group] of hashes) if (group.filter((item) => item.queueRole !== "EXACT_DUPLICATE_DEFERRED").length !== 1) reasons.push(`EXACT_HASH_REPRESENTATIVE_CARDINALITY:${hash}`);
  return {
    eligible: reasons.length === 0,
    candidateCount: items.length,
    primaryRepresentatives: items.filter((item) => item.queueRole === "PRIMARY_REPRESENTATIVE").length,
    exactDuplicatesDeferred: items.filter((item) => item.queueRole === "EXACT_DUPLICATE_DEFERRED").length,
    correlatedVariantsDeferred: items.filter((item) => item.queueRole === "CORRELATED_VARIANT_DEFERRED").length,
    reasons: [...new Set(reasons)],
  };
}

export function evaluateProviderRightsEvidence(input: ProviderRightsEvidenceInput) {
  const reasons: string[] = [];
  const generated = parseTime(input.generationAt), termsEffective = parseTime(input.termsEffectiveAt), planFrom = parseTime(input.planValidFrom), planUntil = clean(input.planValidUntil) ? parseTime(input.planValidUntil) : null;
  if (clean(input.providerFamily) !== "ELEVENLABS") reasons.push("SUPPORTED_PROVIDER_FAMILY_REQUIRED");
  if (clean(input.providerRequestState) !== "COMPLETED") reasons.push("COMPLETED_PROVIDER_REQUEST_REQUIRED");
  if (!clean(input.providerResponseId)) reasons.push("PROVIDER_RESPONSE_ID_REQUIRED");
  if (!hash64(input.artifactHash) || clean(input.artifactHash).toLowerCase() !== clean(input.boundArtifactHash).toLowerCase()) reasons.push("EXACT_ARTIFACT_HASH_BINDING_REQUIRED");
  if (generated === null) reasons.push("GENERATION_TIMESTAMP_REQUIRED");
  if (!hash64(input.termsSnapshotHash)) reasons.push("TERMS_SNAPSHOT_HASH_REQUIRED");
  if (termsEffective === null || generated === null || termsEffective > generated) reasons.push("TERMS_MUST_COVER_GENERATION_TIME");
  if (!clean(input.accountPlan) || clean(input.accountPlan).toLowerCase() === "free") reasons.push("PAID_PLAN_REQUIRED");
  if (!hash64(input.planEvidenceHash)) reasons.push("PLAN_EVIDENCE_HASH_REQUIRED");
  if (planFrom === null || generated === null || planFrom > generated || (planUntil !== null && planUntil < generated)) reasons.push("PLAN_MUST_COVER_GENERATION_TIME");
  if (clean(input.commercialUseState) !== "VERIFIED_PAID_COMMERCIAL_USE") reasons.push("COMMERCIAL_USE_NOT_VERIFIED");
  if (!clean(input.modelId)) reasons.push("MODEL_ID_REQUIRED");
  return { eligible: reasons.length === 0, rightsState: reasons.length === 0 ? "PASS" as const : "RECEIPT_REQUIRED" as const, reasons: [...new Set(reasons)] };
}

export function evaluateCompositeRightsEvidence(input: CompositeRightsEvidenceInput) {
  const reasons: string[] = [];
  const parents = input.parentArtifactIds ?? [], hashes = input.parentArtifactHashes ?? [], receipts = input.parentRightsReceiptIds ?? [];
  if (!hash64(input.artifactHash)) reasons.push("COMPOSITE_ARTIFACT_HASH_REQUIRED");
  if (parents.length === 0) reasons.push("PARENT_ARTIFACT_SET_REQUIRED");
  if (parents.some((value) => !clean(value)) || new Set(parents).size !== parents.length) reasons.push("PARENT_ARTIFACT_SET_INVALID");
  if (hashes.length !== parents.length || hashes.some((value) => !hash64(value))) reasons.push("PARENT_HASH_COVERAGE_INCOMPLETE");
  if (receipts.length !== parents.length || receipts.some((value) => !clean(value))) reasons.push("PARENT_RIGHTS_RECEIPT_COVERAGE_INCOMPLETE");
  return { eligible: reasons.length === 0, rightsState: reasons.length === 0 ? "PASS" as const : "RECEIPT_REQUIRED" as const, parentCount: parents.length, verifiedParentCount: reasons.length === 0 ? parents.length : 0, reasons: [...new Set(reasons)] };
}

export function evaluateAuthorshipEvidence(input: AuthorshipEvidenceInput) {
  const reasons: string[] = [], type = clean(input.authorshipType);
  if (!hash64(input.artifactHash)) reasons.push("AUTHORSHIP_ARTIFACT_HASH_REQUIRED");
  if (!["CHANNEL_ORIGINAL", "WORK_FOR_HIRE", "RENDERED_COMPOSITE"].includes(type)) reasons.push("AUTHORSHIP_TYPE_REQUIRED");
  if (!clean(input.authorIdentity)) reasons.push("AUTHOR_IDENTITY_REQUIRED");
  if (type === "RENDERED_COMPOSITE" && (!clean(input.sourceManifestId) || !hash64(input.sourceManifestHash))) reasons.push("COMPOSITE_SOURCE_MANIFEST_REQUIRED");
  if (clean(input.commercialUseState) !== "VERIFIED_COMMERCIAL_USE") reasons.push("COMMERCIAL_USE_NOT_VERIFIED");
  if (!clean(input.territory)) reasons.push("TERRITORY_REQUIRED");
  if (parseTime(input.validFrom) === null) reasons.push("VALID_FROM_REQUIRED");
  return { eligible: reasons.length === 0, rightsState: reasons.length === 0 ? "PASS" as const : "RECEIPT_REQUIRED" as const, reasons: [...new Set(reasons)] };
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
