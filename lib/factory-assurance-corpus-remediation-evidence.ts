import { canonicalHash, canonicalStringify, sha256Hex } from "@/lib/canonical-json";
import {
  CORPUS_VERIFICATION_MAXIMUM_OBJECT_BYTES,
  reconcileCorpusArtifactEvidence,
} from "@/lib/evaluation-foundation";
import { FactoryRuntimeError, type FactoryRuntimeDB } from "@/lib/factory-runtime-writer";

export const FACTORY_ASSURANCE_CORPUS_REMEDIATION_EVIDENCE_VERSION = "FACTORY_ASSURANCE_CORPUS_REMEDIATION_EVIDENCE_V1" as const;
export const FACTORY_ASSURANCE_CORPUS_REMEDIATION_EVIDENCE_MAXIMUM_BATCH = 3 as const;

type Row = Record<string, unknown>;
type StoredObject = {
  arrayBuffer(): Promise<ArrayBuffer>;
  size?: number;
  customMetadata?: Record<string, string>;
};
export type FactoryAssuranceRemediationEvidenceBucket = { get(key: string): Promise<StoredObject | null> };
export type FactoryAssuranceRemediationEvidenceEnv = { DB: FactoryRuntimeDB; BUCKET: FactoryAssuranceRemediationEvidenceBucket };

const clean = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);
const json = (value: unknown) => canonicalStringify(value);
const hashPattern = /^[a-f0-9]{64}$/;
const idempotencyPattern = /^[A-Za-z0-9._:-]{16,200}$/;
const deterministicId = (prefix: string, hash: string) => `${prefix}-${hash.slice(0, 24)}`;
const rows = async (db: FactoryRuntimeDB, query: string, ...values: unknown[]) => (await db.prepare(query).bind(...values).all<Row>()).results ?? [];
const first = (db: FactoryRuntimeDB, query: string, ...values: unknown[]) => db.prepare(query).bind(...values).first<Row>();

