import { canonicalHash, canonicalStringify, sha256Hex } from "@/lib/canonical-json";
import {
  FACTORY_SCENE_RENDER_TAPE_MIME,
  type FactoryRenderBucket,
} from "@/lib/factory-scene-graph-renderer";
import {
  FactoryRuntimeError,
  submitFactoryRuntimeCommandWithEffects,
  type FactoryRuntimeCommandInput,
  type FactoryRuntimeDB,
  type FactoryRuntimeExecution,
} from "@/lib/factory-runtime-writer";

export const FACTORY_PIXEL_VIDEO_COMPOSITOR_VERSION = "FACTORY_PIXEL_VIDEO_COMPOSITOR_V1" as const;
export const FACTORY_INTEGRATED_CANARY_CONTRACT_VERSION = "FACTORY_INTEGRATED_CANARY_60_90_V1" as const;
export const FACTORY_PIXEL_VIDEO_MIME = "video/webm" as const;
export const FACTORY_PIXEL_VIDEO_CODEC = "vp9" as const;

type Row = Record<string, unknown>;
type TapeOperation = { route?: string; assetArtifactVersionIds?: string[] };
type TapeFrame = { frame?: number; operations?: TapeOperation[] };
type RenderTape = {
  contractVersion?: string;
  videoId?: string;
  canonicalTimebaseId?: string;
  canvas?: { width?: number; height?: number };
  frameRange?: { startFrame?: number; endFrameExclusive?: number };
  frames?: TapeFrame[];
};

export type FactoryPixelVideoEnv = { DB: FactoryRuntimeDB; BUCKET: FactoryRenderBucket };

export type FactoryAssetEligibilityInput = {
  videoId: string;
  artifactVersionId: string;
  rightsReceiptId: string;
  sourceAssetId: string;
  modificationState: "ALLOWED" | "NOT_APPLICABLE";
  territoryScope: string;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
  idempotencyKey: string;
  evidenceHash: string;
};

export type FactoryPixelSampleEvidence = {
  role: "ENTRY" | "MIDPOINT" | "EXIT";
  storageKey: string;
  sha256: string;
  byteSize: number;
  timestampMs: number;
  width: number;
  height: number;
};

export type FactoryIntegratedCanaryInput = {
  videoId: string;
  renderTapeArtifactVersionId: string;
  compositorBindingId: string;
  frameStart: number;
  frameEndExclusive: number;
  outputStorageKey: string;
  expectedOutputHash: string;
  expectedByteSize: number;
  deterministicReplayHash: string;
  probe: {
    mimeType: "video/webm";
    codec: "vp9";
    width: number;
    height: number;
    frameRateNumerator: number;
    frameRateDenominator: number;
    frameCount: number;
    durationMs: number;
  };
  samples: FactoryPixelSampleEvidence[];
  idempotencyKey: string;
  evidenceHash: string;
};

export type FactoryIntegratedCanaryPlan = {
  outcome: "READY" | "BLOCKED";
  reasons: string[];
  inputHash: string;
  compositionProgramHash: string | null;
  dependencySnapshotHash: string | null;
  renderTapeHash: string | null;
  outputHash: string | null;
  assetReceiptIds: string[];
  upstreamArtifactVersionIds: string[];
  outputBytes: Uint8Array | null;
  sampleEvidence: FactoryPixelSampleEvidence[];
  compositor: Row | null;
  providerRequests: 0;
  spendMicros: 0;
};

const clean = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);
const hashPattern = /^[a-f0-9]{64}$/;
const identityPattern = /^[A-Za-z0-9._:@/-]{3,240}$/;
const idempotencyPattern = /^[A-Za-z0-9._:-]{16,240}$/;

async function first(db: FactoryRuntimeDB, query: string, ...values: unknown[]) {
  return db.prepare(query).bind(...values).first<Row>();
}

function deterministicId(prefix: string, hash: string) {
  return `${prefix}-${hash.slice(0, 24)}`;
}

function parseObject<T extends Record<string, unknown>>(value: unknown): T {
  try {
    const parsed = JSON.parse(clean(value));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as T : {} as T;
  } catch {
    return {} as T;
  }
}

function assetIdsFromTape(tape: RenderTape, frameStart: number, frameEndExclusive: number) {
  const ids = new Set<string>();
  const reasons: string[] = [];
  for (const frame of Array.isArray(tape.frames) ? tape.frames : []) {
    const index = number(frame.frame);
    if (index < frameStart || index >= frameEndExclusive) continue;
    for (const operation of Array.isArray(frame.operations) ? frame.operations : []) {
      const route = clean(operation.route);
      const operationIds = Array.isArray(operation.assetArtifactVersionIds) ? operation.assetArtifactVersionIds.map(clean).filter(Boolean) : [];
      if ((route === "SOURCE" || route === "HYBRID") && !operationIds.length) reasons.push(`QUALIFIED_ASSET_REQUIRED_AT_FRAME:${index}`);
      for (const id of operationIds) ids.add(id);
    }
  }
  return { ids: [...ids].sort(), reasons };
}

