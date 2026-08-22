import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  EVALUATION_FOUNDATION_VERSION,
  CORPUS_VERIFICATION_POLICY_VERSION,
  EVALUATION_RIGHTS_EVIDENCE_POLICY_VERSION,
  EVALUATION_OWNER_LABEL_POLICY_VERSION,
  EVALUATION_OWNER_REVIEW_UX_VERSION,
  EVALUATION_CORRELATION_CONTROL_VERSION,
  OWNER_STANDING_AUTHORITY,
  evaluateAuthorshipEvidence,
  evaluateAssuranceQualification,
  evaluateCandidateVerification,
  evaluateCompositeRightsEvidence,
  evaluateProviderRightsEvidence,
  evaluateOwnerLabelSubmission,
  isOwnerObservableDefect,
  normalizeOwnerLabelsForReceipt,
  evaluateCorrelationAssignments,
  reconcileCorpusArtifactEvidence,
  standingAuthorityCovers,
  summarizeCorpusEvidenceConflicts,
  summarizeEvaluationRightsQueue,
  summarizeEvaluationInventory,
} from "../lib/evaluation-foundation.ts";
import { canonicalStringify } from "../lib/canonical-json.ts";

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
  assert.match(route, /Chỉ cần làm 3 việc/);
  assert.match(route, /Xác nhận và sang mẫu tiếp theo/);
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
