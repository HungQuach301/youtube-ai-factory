import { canonicalHash, canonicalStringify } from "@/lib/canonical-json";
import {
  CONTROLLED_FIXTURE_AUDIO_CAPABILITY_KEY,
  CONTROLLED_FIXTURE_AUDIO_CAPABILITY_VERSION,
  CONTROLLED_FIXTURE_AUDIO_COST_POLICY_VERSION,
  CONTROLLED_FIXTURE_AUDIO_MAX_PROVIDER_REQUESTS,
  CONTROLLED_FIXTURE_AUDIO_MAX_SPEND_MICROS,
  CONTROLLED_FIXTURE_AUDIO_QUALITY_STANDARD_VERSION,
  CONTROLLED_FIXTURE_AUDIO_RETENTION_POLICY_VERSION,
  CONTROLLED_FIXTURE_AUDIO_RIGHTS_POLICY_VERSION,
} from "@/lib/factory-assurance-controlled-fixture-audio-preflight";
import { FACTORY_PROVIDER_CONTROL_VERSION } from "@/lib/factory-provider-control-plane";
import {
  FACTORY_PROVIDER_GATEWAY_VERSION,
  resolveFactoryProviderRoute,
  type FactoryProviderWorkRequest,
} from "@/lib/factory-provider-gateway";
import {
  FACTORY_RUNTIME_WRITER_VERSION,
  FactoryRuntimeError,
  reserveFactoryRuntimeWork,
  submitFactoryRuntimeCommandWithEffects,
  type FactoryRuntimeDB,
  type FactoryRuntimeExecution,
} from "@/lib/factory-runtime-writer";

export const FACTORY_ASSURANCE_AUDIO_ROUTE_RESERVATION_VERSION = "FACTORY_ASSURANCE_AUDIO_ROUTE_RESERVATION_V1" as const;

type Row = Record<string, unknown>;
const clean = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);
const parse = <T>(value: unknown, fallback: T): T => { try { return JSON.parse(clean(value)) as T; } catch { return fallback; } };
const first = (db: FactoryRuntimeDB, query: string, ...values: unknown[]) => db.prepare(query).bind(...values).first<Row>();
const deterministicId = (prefix: string, hash: string) => `${prefix}-${hash.slice(0, 24)}`;
const idempotencyPattern = /^[A-Za-z0-9._:-]{16,200}$/;

function resultFrom(row: Row, outcome: "RECORDED" | "IDEMPOTENT_REPLAY") {
  return {
    outcome,
    runId: clean(row.id),
    certificationRunId: clean(row.certification_run_id),
    contractId: clean(row.contract_id),
    planState: clean(row.plan_state) as "PLANNED" | "BLOCKED",
    blockers: parse<string[]>(row.blockers_json, []),
    providerId: clean(row.provider_id),
    bindingId: clean(row.binding_id),
    qualificationId: clean(row.qualification_id),
    rightsReceiptId: clean(row.rights_receipt_id),
    driftReceiptId: clean(row.drift_receipt_id),
    costEnvelopeId: clean(row.cost_envelope_id),
    workRequestId: clean(row.work_request_id) || null,
    routeDecisionId: clean(row.route_decision_id) || null,
    costReservationId: clean(row.cost_reservation_id) || null,
    runtimeCommandId: clean(row.runtime_command_id) || null,
    runtimeEventId: clean(row.runtime_event_id) || null,
    runtimeLeaseId: clean(row.runtime_lease_id) || null,
    canonicalWorkRequests: number(row.canonical_work_requests),
    canonicalRouteDecisions: number(row.canonical_route_decisions),
    canonicalCostReservations: number(row.canonical_cost_reservations),
    reservedProviderRequests: number(row.reserved_provider_requests),
    reservedSpendMicros: number(row.reserved_spend_micros),
    providerGenerationRequests: 0,
    providerDispatchAuthority: false,
    costReservationAuthority: false,
    r22Authority: false,
    releaseAuthority: false,
    publicationAuthority: false,
    providerRequests: 0,
    spendMicros: 0,
  };
}