async function readExact(bucket: FactoryRenderBucket, storageKey: string, expectedHash: string, expectedSize: number, missingCode: string, mismatchCode: string) {
  const object = await bucket.get(storageKey);
  if (!object) throw new FactoryRuntimeError(missingCode, 503, `Required active-storage bytes are missing: ${storageKey}`);
  const bytes = new Uint8Array(await object.arrayBuffer());
  const hash = await sha256Hex(bytes);
  if (hash !== expectedHash || bytes.byteLength !== expectedSize) throw new FactoryRuntimeError(mismatchCode, 503, `Active-storage bytes do not match their exact receipt: ${storageKey}`);
  return { bytes, hash };
}

async function assertFencePreflight(db: FactoryRuntimeDB, command: FactoryRuntimeCommandInput, evaluatedAt: string) {
  const [stream, lease] = await Promise.all([
    first(db, "SELECT * FROM factory_runtime_streams WHERE stream_type=? AND stream_id=?", command.streamType, command.streamId),
    first(db, "SELECT * FROM factory_runtime_leases WHERE id=? AND stream_type=? AND stream_id=?", command.leaseId, command.streamType, command.streamId),
  ]);
  const reasons: string[] = [];
  if (!stream) reasons.push("RUNTIME_STREAM_NOT_FOUND");
  if (!lease) reasons.push("LEASE_NOT_FOUND");
  if (stream && (number(stream.current_version) !== command.expectedVersion || clean(stream.current_state) !== command.expectedState)) reasons.push("EXPECTED_STREAM_STATE_OR_VERSION_MISMATCH");
  if (stream && (clean(stream.active_lease_id) !== command.leaseId || number(stream.active_fencing_token) !== command.fencingToken)) reasons.push("STREAM_FENCING_MISMATCH");
  if (lease && (clean(lease.lifecycle_state) !== "ACTIVE" || number(lease.fencing_token) !== command.fencingToken || clean(lease.expires_at) <= evaluatedAt)) reasons.push("LEASE_STALE_OR_EXPIRED");
  if (reasons.length) throw new FactoryRuntimeError("PIXEL_COMPOSITOR_FENCE_PRECHECK_FAILED", 409, "The compositor lease or fence is stale", reasons);
}

function validateAssetInput(input: FactoryAssetEligibilityInput) {
  const reasons: string[] = [];
  for (const [label, value] of [["VIDEO_ID", input.videoId], ["ARTIFACT_VERSION_ID", input.artifactVersionId], ["RIGHTS_RECEIPT_ID", input.rightsReceiptId], ["SOURCE_ASSET_ID", input.sourceAssetId]] as const) {
    if (!identityPattern.test(clean(value))) reasons.push(`${label}_INVALID`);
  }
  if (!idempotencyPattern.test(clean(input.idempotencyKey))) reasons.push("IDEMPOTENCY_KEY_INVALID");
  if (!hashPattern.test(clean(input.evidenceHash))) reasons.push("EVIDENCE_HASH_INVALID");
  if (!new Set(["ALLOWED", "NOT_APPLICABLE"]).has(clean(input.modificationState))) reasons.push("MODIFICATION_STATE_INVALID");
  if (!clean(input.territoryScope)) reasons.push("TERRITORY_SCOPE_REQUIRED");
  for (const [label, value] of [["WIDTH", input.width], ["HEIGHT", input.height], ["DURATION_MS", input.durationMs]] as const) {
    if (value != null && (!Number.isSafeInteger(value) || Number(value) <= 0)) reasons.push(`${label}_INVALID`);
  }
  return reasons;
}

