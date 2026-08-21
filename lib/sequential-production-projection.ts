import { SEQUENTIAL_PRODUCTION_CONTRACT, type SequentialProductionProjection } from "@/app/production-control-contract";
import {
  evaluateVideoQualityEligibility,
  resolveVideoQualityStandards,
  VIDEO_01_QUALITY_ROUTE,
  VIDEO_QUALITY_STANDARD_VERSION,
  type VideoQualityEvidence,
  type VideoQualityStandard,
} from "@/lib/video-quality-standard";
import { deriveRootStageKeys } from "@/lib/first-pass-quality-projection";
import { FP3_GOLDEN_CONTRACT_SUMMARY } from "@/lib/first-pass-shot-cue-program";
import { summarizeCorpusEvidenceConflicts, summarizeEvaluationRightsQueue } from "@/lib/evaluation-foundation";

type Row = Record<string, unknown>;
type Statement = { bind(...values: unknown[]): Statement; all<T = Row>(): Promise<{ results?: T[] }>; first<T = Row>(): Promise<T | null> };
export type SequentialProductionDB = { prepare(query: string): Statement };

const text = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);
const boolean = (value: unknown) => Boolean(value);
const json = <T>(value: unknown, fallback: T): T => { try { return JSON.parse(text(value)) as T; } catch { return fallback; } };
async function rows(db: SequentialProductionDB, query: string, ...values: unknown[]) {
  return (await db.prepare(query).bind(...values).all<Row>()).results ?? [];
}

const architecture: SequentialProductionProjection["architecture"] = [
  { version: "V7", role: "Production governance and business process", controls: ["18 dependency-ordered stages", "Artifact and evidence lifecycle", "Cost, rights, lineage, stop and resume", "Repair at the root-cause stage"] },
  { version: "V23.4", role: "Real-artifact production", controls: ["Bounded, idempotent, checkpointed jobs", "SOURCE / MAKE / HYBRID routing", "Stored bytes and real-pixel verification", "Entry–midpoint–exit evidence; no generic fallback"] },
  { version: "V281", role: "Perceived-quality release firewall", controls: ["Full-master playback", "Three temporal samples per shot", "Eight independent critics", "Unlock the next video only when the current one is owner-ready"] },
];

const critics: SequentialProductionProjection["critics"] = [
  { name: "Executive producer", job: "Is this a coherent, premium finished product rather than merely a valid render?", hardFloor: 90 },
  { name: "Story and retention", job: "Assess escalation, curiosity loops, pacing, payoff, and viewer-state change.", hardFloor: 90 },
  { name: "Visual direction", job: "Assess composition, motion, hierarchy, polish, mobile legibility, and variety.", hardFloor: 90 },
  { name: "Semantic alignment", job: "Every shot must communicate the locked narration and claim accurately.", hardFloor: 90 },
  { name: "Audio direction", job: "Assess narrator consistency, performance, music, ambience, SFX, loudness, and mix intent.", hardFloor: 90 },
  { name: "Audience simulation", job: "Assess comprehension, trust, fatigue, interest, and payoff for the target US audience.", hardFloor: 90 },
  { name: "Competitive editor", job: "Compare depth, density, polish, and differentiation against the reference bar.", hardFloor: 90 },
  { name: "Truth and brand safety", job: "Assess claims, qualifiers, rights, provenance, and audience-facing cleanliness.", hardFloor: 90 },
];

const stageDisplayNames: Record<string, string> = {
  "00": "Production authority and lineage",
  "01": "Market, audience, and topic intelligence",
  "02": "Reference analysis",
  "03": "Truth research and claim mapping",
  "04": "Creative route selection",
  "05": "Story architecture",
  "06": "Script creation and lock",
  "07A": "Voice and sound design",
  "07B": "Visual grammar and asset strategy",
  "08": "Script-to-shot compilation",
  "09": "Visual asset production",
  "10": "Voice, music, and SFX production",
  "11": "Picture edit and audio composition",
  "12": "Pre-master timeline verification",
  "13": "Immutable master render",
  "14": "Independent full-video assurance",
  "15": "Owner-ready release gate",
  "16": "Post-publish learning handoff",
};

type PriorWork = SequentialProductionProjection["stages"][number]["priorWork"];
const priorWork = (stageKey: string): PriorWork => {
  if (["00", "01", "02", "03", "04", "05", "06", "07A", "07B", "08"].includes(stageKey)) return {
    classification: "FOUNDATION_AVAILABLE",
    label: "Previously performed — foundation only",
    summary: stageKey === "00"
      ? "The sequential lease and no-auto-publish firewall are already established."
      : "The earlier V7/V23.4 chain performed equivalent work before reaching media production.",
    reusable: "Process design, output standards, control structures, and verified lessons.",
    excluded: "Old dossiers, prompts, scripts, storyboards, research data, and artifacts cannot complete this stage.",
    currentRequirement: "Create and verify a new video-01-specific output bundle before closing the stage.",
  };
  if (stageKey === "09") return {
    classification: "PARTIAL_REJECTED",
    label: "Partially performed — not accepted",
    summary: "Pixel and motion work was produced previously, but Stage 09 was never frozen and the final quality was rejected.",
    reusable: "Failure taxonomy, bounded-job architecture, checksums, rights controls, and entry–midpoint–exit proof.",
    excluded: "Do not reuse old source bytes, frames, candidates, bindings, hashes, or masters.",
    currentRequirement: "Produce every visual asset from the new brief and shot contracts.",
  };
  if (["10", "11", "12", "13"].includes(stageKey)) return {
    classification: "REJECTED_OUTPUT",
    label: "Previously executed — output rejected",
    summary: "The previous pipeline created audio, edits, technical checks, and masters, but failed content and perceived-quality review.",
    reusable: "Technical contracts, audio/video measurements, checksums, revision controls, and fail-closed behavior.",
    excluded: "Do not reuse old stems, timelines, masters, QA scores, or repair revisions.",
    currentRequirement: "Run from the current video's new artifacts and create an entirely new revision.",
  };
  if (stageKey === "14") return {
    classification: "STANDARD_NOT_MET",
    label: "Not performed to V281 standard",
    summary: "Earlier QA mainly proved technical validity and sampled frames; it did not provide full playback with eight independent critics.",
    reusable: "Rubrics, thresholds, and missed-defect evidence that make the new review stricter.",
    excluded: "Do not inherit old PASS decisions, scores, or contact sheets.",
    currentRequirement: "Review the new master through full playback, three samples per shot, and eight independent critics.",
  };
  if (stageKey === "15") return {
    classification: "OWNER_REJECTED",
    label: "Not achieved — owner rejected",
    summary: "All fifteen earlier masters were rejected; no video has reached the owner-ready release condition.",
    reusable: "The owner's decision authority and locked release thresholds.",
    excluded: "Old READY_FOR_PUBLISHING state or QA cannot cross this gate.",
    currentRequirement: "Open only after the new master passes all Stage 14 controls with no P0 or material P1 defects.",
  };
  return {
    classification: "NOT_STARTED",
    label: "Not started",
    summary: "No conforming video has been published, so there is no valid performance data to hand off.",
    reusable: "Only the learning-contract structure and defined metrics.",
    excluded: "Do not use simulated results or rejected-master data as market-learning signals.",
    currentRequirement: "Run only after owner approval and a separately authorized publication.",
  };
};

