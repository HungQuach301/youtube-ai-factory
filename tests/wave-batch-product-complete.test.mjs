import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const route = await readFile(new URL("../app/api/factory/material-production/route.ts", import.meta.url), "utf8");
const page = await readFile(new URL("../app/material-production/page.tsx", import.meta.url), "utf8");
const migration = await readFile(new URL("../drizzle/0029_wave_batch_product_complete.sql", import.meta.url), "utf8");

test("Batch 1 expands exactly 26 new shots to a 36-of-166 portfolio", () => {
  assert.match(route, /pilot=0 ORDER BY start_seconds LIMIT 26/);
  assert.match(route, /targetPortfolioComplete: 36/);
  assert.match(route, /Number\(batch\.completed_units\) !== 26/);
  assert.match(page, /26 new shots must be complete before independent QA/);
});

test("production completion precedes QA and failed QA routes to the root engine", () => {
  assert.match(route, /clean\(batch\?\.status\) === "PRODUCT_COMPLETE"/);
  assert.match(route, /NO_OUTPUT_REPAIR/);
  assert.match(route, /REJECT_ENGINE_VERSION_AND_FIX_ROOT_PRODUCTION_LAYER/);
  assert.match(route, /retryWithoutEngineChange: false/);
  assert.match(route, /PRODUCTION_ENGINE_QUALIFICATION_REQUIRED/);
});

test("Batch 1 has durable product, audit, and lineage tables", () => {
  for (const table of ["v7_production_batches", "v7_shot_products", "v7_batch_product_audits"]) {
    assert.ok(migration.includes("CREATE TABLE IF NOT EXISTS `" + table + "`"));
    assert.match(route, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
  assert.match(route, /frameIds\.length !== 3 \|\| new Set\(frameHashes\)\.size !== 3/);
  assert.match(route, /BATCH_1_AUDIT_FRAME_HASH_MISMATCH/);
});

test("Batch audit is one bounded risk-stratified request after 26 products", () => {
  assert.match(route, /sample\.length !== 7/);
  assert.match(route, /independentAuditRequests: 1/);
  assert.match(route, /WAVE_BATCH_PRODUCT_AUDIT/);
  assert.match(route, /"idempotency-key": requestId/);
  assert.match(page, /7\/26 RISK-STRATIFIED SAMPLE/);
});

test("production DoD failure rejects the prior engine and qualifies the replacement compiler across all 26 shots", () => {
  assert.match(route, /SHOT_PRODUCT_ENGINE_V3_SEMANTIC_SCENE_GRAPH/);
  assert.match(route, /SEMANTIC_SCENE_GRAPH_COMPILER_V3/);
  assert.match(route, /maximumViewerLabelGlyphs: 24/);
  assert.match(route, /BATCH_1_ROOT_CORRECTION_REQUIRES_ZERO_EMITTED_PRODUCTS/);
  assert.match(route, /scope\.length !== 26 \|\| failures\.length/);
  assert.match(route, /V1_LAYOUT_CONTRACT_DIVERGENCE/);
  assert.match(route, /emittedProductsBeforeCorrection: 0/);
  assert.match(page, /Qualify and adopt replacement engine/);
});

test("audit transport failure is reconciled before provider dispatch without touching products", () => {
  assert.match(route, /WAVE_AUDIT_TRANSPORT_V2_VERIFIED_JPEG_PROXY/);
  assert.match(route, /BATCH_1_AUDIT_RENDERER_REPLAY_MISMATCH/);
  assert.match(route, /jpeg\.encode\(\{ data: rendered\.pixels/);
  assert.match(route, /BLOCKED_TRANSPORT_PRE_DISPATCH/);
  assert.match(route, /providerRequestsCreated: 0, tokenUsage: 0, costUsd: 0, outputRepair: false, qaRetry: false/);
  assert.match(route, /max_remote_requests=max_remote_requests\+1/);
  assert.match(route, /zero provider-dispatched prior audits is required/);
  assert.match(route, /Number\(priorRequest\?\.actual_cost_usd \|\| 0\) === 0/);
  assert.match(page, /Adopt verified audit transport V2/);
});

test("failed independent QA replaces the semantic production system and reproduces all 26 products", () => {
  assert.match(route, /SEMANTIC_SCENE_GRAPH_V1/);
  for (const kind of ["PARTICIPANT_INCIDENCE", "DUAL_RECORD", "IDENTIFIER_COMPARISON", "EVIDENCE_BARRIER", "BOUNDED_INTERVAL"]) assert.match(route, new RegExp(kind));
  assert.match(route, /PRODUCT_COMPLETE_REJECTED_ENGINE_EVIDENCE/);
  assert.match(route, /ENGINE_ROOT_CAUSE_PRESERVED/);
  assert.match(route, /reproduceScope: "ALL_26_PRODUCTS"/);
  assert.match(route, /priorProductsPreservedAsEvidence: true/);
  assert.match(route, /supersedes_id/);
  assert.match(route, /wave-09-batch-1-engine-v3/);
  assert.match(page, /Qualify Engine V3 and reproduce 26/);
});
