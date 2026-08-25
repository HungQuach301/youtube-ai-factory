import { canonicalHash, canonicalStringify } from "@/lib/canonical-json";
import { FactoryRuntimeError, type FactoryRuntimeDB } from "@/lib/factory-runtime-writer";

export const FACTORY_PROVIDER_CONTROL_VERSION = "FACTORY_PROVIDER_COST_RECONCILIATION_DRIFT_V1" as const;

type Row = Record<string, unknown>;
const clean = (value: unknown) => String(value ?? "").trim();
const numeric = (value: unknown) => Number(value ?? 0);
const hashPattern = /^[a-f0-9]{64}$/;
const identityPattern = /^[A-Za-z0-9._:@/-]{3,200}$/;
const keyPattern = /^[A-Za-z0-9._:-]{16,200}$/;
const deterministicId = (prefix: string, hash: string) => `${prefix}-${hash.slice(0, 24)}`;
const json = (value: unknown) => canonicalStringify(value);

async function first(db: FactoryRuntimeDB, query: string, ...values: unknown[]) {
  return db.prepare(query).bind(...values).first<Row>();
}

function assertIdentity(label: string, value: unknown) {
  if (!identityPattern.test(clean(value))) throw new FactoryRuntimeError("PROVIDER_CONTROL_INPUT_INVALID", 400, `${label} is invalid`, [`${label}_INVALID`]);
}

function assertHash(label: string, value: unknown) {
  if (!hashPattern.test(clean(value))) throw new FactoryRuntimeError("PROVIDER_CONTROL_INPUT_INVALID", 400, `${label} is invalid`, [`${label}_INVALID`]);
}

function assertKey(label: string, value: unknown) {
  if (!keyPattern.test(clean(value))) throw new FactoryRuntimeError("PROVIDER_CONTROL_INPUT_INVALID", 400, `${label} is invalid`, [`${label}_INVALID`]);
}

export type FactoryProviderCostReservationInput = {
  workRequestId: string;
  routeDecisionId: string;
  costEnvelopeId: string;
  bindingId: string;
  qualificationId: string;
  idempotencyKey: string;
  requestedProviderRequests: number;
  requestedSpendMicros: number;
  policyVersion: string;
  evidenceHash: string;
};

