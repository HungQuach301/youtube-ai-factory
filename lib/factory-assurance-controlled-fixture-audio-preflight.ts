import { canonicalHash, canonicalStringify } from "@/lib/canonical-json";
import { CLEAN_AUDIO_CONTROL_NARRATION } from "@/lib/controlled-fixture-materialization";
import { FactoryRuntimeError, type FactoryRuntimeDB } from "@/lib/factory-runtime-writer";

export const FACTORY_ASSURANCE_CONTROLLED_FIXTURE_AUDIO_PREFLIGHT_VERSION = "FACTORY_ASSURANCE_CONTROLLED_FIXTURE_AUDIO_PREFLIGHT_V1" as const;
export const CONTROLLED_FIXTURE_AUDIO_CAPABILITY_KEY = "CONTROLLED_FIXTURE_CLEAN_AUDIO_SYNTHESIS" as const;
export const CONTROLLED_FIXTURE_AUDIO_CAPABILITY_VERSION = "V1" as const;
export const CONTROLLED_FIXTURE_AUDIO_QUALITY_STANDARD_VERSION = "FACTORY_CONTROLLED_FIXTURE_AUDIO_QUALITY_STANDARD_V1" as const;
export const CONTROLLED_FIXTURE_AUDIO_RIGHTS_POLICY_VERSION = "FACTORY_CONTROLLED_FIXTURE_AUDIO_COMMERCIAL_RIGHTS_V1" as const;
export const CONTROLLED_FIXTURE_AUDIO_RETENTION_POLICY_VERSION = "FACTORY_CONTROLLED_FIXTURE_AUDIO_RETENTION_V1" as const;
export const CONTROLLED_FIXTURE_AUDIO_COST_POLICY_VERSION = "FACTORY_CONTROLLED_FIXTURE_AUDIO_COST_POLICY_V1" as const;
export const CONTROLLED_FIXTURE_AUDIO_MAX_PROVIDER_REQUESTS = 2 as const;
export const CONTROLLED_FIXTURE_AUDIO_MAX_SPEND_MICROS = 80_000 as const;

type Row = Record<string, unknown>;
const clean = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);
const idempotencyPattern = /^[A-Za-z0-9._:-]{16,200}$/;
const exactHashPattern = /^[a-f0-9]{64}$/;
const deterministicId = (prefix: string, hash: string) => `${prefix}-${hash.slice(0, 24)}`;
const first = (db: FactoryRuntimeDB, query: string, ...values: unknown[]) => db.prepare(query).bind(...values).first<Row>();

