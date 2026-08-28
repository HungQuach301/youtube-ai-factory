import { canonicalHash, canonicalStringify } from "@/lib/canonical-json";
import { FactoryRuntimeError, type FactoryRuntimeDB } from "@/lib/factory-runtime-writer";

export const FACTORY_ASSURANCE_CURRENT_RIGHTS_INVENTORY_VERSION = "FACTORY_ASSURANCE_CURRENT_RIGHTS_INVENTORY_V1" as const;

type Row = Record<string, unknown>;
type Receipt = {
  sourceReceiptTable: string | null;
  sourceReceiptId: string | null;
  sourceReceiptEvidenceHash: string | null;
  artifactBindingState: "EXACT_HASH_BOUND" | "MISSING_OR_MISMATCHED";
  validityState: "CURRENT" | "GENERATION_TIME_AND_CURRENT_PLAN_VERIFIED" | "NOT_APPLICABLE" | "MISSING_OR_INVALID";
  commercialScopeState: "VERIFIED" | "MISSING_OR_INVALID";
  coverageState: "COMPLETE" | "MISSING_OR_INVALID";
  inventoryState: "SOURCE_RECEIPT_ATTACHED" | "SOURCE_RECEIPT_REQUIRED";
  classificationReasons: string[];
};

const clean = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);
const hashPattern = /^[a-f0-9]{64}$/;
const idempotencyPattern = /^[A-Za-z0-9._:-]{16,200}$/;
const deterministicId = (prefix: string, hash: string) => `${prefix}-${hash.slice(0, 24)}`;
const rows = async (db: FactoryRuntimeDB, query: string, ...values: unknown[]) => (await db.prepare(query).bind(...values).all<Row>()).results ?? [];
const first = (db: FactoryRuntimeDB, query: string, ...values: unknown[]) => db.prepare(query).bind(...values).first<Row>();
const isoMillis = (value: unknown) => {
  const millis = Date.parse(clean(value));
  return Number.isFinite(millis) ? millis : null;
};
const pendingReceipt = (reason: string): Receipt => ({
  sourceReceiptTable: null,
  sourceReceiptId: null,
  sourceReceiptEvidenceHash: null,
  artifactBindingState: "MISSING_OR_MISMATCHED",
  validityState: "MISSING_OR_INVALID",
  commercialScopeState: "MISSING_OR_INVALID",
  coverageState: "MISSING_OR_INVALID",
  inventoryState: "SOURCE_RECEIPT_REQUIRED",
  classificationReasons: [reason],
});

async function providerReceipt(db: FactoryRuntimeDB, candidateId: string, exactHash: string, evaluatedAtMs: number): Promise<Receipt> {
  const candidates = await rows(db, `SELECT c.*,t.commercial_use_state,t.terms_effective_at,t.terms_snapshot_hash,
      t.plan_valid_from,t.plan_valid_until,t.plan_evidence_hash,t.evidence_hash terms_evidence_hash
    FROM v7_evaluation_candidate_provider_rights_receipts c
    JOIN v7_evaluation_provider_terms_receipts t ON t.id=c.provider_terms_receipt_id
    WHERE c.candidate_id=? ORDER BY c.created_at DESC,c.id DESC`, candidateId);
  for (const receipt of candidates) {
    const generationAt = isoMillis(receipt.generation_at), termsEffectiveAt = isoMillis(receipt.terms_effective_at), planValidFrom = isoMillis(receipt.plan_valid_from);
    const planValidUntil = clean(receipt.plan_valid_until) ? isoMillis(receipt.plan_valid_until) : Number.POSITIVE_INFINITY;
    const exact = clean(receipt.artifact_hash).toLowerCase() === exactHash;
    const valid = exact
      && clean(receipt.binding_state) === "EXACT_REQUEST_RESPONSE_ARTIFACT_BINDING_VERIFIED"
      && clean(receipt.rights_state) === "PASS"
      && clean(receipt.commercial_use_state) === "VERIFIED_PAID_COMMERCIAL_USE"
      && generationAt !== null && termsEffectiveAt !== null && planValidFrom !== null && planValidUntil !== null
      && termsEffectiveAt <= generationAt && planValidFrom <= generationAt && generationAt <= planValidUntil && evaluatedAtMs <= planValidUntil
      && hashPattern.test(clean(receipt.terms_snapshot_hash).toLowerCase())
      && hashPattern.test(clean(receipt.plan_evidence_hash).toLowerCase())
      && hashPattern.test(clean(receipt.evidence_hash).toLowerCase())
      && hashPattern.test(clean(receipt.terms_evidence_hash).toLowerCase());
    if (valid) return {
      sourceReceiptTable: "v7_evaluation_candidate_provider_rights_receipts",
      sourceReceiptId: clean(receipt.id),
      sourceReceiptEvidenceHash: clean(receipt.evidence_hash).toLowerCase(),
      artifactBindingState: "EXACT_HASH_BOUND",
      validityState: "GENERATION_TIME_AND_CURRENT_PLAN_VERIFIED",
      commercialScopeState: "VERIFIED",
      coverageState: "COMPLETE",
      inventoryState: "SOURCE_RECEIPT_ATTACHED",
      classificationReasons: ["EXACT_REQUEST_RESPONSE_ARTIFACT_BINDING", "TERMS_EFFECTIVE_AT_GENERATION", "PAID_PLAN_COVERS_GENERATION_AND_INVENTORY_TIME"],
    };
  }
  return pendingReceipt(candidates.length ? "PROVIDER_RECEIPT_NOT_EXACT_OR_CURRENT" : "PROVIDER_TERMS_AND_PLAN_RECEIPT_REQUIRED");
}

