import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { compileWave9PreProductionV23, compileWave9ProductionSystemV23, WAVE_9_PREPRODUCTION_COMPILER_V23, WAVE_9_PRODUCTION_SYSTEM_V23 } from "../lib/wave9-production-system-v23.mjs";
import { planWave9StoryboardsV23, renderWave9StoryboardSheetV23, WAVE_9_STORYBOARD_RENDERER_V23 } from "../lib/wave9-storyboard-renderer-v23.mjs";

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

function sourceShots(count = 166) {
  return Array.from({ length: count }, (_, index) => ({
    slotId: `SHOT-${String(index + 1).padStart(3, "0")}`,
    sectionId: `SECTION-${Math.floor(index / 12) + 1}`,
    startSeconds: index * 4,
    endSeconds: index * 4 + 4,
    narrationClause: `The payment system moves value through control ${index + 1}.`,
    visualJob: `Show the exact origin, control action and destination for mechanism ${index + 1}.`,
    entryState: `Origin ${index + 1}`,
    motionEvent: `Value crosses control ${index + 1}`,
    exitState: `Destination ${index + 1}`,
    factualAcceptance: `The value reaches only destination ${index + 1}.`,
    sourceMode: index % 3 === 0 ? "SOURCE_PROVIDER" : index % 3 === 1 ? "HYBRID" : "MAKE_ORIGINAL",
    primaryFamily: index % 2 === 0 ? "transaction system diagram" : "data chart comparison",
    providerQueries: [`payment mechanism ${index + 1}`],
  }));
}

test("V23.2 compiles one complete zero-spend design package for every shot", () => {
  const result = compileWave9PreProductionV23(sourceShots(), { upstreamArtifactId: "STAGE08", upstreamHash: "hash" });
  assert.equal(result.version, WAVE_9_PREPRODUCTION_COMPILER_V23.version);
  assert.equal(result.status, "DESIGN_CONTRACTS_FROZEN_VISUAL_EVIDENCE_REQUIRED");
  assert.equal(result.scope, 166);
  assert.equal(result.packages.length, 166);
  assert.equal(result.materializedArtifactContracts, 1329);
  assert.equal(result.frozenArtifactContracts, 831);
  assert.equal(result.remoteDispatches, 0);
  assert.ok(result.checks.every((item) => item.pass));
});

test("V23.2 keeps production fail-closed until visual evidence and assets exist", () => {
  const result = compileWave9PreProductionV23(sourceShots());
  for (const shot of result.packages) {
    assert.equal(Object.keys(shot.artifacts).length, 8);
    assert.equal(shot.artifacts.storyboardManifest.lifecycle, "SPECIFIED_RENDER_REQUIRED");
    assert.equal(shot.artifacts.animaticPlan.lifecycle, "BLOCKED_STORYBOARD_BYTES");
    assert.equal(shot.artifacts.productionManifestSkeleton.lifecycle, "BLOCKED_ASSET_LOCK");
    assert.equal(shot.artifacts.productionManifestSkeleton.renderFallback, "FORBIDDEN");
  }
});

test("production API exposes one idempotent V23.2 compile action with no provider fetch", () => {
  const route = fs.readFileSync(new URL("../app/api/factory/material-production/route.ts", import.meta.url), "utf8");
  assert.match(route, /COMPILE_WAVE_9_V23_PREPRODUCTION/);
  assert.match(route, /compileWave9V23PreProduction/);
  const start = route.indexOf("async function compileWave9V23PreProduction");
  const end = route.indexOf("async function waveBatch2V21ActivationContext", start);
  const implementation = route.slice(start, end);
  assert.doesNotMatch(implementation, /fetch\(/);
  assert.match(implementation, /ON CONFLICT\(id\) DO NOTHING/);
  assert.match(implementation, /ZERO_SPEND_INVARIANT_FAILED/);
});

test("V23.3 plans exactly 166 immutable three-state storyboard sheets", () => {
  const compilation = compileWave9PreProductionV23(sourceShots());
  const result = planWave9StoryboardsV23(compilation);
  assert.equal(result.version, WAVE_9_STORYBOARD_RENDERER_V23.version);
  assert.equal(result.status, "READY_TO_RENDER");
  assert.equal(result.shotCount, 166);
  assert.equal(result.frameCount, 498);
  assert.equal(result.remoteDispatches, 0);
  assert.ok(result.checks.every((item) => item.pass));
});

test("V23.3 emits real domain-native SVG bytes without a generic-card fallback", () => {
  const compilation = compileWave9PreProductionV23(sourceShots());
  const svg = renderWave9StoryboardSheetV23(compilation.packages[0]);
  assert.match(svg, /^<svg/);
  assert.match(svg, /ENTRY/);
  assert.match(svg, /MIDPOINT/);
  assert.match(svg, /EXIT/);
  assert.match(svg, /NO GENERIC FALLBACK/);
  assert.doesNotMatch(svg, /placeholder/i);
});

test("production API exposes one bounded idempotent V23.3 storyboard render action", () => {
  const route = fs.readFileSync(new URL("../app/api/factory/material-production/route.ts", import.meta.url), "utf8");
  assert.match(route, /RENDER_WAVE_9_V23_STORYBOARDS/);
  const start = route.indexOf("async function renderWave9V23Storyboards");
  const end = route.indexOf("async function waveBatch2V21ActivationContext", start);
  const implementation = route.slice(start, end);
  assert.match(implementation, /boundedConcurrency = 8/);
  assert.match(implementation, /ON CONFLICT\(id\) DO NOTHING/);
  assert.match(implementation, /V23_STORYBOARD_ZERO_SPEND_INVARIANT_FAILED/);
  assert.doesNotMatch(implementation, /fetch\(/);
});