export async function reserveFactoryProviderCostPlan(db: FactoryRuntimeDB, input: FactoryProviderCostReservationInput) {
  for (const [label, value] of [["WORK_REQUEST_ID", input.workRequestId], ["ROUTE_DECISION_ID", input.routeDecisionId], ["COST_ENVELOPE_ID", input.costEnvelopeId], ["BINDING_ID", input.bindingId], ["QUALIFICATION_ID", input.qualificationId], ["POLICY_VERSION", input.policyVersion]] as const) assertIdentity(label, value);
  assertKey("IDEMPOTENCY_KEY", input.idempotencyKey);
  assertHash("EVIDENCE_HASH", input.evidenceHash);
  if (!Number.isSafeInteger(input.requestedProviderRequests) || input.requestedProviderRequests < 1 || !Number.isSafeInteger(input.requestedSpendMicros) || input.requestedSpendMicros < 1) {
    throw new FactoryRuntimeError("PROVIDER_COST_RESERVATION_INVALID", 400, "Provider request and spend reservations must be positive bounded integers");
  }
  const reservationIntentHash = await canonicalHash({ version: FACTORY_PROVIDER_CONTROL_VERSION, input });
  const existing = await first(db, "SELECT * FROM factory_provider_cost_reservations WHERE idempotency_key=?", input.idempotencyKey);
  if (existing) {
    if (clean(existing.reservation_intent_hash) !== reservationIntentHash) throw new FactoryRuntimeError("PROVIDER_COST_IDEMPOTENCY_CONFLICT", 409, "The provider cost idempotency key is bound to another reservation intent");
    return { outcome: "IDEMPOTENT_REPLAY" as const, reservationId: clean(existing.id), reservationIntentHash, dispatchAuthority: false, providerRequests: 0, spendMicros: 0 };
  }
  const row = await first(db, `SELECT
      w.video_id,w.dispatch_mode,w.max_provider_requests work_request_max_requests,w.max_spend_micros work_request_max_spend,
      d.work_request_id decision_work_request_id,d.binding_id decision_binding_id,d.qualification_id decision_qualification_id,d.decision,
      e.scope_type,e.scope_id,e.max_provider_requests envelope_max_requests,e.max_spend_micros envelope_max_spend,e.policy_version,e.lifecycle_state envelope_state,
      b.lifecycle_state binding_state,q.lifecycle_state qualification_state,
      (SELECT drift_state FROM factory_provider_drift_receipts x WHERE x.binding_id=b.id ORDER BY x.observed_at DESC,x.created_at DESC,x.id DESC LIMIT 1) latest_drift_state
    FROM factory_provider_work_requests w
    JOIN factory_provider_route_decisions d ON d.id=?
    JOIN factory_cost_envelopes e ON e.id=?
    JOIN factory_provider_bindings b ON b.id=?
    JOIN factory_capability_qualifications q ON q.id=?
    WHERE w.id=?`, input.routeDecisionId, input.costEnvelopeId, input.bindingId, input.qualificationId, input.workRequestId);
  const reasons: string[] = [];
  if (!row) reasons.push("PROVIDER_CONTROL_INPUT_NOT_FOUND");
  if (row) {
    if (clean(row.dispatch_mode) !== "PLAN_ONLY") reasons.push("WORK_REQUEST_NOT_PLAN_ONLY");
    if (clean(row.decision) !== "PLANNED_ZERO_DISPATCH") reasons.push("ROUTE_NOT_ZERO_DISPATCH_PLANNED");
    if (clean(row.decision_work_request_id) !== input.workRequestId) reasons.push("ROUTE_WORK_REQUEST_MISMATCH");
    if (clean(row.decision_binding_id) !== input.bindingId) reasons.push("ROUTE_BINDING_MISMATCH");
    if (clean(row.decision_qualification_id) !== input.qualificationId) reasons.push("ROUTE_QUALIFICATION_MISMATCH");
    if (clean(row.binding_state) !== "ACTIVE") reasons.push("BINDING_NOT_ACTIVE");
    if (clean(row.qualification_state) !== "QUALIFIED") reasons.push("QUALIFICATION_NOT_ACTIVE");
    if (clean(row.latest_drift_state) === "STALE") reasons.push("PROVIDER_BINDING_DRIFT_STALE");
    if (clean(row.envelope_state) !== "ACTIVE" || clean(row.policy_version) !== input.policyVersion) reasons.push("COST_ENVELOPE_NOT_ACTIVE");
    const scopeMatches = (clean(row.scope_type) === "VIDEO" && clean(row.scope_id) === clean(row.video_id)) || (clean(row.scope_type) === "REQUEST" && clean(row.scope_id) === input.workRequestId);
    if (!scopeMatches) reasons.push("COST_ENVELOPE_SCOPE_MISMATCH");
    if (input.requestedProviderRequests > numeric(row.work_request_max_requests) || input.requestedSpendMicros > numeric(row.work_request_max_spend)) reasons.push("WORK_REQUEST_COST_LIMIT_EXCEEDED");
    if (input.requestedProviderRequests > numeric(row.envelope_max_requests) || input.requestedSpendMicros > numeric(row.envelope_max_spend)) reasons.push("COST_ENVELOPE_LIMIT_EXCEEDED");
  }
  if (reasons.length) throw new FactoryRuntimeError("PROVIDER_COST_RESERVATION_BLOCKED", 409, "The provider cost reservation is blocked", [...new Set(reasons)].sort());
  const reservationId = deterministicId("factory-provider-reservation", reservationIntentHash);
  try {
    await db.prepare(`INSERT INTO factory_provider_cost_reservations
      (id,work_request_id,route_decision_id,cost_envelope_id,binding_id,qualification_id,idempotency_key,reservation_intent_hash,reserved_provider_requests,reserved_spend_micros,reservation_state,dispatch_authority,r22_authority,master_authority,release_authority,publication_authority,evidence_hash)
      VALUES (?,?,?,?,?,?,?,?,?,?,'RESERVED',0,0,0,0,0,?)`).bind(
        reservationId, input.workRequestId, input.routeDecisionId, input.costEnvelopeId, input.bindingId, input.qualificationId, input.idempotencyKey,
        reservationIntentHash, input.requestedProviderRequests, input.requestedSpendMicros, input.evidenceHash).run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("FACTORY_PROVIDER_COST_ENVELOPE_EXCEEDED")) throw new FactoryRuntimeError("PROVIDER_COST_ENVELOPE_EXCEEDED", 409, "The atomic provider cost envelope has insufficient remaining capacity");
    throw error;
  }
  return { outcome: "RESERVED_PLAN_ONLY" as const, reservationId, reservationIntentHash, reservedProviderRequests: input.requestedProviderRequests, reservedSpendMicros: input.requestedSpendMicros, dispatchAuthority: false, r22Authority: false, providerRequests: 0, spendMicros: 0 };
}

