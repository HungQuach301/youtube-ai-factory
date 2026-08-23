import { canonicalHash, sha256Hex } from "@/lib/canonical-json";
import { CLEAN_AUDIO_CONTROL_NARRATION, cleanAudioControlNarrationHash } from "@/lib/controlled-fixture-materialization";
import { ELEVENLABS_COMMERCIAL_ENTITLEMENT_VERSION, evaluateElevenLabsCommercialEntitlement } from "@/lib/elevenlabs-commercial-entitlement";

export const COMMERCIAL_CLEAN_AUDIO_REGENERATION_VERSION = "COMMERCIAL_CLEAN_AUDIO_REGENERATION_V1" as const;
export const COMMERCIAL_CLEAN_AUDIO_RECOVERY_VERSION = "COMMERCIAL_CLEAN_AUDIO_RECOVERY_V1" as const;
export const FACTORY_AUDIO_QA_POLICY_VERSION = "FACTORY_AUDIO_QA_POLICY_V1" as const;
export const FACTORY_AUDIO_QA_RECOVERY_VERSION = "FACTORY_AUDIO_QA_RECOVERY_V1" as const;
export const FACTORY_AUDIO_QA_OUTPUT_CONTRACT_VERSION = "FORCED_FUNCTION_CALL_V1" as const;
export const FACTORY_AUDIO_QA_PROVIDER_CAPTURE_VERSION = "FACTORY_AUDIO_QA_PROVIDER_RESPONSE_CAPTURE_V1" as const;
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
  const [policy, latestRun, artifact, rights, qaPolicy, qaRun, qa, commercialRecovery, qaRecoveryAuthorization, qaRecoveryRun, qaRecovery] = await Promise.all([
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
    first(db, `SELECT a.id authorization_id,a.failed_run_id,b.recovery_run_id
      FROM v7_evaluation_commercial_clean_audio_recovery_authorizations a
      LEFT JOIN v7_evaluation_commercial_clean_audio_recovery_bindings b ON b.authorization_id=a.id
      WHERE a.channel_id=? AND a.policy_version=? LIMIT 1`, CHANNEL_ID, COMMERCIAL_CLEAN_AUDIO_RECOVERY_VERSION),
    first(db, `SELECT a.id authorization_id,a.failed_run_id,r.id recovery_run_id
      FROM v7_evaluation_factory_audio_qa_recovery_authorizations a
      LEFT JOIN v7_evaluation_factory_audio_qa_recovery_runs r ON r.authorization_id=a.id
      WHERE a.channel_id=? AND a.policy_version=? LIMIT 1`, CHANNEL_ID, FACTORY_AUDIO_QA_RECOVERY_VERSION),
    first(db, "SELECT * FROM v7_evaluation_factory_audio_qa_recovery_runs WHERE channel_id=? AND policy_version=? ORDER BY created_at DESC,id DESC LIMIT 1", CHANNEL_ID, FACTORY_AUDIO_QA_RECOVERY_VERSION),
    first(db, "SELECT * FROM v7_evaluation_factory_audio_qa_recovery_receipts WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, FACTORY_AUDIO_QA_RECOVERY_VERSION),
  ]);
  const effectiveQaRun = qaRecoveryRun || qaRun, effectiveQa = qaRecovery || qa;
  return {
    policy: policy ? { maximumReplacementFixtures: number(policy.maximum_replacement_fixtures), maximumSubscriptionReads: number(policy.maximum_subscription_reads), maximumTtsRequests: number(policy.maximum_tts_requests), maximumTtsCharacters: number(policy.maximum_tts_characters), reservedSpendCeilingUsd: number(policy.reserved_spend_ceiling_usd), entitlementPolicyVersion: clean(policy.entitlement_policy_version) } : null,
    latestRun: latestRun ? { lifecycleState: clean(latestRun.lifecycle_state), subscriptionReads: number(latestRun.subscription_reads), ttsRequests: number(latestRun.tts_requests), errorCode: clean(latestRun.error_code) || null, createdAt: clean(latestRun.created_at), completedAt: clean(latestRun.completed_at) || null } : null,
    artifact: artifact ? { id: clean(artifact.id), storageKey: clean(artifact.storage_key), mimeType: clean(artifact.mime_type), byteSize: number(artifact.byte_size), sha256: clean(artifact.sha256), materializationState: clean(artifact.materialization_state), rightsState: clean(artifact.rights_state), ownerGroundTruthState: clean(artifact.owner_ground_truth_state), providerNativeRequestIdCaptured: Boolean(clean(artifact.provider_native_request_id)), subscriptionTier: clean(artifact.subscription_tier), subscriptionStatus: clean(artifact.subscription_status), entitlementState: clean(artifact.entitlement_state), subscriptionR2ReadbackVerified: Boolean(number(artifact.subscription_r2_verified)), createdAt: clean(artifact.created_at) } : null,
    rights: rights ? { state: clean(rights.rights_state), outcome: clean(rights.adjudication_outcome), jurisdictionScope: clean(rights.jurisdiction_scope), evidenceHash: clean(rights.evidence_hash), createdAt: clean(rights.created_at) } : null,
    qaPolicy: qaPolicy ? { modelId: clean(qaPolicy.model_id), maximumProviderRequests: number(qaPolicy.maximum_provider_requests), reservedSpendCeilingUsd: number(qaPolicy.reserved_spend_ceiling_usd), overallFloor: number(qaPolicy.overall_floor), dimensionFloor: number(qaPolicy.dimension_floor), ownerGroundTruthRequired: Boolean(number(qaPolicy.owner_ground_truth_required)) } : null,
    qaRun: effectiveQaRun ? { lifecycleState: clean(effectiveQaRun.lifecycle_state), providerRequests: number(effectiveQaRun.provider_requests), actualSpendUsd: number(effectiveQaRun.actual_spend_usd), errorCode: clean(effectiveQaRun.error_code) || null, createdAt: clean(effectiveQaRun.created_at), completedAt: clean(effectiveQaRun.completed_at) || null, recovery: Boolean(qaRecoveryRun) } : null,
    qa: effectiveQa ? { decisionState: clean(effectiveQa.decision_state), ownerAttentionState: clean(effectiveQa.owner_attention_state), overallScore: number(effectiveQa.overall_score), dimensions: parseJsonObject(effectiveQa.dimensions_json) ?? {}, p0Count: number(effectiveQa.p0_count), p1Count: number(effectiveQa.p1_count), findings: (() => { try { return JSON.parse(clean(effectiveQa.findings_json)); } catch { return []; } })(), rationale: clean(effectiveQa.rationale), actualSpendUsd: number(effectiveQa.actual_spend_usd), evidenceHash: clean(effectiveQa.evidence_hash), createdAt: clean(effectiveQa.created_at), recovery: Boolean(qaRecovery) } : null,
    recovery: commercialRecovery ? { authorized: true, consumed: Boolean(clean(commercialRecovery.recovery_run_id)), failedRunId: clean(commercialRecovery.failed_run_id) } : null,
    qaRecovery: qaRecoveryAuthorization ? { authorized: true, consumed: Boolean(clean(qaRecoveryAuthorization.recovery_run_id)), failedRunId: clean(qaRecoveryAuthorization.failed_run_id), outputContractVersion: FACTORY_AUDIO_QA_OUTPUT_CONTRACT_VERSION } : null,
  };
}

