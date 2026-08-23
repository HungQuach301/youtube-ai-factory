import { canonicalHash, sha256Hex } from "@/lib/canonical-json";
import { cleanAudioControlNarrationHash } from "@/lib/controlled-fixture-materialization";

export const EVALUATION_CURRENT_RIGHTS_EVIDENCE_CAPTURE_VERSION = "EVALUATION_CURRENT_RIGHTS_EVIDENCE_CAPTURE_V1" as const;
export const CURRENT_RIGHTS_EVIDENCE_MAXIMUM_PUBLIC_READS = 4 as const;
export const CURRENT_RIGHTS_EVIDENCE_MAXIMUM_SOURCE_BYTES = 2_000_000 as const;

const CHANNEL_ID = "channel-hidden-systems";
const SOURCES = [
  { key: "TERMS_OF_USE", category: "TERMS", url: "https://elevenlabs.io/terms-of-use" },
  { key: "PUBLISHING_COMMERCIAL_LICENSE_HELP", category: "COMMERCIAL_LICENSE_HELP", url: "https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform" },
  { key: "PAYG_ADMINISTRATION_DOCS", category: "ACCOUNT_BILLING_DOCS", url: "https://elevenlabs.io/docs/overview/administration/pay-as-you-go" },
  { key: "TTS_CAPABILITY_DOCS", category: "PRODUCT_DOCUMENTATION", url: "https://elevenlabs.io/docs/overview/capabilities/text-to-speech" },
] as const;

type Row = Record<string, unknown>;
type RunResult = { meta?: { changes?: number } };
type Statement = { bind(...values: unknown[]): Statement; first<T = Row>(): Promise<T | null>; run(): Promise<RunResult> };
export type RightsEvidenceDB = { prepare(query: string): Statement };
type StoredObject = { arrayBuffer(): Promise<ArrayBuffer> };
export type RightsEvidenceBucket = {
  put(key: string, value: Uint8Array, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }): Promise<unknown>;
  get(key: string): Promise<StoredObject | null>;
};
export type RightsEvidenceEnv = { DB: RightsEvidenceDB; BUCKET: RightsEvidenceBucket };

export class RightsEvidenceError extends Error {
  constructor(public code: string, public status: number, message: string) { super(message); }
}

const clean = (value: unknown) => String(value ?? "").trim();
const count = (value: unknown) => Number(value ?? 0);
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const now = () => new Date().toISOString();
async function first(db: RightsEvidenceDB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values).first<Row>(); }
async function run(db: RightsEvidenceDB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values.map((value) => value === undefined ? null : value)).run(); }