const dataPolicy: SequentialProductionProjection["dataPolicy"] = [
  {
    id: "CURRENT_BUSINESS_FACTS",
    title: "Current business facts",
    decision: "Eligible as input only after a versioned snapshot and per-video recompilation.",
    examples: ["Committed niche", "active Channel Strategy", "audience definition", "15 canonical content briefs"],
    howUsed: "The Control Plane freezes the active versions and lineage, then compiles a new episode package without importing old scripts or media.",
    storage: "D1 — versioned records, active state, and lineage hashes.",
  },
  {
    id: "REUSABLE_KNOWLEDGE",
    title: "Reusable design and control knowledge",
    decision: "Inherited as rules and standards, never as episode production data.",
    examples: ["V7/V23.4/V281 controls", "failure taxonomy", "92/90/86 thresholds", "provider and cost controls", "rights and provenance rules"],
    howUsed: "Compile into versioned policies, rubrics, and stage contracts; every change creates a new version and regression gate.",
    storage: "Source-controlled contracts plus the D1 policy/version registry.",
  },
  {
    id: "NEW_EPISODE_ARTIFACTS",
    title: "New artifacts required for every video",
    decision: "Must be newly created and are the only evidence that can complete a stage.",
    examples: ["research dossier", "claim graph", "script", "storyboard", "shot contract", "media/audio", "master", "release QA"],
    howUsed: "Each artifact has its own ID, revision, parent, checksum, rights, cost, and QA; repairs create new revisions instead of overwriting.",
    storage: "D1 stores metadata/state, R2 stores bytes, and Google Drive stores an archived copy with its manifest.",
  },
  {
    id: "AUDIT_ONLY",
    title: "Historical data for audit and failure learning only",
    decision: "Preserved and access-controlled, with no candidate or release eligibility.",
    examples: ["15 rejected masters", "prior QA", "provider attempts", "cost ledger", "failure evidence"],
    howUsed: "Only for incident tracing, cost reconciliation, and failure-taxonomy extraction; it cannot receive production eligibility.",
    storage: "D1, R2, and Drive as immutable historical evidence.",
  },
  {
    id: "PROHIBITED_INPUTS",
    title: "Inputs prohibited from new production",
    decision: "Blocked by the Legacy Dependency Firewall.",
    examples: ["old master bytes", "old frame or asset hashes", "old templates or bindings", "stale storyboards", "old QA PASS decisions"],
    howUsed: "Candidate search and rendering read only newly lineage-bound eligible artifacts; detection of a legacy hash fails closed.",
    storage: "Retained for audit in a namespace and access path separated from production runtime.",
  },
];

const storageDesign: SequentialProductionProjection["storageDesign"] = [
  { layer: "D1", purpose: "Authoritative operational state", stores: "stage runs, artifact metadata, revisions, lineage, rights, provider/cost ledger, QA, and audit events", authority: "Decides which stage may run and which artifact is eligible" },
  { layer: "R2", purpose: "Runtime byte store", stores: "image, video, audio, contact-sheet, master, and evidence-manifest bytes", authority: "Only checksum-verified read-back artifacts may bind to the next stage" },
  { layer: "Google Drive", purpose: "User-owned long-term archive", stores: "verified output copies and manifests for handoff or recovery", authority: "Does not replace D1 queue/state and cannot grant production eligibility" },
];

const lineageFlow: SequentialProductionProjection["lineageFlow"] = [
  { step: 1, title: "Snapshot active business facts", detail: "Freeze the niche, Channel Strategy, audience, and canonical brief by version and hash." },
  { step: 2, title: "Compile a new episode package", detail: "Create a new ID and lineage without importing old scripts, storyboards, or media." },
  { step: 3, title: "Create new artifacts stage by stage", detail: "Every output records its parent, revision, checksum, rights, cost, and verification state." },
  { step: 4, title: "Bind eligible artifacts only", detail: "Downstream stages read only new VERIFIED/FROZEN artifacts; every legacy fallback is blocked." },
  { step: 5, title: "Assure quality, then learn after publication", detail: "New QA determines owner readiness; performance signals return only after an authorized publication." },
];

const stagePhase = (stageKey: string) => {
  if (["00", "01", "02", "03"].includes(stageKey)) return { key: "FOUNDATION" as const, label: "Foundation & truth" };
  if (["04", "05", "06", "07A", "07B", "08"].includes(stageKey)) return { key: "STORY" as const, label: "Story & production design" };
  if (["09", "10"].includes(stageKey)) return { key: "MEDIA" as const, label: "Media production" };
  if (["11", "12", "13", "14", "15"].includes(stageKey)) return { key: "EDIT" as const, label: "Edit, master & assurance" };
  return { key: "LEARNING" as const, label: "Release learning" };
};

