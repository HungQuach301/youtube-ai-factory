import { canonicalHash, canonicalStringify } from "@/lib/canonical-json";
import { FactoryRuntimeError, type FactoryRuntimeDB } from "@/lib/factory-runtime-writer";

export const FACTORY_ASSURANCE_CORPUS_REMEDIATION_INCIDENT_VERSION = "FACTORY_ASSURANCE_CORPUS_REMEDIATION_INCIDENT_V1" as const;
export const FACTORY_ASSURANCE_CORPUS_REMEDIATION_INCIDENT_MAXIMUM_ITEMS = 4 as const;

type Row = Record<string, unknown>;
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

function parseReasons(value: unknown) {
  try {
    const parsed = JSON.parse(clean(value));
    return Array.isArray(parsed) ? parsed.map(clean).filter(Boolean) : [];
  } catch {
    return [];
  }
}

async function eligibleRightsProgress(db: FactoryRuntimeDB, snapshotId: string) {
  const result = await first(db, `SELECT
      COALESCE(SUM(CASE WHEN bytes_state='READBACK_VERIFIED' AND checksum_state='PASS' AND provenance_state='PASS' THEN 1 ELSE 0 END),0) rights_eligible_items,
      COALESCE(SUM(CASE WHEN bytes_state='READBACK_VERIFIED' AND checksum_state='PASS' AND provenance_state='PASS' AND rights_state!='PASS' THEN 1 ELSE 0 END),0) rights_pending_items
    FROM factory_assurance_corpus_remediation_evidence_receipts WHERE remediation_snapshot_id=?`, snapshotId);
  return { rightsEligibleItems: number(result?.rights_eligible_items), rightsPendingItems: number(result?.rights_pending_items) };
}

