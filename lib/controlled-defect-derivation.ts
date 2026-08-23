import { canonicalHash, canonicalStringify, sha256Hex } from "@/lib/canonical-json";

export const CONTROLLED_DEFECT_DERIVATION_VERSION = "CONTROLLED_DEFECT_DERIVATION_V1" as const;

type Row = Record<string, unknown>;
type RunResult = { meta?: { changes?: number } };
type Statement = { bind(...values: unknown[]): Statement; first<T = Row>(): Promise<T | null>; run(): Promise<RunResult> };
export type ControlledDefectDB = { prepare(query: string): Statement };
type StoredObject = { arrayBuffer(): Promise<ArrayBuffer> };
export type ControlledDefectBucket = {
  put(key: string, value: Uint8Array, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }): Promise<unknown>;
  get(key: string): Promise<StoredObject | null>;
};

const CHANNEL_ID = "channel-hidden-systems";
const clean = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
async function first(db: ControlledDefectDB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values).first<Row>(); }
async function run(db: ControlledDefectDB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values).run(); }

export class ControlledDefectDerivationError extends Error {
  constructor(public code: string, public status: number, message: string) { super(message); }
}

export async function controlledDefectDerivationSnapshot(db: ControlledDefectDB) {
  const [policy, task, receipt] = await Promise.all([
    first(db, "SELECT * FROM v7_evaluation_controlled_defect_derivation_policies WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, CONTROLLED_DEFECT_DERIVATION_VERSION),
    first(db, "SELECT * FROM v7_evaluation_controlled_defect_derivation_tasks WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, CONTROLLED_DEFECT_DERIVATION_VERSION),
    first(db, "SELECT * FROM v7_evaluation_controlled_defect_derivation_receipts WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, CONTROLLED_DEFECT_DERIVATION_VERSION),
  ]);
  return {
    policy: policy ? {
      maximumDerivatives: number(policy.maximum_derivatives), targetBlueprintKey: clean(policy.target_blueprint_key),
      mutationOperation: clean(policy.mutation_operation), oracleKind: clean(policy.oracle_kind),
      authorityBoundary: clean(policy.authority_boundary), providerRequests: number(policy.provider_requests), spendUsd: number(policy.spend_usd),
    } : null,
    task: task ? {
      id: clean(task.id), blueprintId: clean(task.blueprint_id), sourceCleanControlReceiptId: clean(task.source_clean_control_receipt_id),
      sourceArtifactId: clean(task.source_artifact_id), sourceRightsReceiptId: clean(task.source_rights_receipt_id),
      sourceArtifactHash: clean(task.source_artifact_hash), expectedDefectKey: clean(task.expected_defect_key),
      state: receipt ? "COMPLETE" : clean(task.task_state), createdAt: clean(task.created_at),
    } : null,
    receipt: receipt ? {
      id: clean(receipt.id), decisionState: clean(receipt.decision_state), expectedDefectKey: clean(receipt.expected_defect_key),
      severity: clean(receipt.severity), oracleKind: clean(receipt.oracle_kind), oracleState: clean(receipt.oracle_state),
      groundTruthAuthority: clean(receipt.ground_truth_authority), mutationIsolated: Boolean(number(receipt.mutation_isolated)),
      removedManifestKey: clean(receipt.removed_manifest_key), parentReadbackHash: clean(receipt.parent_readback_hash),
      cleanManifestHash: clean(receipt.clean_manifest_hash), mutatedManifestHash: clean(receipt.mutated_manifest_hash),
      controlledInjectionEligible: Boolean(number(receipt.controlled_injection_eligible)),
      p0FamilyCoverageEligible: Boolean(number(receipt.p0_family_coverage_eligible)),
      candidateItemsAfter: number(receipt.candidate_items_after), ownerConfirmedReferencesAfter: number(receipt.owner_confirmed_references_after),
      cleanNegativeControlsAfter: number(receipt.clean_negative_controls_after), controlledInjectionFixturesAfter: number(receipt.controlled_injection_fixtures_after),
      p0FamiliesCoveredAfter: number(receipt.p0_families_covered_after), p0FamiliesRequired: number(receipt.p0_families_required),
      readinessState: clean(receipt.readiness_state), authorityBoundary: clean(receipt.authority_boundary),
      evidenceHash: clean(receipt.evidence_hash), createdAt: clean(receipt.created_at),
    } : null,
  };
}

export async function deriveRightsLineageMissingControlAuthorized(args: {
  db: ControlledDefectDB;
  bucket: ControlledDefectBucket;
  actor: string;
  idempotencyKey: string;
  taskId: string;
  sourceArtifactId: string;
  expectedSourceArtifactHash: string;
}) {
  const { db, bucket, actor, idempotencyKey } = args;
  if (!/^[A-Za-z0-9._:-]{16,160}$/.test(idempotencyKey)) throw new ControlledDefectDerivationError("IDEMPOTENCY_KEY_INVALID", 400, "A stable 16–160 character idempotency-key is required");
  const expectedSourceArtifactHash = clean(args.expectedSourceArtifactHash).toLowerCase();
  const requestHash = await canonicalHash({ policyVersion: CONTROLLED_DEFECT_DERIVATION_VERSION, taskId: args.taskId, sourceArtifactId: args.sourceArtifactId, expectedSourceArtifactHash, actor });
  const prior = await first(db, "SELECT * FROM v7_evaluation_controlled_defect_derivation_receipts WHERE channel_id=? AND idempotency_key=? LIMIT 1", CHANNEL_ID, idempotencyKey);
  if (prior) {
    if (clean(prior.request_hash) !== requestHash) throw new ControlledDefectDerivationError("CONTROLLED_DEFECT_IDEMPOTENCY_INTENT_CONFLICT", 409, "The idempotency key is already bound to a different controlled-defect intent");
    return { outcome: "REPLAYED", snapshot: await controlledDefectDerivationSnapshot(db) };
  }
  const [policy, task, blueprint, cleanControl, artifact, rights, provider, anyReceipt] = await Promise.all([
    first(db, "SELECT * FROM v7_evaluation_controlled_defect_derivation_policies WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, CONTROLLED_DEFECT_DERIVATION_VERSION),
    first(db, "SELECT * FROM v7_evaluation_controlled_defect_derivation_tasks WHERE id=? AND channel_id=? AND policy_version=? LIMIT 1", args.taskId, CHANNEL_ID, CONTROLLED_DEFECT_DERIVATION_VERSION),
    first(db, "SELECT * FROM v7_evaluation_controlled_fixture_blueprints WHERE id=(SELECT blueprint_id FROM v7_evaluation_controlled_defect_derivation_tasks WHERE id=?) LIMIT 1", args.taskId),
    first(db, "SELECT * FROM v7_evaluation_clean_audio_control_eligibility_receipts WHERE id=(SELECT source_clean_control_receipt_id FROM v7_evaluation_controlled_defect_derivation_tasks WHERE id=?) LIMIT 1", args.taskId),
    first(db, "SELECT * FROM v7_evaluation_commercial_clean_audio_artifacts WHERE id=? AND channel_id=? LIMIT 1", args.sourceArtifactId, CHANNEL_ID),
    first(db, "SELECT * FROM v7_evaluation_commercial_clean_audio_rights_receipts WHERE id=(SELECT source_rights_receipt_id FROM v7_evaluation_controlled_defect_derivation_tasks WHERE id=?) AND channel_id=? LIMIT 1", args.taskId, CHANNEL_ID),
    first(db, `SELECT p.* FROM v7_evaluation_commercial_clean_audio_provider_receipts p
      JOIN v7_evaluation_commercial_clean_audio_artifacts a ON a.provider_receipt_id=p.id
      WHERE a.id=? AND a.channel_id=? LIMIT 1`, args.sourceArtifactId, CHANNEL_ID),
    first(db, "SELECT id FROM v7_evaluation_controlled_defect_derivation_receipts WHERE channel_id=? LIMIT 1", CHANNEL_ID),
  ]);
  if (!policy || !task || !blueprint || !cleanControl || !artifact || !rights || !provider) throw new ControlledDefectDerivationError("CONTROLLED_DEFECT_PREREQUISITES_MISSING", 409, "The sealed policy, task, blueprint, clean-control, artifact, rights and provider evidence are required");
  if (anyReceipt) throw new ControlledDefectDerivationError("CONTROLLED_DEFECT_DERIVATION_CEILING_REACHED", 409, "The single controlled-defect derivation receipt has already been recorded");
  if (clean(task.source_artifact_id) !== clean(artifact.id) || clean(task.source_rights_receipt_id) !== clean(rights.id) || clean(task.source_clean_control_receipt_id) !== clean(cleanControl.id) || clean(task.blueprint_id) !== clean(blueprint.id)) throw new ControlledDefectDerivationError("CONTROLLED_DEFECT_TASK_BINDING_MISMATCH", 409, "The derivation task does not bind the exact clean-control evidence chain");
  if (clean(blueprint.blueprint_key) !== "RIGHTS_LINEAGE_MISSING_POSITIVE" || clean(blueprint.fixture_role) !== "DEFECT_POSITIVE" || clean(blueprint.expected_defect_key) !== "RIGHTS_LINEAGE_MISSING" || clean(blueprint.severity) !== "P0" || clean(blueprint.oracle_kind) !== "DETERMINISTIC") throw new ControlledDefectDerivationError("CONTROLLED_DEFECT_BLUEPRINT_MISMATCH", 409, "The task must bind the sealed deterministic rights-lineage blueprint");
  if (clean(cleanControl.decision_state) !== "ELIGIBLE_CLEAN_CONTROL_REFERENCE" || number(cleanControl.reference_eligible) !== 1 || clean(cleanControl.authority_boundary) !== "CLEAN_CONTROL_REFERENCE_ONLY" || clean(cleanControl.rights_state) !== "PASS") throw new ControlledDefectDerivationError("CONTROLLED_DEFECT_CLEAN_PARENT_INELIGIBLE", 409, "An exact eligible clean-control reference with Rights PASS is required");
  if (expectedSourceArtifactHash.length !== 64 || [task.source_artifact_hash, cleanControl.exact_artifact_hash, artifact.sha256, provider.exact_response_hash, provider.r2_readback_hash].some((value) => clean(value).toLowerCase() !== expectedSourceArtifactHash)) throw new ControlledDefectDerivationError("CONTROLLED_DEFECT_PARENT_HASH_BINDING_MISMATCH", 409, "Every clean-parent evidence record must bind the exact sealed artifact hash");
  if (clean(rights.rights_state) !== "PASS" || clean(rights.id) !== clean(cleanControl.rights_receipt_id) || !clean(provider.provider_native_request_id) || number(provider.r2_readback_verified) !== 1) throw new ControlledDefectDerivationError("CONTROLLED_DEFECT_PARENT_PROVENANCE_FAILED", 409, "The clean parent requires provider-native provenance, exact R2 read-back and Rights PASS");
  const parentObject = await bucket.get(clean(artifact.storage_key));
  if (!parentObject) throw new ControlledDefectDerivationError("CONTROLLED_DEFECT_PARENT_MISSING", 404, "The exact clean-parent audio is missing from R2");
  const parentBytes = new Uint8Array(await parentObject.arrayBuffer()), parentReadbackHash = await sha256Hex(parentBytes);
  if (parentReadbackHash !== expectedSourceArtifactHash || parentBytes.byteLength !== number(artifact.byte_size)) throw new ControlledDefectDerivationError("CONTROLLED_DEFECT_PARENT_R2_HASH_MISMATCH", 409, "The current clean-parent R2 bytes differ from the sealed artifact");

  const oracleSpec = { policyVersion: CONTROLLED_DEFECT_DERIVATION_VERSION, expectedDefectKey: "RIGHTS_LINEAGE_MISSING", removedManifestKey: "rightsReceiptId", rule: "The mutated payload must equal the clean payload after removing exactly the required rightsReceiptId key." };
  const cleanPayload = {
    channelId: CHANNEL_ID,
    sourceArtifactId: clean(artifact.id),
    sourceArtifactHash: expectedSourceArtifactHash,
    sourceCleanControlReceiptId: clean(cleanControl.id),
    providerNativeRequestId: clean(provider.provider_native_request_id),
    rightsReceiptId: clean(rights.id),
    evaluationOnly: true,
    releaseEligible: false,
  };
  const { rightsReceiptId: removedRightsReceiptId, ...mutatedPayload } = cleanPayload;
  const cleanEnvelope = { schemaVersion: "CONTROLLED_FIXTURE_MANIFEST_V1", payload: cleanPayload, oracleSpec };
  const mutatedEnvelope = { schemaVersion: "CONTROLLED_FIXTURE_MANIFEST_V1", payload: mutatedPayload, oracleSpec };
  const unchangedCleanHash = await canonicalHash(mutatedPayload), unchangedMutatedHash = await canonicalHash(mutatedEnvelope.payload);
  if (!removedRightsReceiptId || removedRightsReceiptId !== clean(rights.id) || unchangedCleanHash !== unchangedMutatedHash || "rightsReceiptId" in mutatedPayload) throw new ControlledDefectDerivationError("CONTROLLED_DEFECT_MUTATION_NOT_ISOLATED", 409, "The controlled mutation must remove exactly the rights receipt reference and preserve every other payload field");
  const cleanManifestBytes = new TextEncoder().encode(canonicalStringify(cleanEnvelope));
  const mutatedManifestBytes = new TextEncoder().encode(canonicalStringify(mutatedEnvelope));
  const cleanManifestHash = await sha256Hex(cleanManifestBytes), mutatedManifestHash = await sha256Hex(mutatedManifestBytes);
  if (cleanManifestHash === mutatedManifestHash) throw new ControlledDefectDerivationError("CONTROLLED_DEFECT_MANIFESTS_NOT_DISTINCT", 409, "The clean and mutated manifests must have distinct exact hashes");
  const storageBase = `evaluation/controlled-fixtures/${clean(task.id)}`;
  const cleanManifestStorageKey = `${storageBase}/clean-manifest.json`, mutatedManifestStorageKey = `${storageBase}/rights-lineage-missing-manifest.json`;
  await bucket.put(cleanManifestStorageKey, cleanManifestBytes, { httpMetadata: { contentType: "application/json" }, customMetadata: { policyVersion: CONTROLLED_DEFECT_DERIVATION_VERSION, taskId: clean(task.id), role: "CLEAN_PARENT_MANIFEST", sha256: cleanManifestHash } });
  await bucket.put(mutatedManifestStorageKey, mutatedManifestBytes, { httpMetadata: { contentType: "application/json" }, customMetadata: { policyVersion: CONTROLLED_DEFECT_DERIVATION_VERSION, taskId: clean(task.id), role: "CONTROLLED_DEFECT_MANIFEST", expectedDefectKey: "RIGHTS_LINEAGE_MISSING", sha256: mutatedManifestHash } });
  const [cleanReadback, mutatedReadback] = await Promise.all([bucket.get(cleanManifestStorageKey), bucket.get(mutatedManifestStorageKey)]);
  if (!cleanReadback || !mutatedReadback) throw new ControlledDefectDerivationError("CONTROLLED_DEFECT_MANIFEST_READBACK_MISSING", 503, "Both exact manifest objects must be readable from R2");
  const cleanManifestReadbackHash = await sha256Hex(new Uint8Array(await cleanReadback.arrayBuffer()));
  const mutatedManifestReadbackHash = await sha256Hex(new Uint8Array(await mutatedReadback.arrayBuffer()));
  if (cleanManifestReadbackHash !== cleanManifestHash || mutatedManifestReadbackHash !== mutatedManifestHash) throw new ControlledDefectDerivationError("CONTROLLED_DEFECT_MANIFEST_READBACK_MISMATCH", 409, "The current manifest R2 bytes differ from the deterministic derivation");

  const candidateItemsAfter = number(cleanControl.candidate_items_after) + 1;
  const ownerConfirmedReferencesAfter = number(cleanControl.owner_confirmed_references_after);
  const cleanNegativeControlsAfter = number(cleanControl.clean_negative_controls_after);
  const controlledInjectionFixturesAfter = number(cleanControl.controlled_injection_fixtures_after) + 1;
  const p0FamiliesRequired = number(cleanControl.p0_families_required);
  const p0FamiliesCoveredAfter = Math.min(p0FamiliesRequired, number(cleanControl.p0_families_covered_after) + 1);
  const oracleProof = { removedManifestKey: "rightsReceiptId", removedRightsReceiptId, unchangedPayloadHash: unchangedCleanHash, cleanManifestHash, mutatedManifestHash, parentReadbackHash, mutationIsolated: true };
  const receiptId = id("controlled-defect-derivation-receipt");
  const evidenceHash = await canonicalHash({ receiptId, requestHash, taskId: task.id, blueprintId: blueprint.id, cleanControlReceiptId: cleanControl.id, sourceArtifactId: artifact.id, sourceArtifactHash: expectedSourceArtifactHash, rightsReceiptId: rights.id, oracleProof, candidateItemsAfter, ownerConfirmedReferencesAfter, cleanNegativeControlsAfter, controlledInjectionFixturesAfter, p0FamiliesCoveredAfter, p0FamiliesRequired, readinessState: "INSUFFICIENT_GROUND_TRUTH", authorityBoundary: "CONTROLLED_FIXTURE_GROUND_TRUTH_ONLY" });
  await run(db, `INSERT INTO v7_evaluation_controlled_defect_derivation_receipts
    (id,task_id,channel_id,policy_version,blueprint_id,source_clean_control_receipt_id,source_artifact_id,source_rights_receipt_id,source_artifact_hash,parent_readback_hash,parent_readback_bytes,clean_manifest_storage_key,clean_manifest_hash,clean_manifest_bytes,clean_manifest_readback_hash,mutated_manifest_storage_key,mutated_manifest_hash,mutated_manifest_bytes,mutated_manifest_readback_hash,removed_manifest_key,mutation_isolated,expected_defect_key,severity,decision_state,oracle_kind,oracle_state,oracle_proof_json,ground_truth_authority,lineage_group_key,controlled_injection_eligible,p0_family_coverage_eligible,candidate_items_after,owner_confirmed_references_after,clean_negative_controls_after,controlled_injection_fixtures_after,p0_families_covered_after,p0_families_required,readiness_state,actor,idempotency_key,request_hash,evidence_hash,authority_boundary)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'rightsReceiptId',1,'RIGHTS_LINEAGE_MISSING','P0','CONTROLLED_DEFECT_PRESENT','DETERMINISTIC','PASS',?,'DETERMINISTIC_SYSTEM_ORACLE','controlled-fixture:rights-lineage-missing:v1',1,1,?,?,?,?,?,?,'INSUFFICIENT_GROUND_TRUTH',?,?,?,?,'CONTROLLED_FIXTURE_GROUND_TRUTH_ONLY')`,
    receiptId, task.id, CHANNEL_ID, CONTROLLED_DEFECT_DERIVATION_VERSION, blueprint.id, cleanControl.id, artifact.id, rights.id,
    expectedSourceArtifactHash, parentReadbackHash, parentBytes.byteLength, cleanManifestStorageKey, cleanManifestHash, cleanManifestBytes.byteLength, cleanManifestReadbackHash,
    mutatedManifestStorageKey, mutatedManifestHash, mutatedManifestBytes.byteLength, mutatedManifestReadbackHash, JSON.stringify(oracleProof),
    candidateItemsAfter, ownerConfirmedReferencesAfter, cleanNegativeControlsAfter, controlledInjectionFixturesAfter, p0FamiliesCoveredAfter, p0FamiliesRequired,
    actor, idempotencyKey, requestHash, evidenceHash);
  return { outcome: "RECORDED", snapshot: await controlledDefectDerivationSnapshot(db) };
}
