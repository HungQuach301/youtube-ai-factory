import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { canonicalHash, sha256Hex } from "../lib/canonical-json.ts";
import {
  evaluateHiddenSystemsTreatmentQualification,
  persistHiddenSystemsTreatmentQualification,
} from "../lib/factory-hidden-systems-treatment-qualification.ts";
import { runHiddenSystemsTreatmentLiveQualification } from "../lib/factory-hidden-systems-treatment-live-runner.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const migrations = readdirSync(new URL("../drizzle", import.meta.url)).filter((name) => name.endsWith(".sql")).sort();
const corpus = () => JSON.parse(read("tests/fixtures/hidden-systems-treatment-qualification/package.json"));

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

function bucket() {
  const objects = new Map();
  return {
    objects,
    async put(key, value) { objects.set(key, new Uint8Array(value)); },
    async get(key) { const value = objects.get(key); return value ? { async arrayBuffer() { return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength); } } : null; },
  };
}

async function syntheticExecution(input, outputBytes = null) {
  const corpusHash = await canonicalHash(input), settingsHash = await canonicalHash(input.compositor.settings);
  const outputHash = outputBytes ? await sha256Hex(outputBytes) : await canonicalHash({ corpusHash, settingsHash, output: input.output });
  return {
    contractVersion: "HIDDEN_SYSTEMS_TREATMENT_QUALIFICATION_V1",
    corpusHash,
    settingsHash,
    encoderBuildHash: await canonicalHash("ffmpeg-qualified-build-v1"),
    output: { sha256: outputHash, readbackHash: outputHash, deterministicReplayHash: outputHash, width: 1920, height: 1080, frameRateNumerator: 30, frameRateDenominator: 1, frameCount: 90 },
    cases: await Promise.all(input.cases.map(async (item) => ({
      key: item.key,
      topologyHash: await canonicalHash({ topology: item.topology, motionProfile: item.motionProfile, treatmentFamily: item.treatmentFamily }),
      stateSampleHashes: await Promise.all(["ENTRY", "MUTATION", "EXIT"].map((state) => canonicalHash({ key: item.key, state }))),
      evidenceHash: await canonicalHash({ item, corpusHash, settingsHash }),
    }))),
    zeroDispatch: true,
    providerRequests: 0,
    spendMicros: 0,
  };
}

test("migration 0112 installs append-only production-scale treatment qualification receipts with no R22 authority", () => {
  assert.equal(migrations.at(-1), "0129_exact_tree_deployment_receipts.sql");
  const migration = read("drizzle/0112_factory_hidden_systems_treatment_qualification.sql");
  for (const table of ["factory_treatment_qualification_packages", "factory_treatment_qualification_case_receipts"]) assert.ok(migration.includes("CREATE TABLE `" + table + "`"));
  for (const lock of ["r22_authority", "master_authority", "release_authority", "publication_authority"]) assert.ok(migration.includes("`" + lock + "` integer NOT NULL CHECK (`" + lock + "` = 0)"));
  assert.match(migration, /INTERNAL_TREATMENT_QUALIFICATION_ONLY/);
  assert.match(migration, /FACTORY_TREATMENT_QUALIFICATION_PACKAGES_APPEND_ONLY/);
  assert.doesNotMatch(migration, /api\.openai\.com|elevenlabs\.io|youtube-ai-factory-v2/);
  const route = read("app/api/factory/treatment-qualification/route.ts");
  assert.match(route, /FACTORY_HIDDEN_SYSTEMS_TREATMENT_QUALIFICATION_ENABLED/);
  assert.match(route, /FACTORY_RUNTIME_WRITER_ENABLED/);
  assert.match(route, /x-factory-runtime-qualification-token/);
  assert.match(route, /QUALIFY_HIDDEN_SYSTEMS_TREATMENTS/);
  assert.match(route, /authorityPayload\.includes\("R22"\)/);
  assert.match(route, /action: body\.action, corpus: body\.corpus, execution: body\.execution/);
  assert.doesNotMatch(route, /JSON\.stringify\(body\)\.toUpperCase\(\)\.includes\("R22"\)/);
  assert.doesNotMatch(route, /getChatGPTUser|api\.openai\.com|elevenlabs\.io/);
});

test("bounded live runner writes exact WebM to R2 and atomically reads back one package plus ten cases", async () => {
  const input = corpus(), outputBytes = new TextEncoder().encode("bounded-production-scale-treatment-output-v1"), execution = await syntheticExecution(input, outputBytes);
  const database = new DatabaseSync(":memory:"); database.exec("PRAGMA foreign_keys=ON");
  for (const migration of migrations) database.exec(read(`drizzle/${migration}`));
  const storage = bucket(), env = { DB: d1(database), BUCKET: storage };
  const result = await runHiddenSystemsTreatmentLiveQualification(env, input, execution, outputBytes);
  assert.equal(result.outcome, "QUALIFIED");
  assert.equal(result.caseCount, 10);
  assert.equal(result.r22Authority, false);
  assert.equal(result.providerRequests, 0);
  assert.equal(result.spendMicros, 0);
  assert.equal(storage.objects.size, 1);
  const replay = await runHiddenSystemsTreatmentLiveQualification(env, input, execution, outputBytes);
  assert.equal(replay.outcome, "IDEMPOTENT_REPLAY");
  assert.equal(database.prepare("SELECT COUNT(*) total FROM factory_treatment_qualification_packages").get().total, 1);
  assert.equal(database.prepare("SELECT COUNT(*) total FROM factory_treatment_qualification_case_receipts").get().total, 10);
  const tampered = new TextEncoder().encode("tampered");
  await assert.rejects(() => runHiddenSystemsTreatmentLiveQualification(env, input, execution, tampered), /does not match the exact execution receipt/);
});

