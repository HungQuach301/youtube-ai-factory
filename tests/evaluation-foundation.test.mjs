import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  EVALUATION_FOUNDATION_VERSION,
  CORPUS_VERIFICATION_POLICY_VERSION,
  EVALUATION_RIGHTS_EVIDENCE_POLICY_VERSION,
  EVALUATION_RIGHTS_LINEAGE_DIAGNOSTIC_VERSION,
  EVALUATION_PROVIDER_BINDING_DIAGNOSTIC_VERSION,
  EVALUATION_PROVIDER_HISTORY_RECOVERY_VERSION,
  EVALUATION_PROVIDER_AUDIO_HASH_RECOVERY_VERSION,
  EVALUATION_HISTORICAL_RECOVERY_CLOSURE_VERSION,
  CONTROLLED_FIXTURE_PLAN_VERSION,
  CONTROLLED_FIXTURE_MATERIALIZATION_VERSION,
  EVALUATION_OWNER_LABEL_POLICY_VERSION,
  EVALUATION_OWNER_REVIEW_UX_VERSION,
  EVALUATION_CORRELATION_CONTROL_VERSION,
  FACTORY_FIRST_QA_POLICY_VERSION,
  FACTORY_FIRST_QA_MAXIMUM_BATCH,
  FACTORY_BROWSER_QA_POLICY_VERSION,
  WP7_REGRESSION_CORPUS_POLICY_VERSION,
  WP7_REGRESSION_REFERENCE_MINIMUM,
  WP7_REGRESSION_REFERENCE_MAXIMUM,
  OWNER_STANDING_AUTHORITY,
  evaluateAuthorshipEvidence,
  evaluateAssuranceQualification,
  evaluateCandidateVerification,
  evaluateCompositeRightsEvidence,
  evaluateProviderRightsEvidence,
  evaluateOwnerLabelSubmission,
  evaluateFactoryQaResult,
  evaluateFactoryBrowserQaEvidence,
  assessWp7RegressionReadiness,
  isOwnerObservableDefect,
  normalizeOwnerLabelsForReceipt,
  evaluateCorrelationAssignments,
  reconcileCorpusArtifactEvidence,
  standingAuthorityCovers,
  summarizeCorpusEvidenceConflicts,
  summarizeEvaluationRightsQueue,
  summarizeEvaluationInventory,
} from "../lib/evaluation-foundation.ts";
import { EVALUATION_CURRENT_RIGHTS_EVIDENCE_CAPTURE_VERSION } from "../lib/clean-audio-rights-evidence.ts";
import { COMMERCIAL_CLEAN_AUDIO_RECOVERY_VERSION, COMMERCIAL_CLEAN_AUDIO_REGENERATION_VERSION, FACTORY_AUDIO_QA_OUTPUT_CONTRACT_VERSION, FACTORY_AUDIO_QA_POLICY_VERSION, FACTORY_AUDIO_QA_RECOVERY_VERSION } from "../lib/commercial-clean-audio-regeneration.ts";
import { CLEAN_AUDIO_OWNER_DEFECT_KEYS, CLEAN_AUDIO_OWNER_GROUND_TRUTH_VERSION } from "../lib/clean-audio-owner-ground-truth.ts";
import { CLEAN_AUDIO_CONTROL_ELIGIBILITY_VERSION, evaluateCleanAudioControlEligibilityAuthorized } from "../lib/clean-audio-control-eligibility.ts";
import { canonicalStringify } from "../lib/canonical-json.ts";
import { applyDeterministicImageSignals, detectedRasterMime, prepareImageReviewSurface } from "../lib/image-review-surface.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

test("standing production authority is durable but never bypasses dispatch or publishing gates", () => {
  assert.equal(OWNER_STANDING_AUTHORITY.version, "OWNER_STANDING_PRODUCTION_AUTHORITY_V1");
  assert.equal(standingAuthorityCovers("PRODUCTION_DEPLOY"), true);
  assert.equal(standingAuthorityCovers("PROVIDER_DISPATCH"), true);
  assert.equal(standingAuthorityCovers("PUBLICATION"), false);
  assert.equal(standingAuthorityCovers("AUTO_PUBLISH"), false);
  for (const prerequisite of ["CAPABILITY_AND_SETTINGS_CURRENT", "ATOMIC_BUDGET_RESERVATION", "RIGHTS_ELIGIBLE", "SAFETY_SCOPE_PASS", "IDEMPOTENCY_AND_FENCING_VALID"]) {
    assert.ok(OWNER_STANDING_AUTHORITY.prerequisites.includes(prerequisite));
  }
});

test("historical evidence remains ineligible until every fixture proof is verified", () => {
  const candidate = evaluateCandidateVerification({
    bytesState: "NOT_VERIFIED", checksumState: "DECLARED_UNVERIFIED", provenanceState: "DECLARED_UNVERIFIED",
    ownerDecisionState: "INHERITED_PACKAGE_REJECTION", defectLabelState: "NOT_LABELLED", rightsVerificationState: "NOT_VERIFIED",
    correlationGroup: "package-1", duplicateCount: 1, releaseEligible: false,
  });
  assert.equal(candidate.eligible, false);
  assert.equal(candidate.lifecycleState, "CANDIDATE_EVIDENCE");
  assert.ok(candidate.reasons.includes("OWNER_DECISION_NOT_CONFIRMED"));

  const verified = evaluateCandidateVerification({
    bytesState: "READBACK_VERIFIED", checksumState: "PASS", provenanceState: "PASS", ownerDecisionState: "OWNER_CONFIRMED",
    defectLabelState: "LABELLED", rightsVerificationState: "PASS", correlationGroup: "package-2", duplicateCount: 1, releaseEligible: false,
  });
  assert.equal(verified.eligible, true);
  assert.equal(verified.lifecycleState, "GOLD_ELIGIBLE");
});

test("duplicate and correlated revisions never increase the gold count", () => {
  const verified = {
    bytesState: "READBACK_VERIFIED", checksumState: "PASS", provenanceState: "PASS", ownerDecisionState: "OWNER_CONFIRMED",
    defectLabelState: "LABELLED", rightsVerificationState: "PASS", correlationGroup: "revision-family", releaseEligible: false,
  };
  const summary = summarizeEvaluationInventory([
    { id: "a", contentHash: "same", ...verified },
    { id: "b", contentHash: "same", ...verified },
    { id: "c", contentHash: "unique", ...verified, correlationGroup: "independent" },
  ]);
  assert.equal(summary.candidates, 3);
  assert.equal(summary.duplicateHashes, 1);
  assert.equal(summary.goldEligible, 1);
});

test("corpus reconciliation binds D1 declarations to exact R2 bytes and metadata", () => {
  const base = {
    candidateId: "candidate-1", sourceArtifactId: "artifact-1", sourcePackageId: "package-1", storageKey: "production-v2/package-1/scene.svg",
    declaredHash: "a".repeat(64), computedHash: "a".repeat(64), declaredBytes: 120, actualBytes: 120, mimeType: "image/svg+xml", artifactType: "FULL_SCENE",
    engineVersion: "PRODUCTION_ENGINE_V2_GREENFIELD", rightsDeclaredState: "CHANNEL_OWNED_OR_PROVIDER_COMMERCIAL", provenance: { author: "PRODUCTION_ENGINE_V2_GREENFIELD", legacySources: 0 }, objectFound: true,
    objectMetadata: { artifactId: "artifact-1", packageId: "package-1", sha256: "a".repeat(64), engineVersion: "PRODUCTION_ENGINE_V2_GREENFIELD" },
  };
  const verified = reconcileCorpusArtifactEvidence(base);
  assert.equal(CORPUS_VERIFICATION_POLICY_VERSION, "CORPUS_VERIFICATION_POLICY_V1");
  assert.deepEqual({ bytes: verified.bytesState, checksum: verified.checksumState, provenance: verified.provenanceState, rights: verified.rightsVerificationState, state: verified.verificationState }, {
    bytes: "READBACK_VERIFIED", checksum: "PASS", provenance: "PASS", rights: "PASS", state: "EVIDENCE_VERIFIED",
  });
  const providerAudio = reconcileCorpusArtifactEvidence({ ...base, mimeType: "audio/mpeg", artifactType: "PILOT_NARRATION", provenance: { provider: "ElevenLabs", model: "eleven_multilingual_v2", legacySources: 0 } });
  assert.equal(providerAudio.rightsVerificationState, "RECEIPT_REQUIRED");
  assert.equal(providerAudio.verificationState, "PARTIAL_RIGHTS_PENDING");
  const mismatched = reconcileCorpusArtifactEvidence({ ...base, computedHash: "b".repeat(64), objectMetadata: { ...base.objectMetadata, artifactId: "wrong" } });
  assert.equal(mismatched.checksumState, "FAIL");
  assert.equal(mismatched.provenanceState, "FAIL");
  assert.equal(mismatched.verificationState, "BLOCKED");
});

test("assurance qualification requires calibrated P0 floors, blind data, repeatability and zero escapes", () => {
  const base = {
    datasetState: "SEALED", blinded: true, correlatedItems: 0, distinctItems: 12, minimumDistinctItems: 10,
    maximumCostUsd: 2, actualCostUsd: 1,
  };
  const uncalibrated = evaluateAssuranceQualification({ ...base, families: [
    { defectKey: "SAFETY_SCOPE_ESCAPE", severity: "P0", recall: 1, precision: 1, repeatability: 1, p0EscapeCount: 0 },
  ] });
  assert.equal(uncalibrated.state, "CALIBRATION_REQUIRED");
  const qualified = evaluateAssuranceQualification({ ...base, families: [
    { defectKey: "SAFETY_SCOPE_ESCAPE", severity: "P0", approvedRecallFloor: 0.95, recall: 1, precision: 0.98, repeatability: 1, p0EscapeCount: 0 },
    { defectKey: "AUDIO_SEAM", severity: "P1", approvedRecallFloor: 0.9, recall: 0.95, precision: 0.9, repeatability: 0.95, p0EscapeCount: 0 },
  ] });
  assert.equal(qualified.eligible, true);
  const escaped = evaluateAssuranceQualification({ ...base, families: [
    { defectKey: "SAFETY_SCOPE_ESCAPE", severity: "P0", approvedRecallFloor: 0.95, recall: 1, precision: 1, repeatability: 1, p0EscapeCount: 1 },
  ] });
  assert.equal(escaped.eligible, false);
  assert.ok(escaped.reasons.includes("P0_ESCAPE_DETECTED:SAFETY_SCOPE_ESCAPE"));
});

test("migration 0052 inventories rejected artifacts as unverified non-release evidence with zero spend", () => {
  const migration = read("drizzle/0052_evaluation_foundation.sql");
  for (const table of [
    "v7_evaluation_foundation_registry", "v7_evaluation_corpus_sources", "v7_evaluation_candidates", "v7_evaluation_defect_taxonomy",
    "v7_evaluation_defect_labels", "v7_evaluation_datasets", "v7_evaluation_dataset_items", "v7_assurance_qualification_runs",
    "v7_assurance_qualification_results", "v7_evaluation_inventory_snapshots",
  ]) assert.match(migration, new RegExp(table));
  assert.doesNotMatch(migration, /api\.openai\.com|elevenlabs\.io|pexels\.com\/v1/);

  const db = new DatabaseSync(":memory:");
  const migrations = readdirSync(new URL("../drizzle", import.meta.url)).filter((name) => name.endsWith(".sql")).sort();
  const foundationIndex = migrations.indexOf("0052_evaluation_foundation.sql");
  for (const file of migrations.slice(0, foundationIndex)) db.exec(read(`drizzle/${file}`));
  db.exec("PRAGMA foreign_keys=OFF");
  db.prepare(`INSERT INTO production_v2_packages
    (id,channel_id,policy_id,source_brief_id,episode_concept_id,package_version,title,lifecycle_state,target_duration_seconds,shot_count,content_hash)
    VALUES ('historical-package','channel-test','policy-test','brief-test','episode-test',1,'Rejected package','REJECTED_QUALITY',600,2,?)`).run("a".repeat(64));
  const packageId = "historical-package";
  const insert = db.prepare(`INSERT INTO production_v2_artifacts
    (id,package_id,artifact_type,storage_key,mime_type,byte_size,sha256,rights_state,provenance_json)
    VALUES (?,?,?,?,?,?,?,?,?)`);
  const sameHash = "b".repeat(64);
  insert.run("historical-a", packageId, "VISUAL_FRAME", "history/a.png", "image/png", 100, sameHash, "COMMERCIAL_LICENSE_VERIFIED", "{}");
  insert.run("historical-b", packageId, "VISUAL_FRAME", "history/b.png", "image/png", 100, sameHash, "COMMERCIAL_LICENSE_VERIFIED", "{}");
  db.exec("PRAGMA foreign_keys=ON");
  db.exec(migration);
  assert.equal(EVALUATION_FOUNDATION_VERSION, "EVALUATION_FOUNDATION_V1");
  assert.equal(db.prepare("SELECT COUNT(*) total FROM v7_evaluation_foundation_registry").get().total, 6);
  assert.equal(db.prepare("SELECT COUNT(*) total FROM v7_evaluation_defect_taxonomy").get().total, 11);
  const inventory = db.prepare("SELECT * FROM v7_evaluation_inventory_snapshots LIMIT 1").get();
  assert.equal(inventory.candidate_artifacts, 2);
  assert.equal(inventory.rejected_packages, 1);
  assert.equal(inventory.duplicate_hash_groups, 1);
  assert.equal(inventory.gold_eligible, 0);
  const candidates = db.prepare("SELECT lifecycle_state,bytes_state,checksum_state,owner_decision_state,defect_label_state,release_eligible,qualification_eligible FROM v7_evaluation_candidates").all();
  assert.equal(candidates.length, 2);
  for (const candidate of candidates) assert.deepEqual({ ...candidate }, {
    lifecycle_state: "CANDIDATE_EVIDENCE", bytes_state: "NOT_VERIFIED", checksum_state: "DECLARED_UNVERIFIED",
    owner_decision_state: "INHERITED_PACKAGE_REJECTION", defect_label_state: "NOT_LABELLED", release_eligible: 0, qualification_eligible: 0,
  });
  const zero = db.prepare("SELECT SUM(provider_requests) requests,SUM(spend_usd) spend FROM v7_evaluation_foundation_registry").get();
  assert.equal(zero.requests, 0);
  assert.equal(zero.spend, 0);
  assert.throws(() => db.prepare("UPDATE v7_evaluation_candidates SET release_eligible=1 WHERE id='evaluation-candidate:historical-a'").run(), /CHECK constraint failed/);
});

