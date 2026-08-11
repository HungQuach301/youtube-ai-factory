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
