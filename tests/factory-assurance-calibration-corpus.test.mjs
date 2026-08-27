import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { evaluateFactoryAssuranceCorpusAdmission, recordFactoryAssuranceCorpusSnapshot } from "../lib/factory-assurance-calibration-corpus.ts";
import { FACTORY_ASSURANCE_LAYERS } from "../lib/factory-evidence-assurance.ts";

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

function item(index, overrides = {}) {
  const owner = index < 3;
  const blind = index >= 3 && index < 8;
  const clean = index >= 15;
  return {
    itemKey: `factory:corpus:item:${String(index).padStart(3, "0")}`,
    sourceFamily: "TEST_EXACT_EVIDENCE",
    sourceId: `source-${String(index).padStart(3, "0")}`,
    sourceReceiptId: `source-receipt-${String(index).padStart(3, "0")}`,
    candidateKind: "MASTER",
    mimeType: "video/webm",
    storageKey: `factory/corpus/${index}.webm`,
    byteSize: 1000 + index,
    exactArtifactHash: hash(`artifact:${index}`),
    labelSource: owner ? "OWNER_CONFIRMED" : clean ? "SEALED_CLEAN_CONTROL" : "SEALED_DEFECT_CONTROL",
    expectedOutcome: clean ? "PASS" : "FAIL",
    expectedSeverity: clean ? "NONE" : index % 2 ? "P1" : "P0",
    defectFamilies: clean ? ["CLEAN_CONTROL"] : [`DEFECT_${index % 2 ? "P1" : "P0"}`],
    applicableLayers: [...FACTORY_ASSURANCE_LAYERS],
    correlationGroup: `correlation:${String(index).padStart(3, "0")}`,
    ownerLabelHash: hash(`label:${index}`),
    bytesState: "READBACK_VERIFIED",
    checksumState: "PASS",
    rightsState: "PASS",
    partitionHint: owner ? "PRODUCTION_HOLDOUT" : blind ? "BLIND_QUALIFICATION" : "CALIBRATION",
    countEligible: true,
    evidenceHash: hash(`evidence:${index}`),
    ...overrides,
  };
}

function input(items) {
  return {
    snapshotKey: "factory:assurance:corpus:hidden-systems:0001",
    channelId: "channel-hidden-systems",
    formatKey: "hidden-systems-documentary",
    policyVersion: "AI_FIRST_PRODUCTION_ASSURANCE_V1",
    sourceSnapshotHash: hash("source-snapshot"),
    items,
    evidenceHash: hash("snapshot-evidence"),
  };
}

test("migration 0116 installs append-only corpus admission with every downstream authority closed", () => {
  assert.ok(migrations.includes("0116_factory_assurance_calibration_corpus_admission.sql"));
  const migration = read("drizzle/0116_factory_assurance_calibration_corpus_admission.sql");
  for (const table of ["factory_assurance_calibration_corpus_snapshots", "factory_assurance_calibration_corpus_items", "factory_assurance_calibration_corpus_gaps"]) assert.ok(migration.includes(`CREATE TABLE \`${table}\``));
  for (const lock of ["qualification_authority", "pass_authority", "provider_dispatch_authority", "r22_authority", "master_authority", "release_authority", "publication_authority"]) assert.match(migration, new RegExp(`${lock}[^;]+CHECK \\(`, "s"));
  assert.doesNotMatch(migration, /api\.openai\.com|elevenlabs\.io|youtube-ai-factory-v2/);
  const route = read("app/api/factory/runtime/route.ts");
  assert.match(route, /MATERIALIZE_ASSURANCE_CORPUS_ADMISSION/);
  assert.match(route, /FACTORY_ASSURANCE_CORPUS_ADMISSION_ENABLED/);
  assert.match(route, /materializeFactoryAssuranceCorpusAdmissionInventory/);
});

test("a complete independent four-partition inventory becomes admission-ready without qualification authority", async () => {
  const items = Array.from({ length: 20 }, (_, index) => item(index));
  const evaluated = evaluateFactoryAssuranceCorpusAdmission(items);
  assert.equal(evaluated.lifecycleState, "ADMISSION_READY");
  assert.equal(evaluated.gaps.length, 0);
  assert.ok(evaluated.layerReadiness.every((layer) => layer.lifecycleState === "ADMISSION_READY" && layer.ownerHoldouts === 3 && layer.blindControls === 5));
  const { database, db } = setup();
  const recorded = await recordFactoryAssuranceCorpusSnapshot(db, input(items));
  assert.equal(recorded.lifecycleState, "ADMISSION_READY");
  assert.equal(recorded.qualificationAuthority, false); assert.equal(recorded.passAuthority, false); assert.equal(recorded.providerDispatchAuthority, false); assert.equal(recorded.r22Authority, false);
  assert.equal(database.prepare("SELECT COUNT(*) total FROM factory_assurance_calibration_corpus_items").get().total, 20);
  assert.equal(database.prepare("SELECT COUNT(*) total FROM factory_assurance_calibration_corpus_gaps").get().total, 0);
  assert.equal((await recordFactoryAssuranceCorpusSnapshot(db, input(items))).outcome, "IDEMPOTENT_REPLAY");
});

test("historical volume cannot substitute for owner holdouts, exact bytes, clean controls or layer coverage", async () => {
  const items = Array.from({ length: 20 }, (_, index) => item(index, {
    labelSource: "SEALED_DEFECT_CONTROL",
    expectedOutcome: "FAIL",
    expectedSeverity: index % 2 ? "P1" : "P0",
    partitionHint: index < 5 ? "BLIND_QUALIFICATION" : "CALIBRATION",
    exactArtifactHash: index < 12 ? hash("reused-artifact") : hash(`artifact:${index}`),
    bytesState: index === 19 ? "NOT_VERIFIED" : "READBACK_VERIFIED",
    checksumState: index === 19 ? "NOT_VERIFIED" : "PASS",
    applicableLayers: index === 18 ? ["L0"] : [...FACTORY_ASSURANCE_LAYERS],
  }));
  const evaluated = evaluateFactoryAssuranceCorpusAdmission(items);
  assert.equal(evaluated.lifecycleState, "ADMISSION_INSUFFICIENT");
  for (const layer of FACTORY_ASSURANCE_LAYERS) {
    const keys = evaluated.gaps.filter((gap) => gap.assuranceLayer === layer).map((gap) => gap.gapKey);
    assert.ok(keys.includes("OWNER_CONFIRMED_HOLDOUTS_BELOW_MINIMUM"));
    assert.ok(keys.includes("CLEAN_CONTROLS_BELOW_MINIMUM"));
  }
  const { database, db } = setup();
  const recorded = await recordFactoryAssuranceCorpusSnapshot(db, input(items));
  assert.equal(recorded.lifecycleState, "ADMISSION_INSUFFICIENT");
  assert.ok(database.prepare("SELECT COUNT(*) total FROM factory_assurance_calibration_corpus_gaps").get().total > 0);
  assert.throws(() => database.prepare("UPDATE factory_assurance_calibration_corpus_snapshots SET lifecycle_state='ADMISSION_READY'").run(), /FACTORY_ASSURANCE_CALIBRATION_CORPUS_SNAPSHOTS_APPEND_ONLY/);
});

test("a Production holdout without owner-confirmed truth is rejected before recording", async () => {
  const { db } = setup();
  const items = Array.from({ length: 20 }, (_, index) => item(index));
  items[0].labelSource = "SEALED_DEFECT_CONTROL";
  await assert.rejects(() => recordFactoryAssuranceCorpusSnapshot(db, input(items)), /Production holdouts require owner-confirmed labels/);
});