export async function sequentialProductionProjection(channelId: string, db: SequentialProductionDB): Promise<SequentialProductionProjection> {
  const channel = await db.prepare("SELECT id,name,market,language FROM channels WHERE id=? LIMIT 1").bind(channelId).first<Row>();
  if (!channel) throw new Error("CHANNEL_NOT_FOUND");
  const program = await db.prepare("SELECT * FROM v7_sequential_programs WHERE channel_id=? LIMIT 1").bind(channelId).first<Row>();
  if (!program) throw new Error("SEQUENTIAL_PRODUCTION_PROGRAM_NOT_FOUND");
  const queue = await rows(db, "SELECT * FROM v7_sequential_queue WHERE program_id=? ORDER BY sequence", program.id);
  const current = queue.find((item) => boolean(item.active));
  if (!current) throw new Error("EXCLUSIVE_ACTIVE_VIDEO_NOT_FOUND");
  const stages = await rows(db, "SELECT * FROM v7_sequential_stage_runs WHERE queue_id=? ORDER BY sequence", current.id);
  const activeStage = stages.find((stage) => ["READY","RUNNING","REPAIR_REQUIRED","ESCALATED"].includes(text(stage.lifecycle_state))) ?? stages[0];
  const [standardRows, evidenceRows, goldenSequence, budgetPlan, requestSummary, capabilityRows, archetypeRows, fixtureRows, qualificationRows, requirementRows, contractRows, evaluationComponents, evaluationSources, evaluationCandidates, evaluationVerification, evaluationDefects, evaluationDatasets, evaluationBlockedRows, evaluationIncidents, evaluationRightsRows, evaluationRightsReceipts, evaluationRightsTasks] = await Promise.all([
    rows(db, "SELECT * FROM v7_video_quality_standards WHERE standard_version=? AND active=1 ORDER BY scope,id", VIDEO_QUALITY_STANDARD_VERSION),
    rows(db, "SELECT * FROM v7_video_quality_evidence WHERE queue_id=? AND standard_version=? ORDER BY created_at,evaluation_number", current.id, VIDEO_QUALITY_STANDARD_VERSION),
    db.prepare("SELECT * FROM v7_golden_sequences WHERE queue_id=? AND standard_version=? ORDER BY revision DESC LIMIT 1").bind(current.id, VIDEO_QUALITY_STANDARD_VERSION).first<Row>(),
    db.prepare("SELECT lifecycle_state,max_spend_usd,max_provider_requests,actual_spend_usd,actual_provider_requests FROM v7_sequential_budget_plans WHERE queue_id=? ORDER BY version DESC LIMIT 1").bind(current.id).first<Row>(),
    db.prepare("SELECT SUM(CASE WHEN lifecycle_state='RUNNING' THEN 1 ELSE 0 END) active,SUM(CASE WHEN lifecycle_state='COMPLETED' THEN 1 ELSE 0 END) completed,SUM(CASE WHEN lifecycle_state='FAILED' THEN 1 ELSE 0 END) failed,COALESCE(SUM(CASE WHEN lifecycle_state IN ('COMPLETED','FAILED') THEN cost_usd ELSE 0 END),0) spend FROM v7_sequential_provider_requests WHERE queue_id=?").bind(current.id).first<Row>(),
    rows(db, "SELECT * FROM v7_first_pass_capabilities ORDER BY plane,capability_key"),
    rows(db, "SELECT * FROM v7_first_pass_archetypes WHERE active=1 ORDER BY plane,archetype_key"),
    rows(db, "SELECT archetype_id,lifecycle_state FROM v7_first_pass_fixtures WHERE hardest_fixture=1 ORDER BY archetype_id,fixture_version"),
    rows(db, "SELECT * FROM v7_first_pass_qualifications ORDER BY capability_id,archetype_id,qualification_version"),
    rows(db, "SELECT * FROM v7_first_pass_operation_requirements WHERE active=1 ORDER BY capability_id,archetype_id"),
    rows(db, "SELECT * FROM v7_learning_ready_contract_registry WHERE active=1 ORDER BY contract_key"),
    rows(db, "SELECT * FROM v7_evaluation_foundation_registry WHERE active=1 ORDER BY component_key"),
    rows(db, "SELECT * FROM v7_evaluation_corpus_sources WHERE active=1 ORDER BY source_family,source_table"),
    db.prepare("SELECT COUNT(*) candidates,COALESCE(SUM(CASE WHEN lifecycle_state IN ('VERIFIED_FIXTURE','GOLD_ELIGIBLE') THEN 1 ELSE 0 END),0) verified,COALESCE(SUM(CASE WHEN lifecycle_state='GOLD_ELIGIBLE' AND qualification_eligible=1 THEN 1 ELSE 0 END),0) gold_eligible,COALESCE(SUM(CASE WHEN verification_state='PENDING' THEN 1 ELSE 0 END),0) verification_pending,COALESCE(SUM(CASE WHEN bytes_state='READBACK_VERIFIED' THEN 1 ELSE 0 END),0) byte_verified,COALESCE(SUM(CASE WHEN checksum_state='PASS' THEN 1 ELSE 0 END),0) checksum_pass,COALESCE(SUM(CASE WHEN provenance_state='PASS' THEN 1 ELSE 0 END),0) provenance_pass,COALESCE(SUM(CASE WHEN rights_verification_state='PASS' THEN 1 ELSE 0 END),0) rights_pass,COALESCE(SUM(CASE WHEN verification_state='PARTIAL_RIGHTS_PENDING' THEN 1 ELSE 0 END),0) rights_pending,COALESCE(SUM(CASE WHEN verification_state='BLOCKED' THEN 1 ELSE 0 END),0) verification_blocked,COALESCE(SUM(CASE WHEN verification_state='EXCLUDED' THEN 1 ELSE 0 END),0) verification_excluded,COALESCE(SUM(release_eligible),0) release_eligible,COALESCE(SUM(provider_requests),0) provider_requests,COALESCE(SUM(spend_usd),0) spend,(SELECT COUNT(*) FROM (SELECT dedup_hash FROM v7_evaluation_candidates d WHERE d.channel_id=? AND d.dedup_hash IS NOT NULL GROUP BY dedup_hash HAVING COUNT(*)>1)) duplicate_groups FROM v7_evaluation_candidates WHERE channel_id=?").bind(channelId, channelId).first<Row>(),
    db.prepare("SELECT COUNT(*) runs,COALESCE(SUM(bytes_read),0) bytes_read,COALESCE(SUM(provider_requests),0) provider_requests,COALESCE(SUM(spend_usd),0) spend FROM v7_evaluation_verification_runs WHERE channel_id=?").bind(channelId).first<Row>(),
    rows(db, "SELECT * FROM v7_evaluation_defect_taxonomy WHERE active=1 ORDER BY severity,defect_key"),
    rows(db, "SELECT * FROM v7_evaluation_datasets ORDER BY dataset_key,dataset_version"),
    rows(db, `SELECT c.candidate_kind,c.artifact_type,c.content_hash candidate_declared_hash,c.byte_size candidate_declared_bytes,
      a.id source_artifact_id,a.package_id source_package_id,a.sha256 source_hash,a.byte_size source_bytes,a.engine_version source_engine_version,
      r.computed_hash,r.actual_bytes,r.object_metadata_json,r.bytes_state,r.checksum_state,r.provenance_state,r.reconciliation_reasons_json
      FROM v7_evaluation_candidates c
      JOIN v7_evaluation_verification_receipts r ON r.id=c.latest_verification_receipt_id
      JOIN production_v2_artifacts a ON c.source_table='production_v2_artifacts' AND a.id=c.source_id
      WHERE c.channel_id=? AND c.verification_state='BLOCKED'
      ORDER BY c.candidate_kind,c.artifact_type`, channelId),
    db.prepare(`SELECT COUNT(*) incidents,
      COALESCE(SUM(CASE WHEN NOT EXISTS (SELECT 1 FROM v7_evaluation_candidate_dispositions d WHERE d.candidate_id=i.candidate_id AND d.basis_receipt_id=i.basis_receipt_id)
        AND NOT EXISTS (SELECT 1 FROM v7_evaluation_incident_resolutions x WHERE x.incident_id=i.id) THEN 1 ELSE 0 END),0) open_incidents,
      COALESCE(SUM(CASE WHEN incident_type='SOURCE_OBJECT_BYTE_DIVERGENCE' THEN 1 ELSE 0 END),0) byte_divergence,
      COALESCE(SUM(CASE WHEN incident_type='R2_METADATA_BINDING_MISMATCH' AND NOT EXISTS (SELECT 1 FROM v7_evaluation_incident_resolutions x WHERE x.incident_id=i.id) THEN 1 ELSE 0 END),0) metadata_review,
      (SELECT COUNT(*) FROM v7_evaluation_candidate_dispositions d WHERE d.channel_id=? AND d.disposition='QUARANTINE_EVALUATION_ONLY') quarantined,
      (SELECT COUNT(*) FROM v7_evaluation_metadata_binding_receipts b WHERE b.channel_id=? AND b.binding_state='UNIQUE_STORAGE_HASH_REBIND_VERIFIED') metadata_bindings
      FROM v7_evaluation_evidence_incidents i WHERE channel_id=?`).bind(channelId, channelId, channelId).first<Row>(),
    rows(db, `SELECT c.candidate_kind,r.rights_basis,json_extract(a.provenance_json,'$.provider') provider
      FROM v7_evaluation_candidates c
      JOIN v7_evaluation_verification_receipts r ON r.id=c.latest_verification_receipt_id
      JOIN production_v2_artifacts a ON c.source_table='production_v2_artifacts' AND a.id=c.source_id
      WHERE c.channel_id=? AND c.verification_state='PARTIAL_RIGHTS_PENDING'
      ORDER BY c.candidate_kind,r.rights_basis`, channelId),
    db.prepare("SELECT COUNT(*) accepted FROM v7_evaluation_rights_receipts WHERE channel_id=? AND rights_state='PASS'").bind(channelId).first<Row>(),
    rows(db, "SELECT task_type,COUNT(*) count FROM v7_evaluation_rights_evidence_tasks WHERE channel_id=? GROUP BY task_type ORDER BY count DESC,task_type", channelId),
  ]);
  const evaluationConflicts = summarizeCorpusEvidenceConflicts(evaluationBlockedRows.map((row) => ({
    candidateKind: text(row.candidate_kind), artifactType: text(row.artifact_type), bytesState: text(row.bytes_state), checksumState: text(row.checksum_state),
    provenanceState: text(row.provenance_state), reconciliationReasonsJson: text(row.reconciliation_reasons_json),
    candidateDeclaredHash: text(row.candidate_declared_hash), candidateDeclaredBytes: number(row.candidate_declared_bytes), sourceArtifactId: text(row.source_artifact_id),
    sourcePackageId: text(row.source_package_id), sourceHash: text(row.source_hash), sourceBytes: number(row.source_bytes), sourceEngineVersion: text(row.source_engine_version),
    computedHash: text(row.computed_hash), actualBytes: number(row.actual_bytes), objectMetadataJson: text(row.object_metadata_json),
  })));
  const evaluationRightsQueue = summarizeEvaluationRightsQueue(evaluationRightsRows.map((row) => ({ candidateKind: text(row.candidate_kind), rightsBasis: text(row.rights_basis), provider: text(row.provider) })));
  const goldenAssets = goldenSequence ? await rows(db, "SELECT id,role,temporal_state,sha256 FROM v7_golden_sequence_assets WHERE golden_sequence_id=? AND role='GOLDEN_MASTER_VIDEO' ORDER BY created_at DESC LIMIT 1", goldenSequence.id) : [];
  const goldenMasterJob = goldenSequence ? await db.prepare("SELECT lifecycle_state,probe_json,scan_json,error_code FROM v7_golden_master_jobs WHERE golden_sequence_id=? AND revision=? LIMIT 1").bind(goldenSequence.id, goldenSequence.revision).first<Row>() : null;
  const goldenAssetUrl = (role: string) => { const asset = goldenAssets.find((item) => text(item.role) === role); return asset ? `/api/factory/sequential-production/quality?asset=${encodeURIComponent(text(asset.id))}` : undefined; };
  const goldenAssetHash = (role: string) => { const asset = goldenAssets.find((item) => text(item.role) === role); return asset ? text(asset.sha256) : undefined; };
  const registry = standardRows.map((item) => ({
    standardId: text(item.id), version: VIDEO_QUALITY_STANDARD_VERSION, scope: text(item.scope), scopeKey: text(item.scope_key), enforcementLevel: text(item.enforcement_level),
    trigger: text(item.trigger), metric: text(item.metric), thresholdOrRange: text(item.threshold_or_range), evidenceRequired: json<string[]>(item.evidence_required_json, []), owningStage: text(item.owning_stage),
    failureAction: text(item.failure_action), waiverPolicy: text(item.waiver_policy), active: boolean(item.active),
  })) as VideoQualityStandard[];
  const latestEvidence = new Map<string, VideoQualityEvidence>();
  for (const item of evidenceRows) latestEvidence.set(text(item.standard_id), {
    standardId: text(item.standard_id), status: text(item.lifecycle_state) as VideoQualityEvidence["status"], evidenceKind: text(item.evidence_kind) as VideoQualityEvidence["evidenceKind"],
    evidenceHash: text(item.evidence_hash) || undefined, measuredValue: item.measured_value_json ? json<unknown>(item.measured_value_json, undefined) as string | number | undefined : undefined, artifactId: text(item.artifact_id) || undefined,
  });
  const resolvedStandards = resolveVideoQualityStandards(registry, VIDEO_01_QUALITY_ROUTE);
  const qualityEligibility = evaluateVideoQualityEligibility(resolvedStandards, [...latestEvidence.values()]);
  const qualityGaps = qualityEligibility.gaps.map((gap) => ({ standardId: gap.standardId, level: gap.level, owningStage: gap.owningStage, status: gap.status, evidenceRequired: gap.evidenceRequired }));
  const goldenState = text(goldenSequence?.lifecycle_state) || "NOT_STARTED";
  const goldenQuality = goldenSequence?.quality_json ? json<Record<string, unknown>>(goldenSequence.quality_json, {}) : {};
  const goldenScan = goldenMasterJob?.scan_json ? json<Record<string, unknown>>(goldenMasterJob.scan_json, {}) : {};
  const rootStageKeys = deriveRootStageKeys(goldenState, goldenQuality, goldenScan, qualityGaps);
  const latestQualification = new Map<string, Row>();
  for (const qualification of qualificationRows) latestQualification.set(`${text(qualification.capability_id)}:${text(qualification.archetype_id)}`, qualification);
  const uniqueRequirementPairs = [...new Map(requirementRows.map((requirement) => [`${text(requirement.capability_id)}:${text(requirement.archetype_id)}`, requirement])).values()];
  const qualificationPasses = (requirement: Row) => {
    const capability = capabilityRows.find((item) => text(item.id) === text(requirement.capability_id));
    const qualification = latestQualification.get(`${text(requirement.capability_id)}:${text(requirement.archetype_id)}`);
    const evidenceHashes = json<unknown[]>(qualification?.evidence_hashes_json, []);
    return Boolean(capability && qualification)
      && text(capability.lifecycle_state) === "QUALIFIED"
      && text(qualification?.lifecycle_state) === "QUALIFIED"
      && text(qualification?.capability_version) === text(capability?.capability_version)
      && text(qualification?.standard_version) === "FIRST_PASS_QUALITY_V1"
      && Boolean(text(qualification?.settings_hash))
      && text(capability?.active_settings_hash) !== "UNRESOLVED"
      && text(qualification?.settings_hash) === text(capability?.active_settings_hash)
      && number(qualification?.sample_size) >= number(requirement.minimum_sample_size)
      && number(qualification?.first_pass_yield) >= number(requirement.minimum_first_pass_yield)
      && number(qualification?.p0_escape_count) === 0
      && evidenceHashes.length >= number(requirement.minimum_sample_size)
      && !text(qualification?.revoked_at);
  };
  const qualifiedRequirementPairs = uniqueRequirementPairs.filter(qualificationPasses);
  const capabilitySummaries = capabilityRows.map((capability) => {
    const requirements = uniqueRequirementPairs.filter((item) => text(item.capability_id) === text(capability.id));
    const passed = requirements.filter(qualificationPasses);
    const yields = passed.map((item) => number(latestQualification.get(`${text(item.capability_id)}:${text(item.archetype_id)}`)?.first_pass_yield));
    return {
      id: text(capability.id), key: text(capability.capability_key), version: text(capability.capability_version), plane: text(capability.plane), label: text(capability.label),
      provider: text(capability.provider), toolOrModel: text(capability.tool_or_model), stageKeys: json<string[]>(capability.stage_keys_json, []),
      state: requirements.length > 0 && passed.length === requirements.length ? "QUALIFIED" : passed.length > 0 ? "PARTIALLY_QUALIFIED" : "QUALIFICATION_REQUIRED",
      qualifiedArchetypes: passed.length, requiredArchetypes: requirements.length, firstPassYield: yields.length ? Math.min(...yields) : 0,
    };
  });
  const archetypeSummaries = archetypeRows.map((archetype) => {
    const requirements = uniqueRequirementPairs.filter((item) => text(item.archetype_id) === text(archetype.id));
    const passed = requirements.filter(qualificationPasses);
    return {
      id: text(archetype.id), key: text(archetype.archetype_key), plane: text(archetype.plane), label: text(archetype.label), riskTier: text(archetype.risk_tier),
      minimumYield: number(archetype.minimum_first_pass_yield), state: requirements.length > 0 && passed.length === requirements.length ? "QUALIFIED" : passed.length > 0 ? "PARTIALLY_QUALIFIED" : "QUALIFICATION_REQUIRED",
      capabilityLabels: requirements.map((requirement) => text(capabilityRows.find((capability) => text(capability.id) === text(requirement.capability_id))?.label)).filter(Boolean),
      evidence: json<string[]>(archetype.required_evidence_json, []),
    };
  });
  const capabilitiesQualified = capabilitySummaries.filter((capability) => capability.state === "QUALIFIED").length;
  const archetypesQualified = archetypeSummaries.filter((archetype) => archetype.state === "QUALIFIED").length;
  const capabilityRegistryState = qualifiedRequirementPairs.length === uniqueRequirementPairs.length && uniqueRequirementPairs.length > 0 ? "QUALIFIED" as const
    : qualifiedRequirementPairs.length > 0 ? "PARTIALLY_QUALIFIED" as const
    : "QUALIFICATION_REQUIRED" as const;
  const goldenR10Eligible = false;
  const activeRequests = number(requestSummary?.active);
  const runningStage = stages.some((stage) => text(stage.lifecycle_state) === "RUNNING");
  const effectiveState = text(current.lifecycle_state) === "OWNER_READY" ? "OWNER_READY" as const
    : goldenState === "REPAIR_REQUIRED" || rootStageKeys.length > 0 ? "ROOT_REPAIR_REQUIRED" as const
    : qualityEligibility.eligibility !== "VIDEO_EXCELLENCE_ELIGIBLE" ? "QUALITY_BLOCKED" as const
    : activeRequests > 0 || runningStage ? "PRODUCTION_RUNNING" as const
    : text(activeStage?.lifecycle_state) === "READY" ? "ACTION_REQUIRED" as const
    : "BLOCKED_UPSTREAM" as const;
  const effectiveLabels = {
    ROOT_REPAIR_REQUIRED: "Root repair required",
    QUALITY_BLOCKED: "Quality evidence blocked",
    PRODUCTION_RUNNING: "Production running",
    ACTION_REQUIRED: "Action required",
    OWNER_READY: "Ready for owner review",
    BLOCKED_UPSTREAM: "Blocked by upstream work",
  } as const;
  const rootStageLabels = rootStageKeys.map((key) => `${key} · ${stageDisplayNames[key] ?? key}`);
  const effectiveSummary = effectiveState === "ROOT_REPAIR_REQUIRED"
    ? `Golden sequence ${goldenState === "REPAIR_REQUIRED" ? "failed visual or audio playback" : "has unresolved quality evidence"}. Requalify ${rootStageKeys.length ? `Stages ${rootStageKeys.join(", ")}` : "the owning stages"} before another master.`
    : effectiveState === "QUALITY_BLOCKED" ? "Control history exists, but the current video has not satisfied its audience-facing quality evidence."
    : effectiveState === "PRODUCTION_RUNNING" ? "A bounded production operation is active; downstream stages remain locked until verified completion."
    : effectiveState === "OWNER_READY" ? "All production and independent assurance gates passed; the owner can review the release candidate."
    : effectiveState === "ACTION_REQUIRED" ? "The next stage is ready, but no production operation is currently running."
    : "The current video cannot advance until its upstream eligibility is restored.";
  const rejected = await db.prepare("SELECT COUNT(*) total FROM production_v2_packages WHERE channel_id=? AND lifecycle_state='REJECTED_QUALITY'").bind(channelId).first<Row>();
  const preserved = await db.prepare("SELECT COUNT(*) total FROM production_v2_artifacts a JOIN production_v2_packages p ON p.id=a.package_id WHERE p.channel_id=?").bind(channelId).first<Row>();
  const activeCount = queue.filter((item) => boolean(item.active)).length;
  const queueCoverage = queue.length === number(program.target_videos);
  const stageCoverage = stages.length === 18;
  const rejectedCount = number(rejected?.total);
  const checks = [
    { label: "Exactly one video has an active lease", passed: activeCount === 1, evidence: `${activeCount} video authorized for production` },
    { label: "The production queue is complete", passed: queueCoverage, evidence: `${queue.length}/${number(program.target_videos)} videos contracted` },
    { label: "The current video has all stage contracts", passed: stageCoverage, evidence: `${stages.length}/18 stages for video #${number(current.sequence)}` },
    { label: "Prior masters are quarantined", passed: rejectedCount === number(program.target_videos), evidence: `${rejectedCount}/${number(program.target_videos)} masters rejected for perceived quality` },
    { label: "YouTube auto-publishing is disabled", passed: !boolean(program.auto_publish), evidence: "Publishing authority remains with the owner" },
  ];
  const ready = checks.every((check) => check.passed);

  return {
    contract: SEQUENTIAL_PRODUCTION_CONTRACT,
    channel: { id: text(channel.id), name: text(channel.name), market: text(channel.market), language: text(channel.language) },
    program: {
      state: text(program.lifecycle_state), mode: "ONE_VIDEO_AT_A_TIME", targetVideos: number(program.target_videos), currentSequence: number(program.current_sequence),
      completedVideos: queue.filter((item) => text(item.lifecycle_state) === "OWNER_READY").length,
      blockedVideos: queue.filter((item) => text(item.lifecycle_state) === "BLOCKED_PREVIOUS_VIDEO").length,
      overallFloor: number(program.overall_floor), criticalFloor: number(program.critical_floor), dimensionFloor: number(program.dimension_floor),
      p0Tolerance: number(program.p0_tolerance), p1Tolerance: number(program.p1_tolerance), maximumRepairLoops: number(program.maximum_repair_loops),
      ownerGate: text(program.owner_gate), autoDispatch: boolean(program.auto_dispatch), autoPublish: boolean(program.auto_publish),
    },
    currentVideo: {
      id: text(current.id), packageId: text(current.package_id), sequence: number(current.sequence), title: text(current.title), state: text(current.lifecycle_state),
      sourceBriefHash: text(current.source_brief_hash), priorMasterState: text(current.prior_master_state), activeStageKey: text(activeStage?.stage_key),
      activeStageName: text(activeStage?.stage_name), activeStageState: text(activeStage?.lifecycle_state),
      nextAction: qualityEligibility.nextValidAction,
      controlState: `Stage 00–10 FROZEN · Stage ${text(activeStage?.stage_key)} ${text(activeStage?.lifecycle_state)}`,
      qualityEligibility: qualityEligibility.eligibility,
      qualityStandardVersion: VIDEO_QUALITY_STANDARD_VERSION,
      nextValidAction: qualityEligibility.nextValidAction,
      effectiveState,
      effectiveStateLabel: effectiveLabels[effectiveState],
      effectiveStateSummary: effectiveSummary,
      rootStageKeys,
      rootStageLabels,
      nextMilestone: number(evaluationCandidates?.verification_pending) === 0 ? "Wave 3 · Repair and label evidence" : "Wave 3 · Verify failure corpus",
    },
    firstPass: {
      standardVersion: "FIRST_PASS_QUALITY_V1",
      currentSlice: "WAVE_3",
      currentSliceState: number(evaluationCandidates?.verification_pending) === 0 ? "CORPUS_BYTE_RECONCILIATION_COMPLETE" : "CORPUS_VERIFICATION_ACTIVE",
      nextSlice: number(evaluationCandidates?.verification_pending) === 0 ? "WP7_EVIDENCE_REPAIR_AND_LABELING" : "WP7_CORPUS_VERIFICATION",
      nextSliceLabel: number(evaluationCandidates?.verification_pending) === 0 ? "Repair blocked evidence, collect rights receipts and owner-label independent fixtures" : "Read back bytes, verify lineage and owner-label independent fixtures",
      capabilityRegistryState,
      dispatchGuardState: "ENFORCED",
      goldenR10Eligible,
      independentAssurancePolicy: "ONE_CONFIRMATION",
      executableContract: {
        state: "VERIFIED",
        programVersion: "SHOT_CUE_PROGRAM_V1",
        compilerVersion: "DETERMINISTIC_SHOT_CUE_COMPILER_1.0.0",
        durationSeconds: FP3_GOLDEN_CONTRACT_SUMMARY.durationSeconds,
        shotCount: FP3_GOLDEN_CONTRACT_SUMMARY.shotCount,
        treatmentFamilyCount: FP3_GOLDEN_CONTRACT_SUMMARY.treatmentFamilyCount,
        timelineGaps: FP3_GOLDEN_CONTRACT_SUMMARY.timelineGaps,
        timelineOverlaps: FP3_GOLDEN_CONTRACT_SUMMARY.timelineOverlaps,
        schemaGaps: FP3_GOLDEN_CONTRACT_SUMMARY.schemaGaps,
        providerRequests: FP3_GOLDEN_CONTRACT_SUMMARY.providerRequests,
        spendUsd: FP3_GOLDEN_CONTRACT_SUMMARY.spendUsd,
      },
      capabilitiesTotal: capabilitySummaries.length,
      capabilitiesQualified,
      archetypesTotal: archetypeSummaries.length,
      archetypesQualified,
      fixturesDesigned: fixtureRows.filter((fixture) => ["DESIGNED", "READY", "EXECUTED", "VERIFIED"].includes(text(fixture.lifecycle_state))).length,
      capabilities: capabilitySummaries,
      archetypes: archetypeSummaries,
      contractPack: {
        version: "LEARNING_READY_CONTRACT_PACK_V1",
        state: "CONTRACT_SCHEMA_ACTIVE",
        contractsDefined: contractRows.length,
        contractsSealed: 0,
        providerRequests: 0,
        spendUsd: 0,
        definitions: contractRows.map((item) => ({
          key: text(item.contract_key), artifactType: text(item.artifact_type), ownerPlane: text(item.owner_plane),
          stageBindings: json<string[]>(item.stage_bindings_json, []), lifecycleState: text(item.lifecycle_state),
        })),
      },
      evaluationFoundation: {
        version: "EVALUATION_FOUNDATION_V1",
        state: number(evaluationCandidates?.verification_pending) === 0 ? "CORPUS_BYTE_RECONCILIATION_COMPLETE" : number(evaluationCandidates?.verification_pending) < number(evaluationCandidates?.candidates) ? "CORPUS_VERIFICATION_ACTIVE" : "CANDIDATE_INVENTORY_ACTIVE",
        componentsDefined: evaluationComponents.length,
        corpusSources: evaluationSources.length,
        candidateArtifacts: number(evaluationCandidates?.candidates),
        rejectedPackages: rejectedCount,
        verifiedFixtures: number(evaluationCandidates?.verified),
        goldEligible: number(evaluationCandidates?.gold_eligible),
        duplicateHashGroups: number(evaluationCandidates?.duplicate_groups),
        verificationRuns: number(evaluationVerification?.runs),
        verificationPending: number(evaluationCandidates?.verification_pending),
        byteVerified: number(evaluationCandidates?.byte_verified),
        checksumPass: number(evaluationCandidates?.checksum_pass),
        provenancePass: number(evaluationCandidates?.provenance_pass),
        rightsPass: number(evaluationCandidates?.rights_pass),
        rightsPending: number(evaluationCandidates?.rights_pending),
        verificationBlocked: number(evaluationCandidates?.verification_blocked),
        verificationExcluded: number(evaluationCandidates?.verification_excluded),
        evidenceIncidents: number(evaluationIncidents?.incidents),
        openEvidenceIncidents: number(evaluationIncidents?.open_incidents),
        byteDivergenceIncidents: number(evaluationIncidents?.byte_divergence),
        metadataReviewRequired: number(evaluationIncidents?.metadata_review),
        quarantinedCandidates: number(evaluationIncidents?.quarantined),
        metadataBindingsAccepted: number(evaluationIncidents?.metadata_bindings),
        rightsReceiptsAccepted: number(evaluationRightsReceipts?.accepted),
        rightsBasisCounts: evaluationRightsQueue.basisCounts,
        rightsKindCounts: evaluationRightsQueue.kindCounts,
        rightsProviderCounts: evaluationRightsQueue.providerCounts,
        rightsEvidenceTaskCounts: evaluationRightsTasks.map((item) => ({ key: text(item.task_type), count: number(item.count) })),
        verificationBytesRead: number(evaluationVerification?.bytes_read),
        blockedReasonCounts: evaluationConflicts.reasonCounts,
        blockedFactCounts: evaluationConflicts.factCounts,
        blockedStateCounts: evaluationConflicts.stateCounts,
        blockedKindCounts: evaluationConflicts.kindCounts,
        defectFamilies: evaluationDefects.length,
        p0DefectFamilies: evaluationDefects.filter((item) => text(item.severity) === "P0").length,
        sealedDatasets: evaluationDatasets.filter((item) => text(item.lifecycle_state) === "SEALED").length,
        releaseEligibleFixtures: number(evaluationCandidates?.release_eligible),
        providerRequests: 0,
        spendUsd: 0,
        nextAction: number(evaluationCandidates?.verification_pending) === 0 && number(evaluationCandidates?.verification_blocked) === 0 ? `Collect the ${number(evaluationCandidates?.rights_pending)} missing rights receipts and owner-confirmed defect labels, then remove duplicate and correlated revisions before sealing any dataset.` : number(evaluationCandidates?.verification_pending) === 0 ? "Review unresolved metadata-binding incidents, collect missing rights evidence and owner-confirmed defect labels, then remove duplicate and correlated revisions before sealing any dataset." : "Verify R2 bytes, recompute checksums, reconcile provenance and rights, collect owner-confirmed defect labels, then remove duplicate and correlated revisions before sealing any dataset.",
      },
      readiness: [
        { id: "EFFECTIVE_PROJECTION", label: "Effective production state", passed: true, evidence: `${effectiveLabels[effectiveState]} projected from canonical evidence`, owningStages: ["00"] },
        { id: "CAPABILITY_REGISTRY", label: "Capability Registry runtime", passed: true, evidence: `${capabilitySummaries.length} versioned capabilities, ${archetypeSummaries.length} hardest archetypes and fail-closed dispatch auditing are active`, owningStages: ["07A", "07B", "09", "10", "13", "14"] },
        { id: "CAPABILITY_QUALIFICATION", label: "Capability qualification", passed: capabilityRegistryState === "QUALIFIED", evidence: `${qualifiedRequirementPairs.length}/${uniqueRequirementPairs.length} capability–archetype bindings qualified; ${fixtureRows.length} fixtures designed`, owningStages: ["07A", "07B", "09", "10", "13", "14"] },
        { id: "EXECUTABLE_CONTRACT", label: "Executable shot and cue contract", passed: true, evidence: `${FP3_GOLDEN_CONTRACT_SUMMARY.shotCount} typed shots cover ${FP3_GOLDEN_CONTRACT_SUMMARY.durationSeconds.toFixed(3)}s with ${FP3_GOLDEN_CONTRACT_SUMMARY.timelineGaps} gaps, ${FP3_GOLDEN_CONTRACT_SUMMARY.timelineOverlaps} overlaps, ${FP3_GOLDEN_CONTRACT_SUMMARY.schemaGaps} schema gaps and zero provider dispatch`, owningStages: ["08"] },
        { id: "PRODUCTION_INTEGRITY", label: "FP3.1 production runtime", passed: true, evidence: "Migration 0050 is production-active; historical fencing backfill, stale-writer rejection, orphan reconciliation and the zero-dispatch firewall probe passed with no new provider request or spend", owningStages: ["00", "03", "06"] },
        { id: "LEARNING_READY_CONTRACTS", label: "Learning-ready contract schemas", passed: contractRows.length === 8, evidence: `${contractRows.length}/8 channel identity, packaging, prediction, experiment, learning, rights/compliance, animatic and master-delivery schemas active; zero provider authority`, owningStages: ["04", "05", "08", "11", "13", "15", "16"] },
        { id: "EVALUATION_FOUNDATION", label: "WP7 evaluation inventory", passed: evaluationComponents.length === 6 && number(evaluationCandidates?.release_eligible) === 0, evidence: `${number(evaluationCandidates?.candidates)} historical artifacts inventoried as candidate evidence; ${number(evaluationCandidates?.verified)} verified fixtures, ${number(evaluationCandidates?.gold_eligible)} gold-eligible, ${evaluationDefects.length} defect families; zero release authority and zero provider dispatch`, owningStages: ["12", "14"] },
        { id: "VISUAL_PLANE", label: "Qualified visual plane", passed: false, evidence: "FP4 must pass real-pixel, semantic-motion and variety gates", owningStages: ["07B", "09"] },
        { id: "AUDIO_PLANE", label: "Qualified audio plane", passed: false, evidence: "FP5 must pass narration, music, ambience, SFX and perceptual-mix gates", owningStages: ["07A", "10"] },
        { id: "GOLDEN_R10", label: "Golden r10", passed: goldenR10Eligible, evidence: goldenR10Eligible ? "Capability requirements are qualified; later FP3–FP5 gates still control production" : "Forbidden until all capability bindings and FP3–FP5 gates are green", owningStages: ["11", "12", "13", "14"] },
      ],
    },
    operations: {
      activeProviderRequests: activeRequests,
      completedProviderRequests: number(requestSummary?.completed),
      failedProviderRequests: number(requestSummary?.failed),
      actualSpendUsd: number(requestSummary?.spend ?? budgetPlan?.actual_spend_usd),
      maxSpendUsd: number(budgetPlan?.max_spend_usd),
      actualProviderRequests: number(budgetPlan?.actual_provider_requests),
      maxProviderRequests: number(budgetPlan?.max_provider_requests),
      budgetState: text(budgetPlan?.lifecycle_state) || "NOT_APPROVED",
    },
    quality: {
      eligibility: qualityEligibility.eligibility,
      standardVersion: VIDEO_QUALITY_STANDARD_VERSION,
      registryCount: registry.length,
      resolvedStandards: qualityEligibility.resolvedStandards,
      hardStandards: qualityEligibility.hardStandards,
      passedHardStandards: qualityEligibility.passedHardStandards,
      goldenSequenceState: goldenState,
      goldenSequenceDurationSeconds: number(goldenSequence?.duration_seconds),
      goldenMasterUrl: goldenAssetUrl("GOLDEN_MASTER_VIDEO"),
      goldenMasterSha256: goldenAssetHash("GOLDEN_MASTER_VIDEO"),
      goldenMasterState: text(goldenMasterJob?.lifecycle_state) || "MASTER_REQUIRED",
      goldenMasterProbe: goldenMasterJob?.probe_json ? json<Record<string, number>>(goldenMasterJob.probe_json, {}) : undefined,
      gaps: qualityGaps,
    },
    stages: stages.map((stage) => {
      const key = text(stage.stage_key);
      const phase = stagePhase(key);
      const attention = rootStageKeys.includes(key);
      const downstreamBlocked = rootStageKeys.length > 0 && ["11", "12", "13", "14", "15", "16"].includes(key);
      const state = text(stage.lifecycle_state);
      const effectiveStageState = attention ? "REOPEN_REQUIRED" : downstreamBlocked ? "BLOCKED_BY_REPAIR" : state;
      const repairAction = key === "07B" || key === "09" ? "Execute and qualify the visual archetype fixtures in FP4; production dispatch remains blocked."
        : key === "08" ? "Preserve the sealed FP3 ShotCueProgram and wait for its visual and audio capability bindings to qualify in FP4/FP5."
        : key === "07A" || key === "10" ? "Execute and qualify narration, music, ambience and SFX fixtures in FP5."
        : "Complete the remaining first-pass qualification before producing a replacement artifact.";
      const stageAction = attention ? repairAction
        : downstreamBlocked ? "Wait for root stages and Golden r10 to pass."
        : key === "16" ? "Wait for owner-authorized publication and real performance data."
        : state === "READY" ? "Complete the current-stage Definition of Ready, then dispatch a bounded job."
        : "Preserve current evidence and follow the dependency-ordered gate.";
      return {
        key, sequence: number(stage.sequence), name: text(stage.stage_name), displayName: stageDisplayNames[key] ?? text(stage.stage_name), plane: text(stage.owner_plane), state,
        gateVersion: text(stage.gate_version), requiredArtifacts: json<string[]>(stage.required_artifacts_json, []), evidence: text(stage.evidence_summary), blocker: text(stage.blocker) || undefined,
        phaseKey: phase.key, phaseLabel: phase.label, effectiveState: effectiveStageState, effectiveStateLabel: effectiveStageState.replaceAll("_", " "), attention,
        inputHealth: attention ? "REQUALIFICATION_REQUIRED" : downstreamBlocked ? "UPSTREAM_BLOCKED" : state === "FROZEN" ? "VERIFIED_HISTORY_ONLY" : "NOT_YET_VERIFIED",
        gateSummary: attention ? "Root-cause capability gate is open" : downstreamBlocked ? "Blocked by upstream repair" : `${text(stage.gate_version)} · ${state.replaceAll("_", " ")}`,
        nextAction: stageAction, priorWork: priorWork(key),
      };
    }),
    queue: queue.map((item) => ({ id: text(item.id), sequence: number(item.sequence), title: text(item.title), state: text(item.lifecycle_state), active: boolean(item.active), priorMasterState: text(item.prior_master_state), ownerReady: Boolean(item.owner_ready_at) })),
    architecture, critics,
    historySummary: [
      { label: "Previously performed; design only", count: 10, description: "Stages 00–08. Every artifact must be recreated for video #1.", classification: "FOUNDATION_GROUP" },
      { label: "Previously run; full rebuild required", count: 5, description: "Stages 09–13. Prior outputs failed and are runtime-ineligible.", classification: "REBUILD_GROUP" },
      { label: "Final quality gates not achieved", count: 2, description: "Stages 14–15. No V281 PASS or owner-ready result exists.", classification: "FINAL_GROUP" },
      { label: "Not started", count: 1, description: "Stage 16 runs only after an authorized publication.", classification: "NOT_STARTED" },
    ],
    dataPolicy,
    storageDesign,
    lineageFlow,
    releaseRules: [
      `Overall ≥ ${number(program.overall_floor)}; critical criteria ≥ ${number(program.critical_floor)}; every dimension ≥ ${number(program.dimension_floor)}.`,
      "P0=0 and no unresolved material P1; averages cannot compensate for a failed hard gate.",
      "Watch the full video continuously and inspect three temporal samples for every editorial shot.",
      "Browser Assurance Gate V1 must bind real rendered playback to the exact master hash; source, metadata or direct API self-attestation cannot close it.",
      `At most ${number(program.maximum_repair_loops)} root-cause repair loops; a third failure requires escalation.`,
      "Only a new immutable master revision may be rescored; failed artifacts and critic evidence remain preserved.",
      "Video N+1 cannot run before video N is owner-ready; publishing authority is a separate gate.",
    ],
    historical: { rejectedMasters: rejectedCount, preservedArtifacts: number(preserved?.total), policy: text(program.historical_master_policy), reason: "The owner rejected the prior masters because technical QA did not represent real content and perceived quality." },
    integrity: { state: ready ? "READY" : "BLOCKED", checks },
  };
}