async function compositeReceipt(db: FactoryRuntimeDB, candidateId: string, exactHash: string): Promise<Receipt> {
  const candidates = await rows(db, `SELECT * FROM v7_evaluation_composite_rights_manifests
    WHERE candidate_id=? ORDER BY created_at DESC,id DESC`, candidateId);
  for (const receipt of candidates) {
    const valid = clean(receipt.artifact_hash).toLowerCase() === exactHash
      && clean(receipt.lineage_state) === "EXACT_PARENT_SET_VERIFIED"
      && clean(receipt.rights_state) === "PASS"
      && number(receipt.parent_count) > 0 && number(receipt.verified_parent_count) === number(receipt.parent_count)
      && hashPattern.test(clean(receipt.manifest_hash).toLowerCase());
    if (valid) return {
      sourceReceiptTable: "v7_evaluation_composite_rights_manifests",
      sourceReceiptId: clean(receipt.id),
      sourceReceiptEvidenceHash: clean(receipt.manifest_hash).toLowerCase(),
      artifactBindingState: "EXACT_HASH_BOUND",
      validityState: "NOT_APPLICABLE",
      commercialScopeState: "VERIFIED",
      coverageState: "COMPLETE",
      inventoryState: "SOURCE_RECEIPT_ATTACHED",
      classificationReasons: ["EXACT_COMPOSITE_HASH_BINDING", "EXACT_PARENT_SET_VERIFIED", "ALL_PARENT_RIGHTS_RECEIPTS_COVERED"],
    };
  }
  return pendingReceipt(candidates.length ? "COMPOSITE_MANIFEST_NOT_EXACT_OR_COMPLETE" : "COMPOSITE_PARENT_RIGHTS_MANIFEST_REQUIRED");
}