export type FactoryProviderReconciliationInput = {
  reservationId: string;
  reconciliationKey: string;
  requestFingerprint: string;
  requestState: "NOT_DISPATCHED" | "UNKNOWN" | "SUCCEEDED" | "FAILED";
  nativeRequestId?: string | null;
  providerResponseId?: string | null;
  rawResponseHash?: string | null;
  usage: Record<string, unknown>;
  actualProviderRequests: number;
  actualSpendMicros: number;
  observedAt: string;
  evidenceHash: string;
};

export async function reconcileFactoryProviderRequest(db: FactoryRuntimeDB, input: FactoryProviderReconciliationInput) {
  assertIdentity("RESERVATION_ID", input.reservationId);
  assertKey("RECONCILIATION_KEY", input.reconciliationKey);
  assertHash("REQUEST_FINGERPRINT", input.requestFingerprint);
  assertHash("EVIDENCE_HASH", input.evidenceHash);
  if (input.rawResponseHash) assertHash("RAW_RESPONSE_HASH", input.rawResponseHash);
  if (!Number.isSafeInteger(input.actualProviderRequests) || input.actualProviderRequests < 0 || !Number.isSafeInteger(input.actualSpendMicros) || input.actualSpendMicros < 0 || !Number.isFinite(Date.parse(input.observedAt))) {
    throw new FactoryRuntimeError("PROVIDER_RECONCILIATION_INVALID", 400, "The provider reconciliation amounts or observation time are invalid");
  }
  if (input.requestState === "NOT_DISPATCHED" && (input.nativeRequestId || input.providerResponseId || input.rawResponseHash || input.actualProviderRequests !== 0 || input.actualSpendMicros !== 0)) {
    throw new FactoryRuntimeError("PROVIDER_RECONCILIATION_INVALID", 400, "A not-dispatched request cannot claim a native request, response, usage spend or provider call");
  }
  if (input.requestState !== "NOT_DISPATCHED" && !identityPattern.test(clean(input.nativeRequestId))) throw new FactoryRuntimeError("PROVIDER_NATIVE_REQUEST_ID_REQUIRED", 400, "A dispatched or unknown request requires the provider-native request ID");
  if (input.requestState === "SUCCEEDED" && (!identityPattern.test(clean(input.providerResponseId)) || !input.rawResponseHash)) throw new FactoryRuntimeError("PROVIDER_RESPONSE_EVIDENCE_REQUIRED", 400, "A successful request requires provider response ID and exact raw response hash");
  const reconciliationHash = await canonicalHash({ version: FACTORY_PROVIDER_CONTROL_VERSION, input });
  const existing = await first(db, "SELECT * FROM factory_provider_reconciliation_receipts WHERE reconciliation_key=?", input.reconciliationKey);
  if (existing) {
    if (clean(existing.reconciliation_hash) !== reconciliationHash) throw new FactoryRuntimeError("PROVIDER_RECONCILIATION_IDEMPOTENCY_CONFLICT", 409, "The reconciliation key is bound to different provider evidence");
    return { outcome: "IDEMPOTENT_REPLAY" as const, reconciliationId: clean(existing.id), reconciliationHash, retryAuthority: false, dispatchAuthority: false };
  }
  const reservation = await first(db, `SELECT r.*,b.provider_id FROM factory_provider_cost_reservations r JOIN factory_provider_bindings b ON b.id=r.binding_id WHERE r.id=?`, input.reservationId);
  if (!reservation) throw new FactoryRuntimeError("PROVIDER_COST_RESERVATION_NOT_FOUND", 404, "The provider cost reservation does not exist");
  const sequenceRow = await first(db, "SELECT COALESCE(MAX(reconciliation_sequence),0)+1 next_sequence FROM factory_provider_reconciliation_receipts WHERE reservation_id=?", input.reservationId);
  const sequence = numeric(sequenceRow?.next_sequence);
  const exceeds = input.actualProviderRequests > numeric(reservation.reserved_provider_requests) || input.actualSpendMicros > numeric(reservation.reserved_spend_micros);
  const outcome = input.requestState === "NOT_DISPATCHED" ? "RELEASED_BEFORE_DISPATCH" : input.requestState === "UNKNOWN" ? "UNKNOWN_SPEND_RESERVED" : exceeds ? "ACTUAL_EXCEEDS_RESERVATION" : "SETTLED";
  const remaining = input.requestState === "UNKNOWN" ? numeric(reservation.reserved_spend_micros) : Math.max(0, numeric(reservation.reserved_spend_micros) - input.actualSpendMicros);
  const nativeReceiptId = deterministicId("factory-provider-native", await canonicalHash({ reservationId: input.reservationId, requestFingerprint: input.requestFingerprint, sequence }));
  const reconciliationId = deterministicId("factory-provider-reconciliation", reconciliationHash);
  await db.batch([
    db.prepare(`INSERT INTO factory_provider_native_request_receipts
      (id,reservation_id,binding_id,provider_id,native_request_id,provider_response_id,request_fingerprint,request_state,raw_response_hash,usage_json,actual_provider_requests,actual_spend_micros,retry_authority,evidence_hash,observed_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)`).bind(
        nativeReceiptId, input.reservationId, reservation.binding_id, reservation.provider_id, input.nativeRequestId ?? null, input.providerResponseId ?? null,
        input.requestFingerprint, input.requestState, input.rawResponseHash ?? null, json(input.usage), input.actualProviderRequests, input.actualSpendMicros, input.evidenceHash, input.observedAt),
    db.prepare(`INSERT INTO factory_provider_reconciliation_receipts
      (id,reservation_id,native_request_receipt_id,reconciliation_key,reconciliation_sequence,outcome,reserved_provider_requests,reserved_spend_micros,actual_provider_requests,actual_spend_micros,remaining_reserved_spend_micros,retry_authority,dispatch_authority,reconciliation_hash,evidence_hash)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,0,0,?,?)`).bind(
        reconciliationId, input.reservationId, nativeReceiptId, input.reconciliationKey, sequence, outcome, reservation.reserved_provider_requests,
        reservation.reserved_spend_micros, input.actualProviderRequests, input.actualSpendMicros, remaining, reconciliationHash, input.evidenceHash),
  ]);
  return { outcome, reconciliationId, nativeReceiptId, reconciliationHash, retryAuthority: false, dispatchAuthority: false, actualProviderRequests: input.actualProviderRequests, actualSpendMicros: input.actualSpendMicros, remainingReservedSpendMicros: remaining };
}

