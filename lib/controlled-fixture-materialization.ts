import { canonicalHash, sha256Hex } from "@/lib/canonical-json";

export const CONTROLLED_FIXTURE_MATERIALIZATION_VERSION = "CONTROLLED_FIXTURE_MATERIALIZATION_V1" as const;
export const CLEAN_AUDIO_CONTROL_BLUEPRINT_KEY = "CLEAN_AUDIO_NEGATIVE" as const;
export const CLEAN_AUDIO_CONTROL_MAXIMUM_CHARACTERS = 700 as const;
export const CLEAN_AUDIO_CONTROL_MAXIMUM_PROVIDER_REQUESTS = 2 as const;
export const CLEAN_AUDIO_CONTROL_RESERVED_SPEND_USD = 0.08 as const;

const CHANNEL_ID = "channel-hidden-systems";
const VOICE_IDENTITY_RECEIPT_ID = "fixture-voice-identity:hidden-systems:v1";
const NARRATION = [
  "A card purchase moves through distinct operational states.",
  "Authorization asks whether the account and available balance permit the transaction at that moment; it is not final movement of money.",
  "Clearing follows when transaction records and obligations are exchanged and reconciled between participating institutions.",
  "Settlement is the later transfer that discharges those obligations.",
  "A hold, a cleared record, and settled funds therefore describe different states and should never be treated as one event.",
  "This explanation is educational and does not provide personalized financial advice.",
].join(" ");

type Row = Record<string, unknown>;
type RunResult = { meta?: { changes?: number } };
type Statement = { bind(...values: unknown[]): Statement; all<T = Row>(): Promise<{ results?: T[] }>; first<T = Row>(): Promise<T | null>; run(): Promise<RunResult> };
export type FixtureMaterializationDB = { prepare(query: string): Statement };
type StoredObject = { arrayBuffer(): Promise<ArrayBuffer>; size?: number; customMetadata?: Record<string, string> };
export type FixtureMaterializationBucket = {
  put(key: string, value: Uint8Array, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }): Promise<unknown>;
  get(key: string): Promise<StoredObject | null>;
};
export type FixtureMaterializationEnv = { DB: FixtureMaterializationDB; BUCKET: FixtureMaterializationBucket; ELEVENLABS_API_KEY: string };

export class FixtureMaterializationError extends Error {
  constructor(public code: string, public status: number, message: string) { super(message); }
}

const clean = (value: unknown) => String(value ?? "").trim();
const count = (value: unknown) => Number(value ?? 0);
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const now = () => new Date().toISOString();
async function first(db: FixtureMaterializationDB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values).first<Row>(); }
async function run(db: FixtureMaterializationDB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values.map((value) => value === undefined ? null : value)).run(); }

