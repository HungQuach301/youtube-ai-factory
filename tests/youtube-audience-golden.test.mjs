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
  assert.match(route, /AUDIENCE_GOLDEN_AUTOMATION_TOKEN/);
  assert.match(route, /secretMatches/);
  assert.match(executor, /semanticRuntimeRatio:1/);
  assert.match(executor, /cameraOnlyRatio:0/);
});

test("post-TTS internal failure permits one append-only idempotent recovery", () => {
  const migration = read("drizzle/0084_youtube_audience_golden_audio_recovery.sql"), runtime = read("lib/youtube-audience-golden.ts");
  assert.match(migration, /POST_TTS_INTERNAL_CONTRACT_FAILURE/);
  assert.match(migration, /tts_requests.*BETWEEN 0 AND 1/s);
  assert.match(migration, /YOUTUBE_GOLDEN_AUDIO_RECOVERY_APPEND_ONLY/);
  assert.match(runtime, /idempotency-key/);
  assert.match(runtime, /GOLDEN_AUDIO_RECOVERY_ALREADY_ATTEMPTED/);
});

test("failed independent QA creates one evidence-bound Revision 2 instead of mutating the rejected master", () => {
  const migration = read("drizzle/0085_youtube_audience_golden_revision_2.sql"), runtime = read("lib/youtube-audience-golden.ts");
  assert.match(migration, /AUDIENCE_GOLDEN_REVISION_2/);
  assert.match(migration, /visual_failure_receipt_id/);
  assert.match(migration, /audio_failure_receipt_id/);
  assert.match(migration, /YOUTUBE_GOLDEN_REVISION_IMMUTABLE/);
  assert.match(runtime, /CREATE_REPAIR_REVISION/);
  assert.match(runtime, /distinctScenePalettes: 8/);
  assert.match(runtime, /musicBed: false/);
});

test("Revision 2 visual failure creates an immutable micro-scene Revision 3", () => {
  const migration = read("drizzle/0086_youtube_audience_golden_revision_3.sql"), runtime = read("lib/youtube-audience-golden.ts"), executor = read("scripts/audience-golden-executor.mjs");
  assert.match(migration, /AUDIENCE_GOLDEN_REVISION_3/);
  assert.match(migration, /visual_failure_receipt_id/);
  assert.match(migration, /audio_pass_receipt_id/);
  assert.match(migration, /YOUTUBE_GOLDEN_REVISION_3_IMMUTABLE/);
  assert.match(runtime, /microSceneIntervalSeconds: 2\.2/);
  assert.match(runtime, /twoSidedClearingReconciliation: true/);
  assert.match(executor, /revision==="r3"\?32:8/);
  assert.match(executor, /revision==="r3"\?54:42/);
});

test("Revision 3 rejection replaces slide grammar with an asset-bound cinematic world", () => {
  const migration = read("drizzle/0087_youtube_audience_golden_revision_4.sql"), runtime = read("lib/youtube-audience-golden.ts"), executor = read("scripts/audience-golden-executor.mjs");
  assert.match(migration, /AUDIENCE_GOLDEN_REVISION_4/);
  assert.match(migration, /asset_manifest_json/);
  assert.match(migration, /YOUTUBE_GOLDEN_REVISION_4_IMMUTABLE/);
  assert.match(runtime, /CINEMATIC_ILLUSTRATED_WORLD/);
  assert.match(runtime, /continuousHeroObject: "TRANSACTION_TOKEN"/);
  assert.match(runtime, /OPENAI_IMAGEGEN_BUILTIN/);
  assert.match(executor, /continuous-hero-object/);
  assert.match(executor, /data:image\/jpeg;base64/);
});

test("Revision 4 rejection creates an immutable five-world transforming-process Revision 5", () => {
  const migration = read("drizzle/0088_youtube_audience_golden_revision_5.sql"), runtime = read("lib/youtube-audience-golden.ts"), executor = read("scripts/audience-golden-executor.mjs");
  assert.match(migration, /AUDIENCE_GOLDEN_REVISION_5/);
  assert.match(migration, /asset_manifest_json/);
  assert.match(migration, /YOUTUBE_GOLDEN_REVISION_5_IMMUTABLE/);
  assert.match(runtime, /CINEMATIC_TRANSFORMING_PROCESS/);
  assert.match(runtime, /distinctVisualWorlds: 5/);
  assert.match(runtime, /vietnameseOnlyEssentialLabels: true/);
  assert.match(runtime, /physicalNettingTransformation: true/);
  assert.match(executor, /physical-balance-reservoir/);
  assert.match(executor, /converging-record-plates/);
  assert.match(executor, /growing-merchant-coin-stack/);
  assert.match(executor, /sceneCount:r5Plus\?20/);
  assert.match(executor, /minimumCriticalFontPx1080:r8\?84:r7\?84:r5Plus\?72/);
  assert.match(executor, /\["r5","r6","r7","r8"\]\.includes\(revision\) \? "22" : "19"/);
  assert.match(executor, /chunks\.length > 128/);
});

