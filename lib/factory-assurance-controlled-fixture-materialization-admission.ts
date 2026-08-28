import { canonicalHash, canonicalStringify } from "@/lib/canonical-json";
import { FactoryRuntimeError, type FactoryRuntimeDB } from "@/lib/factory-runtime-writer";

export const FACTORY_ASSURANCE_CONTROLLED_FIXTURE_MATERIALIZATION_ADMISSION_VERSION = "FACTORY_ASSURANCE_CONTROLLED_FIXTURE_MATERIALIZATION_ADMISSION_V1" as const;
export const CONTROLLED_FIXTURE_AUDIO_BATCH_MAX_PROVIDER_REQUESTS = 2 as const;
export const CONTROLLED_FIXTURE_AUDIO_BATCH_MAX_SPEND_MICROS = 80_000 as const;

type Row = Record<string, unknown>;
const clean = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);
const idempotencyPattern = /^[A-Za-z0-9._:-]{16,200}$/;
const exactHashPattern = /^[a-f0-9]{64}$/;
const deterministicId = (prefix: string, hash: string) => `${prefix}-${hash.slice(0, 24)}`;
const first = (db: FactoryRuntimeDB, query: string, ...values: unknown[]) => db.prepare(query).bind(...values).first<Row>();
const rows = async (db: FactoryRuntimeDB, query: string, ...values: unknown[]) => (await db.prepare(query).bind(...values).all<Row>()).results ?? [];

async function observeProviderControls(db: FactoryRuntimeDB, evaluatedAt: string) {
  const [bindings, qualifications, rights, drift, envelopes] = await Promise.all([
    first(db, `SELECT COUNT(*) count FROM factory_provider_bindings b
      JOIN factory_providers p ON p.id=b.provider_id JOIN factory_capabilities c ON c.id=b.capability_id
      WHERE b.lifecycle_state='ACTIVE' AND p.lifecycle_state='ACTIVE' AND p.health_state='HEALTHY' AND c.lifecycle_state='ACTIVE'`),
    first(db, `SELECT COUNT(DISTINCT q.binding_id) count FROM factory_capability_qualifications q
      WHERE q.lifecycle_state='QUALIFIED' AND q.qualified_at IS NOT NULL AND q.qualified_at<=? AND (q.expires_at IS NULL OR q.expires_at>?)`, evaluatedAt, evaluatedAt),
    first(db, `SELECT COUNT(DISTINCT r.binding_id) count FROM factory_rights_eligibility_receipts r
      WHERE r.commercial_use_state='ELIGIBLE' AND r.valid_from<=? AND (r.expires_at IS NULL OR r.expires_at>?)`, evaluatedAt, evaluatedAt),
    first(db, `SELECT COUNT(*) count FROM factory_provider_bindings b WHERE
      (SELECT d.drift_state FROM factory_provider_drift_receipts d WHERE d.binding_id=b.id ORDER BY d.observed_at DESC,d.created_at DESC,d.id DESC LIMIT 1)='CURRENT'`),
    first(db, `SELECT COUNT(*) count FROM factory_cost_envelopes
      WHERE lifecycle_state='ACTIVE' AND currency='USD' AND max_provider_requests>=? AND max_spend_micros>=?`, CONTROLLED_FIXTURE_AUDIO_BATCH_MAX_PROVIDER_REQUESTS, CONTROLLED_FIXTURE_AUDIO_BATCH_MAX_SPEND_MICROS),
  ]);
  return {
    activeProviderBindingsObserved: number(bindings?.count),
    currentQualifiedBindingsObserved: number(qualifications?.count),
    currentRightsBindingsObserved: number(rights?.count),
    currentDriftBindingsObserved: number(drift?.count),
    activeCostEnvelopesObserved: number(envelopes?.count),
  };
}

function laneFor(route: string, selected: boolean) {
  if (route === "NEW_PROVIDER_AUDIO_WITH_NATIVE_BINDING") return selected ? "SELECTED_PROVIDER_AUDIO_BATCH" : "WAITING_PROVIDER_AUDIO_BATCH_SETTLEMENT";
  if (route === "NEW_COMPOSITE_MASTER_WITH_EXACT_PARENT_MANIFEST") return "WAITING_EXACT_NEW_PARENT_SET";
  return "WAITING_OWNER_AUTHORED_SOURCE";
}