export async function currentRightsEvidenceSnapshot(db: RightsEvidenceDB) {
  const [policy, latestRun, diagnostic] = await Promise.all([
    first(db, `SELECT jurisdiction_scope,expected_official_sources,maximum_public_reads,maximum_source_bytes,generation_time_subscription_binding_required,base_plan_evidence_required,input_ownership_evidence_required,beta_model_forbidden,rights_pass_authority,dataset_sealing_authority,assurance_qualification_authority,release_authority
      FROM v7_evaluation_current_rights_evidence_capture_policies WHERE channel_id=? AND policy_version=? LIMIT 1`, CHANNEL_ID, EVALUATION_CURRENT_RIGHTS_EVIDENCE_CAPTURE_VERSION),
    first(db, `SELECT id,lifecycle_state,planned_sources,processed_sources,verified_sources,public_reads,account_reads,provider_generation_requests,spend_usd,error_code,created_at,completed_at
      FROM v7_evaluation_current_rights_evidence_capture_runs WHERE channel_id=? AND policy_version=? ORDER BY created_at DESC,id DESC LIMIT 1`, CHANNEL_ID, EVALUATION_CURRENT_RIGHTS_EVIDENCE_CAPTURE_VERSION),
    first(db, `SELECT d.*,a.mime_type,a.byte_size FROM v7_evaluation_clean_audio_rights_diagnostics d
      JOIN v7_evaluation_materialized_fixture_artifacts a ON a.id=d.fixture_artifact_id
      WHERE d.channel_id=? AND d.policy_version=? ORDER BY d.created_at DESC,d.id DESC LIMIT 1`, CHANNEL_ID, EVALUATION_CURRENT_RIGHTS_EVIDENCE_CAPTURE_VERSION),
  ]);
  return {
    policy: policy ? {
      jurisdictionScope: clean(policy.jurisdiction_scope), expectedOfficialSources: count(policy.expected_official_sources), maximumPublicReads: count(policy.maximum_public_reads), maximumSourceBytes: count(policy.maximum_source_bytes),
      generationTimeSubscriptionBindingRequired: Boolean(count(policy.generation_time_subscription_binding_required)), basePlanEvidenceRequired: Boolean(count(policy.base_plan_evidence_required)), inputOwnershipEvidenceRequired: Boolean(count(policy.input_ownership_evidence_required)), betaModelForbidden: Boolean(count(policy.beta_model_forbidden)),
      rightsPassAuthority: Boolean(count(policy.rights_pass_authority)), datasetSealingAuthority: Boolean(count(policy.dataset_sealing_authority)), assuranceQualificationAuthority: Boolean(count(policy.assurance_qualification_authority)), releaseAuthority: Boolean(count(policy.release_authority)),
    } : null,
    latestRun: latestRun ? {
      id: clean(latestRun.id), lifecycleState: clean(latestRun.lifecycle_state), plannedSources: count(latestRun.planned_sources), processedSources: count(latestRun.processed_sources), verifiedSources: count(latestRun.verified_sources), publicReads: count(latestRun.public_reads), accountReads: count(latestRun.account_reads), providerGenerationRequests: count(latestRun.provider_generation_requests), spendUsd: count(latestRun.spend_usd), errorCode: clean(latestRun.error_code) || null, createdAt: clean(latestRun.created_at), completedAt: clean(latestRun.completed_at) || null,
    } : null,
    diagnostic: diagnostic ? {
      fixtureArtifactId: clean(diagnostic.fixture_artifact_id), fixtureSha256: clean(diagnostic.fixture_sha256), mimeType: clean(diagnostic.mime_type), byteSize: count(diagnostic.byte_size), providerNativeRequestIdVerified: Boolean(count(diagnostic.provider_native_request_id_verified)), generationSubscriptionTier: clean(diagnostic.generation_subscription_tier), generationSubscriptionStatus: clean(diagnostic.generation_subscription_status), generationSubscriptionObservedAt: clean(diagnostic.generation_subscription_observed_at), jurisdictionScope: clean(diagnostic.jurisdiction_scope), modelId: clean(diagnostic.model_id), betaModelState: clean(diagnostic.beta_model_state), inputOwnershipState: clean(diagnostic.input_ownership_state), officialSourcesExpected: count(diagnostic.official_sources_expected), officialSourcesVerified: count(diagnostic.official_sources_verified), officialSourceCoverageState: clean(diagnostic.official_source_coverage_state), basePlanEvidenceState: clean(diagnostic.base_plan_evidence_state), adjudicationOutcome: clean(diagnostic.adjudication_outcome), rightsState: clean(diagnostic.rights_state), nextEvidenceRequired: clean(diagnostic.next_evidence_required), rightsPassAuthority: Boolean(count(diagnostic.rights_pass_authority)), datasetSealingAuthority: Boolean(count(diagnostic.dataset_sealing_authority)), assuranceQualificationAuthority: Boolean(count(diagnostic.assurance_qualification_authority)), releaseAuthority: Boolean(count(diagnostic.release_authority)), providerGenerationRequests: count(diagnostic.provider_generation_requests), spendUsd: count(diagnostic.spend_usd), createdAt: clean(diagnostic.created_at),
    } : null,
  };
}