test("Revision 5 rejection creates immutable Revision 6 with composition and arithmetic repairs", () => {
  const migration = read("drizzle/0089_youtube_audience_golden_revision_6.sql"), runtime = read("lib/youtube-audience-golden.ts"), executor = read("scripts/audience-golden-executor.mjs");
  assert.match(migration, /AUDIENCE_GOLDEN_REVISION_6/);
  assert.match(migration, /YOUTUBE_GOLDEN_REVISION_6_IMMUTABLE/);
  assert.match(runtime, /CINEMATIC_MULTI_COMPOSITION_PROCESS/);
  assert.match(runtime, /10\.00_MINUS_HOLD_EQUALS_AVAILABLE/);
  assert.match(runtime, /2\.00_PLUS_FEE_0\.05_EQUALS_2\.05/);
  assert.match(runtime, /BẢN GHI KHỚP/);
  assert.match(executor, /function svgFrameR6/);
  assert.match(executor, /phase-specific-hard-crops/);
  assert.match(runtime, /synchronizedHoldArithmetic/);
  assert.match(executor, /explicit-state-label-binding/);
});

test("Malformed Revision 6 audio QA output permits exactly one exact-hash recovery claim", () => {
  const migration = read("drizzle/0090_youtube_audience_golden_audio_qa_recovery.sql"), runtime = read("lib/youtube-audience-golden.ts"), route = read("app/api/factory/sequential-production/audience-golden/route.ts");
  assert.match(migration, /AUDIO_QA_OUTPUT_INVALID/);
  assert.match(migration, /maximum_additional_provider_requests.*= 1/);
  assert.match(migration, /ONE_EXACT_AUDIO_QA_RECOVERY_ONLY/);
  assert.match(migration, /YOUTUBE_GOLDEN_AUDIO_QA_RECOVERY_CLAIM_IMMUTABLE/);
  assert.match(runtime, /runAudienceGoldenAudioQaRecoveryAuthorized/);
  assert.match(runtime, /AUDIO_QA_RECOVERY_ALREADY_CLAIMED/);
  assert.match(route, /RUN_FACTORY_AUDIO_QA_RECOVERY/);
});

test("Revision 6 rejection creates immutable Revision 7 with transaction continuity and settlement diversity", () => {
  const migration = read("drizzle/0091_youtube_audience_golden_revision_7.sql"), runtime = read("lib/youtube-audience-golden.ts"), executor = read("scripts/audience-golden-executor.mjs");
  assert.match(migration, /AUDIENCE_GOLDEN_REVISION_7/);
  assert.match(migration, /YOUTUBE_GOLDEN_REVISION_7_IMMUTABLE/);
  assert.match(runtime, /CINEMATIC_TRANSACTION_CONTINUITY/);
  assert.match(runtime, /fixedAuthorizationHold: "2\.00"/);
  assert.match(runtime, /explicitDifferenceCause: "NETWORK_FEE_0\.05"/);
  assert.match(runtime, /maximumRepeatedBackgroundSamples: 1/);
  assert.match(executor, /function svgFrameR7/);
  assert.match(executor, /fixed-transaction-amount-continuity/);
  assert.match(executor, /labeled-record-side-comparison/);
  assert.match(executor, /multi-world-settlement-sequence/);
});

test("Revision 7 dual failure creates immutable Revision 8 with temporal truth and safer voice mastering", () => {
  const migration = read("drizzle/0092_youtube_audience_golden_revision_8.sql"), runtime = read("lib/youtube-audience-golden.ts"), executor = read("scripts/audience-golden-executor.mjs");
  assert.match(migration, /AUDIENCE_GOLDEN_REVISION_8/);
  assert.match(migration, /visual_failure_receipt_id/);
  assert.match(migration, /audio_failure_receipt_id/);
  assert.match(migration, /YOUTUBE_GOLDEN_REVISION_8_IMMUTABLE/);
  assert.match(runtime, /CINEMATIC_TEMPORAL_STATE_TRUTH/);
  assert.match(runtime, /inactiveFutureStatesMustReadPending: true/);
  assert.match(runtime, /speechSpeed: \.96/);
  assert.match(runtime, /truePeakDbtp: -3/);
  assert.match(executor, /function svgFrameR8/);
  assert.match(executor, /\["CHƯA", "KHỚP", false\]/);
  assert.match(executor, /temporal-state-truth/);
  assert.match(executor, /acompressor=threshold=-18dB:ratio=2/);
  assert.match(executor, /alimiter=limit=0\.65/);
});