function blockersFor(route: string, selected: boolean, controls: Awaited<ReturnType<typeof observeProviderControls>>) {
  if (route === "NEW_PROVIDER_AUDIO_WITH_NATIVE_BINDING" && selected) {
    const blockers = [
      "TYPED_PROVIDER_REQUEST_CONTRACT_REQUIRED",
      "EXACT_ACTIVE_PROVIDER_BINDING_REQUIRED",
      "CURRENT_CAPABILITY_QUALIFICATION_REQUIRED",
      "CURRENT_RIGHTS_ELIGIBILITY_REQUIRED",
      "CURRENT_PROVIDER_DRIFT_OBSERVATION_REQUIRED",
      "ACTIVE_COST_ENVELOPE_REQUIRED",
      "EXACT_COST_RESERVATION_REQUIRED",
      "EXPLICIT_PAID_DISPATCH_APPROVAL_REQUIRED",
    ];
    if (controls.activeProviderBindingsObserved === 0) blockers.push("NO_ACTIVE_PROVIDER_BINDING_OBSERVED");
    if (controls.currentQualifiedBindingsObserved === 0) blockers.push("NO_CURRENT_QUALIFIED_BINDING_OBSERVED");
    if (controls.currentRightsBindingsObserved === 0) blockers.push("NO_CURRENT_RIGHTS_ELIGIBLE_BINDING_OBSERVED");
    if (controls.currentDriftBindingsObserved === 0) blockers.push("NO_CURRENT_PROVIDER_DRIFT_RECEIPT_OBSERVED");
    if (controls.activeCostEnvelopesObserved === 0) blockers.push("NO_ACTIVE_COST_ENVELOPE_OBSERVED");
    return blockers.sort();
  }
  if (route === "NEW_PROVIDER_AUDIO_WITH_NATIVE_BINDING") return ["PRIOR_PROVIDER_AUDIO_BATCH_SETTLEMENT_REQUIRED"];
  if (route === "NEW_COMPOSITE_MASTER_WITH_EXACT_PARENT_MANIFEST") return ["EXACT_NEW_PARENT_SET_AND_CURRENT_RIGHTS_REQUIRED"];
  return ["OWNER_AUTHORED_SOURCE_AND_CURRENT_RIGHTS_REQUIRED"];
}