export async function planFactoryAssuranceAudioRouteReservation(
  db: FactoryRuntimeDB,
  input: { actor: string; idempotencyKey: string; evaluatedAt?: string },
  execution?: FactoryRuntimeExecution,
) {
  const actor = clean(input.actor);
  const idempotencyKey = clean(input.idempotencyKey);
  const evaluatedAt = clean(input.evaluatedAt) || (execution?.now?.() ?? new Date()).toISOString();
  if (!actor) throw new FactoryRuntimeError("ASSURANCE_AUDIO_ROUTE_RESERVATION_ACTOR_REQUIRED", 400, "An authenticated owner actor is required");
  if (!idempotencyPattern.test(idempotencyKey)) throw new FactoryRuntimeError("ASSURANCE_AUDIO_ROUTE_RESERVATION_IDEMPOTENCY_KEY_INVALID", 400, "A stable 16–200 character idempotency key is required");
  if (!Number.isFinite(Date.parse(evaluatedAt))) throw new FactoryRuntimeError("ASSURANCE_AUDIO_ROUTE_RESERVATION_EVALUATED_AT_INVALID", 400, "The route-plan evaluation time must be an ISO timestamp");

  const requestHash = await canonicalHash({ version: FACTORY_ASSURANCE_AUDIO_ROUTE_RESERVATION_VERSION, actor, idempotencyKey, evaluatedAt });
  const prior = await first(db, "SELECT * FROM factory_assurance_audio_route_reservation_runs WHERE idempotency_key=?", idempotencyKey);
  if (prior) {
    if (clean(prior.request_hash) !== requestHash) throw new FactoryRuntimeError("ASSURANCE_AUDIO_ROUTE_RESERVATION_IDEMPOTENCY_CONFLICT", 409, "The route-plan idempotency key is already bound to another intent");
    return resultFrom(prior, "IDEMPOTENT_REPLAY");
  }
  const alreadyPlanned = await first(db, "SELECT id FROM factory_assurance_audio_route_reservation_runs WHERE plan_state='PLANNED' ORDER BY evaluated_at DESC,created_at DESC,id DESC LIMIT 1");
  if (alreadyPlanned) throw new FactoryRuntimeError("ASSURANCE_AUDIO_ROUTE_ALREADY_PLANNED", 409, "The canonical PLAN_ONLY audio route and cost reservation already exist");

  const row = await first(db, `SELECT
      x.id certification_run_id,x.certification_state,x.provider_id certification_provider_id,x.binding_id certification_binding_id,
      x.qualification_id certification_qualification_id,x.rights_receipt_id certification_rights_receipt_id,x.drift_receipt_id certification_drift_receipt_id,
      x.exact_audio_bindings,x.exact_audio_qualifications,x.exact_audio_rights_receipts,x.exact_audio_current_drift_receipts,x.exact_audio_route_ready_bindings,
      c.*,p.lifecycle_state provider_state,p.health_state,cap.lifecycle_state capability_state,
      b.lifecycle_state binding_state,b.provider_id binding_provider_id,b.output_schema_hash binding_output_schema_hash,b.settings_hash binding_settings_hash,
      b.rights_policy_version binding_rights_policy_version,b.retention_policy_version binding_retention_policy_version,b.max_payload_bytes,
      q.binding_id qualification_binding_id,q.standard_version,q.settings_hash qualification_settings_hash,q.sample_size,q.first_pass_yield,q.p0_escape_count,
      q.lifecycle_state qualification_state,q.qualified_at,q.expires_at qualification_expires_at,
      r.binding_id rights_binding_id,r.rights_policy_version receipt_rights_policy_version,r.retention_policy_version receipt_retention_policy_version,
      r.commercial_use_state,r.valid_from rights_valid_from,r.expires_at rights_expires_at,
      d.binding_id drift_binding_id,d.qualification_id drift_qualification_id,d.drift_state,d.observed_at drift_observed_at,
      (SELECT latest.id FROM factory_provider_drift_receipts latest WHERE latest.binding_id=b.id ORDER BY latest.observed_at DESC,latest.created_at DESC,latest.id DESC LIMIT 1) latest_drift_receipt_id,
      e.scope_type envelope_scope_type,e.scope_id envelope_scope_id,e.currency envelope_currency,e.max_spend_micros envelope_max_spend_micros,
      e.max_provider_requests envelope_max_provider_requests,e.policy_version envelope_policy_version,e.lifecycle_state envelope_state
    FROM factory_assurance_audio_provider_certification_runs x
    JOIN factory_assurance_controlled_fixture_audio_request_contracts c ON c.id=x.contract_id
    JOIN factory_providers p ON p.id=x.provider_id
    JOIN factory_provider_bindings b ON b.id=x.binding_id
    JOIN factory_capabilities cap ON cap.id=b.capability_id
    JOIN factory_capability_qualifications q ON q.id=x.qualification_id
    JOIN factory_rights_eligibility_receipts r ON r.id=x.rights_receipt_id
    JOIN factory_provider_drift_receipts d ON d.id=x.drift_receipt_id
    JOIN factory_cost_envelopes e ON e.id=c.cost_envelope_id
    WHERE x.certification_state='CERTIFIED'
    ORDER BY x.observed_at DESC,x.created_at DESC,x.id DESC LIMIT 1`);
  if (!row) throw new FactoryRuntimeError("ASSURANCE_AUDIO_PROVIDER_CERTIFICATION_REQUIRED", 409, "An exact certified audio-provider binding is required before canonical route planning");

  const providerId = clean(row.certification_provider_id), bindingId = clean(row.certification_binding_id);
  const qualificationId = clean(row.certification_qualification_id), rightsReceiptId = clean(row.certification_rights_receipt_id);
  const driftReceiptId = clean(row.certification_drift_receipt_id), contractId = clean(row.id), costEnvelopeId = clean(row.cost_envelope_id);
  const blockers: string[] = [];
  if ([row.exact_audio_bindings,row.exact_audio_qualifications,row.exact_audio_rights_receipts,row.exact_audio_current_drift_receipts,row.exact_audio_route_ready_bindings].some((value) => number(value) !== 1)) blockers.push("CERTIFICATION_CARDINALITY_INVALID");
  if (clean(row.capability_key) !== CONTROLLED_FIXTURE_AUDIO_CAPABILITY_KEY || clean(row.capability_version) !== CONTROLLED_FIXTURE_AUDIO_CAPABILITY_VERSION || clean(row.archetype) !== "CLEAN_AUDIO_CONTROL") blockers.push("TYPED_AUDIO_CONTRACT_MISMATCH");
  if (clean(row.dispatch_mode) !== "PLAN_ONLY" || number(row.fallback_allowed) !== 0 || number(row.max_provider_requests) !== CONTROLLED_FIXTURE_AUDIO_MAX_PROVIDER_REQUESTS || number(row.max_spend_micros) !== CONTROLLED_FIXTURE_AUDIO_MAX_SPEND_MICROS) blockers.push("PLAN_ONLY_BOUNDARY_MISMATCH");
  if (clean(row.route_preflight_state) !== "BLOCKED" || clean(row.materialization_state) !== "NOT_MATERIALIZED") blockers.push("IMMUTABLE_PREFLIGHT_BOUNDARY_MISMATCH");
  if (clean(row.provider_state) !== "ACTIVE" || clean(row.health_state) !== "HEALTHY" || clean(row.capability_state) !== "ACTIVE" || clean(row.binding_state) !== "ACTIVE") blockers.push("EXACT_PROVIDER_BINDING_NOT_ACTIVE");
  if (clean(row.binding_provider_id) !== providerId || clean(row.binding_output_schema_hash) !== clean(row.output_schema_hash) || clean(row.binding_settings_hash) !== clean(row.settings_hash)
    || clean(row.binding_rights_policy_version) !== CONTROLLED_FIXTURE_AUDIO_RIGHTS_POLICY_VERSION || clean(row.binding_retention_policy_version) !== CONTROLLED_FIXTURE_AUDIO_RETENTION_POLICY_VERSION
    || number(row.max_payload_bytes) < number(row.payload_bytes)) blockers.push("EXACT_PROVIDER_BINDING_MISMATCH");
  if (clean(row.qualification_binding_id) !== bindingId || clean(row.qualification_state) !== "QUALIFIED" || clean(row.standard_version) !== CONTROLLED_FIXTURE_AUDIO_QUALITY_STANDARD_VERSION
    || clean(row.qualification_settings_hash) !== clean(row.settings_hash) || number(row.sample_size) < 1 || number(row.first_pass_yield) < 1 || number(row.p0_escape_count) !== 0
    || clean(row.qualified_at) > evaluatedAt || (clean(row.qualification_expires_at) && clean(row.qualification_expires_at) <= evaluatedAt)) blockers.push("EXACT_AUDIO_QUALIFICATION_INVALID");
  if (clean(row.rights_binding_id) !== bindingId || clean(row.receipt_rights_policy_version) !== CONTROLLED_FIXTURE_AUDIO_RIGHTS_POLICY_VERSION
    || clean(row.receipt_retention_policy_version) !== CONTROLLED_FIXTURE_AUDIO_RETENTION_POLICY_VERSION || clean(row.commercial_use_state) !== "ELIGIBLE"
    || clean(row.rights_valid_from) > evaluatedAt || (clean(row.rights_expires_at) && clean(row.rights_expires_at) <= evaluatedAt)) blockers.push("EXACT_AUDIO_RIGHTS_INVALID");
  if (clean(row.drift_binding_id) !== bindingId || clean(row.drift_qualification_id) !== qualificationId || clean(row.drift_state) !== "CURRENT" || clean(row.latest_drift_receipt_id) !== driftReceiptId || clean(row.drift_observed_at) > evaluatedAt) blockers.push("EXACT_AUDIO_DRIFT_NOT_CURRENT");
  if (clean(row.envelope_scope_type) !== "REQUEST" || clean(row.envelope_scope_id) !== clean(row.future_work_request_id) || clean(row.envelope_currency) !== "USD"
    || number(row.envelope_max_provider_requests) !== CONTROLLED_FIXTURE_AUDIO_MAX_PROVIDER_REQUESTS || number(row.envelope_max_spend_micros) !== CONTROLLED_FIXTURE_AUDIO_MAX_SPEND_MICROS
    || clean(row.envelope_policy_version) !== CONTROLLED_FIXTURE_AUDIO_COST_POLICY_VERSION || clean(row.envelope_state) !== "ACTIVE") blockers.push("EXACT_AUDIO_COST_ENVELOPE_INVALID");
  if (await first(db, "SELECT id FROM factory_provider_work_requests WHERE id=?", clean(row.future_work_request_id))) blockers.push("CANONICAL_WORK_REQUEST_ALREADY_EXISTS");

  const routeInput: FactoryProviderWorkRequest = {
    videoId: clean(row.work_order_id),
    shotContractId: null,
    capabilityKey: CONTROLLED_FIXTURE_AUDIO_CAPABILITY_KEY,
    capabilityVersion: CONTROLLED_FIXTURE_AUDIO_CAPABILITY_VERSION,
    archetype: "CLEAN_AUDIO_CONTROL",
    inputHash: clean(row.input_hash),
    payloadBytes: number(row.payload_bytes),
    expectedOutputSchemaHash: clean(row.output_schema_hash),
    requiredSettingsHash: clean(row.settings_hash),
    standardVersion: CONTROLLED_FIXTURE_AUDIO_QUALITY_STANDARD_VERSION,
    rightsPolicyVersion: CONTROLLED_FIXTURE_AUDIO_RIGHTS_POLICY_VERSION,
    retentionPolicyVersion: CONTROLLED_FIXTURE_AUDIO_RETENTION_POLICY_VERSION,
    minimumSampleSize: 1,
    minimumFirstPassYield: 1,
    dispatchMode: "PLAN_ONLY",
    maxProviderRequests: CONTROLLED_FIXTURE_AUDIO_MAX_PROVIDER_REQUESTS,
    maxSpendMicros: CONTROLLED_FIXTURE_AUDIO_MAX_SPEND_MICROS,
    fallbackAllowed: false,
    requestedBindingId: bindingId,
    evaluatedAt,
  };
  const routeInputHash = await canonicalHash(routeInput);
  const route = await resolveFactoryProviderRoute(db, routeInput);
  if (route.decision !== "PLANNED_ZERO_DISPATCH") blockers.push(...route.reasons);
  if (route.bindingId !== bindingId || route.qualificationId !== qualificationId || route.providerId !== providerId) blockers.push("CERTIFIED_ROUTE_IDENTITY_MISMATCH");
  const uniqueBlockers = [...new Set(blockers)].sort();
  const runId = deterministicId("factory-assurance-audio-route-run", requestHash);
  const receiptId = deterministicId("factory-assurance-audio-route-receipt", await canonicalHash({ requestHash, routeInputHash, blockers: uniqueBlockers }));

  if (uniqueBlockers.length) {
    const evidenceHash = await canonicalHash({ version: FACTORY_ASSURANCE_AUDIO_ROUTE_RESERVATION_VERSION, requestHash, routeInputHash, planState: "BLOCKED", blockers: uniqueBlockers });
    await db.batch([
      db.prepare(`INSERT INTO factory_assurance_audio_route_reservation_runs
        (id,certification_run_id,contract_id,idempotency_key,request_hash,policy_version,plan_state,blockers_json,provider_id,binding_id,qualification_id,rights_receipt_id,drift_receipt_id,cost_envelope_id,work_request_id,route_decision_id,cost_reservation_id,runtime_command_id,runtime_event_id,runtime_lease_id,canonical_work_requests,canonical_route_decisions,canonical_cost_reservations,reserved_provider_requests,reserved_spend_micros,provider_generation_requests,provider_dispatch_authority,cost_reservation_authority,r22_authority,master_authority,release_authority,publication_authority,provider_requests,spend_micros,evaluated_at,actor,evidence_hash)
        VALUES (?,?,?,?,?,?,'BLOCKED',?,?,?,?,?,?,?,NULL,NULL,NULL,NULL,NULL,NULL,0,0,0,0,0,0,0,0,0,0,0,0,0,0,?,?,?)`).bind(
        runId, row.certification_run_id, contractId, idempotencyKey, requestHash, FACTORY_ASSURANCE_AUDIO_ROUTE_RESERVATION_VERSION,
        canonicalStringify(uniqueBlockers), providerId, bindingId, qualificationId, rightsReceiptId, driftReceiptId, costEnvelopeId, evaluatedAt, actor, evidenceHash,
      ),
      db.prepare(`INSERT INTO factory_assurance_audio_route_plan_receipts
        (id,run_id,certification_run_id,contract_id,cost_envelope_id,work_request_id,route_decision_id,cost_reservation_id,route_input_hash,route_decision_hash,reservation_intent_hash,qualification_expires_at,rights_expires_at,drift_state,dispatch_mode,fallback_allowed,envelope_scope_type,envelope_currency,envelope_max_provider_requests,envelope_max_spend_micros,receipt_state,blockers_json,provider_requests,spend_micros,evidence_hash)
        VALUES (?,?,?,?,?,NULL,NULL,NULL,?,NULL,NULL,?,?,'CURRENT','PLAN_ONLY',0,'REQUEST','USD',2,80000,'BLOCKED',?,0,0,?)`).bind(
        receiptId, runId, row.certification_run_id, contractId, costEnvelopeId, routeInputHash, row.qualification_expires_at, row.rights_expires_at, canonicalStringify(uniqueBlockers), evidenceHash,
      ),
    ]);
    const recorded = await first(db, "SELECT * FROM factory_assurance_audio_route_reservation_runs WHERE id=?", runId);
    if (!recorded) throw new FactoryRuntimeError("ASSURANCE_AUDIO_ROUTE_RESERVATION_WRITE_FAILED", 503, "The blocked route-plan receipt could not be reconciled after write");
    return resultFrom(recorded, "RECORDED");
  }

  const workRequestId = clean(row.future_work_request_id);
  const routeDecisionId = deterministicId("factory-provider-route", route.decisionHash);
  const workIdempotencyKey = `factory:audio:work:${requestHash.slice(0, 40)}`;
  const reservationIdempotencyKey = `factory:audio:reservation:${requestHash.slice(0, 40)}`;
  const workIntentHash = await canonicalHash({ version: FACTORY_PROVIDER_GATEWAY_VERSION, routeInput });
  const reservationEvidenceHash = await canonicalHash({ version: FACTORY_ASSURANCE_AUDIO_ROUTE_RESERVATION_VERSION, requestHash, workRequestId, routeDecisionId, costEnvelopeId, bindingId, qualificationId });
  const reservationInput = {
    workRequestId, routeDecisionId, costEnvelopeId, bindingId, qualificationId,
    idempotencyKey: reservationIdempotencyKey,
    requestedProviderRequests: CONTROLLED_FIXTURE_AUDIO_MAX_PROVIDER_REQUESTS,
    requestedSpendMicros: CONTROLLED_FIXTURE_AUDIO_MAX_SPEND_MICROS,
    policyVersion: CONTROLLED_FIXTURE_AUDIO_COST_POLICY_VERSION,
    evidenceHash: reservationEvidenceHash,
  };
  const reservationIntentHash = await canonicalHash({ version: FACTORY_PROVIDER_CONTROL_VERSION, input: reservationInput });
  const costReservationId = deterministicId("factory-provider-reservation", reservationIntentHash);
  const leaseIntentHash = await canonicalHash({ version: FACTORY_ASSURANCE_AUDIO_ROUTE_RESERVATION_VERSION, requestHash, stage: "AUDIO_ROUTE_RESERVATION" });
  const runtimeEvidenceHash = await canonicalHash({ version: FACTORY_ASSURANCE_AUDIO_ROUTE_RESERVATION_VERSION, requestHash, routeDecisionHash: route.decisionHash, reservationIntentHash });
  const lease = await reserveFactoryRuntimeWork(db, {
    streamType: "ASSURANCE_AUDIO_ROUTE_PLAN", streamId: contractId, stageKey: "AUDIO_ROUTE_RESERVATION",
    expectedState: "READY", expectedVersion: 0, actorType: "OWNER", actorId: actor,
    idempotencyKey: `factory:audio:lease:${requestHash.slice(0, 40)}`, intentHash: leaseIntentHash, evidenceHash: runtimeEvidenceHash,
  }, execution);
  const commandIntentHash = await canonicalHash({ version: FACTORY_ASSURANCE_AUDIO_ROUTE_RESERVATION_VERSION, requestHash, leaseId: lease.leaseId, fencingToken: lease.fencingToken, routeDecisionHash: route.decisionHash, reservationIntentHash });
  const runEvidenceHash = await canonicalHash({ version: FACTORY_ASSURANCE_AUDIO_ROUTE_RESERVATION_VERSION, requestHash, routeInputHash, routeDecisionHash: route.decisionHash, reservationIntentHash, planState: "PLANNED", reservedProviderRequests: 2, reservedSpendMicros: 80000 });
  const result = await submitFactoryRuntimeCommandWithEffects(db, {
    streamType: "ASSURANCE_AUDIO_ROUTE_PLAN", streamId: contractId, commandType: "FREEZE_STAGE",
    expectedState: "WorkReserved", expectedVersion: lease.streamVersion, actorType: "OWNER", actorId: actor,
    leaseId: lease.leaseId, fencingToken: lease.fencingToken,
    idempotencyKey: `factory:audio:command:${requestHash.slice(0, 40)}`, intentHash: commandIntentHash,
    policyVersions: {
      runtime: FACTORY_RUNTIME_WRITER_VERSION,
      providerGateway: FACTORY_PROVIDER_GATEWAY_VERSION,
      providerCost: FACTORY_PROVIDER_CONTROL_VERSION,
      assuranceAudioRouteReservation: FACTORY_ASSURANCE_AUDIO_ROUTE_RESERVATION_VERSION,
    },
    costScope: { mode: "PLAN_ONLY_RESERVATION", costEnvelopeId, maxProviderRequests: 2, maxSpendMicros: 80000, actualProviderRequests: 0, actualSpendMicros: 0 },
    rightsScope: { rightsPolicyVersion: CONTROLLED_FIXTURE_AUDIO_RIGHTS_POLICY_VERSION, retentionPolicyVersion: CONTROLLED_FIXTURE_AUDIO_RETENTION_POLICY_VERSION, rightsReceiptId },
    payload: { contractId, workRequestId, routeDecisionId, costReservationId, dispatchMode: "PLAN_ONLY", providerRequests: 0, spendUsd: 0, providerDispatchAuthority: false },
    evidenceHash: runtimeEvidenceHash,
  }, ({ commandId, effectEventId }) => [
    db.prepare(`INSERT INTO factory_provider_work_requests
      (id,video_id,shot_contract_id,capability_key,capability_version,archetype,input_hash,payload_bytes,expected_output_schema_hash,required_settings_hash,rights_policy_version,retention_policy_version,dispatch_mode,max_provider_requests,max_spend_micros,fallback_allowed,idempotency_key,intent_hash,created_by_command_id)
      VALUES (?,?,NULL,?,?,?,?,?,?,?,?,?,'PLAN_ONLY',2,80000,0,?,?,?)`).bind(
      workRequestId, routeInput.videoId, routeInput.capabilityKey, routeInput.capabilityVersion, routeInput.archetype, routeInput.inputHash, routeInput.payloadBytes,
      routeInput.expectedOutputSchemaHash, routeInput.requiredSettingsHash, routeInput.rightsPolicyVersion, routeInput.retentionPolicyVersion, workIdempotencyKey, workIntentHash, commandId,
    ),
    db.prepare(`INSERT INTO factory_provider_route_decisions
      (id,work_request_id,binding_id,qualification_id,decision,reasons_json,provider_requests,spend_micros,fallback_used,decision_hash,created_by_event_id)
      VALUES (?,?,?,?,'PLANNED_ZERO_DISPATCH','[]',0,0,0,?,?)`).bind(routeDecisionId, workRequestId, bindingId, qualificationId, route.decisionHash, effectEventId),
    db.prepare(`INSERT INTO factory_provider_cost_reservations
      (id,work_request_id,route_decision_id,cost_envelope_id,binding_id,qualification_id,idempotency_key,reservation_intent_hash,reserved_provider_requests,reserved_spend_micros,reservation_state,dispatch_authority,r22_authority,master_authority,release_authority,publication_authority,evidence_hash)
      VALUES (?,?,?,?,?,?,?,?,2,80000,'RESERVED',0,0,0,0,0,?)`).bind(costReservationId, workRequestId, routeDecisionId, costEnvelopeId, bindingId, qualificationId, reservationIdempotencyKey, reservationIntentHash, reservationEvidenceHash),
    db.prepare(`INSERT INTO factory_assurance_audio_route_reservation_runs
      (id,certification_run_id,contract_id,idempotency_key,request_hash,policy_version,plan_state,blockers_json,provider_id,binding_id,qualification_id,rights_receipt_id,drift_receipt_id,cost_envelope_id,work_request_id,route_decision_id,cost_reservation_id,runtime_command_id,runtime_event_id,runtime_lease_id,canonical_work_requests,canonical_route_decisions,canonical_cost_reservations,reserved_provider_requests,reserved_spend_micros,provider_generation_requests,provider_dispatch_authority,cost_reservation_authority,r22_authority,master_authority,release_authority,publication_authority,provider_requests,spend_micros,evaluated_at,actor,evidence_hash)
      VALUES (?,?,?,?,?,?,'PLANNED','[]',?,?,?,?,?,?,?,?,?,?,?,?,1,1,1,2,80000,0,0,0,0,0,0,0,0,0,?,?,?)`).bind(
      runId, row.certification_run_id, contractId, idempotencyKey, requestHash, FACTORY_ASSURANCE_AUDIO_ROUTE_RESERVATION_VERSION,
      providerId, bindingId, qualificationId, rightsReceiptId, driftReceiptId, costEnvelopeId, workRequestId, routeDecisionId, costReservationId,
      commandId, effectEventId, lease.leaseId, evaluatedAt, actor, runEvidenceHash,
    ),
    db.prepare(`INSERT INTO factory_assurance_audio_route_plan_receipts
      (id,run_id,certification_run_id,contract_id,cost_envelope_id,work_request_id,route_decision_id,cost_reservation_id,route_input_hash,route_decision_hash,reservation_intent_hash,qualification_expires_at,rights_expires_at,drift_state,dispatch_mode,fallback_allowed,envelope_scope_type,envelope_currency,envelope_max_provider_requests,envelope_max_spend_micros,receipt_state,blockers_json,provider_requests,spend_micros,evidence_hash)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'CURRENT','PLAN_ONLY',0,'REQUEST','USD',2,80000,'PASS','[]',0,0,?)`).bind(
      receiptId, runId, row.certification_run_id, contractId, costEnvelopeId, workRequestId, routeDecisionId, costReservationId,
      routeInputHash, route.decisionHash, reservationIntentHash, row.qualification_expires_at, row.rights_expires_at, runEvidenceHash,
    ),
  ], execution);
  if (result.decision !== "ACCEPTED") throw new FactoryRuntimeError("ASSURANCE_AUDIO_ROUTE_RESERVATION_WRITE_FAILED", 409, "The atomic route-plan command was rejected", result.reasons);
  const recorded = await first(db, "SELECT * FROM factory_assurance_audio_route_reservation_runs WHERE id=?", runId);
  if (!recorded) throw new FactoryRuntimeError("ASSURANCE_AUDIO_ROUTE_RESERVATION_WRITE_FAILED", 503, "The canonical route-plan receipt could not be reconciled after write");
  return resultFrom(recorded, "RECORDED");
}
