import { getChatGPTUser } from "@/app/chatgpt-auth";
import { canonicalHash } from "@/lib/canonical-json";
import {
  CORPUS_VERIFICATION_MAXIMUM_BATCH,
  CORPUS_VERIFICATION_MAXIMUM_OBJECT_BYTES,
  CORPUS_VERIFICATION_POLICY_VERSION,
  EVALUATION_FOUNDATION_VERSION,
  reconcileCorpusArtifactEvidence,
  summarizeCorpusEvidenceConflicts,
  summarizeEvaluationRightsQueue,
} from "@/lib/evaluation-foundation";

export const dynamic = "force-dynamic";
const NO_STORE = { "cache-control": "no-store" };
const CHANNEL_ID = "channel-hidden-systems";
type Row = Record<string, unknown>;
type RunResult = { meta?: { changes?: number } };
type Statement = { bind(...values: unknown[]): Statement; all<T = Row>(): Promise<{ results?: T[] }>; first<T = Row>(): Promise<T | null>; run(): Promise<RunResult> };
type DB = { prepare(query: string): Statement };
type StoredObject = { arrayBuffer(): Promise<ArrayBuffer>; size?: number; customMetadata?: Record<string, string> };
type Bucket = { get(key: string): Promise<StoredObject | null> };
type Env = { DB?: DB; BUCKET?: Bucket; FACTORY_EXPERT_EMAILS?: string; FACTORY_AUTOMATION_ACTOR_EMAIL?: string; FACTORY_AUTOMATION_ACTOR_NAME?: string; SEQUENTIAL_EXECUTOR_TOKEN?: string };

