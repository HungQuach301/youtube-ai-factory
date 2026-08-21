export const GOLDEN_MASTER_CONTRACT_VERSION = "GOLDEN_MASTER_V1" as const;
export const BROWSER_ASSURANCE_GATE_VERSION = "BROWSER_ASSURANCE_GATE_V1" as const;

export type BrowserAssuranceEvent = {
  type: "LOADED_METADATA" | "PLAY" | "PAUSE" | "SEEKED" | "ENDED";
  mediaTimeSeconds: number;
  monotonicMilliseconds: number;
};

export type BrowserAssuranceEvidence = {
  gateVersion: typeof BROWSER_ASSURANCE_GATE_VERSION;
  sessionId: string;
  masterSha256: string;
  canonicalDurationSeconds: number;
  metadataDurationSeconds: number;
  watchedSeconds: number;
  continuousCoverageRatio: number;
  ended: boolean;
  metadataLoaded: boolean;
  videoWidth: number;
  videoHeight: number;
  timeProgressed: boolean;
  pauseResumePassed: boolean;
  seekPassed: boolean;
  audioTrackPresent: boolean;
  motionObserved: boolean;
  focusTraversalPassed: boolean;
  zoomReflowPassed: boolean;
  consoleErrorCount: number;
  hiddenDuringPlaybackCount: number;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  userAgent: string;
  events: BrowserAssuranceEvent[];
  findings: string[];
};

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
  motionProvenance: {
    rendererMode: "FLAT_FRAME_CAMERA_MOTION" | "LAYERED_SEMANTIC_MOTION" | "SOURCE_VIDEO_COMPOSITE";
    segmentCount: number;
    cameraOnlySegmentCount: number;
    semanticAnimationSegmentCount: number;
    sourceVideoSegmentCount: number;
    visualTreatmentCount: number;
  };
};

export type GoldenMasterValidation = { pass: boolean; failures: string[] };

export function allocateGoldenMasterFrames(durationsSeconds: number[], canonicalDurationSeconds: number, fps = 30) {
  const targetFrames = Math.round(canonicalDurationSeconds * fps), counts: number[] = []; let sourceCursor = 0, assigned = 0;
  for (const [index, duration] of durationsSeconds.entries()) {
    if (!Number.isFinite(duration) || duration <= 0) throw new Error(`Invalid render duration at segment ${index + 1}`);
    sourceCursor += duration;
    const boundary = index === durationsSeconds.length - 1 ? targetFrames : Math.round(sourceCursor * fps), count = boundary - assigned;
    if (count < 1) throw new Error(`Render segment ${index + 1} has no frames`);
    counts.push(count); assigned = boundary;
  }
  if (!counts.length || assigned !== targetFrames) throw new Error(`Frame allocation mismatch · ${assigned}/${targetFrames}`);
  return { counts, targetFrames };
}

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
  const motion = scan.motionProvenance;
  if (!motion || motion.segmentCount < 1) failures.push("MASTER_MOTION_PROVENANCE_MISSING");
  else {
    if (motion.cameraOnlySegmentCount / motion.segmentCount > 0.35) failures.push("MASTER_CAMERA_ONLY_SLIDESHOW");
    if (motion.semanticAnimationSegmentCount / motion.segmentCount < 0.45) failures.push("MASTER_SEMANTIC_MOTION_COVERAGE_LOW");
    if (motion.sourceVideoSegmentCount / motion.segmentCount < 0.2) failures.push("MASTER_SOURCE_VIDEO_COVERAGE_LOW");
    if (motion.visualTreatmentCount < 3) failures.push("MASTER_VISUAL_TREATMENT_DIVERSITY_LOW");
  }
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

export function validateBrowserAssurance(input: BrowserAssuranceEvidence): GoldenMasterValidation {
  const failures = [...validateHumanPlayback(input).failures];
  if (input.gateVersion !== BROWSER_ASSURANCE_GATE_VERSION) failures.push("BROWSER_GATE_VERSION_INVALID");
  if (!/^[A-Za-z0-9._:-]{16,200}$/.test(input.sessionId)) failures.push("BROWSER_SESSION_INVALID");
  if (!/^[a-f0-9]{64}$/.test(input.masterSha256)) failures.push("BROWSER_MASTER_HASH_INVALID");
  if (input.continuousCoverageRatio < 0.98) failures.push("BROWSER_CONTINUOUS_COVERAGE_INCOMPLETE");
  if (!input.focusTraversalPassed) failures.push("BROWSER_KEYBOARD_FOCUS_FAILED");
  if (!input.zoomReflowPassed) failures.push("BROWSER_ZOOM_REFLOW_FAILED");
  if (input.consoleErrorCount !== 0) failures.push("BROWSER_CONSOLE_ERRORS_OPEN");
  if (input.hiddenDuringPlaybackCount !== 0) failures.push("BROWSER_PLAYBACK_NOT_VISIBLE");
  if (input.viewportWidth < 320 || input.viewportHeight < 480 || input.devicePixelRatio <= 0) failures.push("BROWSER_VIEWPORT_EVIDENCE_INVALID");
  if (input.userAgent.trim().length < 8) failures.push("BROWSER_USER_AGENT_MISSING");

  let previous = -1;
  for (const event of input.events) {
    if (!Number.isFinite(event.mediaTimeSeconds) || !Number.isFinite(event.monotonicMilliseconds) || event.monotonicMilliseconds < previous) {
      failures.push("BROWSER_EVENT_SEQUENCE_INVALID");
      break;
    }
    previous = event.monotonicMilliseconds;
  }
  const types = input.events.map((event) => event.type);
  const metadataIndex = types.indexOf("LOADED_METADATA"), firstPlay = types.indexOf("PLAY"), pause = types.indexOf("PAUSE"), seeked = types.indexOf("SEEKED"), ended = types.lastIndexOf("ENDED");
  const resumed = pause >= 0 ? types.indexOf("PLAY", pause + 1) : -1;
  if (metadataIndex < 0 || firstPlay <= metadataIndex || pause <= firstPlay || resumed <= pause || seeked <= firstPlay || ended <= Math.max(resumed, seeked)) failures.push("BROWSER_REQUIRED_INTERACTIONS_MISSING");
  return { pass: failures.length === 0, failures: [...new Set(failures)] };
}