export async function captureCurrentCommercialRightsEvidenceAuthorized(env: RightsEvidenceEnv, actor: string, idempotencyKey: string) {
  if (!/^[A-Za-z0-9._:-]{16,160}$/.test(idempotencyKey)) throw new RightsEvidenceError("IDEMPOTENCY_KEY_INVALID", 400, "A stable 16–160 character idempotency-key is required");
  const prior = await first(env.DB, "SELECT id,lifecycle_state,intent_hash FROM v7_evaluation_current_rights_evidence_capture_runs WHERE channel_id=? AND idempotency_key=? LIMIT 1", CHANNEL_ID, idempotencyKey);
  if (prior) {
    if (clean(prior.lifecycle_state) === "COMPLETE") return { outcome: "REPLAYED", snapshot: await currentRightsEvidenceSnapshot(env.DB) };
    throw new RightsEvidenceError("CURRENT_RIGHTS_EVIDENCE_ALREADY_ATTEMPTED", 409, `The immutable evidence-capture attempt is ${clean(prior.lifecycle_state)}`);
  }
  const artifact = await first(env.DB, `SELECT a.id artifact_id,a.sha256,a.rights_state,a.release_eligible,a.provider_binding_receipt_id,
      r.provider_native_request_id,r.subscription_tier,r.subscription_status,r.subscription_response_hash,r.subscription_observed_at,r.model_id,r.evidence_hash provider_binding_evidence_hash
    FROM v7_evaluation_materialized_fixture_artifacts a JOIN v7_evaluation_fixture_provider_binding_receipts r ON r.id=a.provider_binding_receipt_id
    WHERE a.channel_id=? AND a.fixture_role='CLEAN_NEGATIVE' AND a.artifact_type='CLEAN_AUDIO_CONTROL' ORDER BY a.created_at DESC,a.id DESC LIMIT 1`, CHANNEL_ID);
  if (!artifact || clean(artifact.rights_state) !== "PROVIDER_TERMS_RECEIPT_REQUIRED" || count(artifact.release_eligible) !== 0) throw new RightsEvidenceError("CLEAN_AUDIO_RIGHTS_PENDING_ARTIFACT_REQUIRED", 409, "The exact clean-audio rights-pending artifact is required");
  if (!clean(artifact.provider_native_request_id) || clean(artifact.model_id) !== "eleven_multilingual_v2") throw new RightsEvidenceError("CLEAN_AUDIO_PROVIDER_BINDING_NOT_ELIGIBLE", 409, "The fixture must retain its provider-native request ID and pinned non-Beta model");
  const existingDiagnostic = await first(env.DB, "SELECT id FROM v7_evaluation_clean_audio_rights_diagnostics WHERE fixture_artifact_id=? AND policy_version=? LIMIT 1", artifact.artifact_id, EVALUATION_CURRENT_RIGHTS_EVIDENCE_CAPTURE_VERSION);
  if (existingDiagnostic) return { outcome: "REPLAYED", snapshot: await currentRightsEvidenceSnapshot(env.DB) };
  const narrationHash = await cleanAudioControlNarrationHash();
  const intentHash = await canonicalHash({ policyVersion: EVALUATION_CURRENT_RIGHTS_EVIDENCE_CAPTURE_VERSION, fixtureArtifactId: artifact.artifact_id, fixtureSha256: artifact.sha256, providerBindingReceiptId: artifact.provider_binding_receipt_id, providerBindingEvidenceHash: artifact.provider_binding_evidence_hash, narrationHash, sources: SOURCES });
  const runId = id("current-rights-evidence-run");
  await run(env.DB, `INSERT INTO v7_evaluation_current_rights_evidence_capture_runs
    (id,channel_id,policy_version,fixture_artifact_id,provider_binding_receipt_id,idempotency_key,intent_hash,lifecycle_state,planned_sources,actor)
    VALUES (?,?,?,?,?,?,?,'PLANNED',4,?)`, runId, CHANNEL_ID, EVALUATION_CURRENT_RIGHTS_EVIDENCE_CAPTURE_VERSION, artifact.artifact_id, artifact.provider_binding_receipt_id, idempotencyKey, intentHash, actor);
  try {
    await run(env.DB, "UPDATE v7_evaluation_current_rights_evidence_capture_runs SET lifecycle_state='RUNNING' WHERE id=?", runId);
    let processed = 0, verified = 0;
    for (const source of SOURCES) {
      const retrievedAt = now();
      let retrievalState = "NETWORK_ERROR", httpStatus: number | null = null, contentType: string | null = null, responseByteSize: number | null = null, exactResponseHash: string | null = null, storageKey: string | null = null, readbackHash: string | null = null, readbackVerified = 0, errorCode: string | null = null;
      try {
        const response = await fetch(source.url, { headers: { accept: "text/html,application/xhtml+xml,text/markdown,text/plain;q=0.9,*/*;q=0.1" }, redirect: "follow", signal: AbortSignal.timeout(30_000) });
        httpStatus = response.status; contentType = clean(response.headers.get("content-type")) || null;
        const declaredLength = Number(response.headers.get("content-length") || 0);
        if (declaredLength > CURRENT_RIGHTS_EVIDENCE_MAXIMUM_SOURCE_BYTES) {
          retrievalState = "SOURCE_TOO_LARGE"; errorCode = "DECLARED_SOURCE_BYTES_EXCEED_CEILING";
        } else {
          const bytes = new Uint8Array(await response.arrayBuffer()); responseByteSize = bytes.byteLength;
          if (bytes.byteLength > CURRENT_RIGHTS_EVIDENCE_MAXIMUM_SOURCE_BYTES) {
            retrievalState = "SOURCE_TOO_LARGE"; errorCode = "ACTUAL_SOURCE_BYTES_EXCEED_CEILING";
          } else {
            exactResponseHash = await sha256Hex(bytes);
            storageKey = `evaluation/rights-evidence/v1/${source.key.toLowerCase()}/${exactResponseHash}.snapshot`;
            await env.BUCKET.put(storageKey, bytes, { httpMetadata: { contentType: contentType || "application/octet-stream" }, customMetadata: { sha256: exactResponseHash, sourceKey: source.key, policyVersion: EVALUATION_CURRENT_RIGHTS_EVIDENCE_CAPTURE_VERSION, runId } });
            const stored = await env.BUCKET.get(storageKey);
            if (stored) {
              readbackHash = await sha256Hex(new Uint8Array(await stored.arrayBuffer())); readbackVerified = readbackHash === exactResponseHash ? 1 : 0;
            }
            retrievalState = !response.ok ? "HTTP_ERROR" : readbackVerified ? "PASS" : "R2_READBACK_FAILED";
            if (!response.ok) errorCode = `HTTP_${response.status}`; else if (!readbackVerified) errorCode = "R2_READBACK_HASH_MISMATCH";
          }
        }
      } catch (error) {
        retrievalState = "NETWORK_ERROR"; errorCode = error instanceof Error && error.name === "TimeoutError" ? "SOURCE_FETCH_TIMEOUT" : "SOURCE_FETCH_FAILED";
      }
      processed += 1; if (retrievalState === "PASS") verified += 1;
      const evidenceHash = await canonicalHash({ policyVersion: EVALUATION_CURRENT_RIGHTS_EVIDENCE_CAPTURE_VERSION, runId, source, retrievalState, httpStatus, contentType, responseByteSize, exactResponseHash, storageKey, readbackHash, readbackVerified, retrievedAt, errorCode });
      await run(env.DB, `INSERT INTO v7_evaluation_official_terms_snapshot_receipts
        (id,run_id,channel_id,policy_version,source_key,source_category,source_url,retrieval_state,http_status,content_type,response_byte_size,exact_response_hash,r2_storage_key,r2_readback_hash,r2_readback_verified,retrieved_at,error_code,evidence_hash)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, id("official-terms-snapshot"), runId, CHANNEL_ID, EVALUATION_CURRENT_RIGHTS_EVIDENCE_CAPTURE_VERSION, source.key, source.category, source.url, retrievalState, httpStatus, contentType, responseByteSize, exactResponseHash, storageKey, readbackHash, readbackVerified, retrievedAt, errorCode, evidenceHash);
      await run(env.DB, "UPDATE v7_evaluation_current_rights_evidence_capture_runs SET processed_sources=?,verified_sources=?,public_reads=? WHERE id=?", processed, verified, processed, runId);
    }
    const coverageState = verified === SOURCES.length ? "COMPLETE" : "PARTIAL";
    const adjudicationOutcome = coverageState === "COMPLETE" ? "REVIEW_REQUIRED_PAYG_BASE_PLAN_AMBIGUOUS" : "REVIEW_REQUIRED_OFFICIAL_SOURCE_CAPTURE_INCOMPLETE";
    const diagnosticFacts = {
      policyVersion: EVALUATION_CURRENT_RIGHTS_EVIDENCE_CAPTURE_VERSION, runId, fixtureArtifactId: clean(artifact.artifact_id), fixtureSha256: clean(artifact.sha256), providerBindingReceiptId: clean(artifact.provider_binding_receipt_id), providerNativeRequestIdVerified: 1,
      generationSubscriptionTier: clean(artifact.subscription_tier), generationSubscriptionStatus: clean(artifact.subscription_status), generationSubscriptionResponseHash: clean(artifact.subscription_response_hash), generationSubscriptionObservedAt: clean(artifact.subscription_observed_at), jurisdictionScope: "NON_EEA_VIETNAM", modelId: clean(artifact.model_id), betaModelState: "NON_BETA_PINNED_MODEL", inputOwnershipState: "CHANNEL_AUTHORED_TEXT_HASH_BOUND", narrationHash,
      officialSourcesExpected: SOURCES.length, officialSourcesVerified: verified, officialSourceCoverageState: coverageState, basePlanEvidenceState: "BASE_PLAN_COMMERCIAL_RIGHTS_NOT_PROVEN", adjudicationOutcome, rightsState: "PROVIDER_TERMS_RECEIPT_REQUIRED", nextEvidenceRequired: "GENERATION_TIME_BASE_PLAN_OR_CONTRACT_EVIDENCE", rightsPassAuthority: 0, datasetSealingAuthority: 0, assuranceQualificationAuthority: 0, releaseAuthority: 0, providerGenerationRequests: 0, spendUsd: 0,
    };
    const diagnosticEvidenceHash = await canonicalHash(diagnosticFacts);
    await run(env.DB, `INSERT INTO v7_evaluation_clean_audio_rights_diagnostics
      (id,run_id,channel_id,policy_version,fixture_artifact_id,fixture_sha256,provider_binding_receipt_id,provider_native_request_id_verified,generation_subscription_tier,generation_subscription_status,generation_subscription_response_hash,generation_subscription_observed_at,jurisdiction_scope,model_id,beta_model_state,input_ownership_state,narration_hash,official_sources_expected,official_sources_verified,official_source_coverage_state,base_plan_evidence_state,adjudication_outcome,rights_state,next_evidence_required,evidence_hash)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, id("clean-audio-rights-diagnostic"), runId, CHANNEL_ID, EVALUATION_CURRENT_RIGHTS_EVIDENCE_CAPTURE_VERSION, artifact.artifact_id, artifact.sha256, artifact.provider_binding_receipt_id, 1, artifact.subscription_tier, artifact.subscription_status, artifact.subscription_response_hash, artifact.subscription_observed_at, "NON_EEA_VIETNAM", artifact.model_id, "NON_BETA_PINNED_MODEL", "CHANNEL_AUTHORED_TEXT_HASH_BOUND", narrationHash, SOURCES.length, verified, coverageState, "BASE_PLAN_COMMERCIAL_RIGHTS_NOT_PROVEN", adjudicationOutcome, "PROVIDER_TERMS_RECEIPT_REQUIRED", "GENERATION_TIME_BASE_PLAN_OR_CONTRACT_EVIDENCE", diagnosticEvidenceHash);
    await run(env.DB, "UPDATE v7_evaluation_current_rights_evidence_capture_runs SET lifecycle_state='COMPLETE',completed_at=? WHERE id=?", now(), runId);
    return { outcome: "RECORDED", snapshot: await currentRightsEvidenceSnapshot(env.DB) };
  } catch (error) {
    const known = error instanceof RightsEvidenceError ? error : new RightsEvidenceError("UNEXPECTED_CURRENT_RIGHTS_EVIDENCE_FAILURE", 500, "Unexpected commercial-rights evidence capture failure");
    await run(env.DB, "UPDATE v7_evaluation_current_rights_evidence_capture_runs SET lifecycle_state='FAILED',error_code=?,completed_at=? WHERE id=?", known.code, now(), runId).catch(() => undefined);
    throw known;
  }
}
