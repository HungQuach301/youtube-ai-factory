import { getChatGPTUser } from "@/app/chatgpt-auth";
import { canonicalHash } from "@/lib/canonical-json";
import { discoverProviderHistoryAuthorized, hashProviderHistoryAudioAuthorized, providerAudioHashSnapshot } from "@/app/api/factory/sequential-production/evaluation/provider-history/route";
import {
  CORPUS_VERIFICATION_MAXIMUM_BATCH,
  CORPUS_VERIFICATION_MAXIMUM_OBJECT_BYTES,
  CORPUS_VERIFICATION_POLICY_VERSION,
  EVALUATION_FOUNDATION_VERSION,
  EVALUATION_OWNER_LABEL_POLICY_VERSION,
  EVALUATION_OWNER_REVIEW_UX_VERSION,
  evaluateOwnerLabelSubmission,
  isOwnerObservableDefect,
  normalizeOwnerLabelsForReceipt,
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
type Env = { DB?: DB; BUCKET?: Bucket; ELEVENLABS_API_KEY?: string; FACTORY_EXPERT_EMAILS?: string; FACTORY_AUTOMATION_ACTOR_EMAIL?: string; FACTORY_AUTOMATION_ACTOR_NAME?: string; SEQUENTIAL_EXECUTOR_TOKEN?: string };

class EvaluationCommandError extends Error { constructor(public code: string, public status: number, message: string) { super(message); } }
const clean = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);
const json = <T,>(value: unknown, fallback: T): T => { try { return JSON.parse(clean(value)) as T; } catch { return fallback; } };
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const escapeHtml = (value: unknown) => clean(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const OWNER_DEFECT_COPY: Record<string, { label: string; description: string }> = {
  SAFETY_SCOPE_ESCAPE: { label: "Nội dung tài chính không an toàn", description: "Có lời khuyên cá nhân hóa, cam kết kết quả hoặc khẳng định không được chứng minh." },
  SEMANTIC_VISUAL_CONTRADICTION: { label: "Hình ảnh mâu thuẫn với lời đọc", description: "Hình thể hiện sai đối tượng, hướng hoặc ý nghĩa so với phần lời." },
  AUDIO_VIDEO_SYNC: { label: "Hình và tiếng bị lệch", description: "Âm thanh không khớp với sự kiện hoặc nội dung đang hiển thị." },
  PRODUCTION_RESIDUE: { label: "Lộ dấu vết sản xuất", description: "Còn prompt, URL, tên file, nhãn QA, khung debug hoặc nội dung thừa." },
  NEAR_STATIC_MOTION: { label: "Hình gần như đứng yên quá lâu", description: "Cảnh thiếu chuyển động có ý nghĩa hoặc giữ một hình quá lâu." },
  AUDIO_SEAM: { label: "Âm thanh bị nối hoặc ngắt bất thường", description: "Có tiếng giật, điểm nối, khoảng ngắt gãy hoặc chuyển nhạc đột ngột." },
  MOBILE_LEGIBILITY: { label: "Chữ hoặc biểu đồ khó đọc", description: "Thông tin quan trọng quá nhỏ, rối hoặc thiếu tương phản trên màn hình điện thoại." },
  TRANSACTION_STATE_CONFLATION: { label: "Giải thích sai trạng thái giao dịch", description: "Nội dung trộn lẫn authorization, clearing, settlement hoặc trách nhiệm các bên." },
  PACKAGING_PROMISE_MISMATCH: { label: "Tiêu đề/thumbnail hứa khác nội dung", description: "Nội dung không thực hiện đúng lời hứa hoặc phóng đại thông tin đóng gói." },
};
const OWNER_KIND_COPY: Record<string, { label: string; instruction: string }> = {
  MASTER: { label: "Video hoàn chỉnh", instruction: "Xem từ đầu đến cuối; chú ý nội dung, hình ảnh, âm thanh và độ đồng bộ." },
  AUDIO: { label: "Giọng đọc / âm thanh", instruction: "Nghe toàn bộ; chú ý phát âm, nhịp nghỉ, điểm nối và tiếng bất thường." },
  SHOT: { label: "Cảnh hình", instruction: "Kiểm tra hình có đúng nghĩa, đủ chuyển động, dễ đọc và không lộ dấu vết sản xuất." },
  CLIP: { label: "Đoạn video", instruction: "Xem trọn đoạn; kiểm tra hình, tiếng, nội dung và độ đồng bộ." },
  PACKAGING: { label: "Tiêu đề / thumbnail", instruction: "Kiểm tra lời hứa có rõ ràng, dễ đọc và đúng với nội dung video." },
};
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
  const [candidate, runSummary, latestRuns, blockedRows, incidentSummary, rightsRows, rightsReceiptSummary, rightsTasks, rightsLineageDiagnostic, providerBindingDiagnostic, labelSummary, correlationSummary] = await Promise.all([
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
    first(db, `SELECT policy_version,tasks_diagnosed,composite_tasks,authorship_tasks,source_lineage_binding_missing,source_lineage_declared_unverified,
      rights_pass_authority,dataset_sealing_authority,assurance_qualification_authority,release_authority,provider_requests,spend_usd
      FROM v7_evaluation_rights_lineage_diagnostic_snapshots WHERE channel_id=? AND policy_version='EVALUATION_RIGHTS_LINEAGE_DIAGNOSTIC_V1' LIMIT 1`, CHANNEL_ID),
    first(db, `SELECT policy_version,tasks_diagnosed,legacy_synthetic_bindings,request_binding_missing,request_binding_ambiguous,
      provider_native_response_ids_verified,terms_plan_evidence_verified,rights_pass_authority,dataset_sealing_authority,assurance_qualification_authority,release_authority,provider_requests,spend_usd
      FROM v7_evaluation_provider_binding_diagnostic_snapshots WHERE channel_id=? AND policy_version='EVALUATION_PROVIDER_BINDING_DIAGNOSTIC_V1' LIMIT 1`, CHANNEL_ID),
    first(db, `SELECT
      (SELECT COUNT(*) FROM v7_evaluation_owner_label_tasks t WHERE t.channel_id=?) tasks,
      (SELECT COUNT(*) FROM v7_evaluation_owner_label_receipts r WHERE r.channel_id=?) receipts,
      (SELECT COUNT(*) FROM v7_evaluation_owner_label_tasks t WHERE t.channel_id=? AND NOT EXISTS (SELECT 1 FROM v7_evaluation_owner_label_receipts r WHERE r.task_id=t.id)) open_tasks,
      (SELECT COUNT(*) FROM v7_evaluation_candidates c WHERE c.channel_id=? AND c.owner_decision_state='OWNER_CONFIRMED') owner_confirmed,
      (SELECT COUNT(*) FROM v7_evaluation_candidates c WHERE c.channel_id=? AND c.defect_label_state='LABELLED') labelled`, CHANNEL_ID, CHANNEL_ID, CHANNEL_ID, CHANNEL_ID, CHANNEL_ID),
    first(db, `SELECT s.candidate_count,s.primary_representative_count,s.exact_duplicate_deferred_count,s.correlated_variant_deferred_count,s.independent_count_eligible,
      (SELECT COUNT(*) FROM v7_evaluation_correlation_items i
        JOIN v7_evaluation_owner_label_tasks t ON t.candidate_id=i.candidate_id
        WHERE i.snapshot_id=s.id AND i.attention_state='READY_PRIMARY'
          AND NOT EXISTS (SELECT 1 FROM v7_evaluation_owner_label_receipts r WHERE r.task_id=t.id)) actionable_open
      FROM v7_evaluation_correlation_snapshots s WHERE s.channel_id=? AND s.policy_version='EVALUATION_CORRELATION_CONTROL_V1' LIMIT 1`, CHANNEL_ID),
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
    rightsLineageDiagnostic: rightsLineageDiagnostic ? {
      policyVersion: clean(rightsLineageDiagnostic.policy_version), tasksDiagnosed: number(rightsLineageDiagnostic.tasks_diagnosed), compositeTasks: number(rightsLineageDiagnostic.composite_tasks), authorshipTasks: number(rightsLineageDiagnostic.authorship_tasks),
      sourceLineageBindingMissing: number(rightsLineageDiagnostic.source_lineage_binding_missing), sourceLineageDeclaredUnverified: number(rightsLineageDiagnostic.source_lineage_declared_unverified),
      rightsPassAuthority: Boolean(number(rightsLineageDiagnostic.rights_pass_authority)), datasetSealingAuthority: Boolean(number(rightsLineageDiagnostic.dataset_sealing_authority)), assuranceQualificationAuthority: Boolean(number(rightsLineageDiagnostic.assurance_qualification_authority)), releaseAuthority: Boolean(number(rightsLineageDiagnostic.release_authority)),
      providerRequests: number(rightsLineageDiagnostic.provider_requests), spendUsd: number(rightsLineageDiagnostic.spend_usd),
    } : null,
    providerBindingDiagnostic: providerBindingDiagnostic ? {
      policyVersion: clean(providerBindingDiagnostic.policy_version), tasksDiagnosed: number(providerBindingDiagnostic.tasks_diagnosed), legacySyntheticBindings: number(providerBindingDiagnostic.legacy_synthetic_bindings),
      requestBindingMissing: number(providerBindingDiagnostic.request_binding_missing), requestBindingAmbiguous: number(providerBindingDiagnostic.request_binding_ambiguous), providerNativeResponseIdsVerified: number(providerBindingDiagnostic.provider_native_response_ids_verified), termsPlanEvidenceVerified: number(providerBindingDiagnostic.terms_plan_evidence_verified),
      rightsPassAuthority: Boolean(number(providerBindingDiagnostic.rights_pass_authority)), datasetSealingAuthority: Boolean(number(providerBindingDiagnostic.dataset_sealing_authority)), assuranceQualificationAuthority: Boolean(number(providerBindingDiagnostic.assurance_qualification_authority)), releaseAuthority: Boolean(number(providerBindingDiagnostic.release_authority)),
      providerRequests: number(providerBindingDiagnostic.provider_requests), spendUsd: number(providerBindingDiagnostic.spend_usd),
    } : null,
    ownerLabelPolicyVersion: EVALUATION_OWNER_LABEL_POLICY_VERSION,
    ownerReviewUxVersion: EVALUATION_OWNER_REVIEW_UX_VERSION,
    ownerLabelTasks: number(labelSummary?.tasks), ownerLabelReceipts: number(labelSummary?.receipts), ownerLabelOpen: number(labelSummary?.open_tasks),
    ownerConfirmed: number(labelSummary?.owner_confirmed), labelled: number(labelSummary?.labelled),
    correlationPolicyVersion: "EVALUATION_CORRELATION_CONTROL_V1",
    correlationCandidates: number(correlationSummary?.candidate_count), ownerLabelActionable: number(correlationSummary?.actionable_open),
    primaryRepresentatives: number(correlationSummary?.primary_representative_count), exactDuplicatesDeferred: number(correlationSummary?.exact_duplicate_deferred_count),
    correlatedVariantsDeferred: number(correlationSummary?.correlated_variant_deferred_count), independentCountEligible: number(correlationSummary?.independent_count_eligible),
    runs: number(runSummary?.runs), bytesRead: number(runSummary?.bytes_read), providerRequests: number(runSummary?.provider_requests), spendUsd: number(runSummary?.spend_usd),
    blockedReasonCounts: conflicts.reasonCounts, blockedFactCounts: conflicts.factCounts, blockedStateCounts: conflicts.stateCounts, blockedKindCounts: conflicts.kindCounts, latestRuns,
  };
}

async function nextOwnerLabelTask(db: DB) {
  return first(db, `SELECT t.id task_id,t.candidate_id,t.exact_artifact_hash,t.candidate_kind,t.artifact_type,c.mime_type,i.queue_role,i.relation_class
    FROM v7_evaluation_owner_label_tasks t
    JOIN v7_evaluation_candidates c ON c.id=t.candidate_id
    JOIN v7_evaluation_correlation_items i ON i.candidate_id=t.candidate_id AND i.policy_version='EVALUATION_CORRELATION_CONTROL_V1'
    JOIN v7_evaluation_factory_qa_tasks q ON q.owner_task_id=t.id AND q.policy_version='FACTORY_FIRST_QA_POLICY_V1'
    JOIN v7_evaluation_factory_qa_receipts f ON f.task_id=q.id AND f.owner_attention_state IN ('OWNER_REQUIRED','OWNER_EXCEPTION')
    WHERE t.channel_id=? AND t.task_state='OPEN'
      AND c.lifecycle_state='CANDIDATE_EVIDENCE' AND c.verification_state='EVIDENCE_VERIFIED'
      AND c.rights_verification_state='PASS' AND c.release_eligible=0
      AND i.attention_state='READY_PRIMARY' AND i.independent_count_eligible=1
      AND NOT EXISTS (SELECT 1 FROM v7_evaluation_owner_label_receipts r WHERE r.task_id=t.id)
    ORDER BY CASE t.candidate_kind WHEN 'MASTER' THEN 1 WHEN 'AUDIO' THEN 2 WHEN 'PACKAGING' THEN 3 WHEN 'SHOT' THEN 4 ELSE 5 END,t.created_at,t.id LIMIT 1`, CHANNEL_ID);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url), view = clean(url.searchParams.get("view")), artifactCandidateId = clean(url.searchParams.get("artifact"));
    if (["owner-label-task", "owner-label-workflow", "provider-history-recovery"].includes(view) || artifactCandidateId) {
      const { env } = await authorized(request, false);
      if (view === "provider-history-recovery") {
        const recorded = url.searchParams.get("recorded") === "1", audioHashed = url.searchParams.get("audioHashed") === "1";
        const snapshot = await first(env.DB, `SELECT policy_version,history_items_received,history_items_with_native_request_id,candidates_diagnosed,unique_metadata_matches,no_metadata_matches,ambiguous_metadata_matches,subscription_tier,subscription_status,current_subscription_only,historical_plan_coverage_verified,rights_pass_authority,dataset_sealing_authority,assurance_qualification_authority,release_authority,provider_requests,spend_usd,created_at FROM v7_evaluation_provider_history_snapshots WHERE channel_id=? ORDER BY created_at DESC LIMIT 1`, CHANNEL_ID);
        const audioSnapshot = await providerAudioHashSnapshot(env.DB);
        const fixturePlan = await first(env.DB, `SELECT lifecycle_state,target_fixture_count,defect_positive_count,clean_negative_count,p0_families_planned,p0_families_required,materialized_fixture_count,provider_requests,spend_usd FROM v7_evaluation_controlled_fixture_plan_registry WHERE channel_id=? AND policy_version='CONTROLLED_FIXTURE_PLAN_V1' LIMIT 1`, CHANNEL_ID);
        const historicalRecoveryClosed = audioSnapshot?.lifecycleState === "COMPLETE"
          && audioSnapshot.historyItemsHashVerified === audioSnapshot.historyItemsTotal
          && audioSnapshot.uniqueExactHashMatches === 0
          && audioSnapshot.equivalentExactHashMatchSets === 0
          && audioSnapshot.noExactHashMatches === audioSnapshot.candidatesDiagnosed;
        const metadataResult = snapshot ? `<section class="result"><h2>1. Metadata snapshot</h2><dl><div><dt>History items</dt><dd>${number(snapshot.history_items_received)}</dd></div><div><dt>Có request ID</dt><dd>${number(snapshot.history_items_with_native_request_id)}</dd></div><div><dt>Candidate</dt><dd>${number(snapshot.candidates_diagnosed)}</dd></div><div><dt>Khớp metadata duy nhất</dt><dd>${number(snapshot.unique_metadata_matches)}</dd></div><div><dt>Không khớp</dt><dd>${number(snapshot.no_metadata_matches)}</dd></div><div><dt>Mơ hồ</dt><dd>${number(snapshot.ambiguous_metadata_matches)}</dd></div><div><dt>Gói hiện tại</dt><dd>${escapeHtml(snapshot.subscription_tier)} · ${escapeHtml(snapshot.subscription_status)}</dd></div><div><dt>Provider requests</dt><dd>${number(snapshot.provider_requests)}</dd></div></dl></section>` : `<form method="post" action="/api/factory/sequential-production/evaluation"><input type="hidden" name="action" value="DISCOVER_ELEVENLABS_HISTORY_METADATA"><input type="hidden" name="idempotencyKey" value="provider-history-discovery-2026-08-22-v1"><button type="submit">Chạy khám phá metadata</button></form>`;
        const audioResult = !snapshot ? "" : `<section class="result"><h2>2. Exact audio hash</h2>${audioSnapshot ? `<dl><div><dt>Trạng thái</dt><dd>${escapeHtml(audioSnapshot.lifecycleState)}</dd></div><div><dt>Audio hash đã xác minh</dt><dd>${audioSnapshot.historyItemsHashVerified}/${audioSnapshot.historyItemsTotal}</dd></div><div><dt>Còn retry</dt><dd>${audioSnapshot.historyItemsRetryable}</dd></div><div><dt>Hết retry</dt><dd>${audioSnapshot.historyItemsExhausted}</dd></div><div><dt>Candidate khớp duy nhất</dt><dd>${audioSnapshot.uniqueExactHashMatches}</dd></div><div><dt>Candidate cùng bytes/nhiều request</dt><dd>${audioSnapshot.equivalentExactHashMatchSets}</dd></div><div><dt>Candidate chưa khớp</dt><dd>${audioSnapshot.noExactHashMatches}</dd></div><div><dt>Provider reads</dt><dd>${audioSnapshot.providerRequestsCumulative}</dd></div></dl>` : '<p>Chưa tải audio lịch sử để đối chiếu exact bytes.</p>'}${!audioSnapshot || audioSnapshot.lifecycleState === "IN_PROGRESS" ? '<button id="hashAudio" type="button">Xác minh exact audio hash</button><p id="hashProgress" class="progress" aria-live="polite"></p>' : ""}</section>`;
        const conclusion = historicalRecoveryClosed ? `<section class="result conclusion"><small>KẾT LUẬN FAIL-CLOSED</small><h2>Không thể phục hồi 46 audio cũ</h2><p>Không candidate nào trùng exact bytes với 66 audio còn trong history. Factory đã đóng nhánh suy luận, giữ toàn bộ candidate cũ trong quarantine làm failure evidence và không cấp rights hay qualification.</p>${fixturePlan ? `<h3>Đường thay thế đã seal</h3><dl><div><dt>Blueprint chuẩn</dt><dd>${number(fixturePlan.target_fixture_count)}</dd></div><div><dt>Mẫu lỗi</dt><dd>${number(fixturePlan.defect_positive_count)}</dd></div><div><dt>Clean controls</dt><dd>${number(fixturePlan.clean_negative_count)}</dd></div><div><dt>P0 được phủ</dt><dd>${number(fixturePlan.p0_families_planned)}/${number(fixturePlan.p0_families_required)}</dd></div><div><dt>Đã materialize</dt><dd>${number(fixturePlan.materialized_fixture_count)}</dd></div><div><dt>Chi phí thiết kế</dt><dd>$${number(fixturePlan.spend_usd).toFixed(2)}</dd></div></dl><p>Checkpoint tiếp theo sẽ materialize các fixture mới bằng write path đã hardened: provider-native request ID, exact response SHA-256, R2 read-back, rights receipt và owner ground truth.</p>` : ""}</section>` : "";
        const script = snapshot && (!audioSnapshot || audioSnapshot.lifecycleState === "IN_PROGRESS") ? `<script>(()=>{const button=document.getElementById('hashAudio'),progress=document.getElementById('hashProgress');if(!button)return;button.addEventListener('click',async()=>{button.disabled=true;for(let index=1;index<=10;index+=1){progress.textContent='Đang xử lý batch '+index+'/10…';const key='provider-audio-hash-recovery-v1-batch-'+String(index).padStart(2,'0');try{const response=await fetch('/api/factory/sequential-production/evaluation',{method:'POST',headers:{'content-type':'application/json','idempotency-key':key},body:JSON.stringify({action:'HASH_ELEVENLABS_HISTORY_AUDIO'})});const payload=await response.json();if(!response.ok)throw new Error(payload?.error?.message||'Không thể xác minh audio');const state=payload?.snapshot?.lifecycleState;if(state&&state!=='IN_PROGRESS'){location.assign('/api/factory/sequential-production/evaluation?view=provider-history-recovery&audioHashed=1');return}}catch(error){progress.textContent=error instanceof Error?error.message:'Không thể xác minh audio';button.disabled=false;return}}progress.textContent='Đã đạt trần 10 batch; Factory dừng an toàn.';button.disabled=false})})();</script>` : "";
        return new Response(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Khôi phục evidence provider</title><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#101f19;color:#d9e8e1;font:15px Arial,sans-serif}main{max-width:900px;margin:4vh auto;padding:28px;border:1px solid #365349;border-radius:18px;background:#13271f}small{color:#a8e8ca;font-weight:800}h1,h2{font-family:Georgia,serif}p,li,dt{color:#a9bdb5;line-height:1.6}.scope,.result{margin:22px 0;padding:18px;border-radius:14px;background:#0b1712}.scope strong{color:#d9f7e9}.conclusion{border:1px solid #9c6a3e;background:#241d12}.conclusion h3{margin-top:22px;color:#f0d5b2}button{min-height:48px;padding:0 18px;border:0;border-radius:10px;background:#a8e8ca;color:#09291e;font-weight:800;cursor:pointer}button:disabled{opacity:.55}dl{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}dl div{padding:12px;border:1px solid #294238;border-radius:10px;background:#102019}dt{font-size:11px}dd{margin:6px 0 0;font-size:22px;font-weight:800}.notice{padding:12px;border-radius:10px;background:#173c2c;color:#bcefd5}.progress{min-height:24px;color:#a8e8ca}@media(max-width:700px){body{padding:12px}main{padding:18px}dl{grid-template-columns:1fr 1fr}}</style></head><body><main><small>OWNER-AUTHENTICATED · FAIL-CLOSED</small><h1>Khôi phục evidence lịch sử ElevenLabs</h1>${recorded || audioHashed ? '<p class="notice">Đã hoàn tất lệnh và đọc lại snapshot bất biến.</p>' : ''}<section class="scope"><strong>Phạm vi cố định</strong><ul><li>Metadata discovery: 2 provider reads, không TTS, không spend.</li><li>Exact-audio recovery: tối đa 16 download/batch, hai lần/item và dừng ở 132 reads.</li><li>Đối chiếu SHA-256 với exact bytes đang giữ trong R2; không suy diễn từ tên hoặc thời gian.</li><li>Kết quả không tự cấp rights, không seal dataset, không qualify assurance và không mở release.</li></ul></section>${metadataResult}${audioResult}${conclusion}${script}<p>Subscription chỉ là quan sát hiện tại; không chứng minh gói lịch sử.</p></main></body></html>`, { headers: { ...NO_STORE, "content-type": "text/html; charset=utf-8", "x-frame-options": "SAMEORIGIN" } });
      }
      if (artifactCandidateId) {
        const item = await first(env.DB, `SELECT c.id,c.storage_key,c.mime_type,c.content_hash,t.exact_artifact_hash
          FROM v7_evaluation_candidates c JOIN v7_evaluation_owner_label_tasks t ON t.candidate_id=c.id
          JOIN v7_evaluation_correlation_items i ON i.candidate_id=c.id AND i.policy_version='EVALUATION_CORRELATION_CONTROL_V1'
          WHERE c.channel_id=? AND c.id=? AND c.lifecycle_state='CANDIDATE_EVIDENCE' AND c.verification_state='EVIDENCE_VERIFIED'
            AND c.rights_verification_state='PASS' AND c.release_eligible=0 AND t.exact_artifact_hash=c.content_hash
            AND i.attention_state='READY_PRIMARY' AND i.independent_count_eligible=1 LIMIT 1`, CHANNEL_ID, artifactCandidateId);
        if (!item) throw new EvaluationCommandError("OWNER_LABEL_ARTIFACT_NOT_ELIGIBLE", 404, "The requested artifact is not eligible for owner labeling");
        const object = await env.BUCKET.get(clean(item.storage_key));
        if (!object) throw new EvaluationCommandError("OWNER_LABEL_ARTIFACT_MISSING", 404, "The exact R2 artifact could not be read");
        const bytes = await object.arrayBuffer(), computedHash = await sha256(bytes);
        if (computedHash !== clean(item.exact_artifact_hash).toLowerCase()) throw new EvaluationCommandError("OWNER_LABEL_ARTIFACT_HASH_MISMATCH", 409, "R2 bytes no longer match the owner-label task hash");
        return new Response(bytes, { headers: { ...NO_STORE, "content-type": clean(item.mime_type) || "application/octet-stream", "content-disposition": "inline; filename=owner-label-artifact" } });
      }
      const task = await nextOwnerLabelTask(env.DB), taxonomy = await rows(env.DB, "SELECT id,defect_key,label,severity,modality,description FROM v7_evaluation_defect_taxonomy WHERE active=1 ORDER BY severity,defect_key");
      const attention = await first(env.DB, `SELECT s.primary_representative_count,s.exact_duplicate_deferred_count,s.correlated_variant_deferred_count,
        (SELECT COUNT(*) FROM v7_evaluation_factory_qa_receipts f JOIN v7_evaluation_factory_qa_tasks q ON q.id=f.task_id JOIN v7_evaluation_owner_label_tasks t ON t.id=q.owner_task_id
          WHERE f.owner_attention_state IN ('OWNER_REQUIRED','OWNER_EXCEPTION') AND NOT EXISTS (SELECT 1 FROM v7_evaluation_owner_label_receipts r WHERE r.task_id=t.id)) actionable_open,
        (SELECT COUNT(*) FROM v7_evaluation_factory_qa_tasks q WHERE NOT EXISTS (SELECT 1 FROM v7_evaluation_factory_qa_receipts f WHERE f.task_id=q.id)) factory_pending,
        (SELECT COUNT(*) FROM v7_evaluation_owner_label_receipts r WHERE r.channel_id=?) owner_completed
        FROM v7_evaluation_correlation_snapshots s WHERE s.channel_id=? AND s.policy_version='EVALUATION_CORRELATION_CONTROL_V1' LIMIT 1`, CHANNEL_ID, CHANNEL_ID);
      if (view === "owner-label-workflow") {
        const recorded = url.searchParams.get("recorded") === "1", artifactUrl = task ? `/api/factory/sequential-production/evaluation?artifact=${encodeURIComponent(clean(task.candidate_id))}` : "";
        const mime = clean(task?.mime_type), artifact = !task ? ""
          : mime.startsWith("audio/") ? `<audio controls preload="metadata" src="${artifactUrl}"></audio>`
          : mime.startsWith("video/") ? `<video controls preload="metadata" src="${artifactUrl}"></video>`
          : mime.startsWith("image/") ? `<img src="${artifactUrl}" alt="Candidate artifact">`
          : `<a href="${artifactUrl}" target="_blank" rel="noreferrer">Open exact artifact</a>`;
        const ownerTaxonomy = taxonomy.filter((item) => task && isOwnerObservableDefect({ defectModality: clean(item.modality), candidateKind: clean(task.candidate_kind), mimeType: mime }));
        const systemTaxonomy = taxonomy.filter((item) => !ownerTaxonomy.includes(item));
        const fields = ownerTaxonomy.map((item) => { const copy = OWNER_DEFECT_COPY[clean(item.defect_key)] ?? { label: clean(item.label), description: clean(item.description) }; return `<label class="issue"><input type="checkbox" data-issue data-label="${escapeHtml(copy.label)}"><input type="hidden" name="label__${escapeHtml(item.defect_key)}" value="ABSENT" data-owner-label><span><b>${escapeHtml(copy.label)}</b><em>${escapeHtml(copy.description)}</em><small>${escapeHtml(item.severity)} · ${escapeHtml(item.label)}</small></span></label>`; }).join("");
        const systemFields = systemTaxonomy.map((item) => `<li><input type="hidden" name="label__${escapeHtml(item.defect_key)}" value="NOT_APPLICABLE"><b>${escapeHtml(item.label)}</b><span>Được kiểm tra bằng evidence/gate riêng; không yêu cầu owner phán đoán từ playback.</span></li>`).join("");
        const primaryTotal = number(attention?.primary_representative_count), remaining = number(attention?.actionable_open), completed = number(attention?.owner_completed), factoryPending = number(attention?.factory_pending), itemNumber = Math.min(primaryTotal, completed + 1);
        const kindCopy = OWNER_KIND_COPY[clean(task?.candidate_kind)] ?? { label: clean(task?.candidate_kind).replaceAll("_", " ") || "Mẫu đánh giá", instruction: "Xem hoặc nghe toàn bộ mẫu và chỉ ghi nhận điều anh thực sự quan sát được." };
        const content = task ? `<section class="guide"><b>Factory đã QA trước · anh chỉ xác minh ngoại lệ</b><ol><li><strong>Phát toàn bộ mẫu</strong><span>${escapeHtml(kindCopy.instruction)}</span></li><li><strong>Chọn một kết luận</strong><span>Không cần hiểu thuật ngữ kỹ thuật.</span></li><li><strong>Nếu có lỗi, chọn lỗi nhìn/nghe thấy</strong><span>Các kiểm tra hệ thống được tách riêng.</span></li></ol></section><div class="artifact"><div class="artifactInfo"><span class="kind">${escapeHtml(kindCopy.label)}</span><h3>Trường hợp cần xác minh ${itemNumber}</h3><p>${escapeHtml(kindCopy.instruction)}</p><details><summary>Chi tiết kỹ thuật</summary><small>${escapeHtml(task.artifact_type)} · ${escapeHtml(mime)}</small><code>${escapeHtml(task.exact_artifact_hash)}</code></details></div>${artifact}</div><form id="ownerReview" method="post" action="/api/factory/sequential-production/evaluation"><input type="hidden" name="action" value="RECORD_OWNER_LABEL_RECEIPT"><input type="hidden" name="taskId" value="${escapeHtml(task.task_id)}"><input type="hidden" name="candidateId" value="${escapeHtml(task.candidate_id)}"><input type="hidden" name="expectedArtifactHash" value="${escapeHtml(task.exact_artifact_hash)}"><input type="hidden" name="idempotencyKey" value="owner-label:${escapeHtml(task.task_id)}"><fieldset class="decision"><legend>Bước 2 · Kết luận của anh</legend><label class="choice good"><input type="radio" name="decisionState" value="CLEAN_NEGATIVE_CONTROL" required><span><b>Không thấy lỗi</b><em>Mẫu phát bình thường và đạt chất lượng quan sát được.</em></span></label><label class="choice bad"><input type="radio" name="decisionState" value="REJECTED_DEFECT_PRESENT" required><span><b>Có lỗi cần ghi nhận</b><em>Tôi nhìn thấy hoặc nghe thấy ít nhất một vấn đề.</em></span></label><label class="choice neutral"><input type="radio" name="decisionState" value="EXCLUDE_UNUSABLE" required><span><b>Không thể đánh giá</b><em>Mẫu không phát, sai nội dung hoặc không đủ thông tin để kết luận.</em></span></label></fieldset><section id="issuePanel" class="issuePanel" hidden><div class="sectionTitle"><div><small>BƯỚC 3</small><h3>Anh đã thấy lỗi nào?</h3><p>Chọn tất cả lỗi quan sát được. Những lỗi không chọn sẽ được ghi là không xuất hiện.</p></div><b>${ownerTaxonomy.length} kiểm tra phù hợp</b></div><div class="issues">${fields}</div></section><label class="note"><span id="noteLabel">Ghi chú</span><textarea id="rationale" name="rationale" required minlength="12" maxlength="2000" placeholder="Ví dụ: chữ quá nhỏ ở 00:18 hoặc giọng đọc bị ngắt ở 00:42."></textarea><small id="noteHelp">Một câu ngắn về điều anh quan sát được.</small></label><details class="system"><summary>${systemTaxonomy.length} kiểm tra kỹ thuật do hệ thống chịu trách nhiệm</summary><p>Owner không cần đánh giá các mục này bằng mắt/tai. Chúng vẫn được giữ trong taxonomy và được ràng buộc bằng evidence riêng.</p><ul>${systemFields}</ul></details><p id="formError" class="error" role="alert" hidden></p><footer><span>Phán quyết sẽ được khóa bất biến sau khi xác nhận.</span><button type="submit">Xác nhận ngoại lệ</button></footer></form>` : factoryPending > 0 ? `<section class="notice success"><b>Factory đang QA trước thay anh.</b><p>${factoryPending} mẫu còn lại đang được phân tích. Owner không cần duyệt tuần tự; chỉ ngoại lệ hoặc mẫu kiểm toán mới quay lại đây.</p></section>` : `<p class="notice success">Factory đã hoàn tất QA trước. Hiện không có ngoại lệ nào bắt buộc owner xử lý.</p>`;
        const script = `<script>(()=>{const form=document.getElementById('ownerReview');if(!form)return;const panel=document.getElementById('issuePanel'),note=document.getElementById('rationale'),noteLabel=document.getElementById('noteLabel'),noteHelp=document.getElementById('noteHelp'),error=document.getElementById('formError'),button=form.querySelector('button[type="submit"]'),endpoint=form.getAttribute('action')||'/api/factory/sequential-production/evaluation',issues=[...form.querySelectorAll('[data-issue]')],labels=[...form.querySelectorAll('[data-owner-label]')];let automatic=true;const selected=()=>form.querySelector('input[name="decisionState"]:checked')?.value||'';const setError=(message)=>{error.textContent=message;error.hidden=!message};const syncIssues=()=>{issues.forEach((box,index)=>{labels[index].value=selected()==='EXCLUDE_UNUSABLE'?'NOT_APPLICABLE':box.checked?'PRESENT':'ABSENT'});};const applyDecision=()=>{const decision=selected();panel.hidden=decision!=='REJECTED_DEFECT_PRESENT';issues.forEach(box=>box.disabled=decision!=='REJECTED_DEFECT_PRESENT');syncIssues();setError('');if(decision==='CLEAN_NEGATIVE_CONTROL'){noteLabel.textContent='Xác nhận';noteHelp.textContent='Hệ thống đã điền câu xác nhận tiêu chuẩn; anh có thể bổ sung nếu muốn.';if(automatic||!note.value.trim())note.value='Đã xem hoặc nghe toàn bộ mẫu và không phát hiện lỗi quan sát được.';automatic=true}else if(decision==='EXCLUDE_UNUSABLE'){noteLabel.textContent='Lý do không thể đánh giá';noteHelp.textContent='Có thể sửa câu gợi ý để phản ánh đúng tình trạng.';if(automatic||!note.value.trim())note.value='Không thể đánh giá tin cậy vì mẫu không phát hoặc không đủ thông tin.';automatic=true}else{noteLabel.textContent='Mô tả ngắn lỗi đã thấy';noteHelp.textContent='Nêu vị trí hoặc biểu hiện lỗi; ví dụ 00:18 chữ quá nhỏ.';if(automatic)note.value='';automatic=false}};form.querySelectorAll('input[name="decisionState"]').forEach(input=>input.addEventListener('change',applyDecision));issues.forEach(box=>box.addEventListener('change',()=>{syncIssues();setError('')}));note.addEventListener('input',()=>{automatic=false;setError('')});form.addEventListener('submit',async event=>{event.preventDefault();syncIssues();const decision=selected();if(decision==='REJECTED_DEFECT_PRESENT'&&!issues.some(box=>box.checked)){setError('Hãy chọn ít nhất một lỗi anh đã nhìn thấy hoặc nghe thấy.');panel.scrollIntoView({behavior:'smooth',block:'center'});return}if(note.value.trim().length<12){setError('Hãy ghi một câu ngắn ít nhất 12 ký tự.');note.focus();return}setError('');const original=button.textContent;button.disabled=true;button.textContent='Đang lưu…';try{const response=await fetch(endpoint,{method:'POST',body:new FormData(form)});if(response.redirected){location.assign(response.url);return}if(response.ok){location.assign('/api/factory/sequential-production/evaluation?view=owner-label-workflow&recorded=1');return}throw new Error('Factory chưa lưu được đánh giá. Nội dung vẫn còn trên màn hình; hãy thử lại.')}catch(reason){setError(reason instanceof Error?reason.message:'Factory chưa lưu được đánh giá. Nội dung vẫn còn trên màn hình; hãy thử lại.');button.disabled=false;button.textContent=original}})})();</script>`;
        return new Response(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Đánh giá mẫu sản xuất</title><style>*{box-sizing:border-box}body{margin:0;padding:22px;background:#101f19;color:#d9e8e1;font:14px Arial,sans-serif}header,footer{display:flex;align-items:center;justify-content:space-between;gap:16px}h2{margin:5px 0 6px;font:600 28px Georgia,serif}h3{margin:5px 0 8px;font-size:18px}p,small,span,em{color:#9db2aa;line-height:1.5}.attention{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}.attention b{padding:8px 11px;border:1px solid #39584c;border-radius:999px;color:#a8e8ca;font-size:11px}.progress{height:7px;overflow:hidden;border-radius:99px;background:#20342c}.progress i{display:block;height:100%;background:#a8e8ca}.guide{margin:18px 0;padding:16px;border:1px solid #35584a;border-radius:14px;background:#13271f}.guide> b{color:#d9f7e9}.guide ol{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:12px 0 0;padding:0;list-style:none;counter-reset:step}.guide li{display:grid;gap:4px;padding:11px;border-radius:10px;background:#0b1712;counter-increment:step}.guide li strong:before{content:counter(step) '. ';color:#a8e8ca}.guide li span{font-size:11px}.artifact{display:grid;grid-template-columns:minmax(220px,.55fr) minmax(0,1.45fr);gap:18px;align-items:center;padding:16px;border-radius:14px;background:#0b1712}.artifactInfo .kind{display:inline-flex;padding:5px 8px;border-radius:999px;background:#1d3b30;color:#a8e8ca;font-size:10px;font-weight:800}.artifact code{display:block;margin-top:7px;overflow-wrap:anywhere;color:#789087;font-size:9px}details summary{cursor:pointer;color:#a8e8ca}audio,video,img{display:block;width:100%;max-height:430px;object-fit:contain;border-radius:11px;background:#050a08}.decision{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:16px 0;padding:0;border:0}.decision legend{grid-column:1/-1;margin-bottom:8px;color:#d9f7e9;font-weight:800}.choice{display:flex;gap:10px;min-height:92px;padding:14px;border:1px solid #365349;border-radius:12px;cursor:pointer;background:#0b1712}.choice:has(input:checked){border-color:#a8e8ca;box-shadow:0 0 0 2px #a8e8ca22}.choice input{margin-top:3px;accent-color:#a8e8ca}.choice b,.choice em{display:block}.choice b{color:#e0f5eb}.choice em{margin-top:4px;font-size:11px;font-style:normal}.issuePanel{margin:14px 0;padding:15px;border-radius:14px;background:#13271f}.sectionTitle{display:flex;justify-content:space-between;gap:16px;align-items:start}.sectionTitle> b{padding:6px 8px;border-radius:99px;background:#244336;color:#a8e8ca;font-size:10px}.issues{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:12px}.issue{display:flex;gap:10px;padding:12px;border:1px solid #294238;border-radius:10px;background:#0b1712;cursor:pointer}.issue:has(input:checked){border-color:#ef9c8d;background:#2a1714}.issue>input[type=checkbox]{width:18px;height:18px;margin-top:2px;accent-color:#ef9c8d}.issue b,.issue em,.issue small{display:block}.issue b{color:#e4eee9}.issue em{margin-top:3px;font-size:11px;font-style:normal}.issue small{margin-top:5px;font-size:9px}.note{display:grid;gap:6px;margin:14px 0}.note>span{color:#d9f7e9;font-weight:800}textarea{width:100%;min-height:88px;padding:11px;border:1px solid #39584c;border-radius:9px;background:#0b1712;color:#d9e8e1;resize:vertical}.system{margin:14px 0;padding:12px;border:1px solid #294238;border-radius:10px}.system p,.system li{font-size:11px;color:#8ca39a}.system li{margin:6px 0}.system li b,.system li span{display:block}.error,.notice{padding:11px;border-radius:9px;background:#3a1e1a;color:#ffc2b7}.notice.success{background:#173c2c;color:#bcefd5}.notice b{color:#d9f7e9}.notice p{margin-bottom:0}footer{margin-top:16px;padding-top:14px;border-top:1px solid #294238}button{min-height:44px;padding:0 18px;border:0;border-radius:10px;background:#a8e8ca;color:#09291e;font-weight:800;cursor:pointer}@media(max-width:760px){body{padding:14px}header,footer,.sectionTitle{align-items:stretch;flex-direction:column}.guide ol,.artifact,.decision,.issues{grid-template-columns:1fr}h2{font-size:23px}}</style></head><body><header><div><small>FACTORY QA TRƯỚC · OWNER XÁC MINH SAU</small><h2>Factory đang giảm việc QA thủ công</h2><p>Máy phân tích toàn bộ trước; anh chỉ xem ngoại lệ hoặc mẫu kiểm toán.</p></div><b>${completed} owner receipts</b></header><div class="attention"><b>${factoryPending} mẫu chờ Factory QA</b><b>${remaining} ngoại lệ cần owner</b><b>${number(attention?.correlated_variant_deferred_count)} biến thể đã tự loại</b></div><div class="progress" aria-label="Factory QA chuyển đổi"><i style="width:${primaryTotal ? Math.round((primaryTotal - factoryPending) / primaryTotal * 100) : 100}%"></i></div>${recorded ? '<p class="notice success">Đã lưu phán quyết. Factory tiếp tục xử lý phần còn lại.</p>' : ""}${content}${script}</body></html>`, { headers: { ...NO_STORE, "content-type": "text/html; charset=utf-8", "x-frame-options": "SAMEORIGIN" } });
      }
      return Response.json({ policyVersion: EVALUATION_OWNER_LABEL_POLICY_VERSION, ownerReviewUxVersion: EVALUATION_OWNER_REVIEW_UX_VERSION, task: task ? {
        taskId: clean(task.task_id), candidateId: clean(task.candidate_id), exactArtifactHash: clean(task.exact_artifact_hash), candidateKind: clean(task.candidate_kind), artifactType: clean(task.artifact_type), mimeType: clean(task.mime_type), queueRole: clean(task.queue_role), relationClass: clean(task.relation_class),
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
  let formSubmission = false;
  try {
    const contentType = request.headers.get("content-type")?.toLowerCase() || ""; formSubmission = contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data");
    if (!formSubmission && !contentType.includes("application/json")) throw new EvaluationCommandError("COMMAND_CONTENT_TYPE_REQUIRED", 415, "Use application/json or an owner-bound form submission");
    const body = formSubmission ? Object.fromEntries(await request.formData()) : await request.json().catch(() => null) as Row | null, action = clean(body?.action).toUpperCase();
    const { env, actor } = await authorized(request, action !== "RECORD_OWNER_LABEL_RECEIPT");
    if (!["RUN_CORPUS_VERIFICATION_BATCH", "RECORD_OWNER_LABEL_RECEIPT", "DISCOVER_ELEVENLABS_HISTORY_METADATA", "HASH_ELEVENLABS_HISTORY_AUDIO"].includes(action)) throw new EvaluationCommandError("EVALUATION_ACTION_INVALID", 400, "Use a supported evaluation action");
    const idempotencyKey = clean(request.headers.get("idempotency-key") || (formSubmission ? body?.idempotencyKey : ""));
    if (idempotencyKey.length < 16 || idempotencyKey.length > 160) throw new EvaluationCommandError("IDEMPOTENCY_KEY_INVALID", 400, "A 16–160 character idempotency-key is required");
    if (action === "DISCOVER_ELEVENLABS_HISTORY_METADATA") {
      if (!env.ELEVENLABS_API_KEY) throw new EvaluationCommandError("ELEVENLABS_NOT_CONNECTED", 424, "ElevenLabs history recovery requires the existing server-side API binding");
      const payload = await discoverProviderHistoryAuthorized(env as typeof env & { ELEVENLABS_API_KEY: string }, actor, idempotencyKey);
      if (formSubmission) return new Response(null, { status: 303, headers: { ...NO_STORE, location: new URL("/api/factory/sequential-production/evaluation?view=provider-history-recovery&recorded=1", request.url).toString() } });
      return Response.json(payload, { status: 201, headers: NO_STORE });
    }
    if (action === "HASH_ELEVENLABS_HISTORY_AUDIO") {
      if (!env.ELEVENLABS_API_KEY) throw new EvaluationCommandError("ELEVENLABS_NOT_CONNECTED", 424, "ElevenLabs history recovery requires the existing server-side API binding");
      const payload = await hashProviderHistoryAudioAuthorized(env as typeof env & { ELEVENLABS_API_KEY: string }, actor, idempotencyKey);
      return Response.json(payload, { status: 201, headers: NO_STORE });
    }
    if (action === "RECORD_OWNER_LABEL_RECEIPT") {
      const taskId = clean(body?.taskId), candidateId = clean(body?.candidateId), expectedArtifactHash = clean(body?.expectedArtifactHash).toLowerCase(), decisionState = clean(body?.decisionState), rationale = clean(body?.rationale);
      const labels = formSubmission ? Object.entries(body ?? {}).filter(([key]) => key.startsWith("label__")).map(([key, status]) => ({ defectKey: key.slice(7), status: clean(status), confidence: clean(status) === "NOT_APPLICABLE" ? undefined : 1 }))
        : Array.isArray(body?.labels) ? body.labels.map((item) => item && typeof item === "object" ? item as Row : {}) : [];
      const normalizedLabels = normalizeOwnerLabelsForReceipt(labels.map((item) => ({ defectKey: clean(item.defectKey), status: clean(item.status), confidence: item.confidence === undefined ? undefined : number(item.confidence) })));
      const requestIntent = { action, taskId, candidateId, expectedArtifactHash, decisionState, rationale, labels: normalizedLabels, policyVersion: EVALUATION_OWNER_LABEL_POLICY_VERSION };
      const requestHash = await canonicalHash(requestIntent);
      const prior = await first(env.DB, "SELECT * FROM v7_evaluation_owner_label_receipts WHERE channel_id=? AND idempotency_key=? LIMIT 1", CHANNEL_ID, idempotencyKey);
      if (prior) {
        if (clean(prior.request_hash) !== requestHash) throw new EvaluationCommandError("IDEMPOTENCY_INTENT_CONFLICT", 409, "The idempotency key is already bound to a different owner-label intent");
        if (formSubmission) return new Response(null, { status: 303, headers: { ...NO_STORE, location: new URL("/api/factory/sequential-production/evaluation?view=owner-label-workflow&recorded=1", request.url).toString() } });
        return Response.json({ outcome: "REPLAYED", receipt: prior, corpus: await projection(env.DB), providerRequests: 0, spendUsd: 0 }, { headers: NO_STORE });
      }
      const task = await first(env.DB, `SELECT t.*,c.content_hash,c.mime_type,c.rights_verification_state,c.verification_state,c.lifecycle_state,c.release_eligible,i.attention_state,i.independent_count_eligible
        FROM v7_evaluation_owner_label_tasks t JOIN v7_evaluation_candidates c ON c.id=t.candidate_id
        JOIN v7_evaluation_correlation_items i ON i.candidate_id=t.candidate_id AND i.policy_version='EVALUATION_CORRELATION_CONTROL_V1'
        WHERE t.id=? AND t.channel_id=? AND t.candidate_id=? AND i.attention_state='READY_PRIMARY' AND i.independent_count_eligible=1 LIMIT 1`, taskId, CHANNEL_ID, candidateId);
      if (!task) throw new EvaluationCommandError("OWNER_LABEL_TASK_NOT_FOUND", 404, "The exact owner-label task was not found");
      const existingTaskReceipt = await first(env.DB, "SELECT * FROM v7_evaluation_owner_label_receipts WHERE task_id=? LIMIT 1", taskId);
      if (existingTaskReceipt) throw new EvaluationCommandError("OWNER_LABEL_TASK_ALREADY_RESOLVED", 409, "This owner-label task already has an immutable receipt");
      const taxonomy = await rows(env.DB, "SELECT id,defect_key,label,severity,modality FROM v7_evaluation_defect_taxonomy WHERE active=1 ORDER BY defect_key");
      const ownerObservableDefectKeys = taxonomy.filter((item) => isOwnerObservableDefect({ defectModality: clean(item.modality), candidateKind: clean(task.candidate_kind), mimeType: clean(task.mime_type) })).map((item) => clean(item.defect_key));
      const validation = evaluateOwnerLabelSubmission({ taskArtifactHash: clean(task.exact_artifact_hash), expectedArtifactHash, rightsVerificationState: clean(task.rights_verification_state), verificationState: clean(task.verification_state), lifecycleState: clean(task.lifecycle_state), releaseEligible: Boolean(number(task.release_eligible)), decisionState, rationale, activeDefectKeys: taxonomy.map((item) => clean(item.defect_key)), ownerObservableDefectKeys, labels: labels.map((item) => ({ defectKey: clean(item.defectKey), status: clean(item.status), confidence: item.confidence === undefined ? undefined : number(item.confidence) })) });
      if (!validation.eligible) throw new EvaluationCommandError("OWNER_LABEL_SUBMISSION_INVALID", 409, validation.reasons.join("; "));
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
    if (formSubmission) {
      const code = error instanceof EvaluationCommandError ? error.code : "OWNER_REVIEW_SYSTEM_ERROR";
      const message = error instanceof Error ? error.message : "Không thể lưu đánh giá lúc này";
      return new Response(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Chưa lưu được đánh giá</title><style>body{margin:0;padding:24px;background:#101f19;color:#d9e8e1;font:15px Arial,sans-serif}.card{max-width:720px;margin:8vh auto;padding:24px;border:1px solid #49685c;border-radius:16px;background:#13271f}h1{font:600 30px Georgia,serif}p{color:#a9bdb5;line-height:1.6}code{display:block;padding:10px;border-radius:8px;background:#0b1712;color:#efb2a7;overflow-wrap:anywhere}.actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px}button,a{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border:0;border-radius:9px;background:#a8e8ca;color:#09291e;font-weight:800;text-decoration:none;cursor:pointer}.secondary{border:1px solid #49685c;background:transparent;color:#d9e8e1}</style></head><body><main class="card"><small>ĐÁNH GIÁ CHƯA ĐƯỢC GHI</small><h1>Dữ liệu của anh chưa bị ghi sai.</h1><p>Factory đã dừng an toàn trước khi tạo receipt. Hãy quay lại biểu mẫu để giữ nội dung đang nhập và thử lại; nếu trình duyệt không giữ nội dung, hãy tải lại hàng đợi.</p><code>${escapeHtml(code)} · ${escapeHtml(message)}</code><div class="actions"><button onclick="history.back()">Quay lại biểu mẫu</button><a class="secondary" href="/api/factory/sequential-production/evaluation?view=owner-label-workflow">Tải lại hàng đợi</a></div></main></body></html>`, { status: error instanceof EvaluationCommandError ? error.status : 503, headers: { ...NO_STORE, "content-type": "text/html; charset=utf-8" } });
    }
    if (error instanceof EvaluationCommandError) return Response.json({ error: { code: error.code, message: error.message }, providerRequests: 0, spendUsd: 0 }, { status: error.status, headers: NO_STORE });
    return Response.json({ error: { code: "CORPUS_VERIFICATION_FAILED", message: error instanceof Error ? error.message : "Corpus verification failed" }, providerRequests: 0, spendUsd: 0 }, { status: 503, headers: NO_STORE });
  }
}
