import { canonicalHash, canonicalStringify } from "@/lib/canonical-json";
import { FactoryRuntimeError, type FactoryRuntimeDB } from "@/lib/factory-runtime-writer";

export const FACTORY_ASSURANCE_CURRENT_RIGHTS_COLLECTION_VERSION = "FACTORY_ASSURANCE_CURRENT_RIGHTS_COLLECTION_V1" as const;

type Row = Record<string, unknown>;
const clean = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);
const idempotencyPattern = /^[A-Za-z0-9._:-]{16,200}$/;
const deterministicId = (prefix: string, hash: string) => `${prefix}-${hash.slice(0, 24)}`;
const first = (db: FactoryRuntimeDB, query: string, ...values: unknown[]) => db.prepare(query).bind(...values).first<Row>();
const rows = async (db: FactoryRuntimeDB, query: string, ...values: unknown[]) => (await db.prepare(query).bind(...values).all<Row>()).results ?? [];

function requirements(receiptType: string) {
  if (receiptType === "PROVIDER_TERMS_AND_PLAN_RECEIPT") return [
    "EXACT_REQUEST_RESPONSE_ARTIFACT_BINDING",
    "TERMS_SNAPSHOT_EFFECTIVE_AT_GENERATION",
    "PAID_PLAN_EVIDENCE_COVERS_GENERATION_AND_COLLECTION_TIME",
    "COMMERCIAL_SCOPE_AND_TERRITORY_VERIFIED",
    "RAW_RESPONSE_AND_RECEIPT_HASHES_PRESENT",
  ];
  if (receiptType === "COMPOSITE_PARENT_RIGHTS_MANIFEST") return [
    "EXACT_COMPOSITE_ARTIFACT_HASH",
    "COMPLETE_IMMUTABLE_PARENT_ID_AND_HASH_SET",
    "EVERY_PARENT_HAS_EXACT_CURRENT_RIGHTS_RECEIPT",
    "VERIFIED_PARENT_COUNT_EQUALS_PARENT_COUNT",
    "MANIFEST_HASH_PRESENT",
  ];
  return [
    "EXACT_AUTHORSHIP_ARTIFACT_BINDING",
    "AUTHOR_IDENTITY_AND_TERRITORY_PRESENT",
    "CURRENT_COMMERCIAL_USE_TERM",
    "RENDERED_COMPOSITE_SOURCE_MANIFEST_WHEN_APPLICABLE",
    "EVIDENCE_HASH_PRESENT",
  ];
}

