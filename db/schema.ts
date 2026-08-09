import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
