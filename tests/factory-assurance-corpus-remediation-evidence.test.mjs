import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { recordFactoryAssuranceCorpusSnapshot } from "../lib/factory-assurance-calibration-corpus.ts";
import { materializeFactoryAssuranceCorpusRemediationInventory } from "../lib/factory-assurance-corpus-remediation.ts";
import { verifyFactoryAssuranceCorpusRemediationEvidenceBatch } from "../lib/factory-assurance-corpus-remediation-evidence.ts";

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

function seedSource(database, { id, bytes, rights = false, metadataValid = true }) {
  const artifactId = `artifact-${id}`, packageId = `package-${id}`, storageKey = `remediation/${id}.bin`, exactHash = hash(bytes);
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

test("migration 0118 installs append-only zero-authority remediation evidence receipts", () => {
  assert.equal(migrations.at(-1), "0118_factory_assurance_corpus_remediation_evidence.sql");
  const migration = read("drizzle/0118_factory_assurance_corpus_remediation_evidence.sql");
  for (const table of ["factory_assurance_corpus_remediation_evidence_runs", "factory_assurance_corpus_remediation_evidence_receipts"]) assert.ok(migration.includes(`CREATE TABLE \`${table}\``));
  for (const lock of ["count_eligible", "qualification_authority", "pass_authority", "provider_dispatch_authority", "r22_authority", "master_authority", "release_authority", "publication_authority", "provider_requests", "spend_micros"]) assert.match(migration, new RegExp(`${lock}[^;]+CHECK \\(`, "s"));
  assert.doesNotMatch(migration, /api\.openai\.com|elevenlabs\.io|youtube-ai-factory-v2/);
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