test("blocked corpus diagnostics aggregate sanitized immutable receipt conflicts", () => {
  const summary = summarizeCorpusEvidenceConflicts([
    { candidateKind: "SHOT", bytesState: "READBACK_VERIFIED", checksumState: "FAIL", provenanceState: "FAIL", reconciliationReasonsJson: '["CHECKSUM_MISMATCH","R2_OBJECT_METADATA_MISMATCH","AUTHORSHIP_EVIDENCE_INCOMPLETE"]', candidateDeclaredHash: "a", sourceHash: "a", computedHash: "b", sourceArtifactId: "artifact-1", sourcePackageId: "package-1", sourceEngineVersion: "v1", objectMetadataJson: '{"artifactId":"artifact-1","packageId":"package-1","sha256":"a","engineVersion":"v1"}' },
    { candidateKind: "SHOT", bytesState: "READBACK_VERIFIED", checksumState: "PASS", provenanceState: "FAIL", reconciliationReasonsJson: '["R2_OBJECT_METADATA_MISMATCH"]', candidateDeclaredHash: "c", sourceHash: "c", computedHash: "c", sourceArtifactId: "artifact-2", sourcePackageId: "package-2", sourceEngineVersion: "v2", objectMetadataJson: '{"artifactId":"artifact-2","packageId":"package-2","sha256":"c","engineVersion":"old"}' },
    { candidateKind: "AUDIO", bytesState: "READBACK_VERIFIED", checksumState: "FAIL", provenanceState: "FAIL", reconciliationReasonsJson: '["UNRECOGNIZED_DETAIL"]' },
  ]);
  assert.equal(summary.blockedCandidates, 3);
  assert.deepEqual(summary.reasonCounts, [
    { key: "R2_OBJECT_METADATA_MISMATCH", count: 2 },
    { key: "AUTHORSHIP_EVIDENCE_INCOMPLETE", count: 1 },
    { key: "CHECKSUM_MISMATCH", count: 1 },
    { key: "UNKNOWN_RECONCILIATION_REASON", count: 1 },
  ]);
  assert.deepEqual(summary.kindCounts, [{ key: "SHOT", count: 2 }, { key: "AUDIO", count: 1 }]);
  assert.deepEqual(summary.factCounts, [
    { key: "R2_ENGINE_VERSION_FIELD_MISMATCH", count: 1 },
    { key: "R2_METADATA_HASH_OBJECT_BYTES_MISMATCH", count: 1 },
    { key: "SOURCE_HASH_OBJECT_BYTES_MISMATCH", count: 1 },
  ]);
  assert.equal(summary.stateCounts.length, 2);
});

test("rights queue diagnostics expose only allowlisted basis and modality counts", () => {
  const summary = summarizeEvaluationRightsQueue([
    { candidateKind: "AUDIO", rightsBasis: "PROVIDER_TERMS_RECEIPT_MISSING", provider: "ElevenLabs" },
    { candidateKind: "CLIP", rightsBasis: "AUTHORSHIP_EVIDENCE_INCOMPLETE", provider: "Pexels" },
    { candidateKind: "CLIP", rightsBasis: "UNSAFE_RAW_DETAIL" },
  ]);
  assert.deepEqual(summary.basisCounts, [
    { key: "AUTHORSHIP_EVIDENCE_INCOMPLETE", count: 1 },
    { key: "PROVIDER_TERMS_RECEIPT_MISSING", count: 1 },
    { key: "UNKNOWN_RIGHTS_BASIS", count: 1 },
  ]);
  assert.deepEqual(summary.kindCounts, [{ key: "CLIP", count: 2 }, { key: "AUDIO", count: 1 }]);
  assert.deepEqual(summary.providerCounts, [
    { key: "ELEVENLABS", count: 1 }, { key: "NO_PROVIDER_DECLARED", count: 1 }, { key: "PEXELS", count: 1 },
  ]);
});

test("rights evidence contracts fail closed on current terms, package-level inference and incomplete parent coverage", () => {
  assert.equal(EVALUATION_RIGHTS_EVIDENCE_POLICY_VERSION, "EVALUATION_RIGHTS_EVIDENCE_POLICY_V1");
  const currentTermsOnly = evaluateProviderRightsEvidence({
    providerFamily: "ELEVENLABS", providerRequestState: "COMPLETED", providerResponseId: "response-1",
    artifactHash: "a".repeat(64), boundArtifactHash: "a".repeat(64), generationAt: "2026-02-01T00:00:00Z",
    termsEffectiveAt: "2026-03-31T00:00:00Z", termsSnapshotHash: "b".repeat(64), accountPlan: "creator",
    planValidFrom: "2026-01-01T00:00:00Z", planValidUntil: "2026-03-01T00:00:00Z", planEvidenceHash: "c".repeat(64),
    commercialUseState: "VERIFIED_PAID_COMMERCIAL_USE", modelId: "eleven_multilingual_v2",
  });
  assert.equal(currentTermsOnly.eligible, false);
  assert.ok(currentTermsOnly.reasons.includes("TERMS_MUST_COVER_GENERATION_TIME"));

  const exactProviderReceipt = evaluateProviderRightsEvidence({
    providerFamily: "ELEVENLABS", providerRequestState: "COMPLETED", providerResponseId: "response-1",
    artifactHash: "a".repeat(64), boundArtifactHash: "a".repeat(64), generationAt: "2026-02-01T00:00:00Z",
    termsEffectiveAt: "2026-01-01T00:00:00Z", termsSnapshotHash: "b".repeat(64), accountPlan: "creator",
    planValidFrom: "2026-01-01T00:00:00Z", planValidUntil: "2026-03-01T00:00:00Z", planEvidenceHash: "c".repeat(64),
    commercialUseState: "VERIFIED_PAID_COMMERCIAL_USE", modelId: "eleven_multilingual_v2",
  });
  assert.equal(exactProviderReceipt.eligible, true);

  const incompleteMaster = evaluateCompositeRightsEvidence({ artifactHash: "d".repeat(64), parentArtifactIds: ["audio", "scene"], parentArtifactHashes: ["e".repeat(64)], parentRightsReceiptIds: ["receipt-a"] });
  assert.equal(incompleteMaster.eligible, false);
  assert.ok(incompleteMaster.reasons.includes("PARENT_HASH_COVERAGE_INCOMPLETE"));
  assert.ok(incompleteMaster.reasons.includes("PARENT_RIGHTS_RECEIPT_COVERAGE_INCOMPLETE"));

  const unboundRender = evaluateAuthorshipEvidence({ artifactHash: "f".repeat(64), authorshipType: "RENDERED_COMPOSITE", authorIdentity: "PRODUCTION_ENGINE_V2_GREENFIELD_EXECUTOR", commercialUseState: "VERIFIED_COMMERCIAL_USE", territory: "WORLDWIDE", validFrom: "2026-01-01T00:00:00Z" });
  assert.equal(unboundRender.eligible, false);
  assert.ok(unboundRender.reasons.includes("COMPOSITE_SOURCE_MANIFEST_REQUIRED"));
});

test("owner labels bind exact bytes, require full taxonomy coverage and keep decisions internally consistent", () => {
  assert.equal(EVALUATION_OWNER_LABEL_POLICY_VERSION, "EVALUATION_OWNER_LABEL_POLICY_V1");
  const base = {
    taskArtifactHash: "a".repeat(64), expectedArtifactHash: "a".repeat(64), rightsVerificationState: "PASS",
    verificationState: "EVIDENCE_VERIFIED", lifecycleState: "CANDIDATE_EVIDENCE", releaseEligible: false,
    rationale: "Observable artifact defect confirmed by owner playback.", activeDefectKeys: ["AUDIO_SEAM", "SAFETY_SCOPE_ESCAPE"],
  };
  const rejected = evaluateOwnerLabelSubmission({ ...base, decisionState: "REJECTED_DEFECT_PRESENT", labels: [
    { defectKey: "AUDIO_SEAM", status: "PRESENT", confidence: 1 }, { defectKey: "SAFETY_SCOPE_ESCAPE", status: "ABSENT", confidence: 1 },
  ] });
  assert.equal(rejected.eligible, true);
  assert.equal(rejected.presentCount, 1);
  const incomplete = evaluateOwnerLabelSubmission({ ...base, decisionState: "REJECTED_DEFECT_PRESENT", labels: [{ defectKey: "AUDIO_SEAM", status: "PRESENT", confidence: 1 }] });
  assert.equal(incomplete.eligible, false);
  assert.ok(incomplete.reasons.includes("FULL_TAXONOMY_COVERAGE_REQUIRED"));
  const falseClean = evaluateOwnerLabelSubmission({ ...base, decisionState: "CLEAN_NEGATIVE_CONTROL", labels: [
    { defectKey: "AUDIO_SEAM", status: "PRESENT", confidence: 1 }, { defectKey: "SAFETY_SCOPE_ESCAPE", status: "ABSENT", confidence: 1 },
  ] });
  assert.ok(falseClean.reasons.includes("CLEAN_CONTROL_FORBIDS_PRESENT_DEFECT"));
  const wrongHash = evaluateOwnerLabelSubmission({ ...base, expectedArtifactHash: "b".repeat(64), decisionState: "EXCLUDE_UNUSABLE", labels: [
    { defectKey: "AUDIO_SEAM", status: "NOT_APPLICABLE" }, { defectKey: "SAFETY_SCOPE_ESCAPE", status: "NOT_APPLICABLE" },
  ] });
  assert.ok(wrongHash.reasons.includes("EXACT_ARTIFACT_HASH_BINDING_REQUIRED"));
});

test("owner form labels are canonical-safe before request hashing", () => {
  const labels = normalizeOwnerLabelsForReceipt([
    { defectKey: "AUDIO_SEAM", status: "PRESENT", confidence: 1 },
    { defectKey: "RIGHTS_LINEAGE_MISSING", status: "NOT_APPLICABLE" },
    { defectKey: "MASTER_LINEAGE_INVALID", status: "NOT_APPLICABLE", confidence: undefined },
  ]);
  assert.deepEqual(labels, [
    { defectKey: "AUDIO_SEAM", status: "PRESENT", confidence: 1 },
    { defectKey: "MASTER_LINEAGE_INVALID", status: "NOT_APPLICABLE", confidence: null },
    { defectKey: "RIGHTS_LINEAGE_MISSING", status: "NOT_APPLICABLE", confidence: null },
  ]);
  assert.doesNotThrow(() => canonicalStringify({ action: "RECORD_OWNER_LABEL_RECEIPT", labels }));
});

test("owner review exposes only defects observable from the candidate media", () => {
  assert.equal(EVALUATION_OWNER_REVIEW_UX_VERSION, "EVALUATION_OWNER_REVIEW_UX_V2");
  assert.equal(isOwnerObservableDefect({ defectModality: "AUDIO", candidateKind: "AUDIO", mimeType: "audio/mpeg" }), true);
  assert.equal(isOwnerObservableDefect({ defectModality: "VISUAL", candidateKind: "AUDIO", mimeType: "audio/mpeg" }), false);
  assert.equal(isOwnerObservableDefect({ defectModality: "AUDIO_VISUAL", candidateKind: "MASTER", mimeType: "video/webm" }), true);
  assert.equal(isOwnerObservableDefect({ defectModality: "CONTENT", candidateKind: "MASTER", mimeType: "video/webm" }), true);
  assert.equal(isOwnerObservableDefect({ defectModality: "PACKAGING", candidateKind: "PACKAGING", mimeType: "image/png" }), true);
  assert.equal(isOwnerObservableDefect({ defectModality: "RIGHTS", candidateKind: "MASTER", mimeType: "video/webm" }), false);
  assert.equal(isOwnerObservableDefect({ defectModality: "MASTER", candidateKind: "MASTER", mimeType: "video/webm" }), false);

  const scopedInput = {
    taskArtifactHash: "a".repeat(64), expectedArtifactHash: "a".repeat(64), rightsVerificationState: "PASS",
    verificationState: "EVIDENCE_VERIFIED", lifecycleState: "CANDIDATE_EVIDENCE", releaseEligible: false,
    decisionState: "REJECTED_DEFECT_PRESENT", rationale: "Audible seam at 00:42 during owner playback.",
    activeDefectKeys: ["AUDIO_SEAM", "RIGHTS_LINEAGE_MISSING"], ownerObservableDefectKeys: ["AUDIO_SEAM"],
    labels: [{ defectKey: "AUDIO_SEAM", status: "PRESENT", confidence: 1 }, { defectKey: "RIGHTS_LINEAGE_MISSING", status: "NOT_APPLICABLE" }],
  };
  const scoped = evaluateOwnerLabelSubmission(scopedInput);
  assert.equal(scoped.eligible, true);
  const fabricatedSystemVerdict = evaluateOwnerLabelSubmission({ ...scopedInput, labels: [
    { defectKey: "AUDIO_SEAM", status: "PRESENT", confidence: 1 }, { defectKey: "RIGHTS_LINEAGE_MISSING", status: "ABSENT", confidence: 1 },
  ] });
  assert.ok(fabricatedSystemVerdict.reasons.includes("SYSTEM_EVIDENCE_LABEL_MUST_BE_NOT_APPLICABLE:RIGHTS_LINEAGE_MISSING"));
});