test("Hidden Systems corpus qualifies exact geometry, ten distinct treatments, three routes and asset preparation lineage", async () => {
  const input = corpus(), execution = await syntheticExecution(input);
  const plan = await evaluateHiddenSystemsTreatmentQualification(input, execution);
  assert.equal(plan.outcome, "PASS");
  assert.equal(plan.caseReceipts.length, 10);
  assert.equal(plan.providerRequests, 0);
  assert.equal(plan.spendMicros, 0);
  assert.equal(plan.authorityBoundary, "INTERNAL_TREATMENT_QUALIFICATION_ONLY");

  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys=ON");
  for (const migration of migrations) database.exec(read(`drizzle/${migration}`));
  const persisted = await persistHiddenSystemsTreatmentQualification(d1(database), input, execution);
  assert.equal(persisted.outcome, "QUALIFIED");
  assert.equal(database.prepare("SELECT COUNT(*) total FROM factory_treatment_qualification_packages WHERE verification_state='PASS' AND zero_dispatch=1 AND r22_authority=0").get().total, 1);
  assert.equal(database.prepare("SELECT COUNT(*) total FROM factory_treatment_qualification_case_receipts WHERE verification_state='PASS'").get().total, 10);
  assert.equal((await persistHiddenSystemsTreatmentQualification(d1(database), input, execution)).outcome, "IDEMPOTENT_REPLAY");
  assert.throws(() => database.prepare("UPDATE factory_treatment_qualification_packages SET verification_state='FAIL'").run(), /FACTORY_TREATMENT_QUALIFICATION_PACKAGES_APPEND_ONLY/);
  assert.throws(() => database.prepare("DELETE FROM factory_treatment_qualification_case_receipts").run(), /FACTORY_TREATMENT_QUALIFICATION_CASE_RECEIPTS_APPEND_ONLY/);
});

test("qualification fails closed on mobile, topology, temporal, asset-lineage or exact-repeat defects", async () => {
  const base = corpus(), execution = await syntheticExecution(base);
  const badMobile = structuredClone(base); badMobile.cases[0].minimumFontPx = 32;
  assert.equal((await evaluateHiddenSystemsTreatmentQualification(badMobile, await syntheticExecution(badMobile))).outcome, "BLOCKED");
  const repeated = structuredClone(base); repeated.cases[1].topology = repeated.cases[0].topology;
  assert.ok((await evaluateHiddenSystemsTreatmentQualification(repeated, await syntheticExecution(repeated))).reasons.includes("REPEATED_TOPOLOGY_DETECTED"));
  const missingAsset = structuredClone(base); delete missingAsset.cases[8].assetPreparation;
  assert.ok((await evaluateHiddenSystemsTreatmentQualification(missingAsset, await syntheticExecution(missingAsset))).reasons.some((reason) => reason.includes("ASSET_PREPARATION_LINEAGE_REQUIRED")));
  const badTemporal = structuredClone(execution); badTemporal.cases[0].stateSampleHashes[2] = badTemporal.cases[0].stateSampleHashes[1];
  assert.ok((await evaluateHiddenSystemsTreatmentQualification(base, badTemporal)).reasons.some((reason) => reason.includes("ENTRY_MUTATION_EXIT_NOT_DISTINCT")));
  const badReplay = structuredClone(execution); badReplay.output.deterministicReplayHash = "f".repeat(64);
  assert.ok((await evaluateHiddenSystemsTreatmentQualification(base, badReplay)).reasons.includes("EXACT_REPEAT_OUTPUT_MISMATCH"));
});

test("tracked production-scale executor emits exact-repeat 1920x1080 VP9 and thirty distinct decoded state samples", { skip: spawnSync("ffmpeg", ["-version"]).status !== 0 || spawnSync("ffprobe", ["-version"]).status !== 0 }, async () => {
  const work = mkdtempSync(join(tmpdir(), "hidden-systems-treatment-executor-test-"));
  try {
    const packagePath = new URL("../tests/fixtures/hidden-systems-treatment-qualification/package.json", import.meta.url).pathname;
    const executorPath = new URL("../scripts/factory-hidden-systems-treatment-qualifier.mjs", import.meta.url).pathname;
    const run = (name) => JSON.parse(execFileSync(process.execPath, [executorPath, "--package", packagePath, "--output", join(work, name)], { encoding: "utf8", maxBuffer: 8_000_000 }));
    const first = run("qualification-a.webm"), second = run("qualification-b.webm");
    assert.equal(first.output.sha256, second.output.sha256);
    assert.deepEqual({ width: first.output.width, height: first.output.height, fpsN: first.output.frameRateNumerator, fpsD: first.output.frameRateDenominator, frames: first.output.frameCount }, { width: 1920, height: 1080, fpsN: 30, fpsD: 1, frames: 90 });
    assert.equal(first.cases.length, 10);
    assert.equal(first.cases.flatMap((item) => item.stateSampleHashes).length, 30);
    for (const item of first.cases) assert.equal(new Set(item.stateSampleHashes).size, 3);
    assert.equal((await evaluateHiddenSystemsTreatmentQualification(corpus(), first)).outcome, "PASS");
    assert.equal(first.providerRequests, 0);
    assert.equal(first.spendMicros, 0);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});
