import { canonicalHash, canonicalStringify, sha256Hex } from "@/lib/canonical-json";
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
import {
  ELEVENLABS_AUDIO_BINDING_VERSION,
  ELEVENLABS_AUDIO_PROVIDER_VERSION,
  ELEVENLABS_OFFICIAL_COMMERCIAL_RIGHTS_URL,
  type AudioProviderCertificationBucket,
  type AudioProviderCertificationFetch,
} from "@/lib/factory-assurance-audio-provider-certification";
import {
  FACTORY_RUNTIME_WRITER_VERSION,
  FactoryRuntimeError,
  reserveFactoryRuntimeWork,
  submitFactoryRuntimeCommandWithEffects,
  type FactoryRuntimeDB,
  type FactoryRuntimeExecution,
} from "@/lib/factory-runtime-writer";

export const FACTORY_ASSURANCE_AUDIO_PAID_DISPATCH_AUTHORIZATION_VERSION = "FACTORY_ASSURANCE_AUDIO_PAID_DISPATCH_AUTHORIZATION_V1" as const;

const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
const MODEL_ID = "eleven_multilingual_v2";
const OUTPUT_FORMAT = "mp3_44100_128";
const AUTHORIZATION_VALIDITY_SECONDS = 900;
const AUTHORIZED_PROVIDER_REQUESTS = 1;
const PAID_TIERS = new Set(["starter", "creator", "pro", "scale", "business", "enterprise"]);
const idempotencyPattern = /^[A-Za-z0-9._:-]{16,200}$/;

type Row = Record<string, unknown>;
type ReadResult = { ok: boolean; status: number | null; bytes: Uint8Array | null; hash: string | null; json: unknown };
export type AudioPaidDispatchAuthorizationEnv = {
  DB: FactoryRuntimeDB;
  BUCKET: AudioProviderCertificationBucket;
  ELEVENLABS_API_KEY: string;
};

const clean = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);
const lower = (value: unknown) => clean(value).toLowerCase();
const boolean = (value: unknown) => value === true || number(value) === 1;
const parse = <T>(value: unknown, fallback: T): T => { try { return JSON.parse(clean(value)) as T; } catch { return fallback; } };
const first = (db: FactoryRuntimeDB, query: string, ...values: unknown[]) => db.prepare(query).bind(...values).first<Row>();
const deterministicId = (prefix: string, hash: string) => `${prefix}-${hash.slice(0, 24)}`;
const object = (value: unknown): Row => value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};

async function read(fetcher: AudioProviderCertificationFetch, url: string, init?: RequestInit): Promise<ReadResult> {
  try {
    const response = await fetcher(url, { ...init, signal: init?.signal ?? AbortSignal.timeout(20_000) });
    const bytes = new Uint8Array(await response.arrayBuffer());
    let json: unknown = null;
    try { json = JSON.parse(new TextDecoder().decode(bytes)); } catch { json = null; }
    return { ok: response.ok, status: response.status, bytes, hash: await sha256Hex(bytes), json };
  } catch {
    return { ok: false, status: null, bytes: null, hash: null, json: null };
  }
}

async function storeExactReadback(
  bucket: AudioProviderCertificationBucket,
  storageKey: string,
  result: ReadResult,
  source: string,
) {
  if (!result.ok || !result.bytes || !result.hash) return { storageKey: null, readbackHash: null, state: "FAIL" as const };
  try {
    await bucket.put(storageKey, result.bytes, {
      httpMetadata: { contentType: "application/json; charset=utf-8" },
      customMetadata: { source },
    });
    const stored = await bucket.get(storageKey);
    const readbackHash = stored ? await sha256Hex(new Uint8Array(await stored.arrayBuffer())) : null;
    return { storageKey, readbackHash, state: readbackHash === result.hash ? "PASS" as const : "FAIL" as const };
  } catch {
    return { storageKey, readbackHash: null, state: "FAIL" as const };
  }
}