async function authorshipReceipt(db: FactoryRuntimeDB, candidateId: string, exactHash: string, evaluatedAtMs: number): Promise<Receipt> {
  const candidates = await rows(db, `SELECT * FROM v7_evaluation_authorship_receipts
    WHERE candidate_id=? ORDER BY created_at DESC,id DESC`, candidateId);
  for (const receipt of candidates) {
    const validFrom = isoMillis(receipt.valid_from), validUntil = clean(receipt.valid_until) ? isoMillis(receipt.valid_until) : Number.POSITIVE_INFINITY;
    const renderedCompositeBound = clean(receipt.authorship_type) !== "RENDERED_COMPOSITE"
      || (clean(receipt.source_manifest_id).length > 0 && hashPattern.test(clean(receipt.source_manifest_hash).toLowerCase()));
    const valid = clean(receipt.artifact_hash).toLowerCase() === exactHash
      && ["CHANNEL_ORIGINAL", "WORK_FOR_HIRE", "RENDERED_COMPOSITE"].includes(clean(receipt.authorship_type))
      && clean(receipt.author_identity).length > 0 && clean(receipt.territory).length > 0
      && clean(receipt.commercial_use_state) === "VERIFIED_COMMERCIAL_USE"
      && validFrom !== null && validUntil !== null && validFrom <= evaluatedAtMs && evaluatedAtMs <= validUntil
      && renderedCompositeBound && hashPattern.test(clean(receipt.evidence_hash).toLowerCase());
    if (valid) return {
      sourceReceiptTable: "v7_evaluation_authorship_receipts",
      sourceReceiptId: clean(receipt.id),
      sourceReceiptEvidenceHash: clean(receipt.evidence_hash).toLowerCase(),
      artifactBindingState: "EXACT_HASH_BOUND",
      validityState: "CURRENT",
      commercialScopeState: "VERIFIED",
      coverageState: "COMPLETE",
      inventoryState: "SOURCE_RECEIPT_ATTACHED",
      classificationReasons: ["EXACT_AUTHORSHIP_ARTIFACT_BINDING", "CURRENT_COMMERCIAL_USE_TERM", "TERRITORY_AND_AUTHOR_IDENTITY_PRESENT"],
    };
  }
  return pendingReceipt(candidates.length ? "AUTHORSHIP_RECEIPT_NOT_EXACT_OR_CURRENT" : "AUTHORSHIP_SOURCE_RECEIPT_REQUIRED");
}