export type FactoryProviderDriftObservationInput = {
  bindingId: string;
  qualificationId: string;
  observationKey: string;
  observed: { modelVersion: string; outputSchemaHash: string; settingsHash: string; rateCardVersion: string; rightsPolicyVersion: string; retentionPolicyVersion: string };
  observedAt: string;
  evidenceHash: string;
};

export async function recordFactoryProviderDriftObservation(db: FactoryRuntimeDB, input: FactoryProviderDriftObservationInput) {
  assertIdentity("BINDING_ID", input.bindingId); assertIdentity("QUALIFICATION_ID", input.qualificationId); assertKey("OBSERVATION_KEY", input.observationKey); assertHash("EVIDENCE_HASH", input.evidenceHash);
  assertHash("OBSERVED_OUTPUT_SCHEMA_HASH", input.observed.outputSchemaHash); assertHash("OBSERVED_SETTINGS_HASH", input.observed.settingsHash);
  if (!Number.isFinite(Date.parse(input.observedAt))) throw new FactoryRuntimeError("PROVIDER_DRIFT_OBSERVATION_INVALID", 400, "Provider drift observation time is invalid");
  for (const [label, value] of [["MODEL_VERSION", input.observed.modelVersion], ["RATE_CARD_VERSION", input.observed.rateCardVersion], ["RIGHTS_POLICY_VERSION", input.observed.rightsPolicyVersion], ["RETENTION_POLICY_VERSION", input.observed.retentionPolicyVersion]] as const) assertIdentity(label, value);
  const row = await first(db, `SELECT b.model_version,b.output_schema_hash,b.settings_hash,b.rate_card_version,b.rights_policy_version,b.retention_policy_version,b.lifecycle_state binding_state,q.lifecycle_state qualification_state
    FROM factory_provider_bindings b JOIN factory_capability_qualifications q ON q.id=? AND q.binding_id=b.id WHERE b.id=?`, input.qualificationId, input.bindingId);
  if (!row) throw new FactoryRuntimeError("PROVIDER_DRIFT_BINDING_NOT_FOUND", 404, "The exact binding and qualification were not found");
  const baseline = { modelVersion: clean(row.model_version), outputSchemaHash: clean(row.output_schema_hash), settingsHash: clean(row.settings_hash), rateCardVersion: clean(row.rate_card_version), rightsPolicyVersion: clean(row.rights_policy_version), retentionPolicyVersion: clean(row.retention_policy_version) };
  const dimensions = (Object.keys(baseline) as Array<keyof typeof baseline>).filter((key) => baseline[key] !== input.observed[key]);
  if (clean(row.binding_state) !== "ACTIVE") dimensions.push("bindingState" as keyof typeof baseline);
  if (clean(row.qualification_state) !== "QUALIFIED") dimensions.push("qualificationState" as keyof typeof baseline);
  const driftDimensions = [...new Set(dimensions)].sort();
  const driftState = driftDimensions.length ? "STALE" as const : "CURRENT" as const;
  const observationHash = await canonicalHash({ version: FACTORY_PROVIDER_CONTROL_VERSION, input, baseline, driftDimensions, driftState });
  const existing = await first(db, "SELECT * FROM factory_provider_drift_receipts WHERE observation_key=?", input.observationKey);
  if (existing) {
    if (clean(existing.observation_hash) !== observationHash) throw new FactoryRuntimeError("PROVIDER_DRIFT_IDEMPOTENCY_CONFLICT", 409, "The drift observation key is bound to different evidence");
    return { outcome: "IDEMPOTENT_REPLAY" as const, driftReceiptId: clean(existing.id), driftState: clean(existing.drift_state), observationHash, dispatchAuthority: false };
  }
  const driftReceiptId = deterministicId("factory-provider-drift", observationHash);
  await db.prepare(`INSERT INTO factory_provider_drift_receipts
    (id,binding_id,qualification_id,observation_key,baseline_json,observed_json,drift_dimensions_json,drift_state,invalidates_qualification,dispatch_authority,observation_hash,evidence_hash,observed_at)
    VALUES (?,?,?,?,?,?,?,?,?,0,?,?,?)`).bind(
      driftReceiptId, input.bindingId, input.qualificationId, input.observationKey, json(baseline), json(input.observed), json(driftDimensions), driftState,
      driftState === "STALE" ? 1 : 0, observationHash, input.evidenceHash, input.observedAt).run();
  return { outcome: "RECORDED" as const, driftReceiptId, driftState, driftDimensions, invalidatesQualification: driftState === "STALE", observationHash, dispatchAuthority: false };
}