test("migration 0058 creates immutable zero-spend owner-label tasks without fixture promotion", () => {
  const migration = read("drizzle/0058_evaluation_owner_label_workflow.sql");
  for (const table of ["v7_evaluation_owner_label_tasks", "v7_evaluation_owner_label_receipts", "v7_evaluation_defect_labels"]) assert.match(migration, new RegExp(table));
  assert.match(migration, /EVALUATION_OWNER_LABEL_POLICY_V1/);
  assert.match(migration, /verification_state='EVIDENCE_VERIFIED'/);
  assert.match(migration, /rights_verification_state='PASS'/);
  assert.match(migration, /EVALUATION_OWNER_LABEL_RECEIPT_IMMUTABLE/);
  assert.match(migration, /EVALUATION_DEFECT_LABEL_IMMUTABLE/);
  assert.doesNotMatch(migration, /GOLD_ELIGIBLE|VERIFIED_FIXTURE|release_eligible=1|api\.openai\.com|api\.elevenlabs\.io/);
  const db = new DatabaseSync(":memory:");
  for (const file of readdirSync(new URL("../drizzle", import.meta.url)).filter((name) => name.endsWith(".sql")).sort()) db.exec(read(`drizzle/${file}`));
  assert.equal(db.prepare("SELECT COUNT(*) total FROM v7_evaluation_owner_label_tasks").get().total, 0);
  assert.throws(() => db.prepare(`INSERT INTO v7_evaluation_owner_label_receipts
    (id,channel_id,task_id,candidate_id,exact_artifact_hash,decision_state,rationale,labels_json,taxonomy_version,taxonomy_manifest_hash,present_count,absent_count,not_applicable_count,idempotency_key,request_hash,evidence_hash,actor,provider_requests)
    VALUES ('bad','channel','task','candidate',?,'EXCLUDE_UNUSABLE','A sufficiently long rationale','[]','EVALUATION_DEFECT_TAXONOMY_V1',?,0,0,11,'owner-label:bad-task',?,?, 'owner',1)`).run("a".repeat(64), "b".repeat(64), "c".repeat(64), "d".repeat(64)), /CHECK constraint failed|FOREIGN KEY constraint failed/);
  const route = read("app/api/factory/sequential-production/evaluation/route.ts");
  assert.match(route, /RECORD_OWNER_LABEL_RECEIPT/);
  assert.match(route, /authorized\(request, false\)/);
  assert.match(route, /OWNER_LABEL_ARTIFACT_HASH_MISMATCH/);
  assert.match(route, /Factory đã QA trước/);
  assert.match(route, /Xác nhận ngoại lệ/);
  assert.match(route, /labels: normalizedLabels/);
  assert.match(route, /ĐÁNH GIÁ CHƯA ĐƯỢC GHI/);
  assert.match(route, /form\.getAttribute\('action'\)/);
  assert.doesNotMatch(route, /fetch\(form\.action/);
  assert.match(route, /ownerObservableDefectKeys/);
  assert.match(read("lib/evaluation-foundation.ts"), /SYSTEM_EVIDENCE_LABEL_MUST_BE_NOT_APPLICABLE/);
  assert.match(route, /env\.DB\.batch\(statements\)/);
  assert.doesNotMatch(route, /authorizeProductionDispatch|api\.openai\.com|api\.elevenlabs\.io/);
  const triage = read("app/video-engine/corpus-evidence-triage.tsx");
  assert.match(triage, /owner-label-workflow/);
});

test("Factory-first QA is independent, exact-byte-bound and owner attention is exception-only", () => {
  assert.equal(FACTORY_FIRST_QA_POLICY_VERSION, "FACTORY_FIRST_QA_POLICY_V1");
  assert.equal(FACTORY_FIRST_QA_MAXIMUM_BATCH, 5);
  const valid = evaluateFactoryQaResult({
    observableDefectKeys: ["PRODUCTION_RESIDUE", "NEAR_STATIC_MOTION", "MOBILE_LEGIBILITY"],
    result: {
      decisionState: "LIKELY_DEFECT_PRESENT",
      summary: "Static slide contains visible production residue and weak mobile information design.",
      labels: [
        { defectKey: "PRODUCTION_RESIDUE", status: "PRESENT", confidence: 0.99, rationale: "Visible QA phrase remains." },
        { defectKey: "NEAR_STATIC_MOTION", status: "PRESENT", confidence: 0.93, rationale: "Static slide composition." },
        { defectKey: "MOBILE_LEGIBILITY", status: "PRESENT", confidence: 0.88, rationale: "Dense small text on mobile." },
      ],
    },
  });
  assert.equal(valid.eligible, true);
  const incomplete = evaluateFactoryQaResult({
    observableDefectKeys: ["PRODUCTION_RESIDUE", "NEAR_STATIC_MOTION"],
    result: { decisionState: "LIKELY_CLEAN", summary: "The artifact appears clean enough for the current review.", labels: [
      { defectKey: "PRODUCTION_RESIDUE", status: "ABSENT", confidence: 0.9, rationale: "No residue." },
    ] },
  });
  assert.ok(incomplete.reasons.includes("FACTORY_QA_FULL_OBSERVABLE_COVERAGE_REQUIRED"));

  const migration = read("drizzle/0061_factory_first_qa.sql");
  for (const table of ["v7_evaluation_factory_qa_registry", "v7_evaluation_factory_qa_tasks", "v7_evaluation_factory_qa_runs", "v7_evaluation_factory_qa_receipts"]) assert.match(migration, new RegExp(table));
  assert.match(migration, /EXCEPTIONS_AND_AUDIT_SAMPLE_ONLY/);
  assert.match(migration, /spend_ceiling_usd.*6\.75/s);
  assert.match(migration, /EVALUATION_FACTORY_QA_RECEIPT_IMMUTABLE/);
  assert.doesNotMatch(migration, /release_eligible=1|GOLD_ELIGIBLE|VERIFIED_FIXTURE/);
  const route = read("app/api/factory/sequential-production/factory-qa/route.ts");
  assert.match(route, /x-factory-qa-executor-token/);
  assert.match(route, /Two owner anchors must pass independent calibration first/);
  assert.match(route, /detail: "high"/);
  assert.match(route, /prepareImageReviewSurface/);
  assert.match(route, /reviewInputHash/);
  assert.match(route, /missedOwnerPresent/);
  assert.match(route, /label_source,polarity/);
  assert.doesNotMatch(route, /owner_decision_state='OWNER_CONFIRMED'/);
  const ownerRoute = read("app/api/factory/sequential-production/evaluation/route.ts");
  assert.match(ownerRoute, /FACTORY QA TRƯỚC · OWNER XÁC MINH SAU/);
  assert.match(ownerRoute, /owner_attention_state IN \('OWNER_REQUIRED','OWNER_EXCEPTION'\)/);
  const reviewSurfaceMigration = read("drizzle/0062_factory_qa_review_surface.sql");
  assert.match(reviewSurfaceMigration, /review_input_hash/);
  assert.match(reviewSurfaceMigration, /SVG_TO_PNG_1920X1080_V1/);
  const calibrationV2Migration = read("drizzle/0063_factory_qa_calibration_v2.sql");
  assert.match(calibrationV2Migration, /FACTORY_QA_CALIBRATION_V2/);
  assert.match(calibrationV2Migration, /provider_request_ceiling`=84/);
  assert.match(route, /360 CSS pixels wide/);
  const adjudicationMigration = read("drizzle/0064_factory_qa_deterministic_adjudication.sql");
  assert.match(adjudicationMigration, /FACTORY_QA_DETERMINISTIC_ADJUDICATION_V1/);
  assert.match(adjudicationMigration, /EVALUATION_FACTORY_QA_ADJUDICATION_IMMUTABLE/);
  assert.match(route, /ADJUDICATE_FACTORY_QA_CALIBRATION/);
});

test("Factory QA renders self-contained SVG evidence to a hashable PNG review surface", async () => {
  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect width="100%" height="100%" fill="#123"/><text x="80" y="120" font-size="24">evidence-bound production proof</text></svg>');
  const review = await prepareImageReviewSurface(svg);
  assert.equal(review.mimeType, "image/png");
  assert.equal(review.transform, "SVG_TO_PNG_1920X1080_V1");
  assert.equal(detectedRasterMime(review.bytes), "image/png");
  const adjudicated = applyDeterministicImageSignals({ decisionState: "LIKELY_DEFECT_PRESENT", labels: [
    { defectKey: "PRODUCTION_RESIDUE", status: "ABSENT", confidence: 0.8, rationale: "Model miss" },
    { defectKey: "MOBILE_LEGIBILITY", status: "ABSENT", confidence: 0.8, rationale: "Model miss" },
  ] }, review.deterministicSignals);
  assert.deepEqual(adjudicated.labels.map((item) => item.status), ["PRESENT", "PRESENT"]);
  await assert.rejects(() => prepareImageReviewSurface(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.com/a.png"/></svg>')), /FACTORY_QA_SVG_REMOTE_RESOURCE_FORBIDDEN/);
});

test("Factory Browser QA is exact-byte-bound, full-playback, immutable and independent-only", () => {
  assert.equal(FACTORY_BROWSER_QA_POLICY_VERSION, "FACTORY_BROWSER_QA_POLICY_V1");
  const base = {
    policyVersion: FACTORY_BROWSER_QA_POLICY_VERSION,
    sessionId: "factory-browser-qa-session-0001",
    taskId: "browser-task-1",
    exactArtifactHash: "a".repeat(64),
    mimeType: "video/webm",
    metadataLoaded: true,
    playable: true,
    ended: true,
    metadataDurationSeconds: 8,
    watchedSeconds: 8,
    continuousCoverageRatio: 1,
    timeProgressed: true,
    pauseResumePassed: true,
    seekPassed: true,
    audioTrackObserved: true,
    motionObserved: true,
    focusTraversalPassed: true,
    zoomReflowPassed: true,
    consoleErrorCount: 0,
    hiddenDuringPlaybackCount: 0,
    viewportWidth: 390,
    viewportHeight: 844,
    devicePixelRatio: 2,
    userAgent: "Qualification browser",
    events: [
      { type: "LOADED_METADATA", mediaTimeSeconds: 0, monotonicMilliseconds: 1 },
      { type: "PLAY", mediaTimeSeconds: 0, monotonicMilliseconds: 2 },
      { type: "PAUSE", mediaTimeSeconds: 2, monotonicMilliseconds: 3 },
      { type: "PLAY", mediaTimeSeconds: 2, monotonicMilliseconds: 4 },
      { type: "SEEKED", mediaTimeSeconds: 1.5, monotonicMilliseconds: 5 },
      { type: "ENDED", mediaTimeSeconds: 8, monotonicMilliseconds: 6 },
    ],
    result: { decisionState: "LIKELY_DEFECT_PRESENT", summary: "Visible production residue remains in the exact rendered media.", labels: [
      { defectKey: "PRODUCTION_RESIDUE", status: "PRESENT", confidence: 0.99, rationale: "Internal QA copy is visible." },
    ] },
  };
  const valid = evaluateFactoryBrowserQaEvidence({ evidence: base, expectedTaskId: "browser-task-1", expectedArtifactHash: "a".repeat(64), expectedMimeType: "video/webm", observableDefectKeys: ["PRODUCTION_RESIDUE"] });
  assert.equal(valid.eligible, true);
  const hidden = evaluateFactoryBrowserQaEvidence({ evidence: { ...base, hiddenDuringPlaybackCount: 1 }, expectedTaskId: "browser-task-1", expectedArtifactHash: "a".repeat(64), expectedMimeType: "video/webm", observableDefectKeys: ["PRODUCTION_RESIDUE"] });
  assert.ok(hidden.reasons.includes("FACTORY_BROWSER_QA_PLAYBACK_NOT_VISIBLE"));
  const wrongHash = evaluateFactoryBrowserQaEvidence({ evidence: { ...base, exactArtifactHash: "b".repeat(64) }, expectedTaskId: "browser-task-1", expectedArtifactHash: "a".repeat(64), expectedMimeType: "video/webm", observableDefectKeys: ["PRODUCTION_RESIDUE"] });
  assert.ok(wrongHash.reasons.includes("FACTORY_BROWSER_QA_EXACT_HASH_BINDING_REQUIRED"));

  const migration = read("drizzle/0065_factory_browser_qa.sql"), route = read("app/api/factory/sequential-production/factory-browser-qa/route.ts");
  for (const table of ["v7_evaluation_factory_browser_qa_registry", "v7_evaluation_factory_browser_qa_tasks", "v7_evaluation_factory_browser_qa_receipts"]) assert.match(migration, new RegExp(table));
  assert.match(migration, /INDEPENDENT_REVIEW_ONLY/);
  assert.match(migration, /EVALUATION_FACTORY_BROWSER_QA_RECEIPT_IMMUTABLE/);
  assert.match(migration, /review_surface='BROWSER_REQUIRED'/);
  assert.doesNotMatch(migration, /release_eligible=1|GOLD_ELIGIBLE|OWNER_CONFIRMED/);
  assert.match(route, /x-factory-qa-executor-token/);
  assert.match(route, /FACTORY_BROWSER_QA_ARTIFACT_HASH_MISMATCH/);
  assert.match(route, /RECONCILE_FACTORY_BROWSER_QA_TASKS/);
  assert.match(route, /INSERT OR IGNORE INTO v7_evaluation_factory_browser_qa_tasks/);
  assert.match(route, /r\.review_surface='BROWSER_REQUIRED'/);
  assert.match(route, /sourceBrowserRequired/);
  assert.match(route, /MIME_MISSING/);
  assert.match(route, /v7_evaluation_factory_qa_routing_adjudications/);
  assert.match(route, /SUBMIT_FACTORY_BROWSER_QA/);
  assert.match(route, /providerRequests: 0, spendUsd: 0/);
  assert.doesNotMatch(route, /api\.openai\.com|api\.elevenlabs\.io|owner_decision_state='OWNER_CONFIRMED'/);
});

test("Factory QA routing adjudication preserves legacy receipts and excludes structured JSON from perceptual Browser QA", () => {
  const migration = read("drizzle/0066_factory_qa_routing_adjudication.sql");
  const factoryRoute = read("app/api/factory/sequential-production/factory-qa/route.ts");
  assert.match(migration, /FACTORY_QA_ROUTING_ADJUDICATION_V1/);
  assert.match(migration, /STRUCTURED_EVIDENCE_ONLY/);
  assert.match(migration, /NON_MEDIA_MISROUTED_BY_LEGACY_DEFAULT/);
  assert.match(migration, /EVALUATION_FACTORY_QA_ROUTING_ADJUDICATION_IMMUTABLE/);
  assert.doesNotMatch(migration, /UPDATE `v7_evaluation_factory_qa_receipts`|DELETE FROM `v7_evaluation_factory_qa_receipts`/);
  assert.match(factoryRoute, /structuredEvidenceOnly/);
  assert.match(factoryRoute, /FACTORY_QA_REVIEW_SURFACE_UNSUPPORTED/);
  assert.match(factoryRoute, /\["audio\/", "video\/"\]/);
});

test("WP7 regression corpus preserves independent failures without promoting them to ground truth", () => {
  assert.equal(WP7_REGRESSION_CORPUS_POLICY_VERSION, "WP7_REGRESSION_CORPUS_POLICY_V1");
  assert.deepEqual([WP7_REGRESSION_REFERENCE_MINIMUM, WP7_REGRESSION_REFERENCE_MAXIMUM], [10, 15]);
  const blocked = assessWp7RegressionReadiness({ ownerConfirmedReferences: 2, cleanNegativeControls: 0, controlledInjectionFixtures: 0, p0FamiliesCovered: 0, p0FamiliesRequired: 5 });
  assert.equal(blocked.state, "INSUFFICIENT_GROUND_TRUTH");
  for (const reason of ["OWNER_CONFIRMED_REFERENCES_BELOW_MINIMUM", "CLEAN_NEGATIVE_CONTROL_REQUIRED", "CONTROLLED_INJECTION_FIXTURE_REQUIRED", "P0_FAMILY_COVERAGE_INCOMPLETE"]) assert.ok(blocked.reasons.includes(reason));
  const ready = assessWp7RegressionReadiness({ ownerConfirmedReferences: 12, cleanNegativeControls: 2, controlledInjectionFixtures: 5, p0FamiliesCovered: 5, p0FamiliesRequired: 5 });
  assert.deepEqual({ eligible: ready.eligible, state: ready.state, reasons: ready.reasons }, { eligible: true, state: "READY_FOR_DATASET_DESIGN", reasons: [] });

  const migration = read("drizzle/0067_wp7_regression_corpus.sql");
  for (const table of ["v7_evaluation_regression_corpus_registry", "v7_evaluation_regression_corpus_items", "v7_evaluation_regression_readiness_snapshots"]) assert.match(migration, new RegExp(table));
  assert.match(migration, /INDEPENDENT_REVIEW_ONLY/);
  assert.match(migration, /OWNER_CONFIRMED_REFERENCE/);
  assert.match(migration, /INSUFFICIENT_GROUND_TRUTH/);
  assert.match(migration, /EVALUATION_REGRESSION_CORPUS_ITEM_IMMUTABLE/);
  assert.doesNotMatch(migration, /release_eligible=1|qualification_eligible=1|lifecycle_state='GOLD_ELIGIBLE'|lifecycle_state='SEALED'/);
  const route = read("app/api/factory/sequential-production/factory-qa/route.ts");
  assert.match(route, /regressionCorpus/);
  assert.match(route, /datasetSealingAuthority/);
  assert.doesNotMatch(route, /UPDATE v7_evaluation_regression|api\.elevenlabs\.io/);

  const db = new DatabaseSync(":memory:");
  const migrations = readdirSync(new URL("../drizzle", import.meta.url)).filter((name) => name.endsWith(".sql")).sort();
  const regressionIndex = migrations.indexOf("0067_wp7_regression_corpus.sql");
  for (const file of migrations.slice(0, regressionIndex)) db.exec(read(`drizzle/${file}`));
  const candidate = db.prepare(`INSERT INTO v7_evaluation_candidates
    (id,channel_id,source_family,source_table,source_id,candidate_kind,artifact_type,lifecycle_state,mime_type,content_hash,bytes_state,checksum_state,provenance_state,owner_decision_state,defect_label_state,rights_declared_state,rights_verification_state,correlation_group,dedup_hash,verification_state,release_eligible,qualification_eligible)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0)`);
  candidate.run("candidate-owner","channel-hidden-systems","TEST","test","source-owner","SHOT","VISUAL_FRAME","CANDIDATE_EVIDENCE","image/svg+xml","a".repeat(64),"READBACK_VERIFIED","PASS","PASS","OWNER_CONFIRMED","LABELLED","COMMERCIAL_LICENSE_VERIFIED","PASS","lineage-owner","a".repeat(64),"EVIDENCE_VERIFIED");
  candidate.run("candidate-factory","channel-hidden-systems","TEST","test","source-factory","SHOT","VISUAL_FRAME","CANDIDATE_EVIDENCE","image/svg+xml","b".repeat(64),"READBACK_VERIFIED","PASS","PASS","INHERITED_PACKAGE_REJECTION","NOT_LABELLED","COMMERCIAL_LICENSE_VERIFIED","PASS","lineage-factory","b".repeat(64),"EVIDENCE_VERIFIED");
  const ownerTask = db.prepare(`INSERT INTO v7_evaluation_owner_label_tasks
    (id,channel_id,candidate_id,exact_artifact_hash,candidate_kind,artifact_type,taxonomy_version,requirements_json,policy_version)
    VALUES (?,?,?,?,?,?,'EVALUATION_DEFECT_TAXONOMY_V1','[]','EVALUATION_OWNER_LABEL_POLICY_V1')`);
  ownerTask.run("owner-task-owner","channel-hidden-systems","candidate-owner","a".repeat(64),"SHOT","VISUAL_FRAME");
  ownerTask.run("owner-task-factory","channel-hidden-systems","candidate-factory","b".repeat(64),"SHOT","VISUAL_FRAME");
  db.prepare(`INSERT INTO v7_evaluation_owner_label_receipts
    (id,channel_id,task_id,candidate_id,exact_artifact_hash,decision_state,rationale,labels_json,taxonomy_version,taxonomy_manifest_hash,present_count,absent_count,not_applicable_count,idempotency_key,request_hash,evidence_hash,actor)
    VALUES ('owner-receipt','channel-hidden-systems','owner-task-owner','candidate-owner',?,'REJECTED_DEFECT_PRESENT','Owner confirmed visible defect','[{"defectKey":"PRODUCTION_RESIDUE","status":"PRESENT","confidence":1}]','EVALUATION_DEFECT_TAXONOMY_V1',?,1,0,0,'owner-receipt-key-0001',?,?, 'owner@example.test')`).run("a".repeat(64), "c".repeat(64), "d".repeat(64), "e".repeat(64));
  db.prepare(`INSERT INTO v7_evaluation_correlation_snapshots
    (id,channel_id,policy_version,candidate_count,primary_representative_count,exact_duplicate_deferred_count,correlated_variant_deferred_count,independent_count_eligible,evidence_json)
    VALUES ('correlation-snapshot-test','channel-hidden-systems','EVALUATION_CORRELATION_CONTROL_V1',2,2,0,0,2,'{}')`).run();
  const correlation = db.prepare(`INSERT INTO v7_evaluation_correlation_items
    (id,snapshot_id,channel_id,candidate_id,exact_artifact_hash,lineage_group_key,representative_candidate_id,relation_class,queue_role,attention_state,independent_count_eligible,selection_rank,selection_basis_json,policy_version)
    VALUES (?,'correlation-snapshot-test','channel-hidden-systems',?,?,?,?, 'INDEPENDENT_SINGLETON','PRIMARY_REPRESENTATIVE','READY_PRIMARY',1,1,'{}','EVALUATION_CORRELATION_CONTROL_V1')`);
  correlation.run("correlation-owner","candidate-owner","a".repeat(64),"lineage-owner","candidate-owner");
  correlation.run("correlation-factory","candidate-factory","b".repeat(64),"lineage-factory","candidate-factory");
  const factoryTask = db.prepare(`INSERT INTO v7_evaluation_factory_qa_tasks
    (id,channel_id,owner_task_id,candidate_id,exact_artifact_hash,candidate_kind,artifact_type,mime_type,task_class,policy_version)
    VALUES (?,?,?,?,?,'SHOT','VISUAL_FRAME','image/svg+xml',?,'FACTORY_FIRST_QA_POLICY_V1')`);
  factoryTask.run("factory-task-owner","channel-hidden-systems","owner-task-owner","candidate-owner","a".repeat(64),"OWNER_ANCHOR");
  factoryTask.run("factory-task-failure","channel-hidden-systems","owner-task-factory","candidate-factory","b".repeat(64),"UNREVIEWED_PRIMARY");
  const activeCalibration = db.prepare("SELECT calibration_version FROM v7_evaluation_factory_qa_registry WHERE channel_id='channel-hidden-systems'").get().calibration_version;
  db.prepare(`INSERT INTO v7_evaluation_factory_qa_runs
    (id,channel_id,run_mode,policy_version,lifecycle_state,candidate_ids_json,planned_candidates,processed_candidates,idempotency_key,intent_hash,actor,calibration_version)
    VALUES ('factory-run-test','channel-hidden-systems','BATCH','FACTORY_FIRST_QA_POLICY_V1','COMPLETED','["candidate-factory"]',1,1,'factory-run-key-0001',?,'factory@example.test',?)`).run("f".repeat(64), activeCalibration);
  db.prepare(`INSERT INTO v7_evaluation_factory_qa_receipts
    (id,channel_id,run_id,task_id,candidate_id,exact_artifact_hash,review_surface,decision_state,owner_attention_state,labels_json,summary,provider_requests,spend_usd,request_hash,evidence_hash,actor,calibration_version)
    VALUES ('factory-receipt-test','channel-hidden-systems','factory-run-test','factory-task-failure','candidate-factory',?,'OPENAI_VISION','LIKELY_DEFECT_PRESENT','NO_IMMEDIATE_OWNER_ACTION','[{"defectKey":"PRODUCTION_RESIDUE","status":"PRESENT","confidence":0.99}]','Independent visible defect',0,0,?,?, 'factory@example.test',?)`).run("b".repeat(64), "1".repeat(64), "2".repeat(64), activeCalibration);
  db.exec(migration);
  const corpus = db.prepare(`SELECT evidence_authority,COUNT(*) count FROM v7_evaluation_regression_corpus_items GROUP BY evidence_authority ORDER BY evidence_authority`).all().map((row) => ({ evidence_authority: row.evidence_authority, count: row.count }));
  assert.deepEqual(corpus, [{ evidence_authority: "INDEPENDENT_REVIEW_ONLY", count: 1 }, { evidence_authority: "OWNER_CONFIRMED_REFERENCE", count: 1 }]);
  const snapshot = db.prepare("SELECT * FROM v7_evaluation_regression_readiness_snapshots WHERE channel_id='channel-hidden-systems'").get();
  assert.deepEqual({ state: snapshot.lifecycle_state, items: snapshot.candidate_items, independent: snapshot.independent_review_only, owner: snapshot.owner_confirmed_references, negative: snapshot.clean_negative_controls, injections: snapshot.controlled_injection_fixtures }, { state: "INSUFFICIENT_GROUND_TRUTH", items: 2, independent: 1, owner: 1, negative: 0, injections: 0 });
  assert.equal(db.prepare("SELECT COUNT(*) total FROM v7_evaluation_dataset_items").get().total, 0);
  assert.throws(() => db.prepare("UPDATE v7_evaluation_regression_corpus_items SET reference_eligible=1 WHERE evidence_authority='INDEPENDENT_REVIEW_ONLY'").run(), /EVALUATION_REGRESSION_CORPUS_ITEM_IMMUTABLE/);
});

test("correlation control permits one independent representative per lineage and exact hash", () => {
  assert.equal(EVALUATION_CORRELATION_CONTROL_VERSION, "EVALUATION_CORRELATION_CONTROL_V1");
  const valid = evaluateCorrelationAssignments([
    { candidateId: "a", exactArtifactHash: "a".repeat(64), lineageGroupKey: "shot-1", representativeCandidateId: "a", queueRole: "PRIMARY_REPRESENTATIVE", independentCountEligible: true },
    { candidateId: "b", exactArtifactHash: "a".repeat(64), lineageGroupKey: "shot-1", representativeCandidateId: "a", queueRole: "EXACT_DUPLICATE_DEFERRED", independentCountEligible: false },
    { candidateId: "c", exactArtifactHash: "c".repeat(64), lineageGroupKey: "shot-1", representativeCandidateId: "a", queueRole: "CORRELATED_VARIANT_DEFERRED", independentCountEligible: false },
    { candidateId: "d", exactArtifactHash: "d".repeat(64), lineageGroupKey: "shot-2", representativeCandidateId: "d", queueRole: "PRIMARY_REPRESENTATIVE", independentCountEligible: true },
  ]);
  assert.equal(valid.eligible, true);
  assert.deepEqual({ candidates: valid.candidateCount, primary: valid.primaryRepresentatives, exact: valid.exactDuplicatesDeferred, correlated: valid.correlatedVariantsDeferred }, { candidates: 4, primary: 2, exact: 1, correlated: 1 });
  const invalid = evaluateCorrelationAssignments([
    { candidateId: "a", exactArtifactHash: "a".repeat(64), lineageGroupKey: "shot-1", representativeCandidateId: "a", queueRole: "PRIMARY_REPRESENTATIVE", independentCountEligible: true },
    { candidateId: "b", exactArtifactHash: "b".repeat(64), lineageGroupKey: "shot-1", representativeCandidateId: "b", queueRole: "PRIMARY_REPRESENTATIVE", independentCountEligible: true },
  ]);
  assert.equal(invalid.eligible, false);
  assert.ok(invalid.reasons.includes("CORRELATION_PRIMARY_CARDINALITY:shot-1"));
});

test("migration 0059 preserves every task while routing only independent representatives to owner attention", () => {
  const migration = read("drizzle/0059_evaluation_correlation_control.sql");
  for (const table of ["v7_evaluation_correlation_snapshots", "v7_evaluation_correlation_items"]) assert.match(migration, new RegExp(table));
  assert.match(migration, /EVALUATION_CORRELATION_CONTROL_V1/);
  assert.match(migration, /EXACT_DUPLICATE_DEFERRED/);
  assert.match(migration, /CORRELATED_VARIANT_DEFERRED/);
  assert.match(migration, /ROW_NUMBER\(\) OVER/);
  assert.doesNotMatch(migration, /DELETE FROM|GOLD_ELIGIBLE|VERIFIED_FIXTURE|release_eligible=1|api\.openai\.com|api\.elevenlabs\.io/);

  const db = new DatabaseSync(":memory:");
  const migrations = readdirSync(new URL("../drizzle", import.meta.url)).filter((name) => name.endsWith(".sql")).sort();
  const correlationIndex = migrations.indexOf("0059_evaluation_correlation_control.sql");
  for (const file of migrations.slice(0, correlationIndex)) db.exec(read(`drizzle/${file}`));
  db.exec("PRAGMA foreign_keys=OFF");
  const artifact = db.prepare(`INSERT INTO production_v2_artifacts
    (id,package_id,shot_contract_id,artifact_type,storage_key,mime_type,byte_size,sha256,rights_state,provenance_json,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  artifact.run("a1","package-1","shot-1","VISUAL_FRAME","r2/a1","image/png",10,"a".repeat(64),"COMMERCIAL_LICENSE_VERIFIED",'{"author":"engine","legacySources":0}',"2026-01-03");
  artifact.run("a2","package-1","shot-1","VISUAL_FRAME","r2/a2","image/png",10,"a".repeat(64),"COMMERCIAL_LICENSE_VERIFIED",'{"author":"engine","legacySources":0}',"2026-01-02");
  artifact.run("a3","package-1","shot-1","VISUAL_FRAME","r2/a3","image/png",10,"c".repeat(64),"COMMERCIAL_LICENSE_VERIFIED",'{"author":"engine","legacySources":0}',"2026-01-01");
  artifact.run("a4","package-1","shot-2","VISUAL_FRAME","r2/a4","image/png",10,"d".repeat(64),"COMMERCIAL_LICENSE_VERIFIED",'{"author":"engine","legacySources":0}',"2026-01-01");
  artifact.run("a5","package-1",null,"NARRATION_AUDIO","r2/a5","audio/mpeg",10,"e".repeat(64),"COMMERCIAL_LICENSE_VERIFIED",'{"provider":"ElevenLabs","legacySources":0}',"2026-01-01");
  const candidate = db.prepare(`INSERT INTO v7_evaluation_candidates
    (id,channel_id,source_family,source_table,source_id,source_parent_id,candidate_kind,artifact_type,storage_key,mime_type,byte_size,content_hash,bytes_state,checksum_state,provenance_state,owner_decision_state,defect_label_state,rights_declared_state,rights_verification_state,correlation_group,dedup_hash,verification_state)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const task = db.prepare(`INSERT INTO v7_evaluation_owner_label_tasks
    (id,channel_id,candidate_id,exact_artifact_hash,candidate_kind,artifact_type,taxonomy_version,requirements_json,policy_version)
    VALUES (?,?,?,?,?,?,?,'[]',?)`);
  for (const [id,kind,type,hash] of [["a1","SHOT","VISUAL_FRAME","a"],["a2","SHOT","VISUAL_FRAME","a"],["a3","SHOT","VISUAL_FRAME","c"],["a4","SHOT","VISUAL_FRAME","d"],["a5","AUDIO","NARRATION_AUDIO","e"]]) {
    candidate.run(`c-${id}`,"channel-test","PRODUCTION_V2_REJECTED","production_v2_artifacts",id,"package-1",kind,type,`r2/${id}`,kind === "AUDIO" ? "audio/mpeg" : "image/png",10,hash.repeat(64),"READBACK_VERIFIED","PASS","PASS","INHERITED_PACKAGE_REJECTION","NOT_LABELLED","COMMERCIAL_LICENSE_VERIFIED","PASS","package-1",hash.repeat(64),"EVIDENCE_VERIFIED");
    task.run(`t-${id}`,"channel-test",`c-${id}`,hash.repeat(64),kind,type,"EVALUATION_DEFECT_TAXONOMY_V1","EVALUATION_OWNER_LABEL_POLICY_V1");
  }
  db.exec("PRAGMA foreign_keys=ON");
  db.exec(migration);
  const snapshot = db.prepare("SELECT * FROM v7_evaluation_correlation_snapshots WHERE channel_id='channel-test'").get();
  assert.deepEqual({ candidates: snapshot.candidate_count, primary: snapshot.primary_representative_count, exact: snapshot.exact_duplicate_deferred_count, correlated: snapshot.correlated_variant_deferred_count, independent: snapshot.independent_count_eligible }, { candidates: 5, primary: 3, exact: 1, correlated: 1, independent: 3 });
  assert.equal(db.prepare("SELECT COUNT(*) total FROM v7_evaluation_owner_label_tasks").get().total, 5);
  assert.equal(db.prepare("SELECT COUNT(*) total FROM v7_evaluation_correlation_items WHERE attention_state='READY_PRIMARY'").get().total, 3);
  assert.throws(() => db.prepare("DELETE FROM v7_evaluation_correlation_items").run(), /EVALUATION_CORRELATION_ITEM_IMMUTABLE/);
  assert.throws(() => db.prepare("UPDATE v7_evaluation_correlation_snapshots SET primary_representative_count=4").run(), /EVALUATION_CORRELATION_SNAPSHOT_IMMUTABLE/);
  const route = read("app/api/factory/sequential-production/evaluation/route.ts");
  assert.match(route, /i\.attention_state='READY_PRIMARY'/);
  assert.match(route, /ownerLabelActionable/);
});

test("migration 0057 creates immutable zero-spend rights collection lanes without retroactive passes", () => {
  const migration = read("drizzle/0057_evaluation_rights_evidence_collection.sql");
  for (const table of [
    "v7_evaluation_rights_evidence_tasks", "v7_evaluation_provider_terms_receipts", "v7_evaluation_candidate_provider_rights_receipts",
    "v7_evaluation_composite_rights_manifests", "v7_evaluation_authorship_receipts",
  ]) assert.match(migration, new RegExp(table));
  for (const lane of ["PROVIDER_TERMS_AND_PLAN_RECEIPT", "COMPOSITE_PARENT_RIGHTS_MANIFEST", "AUTHORSHIP_SOURCE_RECEIPT"]) assert.match(migration, new RegExp(lane));
  assert.match(migration, /HISTORICAL_TERMS_PLAN_AND_EXACT_REQUEST_BINDING_REQUIRED/);
  assert.match(migration, /verified_parent_count.*parent_count/s);
  assert.doesNotMatch(migration, /UPDATE `v7_evaluation_candidates`[\s\S]*rights_verification_state.*PASS/);
  assert.doesNotMatch(migration, /api\.elevenlabs\.io|api\.openai\.com/);

  const db = new DatabaseSync(":memory:");
  for (const file of readdirSync(new URL("../drizzle", import.meta.url)).filter((name) => name.endsWith(".sql")).sort()) db.exec(read(`drizzle/${file}`));
  const taskCount = db.prepare("SELECT COUNT(*) total FROM v7_evaluation_rights_evidence_tasks").get().total;
  assert.equal(taskCount, 0);
  assert.throws(() => db.prepare(`INSERT INTO v7_evaluation_provider_terms_receipts
    (id,channel_id,provider_family,jurisdiction_scope,terms_version,terms_effective_at,terms_source_url,terms_snapshot_hash,account_plan,plan_valid_from,plan_evidence_hash,commercial_use_state,supplemental_terms_json,evidence_hash,actor,provider_requests)
    VALUES ('bad','channel','ELEVENLABS','NON_EEA','v1','2026-01-01','https://example.test',?,'paid','2026-01-01',?,'VERIFIED_PAID_COMMERCIAL_USE','[]',?,'owner',1)`).run("a".repeat(64), "b".repeat(64), "c".repeat(64)), /CHECK constraint failed/);
});

test("migration 0068 diagnoses historical render-lineage gaps without manufacturing rights authority", () => {
  assert.equal(EVALUATION_RIGHTS_LINEAGE_DIAGNOSTIC_VERSION, "EVALUATION_RIGHTS_LINEAGE_DIAGNOSTIC_V1");
  const migration = read("drizzle/0068_evaluation_rights_lineage_diagnostics.sql");
  for (const table of ["v7_evaluation_rights_lineage_diagnostics", "v7_evaluation_rights_lineage_diagnostic_snapshots"]) assert.match(migration, new RegExp(table));
  for (const state of ["SOURCE_LINEAGE_BINDING_MISSING", "SOURCE_LINEAGE_DECLARED_UNVERIFIED"]) assert.match(migration, new RegExp(state));
  for (const lock of ["rights_pass_authority", "dataset_sealing_authority", "assurance_qualification_authority", "release_authority"]) assert.match(migration, new RegExp(`${lock}[^;]+CHECK \\(`, "s"));
  assert.match(migration, /SAME_PACKAGE_MANIFEST_IS_NOT_EXACT_RENDER_BINDING/);
  assert.doesNotMatch(migration, /UPDATE `v7_evaluation_candidates`|INSERT INTO `v7_evaluation_composite_rights_manifests`|INSERT INTO `v7_evaluation_authorship_receipts`|api\.elevenlabs\.io|api\.openai\.com/);

  const command = read("lib/production-v2-command.ts"), scale = read("lib/production-v2-scale.ts"), route = read("app/api/factory/production-v2/route.ts");
  assert.match(command, /SOURCE_MANIFEST_BINDING_REQUIRED/);
  assert.match(command, /EXACT_SOURCE_MANIFEST_AND_PARENT_SET_VERIFIED/);
  assert.match(command, /SOURCE_MANIFEST_PARENT_BINDING_MISMATCH/);
  assert.match(scale, /verifyProductionV2RenderLineage/);
  assert.match(route, /x-source-manifest-id/);
  assert.match(route, /x-source-manifest-sha256/);
  const projectionRoute = read("app/api/factory/sequential-production/evaluation/route.ts");
  assert.match(projectionRoute, /rightsLineageDiagnostic/);
  assert.match(projectionRoute, /source_lineage_binding_missing/);
  assert.doesNotMatch(projectionRoute, /rightsLineageDiagnostic:[\s\S]{0,1200}(source_artifact_id|artifact_hash|declared_source_manifest_id)/);
});

test("migration 0069 diagnoses legacy provider bindings and future TTS captures native request IDs fail-closed", () => {
  assert.equal(EVALUATION_PROVIDER_BINDING_DIAGNOSTIC_VERSION, "EVALUATION_PROVIDER_BINDING_DIAGNOSTIC_V1");
  const migration = read("drizzle/0069_evaluation_provider_binding_diagnostics.sql");
  for (const table of ["v7_evaluation_provider_binding_diagnostics", "v7_evaluation_provider_binding_diagnostic_snapshots"]) assert.match(migration, new RegExp(table));
  for (const state of ["LEGACY_SYNTHETIC_RESPONSE_BINDING_DISCOVERED", "REQUEST_BINDING_MISSING", "REQUEST_BINDING_AMBIGUOUS"]) assert.match(migration, new RegExp(state));
  for (const lock of ["provider_native_response_id_verified", "terms_plan_evidence_verified", "rights_pass_authority", "dataset_sealing_authority", "assurance_qualification_authority", "release_authority"]) assert.match(migration, new RegExp(`${lock}[^;]+CHECK \\(`, "s"));
  assert.match(migration, /LEGACY_ARTIFACT_HASH_PREFIX_MATCH_ONLY/);
  assert.doesNotMatch(migration, /UPDATE `v7_evaluation_candidates`|INSERT INTO `v7_evaluation_candidate_provider_rights_receipts`|api\.elevenlabs\.io|api\.openai\.com/);

  const command = read("lib/production-v2-command.ts"), scale = read("lib/production-v2-scale.ts"), projectionRoute = read("app/api/factory/sequential-production/evaluation/route.ts");
  for (const source of [command, scale]) {
    assert.match(source, /headers\.get\("request-id"\)|headers\.get\("x-request-id"\)/);
    assert.match(source, /providerNativeRequestId/);
    assert.match(source, /providerResponseArtifactHash/);
  }
  assert.match(command, /ELEVENLABS_REQUEST_ID_MISSING/);
  assert.match(scale, /PROVIDER_ARTIFACT_BINDING_MISMATCH/);
  assert.match(projectionRoute, /providerBindingDiagnostic/);
  assert.doesNotMatch(projectionRoute, /providerBindingDiagnostic:[\s\S]{0,1400}(source_artifact_id|artifact_hash|provider_response_id)/);
});

test("migration 0070 and recovery route bound provider-history discovery without granting rights", () => {
  assert.equal(EVALUATION_PROVIDER_HISTORY_RECOVERY_VERSION, "EVALUATION_PROVIDER_HISTORY_RECOVERY_V1");
  const migration = read("drizzle/0070_evaluation_provider_history_recovery.sql"), route = read("app/api/factory/sequential-production/evaluation/provider-history/route.ts"), ownerBoundary = read("app/api/factory/sequential-production/evaluation/route.ts");
  for (const table of ["v7_evaluation_provider_history_recovery_runs", "v7_evaluation_provider_history_items", "v7_evaluation_provider_history_candidate_diagnostics", "v7_evaluation_provider_history_snapshots"]) assert.match(migration, new RegExp(table));
  for (const lock of ["exact_audio_hash_verified", "historical_plan_coverage_verified", "rights_pass_authority", "dataset_sealing_authority", "assurance_qualification_authority", "release_authority"]) assert.match(migration, new RegExp(`${lock}[^;]+CHECK \\(`, "s"));
  assert.match(migration, /maximum_history_items` integer NOT NULL CHECK \(`maximum_history_items` = 1000\)/);
  assert.match(migration, /provider_requests` integer NOT NULL CHECK \(`provider_requests` = 2\)/);
  assert.match(route, /date_after_unix/);
  assert.match(route, /date_before_unix/);
  assert.match(route, /page_size/);
  assert.match(route, /source.*TTS/s);
  assert.match(route, /UNIQUE_METADATA_MATCH_REQUIRES_AUDIO_HASH/);
  assert.match(route, /ELEVENLABS_HISTORY_WINDOW_EXCEEDS_BOUND/);
  assert.doesNotMatch(route, /\/v1\/text-to-speech|rights_verification_state='PASS'|release_eligible=1/);
  assert.match(ownerBoundary, /provider-history-recovery/);
  assert.match(ownerBoundary, /DISCOVER_ELEVENLABS_HISTORY_METADATA/);
  assert.match(ownerBoundary, /discoverProviderHistoryAuthorized/);
  assert.match(ownerBoundary, /Metadata discovery: 2 provider reads, không TTS, không spend/);
});

test("migration 0071 recovers exact provider audio hashes in bounded immutable batches", () => {
  assert.equal(EVALUATION_PROVIDER_AUDIO_HASH_RECOVERY_VERSION, "EVALUATION_PROVIDER_AUDIO_HASH_RECOVERY_V1");
  const migration = read("drizzle/0071_evaluation_provider_audio_hash_recovery.sql"), route = read("app/api/factory/sequential-production/evaluation/provider-history/route.ts"), ownerBoundary = read("app/api/factory/sequential-production/evaluation/route.ts");
  for (const table of ["v7_evaluation_provider_audio_hash_runs", "v7_evaluation_provider_audio_hash_receipts", "v7_evaluation_provider_audio_hash_candidate_diagnostics", "v7_evaluation_provider_audio_hash_snapshots"]) assert.match(migration, new RegExp(table));
  for (const lock of ["historical_plan_coverage_verified", "rights_pass_authority", "dataset_sealing_authority", "assurance_qualification_authority", "release_authority"]) assert.match(migration, new RegExp(`${lock}[^;]+CHECK \\(`, "s"));
  assert.match(migration, /planned_history_items` integer NOT NULL CHECK \(`planned_history_items` BETWEEN 1 AND 16\)/);
  assert.match(migration, /attempt_number` integer NOT NULL CHECK \(`attempt_number` BETWEEN 1 AND 2\)/);
  assert.match(migration, /provider_requests_cumulative` integer NOT NULL CHECK \(`provider_requests_cumulative` BETWEEN 0 AND 132\)/);
  assert.match(route, /\/v1\/history\/\$\{encodeURIComponent\(historyItemId\)\}\/audio/);
  assert.match(route, /MAXIMUM_AUDIO_HASH_BATCH = 16/);
  assert.match(route, /UNIQUE_EXACT_AUDIO_HASH_MATCH/);
  assert.match(route, /EQUIVALENT_BYTES_MULTIPLE_REQUESTS/);
  assert.doesNotMatch(route, /\/v1\/text-to-speech|rights_verification_state='PASS'|release_eligible=1/);
  assert.match(ownerBoundary, /HASH_ELEVENLABS_HISTORY_AUDIO/);
  assert.match(ownerBoundary, /index<=10/);
  assert.match(ownerBoundary, /không tự cấp rights/);
});

test("migration 0072 closes unrecoverable history and seals a bounded controlled-fixture design", () => {
  assert.equal(EVALUATION_HISTORICAL_RECOVERY_CLOSURE_VERSION, "EVALUATION_HISTORICAL_RECOVERY_CLOSURE_V1");
  assert.equal(CONTROLLED_FIXTURE_PLAN_VERSION, "CONTROLLED_FIXTURE_PLAN_V1");
  const migration = read("drizzle/0072_historical_recovery_closure_and_controlled_fixture_plan.sql");
  for (const table of ["v7_evaluation_historical_recovery_closures", "v7_evaluation_controlled_fixture_plan_registry", "v7_evaluation_controlled_fixture_blueprints"]) assert.match(migration, new RegExp(table));
  assert.match(migration, /NO_EXACT_PROVIDER_AUDIO_FOUND/);
  assert.match(migration, /QUARANTINE_FAILURE_EVIDENCE_ONLY/);
  assert.match(migration, /EXHAUSTED_NO_EXACT_BINDING/);
  assert.match(migration, /target_fixture_count` integer NOT NULL CHECK \(`target_fixture_count` BETWEEN 10 AND 15\)/);
  assert.match(migration, /p0_families_planned` integer NOT NULL CHECK \(`p0_families_planned` = 5\)/);
  for (const lock of ["dataset_sealing_authority", "assurance_qualification_authority", "release_authority"]) assert.match(migration, new RegExp(`${lock}[^;]+CHECK \\(`, "s"));
  assert.doesNotMatch(migration, /\/v1\/text-to-speech|api\.openai\.com|DELETE FROM|rights_verification_state='PASS'/);
  const db = new DatabaseSync(":memory:");
  for (const file of readdirSync(new URL("../drizzle", import.meta.url)).filter((name) => name.endsWith(".sql")).sort()) db.exec(read(`drizzle/${file}`));
  const plan = db.prepare("SELECT target_fixture_count,defect_positive_count,clean_negative_count,p0_families_planned,materialized_fixture_count,provider_requests,spend_usd FROM v7_evaluation_controlled_fixture_plan_registry").get();
  assert.deepEqual({ ...plan }, { target_fixture_count: 13, defect_positive_count: 11, clean_negative_count: 2, p0_families_planned: 5, materialized_fixture_count: 0, provider_requests: 0, spend_usd: 0 });
  assert.equal(db.prepare("SELECT COUNT(*) count FROM v7_evaluation_controlled_fixture_blueprints").get().count, 13);
  assert.equal(db.prepare("SELECT COUNT(DISTINCT expected_defect_key) count FROM v7_evaluation_controlled_fixture_blueprints WHERE severity='P0'").get().count, 5);
  const ownerBoundary = read("app/api/factory/sequential-production/evaluation/route.ts");
  assert.match(ownerBoundary, /Không thể phục hồi 46 audio cũ/);
  assert.match(ownerBoundary, /CONTROLLED_FIXTURE_PLAN_V1/);
  assert.match(read("lib/controlled-fixture-materialization.ts"), /providerNativeRequestId/);
});

test("migration 0073 enables exactly one clean-audio parent with hardened provider binding and no promotion authority", () => {
  assert.equal(CONTROLLED_FIXTURE_MATERIALIZATION_VERSION, "CONTROLLED_FIXTURE_MATERIALIZATION_V1");
  const migration = read("drizzle/0073_controlled_fixture_clean_audio_materialization.sql");
  for (const table of [
    "v7_evaluation_fixture_materialization_policies", "v7_evaluation_fixture_voice_identity_receipts", "v7_evaluation_fixture_materialization_runs",
    "v7_evaluation_fixture_provider_binding_receipts", "v7_evaluation_materialized_fixture_artifacts",
  ]) assert.match(migration, new RegExp(table));
  for (const lock of ["rights_pass_authority", "dataset_sealing_authority", "assurance_qualification_authority", "release_authority"]) assert.match(migration, new RegExp(`${lock}[^;]+CHECK \\(`, "s"));
  assert.match(migration, /maximum_materialized_fixtures` integer NOT NULL CHECK \(`maximum_materialized_fixtures` = 1\)/);
  assert.match(migration, /maximum_provider_requests` integer NOT NULL CHECK \(`maximum_provider_requests` = 2\)/);
  assert.match(migration, /maximum_tts_requests` integer NOT NULL CHECK \(`maximum_tts_requests` = 1\)/);
  assert.match(migration, /reserved_spend_ceiling_usd` real NOT NULL CHECK \(`reserved_spend_ceiling_usd` = 0\.08\)/);
  assert.match(migration, /provider_native_request_id/);
  assert.match(migration, /r2_readback_hash/);
  assert.match(migration, /PROVIDER_TERMS_RECEIPT_REQUIRED/);
  const db = new DatabaseSync(":memory:");
  for (const file of readdirSync(new URL("../drizzle", import.meta.url)).filter((name) => name.endsWith(".sql")).sort()) db.exec(read(`drizzle/${file}`));
  const policy = db.prepare("SELECT maximum_materialized_fixtures,maximum_provider_requests,maximum_tts_requests,maximum_tts_characters,reserved_spend_ceiling_usd,rights_pass_authority,dataset_sealing_authority,assurance_qualification_authority,release_authority FROM v7_evaluation_fixture_materialization_policies").get();
  assert.deepEqual({ ...policy }, { maximum_materialized_fixtures: 1, maximum_provider_requests: 2, maximum_tts_requests: 1, maximum_tts_characters: 700, reserved_spend_ceiling_usd: 0.08, rights_pass_authority: 0, dataset_sealing_authority: 0, assurance_qualification_authority: 0, release_authority: 0 });
  const identity = db.prepare("SELECT identity_scope,voice_id,model_id,output_format,production_inheritance_authority FROM v7_evaluation_fixture_voice_identity_receipts").get();
  assert.deepEqual({ ...identity }, { identity_scope: "EVALUATION_FIXTURE_ONLY", voice_id: "JBFqnCBsd6RMkjVDRZzb", model_id: "eleven_multilingual_v2", output_format: "mp3_44100_128", production_inheritance_authority: 0 });
  const materializer = read("lib/controlled-fixture-materialization.ts"), ownerBoundary = read("app/api/factory/sequential-production/evaluation/route.ts");
  assert.match(materializer, /headers\.get\("request-id"\).*headers\.get\("x-request-id"\)/);
  assert.match(materializer, /exactResponseHash/);
  assert.match(materializer, /R2_READBACK_HASH_MISMATCH/);
  assert.match(materializer, /ELEVENLABS_REQUEST_ID_MISSING/);
  assert.match(ownerBoundary, /MATERIALIZE_CLEAN_AUDIO_CONTROL/);
  assert.match(ownerBoundary, /fixtureArtifact/);
  assert.doesNotMatch(materializer, /rights_verification_state='PASS'|release_eligible=1|qualification_eligible=1/);
});

test("migration 0074 seals official current-rights evidence but keeps ambiguous PAYG rights fail-closed", () => {
  assert.equal(EVALUATION_CURRENT_RIGHTS_EVIDENCE_CAPTURE_VERSION, "EVALUATION_CURRENT_RIGHTS_EVIDENCE_CAPTURE_V1");
  const migration = read("drizzle/0074_clean_audio_commercial_rights_evidence.sql");
  for (const table of [
    "v7_evaluation_current_rights_evidence_capture_policies", "v7_evaluation_current_rights_evidence_capture_runs",
    "v7_evaluation_official_terms_snapshot_receipts", "v7_evaluation_clean_audio_rights_diagnostics",
  ]) assert.match(migration, new RegExp(table));
  for (const source of ["TERMS_OF_USE", "PUBLISHING_COMMERCIAL_LICENSE_HELP", "PAYG_ADMINISTRATION_DOCS", "TTS_CAPABILITY_DOCS"]) assert.match(migration, new RegExp(source));
  for (const lock of ["rights_pass_authority", "dataset_sealing_authority", "assurance_qualification_authority", "release_authority"]) assert.match(migration, new RegExp(`${lock}[^;]+CHECK \\(`, "s"));
  assert.match(migration, /REVIEW_REQUIRED_PAYG_BASE_PLAN_AMBIGUOUS/);
  assert.match(migration, /BASE_PLAN_COMMERCIAL_RIGHTS_NOT_PROVEN/);
  assert.match(migration, /GENERATION_TIME_BASE_PLAN_OR_CONTRACT_EVIDENCE/);
  assert.doesNotMatch(migration, /UPDATE `v7_evaluation_materialized_fixture_artifacts`|INSERT INTO `v7_evaluation_provider_terms_receipts`|rights_state='PASS'|release_eligible=1/);
  const db = new DatabaseSync(":memory:");
  for (const file of readdirSync(new URL("../drizzle", import.meta.url)).filter((name) => name.endsWith(".sql")).sort()) db.exec(read(`drizzle/${file}`));
  const policy = db.prepare("SELECT expected_official_sources,maximum_public_reads,maximum_source_bytes,rights_pass_authority,dataset_sealing_authority,assurance_qualification_authority,release_authority FROM v7_evaluation_current_rights_evidence_capture_policies").get();
  assert.deepEqual({ ...policy }, { expected_official_sources: 4, maximum_public_reads: 4, maximum_source_bytes: 2_000_000, rights_pass_authority: 0, dataset_sealing_authority: 0, assurance_qualification_authority: 0, release_authority: 0 });
  const collector = read("lib/clean-audio-rights-evidence.ts"), ownerBoundary = read("app/api/factory/sequential-production/evaluation/route.ts");
  assert.match(collector, /exactResponseHash/);
  assert.match(collector, /readbackVerified/);
  assert.match(ownerBoundary, /CAPTURE_CURRENT_COMMERCIAL_RIGHTS_EVIDENCE/);
  assert.doesNotMatch(collector, /rights_verification_state='PASS'|release_eligible=1|qualification_eligible=1/);
});

test("migration 0075 permits exactly one paid-plan replacement and one bounded Factory audio QA request", () => {
  assert.equal(COMMERCIAL_CLEAN_AUDIO_REGENERATION_VERSION, "COMMERCIAL_CLEAN_AUDIO_REGENERATION_V1");
  assert.equal(FACTORY_AUDIO_QA_POLICY_VERSION, "FACTORY_AUDIO_QA_POLICY_V1");
  const migration = read("drizzle/0075_commercial_clean_audio_regeneration.sql");
  for (const table of [
    "v7_evaluation_commercial_clean_audio_policies", "v7_evaluation_commercial_clean_audio_runs",
    "v7_evaluation_commercial_subscription_receipts", "v7_evaluation_commercial_clean_audio_provider_receipts",
    "v7_evaluation_commercial_clean_audio_artifacts", "v7_evaluation_commercial_clean_audio_rights_receipts",
    "v7_evaluation_factory_audio_qa_policies", "v7_evaluation_factory_audio_qa_runs", "v7_evaluation_factory_audio_qa_receipts",
  ]) assert.match(migration, new RegExp(table));
  assert.match(migration, /maximum_replacement_fixtures` integer NOT NULL CHECK \(`maximum_replacement_fixtures` = 1\)/);
  assert.match(migration, /maximum_subscription_reads` integer NOT NULL CHECK \(`maximum_subscription_reads` = 1\)/);
  assert.match(migration, /maximum_tts_requests` integer NOT NULL CHECK \(`maximum_tts_requests` = 1\)/);
  assert.match(migration, /maximum_provider_requests` integer NOT NULL CHECK \(`maximum_provider_requests` = 1\)/);
  assert.match(migration, /rights_state` text NOT NULL CHECK \(`rights_state` = 'PASS'\)/);
  assert.match(migration, /owner_ground_truth_required` integer NOT NULL CHECK \(`owner_ground_truth_required` = 1\)/);
  assert.doesNotMatch(migration, /UPDATE `v7_evaluation_materialized_fixture_artifacts`|DELETE FROM|release_eligible=1|dataset_eligible=1|qualification_eligible=1/);
  const db = new DatabaseSync(":memory:");
  for (const file of readdirSync(new URL("../drizzle", import.meta.url)).filter((name) => name.endsWith(".sql")).sort()) db.exec(read(`drizzle/${file}`));
  const replacement = db.prepare("SELECT maximum_replacement_fixtures,maximum_subscription_reads,maximum_tts_requests,maximum_tts_characters,reserved_spend_ceiling_usd,rights_pass_authority,dataset_sealing_authority,assurance_qualification_authority,release_authority FROM v7_evaluation_commercial_clean_audio_policies").get();
  assert.deepEqual({ ...replacement }, { maximum_replacement_fixtures: 1, maximum_subscription_reads: 1, maximum_tts_requests: 1, maximum_tts_characters: 700, reserved_spend_ceiling_usd: 0.08, rights_pass_authority: 1, dataset_sealing_authority: 0, assurance_qualification_authority: 0, release_authority: 0 });
  const qa = db.prepare("SELECT model_id,maximum_provider_requests,reserved_spend_ceiling_usd,overall_floor,dimension_floor,maximum_p0,maximum_p1,owner_ground_truth_required,release_authority FROM v7_evaluation_factory_audio_qa_policies").get();
  assert.deepEqual({ ...qa }, { model_id: "gpt-audio-1.5", maximum_provider_requests: 1, reserved_spend_ceiling_usd: 0.2, overall_floor: 92, dimension_floor: 90, maximum_p0: 0, maximum_p1: 0, owner_ground_truth_required: 1, release_authority: 0 });
  const implementation = read("lib/commercial-clean-audio-regeneration.ts"), ownerBoundary = read("app/api/factory/sequential-production/evaluation/route.ts");
  assert.match(implementation, /evaluateElevenLabsCommercialEntitlement/);
  assert.match(implementation, /COMMERCIAL_SUBSCRIPTION_R2_HASH_MISMATCH/);
  assert.match(implementation, /providerNativeRequestId/);
  assert.match(implementation, /FACTORY_AUDIO_QA_SPEND_CEILING_EXCEEDED/);
  assert.match(implementation, /input_audio/);
  assert.match(ownerBoundary, /REGENERATE_COMMERCIAL_CLEAN_AUDIO_CONTROL/);
  assert.match(ownerBoundary, /RUN_FACTORY_CLEAN_AUDIO_QA/);
});

test("migration 0076 authorizes one append-only recovery only for the exact pre-TTS contract failure", () => {
  assert.equal(COMMERCIAL_CLEAN_AUDIO_RECOVERY_VERSION, "COMMERCIAL_CLEAN_AUDIO_RECOVERY_V1");
  const db = new DatabaseSync(":memory:");
  const migrations = readdirSync(new URL("../drizzle", import.meta.url)).filter((name) => name.endsWith(".sql")).sort();
  const recoveryIndex = migrations.indexOf("0076_commercial_clean_audio_recovery.sql");
  for (const file of migrations.slice(0, recoveryIndex)) db.exec(read(`drizzle/${file}`));
  db.prepare(`INSERT INTO v7_evaluation_commercial_clean_audio_runs
    (id,channel_id,policy_version,idempotency_key,intent_hash,lifecycle_state,subscription_reads,tts_requests,tts_characters,reserved_spend_usd,actor,error_code,completed_at)
    VALUES ('failed-contract-run','channel-hidden-systems','COMMERCIAL_CLEAN_AUDIO_REGENERATION_V1','failed-contract-key',?,'FAILED',1,0,100,0.08,'owner','UNEXPECTED_COMMERCIAL_CLEAN_AUDIO_FAILURE','2026-08-23T03:08:18.173Z')`).run("a".repeat(64));
  db.exec(read("drizzle/0076_commercial_clean_audio_recovery.sql"));
  const authorization = db.prepare("SELECT failed_run_id,failed_subscription_reads,failed_tts_requests,failed_error_code,root_cause_code,authorization_state FROM v7_evaluation_commercial_clean_audio_recovery_authorizations").get();
  assert.deepEqual({ ...authorization }, {
    failed_run_id: "failed-contract-run", failed_subscription_reads: 1, failed_tts_requests: 0,
    failed_error_code: "UNEXPECTED_COMMERCIAL_CLEAN_AUDIO_FAILURE", root_cause_code: "ENTITLEMENT_STATE_CONTRACT_MISMATCH",
    authorization_state: "AUTHORIZED_ONE_RECOVERY",
  });
  assert.throws(() => db.prepare("UPDATE v7_evaluation_commercial_clean_audio_recovery_authorizations SET authorization_state='USED'").run(), /IMMUTABLE/);
  const implementation = read("lib/commercial-clean-audio-regeneration.ts"), ownerBoundary = read("app/api/factory/sequential-production/evaluation/route.ts");
  assert.match(implementation, /'EXPLICIT_ACTIVE_PAID_BASE_PLAN',1/);
  assert.match(implementation, /RECOVERY_ATTEMPT_CONSUMED/);
  assert.match(ownerBoundary, /commercial-clean-audio-recovery-v1/);
});

test("migration 0077 recovers one malformed audio-QA response through a forced function contract", () => {
  assert.equal(FACTORY_AUDIO_QA_RECOVERY_VERSION, "FACTORY_AUDIO_QA_RECOVERY_V1");
  assert.equal(FACTORY_AUDIO_QA_OUTPUT_CONTRACT_VERSION, "FORCED_FUNCTION_CALL_V1");
  const db = new DatabaseSync(":memory:");
  const migrations = readdirSync(new URL("../drizzle", import.meta.url)).filter((name) => name.endsWith(".sql")).sort();
  const recoveryIndex = migrations.indexOf("0077_factory_audio_qa_response_recovery.sql");
  for (const file of migrations.slice(0, recoveryIndex)) db.exec(read(`drizzle/${file}`));
  db.exec("PRAGMA foreign_keys=OFF");
  db.prepare(`INSERT INTO v7_evaluation_factory_audio_qa_runs
    (id,channel_id,policy_version,artifact_id,idempotency_key,request_hash,lifecycle_state,provider_requests,reserved_spend_usd,actual_spend_usd,actor,error_code,completed_at)
    VALUES ('failed-audio-qa','channel-hidden-systems','FACTORY_AUDIO_QA_POLICY_V1','commercial-artifact','failed-audio-qa-key',?,'FAILED',1,0.20,0,'owner','FACTORY_AUDIO_QA_RESPONSE_INVALID','2026-08-23T03:52:44.269Z')`).run("b".repeat(64));
  db.exec(read("drizzle/0077_factory_audio_qa_response_recovery.sql"));
  db.exec("PRAGMA foreign_keys=ON");
  const authorization = db.prepare("SELECT failed_run_id,artifact_id,failed_provider_requests,failed_error_code,failed_actual_spend_state,authorization_state FROM v7_evaluation_factory_audio_qa_recovery_authorizations").get();
  assert.deepEqual({ ...authorization }, {
    failed_run_id: "failed-audio-qa", artifact_id: "commercial-artifact", failed_provider_requests: 1,
    failed_error_code: "FACTORY_AUDIO_QA_RESPONSE_INVALID", failed_actual_spend_state: "UNVERIFIED_RESERVED_AT_0_20",
    authorization_state: "AUTHORIZED_ONE_RECOVERY",
  });
  const policy = db.prepare("SELECT maximum_authorized_recovery_attempts,maximum_additional_provider_requests,additional_reserved_spend_usd,cumulative_reserved_spend_ceiling_usd,authority_boundary,release_authority FROM v7_evaluation_factory_audio_qa_recovery_policies").get();
  assert.deepEqual({ ...policy }, { maximum_authorized_recovery_attempts: 1, maximum_additional_provider_requests: 1, additional_reserved_spend_usd: 0.2, cumulative_reserved_spend_ceiling_usd: 0.4, authority_boundary: "INDEPENDENT_REVIEW_ONLY", release_authority: 0 });
  const implementation = read("lib/commercial-clean-audio-regeneration.ts"), ownerBoundary = read("app/api/factory/sequential-production/evaluation/route.ts");
  assert.match(implementation, /tool_choice: \{ type: "function", function: \{ name: "record_factory_audio_qa" \} \}/);
  assert.match(implementation, /FACTORY_AUDIO_QA_PROVIDER_RESPONSE_CAPTURE_V1/);
  assert.match(implementation, /FACTORY_AUDIO_QA_RESPONSE_R2_HASH_MISMATCH/);
  assert.doesNotMatch(implementation, /response_format/);
  assert.match(ownerBoundary, /factory-clean-audio-qa-recovery-v1/);
});

test("migration 0078 creates one exact-byte owner ground-truth gate without dataset or release authority", () => {
  assert.equal(CLEAN_AUDIO_OWNER_GROUND_TRUTH_VERSION, "CLEAN_AUDIO_OWNER_GROUND_TRUTH_V1");
  assert.equal(CLEAN_AUDIO_OWNER_DEFECT_KEYS.length, 8);
  const db = new DatabaseSync(":memory:");
  const migrations = readdirSync(new URL("../drizzle", import.meta.url)).filter((name) => name.endsWith(".sql")).sort();
  const ownerIndex = migrations.indexOf("0078_clean_audio_owner_ground_truth.sql");
  for (const file of migrations.slice(0, ownerIndex)) db.exec(read(`drizzle/${file}`));
  db.exec("PRAGMA foreign_keys=OFF");
  db.prepare(`INSERT INTO v7_evaluation_commercial_clean_audio_artifacts
    (id,run_id,provider_receipt_id,channel_id,policy_version,replaces_artifact_id,storage_key,mime_type,byte_size,sha256,materialization_state,rights_state,owner_ground_truth_state,factory_audio_qa_state)
    VALUES ('owner-audio-artifact','run','provider','channel-hidden-systems','COMMERCIAL_CLEAN_AUDIO_REGENERATION_V1','old','audio.mp3','audio/mpeg',12000,?,'BYTES_PROVIDER_ENTITLEMENT_AND_RIGHTS_VERIFIED','PASS','NOT_EVALUATED','PENDING')`).run("c".repeat(64));
  db.prepare(`INSERT INTO v7_evaluation_commercial_clean_audio_rights_receipts
    (id,artifact_id,provider_receipt_id,subscription_receipt_id,official_terms_snapshot_receipt_id,channel_id,policy_version,jurisdiction_scope,input_ownership_state,model_state,entitlement_state,rights_state,adjudication_outcome,evidence_hash)
    VALUES ('owner-rights','owner-audio-artifact','provider','subscription','terms','channel-hidden-systems','COMMERCIAL_CLEAN_AUDIO_REGENERATION_V1','NON_EEA_VIETNAM','CHANNEL_AUTHORED_TEXT_HASH_BOUND','NON_BETA_PINNED_MODEL','EXPLICIT_ACTIVE_PAID_BASE_PLAN','PASS','COMMERCIAL_RIGHTS_PASS_GENERATION_TIME_PAID_PLAN',?)`).run("d".repeat(64));
  db.prepare(`INSERT INTO v7_evaluation_factory_audio_qa_recovery_receipts
    (id,recovery_run_id,provider_response_receipt_id,failed_run_id,artifact_id,channel_id,policy_version,exact_artifact_hash,model_id,provider_response_id,decision_state,owner_attention_state,overall_score,dimensions_json,p0_count,p1_count,findings_json,rationale,usage_json,actual_spend_usd,authority_boundary,evidence_hash)
    VALUES ('owner-qa','recovery','response','failed','owner-audio-artifact','channel-hidden-systems','FACTORY_AUDIO_QA_RECOVERY_V1',?,'gpt-audio-1.5','provider-response','LIKELY_CLEAN','NO_IMMEDIATE_OWNER_ACTION',95,'{}',0,0,'[]','clean audio receipt','{}',0.05,'INDEPENDENT_REVIEW_ONLY',?)`).run("c".repeat(64), "e".repeat(64));
  db.exec(read("drizzle/0078_clean_audio_owner_ground_truth.sql"));
  db.exec("PRAGMA foreign_keys=ON");
  const task = db.prepare("SELECT artifact_id,qa_recovery_receipt_id,exact_artifact_hash,task_state FROM v7_evaluation_clean_audio_owner_ground_truth_tasks").get();
  assert.deepEqual({ ...task }, { artifact_id: "owner-audio-artifact", qa_recovery_receipt_id: "owner-qa", exact_artifact_hash: "c".repeat(64), task_state: "OPEN" });
  const policy = db.prepare("SELECT maximum_owner_decisions,full_listen_required,exact_byte_readback_required,authority_boundary,provider_requests,spend_usd,dataset_sealing_authority,assurance_qualification_authority,release_authority FROM v7_evaluation_clean_audio_owner_ground_truth_policies").get();
  assert.deepEqual({ ...policy }, { maximum_owner_decisions: 1, full_listen_required: 1, exact_byte_readback_required: 1, authority_boundary: "OWNER_GROUND_TRUTH_ONLY", provider_requests: 0, spend_usd: 0, dataset_sealing_authority: 0, assurance_qualification_authority: 0, release_authority: 0 });
  assert.throws(() => db.prepare("UPDATE v7_evaluation_clean_audio_owner_ground_truth_tasks SET task_state='OPEN'").run(), /IMMUTABLE/);
  const implementation = read("lib/clean-audio-owner-ground-truth.ts"), ownerBoundary = read("app/api/factory/sequential-production/evaluation/route.ts");
  assert.match(implementation, /CLEAN_AUDIO_FULL_LISTEN_REQUIRED/);
  assert.match(implementation, /CLEAN_AUDIO_OWNER_R2_HASH_MISMATCH/);
  assert.match(implementation, /OWNER_GROUND_TRUTH_ONLY/);
  assert.match(ownerBoundary, /RECORD_CLEAN_AUDIO_OWNER_GROUND_TRUTH/);
  assert.match(ownerBoundary, /ownerGroundTruthAudio/);
  assert.doesNotMatch(implementation, /dataset_eligible=1|qualification_eligible=1|release_eligible=1|api\.openai\.com|elevenlabs\.io/);
});

test("migration 0079 creates and executes one exact-byte clean-control reference gate without downstream authority", async () => {
  assert.equal(CLEAN_AUDIO_CONTROL_ELIGIBILITY_VERSION, "CLEAN_AUDIO_CONTROL_ELIGIBILITY_V1");
  const db = new DatabaseSync(":memory:");
  const audioBytes = new Uint8Array(12000), exactHash = createHash("sha256").update(audioBytes).digest("hex");
  const migrations = readdirSync(new URL("../drizzle", import.meta.url)).filter((name) => name.endsWith(".sql")).sort();
  const eligibilityIndex = migrations.indexOf("0079_clean_audio_control_eligibility.sql");
  for (const file of migrations.slice(0, eligibilityIndex)) db.exec(read(`drizzle/${file}`));
  db.exec("PRAGMA foreign_keys=OFF");
  db.prepare(`INSERT INTO v7_evaluation_commercial_clean_audio_artifacts
    (id,run_id,provider_receipt_id,channel_id,policy_version,replaces_artifact_id,storage_key,mime_type,byte_size,sha256,materialization_state,rights_state,owner_ground_truth_state,factory_audio_qa_state)
    VALUES ('eligible-audio-artifact','run','provider','channel-hidden-systems','COMMERCIAL_CLEAN_AUDIO_REGENERATION_V1','old','eligible-audio.mp3','audio/mpeg',12000,?,'BYTES_PROVIDER_ENTITLEMENT_AND_RIGHTS_VERIFIED','PASS','NOT_EVALUATED','PENDING')`).run(exactHash);
  db.prepare(`INSERT INTO v7_evaluation_commercial_clean_audio_provider_receipts
    (id,run_id,subscription_receipt_id,channel_id,provider_native_request_id,exact_response_hash,response_byte_size,voice_id,model_id,settings_hash,narration_hash,r2_storage_key,r2_readback_hash,r2_readback_verified,rights_state,evidence_hash)
    VALUES ('provider','run','subscription','channel-hidden-systems','native-request-eligibility',?,12000,'voice','eleven_multilingual_v2',?,?,'eligible-audio.mp3',?,1,'PASS',?)`).run(exactHash, "1".repeat(64), "2".repeat(64), exactHash, "3".repeat(64));
  db.prepare(`INSERT INTO v7_evaluation_commercial_clean_audio_rights_receipts
    (id,artifact_id,provider_receipt_id,subscription_receipt_id,official_terms_snapshot_receipt_id,channel_id,policy_version,jurisdiction_scope,input_ownership_state,model_state,entitlement_state,rights_state,adjudication_outcome,evidence_hash)
    VALUES ('eligible-rights','eligible-audio-artifact','provider','subscription','terms','channel-hidden-systems','COMMERCIAL_CLEAN_AUDIO_REGENERATION_V1','NON_EEA_VIETNAM','CHANNEL_AUTHORED_TEXT_HASH_BOUND','NON_BETA_PINNED_MODEL','EXPLICIT_ACTIVE_PAID_BASE_PLAN','PASS','COMMERCIAL_RIGHTS_PASS_GENERATION_TIME_PAID_PLAN',?)`).run("a".repeat(64));
  db.prepare(`INSERT INTO v7_evaluation_factory_audio_qa_recovery_receipts
    (id,recovery_run_id,provider_response_receipt_id,failed_run_id,artifact_id,channel_id,policy_version,exact_artifact_hash,model_id,provider_response_id,decision_state,owner_attention_state,overall_score,dimensions_json,p0_count,p1_count,findings_json,rationale,usage_json,actual_spend_usd,authority_boundary,evidence_hash)
    VALUES ('eligible-qa','recovery','response','failed','eligible-audio-artifact','channel-hidden-systems','FACTORY_AUDIO_QA_RECOVERY_V1',?,'gpt-audio-1.5','provider-response-eligibility','LIKELY_CLEAN','NO_IMMEDIATE_OWNER_ACTION',95,'{}',0,0,'[]','clean audio receipt','{}',0.05,'INDEPENDENT_REVIEW_ONLY',?)`).run(exactHash, "b".repeat(64));
  db.prepare(`INSERT INTO v7_evaluation_clean_audio_owner_ground_truth_receipts
    (id,task_id,artifact_id,qa_recovery_receipt_id,channel_id,policy_version,exact_artifact_hash,decision_state,full_listen_attested,observed_defects_json,rationale,actor,idempotency_key,request_hash,evidence_hash,authority_boundary)
    VALUES ('eligible-owner','owner-task','eligible-audio-artifact','eligible-qa','channel-hidden-systems','CLEAN_AUDIO_OWNER_GROUND_TRUTH_V1',?,'CLEAN_CONFIRMED',1,'[]','I listened to the entire exact audio and confirmed it clean.','owner@example.com','eligible-owner-key',?,?,'OWNER_GROUND_TRUTH_ONLY')`).run(exactHash, "c".repeat(64), "d".repeat(64));
  db.exec(read("drizzle/0079_clean_audio_control_eligibility.sql"));
  db.exec("PRAGMA foreign_keys=ON");
  const task = db.prepare("SELECT blueprint_id,artifact_id,rights_receipt_id,qa_recovery_receipt_id,owner_receipt_id,exact_artifact_hash,task_state FROM v7_evaluation_clean_audio_control_eligibility_tasks").get();
  assert.deepEqual({ ...task }, { blueprint_id: "cfp-v1-12", artifact_id: "eligible-audio-artifact", rights_receipt_id: "eligible-rights", qa_recovery_receipt_id: "eligible-qa", owner_receipt_id: "eligible-owner", exact_artifact_hash: exactHash, task_state: "OPEN" });
  const policy = db.prepare("SELECT maximum_eligibility_receipts,exact_byte_readback_required,authority_boundary,provider_requests,spend_usd,dataset_sealing_authority,assurance_qualification_authority,release_authority FROM v7_evaluation_clean_audio_control_eligibility_policies").get();
  assert.deepEqual({ ...policy }, { maximum_eligibility_receipts: 1, exact_byte_readback_required: 1, authority_boundary: "CLEAN_CONTROL_REFERENCE_ONLY", provider_requests: 0, spend_usd: 0, dataset_sealing_authority: 0, assurance_qualification_authority: 0, release_authority: 0 });
  assert.throws(() => db.prepare("UPDATE v7_evaluation_clean_audio_control_eligibility_tasks SET task_state='OPEN'").run(), /IMMUTABLE/);
  const d1 = { prepare(query) { const statement = db.prepare(query); let values = []; return { bind(...next) { values = next; return this; }, async first() { return statement.get(...values) ?? null; }, async run() { return statement.run(...values); } }; } };
  const outcome = await evaluateCleanAudioControlEligibilityAuthorized({ db: d1, bucket: { async get(key) { return key === "eligible-audio.mp3" ? { async arrayBuffer() { return audioBytes.buffer; } } : null; } }, actor: "owner@example.com", idempotencyKey: "clean-control-eligibility-test-v1", taskId: "clean-audio-control-eligibility-task:eligible-audio-artifact", artifactId: "eligible-audio-artifact", expectedArtifactHash: exactHash });
  assert.equal(outcome.outcome, "RECORDED");
  assert.deepEqual({ ...db.prepare("SELECT decision_state,bytes_state,checksum_state,provenance_state,rights_state,factory_qa_state,owner_ground_truth_state,reference_eligible,dataset_eligible,release_eligible,readiness_state,authority_boundary FROM v7_evaluation_clean_audio_control_eligibility_receipts").get() }, {
    decision_state: "ELIGIBLE_CLEAN_CONTROL_REFERENCE", bytes_state: "READBACK_VERIFIED", checksum_state: "PASS", provenance_state: "PASS", rights_state: "PASS", factory_qa_state: "LIKELY_CLEAN", owner_ground_truth_state: "CLEAN_CONFIRMED", reference_eligible: 1, dataset_eligible: 0, release_eligible: 0, readiness_state: "INSUFFICIENT_GROUND_TRUTH", authority_boundary: "CLEAN_CONTROL_REFERENCE_ONLY",
  });
  const implementation = read("lib/clean-audio-control-eligibility.ts"), route = read("app/api/factory/sequential-production/evaluation/route.ts"), migration = read("drizzle/0079_clean_audio_control_eligibility.sql");
  assert.match(implementation, /CLEAN_AUDIO_CONTROL_R2_HASH_MISMATCH/);
  assert.match(implementation, /ELIGIBLE_CLEAN_CONTROL_REFERENCE/);
  assert.match(implementation, /INSUFFICIENT_GROUND_TRUTH/);
  assert.match(route, /EVALUATE_CLEAN_AUDIO_CONTROL_ELIGIBILITY/);
  assert.match(route, /Đánh giá clean-control eligibility/);
  assert.doesNotMatch(`${implementation}\n${migration}`, /dataset_eligible\s*=\s*1|qualification_eligible\s*=\s*1|release_eligible\s*=\s*1|api\.openai\.com|elevenlabs\.io/);
});

test("migration 0053 adds bounded zero-spend verification runs and durable receipts", () => {
  const migration = read("drizzle/0053_evaluation_corpus_verification.sql");
  for (const table of ["v7_evaluation_verification_runs", "v7_evaluation_verification_receipts"]) assert.match(migration, new RegExp(table));
  assert.match(migration, /maximum_candidates.*BETWEEN 1 AND 20/s);
  assert.match(migration, /provider_requests.*CHECK \(`provider_requests` = 0\)/s);
  assert.match(migration, /spend_usd.*CHECK \(`spend_usd` = 0\)/s);
  assert.doesNotMatch(migration, /api\.openai\.com|elevenlabs\.io|pexels\.com\/v1/);
  const db = new DatabaseSync(":memory:");
  for (const file of readdirSync(new URL("../drizzle", import.meta.url)).filter((name) => name.endsWith(".sql")).sort()) db.exec(read(`drizzle/${file}`));
  const candidateColumns = db.prepare("PRAGMA table_info(v7_evaluation_candidates)").all().map((column) => column.name);
  for (const column of ["verification_state", "latest_verification_receipt_id", "verification_attempted_at"]) assert.ok(candidateColumns.includes(column));
  assert.throws(() => db.prepare(`INSERT INTO v7_evaluation_verification_runs
    (id,channel_id,foundation_version,policy_version,idempotency_key,intent_hash,candidate_ids_json,maximum_candidates,maximum_object_bytes,planned_candidates,provider_requests,spend_usd,actor)
    VALUES ('bad','channel','EVALUATION_FOUNDATION_V1','CORPUS_VERIFICATION_POLICY_V1','key','hash','[]',20,100000000,0,1,0,'owner')`).run(), /CHECK constraint failed/);
  const route = read("app/api/factory/sequential-production/evaluation/route.ts");
  assert.match(route, /RUN_CORPUS_VERIFICATION_BATCH/);
  assert.match(route, /summarizeCorpusEvidenceConflicts/);
  assert.match(route, /CORPUS_VERIFICATION_MAXIMUM_BATCH/);
  assert.match(route, /x-sequential-executor-token/);
  assert.doesNotMatch(route, /authorizeProductionDispatch|api\.openai\.com|elevenlabs\.io/);
  const control = read("app/video-engine/corpus-verification-control.tsx");
  const triage = read("app/video-engine/corpus-evidence-triage.tsx");
  assert.match(control, /corpus-form:pending-\$\{initial\.pending\}/);
  assert.match(route, /searchParams\.set\("corpusPending", String\(corpus\.pending\)\)/);
  assert.match(route, /status: 303, headers: \{ \.\.\.NO_STORE, location: destination\.toString\(\) \}/);
  assert.doesNotMatch(control, /randomUUID/);
  assert.match(triage, /Receipts remain immutable/);
  assert.match(triage, /Khôi phục evidence ElevenLabs/);
  assert.doesNotMatch(triage, /storage_key|computed_hash|source_artifact_id/);
});

test("migration 0054 quarantines byte-divergent evidence and retains metadata-only review append-only", () => {
  const migration = read("drizzle/0054_evaluation_evidence_disposition.sql");
  for (const table of ["v7_evaluation_evidence_incidents", "v7_evaluation_candidate_dispositions"]) assert.match(migration, new RegExp(table));
  assert.match(migration, /SOURCE_OBJECT_BYTE_DIVERGENCE/);
  assert.match(migration, /R2_METADATA_BINDING_MISMATCH/);
  assert.match(migration, /QUARANTINE_EVALUATION_ONLY/);
  assert.doesNotMatch(migration, /DELETE FROM|api\.openai\.com|elevenlabs\.io/);

  const db = new DatabaseSync(":memory:");
  const migrations = readdirSync(new URL("../drizzle", import.meta.url)).filter((name) => name.endsWith(".sql")).sort();
  const dispositionIndex = migrations.indexOf("0054_evaluation_evidence_disposition.sql");
  for (const file of migrations.slice(0, dispositionIndex)) db.exec(read(`drizzle/${file}`));
  db.prepare(`INSERT INTO v7_evaluation_verification_runs
    (id,channel_id,foundation_version,policy_version,idempotency_key,intent_hash,candidate_ids_json,maximum_candidates,maximum_object_bytes,planned_candidates,actor)
    VALUES ('run-0054','channel-test','EVALUATION_FOUNDATION_V1','CORPUS_VERIFICATION_POLICY_V1','0054-idempotency','0054-intent','["candidate-diverged","candidate-metadata"]',20,100000000,2,'owner')`).run();
  const insertCandidate = db.prepare(`INSERT INTO v7_evaluation_candidates
    (id,channel_id,source_family,source_table,source_id,candidate_kind,artifact_type,correlation_group,verification_state)
    VALUES (?,?,?,?,?,?,?,?, 'BLOCKED')`);
  insertCandidate.run("candidate-diverged", "channel-test", "PRODUCTION_V2_REJECTED", "production_v2_artifacts", "source-diverged", "CLIP", "VISUAL", "package-1");
  insertCandidate.run("candidate-metadata", "channel-test", "PRODUCTION_V2_REJECTED", "production_v2_artifacts", "source-metadata", "AUDIO", "AUDIO", "package-1");
  const insertReceipt = db.prepare(`INSERT INTO v7_evaluation_verification_receipts
    (id,run_id,candidate_id,source_artifact_id,storage_key,declared_hash,computed_hash,declared_bytes,actual_bytes,bytes_state,checksum_state,provenance_state,rights_verification_state,rights_basis,object_metadata_json,reconciliation_reasons_json,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,'READBACK_VERIFIED',?,'FAIL','RECEIPT_REQUIRED','AUTHORSHIP_EVIDENCE_INCOMPLETE','{}',?,?)`);
  insertReceipt.run("receipt-diverged", "run-0054", "candidate-diverged", "source-diverged", "r2/diverged", "a", "b", 10, 12, "FAIL", '["CHECKSUM_MISMATCH","R2_OBJECT_METADATA_MISMATCH"]', "evidence-diverged");
  insertReceipt.run("receipt-metadata", "run-0054", "candidate-metadata", "source-metadata", "r2/metadata", "c", "c", 10, 10, "PASS", '["R2_OBJECT_METADATA_MISMATCH"]', "evidence-metadata");
  db.prepare("UPDATE v7_evaluation_candidates SET latest_verification_receipt_id=? WHERE id=?").run("receipt-diverged", "candidate-diverged");
  db.prepare("UPDATE v7_evaluation_candidates SET latest_verification_receipt_id=? WHERE id=?").run("receipt-metadata", "candidate-metadata");
  db.exec(migration);

  assert.equal(db.prepare("SELECT COUNT(*) count FROM v7_evaluation_evidence_incidents").get().count, 2);
  assert.equal(db.prepare("SELECT COUNT(*) count FROM v7_evaluation_candidate_dispositions").get().count, 1);
  assert.deepEqual({ ...db.prepare("SELECT lifecycle_state,verification_state,exclusion_reason FROM v7_evaluation_candidates WHERE id='candidate-diverged'").get() }, {
    lifecycle_state: "EXCLUDED", verification_state: "EXCLUDED", exclusion_reason: "DECLARED_SOURCE_BYTES_DIVERGE_FROM_R2_OBJECT",
  });
  assert.equal(db.prepare("SELECT verification_state FROM v7_evaluation_candidates WHERE id='candidate-metadata'").get().verification_state, "BLOCKED");
  assert.throws(() => db.prepare("DELETE FROM v7_evaluation_candidate_dispositions").run(), /EVALUATION_CANDIDATE_DISPOSITION_IMMUTABLE/);
  assert.throws(() => db.prepare("UPDATE v7_evaluation_evidence_incidents SET incident_state='OPEN'").run(), /EVALUATION_EVIDENCE_INCIDENT_IMMUTABLE/);
});

test("migrations 0055 and 0056 rebind exact metadata then separately prove channel-authored rights", () => {
  const migration = read("drizzle/0055_evaluation_metadata_binding_reconciliation.sql");
  for (const table of ["v7_evaluation_metadata_binding_receipts", "v7_evaluation_incident_resolutions"]) assert.match(migration, new RegExp(table));
  assert.match(migration, /METADATA_BINDING_RECONCILIATION_V1/);
  assert.match(migration, /UNIQUE_STORAGE_HASH_REBIND_VERIFIED/);
  assert.match(migration, /NOT EXISTS \(SELECT 1 FROM production_v2_artifacts other/);
  assert.doesNotMatch(migration, /DELETE FROM|api\.openai\.com|elevenlabs\.io/);

  const db = new DatabaseSync(":memory:");
  const migrations = readdirSync(new URL("../drizzle", import.meta.url)).filter((name) => name.endsWith(".sql")).sort();
  const dispositionIndex = migrations.indexOf("0054_evaluation_evidence_disposition.sql");
  for (const file of migrations.slice(0, dispositionIndex)) db.exec(read(`drizzle/${file}`));
  db.exec("PRAGMA foreign_keys=OFF");
  db.prepare(`INSERT INTO production_v2_packages
    (id,channel_id,policy_id,source_brief_id,episode_concept_id,title,lifecycle_state,target_duration_seconds,shot_count,content_hash)
    VALUES ('package-0055','channel-test','policy-test','brief-0055','episode-0055','Metadata fixture','REJECTED_QUALITY',600,1,?)`).run("d".repeat(64));
  db.prepare(`INSERT INTO production_v2_artifacts
    (id,package_id,artifact_type,storage_key,mime_type,byte_size,sha256,rights_state,provenance_json,engine_version)
    VALUES ('source-0055','package-0055','VISUAL_FRAME','r2/0055.svg','image/svg+xml',10,?,'CHANNEL_OWNED_OR_PROVIDER_COMMERCIAL','{"author":"engine","legacySources":0}','ENGINE-V1')`).run("e".repeat(64));
  db.exec("PRAGMA foreign_keys=ON");
  db.prepare(`INSERT INTO v7_evaluation_verification_runs
    (id,channel_id,foundation_version,policy_version,idempotency_key,intent_hash,candidate_ids_json,maximum_candidates,maximum_object_bytes,planned_candidates,actor)
    VALUES ('run-0055','channel-test','EVALUATION_FOUNDATION_V1','CORPUS_VERIFICATION_POLICY_V1','0055-idempotency','0055-intent','["candidate-0055"]',20,100000000,1,'owner')`).run();
  db.prepare(`INSERT INTO v7_evaluation_candidates
    (id,channel_id,source_family,source_table,source_id,candidate_kind,artifact_type,storage_key,mime_type,byte_size,content_hash,bytes_state,checksum_state,provenance_state,rights_declared_state,rights_verification_state,correlation_group,verification_state)
    VALUES ('candidate-0055','channel-test','PRODUCTION_V2_REJECTED','production_v2_artifacts','source-0055','CLIP','VISUAL_FRAME','r2/0055.svg','image/svg+xml',10,?,'READBACK_VERIFIED','PASS','FAIL','CHANNEL_OWNED_OR_PROVIDER_COMMERCIAL','RECEIPT_REQUIRED','package-0055','BLOCKED')`).run("e".repeat(64));
  db.prepare(`INSERT INTO v7_evaluation_verification_receipts
    (id,run_id,candidate_id,source_artifact_id,storage_key,declared_hash,computed_hash,declared_bytes,actual_bytes,bytes_state,checksum_state,provenance_state,rights_verification_state,rights_basis,object_metadata_json,reconciliation_reasons_json,evidence_hash)
    VALUES ('receipt-0055','run-0055','candidate-0055','source-0055','r2/0055.svg',?,?,10,10,'READBACK_VERIFIED','PASS','FAIL','RECEIPT_REQUIRED','AUTHORSHIP_EVIDENCE_INCOMPLETE',?,'["R2_OBJECT_METADATA_MISMATCH","AUTHORSHIP_EVIDENCE_INCOMPLETE"]','evidence-0055')`)
    .run("e".repeat(64), "e".repeat(64), JSON.stringify({ artifactId: "stale-artifact-id", packageId: "package-0055", sha256: "e".repeat(64), engineVersion: "ENGINE-V1" }));
  db.prepare("UPDATE v7_evaluation_candidates SET latest_verification_receipt_id='receipt-0055' WHERE id='candidate-0055'").run();
  db.exec(read("drizzle/0054_evaluation_evidence_disposition.sql"));
  db.exec(migration);

  assert.equal(db.prepare("SELECT COUNT(*) count FROM v7_evaluation_metadata_binding_receipts").get().count, 1);
  assert.equal(db.prepare("SELECT COUNT(*) count FROM v7_evaluation_incident_resolutions").get().count, 1);
  assert.deepEqual({ ...db.prepare("SELECT provenance_state,rights_verification_state,verification_state,lifecycle_state FROM v7_evaluation_candidates WHERE id='candidate-0055'").get() }, {
    provenance_state: "PASS", rights_verification_state: "RECEIPT_REQUIRED", verification_state: "PARTIAL_RIGHTS_PENDING", lifecycle_state: "CANDIDATE_EVIDENCE",
  });
  assert.throws(() => db.prepare("DELETE FROM v7_evaluation_metadata_binding_receipts").run(), /EVALUATION_METADATA_BINDING_RECEIPT_IMMUTABLE/);
  assert.throws(() => db.prepare("UPDATE v7_evaluation_incident_resolutions SET actor='other'").run(), /EVALUATION_INCIDENT_RESOLUTION_IMMUTABLE/);

  const rightsMigration = read("drizzle/0056_evaluation_rights_reconciliation.sql");
  assert.match(rightsMigration, /EVALUATION_RIGHTS_RECONCILIATION_V1/);
  assert.match(rightsMigration, /CHANNEL_AUTHORED_EVALUATION_USE/);
  assert.match(rightsMigration, /basis_metadata_binding_receipt_id/);
  assert.doesNotMatch(rightsMigration, /DELETE FROM|api\.openai\.com|elevenlabs\.io/);
  db.exec(rightsMigration);
  assert.equal(db.prepare("SELECT COUNT(*) count FROM v7_evaluation_rights_receipts").get().count, 1);
  assert.deepEqual({ ...db.prepare("SELECT provenance_state,rights_verification_state,verification_state,lifecycle_state FROM v7_evaluation_candidates WHERE id='candidate-0055'").get() }, {
    provenance_state: "PASS", rights_verification_state: "PASS", verification_state: "EVIDENCE_VERIFIED", lifecycle_state: "CANDIDATE_EVIDENCE",
  });
  assert.throws(() => db.prepare("DELETE FROM v7_evaluation_rights_receipts").run(), /EVALUATION_RIGHTS_RECEIPT_IMMUTABLE/);
});
