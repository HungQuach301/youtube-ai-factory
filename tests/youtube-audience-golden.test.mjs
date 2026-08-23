import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Audience Master V1 migration installs append-only gates with no release authority", () => {
  const migration = read("drizzle/0083_youtube_audience_golden_sequence.sql");
  for (const table of ["v7_youtube_audience_master_policies", "v7_youtube_golden_sequence_blueprints", "v7_youtube_golden_audio_artifacts", "v7_youtube_golden_materialization_receipts", "v7_youtube_golden_qa_receipts", "v7_youtube_golden_owner_receipts", "v7_youtube_golden_freeze_receipts"]) assert.match(migration, new RegExp(table));
  assert.match(migration, /overall_floor.*= 92/s);
  assert.match(migration, /critical_dimension_floor.*= 90/s);
  assert.match(migration, /maximum_p0.*= 0/s);
  assert.match(migration, /maximum_p1.*= 0/s);
  assert.match(migration, /publication_authority.*= 0/s);
  assert.doesNotMatch(migration, /api\.openai\.com|api\.elevenlabs\.io|DELETE FROM `production_v2/);
});

test("Audience Golden runtime separates visual atlas, exact audio, browser and owner authority", () => {
  const runtime = read("lib/youtube-audience-golden.ts"), route = read("app/api/factory/sequential-production/audience-golden/route.ts"), executor = read("scripts/audience-golden-executor.mjs");
  assert.match(runtime, /FOUR_TIME_BOUND_PIXEL_ATLASES/);
  assert.match(runtime, /nativeVideoObserved: false/);
  assert.match(runtime, /EXACT_FULL_AUDIENCE_MIX/);
  assert.match(runtime, /FULL_PLAYBACK_ATTESTATION_REQUIRED/);
  assert.match(runtime, /FROZEN_AUDIENCE_GOLDEN/);
  assert.match(route, /SIWC_AUTHENTICATION_REQUIRED/);
  assert.match(route, /action !== "OWNER_DECISION"/);
  assert.match(route, /AUDIENCE_GOLDEN_EXECUTOR_V1/);
  assert.match(executor, /semanticRuntimeRatio:1/);
  assert.match(executor, /cameraOnlyRatio:0/);
});