export type FactoryProviderFallbackAuthorizationInput = {
  primaryBindingId: string;
  fallbackBindingId: string;
  fallbackQualificationId: string;
  authorizationKey: string;
  reason: string;
  authorizedBy: string;
  maxProviderRequests: number;
  maxSpendMicros: number;
  expiresAt: string;
  evaluatedAt: string;
  evidenceHash: string;
};

export async function authorizeFactoryProviderFallbackPlan(db: FactoryRuntimeDB, input: FactoryProviderFallbackAuthorizationInput) {
  for (const [label, value] of [["PRIMARY_BINDING_ID", input.primaryBindingId], ["FALLBACK_BINDING_ID", input.fallbackBindingId], ["FALLBACK_QUALIFICATION_ID", input.fallbackQualificationId], ["AUTHORIZED_BY", input.authorizedBy]] as const) assertIdentity(label, value);
  assertKey("AUTHORIZATION_KEY", input.authorizationKey); assertHash("EVIDENCE_HASH", input.evidenceHash);
  if (!clean(input.reason) || clean(input.reason).length > 500 || !Number.isSafeInteger(input.maxProviderRequests) || input.maxProviderRequests < 1 || !Number.isSafeInteger(input.maxSpendMicros) || input.maxSpendMicros < 1 || !Number.isFinite(Date.parse(input.expiresAt)) || !Number.isFinite(Date.parse(input.evaluatedAt)) || input.expiresAt <= input.evaluatedAt) {
    throw new FactoryRuntimeError("PROVIDER_FALLBACK_AUTHORIZATION_INVALID", 400, "The explicit fallback authorization is invalid");
  }
  const authorizationHash = await canonicalHash({ version: FACTORY_PROVIDER_CONTROL_VERSION, input });
  const existing = await first(db, "SELECT * FROM factory_provider_fallback_authorizations WHERE authorization_key=?", input.authorizationKey);
  if (existing) {
    if (clean(existing.authorization_hash) !== authorizationHash) throw new FactoryRuntimeError("PROVIDER_FALLBACK_IDEMPOTENCY_CONFLICT", 409, "The fallback authorization key is bound to another plan");
    return { outcome: "IDEMPOTENT_REPLAY" as const, authorizationId: clean(existing.id), authorizationHash, dispatchAuthority: false, fallbackUsed: false };
  }
  const row = await first(db, `SELECT p.fallback_binding_id,p.capability_id primary_capability_id,p.lifecycle_state primary_state,
      f.capability_id fallback_capability_id,f.lifecycle_state fallback_state,q.lifecycle_state qualification_state,
      (SELECT drift_state FROM factory_provider_drift_receipts x WHERE x.binding_id=f.id ORDER BY x.observed_at DESC,x.created_at DESC,x.id DESC LIMIT 1) fallback_drift_state
    FROM factory_provider_bindings p JOIN factory_provider_bindings f ON f.id=?
    JOIN factory_capability_qualifications q ON q.id=? AND q.binding_id=f.id WHERE p.id=?`, input.fallbackBindingId, input.fallbackQualificationId, input.primaryBindingId);
  const reasons: string[] = [];
  if (!row) reasons.push("FALLBACK_BINDING_OR_QUALIFICATION_NOT_FOUND");
  if (row) {
    if (clean(row.fallback_binding_id) !== input.fallbackBindingId) reasons.push("FALLBACK_NOT_DECLARED_BY_PRIMARY_BINDING");
    if (clean(row.primary_capability_id) !== clean(row.fallback_capability_id)) reasons.push("FALLBACK_CAPABILITY_MISMATCH");
    if (clean(row.primary_state) !== "ACTIVE" || clean(row.fallback_state) !== "ACTIVE") reasons.push("FALLBACK_BINDING_NOT_ACTIVE");
    if (clean(row.qualification_state) !== "QUALIFIED") reasons.push("FALLBACK_QUALIFICATION_NOT_ACTIVE");
    if (clean(row.fallback_drift_state) === "STALE") reasons.push("FALLBACK_BINDING_DRIFT_STALE");
  }
  if (reasons.length) throw new FactoryRuntimeError("PROVIDER_FALLBACK_AUTHORIZATION_BLOCKED", 409, "The explicit fallback plan is blocked", reasons);
  const authorizationId = deterministicId("factory-provider-fallback", authorizationHash);
  await db.prepare(`INSERT INTO factory_provider_fallback_authorizations
    (id,primary_binding_id,fallback_binding_id,fallback_qualification_id,authorization_key,reason,authorized_by,authorization_state,max_provider_requests,max_spend_micros,one_time_plan,dispatch_authority,r22_authority,expires_at,authorization_hash,evidence_hash)
    VALUES (?,?,?,?,?,?,?,'APPROVED_PLAN_ONLY',?,?,1,0,0,?,?,?)`).bind(
      authorizationId, input.primaryBindingId, input.fallbackBindingId, input.fallbackQualificationId, input.authorizationKey, clean(input.reason), input.authorizedBy,
      input.maxProviderRequests, input.maxSpendMicros, input.expiresAt, authorizationHash, input.evidenceHash).run();
  return { outcome: "APPROVED_PLAN_ONLY" as const, authorizationId, authorizationHash, dispatchAuthority: false, r22Authority: false, fallbackUsed: false, providerRequests: 0, spendMicros: 0 };
}
