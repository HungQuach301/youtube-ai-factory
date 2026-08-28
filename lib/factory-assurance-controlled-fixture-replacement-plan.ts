import { canonicalHash, canonicalStringify } from "@/lib/canonical-json";
import { FactoryRuntimeError, type FactoryRuntimeDB } from "@/lib/factory-runtime-writer";

export const FACTORY_ASSURANCE_CONTROLLED_FIXTURE_REPLACEMENT_PLAN_VERSION = "FACTORY_ASSURANCE_CONTROLLED_FIXTURE_REPLACEMENT_PLAN_V1" as const;

type Row = Record<string, unknown>;
const clean = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);
const idempotencyPattern = /^[A-Za-z0-9._:-]{16,200}$/;
const exactHashPattern = /^[a-f0-9]{64}$/;
const deterministicId = (prefix: string, hash: string) => `${prefix}-${hash.slice(0, 24)}`;
const first = (db: FactoryRuntimeDB, query: string, ...values: unknown[]) => db.prepare(query).bind(...values).first<Row>();
const rows = async (db: FactoryRuntimeDB, query: string, ...values: unknown[]) => (await db.prepare(query).bind(...values).all<Row>()).results ?? [];

function replacementRoute(receipt: Row) {
  const receiptType = clean(receipt.required_receipt_type), reason = clean(receipt.terminal_reason), candidateKind = clean(receipt.candidate_kind);
  if (receiptType === "PROVIDER_TERMS_AND_PLAN_RECEIPT" && reason === "HISTORICAL_PROVIDER_BINDING_UNRECOVERABLE" && candidateKind === "AUDIO") {
    return "NEW_PROVIDER_AUDIO_WITH_NATIVE_BINDING" as const;
  }
  if (receiptType === "COMPOSITE_PARENT_RIGHTS_MANIFEST" && reason === "HISTORICAL_SOURCE_LINEAGE_UNRECOVERABLE" && ["MASTER", "PACKAGING"].includes(candidateKind)) {
    return "NEW_COMPOSITE_MASTER_WITH_EXACT_PARENT_MANIFEST" as const;
  }
  if (receiptType === "AUTHORSHIP_SOURCE_RECEIPT" && reason === "HISTORICAL_SOURCE_LINEAGE_UNRECOVERABLE") {
    return "NEW_AUTHORED_FIXTURE_WITH_EXACT_SOURCE_RECEIPT" as const;
  }
  throw new FactoryRuntimeError("ASSURANCE_CONTROLLED_FIXTURE_REPLACEMENT_ROUTE_INVALID", 409, "The terminal receipt cannot be mapped to a controlled replacement route", [clean(receipt.id), candidateKind, receiptType, reason]);
}

function generationContract(route: ReturnType<typeof replacementRoute>) {
  if (route === "NEW_PROVIDER_AUDIO_WITH_NATIVE_BINDING") return {
    artifactClass: "AUDIO", generationMode: "NEW_PROVIDER_GENERATION_ONLY", requiredAtGeneration: [
      "EXACT_REQUEST_RESPONSE_ARTIFACT_BINDING", "PROVIDER_REQUEST_ID", "RAW_RESPONSE_HASH", "EXACT_OUTPUT_BYTES_SHA256",
      "TERMS_SNAPSHOT_EFFECTIVE_AT_GENERATION", "PAID_PLAN_EVIDENCE_AT_GENERATION", "COMMERCIAL_SCOPE_AND_TERRITORY_VERIFIED",
    ], dispatchRequires: ["SEPARATE_TYPED_PROVIDER_GATE", "EXACT_COST_RESERVATION", "BOUNDED_BATCH_AUTHORIZATION"],
  };
  if (route === "NEW_COMPOSITE_MASTER_WITH_EXACT_PARENT_MANIFEST") return {
    artifactClass: "COMPOSITE_MASTER", generationMode: "NEW_DETERMINISTIC_COMPOSITION_ONLY", requiredAtGeneration: [
      "EXACT_PARENT_ARTIFACT_IDS", "EXACT_PARENT_SHA256_VALUES", "IMMUTABLE_PARENT_MANIFEST_HASH", "COMPOSITOR_VERSION",
      "RENDER_SETTINGS_HASH", "EXACT_OUTPUT_BYTES_SHA256",
    ], dispatchRequires: ["SEPARATE_TYPED_MATERIALIZATION_GATE", "ALL_PARENT_RIGHTS_RECEIPTS_PASS", "BOUNDED_BATCH_AUTHORIZATION"],
  };
  return {
    artifactClass: "AUTHORED_FIXTURE", generationMode: "NEW_CHANNEL_AUTHORED_SOURCE_ONLY", requiredAtGeneration: [
      "AUTHOR_IDENTITY", "AUTHORSHIP_SOURCE_RECEIPT", "COMMERCIAL_SCOPE_AND_TERRITORY_VERIFIED", "EXACT_OUTPUT_BYTES_SHA256",
    ], dispatchRequires: ["SEPARATE_TYPED_MATERIALIZATION_GATE", "OWNER_AUTHORED_SOURCE_CONFIRMATION", "BOUNDED_BATCH_AUTHORIZATION"],
  };
}

