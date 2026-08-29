import { canonicalHash, canonicalStringify, sha256Hex } from "@/lib/canonical-json";
import {
  CONTROLLED_FIXTURE_AUDIO_CAPABILITY_KEY,
  CONTROLLED_FIXTURE_AUDIO_CAPABILITY_VERSION,
  CONTROLLED_FIXTURE_AUDIO_QUALITY_STANDARD_VERSION,
  CONTROLLED_FIXTURE_AUDIO_RETENTION_POLICY_VERSION,
  CONTROLLED_FIXTURE_AUDIO_RIGHTS_POLICY_VERSION,
} from "@/lib/factory-assurance-controlled-fixture-audio-preflight";
import { FactoryRuntimeError, type FactoryRuntimeDB } from "@/lib/factory-runtime-writer";

export const FACTORY_ASSURANCE_AUDIO_PROVIDER_CERTIFICATION_VERSION = "FACTORY_ASSURANCE_AUDIO_PROVIDER_CERTIFICATION_V1" as const;
export const ELEVENLABS_AUDIO_PROVIDER_VERSION = "ELEVENLABS_API_V1" as const;
export const ELEVENLABS_AUDIO_BINDING_VERSION = "CONTROLLED_FIXTURE_AUDIO_V1" as const;
export const ELEVENLABS_OFFICIAL_COMMERCIAL_RIGHTS_URL = "https://help.elevenlabs.io/api/v2/help_center/en-us/articles/13313564601361.json" as const;

type Row = Record<string, unknown>;
type StoredObject = { arrayBuffer(): Promise<ArrayBuffer> };
export type AudioProviderCertificationBucket = {
  get(key: string): Promise<StoredObject | null>;
  put(key: string, value: Uint8Array, options?: Record<string, unknown>): Promise<unknown>;
};
export type AudioProviderCertificationFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
export type AudioProviderCertificationEnv = {
  DB: FactoryRuntimeDB;
  BUCKET: AudioProviderCertificationBucket;
  ELEVENLABS_API_KEY: string;
};

const CHANNEL_ID = "channel-hidden-systems";
const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
const MODEL_ID = "eleven_multilingual_v2";
const OUTPUT_FORMAT = "mp3_44100_128";
const VALIDITY_SECONDS = 604_800;
const PAID_TIERS = new Set(["starter", "creator", "pro", "scale", "business", "enterprise"]);
const idempotencyPattern = /^[A-Za-z0-9._:-]{16,200}$/;
const hashPattern = /^[a-f0-9]{64}$/;
const clean = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);
const boolean = (value: unknown) => value === true || number(value) === 1;
const lower = (value: unknown) => clean(value).toLowerCase();
const parse = <T>(value: unknown, fallback: T): T => { try { return JSON.parse(clean(value)) as T; } catch { return fallback; } };
const first = (db: FactoryRuntimeDB, query: string, ...values: unknown[]) => db.prepare(query).bind(...values).first<Row>();
const deterministicId = (prefix: string, hash: string) => `${prefix}-${hash.slice(0, 24)}`;

type ReadResult = { ok: boolean; status: number | null; bytes: Uint8Array | null; hash: string | null; json: unknown };

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

function object(value: unknown): Row { return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {}; }
function resultFrom(row: Row, outcome: "RECORDED" | "IDEMPOTENT_REPLAY") {
  return {
    outcome,
    runId: clean(row.id),
    certificationState: clean(row.certification_state) as "CERTIFIED" | "BLOCKED",
    blockers: parse<string[]>(row.blockers_json, []),
    providerId: clean(row.provider_id) || null,
    capabilityId: clean(row.capability_id) || null,
    bindingId: clean(row.binding_id) || null,
    qualificationId: clean(row.qualification_id) || null,
    rightsReceiptId: clean(row.rights_receipt_id) || null,
    driftReceiptId: clean(row.drift_receipt_id) || null,
    exactAudioBindings: number(row.exact_audio_bindings),
    exactAudioQualifications: number(row.exact_audio_qualifications),
    exactAudioRightsReceipts: number(row.exact_audio_rights_receipts),
    exactAudioCurrentDriftReceipts: number(row.exact_audio_current_drift_receipts),
    exactAudioRouteReadyBindings: number(row.exact_audio_route_ready_bindings),
    providerMetadataReads: number(row.provider_metadata_reads),
    publicRightsReads: number(row.public_rights_reads),
    providerGenerationRequests: 0,
    canonicalWorkRequests: 0,
    canonicalRouteDecisions: 0,
    canonicalCostReservations: 0,
    providerDispatchAuthority: false,
    costReservationAuthority: false,
    spendMicros: 0,
  };
}