export async function materializeFactoryAssuranceCurrentRightsCollection(
  db: FactoryRuntimeDB,
  input: { actor: string; idempotencyKey: string },
) {
  const actor = clean(input.actor), idempotencyKey = clean(input.idempotencyKey);
  if (!actor) throw new FactoryRuntimeError("ASSURANCE_CURRENT_RIGHTS_COLLECTION_ACTOR_REQUIRED", 400, "An authenticated owner actor is required");
  if (!idempotencyPattern.test(idempotencyKey)) throw new FactoryRuntimeError("ASSURANCE_CURRENT_RIGHTS_COLLECTION_IDEMPOTENCY_KEY_INVALID", 400, "A stable 16–200 character idempotency key is required");
  const inventory = await first(db, `SELECT * FROM factory_assurance_current_rights_inventory_runs
    ORDER BY created_at DESC,id DESC LIMIT 1`);
  if (!inventory) throw new FactoryRuntimeError("ASSURANCE_CURRENT_RIGHTS_INVENTORY_REQUIRED", 409, "Complete current-rights inventory before materializing collection tasks");
  const inventoryRunId = clean(inventory.id), snapshotId = clean(inventory.remediation_snapshot_id);
  const requestHash = await canonicalHash({ version: FACTORY_ASSURANCE_CURRENT_RIGHTS_COLLECTION_VERSION, inventoryRunId, snapshotId, idempotencyKey, actor });
  const prior = await first(db, `SELECT * FROM factory_assurance_current_rights_collection_runs WHERE inventory_run_id=? AND idempotency_key=? LIMIT 1`, inventoryRunId, idempotencyKey);
  if (prior) {
    if (clean(prior.request_hash) !== requestHash) throw new FactoryRuntimeError("ASSURANCE_CURRENT_RIGHTS_COLLECTION_IDEMPOTENCY_CONFLICT", 409, "The idempotency key is bound to another current-rights collection intent");
    return {
      outcome: "IDEMPOTENT_REPLAY" as const, runId: clean(prior.id), inventoryRunId, snapshotId,
      collectionScopeItems: number(prior.collection_scope_items), openTasks: number(prior.open_tasks),
      providerTermsTasks: number(prior.provider_terms_tasks), compositeManifestTasks: number(prior.composite_manifest_tasks),
      authorshipTasks: number(prior.authorship_tasks), lifecycleState: clean(prior.lifecycle_state), providerRequests: 0, spendMicros: 0,
    };
  }
  const pending = await rows(db, `SELECT * FROM factory_assurance_current_rights_inventory_receipts
    WHERE run_id=? AND inventory_state='SOURCE_RECEIPT_REQUIRED'
    ORDER BY required_receipt_type,source_candidate_id,id`, inventoryRunId);
  if (pending.length !== number(inventory.pending_receipt_items)) throw new FactoryRuntimeError("ASSURANCE_CURRENT_RIGHTS_COLLECTION_SCOPE_DRIFT", 409, "The pending receipt queue no longer matches the immutable inventory run", [`observed:${pending.length}`, `expected:${number(inventory.pending_receipt_items)}`]);
  const tasks: Array<Row> = [];
  for (const item of pending) {
    const facts = {
      inventoryReceiptId: clean(item.id), remediationItemId: clean(item.remediation_item_id), sourceCandidateId: clean(item.source_candidate_id),
      sourceArtifactId: clean(item.source_artifact_id), candidateKind: clean(item.candidate_kind), exactArtifactHash: clean(item.exact_artifact_hash),
      requiredReceiptType: clean(item.required_receipt_type), collectionState: "RECEIPT_REQUIRED" as const,
      requirements: requirements(clean(item.required_receipt_type)),
    };
    tasks.push({ ...facts, evidenceHash: await canonicalHash({ version: FACTORY_ASSURANCE_CURRENT_RIGHTS_COLLECTION_VERSION, inventoryRunId, snapshotId, facts }) });
  }
  const providerTermsTasks = tasks.filter((task) => task.requiredReceiptType === "PROVIDER_TERMS_AND_PLAN_RECEIPT").length;
  const compositeManifestTasks = tasks.filter((task) => task.requiredReceiptType === "COMPOSITE_PARENT_RIGHTS_MANIFEST").length;
  const authorshipTasks = tasks.filter((task) => task.requiredReceiptType === "AUTHORSHIP_SOURCE_RECEIPT").length;
  const manifestHash = await canonicalHash({ version: FACTORY_ASSURANCE_CURRENT_RIGHTS_COLLECTION_VERSION, inventoryRunId, snapshotId, taskEvidenceHashes: tasks.map((task) => clean(task.evidenceHash)) });
  const summary = { collectionScopeItems: tasks.length, openTasks: tasks.length, providerTermsTasks, compositeManifestTasks, authorshipTasks, lifecycleState: "COMPLETE" as const };
  const runEvidenceHash = await canonicalHash({ version: FACTORY_ASSURANCE_CURRENT_RIGHTS_COLLECTION_VERSION, inventoryRunId, snapshotId, requestHash, manifestHash, summary });
  const runId = deterministicId("factory-assurance-current-rights-collection-run", requestHash);
  const statements = [db.prepare(`INSERT INTO factory_assurance_current_rights_collection_runs
    (id,inventory_run_id,remediation_snapshot_id,idempotency_key,request_hash,policy_version,collection_scope_items,open_tasks,provider_terms_tasks,composite_manifest_tasks,authorship_tasks,lifecycle_state,actor,count_eligible,qualification_authority,pass_authority,provider_dispatch_authority,r22_authority,master_authority,release_authority,publication_authority,provider_requests,spend_micros,manifest_hash,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,0,0,0,0,0,0,0,0,?,?)`).bind(
      runId, inventoryRunId, snapshotId, idempotencyKey, requestHash, FACTORY_ASSURANCE_CURRENT_RIGHTS_COLLECTION_VERSION,
      summary.collectionScopeItems, summary.openTasks, providerTermsTasks, compositeManifestTasks, authorshipTasks, summary.lifecycleState, actor, manifestHash, runEvidenceHash,
    )];
  for (const task of tasks) statements.push(db.prepare(`INSERT INTO factory_assurance_current_rights_collection_tasks
    (id,run_id,inventory_run_id,inventory_receipt_id,remediation_snapshot_id,remediation_item_id,source_candidate_id,source_artifact_id,candidate_kind,exact_artifact_hash,required_receipt_type,collection_state,requirements_json,source_receipt_table,source_receipt_id,source_receipt_evidence_hash,policy_version,count_eligible,qualification_authority,pass_authority,provider_dispatch_authority,r22_authority,master_authority,release_authority,publication_authority,provider_requests,spend_micros,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,NULL,NULL,NULL,?,0,0,0,0,0,0,0,0,0,0,?)`).bind(
      deterministicId("factory-assurance-current-rights-collection-task", clean(task.evidenceHash)), runId, inventoryRunId, task.inventoryReceiptId, snapshotId,
      task.remediationItemId, task.sourceCandidateId, task.sourceArtifactId, task.candidateKind, task.exactArtifactHash, task.requiredReceiptType,
      task.collectionState, canonicalStringify(task.requirements), FACTORY_ASSURANCE_CURRENT_RIGHTS_COLLECTION_VERSION, task.evidenceHash,
    ));
  await db.batch(statements);
  return {
    outcome: "RECORDED" as const, runId, inventoryRunId, snapshotId, ...summary,
    countEligible: false, qualificationAuthority: false, passAuthority: false, providerDispatchAuthority: false,
    r22Authority: false, masterAuthority: false, releaseAuthority: false, publicationAuthority: false, providerRequests: 0, spendMicros: 0,
  };
}
