import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const route = await readFile(new URL("../app/api/factory/material-production/route.ts", import.meta.url), "utf8");
const page = await readFile(new URL("../app/material-production/page.tsx", import.meta.url), "utf8");
const home = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("v242 operator is the active entrypoint and never loads the media gallery", () => {
  assert.match(home, /material-production\/page/);
  assert.match(page, /\?view=operator/);
  assert.match(page, /mediaPolicy/);
  assert.doesNotMatch(page, /<video|next\/image|previewUrl|pilot\.items/);
});

test("operator state is a bounded canonical projection", () => {
  assert.match(route, /async function operatorSnapshot/);
  assert.match(route, /params\.get\("view"\) === "operator"/);
  assert.match(route, /cache-control": "no-store"/);
  assert.match(route, /wave_key='BATCH_1'/);
  assert.match(route, /wave_key='BATCH_2'/);
  assert.match(route, /status IN \('QUEUED','IN_PROGRESS'\)/);
});

test("Batch 2 activation is fail-closed and idempotent", () => {
  assert.match(route, /batch1Passed && portfolioComplete === 36 && !batch2 && activeRequests === 0/);
  assert.match(route, /batch2Records: batch2 \? 1 : 0/);
  assert.match(route, /if \(existing\) return snapshot\(\)/);
  assert.match(page, /Idempotency-Key/);
  assert.match(route, /START_WAVE_BATCH_2_V242/);
  assert.match(page, /disabled=\{!data\.activation\.canStart/);
});

test("legacy controls are absent from the active operator while production contracts remain server-side", () => {
  for (const legacy of ["AUTHORIZE_CONTROLLED_CANARY_V5", "BUILD_CANARY_RECOVERY_LANE", "RELEASE_PRODUCTION_RECOVERY_PROBE"]) {
    assert.doesNotMatch(page, new RegExp(legacy));
    assert.match(route, new RegExp(legacy));
  }
  assert.match(route, /LEGACY_ACTION_UNREACHABLE_AFTER_STABILIZATION/);
});