export async function controlledFixtureMaterializationSnapshot(db: FixtureMaterializationDB) {
  const [policy, identity, latestRun, artifact] = await Promise.all([
    first(db, `SELECT lifecycle_state,maximum_materialized_fixtures,maximum_provider_requests,maximum_tts_requests,maximum_tts_characters,reserved_spend_ceiling_usd,clean_parent_first,commercial_rights_receipt_required,owner_ground_truth_required,rights_pass_authority,dataset_sealing_authority,assurance_qualification_authority,release_authority
      FROM v7_evaluation_fixture_materialization_policies WHERE channel_id=? AND policy_version=? LIMIT 1`, CHANNEL_ID, CONTROLLED_FIXTURE_MATERIALIZATION_VERSION),
    first(db, `SELECT identity_scope,provider_family,voice_id,voice_name,model_id,output_format,settings_hash,production_inheritance_authority
      FROM v7_evaluation_fixture_voice_identity_receipts WHERE channel_id=? AND policy_version=? LIMIT 1`, CHANNEL_ID, CONTROLLED_FIXTURE_MATERIALIZATION_VERSION),
    first(db, `SELECT id,lifecycle_state,tts_characters,provider_requests,tts_requests,reserved_spend_usd,spend_accounting_state,error_code,created_at,completed_at
      FROM v7_evaluation_fixture_materialization_runs WHERE channel_id=? AND policy_version=? ORDER BY created_at DESC,id DESC LIMIT 1`, CHANNEL_ID, CONTROLLED_FIXTURE_MATERIALIZATION_VERSION),
    first(db, `SELECT a.id,a.storage_key,a.mime_type,a.byte_size,a.sha256,a.materialization_state,a.rights_state,a.owner_ground_truth_state,a.dataset_eligible,a.qualification_eligible,a.release_eligible,
        r.provider_native_request_id,r.subscription_tier,r.subscription_status,r.r2_readback_verified,r.created_at
      FROM v7_evaluation_materialized_fixture_artifacts a
      JOIN v7_evaluation_fixture_provider_binding_receipts r ON r.id=a.provider_binding_receipt_id
      WHERE a.channel_id=? ORDER BY a.created_at DESC,a.id DESC LIMIT 1`, CHANNEL_ID),
  ]);
  return {
    policy: policy ? {
      lifecycleState: clean(policy.lifecycle_state), maximumMaterializedFixtures: count(policy.maximum_materialized_fixtures), maximumProviderRequests: count(policy.maximum_provider_requests), maximumTtsRequests: count(policy.maximum_tts_requests), maximumTtsCharacters: count(policy.maximum_tts_characters), reservedSpendCeilingUsd: count(policy.reserved_spend_ceiling_usd), cleanParentFirst: Boolean(count(policy.clean_parent_first)), commercialRightsReceiptRequired: Boolean(count(policy.commercial_rights_receipt_required)), ownerGroundTruthRequired: Boolean(count(policy.owner_ground_truth_required)), rightsPassAuthority: Boolean(count(policy.rights_pass_authority)), datasetSealingAuthority: Boolean(count(policy.dataset_sealing_authority)), assuranceQualificationAuthority: Boolean(count(policy.assurance_qualification_authority)), releaseAuthority: Boolean(count(policy.release_authority)),
    } : null,
    identity: identity ? {
      scope: clean(identity.identity_scope), provider: clean(identity.provider_family), voiceId: clean(identity.voice_id), voiceName: clean(identity.voice_name), modelId: clean(identity.model_id), outputFormat: clean(identity.output_format), settingsHash: clean(identity.settings_hash), productionInheritanceAuthority: Boolean(count(identity.production_inheritance_authority)),
    } : null,
    latestRun: latestRun ? {
      id: clean(latestRun.id), lifecycleState: clean(latestRun.lifecycle_state), ttsCharacters: count(latestRun.tts_characters), providerRequests: count(latestRun.provider_requests), ttsRequests: count(latestRun.tts_requests), reservedSpendUsd: count(latestRun.reserved_spend_usd), spendAccountingState: clean(latestRun.spend_accounting_state), errorCode: clean(latestRun.error_code) || null, createdAt: clean(latestRun.created_at), completedAt: clean(latestRun.completed_at) || null,
    } : null,
    artifact: artifact ? {
      id: clean(artifact.id), storageKey: clean(artifact.storage_key), mimeType: clean(artifact.mime_type), byteSize: count(artifact.byte_size), sha256: clean(artifact.sha256), materializationState: clean(artifact.materialization_state), rightsState: clean(artifact.rights_state), ownerGroundTruthState: clean(artifact.owner_ground_truth_state), datasetEligible: Boolean(count(artifact.dataset_eligible)), qualificationEligible: Boolean(count(artifact.qualification_eligible)), releaseEligible: Boolean(count(artifact.release_eligible)), providerNativeRequestIdCaptured: Boolean(clean(artifact.provider_native_request_id)), subscriptionTier: clean(artifact.subscription_tier), subscriptionStatus: clean(artifact.subscription_status), r2ReadbackVerified: Boolean(count(artifact.r2_readback_verified)), createdAt: clean(artifact.created_at),
    } : null,
  };
}