export async function verifyFactoryAssetEligibility(env: FactoryPixelVideoEnv, input: FactoryAssetEligibilityInput, command: FactoryRuntimeCommandInput, execution?: FactoryRuntimeExecution) {
  const invalid = validateAssetInput(input);
  if (invalid.length) throw new FactoryRuntimeError("ASSET_ELIGIBILITY_INPUT_INVALID", 400, "The asset eligibility input is invalid", invalid);
  if (command.commandType !== "VERIFY_ARTIFACT" || command.streamType !== "VIDEO" || command.streamId !== input.videoId) {
    throw new FactoryRuntimeError("ASSET_ELIGIBILITY_COMMAND_INVALID", 400, "Asset eligibility requires VERIFY_ARTIFACT on the exact video stream");
  }
  if (command.idempotencyKey === input.idempotencyKey) throw new FactoryRuntimeError("ASSET_ELIGIBILITY_IDEMPOTENCY_NAMESPACE_COLLISION", 400, "Receipt and command idempotency keys must be distinct");
  const existing = await first(env.DB, "SELECT * FROM factory_asset_eligibility_receipts WHERE idempotency_key=?", input.idempotencyKey);
  if (existing) {
    if (clean(existing.artifact_version_id) !== input.artifactVersionId || clean(existing.rights_receipt_id) !== input.rightsReceiptId) throw new FactoryRuntimeError("IDEMPOTENCY_KEY_REUSED", 409, "The asset eligibility idempotency key is bound to another input");
    await readExact(env.BUCKET, clean(existing.storage_key), clean(existing.source_hash), number(existing.byte_size), "ASSET_ELIGIBILITY_REPLAY_BYTES_MISSING", "ASSET_ELIGIBILITY_REPLAY_BYTES_MISMATCH");
    return { outcome: "IDEMPOTENT_REPLAY" as const, receiptId: clean(existing.id), artifactVersionId: input.artifactVersionId, sourceHash: clean(existing.source_hash), providerRequests: 0, spendMicros: 0 };
  }
  const evaluatedAt = (execution?.now?.() ?? new Date()).toISOString();
  await assertFencePreflight(env.DB, command, evaluatedAt);
  const row = await first(env.DB, `SELECT av.*,sp.lifecycle_state stale_state,rr.commercial_use_state,rr.valid_from rights_valid_from,rr.expires_at rights_expires_at
    FROM factory_artifact_versions av
    LEFT JOIN factory_artifact_stale_projections sp ON sp.artifact_version_id=av.id AND sp.lifecycle_state='STALE'
    JOIN factory_rights_eligibility_receipts rr ON rr.id=?
    WHERE av.id=?`, input.rightsReceiptId, input.artifactVersionId);
  const reasons: string[] = [];
  if (!row) reasons.push("ASSET_ARTIFACT_OR_RIGHTS_NOT_FOUND");
  if (row) {
    if (!new Set(["MATERIALIZED", "VERIFIED", "FROZEN"]).has(clean(row.lifecycle_state))) reasons.push("ASSET_ARTIFACT_NOT_MATERIALIZED");
    if (clean(row.stale_state) === "STALE") reasons.push("ASSET_ARTIFACT_STALE");
    if (!clean(row.storage_key) || !clean(row.mime_type)?.match(/^(image|video)\//)) reasons.push("ASSET_STORAGE_OR_MIME_INVALID");
    if (!hashPattern.test(clean(row.content_hash)) || number(row.byte_size) <= 0) reasons.push("ASSET_EXACT_BYTES_RECEIPT_INVALID");
    if (clean(row.commercial_use_state) !== "ELIGIBLE") reasons.push("ASSET_COMMERCIAL_USE_INELIGIBLE");
    if (clean(row.rights_valid_from) > evaluatedAt || (clean(row.rights_expires_at) && clean(row.rights_expires_at) <= evaluatedAt)) reasons.push("ASSET_RIGHTS_NOT_CURRENT");
  }
  if (reasons.length || !row) throw new FactoryRuntimeError("ASSET_ELIGIBILITY_BLOCKED", 409, "The asset is not eligible for SOURCE/HYBRID composition", reasons);
  const stored = await readExact(env.BUCKET, clean(row.storage_key), clean(row.content_hash), number(row.byte_size), "ASSET_BYTES_MISSING", "ASSET_BYTES_HASH_MISMATCH");
  const receiptHash = await canonicalHash({ input, storageKey: row.storage_key, mimeType: row.mime_type, byteSize: row.byte_size, sourceHash: row.content_hash, readbackHash: stored.hash });
  const receiptId = deterministicId("factory-asset-eligibility", receiptHash);
  const result = await submitFactoryRuntimeCommandWithEffects(env.DB, command, (context) => [
    env.DB.prepare(`INSERT INTO factory_asset_eligibility_receipts
      (id,video_id,artifact_version_id,rights_receipt_id,source_asset_id,storage_key,mime_type,byte_size,source_hash,readback_hash,width,height,duration_ms,commercial_use_state,modification_state,territory_scope,verification_state,idempotency_key,command_id,event_id,evidence_hash)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'ELIGIBLE',?,?,'PASS',?,?,?,?)`).bind(
      receiptId, input.videoId, input.artifactVersionId, input.rightsReceiptId, input.sourceAssetId, row.storage_key, row.mime_type, row.byte_size,
      row.content_hash, stored.hash, input.width ?? null, input.height ?? null, input.durationMs ?? null, input.modificationState, input.territoryScope,
      input.idempotencyKey, context.commandId, context.effectEventId, input.evidenceHash),
  ], execution);
  if (result.decision !== "ACCEPTED") throw new FactoryRuntimeError("ASSET_ELIGIBILITY_COMMAND_REJECTED", 409, "The canonical writer rejected the asset eligibility receipt", result.reasons);
  return { outcome: "VERIFIED" as const, receiptId, artifactVersionId: input.artifactVersionId, sourceHash: stored.hash, providerRequests: 0, spendMicros: 0, commandId: result.commandId, eventIds: result.eventIds };
}

function validateCanaryInput(input: FactoryIntegratedCanaryInput) {
  const reasons: string[] = [];
  for (const [label, value] of [["VIDEO_ID", input.videoId], ["RENDER_TAPE_ARTIFACT_VERSION_ID", input.renderTapeArtifactVersionId], ["COMPOSITOR_BINDING_ID", input.compositorBindingId]] as const) {
    if (!identityPattern.test(clean(value))) reasons.push(`${label}_INVALID`);
  }
  if (!identityPattern.test(clean(input.outputStorageKey))) reasons.push("OUTPUT_STORAGE_KEY_INVALID");
  if (!idempotencyPattern.test(clean(input.idempotencyKey))) reasons.push("IDEMPOTENCY_KEY_INVALID");
  if (!hashPattern.test(clean(input.evidenceHash))) reasons.push("EVIDENCE_HASH_INVALID");
  if (!hashPattern.test(clean(input.expectedOutputHash))) reasons.push("EXPECTED_OUTPUT_HASH_INVALID");
  if (!hashPattern.test(clean(input.deterministicReplayHash))) reasons.push("DETERMINISTIC_REPLAY_HASH_INVALID");
  if (!Number.isSafeInteger(input.frameStart) || input.frameStart < 0 || !Number.isSafeInteger(input.frameEndExclusive) || input.frameEndExclusive <= input.frameStart) reasons.push("CANARY_FRAME_RANGE_INVALID");
  if (!Number.isSafeInteger(input.expectedByteSize) || input.expectedByteSize <= 0) reasons.push("EXPECTED_BYTE_SIZE_INVALID");
  return reasons;
}

async function verifySamples(bucket: FactoryRenderBucket, samples: FactoryPixelSampleEvidence[], probe: FactoryIntegratedCanaryInput["probe"]) {
  const reasons: string[] = [];
  const roles = samples.map((sample) => sample.role).sort();
  if (canonicalStringify(roles) !== canonicalStringify(["ENTRY", "EXIT", "MIDPOINT"])) reasons.push("ENTRY_MIDPOINT_EXIT_SAMPLES_REQUIRED");
  for (const sample of samples) {
    if (!hashPattern.test(clean(sample.sha256)) || !identityPattern.test(clean(sample.storageKey)) || !Number.isSafeInteger(sample.byteSize) || sample.byteSize <= 0) reasons.push(`PIXEL_SAMPLE_RECEIPT_INVALID:${clean(sample.role)}`);
    if (!Number.isSafeInteger(sample.timestampMs) || sample.timestampMs < 0 || sample.timestampMs > probe.durationMs) reasons.push(`PIXEL_SAMPLE_TIMESTAMP_INVALID:${clean(sample.role)}`);
    if (sample.width !== probe.width || sample.height !== probe.height) reasons.push(`PIXEL_SAMPLE_DIMENSION_MISMATCH:${clean(sample.role)}`);
  }
  if (reasons.length) return reasons;
  for (const sample of samples) await readExact(bucket, sample.storageKey, sample.sha256, sample.byteSize, "PIXEL_SAMPLE_BYTES_MISSING", "PIXEL_SAMPLE_BYTES_MISMATCH");
  return reasons;
}

export async function planFactoryIntegratedCanary(env: FactoryPixelVideoEnv, input: FactoryIntegratedCanaryInput, evaluatedAt = new Date().toISOString()): Promise<FactoryIntegratedCanaryPlan> {
  const invalid = validateCanaryInput(input);
  if (invalid.length) throw new FactoryRuntimeError("INTEGRATED_CANARY_INPUT_INVALID", 400, "The integrated canary input is invalid", invalid);
  const [tapeRow, compositor] = await Promise.all([
    first(env.DB, `SELECT av.*,r.render_job_id,r.output_hash receipt_output_hash,r.readback_hash,r.byte_size receipt_byte_size,
      j.video_id,j.frame_start tape_frame_start,j.frame_end_exclusive tape_frame_end,t.frame_rate_numerator,t.frame_rate_denominator,
      sp.lifecycle_state stale_state
      FROM factory_artifact_versions av
      JOIN factory_scene_render_receipts r ON r.artifact_version_id=av.id
      JOIN factory_scene_render_jobs j ON j.id=r.render_job_id
      JOIN factory_scene_graphs sg ON sg.id=j.scene_graph_id
      JOIN factory_canonical_timebases t ON t.id=sg.canonical_timebase_id
      LEFT JOIN factory_artifact_stale_projections sp ON sp.artifact_version_id=av.id AND sp.lifecycle_state='STALE'
      WHERE av.id=?`, input.renderTapeArtifactVersionId),
    first(env.DB, `SELECT c.*,b.lifecycle_state binding_state,b.settings_hash binding_settings_hash,p.lifecycle_state provider_state,p.health_state provider_health,
      q.binding_id qualification_binding_id,q.lifecycle_state qualification_state,q.settings_hash qualification_settings_hash,q.expires_at qualification_expires_at
      FROM factory_pixel_compositor_bindings c
      JOIN factory_provider_bindings b ON b.id=c.provider_binding_id
      JOIN factory_providers p ON p.id=b.provider_id
      JOIN factory_capability_qualifications q ON q.id=c.qualification_id
      WHERE c.id=?`, input.compositorBindingId),
  ]);
  const reasons: string[] = [];
  if (!tapeRow) reasons.push("RENDER_TAPE_NOT_FOUND");
  if (!compositor) reasons.push("PIXEL_COMPOSITOR_BINDING_NOT_FOUND");
  const provisionalHash = await canonicalHash({ input, contractVersion: FACTORY_INTEGRATED_CANARY_CONTRACT_VERSION });
  if (!tapeRow || !compositor) return { outcome: "BLOCKED", reasons, inputHash: provisionalHash, compositionProgramHash: null, dependencySnapshotHash: null, renderTapeHash: null, outputHash: null, assetReceiptIds: [], upstreamArtifactVersionIds: [], outputBytes: null, sampleEvidence: [], compositor: compositor ?? null, providerRequests: 0, spendMicros: 0 };

  if (clean(tapeRow.video_id) !== input.videoId) reasons.push("RENDER_TAPE_VIDEO_MISMATCH");
  if (clean(tapeRow.artifact_kind) !== "SCENE_RENDER_TAPE" || clean(tapeRow.mime_type) !== FACTORY_SCENE_RENDER_TAPE_MIME) reasons.push("RENDER_TAPE_ARTIFACT_KIND_INVALID");
  if (clean(tapeRow.stale_state) === "STALE") reasons.push("RENDER_TAPE_STALE");
  if (clean(tapeRow.content_hash) !== clean(tapeRow.receipt_output_hash) || clean(tapeRow.content_hash) !== clean(tapeRow.readback_hash) || number(tapeRow.byte_size) !== number(tapeRow.receipt_byte_size)) reasons.push("RENDER_TAPE_RECEIPT_MISMATCH");
  if (input.frameStart < number(tapeRow.tape_frame_start) || input.frameEndExclusive > number(tapeRow.tape_frame_end)) reasons.push("CANARY_RANGE_OUTSIDE_RENDER_TAPE");
  if (clean(compositor.lifecycle_state) !== "ACTIVE" || clean(compositor.binding_state) !== "ACTIVE" || clean(compositor.provider_state) !== "ACTIVE" || clean(compositor.provider_health) !== "HEALTHY") reasons.push("PIXEL_COMPOSITOR_NOT_ACTIVE");
  if (clean(compositor.qualification_state) !== "QUALIFIED" || clean(compositor.qualification_binding_id) !== clean(compositor.provider_binding_id)) reasons.push("PIXEL_COMPOSITOR_NOT_QUALIFIED");
  if (clean(compositor.settings_hash) !== clean(compositor.binding_settings_hash) || clean(compositor.settings_hash) !== clean(compositor.qualification_settings_hash)) reasons.push("PIXEL_COMPOSITOR_SETTINGS_STALE");
  if (clean(compositor.compositor_version) !== FACTORY_PIXEL_VIDEO_COMPOSITOR_VERSION) reasons.push("PIXEL_COMPOSITOR_VERSION_MISMATCH");
  if (clean(compositor.qualification_expires_at) && clean(compositor.qualification_expires_at) <= evaluatedAt) reasons.push("PIXEL_COMPOSITOR_QUALIFICATION_EXPIRED");
  const frameCount = input.frameEndExclusive - input.frameStart;
  if (frameCount > number(compositor.max_frames_per_job)) reasons.push("CANARY_EXCEEDS_COMPOSITOR_LIMIT");
  const expectedDurationMs = Math.round(frameCount * number(tapeRow.frame_rate_denominator) * 1000 / number(tapeRow.frame_rate_numerator));
  if (expectedDurationMs < 60_000 || expectedDurationMs > 90_000) reasons.push("INTEGRATED_CANARY_MUST_BE_60_90_SECONDS");
  const probe = input.probe;
  if (probe.mimeType !== FACTORY_PIXEL_VIDEO_MIME || probe.codec !== FACTORY_PIXEL_VIDEO_CODEC) reasons.push("CANARY_CODEC_OR_MIME_INVALID");
  if (probe.frameRateNumerator !== number(tapeRow.frame_rate_numerator) || probe.frameRateDenominator !== number(tapeRow.frame_rate_denominator)) reasons.push("CANARY_FRAME_RATE_MISMATCH");
  if (probe.frameCount !== frameCount || Math.abs(probe.durationMs - expectedDurationMs) > Math.ceil(2000 * probe.frameRateDenominator / probe.frameRateNumerator)) reasons.push("CANARY_DURATION_OR_FRAME_COUNT_MISMATCH");
  if (probe.width < 320 || probe.width > 3840 || probe.height < 180 || probe.height > 2160) reasons.push("CANARY_DIMENSIONS_INVALID");
  if (input.expectedOutputHash !== input.deterministicReplayHash) reasons.push("PIXEL_COMPOSITOR_NONDETERMINISTIC");
  if (reasons.length) return { outcome: "BLOCKED", reasons: [...new Set(reasons)].sort(), inputHash: provisionalHash, compositionProgramHash: null, dependencySnapshotHash: null, renderTapeHash: clean(tapeRow.content_hash), outputHash: null, assetReceiptIds: [], upstreamArtifactVersionIds: [input.renderTapeArtifactVersionId], outputBytes: null, sampleEvidence: [], compositor, providerRequests: 0, spendMicros: 0 };

  const tapeStored = await readExact(env.BUCKET, clean(tapeRow.storage_key), clean(tapeRow.content_hash), number(tapeRow.byte_size), "RENDER_TAPE_BYTES_MISSING", "RENDER_TAPE_BYTES_MISMATCH");
  let tape: RenderTape;
  try { tape = JSON.parse(new TextDecoder().decode(tapeStored.bytes)) as RenderTape; } catch { throw new FactoryRuntimeError("RENDER_TAPE_JSON_INVALID", 503, "The exact render tape is not valid JSON"); }
  if (clean(tape.videoId) !== input.videoId || number(tape.canvas?.width) !== probe.width || number(tape.canvas?.height) !== probe.height) reasons.push("RENDER_TAPE_CANVAS_OR_VIDEO_MISMATCH");
  const assetScope = assetIdsFromTape(tape, input.frameStart, input.frameEndExclusive);
  reasons.push(...assetScope.reasons);
  const assetReceipts: Row[] = [];
  for (const artifactVersionId of assetScope.ids) {
    const receipt = await first(env.DB, `SELECT ar.*,av.content_hash artifact_hash,av.byte_size artifact_byte_size,av.storage_key artifact_storage_key,
      rr.commercial_use_state rights_state,rr.valid_from rights_valid_from,rr.expires_at rights_expires_at,sp.lifecycle_state stale_state
      FROM factory_asset_eligibility_receipts ar
      JOIN factory_artifact_versions av ON av.id=ar.artifact_version_id
      JOIN factory_rights_eligibility_receipts rr ON rr.id=ar.rights_receipt_id
      LEFT JOIN factory_artifact_stale_projections sp ON sp.artifact_version_id=av.id AND sp.lifecycle_state='STALE'
      WHERE ar.artifact_version_id=?`, artifactVersionId);
    if (!receipt) { reasons.push(`ASSET_ELIGIBILITY_RECEIPT_REQUIRED:${artifactVersionId}`); continue; }
    if (clean(receipt.verification_state) !== "PASS" || clean(receipt.rights_state) !== "ELIGIBLE" || clean(receipt.commercial_use_state) !== "ELIGIBLE") reasons.push(`ASSET_NOT_ELIGIBLE:${artifactVersionId}`);
    if (clean(receipt.stale_state) === "STALE" || clean(receipt.rights_valid_from) > evaluatedAt || (clean(receipt.rights_expires_at) && clean(receipt.rights_expires_at) <= evaluatedAt)) reasons.push(`ASSET_RIGHTS_OR_DEPENDENCY_STALE:${artifactVersionId}`);
    if (clean(receipt.source_hash) !== clean(receipt.readback_hash) || clean(receipt.source_hash) !== clean(receipt.artifact_hash) || number(receipt.byte_size) !== number(receipt.artifact_byte_size) || clean(receipt.storage_key) !== clean(receipt.artifact_storage_key)) reasons.push(`ASSET_EXACT_BYTES_RECEIPT_MISMATCH:${artifactVersionId}`);
    assetReceipts.push(receipt);
  }
  if (reasons.length) return { outcome: "BLOCKED", reasons: [...new Set(reasons)].sort(), inputHash: provisionalHash, compositionProgramHash: null, dependencySnapshotHash: null, renderTapeHash: tapeStored.hash, outputHash: null, assetReceiptIds: assetReceipts.map((row) => clean(row.id)).sort(), upstreamArtifactVersionIds: [input.renderTapeArtifactVersionId, ...assetScope.ids].sort(), outputBytes: null, sampleEvidence: [], compositor, providerRequests: 0, spendMicros: 0 };
  for (const receipt of assetReceipts) await readExact(env.BUCKET, clean(receipt.storage_key), clean(receipt.source_hash), number(receipt.byte_size), "QUALIFIED_ASSET_BYTES_MISSING", "QUALIFIED_ASSET_BYTES_MISMATCH");
  reasons.push(...await verifySamples(env.BUCKET, input.samples, probe));
  if (reasons.length) return { outcome: "BLOCKED", reasons: [...new Set(reasons)].sort(), inputHash: provisionalHash, compositionProgramHash: null, dependencySnapshotHash: null, renderTapeHash: tapeStored.hash, outputHash: null, assetReceiptIds: assetReceipts.map((row) => clean(row.id)).sort(), upstreamArtifactVersionIds: [input.renderTapeArtifactVersionId, ...assetScope.ids].sort(), outputBytes: null, sampleEvidence: [], compositor, providerRequests: 0, spendMicros: 0 };
  const output = await readExact(env.BUCKET, input.outputStorageKey, input.expectedOutputHash, input.expectedByteSize, "CANARY_OUTPUT_BYTES_MISSING", "CANARY_OUTPUT_BYTES_MISMATCH");
  const dependencySnapshot = {
    renderTape: { artifactVersionId: input.renderTapeArtifactVersionId, hash: tapeStored.hash },
    assets: assetReceipts.map((row) => ({ receiptId: clean(row.id), artifactVersionId: clean(row.artifact_version_id), hash: clean(row.source_hash), rightsReceiptId: clean(row.rights_receipt_id) })).sort((left, right) => left.artifactVersionId.localeCompare(right.artifactVersionId)),
    compositor: { bindingId: input.compositorBindingId, workerVersion: compositor.worker_version, encoderVersion: compositor.encoder_version, settingsHash: compositor.settings_hash },
  };
  const dependencySnapshotHash = await canonicalHash(dependencySnapshot);
  const compositionProgramHash = await canonicalHash({ contractVersion: FACTORY_INTEGRATED_CANARY_CONTRACT_VERSION, frameRange: { frameStart: input.frameStart, frameEndExclusive: input.frameEndExclusive }, tapeHash: tapeStored.hash, dependencySnapshotHash, probe, samples: input.samples });
  const inputHash = await canonicalHash({ input, dependencySnapshotHash, compositionProgramHash });
  return { outcome: "READY", reasons: [], inputHash, compositionProgramHash, dependencySnapshotHash, renderTapeHash: tapeStored.hash, outputHash: output.hash, assetReceiptIds: assetReceipts.map((row) => clean(row.id)).sort(), upstreamArtifactVersionIds: [input.renderTapeArtifactVersionId, ...assetScope.ids].sort(), outputBytes: output.bytes, sampleEvidence: input.samples, compositor, providerRequests: 0, spendMicros: 0 };
}

export async function materializeFactoryIntegratedCanary(env: FactoryPixelVideoEnv, input: FactoryIntegratedCanaryInput, command: FactoryRuntimeCommandInput, execution?: FactoryRuntimeExecution) {
  if (command.commandType !== "PRODUCE_ARTIFACT" || command.streamType !== "VIDEO" || command.streamId !== input.videoId) throw new FactoryRuntimeError("INTEGRATED_CANARY_COMMAND_INVALID", 400, "Canary composition requires PRODUCE_ARTIFACT on the exact video stream");
  if (command.idempotencyKey === input.idempotencyKey) throw new FactoryRuntimeError("INTEGRATED_CANARY_IDEMPOTENCY_NAMESPACE_COLLISION", 400, "Canary and command idempotency keys must be distinct");
  const existing = await first(env.DB, `SELECT j.*,r.artifact_version_id,r.readback_hash FROM factory_video_composition_jobs j
    JOIN factory_integrated_canary_receipts r ON r.composition_job_id=j.id WHERE j.idempotency_key=?`, input.idempotencyKey);
  if (existing) {
    if (clean(existing.output_hash) !== input.expectedOutputHash || clean(existing.render_tape_artifact_version_id) !== input.renderTapeArtifactVersionId) throw new FactoryRuntimeError("IDEMPOTENCY_KEY_REUSED", 409, "The canary idempotency key is bound to another input");
    await readExact(env.BUCKET, clean(existing.storage_key), clean(existing.readback_hash), number(existing.byte_size), "CANARY_REPLAY_BYTES_MISSING", "CANARY_REPLAY_BYTES_MISMATCH");
    return { outcome: "IDEMPOTENT_REPLAY" as const, compositionJobId: clean(existing.id), artifactVersionId: clean(existing.artifact_version_id), outputHash: clean(existing.output_hash), providerRequests: 0, spendMicros: 0 };
  }
  const evaluatedAt = (execution?.now?.() ?? new Date()).toISOString();
  await assertFencePreflight(env.DB, command, evaluatedAt);
  const plan = await planFactoryIntegratedCanary(env, input, evaluatedAt);
  if (plan.outcome !== "READY" || !plan.outputHash || !plan.outputBytes || !plan.compositionProgramHash || !plan.dependencySnapshotHash || !plan.compositor) throw new FactoryRuntimeError("INTEGRATED_CANARY_BLOCKED", 409, "The integrated canary is blocked by assets, rights, exact bytes, qualification or pixel evidence", plan.reasons);
  const compositionJobId = deterministicId("factory-composition-job", plan.inputHash);
  const artifactVersionId = deterministicId("factory-artifact-version", plan.outputHash);
  const receiptId = deterministicId("factory-integrated-canary", plan.outputHash);
  const dependencyRecords = await Promise.all(plan.upstreamArtifactVersionIds.map(async (upstreamArtifactVersionId) => {
    const bindingHash = await canonicalHash({ upstreamArtifactVersionId, downstreamArtifactVersionId: artifactVersionId, dependencyType: "COMPOSED_FROM" });
    return { id: deterministicId("factory-dependency", bindingHash), upstreamArtifactVersionId, bindingHash };
  }));
  const result = await submitFactoryRuntimeCommandWithEffects(env.DB, command, (context) => [
    env.DB.prepare(`INSERT INTO factory_artifact_versions
      (id,artifact_id,version,artifact_kind,source_entity_type,source_entity_id,content_hash,storage_key,mime_type,byte_size,lineage_json,lifecycle_state)
      VALUES (?,?,1,'INTEGRATED_CANARY_VIDEO','SCENE_RENDER_TAPE',?,?,?,?,?,?,'MATERIALIZED')`).bind(
      artifactVersionId, `artifact:${compositionJobId}`, input.renderTapeArtifactVersionId, plan.outputHash, input.outputStorageKey, FACTORY_PIXEL_VIDEO_MIME, input.expectedByteSize,
      canonicalStringify({ contractVersion: FACTORY_INTEGRATED_CANARY_CONTRACT_VERSION, dependencySnapshotHash: plan.dependencySnapshotHash, assetReceiptIds: plan.assetReceiptIds, compositorBindingId: input.compositorBindingId })),
    ...dependencyRecords.map((dependency) => env.DB.prepare(`INSERT INTO factory_dependency_bindings
      (id,upstream_artifact_version_id,downstream_artifact_version_id,dependency_type,binding_hash,created_by_event_id)
      VALUES (?,?,?,'COMPOSED_FROM',?,?)`).bind(dependency.id, dependency.upstreamArtifactVersionId, artifactVersionId, dependency.bindingHash, context.effectEventId)),
    env.DB.prepare(`INSERT INTO factory_video_composition_jobs
      (id,video_id,render_tape_artifact_version_id,compositor_binding_id,lease_id,fencing_token,frame_start,frame_end_exclusive,asset_receipt_ids_json,input_hash,composition_program_hash,dependency_snapshot_hash,output_hash,storage_key,mime_type,byte_size,duration_ms,width,height,frame_rate_numerator,frame_rate_denominator,frame_count,idempotency_key,lifecycle_state,provider_requests,spend_micros,command_id,event_id)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, ?,?,?,?,?,?,?,?,'MATERIALIZED',0,0,?,?)`).bind(
      compositionJobId, input.videoId, input.renderTapeArtifactVersionId, input.compositorBindingId, command.leaseId, command.fencingToken, input.frameStart, input.frameEndExclusive,
      canonicalStringify(plan.assetReceiptIds), plan.inputHash, plan.compositionProgramHash, plan.dependencySnapshotHash, plan.outputHash, input.outputStorageKey, FACTORY_PIXEL_VIDEO_MIME,
      input.expectedByteSize, input.probe.durationMs, input.probe.width, input.probe.height, input.probe.frameRateNumerator, input.probe.frameRateDenominator, input.probe.frameCount,
      input.idempotencyKey, context.commandId, context.effectEventId),
    env.DB.prepare(`INSERT INTO factory_integrated_canary_receipts
      (id,composition_job_id,artifact_version_id,canary_kind,compositor_version,encoder_version,dependency_snapshot_hash,sample_evidence_json,output_hash,readback_hash,deterministic_replay_hash,verification_state,zero_dispatch,provider_requests,spend_micros,evidence_hash)
      VALUES (?,?,?,'INTEGRATED_60_90_SECONDS',?,?,?,?,?,?,?,'PASS',1,0,0,?)`).bind(
      receiptId, compositionJobId, artifactVersionId, FACTORY_PIXEL_VIDEO_COMPOSITOR_VERSION, clean(plan.compositor.encoder_version), plan.dependencySnapshotHash,
      canonicalStringify(input.samples), plan.outputHash, plan.outputHash, input.deterministicReplayHash, input.evidenceHash),
  ], execution);
  if (result.decision !== "ACCEPTED") throw new FactoryRuntimeError("INTEGRATED_CANARY_COMMAND_REJECTED", 409, "The canonical writer rejected the integrated canary", result.reasons);
  return { outcome: "MATERIALIZED" as const, compositionJobId, receiptId, artifactVersionId, outputHash: plan.outputHash, dependencySnapshotHash: plan.dependencySnapshotHash, providerRequests: 0, spendMicros: 0, commandId: result.commandId, eventIds: result.eventIds };
}
