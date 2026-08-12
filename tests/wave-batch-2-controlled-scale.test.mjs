import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const route = await readFile(new URL("../app/api/factory/material-production/route.ts", import.meta.url), "utf8");

test("Batch 2 is a 50-shot controlled scale from 36 to 86 of 166", () => {
  assert.match(route, /LIMIT 50 OFFSET 26/);
  assert.match(route, /targetPortfolioComplete: 86/);
  assert.match(route, /Number\(batch\.completed_units\) !== 50/);
});

test("Batch 1 P2 findings become production regressions before Batch 2", () => {
  for (const control of ["NO_INACTIVE_PARTICIPANT_NAME", "EXIT_CONTRAST_4_5", "BARRIER_PRECEDENCE_BEFORE_ABSENCE", "ART_DIRECTION_SEPARATION"]) assert.match(route, new RegExp(control));
  assert.match(route, /BATCH_2_PREFLIGHT_FAILED/);
  assert.match(route, /duplicateSpecifications: 0/);
  assert.match(route, /QUALITY_FIRST_WITH_RUNAWAY_PROTECTION/);
});

test("Batch 2 completes products before one independent audit", () => {
  assert.match(route, /WAVE_BATCH_2_PRODUCT_AUDIT/);
  assert.match(route, /BATCH_2_PRODUCT_AUDIT_FIREWALL/);
  assert.match(route, /sample\.length !== 10/);
  assert.match(route, /outputRepair: false/);
  assert.match(route, /retryWithoutEngineChange: false/);
});

test("Batch 2 pass thresholds are stricter than Batch 1 controlled release", () => {
  assert.match(route, /Number\(result\.overall\) >= 90/);
  assert.match(route, /Number\(result\.semanticFit\) >= 90/);
  assert.match(route, /Number\(result\.factualSafety\) >= 92/);
  assert.match(route, /\["P0", "P1"\]\.includes/);
});

test("failed Batch 2 QA replaces V8 with a contract-bound V9 engine and preserves evidence", () => {
  for (const control of [
    "SHOT_PRODUCT_ENGINE_V9_CONTRACT_BOUND_SCENE_GRAPH",
    "CONTRACT_BOUND_SCENE_GRAPH_V9",
    "CONTRACT_BOUND_SCENE_GRAPH_COMPILER_V9",
    "CONTRACT_STATE_BINDING",
    "UNSUPPORTED_GENERIC_INJECTION",
    "CONTRACT_PIXEL_SIGNATURE",
    "CROSS_PRODUCT_PIXEL_REUSE",
    "CROSS_PRODUCT_FRAME_REUSE",
  ]) assert.match(route, new RegExp(control));
  assert.match(route, /frameSignatures\.size !== 150/);
  assert.match(route, /PRODUCT_COMPLETE_REJECTED_ENGINE_EVIDENCE/);
  assert.match(route, /priorProductsPreservedAsEvidence: true/);
  assert.match(route, /retryPriorAudit: false/);
  assert.match(route, /reproduceScope: "ALL_50_PRODUCTS"/);
  assert.match(route, /superseded\?\.id \|\| null/);
});

test("Batch 2 V9 production uses the batch-bound engine and never falls back to V8", () => {
  assert.match(route, /const engineVersion = clean\(batch\.engine_version\)/);
  assert.match(route, /BATCH_2_ENGINE_NOT_QUALIFIED/);
  assert.match(route, /SHOT_PRODUCT_SPECIFICATION_V3_CONTRACT_BOUND/);
  assert.match(route, /wave-09-batch-2-engine-v9/);
  assert.match(route, /150_OF_150/);
});

test("Batch 2 V9 audit is lineage-qualified and exactly-once across reconnects", () => {
  for (const control of [
    "WAVE_AUDIT_CONTROL_V3_DURABLE_IDEMPOTENT_INTENT",
    "50_OF_50_CONTRACTS_AND_150_OF_150_UNIQUE_FRAMES_PASS",
    "ENGINE_ROOT_CAUSE_PRESERVED",
    "REQUEST_IDEMPOTENCY_CONFLICT",
    "BATCH_2_AUDIT_INTENT_CONFLICT",
  ]) assert.match(route, new RegExp(control));
  assert.match(route, /stableRequestId \|\|/);
  assert.match(route, /ON CONFLICT\(id\) DO NOTHING/);
  assert.match(route, /'PREPARING',0,'BLOCKED'/);
  assert.match(route, /providerDispatches: 0/);
  assert.match(route, /const frameContent = await Promise\.all/);
});
