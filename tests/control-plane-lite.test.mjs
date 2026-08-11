import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const route = await readFile(new URL("../app/api/factory/material-production/route.ts", import.meta.url), "utf8");
const page = await readFile(new URL("../app/material-production/page.tsx", import.meta.url), "utf8");
const home = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("the pre-cleanup Factory UI is restored in full", () => {
  assert.doesNotMatch(home, /export \{ default \} from "\.\/material-production\/page"/);
  assert.match(home, /Command center/);
  assert.match(home, /href="\/control-plane"/);
  assert.match(home, /Market radar/);
  assert.match(home, /Topic backlog/);
  assert.match(home, /Content calendar/);
  assert.match(home, /Video projects/);
  assert.match(page, /import Image from "next\/image"/);
  assert.match(page, /productionBatch/);
  assert.match(page, /previewUrl/);
  assert.match(page, /Preflight and start Batch 2/);
});

test("the restored shell retains its original primary and settings routes", () => {
  assert.match(home, /href="\/control-plane"/);
  assert.match(home, /href="\/settings"/);
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
  assert.match(route, /START_WAVE_BATCH_2_V243/);
  assert.match(page, /START_WAVE_BATCH_2/);
  assert.match(page, /data\.requestLedger\.active > 0/);
});

test("the restored production UI exposes its original operational controls", () => {
  for (const legacy of ["AUTHORIZE_CONTROLLED_CANARY_V5", "BUILD_CANARY_RECOVERY_LANE", "RELEASE_PRODUCTION_RECOVERY_PROBE"]) {
    assert.match(page, new RegExp(legacy));
    assert.match(route, new RegExp(legacy));
  }
  assert.match(route, /LEGACY_ACTION_UNREACHABLE_AFTER_STABILIZATION/);
});
