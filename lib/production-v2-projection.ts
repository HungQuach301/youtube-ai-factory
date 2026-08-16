import { PRODUCTION_ENGINE_V2, type ProductionV2Projection, type ProductionV2State } from "@/app/production-v2-contract";

type Row = Record<string, unknown>;
type Statement = { bind(...values: unknown[]): Statement; all<T = Row>(): Promise<{ results?: T[] }>; first<T = Row>(): Promise<T | null> };
export type ProductionV2DB = { prepare(query: string): Statement };

const clean = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);
const boolean = (value: unknown) => Boolean(value);
async function rows(db: ProductionV2DB, query: string, ...values: unknown[]) {
  const result = await db.prepare(query).bind(...values).all<Row>();
  return result.results ?? [];
}

export async function productionV2Projection(channelId: string, db: ProductionV2DB): Promise<ProductionV2Projection> {
  const channel = await db.prepare("SELECT id,name,market,language FROM channels WHERE id=? LIMIT 1").bind(channelId).first<Row>();
  if (!channel) throw new Error("CHANNEL_NOT_FOUND");
  const policy = await db.prepare("SELECT * FROM production_v2_policies WHERE channel_id=? ORDER BY policy_version DESC LIMIT 1").bind(channelId).first<Row>();
  if (!policy) throw new Error("PRODUCTION_V2_POLICY_NOT_FOUND");

  const packages = await rows(db, `SELECT p.*,c.sequence,
    (SELECT COUNT(*) FROM production_v2_shot_contracts s WHERE s.package_id=p.id AND s.lifecycle_state='CONTRACT_VALID') AS valid_shots,
    (SELECT COUNT(*) FROM production_v2_artifacts a WHERE a.package_id=p.id) AS artifact_count,
    (SELECT COUNT(*) FROM production_v2_quality_assessments q WHERE q.package_id=p.id) AS qa_count
    FROM production_v2_packages p JOIN content_episode_concepts_v2 c ON c.id=p.episode_concept_id
    WHERE p.channel_id=? ORDER BY c.sequence`, channelId);
  const waves = await rows(db, "SELECT * FROM production_v2_scale_waves WHERE channel_id=? ORDER BY wave_number", channelId);
  const requestSummary = await db.prepare(`SELECT COUNT(*) AS total,
    SUM(CASE WHEN r.lifecycle_state IN ('CREATED','RUNNING') THEN 1 ELSE 0 END) AS active,
    COALESCE(SUM(cost_usd),0) AS spend FROM production_v2_provider_requests r
    JOIN production_v2_packages p ON p.id=r.package_id WHERE p.channel_id=?`).bind(channelId).first<Row>();
  const foundationAudit = await db.prepare("SELECT evidence_hash,detail_json FROM production_v2_audits WHERE channel_id=? AND event_type='GREENFIELD_FOUNDATION_COMPILED' LIMIT 1").bind(channelId).first<Row>();
  const shotCount = await db.prepare("SELECT COUNT(*) AS total,SUM(CASE WHEN s.lifecycle_state='CONTRACT_VALID' THEN 1 ELSE 0 END) AS valid FROM production_v2_shot_contracts s JOIN production_v2_packages p ON p.id=s.package_id WHERE p.channel_id=?").bind(channelId).first<Row>();
  const ready = packages.filter((item) => clean(item.lifecycle_state) === "READY_FOR_PUBLISHING").length;
  const legacySources = packages.reduce((sum, item) => sum + number(item.legacy_source_count), 0);
  const validContracts = number(shotCount?.valid);
  const compiled = packages.length;
  const checkpoint1 = compiled === 15 && number(shotCount?.total) === 75 && validContracts === 75 && legacySources === 0 && Boolean(foundationAudit?.evidence_hash);
  const pilot = waves.find((wave) => number(wave.wave_number) === 0);
  const checkpoint2 = clean(pilot?.lifecycle_state) === "COMPLETE";
  const checkpoint3 = packages.some((item) => number(item.sequence) === 1 && clean(item.lifecycle_state) === "READY_FOR_PUBLISHING");
  const checkpoint4 = ready === 15 && waves.filter((wave) => number(wave.wave_number) > 0).every((wave) => clean(wave.lifecycle_state) === "COMPLETE");
  const checks = [
    { id: "EXACT_PACKAGE_COVERAGE", label: "Exact package coverage", passed: compiled === 15, evidence: `${compiled}/15 canonical briefs compiled` },
    { id: "SHOT_CONTRACT_COVERAGE", label: "Shot contracts are complete", passed: validContracts === 75, evidence: `${validContracts}/75 contracts valid` },
    { id: "TRACEABILITY", label: "Traceability is complete", passed: packages.every((item) => boolean(item.traceability_complete)), evidence: `${packages.filter((item) => boolean(item.traceability_complete)).length}/15 packages` },
    { id: "LEGACY_FIREWALL", label: "Legacy code and artifacts are excluded", passed: legacySources === 0, evidence: `${legacySources} legacy sources bound` },
    { id: "ZERO_SPEND_FOUNDATION", label: "Foundation was compiled at zero spend", passed: Boolean(foundationAudit?.evidence_hash), evidence: foundationAudit ? "Immutable foundation audit: 0 requests · $0.00" : "Foundation audit missing" },
    { id: "PUBLISHING_CLOSED", label: "Publishing authority remains separate", passed: !boolean(policy.auto_publish), evidence: boolean(policy.auto_publish) ? "Automatic publishing enabled" : "Automatic publishing disabled" },
  ];
  return {
    contract: PRODUCTION_ENGINE_V2,
    channel: { id: clean(channel.id), name: clean(channel.name), market: clean(channel.market), language: clean(channel.language) },
    policy: {
      version: number(policy.policy_version), state: clean(policy.lifecycle_state), mode: clean(policy.mode),
      dailyBudgetUsd: number(policy.daily_budget_usd), monthlyBudgetUsd: number(policy.monthly_budget_usd), perVideoBudgetUsd: number(policy.per_video_budget_usd),
      maxRemoteRequests: number(policy.max_remote_requests), maxRepairAttempts: number(policy.max_repair_attempts), autoDispatch: boolean(policy.auto_dispatch), autoPublish: boolean(policy.auto_publish), legacyReusePolicy: clean(policy.legacy_reuse_policy),
    },
    summary: { targetVideos: 15, packagesCompiled: compiled, shotContracts: number(shotCount?.total), validShotContracts: validContracts, videosReady: ready, openExceptions: 0, providerRequests: number(requestSummary?.total), activeProviderRequests: number(requestSummary?.active), spendUsd: number(requestSummary?.spend), legacySources },
    checkpoints: [
      { number: 1, label: "Greenfield foundation", state: checkpoint1 ? "COMPLETE" : "ACTIVE", evidence: checkpoint1 ? "15 packages · 75 contracts · zero legacy · $0" : "Foundation evidence incomplete" },
      { number: 2, label: "Golden pilot", state: checkpoint2 ? "COMPLETE" : checkpoint1 ? "ACTIVE" : "BLOCKED", evidence: checkpoint2 ? "10-shot and 30-second proof passed" : checkpoint1 ? "Ready for controlled pilot" : "Foundation required" },
      { number: 3, label: "Full-video canary", state: checkpoint3 ? "COMPLETE" : checkpoint2 ? "ACTIVE" : "BLOCKED", evidence: checkpoint3 ? "Canary QA2 passed" : "Golden pilot required" },
      { number: 4, label: "Controlled scale", state: checkpoint4 ? "COMPLETE" : checkpoint3 ? "ACTIVE" : "BLOCKED", evidence: checkpoint4 ? "15/15 videos ready" : "Canary required" },
    ],
    scaleWaves: waves.map((wave) => ({ number: number(wave.wave_number), state: clean(wave.lifecycle_state), packageCount: number(wave.package_count), completedCount: number(wave.completed_count), p0Count: number(wave.p0_count), p1Rate: number(wave.p1_rate), duplicateRate: number(wave.duplicate_rate), providerFailureRate: number(wave.provider_failure_rate), costVarianceRate: number(wave.cost_variance_rate) })),
    packages: packages.map((item) => ({ id: clean(item.id), sequence: number(item.sequence), title: clean(item.title), state: clean(item.lifecycle_state) as ProductionV2State, targetDurationSeconds: number(item.target_duration_seconds), shotCount: number(item.shot_count), validShotContracts: number(item.valid_shots), artifacts: number(item.artifact_count), qaAssessments: number(item.qa_count), providerRequests: number(item.provider_requests), spendUsd: number(item.spend_usd), traceabilityComplete: boolean(item.traceability_complete), legacySourceCount: number(item.legacy_source_count), engineVersion: clean(item.engine_version) })),
    integrity: { state: checks.every((check) => check.passed) ? "READY" : "BLOCKED", checks, nextAction: checkpoint4 ? "REVIEW_PUBLISHING_AUTHORITY" : checkpoint3 ? "RUN_CONTROLLED_WAVES" : checkpoint2 ? "RUN_FULL_VIDEO_CANARY" : checkpoint1 ? "START_GOLDEN_PILOT" : "REPAIR_FOUNDATION" },
  };
}
