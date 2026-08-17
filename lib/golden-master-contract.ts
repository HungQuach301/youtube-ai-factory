export const GOLDEN_MASTER_CONTRACT_VERSION = "GOLDEN_MASTER_V1" as const;

export type GoldenMasterProbe = {
  durationSeconds: number;
  width: number;
  height: number;
  videoCodec: string;
  averageFrameRate: number;
  videoFrames: number;
  audioCodec: string;
  audioSampleRate: number;
  audioChannels: number;
};

export type GoldenMasterScan = {
  fullFrameScan: boolean;
  framesDecoded: number;
  blackFrameSeconds: number;
  maxFrozenFrameSeconds: number;
  decodedSemanticSamples: number;
  uniqueSemanticSampleHashes: number;
  expectedSemanticSamples: number;
  audioVideoDeltaSeconds: number;
};

export type GoldenMasterValidation = { pass: boolean; failures: string[] };

export function validateGoldenMaster(
  probe: GoldenMasterProbe,
  scan: GoldenMasterScan,
  canonicalDurationSeconds: number,
  fps = 30,
): GoldenMasterValidation {
  const failures: string[] = [], frameTolerance = 1 / fps + 0.001;
  if (probe.width !== 1920 || probe.height !== 1080) failures.push("MASTER_GEOMETRY_INVALID");
  if (Math.abs(probe.averageFrameRate - fps) > 0.01) failures.push("MASTER_FRAME_RATE_INVALID");
  if (probe.videoCodec !== "vp9") failures.push("MASTER_VIDEO_CODEC_INVALID");
  if (probe.audioCodec !== "opus" || probe.audioSampleRate !== 48000 || probe.audioChannels !== 2) failures.push("MASTER_AUDIO_PROFILE_INVALID");
  if (Math.abs(probe.durationSeconds - canonicalDurationSeconds) > frameTolerance) failures.push("MASTER_DURATION_MISMATCH");
  if (probe.videoFrames < Math.floor(canonicalDurationSeconds * fps) - 1) failures.push("MASTER_FRAME_COUNT_INCOMPLETE");
  if (!scan.fullFrameScan || scan.framesDecoded < probe.videoFrames - 1) failures.push("MASTER_FULL_FRAME_SCAN_INCOMPLETE");
  if (scan.blackFrameSeconds > 0.04) failures.push("MASTER_BLACK_FRAME_EXCESS");
  if (scan.maxFrozenFrameSeconds > 3.5) failures.push("MASTER_STATIC_HOLD_EXCESS");
  if (scan.expectedSemanticSamples < 3 || scan.decodedSemanticSamples !== scan.expectedSemanticSamples) failures.push("MASTER_SEMANTIC_SAMPLE_COVERAGE_INCOMPLETE");
  if (scan.uniqueSemanticSampleHashes !== scan.expectedSemanticSamples) failures.push("MASTER_SEMANTIC_SAMPLE_DUPLICATION");
  if (Math.abs(scan.audioVideoDeltaSeconds) > frameTolerance) failures.push("MASTER_AUDIO_VIDEO_DURATION_MISMATCH");
  return { pass: failures.length === 0, failures };
}

export function validateHumanPlayback(input: {
  canonicalDurationSeconds: number;
  metadataDurationSeconds: number;
  watchedSeconds: number;
  ended: boolean;
  metadataLoaded: boolean;
  videoWidth: number;
  videoHeight: number;
  timeProgressed: boolean;
  pauseResumePassed: boolean;
  seekPassed: boolean;
  audioTrackPresent: boolean;
  motionObserved: boolean;
  findings: string[];
}): GoldenMasterValidation {
  const failures: string[] = [];
  if (!input.metadataLoaded || Math.abs(input.metadataDurationSeconds - input.canonicalDurationSeconds) > 0.05) failures.push("PLAYBACK_METADATA_INVALID");
  if (input.videoWidth !== 1920 || input.videoHeight !== 1080) failures.push("PLAYBACK_GEOMETRY_INVALID");
  if (!input.timeProgressed || input.watchedSeconds < input.canonicalDurationSeconds - 0.5 || !input.ended) failures.push("PLAYBACK_NOT_WATCHED_END_TO_END");
  if (!input.pauseResumePassed || !input.seekPassed) failures.push("PLAYBACK_CONTROLS_FAILED");
  if (!input.audioTrackPresent) failures.push("PLAYBACK_AUDIO_MISSING");
  if (!input.motionObserved) failures.push("PLAYBACK_MOTION_NOT_OBSERVED");
  if (input.findings.length) failures.push("PLAYBACK_HUMAN_FINDINGS_OPEN");
  return { pass: failures.length === 0, failures };
}
