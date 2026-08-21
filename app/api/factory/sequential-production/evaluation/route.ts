import { getChatGPTUser } from "@/app/chatgpt-auth";
import { canonicalHash } from "@/lib/canonical-json";
import {
  CORPUS_VERIFICATION_MAXIMUM_BATCH,
  CORPUS_VERIFICATION_MAXIMUM_OBJECT_BYTES,
  CORPUS_VERIFICATION_POLICY_VERSION,
  EVALUATION_FOUNDATION_VERSION,
  EVALUATION_OWNER_LABEL_POLICY_VERSION,
  evaluateOwnerLabelSubmission,
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
type DB = { prepare(query: string): Statement; batch(statements: Statement[]): Promise<RunResult[]> };
type StoredObject = { arrayBuffer(): Promise<ArrayBuffer>; size?: number; customMetadata?: Record<string, string> };
type Bucket = { get(key: string): Promise<StoredObject | null> };
type Env = { DB?: DB; BUCKET?: Bucket; FACTORY_EXPERT_EMAILS?: string; FACTORY_AUTOMATION_ACTOR_EMAIL?: string; FACTORY_AUTOMATION_ACTOR_NAME?: string; SEQUENTIAL_EXECUTOR_TOKEN?: string };

class EvaluationCommandError extends Error { constructor(public code: string, public status: number, message: string) { super(message); } }
const clean = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);
const json = <T,>(value: unknown, fallback: T): T => { try { return JSON.parse(clean(value)) as T; } catch { return fallback; } };
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const escapeHtml = (value: unknown) => clean(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
async function runtime() { const { env } = await import("cloudflare:workers"); return env as unknown as Env; }
async function first(db: DB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values).first<Row>(); }
async function rows(db: DB, query: string, ...values: unknown[]) { return (await db.prepare(query).bind(...values).all<Row>()).results ?? []; }
async function run(db: DB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values.map((value) => value === undefined ? null : value)).run(); }
async function sha256(value: ArrayBuffer) { return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", value))).map((part) => part.toString(16).padStart(2, "0")).join(""); }
async function secretMatches(left: string, right: string) { if (!left || !right) return false; const encode = (value: string) => new TextEncoder().encode(value), [a, b] = await Promise.all([crypto.subtle.digest("SHA-256", encode(left)), crypto.subtle.digest("SHA-256", encode(right))]); const av = new Uint8Array(a), bv = new Uint8Array(b); let difference = av.length ^ bv.length; for (let index = 0; index < Math.min(av.length, bv.length); index += 1) difference |= av[index] ^ bv[index]; return difference === 0; }

async function authorized(request: Request, allowAutomation = true) {
  const env = await runtime();
  if (!env.DB || !env.BUCKET) throw new EvaluationCommandError("EVALUATION_RUNTIME_UNAVAILABLE", 503, "Corpus verification requires canonical D1 and R2 bindings");
  let user = await getChatGPTUser();
  if (allowAutomation && !user && await secretMatches(request.headers.get("x-sequential-executor-token") || "", env.SEQUENTIAL_EXECUTOR_TOKEN || "")) {
    const email = clean(env.FACTORY_AUTOMATION_ACTOR_EMAIL); if (email) user = { email, displayName: clean(env.FACTORY_AUTOMATION_ACTOR_NAME) || email, fullName: null };
  }
  if (!user) throw new EvaluationCommandError("SIWC_AUTHENTICATION_REQUIRED", 401, "Owner or scoped sequential automation authentication is required");
  const allowlist = new Set(clean(env.FACTORY_EXPERT_EMAILS).split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
  if (!allowlist.has(user.email.toLowerCase())) throw new EvaluationCommandError("CHANNEL_OWNER_AUTHORIZATION_REQUIRED", 403, "This identity cannot verify the evaluation corpus");
  return { env: env as Required<Pick<Env, "DB" | "BUCKET">> & Env, actor: user.email.toLowerCase() };
}

async function projection(db: DB) {
  const [candidate, runSummary, latestRuns, blockedRows, incidentSummary, rightsRows, rightsReceiptSummary, rightsTasks, labelSummary] = await Promise.all([
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
    rows(db, `SELECT c.candidate_kind,r.rights_basis,json_extract(a.provenance_json,'$.provider') provider
      FROM v7_evaluation_candidates c
      JOIN v7_evaluation_verification_receipts r ON r.id=c.latest_verification_receipt_id
      JOIN production_v2_artifacts a ON c.source_table='production_v2_artifacts' AND a.id=c.source_id
      WHERE c.channel_id=? AND c.verification_state='PARTIAL_RIGHTS_PENDING'
      ORDER BY c.candidate_kind,r.rights_basis`, CHANNEL_ID),
    first(db, "SELECT COUNT(*) accepted FROM v7_evaluation_rights_receipts WHERE channel_id=? AND rights_state='PASS'", CHANNEL_ID),
    rows(db, "SELECT task_type,COUNT(*) count FROM v7_evaluation_rights_evidence_tasks WHERE channel_id=? GROUP BY task_type ORDER BY count DESC,task_type", CHANNEL_ID),
    first(db, `SELECT
      (SELECT COUNT(*) FROM v7_evaluation_owner_label_tasks t WHERE t.channel_id=?) tasks,
      (SELECT COUNT(*) FROM v7_evaluation_owner_label_receipts r WHERE r.channel_id=?) receipts,
      (SELECT COUNT(*) FROM v7_evaluation_owner_label_tasks t WHERE t.channel_id=? AND NOT EXISTS (SELECT 1 FROM v7_evaluation_owner_label_receipts r WHERE r.task_id=t.id)) open_tasks,
      (SELECT COUNT(*) FROM v7_evaluation_candidates c WHERE c.channel_id=? AND c.owner_decision_state='OWNER_CONFIRMED') owner_confirmed,
      (SELECT COUNT(*) FROM v7_evaluation_candidates c WHERE c.channel_id=? AND c.defect_label_state='LABELLED') labelled`, CHANNEL_ID, CHANNEL_ID, CHANNEL_ID, CHANNEL_ID, CHANNEL_ID),
  ]);
  const conflicts = summarizeCorpusEvidenceConflicts(blockedRows.map((row) => ({
    candidateKind: clean(row.candidate_kind), artifactType: clean(row.artifact_type), bytesState: clean(row.bytes_state), checksumState: clean(row.checksum_state),
    provenanceState: clean(row.provenance_state), reconciliationReasonsJson: clean(row.reconciliation_reasons_json),
    candidateDeclaredHash: clean(row.candidate_declared_hash), candidateDeclaredBytes: number(row.candidate_declared_bytes), sourceArtifactId: clean(row.source_artifact_id),
    sourcePackageId: clean(row.source_package_id), sourceHash: clean(row.source_hash), sourceBytes: number(row.source_bytes), sourceEngineVersion: clean(row.source_engine_version),
    computedHash: clean(row.computed_hash), actualBytes: number(row.actual_bytes), objectMetadataJson: clean(row.object_metadata_json),
  })));
  const rightsQueue = summarizeEvaluationRightsQueue(rightsRows.map((row) => ({ candidateKind: clean(row.candidate_kind), rightsBasis: clean(row.rights_basis), provider: clean(row.provider) })));
  return {
    foundationVersion: EVALUATION_FOUNDATION_VERSION,
    policyVersion: CORPUS_VERIFICATION_POLICY_VERSION,
    state: number(candidate?.pending) > 0 ? "CORPUS_VERIFICATION_ACTIVE" : "CORPUS_BYTE_RECONCILIATION_COMPLETE",
    candidates: number(candidate?.candidates), pending: number(candidate?.pending), byteVerified: number(candidate?.byte_verified), checksumPass: number(candidate?.checksum_pass), provenancePass: number(candidate?.provenance_pass), rightsPass: number(candidate?.rights_pass), rightsPending: number(candidate?.rights_pending), blocked: number(candidate?.blocked), excluded: number(candidate?.excluded),
    evidenceIncidents: number(incidentSummary?.incidents), openEvidenceIncidents: number(incidentSummary?.open_incidents), byteDivergenceIncidents: number(incidentSummary?.byte_divergence), metadataReviewRequired: number(incidentSummary?.metadata_review), quarantinedCandidates: number(incidentSummary?.quarantined), metadataBindingsAccepted: number(incidentSummary?.metadata_bindings),
    rightsReceiptsAccepted: number(rightsReceiptSummary?.accepted), rightsBasisCounts: rightsQueue.basisCounts, rightsKindCounts: rightsQueue.kindCounts, rightsProviderCounts: rightsQueue.providerCounts,
    rightsEvidenceTaskCounts: rightsTasks.map((item) => ({ key: clean(item.task_type), count: number(item.count) })),
    ownerLabelPolicyVersion: EVALUATION_OWNER_LABEL_POLICY_VERSION,
    ownerLabelTasks: number(labelSummary?.tasks), ownerLabelReceipts: number(labelSummary?.receipts), ownerLabelOpen: number(labelSummary?.open_tasks),
    ownerConfirmed: number(labelSummary?.owner_confirmed), labelled: number(labelSummary?.labelled),
    runs: number(runSummary?.runs), bytesRead: number(runSummary?.bytes_read), providerRequests: number(runSummary?.provider_requests), spendUsd: number(runSummary?.spend_usd),
    blockedReasonCounts: conflicts.reasonCounts, blockedFactCounts: conflicts.factCounts, blockedStateCounts: conflicts.stateCounts, blockedKindCounts: conflicts.kindCounts, latestRuns,
  };
}

async function nextOwnerLabelTask(db: DB) {
  return first(db, `SELECT t.id task_id,t.candidate_id,t.exact_artifact_hash,t.candidate_kind,t.artifact_type,c.mime_type
    FROM v7_evaluation_owner_label_tasks t
    JOIN v7_evaluation_candidates c ON c.id=t.candidate_id
    WHERE t.channel_id=? AND t.task_state='OPEN'
      AND c.lifecycle_state='CANDIDATE_EVIDENCE' AND c.verification_state='EVIDENCE_VERIFIED'
      AND c.rights_verification_state='PASS' AND c.release_eligible=0
      AND NOT EXISTS (SELECT 1 FROM v7_evaluation_owner_label_receipts r WHERE r.task_id=t.id)
    ORDER BY CASE t.candidate_kind WHEN 'MASTER' THEN 1 WHEN 'AUDIO' THEN 2 WHEN 'PACKAGING' THEN 3 WHEN 'SHOT' THEN 4 ELSE 5 END,t.created_at,t.id LIMIT 1`, CHANNEL_ID);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url), view = clean(url.searchParams.get("view")), artifactCandidateId = clean(url.searchParams.get("artifact"));
    if (["owner-label-task", "owner-label-workflow"].includes(view) || artifactCandidateId) {
      const { env } = await authorized(request, false);
      if (artifactCandidateId) {
        const item = await first(env.DB, `SELECT c.id,c.storage_key,c.mime_type,c.content_hash,t.exact_artifact_hash
          FROM v7_evaluation_candidates c JOIN v7_evaluation_owner_label_tasks t ON t.candidate_id=c.id
          WHERE c.channel_id=? AND c.id=? AND c.lifecycle_state='CANDIDATE_EVIDENCE' AND c.verification_state='EVIDENCE_VERIFIED'
            AND c.rights_verification_state='PASS' AND c.release_eligible=0 AND t.exact_artifact_hash=c.content_hash LIMIT 1`, CHANNEL_ID, artifactCandidateId);
        if (!item) throw new EvaluationCommandError("OWNER_LABEL_ARTIFACT_NOT_ELIGIBLE", 404, "The requested artifact is not eligible for owner labeling");
        const object = await env.BUCKET.get(clean(item.storage_key));
        if (!object) throw new EvaluationCommandError("OWNER_LABEL_ARTIFACT_MISSING", 404, "The exact R2 artifact could not be read");
        const bytes = await object.arrayBuffer(), computedHash = await sha256(bytes);
        if (computedHash !== clean(item.exact_artifact_hash).toLowerCase()) throw new EvaluationCommandError("OWNER_LABEL_ARTIFACT_HASH_MISMATCH", 409, "R2 bytes no longer match the owner-label task hash");
        return new Response(bytes, { headers: { ...NO_STORE, "content-type": clean(item.mime_type) || "application/octet-stream", "content-disposition": "inline; filename=owner-label-artifact" } });
      }
      const task = await nextOwnerLabelTask(env.DB), taxonomy = await rows(env.DB, "SELECT id,defect_key,label,severity,modality,description FROM v7_evaluation_defect_taxonomy WHERE active=1 ORDER BY severity,defect_key");
      if (view === "owner-label-workflow") {
        const recorded = url.searchParams.get("recorded") === "1", artifactUrl = task ? `/api/factory/sequential-production/evaluation?artifact=${encodeURIComponent(clean(task.candidate_id))}` : "";
        const mime = clean(task?.mime_type), artifact = !task ? ""
          : mime.startsWith("audio/") ? `<audio controls preload="metadata" src="${artifactUrl}"></audio>`
          : mime.startsWith("video/") ? `<video controls preload="metadata" src="${artifactUrl}"></video>`
          : mime.startsWith("image/") ? `<img src="${artifactUrl}" alt="Candidate artifact">`
          : `<a href="${artifactUrl}" target="_blank" rel="noreferrer">Open exact artifact</a>`;
        const fields = taxonomy.map((item) => `<label class="tax"><span><b>${escapeHtml(item.label)}</b><small>${escapeHtml(item.severity)} · ${escapeHtml(item.modality)}</small><em>${escapeHtml(item.description)}</em></span><select name="label__${escapeHtml(item.defect_key)}" required><option value="">Unclassified</option><option value="PRESENT">Present</option><option value="ABSENT">Absent</option><option value="NOT_APPLICABLE">Not applicable</option></select></label>`).join("");
        const content = task ? `<div class="artifact"><div><small>${escapeHtml(task.candidate_kind)} · ${escapeHtml(task.artifact_type)}</small><b>${escapeHtml(mime)}</b><code>${escapeHtml(task.exact_artifact_hash)}</code></div>${artifact}</div><form method="post" action="/api/factory/sequential-production/evaluation"><input type="hidden" name="action" value="RECORD_OWNER_LABEL_RECEIPT"><input type="hidden" name="taskId" value="${escapeHtml(task.task_id)}"><input type="hidden" name="candidateId" value="${escapeHtml(task.candidate_id)}"><input type="hidden" name="expectedArtifactHash" value="${escapeHtml(task.exact_artifact_hash)}"><input type="hidden" name="idempotencyKey" value="owner-label:${escapeHtml(task.task_id)}"><div class="fields"><label><span>Owner decision</span><select name="decisionState" required><option value="">Select a decision</option><option value="REJECTED_DEFECT_PRESENT">Rejected — defect present</option><option value="CLEAN_NEGATIVE_CONTROL">Clean negative control</option><option value="EXCLUDE_UNUSABLE">Exclude unusable evidence</option></select></label><label><span>Rationale</span><textarea name="rationale" required minlength="12" maxlength="2000" placeholder="State the observable basis for this decision."></textarea></label></div><div class="taxonomy">${fields}</div><footer><span>${taxonomy.length} active defect families · no fixture promotion</span><button type="submit">Record immutable receipt</button></footer></form>` : `<p class="notice">No open rights-PASS owner-label task is currently eligible.</p>`;
        return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Owner label workflow</title><style>*{box-sizing:border-box}body{margin:0;padding:18px;background:#101f19;color:#d9e8e1;font:13px Arial,sans-serif}header,footer{display:flex;align-items:center;justify-content:space-between;gap:16px}h2{margin:5px 0 6px;font:600 25px Georgia,serif}p,small,span{color:#8ca39a;font-size:11px;line-height:1.45}.artifact{display:grid;grid-template-columns:minmax(220px,.6fr) minmax(0,1.4fr);gap:16px;align-items:center;margin-top:16px;padding:14px;border-radius:11px;background:#0b1712}.artifact b,.artifact code{display:block;margin-top:6px}.artifact code{overflow-wrap:anywhere;color:#8fb8a7;font-size:9px}audio,video,img{display:block;width:100%;max-height:340px;object-fit:contain;border-radius:9px;background:#050a08}.fields{display:grid;grid-template-columns:.65fr 1.35fr;gap:10px;margin-top:12px}label{display:grid;gap:6px}select,textarea{width:100%;border:1px solid #39584c;border-radius:8px;background:#0b1712;color:#d9e8e1;padding:10px}textarea{min-height:82px;resize:vertical}.taxonomy{display:grid;gap:7px;margin:12px 0}.tax{grid-template-columns:minmax(0,1fr) 190px;align-items:center;padding:10px;border:1px solid #294238;border-radius:9px}.tax b,.tax small,.tax em{display:block}.tax em{margin-top:3px;color:#789087;font-size:9px;font-style:normal}button{min-height:38px;padding:0 14px;border:0;border-radius:9px;background:#a8e8ca;color:#09291e;font-weight:800;cursor:pointer}.notice{padding:10px;border-radius:8px;background:#172b23}@media(max-width:680px){header,footer{align-items:stretch;flex-direction:column}.artifact,.fields,.tax{grid-template-columns:1fr}}</style></head><body><header><div><small>Owner-label workflow</small><h2>Bind judgment to exact artifact bytes</h2><p>Only rights-PASS evidence enters this queue. Every active defect family requires an explicit classification.</p></div></header>${recorded ? '<p class="notice">Immutable owner-label receipt recorded. The next eligible task is shown.</p>' : ""}${content}</body></html>`, { headers: { ...NO_STORE, "content-type": "text/html; charset=utf-8", "x-frame-options": "SAMEORIGIN" } });
      }
      return Response.json({ policyVersion: EVALUATION_OWNER_LABEL_POLICY_VERSION, task: task ? {
        taskId: clean(task.task_id), candidateId: clean(task.candidate_id), exactArtifactHash: clean(task.exact_artifact_hash), candidateKind: clean(task.candidate_kind), artifactType: clean(task.artifact_type), mimeType: clean(task.mime_type),
        artifactUrl: `/api/factory/sequential-production/evaluation?artifact=${encodeURIComponent(clean(task.candidate_id))}`,
      } : null, taxonomy: taxonomy.map((item) => ({ id: clean(item.id), defectKey: clean(item.defect_key), label: clean(item.label), severity: clean(item.severity), modality: clean(item.modality), description: clean(item.description) })) }, { headers: NO_STORE });
    }
    const env = await runtime(); if (!env.DB) throw new EvaluationCommandError("CANONICAL_DATABASE_UNAVAILABLE", 503, "Canonical D1 is unavailable"); return Response.json(await projection(env.DB), { headers: NO_STORE });
  }
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
    const contentType = request.headers.get("content-type")?.toLowerCase() || "", formSubmission = contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data");
    if (!formSubmission && !contentType.includes("application/json")) throw new EvaluationCommandError("COMMAND_CONTENT_TYPE_REQUIRED", 415, "Use application/json or an owner-bound form submission");
    const body = formSubmission ? Object.fromEntries(await request.formData()) : await request.json().catch(() => null) as Row | null, action = clean(body?.action).toUpperCase();
    const { env, actor } = await authorized(request, action !== "RECORD_OWNER_LABEL_RECEIPT");
    if (!["RUN_CORPUS_VERIFICATION_BATCH", "RECORD_OWNER_LABEL_RECEIPT"].includes(action)) throw new EvaluationCommandError("EVALUATION_ACTION_INVALID", 400, "Use RUN_CORPUS_VERIFICATION_BATCH or RECORD_OWNER_LABEL_RECEIPT");
    const idempotencyKey = clean(request.headers.get("idempotency-key") || (formSubmission ? body?.idempotencyKey : ""));
    if (idempotencyKey.length < 16 || idempotencyKey.length > 160) throw new EvaluationCommandError("IDEMPOTENCY_KEY_INVALID", 400, "A 16–160 character idempotency-key is required");
    if (action === "RECORD_OWNER_LABEL_RECEIPT") {
      const taskId = clean(body?.taskId), candidateId = clean(body?.candidateId), expectedArtifactHash = clean(body?.expectedArtifactHash).toLowerCase(), decisionState = clean(body?.decisionState), rationale = clean(body?.rationale);
      const labels = formSubmission ? Object.entries(body ?? {}).filter(([key]) => key.startsWith("label__")).map(([key, status]) => ({ defectKey: key.slice(7), status: clean(status), confidence: clean(status) === "NOT_APPLICABLE" ? undefined : 1 }))
        : Array.isArray(body?.labels) ? body.labels.map((item) => item && typeof item === "object" ? item as Row : {}) : [];
      const requestIntent = { action, taskId, candidateId, expectedArtifactHash, decisionState, rationale, labels, policyVersion: EVALUATION_OWNER_LABEL_POLICY_VERSION };
      const requestHash = await canonicalHash(requestIntent);
      const prior = await first(env.DB, "SELECT * FROM v7_evaluation_owner_label_receipts WHERE channel_id=? AND idempotency_key=? LIMIT 1", CHANNEL_ID, idempotencyKey);
      if (prior) {
        if (clean(prior.request_hash) !== requestHash) throw new EvaluationCommandError("IDEMPOTENCY_INTENT_CONFLICT", 409, "The idempotency key is already bound to a different owner-label intent");
        return Response.json({ outcome: "REPLAYED", receipt: prior, corpus: await projection(env.DB), providerRequests: 0, spendUsd: 0 }, { headers: NO_STORE });
      }
      const task = await first(env.DB, `SELECT t.*,c.content_hash,c.rights_verification_state,c.verification_state,c.lifecycle_state,c.release_eligible
        FROM v7_evaluation_owner_label_tasks t JOIN v7_evaluation_candidates c ON c.id=t.candidate_id
        WHERE t.id=? AND t.channel_id=? AND t.candidate_id=? LIMIT 1`, taskId, CHANNEL_ID, candidateId);
      if (!task) throw new EvaluationCommandError("OWNER_LABEL_TASK_NOT_FOUND", 404, "The exact owner-label task was not found");
      const existingTaskReceipt = await first(env.DB, "SELECT * FROM v7_evaluation_owner_label_receipts WHERE task_id=? LIMIT 1", taskId);
      if (existingTaskReceipt) throw new EvaluationCommandError("OWNER_LABEL_TASK_ALREADY_RESOLVED", 409, "This owner-label task already has an immutable receipt");
      const taxonomy = await rows(env.DB, "SELECT id,defect_key,label,severity,modality FROM v7_evaluation_defect_taxonomy WHERE active=1 ORDER BY defect_key");
      const validation = evaluateOwnerLabelSubmission({ taskArtifactHash: clean(task.exact_artifact_hash), expectedArtifactHash, rightsVerificationState: clean(task.rights_verification_state), verificationState: clean(task.verification_state), lifecycleState: clean(task.lifecycle_state), releaseEligible: Boolean(number(task.release_eligible)), decisionState, rationale, activeDefectKeys: taxonomy.map((item) => clean(item.defect_key)), labels: labels.map((item) => ({ defectKey: clean(item.defectKey), status: clean(item.status), confidence: item.confidence === undefined ? undefined : number(item.confidence) })) });
      if (!validation.eligible) throw new EvaluationCommandError("OWNER_LABEL_SUBMISSION_INVALID", 409, validation.reasons.join("; "));
      const normalizedLabels = labels.map((item) => ({ defectKey: clean(item.defectKey), status: clean(item.status), confidence: clean(item.status) === "NOT_APPLICABLE" ? null : number(item.confidence) })).sort((left, right) => left.defectKey.localeCompare(right.defectKey));
      const taxonomyManifest = taxonomy.map((item) => ({ defectKey: clean(item.defect_key), label: clean(item.label), severity: clean(item.severity), modality: clean(item.modality) }));
      const taxonomyManifestHash = await canonicalHash(taxonomyManifest), receiptId = id("evaluation-owner-label-receipt");
      const evidenceHash = await canonicalHash({ policyVersion: EVALUATION_OWNER_LABEL_POLICY_VERSION, taskId, candidateId, exactArtifactHash: expectedArtifactHash, decisionState, rationale, labels: normalizedLabels, taxonomyManifestHash, actor });
      const statements: Statement[] = [env.DB.prepare(`INSERT INTO v7_evaluation_owner_label_receipts
        (id,channel_id,task_id,candidate_id,exact_artifact_hash,decision_state,rationale,labels_json,taxonomy_version,taxonomy_manifest_hash,present_count,absent_count,not_applicable_count,idempotency_key,request_hash,evidence_hash,actor)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(receiptId, CHANNEL_ID, taskId, candidateId, expectedArtifactHash, decisionState, rationale, JSON.stringify(normalizedLabels), "EVALUATION_DEFECT_TAXONOMY_V1", taxonomyManifestHash, validation.presentCount, validation.absentCount, validation.notApplicableCount, idempotencyKey, requestHash, evidenceHash, actor)];
      const taxonomyByKey = new Map(taxonomy.map((item) => [clean(item.defect_key), clean(item.id)]));
      for (const label of normalizedLabels.filter((item) => item.status !== "NOT_APPLICABLE")) statements.push(env.DB.prepare(`INSERT INTO v7_evaluation_defect_labels (id,candidate_id,defect_id,label_source,polarity,confidence,evidence_hash,actor) VALUES (?,?,?,?,?,?,?,?)`).bind(id("evaluation-defect-label"), candidateId, taxonomyByKey.get(label.defectKey), "OWNER", label.status, label.confidence, evidenceHash, actor));
      statements.push(env.DB.prepare(`UPDATE v7_evaluation_candidates SET owner_decision_state='OWNER_CONFIRMED',defect_label_state='LABELLED',lifecycle_state=CASE WHEN ?='EXCLUDE_UNUSABLE' THEN 'EXCLUDED' ELSE lifecycle_state END,verification_state=CASE WHEN ?='EXCLUDE_UNUSABLE' THEN 'EXCLUDED' ELSE verification_state END,exclusion_reason=CASE WHEN ?='EXCLUDE_UNUSABLE' THEN 'OWNER_EXCLUDED_UNUSABLE_EVALUATION_EVIDENCE' ELSE exclusion_reason END,qualification_eligible=0 WHERE id=? AND release_eligible=0`).bind(decisionState, decisionState, decisionState, candidateId));
      await env.DB.batch(statements);
      const durable = await first(env.DB, "SELECT * FROM v7_evaluation_owner_label_receipts WHERE id=?", receiptId);
      if (!durable) throw new EvaluationCommandError("OWNER_LABEL_RECEIPT_NOT_DURABLE", 503, "The owner-label receipt could not be read back from D1");
      if (formSubmission) return new Response(null, { status: 303, headers: { ...NO_STORE, location: new URL("/api/factory/sequential-production/evaluation?view=owner-label-workflow&recorded=1", request.url).toString() } });
      return Response.json({ outcome: "RECORDED", receipt: durable, corpus: await projection(env.DB), providerRequests: 0, spendUsd: 0 }, { headers: NO_STORE });
    }
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