export async function admitFactoryAssuranceControlledFixtureMaterializationBatch(
  db: FactoryRuntimeDB,
  input: { actor: string; idempotencyKey: string; evaluatedAt?: string },
) {
  const actor = clean(input.actor), idempotencyKey = clean(input.idempotencyKey), evaluatedAt = clean(input.evaluatedAt) || new Date().toISOString();
  if (!actor) throw new FactoryRuntimeError("ASSURANCE_CONTROLLED_FIXTURE_MATERIALIZATION_ADMISSION_ACTOR_REQUIRED", 400, "An authenticated owner actor is required");
  if (!idempotencyPattern.test(idempotencyKey)) throw new FactoryRuntimeError("ASSURANCE_CONTROLLED_FIXTURE_MATERIALIZATION_ADMISSION_IDEMPOTENCY_KEY_INVALID", 400, "A stable 16–200 character idempotency key is required");
  const plan = await first(db, `SELECT * FROM factory_assurance_controlled_fixture_replacement_plan_runs ORDER BY created_at DESC,id DESC LIMIT 1`);
  if (!plan || clean(plan.lifecycle_state) !== "COMPLETE") throw new FactoryRuntimeError("ASSURANCE_CONTROLLED_FIXTURE_REPLACEMENT_PLAN_COMPLETE_REQUIRED", 409, "A complete immutable controlled-fixture replacement plan is required before materialization admission");
  const replacementPlanRunId = clean(plan.id), snapshotId = clean(plan.remediation_snapshot_id), scopeItems = number(plan.scope_items);
  if (scopeItems <= 0 || number(plan.planned_work_orders) !== scopeItems || number(plan.materialized_items) !== 0 || number(plan.pending_materialization_items) !== scopeItems) {
    throw new FactoryRuntimeError("ASSURANCE_CONTROLLED_FIXTURE_MATERIALIZATION_PLAN_SCOPE_INVALID", 409, "The replacement plan must remain a complete non-empty zero-materialization scope");
  }
  const requestHash = await canonicalHash({ version: FACTORY_ASSURANCE_CONTROLLED_FIXTURE_MATERIALIZATION_ADMISSION_VERSION, replacementPlanRunId, snapshotId, idempotencyKey, actor });
  const prior = await first(db, `SELECT * FROM factory_assurance_controlled_fixture_materialization_admission_runs WHERE replacement_plan_run_id=? AND idempotency_key=? LIMIT 1`, replacementPlanRunId, idempotencyKey);
  if (prior) {
    if (clean(prior.request_hash) !== requestHash) throw new FactoryRuntimeError("ASSURANCE_CONTROLLED_FIXTURE_MATERIALIZATION_ADMISSION_IDEMPOTENCY_CONFLICT", 409, "The idempotency key is bound to another materialization-admission intent");
    return {
      outcome: "IDEMPOTENT_REPLAY" as const, runId: clean(prior.id), replacementPlanRunId, snapshotId,
      scopeItems: number(prior.scope_items), selectedBatchItems: number(prior.selected_batch_items), providerAudioPendingItems: number(prior.provider_audio_pending_items),
      compositeMasterPendingItems: number(prior.composite_master_pending_items), authorshipPendingItems: number(prior.authorship_pending_items),
      dispatchReadyItems: 0, blockedItems: number(prior.blocked_items), materializedItems: 0,
      plannedMaxProviderRequests: number(prior.planned_max_provider_requests), plannedMaxSpendMicros: number(prior.planned_max_spend_micros),
      admissionState: "BLOCKED" as const, providerRequests: 0, spendMicros: 0,
    };
  }
  const workOrders = await rows(db, `SELECT * FROM factory_assurance_controlled_fixture_replacement_work_orders WHERE run_id=?
    ORDER BY CASE replacement_route WHEN 'NEW_PROVIDER_AUDIO_WITH_NATIVE_BINDING' THEN 0 WHEN 'NEW_COMPOSITE_MASTER_WITH_EXACT_PARENT_MANIFEST' THEN 1 ELSE 2 END,replacement_identity,id`, replacementPlanRunId);
  if (workOrders.length !== scopeItems) throw new FactoryRuntimeError("ASSURANCE_CONTROLLED_FIXTURE_MATERIALIZATION_ADMISSION_SCOPE_DRIFT", 409, "The immutable replacement work-order scope no longer matches its plan", [`observed:${workOrders.length}`, `expected:${scopeItems}`]);
  const controls = await observeProviderControls(db, evaluatedAt);
  const selectedIndex = workOrders.findIndex((order) => clean(order.replacement_route) === "NEW_PROVIDER_AUDIO_WITH_NATIVE_BINDING");
  const selectedBatchItems = selectedIndex >= 0 ? 1 : 0;
  const admissionItems: Array<Row> = [];
  for (let index = 0; index < workOrders.length; index += 1) {
    const order = workOrders[index], route = clean(order.replacement_route), historicalHash = clean(order.historical_exact_artifact_hash).toLowerCase();
    if (clean(order.work_order_state) !== "PLANNED_ZERO_DISPATCH" || clean(order.materialization_state) !== "NOT_MATERIALIZED" || !exactHashPattern.test(historicalHash)) {
      throw new FactoryRuntimeError("ASSURANCE_CONTROLLED_FIXTURE_MATERIALIZATION_WORK_ORDER_INVALID", 409, "Every admitted work order must remain zero-dispatch, not materialized and exact-hash bound", [clean(order.id)]);
    }
    const selected = index === selectedIndex, lane = laneFor(route, selected), blockers = blockersFor(route, selected, controls);
    const facts = {
      workOrderId: clean(order.id), replacementPlanRunId, snapshotId, route, replacementIdentity: clean(order.replacement_identity),
      replacementCorrelationGroup: clean(order.replacement_correlation_group), historicalExactArtifactHash: historicalHash, queuePosition: index + 1,
      admissionLane: lane, admissionState: "BLOCKED" as const, blockers,
      plannedMaxProviderRequests: selected ? CONTROLLED_FIXTURE_AUDIO_BATCH_MAX_PROVIDER_REQUESTS : 0,
      plannedMaxSpendMicros: selected ? CONTROLLED_FIXTURE_AUDIO_BATCH_MAX_SPEND_MICROS : 0,
      materializationState: "NOT_MATERIALIZED" as const,
    };
    admissionItems.push({ ...facts, blockersJson: canonicalStringify(blockers), evidenceHash: await canonicalHash({ version: FACTORY_ASSURANCE_CONTROLLED_FIXTURE_MATERIALIZATION_ADMISSION_VERSION, facts }) });
  }
  const providerAudioPendingItems = admissionItems.filter((item) => item.route === "NEW_PROVIDER_AUDIO_WITH_NATIVE_BINDING").length;
  const compositeMasterPendingItems = admissionItems.filter((item) => item.route === "NEW_COMPOSITE_MASTER_WITH_EXACT_PARENT_MANIFEST").length;
  const authorshipPendingItems = admissionItems.length - providerAudioPendingItems - compositeMasterPendingItems;
  const runBlockers = [...new Set(admissionItems.flatMap((item) => item.blockers as string[]))].sort();
  const summary = {
    scopeItems, selectedBatchItems, providerAudioPendingItems, compositeMasterPendingItems, authorshipPendingItems,
    dispatchReadyItems: 0, blockedItems: scopeItems, materializedItems: 0,
    plannedMaxProviderRequests: selectedBatchItems ? CONTROLLED_FIXTURE_AUDIO_BATCH_MAX_PROVIDER_REQUESTS : 0,
    plannedMaxSpendMicros: selectedBatchItems ? CONTROLLED_FIXTURE_AUDIO_BATCH_MAX_SPEND_MICROS : 0,
    admissionState: "BLOCKED" as const, lifecycleState: "COMPLETE" as const,
  };
  const manifestHash = await canonicalHash({ version: FACTORY_ASSURANCE_CONTROLLED_FIXTURE_MATERIALIZATION_ADMISSION_VERSION, replacementPlanRunId, itemEvidenceHashes: admissionItems.map((item) => clean(item.evidenceHash)) });
  const evidenceHash = await canonicalHash({ version: FACTORY_ASSURANCE_CONTROLLED_FIXTURE_MATERIALIZATION_ADMISSION_VERSION, replacementPlanRunId, snapshotId, requestHash, controls, runBlockers, manifestHash, summary });
  const runId = deterministicId("factory-assurance-fixture-materialization-admission-run", requestHash);
  const statements = [db.prepare(`INSERT INTO factory_assurance_controlled_fixture_materialization_admission_runs
    (id,replacement_plan_run_id,remediation_snapshot_id,idempotency_key,request_hash,policy_version,scope_items,selected_batch_items,provider_audio_pending_items,composite_master_pending_items,authorship_pending_items,dispatch_ready_items,blocked_items,materialized_items,planned_max_provider_requests,planned_max_spend_micros,active_provider_bindings_observed,current_qualified_bindings_observed,current_rights_bindings_observed,current_drift_bindings_observed,active_cost_envelopes_observed,admission_state,blockers_json,lifecycle_state,actor,count_eligible,qualification_authority,pass_authority,provider_dispatch_authority,cost_reservation_authority,r22_authority,master_authority,release_authority,publication_authority,provider_requests,spend_micros,manifest_hash,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,0,0,0,0,0,0,0,0,0,?,?)`).bind(
      runId, replacementPlanRunId, snapshotId, idempotencyKey, requestHash, FACTORY_ASSURANCE_CONTROLLED_FIXTURE_MATERIALIZATION_ADMISSION_VERSION,
      scopeItems, selectedBatchItems, providerAudioPendingItems, compositeMasterPendingItems, authorshipPendingItems, 0, scopeItems, 0,
      summary.plannedMaxProviderRequests, summary.plannedMaxSpendMicros, controls.activeProviderBindingsObserved, controls.currentQualifiedBindingsObserved,
      controls.currentRightsBindingsObserved, controls.currentDriftBindingsObserved, controls.activeCostEnvelopesObserved, summary.admissionState,
      canonicalStringify(runBlockers), summary.lifecycleState, actor, manifestHash, evidenceHash,
    )];
  for (const item of admissionItems) statements.push(db.prepare(`INSERT INTO factory_assurance_controlled_fixture_materialization_admission_items
    (id,run_id,replacement_plan_run_id,work_order_id,remediation_snapshot_id,replacement_route,replacement_identity,replacement_correlation_group,historical_exact_artifact_hash,queue_position,admission_lane,admission_state,blockers_json,planned_max_provider_requests,planned_max_spend_micros,materialization_state,policy_version,count_eligible,qualification_authority,pass_authority,provider_dispatch_authority,cost_reservation_authority,r22_authority,master_authority,release_authority,publication_authority,provider_requests,spend_micros,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,0,0,0,0,0,0,0,0,0,?)`).bind(
      deterministicId("factory-assurance-fixture-materialization-admission-item", clean(item.evidenceHash)), runId, replacementPlanRunId, item.workOrderId,
      snapshotId, item.route, item.replacementIdentity, item.replacementCorrelationGroup, item.historicalExactArtifactHash, item.queuePosition,
      item.admissionLane, item.admissionState, item.blockersJson, item.plannedMaxProviderRequests, item.plannedMaxSpendMicros,
      item.materializationState, FACTORY_ASSURANCE_CONTROLLED_FIXTURE_MATERIALIZATION_ADMISSION_VERSION, item.evidenceHash,
    ));
  await db.batch(statements);
  return {
    outcome: "RECORDED" as const, runId, replacementPlanRunId, snapshotId, ...summary, ...controls, blockers: runBlockers,
    countEligible: false, qualificationAuthority: false, passAuthority: false, providerDispatchAuthority: false, costReservationAuthority: false,
    r22Authority: false, masterAuthority: false, releaseAuthority: false, publicationAuthority: false, providerRequests: 0, spendMicros: 0,
  };
}
