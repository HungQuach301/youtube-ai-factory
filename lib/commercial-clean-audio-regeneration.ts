import { canonicalHash, sha256Hex } from "@/lib/canonical-json";
import { CLEAN_AUDIO_CONTROL_NARRATION, cleanAudioControlNarrationHash } from "@/lib/controlled-fixture-materialization";
import { ELEVENLABS_COMMERCIAL_ENTITLEMENT_VERSION, evaluateElevenLabsCommercialEntitlement } from "@/lib/elevenlabs-commercial-entitlement";

export const COMMERCIAL_CLEAN_AUDIO_REGENERATION_VERSION = "COMMERCIAL_CLEAN_AUDIO_REGENERATION_V1" as const;
export const FACTORY_AUDIO_QA_POLICY_VERSION = "FACTORY_AUDIO_QA_POLICY_V1" as const;
export const FACTORY_AUDIO_QA_MODEL = "gpt-audio-1.5" as const;
export const COMMERCIAL_CLEAN_AUDIO_MAXIMUM_CHARACTERS = 700 as const;
export const COMMERCIAL_CLEAN_AUDIO_RESERVED_SPEND_USD = 0.08 as const;
export const FACTORY_AUDIO_QA_RESERVED_SPEND_USD = 0.20 as const;

const CHANNEL_ID = "channel-hidden-systems";
const VOICE_IDENTITY_RECEIPT_ID = "fixture-voice-identity:hidden-systems:v1";
const QA_DIMENSIONS = ["voiceNaturalness", "pronunciation", "pacingProsody", "audioContinuity", "noiseArtifacts", "listenerFatigue", "semanticDelivery"] as const;

type Row = Record<string, unknown>;
type RunResult = { meta?: { changes?: number } };
type Statement = { bind(...values: unknown[]): Statement; first<T = Row>(): Promise<T | null>; run(): Promise<RunResult> };
export type CommercialCleanAudioDB = { prepare(query: string): Statement };
type StoredObject = { arrayBuffer(): Promise<ArrayBuffer> };
export type CommercialCleanAudioBucket = {
  put(key: string, value: Uint8Array, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }): Promise<unknown>;
  get(key: string): Promise<StoredObject | null>;
};
export type CommercialCleanAudioEnv = { DB: CommercialCleanAudioDB; BUCKET: CommercialCleanAudioBucket; ELEVENLABS_API_KEY: string; OPENAI_API_KEY?: string };

export class CommercialCleanAudioError extends Error {
  constructor(public code: string, public status: number, message: string) { super(message); }
}

const clean = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const now = () => new Date().toISOString();
const json = (value: unknown) => JSON.stringify(value);
async function first(db: CommercialCleanAudioDB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values).first<Row>(); }
async function run(db: CommercialCleanAudioDB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values.map((value) => value === undefined ? null : value)).run(); }
function base64(bytes: Uint8Array) { let binary = ""; for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length))); return btoa(binary); }
function parseJsonObject(value: unknown) {
  const text = clean(value).replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { const parsed = JSON.parse(text); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Row : null; }
  catch { return null; }
}