export async function materializeCleanAudioControlAuthorized(env: FixtureMaterializationEnv, actor: string, idempotencyKey: string) {
  if (!/^[A-Za-z0-9._:-]{16,160}$/.test(idempotencyKey)) throw new FixtureMaterializationError("IDEMPOTENCY_KEY_INVALID", 400, "A stable 16–160 character idempotency-key is required");
  const prior = await first(env.DB, "SELECT id,lifecycle_state,intent_hash FROM v7_evaluation_fixture_materialization_runs WHERE channel_id=? AND idempotency_key=? LIMIT 1", CHANNEL_ID, idempotencyKey);
  if (prior) {
    if (clean(prior.lifecycle_state) === "COMPLETE") return { outcome: "REPLAYED", snapshot: await controlledFixtureMaterializationSnapshot(env.DB) };
    throw new FixtureMaterializationError("FIXTURE_MATERIALIZATION_ALREADY_ATTEMPTED", 409, `The immutable materialization attempt is ${clean(prior.lifecycle_state)}`);
  }
  const [closure, policy, blueprint, identity, existingArtifact] = await Promise.all([
    first(env.DB, "SELECT conclusion FROM v7_evaluation_historical_recovery_closures WHERE channel_id=? AND policy_version='EVALUATION_HISTORICAL_RECOVERY_CLOSURE_V1' LIMIT 1", CHANNEL_ID),
    first(env.DB, "SELECT * FROM v7_evaluation_fixture_materialization_policies WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, CONTROLLED_FIXTURE_MATERIALIZATION_VERSION),
    first(env.DB, "SELECT * FROM v7_evaluation_controlled_fixture_blueprints WHERE blueprint_key=? AND fixture_role='CLEAN_NEGATIVE' AND candidate_kind='AUDIO' LIMIT 1", CLEAN_AUDIO_CONTROL_BLUEPRINT_KEY),
    first(env.DB, "SELECT * FROM v7_evaluation_fixture_voice_identity_receipts WHERE id=? AND channel_id=? LIMIT 1", VOICE_IDENTITY_RECEIPT_ID, CHANNEL_ID),
    first(env.DB, "SELECT id FROM v7_evaluation_materialized_fixture_artifacts WHERE channel_id=? LIMIT 1", CHANNEL_ID),
  ]);
  if (clean(closure?.conclusion) !== "NO_EXACT_PROVIDER_AUDIO_FOUND") throw new FixtureMaterializationError("HISTORICAL_RECOVERY_CLOSURE_REQUIRED", 409, "The terminal historical recovery closure must exist before a replacement fixture is created");
  if (!policy || clean(policy.lifecycle_state) !== "CLEAN_PARENT_AUDIO_ENABLED") throw new FixtureMaterializationError("FIXTURE_MATERIALIZATION_POLICY_REQUIRED", 409, "The clean-parent materialization policy is not active");
  if (!blueprint || !identity) throw new FixtureMaterializationError("FIXTURE_MATERIALIZATION_CONTRACT_REQUIRED", 409, "The clean-audio blueprint and pinned fixture voice identity are required");
  if (existingArtifact) throw new FixtureMaterializationError("FIXTURE_MATERIALIZATION_CEILING_REACHED", 409, "The one-fixture materialization ceiling has already been reached");
  if (NARRATION.length > CLEAN_AUDIO_CONTROL_MAXIMUM_CHARACTERS) throw new FixtureMaterializationError("FIXTURE_NARRATION_CEILING_EXCEEDED", 500, "The sealed clean narration exceeds its character ceiling");

  const voiceSettings = JSON.parse(clean(identity.settings_json)) as Record<string, unknown>;
  if (await canonicalHash(voiceSettings) !== clean(identity.settings_hash)) throw new FixtureMaterializationError("FIXTURE_VOICE_SETTINGS_HASH_MISMATCH", 409, "The pinned fixture voice settings no longer match their sealed hash");
  const narrationHash = await sha256Hex(NARRATION);
  const requestBody = { text: NARRATION, model_id: clean(identity.model_id), voice_settings: voiceSettings };
  const intent = { policyVersion: CONTROLLED_FIXTURE_MATERIALIZATION_VERSION, blueprintId: clean(blueprint.id), voiceIdentityReceiptId: clean(identity.id), narrationHash, requestBody };
  const intentHash = await canonicalHash(intent), runId = id("fixture-materialization-run"), completedAt = () => now();
  await run(env.DB, `INSERT INTO v7_evaluation_fixture_materialization_runs
    (id,channel_id,policy_version,blueprint_id,voice_identity_receipt_id,idempotency_key,intent_hash,lifecycle_state,planned_fixtures,tts_characters,reserved_spend_usd,spend_accounting_state,actor)
    VALUES (?,?,?,?,?,?,?,'PLANNED',1,?,0.08,'RESERVED_CEILING_PROVIDER_METER_PENDING',?)`, runId, CHANNEL_ID, CONTROLLED_FIXTURE_MATERIALIZATION_VERSION, blueprint.id, identity.id, idempotencyKey, intentHash, NARRATION.length, actor);
  try {
    await run(env.DB, "UPDATE v7_evaluation_fixture_materialization_runs SET lifecycle_state='RUNNING' WHERE id=?", runId);
    const headers = { "xi-api-key": env.ELEVENLABS_API_KEY };
    const subscriptionResponse = await fetch("https://api.elevenlabs.io/v1/user/subscription", { headers, signal: AbortSignal.timeout(30_000) });
    await run(env.DB, "UPDATE v7_evaluation_fixture_materialization_runs SET provider_requests=1 WHERE id=?", runId);
    if (!subscriptionResponse.ok) throw new FixtureMaterializationError("ELEVENLABS_SUBSCRIPTION_CHECK_FAILED", 502, `ElevenLabs subscription check failed (${subscriptionResponse.status})`);
    const subscription = await subscriptionResponse.json() as Record<string, unknown>, tier = clean(subscription.tier).toLowerCase(), status = clean(subscription.status).toLowerCase();
    if (!tier || tier === "free" || status !== "active") throw new FixtureMaterializationError("ELEVENLABS_ACTIVE_PAID_PLAN_REQUIRED", 409, "A currently active non-free ElevenLabs plan is required for new fixture synthesis");
    const subscriptionResponseHash = await canonicalHash(subscription), subscriptionObservedAt = now();
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(clean(identity.voice_id))}?output_format=${encodeURIComponent(clean(identity.output_format))}`, {
      method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(requestBody), signal: AbortSignal.timeout(180_000),
    });
    await run(env.DB, "UPDATE v7_evaluation_fixture_materialization_runs SET provider_requests=2,tts_requests=1 WHERE id=?", runId);
    if (!response.ok) throw new FixtureMaterializationError("ELEVENLABS_CLEAN_CONTROL_TTS_FAILED", 502, `ElevenLabs clean-control synthesis failed (${response.status})`);
    const providerNativeRequestId = clean(response.headers.get("request-id") || response.headers.get("x-request-id"));
    if (!providerNativeRequestId) throw new FixtureMaterializationError("ELEVENLABS_REQUEST_ID_MISSING", 502, "ElevenLabs returned audio without a provider-native request ID");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength <= 10_000 || bytes.byteLength > 10_000_000) throw new FixtureMaterializationError("ELEVENLABS_AUDIO_BYTES_INVALID", 502, "ElevenLabs returned audio outside the bounded fixture byte range");
    const exactResponseHash = await sha256Hex(bytes), storageKey = `evaluation/controlled-fixtures/v1/clean-audio/${exactResponseHash}.mp3`;
    await env.BUCKET.put(storageKey, bytes, { httpMetadata: { contentType: "audio/mpeg" }, customMetadata: { sha256: exactResponseHash, policyVersion: CONTROLLED_FIXTURE_MATERIALIZATION_VERSION, blueprintId: clean(blueprint.id), runId } });
    const stored = await env.BUCKET.get(storageKey); if (!stored) throw new FixtureMaterializationError("FIXTURE_R2_READBACK_FAILED", 503, "The stored clean-control audio could not be read back");
    const readbackBytes = new Uint8Array(await stored.arrayBuffer()), readbackHash = await sha256Hex(readbackBytes);
    if (readbackHash !== exactResponseHash || readbackBytes.byteLength !== bytes.byteLength) throw new FixtureMaterializationError("FIXTURE_R2_READBACK_HASH_MISMATCH", 503, "The clean-control R2 bytes do not match the exact provider response");
    const providerReceiptId = id("fixture-provider-binding"), artifactId = id("materialized-fixture");
    const evidenceFacts = { policyVersion: CONTROLLED_FIXTURE_MATERIALIZATION_VERSION, runId, blueprintId: clean(blueprint.id), providerNativeRequestId, exactResponseHash, responseByteSize: bytes.byteLength, subscriptionResponseHash, subscriptionObservedAt, tier, status, voiceId: clean(identity.voice_id), modelId: clean(identity.model_id), settingsHash: clean(identity.settings_hash), storageKey, readbackHash, rightsState: "PROVIDER_TERMS_RECEIPT_REQUIRED" };
    const evidenceHash = await canonicalHash(evidenceFacts);
    await run(env.DB, `INSERT INTO v7_evaluation_fixture_provider_binding_receipts
      (id,channel_id,run_id,provider_family,operation,provider_native_request_id,exact_response_hash,response_byte_size,subscription_tier,subscription_status,subscription_response_hash,subscription_observed_at,voice_id,model_id,settings_hash,r2_storage_key,r2_readback_hash,r2_readback_verified,rights_state,evidence_hash)
      VALUES (?,?,?,'ELEVENLABS','CLEAN_AUDIO_CONTROL_TTS',?,?,?,?,?,?,?,?,?,?,?,?,1,'PROVIDER_TERMS_RECEIPT_REQUIRED',?)`, providerReceiptId, CHANNEL_ID, runId, providerNativeRequestId, exactResponseHash, bytes.byteLength, tier, status, subscriptionResponseHash, subscriptionObservedAt, identity.voice_id, identity.model_id, identity.settings_hash, storageKey, readbackHash, evidenceHash);
    await run(env.DB, `INSERT INTO v7_evaluation_materialized_fixture_artifacts
      (id,channel_id,run_id,blueprint_id,provider_binding_receipt_id,fixture_role,candidate_kind,artifact_type,storage_key,mime_type,byte_size,sha256,materialization_state,rights_state,owner_ground_truth_state)
      VALUES (?,?,?,?,?,'CLEAN_NEGATIVE','AUDIO','CLEAN_AUDIO_CONTROL',?,'audio/mpeg',?,?,'BYTES_AND_PROVIDER_BINDING_VERIFIED_RIGHTS_REVIEW_REQUIRED','PROVIDER_TERMS_RECEIPT_REQUIRED','NOT_EVALUATED')`, artifactId, CHANNEL_ID, runId, blueprint.id, providerReceiptId, storageKey, bytes.byteLength, exactResponseHash);
    await run(env.DB, "UPDATE v7_evaluation_fixture_materialization_runs SET lifecycle_state='COMPLETE',completed_at=? WHERE id=?", completedAt(), runId);
    return { outcome: "RECORDED", snapshot: await controlledFixtureMaterializationSnapshot(env.DB) };
  } catch (error) {
    const known = error instanceof FixtureMaterializationError ? error : new FixtureMaterializationError("UNEXPECTED_FIXTURE_MATERIALIZATION_FAILURE", 500, "Unexpected clean-control materialization failure");
    await run(env.DB, "UPDATE v7_evaluation_fixture_materialization_runs SET lifecycle_state='FAILED',error_code=?,completed_at=? WHERE id=?", known.code, completedAt(), runId).catch(() => undefined);
    throw known;
  }
}
