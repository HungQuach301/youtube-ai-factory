import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { recordFactoryAssuranceCorpusSnapshot } from "../lib/factory-assurance-calibration-corpus.ts";
import { materializeFactoryAssuranceCorpusRemediationInventory } from "../lib/factory-assurance-corpus-remediation.ts";

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
    snapshotKey: "factory:assurance:test-corpus:hidden-systems:v1",
    channelId: "channel-hidden-systems",
    formatKey: "hidden-systems-documentary",
    policyVersion: "AI_FIRST_PRODUCTION_ASSURANCE_V1",
    sourceSnapshotHash: hash("test-source-snapshot"),
    items: [],
    evidenceHash: hash("test-corpus-evidence"),
  });
}

function seedReadyAudio(database) {
  const artifactHash = hash("independent-owner-audio");
  database.prepare(`INSERT INTO v7_evaluation_candidates
    (id,channel_id,source_family,source_table,source_id,candidate_kind,artifact_type,lifecycle_state,storage_key,mime_type,byte_size,content_hash,bytes_state,checksum_state,provenance_state,owner_decision_state,defect_label_state,rights_declared_state,rights_verification_state,correlation_group,dedup_hash,release_eligible,qualification_eligible,provider_requests,spend_usd,verification_state)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      "remediation-ready-audio", "channel-hidden-systems", "TEST_AUDIO", "test_audio", "audio-1", "AUDIO", "audio_mix", "CANDIDATE_EVIDENCE", "test/audio-1.mp3", "audio/mpeg", 20000, artifactHash,
      "READBACK_VERIFIED", "PASS", "PASS", "OWNER_REVIEWED", "LABELLED", "PASS", "PASS", "test-audio:1", artifactHash, 0, 0, 0, 0, "EVIDENCE_VERIFIED",
    );
  database.prepare(`INSERT OR IGNORE INTO v7_evaluation_correlation_snapshots
    (id,channel_id,policy_version,candidate_count,primary_representative_count,exact_duplicate_deferred_count,correlated_variant_deferred_count,independent_count_eligible,evidence_json)
    VALUES (?,?,?,?,?,?,?,?,?)`).run("evaluation-correlation-snapshot:channel-hidden-systems:v1", "channel-hidden-systems", "EVALUATION_CORRELATION_CONTROL_V1", 1, 1, 0, 0, 1, "{}");
  database.prepare(`INSERT INTO v7_evaluation_correlation_items
    (id,snapshot_id,channel_id,candidate_id,exact_artifact_hash,lineage_group_key,representative_candidate_id,relation_class,queue_role,attention_state,independent_count_eligible,selection_rank,selection_basis_json,policy_version)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      "remediation-correlation-audio", "evaluation-correlation-snapshot:channel-hidden-systems:v1", "channel-hidden-systems", "remediation-ready-audio", artifactHash, "test-audio:1", "remediation-ready-audio", "INDEPENDENT_SINGLETON", "PRIMARY_REPRESENTATIVE", "READY_PRIMARY", 1, 1, "{}", "EVALUATION_CORRELATION_CONTROL_V1",
    );
  database.prepare(`INSERT INTO v7_evaluation_owner_label_tasks
    (id,channel_id,candidate_id,exact_artifact_hash,candidate_kind,artifact_type,taxonomy_version,requirements_json,task_state,policy_version)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run("remediation-owner-task-audio", "channel-hidden-systems", "remediation-ready-audio", artifactHash, "AUDIO", "audio_mix", "EVALUATION_DEFECT_TAXONOMY_V1", "[]", "OPEN", "EVALUATION_OWNER_LABEL_POLICY_V1");
  database.prepare(`INSERT INTO v7_evaluation_owner_label_receipts
    (id,channel_id,task_id,candidate_id,exact_artifact_hash,decision_state,rationale,labels_json,taxonomy_version,taxonomy_manifest_hash,present_count,absent_count,not_applicable_count,idempotency_key,request_hash,evidence_hash,actor)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      "remediation-owner-receipt-audio", "channel-hidden-systems", "remediation-owner-task-audio", "remediation-ready-audio", artifactHash, "CLEAN_NEGATIVE_CONTROL", "Owner confirmed exact independent audio as a clean control.", "[]", "EVALUATION_DEFECT_TAXONOMY_V1", hash("taxonomy"), 0, 10, 0, "remediation-owner-audio-v1", hash("owner-request"), hash("owner-evidence"), "owner@example.com",
    );
}

function seedUnverifiedPackaging(database) {
  const artifactHash = hash("unverified-packaging");
  database.prepare(`INSERT INTO v7_evaluation_candidates
    (id,channel_id,source_family,source_table,source_id,candidate_kind,artifact_type,lifecycle_state,storage_key,mime_type,byte_size,content_hash,correlation_group,dedup_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      "remediation-unverified-packaging", "channel-hidden-systems", "TEST_PACKAGING", "test_packaging", "packaging-1", "PACKAGING", "claim_package", "CANDIDATE_EVIDENCE", "test/packaging-1.json", "application/json", 1200, artifactHash, "test-packaging:1", artifactHash,
    );
}

test("migration 0117 installs an append-only, zero-authority remediation inventory", () => {
  assert.equal(migrations.at(-1), "0117_factory_assurance_corpus_remediation_inventory.sql");
  const migration = read("drizzle/0117_factory_assurance_corpus_remediation_inventory.sql");
  for (const table of ["factory_assurance_corpus_remediation_snapshots", "factory_assurance_corpus_remediation_items"]) assert.ok(migration.includes(`CREATE TABLE \`${table}\``));
  for (const lock of ["qualification_authority", "pass_authority", "provider_dispatch_authority", "r22_authority", "release_authority", "publication_authority"]) assert.match(migration, new RegExp(`${lock}[^;]+CHECK \\(`, "s"));
  assert.doesNotMatch(migration, /api\.openai\.com|elevenlabs\.io|youtube-ai-factory-v2/);
});

test("remediation inventory distinguishes exact owner-ready audio from unverified L1 packaging without admitting either", async () => {
  const { database, db } = setup();
  await seedCorpus(db); seedReadyAudio(database); seedUnverifiedPackaging(database);
  const result = await materializeFactoryAssuranceCorpusRemediationInventory(db, "owner@example.com");
  assert.deepEqual({ outcome: result.outcome, candidates: result.candidateCount, l1: result.l1CandidateCount, l4: result.l4CandidateCount, exact: result.exactEvidenceReadyCount, owner: result.ownerLabelReadyCount, independent: result.independentCount, review: result.readyForCorpusReviewCount },
    { outcome: "RECORDED", candidates: 2, l1: 1, l4: 1, exact: 1, owner: 1, independent: 1, review: 1 });
  assert.deepEqual(database.prepare("SELECT candidate_kind,readiness_state,count_eligible,pass_authority FROM factory_assurance_corpus_remediation_items ORDER BY candidate_kind").all().map((row) => ({ ...row })), [
    { candidate_kind: "AUDIO", readiness_state: "READY_FOR_CORPUS_REVIEW", count_eligible: 0, pass_authority: 0 },
    { candidate_kind: "PACKAGING", readiness_state: "EXACT_EVIDENCE_REQUIRED", count_eligible: 0, pass_authority: 0 },
  ]);
  assert.equal((await materializeFactoryAssuranceCorpusRemediationInventory(db, "owner@example.com")).outcome, "IDEMPOTENT_REPLAY");
  assert.throws(() => database.prepare("UPDATE factory_assurance_corpus_remediation_items SET count_eligible=1").run(), /APPEND_ONLY/);
});
