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
