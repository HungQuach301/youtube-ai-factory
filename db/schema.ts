import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";

export const channels = sqliteTable("channels", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  market: text("market").notNull().default("US"),
  language: text("language").notNull().default("en-US"),
  niche: text("niche").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const videoProjects = sqliteTable("video_projects", {
  id: text("id").primaryKey(),
  channelId: text("channel_id").notNull(),
  title: text("title").notNull(),
  pillar: text("pillar").notNull(),
  status: text("status").notNull().default("OPPORTUNITY_REVIEW"),
  opportunityScore: integer("opportunity_score").notNull().default(0),
  progress: integer("progress").notNull().default(0),
  budgetUsd: real("budget_usd").notNull().default(0),
  spentUsd: real("spent_usd").notNull().default(0),
  nextAction: text("next_action").notNull().default("Review opportunity"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const workflowEvents = sqliteTable("workflow_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: text("project_id").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  eventType: text("event_type").notNull(),
  summary: text("summary").notNull(),
  costUsd: real("cost_usd").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const contentBriefs = sqliteTable("content_briefs", {
  projectId: text("project_id").primaryKey(),
  targetViewer: text("target_viewer").notNull(),
  centralQuestion: text("central_question").notNull(),
  viewerPromise: text("viewer_promise").notNull(),
  uniqueAngle: text("unique_angle").notNull(),
  format: text("format").notNull(),
  riskNote: text("risk_note").notNull(),
  status: text("status").notNull().default("DRAFT"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const researchSources = sqliteTable("research_sources", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  title: text("title").notNull(),
  publisher: text("publisher").notNull(),
  url: text("url").notNull(),
  authority: text("authority").notNull(),
  freshness: text("freshness").notNull(),
  status: text("status").notNull().default("VERIFIED"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const researchClaims = sqliteTable("research_claims", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  claimText: text("claim_text").notNull(),
  riskLevel: text("risk_level").notNull(),
  status: text("status").notNull(),
  sourceCount: integer("source_count").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const scriptVersions = sqliteTable("script_versions", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  version: integer("version").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull().default("DRAFT"),
  criticScore: integer("critic_score"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const criticEvaluations = sqliteTable("critic_evaluations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: text("project_id").notNull(),
  scriptVersionId: text("script_version_id").notNull(),
  criticType: text("critic_type").notNull(),
  score: integer("score").notNull(),
  decision: text("decision").notNull(),
  findings: text("findings").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const voiceProfiles = sqliteTable("voice_profiles", {
  projectId: text("project_id").primaryKey(),
  provider: text("provider").notNull().default("ELEVENLABS"),
  voiceId: text("voice_id").notNull(),
  voiceName: text("voice_name").notNull(),
  modelId: text("model_id").notNull().default("eleven_multilingual_v2"),
  stability: real("stability").notNull().default(0.55),
  similarityBoost: real("similarity_boost").notNull().default(0.78),
  style: real("style").notNull().default(0.2),
  speed: real("speed").notNull().default(0.96),
  status: text("status").notNull().default("CANDIDATE"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const narrationSegments = sqliteTable("narration_segments", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  scriptVersionId: text("script_version_id").notNull(),
  position: integer("position").notNull(),
  label: text("label").notNull(),
  text: text("text").notNull(),
  characterCount: integer("character_count").notNull(),
  status: text("status").notNull().default("READY"),
  durationSeconds: real("duration_seconds"),
  audioKey: text("audio_key"),
  alignment: text("alignment"),
  takeNumber: integer("take_number").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const pronunciationRules = sqliteTable("pronunciation_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: text("project_id").notNull(),
  term: text("term").notNull(),
  pronunciation: text("pronunciation").notNull(),
  ruleType: text("rule_type").notNull().default("ALIAS"),
  status: text("status").notNull().default("ACTIVE"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const voiceEvaluations = sqliteTable("voice_evaluations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: text("project_id").notNull(),
  segmentId: text("segment_id").notNull(),
  takeNumber: integer("take_number").notNull(),
  pronunciationScore: integer("pronunciation_score").notNull(),
  paceScore: integer("pace_score").notNull(),
  consistencyScore: integer("consistency_score").notNull(),
  decision: text("decision").notNull(),
  findings: text("findings").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const sceneManifest = sqliteTable("scene_manifest", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  segmentId: text("segment_id").notNull(),
  sceneNumber: integer("scene_number").notNull(),
  startSeconds: real("start_seconds"),
  endSeconds: real("end_seconds"),
  beat: text("beat").notNull(),
  narrationExcerpt: text("narration_excerpt").notNull(),
  visualIntent: text("visual_intent").notNull(),
  shotType: text("shot_type").notNull(),
  mediaStrategy: text("media_strategy").notNull(),
  searchQuery: text("search_query").notNull(),
  assetSource: text("asset_source").notNull(),
  assetUrl: text("asset_url"),
  licenseStatus: text("license_status").notNull().default("NEEDS_SOURCE"),
  assetStatus: text("asset_status").notNull().default("PLANNED"),
  sceneStatus: text("scene_status").notNull().default("DRAFT"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const productionPackages = sqliteTable("production_packages", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  version: integer("version").notNull(),
  status: text("status").notNull().default("READY"),
  manifestJson: text("manifest_json").notNull(),
  totalDuration: real("total_duration").notNull().default(0),
  exportFormat: text("export_format").notNull().default("FRAMEFLOW_JSON_V1"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const v7PreproductionCompilations = sqliteTable("v7_preproduction_compilations", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  runId: text("run_id").notNull(),
  version: text("version").notNull(),
  upstreamArtifactId: text("upstream_artifact_id").notNull(),
  upstreamHash: text("upstream_hash").notNull(),
  inputHash: text("input_hash").notNull(),
  status: text("status").notNull(),
  lifecycleState: text("lifecycle_state").notNull().default("MATERIALIZED"),
  shotCount: integer("shot_count").notNull(),
  artifactCount: integer("artifact_count").notNull(),
  frozenArtifactCount: integer("frozen_artifact_count").notNull(),
  blockedArtifactCount: integer("blocked_artifact_count").notNull(),
  contentJson: text("content_json").notNull(),
  contentHash: text("content_hash").notNull(),
  remoteRequestsBefore: integer("remote_requests_before").notNull().default(0),
  remoteRequestsAfter: integer("remote_requests_after").notNull().default(0),
  costBefore: real("cost_before").notNull().default(0),
  costAfter: real("cost_after").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const mediaAssets = sqliteTable("media_assets", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  sceneId: text("scene_id").notNull(),
  name: text("name").notNull(),
  mimeType: text("mime_type").notNull(),
  sourceType: text("source_type").notNull(),
  sourceUrl: text("source_url"),
  storageKey: text("storage_key"),
  licenseType: text("license_type").notNull(),
  licenseProof: text("license_proof"),
  rightsStatus: text("rights_status").notNull().default("PENDING"),
  status: text("status").notNull().default("REVIEW"),
  sizeBytes: integer("size_bytes").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const assemblyRuns = sqliteTable("assembly_runs", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  version: integer("version").notNull(),
  status: text("status").notNull().default("READY_FOR_RENDER"),
  manifestJson: text("manifest_json").notNull(),
  assetCoverage: integer("asset_coverage").notNull().default(0),
  licenseCoverage: integer("license_coverage").notNull().default(0),
  criticResults: text("critic_results").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const mediaAutomationSettings = sqliteTable("media_automation_settings", {
  projectId: text("project_id").primaryKey(),
  verificationMode: text("verification_mode").notNull().default("AUTOPILOT"),
  minimumConfidence: integer("minimum_confidence").notNull().default(85),
  autoBuildAssembly: integer("auto_build_assembly", { mode: "boolean" }).notNull().default(true),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const videoRenders = sqliteTable("video_renders", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  version: integer("version").notNull(),
  name: text("name").notNull(),
  storageKey: text("storage_key").notNull(),
  mimeType: text("mime_type").notNull().default("video/webm"),
  sizeBytes: integer("size_bytes").notNull().default(0),
  durationSeconds: real("duration_seconds").notNull().default(0),
  width: integer("width").notNull().default(1280),
  height: integer("height").notNull().default(720),
  fps: integer("fps").notNull().default(30),
  status: text("status").notNull().default("READY"),
  gateResults: text("gate_results").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const referenceVideos = sqliteTable("reference_videos", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  youtubeVideoId: text("youtube_video_id").notNull(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  channelName: text("channel_name").notNull(),
  referenceGroup: text("reference_group").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  publishedAt: text("published_at"),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  viewCount: integer("view_count").notNull().default(0),
  likeCount: integer("like_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  referenceScore: integer("reference_score").notNull().default(0),
  insightJson: text("insight_json").notNull(),
  status: text("status").notNull().default("INCLUDED"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const referenceBenchmarkRuns = sqliteTable("reference_benchmark_runs", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  version: integer("version").notNull(),
  status: text("status").notNull().default("READY"),
  decision: text("decision").notNull(),
  compositeScore: integer("composite_score").notNull().default(0),
  gapMatrixJson: text("gap_matrix_json").notNull(),
  criticResultsJson: text("critic_results_json").notNull(),
  recommendationsJson: text("recommendations_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const referenceSettings = sqliteTable("reference_settings", {
  projectId: text("project_id").primaryKey(),
  verificationMode: text("verification_mode").notNull().default("AUTOPILOT"),
  minimumScore: integer("minimum_score").notNull().default(75),
  market: text("market").notNull().default("US"),
  language: text("language").notNull().default("en"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const qualityGateSettings = sqliteTable("quality_gate_settings", {
  projectId: text("project_id").primaryKey(),
  verificationMode: text("verification_mode").notNull().default("AUTOPILOT"),
  minimumScore: integer("minimum_score").notNull().default(85),
  dimensionFloor: integer("dimension_floor").notNull().default(70),
  criticalFloor: integer("critical_floor").notNull().default(80),
  formatAdapter: text("format_adapter").notNull().default("EXPLAINER_DOCUMENTARY"),
  maximumRepairLoops: integer("maximum_repair_loops").notNull().default(2),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const qualityGateRuns = sqliteTable("quality_gate_runs", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  version: integer("version").notNull(),
  loopNumber: integer("loop_number").notNull().default(0),
  status: text("status").notNull().default("READY"),
  decision: text("decision").notNull(),
  compositeScore: integer("composite_score").notNull().default(0),
  coreScore: integer("core_score").notNull().default(0),
  adapterScore: integer("adapter_score").notNull().default(0),
  formatAdapter: text("format_adapter").notNull(),
  rubricJson: text("rubric_json").notNull(),
  hardGatesJson: text("hard_gates_json").notNull(),
  criticResultsJson: text("critic_results_json").notNull(),
  repairPlanJson: text("repair_plan_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const optimizationSettings = sqliteTable("optimization_settings", {
  projectId: text("project_id").primaryKey(),
  mode: text("mode").notNull().default("AUTOPILOT"),
  maximumAttempts: integer("maximum_attempts").notNull().default(3),
  minimumImprovement: integer("minimum_improvement").notNull().default(3),
  maximumWaveStages: integer("maximum_wave_stages").notNull().default(4),
  regressionTolerance: integer("regression_tolerance").notNull().default(5),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const optimizationCycles = sqliteTable("optimization_cycles", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  version: integer("version").notNull(),
  status: text("status").notNull().default("ACTIVE"),
  activeStage: text("active_stage").notNull(),
  stageStateJson: text("stage_state_json").notNull(),
  issueLedgerJson: text("issue_ledger_json").notNull(),
  learningJson: text("learning_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const optimizationStageRuns = sqliteTable("optimization_stage_runs", {
  id: text("id").primaryKey(),
  cycleId: text("cycle_id").notNull(),
  projectId: text("project_id").notNull(),
  stageKey: text("stage_key").notNull(),
  attempt: integer("attempt").notNull().default(1),
  status: text("status").notNull(),
  threshold: integer("threshold").notNull(),
  score: integer("score").notNull().default(0),
  contractJson: text("contract_json").notNull(),
  candidatesJson: text("candidates_json").notNull(),
  decisionJson: text("decision_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const optimizationArtifacts = sqliteTable("optimization_artifacts", {
  id: text("id").primaryKey(),
  cycleId: text("cycle_id").notNull(),
  projectId: text("project_id").notNull(),
  stageKey: text("stage_key").notNull(),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("ARTIFACT_READY"),
  artifactType: text("artifact_type").notNull(),
  title: text("title").notNull(),
  contentJson: text("content_json").notNull(),
  sourceRunId: text("source_run_id").notNull(),
  wordCount: integer("word_count").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const optimizationArtifactQa = sqliteTable("optimization_artifact_qa", {
  id: text("id").primaryKey(),
  artifactId: text("artifact_id").notNull(),
  cycleId: text("cycle_id").notNull(),
  projectId: text("project_id").notNull(),
  stageKey: text("stage_key").notNull(),
  attempt: integer("attempt").notNull().default(1),
  status: text("status").notNull(),
  decision: text("decision").notNull(),
  score: integer("score").notNull().default(0),
  threshold: integer("threshold").notNull(),
  rubricJson: text("rubric_json").notNull(),
  issuesJson: text("issues_json").notNull(),
  regressionJson: text("regression_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const productionProfiles = sqliteTable("production_profiles", {
  projectId: text("project_id").primaryKey(),
  version: integer("version").notNull().default(5),
  profileKey: text("profile_key").notNull(),
  formatAdapter: text("format_adapter").notNull(),
  runtimeTargetSeconds: integer("runtime_target_seconds").notNull(),
  targetsJson: text("targets_json").notNull(),
  truthPolicy: text("truth_policy").notNull(),
  legacyRenderDisabled: integer("legacy_render_disabled", { mode: "boolean" }).notNull().default(true),
  status: text("status").notNull().default("ACTIVE"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const evidenceRecords = sqliteTable("evidence_records", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  entityType: text("entity_type").notNull(),
  pipelineVersion: integer("pipeline_version").notNull().default(5),
  lifecycleState: text("lifecycle_state").notNull().default("PLAN"),
  title: text("title").notNull(),
  provider: text("provider"),
  sourceUrl: text("source_url"),
  retrievedAt: text("retrieved_at"),
  contentHash: text("content_hash"),
  storageKey: text("storage_key"),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes").notNull().default(0),
  licenseStatus: text("license_status").notNull().default("UNKNOWN"),
  commercialUseStatus: text("commercial_use_status").notNull().default("UNKNOWN"),
  costUsd: real("cost_usd").notNull().default(0),
  modelId: text("model_id"),
  modelVersion: text("model_version"),
  prompt: text("prompt"),
  seed: text("seed"),
  settingsJson: text("settings_json").notNull().default("{}"),
  semanticScore: integer("semantic_score"),
  claimIdsJson: text("claim_ids_json").notNull().default("[]"),
  shotIdsJson: text("shot_ids_json").notNull().default("[]"),
  transformationHistoryJson: text("transformation_history_json").notNull().default("[]"),
  humanOverrideJson: text("human_override_json").notNull().default("{}"),
  expiresAt: text("expires_at"),
  revalidationStatus: text("revalidation_status").notNull().default("CURRENT"),
  supersedesId: text("supersedes_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const evidenceBindings = sqliteTable("evidence_bindings", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  fromRecordId: text("from_record_id").notNull(),
  toRecordId: text("to_record_id").notNull(),
  relationship: text("relationship").notNull(),
  status: text("status").notNull().default("ACTIVE"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const evidenceAuditRuns = sqliteTable("evidence_audit_runs", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  pipelineVersion: integer("pipeline_version").notNull().default(5),
  status: text("status").notNull(),
  integrityScore: integer("integrity_score").notNull().default(0),
  planReady: integer("plan_ready", { mode: "boolean" }).notNull().default(false),
  materialReady: integer("material_ready", { mode: "boolean" }).notNull().default(false),
  masterReady: integer("master_ready", { mode: "boolean" }).notNull().default(false),
  countsJson: text("counts_json").notNull(),
  blockersJson: text("blockers_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const pipelineMigrations = sqliteTable("pipeline_migrations", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  fromVersion: integer("from_version").notNull(),
  toVersion: integer("to_version").notNull(),
  status: text("status").notNull(),
  policyJson: text("policy_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Production Pipeline V7 — Wave 1 control plane. Legacy V5/V6 tables remain
// readable for historical QA, but these records are the only authoritative
// state for new V7 work.
export const v7ProgramContracts = sqliteTable("v7_program_contracts", {
  id: text("id").primaryKey(),
  channelId: text("channel_id").notNull(),
  version: integer("version").notNull().default(7),
  status: text("status").notNull().default("FOUNDATION_BUILD"),
  executionMode: text("execution_mode").notNull().default("AUTOPILOT"),
  qualityPolicy: text("quality_policy").notNull().default("MAXIMUM_QUALITY_FIRST"),
  legacyPolicy: text("legacy_policy").notNull().default("HISTORICAL_QUARANTINE"),
  overallFloor: integer("overall_floor").notNull().default(92),
  criticalFloor: integer("critical_floor").notNull().default(90),
  dimensionFloor: integer("dimension_floor").notNull().default(86),
  p0Tolerance: integer("p0_tolerance").notNull().default(0),
  p1Tolerance: integer("p1_tolerance").notNull().default(0),
  maximumAttempts: integer("maximum_attempts").notNull().default(3),
  minimumImprovement: integer("minimum_improvement").notNull().default(3),
  productionAuthorized: integer("production_authorized", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const v7StageStates = sqliteTable("v7_stage_states", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  stageKey: text("stage_key").notNull(),
  sequence: integer("sequence").notNull(),
  stageName: text("stage_name").notNull(),
  status: text("status").notNull().default("BLOCKED"),
  threshold: integer("threshold").notNull().default(92),
  attempt: integer("attempt").notNull().default(0),
  artifactId: text("artifact_id"),
  blocker: text("blocker"),
  evidenceSummary: text("evidence_summary").notNull().default("No verified artifact"),
  frozenAt: text("frozen_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const v7EvidenceLineage = sqliteTable("v7_evidence_lineage", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  projectId: text("project_id"),
  entityType: text("entity_type").notNull(),
  title: text("title").notNull(),
  lifecycleState: text("lifecycle_state").notNull().default("PLAN"),
  upstreamEvidenceId: text("upstream_evidence_id"),
  artifactKey: text("artifact_key"),
  contentHash: text("content_hash"),
  storageState: text("storage_state").notNull().default("NOT_STORED"),
  rightsState: text("rights_state").notNull().default("NOT_APPLICABLE"),
  costState: text("cost_state").notNull().default("NOT_APPLICABLE"),
  quarantineState: text("quarantine_state").notNull().default("CLEAR"),
  pipelineVersion: integer("pipeline_version").notNull().default(7),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const v7AssetRegistry = sqliteTable("v7_asset_registry", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  projectId: text("project_id"),
  name: text("name").notNull(),
  assetClass: text("asset_class").notNull(),
  lifecycleState: text("lifecycle_state").notNull().default("PLAN"),
  provider: text("provider"),
  mimeType: text("mime_type"),
  contentHash: text("content_hash"),
  runtimeKey: text("runtime_key"),
  driveFileId: text("drive_file_id"),
  localRelativePath: text("local_relative_path"),
  syncState: text("sync_state").notNull().default("NOT_STORED"),
  rightsState: text("rights_state").notNull().default("UNKNOWN"),
  reusableEligible: integer("reusable_eligible", { mode: "boolean" }).notNull().default(false),
  quarantined: integer("quarantined", { mode: "boolean" }).notNull().default(false),
  costUsd: real("cost_usd").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const v7CostEvents = sqliteTable("v7_cost_events", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  projectId: text("project_id"),
  stageKey: text("stage_key").notNull(),
  provider: text("provider").notNull(),
  costClass: text("cost_class").notNull(),
  costType: text("cost_type").notNull(),
  status: text("status").notNull().default("ESTIMATED"),
  estimatedUsd: real("estimated_usd").notNull().default(0),
  actualUsd: real("actual_usd").notNull().default(0),
  reusableAllocationUsd: real("reusable_allocation_usd").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  assetId: text("asset_id"),
  note: text("note").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const v7AiUsageEvents = sqliteTable("v7_ai_usage_events", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  runId: text("run_id").notNull(),
  stageKey: text("stage_key").notNull(),
  provider: text("provider").notNull().default("OPENAI"),
  modelId: text("model_id").notNull(),
  providerResponseId: text("provider_response_id").notNull().unique(),
  providerStatus: text("provider_status").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  cachedInputTokens: integer("cached_input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  reasoningTokens: integer("reasoning_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  webSearchCalls: integer("web_search_calls").notNull().default(0),
  inputRatePerMillion: real("input_rate_per_million").notNull().default(0),
  cachedInputRatePerMillion: real("cached_input_rate_per_million").notNull().default(0),
  outputRatePerMillion: real("output_rate_per_million").notNull().default(0),
  webSearchRatePerThousand: real("web_search_rate_per_thousand").notNull().default(0),
  tokenCostUsd: real("token_cost_usd").notNull().default(0),
  toolCostUsd: real("tool_cost_usd").notNull().default(0),
  actualUsd: real("actual_usd").notNull().default(0),
  pricingStatus: text("pricing_status").notNull().default("MEASURED"),
  pricingSource: text("pricing_source").notNull(),
  usageJson: text("usage_json").notNull(),
  measuredAt: text("measured_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const v7StorageContracts = sqliteTable("v7_storage_contracts", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  tier: text("tier").notNull(),
  bindingName: text("binding_name").notNull(),
  role: text("role").notNull(),
  requiredForProduction: integer("required_for_production", { mode: "boolean" }).notNull().default(true),
  implementationState: text("implementation_state").notNull().default("CONTRACT_READY"),
  verificationState: text("verification_state").notNull().default("NOT_VERIFIED"),
  lastVerifiedAt: text("last_verified_at"),
  evidence: text("evidence").notNull().default("Awaiting verification"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const v7DecisionRecords = sqliteTable("v7_decision_records", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  decisionCode: text("decision_code").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull(),
  effectiveVersion: integer("effective_version").notNull().default(7),
  rationale: text("rationale").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Intelligence/Niche owner-expert decision aggregate. These rows are append-only:
// recommendation, expert decision, channel niche commitment and Channel Strategy
// activation remain separate facts and commands.
export const nicheExpertDecisions = sqliteTable("niche_expert_decisions", {
  id: text("id").primaryKey(),
  portfolioId: text("portfolio_id").notNull(),
  channelId: text("channel_id").notNull(),
  programId: text("program_id").notNull(),
  aggregateVersion: integer("aggregate_version").notNull(),
  decisionVersion: integer("decision_version").notNull(),
  action: text("action").notNull(),
  candidateId: text("candidate_id").notNull(),
  candidateVersion: integer("candidate_version").notNull(),
  evidenceVersion: integer("evidence_version").notNull(),
  actorEmail: text("actor_email").notNull(),
  actorDisplayName: text("actor_display_name").notNull(),
  actorRole: text("actor_role").notNull().default("OWNER_EXPERT"),
  rationale: text("rationale").notNull(),
  reusableAssetType: text("reusable_asset_type").notNull(),
  reusableAssetSummary: text("reusable_asset_summary").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  correlationId: text("correlation_id").notNull(),
  causationId: text("causation_id"),
  supersedesDecisionId: text("supersedes_decision_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("niche_expert_decisions_program_version_uq").on(table.programId, table.decisionVersion),
  uniqueIndex("niche_expert_decisions_idempotency_uq").on(table.idempotencyKey),
  index("niche_expert_decisions_channel_created_idx").on(table.channelId, table.createdAt),
]);

export const nicheExpertDecisionAudits = sqliteTable("niche_expert_decision_audits", {
  id: text("id").primaryKey(),
  decisionId: text("decision_id").notNull().references(() => nicheExpertDecisions.id),
  programId: text("program_id").notNull(),
  channelId: text("channel_id").notNull(),
  eventType: text("event_type").notNull().default("NICHE_EXPERT_DECISION_RECORDED"),
  actorEmail: text("actor_email").notNull(),
  actorRole: text("actor_role").notNull().default("OWNER_EXPERT"),
  idempotencyKey: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  correlationId: text("correlation_id").notNull(),
  causationId: text("causation_id"),
  evidenceLineageId: text("evidence_lineage_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("niche_expert_decision_audits_decision_uq").on(table.decisionId),
  index("niche_expert_decision_audits_program_created_idx").on(table.programId, table.createdAt),
]);

// Expert-seeded niche hypotheses are immutable inputs to the V2 evidence
// workflow. They are intentionally separate from system rank, expert priority,
// niche selection, commitment and Channel Strategy activation.
export const nicheHypotheses = sqliteTable("niche_hypotheses", {
  id: text("id").primaryKey(),
  portfolioId: text("portfolio_id").notNull(),
  channelId: text("channel_id").notNull(),
  programId: text("program_id").notNull(),
  aggregateVersion: integer("aggregate_version").notNull(),
  hypothesisVersion: integer("hypothesis_version").notNull(),
  origin: text("origin").notNull().default("EXPERT_SEEDED"),
  lifecycleState: text("lifecycle_state").notNull().default("EVIDENCE_GATHERING"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  rationale: text("rationale").notNull(),
  audienceAssumptionsJson: text("audience_assumptions_json").notNull(),
  demandAssumptionsJson: text("demand_assumptions_json").notNull(),
  knownCompetitorsJson: text("known_competitors_json").notNull(),
  winningThesis: text("winning_thesis").notNull(),
  actorEmail: text("actor_email").notNull(),
  actorDisplayName: text("actor_display_name").notNull(),
  actorRole: text("actor_role").notNull().default("OWNER_EXPERT"),
  idempotencyKey: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  correlationId: text("correlation_id").notNull(),
  causationId: text("causation_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("niche_hypotheses_program_version_uq").on(table.programId, table.hypothesisVersion),
  uniqueIndex("niche_hypotheses_idempotency_uq").on(table.idempotencyKey),
  index("niche_hypotheses_channel_created_idx").on(table.channelId, table.createdAt),
]);

export const nicheHypothesisAudits = sqliteTable("niche_hypothesis_audits", {
  id: text("id").primaryKey(),
  hypothesisId: text("hypothesis_id").notNull().references(() => nicheHypotheses.id),
  programId: text("program_id").notNull(),
  channelId: text("channel_id").notNull(),
  eventType: text("event_type").notNull().default("NICHE_HYPOTHESIS_SUBMITTED"),
  actorEmail: text("actor_email").notNull(),
  actorRole: text("actor_role").notNull().default("OWNER_EXPERT"),
  idempotencyKey: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  correlationId: text("correlation_id").notNull(),
  causationId: text("causation_id"),
  evidenceLineageId: text("evidence_lineage_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("niche_hypothesis_audits_hypothesis_uq").on(table.hypothesisId),
  index("niche_hypothesis_audits_program_created_idx").on(table.programId, table.createdAt),
]);

// Intelligence-to-Niche is an explicit, append-only bridge. Frozen Stage 01
// research remains immutable; this capability records typed NICHE_OPPORTUNITY
// aggregates with source lineage instead of reclassifying video-topic rows.
export const nicheIntelligenceBridgeRuns = sqliteTable("niche_intelligence_bridge_runs", {
  id: text("id").primaryKey(),
  portfolioId: text("portfolio_id").notNull(),
  channelId: text("channel_id").notNull(),
  programId: text("program_id").notNull(),
  bridgeVersion: integer("bridge_version").notNull(),
  sourceArtifactId: text("source_artifact_id").notNull(),
  sourceArtifactHash: text("source_artifact_hash").notNull(),
  opportunityCount: integer("opportunity_count").notNull(),
  lifecycleState: text("lifecycle_state").notNull().default("FROZEN"),
  actorEmail: text("actor_email").notNull(),
  actorRole: text("actor_role").notNull().default("PORTFOLIO_GOVERNANCE"),
  idempotencyKey: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("niche_intelligence_bridge_program_version_uq").on(table.programId, table.bridgeVersion),
  uniqueIndex("niche_intelligence_bridge_idempotency_uq").on(table.idempotencyKey),
  index("niche_intelligence_bridge_channel_created_idx").on(table.channelId, table.createdAt),
]);

export const nicheIntelligenceOpportunities = sqliteTable("niche_intelligence_opportunities", {
  id: text("id").primaryKey(),
  bridgeRunId: text("bridge_run_id").notNull().references(() => nicheIntelligenceBridgeRuns.id),
  portfolioId: text("portfolio_id").notNull(),
  channelId: text("channel_id").notNull(),
  programId: text("program_id").notNull(),
  origin: text("origin").notNull().default("SYSTEM_DISCOVERED"),
  lifecycleState: text("lifecycle_state").notNull().default("EVIDENCE_GATHERING"),
  title: text("title").notNull(),
  contentJson: text("content_json").notNull(),
  contentHash: text("content_hash").notNull(),
  sourceArtifactId: text("source_artifact_id").notNull(),
  sourceRefsJson: text("source_refs_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("niche_intelligence_opportunities_program_created_idx").on(table.programId, table.createdAt),
  index("niche_intelligence_opportunities_bridge_idx").on(table.bridgeRunId),
]);

// Slice 4 owns an append-only evidence workflow shared by system-discovered
// opportunities and expert-seeded hypotheses. Planning, validation approval and
// expert review are evidence facts only: none of them may mutate comparison,
// priority, selection, commitment or Channel Strategy activation.
export const nicheEvidenceWorkflowEvents = sqliteTable("niche_evidence_workflow_events", {
  id: text("id").primaryKey(),
  portfolioId: text("portfolio_id").notNull(),
  channelId: text("channel_id").notNull(),
  programId: text("program_id").notNull(),
  opportunityId: text("opportunity_id").notNull(),
  opportunityOrigin: text("opportunity_origin").notNull(),
  aggregateVersion: integer("aggregate_version").notNull(),
  evidenceVersion: integer("evidence_version").notNull(),
  action: text("action").notNull(),
  planVersion: integer("plan_version").notNull(),
  supportingQuestionsJson: text("supporting_questions_json"),
  contradictingQuestionsJson: text("contradicting_questions_json"),
  unknownQuestionsJson: text("unknown_questions_json"),
  sourceClassesJson: text("source_classes_json"),
  providerAllowlistJson: text("provider_allowlist_json"),
  maxSources: integer("max_sources"),
  maxProviderRequests: integer("max_provider_requests"),
  maxSpendCents: integer("max_spend_cents"),
  validationStatus: text("validation_status"),
  validationRequestId: text("validation_request_id"),
  claimDirection: text("claim_direction"),
  claimStatement: text("claim_statement"),
  sourceRef: text("source_ref"),
  sourceAuthority: text("source_authority"),
  observedAt: text("observed_at"),
  freshness: text("freshness"),
  confidence: integer("confidence"),
  affectedAxis: text("affected_axis"),
  reviewDisposition: text("review_disposition"),
  decisionImpact: text("decision_impact"),
  actorEmail: text("actor_email").notNull(),
  actorDisplayName: text("actor_display_name").notNull(),
  actorRole: text("actor_role").notNull().default("OWNER_EXPERT"),
  idempotencyKey: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  correlationId: text("correlation_id").notNull(),
  causationId: text("causation_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("niche_evidence_events_opportunity_version_uq").on(table.opportunityId, table.evidenceVersion),
  uniqueIndex("niche_evidence_events_idempotency_uq").on(table.idempotencyKey),
  index("niche_evidence_events_program_created_idx").on(table.programId, table.createdAt),
]);

export const nicheEvidenceWorkflowAudits = sqliteTable("niche_evidence_workflow_audits", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => nicheEvidenceWorkflowEvents.id),
  programId: text("program_id").notNull(),
  channelId: text("channel_id").notNull(),
  opportunityId: text("opportunity_id").notNull(),
  eventType: text("event_type").notNull(),
  actorEmail: text("actor_email").notNull(),
  actorRole: text("actor_role").notNull().default("OWNER_EXPERT"),
  idempotencyKey: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  correlationId: text("correlation_id").notNull(),
  causationId: text("causation_id"),
  evidenceLineageId: text("evidence_lineage_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("niche_evidence_audits_event_uq").on(table.eventId),
  index("niche_evidence_audits_opportunity_created_idx").on(table.opportunityId, table.createdAt),
]);

// Slice 5 consumes frozen Slice 4 reviews and records a new, append-only
// sufficiency/scoring fact. The three axes stay separate; no aggregate score is
// stored. Comparison eligibility is an explicit result, while expert priority,
// niche commitment and Channel Strategy remain outside this capability.
export const nicheScoringAssessments = sqliteTable("niche_scoring_assessments", {
  id: text("id").primaryKey(),
  portfolioId: text("portfolio_id").notNull(),
  channelId: text("channel_id").notNull(),
  programId: text("program_id").notNull(),
  opportunityId: text("opportunity_id").notNull(),
  opportunityOrigin: text("opportunity_origin").notNull(),
  aggregateVersion: integer("aggregate_version").notNull(),
  evidenceVersion: integer("evidence_version").notNull(),
  scoringVersion: integer("scoring_version").notNull(),
  action: text("action").notNull().default("RECORD_NICHE_SCORING_ASSESSMENT"),
  sufficiencyState: text("sufficiency_state").notNull(),
  sufficiencyGapsJson: text("sufficiency_gaps_json").notNull(),
  marketAttractivenessScore: integer("market_attractiveness_score").notNull(),
  marketAttractivenessBasis: text("market_attractiveness_basis").notNull(),
  marketAttractivenessEvidenceJson: text("market_attractiveness_evidence_json").notNull(),
  abilityToWinScore: integer("ability_to_win_score").notNull(),
  abilityToWinBasis: text("ability_to_win_basis").notNull(),
  abilityToWinEvidenceJson: text("ability_to_win_evidence_json").notNull(),
  evidenceConfidenceScore: integer("evidence_confidence_score").notNull(),
  evidenceConfidenceBasis: text("evidence_confidence_basis").notNull(),
  evidenceConfidenceEvidenceJson: text("evidence_confidence_evidence_json").notNull(),
  prerequisitesJson: text("prerequisites_json").notNull(),
  winningCriteriaJson: text("winning_criteria_json").notNull(),
  comparisonEligibility: text("comparison_eligibility").notNull(),
  actorEmail: text("actor_email").notNull(),
  actorDisplayName: text("actor_display_name").notNull(),
  actorRole: text("actor_role").notNull().default("OWNER_EXPERT"),
  idempotencyKey: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  correlationId: text("correlation_id").notNull(),
  causationId: text("causation_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("niche_scoring_opportunity_version_uq").on(table.opportunityId, table.scoringVersion),
  uniqueIndex("niche_scoring_idempotency_uq").on(table.idempotencyKey),
  index("niche_scoring_program_created_idx").on(table.programId, table.createdAt),
]);

export const nicheScoringAssessmentAudits = sqliteTable("niche_scoring_assessment_audits", {
  id: text("id").primaryKey(),
  assessmentId: text("assessment_id").notNull().references(() => nicheScoringAssessments.id),
  programId: text("program_id").notNull(),
  channelId: text("channel_id").notNull(),
  opportunityId: text("opportunity_id").notNull(),
  eventType: text("event_type").notNull().default("NICHE_SCORING_ASSESSMENT_RECORDED"),
  actorEmail: text("actor_email").notNull(),
  actorRole: text("actor_role").notNull().default("OWNER_EXPERT"),
  idempotencyKey: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  correlationId: text("correlation_id").notNull(),
  causationId: text("causation_id"),
  evidenceLineageId: text("evidence_lineage_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("niche_scoring_audits_assessment_uq").on(table.assessmentId),
  index("niche_scoring_audits_opportunity_created_idx").on(table.opportunityId, table.createdAt),
]);

// Slice 6 records one atomic, append-only ordering of the complete comparable
// portfolio. The set binds the latest Slice 5 assessment versions but never
// rewrites their rank, axes, sufficiency, eligibility or Conditions to Win.
export const nicheExpertPrioritySets = sqliteTable("niche_expert_priority_sets", {
  id: text("id").primaryKey(),
  portfolioId: text("portfolio_id").notNull(),
  priorityVersion: integer("priority_version").notNull(),
  action: text("action").notNull().default("SET_NICHE_PRIORITY"),
  comparableSetHash: text("comparable_set_hash").notNull(),
  itemCount: integer("item_count").notNull(),
  portfolioRationale: text("portfolio_rationale").notNull(),
  actorEmail: text("actor_email").notNull(),
  actorDisplayName: text("actor_display_name").notNull(),
  actorRole: text("actor_role").notNull().default("OWNER_EXPERT"),
  idempotencyKey: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  correlationId: text("correlation_id").notNull(),
  causationId: text("causation_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("niche_priority_sets_portfolio_version_uq").on(table.portfolioId, table.priorityVersion),
  uniqueIndex("niche_priority_sets_idempotency_uq").on(table.idempotencyKey),
  index("niche_priority_sets_created_idx").on(table.portfolioId, table.createdAt),
]);

export const nicheExpertPriorityItems = sqliteTable("niche_expert_priority_items", {
  id: text("id").primaryKey(),
  prioritySetId: text("priority_set_id").notNull().references(() => nicheExpertPrioritySets.id),
  portfolioId: text("portfolio_id").notNull(),
  priorityVersion: integer("priority_version").notNull(),
  channelId: text("channel_id").notNull(),
  programId: text("program_id").notNull(),
  opportunityId: text("opportunity_id").notNull(),
  opportunityOrigin: text("opportunity_origin").notNull(),
  aggregateVersion: integer("aggregate_version").notNull(),
  evidenceVersion: integer("evidence_version").notNull(),
  scoringVersion: integer("scoring_version").notNull(),
  expertPriority: integer("expert_priority").notNull(),
  rationale: text("rationale").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("niche_priority_items_set_opportunity_uq").on(table.prioritySetId, table.opportunityId),
  uniqueIndex("niche_priority_items_set_priority_uq").on(table.prioritySetId, table.expertPriority),
  index("niche_priority_items_opportunity_created_idx").on(table.opportunityId, table.createdAt),
]);

export const nicheExpertPriorityAudits = sqliteTable("niche_expert_priority_audits", {
  id: text("id").primaryKey(),
  prioritySetId: text("priority_set_id").notNull().references(() => nicheExpertPrioritySets.id),
  portfolioId: text("portfolio_id").notNull(),
  eventType: text("event_type").notNull().default("NICHE_EXPERT_PRIORITY_SET_RECORDED"),
  actorEmail: text("actor_email").notNull(),
  actorRole: text("actor_role").notNull().default("OWNER_EXPERT"),
  idempotencyKey: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  correlationId: text("correlation_id").notNull(),
  causationId: text("causation_id"),
  evidenceLineageId: text("evidence_lineage_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("niche_priority_audits_set_uq").on(table.prioritySetId),
  index("niche_priority_audits_created_idx").on(table.portfolioId, table.createdAt),
]);

// Slice 7 keeps selection and commitment as separate append-only facts. Both
// bind the active Slice 6 priority set; neither mutates channels.niche or
// activates Channel Strategy.
export const nichePortfolioSelections = sqliteTable("niche_portfolio_selections", {
  id: text("id").primaryKey(),
  portfolioId: text("portfolio_id").notNull(),
  selectionVersion: integer("selection_version").notNull(),
  action: text("action").notNull().default("SELECT_NICHE_FOR_COMMITMENT"),
  lifecycleState: text("lifecycle_state").notNull().default("SELECTED_PENDING_COMMITMENT"),
  prioritySetId: text("priority_set_id").notNull().references(() => nicheExpertPrioritySets.id),
  priorityVersion: integer("priority_version").notNull(),
  comparableSetHash: text("comparable_set_hash").notNull(),
  channelId: text("channel_id").notNull(),
  programId: text("program_id").notNull(),
  opportunityId: text("opportunity_id").notNull(),
  opportunityOrigin: text("opportunity_origin").notNull(),
  aggregateVersion: integer("aggregate_version").notNull(),
  evidenceVersion: integer("evidence_version").notNull(),
  scoringVersion: integer("scoring_version").notNull(),
  systemRankAtSelection: integer("system_rank_at_selection").notNull(),
  expertPriorityAtSelection: integer("expert_priority_at_selection").notNull(),
  rationale: text("rationale").notNull(),
  tradeoffsJson: text("tradeoffs_json").notNull(),
  commitmentConditionsJson: text("commitment_conditions_json").notNull(),
  actorEmail: text("actor_email").notNull(),
  actorDisplayName: text("actor_display_name").notNull(),
  actorRole: text("actor_role").notNull().default("OWNER_EXPERT"),
  idempotencyKey: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  correlationId: text("correlation_id").notNull(),
  causationId: text("causation_id"),
  supersedesSelectionId: text("supersedes_selection_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("niche_selections_portfolio_version_uq").on(table.portfolioId, table.selectionVersion),
  uniqueIndex("niche_selections_idempotency_uq").on(table.idempotencyKey),
  index("niche_selections_opportunity_created_idx").on(table.opportunityId, table.createdAt),
]);

export const nichePortfolioSelectionAudits = sqliteTable("niche_portfolio_selection_audits", {
  id: text("id").primaryKey(),
  selectionId: text("selection_id").notNull().references(() => nichePortfolioSelections.id),
  portfolioId: text("portfolio_id").notNull(),
  eventType: text("event_type").notNull().default("NICHE_SELECTED_PENDING_COMMITMENT"),
  actorEmail: text("actor_email").notNull(),
  actorRole: text("actor_role").notNull().default("OWNER_EXPERT"),
  idempotencyKey: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  correlationId: text("correlation_id").notNull(),
  causationId: text("causation_id"),
  evidenceLineageId: text("evidence_lineage_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("niche_selection_audits_selection_uq").on(table.selectionId),
  index("niche_selection_audits_created_idx").on(table.portfolioId, table.createdAt),
]);

export const nichePortfolioCommitments = sqliteTable("niche_portfolio_commitments", {
  id: text("id").primaryKey(),
  portfolioId: text("portfolio_id").notNull(),
  commitmentVersion: integer("commitment_version").notNull(),
  action: text("action").notNull().default("COMMIT_NICHE"),
  lifecycleState: text("lifecycle_state").notNull().default("COMMITTED"),
  selectionId: text("selection_id").notNull().references(() => nichePortfolioSelections.id),
  selectionVersion: integer("selection_version").notNull(),
  prioritySetId: text("priority_set_id").notNull().references(() => nicheExpertPrioritySets.id),
  priorityVersion: integer("priority_version").notNull(),
  comparableSetHash: text("comparable_set_hash").notNull(),
  channelId: text("channel_id").notNull(),
  programId: text("program_id").notNull(),
  opportunityId: text("opportunity_id").notNull(),
  opportunityOrigin: text("opportunity_origin").notNull(),
  aggregateVersion: integer("aggregate_version").notNull(),
  evidenceVersion: integer("evidence_version").notNull(),
  scoringVersion: integer("scoring_version").notNull(),
  systemRankAtCommitment: integer("system_rank_at_commitment").notNull(),
  expertPriorityAtCommitment: integer("expert_priority_at_commitment").notNull(),
  rationale: text("rationale").notNull(),
  governanceOwner: text("governance_owner").notNull(),
  riskAcceptance: text("risk_acceptance").notNull(),
  reviewCadenceDays: integer("review_cadence_days").notNull(),
  revisitTriggersJson: text("revisit_triggers_json").notNull(),
  evidenceReviewed: integer("evidence_reviewed", { mode: "boolean" }).notNull().default(false),
  priorityReviewed: integer("priority_reviewed", { mode: "boolean" }).notNull().default(false),
  noActivationAcknowledged: integer("no_activation_acknowledged", { mode: "boolean" }).notNull().default(false),
  actorEmail: text("actor_email").notNull(),
  actorDisplayName: text("actor_display_name").notNull(),
  actorRole: text("actor_role").notNull().default("PORTFOLIO_GOVERNANCE"),
  idempotencyKey: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  correlationId: text("correlation_id").notNull(),
  causationId: text("causation_id"),
  supersedesCommitmentId: text("supersedes_commitment_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("niche_commitments_portfolio_version_uq").on(table.portfolioId, table.commitmentVersion),
  uniqueIndex("niche_commitments_idempotency_uq").on(table.idempotencyKey),
  index("niche_commitments_opportunity_created_idx").on(table.opportunityId, table.createdAt),
]);

export const nichePortfolioCommitmentAudits = sqliteTable("niche_portfolio_commitment_audits", {
  id: text("id").primaryKey(),
  commitmentId: text("commitment_id").notNull().references(() => nichePortfolioCommitments.id),
  portfolioId: text("portfolio_id").notNull(),
  eventType: text("event_type").notNull().default("NICHE_COMMITTED"),
  actorEmail: text("actor_email").notNull(),
  actorRole: text("actor_role").notNull().default("PORTFOLIO_GOVERNANCE"),
  idempotencyKey: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  correlationId: text("correlation_id").notNull(),
  causationId: text("causation_id"),
  evidenceLineageId: text("evidence_lineage_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("niche_commitment_audits_commitment_uq").on(table.commitmentId),
  index("niche_commitment_audits_created_idx").on(table.portfolioId, table.createdAt),
]);

// Slice 8 activates a canonical Channel Strategy binding from one current
// Slice 7 commitment. The legacy channels.niche field remains compatibility
// evidence and is never overwritten by this append-only activation ledger.
export const channelStrategyActivations = sqliteTable("channel_strategy_activations", {
  id: text("id").primaryKey(),
  portfolioId: text("portfolio_id").notNull(),
  activationVersion: integer("activation_version").notNull(),
  channelStrategyVersion: integer("channel_strategy_version").notNull(),
  action: text("action").notNull().default("ACTIVATE_CHANNEL_STRATEGY"),
  lifecycleState: text("lifecycle_state").notNull().default("ACTIVATED"),
  commitmentId: text("commitment_id").notNull().references(() => nichePortfolioCommitments.id),
  commitmentVersion: integer("commitment_version").notNull(),
  selectionId: text("selection_id").notNull().references(() => nichePortfolioSelections.id),
  selectionVersion: integer("selection_version").notNull(),
  prioritySetId: text("priority_set_id").notNull().references(() => nicheExpertPrioritySets.id),
  priorityVersion: integer("priority_version").notNull(),
  comparableSetHash: text("comparable_set_hash").notNull(),
  channelId: text("channel_id").notNull(),
  programId: text("program_id").notNull(),
  opportunityId: text("opportunity_id").notNull(),
  opportunityOrigin: text("opportunity_origin").notNull(),
  aggregateVersion: integer("aggregate_version").notNull(),
  evidenceVersion: integer("evidence_version").notNull(),
  scoringVersion: integer("scoring_version").notNull(),
  systemRankAtActivation: integer("system_rank_at_activation").notNull(),
  expertPriorityAtActivation: integer("expert_priority_at_activation").notNull(),
  strategyOwner: text("strategy_owner").notNull(),
  rationale: text("rationale").notNull(),
  viewerPromise: text("viewer_promise").notNull(),
  differentiation: text("differentiation").notNull(),
  audienceFocus: text("audience_focus").notNull(),
  contentBoundariesJson: text("content_boundaries_json").notNull(),
  successMeasuresJson: text("success_measures_json").notNull(),
  reviewCadenceDays: integer("review_cadence_days").notNull(),
  commitmentReviewed: integer("commitment_reviewed", { mode: "boolean" }).notNull().default(false),
  activationAcknowledged: integer("activation_acknowledged", { mode: "boolean" }).notNull().default(false),
  actorEmail: text("actor_email").notNull(),
  actorDisplayName: text("actor_display_name").notNull(),
  actorRole: text("actor_role").notNull().default("PORTFOLIO_GOVERNANCE"),
  idempotencyKey: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  correlationId: text("correlation_id").notNull(),
  causationId: text("causation_id"),
  supersedesActivationId: text("supersedes_activation_id"),
  supersedesChannelStrategyId: text("supersedes_channel_strategy_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("channel_strategy_activation_portfolio_version_uq").on(table.portfolioId, table.activationVersion),
  uniqueIndex("channel_strategy_activation_channel_version_uq").on(table.channelId, table.channelStrategyVersion),
  uniqueIndex("channel_strategy_activation_idempotency_uq").on(table.idempotencyKey),
  index("channel_strategy_activation_commitment_created_idx").on(table.commitmentId, table.createdAt),
]);

export const channelStrategyActivationAudits = sqliteTable("channel_strategy_activation_audits", {
  id: text("id").primaryKey(),
  activationId: text("activation_id").notNull().references(() => channelStrategyActivations.id),
  portfolioId: text("portfolio_id").notNull(),
  channelId: text("channel_id").notNull(),
  eventType: text("event_type").notNull().default("CHANNEL_STRATEGY_ACTIVATED"),
  actorEmail: text("actor_email").notNull(),
  actorRole: text("actor_role").notNull().default("PORTFOLIO_GOVERNANCE"),
  idempotencyKey: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  correlationId: text("correlation_id").notNull(),
  causationId: text("causation_id"),
  evidenceLineageId: text("evidence_lineage_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("channel_strategy_activation_audits_activation_uq").on(table.activationId),
  index("channel_strategy_activation_audits_created_idx").on(table.channelId, table.createdAt),
]);

// Content System & Planning V1. These append-only records consume one active
// Channel Strategy binding. Planning autonomy never inherits provider,
// production, publishing or spend authority from strategy activation.
export const contentAutomationPolicies = sqliteTable("content_automation_policies", {
  id: text("id").primaryKey(),
  channelId: text("channel_id").notNull(),
  policyVersion: integer("policy_version").notNull(),
  strategyActivationId: text("strategy_activation_id").notNull().references(() => channelStrategyActivations.id),
  strategyVersion: integer("strategy_version").notNull(),
  mode: text("mode").notNull(),
  lifecycleState: text("lifecycle_state").notNull().default("ACTIVE"),
  dailyBudgetUsd: real("daily_budget_usd").notNull().default(0),
  monthlyBudgetUsd: real("monthly_budget_usd").notNull().default(0),
  perVideoCostCeilingUsd: real("per_video_cost_ceiling_usd").notNull().default(0),
  cadencePerMonth: integer("cadence_per_month").notNull().default(8),
  repairLimit: integer("repair_limit").notNull().default(1),
  riskTolerance: text("risk_tolerance").notNull().default("LOW"),
  autoProduction: integer("auto_production", { mode: "boolean" }).notNull().default(false),
  autoPublish: integer("auto_publish", { mode: "boolean" }).notNull().default(false),
  escalationRulesJson: text("escalation_rules_json").notNull(),
  actorEmail: text("actor_email").notNull(),
  actorDisplayName: text("actor_display_name").notNull(),
  actorRole: text("actor_role").notNull().default("CHANNEL_OWNER"),
  idempotencyKey: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  supersedesPolicyId: text("supersedes_policy_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("content_automation_policy_channel_version_uq").on(table.channelId, table.policyVersion),
  uniqueIndex("content_automation_policy_idempotency_uq").on(table.idempotencyKey),
  index("content_automation_policy_state_idx").on(table.channelId, table.lifecycleState, table.createdAt),
]);

export const contentPlanningRuns = sqliteTable("content_planning_runs", {
  id: text("id").primaryKey(),
  channelId: text("channel_id").notNull(),
  runVersion: integer("run_version").notNull(),
  policyId: text("policy_id").notNull().references(() => contentAutomationPolicies.id),
  policyVersion: integer("policy_version").notNull(),
  strategyActivationId: text("strategy_activation_id").notNull().references(() => channelStrategyActivations.id),
  strategyVersion: integer("strategy_version").notNull(),
  lifecycleState: text("lifecycle_state").notNull().default("COMPLETE"),
  horizonDays: integer("horizon_days").notNull().default(30),
  pillarCount: integer("pillar_count").notNull(),
  seriesCount: integer("series_count").notNull(),
  opportunityCount: integer("opportunity_count").notNull(),
  planItemCount: integer("plan_item_count").notNull(),
  briefCount: integer("brief_count").notNull(),
  exceptionCount: integer("exception_count").notNull().default(0),
  providerRequests: integer("provider_requests").notNull().default(0),
  spendUsd: real("spend_usd").notNull().default(0),
  actorType: text("actor_type").notNull().default("SYSTEM_AUTOPILOT"),
  policySnapshotJson: text("policy_snapshot_json").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("content_planning_run_channel_version_uq").on(table.channelId, table.runVersion),
  uniqueIndex("content_planning_run_idempotency_uq").on(table.idempotencyKey),
  index("content_planning_run_strategy_idx").on(table.strategyActivationId, table.createdAt),
]);

export const contentPillars = sqliteTable("content_pillars", {
  id: text("id").primaryKey(), runId: text("run_id").notNull().references(() => contentPlanningRuns.id), channelId: text("channel_id").notNull(), position: integer("position").notNull(), title: text("title").notNull(), purpose: text("purpose").notNull(), audienceNeed: text("audience_need").notNull(), differentiation: text("differentiation").notNull(), evidenceRequirement: text("evidence_requirement").notNull(), winningCriteriaJson: text("winning_criteria_json").notNull(), lifecycleState: text("lifecycle_state").notNull().default("ACTIVE"), contentHash: text("content_hash").notNull(), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("content_pillar_run_position_uq").on(table.runId, table.position), index("content_pillar_channel_idx").on(table.channelId, table.createdAt)]);

export const contentSeries = sqliteTable("content_series", {
  id: text("id").primaryKey(), runId: text("run_id").notNull().references(() => contentPlanningRuns.id), pillarId: text("pillar_id").notNull().references(() => contentPillars.id), channelId: text("channel_id").notNull(), position: integer("position").notNull(), title: text("title").notNull(), format: text("format").notNull(), repeatablePromise: text("repeatable_promise").notNull(), cadenceWeight: integer("cadence_weight").notNull(), lifecycleState: text("lifecycle_state").notNull().default("ACTIVE"), contentHash: text("content_hash").notNull(), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("content_series_run_position_uq").on(table.runId, table.position), index("content_series_pillar_idx").on(table.pillarId, table.createdAt)]);

export const contentOpportunities = sqliteTable("content_opportunities", {
  id: text("id").primaryKey(), runId: text("run_id").notNull().references(() => contentPlanningRuns.id), seriesId: text("series_id").notNull().references(() => contentSeries.id), channelId: text("channel_id").notNull(), systemRank: integer("system_rank").notNull(), title: text("title").notNull(), audienceProblem: text("audience_problem").notNull(), coreQuestion: text("core_question").notNull(), evidenceRefsJson: text("evidence_refs_json").notNull(), strategyFit: integer("strategy_fit").notNull(), audienceDemand: integer("audience_demand").notNull(), differentiation: integer("differentiation").notNull(), evidenceReadiness: integer("evidence_readiness").notNull(), productionComplexity: text("production_complexity").notNull(), estimatedCostUsd: real("estimated_cost_usd").notNull(), lifecycleState: text("lifecycle_state").notNull().default("PRIORITIZED"), rationale: text("rationale").notNull(), contentHash: text("content_hash").notNull(), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("content_opportunity_run_rank_uq").on(table.runId, table.systemRank), index("content_opportunity_series_idx").on(table.seriesId, table.createdAt)]);

export const editorialPlans = sqliteTable("editorial_plans", {
  id: text("id").primaryKey(), runId: text("run_id").notNull().references(() => contentPlanningRuns.id), channelId: text("channel_id").notNull(), planVersion: integer("plan_version").notNull(), horizonDays: integer("horizon_days").notNull(), cadencePerMonth: integer("cadence_per_month").notNull(), lifecycleState: text("lifecycle_state").notNull().default("AUTO_APPROVED"), rationale: text("rationale").notNull(), contentHash: text("content_hash").notNull(), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("editorial_plan_channel_version_uq").on(table.channelId, table.planVersion), uniqueIndex("editorial_plan_run_uq").on(table.runId)]);

export const editorialPlanItems = sqliteTable("editorial_plan_items", {
  id: text("id").primaryKey(), planId: text("plan_id").notNull().references(() => editorialPlans.id), opportunityId: text("opportunity_id").notNull().references(() => contentOpportunities.id), sequence: integer("sequence").notNull(), publishOffsetDays: integer("publish_offset_days").notNull(), lifecycleState: text("lifecycle_state").notNull().default("PLANNED"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("editorial_plan_item_sequence_uq").on(table.planId, table.sequence), uniqueIndex("editorial_plan_item_opportunity_uq").on(table.planId, table.opportunityId)]);

export const productionBriefsV1 = sqliteTable("production_briefs_v1", {
  id: text("id").primaryKey(), runId: text("run_id").notNull().references(() => contentPlanningRuns.id), planItemId: text("plan_item_id").notNull().references(() => editorialPlanItems.id), opportunityId: text("opportunity_id").notNull().references(() => contentOpportunities.id), briefVersion: integer("brief_version").notNull().default(1), viewerPayoff: text("viewer_payoff").notNull(), hook: text("hook").notNull(), narrativeStructureJson: text("narrative_structure_json").notNull(), claimsJson: text("claims_json").notNull(), evidenceRequirementsJson: text("evidence_requirements_json").notNull(), visualOpportunitiesJson: text("visual_opportunities_json").notNull(), riskControlsJson: text("risk_controls_json").notNull(), targetDurationSeconds: integer("target_duration_seconds").notNull(), costCeilingUsd: real("cost_ceiling_usd").notNull(), lifecycleState: text("lifecycle_state").notNull().default("READY_FOR_PRODUCTION"), contentHash: text("content_hash").notNull(), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("production_brief_plan_item_uq").on(table.planItemId), index("production_brief_run_idx").on(table.runId, table.createdAt)]);

// Content Planning V2 separates a reusable market opportunity from a concrete
// episode concept. This lets a monthly cadence contain multiple distinct
// episodes inside one opportunity without weakening uniqueness or evidence
// lineage. V1 tables remain immutable compatibility history.
export const contentEpisodeConceptsV2 = sqliteTable("content_episode_concepts_v2", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => contentPlanningRuns.id),
  opportunityId: text("opportunity_id").notNull().references(() => contentOpportunities.id),
  seriesId: text("series_id").notNull().references(() => contentSeries.id),
  channelId: text("channel_id").notNull(),
  sequence: integer("sequence").notNull(),
  title: text("title").notNull(),
  coreQuestion: text("core_question").notNull(),
  angle: text("angle").notNull(),
  evidenceRefsJson: text("evidence_refs_json").notNull(),
  estimatedCostUsd: real("estimated_cost_usd").notNull(),
  lifecycleState: text("lifecycle_state").notNull().default("APPROVED_FOR_PLAN"),
  contentHash: text("content_hash").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("content_episode_concept_run_sequence_uq").on(table.runId, table.sequence),
  uniqueIndex("content_episode_concept_run_hash_uq").on(table.runId, table.contentHash),
  index("content_episode_concept_opportunity_idx").on(table.opportunityId, table.createdAt),
]);

export const editorialPlanItemsV2 = sqliteTable("editorial_plan_items_v2", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull().references(() => editorialPlans.id),
  episodeConceptId: text("episode_concept_id").notNull().references(() => contentEpisodeConceptsV2.id),
  sequence: integer("sequence").notNull(),
  publishOffsetDays: integer("publish_offset_days").notNull(),
  lifecycleState: text("lifecycle_state").notNull().default("PLANNED"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("editorial_plan_item_v2_sequence_uq").on(table.planId, table.sequence),
  uniqueIndex("editorial_plan_item_v2_episode_uq").on(table.planId, table.episodeConceptId),
]);

export const productionBriefsV2 = sqliteTable("production_briefs_v2", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => contentPlanningRuns.id),
  planItemId: text("plan_item_id").notNull().references(() => editorialPlanItemsV2.id),
  episodeConceptId: text("episode_concept_id").notNull().references(() => contentEpisodeConceptsV2.id),
  briefVersion: integer("brief_version").notNull().default(1),
  viewerPayoff: text("viewer_payoff").notNull(),
  hook: text("hook").notNull(),
  narrativeStructureJson: text("narrative_structure_json").notNull(),
  claimsJson: text("claims_json").notNull(),
  evidenceRequirementsJson: text("evidence_requirements_json").notNull(),
  visualOpportunitiesJson: text("visual_opportunities_json").notNull(),
  riskControlsJson: text("risk_controls_json").notNull(),
  targetDurationSeconds: integer("target_duration_seconds").notNull(),
  costCeilingUsd: real("cost_ceiling_usd").notNull(),
  lifecycleState: text("lifecycle_state").notNull().default("READY_FOR_PRODUCTION"),
  contentHash: text("content_hash").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("production_brief_v2_plan_item_uq").on(table.planItemId),
  uniqueIndex("production_brief_v2_episode_uq").on(table.episodeConceptId),
  index("production_brief_v2_run_idx").on(table.runId, table.createdAt),
]);

export const contentPlanningExceptions = sqliteTable("content_planning_exceptions", {
  id: text("id").primaryKey(), runId: text("run_id").notNull().references(() => contentPlanningRuns.id), channelId: text("channel_id").notNull(), exceptionType: text("exception_type").notNull(), severity: text("severity").notNull(), lifecycleState: text("lifecycle_state").notNull().default("OPEN"), title: text("title").notNull(), detail: text("detail").notNull(), owningAuthority: text("owning_authority").notNull(), resolution: text("resolution"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), resolvedAt: text("resolved_at"),
}, (table) => [index("content_planning_exception_state_idx").on(table.channelId, table.lifecycleState, table.createdAt)]);

export const contentPlanningAudits = sqliteTable("content_planning_audits", {
  id: text("id").primaryKey(), channelId: text("channel_id").notNull(), entityType: text("entity_type").notNull(), entityId: text("entity_id").notNull(), eventType: text("event_type").notNull(), actorType: text("actor_type").notNull(), actorEmail: text("actor_email"), policyVersion: integer("policy_version").notNull(), strategyVersion: integer("strategy_version").notNull(), idempotencyKey: text("idempotency_key").notNull(), requestHash: text("request_hash").notNull(), detailJson: text("detail_json").notNull(), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("content_planning_audit_event_uq").on(table.entityId, table.eventType), index("content_planning_audit_channel_idx").on(table.channelId, table.createdAt)]);

export const v7FoundationAudits = sqliteTable("v7_foundation_audits", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  status: text("status").notNull(),
  architectureScore: integer("architecture_score").notNull().default(0),
  evidenceScore: integer("evidence_score").notNull().default(0),
  costScore: integer("cost_score").notNull().default(0),
  storageScore: integer("storage_score").notNull().default(0),
  productionAuthorized: integer("production_authorized", { mode: "boolean" }).notNull().default(false),
  checksJson: text("checks_json").notNull(),
  blockersJson: text("blockers_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const v7ContinuitySnapshots = sqliteTable("v7_continuity_snapshots", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  checkpointCode: text("checkpoint_code").notNull(),
  lifecycleState: text("lifecycle_state").notNull().default("MATERIALIZED"),
  contentJson: text("content_json").notNull(),
  contentHash: text("content_hash").notNull(),
  blockerCount: integer("blocker_count").notNull().default(0),
  activeRequestCount: integer("active_request_count").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Wave 1.1 — Google Drive is the user-owned canonical archive. OAuth tokens
// are encrypted before persistence; these tables contain no plaintext secret.
export const v7GoogleDriveConnections = sqliteTable("v7_google_drive_connections", {
  id: text("id").primaryKey(),
  status: text("status").notNull().default("NOT_CONNECTED"),
  refreshTokenCiphertext: text("refresh_token_ciphertext"),
  refreshTokenIv: text("refresh_token_iv"),
  scope: text("scope").notNull().default("https://www.googleapis.com/auth/drive.file"),
  rootFolderId: text("root_folder_id"),
  rootFolderName: text("root_folder_name").notNull().default("Frameflow Factory"),
  auditFolderId: text("audit_folder_id"),
  markerFileId: text("marker_file_id"),
  lastVerifiedAt: text("last_verified_at"),
  lastError: text("last_error"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const v7GoogleDriveOauthStates = sqliteTable("v7_google_drive_oauth_states", {
  id: text("id").primaryKey(),
  redirectUri: text("redirect_uri").notNull(),
  returnTo: text("return_to").notNull().default("/settings/storage"),
  expiresAt: text("expires_at").notNull(),
  consumedAt: text("consumed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const v7StorageSyncEvents = sqliteTable("v7_storage_sync_events", {
  id: text("id").primaryKey(),
  storageTier: text("storage_tier").notNull(),
  action: text("action").notNull(),
  status: text("status").notNull(),
  artifactId: text("artifact_id"),
  contentHash: text("content_hash"),
  evidenceJson: text("evidence_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Production Pipeline V7 — Wave 2 intelligence. These records are greenfield
// and may only be created after the Wave 1 foundation gate authorizes work.
export const v7IntelligenceRuns = sqliteTable("v7_intelligence_runs", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  stageKey: text("stage_key").notNull(),
  attempt: integer("attempt").notNull().default(1),
  status: text("status").notNull().default("RUNNING"),
  score: integer("score").notNull().default(0),
  threshold: integer("threshold").notNull().default(90),
  modelId: text("model_id").notNull(),
  sourceMode: text("source_mode").notNull().default("OPENAI_WEB_SEARCH"),
  gateJson: text("gate_json").notNull().default("[]"),
  startedAt: text("started_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: text("completed_at"),
});

export const v7IntelligenceJobs = sqliteTable("v7_intelligence_jobs", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  runId: text("run_id").notNull(),
  stageKey: text("stage_key").notNull(),
  providerResponseId: text("provider_response_id").notNull(),
  providerStatus: text("provider_status").notNull().default("queued"),
  status: text("status").notNull().default("ACTIVE"),
  heartbeatAt: text("heartbeat_at").notNull(),
  startedAt: text("started_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  finalizedAt: text("finalized_at"),
  error: text("error"),
});

export const v7IntelligenceArtifacts = sqliteTable("v7_intelligence_artifacts", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  runId: text("run_id").notNull(),
  stageKey: text("stage_key").notNull(),
  artifactType: text("artifact_type").notNull(),
  title: text("title").notNull(),
  lifecycleState: text("lifecycle_state").notNull().default("MATERIALIZED"),
  contentJson: text("content_json").notNull(),
  contentHash: text("content_hash").notNull(),
  runtimeKey: text("runtime_key"),
  driveFileId: text("drive_file_id"),
  sourceCount: integer("source_count").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const v7IntelligenceSources = sqliteTable("v7_intelligence_sources", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  runId: text("run_id").notNull(),
  stageKey: text("stage_key").notNull(),
  sourceType: text("source_type").notNull(),
  title: text("title").notNull(),
  publisher: text("publisher").notNull(),
  url: text("url").notNull(),
  publishedAt: text("published_at"),
  authorityTier: text("authority_tier").notNull(),
  freshnessState: text("freshness_state").notNull(),
  verificationState: text("verification_state").notNull().default("WEB_GROUNDED"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const v7ClaimNodes = sqliteTable("v7_claim_nodes", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  runId: text("run_id").notNull(),
  claimText: text("claim_text").notNull(),
  claimClass: text("claim_class").notNull(),
  riskLevel: text("risk_level").notNull(),
  status: text("status").notNull().default("CONTROLLED"),
  sourceIdsJson: text("source_ids_json").notNull(),
  counterEvidence: text("counter_evidence").notNull().default(""),
  qualification: text("qualification").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Production Pipeline V7 — Stage 04 Creative Contract. The tournament and
// adjudication remain auditable; only a frozen champion may authorize Story.
export const v7CreativeRuns = sqliteTable("v7_creative_runs", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  attempt: integer("attempt").notNull().default(1),
  status: text("status").notNull().default("RUNNING"),
  score: integer("score").notNull().default(0),
  threshold: integer("threshold").notNull().default(90),
  modelId: text("model_id").notNull(),
  gateJson: text("gate_json").notNull().default("[]"),
  startedAt: text("started_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: text("completed_at"),
});

export const v7CreativeJobs = sqliteTable("v7_creative_jobs", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  runId: text("run_id").notNull(),
  providerResponseId: text("provider_response_id").notNull(),
  providerStatus: text("provider_status").notNull().default("queued"),
  status: text("status").notNull().default("ACTIVE"),
  heartbeatAt: text("heartbeat_at").notNull(),
  startedAt: text("started_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  finalizedAt: text("finalized_at"),
  error: text("error"),
});

export const v7CreativeArtifacts = sqliteTable("v7_creative_artifacts", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  runId: text("run_id").notNull(),
  lifecycleState: text("lifecycle_state").notNull().default("MATERIALIZED"),
  contentJson: text("content_json").notNull(),
  contentHash: text("content_hash").notNull(),
  runtimeKey: text("runtime_key"),
  driveFileId: text("drive_file_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Production Pipeline V7 — Stage 09 fresh material production. Authorization
// is deliberately separate from dispatch so a user can grant or revoke scope
// without creating provider spend.
export const v7MaterialRuns = sqliteTable("v7_material_runs", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  status: text("status").notNull().default("BUILDING"),
  mode: text("mode").notNull().default("ZERO_SPEND_DRY_RUN"),
  briefCount: integer("brief_count").notNull().default(0),
  pilotCount: integer("pilot_count").notNull().default(0),
  score: integer("score").notNull().default(0),
  remoteRequests: integer("remote_requests").notNull().default(0),
  actualCostUsd: real("actual_cost_usd").notNull().default(0),
  gateJson: text("gate_json").notNull().default("[]"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: text("completed_at"),
});

export const v7MaterialBriefs = sqliteTable("v7_material_briefs", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  runId: text("run_id").notNull(),
  shotId: text("shot_id").notNull(),
  sectionId: text("section_id").notNull(),
  startSeconds: real("start_seconds").notNull(),
  endSeconds: real("end_seconds").notNull(),
  route: text("route").notNull(),
  visualFamily: text("visual_family").notNull(),
  modelLane: text("model_lane").notNull(),
  outputCeiling: integer("output_ceiling").notNull().default(0),
  retryLimit: integer("retry_limit").notNull().default(0),
  pilot: integer("pilot", { mode: "boolean" }).notNull().default(false),
  contentJson: text("content_json").notNull(),
  contentHash: text("content_hash").notNull(),
  status: text("status").notNull().default("PLANNED"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const v7MaterialArtifacts = sqliteTable("v7_material_artifacts", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  runId: text("run_id").notNull(),
  lifecycleState: text("lifecycle_state").notNull().default("DRY_RUN_FROZEN"),
  contentJson: text("content_json").notNull(),
  contentHash: text("content_hash").notNull(),
  runtimeKey: text("runtime_key"),
  driveFileId: text("drive_file_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const v7MaterialAuthorizations = sqliteTable("v7_material_authorizations", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  runId: text("run_id").notNull(),
  scope: text("scope").notNull().default("PILOT"),
  status: text("status").notNull().default("AUTHORIZED"),
  shotCount: integer("shot_count").notNull(),
  maxRemoteRequests: integer("max_remote_requests").notNull(),
  maxActualSpendUsd: real("max_actual_spend_usd").notNull(),
  modelPolicyJson: text("model_policy_json").notNull(),
  authorizedAt: text("authorized_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  revokedAt: text("revoked_at"),
  completedAt: text("completed_at"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const v7MaterialRequests = sqliteTable("v7_material_requests", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  runId: text("run_id").notNull(),
  authorizationId: text("authorization_id").notNull(),
  briefId: text("brief_id").notNull(),
  phase: text("phase").notNull(),
  provider: text("provider").notNull(),
  modelId: text("model_id").notNull(),
  reasoning: text("reasoning").notNull(),
  status: text("status").notNull().default("PLANNED"),
  idempotencyKey: text("idempotency_key").notNull(),
  providerResponseId: text("provider_response_id"),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  reasoningTokens: integer("reasoning_tokens").notNull().default(0),
  expectedOutputTokens: integer("expected_output_tokens").notNull().default(0),
  maxOutputTokens: integer("max_output_tokens").notNull().default(0),
  estimatedCostUsd: real("estimated_cost_usd").notNull().default(0),
  actualCostUsd: real("actual_cost_usd").notNull().default(0),
  retryOf: text("retry_of"),
  retryScope: text("retry_scope").notNull().default("NONE"),
  error: text("error"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const v7MotionProofs = sqliteTable("v7_motion_proofs", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  runId: text("run_id").notNull(),
  authorizationId: text("authorization_id").notNull(),
  briefId: text("brief_id").notNull(),
  champion: text("champion").notNull(),
  compositeRubric: text("composite_rubric").notNull(),
  rendererVersion: text("renderer_version").notNull(),
  status: text("status").notNull().default("RENDER_REQUIRED"),
  motionFileId: text("motion_file_id"),
  evidenceId: text("evidence_id"),
  sourceHashesJson: text("source_hashes_json").notNull(),
  durationSeconds: real("duration_seconds").notNull(),
  fps: integer("fps").notNull().default(30),
  score: integer("score").notNull().default(0),
  dimensionsJson: text("dimensions_json").notNull().default("{}"),
  findingsJson: text("findings_json").notNull().default("[]"),
  providerResponseId: text("provider_response_id"),
  contentHash: text("content_hash"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const v7MotionAudits = sqliteTable("v7_motion_audits", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  runId: text("run_id").notNull(),
  authorizationId: text("authorization_id").notNull(),
  briefId: text("brief_id").notNull(),
  proofId: text("proof_id").notNull(),
  rubricVersion: text("rubric_version").notNull(),
  attempt: integer("attempt").notNull(),
  status: text("status").notNull(),
  score: integer("score").notNull().default(0),
  dimensionsJson: text("dimensions_json").notNull().default("{}"),
  findingsJson: text("findings_json").notNull().default("[]"),
  evidenceBundleJson: text("evidence_bundle_json").notNull().default("{}"),
  evidenceBundleHash: text("evidence_bundle_hash").notNull(),
  requestId: text("request_id"),
  providerResponseId: text("provider_response_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const v7SequenceProofs = sqliteTable("v7_sequence_proofs", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  runId: text("run_id").notNull(),
  authorizationId: text("authorization_id").notNull(),
  canaryId: text("canary_id").notNull(),
  version: text("version").notNull(),
  status: text("status").notNull(),
  sequenceFileId: text("sequence_file_id"),
  evidenceId: text("evidence_id"),
  sourceManifestJson: text("source_manifest_json").notNull(),
  durationSeconds: real("duration_seconds").notNull().default(30),
  fps: integer("fps").notNull().default(30),
  unitCount: integer("unit_count").notNull().default(10),
  frameCount: integer("frame_count").notNull().default(30),
  score: integer("score").notNull().default(0),
  tier: text("tier").notNull().default("BLOCKED"),
  dimensionsJson: text("dimensions_json").notNull().default("{}"),
  findingsJson: text("findings_json").notNull().default("[]"),
  providerResponseId: text("provider_response_id"),
  requestId: text("request_id"),
  contentHash: text("content_hash"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: text("completed_at"),
});

export const v7MaterialUnitRepairs = sqliteTable("v7_material_unit_repairs", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  runId: text("run_id").notNull(),
  authorizationId: text("authorization_id").notNull(),
  briefId: text("brief_id").notNull(),
  repairType: text("repair_type").notNull(),
  status: text("status").notNull(),
  originalContentJson: text("original_content_json").notNull(),
  originalContentHash: text("original_content_hash").notNull(),
  repairedContentJson: text("repaired_content_json").notNull(),
  repairedContentHash: text("repaired_content_hash").notNull(),
  failureEvidenceJson: text("failure_evidence_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const v7ArchitectureBaselines = sqliteTable("v7_architecture_baselines", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  stageKey: text("stage_key").notNull(),
  version: text("version").notNull(),
  status: text("status").notNull(),
  executionState: text("execution_state").notNull(),
  sourceCheckpoint: text("source_checkpoint").notNull(),
  controlsJson: text("controls_json").notNull(),
  qualificationJson: text("qualification_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  frozenAt: text("frozen_at"),
});

export const v7CompiledShotContracts = sqliteTable("v7_compiled_shot_contracts", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  baselineId: text("baseline_id").notNull(),
  briefId: text("brief_id").notNull(),
  archetype: text("archetype").notNull(),
  riskTier: text("risk_tier").notNull(),
  claim: text("claim").notNull(),
  requiredEvidenceJson: text("required_evidence_json").notNull(),
  allowedModalitiesJson: text("allowed_modalities_json").notNull(),
  forbiddenJson: text("forbidden_json").notNull(),
  repairRoute: text("repair_route").notNull(),
  lintStatus: text("lint_status").notNull(),
  lintJson: text("lint_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const v7ArchetypeQualifications = sqliteTable("v7_archetype_qualifications", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  baselineId: text("baseline_id").notNull(),
  archetype: text("archetype").notNull(),
  status: text("status").notNull(),
  hardestFixture: text("hardest_fixture").notNull(),
  deterministicChecksJson: text("deterministic_checks_json").notNull(),
  evidenceStatus: text("evidence_status").notNull(),
  firstPassYield: real("first_pass_yield").notNull().default(0),
  blocker: text("blocker"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const v7ArchetypeCertifications = sqliteTable("v7_archetype_certifications", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  baselineId: text("baseline_id").notNull(),
  authorizationId: text("authorization_id").notNull(),
  archetype: text("archetype").notNull(),
  briefId: text("brief_id").notNull(),
  rendererVersion: text("renderer_version").notNull(),
  status: text("status").notNull(),
  frameIdsJson: text("frame_ids_json").notNull(),
  frameHashesJson: text("frame_hashes_json").notNull(),
  lintJson: text("lint_json").notNull(),
  requestId: text("request_id"),
  providerResponseId: text("provider_response_id"),
  score: integer("score").notNull().default(0),
  dimensionsJson: text("dimensions_json").notNull().default("{}"),
  findingsJson: text("findings_json").notNull().default("[]"),
  attempt: integer("attempt").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Immutable bridge from a certified archetype artifact to the exact pilot unit
// consumed by Canary V2. The frozen frame IDs, hashes and compiled-contract
// hash prevent a legacy PRIMARY/route fallback from silently taking over.
export const v7ArtifactPromotions = sqliteTable("v7_artifact_promotions", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  baselineId: text("baseline_id").notNull(),
  regressionId: text("regression_id").notNull(),
  runId: text("run_id").notNull(),
  authorizationId: text("authorization_id").notNull(),
  canaryVersion: text("canary_version").notNull(),
  briefId: text("brief_id").notNull(),
  logicalBriefId: text("logical_brief_id").notNull(),
  archetype: text("archetype").notNull(),
  certificationId: text("certification_id").notNull(),
  rendererVersion: text("renderer_version").notNull(),
  contractHash: text("contract_hash").notNull(),
  frameIdsJson: text("frame_ids_json").notNull(),
  frameHashesJson: text("frame_hashes_json").notNull(),
  status: text("status").notNull(),
  preflightJson: text("preflight_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Production Engine V2 is a greenfield, append-only production boundary. It
// consumes only canonical Content Planning V2 briefs and never imports or
// queries legacy V1–V23 production artifacts. Shared platform bindings (D1,
// object storage, SIWC and provider credentials) are accessed through new V2
// adapters and every state transition is evidence-backed.
export const productionV2Policies = sqliteTable("production_v2_policies", {
  id: text("id").primaryKey(),
  channelId: text("channel_id").notNull(),
  policyVersion: integer("policy_version").notNull(),
  lifecycleState: text("lifecycle_state").notNull().default("ACTIVE"),
  mode: text("mode").notNull().default("FULL_AUTOPILOT"),
  dailyBudgetUsd: real("daily_budget_usd").notNull(),
  monthlyBudgetUsd: real("monthly_budget_usd").notNull(),
  perVideoBudgetUsd: real("per_video_budget_usd").notNull(),
  maxRemoteRequests: integer("max_remote_requests").notNull(),
  maxRepairAttempts: integer("max_repair_attempts").notNull().default(1),
  autoDispatch: integer("auto_dispatch", { mode: "boolean" }).notNull().default(false),
  autoPublish: integer("auto_publish", { mode: "boolean" }).notNull().default(false),
  legacyReusePolicy: text("legacy_reuse_policy").notNull().default("ZERO_CODE_ZERO_ARTIFACT"),
  stopRulesJson: text("stop_rules_json").notNull(),
  actorEmail: text("actor_email").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("production_v2_policy_channel_version_uq").on(table.channelId, table.policyVersion),
  uniqueIndex("production_v2_policy_idempotency_uq").on(table.idempotencyKey),
]);

export const productionV2Packages = sqliteTable("production_v2_packages", {
  id: text("id").primaryKey(),
  channelId: text("channel_id").notNull(),
  policyId: text("policy_id").notNull().references(() => productionV2Policies.id),
  sourceBriefId: text("source_brief_id").notNull().references(() => productionBriefsV2.id),
  episodeConceptId: text("episode_concept_id").notNull().references(() => contentEpisodeConceptsV2.id),
  packageVersion: integer("package_version").notNull().default(1),
  title: text("title").notNull(),
  lifecycleState: text("lifecycle_state").notNull().default("PRODUCTION_PACKAGE_COMPILED"),
  targetDurationSeconds: integer("target_duration_seconds").notNull(),
  shotCount: integer("shot_count").notNull(),
  traceabilityComplete: integer("traceability_complete", { mode: "boolean" }).notNull().default(false),
  legacySourceCount: integer("legacy_source_count").notNull().default(0),
  providerRequests: integer("provider_requests").notNull().default(0),
  spendUsd: real("spend_usd").notNull().default(0),
  engineVersion: text("engine_version").notNull().default("PRODUCTION_ENGINE_V2_GREENFIELD"),
  contentHash: text("content_hash").notNull(),
  frozenAt: text("frozen_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("production_v2_package_brief_version_uq").on(table.sourceBriefId, table.packageVersion),
  index("production_v2_package_channel_state_idx").on(table.channelId, table.lifecycleState, table.createdAt),
]);

export const productionV2ShotContracts = sqliteTable("production_v2_shot_contracts", {
  id: text("id").primaryKey(),
  packageId: text("package_id").notNull().references(() => productionV2Packages.id),
  sequence: integer("sequence").notNull(),
  narrativeBeat: text("narrative_beat").notNull(),
  claim: text("claim").notNull(),
  evidenceRefsJson: text("evidence_refs_json").notNull(),
  route: text("route").notNull(),
  visualJob: text("visual_job").notNull(),
  requiredEvidenceJson: text("required_evidence_json").notNull(),
  forbiddenEvidenceJson: text("forbidden_evidence_json").notNull(),
  entryState: text("entry_state").notNull(),
  midpointState: text("midpoint_state").notNull(),
  exitState: text("exit_state").notNull(),
  maxDurationSeconds: integer("max_duration_seconds").notNull(),
  lifecycleState: text("lifecycle_state").notNull().default("CONTRACT_VALID"),
  engineVersion: text("engine_version").notNull().default("PRODUCTION_ENGINE_V2_GREENFIELD"),
  contentHash: text("content_hash").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("production_v2_shot_package_sequence_uq").on(table.packageId, table.sequence),
  index("production_v2_shot_state_idx").on(table.packageId, table.lifecycleState),
]);

export const productionV2Jobs = sqliteTable("production_v2_jobs", {
  id: text("id").primaryKey(),
  packageId: text("package_id").notNull().references(() => productionV2Packages.id),
  shotContractId: text("shot_contract_id").references(() => productionV2ShotContracts.id),
  jobType: text("job_type").notNull(),
  lifecycleState: text("lifecycle_state").notNull().default("SPECIFIED"),
  attempt: integer("attempt").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(1),
  idempotencyKey: text("idempotency_key").notNull(),
  inputHash: text("input_hash").notNull(),
  leaseOwner: text("lease_owner"),
  leaseExpiresAt: text("lease_expires_at"),
  blocker: text("blocker"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("production_v2_job_idempotency_uq").on(table.idempotencyKey),
  index("production_v2_job_state_idx").on(table.lifecycleState, table.createdAt),
]);

export const productionV2Artifacts = sqliteTable("production_v2_artifacts", {
  id: text("id").primaryKey(),
  packageId: text("package_id").notNull().references(() => productionV2Packages.id),
  shotContractId: text("shot_contract_id").references(() => productionV2ShotContracts.id),
  artifactType: text("artifact_type").notNull(),
  lifecycleState: text("lifecycle_state").notNull().default("STORED"),
  storageKey: text("storage_key").notNull(),
  mimeType: text("mime_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  sha256: text("sha256").notNull(),
  rightsState: text("rights_state").notNull(),
  provenanceJson: text("provenance_json").notNull(),
  engineVersion: text("engine_version").notNull().default("PRODUCTION_ENGINE_V2_GREENFIELD"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  frozenAt: text("frozen_at"),
}, (table) => [
  uniqueIndex("production_v2_artifact_storage_hash_uq").on(table.storageKey, table.sha256),
  index("production_v2_artifact_package_type_idx").on(table.packageId, table.artifactType),
]);

export const productionV2ProviderRequests = sqliteTable("production_v2_provider_requests", {
  id: text("id").primaryKey(),
  policyId: text("policy_id").notNull().references(() => productionV2Policies.id),
  packageId: text("package_id").notNull().references(() => productionV2Packages.id),
  jobId: text("job_id").references(() => productionV2Jobs.id),
  provider: text("provider").notNull(),
  operation: text("operation").notNull(),
  lifecycleState: text("lifecycle_state").notNull().default("CREATED"),
  providerResponseId: text("provider_response_id"),
  idempotencyKey: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  costUsd: real("cost_usd").notNull().default(0),
  errorCode: text("error_code"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: text("completed_at"),
}, (table) => [
  uniqueIndex("production_v2_provider_idempotency_uq").on(table.idempotencyKey),
  index("production_v2_provider_package_state_idx").on(table.packageId, table.lifecycleState),
]);

export const productionV2QualityAssessments = sqliteTable("production_v2_quality_assessments", {
  id: text("id").primaryKey(),
  packageId: text("package_id").notNull().references(() => productionV2Packages.id),
  artifactId: text("artifact_id").references(() => productionV2Artifacts.id),
  assessmentType: text("assessment_type").notNull(),
  evaluationNumber: integer("evaluation_number").notNull(),
  lifecycleState: text("lifecycle_state").notNull(),
  score: integer("score").notNull(),
  p0Count: integer("p0_count").notNull().default(0),
  p1Count: integer("p1_count").notNull().default(0),
  dimensionsJson: text("dimensions_json").notNull(),
  findingsJson: text("findings_json").notNull(),
  evidenceHash: text("evidence_hash").notNull(),
  independentActor: text("independent_actor").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("production_v2_assessment_artifact_eval_uq").on(table.artifactId, table.assessmentType, table.evaluationNumber),
  index("production_v2_assessment_package_idx").on(table.packageId, table.createdAt),
]);

export const productionV2RepairPackages = sqliteTable("production_v2_repair_packages", {
  id: text("id").primaryKey(),
  packageId: text("package_id").notNull().references(() => productionV2Packages.id),
  assessmentId: text("assessment_id").notNull().references(() => productionV2QualityAssessments.id),
  rootStage: text("root_stage").notNull(),
  lifecycleState: text("lifecycle_state").notNull().default("AUTHORIZED"),
  allowedChangesJson: text("allowed_changes_json").notNull(),
  regressionTestsJson: text("regression_tests_json").notNull(),
  maxRemoteRequests: integer("max_remote_requests").notNull(),
  maxSpendUsd: real("max_spend_usd").notNull(),
  attempt: integer("attempt").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: text("completed_at"),
}, (table) => [uniqueIndex("production_v2_repair_package_attempt_uq").on(table.packageId, table.attempt)]);

export const productionV2ScaleWaves = sqliteTable("production_v2_scale_waves", {
  id: text("id").primaryKey(),
  channelId: text("channel_id").notNull(),
  waveNumber: integer("wave_number").notNull(),
  scopeJson: text("scope_json").notNull(),
  lifecycleState: text("lifecycle_state").notNull().default("BLOCKED_UPSTREAM"),
  packageCount: integer("package_count").notNull(),
  completedCount: integer("completed_count").notNull().default(0),
  p0Count: integer("p0_count").notNull().default(0),
  p1Rate: real("p1_rate").notNull().default(0),
  duplicateRate: real("duplicate_rate").notNull().default(0),
  providerFailureRate: real("provider_failure_rate").notNull().default(0),
  costVarianceRate: real("cost_variance_rate").notNull().default(0),
  admissionEvidenceHash: text("admission_evidence_hash"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: text("completed_at"),
}, (table) => [uniqueIndex("production_v2_wave_channel_number_uq").on(table.channelId, table.waveNumber)]);

export const productionV2Audits = sqliteTable("production_v2_audits", {
  id: text("id").primaryKey(),
  channelId: text("channel_id").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  eventType: text("event_type").notNull(),
  actorType: text("actor_type").notNull(),
  actorEmail: text("actor_email"),
  detailJson: text("detail_json").notNull(),
  evidenceHash: text("evidence_hash").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("production_v2_audit_entity_event_uq").on(table.entityId, table.eventType),
  index("production_v2_audit_channel_idx").on(table.channelId, table.createdAt),
]);

export const v7SequentialPrograms = sqliteTable("v7_sequential_programs", {
  id: text("id").primaryKey(),
  channelId: text("channel_id").notNull(),
  contractVersion: text("contract_version").notNull().default("V7_V23_4_V281"),
  lifecycleState: text("lifecycle_state").notNull().default("ACTIVE"),
  executionMode: text("execution_mode").notNull().default("ONE_VIDEO_AT_A_TIME"),
  targetVideos: integer("target_videos").notNull().default(15),
  currentSequence: integer("current_sequence").notNull().default(1),
  overallFloor: integer("overall_floor").notNull().default(92),
  criticalFloor: integer("critical_floor").notNull().default(90),
  dimensionFloor: integer("dimension_floor").notNull().default(86),
  p0Tolerance: integer("p0_tolerance").notNull().default(0),
  p1Tolerance: integer("p1_tolerance").notNull().default(0),
  maximumRepairLoops: integer("maximum_repair_loops").notNull().default(2),
  ownerGate: text("owner_gate").notNull().default("OWNER_READY_REQUIRED"),
  historicalMasterPolicy: text("historical_master_policy").notNull().default("REJECTED_HISTORICAL_EVIDENCE"),
  autoDispatch: integer("auto_dispatch", { mode: "boolean" }).notNull().default(true),
  autoPublish: integer("auto_publish", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("v7_sequential_program_channel_uq").on(table.channelId)]);

export const v7SequentialQueue = sqliteTable("v7_sequential_queue", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  packageId: text("package_id").notNull(),
  sequence: integer("sequence").notNull(),
  title: text("title").notNull(),
  lifecycleState: text("lifecycle_state").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(false),
  sourceBriefHash: text("source_brief_hash").notNull(),
  priorMasterState: text("prior_master_state").notNull().default("REJECTED_QUALITY"),
  releaseAssessmentId: text("release_assessment_id"),
  ownerReadyAt: text("owner_ready_at"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("v7_sequential_queue_program_sequence_uq").on(table.programId, table.sequence),
  uniqueIndex("v7_sequential_queue_package_uq").on(table.packageId),
  index("v7_sequential_queue_state_idx").on(table.programId, table.lifecycleState),
]);

export const v7SequentialStageRuns = sqliteTable("v7_sequential_stage_runs", {
  id: text("id").primaryKey(),
  queueId: text("queue_id").notNull(),
  stageKey: text("stage_key").notNull(),
  sequence: integer("sequence").notNull(),
  stageName: text("stage_name").notNull(),
  ownerPlane: text("owner_plane").notNull(),
  lifecycleState: text("lifecycle_state").notNull().default("BLOCKED_UPSTREAM"),
  gateVersion: text("gate_version").notNull(),
  requiredArtifactsJson: text("required_artifacts_json").notNull().default("[]"),
  evidenceSummary: text("evidence_summary").notNull().default("No verified artifact"),
  attempt: integer("attempt").notNull().default(0),
  blocker: text("blocker"),
  frozenAt: text("frozen_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("v7_sequential_stage_queue_key_uq").on(table.queueId, table.stageKey),
  index("v7_sequential_stage_state_idx").on(table.queueId, table.lifecycleState),
]);

export const v7SequentialReleaseAssessments = sqliteTable("v7_sequential_release_assessments", {
  id: text("id").primaryKey(),
  queueId: text("queue_id").notNull(),
  masterArtifactId: text("master_artifact_id").notNull(),
  evaluationNumber: integer("evaluation_number").notNull(),
  lifecycleState: text("lifecycle_state").notNull(),
  overallScore: integer("overall_score").notNull(),
  criticalFloor: integer("critical_floor").notNull(),
  dimensionFloor: integer("dimension_floor").notNull(),
  p0Count: integer("p0_count").notNull().default(0),
  p1Count: integer("p1_count").notNull().default(0),
  criticResultsJson: text("critic_results_json").notNull(),
  findingsJson: text("findings_json").notNull().default("[]"),
  evidenceHash: text("evidence_hash").notNull(),
  independentActor: text("independent_actor").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("v7_sequential_release_master_eval_uq").on(table.masterArtifactId, table.evaluationNumber),
  index("v7_sequential_release_queue_idx").on(table.queueId, table.createdAt),
]);

export const v7SequentialEvents = sqliteTable("v7_sequential_events", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  queueId: text("queue_id"),
  eventType: text("event_type").notNull(),
  actorType: text("actor_type").notNull(),
  detailJson: text("detail_json").notNull(),
  evidenceHash: text("evidence_hash").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("v7_sequential_events_program_idx").on(table.programId, table.createdAt)]);

export const v7StageContractRegistry = sqliteTable("v7_stage_contract_registry", {
  id: text("id").primaryKey(),
  contractVersion: text("contract_version").notNull(),
  stageKey: text("stage_key").notNull(),
  sequence: integer("sequence").notNull(),
  stageName: text("stage_name").notNull(),
  ownerPlane: text("owner_plane").notNull(),
  gateVersion: text("gate_version").notNull(),
  predecessorKeysJson: text("predecessor_keys_json").notNull().default("[]"),
  requiredArtifactsJson: text("required_artifacts_json").notNull().default("[]"),
  allowedCommandsJson: text("allowed_commands_json").notNull(),
  eligibilityPolicyJson: text("eligibility_policy_json").notNull(),
  providerPolicyJson: text("provider_policy_json").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("v7_stage_contract_version_key_uq").on(table.contractVersion, table.stageKey),
  uniqueIndex("v7_stage_contract_version_sequence_uq").on(table.contractVersion, table.sequence),
]);

export const v7SequentialArtifacts = sqliteTable("v7_sequential_artifacts", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  queueId: text("queue_id").notNull(),
  stageRunId: text("stage_run_id").notNull(),
  stageKey: text("stage_key").notNull(),
  artifactType: text("artifact_type").notNull(),
  revision: integer("revision").notNull(),
  lifecycleState: text("lifecycle_state").notNull().default("PRODUCED"),
  contentJson: text("content_json"),
  storageKey: text("storage_key"),
  mimeType: text("mime_type").notNull().default("application/json"),
  byteSize: integer("byte_size").notNull().default(0),
  sha256: text("sha256").notNull(),
  parentArtifactIdsJson: text("parent_artifact_ids_json").notNull().default("[]"),
  lineageRootHash: text("lineage_root_hash").notNull(),
  rightsState: text("rights_state").notNull(),
  costState: text("cost_state").notNull(),
  provider: text("provider"),
  providerRequestId: text("provider_request_id"),
  verificationJson: text("verification_json"),
  verifiedAt: text("verified_at"),
  frozenAt: text("frozen_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("v7_sequential_artifact_revision_uq").on(table.queueId, table.stageKey, table.artifactType, table.revision),
  uniqueIndex("v7_sequential_artifact_hash_uq").on(table.queueId, table.sha256),
  index("v7_sequential_artifact_stage_state_idx").on(table.queueId, table.stageKey, table.lifecycleState),
]);

export const v7SequentialCommandReceipts = sqliteTable("v7_sequential_command_receipts", {
  id: text("id").primaryKey(),
  idempotencyKey: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  command: text("command").notNull(),
  programId: text("program_id").notNull(),
  queueId: text("queue_id").notNull(),
  stageKey: text("stage_key").notNull(),
  actorType: text("actor_type").notNull(),
  actorEmail: text("actor_email").notNull(),
  outcome: text("outcome").notNull(),
  stageState: text("stage_state").notNull(),
  artifactId: text("artifact_id"),
  providerRequests: integer("provider_requests").notNull().default(0),
  spendUsd: real("spend_usd").notNull().default(0),
  detailJson: text("detail_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("v7_sequential_command_idempotency_uq").on(table.idempotencyKey)]);

export const v7SequentialLeases = sqliteTable("v7_sequential_leases", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  queueId: text("queue_id").notNull(),
  stageKey: text("stage_key").notNull(),
  lifecycleState: text("lifecycle_state").notNull().default("ACTIVE"),
  actorEmail: text("actor_email").notNull(),
  acquiredAt: text("acquired_at").notNull(),
  expiresAt: text("expires_at").notNull(),
  releasedAt: text("released_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("v7_sequential_lease_program_state_idx").on(table.programId, table.lifecycleState)]);

export const v7SequentialProviderRequests = sqliteTable("v7_sequential_provider_requests", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  queueId: text("queue_id").notNull(),
  stageKey: text("stage_key").notNull(),
  artifactId: text("artifact_id"),
  provider: text("provider").notNull(),
  operation: text("operation").notNull(),
  lifecycleState: text("lifecycle_state").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  providerResponseId: text("provider_response_id"),
  responseHash: text("response_hash"),
  rightsState: text("rights_state").notNull(),
  costUsd: real("cost_usd").notNull().default(0),
  errorCode: text("error_code"),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
}, (table) => [
  uniqueIndex("v7_sequential_provider_idempotency_uq").on(table.idempotencyKey),
  index("v7_sequential_provider_queue_state_idx").on(table.queueId, table.lifecycleState),
]);

export const v7SequentialBudgetPlans = sqliteTable("v7_sequential_budget_plans", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  queueId: text("queue_id").notNull(),
  version: integer("version").notNull(),
  lifecycleState: text("lifecycle_state").notNull(),
  stageScopeJson: text("stage_scope_json").notNull(),
  maxSpendUsd: real("max_spend_usd").notNull(),
  maxProviderRequests: integer("max_provider_requests").notNull(),
  providerPlanJson: text("provider_plan_json").notNull(),
  rightsPlanJson: text("rights_plan_json").notNull(),
  actualSpendUsd: real("actual_spend_usd").notNull().default(0),
  actualProviderRequests: integer("actual_provider_requests").notNull().default(0),
  approvedBy: text("approved_by").notNull(),
  approvalEvidenceHash: text("approval_evidence_hash").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("v7_sequential_budget_queue_version_uq").on(table.queueId, table.version)]);

export const v7SequentialMediaAssets = sqliteTable("v7_sequential_media_assets", {
  id: text("id").primaryKey(), programId: text("program_id").notNull(), queueId: text("queue_id").notNull(), shotId: text("shot_id").notNull(),
  assetMode: text("asset_mode").notNull(), provider: text("provider").notNull(), providerAssetId: text("provider_asset_id"), providerRequestId: text("provider_request_id"),
  storageKey: text("storage_key").notNull(), mimeType: text("mime_type").notNull(), byteSize: integer("byte_size").notNull(), sha256: text("sha256").notNull(),
  sourceUrl: text("source_url"), licenseUrl: text("license_url"), rightsState: text("rights_state").notNull(), costUsd: real("cost_usd").notNull().default(0),
  metadataJson: text("metadata_json").notNull(), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("v7_sequential_media_queue_shot_uq").on(table.queueId, table.shotId), index("v7_sequential_media_queue_provider_idx").on(table.queueId, table.provider)]);

export const v7SequentialAudioAssets = sqliteTable("v7_sequential_audio_assets", {
  id: text("id").primaryKey(), programId: text("program_id").notNull(), queueId: text("queue_id").notNull(), stemType: text("stem_type").notNull(),
  provider: text("provider").notNull(), providerVoiceId: text("provider_voice_id"), providerRequestId: text("provider_request_id"), storageKey: text("storage_key").notNull(),
  mimeType: text("mime_type").notNull(), byteSize: integer("byte_size").notNull(), sha256: text("sha256").notNull(), sampleRate: integer("sample_rate").notNull(),
  channels: integer("channels").notNull(), sampleCount: integer("sample_count").notNull(), durationSeconds: real("duration_seconds").notNull(), peakDbfs: real("peak_dbfs").notNull(),
  rmsDbfs: real("rms_dbfs").notNull(), silenceRatio: real("silence_ratio").notNull(), rightsState: text("rights_state").notNull(), costUsd: real("cost_usd").notNull().default(0),
  metadataJson: text("metadata_json").notNull(), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("v7_sequential_audio_queue_stem_uq").on(table.queueId, table.stemType), index("v7_sequential_audio_queue_provider_idx").on(table.queueId, table.provider)]);

export const v7FirstPassCapabilities = sqliteTable("v7_first_pass_capabilities", {
  id: text("id").primaryKey(), capabilityKey: text("capability_key").notNull(), capabilityVersion: text("capability_version").notNull(), plane: text("plane").notNull(), label: text("label").notNull(),
  provider: text("provider").notNull(), toolOrModel: text("tool_or_model").notNull(), stageKeysJson: text("stage_keys_json").notNull(), configurationJson: text("configuration_json").notNull(),
  rightsPolicy: text("rights_policy").notNull(), costPolicy: text("cost_policy").notNull(), failureMode: text("failure_mode").notNull(), lifecycleState: text("lifecycle_state").notNull().default("QUALIFICATION_REQUIRED"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("v7_first_pass_capability_key_version_uq").on(table.capabilityKey, table.capabilityVersion), index("v7_first_pass_capability_plane_state_idx").on(table.plane, table.lifecycleState)]);

export const v7FirstPassArchetypes = sqliteTable("v7_first_pass_archetypes", {
  id: text("id").primaryKey(), archetypeKey: text("archetype_key").notNull(), plane: text("plane").notNull(), label: text("label").notNull(), riskTier: text("risk_tier").notNull(),
  definition: text("definition").notNull(), requiredEvidenceJson: text("required_evidence_json").notNull(), minimumFirstPassYield: real("minimum_first_pass_yield").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("v7_first_pass_archetype_key_uq").on(table.archetypeKey), index("v7_first_pass_archetype_plane_idx").on(table.plane, table.active)]);

export const v7FirstPassFixtures = sqliteTable("v7_first_pass_fixtures", {
  id: text("id").primaryKey(), archetypeId: text("archetype_id").notNull(), fixtureVersion: text("fixture_version").notNull(), label: text("label").notNull(), hardestFixture: integer("hardest_fixture", { mode: "boolean" }).notNull().default(true),
  inputContractJson: text("input_contract_json").notNull(), expectedEvidenceJson: text("expected_evidence_json").notNull(), inputHash: text("input_hash"), lifecycleState: text("lifecycle_state").notNull().default("DESIGNED"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("v7_first_pass_fixture_archetype_version_uq").on(table.archetypeId, table.fixtureVersion)]);

export const v7FirstPassQualifications = sqliteTable("v7_first_pass_qualifications", {
  id: text("id").primaryKey(), capabilityId: text("capability_id").notNull(), capabilityVersion: text("capability_version").notNull(), archetypeId: text("archetype_id").notNull(), qualificationVersion: integer("qualification_version").notNull(),
  standardVersion: text("standard_version").notNull(), fixtureIdsJson: text("fixture_ids_json").notNull(), settingsHash: text("settings_hash"), sampleSize: integer("sample_size").notNull().default(0),
  firstPassYield: real("first_pass_yield").notNull().default(0), p0EscapeCount: integer("p0_escape_count").notNull().default(0), evidenceHashesJson: text("evidence_hashes_json").notNull().default("[]"),
  lifecycleState: text("lifecycle_state").notNull().default("QUALIFICATION_REQUIRED"), blocker: text("blocker"), qualifiedAt: text("qualified_at"), revokedAt: text("revoked_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("v7_first_pass_qualification_version_uq").on(table.capabilityId, table.archetypeId, table.qualificationVersion), index("v7_first_pass_qualification_lookup_idx").on(table.capabilityId, table.archetypeId, table.lifecycleState, table.qualificationVersion)]);

export const v7FirstPassOperationRequirements = sqliteTable("v7_first_pass_operation_requirements", {
  id: text("id").primaryKey(), operation: text("operation").notNull(), stageKey: text("stage_key").notNull(), capabilityId: text("capability_id").notNull(), archetypeId: text("archetype_id").notNull(),
  minimumSampleSize: integer("minimum_sample_size").notNull().default(1), minimumFirstPassYield: real("minimum_first_pass_yield").notNull(), requiredStandardVersion: text("required_standard_version").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("v7_first_pass_requirement_uq").on(table.operation, table.stageKey, table.capabilityId, table.archetypeId), index("v7_first_pass_requirement_operation_idx").on(table.operation, table.stageKey, table.active)]);

export const v7FirstPassArtifactEnvelopes = sqliteTable("v7_first_pass_artifact_envelopes", {
  id: text("id").primaryKey(), programId: text("program_id").notNull(), queueId: text("queue_id").notNull(), stageKey: text("stage_key").notNull(), artifactId: text("artifact_id"), artifactType: text("artifact_type").notNull(),
  revision: integer("revision").notNull(), lifecycleState: text("lifecycle_state").notNull(), standardVersion: text("standard_version").notNull(), capabilityQualificationIdsJson: text("capability_qualification_ids_json").notNull(),
  parentHashesJson: text("parent_hashes_json").notNull(), artifactHash: text("artifact_hash"), rightsState: text("rights_state").notNull(), costState: text("cost_state").notNull(), preflightState: text("preflight_state").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), sealedAt: text("sealed_at"), supersededAt: text("superseded_at"),
}, (table) => [uniqueIndex("v7_first_pass_envelope_revision_uq").on(table.queueId, table.stageKey, table.artifactType, table.revision), index("v7_first_pass_envelope_state_idx").on(table.queueId, table.lifecycleState, table.stageKey)]);

export const v7FirstPassDispatchAudits = sqliteTable("v7_first_pass_dispatch_audits", {
  id: text("id").primaryKey(), programId: text("program_id"), queueId: text("queue_id"), operation: text("operation").notNull(), stageKey: text("stage_key").notNull(), decision: text("decision").notNull(),
  standardVersion: text("standard_version").notNull(), requirementCount: integer("requirement_count").notNull(), eligibleCount: integer("eligible_count").notNull(), gapJson: text("gap_json").notNull(),
  providerRequests: integer("provider_requests").notNull().default(0), spendUsd: real("spend_usd").notNull().default(0), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("v7_first_pass_dispatch_operation_idx").on(table.operation, table.stageKey, table.createdAt)]);

export const v7VideoQualityStandards = sqliteTable("v7_video_quality_standards", {
  id: text("id").primaryKey(), standardVersion: text("standard_version").notNull(), scope: text("scope").notNull(), scopeKey: text("scope_key").notNull(),
  enforcementLevel: text("enforcement_level").notNull(), trigger: text("trigger").notNull(), metric: text("metric").notNull(), thresholdOrRange: text("threshold_or_range").notNull(),
  evidenceRequiredJson: text("evidence_required_json").notNull(), owningStage: text("owning_stage").notNull(), failureAction: text("failure_action").notNull(), waiverPolicy: text("waiver_policy").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("v7_video_quality_standard_version_id_uq").on(table.standardVersion, table.id), index("v7_video_quality_standard_scope_idx").on(table.standardVersion, table.scope, table.scopeKey, table.active)]);

export const v7VideoQualityEvidence = sqliteTable("v7_video_quality_evidence", {
  id: text("id").primaryKey(), programId: text("program_id").notNull(), queueId: text("queue_id").notNull(), standardVersion: text("standard_version").notNull(), standardId: text("standard_id").notNull(),
  evaluationNumber: integer("evaluation_number").notNull(), lifecycleState: text("lifecycle_state").notNull(), evidenceKind: text("evidence_kind").notNull(), artifactId: text("artifact_id"), storageKey: text("storage_key"), evidenceHash: text("evidence_hash"),
  measuredValueJson: text("measured_value_json").notNull(), findingsJson: text("findings_json").notNull().default("[]"), evaluatedBy: text("evaluated_by").notNull(), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("v7_video_quality_evidence_eval_uq").on(table.queueId, table.standardVersion, table.standardId, table.evaluationNumber), index("v7_video_quality_evidence_latest_idx").on(table.queueId, table.standardId, table.createdAt)]);

export const v7GoldenSequences = sqliteTable("v7_golden_sequences", {
  id: text("id").primaryKey(), programId: text("program_id").notNull(), queueId: text("queue_id").notNull(), standardVersion: text("standard_version").notNull(), revision: integer("revision").notNull(), lifecycleState: text("lifecycle_state").notNull(),
  startSeconds: real("start_seconds").notNull(), endSeconds: real("end_seconds").notNull(), durationSeconds: real("duration_seconds").notNull(), narrationText: text("narration_text").notNull(), manifestJson: text("manifest_json").notNull(),
  qualityJson: text("quality_json").notNull().default("{}"), evidenceHash: text("evidence_hash"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("v7_golden_sequence_queue_revision_uq").on(table.queueId, table.revision)]);

export const v7GoldenSequenceAssets = sqliteTable("v7_golden_sequence_assets", {
  id: text("id").primaryKey(), goldenSequenceId: text("golden_sequence_id").notNull(), role: text("role").notNull(), shotId: text("shot_id"), temporalState: text("temporal_state"), storageKey: text("storage_key").notNull(),
  mimeType: text("mime_type").notNull(), byteSize: integer("byte_size").notNull(), sha256: text("sha256").notNull(), rightsState: text("rights_state").notNull(), metadataJson: text("metadata_json").notNull(), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("v7_golden_sequence_asset_role_uq").on(table.goldenSequenceId, table.role, table.shotId, table.temporalState)]);

export const v7GoldenMasterJobs = sqliteTable("v7_golden_master_jobs", {
  id: text("id").primaryKey(), goldenSequenceId: text("golden_sequence_id").notNull(), revision: integer("revision").notNull(), lifecycleState: text("lifecycle_state").notNull(),
  renderSpecJson: text("render_spec_json").notNull(), masterAssetId: text("master_asset_id"), probeJson: text("probe_json"), scanJson: text("scan_json"), playbackJson: text("playback_json"), errorCode: text("error_code"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("v7_golden_master_job_sequence_uq").on(table.goldenSequenceId, table.revision), index("v7_golden_master_job_state_idx").on(table.lifecycleState, table.updatedAt)]);

export const v7LearningReadyContractRegistry = sqliteTable("v7_learning_ready_contract_registry", {
  id: text("id").primaryKey(), contractKey: text("contract_key").notNull(), artifactType: text("artifact_type").notNull(), contractVersion: text("contract_version").notNull(),
  ownerPlane: text("owner_plane").notNull(), stageBindingsJson: text("stage_bindings_json").notNull(), requiredParentTypesJson: text("required_parent_types_json").notNull(),
  exitEvidenceJson: text("exit_evidence_json").notNull(), lifecycleState: text("lifecycle_state").notNull().default("SCHEMA_DEFINED"), providerRequests: integer("provider_requests").notNull().default(0),
  spendUsd: real("spend_usd").notNull().default(0), active: integer("active", { mode: "boolean" }).notNull().default(true), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("v7_learning_ready_registry_key_version_uq").on(table.contractKey, table.contractVersion), uniqueIndex("v7_learning_ready_registry_artifact_version_uq").on(table.artifactType, table.contractVersion)]);

export const v7ChannelIdentityContracts = sqliteTable("v7_channel_identity_contracts", {
  id: text("id").primaryKey(), channelId: text("channel_id").notNull(), version: integer("version").notNull(), lifecycleState: text("lifecycle_state").notNull().default("DRAFT"),
  strategyBindingHash: text("strategy_binding_hash").notNull(), voiceJson: text("voice_json").notNull(), voiceSettingsHash: text("voice_settings_hash").notNull(), visualGrammarJson: text("visual_grammar_json").notNull(),
  musicPolicyJson: text("music_policy_json").notNull(), pronunciationLexiconRef: text("pronunciation_lexicon_ref").notNull(), terminologyLedgerRef: text("terminology_ledger_ref").notNull(),
  contentHash: text("content_hash"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), sealedAt: text("sealed_at"), supersededAt: text("superseded_at"),
}, (table) => [uniqueIndex("v7_channel_identity_version_uq").on(table.channelId, table.version), index("v7_channel_identity_state_idx").on(table.channelId, table.lifecycleState)]);

export const v7PackagingPromiseContracts = sqliteTable("v7_packaging_promise_contracts", {
  id: text("id").primaryKey(), queueId: text("queue_id").notNull(), version: integer("version").notNull(), lifecycleState: text("lifecycle_state").notNull().default("DRAFT"),
  creativeRouteId: text("creative_route_id").notNull(), channelIdentityHash: text("channel_identity_hash").notNull(), titleVariantsJson: text("title_variants_json").notNull(), thumbnailConceptJson: text("thumbnail_concept_json").notNull(),
  audiencePromise: text("audience_promise").notNull(), differentiationHypothesis: text("differentiation_hypothesis").notNull(), promisedClaimIdsJson: text("promised_claim_ids_json").notNull(),
  mobileLegibilityState: text("mobile_legibility_state").notNull().default("NOT_EVALUATED"), contentHash: text("content_hash"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), sealedAt: text("sealed_at"), supersededAt: text("superseded_at"),
}, (table) => [uniqueIndex("v7_packaging_promise_queue_version_uq").on(table.queueId, table.version), index("v7_packaging_promise_state_idx").on(table.queueId, table.lifecycleState)]);

export const v7PredictedPerformanceArtifacts = sqliteTable("v7_predicted_performance_artifacts", {
  id: text("id").primaryKey(), queueId: text("queue_id").notNull(), version: integer("version").notNull(), lifecycleState: text("lifecycle_state").notNull().default("DRAFT"),
  baselineRef: text("baseline_ref").notNull(), packagingPromiseHash: text("packaging_promise_hash").notNull(), compositionStageHashesJson: text("composition_stage_hashes_json").notNull(),
  retentionCurveJson: text("retention_curve_json").notNull(), beatRisksJson: text("beat_risks_json").notNull(), predictedCtrJson: text("predicted_ctr_json").notNull(), criticPredictionsJson: text("critic_predictions_json").notNull(),
  contentHash: text("content_hash"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), sealedAt: text("sealed_at"), supersededAt: text("superseded_at"),
}, (table) => [uniqueIndex("v7_predicted_performance_queue_version_uq").on(table.queueId, table.version), index("v7_predicted_performance_state_idx").on(table.queueId, table.lifecycleState)]);

export const v7ExperimentDefinitions = sqliteTable("v7_experiment_definitions", {
  id: text("id").primaryKey(), channelId: text("channel_id").notNull(), version: integer("version").notNull(), lifecycleState: text("lifecycle_state").notNull().default("DRAFT"),
  hypothesis: text("hypothesis").notNull(), variableTested: text("variable_tested").notNull(), variablesHeldConstantJson: text("variables_held_constant_json").notNull(), minimumSampleSize: integer("minimum_sample_size").notNull(),
  decisionCriterionJson: text("decision_criterion_json").notNull(), packagingPromiseHash: text("packaging_promise_hash").notNull(), predictionHash: text("prediction_hash").notNull(), contentHash: text("content_hash"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), activatedAt: text("activated_at"), concludedAt: text("concluded_at"),
}, (table) => [uniqueIndex("v7_experiment_channel_version_uq").on(table.channelId, table.version), index("v7_experiment_state_idx").on(table.channelId, table.lifecycleState)]);

export const v7LearningCandidates = sqliteTable("v7_learning_candidates", {
  id: text("id").primaryKey(), channelId: text("channel_id").notNull(), experimentId: text("experiment_id").notNull(), lifecycleState: text("lifecycle_state").notNull().default("INSUFFICIENT_EVIDENCE"),
  target: text("target").notNull(), targetVersion: integer("target_version").notNull(), independentVideoIdsJson: text("independent_video_ids_json").notNull(), observedSampleSize: integer("observed_sample_size").notNull().default(0),
  actualVsPredictedJson: text("actual_vs_predicted_json").notNull(), consistentDirection: integer("consistent_direction", { mode: "boolean" }).notNull().default(false), evidenceHash: text("evidence_hash"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), eligibleAt: text("eligible_at"), promotedAt: text("promoted_at"),
}, (table) => [uniqueIndex("v7_learning_candidate_experiment_target_uq").on(table.experimentId, table.target), index("v7_learning_candidate_state_idx").on(table.channelId, table.lifecycleState)]);

export const v7LearningPromotionReceipts = sqliteTable("v7_learning_promotion_receipts", {
  id: text("id").primaryKey(), learningCandidateId: text("learning_candidate_id").notNull(), commandVersion: text("command_version").notNull(), idempotencyKey: text("idempotency_key").notNull(),
  actorEmail: text("actor_email").notNull(), ownerIdentityBound: integer("owner_identity_bound", { mode: "boolean" }).notNull(), target: text("target").notNull(), priorVersion: integer("prior_version").notNull(),
  newVersion: integer("new_version").notNull(), evidenceHash: text("evidence_hash").notNull(), outcome: text("outcome").notNull(), providerRequests: integer("provider_requests").notNull().default(0), spendUsd: real("spend_usd").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("v7_learning_promotion_idempotency_uq").on(table.idempotencyKey), uniqueIndex("v7_learning_promotion_candidate_uq").on(table.learningCandidateId)]);

export const v7RightsComplianceManifests = sqliteTable("v7_rights_compliance_manifests", {
  id: text("id").primaryKey(), queueId: text("queue_id").notNull(), version: integer("version").notNull(), lifecycleState: text("lifecycle_state").notNull().default("NOT_EVALUATED"),
  licenseTermsJson: text("license_terms_json").notNull(), territoryJson: text("territory_json").notNull(), validFrom: text("valid_from").notNull(), validUntil: text("valid_until").notNull(),
  commercialUse: integer("commercial_use", { mode: "boolean" }).notNull(), editorialOnly: integer("editorial_only", { mode: "boolean" }).notNull(), contentIdState: text("content_id_state").notNull().default("NOT_EVALUATED"),
  aiDisclosureState: text("ai_disclosure_state").notNull().default("NOT_EVALUATED"), advertiserFriendlyState: text("advertiser_friendly_state").notNull().default("NOT_EVALUATED"), reusedContentState: text("reused_content_state").notNull().default("NOT_EVALUATED"),
  evidenceHash: text("evidence_hash"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), sealedAt: text("sealed_at"),
}, (table) => [uniqueIndex("v7_rights_compliance_queue_version_uq").on(table.queueId, table.version), index("v7_rights_compliance_state_idx").on(table.queueId, table.lifecycleState)]);

export const v7AnimaticContracts = sqliteTable("v7_animatic_contracts", {
  id: text("id").primaryKey(), queueId: text("queue_id").notNull(), version: integer("version").notNull(), lifecycleState: text("lifecycle_state").notNull().default("DRAFT"),
  packagingPromiseHash: text("packaging_promise_hash").notNull(), predictionHash: text("prediction_hash").notNull(), shotCueProgramHash: text("shot_cue_program_hash").notNull(), draftAudioHash: text("draft_audio_hash").notNull(),
  durationSeconds: real("duration_seconds").notNull(), timedFramesJson: text("timed_frames_json").notNull(), promiseToContentState: text("promise_to_content_state").notNull().default("NOT_EVALUATED"),
  storyRetentionState: text("story_retention_state").notNull().default("NOT_EVALUATED"), evidenceHash: text("evidence_hash"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), sealedAt: text("sealed_at"),
}, (table) => [uniqueIndex("v7_animatic_queue_version_uq").on(table.queueId, table.version), index("v7_animatic_state_idx").on(table.queueId, table.lifecycleState)]);

export const v7MasterDeliveryContracts = sqliteTable("v7_master_delivery_contracts", {
  id: text("id").primaryKey(), queueId: text("queue_id").notNull(), version: integer("version").notNull(), lifecycleState: text("lifecycle_state").notNull().default("DRAFT"),
  archivalCodec: text("archival_codec").notNull(), archivalContainer: text("archival_container").notNull(), archivalAudioCodec: text("archival_audio_codec").notNull(), archivalSampleRate: integer("archival_sample_rate").notNull(),
  archivalFileHash: text("archival_file_hash"), archivalStreamHash: text("archival_stream_hash"), distributionCodec: text("distribution_codec").notNull(), distributionContainer: text("distribution_container").notNull(),
  distributionFileHash: text("distribution_file_hash"), distributionStreamHash: text("distribution_stream_hash"), derivedFromArchivalHash: text("derived_from_archival_hash"),
  r2ReconciliationState: text("r2_reconciliation_state").notNull().default("NOT_EVALUATED"), driveReconciliationState: text("drive_reconciliation_state").notNull().default("NOT_EVALUATED"), rightsManifestHash: text("rights_manifest_hash").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), sealedAt: text("sealed_at"),
}, (table) => [uniqueIndex("v7_master_delivery_queue_version_uq").on(table.queueId, table.version), index("v7_master_delivery_state_idx").on(table.queueId, table.lifecycleState)]);

export const v7EvaluationFoundationRegistry = sqliteTable("v7_evaluation_foundation_registry", {
  id: text("id").primaryKey(), componentKey: text("component_key").notNull(), foundationVersion: text("foundation_version").notNull(), purpose: text("purpose").notNull(),
  exitEvidenceJson: text("exit_evidence_json").notNull(), lifecycleState: text("lifecycle_state").notNull().default("SCHEMA_DEFINED"), providerRequests: integer("provider_requests").notNull().default(0),
  spendUsd: real("spend_usd").notNull().default(0), active: integer("active", { mode: "boolean" }).notNull().default(true), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("v7_evaluation_registry_key_version_uq").on(table.componentKey, table.foundationVersion)]);

export const v7EvaluationCorpusSources = sqliteTable("v7_evaluation_corpus_sources", {
  id: text("id").primaryKey(), sourceFamily: text("source_family").notNull(), sourceTable: text("source_table").notNull(), candidateKind: text("candidate_kind").notNull(),
  authorityState: text("authority_state").notNull().default("CANDIDATE_EVIDENCE_ONLY"), inclusionRuleJson: text("inclusion_rule_json").notNull(), verificationRequirementsJson: text("verification_requirements_json").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("v7_evaluation_corpus_source_uq").on(table.sourceFamily, table.sourceTable)]);

export const v7EvaluationCandidates = sqliteTable("v7_evaluation_candidates", {
  id: text("id").primaryKey(), channelId: text("channel_id").notNull(), sourceFamily: text("source_family").notNull(), sourceTable: text("source_table").notNull(), sourceId: text("source_id").notNull(),
  sourceParentId: text("source_parent_id"), candidateKind: text("candidate_kind").notNull(), artifactType: text("artifact_type").notNull(), lifecycleState: text("lifecycle_state").notNull().default("CANDIDATE_EVIDENCE"),
  storageKey: text("storage_key"), mimeType: text("mime_type"), byteSize: integer("byte_size"), contentHash: text("content_hash"), bytesState: text("bytes_state").notNull().default("NOT_VERIFIED"),
  checksumState: text("checksum_state").notNull().default("DECLARED_UNVERIFIED"), provenanceState: text("provenance_state").notNull().default("DECLARED_UNVERIFIED"), ownerDecisionState: text("owner_decision_state").notNull().default("NOT_VERIFIED"),
  defectLabelState: text("defect_label_state").notNull().default("NOT_LABELLED"), rightsDeclaredState: text("rights_declared_state").notNull().default("UNKNOWN"), rightsVerificationState: text("rights_verification_state").notNull().default("NOT_VERIFIED"),
  correlationGroup: text("correlation_group").notNull(), dedupHash: text("dedup_hash"), exclusionReason: text("exclusion_reason"), releaseEligible: integer("release_eligible", { mode: "boolean" }).notNull().default(false),
  qualificationEligible: integer("qualification_eligible", { mode: "boolean" }).notNull().default(false), providerRequests: integer("provider_requests").notNull().default(0), spendUsd: real("spend_usd").notNull().default(0),
  verificationState: text("verification_state").notNull().default("PENDING"), latestVerificationReceiptId: text("latest_verification_receipt_id"), verificationAttemptedAt: text("verification_attempted_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), verifiedAt: text("verified_at"),
}, (table) => [
  uniqueIndex("v7_evaluation_candidate_source_uq").on(table.sourceTable, table.sourceId),
  index("v7_evaluation_candidate_channel_state_idx").on(table.channelId, table.lifecycleState, table.candidateKind),
  index("v7_evaluation_candidate_dedup_idx").on(table.dedupHash, table.correlationGroup),
  index("v7_evaluation_candidate_verification_idx").on(table.channelId, table.verificationState, table.id),
]);

export const v7EvaluationVerificationRuns = sqliteTable("v7_evaluation_verification_runs", {
  id: text("id").primaryKey(), channelId: text("channel_id").notNull(), foundationVersion: text("foundation_version").notNull(), policyVersion: text("policy_version").notNull(), lifecycleState: text("lifecycle_state").notNull().default("PLANNED"),
  idempotencyKey: text("idempotency_key").notNull(), intentHash: text("intent_hash").notNull(), candidateIdsJson: text("candidate_ids_json").notNull(), maximumCandidates: integer("maximum_candidates").notNull(), maximumObjectBytes: integer("maximum_object_bytes").notNull(),
  plannedCandidates: integer("planned_candidates").notNull(), processedCandidates: integer("processed_candidates").notNull().default(0), byteVerifiedCandidates: integer("byte_verified_candidates").notNull().default(0), checksumPassCandidates: integer("checksum_pass_candidates").notNull().default(0),
  provenancePassCandidates: integer("provenance_pass_candidates").notNull().default(0), rightsPassCandidates: integer("rights_pass_candidates").notNull().default(0), blockedCandidates: integer("blocked_candidates").notNull().default(0), bytesRead: integer("bytes_read").notNull().default(0),
  providerRequests: integer("provider_requests").notNull().default(0), spendUsd: real("spend_usd").notNull().default(0), actor: text("actor").notNull(), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), completedAt: text("completed_at"),
}, (table) => [uniqueIndex("v7_evaluation_verification_run_idempotency_uq").on(table.channelId, table.idempotencyKey), index("v7_evaluation_verification_run_state_idx").on(table.channelId, table.lifecycleState, table.createdAt)]);

export const v7EvaluationVerificationReceipts = sqliteTable("v7_evaluation_verification_receipts", {
  id: text("id").primaryKey(), runId: text("run_id").notNull().references(() => v7EvaluationVerificationRuns.id), candidateId: text("candidate_id").notNull().references(() => v7EvaluationCandidates.id), sourceArtifactId: text("source_artifact_id").notNull(), storageKey: text("storage_key").notNull(),
  declaredHash: text("declared_hash"), computedHash: text("computed_hash"), declaredBytes: integer("declared_bytes"), actualBytes: integer("actual_bytes"), bytesState: text("bytes_state").notNull(), checksumState: text("checksum_state").notNull(), provenanceState: text("provenance_state").notNull(),
  rightsVerificationState: text("rights_verification_state").notNull(), rightsBasis: text("rights_basis").notNull(), objectMetadataJson: text("object_metadata_json").notNull(), reconciliationReasonsJson: text("reconciliation_reasons_json").notNull(), evidenceHash: text("evidence_hash").notNull(),
  providerRequests: integer("provider_requests").notNull().default(0), spendUsd: real("spend_usd").notNull().default(0), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("v7_evaluation_verification_receipt_run_candidate_uq").on(table.runId, table.candidateId), index("v7_evaluation_verification_receipt_candidate_idx").on(table.candidateId, table.createdAt)]);

export const v7EvaluationDefectTaxonomy = sqliteTable("v7_evaluation_defect_taxonomy", {
  id: text("id").primaryKey(), defectKey: text("defect_key").notNull(), label: text("label").notNull(), severity: text("severity").notNull(), modality: text("modality").notNull(), owningStage: text("owning_stage").notNull(),
  deterministicDetectable: integer("deterministic_detectable", { mode: "boolean" }).notNull().default(false), approvedRecallFloor: real("approved_recall_floor"), description: text("description").notNull(),
  lifecycleState: text("lifecycle_state").notNull().default("CALIBRATION_REQUIRED"), active: integer("active", { mode: "boolean" }).notNull().default(true), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("v7_evaluation_defect_key_uq").on(table.defectKey)]);

export const v7EvaluationDefectLabels = sqliteTable("v7_evaluation_defect_labels", {
  id: text("id").primaryKey(), candidateId: text("candidate_id").notNull().references(() => v7EvaluationCandidates.id), defectId: text("defect_id").notNull().references(() => v7EvaluationDefectTaxonomy.id),
  labelSource: text("label_source").notNull(), polarity: text("polarity").notNull(), confidence: real("confidence").notNull(), evidenceHash: text("evidence_hash").notNull(), actor: text("actor").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("v7_evaluation_defect_label_uq").on(table.candidateId, table.defectId, table.labelSource, table.evidenceHash)]);

export const v7EvaluationDatasets = sqliteTable("v7_evaluation_datasets", {
  id: text("id").primaryKey(), datasetKey: text("dataset_key").notNull(), datasetVersion: integer("dataset_version").notNull(), datasetType: text("dataset_type").notNull(), candidateKind: text("candidate_kind").notNull(),
  lifecycleState: text("lifecycle_state").notNull().default("DRAFT"), blinded: integer("blinded", { mode: "boolean" }).notNull().default(true), independencePolicyJson: text("independence_policy_json").notNull(), manifestHash: text("manifest_hash"),
  providerRequests: integer("provider_requests").notNull().default(0), spendUsd: real("spend_usd").notNull().default(0), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), sealedAt: text("sealed_at"),
}, (table) => [uniqueIndex("v7_evaluation_dataset_key_version_uq").on(table.datasetKey, table.datasetVersion)]);

export const v7EvaluationDatasetItems = sqliteTable("v7_evaluation_dataset_items", {
  id: text("id").primaryKey(), datasetId: text("dataset_id").notNull().references(() => v7EvaluationDatasets.id), candidateId: text("candidate_id").notNull().references(() => v7EvaluationCandidates.id),
  split: text("split").notNull(), role: text("role").notNull(), correlationGroup: text("correlation_group").notNull(), itemHash: text("item_hash").notNull(), countEligible: integer("count_eligible", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("v7_evaluation_dataset_item_uq").on(table.datasetId, table.candidateId), index("v7_evaluation_dataset_correlation_idx").on(table.datasetId, table.correlationGroup, table.countEligible)]);

export const v7AssuranceQualificationRuns = sqliteTable("v7_assurance_qualification_runs", {
  id: text("id").primaryKey(), capabilityId: text("capability_id").notNull(), capabilityVersion: text("capability_version").notNull(), settingsHash: text("settings_hash").notNull(), datasetId: text("dataset_id").notNull().references(() => v7EvaluationDatasets.id),
  lifecycleState: text("lifecycle_state").notNull().default("PLANNED"), blinded: integer("blinded", { mode: "boolean" }).notNull().default(true), repeatCount: integer("repeat_count").notNull().default(3), samplingPolicyJson: text("sampling_policy_json").notNull(),
  maximumProviderRequests: integer("maximum_provider_requests").notNull().default(0), maximumSpendUsd: real("maximum_spend_usd").notNull().default(0), actualProviderRequests: integer("actual_provider_requests").notNull().default(0), actualSpendUsd: real("actual_spend_usd").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), completedAt: text("completed_at"),
}, (table) => [uniqueIndex("v7_assurance_qualification_run_uq").on(table.capabilityId, table.capabilityVersion, table.settingsHash, table.datasetId)]);

export const v7AssuranceQualificationResults = sqliteTable("v7_assurance_qualification_results", {
  id: text("id").primaryKey(), runId: text("run_id").notNull().references(() => v7AssuranceQualificationRuns.id), defectId: text("defect_id").notNull().references(() => v7EvaluationDefectTaxonomy.id),
  sampleSize: integer("sample_size").notNull(), precision: real("precision"), recall: real("recall"), repeatability: real("repeatability"), p0EscapeCount: integer("p0_escape_count").notNull().default(0),
  costPerEvaluatedItemUsd: real("cost_per_evaluated_item_usd"), lifecycleState: text("lifecycle_state").notNull().default("NOT_EVALUATED"), evidenceHash: text("evidence_hash"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("v7_assurance_qualification_result_uq").on(table.runId, table.defectId)]);

export const v7EvaluationInventorySnapshots = sqliteTable("v7_evaluation_inventory_snapshots", {
  id: text("id").primaryKey(), channelId: text("channel_id").notNull(), foundationVersion: text("foundation_version").notNull(), candidateArtifacts: integer("candidate_artifacts").notNull(), rejectedPackages: integer("rejected_packages").notNull(),
  verifiedFixtures: integer("verified_fixtures").notNull().default(0), goldEligible: integer("gold_eligible").notNull().default(0), duplicateHashGroups: integer("duplicate_hash_groups").notNull().default(0),
  providerRequests: integer("provider_requests").notNull().default(0), spendUsd: real("spend_usd").notNull().default(0), evidenceJson: text("evidence_json").notNull(), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("v7_evaluation_inventory_channel_version_uq").on(table.channelId, table.foundationVersion)]);
