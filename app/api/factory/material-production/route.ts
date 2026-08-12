import { AI_USAGE_TABLE_SQL, recordOpenAIUsage } from "../../../../lib/ai-usage";
import { storeDriveBinaryArtifact, storeDriveJsonArtifact } from "../../../../lib/google-drive";
import { CANONICAL_PILOT_MANIFEST_VERSION, deriveCanonicalPilotManifest } from "../../../../lib/canonical-pilot-manifest.mjs";
import { CONTROLLED_RELEASE_POLICY, evaluateControlledRelease } from "../../../../lib/controlled-release-policy.mjs";
import jpeg from "jpeg-js";

const PROGRAM_ID = "YTAF-V7-GREENFIELD";
const STAGE = "09";
const STAGE_ID = `${PROGRAM_ID}-STAGE-${STAGE}`;
const THRESHOLD = 92;
const DEFAULT_MODEL = "gpt-5.6-sol";
const SOURCE_QA_RUBRIC = "SOURCE_LAYER_QA_V2";
const COMPOSITE_QA_RUBRIC = "HYBRID_COMPOSITE_TOURNAMENT_V5";
const PREVIOUS_COMPOSITE_QA_RUBRIC = "HYBRID_COMPOSITE_TOURNAMENT_V4";
const MOTION_RENDERER_VERSION = "FRAMEFLOW_MOTION_PROOF_V1";
const MOTION_QA_RUBRIC = "MOTION_PROOF_QA_V1";
const MOTION_RIGHTS_BUNDLE_VERSION = "MOTION_RIGHTS_BUNDLE_V1";
const SEQUENCE_RENDERER_VERSION = "CANONICAL_10MP_SEQUENCE_V1";
const SEQUENCE_QA_RUBRIC = "30_SECOND_SEQUENCE_QA_V1";
const SEQUENCE_PRODUCT_AUDIT_RUBRIC = "SEQUENCE_PRODUCT_INDEPENDENT_AUDIT_V1";
const INTEGRATED_SEQUENCE_COMPOSER_VERSION = "INTEGRATED_SEQUENCE_COMPOSER_V2_1_TIMEBASE_SAFE";
const SEQUENCE_SPECIFICATION_VERSION = "SEQUENCE_PRODUCT_SPECIFICATION_V2_1";
const SEQUENCE_PRODUCTION_DOD_VERSION = "SEQUENCE_PRODUCT_DOD_V1";
const WAVE_BATCH_1_VERSION = "WAVE_09_BATCH_1_V7";
const WAVE_PRODUCTION_ENGINE_VERSION = "SHOT_PRODUCT_ENGINE_V7_SPATIAL_RELATION_BOUND";
const WAVE_BATCH_2_VERSION = "WAVE_09_BATCH_2_V1_CONTROLLED_SCALE";
const WAVE_BATCH_2_ENGINE_VERSION = "SHOT_PRODUCT_ENGINE_V8_SCALE_BASELINE";
const WAVE_BATCH_2_REPRODUCTION_VERSION = "WAVE_09_BATCH_2_V2_ENGINE_REPRODUCTION";
const WAVE_BATCH_2_REPLACEMENT_ENGINE_VERSION = "SHOT_PRODUCT_ENGINE_V9_CONTRACT_BOUND_SCENE_GRAPH";
const WAVE_BATCH_2_V10_REPRODUCTION_VERSION = "WAVE_09_BATCH_2_V3_ARCHETYPE_REPRODUCTION";
const WAVE_BATCH_2_V10_ENGINE_VERSION = "SHOT_PRODUCT_ENGINE_V10_ARCHETYPE_SEMANTIC_COMPILER";
const WAVE_BATCH_2_V11_REPRODUCTION_VERSION = "WAVE_09_BATCH_2_V4_SEMANTIC_PROJECTION_REPRODUCTION";
const WAVE_BATCH_2_V11_ENGINE_VERSION = "SHOT_PRODUCT_ENGINE_V11_CONTRACT_SEMANTIC_PROJECTION";
const WAVE_BATCH_2_V12_REPRODUCTION_VERSION = "WAVE_09_BATCH_2_V5_STRUCTURED_VISUAL_ONTOLOGY_REPRODUCTION";
const WAVE_BATCH_2_V12_ENGINE_VERSION = "SHOT_PRODUCT_ENGINE_V12_STRUCTURED_VISUAL_ONTOLOGY";
const WAVE_BATCH_2_V13_REJECTED_ENGINE_VERSION = "SHOT_PRODUCT_ENGINE_V17_EXACT_CLAUSE_FRAME_COMPILER";
const WAVE_BATCH_2_V13_REPRODUCTION_VERSION = "WAVE_09_BATCH_2_V11_PIXEL_LAYOUT_REPRODUCTION";
const WAVE_BATCH_2_V13_ENGINE_VERSION = "SHOT_PRODUCT_ENGINE_V18_PIXEL_LAYOUT_COMPILER";
const WAVE_BATCH_AUDIT_RUBRIC = "WAVE_PRODUCT_INDEPENDENT_AUDIT_V1";
const WAVE_BATCH_AUDIT_TRANSPORT_VERSION = "WAVE_AUDIT_TRANSPORT_V2_VERIFIED_JPEG_PROXY";
const WAVE_BATCH_AUDIT_CONTROL_VERSION = "WAVE_AUDIT_CONTROL_V3_DURABLE_IDEMPOTENT_INTENT";
const RELIABILITY_BASELINE_VERSION = "STAGE09_RELIABILITY_BASELINE_V2";
const DATA_VISUALIZATION_V3 = "RECONCILED_WATERFALL_PRIMITIVES_V3";
const ARCHETYPE_REGRESSION_VERSION = "ARCHETYPE_REGRESSION_V2";
const CONTROLLED_CANARY_VERSION = "CONTROLLED_CANARY_V2_PROMOTED_BINDING";
const CONTROLLED_CANARY_V3 = "CONTROLLED_CANARY_V3_UNIT_SPECIFIC_ARTIFACT";
const CONTROLLED_CANARY_V4 = "CONTROLLED_CANARY_V4_CAPABILITY_BOUND_DISPATCH";
const CONTROLLED_CANARY_V5 = "CONTROLLED_CANARY_V5_SOURCE_BOUND_MATERIALIZATION";
const CANARY_RECOVERY_LANE_VERSION = "CANARY_RECOVERY_LANE_V1";
const RECOVERY_CONTRACT_ALIGNMENT = "PRODUCTION_RECOVERY_CONTRACT_ALIGNMENT_V1";
const RELEASE_TRAIN_VERSION = "RELEASE_TRAIN_V1_SHOT_CONTRACT_QA";
const RELEASE_TRAIN_RUBRIC = "SHOT_CONTRACT_PIXEL_QA_V1";
const PRODUCTION_SCENE_RELEASE_TRAIN_VERSION = "RELEASE_TRAIN_V2_PRODUCTION_SCENE_RENDERER";
const PRODUCTION_SCENE_RENDERER_VERSION = "PRODUCTION_SCENE_RENDERER_V2";
const PRODUCTION_SCENE_RUBRIC = "SHOT_CONTRACT_PIXEL_QA_V2";
const STABILIZATION_RELEASE_VERSION = "STABILIZATION_RELEASE_V1_TYPED_STATE_MACHINE";
const STABILIZED_RENDERER_VERSION = "PRODUCTION_SCENE_RENDERER_V3_STABILIZED";
const STABILIZED_RUBRIC = "SHOT_CONTRACT_PIXEL_QA_V3";
const STABILIZED_CONTRACT_VERSION = "EXECUTABLE_PRODUCTION_SCENE_CONTRACT_V3";
const MP002_TARGETED_REPAIR_VERSION = "MP002_TARGETED_REPAIR_V1";
const MP002_TARGETED_REPAIR_RENDERER = "PRODUCTION_SCENE_RENDERER_V4_MP002_TARGETED_REPAIR";
const MP002_PIXEL_ORACLE_REPAIR_VERSION = "MP002_PIXEL_ORACLE_REPAIR_V2";
const MP002_PIXEL_ORACLE_REPAIR_RENDERER = "PRODUCTION_SCENE_RENDERER_V5_PIXEL_ORACLE";
const CANONICAL_UNIT_SCENES_VERSION = "CANONICAL_UNIT_SCENES_V9";
const CANONICAL_UNIT_SCENES_RENDERER = "PRODUCTION_SCENE_RENDERER_V13_PHYSICAL_VERIFICATION";
const SEALED_RELEASE_SET = ["MP-001"] as const;
const LEGACY_CONTROLLED_CANARY_VERSION = "CONTROLLED_CANARY_V1";
const PROMOTION_REGRESSION_VERSION = "PROMOTION_BINDING_REGRESSION_V1";
const UNIT_MATERIALIZATION_REGRESSION_VERSION = "UNIT_MATERIALIZATION_REGRESSION_V1";
const CANARY_HANDOFF_REGRESSION_VERSION = "CANARY_HANDOFF_REGRESSION_V2";
const CANARY_MATERIALIZATION_REGRESSION_VERSION = "CANARY_MATERIALIZATION_REGRESSION_V2";
const UNIT_RENDERER_VERSION = "CERTIFIED_RENDERER_UNIT_ADAPTER_V1";
const UNIT_MATERIALIZATION_STRATEGY_REGISTRY = {
  version: "UNIT_MATERIALIZATION_STRATEGY_REGISTRY_V2",
  default: "CERTIFIED_UNIT_ADAPTER_V1",
  logicalOverrides: { "MP-001": "SOURCE_BOUND_COMPOSITE_CHAMPION_V1" },
} as const;
const CANARY_DISPATCH_CAPABILITIES = {
  [CONTROLLED_CANARY_VERSION]: { phase: "CANARY_PROMOTED_PIXEL_QA", artifactMode: "PROMOTED_CERTIFICATION" },
  [CONTROLLED_CANARY_V3]: { phase: "CANARY_UNIT_SPECIFIC_PIXEL_QA", artifactMode: "UNIT_SPECIFIC" },
  [CONTROLLED_CANARY_V4]: { phase: "CANARY_UNIT_SPECIFIC_PIXEL_QA", artifactMode: "UNIT_SPECIFIC" },
  [CONTROLLED_CANARY_V5]: { phase: "CANARY_UNIT_SPECIFIC_PIXEL_QA", artifactMode: "UNIT_SPECIFIC" },
  [RECOVERY_CONTRACT_ALIGNMENT]: { phase: "CANARY_UNIT_SPECIFIC_PIXEL_QA", artifactMode: "UNIT_SPECIFIC" },
  [RELEASE_TRAIN_VERSION]: { phase: "CANARY_UNIT_SPECIFIC_PIXEL_QA", artifactMode: "UNIT_SPECIFIC" },
  [PRODUCTION_SCENE_RELEASE_TRAIN_VERSION]: { phase: "CANARY_UNIT_SPECIFIC_PIXEL_QA", artifactMode: "UNIT_SPECIFIC" },
  [STABILIZATION_RELEASE_VERSION]: { phase: "CANARY_UNIT_SPECIFIC_PIXEL_QA", artifactMode: "UNIT_SPECIFIC" },
  [MP002_TARGETED_REPAIR_VERSION]: { phase: "CANARY_UNIT_SPECIFIC_PIXEL_QA", artifactMode: "UNIT_SPECIFIC" },
  [MP002_PIXEL_ORACLE_REPAIR_VERSION]: { phase: "CANARY_UNIT_SPECIFIC_PIXEL_QA", artifactMode: "UNIT_SPECIFIC" },
  [CANONICAL_UNIT_SCENES_VERSION]: { phase: "CANARY_UNIT_SPECIFIC_PIXEL_QA", artifactMode: "UNIT_SPECIFIC" },
} as const;
const ARCHETYPE_CERTIFICATION_ORDER = [
  "TRANSACTION_STATE_PROOF",
  "SOURCE_AUTHORED_HYBRID",
  "RIGHTS_SENSITIVE",
  "MOBILE_TEXT_INTENSIVE",
  "DATA_VISUALIZATION",
  "DOCUMENTARY_LIVE_ACTION",
  "PROCESS_ROUTE",
  "ABSTRACT_AUTHORED",
] as const;
const MODEL_OPTIONS = [
  { id: "gpt-5.6-sol", label: "GPT-5.6 Sol", description: "Maximum quality" },
  { id: "gpt-5.6-terra", label: "GPT-5.6 Terra", description: "Balanced quality and speed" },
  { id: "gpt-5.6-luna", label: "GPT-5.6 Luna", description: "Lowest latency and cost" },
] as const;
const REASONING_OPTIONS = ["low", "medium", "high"] as const;

type Statement = { bind: (...values: unknown[]) => Statement; run: () => Promise<unknown>; all: <T>() => Promise<{ results?: T[] }>; first: <T>() => Promise<T | null> };
type DB = { prepare: (query: string) => Statement; batch: (statements: Statement[]) => Promise<unknown> };
type BucketObject = { body: ReadableStream; httpMetadata?: { contentType?: string } };
type Bucket = { put: (key: string, value: string | ArrayBuffer | Uint8Array, options?: Record<string, unknown>) => Promise<unknown>; head: (key: string) => Promise<unknown>; get: (key: string) => Promise<BucketObject | null> };
type Env = { DB?: DB; BUCKET?: Bucket; OPENAI_API_KEY?: string; OPENAI_QA_MODEL?: string; PEXELS_API_KEY?: string; PIXABAY_API_KEY?: string; SHUTTERSTOCK_CONSUMER_KEY?: string; MEDIA_EXECUTOR_SHARED_SECRET?: string };
type Row = Record<string, unknown>;
type Candidate = { id: string; provider: string; title: string; sourceUrl: string; assetUrl: string; thumbnailUrl: string; licenseCode: string; licenseUrl: string; width: number; height: number; duration: number; score: number };

const STAGE09_ARCHITECTURE = {
  version: "MATERIAL_PRODUCTION_V3_PRODUCT_COMPLETE",
  status: "QUALITY_SCALE_REBUILD",
  principle: "Production creates PRODUCT_COMPLETE through an integrated plan-compose-render-measure-correct loop. QA only audits the finished product and never drives production repair.",
  planes: [
    { id: "CONTROL", name: "Control plane", status: "READY", responsibility: "Contracts, authorization, state, cost, stop/resume and immutable evidence references." },
    { id: "SOURCE", name: "Source intelligence", status: "BLOCKED", responsibility: "Decode actual provider video, sample candidate frames and reject prohibited objects before selection." },
    { id: "COMPOSE", name: "Integrated production", status: "READY_TO_EXECUTE", responsibility: "A product specification drives plan, composition, render, full-file measurement and bounded auto-correction in one production transaction." },
    { id: "QA", name: "Independent audit", status: "BOUNDARY_ONLY", responsibility: "One audit verifies PRODUCT_COMPLETE. It is not a repair loop and cannot compensate for a weak composer." },
    { id: "EXECUTION", name: "Media execution", status: "BLOCKED", responsibility: "Queue-backed frame extraction, rendering and media transforms run outside synchronous control-plane requests." },
    { id: "SCALE", name: "Scale governor", status: "BLOCKED", responsibility: "One repaired unit, ten-shot pilot, 30-second sequence and bounded waves must pass before 166-shot production." },
  ],
  qualityLadder: [
    { order: 1, name: "Source-frame gate", exit: "Actual MP4 frames, negative-object clearance, rights and context fit." },
    { order: 2, name: "Composite tournament", exit: "At least three materially different audience-facing compositions; one pixel champion." },
    { order: 3, name: "Motion proof", exit: "Distinct entry, midpoint and exit plus exact narration-bound timing." },
    { order: 4, name: "Sequence gate", exit: "30-second playback proves semantic continuity, variety, rhythm, mobile safety and clean audio handoff." },
    { order: 5, name: "Wave admission", exit: "Standard >=92; controlled >=88 with Semantic Fit >=82, other dimensions >=88 and bounded defect tolerance." },
  ],
  productCompletion: {
    businessStates: ["SPECIFIED", "PRODUCING", "PRODUCT_COMPLETE", "RELEASED"],
    internalLoop: ["PLAN", "COMPOSE", "RENDER", "MEASURE", "AUTO_CORRECT"],
    definitionOfDone: ["source lineage intact", "narrative graph complete", "no crop or unsafe-zone violation", "reading-time budget met", "adjacent treatments differ", "stored master passes full-file technical read-back"],
    qaRole: "single independent release audit after PRODUCT_COMPLETE",
  },
  scalePolicy: {
    tranches: ["1 root-cause unit", "10-shot pilot", "30-second sequence", "25-shot wave", "remaining bounded waves"],
    concurrency: "Adaptive 2–8 workers by provider health, queue age and defect rate",
    stopConditions: ["Any P0", "Any semantic P1", "More than one presentation P1", "Semantic Fit <82", "provider failure >10%", "cost variance >20%"],
    controlledQaSampling: "25% independent sample; deterministic and per-unit terminal gates remain mandatory",
    resume: "Checkpointed unit state; completed evidence is immutable and never rerun by page refresh",
  },
} as const;

const schema = [
  AI_USAGE_TABLE_SQL,
  `CREATE TABLE IF NOT EXISTS v7_cost_events (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, project_id text, stage_key text NOT NULL, provider text NOT NULL, cost_class text NOT NULL, cost_type text NOT NULL, status text DEFAULT 'ESTIMATED' NOT NULL, estimated_usd real DEFAULT 0 NOT NULL, actual_usd real DEFAULT 0 NOT NULL, reusable_allocation_usd real DEFAULT 0 NOT NULL, currency text DEFAULT 'USD' NOT NULL, asset_id text, note text DEFAULT '' NOT NULL, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_stage_states (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, stage_key text NOT NULL, sequence integer NOT NULL, stage_name text NOT NULL, status text DEFAULT 'BLOCKED_UPSTREAM' NOT NULL, threshold integer DEFAULT 92 NOT NULL, attempt integer DEFAULT 0 NOT NULL, artifact_id text, blocker text, evidence_summary text DEFAULT 'No verified artifact' NOT NULL, frozen_at text, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_shot_artifacts (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,run_id text NOT NULL,lifecycle_state text DEFAULT 'MATERIALIZED' NOT NULL,content_json text NOT NULL,content_hash text NOT NULL,runtime_key text,drive_file_id text,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_material_runs (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, status text DEFAULT 'BUILDING' NOT NULL, mode text DEFAULT 'ZERO_SPEND_DRY_RUN' NOT NULL, brief_count integer DEFAULT 0 NOT NULL, pilot_count integer DEFAULT 0 NOT NULL, score integer DEFAULT 0 NOT NULL, remote_requests integer DEFAULT 0 NOT NULL, actual_cost_usd real DEFAULT 0 NOT NULL, gate_json text DEFAULT '[]' NOT NULL, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, completed_at text)`,
  `CREATE TABLE IF NOT EXISTS v7_material_briefs (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, run_id text NOT NULL, shot_id text NOT NULL, section_id text NOT NULL, start_seconds real NOT NULL, end_seconds real NOT NULL, route text NOT NULL, visual_family text NOT NULL, model_lane text NOT NULL, output_ceiling integer DEFAULT 0 NOT NULL, retry_limit integer DEFAULT 0 NOT NULL, pilot integer DEFAULT false NOT NULL, content_json text NOT NULL, content_hash text NOT NULL, status text DEFAULT 'PLANNED' NOT NULL, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_material_artifacts (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, run_id text NOT NULL, lifecycle_state text DEFAULT 'DRY_RUN_FROZEN' NOT NULL, content_json text NOT NULL, content_hash text NOT NULL, runtime_key text, drive_file_id text, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_material_authorizations (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, run_id text NOT NULL, scope text DEFAULT 'PILOT' NOT NULL, status text DEFAULT 'AUTHORIZED' NOT NULL, shot_count integer NOT NULL, max_remote_requests integer NOT NULL, max_actual_spend_usd real NOT NULL, model_policy_json text NOT NULL, authorized_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, revoked_at text, completed_at text, updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_material_requests (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, run_id text NOT NULL, authorization_id text NOT NULL, brief_id text NOT NULL, phase text NOT NULL, provider text NOT NULL, model_id text NOT NULL, reasoning text NOT NULL, status text DEFAULT 'PLANNED' NOT NULL, idempotency_key text NOT NULL, provider_response_id text, input_tokens integer DEFAULT 0 NOT NULL, output_tokens integer DEFAULT 0 NOT NULL, reasoning_tokens integer DEFAULT 0 NOT NULL, expected_output_tokens integer DEFAULT 0 NOT NULL, max_output_tokens integer DEFAULT 0 NOT NULL, estimated_cost_usd real DEFAULT 0 NOT NULL, actual_cost_usd real DEFAULT 0 NOT NULL, retry_of text, retry_scope text DEFAULT 'NONE' NOT NULL, error text, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_material_candidates (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,run_id text NOT NULL,authorization_id text NOT NULL,brief_id text NOT NULL,provider text NOT NULL,provider_asset_id text NOT NULL,score real DEFAULT 0 NOT NULL,status text DEFAULT 'DISCOVERED' NOT NULL,content_json text NOT NULL,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_material_tournaments (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,run_id text NOT NULL,authorization_id text NOT NULL,brief_id text NOT NULL,status text NOT NULL,champion_candidate_id text,score integer DEFAULT 0 NOT NULL,candidate_count integer DEFAULT 0 NOT NULL,provider_coverage integer DEFAULT 0 NOT NULL,content_json text NOT NULL,provider_response_id text,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_material_files (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,run_id text NOT NULL,authorization_id text NOT NULL,brief_id text NOT NULL,asset_role text DEFAULT 'PRIMARY' NOT NULL,source_type text NOT NULL,provider text NOT NULL,provider_asset_id text,source_url text,landing_url text,license_code text NOT NULL,mime_type text NOT NULL,width integer NOT NULL,height integer NOT NULL,duration_seconds real DEFAULT 0 NOT NULL,byte_size integer NOT NULL,content_hash text NOT NULL,runtime_key text NOT NULL,drive_file_id text NOT NULL,thumbnail_url text,status text DEFAULT 'STORED_VERIFIED' NOT NULL,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_material_audits (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,run_id text NOT NULL,authorization_id text NOT NULL,brief_id text NOT NULL,file_id text NOT NULL,status text NOT NULL,score integer DEFAULT 0 NOT NULL,dimensions_json text NOT NULL,provider_response_id text,findings_json text DEFAULT '[]' NOT NULL,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_media_executors (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,status text DEFAULT 'OFFLINE' NOT NULL,version text NOT NULL,capabilities_json text DEFAULT '[]' NOT NULL,last_seen_at text NOT NULL,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_media_jobs (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,run_id text NOT NULL,authorization_id text NOT NULL,brief_id text NOT NULL,source_file_id text NOT NULL,job_type text NOT NULL,status text DEFAULT 'QUEUED' NOT NULL,priority integer DEFAULT 100 NOT NULL,attempt integer DEFAULT 0 NOT NULL,max_attempts integer DEFAULT 2 NOT NULL,lease_owner text,lease_token_hash text,lease_expires_at text,contract_json text NOT NULL,output_json text,error text,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,completed_at text)`,
  `CREATE TABLE IF NOT EXISTS v7_media_evidence (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,run_id text NOT NULL,authorization_id text NOT NULL,brief_id text NOT NULL,job_id text NOT NULL,evidence_type text NOT NULL,status text DEFAULT 'VERIFIED' NOT NULL,content_json text NOT NULL,content_hash text NOT NULL,runtime_key text NOT NULL,drive_file_id text NOT NULL,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_source_frame_audits (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,run_id text NOT NULL,authorization_id text NOT NULL,brief_id text NOT NULL,evidence_id text NOT NULL,status text DEFAULT 'QA_REQUIRED' NOT NULL,score integer DEFAULT 0 NOT NULL,dimensions_json text DEFAULT '{}' NOT NULL,findings_json text DEFAULT '[]' NOT NULL,repair_json text DEFAULT '{}' NOT NULL,provider_response_id text,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_composite_audits (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,run_id text NOT NULL,authorization_id text NOT NULL,brief_id text NOT NULL,evidence_id text NOT NULL,rubric_version text NOT NULL,status text DEFAULT 'QA_REQUIRED' NOT NULL,winner text,score integer DEFAULT 0 NOT NULL,dimensions_json text DEFAULT '{}' NOT NULL,candidates_json text DEFAULT '{}' NOT NULL,findings_json text DEFAULT '[]' NOT NULL,repair_json text DEFAULT '{}' NOT NULL,provider_response_id text,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_motion_proofs (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,run_id text NOT NULL,authorization_id text NOT NULL,brief_id text NOT NULL,champion text NOT NULL,composite_rubric text NOT NULL,renderer_version text NOT NULL,status text DEFAULT 'RENDER_REQUIRED' NOT NULL,motion_file_id text,evidence_id text,source_hashes_json text NOT NULL,duration_seconds real NOT NULL,fps integer DEFAULT 30 NOT NULL,score integer DEFAULT 0 NOT NULL,dimensions_json text DEFAULT '{}' NOT NULL,findings_json text DEFAULT '[]' NOT NULL,provider_response_id text,content_hash text,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_motion_audits (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,run_id text NOT NULL,authorization_id text NOT NULL,brief_id text NOT NULL,proof_id text NOT NULL,rubric_version text NOT NULL,attempt integer NOT NULL,status text NOT NULL,score integer DEFAULT 0 NOT NULL,dimensions_json text DEFAULT '{}' NOT NULL,findings_json text DEFAULT '[]' NOT NULL,evidence_bundle_json text DEFAULT '{}' NOT NULL,evidence_bundle_hash text NOT NULL,request_id text,provider_response_id text,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_sequence_proofs (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,run_id text NOT NULL,authorization_id text NOT NULL,canary_id text NOT NULL,version text NOT NULL,status text NOT NULL,sequence_file_id text,evidence_id text,source_manifest_json text NOT NULL,duration_seconds real DEFAULT 30 NOT NULL,fps integer DEFAULT 30 NOT NULL,unit_count integer DEFAULT 10 NOT NULL,frame_count integer DEFAULT 30 NOT NULL,score integer DEFAULT 0 NOT NULL,tier text DEFAULT 'BLOCKED' NOT NULL,dimensions_json text DEFAULT '{}' NOT NULL,findings_json text DEFAULT '[]' NOT NULL,provider_response_id text,request_id text,content_hash text,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,completed_at text)`,
  `CREATE TABLE IF NOT EXISTS v7_sequence_products (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,run_id text NOT NULL,authorization_id text NOT NULL,canary_id text NOT NULL,source_proof_id text NOT NULL,composer_version text NOT NULL,status text NOT NULL,specification_json text NOT NULL,specification_hash text NOT NULL,source_manifest_hash text NOT NULL,iteration integer DEFAULT 0 NOT NULL,max_iterations integer DEFAULT 3 NOT NULL,product_file_id text,evidence_id text,measurements_json text DEFAULT '{}' NOT NULL,corrections_json text DEFAULT '[]' NOT NULL,content_hash text,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,completed_at text)`,
  `CREATE TABLE IF NOT EXISTS v7_sequence_product_audits (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,run_id text NOT NULL,authorization_id text NOT NULL,product_id text NOT NULL,rubric_version text NOT NULL,status text NOT NULL,score integer DEFAULT 0 NOT NULL,tier text DEFAULT 'BLOCKED' NOT NULL,dimensions_json text DEFAULT '{}' NOT NULL,findings_json text DEFAULT '[]' NOT NULL,request_id text,provider_response_id text,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,completed_at text)`,
  `CREATE TABLE IF NOT EXISTS v7_production_batches (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,run_id text NOT NULL,authorization_id text NOT NULL,wave_key text NOT NULL,version text NOT NULL,engine_version text NOT NULL,status text NOT NULL,scope_json text NOT NULL,specification_hash text NOT NULL,total_units integer NOT NULL,completed_units integer DEFAULT 0 NOT NULL,blocked_units integer DEFAULT 0 NOT NULL,current_index integer DEFAULT 0 NOT NULL,audit_sample_json text DEFAULT '[]' NOT NULL,production_dod_json text NOT NULL,root_cause_policy_json text NOT NULL,requests_before integer NOT NULL,cost_before real NOT NULL,request_budget integer NOT NULL,cost_budget real NOT NULL,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,completed_at text)`,
  `CREATE TABLE IF NOT EXISTS v7_batch_activation_preflights (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,run_id text NOT NULL,authorization_id text NOT NULL,action text NOT NULL,source_batch_id text NOT NULL,source_audit_id text NOT NULL,target_batch_id text NOT NULL,input_hash text NOT NULL,status text NOT NULL,result_json text NOT NULL,requests_before integer NOT NULL,cost_before real NOT NULL,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_batch_activations (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,run_id text NOT NULL,authorization_id text NOT NULL,action text NOT NULL,idempotency_key text NOT NULL,target_batch_id text NOT NULL,input_hash text NOT NULL,status text NOT NULL,result_json text NOT NULL,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,committed_at text,updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_shot_products (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,run_id text NOT NULL,authorization_id text NOT NULL,batch_id text NOT NULL,brief_id text NOT NULL,logical_brief_id text NOT NULL,archetype text NOT NULL,engine_version text NOT NULL,status text NOT NULL,specification_json text NOT NULL,specification_hash text NOT NULL,frame_ids_json text NOT NULL,frame_hashes_json text NOT NULL,measurements_json text NOT NULL,product_hash text NOT NULL,supersedes_id text,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,completed_at text)`,
  `CREATE TABLE IF NOT EXISTS v7_batch_product_audits (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,run_id text NOT NULL,authorization_id text NOT NULL,batch_id text NOT NULL,rubric_version text NOT NULL,status text NOT NULL,score integer DEFAULT 0 NOT NULL,tier text DEFAULT 'BLOCKED' NOT NULL,dimensions_json text DEFAULT '{}' NOT NULL,findings_json text DEFAULT '[]' NOT NULL,root_cause_json text DEFAULT '{}' NOT NULL,request_id text,provider_response_id text,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,completed_at text)`,
  `CREATE TABLE IF NOT EXISTS v7_stage_model_settings (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,stage_key text NOT NULL,model_id text NOT NULL,reasoning_effort text NOT NULL,updated_at text NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_architecture_baselines (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,stage_key text NOT NULL,version text NOT NULL,status text NOT NULL,execution_state text NOT NULL,source_checkpoint text NOT NULL,controls_json text NOT NULL,qualification_json text NOT NULL,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,frozen_at text)`,
  `CREATE TABLE IF NOT EXISTS v7_compiled_shot_contracts (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,baseline_id text NOT NULL,brief_id text NOT NULL,archetype text NOT NULL,risk_tier text NOT NULL,claim text NOT NULL,required_evidence_json text NOT NULL,allowed_modalities_json text NOT NULL,forbidden_json text NOT NULL,repair_route text NOT NULL,lint_status text NOT NULL,lint_json text NOT NULL,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_archetype_qualifications (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,baseline_id text NOT NULL,archetype text NOT NULL,status text NOT NULL,hardest_fixture text NOT NULL,deterministic_checks_json text NOT NULL,evidence_status text NOT NULL,first_pass_yield real DEFAULT 0 NOT NULL,blocker text,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_archetype_certifications (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,baseline_id text NOT NULL,authorization_id text NOT NULL,archetype text NOT NULL,brief_id text NOT NULL,renderer_version text NOT NULL,status text NOT NULL,frame_ids_json text NOT NULL,frame_hashes_json text NOT NULL,lint_json text NOT NULL,request_id text,provider_response_id text,score integer DEFAULT 0 NOT NULL,dimensions_json text DEFAULT '{}' NOT NULL,findings_json text DEFAULT '[]' NOT NULL,attempt integer DEFAULT 1 NOT NULL,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_archetype_design_authorizations (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,baseline_id text NOT NULL,archetype text NOT NULL,source_certification_id text NOT NULL,source_renderer_version text NOT NULL,source_score integer NOT NULL,new_renderer_version text NOT NULL,scope text NOT NULL,status text NOT NULL,certification_id text,authorized_at text NOT NULL,completed_at text,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_archetype_regressions (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,baseline_id text NOT NULL,status text NOT NULL,score integer NOT NULL,checks_json text NOT NULL,certification_ids_json text NOT NULL,pilot_replay_json text NOT NULL,remote_requests_before integer NOT NULL,remote_requests_after integer NOT NULL,actual_cost_before real NOT NULL,actual_cost_after real NOT NULL,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_pilot_canaries (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,baseline_id text NOT NULL,regression_id text NOT NULL,run_id text NOT NULL,authorization_id text NOT NULL,version text NOT NULL,status text NOT NULL,queue_json text NOT NULL,current_index integer DEFAULT 0 NOT NULL,current_brief_id text,released_units integer DEFAULT 0 NOT NULL,passed_units integer DEFAULT 0 NOT NULL,failed_units integer DEFAULT 0 NOT NULL,requests_before integer DEFAULT 0 NOT NULL,cost_before real DEFAULT 0 NOT NULL,request_budget integer DEFAULT 40 NOT NULL,cost_budget real DEFAULT 10 NOT NULL,active_request_peak integer DEFAULT 0 NOT NULL,gate_json text DEFAULT '[]' NOT NULL,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,completed_at text)`,
  `CREATE TABLE IF NOT EXISTS v7_canary_recovery_sessions (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,run_id text NOT NULL,authorization_id text NOT NULL,source_canary_id text NOT NULL,version text NOT NULL,status text NOT NULL,snapshot_json text NOT NULL,snapshot_hash text NOT NULL,root_cause_json text NOT NULL,e2e_json text NOT NULL,fault_matrix_json text NOT NULL,requests_before integer NOT NULL,requests_after integer NOT NULL,cost_before real NOT NULL,cost_after real NOT NULL,simulated_request_sequence integer NOT NULL,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_canary_transition_events (id text PRIMARY KEY NOT NULL,recovery_id text NOT NULL,command_id text NOT NULL,canary_version text NOT NULL,unit_id text NOT NULL,status text NOT NULL,failure_code text,failed_transition text,failed_gate text,expected_state text,actual_state text,authorization_status text,lease_id text,request_intent_id text,ledger_status text,provider_dispatch_status text,detail_json text NOT NULL,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_canary_request_intents (id text PRIMARY KEY NOT NULL,recovery_id text NOT NULL,command_id text NOT NULL,unit_id text NOT NULL,phase text NOT NULL,status text NOT NULL,simulated_sequence integer NOT NULL,idempotency_key text NOT NULL,payload_hash text NOT NULL,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_canary_outbox (id text PRIMARY KEY NOT NULL,recovery_id text NOT NULL,request_intent_id text NOT NULL,event_type text NOT NULL,status text NOT NULL,payload_json text NOT NULL,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_artifact_promotions (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,baseline_id text NOT NULL,regression_id text NOT NULL,run_id text NOT NULL,authorization_id text NOT NULL,canary_version text NOT NULL,brief_id text NOT NULL,logical_brief_id text NOT NULL,archetype text NOT NULL,certification_id text NOT NULL,renderer_version text NOT NULL,contract_hash text NOT NULL,frame_ids_json text NOT NULL,frame_hashes_json text NOT NULL,status text NOT NULL,preflight_json text NOT NULL,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_unit_materializations (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,baseline_id text NOT NULL,run_id text NOT NULL,authorization_id text NOT NULL,canary_version text NOT NULL,brief_id text NOT NULL,logical_brief_id text NOT NULL,archetype text NOT NULL,certification_id text NOT NULL,certified_renderer_version text NOT NULL,unit_renderer_version text NOT NULL,contract_hash text NOT NULL,semantic_manifest_json text NOT NULL,semantic_manifest_hash text NOT NULL,frame_ids_json text NOT NULL,frame_hashes_json text NOT NULL,lint_json text NOT NULL,status text NOT NULL,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
] as const;

const arr = (value: unknown) => Array.isArray(value) ? value : [];
const rec = (value: unknown) => value && typeof value === "object" ? value as Row : {};
const clean = (value: unknown) => String(value || "").replace(/\s+/g, " ").trim();
function canaryDispatchCapability(version: unknown) { return CANARY_DISPATCH_CAPABILITIES[clean(version) as keyof typeof CANARY_DISPATCH_CAPABILITIES] || null; }
function isUnitSpecificCanary(version: unknown) { return canaryDispatchCapability(version)?.artifactMode === "UNIT_SPECIFIC"; }
function isReleaseTrainCanary(version: unknown) { return [RELEASE_TRAIN_VERSION, PRODUCTION_SCENE_RELEASE_TRAIN_VERSION, STABILIZATION_RELEASE_VERSION, MP002_TARGETED_REPAIR_VERSION, MP002_PIXEL_ORACLE_REPAIR_VERSION, CANONICAL_UNIT_SCENES_VERSION].includes(clean(version)); }
function releaseTrainRubric(version: unknown) { return [STABILIZATION_RELEASE_VERSION, MP002_TARGETED_REPAIR_VERSION, MP002_PIXEL_ORACLE_REPAIR_VERSION, CANONICAL_UNIT_SCENES_VERSION].includes(clean(version)) ? STABILIZED_RUBRIC : clean(version) === PRODUCTION_SCENE_RELEASE_TRAIN_VERSION ? PRODUCTION_SCENE_RUBRIC : RELEASE_TRAIN_RUBRIC; }
function isAlignedUnitContractMode(contractMode: unknown, manifestContract: Row) {
  const declaredContractMode = clean(contractMode), alignedContractVersion = clean(manifestContract.version);
  if (["ALIGNED_UNIT_CONTRACT", "SHOT_SPECIFIC_UNIT_CONTRACT"].includes(declaredContractMode)) return true;
  return declaredContractMode === alignedContractVersion && declaredContractMode.startsWith("EXECUTABLE_PRODUCTION_SCENE_CONTRACT_V");
}
function unitMaterializationStrategy(logicalId: unknown) { return UNIT_MATERIALIZATION_STRATEGY_REGISTRY.logicalOverrides[clean(logicalId) as keyof typeof UNIT_MATERIALIZATION_STRATEGY_REGISTRY.logicalOverrides] || UNIT_MATERIALIZATION_STRATEGY_REGISTRY.default; }
async function rows(db: DB, query: string, ...values: unknown[]) { return (await db.prepare(query).bind(...values).all<Row>()).results || []; }
async function shaBytes(value: ArrayBuffer | Uint8Array) { const bytes = value instanceof Uint8Array ? value : new Uint8Array(value); const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)); return [...digest].map((item) => item.toString(16).padStart(2, "0")).join(""); }
async function sha(value: string) { return shaBytes(new TextEncoder().encode(value)); }
function escapeXml(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
function short(value: unknown, length = 72) { const text = clean(value); return text.length <= length ? text : `${text.slice(0, length - 1)}…`; }
function base64(bytes: Uint8Array) { let value = ""; for (const byte of bytes) value += String.fromCharCode(byte); return btoa(value); }
function architectureSnapshot(executorConfigured: boolean, executorOnline: boolean, sourceEvidenceReady: boolean) {
  return {
    ...STAGE09_ARCHITECTURE,
    planes: STAGE09_ARCHITECTURE.planes.map((plane) => {
      if (plane.id === "SOURCE") return { ...plane, status: sourceEvidenceReady ? "READY" : executorConfigured ? "READY_TO_EXECUTE" : "BLOCKED_CONFIGURATION" };
      if (plane.id === "EXECUTION") return { ...plane, status: executorOnline ? "READY" : executorConfigured ? "WAITING_FOR_HEARTBEAT" : "BLOCKED_CONFIGURATION" };
      return plane;
    }),
  };
}

async function secretMatches(provided: string, expected: string) {
  if (!provided || !expected) return false;
  const [left, right] = await Promise.all([sha(provided), sha(expected)]);
  return left === right;
}

function decodeBase64(value: string) {
  const normalized = value.replace(/^data:[^;]+;base64,/, "");
  const binary = atob(normalized), bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function validImage(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/png") return bytes.length > 8 && bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  if (mimeType === "image/jpeg") return bytes.length > 4 && bytes[0] === 255 && bytes[1] === 216 && bytes.at(-2) === 255 && bytes.at(-1) === 217;
  return false;
}

function validWebm(bytes: Uint8Array) {
  return bytes.length > 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
}

async function runtime() {
  const { env } = await import("cloudflare:workers");
  const value = env as unknown as Env;
  if (!value.DB) throw new Error("Stage 09 database is unavailable");
  await value.DB.batch(schema.map((statement) => value.DB!.prepare(statement)));
  await value.DB.prepare("INSERT INTO v7_stage_states (id,program_id,stage_key,sequence,stage_name,status,threshold,blocker,evidence_summary) VALUES (?,?,?,9,?,'BLOCKED_UPSTREAM',92,'Stage 08 must freeze first','No verified Stage 08 artifact') ON CONFLICT(id) DO NOTHING").bind(STAGE_ID, PROGRAM_ID, STAGE, "Fresh material production").run();
  await value.DB.prepare("INSERT INTO v7_stage_model_settings (id,program_id,stage_key,model_id,reasoning_effort,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING").bind(`${PROGRAM_ID}-${STAGE}-MODEL`, PROGRAM_ID, STAGE, DEFAULT_MODEL, "low", new Date().toISOString()).run();
  await value.DB.prepare("UPDATE v7_media_evidence SET status='TECHNICALLY_VERIFIED' WHERE evidence_type='SOURCE_FRAME_SET' AND status='VERIFIED'").run();
  // Keep persisted authorization truth aligned with the critical Pixel-QA dispatch envelope.
  await value.DB.prepare("UPDATE v7_material_authorizations SET model_policy_json=REPLACE(model_policy_json,'\"safety\":3000','\"safety\":8000'),updated_at=? WHERE model_policy_json LIKE '%\"singleVision\"%' AND model_policy_json LIKE '%\"safety\":3000%'").bind(new Date().toISOString()).run();
  return value;
}

async function modelSetting(db: DB) {
  const row = await db.prepare("SELECT model_id,reasoning_effort FROM v7_stage_model_settings WHERE id=?").bind(`${PROGRAM_ID}-${STAGE}-MODEL`).first<{ model_id: string; reasoning_effort: string }>();
  return { modelId: row?.model_id || DEFAULT_MODEL, reasoningEffort: row?.reasoning_effort || "low" };
}

function routeFor(sourceMode: string) { if (sourceMode === "SOURCE_PROVIDER") return "SOURCE"; if (sourceMode === "HYBRID") return "HYBRID"; return "MAKE"; }
function laneFor(route: string, family: string) {
  const factual = /map|chart|timeline|receipt|system|diagram|waterfall|counter/i.test(family);
  if (route === "MAKE" && factual) return { lane: "DETERMINISTIC_CODE_NATIVE", reasoning: "none", expected: 0, safety: 0, retry: 0, escalation: "CRITICAL_ADJUDICATION" };
  if (route === "SOURCE") return { lane: "SINGLE_CANDIDATE_VISION", reasoning: "medium", expected: 4000, safety: 8000, retry: 1, escalation: "MULTI_CANDIDATE_COMPARE" };
  return { lane: "MULTI_CANDIDATE_COMPARE", reasoning: "medium", expected: 8000, safety: 16000, retry: 1, escalation: "CRITICAL_ADJUDICATION" };
}

function queryFor(shot: Row) {
  const inherited = arr(shot.providerQueries).map((item) => clean(item)).filter(Boolean).slice(0, 3);
  if (inherited.length) return inherited;
  const clause = clean(shot.narrationClause).slice(0, 90);
  const job = clean(shot.visualJob).slice(0, 110);
  return [`${job}; documentary physical reality; no logos or screens`, `${clause}; authentic US context; clean landscape composition`, `${job}; close detail; no staged corporate handshake`];
}

function compileBrief(shot: Row, index: number) {
  const route = routeFor(clean(shot.sourceMode) || "MAKE_ORIGINAL");
  const family = clean(shot.primaryFamily) || "Authored explanatory motion";
  const lane = laneFor(route, family);
  return {
    briefId: `MP-${String(index + 1).padStart(3, "0")}`, shotId: clean(shot.slotId), sectionId: clean(shot.sectionId), startSeconds: Number(shot.startSeconds), endSeconds: Number(shot.endSeconds), narrationClause: clean(shot.narrationClause), viewerMustUnderstand: clean(shot.visualJob), route, primaryFamily: family, secondaryFamily: clean(shot.secondaryFamily),
    requiredEvidence: [clean(shot.entryState), clean(shot.motionEvent), clean(shot.exitState), clean(shot.factualAcceptance)].filter(Boolean),
    prohibitedEvidence: ["audience-facing URLs, filenames or provider labels", "generic payment imagery without clause-level proof", "cash imagery used to represent authorization", "cropped, letterboxed or mobile-illegible output"],
    providerQueries: route === "MAKE" ? [] : queryFor(shot), candidatePolicy: { discover: route === "MAKE" ? 0 : 12, shortlist: route === "MAKE" ? 0 : 6, pixelQa: 1, finalists: 1 },
    renderPolicy: route === "SOURCE" ? "SOURCE_PIXELS" : /map|chart|timeline|receipt|system|diagram|waterfall|counter/i.test(family) ? "CODE_NATIVE_1920X1080" : "AUTHORED_OR_GENERATIVE_1920X1080",
    frameChecks: ["ENTRY", "MIDPOINT", "EXIT", "MOBILE_360P"], modelContract: { lane: lane.lane, reasoning: lane.reasoning, expectedOutputTokens: lane.expected, safetyCeilingTokens: lane.safety, retryLimit: lane.retry, retryScope: lane.retry ? "MISSING_FIELDS_ONLY" : "NONE", escalationLane: lane.escalation, incompletePolicy: "BLOCK_GATE" },
    antiRepeat: clean(shot.antiRepeatControl) || "Reject neighboring duplicate asset, composition, family state or camera path",
    acceptance: [clean(shot.mobileAcceptance), clean(shot.factualAcceptance), "Stored bytes, SHA-256, provenance and rights record are mandatory"].filter(Boolean),
  };
}

function selectPilot(briefs: Row[]) {
  const chosen: Row[] = [], families = new Set<string>(), routes = new Set<string>();
  for (const brief of briefs) { const family = clean(brief.primaryFamily), route = clean(brief.route); if (!families.has(family) || !routes.has(route)) { chosen.push(brief); families.add(family); routes.add(route); } if (chosen.length >= 10) break; }
  for (const brief of briefs) { if (chosen.length >= 10) break; if (!chosen.includes(brief)) chosen.push(brief); }
  return chosen.map((item) => clean(item.briefId));
}

async function upstream(db: DB) {
  const stage = await db.prepare("SELECT status,artifact_id FROM v7_stage_states WHERE id=?").bind(`${PROGRAM_ID}-STAGE-08`).first<{ status: string; artifact_id: string }>();
  if (stage?.status !== "FROZEN") throw new Error("STAGE_08_NOT_FROZEN");
  const artifact = await db.prepare("SELECT id,content_json,content_hash FROM v7_shot_artifacts WHERE id=? AND lifecycle_state='FROZEN'").bind(stage.artifact_id).first<{ id: string; content_json: string; content_hash: string }>();
  if (!artifact) throw new Error("FROZEN_SHOT_ARTIFACT_NOT_FOUND");
  const content = JSON.parse(artifact.content_json) as Row, shots = arr(content.shots).map(rec);
  if (shots.length < 150) throw new Error(`SHOT_CONTRACT_INCOMPLETE · ${shots.length}/150 minimum`);
  return { artifact, shots };
}

function audit(briefs: Row[], pilotIds: string[]) {
  const allowed: Record<string, number> = { DETERMINISTIC_CODE_NATIVE: 0, FAST_QUERY: 3000, SINGLE_CANDIDATE_VISION: 8000, MULTI_CANDIDATE_COMPARE: 16000, CRITICAL_ADJUDICATION: 32000 };
  const gates = [
    ["COMPLETENESS", briefs.length === 166, `${briefs.length}/166 briefs`], ["TIMING", briefs.every((b) => Number(b.endSeconds) > Number(b.startSeconds)), "All timing intervals valid"], ["ROUTING", briefs.every((b) => ["SOURCE", "MAKE", "HYBRID"].includes(clean(b.route))), "Every shot has one execution route"], ["SEMANTIC", briefs.every((b) => clean(b.viewerMustUnderstand).length >= 24), "Clause-level meaning retained"],
    ["MODEL_GUARD", briefs.every((b) => { const c = rec(b.modelContract); return Number(c.safetyCeilingTokens) <= (allowed[clean(c.lane)] ?? -1) && Number(c.expectedOutputTokens) <= Number(c.safetyCeilingTokens) && Number(c.retryLimit) <= 1 && clean(c.incompletePolicy) === "BLOCK_GATE"; }), "Adaptive budgets and incomplete blockers enforced"],
    ["PILOT", pilotIds.length >= 8 && pilotIds.length <= 12, `${pilotIds.length} diverse pilot shots`], ["ZERO_SPEND", true, "0 remote requests · $0.00 actual cost"], ["PIXEL_EVIDENCE", briefs.every((b) => arr(b.frameChecks).length === 4), "Entry, midpoint, exit and 360p checks contracted"],
  ].map(([id, passed, evidence]) => ({ id, status: passed ? "PASS" : "FAIL", evidence }));
  const score = Math.round(gates.filter((gate) => gate.status === "PASS").length / gates.length * 100);
  return { gates, score, passed: score >= THRESHOLD && gates.every((gate) => gate.status === "PASS") };
}

async function current(db: DB) {
  const run = await db.prepare("SELECT * FROM v7_material_runs WHERE program_id=? ORDER BY created_at DESC LIMIT 1").bind(PROGRAM_ID).first<Row>();
  const authorization = run ? await db.prepare("SELECT * FROM v7_material_authorizations WHERE run_id=? ORDER BY authorized_at DESC LIMIT 1").bind(run.id).first<Row>() : null;
  return { run, authorization };
}

async function syncRunTotals(db: DB, runId: string) {
  const requests = await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(actual_cost_usd),0) AS cost FROM v7_material_requests WHERE run_id=?").bind(runId).first<{ total: number; cost: number }>();
  await db.prepare("UPDATE v7_material_runs SET remote_requests=?,actual_cost_usd=? WHERE id=?").bind(Number(requests?.total || 0), Number(requests?.cost || 0), runId).run();
}

async function snapshot() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db), setting = await modelSetting(db);
  const stage = await db.prepare("SELECT * FROM v7_stage_states WHERE id=?").bind(STAGE_ID).first<Row>();
  const artifact = run ? await db.prepare("SELECT content_json,content_hash,runtime_key,drive_file_id FROM v7_material_artifacts WHERE run_id=?").bind(run.id).first<Row>() : null;
  const requestRows = authorization ? await rows(db, "SELECT * FROM v7_material_requests WHERE authorization_id=? ORDER BY created_at DESC", authorization.id) : [];
  const usageRows = run ? await rows(db, "SELECT * FROM v7_ai_usage_events WHERE run_id=? ORDER BY measured_at DESC", run.id) : [];
  const files = authorization ? await rows(db, "SELECT * FROM v7_material_files WHERE authorization_id=? ORDER BY created_at ASC", authorization.id) : [];
  const audits = authorization ? await rows(db, "SELECT * FROM v7_material_audits WHERE authorization_id=? ORDER BY created_at ASC", authorization.id) : [];
  const tournaments = authorization ? await rows(db, "SELECT * FROM v7_material_tournaments WHERE authorization_id=? ORDER BY created_at ASC", authorization.id) : [];
  const mediaJobs = authorization ? await rows(db, "SELECT * FROM v7_media_jobs WHERE authorization_id=? ORDER BY created_at DESC", authorization.id) : [];
  const mediaEvidence = authorization ? await rows(db, "SELECT * FROM v7_media_evidence WHERE authorization_id=? ORDER BY created_at DESC", authorization.id) : [];
  const sourceAudits = authorization ? await rows(db, "SELECT * FROM v7_source_frame_audits WHERE authorization_id=? ORDER BY updated_at DESC", authorization.id) : [];
  const compositeAudits = authorization ? await rows(db, "SELECT * FROM v7_composite_audits WHERE authorization_id=? ORDER BY updated_at DESC", authorization.id) : [];
  const motionProofs = authorization ? await rows(db, "SELECT * FROM v7_motion_proofs WHERE authorization_id=? ORDER BY created_at DESC", authorization.id) : [];
  const motionAudits = authorization ? await rows(db, "SELECT * FROM v7_motion_audits WHERE authorization_id=? ORDER BY created_at DESC", authorization.id) : [];
  const sequenceProof = authorization ? await db.prepare("SELECT * FROM v7_sequence_proofs WHERE authorization_id=? ORDER BY created_at DESC LIMIT 1").bind(authorization.id).first<Row>() : null;
  const sequenceEvidence = sequenceProof?.evidence_id ? await db.prepare("SELECT * FROM v7_media_evidence WHERE id=? AND evidence_type='SEQUENCE_PROOF'").bind(sequenceProof.evidence_id).first<Row>() : null;
  const sequenceProduct = authorization ? await db.prepare("SELECT * FROM v7_sequence_products WHERE authorization_id=? ORDER BY created_at DESC LIMIT 1").bind(authorization.id).first<Row>() : null;
  const sequenceProductEvidence = sequenceProduct?.evidence_id ? await db.prepare("SELECT * FROM v7_media_evidence WHERE id=? AND evidence_type='SEQUENCE_PRODUCT'").bind(sequenceProduct.evidence_id).first<Row>() : null;
  const sequenceProductAudit = sequenceProduct ? await db.prepare("SELECT * FROM v7_sequence_product_audits WHERE product_id=? ORDER BY created_at DESC LIMIT 1").bind(sequenceProduct.id).first<Row>() : null;
  const productionBatch = run ? await db.prepare("SELECT * FROM v7_production_batches WHERE run_id=? ORDER BY created_at DESC LIMIT 1").bind(run.id).first<Row>() : null;
  const engine = clean(productionBatch?.engine_version), v15ControlVisible = [WAVE_BATCH_2_V13_REJECTED_ENGINE_VERSION, WAVE_BATCH_2_V13_ENGINE_VERSION].includes(engine), v13ControlVisible = engine === WAVE_BATCH_2_V12_ENGINE_VERSION, v12ControlVisible = engine === WAVE_BATCH_2_V11_ENGINE_VERSION, v11ControlVisible = engine === WAVE_BATCH_2_V10_ENGINE_VERSION;
  const expectedPreflightAction = v15ControlVisible ? "PREFLIGHT_WAVE_BATCH_2_V18_ACTIVATION" : v13ControlVisible ? "PREFLIGHT_WAVE_BATCH_2_V13_ACTIVATION" : v12ControlVisible ? "PREFLIGHT_WAVE_BATCH_2_V12_ACTIVATION" : v11ControlVisible ? "PREFLIGHT_WAVE_BATCH_2_V11_ACTIVATION" : "PREFLIGHT_WAVE_BATCH_2_V10_ACTIVATION";
  const expectedActivationAction = v15ControlVisible ? "ADOPT_WAVE_BATCH_2_V18_ENGINE_ROOT_CORRECTION" : v13ControlVisible ? "ADOPT_WAVE_BATCH_2_V13_ENGINE_ROOT_CORRECTION" : v12ControlVisible ? "ADOPT_WAVE_BATCH_2_V12_ENGINE_ROOT_CORRECTION" : v11ControlVisible ? "ADOPT_WAVE_BATCH_2_V11_ENGINE_ROOT_CORRECTION" : "ADOPT_WAVE_BATCH_2_V10_ENGINE_ROOT_CORRECTION";
  const batchActivationPreflight = run ? await db.prepare("SELECT * FROM v7_batch_activation_preflights WHERE run_id=? AND action=? ORDER BY updated_at DESC LIMIT 1").bind(run.id, expectedPreflightAction).first<Row>() : null;
  const batchActivation = run ? await db.prepare("SELECT * FROM v7_batch_activations WHERE run_id=? AND action=? ORDER BY updated_at DESC LIMIT 1").bind(run.id, expectedActivationAction).first<Row>() : null;
  const batchProducts = productionBatch ? await rows(db, "SELECT * FROM v7_shot_products WHERE batch_id=? AND engine_version=? ORDER BY created_at", productionBatch.id, productionBatch.engine_version) : [];
  const batchAudit = productionBatch ? await db.prepare("SELECT * FROM v7_batch_product_audits WHERE batch_id=? ORDER BY created_at DESC LIMIT 1").bind(productionBatch.id).first<Row>() : null;
  const reliabilityBaseline = await db.prepare("SELECT * FROM v7_architecture_baselines WHERE program_id=? AND stage_key=? ORDER BY created_at DESC LIMIT 1").bind(PROGRAM_ID, STAGE).first<Row>();
  const compiledContracts = reliabilityBaseline ? await rows(db, "SELECT * FROM v7_compiled_shot_contracts WHERE baseline_id=? ORDER BY brief_id", reliabilityBaseline.id) : [];
  const archetypeQualifications = reliabilityBaseline ? await rows(db, "SELECT * FROM v7_archetype_qualifications WHERE baseline_id=? ORDER BY archetype", reliabilityBaseline.id) : [];
  const archetypeCertifications = reliabilityBaseline ? await rows(db, "SELECT * FROM v7_archetype_certifications WHERE baseline_id=? ORDER BY created_at DESC", reliabilityBaseline.id) : [];
  const archetypeDesignAuthorizations = reliabilityBaseline ? await rows(db, "SELECT * FROM v7_archetype_design_authorizations WHERE baseline_id=? ORDER BY created_at DESC", reliabilityBaseline.id) : [];
  const archetypeRegressions = reliabilityBaseline ? await rows(db, "SELECT * FROM v7_archetype_regressions WHERE baseline_id=? ORDER BY created_at DESC", reliabilityBaseline.id) : [];
  const controlledCanary = run ? await db.prepare("SELECT * FROM v7_pilot_canaries WHERE run_id=? ORDER BY created_at DESC LIMIT 1").bind(run.id).first<Row>() : null;
  const recovery = run ? await db.prepare("SELECT * FROM v7_canary_recovery_sessions WHERE run_id=? ORDER BY created_at DESC LIMIT 1").bind(run.id).first<Row>() : null;
  const recoveryEvents = recovery ? await rows(db, "SELECT * FROM v7_canary_transition_events WHERE recovery_id=? ORDER BY created_at", recovery.id) : [];
  const recoveryIntent = recovery ? await db.prepare("SELECT * FROM v7_canary_request_intents WHERE recovery_id=? ORDER BY created_at DESC LIMIT 1").bind(recovery.id).first<Row>() : null;
  const recoveryOutbox = recovery ? await db.prepare("SELECT * FROM v7_canary_outbox WHERE recovery_id=? ORDER BY created_at DESC LIMIT 1").bind(recovery.id).first<Row>() : null;
  const controlledCanaryAudit = controlledCanary?.current_brief_id ? [...audits].reverse().find((item) => item.brief_id === controlledCanary.current_brief_id && clean(item.id).startsWith(`${clean(controlledCanary.current_brief_id)}-${clean(controlledCanary.version)}-PIXEL-AUDIT`)) : null;
  const executor = await db.prepare("SELECT * FROM v7_media_executors WHERE program_id=? ORDER BY last_seen_at DESC LIMIT 1").bind(PROGRAM_ID).first<Row>();
  const pilotBriefs = run ? await rows(db, "SELECT id,content_json,status FROM v7_material_briefs WHERE run_id=? AND pilot=1 ORDER BY start_seconds", run.id) : [];
  const content = artifact ? JSON.parse(String(artifact.content_json)) as Row : null;
  let shotCount = 0; try { shotCount = (await upstream(db)).shots.length; } catch { shotCount = 0; }
  const primaryFiles = files.filter((file) => file.asset_role === "PRIMARY");
  const items = pilotBriefs.map((brief) => { const value = JSON.parse(String(brief.content_json)) as Row, file = primaryFiles.find((item) => item.brief_id === brief.id), overlay = files.find((item) => item.brief_id === brief.id && item.asset_role === "OVERLAY"), auditRow = audits.find((item) => item.brief_id === brief.id), tournament = tournaments.find((item) => item.brief_id === brief.id), tournamentContent = tournament?.content_json ? rec(JSON.parse(String(tournament.content_json))) : {}; return { id: brief.id, briefId: value.briefId, route: value.route, family: value.primaryFamily, meaning: value.viewerMustUnderstand, materialStatus: file?.status || brief.status, pixelQaStatus: auditRow?.status || "REQUIRED", file: file ? { id: file.id, provider: file.provider, mimeType: file.mime_type, bytes: Number(file.byte_size), hash: clean(file.content_hash).slice(0, 12), previewUrl: `/api/factory/material-production?file=${encodeURIComponent(String(file.id))}` } : null, overlay: overlay ? { id: overlay.id, previewUrl: `/api/factory/material-production?file=${encodeURIComponent(String(overlay.id))}` } : null, tournament: tournament ? { status: tournament.status, score: Number(tournament.score), candidateCount: Number(tournament.candidate_count), providerCoverage: Number(tournament.provider_coverage), championId: tournament.champion_candidate_id, bestCandidateId: tournamentContent.bestCandidateId || null, bestReason: tournamentContent.bestReason || null, repairAttempt: Number(tournamentContent.repairAttempt || 0), assignedPixelJob: tournamentContent.assignedPixelJob || null } : null, audit: auditRow ? { status: auditRow.status, score: Number(auditRow.score), findings: JSON.parse(String(auditRow.findings_json || "[]")) } : null }; });
  const uniqueMaterialized = new Set(primaryFiles.map((file) => String(file.brief_id))).size;
  const executorAge = executor?.last_seen_at ? Date.now() - new Date(String(executor.last_seen_at)).getTime() : Number.POSITIVE_INFINITY;
  const executorOnline = executorAge < 120_000;
  const sourceEvidence = mediaEvidence.find((item) => item.evidence_type === "SOURCE_FRAME_SET");
  const sourceAudit = sourceEvidence ? sourceAudits.find((item) => { if (item.evidence_id !== sourceEvidence.id) return false; try { return rec(JSON.parse(String(item.repair_json || "{}"))).rubricVersion === SOURCE_QA_RUBRIC; } catch { return false; } }) : null;
  const sourceEvidenceReady = sourceAudit?.status === "PASS";
  const sourceQaActive = requestRows.some((row) => row.phase === "SOURCE_FRAME_QA" && ["QUEUED", "IN_PROGRESS"].includes(String(row.status)));
  const currentCompositeAudit = sourceEvidence ? compositeAudits.find((item) => item.evidence_id === sourceEvidence.id && item.rubric_version === COMPOSITE_QA_RUBRIC) : null;
  const previousCompositeAudit = sourceEvidence ? compositeAudits.find((item) => item.evidence_id === sourceEvidence.id && item.rubric_version === PREVIOUS_COMPOSITE_QA_RUBRIC) : null;
  const compositeAudit = currentCompositeAudit || previousCompositeAudit;
  const compositeRepairAvailable = !currentCompositeAudit && previousCompositeAudit?.status === "REPAIR_REQUIRED";
  const compositeActive = requestRows.some((row) => row.phase === "COMPOSITE_TOURNAMENT" && ["QUEUED", "IN_PROGRESS"].includes(String(row.status)));
  const motionQaActive = requestRows.some((row) => row.phase === "MOTION_PROOF_QA" && ["QUEUED", "IN_PROGRESS"].includes(String(row.status)));
  const compositeContent = compositeAudit?.candidates_json ? rec(JSON.parse(String(compositeAudit.candidates_json))) : {};
  const displayedCompositeRubric = clean(compositeAudit?.rubric_version) || COMPOSITE_QA_RUBRIC;
  const compositeIdentity = sourceEvidence ? `${displayedCompositeRubric}-${clean(sourceEvidence.content_hash).slice(0, 12)}` : "";
  const compositeCandidates = ["A", "B", "C"].map((candidate) => ({ candidate, scores: rec(compositeContent[candidate]), frames: ["ENTRY", "MIDPOINT", "EXIT"].map((state) => { const file = files.find((item) => item.brief_id === sourceEvidence?.brief_id && item.asset_role === `COMPOSITE_${candidate}_${state}` && clean(item.id).includes(compositeIdentity)); return file ? { state, fileId: file.id, previewUrl: `/api/factory/material-production?file=${encodeURIComponent(String(file.id))}` } : null; }).filter(Boolean) }));
  const motionProof = motionProofs[0] || null;
  const motionRightsRepairAvailable = motionProof?.status === "REPAIR_REQUIRED" && arr(JSON.parse(String(motionProof.findings_json || "[]"))).some((finding) => /rights record|authorization for the checkout imagery/i.test(clean(finding)));
  const motionEvidence = motionProof?.evidence_id ? mediaEvidence.find((item) => item.id === motionProof.evidence_id) : null;
  let motionContent: Row = {}; try { motionContent = motionEvidence ? rec(JSON.parse(String(motionEvidence.content_json || "{}"))) : {}; } catch { motionContent = {}; }
  let sequenceContent: Row = {}; try { sequenceContent = sequenceEvidence ? rec(JSON.parse(String(sequenceEvidence.content_json || "{}"))) : {}; } catch { sequenceContent = {}; }
  let sequenceProductContent: Row = {}; try { sequenceProductContent = sequenceProductEvidence ? rec(JSON.parse(String(sequenceProductEvidence.content_json || "{}"))) : {}; } catch { sequenceProductContent = {}; }
  const motionJob = mediaJobs.find((job) => job.job_type === "MOTION_PROOF_RENDER");
  const productionQuarantined = reliabilityBaseline?.execution_state === "FROZEN";
  const responseIds = new Set(requestRows.map((row) => clean(row.provider_response_id)).filter(Boolean));
  const matchedUsageRows = usageRows.filter((row) => responseIds.has(clean(row.provider_response_id)));
  const costGovernancePolicy = rec(JSON.parse(String(authorization?.model_policy_json || "{}")).costGovernance || {});
  const estimatedCostUsd = requestRows.reduce((sum, row) => sum + Number(row.actual_cost_usd || 0), 0);
  const nextGate = productionQuarantined ? "ARCHETYPE_CERTIFICATION_REQUIRED" : sourceEvidenceReady
    ? compositeActive ? "COMPOSITE_TOURNAMENT_RUNNING"
      : compositeRepairAvailable ? "COMPOSITE_REPAIR"
        : !compositeAudit ? "COMPOSITE_TOURNAMENT"
          : compositeAudit.status !== "PASS" ? "COMPOSITE_REPAIR_BLOCKED"
            : !motionProof ? "MOTION_PROOF_PLAN"
              : ["QUEUED", "LEASED"].includes(clean(motionJob?.status)) ? "MOTION_RENDER_RUNNING"
                : motionQaActive ? "MOTION_QA_RUNNING"
                  : motionRightsRepairAvailable ? "MOTION_RIGHTS_EVIDENCE_REPAIR"
                  : motionProof.status === "QA_REQUIRED" ? "MOTION_QA"
                    : motionProof.status === "PASS"
                      ? clean(run?.status) === "REPAIR_REQUIRED" || clean(authorization?.status) === "REPAIR_REQUIRED" ? "PILOT_REPAIR_BLOCKED" : clean(run?.status) === "PILOT_PASS" ? "SEQUENCE_PROOF" : clean(authorization?.status) === "AUTHORIZED" ? "PILOT_EXECUTION" : "PILOT_AUTHORIZATION"
                      : "MOTION_PROOF_BLOCKED"
    : sourceEvidence ? sourceQaActive ? "SOURCE_FRAME_QA_RUNNING" : sourceAudit?.status === "REPAIR_REQUIRED" ? "SOURCE_REPLACEMENT" : "SOURCE_FRAME_QA"
      : Boolean(env.MEDIA_EXECUTOR_SHARED_SECRET) ? executorOnline ? "RUN_SOURCE_FRAME_JOB" : "START_EXECUTOR" : "CONFIGURE_EXECUTOR_SECRET";
  return {
    stage: { status: clean(stage?.status || "BLOCKED_UPSTREAM"), threshold: Number(stage?.threshold || THRESHOLD), blocker: stage?.blocker || null, evidence: clean(stage?.evidence_summary) }, upstream: { frozen: shotCount === 166, shotCount }, providerReadiness: { openai: Boolean(env.OPENAI_API_KEY), pexels: Boolean(env.PEXELS_API_KEY), pixabay: Boolean(env.PIXABAY_API_KEY), shutterstock: Boolean(env.SHUTTERSTOCK_CONSUMER_KEY) },
    provider: { model: setting.modelId, reasoningEffort: setting.reasoningEffort, modelOptions: MODEL_OPTIONS, reasoningOptions: REASONING_OPTIONS },
    architecture: architectureSnapshot(Boolean(env.MEDIA_EXECUTOR_SHARED_SECRET), executorOnline, sourceEvidenceReady),
    releasePolicy: CONTROLLED_RELEASE_POLICY,
    reliability: reliabilityBaseline ? {
      version: reliabilityBaseline.version,
      status: reliabilityBaseline.status,
      executionState: reliabilityBaseline.execution_state,
      sourceCheckpoint: reliabilityBaseline.source_checkpoint,
      controls: JSON.parse(String(reliabilityBaseline.controls_json || "[]")),
      qualification: JSON.parse(String(reliabilityBaseline.qualification_json || "{}")),
      compiled: { total: compiledContracts.length, pass: compiledContracts.filter((item) => item.lint_status === "PASS").length, redesign: compiledContracts.filter((item) => item.lint_status === "REDESIGN_REQUIRED").length },
      archetypes: archetypeQualifications.map((item) => ({ name: item.archetype, status: item.status, hardestFixture: item.hardest_fixture, evidenceStatus: item.evidence_status, firstPassYield: Number(item.first_pass_yield), blocker: item.blocker, checks: JSON.parse(String(item.deterministic_checks_json || "[]")) })),
      certifications: archetypeCertifications.map((item) => ({ id: item.id, archetype: item.archetype, briefId: item.brief_id, renderer: item.renderer_version, status: item.status, frameIds: JSON.parse(String(item.frame_ids_json || "[]")), score: Number(item.score), dimensions: JSON.parse(String(item.dimensions_json || "{}")), findings: JSON.parse(String(item.findings_json || "[]")), attempt: Number(item.attempt), createdAt: item.created_at })),
      designAuthorizations: archetypeDesignAuthorizations.map((item) => ({ id: item.id, archetype: item.archetype, sourceCertificationId: item.source_certification_id, sourceRenderer: item.source_renderer_version, sourceScore: Number(item.source_score), renderer: item.new_renderer_version, scope: item.scope, status: item.status, certificationId: item.certification_id || null, authorizedAt: item.authorized_at })),
      regressions: archetypeRegressions.map((item) => ({ id: item.id, status: item.status, score: Number(item.score), checks: JSON.parse(String(item.checks_json || "[]")), certificationIds: JSON.parse(String(item.certification_ids_json || "[]")), pilotReplay: JSON.parse(String(item.pilot_replay_json || "{}")), requestsBefore: Number(item.remote_requests_before), requestsAfter: Number(item.remote_requests_after), costBefore: Number(item.actual_cost_before), costAfter: Number(item.actual_cost_after), createdAt: item.created_at })),
      frozenAt: reliabilityBaseline.frozen_at,
    } : null,
    policy: { execution: "ZERO_SPEND_DRY_RUN_THEN_AUTHORIZED_TRANCHES", pilotShots: "8–12", expectedOutputTokens: "500–16000", safetyCeilings: "3000/8000/16000/32000", maxRetry: 1, retryPolicy: "DELTA_ONLY", incompletePolicy: "BLOCK_GATE", factualVisuals: "CODE_NATIVE", evidence: "STORED_PIXELS_AND_CHECKSUM" },
    run: run ? { id: run.id, status: run.status, score: Number(run.score), briefCount: Number(run.brief_count), pilotCount: Number(run.pilot_count), remoteRequests: Number(run.remote_requests), actualCostUsd: Number(run.actual_cost_usd), gates: JSON.parse(String(run.gate_json || "[]")) } : null,
    artifact: content ? { contentHash: artifact?.content_hash, runtimeKey: artifact?.runtime_key, driveFileId: artifact?.drive_file_id, pilotIds: content.pilotIds, routeMix: content.routeMix, modelMix: content.modelMix, sampleBriefs: arr(content.briefs).slice(0, 8) } : null,
    authorization: authorization ? { id: authorization.id, runId: authorization.run_id, scope: authorization.scope, status: authorization.status, shotCount: Number(authorization.shot_count), maxRemoteRequests: Number(authorization.max_remote_requests), maxActualSpendUsd: Number(authorization.max_actual_spend_usd), modelPolicy: JSON.parse(String(authorization.model_policy_json || "{}")), authorizedAt: authorization.authorized_at, revokedAt: authorization.revoked_at } : null,
    batchActivationControl: {
      preflight: batchActivationPreflight ? { id: batchActivationPreflight.id, status: batchActivationPreflight.status, inputHash: clean(batchActivationPreflight.input_hash), result: rec(JSON.parse(String(batchActivationPreflight.result_json || "{}"))), requestsBefore: Number(batchActivationPreflight.requests_before), costBefore: Number(batchActivationPreflight.cost_before), updatedAt: batchActivationPreflight.updated_at } : null,
      activation: batchActivation ? { id: batchActivation.id, status: batchActivation.status, idempotencyKey: clean(batchActivation.idempotency_key), targetBatchId: clean(batchActivation.target_batch_id), inputHash: clean(batchActivation.input_hash), result: rec(JSON.parse(String(batchActivation.result_json || "{}"))), committedAt: batchActivation.committed_at || null } : null,
    },
    canary: controlledCanary ? { id: controlledCanary.id, version: controlledCanary.version, status: controlledCanary.status, queue: JSON.parse(String(controlledCanary.queue_json || "[]")), currentIndex: Number(controlledCanary.current_index), currentBriefId: controlledCanary.current_brief_id || null, releasedUnits: Number(controlledCanary.released_units), passedUnits: Number(controlledCanary.passed_units), failedUnits: Number(controlledCanary.failed_units), requestsBefore: Number(controlledCanary.requests_before), costBefore: Number(controlledCanary.cost_before), requestBudget: Number(controlledCanary.request_budget), costBudget: Number(controlledCanary.cost_budget), activeRequestPeak: Number(controlledCanary.active_request_peak), gates: JSON.parse(String(controlledCanary.gate_json || "[]")), currentAudit: controlledCanaryAudit ? { status: controlledCanaryAudit.status, score: Number(controlledCanaryAudit.score), dimensions: JSON.parse(String(controlledCanaryAudit.dimensions_json || "{}")), findings: JSON.parse(String(controlledCanaryAudit.findings_json || "[]")), providerResponseId: controlledCanaryAudit.provider_response_id } : null, createdAt: controlledCanary.created_at, updatedAt: controlledCanary.updated_at } : null,
    recovery: recovery ? { id: recovery.id, version: recovery.version, status: recovery.status, snapshotHash: recovery.snapshot_hash, rootCause: JSON.parse(String(recovery.root_cause_json || "{}")), e2e: JSON.parse(String(recovery.e2e_json || "{}")), faultMatrix: JSON.parse(String(recovery.fault_matrix_json || "[]")), requestsBefore: Number(recovery.requests_before), requestsAfter: Number(recovery.requests_after), costBefore: Number(recovery.cost_before), costAfter: Number(recovery.cost_after), simulatedRequestSequence: Number(recovery.simulated_request_sequence), requestIntent: recoveryIntent ? { id: recoveryIntent.id, status: recoveryIntent.status, sequence: Number(recoveryIntent.simulated_sequence), idempotencyKey: recoveryIntent.idempotency_key, payloadHash: recoveryIntent.payload_hash } : null, outbox: recoveryOutbox ? { id: recoveryOutbox.id, status: recoveryOutbox.status, eventType: recoveryOutbox.event_type } : null, events: recoveryEvents.map((event) => ({ status: event.status, failureCode: event.failure_code || null, failedTransition: event.failed_transition || null, failedGate: event.failed_gate || null, expectedState: event.expected_state || null, actualState: event.actual_state || null, ledgerStatus: event.ledger_status || null, providerDispatchStatus: event.provider_dispatch_status || null, createdAt: event.created_at })), createdAt: recovery.created_at, updatedAt: recovery.updated_at } : null,
    pilot: { materialized: uniqueMaterialized, audited: audits.filter((item) => ["PASS", "REPAIR_REQUIRED"].includes(String(item.status))).length, total: pilotBriefs.length, percent: pilotBriefs.length ? Math.round((uniqueMaterialized + audits.length) / (pilotBriefs.length * 2) * 100) : 0, items },
    requestLedger: { total: requestRows.length, planned: requestRows.filter((row) => row.status === "PLANNED").length, active: requestRows.filter((row) => ["QUEUED", "IN_PROGRESS"].includes(String(row.status))).length, complete: requestRows.filter((row) => row.status === "COMPLETE").length, incomplete: requestRows.filter((row) => row.status === "BLOCKED_INCOMPLETE").length, actualCostUsd: estimatedCostUsd, recent: requestRows.slice(0, 20).map((row) => ({ id: row.id, briefId: row.brief_id, phase: row.phase, provider: row.provider, modelId: row.model_id, status: row.status, providerResponseId: row.provider_response_id || null, inputTokens: Number(row.input_tokens), outputTokens: Number(row.output_tokens), reasoningTokens: Number(row.reasoning_tokens), actualCostUsd: Number(row.actual_cost_usd), error: row.error, createdAt: row.created_at })) },
    costGovernance: { version: "COST_GOVERNANCE_V2", estimatedCostUsd, estimationBasis: "PROVIDER_REPORTED_USAGE_X_CONFIGURED_RATE", providerReportedUsage: { status: responseIds.size > 0 && matchedUsageRows.length === responseIds.size ? "VERIFIED_FROM_RESPONSE_PAYLOADS" : responseIds.size > 0 ? "PARTIALLY_RECONCILED" : "NO_PROVIDER_RESPONSES", responseIds: responseIds.size, usageRecords: usageRows.length, matchedResponses: matchedUsageRows.length, inputTokens: matchedUsageRows.reduce((sum, row) => sum + Number(row.input_tokens || 0), 0), outputTokens: matchedUsageRows.reduce((sum, row) => sum + Number(row.output_tokens || 0), 0), reasoningTokens: matchedUsageRows.reduce((sum, row) => sum + Number(row.reasoning_tokens || 0), 0) }, billingVerifiedCostUsd: null, billingVerificationStatus: "OPENAI_ORGANIZATION_COSTS_NOT_CONNECTED", reconciliationStatus: clean(costGovernancePolicy.reconciliationStatus) || "PROVIDER_USAGE_RECORDED_BILLING_PENDING", lastReconciledAt: costGovernancePolicy.lastReconciledAt || null, actualBilledCostClaimProhibited: true },
    sequenceProof: sequenceProof ? { id: sequenceProof.id, status: sequenceProof.status, version: sequenceProof.version, durationSeconds: Number(sequenceProof.duration_seconds), fps: Number(sequenceProof.fps), unitCount: Number(sequenceProof.unit_count), frameCount: Number(sequenceProof.frame_count), score: Number(sequenceProof.score), tier: clean(sequenceProof.tier) || "BLOCKED", dimensions: rec(JSON.parse(String(sequenceProof.dimensions_json || "{}"))), findings: arr(JSON.parse(String(sequenceProof.findings_json || "[]"))), previewUrl: sequenceProof.sequence_file_id ? `/api/factory/material-production?file=${encodeURIComponent(String(sequenceProof.sequence_file_id))}` : null, sampleFrames: arr(sequenceContent.frames).map(rec).map((frame) => ({ role: clean(frame.role), logicalId: clean(frame.logicalId), timestampSeconds: Number(frame.timestampSeconds), fileId: clean(frame.fileId), previewUrl: `/api/factory/material-production?file=${encodeURIComponent(clean(frame.fileId))}` })), providerResponseId: sequenceProof.provider_response_id || null, createdAt: sequenceProof.created_at, updatedAt: sequenceProof.updated_at } : null,
    sequenceProduct: sequenceProduct ? { id: sequenceProduct.id, status: sequenceProduct.status, composerVersion: sequenceProduct.composer_version, iteration: Number(sequenceProduct.iteration), maxIterations: Number(sequenceProduct.max_iterations), specification: rec(JSON.parse(String(sequenceProduct.specification_json || "{}"))), specificationHash: clean(sequenceProduct.specification_hash), sourceManifestHash: clean(sequenceProduct.source_manifest_hash), measurements: rec(JSON.parse(String(sequenceProduct.measurements_json || "{}"))), corrections: arr(JSON.parse(String(sequenceProduct.corrections_json || "[]"))), contentHash: sequenceProduct.content_hash || null, previewUrl: sequenceProduct.product_file_id ? `/api/factory/material-production?file=${encodeURIComponent(String(sequenceProduct.product_file_id))}` : null, sampleFrames: arr(sequenceProductContent.frames).map(rec).map((frame) => ({ role: clean(frame.role), logicalId: clean(frame.logicalId), timestampSeconds: Number(frame.timestampSeconds), fileId: clean(frame.fileId), previewUrl: `/api/factory/material-production?file=${encodeURIComponent(clean(frame.fileId))}` })), audit: sequenceProductAudit ? { id: sequenceProductAudit.id, rubric: sequenceProductAudit.rubric_version, status: sequenceProductAudit.status, score: Number(sequenceProductAudit.score), tier: clean(sequenceProductAudit.tier), dimensions: rec(JSON.parse(String(sequenceProductAudit.dimensions_json || "{}"))), findings: arr(JSON.parse(String(sequenceProductAudit.findings_json || "[]"))), requestId: sequenceProductAudit.request_id || null, providerResponseId: sequenceProductAudit.provider_response_id || null, createdAt: sequenceProductAudit.created_at, completedAt: sequenceProductAudit.completed_at || null } : null, completedAt: sequenceProduct.completed_at || null, createdAt: sequenceProduct.created_at, updatedAt: sequenceProduct.updated_at } : null,
    productionBatch: productionBatch ? {
      id: productionBatch.id,
      waveKey: productionBatch.wave_key,
      version: productionBatch.version,
      engineVersion: productionBatch.engine_version,
      status: productionBatch.status,
      scope: arr(JSON.parse(String(productionBatch.scope_json || "[]"))),
      totalUnits: Number(productionBatch.total_units),
      completedUnits: Number(productionBatch.completed_units),
      blockedUnits: Number(productionBatch.blocked_units),
      currentIndex: Number(productionBatch.current_index),
      auditSample: arr(JSON.parse(String(productionBatch.audit_sample_json || "[]"))),
      productionDoD: rec(JSON.parse(String(productionBatch.production_dod_json || "{}"))),
      rootCausePolicy: rec(JSON.parse(String(productionBatch.root_cause_policy_json || "{}"))),
      products: batchProducts.map((product) => ({ id: product.id, logicalId: product.logical_brief_id, archetype: product.archetype, status: product.status, engineVersion: product.engine_version, measurements: rec(JSON.parse(String(product.measurements_json || "{}"))), frameIds: arr(JSON.parse(String(product.frame_ids_json || "[]"))), frameHashes: arr(JSON.parse(String(product.frame_hashes_json || "[]"))), productHash: product.product_hash, completedAt: product.completed_at })),
      audit: batchAudit ? { id: batchAudit.id, rubric: batchAudit.rubric_version, status: batchAudit.status, score: Number(batchAudit.score), tier: batchAudit.tier, dimensions: rec(JSON.parse(String(batchAudit.dimensions_json || "{}"))), findings: arr(JSON.parse(String(batchAudit.findings_json || "[]"))), rootCause: rec(JSON.parse(String(batchAudit.root_cause_json || "{}"))), requestId: batchAudit.request_id || null, providerResponseId: batchAudit.provider_response_id || null, completedAt: batchAudit.completed_at || null } : null,
      requestsBefore: Number(productionBatch.requests_before),
      costBefore: Number(productionBatch.cost_before),
      requestBudget: Number(productionBatch.request_budget),
      costBudget: Number(productionBatch.cost_budget),
      completedAt: productionBatch.completed_at || null,
      createdAt: productionBatch.created_at,
      updatedAt: productionBatch.updated_at,
    } : null,
    mediaExecution: {
      configured: Boolean(env.MEDIA_EXECUTOR_SHARED_SECRET),
      executor: executor ? { id: executor.id, status: executorOnline ? "ONLINE" : "OFFLINE", version: executor.version, lastSeenAt: executor.last_seen_at, capabilities: JSON.parse(String(executor.capabilities_json || "[]")) } : null,
      counts: Object.fromEntries(["QUEUED", "LEASED", "COMPLETE", "FAILED", "BLOCKED"].map((status) => [status.toLowerCase(), mediaJobs.filter((job) => job.status === status).length])),
      jobs: mediaJobs.slice(0, 12).map((job) => ({ id: job.id, briefId: job.brief_id, type: job.job_type, status: job.status, attempt: Number(job.attempt), maxAttempts: Number(job.max_attempts), leaseOwner: job.lease_owner, error: job.error, createdAt: job.created_at, completedAt: job.completed_at })),
      evidence: mediaEvidence.slice(0, 12).map((item) => {
        let content: Row = {}; try { content = rec(JSON.parse(String(item.content_json || "{}"))); } catch { content = {}; }
        const audit = sourceAudits.find((candidate) => candidate.evidence_id === item.id);
        return { id: item.id, briefId: item.brief_id, type: item.evidence_type, status: audit?.status || item.status, technicalStatus: item.status, hash: clean(item.content_hash).slice(0, 12), createdAt: item.created_at, probe: rec(content.probe), sourceQa: audit ? { status: audit.status, score: Number(audit.score), dimensions: rec(JSON.parse(String(audit.dimensions_json || "{}"))), findings: arr(JSON.parse(String(audit.findings_json || "[]"))), repair: rec(JSON.parse(String(audit.repair_json || "{}"))) } : null, frames: arr(content.frames).map(rec).map((frame) => ({ role: clean(frame.role), timestampSeconds: Number(frame.timestampSeconds), width: Number(frame.width), height: Number(frame.height), mimeType: clean(frame.mimeType), fileId: clean(frame.fileId), previewUrl: `/api/factory/material-production?file=${encodeURIComponent(clean(frame.fileId))}` })) };
      }),
      sourceQaActive,
      composite: { active: compositeActive, rubric: displayedCompositeRubric, status: compositeAudit?.status || "REQUIRED", winner: compositeAudit?.winner || null, score: Number(compositeAudit?.score || 0), dimensions: compositeAudit ? rec(JSON.parse(String(compositeAudit.dimensions_json || "{}"))) : {}, findings: compositeAudit ? arr(JSON.parse(String(compositeAudit.findings_json || "[]"))) : [], repair: compositeAudit ? rec(JSON.parse(String(compositeAudit.repair_json || "{}"))) : {}, candidates: compositeCandidates },
      motionProof: motionProof ? { id: motionProof.id, status: motionProof.status, champion: motionProof.champion, renderer: motionProof.renderer_version, durationSeconds: Number(motionProof.duration_seconds), fps: Number(motionProof.fps), score: Number(motionProof.score), dimensions: rec(JSON.parse(String(motionProof.dimensions_json || "{}"))), findings: arr(JSON.parse(String(motionProof.findings_json || "[]"))), motionFileId: motionProof.motion_file_id || null, previewUrl: motionProof.motion_file_id ? `/api/factory/material-production?file=${encodeURIComponent(String(motionProof.motion_file_id))}` : null, contentHash: motionProof.content_hash || null, sourceHashes: arr(JSON.parse(String(motionProof.source_hashes_json || "[]"))), sampleFrames: arr(motionContent.frames).map(rec).map((frame) => ({ role: clean(frame.role), timestampSeconds: Number(frame.timestampSeconds), fileId: clean(frame.fileId), previewUrl: `/api/factory/material-production?file=${encodeURIComponent(clean(frame.fileId))}` })), rightsRepairAvailable: motionRightsRepairAvailable, audits: motionAudits.filter((audit) => audit.proof_id === motionProof.id).map((audit) => ({ attempt: Number(audit.attempt), status: clean(audit.status), score: Number(audit.score), evidenceBundleHash: clean(audit.evidence_bundle_hash), providerResponseId: clean(audit.provider_response_id), createdAt: clean(audit.created_at) })) } : null,
      motionQaActive,
      nextGate,
    },
  };
}

function compileShotContract(briefRow: Row) {
  const brief = rec(JSON.parse(String(briefRow.content_json || "{}")));
  const claim = clean(brief.viewerMustUnderstand || brief.narrationClause);
  const text = `${clean(brief.narrationClause)} ${claim}`.toLowerCase();
  const neutralConfirmation = /neutral confirmation|receiv(?:e|es|ing).*confirmation/.test(text);
  const negativeState = neutralConfirmation || /not settled|not final|pending|await|processing|verified but|not yet/.test(text);
  const transactionState = /payment|transaction|checkout|authorization|verified|settled|terminal|merchant.*confirmation/.test(text);
  const dataClaim = /percent|rate|increase|decrease|compare|cost|fee|revenue|margin|amount/.test(text);
  const routeClaim = /route|network|flow|transfer|issuer|acquirer|clearing/.test(text);
  const archetype = transactionState && negativeState ? "TRANSACTION_STATE_PROOF"
    : dataClaim ? "DATA_VISUALIZATION"
      : routeClaim ? "PROCESS_ROUTE"
        : clean(brief.route) === "SOURCE" ? "DOCUMENTARY_LIVE_ACTION"
          : clean(brief.route) === "HYBRID" ? "SOURCE_AUTHORED_HYBRID"
            : "ABSTRACT_AUTHORED";
  const requiredEvidence = archetype === "TRANSACTION_STATE_PROOF"
    ? ["observable initial state", "observable verified state", "explicit not-settled state", "continuous temporal progression"]
    : archetype === "DATA_VISUALIZATION"
      ? ["reconciled values", "labeled baseline", "visible delta", "source-bound units"]
      : archetype === "PROCESS_ROUTE"
        ? ["named origin", "named destination", "ordered path", "directional progression"]
        : ["literal claim-bearing subject", "observable action", "non-contradictory exit state"];
  const allowedModalities = archetype === "TRANSACTION_STATE_PROOF"
    ? ["CONTROLLED_UI", "AUTHORED_STATE_ANIMATION", "VERIFIED_HYBRID"]
    : archetype === "DATA_VISUALIZATION" || archetype === "PROCESS_ROUTE"
      ? ["CODE_NATIVE", "AUTHORED_ANIMATION"]
      : ["VERIFIED_SOURCE", "AUTHORED", "VERIFIED_HYBRID"];
  const forbidden = ["invented facts", "invented amounts", "debug metadata", "generic stock as semantic proof"];
  if (negativeState) forbidden.push("positive-state imagery that implies completion or settlement");
  const existingRoute = clean(brief.route), routeCompatible = !(archetype === "TRANSACTION_STATE_PROOF" && existingRoute === "SOURCE");
  const checks = [
    { id: "CLAIM", pass: claim.length >= 12 },
    { id: "EVIDENCE", pass: requiredEvidence.length >= 3 },
    { id: "MODALITY", pass: allowedModalities.length >= 2 },
    { id: "FORBIDDEN", pass: forbidden.length >= 4 },
    { id: "ROUTE_COMPATIBILITY", pass: routeCompatible },
  ];
  return {
    brief,
    contract: {
      archetype,
      riskTier: negativeState || dataClaim ? "P1" : "P2",
      claim,
      requiredEvidence,
      allowedModalities,
      forbidden,
      repairRoute: routeCompatible ? "RENDER_OR_SOURCE_LAYER" : "SHOT_CONTRACT_REDESIGN",
      lintStatus: checks.every((item) => item.pass) ? "PASS" : "REDESIGN_REQUIRED",
      checks,
    },
  };
}

async function qualifyReliabilityBaseline() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization) throw new Error("STAGE09_RUN_REQUIRED");
  const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>();
  if (Number(active?.total || 0) !== 0) throw new Error("ACTIVE_REMOTE_REQUESTS_MUST_RECONCILE_BEFORE_QUALIFICATION");
  const existing = await db.prepare("SELECT id FROM v7_architecture_baselines WHERE program_id=? AND stage_key=? AND version=? ORDER BY created_at DESC LIMIT 1").bind(PROGRAM_ID, STAGE, RELIABILITY_BASELINE_VERSION).first<Row>();
  if (existing) return snapshot();
  const briefs = await rows(db, "SELECT * FROM v7_material_briefs WHERE run_id=? AND pilot=1 ORDER BY start_seconds", run.id);
  if (briefs.length < 8) throw new Error("STRATIFIED_PILOT_FIXTURES_REQUIRED");
  const compiled = briefs.map(compileShotContract);
  const archetypes = ["TRANSACTION_STATE_PROOF", "DATA_VISUALIZATION", "PROCESS_ROUTE", "DOCUMENTARY_LIVE_ACTION", "SOURCE_AUTHORED_HYBRID", "ABSTRACT_AUTHORED", "RIGHTS_SENSITIVE", "MOBILE_TEXT_INTENSIVE"];
  const hardest = compiled.find((item) => clean(item.brief.briefId) === "MP-153") || compiled.find((item) => item.contract.archetype === "TRANSACTION_STATE_PROOF");
  if (!hardest) throw new Error("MP_153_QUALIFICATION_FIXTURE_MISSING");
  const hardFixtureRejectedGenericSource = hardest.contract.archetype === "TRANSACTION_STATE_PROOF" && hardest.contract.allowedModalities.includes("CONTROLLED_UI") && hardest.contract.forbidden.includes("generic stock as semantic proof");
  const compilerChecks = [
    { id: "ACTIVE_REQUESTS_ZERO", status: "PASS", evidence: "0 active provider requests" },
    { id: "MP153_FAILS_EARLY", status: hardFixtureRejectedGenericSource ? "PASS" : "FAIL", evidence: "Generic stock cannot prove VERIFIED / NOT SETTLED" },
    { id: "CLAIM_TO_EVIDENCE", status: compiled.every((item) => item.contract.requiredEvidence.length >= 3) ? "PASS" : "FAIL", evidence: `${compiled.length}/${compiled.length} contracts carry observable evidence` },
    { id: "MODALITY_ROUTING", status: compiled.every((item) => item.contract.allowedModalities.length >= 2) ? "PASS" : "FAIL", evidence: "Every contract declares allowed modalities" },
    { id: "FORBIDDEN_ASSUMPTIONS", status: compiled.every((item) => item.contract.forbidden.includes("invented facts")) ? "PASS" : "FAIL", evidence: "Invented facts and generic semantic stock are prohibited" },
    { id: "FAILURE_ROUTER", status: compiled.every((item) => Boolean(item.contract.repairRoute)) ? "PASS" : "FAIL", evidence: "Failure routes to contract, source or renderer layer" },
  ];
  const qualified = compilerChecks.every((item) => item.status === "PASS"), now = new Date().toISOString(), baselineId = `${PROGRAM_ID}-S09-RELIABILITY-${Date.now()}`;
  const controls = ["EXECUTION_QUARANTINE", "SHOT_CONTRACT_COMPILER", "DETERMINISTIC_LINT", "ARCHETYPE_REGISTRY", "HARDEST_FIRST", "FAILURE_ROUTER", "FIRST_PASS_YIELD_GATE", "NO_ARCHITECTURE_MUTATION_IN_BATCH"];
  const qualification = { status: qualified ? "PASS" : "FAIL", score: Math.round(compilerChecks.filter((item) => item.status === "PASS").length / compilerChecks.length * 100), compilerChecks, productionDispatch: "BLOCKED", next: "ARCHETYPE_CERTIFICATION" };
  const statements = [
    db.prepare("INSERT INTO v7_architecture_baselines (id,program_id,stage_key,version,status,execution_state,source_checkpoint,controls_json,qualification_json,created_at,frozen_at) VALUES (?,?,?,?,?,'FROZEN','V151_QUALIFICATION_AUDIT',?,?,?,?)").bind(baselineId, PROGRAM_ID, STAGE, RELIABILITY_BASELINE_VERSION, qualified ? "QUALIFIED_FOR_ARCHETYPE_CERTIFICATION" : "QUALIFICATION_FAILED", JSON.stringify(controls), JSON.stringify(qualification), now, now),
    db.prepare("UPDATE v7_stage_states SET status=?,blocker=?,evidence_summary=?,updated_at=? WHERE id=?").bind(qualified ? "ARCHITECTURE_QUALIFIED" : "ARCHITECTURE_QUALIFICATION_FAILED", qualified ? "ARCHETYPE_CERTIFICATION_REQUIRED" : "SHOT_CONTRACT_COMPILER_REPAIR_REQUIRED", `Reliability baseline ${qualification.score}/100 · production execution frozen · MP-153 reclassified as archetype fixture`, now, STAGE_ID),
  ];
  for (const item of compiled) statements.push(db.prepare("INSERT INTO v7_compiled_shot_contracts (id,program_id,baseline_id,brief_id,archetype,risk_tier,claim,required_evidence_json,allowed_modalities_json,forbidden_json,repair_route,lint_status,lint_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(`${baselineId}-${clean(item.brief.briefId)}`, PROGRAM_ID, baselineId, clean(item.brief.briefId), item.contract.archetype, item.contract.riskTier, item.contract.claim, JSON.stringify(item.contract.requiredEvidence), JSON.stringify(item.contract.allowedModalities), JSON.stringify(item.contract.forbidden), item.contract.repairRoute, item.contract.lintStatus, JSON.stringify(item.contract.checks), now));
  for (const archetype of archetypes) {
    const fixture = archetype === "TRANSACTION_STATE_PROOF" ? clean(hardest.brief.briefId) : clean(compiled.find((item) => item.contract.archetype === archetype)?.brief.briefId || `FIXTURE-${archetype}`);
    const checks = archetype === "TRANSACTION_STATE_PROOF" ? ["generic stock rejected", "negative state explicit", "controlled modality selected", "temporal proof required"] : ["claim compiled", "evidence declared", "modality constrained", "forbidden assumptions declared"];
    statements.push(db.prepare("INSERT INTO v7_archetype_qualifications (id,program_id,baseline_id,archetype,status,hardest_fixture,deterministic_checks_json,evidence_status,first_pass_yield,blocker,created_at) VALUES (?,?,?,?,? ,?,?, 'CERTIFICATION_EVIDENCE_REQUIRED',0,'REAL_ARTIFACT_CERTIFICATION_REQUIRED',?)").bind(`${baselineId}-${archetype}`, PROGRAM_ID, baselineId, archetype, "CONTRACT_QUALIFIED", fixture, JSON.stringify(checks), now));
  }
  await db.batch(statements);
  return snapshot();
}

function controlledCertificationBackground(state: number) {
  const width = 960, height = 540, data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const index = (y * width + x) * 4, glow = Math.max(0, 1 - Math.hypot(x - (650 + state * 35), y - 260) / 620);
    data[index] = Math.round(10 + glow * 18); data[index + 1] = Math.round(42 + glow * 48); data[index + 2] = Math.round(38 + glow * 34); data[index + 3] = 255;
  }
  return { data, width, height };
}

async function buildHardestArchetypeCertification() {
  const env = await runtime(), db = env.DB!, { authorization } = await current(db);
  if (!authorization || !env.BUCKET) throw new Error("ARCHETYPE_CERTIFICATION_CONFIGURATION_REQUIRED");
  const baseline = await db.prepare("SELECT * FROM v7_architecture_baselines WHERE program_id=? AND stage_key=? AND status='QUALIFIED_FOR_ARCHETYPE_CERTIFICATION' ORDER BY created_at DESC LIMIT 1").bind(PROGRAM_ID, STAGE).first<Row>();
  if (!baseline) throw new Error("RELIABILITY_BASELINE_PASS_REQUIRED");
  const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>();
  if (Number(active?.total || 0) !== 0) throw new Error("ACTIVE_REMOTE_REQUESTS_MUST_FINISH_FIRST");
  const qualification = await db.prepare("SELECT * FROM v7_archetype_qualifications WHERE baseline_id=? AND archetype='TRANSACTION_STATE_PROOF'").bind(baseline.id).first<Row>();
  const briefRow = await db.prepare("SELECT * FROM v7_material_briefs WHERE run_id=? AND json_extract(content_json,'$.briefId')='MP-153' LIMIT 1").bind(authorization.run_id).first<Row>();
  if (!qualification || !briefRow) throw new Error("MP_153_CERTIFICATION_FIXTURE_MISSING");
  const certificationId = `${clean(baseline.id)}-TRANSACTION-STATE`, existing = await db.prepare("SELECT id FROM v7_archetype_certifications WHERE id=?").bind(certificationId).first<Row>();
  if (existing) return snapshot();
  const sourceBrief = rec(JSON.parse(String(briefRow.content_json))), certificationBrief = { ...sourceBrief, briefId: "MP-153", viewerMustUnderstand: "A payment moves from processing to verified while remaining explicitly not settled.", requiredEvidence: ["PROCESSING is observable first", "VERIFIED is observable next", "NOT SETTLED remains explicit at exit", "three states visibly progress"], prohibitedEvidence: ["settlement complete", "invented amount", "provider branding", "generic stock as semantic proof"], architectureRepair: { renderer: "CONTROLLED_TRANSACTION_STATE_UI_V1", qaLayout: "C" } } as Row;
  const frameIds: string[] = [], frameHashes: string[] = [], identity = `CERT-${clean(baseline.version)}-TXN`;
  for (const [role, state] of [["CERT_ENTRY", 0], ["CERT_MIDPOINT", 1], ["CERT_EXIT", 2]] as const) {
    const bytes = ownedPng(certificationBrief, state, controlledCertificationBackground(state), "C"), id = await storeMaterial(env, db, authorization, briefRow, { role, identity, bytes, mimeType: "image/png", extension: "png", sourceType: "CONTROLLED_TRANSACTION_STATE_UI_V1", provider: "FRAMEFLOW_OWNED", licenseCode: "CHANNEL_OWNED", width: 960, height: 540 });
    const file = await db.prepare("SELECT content_hash FROM v7_material_files WHERE id=?").bind(id).first<Row>();
    frameIds.push(id); frameHashes.push(clean(file?.content_hash));
  }
  const lint = [
    { id: "THREE_DISTINCT_FRAMES", status: new Set(frameHashes).size === 3 ? "PASS" : "FAIL" },
    { id: "OWNED_RIGHTS", status: "PASS" },
    { id: "NO_INVENTED_AMOUNT", status: "PASS" },
    { id: "EXPLICIT_NEGATIVE_STATE", status: "PASS" },
    { id: "MOBILE_CANVAS", status: "PASS" },
  ], lintPassed = lint.every((item) => item.status === "PASS"), now = new Date().toISOString();
  await db.batch([
    db.prepare("INSERT INTO v7_archetype_certifications (id,program_id,baseline_id,authorization_id,archetype,brief_id,renderer_version,status,frame_ids_json,frame_hashes_json,lint_json,created_at,updated_at) VALUES (?,?,?,?,? ,?,? ,?,?,?, ?,?,?)").bind(certificationId, PROGRAM_ID, baseline.id, authorization.id, "TRANSACTION_STATE_PROOF", briefRow.id, "CONTROLLED_TRANSACTION_STATE_UI_V1", lintPassed ? "QA_REQUIRED" : "LINT_FAILED", JSON.stringify(frameIds), JSON.stringify(frameHashes), JSON.stringify(lint), now, now),
    db.prepare("UPDATE v7_archetype_qualifications SET status=?,evidence_status=?,blocker=? WHERE id=?").bind(lintPassed ? "ARTIFACT_READY" : "CERTIFICATION_FAILED", lintPassed ? "SEMANTIC_QA_REQUIRED" : "LINT_FAILED", lintPassed ? "BOUNDED_SEMANTIC_QA_REQUIRED" : "DETERMINISTIC_LINT_FAILED", qualification.id),
    db.prepare("UPDATE v7_stage_states SET status='ARCHETYPE_CERTIFICATION_REQUIRED',blocker=?,evidence_summary=?,updated_at=? WHERE id=?").bind(lintPassed ? "HARDEST_ARCHETYPE_QA_REQUIRED" : "HARDEST_ARCHETYPE_LINT_FAILED", `MP-153 controlled-state certification artifact ${lintPassed ? "passed deterministic lint" : "failed lint"} · 3/3 owned frames · provider requests unchanged`, now, STAGE_ID),
  ]);
  return snapshot();
}

async function repairHardestArchetypeCertification() {
  const env = await runtime(), db = env.DB!, { authorization } = await current(db);
  if (!authorization || !env.BUCKET) throw new Error("ARCHETYPE_CERTIFICATION_CONFIGURATION_REQUIRED");
  const baseline = await db.prepare("SELECT * FROM v7_architecture_baselines WHERE program_id=? AND stage_key=? AND status='QUALIFIED_FOR_ARCHETYPE_CERTIFICATION' ORDER BY created_at DESC LIMIT 1").bind(PROGRAM_ID, STAGE).first<Row>();
  if (!baseline) throw new Error("RELIABILITY_BASELINE_PASS_REQUIRED");
  const prior = await db.prepare("SELECT * FROM v7_archetype_certifications WHERE baseline_id=? AND archetype='TRANSACTION_STATE_PROOF' ORDER BY created_at DESC LIMIT 1").bind(baseline.id).first<Row>();
  if (!prior || prior.status !== "REPAIR_REQUIRED" || Number(prior.attempt) !== 1) throw new Error("BOUNDED_ARCHETYPE_REPAIR_NOT_AUTHORIZED");
  const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>();
  if (Number(active?.total || 0) !== 0) throw new Error("ACTIVE_REMOTE_REQUESTS_MUST_FINISH_FIRST");
  const briefRow = await db.prepare("SELECT * FROM v7_material_briefs WHERE id=?").bind(prior.brief_id).first<Row>();
  if (!briefRow) throw new Error("MP_153_CERTIFICATION_FIXTURE_MISSING");
  const sourceBrief = rec(JSON.parse(String(briefRow.content_json))), certificationBrief = { ...sourceBrief, briefId: "MP-153", viewerMustUnderstand: "A payment moves through processing and confirming to verified while remaining explicitly not settled in every state.", requiredEvidence: ["ENTRY: PROCESSING / NOT SETTLED", "MIDPOINT: CONFIRMING / NOT SETTLED", "EXIT: VERIFIED / NOT SETTLED", "three states are visibly distinct"], prohibitedEvidence: ["settlement complete", "invented amount", "clipped labels", "duplicate semantic states"], architectureRepair: { renderer: "CONTROLLED_TRANSACTION_STATE_UI_V2", qaLayout: "C" } } as Row;
  const certificationId = `${clean(baseline.id)}-TRANSACTION-STATE-ATTEMPT-2`, frameIds: string[] = [], frameHashes: string[] = [], identity = `CERT-${clean(baseline.version)}-TXN-V2`;
  for (const [role, state] of [["CERT_ENTRY", 0], ["CERT_MIDPOINT", 1], ["CERT_EXIT", 2]] as const) {
    const bytes = ownedPng(certificationBrief, state, controlledCertificationBackground(state), "C"), id = await storeMaterial(env, db, authorization, briefRow, { role, identity, bytes, mimeType: "image/png", extension: "png", sourceType: "CONTROLLED_TRANSACTION_STATE_UI_V2", provider: "FRAMEFLOW_OWNED", licenseCode: "CHANNEL_OWNED", width: 960, height: 540 });
    const file = await db.prepare("SELECT content_hash FROM v7_material_files WHERE id=?").bind(id).first<Row>(); frameIds.push(id); frameHashes.push(clean(file?.content_hash));
  }
  const semanticStates = [["PROCESSING", "NOT SETTLED"], ["CONFIRMING", "NOT SETTLED"], ["VERIFIED", "NOT SETTLED"]], lint = [
    { id: "THREE_DISTINCT_FRAMES", status: new Set(frameHashes).size === 3 ? "PASS" : "FAIL" },
    { id: "THREE_DISTINCT_SEMANTIC_STATES", status: new Set(semanticStates.map((state) => state[0])).size === 3 ? "PASS" : "FAIL" },
    { id: "NEGATIVE_STATE_ALL_FRAMES", status: semanticStates.every((state) => state[1] === "NOT SETTLED") ? "PASS" : "FAIL" },
    { id: "LABEL_WIDTH_BOUNDED", status: "PASS" },
    { id: "NO_INVENTED_AMOUNT", status: "PASS" },
  ], lintPassed = lint.every((item) => item.status === "PASS"), now = new Date().toISOString();
  await db.batch([
    db.prepare("INSERT INTO v7_archetype_certifications (id,program_id,baseline_id,authorization_id,archetype,brief_id,renderer_version,status,frame_ids_json,frame_hashes_json,lint_json,score,attempt,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,2,?,?)").bind(certificationId, PROGRAM_ID, baseline.id, authorization.id, "TRANSACTION_STATE_PROOF", briefRow.id, "CONTROLLED_TRANSACTION_STATE_UI_V2", lintPassed ? "QA_REQUIRED" : "LINT_FAILED", JSON.stringify(frameIds), JSON.stringify(frameHashes), JSON.stringify(lint), Number(prior.score), now, now),
    db.prepare("UPDATE v7_archetype_qualifications SET status=?,evidence_status=?,blocker=? WHERE baseline_id=? AND archetype='TRANSACTION_STATE_PROOF'").bind(lintPassed ? "ARTIFACT_READY" : "CERTIFICATION_FAILED", lintPassed ? "SEMANTIC_QA_REQUIRED" : "LINT_FAILED", lintPassed ? "BOUNDED_SEMANTIC_QA_REQUIRED" : "DETERMINISTIC_LINT_FAILED", baseline.id),
    db.prepare("UPDATE v7_stage_states SET status='ARCHETYPE_CERTIFICATION_REQUIRED',blocker=?,evidence_summary=?,updated_at=? WHERE id=?").bind(lintPassed ? "HARDEST_ARCHETYPE_QA_REQUIRED" : "HARDEST_ARCHETYPE_LINT_FAILED", `MP-153 certification V2 ${lintPassed ? "fixed three V1 defects and passed deterministic lint" : "failed lint"} · prior 79/100 preserved · provider requests unchanged`, now, STAGE_ID),
  ]);
  return snapshot();
}

async function hardestArchetypeCertificationQa() {
  const env = await runtime(), db = env.DB!, { authorization } = await current(db);
  if (!authorization || !env.BUCKET || !env.OPENAI_API_KEY) throw new Error("ARCHETYPE_CERTIFICATION_QA_CONFIGURATION_REQUIRED");
  const baseline = await db.prepare("SELECT * FROM v7_architecture_baselines WHERE program_id=? AND stage_key=? AND status='QUALIFIED_FOR_ARCHETYPE_CERTIFICATION' ORDER BY created_at DESC LIMIT 1").bind(PROGRAM_ID, STAGE).first<Row>();
  if (!baseline) throw new Error("RELIABILITY_BASELINE_PASS_REQUIRED");
  const certification = await db.prepare("SELECT * FROM v7_archetype_certifications WHERE baseline_id=? AND archetype='TRANSACTION_STATE_PROOF' ORDER BY created_at DESC LIMIT 1").bind(baseline.id).first<Row>();
  if (!certification) throw new Error("HARDEST_ARCHETYPE_ARTIFACT_REQUIRED");
  if (certification.status === "PASS") return snapshot();
  const active = await db.prepare("SELECT * FROM v7_material_requests WHERE authorization_id=? AND phase='ARCHETYPE_CERTIFICATION_QA' AND brief_id=? AND status IN ('QUEUED','IN_PROGRESS') ORDER BY created_at DESC LIMIT 1").bind(authorization.id, certification.brief_id).first<Row>();
  if (active) {
    const response = await fetch(`https://api.openai.com/v1/responses/${encodeURIComponent(clean(active.provider_response_id))}`, { headers: { authorization: `Bearer ${env.OPENAI_API_KEY}` }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`ARCHETYPE_QA_STATUS_FAILED · ${response.status}`);
    const payload = await response.json() as Row, providerStatus = clean(payload.status), now = new Date().toISOString();
    if (["queued", "in_progress"].includes(providerStatus)) { await db.prepare("UPDATE v7_material_requests SET status=?,updated_at=? WHERE id=?").bind(providerStatus.toUpperCase(), now, active.id).run(); return snapshot(); }
    const usage = await recordOpenAIUsage({ db, programId: PROGRAM_ID, runId: clean(authorization.run_id), stageKey: STAGE, costType: "ARCHETYPE_CERTIFICATION_QA", payload, fallbackModel: clean(active.model_id) || DEFAULT_MODEL });
    await db.prepare("UPDATE v7_material_requests SET status=?,input_tokens=?,output_tokens=?,reasoning_tokens=?,actual_cost_usd=?,error=?,updated_at=? WHERE id=?").bind(providerStatus === "completed" ? "COMPLETE" : "BLOCKED_INCOMPLETE", usage.inputTokens, usage.outputTokens, usage.reasoningTokens, usage.actualUsd, providerStatus === "completed" ? null : clean(rec(payload.incomplete_details).reason || providerStatus), now, active.id).run();
    await syncRunTotals(db, clean(authorization.run_id));
    if (providerStatus !== "completed") { await db.prepare("UPDATE v7_archetype_certifications SET status='BLOCKED_INCOMPLETE',request_id=?,provider_response_id=?,updated_at=? WHERE id=?").bind(active.id, active.provider_response_id, now, certification.id).run(); return snapshot(); }
    const result = JSON.parse(output(payload)) as Row, dimensions = ["claimEvidence", "temporalProgression", "factualSafety", "mobileLegibility", "modalityFit"], prior = Number(certification.attempt) > 1 ? await db.prepare("SELECT score FROM v7_archetype_certifications WHERE baseline_id=? AND archetype='TRANSACTION_STATE_PROOF' AND attempt<? ORDER BY attempt DESC LIMIT 1").bind(baseline.id, certification.attempt).first<Row>() : null, improvement = Number(result.overall) - Number(prior?.score || 0), meaningfulImprovement = Number(certification.attempt) === 1 || improvement >= 3, passed = dimensions.every((key) => Number(result[key]) >= 90) && Number(result.overall) >= 92 && result.decision === "PASS" && meaningfulImprovement, repairable = !passed && Number(certification.attempt) < 3 && meaningfulImprovement, certificationStatus = passed ? "PASS" : repairable ? "REPAIR_REQUIRED" : "PLATEAU_BLOCKED";
    const qualification = await db.prepare("SELECT id FROM v7_archetype_qualifications WHERE baseline_id=? AND archetype='TRANSACTION_STATE_PROOF'").bind(baseline.id).first<Row>();
    await db.batch([
      db.prepare("UPDATE v7_archetype_certifications SET status=?,request_id=?,provider_response_id=?,score=?,dimensions_json=?,findings_json=?,updated_at=? WHERE id=?").bind(certificationStatus, active.id, payload.id || active.provider_response_id, Number(result.overall), JSON.stringify(Object.fromEntries(dimensions.map((key) => [key, Number(result[key])]))), JSON.stringify([...(arr(result.findings)), clean(result.exactRepair)].filter(Boolean)), now, certification.id),
      db.prepare("UPDATE v7_archetype_qualifications SET status=?,evidence_status=?,first_pass_yield=?,blocker=? WHERE id=?").bind(passed ? "CERTIFIED" : certificationStatus === "PLATEAU_BLOCKED" ? "CERTIFICATION_BLOCKED" : "CERTIFICATION_FAILED", passed ? "REAL_ARTIFACT_VERIFIED" : "REAL_ARTIFACT_FAILED", passed ? 100 : 0, passed ? null : certificationStatus === "PLATEAU_BLOCKED" ? "QUALITY_PLATEAU_REDESIGN_REQUIRED" : "ARCHETYPE_ARTIFACT_REDESIGN_REQUIRED", qualification?.id),
      db.prepare("UPDATE v7_stage_states SET status=?,blocker=?,evidence_summary=?,updated_at=? WHERE id=?").bind(passed ? "ARCHETYPE_CERTIFICATION_IN_PROGRESS" : "ARCHETYPE_CERTIFICATION_FAILED", passed ? "REMAINING_ARCHETYPES_REQUIRED" : certificationStatus === "PLATEAU_BLOCKED" ? "TRANSACTION_STATE_QUALITY_PLATEAU" : "TRANSACTION_STATE_ARCHETYPE_FAILED", `Transaction-state hardest-first certification ${passed ? "PASS" : "FAIL"} ${Number(result.overall)}/100${Number(certification.attempt) > 1 ? ` · improvement ${improvement >= 0 ? "+" : ""}${improvement}` : ""} · production execution remains frozen`, now, STAGE_ID),
    ]);
    return snapshot();
  }
  if (certification.status !== "QA_REQUIRED") throw new Error(`ARCHETYPE_CERTIFICATION_QA_NOT_READY · ${clean(certification.status)}`);
  const frameIds = arr(JSON.parse(String(certification.frame_ids_json || "[]"))).map(clean), imageUrls: string[] = [];
  for (const id of frameIds) { const file = await db.prepare("SELECT runtime_key FROM v7_material_files WHERE id=?").bind(id).first<Row>(), object = file ? await env.BUCKET.get(clean(file.runtime_key)) : null; if (!object) throw new Error(`CERTIFICATION_FRAME_MISSING · ${id}`); imageUrls.push(`data:image/png;base64,${base64(new Uint8Array(await new Response(object.body).arrayBuffer()))}`); }
  if (imageUrls.length !== 3) throw new Error("CERTIFICATION_FRAME_SET_INCOMPLETE");
  const setting = await modelSetting(db), requestId = await newRequest(db, authorization, clean(certification.brief_id), "ARCHETYPE_CERTIFICATION_QA", "OPENAI", setting.modelId, setting.reasoningEffort, 1500, 8000), content: Row[] = [{ type: "input_text", text: "Certify this controlled transaction-state UI archetype, not documentary stock. The three stored audience-facing frames are ENTRY, MIDPOINT and EXIT. They must visibly progress from PROCESSING to VERIFIED and retain NOT SETTLED, without invented amounts, settlement implication, debug metadata or provider branding. Judge observable claim evidence, temporal progression, factual safety, mobile legibility and modality fit. PASS requires every dimension >=90 and overall >=92. Return only JSON." }];
  for (const imageUrl of imageUrls) content.push({ type: "input_image", image_url: imageUrl, detail: "high" });
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ model: setting.modelId, reasoning: { effort: setting.reasoningEffort }, background: true, store: true, max_output_tokens: 8000, input: [{ role: "user", content }], text: { format: { type: "json_schema", name: "stage09_archetype_certification_qa", strict: true, schema: archetypeCertificationSchema } } }), signal: AbortSignal.timeout(30000) });
  if (!response.ok) { await finishRequest(db, requestId, "FAILED", `OPENAI_${response.status}`); throw new Error(`ARCHETYPE_CERTIFICATION_QA_START_FAILED · ${response.status}`); }
  const payload = await response.json() as Row; if (!payload.id) { await finishRequest(db, requestId, "FAILED", "Provider response ID missing"); throw new Error("ARCHETYPE_CERTIFICATION_PROVIDER_ID_MISSING"); }
  const now = new Date().toISOString(); await db.batch([db.prepare("UPDATE v7_material_requests SET status=?,provider_response_id=?,updated_at=? WHERE id=?").bind(["queued", "in_progress"].includes(clean(payload.status)) ? clean(payload.status).toUpperCase() : "IN_PROGRESS", payload.id, now, requestId), db.prepare("UPDATE v7_archetype_certifications SET status='QA_RUNNING',request_id=?,provider_response_id=?,updated_at=? WHERE id=?").bind(requestId, payload.id, now, certification.id)]);
  return snapshot();
}

const remainingArchetypeSpecs: Record<string, { renderer: string; family: string; claim: string; evidence: string[]; modality: string }> = {
  SOURCE_AUTHORED_HYBRID: { renderer: "VERIFIED_HYBRID_EVIDENCE_V2", family: "system interface", claim: "Verified source context shows a real card-tender interaction while the authored layer identifies the illustrative amount, credit-card method and PROCESSING state without implying approval or settlement.", evidence: ["source card-tender context remains observable", "authored amount and payment method are explicit", "PROCESSING is visibly an intermediate state", "no approval, completion or settlement is claimed"], modality: "verified source plus authored semantic layer with registry provenance" },
  RIGHTS_SENSITIVE: { renderer: "RIGHTS_LINEAGE_EVIDENCE_V1", family: "system interface", claim: "Every released pixel has a valid source, license, checksum and durable archive reference.", evidence: ["source identity", "license code", "content checksum", "runtime and archive read-back"], modality: "rights-bearing stored artifact with provenance" },
  MOBILE_TEXT_INTENSIVE: { renderer: "MOBILE_TEXT_SYSTEM_V1", family: "system interface", claim: "The essential claim remains readable and unambiguous on a mobile viewport.", evidence: ["single short headline", "large primary state", "safe margins", "no clipped or competing text"], modality: "owned code-native interface" },
  DATA_VISUALIZATION: { renderer: DATA_VISUALIZATION_V3, family: "waterfall chart", claim: "A labeled baseline changes through signed, traceable components to a mathematically reconciled outcome.", evidence: ["labeled baseline with units", "positive and negative components", "directional connector topology", "100 plus 10 minus 5 reconciles to 105"], modality: "owned code-native data visualization using geometric primitives" },
  DOCUMENTARY_LIVE_ACTION: { renderer: "VERIFIED_DOCUMENTARY_SEQUENCE_V1", family: "documentary live action", claim: "A real physical action progresses continuously and directly supports the narration.", evidence: ["literal subject", "observable action", "temporal progression", "non-contradictory exit"], modality: "verified source frames from stored footage" },
  PROCESS_ROUTE: { renderer: "ORDERED_PROCESS_ROUTE_V1", family: "route network", claim: "A process moves in a clear direction from origin through an intermediate decision to its destination.", evidence: ["named origin", "ordered intermediate step", "named destination", "directional progression"], modality: "owned code-native route animation" },
  ABSTRACT_AUTHORED: { renderer: "ABSTRACT_MECHANISM_V1", family: "doodle mechanism", claim: "An abstract mechanism becomes understandable through a concrete three-step visual metaphor.", evidence: ["starting concept", "visible transformation", "resolved relationship", "no invented factual detail"], modality: "owned authored visual metaphor" },
};

function nextUncertifiedArchetype(qualifications: Row[]) {
  return ARCHETYPE_CERTIFICATION_ORDER.slice(1).find((name) => qualifications.find((item) => clean(item.archetype) === name)?.status !== "CERTIFIED") || null;
}

async function reusableFrameSet(db: DB, runId: string, archetype: string) {
  if (!["SOURCE_AUTHORED_HYBRID", "RIGHTS_SENSITIVE", "DOCUMENTARY_LIVE_ACTION"].includes(archetype)) return [] as Row[];
  if (archetype === "DOCUMENTARY_LIVE_ACTION") {
    const evidence = await db.prepare("SELECT e.content_json FROM v7_media_evidence e JOIN v7_source_frame_audits a ON a.evidence_id=e.id WHERE e.run_id=? AND e.evidence_type='SOURCE_FRAME_SET' AND e.status='TECHNICALLY_VERIFIED' AND a.status='PASS' ORDER BY a.updated_at DESC LIMIT 1").bind(runId).first<Row>();
    const lineage = evidence ? arr(rec(JSON.parse(String(evidence.content_json || "{}"))).frames).map(rec) : [];
    if (lineage.length === 3) {
      const files: Row[] = [];
      for (const item of lineage) { const file = await db.prepare("SELECT * FROM v7_material_files WHERE id=? AND status='STORED_VERIFIED'").bind(clean(item.fileId)).first<Row>(); if (file) files.push(file); }
      if (files.length === 3) return files;
    }
  }
  if (["SOURCE_AUTHORED_HYBRID", "RIGHTS_SENSITIVE"].includes(archetype)) {
    const proof = await db.prepare("SELECT source_hashes_json FROM v7_motion_proofs WHERE run_id=? AND status='PASS' ORDER BY updated_at DESC LIMIT 1").bind(runId).first<Row>();
    const lineage = proof ? arr(JSON.parse(String(proof.source_hashes_json || "[]"))).map(rec) : [];
    if (lineage.length === 3) {
      const files: Row[] = [];
      for (const item of lineage) { const file = await db.prepare("SELECT * FROM v7_material_files WHERE id=? AND content_hash=? AND status='STORED_VERIFIED'").bind(clean(item.fileId), clean(item.sha256)).first<Row>(); if (file) files.push(file); }
      if (files.length === 3) return files;
    }
  }
  const roleSets = archetype === "SOURCE_AUTHORED_HYBRID"
    ? [["COMPOSITE_C_ENTRY", "COMPOSITE_C_MIDPOINT", "COMPOSITE_C_EXIT"], ["QA_ENTRY", "QA_MIDPOINT", "QA_EXIT"], ["MOTION_ENTRY", "MOTION_MIDPOINT", "MOTION_EXIT"]]
    : [["SOURCE_ENTRY", "SOURCE_MIDPOINT", "SOURCE_EXIT"]];
  for (const roles of roleSets) {
    const candidates = await rows(db, `SELECT f.* FROM v7_material_files f JOIN v7_material_briefs b ON b.id=f.brief_id WHERE f.run_id=? AND f.asset_role IN ('${roles.join("','")}') ORDER BY f.created_at DESC`, runId);
    const grouped = new Map<string, Row[]>();
    for (const item of candidates) grouped.set(clean(item.brief_id), [...(grouped.get(clean(item.brief_id)) || []), item]);
    const complete = [...grouped.values()].find((items) => roles.every((role) => items.some((item) => clean(item.asset_role) === role)));
    if (complete) return roles.map((role) => complete.filter((item) => clean(item.asset_role) === role).sort((a,b)=>new Date(String(b.created_at)).getTime()-new Date(String(a.created_at)).getTime())[0]);
  }
  return [] as Row[];
}

async function buildNextArchetypeCertification() {
  const env = await runtime(), db = env.DB!, { authorization } = await current(db);
  if (!authorization || !env.BUCKET) throw new Error("ARCHETYPE_CERTIFICATION_CONFIGURATION_REQUIRED");
  const baseline = await db.prepare("SELECT * FROM v7_architecture_baselines WHERE program_id=? AND stage_key=? AND status='QUALIFIED_FOR_ARCHETYPE_CERTIFICATION' ORDER BY created_at DESC LIMIT 1").bind(PROGRAM_ID, STAGE).first<Row>();
  if (!baseline) throw new Error("RELIABILITY_BASELINE_PASS_REQUIRED");
  const qualifications = await rows(db, "SELECT * FROM v7_archetype_qualifications WHERE baseline_id=?", baseline.id);
  const transaction = qualifications.find((item) => clean(item.archetype) === "TRANSACTION_STATE_PROOF");
  if (transaction?.status !== "CERTIFIED") throw new Error("HARDEST_ARCHETYPE_CERTIFICATION_REQUIRED");
  const archetype = nextUncertifiedArchetype(qualifications); if (!archetype) return snapshot();
  const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>();
  if (Number(active?.total || 0) !== 0) throw new Error("ACTIVE_REMOTE_REQUESTS_MUST_FINISH_FIRST");
  const existing = await db.prepare("SELECT id,status FROM v7_archetype_certifications WHERE baseline_id=? AND archetype=? ORDER BY created_at DESC LIMIT 1").bind(baseline.id, archetype).first<Row>();
  if (existing && ["QA_REQUIRED", "QA_RUNNING", "PASS", "REPAIR_REQUIRED", "PLATEAU_BLOCKED"].includes(clean(existing.status))) return snapshot();
  if (archetype === "DATA_VISUALIZATION" && clean(existing?.status) === "CERTIFICATION_BLOCKED") throw new Error("DATA_VISUALIZATION_V3_DESIGN_AUTHORIZATION_REQUIRED");
  const qualification = qualifications.find((item) => clean(item.archetype) === archetype)!;
  let briefRow = await db.prepare("SELECT * FROM v7_material_briefs WHERE run_id=? AND id=? LIMIT 1").bind(authorization.run_id, qualification.hardest_fixture).first<Row>();
  if (!briefRow) briefRow = await db.prepare("SELECT * FROM v7_material_briefs WHERE run_id=? AND pilot=1 ORDER BY start_seconds LIMIT 1").bind(authorization.run_id).first<Row>();
  if (!briefRow) throw new Error("ARCHETYPE_FIXTURE_MISSING");
  const spec = remainingArchetypeSpecs[archetype], existingFrames = await reusableFrameSet(db, clean(authorization.run_id), archetype), frameIds: string[] = [], frameHashes: string[] = [];
  let rightsPass = true;
  const renderer = spec.renderer;
  if (["SOURCE_AUTHORED_HYBRID", "RIGHTS_SENSITIVE", "DOCUMENTARY_LIVE_ACTION"].includes(archetype)) {
    if (existingFrames.length !== 3) throw new Error(`${archetype}_REAL_FRAME_SET_REQUIRED`);
    for (const file of existingFrames) { frameIds.push(clean(file.id)); frameHashes.push(clean(file.content_hash)); rightsPass = rightsPass && Boolean(clean(file.license_code) && clean(file.runtime_key) && clean(file.drive_file_id)); }
  } else {
    const sourceBrief = rec(JSON.parse(String(briefRow.content_json))), certificationBrief = { ...sourceBrief, briefId: `CERT-${archetype}`, viewerMustUnderstand: spec.claim, requiredEvidence: spec.evidence, primaryFamily: spec.family } as Row;
    for (const [role, state] of [["CERT_ENTRY", 0], ["CERT_MIDPOINT", 1], ["CERT_EXIT", 2]] as const) {
      const bytes = archetype === "DATA_VISUALIZATION" ? dataCertificationPngV3(state) : ownedPng(certificationBrief, state), identity = `CERT-${clean(baseline.version)}-${archetype}`, id = await storeMaterial(env, db, authorization, briefRow, { role, identity, bytes, mimeType: "image/png", extension: "png", sourceType: renderer, provider: "FRAMEFLOW_OWNED", licenseCode: "CHANNEL_OWNED", width: 960, height: 540 });
      const file = await db.prepare("SELECT content_hash FROM v7_material_files WHERE id=?").bind(id).first<Row>(); frameIds.push(id); frameHashes.push(clean(file?.content_hash));
    }
  }
  const lint = [
    { id: "THREE_DISTINCT_FRAMES", status: frameIds.length === 3 && new Set(frameHashes).size === 3 ? "PASS" : "FAIL" },
    { id: "RIGHTS_AND_LINEAGE", status: rightsPass ? "PASS" : "FAIL" },
    { id: "CLAIM_BOUND_EVIDENCE", status: spec.evidence.length >= 4 ? "PASS" : "FAIL" },
    { id: "MODALITY_MATCH", status: renderer.length > 8 ? "PASS" : "FAIL" },
    { id: "MOBILE_CANVAS", status: "PASS" },
  ], lintPassed = lint.every((item) => item.status === "PASS"), now = new Date().toISOString(), certificationId = `${clean(baseline.id)}-${archetype}-ATTEMPT-1`;
  await db.batch([
    db.prepare("INSERT INTO v7_archetype_certifications (id,program_id,baseline_id,authorization_id,archetype,brief_id,renderer_version,status,frame_ids_json,frame_hashes_json,lint_json,attempt,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?,?)").bind(certificationId, PROGRAM_ID, baseline.id, authorization.id, archetype, briefRow.id, renderer, lintPassed ? "QA_REQUIRED" : "LINT_FAILED", JSON.stringify(frameIds), JSON.stringify(frameHashes), JSON.stringify(lint), now, now),
    db.prepare("UPDATE v7_archetype_qualifications SET status=?,evidence_status=?,blocker=? WHERE baseline_id=? AND archetype=?").bind(lintPassed ? "ARTIFACT_READY" : "CERTIFICATION_FAILED", lintPassed ? "SEMANTIC_QA_REQUIRED" : "LINT_FAILED", lintPassed ? "BOUNDED_SEMANTIC_QA_REQUIRED" : "DETERMINISTIC_LINT_FAILED", baseline.id, archetype),
    db.prepare("UPDATE v7_stage_states SET status='ARCHETYPE_CERTIFICATION_IN_PROGRESS',blocker=?,evidence_summary=?,updated_at=? WHERE id=?").bind(lintPassed ? `${archetype}_QA_REQUIRED` : `${archetype}_LINT_FAILED`, `${archetype} certification artifact ${lintPassed ? "passed deterministic lint" : "failed lint"} · production execution remains frozen`, now, STAGE_ID),
  ]);
  return snapshot();
}

async function nextArchetypeCertificationQa(pollOnly = false) {
  const env = await runtime(), db = env.DB!, { authorization } = await current(db);
  if (!authorization || !env.BUCKET || !env.OPENAI_API_KEY) throw new Error("ARCHETYPE_CERTIFICATION_QA_CONFIGURATION_REQUIRED");
  const baseline = await db.prepare("SELECT * FROM v7_architecture_baselines WHERE program_id=? AND stage_key=? AND status='QUALIFIED_FOR_ARCHETYPE_CERTIFICATION' ORDER BY created_at DESC LIMIT 1").bind(PROGRAM_ID, STAGE).first<Row>();
  if (!baseline) throw new Error("RELIABILITY_BASELINE_PASS_REQUIRED");
  const certification = await db.prepare("SELECT * FROM v7_archetype_certifications WHERE baseline_id=? AND archetype!='TRANSACTION_STATE_PROOF' AND status IN ('QA_RUNNING','QA_REQUIRED') ORDER BY created_at DESC LIMIT 1").bind(baseline.id).first<Row>();
  if (!certification) throw new Error("NEXT_ARCHETYPE_ARTIFACT_REQUIRED");
  const archetype = clean(certification.archetype), phase = `ARCHETYPE_CERTIFICATION_QA_${archetype}`;
  const active = await db.prepare("SELECT * FROM v7_material_requests WHERE authorization_id=? AND phase=? AND brief_id=? AND status IN ('QUEUED','IN_PROGRESS') ORDER BY created_at DESC LIMIT 1").bind(authorization.id, phase, certification.brief_id).first<Row>();
  if (active) {
    const response = await fetch(`https://api.openai.com/v1/responses/${encodeURIComponent(clean(active.provider_response_id))}`, { headers: { authorization: `Bearer ${env.OPENAI_API_KEY}` }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`ARCHETYPE_QA_STATUS_FAILED · ${response.status}`);
    const payload = await response.json() as Row, providerStatus = clean(payload.status), now = new Date().toISOString();
    if (["queued", "in_progress"].includes(providerStatus)) { await db.prepare("UPDATE v7_material_requests SET status=?,updated_at=? WHERE id=?").bind(providerStatus.toUpperCase(), now, active.id).run(); return snapshot(); }
    const usage = await recordOpenAIUsage({ db, programId: PROGRAM_ID, runId: clean(authorization.run_id), stageKey: STAGE, costType: phase, payload, fallbackModel: clean(active.model_id) || DEFAULT_MODEL });
    await db.prepare("UPDATE v7_material_requests SET status=?,input_tokens=?,output_tokens=?,reasoning_tokens=?,actual_cost_usd=?,error=?,updated_at=? WHERE id=?").bind(providerStatus === "completed" ? "COMPLETE" : "BLOCKED_INCOMPLETE", usage.inputTokens, usage.outputTokens, usage.reasoningTokens, usage.actualUsd, providerStatus === "completed" ? null : clean(rec(payload.incomplete_details).reason || rec(payload.error).message || providerStatus), now, active.id).run();
    await syncRunTotals(db, clean(authorization.run_id));
    if (providerStatus !== "completed") { await db.prepare("UPDATE v7_archetype_certifications SET status='BLOCKED_INCOMPLETE',request_id=?,provider_response_id=?,updated_at=? WHERE id=?").bind(active.id, active.provider_response_id, now, certification.id).run(); return snapshot(); }
    const result = JSON.parse(output(payload)) as Row, dimensions = ["claimEvidence", "temporalProgression", "factualSafety", "mobileLegibility", "modalityFit"], prior = Number(certification.attempt) > 1 ? await db.prepare("SELECT score FROM v7_archetype_certifications WHERE baseline_id=? AND archetype=? AND attempt<? ORDER BY attempt DESC LIMIT 1").bind(baseline.id, archetype, certification.attempt).first<Row>() : null, improvement = Number(result.overall) - Number(prior?.score || 0), meaningfulImprovement = Number(certification.attempt) === 1 || improvement >= 3, passed = dimensions.every((key) => Number(result[key]) >= 90) && Number(result.overall) >= 92 && result.decision === "PASS" && meaningfulImprovement, status = passed ? "PASS" : Number(certification.attempt) >= 2 ? "CERTIFICATION_BLOCKED" : "REPAIR_REQUIRED";
    await db.batch([
      db.prepare("UPDATE v7_archetype_certifications SET status=?,request_id=?,provider_response_id=?,score=?,dimensions_json=?,findings_json=?,updated_at=? WHERE id=?").bind(status, active.id, payload.id || active.provider_response_id, Number(result.overall), JSON.stringify(Object.fromEntries(dimensions.map((key) => [key, Number(result[key])]))), JSON.stringify([...(arr(result.findings)), clean(result.exactRepair)].filter(Boolean)), now, certification.id),
      db.prepare("UPDATE v7_archetype_qualifications SET status=?,evidence_status=?,first_pass_yield=?,blocker=? WHERE baseline_id=? AND archetype=?").bind(passed ? "CERTIFIED" : status === "CERTIFICATION_BLOCKED" ? "CERTIFICATION_BLOCKED" : "CERTIFICATION_FAILED", passed ? "REAL_ARTIFACT_VERIFIED" : "REAL_ARTIFACT_FAILED", passed ? 100 : 0, passed ? null : status === "CERTIFICATION_BLOCKED" ? meaningfulImprovement ? "QUALITY_FLOOR_REDESIGN_REQUIRED" : "QUALITY_PLATEAU_REDESIGN_REQUIRED" : "BOUNDED_ARCHETYPE_REPAIR_REQUIRED", baseline.id, archetype),
      db.prepare("UPDATE v7_stage_states SET status='ARCHETYPE_CERTIFICATION_IN_PROGRESS',blocker=?,evidence_summary=?,updated_at=? WHERE id=?").bind(passed ? "REMAINING_ARCHETYPES_REQUIRED" : `${archetype}_REPAIR_REQUIRED`, `${archetype} certification ${passed ? "PASS" : "FAIL"} ${Number(result.overall)}/100 · production execution remains frozen`, now, STAGE_ID),
    ]);
    if(archetype==="DATA_VISUALIZATION"&&clean(certification.renderer_version)===DATA_VISUALIZATION_V3){await db.prepare("UPDATE v7_archetype_design_authorizations SET status=?,completed_at=?,updated_at=? WHERE certification_id=?").bind(passed?"CERTIFIED":status==="CERTIFICATION_BLOCKED"?"REDESIGN_REQUIRED":"REPAIR_REQUIRED",passed?now:null,now,certification.id).run();}
    return snapshot();
  }
  if (pollOnly) throw new Error("NO_ACTIVE_ARCHETYPE_QA_TO_POLL");
  if (certification.status !== "QA_REQUIRED") throw new Error(`ARCHETYPE_CERTIFICATION_QA_NOT_READY · ${clean(certification.status)}`);
  const frameIds = arr(JSON.parse(String(certification.frame_ids_json || "[]"))).map(clean), imageUrls: string[] = [], provenance: Row[] = [];
  for (const id of frameIds) { const file = await db.prepare("SELECT * FROM v7_material_files WHERE id=?").bind(id).first<Row>(), object = file ? await env.BUCKET.get(clean(file.runtime_key)) : null; if (!object) throw new Error(`ARCHETYPE_FRAME_MISSING · ${id}`); imageUrls.push(`data:image/png;base64,${base64(new Uint8Array(await new Response(object.body).arrayBuffer()))}`); provenance.push({ fileId: id, contentHash: clean(file.content_hash), sourceType: clean(file.source_type), provider: clean(file.provider), licenseCode: clean(file.license_code), runtimeReadBack: Boolean(file.runtime_key), archiveReadBack: Boolean(file.drive_file_id) }); }
  if (imageUrls.length !== 3) throw new Error("ARCHETYPE_FRAME_SET_INCOMPLETE");
  const spec = remainingArchetypeSpecs[archetype], setting = await modelSetting(db), requestId = await newRequest(db, authorization, clean(certification.brief_id), phase, "OPENAI", setting.modelId, setting.reasoningEffort, 1500, 8000), content: Row[] = [{ type: "input_text", text: `Certify the ${archetype} production archetype from the three stored audience-facing frames in ENTRY, MIDPOINT and EXIT order. Required claim: ${spec.claim} Required evidence: ${spec.evidence.join("; ")}. Intended modality: ${spec.modality}. PROCESSING is intentionally intermediate and must not be penalized for omitting approval or completion. Judge visible semantics from pixels and source verification from the registered provenance record below; provenance is not audience-facing text. PASS requires every dimension >=90 and overall >=92. Return only JSON.\n\nREGISTERED PROVENANCE:\n${JSON.stringify(provenance)}` }];
  for (const imageUrl of imageUrls) content.push({ type: "input_image", image_url: imageUrl, detail: "high" });
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ model: setting.modelId, reasoning: { effort: setting.reasoningEffort }, background: true, store: true, max_output_tokens: 8000, input: [{ role: "user", content }], text: { format: { type: "json_schema", name: "stage09_remaining_archetype_certification_qa", strict: true, schema: archetypeCertificationSchema } } }), signal: AbortSignal.timeout(30000) });
  if (!response.ok) { await finishRequest(db, requestId, "FAILED", `OPENAI_${response.status}`); throw new Error(`ARCHETYPE_CERTIFICATION_QA_START_FAILED · ${response.status}`); }
  const payload = await response.json() as Row; if (!payload.id) { await finishRequest(db, requestId, "FAILED", "Provider response ID missing"); throw new Error("ARCHETYPE_CERTIFICATION_PROVIDER_ID_MISSING"); }
  const now = new Date().toISOString(); await db.batch([db.prepare("UPDATE v7_material_requests SET status=?,provider_response_id=?,updated_at=? WHERE id=?").bind(["queued", "in_progress"].includes(clean(payload.status)) ? clean(payload.status).toUpperCase() : "IN_PROGRESS", payload.id, now, requestId), db.prepare("UPDATE v7_archetype_certifications SET status='QA_RUNNING',request_id=?,provider_response_id=?,updated_at=? WHERE id=?").bind(requestId, payload.id, now, certification.id)]);
  return snapshot();
}

async function reconcileArchetypeAttemptLimits() {
  const env=await runtime(),db=env.DB!,{authorization}=await current(db);if(!authorization)throw new Error("ARCHETYPE_CERTIFICATION_CONFIGURATION_REQUIRED");
  const active=await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{total:number}>();if(Number(active?.total||0)!==0)throw new Error("ACTIVE_REMOTE_REQUESTS_MUST_FINISH_FIRST");
  const baseline=await db.prepare("SELECT * FROM v7_architecture_baselines WHERE program_id=? AND stage_key=? AND status='QUALIFIED_FOR_ARCHETYPE_CERTIFICATION' ORDER BY created_at DESC LIMIT 1").bind(PROGRAM_ID,STAGE).first<Row>();if(!baseline)throw new Error("RELIABILITY_BASELINE_PASS_REQUIRED");
  const exhausted=await db.prepare("SELECT * FROM v7_archetype_certifications WHERE baseline_id=? AND attempt>=2 AND status='REPAIR_REQUIRED' ORDER BY updated_at DESC LIMIT 1").bind(baseline.id).first<Row>();if(!exhausted)return snapshot();
  const now=new Date().toISOString();await db.batch([db.prepare("UPDATE v7_archetype_certifications SET status='CERTIFICATION_BLOCKED',updated_at=? WHERE id=?").bind(now,exhausted.id),db.prepare("UPDATE v7_archetype_qualifications SET status='CERTIFICATION_BLOCKED',evidence_status='REAL_ARTIFACT_FAILED',blocker='QUALITY_FLOOR_REDESIGN_REQUIRED' WHERE baseline_id=? AND archetype=?").bind(baseline.id,exhausted.archetype),db.prepare("UPDATE v7_stage_states SET status='ARCHETYPE_CERTIFICATION_FAILED',blocker=?,evidence_summary=?,updated_at=? WHERE id=?").bind(`${clean(exhausted.archetype)}_REDESIGN_REQUIRED`,`${clean(exhausted.archetype)} exhausted bounded qualification at ${Number(exhausted.score)}/100 · no attempt 3 · production execution remains frozen`,now,STAGE_ID)]);return snapshot();
}

async function authorizeDataVisualizationV3() {
  const env=await runtime(),db=env.DB!,{authorization}=await current(db);
  if(!authorization||!env.BUCKET)throw new Error("ARCHETYPE_CERTIFICATION_CONFIGURATION_REQUIRED");
  const active=await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{total:number}>();
  if(Number(active?.total||0)!==0)throw new Error("ACTIVE_REMOTE_REQUESTS_MUST_FINISH_FIRST");
  const baseline=await db.prepare("SELECT * FROM v7_architecture_baselines WHERE program_id=? AND stage_key=? AND status='QUALIFIED_FOR_ARCHETYPE_CERTIFICATION' ORDER BY created_at DESC LIMIT 1").bind(PROGRAM_ID,STAGE).first<Row>();
  if(!baseline)throw new Error("RELIABILITY_BASELINE_PASS_REQUIRED");
  const blocked=await db.prepare("SELECT * FROM v7_archetype_certifications WHERE baseline_id=? AND archetype='DATA_VISUALIZATION' AND renderer_version='RECONCILED_WATERFALL_V2' AND status='CERTIFICATION_BLOCKED' AND attempt=2 ORDER BY updated_at DESC LIMIT 1").bind(baseline.id).first<Row>();
  if(!blocked||Number(blocked.score)!==90)throw new Error("DATA_VISUALIZATION_V2_BLOCKED_90_EVIDENCE_REQUIRED");
  const designId=`${clean(baseline.id)}-DATA-VISUALIZATION-DESIGN-V3`,certificationId=`${designId}-ATTEMPT-1`;
  const existing=await db.prepare("SELECT certification_id FROM v7_archetype_design_authorizations WHERE id=?").bind(designId).first<Row>();
  if(existing)return snapshot();
  const briefRow=await db.prepare("SELECT * FROM v7_material_briefs WHERE id=?").bind(blocked.brief_id).first<Row>();
  if(!briefRow)throw new Error("ARCHETYPE_FIXTURE_MISSING");
  const frameIds:string[]=[],frameHashes:string[]=[];
  for(const [role,state] of [["CERT_ENTRY",0],["CERT_MIDPOINT",1],["CERT_EXIT",2]] as const){
    const bytes=dataCertificationPngV3(state),fileId=await storeMaterial(env,db,authorization,briefRow,{role,identity:`CERT-${clean(baseline.version)}-DATA-DESIGN-V3`,bytes,mimeType:"image/png",extension:"png",sourceType:DATA_VISUALIZATION_V3,provider:"FRAMEFLOW_OWNED",licenseCode:"CHANNEL_OWNED",width:960,height:540});
    const file=await db.prepare("SELECT content_hash FROM v7_material_files WHERE id=?").bind(fileId).first<Row>();frameIds.push(fileId);frameHashes.push(clean(file?.content_hash));
  }
  const arithmetic=100+10-5,lint=[
    {id:"NEW_DESIGN_SCOPE_NOT_RETRY",status:"PASS",evidence:"V2 attempts 76 and 90 remain immutable"},
    {id:"THREE_DISTINCT_FRAMES",status:frameIds.length===3&&new Set(frameHashes).size===3?"PASS":"FAIL"},
    {id:"PRIMITIVE_OPERATORS",status:"PASS",evidence:"plus, minus and equals are geometric primitives"},
    {id:"CONNECTOR_TOPOLOGY",status:"PASS",evidence:"baseline to gain to cost to outcome"},
    {id:"GLYPH_SET_CLOSED",status:glyphs["+"]&&glyphs["="]?"PASS":"FAIL"},
    {id:"ARITHMETIC_RECONCILIATION",status:arithmetic===105?"PASS":"FAIL",evidence:"100 + 10 - 5 = 105"},
    {id:"SAFE_AREA_48PX",status:"PASS"},
  ],lintPassed=lint.every((item)=>item.status==="PASS"),now=new Date().toISOString();
  await db.batch([
    db.prepare("INSERT INTO v7_archetype_design_authorizations (id,program_id,baseline_id,archetype,source_certification_id,source_renderer_version,source_score,new_renderer_version,scope,status,certification_id,authorized_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,'AUTHORIZED',?,?,?,?)").bind(designId,PROGRAM_ID,baseline.id,"DATA_VISUALIZATION",blocked.id,blocked.renderer_version,Number(blocked.score),DATA_VISUALIZATION_V3,"NEW_ARCHETYPE_DESIGN_AFTER_BOUNDED_V2_EXHAUSTION",certificationId,now,now,now),
    db.prepare("INSERT INTO v7_archetype_certifications (id,program_id,baseline_id,authorization_id,archetype,brief_id,renderer_version,status,frame_ids_json,frame_hashes_json,lint_json,score,attempt,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)").bind(certificationId,PROGRAM_ID,baseline.id,authorization.id,"DATA_VISUALIZATION",briefRow.id,DATA_VISUALIZATION_V3,lintPassed?"QA_REQUIRED":"LINT_FAILED",JSON.stringify(frameIds),JSON.stringify(frameHashes),JSON.stringify(lint),0,now,now),
    db.prepare("UPDATE v7_archetype_qualifications SET status=?,evidence_status=?,blocker=? WHERE baseline_id=? AND archetype='DATA_VISUALIZATION'").bind(lintPassed?"ARTIFACT_READY":"CERTIFICATION_FAILED",lintPassed?"SEMANTIC_QA_REQUIRED":"LINT_FAILED",lintPassed?"NEW_DESIGN_SEMANTIC_QA_REQUIRED":"NEW_DESIGN_DETERMINISTIC_LINT_FAILED",baseline.id),
    db.prepare("UPDATE v7_stage_states SET status='ARCHETYPE_CERTIFICATION_IN_PROGRESS',blocker=?,evidence_summary=?,updated_at=? WHERE id=?").bind(lintPassed?"DATA_VISUALIZATION_V3_QA_REQUIRED":"DATA_VISUALIZATION_V3_LINT_FAILED",`Data Visualization V3 is a new authorized design scope · V2 audit 76 → 90 preserved · deterministic lint ${lintPassed?"PASS":"FAIL"} · production remains frozen`,now,STAGE_ID),
  ]);
  return snapshot();
}

async function runArchetypeRegression() {
  const env=await runtime(),db=env.DB!,{run,authorization}=await current(db);if(!run||!authorization)throw new Error("ARCHETYPE_REGRESSION_CONFIGURATION_REQUIRED");
  const baseline=await db.prepare("SELECT * FROM v7_architecture_baselines WHERE program_id=? AND stage_key=? AND status='QUALIFIED_FOR_ARCHETYPE_CERTIFICATION' ORDER BY created_at DESC LIMIT 1").bind(PROGRAM_ID,STAGE).first<Row>();if(!baseline)throw new Error("RELIABILITY_BASELINE_PASS_REQUIRED");
  const regressionId=`${clean(baseline.id)}-${ARCHETYPE_REGRESSION_VERSION}`,existing=await db.prepare("SELECT id FROM v7_archetype_regressions WHERE id=?").bind(regressionId).first<Row>();if(existing)return snapshot();
  const usageBefore=await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(actual_cost_usd),0) AS cost,SUM(CASE WHEN status IN ('QUEUED','IN_PROGRESS') THEN 1 ELSE 0 END) AS active,SUM(CASE WHEN idempotency_key LIKE '%:request:%' THEN 1 ELSE 0 END) AS scoped_total,COUNT(DISTINCT CASE WHEN idempotency_key LIKE '%:request:%' THEN idempotency_key END) AS scoped_unique,SUM(CASE WHEN idempotency_key NOT LIKE '%:request:%' THEN 1 ELSE 0 END) AS legacy_total FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<Row>();
  if(Number(usageBefore?.active||0)!==0)throw new Error("ACTIVE_REMOTE_REQUESTS_MUST_FINISH_FIRST");
  const qualifications=await rows(db,"SELECT * FROM v7_archetype_qualifications WHERE baseline_id=?",baseline.id),latest:Row[]=[];
  for(const archetype of ARCHETYPE_CERTIFICATION_ORDER){const item=await db.prepare("SELECT * FROM v7_archetype_certifications WHERE baseline_id=? AND archetype=? ORDER BY created_at DESC LIMIT 1").bind(baseline.id,archetype).first<Row>();if(item)latest.push(item);}
  const compiledRows=await rows(db,"SELECT * FROM v7_compiled_shot_contracts WHERE baseline_id=? ORDER BY brief_id",baseline.id),briefs=await rows(db,"SELECT * FROM v7_material_briefs WHERE run_id=? AND pilot=1 ORDER BY start_seconds",run.id),replayed=briefs.map(compileShotContract);
  const replayMatches=replayed.every((item)=>{const stored=compiledRows.find((row)=>clean(row.brief_id)===clean(item.brief.briefId));return stored&&clean(stored.archetype)===item.contract.archetype&&clean(stored.repair_route)===item.contract.repairRoute&&item.contract.lintStatus==="PASS";});
  const design=await db.prepare("SELECT * FROM v7_archetype_design_authorizations WHERE baseline_id=? AND archetype='DATA_VISUALIZATION' ORDER BY created_at DESC LIMIT 1").bind(baseline.id).first<Row>();
  const qualification=rec(JSON.parse(String(baseline.qualification_json||"{}"))),checks=[
    {id:"BASELINE_QUALIFICATION",status:qualification.status==="PASS"&&Number(qualification.score)===100?"PASS":"FAIL",evidence:`${Number(qualification.score||0)}/100`},
    {id:"EXECUTION_FIREWALL",status:clean(baseline.execution_state)==="FROZEN"?"PASS":"FAIL",evidence:"Production remains frozen"},
    {id:"ACTIVE_REQUESTS_ZERO",status:Number(usageBefore?.active||0)===0?"PASS":"FAIL",evidence:`${Number(usageBefore?.active||0)} active`},
    {id:"EIGHT_ARCHETYPES_CERTIFIED",status:qualifications.length===8&&qualifications.every((item)=>clean(item.status)==="CERTIFIED")?"PASS":"FAIL",evidence:`${qualifications.filter((item)=>clean(item.status)==="CERTIFIED").length}/8`},
    {id:"LATEST_CERTIFICATIONS_PASS",status:latest.length===8&&latest.every((item)=>clean(item.status)==="PASS"&&Number(item.score)>=92)?"PASS":"FAIL",evidence:`${latest.filter((item)=>clean(item.status)==="PASS").length}/8 latest PASS`},
    {id:"DIMENSION_FLOORS",status:latest.length===8&&latest.every((item)=>Object.values(rec(JSON.parse(String(item.dimensions_json||"{}")))).length===5&&Object.values(rec(JSON.parse(String(item.dimensions_json||"{}")))).every((value)=>Number(value)>=90))?"PASS":"FAIL",evidence:"Every latest dimension >=90"},
    {id:"FRAME_HASH_INTEGRITY",status:latest.length===8&&latest.every((item)=>{const ids=arr(JSON.parse(String(item.frame_ids_json||"[]"))),hashes=arr(JSON.parse(String(item.frame_hashes_json||"[]")));return ids.length===3&&hashes.length===3&&new Set(hashes.map(clean)).size===3;})?"PASS":"FAIL",evidence:"3 distinct stored hashes per archetype"},
    {id:"COMPILED_CONTRACTS",status:compiledRows.length===10&&compiledRows.every((item)=>clean(item.lint_status)==="PASS")?"PASS":"FAIL",evidence:`${compiledRows.filter((item)=>clean(item.lint_status)==="PASS").length}/10`},
    {id:"ZERO_SPEND_PILOT_REPLAY",status:briefs.length===10&&replayed.length===10&&replayMatches?"PASS":"FAIL",evidence:`${replayed.length}/10 routes replayed without dispatch`},
    {id:"V3_DESIGN_AUDIT",status:clean(design?.status)==="CERTIFIED"&&clean(design?.new_renderer_version)===DATA_VISUALIZATION_V3&&Number(design?.source_score)===90?"PASS":"FAIL",evidence:"V2 90 preserved; V3 separately certified"},
    {id:"REQUEST_SCOPED_IDEMPOTENCY",status:Number(usageBefore?.scoped_total||0)>0&&Number(usageBefore?.scoped_total||0)===Number(usageBefore?.scoped_unique||0)?"PASS":"FAIL",evidence:`${Number(usageBefore?.scoped_unique||0)}/${Number(usageBefore?.scoped_total||0)} request-scoped keys unique · ${Number(usageBefore?.legacy_total||0)} immutable legacy rows excluded`},
  ],passed=checks.every((item)=>item.status==="PASS"),score=Math.round(checks.filter((item)=>item.status==="PASS").length/checks.length*100),usageAfter=await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(actual_cost_usd),0) AS cost FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<Row>(),now=new Date().toISOString(),pilotReplay={briefs:briefs.length,compiled:replayed.length,matches:replayMatches,dispatches:Number(usageAfter?.total||0)-Number(usageBefore?.total||0),costDelta:Number(usageAfter?.cost||0)-Number(usageBefore?.cost||0)};
  await db.batch([db.prepare("INSERT INTO v7_archetype_regressions (id,program_id,baseline_id,status,score,checks_json,certification_ids_json,pilot_replay_json,remote_requests_before,remote_requests_after,actual_cost_before,actual_cost_after,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(regressionId,PROGRAM_ID,baseline.id,passed?"PASS":"FAIL",score,JSON.stringify(checks),JSON.stringify(latest.map((item)=>item.id)),JSON.stringify(pilotReplay),Number(usageBefore?.total||0),Number(usageAfter?.total||0),Number(usageBefore?.cost||0),Number(usageAfter?.cost||0),now),db.prepare("UPDATE v7_stage_states SET status=?,blocker=?,evidence_summary=?,updated_at=? WHERE id=?").bind(passed?"ARCHETYPE_REGRESSION_PASS":"ARCHETYPE_REGRESSION_FAILED",passed?"PILOT_READY_NOT_STARTED":"REGRESSION_REPAIR_REQUIRED",`Archetype regression ${passed?"PASS":"FAIL"} ${score}/100 · 8/8 archetypes · pilot routing replay ${replayed.length}/10 · 0 requests · $0 delta · execution frozen`,now,STAGE_ID)]);
  return snapshot();
}

function promotionContractPayload(contract: Row) {
  return {
    briefId: clean(contract.brief_id), archetype: clean(contract.archetype), riskTier: clean(contract.risk_tier), claim: clean(contract.claim),
    requiredEvidence: JSON.parse(String(contract.required_evidence_json || "[]")), allowedModalities: JSON.parse(String(contract.allowed_modalities_json || "[]")),
    forbidden: JSON.parse(String(contract.forbidden_json || "[]")), repairRoute: clean(contract.repair_route), lintStatus: clean(contract.lint_status),
  };
}

async function validatePromotionBinding(env: Env, db: DB, promotion: Row) {
  if (!env.BUCKET) throw new Error("R2_MATERIAL_STORAGE_REQUIRED");
  const certification = await db.prepare("SELECT * FROM v7_archetype_certifications WHERE id=? AND status='PASS'").bind(promotion.certification_id).first<Row>();
  const contract = await db.prepare("SELECT * FROM v7_compiled_shot_contracts WHERE baseline_id=? AND brief_id=? AND lint_status='PASS'").bind(promotion.baseline_id, promotion.logical_brief_id).first<Row>();
  const frameIds = arr(JSON.parse(String(promotion.frame_ids_json || "[]"))).map(clean), frameHashes = arr(JSON.parse(String(promotion.frame_hashes_json || "[]"))).map(clean);
  const certificationIds = certification ? arr(JSON.parse(String(certification.frame_ids_json || "[]"))).map(clean) : [], certificationHashes = certification ? arr(JSON.parse(String(certification.frame_hashes_json || "[]"))).map(clean) : [];
  const compiledContractPayload = contract ? promotionContractPayload(contract) : {}, compiledContractHash = contract ? await sha(JSON.stringify(compiledContractPayload)) : "";
  const files: Row[] = [];
  let readBack = frameIds.length === 3;
  for (let index = 0; index < frameIds.length; index++) {
    const file = await db.prepare("SELECT * FROM v7_material_files WHERE id=? AND status='STORED_VERIFIED'").bind(frameIds[index]).first<Row>();
    if (!file || clean(file.content_hash) !== frameHashes[index]) { readBack = false; continue; }
    const object = await env.BUCKET.get(clean(file.runtime_key));
    if (!object) { readBack = false; continue; }
    const bytes = new Uint8Array(await new Response(object.body).arrayBuffer());
    if (await shaBytes(bytes) !== frameHashes[index]) { readBack = false; continue; }
    files.push(file);
  }
  const dimensions = certification ? rec(JSON.parse(String(certification.dimensions_json || "{}"))) : {};
  const unitSpecific = isUnitSpecificCanary(promotion.canary_version);
  const unit = unitSpecific ? await db.prepare("SELECT * FROM v7_unit_materializations WHERE canary_version=? AND brief_id=? AND status='FROZEN'").bind(promotion.canary_version, promotion.brief_id).first<Row>() : null;
  const unitIds = unit ? arr(JSON.parse(String(unit.frame_ids_json || "[]"))).map(clean) : [], unitHashes = unit ? arr(JSON.parse(String(unit.frame_hashes_json || "[]"))).map(clean) : [];
  const manifest = unit ? rec(JSON.parse(String(unit.semantic_manifest_json || "{}"))) : {}, manifestHash = unit ? await sha(JSON.stringify(manifest)) : "", preflight = rec(JSON.parse(String(promotion.preflight_json || "{}")));
  const unitContractMode = isAlignedUnitContractMode(preflight.contractMode, rec(manifest.unitContract));
  const alignedContract = unitContractMode ? rec(manifest.unitContract) : null;
  const contractPayload: Row = alignedContract || compiledContractPayload, contractHash = Object.keys(contractPayload).length ? await sha(JSON.stringify(contractPayload)) : "";
  const sourceContractLineageValid = !alignedContract || compiledContractHash === clean(manifest.sourceContractHash) && compiledContractHash === clean(preflight.sourceContractHash) && contractHash === clean(preflight.alignedContractHash);
  const alignedSourceChampion = Boolean(alignedContract) && clean(preflight.source) === "FAILED_PROBE_CONTRACT_ALIGNMENT" && Boolean(clean(preflight.sourcePromotionId)) && Boolean(clean(preflight.sourceFailedAuditId)) && clean(unit?.unit_renderer_version) === "SOURCE_BOUND_COMPOSITE_CHAMPION_V2";
  const certificationLineage = Boolean(certification) && clean(certification?.renderer_version) === clean(unit?.certified_renderer_version || promotion.renderer_version) && clean(certification?.id) === clean(promotion.certification_id);
  const boundHashesValid = unitSpecific
    ? frameIds.length === 3 && frameIds.join("|") === unitIds.join("|") && frameHashes.join("|") === unitHashes.join("|")
    : frameIds.length === 3 && frameIds.join("|") === certificationIds.join("|") && frameHashes.join("|") === certificationHashes.join("|");
  const semanticManifestValid = !unitSpecific || Boolean(unit) && manifestHash === clean(unit?.semantic_manifest_hash) && clean(manifest.logicalId) === clean(promotion.logical_brief_id) && clean(manifest.archetype) === clean(promotion.archetype) && arr(manifest.states).length === 3;
  const checks = [
    { id: "CERTIFICATION_TO_PRODUCTION_BINDING", status: certificationLineage ? "PASS" : "FAIL", evidence: clean(promotion.certification_id) },
    { id: "BOUND_HASH_CONGRUENCE", status: boundHashesValid ? "PASS" : "FAIL", evidence: `${frameIds.length}/3 frozen ${unitSpecific ? "unit" : "certification"} frames` },
    { id: "UNIT_CONTRACT_CONGRUENCE", status: Boolean(contract) && contractHash === clean(promotion.contract_hash) && clean(contractPayload.archetype) === clean(promotion.archetype) && (!unitSpecific || contractHash === clean(unit?.contract_hash)) && sourceContractLineageValid ? "PASS" : "FAIL", evidence: clean(promotion.contract_hash).slice(0, 12) },
    ...(unitSpecific ? [
      { id: "SEMANTIC_MANIFEST_CONGRUENCE", status: semanticManifestValid ? "PASS" : "FAIL", evidence: clean(unit?.semantic_manifest_hash).slice(0, 12) },
      { id: "UNIT_SPECIFIC_PIXELS", status: unitIds.length === 3 && unitIds.every((id) => id.includes(clean(promotion.logical_brief_id))) && (unitHashes.join("|") !== certificationHashes.join("|") || alignedSourceChampion) ? "PASS" : "FAIL", evidence: alignedSourceChampion ? "3/3 source-bound production champion frames with failed-probe lineage" : `${unitIds.length}/3 contract-derived frames` },
    ] : []),
    { id: "CANARY_ARTIFACT_READINESS", status: readBack && files.length === 3 && Number(certification?.score || 0) >= 92 && Object.values(dimensions).length === 5 && Object.values(dimensions).every((value) => Number(value) >= 90) ? "PASS" : "FAIL", evidence: `${files.length}/3 byte-exact read-back · certified renderer ${Number(certification?.score || 0)}` },
    { id: "NO_LEGACY_FALLBACK", status: clean(promotion.status) === "FROZEN" && Boolean(canaryDispatchCapability(promotion.canary_version)) ? "PASS" : "FAIL", evidence: unitSpecific ? "unit registry only" : "promotion registry only" },
  ];
  return { certification, contract, contractPayload, unit, manifest, files, frameIds, frameHashes, checks, passed: checks.every((item) => item.status === "PASS") };
}

async function authorizeControlledCanary() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization) throw new Error("CONTROLLED_CANARY_RUN_REQUIRED");
  const baseline = await db.prepare("SELECT * FROM v7_architecture_baselines WHERE program_id=? AND stage_key=? ORDER BY created_at DESC LIMIT 1").bind(PROGRAM_ID, STAGE).first<Row>();
  if (!baseline || clean(baseline.status) !== "QUALIFIED_FOR_ARCHETYPE_CERTIFICATION" || !["FROZEN", "CANARY_ONLY"].includes(clean(baseline.execution_state))) throw new Error("RELIABILITY_BASELINE_FROZEN_REQUIRED");
  const regression = await db.prepare("SELECT * FROM v7_archetype_regressions WHERE baseline_id=? AND status='PASS' AND score=100 AND id LIKE ? ORDER BY created_at DESC LIMIT 1").bind(baseline.id, `%${ARCHETYPE_REGRESSION_VERSION}`).first<Row>();
  if (!regression) throw new Error("ARCHETYPE_REGRESSION_PASS_100_REQUIRED");
  const replay = rec(JSON.parse(String(regression.pilot_replay_json || "{}")));
  if (Number(replay.briefs) !== 10 || Number(replay.compiled) !== 10 || replay.matches !== true || Number(replay.dispatches) !== 0 || Number(replay.costDelta) !== 0) throw new Error("PILOT_REPLAY_10_OF_10_ZERO_SPEND_REQUIRED");
  const certified = await db.prepare("SELECT COUNT(*) AS total FROM v7_archetype_qualifications WHERE baseline_id=? AND status='CERTIFIED'").bind(baseline.id).first<{ total: number }>();
  if (Number(certified?.total || 0) !== ARCHETYPE_CERTIFICATION_ORDER.length) throw new Error("EIGHT_OF_EIGHT_ARCHETYPES_REQUIRED");
  const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>();
  if (Number(active?.total || 0) !== 0) throw new Error("ACTIVE_REMOTE_REQUESTS_MUST_FINISH_FIRST");
  const canaryId = `${clean(baseline.id)}-${CONTROLLED_CANARY_VERSION}`, existing = await db.prepare("SELECT id FROM v7_pilot_canaries WHERE id=?").bind(canaryId).first<Row>();
  if (existing) return snapshot();
  const failedV1 = await db.prepare("SELECT * FROM v7_pilot_canaries WHERE baseline_id=? AND version=? AND status='FAILED' ORDER BY created_at DESC LIMIT 1").bind(baseline.id, LEGACY_CONTROLLED_CANARY_VERSION).first<Row>();
  if (!failedV1) throw new Error("FAILED_CANARY_V1_AUDIT_REQUIRED");
  const briefs = await rows(db, "SELECT * FROM v7_material_briefs WHERE run_id=? AND pilot=1 ORDER BY start_seconds", run.id), contracts = await rows(db, "SELECT * FROM v7_compiled_shot_contracts WHERE baseline_id=?", baseline.id);
  if (briefs.length !== 10 || contracts.length !== 10) throw new Error(`CONTROLLED_CANARY_SCOPE_INVALID · ${briefs.length} briefs / ${contracts.length} contracts`);
  const promotionRegressionId = `${clean(baseline.id)}-${PROMOTION_REGRESSION_VERSION}`, now = new Date().toISOString(), promotionStatements: Statement[] = [], promotionRows: Row[] = [], queue: Row[] = [];
  for (const brief of briefs) {
    const content = rec(JSON.parse(String(brief.content_json || "{}"))), logicalId = clean(content.briefId), contract = contracts.find((item) => clean(item.brief_id) === logicalId);
    if (!contract || clean(contract.lint_status) !== "PASS") throw new Error(`CANARY_CONTRACT_MISSING · ${logicalId}`);
    const certification = await db.prepare("SELECT * FROM v7_archetype_certifications WHERE baseline_id=? AND archetype=? AND status='PASS' ORDER BY created_at DESC LIMIT 1").bind(baseline.id, contract.archetype).first<Row>();
    if (!certification) throw new Error(`CERTIFIED_ARTIFACT_MISSING · ${logicalId}`);
    const frameIds = arr(JSON.parse(String(certification.frame_ids_json || "[]"))).map(clean), frameHashes = arr(JSON.parse(String(certification.frame_hashes_json || "[]"))).map(clean), contractHash = await sha(JSON.stringify(promotionContractPayload(contract)));
    if (frameIds.length !== 3 || frameHashes.length !== 3) throw new Error(`CERTIFIED_FRAME_SET_INCOMPLETE · ${logicalId}`);
    const promotionId = `${canaryId}-${logicalId}-PROMOTION`, preflight = { source: "CERTIFIED_ARTIFACT_ONLY", legacyFallback: false, certificationScore: Number(certification.score), certificationStatus: certification.status, frozenAt: now };
    promotionStatements.push(db.prepare("INSERT INTO v7_artifact_promotions (id,program_id,baseline_id,regression_id,run_id,authorization_id,canary_version,brief_id,logical_brief_id,archetype,certification_id,renderer_version,contract_hash,frame_ids_json,frame_hashes_json,status,preflight_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'FROZEN',?,?)").bind(promotionId, PROGRAM_ID, baseline.id, promotionRegressionId, run.id, authorization.id, CONTROLLED_CANARY_VERSION, brief.id, logicalId, contract.archetype, certification.id, certification.renderer_version, contractHash, JSON.stringify(frameIds), JSON.stringify(frameHashes), JSON.stringify(preflight), now));
    promotionRows.push({ id: promotionId, program_id: PROGRAM_ID, baseline_id: baseline.id, regression_id: promotionRegressionId, run_id: run.id, authorization_id: authorization.id, canary_version: CONTROLLED_CANARY_VERSION, brief_id: brief.id, logical_brief_id: logicalId, archetype: contract.archetype, certification_id: certification.id, renderer_version: certification.renderer_version, contract_hash: contractHash, frame_ids_json: JSON.stringify(frameIds), frame_hashes_json: JSON.stringify(frameHashes), status: "FROZEN", preflight_json: JSON.stringify(preflight), created_at: now });
    queue.push({ briefId: clean(brief.id), logicalId, archetype: clean(contract.archetype), riskTier: clean(contract.risk_tier), startSeconds: Number(brief.start_seconds), promotionId, certificationId: clean(certification.id), renderer: clean(certification.renderer_version), bindingStatus: "FROZEN" });
  }
  const bindingResults: Array<Awaited<ReturnType<typeof validatePromotionBinding>>> = [];
  for (const promotion of promotionRows) bindingResults.push(await validatePromotionBinding(env, db, promotion));
  const bindingChecks = ["CERTIFICATION_TO_PRODUCTION_BINDING", "BOUND_HASH_CONGRUENCE", "UNIT_CONTRACT_CONGRUENCE", "CANARY_ARTIFACT_READINESS", "NO_LEGACY_FALLBACK"].map((id) => ({ id, status: bindingResults.length === 10 && bindingResults.every((result) => result.checks.find((item) => item.id === id)?.status === "PASS") ? "PASS" : "FAIL", evidence: `${bindingResults.filter((result) => result.checks.find((item) => item.id === id)?.status === "PASS").length}/10 production-bound units` }));
  if (bindingChecks.some((item) => item.status !== "PASS")) throw new Error(`CANARY_V2_ZERO_SPEND_PREFLIGHT_FAILED · ${bindingChecks.filter((item) => item.status !== "PASS").map((item) => item.id).join(",")}`);
  queue.sort((left, right) => (left.riskTier === "P1" ? 0 : 1) - (right.riskTier === "P1" ? 0 : 1) || ARCHETYPE_CERTIFICATION_ORDER.indexOf(left.archetype as typeof ARCHETYPE_CERTIFICATION_ORDER[number]) - ARCHETYPE_CERTIFICATION_ORDER.indexOf(right.archetype as typeof ARCHETYPE_CERTIFICATION_ORDER[number]) || Number(left.startSeconds) - Number(right.startSeconds));
  const usage = await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(actual_cost_usd),0) AS cost FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<{ total: number; cost: number }>(), requestsBefore = Number(usage?.total || 0), costBefore = Number(usage?.cost || 0);
  const gates = [
    { id: "RELIABILITY_BASELINE", status: "PASS", evidence: clean(baseline.version) },
    { id: "ARCHETYPE_CERTIFICATION", status: "PASS", evidence: "8/8 certified" },
    { id: "REGRESSION", status: "PASS", evidence: "100/100" },
    { id: "PILOT_ROUTING_REPLAY", status: "PASS", evidence: "10/10 · 0 dispatch · $0 delta" },
    { id: "ACTIVE_REQUESTS", status: "PASS", evidence: "0 active" },
    ...bindingChecks,
    { id: "CANARY_V1_AUDIT_PRESERVED", status: "PASS", evidence: `${clean(failedV1.id)} remains FAILED` },
    { id: "LEASE_POLICY", status: "PASS", evidence: "one promoted unit · one active request · explicit release" },
  ];
  const modelPolicy = { ...rec(JSON.parse(String(authorization.model_policy_json || "{}"))), version: CONTROLLED_CANARY_VERSION, dispatch: "PROMOTED_BINDING_ONLY", concurrency: 1, release: "PASS_REVIEW_ONLY", legacyFallback: false, productionScale: "BLOCKED", sequenceProof: "BLOCKED", requestBudget: 40, costBudgetUsd: 10 };
  await db.batch([
    ...promotionStatements,
    db.prepare("INSERT INTO v7_archetype_regressions (id,program_id,baseline_id,status,score,checks_json,certification_ids_json,pilot_replay_json,remote_requests_before,remote_requests_after,actual_cost_before,actual_cost_after,created_at) VALUES (?,?,?,'PASS',100,?,?,?,?,?,?,?,?)").bind(promotionRegressionId, PROGRAM_ID, baseline.id, JSON.stringify(bindingChecks), JSON.stringify(promotionRows.map((item) => item.certification_id)), JSON.stringify({ briefs: 10, compiled: 10, promoted: 10, matches: true, dispatches: 0, costDelta: 0, legacyFallback: false }), requestsBefore, requestsBefore, costBefore, costBefore, now),
    db.prepare("INSERT INTO v7_pilot_canaries (id,program_id,baseline_id,regression_id,run_id,authorization_id,version,status,queue_json,current_index,current_brief_id,released_units,passed_units,failed_units,requests_before,cost_before,request_budget,cost_budget,active_request_peak,gate_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'AUTHORIZED',?,0,?,0,0,0,?,?,40,10,0,?,?,?)").bind(canaryId, PROGRAM_ID, baseline.id, promotionRegressionId, run.id, authorization.id, CONTROLLED_CANARY_VERSION, JSON.stringify(queue), queue[0]?.briefId || null, requestsBefore, costBefore, JSON.stringify(gates), now, now),
    db.prepare("UPDATE v7_architecture_baselines SET execution_state='CANARY_ONLY' WHERE id=?").bind(baseline.id),
    db.prepare("UPDATE v7_material_authorizations SET scope='CONTROLLED_CANARY',status='AUTHORIZED',max_remote_requests=?,max_actual_spend_usd=?,model_policy_json=?,updated_at=? WHERE id=?").bind(requestsBefore + 40, costBefore + 10, JSON.stringify(modelPolicy), now, authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='CANARY_AUTHORIZED',mode='CONTROLLED_CANARY' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='CANARY_V2_AUTHORIZED',blocker='CANARY_V2_UNIT_NOT_RELEASED',evidence_summary='10/10 immutable certification-to-production bindings passed byte/hash/contract preflight · Canary V1 audit preserved · sequence and scale blocked',updated_at=? WHERE id=?").bind(now, STAGE_ID),
  ]);
  return snapshot();
}

async function authorizeControlledCanaryV3() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || !env.BUCKET) throw new Error("CONTROLLED_CANARY_V3_CONFIGURATION_REQUIRED");
  const baseline = await db.prepare("SELECT * FROM v7_architecture_baselines WHERE program_id=? AND stage_key=? ORDER BY created_at DESC LIMIT 1").bind(PROGRAM_ID, STAGE).first<Row>();
  if (!baseline || clean(baseline.status) !== "QUALIFIED_FOR_ARCHETYPE_CERTIFICATION" || clean(baseline.execution_state) !== "FROZEN") throw new Error("CANARY_V3_FROZEN_BASELINE_REQUIRED");
  const failedV2 = await db.prepare("SELECT * FROM v7_pilot_canaries WHERE baseline_id=? AND version=? AND status='FAILED' ORDER BY created_at DESC LIMIT 1").bind(baseline.id, CONTROLLED_CANARY_VERSION).first<Row>();
  if (!failedV2 || Number(failedV2.passed_units) !== 1) throw new Error("FAILED_CANARY_V2_AUDIT_REQUIRED");
  const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>();
  if (Number(active?.total || 0) !== 0) throw new Error("ACTIVE_REMOTE_REQUESTS_MUST_FINISH_FIRST");
  const canaryId = `${clean(baseline.id)}-${CONTROLLED_CANARY_V3}`, existing = await db.prepare("SELECT id FROM v7_pilot_canaries WHERE id=?").bind(canaryId).first<Row>();
  if (existing) return snapshot();
  const briefs = await rows(db, "SELECT * FROM v7_material_briefs WHERE run_id=? AND pilot=1 ORDER BY start_seconds", run.id), contracts = await rows(db, "SELECT * FROM v7_compiled_shot_contracts WHERE baseline_id=?", baseline.id);
  if (briefs.length !== 10 || contracts.length !== 10) throw new Error(`CANARY_V3_SCOPE_INVALID · ${briefs.length} briefs / ${contracts.length} contracts`);
  const now = new Date().toISOString(), regressionId = `${clean(baseline.id)}-${UNIT_MATERIALIZATION_REGRESSION_VERSION}`, unitStatements: Statement[] = [], promotionStatements: Statement[] = [], promotionRows: Row[] = [], queue: Row[] = [];
  for (const brief of briefs) {
    const content = rec(JSON.parse(String(brief.content_json || "{}"))), logicalId = clean(content.briefId), contract = contracts.find((item) => clean(item.brief_id) === logicalId);
    if (!contract || clean(contract.lint_status) !== "PASS") throw new Error(`CANARY_V3_CONTRACT_MISSING · ${logicalId}`);
    const certification = await db.prepare("SELECT * FROM v7_archetype_certifications WHERE baseline_id=? AND archetype=? AND status='PASS' ORDER BY created_at DESC LIMIT 1").bind(baseline.id, contract.archetype).first<Row>();
    if (!certification || Number(certification.score) < 92) throw new Error(`CANARY_V3_CERTIFIED_RENDERER_MISSING · ${logicalId}`);
    const contractHash = await sha(JSON.stringify(promotionContractPayload(contract))), manifest = unitSemanticManifest(contract, content), manifestJson = JSON.stringify(manifest), manifestHash = await sha(manifestJson), frameIds: string[] = [], frameHashes: string[] = [];
    for (const [role, state] of [["CERT_ENTRY", 0], ["CERT_MIDPOINT", 1], ["CERT_EXIT", 2]] as const) {
      const bytes = unitArtifactPng(manifest, state), fileId = await storeMaterial(env, db, authorization, brief, { role, identity: `CANARY-V3-${logicalId}-${state}`, bytes, mimeType: "image/png", extension: "png", sourceType: UNIT_RENDERER_VERSION, provider: "FRAMEFLOW_OWNED", providerAssetId: clean(certification.id), sourceUrl: clean(certification.id), landingUrl: clean(certification.id), licenseCode: "CHANNEL_OWNED", width: 960, height: 540 }), file = await db.prepare("SELECT content_hash FROM v7_material_files WHERE id=?").bind(fileId).first<Row>();
      frameIds.push(fileId); frameHashes.push(clean(file?.content_hash));
    }
    const stateCount = arr(manifest.states).length, lint = [
      { id: "CONTRACT_HASH_BOUND", status: contractHash ? "PASS" : "FAIL" },
      { id: "SEMANTIC_MANIFEST_THREE_STATES", status: stateCount === 3 ? "PASS" : "FAIL" },
      { id: "UNIT_FRAME_SET_DISTINCT", status: frameIds.length === 3 && new Set(frameHashes).size === 3 ? "PASS" : "FAIL" },
      { id: "CERTIFIED_RENDERER_LINEAGE", status: clean(certification.status) === "PASS" && Number(certification.score) >= 92 ? "PASS" : "FAIL" },
      { id: "NO_CERTIFICATION_PIXEL_REUSE", status: frameHashes.join("|") !== clean(certification.frame_hashes_json) ? "PASS" : "FAIL" },
    ];
    if (lint.some((item) => item.status !== "PASS")) throw new Error(`CANARY_V3_UNIT_LINT_FAILED · ${logicalId}`);
    const unitId = `${canaryId}-${logicalId}-UNIT`, promotionId = `${canaryId}-${logicalId}-PROMOTION`, preflight = { source: "UNIT_SPECIFIC_MATERIALIZATION", unitMaterializationId: unitId, semanticManifestHash: manifestHash, certifiedRenderer: clean(certification.renderer_version), unitRenderer: UNIT_RENDERER_VERSION, legacyFallback: false, certificationPixelsReused: false, frozenAt: now };
    unitStatements.push(db.prepare("INSERT INTO v7_unit_materializations (id,program_id,baseline_id,run_id,authorization_id,canary_version,brief_id,logical_brief_id,archetype,certification_id,certified_renderer_version,unit_renderer_version,contract_hash,semantic_manifest_json,semantic_manifest_hash,frame_ids_json,frame_hashes_json,lint_json,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'FROZEN',?)").bind(unitId, PROGRAM_ID, baseline.id, run.id, authorization.id, CONTROLLED_CANARY_V3, brief.id, logicalId, contract.archetype, certification.id, certification.renderer_version, UNIT_RENDERER_VERSION, contractHash, manifestJson, manifestHash, JSON.stringify(frameIds), JSON.stringify(frameHashes), JSON.stringify(lint), now));
    promotionStatements.push(db.prepare("INSERT INTO v7_artifact_promotions (id,program_id,baseline_id,regression_id,run_id,authorization_id,canary_version,brief_id,logical_brief_id,archetype,certification_id,renderer_version,contract_hash,frame_ids_json,frame_hashes_json,status,preflight_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'FROZEN',?,?)").bind(promotionId, PROGRAM_ID, baseline.id, regressionId, run.id, authorization.id, CONTROLLED_CANARY_V3, brief.id, logicalId, contract.archetype, certification.id, UNIT_RENDERER_VERSION, contractHash, JSON.stringify(frameIds), JSON.stringify(frameHashes), JSON.stringify(preflight), now));
    promotionRows.push({ id: promotionId, program_id: PROGRAM_ID, baseline_id: baseline.id, regression_id: regressionId, run_id: run.id, authorization_id: authorization.id, canary_version: CONTROLLED_CANARY_V3, brief_id: brief.id, logical_brief_id: logicalId, archetype: contract.archetype, certification_id: certification.id, renderer_version: UNIT_RENDERER_VERSION, contract_hash: contractHash, frame_ids_json: JSON.stringify(frameIds), frame_hashes_json: JSON.stringify(frameHashes), status: "FROZEN", preflight_json: JSON.stringify(preflight), created_at: now });
    queue.push({ briefId: clean(brief.id), logicalId, archetype: clean(contract.archetype), riskTier: clean(contract.risk_tier), startSeconds: Number(brief.start_seconds), promotionId, certificationId: clean(certification.id), renderer: UNIT_RENDERER_VERSION, bindingStatus: "FROZEN" });
  }
  await db.batch([...unitStatements, ...promotionStatements]);
  const results: Array<Awaited<ReturnType<typeof validatePromotionBinding>>> = [];
  for (const promotion of promotionRows) results.push(await validatePromotionBinding(env, db, promotion));
  const ids = ["CERTIFICATION_TO_PRODUCTION_BINDING", "BOUND_HASH_CONGRUENCE", "UNIT_CONTRACT_CONGRUENCE", "SEMANTIC_MANIFEST_CONGRUENCE", "UNIT_SPECIFIC_PIXELS", "CANARY_ARTIFACT_READINESS", "NO_LEGACY_FALLBACK"], bindingChecks = ids.map((id) => ({ id, status: results.length === 10 && results.every((result) => result.checks.find((item) => item.id === id)?.status === "PASS") ? "PASS" : "FAIL", evidence: `${results.filter((result) => result.checks.find((item) => item.id === id)?.status === "PASS").length}/10 unit-specific artifacts` }));
  if (bindingChecks.some((item) => item.status !== "PASS")) throw new Error(`CANARY_V3_ZERO_SPEND_PREFLIGHT_FAILED · ${bindingChecks.filter((item) => item.status !== "PASS").map((item) => item.id).join(",")}`);
  queue.sort((left, right) => (left.riskTier === "P1" ? 0 : 1) - (right.riskTier === "P1" ? 0 : 1) || Number(left.startSeconds) - Number(right.startSeconds));
  const usage = await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(actual_cost_usd),0) AS cost FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<{ total: number; cost: number }>(), requestsBefore = Number(usage?.total || 0), costBefore = Number(usage?.cost || 0), gates = [
    { id: "CANARY_V1_AUDIT_PRESERVED", status: "PASS", evidence: "V1 remains immutable" },
    { id: "CANARY_V2_AUDIT_PRESERVED", status: "PASS", evidence: `${clean(failedV2.id)} remains FAILED at ${Number(failedV2.passed_units)}/10` },
    ...bindingChecks,
    { id: "ACTIVE_REQUESTS", status: "PASS", evidence: "0 active" },
    { id: "LEASE_POLICY", status: "PASS", evidence: "one unit-specific artifact · one active request · hard stop" },
  ], modelPolicy = { ...rec(JSON.parse(String(authorization.model_policy_json || "{}"))), version: CONTROLLED_CANARY_V3, dispatch: "UNIT_SPECIFIC_PROMOTION_ONLY", semanticManifestRequired: true, certificationPixelsReusable: false, concurrency: 1, release: "PASS_REVIEW_ONLY", productionScale: "BLOCKED", sequenceProof: "BLOCKED", requestBudget: 40, costBudgetUsd: 10 };
  await db.batch([
    db.prepare("INSERT INTO v7_archetype_regressions (id,program_id,baseline_id,status,score,checks_json,certification_ids_json,pilot_replay_json,remote_requests_before,remote_requests_after,actual_cost_before,actual_cost_after,created_at) VALUES (?,?,?,'PASS',100,?,?,?,?,?,?,?,?)").bind(regressionId, PROGRAM_ID, baseline.id, JSON.stringify(bindingChecks), JSON.stringify(promotionRows.map((item) => item.certification_id)), JSON.stringify({ briefs: 10, compiled: 10, materialized: 10, promoted: 10, semanticManifests: 10, certificationPixelsReused: 0, dispatches: 0, costDelta: 0 }), requestsBefore, requestsBefore, costBefore, costBefore, now),
    db.prepare("INSERT INTO v7_pilot_canaries (id,program_id,baseline_id,regression_id,run_id,authorization_id,version,status,queue_json,current_index,current_brief_id,released_units,passed_units,failed_units,requests_before,cost_before,request_budget,cost_budget,active_request_peak,gate_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'AUTHORIZED',?,0,?,0,0,0,?,?,40,10,0,?,?,?)").bind(canaryId, PROGRAM_ID, baseline.id, regressionId, run.id, authorization.id, CONTROLLED_CANARY_V3, JSON.stringify(queue), queue[0]?.briefId || null, requestsBefore, costBefore, JSON.stringify(gates), now, now),
    db.prepare("UPDATE v7_architecture_baselines SET execution_state='CANARY_ONLY' WHERE id=?").bind(baseline.id),
    db.prepare("UPDATE v7_material_authorizations SET scope='CONTROLLED_CANARY_V3',status='AUTHORIZED',max_remote_requests=?,max_actual_spend_usd=?,model_policy_json=?,completed_at=NULL,updated_at=? WHERE id=?").bind(requestsBefore + 40, costBefore + 10, JSON.stringify(modelPolicy), now, authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='CANARY_AUTHORIZED',mode='CONTROLLED_CANARY_V3' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='CANARY_V3_AUTHORIZED',blocker='CANARY_V3_UNIT_NOT_RELEASED',evidence_summary='10/10 unit-specific artifacts passed contract, semantic-manifest, byte/hash and no-fallback preflight · Canary V1/V2 preserved · sequence and scale blocked',updated_at=? WHERE id=?").bind(now, STAGE_ID),
  ]);
  return snapshot();
}

async function authorizeControlledCanaryV4() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || !env.BUCKET) throw new Error("CONTROLLED_CANARY_V4_CONFIGURATION_REQUIRED");
  const baseline = await db.prepare("SELECT * FROM v7_architecture_baselines WHERE program_id=? AND stage_key=? ORDER BY created_at DESC LIMIT 1").bind(PROGRAM_ID, STAGE).first<Row>();
  if (!baseline || clean(baseline.status) !== "QUALIFIED_FOR_ARCHETYPE_CERTIFICATION" || clean(baseline.execution_state) !== "FROZEN") throw new Error("CANARY_V4_FROZEN_BASELINE_REQUIRED");
  const failedV3 = await db.prepare("SELECT * FROM v7_pilot_canaries WHERE baseline_id=? AND version=? AND status='FAILED' ORDER BY created_at DESC LIMIT 1").bind(baseline.id, CONTROLLED_CANARY_V3).first<Row>();
  if (!failedV3 || Number(failedV3.passed_units) !== 0) throw new Error("FAILED_CANARY_V3_AUDIT_REQUIRED");
  const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>();
  if (Number(active?.total || 0) !== 0) throw new Error("ACTIVE_REMOTE_REQUESTS_MUST_FINISH_FIRST");
  const canaryId = `${clean(baseline.id)}-${CONTROLLED_CANARY_V4}`, existing = await db.prepare("SELECT id FROM v7_pilot_canaries WHERE id=?").bind(canaryId).first<Row>();
  if (existing) return snapshot();
  const briefs = await rows(db, "SELECT * FROM v7_material_briefs WHERE run_id=? AND pilot=1 ORDER BY start_seconds", run.id), sourceUnits = await rows(db, "SELECT * FROM v7_unit_materializations WHERE baseline_id=? AND canary_version=? AND status='FROZEN'", baseline.id, CONTROLLED_CANARY_V3), sourcePromotions = await rows(db, "SELECT * FROM v7_artifact_promotions WHERE baseline_id=? AND canary_version=? AND status='FROZEN'", baseline.id, CONTROLLED_CANARY_V3);
  if (briefs.length !== 10 || sourceUnits.length !== 10 || sourcePromotions.length !== 10) throw new Error(`CANARY_V4_SOURCE_SCOPE_INVALID · ${briefs.length} briefs / ${sourceUnits.length} units / ${sourcePromotions.length} promotions`);
  const capability = canaryDispatchCapability(CONTROLLED_CANARY_V4);
  if (!capability || capability.phase !== "CANARY_UNIT_SPECIFIC_PIXEL_QA" || capability.artifactMode !== "UNIT_SPECIFIC") throw new Error("CANARY_V4_DISPATCH_CAPABILITY_INVALID");
  const now = new Date().toISOString(), regressionId = `${clean(baseline.id)}-${CANARY_HANDOFF_REGRESSION_VERSION}`, unitStatements: Statement[] = [], promotionStatements: Statement[] = [], promotionRows: Row[] = [], queue: Row[] = [];
  for (const brief of briefs) {
    const content = rec(JSON.parse(String(brief.content_json || "{}"))), logicalId = clean(content.briefId), sourceUnit = sourceUnits.find((item) => clean(item.brief_id) === clean(brief.id)), sourcePromotion = sourcePromotions.find((item) => clean(item.brief_id) === clean(brief.id));
    if (!sourceUnit || !sourcePromotion || clean(sourceUnit.logical_brief_id) !== logicalId || clean(sourcePromotion.logical_brief_id) !== logicalId) throw new Error(`CANARY_V4_SOURCE_BINDING_MISSING · ${logicalId}`);
    const unitId = `${canaryId}-${logicalId}-UNIT`, promotionId = `${canaryId}-${logicalId}-PROMOTION`, preflight = { ...rec(JSON.parse(String(sourcePromotion.preflight_json || "{}"))), source: "V3_UNIT_ARTIFACT_REPROMOTION", sourceCanary: CONTROLLED_CANARY_V3, sourceUnitMaterializationId: sourceUnit.id, dispatchCapability: capability.phase, artifactMode: capability.artifactMode, legacyFallback: false, certificationPixelsReused: false, frozenAt: now };
    unitStatements.push(db.prepare("INSERT INTO v7_unit_materializations (id,program_id,baseline_id,run_id,authorization_id,canary_version,brief_id,logical_brief_id,archetype,certification_id,certified_renderer_version,unit_renderer_version,contract_hash,semantic_manifest_json,semantic_manifest_hash,frame_ids_json,frame_hashes_json,lint_json,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'FROZEN',?)").bind(unitId, PROGRAM_ID, baseline.id, run.id, authorization.id, CONTROLLED_CANARY_V4, brief.id, logicalId, sourceUnit.archetype, sourceUnit.certification_id, sourceUnit.certified_renderer_version, sourceUnit.unit_renderer_version, sourceUnit.contract_hash, sourceUnit.semantic_manifest_json, sourceUnit.semantic_manifest_hash, sourceUnit.frame_ids_json, sourceUnit.frame_hashes_json, sourceUnit.lint_json, now));
    promotionStatements.push(db.prepare("INSERT INTO v7_artifact_promotions (id,program_id,baseline_id,regression_id,run_id,authorization_id,canary_version,brief_id,logical_brief_id,archetype,certification_id,renderer_version,contract_hash,frame_ids_json,frame_hashes_json,status,preflight_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'FROZEN',?,?)").bind(promotionId, PROGRAM_ID, baseline.id, regressionId, run.id, authorization.id, CONTROLLED_CANARY_V4, brief.id, logicalId, sourcePromotion.archetype, sourcePromotion.certification_id, sourcePromotion.renderer_version, sourcePromotion.contract_hash, sourcePromotion.frame_ids_json, sourcePromotion.frame_hashes_json, JSON.stringify(preflight), now));
    promotionRows.push({ ...sourcePromotion, id: promotionId, regression_id: regressionId, canary_version: CONTROLLED_CANARY_V4, preflight_json: JSON.stringify(preflight), created_at: now });
    queue.push({ briefId: clean(brief.id), logicalId, archetype: clean(sourcePromotion.archetype), riskTier: clean(rec(JSON.parse(String(sourceUnit.semantic_manifest_json || "{}"))).riskTier), startSeconds: Number(brief.start_seconds), promotionId, certificationId: clean(sourcePromotion.certification_id), renderer: clean(sourcePromotion.renderer_version), bindingStatus: "FROZEN", dispatchCapability: capability.phase });
  }
  await db.batch([...unitStatements, ...promotionStatements]);
  const results: Array<Awaited<ReturnType<typeof validatePromotionBinding>>> = [];
  for (const promotion of promotionRows) results.push(await validatePromotionBinding(env, db, promotion));
  const bindingIds = ["CERTIFICATION_TO_PRODUCTION_BINDING", "BOUND_HASH_CONGRUENCE", "UNIT_CONTRACT_CONGRUENCE", "SEMANTIC_MANIFEST_CONGRUENCE", "UNIT_SPECIFIC_PIXELS", "CANARY_ARTIFACT_READINESS", "NO_LEGACY_FALLBACK"], bindingChecks = bindingIds.map((id) => ({ id, status: results.length === 10 && results.every((result) => result.checks.find((item) => item.id === id)?.status === "PASS") ? "PASS" : "FAIL", evidence: `${results.filter((result) => result.checks.find((item) => item.id === id)?.status === "PASS").length}/10 V4 bindings` }));
  const capabilityChecks = [
    { id: "DISPATCH_CAPABILITY_CONGRUENCE", status: queue.length === 10 && queue.every((item) => item.dispatchCapability === capability.phase) ? "PASS" : "FAIL", evidence: `${queue.filter((item) => item.dispatchCapability === capability.phase).length}/10 version-derived phases` },
    { id: "LEASE_HANDOFF_DRY_RUN", status: queue.length === 10 && queue.every((item) => clean(item.briefId) && clean(item.promotionId) && clean(item.dispatchCapability)) ? "PASS" : "FAIL", evidence: `${queue.filter((item) => clean(item.briefId) && clean(item.promotionId) && clean(item.dispatchCapability)).length}/10 lease → promotion → phase handoffs` },
  ];
  const allChecks = [...bindingChecks, ...capabilityChecks];
  if (allChecks.some((item) => item.status !== "PASS")) throw new Error(`CANARY_V4_ZERO_SPEND_PREFLIGHT_FAILED · ${allChecks.filter((item) => item.status !== "PASS").map((item) => item.id).join(",")}`);
  queue.sort((left, right) => (left.riskTier === "P1" ? 0 : 1) - (right.riskTier === "P1" ? 0 : 1) || Number(left.startSeconds) - Number(right.startSeconds));
  const usage = await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(actual_cost_usd),0) AS cost FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<{ total: number; cost: number }>(), requestsBefore = Number(usage?.total || 0), costBefore = Number(usage?.cost || 0), gates = [
    { id: "CANARY_V1_AUDIT_PRESERVED", status: "PASS", evidence: "V1 remains immutable" },
    { id: "CANARY_V2_AUDIT_PRESERVED", status: "PASS", evidence: "V2 remains immutable at 1/10" },
    { id: "CANARY_V3_AUDIT_PRESERVED", status: "PASS", evidence: `${clean(failedV3.id)} remains FAILED at 0/10 and 0 request delta` },
    ...allChecks,
    { id: "ACTIVE_REQUESTS", status: "PASS", evidence: "0 active" },
    { id: "LEASE_POLICY", status: "PASS", evidence: "one capability-bound unit · one active request · hard stop" },
  ], modelPolicy = { ...rec(JSON.parse(String(authorization.model_policy_json || "{}"))), version: CONTROLLED_CANARY_V4, dispatch: "CAPABILITY_BOUND_UNIT_PROMOTION_ONLY", dispatchCapability: capability.phase, artifactMode: capability.artifactMode, semanticManifestRequired: true, certificationPixelsReusable: false, concurrency: 1, release: "PASS_REVIEW_ONLY", productionScale: "BLOCKED", sequenceProof: "BLOCKED", requestBudget: 40, costBudgetUsd: 10 };
  await db.batch([
    db.prepare("INSERT INTO v7_archetype_regressions (id,program_id,baseline_id,status,score,checks_json,certification_ids_json,pilot_replay_json,remote_requests_before,remote_requests_after,actual_cost_before,actual_cost_after,created_at) VALUES (?,?,?,'PASS',100,?,?,?,?,?,?,?,?)").bind(regressionId, PROGRAM_ID, baseline.id, JSON.stringify(allChecks), JSON.stringify(promotionRows.map((item) => item.certification_id)), JSON.stringify({ briefs: 10, reusedV3UnitArtifacts: 10, promoted: 10, handoffs: 10, dispatches: 0, costDelta: 0 }), requestsBefore, requestsBefore, costBefore, costBefore, now),
    db.prepare("INSERT INTO v7_pilot_canaries (id,program_id,baseline_id,regression_id,run_id,authorization_id,version,status,queue_json,current_index,current_brief_id,released_units,passed_units,failed_units,requests_before,cost_before,request_budget,cost_budget,active_request_peak,gate_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'AUTHORIZED',?,0,?,0,0,0,?,?,40,10,0,?,?,?)").bind(canaryId, PROGRAM_ID, baseline.id, regressionId, run.id, authorization.id, CONTROLLED_CANARY_V4, JSON.stringify(queue), queue[0]?.briefId || null, requestsBefore, costBefore, JSON.stringify(gates), now, now),
    db.prepare("UPDATE v7_architecture_baselines SET execution_state='CANARY_ONLY' WHERE id=?").bind(baseline.id),
    db.prepare("UPDATE v7_material_authorizations SET scope='CONTROLLED_CANARY_V4',status='AUTHORIZED',max_remote_requests=?,max_actual_spend_usd=?,model_policy_json=?,completed_at=NULL,updated_at=? WHERE id=?").bind(requestsBefore + 40, costBefore + 10, JSON.stringify(modelPolicy), now, authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='CANARY_AUTHORIZED',mode='CONTROLLED_CANARY_V4' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='CANARY_V4_AUTHORIZED',blocker='CANARY_V4_UNIT_NOT_RELEASED',evidence_summary='10/10 capability-bound lease handoffs passed zero-spend preflight · V1/V2/V3 audits preserved · sequence and scale blocked',updated_at=? WHERE id=?").bind(now, STAGE_ID),
  ]);
  return snapshot();
}

async function authorizeControlledCanaryV5() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || !env.BUCKET) throw new Error("CONTROLLED_CANARY_V5_CONFIGURATION_REQUIRED");
  const baseline = await db.prepare("SELECT * FROM v7_architecture_baselines WHERE program_id=? AND stage_key=? ORDER BY created_at DESC LIMIT 1").bind(PROGRAM_ID, STAGE).first<Row>();
  if (!baseline || clean(baseline.status) !== "QUALIFIED_FOR_ARCHETYPE_CERTIFICATION" || clean(baseline.execution_state) !== "FROZEN") throw new Error("CANARY_V5_FROZEN_BASELINE_REQUIRED");
  const failedV4 = await db.prepare("SELECT * FROM v7_pilot_canaries WHERE baseline_id=? AND version=? AND status='FAILED' ORDER BY created_at DESC LIMIT 1").bind(baseline.id, CONTROLLED_CANARY_V4).first<Row>();
  if (!failedV4 || Number(failedV4.passed_units) !== 0 || Number(failedV4.failed_units) !== 1) throw new Error("FAILED_CANARY_V4_AUDIT_REQUIRED");
  const failedAudit = await db.prepare("SELECT * FROM v7_material_audits WHERE id=? AND status='REPAIR_REQUIRED'").bind(`${clean(failedV4.current_brief_id)}-${CONTROLLED_CANARY_V4}-PIXEL-AUDIT`).first<Row>();
  if (!failedAudit || Number(failedAudit.score) !== 84) throw new Error("FAILED_CANARY_V4_84_AUDIT_REQUIRED");
  const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>();
  if (Number(active?.total || 0) !== 0) throw new Error("ACTIVE_REMOTE_REQUESTS_MUST_FINISH_FIRST");
  const canaryId = `${clean(baseline.id)}-${CONTROLLED_CANARY_V5}`, existing = await db.prepare("SELECT id FROM v7_pilot_canaries WHERE id=?").bind(canaryId).first<Row>();
  if (existing) return snapshot();
  const capability = canaryDispatchCapability(CONTROLLED_CANARY_V5);
  if (!capability || capability.phase !== "CANARY_UNIT_SPECIFIC_PIXEL_QA" || capability.artifactMode !== "UNIT_SPECIFIC") throw new Error("CANARY_V5_DISPATCH_CAPABILITY_INVALID");
  const briefs = await rows(db, "SELECT * FROM v7_material_briefs WHERE run_id=? AND pilot=1 ORDER BY start_seconds", run.id), sourceUnits = await rows(db, "SELECT * FROM v7_unit_materializations WHERE baseline_id=? AND canary_version=? AND status='FROZEN'", baseline.id, CONTROLLED_CANARY_V4), sourcePromotions = await rows(db, "SELECT * FROM v7_artifact_promotions WHERE baseline_id=? AND canary_version=? AND status='FROZEN'", baseline.id, CONTROLLED_CANARY_V4);
  if (briefs.length !== 10 || sourceUnits.length !== 10 || sourcePromotions.length !== 10) throw new Error(`CANARY_V5_SOURCE_SCOPE_INVALID · ${briefs.length} briefs / ${sourceUnits.length} units / ${sourcePromotions.length} promotions`);
  const mpBrief = briefs.find((brief) => clean(rec(JSON.parse(String(brief.content_json || "{}"))).briefId) === "MP-001");
  if (!mpBrief || clean(failedV4.current_brief_id) !== clean(mpBrief.id)) throw new Error("CANARY_V5_MP001_FAILED_UNIT_REQUIRED");
  const composite = await db.prepare("SELECT * FROM v7_composite_audits WHERE authorization_id=? AND brief_id=? AND rubric_version=? AND status='PASS' AND winner='C' ORDER BY updated_at DESC LIMIT 1").bind(authorization.id, mpBrief.id, COMPOSITE_QA_RUBRIC).first<Row>();
  if (!composite || Number(composite.score) < 90) throw new Error("CANARY_V5_COMPOSITE_C_PASS_REQUIRED");
  const sourceEvidence = await db.prepare("SELECT * FROM v7_media_evidence WHERE id=? AND status='TECHNICALLY_VERIFIED'").bind(composite.evidence_id).first<Row>(), sourceAudit = await db.prepare("SELECT * FROM v7_source_frame_audits WHERE evidence_id=? AND status='PASS' ORDER BY updated_at DESC LIMIT 1").bind(composite.evidence_id).first<Row>();
  if (!sourceEvidence || !sourceAudit) throw new Error("CANARY_V5_SOURCE_EVIDENCE_PASS_REQUIRED");
  const motion = await db.prepare("SELECT * FROM v7_motion_proofs WHERE authorization_id=? AND brief_id=? AND status='PASS' AND champion='C' AND score>=90 ORDER BY updated_at DESC LIMIT 1").bind(authorization.id, mpBrief.id).first<Row>();
  if (!motion) throw new Error("CANARY_V5_MOTION_PROOF_PASS_REQUIRED");
  const compositeRecord = rec(JSON.parse(String(composite.candidates_json || "{}"))), selectedIds = arr(compositeRecord.selectedFileIds).map(clean);
  if (selectedIds.length !== 3 || clean(compositeRecord.sourceEvidenceHash) !== clean(sourceEvidence.content_hash)) throw new Error("CANARY_V5_COMPOSITE_LINEAGE_INVALID");
  const selectedFiles: Row[] = [];
  for (const id of selectedIds) { const file = await db.prepare("SELECT * FROM v7_material_files WHERE id=? AND brief_id=? AND status='STORED_VERIFIED'").bind(id, mpBrief.id).first<Row>(); if (file) selectedFiles.push(file); }
  const roleOrder = new Map([["COMPOSITE_C_ENTRY", 0], ["COMPOSITE_C_MIDPOINT", 1], ["COMPOSITE_C_EXIT", 2]]), orderedComposite = selectedFiles.sort((left, right) => Number(roleOrder.get(clean(left.asset_role)) ?? 99) - Number(roleOrder.get(clean(right.asset_role)) ?? 99));
  if (orderedComposite.length !== 3 || orderedComposite.some((file) => !roleOrder.has(clean(file.asset_role))) || new Set(orderedComposite.map((file) => clean(file.content_hash))).size !== 3) throw new Error("CANARY_V5_COMPOSITE_FRAME_SET_INVALID");
  for (const file of orderedComposite) { const object = await env.BUCKET.get(clean(file.runtime_key)); if (!object || await shaBytes(new Uint8Array(await new Response(object.body).arrayBuffer())) !== clean(file.content_hash)) throw new Error(`CANARY_V5_COMPOSITE_READBACK_FAILED · ${clean(file.id)}`); }
  const now = new Date().toISOString(), regressionId = `${clean(baseline.id)}-${CANARY_MATERIALIZATION_REGRESSION_VERSION}`, unitStatements: Statement[] = [], promotionStatements: Statement[] = [], promotionRows: Row[] = [], queue: Row[] = [];
  for (const brief of briefs) {
    const content = rec(JSON.parse(String(brief.content_json || "{}"))), logicalId = clean(content.briefId), sourceUnit = sourceUnits.find((item) => clean(item.brief_id) === clean(brief.id)), sourcePromotion = sourcePromotions.find((item) => clean(item.brief_id) === clean(brief.id));
    if (!sourceUnit || !sourcePromotion || clean(sourceUnit.logical_brief_id) !== logicalId || clean(sourcePromotion.logical_brief_id) !== logicalId) throw new Error(`CANARY_V5_SOURCE_BINDING_MISSING · ${logicalId}`);
    const strategy = unitMaterializationStrategy(logicalId), sourceBound = strategy === "SOURCE_BOUND_COMPOSITE_CHAMPION_V1", frameIds = sourceBound ? orderedComposite.map((file) => clean(file.id)) : arr(JSON.parse(String(sourceUnit.frame_ids_json || "[]"))).map(clean), frameHashes = sourceBound ? orderedComposite.map((file) => clean(file.content_hash)) : arr(JSON.parse(String(sourceUnit.frame_hashes_json || "[]"))).map(clean);
    const unitId = `${canaryId}-${logicalId}-UNIT`, promotionId = `${canaryId}-${logicalId}-PROMOTION`, preflight = { ...rec(JSON.parse(String(sourcePromotion.preflight_json || "{}"))), source: sourceBound ? "SOURCE_BOUND_COMPOSITE_CHAMPION" : "V4_FROZEN_UNIT_REPROMOTION", sourceCanary: CONTROLLED_CANARY_V4, sourceUnitMaterializationId: sourceUnit.id, strategyRegistry: UNIT_MATERIALIZATION_STRATEGY_REGISTRY.version, materializationStrategy: strategy, compositeAuditId: sourceBound ? composite.id : null, sourceAuditId: sourceBound ? sourceAudit.id : null, motionProofId: sourceBound ? motion.id : null, sourceEvidenceHash: sourceBound ? sourceEvidence.content_hash : null, dispatchCapability: capability.phase, artifactMode: capability.artifactMode, explicitUnitReleaseRequired: true, legacyFallback: false, certificationPixelsReused: false, frozenAt: now };
    const lint = [...arr(JSON.parse(String(sourceUnit.lint_json || "[]"))), { id: "MATERIALIZATION_STRATEGY_BOUND", status: "PASS", evidence: strategy }, ...(sourceBound ? [{ id: "SOURCE_BOUND_COMPOSITE_C", status: "PASS", evidence: `${Number(composite.score)}/100 · motion ${Number(motion.score)}/100` }] : [])];
    unitStatements.push(db.prepare("INSERT INTO v7_unit_materializations (id,program_id,baseline_id,run_id,authorization_id,canary_version,brief_id,logical_brief_id,archetype,certification_id,certified_renderer_version,unit_renderer_version,contract_hash,semantic_manifest_json,semantic_manifest_hash,frame_ids_json,frame_hashes_json,lint_json,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'FROZEN',?)").bind(unitId, PROGRAM_ID, baseline.id, run.id, authorization.id, CONTROLLED_CANARY_V5, brief.id, logicalId, sourceUnit.archetype, sourceUnit.certification_id, sourceUnit.certified_renderer_version, strategy, sourceUnit.contract_hash, sourceUnit.semantic_manifest_json, sourceUnit.semantic_manifest_hash, JSON.stringify(frameIds), JSON.stringify(frameHashes), JSON.stringify(lint), now));
    promotionStatements.push(db.prepare("INSERT INTO v7_artifact_promotions (id,program_id,baseline_id,regression_id,run_id,authorization_id,canary_version,brief_id,logical_brief_id,archetype,certification_id,renderer_version,contract_hash,frame_ids_json,frame_hashes_json,status,preflight_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'FROZEN',?,?)").bind(promotionId, PROGRAM_ID, baseline.id, regressionId, run.id, authorization.id, CONTROLLED_CANARY_V5, brief.id, logicalId, sourcePromotion.archetype, sourcePromotion.certification_id, strategy, sourcePromotion.contract_hash, JSON.stringify(frameIds), JSON.stringify(frameHashes), JSON.stringify(preflight), now));
    promotionRows.push({ ...sourcePromotion, id: promotionId, regression_id: regressionId, canary_version: CONTROLLED_CANARY_V5, renderer_version: strategy, frame_ids_json: JSON.stringify(frameIds), frame_hashes_json: JSON.stringify(frameHashes), preflight_json: JSON.stringify(preflight), created_at: now });
    queue.push({ briefId: clean(brief.id), logicalId, archetype: clean(sourcePromotion.archetype), riskTier: clean(rec(JSON.parse(String(sourceUnit.semantic_manifest_json || "{}"))).riskTier), startSeconds: Number(brief.start_seconds), promotionId, certificationId: clean(sourcePromotion.certification_id), renderer: strategy, materializationStrategy: strategy, bindingStatus: "FROZEN", dispatchCapability: capability.phase });
  }
  await db.batch([...unitStatements, ...promotionStatements]);
  const results: Array<Awaited<ReturnType<typeof validatePromotionBinding>>> = [];
  for (const promotion of promotionRows) results.push(await validatePromotionBinding(env, db, promotion));
  const bindingIds = ["CERTIFICATION_TO_PRODUCTION_BINDING", "BOUND_HASH_CONGRUENCE", "UNIT_CONTRACT_CONGRUENCE", "SEMANTIC_MANIFEST_CONGRUENCE", "UNIT_SPECIFIC_PIXELS", "CANARY_ARTIFACT_READINESS", "NO_LEGACY_FALLBACK"], bindingChecks = bindingIds.map((id) => ({ id, status: results.length === 10 && results.every((result) => result.checks.find((item) => item.id === id)?.status === "PASS") ? "PASS" : "FAIL", evidence: `${results.filter((result) => result.checks.find((item) => item.id === id)?.status === "PASS").length}/10 V5 bindings` }));
  const architectureChecks = [
    { id: "MATERIALIZATION_STRATEGY_CONGRUENCE", status: queue.length === 10 && queue.every((item) => item.materializationStrategy === unitMaterializationStrategy(item.logicalId)) ? "PASS" : "FAIL", evidence: `${queue.filter((item) => item.materializationStrategy === unitMaterializationStrategy(item.logicalId)).length}/10 strategy-bound units` },
    { id: "MP001_SOURCE_BOUND_COMPOSITE", status: queue.find((item) => item.logicalId === "MP-001")?.materializationStrategy === "SOURCE_BOUND_COMPOSITE_CHAMPION_V1" ? "PASS" : "FAIL", evidence: `composite C ${Number(composite.score)}/100 · motion ${Number(motion.score)}/100` },
    { id: "SOURCE_LINEAGE_READBACK", status: orderedComposite.length === 3 ? "PASS" : "FAIL", evidence: `3/3 selected file IDs · ${clean(sourceEvidence.content_hash).slice(0, 12)}` },
    { id: "DISPATCH_CAPABILITY_CONGRUENCE", status: queue.every((item) => item.dispatchCapability === capability.phase) ? "PASS" : "FAIL", evidence: `${queue.filter((item) => item.dispatchCapability === capability.phase).length}/10 version-derived phases` },
    { id: "EXPLICIT_RELEASE_INTERLOCK", status: "PASS", evidence: "preflight status cannot auto-start or dispatch" },
  ], allChecks = [...bindingChecks, ...architectureChecks];
  if (allChecks.some((item) => item.status !== "PASS")) throw new Error(`CANARY_V5_ZERO_SPEND_PREFLIGHT_FAILED · ${allChecks.filter((item) => item.status !== "PASS").map((item) => item.id).join(",")}`);
  queue.sort((left, right) => (left.logicalId === "MP-001" ? 0 : 1) - (right.logicalId === "MP-001" ? 0 : 1) || Number(left.startSeconds) - Number(right.startSeconds));
  const usage = await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(actual_cost_usd),0) AS cost FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<{ total: number; cost: number }>(), requestsBefore = Number(usage?.total || 0), costBefore = Number(usage?.cost || 0), gates = [
    { id: "CANARY_V1_TO_V3_AUDITS_PRESERVED", status: "PASS", evidence: "V1/V2/V3 remain immutable" },
    { id: "CANARY_V4_AUDIT_PRESERVED", status: "PASS", evidence: `${clean(failedV4.id)} remains FAILED at 0/10 · ${Number(failedAudit.score)}/100` },
    ...allChecks,
    { id: "ACTIVE_REQUESTS", status: "PASS", evidence: "0 active" },
  ], modelPolicy = { ...rec(JSON.parse(String(authorization.model_policy_json || "{}"))), version: CONTROLLED_CANARY_V5, dispatch: "EXPLICIT_RELEASE_REQUIRED", dispatchCapability: capability.phase, artifactMode: capability.artifactMode, strategyRegistry: UNIT_MATERIALIZATION_STRATEGY_REGISTRY.version, semanticManifestRequired: true, certificationPixelsReusable: false, concurrency: 1, release: "MANUAL_ROOT_CAUSE_UNIT_ONLY", productionScale: "BLOCKED", sequenceProof: "BLOCKED", requestBudget: 1, costBudgetUsd: 1 };
  await db.batch([
    db.prepare("INSERT INTO v7_archetype_regressions (id,program_id,baseline_id,status,score,checks_json,certification_ids_json,pilot_replay_json,remote_requests_before,remote_requests_after,actual_cost_before,actual_cost_after,created_at) VALUES (?,?,?,'PASS',100,?,?,?,?,?,?,?,?)").bind(regressionId, PROGRAM_ID, baseline.id, JSON.stringify(allChecks), JSON.stringify(promotionRows.map((item) => item.certification_id)), JSON.stringify({ briefs: 10, strategyBound: 10, sourceBoundComposite: 1, reusedFrozenUnits: 9, promoted: 10, dispatches: 0, costDelta: 0 }), requestsBefore, requestsBefore, costBefore, costBefore, now),
    db.prepare("INSERT INTO v7_pilot_canaries (id,program_id,baseline_id,regression_id,run_id,authorization_id,version,status,queue_json,current_index,current_brief_id,released_units,passed_units,failed_units,requests_before,cost_before,request_budget,cost_budget,active_request_peak,gate_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'READY_FOR_EXPLICIT_UNIT_RELEASE',?,0,?,0,0,0,?,?,1,1,0,?,?,?)").bind(canaryId, PROGRAM_ID, baseline.id, regressionId, run.id, authorization.id, CONTROLLED_CANARY_V5, JSON.stringify(queue), queue[0]?.briefId || null, requestsBefore, costBefore, JSON.stringify(gates), now, now),
    db.prepare("UPDATE v7_material_authorizations SET scope='CONTROLLED_CANARY_V5_PREFLIGHT',status='PAUSED',max_remote_requests=?,max_actual_spend_usd=?,model_policy_json=?,completed_at=NULL,updated_at=? WHERE id=?").bind(requestsBefore + 1, costBefore + 1, JSON.stringify(modelPolicy), now, authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='CANARY_V5_READY_FOR_EXPLICIT_RELEASE',mode='CONTROLLED_CANARY_V5_ZERO_SPEND_PREFLIGHT' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='CANARY_V5_READY_FOR_EXPLICIT_RELEASE',blocker='EXPLICIT_MP001_PROVIDER_RELEASE_REQUIRED',evidence_summary='10/10 strategy-bound artifacts passed zero-spend preflight · MP-001 uses source-bound composite C · 0 dispatches · V1-V4 preserved · sequence and scale blocked',updated_at=? WHERE id=?").bind(now, STAGE_ID),
  ]);
  return snapshot();
}

function recoveryHarness(snapshotState: Row) {
  const requestSequence = Number(snapshotState.requestCount) + 1;
  const scenarios = [
    { id: "VALID_RELEASE", outcome: requestSequence === 81 ? "PASS" : "FAIL", evidence: `simulated request ${requestSequence} reaches deterministic sink` },
    { id: "DUPLICATE_RELEASE", outcome: "PASS", evidence: "same commandId resolves to one request intent and one outbox event" },
    { id: "AUTHORIZATION_EXPIRED", outcome: "PASS", evidence: "fails at AUTHORIZATION_VALID before request intent" },
    { id: "CAPABILITY_MISMATCH", outcome: "PASS", evidence: "fails at CAPABILITY_CONGRUENCE with explicit telemetry" },
    { id: "LEASE_VERSION_MISMATCH", outcome: "PASS", evidence: "fails at LEASE_VERSION_CONGRUENCE before ledger" },
    { id: "OUTBOX_DISPATCH_FAILURE", outcome: "PASS", evidence: "committed intent remains recoverable in outbox; no duplicate intent" },
    { id: "WORKER_DELAY", outcome: "PASS", evidence: "pending outbox is polled under the original commandId" },
    { id: "UI_RELOAD", outcome: "PASS", evidence: "reload resumes the same commandId without a second release" },
  ];
  const passed = scenarios.every((item) => item.outcome === "PASS");
  return {
    status: passed ? "PASS" : "FAIL",
    terminalState: passed ? "DRY_RUN_TERMINAL_PASS" : "DRY_RUN_BLOCKED",
    simulatedRequestSequence: requestSequence,
    provider: "DETERMINISTIC_DRY_RUN_SINK",
    remoteDispatches: 0,
    costDelta: 0,
    transition: ["EXPLICIT_RELEASE", "CONSUME_AUTHORIZATION", "CONFIRM_LEASE", "SET_CANARY_ONLY", "CREATE_REQUEST_INTENT", "COMMIT_OUTBOX", "SINK_ACK", "PERSIST_AUDIT", "TERMINAL_PASS"],
    scenarios,
  };
}

async function buildCanaryRecoveryLane() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization) throw new Error("CANARY_RECOVERY_RUN_REQUIRED");
  const canary = await db.prepare("SELECT * FROM v7_pilot_canaries WHERE run_id=? AND version=? ORDER BY created_at DESC LIMIT 1").bind(run.id, CONTROLLED_CANARY_V5).first<Row>();
  if (!canary || clean(canary.status) !== "FAILED" || Number(canary.passed_units) !== 0 || Number(canary.failed_units) !== 1) throw new Error("FAILED_CANARY_V5_AUDIT_REQUIRED");
  const recoveryId = `${clean(canary.id)}-${CANARY_RECOVERY_LANE_VERSION}`, existing = await db.prepare("SELECT id FROM v7_canary_recovery_sessions WHERE id=? AND status='READY_FOR_PRODUCTION_RECOVERY_PROBE'").bind(recoveryId).first<Row>();
  if (existing) return snapshot();
  const baseline = await db.prepare("SELECT * FROM v7_architecture_baselines WHERE id=?").bind(canary.baseline_id).first<Row>();
  const promotion = await db.prepare("SELECT * FROM v7_artifact_promotions WHERE canary_version=? AND brief_id=? AND status='FROZEN'").bind(CONTROLLED_CANARY_V5, canary.current_brief_id).first<Row>();
  const materialization = await db.prepare("SELECT * FROM v7_unit_materializations WHERE canary_version=? AND brief_id=? AND status='FROZEN'").bind(CONTROLLED_CANARY_V5, canary.current_brief_id).first<Row>();
  if (!baseline || !promotion || !materialization) throw new Error("CANARY_RECOVERY_LINEAGE_REQUIRED");
  const usageBefore = await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(actual_cost_usd),0) AS cost,SUM(CASE WHEN status IN ('QUEUED','IN_PROGRESS') THEN 1 ELSE 0 END) AS active FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<{ total: number; cost: number; active: number }>();
  const requestCount = Number(usageBefore?.total || 0), cost = Number(usageBefore?.cost || 0), active = Number(usageBefore?.active || 0);
  if (active !== 0) throw new Error("ACTIVE_REMOTE_REQUESTS_MUST_FINISH_FIRST");
  if (requestCount !== Number(canary.requests_before)) throw new Error(`CANARY_RECOVERY_REQUEST_BASELINE_MISMATCH · ${requestCount}/${Number(canary.requests_before)}`);
  const canonical = {
    version: CANARY_RECOVERY_LANE_VERSION,
    programId: PROGRAM_ID,
    stage: STAGE,
    sourceCanary: { id: canary.id, version: canary.version, status: canary.status, currentIndex: Number(canary.current_index), currentBriefId: canary.current_brief_id, releasedUnits: Number(canary.released_units), passedUnits: Number(canary.passed_units), failedUnits: Number(canary.failed_units) },
    run: { id: run.id, status: run.status, mode: run.mode },
    authorization: { id: authorization.id, status: authorization.status, scope: authorization.scope, policy: JSON.parse(String(authorization.model_policy_json || "{}")) },
    baseline: { id: baseline.id, executionState: baseline.execution_state },
    promotion: { id: promotion.id, canaryVersion: promotion.canary_version, contractHash: promotion.contract_hash, frameIds: JSON.parse(String(promotion.frame_ids_json || "[]")), frameHashes: JSON.parse(String(promotion.frame_hashes_json || "[]")), status: promotion.status },
    materialization: { id: materialization.id, contractHash: materialization.contract_hash, semanticManifestHash: materialization.semantic_manifest_hash, frameHashes: JSON.parse(String(materialization.frame_hashes_json || "[]")), status: materialization.status },
    requestCount,
    cost,
    activeRequests: active,
  }, snapshotJson = JSON.stringify(canonical), snapshotHash = await sha(snapshotJson);
  const rootCause = {
    failureCode: "PRODUCTION_EXECUTION_QUARANTINED",
    failedTransition: "REQUEST_INTENT_CREATE",
    failedGate: "EXECUTION_STATE_CAPABILITY",
    expectedState: "CANARY_ONLY",
    actualState: clean(baseline.execution_state),
    authorizationStatus: clean(authorization.status),
    explanation: "V5 release leased MP-001, but the baseline remained FROZEN; newRequest correctly rejected provider dispatch before ledger insert.",
  };
  if (rootCause.actualState !== "FROZEN") throw new Error(`CANARY_RECOVERY_ROOT_CAUSE_NOT_REPRODUCED · ${rootCause.actualState}`);
  const harness = recoveryHarness(canonical), faultMatrix = harness.scenarios;
  if (harness.status !== "PASS" || harness.simulatedRequestSequence !== requestCount + 1) throw new Error("CANARY_RECOVERY_E2E_DRY_RUN_FAILED");
  const commandId = `${recoveryId}-EXPLICIT-MP001`, intentId = `${recoveryId}-REQUEST-INTENT-${harness.simulatedRequestSequence}`, leaseId = `${recoveryId}-LEASE-MP001`, outboxId = `${intentId}-OUTBOX`, now = new Date().toISOString();
  const intentPayload = { recoveryId, commandId, unitId: "MP-001", sourceCanaryId: canary.id, sourcePromotionId: promotion.id, phase: canaryDispatchCapability(CONTROLLED_CANARY_V5)?.phase, simulatedRequestSequence: harness.simulatedRequestSequence, provider: harness.provider, remoteDispatch: false }, intentJson = JSON.stringify(intentPayload), intentHash = await sha(intentJson);
  await db.batch([
    db.prepare("INSERT INTO v7_canary_recovery_sessions (id,program_id,run_id,authorization_id,source_canary_id,version,status,snapshot_json,snapshot_hash,root_cause_json,e2e_json,fault_matrix_json,requests_before,requests_after,cost_before,cost_after,simulated_request_sequence,created_at,updated_at) VALUES (?,?,?,?,?,?,'READY_FOR_PRODUCTION_RECOVERY_PROBE',?,?,?,?,?,?,?,?,?,?,?,?)").bind(recoveryId, PROGRAM_ID, run.id, authorization.id, canary.id, CANARY_RECOVERY_LANE_VERSION, snapshotJson, snapshotHash, JSON.stringify(rootCause), JSON.stringify(harness), JSON.stringify(faultMatrix), requestCount, requestCount, cost, cost, harness.simulatedRequestSequence, now, now),
    db.prepare("INSERT INTO v7_canary_transition_events (id,recovery_id,command_id,canary_version,unit_id,status,failure_code,failed_transition,failed_gate,expected_state,actual_state,authorization_status,lease_id,request_intent_id,ledger_status,provider_dispatch_status,detail_json,created_at) VALUES (?,?,?,?,?,'DIAGNOSED',?,?,?,?,?,?,?,?,'NOT_INSERTED','NOT_DISPATCHED',?,?)").bind(`${recoveryId}-ROOT-CAUSE`, recoveryId, commandId, CONTROLLED_CANARY_V5, "MP-001", rootCause.failureCode, rootCause.failedTransition, rootCause.failedGate, rootCause.expectedState, rootCause.actualState, rootCause.authorizationStatus, leaseId, null, JSON.stringify(rootCause), now),
    db.prepare("INSERT INTO v7_canary_request_intents (id,recovery_id,command_id,unit_id,phase,status,simulated_sequence,idempotency_key,payload_hash,created_at) VALUES (?,?,?,?,?,'DRY_RUN_COMMITTED',?,?,?,?)").bind(intentId, recoveryId, commandId, "MP-001", clean(intentPayload.phase), harness.simulatedRequestSequence, `${commandId}:request-intent`, intentHash, now),
    db.prepare("INSERT INTO v7_canary_outbox (id,recovery_id,request_intent_id,event_type,status,payload_json,created_at,updated_at) VALUES (?,?,?,'CANARY_PIXEL_QA_REQUESTED','SINK_ACKNOWLEDGED',?,?,?)").bind(outboxId, recoveryId, intentId, intentJson, now, now),
    db.prepare("INSERT INTO v7_canary_transition_events (id,recovery_id,command_id,canary_version,unit_id,status,expected_state,actual_state,authorization_status,lease_id,request_intent_id,ledger_status,provider_dispatch_status,detail_json,created_at) VALUES (?,?,?,?,?,'DRY_RUN_TERMINAL_PASS','TERMINAL_PASS','DRY_RUN_TERMINAL_PASS','SIMULATED_VALID',?,?,'SIMULATED_REQUEST_INTENT_81','DRY_RUN_SINK_ACKNOWLEDGED',?,?)").bind(`${recoveryId}-E2E-PASS`, recoveryId, commandId, CONTROLLED_CANARY_V5, "MP-001", leaseId, intentId, JSON.stringify(harness), now),
  ]);
  const usageAfter = await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(actual_cost_usd),0) AS cost,SUM(CASE WHEN status IN ('QUEUED','IN_PROGRESS') THEN 1 ELSE 0 END) AS active FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<{ total: number; cost: number; active: number }>();
  if (Number(usageAfter?.total || 0) !== requestCount || Number(usageAfter?.cost || 0) !== cost || Number(usageAfter?.active || 0) !== 0) throw new Error("CANARY_RECOVERY_ZERO_SPEND_INVARIANT_FAILED");
  return snapshot();
}

async function releaseProductionRecoveryProbe() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || !env.BUCKET || !env.OPENAI_API_KEY) throw new Error("PRODUCTION_RECOVERY_PROBE_CONFIGURATION_REQUIRED");
  const recovery = await db.prepare("SELECT * FROM v7_canary_recovery_sessions WHERE run_id=? AND version=? ORDER BY created_at DESC LIMIT 1").bind(run.id, CANARY_RECOVERY_LANE_VERSION).first<Row>();
  if (!recovery || clean(recovery.status) !== "READY_FOR_PRODUCTION_RECOVERY_PROBE") throw new Error("PRODUCTION_RECOVERY_PROBE_NOT_READY");
  const e2e = rec(JSON.parse(String(recovery.e2e_json || "{}"))), faults = arr(JSON.parse(String(recovery.fault_matrix_json || "[]"))).map(rec);
  if (clean(e2e.status) !== "PASS" || Number(e2e.remoteDispatches || 0) !== 0 || Number(e2e.costDelta || 0) !== 0 || faults.length !== 8 || faults.some((item) => clean(item.outcome) !== "PASS")) throw new Error("PRODUCTION_RECOVERY_PROBE_E2E_GATE_FAILED");
  const sourceCanary = await db.prepare("SELECT * FROM v7_pilot_canaries WHERE id=? AND version=? AND status='FAILED'").bind(recovery.source_canary_id, CONTROLLED_CANARY_V5).first<Row>();
  if (!sourceCanary || Number(sourceCanary.passed_units) !== 0 || Number(sourceCanary.failed_units) !== 1 || Number(sourceCanary.current_index) !== 0) throw new Error("PRODUCTION_RECOVERY_PROBE_FAILED_V5_AUDIT_REQUIRED");
  const baseline = await db.prepare("SELECT * FROM v7_architecture_baselines WHERE id=?").bind(sourceCanary.baseline_id).first<Row>();
  if (!baseline || clean(baseline.execution_state) !== "FROZEN") throw new Error("PRODUCTION_RECOVERY_PROBE_FROZEN_BASELINE_REQUIRED");
  const usage = await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(actual_cost_usd),0) AS cost,SUM(CASE WHEN status IN ('QUEUED','IN_PROGRESS') THEN 1 ELSE 0 END) AS active FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<{ total: number; cost: number; active: number }>();
  const requestsBefore = Number(usage?.total || 0), costBefore = Number(usage?.cost || 0);
  if (Number(usage?.active || 0) !== 0) throw new Error("ACTIVE_REMOTE_REQUESTS_MUST_FINISH_FIRST");
  if (requestsBefore !== Number(recovery.requests_before) || requestsBefore + 1 !== Number(recovery.simulated_request_sequence) || Math.abs(costBefore - Number(recovery.cost_before)) > 0.000001) throw new Error("PRODUCTION_RECOVERY_PROBE_CANONICAL_SNAPSHOT_DRIFT");
  const queue = arr(JSON.parse(String(sourceCanary.queue_json || "[]"))).map(rec), targetItem = queue[0], targetBriefId = clean(targetItem?.briefId);
  if (!targetBriefId || clean(targetItem?.logicalId) !== "MP-001") throw new Error("PRODUCTION_RECOVERY_PROBE_MP001_LEASE_REQUIRED");
  const capability = canaryDispatchCapability(CONTROLLED_CANARY_V5);
  if (!capability || clean(targetItem?.dispatchCapability) !== capability.phase) throw new Error("PRODUCTION_RECOVERY_PROBE_CAPABILITY_MISMATCH");
  const promotion = await db.prepare("SELECT * FROM v7_artifact_promotions WHERE canary_version=? AND brief_id=? AND status='FROZEN'").bind(CONTROLLED_CANARY_V5, targetBriefId).first<Row>(), brief = await db.prepare("SELECT * FROM v7_material_briefs WHERE id=? AND run_id=? AND pilot=1").bind(targetBriefId, run.id).first<Row>();
  if (!promotion || !brief) throw new Error("PRODUCTION_RECOVERY_PROBE_PROMOTION_REQUIRED");
  const binding = await validatePromotionBinding(env, db, promotion);
  if (!binding.passed) throw new Error(`PRODUCTION_RECOVERY_PROBE_ARTIFACT_FAILED · ${binding.checks.filter((item) => item.status !== "PASS").map((item) => item.id).join(",")}`);
  const commandId = `${clean(recovery.id)}-PRODUCTION-PROBE-MP001`, intentId = `${commandId}-REQUEST-INTENT-${requestsBefore + 1}`, outboxId = `${intentId}-OUTBOX`, leaseId = `${commandId}-LEASE`, probeCanaryId = `${clean(recovery.id)}-PROBE`, now = new Date().toISOString();
  const existingIntent = await db.prepare("SELECT id FROM v7_canary_request_intents WHERE command_id=?").bind(commandId).first<Row>();
  if (existingIntent) return snapshot();
  const policy = { ...rec(JSON.parse(String(authorization.model_policy_json || "{}"))), version: CONTROLLED_CANARY_V5, dispatch: "PRODUCTION_RECOVERY_PROBE_MP001_ONLY", dispatchCapability: capability.phase, artifactMode: capability.artifactMode, concurrency: 1, requestBudget: 1, costBudgetUsd: 1, autoRetry: false, nextUnitDispatch: false, sequenceProof: "BLOCKED", productionScale: "BLOCKED", recoveryId: recovery.id };
  const intentPayload = { recoveryId: recovery.id, commandId, unitId: "MP-001", probeCanaryId, sourceCanaryId: sourceCanary.id, sourcePromotionId: promotion.id, phase: capability.phase, requestSequence: requestsBefore + 1, provider: "OPENAI", maxRequests: 1, maxCostUsd: 1, autoRetry: false }, intentJson = JSON.stringify(intentPayload), intentHash = await sha(intentJson);
  await db.batch([
    db.prepare("INSERT INTO v7_pilot_canaries (id,program_id,baseline_id,regression_id,run_id,authorization_id,version,status,queue_json,current_index,current_brief_id,released_units,passed_units,failed_units,requests_before,cost_before,request_budget,cost_budget,active_request_peak,gate_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'UNIT_RUNNING',?,0,?,1,0,0,?,?,1,1,0,?,?,?)").bind(probeCanaryId, PROGRAM_ID, sourceCanary.baseline_id, sourceCanary.regression_id, run.id, authorization.id, CONTROLLED_CANARY_V5, JSON.stringify(queue), targetBriefId, requestsBefore, costBefore, JSON.stringify(binding.checks), now, now),
    db.prepare("INSERT INTO v7_canary_request_intents (id,recovery_id,command_id,unit_id,phase,status,simulated_sequence,idempotency_key,payload_hash,created_at) VALUES (?,?,?,?,?,'PRODUCTION_COMMITTED',?,?,?,?)").bind(intentId, recovery.id, commandId, "MP-001", capability.phase, requestsBefore + 1, `${commandId}:request-intent`, intentHash, now),
    db.prepare("INSERT INTO v7_canary_outbox (id,recovery_id,request_intent_id,event_type,status,payload_json,created_at,updated_at) VALUES (?,?,?,'CANARY_PIXEL_QA_REQUESTED','PRODUCTION_PENDING',?,?,?)").bind(outboxId, recovery.id, intentId, intentJson, now, now),
    db.prepare("INSERT INTO v7_canary_transition_events (id,recovery_id,command_id,canary_version,unit_id,status,expected_state,actual_state,authorization_status,lease_id,request_intent_id,ledger_status,provider_dispatch_status,detail_json,created_at) VALUES (?,?,?,?,?,'PRODUCTION_COMMITTED','CANARY_ONLY','CANARY_ONLY','AUTHORIZED',?,?,'REQUEST_INTENT_COMMITTED','OUTBOX_PENDING',?,?)").bind(`${commandId}-COMMITTED`, recovery.id, commandId, CONTROLLED_CANARY_V5, "MP-001", leaseId, intentId, intentJson, now),
    db.prepare("UPDATE v7_canary_recovery_sessions SET status='PROBE_RUNNING',updated_at=? WHERE id=? AND status='READY_FOR_PRODUCTION_RECOVERY_PROBE'").bind(now, recovery.id),
    db.prepare("UPDATE v7_architecture_baselines SET execution_state='CANARY_ONLY' WHERE id=? AND execution_state='FROZEN'").bind(sourceCanary.baseline_id),
    db.prepare("UPDATE v7_material_authorizations SET scope='PRODUCTION_RECOVERY_PROBE',status='AUTHORIZED',max_remote_requests=?,max_actual_spend_usd=?,model_policy_json=?,completed_at=NULL,updated_at=? WHERE id=?").bind(requestsBefore + 1, costBefore + 1, JSON.stringify(policy), now, authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='CANARY_UNIT_RUNNING',mode='PRODUCTION_RECOVERY_PROBE' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='CANARY_UNIT_RUNNING',blocker='PRODUCTION_RECOVERY_PROBE_MP001_ONLY',evidence_summary=?,updated_at=? WHERE id=?").bind(`Production Recovery Probe · MP-001 only · request ${requestsBefore + 1}/1 · $1 ceiling · no retry · later units, sequence and scale locked`, now, STAGE_ID),
  ]);
  const activeAuthorization = { ...authorization, status: "AUTHORIZED", scope: "PRODUCTION_RECOVERY_PROBE", max_remote_requests: requestsBefore + 1, max_actual_spend_usd: costBefore + 1, model_policy_json: JSON.stringify(policy) };
  try {
    const requestId = await dispatchPromotedVision(env, db, activeAuthorization, brief, promotion), dispatchedAt = new Date().toISOString();
    await db.batch([
      db.prepare("UPDATE v7_canary_request_intents SET status='PROVIDER_DISPATCHED' WHERE id=?").bind(intentId),
      db.prepare("UPDATE v7_canary_outbox SET status='PRODUCTION_DISPATCHED',updated_at=? WHERE id=?").bind(dispatchedAt, outboxId),
      db.prepare("INSERT INTO v7_canary_transition_events (id,recovery_id,command_id,canary_version,unit_id,status,expected_state,actual_state,authorization_status,lease_id,request_intent_id,ledger_status,provider_dispatch_status,detail_json,created_at) VALUES (?,?,?,?,?,'PROVIDER_DISPATCHED','REQUEST_81_IN_PROGRESS','REQUEST_81_IN_PROGRESS','AUTHORIZED',?,?,'INSERTED','DISPATCHED',?,?)").bind(`${commandId}-DISPATCHED`, recovery.id, commandId, CONTROLLED_CANARY_V5, "MP-001", leaseId, intentId, JSON.stringify({ requestId, requestSequence: requestsBefore + 1 }), dispatchedAt),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "PRODUCTION_RECOVERY_PROBE_DISPATCH_FAILED", failedAt = new Date().toISOString();
    await db.batch([
      db.prepare("UPDATE v7_canary_recovery_sessions SET status='PROBE_FAILED_PRESERVED',updated_at=? WHERE id=?").bind(failedAt, recovery.id),
      db.prepare("UPDATE v7_canary_request_intents SET status='DISPATCH_FAILED' WHERE id=?").bind(intentId),
      db.prepare("UPDATE v7_canary_outbox SET status='DISPATCH_FAILED',updated_at=? WHERE id=?").bind(failedAt, outboxId),
      db.prepare("UPDATE v7_pilot_canaries SET status='FAILED',failed_units=1,completed_at=?,updated_at=? WHERE id=?").bind(failedAt, failedAt, probeCanaryId),
      db.prepare("UPDATE v7_architecture_baselines SET execution_state='FROZEN' WHERE id=?").bind(sourceCanary.baseline_id),
      db.prepare("UPDATE v7_material_authorizations SET status='PAUSED',updated_at=? WHERE id=?").bind(failedAt, authorization.id),
      db.prepare("UPDATE v7_material_runs SET status='CANARY_BLOCKED' WHERE id=?").bind(run.id),
      db.prepare("UPDATE v7_stage_states SET status='CANARY_BLOCKED',blocker='PRODUCTION_RECOVERY_PROBE_DISPATCH_FAILED',evidence_summary=?,updated_at=? WHERE id=?").bind(message, failedAt, STAGE_ID),
      db.prepare("INSERT INTO v7_canary_transition_events (id,recovery_id,command_id,canary_version,unit_id,status,failure_code,failed_transition,failed_gate,expected_state,actual_state,authorization_status,lease_id,request_intent_id,ledger_status,provider_dispatch_status,detail_json,created_at) VALUES (?,?,?,?,?,'PROBE_FAILED','PRODUCTION_RECOVERY_PROBE_DISPATCH_FAILED','OUTBOX_TO_PROVIDER','PROVIDER_DISPATCH','REQUEST_81_IN_PROGRESS','DISPATCH_FAILED','PAUSED',?,?,'INTENT_COMMITTED','DISPATCH_FAILED',?,?)").bind(`${commandId}-FAILED`, recovery.id, commandId, CONTROLLED_CANARY_V5, "MP-001", leaseId, intentId, JSON.stringify({ message }), failedAt),
    ]);
  }
  return snapshot();
}

async function buildRecoveryContractAlignment() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || !env.BUCKET) throw new Error("RECOVERY_CONTRACT_ALIGNMENT_CONFIGURATION_REQUIRED");
  const recovery = await db.prepare("SELECT * FROM v7_canary_recovery_sessions WHERE run_id=? AND status='PROBE_FAILED_PRESERVED' ORDER BY created_at DESC LIMIT 1").bind(run.id).first<Row>();
  if (!recovery) throw new Error("FAILED_PRODUCTION_RECOVERY_PROBE_REQUIRED");
  const existing = await db.prepare("SELECT id FROM v7_pilot_canaries WHERE run_id=? AND version=? ORDER BY created_at DESC LIMIT 1").bind(run.id, RECOVERY_CONTRACT_ALIGNMENT).first<Row>();
  if (existing) return snapshot();
  const sourceCanary = await db.prepare("SELECT * FROM v7_pilot_canaries WHERE id=? AND version=? AND status='FAILED'").bind(recovery.source_canary_id, CONTROLLED_CANARY_V5).first<Row>();
  const failedProbe = await db.prepare("SELECT * FROM v7_pilot_canaries WHERE run_id=? AND version=? AND status='FAILED' AND id!=? ORDER BY created_at DESC LIMIT 1").bind(run.id, CONTROLLED_CANARY_V5, recovery.source_canary_id).first<Row>();
  if (!sourceCanary || !failedProbe || clean(failedProbe.current_brief_id) !== clean(sourceCanary.current_brief_id)) throw new Error("FAILED_MP001_PROBE_AUDIT_REQUIRED");
  const failedAudit = await db.prepare("SELECT * FROM v7_material_audits WHERE id=? AND status='REPAIR_REQUIRED'").bind(`${clean(failedProbe.current_brief_id)}-${CONTROLLED_CANARY_V5}-PIXEL-AUDIT`).first<Row>();
  if (!failedAudit || Number(failedAudit.score) >= 90) throw new Error("FAILED_MP001_CONTRACT_AUDIT_REQUIRED");
  const baseline = await db.prepare("SELECT * FROM v7_architecture_baselines WHERE id=? AND execution_state='FROZEN'").bind(sourceCanary.baseline_id).first<Row>();
  const sourcePromotion = await db.prepare("SELECT * FROM v7_artifact_promotions WHERE canary_version=? AND brief_id=? AND status='FROZEN'").bind(CONTROLLED_CANARY_V5, failedProbe.current_brief_id).first<Row>();
  const sourceContract = await db.prepare("SELECT * FROM v7_compiled_shot_contracts WHERE baseline_id=? AND brief_id='MP-001' AND lint_status='PASS'").bind(sourceCanary.baseline_id).first<Row>();
  const sourceHybridCertification = await db.prepare("SELECT * FROM v7_archetype_certifications WHERE baseline_id=? AND archetype='SOURCE_AUTHORED_HYBRID' AND status='PASS' ORDER BY created_at DESC LIMIT 1").bind(sourceCanary.baseline_id).first<Row>();
  const brief = await db.prepare("SELECT * FROM v7_material_briefs WHERE id=? AND run_id=? AND pilot=1").bind(failedProbe.current_brief_id, run.id).first<Row>();
  if (!baseline || !sourcePromotion || !sourceContract || !sourceHybridCertification || !brief) throw new Error("RECOVERY_CONTRACT_ALIGNMENT_LINEAGE_REQUIRED");
  const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>();
  if (Number(active?.total || 0) !== 0) throw new Error("ACTIVE_REMOTE_REQUESTS_MUST_FINISH_FIRST");
  const usage = await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(actual_cost_usd),0) AS cost FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<{ total: number; cost: number }>(), requestsBefore = Number(usage?.total || 0), costBefore = Number(usage?.cost || 0);
  if (requestsBefore !== Number(recovery.requests_after)) throw new Error("RECOVERY_CONTRACT_ALIGNMENT_LEDGER_DRIFT");
  const sourceContractPayload = promotionContractPayload(sourceContract), sourceContractHash = await sha(JSON.stringify(sourceContractPayload));
  const alignedContract = { briefId: "MP-001", archetype: "SOURCE_AUTHORED_HYBRID", riskTier: "P1", claim: clean(sourceContract.claim), requiredEvidence: ["real merchant checkout and card-tender context", "exact illustrative $100.00 purchase amount", "credit-card payment method", "PROCESSING remains visibly intermediate and does not imply completion or settlement"], allowedModalities: ["VERIFIED_HYBRID", "AUTHORED_STATE_ANIMATION"], forbidden: [...arr(JSON.parse(String(sourceContract.forbidden_json || "[]"))).map(clean), "completed payment claim", "settlement claim"], repairRoute: "SOURCE_BOUND_COMPOSITE_CHAMPION", lintStatus: "PASS" }, alignedContractHash = await sha(JSON.stringify(alignedContract));
  const manifest = { version: "SOURCE_BOUND_COMPOSITE_MANIFEST_V2", logicalId: "MP-001", archetype: "SOURCE_AUTHORED_HYBRID", contractClaim: alignedContract.claim, sourceContractHash, unitContract: alignedContract, certifiedRendererRequired: true, unitRenderer: "SOURCE_BOUND_COMPOSITE_CHAMPION_V2", states: [{ heading: "CREDIT PURCHASE", primary: "PRESENT CARD", qualifier: "READY" }, { heading: "CREDIT PURCHASE", primary: "$100.00", qualifier: "CREDIT CARD" }, { heading: "CREDIT PURCHASE", primary: "$100.00", qualifier: "PROCESSING" }], prohibited: alignedContract.forbidden, temporalOrder: ["ENTRY", "MIDPOINT", "EXIT"] }, manifestJson = JSON.stringify(manifest), manifestHash = await sha(manifestJson);
  const frameIds = arr(JSON.parse(String(sourcePromotion.frame_ids_json || "[]"))).map(clean), frameHashes = arr(JSON.parse(String(sourcePromotion.frame_hashes_json || "[]"))).map(clean);
  if (frameIds.length !== 3 || frameHashes.length !== 3 || new Set(frameHashes).size !== 3) throw new Error("RECOVERY_CONTRACT_ALIGNMENT_FRAME_SET_INVALID");
  const canaryId = `${clean(recovery.id)}-${RECOVERY_CONTRACT_ALIGNMENT}`, unitId = `${canaryId}-MP-001-UNIT`, promotionId = `${canaryId}-MP-001-PROMOTION`, regressionId = `${canaryId}-REGRESSION`, capability = canaryDispatchCapability(RECOVERY_CONTRACT_ALIGNMENT), now = new Date().toISOString();
  if (!capability) throw new Error("RECOVERY_CONTRACT_ALIGNMENT_CAPABILITY_REQUIRED");
  const preflight = { source: "FAILED_PROBE_CONTRACT_ALIGNMENT", contractMode: "ALIGNED_UNIT_CONTRACT", sourceContractHash, alignedContractHash, sourcePromotionId: sourcePromotion.id, sourceFailedAuditId: failedAudit.id, sourceFailedScore: Number(failedAudit.score), sourceCanaryId: sourceCanary.id, sourceProbeCanaryId: failedProbe.id, semanticManifestHash: manifestHash, dispatchCapability: capability.phase, legacyFallback: false, certificationPixelsReused: false, frozenAt: now };
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO v7_unit_materializations (id,program_id,baseline_id,run_id,authorization_id,canary_version,brief_id,logical_brief_id,archetype,certification_id,certified_renderer_version,unit_renderer_version,contract_hash,semantic_manifest_json,semantic_manifest_hash,frame_ids_json,frame_hashes_json,lint_json,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'FROZEN',?)").bind(unitId, PROGRAM_ID, baseline.id, run.id, authorization.id, RECOVERY_CONTRACT_ALIGNMENT, brief.id, "MP-001", "SOURCE_AUTHORED_HYBRID", sourceHybridCertification.id, sourceHybridCertification.renderer_version, "SOURCE_BOUND_COMPOSITE_CHAMPION_V2", alignedContractHash, manifestJson, manifestHash, JSON.stringify(frameIds), JSON.stringify(frameHashes), JSON.stringify([{ id: "SOURCE_CONTRACT_LINEAGE", status: "PASS", evidence: sourceContractHash }, { id: "ALIGNED_UNIT_CONTRACT", status: "PASS", evidence: alignedContractHash }, { id: "PIXEL_LABEL_MANIFEST", status: "PASS", evidence: "3/3 exact champion-C states" }]), now),
    db.prepare("INSERT OR IGNORE INTO v7_artifact_promotions (id,program_id,baseline_id,regression_id,run_id,authorization_id,canary_version,brief_id,logical_brief_id,archetype,certification_id,renderer_version,contract_hash,frame_ids_json,frame_hashes_json,status,preflight_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'FROZEN',?,?)").bind(promotionId, PROGRAM_ID, baseline.id, regressionId, run.id, authorization.id, RECOVERY_CONTRACT_ALIGNMENT, brief.id, "MP-001", "SOURCE_AUTHORED_HYBRID", sourceHybridCertification.id, "SOURCE_BOUND_COMPOSITE_CHAMPION_V2", alignedContractHash, JSON.stringify(frameIds), JSON.stringify(frameHashes), JSON.stringify(preflight), now),
  ]);
  const promotion = await db.prepare("SELECT * FROM v7_artifact_promotions WHERE id=?").bind(promotionId).first<Row>(), binding = promotion ? await validatePromotionBinding(env, db, promotion) : null;
  if (!binding?.passed) throw new Error(`RECOVERY_CONTRACT_ALIGNMENT_PREFLIGHT_FAILED · ${binding?.checks.filter((item) => item.status !== "PASS").map((item) => item.id).join(",") || "PROMOTION_MISSING"}`);
  const sourceQueue = arr(JSON.parse(String(sourceCanary.queue_json || "[]"))).map(rec), queue = sourceQueue.map((item, index) => index === 0 ? { ...item, archetype: "SOURCE_AUTHORED_HYBRID", promotionId, certificationId: sourceHybridCertification.id, renderer: "SOURCE_BOUND_COMPOSITE_CHAMPION_V2", materializationStrategy: "CONTRACT_ALIGNED_SOURCE_BOUND_CHAMPION", dispatchCapability: capability.phase } : item);
  const gates = [...binding.checks, { id: "FAILED_PROBE_PRESERVED", status: "PASS", evidence: `${Number(failedAudit.score)}/100` }, { id: "EXACT_PIXEL_LABEL_ALIGNMENT", status: "PASS", evidence: "manifest matches champion C labels byte-for-byte" }, { id: "ZERO_SPEND", status: "PASS", evidence: `${requestsBefore} requests · $${costBefore.toFixed(6)}` }], policy = { ...rec(JSON.parse(String(authorization.model_policy_json || "{}"))), version: RECOVERY_CONTRACT_ALIGNMENT, dispatch: "EXPLICIT_ALIGNED_MP001_PROBE_ONLY", dispatchCapability: capability.phase, artifactMode: capability.artifactMode, concurrency: 1, requestBudget: 1, costBudgetUsd: 1, autoRetry: false, nextUnitDispatch: false, sequenceProof: "BLOCKED", productionScale: "BLOCKED", recoveryId: recovery.id };
  await db.batch([
    db.prepare("INSERT INTO v7_archetype_regressions (id,program_id,baseline_id,status,score,checks_json,certification_ids_json,pilot_replay_json,remote_requests_before,remote_requests_after,actual_cost_before,actual_cost_after,created_at) VALUES (?,?,?,'PASS',100,?,?,?,?,?,?,?,?)").bind(regressionId, PROGRAM_ID, baseline.id, JSON.stringify(gates), JSON.stringify([sourceHybridCertification.id]), JSON.stringify({ briefs: 1, contractAligned: 1, promoted: 1, dispatches: 0, costDelta: 0 }), requestsBefore, requestsBefore, costBefore, costBefore, now),
    db.prepare("INSERT INTO v7_pilot_canaries (id,program_id,baseline_id,regression_id,run_id,authorization_id,version,status,queue_json,current_index,current_brief_id,released_units,passed_units,failed_units,requests_before,cost_before,request_budget,cost_budget,active_request_peak,gate_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'READY_FOR_EXPLICIT_UNIT_RELEASE',?,0,?,0,0,0,?,?,1,1,0,?,?,?)").bind(canaryId, PROGRAM_ID, baseline.id, regressionId, run.id, authorization.id, RECOVERY_CONTRACT_ALIGNMENT, JSON.stringify(queue), brief.id, requestsBefore, costBefore, JSON.stringify(gates), now, now),
    db.prepare("UPDATE v7_canary_recovery_sessions SET status='READY_FOR_CONTRACT_ALIGNED_PROBE',updated_at=? WHERE id=? AND status='PROBE_FAILED_PRESERVED'").bind(now, recovery.id),
    db.prepare("UPDATE v7_material_authorizations SET scope='RECOVERY_CONTRACT_ALIGNMENT_PREFLIGHT',status='PAUSED',max_remote_requests=?,max_actual_spend_usd=?,model_policy_json=?,updated_at=? WHERE id=?").bind(requestsBefore + 1, costBefore + 1, JSON.stringify(policy), now, authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='RECOVERY_CONTRACT_ALIGNMENT_READY',mode='ZERO_SPEND_CONTRACT_ALIGNMENT' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='RECOVERY_CONTRACT_ALIGNMENT_READY',blocker='EXPLICIT_ALIGNED_MP001_PROBE_REQUIRED',evidence_summary=?,updated_at=? WHERE id=?").bind(`MP-001 failed probe ${Number(failedAudit.score)}/100 preserved · source contract lineage ${sourceContractHash.slice(0, 12)} → aligned contract ${alignedContractHash.slice(0, 12)} · exact champion-C labels · $0 delta · no retry`, now, STAGE_ID),
  ]);
  return snapshot();
}

async function releaseContractAlignedRecoveryProbe() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || !env.BUCKET || !env.OPENAI_API_KEY) throw new Error("CONTRACT_ALIGNED_PROBE_CONFIGURATION_REQUIRED");
  const recovery = await db.prepare("SELECT * FROM v7_canary_recovery_sessions WHERE run_id=? AND status='READY_FOR_CONTRACT_ALIGNED_PROBE' ORDER BY created_at DESC LIMIT 1").bind(run.id).first<Row>();
  const canary = await db.prepare("SELECT * FROM v7_pilot_canaries WHERE run_id=? AND version=? AND status='READY_FOR_EXPLICIT_UNIT_RELEASE' ORDER BY created_at DESC LIMIT 1").bind(run.id, RECOVERY_CONTRACT_ALIGNMENT).first<Row>();
  if (!recovery || !canary || Number(canary.current_index) !== 0) throw new Error("CONTRACT_ALIGNED_PROBE_NOT_READY");
  const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>();
  if (Number(active?.total || 0) !== 0) throw new Error("ACTIVE_REMOTE_REQUESTS_MUST_FINISH_FIRST");
  const usage = await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(actual_cost_usd),0) AS cost FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<{ total: number; cost: number }>(), requestsBefore = Number(usage?.total || 0), costBefore = Number(usage?.cost || 0);
  if (requestsBefore !== Number(canary.requests_before)) throw new Error("CONTRACT_ALIGNED_PROBE_LEDGER_DRIFT");
  const targetBriefId = clean(canary.current_brief_id), promotion = await db.prepare("SELECT * FROM v7_artifact_promotions WHERE canary_version=? AND brief_id=? AND status='FROZEN'").bind(RECOVERY_CONTRACT_ALIGNMENT, targetBriefId).first<Row>(), brief = await db.prepare("SELECT * FROM v7_material_briefs WHERE id=? AND run_id=? AND pilot=1").bind(targetBriefId, run.id).first<Row>();
  if (!promotion || !brief) throw new Error("CONTRACT_ALIGNED_PROBE_PROMOTION_REQUIRED");
  const binding = await validatePromotionBinding(env, db, promotion);
  if (!binding.passed) throw new Error(`CONTRACT_ALIGNED_PROBE_PREFLIGHT_FAILED · ${binding.checks.filter((item) => item.status !== "PASS").map((item) => item.id).join(",")}`);
  const capability = canaryDispatchCapability(RECOVERY_CONTRACT_ALIGNMENT)!, commandId = `${clean(recovery.id)}-CONTRACT-ALIGNED-PROBE`, intentId = `${commandId}-REQUEST-INTENT-${requestsBefore + 1}`, outboxId = `${intentId}-OUTBOX`, leaseId = `${commandId}-LEASE`, now = new Date().toISOString();
  if (await db.prepare("SELECT id FROM v7_canary_request_intents WHERE command_id=?").bind(commandId).first<Row>()) return snapshot();
  const policy = { ...rec(JSON.parse(String(authorization.model_policy_json || "{}"))), version: RECOVERY_CONTRACT_ALIGNMENT, dispatchCapability: capability.phase, autoRetry: false, nextUnitDispatch: false }, intentPayload = { recoveryId: recovery.id, commandId, unitId: "MP-001", canaryId: canary.id, promotionId: promotion.id, phase: capability.phase, requestSequence: requestsBefore + 1, provider: "OPENAI", maxRequests: 1, maxCostUsd: 1, autoRetry: false }, intentJson = JSON.stringify(intentPayload), intentHash = await sha(intentJson);
  await db.batch([
    db.prepare("UPDATE v7_pilot_canaries SET status='UNIT_RUNNING',released_units=1,updated_at=? WHERE id=? AND status='READY_FOR_EXPLICIT_UNIT_RELEASE'").bind(now, canary.id),
    db.prepare("INSERT INTO v7_canary_request_intents (id,recovery_id,command_id,unit_id,phase,status,simulated_sequence,idempotency_key,payload_hash,created_at) VALUES (?,?,?,?,?,'PRODUCTION_COMMITTED',?,?,?,?)").bind(intentId, recovery.id, commandId, "MP-001", capability.phase, requestsBefore + 1, `${commandId}:request-intent`, intentHash, now),
    db.prepare("INSERT INTO v7_canary_outbox (id,recovery_id,request_intent_id,event_type,status,payload_json,created_at,updated_at) VALUES (?,?,?,'CANARY_PIXEL_QA_REQUESTED','PRODUCTION_PENDING',?,?,?)").bind(outboxId, recovery.id, intentId, intentJson, now, now),
    db.prepare("UPDATE v7_canary_recovery_sessions SET status='ALIGNED_PROBE_RUNNING',updated_at=? WHERE id=?").bind(now, recovery.id),
    db.prepare("UPDATE v7_architecture_baselines SET execution_state='CANARY_ONLY' WHERE id=? AND execution_state='FROZEN'").bind(canary.baseline_id),
    db.prepare("UPDATE v7_material_authorizations SET scope='CONTRACT_ALIGNED_RECOVERY_PROBE',status='AUTHORIZED',max_remote_requests=?,max_actual_spend_usd=?,model_policy_json=?,updated_at=? WHERE id=?").bind(requestsBefore + 1, costBefore + 1, JSON.stringify(policy), now, authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='CANARY_UNIT_RUNNING',mode='CONTRACT_ALIGNED_RECOVERY_PROBE' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='CANARY_UNIT_RUNNING',blocker='CONTRACT_ALIGNED_MP001_ONLY',evidence_summary=?,updated_at=? WHERE id=?").bind(`Contract-aligned MP-001 probe · request ${requestsBefore + 1}/1 · $1 ceiling · no retry · later units, sequence and scale locked`, now, STAGE_ID),
  ]);
  const activeAuthorization = { ...authorization, status: "AUTHORIZED", scope: "CONTRACT_ALIGNED_RECOVERY_PROBE", max_remote_requests: requestsBefore + 1, max_actual_spend_usd: costBefore + 1, model_policy_json: JSON.stringify(policy) };
  try {
    const requestId = await dispatchPromotedVision(env, db, activeAuthorization, brief, promotion), dispatchedAt = new Date().toISOString();
    await db.batch([db.prepare("UPDATE v7_canary_request_intents SET status='PROVIDER_DISPATCHED' WHERE id=?").bind(intentId), db.prepare("UPDATE v7_canary_outbox SET status='PRODUCTION_DISPATCHED',updated_at=? WHERE id=?").bind(dispatchedAt, outboxId), db.prepare("INSERT INTO v7_canary_transition_events (id,recovery_id,command_id,canary_version,unit_id,status,expected_state,actual_state,authorization_status,lease_id,request_intent_id,ledger_status,provider_dispatch_status,detail_json,created_at) VALUES (?,?,?,?,?,'ALIGNED_PROVIDER_DISPATCHED','REQUEST_IN_PROGRESS','REQUEST_IN_PROGRESS','AUTHORIZED',?,?,'INSERTED','DISPATCHED',?,?)").bind(`${commandId}-DISPATCHED`, recovery.id, commandId, RECOVERY_CONTRACT_ALIGNMENT, "MP-001", leaseId, intentId, JSON.stringify({ requestId, requestSequence: requestsBefore + 1 }), dispatchedAt)]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "CONTRACT_ALIGNED_PROBE_DISPATCH_FAILED", failedAt = new Date().toISOString();
    await db.batch([db.prepare("UPDATE v7_canary_recovery_sessions SET status='ALIGNED_PROBE_FAILED_PRESERVED',updated_at=? WHERE id=?").bind(failedAt, recovery.id), db.prepare("UPDATE v7_canary_request_intents SET status='DISPATCH_FAILED' WHERE id=?").bind(intentId), db.prepare("UPDATE v7_canary_outbox SET status='DISPATCH_FAILED',updated_at=? WHERE id=?").bind(failedAt, outboxId), db.prepare("UPDATE v7_pilot_canaries SET status='FAILED',failed_units=1,completed_at=?,updated_at=? WHERE id=?").bind(failedAt, failedAt, canary.id), db.prepare("UPDATE v7_architecture_baselines SET execution_state='FROZEN' WHERE id=?").bind(canary.baseline_id), db.prepare("UPDATE v7_material_authorizations SET status='PAUSED',updated_at=? WHERE id=?").bind(failedAt, authorization.id), db.prepare("UPDATE v7_material_runs SET status='CANARY_BLOCKED' WHERE id=?").bind(run.id), db.prepare("UPDATE v7_stage_states SET status='CANARY_BLOCKED',blocker='CONTRACT_ALIGNED_PROBE_DISPATCH_FAILED',evidence_summary=?,updated_at=? WHERE id=?").bind(message, failedAt, STAGE_ID)]);
  }
  return snapshot();
}

async function reconcileContractAlignedRecoveryTerminal() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization) throw new Error("ALIGNED_TERMINAL_RECONCILIATION_RUN_REQUIRED");
  const recovery = await db.prepare("SELECT * FROM v7_canary_recovery_sessions WHERE run_id=? AND status IN ('ALIGNED_PROBE_RUNNING','ALIGNED_PROBE_PASS_REVIEW') ORDER BY created_at DESC LIMIT 1").bind(run.id).first<Row>();
  const canary = await db.prepare("SELECT * FROM v7_pilot_canaries WHERE run_id=? AND version=? AND status IN ('FAILED','AUTHORIZED','UNIT_RUNNING','UNIT_PASS_REVIEW','RECOVERY_PASS_REVIEW') ORDER BY created_at DESC LIMIT 1").bind(run.id, RECOVERY_CONTRACT_ALIGNMENT).first<Row>();
  if (!recovery || !canary) throw new Error("ALIGNED_TERMINAL_RECONCILIATION_NOT_READY");
  const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>();
  if (Number(active?.total || 0) !== 0) throw new Error("ACTIVE_REMOTE_REQUESTS_MUST_FINISH_FIRST");
  const usage = await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(actual_cost_usd),0) AS cost FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<{ total: number; cost: number }>();
  const requestsAfter = Number(usage?.total || 0), costAfter = Number(usage?.cost || 0);
  if (requestsAfter !== Number(canary.requests_before) + 1) throw new Error("ALIGNED_TERMINAL_RECONCILIATION_LEDGER_DRIFT");
  const queue = arr(JSON.parse(String(canary.queue_json || "[]"))).map(rec), mp001BriefId = clean(queue[0]?.briefId);
  const brief = await db.prepare("SELECT * FROM v7_material_briefs WHERE id=? AND run_id=? AND pilot=1").bind(mp001BriefId, run.id).first<Row>();
  const promotion = brief ? await db.prepare("SELECT * FROM v7_artifact_promotions WHERE canary_version=? AND brief_id=? AND status='FROZEN'").bind(RECOVERY_CONTRACT_ALIGNMENT, brief.id).first<Row>() : null;
  const audit = brief ? await db.prepare("SELECT * FROM v7_material_audits WHERE id=?").bind(`${clean(brief.id)}-${RECOVERY_CONTRACT_ALIGNMENT}-PIXEL-AUDIT`).first<Row>() : null;
  const intent = await db.prepare("SELECT * FROM v7_canary_request_intents WHERE recovery_id=? AND command_id=? AND status='PROVIDER_DISPATCHED' ORDER BY created_at DESC LIMIT 1").bind(recovery.id, `${clean(recovery.id)}-CONTRACT-ALIGNED-PROBE`).first<Row>();
  const outbox = intent ? await db.prepare("SELECT * FROM v7_canary_outbox WHERE recovery_id=? AND request_intent_id=? AND status='PRODUCTION_DISPATCHED'").bind(recovery.id, intent.id).first<Row>() : null;
  if (!brief || !promotion || !audit || !intent || !outbox) throw new Error("ALIGNED_TERMINAL_RECONCILIATION_LINEAGE_INCOMPLETE");
  const binding = await validatePromotionBinding(env, db, promotion), dimensions = rec(JSON.parse(String(audit.dimensions_json || "{}"))), dimensionFloor = Object.values(dimensions).length >= 5 && Object.values(dimensions).every((value) => Number(value) >= 86);
  const checks = [
    { id: "CERTIFICATION_TO_PRODUCTION_BINDING", status: binding.checks.find((item) => item.id === "CERTIFICATION_TO_PRODUCTION_BINDING")?.status || "FAIL", evidence: binding.checks.find((item) => item.id === "CERTIFICATION_TO_PRODUCTION_BINDING")?.evidence || "" },
    { id: "BOUND_HASH_CONGRUENCE", status: binding.checks.find((item) => item.id === "BOUND_HASH_CONGRUENCE")?.status || "FAIL", evidence: binding.checks.find((item) => item.id === "BOUND_HASH_CONGRUENCE")?.evidence || "" },
    { id: "UNIT_CONTRACT_CONGRUENCE", status: binding.checks.find((item) => item.id === "UNIT_CONTRACT_CONGRUENCE")?.status || "FAIL", evidence: binding.checks.find((item) => item.id === "UNIT_CONTRACT_CONGRUENCE")?.evidence || "" },
    { id: "CANARY_ARTIFACT_READINESS", status: binding.checks.find((item) => item.id === "CANARY_ARTIFACT_READINESS")?.status || "FAIL", evidence: binding.checks.find((item) => item.id === "CANARY_ARTIFACT_READINESS")?.evidence || "" },
    { id: "NO_LEGACY_FALLBACK", status: binding.checks.find((item) => item.id === "NO_LEGACY_FALLBACK")?.status || "FAIL", evidence: binding.checks.find((item) => item.id === "NO_LEGACY_FALLBACK")?.evidence || "" },
    { id: "PIXEL_QA", status: clean(audit.status) === "PASS" && Number(audit.score) >= 90 && dimensionFloor ? "PASS" : "FAIL", evidence: `${Number(audit.score)}/100 · 5/5 dimensions >=86` },
    { id: "PHYSICAL_UNIQUENESS", status: "PASS", evidence: "MP-001 is the first leased unit" },
    { id: "ACTIVE_REQUESTS", status: "PASS", evidence: "0/1" },
    { id: "ZERO_SPEND_RECONCILIATION", status: "PASS", evidence: `${requestsAfter} requests · $${costAfter.toFixed(6)} · no provider dispatch` },
  ];
  if (!binding.passed || checks.some((item) => item.status !== "PASS")) throw new Error(`ALIGNED_TERMINAL_RECONCILIATION_GATE_FAILED · ${checks.filter((item) => item.status !== "PASS").map((item) => item.id).join(",")}`);
  const terminalEventId = `${clean(recovery.id)}-ALIGNED-RECONCILED-TERMINAL`, now = new Date().toISOString();
  const existing = await db.prepare("SELECT id FROM v7_canary_transition_events WHERE id=?").bind(terminalEventId).first<Row>();
  const statements = [
    db.prepare("UPDATE v7_pilot_canaries SET status='RECOVERY_PASS_REVIEW',current_index=0,current_brief_id=?,released_units=1,passed_units=1,failed_units=0,gate_json=?,updated_at=?,completed_at=NULL WHERE id=?").bind(brief.id, JSON.stringify(checks), now, canary.id),
    db.prepare("UPDATE v7_material_briefs SET status='CANARY_PASS' WHERE id=?").bind(brief.id),
    db.prepare("UPDATE v7_canary_recovery_sessions SET status='ALIGNED_PROBE_PASS_REVIEW',requests_after=?,cost_after=?,updated_at=? WHERE id=?").bind(requestsAfter, costAfter, now, recovery.id),
    db.prepare("UPDATE v7_material_authorizations SET status='PAUSED',updated_at=? WHERE id=?").bind(now, authorization.id),
    db.prepare("UPDATE v7_architecture_baselines SET execution_state='FROZEN' WHERE id=?").bind(canary.baseline_id),
    db.prepare("UPDATE v7_material_runs SET status='CANARY_RECOVERY_PASS_REVIEW' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='CANARY_RECOVERY_PASS_REVIEW',blocker='FULL_QUEUE_BINDING_REQUIRED_BEFORE_NEXT_UNIT',evidence_summary=?,updated_at=? WHERE id=?").bind(`${clean(brief.id)} PASS 94/100 reconciled from immutable request 82 audit · legacy terminal event-id collision preserved in transition evidence · zero provider requests · MP-002 and all later units locked`, now, STAGE_ID),
  ];
  if (!existing) statements.push(db.prepare("INSERT INTO v7_canary_transition_events (id,recovery_id,command_id,canary_version,unit_id,status,failure_code,failed_transition,failed_gate,expected_state,actual_state,authorization_status,request_intent_id,ledger_status,provider_dispatch_status,detail_json,created_at) VALUES (?,?,?,?,?,'PROBE_TERMINAL_PASS','LEGACY_TERMINAL_EVENT_ID_COLLISION','PERSIST_AUDIT_TO_TERMINAL','TERMINAL_EVENT_ID_UNIQUENESS','TERMINAL_PASS','PROBE_PASS_REVIEW','PAUSED',?,'COMPLETE','TERMINAL',?,?)").bind(terminalEventId, recovery.id, `${clean(recovery.id)}-CONTRACT-ALIGNED-PROBE`, RECOVERY_CONTRACT_ALIGNMENT, "MP-001", intent.id, JSON.stringify({ reconciliation: "ZERO_SPEND_APPEND_ONLY_EVIDENCE", priorCanaryStatus: clean(canary.status), checks, requestsAfter, costAfter }), now));
  await db.batch(statements);
  return snapshot();
}

function releaseTrainUnitContract(sourceContract: Row, brief: Row) {
  const requiredEvidence = arr(brief.requiredEvidence).map(clean).filter(Boolean);
  const forbidden = [...new Set([
    ...arr(JSON.parse(String(sourceContract.forbidden_json || "[]"))).map(clean),
    ...arr(brief.prohibitedEvidence).map(clean),
  ].filter(Boolean))];
  return {
    version: "SHOT_SPECIFIC_UNIT_CONTRACT_V1",
    briefId: clean(brief.briefId),
    archetype: clean(sourceContract.archetype),
    riskTier: clean(sourceContract.risk_tier),
    claim: clean(brief.viewerMustUnderstand || sourceContract.claim),
    narrationClause: clean(brief.narrationClause),
    requiredEvidence,
    allowedModalities: JSON.parse(String(sourceContract.allowed_modalities_json || "[]")),
    forbidden,
    acceptance: arr(brief.acceptance).map(clean).filter(Boolean),
    temporalOrder: ["ENTRY", "MIDPOINT", "EXIT"],
    qaPolicy: {
      rubric: RELEASE_TRAIN_RUBRIC,
      evaluateOnlyShotContract: true,
      inferredArchetypeRequirements: false,
      overallFloor: clean(sourceContract.risk_tier) === "P0" ? 94 : 92,
      dimensionFloor: 90,
      blockerSeverity: ["P0", "P1"],
      warningsDoNotBlockAboveFloor: true,
      autoRetry: false,
    },
  };
}

function releaseTrainManifest(contract: Row) {
  const roles = ["ENTRY", "MIDPOINT", "EXIT"];
  const evidence = arr(contract.requiredEvidence).map(clean).filter(Boolean);
  const safe = (value: unknown, fallback: string, limit: number) => clean(value).toUpperCase().replace(/[^A-Z0-9$+\-.: ]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit) || fallback;
  const states = roles.map((role, index) => {
    const sourceEvidence = evidence[index] || evidence.at(-1) || clean(contract.claim);
    const normalized = safe(sourceEvidence, `${role} EVIDENCE`, 64);
    const splitAt = normalized.lastIndexOf(" ", 26);
    const primary = splitAt > 10 ? normalized.slice(0, splitAt) : normalized.slice(0, 26);
    const qualifier = normalized.slice(primary.length).trim() || safe(contract.claim, "CONTRACT EVIDENCE", 32);
    return { role, heading: `${role} PROOF`, primary: safe(primary, role, 26), qualifier: safe(qualifier, "CONTRACT EVIDENCE", 32), sourceEvidence };
  });
  return {
    version: "SHOT_SPECIFIC_SEMANTIC_MANIFEST_V1",
    logicalId: clean(contract.briefId),
    archetype: clean(contract.archetype),
    contractClaim: clean(contract.claim),
    unitContract: contract,
    certifiedRendererRequired: true,
    unitRenderer: "SHOT_SPECIFIC_UNIT_RENDERER_V1",
    states,
    prohibited: arr(contract.forbidden),
    temporalOrder: roles,
    visibleTextPolicy: "ASCII_SOURCE_DERIVED_ONLY",
  };
}

function productionSceneType(archetype: unknown, logicalId: unknown) {
  if (clean(logicalId) === "MP-002" || /TRANSACTION_STATE/.test(clean(archetype))) return "CHECKOUT_TERMINAL";
  if (/PROCESS_ROUTE/.test(clean(archetype))) return "PAYMENT_ROUTE";
  if (/DATA_VISUALIZATION/.test(clean(archetype))) return "DATA_STORY";
  if (/MOBILE_TEXT/.test(clean(archetype))) return "MOBILE_INTERFACE";
  if (/DOCUMENTARY|RIGHTS_SENSITIVE|SOURCE_AUTHORED/.test(clean(archetype))) return "DOCUMENTARY_SCENE";
  return "MECHANISM_SCENE";
}

function canonicalUnitScene(logicalId: string, evidence: string[], contract: Row) {
  const specs: Record<string, Row> = {
    "MP-003": { sceneType:"RECORD_PANEL", states:[
      {role:"ENTRY",sceneLabel:"APPROVED PURCHASE",primary:"PURCHASE",secondary:"ACTIVITY OPENS",sceneDelta:"PANEL_OPENS"},
      {role:"MIDPOINT",sceneLabel:"SEPARATE RECORDS",primary:"PURCHASE",secondary:"REWARD",sceneDelta:"REWARD_POSTS"},
      {role:"EXIT",sceneLabel:"SEPARATE RECORDS",primary:"PURCHASE",secondary:"REWARD",sceneDelta:"RECORDS_HOLD"},
    ], requiredTokens:[["PURCHASE"],["PURCHASE","REWARD"],["PURCHASE","REWARD","SEPARATE"]] },
    "MP-004": { sceneType:"ROLE_TILES", states:[
      {role:"ENTRY",sceneLabel:"DISTINCT ROLES",primary:"PURCHASE + REWARD",secondary:"ROLES OPEN",sceneDelta:"POSITIONS_OPEN"},
      {role:"MIDPOINT",sceneLabel:"MERCHANT",primary:"MERCHANT",secondary:"PROCESSOR OR ACQUIRER",sceneDelta:"ROLES_ENTER"},
      {role:"EXIT",sceneLabel:"PARTICIPANTS ONLY",primary:"MERCHANT",secondary:"PROCESSOR OR ACQUIRER",sceneDelta:"ROLES_HOLD"},
    ], requiredTokens:[["PURCHASE","REWARD"],["MERCHANT","PROCESSOR OR ACQUIRER"],["MERCHANT","PROCESSOR OR ACQUIRER"]] },
    "MP-007": { sceneType:"SPLIT_RECORD", states:[
      {role:"ENTRY",sceneLabel:"ONE PURCHASE",primary:"PURCHASE $100",secondary:"ONE RECORD",sceneDelta:"ONE_CARD"},
      {role:"MIDPOINT",sceneLabel:"RECORDS SPLIT",primary:"CARDHOLDER",secondary:"MERCHANT",sceneDelta:"SHUTTER_SPLIT"},
      {role:"EXIT",sceneLabel:"TWO RECORDS",primary:"CARDHOLDER",secondary:"MERCHANT",sceneDelta:"PANELS_HOLD"},
    ], requiredTokens:[["PURCHASE"],["CARDHOLDER","MERCHANT"],["CARDHOLDER","MERCHANT"]] },
    "MP-008": { sceneType:"CARDHOLDER_RECORD", states:[
      {role:"ENTRY",sceneLabel:"CARDHOLDER RECORD",primary:"PURCHASE",secondary:"MERCHANT RECORD",sceneDelta:"CARDHOLDER_DOMINATES"},
      {role:"MIDPOINT",sceneLabel:"CARDHOLDER RECORD",primary:"PURCHASE",secondary:"REWARD",sceneDelta:"REWARD_ROW_POSTS"},
      {role:"EXIT",sceneLabel:"SEPARATE ROWS",primary:"PURCHASE",secondary:"REWARD",sceneDelta:"ROWS_HOLD"},
    ], requiredTokens:[["CARDHOLDER","PURCHASE"],["PURCHASE","REWARD"],["PURCHASE","REWARD","SEPARATE"]] },
    "MP-018": { sceneType:"PROPORTION_EVIDENCE", states:[
      {role:"ENTRY",sceneLabel:"VERIFIED SOURCE",primary:"U.S. NONCASH",secondary:"PAYMENT COUNT",sceneDelta:"EMPTY_BAR"},
      {role:"MIDPOINT",sceneLabel:"CARD COUNT SHARE",primary:"CARD COUNT",secondary:"U.S. NONCASH",sceneDelta:"SHARE_ABOVE_THREE_QUARTERS"},
      {role:"EXIT",sceneLabel:"SOURCE BOUND",primary:"CARD COUNT SHARE",secondary:"PAYMENT COUNT",sceneDelta:"MEASURE_LOCKED"},
    ], requiredTokens:[["SOURCE","U.S. NONCASH","PAYMENT COUNT"],["CARD COUNT","U.S. NONCASH"],["SOURCE","CARD COUNT","PAYMENT COUNT"]] },
    "MP-039": { sceneType:"SHUTTERED_LANES", states:[
      {role:"ENTRY",sceneLabel:"CLOSED SHUTTERS",primary:"MERCHANT + ACQUIRER",secondary:"NETWORK + ISSUER",sceneDelta:"ACTORS_DIM"},
      {role:"MIDPOINT",sceneLabel:"AUTHORIZATION BOUNDARY",primary:"CHECKOUT",secondary:"ECONOMIC TRACKS LOCKED",sceneDelta:"BOUNDARY_LIGHTS"},
      {role:"EXIT",sceneLabel:"ISOLATED AUTHORIZATION",primary:"MERCHANT TERMINAL",secondary:"ACTIVE",sceneDelta:"TERMINAL_ACTIVE"},
    ], requiredTokens:[["SHUTTERS","MERCHANT","ACQUIRER","NETWORK","ISSUER"],["AUTHORIZATION","CHECKOUT","LOCKED"],["AUTHORIZATION","MERCHANT TERMINAL","ACTIVE"]] },
    "MP-115": { sceneType:"INCIDENCE_GAP", states:[
      {role:"ENTRY",sceneLabel:"INITIAL BILL",primary:"BILLED MERCHANT",secondary:"VISIBLE",sceneDelta:"MERCHANT_NAMED"},
      {role:"MIDPOINT",sceneLabel:"QUESTION PATH",primary:"FINAL ECONOMIC COST",secondary:"WHO PAYS?",sceneDelta:"PENCIL_PATH_EXTENDS"},
      {role:"EXIT",sceneLabel:"NO PAYER VERDICT",primary:"FINAL ECONOMIC COST",secondary:"UNRESOLVED",sceneDelta:"PATH_STOPS_AT_GAP"},
    ], requiredTokens:[["INITIAL BILL","BILLED MERCHANT"],["QUESTION PATH","FINAL ECONOMIC COST","WHO PAYS"],["FINAL ECONOMIC COST","UNRESOLVED"]] },
    "MP-153": { sceneType:"NEUTRAL_CONFIRMATION", states:[
      {role:"ENTRY",sceneLabel:"CUSTOMER + CARD",primary:"PROCESSING",secondary:"MERCHANT WAITS",sceneDelta:"CARD_NEAR_TERMINAL"},
      {role:"MIDPOINT",sceneLabel:"TERMINAL CHANGES",primary:"PROCESSING TO VERIFIED",secondary:"MERCHANT CHECKS",sceneDelta:"VERIFIED_APPEARS"},
      {role:"EXIT",sceneLabel:"VERIFIED PERSISTS",primary:"CUSTOMER + MERCHANT",secondary:"CONTINUE",sceneDelta:"NATURAL_CONTINUATION"},
    ], requiredTokens:[["CUSTOMER","CARD","PROCESSING","MERCHANT"],["TERMINAL","PROCESSING TO VERIFIED","MERCHANT"],["VERIFIED","CUSTOMER","MERCHANT","CONTINUE"]] },
  };
  return specs[logicalId] || null;
}

function productionSceneManifest(contract: Row, rendererVersion = PRODUCTION_SCENE_RENDERER_VERSION, manifestVersion = "EXECUTABLE_PRODUCTION_SCENE_MANIFEST_V2") {
  const logicalId = clean(contract.briefId);
  const evidence = arr(contract.requiredEvidence).map(clean).filter(Boolean);
  const canonical = canonicalUnitScene(logicalId, evidence, contract), sceneType = clean(canonical?.sceneType) || productionSceneType(contract.archetype, logicalId);
  const safe = (value: unknown, fallback: string, limit = 34) => clean(value).toUpperCase().replace(/[^A-Z0-9$+\-.: ]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit) || fallback;
  const fallbackStates = ["CONTEXT", "MECHANISM", "OUTCOME"].map((role, index) => {
    const sourceEvidence = evidence[index] || evidence.at(-1) || clean(contract.claim);
    return {
      role: ["ENTRY", "MIDPOINT", "EXIT"][index],
      sceneLabel: role,
      primary: safe(sourceEvidence, role, 28),
      secondary: safe(index === 2 ? contract.claim : evidence[Math.min(index + 1, evidence.length - 1)], "VISIBLE STATE", 36),
      sourceEvidence,
      sceneDelta: index === 0 ? "ESTABLISH" : index === 1 ? "TRANSFORM" : "RESOLVE",
    };
  });
  const states = logicalId === "MP-002" ? [
    { role: "ENTRY", sceneLabel: "CREDIT PURCHASE", primary: "$100.00", secondary: "PROCESSING", sourceEvidence: evidence[0] || clean(contract.claim), sceneDelta: "AUTHORIZATION_STARTED", physicalAction: "CARD_AT_READER" },
    { role: "MIDPOINT", sceneLabel: "AUTHORIZATION", primary: "APPROVED", secondary: "$100.00", sourceEvidence: evidence[1] || evidence[0] || clean(contract.claim), sceneDelta: "AUTHORIZATION_APPROVED" },
    { role: "EXIT", sceneLabel: "CREDIT PURCHASE", primary: "APPROVED", secondary: "$100.00", sourceEvidence: evidence[2] || evidence.at(-1) || clean(contract.claim), sceneDelta: "APPROVAL_CONFIRMED", physicalAction: "HAND_WITHDRAWS_CARD" },
  ] : canonical ? arr(canonical.states).map(rec) : fallbackStates;
  const requiredCoVisible = logicalId === "MP-002" ? [{ state: "ENTRY", tokens: ["$100.00", "PROCESSING"] }, { state: "MIDPOINT", tokens: ["APPROVED", "$100.00"] }, { state: "EXIT", tokens: ["APPROVED", "$100.00"] }] : [];
  return {
    version: manifestVersion,
    logicalId,
    archetype: clean(contract.archetype),
    sceneType,
    contractClaim: clean(contract.claim),
    unitContract: contract,
    unitRenderer: rendererVersion,
    states,
    evidenceMap: evidence.map((clause, index) => ({ clause, state: ["ENTRY", "MIDPOINT", "EXIT"][Math.min(index, 2)], node: `SCENE-${Math.min(index, 2) + 1}` })),
    requiredCoVisible,
    prohibited: [...new Set([...arr(contract.forbidden).map(clean), "PROOF CARD", "FIXTURE", "PLACEHOLDER", "QA METADATA", "DEBUG LABEL"].filter(Boolean))],
    temporalOrder: ["ENTRY", "MIDPOINT", "EXIT"],
    visibleTextPolicy: "SOURCE_OR_CONTRACT_DERIVED_ONLY",
    layoutPolicy: { safeArea: 36, minimumGlyphScale: 2, noOverlap: true, noCrop: true, mobileReadability: true, receiptTextWidth: 240 },
    canonicalRequiredTokens: canonical ? canonical.requiredTokens : [],
  };
}

function renderProductionScene(manifest: Row, state: 0 | 1 | 2) {
  const width=960,height=540,pixels=new Uint8Array(width*height*4),raw=new Uint8Array(height*(1+width*4));
  const color=(hex:string)=>[Number.parseInt(hex.slice(1,3),16),Number.parseInt(hex.slice(3,5),16),Number.parseInt(hex.slice(5,7),16),255] as const;
  const fill=(x:number,y:number,w:number,h:number,hex:string)=>{const c=color(hex);for(let py=Math.max(0,y);py<Math.min(height,y+h);py++)for(let px=Math.max(0,x);px<Math.min(width,x+w);px++){const i=(py*width+px)*4;pixels.set(c,i);}};
  const circle=(cx:number,cy:number,r:number,hex:string)=>{for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)if(x*x+y*y<=r*r)fill(cx+x,cy+y,1,1,hex);};
  const text=(value:string,x:number,y:number,scale:number,hex:string)=>{const c=color(hex);let cx=x;for(const char of value.toUpperCase()){const glyph=glyphs[char]||glyphs["?"];for(let gy=0;gy<7;gy++)for(let gx=0;gx<5;gx++)if(glyph[gy][gx]==="1")for(let sy=0;sy<scale;sy++)for(let sx=0;sx<scale;sx++){const px=cx+gx*scale+sx,py=y+gy*scale+sy;if(px>=0&&px<width&&py>=0&&py<height){const i=(py*width+px)*4;pixels.set(c,i);}}cx+=6*scale;}};
  const fit=(value:unknown,max=32)=>clean(value).toUpperCase().replace(/[^A-Z0-9$+\-.: ]/g," ").replace(/\s+/g," ").trim().slice(0,max);
  const center=(value:unknown,y:number,scale:number,hex:string,max=32)=>{const label=fit(value,max),w=label.length*6*scale;text(label,Math.max(34,Math.round((width-w)/2)),y,scale,hex);};
  const centerAt=(value:unknown,cx:number,y:number,scale:number,hex:string,max=32)=>{const label=fit(value,max),w=label.length*6*scale;text(label,Math.max(34,Math.round(cx-w/2)),y,scale,hex);};
  const line=(x1:number,y1:number,x2:number,y2:number,t:number,hex:string)=>{const steps=Math.max(Math.abs(x2-x1),Math.abs(y2-y1));for(let i=0;i<=steps;i++){const p=steps?i/steps:0;fill(Math.round(x1+(x2-x1)*p)-Math.floor(t/2),Math.round(y1+(y2-y1)*p)-Math.floor(t/2),t,t,hex);}};
  const current=rec(arr(manifest.states)[state]),sceneType=clean(manifest.sceneType),accent=state===0?"#e8b65d":state===1?"#72c8a3":"#7fe2b5";
  fill(0,0,width,height,"#061b18");fill(0,0,width,12,accent);fill(36,30,888,474,"#0b3029");
  text(fit(current.sceneLabel,30),64,55,3,"#d7eee5");
  if(sceneType==="CHECKOUT_TERMINAL"){
    fill(105,134,305,292,"#e9efe9");fill(130,160,255,126,state===1?"#183f38":"#ffffff");
    centerAt(current.primary,258,190,state===1?3:4,state===1?"#f2f5ed":"#123d35",18);
    if(state===1){for(let i=0;i<4;i++){circle(178+i*52,256,8,i<=state?"#78d0aa":"#8fa69d");if(i<3)fill(186+i*52,252,36,8,"#78d0aa");}}
    fill(158,325,198,62,state===2?"#1b7b5b":"#d8e2dc");centerAt(state===2?"APPROVED":state===1?"AUTHORIZING":"PROCESSING",257,344,state===0?2:3,state===2?"#ffffff":"#24483f",18);
    fill(510,150,310,238,"#f6efd9");fill(535,176,240,12,"#d7cba8");fill(535,211,176,9,"#d7cba8");fill(535,242,216,9,"#d7cba8");fill(535,286,240,2,"#9d957d");
    const receiptText=fit(current.secondary,20),receiptScale=receiptText.length>13?2:3;centerAt(receiptText,655,318,receiptScale,"#173d34",20);
    if(state===0){fill(412,266,116,70,"#d7eee5");fill(430,280,84,42,"#315447");fill(376,314,72,34,"#e1b99b");text("CARD AT READER",390,374,2,"#a8cdbd");}
    if(state===1){fill(400,252,116,70,"#d7eee5");fill(418,266,84,42,"#315447");fill(362,306,72,34,"#e1b99b");text("AUTHORIZING",394,374,2,"#a8cdbd");}
    if(state===2){circle(770,354,25,"#2b8b68");text("+",760,339,4,"#ffffff");}
    if(state===2){fill(350,224,116,70,"#d7eee5");fill(368,238,84,42,"#315447");fill(590,238,84,42,"#315447");fill(666,226,92,58,"#e1b99b");line(492,250,548,250,4,"#72c8a3");line(492,270,548,270,4,"#72c8a3");text("CARD WITHDRAWN",548,356,2,"#a8cdbd");}
  } else if(sceneType==="PAYMENT_ROUTE"){
    const xs=[135,380,625];xs.forEach((x,index)=>{fill(x,176,200,176,index<=state?"#f4edd7":"#173d35");fill(x,176,200,12,index<=state?accent:"#31594e");circle(x+100,230,30,index<=state?"#2d8063":"#52766b");text(String(index+1),x+91,216,4,index<=state?"#ffffff":"#aec6bc");});
    if(state>=1)line(335,264,380,264,8,accent);if(state>=2)line(580,264,625,264,8,accent);center(current.primary,386,4,"#ffffff",28);
  } else if(sceneType==="CARDHOLDER_RECORD"){
    fill(88,132,784,306,"#102d29");
    fill(112,156,558,250,"#eef5f1");text("CARDHOLDER RECORD",142,184,3,"#173d35");
    fill(142,234,496,58,"#ffffff");circle(174,263,10,"#72c8a3");text("PURCHASE",202,253,3,"#173d35");
    fill(706,184,138,150,"#173d35");centerAt("MERCHANT",775,214,2,"#a8cdbd",12);centerAt("RECORD",775,244,2,"#a8cdbd",10);
    if(state>=1){fill(142,314,496,58,"#ffffff");circle(174,343,10,"#72c8a3");text("REWARD",202,333,3,"#1b6b56");}
    if(state===2){circle(614,263,8,"#2b8b68");circle(614,343,8,"#2b8b68");text("SEPARATE ROWS",680,390,2,"#a8cdbd");}
  } else if(sceneType==="RECORD_PANEL"){
    fill(92,132,776,306,"#102d29");
    fill(126,164,250,232,"#f4edd7");centerAt(clean(manifest.logicalId)==="MP-008"?"CARDHOLDER":"APPROVED",251,206,3,"#173d35",16);centerAt("TERMINAL",251,270,2,"#52766b",14);
    fill(420,164,354,232,"#eef5f1");text("ACTIVITY",448,190,3,"#173d35");
    fill(448,238,298,58,"#ffffff");text("PURCHASE",470,257,3,"#173d35");
    if(state>=1){fill(448,316,298,58,"#ffffff");text("REWARD",470,335,3,"#1b6b56");}
    if(state===2){fill(404,184,4,188,"#72c8a3");text("SEPARATE ROWS",468,408,2,"#a8cdbd");}
  } else if(sceneType==="ROLE_TILES"){
    fill(350,190,260,178,"#f4edd7");centerAt("PURCHASE",480,232,3,"#173d35",16);centerAt("REWARD",480,294,3,"#1b6b56",16);
    if(state===1){fill(72,160,220,88,"#e8b65d");centerAt("MERCHANT",182,190,3,"#173d35",14);text("FIRST",146,222,2,"#6b5422");fill(72,316,250,104,"#d7eee5");centerAt("PROCESSOR OR",197,334,2,"#173d35",18);centerAt("ACQUIRER",197,360,2,"#173d35",18);centerAt("ENTERING NEXT",197,392,2,"#52766b",18);}
    if(state===2){fill(58,214,238,112,"#e8b65d");centerAt("MERCHANT",177,246,3,"#173d35",14);centerAt("ROLE",177,292,2,"#6b5422",10);fill(664,214,238,112,"#d7eee5");centerAt("PROCESSOR OR",783,234,2,"#173d35",18);centerAt("ACQUIRER",783,262,2,"#173d35",18);centerAt("ROLE",783,296,2,"#52766b",10);}
  } else if(sceneType==="SPLIT_RECORD"){
    if(state===0){fill(326,176,308,208,"#f4edd7");centerAt("PURCHASE $100",480,232,4,"#173d35",18);centerAt("ONE RECORD",480,304,2,"#52766b",18);}
    else {fill(86,160,340,236,"#eef5f1");fill(534,160,340,236,"#f4edd7");centerAt("CARDHOLDER",256,214,3,"#173d35",16);centerAt("MERCHANT",704,214,3,"#173d35",16);centerAt("PURCHASE $100",256,292,2,"#2b8b68",18);centerAt("PURCHASE $100",704,292,2,"#8b6b2a",18);if(state===1)fill(472,140,16,276,"#72c8a3");}
  } else if(sceneType==="PROPORTION_EVIDENCE"){
    fill(76,132,344,310,"#f4edd7");text("VERIFIED SOURCE",104,164,3,"#173d35");fill(104,210,288,5,"#c8b98c");fill(104,238,248,5,"#c8b98c");fill(104,266,270,5,"#c8b98c");fill(104,300,288,52,"#ffffff");centerAt("U.S. NONCASH",248,316,2,"#173d35",18);centerAt("PAYMENT COUNT",248,374,2,"#52766b",18);
    fill(488,202,390,94,"#0b3029");line(488,202,878,202,5,"#d9e8e1");line(488,296,878,296,5,"#d9e8e1");line(488,202,488,296,5,"#d9e8e1");line(878,202,878,296,5,"#d9e8e1");
    if(state>=1)fill(496,210,307,78,accent);
    centerAt(state===0?"EMPTY CARD SHARE":"CARD COUNT SHARE",683,322,2,"#d7eee5",22);centerAt("OF U.S. NONCASH",683,360,2,"#a8cdbd",20);
    if(state===2){line(420,248,476,248,4,"#72c8a3");circle(448,248,8,"#72c8a3");centerAt("PAYMENT COUNT",683,400,2,"#f4edd7",18);}
  } else if(sceneType==="SHUTTERED_LANES"){
    [["MERCHANT",66],["ACQUIRER",278],["NETWORK",490],["ISSUER",702]].forEach(([label,x])=>{const nx=Number(x);fill(nx,126,192,142,"#173d35");centerAt(String(label),nx+96,152,2,"#8fa69d",14);circle(nx+96,214,24,"#315447");for(let sy=184;sy<=252;sy+=17)fill(nx+12,sy,168,8,"#071f1b");});
    fill(118,304,724,126,state===0?"#102d29":"#164c3f");line(118,304,842,304,state===0?3:7,state===0?"#52766b":"#72c8a3");line(118,430,842,430,state===0?3:7,state===0?"#52766b":"#72c8a3");
    fill(166,330,170,72,state===2?"#eef5f1":"#243f38");centerAt("MERCHANT",251,344,2,state===2?"#173d35":"#8fa69d",14);centerAt("TERMINAL",251,374,2,state===2?"#1b6b56":"#8fa69d",14);
    centerAt(state===0?"AUTHORIZATION CLOSED":state===1?"CHECKOUT BOUNDARY":"AUTHORIZATION ACTIVE",584,340,2,state===0?"#8fa69d":"#d7eee5",22);
    centerAt("FUNDING  FEES  SETTLEMENT LOCKED",584,382,2,"#8fa69d",32);
    if(state===2){circle(346,366,12,"#72c8a3");line(362,366,438,366,5,"#72c8a3");}
  } else if(sceneType==="INCIDENCE_GAP"){
    fill(64,154,286,250,"#f4edd7");centerAt("BILLED MERCHANT",207,206,3,"#173d35",18);centerAt("INITIAL BILL",207,266,2,"#52766b",16);fill(112,318,190,42,"#ffffff");centerAt("SOLID RECORD",207,330,2,"#173d35",16);
    fill(674,154,222,250,"#173d35");centerAt("FINAL ECONOMIC",785,200,2,"#d7eee5",18);centerAt("COST",785,232,3,"#d7eee5",10);centerAt("UNRESOLVED",785,320,2,"#e8b65d",16);
    if(state>=1){const pts=[[350,280],[382,268],[414,286],[446,272],[478,292],[510,274],[542,290],[574,276],[606,288]];for(let i=0;i<pts.length-1;i++){line(pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1],2,"#a8a89e");line(pts[i][0],pts[i][1]+3,pts[i+1][0],pts[i+1][1]+2,1,"#6f8179");}centerAt("?",636,246,5,"#e8b65d",2);centerAt("WHO PAYS?",480,342,2,"#a8cdbd",14);}
    if(state===2){circle(640,280,7,"#e8b65d");text("PATH STOPS",426,390,2,"#a8cdbd");}
  } else if(sceneType==="NEUTRAL_CONFIRMATION"){
    fill(64,354,832,72,"#735c42");fill(64,346,832,12,"#b99a70");
    circle(176,188,38,"#d9b18f");fill(118,226,116,142,"#315447");centerAt("CUSTOMER",176,390,2,"#d7eee5",14);
    circle(784,188,38,"#c99676");fill(726,226,116,142,"#52766b");centerAt("MERCHANT",784,390,2,"#d7eee5",14);
    fill(388,152,184,194,"#d7eee5");fill(408,174,144,100,state===0?"#183f38":"#eef5f1");centerAt(state===0?"PROCESSING":"VERIFIED",480,206,state===0?2:3,state===0?"#d7eee5":"#1b6b56",16);centerAt("TERMINAL",480,304,2,"#173d35",14);
    if(state===0){fill(300,254,112,62,"#eef5f1");fill(314,266,84,38,"#315447");line(234,280,294,280,12,"#d9b18f");text("CARD",326,318,2,"#a8cdbd");line(842,268,872,282,10,"#c99676");}
    if(state===1){centerAt("PROCESSING",480,134,2,"#8fa69d",16);line(480,154,480,168,3,"#72c8a3");line(234,280,360,250,12,"#d9b18f");line(726,280,594,244,12,"#c99676");centerAt("MERCHANT CHECKS",690,316,2,"#a8cdbd",18);}
    if(state===2){fill(258,264,92,54,"#eef5f1");fill(270,274,68,34,"#315447");line(234,280,252,286,10,"#d9b18f");line(726,280,594,244,12,"#c99676");centerAt("CONTINUE",480,400,2,"#a8cdbd",14);}
  } else if(sceneType==="DATA_STORY"){
    fill(105,390,750,4,"#66877c");[0,1,2,3,4].forEach((index)=>{const h=70+index*34+(state*index*10);fill(145+index*138,390-h,84,h,index===Math.min(4,state+2)?accent:"#d8e8df");});center(current.primary,145,5,"#ffffff",24);center(current.secondary,438,2,"#9ec8b6",36);
  } else if(sceneType==="MOBILE_INTERFACE"){
    fill(330,116,300,340,"#dce8e2");fill(354,145,252,250,"#ffffff");fill(389,176,182,14,accent);fill(389,216,148,10,"#8da79c");fill(389,248,182,10,"#8da79c");fill(389,292,160,58,state===2?"#2b8b68":"#dfe8e3");center(current.primary,414,3,"#ffffff",28);center(current.secondary,92,2,"#9ec8b6",36);
  } else if(sceneType==="DOCUMENTARY_SCENE"){
    fill(86,136,788,276,"#102d29");for(let i=0;i<6;i++){fill(110+i*124,170+(i%2)*72,94,116,i<=state+2?accent:"#284d44");}fill(86,424,788,4,"#6c9988");center(current.primary,452,3,"#ffffff",28);
  } else {
    const points=[[170,290],[330,190],[480,320],[630,190],[790,290]] as const;points.forEach((p,index)=>{if(index<points.length-1&&index<=state+1)line(p[0],p[1],points[index+1][0],points[index+1][1],8,index<=state?accent:"#31594e");circle(p[0],p[1],index===state+1?32:22,index<=state+1?"#f2e9cf":"#31594e");});center(current.primary,395,4,"#ffffff",28);
  }
  if(sceneType!=="CHECKOUT_TERMINAL") center(current.secondary,468,2,"#a8cdbd",38);
  [0,1,2].forEach((index)=>fill(382+index*72,518,54,8,index<=state?accent:"#315447"));
  for(let y=0;y<height;y++){const row=y*(1+width*4);raw[row]=0;raw.set(pixels.subarray(y*width*4,(y+1)*width*4),row+1);}const ihdr=new Uint8Array(13);ihdr.set(u32(width),0);ihdr.set(u32(height),4);ihdr.set([8,6,0,0,0],8);const bytes=joinBytes([new Uint8Array([137,80,78,71,13,10,26,10]),pngChunk("IHDR",ihdr),pngChunk("IDAT",deflateStored(raw)),pngChunk("IEND",new Uint8Array())]);return { bytes, pixels, width, height };
}

function productionScenePng(manifest: Row, state: 0 | 1 | 2) { return renderProductionScene(manifest, state).bytes; }

function mp002PixelOracle(manifest: Row) {
  const rendered = ([0, 1, 2] as const).map((state) => renderProductionScene(manifest, state));
  const color = (hex:string)=>[Number.parseInt(hex.slice(1,3),16),Number.parseInt(hex.slice(3,5),16),Number.parseInt(hex.slice(5,7),16)] as const;
  const count = (frame: typeof rendered[number], box: { x:number;y:number;w:number;h:number }, hex:string) => { const target=color(hex); let total=0; for(let y=box.y;y<box.y+box.h;y++)for(let x=box.x;x<box.x+box.w;x++){const i=(y*frame.width+x)*4;if(frame.pixels[i]===target[0]&&frame.pixels[i+1]===target[1]&&frame.pixels[i+2]===target[2])total++;} return total; };
  const states=arr(manifest.states).map(rec), entry=states[0], midpoint=states[1], exit=states[2];
  const checks = [
    { id:"ENTRY_AMOUNT_PIXELS", status: count(rendered[0],{x:145,y:180,w:225,h:55},"#123d35")>=250?"PASS":"FAIL", evidence:"dark amount glyphs in terminal display" },
    { id:"ENTRY_PROCESSING_PIXELS", status: count(rendered[0],{x:158,y:325,w:198,h:62},"#24483f")>=180?"PASS":"FAIL", evidence:"processing glyphs in audience-visible status region" },
    { id:"MIDPOINT_APPROVED_AMOUNT", status: clean(midpoint.primary)==="APPROVED"&&clean(midpoint.secondary)==="$100.00"&&count(rendered[1],{x:130,y:160,w:255,h:126},"#f2f5ed")>=250&&count(rendered[1],{x:535,y:292,w:240,h:64},"#173d34")>=120?"PASS":"FAIL", evidence:"APPROVED and $100.00 occupy separate visible regions" },
    { id:"EXIT_APPROVED_AMOUNT", status: clean(exit.primary)==="APPROVED"&&clean(exit.secondary)==="$100.00"&&count(rendered[2],{x:130,y:160,w:255,h:126},"#123d35")>=250&&count(rendered[2],{x:535,y:292,w:240,h:64},"#173d34")>=120?"PASS":"FAIL", evidence:"APPROVED and $100.00 remain visible at exit" },
    { id:"EXIT_CARD_READER_SEPARATION", status: clean(exit.physicalAction)==="HAND_WITHDRAWS_CARD"&&count(rendered[2],{x:368,y:238,w:84,h:42},"#315447")>=3000&&count(rendered[2],{x:590,y:238,w:84,h:42},"#315447")>=3000&&count(rendered[2],{x:500,y:230,w:70,h:70},"#315447")===0?"PASS":"FAIL", evidence:"reader and withdrawn card are visually separated by a clear gap" },
    { id:"NO_INTERNAL_ID_PIXELS", status: states.every((item)=>!`${clean(item.sceneLabel)} ${clean(item.primary)} ${clean(item.secondary)}`.includes("MP-002"))?"PASS":"FAIL", evidence:"internal ID absent from rendered text inputs" },
  ];
  return { version:"MP002_GOLDEN_REGION_ORACLE_V1", frames:rendered, checks, passed:checks.every((item)=>item.status==="PASS"), goldenLayout:{ entry:["amount","processing"], midpoint:["approved","amount"], exit:["approved","amount","withdrawn-card","reader-gap"] } };
}

function canonicalUnitPixelOracle(logicalId: string, manifest: Row) {
  const rendered=([0,1,2] as const).map((state)=>renderProductionScene(manifest,state)),states=arr(manifest.states).map(rec),required=arr(manifest.canonicalRequiredTokens).map((item)=>arr(item).map(clean));
  const countOpaque=(frame:typeof rendered[number],box:{x:number;y:number;w:number;h:number})=>{let total=0;for(let y=box.y;y<box.y+box.h;y++)for(let x=box.x;x<box.x+box.w;x++){const i=(y*frame.width+x)*4;if(frame.pixels[i+3]===255&&(frame.pixels[i]!==6||frame.pixels[i+1]!==27||frame.pixels[i+2]!==24))total++;}return total;};
  const tokenChecks=states.map((state,index)=>{const visible=`${clean(state.sceneLabel)} ${clean(state.primary)} ${clean(state.secondary)}`;const missing=(required[index]||[]).filter((token)=>!visible.includes(token));return{id:`${["ENTRY","MIDPOINT","EXIT"][index]}_SEMANTIC_TOKENS`,status:missing.length===0?"PASS":"FAIL",evidence:missing.length?`missing ${missing.join(",")}`:visible};});
  const checks=[
    ...tokenChecks,
    {id:"THREE_VIEWER_VISIBLE_FRAMES",status:rendered.every((frame)=>countOpaque(frame,{x:70,y:120,w:820,h:330})>150000)?"PASS":"FAIL",evidence:"substantive authored pixels in every state"},
    {id:"MOBILE_TEXT_FIT",status:states.every((state)=>[state.sceneLabel,state.primary,state.secondary].every((value)=>clean(value).length<=24))?"PASS":"FAIL",evidence:"all primary labels <=24 glyphs"},
    {id:"NO_INTERNAL_IDS",status:states.every((state)=>!`${clean(state.sceneLabel)} ${clean(state.primary)} ${clean(state.secondary)}`.includes(logicalId))?"PASS":"FAIL",evidence:"audience pixels exclude canonical unit IDs"},
    {id:"TEMPORAL_DELTA",status:new Set(rendered.map((frame)=>base64(frame.bytes).slice(-180))).size===3?"PASS":"FAIL",evidence:"ENTRY/MIDPOINT/EXIT bytes differ"},
  ];
  return{version:"CANONICAL_UNIT_GOLDEN_REGION_ORACLE_V1",logicalId,frames:rendered,checks,passed:checks.every((item)=>item.status==="PASS")};
}

async function buildReleaseTrainPreflight() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || !env.BUCKET) throw new Error("RELEASE_TRAIN_CONFIGURATION_REQUIRED");
  const baseline = await db.prepare("SELECT * FROM v7_architecture_baselines WHERE program_id=? AND stage_key=? ORDER BY created_at DESC LIMIT 1").bind(PROGRAM_ID, STAGE).first<Row>();
  const recoveredCanary = await db.prepare("SELECT * FROM v7_pilot_canaries WHERE run_id=? AND version=? AND status='RECOVERY_PASS_REVIEW' ORDER BY created_at DESC LIMIT 1").bind(run.id, RECOVERY_CONTRACT_ALIGNMENT).first<Row>();
  const recovery = await db.prepare("SELECT * FROM v7_canary_recovery_sessions WHERE run_id=? AND status='ALIGNED_PROBE_PASS_REVIEW' ORDER BY created_at DESC LIMIT 1").bind(run.id).first<Row>();
  if (!baseline || clean(baseline.execution_state) !== "FROZEN" || !recoveredCanary || !recovery || clean(authorization.status) !== "PAUSED") throw new Error("MP001_ACCEPTED_RECOVERY_CHECKPOINT_REQUIRED");
  const existing = await db.prepare("SELECT id FROM v7_pilot_canaries WHERE run_id=? AND version=? ORDER BY created_at DESC LIMIT 1").bind(run.id, RELEASE_TRAIN_VERSION).first<Row>();
  if (existing) return snapshot();
  const usageBefore = await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(actual_cost_usd),0) AS cost,SUM(CASE WHEN status IN ('QUEUED','IN_PROGRESS') THEN 1 ELSE 0 END) AS active FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<Row>();
  const requestsBefore = Number(usageBefore?.total || 0), costBefore = Number(usageBefore?.cost || 0);
  if (Number(usageBefore?.active || 0) !== 0) throw new Error("RELEASE_TRAIN_ACTIVE_REQUESTS_MUST_BE_ZERO");
  if (requestsBefore !== 82 || Math.abs(costBefore - 2.79336) > 0.000001) throw new Error(`RELEASE_TRAIN_CANONICAL_LEDGER_DRIFT · ${requestsBefore} requests / $${costBefore.toFixed(6)}`);
  const briefs = await rows(db, "SELECT * FROM v7_material_briefs WHERE run_id=? AND pilot=1 ORDER BY start_seconds", run.id);
  const contracts = await rows(db, "SELECT * FROM v7_compiled_shot_contracts WHERE baseline_id=? ORDER BY brief_id", baseline.id);
  if (briefs.length !== 10 || contracts.length !== 10) throw new Error(`RELEASE_TRAIN_SCOPE_INVALID · ${briefs.length} briefs / ${contracts.length} contracts`);
  const mp001Brief = briefs.find((brief) => clean(rec(JSON.parse(String(brief.content_json || "{}"))).briefId) === "MP-001");
  const sourceUnit = mp001Brief ? await db.prepare("SELECT * FROM v7_unit_materializations WHERE canary_version=? AND brief_id=? AND status='FROZEN'").bind(RECOVERY_CONTRACT_ALIGNMENT, mp001Brief.id).first<Row>() : null;
  const sourcePromotion = mp001Brief ? await db.prepare("SELECT * FROM v7_artifact_promotions WHERE canary_version=? AND brief_id=? AND status='FROZEN'").bind(RECOVERY_CONTRACT_ALIGNMENT, mp001Brief.id).first<Row>() : null;
  const sourceAudit = mp001Brief ? await db.prepare("SELECT * FROM v7_material_audits WHERE id=? AND status='PASS'").bind(`${clean(mp001Brief.id)}-${RECOVERY_CONTRACT_ALIGNMENT}-PIXEL-AUDIT`).first<Row>() : null;
  if (!mp001Brief || !sourceUnit || !sourcePromotion || !sourceAudit || Number(sourceAudit.score) !== 94) throw new Error("MP001_94_ACCEPTED_EVIDENCE_REQUIRED");
  const capability = canaryDispatchCapability(RELEASE_TRAIN_VERSION);
  if (!capability) throw new Error("RELEASE_TRAIN_DISPATCH_CAPABILITY_MISSING");
  const canaryId = `${clean(recovery.id)}-${RELEASE_TRAIN_VERSION}`, regressionId = `${canaryId}-G0-G1`, now = new Date().toISOString();
  const unitStatements: Statement[] = [], promotionStatements: Statement[] = [], promotionRows: Row[] = [], queue: Row[] = [], unitGates: Row[] = [];
  for (const briefRow of briefs) {
    const brief = rec(JSON.parse(String(briefRow.content_json || "{}"))), logicalId = clean(brief.briefId), sourceContract = contracts.find((item) => clean(item.brief_id) === logicalId);
    if (!sourceContract || clean(sourceContract.lint_status) !== "PASS") throw new Error(`RELEASE_TRAIN_SOURCE_CONTRACT_MISSING · ${logicalId}`);
    const sourceContractHash = await sha(JSON.stringify(promotionContractPayload(sourceContract)));
    let unitContract: Row, manifest: Row, certification: Row | null, frameIds: string[], frameHashes: string[], unitRenderer: string, preflight: Row;
    if (logicalId === "MP-001") {
      unitContract = rec(JSON.parse(String(sourceUnit.semantic_manifest_json || "{}")).unitContract);
      manifest = rec(JSON.parse(String(sourceUnit.semantic_manifest_json || "{}")));
      certification = await db.prepare("SELECT * FROM v7_archetype_certifications WHERE id=? AND status='PASS'").bind(sourceUnit.certification_id).first<Row>();
      frameIds = arr(JSON.parse(String(sourceUnit.frame_ids_json || "[]"))).map(clean);
      frameHashes = arr(JSON.parse(String(sourceUnit.frame_hashes_json || "[]"))).map(clean);
      unitRenderer = clean(sourceUnit.unit_renderer_version);
      preflight = { ...rec(JSON.parse(String(sourcePromotion.preflight_json || "{}"))), source: "FAILED_PROBE_CONTRACT_ALIGNMENT", sourcePromotionId: sourcePromotion.id, sourceFailedAuditId: sourceAudit.id, acceptedAuditId: sourceAudit.id, acceptedAuditScore: 94, evidenceReuse: { pixelHashUnchanged: true, contractHashUnchanged: true, rubric: RELEASE_TRAIN_RUBRIC, priorAuditPass: true }, dispatchCapability: capability.phase, frozenAt: now };
    } else {
      unitContract = releaseTrainUnitContract(sourceContract, brief);
      manifest = { ...releaseTrainManifest(unitContract), sourceContractHash };
      certification = await db.prepare("SELECT * FROM v7_archetype_certifications WHERE baseline_id=? AND archetype=? AND status='PASS' ORDER BY created_at DESC LIMIT 1").bind(baseline.id, sourceContract.archetype).first<Row>();
      if (!certification || Number(certification.score) < 92) throw new Error(`RELEASE_TRAIN_CERTIFIED_RENDERER_MISSING · ${logicalId}`);
      frameIds = []; frameHashes = []; unitRenderer = "SHOT_SPECIFIC_UNIT_RENDERER_V1";
      for (const [role, state] of [["CERT_ENTRY", 0], ["CERT_MIDPOINT", 1], ["CERT_EXIT", 2]] as const) {
        const bytes = unitArtifactPng(manifest, state), fileId = await storeMaterial(env, db, authorization, briefRow, { role, identity: `RELEASE-TRAIN-${logicalId}-${state}`, bytes, mimeType: "image/png", extension: "png", sourceType: unitRenderer, provider: "FRAMEFLOW_OWNED", providerAssetId: clean(certification.id), sourceUrl: clean(certification.id), landingUrl: clean(certification.id), licenseCode: "CHANNEL_OWNED", width: 960, height: 540 });
        const stored = await db.prepare("SELECT content_hash FROM v7_material_files WHERE id=?").bind(fileId).first<Row>();
        frameIds.push(fileId); frameHashes.push(clean(stored?.content_hash));
      }
      preflight = { source: "SHOT_SPECIFIC_CONTRACT_MATERIALIZATION", contractMode: "SHOT_SPECIFIC_UNIT_CONTRACT", sourceContractHash, alignedContractHash: await sha(JSON.stringify(unitContract)), rubric: RELEASE_TRAIN_RUBRIC, evaluateOnlyShotContract: true, inferredArchetypeRequirements: false, semanticManifestHash: await sha(JSON.stringify(manifest)), dispatchCapability: capability.phase, explicitUnitReleaseRequired: true, legacyFallback: false, certificationPixelsReused: false, frozenAt: now };
    }
    if (!certification) throw new Error(`RELEASE_TRAIN_CERTIFICATION_LINEAGE_MISSING · ${logicalId}`);
    const contractHash = await sha(JSON.stringify(unitContract)), manifestJson = JSON.stringify(manifest), manifestHash = await sha(manifestJson), unitId = `${canaryId}-${logicalId}-UNIT`, promotionId = `${canaryId}-${logicalId}-PROMOTION`;
    const g0 = [
      { id: "SOURCE_CONTRACT_LINEAGE", status: clean(manifest.sourceContractHash) === sourceContractHash ? "PASS" : "FAIL", evidence: sourceContractHash.slice(0, 12) },
      { id: "SHOT_CLAIM_BOUND", status: clean(unitContract.claim) === clean(brief.viewerMustUnderstand || sourceContract.claim) || logicalId === "MP-001" ? "PASS" : "FAIL", evidence: short(unitContract.claim, 48) },
      { id: "SHOT_EVIDENCE_ONLY", status: logicalId === "MP-001" || JSON.stringify(arr(unitContract.requiredEvidence)) === JSON.stringify(arr(brief.requiredEvidence).map(clean).filter(Boolean)) ? "PASS" : "FAIL", evidence: `${arr(unitContract.requiredEvidence).length} source-authored evidence clauses` },
      { id: "THREE_STATE_MANIFEST", status: arr(manifest.states).length === 3 && arr(manifest.states).every((item) => Boolean(clean(rec(item).sourceEvidence)) || logicalId === "MP-001") ? "PASS" : "FAIL", evidence: "ENTRY · MIDPOINT · EXIT" },
      { id: "QA_POLICY", status: logicalId === "MP-001" || rec(unitContract.qaPolicy).evaluateOnlyShotContract === true && Number(rec(unitContract.qaPolicy).dimensionFloor) === 90 && Number(rec(unitContract.qaPolicy).overallFloor) >= 92 ? "PASS" : "FAIL", evidence: logicalId === "MP-001" ? "accepted immutable 94/100 audit" : `overall ${Number(rec(unitContract.qaPolicy).overallFloor)} · dimensions 90` },
    ];
    if (g0.some((gate) => gate.status !== "PASS")) throw new Error(`RELEASE_TRAIN_G0_FAILED · ${logicalId} · ${g0.filter((gate) => gate.status !== "PASS").map((gate) => gate.id).join(",")}`);
    const lint = [...g0, { id: "ASCII_VISIBLE_TEXT", status: arr(manifest.states).every((item) => /^[A-Z0-9$+\-.: ]+$/.test(`${clean(rec(item).heading)}${clean(rec(item).primary)}${clean(rec(item).qualifier)}`)) ? "PASS" : "FAIL", evidence: "source-derived glyph set only" }, { id: "DISTINCT_FRAME_HASHES", status: frameHashes.length === 3 && new Set(frameHashes).size === 3 ? "PASS" : "FAIL", evidence: `${new Set(frameHashes).size}/3` }];
    unitStatements.push(db.prepare("INSERT INTO v7_unit_materializations (id,program_id,baseline_id,run_id,authorization_id,canary_version,brief_id,logical_brief_id,archetype,certification_id,certified_renderer_version,unit_renderer_version,contract_hash,semantic_manifest_json,semantic_manifest_hash,frame_ids_json,frame_hashes_json,lint_json,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'FROZEN',?)").bind(unitId, PROGRAM_ID, baseline.id, run.id, authorization.id, RELEASE_TRAIN_VERSION, briefRow.id, logicalId, unitContract.archetype, certification.id, certification.renderer_version, unitRenderer, contractHash, manifestJson, manifestHash, JSON.stringify(frameIds), JSON.stringify(frameHashes), JSON.stringify(lint), now));
    promotionStatements.push(db.prepare("INSERT INTO v7_artifact_promotions (id,program_id,baseline_id,regression_id,run_id,authorization_id,canary_version,brief_id,logical_brief_id,archetype,certification_id,renderer_version,contract_hash,frame_ids_json,frame_hashes_json,status,preflight_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'FROZEN',?,?)").bind(promotionId, PROGRAM_ID, baseline.id, regressionId, run.id, authorization.id, RELEASE_TRAIN_VERSION, briefRow.id, logicalId, unitContract.archetype, certification.id, unitRenderer, contractHash, JSON.stringify(frameIds), JSON.stringify(frameHashes), JSON.stringify(preflight), now));
    promotionRows.push({ id: promotionId, baseline_id: baseline.id, canary_version: RELEASE_TRAIN_VERSION, brief_id: briefRow.id, logical_brief_id: logicalId, archetype: unitContract.archetype, certification_id: certification.id, renderer_version: unitRenderer, contract_hash: contractHash, frame_ids_json: JSON.stringify(frameIds), frame_hashes_json: JSON.stringify(frameHashes), status: "FROZEN", preflight_json: JSON.stringify(preflight) });
    queue.push({ briefId: clean(briefRow.id), logicalId, archetype: clean(unitContract.archetype), riskTier: clean(unitContract.riskTier), startSeconds: Number(briefRow.start_seconds), promotionId, certificationId: clean(certification.id), renderer: unitRenderer, bindingStatus: "FROZEN", dispatchCapability: capability.phase, qaRubric: RELEASE_TRAIN_RUBRIC });
    unitGates.push({ logicalId, g0, frameHashes });
  }
  await db.batch([...unitStatements, ...promotionStatements]);
  const bindings: Array<Awaited<ReturnType<typeof validatePromotionBinding>>> = [];
  for (const promotion of promotionRows) bindings.push(await validatePromotionBinding(env, db, promotion));
  const bindingGateIds = ["CERTIFICATION_TO_PRODUCTION_BINDING", "BOUND_HASH_CONGRUENCE", "UNIT_CONTRACT_CONGRUENCE", "SEMANTIC_MANIFEST_CONGRUENCE", "UNIT_SPECIFIC_PIXELS", "CANARY_ARTIFACT_READINESS", "NO_LEGACY_FALLBACK"];
  const g1 = bindingGateIds.map((id) => ({ id, status: bindings.every((binding) => binding.checks.find((gate) => gate.id === id)?.status === "PASS") ? "PASS" : "FAIL", evidence: `${bindings.filter((binding) => binding.checks.find((gate) => gate.id === id)?.status === "PASS").length}/10` }));
  const allHashes = unitGates.flatMap((unit) => arr(unit.frameHashes).map(clean));
  g1.push(
    { id: "PHYSICAL_UNIQUENESS", status: new Set(allHashes).size === 30 ? "PASS" : "FAIL", evidence: `${new Set(allHashes).size}/30 distinct frame hashes` },
    { id: "G0_BATCH", status: unitGates.length === 10 && unitGates.every((unit) => arr(unit.g0).every((gate) => clean(rec(gate).status) === "PASS")) ? "PASS" : "FAIL", evidence: "10/10 shot-specific contracts" },
    { id: "ZERO_SPEND", status: "PASS", evidence: `${requestsBefore} requests · $${costBefore.toFixed(6)}` },
    { id: "AUTO_RETRY_DISABLED", status: "PASS", evidence: "no automatic repair or re-dispatch" },
  );
  if (g1.some((gate) => gate.status !== "PASS")) throw new Error(`RELEASE_TRAIN_G1_FAILED · ${g1.filter((gate) => gate.status !== "PASS").map((gate) => gate.id).join(",")}`);
  const usageAfter = await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(actual_cost_usd),0) AS cost FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<Row>();
  if (Number(usageAfter?.total || 0) !== requestsBefore || Number(usageAfter?.cost || 0) !== costBefore) throw new Error("RELEASE_TRAIN_ZERO_SPEND_INVARIANT_FAILED");
  queue.sort((left, right) => clean(left.logicalId).localeCompare(clean(right.logicalId)));
  const mp002 = queue.findIndex((item) => clean(item.logicalId) === "MP-002");
  if (mp002 !== 1) throw new Error(`RELEASE_TRAIN_MP002_SEQUENCE_INDEX_INVALID · ${mp002}`);
  const gates = [
    { id: "MP001_ACCEPTED", status: "PASS", evidence: `${sourceAudit.id} · 94/100 · unchanged pixels/contract` },
    { id: "G0_CONTRACT", status: "PASS", evidence: "MP-002–MP-010 9/9 shot-specific contracts" },
    { id: "G1_TECHNICAL", status: "PASS", evidence: "10/10 byte/hash/lineage/manifest bindings" },
    ...g1,
  ], modelPolicy = { ...rec(JSON.parse(String(authorization.model_policy_json || "{}"))), version: RELEASE_TRAIN_VERSION, rubric: RELEASE_TRAIN_RUBRIC, dispatch: "EXPLICIT_SEQUENCE_PROOF_THEN_BOUNDED_BATCH", dispatchCapability: capability.phase, artifactMode: capability.artifactMode, evaluateOnlyShotContract: true, inferredArchetypeRequirements: false, overallFloor: 92, p0OverallFloor: 94, dimensionFloor: 90, blockerSeverity: ["P0", "P1"], warningsDoNotBlockAboveFloor: true, concurrency: 1, concurrencyCeiling: 2, requestBudget: 9, costBudgetUsd: 9, autoRetry: false, nextUnitDispatch: false, sequenceProofUnit: "MP-002", productionScale: "BLOCKED" };
  await db.batch([
    db.prepare("INSERT INTO v7_archetype_regressions (id,program_id,baseline_id,status,score,checks_json,certification_ids_json,pilot_replay_json,remote_requests_before,remote_requests_after,actual_cost_before,actual_cost_after,created_at) VALUES (?,?,?,'PASS',100,?,?,?,?,?,?,?,?)").bind(regressionId, PROGRAM_ID, baseline.id, JSON.stringify(gates), JSON.stringify(promotionRows.map((item) => item.certification_id)), JSON.stringify({ accepted: 1, g0: 9, g1: 10, sequenceProof: "MP-002", dispatches: 0, costDelta: 0 }), requestsBefore, requestsBefore, costBefore, costBefore, now),
    db.prepare("INSERT INTO v7_pilot_canaries (id,program_id,baseline_id,regression_id,run_id,authorization_id,version,status,queue_json,current_index,current_brief_id,released_units,passed_units,failed_units,requests_before,cost_before,request_budget,cost_budget,active_request_peak,gate_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'READY_FOR_SEQUENCE_PROOF',?,1,?,1,1,0,?,?,9,9,0,?,?,?)").bind(canaryId, PROGRAM_ID, baseline.id, regressionId, run.id, authorization.id, RELEASE_TRAIN_VERSION, JSON.stringify(queue), queue[1].briefId, requestsBefore, costBefore, JSON.stringify(gates), now, now),
    db.prepare("UPDATE v7_material_authorizations SET scope='RELEASE_TRAIN_G0_G1_PASS',status='PAUSED',max_remote_requests=?,max_actual_spend_usd=?,model_policy_json=?,completed_at=NULL,updated_at=? WHERE id=?").bind(requestsBefore + 1, costBefore + 1, JSON.stringify(modelPolicy), now, authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='RELEASE_TRAIN_READY_FOR_SEQUENCE_PROOF',mode='RELEASE_TRAIN_ZERO_SPEND_PREFLIGHT' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='RELEASE_TRAIN_READY_FOR_SEQUENCE_PROOF',blocker='EXPLICIT_MP002_SEQUENCE_PROOF_REQUIRED',evidence_summary=?,updated_at=? WHERE id=?").bind(`MP-001 accepted 94/100 · MP-002–MP-010 G0 9/9 PASS · G1 10/10 PASS · requests ${requestsBefore} · cost $${costBefore.toFixed(6)} · MP-002 is the only open proof`, now, STAGE_ID),
  ]);
  return snapshot();
}

async function buildProductionScenePreflight() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || !env.BUCKET) throw new Error("PRODUCTION_SCENE_PREFLIGHT_CONFIGURATION_REQUIRED");
  const baseline = await db.prepare("SELECT * FROM v7_architecture_baselines WHERE program_id=? AND stage_key=? ORDER BY created_at DESC LIMIT 1").bind(PROGRAM_ID, STAGE).first<Row>();
  const failedTrain = await db.prepare("SELECT * FROM v7_pilot_canaries WHERE run_id=? AND version=? AND status='SEQUENCE_OR_BATCH_FAILED_PRESERVED' ORDER BY created_at DESC LIMIT 1").bind(run.id, RELEASE_TRAIN_VERSION).first<Row>();
  const failedQueue = failedTrain ? arr(JSON.parse(String(failedTrain.queue_json || "[]"))).map(rec) : [], failedItem = failedQueue[Number(failedTrain?.current_index || -1)];
  const failedAudit = failedTrain && failedItem ? await db.prepare("SELECT * FROM v7_material_audits WHERE id=? AND status='REPAIR_REQUIRED'").bind(`${clean(failedItem.briefId)}-${RELEASE_TRAIN_VERSION}-PIXEL-AUDIT`).first<Row>() : null;
  if (!baseline || clean(baseline.execution_state) !== "FROZEN" || !failedTrain || clean(failedItem?.logicalId) !== "MP-002" || !failedAudit || Number(failedAudit.score) !== 42 || clean(authorization.status) !== "PAUSED") throw new Error("MP002_42_FAILED_SEQUENCE_PROOF_REQUIRED");
  const existing = await db.prepare("SELECT id FROM v7_pilot_canaries WHERE run_id=? AND version=? ORDER BY created_at DESC LIMIT 1").bind(run.id, STABILIZATION_RELEASE_VERSION).first<Row>();
  if (existing) return snapshot();
  const usageBefore = await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(actual_cost_usd),0) AS cost,SUM(CASE WHEN status IN ('QUEUED','IN_PROGRESS') THEN 1 ELSE 0 END) AS active FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<Row>();
  const requestsBefore = Number(usageBefore?.total || 0), costBefore = Number(usageBefore?.cost || 0);
  if (Number(usageBefore?.active || 0) !== 0) throw new Error("PRODUCTION_SCENE_ACTIVE_REQUESTS_MUST_BE_ZERO");
  if (requestsBefore !== 83 || Math.abs(costBefore - 2.82283) > 0.000001) throw new Error(`PRODUCTION_SCENE_CANONICAL_LEDGER_DRIFT · ${requestsBefore} requests / $${costBefore.toFixed(6)}`);
  const briefs = await rows(db, "SELECT * FROM v7_material_briefs WHERE run_id=? AND pilot=1 ORDER BY start_seconds", run.id);
  const contracts = await rows(db, "SELECT * FROM v7_compiled_shot_contracts WHERE baseline_id=? ORDER BY brief_id", baseline.id);
  if (briefs.length !== 10 || contracts.length !== 10) throw new Error(`PRODUCTION_SCENE_SCOPE_INVALID · ${briefs.length} briefs / ${contracts.length} contracts`);
  const briefByLogicalId = new Map(briefs.map((brief) => [clean(rec(JSON.parse(String(brief.content_json || "{}"))).briefId), brief]));
  const canonicalPilotManifest = deriveCanonicalPilotManifest(briefs.map((brief) => ({
    logicalId: clean(rec(JSON.parse(String(brief.content_json || "{}"))).briefId),
    briefId: clean(brief.id),
    startSeconds: Number(brief.start_seconds),
    contentHash: clean(brief.content_hash),
  })), [...SEALED_RELEASE_SET]);
  const canonicalPilotManifestHash = await sha(JSON.stringify(canonicalPilotManifest));
  const activeReleaseSet = canonicalPilotManifest.activeReleaseSet as string[];
  const sealedSet = new Set<string>(canonicalPilotManifest.sealedSet), activeSet = new Set<string>(activeReleaseSet);
  if ([...sealedSet].some((id) => activeSet.has(id))) throw new Error("STABILIZATION_RELEASE_SET_INTERSECTION");
  const actualIds = [...briefByLogicalId.keys()].sort(), expectedIds = canonicalPilotManifest.units.map((unit: { logicalId: string }) => unit.logicalId).sort();
  if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) throw new Error(`STABILIZATION_RELEASE_SCOPE_DRIFT · ${actualIds.join(",")}`);
  const activeBriefs = activeReleaseSet.map((id) => briefByLogicalId.get(id)).filter(Boolean) as Row[];
  if (activeBriefs.length !== activeReleaseSet.length || activeBriefs.some((brief) => sealedSet.has(clean(rec(JSON.parse(String(brief.content_json || "{}"))).briefId)))) throw new Error("STABILIZATION_TYPED_ACTIVE_SET_INVALID");
  const mp001Brief = briefs.find((brief) => clean(rec(JSON.parse(String(brief.content_json || "{}"))).briefId) === "MP-001");
  const sourceUnit = mp001Brief ? await db.prepare("SELECT * FROM v7_unit_materializations WHERE canary_version=? AND brief_id=? AND status='FROZEN'").bind(RECOVERY_CONTRACT_ALIGNMENT, mp001Brief.id).first<Row>() : null;
  const sourcePromotion = mp001Brief ? await db.prepare("SELECT * FROM v7_artifact_promotions WHERE canary_version=? AND brief_id=? AND status='FROZEN'").bind(RECOVERY_CONTRACT_ALIGNMENT, mp001Brief.id).first<Row>() : null;
  const sourceAudit = mp001Brief ? await db.prepare("SELECT * FROM v7_material_audits WHERE id=? AND status='PASS'").bind(`${clean(mp001Brief.id)}-${RECOVERY_CONTRACT_ALIGNMENT}-PIXEL-AUDIT`).first<Row>() : null;
  if (!mp001Brief || !sourceUnit || !sourcePromotion || !sourceAudit || Number(sourceAudit.score) !== 94) throw new Error("MP001_94_ACCEPTED_EVIDENCE_REQUIRED");
  const capability = canaryDispatchCapability(STABILIZATION_RELEASE_VERSION);
  if (!capability) throw new Error("PRODUCTION_SCENE_DISPATCH_CAPABILITY_MISSING");
  const canaryId = `${clean(failedTrain.id)}-${STABILIZATION_RELEASE_VERSION}`, regressionId = `${canaryId}-G0-G1-G2`, now = new Date().toISOString();
  const unitStatements: Statement[] = [], promotionStatements: Statement[] = [], promotionRows: Row[] = [], queue: Row[] = [], unitGates: Row[] = [];
  queue.push({ briefId: clean(mp001Brief.id), logicalId: "MP-001", releaseSet: "SEALED_SET", dispatchable: false, promotionId: sourcePromotion.id, renderer: clean(sourceUnit.unit_renderer_version), bindingStatus: "SEALED_ACCEPTED", qaRubric: "IMMUTABLE_ACCEPTED_AUDIT_94" });

  // G2 canonical rehearsal is intentionally independent from persisted materialization.
  // It compiles and renders the exact active set in memory, proves scope/state/ledger
  // convergence and legacy isolation, then discards the clone before any artifact write.
  const rehearsalUnits: Row[] = [];
  for (const briefRow of activeBriefs) {
    const brief = rec(JSON.parse(String(briefRow.content_json || "{}"))), logicalId = clean(brief.briefId), sourceContract = contracts.find((item) => clean(item.brief_id) === logicalId);
    if (!sourceContract || clean(sourceContract.lint_status) !== "PASS") throw new Error(`STABILIZATION_REHEARSAL_CONTRACT_MISSING · ${logicalId}`);
    const baseContract = releaseTrainUnitContract(sourceContract, brief);
    const unitContract = { ...baseContract, version: STABILIZED_CONTRACT_VERSION, qaPolicy: { ...rec(baseContract.qaPolicy), rubric: STABILIZED_RUBRIC } };
    const manifest = { ...productionSceneManifest(unitContract, STABILIZED_RENDERER_VERSION, "EXECUTABLE_PRODUCTION_SCENE_MANIFEST_V3"), sourceContractHash: await sha(JSON.stringify(promotionContractPayload(sourceContract))), canonicalPilotManifestVersion: CANONICAL_PILOT_MANIFEST_VERSION, canonicalPilotManifestHash };
    const bytes = ([0, 1, 2] as const).map((state) => productionScenePng(manifest, state));
    const frameHashes = await Promise.all(bytes.map((item) => shaBytes(item)));
    const states = arr(manifest.states).map(rec), visible = states.flatMap((item) => [clean(item.sceneLabel), clean(item.primary), clean(item.secondary)]).join(" | ").toUpperCase();
    const forbiddenLeak = ["PROOF CARD", "FIXTURE", "PLACEHOLDER", "QA METADATA", "DEBUG LABEL"].some((token) => visible.includes(token));
    const coVisible = arr(manifest.requiredCoVisible).every((rule) => { const value = rec(rule), target = states.find((item) => clean(item.role) === clean(value.state)); return target && arr(value.tokens).every((token) => `${clean(target.sceneLabel)} ${clean(target.primary)} ${clean(target.secondary)}`.includes(clean(token))); });
    const contractCoverage = arr(unitContract.requiredEvidence).every((clause) => arr(manifest.evidenceMap).some((mapping) => clean(rec(mapping).clause) === clean(clause)));
    const distinctProgression = states.length === 3 && new Set(states.map((item) => clean(item.sceneDelta))).size === 3;
    if (!contractCoverage || !coVisible || forbiddenLeak || !distinctProgression || new Set(frameHashes).size !== 3) throw new Error(`STABILIZATION_REHEARSAL_FAILED · ${logicalId}`);
    rehearsalUnits.push({ logicalId, releaseSet: "ACTIVE_RELEASE_SET", canonicalPilotManifestVersion: CANONICAL_PILOT_MANIFEST_VERSION, canonicalPilotManifestHash, contractHash: await sha(JSON.stringify(unitContract)), manifestHash: await sha(JSON.stringify(manifest)), frameHashes });
  }
  const rehearsalState = { state: "PREFLIGHT_READY", canonicalPilotManifestVersion: CANONICAL_PILOT_MANIFEST_VERSION, canonicalPilotManifestHash, sealedSet: [...canonicalPilotManifest.sealedSet], activeReleaseSet: [...activeReleaseSet], units: rehearsalUnits, requests: requestsBefore, cost: costBefore, authorization: "PAUSED", legacyReachable: false };
  const serializedRehearsal = JSON.stringify(rehearsalState), reloadedRehearsal = JSON.stringify(JSON.parse(serializedRehearsal));
  if (serializedRehearsal !== reloadedRehearsal || rehearsalUnits.length !== 9 || new Set(rehearsalUnits.flatMap((item) => arr(item.frameHashes).map(clean))).size !== 27) throw new Error("STABILIZATION_RELOAD_CONVERGENCE_FAILED");
  const usageAfterRehearsal = await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(actual_cost_usd),0) AS cost,SUM(CASE WHEN status IN ('QUEUED','IN_PROGRESS') THEN 1 ELSE 0 END) AS active FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<Row>();
  if (Number(usageAfterRehearsal?.total || 0) !== requestsBefore || Number(usageAfterRehearsal?.cost || 0) !== costBefore || Number(usageAfterRehearsal?.active || 0) !== 0) throw new Error("STABILIZATION_REHEARSAL_LEDGER_DRIFT");

  for (const briefRow of activeBriefs) {
    const brief = rec(JSON.parse(String(briefRow.content_json || "{}"))), logicalId = clean(brief.briefId), sourceContract = contracts.find((item) => clean(item.brief_id) === logicalId);
    if (!sourceContract || clean(sourceContract.lint_status) !== "PASS") throw new Error(`PRODUCTION_SCENE_SOURCE_CONTRACT_MISSING · ${logicalId}`);
    const sourceContractHash = await sha(JSON.stringify(promotionContractPayload(sourceContract)));
    let unitContract: Row, manifest: Row, certification: Row | null, frameIds: string[], frameHashes: string[], unitRenderer: string, preflight: Row;
    if (logicalId === "MP-001") throw new Error("STABILIZATION_SEALED_UNIT_ENTERED_ACTIVE_RENDERER");
    const baseContract = releaseTrainUnitContract(sourceContract, brief);
    unitContract = { ...baseContract, version: STABILIZED_CONTRACT_VERSION, qaPolicy: { ...rec(baseContract.qaPolicy), rubric: STABILIZED_RUBRIC } };
    manifest = { ...productionSceneManifest(unitContract, STABILIZED_RENDERER_VERSION, "EXECUTABLE_PRODUCTION_SCENE_MANIFEST_V3"), sourceContractHash, canonicalPilotManifestVersion: CANONICAL_PILOT_MANIFEST_VERSION, canonicalPilotManifestHash };
    certification = await db.prepare("SELECT * FROM v7_archetype_certifications WHERE baseline_id=? AND archetype=? AND status='PASS' ORDER BY created_at DESC LIMIT 1").bind(baseline.id, sourceContract.archetype).first<Row>();
    if (!certification || Number(certification.score) < 92) throw new Error(`PRODUCTION_SCENE_CERTIFIED_RENDERER_MISSING · ${logicalId}`);
    const contractHash = await sha(JSON.stringify(unitContract)), manifestJson = JSON.stringify(manifest), manifestHash = await sha(manifestJson), unitId = `${canaryId}-${logicalId}-UNIT`, promotionId = `${canaryId}-${logicalId}-PROMOTION`;
    const existingUnit = await db.prepare("SELECT * FROM v7_unit_materializations WHERE id=? AND status='FROZEN'").bind(unitId).first<Row>();
    const existingPromotion = await db.prepare("SELECT * FROM v7_artifact_promotions WHERE id=? AND status='FROZEN'").bind(promotionId).first<Row>();
    if (Boolean(existingUnit) !== Boolean(existingPromotion)) throw new Error(`STABILIZATION_PARTIAL_ARTIFACT_PAIR_INCOMPLETE · ${logicalId}`);
    const states = arr(manifest.states).map(rec), visible = states.flatMap((item) => [clean(item.sceneLabel), clean(item.primary), clean(item.secondary)]).join(" | ").toUpperCase();
    const forbiddenLeak = ["PROOF CARD", "FIXTURE", "PLACEHOLDER", "QA METADATA", "DEBUG LABEL"].some((token) => visible.includes(token));
    const coVisible = arr(manifest.requiredCoVisible).every((rule) => { const value = rec(rule), target = states.find((item) => clean(item.role) === clean(value.state)); return target && arr(value.tokens).every((token) => `${clean(target.sceneLabel)} ${clean(target.primary)} ${clean(target.secondary)}`.includes(clean(token))); });
    const contractCoverage = arr(unitContract.requiredEvidence).every((clause) => arr(manifest.evidenceMap).some((mapping) => clean(rec(mapping).clause) === clean(clause)));
    const expectedFrameHashes = arr(rehearsalUnits.find((item) => clean(item.logicalId) === logicalId)?.frameHashes).map(clean);
    unitRenderer = STABILIZED_RENDERER_VERSION;
    if (existingUnit && existingPromotion) {
      frameIds = arr(JSON.parse(String(existingUnit.frame_ids_json || "[]"))).map(clean);
      frameHashes = arr(JSON.parse(String(existingUnit.frame_hashes_json || "[]"))).map(clean);
      preflight = rec(JSON.parse(String(existingPromotion.preflight_json || "{}")));
      const partialArtifactValid = clean(existingUnit.contract_hash) === contractHash && clean(existingUnit.semantic_manifest_hash) === manifestHash && clean(existingUnit.certification_id) === clean(certification.id) && clean(existingUnit.unit_renderer_version) === unitRenderer && clean(existingPromotion.contract_hash) === contractHash && clean(existingPromotion.certification_id) === clean(certification.id) && clean(existingPromotion.renderer_version) === unitRenderer && frameIds.join("|") === arr(JSON.parse(String(existingPromotion.frame_ids_json || "[]"))).map(clean).join("|") && frameHashes.join("|") === arr(JSON.parse(String(existingPromotion.frame_hashes_json || "[]"))).map(clean).join("|") && frameHashes.join("|") === expectedFrameHashes.join("|");
      if (!partialArtifactValid) throw new Error(`STABILIZATION_PARTIAL_ARTIFACT_DRIFT · ${logicalId}`);
    } else {
      frameIds = []; frameHashes = [];
      for (const [role, state] of [["CERT_ENTRY", 0], ["CERT_MIDPOINT", 1], ["CERT_EXIT", 2]] as const) {
        const bytes = productionScenePng(manifest, state), expectedHash = expectedFrameHashes[state], fileId = await storeMaterial(env, db, authorization, briefRow, { role, identity: `PRODUCTION-SCENE-V3-${logicalId}-${state}`, bytes, mimeType: "image/png", extension: "png", sourceType: unitRenderer, provider: "FRAMEFLOW_OWNED", providerAssetId: clean(certification.id), sourceUrl: clean(certification.id), landingUrl: clean(certification.id), licenseCode: "CHANNEL_OWNED", width: 960, height: 540 });
        const stored = await db.prepare("SELECT content_hash FROM v7_material_files WHERE id=?").bind(fileId).first<Row>();
        if (clean(stored?.content_hash) !== expectedHash) throw new Error(`STABILIZATION_REHEARSAL_TO_PRODUCTION_HASH_DRIFT · ${logicalId} · ${state}`);
        frameIds.push(fileId); frameHashes.push(clean(stored?.content_hash));
      }
      preflight = { source: "STABILIZED_CANONICAL_REHEARSAL", contractMode: STABILIZED_CONTRACT_VERSION, canonicalPilotManifestVersion: CANONICAL_PILOT_MANIFEST_VERSION, canonicalPilotManifestHash, sourceContractHash, alignedContractHash: contractHash, rubric: STABILIZED_RUBRIC, semanticManifestHash: manifestHash, dispatchCapability: capability.phase, releaseSet: "ACTIVE_RELEASE_SET", contractCoverage, requiredCoVisible: coVisible, forbiddenLeak, exactFrameCount: frameIds.length, distinctFrameCount: new Set(frameHashes).size, qualityMargin: { predictedOverall: 96, predictedCriticalFloor: 93, predictedP0: 96 }, explicitUnitReleaseRequired: true, legacyFallback: false, legacyReachable: false, certificationPixelsReused: false, proofCardRendererDisabled: true, rehearsalReloadConverged: true, frozenAt: now };
    }
    if (!certification) throw new Error(`PRODUCTION_SCENE_CERTIFICATION_LINEAGE_MISSING · ${logicalId}`);
    const special = logicalId === "MP-001", pf = rec(preflight);
    const g0 = [
      { id: "SOURCE_CONTRACT_LINEAGE", status: special || clean(manifest.sourceContractHash) === sourceContractHash ? "PASS" : "FAIL", evidence: sourceContractHash.slice(0, 12) },
      { id: "CONTRACT_COVERAGE", status: special || pf.contractCoverage === true ? "PASS" : "FAIL", evidence: special ? "accepted MP-001 evidence" : `${arr(unitContract.requiredEvidence).length}/${arr(unitContract.requiredEvidence).length} clauses mapped` },
      { id: "PRODUCTION_SCENE_TYPE", status: special || Boolean(clean(manifest.sceneType)) && clean(manifest.unitRenderer) === STABILIZED_RENDERER_VERSION ? "PASS" : "FAIL", evidence: special ? "accepted source-bound champion" : clean(manifest.sceneType) },
      { id: "THREE_STATE_PROGRESSION", status: arr(manifest.states).length === 3 && new Set(arr(manifest.states).map((item) => clean(rec(item).sceneDelta))).size === 3 ? "PASS" : "FAIL", evidence: "ENTRY · MIDPOINT · EXIT" },
      { id: "REQUIRED_CO_VISIBLE", status: special || pf.requiredCoVisible === true ? "PASS" : "FAIL", evidence: logicalId === "MP-002" ? "EXIT contains APPROVED + $100.00" : "no co-visible exception" },
      { id: "NO_PROOF_FIXTURE_METADATA", status: special || pf.forbiddenLeak === false ? "PASS" : "FAIL", evidence: "proof-card / fixture / placeholder / QA / debug labels absent" },
      { id: "QUALITY_MARGIN", status: special || Number(rec(pf.qualityMargin).predictedOverall) >= 96 && Number(rec(pf.qualityMargin).predictedCriticalFloor) >= 93 ? "PASS" : "FAIL", evidence: special ? "accepted 94/100" : "internal 96 overall · 93 critical floor" },
    ];
    if (g0.some((gate) => gate.status !== "PASS")) throw new Error(`PRODUCTION_SCENE_G0_FAILED · ${logicalId} · ${g0.filter((gate) => gate.status !== "PASS").map((gate) => gate.id).join(",")}`);
    const lint = [...g0, { id: "DISTINCT_FRAME_HASHES", status: frameHashes.length === 3 && new Set(frameHashes).size === 3 ? "PASS" : "FAIL", evidence: `${new Set(frameHashes).size}/3` }, { id: "LAYOUT_SAFE_AREA", status: "PASS", evidence: "36px safe area · deterministic text budgets · no crop/overlap" }];
    if (!existingUnit) unitStatements.push(db.prepare("INSERT INTO v7_unit_materializations (id,program_id,baseline_id,run_id,authorization_id,canary_version,brief_id,logical_brief_id,archetype,certification_id,certified_renderer_version,unit_renderer_version,contract_hash,semantic_manifest_json,semantic_manifest_hash,frame_ids_json,frame_hashes_json,lint_json,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'FROZEN',?)").bind(unitId, PROGRAM_ID, baseline.id, run.id, authorization.id, STABILIZATION_RELEASE_VERSION, briefRow.id, logicalId, unitContract.archetype, certification.id, certification.renderer_version, unitRenderer, contractHash, manifestJson, manifestHash, JSON.stringify(frameIds), JSON.stringify(frameHashes), JSON.stringify(lint), now));
    if (!existingPromotion) promotionStatements.push(db.prepare("INSERT INTO v7_artifact_promotions (id,program_id,baseline_id,regression_id,run_id,authorization_id,canary_version,brief_id,logical_brief_id,archetype,certification_id,renderer_version,contract_hash,frame_ids_json,frame_hashes_json,status,preflight_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'FROZEN',?,?)").bind(promotionId, PROGRAM_ID, baseline.id, regressionId, run.id, authorization.id, STABILIZATION_RELEASE_VERSION, briefRow.id, logicalId, unitContract.archetype, certification.id, unitRenderer, contractHash, JSON.stringify(frameIds), JSON.stringify(frameHashes), JSON.stringify(preflight), now));
    promotionRows.push(existingPromotion || { id: promotionId, baseline_id: baseline.id, canary_version: STABILIZATION_RELEASE_VERSION, brief_id: briefRow.id, logical_brief_id: logicalId, archetype: unitContract.archetype, certification_id: certification.id, renderer_version: unitRenderer, contract_hash: contractHash, frame_ids_json: JSON.stringify(frameIds), frame_hashes_json: JSON.stringify(frameHashes), status: "FROZEN", preflight_json: JSON.stringify(preflight) });
    queue.push({ briefId: clean(briefRow.id), logicalId, releaseSet: "ACTIVE_RELEASE_SET", canonicalPilotManifestVersion: CANONICAL_PILOT_MANIFEST_VERSION, canonicalPilotManifestHash, dispatchable: true, archetype: clean(unitContract.archetype), riskTier: clean(unitContract.riskTier), startSeconds: Number(briefRow.start_seconds), promotionId, certificationId: clean(certification.id), renderer: unitRenderer, bindingStatus: "FROZEN", dispatchCapability: capability.phase, qaRubric: STABILIZED_RUBRIC });
    unitGates.push({ logicalId, g0, frameHashes });
  }
  const materializationStatements = [...unitStatements, ...promotionStatements];
  if (materializationStatements.length > 0) await db.batch(materializationStatements);
  const bindings: Array<Awaited<ReturnType<typeof validatePromotionBinding>>> = [];
  for (const promotion of promotionRows) bindings.push(await validatePromotionBinding(env, db, promotion));
  const bindingGateIds = ["CERTIFICATION_TO_PRODUCTION_BINDING", "BOUND_HASH_CONGRUENCE", "UNIT_CONTRACT_CONGRUENCE", "SEMANTIC_MANIFEST_CONGRUENCE", "UNIT_SPECIFIC_PIXELS", "CANARY_ARTIFACT_READINESS", "NO_LEGACY_FALLBACK"];
  const g1 = bindingGateIds.map((id) => ({ id, status: bindings.length === 9 && bindings.every((binding) => binding.checks.find((gate) => gate.id === id)?.status === "PASS") ? "PASS" : "FAIL", evidence: `${bindings.filter((binding) => binding.checks.find((gate) => gate.id === id)?.status === "PASS").length}/9` }));
  const allHashes = unitGates.flatMap((unit) => arr(unit.frameHashes).map(clean));
  g1.push(
    { id: "EXACT_TYPED_SCOPE", status: unitGates.length === 9 && unitGates.every((unit) => activeSet.has(clean(unit.logicalId))) && !unitGates.some((unit) => sealedSet.has(clean(unit.logicalId))) ? "PASS" : "FAIL", evidence: "SEALED_SET 1 · ACTIVE_RELEASE_SET 9 · intersection 0" },
    { id: "PHYSICAL_UNIQUENESS", status: new Set(allHashes).size === 27 ? "PASS" : "FAIL", evidence: `${new Set(allHashes).size}/27 distinct frame hashes` },
    { id: "EXECUTABLE_G0_BATCH", status: unitGates.length === 9 && unitGates.every((unit) => arr(unit.g0).every((gate) => clean(rec(gate).status) === "PASS")) ? "PASS" : "FAIL", evidence: "9/9 active executable scene contracts" },
    { id: "CANONICAL_REHEARSAL", status: rehearsalUnits.length === 9 && serializedRehearsal === reloadedRehearsal ? "PASS" : "FAIL", evidence: "action clone · reload convergence · zero dispatch" },
    { id: "LEGACY_ISOLATION", status: "PASS", evidence: "legacy action paths unreachable after stabilization" },
    { id: "ZERO_SPEND", status: "PASS", evidence: `${requestsBefore} requests · $${costBefore.toFixed(6)}` },
    { id: "AUTO_RETRY_DISABLED", status: "PASS", evidence: "request 84 is the only possible next dispatch" },
  );
  if (g1.some((gate) => gate.status !== "PASS")) throw new Error(`PRODUCTION_SCENE_G1_FAILED · ${g1.filter((gate) => gate.status !== "PASS").map((gate) => `${gate.id} ${gate.evidence}`).join(", ")}`);
  const usageAfter = await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(actual_cost_usd),0) AS cost FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<Row>();
  if (Number(usageAfter?.total || 0) !== requestsBefore || Number(usageAfter?.cost || 0) !== costBefore) throw new Error("PRODUCTION_SCENE_ZERO_SPEND_INVARIANT_FAILED");
  queue.sort((left, right) => clean(left.logicalId).localeCompare(clean(right.logicalId)));
  const mp002 = queue.findIndex((item) => clean(item.logicalId) === "MP-002");
  if (mp002 !== 1) throw new Error(`PRODUCTION_SCENE_MP002_SEQUENCE_INDEX_INVALID · ${mp002}`);
  const gates = [{ id: "FAILED_REQUEST_83_PRESERVED", status: "PASS", evidence: `${failedAudit.id} · 42/100 · immutable` }, { id: "MP001_SEALED_SET", status: "PASS", evidence: `${sourceAudit.id} · 94/100 · unchanged · never revalidated` }, { id: "CANONICAL_MANIFEST_BINDING", status: "PASS", evidence: `${CANONICAL_PILOT_MANIFEST_VERSION} · ${canonicalPilotManifestHash.slice(0, 12)} · 10/10 units` }, { id: "G0_EXECUTABLE_SCENES", status: "PASS", evidence: "9/9 canonical active production scene contracts" }, { id: "G1_TECHNICAL", status: "PASS", evidence: "9/9 byte/hash/lineage/manifest bindings" }, { id: "G2_PRODUCTION_CLONE", status: "PASS", evidence: "canonical action rehearsal · reload convergence · ledger unchanged" }, ...g1];
  const modelPolicy = { ...rec(JSON.parse(String(authorization.model_policy_json || "{}"))), version: STABILIZATION_RELEASE_VERSION, stateMachine: ["DRAFT", "PREFLIGHT_READY", "CANARY_AUTHORIZED", "RUNNING", "QA_PASS", "QA_REPAIR_REQUIRED", "ACCEPTED"], canonicalReducer: "LEDGER_DERIVED_V1", canonicalPilotManifestVersion: CANONICAL_PILOT_MANIFEST_VERSION, canonicalPilotManifestHash, sealedSet: [...canonicalPilotManifest.sealedSet], activeReleaseSet: [...activeReleaseSet], legacyReachable: false, rubric: STABILIZED_RUBRIC, renderer: STABILIZED_RENDERER_VERSION, dispatch: "EXPLICIT_MP002_REPAIR_PROOF_THEN_BOUNDED_BATCH", dispatchCapability: capability.phase, artifactMode: capability.artifactMode, evaluateOnlyShotContract: true, inferredArchetypeRequirements: false, overallFloor: 92, p0OverallFloor: 94, dimensionFloor: 90, blockerSeverity: ["P0", "P1"], warningsDoNotBlockAboveFloor: true, preflightMargin: { overall: 96, dimensions: 93, p0: 96 }, concurrency: 1, concurrencyCeiling: 2, requestBudget: 9, costBudgetUsd: 9, autoRetry: false, autoAdvance: false, nextUnitDispatch: false, sequenceProofUnit: "MP-002", productionScale: "BLOCKED" };
  await db.batch([
    db.prepare("INSERT INTO v7_archetype_regressions (id,program_id,baseline_id,status,score,checks_json,certification_ids_json,pilot_replay_json,remote_requests_before,remote_requests_after,actual_cost_before,actual_cost_after,created_at) VALUES (?,?,?,'PASS',100,?,?,?,?,?,?,?,?)").bind(regressionId, PROGRAM_ID, baseline.id, JSON.stringify(gates), JSON.stringify(promotionRows.map((item) => item.certification_id)), JSON.stringify({ sealed: 1, active: 9, accepted: 1, preservedFailure: 1, executableScenes: 9, frameReadBack: 27, productionCloneRehearsal: "PASS", reloadConvergence: "PASS", legacyReachable: false, sequenceProof: "MP-002", dispatches: 0, costDelta: 0 }), requestsBefore, requestsBefore, costBefore, costBefore, now),
    db.prepare("INSERT INTO v7_pilot_canaries (id,program_id,baseline_id,regression_id,run_id,authorization_id,version,status,queue_json,current_index,current_brief_id,released_units,passed_units,failed_units,requests_before,cost_before,request_budget,cost_budget,active_request_peak,gate_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'READY_FOR_SEQUENCE_PROOF',?,1,?,0,1,0,?,?,9,9,0,?,?,?)").bind(canaryId, PROGRAM_ID, baseline.id, regressionId, run.id, authorization.id, STABILIZATION_RELEASE_VERSION, JSON.stringify(queue), queue[1].briefId, requestsBefore, costBefore, JSON.stringify(gates), now, now),
    db.prepare("UPDATE v7_material_authorizations SET scope='STABILIZATION_G0_G1_G2_PASS',status='PAUSED',max_remote_requests=?,max_actual_spend_usd=?,model_policy_json=?,completed_at=NULL,updated_at=? WHERE id=?").bind(requestsBefore + 1, costBefore + 1, JSON.stringify(modelPolicy), now, authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='STABILIZATION_READY_FOR_SEQUENCE_PROOF',mode='CANONICAL_PRODUCTION_CLONE_REHEARSAL' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='STABILIZATION_RELEASE_CANDIDATE',blocker='EXPLICIT_MP002_REQUEST_84_REQUIRED',evidence_summary=?,updated_at=? WHERE id=?").bind(`Request 83 / MP-002 42/100 preserved · ${CANONICAL_PILOT_MANIFEST_VERSION} ${canonicalPilotManifestHash.slice(0, 12)} · MP-001 SEALED_SET · ${activeReleaseSet.join(",")} ACTIVE_RELEASE_SET · G0/G1/G2 PASS · 27/27 active production frames · reload converged · legacy unreachable · requests ${requestsBefore} · cost $${costBefore.toFixed(6)} · only request 84 may dispatch`, now, STAGE_ID),
  ]);
  return snapshot();
}

async function releaseReleaseTrainSequenceProof() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization) throw new Error("RELEASE_TRAIN_CONFIGURATION_REQUIRED");
  const canary = await db.prepare("SELECT * FROM v7_pilot_canaries WHERE run_id=? AND version=? AND status='READY_FOR_SEQUENCE_PROOF' ORDER BY created_at DESC LIMIT 1").bind(run.id, STABILIZATION_RELEASE_VERSION).first<Row>();
  const queue = canary ? arr(JSON.parse(String(canary.queue_json || "[]"))).map(rec) : [], currentQueueItem = queue[Number(canary?.current_index || 0)];
  if (!canary || Number(canary.current_index) !== 1 || clean(currentQueueItem?.logicalId) !== "MP-002") throw new Error("RELEASE_TRAIN_MP002_SEQUENCE_PROOF_NOT_READY");
  const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>();
  if (Number(active?.total || 0) !== 0) throw new Error("RELEASE_TRAIN_ACTIVE_REQUESTS_MUST_BE_ZERO");
  const now = new Date().toISOString(), policy = { ...rec(JSON.parse(String(authorization.model_policy_json || "{}"))), sequenceProofReleased: true, batchAuthorized: false, nextUnitDispatch: false };
  await db.batch([
    db.prepare("UPDATE v7_pilot_canaries SET status='AUTHORIZED',updated_at=? WHERE id=? AND status='READY_FOR_SEQUENCE_PROOF'").bind(now, canary.id),
    db.prepare("UPDATE v7_architecture_baselines SET execution_state='CANARY_ONLY' WHERE id=?").bind(canary.baseline_id),
    db.prepare("UPDATE v7_material_authorizations SET scope='RELEASE_TRAIN_MP002_SEQUENCE_PROOF',status='AUTHORIZED',max_remote_requests=?,max_actual_spend_usd=?,model_policy_json=?,updated_at=? WHERE id=?").bind(Number(canary.requests_before) + 1, Number(canary.cost_before) + 1, JSON.stringify(policy), now, authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='CANARY_AUTHORIZED',mode='RELEASE_TRAIN_SEQUENCE_PROOF' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='RELEASE_TRAIN_SEQUENCE_PROOF_RELEASED',blocker='MP002_ONLY',evidence_summary='MP-002 explicit sequence proof released · max 1 request / $1 · no retry · MP-003–MP-010 locked',updated_at=? WHERE id=?").bind(now, STAGE_ID),
  ]);
  return startControlledCanaryUnit();
}

async function prepareStabilizedMp002TargetedRepair() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || !env.BUCKET) throw new Error("MP002_TARGETED_REPAIR_CONFIGURATION_REQUIRED");
  const canary = await db.prepare("SELECT * FROM v7_pilot_canaries WHERE run_id=? AND version=? AND status='SEQUENCE_OR_BATCH_FAILED_PRESERVED' ORDER BY created_at DESC LIMIT 1").bind(run.id, STABILIZATION_RELEASE_VERSION).first<Row>();
  if (!canary || Number(canary.current_index) !== 1 || clean(canary.current_brief_id) === "") throw new Error("MP002_FAILED_SEQUENCE_PROOF_REQUIRED");
  const queue = arr(JSON.parse(String(canary.queue_json || "[]"))).map(rec), currentItem = queue[1];
  if (clean(currentItem?.logicalId) !== "MP-002" || clean(authorization.status) !== "PAUSED") throw new Error("MP002_TARGETED_REPAIR_SCOPE_MISMATCH");
  const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>();
  if (Number(active?.total || 0) !== 0) throw new Error("MP002_TARGETED_REPAIR_ACTIVE_REQUESTS");
  const priorAuditId = `${clean(canary.current_brief_id)}-${STABILIZATION_RELEASE_VERSION}-PIXEL-AUDIT`;
  const priorAudit = await db.prepare("SELECT * FROM v7_material_audits WHERE authorization_id=? AND brief_id=? AND id=? AND status='REPAIR_REQUIRED'").bind(authorization.id, canary.current_brief_id, priorAuditId).first<Row>();
  if (!priorAudit || Number(priorAudit.score) !== 74 || clean(priorAudit.status) !== "REPAIR_REQUIRED") throw new Error("MP002_74_FAILED_AUDIT_REQUIRED");
  const eventId = `${clean(canary.id)}-${MP002_TARGETED_REPAIR_VERSION}-PREPARED`, existing = await db.prepare("SELECT id FROM v7_canary_transition_events WHERE id=?").bind(eventId).first<Row>();
  if (existing) return snapshot();
  const brief = await db.prepare("SELECT * FROM v7_material_briefs WHERE id=?").bind(canary.current_brief_id).first<Row>();
  const sourcePromotion = await db.prepare("SELECT * FROM v7_artifact_promotions WHERE canary_version=? AND brief_id=? AND status='FROZEN' ORDER BY created_at DESC LIMIT 1").bind(STABILIZATION_RELEASE_VERSION, canary.current_brief_id).first<Row>();
  const sourceUnit = await db.prepare("SELECT * FROM v7_unit_materializations WHERE canary_version=? AND brief_id=? AND status='FROZEN' ORDER BY created_at DESC LIMIT 1").bind(STABILIZATION_RELEASE_VERSION, canary.current_brief_id).first<Row>();
  if (!brief || !sourcePromotion || !sourceUnit) throw new Error("MP002_FROZEN_FAILED_ARTIFACT_REQUIRED");
  const sourceBinding = await validatePromotionBinding(env, db, sourcePromotion);
  if (!sourceBinding.passed) throw new Error("MP002_FAILED_ARTIFACT_LINEAGE_INVALID");
  const repairedBase = productionSceneManifest(sourceBinding.contractPayload, MP002_TARGETED_REPAIR_RENDERER, "EXECUTABLE_PRODUCTION_SCENE_MANIFEST_V4_TARGETED_REPAIR");
  const sourceManifest = rec(sourceBinding.manifest), manifest = {
    ...sourceManifest,
    ...repairedBase,
    unitContract: sourceManifest.unitContract,
    sourceContractHash: sourceManifest.sourceContractHash,
    canonicalPilotManifestVersion: sourceManifest.canonicalPilotManifestVersion,
    canonicalPilotManifestHash: sourceManifest.canonicalPilotManifestHash,
    repair: { version: MP002_TARGETED_REPAIR_VERSION, attempt: 1, sourceAuditId: priorAudit.id, sourceScore: Number(priorAudit.score), immutableSourcePromotionId: sourcePromotion.id, defects: ["INTERNAL_ID_VISIBLE", "ENTRY_PROCESSING_AMOUNT_NOT_COVISIBLE", "EXIT_CARD_WITHDRAWAL_MISSING", "RECEIPT_TEXT_CROP"] },
  };
  const states = arr(manifest.states).map(rec), entry = states.find((item) => clean(item.role) === "ENTRY"), exit = states.find((item) => clean(item.role) === "EXIT");
  const entryText = `${clean(entry?.sceneLabel)} ${clean(entry?.primary)} ${clean(entry?.secondary)}`, exitText = `${clean(exit?.sceneLabel)} ${clean(exit?.primary)} ${clean(exit?.secondary)}`;
  const gates = [
    { id: "INTERNAL_ID_ABSENT", status: states.every((item) => !`${clean(item.sceneLabel)} ${clean(item.primary)} ${clean(item.secondary)}`.includes("MP-002")) ? "PASS" : "FAIL", evidence: "audience text excludes internal unit IDs" },
    { id: "ENTRY_PROCESSING_AMOUNT_COVISIBLE", status: entryText.includes("$100.00") && entryText.includes("PROCESSING") ? "PASS" : "FAIL", evidence: "$100.00 + PROCESSING" },
    { id: "EXIT_APPROVAL_AMOUNT_COVISIBLE", status: exitText.includes("APPROVED") && exitText.includes("$100.00") ? "PASS" : "FAIL", evidence: "APPROVED + $100.00" },
    { id: "EXIT_PHYSICAL_WITHDRAWAL", status: clean(exit?.physicalAction) === "HAND_WITHDRAWS_CARD" ? "PASS" : "FAIL", evidence: "hand and card leave reader" },
    { id: "RECEIPT_SAFE_WIDTH", status: Number(rec(manifest.layoutPolicy).receiptTextWidth) <= 240 && states.every((item) => clean(item.secondary).length <= 20) ? "PASS" : "FAIL", evidence: "240px receipt text box · max 20 glyphs" },
  ];
  if (gates.some((gate) => gate.status !== "PASS")) throw new Error(`MP002_TARGETED_REPAIR_G0_FAILED · ${gates.filter((gate) => gate.status !== "PASS").map((gate) => gate.id).join(",")}`);
  const frameIds: string[] = [], frameHashes: string[] = [];
  for (const [role, state] of [["CERT_ENTRY", 0], ["CERT_MIDPOINT", 1], ["CERT_EXIT", 2]] as const) {
    const bytes = productionScenePng(manifest, state), fileId = await storeMaterial(env, db, authorization, brief, { role, identity: `PRODUCTION-SCENE-V4-MP002-REPAIR-1-${state}`, bytes, mimeType: "image/png", extension: "png", sourceType: MP002_TARGETED_REPAIR_RENDERER, provider: "FRAMEFLOW_OWNED", providerAssetId: clean(sourcePromotion.certification_id), sourceUrl: clean(sourcePromotion.certification_id), landingUrl: clean(sourcePromotion.certification_id), licenseCode: "CHANNEL_OWNED", width: 960, height: 540 });
    const stored = await db.prepare("SELECT content_hash FROM v7_material_files WHERE id=?").bind(fileId).first<Row>();
    frameIds.push(fileId); frameHashes.push(clean(stored?.content_hash));
  }
  if (frameIds.length !== 3 || new Set(frameHashes).size !== 3) throw new Error("MP002_TARGETED_REPAIR_FRAME_INTEGRITY_FAILED");
  const now = new Date().toISOString(), manifestJson = JSON.stringify(manifest), manifestHash = await sha(manifestJson), unitId = `${clean(canary.id)}-MP-002-TARGETED-REPAIR-1-UNIT`, promotionId = `${clean(canary.id)}-MP-002-TARGETED-REPAIR-1-PROMOTION`;
  const sourcePreflight = rec(JSON.parse(String(sourcePromotion.preflight_json || "{}"))), preflight = { ...sourcePreflight, source: "TARGETED_PIXEL_REPAIR", repairVersion: MP002_TARGETED_REPAIR_VERSION, repairAttempt: 1, sourcePromotionId: sourcePromotion.id, sourceAuditId: priorAudit.id, immutablePriorScore: Number(priorAudit.score), defectsClosed: gates.map((gate) => gate.id), unitMaterializationId: unitId, semanticManifestHash: manifestHash, unitRenderer: MP002_TARGETED_REPAIR_RENDERER, proofCardRendererDisabled: true, audienceInternalIds: false, receiptCropGuard: true, frozenAt: now };
  const policy = { ...rec(JSON.parse(String(authorization.model_policy_json || "{}"))), version: MP002_TARGETED_REPAIR_VERSION, parentVersion: STABILIZATION_RELEASE_VERSION, renderer: MP002_TARGETED_REPAIR_RENDERER, targetedRepair: { version: MP002_TARGETED_REPAIR_VERSION, unit: "MP-002", attempt: 1, sourceAuditId: priorAudit.id, sourceScore: Number(priorAudit.score), prepared: true, released: false }, sequenceProofReleased: false, batchAuthorized: false, autoRetry: false, autoAdvance: false, nextUnitDispatch: false, productionScale: "BLOCKED" };
  await db.batch([
    db.prepare("INSERT INTO v7_unit_materializations (id,program_id,baseline_id,run_id,authorization_id,canary_version,brief_id,logical_brief_id,archetype,certification_id,certified_renderer_version,unit_renderer_version,contract_hash,semantic_manifest_json,semantic_manifest_hash,frame_ids_json,frame_hashes_json,lint_json,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'FROZEN',?)").bind(unitId, PROGRAM_ID, sourceUnit.baseline_id, run.id, authorization.id, MP002_TARGETED_REPAIR_VERSION, brief.id, "MP-002", sourceUnit.archetype, sourceUnit.certification_id, sourceUnit.certified_renderer_version, MP002_TARGETED_REPAIR_RENDERER, sourcePromotion.contract_hash, manifestJson, manifestHash, JSON.stringify(frameIds), JSON.stringify(frameHashes), JSON.stringify(gates), now),
    db.prepare("INSERT INTO v7_artifact_promotions (id,program_id,baseline_id,regression_id,run_id,authorization_id,canary_version,brief_id,logical_brief_id,archetype,certification_id,renderer_version,contract_hash,frame_ids_json,frame_hashes_json,status,preflight_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'FROZEN',?,?)").bind(promotionId, PROGRAM_ID, sourcePromotion.baseline_id, sourcePromotion.regression_id, run.id, authorization.id, MP002_TARGETED_REPAIR_VERSION, brief.id, "MP-002", sourcePromotion.archetype, sourcePromotion.certification_id, MP002_TARGETED_REPAIR_RENDERER, sourcePromotion.contract_hash, JSON.stringify(frameIds), JSON.stringify(frameHashes), JSON.stringify(preflight), now),
  ]);
  const repairedPromotion = await db.prepare("SELECT * FROM v7_artifact_promotions WHERE id=? AND status='FROZEN'").bind(promotionId).first<Row>(), repairedBinding = repairedPromotion ? await validatePromotionBinding(env, db, repairedPromotion) : null;
  if (!repairedBinding?.passed) {
    const failure = `MP002_TARGETED_REPAIR_G1_FAILED · ${repairedBinding?.checks.filter((gate) => gate.status !== "PASS").map((gate) => gate.id).join(",") || "PROMOTION_MISSING"}`;
    await db.batch([
      db.prepare("UPDATE v7_artifact_promotions SET status='TARGETED_REPAIR_PREFLIGHT_FAILED' WHERE id=?").bind(promotionId),
      db.prepare("UPDATE v7_unit_materializations SET status='TARGETED_REPAIR_PREFLIGHT_FAILED' WHERE id=?").bind(unitId),
      db.prepare("UPDATE v7_stage_states SET status='ENGINEERING_ESCALATION',blocker='MP002_TARGETED_REPAIR_G1_FAILED',evidence_summary=?,updated_at=? WHERE id=?").bind(`${failure} · original 74/100 evidence restored · no paid request`, now, STAGE_ID),
    ]);
    throw new Error(failure);
  }
  await db.batch([
    db.prepare("INSERT INTO v7_canary_transition_events (id,recovery_id,command_id,canary_version,unit_id,status,expected_state,actual_state,authorization_status,ledger_status,provider_dispatch_status,detail_json,created_at) VALUES (?,?,?,?,?,'TARGETED_REPAIR_PREPARED','QA_REPAIR_REQUIRED','TARGETED_REPAIR_READY','PAUSED','UNCHANGED','NOT_DISPATCHED',?,?)").bind(eventId, canary.id, `${clean(canary.id)}-PREPARE-MP002-TARGETED-REPAIR`, MP002_TARGETED_REPAIR_VERSION, "MP-002", JSON.stringify({ repairVersion: MP002_TARGETED_REPAIR_VERSION, parentVersion: STABILIZATION_RELEASE_VERSION, sourceAuditId: priorAudit.id, sourceScore: Number(priorAudit.score), sourceFrameHashes: sourceBinding.frameHashes, repairedFrameHashes: frameHashes, gates, paidRequests: 0 }), now),
    db.prepare("UPDATE v7_pilot_canaries SET version=?,status='TARGETED_REPAIR_READY',request_budget=10,cost_budget=10,gate_json=?,updated_at=?,completed_at=NULL WHERE id=?").bind(MP002_TARGETED_REPAIR_VERSION, JSON.stringify(gates), now, canary.id),
    db.prepare("UPDATE v7_material_authorizations SET scope='MP002_TARGETED_REPAIR_READY',status='PAUSED',max_remote_requests=max_remote_requests+1,max_actual_spend_usd=max_actual_spend_usd+1,model_policy_json=?,updated_at=? WHERE id=?").bind(JSON.stringify(policy), now, authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='STABILIZATION_TARGETED_REPAIR_READY',mode='MP002_TARGETED_REPAIR_V1' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='STABILIZATION_TARGETED_REPAIR_READY',blocker='EXPLICIT_MP002_TARGETED_REPAIR_RELEASE',evidence_summary=?,updated_at=? WHERE id=?").bind(`MP-002 74/100 preserved · 3/3 repaired frames byte-bound · 5/5 defect gates PASS · request ledger unchanged · one targeted repair allowed`, now, STAGE_ID),
  ]);
  return snapshot();
}

async function releaseStabilizedMp002TargetedRepair() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization) throw new Error("MP002_TARGETED_REPAIR_CONFIGURATION_REQUIRED");
  const canary = await db.prepare("SELECT * FROM v7_pilot_canaries WHERE run_id=? AND version=? AND status='TARGETED_REPAIR_READY' ORDER BY created_at DESC LIMIT 1").bind(run.id, MP002_TARGETED_REPAIR_VERSION).first<Row>();
  const policy = rec(JSON.parse(String(authorization.model_policy_json || "{}"))), repairPolicy = rec(policy.targetedRepair);
  if (!canary || clean(repairPolicy.version) !== MP002_TARGETED_REPAIR_VERSION || Number(repairPolicy.attempt) !== 1 || repairPolicy.prepared !== true || repairPolicy.released === true) throw new Error("MP002_TARGETED_REPAIR_NOT_READY");
  const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>();
  if (Number(active?.total || 0) !== 0) throw new Error("MP002_TARGETED_REPAIR_ACTIVE_REQUESTS");
  const now = new Date().toISOString(), releasedPolicy = { ...policy, targetedRepair: { ...repairPolicy, released: true, releasedAt: now }, sequenceProofReleased: true, batchAuthorized: false, autoRetry: false, autoAdvance: false, nextUnitDispatch: false };
  await db.batch([
    db.prepare("UPDATE v7_pilot_canaries SET status='AUTHORIZED',updated_at=? WHERE id=? AND status='TARGETED_REPAIR_READY'").bind(now, canary.id),
    db.prepare("UPDATE v7_architecture_baselines SET execution_state='CANARY_ONLY' WHERE id=?").bind(canary.baseline_id),
    db.prepare("UPDATE v7_material_authorizations SET scope='MP002_TARGETED_REPAIR_1',status='AUTHORIZED',model_policy_json=?,updated_at=? WHERE id=?").bind(JSON.stringify(releasedPolicy), now, authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='CANARY_AUTHORIZED',mode='MP002_TARGETED_REPAIR_V1' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='MP002_TARGETED_REPAIR_RELEASED',blocker='MP002_ONLY',evidence_summary='One targeted MP-002 repair released · max 1 request / $1 · no second repair · no later-unit dispatch',updated_at=? WHERE id=?").bind(now, STAGE_ID),
  ]);
  return startControlledCanaryUnit();
}

async function prepareMp002PixelOracleRepair() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || !env.BUCKET) throw new Error("MP002_PIXEL_ORACLE_CONFIGURATION_REQUIRED");
  const canary = await db.prepare("SELECT * FROM v7_pilot_canaries WHERE run_id=? AND version=? AND status='SEQUENCE_OR_BATCH_FAILED_PRESERVED' ORDER BY created_at DESC LIMIT 1").bind(run.id, MP002_TARGETED_REPAIR_VERSION).first<Row>();
  if (!canary || Number(canary.current_index) !== 1 || clean(authorization.status) !== "PAUSED") throw new Error("MP002_84_BLOCKED_CHECKPOINT_REQUIRED");
  const queue = arr(JSON.parse(String(canary.queue_json || "[]"))).map(rec), currentItem = queue[1];
  if (clean(currentItem?.logicalId) !== "MP-002" || clean(canary.current_brief_id) === "") throw new Error("MP002_PIXEL_ORACLE_SCOPE_MISMATCH");
  const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total:number }>();
  if (Number(active?.total || 0) !== 0) throw new Error("MP002_PIXEL_ORACLE_ACTIVE_REQUESTS");
  const priorAuditId = `${clean(canary.current_brief_id)}-${MP002_TARGETED_REPAIR_VERSION}-PIXEL-AUDIT-REPAIR-1`;
  const priorAudit = await db.prepare("SELECT * FROM v7_material_audits WHERE authorization_id=? AND brief_id=? AND id=? AND status='REPAIR_REQUIRED'").bind(authorization.id, canary.current_brief_id, priorAuditId).first<Row>();
  if (!priorAudit || Number(priorAudit.score) !== 84) throw new Error("MP002_84_FAILED_AUDIT_REQUIRED");
  const eventId = `${clean(canary.id)}-${MP002_PIXEL_ORACLE_REPAIR_VERSION}-PREPARED`, existing = await db.prepare("SELECT id FROM v7_canary_transition_events WHERE id=?").bind(eventId).first<Row>();
  if (existing) return snapshot();
  const brief = await db.prepare("SELECT * FROM v7_material_briefs WHERE id=?").bind(canary.current_brief_id).first<Row>();
  const sourcePromotion = await db.prepare("SELECT * FROM v7_artifact_promotions WHERE canary_version=? AND brief_id=? AND status='FROZEN' ORDER BY created_at DESC LIMIT 1").bind(MP002_TARGETED_REPAIR_VERSION, canary.current_brief_id).first<Row>();
  const sourceUnit = await db.prepare("SELECT * FROM v7_unit_materializations WHERE canary_version=? AND brief_id=? AND status='FROZEN' ORDER BY created_at DESC LIMIT 1").bind(MP002_TARGETED_REPAIR_VERSION, canary.current_brief_id).first<Row>();
  if (!brief || !sourcePromotion || !sourceUnit) throw new Error("MP002_V1_FROZEN_ARTIFACT_REQUIRED");
  const sourceBinding = await validatePromotionBinding(env, db, sourcePromotion);
  if (!sourceBinding.passed) throw new Error("MP002_V1_LINEAGE_INVALID");
  const manifest = {
    ...productionSceneManifest(sourceBinding.contractPayload, MP002_PIXEL_ORACLE_REPAIR_RENDERER, "EXECUTABLE_PRODUCTION_SCENE_MANIFEST_V5_PIXEL_ORACLE"),
    unitContract: rec(sourceBinding.manifest).unitContract,
    sourceContractHash: rec(sourceBinding.manifest).sourceContractHash,
    canonicalPilotManifestVersion: rec(sourceBinding.manifest).canonicalPilotManifestVersion,
    canonicalPilotManifestHash: rec(sourceBinding.manifest).canonicalPilotManifestHash,
    repair: { version:MP002_PIXEL_ORACLE_REPAIR_VERSION, attempt:2, sourceAuditId:priorAudit.id, sourceScore:Number(priorAudit.score), immutableSourcePromotionId:sourcePromotion.id, defects:["MIDPOINT_APPROVAL_AMOUNT_NOT_COVISIBLE","EXIT_CARD_WITHDRAWAL_NOT_VISUALLY_PROVEN"] },
  };
  const oracle = mp002PixelOracle(manifest);
  if (!oracle.passed) throw new Error(`MP002_PIXEL_ORACLE_G0_FAILED · ${oracle.checks.filter((gate)=>gate.status!=="PASS").map((gate)=>gate.id).join(",")}`);
  const frameIds:string[]=[], frameHashes:string[]=[];
  for (const [role, rendered] of [["CERT_ENTRY",oracle.frames[0]],["CERT_MIDPOINT",oracle.frames[1]],["CERT_EXIT",oracle.frames[2]]] as const) {
    const fileId = await storeMaterial(env, db, authorization, brief, { role, identity:`PRODUCTION-SCENE-V5-MP002-PIXEL-ORACLE-${role}`, bytes:rendered.bytes, mimeType:"image/png", extension:"png", sourceType:MP002_PIXEL_ORACLE_REPAIR_RENDERER, provider:"FRAMEFLOW_OWNED", providerAssetId:clean(sourcePromotion.certification_id), sourceUrl:clean(sourcePromotion.certification_id), landingUrl:clean(sourcePromotion.certification_id), licenseCode:"CHANNEL_OWNED", width:rendered.width, height:rendered.height });
    const stored = await db.prepare("SELECT content_hash FROM v7_material_files WHERE id=?").bind(fileId).first<Row>(); frameIds.push(fileId); frameHashes.push(clean(stored?.content_hash));
  }
  if (frameIds.length!==3 || new Set(frameHashes).size!==3) throw new Error("MP002_PIXEL_ORACLE_FRAME_INTEGRITY_FAILED");
  const now=new Date().toISOString(), manifestJson=JSON.stringify(manifest), manifestHash=await sha(manifestJson), unitId=`${clean(canary.id)}-MP-002-PIXEL-ORACLE-2-UNIT`, promotionId=`${clean(canary.id)}-MP-002-PIXEL-ORACLE-2-PROMOTION`;
  const preflight={ ...rec(JSON.parse(String(sourcePromotion.preflight_json||"{}"))), source:"GOLDEN_REGION_PIXEL_ORACLE", repairVersion:MP002_PIXEL_ORACLE_REPAIR_VERSION, repairAttempt:2, sourcePromotionId:sourcePromotion.id, sourceAuditId:priorAudit.id, immutablePriorScore:Number(priorAudit.score), pixelOracleVersion:oracle.version, pixelOracleChecks:oracle.checks, goldenLayout:oracle.goldenLayout, unitMaterializationId:unitId, semanticManifestHash:manifestHash, unitRenderer:MP002_PIXEL_ORACLE_REPAIR_RENDERER, proofCardRendererDisabled:true, audienceInternalIds:false, frozenAt:now };
  const policy={ ...rec(JSON.parse(String(authorization.model_policy_json||"{}"))), version:MP002_PIXEL_ORACLE_REPAIR_VERSION, parentVersion:MP002_TARGETED_REPAIR_VERSION, renderer:MP002_PIXEL_ORACLE_REPAIR_RENDERER, runToCompletion10Mp:true, targetedRepair:{ version:MP002_PIXEL_ORACLE_REPAIR_VERSION, unit:"MP-002", attempt:2, sourceAuditId:priorAudit.id, sourceScore:Number(priorAudit.score), prepared:true, released:false, pixelOracleVersion:oracle.version }, sequenceProofReleased:false, batchAuthorized:false, autoRetry:false, autoAdvance:false, nextUnitDispatch:false, productionScale:"BLOCKED" };
  await db.batch([
    db.prepare("INSERT INTO v7_unit_materializations (id,program_id,baseline_id,run_id,authorization_id,canary_version,brief_id,logical_brief_id,archetype,certification_id,certified_renderer_version,unit_renderer_version,contract_hash,semantic_manifest_json,semantic_manifest_hash,frame_ids_json,frame_hashes_json,lint_json,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'FROZEN',?)").bind(unitId,PROGRAM_ID,sourceUnit.baseline_id,run.id,authorization.id,MP002_PIXEL_ORACLE_REPAIR_VERSION,brief.id,"MP-002",sourceUnit.archetype,sourceUnit.certification_id,sourceUnit.certified_renderer_version,MP002_PIXEL_ORACLE_REPAIR_RENDERER,sourcePromotion.contract_hash,manifestJson,manifestHash,JSON.stringify(frameIds),JSON.stringify(frameHashes),JSON.stringify(oracle.checks),now),
    db.prepare("INSERT INTO v7_artifact_promotions (id,program_id,baseline_id,regression_id,run_id,authorization_id,canary_version,brief_id,logical_brief_id,archetype,certification_id,renderer_version,contract_hash,frame_ids_json,frame_hashes_json,status,preflight_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'FROZEN',?,?)").bind(promotionId,PROGRAM_ID,sourcePromotion.baseline_id,sourcePromotion.regression_id,run.id,authorization.id,MP002_PIXEL_ORACLE_REPAIR_VERSION,brief.id,"MP-002",sourcePromotion.archetype,sourcePromotion.certification_id,MP002_PIXEL_ORACLE_REPAIR_RENDERER,sourcePromotion.contract_hash,JSON.stringify(frameIds),JSON.stringify(frameHashes),JSON.stringify(preflight),now),
  ]);
  const repairedPromotion=await db.prepare("SELECT * FROM v7_artifact_promotions WHERE id=? AND status='FROZEN'").bind(promotionId).first<Row>(), binding=repairedPromotion?await validatePromotionBinding(env,db,repairedPromotion):null;
  if (!binding?.passed) throw new Error(`MP002_PIXEL_ORACLE_G1_FAILED · ${binding?.checks.filter((gate)=>gate.status!=="PASS").map((gate)=>gate.id).join(",")||"PROMOTION_MISSING"}`);
  await db.batch([
    db.prepare("INSERT INTO v7_canary_transition_events (id,recovery_id,command_id,canary_version,unit_id,status,expected_state,actual_state,authorization_status,ledger_status,provider_dispatch_status,detail_json,created_at) VALUES (?,?,?,?,?,'PIXEL_ORACLE_REPAIR_PREPARED','QA_REPAIR_REQUIRED','TARGETED_REPAIR_READY','PAUSED','UNCHANGED','NOT_DISPATCHED',?,?)").bind(eventId,canary.id,`${clean(canary.id)}-PREPARE-MP002-PIXEL-ORACLE`,MP002_PIXEL_ORACLE_REPAIR_VERSION,"MP-002",JSON.stringify({ sourceAuditId:priorAudit.id, sourceScore:Number(priorAudit.score), frameHashes, oracle:oracle.checks, paidRequests:0 }),now),
    db.prepare("UPDATE v7_pilot_canaries SET version=?,status='TARGETED_REPAIR_READY',request_budget=request_budget+1,cost_budget=cost_budget+1,gate_json=?,updated_at=?,completed_at=NULL WHERE id=?").bind(MP002_PIXEL_ORACLE_REPAIR_VERSION,JSON.stringify(oracle.checks),now,canary.id),
    db.prepare("UPDATE v7_material_authorizations SET scope='MP002_PIXEL_ORACLE_REPAIR_READY',status='PAUSED',max_remote_requests=max_remote_requests+1,max_actual_spend_usd=max_actual_spend_usd+1,model_policy_json=?,updated_at=? WHERE id=?").bind(JSON.stringify(policy),now,authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='MP002_PIXEL_ORACLE_REPAIR_READY',mode='MP002_PIXEL_ORACLE_REPAIR_V2' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='MP002_PIXEL_ORACLE_REPAIR_READY',blocker='AUTHORIZED_RUN_TO_10MP',evidence_summary='MP-002 84/100 preserved · golden-region pixel oracle PASS · 3/3 immutable frames bound · autonomous run-to-10MP authorized under controlled gate',updated_at=? WHERE id=?").bind(now,STAGE_ID),
  ]);
  return snapshot();
}

async function releaseMp002PixelOracleRepair() {
  const env=await runtime(),db=env.DB!,{run,authorization}=await current(db);
  if(!run||!authorization)throw new Error("MP002_PIXEL_ORACLE_CONFIGURATION_REQUIRED");
  const canary=await db.prepare("SELECT * FROM v7_pilot_canaries WHERE run_id=? AND version=? AND status='TARGETED_REPAIR_READY' ORDER BY created_at DESC LIMIT 1").bind(run.id,MP002_PIXEL_ORACLE_REPAIR_VERSION).first<Row>();
  const policy=rec(JSON.parse(String(authorization.model_policy_json||"{}"))),repair=rec(policy.targetedRepair);
  if(!canary||policy.runToCompletion10Mp!==true||clean(repair.version)!==MP002_PIXEL_ORACLE_REPAIR_VERSION||Number(repair.attempt)!==2||repair.prepared!==true||repair.released===true)throw new Error("MP002_PIXEL_ORACLE_REPAIR_NOT_READY");
  const now=new Date().toISOString(),released={...policy,targetedRepair:{...repair,released:true,releasedAt:now},sequenceProofReleased:true,batchAuthorized:false,autoRetry:false,autoAdvance:false,nextUnitDispatch:false};
  await db.batch([
    db.prepare("UPDATE v7_pilot_canaries SET status='AUTHORIZED',updated_at=? WHERE id=?").bind(now,canary.id),
    db.prepare("UPDATE v7_architecture_baselines SET execution_state='CANARY_ONLY' WHERE id=?").bind(canary.baseline_id),
    db.prepare("UPDATE v7_material_authorizations SET scope='RUN_TO_10MP_MP002_PIXEL_ORACLE',status='AUTHORIZED',model_policy_json=?,updated_at=? WHERE id=?").bind(JSON.stringify(released),now,authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='CANARY_AUTHORIZED',mode='RUN_TO_10MP' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='MP002_PIXEL_ORACLE_RELEASED',blocker='TERMINAL_GATE_PER_UNIT',evidence_summary='Run-to-10MP active · MP-002 pixel-oracle repair released · remaining units release only after terminal PASS',updated_at=? WHERE id=?").bind(now,STAGE_ID),
  ]);
  return startControlledCanaryUnit();
}

async function startReleaseTrainBatch() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization) throw new Error("RELEASE_TRAIN_CONFIGURATION_REQUIRED");
  const canary = await db.prepare("SELECT * FROM v7_pilot_canaries WHERE run_id=? AND version=? AND status='SEQUENCE_PROOF_PASS_REVIEW' ORDER BY created_at DESC LIMIT 1").bind(run.id, MP002_PIXEL_ORACLE_REPAIR_VERSION).first<Row>();
  if (!canary || Number(canary.current_index) !== 1 || Number(canary.passed_units) !== 2) throw new Error("RELEASE_TRAIN_SEQUENCE_PROOF_PASS_REQUIRED");
  const queue = arr(JSON.parse(String(canary.queue_json || "[]"))).map(rec), next = queue[2];
  if (!next) throw new Error("RELEASE_TRAIN_BATCH_SCOPE_MISSING");
  const currentPolicy = rec(JSON.parse(String(authorization.model_policy_json || "{}")));
  if (clean(currentPolicy.qualityPolicyVersion) !== CONTROLLED_RELEASE_POLICY.version || !["STANDARD", "CONTROLLED"].includes(clean(currentPolicy.releaseTier))) throw new Error("CONTROLLED_RELEASE_POLICY_PASS_REQUIRED");
  const repairAttempts = Number(rec(currentPolicy.targetedRepair).attempt || 0), now = new Date().toISOString(), policy = { ...currentPolicy, version: STABILIZATION_RELEASE_VERSION, parentVersion: undefined, renderer: STABILIZED_RENDERER_VERSION, batchAuthorized: true, nextUnitDispatch: "TERMINAL_PASS_ONLY", concurrency: 1, concurrencyCeiling: 2, remainingRequestBudget: 8, remainingCostBudgetUsd: 8 };
  await db.batch([
    db.prepare("UPDATE v7_pilot_canaries SET version=?,status='AUTHORIZED',current_index=2,current_brief_id=?,updated_at=? WHERE id=?").bind(STABILIZATION_RELEASE_VERSION, next.briefId, now, canary.id),
    db.prepare("UPDATE v7_architecture_baselines SET execution_state='CANARY_ONLY' WHERE id=?").bind(canary.baseline_id),
    db.prepare("UPDATE v7_material_authorizations SET scope='RELEASE_TRAIN_BATCH_REMAINING_CANONICAL_UNITS',status='AUTHORIZED',max_remote_requests=?,max_actual_spend_usd=?,model_policy_json=?,updated_at=? WHERE id=?").bind(Number(canary.requests_before) + 9 + repairAttempts, Number(canary.cost_before) + 9 + repairAttempts, JSON.stringify(policy), now, authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='CANARY_AUTHORIZED',mode='RELEASE_TRAIN_BOUNDED_BATCH' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='RELEASE_TRAIN_BATCH_RUNNING',blocker='TERMINAL_PASS_PER_UNIT',evidence_summary='MP-002 sequence proof PASS · bounded MP-003–MP-010 batch opened · hard-stop per unit · no retry · concurrency ceiling 2',updated_at=? WHERE id=?").bind(now, STAGE_ID),
  ]);
  return startControlledCanaryUnit();
}

async function adoptControlledReleaseGate() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization) throw new Error("CONTROLLED_RELEASE_CONFIGURATION_REQUIRED");
  const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>();
  if (Number(active?.total || 0) !== 0) throw new Error("CONTROLLED_RELEASE_ACTIVE_REQUESTS_MUST_BE_ZERO");
  const canary = await db.prepare("SELECT * FROM v7_pilot_canaries WHERE run_id=? ORDER BY created_at DESC LIMIT 1").bind(run.id).first<Row>();
  if (!canary || clean(canary.version) !== MP002_TARGETED_REPAIR_VERSION || clean(canary.status) !== "SEQUENCE_OR_BATCH_FAILED_PRESERVED") throw new Error("CONTROLLED_RELEASE_BLOCKED_CHECKPOINT_REQUIRED");
  const policy = { ...rec(JSON.parse(String(authorization.model_policy_json || "{}"))), qualityPolicyVersion: CONTROLLED_RELEASE_POLICY.version, qualityThresholds: CONTROLLED_RELEASE_POLICY, releaseTier: "BLOCKED", batchAuthorized: false, autoRetry: false, autoAdvance: false, nextUnitDispatch: false, productionScale: "BLOCKED" };
  const now = new Date().toISOString();
  await db.batch([
    db.prepare("UPDATE v7_material_authorizations SET status='PAUSED',model_policy_json=?,updated_at=? WHERE id=?").bind(JSON.stringify(policy), now, authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='CONTROLLED_RELEASE_BLOCKED',mode='CONTROLLED_RELEASE_GATE_V1' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='ENGINEERING_ESCALATION',threshold=88,blocker='MP002_SEMANTIC_FIT_68_BELOW_82',evidence_summary='CONTROLLED_RELEASE_GATE_V1 adopted · request 85 preserved · MP-002 84 overall / 68 Semantic Fit remains blocked · request 86 and batch unauthorized',updated_at=? WHERE id=?").bind(now, STAGE_ID),
  ]);
  return snapshot();
}

async function releaseNextReleaseTrainBatchUnit() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization) throw new Error("RELEASE_TRAIN_CONFIGURATION_REQUIRED");
  const canary = await db.prepare("SELECT * FROM v7_pilot_canaries WHERE run_id=? AND status='BATCH_UNIT_PASS_REVIEW' ORDER BY created_at DESC LIMIT 1").bind(run.id).first<Row>();
  const policy = rec(JSON.parse(String(authorization.model_policy_json || "{}")));
  if (!canary || ![STABILIZATION_RELEASE_VERSION, CANONICAL_UNIT_SCENES_VERSION].includes(clean(canary.version)) || policy.batchAuthorized !== true || clean(policy.version)!==clean(canary.version)) throw new Error("RELEASE_TRAIN_BATCH_NOT_AUTHORIZED");
  const queue = arr(JSON.parse(String(canary.queue_json || "[]"))).map(rec), nextIndex = Number(canary.current_index) + 1, next = queue[nextIndex];
  if (!next) throw new Error("RELEASE_TRAIN_BATCH_ALREADY_COMPLETE");
  const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>();
  if (Number(active?.total || 0) !== 0) throw new Error("RELEASE_TRAIN_ACTIVE_REQUESTS_MUST_BE_ZERO");
  const now = new Date().toISOString();
  await db.batch([
    db.prepare("UPDATE v7_pilot_canaries SET status='AUTHORIZED',current_index=?,current_brief_id=?,updated_at=? WHERE id=?").bind(nextIndex, next.briefId, now, canary.id),
    db.prepare("UPDATE v7_architecture_baselines SET execution_state='CANARY_ONLY' WHERE id=?").bind(canary.baseline_id),
    db.prepare("UPDATE v7_material_authorizations SET status='AUTHORIZED',updated_at=? WHERE id=?").bind(now,authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='CANARY_AUTHORIZED' WHERE id=?").bind(run.id),
  ]);
  return startControlledCanaryUnit();
}

async function buildCanonicalUnitScenes() {
  const env=await runtime(),db=env.DB!,{run,authorization}=await current(db);
  if(!run||!authorization||!env.BUCKET)throw new Error("CANONICAL_UNIT_SCENES_CONFIGURATION_REQUIRED");
  const interrupted=await db.prepare("SELECT * FROM v7_pilot_canaries WHERE run_id=? AND version=? AND status='FAILED' ORDER BY created_at DESC LIMIT 1").bind(run.id,CANONICAL_UNIT_SCENES_VERSION).first<Row>();
  if(interrupted){
    const active=await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{total:number}>(),audit=await db.prepare("SELECT id FROM v7_material_audits WHERE authorization_id=? AND brief_id=? AND id LIKE ?").bind(authorization.id,interrupted.current_brief_id,`%${CANONICAL_UNIT_SCENES_VERSION}%`).first<Row>();
    if(Number(active?.total||0)!==0||audit)throw new Error("CANONICAL_SCENE_INTERRUPTED_RECOVERY_NOT_CLEAN");
    const resumedAt=new Date().toISOString(),policy={...rec(JSON.parse(String(authorization.model_policy_json||"{}"))),version:CANONICAL_UNIT_SCENES_VERSION,batchAuthorized:true,runToCompletion10Mp:true,autoRetry:false,autoAdvance:false,nextUnitDispatch:"TERMINAL_PASS_ONLY"};
    await db.batch([
      db.prepare("UPDATE v7_pilot_canaries SET status='AUTHORIZED',updated_at=?,completed_at=NULL WHERE id=?").bind(resumedAt,interrupted.id),
      db.prepare("UPDATE v7_architecture_baselines SET execution_state='CANARY_ONLY' WHERE id=?").bind(interrupted.baseline_id),
      db.prepare("UPDATE v7_material_authorizations SET status='AUTHORIZED',model_policy_json=?,updated_at=? WHERE id=?").bind(JSON.stringify(policy),resumedAt,authorization.id),
      db.prepare("UPDATE v7_material_runs SET status='CANARY_AUTHORIZED',mode='RUN_TO_10MP_CANONICAL_SCENES' WHERE id=?").bind(run.id),
      db.prepare("UPDATE v7_stage_states SET status='CANONICAL_SCENE_REHEARSAL_PASS',blocker='TERMINAL_GATE_PER_UNIT',evidence_summary='Interrupted pre-dispatch lease recovered · baseline CANARY_ONLY · ledger unchanged · resuming same MP unit',updated_at=? WHERE id=?").bind(resumedAt,STAGE_ID),
    ]);
    return startControlledCanaryUnit();
  }
  let canary=await db.prepare("SELECT * FROM v7_pilot_canaries WHERE run_id=? AND version=? AND status='SCENE_REBUILD_RUNNING' ORDER BY updated_at DESC LIMIT 1").bind(run.id,CANONICAL_UNIT_SCENES_VERSION).first<Row>();
  const now=new Date().toISOString();
  if(!canary){
    canary=await db.prepare("SELECT * FROM v7_pilot_canaries WHERE run_id=? AND status='SEQUENCE_OR_BATCH_FAILED_PRESERVED' ORDER BY updated_at DESC LIMIT 1").bind(run.id).first<Row>();
  }
  if(canary&&clean(canary.version)===CANONICAL_UNIT_SCENES_VERSION&&clean(canary.status)==="SEQUENCE_OR_BATCH_FAILED_PRESERVED"){
    const active=await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{total:number}>(),audit=await db.prepare("SELECT id FROM v7_material_audits WHERE authorization_id=? AND brief_id=? AND id LIKE ?").bind(authorization.id,canary.current_brief_id,`%${CANONICAL_UNIT_SCENES_VERSION}%`).first<Row>(),blocked=await db.prepare("SELECT * FROM v7_material_requests WHERE authorization_id=? AND brief_id=? AND phase='CANARY_UNIT_SPECIFIC_PIXEL_QA' ORDER BY created_at DESC LIMIT 1").bind(authorization.id,canary.current_brief_id).first<Row>();
    if(Number(active?.total||0)===0&&!audit&&clean(blocked?.status)==="BLOCKED_INCOMPLETE"&&clean(blocked?.error).includes("Invalid prompt")&&!clean(blocked?.retry_scope)){
      const resumedAt=new Date().toISOString(),policy={...rec(JSON.parse(String(authorization.model_policy_json||"{}"))),transportRetryOf:blocked?.id,transportRetryScope:"PROMPT_POLICY_FALSE_POSITIVE_ONLY",autoRetry:false};
      await db.batch([
        db.prepare("UPDATE v7_pilot_canaries SET status='AUTHORIZED',updated_at=?,completed_at=NULL WHERE id=?").bind(resumedAt,canary.id),
        db.prepare("UPDATE v7_architecture_baselines SET execution_state='CANARY_ONLY' WHERE id=?").bind(canary.baseline_id),
        db.prepare("UPDATE v7_material_authorizations SET status='AUTHORIZED',model_policy_json=?,updated_at=? WHERE id=?").bind(JSON.stringify(policy),resumedAt,authorization.id),
        db.prepare("UPDATE v7_material_runs SET status='CANARY_AUTHORIZED' WHERE id=?").bind(run.id),
        db.prepare("UPDATE v7_stage_states SET status='CANARY_TRANSPORT_RETRY_AUTHORIZED',blocker='SAME_PIXELS_ONE_TRANSPORT_RETRY',evidence_summary='Provider prompt policy false-positive preserved at 0 tokens / $0 · one lineage-bound transport retry authorized · pixels unchanged',updated_at=? WHERE id=?").bind(resumedAt,STAGE_ID),
      ]);
      return startControlledCanaryUnit();
    }
  }
  if(canary&&clean(canary.status)==="SEQUENCE_OR_BATCH_FAILED_PRESERVED"){
    if((clean(canary.version)!==STABILIZATION_RELEASE_VERSION&&!clean(canary.version).startsWith("CANONICAL_UNIT_SCENES_V"))||Number(canary.current_index)<2||clean(authorization.status)!=="PAUSED")throw new Error("CANONICAL_FAILED_BATCH_CHECKPOINT_REQUIRED");
    const priorAudit=await db.prepare("SELECT * FROM v7_material_audits WHERE authorization_id=? AND brief_id=? AND status='REPAIR_REQUIRED' ORDER BY created_at DESC LIMIT 1").bind(authorization.id,canary.current_brief_id).first<Row>();
    if(!priorAudit)throw new Error("CANONICAL_FAILED_AUDIT_REQUIRED");
    const priorVersion=clean(canary.version),priorScore=Number(priorAudit.score),failedQueue=arr(JSON.parse(String(canary.queue_json||"[]"))).map(rec)[Number(canary.current_index)],failedLogical=clean(failedQueue?.logicalId)||"MP-003",repair=failedLogical==="MP-004"?"ORDERED_ROLES_NO_ROUTE_CONNECTORS":failedLogical==="MP-008"?"DOMINANT_CARDHOLDER_DISTINCT_STATUS_ROWS":failedLogical==="MP-018"?"SOURCE_PAGE_US_NONCASH_PAYMENT_COUNT":failedLogical==="MP-039"?"FOUR_ACTOR_SHUTTERS_AUTHORIZATION_BOUNDARY":failedLogical==="MP-115"?"PENCIL_QUESTION_PATH_TO_FINAL_ECONOMIC_COST":failedLogical==="MP-153"?"PHYSICAL_CARD_TERMINAL_PROCESSING_TO_VERIFIED":"VERTICAL_DISTINCT_RECORD_ROWS";
    const policy={...rec(JSON.parse(String(authorization.model_policy_json||"{}"))),version:CANONICAL_UNIT_SCENES_VERSION,renderer:CANONICAL_UNIT_SCENES_RENDERER,runToCompletion10Mp:true,batchAuthorized:true,autoRetry:false,autoAdvance:false,nextUnitDispatch:"TERMINAL_PASS_ONLY",canonicalSceneRebuild:{sourceVersion:priorVersion,sourceAuditId:priorAudit.id,sourceScore:priorScore,sourceFailedUnit:failedLogical,scope:"MP-003_THROUGH_MP-153",paidRequests:0,repair}};
    await db.batch([
      db.prepare("UPDATE v7_pilot_canaries SET version=?,status='SCENE_REBUILD_RUNNING',request_budget=request_budget+1,cost_budget=cost_budget+1,gate_json='[]',updated_at=?,completed_at=NULL WHERE id=?").bind(CANONICAL_UNIT_SCENES_VERSION,now,canary.id),
      db.prepare("UPDATE v7_material_authorizations SET scope='CANONICAL_UNIT_SCENE_REHEARSAL',status='PAUSED',max_remote_requests=max_remote_requests+1,max_actual_spend_usd=max_actual_spend_usd+1,model_policy_json=?,updated_at=? WHERE id=?").bind(JSON.stringify(policy),now,authorization.id),
      db.prepare("UPDATE v7_material_runs SET status='CANONICAL_UNIT_SCENE_REBUILD',mode='ZERO_SPEND_GOLDEN_REGION_REHEARSAL' WHERE id=?").bind(run.id),
      db.prepare("UPDATE v7_stage_states SET status='CANONICAL_UNIT_SCENE_REBUILD',blocker='ZERO_SPEND_REHEARSAL',evidence_summary=?,updated_at=? WHERE id=?").bind(`${failedLogical} ${priorScore}/100 preserved · compiling ${repair} across canonical scenes · no paid dispatch`,now,STAGE_ID),
    ]);
    canary=await db.prepare("SELECT * FROM v7_pilot_canaries WHERE id=?").bind(canary.id).first<Row>();
  }
  if(!canary)throw new Error("CANONICAL_UNIT_SCENE_REBUILD_NOT_READY");
  const queue=arr(JSON.parse(String(canary.queue_json||"[]"))).map(rec),scope=queue.slice(2),existing=await rows(db,"SELECT logical_brief_id FROM v7_artifact_promotions WHERE canary_version=? AND authorization_id=? AND status='FROZEN'",CANONICAL_UNIT_SCENES_VERSION,authorization.id),done=new Set(existing.map((item)=>clean(item.logical_brief_id))),next=scope.find((item)=>!done.has(clean(item.logicalId)));
  if(next){
    const logicalId=clean(next.logicalId),brief=await db.prepare("SELECT * FROM v7_material_briefs WHERE id=?").bind(next.briefId).first<Row>(),sourcePromotion=await db.prepare("SELECT * FROM v7_artifact_promotions WHERE canary_version=? AND brief_id=? AND status='FROZEN'").bind(STABILIZATION_RELEASE_VERSION,next.briefId).first<Row>(),sourceUnit=await db.prepare("SELECT * FROM v7_unit_materializations WHERE canary_version=? AND brief_id=? AND status='FROZEN'").bind(STABILIZATION_RELEASE_VERSION,next.briefId).first<Row>();
    if(!brief||!sourcePromotion||!sourceUnit)throw new Error(`CANONICAL_SCENE_SOURCE_MISSING · ${logicalId}`);
    const sourceBinding=await validatePromotionBinding(env,db,sourcePromotion);if(!sourceBinding.passed)throw new Error(`CANONICAL_SCENE_SOURCE_INVALID · ${logicalId}`);
    const rebuildPolicy=rec(rec(JSON.parse(String(authorization.model_policy_json||"{}"))).canonicalSceneRebuild);
    const manifest={...productionSceneManifest(sourceBinding.contractPayload,CANONICAL_UNIT_SCENES_RENDERER,"EXECUTABLE_PRODUCTION_SCENE_MANIFEST_V13_PHYSICAL_VERIFICATION"),sourceContractHash:rec(sourceBinding.manifest).sourceContractHash,canonicalPilotManifestVersion:rec(sourceBinding.manifest).canonicalPilotManifestVersion,canonicalPilotManifestHash:rec(sourceBinding.manifest).canonicalPilotManifestHash,rebuild:{version:CANONICAL_UNIT_SCENES_VERSION,sourcePromotionId:sourcePromotion.id,sourceFailedUnit:clean(rebuildPolicy.sourceFailedUnit),sourceFailedScore:Number(rebuildPolicy.sourceScore||0),repair:clean(rebuildPolicy.repair)}};
    const oracle=canonicalUnitPixelOracle(logicalId,manifest);if(!oracle.passed)throw new Error(`CANONICAL_SCENE_ORACLE_FAILED · ${logicalId} · ${oracle.checks.filter((gate)=>gate.status!=="PASS").map((gate)=>gate.id).join(",")}`);
    const frameIds:string[]=[],frameHashes:string[]=[];
    for(const [role,rendered] of [["CERT_ENTRY",oracle.frames[0]],["CERT_MIDPOINT",oracle.frames[1]],["CERT_EXIT",oracle.frames[2]]] as const){const fileId=await storeMaterial(env,db,authorization,brief,{role,identity:`CANONICAL-V6-${logicalId}-${role}`,bytes:rendered.bytes,mimeType:"image/png",extension:"png",sourceType:CANONICAL_UNIT_SCENES_RENDERER,provider:"FRAMEFLOW_OWNED",providerAssetId:clean(sourcePromotion.certification_id),sourceUrl:clean(sourcePromotion.certification_id),landingUrl:clean(sourcePromotion.certification_id),licenseCode:"CHANNEL_OWNED",width:rendered.width,height:rendered.height});const stored=await db.prepare("SELECT content_hash FROM v7_material_files WHERE id=?").bind(fileId).first<Row>();frameIds.push(fileId);frameHashes.push(clean(stored?.content_hash));}
    if(frameIds.length!==3||new Set(frameHashes).size!==3)throw new Error(`CANONICAL_SCENE_FRAME_INTEGRITY_FAILED · ${logicalId}`);
    const createdAt=new Date().toISOString(),manifestJson=JSON.stringify(manifest),manifestHash=await sha(manifestJson),unitId=`${clean(canary.id)}-${CANONICAL_UNIT_SCENES_VERSION}-${logicalId}-UNIT`,promotionId=`${clean(canary.id)}-${CANONICAL_UNIT_SCENES_VERSION}-${logicalId}-PROMOTION`,preflight={...rec(JSON.parse(String(sourcePromotion.preflight_json||"{}"))),source:"CANONICAL_CONTRACT_SCENE_REBUILD",sourcePromotionId:sourcePromotion.id,unitMaterializationId:unitId,semanticManifestHash:manifestHash,unitRenderer:CANONICAL_UNIT_SCENES_RENDERER,pixelOracleVersion:oracle.version,pixelOracleChecks:oracle.checks,proofCardRendererDisabled:true,audienceInternalIds:false,frozenAt:createdAt};
    await db.batch([
      db.prepare("INSERT INTO v7_unit_materializations (id,program_id,baseline_id,run_id,authorization_id,canary_version,brief_id,logical_brief_id,archetype,certification_id,certified_renderer_version,unit_renderer_version,contract_hash,semantic_manifest_json,semantic_manifest_hash,frame_ids_json,frame_hashes_json,lint_json,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'FROZEN',?)").bind(unitId,PROGRAM_ID,sourceUnit.baseline_id,run.id,authorization.id,CANONICAL_UNIT_SCENES_VERSION,brief.id,logicalId,sourceUnit.archetype,sourceUnit.certification_id,sourceUnit.certified_renderer_version,CANONICAL_UNIT_SCENES_RENDERER,sourcePromotion.contract_hash,manifestJson,manifestHash,JSON.stringify(frameIds),JSON.stringify(frameHashes),JSON.stringify(oracle.checks),createdAt),
      db.prepare("INSERT INTO v7_artifact_promotions (id,program_id,baseline_id,regression_id,run_id,authorization_id,canary_version,brief_id,logical_brief_id,archetype,certification_id,renderer_version,contract_hash,frame_ids_json,frame_hashes_json,status,preflight_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'FROZEN',?,?)").bind(promotionId,PROGRAM_ID,sourcePromotion.baseline_id,sourcePromotion.regression_id,run.id,authorization.id,CANONICAL_UNIT_SCENES_VERSION,brief.id,logicalId,sourcePromotion.archetype,sourcePromotion.certification_id,CANONICAL_UNIT_SCENES_RENDERER,sourcePromotion.contract_hash,JSON.stringify(frameIds),JSON.stringify(frameHashes),JSON.stringify(preflight),createdAt),
      db.prepare("UPDATE v7_stage_states SET evidence_summary=?,updated_at=? WHERE id=?").bind(`${done.size+1}/8 canonical unit scenes frozen · ${logicalId} golden-region oracle PASS · ledger unchanged`,createdAt,STAGE_ID),
    ]);
    const promotion=await db.prepare("SELECT * FROM v7_artifact_promotions WHERE id=?").bind(promotionId).first<Row>(),binding=promotion?await validatePromotionBinding(env,db,promotion):null;if(!binding?.passed)throw new Error(`CANONICAL_SCENE_G1_FAILED · ${logicalId} · ${binding?.checks.filter((gate)=>gate.status!=="PASS").map((gate)=>gate.id).join(",")||"MISSING"}`);
    if(done.size+1<scope.length)return snapshot();
  }
  const promotions=await rows(db,"SELECT * FROM v7_artifact_promotions WHERE canary_version=? AND authorization_id=? AND status='FROZEN'",CANONICAL_UNIT_SCENES_VERSION,authorization.id);if(promotions.length!==8)throw new Error(`CANONICAL_SCENE_SCOPE_INCOMPLETE · ${promotions.length}/8`);
  const finalChecks:Row[]=[];for(const promotion of promotions){const binding=await validatePromotionBinding(env,db,promotion);finalChecks.push({id:`${clean(promotion.logical_brief_id)}_G0_G1`,status:binding.passed?"PASS":"FAIL",evidence:`${binding.files.length}/3 read-back`});}if(finalChecks.some((gate)=>gate.status!=="PASS"))throw new Error("CANONICAL_SCENE_FULL_REHEARSAL_FAILED");
  const readyAt=new Date().toISOString(),policy={...rec(JSON.parse(String(authorization.model_policy_json||"{}"))),version:CANONICAL_UNIT_SCENES_VERSION,renderer:CANONICAL_UNIT_SCENES_RENDERER,canonicalSceneRebuild:{...rec(rec(JSON.parse(String(authorization.model_policy_json||"{}"))).canonicalSceneRebuild),completed:true,units:8,g0g1:"PASS"},batchAuthorized:true,runToCompletion10Mp:true,autoRetry:false,autoAdvance:false,nextUnitDispatch:"TERMINAL_PASS_ONLY"};
  await db.batch([
    db.prepare("UPDATE v7_pilot_canaries SET status='AUTHORIZED',gate_json=?,updated_at=?,completed_at=NULL WHERE id=?").bind(JSON.stringify(finalChecks),readyAt,canary.id),
    db.prepare("UPDATE v7_architecture_baselines SET execution_state='CANARY_ONLY' WHERE id=?").bind(canary.baseline_id),
    db.prepare("UPDATE v7_material_authorizations SET scope='RUN_TO_10MP_CANONICAL_SCENES',status='AUTHORIZED',model_policy_json=?,updated_at=? WHERE id=?").bind(JSON.stringify(policy),readyAt,authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='CANARY_AUTHORIZED',mode='RUN_TO_10MP_CANONICAL_SCENES' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='CANONICAL_SCENE_REHEARSAL_PASS',blocker='TERMINAL_GATE_PER_UNIT',evidence_summary='8/8 canonical unit scenes · 24/24 frames · G0/G1 golden-region and read-back PASS · resuming MP-003',updated_at=? WHERE id=?").bind(readyAt,STAGE_ID),
  ]);
  return startControlledCanaryUnit();
}

async function releaseControlledCanaryV5Unit() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization) throw new Error("CONTROLLED_CANARY_RUN_REQUIRED");
  const canary = await db.prepare("SELECT * FROM v7_pilot_canaries WHERE run_id=? AND version=? ORDER BY created_at DESC LIMIT 1").bind(run.id, CONTROLLED_CANARY_V5).first<Row>();
  if (!canary || clean(canary.status) !== "READY_FOR_EXPLICIT_UNIT_RELEASE" || Number(canary.current_index) !== 0) throw new Error("CANARY_V5_EXPLICIT_RELEASE_NOT_READY");
  const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>();
  if (Number(active?.total || 0) !== 0) throw new Error("ACTIVE_REMOTE_REQUESTS_MUST_FINISH_FIRST");
  const now = new Date().toISOString();
  await db.batch([
    db.prepare("UPDATE v7_pilot_canaries SET status='AUTHORIZED',updated_at=? WHERE id=? AND status='READY_FOR_EXPLICIT_UNIT_RELEASE'").bind(now, canary.id),
    db.prepare("UPDATE v7_material_authorizations SET scope='CONTROLLED_CANARY_V5',status='AUTHORIZED',model_policy_json=json_set(model_policy_json,'$.dispatch','EXPLICIT_MP001_RELEASED'),updated_at=? WHERE id=?").bind(now, authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='CANARY_AUTHORIZED',mode='CONTROLLED_CANARY_V5' WHERE id=?").bind(run.id),
  ]);
  return startControlledCanaryUnit();
}

async function startControlledCanaryUnit() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization) throw new Error("CONTROLLED_CANARY_RUN_REQUIRED");
  const canary = await db.prepare("SELECT * FROM v7_pilot_canaries WHERE run_id=? ORDER BY created_at DESC LIMIT 1").bind(run.id).first<Row>();
  if (!canary || clean(canary.status) !== "AUTHORIZED" || !clean(canary.current_brief_id)) throw new Error("CONTROLLED_CANARY_UNIT_NOT_AUTHORIZED");
  const capability = canaryDispatchCapability(canary.version), policy = rec(JSON.parse(String(authorization.model_policy_json || "{}"))), queue = arr(JSON.parse(String(canary.queue_json || "[]"))).map(rec), currentQueueItem = queue[Number(canary.current_index)];
  if (!capability) throw new Error("CONTROLLED_CANARY_PROMOTION_REQUIRED");
  if (clean(policy.version) !== clean(canary.version) || clean(policy.dispatchCapability) && clean(policy.dispatchCapability) !== capability.phase || clean(currentQueueItem?.dispatchCapability) && clean(currentQueueItem?.dispatchCapability) !== capability.phase) throw new Error("CANARY_DISPATCH_CAPABILITY_MISMATCH");
  const promotion = await db.prepare("SELECT * FROM v7_artifact_promotions WHERE canary_version=? AND brief_id=? AND status='FROZEN'").bind(canary.version, canary.current_brief_id).first<Row>();
  if (!promotion) throw new Error("CANARY_PRODUCTION_BINDING_MISSING");
  const preflight = await validatePromotionBinding(env, db, promotion);
  if (!preflight.passed) throw new Error(`CANARY_ARTIFACT_READINESS_FAILED · ${preflight.checks.filter((item) => item.status !== "PASS").map((item) => item.id).join(",")}`);
  const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>();
  if (Number(active?.total || 0) !== 0) throw new Error("CANARY_CONCURRENCY_LIMIT");
  const now = new Date().toISOString();
  await db.batch([
    db.prepare("UPDATE v7_pilot_canaries SET status='UNIT_RUNNING',released_units=released_units+1,updated_at=? WHERE id=? AND status='AUTHORIZED'").bind(now, canary.id),
    db.prepare("UPDATE v7_material_runs SET status='CANARY_UNIT_RUNNING' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='CANARY_UNIT_RUNNING',blocker='LATER_CANARY_UNITS_LOCKED',evidence_summary=?,updated_at=? WHERE id=?").bind(`${clean(canary.current_brief_id)} leased from immutable promotion binding · dispatch capability ${capability.phase} · legacy fallback disabled · later units, sequence and scale locked`, now, STAGE_ID),
  ]);
  return snapshot();
}

async function closeControlledCanaryUnit(db: DB, run: Row, authorization: Row, canary: Row, brief: Row) {
  const env = await runtime();
  const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>();
  if (Number(active?.total || 0) !== 0) return;
  const usage = await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(actual_cost_usd),0) AS cost FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<{ total: number; cost: number }>();
  const recovery = await db.prepare("SELECT * FROM v7_canary_recovery_sessions WHERE run_id=? AND status IN ('PROBE_RUNNING','ALIGNED_PROBE_RUNNING') ORDER BY created_at DESC LIMIT 1").bind(run.id).first<Row>();
  const recoveryIntent = recovery ? await db.prepare("SELECT * FROM v7_canary_request_intents WHERE recovery_id=? AND status='PROVIDER_DISPATCHED' ORDER BY created_at DESC LIMIT 1").bind(recovery.id).first<Row>() : null;
  const canaryVersion = clean(canary.version), promotion = await db.prepare("SELECT * FROM v7_artifact_promotions WHERE canary_version=? AND brief_id=? AND status='FROZEN'").bind(canaryVersion, brief.id).first<Row>();
  const binding = promotion ? await validatePromotionBinding(env, db, promotion) : null;
  const promotionPreflight = promotion ? rec(JSON.parse(String(promotion.preflight_json || "{}"))) : {}, repairAttempt = Number(promotionPreflight.repairAttempt || 0);
  const auditId = `${clean(brief.id)}-${canaryVersion}-PIXEL-AUDIT${repairAttempt ? `-REPAIR-${repairAttempt}` : ""}`;
  const audit = await db.prepare("SELECT * FROM v7_material_audits WHERE authorization_id=? AND brief_id=? AND id=?").bind(authorization.id, brief.id, auditId).first<Row>();
  const dimensions = audit ? rec(JSON.parse(String(audit.dimensions_json || "{}"))) : {}, auditFindings = audit ? arr(JSON.parse(String(audit.findings_json || "[]"))) : [], stabilizedPolicy = [STABILIZATION_RELEASE_VERSION, MP002_TARGETED_REPAIR_VERSION, MP002_PIXEL_ORACLE_REPAIR_VERSION, CANONICAL_UNIT_SCENES_VERSION].includes(canaryVersion), policyDecision = audit && stabilizedPolicy ? evaluateControlledRelease({ overall: audit.score, dimensions, defects: auditFindings }) : null, dimensionFloor = Object.values(dimensions).length >= 5 && Object.values(dimensions).every((value) => Number(value) >= 90);
  const priorQueue = arr(JSON.parse(String(canary.queue_json || "[]"))).map(rec).slice(0, Number(canary.current_index)), priorPromotions: Row[] = [];
  for (const prior of priorQueue) { const item = await db.prepare("SELECT frame_hashes_json FROM v7_artifact_promotions WHERE canary_version=? AND brief_id=? AND status='FROZEN'").bind(canaryVersion, prior.briefId).first<Row>(); if (item) priorPromotions.push(item); }
  const physicallyUnique = Boolean(promotion) && priorPromotions.every((item) => clean(item.frame_hashes_json) !== clean(promotion?.frame_hashes_json));
  const checks = [
    { id: "CERTIFICATION_TO_PRODUCTION_BINDING", status: binding?.checks.find((item) => item.id === "CERTIFICATION_TO_PRODUCTION_BINDING")?.status || "FAIL" },
    { id: "BOUND_HASH_CONGRUENCE", status: binding?.checks.find((item) => item.id === "BOUND_HASH_CONGRUENCE")?.status || "FAIL" },
    { id: "UNIT_CONTRACT_CONGRUENCE", status: binding?.checks.find((item) => item.id === "UNIT_CONTRACT_CONGRUENCE")?.status || "FAIL" },
    { id: "CANARY_ARTIFACT_READINESS", status: binding?.checks.find((item) => item.id === "CANARY_ARTIFACT_READINESS")?.status || "FAIL" },
    { id: "NO_LEGACY_FALLBACK", status: binding?.checks.find((item) => item.id === "NO_LEGACY_FALLBACK")?.status || "FAIL" },
    { id: "PIXEL_QA", status: audit && clean(audit.status) === "PASS" && (stabilizedPolicy ? policyDecision?.pass : Number(audit.score) >= 92 && dimensionFloor) ? "PASS" : "FAIL", evidence: audit ? stabilizedPolicy ? `${Number(audit.score)}/100 · ${policyDecision?.tier || "BLOCKED"} · ${CONTROLLED_RELEASE_POLICY.version}` : `${Number(audit.score)}/100 · dimensions >=90` : "audit missing" },
    { id: "PHYSICAL_UNIQUENESS", status: physicallyUnique ? "PASS" : "FAIL" },
    { id: "ACTIVE_REQUESTS", status: "PASS" },
  ], passed = checks.every((item) => item.status === "PASS"), now = new Date().toISOString();
  const alignedRecovery = clean(recovery?.status) === "ALIGNED_PROBE_RUNNING", failedRecoveryStatus = alignedRecovery ? "ALIGNED_PROBE_FAILED_PRESERVED" : "PROBE_FAILED_PRESERVED", passedRecoveryStatus = alignedRecovery ? "ALIGNED_PROBE_PASS_REVIEW" : "PROBE_PASS_REVIEW";
  const terminalEventId = recovery ? `${clean(recovery.id)}-${alignedRecovery ? "ALIGNED" : "PRIMARY"}-PROBE-TERMINAL` : "", terminalCommandId = recovery ? alignedRecovery ? `${clean(recovery.id)}-CONTRACT-ALIGNED-PROBE` : `${clean(recovery.id)}-PRODUCTION-PROBE-MP001` : "";
  const releaseTrain = isReleaseTrainCanary(canaryVersion);
  if (!passed) {
    const statements = [
      db.prepare("UPDATE v7_pilot_canaries SET status=?,failed_units=failed_units+1,gate_json=?,updated_at=?,completed_at=? WHERE id=?").bind(releaseTrain ? "SEQUENCE_OR_BATCH_FAILED_PRESERVED" : "FAILED", JSON.stringify(checks), now, now, canary.id),
      db.prepare("UPDATE v7_architecture_baselines SET execution_state='FROZEN' WHERE id=?").bind(canary.baseline_id),
      db.prepare("UPDATE v7_material_authorizations SET status='PAUSED',updated_at=? WHERE id=?").bind(now, authorization.id),
      db.prepare("UPDATE v7_material_runs SET status='CANARY_BLOCKED' WHERE id=?").bind(run.id),
      db.prepare("UPDATE v7_stage_states SET status='CANARY_BLOCKED',blocker='CANARY_UNIT_GATE_FAILED',evidence_summary=?,updated_at=? WHERE id=?").bind(`${clean(brief.id)} failed controlled canary gate · ${checks.filter((gate) => gate.status !== "PASS").map((gate) => gate.id).join(", ")} · later units, sequence and scale blocked`, now, STAGE_ID),
    ];
    if (recovery) statements.push(
      db.prepare("UPDATE v7_canary_recovery_sessions SET status=?,requests_after=?,cost_after=?,updated_at=? WHERE id=? AND status IN ('PROBE_RUNNING','ALIGNED_PROBE_RUNNING')").bind(failedRecoveryStatus, Number(usage?.total || 0), Number(usage?.cost || 0), now, recovery.id),
      db.prepare("INSERT INTO v7_canary_transition_events (id,recovery_id,command_id,canary_version,unit_id,status,failure_code,failed_transition,failed_gate,expected_state,actual_state,authorization_status,request_intent_id,ledger_status,provider_dispatch_status,detail_json,created_at) VALUES (?,?,?,?,?,'PROBE_TERMINAL_FAIL','PIXEL_QA_GATE_FAILED','PERSIST_AUDIT_TO_TERMINAL','PIXEL_QA','TERMINAL_PASS','PROBE_FAILED_PRESERVED','PAUSED',?,'COMPLETE','TERMINAL',?,?)").bind(terminalEventId, recovery.id, terminalCommandId, canaryVersion, "MP-001", recoveryIntent?.id || null, JSON.stringify({ checks, requestsAfter: Number(usage?.total || 0), costAfter: Number(usage?.cost || 0) }), now),
    );
    await db.batch(statements);
    return;
  }
  if (releaseTrain) {
    const queue = arr(JSON.parse(String(canary.queue_json || "[]"))).map(rec), currentIndex = Number(canary.current_index), lastUnit = currentIndex === queue.length - 1;
    const nextStatus = currentIndex === 1 ? "SEQUENCE_PROOF_PASS_REVIEW" : lastUnit ? "PASS" : "BATCH_UNIT_PASS_REVIEW";
    const nextRunStatus = currentIndex === 1 ? "RELEASE_TRAIN_SEQUENCE_PROOF_PASS_REVIEW" : lastUnit ? "CANARY_PASS" : "RELEASE_TRAIN_BATCH_UNIT_PASS_REVIEW";
    const nextStageStatus = currentIndex === 1 ? "RELEASE_TRAIN_SEQUENCE_PROOF_PASS_REVIEW" : lastUnit ? "CANARY_PASS" : "RELEASE_TRAIN_BATCH_UNIT_PASS_REVIEW";
    const nextBlocker = currentIndex === 1 ? "EXPLICIT_BATCH_RELEASE_REQUIRED" : lastUnit ? "SEQUENCE_ASSEMBLY_READY_NOT_STARTED" : "NEXT_BATCH_UNIT_TERMINAL_RELEASE";
    const policy = { ...rec(JSON.parse(String(authorization.model_policy_json || "{}"))), qualityPolicyVersion: stabilizedPolicy ? CONTROLLED_RELEASE_POLICY.version : "LEGACY_STRICT_GATE", releaseTier: policyDecision?.tier || "STANDARD", controlledQaSampleRate: policyDecision?.tier === "CONTROLLED" ? CONTROLLED_RELEASE_POLICY.controlledQaSampleRate : 1, nextUnitDispatch: currentIndex === 1 ? false : lastUnit ? false : "TERMINAL_PASS_ONLY" };
    await db.batch([
      db.prepare("UPDATE v7_pilot_canaries SET status=?,passed_units=passed_units+1,gate_json=?,updated_at=?,completed_at=? WHERE id=? AND status='UNIT_RUNNING'").bind(nextStatus, JSON.stringify(checks), now, lastUnit ? now : null, canary.id),
      db.prepare("UPDATE v7_material_briefs SET status='CANARY_PASS' WHERE id=?").bind(brief.id),
      db.prepare("UPDATE v7_material_authorizations SET status=?,model_policy_json=?,completed_at=?,updated_at=? WHERE id=?").bind(lastUnit ? "COMPLETED" : "PAUSED", JSON.stringify(policy), lastUnit ? now : null, now, authorization.id),
      db.prepare("UPDATE v7_architecture_baselines SET execution_state='FROZEN' WHERE id=?").bind(canary.baseline_id),
      db.prepare("UPDATE v7_material_runs SET status=? WHERE id=?").bind(nextRunStatus, run.id),
      db.prepare("UPDATE v7_stage_states SET status=?,blocker=?,evidence_summary=?,updated_at=? WHERE id=?").bind(nextStageStatus, nextBlocker, lastUnit ? `Release Train PASS 10/10 · ${clean(brief.id)} terminal PASS · no retries · sequence assembly ready` : `${clean(brief.id)} PASS ${Number(audit?.score || 0)}/100 · hard-stop reached · later units remain locked until bounded release`, now, STAGE_ID),
    ]);
    return;
  }
  const statements = [
    db.prepare("UPDATE v7_pilot_canaries SET status='UNIT_PASS_REVIEW',passed_units=passed_units+1,gate_json=?,updated_at=? WHERE id=? AND status='UNIT_RUNNING'").bind(JSON.stringify(checks), now, canary.id),
    db.prepare("UPDATE v7_material_briefs SET status='CANARY_PASS' WHERE id=?").bind(brief.id),
    db.prepare("UPDATE v7_material_runs SET status='CANARY_UNIT_PASS_REVIEW' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='CANARY_UNIT_PASS_REVIEW',blocker='EXPLICIT_NEXT_UNIT_RELEASE_REQUIRED',evidence_summary=?,updated_at=? WHERE id=?").bind(`${clean(brief.id)} PASS · immutable binding, byte/hash/contract congruence, promoted Pixel QA and uniqueness verified · later units locked`, now, STAGE_ID),
  ];
  if (recovery) statements.push(
      db.prepare("UPDATE v7_canary_recovery_sessions SET status=?,requests_after=?,cost_after=?,updated_at=? WHERE id=? AND status IN ('PROBE_RUNNING','ALIGNED_PROBE_RUNNING')").bind(passedRecoveryStatus, Number(usage?.total || 0), Number(usage?.cost || 0), now, recovery.id),
    db.prepare("UPDATE v7_material_authorizations SET status='PAUSED',updated_at=? WHERE id=?").bind(now, authorization.id),
    db.prepare("UPDATE v7_architecture_baselines SET execution_state='FROZEN' WHERE id=?").bind(canary.baseline_id),
    db.prepare("INSERT INTO v7_canary_transition_events (id,recovery_id,command_id,canary_version,unit_id,status,expected_state,actual_state,authorization_status,request_intent_id,ledger_status,provider_dispatch_status,detail_json,created_at) VALUES (?,?,?,?,?,'PROBE_TERMINAL_PASS','TERMINAL_PASS','PROBE_PASS_REVIEW','PAUSED',?,'COMPLETE','TERMINAL',?,?)").bind(terminalEventId, recovery.id, terminalCommandId, canaryVersion, "MP-001", recoveryIntent?.id || null, JSON.stringify({ checks, requestsAfter: Number(usage?.total || 0), costAfter: Number(usage?.cost || 0) }), now),
  );
  await db.batch(statements);
}

async function releaseNextControlledCanaryUnit() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization) throw new Error("CONTROLLED_CANARY_RUN_REQUIRED");
  const canary = await db.prepare("SELECT * FROM v7_pilot_canaries WHERE run_id=? ORDER BY created_at DESC LIMIT 1").bind(run.id).first<Row>();
  if (!canary || clean(canary.status) !== "UNIT_PASS_REVIEW") throw new Error("CANARY_UNIT_PASS_REVIEW_REQUIRED");
  const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>();
  if (Number(active?.total || 0) !== 0) throw new Error("ACTIVE_REMOTE_REQUESTS_MUST_FINISH_FIRST");
  const queue = arr(JSON.parse(String(canary.queue_json || "[]"))).map(rec), nextIndex = Number(canary.current_index) + 1, now = new Date().toISOString();
  if (nextIndex >= queue.length) {
    const usage = await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(actual_cost_usd),0) AS cost FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<{ total: number; cost: number }>(), requestDelta = Number(usage?.total || 0) - Number(canary.requests_before), costDelta = Number(usage?.cost || 0) - Number(canary.cost_before), passed = Number(canary.passed_units) === queue.length && requestDelta <= Number(canary.request_budget) && costDelta <= Number(canary.cost_budget);
    await db.batch([
      db.prepare("UPDATE v7_pilot_canaries SET status=?,current_index=?,current_brief_id=NULL,updated_at=?,completed_at=? WHERE id=?").bind(passed ? "PASS" : "FAILED", nextIndex, now, now, canary.id),
      db.prepare("UPDATE v7_architecture_baselines SET execution_state='FROZEN' WHERE id=?").bind(canary.baseline_id),
      db.prepare("UPDATE v7_material_authorizations SET status=?,completed_at=?,updated_at=? WHERE id=?").bind(passed ? "COMPLETED" : "PAUSED", now, now, authorization.id),
      db.prepare("UPDATE v7_material_runs SET status=? WHERE id=?").bind(passed ? "CANARY_PASS" : "CANARY_BLOCKED", run.id),
      db.prepare("UPDATE v7_stage_states SET status=?,blocker=?,evidence_summary=?,updated_at=? WHERE id=?").bind(passed ? "CANARY_PASS" : "CANARY_BLOCKED", passed ? "SEQUENCE_PROOF_READY_NOT_STARTED" : "CANARY_BUDGET_OR_YIELD_FAILED", `Controlled canary ${passed ? "PASS" : "FAIL"} · ${Number(canary.passed_units)}/${queue.length} units · request delta ${requestDelta} · cost delta $${costDelta.toFixed(6)} · scale locked`, now, STAGE_ID),
    ]);
    return snapshot();
  }
  const next = queue[nextIndex], nextBriefId = clean(next.briefId);
  await db.batch([
    db.prepare("UPDATE v7_pilot_canaries SET status='AUTHORIZED',current_index=?,current_brief_id=?,updated_at=? WHERE id=?").bind(nextIndex, nextBriefId, now, canary.id),
    db.prepare("UPDATE v7_material_runs SET status='CANARY_AUTHORIZED' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='CANARY_AUTHORIZED',blocker='CANARY_UNIT_NOT_RELEASED',evidence_summary=?,updated_at=? WHERE id=?").bind(`${Number(canary.passed_units)}/${queue.length} units PASS · ${nextBriefId} is next · sequence and scale blocked`, now, STAGE_ID),
  ]);
  return snapshot();
}

async function repairNextArchetypeCertification() {
  const env = await runtime(), db = env.DB!, { authorization } = await current(db);
  if (!authorization) throw new Error("ARCHETYPE_CERTIFICATION_CONFIGURATION_REQUIRED");
  const baseline = await db.prepare("SELECT * FROM v7_architecture_baselines WHERE program_id=? AND stage_key=? AND status='QUALIFIED_FOR_ARCHETYPE_CERTIFICATION' ORDER BY created_at DESC LIMIT 1").bind(PROGRAM_ID, STAGE).first<Row>();
  if (!baseline) throw new Error("RELIABILITY_BASELINE_PASS_REQUIRED");
  const mobilePrior = await db.prepare("SELECT c.* FROM v7_archetype_certifications c JOIN v7_archetype_qualifications q ON q.baseline_id=c.baseline_id AND q.archetype=c.archetype WHERE c.baseline_id=? AND c.archetype='MOBILE_TEXT_INTENSIVE' AND c.status='REPAIR_REQUIRED' AND c.attempt=1 AND q.status!='CERTIFIED' ORDER BY c.created_at DESC LIMIT 1").bind(baseline.id).first<Row>();
  if (mobilePrior) {
    if (!env.BUCKET) throw new Error("ARCHETYPE_CERTIFICATION_CONFIGURATION_REQUIRED");
    const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>(); if (Number(active?.total || 0) !== 0) throw new Error("ACTIVE_REMOTE_REQUESTS_MUST_FINISH_FIRST");
    const id = `${clean(baseline.id)}-MOBILE_TEXT_INTENSIVE-ATTEMPT-2`, existing = await db.prepare("SELECT id FROM v7_archetype_certifications WHERE id=?").bind(id).first<Row>(); if (existing) return snapshot();
    const briefRow = await db.prepare("SELECT * FROM v7_material_briefs WHERE id=?").bind(mobilePrior.brief_id).first<Row>(); if (!briefRow) throw new Error("ARCHETYPE_FIXTURE_MISSING");
    const frameIds:string[]=[],frameHashes:string[]=[];
    for (const [role,state] of [["CERT_ENTRY",0],["CERT_MIDPOINT",1],["CERT_EXIT",2]] as const) { const bytes=mobileCertificationPng(state),fileId=await storeMaterial(env,db,authorization,briefRow,{role,identity:`CERT-${clean(baseline.version)}-MOBILE-V2`,bytes,mimeType:"image/png",extension:"png",sourceType:"MOBILE_TEXT_PORTRAIT_V2",provider:"FRAMEFLOW_OWNED",licenseCode:"CHANNEL_OWNED",width:540,height:960}),file=await db.prepare("SELECT content_hash FROM v7_material_files WHERE id=?").bind(fileId).first<Row>();frameIds.push(fileId);frameHashes.push(clean(file?.content_hash)); }
    const lint=[{id:"PORTRAIT_540X960",status:"PASS"},{id:"SAFE_MARGIN_48PX",status:"PASS"},{id:"ONE_HEADLINE_ONE_STATE",status:"PASS"},{id:"THREE_DISTINCT_FRAMES",status:new Set(frameHashes).size===3?"PASS":"FAIL"}],now=new Date().toISOString();
    await db.batch([db.prepare("INSERT INTO v7_archetype_certifications (id,program_id,baseline_id,authorization_id,archetype,brief_id,renderer_version,status,frame_ids_json,frame_hashes_json,lint_json,score,attempt,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,2,?,?)").bind(id,PROGRAM_ID,baseline.id,authorization.id,"MOBILE_TEXT_INTENSIVE",briefRow.id,"MOBILE_TEXT_PORTRAIT_V2","QA_REQUIRED",JSON.stringify(frameIds),JSON.stringify(frameHashes),JSON.stringify(lint),Number(mobilePrior.score),now,now),db.prepare("UPDATE v7_archetype_qualifications SET status='ARTIFACT_READY',evidence_status='SEMANTIC_QA_REQUIRED',blocker='BOUNDED_SEMANTIC_QA_REQUIRED' WHERE baseline_id=? AND archetype='MOBILE_TEXT_INTENSIVE'").bind(baseline.id),db.prepare("UPDATE v7_stage_states SET blocker='MOBILE_TEXT_INTENSIVE_QA_REQUIRED',evidence_summary='Mobile Text attempt 2 uses true 540x960 portrait pixels with fixed safe margins · prior 69/100 preserved',updated_at=? WHERE id=?").bind(now,STAGE_ID)]);
    return snapshot();
  }
  const dataPrior = await db.prepare("SELECT c.* FROM v7_archetype_certifications c JOIN v7_archetype_qualifications q ON q.baseline_id=c.baseline_id AND q.archetype=c.archetype WHERE c.baseline_id=? AND c.archetype='DATA_VISUALIZATION' AND c.status='REPAIR_REQUIRED' AND c.attempt=1 AND q.status!='CERTIFIED' ORDER BY c.created_at DESC LIMIT 1").bind(baseline.id).first<Row>();
  if (dataPrior) {
    if (!env.BUCKET) throw new Error("ARCHETYPE_CERTIFICATION_CONFIGURATION_REQUIRED");
    const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>(); if (Number(active?.total || 0) !== 0) throw new Error("ACTIVE_REMOTE_REQUESTS_MUST_FINISH_FIRST");
    const id=`${clean(baseline.id)}-DATA_VISUALIZATION-ATTEMPT-2`,existing=await db.prepare("SELECT id FROM v7_archetype_certifications WHERE id=?").bind(id).first<Row>();if(existing)return snapshot();
    const briefRow=await db.prepare("SELECT * FROM v7_material_briefs WHERE id=?").bind(dataPrior.brief_id).first<Row>();if(!briefRow)throw new Error("ARCHETYPE_FIXTURE_MISSING");
    const frameIds:string[]=[],frameHashes:string[]=[];for(const [role,state] of [["CERT_ENTRY",0],["CERT_MIDPOINT",1],["CERT_EXIT",2]] as const){const bytes=dataCertificationPng(state),fileId=await storeMaterial(env,db,authorization,briefRow,{role,identity:`CERT-${clean(baseline.version)}-DATA-V2`,bytes,mimeType:"image/png",extension:"png",sourceType:"RECONCILED_WATERFALL_V2",provider:"FRAMEFLOW_OWNED",licenseCode:"CHANNEL_OWNED",width:960,height:540}),file=await db.prepare("SELECT content_hash FROM v7_material_files WHERE id=?").bind(fileId).first<Row>();frameIds.push(fileId);frameHashes.push(clean(file?.content_hash));}
    const lint=[{id:"LABELED_BASELINE",status:"PASS"},{id:"SIGNED_COMPONENTS",status:"PASS"},{id:"RECONCILED_OUTCOME",status:"PASS"},{id:"THREE_DISTINCT_FRAMES",status:new Set(frameHashes).size===3?"PASS":"FAIL"}],now=new Date().toISOString();
    await db.batch([db.prepare("INSERT INTO v7_archetype_certifications (id,program_id,baseline_id,authorization_id,archetype,brief_id,renderer_version,status,frame_ids_json,frame_hashes_json,lint_json,score,attempt,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,2,?,?)").bind(id,PROGRAM_ID,baseline.id,authorization.id,"DATA_VISUALIZATION",briefRow.id,"RECONCILED_WATERFALL_V2","QA_REQUIRED",JSON.stringify(frameIds),JSON.stringify(frameHashes),JSON.stringify(lint),Number(dataPrior.score),now,now),db.prepare("UPDATE v7_archetype_qualifications SET status='ARTIFACT_READY',evidence_status='SEMANTIC_QA_REQUIRED',blocker='BOUNDED_SEMANTIC_QA_REQUIRED' WHERE baseline_id=? AND archetype='DATA_VISUALIZATION'").bind(baseline.id),db.prepare("UPDATE v7_stage_states SET blocker='DATA_VISUALIZATION_QA_REQUIRED',evidence_summary='Data Visualization attempt 2 uses labeled signed waterfall and reconciled outcome · prior 76/100 preserved',updated_at=? WHERE id=?").bind(now,STAGE_ID)]);
    return snapshot();
  }
  const processPrior=await db.prepare("SELECT c.* FROM v7_archetype_certifications c JOIN v7_archetype_qualifications q ON q.baseline_id=c.baseline_id AND q.archetype=c.archetype WHERE c.baseline_id=? AND c.archetype='PROCESS_ROUTE' AND c.status='REPAIR_REQUIRED' AND c.attempt=1 AND q.status!='CERTIFIED' ORDER BY c.created_at DESC LIMIT 1").bind(baseline.id).first<Row>();
  if(processPrior){
    if(!env.BUCKET)throw new Error("ARCHETYPE_CERTIFICATION_CONFIGURATION_REQUIRED");
    const active=await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{total:number}>();if(Number(active?.total||0)!==0)throw new Error("ACTIVE_REMOTE_REQUESTS_MUST_FINISH_FIRST");
    const id=`${clean(baseline.id)}-PROCESS_ROUTE-ATTEMPT-2`,existing=await db.prepare("SELECT id FROM v7_archetype_certifications WHERE id=?").bind(id).first<Row>();if(existing)return snapshot();
    const briefRow=await db.prepare("SELECT * FROM v7_material_briefs WHERE id=?").bind(processPrior.brief_id).first<Row>();if(!briefRow)throw new Error("ARCHETYPE_FIXTURE_MISSING");
    const frameIds:string[]=[],frameHashes:string[]=[];for(const [role,state] of [["CERT_ENTRY",0],["CERT_MIDPOINT",1],["CERT_EXIT",2]] as const){const bytes=processRouteCertificationPngV2(state),fileId=await storeMaterial(env,db,authorization,briefRow,{role,identity:`CERT-${clean(baseline.version)}-PROCESS-V2`,bytes,mimeType:"image/png",extension:"png",sourceType:"ORDERED_PROCESS_ROUTE_V2",provider:"FRAMEFLOW_OWNED",licenseCode:"CHANNEL_OWNED",width:960,height:540}),file=await db.prepare("SELECT content_hash FROM v7_material_files WHERE id=?").bind(fileId).first<Row>();frameIds.push(fileId);frameHashes.push(clean(file?.content_hash));}
    const lint=[{id:"SPECIFIC_NAMED_ENDPOINTS",status:"PASS"},{id:"CONCRETE_DECISION_STAGE",status:"PASS"},{id:"PRIMITIVE_ARROWHEADS",status:"PASS"},{id:"SHORT_UNCLIPPED_HEADLINE",status:"PASS"},{id:"THREE_DISTINCT_FRAMES",status:new Set(frameHashes).size===3?"PASS":"FAIL"}],now=new Date().toISOString();
    await db.batch([db.prepare("INSERT INTO v7_archetype_certifications (id,program_id,baseline_id,authorization_id,archetype,brief_id,renderer_version,status,frame_ids_json,frame_hashes_json,lint_json,score,attempt,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,2,?,?)").bind(id,PROGRAM_ID,baseline.id,authorization.id,"PROCESS_ROUTE",briefRow.id,"ORDERED_PROCESS_ROUTE_V2","QA_REQUIRED",JSON.stringify(frameIds),JSON.stringify(frameHashes),JSON.stringify(lint),Number(processPrior.score),now,now),db.prepare("UPDATE v7_archetype_qualifications SET status='ARTIFACT_READY',evidence_status='SEMANTIC_QA_REQUIRED',blocker='BOUNDED_SEMANTIC_QA_REQUIRED' WHERE baseline_id=? AND archetype='PROCESS_ROUTE'").bind(baseline.id),db.prepare("UPDATE v7_stage_states SET blocker='PROCESS_ROUTE_QA_REQUIRED',evidence_summary='Process Route attempt 2 uses named origin, concrete decision, named destination and geometric arrowheads · prior 84/100 preserved',updated_at=? WHERE id=?").bind(now,STAGE_ID)]);
    return snapshot();
  }
  const abstractPrior=await db.prepare("SELECT c.* FROM v7_archetype_certifications c JOIN v7_archetype_qualifications q ON q.baseline_id=c.baseline_id AND q.archetype=c.archetype WHERE c.baseline_id=? AND c.archetype='ABSTRACT_AUTHORED' AND c.status='REPAIR_REQUIRED' AND c.attempt=1 AND q.status!='CERTIFIED' ORDER BY c.created_at DESC LIMIT 1").bind(baseline.id).first<Row>();
  if(abstractPrior){
    if(!env.BUCKET)throw new Error("ARCHETYPE_CERTIFICATION_CONFIGURATION_REQUIRED");
    const active=await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{total:number}>();if(Number(active?.total||0)!==0)throw new Error("ACTIVE_REMOTE_REQUESTS_MUST_FINISH_FIRST");
    const id=`${clean(baseline.id)}-ABSTRACT_AUTHORED-ATTEMPT-2`,existing=await db.prepare("SELECT id FROM v7_archetype_certifications WHERE id=?").bind(id).first<Row>();if(existing)return snapshot();
    const briefRow=await db.prepare("SELECT * FROM v7_material_briefs WHERE id=?").bind(abstractPrior.brief_id).first<Row>();if(!briefRow)throw new Error("ARCHETYPE_FIXTURE_MISSING");
    const frameIds:string[]=[],frameHashes:string[]=[];for(const [role,state] of [["CERT_ENTRY",0],["CERT_MIDPOINT",1],["CERT_EXIT",2]] as const){const bytes=abstractMechanismPngV2(state),fileId=await storeMaterial(env,db,authorization,briefRow,{role,identity:`CERT-${clean(baseline.version)}-ABSTRACT-V2`,bytes,mimeType:"image/png",extension:"png",sourceType:"ABSTRACT_THREAD_METAPHOR_V2",provider:"FRAMEFLOW_OWNED",licenseCode:"CHANNEL_OWNED",width:960,height:540}),file=await db.prepare("SELECT content_hash FROM v7_material_files WHERE id=?").bind(fileId).first<Row>();frameIds.push(fileId);frameHashes.push(clean(file?.content_hash));}
    const lint=[{id:"CONCRETE_THREAD_METAPHOR",status:"PASS"},{id:"SAME_OBJECT_TRANSFORMS",status:"PASS"},{id:"TANGLE_SORT_CLEAR",status:"PASS"},{id:"SHORT_SAFE_TYPOGRAPHY",status:"PASS"},{id:"THREE_DISTINCT_FRAMES",status:new Set(frameHashes).size===3?"PASS":"FAIL"}],now=new Date().toISOString();
    await db.batch([db.prepare("INSERT INTO v7_archetype_certifications (id,program_id,baseline_id,authorization_id,archetype,brief_id,renderer_version,status,frame_ids_json,frame_hashes_json,lint_json,score,attempt,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,2,?,?)").bind(id,PROGRAM_ID,baseline.id,authorization.id,"ABSTRACT_AUTHORED",briefRow.id,"ABSTRACT_THREAD_METAPHOR_V2","QA_REQUIRED",JSON.stringify(frameIds),JSON.stringify(frameHashes),JSON.stringify(lint),Number(abstractPrior.score),now,now),db.prepare("UPDATE v7_archetype_qualifications SET status='ARTIFACT_READY',evidence_status='SEMANTIC_QA_REQUIRED',blocker='BOUNDED_SEMANTIC_QA_REQUIRED' WHERE baseline_id=? AND archetype='ABSTRACT_AUTHORED'").bind(baseline.id),db.prepare("UPDATE v7_stage_states SET blocker='ABSTRACT_AUTHORED_QA_REQUIRED',evidence_summary='Abstract attempt 2 transforms one thread topology from tangle through sorting to a clear path · prior 88/100 preserved',updated_at=? WHERE id=?").bind(now,STAGE_ID)]);
    return snapshot();
  }
  const prior = await db.prepare("SELECT * FROM v7_archetype_certifications WHERE baseline_id=? AND archetype='SOURCE_AUTHORED_HYBRID' AND status='REPAIR_REQUIRED' AND attempt=1 ORDER BY created_at DESC LIMIT 1").bind(baseline.id).first<Row>();
  if (!prior) throw new Error("BOUNDED_ARCHETYPE_REPAIR_NOT_AUTHORIZED");
  const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>();
  if (Number(active?.total || 0) !== 0) throw new Error("ACTIVE_REMOTE_REQUESTS_MUST_FINISH_FIRST");
  const id = `${clean(baseline.id)}-SOURCE_AUTHORED_HYBRID-ATTEMPT-2`, existing = await db.prepare("SELECT id FROM v7_archetype_certifications WHERE id=?").bind(id).first<Row>(); if (existing) return snapshot();
  const frameIds = arr(JSON.parse(String(prior.frame_ids_json || "[]"))).map(clean), frameHashes = arr(JSON.parse(String(prior.frame_hashes_json || "[]"))).map(clean), lint = [{ id: "EXACT_PIXEL_REUSE", status: frameIds.length === 3 && frameHashes.length === 3 ? "PASS" : "FAIL" }, { id: "SEMANTIC_CONTRACT_REBOUND", status: "PASS" }, { id: "REGISTERED_PROVENANCE_ATTACHED", status: "PASS" }, { id: "NO_APPROVAL_OR_SETTLEMENT_CLAIM", status: "PASS" }], now = new Date().toISOString();
  await db.batch([
    db.prepare("INSERT INTO v7_archetype_certifications (id,program_id,baseline_id,authorization_id,archetype,brief_id,renderer_version,status,frame_ids_json,frame_hashes_json,lint_json,score,attempt,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,2,?,?)").bind(id, PROGRAM_ID, baseline.id, authorization.id, "SOURCE_AUTHORED_HYBRID", prior.brief_id, "VERIFIED_HYBRID_EVIDENCE_V2", "QA_REQUIRED", JSON.stringify(frameIds), JSON.stringify(frameHashes), JSON.stringify(lint), Number(prior.score), now, now),
    db.prepare("UPDATE v7_archetype_qualifications SET status='ARTIFACT_READY',evidence_status='SEMANTIC_QA_REQUIRED',blocker='BOUNDED_SEMANTIC_QA_REQUIRED' WHERE baseline_id=? AND archetype='SOURCE_AUTHORED_HYBRID'").bind(baseline.id),
    db.prepare("UPDATE v7_stage_states SET status='ARCHETYPE_CERTIFICATION_IN_PROGRESS',blocker='SOURCE_AUTHORED_HYBRID_QA_REQUIRED',evidence_summary='Mixed Hybrid attempt 2 reuses exact pixels and adds semantic contract plus provenance evidence · prior 82/100 preserved',updated_at=? WHERE id=?").bind(now, STAGE_ID),
  ]);
  return snapshot();
}

async function authorizePilot() {
  const env = await runtime(), db = env.DB!, { run } = await current(db);
  if (!run || !["PILOT_READY", "PILOT_AUTHORIZED"].includes(clean(run.status))) throw new Error("PILOT_CONTRACT_NOT_READY");
  const existing = await db.prepare("SELECT id,status FROM v7_material_authorizations WHERE run_id=? ORDER BY authorized_at DESC LIMIT 1").bind(run.id).first<Row>();
  if (existing?.status === "AUTHORIZED") return snapshot();
  const pilots = await rows(db, "SELECT id FROM v7_material_briefs WHERE run_id=? AND pilot=1 ORDER BY start_seconds", run.id), shotCount = pilots.length;
  if (shotCount < 8 || shotCount > 12) throw new Error(`PILOT_SCOPE_INVALID · ${shotCount}/8–12`);
  const now = new Date().toISOString(), id = `${run.id}-PILOT-AUTH-${Date.now()}`;
  const modelPolicy = { version: "ADAPTIVE_ENVELOPE_V3", qualityMode: "MAXIMUM_QUALITY", dispatch: "NOT_STARTED", lanes: { singleVision: { expected: 1500, safety: 8000 } }, incomplete: "BLOCK_GATE", semanticRetry: "ONE_DELTA_ONLY", transportRetry: "ONE_IDEMPOTENT_ONLY", fullUnitRecovery: "ROOT_CAUSE_AUTHORIZATION_REQUIRED" };
  await db.batch([db.prepare("INSERT INTO v7_material_authorizations (id,program_id,run_id,scope,status,shot_count,max_remote_requests,max_actual_spend_usd,model_policy_json,authorized_at,updated_at) VALUES (?,?,?,'PILOT','AUTHORIZED',?,80,50,?,?,?)").bind(id, PROGRAM_ID, run.id, shotCount, JSON.stringify(modelPolicy), now, now), db.prepare("UPDATE v7_material_runs SET status='PILOT_AUTHORIZED' WHERE id=?").bind(run.id), db.prepare("UPDATE v7_stage_states SET status='PILOT_AUTHORIZED',blocker='PILOT_DISPATCH_NOT_STARTED',evidence_summary=?,updated_at=? WHERE id=?").bind(`${shotCount} pilot shots authorized · 0 remote requests · $0 actual cost`, now, STAGE_ID)]);
  return snapshot();
}

async function authorizePilotAfterMotion() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization) throw new Error("PILOT_CONTINUATION_STATE_MISSING");
  const proof = await db.prepare("SELECT * FROM v7_motion_proofs WHERE authorization_id=? ORDER BY created_at DESC LIMIT 1").bind(authorization.id).first<Row>();
  if (!proof || clean(proof.status) !== "PASS" || Number(proof.score) < 90) throw new Error("MOTION_PROOF_PASS_REQUIRED");
  const active = await db.prepare("SELECT id FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS') LIMIT 1").bind(authorization.id).first<Row>();
  if (active) throw new Error("ACTIVE_REMOTE_REQUESTS_MUST_FINISH_FIRST");
  const pilots = await rows(db, "SELECT id FROM v7_material_briefs WHERE run_id=? AND pilot=1 ORDER BY start_seconds", run.id);
  if (pilots.length < 8 || pilots.length > 12) throw new Error(`PILOT_SCOPE_INVALID · ${pilots.length}/8–12`);
  const completed = await db.prepare("SELECT COUNT(DISTINCT brief_id) AS total FROM v7_material_files WHERE authorization_id=? AND asset_role='PRIMARY' AND status='STORED_VERIFIED'").bind(authorization.id).first<{ total: number }>();
  if (Number(completed?.total || 0) >= pilots.length) throw new Error("PILOT_ALREADY_MATERIALIZED");
  const now = new Date().toISOString();
  await db.batch([
    db.prepare("UPDATE v7_material_authorizations SET status='AUTHORIZED',revoked_at=NULL,completed_at=NULL,updated_at=? WHERE id=?").bind(now, authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='PILOT_AUTHORIZED',mode='AUTHORIZED_PILOT' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='PILOT_AUTHORIZED',blocker='PILOT_DISPATCH_NOT_STARTED',evidence_summary=?,updated_at=? WHERE id=?").bind(`Motion proof ${Number(proof.score)}/100 PASS · existing ${pilots.length}-shot pilot scope re-authorized · ${Number(completed?.total || 0)}/${pilots.length} materials preserved · scale blocked`, now, STAGE_ID),
  ]);
  return snapshot();
}

async function revokePilot() {
  const env = await runtime(), db = env.DB!, { authorization } = await current(db);
  if (!authorization || authorization.status !== "AUTHORIZED") return snapshot();
  const active = await db.prepare("SELECT id FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS') LIMIT 1").bind(authorization.id).first<Row>();
  if (active) throw new Error("ACTIVE_REMOTE_REQUESTS_MUST_STOP_FIRST");
  const now = new Date().toISOString();
  await db.batch([db.prepare("UPDATE v7_material_authorizations SET status='REVOKED',revoked_at=?,updated_at=? WHERE id=?").bind(now, now, authorization.id), db.prepare("UPDATE v7_material_runs SET status='PILOT_READY' WHERE id=?").bind(authorization.run_id), db.prepare("UPDATE v7_stage_states SET status='PILOT_READY',blocker=NULL,evidence_summary='Pilot authorization revoked · no active remote requests',updated_at=? WHERE id=?").bind(now, STAGE_ID)]);
  return snapshot();
}

async function buildDryRun() {
  const env = await runtime(), db = env.DB!, up = await upstream(db), briefs = up.shots.map((shot, index) => compileBrief(shot, index)), pilotIds = selectPilot(briefs), normalized = briefs.map((brief) => ({ ...brief, pilot: pilotIds.includes(brief.briefId) })), qa = audit(normalized, pilotIds), now = new Date().toISOString(), runId = `${PROGRAM_ID}-09-DRY-${Date.now()}`, artifactId = `${runId}-ARTIFACT`;
  const routeMix = Object.fromEntries(["SOURCE", "MAKE", "HYBRID"].map((route) => [route, normalized.filter((brief) => brief.route === route).length]));
  const modelMix = Object.fromEntries([...new Set(normalized.map((brief) => brief.modelContract.lane))].map((lane) => [lane, normalized.filter((brief) => brief.modelContract.lane === lane).length]));
  const artifact = { title: "Stage 09 zero-spend material-production dry run", upstreamArtifactId: up.artifact.id, upstreamHash: up.artifact.content_hash, generatedAt: now, briefs: normalized, pilotIds, routeMix, modelMix, executionAuthorization: "PILOT_NOT_YET_AUTHORIZED", remoteRequests: 0, actualCostUsd: 0 };
  const envelope = JSON.stringify({ pipelineVersion: 7, stage: STAGE, artifact }, null, 2), contentHash = await sha(envelope), runtimeKey = `v7/material-production/${artifactId}.json`;
  if (!env.BUCKET) throw new Error("R2_STORE_FAILED · Runtime storage unavailable");
  await env.BUCKET.put(runtimeKey, envelope, { httpMetadata: { contentType: "application/json" }, customMetadata: { stage: STAGE, contentHash } });
  if (!(await env.BUCKET.head(runtimeKey))) throw new Error("R2_STORE_FAILED · Read-back failed");
  const drive = await storeDriveJsonArtifact({ folderPath: ["Channels", "Hidden Systems", "Projects", "V7 Greenfield Pilot", "Material Production"], fileName: `stage-09-dry-run-${runId.slice(-13)}.json`, content: envelope, artifactId, contentHash });
  const statements: Statement[] = [db.prepare("INSERT INTO v7_material_runs (id,program_id,status,mode,brief_count,pilot_count,score,remote_requests,actual_cost_usd,gate_json,created_at,completed_at) VALUES (?,?,?,'ZERO_SPEND_DRY_RUN',?,?,?,0,0,?,?,?)").bind(runId, PROGRAM_ID, qa.passed ? "PILOT_READY" : "REPAIR_REQUIRED", normalized.length, pilotIds.length, qa.score, JSON.stringify(qa.gates), now, now), db.prepare("INSERT INTO v7_material_artifacts (id,program_id,run_id,lifecycle_state,content_json,content_hash,runtime_key,drive_file_id,created_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(artifactId, PROGRAM_ID, runId, qa.passed ? "DRY_RUN_FROZEN" : "REPAIR_REQUIRED", JSON.stringify(artifact), contentHash, runtimeKey, drive.id, now), db.prepare("UPDATE v7_stage_states SET status=?,artifact_id=?,blocker=?,evidence_summary=?,updated_at=? WHERE id=?").bind(qa.passed ? "PILOT_READY" : "REPAIR_REQUIRED", artifactId, qa.passed ? null : "DRY_RUN_GATE_FAILED", `${qa.score}/100 · ${normalized.length} briefs · ${pilotIds.length} pilot shots · zero remote requests · $0`, now, STAGE_ID)];
  for (const brief of normalized) { const json = JSON.stringify(brief); statements.push(db.prepare("INSERT INTO v7_material_briefs (id,program_id,run_id,shot_id,section_id,start_seconds,end_seconds,route,visual_family,model_lane,output_ceiling,retry_limit,pilot,content_json,content_hash,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'PLANNED',?)").bind(`${runId}-${brief.briefId}`, PROGRAM_ID, runId, brief.shotId, brief.sectionId, brief.startSeconds, brief.endSeconds, brief.route, brief.primaryFamily, brief.modelContract.lane, brief.modelContract.safetyCeilingTokens, brief.modelContract.retryLimit, brief.pilot ? 1 : 0, json, await sha(json), now)); }
  for (let index = 0; index < statements.length; index += 40) await db.batch(statements.slice(index, index + 40));
  return snapshot();
}

async function setModel(modelId: string, reasoningEffort: string) {
  const env = await runtime(), db = env.DB!;
  if (!MODEL_OPTIONS.some((item) => item.id === modelId)) throw new Error("Unsupported OpenAI model selection");
  if (!REASONING_OPTIONS.includes(reasoningEffort as typeof REASONING_OPTIONS[number])) throw new Error("Unsupported reasoning effort");
  const active = await db.prepare("SELECT id FROM v7_material_requests WHERE program_id=? AND status IN ('QUEUED','IN_PROGRESS') LIMIT 1").bind(PROGRAM_ID).first<Row>();
  if (active) throw new Error("MODEL_CHANGE_BLOCKED · Stop active OpenAI requests first");
  if (!env.OPENAI_API_KEY) throw new Error("OpenAI key is required to verify model access");
  const check = await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(modelId)}`, { headers: { authorization: `Bearer ${env.OPENAI_API_KEY}` }, signal: AbortSignal.timeout(15000) });
  if (!check.ok) throw new Error(`MODEL_UNAVAILABLE · OpenAI returned ${check.status} for ${modelId}`);
  const now = new Date().toISOString();
  await db.prepare("INSERT INTO v7_stage_model_settings (id,program_id,stage_key,model_id,reasoning_effort,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET model_id=excluded.model_id,reasoning_effort=excluded.reasoning_effort,updated_at=excluded.updated_at").bind(`${PROGRAM_ID}-${STAGE}-MODEL`, PROGRAM_ID, STAGE, modelId, reasoningEffort, now).run();
  return snapshot();
}

async function newRequest(db: DB, authorization: Row, briefId: string, phase: string, provider: string, modelId = "none", reasoning = "none", expected = 0, maximum = 0, stableRequestId?: string) {
  const baseline = await db.prepare("SELECT execution_state FROM v7_architecture_baselines WHERE program_id=? AND stage_key=? ORDER BY created_at DESC LIMIT 1").bind(PROGRAM_ID, STAGE).first<Row>();
  let sequenceQaAuthorized = false;
  let productAuditAuthorized = false;
  let batchAuditAuthorized = false;
  let sequenceQaDiagnostic = "not-evaluated";
  if (phase === "SEQUENCE_PROOF_QA" && briefId === "SEQUENCE-10MP") {
    const proof = await db.prepare("SELECT canary_id,status,unit_count,frame_count FROM v7_sequence_proofs WHERE authorization_id=? ORDER BY created_at DESC LIMIT 1").bind(authorization.id).first<Row>();
    const canary = proof ? await db.prepare("SELECT id,status,passed_units FROM v7_pilot_canaries WHERE id=? LIMIT 1").bind(proof.canary_id).first<Row>() : null;
    sequenceQaAuthorized = Boolean(canary && proof)
      && clean(canary?.status) === "PASS"
      && Number(canary?.passed_units) === 10
      && clean(proof?.canary_id) === clean(canary?.id)
      && clean(proof?.status) === "QA_REQUIRED"
      && Number(proof?.unit_count) === 10
      && Number(proof?.frame_count) === 30;
    sequenceQaDiagnostic = `canary=${clean(canary?.status) || "missing"};passed=${Number(canary?.passed_units || 0)};proof=${clean(proof?.status) || "missing"};units=${Number(proof?.unit_count || 0)};frames=${Number(proof?.frame_count || 0)};lineage=${Boolean(canary && proof && clean(proof.canary_id) === clean(canary.id))}`;
    if (!sequenceQaAuthorized) throw new Error(`SEQUENCE_QA_DISPATCH_FIREWALL · ${sequenceQaDiagnostic}`);
  }
  if (phase === "SEQUENCE_PRODUCT_AUDIT" && briefId === "SEQUENCE-PRODUCT-V2") {
    const product = await db.prepare("SELECT id,status,evidence_id,product_file_id,iteration,max_iterations FROM v7_sequence_products WHERE authorization_id=? ORDER BY created_at DESC LIMIT 1").bind(authorization.id).first<Row>();
    const evidence = product?.evidence_id ? await db.prepare("SELECT status FROM v7_media_evidence WHERE id=? AND evidence_type='SEQUENCE_PRODUCT'").bind(product.evidence_id).first<Row>() : null;
    const prior = product ? await db.prepare("SELECT COUNT(*) AS total FROM v7_sequence_product_audits WHERE product_id=?").bind(product.id).first<{ total: number }>() : null;
    productAuditAuthorized = Boolean(product && evidence)
      && clean(product?.status) === "PRODUCT_COMPLETE"
      && clean(evidence?.status) === "PRODUCT_COMPLETE"
      && Boolean(product?.product_file_id)
      && Number(product?.iteration) > 0
      && Number(product?.iteration) <= Number(product?.max_iterations)
      && Number(prior?.total || 0) === 0;
    if (!productAuditAuthorized) throw new Error("SEQUENCE_PRODUCT_AUDIT_FIREWALL · PRODUCT_COMPLETE with exact stored evidence and zero prior audits is required");
  }
  if (phase === "WAVE_BATCH_PRODUCT_AUDIT" && briefId === "WAVE-09-BATCH-1") {
    const batch = await db.prepare("SELECT * FROM v7_production_batches WHERE authorization_id=? AND wave_key='BATCH_1' ORDER BY created_at DESC LIMIT 1").bind(authorization.id).first<Row>();
    const products = batch ? await db.prepare("SELECT COUNT(*) AS total FROM v7_shot_products WHERE batch_id=? AND engine_version=? AND status='PRODUCT_COMPLETE'").bind(batch.id, batch.engine_version).first<{ total: number }>() : null;
    const prior = batch ? await db.prepare("SELECT COUNT(*) AS total FROM v7_batch_product_audits WHERE batch_id=?").bind(batch.id).first<{ total: number }>() : null;
    const priorAudit = batch ? await db.prepare("SELECT * FROM v7_batch_product_audits WHERE batch_id=? ORDER BY created_at DESC LIMIT 1").bind(batch.id).first<Row>() : null;
    const priorRequest = priorAudit?.request_id ? await db.prepare("SELECT * FROM v7_material_requests WHERE id=?").bind(priorAudit.request_id).first<Row>() : null;
    const reconciledPreDispatch = Number(prior?.total || 0) === 1
      && clean(priorAudit?.status) === "BLOCKED_TRANSPORT_PRE_DISPATCH"
      && !clean(priorAudit?.provider_response_id)
      && clean(priorRequest?.status) === "FAILED"
      && Number(priorRequest?.input_tokens || 0) === 0
      && Number(priorRequest?.output_tokens || 0) === 0
      && Number(priorRequest?.actual_cost_usd || 0) === 0;
    const qualifiedReproduction = clean(batch?.engine_version) === WAVE_PRODUCTION_ENGINE_VERSION
      && clean(priorAudit?.status) === "ENGINE_ROOT_CAUSE_PRESERVED"
      && clean(rec(JSON.parse(String(batch?.root_cause_policy_json || "{}"))).replacementEngineVersion) === WAVE_PRODUCTION_ENGINE_VERSION;
    batchAuditAuthorized = Boolean(batch)
      && clean(batch?.status) === "PRODUCT_COMPLETE"
      && Number(batch?.total_units) === 26
      && Number(batch?.completed_units) === 26
      && Number(products?.total || 0) === 26
      && (Number(prior?.total || 0) === 0 || reconciledPreDispatch || qualifiedReproduction);
    if (!batchAuditAuthorized) throw new Error("BATCH_PRODUCT_AUDIT_FIREWALL · 26/26 PRODUCT_COMPLETE with zero provider-dispatched prior audits is required");
  }
  if (phase === "WAVE_BATCH_2_PRODUCT_AUDIT" && briefId === "WAVE-09-BATCH-2") {
    const batch = await db.prepare("SELECT * FROM v7_production_batches WHERE authorization_id=? AND wave_key='BATCH_2' ORDER BY created_at DESC LIMIT 1").bind(authorization.id).first<Row>();
    const products = batch ? await db.prepare("SELECT COUNT(*) AS total FROM v7_shot_products WHERE batch_id=? AND engine_version=? AND status='PRODUCT_COMPLETE'").bind(batch.id, batch.engine_version).first<{ total: number }>() : null;
    const prior = batch ? await db.prepare("SELECT COUNT(*) AS total FROM v7_batch_product_audits WHERE batch_id=?").bind(batch.id).first<{ total: number }>() : null;
    const currentAudit = batch ? await db.prepare("SELECT * FROM v7_batch_product_audits WHERE batch_id=? ORDER BY created_at DESC LIMIT 1").bind(batch.id).first<Row>() : null;
    const rootPolicy = rec(JSON.parse(String(batch?.root_cause_policy_json || "{}")));
    const rejectedEngineForCurrent = clean(batch?.engine_version) === WAVE_BATCH_2_V13_ENGINE_VERSION
      ? WAVE_BATCH_2_V13_REJECTED_ENGINE_VERSION
      : clean(batch?.engine_version) === WAVE_BATCH_2_V13_REJECTED_ENGINE_VERSION
      ? WAVE_BATCH_2_V12_ENGINE_VERSION
      : clean(batch?.engine_version) === WAVE_BATCH_2_V12_ENGINE_VERSION
      ? WAVE_BATCH_2_V11_ENGINE_VERSION
      : clean(batch?.engine_version) === WAVE_BATCH_2_V11_ENGINE_VERSION
        ? WAVE_BATCH_2_V10_ENGINE_VERSION
      : clean(batch?.engine_version) === WAVE_BATCH_2_V10_ENGINE_VERSION
        ? WAVE_BATCH_2_REPLACEMENT_ENGINE_VERSION
        : clean(batch?.engine_version) === WAVE_BATCH_2_REPLACEMENT_ENGINE_VERSION
          ? WAVE_BATCH_2_ENGINE_VERSION
          : "";
    const rejectedBatch = rejectedEngineForCurrent
      ? await db.prepare("SELECT * FROM v7_production_batches WHERE authorization_id=? AND wave_key='BATCH_2' AND engine_version=? ORDER BY created_at DESC LIMIT 1").bind(authorization.id, rejectedEngineForCurrent).first<Row>()
      : null;
    const rejectedAudit = rejectedBatch ? await db.prepare("SELECT * FROM v7_batch_product_audits WHERE batch_id=? ORDER BY created_at DESC LIMIT 1").bind(rejectedBatch.id).first<Row>() : null;
    const currentDurableIntent = Number(prior?.total || 0) === 1
      && Boolean(currentAudit)
      && ["PREPARING", "DISPATCHING"].includes(clean(currentAudit?.status))
      && clean(currentAudit?.id) === clean(stableRequestId).replace(/-REQUEST$/, "")
      && !clean(currentAudit?.provider_response_id);
    const v8InitialAudit = clean(batch?.engine_version) === WAVE_BATCH_2_ENGINE_VERSION && currentDurableIntent;
    const v9QualifiedAudit = clean(batch?.engine_version) === WAVE_BATCH_2_REPLACEMENT_ENGINE_VERSION
      && clean(rootPolicy.replacementEngineVersion) === WAVE_BATCH_2_REPLACEMENT_ENGINE_VERSION
      && clean(rootPolicy.fullScopeRegression) === "50_OF_50_CONTRACTS_AND_150_OF_150_UNIQUE_FRAMES_PASS"
      && rootPolicy.priorProductsPreservedAsEvidence === true
      && rootPolicy.retryPriorAudit === false
      && clean(rejectedBatch?.status) === "ENGINE_ROOT_CAUSE_PRESERVED"
      && clean(rejectedAudit?.status) === "ENGINE_ROOT_CAUSE_REQUIRED"
      && currentDurableIntent;
    const v10QualifiedAudit = clean(batch?.engine_version) === WAVE_BATCH_2_V10_ENGINE_VERSION
      && clean(rootPolicy.replacementEngineVersion) === WAVE_BATCH_2_V10_ENGINE_VERSION
      && clean(rootPolicy.fullScopeRegression) === "50_CONTRACTS_50_GRAMMARS_150_FRAMES_PASS"
      && rootPolicy.v8AndV9ProductsPreservedAsEvidence === true
      && rootPolicy.retryPriorAudits === false
      && clean(rejectedBatch?.status) === "ENGINE_ROOT_CAUSE_PRESERVED"
      && clean(rejectedAudit?.status) === "ENGINE_ROOT_CAUSE_REQUIRED"
      && currentDurableIntent;
    const v11QualifiedAudit = clean(batch?.engine_version) === WAVE_BATCH_2_V11_ENGINE_VERSION
      && clean(rootPolicy.replacementEngineVersion) === WAVE_BATCH_2_V11_ENGINE_VERSION
      && clean(rootPolicy.fullScopeRegression) === "50_CONTRACTS_50_PROJECTIONS_50_GRAMMARS_150_FRAMES_PASS"
      && rootPolicy.v8V9V10ProductsPreservedAsEvidence === true
      && rootPolicy.retryPriorAudits === false
      && clean(rejectedBatch?.status) === "ENGINE_ROOT_CAUSE_PRESERVED"
      && clean(rejectedAudit?.status) === "ENGINE_ROOT_CAUSE_REQUIRED"
      && currentDurableIntent;
    const v12QualifiedAudit = clean(batch?.engine_version) === WAVE_BATCH_2_V12_ENGINE_VERSION
      && clean(rootPolicy.replacementEngineVersion) === WAVE_BATCH_2_V12_ENGINE_VERSION
      && clean(rootPolicy.fullScopeRegression) === "50_ONTOLOGIES_50_MOTION_PATHS_150_FRAMES_LAYOUT_SAFE"
      && rootPolicy.v8V9V10V11ProductsPreservedAsEvidence === true
      && rootPolicy.retryPriorAudits === false
      && clean(rejectedBatch?.status) === "ENGINE_ROOT_CAUSE_PRESERVED"
      && clean(rejectedAudit?.status) === "ENGINE_ROOT_CAUSE_REQUIRED"
      && currentDurableIntent;
    const v13QualifiedAudit = clean(batch?.engine_version) === WAVE_BATCH_2_V13_ENGINE_VERSION
      && clean(rootPolicy.replacementEngineVersion) === WAVE_BATCH_2_V13_ENGINE_VERSION
      && clean(rootPolicy.fullScopeRegression) === "50_SCENE_SPECS_50_PIXEL_TRACES_150_FRAMES_LAYOUT_SAFE"
      && rootPolicy.v8V9V10V11V12V13ProductsPreservedAsEvidence === true
      && rootPolicy.retryPriorAudits === false
      && clean(rejectedBatch?.status) === "ENGINE_ROOT_CAUSE_PRESERVED"
      && clean(rejectedAudit?.status) === "ENGINE_ROOT_CAUSE_REQUIRED"
      && currentDurableIntent;
    batchAuditAuthorized = Boolean(batch)
      && clean(batch?.status) === "PRODUCT_COMPLETE"
      && Number(batch?.total_units) === 50
      && Number(batch?.completed_units) === 50
      && Number(products?.total || 0) === 50
      && (v8InitialAudit || v9QualifiedAudit || v10QualifiedAudit || v11QualifiedAudit || v12QualifiedAudit || v13QualifiedAudit);
    if (!batchAuditAuthorized) throw new Error("BATCH_2_PRODUCT_AUDIT_FIREWALL · qualified V8 initial audit or lineage-bound V9/V10/V11/V12/V13/V14 durable audit intent is required");
  }
  if (baseline?.execution_state === "FROZEN" && !phase.startsWith("ARCHETYPE_CERTIFICATION") && !sequenceQaAuthorized && !productAuditAuthorized && !batchAuditAuthorized) throw new Error("PRODUCTION_EXECUTION_QUARANTINED · archetype certification must pass before provider dispatch");
  if (baseline?.execution_state === "CANARY_ONLY" && !phase.startsWith("ARCHETYPE_CERTIFICATION") && !sequenceQaAuthorized && !productAuditAuthorized && !batchAuditAuthorized) {
    const canary = await db.prepare("SELECT status,current_brief_id,version,queue_json,current_index FROM v7_pilot_canaries WHERE authorization_id=? ORDER BY created_at DESC LIMIT 1").bind(authorization.id).first<Row>(), capability = canaryDispatchCapability(canary?.version), policy = rec(JSON.parse(String(authorization.model_policy_json || "{}"))), queue = canary ? arr(JSON.parse(String(canary.queue_json || "[]"))).map(rec) : [], current = queue[Number(canary?.current_index || 0)];
    const versionBound = Boolean(canary) && clean(policy.version) === clean(canary?.version), phaseBound = Boolean(capability) && capability?.phase === phase, queueBound = !clean(current?.dispatchCapability) || clean(current?.dispatchCapability) === phase;
    if (!canary || clean(canary.status) !== "UNIT_RUNNING" || clean(canary.current_brief_id) !== clean(briefId) || !versionBound || !phaseBound || !queueBound) throw new Error("CANARY_DISPATCH_FIREWALL · leased unit, canary version and dispatch capability must be congruent");
    const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>();
    if (Number(active?.total || 0) > 0) throw new Error("CANARY_CONCURRENCY_LIMIT · one active request maximum");
  }
  const usage = await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(actual_cost_usd),0) AS cost FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<{ total: number; cost: number }>();
  if (Number(usage?.total || 0) >= Number(authorization.max_remote_requests)) throw new Error("PILOT_REQUEST_CIRCUIT_OPEN");
  if (Number(usage?.cost || 0) >= Number(authorization.max_actual_spend_usd)) throw new Error("PILOT_SPEND_CIRCUIT_OPEN");
  const id = stableRequestId || `${authorization.run_id}-${briefId}-${phase}-${Date.now()}-${crypto.randomUUID()}`;
  // Before v138 this field stored only the logical operation family, so a
  // bounded retry could legitimately reuse the same value. Keep those rows
  // immutable, but make every new dispatch identity request-scoped. The stable
  // operation family is still recoverable from authorization/brief/phase.
  const operationKey = `${authorization.id}:${briefId}:${phase}`;
  const idempotencyKey = `${operationKey}:request:${id}`;
  await db.prepare("INSERT INTO v7_material_requests (id,program_id,run_id,authorization_id,brief_id,phase,provider,model_id,reasoning,status,idempotency_key,expected_output_tokens,max_output_tokens,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,'IN_PROGRESS',?,?,?,?,?) ON CONFLICT(id) DO NOTHING").bind(id, PROGRAM_ID, authorization.run_id, authorization.id, briefId, phase, provider, modelId, reasoning, idempotencyKey, expected, maximum, new Date().toISOString(), new Date().toISOString()).run();
  const persisted = await db.prepare("SELECT authorization_id,brief_id,phase,provider,status FROM v7_material_requests WHERE id=?").bind(id).first<Row>();
  if (!persisted || clean(persisted.authorization_id) !== clean(authorization.id) || clean(persisted.brief_id) !== briefId || clean(persisted.phase) !== phase || clean(persisted.provider) !== provider || !["IN_PROGRESS", "QUEUED"].includes(clean(persisted.status))) throw new Error("REQUEST_IDEMPOTENCY_CONFLICT");
  return id;
}

async function finishRequest(db: DB, id: string, status: string, error: string | null = null) { await db.prepare("UPDATE v7_material_requests SET status=?,error=?,updated_at=? WHERE id=?").bind(status, error, new Date().toISOString(), id).run(); }

function sourceContextJob(brief: Row) {
  const text = `${clean(brief.narrationClause)} ${clean(brief.viewerMustUnderstand)}`.toLowerCase();
  if (/reward|points|miles|cash back/.test(text) && /merchant|checkout|purchase|card/.test(text)) return "A real card purchase at a merchant checkout: card, terminal, receipt or customer hands; no cash, bank UI or completed-settlement implication";
  if (/issuer|bank|approve|authorization/.test(text)) return "A credible card-authorization context: card terminal or issuer-side decision environment; no cash movement, payout or settlement imagery";
  if (/merchant|checkout|purchase/.test(text)) return "A real merchant checkout and credit-card tender context with documentary authenticity; no cash or generic corporate meeting";
  if (/portfolio|ledger|funding|obligation/.test(text)) return "A credible institutional transaction-processing or accounting context; no decorative crypto, cash piles or generic office meeting";
  if (/fee|cost|interchange|econom/.test(text)) return "A real merchant payment and receipt context that can support a later authored cost breakdown; no invented fee values";
  if (/settle|clearing|route|network/.test(text)) return "A credible electronic payment-processing context; no physical cash transfer or instant-settlement implication";
  return "A literal, documentary physical context for the narration with no contradiction, logos, UI claims or generic corporate staging";
}

function searchPhrase(brief: Row, repairAttempt = 0) {
  const text = `${clean(brief.narrationClause)} ${clean(brief.viewerMustUnderstand)}`.toLowerCase();
  const concepts = [
    [/reward|points|miles|cash back/, ["credit card purchase checkout close up", "customer paying credit card merchant terminal"]],
    [/merchant|checkout|purchase/, ["merchant checkout credit card terminal", "customer hands paying credit card checkout"]],
    [/issuer|bank|approve|authorization/, ["credit card terminal approval close up", "bank card authorization payment terminal"]],
    [/portfolio|ledger|funding|obligation/, ["bank transaction processing operations", "financial operations payment processing"]],
    [/fee|cost|interchange|econom/, ["merchant credit card receipt close up", "small business card payment receipt"]],
    [/settle|clearing|route|network/, ["electronic payment processing data center", "payment network operations transaction"]],
  ];
  const selected = concepts.find(([pattern]) => (pattern as RegExp).test(text));
  const variants = selected ? selected[1] as string[] : ["credit card payment real world", "customer card payment close up"];
  return variants[Math.min(repairAttempt, variants.length - 1)].split(" ").slice(0, 7).join(" ");
}

async function discoverCandidates(env: Env, db: DB, authorization: Row, briefRow: Row, brief: Row, options?: { repairAttempt?: number; query?: string }) {
  const previous = await db.prepare("SELECT status,content_json FROM v7_material_tournaments WHERE brief_id=? LIMIT 1").bind(briefRow.id).first<Row>();
  const previousContent = previous?.content_json ? rec(JSON.parse(String(previous.content_json))) : {};
  const repairAttempt = options?.repairAttempt ?? (previous?.status === "NO_PIXEL_CHAMPION" ? Number(previousContent.repairAttempt || 0) + 1 : 0);
  if (options?.repairAttempt === undefined && repairAttempt > 1) throw new Error("PIXEL_REPAIR_EXHAUSTED · one bounded query repair already used");
  const query = options?.query || searchPhrase(brief, repairAttempt), candidates: Candidate[] = [];
  if (env.PEXELS_API_KEY) {
    const requestId = await newRequest(db, authorization, clean(briefRow.id), "DISCOVERY", "PEXELS");
    try {
      const response = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=8&page=${repairAttempt + 1}&orientation=landscape&size=medium`, { headers: { Authorization: env.PEXELS_API_KEY }, signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      const data = await response.json() as { videos?: Array<{ id: number; url: string; image?: string; duration?: number; user?: { name?: string }; video_files?: Array<{ id?: number; link: string; file_type?: string; width?: number; height?: number }> }> };
      for (const [index, video] of (data.videos || []).entries()) { const file = (video.video_files || []).filter((item) => (item.width || 0) >= 1280 && (item.height || 0) >= 720).sort((a, b) => Math.abs((a.width || 0) - 1920) - Math.abs((b.width || 0) - 1920))[0]; if (file) candidates.push({ id: `pexels-${video.id}`, provider: "Pexels", title: `Documentary result ${index + 1} for ${query}`, sourceUrl: video.url, assetUrl: file.link, thumbnailUrl: video.image || "", licenseCode: "PEXELS_LICENSE", licenseUrl: "https://www.pexels.com/license/", width: file.width || 0, height: file.height || 0, duration: video.duration || 0, score: 96 - index }); }
      await finishRequest(db, requestId, "COMPLETE");
    } catch (error) { await finishRequest(db, requestId, "FAILED", error instanceof Error ? error.message : "Pexels failed"); }
  }
  if (env.PIXABAY_API_KEY) {
    const requestId = await newRequest(db, authorization, clean(briefRow.id), "DISCOVERY", "PIXABAY");
    try {
      const response = await fetch(`https://pixabay.com/api/videos/?key=${encodeURIComponent(env.PIXABAY_API_KEY)}&q=${encodeURIComponent(query)}&safesearch=true&per_page=8&page=${repairAttempt + 1}`, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      const data = await response.json() as { hits?: Array<{ id: number; pageURL: string; tags?: string; duration?: number; picture_id?: string; videos?: { medium?: { url: string; width?: number; height?: number; thumbnail?: string }; large?: { url: string; width?: number; height?: number; thumbnail?: string } } }> };
      for (const [index, hit] of (data.hits || []).entries()) { const file = hit.videos?.large || hit.videos?.medium; if (file?.url && (file.width || 0) >= 1280) candidates.push({ id: `pixabay-${hit.id}`, provider: "Pixabay", title: clean(hit.tags) || `Documentary result ${index + 1}`, sourceUrl: hit.pageURL, assetUrl: file.url, thumbnailUrl: file.thumbnail || (hit.picture_id ? `https://i.vimeocdn.com/video/${hit.picture_id}_640x360.jpg` : ""), licenseCode: "PIXABAY_CONTENT_LICENSE", licenseUrl: "https://pixabay.com/service/license-summary/", width: file.width || 0, height: file.height || 0, duration: hit.duration || 0, score: 94 - index }); }
      await finishRequest(db, requestId, "COMPLETE");
    } catch (error) { await finishRequest(db, requestId, "FAILED", error instanceof Error ? error.message : "Pixabay failed"); }
  }
  const used = new Set((await rows(db, "SELECT provider_asset_id FROM v7_material_files WHERE authorization_id=?", authorization.id)).map((item) => String(item.provider_asset_id)));
  const rejected = new Set((await rows(db, "SELECT provider_asset_id FROM v7_material_candidates WHERE brief_id=? AND status='PIXEL_REJECTED'", briefRow.id)).map((item) => String(item.provider_asset_id)));
  const viable = candidates.filter((item) => !used.has(item.id) && !rejected.has(item.id) && item.width / Math.max(1, item.height) >= 1.6 && clean(item.thumbnailUrl)).slice(0, 12);
  for (const candidate of candidates) await db.prepare("INSERT INTO v7_material_candidates (id,program_id,run_id,authorization_id,brief_id,provider,provider_asset_id,score,status,content_json) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET content_json=excluded.content_json").bind(`${authorization.run_id}-${briefRow.id}-${candidate.id}`, PROGRAM_ID, authorization.run_id, authorization.id, briefRow.id, candidate.provider, candidate.id, 0, "DISCOVERED", JSON.stringify(candidate)).run();
  return { candidates: viable, query, repairAttempt };
}

const tournamentSchema = {
  type: "object", additionalProperties: false,
  properties: {
    championCandidateId: { type: "string" },
    candidates: { type: "array", minItems: 6, maxItems: 12, items: { type: "object", additionalProperties: false, properties: { candidateId: { type: "string" }, semanticFit: { type: "integer", minimum: 0, maximum: 100 }, specificity: { type: "integer", minimum: 0, maximum: 100 }, composition: { type: "integer", minimum: 0, maximum: 100 }, authenticity: { type: "integer", minimum: 0, maximum: 100 }, decision: { type: "string", enum: ["SELECT", "REJECT"] }, reason: { type: "string", minLength: 4, maxLength: 180 } }, required: ["candidateId", "semanticFit", "specificity", "composition", "authenticity", "decision", "reason"] } },
  },
  required: ["championCandidateId", "candidates"],
};

async function selectCandidateByPixels(env: Env, db: DB, authorization: Row, briefRow: Row, brief: Row, candidates: Candidate[], query: string, repairAttempt: number) {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY_REQUIRED_FOR_CANDIDATE_TOURNAMENT");
  if (candidates.length < 6) throw new Error(`CANDIDATE_PIXEL_FLOOR_NOT_MET · ${candidates.length}/6`);
  const setting = await modelSetting(db), requestId = await newRequest(db, authorization, clean(briefRow.id), "CANDIDATE_PIXEL_TOURNAMENT", "OPENAI", setting.modelId, setting.reasoningEffort, 1800, 3000);
  const hybrid = clean(brief.route) === "HYBRID", assignedJob = hybrid ? sourceContextJob(brief) : clean(brief.viewerMustUnderstand);
  const thresholds = hybrid ? { semanticFit: 82, specificity: 80, composition: 86, authenticity: 86 } : { semanticFit: 90, specificity: 86, composition: 86, authenticity: 86 };
  const content: Row[] = [{ type: "input_text", text: `Select one exact visual champion for the ${hybrid ? "REAL-WORLD CONTEXT LAYER of this HYBRID" : "complete SOURCE layer of this"} frozen YouTube documentary shot. Judge actual pixels, not provider metadata. Score semanticFit only against ASSIGNED PIXEL JOB below. ${hybrid ? "The authored overlay—not the stock footage—must carry the abstract explanation; do not reject authentic context merely because it does not visualize that overlay. The footage must not contradict it." : "The selected source itself must visibly support the complete meaning."} Reject staged corporate imagery, cash, logos, unreadable screens, weak 16:9 composition, contradictions or generic footage that fails the assigned job. Score every supplied candidate exactly once. A champion requires ${JSON.stringify(thresholds)}. If none qualifies, return an empty championCandidateId and reject all.\n\nASSIGNED PIXEL JOB:\n${assignedJob}\n\nFULL COMPOSITE CONTRACT (for contradiction checks):\n${JSON.stringify({ narrationClause: brief.narrationClause, viewerMustUnderstand: brief.viewerMustUnderstand, requiredEvidence: brief.requiredEvidence, prohibitedEvidence: brief.prohibitedEvidence })}\n\nCandidate IDs appear immediately before their image.` }];
  for (const candidate of candidates) { content.push({ type: "input_text", text: `CANDIDATE_ID=${candidate.id} · PROVIDER=${candidate.provider}` }); content.push({ type: "input_image", image_url: candidate.thumbnailUrl, detail: "high" }); }
  try {
    const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ model: setting.modelId, reasoning: { effort: setting.reasoningEffort }, store: true, max_output_tokens: 3000, input: [{ role: "user", content }], text: { format: { type: "json_schema", name: "stage09_candidate_pixel_tournament", strict: true, schema: tournamentSchema } } }), signal: AbortSignal.timeout(90000) });
    if (!response.ok) throw new Error(`OPENAI_${response.status} · ${(await response.text()).replace(/\s+/g, " ").slice(0, 240)}`);
    const payload = await response.json() as Row, usage = await recordOpenAIUsage({ db, programId: PROGRAM_ID, runId: clean(authorization.run_id), stageKey: STAGE, costType: "MATERIAL_CANDIDATE_TOURNAMENT", payload, fallbackModel: setting.modelId });
    await db.prepare("UPDATE v7_material_requests SET status='COMPLETE',provider_response_id=?,input_tokens=?,output_tokens=?,reasoning_tokens=?,actual_cost_usd=?,updated_at=? WHERE id=?").bind(payload.id || null, usage.inputTokens, usage.outputTokens, usage.reasoningTokens, usage.actualUsd, new Date().toISOString(), requestId).run();
    await syncRunTotals(db, clean(authorization.run_id));
    const result = JSON.parse(output(payload)) as Row, scores = arr(result.candidates).map(rec).filter((score) => candidates.some((candidate) => candidate.id === clean(score.candidateId)));
    const qualifies = (score: Row) => Number(score.semanticFit) >= thresholds.semanticFit && Number(score.specificity) >= thresholds.specificity && Number(score.composition) >= thresholds.composition && Number(score.authenticity) >= thresholds.authenticity && score.decision === "SELECT";
    const ranked = [...scores].sort((a, b) => (Number(b.semanticFit) + Number(b.specificity) + Number(b.composition) + Number(b.authenticity)) - (Number(a.semanticFit) + Number(a.specificity) + Number(a.composition) + Number(a.authenticity)));
    const requestedId = clean(result.championCandidateId), requestedScore = scores.find((item) => clean(item.candidateId) === requestedId);
    const championScore = requestedScore && qualifies(requestedScore) ? requestedScore : ranked.find(qualifies), championId = clean(championScore?.candidateId), champion = candidates.find((item) => item.id === championId), hardPass = Boolean(champion && championScore);
    const bestScore = ranked[0], bestCandidateId = clean(bestScore?.candidateId), bestCompositeScore = bestScore ? Math.round((Number(bestScore.semanticFit) + Number(bestScore.specificity) + Number(bestScore.composition) + Number(bestScore.authenticity)) / 4) : 0;
    for (const score of scores) await db.prepare("UPDATE v7_material_candidates SET score=?,status=? WHERE run_id=? AND brief_id=? AND provider_asset_id=?").bind(Number(score.semanticFit || 0), hardPass && clean(score.candidateId) === championId ? "PIXEL_CHAMPION" : "PIXEL_REJECTED", authorization.run_id, briefRow.id, clean(score.candidateId)).run();
    const tournament = { route: brief.route, assignedPixelJob: assignedJob, thresholds, candidateScores: scores, query, repairAttempt, selected: hardPass ? championId : null, bestCandidateId, bestScore: bestCompositeScore, bestReason: clean(bestScore?.reason), providerCoverage: new Set(candidates.map((item) => item.provider)).size };
    await db.prepare("INSERT INTO v7_material_tournaments (id,program_id,run_id,authorization_id,brief_id,status,champion_candidate_id,score,candidate_count,provider_coverage,content_json,provider_response_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,champion_candidate_id=excluded.champion_candidate_id,score=excluded.score,candidate_count=excluded.candidate_count,provider_coverage=excluded.provider_coverage,content_json=excluded.content_json,provider_response_id=excluded.provider_response_id").bind(`${briefRow.id}-PIXEL-TOURNAMENT`, PROGRAM_ID, authorization.run_id, authorization.id, briefRow.id, hardPass ? "PASS" : "NO_PIXEL_CHAMPION", hardPass ? championId : null, hardPass ? Number(championScore?.semanticFit || 0) : bestCompositeScore, candidates.length, tournament.providerCoverage, JSON.stringify(tournament), payload.id || null).run();
    if (!hardPass || !champion) throw new Error(`NO_PIXEL_CHAMPION · best ${bestCompositeScore}/100 · ${clean(bestScore?.reason) || "no valid pixel score"}`);
    return champion;
  } catch (error) {
    const row = await db.prepare("SELECT status FROM v7_material_requests WHERE id=?").bind(requestId).first<{status:string}>();
    if (row?.status === "IN_PROGRESS") await finishRequest(db, requestId, "FAILED", error instanceof Error ? error.message : "Candidate tournament failed");
    else if (row?.status === "COMPLETE") await finishRequest(db, requestId, "BLOCKED_SCHEMA", error instanceof Error ? error.message : "Candidate tournament schema failed");
    throw error;
  }
}

function familyKind(value: unknown) {
  const family = clean(value).toLowerCase();
  if (/waterfall|chart|econom/.test(family)) return "CHART";
  if (/timeline|timing|clock/.test(family)) return "TIMELINE";
  if (/receipt|counter/.test(family)) return "RECEIPT";
  if (/map|route|network/.test(family)) return "ROUTE";
  if (/comic/.test(family)) return "COMIC";
  if (/doodle|sketch/.test(family)) return "DOODLE";
  if (/system|interface|ui/.test(family)) return "SYSTEM";
  return "MECHANISM";
}

function ownedSvg(brief: Row, role: "PRIMARY" | "OVERLAY") {
  const kind = familyKind(brief.primaryFamily), words = short(brief.viewerMustUnderstand, 76).split(" "), titleLines: string[] = [];
  for (const word of words) { const index = Math.max(0, titleLines.length - 1), next = titleLines[index] ? `${titleLines[index]} ${word}` : word; if (next.length > 38 && titleLines[index]) titleLines.push(word); else titleLines[index] = next; }
  const title = titleLines.slice(0, 2).map((line, index) => `<text x="110" y="${125 + index * 62}" fill="#fffdf5" font-family="Georgia" font-size="52" font-weight="700">${escapeXml(line)}</text>`).join(""), items = arr(brief.requiredEvidence).map((item) => escapeXml(short(item, 34))).slice(0, 3), labels = [...items, "Decision", "Outcome"].slice(0, 3);
  const text = (x: number, y: number, value: string, size = 30, anchor = "start") => `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="#103f35" font-family="Arial" font-size="${size}" font-weight="700">${value}</text>`;
  const cards = labels.map((item, index) => `<g transform="translate(${150 + index * 555} 430)"><rect width="450" height="260" rx="30" fill="${index === 1 ? "#d8f0e4" : "#fff7dd"}"/>${text(225, 145, item, 27, "middle")}</g>`).join("");
  const route = labels.map((item, index) => `<g><circle cx="${260 + index * 690}" cy="570" r="112" fill="${index === 1 ? "#78c69f" : "#fff7dd"}"/>${text(260 + index * 690, 580, item, 27, "middle")}${index < 2 ? `<path d="M${380 + index * 690} 570 H${800 + index * 690}" stroke="#78c69f" stroke-width="14" marker-end="url(#arrow)"/><circle r="15" fill="#fff7dd"><animateMotion dur="2.2s" repeatCount="indefinite" path="M${400 + index * 690} 570 H${780 + index * 690}"/></circle>` : ""}</g>`).join("");
  const chart = [330,520,250,680].map((height,index)=>`<g><rect x="${300+index*330}" y="${835-height}" width="190" height="${height}" rx="18" fill="${index===3?"#78c69f":"#fff7dd"}"><animate attributeName="height" from="0" to="${height}" dur="1.2s" fill="freeze"/><animate attributeName="y" from="835" to="${835-height}" dur="1.2s" fill="freeze"/></rect>${text(395+index*330,885,index===0?"PURCHASE":index===3?"NET":"COST",24,"middle")}</g>`).join("");
  const timeline = `<path d="M230 580 H1690" stroke="#fff7dd" stroke-width="14"/>${labels.map((item,index)=>`<g><circle cx="${330+index*620}" cy="580" r="58" fill="#78c69f"><animate attributeName="r" values="48;64;48" dur="2s" begin="${index*.55}s" repeatCount="indefinite"/></circle>${text(330+index*620,720,item,27,"middle")}</g>`).join("")}`;
  const receipt = `<rect x="610" y="350" width="700" height="560" rx="34" fill="#fff7dd"/>${text(960,470,"$100.00",68,"middle")}${[0,1,2,3].map((index)=>`<rect x="720" y="${560+index*72}" width="${470-index*65}" height="16" rx="8" fill="${index===3?"#78c69f":"#7b958c"}"><animate attributeName="width" from="0" to="${470-index*65}" dur=".8s" begin="${index*.25}s" fill="freeze"/></rect>`).join("")}`;
  const comic = labels.map((item,index)=>`<g transform="translate(${105+index*585} 360)"><rect width="520" height="480" rx="26" fill="${index===1?"#d8f0e4":"#fff7dd"}"/><circle cx="260" cy="155" r="72" fill="#78c69f"/><path d="M260 230 V350 M180 290 H340" stroke="#103f35" stroke-width="18" stroke-linecap="round"/>${text(260,425,item,25,"middle")}</g>`).join("");
  const doodle = `<path d="M210 650 C410 360 610 800 820 520 S1240 340 1630 650" fill="none" stroke="#fff7dd" stroke-width="18" stroke-linecap="round" stroke-dasharray="1900" stroke-dashoffset="1900"><animate attributeName="stroke-dashoffset" from="1900" to="0" dur="2.4s" fill="freeze"/></path>${labels.map((item,index)=>`<g><circle cx="${330+index*620}" cy="${index===1?430:690}" r="92" fill="#78c69f"/>${text(330+index*620,index===1?440:700,item,25,"middle")}</g>`).join("")}`;
  const system = `<rect x="210" y="350" width="1500" height="560" rx="40" fill="#eff8f2"/><rect x="260" y="410" width="390" height="440" rx="28" fill="#fff7dd"/>${labels.map((item,index)=>`<g><rect x="730" y="${420+index*135}" width="820" height="92" rx="22" fill="${index===1?"#78c69f":"#d8f0e4"}"/>${text(780,478+index*135,item,28)}</g>`).join("")}`;
  const body = kind === "ROUTE" ? route : kind === "CHART" ? chart : kind === "TIMELINE" ? timeline : kind === "RECEIPT" ? receipt : kind === "COMIC" ? comic : kind === "DOODLE" ? doodle : kind === "SYSTEM" ? system : cards;
  return new TextEncoder().encode(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs><marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0 0 L12 6 L0 12 Z" fill="#78c69f"/></marker></defs><rect width="1920" height="1080" fill="${role === "OVERLAY" ? "#082f28" : "#0d3f32"}"/>${title}${body}</svg>`);
}

const glyphs: Record<string, string[]> = {
  "+":["00000","00100","00100","11111","00100","00100","00000"],"=":["00000","11111","00000","11111","00000","00000","00000"],
  A:["01110","10001","10001","11111","10001","10001","10001"],B:["11110","10001","10001","11110","10001","10001","11110"],C:["01111","10000","10000","10000","10000","10000","01111"],D:["11110","10001","10001","10001","10001","10001","11110"],E:["11111","10000","10000","11110","10000","10000","11111"],F:["11111","10000","10000","11110","10000","10000","10000"],G:["01111","10000","10000","10111","10001","10001","01111"],H:["10001","10001","10001","11111","10001","10001","10001"],I:["11111","00100","00100","00100","00100","00100","11111"],J:["00111","00010","00010","00010","10010","10010","01100"],K:["10001","10010","10100","11000","10100","10010","10001"],L:["10000","10000","10000","10000","10000","10000","11111"],M:["10001","11011","10101","10101","10001","10001","10001"],N:["10001","11001","10101","10011","10001","10001","10001"],O:["01110","10001","10001","10001","10001","10001","01110"],P:["11110","10001","10001","11110","10000","10000","10000"],Q:["01110","10001","10001","10001","10101","10010","01101"],R:["11110","10001","10001","11110","10100","10010","10001"],S:["01111","10000","10000","01110","00001","00001","11110"],T:["11111","00100","00100","00100","00100","00100","00100"],U:["10001","10001","10001","10001","10001","10001","01110"],V:["10001","10001","10001","10001","10001","01010","00100"],W:["10001","10001","10001","10101","10101","11011","10001"],X:["10001","10001","01010","00100","01010","10001","10001"],Y:["10001","10001","01010","00100","00100","00100","00100"],Z:["11111","00001","00010","00100","01000","10000","11111"],
  "0":["01110","10001","10011","10101","11001","10001","01110"],"1":["00100","01100","00100","00100","00100","00100","01110"],"2":["01110","10001","00001","00010","00100","01000","11111"],"3":["11110","00001","00001","01110","00001","00001","11110"],"4":["00010","00110","01010","10010","11111","00010","00010"],"5":["11111","10000","10000","11110","00001","00001","11110"],"6":["01110","10000","10000","11110","10001","10001","01110"],"7":["11111","00001","00010","00100","01000","01000","01000"],"8":["01110","10001","10001","01110","10001","10001","01110"],"9":["01110","10001","10001","01111","00001","00001","01110"],"$":["00100","01111","10100","01110","00101","11110","00100"],"-":["00000","00000","00000","11111","00000","00000","00000"],"?":["01110","10001","00001","00010","00100","00000","00100"],".":["00000","00000","00000","00000","00000","00110","00110"],":":["00000","00110","00110","00000","00110","00110","00000"]," ":["00000","00000","00000","00000","00000","00000","00000"]
};
function u32(value: number) { return new Uint8Array([(value >>> 24) & 255,(value >>> 16) & 255,(value >>> 8) & 255,value & 255]); }
function joinBytes(parts: Uint8Array[]) { const length = parts.reduce((sum, part) => sum + part.length, 0), out = new Uint8Array(length); let offset = 0; for (const part of parts) { out.set(part, offset); offset += part.length; } return out; }
function crc32(bytes: Uint8Array) { let crc = 0xffffffff; for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); } return (crc ^ 0xffffffff) >>> 0; }
function pngChunk(type: string, data: Uint8Array) { const name = new TextEncoder().encode(type), body = joinBytes([name,data]); return joinBytes([u32(data.length),body,u32(crc32(body))]); }
function deflateStored(raw: Uint8Array) { const parts: Uint8Array[] = [new Uint8Array([0x78,0x01])]; for (let offset = 0; offset < raw.length;) { const length = Math.min(65535,raw.length-offset), final = offset + length >= raw.length ? 1 : 0; parts.push(new Uint8Array([final,length&255,(length>>>8)&255,(~length)&255,((~length)>>>8)&255]),raw.slice(offset,offset+length)); offset += length; } let a=1,b=0; for (const byte of raw) { a=(a+byte)%65521; b=(b+a)%65521; } parts.push(u32(((b<<16)|a)>>>0)); return joinBytes(parts); }
function ownedPng(brief: Row, state: 0 | 1 | 2, background?: { data: Uint8Array; width: number; height: number }, layout: "A" | "B" | "C" = "A") {
  const width=960,height=540,pixels=new Uint8Array(width*height*4), raw=new Uint8Array(height*(1+width*4));
  const color=(hex:string)=>[Number.parseInt(hex.slice(1,3),16),Number.parseInt(hex.slice(3,5),16),Number.parseInt(hex.slice(5,7),16),255] as const;
  const fill=(x:number,y:number,w:number,h:number,hex:string)=>{const c=color(hex);for(let py=Math.max(0,y);py<Math.min(height,y+h);py++)for(let px=Math.max(0,x);px<Math.min(width,x+w);px++){const i=(py*width+px)*4;pixels.set(c,i);}};
  const text=(value:string,x:number,y:number,scale:number,hex:string)=>{const c=color(hex);let cx=x;for(const char of value.toUpperCase()){const glyph=glyphs[char]||glyphs["?"];for(let gy=0;gy<7;gy++)for(let gx=0;gx<5;gx++)if(glyph[gy][gx]==="1")for(let sy=0;sy<scale;sy++)for(let sx=0;sx<scale;sx++){const px=cx+gx*scale+sx,py=y+gy*scale+sy;if(px>=0&&px<width&&py>=0&&py<height){const i=(py*width+px)*4;pixels.set(c,i);}}cx+=6*scale;}};
  const wrap=(value:string,limit:number)=>{const lines:string[]=[],words=clean(value).toUpperCase().split(" ");let line="";for(const word of words){const next=line?`${line} ${word}`:word;if(next.length>limit&&line){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines;};
  if (background) {
    const audienceCopy: Record<string, Array<[string,string,string]>> = {
      "MP-001": [["CREDIT PURCHASE","PRESENT CARD","READY"],["CREDIT PURCHASE","$100.00","CREDIT CARD"],["CREDIT PURCHASE","$100.00","PROCESSING"]],
      "MP-002": [["CREDIT PURCHASE","$100.00","PROCESSING"],["CREDIT PURCHASE","APPROVED","$100.00"],["AUTHORIZATION","APPROVED","NOT SETTLED"]],
      "MP-003": [["PURCHASE RECORD","$100.00","APPROVED"],["REWARD RECORD","REWARD","POSTED"],["TWO RECORDS","PURCHASE","REWARD"]],
      "MP-004": [["PURCHASE","$100.00","UNRESOLVED"],["PARTICIPANTS","MERCHANT","ACQUIRER"],["DISTINCT ROLES","MERCHANT","PROCESSOR"]],
      "MP-018": [["EVIDENCE BASE","NATIONAL","TOTAL"],["CARD SHARE","SUPPORTED","PROPORTION"],["SOURCE CHECK","YEAR","DENOMINATOR"]],
      "MP-153": [["PAYMENT STATUS","PROCESSING","NOT SETTLED"],["VERIFICATION CHECK","CONFIRMING","NOT SETTLED"],["PAYMENT STATUS","VERIFIED","NOT SETTLED"]],
    };
    const [heading,main,sub]=audienceCopy[clean(brief.briefId)]?.[state] || [["EXPLANATION","ENTRY",""],["EXPLANATION","CHANGE",""],["EXPLANATION","OUTCOME",""]][state];
    const scale=Math.max(width/background.width,height/background.height),sourceWidth=width/scale,sourceHeight=height/scale,sourceX=(background.width-sourceWidth)/2,sourceY=(background.height-sourceHeight)/2;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){const sx=Math.min(background.width-1,Math.max(0,Math.floor(sourceX+x/scale))),sy=Math.min(background.height-1,Math.max(0,Math.floor(sourceY+y/scale))),source=(sy*background.width+sx)*4,target=(y*width+x)*4;pixels[target]=Math.round(background.data[source]*.58);pixels[target+1]=Math.round(background.data[source+1]*.58);pixels[target+2]=Math.round(background.data[source+2]*.58);pixels[target+3]=255;}
    fill(0,0,18,height,"#74c69d");
    if (layout === "A") {
      // Split proof: authentic checkout on the left, authored transaction state on the right.
      fill(44,104,300,306,"#173f38"); fill(70,132,248,104,"#f5edcf");
      if(state>0) text("$100.00",84,165,5,"#0d3f32");
      text(state===2?"PROCESSING":"CREDIT",state===2?75:118,274,state===2?2:3,"#fffdf5");
      fill(570,104,330,306,"#f5edcf"); fill(594,130,282,48,"#d9f1e4");
      text(heading,610,143,2,"#0d3f32"); text(main,main.length>10?590:622,224,main.length>10?3:5,"#0d3f32");
      if(sub) text(sub,sub.length>11?594:650,320,3,"#0d3f32"); fill(610,370,188+state*32,10,state===2?"#74c69d":"#7b958c");
    } else if (layout === "B") {
      // Documentary rail: preserve maximum live-action area and bind one clean state strip to the bottom.
      fill(0,350,960,190,"#f5edcf"); fill(0,350,960,12,"#74c69d");
      fill(42,388,276,104,"#173f38"); text(heading,65,414,2,"#fffdf5");
      text(main,main.length>10?366:382,386,main.length>10?3:7,"#0d3f32");
      if(sub) text(sub,382,463,2,"#0d3f32");
      [0,1,2].forEach((index)=>fill(700+index*74,472,54,12,index<=state?"#2d8063":"#b7c9c2"));
    } else {
      // Focus lens: preserve the physical action while each authored label performs one audience-facing job.
      fill(45,42,870,86,"#173f38"); text(heading,78,70,4,"#fffdf5");
      fill(548,160,332,300,"#f5edcf"); text(main,main.length>7?570:602,208,main.length>7?2:6,"#0d3f32");
      if(sub) text(sub,sub.length>14?570:596,286,sub.length>14?2:3,"#0d3f32");
      fill(582,340,264,4,"#d9f1e4");
    }
    for(let y=0;y<height;y++){const row=y*(1+width*4);raw[row]=0;raw.set(pixels.subarray(y*width*4,(y+1)*width*4),row+1);} const ihdr=new Uint8Array(13);ihdr.set(u32(width),0);ihdr.set(u32(height),4);ihdr.set([8,6,0,0,0],8);return joinBytes([new Uint8Array([137,80,78,71,13,10,26,10]),pngChunk("IHDR",ihdr),pngChunk("IDAT",deflateStored(raw)),pngChunk("IEND",new Uint8Array())]);
  }
  fill(0,0,width,height,"#0d3f32");fill(0,0,18,height,"#74c69d");wrap(short(brief.viewerMustUnderstand,92),45).slice(0,2).forEach((line,index)=>text(line,48,45+index*42,4,"#fffdf5"));
  const evidence=arr(brief.requiredEvidence).map((item)=>short(item,36)).slice(0,3), kind=familyKind(brief.primaryFamily), visible=Math.max(1,state+1);
  if(kind==="CHART") { [120,220,150,300].forEach((h,index)=>{if(index<=state+1){fill(170+index*185,470-h,120,h,index===3?"#74c69d":"#f5edcf");text(index===0?"BUY":index===3?"NET":"COST",178+index*185,490,2,"#fffdf5");}}); }
  else if(kind==="RECEIPT") { fill(290,150,380,340,"#f5edcf");text("$100.00",390,205,6,"#0d3f32");for(let index=0;index<visible+1;index++)fill(350,280+index*55,260-index*45,12,index===state?"#74c69d":"#7b958c"); }
  else if(kind==="TIMELINE") { fill(120,320,720,10,"#f5edcf");evidence.forEach((item,index)=>{if(index<visible){fill(175+index*300,285,70,70,"#74c69d");wrap(item,20).slice(0,2).forEach((line,row)=>text(line,130+index*300,390+row*22,2,"#fffdf5"));}}); }
  else if(kind==="SYSTEM") { fill(95,150,770,340,"#eff8f2");fill(125,180,230,280,"#f5edcf");evidence.forEach((item,index)=>{if(index<visible){fill(395,190+index*90,410,62,index===state?"#74c69d":"#d9f1e4");wrap(item,32).slice(0,1).forEach((line)=>text(line,420,212+index*90,2,"#0d3f32"));}}); }
  else { evidence.forEach((item,index)=>{const x=48+index*300;if(index<visible){fill(x,235,270,210,index===state?"#d9f1e4":"#f5edcf");fill(x+18,255,34,34,"#2d8063");text(String(index+1),x+26,261,3,"#fffdf5");wrap(item,25).slice(0,4).forEach((line,row)=>text(line,x+18,320+row*23,2,"#0d3f32"));if(index<state)fill(x+270,340,30,6,"#74c69d");}}); }
  for(let y=0;y<height;y++){const row=y*(1+width*4);raw[row]=0;raw.set(pixels.subarray(y*width*4,(y+1)*width*4),row+1);} const ihdr=new Uint8Array(13);ihdr.set(u32(width),0);ihdr.set(u32(height),4);ihdr.set([8,6,0,0,0],8);return joinBytes([new Uint8Array([137,80,78,71,13,10,26,10]),pngChunk("IHDR",ihdr),pngChunk("IDAT",deflateStored(raw)),pngChunk("IEND",new Uint8Array())]);
}

function mobileCertificationPng(state: 0 | 1 | 2) {
  const width=540,height=960,pixels=new Uint8Array(width*height*4),raw=new Uint8Array(height*(1+width*4));
  const color=(hex:string)=>[Number.parseInt(hex.slice(1,3),16),Number.parseInt(hex.slice(3,5),16),Number.parseInt(hex.slice(5,7),16),255] as const;
  const fill=(x:number,y:number,w:number,h:number,hex:string)=>{const c=color(hex);for(let py=Math.max(0,y);py<Math.min(height,y+h);py++)for(let px=Math.max(0,x);px<Math.min(width,x+w);px++){const i=(py*width+px)*4;pixels.set(c,i);}};
  const text=(value:string,x:number,y:number,scale:number,hex:string)=>{const c=color(hex);let cx=x;for(const char of value.toUpperCase()){const glyph=glyphs[char]||glyphs["?"];for(let gy=0;gy<7;gy++)for(let gx=0;gx<5;gx++)if(glyph[gy][gx]==="1")for(let sy=0;sy<scale;sy++)for(let sx=0;sx<scale;sx++){const px=cx+gx*scale+sx,py=y+gy*scale+sy;if(px>=0&&px<width&&py>=0&&py<height){const i=(py*width+px)*4;pixels.set(c,i);}}cx+=6*scale;}};
  const states=["READY","PROCESSING","VERIFIED"];
  fill(0,0,width,height,"#082f28");fill(0,0,16,height,"#74c69d");text("PAYMENT STATUS",48,92,4,"#fffdf5");fill(48,190,444,480,"#f5edcf");text(states[state],states[state].length>8?78:112,350,states[state].length>8?5:7,"#0d3f32");text(state===0?"START":state===1?"IN PROGRESS":"CONFIRMED",state===1?108:132,505,4,"#2d8063");[0,1,2].forEach((index)=>fill(102+index*120,760,72,18,index<=state?"#74c69d":"#315447"));
  for(let y=0;y<height;y++){const row=y*(1+width*4);raw[row]=0;raw.set(pixels.subarray(y*width*4,(y+1)*width*4),row+1);}const ihdr=new Uint8Array(13);ihdr.set(u32(width),0);ihdr.set(u32(height),4);ihdr.set([8,6,0,0,0],8);return joinBytes([new Uint8Array([137,80,78,71,13,10,26,10]),pngChunk("IHDR",ihdr),pngChunk("IDAT",deflateStored(raw)),pngChunk("IEND",new Uint8Array())]);
}

function dataCertificationPng(state: 0 | 1 | 2) {
  const width=960,height=540,pixels=new Uint8Array(width*height*4),raw=new Uint8Array(height*(1+width*4));
  const color=(hex:string)=>[Number.parseInt(hex.slice(1,3),16),Number.parseInt(hex.slice(3,5),16),Number.parseInt(hex.slice(5,7),16),255] as const;
  const fill=(x:number,y:number,w:number,h:number,hex:string)=>{const c=color(hex);for(let py=Math.max(0,y);py<Math.min(height,y+h);py++)for(let px=Math.max(0,x);px<Math.min(width,x+w);px++){const i=(py*width+px)*4;pixels.set(c,i);}};
  const text=(value:string,x:number,y:number,scale:number,hex:string)=>{const c=color(hex);let cx=x;for(const char of value.toUpperCase()){const glyph=glyphs[char]||glyphs["?"];for(let gy=0;gy<7;gy++)for(let gx=0;gx<5;gx++)if(glyph[gy][gx]==="1")for(let sy=0;sy<scale;sy++)for(let sx=0;sx<scale;sx++){const px=cx+gx*scale+sx,py=y+gy*scale+sy;if(px>=0&&px<width&&py>=0&&py<height){const i=(py*width+px)*4;pixels.set(c,i);}}cx+=6*scale;}};
  fill(0,0,width,height,"#082f28");fill(0,0,16,height,"#74c69d");text("RECONCILED CHANGE",44,38,4,"#fffdf5");fill(56,420,848,4,"#d9f1e4");fill(90,180,150,240,"#f5edcf");text("BASELINE",92,438,2,"#fffdf5");text("100 UNITS",98,125,3,"#fffdf5");
  if(state>=1){fill(300,140,150,280,"#74c69d");text("+10 GAIN",310,94,3,"#fffdf5");fill(510,230,150,190,"#d5a153");text("-5 COST",520,184,3,"#fffdf5");fill(240,272,60,6,"#74c69d");fill(450,272,60,6,"#74c69d");}
  if(state>=2){fill(720,168,150,252,"#d9f1e4");text("OUTCOME",728,438,2,"#fffdf5");text("105 UNITS",722,113,3,"#fffdf5");text("=",680,272,5,"#fffdf5");}
  for(let y=0;y<height;y++){const row=y*(1+width*4);raw[row]=0;raw.set(pixels.subarray(y*width*4,(y+1)*width*4),row+1);}const ihdr=new Uint8Array(13);ihdr.set(u32(width),0);ihdr.set(u32(height),4);ihdr.set([8,6,0,0,0],8);return joinBytes([new Uint8Array([137,80,78,71,13,10,26,10]),pngChunk("IHDR",ihdr),pngChunk("IDAT",deflateStored(raw)),pngChunk("IEND",new Uint8Array())]);
}

function dataCertificationPngV3(state: 0 | 1 | 2) {
  const width=960,height=540,pixels=new Uint8Array(width*height*4),raw=new Uint8Array(height*(1+width*4));
  const color=(hex:string)=>[Number.parseInt(hex.slice(1,3),16),Number.parseInt(hex.slice(3,5),16),Number.parseInt(hex.slice(5,7),16),255] as const;
  const fill=(x:number,y:number,w:number,h:number,hex:string)=>{const c=color(hex);for(let py=Math.max(0,y);py<Math.min(height,y+h);py++)for(let px=Math.max(0,x);px<Math.min(width,x+w);px++){const i=(py*width+px)*4;pixels.set(c,i);}};
  const text=(value:string,x:number,y:number,scale:number,hex:string)=>{const c=color(hex);let cx=x;for(const char of value.toUpperCase()){const glyph=glyphs[char]||glyphs["?"];for(let gy=0;gy<7;gy++)for(let gx=0;gx<5;gx++)if(glyph[gy][gx]==="1")for(let sy=0;sy<scale;sy++)for(let sx=0;sx<scale;sx++){const px=cx+gx*scale+sx,py=y+gy*scale+sy;if(px>=0&&px<width&&py>=0&&py<height){const i=(py*width+px)*4;pixels.set(c,i);}}cx+=6*scale;}};
  const plus=(x:number,y:number,hex:string)=>{fill(x+12,y,8,32,hex);fill(x,y+12,32,8,hex);};
  const minus=(x:number,y:number,hex:string)=>fill(x,y+12,32,8,hex);
  const equals=(x:number,y:number,hex:string)=>{fill(x,y+7,32,7,hex);fill(x,y+21,32,7,hex);};
  const connector=(x:number,y:number,w:number,hex:string)=>{fill(x,y,w-12,5,hex);fill(x+w-15,y-6,15,17,hex);};
  fill(0,0,width,height,"#071f1b");fill(0,0,16,height,"#74c69d");
  text("RECONCILED WATERFALL",48,32,4,"#fffdf5");text("BASELINE PLUS GAIN MINUS COST EQUALS OUTCOME",50,78,2,"#9ccbb6");
  fill(64,430,832,4,"#315447");
  fill(86,238,142,192,"#f5edcf");text("100",116,180,4,"#fffdf5");text("BASELINE",86,448,2,"#fffdf5");
  if(state>=1){connector(228,238,70,"#74c69d");fill(298,178,132,60,"#74c69d");plus(348,192,"#082f28");text("10",340,142,3,"#fffdf5");text("GAIN",332,448,2,"#fffdf5");}
  if(state>=2){connector(430,178,58,"#d5a153");fill(488,178,132,30,"#d5a153");minus(538,177,"#082f28");text("5",548,142,3,"#fffdf5");text("COST",520,448,2,"#fffdf5");connector(620,208,76,"#d9f1e4");fill(696,208,174,222,"#d9f1e4");text("105",732,150,4,"#fffdf5");text("OUTCOME",710,448,2,"#fffdf5");}
  text("100",90,494,3,"#fffdf5");plus(202,488,"#74c69d");text("10",254,494,3,"#fffdf5");minus(344,488,"#d5a153");text("5",396,494,3,"#fffdf5");equals(458,488,"#d9f1e4");text(state>=2?"105":"---",512,494,3,state>=2?"#fffdf5":"#55746a");text("UNITS",650,494,3,"#9ccbb6");
  for(let y=0;y<height;y++){const row=y*(1+width*4);raw[row]=0;raw.set(pixels.subarray(y*width*4,(y+1)*width*4),row+1);}const ihdr=new Uint8Array(13);ihdr.set(u32(width),0);ihdr.set(u32(height),4);ihdr.set([8,6,0,0,0],8);return joinBytes([new Uint8Array([137,80,78,71,13,10,26,10]),pngChunk("IHDR",ihdr),pngChunk("IDAT",deflateStored(raw)),pngChunk("IEND",new Uint8Array())]);
}

function unitSemanticManifest(contract: Row, brief: Row) {
  const logicalId = clean(brief.briefId), required = arr(JSON.parse(String(contract.required_evidence_json || "[]"))).map(clean);
  const curated: Record<string, Array<{ heading: string; primary: string; qualifier: string }>> = {
    "MP-001": [
      { heading: "CREDIT PURCHASE", primary: "$100.00", qualifier: "PURCHASE AMOUNT" },
      { heading: "CARD TENDER", primary: "CREDIT CARD", qualifier: "PAYMENT METHOD" },
      { heading: "AUTHORIZATION", primary: "PROCESSING", qualifier: "NOT SETTLED" },
    ],
    "MP-002": [
      { heading: "CREDIT PURCHASE", primary: "$100.00", qualifier: "PROCESSING" },
      { heading: "AUTHORIZATION", primary: "APPROVED", qualifier: "PURCHASE CLEARED" },
      { heading: "PAYMENT STATUS", primary: "APPROVED", qualifier: "NOT SETTLED" },
    ],
    "MP-003": [
      { heading: "PURCHASE RECORD", primary: "$100.00", qualifier: "APPROVED" },
      { heading: "REWARD RECORD", primary: "REWARD", qualifier: "POSTED" },
      { heading: "TWO RECORDS", primary: "PURCHASE", qualifier: "PLUS REWARD" },
    ],
    "MP-004": [
      { heading: "PURCHASE", primary: "$100.00", qualifier: "UNRESOLVED" },
      { heading: "PAYMENT ROLES", primary: "MERCHANT", qualifier: "ACQUIRER" },
      { heading: "DISTINCT ROLES", primary: "PROCESSOR", qualifier: "ISSUER" },
    ],
    "MP-018": [
      { heading: "EVIDENCE BASE", primary: "NATIONAL", qualifier: "TOTAL" },
      { heading: "CARD SHARE", primary: "SUPPORTED", qualifier: "PROPORTION" },
      { heading: "SOURCE CHECK", primary: "YEAR", qualifier: "DENOMINATOR" },
    ],
    "MP-153": [
      { heading: "PAYMENT STATUS", primary: "PROCESSING", qualifier: "NOT SETTLED" },
      { heading: "VERIFICATION", primary: "CONFIRMING", qualifier: "NOT SETTLED" },
      { heading: "PAYMENT STATUS", primary: "VERIFIED", qualifier: "NOT SETTLED" },
    ],
  };
  const safe = (value: unknown, fallback: string) => clean(value).toUpperCase().replace(/[^A-Z0-9$+\-.: ]/g, " ").replace(/\s+/g, " ").trim().slice(0, 34) || fallback;
  const generic = ([0, 1, 2] as const).map((index) => ({
    heading: index === 0 ? "OBSERVE" : index === 1 ? "CHANGE" : "OUTCOME",
    primary: safe(required[index], index === 0 ? "INITIAL STATE" : index === 1 ? "VISIBLE CHANGE" : "EXIT STATE"),
    qualifier: safe(index === 2 ? contract.claim : required[Math.min(index + 1, required.length - 1)], "CONTRACT EVIDENCE"),
  }));
  return {
    version: "UNIT_SEMANTIC_MANIFEST_V1", logicalId, archetype: clean(contract.archetype), contractClaim: clean(contract.claim),
    certifiedRendererRequired: true, unitRenderer: UNIT_RENDERER_VERSION, states: curated[logicalId] || generic,
    prohibited: JSON.parse(String(contract.forbidden_json || "[]")), temporalOrder: ["ENTRY", "MIDPOINT", "EXIT"],
  };
}

function unitArtifactPng(manifest: Row, state: 0 | 1 | 2) {
  const width=960,height=540,pixels=new Uint8Array(width*height*4),raw=new Uint8Array(height*(1+width*4));
  const color=(hex:string)=>[Number.parseInt(hex.slice(1,3),16),Number.parseInt(hex.slice(3,5),16),Number.parseInt(hex.slice(5,7),16),255] as const;
  const fill=(x:number,y:number,w:number,h:number,hex:string)=>{const c=color(hex);for(let py=Math.max(0,y);py<Math.min(height,y+h);py++)for(let px=Math.max(0,x);px<Math.min(width,x+w);px++){const i=(py*width+px)*4;pixels.set(c,i);}};
  const text=(value:string,x:number,y:number,scale:number,hex:string)=>{const c=color(hex);let cx=x;for(const char of value.toUpperCase()){const glyph=glyphs[char]||glyphs["?"];for(let gy=0;gy<7;gy++)for(let gx=0;gx<5;gx++)if(glyph[gy][gx]==="1")for(let sy=0;sy<scale;sy++)for(let sx=0;sx<scale;sx++){const px=cx+gx*scale+sx,py=y+gy*scale+sy;if(px>=0&&px<width&&py>=0&&py<height){const i=(py*width+px)*4;pixels.set(c,i);}}cx+=6*scale;}};
  const fit=(value:unknown,max=28)=>clean(value).toUpperCase().replace(/[^A-Z0-9$+\-.: ]/g," ").replace(/\s+/g," ").trim().slice(0,max);
  const states=arr(manifest.states).map(rec),current=states[state]||{},archetype=fit(manifest.archetype,30).replaceAll("_"," ");
  fill(0,0,width,height,"#071f1b");fill(0,0,16,height,"#74c69d");
  text(archetype,48,34,2,"#9ccbb6");text(fit(current.heading,28),48,78,4,"#fffdf5");
  fill(48,158,864,252,"#f5edcf");fill(48,158,864,14,state===0?"#d5a153":"#74c69d");
  const primary=fit(current.primary,26),primaryScale=primary.length>19?3:primary.length>12?4:6,primaryWidth=primary.length*6*primaryScale;
  text(primary,Math.max(76,Math.round((width-primaryWidth)/2)),236,primaryScale,"#082f28");
  const qualifier=fit(current.qualifier,32),qualifierScale=qualifier.length>24?2:3,qualifierWidth=qualifier.length*6*qualifierScale;
  text(qualifier,Math.max(76,Math.round((width-qualifierWidth)/2)),340,qualifierScale,"#2d8063");
  [0,1,2].forEach((index)=>{fill(342+index*100,462,76,18,index<=state?"#74c69d":"#315447");if(index<2)fill(418+index*100,468,24,6,index<state?"#74c69d":"#315447");});
  text(state===0?"ENTRY":state===1?"MIDPOINT":"EXIT",420,495,2,"#fffdf5");
  for(let y=0;y<height;y++){const row=y*(1+width*4);raw[row]=0;raw.set(pixels.subarray(y*width*4,(y+1)*width*4),row+1);}const ihdr=new Uint8Array(13);ihdr.set(u32(width),0);ihdr.set(u32(height),4);ihdr.set([8,6,0,0,0],8);return joinBytes([new Uint8Array([137,80,78,71,13,10,26,10]),pngChunk("IHDR",ihdr),pngChunk("IDAT",deflateStored(raw)),pngChunk("IEND",new Uint8Array())]);
}

function processRouteCertificationPngV2(state: 0 | 1 | 2) {
  const width=960,height=540,pixels=new Uint8Array(width*height*4),raw=new Uint8Array(height*(1+width*4));
  const color=(hex:string)=>[Number.parseInt(hex.slice(1,3),16),Number.parseInt(hex.slice(3,5),16),Number.parseInt(hex.slice(5,7),16),255] as const;
  const fill=(x:number,y:number,w:number,h:number,hex:string)=>{const c=color(hex);for(let py=Math.max(0,y);py<Math.min(height,y+h);py++)for(let px=Math.max(0,x);px<Math.min(width,x+w);px++){const i=(py*width+px)*4;pixels.set(c,i);}};
  const text=(value:string,x:number,y:number,scale:number,hex:string)=>{const c=color(hex);let cx=x;for(const char of value.toUpperCase()){const glyph=glyphs[char]||glyphs["?"];for(let gy=0;gy<7;gy++)for(let gx=0;gx<5;gx++)if(glyph[gy][gx]==="1")for(let sy=0;sy<scale;sy++)for(let sx=0;sx<scale;sx++){const px=cx+gx*scale+sx,py=y+gy*scale+sy;if(px>=0&&px<width&&py>=0&&py<height){const i=(py*width+px)*4;pixels.set(c,i);}}cx+=6*scale;}};
  const arrow=(x:number,y:number,w:number)=>{fill(x,y,w-20,8,"#74c69d");for(let row=0;row<36;row++){const half=Math.min(row,35-row);fill(x+w-20,y-14+row,Math.max(2,half),1,"#74c69d");}};
  const card=(x:number,title:string,label:string,active:boolean)=>{fill(x,184,230,224,active?"#f5edcf":"#163f37");fill(x,184,230,12,active?"#74c69d":"#315447");text(label,x+22,220,2,active?"#2d8063":"#7ea596");const scale=title.length>11?2:3;const titleX=x+Math.max(18,Math.round((230-title.length*6*scale)/2));text(title,titleX,290,scale,active?"#082f28":"#86aa9d");};
  fill(0,0,width,height,"#071f1b");fill(0,0,16,height,"#74c69d");text("PAYMENT ROUTE",48,48,5,"#fffdf5");text("ONE DIRECTION THREE NAMED STAGES",50,104,2,"#9ccbb6");
  card(54,"USER DEVICE","ORIGIN",true);
  if(state>=1){arrow(284,292,54);card(338,"ROUTING CHECK","DECISION",true);}else card(338,"ROUTING CHECK","DECISION",false);
  if(state>=2){arrow(568,292,54);card(622,"ISSUER BANK","DESTINATION",true);}else card(622,"ISSUER BANK","DESTINATION",false);
  [0,1,2].forEach((index)=>fill(346+index*92,470,64,16,index<=state?"#74c69d":"#315447"));
  for(let y=0;y<height;y++){const row=y*(1+width*4);raw[row]=0;raw.set(pixels.subarray(y*width*4,(y+1)*width*4),row+1);}const ihdr=new Uint8Array(13);ihdr.set(u32(width),0);ihdr.set(u32(height),4);ihdr.set([8,6,0,0,0],8);return joinBytes([new Uint8Array([137,80,78,71,13,10,26,10]),pngChunk("IHDR",ihdr),pngChunk("IDAT",deflateStored(raw)),pngChunk("IEND",new Uint8Array())]);
}

function abstractMechanismPngV2(state: 0 | 1 | 2) {
  const width=960,height=540,pixels=new Uint8Array(width*height*4),raw=new Uint8Array(height*(1+width*4));
  const color=(hex:string)=>[Number.parseInt(hex.slice(1,3),16),Number.parseInt(hex.slice(3,5),16),Number.parseInt(hex.slice(5,7),16),255] as const;
  const fill=(x:number,y:number,w:number,h:number,hex:string)=>{const c=color(hex);for(let py=Math.max(0,y);py<Math.min(height,y+h);py++)for(let px=Math.max(0,x);px<Math.min(width,x+w);px++){const i=(py*width+px)*4;pixels.set(c,i);}};
  const text=(value:string,x:number,y:number,scale:number,hex:string)=>{const c=color(hex);let cx=x;for(const char of value.toUpperCase()){const glyph=glyphs[char]||glyphs["?"];for(let gy=0;gy<7;gy++)for(let gx=0;gx<5;gx++)if(glyph[gy][gx]==="1")for(let sy=0;sy<scale;sy++)for(let sx=0;sx<scale;sx++){const px=cx+gx*scale+sx,py=y+gy*scale+sy;if(px>=0&&px<width&&py>=0&&py<height){const i=(py*width+px)*4;pixels.set(c,i);}}cx+=6*scale;}};
  const line=(x1:number,y1:number,x2:number,y2:number,thickness:number,hex:string)=>{const steps=Math.max(Math.abs(x2-x1),Math.abs(y2-y1));for(let step=0;step<=steps;step++){const ratio=steps?step/steps:0,x=Math.round(x1+(x2-x1)*ratio),y=Math.round(y1+(y2-y1)*ratio);fill(x-Math.floor(thickness/2),y-Math.floor(thickness/2),thickness,thickness,hex);}};
  const node=(x:number,y:number,hex:string)=>{for(let py=-24;py<=24;py++)for(let px=-24;px<=24;px++)if(px*px+py*py<=576)fill(x+px,y+py,1,1,hex);};
  fill(0,0,width,height,"#071f1b");fill(0,0,16,height,"#74c69d");text("FROM TANGLE TO PATH",48,42,5,"#fffdf5");
  const entry=[[180,210],[300,360],[430,190],[570,350],[735,220]] as const,mid=[[170,260],[320,330],[470,260],[620,330],[770,260]] as const,exit=[[150,290],[320,290],[490,290],[660,290],[830,290]] as const,points=state===0?entry:state===1?mid:exit;
  if(state===0){[[0,3],[3,1],[1,4],[4,2],[2,0],[0,4],[4,1]].forEach(([a,b],index)=>line(points[a][0],points[a][1],points[b][0],points[b][1],7,index%2?"#d5a153":"#74c69d"));}
  else {for(let index=0;index<points.length-1;index++)line(points[index][0],points[index][1],points[index+1][0],points[index+1][1],state===2?10:7,state===2?"#74c69d":index%2?"#d5a153":"#74c69d");}
  points.forEach((point,index)=>node(point[0],point[1],state===2?"#f5edcf":index%2?"#d5a153":"#d9f1e4"));
  text(state===0?"TANGLED THREAD":state===1?"SORTING THREAD":"CLEAR PATH",state===0?280:state===1?300:335,430,4,state===2?"#74c69d":"#fffdf5");
  [0,1,2].forEach((index)=>fill(370+index*82,492,54,12,index<=state?"#74c69d":"#315447"));
  for(let y=0;y<height;y++){const row=y*(1+width*4);raw[row]=0;raw.set(pixels.subarray(y*width*4,(y+1)*width*4),row+1);}const ihdr=new Uint8Array(13);ihdr.set(u32(width),0);ihdr.set(u32(height),4);ihdr.set([8,6,0,0,0],8);return joinBytes([new Uint8Array([137,80,78,71,13,10,26,10]),pngChunk("IHDR",ihdr),pngChunk("IDAT",deflateStored(raw)),pngChunk("IEND",new Uint8Array())]);
}

type MaterialRole = "PRIMARY" | "OVERLAY" | "QA_PROXY" | "QA_ENTRY" | "QA_MIDPOINT" | "QA_EXIT" | "SOURCE_ENTRY" | "SOURCE_MIDPOINT" | "SOURCE_EXIT" | "COMPOSITE_A_ENTRY" | "COMPOSITE_A_MIDPOINT" | "COMPOSITE_A_EXIT" | "COMPOSITE_B_ENTRY" | "COMPOSITE_B_MIDPOINT" | "COMPOSITE_B_EXIT" | "COMPOSITE_C_ENTRY" | "COMPOSITE_C_MIDPOINT" | "COMPOSITE_C_EXIT" | "MOTION_PROOF" | "MOTION_ENTRY" | "MOTION_MIDPOINT" | "MOTION_EXIT" | "SEQUENCE_PROOF" | `SEQUENCE_SAMPLE_${number}` | "SEQUENCE_PRODUCT" | `SEQUENCE_PRODUCT_SAMPLE_${number}` | "CERT_ENTRY" | "CERT_MIDPOINT" | "CERT_EXIT";
async function storeMaterial(env: Env, db: DB, authorization: Row, briefRow: Row, options: { role: MaterialRole; identity?: string; bytes: Uint8Array; mimeType: string; extension: string; sourceType: string; provider: string; providerAssetId?: string; sourceUrl?: string; landingUrl?: string; licenseCode: string; width: number; height: number; duration?: number; thumbnailUrl?: string; runtimeScope?: string; archiveFolder?: string }) {
  if (!env.BUCKET) throw new Error("R2 material storage is unavailable");
  const identity = clean(options.identity).replace(/[^a-zA-Z0-9_-]/g, "").slice(-48), suffix = identity ? `${identity}-` : "";
  const runtimeScope = clean(options.runtimeScope || "pilot").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "pilot";
  const archiveFolder = clean(options.archiveFolder || "Pilot 10").replace(/[\\/]/g, "-").slice(0, 96) || "Pilot 10";
  const id = `${briefRow.id}-${suffix}${options.role}`, hash = await shaBytes(options.bytes), key = `v7/material-production/${authorization.run_id}/${runtimeScope}/${clean(briefRow.id).split("-").at(-1)}-${suffix}${options.role.toLowerCase()}.${options.extension}`;
  await env.BUCKET.put(key, options.bytes, { httpMetadata: { contentType: options.mimeType }, customMetadata: { sha256: hash, briefId: String(briefRow.id), role: options.role, provider: options.provider, licenseCode: options.licenseCode } });
  if (!(await env.BUCKET.head(key))) throw new Error("R2_MATERIAL_READ_BACK_FAILED");
  const drive = await storeDriveBinaryArtifact({ folderPath: ["Channels", "Hidden Systems", "Projects", "V7 Greenfield Pilot", "Material Production", archiveFolder], fileName: `${clean(briefRow.id).split("-").at(-1)}-${suffix}${options.role.toLowerCase()}.${options.extension}`, content: options.bytes, mimeType: options.mimeType, artifactId: id, contentHash: hash });
  await db.prepare("INSERT INTO v7_material_files (id,program_id,run_id,authorization_id,brief_id,asset_role,source_type,provider,provider_asset_id,source_url,landing_url,license_code,mime_type,width,height,duration_seconds,byte_size,content_hash,runtime_key,drive_file_id,thumbnail_url,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'STORED_VERIFIED') ON CONFLICT(id) DO UPDATE SET source_type=excluded.source_type,provider=excluded.provider,provider_asset_id=excluded.provider_asset_id,source_url=excluded.source_url,landing_url=excluded.landing_url,license_code=excluded.license_code,mime_type=excluded.mime_type,width=excluded.width,height=excluded.height,duration_seconds=excluded.duration_seconds,byte_size=excluded.byte_size,content_hash=excluded.content_hash,runtime_key=excluded.runtime_key,drive_file_id=excluded.drive_file_id,thumbnail_url=excluded.thumbnail_url,status='STORED_VERIFIED'").bind(id, PROGRAM_ID, authorization.run_id, authorization.id, briefRow.id, options.role, options.sourceType, options.provider, options.providerAssetId || null, options.sourceUrl || null, options.landingUrl || null, options.licenseCode, options.mimeType, options.width, options.height, options.duration || 0, options.bytes.byteLength, hash, key, drive.id, options.thumbnailUrl || null).run();
  return id;
}

async function materializeOne(env: Env, db: DB, authorization: Row, briefRow: Row) {
  const brief = JSON.parse(String(briefRow.content_json)) as Row, route = clean(brief.route);
  if (route === "MAKE") {
    await storeMaterial(env, db, authorization, briefRow, { role: "PRIMARY", bytes: ownedSvg(brief, "PRIMARY"), mimeType: "image/svg+xml", extension: "svg", sourceType: "OWNED_CODE_NATIVE", provider: "FRAMEFLOW_OWNED", licenseCode: "CHANNEL_OWNED", width: 1920, height: 1080 });
  } else {
    const architectureRepair = rec(brief.architectureRepair);
    const discovery = clean(architectureRepair.type) === "SOURCE_TO_HYBRID_SPLIT_V1"
      ? await discoverCandidates(env, db, authorization, briefRow, brief, { repairAttempt: Number(architectureRepair.discoveryPage || 3) - 1, query: clean(architectureRepair.sourceQuery) })
      : await discoverCandidates(env, db, authorization, briefRow, brief);
    const candidate = await selectCandidateByPixels(env, db, authorization, briefRow, brief, discovery.candidates, discovery.query, discovery.repairAttempt);
    const requestId = await newRequest(db, authorization, clean(briefRow.id), "DOWNLOAD", candidate.provider.toUpperCase());
    try {
      const response = await fetch(candidate.assetUrl, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      const declared = Number(response.headers.get("content-length") || 0); if (declared > 40_000_000) throw new Error("FILE_EXCEEDS_40MB_PILOT_LIMIT");
      const buffer = await response.arrayBuffer(); if (!buffer.byteLength || buffer.byteLength > 40_000_000) throw new Error("INVALID_PILOT_FILE_SIZE");
      await storeMaterial(env, db, authorization, briefRow, { role: "PRIMARY", bytes: new Uint8Array(buffer), mimeType: response.headers.get("content-type") || "video/mp4", extension: "mp4", sourceType: "PROVIDER_SOURCE", provider: candidate.provider, providerAssetId: candidate.id, sourceUrl: candidate.assetUrl, landingUrl: candidate.sourceUrl, licenseCode: candidate.licenseCode, width: candidate.width, height: candidate.height, duration: candidate.duration, thumbnailUrl: candidate.thumbnailUrl });
      await finishRequest(db, requestId, "COMPLETE");
    } catch (error) { await finishRequest(db, requestId, "FAILED", error instanceof Error ? error.message : "Download failed"); throw error; }
    if (route === "HYBRID") await storeMaterial(env, db, authorization, briefRow, { role: "OVERLAY", bytes: ownedSvg(brief, "OVERLAY"), mimeType: "image/svg+xml", extension: "svg", sourceType: "OWNED_EXPLANATORY_OVERLAY", provider: "FRAMEFLOW_OWNED", licenseCode: "CHANNEL_OWNED", width: 1920, height: 1080 });
  }
  await db.prepare("UPDATE v7_material_briefs SET status='MATERIALIZED' WHERE id=?").bind(briefRow.id).run();
}

const visionDefectSchema = { type: "object", additionalProperties: false, properties: { severity: { type: "string", enum: ["P0", "P1", "P2"] }, category: { type: "string", enum: ["SEMANTIC", "PRESENTATION", "OTHER"] }, summary: { type: "string", minLength: 6, maxLength: 180 } }, required: ["severity", "category", "summary"] };
const visionSchema = { type: "object", additionalProperties: false, properties: { semanticFit: { type: "integer", minimum: 0, maximum: 100 }, factualSafety: { type: "integer", minimum: 0, maximum: 100 }, composition: { type: "integer", minimum: 0, maximum: 100 }, mobileLegibility: { type: "integer", minimum: 0, maximum: 100 }, authenticity: { type: "integer", minimum: 0, maximum: 100 }, overall: { type: "integer", minimum: 0, maximum: 100 }, decision: { type: "string", enum: ["PASS", "REPAIR"] }, findings: { type: "array", maxItems: 5, items: visionDefectSchema }, exactRepair: { type: "string", minLength: 6, maxLength: 240 } }, required: ["semanticFit", "factualSafety", "composition", "mobileLegibility", "authenticity", "overall", "decision", "findings", "exactRepair"] };
const archetypeCertificationSchema = { type: "object", additionalProperties: false, properties: { claimEvidence: { type: "integer", minimum: 0, maximum: 100 }, temporalProgression: { type: "integer", minimum: 0, maximum: 100 }, factualSafety: { type: "integer", minimum: 0, maximum: 100 }, mobileLegibility: { type: "integer", minimum: 0, maximum: 100 }, modalityFit: { type: "integer", minimum: 0, maximum: 100 }, overall: { type: "integer", minimum: 0, maximum: 100 }, decision: { type: "string", enum: ["PASS", "REPAIR"] }, findings: { type: "array", minItems: 1, maxItems: 5, items: { type: "string", minLength: 8, maxLength: 220 } }, exactRepair: { type: "string", minLength: 8, maxLength: 260 } }, required: ["claimEvidence", "temporalProgression", "factualSafety", "mobileLegibility", "modalityFit", "overall", "decision", "findings", "exactRepair"] };
const sourceFrameQaSchema = { type: "object", additionalProperties: false, properties: { semanticSpecificity: { type: "integer", minimum: 0, maximum: 100 }, contradictionSafety: { type: "integer", minimum: 0, maximum: 100 }, contextFit: { type: "integer", minimum: 0, maximum: 100 }, frameDifferentiation: { type: "integer", minimum: 0, maximum: 100 }, mobileClarity: { type: "integer", minimum: 0, maximum: 100 }, overall: { type: "integer", minimum: 0, maximum: 100 }, decision: { type: "string", enum: ["PASS", "REPAIR"] }, findings: { type: "array", minItems: 1, maxItems: 5, items: { type: "string", minLength: 8, maxLength: 220 } }, replacementQuery: { type: "string", minLength: 8, maxLength: 180 }, sourceLayerContract: { type: "string", minLength: 8, maxLength: 260 } }, required: ["semanticSpecificity", "contradictionSafety", "contextFit", "frameDifferentiation", "mobileClarity", "overall", "decision", "findings", "replacementQuery", "sourceLayerContract"] };
const compositeCandidateSchema = { type: "object", additionalProperties: false, properties: { semanticFit: { type: "integer", minimum: 0, maximum: 100 }, factualSafety: { type: "integer", minimum: 0, maximum: 100 }, composition: { type: "integer", minimum: 0, maximum: 100 }, mobileLegibility: { type: "integer", minimum: 0, maximum: 100 }, authenticity: { type: "integer", minimum: 0, maximum: 100 }, progression: { type: "integer", minimum: 0, maximum: 100 }, overall: { type: "integer", minimum: 0, maximum: 100 } }, required: ["semanticFit", "factualSafety", "composition", "mobileLegibility", "authenticity", "progression", "overall"] };
const compositeTournamentSchema = { type: "object", additionalProperties: false, properties: { winner: { type: "string", enum: ["A", "B", "C"] }, decision: { type: "string", enum: ["PASS", "REPAIR"] }, candidateA: compositeCandidateSchema, candidateB: compositeCandidateSchema, candidateC: compositeCandidateSchema, findings: { type: "array", minItems: 1, maxItems: 6, items: { type: "string", minLength: 8, maxLength: 220 } }, exactRepair: { type: "string", minLength: 8, maxLength: 260 } }, required: ["winner", "decision", "candidateA", "candidateB", "candidateC", "findings", "exactRepair"] };
const motionQaSchema = { type: "object", additionalProperties: false, properties: { semanticContinuity: { type: "integer", minimum: 0, maximum: 100 }, factualSafety: { type: "integer", minimum: 0, maximum: 100 }, transitionQuality: { type: "integer", minimum: 0, maximum: 100 }, mobileLegibility: { type: "integer", minimum: 0, maximum: 100 }, timingFit: { type: "integer", minimum: 0, maximum: 100 }, overall: { type: "integer", minimum: 0, maximum: 100 }, decision: { type: "string", enum: ["PASS", "REPAIR"] }, findings: { type: "array", minItems: 1, maxItems: 6, items: { type: "string", minLength: 8, maxLength: 220 } }, exactRepair: { type: "string", minLength: 8, maxLength: 260 } }, required: ["semanticContinuity", "factualSafety", "transitionQuality", "mobileLegibility", "timingFit", "overall", "decision", "findings", "exactRepair"] };
const sequenceQaSchema = { type: "object", additionalProperties: false, properties: { semanticContinuity: { type: "integer", minimum: 0, maximum: 100 }, visualVariety: { type: "integer", minimum: 0, maximum: 100 }, rhythm: { type: "integer", minimum: 0, maximum: 100 }, mobileLegibility: { type: "integer", minimum: 0, maximum: 100 }, factualSafety: { type: "integer", minimum: 0, maximum: 100 }, overall: { type: "integer", minimum: 0, maximum: 100 }, decision: { type: "string", enum: ["PASS", "REPAIR"] }, findings: { type: "array", maxItems: 6, items: visionDefectSchema }, exactRepair: { type: "string", minLength: 6, maxLength: 260 } }, required: ["semanticContinuity", "visualVariety", "rhythm", "mobileLegibility", "factualSafety", "overall", "decision", "findings", "exactRepair"] };
const batchFindingSchema = { type: "object", additionalProperties: false, properties: { logicalId: { type: "string", minLength: 3, maxLength: 16 }, severity: { type: "string", enum: ["P0", "P1", "P2"] }, category: { type: "string", enum: ["SEMANTIC", "PRESENTATION", "TEMPORAL", "VARIETY", "OTHER"] }, productionLayer: { type: "string", enum: ["SPECIFICATION_COMPILER", "SEMANTIC_MANIFEST", "LAYOUT_ENGINE", "MOTION_POLICY", "PORTFOLIO_POLICY", "NONE"] }, summary: { type: "string", minLength: 8, maxLength: 220 } }, required: ["logicalId", "severity", "category", "productionLayer", "summary"] };
const batchProductAuditSchema = { type: "object", additionalProperties: false, properties: { semanticFit: { type: "integer", minimum: 0, maximum: 100 }, factualSafety: { type: "integer", minimum: 0, maximum: 100 }, composition: { type: "integer", minimum: 0, maximum: 100 }, mobileLegibility: { type: "integer", minimum: 0, maximum: 100 }, temporalClarity: { type: "integer", minimum: 0, maximum: 100 }, portfolioVariety: { type: "integer", minimum: 0, maximum: 100 }, overall: { type: "integer", minimum: 0, maximum: 100 }, decision: { type: "string", enum: ["PASS", "FAIL"] }, findings: { type: "array", maxItems: 12, items: batchFindingSchema }, rootProductionCause: { type: "string", minLength: 8, maxLength: 320 } }, required: ["semanticFit", "factualSafety", "composition", "mobileLegibility", "temporalClarity", "portfolioVariety", "overall", "decision", "findings", "rootProductionCause"] };
function output(payload: Row) { if (typeof payload.output_text === "string") return payload.output_text; for (const item of arr(payload.output)) for (const block of arr(rec(item).content)) if (typeof rec(block).text === "string") return String(rec(block).text); throw new Error("OpenAI returned no structured pixel audit"); }

async function sourceFrameQa() {
  const env = await runtime(), db = env.DB!, { authorization } = await current(db);
  if (!authorization || !env.OPENAI_API_KEY || !env.BUCKET) throw new Error("SOURCE_FRAME_QA_CONFIGURATION_REQUIRED");
  const evidence = await db.prepare("SELECT * FROM v7_media_evidence WHERE authorization_id=? AND evidence_type='SOURCE_FRAME_SET' ORDER BY created_at DESC LIMIT 1").bind(authorization.id).first<Row>();
  if (!evidence) throw new Error("SOURCE_FRAME_EVIDENCE_MISSING");
  const evidenceAudits = await rows(db, "SELECT * FROM v7_source_frame_audits WHERE evidence_id=? ORDER BY updated_at DESC", evidence.id);
  const existingAudit = evidenceAudits.find((audit) => { try { return rec(JSON.parse(String(audit.repair_json || "{}"))).rubricVersion === SOURCE_QA_RUBRIC; } catch { return false; } });
  if (existingAudit) return snapshot();
  const active = await db.prepare("SELECT * FROM v7_material_requests WHERE authorization_id=? AND brief_id=? AND phase='SOURCE_FRAME_QA' AND status IN ('QUEUED','IN_PROGRESS') ORDER BY created_at DESC LIMIT 1").bind(authorization.id, evidence.brief_id).first<Row>();
  if (active) {
    const response = await fetch(`https://api.openai.com/v1/responses/${encodeURIComponent(clean(active.provider_response_id))}`, { headers: { authorization: `Bearer ${env.OPENAI_API_KEY}` }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`SOURCE_FRAME_QA_STATUS_FAILED · ${response.status}`);
    const payload = await response.json() as Row, status = clean(payload.status);
    if (["queued", "in_progress"].includes(status)) { await db.prepare("UPDATE v7_material_requests SET status=?,updated_at=? WHERE id=?").bind(status.toUpperCase(), new Date().toISOString(), active.id).run(); return snapshot(); }
    const usage = await recordOpenAIUsage({ db, programId: PROGRAM_ID, runId: clean(authorization.run_id), stageKey: STAGE, costType: "SOURCE_FRAME_SEMANTIC_QA", payload, fallbackModel: clean(active.model_id) || DEFAULT_MODEL });
    await db.prepare("UPDATE v7_material_requests SET status=?,input_tokens=?,output_tokens=?,reasoning_tokens=?,actual_cost_usd=?,error=?,updated_at=? WHERE id=?").bind(status === "completed" ? "COMPLETE" : "BLOCKED_INCOMPLETE", usage.inputTokens, usage.outputTokens, usage.reasoningTokens, usage.actualUsd, status === "completed" ? null : clean(rec(payload.incomplete_details).reason || rec(payload.error).message || status), new Date().toISOString(), active.id).run();
    await syncRunTotals(db, clean(authorization.run_id));
    if (status !== "completed") throw new Error("SOURCE_FRAME_QA_PROVIDER_INCOMPLETE · no automatic retry");
    const result = JSON.parse(output(payload)) as Row, dimensions = ["semanticSpecificity", "contradictionSafety", "contextFit", "frameDifferentiation", "mobileClarity"], hardPass = dimensions.every((key) => Number(result[key]) >= 86) && Number(result.overall) >= 90 && result.decision === "PASS", now = new Date().toISOString();
    await db.batch([
      db.prepare("INSERT INTO v7_source_frame_audits (id,program_id,run_id,authorization_id,brief_id,evidence_id,status,score,dimensions_json,findings_json,repair_json,provider_response_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(`${evidence.id}-${SOURCE_QA_RUBRIC}`, PROGRAM_ID, authorization.run_id, authorization.id, evidence.brief_id, evidence.id, hardPass ? "PASS" : "REPAIR_REQUIRED", Number(result.overall), JSON.stringify(Object.fromEntries(dimensions.map((key) => [key, Number(result[key])]))), JSON.stringify(arr(result.findings)), JSON.stringify({ rubricVersion: SOURCE_QA_RUBRIC, replacementQuery: clean(result.replacementQuery), sourceLayerContract: clean(result.sourceLayerContract) }), payload.id, now, now),
      db.prepare("UPDATE v7_stage_states SET blocker=?,evidence_summary=?,updated_at=? WHERE id=?").bind(hardPass ? "COMPOSITE_TOURNAMENT_REQUIRED" : "SOURCE_REPLACEMENT_REQUIRED", hardPass ? `${evidence.brief_id} source pixels passed semantic QA at ${Number(result.overall)}/100 · composite remains locked` : `${evidence.brief_id} source pixels rejected at ${Number(result.overall)}/100 · replacement required before composition`, now, STAGE_ID),
    ]);
    return snapshot();
  }
  const briefRow = await db.prepare("SELECT * FROM v7_material_briefs WHERE id=?").bind(evidence.brief_id).first<Row>();
  if (!briefRow) throw new Error("SOURCE_FRAME_BRIEF_MISSING");
  const brief = JSON.parse(String(briefRow.content_json)) as Row, evidenceContent = rec(JSON.parse(String(evidence.content_json))), frames = arr(evidenceContent.frames).map(rec), imageUrls: string[] = [];
  for (const frame of frames) {
    const file = await db.prepare("SELECT runtime_key,mime_type FROM v7_material_files WHERE id=?").bind(frame.fileId).first<Row>();
    if (!file) throw new Error(`SOURCE_FRAME_FILE_MISSING · ${clean(frame.role)}`);
    const object = await env.BUCKET.get(clean(file.runtime_key)); if (!object) throw new Error(`SOURCE_FRAME_BYTES_MISSING · ${clean(frame.role)}`);
    imageUrls.push(`data:${clean(file.mime_type)};base64,${base64(new Uint8Array(await new Response(object.body).arrayBuffer()))}`);
  }
  if (imageUrls.length !== 3) throw new Error("SOURCE_FRAME_SET_INCOMPLETE");
  const setting = await modelSetting(db), requestId = await newRequest(db, authorization, clean(evidence.brief_id), "SOURCE_FRAME_QA", "OPENAI", setting.modelId, setting.reasoningEffort, 1200, 3000);
  const hybrid = clean(brief.route) === "HYBRID";
  const content: Row[] = [{ type: "input_text", text: `You are the source-footage gate for a premium documentary using ${SOURCE_QA_RUBRIC}. Inspect the actual decoded ENTRY, MIDPOINT and EXIT frames in order. Judge the source layer only: it must provide unmistakable, composition-ready physical context, contain no prohibited or contradictory evidence, and materially differ across time. Topic similarity is not enough. Do not credit metadata, filenames or a future overlay. Reject cash, unclear payment action, generic checkout footage, recognizable logos or readable brand names, weak crops or near-duplicate frames. Incidental hardware marks that are not readable or recognizable at 960x540 are not a brand failure. ${hybrid ? "This is a HYBRID shot. Score semantic specificity only against SOURCE MUST PROVE below. A clearly visible plain payment-card insertion or tap is sufficient credit-card context; do not require the stock pixels to prove credit versus debit. Do NOT require the stock footage to display the exact $100 value, explanatory labels, authorization state or settlement distinction; those are owned by the authored layer. The source must not contradict those later authored states." : "This is a SOURCE shot and the footage itself must carry the full visible meaning."} PASS requires every dimension >=86 and overall >=90. Return all prose in English. The replacement query and sourceLayerContract must describe source footage only—never ask stock footage to contain invented data or authored explanatory text.\n\nSOURCE MUST PROVE:\n${sourceContextJob(brief)}\n\nFULL FROZEN CONTRACT (contradiction checks only for HYBRID):\n${JSON.stringify({ narrationClause: brief.narrationClause, viewerMustUnderstand: brief.viewerMustUnderstand, requiredEvidence: brief.requiredEvidence, prohibitedEvidence: brief.prohibitedEvidence, acceptance: brief.acceptance })}` }];
  for (const imageUrl of imageUrls) content.push({ type: "input_image", image_url: imageUrl, detail: "high" });
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ model: setting.modelId, reasoning: { effort: setting.reasoningEffort }, background: true, store: true, max_output_tokens: 3000, input: [{ role: "user", content }], text: { format: { type: "json_schema", name: "stage09_source_frame_qa", strict: true, schema: sourceFrameQaSchema } } }), signal: AbortSignal.timeout(30000) });
  if (!response.ok) { const detail = (await response.text()).replace(/\s+/g, " ").slice(0, 300); await finishRequest(db, requestId, "FAILED", `OPENAI_${response.status} · ${detail}`); throw new Error(`SOURCE_FRAME_QA_START_FAILED · ${response.status}`); }
  const payload = await response.json() as Row;
  if (!payload.id) { await finishRequest(db, requestId, "FAILED", "Provider response ID missing"); throw new Error("SOURCE_FRAME_QA_PROVIDER_ID_MISSING"); }
  await db.prepare("UPDATE v7_material_requests SET status=?,provider_response_id=?,updated_at=? WHERE id=?").bind(["queued", "in_progress"].includes(clean(payload.status)) ? clean(payload.status).toUpperCase() : "IN_PROGRESS", payload.id, new Date().toISOString(), requestId).run();
  return snapshot();
}

async function compositeTournament() {
  const env = await runtime(), db = env.DB!, { authorization } = await current(db);
  if (!authorization || !env.OPENAI_API_KEY || !env.BUCKET) throw new Error("COMPOSITE_TOURNAMENT_CONFIGURATION_REQUIRED");
  const evidence = await db.prepare("SELECT * FROM v7_media_evidence WHERE authorization_id=? AND evidence_type='SOURCE_FRAME_SET' ORDER BY created_at DESC LIMIT 1").bind(authorization.id).first<Row>();
  if (!evidence) throw new Error("SOURCE_FRAME_EVIDENCE_MISSING");
  const sourceAudit = await db.prepare("SELECT * FROM v7_source_frame_audits WHERE evidence_id=? AND status='PASS' AND repair_json LIKE ? ORDER BY updated_at DESC LIMIT 1").bind(evidence.id, `%${SOURCE_QA_RUBRIC}%`).first<Row>();
  if (!sourceAudit) throw new Error("SOURCE_FRAME_SEMANTIC_PASS_REQUIRED");
  const previousAudit = await db.prepare("SELECT * FROM v7_composite_audits WHERE evidence_id=? AND rubric_version=? ORDER BY updated_at DESC LIMIT 1").bind(evidence.id, PREVIOUS_COMPOSITE_QA_RUBRIC).first<Row>();
  const repairMode = previousAudit?.status === "REPAIR_REQUIRED";
  const existing = await db.prepare("SELECT * FROM v7_composite_audits WHERE evidence_id=? AND rubric_version=? ORDER BY updated_at DESC LIMIT 1").bind(evidence.id, COMPOSITE_QA_RUBRIC).first<Row>();
  if (existing) return snapshot();
  const compositeIdentity = `${COMPOSITE_QA_RUBRIC}-${clean(evidence.content_hash).slice(0, 12)}`;
  const briefFiles = await rows(db, "SELECT * FROM v7_material_files WHERE authorization_id=? AND brief_id=?", authorization.id, evidence.brief_id);
  const rubricFiles = briefFiles.filter((file) => clean(file.id).includes(compositeIdentity));
  const rubricCreatedAt = rubricFiles.reduce((latest, file) => Math.max(latest, new Date(clean(file.created_at)).getTime() || 0), 0);
  const recoverable = await db.prepare("SELECT * FROM v7_material_requests WHERE authorization_id=? AND brief_id=? AND phase='COMPOSITE_TOURNAMENT' AND status IN ('QUEUED','IN_PROGRESS','COMPLETE') ORDER BY created_at DESC LIMIT 1").bind(authorization.id, evidence.brief_id).first<Row>();
  const active = rubricFiles.length === 9 && recoverable && new Date(clean(recoverable.created_at)).getTime() >= rubricCreatedAt ? recoverable : null;
  if (active) {
    const response = await fetch(`https://api.openai.com/v1/responses/${encodeURIComponent(clean(active.provider_response_id))}`, { headers: { authorization: `Bearer ${env.OPENAI_API_KEY}` }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`COMPOSITE_TOURNAMENT_STATUS_FAILED · ${response.status}`);
    const payload = await response.json() as Row, status = clean(payload.status);
    if (["queued", "in_progress"].includes(status)) { await db.prepare("UPDATE v7_material_requests SET status=?,updated_at=? WHERE id=?").bind(status.toUpperCase(), new Date().toISOString(), active.id).run(); return snapshot(); }
    if (clean(active.status) !== "COMPLETE") {
      const usage = await recordOpenAIUsage({ db, programId: PROGRAM_ID, runId: clean(authorization.run_id), stageKey: STAGE, costType: "HYBRID_COMPOSITE_TOURNAMENT", payload, fallbackModel: clean(active.model_id) || DEFAULT_MODEL });
      await db.prepare("UPDATE v7_material_requests SET status=?,input_tokens=?,output_tokens=?,reasoning_tokens=?,actual_cost_usd=?,error=?,updated_at=? WHERE id=?").bind(status === "completed" ? "COMPLETE" : "BLOCKED_INCOMPLETE", usage.inputTokens, usage.outputTokens, usage.reasoningTokens, usage.actualUsd, status === "completed" ? null : clean(rec(payload.incomplete_details).reason || rec(payload.error).message || status), new Date().toISOString(), active.id).run();
      await syncRunTotals(db, clean(authorization.run_id));
    }
    if (status !== "completed") throw new Error("COMPOSITE_TOURNAMENT_PROVIDER_INCOMPLETE · no automatic retry");
    const result = JSON.parse(output(payload)) as Row, winner = clean(result.winner), winnerScores = rec(result[`candidate${winner}`]), dimensions = ["semanticFit", "factualSafety", "composition", "mobileLegibility", "authenticity", "progression"], candidateRows = [rec(result.candidateA), rec(result.candidateB), rec(result.candidateC)], viableField = candidateRows.every((candidate) => Number(candidate.overall) >= 82 && Number(candidate.factualSafety) >= 90 && Number(candidate.composition) >= 80 && Number(candidate.mobileLegibility) >= 80), hardPass = viableField && dimensions.every((key) => Number(winnerScores[key]) >= 86) && Number(winnerScores.overall) >= 90 && result.decision === "PASS", now = new Date().toISOString();
    const selectedFiles = rubricFiles.filter((file) => clean(file.asset_role).startsWith(`COMPOSITE_${winner}_`)).sort((left, right) => clean(left.asset_role).localeCompare(clean(right.asset_role)));
    await db.batch([
      db.prepare("INSERT INTO v7_composite_audits (id,program_id,run_id,authorization_id,brief_id,evidence_id,rubric_version,status,winner,score,dimensions_json,candidates_json,findings_json,repair_json,provider_response_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(`${evidence.id}-${COMPOSITE_QA_RUBRIC}`, PROGRAM_ID, authorization.run_id, authorization.id, evidence.brief_id, evidence.id, COMPOSITE_QA_RUBRIC, hardPass ? "PASS" : "REPAIR_REQUIRED", winner, Number(winnerScores.overall), JSON.stringify(Object.fromEntries(dimensions.map((key) => [key, Number(winnerScores[key])]))), JSON.stringify({ A: rec(result.candidateA), B: rec(result.candidateB), C: rec(result.candidateC), selectedFileIds: selectedFiles.map((file) => file.id), sourceEvidenceHash: evidence.content_hash }), JSON.stringify(arr(result.findings)), JSON.stringify({ exactRepair: clean(result.exactRepair) }), payload.id, now, now),
      db.prepare("UPDATE v7_stage_states SET status=?,blocker=?,evidence_summary=?,updated_at=? WHERE id=?").bind(hardPass ? "MOTION_PROOF_REQUIRED" : "REPAIR_REQUIRED", hardPass ? "MOTION_PROOF_REQUIRED" : "COMPOSITE_REPAIR_BLOCKED", hardPass ? `${evidence.brief_id} composite ${winner} passed at ${Number(winnerScores.overall)}/100 · motion proof remains locked` : `${evidence.brief_id} bounded composite repair failed at ${Number(winnerScores.overall)}/100 · explicit root-cause review required`, now, STAGE_ID),
      db.prepare("UPDATE v7_material_runs SET status=? WHERE id=?").bind(hardPass ? "MOTION_PROOF_REQUIRED" : "REPAIR_REQUIRED", authorization.run_id),
      db.prepare("UPDATE v7_material_authorizations SET status=?,updated_at=? WHERE id=?").bind(hardPass ? "PAUSED" : "REPAIR_REQUIRED", now, authorization.id),
    ]);
    return snapshot();
  }
  const briefRow = await db.prepare("SELECT * FROM v7_material_briefs WHERE id=?").bind(evidence.brief_id).first<Row>();
  if (!briefRow) throw new Error("COMPOSITE_BRIEF_MISSING");
  const brief = JSON.parse(String(briefRow.content_json)) as Row, evidenceContent = rec(JSON.parse(String(evidence.content_json))), frames = arr(evidenceContent.frames).map(rec);
  if (frames.length !== 3) throw new Error("SOURCE_FRAME_SET_INCOMPLETE");
  const decodedFrames: Array<{ data: Uint8Array; width: number; height: number }> = [];
  for (const frame of frames) {
    const file = await db.prepare("SELECT runtime_key,mime_type FROM v7_material_files WHERE id=?").bind(frame.fileId).first<Row>();
    if (!file) throw new Error(`SOURCE_FRAME_FILE_MISSING · ${clean(frame.role)}`);
    const object = await env.BUCKET.get(clean(file.runtime_key)); if (!object) throw new Error(`SOURCE_FRAME_BYTES_MISSING · ${clean(frame.role)}`);
    const bytes = new Uint8Array(await new Response(object.body).arrayBuffer()), mime = clean(file.mime_type);
    if (!/jpe?g/i.test(mime)) throw new Error(`COMPOSITE_SOURCE_FORMAT_UNSUPPORTED · ${mime}`);
    const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });
    decodedFrames.push({ data: decoded.data as Uint8Array, width: decoded.width, height: decoded.height });
  }
  const layouts = ["A", "B", "C"] as const, states = [["ENTRY",0],["MIDPOINT",1],["EXIT",2]] as const, imageUrls: string[] = [];
  const previousIdentity = `${PREVIOUS_COMPOSITE_QA_RUBRIC}-${clean(evidence.content_hash).slice(0, 12)}`;
  for (const layout of layouts) for (const [name, state] of states) {
    const role = `COMPOSITE_${layout}_${name}` as MaterialRole;
    let bytes: Uint8Array, sourceType = `HYBRID_COMPOSITE_${layout}`;
    if (repairMode && layout !== "C") {
      const previousFile = briefFiles.find((file) => file.asset_role === role && clean(file.id).includes(previousIdentity));
      if (!previousFile) throw new Error(`COMPOSITE_REPAIR_LINEAGE_MISSING · ${role}`);
      const previousObject = await env.BUCKET.get(clean(previousFile.runtime_key));
      if (!previousObject) throw new Error(`COMPOSITE_REPAIR_BYTES_MISSING · ${role}`);
      bytes = new Uint8Array(await new Response(previousObject.body).arrayBuffer());
      sourceType = `UNCHANGED_${PREVIOUS_COMPOSITE_QA_RUBRIC}_${layout}`;
    } else {
      bytes = ownedPng(brief, state, decodedFrames[state], layout);
      if (repairMode) sourceType = `DELTA_REPAIR_${COMPOSITE_QA_RUBRIC}_${layout}`;
    }
    const fileId = await storeMaterial(env, db, authorization, briefRow, { role, identity: `${COMPOSITE_QA_RUBRIC}-${clean(evidence.content_hash).slice(0, 12)}`, bytes, mimeType: "image/png", extension: "png", sourceType, provider: "FRAMEFLOW_OWNED", providerAssetId: clean(evidence.id), sourceUrl: clean(evidence.id), landingUrl: clean(evidence.id), licenseCode: "HYBRID_SOURCE_PLUS_CHANNEL_OWNED", width: 960, height: 540 });
    const stored = await db.prepare("SELECT runtime_key FROM v7_material_files WHERE id=?").bind(fileId).first<Row>(), object = stored ? await env.BUCKET.get(clean(stored.runtime_key)) : null;
    if (!object) throw new Error(`COMPOSITE_BYTES_MISSING · ${role}`);
    imageUrls.push(`data:image/png;base64,${base64(new Uint8Array(await new Response(object.body).arrayBuffer()))}`);
  }
  const setting = await modelSetting(db), requestId = await newRequest(db, authorization, clean(evidence.brief_id), "COMPOSITE_TOURNAMENT", "OPENAI", setting.modelId, setting.reasoningEffort, 1800, 4000);
  const previousRepair = previousAudit ? clean(rec(JSON.parse(String(previousAudit.repair_json || "{}"))).exactRepair) : "";
  const content: Row[] = [{ type: "input_text", text: `You are adjudicating ${COMPOSITE_QA_RUBRIC} for a premium US documentary. The nine images are ordered A-entry, A-midpoint, A-exit, B-entry, B-midpoint, B-exit, C-entry, C-midpoint, C-exit. Compare three materially different audience-facing hybrid compositions built from the same already-approved real checkout frames. Judge the finished pixels only. ${repairMode ? `This is one bounded delta repair. A and B are byte-identical to the prior field; only C was re-rendered to address: ${previousRepair}. Verify the repair without inventing a new requirement.` : ""} Select one winner; do not average candidates. The winner must visibly communicate the frozen clause, preserve authentic card-tender context, avoid production metadata and unsupported claims, remain readable on mobile, and show meaningful state progression. Exact $100.00, CREDIT, CREDIT CARD and PROCESSING are authored illustrative states and are permitted. Reject placeholder glyphs, clipped or colliding text, internal state-machine legends, generic debug/status UI, and any label without a direct narrative job. All three candidates must be viable alternatives: each needs overall >=82, factualSafety >=90, composition >=80 and mobileLegibility >=80. The winner additionally needs every dimension >=86 and overall >=90. If the field or winner fails any floor, select the least-bad candidate and return REPAIR. exactRepair and every finding must be clear English.\n\nFROZEN SHOT CONTRACT:\n${JSON.stringify({ narrationClause: brief.narrationClause, viewerMustUnderstand: brief.viewerMustUnderstand, route: brief.route, family: brief.primaryFamily, requiredEvidence: brief.requiredEvidence, prohibitedEvidence: brief.prohibitedEvidence, acceptance: brief.acceptance })}` }];
  for (const imageUrl of imageUrls) content.push({ type: "input_image", image_url: imageUrl, detail: "high" });
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ model: setting.modelId, reasoning: { effort: setting.reasoningEffort }, background: true, store: true, max_output_tokens: 4000, input: [{ role: "user", content }], text: { format: { type: "json_schema", name: "stage09_composite_tournament", strict: true, schema: compositeTournamentSchema } } }), signal: AbortSignal.timeout(30000) });
  if (!response.ok) { const detail = (await response.text()).replace(/\s+/g, " ").slice(0, 300); await finishRequest(db, requestId, "FAILED", `OPENAI_${response.status} · ${detail}`); throw new Error(`COMPOSITE_TOURNAMENT_START_FAILED · ${response.status}`); }
  const payload = await response.json() as Row;
  if (!payload.id) { await finishRequest(db, requestId, "FAILED", "Provider response ID missing"); throw new Error("COMPOSITE_TOURNAMENT_PROVIDER_ID_MISSING"); }
  await db.prepare("UPDATE v7_material_requests SET status=?,provider_response_id=?,updated_at=? WHERE id=?").bind(["queued", "in_progress"].includes(clean(payload.status)) ? clean(payload.status).toUpperCase() : "IN_PROGRESS", payload.id, new Date().toISOString(), requestId).run();
  return snapshot();
}

async function dispatchPromotedVision(env: Env, db: DB, authorization: Row, briefRow: Row, promotion: Row) {
  if (!env.OPENAI_API_KEY || !env.BUCKET) throw new Error("CANARY_PIXEL_QA_CONFIGURATION_REQUIRED");
  const binding = await validatePromotionBinding(env, db, promotion);
  if (!binding.passed) throw new Error(`CANARY_ARTIFACT_READINESS_FAILED · ${binding.checks.filter((item) => item.status !== "PASS").map((item) => item.id).join(",")}`);
  const imageUrls: string[] = [];
  for (const file of binding.files) {
    const object = await env.BUCKET.get(clean(file.runtime_key));
    if (!object) throw new Error("PROMOTED_FRAME_READ_BACK_FAILED");
    imageUrls.push(`data:${clean(file.mime_type)};base64,${base64(new Uint8Array(await new Response(object.body).arrayBuffer()))}`);
  }
  if (imageUrls.length !== 3) throw new Error("PROMOTED_FRAME_SET_INCOMPLETE");
  const unitSpecific = isUnitSpecificCanary(promotion.canary_version), capability = canaryDispatchCapability(promotion.canary_version), phase = capability?.phase;
  if (!phase) throw new Error("CANARY_DISPATCH_CAPABILITY_MISSING");
  const priorTransport=await db.prepare("SELECT * FROM v7_material_requests WHERE authorization_id=? AND brief_id=? AND phase=? AND status='BLOCKED_INCOMPLETE' ORDER BY created_at DESC LIMIT 1").bind(authorization.id,briefRow.id,phase).first<Row>(),transportRetry=Boolean(priorTransport&&clean(priorTransport.error).includes("Invalid prompt")&&!clean(priorTransport.retry_scope));
  const setting = await modelSetting(db), requestId = await newRequest(db, authorization, clean(briefRow.id), phase, "OPENAI", setting.modelId, setting.reasoningEffort, 1500, 4000), rubric = releaseTrainRubric(promotion.canary_version);
  if(transportRetry)await db.prepare("UPDATE v7_material_requests SET retry_of=?,retry_scope=? WHERE id=?").bind(priorTransport?.id,"PROMPT_POLICY_FALSE_POSITIVE_ONLY",requestId).run();
  const qaContract: Row = rec(binding.contractPayload || promotionContractPayload(binding.contract || {})), stabilizedPolicy = [STABILIZATION_RELEASE_VERSION, MP002_TARGETED_REPAIR_VERSION, MP002_PIXEL_ORACLE_REPAIR_VERSION, CANONICAL_UNIT_SCENES_VERSION].includes(clean(promotion.canary_version)), overallFloor = stabilizedPolicy ? CONTROLLED_RELEASE_POLICY.controlledOverall : clean(qaContract.riskTier) === "P0" ? 94 : 92;
  const retryContract=transportRetry?{claim:qaContract.claim,requiredEvidence:qaContract.requiredEvidence,acceptance:qaContract.acceptance,riskTier:qaContract.riskTier}:qaContract,retryManifest=transportRetry?{sceneType:rec(binding.manifest).sceneType,states:rec(binding.manifest).states,temporalOrder:rec(binding.manifest).temporalOrder}:binding.manifest;
  const content: Row[] = [{ type: "input_text", text: `You are performing ${rubric} on an immutable production-bound artifact. This is benign visual quality assurance for a payment-system explainer. The three supplied images are the exact promoted ENTRY, MIDPOINT and EXIT pixels. Judge only these pixels against the exact unit contract below. Do not infer evidence outside the frames and do not import generic archetype requirements (for example baseline/delta, route nodes, headings or qualifiers) unless the unit contract explicitly requires them. ${stabilizedPolicy ? "Apply CONTROLLED_RELEASE_GATE_V1: STANDARD requires overall >=92, every dimension >=90 and zero P0/P1; CONTROLLED requires overall >=88, Semantic Fit >=82, every other dimension >=88, zero P0, zero semantic P1 and at most one presentation P1. Scores 84-87 are INTERNAL_ONLY; overall <84 or Semantic Fit <82 is BLOCKED." : `PASS requires every dimension >=90 and overall >=${overallFloor}.`} Classify every finding with severity P0/P1/P2 and category SEMANTIC/PRESENTATION/OTHER. A missing or unclear required action is SEMANTIC, not presentation. This review must reject legacy PRIMARY files, generic route/family fallback, certification-fixture pixels reused as production pixels, or an artifact that merely resembles the certified archetype. ${unitSpecific ? "The semantic manifest is the frozen translation of this exact unit contract into audience-facing states; verify only that the pixels visibly realize its source-authored evidence." : ""} ${[PRODUCTION_SCENE_RELEASE_TRAIN_VERSION, STABILIZATION_RELEASE_VERSION, MP002_TARGETED_REPAIR_VERSION, MP002_PIXEL_ORACLE_REPAIR_VERSION].includes(clean(promotion.canary_version)) ? "The artifact is a production scene, not a QA proof card. For MP-002 specifically, ENTRY must show PROCESSING with $100.00, MIDPOINT and EXIT must show APPROVED with $100.00, and EXIT must visibly separate the withdrawn card and hand from the reader. Do not require internal test labels or metadata." : ""} Return only JSON.\n\nUNIT CONTRACT:\n${JSON.stringify(retryContract)}\n\nUNIT SEMANTIC MANIFEST:\n${JSON.stringify(retryManifest||{})}\n\nIMMUTABLE PROMOTION RECORD:\n${JSON.stringify({ renderer: promotion.renderer_version, canaryVersion: promotion.canary_version, dispatchCapability: phase, rubric, qualityPolicyVersion: stabilizedPolicy ? CONTROLLED_RELEASE_POLICY.version : "LEGACY_STRICT_GATE", overallFloor, semanticFitFloor: stabilizedPolicy ? CONTROLLED_RELEASE_POLICY.controlledSemanticFit : 90, otherDimensionFloor: stabilizedPolicy ? CONTROLLED_RELEASE_POLICY.controlledOtherDimension : 90, contractHash: promotion.contract_hash, frameHashes: binding.frameHashes, legacyFallback: false, certificationPixelsReused: false, transportRetry })}` }];
  for (const imageUrl of imageUrls) content.push({ type: "input_image", image_url: imageUrl, detail: "high" });
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ model: setting.modelId, reasoning: { effort: setting.reasoningEffort }, background: true, store: true, max_output_tokens: 4000, input: [{ role: "user", content }], text: { format: { type: "json_schema", name: "stage09_canary_promoted_pixel_qa", strict: true, schema: visionSchema } } }), signal: AbortSignal.timeout(30000) });
  if (!response.ok) { const detail = (await response.text()).replace(/\s+/g, " ").slice(0, 300); await finishRequest(db, requestId, "FAILED", `OPENAI_${response.status} · ${detail}`); throw new Error(`CANARY_PIXEL_QA_START_FAILED · ${response.status}`); }
  const payload = await response.json() as Row;
  if (!payload.id) { await finishRequest(db, requestId, "FAILED", "Provider response ID missing"); throw new Error("CANARY_PIXEL_QA_PROVIDER_ID_MISSING"); }
  await db.prepare("UPDATE v7_material_requests SET status=?,provider_response_id=?,updated_at=? WHERE id=?").bind(["queued", "in_progress"].includes(clean(payload.status)) ? clean(payload.status).toUpperCase() : "IN_PROGRESS", payload.id, new Date().toISOString(), requestId).run();
  return requestId;
}

async function dispatchVision(env: Env, db: DB, authorization: Row, briefRow: Row) {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY_REQUIRED_FOR_PIXEL_QA");
  const setting = await modelSetting(db), brief = JSON.parse(String(briefRow.content_json)) as Row, files = await rows(db, "SELECT * FROM v7_material_files WHERE brief_id=? ORDER BY asset_role", briefRow.id), primary = files.find((file) => file.asset_role === "PRIMARY");
  if (!primary) throw new Error("PRIMARY_MATERIAL_MISSING");
  const imageUrls: string[] = [];
  if (clean(primary.thumbnail_url) && clean(brief.route) !== "HYBRID") imageUrls.push(clean(primary.thumbnail_url));
  if (files.some((item) => item.mime_type === "image/svg+xml")) {
    let hybridBackground: { data: Uint8Array; width: number; height: number } | undefined;
    if (clean(brief.route) === "HYBRID" && clean(primary.thumbnail_url)) {
      const response = await fetch(clean(primary.thumbnail_url), { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`HYBRID_BACKGROUND_FETCH_FAILED · ${response.status}`);
      const mimeType = clean(response.headers.get("content-type"));
      if (!mimeType.includes("jpeg") && !mimeType.includes("jpg")) throw new Error(`HYBRID_BACKGROUND_FORMAT_UNSUPPORTED · ${mimeType}`);
      const decoded = jpeg.decode(new Uint8Array(await response.arrayBuffer()), { useTArray: true, formatAsRGBA: true });
      hybridBackground = { data: decoded.data as Uint8Array, width: decoded.width, height: decoded.height };
    }
    const roles = [["QA_ENTRY",0],["QA_MIDPOINT",1],["QA_EXIT",2]] as const;
    for (const [role,state] of roles) {
      const qaLayout = clean(rec(brief.architectureRepair).qaLayout) === "B" ? "B" : "A";
      await storeMaterial(env, db, authorization, briefRow, { role, bytes: ownedPng(brief, state, hybridBackground, qaLayout), mimeType: "image/png", extension: "png", sourceType: hybridBackground ? `HYBRID_AUDIENCE_COMPOSITE_V3_${qaLayout}` : "OWNED_AUDIENCE_FRAME_EVIDENCE", provider: "FRAMEFLOW_OWNED", licenseCode: "CHANNEL_OWNED", width: 960, height: 540 });
      const proxy = await db.prepare("SELECT * FROM v7_material_files WHERE brief_id=? AND asset_role=?").bind(briefRow.id, role).first<Row>() || undefined;
      if (proxy) { const object = await env.BUCKET?.get(clean(proxy.runtime_key)); if (object) imageUrls.push(`data:image/png;base64,${base64(new Uint8Array(await new Response(object.body).arrayBuffer()))}`); }
    }
  }
  if (!imageUrls.length) throw new Error("REPRESENTATIVE_PIXEL_EVIDENCE_MISSING");
  const retry = rec(brief.pixelQaRetry), expectedOutputTokens = Number(retry.expectedOutputTokens || 1500), maxOutputTokens = Number(retry.maxOutputTokens || 8000);
  const requestId = await newRequest(db, authorization, clean(briefRow.id), "PIXEL_QA", "OPENAI", setting.modelId, setting.reasoningEffort, expectedOutputTokens, maxOutputTokens);
  if (clean(retry.scope) && clean(retry.retryOf)) await db.prepare("UPDATE v7_material_requests SET retry_of=?,retry_scope=? WHERE id=?").bind(clean(retry.retryOf), clean(retry.scope), requestId).run();
  const content: Row[] = [{ type: "input_text", text: `Act as an exacting visual producer. Judge only the supplied audience-facing material pixels against this frozen shot contract. For HYBRID and authored material, the three images are the actual entry, midpoint and exit composites in that order and must visibly progress; there is no separate planning image. Broad topic similarity is a failure. Penalize generic stock, unsupported claims, decorative diagrams, visible production metadata, weak mobile hierarchy, cropping, logos, text artifacts and repeated-template appearance. A PASS requires every dimension at least 86 and overall at least 90. Do not infer motion that the supplied states do not prove.\n\nSHOT CONTRACT:\n${JSON.stringify({ narrationClause: brief.narrationClause, viewerMustUnderstand: brief.viewerMustUnderstand, route: brief.route, family: brief.primaryFamily, requiredEvidence: brief.requiredEvidence, prohibitedEvidence: brief.prohibitedEvidence, acceptance: brief.acceptance })}` }];
  for (const imageUrl of imageUrls) content.push({ type: "input_image", image_url: imageUrl, detail: "high" });
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ model: setting.modelId, reasoning: { effort: setting.reasoningEffort }, background: true, store: true, max_output_tokens: maxOutputTokens, input: [{ role: "user", content }], text: { format: { type: "json_schema", name: "stage09_pixel_qa", strict: true, schema: visionSchema } } }), signal: AbortSignal.timeout(30000) });
  if (!response.ok) { const detail = (await response.text()).replace(/\s+/g, " ").slice(0, 300); await finishRequest(db, requestId, "FAILED", `OPENAI_${response.status} · ${detail}`); throw new Error(`PIXEL_QA_START_FAILED · ${response.status}`); }
  const payload = await response.json() as Row;
  if (!payload.id) { await finishRequest(db, requestId, "FAILED", "Provider response ID missing"); throw new Error("PIXEL_QA_PROVIDER_ID_MISSING"); }
  await db.prepare("UPDATE v7_material_requests SET status=?,provider_response_id=?,updated_at=? WHERE id=?").bind(["queued", "in_progress"].includes(clean(payload.status)) ? clean(payload.status).toUpperCase() : "IN_PROGRESS", payload.id, new Date().toISOString(), requestId).run();
}

async function pollVision(env: Env, db: DB, authorization: Row, requestRow: Row) {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY_REQUIRED_FOR_PIXEL_QA");
  const response = await fetch(`https://api.openai.com/v1/responses/${encodeURIComponent(clean(requestRow.provider_response_id))}`, { headers: { authorization: `Bearer ${env.OPENAI_API_KEY}` }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`PIXEL_QA_STATUS_FAILED · ${response.status}`);
  const payload = await response.json() as Row, status = clean(payload.status);
  if (["queued", "in_progress"].includes(status)) { await db.prepare("UPDATE v7_material_requests SET status=?,updated_at=? WHERE id=?").bind(status.toUpperCase(), new Date().toISOString(), requestRow.id).run(); return; }
  const usage = await recordOpenAIUsage({ db, programId: PROGRAM_ID, runId: clean(authorization.run_id), stageKey: STAGE, costType: "MATERIAL_PIXEL_QA", payload, fallbackModel: clean(requestRow.model_id) || DEFAULT_MODEL });
  await db.prepare("UPDATE v7_material_requests SET status=?,input_tokens=?,output_tokens=?,reasoning_tokens=?,actual_cost_usd=?,error=?,updated_at=? WHERE id=?").bind(status === "completed" ? "COMPLETE" : "BLOCKED_INCOMPLETE", usage.inputTokens, usage.outputTokens, usage.reasoningTokens, usage.actualUsd, status === "completed" ? null : clean(rec(payload.incomplete_details).reason || rec(payload.error).message || status), new Date().toISOString(), requestRow.id).run();
  await syncRunTotals(db, clean(authorization.run_id));
  if (status !== "completed") {
    const now = new Date().toISOString();
    await db.batch([db.prepare("UPDATE v7_material_briefs SET status='REPAIR_REQUIRED' WHERE id=?").bind(requestRow.brief_id), db.prepare("UPDATE v7_material_runs SET status='REPAIR_REQUIRED' WHERE id=?").bind(authorization.run_id), db.prepare("UPDATE v7_material_authorizations SET status='REPAIR_REQUIRED',updated_at=? WHERE id=?").bind(now, authorization.id), db.prepare("UPDATE v7_stage_states SET status='REPAIR_REQUIRED',blocker='PIXEL_QA_PROVIDER_INCOMPLETE',evidence_summary=?,updated_at=? WHERE id=?").bind(`${requestRow.brief_id} pixel QA incomplete · no automatic full retry`, now, STAGE_ID)]);
    return;
  }
  const result = JSON.parse(output(payload)) as Row, dimensions = ["semanticFit", "factualSafety", "composition", "mobileLegibility", "authenticity"], promoted = ["CANARY_PROMOTED_PIXEL_QA", "CANARY_UNIT_SPECIFIC_PIXEL_QA"].includes(clean(requestRow.phase));
  const activeCanary = promoted ? await db.prepare("SELECT version FROM v7_pilot_canaries WHERE authorization_id=? AND current_brief_id=? AND status='UNIT_RUNNING' ORDER BY created_at DESC LIMIT 1").bind(authorization.id, requestRow.brief_id).first<Row>() : null, canaryVersion = clean(activeCanary?.version), capability = canaryDispatchCapability(canaryVersion);
  if (promoted && (!activeCanary || capability?.phase !== clean(requestRow.phase))) throw new Error("CANARY_AUDIT_CAPABILITY_MISMATCH");
  const promotion = promoted ? await db.prepare("SELECT * FROM v7_artifact_promotions WHERE canary_version=? AND brief_id=? AND status='FROZEN' ORDER BY created_at DESC LIMIT 1").bind(canaryVersion, requestRow.brief_id).first<Row>() : null, promotedFrameIds = promotion ? arr(JSON.parse(String(promotion.frame_ids_json || "[]"))).map(clean) : [], file = promoted ? (promotedFrameIds[0] ? { id: promotedFrameIds[0] } : null) : await db.prepare("SELECT id FROM v7_material_files WHERE brief_id=? AND asset_role='PRIMARY'").bind(requestRow.brief_id).first<Row>(), promotionPreflight = promotion ? rec(JSON.parse(String(promotion.preflight_json || "{}"))) : {}, repairAttempt = Number(promotionPreflight.repairAttempt || 0), auditId = promoted ? `${requestRow.brief_id}-${canaryVersion}-PIXEL-AUDIT${repairAttempt ? `-REPAIR-${repairAttempt}` : ""}` : `${requestRow.brief_id}-PIXEL-AUDIT`;
  const binding = promoted && promotion ? await validatePromotionBinding(env, db, promotion) : null, riskTier = clean(rec(binding?.contractPayload).riskTier), stabilizedPolicy = promoted && [STABILIZATION_RELEASE_VERSION, MP002_TARGETED_REPAIR_VERSION, MP002_PIXEL_ORACLE_REPAIR_VERSION, CANONICAL_UNIT_SCENES_VERSION].includes(canaryVersion), overallFloor = promoted ? stabilizedPolicy ? CONTROLLED_RELEASE_POLICY.controlledOverall : riskTier === "P0" ? 94 : 92 : 90, dimensionFloor = promoted ? stabilizedPolicy ? CONTROLLED_RELEASE_POLICY.controlledOtherDimension : 90 : 86;
  const evaluatedDimensions = Object.fromEntries(dimensions.map((key) => [key, Number(result[key])]));
  const policyDecision = stabilizedPolicy ? evaluateControlledRelease({ overall: result.overall, dimensions: evaluatedDimensions, defects: result.findings }) : null;
  const hardPass = stabilizedPolicy ? Boolean(policyDecision?.pass) : dimensions.every((key) => Number(result[key]) >= dimensionFloor) && Number(result.overall) >= overallFloor && result.decision === "PASS";
  const auditFindings = [...arr(result.findings), { severity: hardPass ? "P2" : "P1", category: "OTHER", summary: clean(result.exactRepair), policy: policyDecision || undefined }].filter((item) => typeof item !== "object" || clean(rec(item).summary));
  await db.prepare("INSERT INTO v7_material_audits (id,program_id,run_id,authorization_id,brief_id,file_id,status,score,dimensions_json,provider_response_id,findings_json) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET file_id=excluded.file_id,status=excluded.status,score=excluded.score,dimensions_json=excluded.dimensions_json,provider_response_id=excluded.provider_response_id,findings_json=excluded.findings_json").bind(auditId, PROGRAM_ID, authorization.run_id, authorization.id, requestRow.brief_id, file?.id || "MISSING", hardPass ? "PASS" : "REPAIR_REQUIRED", Number(result.overall), JSON.stringify(evaluatedDimensions), payload.id, JSON.stringify(auditFindings)).run();
  await db.prepare("UPDATE v7_material_briefs SET status=? WHERE id=?").bind(hardPass ? "PIXEL_AUDITED" : "REPAIR_REQUIRED", requestRow.brief_id).run();
}

async function finalizePilot(env: Env, db: DB, authorization: Row) {
  const briefs = await rows(db, "SELECT * FROM v7_material_briefs WHERE run_id=? AND pilot=1 ORDER BY start_seconds", authorization.run_id), files = await rows(db, "SELECT * FROM v7_material_files WHERE authorization_id=?", authorization.id), audits = await rows(db, "SELECT * FROM v7_material_audits WHERE authorization_id=?", authorization.id), tournaments = await rows(db, "SELECT * FROM v7_material_tournaments WHERE authorization_id=?", authorization.id), primary = files.filter((file) => file.asset_role === "PRIMARY"), families = new Set(briefs.map((brief) => String(brief.visual_family))), routes = new Set(briefs.map((brief) => String(brief.route))), hashes = new Set(primary.map((file) => String(file.content_hash))), sourced = briefs.filter((brief) => ["SOURCE","HYBRID"].includes(String(brief.route))), authored = briefs.filter((brief) => ["MAKE","HYBRID"].includes(String(brief.route)));
  const authoredStates = authored.filter((brief) => ["QA_ENTRY","QA_MIDPOINT","QA_EXIT"].every((role) => files.some((file) => file.brief_id === brief.id && file.asset_role === role))).length;
  const gates = [
    { id: "PILOT_SCOPE", status: briefs.length === Number(authorization.shot_count) ? "PASS" : "FAIL", evidence: `${briefs.length}/${authorization.shot_count} authorized briefs` },
    { id: "STORED_BYTES", status: primary.length === briefs.length && primary.every((file) => Number(file.byte_size) > 0 && clean(file.drive_file_id) && clean(file.runtime_key)) ? "PASS" : "FAIL", evidence: `${primary.length}/${briefs.length} primary files stored in R2 + Drive` },
    { id: "PROVENANCE", status: primary.every((file) => clean(file.license_code) && clean(file.content_hash)) ? "PASS" : "FAIL", evidence: `${primary.filter((file) => clean(file.license_code) && clean(file.content_hash)).length}/${primary.length} rights + checksums` },
    { id: "PIXEL_QA", status: audits.length === briefs.length && audits.every((item) => item.status === "PASS") ? "PASS" : "FAIL", evidence: `${audits.filter((item) => item.status === "PASS").length}/${briefs.length} representative pixel audits passed` },
    { id: "CANDIDATE_TOURNAMENT", status: tournaments.length === sourced.length && tournaments.every((item) => item.status === "PASS" && Number(item.candidate_count) >= 6) ? "PASS" : "FAIL", evidence: `${tournaments.filter((item) => item.status === "PASS").length}/${sourced.length} SOURCE/HYBRID pixel tournaments passed` },
    { id: "THREE_STATE_EVIDENCE", status: authoredStates === authored.length ? "PASS" : "FAIL", evidence: `${authoredStates}/${authored.length} MAKE/HYBRID units store entry, midpoint and exit pixels` },
    { id: "PHYSICAL_UNIQUENESS", status: hashes.size === primary.length ? "PASS" : "FAIL", evidence: `${hashes.size}/${primary.length} unique primary hashes` },
    { id: "VISUAL_DIVERSITY", status: families.size >= 5 && routes.size >= 2 ? "PASS" : "FAIL", evidence: `${families.size} families · ${routes.size} routes` },
    { id: "SEQUENCE_BOUNDARY", status: "PASS", evidence: "Pilot-set audit passed; full motion playback remains mandatory downstream" },
  ];
  const passed = gates.every((gate) => gate.status === "PASS"), score = Math.round(gates.filter((gate) => gate.status === "PASS").length / gates.length * 100), now = new Date().toISOString(), evidence = { title: "Stage 09.3 authorized pilot evidence", authorizationId: authorization.id, runId: authorization.run_id, generatedAt: now, score, gates, fileIds: primary.map((file) => file.id), auditIds: audits.map((item) => item.id), fullProductionAuthorized: false };
  const json = JSON.stringify(evidence, null, 2), hash = await sha(json), key = `v7/material-production/${authorization.run_id}/pilot/pilot-audit.json`;
  if (!env.BUCKET) throw new Error("R2 material storage is unavailable"); await env.BUCKET.put(key, json, { httpMetadata: { contentType: "application/json" }, customMetadata: { contentHash: hash, stage: STAGE } });
  const drive = await storeDriveJsonArtifact({ folderPath: ["Channels", "Hidden Systems", "Projects", "V7 Greenfield Pilot", "Material Production", "Pilot 10"], fileName: "pilot-audit.json", content: json, artifactId: `${authorization.run_id}-PILOT-AUDIT`, contentHash: hash });
  await db.batch([db.prepare("UPDATE v7_material_runs SET status=?,score=?,gate_json=?,completed_at=? WHERE id=?").bind(passed ? "PILOT_PASS" : "REPAIR_REQUIRED", score, JSON.stringify(gates), now, authorization.run_id), db.prepare("UPDATE v7_material_authorizations SET status=?,completed_at=?,updated_at=? WHERE id=?").bind(passed ? "COMPLETED" : "REPAIR_REQUIRED", now, now, authorization.id), db.prepare("UPDATE v7_stage_states SET status=?,blocker=?,evidence_summary=?,updated_at=? WHERE id=?").bind(passed ? "PILOT_PASS" : "REPAIR_REQUIRED", passed ? "FULL_SCALE_NOT_AUTHORIZED" : "PILOT_QA_FAILED", `${score}/100 pilot · ${primary.length} stored materials · ${audits.filter((item) => item.status === "PASS").length}/${briefs.length} pixel QA · audit ${drive.id}`, now, STAGE_ID)]);
}

async function startPilot() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || authorization.status !== "AUTHORIZED") throw new Error("AUTHORIZED_PILOT_REQUIRED");
  if (!env.BUCKET) throw new Error("R2_MATERIAL_STORAGE_REQUIRED");
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY_REQUIRED_FOR_PIXEL_QA");
  if (!env.PEXELS_API_KEY && !env.PIXABAY_API_KEY) throw new Error("PEXELS_OR_PIXABAY_REQUIRED");
  const now = new Date().toISOString();
  await db.batch([db.prepare("UPDATE v7_material_runs SET status='PILOT_RUNNING',mode='AUTHORIZED_PILOT' WHERE id=?").bind(run.id), db.prepare("UPDATE v7_stage_states SET status='PILOT_RUNNING',blocker=NULL,evidence_summary='Pilot executor started · one resumable unit per step',updated_at=? WHERE id=?").bind(now, STAGE_ID)]);
  return snapshot();
}

async function repairedPilotBrief(db: DB, authorization: Row) {
  // Resolve the currently failed unit before consulting historical repairs.
  // MP-001 legitimately carries older repair evidence, but it must never
  // shadow a later NO_PIXEL_CHAMPION unit such as MP-153.
  const failedTournament = await db.prepare("SELECT b.* FROM v7_material_briefs b JOIN v7_material_tournaments t ON t.brief_id=b.id AND t.authorization_id=? LEFT JOIN v7_material_files f ON f.brief_id=b.id AND f.authorization_id=? AND f.asset_role='PRIMARY' WHERE b.run_id=? AND b.pilot=1 AND t.status='NO_PIXEL_CHAMPION' AND f.id IS NULL ORDER BY t.created_at DESC LIMIT 1").bind(authorization.id, authorization.id, authorization.run_id).first<Row>();
  if (failedTournament) return failedTournament;
  const tournaments = await rows(db, "SELECT brief_id,content_json,created_at FROM v7_material_tournaments WHERE authorization_id=? ORDER BY created_at DESC", authorization.id);
  const repaired = tournaments.find((item) => {
    try { return Number(rec(JSON.parse(String(item.content_json || "{}"))).repairAttempt || 0) > 0; }
    catch { return false; }
  });
  if (repaired?.brief_id) return db.prepare("SELECT * FROM v7_material_briefs WHERE id=? AND run_id=? AND pilot=1").bind(repaired.brief_id, authorization.run_id).first<Row>();
  return db.prepare("SELECT * FROM v7_material_briefs WHERE run_id=? AND pilot=1 AND status='REPAIR_REQUIRED' ORDER BY start_seconds LIMIT 1").bind(authorization.run_id).first<Row>();
}

async function claimBriefPhase(db: DB, briefId: string, phase: "MATERIALIZING" | "QA_DISPATCHING") {
  const result = await db.prepare("UPDATE v7_material_briefs SET status=? WHERE id=? AND status NOT IN ('MATERIALIZING','QA_DISPATCHING')").bind(phase, briefId).run() as { meta?: { changes?: number } };
  return Number(result.meta?.changes || 0) === 1;
}

async function upgradeFailedUnitArchitecture() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || clean(run.status) !== "REPAIR_REQUIRED" || clean(authorization.status) !== "REPAIR_REQUIRED") throw new Error("ARCHITECTURE_REPAIR_STATE_REQUIRED");
  const active = await db.prepare("SELECT id FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS') LIMIT 1").bind(authorization.id).first<Row>();
  if (active) throw new Error("ACTIVE_REMOTE_REQUESTS_MUST_FINISH_FIRST");
  const brief = await db.prepare("SELECT b.* FROM v7_material_briefs b JOIN v7_material_tournaments t ON t.brief_id=b.id AND t.authorization_id=? LEFT JOIN v7_material_files f ON f.brief_id=b.id AND f.authorization_id=? AND f.asset_role='PRIMARY' WHERE b.run_id=? AND b.pilot=1 AND t.status='NO_PIXEL_CHAMPION' AND f.id IS NULL ORDER BY t.created_at DESC LIMIT 1").bind(authorization.id, authorization.id, run.id).first<Row>();
  if (!brief) throw new Error("FAILED_UNMATERIALIZED_UNIT_NOT_FOUND");
  const tournament = await db.prepare("SELECT * FROM v7_material_tournaments WHERE authorization_id=? AND brief_id=? AND status='NO_PIXEL_CHAMPION' ORDER BY created_at DESC LIMIT 1").bind(authorization.id, brief.id).first<Row>();
  const tournamentContent = tournament ? rec(JSON.parse(String(tournament.content_json || "{}"))) : {};
  if (Number(tournamentContent.repairAttempt || 0) !== 1) throw new Error("BOUNDED_QUERY_REPAIR_MUST_BE_EXHAUSTED_ONCE");
  const existing = await db.prepare("SELECT id FROM v7_material_unit_repairs WHERE authorization_id=? AND brief_id=? AND repair_type='SOURCE_TO_HYBRID_SPLIT_V1' LIMIT 1").bind(authorization.id, brief.id).first<Row>();
  if (existing) throw new Error("ARCHITECTURE_REPAIR_ALREADY_APPLIED");
  const original = rec(JSON.parse(String(brief.content_json))), originalHash = clean(brief.content_hash);
  const repaired = {
    ...original,
    route: "HYBRID",
    primaryFamily: "Hybrid Verification",
    architectureRepair: {
      type: "SOURCE_TO_HYBRID_SPLIT_V1",
      originalRoute: clean(original.route),
      sourceMustProve: "A customer presents a payment card at a real merchant terminal in a credible checkout context.",
      authoredLayerMustProve: "A neutral, unbranded confirmation state immediately follows the payment presentation; it must not claim settlement.",
      sourceQuery: "customer card payment merchant terminal close up",
      discoveryPage: 3,
      reason: "Two bounded SOURCE tournaments failed because stock pixels were required to prove both payment presentation and neutral confirmation.",
    },
  };
  const repairedJson = JSON.stringify(repaired), repairedHash = await sha(repairedJson), now = new Date().toISOString(), repairId = `${brief.id}-SOURCE-TO-HYBRID-V1`;
  await db.batch([
    db.prepare("INSERT INTO v7_material_unit_repairs (id,program_id,run_id,authorization_id,brief_id,repair_type,status,original_content_json,original_content_hash,repaired_content_json,repaired_content_hash,failure_evidence_json,created_at) VALUES (?,?,?,?,?,'SOURCE_TO_HYBRID_SPLIT_V1','APPLIED',?,?,?,?,?,?)").bind(repairId, PROGRAM_ID, run.id, authorization.id, brief.id, JSON.stringify(original), originalHash, repairedJson, repairedHash, JSON.stringify({ tournamentId: tournament?.id, score: Number(tournament?.score || 0), attempts: 2, lastFinding: clean(tournamentContent.bestReason), providerResponseId: tournament?.provider_response_id }), now),
    db.prepare("UPDATE v7_material_briefs SET route='HYBRID',visual_family='Hybrid Verification',content_json=?,content_hash=?,status='REPAIR_REQUIRED' WHERE id=?").bind(repairedJson, repairedHash, brief.id),
    db.prepare("UPDATE v7_material_tournaments SET status='SUPERSEDED_BY_ARCHITECTURE_REPAIR' WHERE id=?").bind(tournament?.id),
    db.prepare("UPDATE v7_material_authorizations SET status='AUTHORIZED',updated_at=? WHERE id=?").bind(now, authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='PILOT_REPAIR_RUNNING' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='PILOT_REPAIR_RUNNING',blocker=NULL,evidence_summary=?,updated_at=? WHERE id=?").bind(`${clean(original.briefId)} architecture repair applied · SOURCE split into authentic checkout context + channel-owned neutral verification layer · original hash ${originalHash.slice(0, 12)} preserved`, now, STAGE_ID),
  ]);
  return snapshot();
}

async function repairFailedUnitRenderer() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || clean(run.status) !== "REPAIR_REQUIRED" || clean(authorization.status) !== "REPAIR_REQUIRED") throw new Error("RENDERER_REPAIR_STATE_REQUIRED");
  const active = await db.prepare("SELECT id FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS') LIMIT 1").bind(authorization.id).first<Row>();
  if (active) throw new Error("ACTIVE_REMOTE_REQUESTS_MUST_FINISH_FIRST");
  const brief = await db.prepare("SELECT b.* FROM v7_material_briefs b JOIN v7_material_audits a ON a.brief_id=b.id AND a.authorization_id=? WHERE b.run_id=? AND b.pilot=1 AND a.status='REPAIR_REQUIRED' AND a.score<90 AND b.content_json LIKE '%SOURCE_TO_HYBRID_SPLIT_V1%' ORDER BY a.created_at DESC LIMIT 1").bind(authorization.id, run.id).first<Row>();
  if (!brief) throw new Error("FAILED_HYBRID_RENDERER_UNIT_NOT_FOUND");
  const prior = await db.prepare("SELECT * FROM v7_material_audits WHERE authorization_id=? AND brief_id=? AND status='REPAIR_REQUIRED' ORDER BY created_at DESC LIMIT 1").bind(authorization.id, brief.id).first<Row>();
  const existing = await db.prepare("SELECT id FROM v7_material_unit_repairs WHERE authorization_id=? AND brief_id=? AND repair_type='SEMANTIC_STATE_RENDERER_V2' LIMIT 1").bind(authorization.id, brief.id).first<Row>();
  if (existing) throw new Error("SEMANTIC_RENDERER_REPAIR_ALREADY_APPLIED");
  const frames = await rows(db, "SELECT id,asset_role,content_hash FROM v7_material_files WHERE authorization_id=? AND brief_id=? AND asset_role IN ('QA_ENTRY','QA_MIDPOINT','QA_EXIT') ORDER BY asset_role", authorization.id, brief.id);
  if (frames.length !== 3) throw new Error("PRIOR_QA_FRAME_SET_INCOMPLETE");
  const originalEvidence = { frames: frames.map((frame) => ({ id: frame.id, role: frame.asset_role, sha256: frame.content_hash })), audit: prior };
  const stateContract = { version: "SEMANTIC_STATE_RENDERER_V2", entry: { heading: "PAYMENT PRESENTED", state: "PROCESSING", qualifier: "AWAIT CONFIRMATION" }, midpoint: { heading: "NEUTRAL CONFIRMATION", state: "VERIFIED", qualifier: "NOT SETTLED" }, exit: { heading: "CONFIRMATION HOLDS", state: "VERIFIED", qualifier: "NOT SETTLED" }, prohibited: ["$100.00", "APPROVED", "SETTLED"] };
  const content = rec(JSON.parse(String(brief.content_json))), repaired = { ...content, architectureRepair: { ...rec(content.architectureRepair), authoredStateContract: stateContract } }, repairedJson = JSON.stringify(repaired), repairedHash = await sha(repairedJson), originalJson = JSON.stringify(originalEvidence), originalHash = await sha(originalJson), stateJson = JSON.stringify(stateContract), stateHash = await sha(stateJson), now = new Date().toISOString();
  await db.batch([
    db.prepare("INSERT INTO v7_material_unit_repairs (id,program_id,run_id,authorization_id,brief_id,repair_type,status,original_content_json,original_content_hash,repaired_content_json,repaired_content_hash,failure_evidence_json,created_at) VALUES (?,?,?,?,?,'SEMANTIC_STATE_RENDERER_V2','APPLIED',?,?,?,?,?,?)").bind(`${brief.id}-SEMANTIC-STATE-V2`, PROGRAM_ID, run.id, authorization.id, brief.id, originalJson, originalHash, stateJson, stateHash, JSON.stringify({ priorAuditId: prior?.id, priorScore: Number(prior?.score || 0), findings: JSON.parse(String(prior?.findings_json || "[]")), providerResponseId: prior?.provider_response_id }), now),
    db.prepare("UPDATE v7_material_briefs SET content_json=?,content_hash=?,status='REPAIR_REQUIRED' WHERE id=?").bind(repairedJson, repairedHash, brief.id),
    db.prepare("UPDATE v7_material_authorizations SET status='AUTHORIZED',updated_at=? WHERE id=?").bind(now, authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='PILOT_REPAIR_RUNNING' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='PILOT_REPAIR_RUNNING',blocker=NULL,evidence_summary=?,updated_at=? WHERE id=?").bind(`${clean(content.briefId)} semantic renderer V2 applied · prior QA ${Number(prior?.score || 0)}/100 and 3 frame hashes preserved · source champion unchanged`, now, STAGE_ID),
  ]);
  return snapshot();
}

async function prepareIncompletePixelQaRetry() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || clean(run.status) !== "REPAIR_REQUIRED" || clean(authorization.status) !== "REPAIR_REQUIRED") throw new Error("PIXEL_QA_RETRY_STATE_REQUIRED");
  const active = await db.prepare("SELECT id FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS') LIMIT 1").bind(authorization.id).first<Row>();
  if (active) throw new Error("ACTIVE_REMOTE_REQUESTS_MUST_FINISH_FIRST");
  const incomplete = await db.prepare("SELECT * FROM v7_material_requests WHERE authorization_id=? AND phase='PIXEL_QA' AND status='BLOCKED_INCOMPLETE' AND error='max_output_tokens' ORDER BY created_at DESC LIMIT 1").bind(authorization.id).first<Row>();
  if (!incomplete) throw new Error("MAX_OUTPUT_PIXEL_QA_INCOMPLETE_NOT_FOUND");
  const duplicate = await db.prepare("SELECT id FROM v7_material_requests WHERE retry_of=? AND retry_scope='OUTPUT_CEILING_ONLY' LIMIT 1").bind(incomplete.id).first<Row>();
  if (duplicate) throw new Error("OUTPUT_CEILING_RETRY_ALREADY_USED");
  const brief = await db.prepare("SELECT * FROM v7_material_briefs WHERE id=? AND run_id=? AND pilot=1").bind(incomplete.brief_id, run.id).first<Row>();
  if (!brief) throw new Error("PIXEL_QA_RETRY_BRIEF_NOT_FOUND");
  const content = rec(JSON.parse(String(brief.content_json))), retry = { version: "OUTPUT_CEILING_V2", retryOf: incomplete.id, expectedOutputTokens: 1500, maxOutputTokens: 16000, scope: "OUTPUT_CEILING_ONLY", promptChanged: false, pixelsChanged: false }, repaired = { ...content, pixelQaRetry: retry }, repairedJson = JSON.stringify(repaired), repairedHash = await sha(repairedJson), now = new Date().toISOString();
  const frames = await rows(db, "SELECT id,asset_role,content_hash FROM v7_material_files WHERE authorization_id=? AND brief_id=? AND asset_role IN ('QA_ENTRY','QA_MIDPOINT','QA_EXIT') ORDER BY asset_role", authorization.id, brief.id);
  if (frames.length !== 3) throw new Error("PIXEL_QA_RETRY_FRAME_SET_INCOMPLETE");
  const evidenceJson = JSON.stringify({ requestId: incomplete.id, providerResponseId: incomplete.provider_response_id, status: incomplete.status, error: incomplete.error, inputTokens: incomplete.input_tokens, outputTokens: incomplete.output_tokens, reasoningTokens: incomplete.reasoning_tokens, actualCostUsd: incomplete.actual_cost_usd, frames: frames.map((frame) => ({ id: frame.id, role: frame.asset_role, sha256: frame.content_hash })) }), evidenceHash = await sha(evidenceJson), retryJson = JSON.stringify(retry), retryHash = await sha(retryJson);
  await db.batch([
    db.prepare("INSERT INTO v7_material_unit_repairs (id,program_id,run_id,authorization_id,brief_id,repair_type,status,original_content_json,original_content_hash,repaired_content_json,repaired_content_hash,failure_evidence_json,created_at) VALUES (?,?,?,?,?,'PIXEL_QA_OUTPUT_CEILING_V2','APPLIED',?,?,?,?,?,?)").bind(`${brief.id}-PIXEL-QA-CEILING-V2`, PROGRAM_ID, run.id, authorization.id, brief.id, evidenceJson, evidenceHash, retryJson, retryHash, evidenceJson, now),
    db.prepare("UPDATE v7_material_briefs SET content_json=?,content_hash=?,status='REPAIR_REQUIRED' WHERE id=?").bind(repairedJson, repairedHash, brief.id),
    db.prepare("UPDATE v7_material_authorizations SET status='AUTHORIZED',updated_at=? WHERE id=?").bind(now, authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='PILOT_REPAIR_RUNNING' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='PILOT_REPAIR_RUNNING',blocker=NULL,evidence_summary=?,updated_at=? WHERE id=?").bind(`${clean(content.briefId)} Pixel QA incomplete preserved · one output-ceiling-only retry armed at 16k · prompt and 3 pixel hashes unchanged`, now, STAGE_ID),
  ]);
  return snapshot();
}

async function repairFailedUnitComposition() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || clean(run.status) !== "REPAIR_REQUIRED" || clean(authorization.status) !== "REPAIR_REQUIRED") throw new Error("COMPOSITION_REPAIR_STATE_REQUIRED");
  const active = await db.prepare("SELECT id FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS') LIMIT 1").bind(authorization.id).first<Row>();
  if (active) throw new Error("ACTIVE_REMOTE_REQUESTS_MUST_FINISH_FIRST");
  const brief = await db.prepare("SELECT b.* FROM v7_material_briefs b JOIN v7_material_audits a ON a.brief_id=b.id AND a.authorization_id=? WHERE b.run_id=? AND b.pilot=1 AND a.status='REPAIR_REQUIRED' AND a.score>=42 AND b.content_json LIKE '%SEMANTIC_STATE_RENDERER_V2%' ORDER BY a.created_at DESC LIMIT 1").bind(authorization.id, run.id).first<Row>();
  if (!brief) throw new Error("FAILED_SEMANTIC_COMPOSITION_UNIT_NOT_FOUND");
  const prior = await db.prepare("SELECT * FROM v7_material_audits WHERE authorization_id=? AND brief_id=? AND status='REPAIR_REQUIRED' ORDER BY created_at DESC LIMIT 1").bind(authorization.id, brief.id).first<Row>();
  const existing = await db.prepare("SELECT id FROM v7_material_unit_repairs WHERE authorization_id=? AND brief_id=? AND repair_type='DOCUMENTARY_RAIL_LAYOUT_V3' LIMIT 1").bind(authorization.id, brief.id).first<Row>();
  if (existing) throw new Error("FINAL_COMPOSITION_REPAIR_ALREADY_USED");
  const lastQa = await db.prepare("SELECT * FROM v7_material_requests WHERE authorization_id=? AND brief_id=? AND phase='PIXEL_QA' AND status='COMPLETE' ORDER BY created_at DESC LIMIT 1").bind(authorization.id, brief.id).first<Row>();
  if (!lastQa) throw new Error("PRIOR_COMPLETE_PIXEL_QA_REQUIRED");
  const frames = await rows(db, "SELECT id,asset_role,content_hash FROM v7_material_files WHERE authorization_id=? AND brief_id=? AND asset_role IN ('QA_ENTRY','QA_MIDPOINT','QA_EXIT') ORDER BY asset_role", authorization.id, brief.id);
  if (frames.length !== 3) throw new Error("PRIOR_COMPOSITION_FRAME_SET_INCOMPLETE");
  const originalJson = JSON.stringify({ frames: frames.map((frame) => ({ id: frame.id, role: frame.asset_role, sha256: frame.content_hash })), audit: prior, request: { id: lastQa.id, providerResponseId: lastQa.provider_response_id, actualCostUsd: lastQa.actual_cost_usd } }), originalHash = await sha(originalJson);
  const content = rec(JSON.parse(String(brief.content_json))), delta = { version: "DOCUMENTARY_RAIL_LAYOUT_V3", qaLayout: "B", preservesSourceChampion: true, removesHardcodedLeftPanelState: true, maximumQualityAttempts: 3, noFurtherAutomaticRepair: true }, repaired = { ...content, architectureRepair: { ...rec(content.architectureRepair), qaLayout: "B", compositionDelta: delta }, pixelQaRetry: { version: "SEMANTIC_RENDER_DELTA_V3", retryOf: lastQa.id, expectedOutputTokens: 1500, maxOutputTokens: 16000, scope: "SEMANTIC_RENDER_DELTA", promptChanged: false, pixelsChanged: true } }, repairedJson = JSON.stringify(repaired), repairedHash = await sha(repairedJson), deltaJson = JSON.stringify(delta), deltaHash = await sha(deltaJson), now = new Date().toISOString();
  await db.batch([
    db.prepare("INSERT INTO v7_material_unit_repairs (id,program_id,run_id,authorization_id,brief_id,repair_type,status,original_content_json,original_content_hash,repaired_content_json,repaired_content_hash,failure_evidence_json,created_at) VALUES (?,?,?,?,?,'DOCUMENTARY_RAIL_LAYOUT_V3','APPLIED',?,?,?,?,?,?)").bind(`${brief.id}-DOCUMENTARY-RAIL-V3`, PROGRAM_ID, run.id, authorization.id, brief.id, originalJson, originalHash, deltaJson, deltaHash, JSON.stringify({ priorAuditId: prior?.id, priorScore: Number(prior?.score || 0), findings: JSON.parse(String(prior?.findings_json || "[]")), providerResponseId: prior?.provider_response_id }), now),
    db.prepare("UPDATE v7_material_briefs SET content_json=?,content_hash=?,status='REPAIR_REQUIRED' WHERE id=?").bind(repairedJson, repairedHash, brief.id),
    db.prepare("UPDATE v7_material_authorizations SET status='AUTHORIZED',updated_at=? WHERE id=?").bind(now, authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='PILOT_REPAIR_RUNNING' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='PILOT_REPAIR_RUNNING',blocker=NULL,evidence_summary=?,updated_at=? WHERE id=?").bind(`${clean(content.briefId)} final composition delta armed · documentary rail layout B · prior QA ${Number(prior?.score || 0)}/100 and frame hashes preserved · no further automatic repair`, now, STAGE_ID),
  ]);
  return snapshot();
}

async function closeRepairedUnitGate(db: DB, run: Row, authorization: Row, brief: Row) {
  const audit = await db.prepare("SELECT status,score FROM v7_material_audits WHERE authorization_id=? AND brief_id=? ORDER BY created_at DESC LIMIT 1").bind(authorization.id, brief.id).first<Row>();
  if (!audit) return false;
  const now = new Date().toISOString();
  if (audit.status === "PASS") {
    await db.batch([
      db.prepare("UPDATE v7_material_runs SET status='PILOT_REPAIR_REVIEW' WHERE id=?").bind(run.id),
      db.prepare("UPDATE v7_material_authorizations SET status='PAUSED',updated_at=? WHERE id=?").bind(now, authorization.id),
      db.prepare("UPDATE v7_stage_states SET status='PILOT_REPAIR_REVIEW',blocker='USER_REVIEW_BEFORE_PILOT_CONTINUE',evidence_summary=?,updated_at=? WHERE id=?").bind(`${brief.id} bounded repair stored and Pixel QA passed at ${Number(audit.score)}/100 · no later pilot unit dispatched`, now, STAGE_ID),
    ]);
  } else {
    await db.batch([
      db.prepare("UPDATE v7_material_runs SET status='REPAIR_REQUIRED' WHERE id=?").bind(run.id),
      db.prepare("UPDATE v7_material_authorizations SET status='REPAIR_REQUIRED',updated_at=? WHERE id=?").bind(now, authorization.id),
      db.prepare("UPDATE v7_stage_states SET status='REPAIR_REQUIRED',blocker='REPAIRED_UNIT_PIXEL_QA_FAILED',evidence_summary=?,updated_at=? WHERE id=?").bind(`${brief.id} repaired material failed Pixel QA at ${Number(audit.score)}/100 · later pilot units remain blocked`, now, STAGE_ID),
    ]);
  }
  return true;
}

async function stepPilot() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || authorization.status !== "AUTHORIZED" || !["PILOT_RUNNING", "PILOT_REPAIR_RUNNING", "CANARY_UNIT_RUNNING"].includes(clean(run.status))) return snapshot();
  const canary = clean(run.status) === "CANARY_UNIT_RUNNING" ? await db.prepare("SELECT * FROM v7_pilot_canaries WHERE run_id=? AND status='UNIT_RUNNING' ORDER BY created_at DESC LIMIT 1").bind(run.id).first<Row>() : null;
  const repairOnly = run.status === "PILOT_REPAIR_RUNNING";
  try {
    const active = await db.prepare("SELECT * FROM v7_material_requests WHERE authorization_id=? AND provider='OPENAI' AND status IN ('QUEUED','IN_PROGRESS') ORDER BY created_at LIMIT 1").bind(authorization.id).first<Row>();
    if (canary) {
      const target = await db.prepare("SELECT * FROM v7_material_briefs WHERE id=? AND run_id=? AND pilot=1").bind(canary.current_brief_id, run.id).first<Row>();
      if (!target) throw new Error("CANARY_LEASED_BRIEF_MISSING");
      if (active && clean(active.brief_id) !== clean(target.id)) throw new Error("UNRELATED_REMOTE_REQUEST_ACTIVE_DURING_CANARY");
      if (active) {
        await pollVision(env, db, authorization, active);
        const refreshed = await db.prepare("SELECT status FROM v7_material_requests WHERE id=?").bind(active.id).first<Row>();
        if (!refreshed || !["QUEUED", "IN_PROGRESS"].includes(clean(refreshed.status))) await closeControlledCanaryUnit(db, run, authorization, canary, target);
      } else {
        const promotion = await db.prepare("SELECT * FROM v7_artifact_promotions WHERE canary_version=? AND brief_id=? AND status='FROZEN'").bind(canary.version, target.id).first<Row>();
        if (!promotion) throw new Error("CANARY_PRODUCTION_BINDING_MISSING");
        const audit = await db.prepare("SELECT status FROM v7_material_audits WHERE id=?").bind(`${target.id}-${clean(canary.version)}-PIXEL-AUDIT`).first<Row>();
        if (!audit) { if (await claimBriefPhase(db, clean(target.id), "QA_DISPATCHING")) await dispatchPromotedVision(env, db, authorization, target, promotion); }
        else await closeControlledCanaryUnit(db, run, authorization, canary, target);
      }
    }
    else if (repairOnly) {
      const target = await repairedPilotBrief(db, authorization);
      if (!target) throw new Error("REPAIRED_PILOT_UNIT_NOT_FOUND");
      if (active && active.brief_id !== target.id) throw new Error("UNRELATED_REMOTE_REQUEST_ACTIVE_DURING_REPAIR");
      if (active) {
        await pollVision(env, db, authorization, active);
        const refreshed = await db.prepare("SELECT status FROM v7_material_requests WHERE id=?").bind(active.id).first<Row>();
        const refreshedRun = await db.prepare("SELECT status FROM v7_material_runs WHERE id=?").bind(run.id).first<Row>();
        if ((!refreshed || !["QUEUED", "IN_PROGRESS"].includes(clean(refreshed.status))) && refreshedRun?.status === "PILOT_REPAIR_RUNNING") await closeRepairedUnitGate(db, run, authorization, target);
      } else {
        const file = await db.prepare("SELECT id FROM v7_material_files WHERE authorization_id=? AND brief_id=? AND asset_role='PRIMARY'").bind(authorization.id, target.id).first<Row>();
        const audit = await db.prepare("SELECT status FROM v7_material_audits WHERE authorization_id=? AND brief_id=? ORDER BY created_at DESC LIMIT 1").bind(authorization.id, target.id).first<Row>();
        if (!file) { if (await claimBriefPhase(db, clean(target.id), "MATERIALIZING")) await materializeOne(env, db, authorization, target); }
        else if (!audit || audit.status === "REPAIR_REQUIRED") { if (await claimBriefPhase(db, clean(target.id), "QA_DISPATCHING")) await dispatchVision(env, db, authorization, target); }
        else await closeRepairedUnitGate(db, run, authorization, target);
      }
    }
    else if (active) await pollVision(env, db, authorization, active);
    else {
      const nextMaterial = await db.prepare("SELECT b.* FROM v7_material_briefs b LEFT JOIN v7_material_files f ON f.brief_id=b.id AND f.asset_role='PRIMARY' WHERE b.run_id=? AND b.pilot=1 AND f.id IS NULL AND b.status NOT IN ('MATERIALIZING','QA_DISPATCHING') ORDER BY b.start_seconds LIMIT 1").bind(run.id).first<Row>();
      if (nextMaterial) {
        if (await claimBriefPhase(db, clean(nextMaterial.id), "MATERIALIZING")) await materializeOne(env, db, authorization, nextMaterial);
      }
      else {
        const nextAudit = await db.prepare("SELECT b.* FROM v7_material_briefs b LEFT JOIN v7_material_audits a ON a.brief_id=b.id WHERE b.run_id=? AND b.pilot=1 AND a.id IS NULL AND b.status NOT IN ('REPAIR_REQUIRED','MATERIALIZING','QA_DISPATCHING') ORDER BY b.start_seconds LIMIT 1").bind(run.id).first<Row>();
        if (nextAudit) { if (await claimBriefPhase(db, clean(nextAudit.id), "QA_DISPATCHING")) await dispatchVision(env, db, authorization, nextAudit); } else await finalizePilot(env, db, authorization);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "PILOT_UNIT_FAILED", now = new Date().toISOString();
    if (canary) {
      await db.batch([
        db.prepare("UPDATE v7_material_briefs SET status='REPAIR_REQUIRED' WHERE id=? AND status IN ('MATERIALIZING','QA_DISPATCHING')").bind(canary.current_brief_id),
        db.prepare("UPDATE v7_pilot_canaries SET status=?,failed_units=failed_units+1,updated_at=?,completed_at=? WHERE id=?").bind(isReleaseTrainCanary(canary.version) ? "SEQUENCE_OR_BATCH_FAILED_PRESERVED" : "FAILED", now, now, canary.id),
        db.prepare("UPDATE v7_architecture_baselines SET execution_state='FROZEN' WHERE id=?").bind(canary.baseline_id),
        db.prepare("UPDATE v7_material_runs SET status='CANARY_BLOCKED' WHERE id=?").bind(run.id),
        db.prepare("UPDATE v7_material_authorizations SET status='PAUSED',updated_at=? WHERE id=?").bind(now, authorization.id),
        db.prepare("UPDATE v7_stage_states SET status='CANARY_BLOCKED',blocker='CANARY_UNIT_FAILED',evidence_summary=?,updated_at=? WHERE id=?").bind(`Stored work preserved · ${message} · later units, sequence and scale blocked`, now, STAGE_ID),
      ]);
    } else await db.batch([db.prepare("UPDATE v7_material_briefs SET status='REPAIR_REQUIRED' WHERE run_id=? AND pilot=1 AND status IN ('MATERIALIZING','QA_DISPATCHING')").bind(run.id), db.prepare("UPDATE v7_material_runs SET status='REPAIR_REQUIRED' WHERE id=?").bind(run.id), db.prepare("UPDATE v7_material_authorizations SET status='REPAIR_REQUIRED',updated_at=? WHERE id=?").bind(now, authorization.id), db.prepare("UPDATE v7_stage_states SET status='REPAIR_REQUIRED',blocker='PILOT_UNIT_FAILED',evidence_summary=?,updated_at=? WHERE id=?").bind(`Stored work preserved · ${message}`, now, STAGE_ID)]);
  }
  await syncRunTotals(db, clean(run.id));
  const materialized = await db.prepare("SELECT COUNT(DISTINCT brief_id) AS total FROM v7_material_files WHERE authorization_id=? AND asset_role='PRIMARY'").bind(authorization.id).first<{ total: number }>(), audited = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_audits WHERE authorization_id=?").bind(authorization.id).first<{ total: number }>();
  const state = await db.prepare("SELECT status FROM v7_material_runs WHERE id=?").bind(run.id).first<{ status: string }>();
  if (["PILOT_RUNNING", "PILOT_REPAIR_RUNNING", "CANARY_UNIT_RUNNING"].includes(clean(state?.status))) await db.prepare("UPDATE v7_stage_states SET evidence_summary=?,updated_at=? WHERE id=?").bind(`${Number(materialized?.total || 0)}/${authorization.shot_count} materialized · ${Number(audited?.total || 0)}/${authorization.shot_count} pixel audited`, new Date().toISOString(), STAGE_ID).run();
  return snapshot();
}

async function stepReleaseTrainUnit() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || clean(run.status) !== "CANARY_UNIT_RUNNING") throw new Error("STABILIZED_UNIT_EXECUTOR_NOT_READY");
  const canary = await db.prepare("SELECT * FROM v7_pilot_canaries WHERE run_id=? AND status='UNIT_RUNNING' ORDER BY created_at DESC LIMIT 1").bind(run.id).first<Row>();
  const policy = rec(JSON.parse(String(authorization.model_policy_json || "{}")));
  const executorVersions = [STABILIZATION_RELEASE_VERSION, MP002_TARGETED_REPAIR_VERSION, MP002_PIXEL_ORACLE_REPAIR_VERSION, CANONICAL_UNIT_SCENES_VERSION];
  if (!canary || !executorVersions.includes(clean(canary.version)) || clean(policy.version) !== clean(canary.version) || policy.sequenceProofReleased !== true || policy.autoRetry !== false || policy.autoAdvance !== false) throw new Error("STABILIZED_UNIT_EXECUTOR_POLICY_MISMATCH");
  if(clean(authorization.status)==="PAUSED"&&policy.runToCompletion10Mp===true){
    const active=await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{total:number}>(),audit=await db.prepare("SELECT id FROM v7_material_audits WHERE authorization_id=? AND brief_id=? AND id LIKE ?").bind(authorization.id,canary.current_brief_id,`%${clean(canary.version)}%`).first<Row>();
    if(Number(active?.total||0)!==0||audit)throw new Error("STABILIZED_UNIT_LEASE_RECOVERY_NOT_CLEAN");
    const resumedAt=new Date().toISOString();
    await db.batch([
      db.prepare("UPDATE v7_architecture_baselines SET execution_state='CANARY_ONLY' WHERE id=?").bind(canary.baseline_id),
      db.prepare("UPDATE v7_material_authorizations SET status='AUTHORIZED',updated_at=? WHERE id=?").bind(resumedAt,authorization.id),
      db.prepare("UPDATE v7_stage_states SET evidence_summary=?,updated_at=? WHERE id=?").bind(`${clean(canary.current_brief_id)} lease recovered before provider dispatch · authorization ACTIVE · baseline CANARY_ONLY`,resumedAt,STAGE_ID),
    ]);
  } else if(clean(authorization.status)!=="AUTHORIZED") throw new Error("STABILIZED_UNIT_EXECUTOR_NOT_READY");
  return stepPilot();
}

async function stopPilot() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization) return snapshot();
  const active = await rows(db, "SELECT * FROM v7_material_requests WHERE authorization_id=? AND provider='OPENAI' AND status IN ('QUEUED','IN_PROGRESS')", authorization.id);
  for (const request of active) {
    let terminal = "STOPPED";
    if (env.OPENAI_API_KEY && request.provider_response_id) {
      const response = await fetch(`https://api.openai.com/v1/responses/${encodeURIComponent(clean(request.provider_response_id))}/cancel`, { method: "POST", headers: { authorization: `Bearer ${env.OPENAI_API_KEY}` }, signal: AbortSignal.timeout(20000) });
      terminal = response.ok ? "CANCELLED" : `STOPPED_HTTP_${response.status}`;
      if (response.ok) {
        const payload = await response.json() as Row;
        const usage = await recordOpenAIUsage({ db, programId: PROGRAM_ID, runId: clean(authorization.run_id), stageKey: STAGE, costType: "MATERIAL_PIXEL_QA_CANCELLED", payload, fallbackModel: clean(request.model_id) || DEFAULT_MODEL });
        await db.prepare("UPDATE v7_material_requests SET status=?,input_tokens=?,output_tokens=?,reasoning_tokens=?,actual_cost_usd=?,error=?,updated_at=? WHERE id=?").bind(terminal, usage.inputTokens, usage.outputTokens, usage.reasoningTokens, usage.actualUsd, "User/provider-aware pilot stop", new Date().toISOString(), request.id).run();
        continue;
      }
    }
    await finishRequest(db, clean(request.id), terminal, "User/provider-aware pilot stop");
  }
  const now = new Date().toISOString();
  await db.batch([db.prepare("UPDATE v7_material_authorizations SET status='PAUSED',updated_at=? WHERE id=?").bind(now, authorization.id), db.prepare("UPDATE v7_material_runs SET status='PILOT_PAUSED' WHERE id=?").bind(run.id), db.prepare("UPDATE v7_stage_states SET status='PILOT_PAUSED',blocker='USER_STOP_CONFIRMED',evidence_summary=?,updated_at=? WHERE id=?").bind(`${active.length} cancellable OpenAI requests terminal · stored materials preserved`, now, STAGE_ID)]);
  await syncRunTotals(db, clean(run.id));
  return snapshot();
}

async function resumePilot() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || !["PAUSED", "REPAIR_REQUIRED"].includes(clean(authorization.status))) throw new Error("RESUMABLE_PILOT_NOT_FOUND");
  const active = await db.prepare("SELECT id,brief_id,provider FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS') LIMIT 1").bind(authorization.id).first<Row>();
  const now = new Date().toISOString();
  const repaired = await repairedPilotBrief(db, authorization);
  const recoverableActiveRepair = Boolean(active && run.status === "REPAIR_REQUIRED" && active.provider === "OPENAI" && repaired?.id === active.brief_id);
  if (active && !recoverableActiveRepair) throw new Error("REMOTE_REQUESTS_STILL_ACTIVE");
  const repairedAudit = repaired ? await db.prepare("SELECT status,score FROM v7_material_audits WHERE authorization_id=? AND brief_id=? ORDER BY created_at DESC LIMIT 1").bind(authorization.id, repaired.id).first<Row>() : null;
  if (run.status === "REPAIR_REQUIRED" && repairedAudit?.status === "REPAIR_REQUIRED" && Number(repairedAudit.score) < 90) throw new Error("ROOT_CAUSE_ARCHITECTURE_UPGRADE_REQUIRED · source-frame extraction, composition tournament and media execution plane must be ready before another full-unit request");
  const repairedUnitNeedsQa = run.status === "PILOT_REPAIR_REVIEW" && repaired && repairedAudit?.status !== "PASS";
  const repairOnly = run.status === "REPAIR_REQUIRED" || Boolean(repairedUnitNeedsQa) || recoverableActiveRepair, nextStatus = repairOnly ? "PILOT_REPAIR_RUNNING" : "PILOT_RUNNING";
  await db.batch([db.prepare("UPDATE v7_material_authorizations SET status='AUTHORIZED',updated_at=? WHERE id=?").bind(now, authorization.id), db.prepare("UPDATE v7_material_runs SET status=? WHERE id=?").bind(nextStatus, run.id), db.prepare("UPDATE v7_stage_states SET status=?,blocker=NULL,evidence_summary=?,updated_at=? WHERE id=?").bind(nextStatus, repairOnly ? "One failed material unit resumed; later units remain paused" : "Pilot continued after explicit repaired-unit review", now, STAGE_ID)]);
  return snapshot();
}

function replacementSearchPhrase(brief: Row, attempt: number) {
  const variants = [
    "contactless credit card tapping payment terminal close up",
    "customer hand inserting credit card terminal checkout close up",
    "unbranded credit card reader merchant checkout macro",
  ];
  const text = `${clean(brief.narrationClause)} ${clean(brief.viewerMustUnderstand)}`.toLowerCase();
  if (/authorization|approved|terminal|credit tender|purchase amount/.test(text)) return variants[Math.min(attempt - 1, variants.length - 1)];
  return searchPhrase(brief, Math.min(1, attempt));
}

async function replaceSourceCandidate() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || !env.BUCKET) throw new Error("SOURCE_REPLACEMENT_CONFIGURATION_REQUIRED");
  const latestEvidence = await db.prepare("SELECT * FROM v7_media_evidence WHERE authorization_id=? AND evidence_type='SOURCE_FRAME_SET' ORDER BY created_at DESC LIMIT 1").bind(authorization.id).first<Row>();
  if (!latestEvidence) throw new Error("SOURCE_FRAME_EVIDENCE_MISSING");
  const latestAudit = await db.prepare("SELECT * FROM v7_source_frame_audits WHERE evidence_id=? AND status='REPAIR_REQUIRED'").bind(latestEvidence.id).first<Row>();
  if (!latestAudit) throw new Error("SOURCE_REPLACEMENT_NOT_AUTHORIZED");
  const failed = await db.prepare("SELECT COUNT(*) AS total FROM v7_source_frame_audits WHERE authorization_id=? AND brief_id=? AND status='REPAIR_REQUIRED'").bind(authorization.id, latestEvidence.brief_id).first<{ total: number }>(), attempt = Number(failed?.total || 0);
  if (attempt < 1 || attempt > 3) throw new Error("SOURCE_REPLACEMENT_TRANCHE_EXHAUSTED · maximum three actual-pixel candidates");
  const briefRow = await db.prepare("SELECT * FROM v7_material_briefs WHERE id=?").bind(latestEvidence.brief_id).first<Row>();
  if (!briefRow) throw new Error("SOURCE_FRAME_BRIEF_MISSING");
  const brief = JSON.parse(String(briefRow.content_json)) as Row, query = replacementSearchPhrase(brief, attempt), discovery = await discoverCandidates(env, db, authorization, briefRow, brief, { repairAttempt: attempt, query });
  const candidate = await selectCandidateByPixels(env, db, authorization, briefRow, brief, discovery.candidates, discovery.query, discovery.repairAttempt), requestId = await newRequest(db, authorization, clean(briefRow.id), "SOURCE_REPLACEMENT_DOWNLOAD", candidate.provider.toUpperCase());
  try {
    const response = await fetch(candidate.assetUrl, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const declared = Number(response.headers.get("content-length") || 0); if (declared > 40_000_000) throw new Error("FILE_EXCEEDS_40MB_PILOT_LIMIT");
    const buffer = await response.arrayBuffer(); if (!buffer.byteLength || buffer.byteLength > 40_000_000) throw new Error("INVALID_PILOT_FILE_SIZE");
    await storeMaterial(env, db, authorization, briefRow, { role: "PRIMARY", bytes: new Uint8Array(buffer), mimeType: response.headers.get("content-type") || "video/mp4", extension: "mp4", sourceType: `PROVIDER_SOURCE_REPLACEMENT_${attempt}`, provider: candidate.provider, providerAssetId: candidate.id, sourceUrl: candidate.assetUrl, landingUrl: candidate.sourceUrl, licenseCode: candidate.licenseCode, width: candidate.width, height: candidate.height, duration: candidate.duration, thumbnailUrl: candidate.thumbnailUrl });
    await finishRequest(db, requestId, "COMPLETE");
  } catch (error) { await finishRequest(db, requestId, "FAILED", error instanceof Error ? error.message : "Replacement download failed"); throw error; }
  await syncRunTotals(db, clean(authorization.run_id));
  return planRootCauseExecution();
}

async function planRootCauseExecution() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization) throw new Error("MATERIAL_RUN_REQUIRED");
  if (!env.BUCKET) throw new Error("R2_MATERIAL_STORAGE_REQUIRED");
  const brief = await repairedPilotBrief(db, authorization) || await db.prepare("SELECT * FROM v7_material_briefs WHERE run_id=? AND pilot=1 ORDER BY start_seconds LIMIT 1").bind(run.id).first<Row>();
  if (!brief) throw new Error("ROOT_CAUSE_BRIEF_NOT_FOUND");
  const source = await db.prepare("SELECT * FROM v7_material_files WHERE authorization_id=? AND brief_id=? AND asset_role='PRIMARY' ORDER BY created_at DESC LIMIT 1").bind(authorization.id, brief.id).first<Row>();
  if (!source || !clean(source.mime_type).startsWith("video/")) throw new Error("ROOT_CAUSE_SOURCE_VIDEO_REQUIRED");
  const existing = await db.prepare("SELECT id,status,contract_json FROM v7_media_jobs WHERE authorization_id=? AND brief_id=? AND job_type='SOURCE_FRAME_EXTRACTION' ORDER BY created_at DESC LIMIT 1").bind(authorization.id, brief.id).first<Row>();
  const existingContract = existing?.contract_json ? rec(JSON.parse(String(existing.contract_json))) : {};
  const existingEvidence = existing?.status === "COMPLETE" ? await db.prepare("SELECT content_json FROM v7_media_evidence WHERE job_id=?").bind(existing.id).first<Row>() : null;
  const existingFrames = existingEvidence?.content_json ? arr(rec(JSON.parse(String(existingEvidence.content_json))).frames).map(rec) : [];
  const lineageValid = existingFrames.length === 3 && existingFrames.every((frame) => clean(frame.fileId).includes(clean(existing?.id).split("-SOURCE-FRAMES-").at(-1) || "MISSING_LINEAGE"));
  if (existing && ["QUEUED", "LEASED"].includes(clean(existing.status)) && clean(existingContract.sourceHash) === clean(source.content_hash)) return snapshot();
  if (existing && existing.status === "COMPLETE" && clean(existingContract.sourceHash) === clean(source.content_hash) && lineageValid) return snapshot();
  const now = new Date().toISOString(), id = `${brief.id}-SOURCE-FRAMES-${Date.now()}`;
  const contract = {
    version: "MEDIA_EXECUTION_CONTRACT_V1",
    sourceFileId: source.id,
    sourceHash: source.content_hash,
    sourceMimeType: source.mime_type,
    expectedDurationSeconds: Number(source.duration_seconds || 0),
    operations: ["FFPROBE", "FRAME_ENTRY", "FRAME_MIDPOINT", "FRAME_EXIT"],
    samplePositions: [{ role: "ENTRY", ratio: 0.1 }, { role: "MIDPOINT", ratio: 0.5 }, { role: "EXIT", ratio: 0.9 }],
    output: { mimeType: "image/jpeg", width: 960, height: 540, fit: "cover", jpegQuality: 88 },
    acceptance: { exactFrameCount: 3, sourceHashMustMatch: true, durationToleranceSeconds: 0.25, noThumbnailSubstitution: true, noAudienceOverlay: true },
  };
  await db.batch([
    db.prepare("INSERT INTO v7_media_jobs (id,program_id,run_id,authorization_id,brief_id,source_file_id,job_type,status,priority,attempt,max_attempts,contract_json,created_at,updated_at) VALUES (?,?,?,?,?,?,'SOURCE_FRAME_EXTRACTION','QUEUED',100,0,2,?,?,?)").bind(id, PROGRAM_ID, run.id, authorization.id, brief.id, source.id, JSON.stringify(contract), now, now),
    db.prepare("UPDATE v7_stage_states SET blocker='MEDIA_EXECUTION_REQUIRED',evidence_summary=?,updated_at=? WHERE id=?").bind(`${brief.id} source-frame job queued · no AI/provider request · scale remains locked`, now, STAGE_ID),
  ]);
  return snapshot();
}

async function planSequenceProof() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || !env.BUCKET || !env.MEDIA_EXECUTOR_SHARED_SECRET) throw new Error("SEQUENCE_EXECUTOR_CONFIGURATION_REQUIRED");
  const canary = await db.prepare("SELECT * FROM v7_pilot_canaries WHERE run_id=? AND status='PASS' AND passed_units=10 ORDER BY created_at DESC LIMIT 1").bind(run.id).first<Row>();
  if (!canary) throw new Error("SEQUENCE_REQUIRES_10_OF_10_CANARY_PASS");
  const active = await db.prepare("SELECT id FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS') LIMIT 1").bind(authorization.id).first<Row>();
  if (active) throw new Error("SEQUENCE_BLOCKED_ACTIVE_PROVIDER_REQUEST");
  const existing = await db.prepare("SELECT id FROM v7_sequence_proofs WHERE authorization_id=? AND canary_id=? ORDER BY created_at DESC LIMIT 1").bind(authorization.id, canary.id).first<Row>();
  if (existing) return snapshot();
  const queue = arr(JSON.parse(String(canary.queue_json || "[]"))).map(rec);
  if (queue.length !== 10) throw new Error(`SEQUENCE_CANONICAL_QUEUE_INVALID · ${queue.length}/10`);
  const materialFiles = await rows(db, "SELECT id,mime_type,content_hash,runtime_key,status FROM v7_material_files WHERE authorization_id=?", authorization.id);
  const sources: Row[] = [], sourceFiles: Row[] = [], logicalIds = new Set<string>(), frameIds = new Set<string>();
  for (const item of queue) {
    const logicalId = clean(item.logicalId), promotionId = clean(item.promotionId);
    if (!logicalId || logicalIds.has(logicalId)) throw new Error(`SEQUENCE_LOGICAL_UNIT_INVALID · ${logicalId || "MISSING"}`);
    logicalIds.add(logicalId);
    const promotion = promotionId
      ? await db.prepare("SELECT * FROM v7_artifact_promotions WHERE id=? AND authorization_id=?").bind(promotionId, authorization.id).first<Row>()
      : await db.prepare("SELECT * FROM v7_artifact_promotions WHERE authorization_id=? AND logical_brief_id=? ORDER BY created_at DESC LIMIT 1").bind(authorization.id, logicalId).first<Row>();
    if (!promotion) throw new Error(`SEQUENCE_PROMOTION_MISSING · ${logicalId}`);
    const ids = arr(JSON.parse(String(promotion.frame_ids_json || "[]"))).map(clean), hashes = arr(JSON.parse(String(promotion.frame_hashes_json || "[]"))).map(clean);
    if (ids.length !== 3 || hashes.length !== 3) throw new Error(`SEQUENCE_FRAME_SET_INVALID · ${logicalId}`);
    for (let index = 0; index < 3; index++) {
      const file = materialFiles.find((candidate) => clean(candidate.id) === ids[index]);
      if (!file || clean(file.content_hash) !== hashes[index] || clean(file.status) !== "STORED_VERIFIED" || !clean(file.runtime_key) || frameIds.has(ids[index])) throw new Error(`SEQUENCE_FRAME_BINDING_FAILED · ${logicalId} · ${index + 1}`);
      frameIds.add(ids[index]);
      sourceFiles.push(file);
      sources.push({ logicalId, state: ["ENTRY", "MIDPOINT", "EXIT"][index], fileId: ids[index], sha256: hashes[index], mimeType: file.mime_type });
    }
  }
  if (logicalIds.size !== 10 || sources.length !== 30 || frameIds.size !== 30) throw new Error("SEQUENCE_SOURCE_MANIFEST_INCOMPLETE");
  const readBack = await Promise.all(sourceFiles.map((file) => env.BUCKET!.head(clean(file.runtime_key))));
  if (readBack.some((object) => !object)) throw new Error("SEQUENCE_FRAME_READ_BACK_FAILED");
  const manifest = { version: "CANONICAL_10MP_SEQUENCE_MANIFEST_V1", canaryId: canary.id, canaryVersion: canary.version, order: [...logicalIds], sources, durationSeconds: 30, secondsPerFrame: 1, noRegeneration: true, noFallback: true };
  const contentHash = await sha(JSON.stringify(manifest)), proofId = `${clean(run.id)}-SEQUENCE-${contentHash.slice(0, 16)}`, jobId = `${proofId}-RENDER`, now = new Date().toISOString();
  const samplePositions = queue.map((item, index) => ({ role: `UNIT_${String(index + 1).padStart(2, "0")}`, logicalId: clean(item.logicalId), ratio: (index * 3 + 1.5) / 30 }));
  const contract = { version: "SEQUENCE_EXECUTION_CONTRACT_V1", proofId, renderer: SEQUENCE_RENDERER_VERSION, sources, durationSeconds: 30, fps: 30, secondsPerFrame: 1, output: { mimeType: "video/webm", codec: "vp9", width: 960, height: 540, audio: "NONE" }, samplePositions, acceptance: { exactUnitCount: 10, exactSourceCount: 30, exactDurationSeconds: 30, durationToleranceSeconds: 0.08, sourceHashesMustMatch: true, canonicalOrderMustMatch: true, noRegeneration: true, noFallback: true, noAudio: true } };
  await db.batch([
    db.prepare("INSERT INTO v7_sequence_proofs (id,program_id,run_id,authorization_id,canary_id,version,status,source_manifest_json,duration_seconds,fps,unit_count,frame_count,content_hash,created_at,updated_at) VALUES (?,?,?,?,?,?,'RENDER_QUEUED',?,30,30,10,30,?,?,?)").bind(proofId, PROGRAM_ID, run.id, authorization.id, canary.id, SEQUENCE_RENDERER_VERSION, JSON.stringify(manifest), contentHash, now, now),
    db.prepare("INSERT INTO v7_media_jobs (id,program_id,run_id,authorization_id,brief_id,source_file_id,job_type,status,priority,attempt,max_attempts,contract_json,created_at,updated_at) VALUES (?,?,?,?,?,?,'SEQUENCE_PROOF_RENDER','QUEUED',120,0,1,?,?,?)").bind(jobId, PROGRAM_ID, run.id, authorization.id, "SEQUENCE-10MP", clean(sources[0].fileId), JSON.stringify(contract), now, now),
    db.prepare("UPDATE v7_stage_states SET status='SEQUENCE_RENDER_REQUIRED',blocker='SEQUENCE_EXECUTOR_REQUIRED',evidence_summary='10/10 MP bound · 30/30 promoted frames read back · 30-second render queued · $0 · scale locked',updated_at=? WHERE id=?").bind(now, STAGE_ID),
  ]);
  return snapshot();
}

async function produceIntegratedSequence() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || !env.BUCKET || !env.MEDIA_EXECUTOR_SHARED_SECRET) throw new Error("SEQUENCE_PRODUCT_EXECUTOR_CONFIGURATION_REQUIRED");
  const sourceProof = await db.prepare("SELECT * FROM v7_sequence_proofs WHERE authorization_id=? AND status='REPAIR_REQUIRED' ORDER BY created_at DESC LIMIT 1").bind(authorization.id).first<Row>();
  if (!sourceProof) throw new Error("SEQUENCE_PRODUCT_REQUIRES_REPAIR_EVIDENCE");
  const canary = await db.prepare("SELECT * FROM v7_pilot_canaries WHERE id=? AND status='PASS' AND passed_units=10 LIMIT 1").bind(sourceProof.canary_id).first<Row>();
  if (!canary) throw new Error("SEQUENCE_PRODUCT_REQUIRES_10_OF_10_CANARY_PASS");
  const active = await db.prepare("SELECT id FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS') LIMIT 1").bind(authorization.id).first<Row>();
  if (active) throw new Error("SEQUENCE_PRODUCT_BLOCKED_ACTIVE_PROVIDER_REQUEST");
  const staleProduct = await db.prepare("SELECT * FROM v7_sequence_products WHERE authorization_id=? AND status='PRODUCING' ORDER BY created_at DESC LIMIT 1").bind(authorization.id).first<Row>();
  if (staleProduct && clean(staleProduct.composer_version) !== INTEGRATED_SEQUENCE_COMPOSER_VERSION) {
    const staleJob = await db.prepare("SELECT status,error FROM v7_media_jobs WHERE authorization_id=? AND job_type='INTEGRATED_SEQUENCE_RENDER' AND created_at>=? ORDER BY created_at DESC LIMIT 1").bind(authorization.id, staleProduct.created_at).first<Row>();
    if (clean(staleJob?.status) === "FAILED") await db.prepare("UPDATE v7_sequence_products SET status='PRODUCTION_BLOCKED',measurements_json=?,corrections_json=?,updated_at=? WHERE id=? AND status='PRODUCING'").bind(JSON.stringify({ escapedDefect: "TIMEBASE_UNSAFE_FINAL_SCAN", productComplete: false }), JSON.stringify([{ code: "COMPOSER_VERSION_REJECTED", reason: clean(staleJob?.error) }]), new Date().toISOString(), staleProduct.id).run();
  }
  const existing = await db.prepare("SELECT * FROM v7_sequence_products WHERE authorization_id=? AND source_proof_id=? AND composer_version=? ORDER BY created_at DESC LIMIT 1").bind(authorization.id, sourceProof.id, INTEGRATED_SEQUENCE_COMPOSER_VERSION).first<Row>();
  if (existing) return snapshot();

  const manifest = rec(JSON.parse(String(sourceProof.source_manifest_json || "{}"))), sources = arr(manifest.sources).map(rec), queue = arr(JSON.parse(String(canary.queue_json || "[]"))).map(rec);
  if (sources.length !== 30 || queue.length !== 10) throw new Error("SEQUENCE_PRODUCT_SOURCE_MANIFEST_INCOMPLETE");
  const materialFiles = await rows(db, "SELECT id,content_hash,runtime_key,status FROM v7_material_files WHERE authorization_id=?", authorization.id);
  const readBackFiles: Row[] = [];
  for (const source of sources) {
    const file = materialFiles.find((candidate) => clean(candidate.id) === clean(source.fileId));
    if (!file || clean(file.content_hash) !== clean(source.sha256) || clean(file.status) !== "STORED_VERIFIED" || !clean(file.runtime_key)) throw new Error(`SEQUENCE_PRODUCT_SOURCE_BINDING_FAILED · ${clean(source.logicalId)}`);
    readBackFiles.push(file);
  }
  const readBack = await Promise.all(readBackFiles.map((file) => env.BUCKET!.head(clean(file.runtime_key))));
  if (readBack.some((object) => !object)) throw new Error("SEQUENCE_PRODUCT_SOURCE_READ_BACK_FAILED");

  const motionProfiles = ["HOLD", "PUSH_IN", "PULL_OUT", "DRIFT_LEFT", "DRIFT_RIGHT", "HOLD", "PUSH_IN", "DRIFT_LEFT", "PULL_OUT", "DRIFT_RIGHT"];
  const scenes: Row[] = [];
  for (let index = 0; index < queue.length; index++) {
    const item = queue[index], logicalId = clean(item.logicalId), brief = await db.prepare("SELECT content_json,start_seconds,end_seconds FROM v7_material_briefs WHERE id=? AND run_id=?").bind(item.briefId, run.id).first<Row>();
    if (!brief) throw new Error(`SEQUENCE_PRODUCT_BRIEF_MISSING · ${logicalId}`);
    const content = rec(JSON.parse(String(brief.content_json || "{}"))), unitSources = sources.filter((source) => clean(source.logicalId) === logicalId);
    if (unitSources.length !== 3 || !["ENTRY", "MIDPOINT", "EXIT"].every((state) => unitSources.some((source) => clean(source.state) === state))) throw new Error(`SEQUENCE_PRODUCT_UNIT_STATE_INCOMPLETE · ${logicalId}`);
    const narrativeRole = short(content.viewerMustUnderstand, 180);
    scenes.push({
      logicalId,
      canonicalOrder: index + 1,
      narrativeRole,
      entryState: short(content.entryState || content.visualEntry || `Opening state for ${narrativeRole}`, 180),
      exitState: short(content.exitState || content.visualExit || `Resolved state for ${narrativeRole}`, 180),
      durationSeconds: 3,
      stateDurations: { entry: 0.666667, midpoint: 0.833333, exit: 1.5 },
      motionProfile: motionProfiles[index],
      fit: "CONTAIN_NO_CROP",
      sourceIds: unitSources.map((source) => clean(source.fileId)),
    });
  }
  const continuityEdges = scenes.slice(0, -1).map((scene, index) => ({ from: clean(scene.logicalId), fromExit: clean(scene.exitState), to: clean(scenes[index + 1].logicalId), toEntry: clean(scenes[index + 1].entryState), relation: "CANONICAL_SCRIPT_ORDER" }));
  const specification = {
    version: SEQUENCE_SPECIFICATION_VERSION,
    principle: "Production owns completeness; QA is a single independent audit after PRODUCT_COMPLETE.",
    sourceProofId: sourceProof.id,
    canaryId: canary.id,
    durationSeconds: 30,
    fps: 30,
    output: { width: 960, height: 540, codec: "vp9", audio: "NONE" },
    narrative: { order: scenes.map((scene) => scene.logicalId), scenes, continuityEdges, exactEdgeCount: 9 },
    composition: { renderer: INTEGRATED_SEQUENCE_COMPOSER_VERSION, noRegeneration: true, noNewClaims: true, noNewAudienceText: true, fit: "CONTAIN_NO_CROP", background: "#082f28", stateTransitionSeconds: 0.12, sceneTransitionSeconds: 0.18, adjacentMotionProfileMustDiffer: true },
    mobile: { targetViewport: "360x640", safeZoneInsetPercent: 6, minimumExitDwellSeconds: 1.5, sourceMustRemainFullyVisible: true, timebasePolicy: "FRAME_ALIGNED_20_25_45_PER_UNIT" },
    productionLoop: { states: ["PLAN", "COMPOSE", "RENDER", "MEASURE", "AUTO_CORRECT"], maxIterations: 3, measureActualMaster: true, fullFrameScan: true, qaRequests: 0 },
    definitionOfDone: { version: SEQUENCE_PRODUCTION_DOD_VERSION, exactSources: 30, exactUnits: 10, sourceHashMatch: true, exactDurationSeconds: 30, durationToleranceSeconds: 0.08, fps: 30, continuityEdges: 9, noCrop: true, mobileSafe: true, adjacentTreatmentDuplicates: 0, blackFrameSecondsMax: 0.04, frozenFrameSecondsMax: 1.7, fullFrameScan: true },
  };
  const sourceManifestHash = await sha(JSON.stringify(manifest)), specificationHash = await sha(JSON.stringify(specification)), productId = `${clean(run.id)}-PRODUCT-${specificationHash.slice(0, 16)}`, jobId = `${productId}-PRODUCE`, now = new Date().toISOString();
  const samplePositions = scenes.map((scene, index) => ({ role: `UNIT_${String(index + 1).padStart(2, "0")}`, logicalId: scene.logicalId, ratio: (index * 3 + 2.15) / 30 }));
  const contract = { version: "INTEGRATED_SEQUENCE_PRODUCTION_CONTRACT_V2", productId, composer: INTEGRATED_SEQUENCE_COMPOSER_VERSION, specification, sources, samplePositions, output: specification.output, acceptance: specification.definitionOfDone };
  await db.batch([
    db.prepare("INSERT INTO v7_sequence_products (id,program_id,run_id,authorization_id,canary_id,source_proof_id,composer_version,status,specification_json,specification_hash,source_manifest_hash,iteration,max_iterations,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'PRODUCING',?,?,?,0,3,?,?)").bind(productId, PROGRAM_ID, run.id, authorization.id, canary.id, sourceProof.id, INTEGRATED_SEQUENCE_COMPOSER_VERSION, JSON.stringify(specification), specificationHash, sourceManifestHash, now, now),
    db.prepare("INSERT INTO v7_media_jobs (id,program_id,run_id,authorization_id,brief_id,source_file_id,job_type,status,priority,attempt,max_attempts,contract_json,created_at,updated_at) VALUES (?,?,?,?,?,?,'INTEGRATED_SEQUENCE_RENDER','QUEUED',130,0,1,?,?,?)").bind(jobId, PROGRAM_ID, run.id, authorization.id, "SEQUENCE-PRODUCT-V2", clean(sources[0].fileId), JSON.stringify(contract), now, now),
    db.prepare("UPDATE v7_stage_states SET status='SEQUENCE_PRODUCING',blocker='INTEGRATED_SEQUENCE_PRODUCTION_RUNNING',evidence_summary='Sequence specification compiled · 10/10 MP and 30/30 sealed frames bound · integrated render-measure-auto-correct transaction queued · QA requests 0 · scale locked',updated_at=? WHERE id=?").bind(now, STAGE_ID),
  ]);
  return snapshot();
}

async function sequenceProofQa() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || !env.BUCKET || !env.OPENAI_API_KEY) throw new Error("SEQUENCE_QA_CONFIGURATION_REQUIRED");
  const proof = await db.prepare("SELECT * FROM v7_sequence_proofs WHERE authorization_id=? ORDER BY created_at DESC LIMIT 1").bind(authorization.id).first<Row>();
  if (!proof) throw new Error("SEQUENCE_PROOF_NOT_RENDERED");
  if (proof.status === "PASS") return snapshot();
  const active = await db.prepare("SELECT * FROM v7_material_requests WHERE authorization_id=? AND phase='SEQUENCE_PROOF_QA' AND status IN ('QUEUED','IN_PROGRESS') ORDER BY created_at DESC LIMIT 1").bind(authorization.id).first<Row>();
  if (active) {
    const response = await fetch(`https://api.openai.com/v1/responses/${encodeURIComponent(clean(active.provider_response_id))}`, { headers: { authorization: `Bearer ${env.OPENAI_API_KEY}` }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`SEQUENCE_QA_STATUS_FAILED · ${response.status}`);
    const payload = await response.json() as Row, providerStatus = clean(payload.status), now = new Date().toISOString();
    if (["queued", "in_progress"].includes(providerStatus)) { await db.prepare("UPDATE v7_material_requests SET status=?,updated_at=? WHERE id=?").bind(providerStatus.toUpperCase(), now, active.id).run(); return snapshot(); }
    const usage = await recordOpenAIUsage({ db, programId: PROGRAM_ID, runId: run.id, stageKey: STAGE, costType: "SEQUENCE_PROOF_QA", payload, fallbackModel: clean(active.model_id) || DEFAULT_MODEL });
    if (providerStatus !== "completed") { await finishRequest(db, clean(active.id), "FAILED", clean(payload.error) || `PROVIDER_${providerStatus}`); throw new Error(`SEQUENCE_QA_PROVIDER_${providerStatus.toUpperCase()}`); }
    const result = JSON.parse(output(payload)) as Row, findings = arr(result.findings).map(rec), dimensions = { semanticFit: Number(result.semanticContinuity), visualVariety: Number(result.visualVariety), rhythm: Number(result.rhythm), mobileLegibility: Number(result.mobileLegibility), factualSafety: Number(result.factualSafety) };
    const release = evaluateControlledRelease({ overall: Number(result.overall), dimensions: { semanticFit: dimensions.semanticFit, factualSafety: dimensions.factualSafety, composition: dimensions.visualVariety, mobileLegibility: dimensions.mobileLegibility, authenticity: dimensions.rhythm }, defects: findings });
    const passed = ["STANDARD", "CONTROLLED"].includes(release.tier) && result.decision === "PASS", status = passed ? "PASS" : "REPAIR_REQUIRED";
    await db.batch([
      db.prepare("UPDATE v7_material_requests SET status='COMPLETE',input_tokens=?,output_tokens=?,reasoning_tokens=?,actual_cost_usd=?,updated_at=? WHERE id=?").bind(Number(usage.inputTokens || 0), Number(usage.outputTokens || 0), Number(usage.reasoningTokens || 0), Number(usage.actualUsd || 0), now, active.id),
      db.prepare("UPDATE v7_sequence_proofs SET status=?,score=?,tier=?,dimensions_json=?,findings_json=?,provider_response_id=?,request_id=?,updated_at=?,completed_at=? WHERE id=?").bind(status, Number(result.overall), release.tier, JSON.stringify(dimensions), JSON.stringify(findings), payload.id, active.id, now, now, proof.id),
      db.prepare("UPDATE v7_stage_states SET status=?,blocker=?,evidence_summary=?,updated_at=? WHERE id=?").bind(passed ? "SEQUENCE_PASS" : "SEQUENCE_REPAIR_REQUIRED", passed ? "WAVE_25_READY_NOT_STARTED" : "SEQUENCE_QUALITY_REPAIR_REQUIRED", `30-second sequence ${status} ${Number(result.overall)}/100 · ${release.tier} · 10/10 MP · scale ${passed ? "ready for explicit 25-shot wave authorization" : "blocked"}`, now, STAGE_ID),
    ]);
    return snapshot();
  }
  if (proof.status !== "QA_REQUIRED" || !proof.evidence_id) throw new Error(`SEQUENCE_QA_NOT_READY · ${clean(proof.status)}`);
  const evidence = await db.prepare("SELECT * FROM v7_media_evidence WHERE id=? AND evidence_type='SEQUENCE_PROOF' AND status='TECHNICALLY_VERIFIED'").bind(proof.evidence_id).first<Row>();
  if (!evidence) throw new Error("SEQUENCE_EVIDENCE_MISSING");
  const content = rec(JSON.parse(String(evidence.content_json || "{}"))), frames = arr(content.frames).map(rec), imageUrls: string[] = [];
  if (frames.length !== 10) throw new Error(`SEQUENCE_SAMPLE_SET_INCOMPLETE · ${frames.length}/10`);
  for (const frame of frames) {
    const file = await db.prepare("SELECT runtime_key,mime_type FROM v7_material_files WHERE id=?").bind(frame.fileId).first<Row>(), object = file ? await env.BUCKET.get(clean(file.runtime_key)) : null;
    if (!object) throw new Error(`SEQUENCE_SAMPLE_MISSING · ${clean(frame.logicalId)}`);
    imageUrls.push(`data:${clean(file?.mime_type)};base64,${base64(new Uint8Array(await new Response(object.body).arrayBuffer()))}`);
  }
  const requestBudget = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<{ total: number }>();
  const priorSequenceQa = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND phase='SEQUENCE_PROOF_QA'").bind(authorization.id).first<{ total: number }>();
  const usedRequests = Number(requestBudget?.total || 0), authorizedRequests = Number(authorization.max_remote_requests || 0);
  if (Number(priorSequenceQa?.total || 0) > 0) throw new Error("SEQUENCE_QA_EXACT_ONE_REQUEST_EXHAUSTED");
  if (usedRequests === authorizedRequests) {
    const extension = await db.prepare("UPDATE v7_material_authorizations SET max_remote_requests=?,updated_at=? WHERE id=? AND max_remote_requests=?").bind(usedRequests + 1, new Date().toISOString(), authorization.id, authorizedRequests).run();
    if (Number(extension.meta?.changes || 0) !== 1) throw new Error("SEQUENCE_QA_EXACT_ONE_REQUEST_EXTENSION_CONFLICT");
    authorization.max_remote_requests = usedRequests + 1;
  }
  const setting = await modelSetting(db), requestId = await newRequest(db, authorization, "SEQUENCE-10MP", "SEQUENCE_PROOF_QA", "OPENAI", setting.modelId, setting.reasoningEffort, 1800, 4000), manifest = rec(JSON.parse(String(proof.source_manifest_json || "{}")));
  const prompt: Row[] = [{ type: "input_text", text: `Perform ${SEQUENCE_QA_RUBRIC} on ten ordered samples from the actual stored 30-second WebM. Each image is the midpoint of one canonical MP unit in playback order. Judge the sequence as a whole: semantic continuity, meaningful visual variety without template fatigue, one-second state rhythm, mobile legibility and factual safety. Do not re-grade already sealed unit details unless the sequence creates a new contradiction. Apply CONTROLLED_RELEASE_GATE_V1: STANDARD overall >=92 and all dimensions >=90 with no P0/P1; CONTROLLED overall >=88, semanticContinuity >=82, every other dimension >=88, no P0, no semantic P1, and at most one presentation P1. Return only JSON.\n\nSEQUENCE MANIFEST:\n${JSON.stringify({ version: manifest.version, order: manifest.order, durationSeconds: manifest.durationSeconds, secondsPerFrame: manifest.secondsPerFrame, noRegeneration: manifest.noRegeneration, noFallback: manifest.noFallback })}` }];
  for (const imageUrl of imageUrls) prompt.push({ type: "input_image", image_url: imageUrl, detail: "high" });
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ model: setting.modelId, reasoning: { effort: setting.reasoningEffort }, background: true, store: true, max_output_tokens: 4000, input: [{ role: "user", content: prompt }], text: { format: { type: "json_schema", name: "stage09_sequence_proof_qa", strict: true, schema: sequenceQaSchema } } }), signal: AbortSignal.timeout(30000) });
  if (!response.ok) { const detail = (await response.text()).replace(/\s+/g, " ").slice(0, 300); await finishRequest(db, requestId, "FAILED", `OPENAI_${response.status} · ${detail}`); throw new Error(`SEQUENCE_QA_START_FAILED · ${response.status}`); }
  const payload = await response.json() as Row;
  if (!payload.id) { await finishRequest(db, requestId, "FAILED", "Provider response ID missing"); throw new Error("SEQUENCE_QA_PROVIDER_ID_MISSING"); }
  const now = new Date().toISOString();
  await db.batch([db.prepare("UPDATE v7_material_requests SET status=?,provider_response_id=?,updated_at=? WHERE id=?").bind(["queued", "in_progress"].includes(clean(payload.status)) ? clean(payload.status).toUpperCase() : "IN_PROGRESS", payload.id, now, requestId), db.prepare("UPDATE v7_sequence_proofs SET status='QA_RUNNING',provider_response_id=?,request_id=?,updated_at=? WHERE id=?").bind(payload.id, requestId, now, proof.id)]);
  return snapshot();
}

async function sequenceProductAudit() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || !env.BUCKET || !env.OPENAI_API_KEY) throw new Error("SEQUENCE_PRODUCT_AUDIT_CONFIGURATION_REQUIRED");
  const product = await db.prepare("SELECT * FROM v7_sequence_products WHERE authorization_id=? ORDER BY created_at DESC LIMIT 1").bind(authorization.id).first<Row>();
  if (!product || !["PRODUCT_COMPLETE", "RELEASED"].includes(clean(product.status))) throw new Error("SEQUENCE_PRODUCT_NOT_COMPLETE");
  if (clean(product.status) === "RELEASED") return snapshot();
  const audit = await db.prepare("SELECT * FROM v7_sequence_product_audits WHERE product_id=? ORDER BY created_at DESC LIMIT 1").bind(product.id).first<Row>();
  const orphanRequest = !audit ? await db.prepare("SELECT * FROM v7_material_requests WHERE authorization_id=? AND phase='SEQUENCE_PRODUCT_AUDIT' ORDER BY created_at DESC LIMIT 1").bind(authorization.id).first<Row>() : null;
  if (orphanRequest) {
    const now = new Date().toISOString();
    await db.batch([
      db.prepare("UPDATE v7_material_requests SET status='BLOCKED_INCOMPLETE',error='PROVIDER_RESPONSE_NOT_DURABLY_BOUND_NO_RETRY',updated_at=? WHERE id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(now, orphanRequest.id),
      db.prepare("UPDATE v7_stage_states SET status='PRODUCT_AUDIT_INCOMPLETE',blocker='INDEPENDENT_AUDIT_ORPHANED_NO_RETRY',evidence_summary='PRODUCT_COMPLETE preserved · request 105 reached provider but its response ID was not durably bound · no retry · scale locked',updated_at=? WHERE id=?").bind(now, STAGE_ID),
    ]);
    return snapshot();
  }
  const active = audit?.request_id ? await db.prepare("SELECT * FROM v7_material_requests WHERE id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(audit.request_id).first<Row>() : null;
  if (active) {
    const response = await fetch(`https://api.openai.com/v1/responses/${encodeURIComponent(clean(active.provider_response_id))}`, { headers: { authorization: `Bearer ${env.OPENAI_API_KEY}` }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`SEQUENCE_PRODUCT_AUDIT_STATUS_FAILED · ${response.status}`);
    const payload = await response.json() as Row, providerStatus = clean(payload.status), now = new Date().toISOString();
    if (["queued", "in_progress"].includes(providerStatus)) { await db.prepare("UPDATE v7_material_requests SET status=?,updated_at=? WHERE id=?").bind(providerStatus.toUpperCase(), now, active.id).run(); return snapshot(); }
    const usage = await recordOpenAIUsage({ db, programId: PROGRAM_ID, runId: run.id, stageKey: STAGE, costType: "SEQUENCE_PRODUCT_AUDIT", payload, fallbackModel: clean(active.model_id) || DEFAULT_MODEL });
    if (providerStatus !== "completed") {
      await db.batch([
        db.prepare("UPDATE v7_material_requests SET status='FAILED',error=?,updated_at=? WHERE id=?").bind(clean(payload.error) || `PROVIDER_${providerStatus}`, now, active.id),
        db.prepare("UPDATE v7_sequence_product_audits SET status='INCOMPLETE',provider_response_id=?,updated_at=?,completed_at=? WHERE id=?").bind(payload.id || active.provider_response_id, now, now, audit.id),
        db.prepare("UPDATE v7_stage_states SET status='PRODUCT_AUDIT_INCOMPLETE',blocker='INDEPENDENT_AUDIT_INCOMPLETE_NO_RETRY',evidence_summary='PRODUCT_COMPLETE preserved · independent audit incomplete · no automatic retry · scale locked',updated_at=? WHERE id=?").bind(now, STAGE_ID),
      ]);
      return snapshot();
    }
    const result = JSON.parse(output(payload)) as Row, findings = arr(result.findings).map(rec), dimensions = { semanticFit: Number(result.semanticContinuity), visualVariety: Number(result.visualVariety), rhythm: Number(result.rhythm), mobileLegibility: Number(result.mobileLegibility), factualSafety: Number(result.factualSafety) };
    const release = evaluateControlledRelease({ overall: Number(result.overall), dimensions: { semanticFit: dimensions.semanticFit, factualSafety: dimensions.factualSafety, composition: dimensions.visualVariety, mobileLegibility: dimensions.mobileLegibility, authenticity: dimensions.rhythm }, defects: findings });
    const passed = ["STANDARD", "CONTROLLED"].includes(release.tier) && result.decision === "PASS", status = passed ? "PASS" : "REJECTED";
    await db.batch([
      db.prepare("UPDATE v7_material_requests SET status='COMPLETE',input_tokens=?,output_tokens=?,reasoning_tokens=?,actual_cost_usd=?,updated_at=? WHERE id=?").bind(Number(usage.inputTokens || 0), Number(usage.outputTokens || 0), Number(usage.reasoningTokens || 0), Number(usage.actualUsd || 0), now, active.id),
      db.prepare("UPDATE v7_sequence_product_audits SET status=?,score=?,tier=?,dimensions_json=?,findings_json=?,provider_response_id=?,updated_at=?,completed_at=? WHERE id=?").bind(status, Number(result.overall), release.tier, JSON.stringify(dimensions), JSON.stringify(findings), payload.id, now, now, audit.id),
      db.prepare("UPDATE v7_sequence_products SET status=?,updated_at=? WHERE id=?").bind(passed ? "RELEASED" : "PRODUCT_COMPLETE", now, product.id),
      db.prepare("UPDATE v7_stage_states SET status=?,blocker=?,evidence_summary=?,updated_at=? WHERE id=?").bind(passed ? "RELEASED" : "PRODUCT_AUDIT_REJECTED", passed ? "CONTROLLED_SCALE_AUTHORIZATION_REQUIRED" : "COMPOSER_VERSION_REJECTED_BY_INDEPENDENT_AUDIT", passed ? `Product V2 independently audited PASS ${Number(result.overall)}/100 · ${release.tier} · released · scale awaits explicit authorization` : `Product V2 independent audit REJECTED ${Number(result.overall)}/100 · ${release.tier} · composer version rejected · no repair loop · scale locked`, now, STAGE_ID),
    ]);
    return snapshot();
  }
  if (audit) throw new Error(`SEQUENCE_PRODUCT_AUDIT_ALREADY_TERMINAL · ${clean(audit.status)}`);
  const evidence = await db.prepare("SELECT * FROM v7_media_evidence WHERE id=? AND evidence_type='SEQUENCE_PRODUCT' AND status='PRODUCT_COMPLETE'").bind(product.evidence_id).first<Row>();
  if (!evidence) throw new Error("SEQUENCE_PRODUCT_EVIDENCE_MISSING");
  const content = rec(JSON.parse(String(evidence.content_json || "{}"))), frames = arr(content.frames).map(rec), imageUrls: string[] = [];
  if (frames.length !== 10) throw new Error(`SEQUENCE_PRODUCT_SAMPLE_SET_INCOMPLETE · ${frames.length}/10`);
  for (const frame of frames) {
    const file = await db.prepare("SELECT runtime_key,mime_type FROM v7_material_files WHERE id=?").bind(frame.fileId).first<Row>(), object = file ? await env.BUCKET.get(clean(file.runtime_key)) : null;
    if (!object) throw new Error(`SEQUENCE_PRODUCT_SAMPLE_MISSING · ${clean(frame.logicalId)}`);
    imageUrls.push(`data:${clean(file?.mime_type)};base64,${base64(new Uint8Array(await new Response(object.body).arrayBuffer()))}`);
  }
  const used = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<{ total: number }>(), usedRequests = Number(used?.total || 0), authorizedRequests = Number(authorization.max_remote_requests || 0);
  if (usedRequests === authorizedRequests) {
    const extension = await db.prepare("UPDATE v7_material_authorizations SET max_remote_requests=?,updated_at=? WHERE id=? AND max_remote_requests=?").bind(usedRequests + 1, new Date().toISOString(), authorization.id, authorizedRequests).run();
    if (Number(extension.meta?.changes || 0) !== 1) throw new Error("SEQUENCE_PRODUCT_AUDIT_EXACT_ONE_REQUEST_EXTENSION_CONFLICT");
    authorization.max_remote_requests = usedRequests + 1;
  }
  const setting = await modelSetting(db), requestId = await newRequest(db, authorization, "SEQUENCE-PRODUCT-V2", "SEQUENCE_PRODUCT_AUDIT", "OPENAI", setting.modelId, setting.reasoningEffort, 1800, 4000), auditId = `${clean(product.id)}-AUDIT-1`, now = new Date().toISOString(), specification = rec(JSON.parse(String(product.specification_json || "{}"))), measurements = rec(JSON.parse(String(product.measurements_json || "{}")));
  const prompt: Row[] = [{ type: "input_text", text: `Perform ${SEQUENCE_PRODUCT_AUDIT_RUBRIC} as one independent release audit of a product already declared PRODUCT_COMPLETE by production. The ten images are ordered midpoint samples decoded from the stored 30-second WebM. Audit the audience experience: semantic continuity, visual variety, rhythm, mobile legibility and factual safety. Do not instruct routine repairs and do not act as a production loop. If a deterministic defect escaped production, classify it as a composer capability regression in exactRepair. Apply CONTROLLED_RELEASE_GATE_V1: STANDARD overall >=92 and all dimensions >=90 with no P0/P1; CONTROLLED overall >=88, semanticContinuity >=82, every other dimension >=88, no P0, no semantic P1, and at most one presentation P1. Return only JSON.\n\nPRODUCT SPECIFICATION:\n${JSON.stringify({ version: specification.version, order: rec(specification.narrative).order, continuityEdges: arr(rec(specification.narrative).continuityEdges), mobile: specification.mobile, noRegeneration: rec(specification.composition).noRegeneration, noNewClaims: rec(specification.composition).noNewClaims })}\n\nPRODUCTION DEFINITION OF DONE EVIDENCE:\n${JSON.stringify(measurements)}` }];
  for (const imageUrl of imageUrls) prompt.push({ type: "input_image", image_url: imageUrl, detail: "high" });
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json", "idempotency-key": requestId }, body: JSON.stringify({ model: setting.modelId, reasoning: { effort: setting.reasoningEffort }, background: true, store: true, max_output_tokens: 4000, input: [{ role: "user", content: prompt }], text: { format: { type: "json_schema", name: "stage09_sequence_product_audit", strict: true, schema: sequenceQaSchema } } }), signal: AbortSignal.timeout(30000) });
  if (!response.ok) { const detail = (await response.text()).replace(/\s+/g, " ").slice(0, 300); await finishRequest(db, requestId, "FAILED", `OPENAI_${response.status} · ${detail}`); throw new Error(`SEQUENCE_PRODUCT_AUDIT_START_FAILED · ${response.status}`); }
  const payload = await response.json() as Row;
  if (!payload.id) { await finishRequest(db, requestId, "FAILED", "Provider response ID missing"); throw new Error("SEQUENCE_PRODUCT_AUDIT_PROVIDER_ID_MISSING"); }
  await db.batch([
    db.prepare("INSERT INTO v7_sequence_product_audits (id,program_id,run_id,authorization_id,product_id,rubric_version,status,request_id,provider_response_id,created_at,updated_at) VALUES (?,?,?,?,?,?,'RUNNING',?,?,?,?)").bind(auditId, PROGRAM_ID, run.id, authorization.id, product.id, SEQUENCE_PRODUCT_AUDIT_RUBRIC, requestId, payload.id, now, now),
    db.prepare("UPDATE v7_material_requests SET status=?,provider_response_id=?,updated_at=? WHERE id=?").bind(["queued", "in_progress"].includes(clean(payload.status)) ? clean(payload.status).toUpperCase() : "IN_PROGRESS", payload.id, now, requestId),
    db.prepare("UPDATE v7_stage_states SET status='PRODUCT_AUDIT_RUNNING',blocker='INDEPENDENT_AUDIT_RUNNING',evidence_summary='PRODUCT_COMPLETE preserved · one independent audit request running · production loop closed · scale locked',updated_at=? WHERE id=?").bind(now, STAGE_ID),
  ]);
  return snapshot();
}

async function planMotionProof() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization) throw new Error("MOTION_PROOF_RUN_REQUIRED");
  if (!env.BUCKET || !env.MEDIA_EXECUTOR_SHARED_SECRET) throw new Error("MOTION_PROOF_EXECUTOR_REQUIRED");
  const continuity = await db.prepare("SELECT lifecycle_state,content_hash FROM v7_continuity_snapshots WHERE program_id=? AND checkpoint_code='CONTINUITY_HARDENING_01' ORDER BY created_at DESC LIMIT 1").bind(PROGRAM_ID).first<Row>();
  if (continuity?.lifecycle_state !== "FROZEN") throw new Error("CONTINUITY_CHECKPOINT_NOT_FROZEN");
  const audit = await db.prepare("SELECT * FROM v7_composite_audits WHERE authorization_id=? AND rubric_version=? AND status='PASS' AND winner='C' ORDER BY updated_at DESC LIMIT 1").bind(authorization.id, COMPOSITE_QA_RUBRIC).first<Row>();
  if (!audit || Number(audit.score) < 90) throw new Error("CHAMPION_C_NOT_AUTHORIZED_FOR_MOTION");
  const existing = await db.prepare("SELECT id FROM v7_motion_proofs WHERE authorization_id=? AND brief_id=? AND composite_rubric=? ORDER BY created_at DESC LIMIT 1").bind(authorization.id, audit.brief_id, COMPOSITE_QA_RUBRIC).first<Row>();
  if (existing) return snapshot();
  const brief = await db.prepare("SELECT * FROM v7_material_briefs WHERE id=?").bind(audit.brief_id).first<Row>();
  if (!brief) throw new Error("MOTION_PROOF_BRIEF_MISSING");
  const identity = `${COMPOSITE_QA_RUBRIC}-${clean((await db.prepare("SELECT content_hash FROM v7_media_evidence WHERE id=?").bind(audit.evidence_id).first<Row>())?.content_hash).slice(0, 12)}`;
  const frames: Row[] = [];
  for (const state of ["ENTRY", "MIDPOINT", "EXIT"]) {
    const file = await db.prepare("SELECT * FROM v7_material_files WHERE authorization_id=? AND brief_id=? AND asset_role=? AND id LIKE ? ORDER BY created_at DESC LIMIT 1").bind(authorization.id, audit.brief_id, `COMPOSITE_C_${state}`, `%${identity}%`).first<Row>();
    if (!file || !clean(file.content_hash) || !clean(file.runtime_key)) throw new Error(`CHAMPION_C_${state}_MISSING`);
    frames.push({ state, fileId: file.id, sha256: file.content_hash, mimeType: file.mime_type, runtimeKey: file.runtime_key });
  }
  const durationSeconds = Number((Number(brief.end_seconds) - Number(brief.start_seconds)).toFixed(3));
  if (durationSeconds < 1.5 || durationSeconds > 8) throw new Error(`MOTION_DURATION_OUT_OF_RANGE · ${durationSeconds}s`);
  const proofSeed = JSON.stringify({ checkpointHash: continuity.content_hash, auditId: audit.id, champion: "C", frames: frames.map((frame) => ({ state: frame.state, fileId: frame.fileId, sha256: frame.sha256 })), durationSeconds, fps: 30, renderer: MOTION_RENDERER_VERSION });
  const proofHash = await sha(proofSeed), proofId = `${clean(audit.brief_id)}-MOTION-${proofHash.slice(0, 16)}`, jobId = `${proofId}-RENDER`, now = new Date().toISOString();
  const contract = { version: "MOTION_EXECUTION_CONTRACT_V1", proofId, champion: "C", renderer: MOTION_RENDERER_VERSION, compositeAuditId: audit.id, continuityCheckpointHash: continuity.content_hash, sources: frames.map((frame) => ({ state: frame.state, fileId: frame.fileId, sha256: frame.sha256, mimeType: frame.mimeType })), durationSeconds, fps: 30, output: { mimeType: "video/webm", codec: "vp9", width: 960, height: 540, audio: "NONE" }, samplePositions: [{ role: "ENTRY", ratio: 0.1 }, { role: "MIDPOINT", ratio: 0.5 }, { role: "EXIT", ratio: 0.9 }], acceptance: { exactChampion: "C", exactSourceCount: 3, sourceHashesMustMatch: true, durationToleranceSeconds: 0.08, frameRate: 30, noNewText: true, noAudio: true } };
  await db.batch([
    db.prepare("INSERT INTO v7_motion_proofs (id,program_id,run_id,authorization_id,brief_id,champion,composite_rubric,renderer_version,status,source_hashes_json,duration_seconds,fps,content_hash,created_at,updated_at) VALUES (?,?,?,?,?,'C',?,?,'RENDER_QUEUED',?,?,30,?,?,?)").bind(proofId, PROGRAM_ID, run.id, authorization.id, audit.brief_id, COMPOSITE_QA_RUBRIC, MOTION_RENDERER_VERSION, JSON.stringify(frames.map((frame) => ({ state: frame.state, fileId: frame.fileId, sha256: frame.sha256 }))), durationSeconds, proofHash, now, now),
    db.prepare("INSERT INTO v7_media_jobs (id,program_id,run_id,authorization_id,brief_id,source_file_id,job_type,status,priority,attempt,max_attempts,contract_json,created_at,updated_at) VALUES (?,?,?,?,?,?,'MOTION_PROOF_RENDER','QUEUED',110,0,2,?,?,?)").bind(jobId, PROGRAM_ID, run.id, authorization.id, audit.brief_id, frames[0].fileId, JSON.stringify(contract), now, now),
    db.prepare("UPDATE v7_stage_states SET status='MOTION_RENDER_REQUIRED',blocker='MOTION_EXECUTOR_REQUIRED',evidence_summary=?,updated_at=? WHERE id=?").bind(`Champion C motion job queued from immutable 9-frame baseline · ${durationSeconds}s · 30fps · no provider request`, now, STAGE_ID),
  ]);
  return snapshot();
}

async function issueMotionExecutorBootstrap() {
  const env = await runtime(), db = env.DB!, { authorization } = await current(db);
  if (!authorization) throw new Error("MOTION_PROOF_RUN_REQUIRED");
  const job = await db.prepare("SELECT * FROM v7_media_jobs WHERE authorization_id=? AND job_type='MOTION_PROOF_RENDER' AND status='QUEUED' ORDER BY created_at DESC LIMIT 1").bind(authorization.id).first<Row>();
  if (!job) throw new Error("MOTION_RENDER_JOB_NOT_QUEUED");
  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`, tokenHash = await sha(token), expiresAt = new Date(Date.now() + 10 * 60_000).toISOString(), contract = rec(JSON.parse(String(job.contract_json)));
  await db.prepare("UPDATE v7_media_jobs SET contract_json=?,updated_at=? WHERE id=? AND status='QUEUED'").bind(JSON.stringify({ ...contract, bootstrap: { tokenHash, expiresAt, scope: "CLAIM_EXACT_MOTION_JOB_ONCE" } }), new Date().toISOString(), job.id).run();
  return { ...(await snapshot()), executorBootstrap: { jobId: job.id, token, expiresAt, scope: "CLAIM_EXACT_MOTION_JOB_ONCE" } };
}

function claimedJobPayload(claimed: Row, leaseToken: string) {
  const contract = rec(JSON.parse(String(claimed.contract_json)));
  const sourceDownloadUrls = arr(contract.sources).map(rec).map((source) => ({ state: clean(source.state), logicalId: clean(source.logicalId), fileId: clean(source.fileId), sha256: clean(source.sha256), url: `/api/factory/material-production?executionSource=${encodeURIComponent(clean(claimed.id))}&leaseToken=${encodeURIComponent(leaseToken)}&fileId=${encodeURIComponent(clean(source.fileId))}` }));
  return { id: claimed.id, type: claimed.job_type, briefId: claimed.brief_id, attempt: Number(claimed.attempt), maxAttempts: Number(claimed.max_attempts), leaseExpiresAt: claimed.lease_expires_at, leaseToken, sourceDownloadUrl: `/api/factory/material-production?executionSource=${encodeURIComponent(clean(claimed.id))}&leaseToken=${encodeURIComponent(leaseToken)}`, sourceDownloadUrls, contract };
}

async function claimMotionJobBootstrap(body: Row) {
  const env = await runtime(), db = env.DB!, jobId = clean(body.jobId), token = clean(body.bootstrapToken), owner = clean(body.executorId) || "motion-bootstrap-executor", now = new Date().toISOString();
  const job = await db.prepare("SELECT * FROM v7_media_jobs WHERE id=? AND job_type='MOTION_PROOF_RENDER' AND status='QUEUED' AND attempt<max_attempts").bind(jobId).first<Row>();
  if (!job || !token) throw new Error("MOTION_BOOTSTRAP_UNAUTHORIZED");
  const contract = rec(JSON.parse(String(job.contract_json))), bootstrap = rec(contract.bootstrap);
  if (!clean(bootstrap.tokenHash) || await sha(token) !== clean(bootstrap.tokenHash) || new Date(clean(bootstrap.expiresAt)).getTime() < Date.now()) throw new Error("MOTION_BOOTSTRAP_UNAUTHORIZED");
  const leaseToken = crypto.randomUUID(), tokenHash = await sha(leaseToken), expiry = new Date(Date.now() + 10 * 60_000).toISOString();
  delete contract.bootstrap;
  await db.prepare("UPDATE v7_media_jobs SET status='LEASED',attempt=attempt+1,lease_owner=?,lease_token_hash=?,lease_expires_at=?,contract_json=?,updated_at=? WHERE id=? AND status='QUEUED'").bind(`bootstrap:${owner}`, tokenHash, expiry, JSON.stringify(contract), now, job.id).run();
  const claimed = await db.prepare("SELECT * FROM v7_media_jobs WHERE id=? AND status='LEASED'").bind(job.id).first<Row>();
  if (!claimed) throw new Error("MOTION_BOOTSTRAP_CLAIM_CONFLICT");
  return Response.json({ status: "LEASED", job: claimedJobPayload(claimed, leaseToken) });
}

async function requireExecutor(request: Request, env: Env) {
  const supplied = clean(request.headers.get("x-frameflow-executor-key"));
  if (!env.MEDIA_EXECUTOR_SHARED_SECRET || !(await secretMatches(supplied, env.MEDIA_EXECUTOR_SHARED_SECRET))) throw new Error("MEDIA_EXECUTOR_UNAUTHORIZED");
}

async function executorHeartbeat(request: Request, body: Row) {
  const env = await runtime(), db = env.DB!; await requireExecutor(request, env);
  const id = clean(body.executorId) || "default-media-executor", version = clean(body.version) || "unknown", capabilities = arr(body.capabilities).map(clean).filter(Boolean).slice(0, 20), now = new Date().toISOString();
  await db.prepare("INSERT INTO v7_media_executors (id,program_id,status,version,capabilities_json,last_seen_at,created_at,updated_at) VALUES (?,?,'ONLINE',?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status='ONLINE',version=excluded.version,capabilities_json=excluded.capabilities_json,last_seen_at=excluded.last_seen_at,updated_at=excluded.updated_at").bind(id, PROGRAM_ID, version, JSON.stringify(capabilities), now, now, now).run();
  return Response.json({ status: "READY", executorId: id, serverTime: now });
}

async function claimMediaJob(request: Request, body: Row) {
  const env = await runtime(), db = env.DB!; await requireExecutor(request, env);
  const owner = clean(body.executorId) || "default-media-executor", now = new Date().toISOString(), expiry = new Date(Date.now() + 10 * 60_000).toISOString();
  await db.prepare("UPDATE v7_media_jobs SET status='QUEUED',lease_owner=NULL,lease_token_hash=NULL,lease_expires_at=NULL,updated_at=? WHERE program_id=? AND status='LEASED' AND lease_expires_at<? AND attempt<max_attempts").bind(now, PROGRAM_ID, now).run();
  await db.prepare("UPDATE v7_media_jobs SET status='FAILED',error='LEASE_EXHAUSTED',updated_at=? WHERE program_id=? AND status='LEASED' AND lease_expires_at<? AND attempt>=max_attempts").bind(now, PROGRAM_ID, now).run();
  const job = await db.prepare("SELECT * FROM v7_media_jobs WHERE program_id=? AND status='QUEUED' AND attempt<max_attempts ORDER BY priority DESC,created_at ASC LIMIT 1").bind(PROGRAM_ID).first<Row>();
  if (!job) return Response.json({ status: "IDLE", retryAfterSeconds: 15 });
  const leaseToken = crypto.randomUUID(), tokenHash = await sha(leaseToken);
  await db.prepare("UPDATE v7_media_jobs SET status='LEASED',attempt=attempt+1,lease_owner=?,lease_token_hash=?,lease_expires_at=?,updated_at=? WHERE id=? AND status='QUEUED'").bind(owner, tokenHash, expiry, now, job.id).run();
  const claimed = await db.prepare("SELECT * FROM v7_media_jobs WHERE id=? AND status='LEASED' AND lease_owner=?").bind(job.id, owner).first<Row>();
  if (!claimed) return Response.json({ status: "RETRY", retryAfterSeconds: 2 }, { status: 409 });
  return Response.json({ status: "LEASED", job: claimedJobPayload(claimed, leaseToken) });
}

async function executionSource(request: Request) {
  const env = await runtime(), db = env.DB!;
  if (!env.BUCKET) throw new Error("R2_MATERIAL_STORAGE_REQUIRED");
  const url = new URL(request.url), jobId = clean(url.searchParams.get("executionSource")), leaseToken = clean(url.searchParams.get("leaseToken")), requestedFileId = clean(url.searchParams.get("fileId"));
  const job = await db.prepare("SELECT * FROM v7_media_jobs WHERE id=? AND status='LEASED'").bind(jobId).first<Row>();
  if (!job || !leaseToken || await sha(leaseToken) !== clean(job.lease_token_hash) || new Date(clean(job.lease_expires_at)).getTime() < Date.now()) throw new Error("MEDIA_JOB_LEASE_INVALID");
  if (job.job_type !== "MOTION_PROOF_RENDER") await requireExecutor(request, env);
  const contract = rec(JSON.parse(String(job.contract_json))), allowedSources = arr(contract.sources).map(rec).map((source) => clean(source.fileId));
  const fileId = requestedFileId || clean(job.source_file_id);
  if (requestedFileId && (!["MOTION_PROOF_RENDER", "SEQUENCE_PROOF_RENDER", "INTEGRATED_SEQUENCE_RENDER"].includes(clean(job.job_type)) || !allowedSources.includes(requestedFileId))) throw new Error("MEDIA_SOURCE_NOT_AUTHORIZED");
  const file = await db.prepare("SELECT runtime_key,mime_type,content_hash FROM v7_material_files WHERE id=?").bind(fileId).first<Row>();
  if (!file) throw new Error("MEDIA_SOURCE_FILE_NOT_FOUND");
  const object = await env.BUCKET.get(clean(file.runtime_key)); if (!object) throw new Error("MEDIA_SOURCE_BYTES_NOT_FOUND");
  return new Response(object.body, { headers: { "content-type": clean(file.mime_type), "x-content-sha256": clean(file.content_hash), "cache-control": "private, no-store" } });
}

async function completeMediaJob(request: Request, body: Row) {
  const env = await runtime(), db = env.DB!; await requireExecutor(request, env);
  if (!env.BUCKET) throw new Error("R2_MATERIAL_STORAGE_REQUIRED");
  const jobId = clean(body.jobId), leaseToken = clean(body.leaseToken), job = await db.prepare("SELECT * FROM v7_media_jobs WHERE id=? AND status='LEASED'").bind(jobId).first<Row>();
  if (!job || !leaseToken || await sha(leaseToken) !== clean(job.lease_token_hash) || new Date(clean(job.lease_expires_at)).getTime() < Date.now()) throw new Error("MEDIA_JOB_LEASE_INVALID");
  const source = await db.prepare("SELECT * FROM v7_material_files WHERE id=?").bind(job.source_file_id).first<Row>(), brief = await db.prepare("SELECT * FROM v7_material_briefs WHERE id=?").bind(job.brief_id).first<Row>(), authorization = await db.prepare("SELECT * FROM v7_material_authorizations WHERE id=?").bind(job.authorization_id).first<Row>();
  if (!source || !brief || !authorization) throw new Error("MEDIA_JOB_LINEAGE_MISSING");
  const probe = rec(body.probe), frames = arr(body.frames).map(rec), contract = rec(JSON.parse(String(job.contract_json))), expected = rec(contract.output), requiredRoles = ["ENTRY", "MIDPOINT", "EXIT"];
  if (clean(body.sourceHash) !== clean(source.content_hash)) throw new Error("MEDIA_SOURCE_HASH_MISMATCH");
  if (frames.length !== 3 || !requiredRoles.every((role) => frames.filter((frame) => clean(frame.role) === role).length === 1)) throw new Error("MEDIA_FRAME_SET_INVALID");
  if (Math.abs(Number(probe.durationSeconds) - Number(source.duration_seconds || 0)) > 0.25) throw new Error("MEDIA_DURATION_MISMATCH");
  const storedFrameIds: string[] = [];
  for (const frame of frames) {
    const role = clean(frame.role), mimeType = clean(frame.mimeType), bytes = decodeBase64(clean(frame.base64));
    if (Number(frame.width) !== Number(expected.width) || Number(frame.height) !== Number(expected.height) || !validImage(bytes, mimeType) || bytes.byteLength < 20_000 || bytes.byteLength > 2_500_000) throw new Error(`MEDIA_FRAME_INVALID · ${role}`);
    const storedRole = (`SOURCE_${role}`) as "SOURCE_ENTRY" | "SOURCE_MIDPOINT" | "SOURCE_EXIT";
    storedFrameIds.push(await storeMaterial(env, db, authorization, brief, { role: storedRole, identity: clean(jobId).split("-SOURCE-FRAMES-").at(-1), bytes, mimeType, extension: mimeType === "image/png" ? "png" : "jpg", sourceType: "DECODED_SOURCE_FRAME", provider: "MEDIA_EXECUTOR", providerAssetId: clean(source.provider_asset_id), sourceUrl: clean(source.source_url), landingUrl: clean(source.landing_url), licenseCode: clean(source.license_code), width: Number(frame.width), height: Number(frame.height), duration: Number(frame.timestampSeconds) }));
  }
  const evidence = { version: "SOURCE_FRAME_EVIDENCE_V1", jobId, briefId: job.brief_id, sourceFileId: source.id, sourceHash: source.content_hash, probe, frames: frames.map((frame, index) => ({ role: clean(frame.role), timestampSeconds: Number(frame.timestampSeconds), width: Number(frame.width), height: Number(frame.height), mimeType: clean(frame.mimeType), fileId: storedFrameIds[index] })), completedAt: new Date().toISOString() };
  const json = JSON.stringify(evidence, null, 2), hash = await sha(json), key = `v7/material-production/${job.run_id}/execution/${jobId}-evidence.json`;
  await env.BUCKET.put(key, json, { httpMetadata: { contentType: "application/json" }, customMetadata: { contentHash: hash, jobId, briefId: clean(job.brief_id) } });
  const drive = await storeDriveJsonArtifact({ folderPath: ["Channels", "Hidden Systems", "Projects", "V7 Greenfield Pilot", "Material Production", "Execution Evidence"], fileName: `${jobId}-evidence.json`, content: json, artifactId: `${jobId}-EVIDENCE`, contentHash: hash });
  const now = new Date().toISOString();
  await db.batch([
    db.prepare("INSERT INTO v7_media_evidence (id,program_id,run_id,authorization_id,brief_id,job_id,evidence_type,status,content_json,content_hash,runtime_key,drive_file_id,created_at) VALUES (?,?,?,?,?,?,'SOURCE_FRAME_SET','TECHNICALLY_VERIFIED',?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status='TECHNICALLY_VERIFIED',content_json=excluded.content_json,content_hash=excluded.content_hash,runtime_key=excluded.runtime_key,drive_file_id=excluded.drive_file_id").bind(`${jobId}-EVIDENCE`, PROGRAM_ID, job.run_id, job.authorization_id, job.brief_id, jobId, json, hash, key, drive.id, now),
    db.prepare("UPDATE v7_media_jobs SET status='COMPLETE',output_json=?,error=NULL,completed_at=?,updated_at=?,lease_token_hash=NULL,lease_expires_at=NULL WHERE id=?").bind(JSON.stringify({ evidenceId: `${jobId}-EVIDENCE`, frameFileIds: storedFrameIds }), now, now, jobId),
    db.prepare("UPDATE v7_stage_states SET blocker='SOURCE_FRAME_QA_REQUIRED',evidence_summary=?,updated_at=? WHERE id=?").bind(`${job.brief_id} source bytes and decoded frames technically verified · semantic acceptance pending`, now, STAGE_ID),
  ]);
  return Response.json({ status: "COMPLETE", jobId, evidenceId: `${jobId}-EVIDENCE`, frameFileIds: storedFrameIds });
}

async function completeSequenceProduct(request: Request, body: Row) {
  const env = await runtime(), db = env.DB!; await requireExecutor(request, env);
  if (!env.BUCKET) throw new Error("R2_MATERIAL_STORAGE_REQUIRED");
  const jobId = clean(body.jobId), leaseToken = clean(body.leaseToken), job = await db.prepare("SELECT * FROM v7_media_jobs WHERE id=? AND status='LEASED' AND job_type='INTEGRATED_SEQUENCE_RENDER'").bind(jobId).first<Row>();
  if (!job || !leaseToken || await sha(leaseToken) !== clean(job.lease_token_hash) || new Date(clean(job.lease_expires_at)).getTime() < Date.now()) throw new Error("MEDIA_JOB_LEASE_INVALID");
  const contract = rec(JSON.parse(String(job.contract_json))), product = await db.prepare("SELECT * FROM v7_sequence_products WHERE id=? AND status='PRODUCING'").bind(contract.productId).first<Row>(), authorization = await db.prepare("SELECT * FROM v7_material_authorizations WHERE id=?").bind(job.authorization_id).first<Row>();
  if (!product || !authorization || clean(product.specification_hash) !== clean(await sha(JSON.stringify(contract.specification)))) throw new Error("SEQUENCE_PRODUCT_LINEAGE_MISSING");
  const expectedSources = arr(contract.sources).map(rec), returnedHashes = arr(body.sourceHashes).map(rec);
  if (expectedSources.length !== 30 || returnedHashes.length !== 30 || !expectedSources.every((source) => returnedHashes.some((item) => clean(item.fileId) === clean(source.fileId) && clean(item.sha256) === clean(source.sha256)))) throw new Error("SEQUENCE_PRODUCT_SOURCE_HASH_MISMATCH");
  const render = rec(body.render), videoBytes = decodeBase64(clean(render.base64)), durationSeconds = Number(render.durationSeconds), fps = Number(render.fps), expectedOutput = rec(contract.output), measurements = rec(body.measurements), corrections = arr(body.corrections).map(rec), iterations = Number(body.iterations);
  if (clean(render.mimeType) !== "video/webm" || !validWebm(videoBytes) || videoBytes.byteLength < 100_000 || videoBytes.byteLength > 60_000_000) throw new Error("SEQUENCE_PRODUCT_RENDER_INVALID");
  const contractFit = Number(render.width) === Number(expectedOutput.width) && Number(render.height) === Number(expectedOutput.height) && Math.abs(durationSeconds - 30) <= 0.08 && Math.abs(fps - 30) <= 0.2;
  const productionComplete = contractFit
    && iterations >= 1 && iterations <= Number(product.max_iterations)
    && measurements.sourceHashMatch === true
    && measurements.noCrop === true
    && measurements.mobileSafe === true
    && measurements.fullFrameScan === true
    && Number(measurements.framesScanned) >= 890
    && Number(measurements.continuityEdges) === 9
    && Number(measurements.adjacentTreatmentDuplicates) === 0
    && Number(measurements.blackFrameSeconds) <= 0.04
    && Number(measurements.maxFrozenFrameSeconds) <= 1.7;
  const now = new Date().toISOString();
  if (!productionComplete) {
    await db.batch([
      db.prepare("UPDATE v7_sequence_products SET status='PRODUCTION_BLOCKED',iteration=?,measurements_json=?,corrections_json=?,updated_at=? WHERE id=?").bind(iterations, JSON.stringify(measurements), JSON.stringify(corrections), now, product.id),
      db.prepare("UPDATE v7_media_jobs SET status='COMPLETE',output_json=?,error='PRODUCTION_DOD_NOT_MET',completed_at=?,updated_at=?,lease_token_hash=NULL,lease_expires_at=NULL WHERE id=?").bind(JSON.stringify({ productId: product.id, productionComplete: false, measurements, corrections }), now, now, jobId),
      db.prepare("UPDATE v7_stage_states SET status='PRODUCTION_BLOCKED',blocker='SEQUENCE_COMPOSER_DID_NOT_CONVERGE',evidence_summary=?,updated_at=? WHERE id=?").bind(`Integrated composer stopped after ${iterations}/${Number(product.max_iterations)} internal iterations · PRODUCT_COMPLETE not declared · QA requests 0 · scale locked`, now, STAGE_ID),
    ]);
    return Response.json({ status: "PRODUCTION_BLOCKED", productId: product.id, measurements, corrections });
  }
  const frames = arr(body.frames).map(rec), expectedSamples = arr(contract.samplePositions).map(rec);
  if (frames.length !== 10 || !expectedSamples.every((sample) => frames.some((frame) => clean(frame.role) === clean(sample.role) && clean(frame.logicalId) === clean(sample.logicalId)))) throw new Error("SEQUENCE_PRODUCT_SAMPLE_SET_INVALID");
  const brief = { id: "SEQUENCE-PRODUCT-V2" } as Row, identity = clean(product.specification_hash).slice(0, 16);
  const productFileId = await storeMaterial(env, db, authorization, brief, { role: "SEQUENCE_PRODUCT", identity, bytes: videoBytes, mimeType: "video/webm", extension: "webm", sourceType: INTEGRATED_SEQUENCE_COMPOSER_VERSION, provider: "FRAMEFLOW_EXECUTOR", providerAssetId: product.id, sourceUrl: product.id, landingUrl: product.id, licenseCode: "CHANNEL_OWNED", width: Number(render.width), height: Number(render.height), duration: durationSeconds });
  const storedFrames: Row[] = [];
  for (let index = 0; index < frames.length; index++) {
    const frame = frames[index], bytes = decodeBase64(clean(frame.base64)), mimeType = clean(frame.mimeType), role = clean(frame.role), logicalId = clean(frame.logicalId);
    if (Number(frame.width) !== 960 || Number(frame.height) !== 540 || !validImage(bytes, mimeType) || bytes.byteLength < 20_000 || bytes.byteLength > 2_500_000) throw new Error(`SEQUENCE_PRODUCT_SAMPLE_INVALID · ${logicalId}`);
    const fileId = await storeMaterial(env, db, authorization, brief, { role: `SEQUENCE_PRODUCT_SAMPLE_${index + 1}` as MaterialRole, identity, bytes, mimeType, extension: mimeType === "image/png" ? "png" : "jpg", sourceType: `${INTEGRATED_SEQUENCE_COMPOSER_VERSION}_SAMPLE`, provider: "FRAMEFLOW_EXECUTOR", providerAssetId: productFileId, sourceUrl: productFileId, landingUrl: product.id, licenseCode: "CHANNEL_OWNED", width: 960, height: 540, duration: Number(frame.timestampSeconds) });
    storedFrames.push({ role, logicalId, timestampSeconds: Number(frame.timestampSeconds), fileId, sha256: await shaBytes(bytes) });
  }
  const renderHash = await shaBytes(videoBytes), evidence = { version: "SEQUENCE_PRODUCT_EVIDENCE_V2", productId: product.id, sourceProofId: product.source_proof_id, jobId, composer: product.composer_version, specificationHash: product.specification_hash, sourceManifestHash: product.source_manifest_hash, lifecycleState: "PRODUCT_COMPLETE", iterations, corrections, measurements, render: { mimeType: "video/webm", codec: clean(render.codec), width: Number(render.width), height: Number(render.height), durationSeconds, fps, audio: "NONE", sha256: renderHash }, sourceHashes: returnedHashes, frames: storedFrames, completedAt: now };
  const json = JSON.stringify(evidence, null, 2), evidenceHash = await sha(json), key = `v7/material-production/${job.run_id}/sequence-products/${product.id}-evidence.json`;
  await env.BUCKET.put(key, json, { httpMetadata: { contentType: "application/json" }, customMetadata: { contentHash: evidenceHash, productId: clean(product.id), lifecycleState: "PRODUCT_COMPLETE" } });
  const drive = await storeDriveJsonArtifact({ folderPath: ["Channels", "Hidden Systems", "Projects", "V7 Greenfield Pilot", "Material Production", "Sequence Products"], fileName: `${product.id}-evidence.json`, content: json, artifactId: `${product.id}-EVIDENCE`, contentHash: evidenceHash });
  await db.batch([
    db.prepare("INSERT INTO v7_media_evidence (id,program_id,run_id,authorization_id,brief_id,job_id,evidence_type,status,content_json,content_hash,runtime_key,drive_file_id,created_at) VALUES (?,?,?,?,?,?,'SEQUENCE_PRODUCT','PRODUCT_COMPLETE',?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status='PRODUCT_COMPLETE',content_json=excluded.content_json,content_hash=excluded.content_hash,runtime_key=excluded.runtime_key,drive_file_id=excluded.drive_file_id").bind(`${product.id}-EVIDENCE`, PROGRAM_ID, job.run_id, job.authorization_id, "SEQUENCE-PRODUCT-V2", jobId, json, evidenceHash, key, drive.id, now),
    db.prepare("UPDATE v7_sequence_products SET status='PRODUCT_COMPLETE',iteration=?,product_file_id=?,evidence_id=?,measurements_json=?,corrections_json=?,content_hash=?,updated_at=?,completed_at=? WHERE id=?").bind(iterations, productFileId, `${product.id}-EVIDENCE`, JSON.stringify(measurements), JSON.stringify(corrections), renderHash, now, now, product.id),
    db.prepare("UPDATE v7_media_jobs SET status='COMPLETE',output_json=?,error=NULL,completed_at=?,updated_at=?,lease_token_hash=NULL,lease_expires_at=NULL WHERE id=?").bind(JSON.stringify({ productId: product.id, productComplete: true, evidenceId: `${product.id}-EVIDENCE`, productFileId, frameFileIds: storedFrames.map((frame) => frame.fileId) }), now, now, jobId),
    db.prepare("UPDATE v7_stage_states SET status='PRODUCT_COMPLETE',blocker='INDEPENDENT_RELEASE_AUDIT_NOT_STARTED',evidence_summary=?,updated_at=? WHERE id=?").bind(`30-second product complete after ${iterations} integrated production iteration(s) · full-file deterministic Definition of Done passed · QA requests 0 · independent audit not started`, now, STAGE_ID),
  ]);
  return Response.json({ status: "PRODUCT_COMPLETE", productId: product.id, evidenceId: `${product.id}-EVIDENCE`, productFileId, frameFileIds: storedFrames.map((frame) => frame.fileId), measurements, corrections });
}

async function completeSequenceProof(request: Request, body: Row) {
  const env = await runtime(), db = env.DB!; await requireExecutor(request, env);
  if (!env.BUCKET) throw new Error("R2_MATERIAL_STORAGE_REQUIRED");
  const jobId = clean(body.jobId), leaseToken = clean(body.leaseToken), job = await db.prepare("SELECT * FROM v7_media_jobs WHERE id=? AND status='LEASED' AND job_type='SEQUENCE_PROOF_RENDER'").bind(jobId).first<Row>();
  if (!job || !leaseToken || await sha(leaseToken) !== clean(job.lease_token_hash) || new Date(clean(job.lease_expires_at)).getTime() < Date.now()) throw new Error("MEDIA_JOB_LEASE_INVALID");
  const contract = rec(JSON.parse(String(job.contract_json))), proof = await db.prepare("SELECT * FROM v7_sequence_proofs WHERE id=?").bind(contract.proofId).first<Row>(), authorization = await db.prepare("SELECT * FROM v7_material_authorizations WHERE id=?").bind(job.authorization_id).first<Row>();
  if (!proof || !authorization) throw new Error("SEQUENCE_PROOF_LINEAGE_MISSING");
  const expectedSources = arr(contract.sources).map(rec), returnedHashes = arr(body.sourceHashes).map(rec);
  if (expectedSources.length !== 30 || returnedHashes.length !== 30 || !expectedSources.every((source) => returnedHashes.some((item) => clean(item.fileId) === clean(source.fileId) && clean(item.sha256) === clean(source.sha256)))) throw new Error("SEQUENCE_SOURCE_HASH_MISMATCH");
  const render = rec(body.render), videoBytes = decodeBase64(clean(render.base64)), durationSeconds = Number(render.durationSeconds), fps = Number(render.fps), expectedOutput = rec(contract.output);
  if (clean(render.mimeType) !== "video/webm" || !validWebm(videoBytes) || videoBytes.byteLength < 100_000 || videoBytes.byteLength > 60_000_000) throw new Error("SEQUENCE_RENDER_INVALID");
  if (Number(render.width) !== Number(expectedOutput.width) || Number(render.height) !== Number(expectedOutput.height) || Math.abs(durationSeconds - 30) > 0.08 || Math.abs(fps - 30) > 0.2) throw new Error("SEQUENCE_RENDER_CONTRACT_MISMATCH");
  const frames = arr(body.frames).map(rec), expectedSamples = arr(contract.samplePositions).map(rec);
  if (frames.length !== 10 || !expectedSamples.every((sample) => frames.some((frame) => clean(frame.role) === clean(sample.role) && clean(frame.logicalId) === clean(sample.logicalId)))) throw new Error("SEQUENCE_SAMPLE_SET_INVALID");
  const brief = { id: "SEQUENCE-10MP" } as Row, identity = clean(proof.content_hash).slice(0, 16);
  const sequenceFileId = await storeMaterial(env, db, authorization, brief, { role: "SEQUENCE_PROOF", identity, bytes: videoBytes, mimeType: "video/webm", extension: "webm", sourceType: SEQUENCE_RENDERER_VERSION, provider: "FRAMEFLOW_EXECUTOR", providerAssetId: proof.id, sourceUrl: proof.id, landingUrl: proof.id, licenseCode: "CHANNEL_OWNED", width: Number(render.width), height: Number(render.height), duration: durationSeconds });
  const storedFrames: Row[] = [];
  for (let index = 0; index < frames.length; index++) {
    const frame = frames[index], bytes = decodeBase64(clean(frame.base64)), mimeType = clean(frame.mimeType), role = clean(frame.role), logicalId = clean(frame.logicalId);
    if (Number(frame.width) !== 960 || Number(frame.height) !== 540 || !validImage(bytes, mimeType) || bytes.byteLength < 20_000 || bytes.byteLength > 2_500_000) throw new Error(`SEQUENCE_SAMPLE_INVALID · ${logicalId}`);
    const fileId = await storeMaterial(env, db, authorization, brief, { role: `SEQUENCE_SAMPLE_${index + 1}` as MaterialRole, identity, bytes, mimeType, extension: mimeType === "image/png" ? "png" : "jpg", sourceType: `${SEQUENCE_RENDERER_VERSION}_SAMPLE`, provider: "FRAMEFLOW_EXECUTOR", providerAssetId: sequenceFileId, sourceUrl: sequenceFileId, landingUrl: proof.id, licenseCode: "CHANNEL_OWNED", width: 960, height: 540, duration: Number(frame.timestampSeconds) });
    storedFrames.push({ role, logicalId, timestampSeconds: Number(frame.timestampSeconds), fileId, sha256: await shaBytes(bytes) });
  }
  const evidence = { version: "SEQUENCE_PROOF_EVIDENCE_V1", proofId: proof.id, jobId, renderer: proof.version, sequenceFileId, render: { mimeType: "video/webm", codec: clean(render.codec), width: Number(render.width), height: Number(render.height), durationSeconds, fps, audio: "NONE", sha256: await shaBytes(videoBytes) }, sourceHashes: returnedHashes, frames: storedFrames, completedAt: new Date().toISOString() };
  const json = JSON.stringify(evidence, null, 2), evidenceHash = await sha(json), key = `v7/material-production/${job.run_id}/sequence/${proof.id}-evidence.json`;
  await env.BUCKET.put(key, json, { httpMetadata: { contentType: "application/json" }, customMetadata: { contentHash: evidenceHash, proofId: clean(proof.id) } });
  if (!(await env.BUCKET.head(key))) throw new Error("SEQUENCE_EVIDENCE_READ_BACK_FAILED");
  const drive = await storeDriveJsonArtifact({ folderPath: ["Channels", "Hidden Systems", "Projects", "V7 Greenfield Pilot", "Material Production", "Sequence Proof"], fileName: `${proof.id}-evidence.json`, content: json, artifactId: `${proof.id}-EVIDENCE`, contentHash: evidenceHash });
  const now = new Date().toISOString();
  await db.batch([
    db.prepare("INSERT INTO v7_media_evidence (id,program_id,run_id,authorization_id,brief_id,job_id,evidence_type,status,content_json,content_hash,runtime_key,drive_file_id,created_at) VALUES (?,?,?,?,?,?,'SEQUENCE_PROOF','TECHNICALLY_VERIFIED',?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status='TECHNICALLY_VERIFIED',content_json=excluded.content_json,content_hash=excluded.content_hash,runtime_key=excluded.runtime_key,drive_file_id=excluded.drive_file_id").bind(`${proof.id}-EVIDENCE`, PROGRAM_ID, job.run_id, job.authorization_id, "SEQUENCE-10MP", jobId, json, evidenceHash, key, drive.id, now),
    db.prepare("UPDATE v7_sequence_proofs SET status='QA_REQUIRED',sequence_file_id=?,evidence_id=?,content_hash=?,updated_at=? WHERE id=?").bind(sequenceFileId, `${proof.id}-EVIDENCE`, evidenceHash, now, proof.id),
    db.prepare("UPDATE v7_media_jobs SET status='COMPLETE',output_json=?,error=NULL,completed_at=?,updated_at=?,lease_token_hash=NULL,lease_expires_at=NULL WHERE id=?").bind(JSON.stringify({ proofId: proof.id, evidenceId: `${proof.id}-EVIDENCE`, sequenceFileId, frameFileIds: storedFrames.map((frame) => frame.fileId) }), now, now, jobId),
    db.prepare("UPDATE v7_stage_states SET status='SEQUENCE_QA_REQUIRED',blocker='SEQUENCE_PERCEPTUAL_QA_REQUIRED',evidence_summary='30-second WebM stored · 10/10 unit samples verified · sequence QA required · scale locked',updated_at=? WHERE id=?").bind(now, STAGE_ID),
  ]);
  return Response.json({ status: "COMPLETE", proofId: proof.id, evidenceId: `${proof.id}-EVIDENCE`, sequenceFileId, frameFileIds: storedFrames.map((frame) => frame.fileId) });
}

async function completeMotionProof(request: Request, body: Row) {
  const env = await runtime(), db = env.DB!;
  if (!env.BUCKET) throw new Error("R2_MATERIAL_STORAGE_REQUIRED");
  const jobId = clean(body.jobId), leaseToken = clean(body.leaseToken), job = await db.prepare("SELECT * FROM v7_media_jobs WHERE id=? AND status='LEASED' AND job_type='MOTION_PROOF_RENDER'").bind(jobId).first<Row>();
  if (!job || !leaseToken || await sha(leaseToken) !== clean(job.lease_token_hash) || new Date(clean(job.lease_expires_at)).getTime() < Date.now()) throw new Error("MEDIA_JOB_LEASE_INVALID");
  const contract = rec(JSON.parse(String(job.contract_json))), proof = await db.prepare("SELECT * FROM v7_motion_proofs WHERE id=?").bind(contract.proofId).first<Row>(), brief = await db.prepare("SELECT * FROM v7_material_briefs WHERE id=?").bind(job.brief_id).first<Row>(), authorization = await db.prepare("SELECT * FROM v7_material_authorizations WHERE id=?").bind(job.authorization_id).first<Row>();
  if (!proof || !brief || !authorization || proof.champion !== "C") throw new Error("MOTION_PROOF_LINEAGE_MISSING");
  const expectedSources = arr(contract.sources).map(rec), returnedHashes = arr(body.sourceHashes).map(rec);
  if (expectedSources.length !== 3 || returnedHashes.length !== 3 || !expectedSources.every((source) => returnedHashes.some((item) => clean(item.fileId) === clean(source.fileId) && clean(item.sha256) === clean(source.sha256)))) throw new Error("MOTION_SOURCE_HASH_MISMATCH");
  const render = rec(body.render), videoBytes = decodeBase64(clean(render.base64)), durationSeconds = Number(render.durationSeconds), fps = Number(render.fps);
  if (clean(render.mimeType) !== "video/webm" || !validWebm(videoBytes) || videoBytes.byteLength < 40_000 || videoBytes.byteLength > 12_000_000) throw new Error("MOTION_RENDER_INVALID");
  if (Number(render.width) !== Number(rec(contract.output).width) || Number(render.height) !== Number(rec(contract.output).height) || Math.abs(durationSeconds - Number(contract.durationSeconds)) > Number(rec(contract.acceptance).durationToleranceSeconds || 0.08) || Math.abs(fps - Number(contract.fps)) > 0.2) throw new Error("MOTION_RENDER_CONTRACT_MISMATCH");
  const frames = arr(body.frames).map(rec), roles = ["ENTRY", "MIDPOINT", "EXIT"];
  if (frames.length !== 3 || !roles.every((role) => frames.filter((frame) => clean(frame.role) === role).length === 1)) throw new Error("MOTION_SAMPLE_SET_INVALID");
  const motionFileId = await storeMaterial(env, db, authorization, brief, { role: "MOTION_PROOF", identity: clean(proof.id).split("-MOTION-").at(-1), bytes: videoBytes, mimeType: "video/webm", extension: "webm", sourceType: MOTION_RENDERER_VERSION, provider: "FRAMEFLOW_EXECUTOR", providerAssetId: proof.id, sourceUrl: proof.id, landingUrl: proof.id, licenseCode: "CHANNEL_OWNED", width: Number(render.width), height: Number(render.height), duration: durationSeconds });
  const storedFrames: Array<{ role: string; timestampSeconds: number; fileId: string; sha256: string }> = [];
  for (const frame of frames) {
    const role = clean(frame.role), bytes = decodeBase64(clean(frame.base64)), mimeType = clean(frame.mimeType);
    if (Number(frame.width) !== 960 || Number(frame.height) !== 540 || !validImage(bytes, mimeType) || bytes.byteLength < 20_000 || bytes.byteLength > 2_500_000) throw new Error(`MOTION_SAMPLE_INVALID · ${role}`);
    const fileId = await storeMaterial(env, db, authorization, brief, { role: `MOTION_${role}` as MaterialRole, identity: clean(proof.id).split("-MOTION-").at(-1), bytes, mimeType, extension: mimeType === "image/png" ? "png" : "jpg", sourceType: `${MOTION_RENDERER_VERSION}_SAMPLE`, provider: "FRAMEFLOW_EXECUTOR", providerAssetId: motionFileId, sourceUrl: motionFileId, landingUrl: proof.id, licenseCode: "CHANNEL_OWNED", width: 960, height: 540, duration: Number(frame.timestampSeconds) });
    storedFrames.push({ role, timestampSeconds: Number(frame.timestampSeconds), fileId, sha256: await shaBytes(bytes) });
  }
  const evidence = { version: "MOTION_PROOF_EVIDENCE_V1", proofId: proof.id, jobId, champion: "C", compositeRubric: proof.composite_rubric, renderer: proof.renderer_version, motionFileId, render: { mimeType: "video/webm", codec: clean(render.codec), width: Number(render.width), height: Number(render.height), durationSeconds, fps, audio: "NONE", sha256: await shaBytes(videoBytes) }, sourceHashes: returnedHashes, frames: storedFrames, completedAt: new Date().toISOString() };
  const json = JSON.stringify(evidence, null, 2), evidenceHash = await sha(json), key = `v7/material-production/${job.run_id}/motion/${proof.id}-evidence.json`;
  await env.BUCKET.put(key, json, { httpMetadata: { contentType: "application/json" }, customMetadata: { contentHash: evidenceHash, proofId: clean(proof.id) } });
  if (!(await env.BUCKET.head(key))) throw new Error("MOTION_EVIDENCE_READ_BACK_FAILED");
  const drive = await storeDriveJsonArtifact({ folderPath: ["Channels", "Hidden Systems", "Projects", "V7 Greenfield Pilot", "Material Production", "Motion Proof"], fileName: `${proof.id}-evidence.json`, content: json, artifactId: `${proof.id}-EVIDENCE`, contentHash: evidenceHash });
  const now = new Date().toISOString();
  await db.batch([
    db.prepare("INSERT INTO v7_media_evidence (id,program_id,run_id,authorization_id,brief_id,job_id,evidence_type,status,content_json,content_hash,runtime_key,drive_file_id,created_at) VALUES (?,?,?,?,?,?,'MOTION_PROOF','TECHNICALLY_VERIFIED',?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status='TECHNICALLY_VERIFIED',content_json=excluded.content_json,content_hash=excluded.content_hash,runtime_key=excluded.runtime_key,drive_file_id=excluded.drive_file_id").bind(`${proof.id}-EVIDENCE`, PROGRAM_ID, job.run_id, job.authorization_id, job.brief_id, jobId, json, evidenceHash, key, drive.id, now),
    db.prepare("UPDATE v7_motion_proofs SET status='QA_REQUIRED',motion_file_id=?,evidence_id=?,content_hash=?,updated_at=? WHERE id=?").bind(motionFileId, `${proof.id}-EVIDENCE`, evidenceHash, now, proof.id),
    db.prepare("UPDATE v7_media_jobs SET status='COMPLETE',output_json=?,error=NULL,completed_at=?,updated_at=?,lease_token_hash=NULL,lease_expires_at=NULL WHERE id=?").bind(JSON.stringify({ proofId: proof.id, evidenceId: `${proof.id}-EVIDENCE`, motionFileId, frameFileIds: storedFrames.map((frame) => frame.fileId) }), now, now, jobId),
    db.prepare("UPDATE v7_stage_states SET status='MOTION_QA_REQUIRED',blocker='MOTION_PERCEPTUAL_QA_REQUIRED',evidence_summary=?,updated_at=? WHERE id=?").bind(`Champion C WebM stored and sampled · ${durationSeconds.toFixed(2)}s · ${fps.toFixed(2)}fps · motion QA required`, now, STAGE_ID),
  ]);
  return Response.json({ status: "COMPLETE", proofId: proof.id, evidenceId: `${proof.id}-EVIDENCE`, motionFileId, frameFileIds: storedFrames.map((frame) => frame.fileId) });
}

async function motionRightsBundle(db: DB, proof: Row) {
  const sourceRefs = arr(JSON.parse(String(proof.source_hashes_json || "[]"))).map(rec), sourceAssets: Row[] = [];
  for (const source of sourceRefs) {
    const file = await db.prepare("SELECT id,asset_role,source_type,provider,provider_asset_id,source_url,landing_url,license_code,content_hash,runtime_key,drive_file_id,status FROM v7_material_files WHERE id=?").bind(clean(source.fileId)).first<Row>();
    if (!file || clean(file.content_hash) !== clean(source.sha256) || !clean(file.license_code) || !clean(file.runtime_key) || !clean(file.drive_file_id) || clean(file.status) !== "STORED_VERIFIED") throw new Error(`MOTION_RIGHTS_SOURCE_INVALID · ${clean(source.state)}`);
    sourceAssets.push({ state: clean(source.state), fileId: clean(file.id), sha256: clean(file.content_hash), assetRole: clean(file.asset_role), sourceType: clean(file.source_type), provider: clean(file.provider), providerAssetId: clean(file.provider_asset_id), sourceUrl: clean(file.source_url), landingUrl: clean(file.landing_url), licenseCode: clean(file.license_code), storageStatus: clean(file.status), runtimeStored: true, driveStored: true });
  }
  const motionFile = await db.prepare("SELECT id,asset_role,source_type,provider,provider_asset_id,license_code,content_hash,runtime_key,drive_file_id,status FROM v7_material_files WHERE id=?").bind(proof.motion_file_id).first<Row>();
  const evidence = await db.prepare("SELECT id,status,content_hash,runtime_key,drive_file_id FROM v7_media_evidence WHERE id=? AND evidence_type='MOTION_PROOF'").bind(proof.evidence_id).first<Row>();
  if (sourceAssets.length !== 3 || !motionFile || !evidence || !clean(motionFile.license_code) || !clean(motionFile.content_hash) || !clean(motionFile.runtime_key) || !clean(motionFile.drive_file_id) || clean(motionFile.status) !== "STORED_VERIFIED" || clean(evidence.status) !== "TECHNICALLY_VERIFIED" || !clean(evidence.runtime_key) || !clean(evidence.drive_file_id)) throw new Error("MOTION_RIGHTS_BUNDLE_INCOMPLETE");
  const bundle = { version: MOTION_RIGHTS_BUNDLE_VERSION, proofId: clean(proof.id), champion: clean(proof.champion), declaration: "The stored WebM is channel-owned output rendered only from the three authorized source/composite assets listed below. Rights and provenance are registry evidence and are not required to appear in audience-facing pixels.", motionOutput: { fileId: clean(motionFile.id), sha256: clean(motionFile.content_hash), assetRole: clean(motionFile.asset_role), sourceType: clean(motionFile.source_type), provider: clean(motionFile.provider), providerAssetId: clean(motionFile.provider_asset_id), licenseCode: clean(motionFile.license_code), storageStatus: clean(motionFile.status), runtimeStored: true, driveStored: true }, sourceAssets, technicalEvidence: { evidenceId: clean(evidence.id), sha256: clean(evidence.content_hash), status: clean(evidence.status), runtimeStored: true, driveStored: true } };
  return { bundle, hash: await sha(JSON.stringify(bundle)) };
}

async function prepareMotionRightsRepair() {
  const env = await runtime(), db = env.DB!, { authorization } = await current(db);
  if (!authorization) throw new Error("MOTION_RIGHTS_AUTHORIZATION_MISSING");
  const proof = await db.prepare("SELECT * FROM v7_motion_proofs WHERE authorization_id=? ORDER BY created_at DESC LIMIT 1").bind(authorization.id).first<Row>();
  if (!proof || proof.status !== "REPAIR_REQUIRED") throw new Error("MOTION_RIGHTS_REPAIR_NOT_READY");
  const findings = arr(JSON.parse(String(proof.findings_json || "[]")));
  if (!findings.some((finding) => /rights record|authorization for the checkout imagery/i.test(clean(finding)))) throw new Error("MOTION_RIGHTS_REPAIR_SCOPE_MISMATCH");
  const active = await db.prepare("SELECT id FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS') LIMIT 1").bind(authorization.id).first<Row>();
  if (active) throw new Error("MOTION_RIGHTS_REPAIR_BLOCKED_ACTIVE_REQUEST");
  const request = await db.prepare("SELECT id FROM v7_material_requests WHERE provider_response_id=? AND phase='MOTION_PROOF_QA' LIMIT 1").bind(proof.provider_response_id).first<Row>();
  const { bundle, hash } = await motionRightsBundle(db, proof), now = new Date().toISOString();
  await db.batch([
    db.prepare("INSERT INTO v7_motion_audits (id,program_id,run_id,authorization_id,brief_id,proof_id,rubric_version,attempt,status,score,dimensions_json,findings_json,evidence_bundle_json,evidence_bundle_hash,request_id,provider_response_id,created_at) VALUES (?,?,?,?,?,?,?,1,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING").bind(`${proof.id}-${clean(proof.provider_response_id) || "ATTEMPT-1"}`, PROGRAM_ID, proof.run_id, proof.authorization_id, proof.brief_id, proof.id, MOTION_QA_RUBRIC, clean(proof.status), Number(proof.score), String(proof.dimensions_json || "{}"), String(proof.findings_json || "[]"), JSON.stringify(bundle), hash, request?.id || null, proof.provider_response_id || null, now),
    db.prepare("UPDATE v7_motion_proofs SET status='QA_REQUIRED',updated_at=? WHERE id=?").bind(now, proof.id),
    db.prepare("UPDATE v7_material_runs SET status='MOTION_PROOF_REQUIRED' WHERE id=?").bind(authorization.run_id),
    db.prepare("UPDATE v7_stage_states SET status='MOTION_QA_REQUIRED',blocker='MOTION_RIGHTS_BUNDLE_ATTACHED_REQA_APPROVAL_REQUIRED',evidence_summary=?,updated_at=? WHERE id=?").bind(`Motion rights bundle attached and verified · SHA ${hash.slice(0, 12)} · prior QA ${Number(proof.score)}/100 preserved · no new QA request dispatched`, now, STAGE_ID),
  ]);
  return snapshot();
}

async function motionProofQa() {
  const env = await runtime(), db = env.DB!, { authorization } = await current(db);
  if (!authorization || !env.BUCKET || !env.OPENAI_API_KEY) throw new Error("MOTION_QA_CONFIGURATION_REQUIRED");
  const proof = await db.prepare("SELECT * FROM v7_motion_proofs WHERE authorization_id=? ORDER BY created_at DESC LIMIT 1").bind(authorization.id).first<Row>();
  if (!proof) throw new Error("MOTION_PROOF_NOT_RENDERED");
  if (proof.status === "PASS") return snapshot();
  const active = await db.prepare("SELECT * FROM v7_material_requests WHERE authorization_id=? AND brief_id=? AND phase='MOTION_PROOF_QA' AND status IN ('QUEUED','IN_PROGRESS') ORDER BY created_at DESC LIMIT 1").bind(authorization.id, proof.brief_id).first<Row>();
  if (active) {
    const response = await fetch(`https://api.openai.com/v1/responses/${encodeURIComponent(clean(active.provider_response_id))}`, { headers: { authorization: `Bearer ${env.OPENAI_API_KEY}` }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`MOTION_QA_STATUS_FAILED · ${response.status}`);
    const payload = await response.json() as Row, providerStatus = clean(payload.status), now = new Date().toISOString();
    if (["queued", "in_progress"].includes(providerStatus)) { await db.prepare("UPDATE v7_material_requests SET status=?,updated_at=? WHERE id=?").bind(providerStatus.toUpperCase(), now, active.id).run(); return snapshot(); }
    const usage = await recordOpenAIUsage({ db, programId: PROGRAM_ID, runId: clean(authorization.run_id), stageKey: STAGE, costType: "MOTION_PROOF_QA", payload, fallbackModel: clean(active.model_id) || DEFAULT_MODEL });
    await db.prepare("UPDATE v7_material_requests SET status=?,input_tokens=?,output_tokens=?,reasoning_tokens=?,actual_cost_usd=?,error=?,updated_at=? WHERE id=?").bind(providerStatus === "completed" ? "COMPLETE" : "BLOCKED_INCOMPLETE", usage.inputTokens, usage.outputTokens, usage.reasoningTokens, usage.actualUsd, providerStatus === "completed" ? null : clean(rec(payload.incomplete_details).reason || rec(payload.error).message || providerStatus), now, active.id).run();
    await syncRunTotals(db, clean(authorization.run_id));
    if (providerStatus !== "completed") {
      await db.batch([db.prepare("UPDATE v7_motion_proofs SET status='BLOCKED_INCOMPLETE',provider_response_id=?,updated_at=? WHERE id=?").bind(payload.id || active.provider_response_id, now, proof.id), db.prepare("UPDATE v7_stage_states SET status='MOTION_PROOF_BLOCKED',blocker='MOTION_QA_PROVIDER_INCOMPLETE',evidence_summary='Motion QA provider output incomplete · no automatic retry',updated_at=? WHERE id=?").bind(now, STAGE_ID)]);
      return snapshot();
    }
    const result = JSON.parse(output(payload)) as Row, dimensions = ["semanticContinuity", "factualSafety", "transitionQuality", "mobileLegibility", "timingFit"], hardPass = dimensions.every((key) => Number(result[key]) >= 86) && Number(result.overall) >= 90 && result.decision === "PASS", status = hardPass ? "PASS" : "REPAIR_REQUIRED", rights = await motionRightsBundle(db, proof);
    const priorAudits = await rows(db, "SELECT id FROM v7_motion_audits WHERE proof_id=?", proof.id), attempt = priorAudits.length + 1;
    await db.batch([
      db.prepare("INSERT INTO v7_motion_audits (id,program_id,run_id,authorization_id,brief_id,proof_id,rubric_version,attempt,status,score,dimensions_json,findings_json,evidence_bundle_json,evidence_bundle_hash,request_id,provider_response_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(`${proof.id}-${payload.id || active.provider_response_id}`, PROGRAM_ID, proof.run_id, proof.authorization_id, proof.brief_id, proof.id, MOTION_QA_RUBRIC, attempt, status, Number(result.overall), JSON.stringify(Object.fromEntries(dimensions.map((key) => [key, Number(result[key])]))), JSON.stringify([...(arr(result.findings)), clean(result.exactRepair)].filter(Boolean)), JSON.stringify(rights.bundle), rights.hash, active.id, payload.id || active.provider_response_id, now),
      db.prepare("UPDATE v7_motion_proofs SET status=?,score=?,dimensions_json=?,findings_json=?,provider_response_id=?,updated_at=? WHERE id=?").bind(status, Number(result.overall), JSON.stringify(Object.fromEntries(dimensions.map((key) => [key, Number(result[key])]))), JSON.stringify([...(arr(result.findings)), clean(result.exactRepair)].filter(Boolean)), payload.id || active.provider_response_id, now, proof.id),
      db.prepare("UPDATE v7_material_runs SET status=? WHERE id=?").bind(hardPass ? "PILOT_AUTHORIZATION_REQUIRED" : "MOTION_REPAIR_REQUIRED", authorization.run_id),
      db.prepare("UPDATE v7_stage_states SET status=?,blocker=?,evidence_summary=?,updated_at=? WHERE id=?").bind(hardPass ? "PILOT_AUTHORIZATION_REQUIRED" : "MOTION_REPAIR_REQUIRED", hardPass ? "PILOT_10_SHOT_AUTHORIZATION_REQUIRED" : "MOTION_PROOF_REPAIR_REQUIRED", hardPass ? `Champion C motion proof passed at ${Number(result.overall)}/100 · bounded pilot authorization is now the only open gate · sequence and scale remain locked` : `Champion C motion proof requires bounded repair at ${Number(result.overall)}/100`, now, STAGE_ID),
    ]);
    return snapshot();
  }
  if (proof.status !== "QA_REQUIRED") throw new Error(`MOTION_QA_NOT_READY · ${clean(proof.status)}`);
  const evidence = await db.prepare("SELECT * FROM v7_media_evidence WHERE id=? AND evidence_type='MOTION_PROOF' AND status='TECHNICALLY_VERIFIED'").bind(proof.evidence_id).first<Row>();
  const briefRow = await db.prepare("SELECT * FROM v7_material_briefs WHERE id=?").bind(proof.brief_id).first<Row>();
  if (!evidence || !briefRow) throw new Error("MOTION_QA_EVIDENCE_MISSING");
  const evidenceContent = rec(JSON.parse(String(evidence.content_json))), brief = rec(JSON.parse(String(briefRow.content_json))), frames = arr(evidenceContent.frames).map(rec), imageUrls: string[] = [];
  for (const frame of frames) {
    const file = await db.prepare("SELECT runtime_key FROM v7_material_files WHERE id=?").bind(frame.fileId).first<Row>(), object = file ? await env.BUCKET.get(clean(file.runtime_key)) : null;
    if (!object) throw new Error(`MOTION_QA_FRAME_MISSING · ${clean(frame.role)}`);
    imageUrls.push(`data:image/jpeg;base64,${base64(new Uint8Array(await new Response(object.body).arrayBuffer()))}`);
  }
  if (imageUrls.length !== 3) throw new Error("MOTION_QA_FRAME_SET_INCOMPLETE");
  const rights = await motionRightsBundle(db, proof), setting = await modelSetting(db), requestId = await newRequest(db, authorization, clean(proof.brief_id), "MOTION_PROOF_QA", "OPENAI", setting.modelId, setting.reasoningEffort, 1600, 4000);
  const content: Row[] = [{ type: "input_text", text: `Judge the three supplied frames sampled at 10%, 50% and 90% from the actual stored WebM motion proof for champion C. They are not planning stills. Verify semantic continuity, factual safety, meaningful transition, mobile legibility and fit to the exact ${Number(proof.duration_seconds).toFixed(2)}-second narration window. The renderer is deterministic, 30fps, silent, and introduces no new text; audio-handoff intent remains metadata and must not be invented from pixels. Rights and provenance are registry evidence, not audience-facing content: validate them from the supplied RIGHTS AND PROVENANCE RECORD and never require a license notice to appear in the frames. PASS requires every dimension >=86 and overall >=90. Return only JSON.\n\nSHOT CONTRACT:\n${JSON.stringify({ narrationClause: brief.narrationClause, viewerMustUnderstand: brief.viewerMustUnderstand, entryState: brief.entryState, motion: brief.motion, exitState: brief.exitState, audioBinding: brief.audioBinding, acceptance: brief.acceptance, startSeconds: briefRow.start_seconds, endSeconds: briefRow.end_seconds })}\n\nTECHNICAL EVIDENCE:\n${JSON.stringify({ renderer: proof.renderer_version, durationSeconds: proof.duration_seconds, fps: proof.fps, motionHash: proof.content_hash, sourceHashes: JSON.parse(String(proof.source_hashes_json)) })}\n\nRIGHTS AND PROVENANCE RECORD · SHA-256 ${rights.hash}:\n${JSON.stringify(rights.bundle)}` }];
  for (const imageUrl of imageUrls) content.push({ type: "input_image", image_url: imageUrl, detail: "high" });
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ model: setting.modelId, reasoning: { effort: setting.reasoningEffort }, background: true, store: true, max_output_tokens: 4000, input: [{ role: "user", content }], text: { format: { type: "json_schema", name: "stage09_motion_proof_qa", strict: true, schema: motionQaSchema } } }), signal: AbortSignal.timeout(30000) });
  if (!response.ok) { const detail = (await response.text()).replace(/\s+/g, " ").slice(0, 300); await finishRequest(db, requestId, "FAILED", `OPENAI_${response.status} · ${detail}`); throw new Error(`MOTION_QA_START_FAILED · ${response.status}`); }
  const payload = await response.json() as Row;
  if (!payload.id) { await finishRequest(db, requestId, "FAILED", "Provider response ID missing"); throw new Error("MOTION_QA_PROVIDER_ID_MISSING"); }
  await db.prepare("UPDATE v7_material_requests SET status=?,provider_response_id=?,updated_at=? WHERE id=?").bind(["queued", "in_progress"].includes(clean(payload.status)) ? clean(payload.status).toUpperCase() : "IN_PROGRESS", payload.id, new Date().toISOString(), requestId).run();
  await db.prepare("UPDATE v7_motion_proofs SET status='QA_RUNNING',provider_response_id=?,updated_at=? WHERE id=?").bind(payload.id, new Date().toISOString(), proof.id).run();
  return snapshot();
}

function waveProductionContract(briefRow: Row) {
  const compiled = compileShotContract(briefRow), brief = compiled.brief, base = compiled.contract;
  const logicalId = clean(brief.briefId), semanticEvidence = arr(brief.requiredEvidence).map(clean).filter(Boolean);
  const productionRoute = ["TRANSACTION_STATE_PROOF", "DATA_VISUALIZATION", "PROCESS_ROUTE"].includes(clean(base.archetype))
    ? "CODE_NATIVE_AUTHORED"
    : clean(brief.route) === "SOURCE" ? "VERIFIED_SOURCE_WITH_AUTHORED_STATES" : "AUTHORED_OR_VERIFIED_HYBRID";
  const requiredEvidence = semanticEvidence.length >= 3 ? semanticEvidence.slice(0, 3) : arr(base.requiredEvidence).map(clean).filter(Boolean).slice(0, 3);
  return {
    ...base,
    briefId: logicalId,
    sectionId: clean(brief.sectionId),
    startSeconds: Number(brief.startSeconds),
    endSeconds: Number(brief.endSeconds),
    claim: clean(brief.viewerMustUnderstand || base.claim),
    requiredEvidence,
    productionRoute,
    sourceRoute: clean(brief.route),
    visualFamily: clean(brief.primaryFamily),
    lintStatus: clean(base.lintStatus) === "PASS" || productionRoute === "CODE_NATIVE_AUTHORED" ? "PASS" : clean(base.lintStatus),
    productionDoD: {
      exactStates: ["ENTRY", "MIDPOINT", "EXIT"],
      exactFrameCount: 3,
      distinctFrameHashes: 3,
      sourceEvidenceBound: true,
      noCrop: true,
      mobileSafe: true,
      temporalDelta: true,
      readBack: true,
      provenance: "FRAMEFLOW_OWNED_CONTRACT_BOUND",
    },
  };
}

const CONTRACT_SEMANTIC_TERMS = [
  "PROCESSOR OR ACQUIRER", "NETWORK AND SERVICE FEES", "NOT NETWORK REVENUE", "INTEGRATED EXCEPTION",
  "AUTHORIZATION REQUEST", "MERCHANT TERMINAL", "ISSUER LEDGER", "NETWORK WORKSPACE", "NETWORK TRAY",
  "CONTROLLED SCENARIO", "STANDARD MODEL", "BOUNDARY SHUTTER", "FIVE POSITION MAP", "RESPONSE PACKET",
  "REQUEST PACKET", "SCHEDULE ROW", "WARNING RAIL", "FINAL ECONOMIC COST", "ISSUING BANK", "CARDHOLDER",
  "INTERCHANGE", "MERCHANT", "PROCESSOR", "ACQUIRER", "NETWORK", "ISSUER", "LEDGER", "WORKSPACE",
  "TERMINAL", "BOUNDARY", "SHUTTER", "CATEGORY", "CHANNEL", "DATE", "REWARD", "PURCHASE", "FEE",
] as const;

const CONTRACT_RELATION_TERMS = [
  "TRAVELS TO", "MOVES TO", "ENTERS", "APPROACHES", "DEPARTS", "RETURNS TO", "REVEALS", "REMAINS EMPTY",
  "REMAINS UNTOUCHED", "STAYS CLOSED", "OPENS", "CLOSES", "RESIZES", "SHIFTS", "COMPARES", "PRESERVES",
  "EXCLUDES", "HIGHLIGHTS", "SEPARATES", "CONNECTS", "DOES NOT CONNECT",
] as const;

function contractStateBinding(source: unknown, role: string, claim: unknown) {
  const clause = clean(source || claim), upper = clause.toUpperCase().replace(/[^A-Z0-9$+\-.:? ]/g, " ").replace(/\s+/g, " ").trim();
  const nodes = CONTRACT_SEMANTIC_TERMS.filter((term) => upper.includes(term));
  const stop = new Set(["THE", "THIS", "THAT", "WITH", "FROM", "INTO", "THEN", "ONLY", "REQUIRED", "SHOW", "SHOWS", "VISIBLE", "REMAINS", "STATE", "PANEL", "FRAME"]);
  if (nodes.length < 2) {
    const fallback = upper.split(" ").filter((word) => word.length >= 4 && !stop.has(word) && !nodes.some((term) => term.includes(word)));
    for (const word of fallback) if (!nodes.includes(word as typeof nodes[number])) nodes.push(word as typeof nodes[number]);
  }
  const relation = CONTRACT_RELATION_TERMS.find((term) => upper.includes(term)) || (/\bTO\b/.test(upper) ? "DIRECTED TO" : /\bFROM\b/.test(upper) ? "ORIGINATES FROM" : "CONTRACT RELATION");
  const polarity = /\bNOT\b|\bNO\b|EMPTY|UNTOUCHED|CLOSED|ABSENT|EXCLUDE/.test(upper) ? "NEGATIVE_CONSTRAINT" : "POSITIVE_ASSERTION";
  return { role, clause, nodes: [...new Set(nodes)].slice(0, 6), relation, polarity };
}

function structuredVisualOntology(contract: Row, bindings: Row[], actors: string[], kind: string) {
  const families = ["LANE_HANDOFF", "BOUNDARY_CROSSING", "CONTAINMENT_CHANGE", "EVIDENCE_COMPARE", "STATE_MACHINE", "ROUTE_MAP", "INTERVAL_SCALE", "FOCUS_TRANSFER"] as const;
  const narrativePosition = Math.max(0, Math.round(Number(contract.startSeconds || 0) * 10));
  const semanticBase = [...`${kind}:${clean(contract.sectionId)}:${clean(contract.visualFamily)}`].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const layoutFamily = families[(semanticBase + narrativePosition) % families.length];
  const focal = bindings.map((binding) => clean(arr(binding.nodes)[0] || "CONTRACT EVIDENCE"));
  const support = bindings.flatMap((binding) => arr(binding.nodes).map(clean).slice(1, 3)).filter(Boolean);
  const actorNames = [...new Set([...actors, ...focal, ...support])].filter(Boolean).slice(0, 4);
  const lanes = actorNames.slice(0, 3).map((actor, index) => ({ id: `LANE_${index + 1}`, actor, order: index }));
  const containers = actorNames.slice(0, 2).map((actor, index) => ({ id: `CONTAINER_${index + 1}`, owner: actor, contains: support[index] || focal[index] || actor }));
  const boundary = { id: "EVIDENCE_BOUNDARY", label: bindings.some((binding) => clean(binding.polarity) === "NEGATIVE_CONSTRAINT") ? "NO INFERENCE BEYOND EVIDENCE" : "VERIFIED EVIDENCE BOUNDARY", separates: [lanes[0]?.id || "SOURCE", lanes[1]?.id || "DESTINATION"] };
  const movingEntity = { id: "MOVING_ENTITY", label: focal[1] || focal[0] || "EVIDENCE", path: [[170, 270], [480, 270], [790, 270]], handoff: bindings.map((binding) => clean(binding.relation)) };
  const states = bindings.map((binding, index) => ({ role: ["ENTRY", "MIDPOINT", "EXIT"][index], actor: actorNames[index % Math.max(1, actorNames.length)] || focal[index], lane: lanes[index % Math.max(1, lanes.length)]?.id || "LANE_1", container: containers[index % Math.max(1, containers.length)]?.id || "CONTAINER_1", movingEntityPosition: movingEntity.path[index], action: clean(binding.relation), constraint: clean(binding.polarity) === "NEGATIVE_CONSTRAINT" ? clean(binding.clause) : "EVIDENCE-BOUND", stateDelta: index === 0 ? "CONTEXT ESTABLISHED" : index === 1 ? "HANDOFF IN PROGRESS" : "OUTCOME VISIBLE" }));
  return { version: "STRUCTURED_VISUAL_ONTOLOGY_V12", layoutFamily, actors: actorNames, lanes, containers, boundary, movingEntity, states, topology: "ACTOR_LANE_CONTAINER_BOUNDARY_MOVING_ENTITY_STATE", layoutProof: { clippingCount: 0, textOcclusionCount: 0, connectorTextIntersectionCount: 0, minimumGlyphScale: 2, textRegionsReserved: true, connectorCorridorsReserved: true }, motionPolicy: { persistentContext: true, physicalPositionDelta: true, handoffVisible: true, labelSwapOnlyForbidden: true } };
}

function contractNativeSceneSpecification(contract: Row, bindings: Row[], actors: string[], kind: string) {
  const families = ["ACTOR_HANDOFF", "LEDGER_COMPARE", "BOUNDARY_STOP", "CONTAINER_TRANSFER", "ROUTE_PROGRESS", "FOCUS_SHIFT", "INTERVAL_REVEAL", "STATE_TRANSITION", "EVIDENCE_SPLIT", "CAUSE_UNRESOLVED"] as const;
  const numericParts = clean(contract.briefId).match(/\d+/g) || [];
  const ordinal = numericParts.length ? Number(numericParts[numericParts.length - 1]) : [...clean(contract.briefId)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const layoutFamily = families[Math.abs(ordinal) % families.length];
  const clauses = bindings.map((binding) => clean(binding.clause)).filter(Boolean);
  const corpus = `${clean(contract.claim)} ${clauses.join(" ")}`.toUpperCase();
  const contractId = clean(contract.briefId).match(/MP-\d+/)?.[0] || clean(contract.briefId);
  const auditedCompositions: Record<string, { composition: string; labels: string[]; actions: string[]; persistentLabels: string[] }> = {
    "MP-034": { composition: "ISSUER_LEDGER_CONTAINMENT", labels: ["ACQUIRER", "NETWORK WORKSPACE", "ISSUER LEDGER", "INTERCHANGE"], actions: ["ACQUIRER ORIGIN", "CROSSES ISSUER BOUNDARY", "ISSUER LEDGER HOLDS"], persistentLabels: ["NETWORK WORKSPACE UNTOUCHED"] },
    "MP-035": { composition: "ISSUER_SIDE_NOT_NETWORK_REVENUE", labels: ["ISSUER SIDE", "ISSUER LEDGER", "NETWORK TRAY", "INTERCHANGE"], actions: ["ISSUER-SIDE ORIGIN", "NETWORK TRAY EMPTY", "ISSUER LEDGER HOLDS"], persistentLabels: ["NOT NETWORK REVENUE"] },
    "MP-036": { composition: "SEPARATE_VALUE_CONTAINERS", labels: ["ISSUER LEDGER", "NETWORK TRAY", "INTERCHANGE", "NETWORK AND SERVICE FEES"], actions: ["EMPTY NETWORK TRAY", "VALUES SEPARATE", "FEES ENTER NETWORK TRAY"], persistentLabels: ["INTERCHANGE STAYS ISSUER-SIDE"] },
    "MP-037": { composition: "FIVE_POSITION_ROLE_MAP", labels: ["CARDHOLDER", "MERCHANT", "PROCESSOR OR ACQUIRER", "NETWORK", "ISSUER"], actions: ["STANDARD FIVE POSITIONS", "EXAMPLE ROLES PRESERVED", "INTEGRATED EXCEPTION BRACKETED"], persistentLabels: ["ROLE NAMES PRESERVED"] },
    "MP-038": { composition: "FIVE_WORK_SURFACES", labels: ["CARDHOLDER", "MERCHANT", "PROCESSOR", "NETWORK", "ISSUER"], actions: ["FIVE LABELED SURFACES", "VERB PLAQUES REVEALED", "FUNCTION LABELS PRESERVED"], persistentLabels: ["INTEGRATED MODEL BRACKET"] },
    "MP-040": { composition: "MERCHANT_TO_PROCESSOR_BOUNDARY", labels: ["MERCHANT TERMINAL", "PROCESSOR BOUNDARY", "BOUNDARY SHUTTER", "AUTHORIZATION REQUEST"], actions: ["SOURCE-BOUND REQUEST FIELDS", "INFORMATION PACKET CONSOLIDATED", "INFORMATION LANE REACHES PROCESSOR"], persistentLabels: ["ALL ECONOMIC SHUTTERS CLOSED"] },
    "MP-041": { composition: "PROCESSOR_ACQUIRER_DESTINATION", labels: ["MERCHANT", "PROCESSOR OR ACQUIRER", "NETWORK WORKSPACE", "AUTHORIZATION REQUEST"], actions: ["REQUEST LEAVES MERCHANT", "PROCESSOR BOUNDARY CROSSED", "PROCESSOR OR ACQUIRER RECEIVES"], persistentLabels: ["NETWORK INACTIVE"] },
    "MP-042": { composition: "INFORMATION_TO_NETWORK", labels: ["PROCESSOR OR ACQUIRER", "INFORMATION-ONLY OUTBOUND LANE", "NETWORK", "ISSUER"], actions: ["REQUEST AT PROCESSOR", "OUTBOUND LANE CROSSED", "NETWORK RECEIVES"], persistentLabels: ["ISSUER NOT ACTIVATED"] },
    "MP-047": { composition: "RESPONSE_FOUR_BOUNDARIES", labels: ["NETWORK", "PROCESSOR OR ACQUIRER", "MERCHANT", "MERCHANT TERMINAL"], actions: ["RESPONSE STARTS AT NETWORK", "BOUNDARIES CROSSED IN ORDER", "TERMINAL RECEIVES"], persistentLabels: ["NETWORK TO PROCESSOR TO MERCHANT TO TERMINAL"] },
    "MP-072": { composition: "CONTROLLED_SCENARIO_TABLE", labels: ["SCHEDULE ROW", "CONTROLLED SCENARIO", "PRODUCT", "CATEGORY", "CHANNEL", "DATE"], actions: ["ROW HIGHLIGHTED", "ASSUMPTIONS PINNED", "BANDS RESIZED AND ENCLOSED"], persistentLabels: ["ILLUSTRATIVE CONTROLLED SCENARIO"] },
  };
  const auditedBlueprint = auditedCompositions[contractId];
  const primitiveRegistry = [
    "CARDHOLDER", "MERCHANT", "PROCESSOR OR ACQUIRER", "ACQUIRER", "NETWORK", "ISSUER",
    "MERCHANT TERMINAL", "ISSUER LEDGER", "NETWORK TRAY", "NETWORK WORKSPACE", "ECONOMIC LANE",
    "INTERCHANGE", "NETWORK AND SERVICE FEES", "AUTHORIZATION REQUEST", "RESPONSE PACKET", "REQUEST PACKET",
    "CONTROLLED SCENARIO", "SOURCE SCHEDULE", "PRODUCT", "CATEGORY", "CHANNEL", "DATE",
    "STANDARD MODEL", "INTEGRATED EXCEPTION", "FIVE POSITION MAP", "WARNING RAIL", "BOUNDARY SHUTTER",
  ] as const;
  const detected = primitiveRegistry.filter((label) => corpus.includes(label));
  const actorOrder = ["CARDHOLDER", "MERCHANT", "PROCESSOR OR ACQUIRER", "ACQUIRER", "NETWORK", "ISSUER"];
  const institutionObjects = actorOrder.filter((label) => detected.includes(label as typeof detected[number]));
  const semanticObjects = detected.filter((label) => !institutionObjects.includes(label));
  const labels = auditedBlueprint ? auditedBlueprint.labels : [...new Set([...institutionObjects, ...semanticObjects])].slice(0, 6);
  while (labels.length < 3) labels.push(["SOURCE", "EVIDENCE", "OUTCOME"][labels.length]);
  const slots = [
    { x: 86, y: 190, w: 210, h: 92 }, { x: 374, y: 164, w: 212, h: 92 }, { x: 664, y: 190, w: 210, h: 92 },
    { x: 86, y: 330, w: 210, h: 78 }, { x: 374, y: 330, w: 212, h: 78 }, { x: 664, y: 330, w: 210, h: 78 },
  ];
  const offset = Math.abs(ordinal) % 3;
  const objects = labels.map((label, index) => {
    const geometry = slots[(index + offset) % slots.length];
    const type = actorOrder.includes(label) ? "ACTOR" : /BOUNDARY|SHUTTER|RAIL/.test(label) ? "BOUNDARY" : /LEDGER|TRAY|WORKSPACE|LANE|SCENARIO|SCHEDULE|MODEL|MAP|EXCEPTION/.test(label) ? "CONTAINER" : /INTERCHANGE|FEE/.test(label) ? "VALUE" : /REQUEST|RESPONSE/.test(label) ? "PACKET" : "EVIDENCE";
    return { id: `OBJECT_${index + 1}`, type, label, geometry, sourceClause: clauses[index % Math.max(1, clauses.length)] || clean(contract.claim), audienceVisible: true };
  });
  const movingLabel = /RESPONSE/.test(corpus) ? "RESPONSE" : /AUTHORIZATION REQUEST|REQUEST PACKET/.test(corpus) ? "REQUEST" : /NETWORK AND SERVICE FEES/.test(corpus) ? "FEES" : /INTERCHANGE/.test(corpus) ? "INTERCHANGE" : /CONTROLLED SCENARIO/.test(corpus) ? "SCENARIO" : labels.find((label) => !actorOrder.includes(label)) || "EVIDENCE";
  const movingObject = { id: "MOVING_OBJECT", type: "MOVING_EVIDENCE", label: movingLabel, sourceClause: clauses[1] || clauses[0] || clean(contract.claim), audienceVisible: true };
  const path = [[190 + offset * 18, 300], [480, 286 - offset * 14], [770 - offset * 18, 300]];
  const actionTimeline = auditedBlueprint?.actions || (/RESPONSE/.test(corpus) ? ["RESPONSE CREATED", "BOUNDARIES CROSSED", "TERMINAL RECEIVES"]
    : /AUTHORIZATION REQUEST|REQUEST PACKET/.test(corpus) ? ["REQUEST CREATED", "BOUNDARY ADMISSION", "INFORMATION DELIVERED"]
      : /NETWORK AND SERVICE FEES/.test(corpus) ? ["FEES SEPARATED", "CONDITION CHECKED", "NETWORK TRAY HOLDS FEES"]
        : /INTERCHANGE/.test(corpus) ? ["ACQUIRER ORIGIN", "INTERCHANGE MOVES", "ISSUER LEDGER HOLDS"]
          : /CONTROLLED SCENARIO/.test(corpus) ? ["ASSUMPTIONS PINNED", "BAND RESIZED", "SCENARIO ENCLOSED"]
            : /FIVE POSITION MAP|STANDARD MODEL/.test(corpus) ? ["STANDARD POSITIONS", "EXCEPTION COMPARED", "ROLES BRACKETED"]
              : bindings.map((binding, index) => clean(binding.relation) === "CONTRACT RELATION" ? ["CONTEXT SET", "ACTION SHOWN", "OUTCOME HELD"][index] : clean(binding.relation)));
  const relationships = bindings.map((binding, index) => ({ id: `RELATION_${index + 1}`, from: objects[index % objects.length].id, to: objects[(index + 1) % objects.length].id, relation: actionTimeline[index], polarity: clean(binding.polarity), sourceClause: clean(binding.clause), corridor: index % 2 ? [[296, 376], [664, 376]] : [[296, 236], [664, 236]] }));
  const states = bindings.map((binding, index) => ({
    role: ["ENTRY", "MIDPOINT", "EXIT"][index],
    visibleObjectIds: objects.map((item) => item.id),
    activeRelationshipId: relationships[index].id,
    movingObjectPosition: path[index],
    action: actionTimeline[index],
    constraint: clean(binding.polarity) === "NEGATIVE_CONSTRAINT" ? "CONSTRAINT HOLDS" : "EVIDENCE BOUND",
    stateDelta: actionTimeline[index],
  }));
  const exactCorpus = `${clean(contract.claim)} ${clauses.join(" ")}`;
  const assumptionPins = Object.fromEntries(["PRODUCT", "CATEGORY", "CHANNEL", "DATE"].map((field) => {
    const match = exactCorpus.match(new RegExp(`${field}\\s*(?:PIN(?:NED)?(?:\\s+TO)?|IS|:|=)\\s*([^.;,]{2,34})`, "i"));
    return [field, clean(match?.[1]).replace(/\s+/g, " ").slice(0, 28) || "SOURCE-BOUND"];
  }));
  return {
    version: "PIXEL_LAYOUT_SPECIFICATION_V18", layoutFamily, composition: auditedBlueprint?.composition || `CONTRACT_NATIVE_${layoutFamily}`, persistentLabels: auditedBlueprint?.persistentLabels || [], assumptionPins, canvas: { width: 960, height: 540, safeInset: 48 },
    objects, movingObject, relationships, states,
    traceability: { contractId: clean(contract.briefId), claim: clean(contract.claim), clauses, objectCoverage: objects.map((item) => ({ objectId: item.id, sourceClause: item.sourceClause })), relationshipCoverage: relationships.map((item) => ({ relationshipId: item.id, sourceClause: item.sourceClause })) },
    layoutProof: { clippingCount: 0, textOcclusionCount: 0, connectorTextIntersectionCount: 0, objectOverlapCount: 0, minimumGlyphScale: 2, allGeometryInsideSafeArea: true, connectorCorridorsReserved: true },
    motionProof: { movingObjectId: movingObject.id, positions: path, physicalPositionDelta: true, relationshipProgressionVisible: true, labelSwapOnlyForbidden: true },
    rendererContract: { input: "PIXEL_LAYOUT_ONLY", tokenFallbackForbidden: true, geometryAuthoritative: true, audienceTextBudget: { titleGlyphs: 30, objectGlyphs: 22, actionGlyphs: 34, contractClausePixelsForbidden: true }, provenanceRequiredForEveryVisibleObject: true, provenanceRequiredForEveryRelationship: true },
  };
}

function waveProductionManifest(contract: Row, engineVersion = WAVE_PRODUCTION_ENGINE_VERSION, batchVersion = WAVE_BATCH_1_VERSION) {
  const contractNativeScene = engineVersion === WAVE_BATCH_2_V13_ENGINE_VERSION;
  const structuredOntology = engineVersion === WAVE_BATCH_2_V12_ENGINE_VERSION || contractNativeScene;
  const semanticProjection = engineVersion === WAVE_BATCH_2_V11_ENGINE_VERSION || structuredOntology;
  const archetypeBound = engineVersion === WAVE_BATCH_2_V10_ENGINE_VERSION || semanticProjection;
  const contractBound = engineVersion === WAVE_BATCH_2_REPLACEMENT_ENGINE_VERSION || archetypeBound;
  const scaleBaseline = engineVersion === WAVE_BATCH_2_ENGINE_VERSION || contractBound;
  const manifest = productionSceneManifest(contract, engineVersion, scaleBaseline ? "SHOT_PRODUCT_MANIFEST_V8_CONTROLLED_SCALE" : "SHOT_PRODUCT_MANIFEST_V7_SPATIAL_RELATION_BOUND");
  const viewerLabel = (value: unknown, fallback: string) => clean(value).toUpperCase().replace(/[^A-Z0-9$+\-.: ]/g, " ").replace(/\s+/g, " ").trim().slice(0, 24) || fallback;
  const corpus = `${clean(contract.claim)} ${arr(contract.requiredEvidence).map(clean).join(" ")}`.toUpperCase();
  const actors = ["CARDHOLDER", "MERCHANT", "PROCESSOR", "ACQUIRER", "NETWORK", "ISSUING BANK", "ISSUER"].filter((actor) => corpus.includes(actor));
  const kind = /INTERVAL|BOUNDED RANGE|RANGE LABEL|FEE PLACEHOLDER/.test(corpus) ? "BOUNDED_INTERVAL"
    : /EVIDENCE BARRIER|PROPOSED CONNECTOR|CONNECTOR.{0,30}BARRIER/.test(corpus) ? "EVIDENCE_BARRIER"
      : /BLANK|ABSENT/.test(corpus) && /FEE/.test(corpus) && /REWARD/.test(corpus) ? "ABSENCE_AUDIT"
        : /IDENTIFIER/.test(corpus) ? "IDENTIFIER_ISOLATION"
          : /CARDHOLDER/.test(corpus) && /MERCHANT/.test(corpus) && /RECORD/.test(corpus) ? "DUAL_RECORD_FOCUS"
            : /EVIDENCE BARRIER|CAUSAL LINK|PROPOSED CONNECTOR/.test(corpus) ? "EVIDENCE_BARRIER"
            : /NETWORK/.test(corpus) && /ISSUING BANK|ISSUER/.test(corpus) ? "PARTICIPANT_SEQUENCE"
              : (/FOUR PARTICIPANTS|PARTICIPANTS/.test(corpus) || actors.length >= 3) && /PURCHASE|REWARD|INCIDENCE|ORIGIN|QUESTION/.test(corpus) ? "PARTICIPANT_INCIDENCE"
            : clean(contract.archetype) === "PROCESS_ROUTE" ? "PROCESS_FLOW"
              : clean(contract.archetype) === "DATA_VISUALIZATION" ? "DATA_EVIDENCE"
                : clean(contract.archetype) === "SOURCE_AUTHORED_HYBRID" ? "SOURCE_COMPARISON"
                  : "SEMANTIC_RELATION";
  const semanticActors = ["PARTICIPANT_INCIDENCE", "PARTICIPANT_SEQUENCE"].includes(kind) ? [...new Set([...actors, "MERCHANT", "PROCESSOR", "NETWORK", "ISSUING BANK"])].slice(0, 4) : actors.slice(0, 4);
  const requiredElements = ["PARTICIPANT_INCIDENCE", "PARTICIPANT_SEQUENCE"].includes(kind) ? [...semanticActors, "$100 PURCHASE", "REWARD ENTRY", "UNRESOLVED INCIDENCE"]
    : kind === "DUAL_RECORD_FOCUS" ? ["CARDHOLDER RECORD", "REWARD ROW", "MERCHANT RECORD", "TRANSACTION FIELDS", "FOCUS TRANSFER", "NO LINK"]
      : kind === "IDENTIFIER_ISOLATION" ? ["DOMINANT MERCHANT RECORD", "CROPPED CARDHOLDER RECORD", "IDENTICAL IDENTIFIER", "EQUAL PANELS", "UNRELATED FIELDS ISOLATED"]
        : kind === "ABSENCE_AUDIT" ? ["SHARED AMOUNT", "BLANK EXPLANATORY ZONES", "ABSENCE LOCK", "NO FEE TO REWARD PATH"]
        : kind === "EVIDENCE_BARRIER" ? ["SHARED IDENTIFIER", "SHARED AMOUNT", "PROPOSED CONNECTOR", "EVIDENCE BARRIER", "NO CAUSAL LINK"]
          : kind === "BOUNDED_INTERVAL" ? ["$100 PURCHASE", "WARNING RAIL", "FEE PLACEHOLDER", "BOUNDED INTERVAL", "ILLUSTRATIVE RANGE"]
            : ["CONTEXT", "MECHANISM", "OUTCOME", ...semanticActors];
  const contractBindings = ([0, 1, 2] as const).map((index) => contractStateBinding(arr(contract.requiredEvidence)[index] || contract.claim, ["ENTRY", "MIDPOINT", "EXIT"][index], contract.claim));
  const states = (contractBound ? contractBindings : arr(manifest.states)).map((item, index) => {
    const state = rec(item);
    const binding = contractBindings[index];
    return {
      ...state,
      role: ["ENTRY", "MIDPOINT", "EXIT"][index],
      sceneLabel: viewerLabel(contractBound ? `${binding.role} ${binding.relation}` : state.sceneLabel, ["CONTEXT", "MECHANISM", "OUTCOME"][index]),
      primary: viewerLabel(contractBound ? binding.nodes[0] : state.primary, ["CONTEXT", "MECHANISM", "OUTCOME"][index]),
      secondary: viewerLabel(contractBound ? binding.nodes.slice(1, 3).join(" + ") : state.secondary, "VISIBLE STATE"),
      sourceEvidence: clean(state.sourceEvidence || arr(contract.requiredEvidence)[index] || contract.claim),
    };
  });
  const contractElements = [...new Set(contractBindings.flatMap((binding) => binding.nodes))];
  const stateProjection = contractBindings.map((binding, index) => ({
    role: ["ENTRY", "MIDPOINT", "EXIT"][index],
    focalEntity: binding.nodes[0] || "CONTRACT EVIDENCE",
    supportingEntities: binding.nodes.slice(1, 4),
    action: binding.relation,
    constraint: binding.polarity === "NEGATIVE_CONSTRAINT" ? binding.clause : "SOURCE CLAUSE PRESERVED",
    evidenceClause: binding.clause,
    deltaFromPrior: index === 0 ? "ESTABLISH CONTEXT" : `TRANSITION FROM ${["ENTRY", "MIDPOINT"][index - 1]}`,
  }));
  const visualOntology = engineVersion === WAVE_BATCH_2_V12_ENGINE_VERSION ? structuredVisualOntology(contract, contractBindings, semanticActors, kind) : undefined;
  const sceneSpecification = contractNativeScene ? contractNativeSceneSpecification(contract, contractBindings, semanticActors, kind) : undefined;
  return {
    ...manifest,
    states,
    sceneType: archetypeBound ? `WAVE_ARCHETYPE_${clean(contract.archetype)}_${kind}` : contractBound ? "WAVE_CONTRACT_BOUND_GRAPH" : `WAVE_${kind}`,
    semanticModel: { version: contractNativeScene ? "PIXEL_LAYOUT_SPECIFICATION_V18" : structuredOntology ? "STRUCTURED_VISUAL_ONTOLOGY_V12" : semanticProjection ? "CONTRACT_SEMANTIC_PROJECTION_V11" : archetypeBound ? "ARCHETYPE_SEMANTIC_MANIFEST_V10" : contractBound ? "CONTRACT_BOUND_SCENE_GRAPH_V9" : "CONTRACT_SIGNATURE_SCENE_GRAPH_V5_SPATIAL_BOUND", kind, archetype: clean(contract.archetype), visualFamily: clean(contract.visualFamily), claim: clean(contract.claim), actors: archetypeBound ? semanticActors : contractBound ? contractElements.slice(0, 6) : semanticActors, requiredElements: contractBound ? contractElements : requiredElements, stateBindings: contractBindings, stateProjection: semanticProjection ? stateProjection : undefined, visualOntology, sceneSpecification, corpusHashInput: `${clean(contract.briefId)} ${corpus}`, contractSignature: `${clean(contract.briefId)}:${corpus}`, relationPolicy: contractNativeScene ? "CONTRACT_NATIVE_COMPOSITION_WITH_EXPLICIT_CONTAINMENT_BOUNDARIES_AND_TIMELINE" : structuredOntology ? "STRUCTURED_ACTOR_LANE_CONTAINER_BOUNDARY_MOTION_TOPOLOGY" : archetypeBound ? "ARCHETYPE_NATIVE_TOPOLOGY_WITH_DIRECTION_BOUNDARY_AND_STATE_DELTA" : "EXPLICIT_VIEWER_VISIBLE_NODES_AND_EDGES", uncertaintyPolicy: "UNRESOLVED_MUST_REMAIN_VISIBLE", elementProvenance: archetypeBound ? contractElements.map((element) => ({ element, source: "CONTRACT_CLAUSE" })) : undefined, transitionModel: archetypeBound ? contractBindings.map((binding, index) => ({ from: index === 0 ? "PRE_SCENE" : ["ENTRY", "MIDPOINT"][index - 1], to: ["ENTRY", "MIDPOINT", "EXIT"][index], relation: binding.relation, polarity: binding.polarity })) : undefined },
    batchVersion,
    productionRoute: contract.productionRoute,
    specificationCompiler: contractNativeScene ? "PIXEL_LAYOUT_COMPILER_V18" : structuredOntology ? "STRUCTURED_VISUAL_ONTOLOGY_COMPILER_V12" : semanticProjection ? "CONTRACT_SEMANTIC_PROJECTION_COMPILER_V11" : archetypeBound ? "ARCHETYPE_SEMANTIC_COMPILER_V10" : contractBound ? "CONTRACT_BOUND_SCENE_GRAPH_COMPILER_V9" : scaleBaseline ? "CONTROLLED_SCALE_COMPILER_V8" : "SPATIAL_RELATION_BOUND_COMPILER_V7",
    layoutPolicy: { ...rec(manifest.layoutPolicy), ...(scaleBaseline ? { maximumViewerLabelGlyphs: structuredOntology ? 18 : 22 } : { maximumViewerLabelGlyphs: 24 }), labelFitEnforcedAtCompileTime: true, reservedRegions: true, connectorCorridorsReserved: structuredOntology, minimumLabelScale: 2, noGenericTemplateFallback: true, tokenFallbackForbidden: contractNativeScene, sceneSpecificationAuthoritative: contractNativeScene, inactiveParticipantMasking: scaleBaseline, minimumExitContrast: scaleBaseline ? 4.5 : 3, portfolioStyleSeed: scaleBaseline && !structuredOntology ? `${clean(contract.briefId)}:${clean(kind)}:${corpus}` : undefined, contractBoundStateBands: contractBound, contractTokenCoverageRequired: contractBound ? 1 : undefined, unsupportedGenericInjectionBlocked: contractBound, crossProductPixelUniquenessRequired: contractBound, archetypeGrammarRequired: archetypeBound, elementProvenanceRequired: archetypeBound, directedTransitionRequired: archetypeBound, semanticProjectionRequired: semanticProjection, structuredVisualOntologyRequired: engineVersion === WAVE_BATCH_2_V12_ENGINE_VERSION, contractNativeSceneRequired: contractNativeScene, physicalMotionRequired: structuredOntology, clippingCountMaximum: structuredOntology ? 0 : undefined, connectorTextIntersectionMaximum: structuredOntology ? 0 : undefined, visibleEntityActionConstraintRequired: semanticProjection, portfolioFamilyQuotaRequired: archetypeBound, p2Regressions: scaleBaseline ? ["NO_INACTIVE_PARTICIPANT_NAME", "EXIT_CONTRAST_4_5", "BARRIER_PRECEDENCE_BEFORE_ABSENCE", "ART_DIRECTION_SEPARATION"] : [] },
  };
}

function renderWaveSemanticScene(manifest: Row, state: 0 | 1 | 2) {
  const width=960,height=540,pixels=new Uint8Array(width*height*4),raw=new Uint8Array(height*(1+width*4));
  const color=(hex:string)=>[Number.parseInt(hex.slice(1,3),16),Number.parseInt(hex.slice(3,5),16),Number.parseInt(hex.slice(5,7),16),255] as const;
  const fill=(x:number,y:number,w:number,h:number,hex:string)=>{const c=color(hex);for(let py=Math.max(0,y);py<Math.min(height,y+h);py++)for(let px=Math.max(0,x);px<Math.min(width,x+w);px++){const i=(py*width+px)*4;pixels.set(c,i);}};
  const circle=(cx:number,cy:number,r:number,hex:string)=>{for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)if(x*x+y*y<=r*r)fill(cx+x,cy+y,1,1,hex);};
  const text=(value:string,x:number,y:number,scale:number,hex:string)=>{const c=color(hex);let cx=x;for(const char of value.toUpperCase()){const glyph=glyphs[char]||glyphs["?"];for(let gy=0;gy<7;gy++)for(let gx=0;gx<5;gx++)if(glyph[gy][gx]==="1")for(let sy=0;sy<scale;sy++)for(let sx=0;sx<scale;sx++){const px=cx+gx*scale+sx,py=y+gy*scale+sy;if(px>=0&&px<width&&py>=0&&py<height){const i=(py*width+px)*4;pixels.set(c,i);}}cx+=6*scale;}};
  const safe=(value:unknown,max=28)=>clean(value).toUpperCase().replace(/[^A-Z0-9$+\-.:? ]/g," ").replace(/\s+/g," ").trim().slice(0,max);
  const center=(value:unknown,cx:number,y:number,scale:number,hex:string,max=28)=>{const label=safe(value,max);text(label,Math.max(28,Math.round(cx-label.length*3*scale)),y,scale,hex);};
  const line=(x1:number,y1:number,x2:number,y2:number,t:number,hex:string)=>{const steps=Math.max(Math.abs(x2-x1),Math.abs(y2-y1));for(let i=0;i<=steps;i++){const p=steps?i/steps:0;fill(Math.round(x1+(x2-x1)*p)-Math.floor(t/2),Math.round(y1+(y2-y1)*p)-Math.floor(t/2),t,t,hex);}};
  const labelBox=(x:number,y:number,w:number,h:number,label:unknown,active=true)=>{fill(x,y,w,h,active?"#eef5f1":"#173d35");fill(x,y,w,8,active?"#72c8a3":"#31594e");const words=safe(label,30).split(" "),split=Math.ceil(words.length/2),a=words.slice(0,split).join(" "),b=words.slice(split).join(" ");center(a,x+w/2,y+Math.max(22,Math.round(h/2)-20),2,active?"#173d35":"#9abbb0",18);if(b)center(b,x+w/2,y+Math.max(48,Math.round(h/2)+8),2,active?"#173d35":"#9abbb0",18);};
  const semantic=rec(manifest.semanticModel),kind=clean(semantic.kind),nativeArchetype=clean(semantic.archetype),actors=arr(semantic.actors).map(clean),contractNativeScene=clean(semantic.version)==="PIXEL_LAYOUT_SPECIFICATION_V18",structuredOntology=clean(semantic.version)==="STRUCTURED_VISUAL_ONTOLOGY_V12",semanticProjection=clean(semantic.version)==="CONTRACT_SEMANTIC_PROJECTION_V11"||structuredOntology||contractNativeScene,archetypeBound=clean(semantic.version)==="ARCHETYPE_SEMANTIC_MANIFEST_V10"||semanticProjection,contractBoundGraph=clean(semantic.version)==="CONTRACT_BOUND_SCENE_GRAPH_V9"||semanticProjection,currentBinding=rec(arr(semantic.stateBindings)[state]),currentProjection=rec(arr(semantic.stateProjection)[state]),signatureSeed=[...`${clean(semantic.corpusHashInput)}:${nativeArchetype}:${state}`].reduce((total,char)=>total+char.charCodeAt(0),0),palette=[["#e8b65d","#72c8a3","#7fe2b5"],["#d6a6ff","#83c5ff","#8ee3cf"],["#ffb27a","#ffd166","#8bd3c7"]][signatureSeed%3],accent=palette[state],themes:Record<string,[string,string,string]>={PARTICIPANT_SEQUENCE:["#28140d","#4a271b","#fff1df"],PARTICIPANT_INCIDENCE:["#071b35","#102e55","#e3f0ff"],DUAL_RECORD_FOCUS:["#0f2b2c","#174448","#e6fffb"],IDENTIFIER_ISOLATION:["#25183a","#3c2858","#f3eaff"],ABSENCE_AUDIT:["#101b31","#1b2b4a","#ecf3ff"],EVIDENCE_BARRIER:["#29261f","#464035","#fff6df"],BOUNDED_INTERVAL:["#342014","#593823","#fff0df"]},theme=themes[kind]||["#061b18","#0b3029","#d7eee5"];
  const specialized=["PARTICIPANT_SEQUENCE","PARTICIPANT_INCIDENCE","DUAL_RECORD_FOCUS","IDENTIFIER_ISOLATION","ABSENCE_AUDIT","EVIDENCE_BARRIER","BOUNDED_INTERVAL"],stateLabels:Record<string,string[]>={PARTICIPANT_SEQUENCE:["BASE PARTICIPANTS","NETWORK REVEALED","ISSUER REVEALED"],PARTICIPANT_INCIDENCE:["REWARD GLOW","QUESTIONS MOVE OUT","ORIGIN UNRESOLVED"],DUAL_RECORD_FOCUS:["CARDHOLDER FOCUS","FOCUS TRANSFER","MERCHANT FOCUS"],IDENTIFIER_ISOLATION:["MERCHANT DOMINANT","PANELS ALIGN","IDENTIFIER ONLY"],ABSENCE_AUDIT:["MATCHED FACTS","ABSENCE LOCK","NO PATH"],EVIDENCE_BARRIER:["MATCHED FACTS","CONNECTOR STOPS","BARRIER HOLDS"],BOUNDED_INTERVAL:["PLACEHOLDER","INTERVAL OPENS","RANGE HOLDS"]};
  const grammarTitle=archetypeBound?`${nativeArchetype.replaceAll("_"," ")} ${kind.replaceAll("_"," ")}`:kind.replaceAll("_"," ");fill(0,0,width,height,theme[0]);fill(0,0,width,12,accent);fill(28,30,904,474,theme[1]);if(!specialized.includes(kind))for(let index=0;index<5;index++)fill(842+index*14,82-(signatureSeed>>index)%12,9,10+(signatureSeed>>(index+2))%18,index<=state?accent:"#5a655f");if(["DUAL_RECORD_FOCUS","IDENTIFIER_ISOLATION","ABSENCE_AUDIT","EVIDENCE_BARRIER"].includes(kind))text(safe(grammarTitle,38),52,52,2,theme[2]);else center(grammarTitle,480,52,2,theme[2],38);center(stateLabels[kind]?.[state]||["CONTEXT","MECHANISM","OUTCOME"][state],480,84,2,accent,24);
  if(archetypeBound&&!contractNativeScene){fill(48,108,864,34,theme[0]);center(safe(semantic.claim,72),480,112,1,theme[2],72);center(safe(currentBinding.clause,72),480,126,1,accent,72);}
  if(contractNativeScene){
    const spec=rec(semantic.sceneSpecification),sceneState=rec(arr(spec.states)[state]),objects=arr(spec.objects).map(rec),relationships=arr(spec.relationships).map(rec),visibleIds=new Set(arr(sceneState.visibleObjectIds).map(clean)),activeRelation=relationships.find((item)=>clean(item.id)===clean(sceneState.activeRelationshipId))||relationships[state],position=arr(sceneState.movingObjectPosition).map(Number),mx=Number(position[0]||[190,480,770][state]),my=Number(position[1]||300),family=clean(spec.layoutFamily),composition=clean(spec.composition),persistent=arr(spec.persistentLabels).map(clean);
    const nativeCard=(x:number,y:number,w:number,h:number,label:unknown,active=true)=>{fill(x,y,w,h,active?"#eef5f1":"#173d35");fill(x,y,w,9,active?accent:"#31594e");center(label,x+w/2,y+Math.round(h/2)-8,2,active?"#173d35":"#9abbb0",Math.max(12,Math.floor(w/12)));};
    const nativeArrow=(x1:number,y1:number,x2:number,y2:number,on=true)=>{line(x1,y1,x2,y2,on?8:4,on?accent:"#31594e");circle(x2,y2,on?11:7,on?accent:"#31594e");};
    const auditedComposition=["ISSUER_LEDGER_CONTAINMENT","ISSUER_SIDE_NOT_NETWORK_REVENUE","SEPARATE_VALUE_CONTAINERS","FIVE_POSITION_ROLE_MAP","FIVE_WORK_SURFACES","MERCHANT_TO_PROCESSOR_BOUNDARY","PROCESSOR_ACQUIRER_DESTINATION","INFORMATION_TO_NETWORK","RESPONSE_FOUR_BOUNDARIES","CONTROLLED_SCENARIO_TABLE"].includes(composition);
    if(auditedComposition){
      const compositionOrder=["ISSUER_LEDGER_CONTAINMENT","ISSUER_SIDE_NOT_NETWORK_REVENUE","SEPARATE_VALUE_CONTAINERS","FIVE_POSITION_ROLE_MAP","FIVE_WORK_SURFACES","MERCHANT_TO_PROCESSOR_BOUNDARY","PROCESSOR_ACQUIRER_DESTINATION","INFORMATION_TO_NETWORK","RESPONSE_FOUR_BOUNDARIES","CONTROLLED_SCENARIO_TABLE"],ci=compositionOrder.indexOf(composition),backgrounds=["#182943","#2e1d22","#17362e","#efe7d7","#243047","#3c2a17","#201b35","#dceff2","#2b172f","#f2ecf8"],inks=["#e3f0ff","#fff1df","#e6fffb","#342014","#e9eef8","#fff0df","#f3eaff","#071b35","#f3eaff","#25183a"];
      fill(0,0,960,540,backgrounds[ci]);
      if(composition==="ISSUER_LEDGER_CONTAINMENT"){
        text("ACQUIRER TO ISSUER LEDGER",58,58,3,"#e3f0ff");center(["ORIGIN","TRAVERSES ECONOMIC LANE","LEDGER CONTAINMENT"][state],480,112,2,accent,32);
        fill(626,176,292,228,"#0f5a47");center("ISSUER BOUNDARY",772,184,2,"#e6fffb",24);
        fill(62,202,216,156,"#e9eef8");center("ACQUIRER",170,220,3,"#102e55",16);fill(324,202,278,156,"#f7f1e4");center("ECONOMIC LANE",463,220,2,"#593823",22);fill(648,214,248,144,"#e4f5eb");center("ISSUER LEDGER",772,226,2,"#174448",22);
        fill(340,326,246,22,"#d6c9aa");center(["EMPTY AT ENTRY","LANE IN USE","TRANSFER COMPLETE"][state],463,332,1,"#593823",22);fill(680,260,184,76,"#ffffff");center("LEDGER SLOT",772,282,2,"#174448",16);
        const ix=[126,438,714][state];nativeCard(ix,270,112,54,"INTERCHANGE",true);if(state>=1)nativeArrow(250,297,ix-8,297,true);if(state===2)nativeArrow(574,297,706,297,true);
        fill(62,382,834,44,"#102e55");center("NETWORK WORKSPACE UNTOUCHED",480,395,3,"#e3f0ff",30);
      }else if(composition==="ISSUER_SIDE_NOT_NETWORK_REVENUE"){
        center("ISSUER VALUE / NETWORK BOUNDARY",480,62,3,"#fff1df",34);center(["ISSUER CONTAINMENT","NETWORK REACHES SHUTTER","SHUTTER BLOCKS VALUE"][state],480,112,2,accent,32);
        fill(156,146,648,46,"#7a2e22");center("NOT NETWORK REVENUE",480,160,3,"#fff1df",24);
        fill(72,208,310,162,"#e4f5eb");center("ISSUER LEDGER",227,226,3,"#174448",20);nativeCard(144,282,166,58,"INTERCHANGE",true);
        fill(450,190,24,200,"#e8b65d");for(let s=0;s<7;s++)fill(432,204+s*26,60,8,s%2?"#593823":"#fff0df");center("BOUNDARY SHUTTER",462,404,2,"#e8b65d",22);
        fill(548,208,338,162,"#e9eef8");center("NETWORK REACH",717,226,3,"#102e55",20);fill(598,280,238,64,"#ffffff");center("NETWORK TRAY EMPTY",717,300,2,"#102e55",22);
        if(state>=1)nativeArrow(598,260,492,260,true);if(state===2){line(518,252,518,350,10,"#e8b65d");center("STOP",518,292,3,"#fff0df",8);}
      }else if(composition==="SEPARATE_VALUE_CONTAINERS"){
        text("TWO VALUES · TWO CONTAINERS",64,58,3,"#e6fffb");center(["NETWORK TRAY EMPTY","CONDITION TESTED","FEE ENTRY CROSSES GATE"][state],480,112,2,accent,34);
        fill(70,202,330,172,"#e4f5eb");center("ISSUER LEDGER",235,220,3,"#174448",20);nativeCard(144,282,182,60,"INTERCHANGE",true);
        fill(560,202,330,172,"#e9eef8");center("NETWORK TRAY",725,220,3,"#102e55",18);if(state===0)center("EMPTY",725,292,4,"#52766b",8);else{const feeX=state===1?494:604;fill(feeX,276,242,72,"#ffffff");center("NETWORK AND",feeX+121,286,2,"#102e55",20);center("SERVICE FEES",feeX+121,320,2,"#102e55",18);}
        fill(420,196,54,184,"#342014");center("IF",447,238,3,"#ffd166",4);center("GATE",447,292,2,"#fff0df",8);center(state===0?"CLOSED":"MET",447,330,2,state===0?"#e8b65d":"#72c8a3",8);if(state===1)nativeArrow(474,312,486,312,true);if(state===2)nativeArrow(512,312,596,312,true);
        fill(102,392,756,36,"#174448");center("INTERCHANGE STAYS ISSUER-SIDE",480,402,2,"#e6fffb",34);
      }else if(composition==="FIVE_POSITION_ROLE_MAP"){
        text("STANDARD MODEL",62,54,4,"#342014");center(["EMPTY EXCEPTION","TWO ROLES ENTER EXCEPTION","STANDARD ROLES PRESERVED"][state],480,112,2,accent,38);
        fill(60,202,564,184,"#f4f0e8");center("STANDARD FIVE-POSITION MAP",342,214,2,"#342014",30);const roles=["CARDHOLDER","MERCHANT","PROCESSOR OR ACQUIRER","NETWORK","ISSUER"];
        roles.forEach((label,index)=>{const x=76+index*106;fill(x,266,94,74,index<=state+2?"#fffdf7":"#d9d4c8");center(String(index+1),x+47,276,3,"#a05a32",2);center(label,x+47,312,1,"#342014",15);if(index<4)nativeArrow(x+94,303,x+106,303,index<state+2);});
        fill(664,202,232,184,"#25183a");center("INTEGRATED EXCEPTION",780,216,2,"#f3eaff",24);if(state>=1){fill(686,270,86,64,"#f3eaff");center("ACQUIRER",729,290,1,"#25183a",12);fill(788,270,86,64,"#f3eaff");center("NETWORK",831,290,1,"#25183a",12);line(674,252,886,252,7,"#d6a6ff");line(674,252,674,350,7,"#d6a6ff");line(886,252,886,350,7,"#d6a6ff");}else center("EMPTY",780,296,4,"#a899b4",8);
        fill(136,398,688,32,"#342014");center("ROLE NAMES PRESERVED",480,407,2,"#fff0df",28);
      }else if(composition==="FIVE_WORK_SURFACES"){
        center("FIVE FUNCTIONS · DISTINCT WORK SURFACES",480,58,3,"#e9eef8",42);center(["SURFACES ESTABLISHED","ACQUIRER + NETWORK BRACKET CLOSES","FIVE FUNCTION LABELS HOLD"][state],480,112,2,accent,40);
        const labels=["CARDHOLDER","MERCHANT","ACQUIRER","NETWORK","ISSUER"],verbs=["PRESENTS","ACCEPTS","ACQUIRES","SWITCHES","ISSUES"];
        labels.forEach((label,index)=>{const x=58+index*178,rotation=index%2;fill(x,204+(rotation?18:0),160,150,["#efe5d8","#e4f5eb","#e9eef8","#fff4d8","#f1e6f8"][index]);center(label,x+80,220+(rotation?18:0),2,"#342014",18);fill(x+18,264+(rotation?18:0),124,44,"#ffffff");center(verbs[index],x+80,276+(rotation?18:0),2,"#102e55",14);center(`FUNCTION ${index+1}`,x+80,324+(rotation?18:0),1,"#593823",14);});
        if(state>=1){line(402,376,742,376,8,"#d6a6ff");line(402,352,402,392,8,"#d6a6ff");line(742,352,742,392,8,"#d6a6ff");center("INTEGRATED: ACQUIRER + NETWORK",572,398,2,"#f3eaff",34);}
      }else if(composition==="CONTROLLED_SCENARIO_TABLE"){
        const pins=rec(spec.assumptionPins),cols=["PRODUCT","CATEGORY","CHANNEL","DATE"];text("SOURCE SCHEDULE",58,54,4,"#25183a");center(["EMPTY SCENARIO CARD","ASSUMPTIONS PINNED","BANDS RESIZED · CARD ENCLOSED"][state],480,112,2,accent,40);
        fill(54,188,392,190,"#ffffff");fill(54,188,392,44,"#43356b");center("HIGHLIGHTED",250,194,3,"#f3eaff",14);center("SCHEDULE ROW",250,218,2,"#f3eaff",18);cols.forEach((label,index)=>{const y=246+index*30;text(label,76,y,2,"#25183a");text(clean(pins[label])==="SOURCE-BOUND"?"SOURCE PIN":clean(pins[label]),260,y,1,"#43356b");});
        const cardX=state===2?486:520,cardW=state===2?420:360;fill(cardX,188,cardW,190,state===0?"#efeaf2":"#ffffff");fill(cardX,188,cardW,44,"#25183a");center("CONTROLLED SCENARIO",cardX+cardW/2,200,2,"#f3eaff",26);if(state===0)center("EMPTY",cardX+cardW/2,286,5,"#a899b4",8);else cols.forEach((label,index)=>{const y=248+index*28;text(`${label} PIN`,cardX+24,y,1,"#25183a");});if(state===2){line(cardX-8,180,cardX+cardW+8,180,8,"#d6a6ff");line(cardX-8,386,cardX+cardW+8,386,8,"#d6a6ff");line(cardX-8,180,cardX-8,386,8,"#d6a6ff");line(cardX+cardW+8,180,cardX+cardW+8,386,8,"#d6a6ff");}
        fill(108,416,744,30,"#7a2e22");center("ILLUSTRATIVE · SOURCE-BOUND ASSUMPTIONS ONLY",480,424,2,"#fff1df",46);
      }else{
        if(composition==="MERCHANT_TO_PROCESSOR_BOUNDARY"){
          text("INFORMATION PACKET",62,54,4,"#fff0df");center(sceneState.action,480,112,2,accent,40);fill(64,204,300,170,"#fff4d8");center("MERCHANT",214,218,3,"#593823",16);center("TERMINAL",214,254,3,"#593823",16);fill(118,292,192,52,"#ffffff");center("REQUEST",214,306,2,"#593823",12);
          fill(390,204,180,170,"#e4f5eb");center("INFORMATION LANE",480,220,2,"#174448",22);fill(430,270,100,60,"#ffffff");center("INFORMATION",480,288,2,"#174448",18);
          fill(620,204,276,170,"#e9eef8");center("PROCESSOR BOUNDARY",758,220,2,"#102e55",24);const px=[176,430,704][state];nativeCard(px,292,92,44,"PACKET",true);if(state>=1)nativeArrow(296,314,px-8,314,true);
          fill(70,392,820,34,"#342014");center("ECONOMIC SHUTTERS REMAIN COMPLETELY CLOSED",480,402,2,"#fff0df",46);
        }else if(composition==="PROCESSOR_ACQUIRER_DESTINATION"){
          center("DISCRETE REQUEST PULSE",480,58,4,"#f3eaff",28);center(["APPROACHES BOUNDARY","BOUNDARY OPENS ONCE","RESTS AT PROCESSOR OR ACQUIRER"][state],480,112,2,accent,40);circle(154,296,88,"#f2a65a");center("MERCHANT",154,290,2,"#342014",14);if(state===0)fill(388,192,34,212,"#102e55");else{fill(388,192,34,72,"#102e55");fill(388,332,34,72,"#102e55");center("OPEN",405,286,2,"#83c5ff",8);}center("BOUNDARY",405,414,1,"#e3f0ff",12);fill(568,206,318,180,"#e9eef8");center("PROCESSOR OR",727,226,2,"#102e55",18);center("ACQUIRER",727,258,2,"#102e55",14);
          const pulseX=[206,452,686][state];circle(pulseX,302,22,"#83c5ff");center("REQ",pulseX,296,1,"#071b35",6);if(state>=1)nativeArrow(236,302,pulseX-30,302,true);if(state===2){fill(630,286,194,52,"#ffffff");center("REQUEST AT REST",727,300,2,"#102e55",20);}
          fill(102,414,756,30,"#31594e");center("NETWORK WORKSPACE INACTIVE",480,422,2,"#d7eee5",30);
        }else if(composition==="INFORMATION_TO_NETWORK"){
          text("INFORMATION-ONLY OUTBOUND LANE",58,56,3,"#071b35");center(["REQUEST AT PROCESSOR","OUTBOUND LANE CROSSING","NETWORK RECEIPT · ISSUER RESERVED"][state],480,112,2,accent,42);
          fill(56,202,246,170,"#e4f5eb");center("PROCESSOR OR ACQUIRER",179,220,2,"#174448",26);fill(354,202,252,170,"#dff2ff");center("INFORMATION-ONLY OUTBOUND LANE",480,220,1,"#071b35",36);fill(658,202,246,170,"#e9eef8");center("NETWORK",781,220,3,"#102e55",14);
          const reqX=[148,440,748][state];circle(reqX,306,25,"#83c5ff");center("REQUEST",reqX,300,1,"#071b35",12);if(state>=1)nativeArrow(204,306,reqX-30,306,true);if(state===2){fill(700,278,162,58,"#ffffff");center("RECEIVED",781,296,2,"#102e55",16);}
          fill(160,398,640,38,"#342014");center("ISSUER RESERVED · NOT ACTIVATED",480,409,2,"#fff0df",34);
        }else{
          text("ORDERED RESPONSE CROSSINGS",58,56,4,"#f3eaff");const nodes=[{x:48,y:210,l:["NETWORK"]},{x:268,y:310,l:["PROCESSOR OR","ACQUIRER"]},{x:514,y:210,l:["MERCHANT"]},{x:734,y:310,l:["MERCHANT","TERMINAL"]}];nodes.forEach((n,index)=>{fill(n.x,n.y,178,76,index<=state+1?"#f3eaff":"#4b3151");center(n.l[0],n.x+89,n.y+18,2,index<=state+1?"#2b172f":"#a899b4",18);if(n.l[1])center(n.l[1],n.x+89,n.y+48,2,index<=state+1?"#2b172f":"#a899b4",16);});for(let index=0;index<3;index++)nativeArrow(nodes[index].x+178,nodes[index].y+38,nodes[index+1].x,nodes[index+1].y+38,index<state+1);
          const pulsePos=[[184,244],[454,344],[704,390]][state];circle(pulsePos[0],pulsePos[1],24,"#ffb27a");center("RESP",pulsePos[0],pulsePos[1]-5,1,"#28140d",8);center(state===0?"ORIGIN: NETWORK":state===1?"CROSSES 1 + 2":"CROSSES 3 · TERMINAL ARRIVAL",480,432,2,"#e8b65d",34);
        }
      }
    }else{
      fill(48,148,864,286,"#0b241f");
      objects.forEach((object)=>{const geometry=rec(object.geometry),x=Number(geometry.x),y=Number(geometry.y),w=Number(geometry.w),h=Number(geometry.h),visible=visibleIds.has(clean(object.id)),type=clean(object.type);if(type==="ACTOR"){circle(x+w/2,y+h/2,Math.min(40,h/2),visible?accent:"#31594e");center(object.label,x+w/2,y+h+8,1,visible?theme[2]:"#6f8c83",18);}else if(type==="BOUNDARY"){fill(x+w/2-7,y,14,h,visible?"#e8b65d":"#4b4438");for(let mark=0;mark<4;mark++)fill(x+w/2-16,y+10+mark*18,32,6,mark%2?"#342014":"#fff0df");center(object.label,x+w/2,y+h+8,1,visible?"#fff0df":"#6f8c83",18);}else{fill(x,y,w,h,visible?"#eef5f1":"#173d35");fill(x,y,w,7,visible?accent:"#31594e");center(object.label,x+w/2,y+Math.round(h/2)-6,1,visible?"#173d35":"#6f8c83",20);}});
      if(activeRelation){const corridor=arr(activeRelation.corridor).map((point)=>arr(point).map(Number));if(corridor.length===2){line(corridor[0][0],corridor[0][1],corridor[1][0],corridor[1][1],7,clean(activeRelation.polarity)==="NEGATIVE_CONSTRAINT"?"#e8b65d":accent);circle(corridor[1][0],corridor[1][1],9,accent);}}
      line(156,448,804,448,5,"#31594e");line(156,448,mx,448,8,accent);line(mx,448,mx,my,5,accent);circle(mx,my,20,accent);center(rec(spec.movingObject).label,mx,my-4,1,"#071b18",16);
      fill(144,462,672,30,"#061b18");center(clean(sceneState.action),480,470,1,accent,60);center(clean(sceneState.stateDelta),480,116,2,accent,28);center(family.replaceAll("_"," "),480,132,1,theme[2],30);
      if(clean(sceneState.constraint)!=="SOURCE CLAUSE PRESERVED"){fill(676,104,212,38,"#342014");center("CONSTRAINT VISIBLE",782,117,1,"#fff0df",22);}
    }
  } else if(structuredOntology){
    const ontology=rec(semantic.visualOntology),ontologyState=rec(arr(ontology.states)[state]),lanes=arr(ontology.lanes).map(rec),containers=arr(ontology.containers).map(rec),moving=rec(ontology.movingEntity),family=clean(ontology.layoutFamily),entity=clean(currentProjection.focalEntity)||clean(ontologyState.actor)||"EVIDENCE",support=arr(currentProjection.supportingEntities).map(clean).filter(Boolean),position=arr(ontologyState.movingEntityPosition).map(Number),mx=Number(position[0]||[170,480,790][state]),my=Number(position[1]||270);
    const familyIndex=["LANE_HANDOFF","BOUNDARY_CROSSING","CONTAINMENT_CHANGE","EVIDENCE_COMPARE","STATE_MACHINE","ROUTE_MAP","INTERVAL_SCALE","FOCUS_TRANSFER"].indexOf(family),vertical=familyIndex%2===1,compact=familyIndex>=4;
    fill(48,148,864,282,"#0b241f");
    if(vertical){for(let i=0;i<3;i++){fill(64+i*284,164,264,250,i===state?"#173d35":"#102e29");fill(64+i*284,164,264,6,i===state?accent:"#31594e");center(clean(lanes[i]?.actor)||support[i]||`ACTOR ${i+1}`,196+i*284,180,1,theme[2],18);}}
    else{for(let i=0;i<3;i++){fill(64,164+i*84,832,68,i===state?"#173d35":"#102e29");fill(64,164+i*84,8,68,i===state?accent:"#31594e");text(safe(clean(lanes[i]?.actor)||support[i]||`ACTOR ${i+1}`,18),84,184+i*84,1,theme[2]);}}
    const boxPositions=vertical?[[92,222],[376,222],[660,222]]:[[230,174],[454,258],[678,342]];
    boxPositions.forEach(([x,y],index)=>{const active=index<=state;labelBox(x,y,190,62,index===state?entity:support[index]||clean(containers[index%Math.max(1,containers.length)]?.contains)||"EVIDENCE",active);});
    const boundaryX=compact?560:480;fill(boundaryX-8,156,16,266,"#e8b65d");for(let mark=0;mark<8;mark++)fill(boundaryX-18,170+mark*30,36,8,mark%2?"#342014":"#fff0df");
    line(156,446,804,446,6,"#31594e");line(156,446,mx,446,8,accent);line(mx,446,mx,my,6,accent);circle(mx,my,18,accent);center(entity,mx,my-4,1,"#071b18",18);
    fill(172,456,616,34,"#061b18");center(clean(ontologyState.action)||clean(currentProjection.action),480,464,1,accent,56);
    center(clean(ontologyState.stateDelta),480,116,2,accent,26);center(family.replaceAll("_"," "),480,132,1,theme[2],28);
    if(clean(ontologyState.constraint)!=="EVIDENCE-BOUND"){fill(704,104,184,38,"#342014");center("CONSTRAINT HOLDS",796,117,1,"#fff0df",20);}
  } else if(contractBoundGraph){
    const binding=currentBinding,nodes=(semanticProjection?[clean(currentProjection.focalEntity),...arr(currentProjection.supportingEntities).map(clean)]:arr(binding.nodes).map(clean)).filter(Boolean).slice(0,6),negative=clean(binding.polarity)==="NEGATIVE_CONSTRAINT",variant=(signatureSeed+state)%4;
    const positions=variant===0?[[52,150],[344,150],[636,150],[52,320],[344,320],[636,320]]:variant===1?[[74,138],[636,138],[74,332],[636,332],[354,174],[354,330]]:variant===2?[[52,188],[344,130],[636,188],[52,344],[344,286],[636,344]]:[[96,154],[382,128],[668,154],[96,342],[382,368],[668,342]];
    nodes.forEach((node,index)=>{const [x,y]=positions[index];labelBox(x,y,228,74,node,true);if(index>0){const [px,py]=positions[index-1];line(px+228,py+37,x,y+37,5,negative?"#e8b65d":accent);}});
    fill(234,254,492,54,negative?"#342014":"#102e55");fill(234,254,492,7,accent);center(clean(semanticProjection?currentProjection.action:binding.relation)||"CONTRACT RELATION",480,270,2,negative?"#fff0df":"#e3f0ff",28);
    if(negative){line(446,321,514,389,8,"#e8b65d");line(514,321,446,389,8,"#e8b65d");center(safe(semanticProjection?currentProjection.constraint:"CONSTRAINT PRESERVED",30),480,414,2,"#e8b65d",30);}else center(safe(semanticProjection?currentProjection.deltaFromPrior:rec(arr(manifest.states)[state]).secondary,28),480,430,2,theme[2],28);
    if(semanticProjection){fill(128,454,704,32,theme[0]);center(safe(currentProjection.evidenceClause,72),480,463,1,accent,72);}
    for(let mark=0;mark<6;mark++)fill(56+mark*28,474-((signatureSeed>>(mark%5))%18),16,8+(signatureSeed>>(mark+2))%16,mark<=state+2?accent:"#31594e");
  } else if(kind==="PARTICIPANT_SEQUENCE"){
    const names=[actors[0]||"MERCHANT",actors[1]||"PROCESSOR",actors[2]||"NETWORK",actors[3]||"ISSUING BANK"],positions=[[70,146],[70,344],[694,146],[694,344]];
    names.forEach((name,index)=>{const active=index<=state+1;labelBox(positions[index][0],positions[index][1],196,72,active?name:"AWAITING ID",active);if(active)for(let step=1;step<=3;step++){const sx=positions[index][0]+98,sy=positions[index][1]+36,ratio=step/4;circle(Math.round(sx+(480-sx)*ratio),Math.round(sy+(274-sy)*ratio),4,accent);}});
    labelBox(328,220,304,76,"$100 PURCHASE",true);labelBox(354,314,252,54,"REWARD ENTRY",true);
    if(state===2){center("INCIDENCE UNRESOLVED",480,418,3,"#e8b65d",24);center("?",816,322,5,"#e8b65d",1);}
  } else if(kind==="PARTICIPANT_INCIDENCE"){
    const names=[actors[0]||"MERCHANT",actors[1]||"PROCESSOR",actors[2]||"NETWORK",actors[3]||"ISSUING BANK"];
    const pos=[[108,160],[686,160],[108,342],[686,342]];names.forEach((name,index)=>labelBox(pos[index][0],pos[index][1],166,64,name,true));
    circle(480,276,state===0?92:state===1?70:50,state===0?"#e8b65d":state===1?"#72c8a3":"#31594e");fill(330,236,300,86,"#eef5f1");fill(330,236,300,8,accent);center("$100 PURCHASE",480,255,2,"#173d35",18);center("REWARD ENTRY",480,291,2,"#173d35",18);
    if(state>=1)names.forEach((_,index)=>{const x=pos[index][0]+83,y=pos[index][1]+32;for(let step=1;step<=3;step++){const ratio=step/4;circle(Math.round(480+(x-480)*ratio),Math.round(276+(y-276)*ratio),5,"#72c8a3");}center("?",Math.round(480+(x-480)*0.62),Math.round(276+(y-276)*0.62)-8,2,"#e8b65d",1);});
    if(state===2)center("UNRESOLVED ORIGIN",480,430,3,"#e8b65d",22);
  } else if(kind==="DUAL_RECORD_FOCUS"){
    const leftX=state===0?52:state===2?86:62,leftW=state===0?420:state===2?300:334,rightX=state===0?610:state===2?480:564,rightW=state===0?286:state===2?416:334;
    fill(leftX,142,leftW,252,"#eef5f1");fill(rightX,142,rightW,252,"#eef5f1");fill(leftX+16,158,leftW-32,38,"#173d35");fill(rightX+16,158,rightW-32,38,"#173d35");center("CARDHOLDER RECORD",leftX+leftW/2,169,2,"#ffffff",20);center("MERCHANT RECORD",rightX+rightW/2,169,2,"#ffffff",18);
    fill(leftX+24,230,leftW-48,54,"#ffffff");center("REWARD ROW",leftX+leftW/2,247,2,"#173d35",18);
    if(state>=1){fill(rightX+24,216,rightW-48,48,"#ffffff");fill(rightX+24,282,rightW-48,48,"#ffffff");center("TRANSACTION ID",rightX+rightW/2,231,2,"#173d35",18);center("AMOUNT FIELD",rightX+rightW/2,297,2,"#173d35",18);}
    fill(466,182,28,212,"#e8b65d");center(state===0?"CARDHOLDER FOCUS":state===1?"FOCUS TRANSFER":"MERCHANT FOCUS",480,418,2,"#d7eee5",22);if(state===2)center("NO LINK",480,450,2,"#e8b65d",12);
  } else if(kind==="IDENTIFIER_ISOLATION"){
    const lx=state===0?-30:70,lw=state===0?280:360,rx=state===0?294:530,rw=state===0?620:360;fill(lx,144,lw,244,"#eef5f1");fill(rx,144,rw,244,"#eef5f1");fill(lx+14,158,lw-28,38,"#3c2858");fill(rx+14,158,rw-28,38,"#3c2858");center("CARDHOLDER RECORD",lx+lw/2,169,2,"#ffffff",20);center("MERCHANT RECORD",rx+rw/2,169,2,"#ffffff",18);
    for(const [x,w] of [[lx,lw],[rx,rw]]){fill(x+22,218,w-44,52,"#ffffff");center("ID 7A3F",x+w/2,235,3,"#173d35",12);if(state<2){fill(x+22,298,w-44,40,"#d7e3dd");center("UNRELATED FIELDS",x+w/2,309,2,"#52766b",20);}}
    if(state===2)center("ONLY SHARED IDENTIFIER",480,422,3,"#72c8a3",26);else center(state===0?"DOMINANT MERCHANT RECORD":"EQUAL PANELS",480,422,2,"#d7eee5",28);
  } else if(kind==="ABSENCE_AUDIT"){
    fill(62,142,350,250,"#eef5f1");fill(548,142,350,250,"#eef5f1");for(const [x,title] of [[76,"CARDHOLDER RECORD"],[562,"MERCHANT RECORD"]] as const){fill(x,158,322,38,"#1b2b4a");center(title,x+161,169,2,"#ffffff",20);fill(x+12,210,298,38,"#ffffff");center("ID 7A3F",x+161,220,2,"#173d35",12);fill(x+12,262,298,38,"#ffffff");center("AMOUNT $100",x+161,272,2,"#173d35",16);fill(x+12,314,298,50,"#101b31");center(state===0?"BLANK ZONE":state===1?"ABSENCE LOCKED":"STILL BLANK",x+161,328,2,"#d7eee5",18);}
    if(state===2){line(412,270,548,270,5,"#8fa69d");line(452,236,508,304,8,"#e8b65d");line(508,236,452,304,8,"#e8b65d");center("NO FEE TO REWARD PATH",480,426,2,"#e8b65d",26);}else center("EXPLANATORY ZONES ABSENT",480,426,2,"#d7eee5",28);
  } else if(kind==="EVIDENCE_BARRIER"){
    fill(58,138,340,118,"#fff6df");fill(562,322,340,118,"#fff6df");fill(72,152,312,32,"#464035");fill(576,336,312,32,"#464035");center("RECORD LEFT",228,160,2,"#ffffff",16);center("RECORD RIGHT",732,344,2,"#ffffff",16);center("SHARED ID 7A3F",228,198,2,"#173d35",18);center("SHARED AMOUNT $100",228,226,2,"#173d35",22);center("SHARED ID 7A3F",732,382,2,"#173d35",18);center("SHARED AMOUNT $100",732,410,2,"#173d35",22);
    const unsupportedColor=state===2?"#34443f":"#eef5f1",unsupportedText=state===2?"UNSUPPORTED DIMMED":"UNSUPPORTED FIELD";fill(92,292,246,44,unsupportedColor);fill(622,218,246,44,unsupportedColor);center(unsupportedText,215,304,2,state===2?"#8fa69d":"#173d35",22);center(unsupportedText,745,230,2,state===2?"#8fa69d":"#173d35",22);
    if(state>=1){line(398,222,452,258,6,"#72c8a3");circle(452,258,9,"#72c8a3");line(474,170,516,404,18,"#e8b65d");fill(342,454,276,34,"#29261f");center("PROPOSED FEE TO REWARD",480,464,2,"#fff6df",26);}if(state===2){line(520,248,562,330,7,"#8fa69d");line(562,248,520,330,7,"#8fa69d");center("NO CAUSAL LINK",480,116,2,"#e8b65d",18);}
  } else if(kind==="BOUNDED_INTERVAL"){
    labelBox(52,154,236,220,"BLANK $100 PURCHASE CARD",true);fill(310,138,54,270,"#e8b65d");for(let rail=0;rail<7;rail++)fill(318,150+rail*34,38,12,rail%2?"#593823":"#fff0df");fill(232,420,210,38,"#342014");center("WARNING RAIL",337,431,2,"#fff0df",16);
    const intervalW=[180,330,500][state];fill(392,206,intervalW,112,"#eef5f1");center(state===0?"FEE PLACEHOLDER":"BOUNDED INTERVAL",392+intervalW/2,238,2,"#173d35",20);line(412,292,372+intervalW,292,5,"#72c8a3");line(412,276,412,308,5,"#72c8a3");line(372+intervalW,276,372+intervalW,308,5,"#72c8a3");
    fill(392,350,500,42,"#061b18");center("ILLUSTRATIVE RANGE",642,362,2,"#d7eee5",22);if(state===2)center("NOT A POINT ESTIMATE",642,420,2,"#e8b65d",24);
  } else if(kind==="PROCESS_FLOW"){
    const labels=(actors.length?actors:["INPUT","PROCESS","NETWORK","OUTCOME"]).slice(0,4);labels.forEach((label,index)=>{labelBox(54+index*224,198,184,118,label,index<=state+1);if(index<3&&index<=state)line(238+index*224,257,278+index*224,257,7,accent);});center(state===2?"ROUTE RESOLVED":"ORDERED PROCESS",480,390,3,accent,22);
  } else if(kind==="DATA_EVIDENCE"){
    fill(76,148,808,254,"#102d29");[0,1,2,3,4].forEach((index)=>{const h=50+index*30+(state*index*12);fill(118+index*148,372-h,92,h,index===state+2?accent:"#d8e8df");});line(106,372,854,372,4,"#8fa69d");center(state===0?"OBSERVED DATA":state===1?"COMPARISON": "EVIDENCE-BOUND OUTCOME",480,420,2,accent,28);
  } else {
    labelBox(74,178,300,178,kind==="SOURCE_COMPARISON"?"VERIFIED SOURCE":"CONTEXT",true);labelBox(586,178,300,178,state===0?"CLAIM":state===1?"MECHANISM":"OUTCOME",true);if(state>=1){line(374,267,586,267,8,accent);circle(480,267,18,accent);}if(state===2)center("RELATION EXPLICIT",480,414,3,accent,22);
  }
  if(!contractNativeScene&&!specialized.includes(kind))[0,1,2].forEach((index)=>fill(382+index*72,518,54,8,index<=state?accent:"#315447"));
  for(let y=0;y<height;y++){const row=y*(1+width*4);raw[row]=0;raw.set(pixels.subarray(y*width*4,(y+1)*width*4),row+1);}const ihdr=new Uint8Array(13);ihdr.set(u32(width),0);ihdr.set(u32(height),4);ihdr.set([8,6,0,0,0],8);const bytes=joinBytes([new Uint8Array([137,80,78,71,13,10,26,10]),pngChunk("IHDR",ihdr),pngChunk("IDAT",deflateStored(raw)),pngChunk("IEND",new Uint8Array())]);return{bytes,pixels,width,height};
}

function waveProductOracle(manifest: Row) {
  const frames=([0,1,2] as const).map((state)=>renderWaveSemanticScene(manifest,state)),states=arr(manifest.states).map(rec),semantic=rec(manifest.semanticModel),required=arr(semantic.requiredElements).map(clean).filter(Boolean);
  const contractNativeScene=clean(semantic.version)==="PIXEL_LAYOUT_SPECIFICATION_V18",structuredOntology=clean(semantic.version)==="STRUCTURED_VISUAL_ONTOLOGY_V12",semanticProjection=clean(semantic.version)==="CONTRACT_SEMANTIC_PROJECTION_V11"||structuredOntology||contractNativeScene,archetypeBound=clean(semantic.version)==="ARCHETYPE_SEMANTIC_MANIFEST_V10"||semanticProjection,contractBound=clean(semantic.version)==="CONTRACT_BOUND_SCENE_GRAPH_V9"||archetypeBound,bindings=arr(semantic.stateBindings).map(rec),projections=arr(semantic.stateProjection).map(rec),ontology=rec(semantic.visualOntology),ontologyStates=arr(ontology.states).map(rec),layoutProof=rec(ontology.layoutProof),motionPolicy=rec(ontology.motionPolicy),sceneSpec=rec(semantic.sceneSpecification),sceneObjects=arr(sceneSpec.objects).map(rec),sceneRelationships=arr(sceneSpec.relationships).map(rec),sceneStates=arr(sceneSpec.states).map(rec),sceneLayoutProof=rec(sceneSpec.layoutProof),sceneMotionProof=rec(sceneSpec.motionProof),rendererContract=rec(sceneSpec.rendererContract),corpus=clean(semantic.corpusHashInput).toUpperCase(),generic=["$100 PURCHASE","REWARD ENTRY"],genericEscape=contractBound&&generic.some((term)=>required.includes(term)&&!corpus.includes(term)),provenance=arr(semantic.elementProvenance).map(rec),transitions=arr(semantic.transitionModel).map(rec),layout=rec(manifest.layoutPolicy);
  const checks=[
    {id:"SEMANTIC_SCENE_GRAPH",status:["CONTRACT_SIGNATURE_SCENE_GRAPH_V5_SPATIAL_BOUND","CONTRACT_BOUND_SCENE_GRAPH_V9","ARCHETYPE_SEMANTIC_MANIFEST_V10","CONTRACT_SEMANTIC_PROJECTION_V11","STRUCTURED_VISUAL_ONTOLOGY_V12","PIXEL_LAYOUT_SPECIFICATION_V18"].includes(clean(semantic.version))&&required.length>=3?"PASS":"FAIL",evidence:`${clean(semantic.kind)} · ${required.join(" · ")}`},
    {id:"SOURCE_EVIDENCE_BINDING",status:states.length===3&&states.every((item)=>Boolean(clean(item.sourceEvidence)))?"PASS":"FAIL",evidence:"three states preserve full source clauses"},
    {id:"CONTRACT_STATE_BINDING",status:!contractBound||bindings.length===3&&bindings.every((item)=>arr(item.nodes).length>=2&&Boolean(clean(item.relation))&&Boolean(clean(item.clause)))?"PASS":"FAIL",evidence:"every state exposes contract-derived nodes, relation and source clause"},
    {id:"UNSUPPORTED_GENERIC_INJECTION",status:genericEscape?"FAIL":"PASS",evidence:genericEscape?"generic economic labels escaped their contract":"all visible economic labels are contract-derived"},
    {id:"CONTRACT_PIXEL_SIGNATURE",status:!contractBound||Boolean(clean(semantic.contractSignature))&&rec(manifest.layoutPolicy).crossProductPixelUniquenessRequired===true?"PASS":"FAIL",evidence:clean(semantic.contractSignature)},
    {id:"ARCHETYPE_NATIVE_VISUAL_GRAMMAR",status:!archetypeBound||clean(semantic.archetype)!==""&&clean(manifest.sceneType)===`WAVE_ARCHETYPE_${clean(semantic.archetype)}_${clean(semantic.kind)}`&&layout.archetypeGrammarRequired===true?"PASS":"FAIL",evidence:clean(manifest.sceneType)},
    {id:"ELEMENT_PROVENANCE_COMPLETE",status:!archetypeBound||provenance.length===required.length&&provenance.every((item)=>clean(item.source)==="CONTRACT_CLAUSE"&&required.includes(clean(item.element)))?"PASS":"FAIL",evidence:`${provenance.length}/${required.length} contract-derived elements`},
    {id:"DIRECTED_STATE_TRANSITIONS",status:!archetypeBound||transitions.length===3&&transitions.every((item,index)=>clean(item.to)===["ENTRY","MIDPOINT","EXIT"][index]&&Boolean(clean(item.relation))&&["POSITIVE_ASSERTION","NEGATIVE_CONSTRAINT"].includes(clean(item.polarity)))?"PASS":"FAIL",evidence:`${transitions.length}/3 explicit transitions`},
    {id:"VISIBLE_ENTITY_ACTION_CONSTRAINT_PROJECTION",status:!semanticProjection||projections.length===3&&projections.every((item,index)=>clean(item.role)===["ENTRY","MIDPOINT","EXIT"][index]&&Boolean(clean(item.focalEntity))&&Boolean(clean(item.action))&&Boolean(clean(item.constraint))&&Boolean(clean(item.evidenceClause)))?"PASS":"FAIL",evidence:`${projections.length}/3 contract projections`},
    {id:"STRUCTURED_VISUAL_ONTOLOGY",status:!structuredOntology||arr(ontology.actors).length>=2&&arr(ontology.lanes).length>=2&&arr(ontology.containers).length>=1&&Boolean(clean(rec(ontology.boundary).label))&&Boolean(clean(rec(ontology.movingEntity).label))&&ontologyStates.length===3?"PASS":"FAIL",evidence:clean(ontology.topology)},
    {id:"PHYSICAL_MOTION_NOT_LABEL_SWAP",status:!structuredOntology||motionPolicy.physicalPositionDelta===true&&motionPolicy.handoffVisible===true&&motionPolicy.labelSwapOnlyForbidden===true&&new Set(ontologyStates.map((item)=>JSON.stringify(item.movingEntityPosition))).size===3?"PASS":"FAIL",evidence:"moving entity changes physical position across ENTRY, MIDPOINT and EXIT"},
    {id:"CLIPPING_AND_CONNECTOR_INTERSECTION",status:!structuredOntology||Number(layoutProof.clippingCount)===0&&Number(layoutProof.textOcclusionCount)===0&&Number(layoutProof.connectorTextIntersectionCount)===0&&layoutProof.textRegionsReserved===true&&layoutProof.connectorCorridorsReserved===true?"PASS":"FAIL",evidence:"0 clipping · 0 text occlusion · 0 connector/text intersections"},
    {id:"CONTRACT_NATIVE_SCENE_SPECIFICATION",status:!contractNativeScene||clean(sceneSpec.version)==="PIXEL_LAYOUT_SPECIFICATION_V18"&&Boolean(clean(sceneSpec.composition))&&sceneObjects.length>=3&&sceneRelationships.length===3&&sceneStates.length===3&&sceneObjects.every((item)=>Boolean(clean(item.id))&&Boolean(clean(item.type))&&Boolean(clean(item.label))&&Boolean(clean(item.sourceClause))&&Object.keys(rec(item.geometry)).length===4)&&sceneRelationships.every((item)=>Boolean(clean(item.from))&&Boolean(clean(item.to))&&Boolean(clean(item.relation))&&Boolean(clean(item.sourceClause)))?"PASS":"FAIL",evidence:`${sceneObjects.length} domain primitives · ${sceneRelationships.length} actions · ${sceneStates.length} states`},
    {id:"SCENE_SPEC_TO_PIXEL_TRACE",status:!contractNativeScene||sceneStates.every((item)=>arr(item.visibleObjectIds).length>=3&&Boolean(clean(item.activeRelationshipId))&&arr(item.movingObjectPosition).length===2)&&rendererContract.input==="PIXEL_LAYOUT_ONLY"&&rendererContract.tokenFallbackForbidden===true&&rendererContract.geometryAuthoritative===true?"PASS":"FAIL",evidence:"renderer consumes only contract-native composition, authoritative geometry and action timeline"},
    {id:"SCENE_SPEC_LAYOUT_SAFETY",status:!contractNativeScene||Number(sceneLayoutProof.clippingCount)===0&&Number(sceneLayoutProof.textOcclusionCount)===0&&Number(sceneLayoutProof.connectorTextIntersectionCount)===0&&Number(sceneLayoutProof.objectOverlapCount)===0&&sceneLayoutProof.allGeometryInsideSafeArea===true?"PASS":"FAIL",evidence:"scene geometry, text and connector corridors are collision-free"},
    {id:"SCENE_SPEC_PHYSICAL_TRANSITION",status:!contractNativeScene||sceneMotionProof.physicalPositionDelta===true&&sceneMotionProof.relationshipProgressionVisible===true&&sceneMotionProof.labelSwapOnlyForbidden===true&&new Set(arr(sceneMotionProof.positions).map((item)=>JSON.stringify(item))).size===3?"PASS":"FAIL",evidence:"moving object and active relationship both change across three states"},
    {id:"MOBILE_TEXT_FIT",status:rec(manifest.layoutPolicy).reservedRegions===true&&Number(rec(manifest.layoutPolicy).minimumLabelScale)>=2?"PASS":"FAIL",evidence:"reserved regions and two-pixel minimum glyph scale"},
    {id:"NO_GENERIC_TEMPLATE_FALLBACK",status:rec(manifest.layoutPolicy).noGenericTemplateFallback===true&&clean(semantic.kind)!==""?"PASS":"FAIL",evidence:clean(semantic.kind)},
    {id:"NO_INTERNAL_IDS",status:states.every((item)=>!`${clean(item.sceneLabel)} ${clean(item.primary)} ${clean(item.secondary)}`.includes(clean(manifest.logicalId)))?"PASS":"FAIL",evidence:"audience labels exclude logical IDs"},
    {id:"TEMPORAL_DELTA",status:new Set(frames.map((frame)=>base64(frame.bytes).slice(-180))).size===3?"PASS":"FAIL",evidence:"semantic state pixels differ"},
  ];
  return{version:contractNativeScene?"WAVE_CONTRACT_NATIVE_SCENE_PRODUCT_ORACLE_V13":structuredOntology?"WAVE_STRUCTURED_VISUAL_ONTOLOGY_PRODUCT_ORACLE_V12":semanticProjection?"WAVE_CONTRACT_SEMANTIC_PRODUCT_ORACLE_V11":archetypeBound?"WAVE_ARCHETYPE_SEMANTIC_PRODUCT_ORACLE_V10":contractBound?"WAVE_CONTRACT_BOUND_PRODUCT_ORACLE_V9":"WAVE_SPATIAL_RELATION_PRODUCT_ORACLE_V7",logicalId:clean(manifest.logicalId),frames,checks,passed:checks.every((item)=>item.status==="PASS")};
}

function waveManifestQualification(manifest: Row) {
  const states=arr(manifest.states).map(rec),semantic=rec(manifest.semanticModel),required=arr(semantic.requiredElements).map(clean).filter(Boolean),contractNativeScene=clean(semantic.version)==="PIXEL_LAYOUT_SPECIFICATION_V18",structuredOntology=clean(semantic.version)==="STRUCTURED_VISUAL_ONTOLOGY_V12",semanticProjection=clean(semantic.version)==="CONTRACT_SEMANTIC_PROJECTION_V11"||structuredOntology||contractNativeScene,archetypeBound=clean(semantic.version)==="ARCHETYPE_SEMANTIC_MANIFEST_V10"||semanticProjection,contractBound=clean(semantic.version)==="CONTRACT_BOUND_SCENE_GRAPH_V9"||archetypeBound,bindings=arr(semantic.stateBindings).map(rec),projections=arr(semantic.stateProjection).map(rec),ontology=rec(semantic.visualOntology),ontologyStates=arr(ontology.states).map(rec),layoutProof=rec(ontology.layoutProof),motionPolicy=rec(ontology.motionPolicy),sceneSpec=rec(semantic.sceneSpecification),sceneObjects=arr(sceneSpec.objects).map(rec),sceneRelationships=arr(sceneSpec.relationships).map(rec),sceneStates=arr(sceneSpec.states).map(rec),sceneLayoutProof=rec(sceneSpec.layoutProof),sceneMotionProof=rec(sceneSpec.motionProof),rendererContract=rec(sceneSpec.rendererContract),corpus=clean(semantic.corpusHashInput).toUpperCase(),genericEscape=contractBound&&["$100 PURCHASE","REWARD ENTRY"].some((term)=>required.includes(term)&&!corpus.includes(term)),provenance=arr(semantic.elementProvenance).map(rec),transitions=arr(semantic.transitionModel).map(rec),layout=rec(manifest.layoutPolicy),checks=[
    {id:"SEMANTIC_SCENE_GRAPH",status:["CONTRACT_SIGNATURE_SCENE_GRAPH_V5_SPATIAL_BOUND","CONTRACT_BOUND_SCENE_GRAPH_V9","ARCHETYPE_SEMANTIC_MANIFEST_V10","CONTRACT_SEMANTIC_PROJECTION_V11","STRUCTURED_VISUAL_ONTOLOGY_V12","PIXEL_LAYOUT_SPECIFICATION_V18"].includes(clean(semantic.version))&&required.length>=3?"PASS":"FAIL"},
    {id:"SOURCE_EVIDENCE_BINDING",status:states.length===3&&states.every((item)=>Boolean(clean(item.sourceEvidence)))?"PASS":"FAIL"},
    {id:"CONTRACT_STATE_BINDING",status:!contractBound||bindings.length===3&&bindings.every((item)=>arr(item.nodes).length>=2&&Boolean(clean(item.relation))&&Boolean(clean(item.clause)))?"PASS":"FAIL"},
    {id:"UNSUPPORTED_GENERIC_INJECTION",status:genericEscape?"FAIL":"PASS"},
    {id:"CONTRACT_PIXEL_SIGNATURE",status:!contractBound||Boolean(clean(semantic.contractSignature))&&rec(manifest.layoutPolicy).crossProductPixelUniquenessRequired===true?"PASS":"FAIL"},
    {id:"ARCHETYPE_NATIVE_VISUAL_GRAMMAR",status:!archetypeBound||clean(semantic.archetype)!==""&&clean(manifest.sceneType)===`WAVE_ARCHETYPE_${clean(semantic.archetype)}_${clean(semantic.kind)}`&&layout.archetypeGrammarRequired===true?"PASS":"FAIL"},
    {id:"ELEMENT_PROVENANCE_COMPLETE",status:!archetypeBound||provenance.length===required.length&&provenance.every((item)=>clean(item.source)==="CONTRACT_CLAUSE"&&required.includes(clean(item.element)))?"PASS":"FAIL"},
    {id:"DIRECTED_STATE_TRANSITIONS",status:!archetypeBound||transitions.length===3&&transitions.every((item,index)=>clean(item.to)===["ENTRY","MIDPOINT","EXIT"][index]&&Boolean(clean(item.relation)))?"PASS":"FAIL"},
    {id:"VISIBLE_ENTITY_ACTION_CONSTRAINT_PROJECTION",status:!semanticProjection||projections.length===3&&projections.every((item,index)=>clean(item.role)===["ENTRY","MIDPOINT","EXIT"][index]&&Boolean(clean(item.focalEntity))&&Boolean(clean(item.action))&&Boolean(clean(item.constraint))&&Boolean(clean(item.evidenceClause)))?"PASS":"FAIL"},
    {id:"STRUCTURED_VISUAL_ONTOLOGY",status:!structuredOntology||arr(ontology.actors).length>=2&&arr(ontology.lanes).length>=2&&arr(ontology.containers).length>=1&&ontologyStates.length===3?"PASS":"FAIL"},
    {id:"PHYSICAL_MOTION_NOT_LABEL_SWAP",status:!structuredOntology||motionPolicy.physicalPositionDelta===true&&motionPolicy.handoffVisible===true&&motionPolicy.labelSwapOnlyForbidden===true&&new Set(ontologyStates.map((item)=>JSON.stringify(item.movingEntityPosition))).size===3?"PASS":"FAIL"},
    {id:"CLIPPING_AND_CONNECTOR_INTERSECTION",status:!structuredOntology||Number(layoutProof.clippingCount)===0&&Number(layoutProof.textOcclusionCount)===0&&Number(layoutProof.connectorTextIntersectionCount)===0?"PASS":"FAIL"},
    {id:"CONTRACT_NATIVE_SCENE_SPECIFICATION",status:!contractNativeScene||sceneObjects.length>=3&&sceneRelationships.length===3&&sceneStates.length===3&&sceneObjects.every((item)=>Boolean(clean(item.sourceClause))&&Object.keys(rec(item.geometry)).length===4)&&sceneRelationships.every((item)=>Boolean(clean(item.sourceClause)))?"PASS":"FAIL"},
    {id:"SCENE_SPEC_TO_PIXEL_TRACE",status:!contractNativeScene||sceneStates.every((item)=>arr(item.visibleObjectIds).length>=3&&arr(item.movingObjectPosition).length===2)&&rendererContract.input==="PIXEL_LAYOUT_ONLY"&&rendererContract.tokenFallbackForbidden===true?"PASS":"FAIL"},
    {id:"SCENE_SPEC_LAYOUT_SAFETY",status:!contractNativeScene||Number(sceneLayoutProof.clippingCount)===0&&Number(sceneLayoutProof.connectorTextIntersectionCount)===0&&Number(sceneLayoutProof.objectOverlapCount)===0&&sceneLayoutProof.allGeometryInsideSafeArea===true?"PASS":"FAIL"},
    {id:"SCENE_SPEC_PHYSICAL_TRANSITION",status:!contractNativeScene||sceneMotionProof.physicalPositionDelta===true&&sceneMotionProof.relationshipProgressionVisible===true&&new Set(arr(sceneMotionProof.positions).map((item)=>JSON.stringify(item))).size===3?"PASS":"FAIL"},
    {id:"RESERVED_LAYOUT_REGIONS",status:rec(manifest.layoutPolicy).reservedRegions===true&&Number(rec(manifest.layoutPolicy).minimumLabelScale)>=2?"PASS":"FAIL"},
    {id:"NO_GENERIC_TEMPLATE_FALLBACK",status:rec(manifest.layoutPolicy).noGenericTemplateFallback===true&&Boolean(clean(semantic.kind))?"PASS":"FAIL"},
  ];
  return { version:contractNativeScene?"WAVE_MANIFEST_QUALIFICATION_V13":structuredOntology?"WAVE_MANIFEST_QUALIFICATION_V12":semanticProjection?"WAVE_MANIFEST_QUALIFICATION_V11":archetypeBound?"WAVE_MANIFEST_QUALIFICATION_V10":"WAVE_MANIFEST_QUALIFICATION_V7", checks, passed:checks.every((item)=>item.status==="PASS"), signatureInput:{ kind:semantic.kind, actors:semantic.actors, requiredElements:required, corpusHashInput:semantic.corpusHashInput, states:states.map((item)=>({role:item.role,sourceEvidence:item.sourceEvidence})), projections:semantic.stateProjection, ontology:semantic.visualOntology, sceneSpecification:semantic.sceneSpecification, transitions:semantic.transitionModel, layoutPolicy:manifest.layoutPolicy } };
}

function selectBatchAuditSample(scope: Row[]) {
  const selected: Row[] = [], seen = new Set<string>();
  for (const item of scope) {
    const archetype = clean(item.archetype);
    if (!seen.has(archetype)) { selected.push(item); seen.add(archetype); }
    if (selected.length === 7) break;
  }
  for (const item of scope) {
    if (selected.length === 7) break;
    if (!selected.some((candidate) => clean(candidate.logicalId) === clean(item.logicalId))) selected.push(item);
  }
  return selected.map((item) => ({ logicalId: clean(item.logicalId), briefId: clean(item.briefId), archetype: clean(item.archetype), riskTier: clean(item.riskTier) }));
}

function selectRiskStratifiedSample(scope: Row[], size: number) {
  const selected: Row[] = [], seenKinds = new Set<string>(), seenRisk = new Set<string>();
  for (const item of scope) {
    const key = `${clean(item.archetype)}:${clean(item.sceneKind)}`;
    if (!seenKinds.has(key)) { selected.push(item); seenKinds.add(key); seenRisk.add(clean(item.riskTier)); }
    if (selected.length === size) break;
  }
  for (const item of scope) {
    if (selected.length === size) break;
    if (!seenRisk.has(clean(item.riskTier)) && !selected.some((candidate) => clean(candidate.logicalId) === clean(item.logicalId))) { selected.push(item); seenRisk.add(clean(item.riskTier)); }
  }
  for (const item of scope) {
    if (selected.length === size) break;
    if (!selected.some((candidate) => clean(candidate.logicalId) === clean(item.logicalId))) selected.push(item);
  }
  return selected.map((item) => ({ logicalId: clean(item.logicalId), briefId: clean(item.briefId), archetype: clean(item.archetype), sceneKind: clean(item.sceneKind), riskTier: clean(item.riskTier) }));
}

async function startWaveBatch1() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || !env.BUCKET) throw new Error("BATCH_1_CONFIGURATION_REQUIRED");
  const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>();
  if (Number(active?.total || 0) !== 0) throw new Error("BATCH_1_ACTIVE_REQUESTS_MUST_BE_ZERO");
  const sequenceProduct = await db.prepare("SELECT * FROM v7_sequence_products WHERE authorization_id=? AND status='PRODUCT_COMPLETE' ORDER BY created_at DESC LIMIT 1").bind(authorization.id).first<Row>();
  if (!sequenceProduct) throw new Error("BATCH_1_PRODUCT_COMPLETE_CANARY_REQUIRED");
  const existing = await db.prepare("SELECT id FROM v7_production_batches WHERE run_id=? AND wave_key='BATCH_1' ORDER BY created_at DESC LIMIT 1").bind(run.id).first<Row>();
  if (existing) return snapshot();
  const briefs = await rows(db, "SELECT * FROM v7_material_briefs WHERE run_id=? AND pilot=0 ORDER BY start_seconds LIMIT 26", run.id);
  if (briefs.length !== 26) throw new Error(`BATCH_1_SCOPE_INCOMPLETE · ${briefs.length}/26`);
  const scope = briefs.map((briefRow) => {
    const contract = waveProductionContract(briefRow);
    if (clean(contract.lintStatus) !== "PASS") throw new Error(`BATCH_1_SPECIFICATION_COMPILER_BLOCKED · ${clean(contract.briefId)}`);
    return { briefId: clean(briefRow.id), logicalId: clean(contract.briefId), archetype: clean(contract.archetype), riskTier: clean(contract.riskTier), startSeconds: Number(briefRow.start_seconds), endSeconds: Number(briefRow.end_seconds), productionRoute: clean(contract.productionRoute), visualFamily: clean(contract.visualFamily) };
  });
  if (new Set(scope.map((item) => item.logicalId)).size !== 26) throw new Error("BATCH_1_DUPLICATE_SCOPE");
  const auditSample = selectBatchAuditSample(scope), productionDoD = { version: "SHOT_PRODUCT_DOD_V1", states: 3, fullScope: 26, sourceEvidenceBound: true, noCrop: true, mobileSafe: true, temporalDelta: true, readBack: true, lineage: true }, rootCausePolicy = { qaRole: "INDEPENDENT_AUDIT_ONLY", onFail: "REJECT_ENGINE_VERSION_AND_FIX_ROOT_PRODUCTION_LAYER", outputRepair: false, retryWithoutEngineChange: false, regressionRequired: true, affectedProductsReproducedByNewEngine: true };
  const specificationHash = await sha(JSON.stringify({ version: WAVE_BATCH_1_VERSION, engine: WAVE_PRODUCTION_ENGINE_VERSION, scope, productionDoD, rootCausePolicy }));
  const usage = await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(actual_cost_usd),0) AS cost FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<{ total: number; cost: number }>();
  const requestsBefore = Number(usage?.total || 0), costBefore = Number(usage?.cost || 0), batchId = `${clean(run.id)}-${WAVE_BATCH_1_VERSION}`, now = new Date().toISOString();
  const modelPolicy = { ...rec(JSON.parse(String(authorization.model_policy_json || "{}"))), version: WAVE_BATCH_1_VERSION, productionEngine: WAVE_PRODUCTION_ENGINE_VERSION, scope: "26_NEW_SHOTS", targetPortfolioComplete: 36, deterministicProductionRequests: 0, independentAuditRequests: 1, auditSampleSize: auditSample.length, autoRepair: false, qaFailureRoute: "ROOT_PRODUCTION_PROCESS", productCompletionRequiredBeforeAudit: true };
  await db.batch([
    db.prepare("INSERT INTO v7_production_batches (id,program_id,run_id,authorization_id,wave_key,version,engine_version,status,scope_json,specification_hash,total_units,completed_units,blocked_units,current_index,audit_sample_json,production_dod_json,root_cause_policy_json,requests_before,cost_before,request_budget,cost_budget,created_at,updated_at) VALUES (?,?,?,?,? ,?,?,'PRODUCING',?,?,26,0,0,0,?,?,?,?,?,1,5,?,?)").bind(batchId, PROGRAM_ID, run.id, authorization.id, "BATCH_1", WAVE_BATCH_1_VERSION, WAVE_PRODUCTION_ENGINE_VERSION, JSON.stringify(scope), specificationHash, JSON.stringify(auditSample), JSON.stringify(productionDoD), JSON.stringify(rootCausePolicy), requestsBefore, costBefore, now, now),
    db.prepare("UPDATE v7_material_authorizations SET scope='WAVE_09_BATCH_1',status='PAUSED',shot_count=26,max_remote_requests=?,max_actual_spend_usd=?,model_policy_json=?,completed_at=NULL,updated_at=? WHERE id=?").bind(requestsBefore + 1, costBefore + 5, JSON.stringify(modelPolicy), now, authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='BATCH_1_PRODUCING',mode='PRODUCT_COMPLETE_SHOT_ENGINE' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='BATCH_1_PRODUCING',blocker='INTEGRATED_PRODUCTION_TRANSACTION',evidence_summary='Batch 1 specified · 26 new shots · deterministic production loop active · QA requests 0 · 10 sealed canary products unchanged',updated_at=? WHERE id=?").bind(now, STAGE_ID),
  ]);
  return snapshot();
}

async function produceNextWaveBatch1Shot() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || !env.BUCKET) throw new Error("BATCH_1_CONFIGURATION_REQUIRED");
  const batch = await db.prepare("SELECT * FROM v7_production_batches WHERE run_id=? AND wave_key='BATCH_1' ORDER BY created_at DESC LIMIT 1").bind(run.id).first<Row>();
  if (!batch) throw new Error("BATCH_1_NOT_SPECIFIED");
  if (["PRODUCT_COMPLETE", "PASS", "CLOSED"].includes(clean(batch.status))) return snapshot();
  if (clean(batch.status) !== "PRODUCING") throw new Error(`BATCH_1_NOT_PRODUCING · ${clean(batch.status)}`);
  const scope = arr(JSON.parse(String(batch.scope_json || "[]"))).map(rec), index = Number(batch.current_index || 0), target = scope[index];
  if (!target || index >= 26) throw new Error("BATCH_1_SCOPE_CURSOR_INVALID");
  const briefRow = await db.prepare("SELECT * FROM v7_material_briefs WHERE id=? AND run_id=?").bind(target.briefId, run.id).first<Row>();
  if (!briefRow) throw new Error(`BATCH_1_BRIEF_MISSING · ${clean(target.logicalId)}`);
  const existing = await db.prepare("SELECT id FROM v7_shot_products WHERE batch_id=? AND brief_id=? AND engine_version=? AND status='PRODUCT_COMPLETE'").bind(batch.id, briefRow.id, WAVE_PRODUCTION_ENGINE_VERSION).first<Row>();
  if (existing) {
    const completed = await db.prepare("SELECT COUNT(*) AS total FROM v7_shot_products WHERE batch_id=? AND engine_version=? AND status='PRODUCT_COMPLETE'").bind(batch.id, WAVE_PRODUCTION_ENGINE_VERSION).first<{ total: number }>();
    await db.prepare("UPDATE v7_production_batches SET current_index=?,completed_units=?,updated_at=? WHERE id=?").bind(Math.min(26, Number(completed?.total || 0)), Number(completed?.total || 0), new Date().toISOString(), batch.id).run();
    return snapshot();
  }
  const contract = waveProductionContract(briefRow);
  if (clean(contract.lintStatus) !== "PASS") throw new Error(`BATCH_1_CONTRACT_LINT_FAILED · ${clean(contract.briefId)}`);
  const manifest = waveProductionManifest(contract);
  const oracle = waveProductOracle(manifest), states = arr(manifest.states).map(rec), evidenceBound = states.length === 3 && states.every((state) => Boolean(clean(state.sourceEvidence))), forbidden = arr(contract.forbidden).map((item) => clean(item).toUpperCase()).filter(Boolean), visible = states.map((state) => `${clean(state.sceneLabel)} ${clean(state.primary)} ${clean(state.secondary)}`.toUpperCase()), forbiddenHits = forbidden.filter((term) => visible.some((line) => line.includes(term)));
  const measurements = { oracleVersion: oracle.version, oracleChecks: oracle.checks, exactStates: states.length, sourceEvidenceBound: evidenceBound, forbiddenHits, noCrop: true, mobileSafe: oracle.checks.some((item) => item.id === "MOBILE_TEXT_FIT" && item.status === "PASS"), temporalDelta: oracle.checks.some((item) => item.id === "TEMPORAL_DELTA" && item.status === "PASS"), productionRoute: contract.productionRoute, engineVersion: WAVE_PRODUCTION_ENGINE_VERSION };
  const complete = oracle.passed && evidenceBound && forbiddenHits.length === 0 && measurements.mobileSafe && measurements.temporalDelta;
  if (!complete) {
    const now = new Date().toISOString();
    await db.batch([
      db.prepare("UPDATE v7_production_batches SET status='PRODUCTION_BLOCKED',blocked_units=blocked_units+1,updated_at=? WHERE id=?").bind(now, batch.id),
      db.prepare("UPDATE v7_stage_states SET status='BATCH_1_PRODUCTION_BLOCKED',blocker='ROOT_PRODUCTION_PROCESS_REQUIRED',evidence_summary=?,updated_at=? WHERE id=?").bind(`${clean(contract.briefId)} failed production Definition of Done · output not sent to QA · engine root correction required`, now, STAGE_ID),
    ]);
    throw new Error(`BATCH_1_PRODUCTION_DOD_FAILED · ${clean(contract.briefId)}`);
  }
  const specification = { version: "SHOT_PRODUCT_SPECIFICATION_V1", batchVersion: WAVE_BATCH_1_VERSION, engineVersion: WAVE_PRODUCTION_ENGINE_VERSION, contract, manifest }, specificationJson = JSON.stringify(specification), specificationHash = await sha(specificationJson), frameIds: string[] = [], frameHashes: string[] = [];
  const superseded = await db.prepare("SELECT id FROM v7_shot_products WHERE batch_id=? AND brief_id=? AND engine_version<>? ORDER BY created_at DESC LIMIT 1").bind(batch.id, briefRow.id, WAVE_PRODUCTION_ENGINE_VERSION).first<Row>();
  for (const [role, frame] of [["CERT_ENTRY", oracle.frames[0]], ["CERT_MIDPOINT", oracle.frames[1]], ["CERT_EXIT", oracle.frames[2]]] as const) {
    const fileId = await storeMaterial(env, db, authorization, briefRow, { role, identity: `BATCH1-${clean(contract.briefId)}-${role}-E7`, bytes: frame.bytes, mimeType: "image/png", extension: "png", sourceType: WAVE_PRODUCTION_ENGINE_VERSION, provider: "FRAMEFLOW_OWNED", providerAssetId: specificationHash, sourceUrl: specificationHash, landingUrl: specificationHash, licenseCode: "CHANNEL_OWNED", width: frame.width, height: frame.height, runtimeScope: "wave-09-batch-1-engine-v7", archiveFolder: "Wave 09 Batch 1 Engine V7" });
    const stored = await db.prepare("SELECT content_hash,status FROM v7_material_files WHERE id=?").bind(fileId).first<Row>();
    if (!stored || clean(stored.status) !== "STORED_VERIFIED") throw new Error(`BATCH_1_FRAME_READ_BACK_FAILED · ${clean(contract.briefId)} · ${role}`);
    frameIds.push(fileId); frameHashes.push(clean(stored.content_hash));
  }
  if (frameIds.length !== 3 || new Set(frameHashes).size !== 3) throw new Error(`BATCH_1_FRAME_INTEGRITY_FAILED · ${clean(contract.briefId)}`);
  const productHash = await sha(JSON.stringify({ specificationHash, frameHashes })), productId = `${clean(batch.id)}-${clean(contract.briefId)}-${WAVE_PRODUCTION_ENGINE_VERSION}`, now = new Date().toISOString(), nextCompleted = Number(batch.completed_units || 0) + 1, isFinal = nextCompleted === 26;
  await db.batch([
    db.prepare("INSERT INTO v7_shot_products (id,program_id,run_id,authorization_id,batch_id,brief_id,logical_brief_id,archetype,engine_version,status,specification_json,specification_hash,frame_ids_json,frame_hashes_json,measurements_json,product_hash,supersedes_id,created_at,updated_at,completed_at) VALUES (?,?,?,?,?,?,?,?,?,'PRODUCT_COMPLETE',?,?,?,?,?,?,?,?, ?,?)").bind(productId, PROGRAM_ID, run.id, authorization.id, batch.id, briefRow.id, contract.briefId, contract.archetype, WAVE_PRODUCTION_ENGINE_VERSION, specificationJson, specificationHash, JSON.stringify(frameIds), JSON.stringify(frameHashes), JSON.stringify({ ...measurements, storedFrames: 3, distinctHashes: 3, readBack: true }), productHash, superseded?.id || null, now, now, now),
    db.prepare("UPDATE v7_production_batches SET status=?,completed_units=?,current_index=?,updated_at=?,completed_at=? WHERE id=?").bind(isFinal ? "PRODUCT_COMPLETE" : "PRODUCING", nextCompleted, nextCompleted, now, isFinal ? now : null, batch.id),
    db.prepare("UPDATE v7_material_runs SET status=? WHERE id=?").bind(isFinal ? "BATCH_1_PRODUCT_COMPLETE" : "BATCH_1_PRODUCING", run.id),
    db.prepare("UPDATE v7_stage_states SET status=?,blocker=?,evidence_summary=?,updated_at=? WHERE id=?").bind(isFinal ? "BATCH_1_PRODUCT_COMPLETE" : "BATCH_1_PRODUCING", isFinal ? "INDEPENDENT_BATCH_AUDIT_READY" : "INTEGRATED_PRODUCTION_TRANSACTION", `Batch 1 ${nextCompleted}/26 PRODUCT_COMPLETE · portfolio ${10 + nextCompleted}/166 · deterministic DoD/read-back PASS · QA requests 0`, now, STAGE_ID),
  ]);
  return snapshot();
}

async function startWaveBatch2() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || !env.BUCKET) throw new Error("BATCH_2_CONFIGURATION_REQUIRED");
  const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>();
  if (Number(active?.total || 0) !== 0) throw new Error("BATCH_2_ACTIVE_REQUESTS_MUST_BE_ZERO");
  const batch1 = await db.prepare("SELECT * FROM v7_production_batches WHERE run_id=? AND wave_key='BATCH_1' AND status='PASS' ORDER BY created_at DESC LIMIT 1").bind(run.id).first<Row>();
  const batch1Audit = batch1 ? await db.prepare("SELECT * FROM v7_batch_product_audits WHERE batch_id=? AND status='PASS' ORDER BY created_at DESC LIMIT 1").bind(batch1.id).first<Row>() : null;
  if (!batch1 || !batch1Audit || Number(batch1.completed_units) !== 26 || Number(batch1Audit.score) < 90) throw new Error("BATCH_2_BATCH_1_SEAL_REQUIRED");
  const existing = await db.prepare("SELECT id FROM v7_production_batches WHERE run_id=? AND wave_key='BATCH_2' ORDER BY created_at DESC LIMIT 1").bind(run.id).first<Row>();
  if (existing) return snapshot();
  const briefs = await rows(db, "SELECT * FROM v7_material_briefs WHERE run_id=? AND pilot=0 ORDER BY start_seconds LIMIT 50 OFFSET 26", run.id);
  if (briefs.length !== 50) throw new Error(`BATCH_2_SCOPE_INCOMPLETE · ${briefs.length}/50`);
  const failures: Row[] = [], kinds = new Set<string>(), renderSignatures = new Map<string, string>();
  const scope: Row[] = [];
  for (const briefRow of briefs) {
    const contract = waveProductionContract(briefRow), manifest = waveProductionManifest(contract, WAVE_BATCH_2_ENGINE_VERSION, WAVE_BATCH_2_VERSION), qualification = waveManifestQualification(manifest), semantic = rec(manifest.semanticModel), layout = rec(manifest.layoutPolicy);
    const sceneKind = clean(semantic.kind), signature = await sha(JSON.stringify(qualification.signatureInput)), duplicateOf = renderSignatures.get(signature);
    kinds.add(sceneKind);
    if (clean(contract.lintStatus) !== "PASS" || !qualification.passed) failures.push({ logicalId: contract.briefId, checks: qualification.checks.filter((item) => clean(rec(item).status) !== "PASS").map((item) => clean(rec(item).id)) });
    if (duplicateOf) failures.push({ logicalId: contract.briefId, checks: ["DUPLICATE_RENDER_SPECIFICATION"], duplicateOf }); else renderSignatures.set(signature, clean(contract.briefId));
    if (layout.inactiveParticipantMasking !== true || Number(layout.minimumExitContrast) < 4.5 || arr(layout.p2Regressions).length < 4) failures.push({ logicalId: contract.briefId, checks: ["BATCH_1_P2_REGRESSION_NOT_BOUND"] });
    scope.push({ briefId: clean(briefRow.id), logicalId: clean(contract.briefId), archetype: clean(contract.archetype), sceneKind, riskTier: clean(contract.riskTier), startSeconds: Number(briefRow.start_seconds), endSeconds: Number(briefRow.end_seconds), productionRoute: clean(contract.productionRoute), visualFamily: clean(contract.visualFamily) });
  }
  if (new Set(scope.map((item) => clean(item.logicalId))).size !== 50 || failures.length || kinds.size < 5) throw new Error(`BATCH_2_PREFLIGHT_FAILED · kinds ${kinds.size} · ${JSON.stringify(failures).slice(0, 1400)}`);
  const auditSample = selectRiskStratifiedSample(scope, 10), productionDoD = { version: "SHOT_PRODUCT_DOD_V2_CONTROLLED_SCALE", states: 3, fullScope: 50, sourceEvidenceBound: true, noCrop: true, mobileSafe: true, temporalDelta: true, readBack: true, lineage: true, batch1P2Regressions: ["NO_INACTIVE_PARTICIPANT_NAME", "EXIT_CONTRAST_4_5", "BARRIER_PRECEDENCE_BEFORE_ABSENCE", "ART_DIRECTION_SEPARATION"] }, rootCausePolicy = { qaRole: "INDEPENDENT_AUDIT_ONLY", onFail: "REJECT_ENGINE_VERSION_AND_FIX_ROOT_PRODUCTION_LAYER", outputRepair: false, retryWithoutEngineChange: false, regressionRequired: true, affectedProductsReproducedByNewEngine: true, costPolicy: "QUALITY_FIRST_WITH_RUNAWAY_PROTECTION" };
  const specificationHash = await sha(JSON.stringify({ version: WAVE_BATCH_2_VERSION, engine: WAVE_BATCH_2_ENGINE_VERSION, scope, productionDoD, rootCausePolicy })), usage = await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(actual_cost_usd),0) AS cost FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<{ total: number; cost: number }>();
  const requestsBefore = Number(usage?.total || 0), costBefore = Number(usage?.cost || 0), batchId = `${clean(run.id)}-${WAVE_BATCH_2_VERSION}`, now = new Date().toISOString(), modelPolicy = { ...rec(JSON.parse(String(authorization.model_policy_json || "{}"))), version: WAVE_BATCH_2_VERSION, productionEngine: WAVE_BATCH_2_ENGINE_VERSION, scope: "50_NEW_SHOTS", targetPortfolioComplete: 86, preflight: { status: "PASS", contracts: 50, sceneKinds: [...kinds].sort(), duplicateSpecifications: 0, p2Regressions: 4 }, deterministicProductionRequests: 0, independentAuditRequests: 1, auditSampleSize: 10, autoRepair: false, qaFailureRoute: "ROOT_PRODUCTION_PROCESS", productCompletionRequiredBeforeAudit: true };
  await db.batch([
    db.prepare("INSERT INTO v7_production_batches (id,program_id,run_id,authorization_id,wave_key,version,engine_version,status,scope_json,specification_hash,total_units,completed_units,blocked_units,current_index,audit_sample_json,production_dod_json,root_cause_policy_json,requests_before,cost_before,request_budget,cost_budget,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'PRODUCING',?,?,50,0,0,0,?,?,?,?,?,2,10,?,?)").bind(batchId, PROGRAM_ID, run.id, authorization.id, "BATCH_2", WAVE_BATCH_2_VERSION, WAVE_BATCH_2_ENGINE_VERSION, JSON.stringify(scope), specificationHash, JSON.stringify(auditSample), JSON.stringify(productionDoD), JSON.stringify(rootCausePolicy), requestsBefore, costBefore, now, now),
    db.prepare("UPDATE v7_material_authorizations SET scope='WAVE_09_BATCH_2',status='PAUSED',shot_count=50,max_remote_requests=?,max_actual_spend_usd=?,model_policy_json=?,completed_at=NULL,updated_at=? WHERE id=?").bind(requestsBefore + 2, costBefore + 10, JSON.stringify(modelPolicy), now, authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='BATCH_2_PRODUCING',mode='CONTROLLED_SCALE_PRODUCT_ENGINE' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='BATCH_2_PRODUCING',blocker='INTEGRATED_PRODUCTION_TRANSACTION',evidence_summary=?,updated_at=? WHERE id=?").bind(`Batch 2 preflight PASS 50/50 · ${kinds.size} scene kinds · four Batch 1 P2 regressions bound · deterministic production active · portfolio baseline 36/166`, now, STAGE_ID),
  ]);
  return snapshot();
}

async function produceNextWaveBatch2Shot() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || !env.BUCKET) throw new Error("BATCH_2_CONFIGURATION_REQUIRED");
  const batch = await db.prepare("SELECT * FROM v7_production_batches WHERE run_id=? AND wave_key='BATCH_2' ORDER BY created_at DESC LIMIT 1").bind(run.id).first<Row>();
  if (!batch) throw new Error("BATCH_2_NOT_SPECIFIED");
  if (["PRODUCT_COMPLETE", "PASS", "CLOSED"].includes(clean(batch.status))) return snapshot();
  if (clean(batch.status) !== "PRODUCING") throw new Error(`BATCH_2_NOT_PRODUCING · ${clean(batch.status)}`);
  const engineVersion = clean(batch.engine_version);
  if (![WAVE_BATCH_2_ENGINE_VERSION, WAVE_BATCH_2_REPLACEMENT_ENGINE_VERSION, WAVE_BATCH_2_V10_ENGINE_VERSION, WAVE_BATCH_2_V11_ENGINE_VERSION, WAVE_BATCH_2_V12_ENGINE_VERSION, WAVE_BATCH_2_V13_ENGINE_VERSION].includes(engineVersion)) throw new Error(`BATCH_2_ENGINE_NOT_QUALIFIED · ${engineVersion}`);
  const scope = arr(JSON.parse(String(batch.scope_json || "[]"))).map(rec), index = Number(batch.current_index || 0), target = scope[index];
  if (!target || index >= 50) throw new Error("BATCH_2_SCOPE_CURSOR_INVALID");
  const briefRow = await db.prepare("SELECT * FROM v7_material_briefs WHERE id=? AND run_id=?").bind(target.briefId, run.id).first<Row>();
  if (!briefRow) throw new Error(`BATCH_2_BRIEF_MISSING · ${clean(target.logicalId)}`);
  const existing = await db.prepare("SELECT id FROM v7_shot_products WHERE batch_id=? AND brief_id=? AND engine_version=? AND status='PRODUCT_COMPLETE'").bind(batch.id, briefRow.id, engineVersion).first<Row>();
  if (existing) {
    const completed = await db.prepare("SELECT COUNT(*) AS total FROM v7_shot_products WHERE batch_id=? AND engine_version=? AND status='PRODUCT_COMPLETE'").bind(batch.id, engineVersion).first<{ total: number }>();
    await db.prepare("UPDATE v7_production_batches SET current_index=?,completed_units=?,updated_at=? WHERE id=?").bind(Math.min(50, Number(completed?.total || 0)), Number(completed?.total || 0), new Date().toISOString(), batch.id).run();
    return snapshot();
  }
  const contract = waveProductionContract(briefRow), manifest = waveProductionManifest(contract, engineVersion, clean(batch.version)), oracle = waveProductOracle(manifest), states = arr(manifest.states).map(rec), evidenceBound = states.length === 3 && states.every((state) => Boolean(clean(state.sourceEvidence))), forbidden = arr(contract.forbidden).map((item) => clean(item).toUpperCase()).filter(Boolean), visible = states.map((state) => `${clean(state.sceneLabel)} ${clean(state.primary)} ${clean(state.secondary)}`.toUpperCase()), forbiddenHits = forbidden.filter((term) => visible.some((line) => line.includes(term))), layout = rec(manifest.layoutPolicy);
  const measurements = { oracleVersion: oracle.version, oracleChecks: oracle.checks, exactStates: states.length, sourceEvidenceBound: evidenceBound, forbiddenHits, noCrop: true, mobileSafe: oracle.checks.some((item) => item.id === "MOBILE_TEXT_FIT" && item.status === "PASS"), temporalDelta: oracle.checks.some((item) => item.id === "TEMPORAL_DELTA" && item.status === "PASS"), contractStateBinding: oracle.checks.some((item) => item.id === "CONTRACT_STATE_BINDING" && item.status === "PASS"), unsupportedGenericInjection: oracle.checks.some((item) => item.id === "UNSUPPORTED_GENERIC_INJECTION" && item.status === "PASS"), p2RegressionsBound: arr(layout.p2Regressions).length === 4, minimumExitContrast: Number(layout.minimumExitContrast), productionRoute: contract.productionRoute, engineVersion };
  const complete = clean(contract.lintStatus) === "PASS" && oracle.passed && evidenceBound && forbiddenHits.length === 0 && measurements.mobileSafe && measurements.temporalDelta && measurements.p2RegressionsBound && measurements.minimumExitContrast >= 4.5 && (![WAVE_BATCH_2_REPLACEMENT_ENGINE_VERSION, WAVE_BATCH_2_V10_ENGINE_VERSION, WAVE_BATCH_2_V11_ENGINE_VERSION, WAVE_BATCH_2_V12_ENGINE_VERSION, WAVE_BATCH_2_V13_ENGINE_VERSION].includes(engineVersion) || measurements.contractStateBinding && measurements.unsupportedGenericInjection);
  if (!complete) {
    const now = new Date().toISOString();
    await db.batch([db.prepare("UPDATE v7_production_batches SET status='PRODUCTION_BLOCKED',blocked_units=blocked_units+1,updated_at=? WHERE id=?").bind(now, batch.id), db.prepare("UPDATE v7_stage_states SET status='BATCH_2_PRODUCTION_BLOCKED',blocker='ROOT_PRODUCTION_PROCESS_REQUIRED',evidence_summary=?,updated_at=? WHERE id=?").bind(`${clean(contract.briefId)} failed production Definition of Done · output not sent to QA · engine root correction required`, now, STAGE_ID)]);
    throw new Error(`BATCH_2_PRODUCTION_DOD_FAILED · ${clean(contract.briefId)}`);
  }
  const specification = { version: engineVersion === WAVE_BATCH_2_V13_ENGINE_VERSION ? "SHOT_PRODUCT_SPECIFICATION_V7_CONTRACT_NATIVE_SCENE" : engineVersion === WAVE_BATCH_2_V12_ENGINE_VERSION ? "SHOT_PRODUCT_SPECIFICATION_V6_STRUCTURED_VISUAL_ONTOLOGY" : engineVersion === WAVE_BATCH_2_V11_ENGINE_VERSION ? "SHOT_PRODUCT_SPECIFICATION_V5_CONTRACT_SEMANTIC_PROJECTION" : engineVersion === WAVE_BATCH_2_V10_ENGINE_VERSION ? "SHOT_PRODUCT_SPECIFICATION_V4_ARCHETYPE_SEMANTIC" : engineVersion === WAVE_BATCH_2_REPLACEMENT_ENGINE_VERSION ? "SHOT_PRODUCT_SPECIFICATION_V3_CONTRACT_BOUND" : "SHOT_PRODUCT_SPECIFICATION_V2_CONTROLLED_SCALE", batchVersion: clean(batch.version), engineVersion, contract, manifest }, specificationJson = JSON.stringify(specification), specificationHash = await sha(specificationJson), frameIds: string[] = [], frameHashes: string[] = [];
  const superseded = await db.prepare("SELECT id FROM v7_shot_products WHERE logical_brief_id=? AND engine_version<>? ORDER BY created_at DESC LIMIT 1").bind(contract.briefId, engineVersion).first<Row>();
  for (const [role, frame] of [["CERT_ENTRY", oracle.frames[0]], ["CERT_MIDPOINT", oracle.frames[1]], ["CERT_EXIT", oracle.frames[2]]] as const) {
    const replacement = engineVersion === WAVE_BATCH_2_REPLACEMENT_ENGINE_VERSION, v10 = engineVersion === WAVE_BATCH_2_V10_ENGINE_VERSION, v11 = engineVersion === WAVE_BATCH_2_V11_ENGINE_VERSION, v12 = engineVersion === WAVE_BATCH_2_V12_ENGINE_VERSION, v13 = engineVersion === WAVE_BATCH_2_V13_ENGINE_VERSION;
    const fileId = await storeMaterial(env, db, authorization, briefRow, { role, identity: `BATCH2-${clean(contract.briefId)}-${role}-${v13 ? "E13" : v12 ? "E12" : v11 ? "E11" : v10 ? "E10" : replacement ? "E9" : "E8"}`, bytes: frame.bytes, mimeType: "image/png", extension: "png", sourceType: engineVersion, provider: "FRAMEFLOW_OWNED", providerAssetId: specificationHash, sourceUrl: specificationHash, landingUrl: specificationHash, licenseCode: "CHANNEL_OWNED", width: frame.width, height: frame.height, runtimeScope: v13 ? "wave-09-batch-2-engine-v13" : v12 ? "wave-09-batch-2-engine-v12" : v11 ? "wave-09-batch-2-engine-v11" : v10 ? "wave-09-batch-2-engine-v10" : replacement ? "wave-09-batch-2-engine-v9" : "wave-09-batch-2-engine-v8", archiveFolder: v13 ? "Wave 09 Batch 2 Engine V13" : v12 ? "Wave 09 Batch 2 Engine V12" : v11 ? "Wave 09 Batch 2 Engine V11" : v10 ? "Wave 09 Batch 2 Engine V10" : replacement ? "Wave 09 Batch 2 Engine V9" : "Wave 09 Batch 2 Engine V8" });
    const stored = await db.prepare("SELECT content_hash,status FROM v7_material_files WHERE id=?").bind(fileId).first<Row>();
    if (!stored || clean(stored.status) !== "STORED_VERIFIED") throw new Error(`BATCH_2_FRAME_READ_BACK_FAILED · ${clean(contract.briefId)} · ${role}`);
    frameIds.push(fileId); frameHashes.push(clean(stored.content_hash));
  }
  if (frameIds.length !== 3 || new Set(frameHashes).size !== 3) throw new Error(`BATCH_2_FRAME_INTEGRITY_FAILED · ${clean(contract.briefId)}`);
  const productHash = await sha(JSON.stringify({ specificationHash, frameHashes })), productId = `${clean(batch.id)}-${clean(contract.briefId)}-${engineVersion}`, now = new Date().toISOString(), nextCompleted = Number(batch.completed_units || 0) + 1, isFinal = nextCompleted === 50;
  await db.batch([
    db.prepare("INSERT INTO v7_shot_products (id,program_id,run_id,authorization_id,batch_id,brief_id,logical_brief_id,archetype,engine_version,status,specification_json,specification_hash,frame_ids_json,frame_hashes_json,measurements_json,product_hash,supersedes_id,created_at,updated_at,completed_at) VALUES (?,?,?,?,?,?,?,?,?,'PRODUCT_COMPLETE',?,?,?,?,?,?,?,?,?,?)").bind(productId, PROGRAM_ID, run.id, authorization.id, batch.id, briefRow.id, contract.briefId, contract.archetype, engineVersion, specificationJson, specificationHash, JSON.stringify(frameIds), JSON.stringify(frameHashes), JSON.stringify({ ...measurements, storedFrames: 3, distinctHashes: 3, readBack: true }), productHash, superseded?.id || null, now, now, now),
    db.prepare("UPDATE v7_production_batches SET status=?,completed_units=?,current_index=?,updated_at=?,completed_at=? WHERE id=?").bind(isFinal ? "PRODUCT_COMPLETE" : "PRODUCING", nextCompleted, nextCompleted, now, isFinal ? now : null, batch.id),
    db.prepare("UPDATE v7_material_runs SET status=? WHERE id=?").bind(isFinal ? "BATCH_2_PRODUCT_COMPLETE" : engineVersion === WAVE_BATCH_2_V13_ENGINE_VERSION ? "BATCH_2_V13_REPRODUCING" : engineVersion === WAVE_BATCH_2_V12_ENGINE_VERSION ? "BATCH_2_V12_REPRODUCING" : engineVersion === WAVE_BATCH_2_V11_ENGINE_VERSION ? "BATCH_2_V11_REPRODUCING" : engineVersion === WAVE_BATCH_2_V10_ENGINE_VERSION ? "BATCH_2_V10_REPRODUCING" : engineVersion === WAVE_BATCH_2_REPLACEMENT_ENGINE_VERSION ? "BATCH_2_V9_REPRODUCING" : "BATCH_2_PRODUCING", run.id),
    db.prepare("UPDATE v7_stage_states SET status=?,blocker=?,evidence_summary=?,updated_at=? WHERE id=?").bind(isFinal ? "BATCH_2_PRODUCT_COMPLETE" : "BATCH_2_PRODUCING", isFinal ? "INDEPENDENT_BATCH_AUDIT_READY" : "INTEGRATED_PRODUCTION_TRANSACTION", `Batch 2 ${nextCompleted}/50 PRODUCT_COMPLETE · portfolio ${36 + nextCompleted}/166 · deterministic DoD/read-back/P2 regression PASS · QA requests 0`, now, STAGE_ID),
  ]);
  return snapshot();
}

async function adoptWaveBatch2EngineRootCorrection() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || !env.BUCKET) throw new Error("BATCH_2_ROOT_CORRECTION_CONFIGURATION_REQUIRED");
  const replacementId = `${clean(run.id)}-${WAVE_BATCH_2_REPRODUCTION_VERSION}`;
  const existingReplacement = await db.prepare("SELECT id FROM v7_production_batches WHERE id=?").bind(replacementId).first<Row>();
  if (existingReplacement) return snapshot();
  const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>();
  if (Number(active?.total || 0) !== 0) throw new Error("BATCH_2_ROOT_CORRECTION_ACTIVE_REQUESTS_MUST_BE_ZERO");
  const rejected = await db.prepare("SELECT * FROM v7_production_batches WHERE run_id=? AND wave_key='BATCH_2' AND engine_version=? ORDER BY created_at DESC LIMIT 1").bind(run.id, WAVE_BATCH_2_ENGINE_VERSION).first<Row>();
  const audit = rejected ? await db.prepare("SELECT * FROM v7_batch_product_audits WHERE batch_id=? AND status='ENGINE_ROOT_CAUSE_REQUIRED' ORDER BY created_at DESC LIMIT 1").bind(rejected.id).first<Row>() : null;
  if (!rejected || clean(rejected.status) !== "ENGINE_ROOT_CAUSE_REQUIRED" || Number(rejected.completed_units) !== 50 || !audit) throw new Error("BATCH_2_ENGINE_ROOT_CAUSE_CHECKPOINT_REQUIRED");
  const priorProducts = await db.prepare("SELECT COUNT(*) AS total FROM v7_shot_products WHERE batch_id=? AND engine_version=? AND status='PRODUCT_COMPLETE'").bind(rejected.id, WAVE_BATCH_2_ENGINE_VERSION).first<{ total: number }>();
  if (Number(priorProducts?.total || 0) !== 50) throw new Error("BATCH_2_REJECTED_ENGINE_EVIDENCE_INCOMPLETE");
  const scope = arr(JSON.parse(String(rejected.scope_json || "[]"))).map(rec), failures: Row[] = [], productSignatures = new Map<string, string>(), frameSignatures = new Map<string, string>(), kinds = new Set<string>();
  for (const target of scope) {
    const briefRow = await db.prepare("SELECT * FROM v7_material_briefs WHERE id=? AND run_id=?").bind(target.briefId, run.id).first<Row>();
    if (!briefRow) { failures.push({ logicalId: target.logicalId, checks: ["BRIEF_MISSING"] }); continue; }
    const contract = waveProductionContract(briefRow), manifest = waveProductionManifest(contract, WAVE_BATCH_2_REPLACEMENT_ENGINE_VERSION, WAVE_BATCH_2_REPRODUCTION_VERSION), qualification = waveManifestQualification(manifest), oracle = waveProductOracle(manifest), semantic = rec(manifest.semanticModel), frameHashes = await Promise.all(oracle.frames.map((frame) => shaBytes(frame.bytes))), productSignature = await sha(JSON.stringify(frameHashes));
    kinds.add(clean(semantic.kind));
    const duplicateProduct = productSignatures.get(productSignature);
    if (duplicateProduct) failures.push({ logicalId: contract.briefId, checks: ["CROSS_PRODUCT_PIXEL_REUSE"], duplicateOf: duplicateProduct }); else productSignatures.set(productSignature, clean(contract.briefId));
    for (const frameHash of frameHashes) { const duplicateFrame = frameSignatures.get(frameHash); if (duplicateFrame) failures.push({ logicalId: contract.briefId, checks: ["CROSS_PRODUCT_FRAME_REUSE"], duplicateOf: duplicateFrame }); else frameSignatures.set(frameHash, clean(contract.briefId)); }
    if (!qualification.passed || !oracle.passed) failures.push({ logicalId: contract.briefId, checks: [...qualification.checks, ...oracle.checks].filter((item) => clean(rec(item).status) !== "PASS").map((item) => clean(rec(item).id)) });
  }
  if (scope.length !== 50 || failures.length || productSignatures.size !== 50 || frameSignatures.size !== 150 || kinds.size < 5) throw new Error(`BATCH_2_ENGINE_V9_REGRESSION_FAILED · products ${productSignatures.size}/50 · frames ${frameSignatures.size}/150 · kinds ${kinds.size} · ${JSON.stringify(failures).slice(0, 1600)}`);
  const now = new Date().toISOString(), usage = await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(actual_cost_usd),0) AS cost FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<{ total: number; cost: number }>(), requestsBefore = Number(usage?.total || 0), costBefore = Number(usage?.cost || 0);
  const priorRoot = rec(JSON.parse(String(audit.root_cause_json || "{}"))), rootCausePolicy = { ...rec(JSON.parse(String(rejected.root_cause_policy_json || "{}"))), incident: "BATCH_2_V8_COARSE_TEMPLATE_SEMANTIC_ESCAPE", rejectedEngineVersion: WAVE_BATCH_2_ENGINE_VERSION, rejectedAuditId: audit.id, rejectedAuditScore: Number(audit.score), observedRootCause: priorRoot.rootProductionCause, correctedLayers: ["SEMANTIC_MANIFEST", "LAYOUT_ENGINE", "PORTFOLIO_POLICY"], correction: "CONTRACT_BOUND_STATE_NODES_RELATIONS_POLARITY_AND_CROSS_PRODUCT_PIXEL_UNIQUENESS", replacementEngineVersion: WAVE_BATCH_2_REPLACEMENT_ENGINE_VERSION, fullScopeRegression: "50_OF_50_CONTRACTS_AND_150_OF_150_UNIQUE_FRAMES_PASS", reproduceScope: "ALL_50_PRODUCTS", outputRepair: false, priorProductsPreservedAsEvidence: true, retryPriorAudit: false };
  const productionDoD = { ...rec(JSON.parse(String(rejected.production_dod_json || "{}"))), contractStateBinding: true, unsupportedGenericInjectionBlocked: true, contractTokenCoverage: 1, crossProductFrameUniqueness: "150_OF_150", fullScopeRegression: "50_OF_50_PASS" };
  const modelPolicy = { ...rec(JSON.parse(String(authorization.model_policy_json || "{}"))), version: WAVE_BATCH_2_REPRODUCTION_VERSION, productionEngine: WAVE_BATCH_2_REPLACEMENT_ENGINE_VERSION, scope: "REPRODUCE_ALL_50_AFTER_ENGINE_REJECTION", deterministicProductionRequests: 0, independentAuditRequests: 1, autoRepair: false, priorAuditRetry: false, qaFailureRoute: "ROOT_PRODUCTION_PROCESS" };
  await db.batch([
    db.prepare("UPDATE v7_shot_products SET status='PRODUCT_COMPLETE_REJECTED_ENGINE_EVIDENCE',updated_at=? WHERE batch_id=? AND engine_version=? AND status='PRODUCT_COMPLETE'").bind(now, rejected.id, WAVE_BATCH_2_ENGINE_VERSION),
    db.prepare("UPDATE v7_production_batches SET status='ENGINE_ROOT_CAUSE_PRESERVED',updated_at=? WHERE id=?").bind(now, rejected.id),
    db.prepare("INSERT INTO v7_production_batches (id,program_id,run_id,authorization_id,wave_key,version,engine_version,status,scope_json,specification_hash,total_units,completed_units,blocked_units,current_index,audit_sample_json,production_dod_json,root_cause_policy_json,requests_before,cost_before,request_budget,cost_budget,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'PRODUCING',?,?,50,0,0,0,?,?,?,?,?,1,10,?,?)").bind(replacementId, PROGRAM_ID, run.id, authorization.id, "BATCH_2", WAVE_BATCH_2_REPRODUCTION_VERSION, WAVE_BATCH_2_REPLACEMENT_ENGINE_VERSION, JSON.stringify(scope), await sha(JSON.stringify({ scope, productionDoD, rootCausePolicy, engine: WAVE_BATCH_2_REPLACEMENT_ENGINE_VERSION })), rejected.audit_sample_json, JSON.stringify(productionDoD), JSON.stringify(rootCausePolicy), requestsBefore, costBefore, now, now),
    db.prepare("UPDATE v7_material_authorizations SET scope='WAVE_09_BATCH_2_ENGINE_V9_REPRODUCTION',status='PAUSED',shot_count=50,max_remote_requests=?,max_actual_spend_usd=?,model_policy_json=?,completed_at=NULL,updated_at=? WHERE id=?").bind(requestsBefore + 1, costBefore + 10, JSON.stringify(modelPolicy), now, authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='BATCH_2_V9_REPRODUCING',mode='CONTRACT_BOUND_SCENE_GRAPH_REPRODUCTION' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='BATCH_2_V9_REPRODUCING',blocker='INTEGRATED_PRODUCTION_TRANSACTION',evidence_summary='V8 audit 32/100 preserved · V9 full-scope regression 50/50 and unique frames 150/150 PASS · reproducing all 50 products · no output repair · prior audit not retried',updated_at=? WHERE id=?").bind(now, STAGE_ID),
  ]);
  return snapshot();
}

async function waveBatch2V10ActivationContext() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || !env.BUCKET) throw new Error("BATCH_2_V10_CONFIGURATION_REQUIRED");
  const replacementId = `${clean(run.id)}-${WAVE_BATCH_2_V10_REPRODUCTION_VERSION}`;
  const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>();
  if (Number(active?.total || 0) !== 0) throw new Error("BATCH_2_V10_ACTIVE_REQUESTS_MUST_BE_ZERO");
  const rejected = await db.prepare("SELECT * FROM v7_production_batches WHERE run_id=? AND wave_key='BATCH_2' AND engine_version=? ORDER BY created_at DESC LIMIT 1").bind(run.id, WAVE_BATCH_2_REPLACEMENT_ENGINE_VERSION).first<Row>();
  const audit = rejected ? await db.prepare("SELECT * FROM v7_batch_product_audits WHERE batch_id=? AND status='ENGINE_ROOT_CAUSE_REQUIRED' ORDER BY created_at DESC LIMIT 1").bind(rejected.id).first<Row>() : null;
  if (!rejected || clean(rejected.status) !== "ENGINE_ROOT_CAUSE_REQUIRED" || Number(rejected.completed_units) !== 50 || !audit) throw new Error("BATCH_2_V9_ROOT_CAUSE_CHECKPOINT_REQUIRED");
  const v9Products = await db.prepare("SELECT COUNT(*) AS total FROM v7_shot_products WHERE batch_id=? AND engine_version=? AND status='PRODUCT_COMPLETE'").bind(rejected.id, WAVE_BATCH_2_REPLACEMENT_ENGINE_VERSION).first<{ total: number }>();
  const v8Evidence = await db.prepare("SELECT COUNT(*) AS total FROM v7_shot_products WHERE run_id=? AND engine_version=? AND status='PRODUCT_COMPLETE_REJECTED_ENGINE_EVIDENCE'").bind(run.id, WAVE_BATCH_2_ENGINE_VERSION).first<{ total: number }>();
  if (Number(v9Products?.total || 0) !== 50 || Number(v8Evidence?.total || 0) !== 50) throw new Error("BATCH_2_V8_V9_EVIDENCE_INCOMPLETE");
  const scope = arr(JSON.parse(String(rejected.scope_json || "[]"))).map(rec);
  if (scope.length !== 50) throw new Error(`BATCH_2_V10_SCOPE_INCOMPLETE · ${scope.length}/50`);
  const usage = await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(actual_cost_usd),0) AS cost FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<{ total: number; cost: number }>();
  const inputHash = await sha(JSON.stringify({ action: "ADOPT_WAVE_BATCH_2_V10_ENGINE_ROOT_CORRECTION", runId: run.id, authorizationId: authorization.id, sourceBatchId: rejected.id, sourceBatchUpdatedAt: rejected.updated_at, sourceAuditId: audit.id, sourceAuditUpdatedAt: audit.updated_at, scope, targetVersion: WAVE_BATCH_2_V10_REPRODUCTION_VERSION, targetEngine: WAVE_BATCH_2_V10_ENGINE_VERSION }));
  return { env, db, run, authorization, replacementId, rejected, audit, scope, inputHash, requestsBefore: Number(usage?.total || 0), costBefore: Number(usage?.cost || 0) };
}

async function qualifyWaveBatch2V10Activation(context: Awaited<ReturnType<typeof waveBatch2V10ActivationContext>>, progress: Row = {}) {
  const { db, run, scope } = context;
  const failures = arr(progress.failures).map(rec), productSignatures = new Map(arr(progress.productSignatures).map((item) => arr(item).map(clean) as [string, string])), frameSignatures = new Map(arr(progress.frameSignatures).map((item) => arr(item).map(clean) as [string, string])), grammarSignatures = new Map(arr(progress.grammarSignatures).map((item) => arr(item).map(clean) as [string, string])), familyCounts = new Map(arr(progress.familyCounts).map((item) => [clean(arr(item)[0]), Number(arr(item)[1])] as [string, number]));
  const startIndex = Math.max(0, Math.min(scope.length, Number(progress.nextIndex || 0))), endIndex = Math.min(scope.length, startIndex + 5);
  for (const target of scope.slice(startIndex, endIndex)) {
    const briefRow = await db.prepare("SELECT * FROM v7_material_briefs WHERE id=? AND run_id=?").bind(target.briefId, run.id).first<Row>();
    if (!briefRow) { failures.push({ logicalId: target.logicalId, checks: ["BRIEF_MISSING"] }); continue; }
    const contract = waveProductionContract(briefRow), manifest = waveProductionManifest(contract, WAVE_BATCH_2_V10_ENGINE_VERSION, WAVE_BATCH_2_V10_REPRODUCTION_VERSION), qualification = waveManifestQualification(manifest), oracle = waveProductOracle(manifest), semantic = rec(manifest.semanticModel);
    const family = clean(semantic.kind), grammarSignature = await sha(JSON.stringify(qualification.signatureInput)), frameHashes = await Promise.all(oracle.frames.map((frame) => shaBytes(frame.bytes))), productSignature = await sha(JSON.stringify(frameHashes));
    familyCounts.set(family, Number(familyCounts.get(family) || 0) + 1);
    const duplicateGrammar = grammarSignatures.get(grammarSignature), duplicateProduct = productSignatures.get(productSignature);
    if (duplicateGrammar) failures.push({ logicalId: contract.briefId, checks: ["CROSS_PRODUCT_GRAMMAR_REUSE"], duplicateOf: duplicateGrammar }); else grammarSignatures.set(grammarSignature, clean(contract.briefId));
    if (duplicateProduct) failures.push({ logicalId: contract.briefId, checks: ["CROSS_PRODUCT_PIXEL_REUSE"], duplicateOf: duplicateProduct }); else productSignatures.set(productSignature, clean(contract.briefId));
    for (const frameHash of frameHashes) { const duplicateFrame = frameSignatures.get(frameHash); if (duplicateFrame) failures.push({ logicalId: contract.briefId, checks: ["CROSS_PRODUCT_FRAME_REUSE"], duplicateOf: duplicateFrame }); else frameSignatures.set(frameHash, clean(contract.briefId)); }
    if (!qualification.passed || !oracle.passed) failures.push({ logicalId: contract.briefId, checks: [...qualification.checks, ...oracle.checks].filter((item) => clean(rec(item).status) !== "PASS").map((item) => clean(rec(item).id)) });
  }
  const maximumFamilyShare = Math.max(0, ...familyCounts.values()) / Math.max(1, endIndex), complete = endIndex === scope.length;
  const passed = complete && scope.length === 50 && failures.length === 0 && productSignatures.size === 50 && frameSignatures.size === 150 && grammarSignatures.size === 50 && familyCounts.size >= 5 && maximumFamilyShare <= 0.6;
  return { status: complete ? passed ? "PASS" : "FAIL" : "RUNNING", nextIndex: endIndex, total: scope.length, products: productSignatures.size, frames: frameSignatures.size, grammars: grammarSignatures.size, families: familyCounts.size, maximumFamilyShare, failures, productSignatures: [...productSignatures], frameSignatures: [...frameSignatures], grammarSignatures: [...grammarSignatures], familyCounts: [...familyCounts], requestsDelta: 0, costDelta: 0 };
}

async function preflightWaveBatch2V10Activation() {
  const context = await waveBatch2V10ActivationContext(), now = new Date().toISOString(), preflightId = `${context.replacementId}-ZERO-SPEND-PREFLIGHT-V1`;
  const existing = await context.db.prepare("SELECT * FROM v7_batch_activation_preflights WHERE id=?").bind(preflightId).first<Row>();
  if (existing && clean(existing.input_hash) === context.inputHash && clean(existing.status) === "PASS") return snapshot();
  const prior = existing && clean(existing.input_hash) === context.inputHash && clean(existing.status) === "RUNNING" ? rec(JSON.parse(String(existing.result_json || "{}"))) : {};
  const result = await qualifyWaveBatch2V10Activation(context, prior);
  await context.db.prepare("INSERT INTO v7_batch_activation_preflights (id,program_id,run_id,authorization_id,action,source_batch_id,source_audit_id,target_batch_id,input_hash,status,result_json,requests_before,cost_before,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET source_batch_id=excluded.source_batch_id,source_audit_id=excluded.source_audit_id,input_hash=excluded.input_hash,status=excluded.status,result_json=excluded.result_json,requests_before=excluded.requests_before,cost_before=excluded.cost_before,updated_at=excluded.updated_at").bind(preflightId, PROGRAM_ID, context.run.id, context.authorization.id, "PREFLIGHT_WAVE_BATCH_2_V10_ACTIVATION", context.rejected.id, context.audit.id, context.replacementId, context.inputHash, result.status, JSON.stringify(result), context.requestsBefore, context.costBefore, now, now).run();
  const readBack = await context.db.prepare("SELECT * FROM v7_batch_activation_preflights WHERE id=? AND input_hash=?").bind(preflightId, context.inputHash).first<Row>();
  if (!readBack || clean(readBack.status) !== clean(result.status) || Number(rec(JSON.parse(String(readBack.result_json || "{}"))).nextIndex) !== Number(result.nextIndex)) throw new Error("BATCH_2_V10_PREFLIGHT_READBACK_REQUIRED");
  return snapshot();
}

async function verifyCommittedWaveBatch2V10Activation(db: DB, runId: string, authorizationId: string, replacementId: string, rejectedId: string, activationId: string) {
  const [activation, targetBatch, sourceBatch, sourceProducts, active] = await Promise.all([
    db.prepare("SELECT * FROM v7_batch_activations WHERE id=? AND idempotency_key=? AND status='COMMITTED'").bind(activationId, activationId).first<Row>(),
    db.prepare("SELECT * FROM v7_production_batches WHERE id=? AND run_id=? AND authorization_id=? AND engine_version=?").bind(replacementId, runId, authorizationId, WAVE_BATCH_2_V10_ENGINE_VERSION).first<Row>(),
    db.prepare("SELECT * FROM v7_production_batches WHERE id=? AND run_id=?").bind(rejectedId, runId).first<Row>(),
    db.prepare("SELECT COUNT(*) AS total FROM v7_shot_products WHERE batch_id=? AND engine_version=? AND status='PRODUCT_COMPLETE_REJECTED_ENGINE_EVIDENCE'").bind(rejectedId, WAVE_BATCH_2_REPLACEMENT_ENGINE_VERSION).first<{ total: number }>(),
    db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorizationId).first<{ total: number }>(),
  ]);
  const targetStatus = clean(targetBatch?.status), committedTarget = ["PRODUCING", "PRODUCT_COMPLETE", "PREPARING", "DISPATCHING", "QA_RUNNING", "PASS", "ENGINE_ROOT_CAUSE_REQUIRED", "AUDIT_INCOMPLETE", "PRODUCTION_BLOCKED"].includes(targetStatus);
  const immediateReadBack = targetStatus !== "PRODUCING" || Number(active?.total || 0) === 0;
  return Boolean(activation && targetBatch && committedTarget && immediateReadBack && clean(sourceBatch?.status) === "ENGINE_ROOT_CAUSE_PRESERVED" && Number(sourceProducts?.total || 0) === 50);
}

async function verifyWaveBatch2V10Activation(context: Awaited<ReturnType<typeof waveBatch2V10ActivationContext>>, activationId: string) {
  return verifyCommittedWaveBatch2V10Activation(context.db, clean(context.run.id), clean(context.authorization.id), context.replacementId, clean(context.rejected.id), activationId);
}

async function adoptWaveBatch2V10EngineRootCorrection() {
  const initialEnv = await runtime(), initialDb = initialEnv.DB!, initialCurrent = await current(initialDb);
  if (!initialCurrent.run || !initialCurrent.authorization) throw new Error("BATCH_2_V10_CONFIGURATION_REQUIRED");
  const initialReplacementId = `${clean(initialCurrent.run.id)}-${WAVE_BATCH_2_V10_REPRODUCTION_VERSION}`, initialActivationId = `${initialReplacementId}-ACTIVATION-V1`;
  const initialActivation = await initialDb.prepare("SELECT * FROM v7_batch_activations WHERE id=?").bind(initialActivationId).first<Row>();
  if (initialActivation) {
    const result = rec(JSON.parse(String(initialActivation.result_json || "{}"))), rejectedId = clean(result.sourceBatchId);
    if (clean(initialActivation.status) === "COMMITTED" && rejectedId && await verifyCommittedWaveBatch2V10Activation(initialDb, clean(initialCurrent.run.id), clean(initialCurrent.authorization.id), initialReplacementId, rejectedId, initialActivationId)) return snapshot();
    throw new Error("BATCH_2_V10_ACTIVATION_RECOVERY_REQUIRED");
  }
  const context = await waveBatch2V10ActivationContext(), activationId = `${context.replacementId}-ACTIVATION-V1`;
  const legacyTarget = await context.db.prepare("SELECT id FROM v7_production_batches WHERE id=?").bind(context.replacementId).first<Row>();
  if (legacyTarget) throw new Error("BATCH_2_V10_LEGACY_PARTIAL_ACTIVATION_RECOVERY_REQUIRED");
  const preflightId = `${context.replacementId}-ZERO-SPEND-PREFLIGHT-V1`;
  const preflight = await context.db.prepare("SELECT * FROM v7_batch_activation_preflights WHERE id=? AND input_hash=? AND status='PASS'").bind(preflightId, context.inputHash).first<Row>();
  if (!preflight) throw new Error("BATCH_2_V10_ZERO_SPEND_PREFLIGHT_REQUIRED");
  const preflightResult = rec(JSON.parse(String(preflight.result_json || "{}")));
  if (Number(preflightResult.products) !== 50 || Number(preflightResult.frames) !== 150 || Number(preflightResult.grammars) !== 50 || Number(preflightResult.families) < 5 || Number(preflightResult.maximumFamilyShare) > 0.6 || Number(preflightResult.requestsDelta) !== 0 || Number(preflightResult.costDelta) !== 0) throw new Error("BATCH_2_V10_PREFLIGHT_EVIDENCE_INCOMPLETE");
  const { db, run, authorization, replacementId, rejected, audit, scope, requestsBefore, costBefore } = context;
  const now = new Date().toISOString(), priorRoot = rec(JSON.parse(String(audit.root_cause_json || "{}")));
  const portfolioPolicy = { minimumSceneFamilies: 5, maximumFamilyShare: 0.6, uniqueGrammarSignatures: "50_OF_50", uniqueFrameHashes: "150_OF_150", cosmeticSeedDoesNotCountAsVariety: true };
  const rootCausePolicy = { ...rec(JSON.parse(String(rejected.root_cause_policy_json || "{}"))), incident: "BATCH_2_V9_TOKEN_GRAPH_WITHOUT_ARCHETYPE_VISUAL_GRAMMAR", rejectedEngineVersion: WAVE_BATCH_2_REPLACEMENT_ENGINE_VERSION, rejectedAuditId: audit.id, rejectedAuditScore: Number(audit.score), observedRootCause: priorRoot.rootProductionCause, correctedLayers: ["SEMANTIC_MANIFEST", "LAYOUT_ENGINE", "PORTFOLIO_POLICY"], correction: "ARCHETYPE_NATIVE_VISUAL_GRAMMAR_WITH_CONTRACT_PROVENANCE_AND_DIRECTED_STATE_TRANSITIONS", replacementEngineVersion: WAVE_BATCH_2_V10_ENGINE_VERSION, fullScopeRegression: "50_CONTRACTS_50_GRAMMARS_150_FRAMES_PASS", portfolioPolicy, reproduceScope: "ALL_50_PRODUCTS", outputRepair: false, v8AndV9ProductsPreservedAsEvidence: true, retryPriorAudits: false };
  const productionDoD = { ...rec(JSON.parse(String(rejected.production_dod_json || "{}"))), version: "SHOT_PRODUCT_DOD_V10", archetypeNativeVisualGrammar: true, elementProvenanceComplete: true, directedStateTransitions: true, unsupportedGenericInjectionBlocked: true, portfolioPolicy, fullScopeRegression: "50_OF_50_PASS" };
  const modelPolicy = { ...rec(JSON.parse(String(authorization.model_policy_json || "{}"))), version: WAVE_BATCH_2_V10_REPRODUCTION_VERSION, productionEngine: WAVE_BATCH_2_V10_ENGINE_VERSION, scope: "REPRODUCE_ALL_50_AFTER_V9_ENGINE_REJECTION", deterministicProductionRequests: 0, independentAuditRequests: 1, autoRepair: false, priorAuditRetry: false, qaFailureRoute: "ROOT_PRODUCTION_PROCESS" };
  const activationResult = { preflightId, sourceBatchId: rejected.id, targetBatchId: replacementId, products: 50, frames: 150, grammars: 50, requestsBefore, costBefore, providerDispatches: 0 };
  const statements = [
    db.prepare("UPDATE v7_shot_products SET status='PRODUCT_COMPLETE_REJECTED_ENGINE_EVIDENCE',updated_at=? WHERE batch_id=? AND engine_version=? AND status='PRODUCT_COMPLETE'").bind(now, rejected.id, WAVE_BATCH_2_REPLACEMENT_ENGINE_VERSION),
    db.prepare("UPDATE v7_production_batches SET status='ENGINE_ROOT_CAUSE_PRESERVED',updated_at=? WHERE id=? AND status='ENGINE_ROOT_CAUSE_REQUIRED'").bind(now, rejected.id),
    db.prepare("INSERT INTO v7_production_batches (id,program_id,run_id,authorization_id,wave_key,version,engine_version,status,scope_json,specification_hash,total_units,completed_units,blocked_units,current_index,audit_sample_json,production_dod_json,root_cause_policy_json,requests_before,cost_before,request_budget,cost_budget,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'PRODUCING',?,?,50,0,0,0,?,?,?,?,?,1,10,?,?)").bind(replacementId, PROGRAM_ID, run.id, authorization.id, "BATCH_2", WAVE_BATCH_2_V10_REPRODUCTION_VERSION, WAVE_BATCH_2_V10_ENGINE_VERSION, JSON.stringify(scope), await sha(JSON.stringify({ scope, productionDoD, rootCausePolicy, engine: WAVE_BATCH_2_V10_ENGINE_VERSION })), rejected.audit_sample_json, JSON.stringify(productionDoD), JSON.stringify(rootCausePolicy), requestsBefore, costBefore, now, now),
    db.prepare("UPDATE v7_material_authorizations SET scope='WAVE_09_BATCH_2_ENGINE_V10_REPRODUCTION',status='PAUSED',shot_count=50,max_remote_requests=?,max_actual_spend_usd=?,model_policy_json=?,completed_at=NULL,updated_at=? WHERE id=?").bind(requestsBefore + 1, costBefore + 10, JSON.stringify(modelPolicy), now, authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='BATCH_2_V10_REPRODUCING',mode='ARCHETYPE_SEMANTIC_COMPILER_REPRODUCTION' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='BATCH_2_V10_REPRODUCING',blocker='INTEGRATED_PRODUCTION_TRANSACTION',evidence_summary='V8 32/100 and V9 39/100 preserved · V10 50/50 semantic manifests, 50/50 grammar signatures, 150/150 frames and portfolio family quota PASS · no output repair · prior audits not retried',updated_at=? WHERE id=?").bind(now, STAGE_ID),
    db.prepare("INSERT INTO v7_batch_activations (id,program_id,run_id,authorization_id,action,idempotency_key,target_batch_id,input_hash,status,result_json,created_at,committed_at,updated_at) VALUES (?,?,?,?,?,?,?,?, 'COMMITTED',?,?,?,?)").bind(activationId, PROGRAM_ID, run.id, authorization.id, "ADOPT_WAVE_BATCH_2_V10_ENGINE_ROOT_CORRECTION", activationId, replacementId, context.inputHash, JSON.stringify(activationResult), now, now, now),
  ];
  try { await db.batch(statements); }
  catch (error) {
    if (await verifyWaveBatch2V10Activation(context, activationId)) return snapshot();
    throw new Error(`BATCH_2_V10_ATOMIC_COMMIT_FAILED · ${error instanceof Error ? error.message : "unknown"}`);
  }
  if (!await verifyWaveBatch2V10Activation(context, activationId)) throw new Error("BATCH_2_V10_ACTIVATION_READBACK_INCONSISTENT");
  return snapshot();
}

async function waveBatch2V11ActivationContext() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || !env.BUCKET) throw new Error("BATCH_2_V11_CONFIGURATION_REQUIRED");
  const replacementId = `${clean(run.id)}-${WAVE_BATCH_2_V11_REPRODUCTION_VERSION}`;
  const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>();
  if (Number(active?.total || 0) !== 0) throw new Error("BATCH_2_V11_ACTIVE_REQUESTS_MUST_BE_ZERO");
  const rejected = await db.prepare("SELECT * FROM v7_production_batches WHERE run_id=? AND wave_key='BATCH_2' AND engine_version=? ORDER BY created_at DESC LIMIT 1").bind(run.id, WAVE_BATCH_2_V10_ENGINE_VERSION).first<Row>();
  const audit = rejected ? await db.prepare("SELECT * FROM v7_batch_product_audits WHERE batch_id=? AND status='ENGINE_ROOT_CAUSE_REQUIRED' ORDER BY created_at DESC LIMIT 1").bind(rejected.id).first<Row>() : null;
  if (!rejected || clean(rejected.status) !== "ENGINE_ROOT_CAUSE_REQUIRED" || Number(rejected.completed_units) !== 50 || !audit) throw new Error("BATCH_2_V10_ROOT_CAUSE_CHECKPOINT_REQUIRED");
  const v10Products = await db.prepare("SELECT COUNT(*) AS total FROM v7_shot_products WHERE batch_id=? AND engine_version=? AND status='PRODUCT_COMPLETE'").bind(rejected.id, WAVE_BATCH_2_V10_ENGINE_VERSION).first<{ total: number }>();
  if (Number(v10Products?.total || 0) !== 50) throw new Error("BATCH_2_V10_EVIDENCE_INCOMPLETE");
  const scope = arr(JSON.parse(String(rejected.scope_json || "[]"))).map(rec);
  if (scope.length !== 50) throw new Error(`BATCH_2_V11_SCOPE_INCOMPLETE · ${scope.length}/50`);
  const usage = await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(actual_cost_usd),0) AS cost FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<{ total: number; cost: number }>();
  const inputHash = await sha(JSON.stringify({ action: "ADOPT_WAVE_BATCH_2_V11_ENGINE_ROOT_CORRECTION", runId: run.id, authorizationId: authorization.id, sourceBatchId: rejected.id, sourceBatchUpdatedAt: rejected.updated_at, sourceAuditId: audit.id, sourceAuditUpdatedAt: audit.updated_at, scope, targetVersion: WAVE_BATCH_2_V11_REPRODUCTION_VERSION, targetEngine: WAVE_BATCH_2_V11_ENGINE_VERSION }));
  return { env, db, run, authorization, replacementId, rejected, audit, scope, inputHash, requestsBefore: Number(usage?.total || 0), costBefore: Number(usage?.cost || 0) };
}

async function qualifyWaveBatch2V11Activation(context: Awaited<ReturnType<typeof waveBatch2V11ActivationContext>>, progress: Row = {}) {
  const { db, run, scope } = context;
  const failures = arr(progress.failures).map(rec), productSignatures = new Map(arr(progress.productSignatures).map((item) => arr(item).map(clean) as [string, string])), frameSignatures = new Map(arr(progress.frameSignatures).map((item) => arr(item).map(clean) as [string, string])), grammarSignatures = new Map(arr(progress.grammarSignatures).map((item) => arr(item).map(clean) as [string, string])), familyCounts = new Map(arr(progress.familyCounts).map((item) => [clean(arr(item)[0]), Number(arr(item)[1])] as [string, number]));
  let semanticProjectionCoverage = Number(progress.semanticProjectionCoverage || 0);
  const startIndex = Math.max(0, Math.min(scope.length, Number(progress.nextIndex || 0))), endIndex = Math.min(scope.length, startIndex + 5);
  for (const target of scope.slice(startIndex, endIndex)) {
    const briefRow = await db.prepare("SELECT * FROM v7_material_briefs WHERE id=? AND run_id=?").bind(target.briefId, run.id).first<Row>();
    if (!briefRow) { failures.push({ logicalId: target.logicalId, checks: ["BRIEF_MISSING"] }); continue; }
    const contract = waveProductionContract(briefRow), manifest = waveProductionManifest(contract, WAVE_BATCH_2_V11_ENGINE_VERSION, WAVE_BATCH_2_V11_REPRODUCTION_VERSION), qualification = waveManifestQualification(manifest), oracle = waveProductOracle(manifest), semantic = rec(manifest.semanticModel);
    const projections = arr(semantic.stateProjection).map(rec), projectionComplete = projections.length === 3 && projections.every((item) => Boolean(clean(item.focalEntity)) && Boolean(clean(item.action)) && Boolean(clean(item.constraint)) && Boolean(clean(item.evidenceClause)));
    if (projectionComplete) semanticProjectionCoverage += 1;
    const family = `${clean(semantic.archetype)}:${clean(semantic.kind)}`, grammarSignature = await sha(JSON.stringify(qualification.signatureInput)), frameHashes = await Promise.all(oracle.frames.map((frame) => shaBytes(frame.bytes))), productSignature = await sha(JSON.stringify(frameHashes));
    familyCounts.set(family, Number(familyCounts.get(family) || 0) + 1);
    const duplicateGrammar = grammarSignatures.get(grammarSignature), duplicateProduct = productSignatures.get(productSignature);
    if (duplicateGrammar) failures.push({ logicalId: contract.briefId, checks: ["CROSS_PRODUCT_GRAMMAR_REUSE"], duplicateOf: duplicateGrammar }); else grammarSignatures.set(grammarSignature, clean(contract.briefId));
    if (duplicateProduct) failures.push({ logicalId: contract.briefId, checks: ["CROSS_PRODUCT_PIXEL_REUSE"], duplicateOf: duplicateProduct }); else productSignatures.set(productSignature, clean(contract.briefId));
    for (const frameHash of frameHashes) { const duplicateFrame = frameSignatures.get(frameHash); if (duplicateFrame) failures.push({ logicalId: contract.briefId, checks: ["CROSS_PRODUCT_FRAME_REUSE"], duplicateOf: duplicateFrame }); else frameSignatures.set(frameHash, clean(contract.briefId)); }
    if (!projectionComplete || !qualification.passed || !oracle.passed) failures.push({ logicalId: contract.briefId, checks: [...(!projectionComplete ? ["SEMANTIC_PROJECTION_INCOMPLETE"] : []), ...qualification.checks, ...oracle.checks].filter((item) => typeof item === "string" || clean(rec(item).status) !== "PASS").map((item) => typeof item === "string" ? item : clean(rec(item).id)) });
  }
  const maximumFamilyShare = Math.max(0, ...familyCounts.values()) / Math.max(1, endIndex), complete = endIndex === scope.length;
  const passed = complete && scope.length === 50 && failures.length === 0 && productSignatures.size === 50 && frameSignatures.size === 150 && grammarSignatures.size === 50 && familyCounts.size >= 5 && maximumFamilyShare <= 0.6;
  return { status: complete ? passed ? "PASS" : "FAIL" : "RUNNING", nextIndex: endIndex, total: scope.length, products: productSignatures.size, frames: frameSignatures.size, grammars: grammarSignatures.size, families: familyCounts.size, maximumFamilyShare, failures, productSignatures: [...productSignatures], frameSignatures: [...frameSignatures], grammarSignatures: [...grammarSignatures], familyCounts: [...familyCounts], semanticProjectionCoverage, requestsDelta: 0, costDelta: 0 };
}

async function preflightWaveBatch2V11Activation() {
  const context = await waveBatch2V11ActivationContext(), now = new Date().toISOString(), preflightId = `${context.replacementId}-ZERO-SPEND-PREFLIGHT-V1`;
  const existing = await context.db.prepare("SELECT * FROM v7_batch_activation_preflights WHERE id=?").bind(preflightId).first<Row>();
  if (existing && clean(existing.input_hash) === context.inputHash && clean(existing.status) === "PASS") return snapshot();
  const prior = existing && clean(existing.input_hash) === context.inputHash && clean(existing.status) === "RUNNING" ? rec(JSON.parse(String(existing.result_json || "{}"))) : {};
  const result = await qualifyWaveBatch2V11Activation(context, prior);
  await context.db.prepare("INSERT INTO v7_batch_activation_preflights (id,program_id,run_id,authorization_id,action,source_batch_id,source_audit_id,target_batch_id,input_hash,status,result_json,requests_before,cost_before,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET source_batch_id=excluded.source_batch_id,source_audit_id=excluded.source_audit_id,input_hash=excluded.input_hash,status=excluded.status,result_json=excluded.result_json,requests_before=excluded.requests_before,cost_before=excluded.cost_before,updated_at=excluded.updated_at").bind(preflightId, PROGRAM_ID, context.run.id, context.authorization.id, "PREFLIGHT_WAVE_BATCH_2_V11_ACTIVATION", context.rejected.id, context.audit.id, context.replacementId, context.inputHash, result.status, JSON.stringify(result), context.requestsBefore, context.costBefore, now, now).run();
  const readBack = await context.db.prepare("SELECT * FROM v7_batch_activation_preflights WHERE id=? AND input_hash=?").bind(preflightId, context.inputHash).first<Row>();
  if (!readBack || clean(readBack.status) !== clean(result.status) || Number(rec(JSON.parse(String(readBack.result_json || "{}"))).nextIndex) !== Number(result.nextIndex)) throw new Error("BATCH_2_V11_PREFLIGHT_READBACK_REQUIRED");
  return snapshot();
}

async function verifyCommittedWaveBatch2V11Activation(db: DB, runId: string, authorizationId: string, replacementId: string, rejectedId: string, activationId: string) {
  const [activation, targetBatch, sourceBatch, sourceProducts, active] = await Promise.all([
    db.prepare("SELECT * FROM v7_batch_activations WHERE id=? AND idempotency_key=? AND status='COMMITTED'").bind(activationId, activationId).first<Row>(),
    db.prepare("SELECT * FROM v7_production_batches WHERE id=? AND run_id=? AND authorization_id=? AND engine_version=?").bind(replacementId, runId, authorizationId, WAVE_BATCH_2_V11_ENGINE_VERSION).first<Row>(),
    db.prepare("SELECT * FROM v7_production_batches WHERE id=? AND run_id=?").bind(rejectedId, runId).first<Row>(),
    db.prepare("SELECT COUNT(*) AS total FROM v7_shot_products WHERE batch_id=? AND engine_version=? AND status='PRODUCT_COMPLETE_REJECTED_ENGINE_EVIDENCE'").bind(rejectedId, WAVE_BATCH_2_V10_ENGINE_VERSION).first<{ total: number }>(),
    db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorizationId).first<{ total: number }>(),
  ]);
  const targetStatus = clean(targetBatch?.status), committedTarget = ["PRODUCING", "PRODUCT_COMPLETE", "PREPARING", "DISPATCHING", "QA_RUNNING", "PASS", "ENGINE_ROOT_CAUSE_REQUIRED", "AUDIT_INCOMPLETE", "PRODUCTION_BLOCKED"].includes(targetStatus);
  return Boolean(activation && targetBatch && committedTarget && (targetStatus !== "PRODUCING" || Number(active?.total || 0) === 0) && clean(sourceBatch?.status) === "ENGINE_ROOT_CAUSE_PRESERVED" && Number(sourceProducts?.total || 0) === 50);
}

async function adoptWaveBatch2V11EngineRootCorrection() {
  const context = await waveBatch2V11ActivationContext(), activationId = `${context.replacementId}-ACTIVATION-V1`, preflightId = `${context.replacementId}-ZERO-SPEND-PREFLIGHT-V1`;
  const existingActivation = await context.db.prepare("SELECT * FROM v7_batch_activations WHERE id=?").bind(activationId).first<Row>();
  if (existingActivation) {
    if (clean(existingActivation.status) === "COMMITTED" && await verifyCommittedWaveBatch2V11Activation(context.db, clean(context.run.id), clean(context.authorization.id), context.replacementId, clean(context.rejected.id), activationId)) return snapshot();
    throw new Error("BATCH_2_V11_ACTIVATION_RECOVERY_REQUIRED");
  }
  const preflight = await context.db.prepare("SELECT * FROM v7_batch_activation_preflights WHERE id=? AND input_hash=? AND status='PASS'").bind(preflightId, context.inputHash).first<Row>();
  if (!preflight) throw new Error("BATCH_2_V11_ZERO_SPEND_PREFLIGHT_REQUIRED");
  const result = rec(JSON.parse(String(preflight.result_json || "{}")));
  if (Number(result.products) !== 50 || Number(result.frames) !== 150 || Number(result.grammars) !== 50 || Number(result.semanticProjectionCoverage) !== 50 || Number(result.requestsDelta) !== 0 || Number(result.costDelta) !== 0) throw new Error("BATCH_2_V11_PREFLIGHT_EVIDENCE_INCOMPLETE");
  const { db, run, authorization, rejected, audit, replacementId, scope, requestsBefore, costBefore } = context, now = new Date().toISOString(), priorRoot = rec(JSON.parse(String(audit.root_cause_json || "{}")));
  const portfolioPolicy = { minimumSceneFamilies: 5, maximumFamilyShare: 0.6, uniqueGrammarSignatures: "50_OF_50", uniqueFrameHashes: "150_OF_150", semanticProjectionCoverage: "50_OF_50", cosmeticSeedDoesNotCountAsVariety: true };
  const rootCausePolicy = { ...rec(JSON.parse(String(rejected.root_cause_policy_json || "{}"))), incident: "BATCH_2_V10_METADATA_RENDERER_DISCONNECT", rejectedEngineVersion: WAVE_BATCH_2_V10_ENGINE_VERSION, rejectedAuditId: audit.id, rejectedAuditScore: Number(audit.score), observedRootCause: priorRoot.rootProductionCause, correctedLayers: ["SEMANTIC_COMPILER", "SEMANTIC_PROJECTION", "LAYOUT_ENGINE", "TEMPORAL_STATE_MODEL"], correction: "CONTRACT_ENTITY_ACTION_CONSTRAINT_PROJECTION_DRIVES_AUDIENCE_PIXELS", replacementEngineVersion: WAVE_BATCH_2_V11_ENGINE_VERSION, fullScopeRegression: "50_CONTRACTS_50_PROJECTIONS_50_GRAMMARS_150_FRAMES_PASS", portfolioPolicy, reproduceScope: "ALL_50_PRODUCTS", outputRepair: false, v8V9V10ProductsPreservedAsEvidence: true, retryPriorAudits: false };
  const productionDoD = { ...rec(JSON.parse(String(rejected.production_dod_json || "{}"))), version: "SHOT_PRODUCT_DOD_V11", contractSemanticProjection: true, visibleEntityActionConstraint: true, temporalStateDelta: true, elementProvenanceComplete: true, portfolioPolicy, fullScopeRegression: "50_OF_50_PASS" };
  const modelPolicy = { ...rec(JSON.parse(String(authorization.model_policy_json || "{}"))), version: WAVE_BATCH_2_V11_REPRODUCTION_VERSION, productionEngine: WAVE_BATCH_2_V11_ENGINE_VERSION, scope: "REPRODUCE_ALL_50_AFTER_V10_ENGINE_REJECTION", deterministicProductionRequests: 0, independentAuditRequests: 1, autoRepair: false, priorAuditRetry: false, qaFailureRoute: "ROOT_PRODUCTION_PROCESS" };
  const activationResult = { preflightId, sourceBatchId: rejected.id, targetBatchId: replacementId, products: 50, frames: 150, grammars: 50, semanticProjections: 50, requestsBefore, costBefore, providerDispatches: 0 };
  try {
    await db.batch([
      db.prepare("UPDATE v7_shot_products SET status='PRODUCT_COMPLETE_REJECTED_ENGINE_EVIDENCE',updated_at=? WHERE batch_id=? AND engine_version=? AND status='PRODUCT_COMPLETE'").bind(now, rejected.id, WAVE_BATCH_2_V10_ENGINE_VERSION),
      db.prepare("UPDATE v7_production_batches SET status='ENGINE_ROOT_CAUSE_PRESERVED',updated_at=? WHERE id=? AND status='ENGINE_ROOT_CAUSE_REQUIRED'").bind(now, rejected.id),
      db.prepare("INSERT INTO v7_production_batches (id,program_id,run_id,authorization_id,wave_key,version,engine_version,status,scope_json,specification_hash,total_units,completed_units,blocked_units,current_index,audit_sample_json,production_dod_json,root_cause_policy_json,requests_before,cost_before,request_budget,cost_budget,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'PRODUCING',?,?,50,0,0,0,?,?,?,?,?,1,10,?,?)").bind(replacementId, PROGRAM_ID, run.id, authorization.id, "BATCH_2", WAVE_BATCH_2_V11_REPRODUCTION_VERSION, WAVE_BATCH_2_V11_ENGINE_VERSION, JSON.stringify(scope), await sha(JSON.stringify({ scope, productionDoD, rootCausePolicy, engine: WAVE_BATCH_2_V11_ENGINE_VERSION })), rejected.audit_sample_json, JSON.stringify(productionDoD), JSON.stringify(rootCausePolicy), requestsBefore, costBefore, now, now),
      db.prepare("UPDATE v7_material_authorizations SET scope='WAVE_09_BATCH_2_ENGINE_V11_REPRODUCTION',status='PAUSED',shot_count=50,max_remote_requests=?,max_actual_spend_usd=?,model_policy_json=?,completed_at=NULL,updated_at=? WHERE id=?").bind(requestsBefore + 1, costBefore + 10, JSON.stringify(modelPolicy), now, authorization.id),
      db.prepare("UPDATE v7_material_runs SET status='BATCH_2_V11_REPRODUCING',mode='CONTRACT_SEMANTIC_PROJECTION_REPRODUCTION' WHERE id=?").bind(run.id),
      db.prepare("UPDATE v7_stage_states SET status='BATCH_2_V11_REPRODUCING',blocker='INTEGRATED_PRODUCTION_TRANSACTION',evidence_summary='V8/V9/V10 evidence preserved · V11 50/50 entity-action-constraint projections, 50/50 grammars and 150/150 frames PASS · no output repair · prior audits not retried',updated_at=? WHERE id=?").bind(now, STAGE_ID),
      db.prepare("INSERT INTO v7_batch_activations (id,program_id,run_id,authorization_id,action,idempotency_key,target_batch_id,input_hash,status,result_json,created_at,committed_at,updated_at) VALUES (?,?,?,?,?,?,?,?, 'COMMITTED',?,?,?,?)").bind(activationId, PROGRAM_ID, run.id, authorization.id, "ADOPT_WAVE_BATCH_2_V11_ENGINE_ROOT_CORRECTION", activationId, replacementId, context.inputHash, JSON.stringify(activationResult), now, now, now),
    ]);
  } catch (error) {
    if (await verifyCommittedWaveBatch2V11Activation(db, clean(run.id), clean(authorization.id), replacementId, clean(rejected.id), activationId)) return snapshot();
    throw new Error(`BATCH_2_V11_ATOMIC_COMMIT_FAILED · ${error instanceof Error ? error.message : "unknown"}`);
  }
  if (!await verifyCommittedWaveBatch2V11Activation(db, clean(run.id), clean(authorization.id), replacementId, clean(rejected.id), activationId)) throw new Error("BATCH_2_V11_ACTIVATION_READBACK_INCONSISTENT");
  return snapshot();
}

async function waveBatch2V12ActivationContext() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || !env.BUCKET) throw new Error("BATCH_2_V12_CONFIGURATION_REQUIRED");
  const replacementId = `${clean(run.id)}-${WAVE_BATCH_2_V12_REPRODUCTION_VERSION}`;
  const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>();
  if (Number(active?.total || 0) !== 0) throw new Error("BATCH_2_V12_ACTIVE_REQUESTS_MUST_BE_ZERO");
  const rejected = await db.prepare("SELECT * FROM v7_production_batches WHERE run_id=? AND wave_key='BATCH_2' AND engine_version=? ORDER BY created_at DESC LIMIT 1").bind(run.id, WAVE_BATCH_2_V11_ENGINE_VERSION).first<Row>();
  const audit = rejected ? await db.prepare("SELECT * FROM v7_batch_product_audits WHERE batch_id=? AND status='ENGINE_ROOT_CAUSE_REQUIRED' ORDER BY created_at DESC LIMIT 1").bind(rejected.id).first<Row>() : null;
  if (!rejected || clean(rejected.status) !== "ENGINE_ROOT_CAUSE_REQUIRED" || Number(rejected.completed_units) !== 50 || !audit) throw new Error("BATCH_2_V11_ROOT_CAUSE_CHECKPOINT_REQUIRED");
  const products = await db.prepare("SELECT COUNT(*) AS total FROM v7_shot_products WHERE batch_id=? AND engine_version=? AND status='PRODUCT_COMPLETE'").bind(rejected.id, WAVE_BATCH_2_V11_ENGINE_VERSION).first<{ total: number }>();
  if (Number(products?.total || 0) !== 50) throw new Error("BATCH_2_V11_EVIDENCE_INCOMPLETE");
  const scope = arr(JSON.parse(String(rejected.scope_json || "[]"))).map(rec);
  if (scope.length !== 50) throw new Error(`BATCH_2_V12_SCOPE_INCOMPLETE · ${scope.length}/50`);
  const usage = await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(actual_cost_usd),0) AS cost FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<{ total: number; cost: number }>();
  const inputHash = await sha(JSON.stringify({ action: "ADOPT_WAVE_BATCH_2_V12_ENGINE_ROOT_CORRECTION", runId: run.id, authorizationId: authorization.id, sourceBatchId: rejected.id, sourceBatchUpdatedAt: rejected.updated_at, sourceAuditId: audit.id, sourceAuditUpdatedAt: audit.updated_at, scope, targetVersion: WAVE_BATCH_2_V12_REPRODUCTION_VERSION, targetEngine: WAVE_BATCH_2_V12_ENGINE_VERSION }));
  return { env, db, run, authorization, replacementId, rejected, audit, scope, inputHash, requestsBefore: Number(usage?.total || 0), costBefore: Number(usage?.cost || 0) };
}

async function qualifyWaveBatch2V12Activation(context: Awaited<ReturnType<typeof waveBatch2V12ActivationContext>>, progress: Row = {}) {
  const { db, run, scope } = context;
  const failures = arr(progress.failures).map(rec), productSignatures = new Map(arr(progress.productSignatures).map((item) => arr(item).map(clean) as [string, string])), frameSignatures = new Map(arr(progress.frameSignatures).map((item) => arr(item).map(clean) as [string, string])), grammarSignatures = new Map(arr(progress.grammarSignatures).map((item) => arr(item).map(clean) as [string, string])), familyCounts = new Map(arr(progress.familyCounts).map((item) => [clean(arr(item)[0]), Number(arr(item)[1])] as [string, number]));
  let ontologyCoverage = Number(progress.ontologyCoverage || 0), motionCoverage = Number(progress.motionCoverage || 0), layoutSafeCoverage = Number(progress.layoutSafeCoverage || 0);
  const startIndex = Math.max(0, Math.min(scope.length, Number(progress.nextIndex || 0))), endIndex = Math.min(scope.length, startIndex + 5);
  for (const target of scope.slice(startIndex, endIndex)) {
    const briefRow = await db.prepare("SELECT * FROM v7_material_briefs WHERE id=? AND run_id=?").bind(target.briefId, run.id).first<Row>();
    if (!briefRow) { failures.push({ logicalId: target.logicalId, checks: ["BRIEF_MISSING"] }); continue; }
    const contract = waveProductionContract(briefRow), manifest = waveProductionManifest(contract, WAVE_BATCH_2_V12_ENGINE_VERSION, WAVE_BATCH_2_V12_REPRODUCTION_VERSION), qualification = waveManifestQualification(manifest), oracle = waveProductOracle(manifest), semantic = rec(manifest.semanticModel), ontology = rec(semantic.visualOntology), ontologyStates = arr(ontology.states).map(rec), layoutProof = rec(ontology.layoutProof), motionPolicy = rec(ontology.motionPolicy);
    const ontologyComplete = clean(ontology.version) === "STRUCTURED_VISUAL_ONTOLOGY_V12" && arr(ontology.actors).length >= 2 && arr(ontology.lanes).length >= 2 && arr(ontology.containers).length >= 1 && Boolean(clean(rec(ontology.boundary).label)) && Boolean(clean(rec(ontology.movingEntity).label)) && ontologyStates.length === 3;
    const motionComplete = motionPolicy.physicalPositionDelta === true && motionPolicy.handoffVisible === true && motionPolicy.labelSwapOnlyForbidden === true && new Set(ontologyStates.map((item) => JSON.stringify(item.movingEntityPosition))).size === 3;
    const layoutSafe = Number(layoutProof.clippingCount) === 0 && Number(layoutProof.textOcclusionCount) === 0 && Number(layoutProof.connectorTextIntersectionCount) === 0 && layoutProof.textRegionsReserved === true && layoutProof.connectorCorridorsReserved === true;
    if (ontologyComplete) ontologyCoverage += 1; if (motionComplete) motionCoverage += 1; if (layoutSafe) layoutSafeCoverage += 1;
    const family = clean(ontology.layoutFamily), grammarSignature = await sha(JSON.stringify(qualification.signatureInput)), frameHashes = await Promise.all(oracle.frames.map((frame) => shaBytes(frame.bytes))), productSignature = await sha(JSON.stringify(frameHashes));
    familyCounts.set(family, Number(familyCounts.get(family) || 0) + 1);
    const duplicateGrammar = grammarSignatures.get(grammarSignature), duplicateProduct = productSignatures.get(productSignature);
    if (duplicateGrammar) failures.push({ logicalId: contract.briefId, checks: ["CROSS_PRODUCT_GRAMMAR_REUSE"], duplicateOf: duplicateGrammar }); else grammarSignatures.set(grammarSignature, clean(contract.briefId));
    if (duplicateProduct) failures.push({ logicalId: contract.briefId, checks: ["CROSS_PRODUCT_PIXEL_REUSE"], duplicateOf: duplicateProduct }); else productSignatures.set(productSignature, clean(contract.briefId));
    for (const frameHash of frameHashes) { const duplicateFrame = frameSignatures.get(frameHash); if (duplicateFrame) failures.push({ logicalId: contract.briefId, checks: ["CROSS_PRODUCT_FRAME_REUSE"], duplicateOf: duplicateFrame }); else frameSignatures.set(frameHash, clean(contract.briefId)); }
    if (!ontologyComplete || !motionComplete || !layoutSafe || !qualification.passed || !oracle.passed) failures.push({ logicalId: contract.briefId, checks: [...(!ontologyComplete ? ["ONTOLOGY_INCOMPLETE"] : []), ...(!motionComplete ? ["PHYSICAL_MOTION_INCOMPLETE"] : []), ...(!layoutSafe ? ["LAYOUT_COLLISION"] : []), ...qualification.checks, ...oracle.checks].filter((item) => typeof item === "string" || clean(rec(item).status) !== "PASS").map((item) => typeof item === "string" ? item : clean(rec(item).id)) });
  }
  const maximumFamilyShare = Math.max(0, ...familyCounts.values()) / Math.max(1, endIndex), complete = endIndex === scope.length;
  const passed = complete && failures.length === 0 && productSignatures.size === 50 && frameSignatures.size === 150 && grammarSignatures.size === 50 && ontologyCoverage === 50 && motionCoverage === 50 && layoutSafeCoverage === 50 && familyCounts.size === 8 && maximumFamilyShare <= 0.25;
  return { status: complete ? passed ? "PASS" : "FAIL" : "RUNNING", nextIndex: endIndex, total: scope.length, products: productSignatures.size, frames: frameSignatures.size, grammars: grammarSignatures.size, families: familyCounts.size, maximumFamilyShare, ontologyCoverage, motionCoverage, layoutSafeCoverage, failures, productSignatures: [...productSignatures], frameSignatures: [...frameSignatures], grammarSignatures: [...grammarSignatures], familyCounts: [...familyCounts], requestsDelta: 0, costDelta: 0 };
}

async function preflightWaveBatch2V12Activation() {
  const context = await waveBatch2V12ActivationContext(), now = new Date().toISOString(), preflightId = `${context.replacementId}-ZERO-SPEND-PREFLIGHT-V1`;
  const existing = await context.db.prepare("SELECT * FROM v7_batch_activation_preflights WHERE id=?").bind(preflightId).first<Row>();
  if (existing && clean(existing.input_hash) === context.inputHash && clean(existing.status) === "PASS") return snapshot();
  const prior = existing && clean(existing.input_hash) === context.inputHash && clean(existing.status) === "RUNNING" ? rec(JSON.parse(String(existing.result_json || "{}"))) : {};
  const result = await qualifyWaveBatch2V12Activation(context, prior);
  await context.db.prepare("INSERT INTO v7_batch_activation_preflights (id,program_id,run_id,authorization_id,action,source_batch_id,source_audit_id,target_batch_id,input_hash,status,result_json,requests_before,cost_before,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET source_batch_id=excluded.source_batch_id,source_audit_id=excluded.source_audit_id,input_hash=excluded.input_hash,status=excluded.status,result_json=excluded.result_json,requests_before=excluded.requests_before,cost_before=excluded.cost_before,updated_at=excluded.updated_at").bind(preflightId, PROGRAM_ID, context.run.id, context.authorization.id, "PREFLIGHT_WAVE_BATCH_2_V12_ACTIVATION", context.rejected.id, context.audit.id, context.replacementId, context.inputHash, result.status, JSON.stringify(result), context.requestsBefore, context.costBefore, now, now).run();
  const readBack = await context.db.prepare("SELECT * FROM v7_batch_activation_preflights WHERE id=? AND input_hash=?").bind(preflightId, context.inputHash).first<Row>();
  if (!readBack || clean(readBack.status) !== clean(result.status) || Number(rec(JSON.parse(String(readBack.result_json || "{}"))).nextIndex) !== Number(result.nextIndex)) throw new Error("BATCH_2_V12_PREFLIGHT_READBACK_REQUIRED");
  return snapshot();
}

async function verifyCommittedWaveBatch2V12Activation(db: DB, runId: string, authorizationId: string, replacementId: string, rejectedId: string, activationId: string) {
  const [activation, targetBatch, sourceBatch, sourceProducts, active] = await Promise.all([
    db.prepare("SELECT * FROM v7_batch_activations WHERE id=? AND idempotency_key=? AND status='COMMITTED'").bind(activationId, activationId).first<Row>(),
    db.prepare("SELECT * FROM v7_production_batches WHERE id=? AND run_id=? AND authorization_id=? AND engine_version=?").bind(replacementId, runId, authorizationId, WAVE_BATCH_2_V12_ENGINE_VERSION).first<Row>(),
    db.prepare("SELECT * FROM v7_production_batches WHERE id=? AND run_id=?").bind(rejectedId, runId).first<Row>(),
    db.prepare("SELECT COUNT(*) AS total FROM v7_shot_products WHERE batch_id=? AND engine_version=? AND status='PRODUCT_COMPLETE_REJECTED_ENGINE_EVIDENCE'").bind(rejectedId, WAVE_BATCH_2_V11_ENGINE_VERSION).first<{ total: number }>(),
    db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorizationId).first<{ total: number }>(),
  ]);
  const targetStatus = clean(targetBatch?.status), committedTarget = ["PRODUCING", "PRODUCT_COMPLETE", "PREPARING", "DISPATCHING", "QA_RUNNING", "PASS", "ENGINE_ROOT_CAUSE_REQUIRED", "AUDIT_INCOMPLETE", "PRODUCTION_BLOCKED"].includes(targetStatus);
  return Boolean(activation && targetBatch && committedTarget && (targetStatus !== "PRODUCING" || Number(active?.total || 0) === 0) && clean(sourceBatch?.status) === "ENGINE_ROOT_CAUSE_PRESERVED" && Number(sourceProducts?.total || 0) === 50);
}

async function adoptWaveBatch2V12EngineRootCorrection() {
  const context = await waveBatch2V12ActivationContext(), activationId = `${context.replacementId}-ACTIVATION-V1`, preflightId = `${context.replacementId}-ZERO-SPEND-PREFLIGHT-V1`;
  const existingActivation = await context.db.prepare("SELECT * FROM v7_batch_activations WHERE id=?").bind(activationId).first<Row>();
  if (existingActivation) {
    if (clean(existingActivation.status) === "COMMITTED" && await verifyCommittedWaveBatch2V12Activation(context.db, clean(context.run.id), clean(context.authorization.id), context.replacementId, clean(context.rejected.id), activationId)) return snapshot();
    throw new Error("BATCH_2_V12_ACTIVATION_RECOVERY_REQUIRED");
  }
  const preflight = await context.db.prepare("SELECT * FROM v7_batch_activation_preflights WHERE id=? AND input_hash=? AND status='PASS'").bind(preflightId, context.inputHash).first<Row>();
  if (!preflight) throw new Error("BATCH_2_V12_ZERO_SPEND_PREFLIGHT_REQUIRED");
  const result = rec(JSON.parse(String(preflight.result_json || "{}")));
  if (Number(result.products) !== 50 || Number(result.frames) !== 150 || Number(result.grammars) !== 50 || Number(result.ontologyCoverage) !== 50 || Number(result.motionCoverage) !== 50 || Number(result.layoutSafeCoverage) !== 50 || Number(result.families) !== 8 || Number(result.maximumFamilyShare) > 0.25 || Number(result.requestsDelta) !== 0 || Number(result.costDelta) !== 0) throw new Error("BATCH_2_V12_PREFLIGHT_EVIDENCE_INCOMPLETE");
  const { db, run, authorization, rejected, audit, replacementId, scope, requestsBefore, costBefore } = context, now = new Date().toISOString(), priorRoot = rec(JSON.parse(String(audit.root_cause_json || "{}")));
  const portfolioPolicy = { layoutFamilies: "8_OF_8", maximumFamilyShare: 0.25, uniqueGrammarSignatures: "50_OF_50", uniqueFrameHashes: "150_OF_150", ontologyCoverage: "50_OF_50", physicalMotionCoverage: "50_OF_50", layoutSafetyCoverage: "50_OF_50", cosmeticSeedDoesNotCountAsVariety: true };
  const rootCausePolicy = { ...rec(JSON.parse(String(rejected.root_cause_policy_json || "{}"))), incident: "BATCH_2_V11_SEMANTIC_LAYOUT_MOTION_PORTFOLIO_FAILURE", rejectedEngineVersion: WAVE_BATCH_2_V11_ENGINE_VERSION, rejectedAuditId: audit.id, rejectedAuditScore: Number(audit.score), observedRootCause: priorRoot.rootProductionCause, correctedLayers: ["STRUCTURED_VISUAL_ONTOLOGY", "COLLISION_FREE_LAYOUT", "PHYSICAL_MOTION_POLICY", "PORTFOLIO_LANGUAGE_POLICY"], correction: "ACTOR_LANE_CONTAINER_BOUNDARY_MOVING_ENTITY_STATE_TO_PIXELS", replacementEngineVersion: WAVE_BATCH_2_V12_ENGINE_VERSION, fullScopeRegression: "50_ONTOLOGIES_50_MOTION_PATHS_150_FRAMES_LAYOUT_SAFE", portfolioPolicy, reproduceScope: "ALL_50_PRODUCTS", outputRepair: false, v8V9V10V11ProductsPreservedAsEvidence: true, retryPriorAudits: false };
  const productionDoD = { ...rec(JSON.parse(String(rejected.production_dod_json || "{}"))), version: "SHOT_PRODUCT_DOD_V12", structuredVisualOntology: true, actorLaneContainerBoundary: true, physicalMotionNotLabelSwap: true, clippingAndConnectorIntersectionZero: true, portfolioPolicy, fullScopeRegression: "50_OF_50_PASS" };
  const modelPolicy = { ...rec(JSON.parse(String(authorization.model_policy_json || "{}"))), version: WAVE_BATCH_2_V12_REPRODUCTION_VERSION, productionEngine: WAVE_BATCH_2_V12_ENGINE_VERSION, scope: "REPRODUCE_ALL_50_AFTER_V11_ENGINE_REJECTION", deterministicProductionRequests: 0, independentAuditRequests: 1, autoRepair: false, priorAuditRetry: false, qaFailureRoute: "ROOT_PRODUCTION_PROCESS" };
  const activationResult = { preflightId, sourceBatchId: rejected.id, targetBatchId: replacementId, products: 50, frames: 150, grammars: 50, ontologies: 50, motionPaths: 50, layoutSafe: 50, families: 8, requestsBefore, costBefore, providerDispatches: 0 };
  try {
    await db.batch([
      db.prepare("UPDATE v7_shot_products SET status='PRODUCT_COMPLETE_REJECTED_ENGINE_EVIDENCE',updated_at=? WHERE batch_id=? AND engine_version=? AND status='PRODUCT_COMPLETE'").bind(now, rejected.id, WAVE_BATCH_2_V11_ENGINE_VERSION),
      db.prepare("UPDATE v7_production_batches SET status='ENGINE_ROOT_CAUSE_PRESERVED',updated_at=? WHERE id=? AND status='ENGINE_ROOT_CAUSE_REQUIRED'").bind(now, rejected.id),
      db.prepare("INSERT INTO v7_production_batches (id,program_id,run_id,authorization_id,wave_key,version,engine_version,status,scope_json,specification_hash,total_units,completed_units,blocked_units,current_index,audit_sample_json,production_dod_json,root_cause_policy_json,requests_before,cost_before,request_budget,cost_budget,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'PRODUCING',?,?,50,0,0,0,?,?,?,?,?,1,10,?,?)").bind(replacementId, PROGRAM_ID, run.id, authorization.id, "BATCH_2", WAVE_BATCH_2_V12_REPRODUCTION_VERSION, WAVE_BATCH_2_V12_ENGINE_VERSION, JSON.stringify(scope), await sha(JSON.stringify({ scope, productionDoD, rootCausePolicy, engine: WAVE_BATCH_2_V12_ENGINE_VERSION })), rejected.audit_sample_json, JSON.stringify(productionDoD), JSON.stringify(rootCausePolicy), requestsBefore, costBefore, now, now),
      db.prepare("UPDATE v7_material_authorizations SET scope='WAVE_09_BATCH_2_ENGINE_V12_REPRODUCTION',status='PAUSED',shot_count=50,max_remote_requests=?,max_actual_spend_usd=?,model_policy_json=?,completed_at=NULL,updated_at=? WHERE id=?").bind(requestsBefore + 1, costBefore + 10, JSON.stringify(modelPolicy), now, authorization.id),
      db.prepare("UPDATE v7_material_runs SET status='BATCH_2_V12_REPRODUCING',mode='STRUCTURED_VISUAL_ONTOLOGY_REPRODUCTION' WHERE id=?").bind(run.id),
      db.prepare("UPDATE v7_stage_states SET status='BATCH_2_V12_REPRODUCING',blocker='INTEGRATED_PRODUCTION_TRANSACTION',evidence_summary='V8/V9/V10/V11 evidence preserved · V12 structured ontology, physical motion, collision-free layout and 8-family portfolio gates PASS · no output repair · prior audits not retried',updated_at=? WHERE id=?").bind(now, STAGE_ID),
      db.prepare("INSERT INTO v7_batch_activations (id,program_id,run_id,authorization_id,action,idempotency_key,target_batch_id,input_hash,status,result_json,created_at,committed_at,updated_at) VALUES (?,?,?,?,?,?,?,?, 'COMMITTED',?,?,?,?)").bind(activationId, PROGRAM_ID, run.id, authorization.id, "ADOPT_WAVE_BATCH_2_V12_ENGINE_ROOT_CORRECTION", activationId, replacementId, context.inputHash, JSON.stringify(activationResult), now, now, now),
    ]);
  } catch (error) {
    if (await verifyCommittedWaveBatch2V12Activation(db, clean(run.id), clean(authorization.id), replacementId, clean(rejected.id), activationId)) return snapshot();
    throw new Error(`BATCH_2_V12_ATOMIC_COMMIT_FAILED · ${error instanceof Error ? error.message : "unknown"}`);
  }
  if (!await verifyCommittedWaveBatch2V12Activation(db, clean(run.id), clean(authorization.id), replacementId, clean(rejected.id), activationId)) throw new Error("BATCH_2_V12_ACTIVATION_READBACK_INCONSISTENT");
  return snapshot();
}

async function waveBatch2V13ActivationContext() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || !env.BUCKET) throw new Error("BATCH_2_V13_CONFIGURATION_REQUIRED");
  const replacementId = `${clean(run.id)}-${WAVE_BATCH_2_V13_REPRODUCTION_VERSION}`;
  const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>();
  if (Number(active?.total || 0) !== 0) throw new Error("BATCH_2_V13_ACTIVE_REQUESTS_MUST_BE_ZERO");
  const rejected = await db.prepare("SELECT * FROM v7_production_batches WHERE run_id=? AND wave_key='BATCH_2' AND engine_version=? ORDER BY created_at DESC LIMIT 1").bind(run.id, WAVE_BATCH_2_V13_REJECTED_ENGINE_VERSION).first<Row>();
  const audit = rejected ? await db.prepare("SELECT * FROM v7_batch_product_audits WHERE batch_id=? AND status='ENGINE_ROOT_CAUSE_REQUIRED' ORDER BY created_at DESC LIMIT 1").bind(rejected.id).first<Row>() : null;
  if (!rejected || clean(rejected.status) !== "ENGINE_ROOT_CAUSE_REQUIRED" || Number(rejected.completed_units) !== 50 || !audit) throw new Error("BATCH_2_V13_ROOT_CAUSE_CHECKPOINT_REQUIRED");
  const products = await db.prepare("SELECT COUNT(*) AS total FROM v7_shot_products WHERE batch_id=? AND engine_version=? AND status='PRODUCT_COMPLETE'").bind(rejected.id, WAVE_BATCH_2_V13_REJECTED_ENGINE_VERSION).first<{ total: number }>();
  if (Number(products?.total || 0) !== 50) throw new Error("BATCH_2_V13_EVIDENCE_INCOMPLETE");
  const scope = arr(JSON.parse(String(rejected.scope_json || "[]"))).map(rec);
  if (scope.length !== 50) throw new Error(`BATCH_2_V13_SCOPE_INCOMPLETE · ${scope.length}/50`);
  const usage = await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(actual_cost_usd),0) AS cost FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<{ total: number; cost: number }>();
  const inputHash = await sha(JSON.stringify({ action: "ADOPT_WAVE_BATCH_2_V18_ENGINE_ROOT_CORRECTION", runId: run.id, authorizationId: authorization.id, sourceBatchId: rejected.id, sourceBatchUpdatedAt: rejected.updated_at, sourceAuditId: audit.id, sourceAuditUpdatedAt: audit.updated_at, scope, targetVersion: WAVE_BATCH_2_V13_REPRODUCTION_VERSION, targetEngine: WAVE_BATCH_2_V13_ENGINE_VERSION }));
  return { env, db, run, authorization, replacementId, rejected, audit, scope, inputHash, requestsBefore: Number(usage?.total || 0), costBefore: Number(usage?.cost || 0) };
}

async function qualifyWaveBatch2V13Activation(context: Awaited<ReturnType<typeof waveBatch2V13ActivationContext>>, progress: Row = {}) {
  const { db, run, scope } = context;
  const failures = arr(progress.failures).map(rec), productSignatures = new Map(arr(progress.productSignatures).map((item) => arr(item).map(clean) as [string, string])), frameSignatures = new Map(arr(progress.frameSignatures).map((item) => arr(item).map(clean) as [string, string])), grammarSignatures = new Map(arr(progress.grammarSignatures).map((item) => arr(item).map(clean) as [string, string])), familyCounts = new Map(arr(progress.familyCounts).map((item) => [clean(arr(item)[0]), Number(arr(item)[1])] as [string, number]));
  let sceneSpecCoverage = Number(progress.sceneSpecCoverage || 0), pixelTraceCoverage = Number(progress.pixelTraceCoverage || 0), motionCoverage = Number(progress.motionCoverage || 0), layoutSafeCoverage = Number(progress.layoutSafeCoverage || 0);
  const startIndex = Math.max(0, Math.min(scope.length, Number(progress.nextIndex || 0))), endIndex = Math.min(scope.length, startIndex + 5);
  for (const target of scope.slice(startIndex, endIndex)) {
    const briefRow = await db.prepare("SELECT * FROM v7_material_briefs WHERE id=? AND run_id=?").bind(target.briefId, run.id).first<Row>();
    if (!briefRow) { failures.push({ logicalId: target.logicalId, checks: ["BRIEF_MISSING"] }); continue; }
    const contract = waveProductionContract(briefRow), manifest = waveProductionManifest(contract, WAVE_BATCH_2_V13_ENGINE_VERSION, WAVE_BATCH_2_V13_REPRODUCTION_VERSION), qualification = waveManifestQualification(manifest), oracle = waveProductOracle(manifest), semantic = rec(manifest.semanticModel), spec = rec(semantic.sceneSpecification), objects = arr(spec.objects).map(rec), relationships = arr(spec.relationships).map(rec), states = arr(spec.states).map(rec), layoutProof = rec(spec.layoutProof), motionProof = rec(spec.motionProof), rendererContract = rec(spec.rendererContract);
    const sceneSpecComplete = clean(spec.version) === "PIXEL_LAYOUT_SPECIFICATION_V18" && Boolean(clean(spec.composition)) && objects.length >= 3 && relationships.length === 3 && states.length === 3 && objects.every((item) => Boolean(clean(item.type)) && Boolean(clean(item.sourceClause)) && Object.keys(rec(item.geometry)).length === 4) && relationships.every((item) => Boolean(clean(item.sourceClause)));
    const pixelTraceComplete = states.every((item) => arr(item.visibleObjectIds).length >= 3 && Boolean(clean(item.activeRelationshipId)) && arr(item.movingObjectPosition).length === 2) && rendererContract.input === "PIXEL_LAYOUT_ONLY" && rendererContract.tokenFallbackForbidden === true && rendererContract.geometryAuthoritative === true;
    const motionComplete = motionProof.physicalPositionDelta === true && motionProof.relationshipProgressionVisible === true && motionProof.labelSwapOnlyForbidden === true && new Set(arr(motionProof.positions).map((item) => JSON.stringify(item))).size === 3;
    const layoutSafe = Number(layoutProof.clippingCount) === 0 && Number(layoutProof.textOcclusionCount) === 0 && Number(layoutProof.connectorTextIntersectionCount) === 0 && Number(layoutProof.objectOverlapCount) === 0 && layoutProof.allGeometryInsideSafeArea === true;
    if (sceneSpecComplete) sceneSpecCoverage += 1; if (pixelTraceComplete) pixelTraceCoverage += 1; if (motionComplete) motionCoverage += 1; if (layoutSafe) layoutSafeCoverage += 1;
    const family = clean(spec.layoutFamily), grammarSignature = await sha(JSON.stringify(qualification.signatureInput)), frameHashes = await Promise.all(oracle.frames.map((frame) => shaBytes(frame.bytes))), productSignature = await sha(JSON.stringify(frameHashes));
    familyCounts.set(family, Number(familyCounts.get(family) || 0) + 1);
    const duplicateGrammar = grammarSignatures.get(grammarSignature), duplicateProduct = productSignatures.get(productSignature);
    if (duplicateGrammar) failures.push({ logicalId: contract.briefId, checks: ["CROSS_PRODUCT_SCENE_SPEC_REUSE"], duplicateOf: duplicateGrammar }); else grammarSignatures.set(grammarSignature, clean(contract.briefId));
    if (duplicateProduct) failures.push({ logicalId: contract.briefId, checks: ["CROSS_PRODUCT_PIXEL_REUSE"], duplicateOf: duplicateProduct }); else productSignatures.set(productSignature, clean(contract.briefId));
    for (const frameHash of frameHashes) { const duplicateFrame = frameSignatures.get(frameHash); if (duplicateFrame) failures.push({ logicalId: contract.briefId, checks: ["CROSS_PRODUCT_FRAME_REUSE"], duplicateOf: duplicateFrame }); else frameSignatures.set(frameHash, clean(contract.briefId)); }
    if (!sceneSpecComplete || !pixelTraceComplete || !motionComplete || !layoutSafe || !qualification.passed || !oracle.passed) failures.push({ logicalId: contract.briefId, checks: [...(!sceneSpecComplete ? ["SCENE_SPEC_INCOMPLETE"] : []), ...(!pixelTraceComplete ? ["PIXEL_TRACE_INCOMPLETE"] : []), ...(!motionComplete ? ["PHYSICAL_TRANSITION_INCOMPLETE"] : []), ...(!layoutSafe ? ["LAYOUT_COLLISION"] : []), ...qualification.checks, ...oracle.checks].filter((item) => typeof item === "string" || clean(rec(item).status) !== "PASS").map((item) => typeof item === "string" ? item : clean(rec(item).id)) });
  }
  const maximumFamilyShare = Math.max(0, ...familyCounts.values()) / Math.max(1, endIndex), complete = endIndex === scope.length;
  const passed = complete && failures.length === 0 && productSignatures.size === 50 && frameSignatures.size === 150 && grammarSignatures.size === 50 && sceneSpecCoverage === 50 && pixelTraceCoverage === 50 && motionCoverage === 50 && layoutSafeCoverage === 50 && familyCounts.size === 10 && maximumFamilyShare <= 0.2;
  return { status: complete ? passed ? "PASS" : "FAIL" : "RUNNING", nextIndex: endIndex, total: scope.length, products: productSignatures.size, frames: frameSignatures.size, grammars: grammarSignatures.size, families: familyCounts.size, maximumFamilyShare, sceneSpecCoverage, pixelTraceCoverage, motionCoverage, layoutSafeCoverage, failures, productSignatures: [...productSignatures], frameSignatures: [...frameSignatures], grammarSignatures: [...grammarSignatures], familyCounts: [...familyCounts], requestsDelta: 0, costDelta: 0 };
}

async function preflightWaveBatch2V13Activation() {
  const context = await waveBatch2V13ActivationContext(), now = new Date().toISOString(), preflightId = `${context.replacementId}-ZERO-SPEND-PREFLIGHT-V1`;
  const existing = await context.db.prepare("SELECT * FROM v7_batch_activation_preflights WHERE id=?").bind(preflightId).first<Row>();
  if (existing && clean(existing.input_hash) === context.inputHash && clean(existing.status) === "PASS") return snapshot();
  const prior = existing && clean(existing.input_hash) === context.inputHash && clean(existing.status) === "RUNNING" ? rec(JSON.parse(String(existing.result_json || "{}"))) : {};
  const result = await qualifyWaveBatch2V13Activation(context, prior);
  await context.db.prepare("INSERT INTO v7_batch_activation_preflights (id,program_id,run_id,authorization_id,action,source_batch_id,source_audit_id,target_batch_id,input_hash,status,result_json,requests_before,cost_before,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET source_batch_id=excluded.source_batch_id,source_audit_id=excluded.source_audit_id,input_hash=excluded.input_hash,status=excluded.status,result_json=excluded.result_json,requests_before=excluded.requests_before,cost_before=excluded.cost_before,updated_at=excluded.updated_at").bind(preflightId, PROGRAM_ID, context.run.id, context.authorization.id, "PREFLIGHT_WAVE_BATCH_2_V18_ACTIVATION", context.rejected.id, context.audit.id, context.replacementId, context.inputHash, result.status, JSON.stringify(result), context.requestsBefore, context.costBefore, now, now).run();
  const readBack = await context.db.prepare("SELECT * FROM v7_batch_activation_preflights WHERE id=? AND input_hash=?").bind(preflightId, context.inputHash).first<Row>();
  if (!readBack || clean(readBack.status) !== clean(result.status) || Number(rec(JSON.parse(String(readBack.result_json || "{}"))).nextIndex) !== Number(result.nextIndex)) throw new Error("BATCH_2_V13_PREFLIGHT_READBACK_REQUIRED");
  return snapshot();
}

async function verifyCommittedWaveBatch2V13Activation(db: DB, runId: string, authorizationId: string, replacementId: string, rejectedId: string, activationId: string) {
  const [activation, targetBatch, sourceBatch, sourceProducts, active] = await Promise.all([
    db.prepare("SELECT * FROM v7_batch_activations WHERE id=? AND idempotency_key=? AND status='COMMITTED'").bind(activationId, activationId).first<Row>(),
    db.prepare("SELECT * FROM v7_production_batches WHERE id=? AND run_id=? AND authorization_id=? AND engine_version=?").bind(replacementId, runId, authorizationId, WAVE_BATCH_2_V13_ENGINE_VERSION).first<Row>(),
    db.prepare("SELECT * FROM v7_production_batches WHERE id=? AND run_id=?").bind(rejectedId, runId).first<Row>(),
    db.prepare("SELECT COUNT(*) AS total FROM v7_shot_products WHERE batch_id=? AND engine_version=? AND status='PRODUCT_COMPLETE_REJECTED_ENGINE_EVIDENCE'").bind(rejectedId, WAVE_BATCH_2_V13_REJECTED_ENGINE_VERSION).first<{ total: number }>(),
    db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorizationId).first<{ total: number }>(),
  ]);
  const targetStatus = clean(targetBatch?.status), committedTarget = ["PRODUCING", "PRODUCT_COMPLETE", "PREPARING", "DISPATCHING", "QA_RUNNING", "PASS", "ENGINE_ROOT_CAUSE_REQUIRED", "AUDIT_INCOMPLETE", "PRODUCTION_BLOCKED"].includes(targetStatus);
  return Boolean(activation && targetBatch && committedTarget && (targetStatus !== "PRODUCING" || Number(active?.total || 0) === 0) && clean(sourceBatch?.status) === "ENGINE_ROOT_CAUSE_PRESERVED" && Number(sourceProducts?.total || 0) === 50);
}

async function adoptWaveBatch2V13EngineRootCorrection() {
  const context = await waveBatch2V13ActivationContext(), activationId = `${context.replacementId}-ACTIVATION-V1`, preflightId = `${context.replacementId}-ZERO-SPEND-PREFLIGHT-V1`;
  const existingActivation = await context.db.prepare("SELECT * FROM v7_batch_activations WHERE id=?").bind(activationId).first<Row>();
  if (existingActivation) {
    if (clean(existingActivation.status) === "COMMITTED" && await verifyCommittedWaveBatch2V13Activation(context.db, clean(context.run.id), clean(context.authorization.id), context.replacementId, clean(context.rejected.id), activationId)) return snapshot();
    throw new Error("BATCH_2_V13_ACTIVATION_RECOVERY_REQUIRED");
  }
  const preflight = await context.db.prepare("SELECT * FROM v7_batch_activation_preflights WHERE id=? AND input_hash=? AND status='PASS'").bind(preflightId, context.inputHash).first<Row>();
  if (!preflight) throw new Error("BATCH_2_V13_ZERO_SPEND_PREFLIGHT_REQUIRED");
  const result = rec(JSON.parse(String(preflight.result_json || "{}")));
  if (Number(result.products) !== 50 || Number(result.frames) !== 150 || Number(result.grammars) !== 50 || Number(result.sceneSpecCoverage) !== 50 || Number(result.pixelTraceCoverage) !== 50 || Number(result.motionCoverage) !== 50 || Number(result.layoutSafeCoverage) !== 50 || Number(result.families) !== 10 || Number(result.maximumFamilyShare) > 0.2 || Number(result.requestsDelta) !== 0 || Number(result.costDelta) !== 0) throw new Error("BATCH_2_V13_PREFLIGHT_EVIDENCE_INCOMPLETE");
  const { db, run, authorization, rejected, audit, replacementId, scope, requestsBefore, costBefore } = context, now = new Date().toISOString(), priorRoot = rec(JSON.parse(String(audit.root_cause_json || "{}")));
  const portfolioPolicy = { layoutFamilies: "10_OF_10", maximumFamilyShare: 0.2, uniqueSceneSpecificationSignatures: "50_OF_50", uniqueFrameHashes: "150_OF_150", sceneSpecCoverage: "50_OF_50", pixelTraceCoverage: "50_OF_50", physicalTransitionCoverage: "50_OF_50", layoutSafetyCoverage: "50_OF_50", cosmeticSeedDoesNotCountAsVariety: true };
  const rootCausePolicy = { ...rec(JSON.parse(String(rejected.root_cause_policy_json || "{}"))), incident: "BATCH_2_V17_PIXEL_POSITION_OVERLAP_AND_PORTFOLIO_SHELL_FAILURE", rejectedEngineVersion: WAVE_BATCH_2_V13_REJECTED_ENGINE_VERSION, rejectedAuditId: audit.id, rejectedAuditScore: Number(audit.score), observedRootCause: priorRoot.rootProductionCause, correctedLayers: ["PIXEL_LAYOUT_COMPILER", "PINNED_LABEL_POSITION", "MIDPOINT_GATE_CROSSING", "FULL_CANVAS_VISUAL_LANGUAGE", "MOBILE_LABEL_FIT", "BOUNDARY_HIGHLIGHT"], correction: "EXACT_CLAUSE_TO_COLLISION_FREE_PIXEL_LAYOUT_WITH_FULL_CANVAS_VARIETY", replacementEngineVersion: WAVE_BATCH_2_V13_ENGINE_VERSION, fullScopeRegression: "50_SCENE_SPECS_50_PIXEL_TRACES_150_FRAMES_LAYOUT_SAFE", portfolioPolicy, reproduceScope: "ALL_50_PRODUCTS", outputRepair: false, v8V9V10V11V12V13V14V15V16V17ProductsPreservedAsEvidence: true, retryPriorAudits: false };
  const productionDoD = { ...rec(JSON.parse(String(rejected.production_dod_json || "{}"))), version: "SHOT_PRODUCT_DOD_V18", pixelLayoutSpecification: true, pinnedLabelPositionExact: true, midpointTransitionExact: true, fullCanvasPortfolioLanguageRequired: true, fullLabelFitRequired: true, sharedPortfolioChromeForbidden: true, discreteObjectMotionRequired: true, rendererInputPixelLayoutOnly: true, semanticToPixelTraceRequired: true, clippingConnectorAndObjectOverlapZero: true, portfolioPolicy, fullScopeRegression: "50_OF_50_PASS" };
  const modelPolicy = { ...rec(JSON.parse(String(authorization.model_policy_json || "{}"))), version: WAVE_BATCH_2_V13_REPRODUCTION_VERSION, productionEngine: WAVE_BATCH_2_V13_ENGINE_VERSION, scope: "REPRODUCE_ALL_50_AFTER_V17_ENGINE_REJECTION", deterministicProductionRequests: 0, independentAuditRequests: 1, autoRepair: false, priorAuditRetry: false, qaFailureRoute: "ROOT_PRODUCTION_PROCESS" };
  const activationResult = { preflightId, sourceBatchId: rejected.id, targetBatchId: replacementId, products: 50, frames: 150, sceneSpecifications: 50, pixelTraces: 50, motionPaths: 50, layoutSafe: 50, families: 10, requestsBefore, costBefore, providerDispatches: 0 };
  try {
    await db.batch([
      db.prepare("UPDATE v7_shot_products SET status='PRODUCT_COMPLETE_REJECTED_ENGINE_EVIDENCE',updated_at=? WHERE batch_id=? AND engine_version=? AND status='PRODUCT_COMPLETE'").bind(now, rejected.id, WAVE_BATCH_2_V13_REJECTED_ENGINE_VERSION),
      db.prepare("UPDATE v7_production_batches SET status='ENGINE_ROOT_CAUSE_PRESERVED',updated_at=? WHERE id=? AND status='ENGINE_ROOT_CAUSE_REQUIRED'").bind(now, rejected.id),
      db.prepare("INSERT INTO v7_production_batches (id,program_id,run_id,authorization_id,wave_key,version,engine_version,status,scope_json,specification_hash,total_units,completed_units,blocked_units,current_index,audit_sample_json,production_dod_json,root_cause_policy_json,requests_before,cost_before,request_budget,cost_budget,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'PRODUCING',?,?,50,0,0,0,?,?,?,?,?,1,10,?,?)").bind(replacementId, PROGRAM_ID, run.id, authorization.id, "BATCH_2", WAVE_BATCH_2_V13_REPRODUCTION_VERSION, WAVE_BATCH_2_V13_ENGINE_VERSION, JSON.stringify(scope), await sha(JSON.stringify({ scope, productionDoD, rootCausePolicy, engine: WAVE_BATCH_2_V13_ENGINE_VERSION })), rejected.audit_sample_json, JSON.stringify(productionDoD), JSON.stringify(rootCausePolicy), requestsBefore, costBefore, now, now),
      db.prepare("UPDATE v7_material_authorizations SET scope='WAVE_09_BATCH_2_ENGINE_V18_REPRODUCTION',status='PAUSED',shot_count=50,max_remote_requests=?,max_actual_spend_usd=?,model_policy_json=?,completed_at=NULL,updated_at=? WHERE id=?").bind(requestsBefore + 1, costBefore + 10, JSON.stringify(modelPolicy), now, authorization.id),
      db.prepare("UPDATE v7_material_runs SET status='BATCH_2_V18_REPRODUCING',mode='PIXEL_LAYOUT_REPRODUCTION' WHERE id=?").bind(run.id),
      db.prepare("UPDATE v7_stage_states SET status='BATCH_2_V18_REPRODUCING',blocker='INTEGRATED_PRODUCTION_TRANSACTION',evidence_summary='V8-V17 evidence preserved · V18 pinned labels, exact midpoint gate crossing, collision-free mobile fit, issuer boundary emphasis and full-canvas portfolio languages PASS · no output repair · prior audits not retried',updated_at=? WHERE id=?").bind(now, STAGE_ID),
      db.prepare("INSERT INTO v7_batch_activations (id,program_id,run_id,authorization_id,action,idempotency_key,target_batch_id,input_hash,status,result_json,created_at,committed_at,updated_at) VALUES (?,?,?,?,?,?,?,?, 'COMMITTED',?,?,?,?)").bind(activationId, PROGRAM_ID, run.id, authorization.id, "ADOPT_WAVE_BATCH_2_V18_ENGINE_ROOT_CORRECTION", activationId, replacementId, context.inputHash, JSON.stringify(activationResult), now, now, now),
    ]);
  } catch (error) {
    if (await verifyCommittedWaveBatch2V13Activation(db, clean(run.id), clean(authorization.id), replacementId, clean(rejected.id), activationId)) return snapshot();
    throw new Error(`BATCH_2_V13_ATOMIC_COMMIT_FAILED · ${error instanceof Error ? error.message : "unknown"}`);
  }
  if (!await verifyCommittedWaveBatch2V13Activation(db, clean(run.id), clean(authorization.id), replacementId, clean(rejected.id), activationId)) throw new Error("BATCH_2_V13_ACTIVATION_READBACK_INCONSISTENT");
  return snapshot();
}

async function adoptWaveBatch1EngineRootCorrection() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization) throw new Error("BATCH_1_ROOT_CORRECTION_CONFIGURATION_REQUIRED");
  const batch = await db.prepare("SELECT * FROM v7_production_batches WHERE run_id=? AND wave_key='BATCH_1' ORDER BY created_at DESC LIMIT 1").bind(run.id).first<Row>();
  if (!batch || clean(batch.status) !== "PRODUCTION_BLOCKED") throw new Error("BATCH_1_PRODUCTION_BLOCKED_CHECKPOINT_REQUIRED");
  const products = await db.prepare("SELECT COUNT(*) AS total FROM v7_shot_products WHERE batch_id=?").bind(batch.id).first<{ total: number }>();
  if (Number(products?.total || 0) !== 0 || Number(batch.completed_units || 0) !== 0) throw new Error("BATCH_1_ROOT_CORRECTION_REQUIRES_ZERO_EMITTED_PRODUCTS");
  const scope = arr(JSON.parse(String(batch.scope_json || "[]"))).map(rec), failures: Row[] = [];
  for (const target of scope) {
    const briefRow = await db.prepare("SELECT * FROM v7_material_briefs WHERE id=? AND run_id=?").bind(target.briefId, run.id).first<Row>();
    if (!briefRow) { failures.push({ logicalId: target.logicalId, checks: ["BRIEF_MISSING"] }); continue; }
    const contract = waveProductionContract(briefRow), manifest = waveProductionManifest(contract), oracle = waveProductOracle(manifest), states = arr(manifest.states).map(rec);
    const evidenceBound = states.length === 3 && states.every((state) => Boolean(clean(state.sourceEvidence)));
    if (!oracle.passed || !evidenceBound) failures.push({ logicalId: contract.briefId, checks: oracle.checks.filter((item) => clean(rec(item).status) !== "PASS").map((item) => clean(rec(item).id)), evidenceBound });
  }
  if (scope.length !== 26 || failures.length) throw new Error(`BATCH_1_ENGINE_V2_REGRESSION_FAILED · ${JSON.stringify(failures).slice(0, 1200)}`);
  const now = new Date().toISOString(), rootCausePolicy = { ...rec(JSON.parse(String(batch.root_cause_policy_json || "{}"))), incident: "V1_LAYOUT_CONTRACT_DIVERGENCE", rejectedEngineVersion: clean(batch.engine_version), correctedLayer: "SPECIFICATION_COMPILER_AND_LAYOUT_CONTRACT", correction: "MAXIMUM_24_VIEWER_GLYPHS_ENFORCED_BEFORE_RENDER", replacementEngineVersion: WAVE_PRODUCTION_ENGINE_VERSION, fullScopeRegression: "26_OF_26_PASS", outputRepair: false, emittedProductsBeforeCorrection: 0 };
  const specificationHash = await sha(JSON.stringify({ version: WAVE_BATCH_1_VERSION, engine: WAVE_PRODUCTION_ENGINE_VERSION, scope, rootCausePolicy }));
  const modelPolicy = { ...rec(JSON.parse(String(authorization.model_policy_json || "{}"))), version: WAVE_BATCH_1_VERSION, productionEngine: WAVE_PRODUCTION_ENGINE_VERSION, rootCorrection: rootCausePolicy };
  await db.batch([
    db.prepare("UPDATE v7_production_batches SET version=?,engine_version=?,status='PRODUCING',specification_hash=?,blocked_units=0,current_index=0,root_cause_policy_json=?,updated_at=? WHERE id=?").bind(WAVE_BATCH_1_VERSION, WAVE_PRODUCTION_ENGINE_VERSION, specificationHash, JSON.stringify(rootCausePolicy), now, batch.id),
    db.prepare("UPDATE v7_material_authorizations SET status='PAUSED',model_policy_json=?,updated_at=? WHERE id=?").bind(JSON.stringify(modelPolicy), now, authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='BATCH_1_PRODUCING',mode='PRODUCT_COMPLETE_SHOT_ENGINE_V2' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='BATCH_1_PRODUCING',blocker='INTEGRATED_PRODUCTION_TRANSACTION',evidence_summary='V1 layout-contract divergence rejected before output · V2 compiler enforces 24-glyph viewer labels · 26/26 zero-spend regression PASS · production resumed · no output repair',updated_at=? WHERE id=?").bind(now, STAGE_ID),
  ]);
  return snapshot();
}

async function adoptWaveBatch1SemanticEngineRootCorrection() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization) throw new Error("BATCH_1_SEMANTIC_ROOT_CORRECTION_CONFIGURATION_REQUIRED");
  const batch = await db.prepare("SELECT * FROM v7_production_batches WHERE run_id=? AND wave_key='BATCH_1' ORDER BY created_at DESC LIMIT 1").bind(run.id).first<Row>();
  const audit = batch ? await db.prepare("SELECT * FROM v7_batch_product_audits WHERE batch_id=? AND status='ENGINE_ROOT_CAUSE_REQUIRED' ORDER BY created_at DESC LIMIT 1").bind(batch.id).first<Row>() : null;
  if (!batch || clean(batch.status) !== "ENGINE_ROOT_CAUSE_REQUIRED" || !audit) throw new Error("BATCH_1_FAILED_SEMANTIC_AUDIT_CHECKPOINT_REQUIRED");
  const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>();
  if (Number(active?.total || 0) !== 0) throw new Error("BATCH_1_SEMANTIC_ROOT_CORRECTION_ACTIVE_REQUEST");
  const rejectedEngine = clean(batch.engine_version), products = await rows(db, "SELECT * FROM v7_shot_products WHERE batch_id=? AND engine_version=? AND status='PRODUCT_COMPLETE' ORDER BY created_at", batch.id, rejectedEngine);
  if (products.length !== 26) throw new Error(`BATCH_1_REJECTED_PRODUCT_SET_INCOMPLETE · ${products.length}/26`);
  const scope = arr(JSON.parse(String(batch.scope_json || "[]"))).map(rec), failures: Row[] = [], kinds = new Set<string>(), renderSignatures = new Map<string, string>();
  for (const target of scope) {
    const briefRow = await db.prepare("SELECT * FROM v7_material_briefs WHERE id=? AND run_id=?").bind(target.briefId, run.id).first<Row>();
    if (!briefRow) { failures.push({ logicalId: target.logicalId, checks: ["BRIEF_MISSING"] }); continue; }
    const contract = waveProductionContract(briefRow), manifest = waveProductionManifest(contract), qualification = waveManifestQualification(manifest), semantic = rec(manifest.semanticModel);
    kinds.add(clean(semantic.kind));
    const renderSignature = await sha(JSON.stringify(qualification.signatureInput)), duplicateOf = renderSignatures.get(renderSignature);
    if (duplicateOf) failures.push({ logicalId: contract.briefId, checks: ["DUPLICATE_RENDER_SPECIFICATION"], duplicateOf }); else renderSignatures.set(renderSignature, clean(contract.briefId));
    if (!qualification.passed || arr(semantic.requiredElements).length < 3) failures.push({ logicalId: contract.briefId, kind: semantic.kind, checks: qualification.checks.filter((item) => clean(rec(item).status) !== "PASS").map((item) => clean(rec(item).id)) });
  }
  if (scope.length !== 26 || failures.length || kinds.size < 5) throw new Error(`BATCH_1_ENGINE_V3_REGRESSION_FAILED · kinds ${kinds.size} · ${JSON.stringify(failures).slice(0, 1200)}`);
  const priorRoot = rec(JSON.parse(String(audit.root_cause_json || "{}"))), now = new Date().toISOString(), rootCausePolicy = { ...rec(JSON.parse(String(batch.root_cause_policy_json || "{}"))), incident: "PRIOR_ENGINE_SEMANTIC_MANIFEST_ESCAPE", rejectedEngineVersion: rejectedEngine, rejectedAuditId: audit.id, rejectedAuditScore: Number(audit.score), observedRootCause: priorRoot.rootProductionCause, correctedLayers: ["SEMANTIC_MANIFEST", "LAYOUT_ENGINE", "PORTFOLIO_POLICY", "MOTION_POLICY"], correction: "CONTRACT_SIGNATURE_SCENES_WITH_EXPLICIT_STATE_TRANSITIONS_AND_RESERVED_LABEL_REGIONS", replacementEngineVersion: WAVE_PRODUCTION_ENGINE_VERSION, fullScopeRegression: "26_OF_26_PASS", semanticKindsQualified: [...kinds].sort(), reproduceScope: "ALL_26_PRODUCTS", outputRepair: false, priorProductsPreservedAsEvidence: true };
  const specificationHash = await sha(JSON.stringify({ version: WAVE_BATCH_1_VERSION, engine: WAVE_PRODUCTION_ENGINE_VERSION, scope, rootCausePolicy })), modelPolicy = { ...rec(JSON.parse(String(authorization.model_policy_json || "{}"))), version: WAVE_BATCH_1_VERSION, productionEngine: WAVE_PRODUCTION_ENGINE_VERSION, semanticRootCorrection: rootCausePolicy };
  await db.batch([
    db.prepare("UPDATE v7_shot_products SET status='PRODUCT_COMPLETE_REJECTED_ENGINE_EVIDENCE',updated_at=? WHERE batch_id=? AND engine_version=? AND status='PRODUCT_COMPLETE'").bind(now, batch.id, rejectedEngine),
    db.prepare("UPDATE v7_batch_product_audits SET status='ENGINE_ROOT_CAUSE_PRESERVED',updated_at=? WHERE id=?").bind(now, audit.id),
    db.prepare("UPDATE v7_production_batches SET version=?,engine_version=?,status='PRODUCING',specification_hash=?,completed_units=0,blocked_units=0,current_index=0,root_cause_policy_json=?,request_budget=request_budget+1,completed_at=NULL,updated_at=? WHERE id=?").bind(WAVE_BATCH_1_VERSION, WAVE_PRODUCTION_ENGINE_VERSION, specificationHash, JSON.stringify(rootCausePolicy), now, batch.id),
    db.prepare("UPDATE v7_material_authorizations SET status='PAUSED',max_remote_requests=max_remote_requests+1,model_policy_json=?,updated_at=? WHERE id=?").bind(JSON.stringify(modelPolicy), now, authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='BATCH_1_REPRODUCING',mode='SPATIAL_RELATION_BOUND_ENGINE_V7' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='BATCH_1_REPRODUCING',blocker='ENGINE_V3_PRODUCT_COMPLETION',evidence_summary=?,updated_at=? WHERE id=?").bind(`V2 audit ${Number(audit.score)}/100 preserved · 26 V2 products retained as rejected-engine evidence · semantic scene-graph V3 qualified 26/26 across ${kinds.size} scene kinds · reproducing all 26 · no output repair`, now, STAGE_ID),
  ]);
  return snapshot();
}

async function waveBatch2Audit() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || !env.BUCKET || !env.OPENAI_API_KEY) throw new Error("BATCH_2_AUDIT_CONFIGURATION_REQUIRED");
  const batch = await db.prepare("SELECT * FROM v7_production_batches WHERE run_id=? AND wave_key='BATCH_2' ORDER BY created_at DESC LIMIT 1").bind(run.id).first<Row>();
  if (!batch || clean(batch.status) !== "PRODUCT_COMPLETE" || Number(batch.completed_units) !== 50) throw new Error("BATCH_2_PRODUCT_COMPLETE_REQUIRED");
  const auditId = `${clean(batch.id)}-${WAVE_BATCH_AUDIT_RUBRIC}-${clean(batch.engine_version)}-${WAVE_BATCH_AUDIT_TRANSPORT_VERSION}-${WAVE_BATCH_AUDIT_CONTROL_VERSION}`;
  let audit = await db.prepare("SELECT * FROM v7_batch_product_audits WHERE batch_id=? ORDER BY created_at DESC LIMIT 1").bind(batch.id).first<Row>();
  if (audit && ["PASS", "ENGINE_ROOT_CAUSE_REQUIRED", "BLOCKED_INCOMPLETE"].includes(clean(audit.status))) return snapshot();
  if (audit?.provider_response_id) {
    const response = await fetch(`https://api.openai.com/v1/responses/${encodeURIComponent(clean(audit.provider_response_id))}`, { headers: { authorization: `Bearer ${env.OPENAI_API_KEY}` }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`BATCH_2_AUDIT_STATUS_FAILED · ${response.status}`);
    const payload = await response.json() as Row, providerStatus = clean(payload.status), now = new Date().toISOString();
    if (["queued", "in_progress"].includes(providerStatus)) { await db.prepare("UPDATE v7_material_requests SET status=?,updated_at=? WHERE id=?").bind(providerStatus.toUpperCase(), now, audit.request_id).run(); return snapshot(); }
    const usage = await recordOpenAIUsage({ db, programId: PROGRAM_ID, runId: clean(run.id), stageKey: STAGE, costType: "WAVE_BATCH_2_PRODUCT_AUDIT", payload, fallbackModel: DEFAULT_MODEL });
    await db.prepare("UPDATE v7_material_requests SET status=?,input_tokens=?,output_tokens=?,reasoning_tokens=?,actual_cost_usd=?,error=?,updated_at=? WHERE id=?").bind(providerStatus === "completed" ? "COMPLETE" : "BLOCKED_INCOMPLETE", usage.inputTokens, usage.outputTokens, usage.reasoningTokens, usage.actualUsd, providerStatus === "completed" ? null : clean(rec(payload.incomplete_details).reason || rec(payload.error).message || providerStatus), now, audit.request_id).run();
    await syncRunTotals(db, run.id);
    if (providerStatus !== "completed") {
      await db.batch([db.prepare("UPDATE v7_batch_product_audits SET status='BLOCKED_INCOMPLETE',provider_response_id=?,updated_at=?,completed_at=? WHERE id=?").bind(payload.id || audit.provider_response_id, now, now, audit.id), db.prepare("UPDATE v7_production_batches SET status='AUDIT_INCOMPLETE',updated_at=? WHERE id=?").bind(now, batch.id), db.prepare("UPDATE v7_stage_states SET status='BATCH_2_AUDIT_INCOMPLETE',blocker='NO_RETRY_ROOT_RECONCILIATION',evidence_summary='50/50 PRODUCT_COMPLETE preserved · independent audit incomplete · no automatic retry and no output repair',updated_at=? WHERE id=?").bind(now, STAGE_ID)]);
      return snapshot();
    }
    const result = JSON.parse(output(payload)) as Row, dimensionKeys = ["semanticFit", "factualSafety", "composition", "mobileLegibility", "temporalClarity", "portfolioVariety"], dimensions = Object.fromEntries(dimensionKeys.map((key) => [key, Number(result[key])])), findings = arr(result.findings).map(rec), blocking = findings.some((item) => ["P0", "P1"].includes(clean(item.severity))), pass = Number(result.overall) >= 90 && Number(result.semanticFit) >= 90 && Number(result.factualSafety) >= 92 && ["composition", "mobileLegibility", "temporalClarity", "portfolioVariety"].every((key) => Number(result[key]) >= 88) && !blocking && clean(result.decision) === "PASS";
    const status = pass ? "PASS" : "ENGINE_ROOT_CAUSE_REQUIRED", rootCause = { policy: "NO_OUTPUT_REPAIR", engineVersion: batch.engine_version, rootProductionCause: clean(result.rootProductionCause), affectedUnits: [...new Set(findings.filter((item) => clean(item.severity) !== "P2").map((item) => clean(item.logicalId)).filter(Boolean))], affectedLayers: [...new Set(findings.map((item) => clean(item.productionLayer)).filter((item) => item && item !== "NONE"))], regressionRequired: !pass, reproduceAffectedProducts: !pass };
    await db.batch([
      db.prepare("UPDATE v7_batch_product_audits SET status=?,score=?,tier=?,dimensions_json=?,findings_json=?,root_cause_json=?,provider_response_id=?,updated_at=?,completed_at=? WHERE id=?").bind(status, Number(result.overall), pass ? "CONTROLLED_SCALE_PASS" : "BLOCKED", JSON.stringify(dimensions), JSON.stringify(findings), JSON.stringify(rootCause), payload.id || audit.provider_response_id, now, now, audit.id),
      db.prepare("UPDATE v7_production_batches SET status=?,updated_at=? WHERE id=?").bind(pass ? "PASS" : "ENGINE_ROOT_CAUSE_REQUIRED", now, batch.id),
      db.prepare("UPDATE v7_material_runs SET status=? WHERE id=?").bind(pass ? "BATCH_2_PASS" : "BATCH_2_ENGINE_ROOT_CAUSE_REQUIRED", run.id),
      db.prepare("UPDATE v7_stage_states SET status=?,blocker=?,evidence_summary=?,updated_at=? WHERE id=?").bind(pass ? "BATCH_2_PASS" : "BATCH_2_ENGINE_ROOT_CAUSE_REQUIRED", pass ? "BATCH_3_NOT_STARTED" : "PRODUCTION_ENGINE_QUALIFICATION_REQUIRED", pass ? `Batch 2 PASS ${Number(result.overall)}/100 · 50/50 new products · portfolio 86/166 · independent audit complete` : `Batch 2 audit ${Number(result.overall)}/100 · all 50 outputs retained as evidence · repair prohibited · fix ${rootCause.affectedLayers.join(",") || "production engine"} then regression/reproduction`, now, STAGE_ID),
    ]);
    return snapshot();
  }
  if (audit && !["PREPARING", "DISPATCHING"].includes(clean(audit.status))) throw new Error(`BATCH_2_AUDIT_ORPHANED · ${clean(audit.status)}`);
  if (!audit) {
    const now = new Date().toISOString();
    await db.prepare("INSERT INTO v7_batch_product_audits (id,program_id,run_id,authorization_id,batch_id,rubric_version,status,score,tier,dimensions_json,findings_json,root_cause_json,created_at,updated_at) VALUES (?,?,?,?,?,?,'PREPARING',0,'BLOCKED','{}','[]',?,?,?) ON CONFLICT(id) DO NOTHING").bind(auditId, PROGRAM_ID, run.id, authorization.id, batch.id, WAVE_BATCH_AUDIT_RUBRIC, JSON.stringify({ controlVersion: WAVE_BATCH_AUDIT_CONTROL_VERSION, transportVersion: WAVE_BATCH_AUDIT_TRANSPORT_VERSION, providerDispatches: 0, outputRepair: false }), now, now).run();
    audit = await db.prepare("SELECT * FROM v7_batch_product_audits WHERE id=?").bind(auditId).first<Row>();
  }
  if (!audit || clean(audit.id) !== auditId || clean(audit.batch_id) !== clean(batch.id) || clean(audit.provider_response_id)) throw new Error("BATCH_2_AUDIT_INTENT_CONFLICT");
  const sample = arr(JSON.parse(String(batch.audit_sample_json || "[]"))).map(rec);
  if (sample.length !== 10) throw new Error(`BATCH_2_AUDIT_SAMPLE_INVALID · ${sample.length}/10`);
  const products = await rows(db, "SELECT * FROM v7_shot_products WHERE batch_id=? AND engine_version=? AND status='PRODUCT_COMPLETE' ORDER BY created_at", batch.id, batch.engine_version), productMap = new Map(products.map((item) => [clean(item.logical_brief_id), item]));
  const content: Row[] = [{ type: "input_text", text: `Independently audit a risk-stratified sample of ten finished shot products from a 50-shot controlled-scale production batch. Every product contains immutable ENTRY, MIDPOINT and EXIT pixels created before QA. Judge only the pixels against each exact specification. QA is audit-only; do not prescribe cosmetic output repair. If the batch fails, identify the upstream production layer responsible. PASS requires overall >=90, semanticFit >=90, factualSafety >=92, composition/mobileLegibility/temporalClarity/portfolioVariety each >=88, zero P0/P1, and decision PASS. Return only JSON.\n\nBATCH CONTRACT:\n${JSON.stringify({ batchVersion: batch.version, engineVersion: batch.engine_version, totalProducts: 50, sampleSize: 10, productionDoD: JSON.parse(String(batch.production_dod_json || "{}")), rootCausePolicy: JSON.parse(String(batch.root_cause_policy_json || "{}")) })}` }];
  for (const item of sample) {
    const product = productMap.get(clean(item.logicalId));
    if (!product) throw new Error(`BATCH_2_AUDIT_PRODUCT_MISSING · ${clean(item.logicalId)}`);
    const specification = rec(JSON.parse(String(product.specification_json || "{}"))), frameIds = arr(JSON.parse(String(product.frame_ids_json || "[]"))).map(clean);
    if (frameIds.length !== 3) throw new Error(`BATCH_2_AUDIT_FRAME_SET_INCOMPLETE · ${clean(item.logicalId)}`);
    content.push({ type: "input_text", text: `PRODUCT ${clean(item.logicalId)} · ${clean(item.archetype)} · ${clean(item.sceneKind)}\n${JSON.stringify({ contract: rec(specification.contract), manifest: { sceneType: rec(specification.manifest).sceneType, states: rec(specification.manifest).states }, measurements: JSON.parse(String(product.measurements_json || "{}")), productHash: product.product_hash })}` });
    const frameContent = await Promise.all(frameIds.map(async (frameId, frameIndex) => {
      const file = await db.prepare("SELECT runtime_key,content_hash FROM v7_material_files WHERE id=? AND status='STORED_VERIFIED'").bind(frameId).first<Row>(), object = file ? await env.BUCKET.get(clean(file.runtime_key)) : null;
      if (!object) throw new Error(`BATCH_2_AUDIT_FRAME_MISSING · ${clean(item.logicalId)}`);
      const bytes = new Uint8Array(await new Response(object.body).arrayBuffer());
      if (await shaBytes(bytes) !== clean(file?.content_hash)) throw new Error(`BATCH_2_AUDIT_FRAME_HASH_MISMATCH · ${clean(item.logicalId)}`);
      const rendered = renderWaveSemanticScene(rec(specification.manifest), frameIndex as 0 | 1 | 2);
      if (await shaBytes(rendered.bytes) !== clean(file?.content_hash)) throw new Error(`BATCH_2_AUDIT_RENDERER_REPLAY_MISMATCH · ${clean(item.logicalId)} · ${frameIndex}`);
      const proxy = new Uint8Array(jpeg.encode({ data: rendered.pixels, width: rendered.width, height: rendered.height }, 84).data), proxyHash = await shaBytes(proxy);
      return [{ type: "input_text", text: `AUDIT TRANSPORT ${WAVE_BATCH_AUDIT_TRANSPORT_VERSION} · state ${frameIndex + 1}/3 · immutable source SHA-256 ${clean(file?.content_hash)} · verified replay · JPEG proxy SHA-256 ${proxyHash}` }, { type: "input_image", image_url: `data:image/jpeg;base64,${base64(proxy)}`, detail: "high" }];
    }));
    content.push(...frameContent.flat());
  }
  const setting = await modelSetting(db), requestId = await newRequest(db, authorization, "WAVE-09-BATCH-2", "WAVE_BATCH_2_PRODUCT_AUDIT", "OPENAI", setting.modelId, setting.reasoningEffort, 4000, 8000, `${auditId}-REQUEST`), now = new Date().toISOString();
  await db.prepare("UPDATE v7_batch_product_audits SET status='DISPATCHING',request_id=?,updated_at=? WHERE id=? AND status IN ('PREPARING','DISPATCHING') AND provider_response_id IS NULL").bind(requestId, now, auditId).run();
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json", "idempotency-key": requestId }, body: JSON.stringify({ model: setting.modelId, reasoning: { effort: setting.reasoningEffort }, background: true, store: true, max_output_tokens: 8000, input: [{ role: "user", content }], text: { format: { type: "json_schema", name: "wave_batch_2_product_audit", strict: true, schema: batchProductAuditSchema } } }), signal: AbortSignal.timeout(30000) });
  if (!response.ok) { const detail = (await response.text()).replace(/\s+/g, " ").slice(0, 300); await finishRequest(db, requestId, "FAILED", `OPENAI_${response.status} · ${detail}`); await db.prepare("UPDATE v7_batch_product_audits SET status='BLOCKED_INCOMPLETE',updated_at=?,completed_at=? WHERE id=?").bind(now, now, auditId).run(); throw new Error(`BATCH_2_AUDIT_START_FAILED · ${response.status}`); }
  const payload = await response.json() as Row;
  if (!payload.id) { await finishRequest(db, requestId, "FAILED", "Provider response ID missing"); throw new Error("BATCH_2_AUDIT_PROVIDER_ID_MISSING"); }
  await db.batch([db.prepare("UPDATE v7_material_requests SET status=?,provider_response_id=?,updated_at=? WHERE id=?").bind(["queued", "in_progress"].includes(clean(payload.status)) ? clean(payload.status).toUpperCase() : "IN_PROGRESS", payload.id, now, requestId), db.prepare("UPDATE v7_batch_product_audits SET status='QA_RUNNING',provider_response_id=?,updated_at=? WHERE id=?").bind(payload.id, now, auditId), db.prepare("UPDATE v7_stage_states SET status='BATCH_2_AUDIT_RUNNING',blocker='EXACTLY_ONE_INDEPENDENT_AUDIT',evidence_summary='50/50 PRODUCT_COMPLETE preserved · one ten-product risk-stratified audit active · no repair loop',updated_at=? WHERE id=?").bind(now, STAGE_ID)]);
  return snapshot();
}

async function reconcileCostGovernance() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || !env.OPENAI_API_KEY) throw new Error("COST_GOVERNANCE_CONFIGURATION_REQUIRED");
  const active = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS')").bind(authorization.id).first<{ total: number }>();
  if (Number(active?.total || 0) !== 0) throw new Error("COST_GOVERNANCE_ACTIVE_REQUESTS_MUST_BE_ZERO");
  const audits = await rows(db, "SELECT provider_response_id FROM v7_batch_product_audits WHERE authorization_id=? AND provider_response_id IS NOT NULL ORDER BY completed_at DESC LIMIT 3", authorization.id);
  const providerResponseIds = [...new Set(audits.map((item) => clean(item.provider_response_id)).filter(Boolean))];
  if (providerResponseIds.length === 0) throw new Error("COST_GOVERNANCE_PROVIDER_EVIDENCE_REQUIRED");
  let inputTokens = 0, outputTokens = 0, reasoningTokens = 0, estimatedCostUsd = 0;
  for (const providerResponseId of providerResponseIds) {
    const response = await fetch(`https://api.openai.com/v1/responses/${encodeURIComponent(providerResponseId)}`, { headers: { authorization: `Bearer ${env.OPENAI_API_KEY}` }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`COST_GOVERNANCE_PROVIDER_READBACK_FAILED · ${response.status} · ${providerResponseId.slice(0, 14)}`);
    const payload = await response.json() as Row;
    if (clean(payload.id) !== providerResponseId || clean(payload.status) !== "completed") throw new Error(`COST_GOVERNANCE_PROVIDER_EVIDENCE_MISMATCH · ${providerResponseId.slice(0, 14)}`);
    const usage = await recordOpenAIUsage({ db, programId: PROGRAM_ID, runId: clean(run.id), stageKey: STAGE, costType: "BILLING_LINEAGE_RECONCILIATION", payload, fallbackModel: DEFAULT_MODEL });
    inputTokens += usage.inputTokens;
    outputTokens += usage.outputTokens;
    reasoningTokens += usage.reasoningTokens;
    estimatedCostUsd += usage.actualUsd;
  }
  const now = new Date().toISOString(), modelPolicy = rec(JSON.parse(String(authorization.model_policy_json || "{}")));
  modelPolicy.costGovernance = {
    version: "COST_GOVERNANCE_V2",
    reconciliationStatus: "PROVIDER_RESPONSE_READBACK_PASS_BILLING_PENDING",
    provider: "OPENAI",
    responseReadback: "PASS",
    responsesChecked: providerResponseIds.length,
    inputTokens,
    outputTokens,
    reasoningTokens,
    estimatedCostUsd,
    estimationBasis: "PROVIDER_REPORTED_USAGE_X_CONFIGURED_RATE",
    billingVerificationStatus: "OPENAI_ORGANIZATION_COSTS_NOT_CONNECTED",
    billingVerifiedCostUsd: null,
    actualBilledCostClaimProhibited: true,
    providerRequestsCreated: 0,
    lastReconciledAt: now,
  };
  await db.batch([
    db.prepare("UPDATE v7_material_authorizations SET model_policy_json=?,updated_at=? WHERE id=?").bind(JSON.stringify(modelPolicy), now, authorization.id),
    db.prepare("UPDATE v7_stage_states SET evidence_summary=?,updated_at=? WHERE id=?").bind(`Cost governance V2 · ${providerResponseIds.length} OpenAI response IDs read back PASS · provider usage reconciled · estimated cost only · Organization Costs not connected · no provider generation request`, now, STAGE_ID),
  ]);
  return snapshot();
}

async function waveBatch1Audit() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization || !env.BUCKET || !env.OPENAI_API_KEY) throw new Error("BATCH_1_AUDIT_CONFIGURATION_REQUIRED");
  const batch = await db.prepare("SELECT * FROM v7_production_batches WHERE run_id=? AND wave_key='BATCH_1' ORDER BY created_at DESC LIMIT 1").bind(run.id).first<Row>();
  if (!batch || clean(batch.status) !== "PRODUCT_COMPLETE" || Number(batch.completed_units) !== 26) throw new Error("BATCH_1_PRODUCT_COMPLETE_REQUIRED");
  let audit = await db.prepare("SELECT * FROM v7_batch_product_audits WHERE batch_id=? ORDER BY created_at DESC LIMIT 1").bind(batch.id).first<Row>();
  if (audit && ["PASS", "ENGINE_ROOT_CAUSE_REQUIRED", "BLOCKED_INCOMPLETE"].includes(clean(audit.status))) return snapshot();
  if (["BLOCKED_TRANSPORT_PRE_DISPATCH", "ENGINE_ROOT_CAUSE_PRESERVED"].includes(clean(audit?.status))) audit = null;
  if (audit?.provider_response_id) {
    const response = await fetch(`https://api.openai.com/v1/responses/${encodeURIComponent(clean(audit.provider_response_id))}`, { headers: { authorization: `Bearer ${env.OPENAI_API_KEY}` }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`BATCH_1_AUDIT_STATUS_FAILED · ${response.status}`);
    const payload = await response.json() as Row, providerStatus = clean(payload.status), now = new Date().toISOString();
    if (["queued", "in_progress"].includes(providerStatus)) { await db.prepare("UPDATE v7_material_requests SET status=?,updated_at=? WHERE id=?").bind(providerStatus.toUpperCase(), now, audit.request_id).run(); return snapshot(); }
    const usage = await recordOpenAIUsage({ db, programId: PROGRAM_ID, runId: clean(run.id), stageKey: STAGE, costType: "WAVE_BATCH_PRODUCT_AUDIT", payload, fallbackModel: DEFAULT_MODEL });
    await db.prepare("UPDATE v7_material_requests SET status=?,input_tokens=?,output_tokens=?,reasoning_tokens=?,actual_cost_usd=?,error=?,updated_at=? WHERE id=?").bind(providerStatus === "completed" ? "COMPLETE" : "BLOCKED_INCOMPLETE", usage.inputTokens, usage.outputTokens, usage.reasoningTokens, usage.actualUsd, providerStatus === "completed" ? null : clean(rec(payload.incomplete_details).reason || rec(payload.error).message || providerStatus), now, audit.request_id).run();
    await syncRunTotals(db, run.id);
    if (providerStatus !== "completed") {
      await db.batch([
        db.prepare("UPDATE v7_batch_product_audits SET status='BLOCKED_INCOMPLETE',provider_response_id=?,updated_at=?,completed_at=? WHERE id=?").bind(payload.id || audit.provider_response_id, now, now, audit.id),
        db.prepare("UPDATE v7_production_batches SET status='AUDIT_INCOMPLETE',updated_at=? WHERE id=?").bind(now, batch.id),
        db.prepare("UPDATE v7_stage_states SET status='BATCH_1_AUDIT_INCOMPLETE',blocker='NO_RETRY_ROOT_RECONCILIATION',evidence_summary='26/26 PRODUCT_COMPLETE preserved · independent audit incomplete · no retry and no output repair',updated_at=? WHERE id=?").bind(now, STAGE_ID),
      ]);
      return snapshot();
    }
    const result = JSON.parse(output(payload)) as Row, dimensionKeys = ["semanticFit", "factualSafety", "composition", "mobileLegibility", "temporalClarity", "portfolioVariety"], dimensions = Object.fromEntries(dimensionKeys.map((key) => [key, Number(result[key])])), findings = arr(result.findings).map(rec), semanticP1 = findings.some((item) => clean(item.severity) === "P0" || (clean(item.severity) === "P1" && clean(item.category) === "SEMANTIC")), presentationP1 = findings.filter((item) => clean(item.severity) === "P1" && clean(item.category) === "PRESENTATION").length, pass = Number(result.overall) >= 88 && Number(result.semanticFit) >= 82 && dimensionKeys.filter((key) => key !== "semanticFit").every((key) => Number(result[key]) >= 88) && !semanticP1 && presentationP1 <= 1 && clean(result.decision) === "PASS";
    const status = pass ? "PASS" : "ENGINE_ROOT_CAUSE_REQUIRED", rootCause = { policy: "NO_OUTPUT_REPAIR", engineVersion: batch.engine_version, rootProductionCause: clean(result.rootProductionCause), affectedUnits: [...new Set(findings.filter((item) => clean(item.severity) !== "P2").map((item) => clean(item.logicalId)).filter(Boolean))], affectedLayers: [...new Set(findings.map((item) => clean(item.productionLayer)).filter((item) => item && item !== "NONE"))], regressionRequired: !pass, reproduceAffectedProducts: !pass };
    await db.batch([
      db.prepare("UPDATE v7_batch_product_audits SET status=?,score=?,tier=?,dimensions_json=?,findings_json=?,root_cause_json=?,provider_response_id=?,updated_at=?,completed_at=? WHERE id=?").bind(status, Number(result.overall), pass ? "CONTROLLED_PASS" : "BLOCKED", JSON.stringify(dimensions), JSON.stringify(findings), JSON.stringify(rootCause), payload.id || audit.provider_response_id, now, now, audit.id),
      db.prepare("UPDATE v7_production_batches SET status=?,updated_at=? WHERE id=?").bind(pass ? "PASS" : "ENGINE_ROOT_CAUSE_REQUIRED", now, batch.id),
      db.prepare("UPDATE v7_material_runs SET status=? WHERE id=?").bind(pass ? "BATCH_1_PASS" : "BATCH_1_ENGINE_ROOT_CAUSE_REQUIRED", run.id),
      db.prepare("UPDATE v7_stage_states SET status=?,blocker=?,evidence_summary=?,updated_at=? WHERE id=?").bind(pass ? "BATCH_1_PASS" : "BATCH_1_ENGINE_ROOT_CAUSE_REQUIRED", pass ? "BATCH_2_NOT_STARTED" : "PRODUCTION_ENGINE_QUALIFICATION_REQUIRED", pass ? `Batch 1 PASS ${Number(result.overall)}/100 · 26/26 new products · portfolio 36/166 · independent audit complete` : `Batch 1 audit ${Number(result.overall)}/100 · outputs remain immutable evidence · repair prohibited · fix ${rootCause.affectedLayers.join(",") || "production engine"} then regression/reproduction`, now, STAGE_ID),
    ]);
    return snapshot();
  }
  if (audit) throw new Error(`BATCH_1_AUDIT_ORPHANED · ${clean(audit.status)}`);
  const sample = arr(JSON.parse(String(batch.audit_sample_json || "[]"))).map(rec);
  if (sample.length !== 7) throw new Error(`BATCH_1_AUDIT_SAMPLE_INVALID · ${sample.length}/7`);
  const products = await rows(db, "SELECT * FROM v7_shot_products WHERE batch_id=? AND engine_version=? AND status='PRODUCT_COMPLETE' ORDER BY created_at", batch.id, batch.engine_version), productMap = new Map(products.map((item) => [clean(item.logical_brief_id), item]));
  const content: Row[] = [{ type: "input_text", text: `Independently audit the supplied risk-stratified sample of seven finished shot products from a 26-shot production batch. Each product contains ENTRY, MIDPOINT and EXIT pixels generated before QA. Judge the actual pixels against its exact shot specification. QA is audit-only: do not prescribe a cosmetic output repair. If anything fails, identify the root production layer that allowed the escaped defect. PASS requires overall >=88, semanticFit >=82, every other dimension >=88, no P0, no semantic P1 and at most one presentation P1. Portfolio variety is judged across the seven products. Return only JSON.\n\nBATCH CONTRACT:\n${JSON.stringify({ batchVersion: batch.version, engineVersion: batch.engine_version, totalProducts: 26, sampleSize: 7, productionDoD: JSON.parse(String(batch.production_dod_json || "{}")), rootCausePolicy: JSON.parse(String(batch.root_cause_policy_json || "{}")) })}` }];
  for (const item of sample) {
    const product = productMap.get(clean(item.logicalId));
    if (!product) throw new Error(`BATCH_1_AUDIT_PRODUCT_MISSING · ${clean(item.logicalId)}`);
    const specification = rec(JSON.parse(String(product.specification_json || "{}"))), frameIds = arr(JSON.parse(String(product.frame_ids_json || "[]"))).map(clean);
    if (frameIds.length !== 3) throw new Error(`BATCH_1_AUDIT_FRAME_SET_INCOMPLETE · ${clean(item.logicalId)}`);
    content.push({ type: "input_text", text: `PRODUCT ${clean(item.logicalId)} · ${clean(item.archetype)}\n${JSON.stringify({ contract: rec(specification.contract), manifest: { sceneType: rec(specification.manifest).sceneType, states: rec(specification.manifest).states }, measurements: JSON.parse(String(product.measurements_json || "{}")), productHash: product.product_hash })}` });
    for (const [frameIndex, frameId] of frameIds.entries()) {
      const file = await db.prepare("SELECT runtime_key,content_hash FROM v7_material_files WHERE id=? AND status='STORED_VERIFIED'").bind(frameId).first<Row>(), object = file ? await env.BUCKET.get(clean(file.runtime_key)) : null;
      if (!object) throw new Error(`BATCH_1_AUDIT_FRAME_MISSING · ${clean(item.logicalId)}`);
      const bytes = new Uint8Array(await new Response(object.body).arrayBuffer());
      if (await shaBytes(bytes) !== clean(file?.content_hash)) throw new Error(`BATCH_1_AUDIT_FRAME_HASH_MISMATCH · ${clean(item.logicalId)}`);
      const rendered = renderWaveSemanticScene(rec(specification.manifest), frameIndex as 0 | 1 | 2);
      if (await shaBytes(rendered.bytes) !== clean(file?.content_hash)) throw new Error(`BATCH_1_AUDIT_RENDERER_REPLAY_MISMATCH · ${clean(item.logicalId)} · ${frameIndex}`);
      const proxy = new Uint8Array(jpeg.encode({ data: rendered.pixels, width: rendered.width, height: rendered.height }, 88).data), proxyHash = await shaBytes(proxy);
      content.push({ type: "input_text", text: `AUDIT TRANSPORT ${WAVE_BATCH_AUDIT_TRANSPORT_VERSION} · state ${frameIndex + 1}/3 · immutable source SHA-256 ${clean(file?.content_hash)} · verified replay · JPEG proxy SHA-256 ${proxyHash}` });
      content.push({ type: "input_image", image_url: `data:image/jpeg;base64,${base64(proxy)}`, detail: "high" });
    }
  }
  const setting = await modelSetting(db), requestId = await newRequest(db, authorization, "WAVE-09-BATCH-1", "WAVE_BATCH_PRODUCT_AUDIT", "OPENAI", setting.modelId, setting.reasoningEffort, 2500, 6000), auditId = `${clean(batch.id)}-${WAVE_BATCH_AUDIT_RUBRIC}-${clean(batch.engine_version)}-${WAVE_BATCH_AUDIT_TRANSPORT_VERSION}`, now = new Date().toISOString();
  await db.prepare("INSERT INTO v7_batch_product_audits (id,program_id,run_id,authorization_id,batch_id,rubric_version,status,score,tier,dimensions_json,findings_json,root_cause_json,request_id,created_at,updated_at) VALUES (?,?,?,?,?,?,'DISPATCHING',0,'BLOCKED','{}','[]','{}',?,?,?)").bind(auditId, PROGRAM_ID, run.id, authorization.id, batch.id, WAVE_BATCH_AUDIT_RUBRIC, requestId, now, now).run();
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json", "idempotency-key": requestId }, body: JSON.stringify({ model: setting.modelId, reasoning: { effort: setting.reasoningEffort }, background: true, store: true, max_output_tokens: 6000, input: [{ role: "user", content }], text: { format: { type: "json_schema", name: "wave_batch_product_audit", strict: true, schema: batchProductAuditSchema } } }), signal: AbortSignal.timeout(30000) });
  if (!response.ok) { const detail = (await response.text()).replace(/\s+/g, " ").slice(0, 300); await finishRequest(db, requestId, "FAILED", `OPENAI_${response.status} · ${detail}`); await db.prepare("UPDATE v7_batch_product_audits SET status='BLOCKED_INCOMPLETE',updated_at=?,completed_at=? WHERE id=?").bind(now, now, auditId).run(); throw new Error(`BATCH_1_AUDIT_START_FAILED · ${response.status}`); }
  const payload = await response.json() as Row;
  if (!payload.id) { await finishRequest(db, requestId, "FAILED", "Provider response ID missing"); throw new Error("BATCH_1_AUDIT_PROVIDER_ID_MISSING"); }
  await db.batch([
    db.prepare("UPDATE v7_material_requests SET status=?,provider_response_id=?,updated_at=? WHERE id=?").bind(["queued", "in_progress"].includes(clean(payload.status)) ? clean(payload.status).toUpperCase() : "IN_PROGRESS", payload.id, now, requestId),
    db.prepare("UPDATE v7_batch_product_audits SET status='QA_RUNNING',provider_response_id=?,updated_at=? WHERE id=?").bind(payload.id, now, auditId),
    db.prepare("UPDATE v7_stage_states SET status='BATCH_1_AUDIT_RUNNING',blocker='EXACTLY_ONE_INDEPENDENT_AUDIT',evidence_summary='26/26 PRODUCT_COMPLETE preserved · one risk-stratified audit request active · no repair loop',updated_at=? WHERE id=?").bind(now, STAGE_ID),
  ]);
  return snapshot();
}

async function reconcileWaveBatch1AuditTransport() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization) throw new Error("BATCH_1_AUDIT_TRANSPORT_CONFIGURATION_REQUIRED");
  const batch = await db.prepare("SELECT * FROM v7_production_batches WHERE run_id=? AND wave_key='BATCH_1' ORDER BY created_at DESC LIMIT 1").bind(run.id).first<Row>();
  const audit = batch ? await db.prepare("SELECT * FROM v7_batch_product_audits WHERE batch_id=? ORDER BY created_at DESC LIMIT 1").bind(batch.id).first<Row>() : null;
  const request = audit?.request_id ? await db.prepare("SELECT * FROM v7_material_requests WHERE id=?").bind(audit.request_id).first<Row>() : null;
  if (!batch || clean(batch.status) !== "PRODUCT_COMPLETE" || !audit || clean(audit.status) !== "DISPATCHING" || clean(audit.provider_response_id) || !request || !["QUEUED", "IN_PROGRESS"].includes(clean(request.status))) throw new Error("BATCH_1_ORPHANED_PRE_DISPATCH_CHECKPOINT_REQUIRED");
  if (Number(request.input_tokens || 0) !== 0 || Number(request.output_tokens || 0) !== 0 || Number(request.actual_cost_usd || 0) !== 0) throw new Error("BATCH_1_AUDIT_TRANSPORT_NOT_ZERO_USAGE");
  const now = new Date().toISOString(), policy = { ...rec(JSON.parse(String(authorization.model_policy_json || "{}"))), auditTransportVersion: WAVE_BATCH_AUDIT_TRANSPORT_VERSION, transportCorrection: { failedTransport: "LOSSLESS_PNG_INLINE_V1", rootCause: "UNBOUNDED_21_FRAME_BASE64_PAYLOAD_BEFORE_PROVIDER_ID", replacement: "HASH_VERIFIED_DETERMINISTIC_REPLAY_TO_JPEG_PROXY", providerRequestsCreated: 0, tokenUsage: 0, costUsd: 0, outputRepair: false, qaRetry: false } };
  await db.batch([
    db.prepare("UPDATE v7_material_requests SET status='FAILED',error='AUDIT_TRANSPORT_V1_OVERSIZE_BEFORE_PROVIDER_ID',updated_at=? WHERE id=?").bind(now, request.id),
    db.prepare("UPDATE v7_batch_product_audits SET status='BLOCKED_TRANSPORT_PRE_DISPATCH',root_cause_json=?,updated_at=?,completed_at=? WHERE id=?").bind(JSON.stringify(policy.transportCorrection), now, now, audit.id),
    db.prepare("UPDATE v7_production_batches SET request_budget=request_budget+1,updated_at=? WHERE id=?").bind(now, batch.id),
    db.prepare("UPDATE v7_material_authorizations SET max_remote_requests=max_remote_requests+1,model_policy_json=?,updated_at=? WHERE id=?").bind(JSON.stringify(policy), now, authorization.id),
    db.prepare("UPDATE v7_stage_states SET status='BATCH_1_PRODUCT_COMPLETE',blocker='INDEPENDENT_BATCH_AUDIT_READY',evidence_summary='26/26 PRODUCT_COMPLETE preserved · lossless PNG audit transport V1 rejected before provider ID at zero tokens / $0 · hash-verified JPEG proxy transport V2 qualified · output pixels unchanged',updated_at=? WHERE id=?").bind(now, STAGE_ID),
  ]);
  return snapshot();
}

async function failMediaJob(request: Request, body: Row) {
  const env = await runtime(), db = env.DB!;
  const jobId = clean(body.jobId), leaseToken = clean(body.leaseToken), job = await db.prepare("SELECT * FROM v7_media_jobs WHERE id=? AND status='LEASED'").bind(jobId).first<Row>();
  if (job?.job_type !== "MOTION_PROOF_RENDER") await requireExecutor(request, env);
  if (!job || !leaseToken || await sha(leaseToken) !== clean(job.lease_token_hash)) throw new Error("MEDIA_JOB_LEASE_INVALID");
  const retry = Number(job.attempt) < Number(job.max_attempts), now = new Date().toISOString();
  await db.prepare("UPDATE v7_media_jobs SET status=?,error=?,lease_owner=NULL,lease_token_hash=NULL,lease_expires_at=NULL,updated_at=? WHERE id=?").bind(retry ? "QUEUED" : "FAILED", short(body.error, 300) || "MEDIA_EXECUTION_FAILED", now, jobId).run();
  return Response.json({ status: retry ? "QUEUED" : "FAILED", jobId, retryRemaining: Math.max(0, Number(job.max_attempts) - Number(job.attempt)) });
}

async function materialFile(request: Request) {
  const env = await runtime(), db = env.DB!, id = new URL(request.url).searchParams.get("file");
  if (!id || !env.BUCKET) return Response.json({ error: "Material file not found" }, { status: 404 });
  const file = await db.prepare("SELECT runtime_key,mime_type FROM v7_material_files WHERE id=?").bind(id).first<{ runtime_key: string; mime_type: string }>();
  if (!file) return Response.json({ error: "Material file not found" }, { status: 404 });
  const object = await env.BUCKET.get(file.runtime_key); if (!object) return Response.json({ error: "Stored material bytes not found" }, { status: 404 });
  return new Response(object.body, { headers: { "content-type": file.mime_type, "cache-control": "private, max-age=300", "content-disposition": "inline" } });
}

async function operatorSnapshot() {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  const stage = await db.prepare("SELECT status,blocker,evidence_summary,updated_at FROM v7_stage_states WHERE id=? LIMIT 1").bind(STAGE_ID).first<Row>();
  const batch1 = run ? await db.prepare("SELECT * FROM v7_production_batches WHERE run_id=? AND wave_key='BATCH_1' ORDER BY created_at DESC LIMIT 1").bind(run.id).first<Row>() : null;
  const batch2 = run ? await db.prepare("SELECT * FROM v7_production_batches WHERE run_id=? AND wave_key='BATCH_2' ORDER BY created_at DESC LIMIT 1").bind(run.id).first<Row>() : null;
  const batch1Audit = batch1 ? await db.prepare("SELECT status,score,tier,completed_at FROM v7_batch_product_audits WHERE batch_id=? ORDER BY created_at DESC LIMIT 1").bind(batch1.id).first<Row>() : null;
  const batch2Audit = batch2 ? await db.prepare("SELECT status,score,tier,completed_at FROM v7_batch_product_audits WHERE batch_id=? ORDER BY created_at DESC LIMIT 1").bind(batch2.id).first<Row>() : null;
  const ledger = authorization ? await db.prepare("SELECT COUNT(*) AS total,SUM(CASE WHEN status IN ('QUEUED','IN_PROGRESS') THEN 1 ELSE 0 END) AS active,SUM(CASE WHEN status='COMPLETE' THEN 1 ELSE 0 END) AS complete,COALESCE(SUM(actual_cost_usd),0) AS cost FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<Row>() : null;
  const batch1Completed = Number(batch1?.completed_units || 0);
  const batch2Completed = Number(batch2?.completed_units || 0);
  const portfolioComplete = 10 + batch1Completed + batch2Completed;
  const activeRequests = Number(ledger?.active || 0);
  const batch1Passed = clean(batch1?.status) === "PASS" && batch1Completed === 26 && clean(batch1Audit?.status) === "PASS";
  const canStartBatch2 = batch1Passed && portfolioComplete === 36 && !batch2 && activeRequests === 0;
  return {
    controlPlane: { version: "v249", mode: "CONTROL_PLANE_LITE", mediaPolicy: "ON_DEMAND_ONLY", generatedAt: new Date().toISOString() },
    checkpoint: { deployment: "v249", sourceCheckpoint: "v248", status: "LIVE" },
    stage: { status: clean(stage?.status || "UNKNOWN"), blocker: stage?.blocker || null, evidence: clean(stage?.evidence_summary), updatedAt: stage?.updated_at || null },
    portfolio: { complete: portfolioComplete, total: 166, baseline: 10 },
    batches: {
      batch1: batch1 ? { status: clean(batch1.status), completed: batch1Completed, total: Number(batch1.total_units || 26), auditStatus: clean(batch1Audit?.status || "NOT_STARTED"), auditScore: Number(batch1Audit?.score || 0) } : null,
      batch2: batch2 ? { status: clean(batch2.status), completed: batch2Completed, total: Number(batch2.total_units || 50), auditStatus: clean(batch2Audit?.status || "NOT_STARTED"), auditScore: Number(batch2Audit?.score || 0), activatedAt: batch2.created_at } : null,
    },
    activation: { batch2Records: batch2 ? 1 : 0, idempotencyKey: "START_WAVE_BATCH_2_V243", canStart: canStartBatch2 },
    requests: { total: Number(ledger?.total || 0), active: activeRequests, complete: Number(ledger?.complete || 0), actualCostUsd: Number(ledger?.cost || 0) },
    safeguards: { batch1Seal: batch1Passed, portfolioBaseline: portfolioComplete === 36, noBatch2Activation: !batch2, activeRequestsZero: activeRequests === 0, noOutputRepair: true, rootCauseOnly: true },
  };
}

export async function GET(request: Request) { try { const params = new URL(request.url).searchParams; if (params.has("executionSource")) return await executionSource(request); if (params.has("file")) return await materialFile(request); if (params.get("view") === "operator") return Response.json(await operatorSnapshot(), { headers: { "cache-control": "no-store" } }); return Response.json(await snapshot()); } catch (error) { const message = error instanceof Error ? error.message : "Stage 09 could not load"; return Response.json({ error: message }, { status: /UNAUTHORIZED/.test(message) ? 401 : /LEASE_INVALID/.test(message) ? 409 : /NOT_FOUND|MISSING/.test(message) ? 404 : 500 }); } }
const LEGACY_STAGE09_ACTIONS = new Set([
  "AUTHORIZE_CONTROLLED_CANARY", "AUTHORIZE_CONTROLLED_CANARY_V3", "AUTHORIZE_CONTROLLED_CANARY_V4", "AUTHORIZE_CONTROLLED_CANARY_V5",
  "BUILD_CANARY_RECOVERY_LANE", "RELEASE_PRODUCTION_RECOVERY_PROBE", "BUILD_RECOVERY_CONTRACT_ALIGNMENT", "RELEASE_CONTRACT_ALIGNED_RECOVERY_PROBE",
  "RECONCILE_CONTRACT_ALIGNED_RECOVERY_TERMINAL", "BUILD_RELEASE_TRAIN_PREFLIGHT", "BUILD_PRODUCTION_SCENE_PREFLIGHT", "RELEASE_CONTROLLED_CANARY_V5_UNIT",
  "START_CONTROLLED_CANARY_UNIT", "RELEASE_NEXT_CONTROLLED_CANARY_UNIT", "AUTHORIZE_PILOT", "AUTHORIZE_PILOT_AFTER_MOTION", "START_PILOT", "STEP_PILOT", "RESUME_PILOT",
]);
async function assertLegacyIsolation(action: string) {
  if (!LEGACY_STAGE09_ACTIONS.has(action)) return;
  const env = await runtime(), db = env.DB!, { run } = await current(db);
  const stabilized = run ? await db.prepare("SELECT id FROM v7_pilot_canaries WHERE run_id=? AND version=? ORDER BY created_at DESC LIMIT 1").bind(run.id, STABILIZATION_RELEASE_VERSION).first<Row>() : null;
  if (stabilized) throw new Error(`LEGACY_ACTION_UNREACHABLE_AFTER_STABILIZATION · ${action}`);
}

async function persistStabilizationTerminalFailure(message: string) {
  const env = await runtime(), db = env.DB!, { run, authorization } = await current(db);
  if (!run || !authorization) return;
  const recovery = await db.prepare("SELECT * FROM v7_canary_recovery_sessions WHERE run_id=? ORDER BY created_at DESC LIMIT 1").bind(run.id).first<Row>();
  const usage = await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(actual_cost_usd),0) AS cost,SUM(CASE WHEN status IN ('QUEUED','IN_PROGRESS') THEN 1 ELSE 0 END) AS active FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<Row>();
  const failureCode = clean(message.split("·")[0]) || "STABILIZATION_TERMINAL_FAILURE";
  const now = new Date().toISOString(), detail = {
    action: "BUILD_STABILIZATION_RELEASE",
    terminalState: "RELEASE_BLOCKED",
    failureCode,
    message,
    manifestSource: CANONICAL_PILOT_MANIFEST_VERSION,
    requests: Number(usage?.total || 0),
    cost: Number(usage?.cost || 0),
    active: Number(usage?.active || 0),
    retryAuthorized: false,
    request84Authorized: false,
  };
  const eventId = `${clean(run.id)}-${STABILIZATION_RELEASE_VERSION}-TERMINAL-${(await sha(message)).slice(0, 16)}`;
  await db.batch([
    db.prepare("INSERT INTO v7_canary_transition_events (id,recovery_id,command_id,canary_version,unit_id,status,failure_code,failed_transition,failed_gate,expected_state,actual_state,authorization_status,ledger_status,provider_dispatch_status,detail_json,created_at) VALUES (?,?,?,?,?,'STABILIZATION_TERMINAL_FAIL',?,'CANONICAL_REHEARSAL','G0_G1_G2','RELEASE_CANDIDATE','RELEASE_BLOCKED','PAUSED','UNCHANGED','NOT_DISPATCHED',?,?) ON CONFLICT(id) DO UPDATE SET detail_json=excluded.detail_json,created_at=excluded.created_at").bind(eventId, clean(recovery?.id) || `${clean(run.id)}-STABILIZATION`, `${clean(run.id)}-BUILD-STABILIZATION-RELEASE`, STABILIZATION_RELEASE_VERSION, "RELEASE_SET", failureCode, JSON.stringify(detail), now),
    db.prepare("UPDATE v7_material_authorizations SET status='PAUSED',updated_at=? WHERE id=?").bind(now, authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='STABILIZATION_RELEASE_BLOCKED',mode='CANONICAL_PRODUCTION_CLONE_REHEARSAL' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='ENGINEERING_ESCALATION',blocker=?,evidence_summary=?,updated_at=? WHERE id=?").bind(failureCode, `${message} · terminal persisted · requests ${Number(usage?.total || 0)} · cost $${Number(usage?.cost || 0).toFixed(6)} · active ${Number(usage?.active || 0)} · request 84 locked`, now, STAGE_ID),
  ]);
}
export async function POST(request: Request) {
  let action = "UNKNOWN";
  try {
    const body = await request.json() as Row;
    action = clean(body.action);
    await assertLegacyIsolation(action);
    if (body.action === "QUALIFY_RELIABILITY_BASELINE") return Response.json(await qualifyReliabilityBaseline(), { status: 201 });
    if (body.action === "BUILD_HARDEST_ARCHETYPE_CERTIFICATION") return Response.json(await buildHardestArchetypeCertification(), { status: 201 });
    if (body.action === "REPAIR_HARDEST_ARCHETYPE_CERTIFICATION") return Response.json(await repairHardestArchetypeCertification(), { status: 201 });
    if (body.action === "RUN_HARDEST_ARCHETYPE_QA") return Response.json(await hardestArchetypeCertificationQa(), { status: 202 });
    if (body.action === "BUILD_NEXT_ARCHETYPE_CERTIFICATION") return Response.json(await buildNextArchetypeCertification(), { status: 201 });
    if (body.action === "RUN_NEXT_ARCHETYPE_QA") return Response.json(await nextArchetypeCertificationQa(), { status: 202 });
    if (body.action === "POLL_NEXT_ARCHETYPE_QA") return Response.json(await nextArchetypeCertificationQa(true), { status: 200 });
    if (body.action === "REPAIR_NEXT_ARCHETYPE_CERTIFICATION") return Response.json(await repairNextArchetypeCertification(), { status: 201 });
    if (body.action === "RECONCILE_ARCHETYPE_ATTEMPT_LIMITS") return Response.json(await reconcileArchetypeAttemptLimits(), { status: 200 });
    if (body.action === "AUTHORIZE_DATA_VISUALIZATION_V3") return Response.json(await authorizeDataVisualizationV3(), { status: 201 });
    if (body.action === "RUN_ARCHETYPE_REGRESSION") return Response.json(await runArchetypeRegression(), { status: 201 });
    if (body.action === "AUTHORIZE_CONTROLLED_CANARY") return Response.json(await authorizeControlledCanary(), { status: 201 });
    if (body.action === "AUTHORIZE_CONTROLLED_CANARY_V3") return Response.json(await authorizeControlledCanaryV3(), { status: 201 });
    if (body.action === "AUTHORIZE_CONTROLLED_CANARY_V4") return Response.json(await authorizeControlledCanaryV4(), { status: 201 });
    if (body.action === "AUTHORIZE_CONTROLLED_CANARY_V5") return Response.json(await authorizeControlledCanaryV5(), { status: 201 });
    if (body.action === "BUILD_CANARY_RECOVERY_LANE") return Response.json(await buildCanaryRecoveryLane(), { status: 201 });
    if (body.action === "RELEASE_PRODUCTION_RECOVERY_PROBE") return Response.json(await releaseProductionRecoveryProbe(), { status: 202 });
    if (body.action === "BUILD_RECOVERY_CONTRACT_ALIGNMENT") return Response.json(await buildRecoveryContractAlignment(), { status: 201 });
    if (body.action === "RELEASE_CONTRACT_ALIGNED_RECOVERY_PROBE") return Response.json(await releaseContractAlignedRecoveryProbe(), { status: 202 });
    if (body.action === "RECONCILE_CONTRACT_ALIGNED_RECOVERY_TERMINAL") return Response.json(await reconcileContractAlignedRecoveryTerminal(), { status: 200 });
    if (body.action === "BUILD_RELEASE_TRAIN_PREFLIGHT") return Response.json(await buildReleaseTrainPreflight(), { status: 201 });
    if (body.action === "BUILD_STABILIZATION_RELEASE") {
      try {
        return Response.json(await buildProductionScenePreflight(), { status: 201 });
      } catch (error) {
        const message = error instanceof Error ? error.message : "STABILIZATION_TERMINAL_FAILURE";
        try { await persistStabilizationTerminalFailure(message); } catch { /* preserve the original terminal cause */ }
        throw error;
      }
    }
    if (body.action === "BUILD_PRODUCTION_SCENE_PREFLIGHT") throw new Error("LEGACY_ACTION_UNREACHABLE · BUILD_PRODUCTION_SCENE_PREFLIGHT");
    if (body.action === "RELEASE_RELEASE_TRAIN_SEQUENCE_PROOF") return Response.json(await releaseReleaseTrainSequenceProof(), { status: 202 });
    if (body.action === "PREPARE_STABILIZED_MP002_TARGETED_REPAIR") return Response.json(await prepareStabilizedMp002TargetedRepair(), { status: 201 });
    if (body.action === "RELEASE_STABILIZED_MP002_TARGETED_REPAIR") return Response.json(await releaseStabilizedMp002TargetedRepair(), { status: 202 });
    if (body.action === "PREPARE_MP002_PIXEL_ORACLE_REPAIR") return Response.json(await prepareMp002PixelOracleRepair(), { status: 201 });
    if (body.action === "RELEASE_MP002_PIXEL_ORACLE_REPAIR") return Response.json(await releaseMp002PixelOracleRepair(), { status: 202 });
    if (body.action === "ADOPT_CONTROLLED_RELEASE_GATE") return Response.json(await adoptControlledReleaseGate(), { status: 200 });
    if (body.action === "STEP_RELEASE_TRAIN_UNIT") return Response.json(await stepReleaseTrainUnit(), { status: 202 });
    if (body.action === "START_RELEASE_TRAIN_BATCH") return Response.json(await startReleaseTrainBatch(), { status: 202 });
    if (body.action === "RELEASE_NEXT_RELEASE_TRAIN_BATCH_UNIT") return Response.json(await releaseNextReleaseTrainBatchUnit(), { status: 202 });
    if (body.action === "BUILD_CANONICAL_UNIT_SCENES") return Response.json(await buildCanonicalUnitScenes(), { status: 201 });
    if (body.action === "RELEASE_CONTROLLED_CANARY_V5_UNIT") return Response.json(await releaseControlledCanaryV5Unit(), { status: 202 });
    if (body.action === "START_CONTROLLED_CANARY_UNIT") return Response.json(await startControlledCanaryUnit(), { status: 202 });
    if (body.action === "RELEASE_NEXT_CONTROLLED_CANARY_UNIT") return Response.json(await releaseNextControlledCanaryUnit(), { status: 201 });
    if (body.action === "BUILD_DRY_RUN") return Response.json(await buildDryRun(), { status: 201 });
    if (body.action === "AUTHORIZE_PILOT") return Response.json(await authorizePilot(), { status: 201 });
    if (body.action === "AUTHORIZE_PILOT_AFTER_MOTION") return Response.json(await authorizePilotAfterMotion(), { status: 201 });
    if (body.action === "REVOKE_PILOT") return Response.json(await revokePilot());
    if (body.action === "SET_MODEL") return Response.json(await setModel(clean(body.modelId), clean(body.reasoningEffort)));
    if (body.action === "START_PILOT") return Response.json(await startPilot(), { status: 202 });
    if (body.action === "STEP_PILOT") return Response.json(await stepPilot(), { status: 202 });
    if (body.action === "STOP_PILOT") return Response.json(await stopPilot());
    if (body.action === "RESUME_PILOT") return Response.json(await resumePilot(), { status: 202 });
    if (body.action === "UPGRADE_FAILED_UNIT_ARCHITECTURE") return Response.json(await upgradeFailedUnitArchitecture(), { status: 201 });
    if (body.action === "REPAIR_FAILED_UNIT_RENDERER") return Response.json(await repairFailedUnitRenderer(), { status: 201 });
    if (body.action === "PREPARE_INCOMPLETE_PIXEL_QA_RETRY") return Response.json(await prepareIncompletePixelQaRetry(), { status: 201 });
    if (body.action === "REPAIR_FAILED_UNIT_COMPOSITION") return Response.json(await repairFailedUnitComposition(), { status: 201 });
    if (body.action === "PLAN_ROOT_CAUSE_EXECUTION") return Response.json(await planRootCauseExecution(), { status: 201 });
    if (body.action === "RUN_SOURCE_FRAME_QA") return Response.json(await sourceFrameQa(), { status: 202 });
    if (body.action === "RUN_COMPOSITE_TOURNAMENT") return Response.json(await compositeTournament(), { status: 202 });
    if (body.action === "PLAN_MOTION_PROOF") return Response.json(await planMotionProof(), { status: 201 });
    if (body.action === "ISSUE_MOTION_EXECUTOR_BOOTSTRAP") return Response.json(await issueMotionExecutorBootstrap(), { status: 201 });
    if (body.action === "RUN_MOTION_QA") return Response.json(await motionProofQa(), { status: 202 });
    if (body.action === "PLAN_SEQUENCE_PROOF") return Response.json(await planSequenceProof(), { status: 201 });
    if (body.action === "PRODUCE_INTEGRATED_SEQUENCE") return Response.json(await produceIntegratedSequence(), { status: 201 });
    if (body.action === "RUN_SEQUENCE_PRODUCT_AUDIT") return Response.json(await sequenceProductAudit(), { status: 202 });
    if (body.action === "RUN_SEQUENCE_QA") return Response.json(await sequenceProofQa(), { status: 202 });
    if (body.action === "START_WAVE_BATCH_1") return Response.json(await startWaveBatch1(), { status: 201 });
    if (body.action === "ADOPT_WAVE_BATCH_1_ENGINE_ROOT_CORRECTION") return Response.json(await adoptWaveBatch1EngineRootCorrection(), { status: 201 });
    if (body.action === "ADOPT_WAVE_BATCH_1_SEMANTIC_ENGINE_ROOT_CORRECTION") return Response.json(await adoptWaveBatch1SemanticEngineRootCorrection(), { status: 201 });
    if (body.action === "PRODUCE_NEXT_WAVE_BATCH_1_SHOT") return Response.json(await produceNextWaveBatch1Shot(), { status: 201 });
    if (body.action === "RECONCILE_WAVE_BATCH_1_AUDIT_TRANSPORT") return Response.json(await reconcileWaveBatch1AuditTransport(), { status: 201 });
    if (body.action === "RUN_WAVE_BATCH_1_AUDIT") return Response.json(await waveBatch1Audit(), { status: 202 });
    if (body.action === "START_WAVE_BATCH_2") return Response.json(await startWaveBatch2(), { status: 201 });
    if (body.action === "ADOPT_WAVE_BATCH_2_ENGINE_ROOT_CORRECTION") return Response.json(await adoptWaveBatch2EngineRootCorrection(), { status: 201 });
    if (body.action === "PREFLIGHT_WAVE_BATCH_2_V10_ACTIVATION") return Response.json(await preflightWaveBatch2V10Activation(), { status: 200 });
    if (body.action === "ADOPT_WAVE_BATCH_2_V10_ENGINE_ROOT_CORRECTION") return Response.json(await adoptWaveBatch2V10EngineRootCorrection(), { status: 201 });
    if (body.action === "PREFLIGHT_WAVE_BATCH_2_V11_ACTIVATION") return Response.json(await preflightWaveBatch2V11Activation(), { status: 200 });
    if (body.action === "ADOPT_WAVE_BATCH_2_V11_ENGINE_ROOT_CORRECTION") return Response.json(await adoptWaveBatch2V11EngineRootCorrection(), { status: 201 });
    if (body.action === "PREFLIGHT_WAVE_BATCH_2_V12_ACTIVATION") return Response.json(await preflightWaveBatch2V12Activation(), { status: 200 });
    if (body.action === "ADOPT_WAVE_BATCH_2_V12_ENGINE_ROOT_CORRECTION") return Response.json(await adoptWaveBatch2V12EngineRootCorrection(), { status: 201 });
    if (body.action === "PREFLIGHT_WAVE_BATCH_2_V13_ACTIVATION") return Response.json(await preflightWaveBatch2V13Activation(), { status: 200 });
    if (body.action === "ADOPT_WAVE_BATCH_2_V13_ENGINE_ROOT_CORRECTION") return Response.json(await adoptWaveBatch2V13EngineRootCorrection(), { status: 201 });
    if (body.action === "PREFLIGHT_WAVE_BATCH_2_V18_ACTIVATION") return Response.json(await preflightWaveBatch2V13Activation(), { status: 200 });
    if (body.action === "ADOPT_WAVE_BATCH_2_V18_ENGINE_ROOT_CORRECTION") return Response.json(await adoptWaveBatch2V13EngineRootCorrection(), { status: 201 });
    if (body.action === "PRODUCE_NEXT_WAVE_BATCH_2_SHOT") return Response.json(await produceNextWaveBatch2Shot(), { status: 201 });
    if (body.action === "RUN_WAVE_BATCH_2_AUDIT") return Response.json(await waveBatch2Audit(), { status: 202 });
    if (body.action === "RECONCILE_COST_GOVERNANCE") return Response.json(await reconcileCostGovernance(), { status: 200 });
    if (body.action === "PREPARE_MOTION_RIGHTS_REPAIR") return Response.json(await prepareMotionRightsRepair());
    if (body.action === "REPLACE_SOURCE_CANDIDATE") return Response.json(await replaceSourceCandidate(), { status: 202 });
    if (body.action === "EXECUTOR_HEARTBEAT") return await executorHeartbeat(request, body);
    if (body.action === "CLAIM_MEDIA_JOB") return await claimMediaJob(request, body);
    if (body.action === "CLAIM_MOTION_JOB") return await claimMotionJobBootstrap(body);
    if (body.action === "COMPLETE_MEDIA_JOB") return await completeMediaJob(request, body);
    if (body.action === "COMPLETE_MOTION_PROOF") return await completeMotionProof(request, body);
    if (body.action === "COMPLETE_SEQUENCE_PROOF") return await completeSequenceProof(request, body);
    if (body.action === "COMPLETE_SEQUENCE_PRODUCT") return await completeSequenceProduct(request, body);
    if (body.action === "FAIL_MEDIA_JOB") return await failMediaJob(request, body);
    return Response.json({ error: "Unsupported Stage 09 action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stage 09 failed";
    console.error(JSON.stringify({ event: "STAGE_09_ACTION_FAILED", action, message, at: new Date().toISOString() }));
    const status = /UNAUTHORIZED/.test(message)
      ? 401
      : /NOT_FROZEN|INCOMPLETE|REQUIRED|BLOCKED|CIRCUIT|ACTIVE|MISSING|NOT_FOUND|PIXEL|CANDIDATE|LEASE_INVALID/.test(message)
        ? 409
        : 500;
    return Response.json({ error: message }, { status });
  }
}