export async function inventoryFactoryAssuranceCurrentRightsEvidence(
  db: FactoryRuntimeDB,
  input: { actor: string; idempotencyKey: string; evaluatedAt: string },
) {
  const actor = clean(input.actor), idempotencyKey = clean(input.idempotencyKey);
  if (!actor) throw new FactoryRuntimeError("ASSURANCE_CURRENT_RIGHTS_ACTOR_REQUIRED", 400, "An authenticated owner actor is required");
  if (!idempotencyPattern.test(idempotencyKey)) throw new FactoryRuntimeError("ASSURANCE_CURRENT_RIGHTS_IDEMPOTENCY_KEY_INVALID", 400, "A stable 16–200 character idempotency key is required");
  const evaluatedAtMs = isoMillis(input.evaluatedAt);
  if (evaluatedAtMs === null) throw new FactoryRuntimeError("ASSURANCE_CURRENT_RIGHTS_EVALUATED_AT_INVALID", 400, "An explicit ISO evaluation timestamp is required");
  const evaluatedAt = new Date(evaluatedAtMs).toISOString();
  const snapshot = await first(db, `SELECT * FROM factory_assurance_corpus_remediation_snapshots
    WHERE channel_id='channel-hidden-systems' AND format_key='hidden-systems-documentary'
    ORDER BY created_at DESC,id DESC LIMIT 1`);
  if (!snapshot) throw new FactoryRuntimeError("ASSURANCE_CORPUS_REMEDIATION_SNAPSHOT_REQUIRED", 409, "Materialize the bounded remediation inventory before current-rights inventory");
  const snapshotId = clean(snapshot.id);
  const requestHash = await canonicalHash({ version: FACTORY_ASSURANCE_CURRENT_RIGHTS_INVENTORY_VERSION, snapshotId, idempotencyKey, actor, evaluatedAt });
  const prior = await first(db, `SELECT * FROM factory_assurance_current_rights_inventory_runs
    WHERE remediation_snapshot_id=? AND idempotency_key=? LIMIT 1`, snapshotId, idempotencyKey);
  if (prior) {
    if (clean(prior.request_hash) !== requestHash) throw new FactoryRuntimeError("ASSURANCE_CURRENT_RIGHTS_IDEMPOTENCY_CONFLICT", 409, "The idempotency key is bound to another current-rights inventory intent");
    return {
      outcome: "IDEMPOTENT_REPLAY" as const, runId: clean(prior.id), snapshotId, evaluatedAt: clean(prior.evaluated_at),
      eligibleItems: number(prior.eligible_items), attachedReceiptItems: number(prior.attached_receipt_items), pendingReceiptItems: number(prior.pending_receipt_items),
      quarantinedItemsExcluded: number(prior.quarantined_items_excluded), lifecycleState: clean(prior.lifecycle_state), providerRequests: 0, spendMicros: 0,
    };
  }

  const incident = await first(db, `SELECT * FROM factory_assurance_corpus_remediation_incident_runs
    WHERE remediation_snapshot_id=? ORDER BY created_at DESC,id DESC LIMIT 1`, snapshotId);
  if (!incident) throw new FactoryRuntimeError("ASSURANCE_REMEDIATION_INCIDENT_DISPOSITION_REQUIRED", 409, "Complete append-only incident disposition before current-rights inventory");
  const eligible = await rows(db, `SELECT e.id remediation_evidence_receipt_id,e.remediation_item_id,e.source_candidate_id,e.source_artifact_id,
      lower(e.computed_hash) exact_artifact_hash,i.candidate_kind,t.task_type
    FROM factory_assurance_corpus_remediation_evidence_receipts e
    JOIN factory_assurance_corpus_remediation_items i ON i.id=e.remediation_item_id
    LEFT JOIN v7_evaluation_rights_evidence_tasks t ON t.candidate_id=e.source_candidate_id AND t.policy_version='EVALUATION_RIGHTS_EVIDENCE_POLICY_V1'
    WHERE e.remediation_snapshot_id=? AND e.bytes_state='READBACK_VERIFIED' AND e.checksum_state='PASS' AND e.provenance_state='PASS'
      AND NOT EXISTS (SELECT 1 FROM factory_assurance_corpus_remediation_incident_receipts q
        WHERE q.remediation_snapshot_id=e.remediation_snapshot_id AND q.remediation_item_id=e.remediation_item_id AND q.disposition='QUARANTINED_NOT_RIGHTS_ELIGIBLE')
    ORDER BY e.source_candidate_id,e.id`, snapshotId);
  if (eligible.length !== number(incident.rights_eligible_items)) throw new FactoryRuntimeError("ASSURANCE_CURRENT_RIGHTS_ELIGIBLE_SCOPE_DRIFT", 409, "The exact-evidence eligible scope no longer matches the immutable incident disposition", [`observed:${eligible.length}`, `expected:${number(incident.rights_eligible_items)}`]);

  const runId = deterministicId("factory-assurance-current-rights-run", requestHash);
  const receipts: Array<Row> = [];
  for (const item of eligible) {
    const exactHash = clean(item.exact_artifact_hash).toLowerCase(), candidateId = clean(item.source_candidate_id), candidateKind = clean(item.candidate_kind);
    if (!hashPattern.test(exactHash)) throw new FactoryRuntimeError("ASSURANCE_CURRENT_RIGHTS_EXACT_HASH_INVALID", 409, "An eligible remediation item lacks an exact artifact hash", [candidateId]);
    const taskType = clean(item.task_type) || (candidateKind === "AUDIO" ? "PROVIDER_TERMS_AND_PLAN_RECEIPT" : candidateKind === "MASTER" ? "COMPOSITE_PARENT_RIGHTS_MANIFEST" : "AUTHORSHIP_SOURCE_RECEIPT");
    const receipt = taskType === "PROVIDER_TERMS_AND_PLAN_RECEIPT"
      ? await providerReceipt(db, candidateId, exactHash, evaluatedAtMs)
      : taskType === "COMPOSITE_PARENT_RIGHTS_MANIFEST"
        ? await compositeReceipt(db, candidateId, exactHash)
        : await authorshipReceipt(db, candidateId, exactHash, evaluatedAtMs);
    const facts = {
      remediationItemId: clean(item.remediation_item_id), remediationEvidenceReceiptId: clean(item.remediation_evidence_receipt_id),
      sourceCandidateId: candidateId, sourceArtifactId: clean(item.source_artifact_id), candidateKind, exactArtifactHash: exactHash,
      requiredReceiptType: taskType, ...receipt,
    };
    receipts.push({ ...facts, evidenceHash: await canonicalHash({ version: FACTORY_ASSURANCE_CURRENT_RIGHTS_INVENTORY_VERSION, snapshotId, runId, evaluatedAt, facts }) });
  }
  const attachedReceiptItems = receipts.filter((receipt) => receipt.inventoryState === "SOURCE_RECEIPT_ATTACHED").length;
  const pendingReceiptItems = receipts.length - attachedReceiptItems;
  const quarantinedItemsExcluded = number(incident.quarantined_items);
  const manifestHash = await canonicalHash({ version: FACTORY_ASSURANCE_CURRENT_RIGHTS_INVENTORY_VERSION, snapshotId, evaluatedAt, receiptEvidenceHashes: receipts.map((receipt) => clean(receipt.evidenceHash)) });
  const summary = { eligibleItems: eligible.length, attachedReceiptItems, pendingReceiptItems, quarantinedItemsExcluded, lifecycleState: "COMPLETE" as const };
  const runEvidenceHash = await canonicalHash({ version: FACTORY_ASSURANCE_CURRENT_RIGHTS_INVENTORY_VERSION, snapshotId, requestHash, manifestHash, summary });
  const statements = [db.prepare(`INSERT INTO factory_assurance_current_rights_inventory_runs
    (id,remediation_snapshot_id,idempotency_key,request_hash,policy_version,evaluated_at,eligible_items,attached_receipt_items,pending_receipt_items,quarantined_items_excluded,lifecycle_state,actor,count_eligible,qualification_authority,pass_authority,provider_dispatch_authority,r22_authority,master_authority,release_authority,publication_authority,provider_requests,spend_micros,manifest_hash,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,0,0,0,0,0,0,0,0,0,?,?)`).bind(
      runId, snapshotId, idempotencyKey, requestHash, FACTORY_ASSURANCE_CURRENT_RIGHTS_INVENTORY_VERSION, evaluatedAt,
      summary.eligibleItems, summary.attachedReceiptItems, summary.pendingReceiptItems, summary.quarantinedItemsExcluded, summary.lifecycleState, actor, manifestHash, runEvidenceHash,
    )];
  for (const receipt of receipts) statements.push(db.prepare(`INSERT INTO factory_assurance_current_rights_inventory_receipts
    (id,run_id,remediation_snapshot_id,remediation_item_id,remediation_evidence_receipt_id,source_candidate_id,source_artifact_id,candidate_kind,exact_artifact_hash,required_receipt_type,source_receipt_table,source_receipt_id,source_receipt_evidence_hash,artifact_binding_state,validity_state,commercial_scope_state,coverage_state,inventory_state,classification_reasons_json,policy_version,count_eligible,qualification_authority,pass_authority,provider_dispatch_authority,r22_authority,master_authority,release_authority,publication_authority,provider_requests,spend_micros,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,0,0,0,0,0,0,0,0,?)`).bind(
      deterministicId("factory-assurance-current-rights-receipt", clean(receipt.evidenceHash)), runId, snapshotId,
      receipt.remediationItemId, receipt.remediationEvidenceReceiptId, receipt.sourceCandidateId, receipt.sourceArtifactId, receipt.candidateKind, receipt.exactArtifactHash,
      receipt.requiredReceiptType, receipt.sourceReceiptTable, receipt.sourceReceiptId, receipt.sourceReceiptEvidenceHash, receipt.artifactBindingState, receipt.validityState,
      receipt.commercialScopeState, receipt.coverageState, receipt.inventoryState, canonicalStringify(receipt.classificationReasons),
      FACTORY_ASSURANCE_CURRENT_RIGHTS_INVENTORY_VERSION, receipt.evidenceHash,
    ));
  await db.batch(statements);
  return {
    outcome: "RECORDED" as const, runId, snapshotId, evaluatedAt, ...summary, countEligible: false, qualificationAuthority: false, passAuthority: false,
    providerDispatchAuthority: false, r22Authority: false, masterAuthority: false, releaseAuthority: false, publicationAuthority: false, providerRequests: 0, spendMicros: 0,
  };
}