export async function classifyFactoryAssuranceCorpusRemediationIncidents(
  db: FactoryRuntimeDB,
  input: { actor: string; idempotencyKey: string },
) {
  const actor = clean(input.actor), idempotencyKey = clean(input.idempotencyKey);
  if (!actor) throw new FactoryRuntimeError("ASSURANCE_REMEDIATION_INCIDENT_ACTOR_REQUIRED", 400, "An authenticated owner actor is required");
  if (!idempotencyPattern.test(idempotencyKey)) throw new FactoryRuntimeError("ASSURANCE_REMEDIATION_INCIDENT_IDEMPOTENCY_KEY_INVALID", 400, "A stable 16–200 character idempotency key is required");
  const snapshot = await first(db, `SELECT * FROM factory_assurance_corpus_remediation_snapshots
    WHERE channel_id='channel-hidden-systems' AND format_key='hidden-systems-documentary'
    ORDER BY created_at DESC,id DESC LIMIT 1`);
  if (!snapshot) throw new FactoryRuntimeError("ASSURANCE_CORPUS_REMEDIATION_SNAPSHOT_REQUIRED", 409, "Materialize the bounded remediation inventory before incident classification");
  const snapshotId = clean(snapshot.id);
  const requestHash = await canonicalHash({ version: FACTORY_ASSURANCE_CORPUS_REMEDIATION_INCIDENT_VERSION, snapshotId, idempotencyKey, actor });
  const prior = await first(db, `SELECT * FROM factory_assurance_corpus_remediation_incident_runs
    WHERE remediation_snapshot_id=? AND idempotency_key=? LIMIT 1`, snapshotId, idempotencyKey);
  if (prior) {
    if (clean(prior.request_hash) !== requestHash) throw new FactoryRuntimeError("ASSURANCE_REMEDIATION_INCIDENT_IDEMPOTENCY_CONFLICT", 409, "The idempotency key is bound to another incident-classification intent");
    return {
      outcome: "IDEMPOTENT_REPLAY" as const, runId: clean(prior.id), snapshotId, lifecycleState: clean(prior.lifecycle_state),
      inspectedItems: number(prior.inspected_items), confirmedOverwriteItems: number(prior.confirmed_overwrite_items), quarantinedItems: number(prior.quarantined_items),
      replacementReferenceItems: number(prior.replacement_reference_items), rightsEligibleItems: number(prior.rights_eligible_items), rightsPendingItems: number(prior.rights_pending_items),
      providerRequests: 0, spendMicros: 0,
    };
  }

  const failures = await rows(db, `SELECT r.* FROM factory_assurance_corpus_remediation_evidence_receipts r
    WHERE r.remediation_snapshot_id=? AND r.policy_version='FACTORY_ASSURANCE_CORPUS_REMEDIATION_EVIDENCE_V1'
      AND (r.checksum_state='FAIL' OR r.provenance_state='FAIL')
      AND NOT EXISTS (SELECT 1 FROM factory_assurance_corpus_remediation_incident_receipts i
        WHERE i.remediation_snapshot_id=r.remediation_snapshot_id AND i.remediation_item_id=r.remediation_item_id)
    ORDER BY r.created_at,r.id LIMIT 5`, snapshotId);
  if (!failures.length) throw new FactoryRuntimeError("ASSURANCE_REMEDIATION_INCIDENT_FAILURE_RECEIPTS_REQUIRED", 409, "No unclassified failed remediation evidence receipt exists");
  if (failures.length > FACTORY_ASSURANCE_CORPUS_REMEDIATION_INCIDENT_MAXIMUM_ITEMS) throw new FactoryRuntimeError("ASSURANCE_REMEDIATION_INCIDENT_SCOPE_EXCEEDED", 409, "The bounded incident classifier accepts at most four failed evidence receipts");

  const runId = deterministicId("factory-assurance-remediation-incident-run", requestHash);
  const receipts: Array<Record<string, unknown>> = [];
  for (const failure of failures) {
    const metadata = parseObject(failure.object_metadata_json), reasons = parseReasons(failure.reconciliation_reasons_json);
    const declaredHash = clean(failure.declared_hash).toLowerCase(), observedHash = clean(failure.computed_hash).toLowerCase();
    const sourceArtifactId = clean(failure.source_artifact_id), observedArtifactId = clean(metadata.artifactId);
    const proof = [
      clean(failure.bytes_state) === "READBACK_VERIFIED",
      clean(failure.checksum_state) === "FAIL",
      clean(failure.provenance_state) === "FAIL",
      hashPattern.test(declaredHash), hashPattern.test(observedHash), declaredHash !== observedHash,
      number(failure.declared_bytes) !== number(failure.actual_bytes),
      observedArtifactId.length > 0 && observedArtifactId !== sourceArtifactId,
      clean(metadata.sha256).toLowerCase() === observedHash,
      ["BYTE_SIZE_MISMATCH", "CHECKSUM_MISMATCH", "R2_OBJECT_METADATA_MISMATCH"].every((reason) => reasons.includes(reason)),
    ];
    if (!proof.every(Boolean)) throw new FactoryRuntimeError("ASSURANCE_REMEDIATION_INCIDENT_CLASSIFICATION_UNPROVEN", 409, "A failed receipt does not prove a mutable R2 key overwrite", [clean(failure.id)]);
    const replacement = await first(db, `SELECT c.id candidate_id,e.id evidence_receipt_id
      FROM v7_evaluation_candidates c JOIN factory_assurance_corpus_remediation_evidence_receipts e ON e.source_candidate_id=c.id
      WHERE c.source_id=? AND e.remediation_snapshot_id=? AND e.storage_key=?
        AND lower(e.declared_hash)=? AND lower(e.computed_hash)=? AND e.bytes_state='READBACK_VERIFIED' AND e.checksum_state='PASS' AND e.provenance_state='PASS'
      ORDER BY e.created_at,e.id LIMIT 1`, observedArtifactId, snapshotId, clean(failure.storage_key), observedHash, observedHash);
    const receipt = {
      remediationItemId: clean(failure.remediation_item_id), evidenceReceiptId: clean(failure.id), sourceCandidateId: clean(failure.source_candidate_id),
      sourceArtifactId, storageKey: clean(failure.storage_key), declaredHash, observedHash, declaredBytes: number(failure.declared_bytes), observedBytes: number(failure.actual_bytes),
      observedArtifactId, incidentKind: "MUTABLE_R2_KEY_OVERWRITE", byteRecoveryState: "UNRECOVERABLE_ORIGINAL_BYTES",
      disposition: "QUARANTINED_NOT_RIGHTS_ELIGIBLE", replacementBindingState: replacement ? "EXISTING_EXACT_CANDIDATE_REFERENCED" : "NO_EXACT_REPLACEMENT_REFERENCE",
      replacementCandidateId: replacement ? clean(replacement.candidate_id) : null, replacementEvidenceReceiptId: replacement ? clean(replacement.evidence_receipt_id) : null,
      rightsActionState: "NOT_APPLICABLE_QUARANTINED",
      classificationReasons: ["DECLARED_BYTES_NOT_AT_STORAGE_KEY", "DECLARED_HASH_NOT_AT_STORAGE_KEY", "OBJECT_METADATA_BINDS_DIFFERENT_ARTIFACT", "ORIGINAL_BYTES_UNRECOVERABLE", "SOURCE_CANDIDATE_QUARANTINED"],
    };
    receipts.push({ ...receipt, evidenceHash: await canonicalHash({ version: FACTORY_ASSURANCE_CORPUS_REMEDIATION_INCIDENT_VERSION, snapshotId, runId, receipt }) });
  }
  const rights = await eligibleRightsProgress(db, snapshotId);
  const manifestHash = await canonicalHash({ version: FACTORY_ASSURANCE_CORPUS_REMEDIATION_INCIDENT_VERSION, snapshotId, failureReceiptIds: failures.map((row) => clean(row.id)), incidentEvidenceHashes: receipts.map((row) => clean(row.evidenceHash)) });
  const summary = { inspectedItems: receipts.length, confirmedOverwriteItems: receipts.length, quarantinedItems: receipts.length, replacementReferenceItems: receipts.filter((row) => row.replacementCandidateId).length, ...rights, lifecycleState: "COMPLETE" as const };
  const runEvidenceHash = await canonicalHash({ version: FACTORY_ASSURANCE_CORPUS_REMEDIATION_INCIDENT_VERSION, snapshotId, requestHash, manifestHash, summary });
  const statements = [db.prepare(`INSERT INTO factory_assurance_corpus_remediation_incident_runs
    (id,remediation_snapshot_id,idempotency_key,request_hash,policy_version,inspected_items,confirmed_overwrite_items,quarantined_items,replacement_reference_items,rights_eligible_items,rights_pending_items,lifecycle_state,actor,count_eligible,qualification_authority,pass_authority,provider_dispatch_authority,r22_authority,master_authority,release_authority,publication_authority,provider_requests,spend_micros,manifest_hash,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,0,0,0,0,0,0,0,0,?,?)`).bind(
      runId, snapshotId, idempotencyKey, requestHash, FACTORY_ASSURANCE_CORPUS_REMEDIATION_INCIDENT_VERSION,
      summary.inspectedItems, summary.confirmedOverwriteItems, summary.quarantinedItems, summary.replacementReferenceItems,
      summary.rightsEligibleItems, summary.rightsPendingItems, summary.lifecycleState, actor, manifestHash, runEvidenceHash,
    )];
  for (const receipt of receipts) statements.push(db.prepare(`INSERT INTO factory_assurance_corpus_remediation_incident_receipts
    (id,run_id,remediation_snapshot_id,remediation_item_id,evidence_receipt_id,source_candidate_id,source_artifact_id,storage_key,declared_hash,observed_hash,declared_bytes,observed_bytes,observed_artifact_id,incident_kind,byte_recovery_state,disposition,replacement_binding_state,replacement_candidate_id,replacement_evidence_receipt_id,rights_action_state,classification_reasons_json,policy_version,count_eligible,qualification_authority,pass_authority,provider_dispatch_authority,r22_authority,master_authority,release_authority,publication_authority,provider_requests,spend_micros,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,0,0,0,0,0,0,0,0,?)`).bind(
      deterministicId("factory-assurance-remediation-incident-receipt", clean(receipt.evidenceHash)), runId, snapshotId, receipt.remediationItemId, receipt.evidenceReceiptId,
      receipt.sourceCandidateId, receipt.sourceArtifactId, receipt.storageKey, receipt.declaredHash, receipt.observedHash, receipt.declaredBytes, receipt.observedBytes,
      receipt.observedArtifactId, receipt.incidentKind, receipt.byteRecoveryState, receipt.disposition, receipt.replacementBindingState, receipt.replacementCandidateId,
      receipt.replacementEvidenceReceiptId, receipt.rightsActionState, json(receipt.classificationReasons), FACTORY_ASSURANCE_CORPUS_REMEDIATION_INCIDENT_VERSION, receipt.evidenceHash,
    ));
  await db.batch(statements);
  return {
    outcome: "RECORDED" as const, runId, snapshotId, ...summary, countEligible: false, qualificationAuthority: false, passAuthority: false,
    providerDispatchAuthority: false, r22Authority: false, masterAuthority: false, releaseAuthority: false, publicationAuthority: false, providerRequests: 0, spendMicros: 0,
  };
}
