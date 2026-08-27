import { canonicalHash, canonicalStringify } from "@/lib/canonical-json";
import { FactoryRuntimeError, type FactoryRuntimeDB } from "@/lib/factory-runtime-writer";

export const FACTORY_ASSURANCE_CORPUS_REMEDIATION_VERSION = "FACTORY_ASSURANCE_CORPUS_REMEDIATION_V1" as const;

type SourceRow = Record<string, unknown>;
type TargetLayer = "L0" | "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7";
type Readiness = "READY_FOR_CORPUS_REVIEW" | "EXACT_EVIDENCE_REQUIRED" | "OWNER_LABEL_REQUIRED" | "CORRELATION_REVIEW_REQUIRED";

const hashPattern = /^[a-f0-9]{64}$/;
const deterministicId = (prefix: string, hash: string) => `${prefix}-${hash.slice(0, 24)}`;
const json = (value: unknown) => canonicalStringify(value);

function text(value: unknown) { return String(value ?? "").trim(); }
function number(value: unknown) { return Number(value ?? 0); }
function parseJson(value: unknown) {
  try { const parsed = JSON.parse(text(value)); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}

function targetLayers(candidateKind: string, mimeType: string): TargetLayer[] {
  const kind = candidateKind.toUpperCase(), mime = mimeType.toLowerCase();
  if (kind === "AUDIO" || mime.startsWith("audio/")) return ["L0", "L4", "L5", "L7"];
  if (kind === "PACKAGING" || mime === "application/json") return ["L0", "L1", "L2", "L5", "L7"];
  return ["L0", "L1", "L2", "L3", "L4", "L5", "L6", "L7"];
}

function readiness(row: SourceRow): {
  exactEvidenceState: "READY" | "READBACK_REQUIRED";
  ownerLabelState: "OWNER_CONFIRMED" | "OWNER_LABEL_REQUIRED";
  correlationState: "INDEPENDENT" | "CORRELATION_REVIEW_REQUIRED";
  rightsState: "PASS" | "UNKNOWN";
  readinessState: Readiness;
  nextAction: string;
} {
  const exactReady = hashPattern.test(text(row.exact_artifact_hash).toLowerCase())
    && text(row.verification_state) === "EVIDENCE_VERIFIED"
    && text(row.bytes_state) === "READBACK_VERIFIED"
    && text(row.checksum_state) === "PASS"
    && text(row.provenance_state) === "PASS";
  const rightsReady = text(row.rights_verification_state) === "PASS";
  const ownerReady = Boolean(text(row.owner_receipt_id));
  const independent = number(row.independent_count_eligible) === 1;
  if (!exactReady || !rightsReady) return { exactEvidenceState: "READBACK_REQUIRED", ownerLabelState: ownerReady ? "OWNER_CONFIRMED" : "OWNER_LABEL_REQUIRED", correlationState: independent ? "INDEPENDENT" : "CORRELATION_REVIEW_REQUIRED", rightsState: rightsReady ? "PASS" : "UNKNOWN", readinessState: "EXACT_EVIDENCE_REQUIRED", nextAction: "Verify exact R2 bytes, checksum, provenance and current rights before any label or corpus count." };
  if (!independent) return { exactEvidenceState: "READY", ownerLabelState: ownerReady ? "OWNER_CONFIRMED" : "OWNER_LABEL_REQUIRED", correlationState: "CORRELATION_REVIEW_REQUIRED", rightsState: "PASS", readinessState: "CORRELATION_REVIEW_REQUIRED", nextAction: "Resolve exact-byte and lineage correlation; correlated revisions cannot create an independent calibration case." };
  if (!ownerReady) return { exactEvidenceState: "READY", ownerLabelState: "OWNER_LABEL_REQUIRED", correlationState: "INDEPENDENT", rightsState: "PASS", readinessState: "OWNER_LABEL_REQUIRED", nextAction: "Collect one owner-authenticated complete taxonomy label bound to these exact bytes." };
  return { exactEvidenceState: "READY", ownerLabelState: "OWNER_CONFIRMED", correlationState: "INDEPENDENT", rightsState: "PASS", readinessState: "READY_FOR_CORPUS_REVIEW", nextAction: "Review layer applicability and partition assignment in a new immutable corpus snapshot; do not auto-admit." };
}

async function sourceRows(db: FactoryRuntimeDB) {
  return (await db.prepare(`SELECT
      c.id source_candidate_id,c.source_family,c.candidate_kind,c.mime_type,c.storage_key,c.byte_size,
      lower(c.content_hash) exact_artifact_hash,c.verification_state,c.bytes_state,c.checksum_state,c.provenance_state,c.rights_verification_state,
      COALESCE(i.lineage_group_key,c.correlation_group) correlation_group,COALESCE(i.independent_count_eligible,0) independent_count_eligible,
      o.id owner_receipt_id,COALESCE(o.labels_json,'[]') owner_labels_json
    FROM v7_evaluation_candidates c
    LEFT JOIN v7_evaluation_correlation_items i ON i.candidate_id=c.id AND i.policy_version='EVALUATION_CORRELATION_CONTROL_V1'
    LEFT JOIN v7_evaluation_owner_label_receipts o ON o.candidate_id=c.id AND lower(o.exact_artifact_hash)=lower(c.content_hash)
    WHERE c.channel_id='channel-hidden-systems'
      AND c.candidate_kind IN ('AUDIO','MASTER','PACKAGING')
      AND length(c.content_hash)=64
      AND NOT EXISTS (
        SELECT 1 FROM factory_assurance_calibration_corpus_items x
        WHERE lower(x.exact_artifact_hash)=lower(c.content_hash)
      )
    ORDER BY c.candidate_kind,c.created_at,c.id`).all<SourceRow>()).results ?? [];
}

export async function materializeFactoryAssuranceCorpusRemediationInventory(db: FactoryRuntimeDB, actor: string) {
  const sourceSnapshot = await db.prepare(`SELECT id,snapshot_hash FROM factory_assurance_calibration_corpus_snapshots
    WHERE channel_id='channel-hidden-systems' AND format_key='hidden-systems-documentary'
    ORDER BY created_at DESC,id DESC LIMIT 1`).first<SourceRow>();
  if (!sourceSnapshot) throw new FactoryRuntimeError("ASSURANCE_CORPUS_SNAPSHOT_REQUIRED", 409, "Record the bounded corpus admission snapshot before remediation inventory");
  const rows = await sourceRows(db);
  const items = rows.map((row) => {
    const candidateKind = text(row.candidate_kind).toUpperCase();
    const exactArtifactHash = text(row.exact_artifact_hash).toLowerCase();
    const state = readiness(row);
    return {
      workKey: `factory:assurance:corpus-remediation:${text(row.source_candidate_id)}`,
      sourceCandidateId: text(row.source_candidate_id), sourceFamily: text(row.source_family), candidateKind,
      mimeType: text(row.mime_type) || "application/octet-stream", storageKey: text(row.storage_key) || null,
      byteSize: number(row.byte_size) || null, exactArtifactHash, targetLayers: targetLayers(candidateKind, text(row.mime_type)),
      correlationGroup: text(row.correlation_group) || `unresolved:${text(row.source_candidate_id)}`,
      sourceOwnerReceiptId: text(row.owner_receipt_id) || null, sourceLabels: parseJson(row.owner_labels_json), ...state,
    };
  });
  const summary = {
    candidateCount: items.length,
    l1CandidateCount: items.filter((item) => item.targetLayers.includes("L1")).length,
    l4CandidateCount: items.filter((item) => item.targetLayers.includes("L4")).length,
    exactEvidenceReadyCount: items.filter((item) => item.exactEvidenceState === "READY").length,
    ownerLabelReadyCount: items.filter((item) => item.ownerLabelState === "OWNER_CONFIRMED").length,
    independentCount: items.filter((item) => item.correlationState === "INDEPENDENT").length,
    readyForCorpusReviewCount: items.filter((item) => item.readinessState === "READY_FOR_CORPUS_REVIEW").length,
  };
  const sourceManifestHash = await canonicalHash({ version: FACTORY_ASSURANCE_CORPUS_REMEDIATION_VERSION, sourceCorpusSnapshotHash: text(sourceSnapshot.snapshot_hash), actor, items });
  const snapshotKey = "factory:assurance:corpus-remediation:hidden-systems:v1";
  const snapshotManifest = { version: FACTORY_ASSURANCE_CORPUS_REMEDIATION_VERSION, snapshotKey, sourceCorpusSnapshotId: text(sourceSnapshot.id), sourceManifestHash, summary };
  const snapshotHash = await canonicalHash(snapshotManifest);
  const existing = await db.prepare("SELECT id,snapshot_hash,lifecycle_state FROM factory_assurance_corpus_remediation_snapshots WHERE snapshot_key=?").bind(snapshotKey).first<SourceRow>();
  if (existing) {
    if (text(existing.snapshot_hash) !== snapshotHash) throw new FactoryRuntimeError("ASSURANCE_CORPUS_REMEDIATION_IDEMPOTENCY_CONFLICT", 409, "The remediation snapshot key is bound to another source inventory");
    return { outcome: "IDEMPOTENT_REPLAY" as const, snapshotId: text(existing.id), snapshotHash, lifecycleState: text(existing.lifecycle_state), ...summary };
  }
  const snapshotId = deterministicId("factory-assurance-remediation", snapshotHash);
  const lifecycleState = summary.readyForCorpusReviewCount > 0 ? "REMEDIATION_INPUTS_AVAILABLE" : "REMEDIATION_REQUIRED";
  const statements = [db.prepare(`INSERT INTO factory_assurance_corpus_remediation_snapshots
    (id,snapshot_key,source_corpus_snapshot_id,channel_id,format_key,policy_version,candidate_count,l1_candidate_count,l4_candidate_count,exact_evidence_ready_count,owner_label_ready_count,independent_count,ready_for_corpus_review_count,lifecycle_state,qualification_authority,pass_authority,provider_dispatch_authority,r22_authority,master_authority,release_authority,publication_authority,provider_requests,spend_micros,snapshot_hash,evidence_hash)
    VALUES (?,?,?,?,?,'FACTORY_ASSURANCE_CORPUS_REMEDIATION_V1',?,?,?,?,?,?,?, ?,0,0,0,0,0,0,0,0,0,?,?)`).bind(snapshotId, snapshotKey, text(sourceSnapshot.id), "channel-hidden-systems", "hidden-systems-documentary", summary.candidateCount, summary.l1CandidateCount, summary.l4CandidateCount, summary.exactEvidenceReadyCount, summary.ownerLabelReadyCount, summary.independentCount, summary.readyForCorpusReviewCount, lifecycleState, snapshotHash, sourceManifestHash)];
  for (const item of items) {
    const evidenceHash = await canonicalHash({ version: FACTORY_ASSURANCE_CORPUS_REMEDIATION_VERSION, snapshotId, item });
    statements.push(db.prepare(`INSERT INTO factory_assurance_corpus_remediation_items
      (id,snapshot_id,work_key,source_candidate_id,source_family,candidate_kind,mime_type,storage_key,byte_size,exact_artifact_hash,target_layers_json,correlation_group,source_owner_receipt_id,source_labels_json,exact_evidence_state,owner_label_state,correlation_state,rights_state,readiness_state,next_action,count_eligible,qualification_authority,pass_authority,provider_dispatch_authority,r22_authority,release_authority,publication_authority,provider_requests,spend_micros,evidence_hash)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,0,0,0,0,0,0,0,?)`).bind(deterministicId("factory-assurance-remediation-item", evidenceHash), snapshotId, item.workKey, item.sourceCandidateId, item.sourceFamily, item.candidateKind, item.mimeType, item.storageKey, item.byteSize, item.exactArtifactHash, json(item.targetLayers), item.correlationGroup, item.sourceOwnerReceiptId, json(item.sourceLabels), item.exactEvidenceState, item.ownerLabelState, item.correlationState, item.rightsState, item.readinessState, item.nextAction, evidenceHash));
  }
  await db.batch(statements);
  return { outcome: "RECORDED" as const, snapshotId, snapshotHash, lifecycleState, ...summary, qualificationAuthority: false, passAuthority: false, providerDispatchAuthority: false, r22Authority: false, masterAuthority: false, releaseAuthority: false, publicationAuthority: false, providerRequests: 0, spendMicros: 0 };
}
