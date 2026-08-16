import { SEQUENTIAL_PRODUCTION_CONTRACT, type SequentialProductionProjection } from "@/app/production-control-contract";

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
  { version: "V7", role: "Governance & business production system", controls: ["17 dependency-aware stages", "Artifact and evidence state machine", "Cost, rights, lineage and stop/resume", "Root-stage bounded repair"] },
  { version: "V23.4", role: "Artifact-native production architecture", controls: ["Checkpointed idempotent jobs", "SOURCE / MAKE / HYBRID routing", "Stored bytes and actual pixels", "ENTRY–MIDPOINT–EXIT proof; no generic fallback"] },
  { version: "V281", role: "Perceived-quality release firewall", controls: ["Full-master playback", "Three temporal samples per editorial shot", "Eight independent critics", "Owner-ready gate before the next video"] },
];

const critics: SequentialProductionProjection["critics"] = [
  { name: "Executive producer", job: "Is this a coherent, premium finished program—not merely a valid render?", hardFloor: 90 },
  { name: "Story & retention", job: "Narrative escalation, curiosity loops, rhythm and viewer-state change.", hardFloor: 90 },
  { name: "Visual director", job: "Composition, motion, hierarchy, craft, mobile legibility and visual variety.", hardFloor: 90 },
  { name: "Semantic alignment", job: "Every shot visibly communicates the contracted narration and claim.", hardFloor: 90 },
  { name: "Sound director", job: "One voice, performance, music, ambience, SFX, loudness and mix intent.", hardFloor: 90 },
  { name: "Audience simulator", job: "Comprehension, trust, fatigue, interest and payoff for the target US viewer.", hardFloor: 90 },
  { name: "Competitive editor", job: "Depth, density, polish and differentiation versus the reference bar.", hardFloor: 90 },
  { name: "Factual & brand safety", job: "Claims, qualifiers, rights, provenance and audience-facing cleanliness.", hardFloor: 90 },
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
  const rejected = await db.prepare("SELECT COUNT(*) total FROM production_v2_packages WHERE channel_id=? AND lifecycle_state='REJECTED_QUALITY'").bind(channelId).first<Row>();
  const preserved = await db.prepare("SELECT COUNT(*) total FROM production_v2_artifacts a JOIN production_v2_packages p ON p.id=a.package_id WHERE p.channel_id=?").bind(channelId).first<Row>();
  const activeCount = queue.filter((item) => boolean(item.active)).length;
  const queueCoverage = queue.length === number(program.target_videos);
  const stageCoverage = stages.length === 18;
  const rejectedCount = number(rejected?.total);
  const checks = [
    { label: "Exactly one active video", passed: activeCount === 1, evidence: `${activeCount} active production lease` },
    { label: "Complete production queue", passed: queueCoverage, evidence: `${queue.length}/${number(program.target_videos)} video contracts` },
    { label: "Complete per-video stage contract", passed: stageCoverage, evidence: `${stages.length}/18 stages for video #${number(current.sequence)}` },
    { label: "Historical masters quarantined", passed: rejectedCount === number(program.target_videos), evidence: `${rejectedCount}/${number(program.target_videos)} rejected for perceived quality` },
    { label: "Automatic publishing disabled", passed: !boolean(program.auto_publish), evidence: "Publishing remains a separate owner authority" },
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
      nextAction: activeStage?.stage_key === "00" ? "Compile and freeze the video-specific production authorization, intelligence and evidence contracts." : text(activeStage?.blocker || "Continue the active bounded stage."),
    },
    stages: stages.map((stage) => ({ key: text(stage.stage_key), sequence: number(stage.sequence), name: text(stage.stage_name), plane: text(stage.owner_plane), state: text(stage.lifecycle_state), gateVersion: text(stage.gate_version), requiredArtifacts: json<string[]>(stage.required_artifacts_json, []), evidence: text(stage.evidence_summary), blocker: text(stage.blocker) || undefined })),
    queue: queue.map((item) => ({ id: text(item.id), sequence: number(item.sequence), title: text(item.title), state: text(item.lifecycle_state), active: boolean(item.active), priorMasterState: text(item.prior_master_state), ownerReady: Boolean(item.owner_ready_at) })),
    architecture, critics,
    releaseRules: [
      `Overall score ≥ ${number(program.overall_floor)}; critical score ≥ ${number(program.critical_floor)}; every dimension ≥ ${number(program.dimension_floor)}.`,
      "Zero P0 and zero unresolved material P1; no averaging can compensate for a hard-gate failure.",
      "Full uninterrupted playback plus three temporal samples for every editorial shot.",
      `At most ${number(program.maximum_repair_loops)} root-cause repair loops; the third failure escalates without another retry.`,
      "Only a new immutable master revision may be rescored; failed artifacts and critic evidence remain preserved.",
      "Video N+1 receives no production lease until video N is OWNER_READY; publishing remains separate.",
    ],
    historical: { rejectedMasters: rejectedCount, preservedArtifacts: number(preserved?.total), policy: text(program.historical_master_policy), reason: "Owner rejected the prior masters because technical QA did not represent real content and perceived quality." },
    integrity: { state: ready ? "READY" : "BLOCKED", checks },
  };
}