function resultFrom(row: Row, outcome: "RECORDED" | "IDEMPOTENT_REPLAY") {
  return {
    outcome,
    runId: clean(row.id),
    routeReservationRunId: clean(row.route_reservation_run_id),
    workRequestId: clean(row.work_request_id),
    routeDecisionId: clean(row.route_decision_id),
    costReservationId: clean(row.cost_reservation_id),
    authorizationState: clean(row.authorization_state) as "AUTHORIZED" | "BLOCKED",
    authorizationScope: "ONE_EXACT_PROVIDER_DISPATCH" as const,
    blockers: parse<string[]>(row.blockers_json, []),
    subscriptionTier: clean(row.subscription_tier) || null,
    subscriptionStatus: clean(row.subscription_status) || null,
    providerMetadataReads: number(row.provider_metadata_reads),
    publicRightsReads: number(row.public_rights_reads),
    authorizedProviderRequests: number(row.authorized_provider_requests),
    authorizedSpendMicros: number(row.authorized_spend_micros),
    providerDispatchAuthority: boolean(row.provider_dispatch_authority),
    providerGenerationRequests: 0,
    providerRequests: 0,
    spendMicros: 0,
    retryAuthority: false,
    fallbackAuthority: false,
    r22Authority: false,
    masterAuthority: false,
    releaseAuthority: false,
    publicationAuthority: false,
    runtimeCommandId: clean(row.runtime_command_id) || null,
    runtimeEventId: clean(row.runtime_event_id) || null,
    runtimeLeaseId: clean(row.runtime_lease_id) || null,
    observedAt: clean(row.observed_at),
    authorizationExpiresAt: clean(row.authorization_expires_at) || null,
  };
}

