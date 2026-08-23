import { canonicalHash, sha256Hex } from "@/lib/canonical-json";

export const CLEAN_AUDIO_OWNER_GROUND_TRUTH_VERSION = "CLEAN_AUDIO_OWNER_GROUND_TRUTH_V1" as const;
export const CLEAN_AUDIO_OWNER_DEFECT_KEYS = [
  "ROBOTIC_OR_STITCHED_VOICE",
  "PRONUNCIATION_ERROR",
  "UNNATURAL_PACING_OR_PROSODY",
  "AUDIO_SEAM_OR_INTERRUPTION",
  "NOISE_CLICK_STATIC_OR_CLIPPING",
  "INCONSISTENT_LOUDNESS",
  "LISTENER_FATIGUE",
  "SEMANTIC_DELIVERY_CONFUSION",
] as const;

type Row = Record<string, unknown>;
type RunResult = { meta?: { changes?: number } };
type Statement = { bind(...values: unknown[]): Statement; first<T = Row>(): Promise<T | null>; run(): Promise<RunResult> };
export type CleanAudioOwnerDB = { prepare(query: string): Statement };
type StoredObject = { arrayBuffer(): Promise<ArrayBuffer> };
export type CleanAudioOwnerBucket = { get(key: string): Promise<StoredObject | null> };

const CHANNEL_ID = "channel-hidden-systems";
const clean = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
async function first(db: CleanAudioOwnerDB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values).first<Row>(); }
async function run(db: CleanAudioOwnerDB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values).run(); }

export class CleanAudioOwnerGroundTruthError extends Error {
  constructor(public code: string, public status: number, message: string) { super(message); }
}