function parseObject(value: unknown) {
  try {
    const parsed = JSON.parse(clean(value));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

async function currentRightsReceipt(db: FactoryRuntimeDB, candidateId: string, exactArtifactHash: string, candidateRightsState: string) {
  if (candidateRightsState !== "PASS") return null;
  return first(db, `SELECT id,receipt_kind FROM (
      SELECT r.id id,'EVALUATION_RIGHTS_RECEIPT' receipt_kind,1 priority
      FROM v7_evaluation_rights_receipts r
      JOIN v7_evaluation_verification_receipts v ON v.id=r.basis_verification_receipt_id
      WHERE r.candidate_id=? AND r.rights_state='PASS'
        AND lower(v.declared_hash)=? AND lower(v.computed_hash)=?
      UNION ALL
      SELECT r.id,'PROVIDER_RIGHTS_RECEIPT',2
      FROM v7_evaluation_candidate_provider_rights_receipts r
      JOIN v7_evaluation_provider_terms_receipts t ON t.id=r.provider_terms_receipt_id
      WHERE r.candidate_id=? AND r.rights_state='PASS' AND r.binding_state='EXACT_REQUEST_RESPONSE_ARTIFACT_BINDING_VERIFIED'
        AND lower(r.artifact_hash)=? AND t.commercial_use_state='VERIFIED_PAID_COMMERCIAL_USE'
        AND datetime(t.plan_valid_from)<=CURRENT_TIMESTAMP
        AND (t.plan_valid_until IS NULL OR datetime(t.plan_valid_until)>=CURRENT_TIMESTAMP)
      UNION ALL
      SELECT r.id,'COMPOSITE_RIGHTS_MANIFEST',3
      FROM v7_evaluation_composite_rights_manifests r
      WHERE r.candidate_id=? AND r.rights_state='PASS' AND r.lineage_state='EXACT_PARENT_SET_VERIFIED'
        AND lower(r.artifact_hash)=? AND r.verified_parent_count=r.parent_count
      UNION ALL
      SELECT r.id,'AUTHORSHIP_RECEIPT',4
      FROM v7_evaluation_authorship_receipts r
      WHERE r.candidate_id=? AND lower(r.artifact_hash)=? AND r.commercial_use_state='VERIFIED_COMMERCIAL_USE'
        AND datetime(r.valid_from)<=CURRENT_TIMESTAMP
        AND (r.valid_until IS NULL OR datetime(r.valid_until)>=CURRENT_TIMESTAMP)
    ) ORDER BY priority,id LIMIT 1`,
    candidateId, exactArtifactHash, exactArtifactHash,
    candidateId, exactArtifactHash,
    candidateId, exactArtifactHash,
    candidateId, exactArtifactHash);
}

async function progress(db: FactoryRuntimeDB, snapshotId: string) {
  const result = await first(db, `SELECT
      (SELECT candidate_count FROM factory_assurance_corpus_remediation_snapshots WHERE id=?) total_items,
      COUNT(r.id) checked_items,
      COALESCE(SUM(CASE WHEN r.bytes_state='READBACK_VERIFIED' THEN 1 ELSE 0 END),0) byte_verified_items,
      COALESCE(SUM(CASE WHEN r.checksum_state='PASS' THEN 1 ELSE 0 END),0) checksum_pass_items,
      COALESCE(SUM(CASE WHEN r.provenance_state='PASS' THEN 1 ELSE 0 END),0) provenance_pass_items,
      COALESCE(SUM(CASE WHEN r.rights_state='PASS' THEN 1 ELSE 0 END),0) rights_pass_items,
      COALESCE(SUM(CASE WHEN r.exact_evidence_state='READY' THEN 1 ELSE 0 END),0) exact_evidence_ready_items,
      COALESCE(SUM(r.actual_bytes),0) bytes_read
    FROM factory_assurance_corpus_remediation_evidence_receipts r
    WHERE r.remediation_snapshot_id=? AND r.policy_version=?`, snapshotId, snapshotId, FACTORY_ASSURANCE_CORPUS_REMEDIATION_EVIDENCE_VERSION);
  const totalItems = number(result?.total_items), checkedItems = number(result?.checked_items);
  return {
    totalItems,
    checkedItems,
    remainingItems: Math.max(0, totalItems - checkedItems),
    byteVerifiedItems: number(result?.byte_verified_items),
    checksumPassItems: number(result?.checksum_pass_items),
    provenancePassItems: number(result?.provenance_pass_items),
    rightsPassItems: number(result?.rights_pass_items),
    exactEvidenceReadyItems: number(result?.exact_evidence_ready_items),
    bytesRead: number(result?.bytes_read),
  };
}

export async function verifyFactoryAssuranceCorpusRemediationEvidenceBatch(
  env: FactoryAssuranceRemediationEvidenceEnv,
  input: { actor: string; idempotencyKey: string; batchLimit?: number },
) {
  const actor = clean(input.actor), idempotencyKey = clean(input.idempotencyKey);
  const batchLimit = input.batchLimit == null ? 2 : Number(input.batchLimit);
  if (!actor) throw new FactoryRuntimeError("ASSURANCE_REMEDIATION_EVIDENCE_ACTOR_REQUIRED", 400, "An authenticated owner actor is required");
  if (!idempotencyPattern.test(idempotencyKey)) throw new FactoryRuntimeError("ASSURANCE_REMEDIATION_EVIDENCE_IDEMPOTENCY_KEY_INVALID", 400, "A stable 16–200 character idempotency key is required");
  if (!Number.isSafeInteger(batchLimit) || batchLimit < 1 || batchLimit > FACTORY_ASSURANCE_CORPUS_REMEDIATION_EVIDENCE_MAXIMUM_BATCH) {
    throw new FactoryRuntimeError("ASSURANCE_REMEDIATION_EVIDENCE_BATCH_LIMIT_INVALID", 400, "The evidence batch limit must be between 1 and 3");
  }
  const snapshot = await first(env.DB, `SELECT * FROM factory_assurance_corpus_remediation_snapshots
    WHERE channel_id='channel-hidden-systems' AND format_key='hidden-systems-documentary'
    ORDER BY created_at DESC,id DESC LIMIT 1`);
  if (!snapshot) throw new FactoryRuntimeError("ASSURANCE_CORPUS_REMEDIATION_SNAPSHOT_REQUIRED", 409, "Materialize the bounded remediation inventory before evidence verification");
  const snapshotId = clean(snapshot.id);
  const requestHash = await canonicalHash({ version: FACTORY_ASSURANCE_CORPUS_REMEDIATION_EVIDENCE_VERSION, snapshotId, idempotencyKey, actor, batchLimit });
  const prior = await first(env.DB, `SELECT id,request_hash,lifecycle_state FROM factory_assurance_corpus_remediation_evidence_runs
    WHERE remediation_snapshot_id=? AND idempotency_key=? LIMIT 1`, snapshotId, idempotencyKey);
  if (prior) {
    if (clean(prior.request_hash) !== requestHash) throw new FactoryRuntimeError("ASSURANCE_REMEDIATION_EVIDENCE_IDEMPOTENCY_CONFLICT", 409, "The idempotency key is bound to another evidence intent");
    return { outcome: "IDEMPOTENT_REPLAY" as const, runId: clean(prior.id), lifecycleState: clean(prior.lifecycle_state), snapshotId, ...(await progress(env.DB, snapshotId)), providerRequests: 0, spendMicros: 0 };
  }

  const candidates = await rows(env.DB, `SELECT
      i.id remediation_item_id,i.snapshot_id,i.source_candidate_id,i.storage_key remediation_storage_key,i.mime_type remediation_mime_type,
      i.byte_size remediation_byte_size,lower(i.exact_artifact_hash) remediation_hash,
      c.id candidate_id,c.source_id source_artifact_id,c.storage_key candidate_storage_key,c.mime_type candidate_mime_type,c.byte_size candidate_byte_size,
      lower(c.content_hash) candidate_hash,c.rights_declared_state,c.rights_verification_state,
      a.package_id source_package_id,a.storage_key source_storage_key,a.mime_type source_mime_type,a.byte_size source_byte_size,lower(a.sha256) source_hash,
      a.provenance_json source_provenance_json,a.engine_version source_engine_version
    FROM factory_assurance_corpus_remediation_items i
    JOIN v7_evaluation_candidates c ON c.id=i.source_candidate_id AND c.source_table='production_v2_artifacts'
    JOIN production_v2_artifacts a ON a.id=c.source_id
    WHERE i.snapshot_id=? AND NOT EXISTS (
      SELECT 1 FROM factory_assurance_corpus_remediation_evidence_receipts r
      WHERE r.remediation_snapshot_id=i.snapshot_id AND r.remediation_item_id=i.id AND r.policy_version=?
    )
    ORDER BY i.candidate_kind,i.created_at,i.id LIMIT ?`, snapshotId, FACTORY_ASSURANCE_CORPUS_REMEDIATION_EVIDENCE_VERSION, batchLimit);
  const manifestHash = await canonicalHash({ version: FACTORY_ASSURANCE_CORPUS_REMEDIATION_EVIDENCE_VERSION, snapshotId, snapshotHash: clean(snapshot.snapshot_hash), itemIds: candidates.map((row) => clean(row.remediation_item_id)) });
  const runId = deterministicId("factory-assurance-remediation-evidence-run", requestHash);
  const receipts: Array<Record<string, unknown>> = [];

  for (const candidate of candidates) {
    const storageKey = clean(candidate.remediation_storage_key), declaredHash = clean(candidate.remediation_hash).toLowerCase();
    const object = storageKey ? await env.BUCKET.get(storageKey) : null;
    let actualBytes = number(object?.size), computedHash = "";
    if (object && (!actualBytes || actualBytes <= CORPUS_VERIFICATION_MAXIMUM_OBJECT_BYTES)) {
      const bytes = await object.arrayBuffer();
      actualBytes = bytes.byteLength;
      if (actualBytes <= CORPUS_VERIFICATION_MAXIMUM_OBJECT_BYTES) computedHash = await sha256Hex(new Uint8Array(bytes));
    }
    const provenance = parseObject(candidate.source_provenance_json), objectMetadata = object?.customMetadata ?? {};
    const reconciliation = reconcileCorpusArtifactEvidence({
      candidateId: clean(candidate.candidate_id), sourceArtifactId: clean(candidate.source_artifact_id), sourcePackageId: clean(candidate.source_package_id), storageKey,
      declaredHash, computedHash, declaredBytes: number(candidate.remediation_byte_size), actualBytes,
      mimeType: clean(candidate.remediation_mime_type), artifactType: clean(candidate.remediation_mime_type), engineVersion: clean(candidate.source_engine_version),
      rightsDeclaredState: clean(candidate.rights_declared_state), provenance, objectFound: Boolean(object), objectMetadata,
    });
    const bindingReasons: string[] = [];
    if (clean(candidate.source_candidate_id) !== clean(candidate.candidate_id)) bindingReasons.push("REMEDIATION_CANDIDATE_BINDING_MISMATCH");
    if (![candidate.candidate_storage_key, candidate.source_storage_key].every((value) => clean(value) === storageKey)) bindingReasons.push("REMEDIATION_STORAGE_KEY_BINDING_MISMATCH");
    if (![candidate.candidate_hash, candidate.source_hash].every((value) => clean(value).toLowerCase() === declaredHash) || !hashPattern.test(declaredHash)) bindingReasons.push("REMEDIATION_HASH_BINDING_MISMATCH");
    const declaredBytes = number(candidate.remediation_byte_size);
    if (![candidate.candidate_byte_size, candidate.source_byte_size].every((value) => number(value) === declaredBytes)) bindingReasons.push("REMEDIATION_BYTE_SIZE_BINDING_MISMATCH");
    const rights = await currentRightsReceipt(env.DB, clean(candidate.candidate_id), declaredHash, clean(candidate.rights_verification_state));
    const bytesState = reconciliation.bytesState;
    const checksumState = reconciliation.checksumState;
    const provenanceState = reconciliation.provenanceState === "PASS" && bindingReasons.length === 0 ? "PASS" : "FAIL";
    const rightsState = rights ? "PASS" : "RECEIPT_REQUIRED";
    const reasons = [...new Set([
      ...reconciliation.reasons.filter((reason) => !["DECLARATION_NOT_ELIGIBLE", "PROVIDER_TERMS_RECEIPT_MISSING", "AUTHORSHIP_EVIDENCE_INCOMPLETE"].includes(reason)),
      ...bindingReasons,
      ...(rights ? [] : ["CURRENT_IMMUTABLE_RIGHTS_RECEIPT_REQUIRED"]),
    ])].sort();
    const exactEvidenceState = bytesState === "READBACK_VERIFIED" && checksumState === "PASS" && provenanceState === "PASS" && rightsState === "PASS" ? "READY" : "BLOCKED";
    const receipt = {
      remediationItemId: clean(candidate.remediation_item_id), sourceCandidateId: clean(candidate.candidate_id), sourceArtifactId: clean(candidate.source_artifact_id), storageKey,
      mimeType: clean(candidate.remediation_mime_type), declaredHash, computedHash: computedHash || null, declaredBytes: declaredBytes || null, actualBytes,
      objectMetadata, sourceProvenance: provenance, bytesState, checksumState, provenanceState, rightsState,
      rightsReceiptKind: rights ? clean(rights.receipt_kind) : "NONE", rightsReceiptId: rights ? clean(rights.id) : null,
      exactEvidenceState, reasons,
    };
    receipts.push({ ...receipt, evidenceHash: await canonicalHash({ version: FACTORY_ASSURANCE_CORPUS_REMEDIATION_EVIDENCE_VERSION, snapshotId, runId, receipt }) });
  }

  const processedItems = receipts.length;
  const alreadyChecked = number((await progress(env.DB, snapshotId)).checkedItems);
  const remainingItems = Math.max(0, number(snapshot.candidate_count) - alreadyChecked - processedItems);
  const runSummary = {
    plannedItems: candidates.length,
    processedItems,
    byteVerifiedItems: receipts.filter((receipt) => receipt.bytesState === "READBACK_VERIFIED").length,
    checksumPassItems: receipts.filter((receipt) => receipt.checksumState === "PASS").length,
    provenancePassItems: receipts.filter((receipt) => receipt.provenanceState === "PASS").length,
    rightsPassItems: receipts.filter((receipt) => receipt.rightsState === "PASS").length,
    exactEvidenceReadyItems: receipts.filter((receipt) => receipt.exactEvidenceState === "READY").length,
    remainingItems,
    bytesRead: receipts.reduce((sum, receipt) => sum + number(receipt.actualBytes), 0),
    lifecycleState: remainingItems === 0 ? "COMPLETE" : "PARTIAL_BATCH",
  };
  const runEvidenceHash = await canonicalHash({ version: FACTORY_ASSURANCE_CORPUS_REMEDIATION_EVIDENCE_VERSION, snapshotId, requestHash, manifestHash, runSummary, receiptEvidenceHashes: receipts.map((receipt) => receipt.evidenceHash) });
  const statements = [env.DB.prepare(`INSERT INTO factory_assurance_corpus_remediation_evidence_runs
    (id,remediation_snapshot_id,idempotency_key,request_hash,policy_version,batch_limit,planned_items,processed_items,byte_verified_items,checksum_pass_items,provenance_pass_items,rights_pass_items,exact_evidence_ready_items,remaining_items,bytes_read,lifecycle_state,actor,count_eligible,qualification_authority,pass_authority,provider_dispatch_authority,r22_authority,master_authority,release_authority,publication_authority,provider_requests,spend_micros,manifest_hash,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,0,0,0,0,0,0,0,0,?,?)`).bind(
    runId, snapshotId, idempotencyKey, requestHash, FACTORY_ASSURANCE_CORPUS_REMEDIATION_EVIDENCE_VERSION, batchLimit,
    runSummary.plannedItems, runSummary.processedItems, runSummary.byteVerifiedItems, runSummary.checksumPassItems, runSummary.provenancePassItems,
    runSummary.rightsPassItems, runSummary.exactEvidenceReadyItems, runSummary.remainingItems, runSummary.bytesRead, runSummary.lifecycleState, actor, manifestHash, runEvidenceHash,
  )];
  for (const receipt of receipts) {
    statements.push(env.DB.prepare(`INSERT INTO factory_assurance_corpus_remediation_evidence_receipts
      (id,run_id,remediation_snapshot_id,remediation_item_id,source_candidate_id,source_artifact_id,storage_key,mime_type,declared_hash,computed_hash,declared_bytes,actual_bytes,object_metadata_json,source_provenance_json,bytes_state,checksum_state,provenance_state,rights_state,rights_receipt_kind,rights_receipt_id,exact_evidence_state,reconciliation_reasons_json,policy_version,count_eligible,qualification_authority,pass_authority,provider_dispatch_authority,r22_authority,master_authority,release_authority,publication_authority,provider_requests,spend_micros,evidence_hash)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,0,0,0,0,0,0,0,0,?)`).bind(
      deterministicId("factory-assurance-remediation-evidence-receipt", clean(receipt.evidenceHash)), runId, snapshotId, receipt.remediationItemId,
      receipt.sourceCandidateId, receipt.sourceArtifactId, receipt.storageKey, receipt.mimeType, receipt.declaredHash, receipt.computedHash,
      receipt.declaredBytes, receipt.actualBytes, json(receipt.objectMetadata), json(receipt.sourceProvenance), receipt.bytesState, receipt.checksumState,
      receipt.provenanceState, receipt.rightsState, receipt.rightsReceiptKind, receipt.rightsReceiptId, receipt.exactEvidenceState, json(receipt.reasons),
      FACTORY_ASSURANCE_CORPUS_REMEDIATION_EVIDENCE_VERSION, receipt.evidenceHash,
    ));
  }
  await env.DB.batch(statements);
  return {
    outcome: "RECORDED" as const, runId, snapshotId, ...runSummary, ...(await progress(env.DB, snapshotId)),
    countEligible: false, qualificationAuthority: false, passAuthority: false, providerDispatchAuthority: false,
    r22Authority: false, masterAuthority: false, releaseAuthority: false, publicationAuthority: false, providerRequests: 0, spendMicros: 0,
  };
}
