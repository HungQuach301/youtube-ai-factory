import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { recordFactoryAssuranceCorpusSnapshot } from "../lib/factory-assurance-calibration-corpus.ts";
import { materializeFactoryAssuranceCorpusRemediationInventory } from "../lib/factory-assurance-corpus-remediation.ts";
import { verifyFactoryAssuranceCorpusRemediationEvidenceBatch } from "../lib/factory-assurance-corpus-remediation-evidence.ts";
import { classifyFactoryAssuranceCorpusRemediationIncidents } from "../lib/factory-assurance-corpus-remediation-incidents.ts";
import { inventoryFactoryAssuranceCurrentRightsEvidence } from "../lib/factory-assurance-current-rights-inventory.ts";
import { materializeFactoryAssuranceCurrentRightsCollection } from "../lib/factory-assurance-current-rights-collection.ts";
import { classifyFactoryAssuranceCurrentRightsTerminalDisposition } from "../lib/factory-assurance-current-rights-terminal-disposition.ts";
import { planFactoryAssuranceControlledFixtureReplacements } from "../lib/factory-assurance-controlled-fixture-replacement-plan.ts";
import { admitFactoryAssuranceControlledFixtureMaterializationBatch } from "../lib/factory-assurance-controlled-fixture-materialization-admission.ts";
import { preflightFactoryAssuranceControlledFixtureAudioBatch } from "../lib/factory-assurance-controlled-fixture-audio-preflight.ts";
import { factoryQaCockpitProjection } from "../lib/factory-qa-cockpit-projection.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const migrations = readdirSync(new URL("../drizzle", import.meta.url)).filter((name) => name.endsWith(".sql")).sort();
const hash = (value) => createHash("sha256").update(value).digest("hex");

function d1(database) {
  return {
    prepare(query) {
      const statement = database.prepare(query); let values = [];
      return {
        bind(...next) { values = next; return this; },
        async first() { return statement.get(...values) ?? null; },
        async all() { return { results: statement.all(...values) }; },
        async run() { const result = statement.run(...values); return { success: true, meta: { changes: result.changes } }; },
      };
    },
    async batch(statements) {
      database.exec("BEGIN IMMEDIATE");
      try { const output = []; for (const statement of statements) output.push(await statement.run()); database.exec("COMMIT"); return output; }
      catch (error) { database.exec("ROLLBACK"); throw error; }
    },
  };
}

function setup() {
  const database = new DatabaseSync(":memory:"); database.exec("PRAGMA foreign_keys=ON");
  for (const migration of migrations) database.exec(read(`drizzle/${migration}`));
  return { database, db: d1(database) };
}

async function seedCorpus(db) {
  await recordFactoryAssuranceCorpusSnapshot(db, {
    snapshotKey: "factory:assurance:evidence-test-corpus:hidden-systems:v1",
    channelId: "channel-hidden-systems",
    formatKey: "hidden-systems-documentary",
    policyVersion: "AI_FIRST_PRODUCTION_ASSURANCE_V1",
    sourceSnapshotHash: hash("evidence-test-source-snapshot"),
    items: [],
    evidenceHash: hash("evidence-test-corpus-evidence"),
  });
}

