import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { evaluateCapabilityEligibility } from "../lib/first-pass-capability-registry.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

const qualified = {
  bindingId: "binding-1",
  capabilityId: "capability-1",
  capabilityKey: "LAYERED_SCENE_COMPOSITOR",
  capabilityVersion: "1.0.0",
  capabilityState: "QUALIFIED",
  activeSettingsHash: "sha256:settings",
  archetypeId: "archetype-1",
  archetypeKey: "TRANSACTION_STATE_PROOF",
  archetypeLabel: "Transaction state proof",
  qualificationId: "qualification-1",
  qualificationVersion: 1,
  qualificationCapabilityVersion: "1.0.0",
  qualificationStandardVersion: "FIRST_PASS_QUALITY_V1",
  qualificationState: "QUALIFIED",
  settingsHash: "sha256:settings",
  sampleSize: 2,
  minimumSampleSize: 2,
  firstPassYield: 1,
  minimumFirstPassYield: 0.95,
  p0EscapeCount: 0,
  evidenceHashCount: 2,
  revokedAt: "",
};

test("first-pass eligibility is fail-closed and version-bound", () => {
  const pass = evaluateCapabilityEligibility("RUN_STAGE_09_BATCH", "09", [qualified]);
  assert.equal(pass.eligible, true);
  assert.deepEqual(pass.qualificationIds, ["qualification-1"]);

  const fail = evaluateCapabilityEligibility("RUN_STAGE_09_BATCH", "09", [{
    ...qualified,
    capabilityState: "QUALIFICATION_REQUIRED",
    qualificationState: "QUALIFICATION_REQUIRED",
    settingsHash: "",
    sampleSize: 0,
    firstPassYield: 0,
    evidenceHashCount: 0,
  }]);
  assert.equal(fail.eligible, false);
  assert.deepEqual(fail.gaps[0].reasons, [
    "CAPABILITY_NOT_QUALIFIED",
    "ARCHETYPE_QUALIFICATION_NOT_PASSED",
    "SETTINGS_HASH_MISSING",
    "CAPABILITY_SETTINGS_MISMATCH",
    "SAMPLE_SIZE_BELOW_FLOOR",
    "FIRST_PASS_YIELD_BELOW_FLOOR",
    "EVIDENCE_HASH_COVERAGE_INCOMPLETE",
  ]);
  assert.equal(evaluateCapabilityEligibility("UNKNOWN", "99", []).eligible, false);
});

test("FP2 migration registers mechanisms, hardest archetypes, fixtures and dispatch evidence", () => {
  const migration = read("drizzle/0048_first_pass_capability_registry.sql");
  for (const table of [
    "v7_first_pass_capabilities",
    "v7_first_pass_archetypes",
    "v7_first_pass_fixtures",
    "v7_first_pass_qualifications",
    "v7_first_pass_operation_requirements",
    "v7_first_pass_artifact_envelopes",
    "v7_first_pass_dispatch_audits",
  ]) assert.match(migration, new RegExp("CREATE TABLE `" + table + "`"));
  assert.match(migration, /FIRST_PASS_QUALITY_V1/);
  assert.match(migration, /TRANSACTION_STATE_PROOF/);
  assert.match(migration, /NUMBER_HEAVY_NARRATION/);
  assert.match(migration, /FULL_MASTER_VISUAL_ASSURANCE/);
  assert.match(migration, /providerDispatch":false/);
  assert.match(migration, /QUALIFICATION_REQUIRED/);
});

test("all production dispatch boundaries require qualification before provider work", () => {
  const executor = read("app/api/factory/sequential-production/executor/route.ts");
  const media = read("app/api/factory/sequential-production/media/route.ts");
  const quality = read("app/api/factory/sequential-production/quality/route.ts");
  assert.match(executor, /assertFirstPassCapabilityEligibility[\s\S]*operation: "COMPILE_STAGE_BUNDLE"/);
  assert.ok(executor.indexOf("assertFirstPassCapabilityEligibility(env.DB!") < executor.indexOf("https:\/\/api.openai.com\/v1\/responses"));
  assert.match(media, /operation: "RUN_STAGE_09_BATCH"/);
  assert.ok(media.indexOf("assertFirstPassCapabilityEligibility(env.DB!") < media.indexOf("results.push(await produceShot"));
  assert.match(quality, /"PRODUCE_GOLDEN_AUDIO", "10"/);
  assert.match(quality, /"REQUEST_GOLDEN_MASTER_RENDER", "13"/);
  assert.match(quality, /"GOLDEN_MASTER_INDEPENDENT_AUDIT", "14"/);
  assert.match(quality, /providerRequests: 0, spendUsd: 0/);
});

test("operator UI projects registry coverage without implying production readiness", () => {
  const projection = read("lib/sequential-production-projection.ts");
  const workspace = read("app/video-engine/production-engine-workspace.tsx");
  assert.match(projection, /currentSlice: "WAVE_3"/);
  assert.match(projection, /v7_learning_ready_contract_registry/);
  assert.match(projection, /nextSlice: "WP7_CORPUS_VERIFICATION"/);
  assert.match(projection, /dispatchGuardState: "ENFORCED"/);
  assert.match(workspace, /Qualification happens before production/);
  assert.match(workspace, /provider dispatch, Safety Scope completion and Golden r10 remain separately blocked/);
});