class EvaluationCommandError extends Error { constructor(public code: string, public status: number, message: string) { super(message); } }
const clean = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);
const json = <T,>(value: unknown, fallback: T): T => { try { return JSON.parse(clean(value)) as T; } catch { return fallback; } };
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
async function runtime() { const { env } = await import("cloudflare:workers"); return env as unknown as Env; }
async function first(db: DB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values).first<Row>(); }
async function rows(db: DB, query: string, ...values: unknown[]) { return (await db.prepare(query).bind(...values).all<Row>()).results ?? []; }
async function run(db: DB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values.map((value) => value === undefined ? null : value)).run(); }
async function sha256(value: ArrayBuffer) { return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", value))).map((part) => part.toString(16).padStart(2, "0")).join(""); }
async function secretMatches(left: string, right: string) { if (!left || !right) return false; const encode = (value: string) => new TextEncoder().encode(value), [a, b] = await Promise.all([crypto.subtle.digest("SHA-256", encode(left)), crypto.subtle.digest("SHA-256", encode(right))]); const av = new Uint8Array(a), bv = new Uint8Array(b); let difference = av.length ^ bv.length; for (let index = 0; index < Math.min(av.length, bv.length); index += 1) difference |= av[index] ^ bv[index]; return difference === 0; }

async function authorized(request: Request) {
  const env = await runtime();
  if (!env.DB || !env.BUCKET) throw new EvaluationCommandError("EVALUATION_RUNTIME_UNAVAILABLE", 503, "Corpus verification requires canonical D1 and R2 bindings");
  let user = await getChatGPTUser();
  if (!user && await secretMatches(request.headers.get("x-sequential-executor-token") || "", env.SEQUENTIAL_EXECUTOR_TOKEN || "")) {
    const email = clean(env.FACTORY_AUTOMATION_ACTOR_EMAIL); if (email) user = { email, displayName: clean(env.FACTORY_AUTOMATION_ACTOR_NAME) || email, fullName: null };
  }
  if (!user) throw new EvaluationCommandError("SIWC_AUTHENTICATION_REQUIRED", 401, "Owner or scoped sequential automation authentication is required");
  const allowlist = new Set(clean(env.FACTORY_EXPERT_EMAILS).split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
  if (!allowlist.has(user.email.toLowerCase())) throw new EvaluationCommandError("CHANNEL_OWNER_AUTHORIZATION_REQUIRED", 403, "This identity cannot verify the evaluation corpus");
  return { env: env as Required<Pick<Env, "DB" | "BUCKET">> & Env, actor: user.email.toLowerCase() };
}

async function projection(db: DB) {
  const [candidate, runSummary, latestRuns, blockedRows, incidentSummary, rightsRows, rightsReceiptSummary] = await Promise.all([
    first(db, `SELECT COUNT(*) candidates,
      COALESCE(SUM(CASE WHEN verification_state='PENDING' THEN 1 ELSE 0 END),0) pending,
      COALESCE(SUM(CASE WHEN bytes_state='READBACK_VERIFIED' THEN 1 ELSE 0 END),0) byte_verified,
      COALESCE(SUM(CASE WHEN checksum_state='PASS' THEN 1 ELSE 0 END),0) checksum_pass,
      COALESCE(SUM(CASE WHEN provenance_state='PASS' THEN 1 ELSE 0 END),0) provenance_pass,
      COALESCE(SUM(CASE WHEN rights_verification_state='PASS' THEN 1 ELSE 0 END),0) rights_pass,
      COALESCE(SUM(CASE WHEN verification_state='PARTIAL_RIGHTS_PENDING' THEN 1 ELSE 0 END),0) rights_pending,
      COALESCE(SUM(CASE WHEN verification_state='BLOCKED' THEN 1 ELSE 0 END),0) blocked
      ,COALESCE(SUM(CASE WHEN verification_state='EXCLUDED' THEN 1 ELSE 0 END),0) excluded
      FROM v7_evaluation_candidates WHERE channel_id=?`, CHANNEL_ID),
    first(db, "SELECT COUNT(*) runs,COALESCE(SUM(provider_requests),0) provider_requests,COALESCE(SUM(spend_usd),0) spend_usd,COALESCE(SUM(bytes_read),0) bytes_read FROM v7_evaluation_verification_runs WHERE channel_id=?", CHANNEL_ID),
    rows(db, "SELECT id,lifecycle_state,planned_candidates,processed_candidates,byte_verified_candidates,checksum_pass_candidates,provenance_pass_candidates,rights_pass_candidates,blocked_candidates,bytes_read,created_at,completed_at FROM v7_evaluation_verification_runs WHERE channel_id=? ORDER BY created_at DESC LIMIT 10", CHANNEL_ID),
    rows(db, `SELECT c.candidate_kind,c.artifact_type,c.content_hash candidate_declared_hash,c.byte_size candidate_declared_bytes,
      a.id source_artifact_id,a.package_id source_package_id,a.sha256 source_hash,a.byte_size source_bytes,a.engine_version source_engine_version,
      r.computed_hash,r.actual_bytes,r.object_metadata_json,r.bytes_state,r.checksum_state,r.provenance_state,r.reconciliation_reasons_json
      FROM v7_evaluation_candidates c
      JOIN v7_evaluation_verification_receipts r ON r.id=c.latest_verification_receipt_id
      JOIN production_v2_artifacts a ON c.source_table='production_v2_artifacts' AND a.id=c.source_id
      WHERE c.channel_id=? AND c.verification_state='BLOCKED'
      ORDER BY c.candidate_kind,c.artifact_type`, CHANNEL_ID),
    first(db, `SELECT COUNT(*) incidents,
      COALESCE(SUM(CASE WHEN NOT EXISTS (SELECT 1 FROM v7_evaluation_candidate_dispositions d WHERE d.candidate_id=i.candidate_id AND d.basis_receipt_id=i.basis_receipt_id)
        AND NOT EXISTS (SELECT 1 FROM v7_evaluation_incident_resolutions x WHERE x.incident_id=i.id) THEN 1 ELSE 0 END),0) open_incidents,
      COALESCE(SUM(CASE WHEN incident_type='SOURCE_OBJECT_BYTE_DIVERGENCE' THEN 1 ELSE 0 END),0) byte_divergence,
      COALESCE(SUM(CASE WHEN incident_type='R2_METADATA_BINDING_MISMATCH' AND NOT EXISTS (SELECT 1 FROM v7_evaluation_incident_resolutions x WHERE x.incident_id=i.id) THEN 1 ELSE 0 END),0) metadata_review,
      (SELECT COUNT(*) FROM v7_evaluation_candidate_dispositions d WHERE d.channel_id=? AND d.disposition='QUARANTINE_EVALUATION_ONLY') quarantined,
      (SELECT COUNT(*) FROM v7_evaluation_metadata_binding_receipts b WHERE b.channel_id=? AND b.binding_state='UNIQUE_STORAGE_HASH_REBIND_VERIFIED') metadata_bindings
      FROM v7_evaluation_evidence_incidents i WHERE channel_id=?`, CHANNEL_ID, CHANNEL_ID, CHANNEL_ID),
    rows(db, `SELECT c.candidate_kind,r.rights_basis
      FROM v7_evaluation_candidates c
      JOIN v7_evaluation_verification_receipts r ON r.id=c.latest_verification_receipt_id
      WHERE c.channel_id=? AND c.verification_state='PARTIAL_RIGHTS_PENDING'
      ORDER BY c.candidate_kind,r.rights_basis`, CHANNEL_ID),
    first(db, "SELECT COUNT(*) accepted FROM v7_evaluation_rights_receipts WHERE channel_id=? AND rights_state='PASS'", CHANNEL_ID),
  ]);
  const conflicts = summarizeCorpusEvidenceConflicts(blockedRows.map((row) => ({
    candidateKind: clean(row.candidate_kind), artifactType: clean(row.artifact_type), bytesState: clean(row.bytes_state), checksumState: clean(row.checksum_state),
    provenanceState: clean(row.provenance_state), reconciliationReasonsJson: clean(row.reconciliation_reasons_json),
    candidateDeclaredHash: clean(row.candidate_declared_hash), candidateDeclaredBytes: number(row.candidate_declared_bytes), sourceArtifactId: clean(row.source_artifact_id),
    sourcePackageId: clean(row.source_package_id), sourceHash: clean(row.source_hash), sourceBytes: number(row.source_bytes), sourceEngineVersion: clean(row.source_engine_version),
    computedHash: clean(row.computed_hash), actualBytes: number(row.actual_bytes), objectMetadataJson: clean(row.object_metadata_json),
  })));
  const rightsQueue = summarizeEvaluationRightsQueue(rightsRows.map((row) => ({ candidateKind: clean(row.candidate_kind), rightsBasis: clean(row.rights_basis) })));
  return {
    foundationVersion: EVALUATION_FOUNDATION_VERSION,
    policyVersion: CORPUS_VERIFICATION_POLICY_VERSION,
    state: number(candidate?.pending) > 0 ? "CORPUS_VERIFICATION_ACTIVE" : "CORPUS_BYTE_RECONCILIATION_COMPLETE",
    candidates: number(candidate?.candidates), pending: number(candidate?.pending), byteVerified: number(candidate?.byte_verified), checksumPass: number(candidate?.checksum_pass), provenancePass: number(candidate?.provenance_pass), rightsPass: number(candidate?.rights_pass), rightsPending: number(candidate?.rights_pending), blocked: number(candidate?.blocked), excluded: number(candidate?.excluded),
    evidenceIncidents: number(incidentSummary?.incidents), openEvidenceIncidents: number(incidentSummary?.open_incidents), byteDivergenceIncidents: number(incidentSummary?.byte_divergence), metadataReviewRequired: number(incidentSummary?.metadata_review), quarantinedCandidates: number(incidentSummary?.quarantined), metadataBindingsAccepted: number(incidentSummary?.metadata_bindings),
    rightsReceiptsAccepted: number(rightsReceiptSummary?.accepted), rightsBasisCounts: rightsQueue.basisCounts, rightsKindCounts: rightsQueue.kindCounts,
    runs: number(runSummary?.runs), bytesRead: number(runSummary?.bytes_read), providerRequests: number(runSummary?.provider_requests), spendUsd: number(runSummary?.spend_usd),
    blockedReasonCounts: conflicts.reasonCounts, blockedFactCounts: conflicts.factCounts, blockedStateCounts: conflicts.stateCounts, blockedKindCounts: conflicts.kindCounts, latestRuns,
  };
}

export async function GET() {
  try { const env = await runtime(); if (!env.DB) throw new EvaluationCommandError("CANONICAL_DATABASE_UNAVAILABLE", 503, "Canonical D1 is unavailable"); return Response.json(await projection(env.DB), { headers: NO_STORE }); }
  catch (error) { const status = error instanceof EvaluationCommandError ? error.status : 503; return Response.json({ error: { code: error instanceof EvaluationCommandError ? error.code : "EVALUATION_PROJECTION_UNAVAILABLE", message: error instanceof Error ? error.message : "Evaluation projection unavailable" } }, { status, headers: NO_STORE }); }
}

async function candidateById(db: DB, candidateId: string) {
  return first(db, `SELECT c.*,a.id source_artifact_id,a.package_id source_package_id,a.storage_key source_storage_key,a.mime_type source_mime_type,a.byte_size source_byte_size,a.sha256 source_sha256,a.rights_state source_rights_state,a.provenance_json source_provenance_json,a.engine_version source_engine_version
    FROM v7_evaluation_candidates c
    JOIN production_v2_artifacts a ON c.source_table='production_v2_artifacts' AND a.id=c.source_id
    JOIN production_v2_packages p ON p.id=a.package_id AND p.channel_id=c.channel_id
    WHERE c.id=? AND c.channel_id=? LIMIT 1`, candidateId, CHANNEL_ID);
}

async function bindReceiptToCandidate(db: DB, candidate: Row, receipt: Row) {
  const evidenceVerified = clean(receipt.bytes_state) === "READBACK_VERIFIED" && clean(receipt.checksum_state) === "PASS" && clean(receipt.provenance_state) === "PASS";
  const verificationState = evidenceVerified ? clean(receipt.rights_verification_state) === "PASS" ? "EVIDENCE_VERIFIED" : "PARTIAL_RIGHTS_PENDING" : "BLOCKED";
  await run(db, `UPDATE v7_evaluation_candidates SET bytes_state=?,checksum_state=?,provenance_state=?,rights_verification_state=?,verification_state=?,latest_verification_receipt_id=?,verification_attempted_at=?,verified_at=? WHERE id=?`,
    receipt.bytes_state, receipt.checksum_state, receipt.provenance_state, receipt.rights_verification_state, verificationState, receipt.id, new Date().toISOString(), evidenceVerified ? new Date().toISOString() : null, candidate.id);
}

async function verifyCandidate(db: DB, bucket: Bucket, runId: string, candidate: Row) {
  const existing = await first(db, "SELECT * FROM v7_evaluation_verification_receipts WHERE run_id=? AND candidate_id=? LIMIT 1", runId, candidate.id);
  if (existing) { await bindReceiptToCandidate(db, candidate, existing); return existing; }
  const storageKey = clean(candidate.storage_key), object = storageKey ? await bucket.get(storageKey) : null;
  const actualBytes = object ? number(object.size || candidate.source_byte_size) : 0;
  let computedHash = "", readBytes = 0;
  if (object && actualBytes <= CORPUS_VERIFICATION_MAXIMUM_OBJECT_BYTES) { const value = await object.arrayBuffer(); readBytes = value.byteLength; computedHash = await sha256(value); }
  const provenance = json<Record<string, unknown> | null>(candidate.source_provenance_json, null);
  const result = reconcileCorpusArtifactEvidence({
    candidateId: clean(candidate.id), sourceArtifactId: clean(candidate.source_artifact_id), sourcePackageId: clean(candidate.source_package_id), storageKey,
    declaredHash: clean(candidate.content_hash), computedHash, declaredBytes: number(candidate.byte_size), actualBytes: readBytes || actualBytes,
    mimeType: clean(candidate.mime_type), artifactType: clean(candidate.artifact_type), engineVersion: clean(candidate.source_engine_version), rightsDeclaredState: clean(candidate.rights_declared_state),
    provenance, objectFound: Boolean(object), objectMetadata: object?.customMetadata ?? {},
  });
  const receiptId = id("evaluation-verification-receipt"), evidence = {
    policyVersion: CORPUS_VERIFICATION_POLICY_VERSION, candidateId: clean(candidate.id), sourceArtifactId: clean(candidate.source_artifact_id), storageKey,
    declaredHash: clean(candidate.content_hash), computedHash, declaredBytes: number(candidate.byte_size), actualBytes: readBytes || actualBytes,
    objectMetadata: object?.customMetadata ?? {}, bytesState: result.bytesState, checksumState: result.checksumState, provenanceState: result.provenanceState,
    rightsVerificationState: result.rightsVerificationState, rightsBasis: result.rightsBasis, reasons: result.reasons,
  };
  const evidenceHash = await canonicalHash(evidence);
  await run(db, `INSERT INTO v7_evaluation_verification_receipts
    (id,run_id,candidate_id,source_artifact_id,storage_key,declared_hash,computed_hash,declared_bytes,actual_bytes,bytes_state,checksum_state,provenance_state,rights_verification_state,rights_basis,object_metadata_json,reconciliation_reasons_json,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, receiptId, runId, candidate.id, candidate.source_artifact_id, storageKey, candidate.content_hash, computedHash || null, candidate.byte_size, readBytes || actualBytes, result.bytesState, result.checksumState, result.provenanceState, result.rightsVerificationState, result.rightsBasis, JSON.stringify(object?.customMetadata ?? {}), JSON.stringify(result.reasons), evidenceHash);
  const receipt = await first(db, "SELECT * FROM v7_evaluation_verification_receipts WHERE id=?", receiptId);
  if (!receipt) throw new EvaluationCommandError("VERIFICATION_RECEIPT_NOT_DURABLE", 503, "The verification receipt could not be read back from D1");
  await bindReceiptToCandidate(db, candidate, receipt);
  return receipt;
}

export async function POST(request: Request) {
  try {
    const { env, actor } = await authorized(request);
    const contentType = request.headers.get("content-type")?.toLowerCase() || "", formSubmission = contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data");
    if (!formSubmission && !contentType.includes("application/json")) throw new EvaluationCommandError("COMMAND_CONTENT_TYPE_REQUIRED", 415, "Use application/json or an owner-bound form submission");
    const body = formSubmission ? Object.fromEntries(await request.formData()) : await request.json().catch(() => null) as Row | null, action = clean(body?.action).toUpperCase();
    if (action !== "RUN_CORPUS_VERIFICATION_BATCH") throw new EvaluationCommandError("EVALUATION_ACTION_INVALID", 400, "Use RUN_CORPUS_VERIFICATION_BATCH");
    const idempotencyKey = clean(request.headers.get("idempotency-key") || (formSubmission ? body?.idempotencyKey : ""));
    if (idempotencyKey.length < 16 || idempotencyKey.length > 160) throw new EvaluationCommandError("IDEMPOTENCY_KEY_INVALID", 400, "A 16–160 character idempotency-key is required");
    const requestedLimit = body?.limit === undefined ? CORPUS_VERIFICATION_MAXIMUM_BATCH : number(body.limit);
    if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > CORPUS_VERIFICATION_MAXIMUM_BATCH) throw new EvaluationCommandError("VERIFICATION_BATCH_LIMIT_INVALID", 400, `limit must be an integer from 1 to ${CORPUS_VERIFICATION_MAXIMUM_BATCH}`);
    const intentHash = await canonicalHash({ action, channelId: CHANNEL_ID, policyVersion: CORPUS_VERIFICATION_POLICY_VERSION, limit: requestedLimit });
    let verificationRun = await first(env.DB, "SELECT * FROM v7_evaluation_verification_runs WHERE channel_id=? AND idempotency_key=? LIMIT 1", CHANNEL_ID, idempotencyKey);
    if (verificationRun && clean(verificationRun.intent_hash) !== intentHash) throw new EvaluationCommandError("IDEMPOTENCY_INTENT_CONFLICT", 409, "The idempotency key is already bound to a different verification intent");
    if (!verificationRun) {
      const selected = await rows(env.DB, "SELECT id FROM v7_evaluation_candidates WHERE channel_id=? AND verification_state='PENDING' ORDER BY id LIMIT ?", CHANNEL_ID, requestedLimit);
      const candidateIds = selected.map((item) => clean(item.id)), runId = id("evaluation-verification-run");
      await run(env.DB, `INSERT INTO v7_evaluation_verification_runs
        (id,channel_id,foundation_version,policy_version,lifecycle_state,idempotency_key,intent_hash,candidate_ids_json,maximum_candidates,maximum_object_bytes,planned_candidates,actor)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, runId, CHANNEL_ID, EVALUATION_FOUNDATION_VERSION, CORPUS_VERIFICATION_POLICY_VERSION, "PLANNED", idempotencyKey, intentHash, JSON.stringify(candidateIds), requestedLimit, CORPUS_VERIFICATION_MAXIMUM_OBJECT_BYTES, candidateIds.length, actor);
      verificationRun = await first(env.DB, "SELECT * FROM v7_evaluation_verification_runs WHERE id=?", runId);
    }
    if (!verificationRun) throw new EvaluationCommandError("VERIFICATION_RUN_NOT_DURABLE", 503, "The verification run could not be read back from D1");
    const candidateIds = json<string[]>(verificationRun.candidate_ids_json, []);
    await run(env.DB, "UPDATE v7_evaluation_verification_runs SET lifecycle_state='RUNNING' WHERE id=? AND lifecycle_state IN ('PLANNED','RUNNING','FAILED')", verificationRun.id);
    for (const candidateId of candidateIds) { const candidate = await candidateById(env.DB, candidateId); if (candidate) await verifyCandidate(env.DB, env.BUCKET, clean(verificationRun.id), candidate); }
    const totals = await first(env.DB, `SELECT COUNT(*) processed,
      COALESCE(SUM(CASE WHEN bytes_state='READBACK_VERIFIED' THEN 1 ELSE 0 END),0) byte_verified,
      COALESCE(SUM(CASE WHEN checksum_state='PASS' THEN 1 ELSE 0 END),0) checksum_pass,
      COALESCE(SUM(CASE WHEN provenance_state='PASS' THEN 1 ELSE 0 END),0) provenance_pass,
      COALESCE(SUM(CASE WHEN rights_verification_state='PASS' THEN 1 ELSE 0 END),0) rights_pass,
      COALESCE(SUM(CASE WHEN bytes_state!='READBACK_VERIFIED' OR checksum_state!='PASS' OR provenance_state!='PASS' THEN 1 ELSE 0 END),0) blocked,
      COALESCE(SUM(actual_bytes),0) bytes_read FROM v7_evaluation_verification_receipts WHERE run_id=?`, verificationRun.id);
    const processed = number(totals?.processed), blocked = number(totals?.blocked), rightsPass = number(totals?.rights_pass);
    const state = processed !== candidateIds.length || blocked > 0 || rightsPass !== processed ? "PARTIAL" : "COMPLETED";
    await run(env.DB, `UPDATE v7_evaluation_verification_runs SET lifecycle_state=?,processed_candidates=?,byte_verified_candidates=?,checksum_pass_candidates=?,provenance_pass_candidates=?,rights_pass_candidates=?,blocked_candidates=?,bytes_read=?,completed_at=? WHERE id=?`, state, processed, totals?.byte_verified, totals?.checksum_pass, totals?.provenance_pass, rightsPass, blocked, totals?.bytes_read, new Date().toISOString(), verificationRun.id);
    const corpus = await projection(env.DB);
    if (formSubmission) {
      const destination = new URL("/video-engine", request.url);
      destination.searchParams.set("corpusPending", String(corpus.pending));
      return new Response(null, { status: 303, headers: { ...NO_STORE, location: destination.toString() } });
    }
    return Response.json({ outcome: "RECORDED", run: await first(env.DB, "SELECT * FROM v7_evaluation_verification_runs WHERE id=?", verificationRun.id), corpus, providerRequests: 0, spendUsd: 0 }, { status: 200, headers: NO_STORE });
  } catch (error) {
    if (error instanceof EvaluationCommandError) return Response.json({ error: { code: error.code, message: error.message }, providerRequests: 0, spendUsd: 0 }, { status: error.status, headers: NO_STORE });
    return Response.json({ error: { code: "CORPUS_VERIFICATION_FAILED", message: error instanceof Error ? error.message : "Corpus verification failed" }, providerRequests: 0, spendUsd: 0 }, { status: 503, headers: NO_STORE });
  }
}
