import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  FACTORY_ASSURANCE_CALIBRATION_THRESHOLD_VERSION,
  evaluateFactoryAssuranceCalibrationLayer,
  recordFactoryAssuranceCalibrationPackage,
} from "../lib/factory-assurance-calibration.ts";
import { FACTORY_ASSURANCE_LAYERS } from "../lib/factory-evidence-assurance.ts";
import { factoryQaCockpitProjection } from "../lib/factory-qa-cockpit-projection.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const migrations = readdirSync(new URL("../drizzle", import.meta.url)).filter((name) => name.endsWith(".sql")).sort();
const hashes = ["a", "b", "c", "d", "e", "f", "1", "2"].map((value) => value.repeat(64));

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

function dependency(layerIndex) {
  return {
    judgeVersion: `JUDGE_L${layerIndex}_V1`,
    modelVersion: `MODEL_L${layerIndex}_V1`,
    promptHash: hashes[0], rubricHash: hashes[1], schemaHash: hashes[2], samplerHash: hashes[3],
  };
}

function calibrationCases() {
  return FACTORY_ASSURANCE_LAYERS.flatMap((layer, layerIndex) => Array.from({ length: 20 }, (_, index) => {
    const expectedSeverity = index < 4 ? "P0" : index < 8 ? "P1" : "NONE";
    const expectedOutcome = expectedSeverity === "NONE" ? "PASS" : "FAIL";
    const observedSeverity = expectedSeverity;
    const observedOutcome = expectedOutcome;
    return {
      caseKey: `factory:calibration:${layer.toLowerCase()}:case:${String(index).padStart(3, "0")}`,
      assuranceLayer: layer,
      exactArtifactHash: hashes[4], evidenceBundleHash: hashes[5],
      labelSource: expectedSeverity === "NONE" ? "SEALED_CLEAN_CONTROL" : "SEALED_DEFECT_CONTROL",
      expectedOutcome, expectedSeverity,
      defectFamily: expectedSeverity === "NONE" ? "clean-control" : `controlled-${expectedSeverity.toLowerCase()}-defect`,
      correlationGroup: `correlation:${layer.toLowerCase()}:${String(index).padStart(3, "0")}`,
      ownerLabelHash: hashes[6], blindControl: index < 5, productionHoldout: index >= 5 && index < 8, evidenceHash: hashes[7],
      observations: [1, 2].map((repeatIndex) => ({
        observationKey: `factory:calibration:${layer.toLowerCase()}:case:${String(index).padStart(3, "0")}:repeat:${repeatIndex}`,
        ...dependency(layerIndex), repeatIndex, observedOutcome, observedSeverity,
        evidenceTimecodeValid: true, structuredOutputValid: true, confidence: 0.99, usage: {}, actualSpendMicros: 0, evidenceHash: hashes[7],
      })),
    };
  }));
}

function packageInput(overrides = {}) {
  return {
    campaignKey: "factory:assurance:calibration:hidden-systems:0001",
    channelId: "hidden-systems", formatKey: "hidden-systems-documentary",
    policyVersion: "AI_FIRST_PRODUCTION_ASSURANCE_V1", standardVersion: "VIDEO_QUALITY_STANDARD_V3",
    datasetVersion: "HIDDEN_SYSTEMS_ASSURANCE_CALIBRATION_DATASET_V1", datasetManifestHash: hashes[0],
    correlationPolicyVersion: "INDEPENDENT_CORRELATION_GROUP_V1", cases: calibrationCases(), evidenceHash: hashes[1], ...overrides,
  };
}

test("migration 0115 installs append-only L0-L7 calibration receipts with every downstream authority closed", () => {
  assert.equal(migrations.at(-1), "0115_factory_assurance_calibration_and_qa_cockpit.sql");
  const migration = read("drizzle/0115_factory_assurance_calibration_and_qa_cockpit.sql");
  for (const table of ["factory_assurance_calibration_campaigns", "factory_assurance_calibration_cases", "factory_assurance_calibration_observations", "factory_assurance_calibration_results"]) assert.ok(migration.includes(`CREATE TABLE \`${table}\``));
  for (const lock of ["qualification_authority", "pass_authority", "provider_dispatch_authority", "r22_authority", "master_authority", "release_authority", "publication_authority"]) assert.match(migration, new RegExp(`${lock}[^;]+CHECK \\(`, "s"));
  assert.doesNotMatch(migration, /api\.openai\.com|elevenlabs\.io|youtube-ai-factory-v2/);
});