function seedSource(database, { id, bytes, rights = false, metadataValid = true, storageKey: suppliedStorageKey = "", candidateKind = "AUDIO" }) {
  const artifactId = `artifact-${id}`, packageId = `package-${id}`, storageKey = suppliedStorageKey || `remediation/${id}.bin`, exactHash = hash(bytes);
  const artifactType = candidateKind === "MASTER" ? "FULL_VIDEO_MASTER" : candidateKind;
  const mimeType = candidateKind === "MASTER" ? "video/webm" : "audio/mpeg";
  database.exec("PRAGMA foreign_keys=OFF");
  database.prepare(`INSERT INTO production_v2_packages
    (id,channel_id,policy_id,source_brief_id,episode_concept_id,title,lifecycle_state,target_duration_seconds,shot_count,content_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(packageId, "channel-hidden-systems", "policy-test", `brief-${id}`, `episode-${id}`, `Package ${id}`, "REJECTED_QUALITY", 60, 1, hash(`package-${id}`));
  database.prepare(`INSERT INTO production_v2_artifacts
    (id,package_id,artifact_type,storage_key,mime_type,byte_size,sha256,rights_state,provenance_json,engine_version)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(artifactId, packageId, artifactType, storageKey, mimeType, Buffer.byteLength(bytes), exactHash, rights ? "COMMERCIAL_LICENSE_VERIFIED" : "RIGHTS_REVIEW_REQUIRED", JSON.stringify({ author: "factory-test", legacySources: 0 }), "ENGINE-TEST-V1");
  database.exec("PRAGMA foreign_keys=ON");
  database.prepare(`INSERT INTO v7_evaluation_candidates
    (id,channel_id,source_family,source_table,source_id,candidate_kind,artifact_type,lifecycle_state,storage_key,mime_type,byte_size,content_hash,bytes_state,checksum_state,provenance_state,rights_declared_state,rights_verification_state,correlation_group,verification_state)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      id, "channel-hidden-systems", "PRODUCTION_V2_REJECTED", "production_v2_artifacts", artifactId, candidateKind, artifactType, "CANDIDATE_EVIDENCE", storageKey, mimeType, Buffer.byteLength(bytes), exactHash,
      "READBACK_VERIFIED", "PASS", "PASS", rights ? "COMMERCIAL_LICENSE_VERIFIED" : "RIGHTS_REVIEW_REQUIRED", rights ? "PASS" : "RECEIPT_REQUIRED", `lineage-${id}`, rights ? "EVIDENCE_VERIFIED" : "PARTIAL_RIGHTS_PENDING",
    );
  if (rights) database.prepare(`INSERT INTO v7_evaluation_authorship_receipts
    (id,channel_id,candidate_id,artifact_hash,authorship_type,author_identity,territory,valid_from,commercial_use_state,evidence_hash,actor)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(`authorship-${id}`, "channel-hidden-systems", id, exactHash, "CHANNEL_ORIGINAL", "factory-test", "WORLDWIDE", "2020-01-01T00:00:00.000Z", "VERIFIED_COMMERCIAL_USE", hash(`rights-${id}`), "owner@example.com");
  const metadata = metadataValid
    ? { artifactId, packageId, sha256: exactHash, engineVersion: "ENGINE-TEST-V1" }
    : { artifactId: "wrong-artifact", packageId, sha256: exactHash, engineVersion: "ENGINE-TEST-V1" };
  return { id, bytes: new TextEncoder().encode(bytes), storageKey, metadata, exactHash };
}

function bucket(items) {
  const byKey = new Map(items.map((item) => [item.storageKey, item]));
  return {
    async get(key) {
      const item = byKey.get(key); if (!item) return null;
      return { size: item.bytes.byteLength, customMetadata: item.metadata, async arrayBuffer() { return item.bytes.buffer.slice(item.bytes.byteOffset, item.bytes.byteOffset + item.bytes.byteLength); } };
    },
  };
}

function seedTerminalRecoveryEvidence(database, provider, master) {
  const historyRunId = "terminal-history-run", historySnapshotId = "terminal-history-snapshot", audioRunId = "terminal-audio-run", audioSnapshotId = "terminal-audio-snapshot";
  database.prepare(`INSERT INTO v7_evaluation_provider_history_recovery_runs
    (id,channel_id,policy_version,idempotency_key,lifecycle_state,date_after_unix,date_before_unix,maximum_history_items,history_items_received,provider_requests,actor,completed_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(historyRunId, "channel-hidden-systems", "EVALUATION_PROVIDER_HISTORY_RECOVERY_V1", "terminal-history-idempotency-0001", "COMPLETE", 1, 2, 1000, 1, 2, "owner@example.com", "2026-08-28T00:00:00.000Z");
  database.prepare(`INSERT INTO v7_evaluation_provider_history_snapshots
    (id,channel_id,recovery_run_id,policy_version,history_items_received,history_items_with_native_request_id,candidates_diagnosed,unique_metadata_matches,no_metadata_matches,ambiguous_metadata_matches,subscription_tier,subscription_status,billing_period,subscription_observed_at,history_response_hash,subscription_response_hash,provider_requests)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(historySnapshotId, "channel-hidden-systems", historyRunId, "EVALUATION_PROVIDER_HISTORY_RECOVERY_V1", 1, 1, 1, 0, 0, 1, "PAYG", "ACTIVE", "MONTHLY", "2026-08-28T00:00:00.000Z", hash("terminal-history-response"), hash("terminal-subscription-response"), 2);
  database.prepare(`INSERT INTO v7_evaluation_provider_audio_hash_runs
    (id,channel_id,policy_version,idempotency_key,lifecycle_state,planned_history_items,processed_history_items,successful_history_items,failed_history_items,provider_requests,actor,completed_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(audioRunId, "channel-hidden-systems", "EVALUATION_PROVIDER_AUDIO_HASH_RECOVERY_V1", "terminal-audio-idempotency-0001", "COMPLETE", 1, 1, 1, 0, 1, "owner@example.com", "2026-08-28T00:00:00.000Z");
  database.prepare(`INSERT INTO v7_evaluation_provider_audio_hash_snapshots
    (id,channel_id,audio_hash_run_id,policy_version,lifecycle_state,history_items_total,history_items_hash_verified,history_items_retryable,history_items_exhausted,candidates_diagnosed,unique_exact_hash_matches,equivalent_exact_hash_match_sets,no_exact_hash_matches,provider_requests_cumulative)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(audioSnapshotId, "channel-hidden-systems", audioRunId, "EVALUATION_PROVIDER_AUDIO_HASH_RECOVERY_V1", "COMPLETE", 1, 1, 0, 0, 1, 0, 0, 1, 3);
  database.prepare(`INSERT INTO v7_evaluation_historical_recovery_closures
    (id,channel_id,policy_version,metadata_snapshot_id,audio_hash_snapshot_id,history_items_total,history_items_hash_verified,candidates_diagnosed,unique_exact_hash_matches,equivalent_exact_hash_match_sets,no_exact_hash_matches,conclusion,candidate_disposition,historical_rights_resolution_state,provider_requests)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run("terminal-recovery-closure", "channel-hidden-systems", "EVALUATION_HISTORICAL_RECOVERY_CLOSURE_V1", historySnapshotId, audioSnapshotId, 1, 1, 1, 0, 0, 1, "NO_EXACT_PROVIDER_AUDIO_FOUND", "QUARANTINE_FAILURE_EVIDENCE_ONLY", "EXHAUSTED_NO_EXACT_BINDING", 3);
  database.prepare(`INSERT INTO v7_evaluation_provider_audio_hash_candidate_diagnostics
    (id,channel_id,audio_hash_run_id,candidate_id,policy_version,exact_hash_match_count,matched_history_item_ids_json,provider_binding_state,exact_audio_hash_verified,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run("terminal-provider-diagnostic", "channel-hidden-systems", audioRunId, provider.id, "EVALUATION_PROVIDER_AUDIO_HASH_RECOVERY_V1", 0, "[]", "NO_EXACT_AUDIO_HASH_MATCH", 0, hash("terminal-provider-diagnostic"));
  database.prepare(`INSERT INTO v7_evaluation_rights_evidence_tasks
    (id,channel_id,candidate_id,task_type,blocking_reason,requirements_json,policy_version)
    VALUES (?,?,?,?,?,?,?)`).run("terminal-master-rights-task", "channel-hidden-systems", master.id, "COMPOSITE_PARENT_RIGHTS_MANIFEST", "EXACT_PARENT_SET_REQUIRED", "[]", "EVALUATION_RIGHTS_EVIDENCE_POLICY_V1");
  database.prepare(`INSERT INTO v7_evaluation_rights_lineage_diagnostics
    (id,channel_id,task_id,candidate_id,task_type,policy_version,source_artifact_id,artifact_hash,discoverable_package_manifest_count,declared_parent_count,verified_parent_count,diagnostic_state,reasons_json)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run("terminal-lineage-diagnostic", "channel-hidden-systems", "terminal-master-rights-task", master.id, "COMPOSITE_PARENT_RIGHTS_MANIFEST", "EVALUATION_RIGHTS_LINEAGE_DIAGNOSTIC_V1", `artifact-${master.id}`, master.exactHash, 0, 0, 0, "SOURCE_LINEAGE_BINDING_MISSING", "[\"SOURCE_ARTIFACT_HAS_NO_EXACT_MANIFEST_BINDING\"]");
}

test("migrations 0118 through 0126 install append-only fail-closed remediation, preflight and audio-provider certification receipts", () => {
  assert.equal(migrations.at(-1), "0126_factory_assurance_audio_provider_certification.sql");
  const migration = read("drizzle/0118_factory_assurance_corpus_remediation_evidence.sql");
  for (const table of ["factory_assurance_corpus_remediation_evidence_runs", "factory_assurance_corpus_remediation_evidence_receipts"]) assert.ok(migration.includes(`CREATE TABLE \`${table}\``));
  for (const lock of ["count_eligible", "qualification_authority", "pass_authority", "provider_dispatch_authority", "r22_authority", "master_authority", "release_authority", "publication_authority", "provider_requests", "spend_micros"]) assert.match(migration, new RegExp(`${lock}[^;]+CHECK \\(`, "s"));
  assert.doesNotMatch(migration, /api\.openai\.com|elevenlabs\.io|youtube-ai-factory-v2/);
  const incidentMigration = read("drizzle/0119_factory_assurance_corpus_remediation_incident_disposition.sql");
  for (const table of ["factory_assurance_corpus_remediation_incident_runs", "factory_assurance_corpus_remediation_incident_receipts"]) assert.ok(incidentMigration.includes(`CREATE TABLE \`${table}\``));
  for (const lock of ["count_eligible", "qualification_authority", "pass_authority", "provider_dispatch_authority", "r22_authority", "master_authority", "release_authority", "publication_authority", "provider_requests", "spend_micros"]) assert.match(incidentMigration, new RegExp(`${lock}[^;]+CHECK \\(`, "s"));
  assert.doesNotMatch(incidentMigration, /api\.openai\.com|elevenlabs\.io|youtube-ai-factory-v2/);
  const rightsMigration = read("drizzle/0120_factory_assurance_current_rights_inventory.sql");
  for (const table of ["factory_assurance_current_rights_inventory_runs", "factory_assurance_current_rights_inventory_receipts"]) assert.ok(rightsMigration.includes(`CREATE TABLE \`${table}\``));
  for (const lock of ["count_eligible", "qualification_authority", "pass_authority", "provider_dispatch_authority", "r22_authority", "master_authority", "release_authority", "publication_authority", "provider_requests", "spend_micros"]) assert.match(rightsMigration, new RegExp(`${lock}[^;]+CHECK \\(`, "s"));
  assert.doesNotMatch(rightsMigration, /api\.openai\.com|elevenlabs\.io|youtube-ai-factory-v2|UPDATE `v7_evaluation_candidates`/);
  const collectionMigration = read("drizzle/0121_factory_assurance_current_rights_collection.sql");
  for (const table of ["factory_assurance_current_rights_collection_runs", "factory_assurance_current_rights_collection_tasks"]) assert.ok(collectionMigration.includes(`CREATE TABLE \`${table}\``));
  for (const lock of ["count_eligible", "qualification_authority", "pass_authority", "provider_dispatch_authority", "r22_authority", "master_authority", "release_authority", "publication_authority", "provider_requests", "spend_micros"]) assert.match(collectionMigration, new RegExp(`${lock}[^;]+CHECK \\(`, "s"));
  assert.doesNotMatch(collectionMigration, /api\.openai\.com|elevenlabs\.io|youtube-ai-factory-v2|UPDATE `v7_evaluation_candidates`/);
  const terminalMigration = read("drizzle/0122_factory_assurance_current_rights_terminal_disposition.sql");
  for (const table of ["factory_assurance_current_rights_terminal_disposition_runs", "factory_assurance_current_rights_terminal_disposition_receipts"]) assert.ok(terminalMigration.includes(`CREATE TABLE \`${table}\``));
  for (const lock of ["count_eligible", "qualification_authority", "pass_authority", "provider_dispatch_authority", "r22_authority", "master_authority", "release_authority", "publication_authority", "provider_requests", "spend_micros"]) assert.match(terminalMigration, new RegExp(`${lock}[^;]+CHECK \\(`, "s"));
  assert.doesNotMatch(terminalMigration, /api\.openai\.com|elevenlabs\.io|youtube-ai-factory-v2|UPDATE `v7_evaluation_candidates`/);
  const replacementMigration = read("drizzle/0123_factory_assurance_controlled_fixture_replacement_plan.sql");
  for (const table of ["factory_assurance_controlled_fixture_replacement_plan_runs", "factory_assurance_controlled_fixture_replacement_work_orders"]) assert.ok(replacementMigration.includes(`CREATE TABLE \`${table}\``));
  for (const lock of ["count_eligible", "qualification_authority", "pass_authority", "provider_dispatch_authority", "r22_authority", "master_authority", "release_authority", "publication_authority", "provider_requests", "spend_micros"]) assert.match(replacementMigration, new RegExp(`${lock}[^;]+CHECK \\(`, "s"));
  assert.doesNotMatch(replacementMigration, /api\.openai\.com|elevenlabs\.io|youtube-ai-factory-v2|UPDATE `v7_evaluation_candidates`/);
  const admissionMigration = read("drizzle/0124_factory_assurance_controlled_fixture_materialization_admission.sql");
  for (const table of ["factory_assurance_controlled_fixture_materialization_admission_runs", "factory_assurance_controlled_fixture_materialization_admission_items"]) assert.ok(admissionMigration.includes(`CREATE TABLE \`${table}\``));
  for (const lock of ["count_eligible", "qualification_authority", "pass_authority", "provider_dispatch_authority", "cost_reservation_authority", "r22_authority", "master_authority", "release_authority", "publication_authority", "provider_requests", "spend_micros"]) assert.match(admissionMigration, new RegExp(`${lock}[^;]+CHECK \\(`, "s"));
  assert.doesNotMatch(admissionMigration, /api\.openai\.com|elevenlabs\.io|youtube-ai-factory-v2|UPDATE `v7_evaluation_candidates`/);
  const audioPreflightMigration = read("drizzle/0125_factory_assurance_controlled_fixture_audio_preflight.sql");
  for (const table of ["factory_assurance_controlled_fixture_audio_preflight_runs", "factory_assurance_controlled_fixture_audio_request_contracts"]) assert.ok(audioPreflightMigration.includes(`CREATE TABLE \`${table}\``));
  for (const lock of ["count_eligible", "qualification_authority", "pass_authority", "provider_dispatch_authority", "cost_reservation_authority", "r22_authority", "master_authority", "release_authority", "publication_authority", "provider_requests", "spend_micros"]) assert.match(audioPreflightMigration, new RegExp(`${lock}[^;]+CHECK \\(`, "s"));
  assert.doesNotMatch(audioPreflightMigration, /api\.openai\.com|elevenlabs\.io|youtube-ai-factory-v2|UPDATE `v7_evaluation_candidates`/);
  const audioCertificationMigration = read("drizzle/0126_factory_assurance_audio_provider_certification.sql");
  for (const table of ["factory_assurance_audio_provider_certification_policies", "factory_assurance_audio_provider_certification_runs", "factory_assurance_audio_provider_observation_receipts"]) assert.ok(audioCertificationMigration.includes(`CREATE TABLE \`${table}\``));
  for (const lock of ["provider_generation_requests", "provider_dispatch_authority", "cost_reservation_authority", "release_authority", "publication_authority", "spend_micros"]) assert.match(audioCertificationMigration, new RegExp(`${lock}[^;]+CHECK \\(`, "s"));
  assert.doesNotMatch(audioCertificationMigration, /youtube-ai-factory-v2|UPDATE `v7_evaluation_candidates`/);
});

test("evidence runner verifies exact R2 bytes but keeps missing current rights fail-closed and count-ineligible", async () => {
  const { database, db } = setup(); await seedCorpus(db);
  const ready = seedSource(database, { id: "evidence-ready-audio", bytes: "ready-audio-bytes", rights: true });
  const blocked = seedSource(database, { id: "evidence-blocked-audio", bytes: "blocked-audio-bytes", rights: false, metadataValid: false });
  const inventory = await materializeFactoryAssuranceCorpusRemediationInventory(db, "owner@example.com");
  assert.equal(inventory.candidateCount, 2);
  const result = await verifyFactoryAssuranceCorpusRemediationEvidenceBatch({ DB: db, BUCKET: bucket([ready, blocked]) }, {
    actor: "owner@example.com", idempotencyKey: "assurance-evidence-batch-0001", batchLimit: 2,
  });
  assert.deepEqual({ outcome: result.outcome, checked: result.checkedItems, remaining: result.remainingItems, bytes: result.byteVerifiedItems, checksums: result.checksumPassItems, provenance: result.provenancePassItems, rights: result.rightsPassItems, exact: result.exactEvidenceReadyItems },
    { outcome: "RECORDED", checked: 2, remaining: 0, bytes: 2, checksums: 2, provenance: 1, rights: 1, exact: 1 });
  const receipts = database.prepare(`SELECT source_candidate_id,rights_state,provenance_state,exact_evidence_state,count_eligible,provider_requests,spend_micros
    FROM factory_assurance_corpus_remediation_evidence_receipts ORDER BY source_candidate_id`).all().map((row) => ({ ...row }));
  assert.deepEqual(receipts, [
    { source_candidate_id: "evidence-blocked-audio", rights_state: "RECEIPT_REQUIRED", provenance_state: "FAIL", exact_evidence_state: "BLOCKED", count_eligible: 0, provider_requests: 0, spend_micros: 0 },
    { source_candidate_id: "evidence-ready-audio", rights_state: "PASS", provenance_state: "PASS", exact_evidence_state: "READY", count_eligible: 0, provider_requests: 0, spend_micros: 0 },
  ]);
  await assert.rejects(() => classifyFactoryAssuranceCorpusRemediationIncidents(db, { actor: "owner@example.com", idempotencyKey: "assurance-incident-unproven-0001" }), /does not prove a mutable R2 key overwrite/i);
  assert.equal(database.prepare("SELECT COUNT(*) count FROM v7_evaluation_candidates WHERE qualification_eligible=1 OR release_eligible=1").get().count, 0);
  assert.throws(() => database.prepare("UPDATE factory_assurance_corpus_remediation_evidence_receipts SET count_eligible=1").run(), /APPEND_ONLY/);
});

test("evidence runner replays the same intent and rejects an idempotency-key intent change", async () => {
  const { database, db } = setup(); await seedCorpus(db);
  const ready = seedSource(database, { id: "evidence-replay-audio", bytes: "replay-audio-bytes", rights: true });
  await materializeFactoryAssuranceCorpusRemediationInventory(db, "owner@example.com");
  const input = { actor: "owner@example.com", idempotencyKey: "assurance-evidence-replay-0001", batchLimit: 1 };
  assert.equal((await verifyFactoryAssuranceCorpusRemediationEvidenceBatch({ DB: db, BUCKET: bucket([ready]) }, input)).outcome, "RECORDED");
  assert.equal((await verifyFactoryAssuranceCorpusRemediationEvidenceBatch({ DB: db, BUCKET: bucket([ready]) }, input)).outcome, "IDEMPOTENT_REPLAY");
  await assert.rejects(() => verifyFactoryAssuranceCorpusRemediationEvidenceBatch({ DB: db, BUCKET: bucket([ready]) }, { ...input, batchLimit: 2 }), /idempotency key is bound/i);
  assert.equal(database.prepare("SELECT COUNT(*) count FROM factory_assurance_corpus_remediation_evidence_runs").get().count, 1);
  assert.equal(database.prepare("SELECT COUNT(*) count FROM factory_assurance_corpus_remediation_evidence_receipts").get().count, 1);
});

test("incident classifier quarantines overwritten-key history and references the exact surviving candidate without rewriting evidence", async () => {
  const { database, db } = setup(); await seedCorpus(db);
  const collisionKey = "remediation/collision.bin";
  const overwritten = seedSource(database, { id: "overwritten-history", bytes: "old-unrecoverable-bytes", storageKey: collisionKey });
  const surviving = seedSource(database, { id: "surviving-current", bytes: "current-exact-bytes", storageKey: collisionKey });
  await materializeFactoryAssuranceCorpusRemediationInventory(db, "owner@example.com");
  const evidence = await verifyFactoryAssuranceCorpusRemediationEvidenceBatch({ DB: db, BUCKET: bucket([surviving]) }, {
    actor: "owner@example.com", idempotencyKey: "assurance-evidence-collision-0001", batchLimit: 2,
  });
  assert.deepEqual({ checked: evidence.checkedItems, checksumPass: evidence.checksumPassItems, provenancePass: evidence.provenancePassItems }, { checked: 2, checksumPass: 1, provenancePass: 1 });
  const classified = await classifyFactoryAssuranceCorpusRemediationIncidents(db, { actor: "owner@example.com", idempotencyKey: "assurance-incident-collision-0001" });
  assert.deepEqual({ outcome: classified.outcome, inspected: classified.inspectedItems, quarantined: classified.quarantinedItems, replacements: classified.replacementReferenceItems, rightsEligible: classified.rightsEligibleItems, rightsPending: classified.rightsPendingItems },
    { outcome: "RECORDED", inspected: 1, quarantined: 1, replacements: 1, rightsEligible: 1, rightsPending: 1 });
  const receipt = database.prepare(`SELECT source_artifact_id,observed_artifact_id,incident_kind,byte_recovery_state,disposition,replacement_binding_state,replacement_candidate_id,rights_action_state,count_eligible,provider_requests,spend_micros FROM factory_assurance_corpus_remediation_incident_receipts`).get();
  assert.deepEqual({ ...receipt }, {
    source_artifact_id: `artifact-${overwritten.id}`, observed_artifact_id: `artifact-${surviving.id}`, incident_kind: "MUTABLE_R2_KEY_OVERWRITE",
    byte_recovery_state: "UNRECOVERABLE_ORIGINAL_BYTES", disposition: "QUARANTINED_NOT_RIGHTS_ELIGIBLE", replacement_binding_state: "EXISTING_EXACT_CANDIDATE_REFERENCED",
    replacement_candidate_id: surviving.id, rights_action_state: "NOT_APPLICABLE_QUARANTINED", count_eligible: 0, provider_requests: 0, spend_micros: 0,
  });
  assert.equal(database.prepare("SELECT COUNT(*) count FROM factory_assurance_corpus_remediation_evidence_receipts WHERE checksum_state='FAIL'").get().count, 1);
  assert.equal((await classifyFactoryAssuranceCorpusRemediationIncidents(db, { actor: "owner@example.com", idempotencyKey: "assurance-incident-collision-0001" })).outcome, "IDEMPOTENT_REPLAY");
  assert.throws(() => database.prepare("UPDATE factory_assurance_corpus_remediation_incident_receipts SET count_eligible=1").run(), /APPEND_ONLY/);
});

test("current-rights inventory attaches only exact current immutable receipts and keeps every missing item pending", async () => {
  const { database, db } = setup(); await seedCorpus(db);
  const collisionKey = "remediation/rights-collision.bin";
  seedSource(database, { id: "rights-overwritten-history", bytes: "rights-old-bytes", storageKey: collisionKey });
  const surviving = seedSource(database, { id: "rights-surviving-current", bytes: "rights-current-bytes", storageKey: collisionKey });
  const authored = seedSource(database, { id: "rights-authored-current", bytes: "rights-authored-bytes", rights: true });
  database.prepare(`INSERT INTO v7_evaluation_rights_evidence_tasks
    (id,channel_id,candidate_id,task_type,blocking_reason,requirements_json,policy_version)
    VALUES (?,?,?,?,?,?,?)`).run(
      "rights-task-authored-current", "channel-hidden-systems", authored.id, "AUTHORSHIP_SOURCE_RECEIPT", "CURRENT_EXACT_AUTHORSHIP_RECEIPT_REQUIRED", "[]", "EVALUATION_RIGHTS_EVIDENCE_POLICY_V1",
    );
  await materializeFactoryAssuranceCorpusRemediationInventory(db, "owner@example.com");
  await verifyFactoryAssuranceCorpusRemediationEvidenceBatch({ DB: db, BUCKET: bucket([surviving, authored]) }, {
    actor: "owner@example.com", idempotencyKey: "assurance-rights-evidence-0001", batchLimit: 3,
  });
  const disposition = await classifyFactoryAssuranceCorpusRemediationIncidents(db, { actor: "owner@example.com", idempotencyKey: "assurance-rights-incident-0001" });
  assert.equal(disposition.rightsEligibleItems, 2);
  const input = { actor: "owner@example.com", idempotencyKey: "assurance-current-rights-0001", evaluatedAt: "2026-08-28T12:00:00.000Z" };
  const result = await inventoryFactoryAssuranceCurrentRightsEvidence(db, input);
  assert.deepEqual({ outcome: result.outcome, eligible: result.eligibleItems, attached: result.attachedReceiptItems, pending: result.pendingReceiptItems, quarantined: result.quarantinedItemsExcluded },
    { outcome: "RECORDED", eligible: 2, attached: 1, pending: 1, quarantined: 1 });
  const receipts = database.prepare(`SELECT source_candidate_id,required_receipt_type,source_receipt_table,artifact_binding_state,validity_state,commercial_scope_state,coverage_state,inventory_state,count_eligible,pass_authority,provider_requests,spend_micros
    FROM factory_assurance_current_rights_inventory_receipts ORDER BY source_candidate_id`).all().map((row) => ({ ...row }));
  assert.deepEqual(receipts, [
    { source_candidate_id: authored.id, required_receipt_type: "AUTHORSHIP_SOURCE_RECEIPT", source_receipt_table: "v7_evaluation_authorship_receipts", artifact_binding_state: "EXACT_HASH_BOUND", validity_state: "CURRENT", commercial_scope_state: "VERIFIED", coverage_state: "COMPLETE", inventory_state: "SOURCE_RECEIPT_ATTACHED", count_eligible: 0, pass_authority: 0, provider_requests: 0, spend_micros: 0 },
    { source_candidate_id: surviving.id, required_receipt_type: "PROVIDER_TERMS_AND_PLAN_RECEIPT", source_receipt_table: null, artifact_binding_state: "MISSING_OR_MISMATCHED", validity_state: "MISSING_OR_INVALID", commercial_scope_state: "MISSING_OR_INVALID", coverage_state: "MISSING_OR_INVALID", inventory_state: "SOURCE_RECEIPT_REQUIRED", count_eligible: 0, pass_authority: 0, provider_requests: 0, spend_micros: 0 },
  ]);
  assert.equal((await inventoryFactoryAssuranceCurrentRightsEvidence(db, input)).outcome, "IDEMPOTENT_REPLAY");
  await assert.rejects(() => inventoryFactoryAssuranceCurrentRightsEvidence(db, { ...input, evaluatedAt: "2026-08-29T12:00:00.000Z" }), /idempotency key is bound/i);
  assert.throws(() => database.prepare("UPDATE factory_assurance_current_rights_inventory_receipts SET count_eligible=1").run(), /APPEND_ONLY/);
});

test("current-rights collection materializes one fail-closed task per pending inventory receipt and replays without dispatch", async () => {
  const { database, db } = setup(); await seedCorpus(db);
  const collisionKey = "remediation/rights-collection-collision.bin";
  seedSource(database, { id: "rights-collection-overwritten", bytes: "rights-collection-old-bytes", storageKey: collisionKey });
  const pending = seedSource(database, { id: "rights-collection-provider", bytes: "rights-collection-provider-bytes", storageKey: collisionKey });
  await materializeFactoryAssuranceCorpusRemediationInventory(db, "owner@example.com");
  await verifyFactoryAssuranceCorpusRemediationEvidenceBatch({ DB: db, BUCKET: bucket([pending]) }, {
    actor: "owner@example.com", idempotencyKey: "assurance-collection-evidence-0001", batchLimit: 2,
  });
  await classifyFactoryAssuranceCorpusRemediationIncidents(db, { actor: "owner@example.com", idempotencyKey: "assurance-collection-incident-0001" });
  await inventoryFactoryAssuranceCurrentRightsEvidence(db, { actor: "owner@example.com", idempotencyKey: "assurance-collection-inventory-0001", evaluatedAt: "2026-08-28T12:00:00.000Z" });
  const input = { actor: "owner@example.com", idempotencyKey: "assurance-rights-collection-0001" };
  const result = await materializeFactoryAssuranceCurrentRightsCollection(db, input);
  assert.deepEqual({ outcome: result.outcome, scope: result.collectionScopeItems, open: result.openTasks, provider: result.providerTermsTasks, composite: result.compositeManifestTasks, authorship: result.authorshipTasks, requests: result.providerRequests, spend: result.spendMicros },
    { outcome: "RECORDED", scope: 1, open: 1, provider: 1, composite: 0, authorship: 0, requests: 0, spend: 0 });
  const task = database.prepare(`SELECT required_receipt_type,collection_state,requirements_json,source_receipt_id,count_eligible,pass_authority,provider_dispatch_authority,r22_authority,release_authority,publication_authority,provider_requests,spend_micros
    FROM factory_assurance_current_rights_collection_tasks`).get();
  assert.equal(task.required_receipt_type, "PROVIDER_TERMS_AND_PLAN_RECEIPT");
  assert.equal(task.collection_state, "RECEIPT_REQUIRED");
  assert.equal(task.source_receipt_id, null);
  assert.deepEqual(JSON.parse(task.requirements_json), ["EXACT_REQUEST_RESPONSE_ARTIFACT_BINDING", "TERMS_SNAPSHOT_EFFECTIVE_AT_GENERATION", "PAID_PLAN_EVIDENCE_COVERS_GENERATION_AND_COLLECTION_TIME", "COMMERCIAL_SCOPE_AND_TERRITORY_VERIFIED", "RAW_RESPONSE_AND_RECEIPT_HASHES_PRESENT"]);
  for (const key of ["count_eligible", "pass_authority", "provider_dispatch_authority", "r22_authority", "release_authority", "publication_authority", "provider_requests", "spend_micros"]) assert.equal(task[key], 0);
  assert.equal((await materializeFactoryAssuranceCurrentRightsCollection(db, input)).outcome, "IDEMPOTENT_REPLAY");
  assert.equal(database.prepare("SELECT COUNT(*) count FROM factory_assurance_current_rights_collection_runs").get().count, 1);
  assert.equal(database.prepare("SELECT COUNT(*) count FROM factory_assurance_current_rights_collection_tasks").get().count, 1);
  const projection = await factoryQaCockpitProjection(db);
  assert.equal(projection.version, "FACTORY_QA_COCKPIT_PROJECTION_V11");
  assert.equal(projection.summary.currentRightsCollectionOpen, 1);
  assert.deepEqual(projection.remediation.evidence.rightsCollectionQueue, [{ receiptType: "PROVIDER_TERMS_AND_PLAN_RECEIPT", state: "RECEIPT_REQUIRED", count: 1 }]);
  assert.match(projection.nextAction, /Classify the 1 collection tasks/);
  assert.throws(() => database.prepare("UPDATE factory_assurance_current_rights_collection_tasks SET collection_state='RECEIPT_REQUIRED'").run(), /APPEND_ONLY/);
  assert.equal(database.prepare("SELECT COUNT(*) count FROM v7_evaluation_candidates WHERE qualification_eligible=1 OR release_eligible=1").get().count, 0);
});

test("terminal rights disposition quarantines exhausted provider and lineage tasks without inventing receipts", async () => {
  const { database, db } = setup(); await seedCorpus(db);
  const collisionKey = "remediation/terminal-collision.bin";
  seedSource(database, { id: "terminal-overwritten", bytes: "terminal-old-bytes", storageKey: collisionKey });
  const surviving = seedSource(database, { id: "terminal-surviving-authored", bytes: "terminal-current-bytes", storageKey: collisionKey, rights: true });
  database.prepare(`INSERT INTO v7_evaluation_rights_evidence_tasks
    (id,channel_id,candidate_id,task_type,blocking_reason,requirements_json,policy_version)
    VALUES (?,?,?,?,?,?,?)`).run("terminal-surviving-rights-task", "channel-hidden-systems", surviving.id, "AUTHORSHIP_SOURCE_RECEIPT", "CURRENT_AUTHORSHIP_RECEIPT", "[]", "EVALUATION_RIGHTS_EVIDENCE_POLICY_V1");
  const provider = seedSource(database, { id: "terminal-provider-audio", bytes: "terminal-provider-bytes" });
  const master = seedSource(database, { id: "terminal-master", bytes: "terminal-master-bytes", candidateKind: "MASTER" });
  seedTerminalRecoveryEvidence(database, provider, master);
  await materializeFactoryAssuranceCorpusRemediationInventory(db, "owner@example.com");
  const terminalBucket = bucket([surviving, provider, master]);
  await verifyFactoryAssuranceCorpusRemediationEvidenceBatch({ DB: db, BUCKET: terminalBucket }, {
    actor: "owner@example.com", idempotencyKey: "assurance-terminal-evidence-0001", batchLimit: 3,
  });
  await verifyFactoryAssuranceCorpusRemediationEvidenceBatch({ DB: db, BUCKET: terminalBucket }, {
    actor: "owner@example.com", idempotencyKey: "assurance-terminal-evidence-0002", batchLimit: 3,
  });
  const incident = await classifyFactoryAssuranceCorpusRemediationIncidents(db, { actor: "owner@example.com", idempotencyKey: "assurance-terminal-incident-0001" });
  assert.deepEqual({ quarantined: incident.quarantinedItems, rightsEligible: incident.rightsEligibleItems }, { quarantined: 1, rightsEligible: 3 });
  const inventory = await inventoryFactoryAssuranceCurrentRightsEvidence(db, { actor: "owner@example.com", idempotencyKey: "assurance-terminal-inventory-0001", evaluatedAt: "2026-08-28T12:00:00.000Z" });
  assert.deepEqual({ attached: inventory.attachedReceiptItems, pending: inventory.pendingReceiptItems }, { attached: 1, pending: 2 });
  const collection = await materializeFactoryAssuranceCurrentRightsCollection(db, { actor: "owner@example.com", idempotencyKey: "assurance-terminal-collection-0001" });
  assert.deepEqual({ open: collection.openTasks, provider: collection.providerTermsTasks, composite: collection.compositeManifestTasks }, { open: 2, provider: 1, composite: 1 });
  const input = { actor: "owner@example.com", idempotencyKey: "assurance-terminal-disposition-0001" };
  const result = await classifyFactoryAssuranceCurrentRightsTerminalDisposition(db, input);
  assert.deepEqual({ outcome: result.outcome, scope: result.scopeItems, provider: result.providerBindingUnrecoverableItems, lineage: result.lineageUnrecoverableItems, quarantined: result.quarantinedItems, replacement: result.replacementRequiredItems, remaining: result.remainingReceiptCollectionItems, requests: result.providerRequests, spend: result.spendMicros },
    { outcome: "RECORDED", scope: 2, provider: 1, lineage: 1, quarantined: 2, replacement: 2, remaining: 0, requests: 0, spend: 0 });
  const receipts = database.prepare(`SELECT required_receipt_type,terminal_reason,evidence_source_table,disposition,replacement_action,rights_eligible,count_eligible,pass_authority,provider_dispatch_authority,r22_authority,release_authority,publication_authority,provider_requests,spend_micros
    FROM factory_assurance_current_rights_terminal_disposition_receipts ORDER BY required_receipt_type`).all().map((row) => ({ ...row }));
  assert.deepEqual(receipts, [
    { required_receipt_type: "COMPOSITE_PARENT_RIGHTS_MANIFEST", terminal_reason: "HISTORICAL_SOURCE_LINEAGE_UNRECOVERABLE", evidence_source_table: "v7_evaluation_rights_lineage_diagnostics", disposition: "QUARANTINED_FAILURE_EVIDENCE_ONLY", replacement_action: "CONTROLLED_FIXTURE_REPLACEMENT_REQUIRED", rights_eligible: 0, count_eligible: 0, pass_authority: 0, provider_dispatch_authority: 0, r22_authority: 0, release_authority: 0, publication_authority: 0, provider_requests: 0, spend_micros: 0 },
    { required_receipt_type: "PROVIDER_TERMS_AND_PLAN_RECEIPT", terminal_reason: "HISTORICAL_PROVIDER_BINDING_UNRECOVERABLE", evidence_source_table: "v7_evaluation_provider_audio_hash_candidate_diagnostics", disposition: "QUARANTINED_FAILURE_EVIDENCE_ONLY", replacement_action: "CONTROLLED_FIXTURE_REPLACEMENT_REQUIRED", rights_eligible: 0, count_eligible: 0, pass_authority: 0, provider_dispatch_authority: 0, r22_authority: 0, release_authority: 0, publication_authority: 0, provider_requests: 0, spend_micros: 0 },
  ]);
  assert.equal((await classifyFactoryAssuranceCurrentRightsTerminalDisposition(db, input)).outcome, "IDEMPOTENT_REPLAY");
  const projection = await factoryQaCockpitProjection(db);
  assert.equal(projection.version, "FACTORY_QA_COCKPIT_PROJECTION_V11");
  assert.equal(projection.summary.currentRightsTerminalQuarantined, 2);
  assert.equal(projection.summary.currentRightsRemainingCollection, 0);
  assert.match(projection.nextAction, /Plan the 2 terminal quarantines/);
  const planned = await planFactoryAssuranceControlledFixtureReplacements(db, { actor: "owner@example.com", idempotencyKey: "assurance-fixture-plan-0001" });
  assert.deepEqual({ outcome: planned.outcome, scope: planned.scopeItems, planned: planned.plannedWorkOrders, provider: planned.providerAudioOrders, composite: planned.compositeMasterOrders, authorship: planned.authorshipOrders, materialized: planned.materializedItems, pending: planned.pendingMaterializationItems, requests: planned.providerRequests, spend: planned.spendMicros },
    { outcome: "RECORDED", scope: 2, planned: 2, provider: 1, composite: 1, authorship: 0, materialized: 0, pending: 2, requests: 0, spend: 0 });
  const orders = database.prepare(`SELECT replacement_route,historical_exact_artifact_hash,replacement_identity,replacement_correlation_group,generation_contract_json,rights_lineage_contract_json,independence_contract_json,work_order_state,materialization_state,source_disposition,source_rights_eligible,count_eligible,pass_authority,provider_dispatch_authority,r22_authority,master_authority,release_authority,publication_authority,provider_requests,spend_micros
    FROM factory_assurance_controlled_fixture_replacement_work_orders ORDER BY replacement_route`).all().map((row) => ({ ...row }));
  assert.equal(orders.length, 2);
  assert.deepEqual(orders.map((order) => order.replacement_route), ["NEW_COMPOSITE_MASTER_WITH_EXACT_PARENT_MANIFEST", "NEW_PROVIDER_AUDIO_WITH_NATIVE_BINDING"]);
  assert.equal(new Set(orders.map((order) => order.replacement_identity)).size, 2);
  assert.equal(new Set(orders.map((order) => order.replacement_correlation_group)).size, 2);
  for (const order of orders) {
    const generation = JSON.parse(order.generation_contract_json), rights = JSON.parse(order.rights_lineage_contract_json), independence = JSON.parse(order.independence_contract_json);
    assert.ok(generation.requiredAtGeneration.includes("EXACT_OUTPUT_BYTES_SHA256"));
    assert.equal(rights.admissionAuthority, "NONE_UNTIL_SEPARATE_REVIEW");
    assert.equal(independence.historicalExactArtifactHash, order.historical_exact_artifact_hash);
    assert.equal(independence.historicalBytesUse, "FORBIDDEN_AS_REPLACEMENT_OR_PARENT");
    assert.equal(independence.exactByteReuseAllowed, false);
    assert.equal(independence.derivedFromHistoricalBytesAllowed, false);
    for (const key of ["source_rights_eligible", "count_eligible", "pass_authority", "provider_dispatch_authority", "r22_authority", "master_authority", "release_authority", "publication_authority", "provider_requests", "spend_micros"]) assert.equal(order[key], 0);
    assert.equal(order.work_order_state, "PLANNED_ZERO_DISPATCH");
    assert.equal(order.materialization_state, "NOT_MATERIALIZED");
    assert.equal(order.source_disposition, "QUARANTINED_FAILURE_EVIDENCE_ONLY");
  }
  assert.equal((await planFactoryAssuranceControlledFixtureReplacements(db, { actor: "owner@example.com", idempotencyKey: "assurance-fixture-plan-0001" })).outcome, "IDEMPOTENT_REPLAY");
  const plannedProjection = await factoryQaCockpitProjection(db);
  assert.equal(plannedProjection.summary.controlledFixtureReplacementPlanned, 2);
  assert.equal(plannedProjection.summary.controlledFixturePending, 2);
  assert.deepEqual(plannedProjection.remediation.evidence.controlledFixtureReplacementQueue.map((item) => ({ route: item.route, count: item.count })), [
    { route: "NEW_COMPOSITE_MASTER_WITH_EXACT_PARENT_MANIFEST", count: 1 },
    { route: "NEW_PROVIDER_AUDIO_WITH_NATIVE_BINDING", count: 1 },
  ]);
  assert.match(plannedProjection.nextAction, /Admit the 2 planned controlled fixtures/);
  const admitted = await admitFactoryAssuranceControlledFixtureMaterializationBatch(db, {
    actor: "owner@example.com", idempotencyKey: "assurance-fixture-materialization-admission-0001", evaluatedAt: "2026-08-28T12:00:00.000Z",
  });
  assert.deepEqual({ outcome: admitted.outcome, scope: admitted.scopeItems, selected: admitted.selectedBatchItems, provider: admitted.providerAudioPendingItems, composite: admitted.compositeMasterPendingItems, ready: admitted.dispatchReadyItems, blocked: admitted.blockedItems, maxRequests: admitted.plannedMaxProviderRequests, maxSpend: admitted.plannedMaxSpendMicros, requests: admitted.providerRequests, spend: admitted.spendMicros },
    { outcome: "RECORDED", scope: 2, selected: 1, provider: 1, composite: 1, ready: 0, blocked: 2, maxRequests: 2, maxSpend: 80000, requests: 0, spend: 0 });
  assert.ok(admitted.blockers.includes("EXPLICIT_PAID_DISPATCH_APPROVAL_REQUIRED"));
  assert.ok(admitted.blockers.includes("NO_ACTIVE_PROVIDER_BINDING_OBSERVED"));
  const admissionItems = database.prepare(`SELECT replacement_route,queue_position,admission_lane,admission_state,blockers_json,planned_max_provider_requests,planned_max_spend_micros,materialization_state,count_eligible,pass_authority,provider_dispatch_authority,cost_reservation_authority,r22_authority,master_authority,release_authority,publication_authority,provider_requests,spend_micros
    FROM factory_assurance_controlled_fixture_materialization_admission_items ORDER BY queue_position`).all().map((row) => ({ ...row }));
  assert.equal(admissionItems.length, 2);
  assert.deepEqual(admissionItems.map((item) => item.admission_lane), ["SELECTED_PROVIDER_AUDIO_BATCH", "WAITING_EXACT_NEW_PARENT_SET"]);
  assert.deepEqual(admissionItems.map((item) => [item.planned_max_provider_requests, item.planned_max_spend_micros]), [[2, 80000], [0, 0]]);
  assert.ok(JSON.parse(admissionItems[0].blockers_json).includes("EXPLICIT_PAID_DISPATCH_APPROVAL_REQUIRED"));
  for (const item of admissionItems) {
    assert.equal(item.admission_state, "BLOCKED");
    assert.equal(item.materialization_state, "NOT_MATERIALIZED");
    for (const key of ["count_eligible", "pass_authority", "provider_dispatch_authority", "cost_reservation_authority", "r22_authority", "master_authority", "release_authority", "publication_authority", "provider_requests", "spend_micros"]) assert.equal(item[key], 0);
  }
  assert.equal((await admitFactoryAssuranceControlledFixtureMaterializationBatch(db, { actor: "owner@example.com", idempotencyKey: "assurance-fixture-materialization-admission-0001", evaluatedAt: "2026-08-28T12:00:00.000Z" })).outcome, "IDEMPOTENT_REPLAY");
  const admittedProjection = await factoryQaCockpitProjection(db);
  assert.equal(admittedProjection.version, "FACTORY_QA_COCKPIT_PROJECTION_V11");
  assert.equal(admittedProjection.summary.controlledFixtureMaterializationAdmissionState, "BLOCKED");
  assert.equal(admittedProjection.summary.controlledFixtureSelectedBatchItems, 1);
  assert.equal(admittedProjection.summary.controlledFixtureDispatchReadyItems, 0);
  assert.equal(admittedProjection.summary.controlledFixtureBlockedItems, 2);
  assert.deepEqual(admittedProjection.remediation.evidence.controlledFixtureMaterializationAdmissionQueue.map((item) => ({ lane: item.lane, count: item.count })), [
    { lane: "SELECTED_PROVIDER_AUDIO_BATCH", count: 1 },
    { lane: "WAITING_EXACT_NEW_PARENT_SET", count: 1 },
  ]);
  assert.match(admittedProjection.nextAction, /Preflight the selected one-audio batch/);
  const preflighted = await preflightFactoryAssuranceControlledFixtureAudioBatch(db, {
    actor: "owner@example.com", idempotencyKey: "assurance-fixture-audio-preflight-0001", evaluatedAt: "2026-08-28T12:05:00.000Z",
  });
  assert.deepEqual({ outcome: preflighted.outcome, contracts: preflighted.typedRequestContracts, bindings: preflighted.exactAudioBindings, qualifications: preflighted.exactAudioQualifications, rights: preflighted.exactAudioRightsReceipts, drift: preflighted.exactAudioCurrentDriftReceipts, readyBindings: preflighted.exactAudioRouteReadyBindings, envelopes: preflighted.activeCostEnvelopes, workRequests: preflighted.canonicalWorkRequests, routes: preflighted.canonicalRouteDecisions, reservations: preflighted.canonicalCostReservations, ready: preflighted.dispatchReadyItems, blocked: preflighted.blockedItems, requests: preflighted.providerRequests, spend: preflighted.spendMicros },
    { outcome: "RECORDED", contracts: 1, bindings: 0, qualifications: 0, rights: 0, drift: 0, readyBindings: 0, envelopes: 1, workRequests: 0, routes: 0, reservations: 0, ready: 0, blocked: 1, requests: 0, spend: 0 });
  for (const blocker of ["EXACT_AUDIO_PROVIDER_BINDING_REQUIRED", "EXACT_AUDIO_CAPABILITY_QUALIFICATION_REQUIRED", "EXACT_AUDIO_RIGHTS_ELIGIBILITY_REQUIRED", "EXACT_AUDIO_PROVIDER_DRIFT_RECEIPT_REQUIRED", "EXACT_COST_RESERVATION_BLOCKED_BY_AUDIO_ROUTE", "EXPLICIT_PAID_DISPATCH_APPROVAL_REQUIRED"]) assert.ok(preflighted.blockers.includes(blocker));
  const contract = database.prepare(`SELECT * FROM factory_assurance_controlled_fixture_audio_request_contracts`).get();
  assert.equal(contract.capability_key, "CONTROLLED_FIXTURE_CLEAN_AUDIO_SYNTHESIS");
  assert.equal(contract.dispatch_mode, "PLAN_ONLY");
  assert.equal(contract.route_preflight_state, "BLOCKED");
  assert.equal(contract.materialization_state, "NOT_MATERIALIZED");
  assert.equal(contract.max_provider_requests, 2);
  assert.equal(contract.max_spend_micros, 80000);
  assert.equal(contract.binding_id, null);
  assert.equal(contract.qualification_id, null);
  assert.equal(contract.rights_receipt_id, null);
  assert.equal(contract.drift_receipt_id, null);
  assert.equal(contract.canonical_work_request_id, null);
  assert.equal(contract.canonical_route_decision_id, null);
  assert.equal(contract.canonical_cost_reservation_id, null);
  const envelope = database.prepare(`SELECT scope_type,scope_id,max_provider_requests,max_spend_micros,lifecycle_state FROM factory_cost_envelopes WHERE id=?`).get(preflighted.costEnvelopeId);
  assert.deepEqual({ ...envelope }, { scope_type: "REQUEST", scope_id: preflighted.futureWorkRequestId, max_provider_requests: 2, max_spend_micros: 80000, lifecycle_state: "ACTIVE" });
  assert.equal(database.prepare(`SELECT COUNT(*) count FROM factory_provider_work_requests WHERE id=?`).get(preflighted.futureWorkRequestId).count, 0);
  assert.equal(database.prepare(`SELECT COUNT(*) count FROM factory_provider_cost_reservations`).get().count, 0);
  assert.equal((await preflightFactoryAssuranceControlledFixtureAudioBatch(db, { actor: "owner@example.com", idempotencyKey: "assurance-fixture-audio-preflight-0001", evaluatedAt: "2026-08-28T12:05:00.000Z" })).outcome, "IDEMPOTENT_REPLAY");
  const preflightProjection = await factoryQaCockpitProjection(db);
  assert.equal(preflightProjection.version, "FACTORY_QA_COCKPIT_PROJECTION_V11");
  assert.equal(preflightProjection.summary.controlledFixtureAudioPreflightState, "BLOCKED");
  assert.equal(preflightProjection.summary.controlledFixtureAudioTypedRequestContracts, 1);
  assert.equal(preflightProjection.summary.controlledFixtureAudioExactBindings, 0);
  assert.equal(preflightProjection.summary.controlledFixtureAudioActiveCostEnvelopes, 1);
  assert.equal(preflightProjection.summary.controlledFixtureAudioCostReservations, 0);
  assert.deepEqual(preflightProjection.remediation.evidence.controlledFixtureAudioRequestContracts, [{ capability: "CONTROLLED_FIXTURE_CLEAN_AUDIO_SYNTHESIS", version: "V1", archetype: "CLEAN_AUDIO_CONTROL", dispatchMode: "PLAN_ONLY", routeState: "BLOCKED", materializationState: "NOT_MATERIALIZED", maxProviderRequests: 2, maxSpendMicros: 80000, count: 1 }]);
  assert.match(preflightProjection.nextAction, /3 provider metadata reads plus 1 public rights read, but 0 synthesis requests and \$0 spend/);
  assert.throws(() => database.prepare("UPDATE factory_assurance_controlled_fixture_audio_request_contracts SET route_preflight_state='BLOCKED'").run(), /APPEND_ONLY/);
  assert.throws(() => database.prepare("UPDATE factory_assurance_controlled_fixture_materialization_admission_items SET admission_state='BLOCKED'").run(), /APPEND_ONLY/);
  assert.throws(() => database.prepare("UPDATE factory_assurance_controlled_fixture_replacement_work_orders SET materialization_state='NOT_MATERIALIZED'").run(), /APPEND_ONLY/);
  assert.throws(() => database.prepare("UPDATE factory_assurance_current_rights_terminal_disposition_receipts SET rights_eligible=1").run(), /APPEND_ONLY/);
  assert.equal(database.prepare("SELECT COUNT(*) count FROM v7_evaluation_candidates WHERE qualification_eligible=1 OR release_eligible=1").get().count, 0);
});
