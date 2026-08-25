export const FACTORY_RUNTIME_CONTRACT_VERSION = "FACTORY_RUNTIME_CONTRACT_V1" as const;
export const CANONICAL_TIMEBASE_ROUNDING_POLICY = "HALF_AWAY_FROM_ZERO_V1" as const;

export const FACTORY_RUNTIME_COMMAND_TYPES = [
  "START_STAGE",
  "PRODUCE_ARTIFACT",
  "VERIFY_ARTIFACT",
  "FREEZE_STAGE",
  "REOPEN_ROOT_STAGE",
] as const;

export const FACTORY_RUNTIME_EVENT_TYPES = [
  "CommandAccepted",
  "CommandRejected",
  "WorkReserved",
  "ProviderDispatched",
  "ProviderReconciled",
  "ArtifactMaterialized",
  "ArtifactVerified",
  "StageFrozen",
  "DependencyStale",
  "AssuranceStarted",
  "FindingRecorded",
  "VerdictRecorded",
  "ExceptionRouted",
  "ReleaseReady",
  "Published",
  "PerformanceObserved",
  "LearningCandidateCreated",
  "VersionPromoted",
  "VersionRevoked",
  "VersionRolledBack",
] as const;

export type FactoryRuntimeEventType = typeof FACTORY_RUNTIME_EVENT_TYPES[number];
export type FactoryRuntimeCommandType = typeof FACTORY_RUNTIME_COMMAND_TYPES[number];

export type CanonicalTimebase = {
  frameRateNumerator: number;
  frameRateDenominator: number;
  audioSampleRateHz: number;
  totalFrames: number;
  totalAudioSamples: number;
  roundingPolicy: typeof CANONICAL_TIMEBASE_ROUNDING_POLICY;
};

