import { canonicalHash, canonicalStringify, sha256Hex } from "@/lib/canonical-json";
import { measureOpenAIUsage } from "@/lib/ai-usage";

export const CLEAN_AV_MASTER_MATERIALIZATION_VERSION = "CLEAN_AV_MASTER_MATERIALIZATION_V1" as const;
export const CLEAN_AV_FACTORY_QA_VERSION = "CLEAN_AV_FACTORY_QA_V1" as const;
export const CLEAN_AV_BROWSER_QA_VERSION = "CLEAN_AV_BROWSER_QA_V1" as const;
export const CLEAN_AV_OWNER_GROUND_TRUTH_VERSION = "CLEAN_AV_OWNER_GROUND_TRUTH_V1" as const;

const CHANNEL_ID = "channel-hidden-systems";
const QA_DIMENSIONS = ["semanticAlignment", "visualClarity", "motionContinuity", "mobileLegibility", "stateDifferentiation"] as const;
type Row = Record<string, unknown>;
type RunResult = { meta?: { changes?: number } };
type Statement = { bind(...values: unknown[]): Statement; first<T = Row>(): Promise<T | null>; run(): Promise<RunResult> };
export type CleanAvDB = { prepare(query: string): Statement };
type StoredObject = { arrayBuffer(): Promise<ArrayBuffer> };
export type CleanAvBucket = {
  put(key: string, value: Uint8Array, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }): Promise<unknown>;
  get(key: string): Promise<StoredObject | null>;
};

const clean = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const now = () => new Date().toISOString();
const jsonObject = (value: unknown): Row | null => {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Row;
  try { const parsed = JSON.parse(clean(value)); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Row : null; } catch { return null; }
};
const jsonArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  try { const parsed = JSON.parse(clean(value)); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
};
async function first(db: CleanAvDB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values).first<Row>(); }
async function run(db: CleanAvDB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values.map((value) => value === undefined ? null : value)).run(); }
function base64(bytes: Uint8Array) { let value = ""; for (let offset = 0; offset < bytes.length; offset += 0x8000) value += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000)); return btoa(value); }
function outputText(payload: Row) {
  if (typeof payload.output_text === "string") return payload.output_text;
  for (const item of Array.isArray(payload.output) ? payload.output as Row[] : []) {
    for (const block of Array.isArray(item.content) ? item.content as Row[] : []) if (typeof block.text === "string") return block.text;
  }
  return "";
}

export class CleanAvMasterError extends Error {
  constructor(public code: string, public status: number, message: string) { super(message); }
}

