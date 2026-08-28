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

function seedSource(database, { id, bytes, rights = false, metadataValid = true, storageKey: suppliedStorageKey = "" }) {
  const artifactId = `artifact-${id}`, packageId = `package-${id}`, storageKey = suppliedStorageKey || `remediation/${id}.bin`, exactHash = hash(bytes);
  database.exec("PRAGMA foreign_keys=OFF");
  database.prepare(`INSERT INTO production_v2_packages
    (id,channel_id,policy_id,source_brief_id,episode_concept_id,title,lifecycle_state,target_duration_seconds,shot_count,content_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(packageId, "channel-hidden-systems", "policy-test", `brief-${id}`, `episode-${id}`, `Package ${id}`, "REJECTED_QUALITY", 60, 1, hash(`package-${id}`));
  database.prepare(`INSERT INTO production_v2_artifacts
    (id,package_id,artifact_type,storage_key,mime_type,byte_size,sha256,rights_state,provenance_json,engine_version)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(artifactId, packageId, "AUDIO", storageKey, "audio/mpeg", Buffer.byteLength(bytes), exactHash, rights ? "COMMERCIAL_LICENSE_VERIFIED" : "RIGHTS_REVIEW_REQUIRED", JSON.stringify({ author: "factory-test", legacySources: 0 }), "ENGINE-TEST-V1");
  database.exec("PRAGMA foreign_keys=ON");
  database.prepare(`INSERT INTO v7_evaluation_candidates
    (id,channel_id,source_family,source_table,source_id,candidate_kind,artifact_type,lifecycle_state,storage_key,mime_type,byte_size,content_hash,bytes_state,checksum_state,provenance_state,rights_declared_state,rights_verification_state,correlation_group,verification_state)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      id, "channel-hidden-systems", "PRODUCTION_V2_REJECTED", "production_v2_artifacts", artifactId, "AUDIO", "AUDIO", "CANDIDATE_EVIDENCE", storageKey, "audio/mpeg", Buffer.byteLength(bytes), exactHash,
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

test("migrations 0118 through 0120 install append-only zero-authority evidence, incident and current-rights receipts", () => {
  assert.equal(migrations.at(-1), "0120_factory_assurance_current_rights_inventory.sql");
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