const positiveSafeInteger = (value: number, label: string) => {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${label}_MUST_BE_POSITIVE_SAFE_INTEGER`);
  return BigInt(value);
};

const greatestCommonDivisor = (left: bigint, right: bigint): bigint => right === 0n ? left : greatestCommonDivisor(right, left % right);

function roundedRatio(numerator: bigint, denominator: bigint) {
  if (denominator <= 0n) throw new Error("RATIO_DENOMINATOR_MUST_BE_POSITIVE");
  const sign = numerator < 0n ? -1n : 1n;
  const absolute = numerator < 0n ? -numerator : numerator;
  const quotient = absolute / denominator;
  const remainder = absolute % denominator;
  const rounded = remainder * 2n >= denominator ? quotient + 1n : quotient;
  return sign * rounded;
}

const safeNumber = (value: bigint, label: string) => {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new Error(`${label}_EXCEEDS_SAFE_INTEGER`);
  return number;
};

export function createCanonicalTimebase(input: Omit<CanonicalTimebase, "totalAudioSamples" | "roundingPolicy">): CanonicalTimebase {
  const suppliedNumerator = positiveSafeInteger(input.frameRateNumerator, "FRAME_RATE_NUMERATOR");
  const suppliedDenominator = positiveSafeInteger(input.frameRateDenominator, "FRAME_RATE_DENOMINATOR");
  const divisor = greatestCommonDivisor(suppliedNumerator, suppliedDenominator);
  const frameRateNumerator = suppliedNumerator / divisor;
  const frameRateDenominator = suppliedDenominator / divisor;
  const audioSampleRateHz = positiveSafeInteger(input.audioSampleRateHz, "AUDIO_SAMPLE_RATE_HZ");
  const totalFrames = positiveSafeInteger(input.totalFrames, "TOTAL_FRAMES");
  const totalAudioSamples = roundedRatio(totalFrames * audioSampleRateHz * frameRateDenominator, frameRateNumerator);
  return {
    ...input,
    frameRateNumerator: safeNumber(frameRateNumerator, "FRAME_RATE_NUMERATOR"),
    frameRateDenominator: safeNumber(frameRateDenominator, "FRAME_RATE_DENOMINATOR"),
    totalAudioSamples: safeNumber(totalAudioSamples, "TOTAL_AUDIO_SAMPLES"),
    roundingPolicy: CANONICAL_TIMEBASE_ROUNDING_POLICY,
  };
}

export function frameToSample(frame: number, timebase: CanonicalTimebase) {
  if (!Number.isSafeInteger(frame) || frame < 0 || frame > timebase.totalFrames) throw new Error("FRAME_OUT_OF_RANGE");
  const numerator = BigInt(frame) * positiveSafeInteger(timebase.audioSampleRateHz, "AUDIO_SAMPLE_RATE_HZ") * positiveSafeInteger(timebase.frameRateDenominator, "FRAME_RATE_DENOMINATOR");
  const sample = roundedRatio(numerator, positiveSafeInteger(timebase.frameRateNumerator, "FRAME_RATE_NUMERATOR"));
  return safeNumber(sample, "AUDIO_SAMPLE");
}

export function sampleToFrame(sample: number, timebase: CanonicalTimebase) {
  if (!Number.isSafeInteger(sample) || sample < 0 || sample > timebase.totalAudioSamples) throw new Error("SAMPLE_OUT_OF_RANGE");
  const numerator = BigInt(sample) * positiveSafeInteger(timebase.frameRateNumerator, "FRAME_RATE_NUMERATOR");
  const denominator = positiveSafeInteger(timebase.audioSampleRateHz, "AUDIO_SAMPLE_RATE_HZ") * positiveSafeInteger(timebase.frameRateDenominator, "FRAME_RATE_DENOMINATOR");
  return safeNumber(roundedRatio(numerator, denominator), "FRAME");
}

export function validateCanonicalTimebase(timebase: CanonicalTimebase) {
  if (timebase.roundingPolicy !== CANONICAL_TIMEBASE_ROUNDING_POLICY) return { valid: false as const, reasons: ["ROUNDING_POLICY_UNSUPPORTED"] };
  try {
    const expected = createCanonicalTimebase(timebase);
    const deltaSamples = Math.abs(expected.totalAudioSamples - timebase.totalAudioSamples);
    return { valid: deltaSamples <= 1, reasons: deltaSamples <= 1 ? [] : ["DURATION_SAMPLE_MISMATCH"], deltaSamples };
  } catch (error) {
    return { valid: false as const, reasons: [error instanceof Error ? error.message : "TIMEBASE_INVALID"], deltaSamples: Number.POSITIVE_INFINITY };
  }
}

export type ShotFrameRange = { id: string; sequence: number; startFrame: number; endFrameExclusive: number };

export function validateShotCoverage(shots: ShotFrameRange[], totalFrames: number) {
  if (!Number.isSafeInteger(totalFrames) || totalFrames <= 0) throw new Error("TOTAL_FRAMES_MUST_BE_POSITIVE_SAFE_INTEGER");
  const ordered = [...shots].sort((left, right) => left.sequence - right.sequence || left.startFrame - right.startFrame || left.id.localeCompare(right.id));
  const reasons: string[] = [];
  let cursor = 0;
  for (let index = 0; index < ordered.length; index += 1) {
    const shot = ordered[index];
    if (!Number.isSafeInteger(shot.sequence) || shot.sequence !== index + 1) reasons.push(`SHOT_SEQUENCE_INVALID:${shot.id}`);
    if (!Number.isSafeInteger(shot.startFrame) || !Number.isSafeInteger(shot.endFrameExclusive) || shot.startFrame < 0 || shot.endFrameExclusive <= shot.startFrame) {
      reasons.push(`SHOT_RANGE_INVALID:${shot.id}`);
      continue;
    }
    if (shot.startFrame > cursor) reasons.push(`SHOT_GAP:${cursor}-${shot.startFrame}`);
    if (shot.startFrame < cursor) reasons.push(`SHOT_OVERLAP:${shot.startFrame}-${cursor}`);
    cursor = Math.max(cursor, shot.endFrameExclusive);
  }
  if (cursor < totalFrames) reasons.push(`SHOT_GAP:${cursor}-${totalFrames}`);
  if (cursor > totalFrames) reasons.push(`SHOT_RANGE_EXCEEDS_TIMEBASE:${cursor}-${totalFrames}`);
  if (!ordered.length) reasons.push("SHOT_CONTRACTS_REQUIRED");
  return { valid: reasons.length === 0, reasons, ordered };
}

export type DependencyBinding = { id: string; upstreamArtifactVersionId: string; downstreamArtifactVersionId: string };

export function resolveStaleDependencies(bindings: DependencyBinding[], changedArtifactVersionIds: string[]) {
  const queue = [...new Set(changedArtifactVersionIds)].sort();
  const staleArtifacts = new Set(queue);
  const staleBindings = new Set<string>();
  while (queue.length) {
    const upstream = queue.shift()!;
    for (const binding of bindings) {
      if (binding.upstreamArtifactVersionId !== upstream || staleBindings.has(binding.id)) continue;
      staleBindings.add(binding.id);
      if (!staleArtifacts.has(binding.downstreamArtifactVersionId)) {
        staleArtifacts.add(binding.downstreamArtifactVersionId);
        queue.push(binding.downstreamArtifactVersionId);
        queue.sort();
      }
    }
  }
  return {
    staleBindingIds: [...staleBindings].sort(),
    staleArtifactVersionIds: [...staleArtifacts].filter((id) => !changedArtifactVersionIds.includes(id)).sort(),
  };
}

export function assertFactoryRuntimeEvent(input: {
  eventType: string;
  streamVersion: number;
  idempotencyKey: string;
  intentHash: string;
  evidenceHash: string;
  fencingToken?: number | null;
}) {
  const reasons: string[] = [];
  if (!FACTORY_RUNTIME_EVENT_TYPES.includes(input.eventType as FactoryRuntimeEventType)) reasons.push("EVENT_TYPE_UNSUPPORTED");
  if (!Number.isSafeInteger(input.streamVersion) || input.streamVersion <= 0) reasons.push("STREAM_VERSION_INVALID");
  if (!/^[A-Za-z0-9._:-]{16,200}$/.test(input.idempotencyKey)) reasons.push("IDEMPOTENCY_KEY_INVALID");
  if (!/^[a-f0-9]{64}$/.test(input.intentHash)) reasons.push("INTENT_HASH_INVALID");
  if (!/^[a-f0-9]{64}$/.test(input.evidenceHash)) reasons.push("EVIDENCE_HASH_INVALID");
  if (input.fencingToken !== undefined && input.fencingToken !== null && (!Number.isSafeInteger(input.fencingToken) || input.fencingToken <= 0)) reasons.push("FENCING_TOKEN_INVALID");
  return { valid: reasons.length === 0, reasons };
}

export function assertFactoryRuntimeCommand(input: {
  commandType: string;
  expectedState: string;
  expectedVersion: number;
  actorType: string;
  actorId: string;
  leaseId: string;
  fencingToken: number;
  idempotencyKey: string;
  intentHash: string;
  policyVersions: Record<string, string>;
  costScope: Record<string, unknown>;
  rightsScope: Record<string, unknown>;
}) {
  const reasons: string[] = [];
  if (!FACTORY_RUNTIME_COMMAND_TYPES.includes(input.commandType as FactoryRuntimeCommandType)) reasons.push("COMMAND_TYPE_UNSUPPORTED");
  if (!/^[A-Z][A-Z0-9_]{1,127}$/.test(input.expectedState)) reasons.push("EXPECTED_STATE_INVALID");
  if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 0) reasons.push("EXPECTED_VERSION_INVALID");
  if (!new Set(["OWNER", "OPERATOR", "SYSTEM", "ASSURANCE"]).has(input.actorType)) reasons.push("ACTOR_TYPE_INVALID");
  if (!/^[A-Za-z0-9._:@/-]{3,200}$/.test(input.actorId)) reasons.push("ACTOR_ID_INVALID");
  if (!/^[A-Za-z0-9._:-]{8,200}$/.test(input.leaseId)) reasons.push("LEASE_ID_INVALID");
  if (!Number.isSafeInteger(input.fencingToken) || input.fencingToken <= 0) reasons.push("FENCING_TOKEN_INVALID");
  if (!/^[A-Za-z0-9._:-]{16,200}$/.test(input.idempotencyKey)) reasons.push("IDEMPOTENCY_KEY_INVALID");
  if (!/^[a-f0-9]{64}$/.test(input.intentHash)) reasons.push("INTENT_HASH_INVALID");
  const policyEntries = Object.entries(input.policyVersions || {});
  if (!policyEntries.length || policyEntries.some(([key, version]) => !/^[A-Za-z0-9._:/-]{1,128}$/.test(key) || !/^[A-Za-z0-9._:+/-]{1,128}$/.test(version))) reasons.push("POLICY_VERSIONS_INVALID");
  if (!input.costScope || typeof input.costScope !== "object" || Array.isArray(input.costScope) || !Object.keys(input.costScope).length) reasons.push("COST_SCOPE_INVALID");
  if (!input.rightsScope || typeof input.rightsScope !== "object" || Array.isArray(input.rightsScope) || !Object.keys(input.rightsScope).length) reasons.push("RIGHTS_SCOPE_INVALID");
  return { valid: reasons.length === 0, reasons };
}

export type ReplayableFactoryRuntimeEvent = {
  id: string;
  streamType: string;
  streamId: string;
  streamVersion: number;
  eventType: FactoryRuntimeEventType;
  idempotencyKey: string;
  intentHash: string;
  evidenceHash: string;
  fencingToken?: number | null;
};

export function replayFactoryRuntimeEvents(events: ReplayableFactoryRuntimeEvent[]) {
  if (!events.length) return { state: "EMPTY", streamVersion: 0, eventCount: 0, headEventId: null, headEvidenceHash: null };
  const ordered = [...events].sort((left, right) => left.streamVersion - right.streamVersion || left.id.localeCompare(right.id));
  const streamType = ordered[0].streamType;
  const streamId = ordered[0].streamId;
  let expectedVersion = 1;
  const eventIds = new Set<string>();
  for (const event of ordered) {
    if (eventIds.has(event.id)) throw new Error("RUNTIME_EVENT_ID_DUPLICATE");
    eventIds.add(event.id);
    if (event.streamType !== streamType || event.streamId !== streamId) throw new Error("RUNTIME_EVENT_STREAM_MISMATCH");
    if (event.streamVersion !== expectedVersion) throw new Error(`RUNTIME_EVENT_VERSION_GAP:${expectedVersion}-${event.streamVersion}`);
    const contract = assertFactoryRuntimeEvent(event);
    if (!contract.valid) throw new Error(`RUNTIME_EVENT_CONTRACT_INVALID:${contract.reasons.join(",")}`);
    expectedVersion += 1;
  }
  const head = ordered.at(-1)!;
  return { state: head.eventType, streamVersion: head.streamVersion, eventCount: ordered.length, headEventId: head.id, headEvidenceHash: head.evidenceHash };
}