async function historicalEvidence(env: AudioProviderCertificationEnv) {
  const row = await first(env.DB, `SELECT
      i.id historical_voice_identity_receipt_id,i.voice_id identity_voice_id,i.voice_name identity_voice_name,i.model_id identity_model_id,
      i.output_format identity_output_format,i.settings_json identity_settings_json,i.settings_hash identity_settings_hash,
      p.id historical_provider_receipt_id,p.voice_id provider_voice_id,p.model_id provider_model_id,p.settings_hash provider_settings_hash,
      p.exact_response_hash provider_response_hash,p.r2_readback_hash provider_readback_hash,p.r2_readback_verified provider_readback_verified,
      a.id historical_artifact_id,a.storage_key historical_storage_key,a.byte_size historical_byte_size,a.sha256 historical_artifact_hash,
      a.materialization_state historical_materialization_state,a.rights_state historical_artifact_rights_state,
      r.id historical_rights_receipt_id,r.rights_state historical_rights_state,r.entitlement_state historical_entitlement_state,
      q.id historical_qa_receipt_id,q.decision_state historical_qa_state,q.p0_count historical_p0_count,q.p1_count historical_p1_count,
      o.id historical_owner_receipt_id,o.decision_state historical_owner_state,o.full_listen_attested historical_full_listen_attested,o.observed_defects_json historical_owner_defects_json,
      e.id historical_eligibility_receipt_id,e.decision_state historical_eligibility_state,e.reference_eligible historical_reference_eligible,
      e.exact_artifact_hash historical_eligibility_hash,e.r2_readback_hash historical_eligibility_readback_hash,
      s.id historical_subscription_receipt_id,s.subscription_tier historical_subscription_tier,s.subscription_status historical_subscription_status,
      s.commercial_use_eligible historical_commercial_use_eligible
    FROM v7_evaluation_clean_audio_control_eligibility_receipts e
    JOIN v7_evaluation_commercial_clean_audio_artifacts a ON a.id=e.artifact_id
    JOIN v7_evaluation_commercial_clean_audio_provider_receipts p ON p.id=a.provider_receipt_id
    JOIN v7_evaluation_commercial_subscription_receipts s ON s.id=p.subscription_receipt_id
    JOIN v7_evaluation_commercial_clean_audio_rights_receipts r ON r.id=e.rights_receipt_id AND r.artifact_id=a.id
    JOIN v7_evaluation_factory_audio_qa_recovery_receipts q ON q.id=e.qa_recovery_receipt_id AND q.artifact_id=a.id
    JOIN v7_evaluation_clean_audio_owner_ground_truth_receipts o ON o.id=e.owner_receipt_id AND o.artifact_id=a.id
    JOIN v7_evaluation_fixture_voice_identity_receipts i ON i.channel_id=e.channel_id AND i.policy_version='CONTROLLED_FIXTURE_MATERIALIZATION_V1'
    WHERE e.channel_id=? AND e.policy_version='CLEAN_AUDIO_CONTROL_ELIGIBILITY_V1'
    ORDER BY e.created_at DESC,e.id DESC LIMIT 1`, CHANNEL_ID);
  if (!row) return { row: null, bytesState: "FAIL" as const, blockers: ["HISTORICAL_CLEAN_AUDIO_REFERENCE_REQUIRED"] };
  const blockers: string[] = [];
  const exactHash = lower(row.historical_artifact_hash);
  const exactSettingsHash = lower(row.identity_settings_hash);
  if (clean(row.identity_voice_id) !== VOICE_ID || clean(row.provider_voice_id) !== VOICE_ID
    || clean(row.identity_model_id) !== MODEL_ID || clean(row.provider_model_id) !== MODEL_ID
    || clean(row.identity_output_format) !== OUTPUT_FORMAT || lower(row.provider_settings_hash) !== exactSettingsHash
    || await canonicalHash(parse<Row>(row.identity_settings_json, {})) !== exactSettingsHash) blockers.push("HISTORICAL_EXACT_PROVIDER_IDENTITY_MISMATCH");
  if (!hashPattern.test(exactHash) || [row.provider_response_hash,row.provider_readback_hash,row.historical_eligibility_hash,row.historical_eligibility_readback_hash]
    .some((value) => lower(value) !== exactHash) || !boolean(row.provider_readback_verified)) blockers.push("HISTORICAL_EXACT_HASH_LINEAGE_MISMATCH");
  if (clean(row.historical_materialization_state) !== "BYTES_PROVIDER_ENTITLEMENT_AND_RIGHTS_VERIFIED"
    || clean(row.historical_artifact_rights_state) !== "PASS" || clean(row.historical_rights_state) !== "PASS"
    || clean(row.historical_entitlement_state) !== "EXPLICIT_ACTIVE_PAID_BASE_PLAN" || !boolean(row.historical_commercial_use_eligible)
    || clean(row.historical_subscription_status) !== "active" || !PAID_TIERS.has(lower(row.historical_subscription_tier))) blockers.push("HISTORICAL_COMMERCIAL_RIGHTS_EVIDENCE_FAILED");
  if (clean(row.historical_qa_state) !== "LIKELY_CLEAN" || number(row.historical_p0_count) !== 0 || number(row.historical_p1_count) !== 0
    || clean(row.historical_owner_state) !== "CLEAN_CONFIRMED" || !boolean(row.historical_full_listen_attested)
    || parse<unknown[]>(row.historical_owner_defects_json, ["INVALID_JSON"]).length !== 0
    || clean(row.historical_eligibility_state) !== "ELIGIBLE_CLEAN_CONTROL_REFERENCE" || !boolean(row.historical_reference_eligible)) blockers.push("HISTORICAL_CLEAN_AUDIO_QUALITY_EVIDENCE_FAILED");
  let bytesState: "PASS" | "FAIL" = "FAIL";
  const stored = await env.BUCKET.get(clean(row.historical_storage_key));
  if (stored) {
    const bytes = new Uint8Array(await stored.arrayBuffer());
    bytesState = await sha256Hex(bytes) === exactHash && bytes.byteLength === number(row.historical_byte_size) ? "PASS" : "FAIL";
  }
  if (bytesState !== "PASS") blockers.push("HISTORICAL_CLEAN_AUDIO_R2_READBACK_FAILED");
  return { row, bytesState, blockers };
}

