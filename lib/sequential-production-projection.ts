import { SEQUENTIAL_PRODUCTION_CONTRACT, type SequentialProductionProjection } from "@/app/production-control-contract";
import {
  evaluateVideoQualityEligibility,
  resolveVideoQualityStandards,
  VIDEO_01_QUALITY_ROUTE,
  VIDEO_QUALITY_STANDARD_VERSION,
  type VideoQualityEvidence,
  type VideoQualityStandard,
} from "@/lib/video-quality-standard";

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
  const [standardRows, evidenceRows, goldenSequence] = await Promise.all([
    rows(db, "SELECT * FROM v7_video_quality_standards WHERE standard_version=? AND active=1 ORDER BY scope,id", VIDEO_QUALITY_STANDARD_VERSION),
    rows(db, "SELECT * FROM v7_video_quality_evidence WHERE queue_id=? AND standard_version=? ORDER BY created_at,evaluation_number", current.id, VIDEO_QUALITY_STANDARD_VERSION),
    db.prepare("SELECT * FROM v7_golden_sequences WHERE queue_id=? AND standard_version=? ORDER BY revision DESC LIMIT 1").bind(current.id, VIDEO_QUALITY_STANDARD_VERSION).first<Row>(),
  ]);
  const goldenAssets = goldenSequence ? await rows(db, "SELECT id,role,temporal_state FROM v7_golden_sequence_assets WHERE golden_sequence_id=? AND (role='AUDIENCE_MIX' OR (role='TEMPORAL_FRAME' AND temporal_state='MIDPOINT')) ORDER BY role,shot_id LIMIT 2", goldenSequence.id) : [];
  const goldenAssetUrl = (role: string) => { const asset = goldenAssets.find((item) => text(item.role) === role); return asset ? `/api/factory/sequential-production/quality?asset=${encodeURIComponent(text(asset.id))}` : undefined; };
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
    },
    quality: {
      eligibility: qualityEligibility.eligibility,
      standardVersion: VIDEO_QUALITY_STANDARD_VERSION,
      registryCount: registry.length,
      resolvedStandards: qualityEligibility.resolvedStandards,
      hardStandards: qualityEligibility.hardStandards,
      passedHardStandards: qualityEligibility.passedHardStandards,
      goldenSequenceState: text(goldenSequence?.lifecycle_state) || "NOT_STARTED",
      goldenSequenceDurationSeconds: number(goldenSequence?.duration_seconds),
      goldenPosterUrl: goldenAssetUrl("TEMPORAL_FRAME"),
      goldenMixUrl: goldenAssetUrl("AUDIENCE_MIX"),
      gaps: qualityEligibility.gaps.map((gap) => ({ standardId: gap.standardId, level: gap.level, owningStage: gap.owningStage, status: gap.status, evidenceRequired: gap.evidenceRequired })),
    },
    stages: stages.map((stage) => {
      const key = text(stage.stage_key);
      return { key, sequence: number(stage.sequence), name: text(stage.stage_name), displayName: stageDisplayNames[key] ?? text(stage.stage_name), plane: text(stage.owner_plane), state: text(stage.lifecycle_state), gateVersion: text(stage.gate_version), requiredArtifacts: json<string[]>(stage.required_artifacts_json, []), evidence: text(stage.evidence_summary), blocker: text(stage.blocker) || undefined, priorWork: priorWork(key) };
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
      `At most ${number(program.maximum_repair_loops)} root-cause repair loops; a third failure requires escalation.`,
      "Only a new immutable master revision may be rescored; failed artifacts and critic evidence remain preserved.",
      "Video N+1 cannot run before video N is owner-ready; publishing authority is a separate gate.",
    ],
    historical: { rejectedMasters: rejectedCount, preservedArtifacts: number(preserved?.total), policy: text(program.historical_master_policy), reason: "The owner rejected the prior masters because technical QA did not represent real content and perceived quality." },
    integrity: { state: ready ? "READY" : "BLOCKED", checks },
  };
}
