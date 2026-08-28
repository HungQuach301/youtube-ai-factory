import { canonicalHash } from "@/lib/canonical-json";
import { FactoryRuntimeError, type FactoryRuntimeDB } from "@/lib/factory-runtime-writer";

export const FACTORY_ASSURANCE_CURRENT_RIGHTS_TERMINAL_DISPOSITION_VERSION = "FACTORY_ASSURANCE_CURRENT_RIGHTS_TERMINAL_DISPOSITION_V1" as const;

type Row = Record<string, unknown>;
const clean = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);
const idempotencyPattern = /^[A-Za-z0-9._:-]{16,200}$/;
const deterministicId = (prefix: string, hash: string) => `${prefix}-${hash.slice(0, 24)}`;
const first = (db: FactoryRuntimeDB, query: string, ...values: unknown[]) => db.prepare(query).bind(...values).first<Row>();
const rows = async (db: FactoryRuntimeDB, query: string, ...values: unknown[]) => (await db.prepare(query).bind(...values).all<Row>()).results ?? [];

async function providerTerminalEvidence(db: FactoryRuntimeDB, candidateId: string) {
  const evidence = await first(db, `SELECT d.id,d.evidence_hash,d.provider_binding_state,d.exact_hash_match_count,d.exact_audio_hash_verified,
      c.id closure_id,c.conclusion,c.candidate_disposition,c.historical_rights_resolution_state
    FROM v7_evaluation_provider_audio_hash_candidate_diagnostics d
    JOIN v7_evaluation_provider_audio_hash_snapshots s ON s.audio_hash_run_id=d.audio_hash_run_id
    JOIN v7_evaluation_historical_recovery_closures c ON c.audio_hash_snapshot_id=s.id AND c.channel_id=d.channel_id
    WHERE d.candidate_id=? AND d.provider_binding_state='NO_EXACT_AUDIO_HASH_MATCH' AND d.exact_hash_match_count=0 AND d.exact_audio_hash_verified=0
      AND c.conclusion='NO_EXACT_PROVIDER_AUDIO_FOUND' AND c.candidate_disposition='QUARANTINE_FAILURE_EVIDENCE_ONLY'
      AND c.historical_rights_resolution_state='EXHAUSTED_NO_EXACT_BINDING'
    ORDER BY d.created_at DESC,d.id DESC LIMIT 1`, candidateId);
  if (!evidence || !/^[a-f0-9]{64}$/.test(clean(evidence.evidence_hash).toLowerCase())) return null;
  return {
    terminalReason: "HISTORICAL_PROVIDER_BINDING_UNRECOVERABLE" as const,
    evidenceSourceTable: "v7_evaluation_provider_audio_hash_candidate_diagnostics" as const,
    evidenceSourceId: clean(evidence.id),
    evidenceSourceHash: clean(evidence.evidence_hash).toLowerCase(),
  };
}

async function lineageTerminalEvidence(db: FactoryRuntimeDB, candidateId: string) {
  const evidence = await first(db, `SELECT id,task_id,candidate_id,task_type,source_artifact_id,artifact_hash,declared_source_manifest_id,
      declared_source_manifest_hash,discoverable_package_manifest_count,declared_parent_count,verified_parent_count,diagnostic_state,reasons_json
    FROM v7_evaluation_rights_lineage_diagnostics
    WHERE candidate_id=? AND diagnostic_state='SOURCE_LINEAGE_BINDING_MISSING'
    ORDER BY created_at DESC,id DESC LIMIT 1`, candidateId);
  if (!evidence) return null;
  const evidenceSourceHash = await canonicalHash({
    policyVersion: "EVALUATION_RIGHTS_LINEAGE_DIAGNOSTIC_V1",
    id: clean(evidence.id), taskId: clean(evidence.task_id), candidateId: clean(evidence.candidate_id), taskType: clean(evidence.task_type),
    sourceArtifactId: clean(evidence.source_artifact_id), artifactHash: clean(evidence.artifact_hash).toLowerCase(),
    declaredSourceManifestId: clean(evidence.declared_source_manifest_id) || null,
    declaredSourceManifestHash: clean(evidence.declared_source_manifest_hash).toLowerCase() || null,
    discoverablePackageManifestCount: number(evidence.discoverable_package_manifest_count), declaredParentCount: number(evidence.declared_parent_count),
    verifiedParentCount: number(evidence.verified_parent_count), diagnosticState: clean(evidence.diagnostic_state), reasonsJson: clean(evidence.reasons_json),
  });
  return {
    terminalReason: "HISTORICAL_SOURCE_LINEAGE_UNRECOVERABLE" as const,
    evidenceSourceTable: "v7_evaluation_rights_lineage_diagnostics" as const,
    evidenceSourceId: clean(evidence.id), evidenceSourceHash,
  };
}