export async function cleanAvMasterSnapshot(db: CleanAvDB) {
  const [policy, task, materialization, factoryQa, browserQa, ownerTask] = await Promise.all([
    first(db, "SELECT * FROM v7_evaluation_clean_av_master_policies WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, CLEAN_AV_MASTER_MATERIALIZATION_VERSION),
    first(db, "SELECT * FROM v7_evaluation_clean_av_master_tasks WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, CLEAN_AV_MASTER_MATERIALIZATION_VERSION),
    first(db, "SELECT * FROM v7_evaluation_clean_av_master_materialization_receipts WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, CLEAN_AV_MASTER_MATERIALIZATION_VERSION),
    first(db, "SELECT * FROM v7_evaluation_clean_av_factory_qa_receipts WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, CLEAN_AV_FACTORY_QA_VERSION),
    first(db, "SELECT * FROM v7_evaluation_clean_av_browser_qa_receipts WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, CLEAN_AV_BROWSER_QA_VERSION),
    first(db, "SELECT * FROM v7_evaluation_clean_av_owner_ground_truth_tasks WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, CLEAN_AV_OWNER_GROUND_TRUTH_VERSION),
  ]);
  const browserObservation = jsonObject(jsonArray(browserQa?.observations_json)[0]);
  return {
    policy: policy ? {
      maximumMasters: number(policy.maximum_masters), archivalWidth: number(policy.archival_width), archivalHeight: number(policy.archival_height),
      distributionWidth: number(policy.distribution_width), distributionHeight: number(policy.distribution_height), frameRate: number(policy.frame_rate),
      audioSampleRateHz: number(policy.audio_sample_rate_hz), maximumAvEndDeltaMs: number(policy.maximum_av_end_delta_ms),
      authorityBoundary: clean(policy.authority_boundary), releaseAuthority: Boolean(number(policy.release_authority)),
    } : null,
    task: task ? {
      id: clean(task.id), blueprintId: clean(task.blueprint_id), sourceCleanControlReceiptId: clean(task.source_clean_control_receipt_id),
      sourceAudioArtifactId: clean(task.source_audio_artifact_id), sourceAudioRightsReceiptId: clean(task.source_audio_rights_receipt_id),
      sourceAudioHash: clean(task.source_audio_hash), state: materialization ? "COMPLETE" : clean(task.task_state),
    } : null,
    materialization: materialization ? {
      id: clean(materialization.id), archivalHash: clean(materialization.archival_hash), distributionHash: clean(materialization.distribution_hash),
      contactSheetHash: clean(materialization.contact_sheet_hash), technicalQaState: clean(materialization.technical_qa_state), rightsState: clean(materialization.rights_state),
      audioDurationSeconds: number(materialization.audio_duration_seconds), videoDurationSeconds: number(materialization.video_duration_seconds),
      avStartDeltaMs: number(materialization.av_start_delta_ms), avEndDeltaMs: number(materialization.av_end_delta_ms),
      materializationState: clean(materialization.materialization_state), authorityBoundary: clean(materialization.authority_boundary),
      factoryQaState: factoryQa ? clean(factoryQa.decision_state) : "PENDING", browserQaState: browserQa ? clean(browserQa.decision_state) : "PENDING",
      ownerGroundTruthState: ownerTask ? "REVIEW_REQUIRED" : "NOT_EVALUATED", releaseEligible: false,
    } : null,
    factoryQa: factoryQa ? {
      id: clean(factoryQa.id), decisionState: clean(factoryQa.decision_state), overallScore: number(factoryQa.overall_score),
      p0Count: number(factoryQa.p0_count), p1Count: number(factoryQa.p1_count), rationale: clean(factoryQa.rationale),
      authorityBoundary: clean(factoryQa.authority_boundary), actualSpendUsd: number(factoryQa.actual_spend_usd),
    } : null,
    browserQa: browserQa ? {
      id: clean(browserQa.id), decisionState: clean(browserQa.decision_state), playbackCoverageRatio: number(browserQa.playback_coverage_ratio),
      meaningfulMotionObserved: Boolean(number(browserQa.meaningful_motion_observed)), mobileLegibilityObserved: Boolean(number(browserQa.mobile_legibility_observed)),
      pageErrorCount: number(browserQa.page_error_count), evidenceBundleHash: clean(browserObservation?.evidenceBundleHash), browserRunId: clean(browserObservation?.browserRunId),
      maximumAudioRms: number(browserObservation?.maximumAudioRms), motionSamples: number(browserObservation?.motionSamples), mobileFrameSamples: number(browserObservation?.mobileFrameSamples),
      authorityBoundary: clean(browserQa.authority_boundary),
    } : null,
    ownerTask: ownerTask ? { id: clean(ownerTask.id), distributionHash: clean(ownerTask.distribution_hash), state: clean(ownerTask.task_state), authorityBoundary: clean(ownerTask.authority_boundary) } : null,
  };
}

async function prerequisites(db: CleanAvDB, taskId: string) {
  const [policy, task, blueprint, cleanControl, artifact, rights, controlledDefect, anyReceipt] = await Promise.all([
    first(db, "SELECT * FROM v7_evaluation_clean_av_master_policies WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, CLEAN_AV_MASTER_MATERIALIZATION_VERSION),
    first(db, "SELECT * FROM v7_evaluation_clean_av_master_tasks WHERE id=? AND channel_id=? AND policy_version=? LIMIT 1", taskId, CHANNEL_ID, CLEAN_AV_MASTER_MATERIALIZATION_VERSION),
    first(db, "SELECT * FROM v7_evaluation_controlled_fixture_blueprints WHERE id=(SELECT blueprint_id FROM v7_evaluation_clean_av_master_tasks WHERE id=?) LIMIT 1", taskId),
    first(db, "SELECT * FROM v7_evaluation_clean_audio_control_eligibility_receipts WHERE id=(SELECT source_clean_control_receipt_id FROM v7_evaluation_clean_av_master_tasks WHERE id=?) LIMIT 1", taskId),
    first(db, "SELECT * FROM v7_evaluation_commercial_clean_audio_artifacts WHERE id=(SELECT source_audio_artifact_id FROM v7_evaluation_clean_av_master_tasks WHERE id=?) AND channel_id=? LIMIT 1", taskId, CHANNEL_ID),
    first(db, "SELECT * FROM v7_evaluation_commercial_clean_audio_rights_receipts WHERE id=(SELECT source_audio_rights_receipt_id FROM v7_evaluation_clean_av_master_tasks WHERE id=?) AND channel_id=? LIMIT 1", taskId, CHANNEL_ID),
    first(db, "SELECT * FROM v7_evaluation_controlled_defect_derivation_receipts WHERE id=(SELECT source_controlled_defect_receipt_id FROM v7_evaluation_clean_av_master_tasks WHERE id=?) AND channel_id=? LIMIT 1", taskId, CHANNEL_ID),
    first(db, "SELECT id FROM v7_evaluation_clean_av_master_materialization_receipts WHERE channel_id=? LIMIT 1", CHANNEL_ID),
  ]);
  if (!policy || !task || !blueprint || !cleanControl || !artifact || !rights || !controlledDefect) throw new CleanAvMasterError("CLEAN_AV_PREREQUISITES_MISSING", 409, "The sealed policy, task, blueprint and complete clean-audio evidence chain are required");
  if (clean(blueprint.blueprint_key) !== "CLEAN_AUDIO_VISUAL_MASTER_NEGATIVE" || clean(blueprint.fixture_role) !== "CLEAN_NEGATIVE" || clean(blueprint.candidate_kind) !== "MASTER" || clean(blueprint.modality) !== "AUDIO_VISUAL" || clean(blueprint.oracle_kind) !== "HYBRID") throw new CleanAvMasterError("CLEAN_AV_BLUEPRINT_MISMATCH", 409, "The exact cfp-v1-13 clean audio-visual blueprint is required");
  if (clean(cleanControl.decision_state) !== "ELIGIBLE_CLEAN_CONTROL_REFERENCE" || number(cleanControl.reference_eligible) !== 1 || clean(cleanControl.rights_state) !== "PASS" || clean(cleanControl.owner_ground_truth_state) !== "CLEAN_CONFIRMED") throw new CleanAvMasterError("CLEAN_AV_SOURCE_CONTROL_INELIGIBLE", 409, "The exact clean-audio control must retain Rights PASS and owner-confirmed clean authority");
  if (clean(controlledDefect.decision_state) !== "CONTROLLED_DEFECT_PRESENT" || clean(controlledDefect.oracle_state) !== "PASS") throw new CleanAvMasterError("CLEAN_AV_SEQUENCE_GATE_NOT_MET", 409, "The prior isolated controlled-defect gate must be complete");
  if (clean(rights.rights_state) !== "PASS" || clean(artifact.rights_state) !== "PASS") throw new CleanAvMasterError("CLEAN_AV_RIGHTS_PASS_REQUIRED", 409, "The exact clean-audio source requires Rights PASS");
  return { policy, task, blueprint, cleanControl, artifact, rights, anyReceipt };
}

export async function readCleanAvSourceAudioAuthorized(db: CleanAvDB, bucket: CleanAvBucket, taskId: string, expectedHash: string) {
  const context = await prerequisites(db, taskId), sealedHash = clean(context.task.source_audio_hash).toLowerCase();
  if (expectedHash.toLowerCase() !== sealedHash || [context.cleanControl.exact_artifact_hash, context.artifact.sha256].some((value) => clean(value).toLowerCase() !== sealedHash)) throw new CleanAvMasterError("CLEAN_AV_SOURCE_AUDIO_HASH_BINDING_MISMATCH", 409, "Every clean-audio source record must bind the same exact hash");
  const object = await bucket.get(clean(context.artifact.storage_key)); if (!object) throw new CleanAvMasterError("CLEAN_AV_SOURCE_AUDIO_MISSING", 404, "The exact clean-audio source is missing from R2");
  const bytes = new Uint8Array(await object.arrayBuffer()), hash = await sha256Hex(bytes);
  if (hash !== sealedHash || bytes.byteLength !== number(context.artifact.byte_size)) throw new CleanAvMasterError("CLEAN_AV_SOURCE_AUDIO_R2_HASH_MISMATCH", 409, "The current source audio bytes differ from the sealed clean control");
  return { bytes, hash, mimeType: clean(context.artifact.mime_type) || "audio/mpeg" };
}

type MediaUpload = { bytes: Uint8Array; declaredHash: string; contentType: string };
type TechnicalProfile = { width?: unknown; height?: unknown; frameRate?: unknown; videoCodec?: unknown; audioCodec?: unknown; audioSampleRateHz?: unknown; durationSeconds?: unknown; startTimeSeconds?: unknown; frameCount?: unknown };
type StagedChunk = { index: number; hash: string; size: number };
export type CleanAvStagedUploadDescriptor = { role: "archival" | "distribution" | "contactSheet"; fullHash: string; totalBytes: number; chunks: StagedChunk[] };
const CLEAN_AV_UPLOAD_CHUNK_MAXIMUM_BYTES = 400_000;
const CLEAN_AV_UPLOAD_CHUNK_MAXIMUM_COUNT = 128;
const stagedChunkKey = (taskId: string, role: string, fullHash: string, index: number, chunkHash: string) => `evaluation/controlled-fixtures/v1/clean-av/staging/${taskId}/${role}/${fullHash}/${String(index).padStart(3, "0")}-${chunkHash}.part`;

export async function stageCleanAvUploadChunkAuthorized(args: { db: CleanAvDB; bucket: CleanAvBucket; taskId: string; role: string; fullHash: string; totalBytes: number; chunkIndex: number; chunkCount: number; declaredChunkHash: string; bytes: Uint8Array }) {
  const context = await prerequisites(args.db, args.taskId), role = clean(args.role);
  if (context.anyReceipt) throw new CleanAvMasterError("CLEAN_AV_MASTER_CEILING_REACHED", 409, "The one-master materialization ceiling has already been reached");
  if (!['archival', 'distribution', 'contactSheet'].includes(role)) throw new CleanAvMasterError("CLEAN_AV_UPLOAD_ROLE_INVALID", 400, "Use an allowlisted clean A/V upload role");
  if (!/^[a-f0-9]{64}$/.test(args.fullHash) || !/^[a-f0-9]{64}$/.test(args.declaredChunkHash)) throw new CleanAvMasterError("CLEAN_AV_UPLOAD_HASH_INVALID", 400, "Full and chunk SHA-256 values are required");
  const maximum = role === "archival" ? number(context.policy.maximum_archival_bytes) : role === "distribution" ? number(context.policy.maximum_distribution_bytes) : number(context.policy.maximum_contact_sheet_bytes);
  const minimum = role === "contactSheet" ? 1001 : 10001;
  if (!Number.isInteger(args.totalBytes) || args.totalBytes < minimum || args.totalBytes > maximum) throw new CleanAvMasterError("CLEAN_AV_UPLOAD_SIZE_INVALID", 422, "The staged object total is outside its bounded range");
  if (!Number.isInteger(args.chunkCount) || args.chunkCount < 1 || args.chunkCount > CLEAN_AV_UPLOAD_CHUNK_MAXIMUM_COUNT || !Number.isInteger(args.chunkIndex) || args.chunkIndex < 0 || args.chunkIndex >= args.chunkCount) throw new CleanAvMasterError("CLEAN_AV_UPLOAD_CHUNK_INDEX_INVALID", 400, "Chunk index and count must be contiguous and bounded");
  if (args.bytes.byteLength < 1 || args.bytes.byteLength > CLEAN_AV_UPLOAD_CHUNK_MAXIMUM_BYTES) throw new CleanAvMasterError("CLEAN_AV_UPLOAD_CHUNK_SIZE_INVALID", 413, "Each staged chunk must remain within 400000 bytes");
  const chunkHash = await sha256Hex(args.bytes); if (chunkHash !== args.declaredChunkHash) throw new CleanAvMasterError("CLEAN_AV_UPLOAD_CHUNK_HASH_MISMATCH", 409, "The staged chunk hash does not match its bytes");
  const key = stagedChunkKey(args.taskId, role, args.fullHash, args.chunkIndex, chunkHash);
  await args.bucket.put(key, args.bytes, { httpMetadata: { contentType: "application/octet-stream" }, customMetadata: { sha256: chunkHash, taskId: args.taskId, role, fullHash: args.fullHash, chunkIndex: String(args.chunkIndex), chunkCount: String(args.chunkCount), releaseEligible: "false" } });
  const stored = await args.bucket.get(key); if (!stored) throw new CleanAvMasterError("CLEAN_AV_UPLOAD_CHUNK_READBACK_MISSING", 503, "The staged chunk could not be read back");
  const readback = new Uint8Array(await stored.arrayBuffer()); if (readback.byteLength !== args.bytes.byteLength || await sha256Hex(readback) !== chunkHash) throw new CleanAvMasterError("CLEAN_AV_UPLOAD_CHUNK_READBACK_MISMATCH", 503, "The staged chunk failed exact R2 read-back");
  return { outcome: "CHUNK_STAGED", role, fullHash: args.fullHash, totalBytes: args.totalBytes, chunkIndex: args.chunkIndex, chunkCount: args.chunkCount, chunkHash, chunkBytes: args.bytes.byteLength, authorityBoundary: "UPLOAD_STAGING_ONLY", releaseEligible: false };
}

export async function readCleanAvStagedUploadAuthorized(args: { db: CleanAvDB; bucket: CleanAvBucket; taskId: string; descriptor: CleanAvStagedUploadDescriptor }) {
  const context = await prerequisites(args.db, args.taskId), descriptor = args.descriptor, role = clean(descriptor?.role);
  if (context.anyReceipt) throw new CleanAvMasterError("CLEAN_AV_MASTER_CEILING_REACHED", 409, "The one-master materialization ceiling has already been reached");
  if (!['archival', 'distribution', 'contactSheet'].includes(role) || !/^[a-f0-9]{64}$/.test(clean(descriptor?.fullHash))) throw new CleanAvMasterError("CLEAN_AV_STAGED_UPLOAD_DESCRIPTOR_INVALID", 400, "A valid staged upload descriptor is required");
  const maximum = role === "archival" ? number(context.policy.maximum_archival_bytes) : role === "distribution" ? number(context.policy.maximum_distribution_bytes) : number(context.policy.maximum_contact_sheet_bytes), minimum = role === "contactSheet" ? 1001 : 10001;
  if (!Number.isInteger(descriptor.totalBytes) || descriptor.totalBytes < minimum || descriptor.totalBytes > maximum || !Array.isArray(descriptor.chunks) || descriptor.chunks.length < 1 || descriptor.chunks.length > CLEAN_AV_UPLOAD_CHUNK_MAXIMUM_COUNT) throw new CleanAvMasterError("CLEAN_AV_STAGED_UPLOAD_DESCRIPTOR_INVALID", 400, "The staged upload byte and chunk bounds are invalid");
  const parts: Uint8Array[] = []; let total = 0;
  for (const [expectedIndex, item] of descriptor.chunks.entries()) {
    if (item.index !== expectedIndex || !/^[a-f0-9]{64}$/.test(clean(item.hash)) || !Number.isInteger(item.size) || item.size < 1 || item.size > CLEAN_AV_UPLOAD_CHUNK_MAXIMUM_BYTES) throw new CleanAvMasterError("CLEAN_AV_STAGED_UPLOAD_CHUNK_DESCRIPTOR_INVALID", 400, "Staged chunks must be contiguous and hash-bound");
    const key = stagedChunkKey(args.taskId, role, descriptor.fullHash, item.index, item.hash), stored = await args.bucket.get(key); if (!stored) throw new CleanAvMasterError("CLEAN_AV_STAGED_UPLOAD_CHUNK_MISSING", 404, "A staged upload chunk is missing");
    const bytes = new Uint8Array(await stored.arrayBuffer()); if (bytes.byteLength !== item.size || await sha256Hex(bytes) !== item.hash) throw new CleanAvMasterError("CLEAN_AV_STAGED_UPLOAD_CHUNK_MISMATCH", 409, "A staged upload chunk differs from its sealed descriptor");
    parts.push(bytes); total += bytes.byteLength;
  }
  if (total !== descriptor.totalBytes) throw new CleanAvMasterError("CLEAN_AV_STAGED_UPLOAD_TOTAL_MISMATCH", 409, "The staged upload total differs from its descriptor");
  const assembled = new Uint8Array(total); let offset = 0; for (const part of parts) { assembled.set(part, offset); offset += part.byteLength; }
  if (await sha256Hex(assembled) !== descriptor.fullHash) throw new CleanAvMasterError("CLEAN_AV_STAGED_UPLOAD_HASH_MISMATCH", 409, "The assembled staged upload differs from its full SHA-256");
  return { bytes: assembled, declaredHash: descriptor.fullHash, contentType: role === "contactSheet" ? "image/jpeg" : "video/webm" };
}
export async function materializeCleanAvMasterAuthorized(args: {
  db: CleanAvDB; bucket: CleanAvBucket; actor: string; idempotencyKey: string; taskId: string; sourceAudioArtifactId: string; expectedSourceAudioHash: string;
  visualManifest: Row; technicalEvidence: Row; archival: MediaUpload; distribution: MediaUpload; contactSheet: MediaUpload;
}) {
  if (!/^[A-Za-z0-9._:-]{16,160}$/.test(args.idempotencyKey)) throw new CleanAvMasterError("IDEMPOTENCY_KEY_INVALID", 400, "A stable 16–160 character idempotency-key is required");
  const prior = await first(args.db, "SELECT * FROM v7_evaluation_clean_av_master_materialization_receipts WHERE channel_id=? AND idempotency_key=? LIMIT 1", CHANNEL_ID, args.idempotencyKey);
  const computed = {
    archivalHash: await sha256Hex(args.archival.bytes), distributionHash: await sha256Hex(args.distribution.bytes), contactSheetHash: await sha256Hex(args.contactSheet.bytes),
    visualManifestHash: await sha256Hex(canonicalStringify(args.visualManifest)), technicalEvidenceHash: await sha256Hex(canonicalStringify(args.technicalEvidence)),
  };
  const requestHash = await canonicalHash({ policyVersion: CLEAN_AV_MASTER_MATERIALIZATION_VERSION, taskId: args.taskId, sourceAudioArtifactId: args.sourceAudioArtifactId, expectedSourceAudioHash: args.expectedSourceAudioHash.toLowerCase(), ...computed, actor: args.actor });
  if (prior) {
    if (clean(prior.request_hash) !== requestHash) throw new CleanAvMasterError("CLEAN_AV_IDEMPOTENCY_INTENT_CONFLICT", 409, "The idempotency key is bound to a different clean A/V master intent");
    return { outcome: "REPLAYED", snapshot: await cleanAvMasterSnapshot(args.db) };
  }
  const context = await prerequisites(args.db, args.taskId);
  if (context.anyReceipt) throw new CleanAvMasterError("CLEAN_AV_MASTER_CEILING_REACHED", 409, "The one-master materialization ceiling has already been reached");
  const sourceHash = clean(context.task.source_audio_hash).toLowerCase();
  if (clean(context.task.source_audio_artifact_id) !== args.sourceAudioArtifactId || args.expectedSourceAudioHash.toLowerCase() !== sourceHash) throw new CleanAvMasterError("CLEAN_AV_TASK_BINDING_MISMATCH", 409, "The materialization request must bind the exact task source audio");
  const source = await readCleanAvSourceAudioAuthorized(args.db, args.bucket, args.taskId, sourceHash);
  for (const [label, upload, maximum] of [["archival", args.archival, number(context.policy.maximum_archival_bytes)], ["distribution", args.distribution, number(context.policy.maximum_distribution_bytes)], ["contact sheet", args.contactSheet, number(context.policy.maximum_contact_sheet_bytes)]] as const) {
    if (upload.bytes.byteLength < (label === "contact sheet" ? 1000 : 10000) || upload.bytes.byteLength > maximum) throw new CleanAvMasterError("CLEAN_AV_UPLOAD_SIZE_INVALID", 422, `The ${label} bytes are outside the bounded range`);
    if (upload.declaredHash.toLowerCase() !== await sha256Hex(upload.bytes)) throw new CleanAvMasterError("CLEAN_AV_UPLOAD_HASH_MISMATCH", 409, `The declared ${label} hash does not match the uploaded bytes`);
  }
  if (computed.archivalHash === computed.distributionHash) throw new CleanAvMasterError("CLEAN_AV_RENDITIONS_NOT_DISTINCT", 409, "Archival and distribution renditions must have distinct exact hashes");
  const manifest = args.visualManifest, evidence = args.technicalEvidence;
  if (clean(manifest.schemaVersion) !== "CLEAN_AV_VISUAL_MANIFEST_V1" || clean(manifest.sourceAudioHash).toLowerCase() !== sourceHash || number(manifest.cueCount) < 4 || number(manifest.treatmentFamilies) < 3 || manifest.continuousMotion !== true || number(manifest.minimumCriticalFontPx) < 32) throw new CleanAvMasterError("CLEAN_AV_VISUAL_MANIFEST_INVALID", 409, "The authored visual manifest does not meet the clean-control contract");
  if (clean(evidence.schemaVersion) !== "CLEAN_AV_TECHNICAL_EVIDENCE_V1" || clean(evidence.scanState) !== "PASS" || number(evidence.blackFrameRatio) > 0.01 || number(evidence.freezeMaxSeconds) > 3.5 || number(evidence.motionCoverageRatio) < 0.95) throw new CleanAvMasterError("CLEAN_AV_TECHNICAL_EVIDENCE_INVALID", 409, "The technical scan must pass motion, freeze and black-frame floors");
  const archival = jsonObject(evidence.archival) as TechnicalProfile | null, distribution = jsonObject(evidence.distribution) as TechnicalProfile | null;
  if (!archival || !distribution) throw new CleanAvMasterError("CLEAN_AV_PROFILE_EVIDENCE_MISSING", 409, "Both rendition profiles are required");
  const validProfile = (profile: TechnicalProfile, width: number, height: number) => number(profile.width) === width && number(profile.height) === height && Math.abs(number(profile.frameRate) - 30) < 0.001 && clean(profile.videoCodec).toLowerCase() === "vp9" && clean(profile.audioCodec).toLowerCase() === "opus" && number(profile.audioSampleRateHz) === 48000 && number(profile.frameCount) >= 900;
  if (!validProfile(archival, 1920, 1080) || !validProfile(distribution, 1280, 720)) throw new CleanAvMasterError("CLEAN_AV_PROFILE_MISMATCH", 409, "The exact VP9/Opus archival and distribution profiles are required");
  const audioDuration = number(evidence.audioDurationSeconds), videoDuration = number(evidence.videoDurationSeconds), startDelta = number(evidence.avStartDeltaMs), endDelta = number(evidence.avEndDeltaMs);
  if (audioDuration <= 30 || audioDuration >= 45 || videoDuration <= 30 || videoDuration >= 45 || Math.abs(startDelta) > 20 || Math.abs(endDelta) > number(context.policy.maximum_av_end_delta_ms)) throw new CleanAvMasterError("CLEAN_AV_SYNC_GATE_FAILED", 409, "Measured A/V start and end sync must remain inside the sealed ceiling");
  const storageBase = `evaluation/controlled-fixtures/v1/clean-av/${computed.distributionHash}`;
  const objects = [
    { key: `${storageBase}/visual-manifest.json`, bytes: new TextEncoder().encode(canonicalStringify(manifest)), hash: computed.visualManifestHash, type: "application/json", role: "VISUAL_MANIFEST" },
    { key: `${storageBase}/archival-master.webm`, bytes: args.archival.bytes, hash: computed.archivalHash, type: "video/webm", role: "ARCHIVAL_MASTER" },
    { key: `${storageBase}/distribution-master.webm`, bytes: args.distribution.bytes, hash: computed.distributionHash, type: "video/webm", role: "DISTRIBUTION_MASTER" },
    { key: `${storageBase}/contact-sheet.jpg`, bytes: args.contactSheet.bytes, hash: computed.contactSheetHash, type: "image/jpeg", role: "CONTACT_SHEET" },
    { key: `${storageBase}/technical-evidence.json`, bytes: new TextEncoder().encode(canonicalStringify(evidence)), hash: computed.technicalEvidenceHash, type: "application/json", role: "TECHNICAL_EVIDENCE" },
  ];
  for (const object of objects) await args.bucket.put(object.key, object.bytes, { httpMetadata: { contentType: object.type }, customMetadata: { sha256: object.hash, policyVersion: CLEAN_AV_MASTER_MATERIALIZATION_VERSION, taskId: args.taskId, role: object.role, releaseEligible: "false" } });
  for (const object of objects) { const stored = await args.bucket.get(object.key); if (!stored) throw new CleanAvMasterError("CLEAN_AV_R2_READBACK_MISSING", 503, `The ${object.role} object could not be read back`); const bytes = new Uint8Array(await stored.arrayBuffer()); if (bytes.byteLength !== object.bytes.byteLength || await sha256Hex(bytes) !== object.hash) throw new CleanAvMasterError("CLEAN_AV_R2_READBACK_HASH_MISMATCH", 503, `The ${object.role} R2 bytes differ from the sealed upload`); }
  const receiptId = id("clean-av-master-materialization-receipt");
  const evidenceHash = await canonicalHash({ receiptId, requestHash, taskId: context.task.id, blueprintId: context.blueprint.id, sourceCleanControlReceiptId: context.cleanControl.id, sourceAudioArtifactId: context.artifact.id, sourceAudioRightsReceiptId: context.rights.id, sourceAudioHash: source.hash, ...computed, audioDuration, videoDuration, startDelta, endDelta, technicalQaState: "PASS", rightsState: "PASS", authorityBoundary: "CLEAN_AV_TECHNICAL_MATERIALIZATION_ONLY" });
  await run(args.db, `INSERT INTO v7_evaluation_clean_av_master_materialization_receipts
    (id,task_id,channel_id,policy_version,blueprint_id,source_clean_control_receipt_id,source_audio_artifact_id,source_audio_rights_receipt_id,source_audio_hash,source_audio_readback_hash,source_audio_readback_bytes,visual_manifest_storage_key,visual_manifest_hash,visual_manifest_readback_hash,archival_storage_key,archival_hash,archival_bytes,archival_readback_hash,distribution_storage_key,distribution_hash,distribution_bytes,distribution_readback_hash,contact_sheet_storage_key,contact_sheet_hash,contact_sheet_bytes,contact_sheet_readback_hash,technical_evidence_storage_key,technical_evidence_hash,technical_evidence_readback_hash,archival_width,archival_height,distribution_width,distribution_height,frame_rate,audio_sample_rate_hz,audio_duration_seconds,video_duration_seconds,av_start_delta_ms,av_end_delta_ms,technical_qa_state,rights_state,factory_qa_state,browser_qa_state,owner_ground_truth_state,materialization_state,actor,idempotency_key,request_hash,evidence_hash,authority_boundary)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1920,1080,1280,720,30,48000,?,?,?,?,'PASS','PASS','PENDING','PENDING','NOT_EVALUATED','EXACT_LINEAGE_CHECKSUM_SYNC_VERIFIED',?,?,?,?,'CLEAN_AV_TECHNICAL_MATERIALIZATION_ONLY')`,
    receiptId, context.task.id, CHANNEL_ID, CLEAN_AV_MASTER_MATERIALIZATION_VERSION, context.blueprint.id, context.cleanControl.id, context.artifact.id, context.rights.id,
    source.hash, source.hash, source.bytes.byteLength, objects[0].key, computed.visualManifestHash, computed.visualManifestHash,
    objects[1].key, computed.archivalHash, args.archival.bytes.byteLength, computed.archivalHash,
    objects[2].key, computed.distributionHash, args.distribution.bytes.byteLength, computed.distributionHash,
    objects[3].key, computed.contactSheetHash, args.contactSheet.bytes.byteLength, computed.contactSheetHash,
    objects[4].key, computed.technicalEvidenceHash, computed.technicalEvidenceHash,
    audioDuration, videoDuration, startDelta, endDelta, args.actor, args.idempotencyKey, requestHash, evidenceHash);
  return { outcome: "RECORDED", snapshot: await cleanAvMasterSnapshot(args.db) };
}

async function maybeCreateOwnerTask(db: CleanAvDB) {
  const [materialization, factoryQa, browserQa, prior] = await Promise.all([
    first(db, "SELECT * FROM v7_evaluation_clean_av_master_materialization_receipts WHERE channel_id=? LIMIT 1", CHANNEL_ID),
    first(db, "SELECT * FROM v7_evaluation_clean_av_factory_qa_receipts WHERE channel_id=? LIMIT 1", CHANNEL_ID),
    first(db, "SELECT * FROM v7_evaluation_clean_av_browser_qa_receipts WHERE channel_id=? LIMIT 1", CHANNEL_ID),
    first(db, "SELECT id FROM v7_evaluation_clean_av_owner_ground_truth_tasks WHERE channel_id=? LIMIT 1", CHANNEL_ID),
  ]);
  if (!prior && materialization && factoryQa && browserQa && clean(factoryQa.decision_state) === "LIKELY_CLEAN" && clean(browserQa.decision_state) === "LIKELY_CLEAN") {
    await run(db, `INSERT INTO v7_evaluation_clean_av_owner_ground_truth_tasks
      (id,materialization_receipt_id,factory_qa_receipt_id,browser_qa_receipt_id,channel_id,policy_version,distribution_hash,task_state,authority_boundary)
      VALUES (?,?,?,?,?,'CLEAN_AV_OWNER_GROUND_TRUTH_V1',?,'OPEN','OWNER_GROUND_TRUTH_ONLY')`, `clean-av-owner-task:${clean(materialization.id)}`, materialization.id, factoryQa.id, browserQa.id, CHANNEL_ID, materialization.distribution_hash);
  }
}

export async function createCleanAvOwnerTaskIfEligibleAuthorized(db: CleanAvDB) { await maybeCreateOwnerTask(db); }

export async function runCleanAvFactoryQaAuthorized(args: { db: CleanAvDB; bucket: CleanAvBucket; openAiApiKey: string; actor: string; idempotencyKey: string }) {
  if (!/^[A-Za-z0-9._:-]{16,160}$/.test(args.idempotencyKey)) throw new CleanAvMasterError("IDEMPOTENCY_KEY_INVALID", 400, "A stable 16–160 character idempotency-key is required");
  const priorRun = await first(args.db, "SELECT * FROM v7_evaluation_clean_av_factory_qa_runs WHERE channel_id=? AND idempotency_key=? LIMIT 1", CHANNEL_ID, args.idempotencyKey);
  if (priorRun) {
    if (clean(priorRun.lifecycle_state) === "COMPLETE") return { outcome: "REPLAYED", snapshot: await cleanAvMasterSnapshot(args.db) };
    throw new CleanAvMasterError("CLEAN_AV_FACTORY_QA_ALREADY_ATTEMPTED", 409, `The immutable Factory A/V QA attempt is ${clean(priorRun.lifecycle_state)}`);
  }
  const [policy, materialization, sourceQa, existingRun, existingReceipt] = await Promise.all([
    first(args.db, "SELECT * FROM v7_evaluation_clean_av_factory_qa_policies WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, CLEAN_AV_FACTORY_QA_VERSION),
    first(args.db, "SELECT * FROM v7_evaluation_clean_av_master_materialization_receipts WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, CLEAN_AV_MASTER_MATERIALIZATION_VERSION),
    first(args.db, `SELECT q.id,q.decision_state,q.overall_score,q.p0_count,q.p1_count FROM v7_evaluation_clean_audio_control_eligibility_receipts c
      JOIN v7_evaluation_factory_audio_qa_recovery_receipts q ON q.id=c.qa_recovery_receipt_id
      WHERE c.channel_id=? AND c.decision_state='ELIGIBLE_CLEAN_CONTROL_REFERENCE' LIMIT 1`, CHANNEL_ID),
    first(args.db, "SELECT id FROM v7_evaluation_clean_av_factory_qa_runs WHERE channel_id=? LIMIT 1", CHANNEL_ID),
    first(args.db, "SELECT id FROM v7_evaluation_clean_av_factory_qa_receipts WHERE channel_id=? LIMIT 1", CHANNEL_ID),
  ]);
  if (!policy || !materialization || !sourceQa || clean(materialization.technical_qa_state) !== "PASS" || clean(materialization.rights_state) !== "PASS") throw new CleanAvMasterError("CLEAN_AV_FACTORY_QA_PREREQUISITES_MISSING", 409, "Technical PASS, Rights PASS and the exact source-audio QA receipt are required");
  if (clean(sourceQa.decision_state) !== "LIKELY_CLEAN" || number(sourceQa.p0_count) !== 0 || number(sourceQa.p1_count) !== 0) throw new CleanAvMasterError("CLEAN_AV_SOURCE_AUDIO_QA_FAILED", 409, "The source clean-audio independent QA must remain P0/P1 free");
  if (existingRun || existingReceipt) throw new CleanAvMasterError("CLEAN_AV_FACTORY_QA_CEILING_REACHED", 409, "The one-request Factory A/V QA ceiling has already been reached");
  const contactObject = await args.bucket.get(clean(materialization.contact_sheet_storage_key)); if (!contactObject) throw new CleanAvMasterError("CLEAN_AV_CONTACT_SHEET_MISSING", 404, "The exact contact sheet is missing from R2");
  const contactBytes = new Uint8Array(await contactObject.arrayBuffer()), contactHash = await sha256Hex(contactBytes);
  if (contactHash !== clean(materialization.contact_sheet_hash) || contactBytes.byteLength !== number(materialization.contact_sheet_bytes)) throw new CleanAvMasterError("CLEAN_AV_CONTACT_SHEET_HASH_MISMATCH", 409, "The contact sheet differs from the materialization receipt");
  const requestHash = await canonicalHash({ policyVersion: CLEAN_AV_FACTORY_QA_VERSION, materializationReceiptId: materialization.id, distributionHash: materialization.distribution_hash, contactSheetHash: contactHash, sourceAudioQaReceiptId: sourceQa.id, modelId: policy.model_id });
  const runId = id("clean-av-factory-qa-run");
  await run(args.db, `INSERT INTO v7_evaluation_clean_av_factory_qa_runs
    (id,materialization_receipt_id,channel_id,policy_version,idempotency_key,request_hash,lifecycle_state,reserved_spend_usd,actor)
    VALUES (?,?,?,'CLEAN_AV_FACTORY_QA_V1',?,?,'PLANNED',0.50,?)`, runId, materialization.id, CHANNEL_ID, args.idempotencyKey, requestHash, args.actor);
  try {
    await run(args.db, "UPDATE v7_evaluation_clean_av_factory_qa_runs SET lifecycle_state='RUNNING' WHERE id=?", runId);
    const schema = { type: "object", additionalProperties: false, properties: {
      overall: { type: "integer", minimum: 0, maximum: 100 },
      dimensions: { type: "object", additionalProperties: false, properties: Object.fromEntries(QA_DIMENSIONS.map((key) => [key, { type: "integer", minimum: 0, maximum: 100 }])), required: [...QA_DIMENSIONS] },
      p0Count: { type: "integer", minimum: 0 }, p1Count: { type: "integer", minimum: 0 },
      findings: { type: "array", items: { type: "object", additionalProperties: false, properties: { timecode: { type: "string" }, severity: { type: "string", enum: ["P0", "P1", "P2", "P3"] }, defect: { type: "string" }, evidence: { type: "string" } }, required: ["timecode", "severity", "defect", "evidence"] } },
      rationale: { type: "string" },
    }, required: ["overall", "dimensions", "p0Count", "p1Count", "findings", "rationale"] };
    const prompt = `Act as an independent adversarial QA reviewer for one evaluation-only clean audio-visual control. The image is a chronological six-frame contact sheet from the exact 35-second master. The already sealed source audio independently passed at ${number(sourceQa.overall_score)}/100 with P0=0 and P1=0; do not claim you heard video audio. Judge visible semantic alignment with the authorization-clearing-settlement narration, visual clarity, meaningful motion progression across frames, mobile legibility, and clear differentiation of the three transaction states. A clean verdict requires overall >=92, every dimension >=90, P0=0 and P1=0. Return strict structured evidence only. Technical measurements separately passed: 1920x1080 and 1280x720 VP9/Opus, 30fps, 48kHz, exact lineage, checksums and A/V end delta ${number(materialization.av_end_delta_ms).toFixed(1)}ms.`;
    const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${args.openAiApiKey}`, "content-type": "application/json", "idempotency-key": args.idempotencyKey }, body: JSON.stringify({ model: clean(policy.model_id), reasoning: { effort: "high" }, input: [{ role: "user", content: [{ type: "input_text", text: prompt }, { type: "input_image", image_url: `data:image/jpeg;base64,${base64(contactBytes)}`, detail: "high" }] }], text: { format: { type: "json_schema", name: "clean_av_master_qa", strict: true, schema } } }), signal: AbortSignal.timeout(180_000) });
    await run(args.db, "UPDATE v7_evaluation_clean_av_factory_qa_runs SET provider_requests=1 WHERE id=?", runId);
    if (!response.ok) throw new CleanAvMasterError("CLEAN_AV_FACTORY_QA_PROVIDER_FAILED", 502, `OpenAI visual QA failed (${response.status})`);
    const responseText = await response.text(); if (!responseText || responseText.length > 2_000_000) throw new CleanAvMasterError("CLEAN_AV_FACTORY_QA_RESPONSE_INVALID", 502, "OpenAI returned an invalid bounded response");
    const payload = jsonObject(responseText); if (!payload) throw new CleanAvMasterError("CLEAN_AV_FACTORY_QA_RESPONSE_INVALID", 502, "OpenAI returned a non-JSON response");
    const providerResponseId = clean(payload.id); if (!providerResponseId) throw new CleanAvMasterError("CLEAN_AV_FACTORY_QA_RESPONSE_ID_MISSING", 502, "OpenAI returned no provider response ID");
    const usage = measureOpenAIUsage(payload, clean(policy.model_id));
    if (!Number.isFinite(usage.actualUsd) || usage.actualUsd < 0 || usage.actualUsd > number(policy.reserved_spend_ceiling_usd)) throw new CleanAvMasterError("CLEAN_AV_FACTORY_QA_SPEND_CEILING_EXCEEDED", 409, "Measured usage exceeded the reserved Factory A/V QA ceiling");
    const audit = jsonObject(outputText(payload)); if (!audit) throw new CleanAvMasterError("CLEAN_AV_FACTORY_QA_OUTPUT_INVALID", 502, "OpenAI returned no strict QA evidence");
    const dimensions = jsonObject(audit.dimensions); if (!dimensions || QA_DIMENSIONS.some((key) => !Number.isFinite(number(dimensions[key])) || number(dimensions[key]) < 0 || number(dimensions[key]) > 100)) throw new CleanAvMasterError("CLEAN_AV_FACTORY_QA_DIMENSIONS_INVALID", 502, "OpenAI omitted a bounded QA dimension");
    const overall = Math.trunc(number(audit.overall)), p0 = Math.max(0, Math.trunc(number(audit.p0Count))), p1 = Math.max(0, Math.trunc(number(audit.p1Count))), findings = Array.isArray(audit.findings) ? audit.findings : [], rationale = clean(audit.rationale);
    if (overall < 0 || overall > 100 || rationale.length < 12) throw new CleanAvMasterError("CLEAN_AV_FACTORY_QA_VERDICT_INVALID", 502, "OpenAI returned an invalid QA verdict");
    const likelyClean = overall >= number(policy.overall_floor) && QA_DIMENSIONS.every((key) => number(dimensions[key]) >= number(policy.dimension_floor)) && p0 === 0 && p1 === 0;
    const decision = likelyClean ? "LIKELY_CLEAN" : "LIKELY_DEFECT_PRESENT";
    const responseBytes = new TextEncoder().encode(responseText), responseHash = await sha256Hex(responseBytes), responseKey = `evaluation/controlled-fixtures/v1/clean-av/factory-qa/${responseHash}.json`;
    await args.bucket.put(responseKey, responseBytes, { httpMetadata: { contentType: "application/json" }, customMetadata: { sha256: responseHash, runId, policyVersion: CLEAN_AV_FACTORY_QA_VERSION } });
    const stored = await args.bucket.get(responseKey); if (!stored || await sha256Hex(new Uint8Array(await stored.arrayBuffer())) !== responseHash) throw new CleanAvMasterError("CLEAN_AV_FACTORY_QA_RESPONSE_READBACK_FAILED", 503, "The exact provider response did not pass R2 read-back");
    const receiptId = id("clean-av-factory-qa-receipt"), evidenceHash = await canonicalHash({ runId, materializationReceiptId: materialization.id, distributionHash: materialization.distribution_hash, contactHash, sourceAudioQaReceiptId: sourceQa.id, providerResponseId, responseHash, decision, overall, dimensions, p0, p1, findings, rationale, usage });
    await run(args.db, `INSERT INTO v7_evaluation_clean_av_factory_qa_receipts
      (id,run_id,materialization_receipt_id,channel_id,policy_version,distribution_hash,contact_sheet_hash,source_audio_qa_receipt_id,source_audio_qa_state,model_id,provider_response_id,provider_response_storage_key,provider_response_hash,provider_response_readback_hash,decision_state,overall_score,dimensions_json,p0_count,p1_count,findings_json,rationale,usage_json,actual_spend_usd,authority_boundary,evidence_hash)
      VALUES (?,?,?,?,?,?,?,?,?,'gpt-5.6',?,?,?,?,?,?,?,?,?,?,?,?,?,'INDEPENDENT_REVIEW_ONLY',?)`, receiptId, runId, materialization.id, CHANNEL_ID, CLEAN_AV_FACTORY_QA_VERSION, materialization.distribution_hash, contactHash, sourceQa.id, "LIKELY_CLEAN", providerResponseId, responseKey, responseHash, responseHash, decision, overall, canonicalStringify(dimensions), p0, p1, canonicalStringify(findings), rationale, canonicalStringify(usage), usage.actualUsd, evidenceHash);
    await run(args.db, "UPDATE v7_evaluation_clean_av_factory_qa_runs SET lifecycle_state='COMPLETE',actual_spend_usd=?,completed_at=? WHERE id=?", usage.actualUsd, now(), runId);
    await maybeCreateOwnerTask(args.db);
    return { outcome: decision, snapshot: await cleanAvMasterSnapshot(args.db) };
  } catch (error) {
    const known = error instanceof CleanAvMasterError ? error : new CleanAvMasterError("UNEXPECTED_CLEAN_AV_FACTORY_QA_FAILURE", 500, "Unexpected Factory A/V QA failure");
    await run(args.db, "UPDATE v7_evaluation_clean_av_factory_qa_runs SET lifecycle_state='FAILED',error_code=?,completed_at=? WHERE id=?", known.code, now(), runId).catch(() => undefined);
    throw known;
  }
}

export async function recordCleanAvBrowserQaAuthorized(args: { db: CleanAvDB; actor: string; idempotencyKey: string; materializationReceiptId: string; distributionHash: string; playbackCoverageRatio: number; pauseResumeObserved: boolean; seekObserved: boolean; endedObserved: boolean; audioTrackObserved: boolean; meaningfulMotionObserved: boolean; mobileLegibilityObserved: boolean; focusReflowObserved: boolean; pageErrorCount: number; decisionState: string; observations: unknown[]; deferOwnerTask?: boolean }) {
  if (!/^[A-Za-z0-9._:-]{16,160}$/.test(args.idempotencyKey)) throw new CleanAvMasterError("IDEMPOTENCY_KEY_INVALID", 400, "A stable 16–160 character idempotency-key is required");
  const requestHash = await canonicalHash({
    policyVersion: CLEAN_AV_BROWSER_QA_VERSION,
    actor: args.actor,
    idempotencyKey: args.idempotencyKey,
    materializationReceiptId: args.materializationReceiptId,
    distributionHash: args.distributionHash,
    playbackCoverageRatio: args.playbackCoverageRatio,
    pauseResumeObserved: args.pauseResumeObserved,
    seekObserved: args.seekObserved,
    endedObserved: args.endedObserved,
    audioTrackObserved: args.audioTrackObserved,
    meaningfulMotionObserved: args.meaningfulMotionObserved,
    mobileLegibilityObserved: args.mobileLegibilityObserved,
    focusReflowObserved: args.focusReflowObserved,
    pageErrorCount: args.pageErrorCount,
    decisionState: args.decisionState,
    observations: args.observations,
  });
  const prior = await first(args.db, "SELECT * FROM v7_evaluation_clean_av_browser_qa_receipts WHERE channel_id=? AND idempotency_key=? LIMIT 1", CHANNEL_ID, args.idempotencyKey);
  if (prior) {
    if (clean(prior.request_hash) !== requestHash) throw new CleanAvMasterError("CLEAN_AV_BROWSER_QA_IDEMPOTENCY_CONFLICT", 409, "The idempotency key is bound to a different Browser QA intent");
    return { outcome: "REPLAYED", snapshot: await cleanAvMasterSnapshot(args.db) };
  }
  const [materialization, existing] = await Promise.all([
    first(args.db, "SELECT * FROM v7_evaluation_clean_av_master_materialization_receipts WHERE id=? AND channel_id=? LIMIT 1", args.materializationReceiptId, CHANNEL_ID),
    first(args.db, "SELECT id FROM v7_evaluation_clean_av_browser_qa_receipts WHERE channel_id=? LIMIT 1", CHANNEL_ID),
  ]);
  if (!materialization || existing) throw new CleanAvMasterError(existing ? "CLEAN_AV_BROWSER_QA_CEILING_REACHED" : "CLEAN_AV_BROWSER_QA_MASTER_NOT_FOUND", 409, existing ? "The single Browser QA receipt already exists" : "The exact materialized master was not found");
  if (args.distributionHash.toLowerCase() !== clean(materialization.distribution_hash)) throw new CleanAvMasterError("CLEAN_AV_BROWSER_QA_HASH_MISMATCH", 409, "Browser QA must bind the exact distribution master hash");
  const decision = clean(args.decisionState).toUpperCase(); if (!["LIKELY_CLEAN", "LIKELY_DEFECT_PRESENT", "UNCERTAIN"].includes(decision)) throw new CleanAvMasterError("CLEAN_AV_BROWSER_QA_DECISION_INVALID", 400, "Use a supported fail-closed Browser QA decision");
  const allPass = args.playbackCoverageRatio >= 0.98 && args.pauseResumeObserved && args.seekObserved && args.endedObserved && args.audioTrackObserved && args.meaningfulMotionObserved && args.mobileLegibilityObserved && args.focusReflowObserved && args.pageErrorCount === 0;
  if (decision === "LIKELY_CLEAN" && !allPass) throw new CleanAvMasterError("CLEAN_AV_BROWSER_QA_PASS_EVIDENCE_INCOMPLETE", 409, "A likely-clean Browser receipt requires full playback, interaction, audio, motion, legibility, reflow and zero-error evidence");
  const receiptId = id("clean-av-browser-qa-receipt"), evidenceHash = await canonicalHash({ materializationReceiptId: materialization.id, distributionHash: materialization.distribution_hash, playbackCoverageRatio: args.playbackCoverageRatio, pauseResumeObserved: args.pauseResumeObserved, seekObserved: args.seekObserved, endedObserved: args.endedObserved, audioTrackObserved: args.audioTrackObserved, meaningfulMotionObserved: args.meaningfulMotionObserved, mobileLegibilityObserved: args.mobileLegibilityObserved, focusReflowObserved: args.focusReflowObserved, pageErrorCount: args.pageErrorCount, decision, observations: args.observations, actor: args.actor });
  await run(args.db, `INSERT INTO v7_evaluation_clean_av_browser_qa_receipts
    (id,materialization_receipt_id,channel_id,policy_version,distribution_hash,playback_coverage_ratio,pause_resume_observed,seek_observed,ended_observed,audio_track_observed,meaningful_motion_observed,mobile_legibility_observed,focus_reflow_observed,page_error_count,decision_state,observations_json,actor,idempotency_key,request_hash,evidence_hash,authority_boundary)
    VALUES (?,?,?,'CLEAN_AV_BROWSER_QA_V1',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'INDEPENDENT_BROWSER_REVIEW_ONLY')`, receiptId, materialization.id, CHANNEL_ID, materialization.distribution_hash, args.playbackCoverageRatio, args.pauseResumeObserved ? 1 : 0, args.seekObserved ? 1 : 0, args.endedObserved ? 1 : 0, args.audioTrackObserved ? 1 : 0, args.meaningfulMotionObserved ? 1 : 0, args.mobileLegibilityObserved ? 1 : 0, args.focusReflowObserved ? 1 : 0, args.pageErrorCount, decision, canonicalStringify(args.observations), args.actor, args.idempotencyKey, requestHash, evidenceHash);
  if (!args.deferOwnerTask) await maybeCreateOwnerTask(args.db);
  return { outcome: decision, snapshot: await cleanAvMasterSnapshot(args.db) };
}