export async function authorizeFactoryAssuranceAudioPaidDispatch(args: {
  env: AudioPaidDispatchAuthorizationEnv;
  actor: string;
  idempotencyKey: string;
  observedAt?: string;
  fetcher?: AudioProviderCertificationFetch;
  execution?: FactoryRuntimeExecution;
}) {
  const { env } = args;
  const actor = clean(args.actor);
  const idempotencyKey = clean(args.idempotencyKey);
  const observedAt = clean(args.observedAt) || (args.execution?.now?.() ?? new Date()).toISOString();
  if (!actor) throw new FactoryRuntimeError("ASSURANCE_AUDIO_PAID_DISPATCH_AUTHORIZATION_ACTOR_REQUIRED", 400, "An authenticated owner actor is required");
  if (!idempotencyPattern.test(idempotencyKey)) throw new FactoryRuntimeError("ASSURANCE_AUDIO_PAID_DISPATCH_AUTHORIZATION_IDEMPOTENCY_KEY_INVALID", 400, "A stable 16–200 character idempotency key is required");
  if (!Number.isFinite(Date.parse(observedAt))) throw new FactoryRuntimeError("ASSURANCE_AUDIO_PAID_DISPATCH_AUTHORIZATION_OBSERVED_AT_INVALID", 400, "The authorization observation time must be an ISO timestamp");
  if (!clean(env.ELEVENLABS_API_KEY)) throw new FactoryRuntimeError("ELEVENLABS_API_KEY_REQUIRED", 424, "ElevenLabs must be connected before paid-dispatch authorization");

  const requestHash = await canonicalHash({ version: FACTORY_ASSURANCE_AUDIO_PAID_DISPATCH_AUTHORIZATION_VERSION, actor, idempotencyKey, observedAt });
  const prior = await first(env.DB, "SELECT * FROM factory_assurance_audio_paid_dispatch_authorization_runs WHERE idempotency_key=?", idempotencyKey);
  if (prior) {
    if (clean(prior.request_hash) !== requestHash) throw new FactoryRuntimeError("ASSURANCE_AUDIO_PAID_DISPATCH_AUTHORIZATION_IDEMPOTENCY_CONFLICT", 409, "The authorization idempotency key is already bound to another intent");
    return resultFrom(prior, "IDEMPOTENT_REPLAY");
  }

  const row = await first(env.DB, `SELECT
      rr.id route_reservation_run_id,rr.certification_run_id,rr.contract_id,rr.provider_id,rr.binding_id,rr.qualification_id,
      rr.rights_receipt_id,rr.drift_receipt_id,rr.work_request_id,rr.route_decision_id,rr.cost_reservation_id,
      rr.plan_state,rr.canonical_work_requests,rr.canonical_route_decisions,rr.canonical_cost_reservations,
      rr.reserved_provider_requests,rr.reserved_spend_micros,rr.provider_generation_requests route_generation_requests,
      c.certification_state,c.exact_audio_bindings,c.exact_audio_qualifications,c.exact_audio_rights_receipts,c.exact_audio_current_drift_receipts,c.exact_audio_route_ready_bindings,
      ct.capability_key,ct.capability_version,ct.archetype,ct.dispatch_mode contract_dispatch_mode,ct.max_provider_requests contract_max_requests,
      ct.max_spend_micros contract_max_spend,ct.fallback_allowed contract_fallback_allowed,ct.materialization_state,ct.quality_standard_version,
      ct.settings_hash contract_settings_hash,
      ct.rights_policy_version contract_rights_policy_version,ct.retention_policy_version contract_retention_policy_version,
      w.dispatch_mode work_dispatch_mode,w.max_provider_requests work_max_requests,w.max_spend_micros work_max_spend,w.fallback_allowed work_fallback_allowed,
      rd.binding_id route_binding_id,rd.qualification_id route_qualification_id,rd.decision route_decision,rd.provider_requests route_provider_requests,
      rd.spend_micros route_spend_micros,rd.fallback_used,
      cr.cost_envelope_id,cr.binding_id reservation_binding_id,cr.qualification_id reservation_qualification_id,
      cr.reserved_provider_requests reservation_requests,cr.reserved_spend_micros reservation_spend,cr.reservation_state,
      cr.dispatch_authority reservation_dispatch_authority,cr.r22_authority reservation_r22_authority,cr.master_authority reservation_master_authority,
      cr.release_authority reservation_release_authority,cr.publication_authority reservation_publication_authority,
      e.scope_type envelope_scope_type,e.scope_id envelope_scope_id,e.currency envelope_currency,e.max_provider_requests envelope_max_requests,
      e.max_spend_micros envelope_max_spend,e.policy_version envelope_policy_version,e.lifecycle_state envelope_state,
      p.provider_key,p.provider_version,p.lifecycle_state provider_state,p.health_state,
      cap.capability_key registered_capability_key,cap.capability_version registered_capability_version,cap.lifecycle_state capability_state,
      b.provider_id binding_provider_id,b.binding_version,b.endpoint_or_model,b.model_version,b.lifecycle_state binding_state,b.rights_policy_version binding_rights_policy_version,
      b.retention_policy_version binding_retention_policy_version,b.retry_ceiling,
      q.binding_id qualification_binding_id,q.standard_version,q.settings_hash qualification_settings_hash,q.lifecycle_state qualification_state,
      q.qualified_at,q.expires_at qualification_expires_at,
      rights.binding_id rights_binding_id,rights.rights_policy_version receipt_rights_policy_version,
      rights.retention_policy_version receipt_retention_policy_version,rights.commercial_use_state,rights.valid_from,rights.expires_at rights_expires_at,
      drift.binding_id drift_binding_id,drift.qualification_id drift_qualification_id,drift.drift_state,drift.observed_at drift_observed_at,
      (SELECT latest.id FROM factory_provider_drift_receipts latest WHERE latest.binding_id=rr.binding_id ORDER BY latest.observed_at DESC,latest.created_at DESC,latest.id DESC LIMIT 1) latest_drift_receipt_id,
      (SELECT COUNT(*) FROM factory_provider_native_request_receipts native WHERE native.reservation_id=rr.cost_reservation_id) native_request_receipts,
      (SELECT COUNT(*) FROM factory_provider_reconciliation_receipts reconciliation WHERE reconciliation.reservation_id=rr.cost_reservation_id) reconciliation_receipts
    FROM factory_assurance_audio_route_reservation_runs rr
    JOIN factory_assurance_audio_provider_certification_runs c ON c.id=rr.certification_run_id
    JOIN factory_assurance_controlled_fixture_audio_request_contracts ct ON ct.id=rr.contract_id
    JOIN factory_provider_work_requests w ON w.id=rr.work_request_id
    JOIN factory_provider_route_decisions rd ON rd.id=rr.route_decision_id
    JOIN factory_provider_cost_reservations cr ON cr.id=rr.cost_reservation_id
    JOIN factory_cost_envelopes e ON e.id=cr.cost_envelope_id
    JOIN factory_providers p ON p.id=rr.provider_id
    JOIN factory_provider_bindings b ON b.id=rr.binding_id
    JOIN factory_capabilities cap ON cap.id=b.capability_id
    JOIN factory_capability_qualifications q ON q.id=rr.qualification_id
    JOIN factory_rights_eligibility_receipts rights ON rights.id=rr.rights_receipt_id
    JOIN factory_provider_drift_receipts drift ON drift.id=rr.drift_receipt_id
    WHERE rr.plan_state='PLANNED'
    ORDER BY rr.evaluated_at DESC,rr.created_at DESC,rr.id DESC LIMIT 1`);
  if (!row) throw new FactoryRuntimeError("ASSURANCE_AUDIO_ROUTE_RESERVATION_REQUIRED", 409, "One exact canonical audio route reservation is required before paid-dispatch authorization");

  const reservationId = clean(row.cost_reservation_id);
  const liveAuthorization = await first(env.DB, `SELECT id FROM factory_assurance_audio_paid_dispatch_authorization_runs
    WHERE cost_reservation_id=? AND authorization_state='AUTHORIZED' AND authorization_expires_at>? ORDER BY observed_at DESC,created_at DESC,id DESC LIMIT 1`, reservationId, observedAt);
  if (liveAuthorization) throw new FactoryRuntimeError("ASSURANCE_AUDIO_PAID_DISPATCH_ALREADY_AUTHORIZED", 409, "This exact reservation already has an unexpired paid-dispatch authorization");

  const blockers: string[] = [];
  if ([row.canonical_work_requests,row.canonical_route_decisions,row.canonical_cost_reservations].some((value) => number(value) !== 1)
    || number(row.reserved_provider_requests) !== CONTROLLED_FIXTURE_AUDIO_MAX_PROVIDER_REQUESTS
    || number(row.reserved_spend_micros) !== CONTROLLED_FIXTURE_AUDIO_MAX_SPEND_MICROS
    || number(row.route_generation_requests) !== 0) blockers.push("EXACT_ROUTE_RESERVATION_CARDINALITY_INVALID");
  if (clean(row.certification_state) !== "CERTIFIED" || [row.exact_audio_bindings,row.exact_audio_qualifications,row.exact_audio_rights_receipts,row.exact_audio_current_drift_receipts,row.exact_audio_route_ready_bindings].some((value) => number(value) !== 1)) blockers.push("EXACT_AUDIO_CERTIFICATION_INVALID");
  if (clean(row.capability_key) !== CONTROLLED_FIXTURE_AUDIO_CAPABILITY_KEY || clean(row.capability_version) !== CONTROLLED_FIXTURE_AUDIO_CAPABILITY_VERSION
    || clean(row.registered_capability_key) !== CONTROLLED_FIXTURE_AUDIO_CAPABILITY_KEY || clean(row.registered_capability_version) !== CONTROLLED_FIXTURE_AUDIO_CAPABILITY_VERSION
    || clean(row.archetype) !== "CLEAN_AUDIO_CONTROL" || clean(row.materialization_state) !== "NOT_MATERIALIZED"
    || clean(row.quality_standard_version) !== CONTROLLED_FIXTURE_AUDIO_QUALITY_STANDARD_VERSION) blockers.push("TYPED_AUDIO_CONTRACT_MISMATCH");
  if (clean(row.contract_dispatch_mode) !== "PLAN_ONLY" || clean(row.work_dispatch_mode) !== "PLAN_ONLY"
    || number(row.contract_max_requests) !== 2 || number(row.work_max_requests) !== 2 || number(row.contract_max_spend) !== 80000 || number(row.work_max_spend) !== 80000
    || boolean(row.contract_fallback_allowed) || boolean(row.work_fallback_allowed)) blockers.push("PLAN_ONLY_REQUEST_BOUNDARY_MISMATCH");
  if (clean(row.route_binding_id) !== clean(row.binding_id) || clean(row.route_qualification_id) !== clean(row.qualification_id)
    || clean(row.route_decision) !== "PLANNED_ZERO_DISPATCH" || number(row.route_provider_requests) !== 0 || number(row.route_spend_micros) !== 0 || boolean(row.fallback_used)) blockers.push("EXACT_ZERO_DISPATCH_ROUTE_INVALID");
  if (clean(row.reservation_binding_id) !== clean(row.binding_id) || clean(row.reservation_qualification_id) !== clean(row.qualification_id)
    || clean(row.reservation_state) !== "RESERVED" || number(row.reservation_requests) !== 2 || number(row.reservation_spend) !== 80000
    || boolean(row.reservation_dispatch_authority) || boolean(row.reservation_r22_authority) || boolean(row.reservation_master_authority)
    || boolean(row.reservation_release_authority) || boolean(row.reservation_publication_authority)) blockers.push("EXACT_PLAN_ONLY_RESERVATION_INVALID");
  if (clean(row.envelope_scope_type) !== "REQUEST" || clean(row.envelope_scope_id) !== clean(row.work_request_id) || clean(row.envelope_currency) !== "USD"
    || number(row.envelope_max_requests) !== 2 || number(row.envelope_max_spend) !== 80000
    || clean(row.envelope_policy_version) !== CONTROLLED_FIXTURE_AUDIO_COST_POLICY_VERSION || clean(row.envelope_state) !== "ACTIVE") blockers.push("EXACT_AUDIO_COST_ENVELOPE_INVALID");
  if (clean(row.provider_key) !== "ELEVENLABS" || clean(row.provider_version) !== ELEVENLABS_AUDIO_PROVIDER_VERSION || clean(row.binding_provider_id) !== clean(row.provider_id)
    || clean(row.provider_state) !== "ACTIVE" || clean(row.health_state) !== "HEALTHY"
    || clean(row.capability_state) !== "ACTIVE" || clean(row.binding_state) !== "ACTIVE" || clean(row.binding_version) !== ELEVENLABS_AUDIO_BINDING_VERSION
    || clean(row.model_version) !== MODEL_ID || !clean(row.endpoint_or_model).includes(`/text-to-speech/${VOICE_ID}`) || !clean(row.endpoint_or_model).includes(`output_format=${OUTPUT_FORMAT}`)
    || number(row.retry_ceiling) !== 0) blockers.push("EXACT_AUDIO_PROVIDER_BINDING_INVALID");
  if (clean(row.qualification_binding_id) !== clean(row.binding_id) || clean(row.qualification_state) !== "QUALIFIED"
    || clean(row.standard_version) !== CONTROLLED_FIXTURE_AUDIO_QUALITY_STANDARD_VERSION || clean(row.qualification_settings_hash) !== clean(row.contract_settings_hash)
    || clean(row.qualified_at) > observedAt || (clean(row.qualification_expires_at) && clean(row.qualification_expires_at) <= observedAt)) blockers.push("EXACT_AUDIO_QUALIFICATION_NOT_CURRENT");
  if (clean(row.rights_binding_id) !== clean(row.binding_id) || clean(row.receipt_rights_policy_version) !== CONTROLLED_FIXTURE_AUDIO_RIGHTS_POLICY_VERSION
    || clean(row.receipt_retention_policy_version) !== CONTROLLED_FIXTURE_AUDIO_RETENTION_POLICY_VERSION || clean(row.commercial_use_state) !== "ELIGIBLE"
    || clean(row.valid_from) > observedAt || (clean(row.rights_expires_at) && clean(row.rights_expires_at) <= observedAt)) blockers.push("EXACT_AUDIO_RIGHTS_NOT_CURRENT");
  if (clean(row.contract_rights_policy_version) !== CONTROLLED_FIXTURE_AUDIO_RIGHTS_POLICY_VERSION || clean(row.binding_rights_policy_version) !== CONTROLLED_FIXTURE_AUDIO_RIGHTS_POLICY_VERSION
    || clean(row.contract_retention_policy_version) !== CONTROLLED_FIXTURE_AUDIO_RETENTION_POLICY_VERSION || clean(row.binding_retention_policy_version) !== CONTROLLED_FIXTURE_AUDIO_RETENTION_POLICY_VERSION) blockers.push("EXACT_AUDIO_RIGHTS_POLICY_MISMATCH");
  if (clean(row.drift_binding_id) !== clean(row.binding_id) || clean(row.drift_qualification_id) !== clean(row.qualification_id)
    || clean(row.drift_state) !== "CURRENT" || clean(row.latest_drift_receipt_id) !== clean(row.drift_receipt_id) || clean(row.drift_observed_at) > observedAt) blockers.push("EXACT_AUDIO_DRIFT_NOT_CURRENT");
  if (number(row.native_request_receipts) !== 0 || number(row.reconciliation_receipts) !== 0) blockers.push("EXACT_RESERVATION_ALREADY_HAS_PROVIDER_ACTIVITY");

  let providerMetadataReads = 0;
  let publicRightsReads = 0;
  let subscription: ReadResult = { ok: false, status: null, bytes: null, hash: null, json: null };
  let voice: ReadResult = { ok: false, status: null, bytes: null, hash: null, json: null };
  let models: ReadResult = { ok: false, status: null, bytes: null, hash: null, json: null };
  let official: ReadResult = { ok: false, status: null, bytes: null, hash: null, json: null };
  if (blockers.length === 0) {
    const fetcher = args.fetcher ?? fetch;
    const headers = { "xi-api-key": env.ELEVENLABS_API_KEY };
    [subscription, voice, models, official] = await Promise.all([
      read(fetcher, "https://api.elevenlabs.io/v1/user/subscription", { headers }),
      read(fetcher, `https://api.elevenlabs.io/v1/voices/${VOICE_ID}`, { headers }),
      read(fetcher, "https://api.elevenlabs.io/v1/models", { headers }),
      read(fetcher, ELEVENLABS_OFFICIAL_COMMERCIAL_RIGHTS_URL),
    ]);
    providerMetadataReads = 3;
    publicRightsReads = 1;
  }

  const subscriptionJson = object(subscription.json);
  const voiceJson = object(voice.json);
  const modelList = Array.isArray(models.json) ? models.json.map(object) : [];
  const model = modelList.find((item) => clean(item.model_id) === MODEL_ID) ?? {};
  const tier = lower(subscriptionJson.tier);
  const subscriptionStatus = lower(subscriptionJson.status);
  const maxCharacters = number(model.maximum_text_length_per_request || model.max_characters_request_subscribed_user);
  if (providerMetadataReads > 0 && (!subscription.ok || !PAID_TIERS.has(tier) || subscriptionStatus !== "active")) blockers.push("GENERATION_TIME_ACTIVE_PAID_SUBSCRIPTION_REQUIRED");
  if (providerMetadataReads > 0 && (!voice.ok || clean(voiceJson.voice_id) !== VOICE_ID)) blockers.push("GENERATION_TIME_EXACT_VOICE_REQUIRED");
  if (providerMetadataReads > 0 && (!models.ok || clean(model.model_id) !== MODEL_ID || model.can_do_text_to_speech !== true || model.requires_alpha_access === true
    || model.can_use_style !== true || model.can_use_speaker_boost !== true || (maxCharacters > 0 && maxCharacters < 700))) blockers.push("GENERATION_TIME_EXACT_NON_BETA_TTS_MODEL_REQUIRED");
  const officialText = official.bytes ? new TextDecoder().decode(official.bytes).toLowerCase().replace(/\s+/g, " ") : "";
  if (publicRightsReads > 0 && (!official.ok || !officialText.includes("all paid plans include a commercial license") || !officialText.includes("beta services"))) blockers.push("GENERATION_TIME_OFFICIAL_COMMERCIAL_RIGHTS_REQUIRED");

  const subscriptionKey = subscription.hash ? `factory/assurance/audio-paid-dispatch-authorization/subscription/${subscription.hash}.json` : "";
  const officialKey = official.hash ? `factory/assurance/audio-paid-dispatch-authorization/official-rights/${official.hash}.json` : "";
  const subscriptionReadback = subscriptionKey ? await storeExactReadback(env.BUCKET, subscriptionKey, subscription, "ELEVENLABS_SUBSCRIPTION") : { storageKey: null, readbackHash: null, state: "FAIL" as const };
  const officialReadback = officialKey ? await storeExactReadback(env.BUCKET, officialKey, official, ELEVENLABS_OFFICIAL_COMMERCIAL_RIGHTS_URL) : { storageKey: null, readbackHash: null, state: "FAIL" as const };
  if (providerMetadataReads > 0 && subscriptionReadback.state !== "PASS") blockers.push("GENERATION_TIME_SUBSCRIPTION_R2_READBACK_FAILED");
  if (publicRightsReads > 0 && officialReadback.state !== "PASS") blockers.push("GENERATION_TIME_OFFICIAL_RIGHTS_R2_READBACK_FAILED");

  const uniqueBlockers = [...new Set(blockers)].sort();
  const authorized = uniqueBlockers.length === 0;
  const normalizedObservation = {
    provider: "ELEVENLABS",
    providerVersion: ELEVENLABS_AUDIO_PROVIDER_VERSION,
    reservationId,
    subscription: { tier: tier || null, status: subscriptionStatus || null, paid: PAID_TIERS.has(tier) },
    voice: { id: clean(voiceJson.voice_id) || null, name: clean(voiceJson.name) || null },
    model: { id: clean(model.model_id) || null, textToSpeech: model.can_do_text_to_speech === true, requiresAlphaAccess: model.requires_alpha_access === true, maxCharacters: maxCharacters || null },
    outputFormat: OUTPUT_FORMAT,
    officialCommercialRightsAssertion: official.ok && officialText.includes("all paid plans include a commercial license") && officialText.includes("beta services"),
    actualProviderRequests: 0,
    actualSpendMicros: 0,
  };
  const observationHash = await canonicalHash({
    version: FACTORY_ASSURANCE_AUDIO_PAID_DISPATCH_AUTHORIZATION_VERSION,
    reservationId,
    observedAt,
    normalizedObservation,
    hashes: {
      subscription: subscription.hash,
      subscriptionReadback: subscriptionReadback.readbackHash,
      voice: voice.hash,
      models: models.hash,
      officialRights: official.hash,
      officialRightsReadback: officialReadback.readbackHash,
    },
    blockers: uniqueBlockers,
  });
  const runId = deterministicId("factory-assurance-audio-paid-dispatch-authorization-run", requestHash);
  const receiptId = deterministicId("factory-assurance-audio-paid-dispatch-entitlement", observationHash);
  const authorizationExpiresAt = authorized ? new Date(Date.parse(observedAt) + AUTHORIZATION_VALIDITY_SECONDS * 1000).toISOString() : null;
  const evidenceHash = await canonicalHash({
    version: FACTORY_ASSURANCE_AUDIO_PAID_DISPATCH_AUTHORIZATION_VERSION,
    requestHash,
    observationHash,
    authorizationState: authorized ? "AUTHORIZED" : "BLOCKED",
    authorizationExpiresAt,
    authorizedProviderRequests: authorized ? AUTHORIZED_PROVIDER_REQUESTS : 0,
    authorizedSpendMicros: authorized ? CONTROLLED_FIXTURE_AUDIO_MAX_SPEND_MICROS : 0,
    blockers: uniqueBlockers,
  });

  const runStatement = (runtime: { commandId: string | null; eventId: string | null; leaseId: string | null }) => env.DB.prepare(`INSERT INTO factory_assurance_audio_paid_dispatch_authorization_runs
    (id,route_reservation_run_id,certification_run_id,contract_id,work_request_id,route_decision_id,cost_reservation_id,provider_id,binding_id,qualification_id,rights_receipt_id,drift_receipt_id,idempotency_key,request_hash,policy_version,authorization_state,authorization_scope,blockers_json,subscription_tier,subscription_status,subscription_response_hash,subscription_storage_key,subscription_readback_hash,subscription_readback_state,voice_response_hash,model_response_hash,official_rights_response_hash,official_rights_storage_key,official_rights_readback_hash,official_rights_readback_state,normalized_observation_json,provider_metadata_reads,public_rights_reads,authorized_provider_requests,authorized_spend_micros,provider_dispatch_authority,provider_generation_requests,provider_requests,spend_micros,retry_authority,fallback_authority,r22_authority,master_authority,release_authority,publication_authority,runtime_command_id,runtime_event_id,runtime_lease_id,observed_at,authorization_expires_at,actor,evidence_hash)
    VALUES (${Array.from({ length: 52 }, () => "?").join(",")})`).bind(
      runId, row.route_reservation_run_id, row.certification_run_id, row.contract_id, row.work_request_id, row.route_decision_id, reservationId,
      row.provider_id, row.binding_id, row.qualification_id, row.rights_receipt_id, row.drift_receipt_id, idempotencyKey, requestHash,
      FACTORY_ASSURANCE_AUDIO_PAID_DISPATCH_AUTHORIZATION_VERSION, authorized ? "AUTHORIZED" : "BLOCKED", "ONE_EXACT_PROVIDER_DISPATCH", canonicalStringify(uniqueBlockers),
      tier || null, subscriptionStatus || null, subscription.hash, subscriptionReadback.storageKey, subscriptionReadback.readbackHash, subscriptionReadback.state,
      voice.hash, models.hash, official.hash, officialReadback.storageKey, officialReadback.readbackHash, officialReadback.state,
      canonicalStringify(normalizedObservation), providerMetadataReads, publicRightsReads,
      authorized ? AUTHORIZED_PROVIDER_REQUESTS : 0, authorized ? CONTROLLED_FIXTURE_AUDIO_MAX_SPEND_MICROS : 0, authorized ? 1 : 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      runtime.commandId, runtime.eventId, runtime.leaseId, observedAt, authorizationExpiresAt, actor, evidenceHash,
    );
  const receiptStatement = env.DB.prepare(`INSERT INTO factory_assurance_audio_paid_dispatch_entitlement_receipts
    (id,run_id,cost_reservation_id,binding_id,voice_id,model_id,official_rights_source_url,subscription_response_hash,subscription_storage_key,subscription_readback_hash,subscription_readback_state,voice_response_hash,model_response_hash,official_rights_response_hash,official_rights_storage_key,official_rights_readback_hash,receipt_state,blockers_json,provider_metadata_reads,public_rights_reads,provider_generation_requests,provider_requests,spend_micros,retry_authority,fallback_authority,r22_authority,master_authority,release_authority,publication_authority,observed_at,evidence_hash)
    VALUES (?,?,?,?,?,?, ?,?,?,?,?,?,?,?,?,?, ?,?,?,?,0,0,0,0,0,0,0,0,0,?,?)`).bind(
      receiptId, runId, reservationId, row.binding_id, clean(voiceJson.voice_id) || null, clean(model.model_id) || null,
      ELEVENLABS_OFFICIAL_COMMERCIAL_RIGHTS_URL, subscription.hash, subscriptionReadback.storageKey, subscriptionReadback.readbackHash,
      subscriptionReadback.state, voice.hash, models.hash, official.hash, officialReadback.storageKey, officialReadback.readbackHash,
      authorized ? "PASS" : "BLOCKED", canonicalStringify(uniqueBlockers), providerMetadataReads, publicRightsReads, observedAt, observationHash,
    );

  if (!authorized) {
    await env.DB.batch([runStatement({ commandId: null, eventId: null, leaseId: null }), receiptStatement]);
  } else {
    const leaseIntentHash = await canonicalHash({ version: FACTORY_ASSURANCE_AUDIO_PAID_DISPATCH_AUTHORIZATION_VERSION, requestHash, reservationId, stage: "AUDIO_PAID_DISPATCH_AUTHORIZATION" });
    const lease = await reserveFactoryRuntimeWork(env.DB, {
      streamType: "ASSURANCE_AUDIO_PAID_DISPATCH_AUTHORIZATION",
      streamId: runId,
      stageKey: "AUDIO_PAID_DISPATCH_AUTHORIZATION",
      expectedState: "READY",
      expectedVersion: 0,
      actorType: "OWNER",
      actorId: actor,
      idempotencyKey: `factory:audio:dispatch-auth:lease:${requestHash.slice(0, 32)}`,
      intentHash: leaseIntentHash,
      evidenceHash,
    }, args.execution);
    const commandIntentHash = await canonicalHash({ version: FACTORY_ASSURANCE_AUDIO_PAID_DISPATCH_AUTHORIZATION_VERSION, requestHash, leaseId: lease.leaseId, fencingToken: lease.fencingToken, observationHash });
    const result = await submitFactoryRuntimeCommandWithEffects(env.DB, {
      streamType: "ASSURANCE_AUDIO_PAID_DISPATCH_AUTHORIZATION",
      streamId: runId,
      commandType: "FREEZE_STAGE",
      expectedState: "WorkReserved",
      expectedVersion: lease.streamVersion,
      actorType: "OWNER",
      actorId: actor,
      leaseId: lease.leaseId,
      fencingToken: lease.fencingToken,
      idempotencyKey: `factory:audio:dispatch-auth:command:${requestHash.slice(0, 32)}`,
      intentHash: commandIntentHash,
      policyVersions: { runtime: FACTORY_RUNTIME_WRITER_VERSION, assuranceAudioPaidDispatchAuthorization: FACTORY_ASSURANCE_AUDIO_PAID_DISPATCH_AUTHORIZATION_VERSION },
      costScope: { mode: "ONE_EXACT_PROVIDER_DISPATCH_AUTHORIZATION", costReservationId: reservationId, maxProviderRequests: 1, maxSpendMicros: 80000, actualProviderRequests: 0, actualSpendMicros: 0 },
      rightsScope: { rightsPolicyVersion: CONTROLLED_FIXTURE_AUDIO_RIGHTS_POLICY_VERSION, retentionPolicyVersion: CONTROLLED_FIXTURE_AUDIO_RETENTION_POLICY_VERSION, rightsReceiptId: clean(row.rights_receipt_id), entitlementReceiptId: receiptId },
      payload: { reservationId, bindingId: row.binding_id, authorizationScope: "ONE_EXACT_PROVIDER_DISPATCH", authorizationExpiresAt, providerDispatchAuthority: true, providerGenerationRequests: 0, providerRequests: 0, spendUsd: 0 },
      evidenceHash,
    }, ({ commandId, effectEventId }) => [
      runStatement({ commandId, eventId: effectEventId, leaseId: lease.leaseId }),
      receiptStatement,
    ], args.execution);
    if (result.decision !== "ACCEPTED") throw new FactoryRuntimeError("ASSURANCE_AUDIO_PAID_DISPATCH_AUTHORIZATION_WRITE_FAILED", 409, "The atomic paid-dispatch authorization command was rejected", result.reasons);
  }

  const recorded = await first(env.DB, "SELECT * FROM factory_assurance_audio_paid_dispatch_authorization_runs WHERE id=?", runId);
  if (!recorded) throw new FactoryRuntimeError("ASSURANCE_AUDIO_PAID_DISPATCH_AUTHORIZATION_WRITE_FAILED", 503, "The paid-dispatch authorization receipt could not be reconciled after write");
  return resultFrom(recorded, "RECORDED");
}