export async function commercialCleanAudioSnapshot(db: CommercialCleanAudioDB) {
  const [policy, latestRun, artifact, rights, qaPolicy, qaRun, qa] = await Promise.all([
    first(db, "SELECT * FROM v7_evaluation_commercial_clean_audio_policies WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, COMMERCIAL_CLEAN_AUDIO_REGENERATION_VERSION),
    first(db, "SELECT * FROM v7_evaluation_commercial_clean_audio_runs WHERE channel_id=? AND policy_version=? ORDER BY created_at DESC,id DESC LIMIT 1", CHANNEL_ID, COMMERCIAL_CLEAN_AUDIO_REGENERATION_VERSION),
    first(db, `SELECT a.*,p.provider_native_request_id,s.subscription_tier,s.subscription_status,s.entitlement_state,s.r2_readback_verified subscription_r2_verified
      FROM v7_evaluation_commercial_clean_audio_artifacts a
      JOIN v7_evaluation_commercial_clean_audio_provider_receipts p ON p.id=a.provider_receipt_id
      JOIN v7_evaluation_commercial_subscription_receipts s ON s.id=p.subscription_receipt_id
      WHERE a.channel_id=? AND a.policy_version=? LIMIT 1`, CHANNEL_ID, COMMERCIAL_CLEAN_AUDIO_REGENERATION_VERSION),
    first(db, "SELECT * FROM v7_evaluation_commercial_clean_audio_rights_receipts WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, COMMERCIAL_CLEAN_AUDIO_REGENERATION_VERSION),
    first(db, "SELECT * FROM v7_evaluation_factory_audio_qa_policies WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, FACTORY_AUDIO_QA_POLICY_VERSION),
    first(db, "SELECT * FROM v7_evaluation_factory_audio_qa_runs WHERE channel_id=? AND policy_version=? ORDER BY created_at DESC,id DESC LIMIT 1", CHANNEL_ID, FACTORY_AUDIO_QA_POLICY_VERSION),
    first(db, "SELECT * FROM v7_evaluation_factory_audio_qa_receipts WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, FACTORY_AUDIO_QA_POLICY_VERSION),
  ]);
  return {
    policy: policy ? { maximumReplacementFixtures: number(policy.maximum_replacement_fixtures), maximumSubscriptionReads: number(policy.maximum_subscription_reads), maximumTtsRequests: number(policy.maximum_tts_requests), maximumTtsCharacters: number(policy.maximum_tts_characters), reservedSpendCeilingUsd: number(policy.reserved_spend_ceiling_usd), entitlementPolicyVersion: clean(policy.entitlement_policy_version) } : null,
    latestRun: latestRun ? { lifecycleState: clean(latestRun.lifecycle_state), subscriptionReads: number(latestRun.subscription_reads), ttsRequests: number(latestRun.tts_requests), errorCode: clean(latestRun.error_code) || null, createdAt: clean(latestRun.created_at), completedAt: clean(latestRun.completed_at) || null } : null,
    artifact: artifact ? { id: clean(artifact.id), storageKey: clean(artifact.storage_key), mimeType: clean(artifact.mime_type), byteSize: number(artifact.byte_size), sha256: clean(artifact.sha256), materializationState: clean(artifact.materialization_state), rightsState: clean(artifact.rights_state), ownerGroundTruthState: clean(artifact.owner_ground_truth_state), providerNativeRequestIdCaptured: Boolean(clean(artifact.provider_native_request_id)), subscriptionTier: clean(artifact.subscription_tier), subscriptionStatus: clean(artifact.subscription_status), entitlementState: clean(artifact.entitlement_state), subscriptionR2ReadbackVerified: Boolean(number(artifact.subscription_r2_verified)), createdAt: clean(artifact.created_at) } : null,
    rights: rights ? { state: clean(rights.rights_state), outcome: clean(rights.adjudication_outcome), jurisdictionScope: clean(rights.jurisdiction_scope), evidenceHash: clean(rights.evidence_hash), createdAt: clean(rights.created_at) } : null,
    qaPolicy: qaPolicy ? { modelId: clean(qaPolicy.model_id), maximumProviderRequests: number(qaPolicy.maximum_provider_requests), reservedSpendCeilingUsd: number(qaPolicy.reserved_spend_ceiling_usd), overallFloor: number(qaPolicy.overall_floor), dimensionFloor: number(qaPolicy.dimension_floor), ownerGroundTruthRequired: Boolean(number(qaPolicy.owner_ground_truth_required)) } : null,
    qaRun: qaRun ? { lifecycleState: clean(qaRun.lifecycle_state), providerRequests: number(qaRun.provider_requests), actualSpendUsd: number(qaRun.actual_spend_usd), errorCode: clean(qaRun.error_code) || null, createdAt: clean(qaRun.created_at), completedAt: clean(qaRun.completed_at) || null } : null,
    qa: qa ? { decisionState: clean(qa.decision_state), ownerAttentionState: clean(qa.owner_attention_state), overallScore: number(qa.overall_score), dimensions: parseJsonObject(qa.dimensions_json) ?? {}, p0Count: number(qa.p0_count), p1Count: number(qa.p1_count), findings: (() => { try { return JSON.parse(clean(qa.findings_json)); } catch { return []; } })(), rationale: clean(qa.rationale), actualSpendUsd: number(qa.actual_spend_usd), evidenceHash: clean(qa.evidence_hash), createdAt: clean(qa.created_at) } : null,
  };
}

export async function regenerateCommercialCleanAudioAuthorized(env: CommercialCleanAudioEnv, actor: string, idempotencyKey: string) {
  if (!/^[A-Za-z0-9._:-]{16,160}$/.test(idempotencyKey)) throw new CommercialCleanAudioError("IDEMPOTENCY_KEY_INVALID", 400, "A stable 16–160 character idempotency-key is required");
  const prior = await first(env.DB, "SELECT lifecycle_state FROM v7_evaluation_commercial_clean_audio_runs WHERE channel_id=? AND idempotency_key=? LIMIT 1", CHANNEL_ID, idempotencyKey);
  if (prior) {
    if (clean(prior.lifecycle_state) === "COMPLETE") return { outcome: "REPLAYED", snapshot: await commercialCleanAudioSnapshot(env.DB) };
    throw new CommercialCleanAudioError("COMMERCIAL_CLEAN_AUDIO_ALREADY_ATTEMPTED", 409, `The immutable regeneration attempt is ${clean(prior.lifecycle_state)}`);
  }
  const [policy, anyAttempt, existingReplacement, replacedArtifact, blueprint, identity, terms] = await Promise.all([
    first(env.DB, "SELECT * FROM v7_evaluation_commercial_clean_audio_policies WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, COMMERCIAL_CLEAN_AUDIO_REGENERATION_VERSION),
    first(env.DB, "SELECT id FROM v7_evaluation_commercial_clean_audio_runs WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, COMMERCIAL_CLEAN_AUDIO_REGENERATION_VERSION),
    first(env.DB, "SELECT id FROM v7_evaluation_commercial_clean_audio_artifacts WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, COMMERCIAL_CLEAN_AUDIO_REGENERATION_VERSION),
    first(env.DB, "SELECT id FROM v7_evaluation_materialized_fixture_artifacts WHERE channel_id=? AND fixture_role='CLEAN_NEGATIVE' AND candidate_kind='AUDIO' ORDER BY created_at DESC,id DESC LIMIT 1", CHANNEL_ID),
    first(env.DB, "SELECT * FROM v7_evaluation_controlled_fixture_blueprints WHERE blueprint_key='CLEAN_AUDIO_NEGATIVE' AND fixture_role='CLEAN_NEGATIVE' AND candidate_kind='AUDIO' LIMIT 1"),
    first(env.DB, "SELECT * FROM v7_evaluation_fixture_voice_identity_receipts WHERE id=? AND channel_id=? LIMIT 1", VOICE_IDENTITY_RECEIPT_ID, CHANNEL_ID),
    first(env.DB, `SELECT * FROM v7_evaluation_official_terms_snapshot_receipts
      WHERE channel_id=? AND source_key='TERMS_OF_USE' AND retrieval_state='PASS' AND r2_readback_verified=1
      ORDER BY retrieved_at DESC,id DESC LIMIT 1`, CHANNEL_ID),
  ]);
  if (!policy || !replacedArtifact || !blueprint || !identity || !terms) throw new CommercialCleanAudioError("COMMERCIAL_CLEAN_AUDIO_PREREQUISITES_MISSING", 409, "The replacement policy, prior artifact, blueprint, voice identity and verified Terms snapshot are required");
  if (anyAttempt || existingReplacement) throw new CommercialCleanAudioError("COMMERCIAL_CLEAN_AUDIO_REPLACEMENT_CEILING_REACHED", 409, "The one-attempt replacement ceiling has already been reached");
  if (CLEAN_AUDIO_CONTROL_NARRATION.length > COMMERCIAL_CLEAN_AUDIO_MAXIMUM_CHARACTERS) throw new CommercialCleanAudioError("COMMERCIAL_CLEAN_AUDIO_TEXT_CEILING_EXCEEDED", 500, "The sealed clean narration exceeds its character ceiling");
  const voiceSettings = JSON.parse(clean(identity.settings_json)) as Row;
  if (await canonicalHash(voiceSettings) !== clean(identity.settings_hash)) throw new CommercialCleanAudioError("COMMERCIAL_CLEAN_AUDIO_SETTINGS_HASH_MISMATCH", 409, "The pinned fixture voice settings no longer match their sealed hash");
  const narrationHash = await cleanAudioControlNarrationHash();
  const requestBody = { text: CLEAN_AUDIO_CONTROL_NARRATION, model_id: clean(identity.model_id), voice_settings: voiceSettings };
  const intentHash = await canonicalHash({ policyVersion: COMMERCIAL_CLEAN_AUDIO_REGENERATION_VERSION, entitlementPolicyVersion: ELEVENLABS_COMMERCIAL_ENTITLEMENT_VERSION, blueprintId: blueprint.id, replacesArtifactId: replacedArtifact.id, termsReceiptId: terms.id, narrationHash, requestBody });
  const runId = id("commercial-clean-audio-run");
  await run(env.DB, `INSERT INTO v7_evaluation_commercial_clean_audio_runs
    (id,channel_id,policy_version,idempotency_key,intent_hash,lifecycle_state,tts_characters,reserved_spend_usd,actor)
    VALUES (?,?,?,?,?,'PLANNED',?,0.08,?)`, runId, CHANNEL_ID, COMMERCIAL_CLEAN_AUDIO_REGENERATION_VERSION, idempotencyKey, intentHash, CLEAN_AUDIO_CONTROL_NARRATION.length, actor);
  try {
    await run(env.DB, "UPDATE v7_evaluation_commercial_clean_audio_runs SET lifecycle_state='RUNNING' WHERE id=?", runId);
    const headers = { "xi-api-key": env.ELEVENLABS_API_KEY };
    const subscriptionResponse = await fetch("https://api.elevenlabs.io/v1/user/subscription", { headers, signal: AbortSignal.timeout(30_000) });
    await run(env.DB, "UPDATE v7_evaluation_commercial_clean_audio_runs SET subscription_reads=1 WHERE id=?", runId);
    if (!subscriptionResponse.ok) throw new CommercialCleanAudioError("ELEVENLABS_SUBSCRIPTION_CHECK_FAILED", 502, `ElevenLabs subscription check failed (${subscriptionResponse.status})`);
    const subscriptionText = await subscriptionResponse.text();
    if (!subscriptionText || subscriptionText.length > 1_000_000) throw new CommercialCleanAudioError("ELEVENLABS_SUBSCRIPTION_RESPONSE_INVALID", 502, "ElevenLabs returned an invalid subscription snapshot");
    const subscription = parseJsonObject(subscriptionText);
    if (!subscription) throw new CommercialCleanAudioError("ELEVENLABS_SUBSCRIPTION_RESPONSE_INVALID", 502, "ElevenLabs returned a non-JSON subscription snapshot");
    const entitlement = evaluateElevenLabsCommercialEntitlement(subscription);
    if (!entitlement.commercialUseEligible) throw new CommercialCleanAudioError("ELEVENLABS_ACTIVE_PAID_PLAN_REQUIRED", 409, `An explicit active paid ElevenLabs base plan is required (${entitlement.state})`);
    const subscriptionBytes = new TextEncoder().encode(subscriptionText), subscriptionHash = await sha256Hex(subscriptionBytes), observedAt = now();
    const subscriptionKey = `evaluation/controlled-fixtures/v2/subscription/${subscriptionHash}.json`;
    await env.BUCKET.put(subscriptionKey, subscriptionBytes, { httpMetadata: { contentType: "application/json" }, customMetadata: { sha256: subscriptionHash, policyVersion: COMMERCIAL_CLEAN_AUDIO_REGENERATION_VERSION, runId } });
    const storedSubscription = await env.BUCKET.get(subscriptionKey); if (!storedSubscription) throw new CommercialCleanAudioError("COMMERCIAL_SUBSCRIPTION_R2_READBACK_FAILED", 503, "The subscription snapshot could not be read back");
    const subscriptionReadback = new Uint8Array(await storedSubscription.arrayBuffer()), subscriptionReadbackHash = await sha256Hex(subscriptionReadback);
    if (subscriptionReadbackHash !== subscriptionHash || subscriptionReadback.byteLength !== subscriptionBytes.byteLength) throw new CommercialCleanAudioError("COMMERCIAL_SUBSCRIPTION_R2_HASH_MISMATCH", 503, "The stored subscription snapshot differs from the exact provider response");
    const subscriptionReceiptId = id("commercial-subscription-receipt");
    const subscriptionEvidenceHash = await canonicalHash({ runId, entitlementPolicyVersion: ELEVENLABS_COMMERCIAL_ENTITLEMENT_VERSION, tier: entitlement.tier, status: entitlement.status, state: entitlement.state, subscriptionHash, subscriptionByteSize: subscriptionBytes.byteLength, subscriptionKey, observedAt });
    await run(env.DB, `INSERT INTO v7_evaluation_commercial_subscription_receipts
      (id,run_id,channel_id,policy_version,entitlement_policy_version,subscription_tier,subscription_status,entitlement_state,commercial_use_eligible,exact_response_hash,response_byte_size,r2_storage_key,r2_readback_hash,r2_readback_verified,observed_at,evidence_hash)
      VALUES (?,?,?,?,?,?,?,?,1,?,?,?,?,1,?,?)`, subscriptionReceiptId, runId, CHANNEL_ID, COMMERCIAL_CLEAN_AUDIO_REGENERATION_VERSION, ELEVENLABS_COMMERCIAL_ENTITLEMENT_VERSION, entitlement.tier, entitlement.status, entitlement.state, subscriptionHash, subscriptionBytes.byteLength, subscriptionKey, subscriptionReadbackHash, observedAt, subscriptionEvidenceHash);
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(clean(identity.voice_id))}?output_format=${encodeURIComponent(clean(identity.output_format))}`, {
      method: "POST", headers: { ...headers, "content-type": "application/json", "idempotency-key": idempotencyKey }, body: json(requestBody), signal: AbortSignal.timeout(180_000),
    });
    await run(env.DB, "UPDATE v7_evaluation_commercial_clean_audio_runs SET tts_requests=1 WHERE id=?", runId);
    if (!response.ok) throw new CommercialCleanAudioError("ELEVENLABS_COMMERCIAL_CLEAN_AUDIO_TTS_FAILED", 502, `ElevenLabs clean-control synthesis failed (${response.status})`);
    const providerNativeRequestId = clean(response.headers.get("request-id") || response.headers.get("x-request-id"));
    if (!providerNativeRequestId) throw new CommercialCleanAudioError("ELEVENLABS_REQUEST_ID_MISSING", 502, "ElevenLabs returned audio without a provider-native request ID");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength <= 10_000 || bytes.byteLength > 10_000_000) throw new CommercialCleanAudioError("ELEVENLABS_AUDIO_BYTES_INVALID", 502, "ElevenLabs returned audio outside the bounded fixture byte range");
    const exactResponseHash = await sha256Hex(bytes), storageKey = `evaluation/controlled-fixtures/v2/clean-audio/${exactResponseHash}.mp3`;
    await env.BUCKET.put(storageKey, bytes, { httpMetadata: { contentType: "audio/mpeg" }, customMetadata: { sha256: exactResponseHash, policyVersion: COMMERCIAL_CLEAN_AUDIO_REGENERATION_VERSION, runId, rightsState: "PASS" } });
    const stored = await env.BUCKET.get(storageKey); if (!stored) throw new CommercialCleanAudioError("COMMERCIAL_CLEAN_AUDIO_R2_READBACK_FAILED", 503, "The replacement audio could not be read back");
    const readback = new Uint8Array(await stored.arrayBuffer()), readbackHash = await sha256Hex(readback);
    if (readbackHash !== exactResponseHash || readback.byteLength !== bytes.byteLength) throw new CommercialCleanAudioError("COMMERCIAL_CLEAN_AUDIO_R2_HASH_MISMATCH", 503, "The replacement audio differs from the exact provider response");
    const providerReceiptId = id("commercial-clean-audio-provider-receipt"), artifactId = id("commercial-clean-audio-artifact");
    const providerEvidenceHash = await canonicalHash({ runId, subscriptionReceiptId, providerNativeRequestId, exactResponseHash, byteSize: bytes.byteLength, narrationHash, voiceId: identity.voice_id, modelId: identity.model_id, settingsHash: identity.settings_hash, storageKey, readbackHash, rightsState: "PASS" });
    await run(env.DB, `INSERT INTO v7_evaluation_commercial_clean_audio_provider_receipts
      (id,run_id,subscription_receipt_id,channel_id,provider_native_request_id,exact_response_hash,response_byte_size,voice_id,model_id,settings_hash,narration_hash,r2_storage_key,r2_readback_hash,r2_readback_verified,rights_state,evidence_hash)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1,'PASS',?)`, providerReceiptId, runId, subscriptionReceiptId, CHANNEL_ID, providerNativeRequestId, exactResponseHash, bytes.byteLength, identity.voice_id, identity.model_id, identity.settings_hash, narrationHash, storageKey, readbackHash, providerEvidenceHash);
    await run(env.DB, `INSERT INTO v7_evaluation_commercial_clean_audio_artifacts
      (id,run_id,provider_receipt_id,channel_id,policy_version,replaces_artifact_id,storage_key,mime_type,byte_size,sha256,materialization_state,rights_state,owner_ground_truth_state,factory_audio_qa_state)
      VALUES (?,?,?,?,?,?,?,'audio/mpeg',?,?,'BYTES_PROVIDER_ENTITLEMENT_AND_RIGHTS_VERIFIED','PASS','NOT_EVALUATED','PENDING')`, artifactId, runId, providerReceiptId, CHANNEL_ID, COMMERCIAL_CLEAN_AUDIO_REGENERATION_VERSION, replacedArtifact.id, storageKey, bytes.byteLength, exactResponseHash);
    const rightsReceiptId = id("commercial-clean-audio-rights-receipt");
    const rightsEvidenceHash = await canonicalHash({ artifactId, providerReceiptId, subscriptionReceiptId, officialTermsSnapshotReceiptId: terms.id, officialTermsHash: terms.exact_response_hash, jurisdictionScope: "NON_EEA_VIETNAM", narrationHash, modelId: identity.model_id, entitlementState: entitlement.state, rightsState: "PASS" });
    await run(env.DB, `INSERT INTO v7_evaluation_commercial_clean_audio_rights_receipts
      (id,artifact_id,provider_receipt_id,subscription_receipt_id,official_terms_snapshot_receipt_id,channel_id,policy_version,jurisdiction_scope,input_ownership_state,model_state,entitlement_state,rights_state,adjudication_outcome,evidence_hash)
      VALUES (?,?,?,?,?,?,?,'NON_EEA_VIETNAM','CHANNEL_AUTHORED_TEXT_HASH_BOUND','NON_BETA_PINNED_MODEL','EXPLICIT_ACTIVE_PAID_BASE_PLAN','PASS','COMMERCIAL_RIGHTS_PASS_GENERATION_TIME_PAID_PLAN',?)`, rightsReceiptId, artifactId, providerReceiptId, subscriptionReceiptId, terms.id, CHANNEL_ID, COMMERCIAL_CLEAN_AUDIO_REGENERATION_VERSION, rightsEvidenceHash);
    await run(env.DB, "UPDATE v7_evaluation_commercial_clean_audio_runs SET lifecycle_state='COMPLETE',completed_at=? WHERE id=?", now(), runId);
    return { outcome: "RECORDED", snapshot: await commercialCleanAudioSnapshot(env.DB) };
  } catch (error) {
    const known = error instanceof CommercialCleanAudioError ? error : new CommercialCleanAudioError("UNEXPECTED_COMMERCIAL_CLEAN_AUDIO_FAILURE", 500, "Unexpected commercial clean-audio regeneration failure");
    await run(env.DB, "UPDATE v7_evaluation_commercial_clean_audio_runs SET lifecycle_state='FAILED',error_code=?,completed_at=? WHERE id=?", known.code, now(), runId).catch(() => undefined);
    throw known;
  }
}

function usageCost(usage: Row) {
  const prompt = number(usage.prompt_tokens), completion = number(usage.completion_tokens);
  const promptDetails = usage.prompt_tokens_details && typeof usage.prompt_tokens_details === "object" ? usage.prompt_tokens_details as Row : {};
  const completionDetails = usage.completion_tokens_details && typeof usage.completion_tokens_details === "object" ? usage.completion_tokens_details as Row : {};
  const audioInput = number(promptDetails.audio_tokens), audioOutput = number(completionDetails.audio_tokens);
  const textInput = Math.max(0, prompt - audioInput), textOutput = Math.max(0, completion - audioOutput);
  return (textInput * 2.5 + textOutput * 10 + audioInput * 32 + audioOutput * 64) / 1_000_000;
}

export async function runFactoryCleanAudioQaAuthorized(env: CommercialCleanAudioEnv & { OPENAI_API_KEY: string }, actor: string, idempotencyKey: string) {
  if (!/^[A-Za-z0-9._:-]{16,160}$/.test(idempotencyKey)) throw new CommercialCleanAudioError("IDEMPOTENCY_KEY_INVALID", 400, "A stable 16–160 character idempotency-key is required");
  const prior = await first(env.DB, "SELECT lifecycle_state FROM v7_evaluation_factory_audio_qa_runs WHERE channel_id=? AND idempotency_key=? LIMIT 1", CHANNEL_ID, idempotencyKey);
  if (prior) {
    if (clean(prior.lifecycle_state) === "COMPLETE") return { outcome: "REPLAYED", snapshot: await commercialCleanAudioSnapshot(env.DB) };
    throw new CommercialCleanAudioError("FACTORY_AUDIO_QA_ALREADY_ATTEMPTED", 409, `The immutable Factory audio QA attempt is ${clean(prior.lifecycle_state)}`);
  }
  const [policy, artifact, rights, existingRun] = await Promise.all([
    first(env.DB, "SELECT * FROM v7_evaluation_factory_audio_qa_policies WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, FACTORY_AUDIO_QA_POLICY_VERSION),
    first(env.DB, "SELECT * FROM v7_evaluation_commercial_clean_audio_artifacts WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, COMMERCIAL_CLEAN_AUDIO_REGENERATION_VERSION),
    first(env.DB, "SELECT * FROM v7_evaluation_commercial_clean_audio_rights_receipts WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, COMMERCIAL_CLEAN_AUDIO_REGENERATION_VERSION),
    first(env.DB, "SELECT id FROM v7_evaluation_factory_audio_qa_runs WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, FACTORY_AUDIO_QA_POLICY_VERSION),
  ]);
  if (!policy || !artifact || !rights || clean(artifact.rights_state) !== "PASS" || clean(rights.rights_state) !== "PASS") throw new CommercialCleanAudioError("FACTORY_AUDIO_QA_RIGHTS_PASS_REQUIRED", 409, "A rights-PASS replacement fixture is required before Factory audio QA");
  if (existingRun) throw new CommercialCleanAudioError("FACTORY_AUDIO_QA_REQUEST_CEILING_REACHED", 409, "The one-request Factory audio QA ceiling has already been reached");
  const object = await env.BUCKET.get(clean(artifact.storage_key)); if (!object) throw new CommercialCleanAudioError("FACTORY_AUDIO_QA_ARTIFACT_MISSING", 404, "The exact replacement audio is missing");
  const bytes = new Uint8Array(await object.arrayBuffer()), exactHash = await sha256Hex(bytes);
  if (exactHash !== clean(artifact.sha256) || bytes.byteLength !== number(artifact.byte_size)) throw new CommercialCleanAudioError("FACTORY_AUDIO_QA_ARTIFACT_HASH_MISMATCH", 409, "The R2 audio differs from the sealed artifact");
  if (bytes.byteLength > 10_000_000) throw new CommercialCleanAudioError("FACTORY_AUDIO_QA_INPUT_TOO_LARGE", 422, "The clean fixture exceeds the bounded audio QA input size");
  const requestHash = await canonicalHash({ policyVersion: FACTORY_AUDIO_QA_POLICY_VERSION, artifactId: artifact.id, exactHash, modelId: FACTORY_AUDIO_QA_MODEL });
  const runId = id("factory-audio-qa-run");
  await run(env.DB, `INSERT INTO v7_evaluation_factory_audio_qa_runs
    (id,channel_id,policy_version,artifact_id,idempotency_key,request_hash,lifecycle_state,reserved_spend_usd,actor)
    VALUES (?,?,?,?,?,?,'PLANNED',0.20,?)`, runId, CHANNEL_ID, FACTORY_AUDIO_QA_POLICY_VERSION, artifact.id, idempotencyKey, requestHash, actor);
  try {
    await run(env.DB, "UPDATE v7_evaluation_factory_audio_qa_runs SET lifecycle_state='RUNNING' WHERE id=?", runId);
    const prompt = `Listen to the exact audio from beginning to end as an independent QA reviewer for a premium US faceless financial explainer. Judge heard audio only. Detect robotic or stitched voice, wrong pronunciation, unnatural pauses, abrupt seams, clicks/static/noise, clipping, inconsistent loudness, monotonous delivery, weak educational emphasis, listener fatigue, or semantic delivery that confuses authorization, clearing, and settlement. Score overall and exactly these dimensions from 0-100: voiceNaturalness, pronunciation, pacingProsody, audioContinuity, noiseArtifacts, listenerFatigue, semanticDelivery. PASS evidence requires overall >=92, every dimension >=90, P0=0 and P1=0. Return only JSON with keys overall, dimensions, p0Count, p1Count, findings (objects with startSeconds,endSeconds,severity,defect,evidence), and rationale.`;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json", "idempotency-key": idempotencyKey },
      body: json({ model: FACTORY_AUDIO_QA_MODEL, modalities: ["text"], max_completion_tokens: 3000, messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "input_audio", input_audio: { data: base64(bytes), format: "mp3" } }] }] }),
      signal: AbortSignal.timeout(180_000),
    });
    await run(env.DB, "UPDATE v7_evaluation_factory_audio_qa_runs SET provider_requests=1 WHERE id=?", runId);
    if (!response.ok) throw new CommercialCleanAudioError("FACTORY_AUDIO_QA_PROVIDER_FAILED", 502, `OpenAI audio QA failed (${response.status})`);
    const payload = await response.json() as Row, choices = Array.isArray(payload.choices) ? payload.choices as Row[] : [], message = choices[0]?.message && typeof choices[0].message === "object" ? choices[0].message as Row : {}, audit = parseJsonObject(message.content);
    if (!audit) throw new CommercialCleanAudioError("FACTORY_AUDIO_QA_RESPONSE_INVALID", 502, "OpenAI audio QA did not return the required JSON evidence");
    const dimensions = audit.dimensions && typeof audit.dimensions === "object" && !Array.isArray(audit.dimensions) ? audit.dimensions as Row : {};
    if (QA_DIMENSIONS.some((key) => !Number.isFinite(number(dimensions[key])) || number(dimensions[key]) < 0 || number(dimensions[key]) > 100)) throw new CommercialCleanAudioError("FACTORY_AUDIO_QA_DIMENSIONS_INVALID", 502, "OpenAI audio QA omitted a required bounded dimension");
    const overall = number(audit.overall), p0 = Math.max(0, Math.trunc(number(audit.p0Count))), p1 = Math.max(0, Math.trunc(number(audit.p1Count))), findings = Array.isArray(audit.findings) ? audit.findings : [], rationale = clean(audit.rationale);
    if (!Number.isFinite(overall) || overall < 0 || overall > 100 || rationale.length < 12) throw new CommercialCleanAudioError("FACTORY_AUDIO_QA_VERDICT_INVALID", 502, "OpenAI audio QA returned an invalid verdict");
    const usage = payload.usage && typeof payload.usage === "object" ? payload.usage as Row : {}, actualSpendUsd = usageCost(usage);
    if (!Number.isFinite(actualSpendUsd) || actualSpendUsd < 0 || actualSpendUsd > FACTORY_AUDIO_QA_RESERVED_SPEND_USD) throw new CommercialCleanAudioError("FACTORY_AUDIO_QA_SPEND_CEILING_EXCEEDED", 409, "Measured Factory audio QA usage exceeded its reserved ceiling");
    const cleanPass = overall >= number(policy.overall_floor) && QA_DIMENSIONS.every((key) => number(dimensions[key]) >= number(policy.dimension_floor)) && p0 === 0 && p1 === 0;
    const decisionState = cleanPass ? "LIKELY_CLEAN" : "LIKELY_DEFECT_PRESENT", ownerAttentionState = cleanPass ? "NO_IMMEDIATE_OWNER_ACTION" : "OWNER_EXCEPTION";
    const providerResponseId = clean(payload.id); if (!providerResponseId) throw new CommercialCleanAudioError("FACTORY_AUDIO_QA_RESPONSE_ID_MISSING", 502, "OpenAI audio QA returned no provider response ID");
    const evidenceHash = await canonicalHash({ runId, artifactId: artifact.id, exactArtifactHash: exactHash, modelId: FACTORY_AUDIO_QA_MODEL, providerResponseId, decisionState, ownerAttentionState, overall, dimensions, p0, p1, findings, rationale, usage, actualSpendUsd });
    const receiptId = id("factory-audio-qa-receipt");
    await run(env.DB, `INSERT INTO v7_evaluation_factory_audio_qa_receipts
      (id,run_id,artifact_id,channel_id,policy_version,exact_artifact_hash,model_id,provider_response_id,decision_state,owner_attention_state,overall_score,dimensions_json,p0_count,p1_count,findings_json,rationale,usage_json,actual_spend_usd,evidence_hash)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, receiptId, runId, artifact.id, CHANNEL_ID, FACTORY_AUDIO_QA_POLICY_VERSION, exactHash, FACTORY_AUDIO_QA_MODEL, providerResponseId, decisionState, ownerAttentionState, Math.round(overall), json(dimensions), p0, p1, json(findings), rationale, json(usage), actualSpendUsd, evidenceHash);
    await run(env.DB, "UPDATE v7_evaluation_factory_audio_qa_runs SET lifecycle_state='COMPLETE',actual_spend_usd=?,completed_at=? WHERE id=?", actualSpendUsd, now(), runId);
    return { outcome: decisionState, snapshot: await commercialCleanAudioSnapshot(env.DB) };
  } catch (error) {
    const known = error instanceof CommercialCleanAudioError ? error : new CommercialCleanAudioError("UNEXPECTED_FACTORY_AUDIO_QA_FAILURE", 500, "Unexpected Factory audio QA failure");
    await run(env.DB, "UPDATE v7_evaluation_factory_audio_qa_runs SET lifecycle_state='FAILED',error_code=?,completed_at=? WHERE id=?", known.code, now(), runId).catch(() => undefined);
    throw known;
  }
}