async function observeExactAudioControls(
  db: FactoryRuntimeDB,
  evaluatedAt: string,
  contract: { inputSchemaHash: string; outputSchemaHash: string; settingsHash: string },
) {
  const bindingScope = `FROM factory_provider_bindings b
    JOIN factory_providers p ON p.id=b.provider_id
    JOIN factory_capabilities c ON c.id=b.capability_id
    WHERE c.capability_key=? AND c.capability_version=? AND c.input_schema_hash=? AND c.output_schema_hash=?
      AND c.lifecycle_state='ACTIVE' AND b.lifecycle_state='ACTIVE' AND p.lifecycle_state='ACTIVE' AND p.health_state='HEALTHY'
      AND b.input_schema_hash=? AND b.output_schema_hash=? AND b.settings_hash=?
      AND b.rights_policy_version=? AND b.retention_policy_version=?`;
  const parameters = [
    CONTROLLED_FIXTURE_AUDIO_CAPABILITY_KEY,
    CONTROLLED_FIXTURE_AUDIO_CAPABILITY_VERSION,
    contract.inputSchemaHash,
    contract.outputSchemaHash,
    contract.inputSchemaHash,
    contract.outputSchemaHash,
    contract.settingsHash,
    CONTROLLED_FIXTURE_AUDIO_RIGHTS_POLICY_VERSION,
    CONTROLLED_FIXTURE_AUDIO_RETENTION_POLICY_VERSION,
  ];
  const [bindings, qualifications, rights, drift, routeReady] = await Promise.all([
    first(db, `SELECT COUNT(*) count ${bindingScope}`, ...parameters),
    first(db, `SELECT COUNT(DISTINCT b.id) count ${bindingScope}
      AND EXISTS (SELECT 1 FROM factory_capability_qualifications q WHERE q.binding_id=b.id
        AND q.lifecycle_state='QUALIFIED' AND q.standard_version=? AND q.settings_hash=b.settings_hash
        AND q.qualified_at IS NOT NULL AND q.qualified_at<=? AND (q.expires_at IS NULL OR q.expires_at>?))`,
      ...parameters, CONTROLLED_FIXTURE_AUDIO_QUALITY_STANDARD_VERSION, evaluatedAt, evaluatedAt),
    first(db, `SELECT COUNT(DISTINCT b.id) count ${bindingScope}
      AND EXISTS (SELECT 1 FROM factory_rights_eligibility_receipts r WHERE r.binding_id=b.id
        AND r.rights_policy_version=b.rights_policy_version AND r.retention_policy_version=b.retention_policy_version
        AND r.commercial_use_state='ELIGIBLE' AND r.valid_from<=? AND (r.expires_at IS NULL OR r.expires_at>?))`,
      ...parameters, evaluatedAt, evaluatedAt),
    first(db, `SELECT COUNT(DISTINCT b.id) count ${bindingScope}
      AND (SELECT d.drift_state FROM factory_provider_drift_receipts d WHERE d.binding_id=b.id
        ORDER BY d.observed_at DESC,d.created_at DESC,d.id DESC LIMIT 1)='CURRENT'`, ...parameters),
    first(db, `SELECT COUNT(DISTINCT b.id) count ${bindingScope}
      AND EXISTS (SELECT 1 FROM factory_capability_qualifications q WHERE q.binding_id=b.id
        AND q.lifecycle_state='QUALIFIED' AND q.standard_version=? AND q.settings_hash=b.settings_hash
        AND q.qualified_at IS NOT NULL AND q.qualified_at<=? AND (q.expires_at IS NULL OR q.expires_at>?))
      AND EXISTS (SELECT 1 FROM factory_rights_eligibility_receipts r WHERE r.binding_id=b.id
        AND r.rights_policy_version=b.rights_policy_version AND r.retention_policy_version=b.retention_policy_version
        AND r.commercial_use_state='ELIGIBLE' AND r.valid_from<=? AND (r.expires_at IS NULL OR r.expires_at>?))
      AND (SELECT d.drift_state FROM factory_provider_drift_receipts d WHERE d.binding_id=b.id
        ORDER BY d.observed_at DESC,d.created_at DESC,d.id DESC LIMIT 1)='CURRENT'`,
      ...parameters, CONTROLLED_FIXTURE_AUDIO_QUALITY_STANDARD_VERSION, evaluatedAt, evaluatedAt, evaluatedAt, evaluatedAt),
  ]);
  return {
    exactAudioBindings: number(bindings?.count),
    exactAudioQualifications: number(qualifications?.count),
    exactAudioRightsReceipts: number(rights?.count),
    exactAudioCurrentDriftReceipts: number(drift?.count),
    exactAudioRouteReadyBindings: number(routeReady?.count),
  };
}

function resultFrom(row: Row, outcome: "RECORDED" | "IDEMPOTENT_REPLAY", blockers: string[]) {
  return {
    outcome,
    runId: clean(row.id),
    admissionRunId: clean(row.admission_run_id),
    admissionItemId: clean(row.admission_item_id),
    workOrderId: clean(row.work_order_id),
    futureWorkRequestId: clean(row.future_work_request_id),
    costEnvelopeId: clean(row.cost_envelope_id),
    typedRequestContracts: 1,
    exactAudioBindings: number(row.exact_audio_bindings),
    exactAudioQualifications: number(row.exact_audio_qualifications),
    exactAudioRightsReceipts: number(row.exact_audio_rights_receipts),
    exactAudioCurrentDriftReceipts: number(row.exact_audio_current_drift_receipts),
    exactAudioRouteReadyBindings: number(row.exact_audio_route_ready_bindings),
    activeCostEnvelopes: 1,
    canonicalWorkRequests: 0,
    canonicalRouteDecisions: 0,
    canonicalCostReservations: 0,
    dispatchReadyItems: 0,
    blockedItems: 1,
    plannedMaxProviderRequests: CONTROLLED_FIXTURE_AUDIO_MAX_PROVIDER_REQUESTS,
    plannedMaxSpendMicros: CONTROLLED_FIXTURE_AUDIO_MAX_SPEND_MICROS,
    preflightState: "BLOCKED" as const,
    blockers,
    providerDispatchAuthority: false,
    costReservationAuthority: false,
    providerRequests: 0,
    spendMicros: 0,
  };
}

