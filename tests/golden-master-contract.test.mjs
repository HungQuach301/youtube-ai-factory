import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { allocateGoldenMasterFrames, validateGoldenMaster, validateHumanPlayback } from "../lib/golden-master-contract.ts";

test("cumulative frame allocation preserves the exact canonical frame total", () => {
  const result = allocateGoldenMasterFrames(Array.from({ length: 33 }, () => 80.24458333333334 / 33), 80.24458333333334, 30);
  assert.equal(result.counts.length, 33);
  assert.equal(result.counts.reduce((sum, count) => sum + count, 0), 2407);
  assert.ok(result.counts.every((count) => count > 0));
});

const validProbe = { durationSeconds: 80.245, width: 1920, height: 1080, videoCodec: "vp9", averageFrameRate: 30, videoFrames: 2408, audioCodec: "opus", audioSampleRate: 48000, audioChannels: 2 };
const validScan = { fullFrameScan: true, framesDecoded: 2408, blackFrameSeconds: 0, maxFrozenFrameSeconds: 0.4, decodedSemanticSamples: 33, uniqueSemanticSampleHashes: 33, expectedSemanticSamples: 33, audioVideoDeltaSeconds: 0.01, motionProvenance: { rendererMode: "LAYERED_SEMANTIC_MOTION", segmentCount: 33, cameraOnlySegmentCount: 8, semanticAnimationSegmentCount: 20, sourceVideoSegmentCount: 7, visualTreatmentCount: 4 } };

test("golden master gate accepts only a complete encoded and decoded master", () => {
  assert.deepEqual(validateGoldenMaster(validProbe, validScan, 80.245), { pass: true, failures: [] });
  const missingMotion = validateGoldenMaster(validProbe, { ...validScan, maxFrozenFrameSeconds: 80, uniqueSemanticSampleHashes: 1 }, 80.245);
  assert.equal(missingMotion.pass, false);
  assert.ok(missingMotion.failures.includes("MASTER_STATIC_HOLD_EXCESS"));
  assert.ok(missingMotion.failures.includes("MASTER_SEMANTIC_SAMPLE_DUPLICATION"));
});

test("camera movement over static PNGs cannot masquerade as audience motion", () => {
  const slideshow = validateGoldenMaster(validProbe, { ...validScan, motionProvenance: { rendererMode: "FLAT_FRAME_CAMERA_MOTION", segmentCount: 33, cameraOnlySegmentCount: 33, semanticAnimationSegmentCount: 0, sourceVideoSegmentCount: 0, visualTreatmentCount: 1 } }, 80.245);
  assert.equal(slideshow.pass, false);
  for (const failure of ["MASTER_CAMERA_ONLY_SLIDESHOW", "MASTER_SEMANTIC_MOTION_COVERAGE_LOW", "MASTER_SOURCE_VIDEO_COVERAGE_LOW", "MASTER_VISUAL_TREATMENT_DIVERSITY_LOW"]) assert.ok(slideshow.failures.includes(failure));
});

test("human playback cannot pass from metadata or samples alone", () => {
  const result = validateHumanPlayback({ canonicalDurationSeconds: 80.245, metadataDurationSeconds: 80.245, watchedSeconds: 0, ended: false, metadataLoaded: true, videoWidth: 1920, videoHeight: 1080, timeProgressed: false, pauseResumePassed: false, seekPassed: false, audioTrackPresent: true, motionObserved: false, findings: [] });
  assert.equal(result.pass, false);
  assert.ok(result.failures.includes("PLAYBACK_NOT_WATCHED_END_TO_END"));
  assert.ok(result.failures.includes("PLAYBACK_MOTION_NOT_OBSERVED"));
});

test("production UI and audit are master-video-first", () => {
  const workspace = readFileSync(new URL("../app/video-engine/production-engine-workspace.tsx", import.meta.url), "utf8"), route = readFileSync(new URL("../app/api/factory/sequential-production/quality/route.ts", import.meta.url), "utf8");
  assert.match(workspace, /GoldenMasterPlayer/);
  assert.doesNotMatch(workspace, /goldenPosterUrl|goldenMixUrl/);
  assert.match(route, /GOLDEN_MASTER_VIDEO/);
  assert.match(route, /MASTER_QA_CONTACT_SHEET/);
  assert.match(route, /AUDIT_PASS_PLAYBACK_REQUIRED/);
  assert.match(route, /\["AUDIO_READY","MASTER_REQUIRED","MASTER_RENDERING"/);
  assert.match(route, /SUBMIT_GOLDEN_HUMAN_PLAYBACK/);
  assert.match(route, /AUDIT_GOLDEN_AUDIO_PERCEPTUAL/);
  assert.match(route, /requestedAction === "AUDIT_GOLDEN_AUDIO_PERCEPTUAL"/);
  assert.match(route, /x-perceptual-qa-executor-token/);
  assert.match(route, /content-range/);
  assert.match(readFileSync(new URL("../scripts/golden-master-executor.ts", import.meta.url), "utf8"), /FLAT_FRAME_CAMERA_MOTION/);
});

test("migration revokes the camera-only golden playback conclusion", () => {
  const migration = readFileSync(new URL("../drizzle/0047_perceptual_playback_truth.sql", import.meta.url), "utf8");
  assert.match(migration, /CAMERA_ONLY_SLIDESHOW/);
  assert.match(migration, /REPAIR_REQUIRED/);
  assert.match(migration, /semantic motion >=45%/);
});

test("critical visual qualifications are governed by a reusable mobile-safe contract", () => {
  const pixels = readFileSync(new URL("../lib/video-quality-pixels.ts", import.meta.url), "utf8");
  assert.match(pixels, /FOLLOW_FEE_PROGRAM_V5_MOBILE_SAFE/);
  assert.match(pixels, /minimumQualifierFontPx:\s*22/);
  assert.match(pixels, /minimumCriticalLabelFontPx:\s*18/);
  assert.match(pixels, /minimumInactiveOpacity:\s*\.78/);
  assert.match(pixels, /qualificationRibbon/);
  assert.doesNotMatch(pixels, /opacity:\s*reveal\s*>=\s*3\s*\?\s*1\s*:\s*\.34/);
});