export async function certifyFactoryAssuranceAudioProvider(args: {
  env: AudioProviderCertificationEnv;
  actor: string;
  idempotencyKey: string;
  observedAt?: string;
  fetcher?: AudioProviderCertificationFetch;
}) {
  const { env } = args;
  const actor = clean(args.actor), idempotencyKey = clean(args.idempotencyKey), observedAt = clean(args.observedAt) || new Date().toISOString();
  if (!actor) throw new FactoryRuntimeError("ASSURANCE_AUDIO_PROVIDER_CERTIFICATION_ACTOR_REQUIRED", 400, "An authenticated owner actor is required");
  if (!idempotencyPattern.test(idempotencyKey)) throw new FactoryRuntimeError("ASSURANCE_AUDIO_PROVIDER_CERTIFICATION_IDEMPOTENCY_KEY_INVALID", 400, "A stable 16–200 character idempotency key is required");
  if (!Number.isFinite(Date.parse(observedAt))) throw new FactoryRuntimeError("ASSURANCE_AUDIO_PROVIDER_CERTIFICATION_OBSERVED_AT_INVALID", 400, "The provider observation time must be an ISO timestamp");
  if (!clean(env.ELEVENLABS_API_KEY)) throw new FactoryRuntimeError("ELEVENLABS_API_KEY_REQUIRED", 424, "ElevenLabs must be connected before exact audio-provider certification");

  const requestHash = await canonicalHash({ version: FACTORY_ASSURANCE_AUDIO_PROVIDER_CERTIFICATION_VERSION, actor, idempotencyKey, observedAt });
  const prior = await first(env.DB, "SELECT * FROM factory_assurance_audio_provider_certification_runs WHERE idempotency_key=?", idempotencyKey);
  if (prior) {
    if (clean(prior.request_hash) !== requestHash) throw new FactoryRuntimeError("ASSURANCE_AUDIO_PROVIDER_CERTIFICATION_IDEMPOTENCY_CONFLICT", 409, "The certification idempotency key is already bound to another observation intent");
    return resultFrom(prior, "IDEMPOTENT_REPLAY");
  }
  const alreadyCertified = await first(env.DB, "SELECT id FROM factory_assurance_audio_provider_certification_runs WHERE certification_state='CERTIFIED' ORDER BY observed_at DESC,created_at DESC LIMIT 1");
  if (alreadyCertified) throw new FactoryRuntimeError("ASSURANCE_AUDIO_PROVIDER_ALREADY_CERTIFIED", 409, "The exact audio-provider binding is already certified; proceed to canonical request routing");

  const contract = await first(env.DB, `SELECT c.*,p.id preflight_run_id,p.preflight_state FROM factory_assurance_controlled_fixture_audio_request_contracts c
    JOIN factory_assurance_controlled_fixture_audio_preflight_runs p ON p.id=c.run_id
    WHERE c.capability_key=? AND c.capability_version=? ORDER BY c.created_at DESC,c.id DESC LIMIT 1`,
    CONTROLLED_FIXTURE_AUDIO_CAPABILITY_KEY, CONTROLLED_FIXTURE_AUDIO_CAPABILITY_VERSION);
  if (!contract || clean(contract.preflight_state) !== "BLOCKED" || clean(contract.dispatch_mode) !== "PLAN_ONLY"
    || clean(contract.route_preflight_state) !== "BLOCKED" || clean(contract.materialization_state) !== "NOT_MATERIALIZED") {
    throw new FactoryRuntimeError("ASSURANCE_AUDIO_PROVIDER_PREFLIGHT_CONTRACT_REQUIRED", 409, "The immutable blocked PLAN_ONLY audio preflight contract is required before provider certification");
  }
  const inputSchemaHash = await canonicalHash({
    type: "object", additionalProperties: false, required: ["text", "language", "purpose", "freshGenerationRequired"],
    properties: {
      text: { type: "string", minLength: 1, maxLength: 700 }, language: { const: "en-US" },
      purpose: { const: "CONTROLLED_FIXTURE_CLEAN_AUDIO" }, freshGenerationRequired: { const: true },
    },
  });

  const history = await historicalEvidence(env);
  const fetcher = args.fetcher ?? fetch;
  const headers = { "xi-api-key": env.ELEVENLABS_API_KEY };
  const [subscription, voice, models, official] = await Promise.all([
    read(fetcher, "https://api.elevenlabs.io/v1/user/subscription", { headers }),
    read(fetcher, `https://api.elevenlabs.io/v1/voices/${VOICE_ID}`, { headers }),
    read(fetcher, "https://api.elevenlabs.io/v1/models", { headers }),
    read(fetcher, ELEVENLABS_OFFICIAL_COMMERCIAL_RIGHTS_URL),
  ]);
  const blockers = [...history.blockers];
  const subscriptionJson = object(subscription.json), voiceJson = object(voice.json);
  const modelList = Array.isArray(models.json) ? models.json.map(object) : [];
  const model = modelList.find((item) => clean(item.model_id) === MODEL_ID) ?? {};
  const tier = lower(subscriptionJson.tier), subscriptionStatus = lower(subscriptionJson.status);
  if (!subscription.ok || !PAID_TIERS.has(tier) || subscriptionStatus !== "active") blockers.push("CURRENT_ACTIVE_PAID_SUBSCRIPTION_REQUIRED");
  if (!voice.ok || clean(voiceJson.voice_id) !== VOICE_ID) blockers.push("CURRENT_EXACT_VOICE_REQUIRED");
  const maxCharacters = number(model.maximum_text_length_per_request || model.max_characters_request_subscribed_user);
  if (!models.ok || clean(model.model_id) !== MODEL_ID || model.can_do_text_to_speech !== true || model.requires_alpha_access === true
    || model.can_use_style !== true || model.can_use_speaker_boost !== true || (maxCharacters > 0 && maxCharacters < 700)) blockers.push("CURRENT_EXACT_NON_BETA_TTS_MODEL_REQUIRED");
  const officialText = official.bytes ? new TextDecoder().decode(official.bytes).toLowerCase().replace(/\s+/g, " ") : "";
  if (!official.ok || !officialText.includes("all paid plans include a commercial license") || !officialText.includes("beta services")) blockers.push("CURRENT_OFFICIAL_COMMERCIAL_RIGHTS_SOURCE_REQUIRED");

  let officialStorageKey: string | null = null, officialReadbackHash: string | null = null, officialReadbackState: "PASS" | "FAIL" = "FAIL";
  if (official.ok && official.bytes && official.hash) {
    officialStorageKey = `factory/assurance/audio-provider-certification/official-rights/${official.hash}.html`;
    try {
      await env.BUCKET.put(officialStorageKey, official.bytes, { httpMetadata: { contentType: "application/json; charset=utf-8" }, customMetadata: { source: ELEVENLABS_OFFICIAL_COMMERCIAL_RIGHTS_URL } });
      const readback = await env.BUCKET.get(officialStorageKey);
      if (readback) officialReadbackHash = await sha256Hex(new Uint8Array(await readback.arrayBuffer()));
      officialReadbackState = officialReadbackHash === official.hash ? "PASS" : "FAIL";
    } catch { officialReadbackState = "FAIL"; }
  }
  if (officialReadbackState !== "PASS") blockers.push("CURRENT_OFFICIAL_RIGHTS_R2_READBACK_FAILED");
  const uniqueBlockers = [...new Set(blockers)].sort();
  const certified = uniqueBlockers.length === 0;
  const historyRow = history.row ?? {};
  const normalizedObservation = {
    provider: "ELEVENLABS", providerVersion: ELEVENLABS_AUDIO_PROVIDER_VERSION,
    subscription: { tier: tier || null, status: subscriptionStatus || null, paid: PAID_TIERS.has(tier) },
    voice: { id: clean(voiceJson.voice_id) || null, name: clean(voiceJson.name) || null, category: clean(voiceJson.category) || null },
    model: { id: clean(model.model_id) || null, canDoTextToSpeech: model.can_do_text_to_speech === true, requiresAlphaAccess: model.requires_alpha_access === true, canUseStyle: model.can_use_style === true, canUseSpeakerBoost: model.can_use_speaker_boost === true, maxCharacters: maxCharacters || null },
    outputFormat: OUTPUT_FORMAT, officialCommercialRightsAssertion: official.ok && officialText.includes("all paid plans include a commercial license") && officialText.includes("beta services"),
    historicalExactArtifactHash: lower(historyRow.historical_artifact_hash) || null, historicalR2ReadbackState: history.bytesState,
  };
  const observationFacts = {
    contractId: clean(contract.id), observedAt, normalizedObservation,
    responseHashes: { subscription: subscription.hash, voice: voice.hash, models: models.hash, officialRights: official.hash, officialRightsReadback: officialReadbackHash },
    historicalEvidence: {
      voiceIdentityReceiptId: clean(historyRow.historical_voice_identity_receipt_id) || null,
      providerReceiptId: clean(historyRow.historical_provider_receipt_id) || null,
      artifactId: clean(historyRow.historical_artifact_id) || null,
      rightsReceiptId: clean(historyRow.historical_rights_receipt_id) || null,
      qaReceiptId: clean(historyRow.historical_qa_receipt_id) || null,
      ownerReceiptId: clean(historyRow.historical_owner_receipt_id) || null,
      eligibilityReceiptId: clean(historyRow.historical_eligibility_receipt_id) || null,
    },
    blockers: uniqueBlockers,
  };
  const observationHash = await canonicalHash({ version: FACTORY_ASSURANCE_AUDIO_PROVIDER_CERTIFICATION_VERSION, observationFacts });
  const runId = deterministicId("factory-assurance-audio-provider-certification-run", requestHash);
  const observationReceiptId = deterministicId("factory-assurance-audio-provider-observation", observationHash);
  let providerId: string | null = null, capabilityId: string | null = null, bindingId: string | null = null;
  let qualificationId: string | null = null, rightsReceiptId: string | null = null, driftReceiptId: string | null = null;
  const statements = [];

  if (certified) {
    const providerHash = await canonicalHash({ provider: "ELEVENLABS", version: ELEVENLABS_AUDIO_PROVIDER_VERSION });
    const capabilityHash = await canonicalHash({ capabilityKey: CONTROLLED_FIXTURE_AUDIO_CAPABILITY_KEY, capabilityVersion: CONTROLLED_FIXTURE_AUDIO_CAPABILITY_VERSION, inputSchemaHash, outputSchemaHash: contract.output_schema_hash });
    providerId = deterministicId("factory-provider-elevenlabs", providerHash);
    capabilityId = deterministicId("factory-capability-controlled-audio", capabilityHash);
    const bindingFacts = { providerId, capabilityId, voiceId: VOICE_ID, modelId: MODEL_ID, outputFormat: OUTPUT_FORMAT, inputSchemaHash, outputSchemaHash: clean(contract.output_schema_hash), settingsHash: clean(contract.settings_hash), providerVoiceSettingsHash: lower(historyRow.identity_settings_hash), rightsPolicyVersion: CONTROLLED_FIXTURE_AUDIO_RIGHTS_POLICY_VERSION, retentionPolicyVersion: CONTROLLED_FIXTURE_AUDIO_RETENTION_POLICY_VERSION };
    const bindingHash = await canonicalHash(bindingFacts);
    bindingId = deterministicId("factory-provider-binding-elevenlabs-audio", bindingHash);
    const qualificationEvidenceHash = await canonicalHash({ standardVersion: CONTROLLED_FIXTURE_AUDIO_QUALITY_STANDARD_VERSION, bindingHash, historicalExactArtifactHash: lower(historyRow.historical_artifact_hash), historicalQaReceiptId: historyRow.historical_qa_receipt_id, historicalOwnerReceiptId: historyRow.historical_owner_receipt_id, observationHash });
    qualificationId = deterministicId("factory-capability-qualification-audio", qualificationEvidenceHash);
    const rightsEvidenceHash = await canonicalHash({ policyVersion: CONTROLLED_FIXTURE_AUDIO_RIGHTS_POLICY_VERSION, bindingHash, historicalRightsReceiptId: historyRow.historical_rights_receipt_id, historicalSubscriptionReceiptId: historyRow.historical_subscription_receipt_id, currentSubscriptionHash: subscription.hash, officialRightsHash: official.hash, officialRightsReadbackHash: officialReadbackHash });
    rightsReceiptId = deterministicId("factory-rights-eligibility-audio", rightsEvidenceHash);
    const driftBaseline = { bindingVersion: ELEVENLABS_AUDIO_BINDING_VERSION, voiceId: VOICE_ID, modelId: MODEL_ID, outputFormat: OUTPUT_FORMAT, providerVoiceSettingsHash: lower(historyRow.identity_settings_hash), inputSchemaHash, outputSchemaHash: clean(contract.output_schema_hash), settingsHash: clean(contract.settings_hash) };
    const driftObserved = { voiceId: clean(voiceJson.voice_id), modelId: clean(model.model_id), paidSubscriptionTier: tier, subscriptionStatus, officialRightsHash: official.hash, historicalR2ReadbackHash: lower(historyRow.historical_artifact_hash) };
    const driftDimensions = [{ dimension: "VOICE_ID", state: "CURRENT" }, { dimension: "MODEL_ID", state: "CURRENT" }, { dimension: "PAID_COMMERCIAL_RIGHTS", state: "CURRENT" }, { dimension: "HISTORICAL_QUALIFICATION_BYTES", state: "CURRENT" }];
    const driftObservationHash = await canonicalHash({ driftBaseline, driftObserved, driftDimensions });
    const observationKey = `factory:audio-provider-drift:${driftObservationHash.slice(0, 40)}`;
    const driftEvidenceHash = await canonicalHash({ bindingId, qualificationId, observationKey, driftObservationHash });
    driftReceiptId = deterministicId("factory-provider-drift-audio", driftEvidenceHash);
    const expiresAt = new Date(Date.parse(observedAt) + VALIDITY_SECONDS * 1000).toISOString();
    const providerMetadata = canonicalStringify({ family: "ELEVENLABS", apiVersion: "V1", currentObservationHash: observationHash, currentSubscriptionTier: tier, currentSubscriptionStatus: subscriptionStatus, officialCommercialRightsSource: ELEVENLABS_OFFICIAL_COMMERCIAL_RIGHTS_URL, providerGenerationRequests: 0 });
    statements.push(
      env.DB.prepare(`INSERT OR IGNORE INTO factory_providers (id,provider_key,provider_version,connection_ref,lifecycle_state,health_state,metadata_json) VALUES (?,'ELEVENLABS',?,'ELEVENLABS_API_KEY','ACTIVE','HEALTHY',?)`).bind(providerId, ELEVENLABS_AUDIO_PROVIDER_VERSION, providerMetadata),
      env.DB.prepare(`INSERT OR IGNORE INTO factory_capabilities (id,capability_key,capability_version,plane,input_schema_hash,output_schema_hash,lifecycle_state) VALUES (?,?,?,'PRODUCTION_MEDIA',?,?,'ACTIVE')`).bind(capabilityId, CONTROLLED_FIXTURE_AUDIO_CAPABILITY_KEY, CONTROLLED_FIXTURE_AUDIO_CAPABILITY_VERSION, inputSchemaHash, contract.output_schema_hash),
      env.DB.prepare(`INSERT OR IGNORE INTO factory_provider_bindings
        (id,provider_id,capability_id,binding_version,endpoint_or_model,model_version,input_schema_hash,output_schema_hash,settings_hash,rights_policy_version,retention_policy_version,rate_card_version,max_payload_bytes,timeout_ms,retry_ceiling,fallback_binding_id,priority,lifecycle_state)
        VALUES (?,?,?,? ,?,?, ?,?,?, ?,?,'ELEVENLABS_ACCOUNT_CREDITS_V1',?,180000,0,NULL,10,'ACTIVE')`).bind(bindingId, providerId, capabilityId, ELEVENLABS_AUDIO_BINDING_VERSION, `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=${OUTPUT_FORMAT}`, MODEL_ID, inputSchemaHash, contract.output_schema_hash, contract.settings_hash, CONTROLLED_FIXTURE_AUDIO_RIGHTS_POLICY_VERSION, CONTROLLED_FIXTURE_AUDIO_RETENTION_POLICY_VERSION, Math.max(4096, number(contract.payload_bytes))),
      env.DB.prepare(`INSERT OR IGNORE INTO factory_capability_qualifications
        (id,binding_id,qualification_version,standard_version,qualified_archetypes_json,settings_hash,sample_size,first_pass_yield,p0_escape_count,evidence_hash,lifecycle_state,qualified_at,expires_at)
        VALUES (?,?,1,?,? ,?,1,1,0,?,'QUALIFIED',?,?)`).bind(qualificationId, bindingId, CONTROLLED_FIXTURE_AUDIO_QUALITY_STANDARD_VERSION, canonicalStringify(["CLEAN_AUDIO_CONTROL"]), contract.settings_hash, qualificationEvidenceHash, observedAt, expiresAt),
      env.DB.prepare(`INSERT OR IGNORE INTO factory_rights_eligibility_receipts
        (id,binding_id,rights_policy_version,retention_policy_version,commercial_use_state,evidence_hash,valid_from,expires_at)
        VALUES (?,?,?,?,'ELIGIBLE',?,?,?)`).bind(rightsReceiptId, bindingId, CONTROLLED_FIXTURE_AUDIO_RIGHTS_POLICY_VERSION, CONTROLLED_FIXTURE_AUDIO_RETENTION_POLICY_VERSION, rightsEvidenceHash, observedAt, expiresAt),
      env.DB.prepare(`INSERT OR IGNORE INTO factory_provider_drift_receipts
        (id,binding_id,qualification_id,observation_key,baseline_json,observed_json,drift_dimensions_json,drift_state,invalidates_qualification,dispatch_authority,observation_hash,evidence_hash,observed_at)
        VALUES (?,?,?,?,?,?,?,'CURRENT',0,0,?,?,?)`).bind(driftReceiptId, bindingId, qualificationId, observationKey, canonicalStringify(driftBaseline), canonicalStringify(driftObserved), canonicalStringify(driftDimensions), driftObservationHash, driftEvidenceHash, observedAt),
    );
  }

  const counts = certified ? 1 : 0;
  const runEvidenceHash = await canonicalHash({ version: FACTORY_ASSURANCE_AUDIO_PROVIDER_CERTIFICATION_VERSION, requestHash, observationHash, certificationState: certified ? "CERTIFIED" : "BLOCKED", providerId, capabilityId, bindingId, qualificationId, rightsReceiptId, driftReceiptId, blockers: uniqueBlockers });
  statements.push(env.DB.prepare(`INSERT INTO factory_assurance_audio_provider_certification_runs
    (id,preflight_run_id,contract_id,idempotency_key,request_hash,policy_version,certification_state,blockers_json,provider_id,capability_id,binding_id,qualification_id,rights_receipt_id,drift_receipt_id,exact_audio_bindings,exact_audio_qualifications,exact_audio_rights_receipts,exact_audio_current_drift_receipts,exact_audio_route_ready_bindings,provider_metadata_reads,public_rights_reads,provider_generation_requests,canonical_work_requests,canonical_route_decisions,canonical_cost_reservations,provider_dispatch_authority,cost_reservation_authority,r22_authority,master_authority,release_authority,publication_authority,spend_micros,observed_at,actor,evidence_hash)
    VALUES (?,?,?,?,?,? ,?,?, ?,?,?,?,?,?, ?,?,?,?,?,3,1,0,0,0,0,0,0,0,0,0,0,0,?,?,?)`).bind(
      runId, contract.preflight_run_id, contract.id, idempotencyKey, requestHash, FACTORY_ASSURANCE_AUDIO_PROVIDER_CERTIFICATION_VERSION,
      certified ? "CERTIFIED" : "BLOCKED", canonicalStringify(uniqueBlockers), providerId, capabilityId, bindingId, qualificationId, rightsReceiptId, driftReceiptId,
      counts, counts, counts, counts, counts, observedAt, actor, runEvidenceHash,
    ));
  statements.push(env.DB.prepare(`INSERT INTO factory_assurance_audio_provider_observation_receipts
    (id,run_id,contract_id,historical_voice_identity_receipt_id,historical_provider_receipt_id,historical_artifact_id,historical_rights_receipt_id,historical_qa_receipt_id,historical_owner_receipt_id,historical_eligibility_receipt_id,historical_artifact_hash,historical_r2_readback_state,subscription_tier,subscription_status,subscription_response_hash,voice_id,voice_name,voice_response_hash,model_id,model_response_hash,official_rights_source_url,official_rights_http_status,official_rights_response_hash,official_rights_storage_key,official_rights_readback_hash,official_rights_readback_state,normalized_observation_json,observation_state,blockers_json,provider_metadata_reads,public_rights_reads,provider_generation_requests,spend_micros,observed_at,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,3,1,0,0,?,?)`).bind(
      observationReceiptId, runId, contract.id, clean(historyRow.historical_voice_identity_receipt_id) || null, clean(historyRow.historical_provider_receipt_id) || null,
      clean(historyRow.historical_artifact_id) || null, clean(historyRow.historical_rights_receipt_id) || null, clean(historyRow.historical_qa_receipt_id) || null,
      clean(historyRow.historical_owner_receipt_id) || null, clean(historyRow.historical_eligibility_receipt_id) || null, lower(historyRow.historical_artifact_hash) || null,
      history.bytesState, tier || null, subscriptionStatus || null, subscription.hash, clean(voiceJson.voice_id) || null, clean(voiceJson.name) || null, voice.hash,
      clean(model.model_id) || null, models.hash, ELEVENLABS_OFFICIAL_COMMERCIAL_RIGHTS_URL, official.status, official.hash, officialStorageKey, officialReadbackHash,
      officialReadbackState, canonicalStringify(normalizedObservation), certified ? "PASS" : "FAIL", canonicalStringify(uniqueBlockers), observedAt, observationHash,
    ));
  await env.DB.batch(statements);
  const recorded = await first(env.DB, "SELECT * FROM factory_assurance_audio_provider_certification_runs WHERE id=?", runId);
  if (!recorded) throw new FactoryRuntimeError("ASSURANCE_AUDIO_PROVIDER_CERTIFICATION_WRITE_FAILED", 503, "The certification receipt could not be reconciled after write");
  return resultFrom(recorded, "RECORDED");
}