function rightsLineageContract(route: ReturnType<typeof replacementRoute>) {
  return {
    route,
    rightsStateBeforeMaterialization: "NOT_EVALUATED",
    requiredBeforeCorpusReview: route === "NEW_PROVIDER_AUDIO_WITH_NATIVE_BINDING"
      ? ["NATIVE_PROVIDER_BINDING_VERIFIED", "GENERATION_TIME_TERMS_AND_PLAN_RECEIPT_VERIFIED", "EXACT_BYTES_READBACK_VERIFIED"]
      : route === "NEW_COMPOSITE_MASTER_WITH_EXACT_PARENT_MANIFEST"
        ? ["EXACT_PARENT_MANIFEST_VERIFIED", "EVERY_PARENT_CURRENT_RIGHTS_RECEIPT_VERIFIED", "EXACT_BYTES_READBACK_VERIFIED"]
        : ["EXACT_AUTHORSHIP_SOURCE_RECEIPT_VERIFIED", "CURRENT_COMMERCIAL_USE_SCOPE_VERIFIED", "EXACT_BYTES_READBACK_VERIFIED"],
    admissionAuthority: "NONE_UNTIL_SEPARATE_REVIEW",
  };
}

export async function planFactoryAssuranceControlledFixtureReplacements(
  db: FactoryRuntimeDB,
  input: { actor: string; idempotencyKey: string },
) {
  const actor = clean(input.actor), idempotencyKey = clean(input.idempotencyKey);
  if (!actor) throw new FactoryRuntimeError("ASSURANCE_CONTROLLED_FIXTURE_REPLACEMENT_ACTOR_REQUIRED", 400, "An authenticated owner actor is required");
  if (!idempotencyPattern.test(idempotencyKey)) throw new FactoryRuntimeError("ASSURANCE_CONTROLLED_FIXTURE_REPLACEMENT_IDEMPOTENCY_KEY_INVALID", 400, "A stable 16–200 character idempotency key is required");
  const terminal = await first(db, `SELECT * FROM factory_assurance_current_rights_terminal_disposition_runs ORDER BY created_at DESC,id DESC LIMIT 1`);
  if (!terminal || clean(terminal.lifecycle_state) !== "COMPLETE") throw new FactoryRuntimeError("ASSURANCE_CURRENT_RIGHTS_TERMINAL_COMPLETE_REQUIRED", 409, "A complete immutable terminal disposition is required before replacement planning");
  const terminalRunId = clean(terminal.id), snapshotId = clean(terminal.remediation_snapshot_id);
  if (number(terminal.remaining_receipt_collection_items) !== 0 || number(terminal.replacement_required_items) !== number(terminal.scope_items) || number(terminal.quarantined_items) !== number(terminal.scope_items) || number(terminal.scope_items) <= 0) {
    throw new FactoryRuntimeError("ASSURANCE_CONTROLLED_FIXTURE_REPLACEMENT_TERMINAL_SCOPE_INVALID", 409, "The terminal run must close its whole non-empty scope as quarantine and replacement-required");
  }
  const requestHash = await canonicalHash({ version: FACTORY_ASSURANCE_CONTROLLED_FIXTURE_REPLACEMENT_PLAN_VERSION, terminalRunId, snapshotId, idempotencyKey, actor });
  const prior = await first(db, `SELECT * FROM factory_assurance_controlled_fixture_replacement_plan_runs WHERE terminal_run_id=? AND idempotency_key=? LIMIT 1`, terminalRunId, idempotencyKey);
  if (prior) {
    if (clean(prior.request_hash) !== requestHash) throw new FactoryRuntimeError("ASSURANCE_CONTROLLED_FIXTURE_REPLACEMENT_IDEMPOTENCY_CONFLICT", 409, "The idempotency key is bound to another replacement-plan intent");
    return {
      outcome: "IDEMPOTENT_REPLAY" as const, runId: clean(prior.id), terminalRunId, snapshotId,
      scopeItems: number(prior.scope_items), plannedWorkOrders: number(prior.planned_work_orders), providerAudioOrders: number(prior.provider_audio_orders),
      compositeMasterOrders: number(prior.composite_master_orders), authorshipOrders: number(prior.authorship_orders), materializedItems: 0,
      pendingMaterializationItems: number(prior.pending_materialization_items), lifecycleState: clean(prior.lifecycle_state), providerRequests: 0, spendMicros: 0,
    };
  }
  const terminalReceipts = await rows(db, `SELECT * FROM factory_assurance_current_rights_terminal_disposition_receipts WHERE run_id=? ORDER BY required_receipt_type,source_candidate_id,id`, terminalRunId);
  if (terminalReceipts.length !== number(terminal.scope_items)) throw new FactoryRuntimeError("ASSURANCE_CONTROLLED_FIXTURE_REPLACEMENT_SCOPE_DRIFT", 409, "The immutable terminal receipt scope no longer matches its run", [`observed:${terminalReceipts.length}`, `expected:${number(terminal.scope_items)}`]);
  const workOrders: Array<Row> = [];
  for (const receipt of terminalReceipts) {
    const exactArtifactHash = clean(receipt.exact_artifact_hash).toLowerCase();
    if (clean(receipt.disposition) !== "QUARANTINED_FAILURE_EVIDENCE_ONLY" || clean(receipt.replacement_action) !== "CONTROLLED_FIXTURE_REPLACEMENT_REQUIRED" || number(receipt.rights_eligible) !== 0 || !exactHashPattern.test(exactArtifactHash)) {
      throw new FactoryRuntimeError("ASSURANCE_CONTROLLED_FIXTURE_REPLACEMENT_RECEIPT_INVALID", 409, "Every source receipt must remain exact-hash quarantine evidence and replacement-required", [clean(receipt.id)]);
    }
    const route = replacementRoute(receipt);
    const identityHash = await canonicalHash({ version: FACTORY_ASSURANCE_CONTROLLED_FIXTURE_REPLACEMENT_PLAN_VERSION, terminalReceiptId: clean(receipt.id), route, purpose: "FRESH_REPLACEMENT_IDENTITY" });
    const replacementIdentity = deterministicId("controlled-fixture-replacement", identityHash);
    const replacementCorrelationGroup = deterministicId("controlled-fixture-correlation", await canonicalHash({ replacementIdentity, terminalReceiptId: clean(receipt.id) }));
    const generation = generationContract(route), rightsLineage = rightsLineageContract(route);
    const independence = {
      historicalExactArtifactHash: exactArtifactHash,
      historicalBytesUse: "FORBIDDEN_AS_REPLACEMENT_OR_PARENT",
      exactByteReuseAllowed: false,
      derivedFromHistoricalBytesAllowed: false,
      replacementIdentity,
      replacementCorrelationGroup,
      correlationRule: "ONE_TERMINAL_RECEIPT_ONE_FRESH_GROUP",
    };
    const facts = {
      terminalReceiptId: clean(receipt.id), sourceCandidateId: clean(receipt.source_candidate_id), sourceArtifactId: clean(receipt.source_artifact_id),
      candidateKind: clean(receipt.candidate_kind), historicalExactArtifactHash: exactArtifactHash, terminalReason: clean(receipt.terminal_reason),
      requiredReceiptType: clean(receipt.required_receipt_type), replacementRoute: route, replacementIdentity, replacementCorrelationGroup,
      generationContract: generation, rightsLineageContract: rightsLineage, independenceContract: independence,
      workOrderState: "PLANNED_ZERO_DISPATCH" as const, materializationState: "NOT_MATERIALIZED" as const,
      sourceDisposition: "QUARANTINED_FAILURE_EVIDENCE_ONLY" as const, sourceRightsEligible: false as const,
    };
    workOrders.push({ ...facts, generationContractJson: canonicalStringify(generation), rightsLineageContractJson: canonicalStringify(rightsLineage), independenceContractJson: canonicalStringify(independence), evidenceHash: await canonicalHash({ version: FACTORY_ASSURANCE_CONTROLLED_FIXTURE_REPLACEMENT_PLAN_VERSION, terminalRunId, snapshotId, facts }) });
  }
  const providerAudioOrders = workOrders.filter((order) => order.replacementRoute === "NEW_PROVIDER_AUDIO_WITH_NATIVE_BINDING").length;
  const compositeMasterOrders = workOrders.filter((order) => order.replacementRoute === "NEW_COMPOSITE_MASTER_WITH_EXACT_PARENT_MANIFEST").length;
  const authorshipOrders = workOrders.length - providerAudioOrders - compositeMasterOrders;
  const summary = { scopeItems: workOrders.length, plannedWorkOrders: workOrders.length, providerAudioOrders, compositeMasterOrders, authorshipOrders, materializedItems: 0, pendingMaterializationItems: workOrders.length, lifecycleState: "COMPLETE" as const };
  const manifestHash = await canonicalHash({ version: FACTORY_ASSURANCE_CONTROLLED_FIXTURE_REPLACEMENT_PLAN_VERSION, terminalRunId, workOrderEvidenceHashes: workOrders.map((order) => clean(order.evidenceHash)) });
  const evidenceHash = await canonicalHash({ version: FACTORY_ASSURANCE_CONTROLLED_FIXTURE_REPLACEMENT_PLAN_VERSION, terminalRunId, snapshotId, requestHash, manifestHash, summary });
  const runId = deterministicId("factory-assurance-fixture-replacement-plan-run", requestHash);
  const statements = [db.prepare(`INSERT INTO factory_assurance_controlled_fixture_replacement_plan_runs
    (id,terminal_run_id,remediation_snapshot_id,idempotency_key,request_hash,policy_version,scope_items,planned_work_orders,provider_audio_orders,composite_master_orders,authorship_orders,materialized_items,pending_materialization_items,lifecycle_state,actor,count_eligible,qualification_authority,pass_authority,provider_dispatch_authority,r22_authority,master_authority,release_authority,publication_authority,provider_requests,spend_micros,manifest_hash,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,0,0,0,0,0,0,0,0,?,?)`).bind(runId, terminalRunId, snapshotId, idempotencyKey, requestHash, FACTORY_ASSURANCE_CONTROLLED_FIXTURE_REPLACEMENT_PLAN_VERSION, summary.scopeItems, summary.plannedWorkOrders, providerAudioOrders, compositeMasterOrders, authorshipOrders, 0, summary.pendingMaterializationItems, summary.lifecycleState, actor, manifestHash, evidenceHash)];
  for (const order of workOrders) statements.push(db.prepare(`INSERT INTO factory_assurance_controlled_fixture_replacement_work_orders
    (id,run_id,terminal_run_id,terminal_receipt_id,remediation_snapshot_id,source_candidate_id,source_artifact_id,candidate_kind,historical_exact_artifact_hash,terminal_reason,required_receipt_type,replacement_route,replacement_identity,replacement_correlation_group,generation_contract_json,rights_lineage_contract_json,independence_contract_json,work_order_state,materialization_state,source_disposition,source_rights_eligible,policy_version,count_eligible,qualification_authority,pass_authority,provider_dispatch_authority,r22_authority,master_authority,release_authority,publication_authority,provider_requests,spend_micros,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,0,0,0,0,0,0,0,0,0,0,?)`).bind(deterministicId("factory-assurance-fixture-replacement-order", clean(order.evidenceHash)), runId, terminalRunId, order.terminalReceiptId, snapshotId, order.sourceCandidateId, order.sourceArtifactId, order.candidateKind, order.historicalExactArtifactHash, order.terminalReason, order.requiredReceiptType, order.replacementRoute, order.replacementIdentity, order.replacementCorrelationGroup, order.generationContractJson, order.rightsLineageContractJson, order.independenceContractJson, order.workOrderState, order.materializationState, order.sourceDisposition, FACTORY_ASSURANCE_CONTROLLED_FIXTURE_REPLACEMENT_PLAN_VERSION, order.evidenceHash));
  await db.batch(statements);
  return {
    outcome: "RECORDED" as const, runId, terminalRunId, snapshotId, ...summary,
    countEligible: false, qualificationAuthority: false, passAuthority: false, providerDispatchAuthority: false,
    r22Authority: false, masterAuthority: false, releaseAuthority: false, publicationAuthority: false, providerRequests: 0, spendMicros: 0,
  };
}
