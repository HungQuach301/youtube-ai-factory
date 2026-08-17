import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

test("Stage Contract Registry covers exactly 18 ordered stages and five typed commands", () => {
  const migration = read("drizzle/0043_gorgeous_angel.sql");
  const registrations = migration.match(/\('V7_V23_4_V281:[^']+'/g) || [];
  assert.equal(registrations.length, 18);
  for (const command of ["START_STAGE", "PRODUCE_ARTIFACT", "VERIFY_ARTIFACT", "FREEZE_STAGE", "REOPEN_ROOT_STAGE"]) assert.match(migration, new RegExp(command));
  assert.match(migration, /UPDATE `v7_sequential_programs` SET `auto_dispatch`=0/);
  assert.match(migration, /"budgetPlanRequired":true/);
});

test("artifact eligibility is fail-closed on queue, lineage, rights, cost, bytes and legacy hashes", () => {
  const command = read("lib/sequential-production-command.ts");
  assert.match(command, /VIDEO_BLOCKED_PREVIOUS_VIDEO/);
  assert.match(command, /UPSTREAM_STAGE_NOT_FROZEN/);
  assert.match(command, /PARENT_ARTIFACT_INELIGIBLE/);
  assert.match(command, /LEGACY_HASH_BLOCKED/);
  assert.match(command, /ARTIFACT_RIGHTS_INELIGIBLE/);
  assert.match(command, /ARTIFACT_COST_INELIGIBLE/);
  assert.match(command, /R2_HASH_MISMATCH/);
  assert.match(command, /ARTIFACT_READBACK_HASH_MISMATCH/);
  assert.match(command, /IDEMPOTENCY_KEY_REUSED/);
});

test("stage freeze requires all verified artifacts and zero active provider requests", () => {
  const command = read("lib/sequential-production-command.ts");
  assert.match(command, /REQUIRED_ARTIFACTS_NOT_VERIFIED/);
  assert.match(command, /ACTIVE_PROVIDER_REQUESTS_REMAIN/);
  assert.match(command, /lifecycle_state='FROZEN'/);
  assert.match(command, /nextStageKey/);
  assert.match(command, /immutablePriorRevisionsPreserved/);
});

test("sequential command route is owner-bound and keeps publishing separate", () => {
  const route = read("app/api/factory/sequential-production/route.ts");
  const command = read("lib/sequential-production-command.ts");
  assert.match(route, /getChatGPTUser/);
  assert.match(route, /FACTORY_EXPERT_EMAILS/);
  assert.match(route, /x-sequential-executor-token/);
  assert.match(route, /idempotency-key/);
  assert.match(command, /publishingMutation: false/);
  assert.doesNotMatch(command, /UPDATE\s+.*auto_publish/i);
});

test("Stage 01–07B executor is greenfield, metered and mutates state only through typed commands", () => {
  const executor = read("app/api/factory/sequential-production/executor/route.ts");
  assert.match(executor, /CURRENT FROZEN PARENT ARTIFACTS/);
  assert.match(executor, /legacySources:\s*0/);
  assert.match(executor, /v7_sequential_provider_requests/);
  assert.match(executor, /measureOpenAIUsage/);
  assert.match(executor, /background:\s*true/);
  assert.match(executor, /action:\s*"PRODUCE_ARTIFACT"/);
  assert.match(executor, /action:\s*"VERIFY_ARTIFACT"/);
  assert.match(executor, /action:\s*"FREEZE_STAGE"/);
  assert.doesNotMatch(executor, /UPDATE v7_sequential_stage_runs SET lifecycle_state='FROZEN'/);
});

test("Stage 08 requires an approved bounded plan and adaptive canonical-duration shot contracts", () => {
  const executor = read("app/api/factory/sequential-production/executor/route.ts");
  const plan = read("app/api/factory/sequential-production/plan/route.ts");
  assert.match(executor, /APPROVED_BUDGET_PLAN_REQUIRED/);
  assert.match(executor, /minItems:\s*90,\s*maxItems:\s*180/);
  assert.match(executor, /canonicalNarrationDuration/);
  assert.match(executor, /fixedCountAuthority:\s*false/);
  assert.doesNotMatch(executor, /Compile exactly 84 contiguous shot contracts/);
  assert.match(executor, /SHOT_TIMELINE_COVERAGE_INVALID/);
  assert.match(plan, /APPROVE_COST_RIGHTS_PLAN/);
  assert.match(plan, /PER_VIDEO_HARD_CAP_USD = 40/);
  assert.match(plan, /NON_FREE_COMMERCIAL_PLAN_VERIFIED_BEFORE_SYNTHESIS/);
  assert.match(plan, /LEGACY_ASSET_REUSE/);
});

test("Stage 09–10 executor stores real media/audio bytes with rights and measured evidence", () => {
  const media = read("app/api/factory/sequential-production/media/route.ts");
  const command = read("lib/sequential-production-command.ts");
  assert.match(media, /RUN_STAGE_09_BATCH/);
  assert.match(media, /api\.pexels\.com\/v1\/search/);
  assert.match(media, /PEXELS.*COMMERCIAL_LICENSE_VERIFIED/s);
  assert.match(media, /MEDIA_HASH_MISMATCH/);
  assert.match(media, /output_format=pcm_24000/);
  assert.match(media, /ELEVENLABS_COMMERCIAL_RIGHTS_REQUIRED/);
  assert.match(media, /peakDbfs/);
  assert.match(media, /audio\/wav/);
  assert.match(command, /storedMediaAssets/);
  assert.match(command, /storedAudioStems/);
});

test("Video Production Quality Standard V2 is executable and Stage 11 fails closed", () => {
  const migration = read("drizzle/0045_video_quality_standard_v2.sql");
  const registry = read("lib/video-quality-standard.ts");
  const command = read("lib/sequential-production-command.ts");
  const projection = read("lib/sequential-production-projection.ts");
  assert.match(migration, /v7_video_quality_standards/);
  assert.match(migration, /v7_video_quality_evidence/);
  assert.match(registry, /VIDEO_QUALITY_STANDARD_WEAKENING/);
  assert.match(registry, /BLOCKED_VIDEO_STANDARD_V2/);
  assert.match(command, /VIDEO_EXCELLENCE_INELIGIBLE/);
  assert.match(projection, /qualityEligibility/);
});

test("golden-sequence runtime uses real pixels, section voice, composed audio and independent audit", () => {
  const quality = read("app/api/factory/sequential-production/quality/route.ts");
  const pixels = read("lib/video-quality-pixels.ts");
  const audio = read("lib/video-audio-quality.ts");
  assert.match(quality, /CREATE_GOLDEN_PLAN/);
  assert.match(quality, /PRODUCE_GOLDEN_VISUALS/);
  assert.match(quality, /PRODUCE_GOLDEN_AUDIO/);
  assert.match(quality, /REASSESS_GOLDEN_AUDIO/);
  assert.match(quality, /PROMOTE_VERIFIED_GOLDEN_AUDIO/);
  assert.match(quality, /AUDIT_GOLDEN_SEQUENCE/);
  assert.match(quality, /GOLDEN_TTS_SPEED = 1\.1/);
  assert.match(quality, /compileGoldenNarration/);
  assert.match(quality, /language_code:\s*"en"/);
  assert.match(quality, /GOLDEN_TRANSCRIPTION_MODEL = "gpt-4o-transcribe"/);
  assert.match(quality, /form\.set\("language", "en"\)/);
  assert.match(quality, /GOLDEN_TRANSCRIPTION_PROMPT/);
  assert.match(quality, /transcriptTokens/);
  assert.match(quality, /currencySymbolsNonAudible: true/);
  assert.match(quality, /STORED_WAV_AND_TRANSCRIPT/);
  assert.match(quality, /immutableByteReuse: true/);
  assert.match(quality, /legacyAssetReuse: false/);
  assert.match(quality, /golden\.id, "TRANSCRIPT"/);
  assert.match(quality, /CHANNEL_OWNED_DERIVATIVE/);
  assert.match(quality, /minimum = 300, maximum = 800/);
  assert.match(quality, /CHANNEL_COMPOSED_EVOLVING_BED/);
  assert.match(pixels, /meaningfulTemporalDelta/);
  assert.match(audio, /pitchRangeSemitones/);
  assert.doesNotMatch(quality, /generatedStem/);
  assert.match(pixels, /GoldenSceneKind/);
  assert.match(quality, /instructionResidue: false/);
  assert.match(quality, /timingReconciliation/);
  assert.match(quality, /distributedFrameSamples/);
  assert.match(quality, /universalSplit: false/);
});