export async function preflightFactoryAssuranceControlledFixtureAudioBatch(
  db: FactoryRuntimeDB,
  input: { actor: string; idempotencyKey: string; evaluatedAt?: string },
) {
  const actor = clean(input.actor), idempotencyKey = clean(input.idempotencyKey), evaluatedAt = clean(input.evaluatedAt) || new Date().toISOString();
  if (!actor) throw new FactoryRuntimeError("ASSURANCE_CONTROLLED_FIXTURE_AUDIO_PREFLIGHT_ACTOR_REQUIRED", 400, "An authenticated owner actor is required");
  if (!idempotencyPattern.test(idempotencyKey)) throw new FactoryRuntimeError("ASSURANCE_CONTROLLED_FIXTURE_AUDIO_PREFLIGHT_IDEMPOTENCY_KEY_INVALID", 400, "A stable 16–200 character idempotency key is required");
  if (!Number.isFinite(Date.parse(evaluatedAt))) throw new FactoryRuntimeError("ASSURANCE_CONTROLLED_FIXTURE_AUDIO_PREFLIGHT_EVALUATED_AT_INVALID", 400, "The audio preflight evaluation time must be an ISO timestamp");

  const admission = await first(db, `SELECT * FROM factory_assurance_controlled_fixture_materialization_admission_runs ORDER BY created_at DESC,id DESC LIMIT 1`);
  if (!admission || clean(admission.lifecycle_state) !== "COMPLETE" || clean(admission.admission_state) !== "BLOCKED" || number(admission.selected_batch_items) !== 1) {
    throw new FactoryRuntimeError("ASSURANCE_CONTROLLED_FIXTURE_AUDIO_ADMISSION_REQUIRED", 409, "A complete blocked admission with exactly one selected provider-audio item is required before audio preflight");
  }
  const admissionRunId = clean(admission.id);
  const selected = await first(db, `SELECT i.*,w.generation_contract_json,w.independence_contract_json
    FROM factory_assurance_controlled_fixture_materialization_admission_items i
    JOIN factory_assurance_controlled_fixture_replacement_work_orders w ON w.id=i.work_order_id
    WHERE i.run_id=? AND i.admission_lane='SELECTED_PROVIDER_AUDIO_BATCH' LIMIT 1`, admissionRunId);
  if (!selected || clean(selected.replacement_route) !== "NEW_PROVIDER_AUDIO_WITH_NATIVE_BINDING" || clean(selected.admission_state) !== "BLOCKED"
    || clean(selected.materialization_state) !== "NOT_MATERIALIZED" || number(selected.planned_max_provider_requests) !== CONTROLLED_FIXTURE_AUDIO_MAX_PROVIDER_REQUESTS
    || number(selected.planned_max_spend_micros) !== CONTROLLED_FIXTURE_AUDIO_MAX_SPEND_MICROS || !exactHashPattern.test(clean(selected.historical_exact_artifact_hash))) {
    throw new FactoryRuntimeError("ASSURANCE_CONTROLLED_FIXTURE_AUDIO_ADMISSION_ITEM_INVALID", 409, "The selected audio admission item must remain exact-hash bound, blocked and not materialized");
  }
  const admissionItemId = clean(selected.id), workOrderId = clean(selected.work_order_id);
  const replacementPlanRunId = clean(selected.replacement_plan_run_id), snapshotId = clean(selected.remediation_snapshot_id);
  const requestHash = await canonicalHash({
    version: FACTORY_ASSURANCE_CONTROLLED_FIXTURE_AUDIO_PREFLIGHT_VERSION,
    admissionRunId, admissionItemId, workOrderId, replacementPlanRunId, snapshotId, idempotencyKey, evaluatedAt, actor,
  });
  const prior = await first(db, `SELECT * FROM factory_assurance_controlled_fixture_audio_preflight_runs WHERE admission_run_id=? LIMIT 1`, admissionRunId);
  if (prior) {
    if (clean(prior.request_hash) !== requestHash || clean(prior.idempotency_key) !== idempotencyKey) {
      throw new FactoryRuntimeError("ASSURANCE_CONTROLLED_FIXTURE_AUDIO_PREFLIGHT_ALREADY_RECORDED", 409, "This immutable admission already has a different audio-preflight intent");
    }
    return resultFrom(prior, "IDEMPOTENT_REPLAY", JSON.parse(clean(prior.blockers_json)) as string[]);
  }

  const inputSchema = {
    type: "object", additionalProperties: false, required: ["text", "language", "purpose", "freshGenerationRequired"],
    properties: {
      text: { type: "string", minLength: 1, maxLength: 700 }, language: { const: "en-US" },
      purpose: { const: "CONTROLLED_FIXTURE_CLEAN_AUDIO" }, freshGenerationRequired: { const: true },
    },
  };
  const inputContract = {
    text: CLEAN_AUDIO_CONTROL_NARRATION,
    language: "en-US",
    purpose: "CONTROLLED_FIXTURE_CLEAN_AUDIO",
    freshGenerationRequired: true,
    narrationSource: "SEALED_CLEAN_AUDIO_CONTROL_NARRATION_V1",
    historicalAudioBytesUse: "FORBIDDEN",
    replacementIdentity: clean(selected.replacement_identity),
  };
  const outputSchema = {
    type: "object", additionalProperties: false,
    required: ["audioBytes", "mimeType", "providerNativeRequestId", "rawResponseHash", "exactOutputSha256"],
    properties: {
      audioBytes: { type: "string", contentEncoding: "base64" }, mimeType: { const: "audio/mpeg" },
      providerNativeRequestId: { type: "string", minLength: 1 }, rawResponseHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
      exactOutputSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
    },
  };
  const settingsContract = {
    language: "en-US", outputMimeType: "audio/mpeg", voiceIdentity: "PINNED_EXACTLY_AT_BINDING",
    modelIdentity: "PINNED_EXACTLY_AT_BINDING", commercialUseRequired: true, nativeRequestIdRequired: true,
    exactResponseHashRequired: true, exactOutputReadbackRequired: true, retryCeiling: 0,
  };
  const inputContractJson = canonicalStringify(inputContract), outputSchemaJson = canonicalStringify(outputSchema), settingsContractJson = canonicalStringify(settingsContract);
  const inputSchemaHash = await canonicalHash(inputSchema), inputHash = await canonicalHash(inputContract);
  const outputSchemaHash = await canonicalHash(outputSchema), settingsHash = await canonicalHash(settingsContract);
  const payloadBytes = new TextEncoder().encode(inputContractJson).byteLength;
  const futureWorkRequestId = deterministicId("factory-provider-work-request", await canonicalHash({
    version: FACTORY_ASSURANCE_CONTROLLED_FIXTURE_AUDIO_PREFLIGHT_VERSION, workOrderId, inputHash, outputSchemaHash, settingsHash,
  }));
  const controls = await observeExactAudioControls(db, evaluatedAt, { inputSchemaHash, outputSchemaHash, settingsHash });
  const blockers = [
    ...(controls.exactAudioBindings === 0 ? ["EXACT_AUDIO_PROVIDER_BINDING_REQUIRED"] : []),
    ...(controls.exactAudioQualifications === 0 ? ["EXACT_AUDIO_CAPABILITY_QUALIFICATION_REQUIRED"] : []),
    ...(controls.exactAudioRightsReceipts === 0 ? ["EXACT_AUDIO_RIGHTS_ELIGIBILITY_REQUIRED"] : []),
    ...(controls.exactAudioCurrentDriftReceipts === 0 ? ["EXACT_AUDIO_PROVIDER_DRIFT_RECEIPT_REQUIRED"] : []),
    ...(controls.exactAudioRouteReadyBindings === 0 ? ["EXACT_AUDIO_ROUTE_NOT_READY"] : []),
    "CANONICAL_PROVIDER_WORK_REQUEST_REQUIRED",
    "CANONICAL_PROVIDER_ROUTE_DECISION_REQUIRED",
    "EXACT_COST_RESERVATION_BLOCKED_BY_AUDIO_ROUTE",
    "EXPLICIT_PAID_DISPATCH_APPROVAL_REQUIRED",
  ].sort();
  const costEnvelopeFacts = {
    scopeType: "REQUEST", scopeId: futureWorkRequestId, currency: "USD", maxSpendMicros: CONTROLLED_FIXTURE_AUDIO_MAX_SPEND_MICROS,
    maxProviderRequests: CONTROLLED_FIXTURE_AUDIO_MAX_PROVIDER_REQUESTS, policyVersion: CONTROLLED_FIXTURE_AUDIO_COST_POLICY_VERSION,
    lifecycleState: "ACTIVE",
  };
  const costEnvelopeEvidenceHash = await canonicalHash({ version: FACTORY_ASSURANCE_CONTROLLED_FIXTURE_AUDIO_PREFLIGHT_VERSION, costEnvelopeFacts });
  const expectedCostEnvelopeId = deterministicId("factory-cost-envelope", costEnvelopeEvidenceHash);
  const existingEnvelope = await first(db, `SELECT * FROM factory_cost_envelopes WHERE scope_type='REQUEST' AND scope_id=? AND policy_version=? LIMIT 1`, futureWorkRequestId, CONTROLLED_FIXTURE_AUDIO_COST_POLICY_VERSION);
  if (existingEnvelope && (clean(existingEnvelope.id) !== expectedCostEnvelopeId || number(existingEnvelope.max_spend_micros) !== CONTROLLED_FIXTURE_AUDIO_MAX_SPEND_MICROS
    || number(existingEnvelope.max_provider_requests) !== CONTROLLED_FIXTURE_AUDIO_MAX_PROVIDER_REQUESTS || clean(existingEnvelope.lifecycle_state) !== "ACTIVE"
    || clean(existingEnvelope.evidence_hash) !== costEnvelopeEvidenceHash)) {
    throw new FactoryRuntimeError("ASSURANCE_CONTROLLED_FIXTURE_AUDIO_COST_ENVELOPE_CONFLICT", 409, "The future audio work request is already bound to a different cost envelope");
  }
  const costEnvelopeId = clean(existingEnvelope?.id) || expectedCostEnvelopeId;
  const contractFacts = {
    admissionItemId, workOrderId, futureWorkRequestId,
    capabilityKey: CONTROLLED_FIXTURE_AUDIO_CAPABILITY_KEY, capabilityVersion: CONTROLLED_FIXTURE_AUDIO_CAPABILITY_VERSION,
    archetype: "CLEAN_AUDIO_CONTROL", inputHash, payloadBytes, outputSchemaHash, settingsHash,
    qualityStandardVersion: CONTROLLED_FIXTURE_AUDIO_QUALITY_STANDARD_VERSION,
    rightsPolicyVersion: CONTROLLED_FIXTURE_AUDIO_RIGHTS_POLICY_VERSION,
    retentionPolicyVersion: CONTROLLED_FIXTURE_AUDIO_RETENTION_POLICY_VERSION,
    dispatchMode: "PLAN_ONLY", maxProviderRequests: CONTROLLED_FIXTURE_AUDIO_MAX_PROVIDER_REQUESTS,
    maxSpendMicros: CONTROLLED_FIXTURE_AUDIO_MAX_SPEND_MICROS, fallbackAllowed: false, costEnvelopeId,
    routePreflightState: "BLOCKED", blockers, materializationState: "NOT_MATERIALIZED",
  };
  const contractEvidenceHash = await canonicalHash({ version: FACTORY_ASSURANCE_CONTROLLED_FIXTURE_AUDIO_PREFLIGHT_VERSION, contractFacts });
  const summary = { ...controls, typedRequestContracts: 1, activeCostEnvelopes: 1, canonicalWorkRequests: 0, canonicalRouteDecisions: 0, canonicalCostReservations: 0, dispatchReadyItems: 0, blockedItems: 1 };
  const manifestHash = await canonicalHash({ version: FACTORY_ASSURANCE_CONTROLLED_FIXTURE_AUDIO_PREFLIGHT_VERSION, contractEvidenceHash, costEnvelopeEvidenceHash });
  const evidenceHash = await canonicalHash({ version: FACTORY_ASSURANCE_CONTROLLED_FIXTURE_AUDIO_PREFLIGHT_VERSION, requestHash, summary, blockers, manifestHash });
  const runId = deterministicId("factory-assurance-audio-preflight-run", requestHash);
  const contractId = deterministicId("factory-assurance-audio-request-contract", contractEvidenceHash);
  const statements = [];
  if (!existingEnvelope) statements.push(db.prepare(`INSERT INTO factory_cost_envelopes
    (id,scope_type,scope_id,currency,max_spend_micros,max_provider_requests,policy_version,lifecycle_state,evidence_hash)
    VALUES (?,'REQUEST',?,'USD',?,?,?,'ACTIVE',?)`).bind(costEnvelopeId, futureWorkRequestId, CONTROLLED_FIXTURE_AUDIO_MAX_SPEND_MICROS, CONTROLLED_FIXTURE_AUDIO_MAX_PROVIDER_REQUESTS, CONTROLLED_FIXTURE_AUDIO_COST_POLICY_VERSION, costEnvelopeEvidenceHash));
  statements.push(db.prepare(`INSERT INTO factory_assurance_controlled_fixture_audio_preflight_runs
    (id,admission_run_id,admission_item_id,replacement_plan_run_id,work_order_id,remediation_snapshot_id,idempotency_key,request_hash,policy_version,future_work_request_id,cost_envelope_id,typed_request_contracts,exact_audio_bindings,exact_audio_qualifications,exact_audio_rights_receipts,exact_audio_current_drift_receipts,exact_audio_route_ready_bindings,active_cost_envelopes,canonical_work_requests,canonical_route_decisions,canonical_cost_reservations,dispatch_ready_items,blocked_items,planned_max_provider_requests,planned_max_spend_micros,preflight_state,blockers_json,lifecycle_state,evaluated_at,actor,count_eligible,qualification_authority,pass_authority,provider_dispatch_authority,cost_reservation_authority,r22_authority,master_authority,release_authority,publication_authority,provider_requests,spend_micros,manifest_hash,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,0,0,0,0,1,2,80000,'BLOCKED',?,'COMPLETE',?,?,0,0,0,0,0,0,0,0,0,0,0,?,?)`).bind(
      runId, admissionRunId, admissionItemId, replacementPlanRunId, workOrderId, snapshotId, idempotencyKey, requestHash,
      FACTORY_ASSURANCE_CONTROLLED_FIXTURE_AUDIO_PREFLIGHT_VERSION, futureWorkRequestId, costEnvelopeId, 1,
      controls.exactAudioBindings, controls.exactAudioQualifications, controls.exactAudioRightsReceipts,
      controls.exactAudioCurrentDriftReceipts, controls.exactAudioRouteReadyBindings, canonicalStringify(blockers), evaluatedAt, actor, manifestHash, evidenceHash,
    ));
  statements.push(db.prepare(`INSERT INTO factory_assurance_controlled_fixture_audio_request_contracts
    (id,run_id,admission_item_id,work_order_id,future_work_request_id,capability_key,capability_version,archetype,input_contract_json,input_hash,payload_bytes,output_schema_json,output_schema_hash,settings_contract_json,settings_hash,quality_standard_version,rights_policy_version,retention_policy_version,dispatch_mode,max_provider_requests,max_spend_micros,fallback_allowed,cost_envelope_id,binding_id,qualification_id,rights_receipt_id,drift_receipt_id,canonical_work_request_id,canonical_route_decision_id,canonical_cost_reservation_id,route_preflight_state,blockers_json,materialization_state,policy_version,count_eligible,qualification_authority,pass_authority,provider_dispatch_authority,cost_reservation_authority,r22_authority,master_authority,release_authority,publication_authority,provider_requests,spend_micros,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'PLAN_ONLY',2,80000,0,?,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'BLOCKED',?,'NOT_MATERIALIZED',?,0,0,0,0,0,0,0,0,0,0,0,?)`).bind(
      contractId, runId, admissionItemId, workOrderId, futureWorkRequestId, CONTROLLED_FIXTURE_AUDIO_CAPABILITY_KEY,
      CONTROLLED_FIXTURE_AUDIO_CAPABILITY_VERSION, "CLEAN_AUDIO_CONTROL", inputContractJson, inputHash, payloadBytes,
      outputSchemaJson, outputSchemaHash, settingsContractJson, settingsHash, CONTROLLED_FIXTURE_AUDIO_QUALITY_STANDARD_VERSION,
      CONTROLLED_FIXTURE_AUDIO_RIGHTS_POLICY_VERSION, CONTROLLED_FIXTURE_AUDIO_RETENTION_POLICY_VERSION,
      costEnvelopeId, canonicalStringify(blockers), FACTORY_ASSURANCE_CONTROLLED_FIXTURE_AUDIO_PREFLIGHT_VERSION, contractEvidenceHash,
    ));
  await db.batch(statements);
  return resultFrom({
    id: runId, admission_run_id: admissionRunId, admission_item_id: admissionItemId, work_order_id: workOrderId,
    future_work_request_id: futureWorkRequestId, cost_envelope_id: costEnvelopeId,
    exact_audio_bindings: controls.exactAudioBindings, exact_audio_qualifications: controls.exactAudioQualifications,
    exact_audio_rights_receipts: controls.exactAudioRightsReceipts, exact_audio_current_drift_receipts: controls.exactAudioCurrentDriftReceipts,
    exact_audio_route_ready_bindings: controls.exactAudioRouteReadyBindings,
  }, "RECORDED", blockers);
}