test("blind controls, holdouts, correlation groups and exact-byte repeats produce only qualified candidates", async () => {
  const { database, db } = setup();
  const recorded = await recordFactoryAssuranceCalibrationPackage(db, packageInput());
  assert.equal(recorded.lifecycleState, "MEASURED_QUALIFIED_CANDIDATE");
  assert.equal(recorded.results.length, 8);
  assert.ok(recorded.results.every((result) => result.lifecycleState === "QUALIFIED_CANDIDATE" && result.p0Recall === 1 && result.p1Recall === 1 && result.cleanPrecision === 1 && result.exactByteRepeatability === 1));
  assert.equal(recorded.qualificationAuthority, false); assert.equal(recorded.passAuthority, false); assert.equal(recorded.providerDispatchAuthority, false); assert.equal(recorded.r22Authority, false);
  assert.equal((await recordFactoryAssuranceCalibrationPackage(db, packageInput())).outcome, "IDEMPOTENT_REPLAY");
  assert.equal(database.prepare("SELECT COUNT(*) total FROM factory_assurance_calibration_cases").get().total, 160);
  assert.equal(database.prepare("SELECT COUNT(*) total FROM factory_assurance_calibration_observations").get().total, 320);
  assert.equal(database.prepare("SELECT COUNT(*) total FROM factory_assurance_calibration_results WHERE lifecycle_state='QUALIFIED_CANDIDATE' AND pass_authority=0").get().total, 8);
  assert.equal(database.prepare("SELECT COUNT(*) total FROM factory_assurance_calibration_results WHERE threshold_version=?").get(FACTORY_ASSURANCE_CALIBRATION_THRESHOLD_VERSION).total, 8);
  assert.throws(() => database.prepare("UPDATE factory_assurance_calibration_results SET lifecycle_state='ADVISORY'").run(), /FACTORY_ASSURANCE_CALIBRATION_RESULTS_APPEND_ONLY/);
});

test("critical false-clean or repeat decision flip keeps a layer advisory", () => {
  const cases = calibrationCases().filter((item) => item.assuranceLayer === "L2");
  cases[0].observations[0].observedOutcome = "PASS";
  cases[0].observations[0].observedSeverity = "NONE";
  const result = evaluateFactoryAssuranceCalibrationLayer("L2", cases);
  assert.equal(result.lifecycleState, "ADVISORY");
  assert.equal(result.criticalFalseCleanCount, 1);
  assert.equal(result.p0P1DecisionFlipCount, 1);
  assert.ok(result.reasons.includes("CALIBRATION_METRICS_BELOW_ACTIVE_THRESHOLD"));
  assert.equal(result.passAuthority, false);
});

test("QA Cockpit projects immutable calibration truth without inventing qualification or PASS", async () => {
  const { db } = setup();
  await recordFactoryAssuranceCalibrationPackage(db, packageInput());
  const cockpit = await factoryQaCockpitProjection(db);
  assert.equal(cockpit.state, "CALIBRATION_REQUIRED");
  assert.equal(cockpit.mode, "AI_SHADOW");
  assert.equal(cockpit.summary.qualifiedCandidateLayers, 8);
  assert.equal(cockpit.summary.currentQualifiedLayers, 0);
  assert.equal(cockpit.summary.calibrationCases, 160);
  assert.equal(cockpit.layers.length, 8);
  assert.ok(cockpit.layers.every((layer) => layer.calibrationState === "QUALIFIED_CANDIDATE" && layer.qualificationState === "NOT_REGISTERED" && layer.passAuthority === false));
  assert.equal(cockpit.authority.acceptance, "ADVISORY_ONLY");
  assert.equal(cockpit.authority.pass, false); assert.equal(cockpit.authority.r22, false); assert.equal(cockpit.authority.release, false); assert.equal(cockpit.authority.publication, false);
  assert.match(cockpit.nextAction, /Register the exact current judge/);
});
