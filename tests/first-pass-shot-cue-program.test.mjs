import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  FP3_GOLDEN_CONTRACT_FIXTURE,
  compileAndSealShotCueProgram,
  compileShotCueProgram,
  lintShotCueProgram,
} from "../lib/first-pass-shot-cue-program.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

test("FP3 deterministically seals a complete 80.252-second ShotCueProgram", async () => {
  const result = await compileAndSealShotCueProgram(FP3_GOLDEN_CONTRACT_FIXTURE);
  assert.equal(result.contentHash, "7a85dd494d873e30b7c8fef9dc837ad479b42ce503c5452d2c35f554fea37629");
  assert.equal(result.program.durationSeconds, 80.252);
  assert.equal(result.program.shotCount, 8);
  assert.equal(result.program.treatmentFamilies.length, 8);
  assert.deepEqual(result.program.parentArtifacts.map((item) => item.stageKey), ["06", "07A", "07B"]);
  assert.deepEqual(result.program.providerPlan, { mode: "ZERO_DISPATCH", requestBudget: 0, spendBudgetUsd: 0 });
  assert.equal(result.program.fallbackAllowed, false);
  assert.deepEqual(result.lint, {
    passed: true,
    exactDuration: true,
    gapCount: 0,
    overlapCount: 0,
    schemaGapCount: 0,
    treatmentFamilyCount: 8,
    providerRequests: 0,
    spendUsd: 0,
    errors: [],
  });
});

test("FP3 lint fails closed on timing, semantic binding and fallback gaps", () => {
  const program = structuredClone(compileShotCueProgram(FP3_GOLDEN_CONTRACT_FIXTURE));
  program.shots[2].startSeconds += 0.5;
  program.shots[3].startSeconds -= 0.5;
  program.shots[4].qualityBindingIds = [];
  program.shots[6].visual.sourceQuery = "";
  program.shots[7].fallbackAllowed = true;
  const lint = lintShotCueProgram(program);
  assert.equal(lint.passed, false);
  assert.equal(lint.exactDuration, false);
  assert.equal(lint.gapCount, 1);
  assert.equal(lint.overlapCount, 1);
  assert.ok(lint.errors.includes("TIMELINE_NOT_EXACT_OR_CONTIGUOUS"));
  assert.ok(lint.errors.includes("FP3-SHOT-05:QUALITY_BINDINGS"));
  assert.ok(lint.errors.includes("FP3-SHOT-07:SOURCE_QUERY"));
  assert.ok(lint.errors.includes("FP3-SHOT-08:FALLBACK_DISABLED"));
});

test("FP3 migration stores typed cue, lint and qualification evidence with zero dispatch", () => {
  const migration = read("drizzle/0049_first_pass_shot_cue_program.sql");
  for (const table of [
    "v7_first_pass_visual_grammars",
    "v7_first_pass_shot_cue_programs",
    "v7_first_pass_shot_cues",
    "v7_first_pass_contract_lints",
  ]) assert.match(migration, new RegExp("CREATE TABLE `" + table + "`"));
  assert.match(migration, /80\.252,8,8/);
  assert.match(migration, /DETERMINISTIC_SHOT_CUE_COMPILER_1\.0\.0/);
  assert.match(migration, /7a85dd494d873e30b7c8fef9dc837ad479b42ce503c5452d2c35f554fea37629/);
  assert.match(migration, /'PASS',1,0,0,0,8,0,0,'\[\]'/);
  assert.match(migration, /`provider`='INTERNAL'/);
  assert.match(migration, /`lifecycle_state`='QUALIFIED'/);
  assert.doesNotMatch(migration, /api\.openai\.com|ELEVENLABS|PEXELS_API_KEY|PIXABAY_API_KEY|SHUTTERSTOCK_CONSUMER_KEY/);
});

test("operator projection activates bounded WP7 corpus verification without unlocking Golden r10", () => {
  const projection = read("lib/sequential-production-projection.ts");
  const contract = read("app/production-control-contract.ts");
  const workspace = read("app/video-engine/production-engine-workspace.tsx");
  assert.match(projection, /currentSlice: "WAVE_3"/);
  assert.match(projection, /currentSliceState: "CORPUS_VERIFICATION_ACTIVE"/);
  assert.match(projection, /nextSlice: "WP7_CORPUS_VERIFICATION"/);
  assert.match(projection, /goldenR10Eligible = false/);
  assert.match(contract, /state: "VERIFIED"/);
  assert.match(workspace, /Verify the WP7 failure corpus/);
  assert.match(workspace, /Eight schemas bind the full operating loop/);
  assert.match(workspace, /Candidate evidence only/);
  assert.match(workspace, /evaluation fixtures have release eligibility/);
});