export async function cleanAudioOwnerGroundTruthSnapshot(db: CleanAudioOwnerDB) {
  const [policy, task, receipt] = await Promise.all([
    first(db, "SELECT * FROM v7_evaluation_clean_audio_owner_ground_truth_policies WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, CLEAN_AUDIO_OWNER_GROUND_TRUTH_VERSION),
    first(db, "SELECT * FROM v7_evaluation_clean_audio_owner_ground_truth_tasks WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, CLEAN_AUDIO_OWNER_GROUND_TRUTH_VERSION),
    first(db, "SELECT * FROM v7_evaluation_clean_audio_owner_ground_truth_receipts WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, CLEAN_AUDIO_OWNER_GROUND_TRUTH_VERSION),
  ]);
  return {
    policy: policy ? { maximumOwnerDecisions: number(policy.maximum_owner_decisions), fullListenRequired: Boolean(number(policy.full_listen_required)), exactByteReadbackRequired: Boolean(number(policy.exact_byte_readback_required)), authorityBoundary: clean(policy.authority_boundary), providerRequests: number(policy.provider_requests), spendUsd: number(policy.spend_usd) } : null,
    task: task ? { id: clean(task.id), artifactId: clean(task.artifact_id), qaRecoveryReceiptId: clean(task.qa_recovery_receipt_id), exactArtifactHash: clean(task.exact_artifact_hash), state: receipt ? "COMPLETE" : clean(task.task_state), createdAt: clean(task.created_at) } : null,
    receipt: receipt ? { id: clean(receipt.id), decisionState: clean(receipt.decision_state), fullListenAttested: Boolean(number(receipt.full_listen_attested)), observedDefects: (() => { try { return JSON.parse(clean(receipt.observed_defects_json)); } catch { return []; } })(), rationale: clean(receipt.rationale), actor: clean(receipt.actor), evidenceHash: clean(receipt.evidence_hash), authorityBoundary: clean(receipt.authority_boundary), createdAt: clean(receipt.created_at) } : null,
  };
}

export async function recordCleanAudioOwnerGroundTruthAuthorized(args: {
  db: CleanAudioOwnerDB;
  bucket: CleanAudioOwnerBucket;
  actor: string;
  idempotencyKey: string;
  taskId: string;
  artifactId: string;
  expectedArtifactHash: string;
  decisionState: string;
  fullListenAttested: boolean;
  observedDefects: string[];
  rationale: string;
}) {
  const { db, bucket, actor, idempotencyKey } = args;
  if (!/^[A-Za-z0-9._:-]{16,160}$/.test(idempotencyKey)) throw new CleanAudioOwnerGroundTruthError("IDEMPOTENCY_KEY_INVALID", 400, "A stable 16–160 character idempotency-key is required");
  const decisionState = clean(args.decisionState).toUpperCase(), rationale = clean(args.rationale), expectedArtifactHash = clean(args.expectedArtifactHash).toLowerCase();
  if (!args.fullListenAttested) throw new CleanAudioOwnerGroundTruthError("CLEAN_AUDIO_FULL_LISTEN_REQUIRED", 422, "Listen to the exact audio from start to finish before submitting owner ground truth");
  if (!['CLEAN_CONFIRMED', 'DEFECT_REJECTED'].includes(decisionState)) throw new CleanAudioOwnerGroundTruthError("CLEAN_AUDIO_OWNER_DECISION_INVALID", 422, "Choose clean confirmed or defect rejected");
  if (rationale.length < 12 || rationale.length > 1000) throw new CleanAudioOwnerGroundTruthError("CLEAN_AUDIO_OWNER_RATIONALE_INVALID", 422, "Owner rationale must contain 12–1000 characters");
  const allowed = new Set<string>(CLEAN_AUDIO_OWNER_DEFECT_KEYS), observedDefects = [...new Set(args.observedDefects.map((value) => clean(value).toUpperCase()).filter(Boolean))].sort();
  if (observedDefects.some((key) => !allowed.has(key))) throw new CleanAudioOwnerGroundTruthError("CLEAN_AUDIO_OWNER_DEFECT_INVALID", 422, "An observed defect is outside the audio taxonomy");
  if (decisionState === "CLEAN_CONFIRMED" && observedDefects.length) throw new CleanAudioOwnerGroundTruthError("CLEAN_AUDIO_OWNER_CLEAN_WITH_DEFECTS", 422, "A clean confirmation cannot contain observed defects");
  if (decisionState === "DEFECT_REJECTED" && !observedDefects.length) throw new CleanAudioOwnerGroundTruthError("CLEAN_AUDIO_OWNER_REJECTION_REQUIRES_DEFECT", 422, "A rejection requires at least one observed defect");
  const prior = await first(db, "SELECT * FROM v7_evaluation_clean_audio_owner_ground_truth_receipts WHERE channel_id=? AND idempotency_key=? LIMIT 1", CHANNEL_ID, idempotencyKey);
  if (prior) return { outcome: "REPLAYED", snapshot: await cleanAudioOwnerGroundTruthSnapshot(db) };
  const [policy, task, artifact, qaReceipt, rights, anyReceipt] = await Promise.all([
    first(db, "SELECT * FROM v7_evaluation_clean_audio_owner_ground_truth_policies WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, CLEAN_AUDIO_OWNER_GROUND_TRUTH_VERSION),
    first(db, "SELECT * FROM v7_evaluation_clean_audio_owner_ground_truth_tasks WHERE id=? AND channel_id=? AND policy_version=? LIMIT 1", args.taskId, CHANNEL_ID, CLEAN_AUDIO_OWNER_GROUND_TRUTH_VERSION),
    first(db, "SELECT * FROM v7_evaluation_commercial_clean_audio_artifacts WHERE id=? AND channel_id=? LIMIT 1", args.artifactId, CHANNEL_ID),
    first(db, "SELECT * FROM v7_evaluation_factory_audio_qa_recovery_receipts WHERE artifact_id=? AND channel_id=? LIMIT 1", args.artifactId, CHANNEL_ID),
    first(db, "SELECT * FROM v7_evaluation_commercial_clean_audio_rights_receipts WHERE artifact_id=? AND channel_id=? LIMIT 1", args.artifactId, CHANNEL_ID),
    first(db, "SELECT id FROM v7_evaluation_clean_audio_owner_ground_truth_receipts WHERE channel_id=? LIMIT 1", CHANNEL_ID),
  ]);
  if (!policy || !task || !artifact || !qaReceipt || !rights) throw new CleanAudioOwnerGroundTruthError("CLEAN_AUDIO_OWNER_PREREQUISITES_MISSING", 409, "The exact owner task, artifact, QA receipt and rights receipt are required");
  if (anyReceipt) throw new CleanAudioOwnerGroundTruthError("CLEAN_AUDIO_OWNER_DECISION_CEILING_REACHED", 409, "The single owner ground-truth decision has already been recorded");
  if (clean(task.artifact_id) !== clean(artifact.id) || clean(task.qa_recovery_receipt_id) !== clean(qaReceipt.id)) throw new CleanAudioOwnerGroundTruthError("CLEAN_AUDIO_OWNER_TASK_BINDING_MISMATCH", 409, "The task does not bind the exact artifact and QA receipt");
  if (clean(artifact.sha256) !== expectedArtifactHash || clean(task.exact_artifact_hash) !== expectedArtifactHash || clean(qaReceipt.exact_artifact_hash) !== expectedArtifactHash) throw new CleanAudioOwnerGroundTruthError("CLEAN_AUDIO_OWNER_HASH_BINDING_MISMATCH", 409, "The owner decision does not bind the exact sealed audio hash");
  if (clean(artifact.rights_state) !== "PASS" || clean(rights.rights_state) !== "PASS" || clean(qaReceipt.decision_state) !== "LIKELY_CLEAN" || number(qaReceipt.p0_count) !== 0 || number(qaReceipt.p1_count) !== 0) throw new CleanAudioOwnerGroundTruthError("CLEAN_AUDIO_OWNER_ELIGIBILITY_FAILED", 409, "Rights PASS and a likely-clean P0/P1-free Factory receipt are required");
  const object = await bucket.get(clean(artifact.storage_key)); if (!object) throw new CleanAudioOwnerGroundTruthError("CLEAN_AUDIO_OWNER_ARTIFACT_MISSING", 404, "The exact replacement audio is missing");
  const bytes = new Uint8Array(await object.arrayBuffer()), readbackHash = await sha256Hex(bytes);
  if (readbackHash !== expectedArtifactHash || bytes.byteLength !== number(artifact.byte_size)) throw new CleanAudioOwnerGroundTruthError("CLEAN_AUDIO_OWNER_R2_HASH_MISMATCH", 409, "The audio bytes presented to the owner differ from the sealed artifact");
  const requestHash = await canonicalHash({ policyVersion: CLEAN_AUDIO_OWNER_GROUND_TRUTH_VERSION, taskId: args.taskId, artifactId: args.artifactId, qaRecoveryReceiptId: qaReceipt.id, expectedArtifactHash, decisionState, fullListenAttested: true, observedDefects, rationale, actor });
  const receiptId = id("clean-audio-owner-ground-truth-receipt"), evidenceHash = await canonicalHash({ receiptId, requestHash, exactArtifactHash: expectedArtifactHash, r2ReadbackHash: readbackHash, decisionState, observedDefects, rationale, actor, authorityBoundary: "OWNER_GROUND_TRUTH_ONLY" });
  await run(db, `INSERT INTO v7_evaluation_clean_audio_owner_ground_truth_receipts
    (id,task_id,artifact_id,qa_recovery_receipt_id,channel_id,policy_version,exact_artifact_hash,decision_state,full_listen_attested,observed_defects_json,rationale,actor,idempotency_key,request_hash,evidence_hash,authority_boundary)
    VALUES (?,?,?,?,?,?,?, ?,1,?,?,?,?,?,?,'OWNER_GROUND_TRUTH_ONLY')`, receiptId, task.id, artifact.id, qaReceipt.id, CHANNEL_ID, CLEAN_AUDIO_OWNER_GROUND_TRUTH_VERSION, expectedArtifactHash, decisionState, JSON.stringify(observedDefects), rationale, actor, idempotencyKey, requestHash, evidenceHash);
  return { outcome: "RECORDED", snapshot: await cleanAudioOwnerGroundTruthSnapshot(db) };
}
