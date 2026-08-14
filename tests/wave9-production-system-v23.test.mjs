import test from "node:test";
import assert from "node:assert/strict";
import { compileWave9ProductionSystemV23, WAVE_9_PRODUCTION_SYSTEM_V23 } from "../lib/wave9-production-system-v23.mjs";

test("V23 moves quality construction into pre-production and production artifacts", () => {
  assert.deepEqual(WAVE_9_PRODUCTION_SYSTEM_V23.preProduction.map((stage) => stage.id), [
    "NARRATIVE_EVIDENCE", "VISUAL_LANGUAGE", "ARCHETYPE_RECIPE", "SHOT_DESIGN", "STORYBOARD", "ANIMATIC", "ASSET_LOCK", "PRODUCTION_MANIFEST",
  ]);
  assert.deepEqual(WAVE_9_PRODUCTION_SYSTEM_V23.production.map((stage) => stage.id), [
    "FINAL_ASSETS", "COMPILED_SCENE", "MOTION_TIMELINE", "AUDIO_TIMELINE", "SHOT_MASTER", "SEQUENCE_MASTER", "RELEASE_CANDIDATE",
  ]);
  assert.equal(WAVE_9_PRODUCTION_SYSTEM_V23.qaBoundary.maxAttempts, 2);
  assert.equal(WAVE_9_PRODUCTION_SYSTEM_V23.qaBoundary.mayAuthorProductionBriefs, false);
});

test("V23 forbids render-time fallbacks and unbounded generation", () => {
  assert.ok(WAVE_9_PRODUCTION_SYSTEM_V23.forbidden.includes("GENERIC_CARD_FALLBACK"));
  assert.ok(WAVE_9_PRODUCTION_SYSTEM_V23.forbidden.includes("ONE_PROMPT_FOR_50_TO_130_SCENES"));
  assert.ok(WAVE_9_PRODUCTION_SYSTEM_V23.forbidden.includes("AUTOMATIC_PROVIDER_RETRY"));
});

test("V23 deployment is zero-spend and keeps production locked until manifests freeze", () => {
  const result = compileWave9ProductionSystemV23({ shotCount: 166, activeRequests: 0, upstreamFrozen: true });
  assert.equal(result.status, "DEPLOYED_READY_TO_COMPILE_PREPRODUCTION");
  assert.equal(result.productionActivation, "LOCKED_UNTIL_PRODUCTION_MANIFESTS_FROZEN");
  assert.equal(result.remoteDispatches, 0);
  assert.equal(result.costDeltaUsd, 0);
});

test("V23 never overlaps a pre-existing provider request", () => {
  const result = compileWave9ProductionSystemV23({ shotCount: 166, activeRequests: 1, upstreamFrozen: true });
  assert.equal(result.status, "DEPLOYED_PRODUCTION_LOCKED_ACTIVE_PROVIDER_RECONCILIATION");
  assert.equal(result.constructionInvariants.find((item) => item.id === "NO_OVERLAPPING_PROVIDER_WORK")?.pass, false);
});
