import { canonicalHash, sha256Hex } from "@/lib/canonical-json";
import { CLEAN_AUDIO_OWNER_DEFECT_KEYS } from "@/lib/clean-audio-owner-ground-truth";

export const CLEAN_AUDIO_CONTROL_ELIGIBILITY_VERSION = "CLEAN_AUDIO_CONTROL_ELIGIBILITY_V1" as const;

type Row = Record<string, unknown>;
type RunResult = { meta?: { changes?: number } };
type Statement = { bind(...values: unknown[]): Statement; first<T = Row>(): Promise<T | null>; run(): Promise<RunResult> };
export type CleanAudioEligibilityDB = { prepare(query: string): Statement };
type StoredObject = { arrayBuffer(): Promise<ArrayBuffer> };
export type CleanAudioEligibilityBucket = { get(key: string): Promise<StoredObject | null> };

const CHANNEL_ID = "channel-hidden-systems";
const clean = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
async function first(db: CleanAudioEligibilityDB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values).first<Row>(); }
async function run(db: CleanAudioEligibilityDB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values).run(); }

export class CleanAudioControlEligibilityError extends Error {
  constructor(public code: string, public status: number, message: string) { super(message); }
}

export async function cleanAudioControlEligibilitySnapshot(db: CleanAudioEligibilityDB) {
  const [policy, task, receipt, baseline] = await Promise.all([
    first(db, "SELECT * FROM v7_evaluation_clean_audio_control_eligibility_policies WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, CLEAN_AUDIO_CONTROL_ELIGIBILITY_VERSION),
    first(db, "SELECT * FROM v7_evaluation_clean_audio_control_eligibility_tasks WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, CLEAN_AUDIO_CONTROL_ELIGIBILITY_VERSION),
    first(db, "SELECT * FROM v7_evaluation_clean_audio_control_eligibility_receipts WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, CLEAN_AUDIO_CONTROL_ELIGIBILITY_VERSION),
    first(db, "SELECT * FROM v7_evaluation_regression_readiness_snapshots WHERE channel_id=? AND policy_version='WP7_REGRESSION_CORPUS_POLICY_V1' LIMIT 1", CHANNEL_ID),
  ]);
  return {
    policy: policy ? {
      maximumEligibilityReceipts: number(policy.maximum_eligibility_receipts),
      exactByteReadbackRequired: Boolean(number(policy.exact_byte_readback_required)),
      authorityBoundary: clean(policy.authority_boundary),
      providerRequests: number(policy.provider_requests),
      spendUsd: number(policy.spend_usd),
    } : null,
    task: task ? {
      id: clean(task.id), blueprintId: clean(task.blueprint_id), artifactId: clean(task.artifact_id),
      rightsReceiptId: clean(task.rights_receipt_id), qaRecoveryReceiptId: clean(task.qa_recovery_receipt_id),
      ownerReceiptId: clean(task.owner_receipt_id), exactArtifactHash: clean(task.exact_artifact_hash),
      state: receipt ? "COMPLETE" : clean(task.task_state), createdAt: clean(task.created_at),
    } : null,
    receipt: receipt ? {
      id: clean(receipt.id), decisionState: clean(receipt.decision_state), bytesState: clean(receipt.bytes_state),
      checksumState: clean(receipt.checksum_state), provenanceState: clean(receipt.provenance_state),
      rightsState: clean(receipt.rights_state), factoryQaState: clean(receipt.factory_qa_state),
      ownerGroundTruthState: clean(receipt.owner_ground_truth_state), referenceEligible: Boolean(number(receipt.reference_eligible)),
      candidateItemsAfter: number(receipt.candidate_items_after), ownerConfirmedReferencesAfter: number(receipt.owner_confirmed_references_after),
      cleanNegativeControlsAfter: number(receipt.clean_negative_controls_after), controlledInjectionFixturesAfter: number(receipt.controlled_injection_fixtures_after),
      p0FamiliesCoveredAfter: number(receipt.p0_families_covered_after), p0FamiliesRequired: number(receipt.p0_families_required),
      readinessState: clean(receipt.readiness_state), authorityBoundary: clean(receipt.authority_boundary),
      evidenceHash: clean(receipt.evidence_hash), createdAt: clean(receipt.created_at),
    } : null,
    baseline: baseline ? {
      candidateItems: number(baseline.candidate_items), ownerConfirmedReferences: number(baseline.owner_confirmed_references),
      cleanNegativeControls: number(baseline.clean_negative_controls), controlledInjectionFixtures: number(baseline.controlled_injection_fixtures),
      p0FamiliesCovered: number(baseline.p0_families_covered), p0FamiliesRequired: number(baseline.p0_families_required),
    } : null,
  };
}

export async function evaluateCleanAudioControlEligibilityAuthorized(args: {
  db: CleanAudioEligibilityDB;
  bucket: CleanAudioEligibilityBucket;
  actor: string;
  idempotencyKey: string;
  taskId: string;
  artifactId: string;
  expectedArtifactHash: string;
}) {
  const { db, bucket, actor, idempotencyKey } = args;
  if (!/^[A-Za-z0-9._:-]{16,160}$/.test(idempotencyKey)) throw new CleanAudioControlEligibilityError("IDEMPOTENCY_KEY_INVALID", 400, "A stable 16–160 character idempotency-key is required");
  const expectedArtifactHash = clean(args.expectedArtifactHash).toLowerCase();
  const requestHash = await canonicalHash({ policyVersion: CLEAN_AUDIO_CONTROL_ELIGIBILITY_VERSION, taskId: args.taskId, artifactId: args.artifactId, expectedArtifactHash, actor });
  const prior = await first(db, "SELECT * FROM v7_evaluation_clean_audio_control_eligibility_receipts WHERE channel_id=? AND idempotency_key=? LIMIT 1", CHANNEL_ID, idempotencyKey);
  if (prior) {
    if (clean(prior.request_hash) !== requestHash) throw new CleanAudioControlEligibilityError("CLEAN_AUDIO_CONTROL_IDEMPOTENCY_INTENT_CONFLICT", 409, "The idempotency key is already bound to a different eligibility intent");
    return { outcome: "REPLAYED", snapshot: await cleanAudioControlEligibilitySnapshot(db) };
  }
  const [policy, task, artifact, rights, qaReceipt, ownerReceipt, providerReceipt, blueprint, baseline, anyReceipt] = await Promise.all([
    first(db, "SELECT * FROM v7_evaluation_clean_audio_control_eligibility_policies WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, CLEAN_AUDIO_CONTROL_ELIGIBILITY_VERSION),
    first(db, "SELECT * FROM v7_evaluation_clean_audio_control_eligibility_tasks WHERE id=? AND channel_id=? AND policy_version=? LIMIT 1", args.taskId, CHANNEL_ID, CLEAN_AUDIO_CONTROL_ELIGIBILITY_VERSION),
    first(db, "SELECT * FROM v7_evaluation_commercial_clean_audio_artifacts WHERE id=? AND channel_id=? LIMIT 1", args.artifactId, CHANNEL_ID),
    first(db, "SELECT * FROM v7_evaluation_commercial_clean_audio_rights_receipts WHERE artifact_id=? AND channel_id=? LIMIT 1", args.artifactId, CHANNEL_ID),
    first(db, "SELECT * FROM v7_evaluation_factory_audio_qa_recovery_receipts WHERE artifact_id=? AND channel_id=? LIMIT 1", args.artifactId, CHANNEL_ID),
    first(db, "SELECT * FROM v7_evaluation_clean_audio_owner_ground_truth_receipts WHERE artifact_id=? AND channel_id=? LIMIT 1", args.artifactId, CHANNEL_ID),
    first(db, `SELECT p.* FROM v7_evaluation_commercial_clean_audio_provider_receipts p
      JOIN v7_evaluation_commercial_clean_audio_artifacts a ON a.provider_receipt_id=p.id
      WHERE a.id=? AND a.channel_id=? LIMIT 1`, args.artifactId, CHANNEL_ID),
    first(db, "SELECT * FROM v7_evaluation_controlled_fixture_blueprints WHERE id=(SELECT blueprint_id FROM v7_evaluation_clean_audio_control_eligibility_tasks WHERE id=?) LIMIT 1", args.taskId),
    first(db, "SELECT * FROM v7_evaluation_regression_readiness_snapshots WHERE channel_id=? AND policy_version='WP7_REGRESSION_CORPUS_POLICY_V1' LIMIT 1", CHANNEL_ID),
    first(db, "SELECT id FROM v7_evaluation_clean_audio_control_eligibility_receipts WHERE channel_id=? LIMIT 1", CHANNEL_ID),
  ]);
  if (!policy || !task || !artifact || !rights || !qaReceipt || !ownerReceipt || !providerReceipt || !blueprint || !baseline) throw new CleanAudioControlEligibilityError("CLEAN_AUDIO_CONTROL_PREREQUISITES_MISSING", 409, "The sealed policy, task, artifact, rights, QA, owner, provider and baseline evidence are required");
  if (anyReceipt) throw new CleanAudioControlEligibilityError("CLEAN_AUDIO_CONTROL_ELIGIBILITY_CEILING_REACHED", 409, "The single clean-control eligibility receipt has already been recorded");
  if (clean(task.artifact_id) !== clean(artifact.id) || clean(task.rights_receipt_id) !== clean(rights.id) || clean(task.qa_recovery_receipt_id) !== clean(qaReceipt.id) || clean(task.owner_receipt_id) !== clean(ownerReceipt.id) || clean(task.blueprint_id) !== clean(blueprint.id)) throw new CleanAudioControlEligibilityError("CLEAN_AUDIO_CONTROL_TASK_BINDING_MISMATCH", 409, "The eligibility task does not bind the exact evidence chain");
  if (expectedArtifactHash.length !== 64 || [artifact.sha256, task.exact_artifact_hash, qaReceipt.exact_artifact_hash, ownerReceipt.exact_artifact_hash, providerReceipt.exact_response_hash, providerReceipt.r2_readback_hash].some((value) => clean(value).toLowerCase() !== expectedArtifactHash)) throw new CleanAudioControlEligibilityError("CLEAN_AUDIO_CONTROL_HASH_BINDING_MISMATCH", 409, "Every evidence record must bind the exact sealed audio hash");
  let ownerDefects: unknown[] = []; try { ownerDefects = JSON.parse(clean(ownerReceipt.observed_defects_json)); } catch { ownerDefects = ["INVALID_JSON"]; }
  if (clean(blueprint.blueprint_key) !== "CLEAN_AUDIO_NEGATIVE" || clean(blueprint.fixture_role) !== "CLEAN_NEGATIVE" || clean(blueprint.candidate_kind) !== "AUDIO") throw new CleanAudioControlEligibilityError("CLEAN_AUDIO_CONTROL_BLUEPRINT_MISMATCH", 409, "The task must bind the sealed clean-audio negative blueprint");
  if (clean(artifact.materialization_state) !== "BYTES_PROVIDER_ENTITLEMENT_AND_RIGHTS_VERIFIED" || clean(artifact.rights_state) !== "PASS" || clean(rights.rights_state) !== "PASS" || clean(providerReceipt.rights_state) !== "PASS" || !clean(providerReceipt.provider_native_request_id) || number(providerReceipt.r2_readback_verified) !== 1) throw new CleanAudioControlEligibilityError("CLEAN_AUDIO_CONTROL_RIGHTS_OR_PROVENANCE_FAILED", 409, "Verified provider provenance, R2 read-back and commercial Rights PASS are required");
  if (clean(qaReceipt.decision_state) !== "LIKELY_CLEAN" || number(qaReceipt.p0_count) !== 0 || number(qaReceipt.p1_count) !== 0 || clean(qaReceipt.authority_boundary) !== "INDEPENDENT_REVIEW_ONLY") throw new CleanAudioControlEligibilityError("CLEAN_AUDIO_CONTROL_FACTORY_QA_FAILED", 409, "A likely-clean independent Factory receipt with zero P0/P1 is required");
  if (clean(ownerReceipt.decision_state) !== "CLEAN_CONFIRMED" || number(ownerReceipt.full_listen_attested) !== 1 || ownerDefects.length !== 0 || clean(ownerReceipt.authority_boundary) !== "OWNER_GROUND_TRUTH_ONLY") throw new CleanAudioControlEligibilityError("CLEAN_AUDIO_CONTROL_OWNER_GROUND_TRUTH_FAILED", 409, "A full-listen clean owner receipt with no observed defects is required");
  const object = await bucket.get(clean(artifact.storage_key));
  if (!object) throw new CleanAudioControlEligibilityError("CLEAN_AUDIO_CONTROL_ARTIFACT_MISSING", 404, "The exact clean-control audio is missing from R2");
  const bytes = new Uint8Array(await object.arrayBuffer()), readbackHash = await sha256Hex(bytes);
  if (readbackHash !== expectedArtifactHash || bytes.byteLength !== number(artifact.byte_size)) throw new CleanAudioControlEligibilityError("CLEAN_AUDIO_CONTROL_R2_HASH_MISMATCH", 409, "The current R2 bytes differ from the sealed clean-control artifact");
  const labels = CLEAN_AUDIO_OWNER_DEFECT_KEYS.map((defectKey) => ({ defectKey, status: "ABSENT", source: "OWNER_CLEAN_CONFIRMED" }));
  const candidateItemsAfter = number(baseline.candidate_items) + 1;
  const ownerConfirmedReferencesAfter = number(baseline.owner_confirmed_references) + 1;
  const cleanNegativeControlsAfter = number(baseline.clean_negative_controls) + 1;
  const controlledInjectionFixturesAfter = number(baseline.controlled_injection_fixtures);
  const p0FamiliesCoveredAfter = number(baseline.p0_families_covered), p0FamiliesRequired = number(baseline.p0_families_required);
  const receiptId = id("clean-audio-control-eligibility-receipt");
  const evidenceHash = await canonicalHash({ receiptId, requestHash, blueprintId: blueprint.id, artifactId: artifact.id, rightsReceiptId: rights.id, qaRecoveryReceiptId: qaReceipt.id, ownerReceiptId: ownerReceipt.id, exactArtifactHash: expectedArtifactHash, r2ReadbackHash: readbackHash, labels, candidateItemsAfter, ownerConfirmedReferencesAfter, cleanNegativeControlsAfter, controlledInjectionFixturesAfter, p0FamiliesCoveredAfter, p0FamiliesRequired, readinessState: "INSUFFICIENT_GROUND_TRUTH", authorityBoundary: "CLEAN_CONTROL_REFERENCE_ONLY" });
  await run(db, `INSERT INTO v7_evaluation_clean_audio_control_eligibility_receipts
    (id,task_id,channel_id,policy_version,blueprint_id,artifact_id,rights_receipt_id,qa_recovery_receipt_id,owner_receipt_id,exact_artifact_hash,r2_readback_hash,r2_readback_bytes,fixture_role,candidate_kind,decision_state,bytes_state,checksum_state,provenance_state,rights_state,factory_qa_state,owner_ground_truth_state,audio_observable_labels_json,lineage_group_key,independent_count_eligible,reference_eligible,candidate_items_after,owner_confirmed_references_after,clean_negative_controls_after,controlled_injection_fixtures_after,p0_families_covered_after,p0_families_required,readiness_state,actor,idempotency_key,request_hash,evidence_hash,authority_boundary)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'CLEAN_NEGATIVE','AUDIO','ELIGIBLE_CLEAN_CONTROL_REFERENCE','READBACK_VERIFIED','PASS','PASS','PASS','LIKELY_CLEAN','CLEAN_CONFIRMED',?,'controlled-fixture:clean-audio:v1',1,1,?,?,?,?,?,?,'INSUFFICIENT_GROUND_TRUTH',?,?,?,?, 'CLEAN_CONTROL_REFERENCE_ONLY')`,
    receiptId, task.id, CHANNEL_ID, CLEAN_AUDIO_CONTROL_ELIGIBILITY_VERSION, blueprint.id, artifact.id, rights.id, qaReceipt.id, ownerReceipt.id, expectedArtifactHash, readbackHash, bytes.byteLength,
    JSON.stringify(labels), candidateItemsAfter, ownerConfirmedReferencesAfter, cleanNegativeControlsAfter, controlledInjectionFixturesAfter, p0FamiliesCoveredAfter, p0FamiliesRequired,
    actor, idempotencyKey, requestHash, evidenceHash);
  return { outcome: "RECORDED", snapshot: await cleanAudioControlEligibilitySnapshot(db) };
}