export async function regenerateCommercialCleanAudioAuthorized(env: CommercialCleanAudioEnv, actor: string, idempotencyKey: string) {
  if (!/^[A-Za-z0-9._:-]{16,160}$/.test(idempotencyKey)) throw new CommercialCleanAudioError("IDEMPOTENCY_KEY_INVALID", 400, "A stable 16–160 character idempotency-key is required");
  const prior = await first(env.DB, "SELECT lifecycle_state FROM v7_evaluation_commercial_clean_audio_runs WHERE channel_id=? AND idempotency_key=? LIMIT 1", CHANNEL_ID, idempotencyKey);
  if (prior) {
    if (clean(prior.lifecycle_state) === "COMPLETE") return { outcome: "REPLAYED", snapshot: await commercialCleanAudioSnapshot(env.DB) };
    throw new CommercialCleanAudioError("COMMERCIAL_CLEAN_AUDIO_ALREADY_ATTEMPTED", 409, `The immutable regeneration attempt is ${clean(prior.lifecycle_state)}`);
  }
  const [policy, anyAttempt, existingReplacement, replacedArtifact, blueprint, identity, terms, recoveryAuthorization] = await Promise.all([
    first(env.DB, "SELECT * FROM v7_evaluation_commercial_clean_audio_policies WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, COMMERCIAL_CLEAN_AUDIO_REGENERATION_VERSION),
    first(env.DB, "SELECT id FROM v7_evaluation_commercial_clean_audio_runs WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, COMMERCIAL_CLEAN_AUDIO_REGENERATION_VERSION),
    first(env.DB, "SELECT id FROM v7_evaluation_commercial_clean_audio_artifacts WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, COMMERCIAL_CLEAN_AUDIO_REGENERATION_VERSION),
    first(env.DB, "SELECT id FROM v7_evaluation_materialized_fixture_artifacts WHERE channel_id=? AND fixture_role='CLEAN_NEGATIVE' AND candidate_kind='AUDIO' ORDER BY created_at DESC,id DESC LIMIT 1", CHANNEL_ID),
    first(env.DB, "SELECT * FROM v7_evaluation_controlled_fixture_blueprints WHERE blueprint_key='CLEAN_AUDIO_NEGATIVE' AND fixture_role='CLEAN_NEGATIVE' AND candidate_kind='AUDIO' LIMIT 1"),
    first(env.DB, "SELECT * FROM v7_evaluation_fixture_voice_identity_receipts WHERE id=? AND channel_id=? LIMIT 1", VOICE_IDENTITY_RECEIPT_ID, CHANNEL_ID),
    first(env.DB, `SELECT * FROM v7_evaluation_official_terms_snapshot_receipts
      WHERE channel_id=? AND source_key='TERMS_OF_USE' AND retrieval_state='PASS' AND r2_readback_verified=1
      ORDER BY retrieved_at DESC,id DESC LIMIT 1`, CHANNEL_ID),
    first(env.DB, `SELECT a.id,a.failed_run_id
      FROM v7_evaluation_commercial_clean_audio_recovery_authorizations a
      JOIN v7_evaluation_commercial_clean_audio_runs f ON f.id=a.failed_run_id
      LEFT JOIN v7_evaluation_commercial_clean_audio_recovery_bindings b ON b.authorization_id=a.id
      WHERE a.channel_id=? AND a.policy_version=? AND a.authorization_state='AUTHORIZED_ONE_RECOVERY'
        AND f.lifecycle_state='FAILED' AND f.subscription_reads=1 AND f.tts_requests=0
        AND f.error_code='UNEXPECTED_COMMERCIAL_CLEAN_AUDIO_FAILURE' AND b.id IS NULL
      LIMIT 1`, CHANNEL_ID, COMMERCIAL_CLEAN_AUDIO_RECOVERY_VERSION),
  ]);
  if (!policy || !replacedArtifact || !blueprint || !identity || !terms) throw new CommercialCleanAudioError("COMMERCIAL_CLEAN_AUDIO_PREREQUISITES_MISSING", 409, "The replacement policy, prior artifact, blueprint, voice identity and verified Terms snapshot are required");
  const recoveryMode = Boolean(anyAttempt && recoveryAuthorization && !existingReplacement);
  if ((anyAttempt && !recoveryMode) || existingReplacement) throw new CommercialCleanAudioError("COMMERCIAL_CLEAN_AUDIO_REPLACEMENT_CEILING_REACHED", 409, "The replacement ceiling has already been reached");
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
  if (recoveryMode) await run(env.DB, `INSERT INTO v7_evaluation_commercial_clean_audio_recovery_bindings
    (id,authorization_id,failed_run_id,recovery_run_id,channel_id,policy_version,binding_state)
    VALUES (?,?,?,?,?,?,'RECOVERY_ATTEMPT_CONSUMED')`, id("commercial-clean-audio-recovery-binding"), recoveryAuthorization?.id, recoveryAuthorization?.failed_run_id, runId, CHANNEL_ID, COMMERCIAL_CLEAN_AUDIO_RECOVERY_VERSION);
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
      VALUES (?,?,?,?,?,?,?,'EXPLICIT_ACTIVE_PAID_BASE_PLAN',1,?,?,?,?,1,?,?)`, subscriptionReceiptId, runId, CHANNEL_ID, COMMERCIAL_CLEAN_AUDIO_REGENERATION_VERSION, ELEVENLABS_COMMERCIAL_ENTITLEMENT_VERSION, entitlement.tier, entitlement.status, subscriptionHash, subscriptionBytes.byteLength, subscriptionKey, subscriptionReadbackHash, observedAt, subscriptionEvidenceHash);
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
  const [priorOriginal, priorRecovery] = await Promise.all([
    first(env.DB, "SELECT lifecycle_state FROM v7_evaluation_factory_audio_qa_runs WHERE channel_id=? AND idempotency_key=? LIMIT 1", CHANNEL_ID, idempotencyKey),
    first(env.DB, "SELECT lifecycle_state FROM v7_evaluation_factory_audio_qa_recovery_runs WHERE channel_id=? AND idempotency_key=? LIMIT 1", CHANNEL_ID, idempotencyKey),
  ]);
  const prior = priorRecovery || priorOriginal;
  if (prior) {
    if (clean(prior.lifecycle_state) === "COMPLETE") return { outcome: "REPLAYED", snapshot: await commercialCleanAudioSnapshot(env.DB) };
    throw new CommercialCleanAudioError("FACTORY_AUDIO_QA_ALREADY_ATTEMPTED", 409, `The immutable Factory audio QA attempt is ${clean(prior.lifecycle_state)}`);
  }
  const [policy, artifact, rights, originalRun, existingReceipt, recoveryAuthorization, existingRecoveryRun] = await Promise.all([
    first(env.DB, "SELECT * FROM v7_evaluation_factory_audio_qa_policies WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, FACTORY_AUDIO_QA_POLICY_VERSION),
    first(env.DB, "SELECT * FROM v7_evaluation_commercial_clean_audio_artifacts WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, COMMERCIAL_CLEAN_AUDIO_REGENERATION_VERSION),
    first(env.DB, "SELECT * FROM v7_evaluation_commercial_clean_audio_rights_receipts WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, COMMERCIAL_CLEAN_AUDIO_REGENERATION_VERSION),
    first(env.DB, "SELECT * FROM v7_evaluation_factory_audio_qa_runs WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, FACTORY_AUDIO_QA_POLICY_VERSION),
    first(env.DB, "SELECT id FROM v7_evaluation_factory_audio_qa_receipts WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, FACTORY_AUDIO_QA_POLICY_VERSION),
    first(env.DB, `SELECT a.* FROM v7_evaluation_factory_audio_qa_recovery_authorizations a
      WHERE a.channel_id=? AND a.policy_version=? AND a.authorization_state='AUTHORIZED_ONE_RECOVERY' LIMIT 1`, CHANNEL_ID, FACTORY_AUDIO_QA_RECOVERY_VERSION),
    first(env.DB, "SELECT id FROM v7_evaluation_factory_audio_qa_recovery_runs WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, FACTORY_AUDIO_QA_RECOVERY_VERSION),
  ]);
  if (!policy || !artifact || !rights || clean(artifact.rights_state) !== "PASS" || clean(rights.rights_state) !== "PASS") throw new CommercialCleanAudioError("FACTORY_AUDIO_QA_RIGHTS_PASS_REQUIRED", 409, "A rights-PASS replacement fixture is required before Factory audio QA");
  const recoveryMode = Boolean(originalRun && clean(originalRun.lifecycle_state) === "FAILED" && clean(originalRun.error_code) === "FACTORY_AUDIO_QA_RESPONSE_INVALID" && number(originalRun.provider_requests) === 1 && recoveryAuthorization && !existingRecoveryRun && !existingReceipt);
  if (originalRun && !recoveryMode) throw new CommercialCleanAudioError("FACTORY_AUDIO_QA_REQUEST_CEILING_REACHED", 409, "The Factory audio QA request ceiling has already been reached");
  const object = await env.BUCKET.get(clean(artifact.storage_key)); if (!object) throw new CommercialCleanAudioError("FACTORY_AUDIO_QA_ARTIFACT_MISSING", 404, "The exact replacement audio is missing");
  const bytes = new Uint8Array(await object.arrayBuffer()), exactHash = await sha256Hex(bytes);
  if (exactHash !== clean(artifact.sha256) || bytes.byteLength !== number(artifact.byte_size)) throw new CommercialCleanAudioError("FACTORY_AUDIO_QA_ARTIFACT_HASH_MISMATCH", 409, "The R2 audio differs from the sealed artifact");
  if (bytes.byteLength > 10_000_000) throw new CommercialCleanAudioError("FACTORY_AUDIO_QA_INPUT_TOO_LARGE", 422, "The clean fixture exceeds the bounded audio QA input size");
  const requestHash = await canonicalHash({ policyVersion: FACTORY_AUDIO_QA_POLICY_VERSION, recoveryPolicyVersion: recoveryMode ? FACTORY_AUDIO_QA_RECOVERY_VERSION : null, outputContractVersion: FACTORY_AUDIO_QA_OUTPUT_CONTRACT_VERSION, artifactId: artifact.id, exactHash, modelId: FACTORY_AUDIO_QA_MODEL });
  const runId = id(recoveryMode ? "factory-audio-qa-recovery-run" : "factory-audio-qa-run"), runTable = recoveryMode ? "v7_evaluation_factory_audio_qa_recovery_runs" : "v7_evaluation_factory_audio_qa_runs";
  if (recoveryMode) {
    await run(env.DB, `INSERT INTO v7_evaluation_factory_audio_qa_recovery_runs
      (id,authorization_id,failed_run_id,artifact_id,channel_id,policy_version,idempotency_key,request_hash,lifecycle_state,reserved_spend_usd,actor)
      VALUES (?,?,?,?,?,?,?,?,'PLANNED',0.20,?)`, runId, recoveryAuthorization?.id, recoveryAuthorization?.failed_run_id, artifact.id, CHANNEL_ID, FACTORY_AUDIO_QA_RECOVERY_VERSION, idempotencyKey, requestHash, actor);
  } else {
    await run(env.DB, `INSERT INTO v7_evaluation_factory_audio_qa_runs
      (id,channel_id,policy_version,artifact_id,idempotency_key,request_hash,lifecycle_state,reserved_spend_usd,actor)
      VALUES (?,?,?,?,?,?,'PLANNED',0.20,?)`, runId, CHANNEL_ID, FACTORY_AUDIO_QA_POLICY_VERSION, artifact.id, idempotencyKey, requestHash, actor);
  }
  try {
    await run(env.DB, `UPDATE ${runTable} SET lifecycle_state='RUNNING' WHERE id=?`, runId);
    const prompt = `Listen to the exact audio from beginning to end as an independent QA reviewer for a premium US faceless financial explainer. Judge heard audio only. Detect robotic or stitched voice, wrong pronunciation, unnatural pauses, abrupt seams, clicks/static/noise, clipping, inconsistent loudness, monotonous delivery, weak educational emphasis, listener fatigue, or semantic delivery that confuses authorization, clearing, and settlement. Score overall and exactly these dimensions from 0-100: voiceNaturalness, pronunciation, pacingProsody, audioContinuity, noiseArtifacts, listenerFatigue, semanticDelivery. PASS evidence requires overall >=92, every dimension >=90, P0=0 and P1=0. Call record_factory_audio_qa exactly once with the complete evidence.`;
    const qaParameters = {
      type: "object", additionalProperties: false,
      properties: {
        overall: { type: "number", minimum: 0, maximum: 100 },
        dimensions: { type: "object", additionalProperties: false, properties: Object.fromEntries(QA_DIMENSIONS.map((key) => [key, { type: "number", minimum: 0, maximum: 100 }])), required: [...QA_DIMENSIONS] },
        p0Count: { type: "integer", minimum: 0 }, p1Count: { type: "integer", minimum: 0 },
        findings: { type: "array", items: { type: "object", additionalProperties: false, properties: { startSeconds: { type: "number", minimum: 0 }, endSeconds: { type: "number", minimum: 0 }, severity: { type: "string", enum: ["P0", "P1", "P2", "P3"] }, defect: { type: "string" }, evidence: { type: "string" } }, required: ["startSeconds", "endSeconds", "severity", "defect", "evidence"] } },
        rationale: { type: "string" },
      },
      required: ["overall", "dimensions", "p0Count", "p1Count", "findings", "rationale"],
    };
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json", "idempotency-key": idempotencyKey },
      body: json({ model: FACTORY_AUDIO_QA_MODEL, modalities: ["text"], max_completion_tokens: 3000, parallel_tool_calls: false, tools: [{ type: "function", function: { name: "record_factory_audio_qa", description: "Record the complete exact-audio QA evidence.", parameters: qaParameters } }], tool_choice: { type: "function", function: { name: "record_factory_audio_qa" } }, messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "input_audio", input_audio: { data: base64(bytes), format: "mp3" } }] }] }),
      signal: AbortSignal.timeout(180_000),
    });
    await run(env.DB, `UPDATE ${runTable} SET provider_requests=1 WHERE id=?`, runId);
    if (!response.ok) throw new CommercialCleanAudioError("FACTORY_AUDIO_QA_PROVIDER_FAILED", 502, `OpenAI audio QA failed (${response.status})`);
    const responseText = await response.text();
    if (!responseText || responseText.length > 2_000_000) throw new CommercialCleanAudioError("FACTORY_AUDIO_QA_PROVIDER_RESPONSE_INVALID", 502, "OpenAI returned an invalid bounded response body");
    const payload = parseJsonObject(responseText); if (!payload) throw new CommercialCleanAudioError("FACTORY_AUDIO_QA_PROVIDER_RESPONSE_INVALID", 502, "OpenAI returned a non-JSON response body");
    const usage = payload.usage && typeof payload.usage === "object" ? payload.usage as Row : {}, actualSpendUsd = usageCost(usage);
    if (!Number.isFinite(actualSpendUsd) || actualSpendUsd < 0 || actualSpendUsd > FACTORY_AUDIO_QA_RESERVED_SPEND_USD) throw new CommercialCleanAudioError("FACTORY_AUDIO_QA_SPEND_CEILING_EXCEEDED", 409, "Measured Factory audio QA usage exceeded its reserved ceiling");
    await run(env.DB, `UPDATE ${runTable} SET actual_spend_usd=? WHERE id=?`, actualSpendUsd, runId);
    const providerResponseId = clean(payload.id); if (!providerResponseId) throw new CommercialCleanAudioError("FACTORY_AUDIO_QA_RESPONSE_ID_MISSING", 502, "OpenAI audio QA returned no provider response ID");
    const responseBytes = new TextEncoder().encode(responseText), responseHash = await sha256Hex(responseBytes), responseKey = `evaluation/controlled-fixtures/v2/factory-audio-qa/provider-response/${responseHash}.json`;
    await env.BUCKET.put(responseKey, responseBytes, { httpMetadata: { contentType: "application/json" }, customMetadata: { sha256: responseHash, outputContractVersion: FACTORY_AUDIO_QA_OUTPUT_CONTRACT_VERSION, runId } });
    const storedResponse = await env.BUCKET.get(responseKey); if (!storedResponse) throw new CommercialCleanAudioError("FACTORY_AUDIO_QA_RESPONSE_R2_READBACK_FAILED", 503, "The exact OpenAI response could not be read back");
    const responseReadback = new Uint8Array(await storedResponse.arrayBuffer()), responseReadbackHash = await sha256Hex(responseReadback);
    if (responseReadbackHash !== responseHash || responseReadback.byteLength !== responseBytes.byteLength) throw new CommercialCleanAudioError("FACTORY_AUDIO_QA_RESPONSE_R2_HASH_MISMATCH", 503, "The stored OpenAI response differs from the exact provider bytes");
    const providerResponseReceiptId = id("factory-audio-qa-provider-response-receipt");
    await run(env.DB, `INSERT INTO v7_evaluation_factory_audio_qa_provider_response_receipts
      (id,source_run_id,source_run_kind,channel_id,capture_policy_version,output_contract_version,provider_response_id,exact_response_hash,response_byte_size,r2_storage_key,r2_readback_hash,r2_readback_verified,usage_json,actual_spend_usd)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?,?)`, providerResponseReceiptId, runId, recoveryMode ? "RECOVERY" : "ORIGINAL", CHANNEL_ID, FACTORY_AUDIO_QA_PROVIDER_CAPTURE_VERSION, FACTORY_AUDIO_QA_OUTPUT_CONTRACT_VERSION, providerResponseId, responseHash, responseBytes.byteLength, responseKey, responseReadbackHash, json(usage), actualSpendUsd);
    const choices = Array.isArray(payload.choices) ? payload.choices as Row[] : [], message = choices[0]?.message && typeof choices[0].message === "object" ? choices[0].message as Row : {};
    const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls as Row[] : [], qaCall = toolCalls.find((call) => call.function && typeof call.function === "object" && clean((call.function as Row).name) === "record_factory_audio_qa");
    const qaFunction = qaCall?.function && typeof qaCall.function === "object" ? qaCall.function as Row : {}, audit = parseJsonObject(qaFunction.arguments);
    if (!audit) throw new CommercialCleanAudioError("FACTORY_AUDIO_QA_RESPONSE_INVALID", 502, "OpenAI audio QA did not return the required function evidence");
    const dimensions = audit.dimensions && typeof audit.dimensions === "object" && !Array.isArray(audit.dimensions) ? audit.dimensions as Row : {};
    if (QA_DIMENSIONS.some((key) => !Number.isFinite(number(dimensions[key])) || number(dimensions[key]) < 0 || number(dimensions[key]) > 100)) throw new CommercialCleanAudioError("FACTORY_AUDIO_QA_DIMENSIONS_INVALID", 502, "OpenAI audio QA omitted a required bounded dimension");
    const overall = number(audit.overall), p0 = Math.max(0, Math.trunc(number(audit.p0Count))), p1 = Math.max(0, Math.trunc(number(audit.p1Count))), findings = Array.isArray(audit.findings) ? audit.findings : [], rationale = clean(audit.rationale);
    if (!Number.isFinite(overall) || overall < 0 || overall > 100 || rationale.length < 12) throw new CommercialCleanAudioError("FACTORY_AUDIO_QA_VERDICT_INVALID", 502, "OpenAI audio QA returned an invalid verdict");
    const cleanPass = overall >= number(policy.overall_floor) && QA_DIMENSIONS.every((key) => number(dimensions[key]) >= number(policy.dimension_floor)) && p0 === 0 && p1 === 0;
    const decisionState = cleanPass ? "LIKELY_CLEAN" : "LIKELY_DEFECT_PRESENT", ownerAttentionState = cleanPass ? "NO_IMMEDIATE_OWNER_ACTION" : "OWNER_EXCEPTION";
    const evidenceHash = await canonicalHash({ runId, failedRunId: recoveryMode ? recoveryAuthorization?.failed_run_id : null, artifactId: artifact.id, exactArtifactHash: exactHash, modelId: FACTORY_AUDIO_QA_MODEL, outputContractVersion: FACTORY_AUDIO_QA_OUTPUT_CONTRACT_VERSION, providerResponseReceiptId, providerResponseId, decisionState, ownerAttentionState, overall, dimensions, p0, p1, findings, rationale, usage, actualSpendUsd });
    const receiptId = id(recoveryMode ? "factory-audio-qa-recovery-receipt" : "factory-audio-qa-receipt");
    if (recoveryMode) {
      await run(env.DB, `INSERT INTO v7_evaluation_factory_audio_qa_recovery_receipts
        (id,recovery_run_id,provider_response_receipt_id,failed_run_id,artifact_id,channel_id,policy_version,exact_artifact_hash,model_id,provider_response_id,decision_state,owner_attention_state,overall_score,dimensions_json,p0_count,p1_count,findings_json,rationale,usage_json,actual_spend_usd,authority_boundary,evidence_hash)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'INDEPENDENT_REVIEW_ONLY',?)`, receiptId, runId, providerResponseReceiptId, recoveryAuthorization?.failed_run_id, artifact.id, CHANNEL_ID, FACTORY_AUDIO_QA_RECOVERY_VERSION, exactHash, FACTORY_AUDIO_QA_MODEL, providerResponseId, decisionState, ownerAttentionState, Math.round(overall), json(dimensions), p0, p1, json(findings), rationale, json(usage), actualSpendUsd, evidenceHash);
    } else {
      await run(env.DB, `INSERT INTO v7_evaluation_factory_audio_qa_receipts
        (id,run_id,artifact_id,channel_id,policy_version,exact_artifact_hash,model_id,provider_response_id,decision_state,owner_attention_state,overall_score,dimensions_json,p0_count,p1_count,findings_json,rationale,usage_json,actual_spend_usd,evidence_hash)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, receiptId, runId, artifact.id, CHANNEL_ID, FACTORY_AUDIO_QA_POLICY_VERSION, exactHash, FACTORY_AUDIO_QA_MODEL, providerResponseId, decisionState, ownerAttentionState, Math.round(overall), json(dimensions), p0, p1, json(findings), rationale, json(usage), actualSpendUsd, evidenceHash);
    }
    await run(env.DB, `UPDATE ${runTable} SET lifecycle_state='COMPLETE',completed_at=? WHERE id=?`, now(), runId);
    return { outcome: decisionState, snapshot: await commercialCleanAudioSnapshot(env.DB) };
  } catch (error) {
    const known = error instanceof CommercialCleanAudioError ? error : new CommercialCleanAudioError("UNEXPECTED_FACTORY_AUDIO_QA_FAILURE", 500, "Unexpected Factory audio QA failure");
    await run(env.DB, `UPDATE ${runTable} SET lifecycle_state='FAILED',error_code=?,completed_at=? WHERE id=?`, known.code, now(), runId).catch(() => undefined);
    throw known;
  }
}
