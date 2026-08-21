import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  EVALUATION_FOUNDATION_VERSION,
  OWNER_STANDING_AUTHORITY,
  evaluateAssuranceQualification,
  evaluateCandidateVerification,
  standingAuthorityCovers,
  summarizeEvaluationInventory,
} from "../lib/evaluation-foundation.ts";

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