export async function classifyFactoryAssuranceCurrentRightsTerminalDisposition(
  db: FactoryRuntimeDB,
  input: { actor: string; idempotencyKey: string },
) {
  const actor = clean(input.actor), idempotencyKey = clean(input.idempotencyKey);
  if (!actor) throw new FactoryRuntimeError("ASSURANCE_CURRENT_RIGHTS_TERMINAL_ACTOR_REQUIRED", 400, "An authenticated owner actor is required");
  if (!idempotencyPattern.test(idempotencyKey)) throw new FactoryRuntimeError("ASSURANCE_CURRENT_RIGHTS_TERMINAL_IDEMPOTENCY_KEY_INVALID", 400, "A stable 16–200 character idempotency key is required");
  const collection = await first(db, `SELECT * FROM factory_assurance_current_rights_collection_runs ORDER BY created_at DESC,id DESC LIMIT 1`);
  if (!collection) throw new FactoryRuntimeError("ASSURANCE_CURRENT_RIGHTS_COLLECTION_REQUIRED", 409, "Materialize the immutable current-rights collection queue before terminal disposition");
  const collectionRunId = clean(collection.id), inventoryRunId = clean(collection.inventory_run_id), snapshotId = clean(collection.remediation_snapshot_id);
  const requestHash = await canonicalHash({ version: FACTORY_ASSURANCE_CURRENT_RIGHTS_TERMINAL_DISPOSITION_VERSION, collectionRunId, inventoryRunId, snapshotId, idempotencyKey, actor });
  const prior = await first(db, `SELECT * FROM factory_assurance_current_rights_terminal_disposition_runs WHERE collection_run_id=? AND idempotency_key=? LIMIT 1`, collectionRunId, idempotencyKey);
  if (prior) {
    if (clean(prior.request_hash) !== requestHash) throw new FactoryRuntimeError("ASSURANCE_CURRENT_RIGHTS_TERMINAL_IDEMPOTENCY_CONFLICT", 409, "The idempotency key is bound to another terminal-disposition intent");
    return {
      outcome: "IDEMPOTENT_REPLAY" as const, runId: clean(prior.id), collectionRunId, inventoryRunId, snapshotId,
      scopeItems: number(prior.scope_items), providerBindingUnrecoverableItems: number(prior.provider_binding_unrecoverable_items),
      lineageUnrecoverableItems: number(prior.lineage_unrecoverable_items), quarantinedItems: number(prior.quarantined_items),
      replacementRequiredItems: number(prior.replacement_required_items), remainingReceiptCollectionItems: 0,
      lifecycleState: clean(prior.lifecycle_state), providerRequests: 0, spendMicros: 0,
    };
  }
  const tasks = await rows(db, `SELECT * FROM factory_assurance_current_rights_collection_tasks WHERE run_id=? ORDER BY required_receipt_type,source_candidate_id,id`, collectionRunId);
  if (tasks.length !== number(collection.open_tasks)) throw new FactoryRuntimeError("ASSURANCE_CURRENT_RIGHTS_TERMINAL_SCOPE_DRIFT", 409, "The immutable collection task scope no longer matches its run", [`observed:${tasks.length}`, `expected:${number(collection.open_tasks)}`]);
  const receipts: Array<Row> = [];
  const unresolved: string[] = [];
  for (const task of tasks) {
    const receiptType = clean(task.required_receipt_type), candidateId = clean(task.source_candidate_id);
    const terminal = receiptType === "PROVIDER_TERMS_AND_PLAN_RECEIPT"
      ? await providerTerminalEvidence(db, candidateId)
      : await lineageTerminalEvidence(db, candidateId);
    if (!terminal) { unresolved.push(`${candidateId}:${receiptType}`); continue; }
    const facts = {
      collectionTaskId: clean(task.id), sourceCandidateId: candidateId, sourceArtifactId: clean(task.source_artifact_id),
      candidateKind: clean(task.candidate_kind), exactArtifactHash: clean(task.exact_artifact_hash).toLowerCase(), requiredReceiptType: receiptType,
      ...terminal, disposition: "QUARANTINED_FAILURE_EVIDENCE_ONLY" as const,
      replacementAction: "CONTROLLED_FIXTURE_REPLACEMENT_REQUIRED" as const, rightsEligible: false as const,
    };
    receipts.push({ ...facts, evidenceHash: await canonicalHash({ version: FACTORY_ASSURANCE_CURRENT_RIGHTS_TERMINAL_DISPOSITION_VERSION, collectionRunId, inventoryRunId, snapshotId, facts }) });
  }
  if (unresolved.length) throw new FactoryRuntimeError("ASSURANCE_CURRENT_RIGHTS_TERMINAL_EVIDENCE_INCOMPLETE", 409, "Every current-rights task requires exact terminal recovery or lineage evidence before quarantine", unresolved.slice(0, 20));
  const providerBindingUnrecoverableItems = receipts.filter((receipt) => receipt.terminalReason === "HISTORICAL_PROVIDER_BINDING_UNRECOVERABLE").length;
  const lineageUnrecoverableItems = receipts.length - providerBindingUnrecoverableItems;
  const summary = {
    scopeItems: receipts.length, providerBindingUnrecoverableItems, lineageUnrecoverableItems,
    quarantinedItems: receipts.length, replacementRequiredItems: receipts.length, remainingReceiptCollectionItems: 0, lifecycleState: "COMPLETE" as const,
  };
  const manifestHash = await canonicalHash({ version: FACTORY_ASSURANCE_CURRENT_RIGHTS_TERMINAL_DISPOSITION_VERSION, collectionRunId, receiptEvidenceHashes: receipts.map((receipt) => clean(receipt.evidenceHash)) });
  const evidenceHash = await canonicalHash({ version: FACTORY_ASSURANCE_CURRENT_RIGHTS_TERMINAL_DISPOSITION_VERSION, collectionRunId, inventoryRunId, snapshotId, requestHash, manifestHash, summary });
  const runId = deterministicId("factory-assurance-current-rights-terminal-run", requestHash);
  const statements = [db.prepare(`INSERT INTO factory_assurance_current_rights_terminal_disposition_runs
    (id,collection_run_id,inventory_run_id,remediation_snapshot_id,idempotency_key,request_hash,policy_version,scope_items,provider_binding_unrecoverable_items,lineage_unrecoverable_items,quarantined_items,replacement_required_items,remaining_receipt_collection_items,lifecycle_state,actor,count_eligible,qualification_authority,pass_authority,provider_dispatch_authority,r22_authority,master_authority,release_authority,publication_authority,provider_requests,spend_micros,manifest_hash,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,0,0,0,0,0,0,0,0,?,?)`).bind(
      runId, collectionRunId, inventoryRunId, snapshotId, idempotencyKey, requestHash, FACTORY_ASSURANCE_CURRENT_RIGHTS_TERMINAL_DISPOSITION_VERSION,
      summary.scopeItems, providerBindingUnrecoverableItems, lineageUnrecoverableItems, summary.quarantinedItems, summary.replacementRequiredItems,
      summary.remainingReceiptCollectionItems, summary.lifecycleState, actor, manifestHash, evidenceHash,
    )];
  for (const receipt of receipts) statements.push(db.prepare(`INSERT INTO factory_assurance_current_rights_terminal_disposition_receipts
    (id,run_id,collection_run_id,collection_task_id,inventory_run_id,remediation_snapshot_id,source_candidate_id,source_artifact_id,candidate_kind,exact_artifact_hash,required_receipt_type,terminal_reason,evidence_source_table,evidence_source_id,evidence_source_hash,disposition,replacement_action,rights_eligible,policy_version,count_eligible,qualification_authority,pass_authority,provider_dispatch_authority,r22_authority,master_authority,release_authority,publication_authority,provider_requests,spend_micros,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,0,0,0,0,0,0,0,0,0,0,?)`).bind(
      deterministicId("factory-assurance-current-rights-terminal-receipt", clean(receipt.evidenceHash)), runId, collectionRunId, receipt.collectionTaskId,
      inventoryRunId, snapshotId, receipt.sourceCandidateId, receipt.sourceArtifactId, receipt.candidateKind, receipt.exactArtifactHash,
      receipt.requiredReceiptType, receipt.terminalReason, receipt.evidenceSourceTable, receipt.evidenceSourceId, receipt.evidenceSourceHash,
      receipt.disposition, receipt.replacementAction, FACTORY_ASSURANCE_CURRENT_RIGHTS_TERMINAL_DISPOSITION_VERSION, receipt.evidenceHash,
    ));
  await db.batch(statements);
  return {
    outcome: "RECORDED" as const, runId, collectionRunId, inventoryRunId, snapshotId, ...summary,
    countEligible: false, qualificationAuthority: false, passAuthority: false, providerDispatchAuthority: false,
    r22Authority: false, masterAuthority: false, releaseAuthority: false, publicationAuthority: false, providerRequests: 0, spendMicros: 0,
  };
}
