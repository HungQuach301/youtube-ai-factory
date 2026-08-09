import { AI_USAGE_TABLE_SQL, recordOpenAIUsage } from "../../../../lib/ai-usage";
import { storeDriveBinaryArtifact, storeDriveJsonArtifact } from "../../../../lib/google-drive";
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
const RELIABILITY_BASELINE_VERSION = "STAGE09_RELIABILITY_BASELINE_V1";
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
  version: "MATERIAL_PRODUCTION_V2",
  status: "QUALITY_SCALE_REBUILD",
  principle: "No tranche scales from metadata, thumbnails or a single passing shot. Stored final pixels and sequence evidence authorize scale.",
  planes: [
    { id: "CONTROL", name: "Control plane", status: "READY", responsibility: "Contracts, authorization, state, cost, stop/resume and immutable evidence references." },
    { id: "SOURCE", name: "Source intelligence", status: "BLOCKED", responsibility: "Decode actual provider video, sample candidate frames and reject prohibited objects before selection." },
    { id: "COMPOSE", name: "Semantic composition", status: "PARTIAL", responsibility: "Family-specific renderers and a composite tournament create meaning-bearing entry, midpoint and exit states." },
    { id: "QA", name: "Perceptual QA", status: "PARTIAL", responsibility: "Candidate, composite, motion and sequence gates inspect stored audience-facing evidence." },
    { id: "EXECUTION", name: "Media execution", status: "BLOCKED", responsibility: "Queue-backed frame extraction, rendering and media transforms run outside synchronous control-plane requests." },
    { id: "SCALE", name: "Scale governor", status: "BLOCKED", responsibility: "One repaired unit, ten-shot pilot, 30-second sequence and bounded waves must pass before 166-shot production." },
  ],
  qualityLadder: [
    { order: 1, name: "Source-frame gate", exit: "Actual MP4 frames, negative-object clearance, rights and context fit." },
    { order: 2, name: "Composite tournament", exit: "At least three materially different audience-facing compositions; one pixel champion." },
    { order: 3, name: "Motion proof", exit: "Distinct entry, midpoint and exit plus exact narration-bound timing." },
    { order: 4, name: "Sequence gate", exit: "30-second playback proves semantic continuity, variety, rhythm, mobile safety and clean audio handoff." },
    { order: 5, name: "Wave admission", exit: "Zero P0/P1, all materials >=90 overall and every supporting dimension >=86." },
  ],
  scalePolicy: {
    tranches: ["1 root-cause unit", "10-shot pilot", "30-second sequence", "25-shot wave", "remaining bounded waves"],
    concurrency: "Adaptive 2–8 workers by provider health, queue age and defect rate",
    stopConditions: ["Any P0", "P1 defect rate >5%", "duplicate signature >2%", "provider failure >10%", "cost variance >20%"],
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
  `CREATE TABLE IF NOT EXISTS v7_stage_model_settings (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,stage_key text NOT NULL,model_id text NOT NULL,reasoning_effort text NOT NULL,updated_at text NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_architecture_baselines (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,stage_key text NOT NULL,version text NOT NULL,status text NOT NULL,execution_state text NOT NULL,source_checkpoint text NOT NULL,controls_json text NOT NULL,qualification_json text NOT NULL,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,frozen_at text)`,
  `CREATE TABLE IF NOT EXISTS v7_compiled_shot_contracts (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,baseline_id text NOT NULL,brief_id text NOT NULL,archetype text NOT NULL,risk_tier text NOT NULL,claim text NOT NULL,required_evidence_json text NOT NULL,allowed_modalities_json text NOT NULL,forbidden_json text NOT NULL,repair_route text NOT NULL,lint_status text NOT NULL,lint_json text NOT NULL,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_archetype_qualifications (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,baseline_id text NOT NULL,archetype text NOT NULL,status text NOT NULL,hardest_fixture text NOT NULL,deterministic_checks_json text NOT NULL,evidence_status text NOT NULL,first_pass_yield real DEFAULT 0 NOT NULL,blocker text,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
] as const;

const arr = (value: unknown) => Array.isArray(value) ? value : [];
const rec = (value: unknown) => value && typeof value === "object" ? value as Row : {};
const clean = (value: unknown) => String(value || "").replace(/\s+/g, " ").trim();
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
  const files = authorization ? await rows(db, "SELECT * FROM v7_material_files WHERE authorization_id=? ORDER BY created_at ASC", authorization.id) : [];
  const audits = authorization ? await rows(db, "SELECT * FROM v7_material_audits WHERE authorization_id=? ORDER BY created_at ASC", authorization.id) : [];
  const tournaments = authorization ? await rows(db, "SELECT * FROM v7_material_tournaments WHERE authorization_id=? ORDER BY created_at ASC", authorization.id) : [];
  const mediaJobs = authorization ? await rows(db, "SELECT * FROM v7_media_jobs WHERE authorization_id=? ORDER BY created_at DESC", authorization.id) : [];
  const mediaEvidence = authorization ? await rows(db, "SELECT * FROM v7_media_evidence WHERE authorization_id=? ORDER BY created_at DESC", authorization.id) : [];
  const sourceAudits = authorization ? await rows(db, "SELECT * FROM v7_source_frame_audits WHERE authorization_id=? ORDER BY updated_at DESC", authorization.id) : [];
  const compositeAudits = authorization ? await rows(db, "SELECT * FROM v7_composite_audits WHERE authorization_id=? ORDER BY updated_at DESC", authorization.id) : [];
  const motionProofs = authorization ? await rows(db, "SELECT * FROM v7_motion_proofs WHERE authorization_id=? ORDER BY created_at DESC", authorization.id) : [];
  const motionAudits = authorization ? await rows(db, "SELECT * FROM v7_motion_audits WHERE authorization_id=? ORDER BY created_at DESC", authorization.id) : [];
  const reliabilityBaseline = await db.prepare("SELECT * FROM v7_architecture_baselines WHERE program_id=? AND stage_key=? ORDER BY created_at DESC LIMIT 1").bind(PROGRAM_ID, STAGE).first<Row>();
  const compiledContracts = reliabilityBaseline ? await rows(db, "SELECT * FROM v7_compiled_shot_contracts WHERE baseline_id=? ORDER BY brief_id", reliabilityBaseline.id) : [];
  const archetypeQualifications = reliabilityBaseline ? await rows(db, "SELECT * FROM v7_archetype_qualifications WHERE baseline_id=? ORDER BY archetype", reliabilityBaseline.id) : [];
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
  const motionJob = mediaJobs.find((job) => job.job_type === "MOTION_PROOF_RENDER");
  const productionQuarantined = reliabilityBaseline?.execution_state === "FROZEN";
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
    reliability: reliabilityBaseline ? {
      version: reliabilityBaseline.version,
      status: reliabilityBaseline.status,
      executionState: reliabilityBaseline.execution_state,
      sourceCheckpoint: reliabilityBaseline.source_checkpoint,
      controls: JSON.parse(String(reliabilityBaseline.controls_json || "[]")),
      qualification: JSON.parse(String(reliabilityBaseline.qualification_json || "{}")),
      compiled: { total: compiledContracts.length, pass: compiledContracts.filter((item) => item.lint_status === "PASS").length, redesign: compiledContracts.filter((item) => item.lint_status === "REDESIGN_REQUIRED").length },
      archetypes: archetypeQualifications.map((item) => ({ name: item.archetype, status: item.status, hardestFixture: item.hardest_fixture, evidenceStatus: item.evidence_status, firstPassYield: Number(item.first_pass_yield), blocker: item.blocker, checks: JSON.parse(String(item.deterministic_checks_json || "[]")) })),
      frozenAt: reliabilityBaseline.frozen_at,
    } : null,
    policy: { execution: "ZERO_SPEND_DRY_RUN_THEN_AUTHORIZED_TRANCHES", pilotShots: "8–12", expectedOutputTokens: "500–16000", safetyCeilings: "3000/8000/16000/32000", maxRetry: 1, retryPolicy: "DELTA_ONLY", incompletePolicy: "BLOCK_GATE", factualVisuals: "CODE_NATIVE", evidence: "STORED_PIXELS_AND_CHECKSUM" },
    run: run ? { id: run.id, status: run.status, score: Number(run.score), briefCount: Number(run.brief_count), pilotCount: Number(run.pilot_count), remoteRequests: Number(run.remote_requests), actualCostUsd: Number(run.actual_cost_usd), gates: JSON.parse(String(run.gate_json || "[]")) } : null,
    artifact: content ? { contentHash: artifact?.content_hash, runtimeKey: artifact?.runtime_key, driveFileId: artifact?.drive_file_id, pilotIds: content.pilotIds, routeMix: content.routeMix, modelMix: content.modelMix, sampleBriefs: arr(content.briefs).slice(0, 8) } : null,
    authorization: authorization ? { id: authorization.id, runId: authorization.run_id, scope: authorization.scope, status: authorization.status, shotCount: Number(authorization.shot_count), maxRemoteRequests: Number(authorization.max_remote_requests), maxActualSpendUsd: Number(authorization.max_actual_spend_usd), modelPolicy: JSON.parse(String(authorization.model_policy_json || "{}")), authorizedAt: authorization.authorized_at, revokedAt: authorization.revoked_at } : null,
    pilot: { materialized: uniqueMaterialized, audited: audits.filter((item) => ["PASS", "REPAIR_REQUIRED"].includes(String(item.status))).length, total: pilotBriefs.length, percent: pilotBriefs.length ? Math.round((uniqueMaterialized + audits.length) / (pilotBriefs.length * 2) * 100) : 0, items },
    requestLedger: { total: requestRows.length, planned: requestRows.filter((row) => row.status === "PLANNED").length, active: requestRows.filter((row) => ["QUEUED", "IN_PROGRESS"].includes(String(row.status))).length, complete: requestRows.filter((row) => row.status === "COMPLETE").length, incomplete: requestRows.filter((row) => row.status === "BLOCKED_INCOMPLETE").length, actualCostUsd: requestRows.reduce((sum, row) => sum + Number(row.actual_cost_usd || 0), 0), recent: requestRows.slice(0, 20).map((row) => ({ id: row.id, briefId: row.brief_id, phase: row.phase, provider: row.provider, modelId: row.model_id, status: row.status, inputTokens: Number(row.input_tokens), outputTokens: Number(row.output_tokens), reasoningTokens: Number(row.reasoning_tokens), actualCostUsd: Number(row.actual_cost_usd), error: row.error, createdAt: row.created_at })) },
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
  const negativeState = /not settled|not final|pending|await|processing|verified but|not yet/.test(text);
  const transactionState = /payment|transaction|checkout|authorization|verified|settled|terminal/.test(text);
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
  const hardFixtureRejectedGenericSource = hardest.contract.archetype === "TRANSACTION_STATE_PROOF" && hardest.contract.lintStatus === "REDESIGN_REQUIRED" && hardest.contract.allowedModalities.includes("CONTROLLED_UI");
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
    db.prepare("INSERT INTO v7_architecture_baselines (id,program_id,stage_key,version,status,execution_state,source_checkpoint,controls_json,qualification_json,created_at,frozen_at) VALUES (?,?,?,?,?,'FROZEN','V150_PILOT_REPAIR_BLOCKED',?,?,?,?)").bind(baselineId, PROGRAM_ID, STAGE, RELIABILITY_BASELINE_VERSION, qualified ? "QUALIFIED_FOR_ARCHETYPE_CERTIFICATION" : "QUALIFICATION_FAILED", JSON.stringify(controls), JSON.stringify(qualification), now, now),
    db.prepare("UPDATE v7_stage_states SET status='ARCHITECTURE_QUALIFIED',blocker='ARCHETYPE_CERTIFICATION_REQUIRED',evidence_summary=?,updated_at=? WHERE id=?").bind(`Reliability baseline ${qualification.score}/100 · production execution frozen · MP-153 reclassified as archetype fixture`, now, STAGE_ID),
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

async function newRequest(db: DB, authorization: Row, briefId: string, phase: string, provider: string, modelId = "none", reasoning = "none", expected = 0, maximum = 0) {
  const baseline = await db.prepare("SELECT execution_state FROM v7_architecture_baselines WHERE program_id=? AND stage_key=? ORDER BY created_at DESC LIMIT 1").bind(PROGRAM_ID, STAGE).first<Row>();
  if (baseline?.execution_state === "FROZEN" && !phase.startsWith("ARCHETYPE_CERTIFICATION")) throw new Error("PRODUCTION_EXECUTION_QUARANTINED · archetype certification must pass before provider dispatch");
  const usage = await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(actual_cost_usd),0) AS cost FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<{ total: number; cost: number }>();
  if (Number(usage?.total || 0) >= Number(authorization.max_remote_requests)) throw new Error("PILOT_REQUEST_CIRCUIT_OPEN");
  if (Number(usage?.cost || 0) >= Number(authorization.max_actual_spend_usd)) throw new Error("PILOT_SPEND_CIRCUIT_OPEN");
  const id = `${authorization.run_id}-${briefId}-${phase}-${Date.now()}-${crypto.randomUUID()}`;
  // Before v138 this field stored only the logical operation family, so a
  // bounded retry could legitimately reuse the same value. Keep those rows
  // immutable, but make every new dispatch identity request-scoped. The stable
  // operation family is still recoverable from authorization/brief/phase.
  const operationKey = `${authorization.id}:${briefId}:${phase}`;
  const idempotencyKey = `${operationKey}:request:${id}`;
  await db.prepare("INSERT INTO v7_material_requests (id,program_id,run_id,authorization_id,brief_id,phase,provider,model_id,reasoning,status,idempotency_key,expected_output_tokens,max_output_tokens,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,'IN_PROGRESS',?,?,?,?,?)").bind(id, PROGRAM_ID, authorization.run_id, authorization.id, briefId, phase, provider, modelId, reasoning, idempotencyKey, expected, maximum, new Date().toISOString(), new Date().toISOString()).run();
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
      "MP-153": [["PAYMENT PRESENTED","PROCESSING","AWAIT CONFIRMATION"],["NEUTRAL CONFIRMATION","VERIFIED","NOT SETTLED"],["CONFIRMATION HOLDS","VERIFIED","NOT SETTLED"]],
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
      fill(548,160,332,300,"#f5edcf"); text(main,main.length>10?578:602,208,main.length>10?3:6,"#0d3f32");
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

type MaterialRole = "PRIMARY" | "OVERLAY" | "QA_PROXY" | "QA_ENTRY" | "QA_MIDPOINT" | "QA_EXIT" | "SOURCE_ENTRY" | "SOURCE_MIDPOINT" | "SOURCE_EXIT" | "COMPOSITE_A_ENTRY" | "COMPOSITE_A_MIDPOINT" | "COMPOSITE_A_EXIT" | "COMPOSITE_B_ENTRY" | "COMPOSITE_B_MIDPOINT" | "COMPOSITE_B_EXIT" | "COMPOSITE_C_ENTRY" | "COMPOSITE_C_MIDPOINT" | "COMPOSITE_C_EXIT" | "MOTION_PROOF" | "MOTION_ENTRY" | "MOTION_MIDPOINT" | "MOTION_EXIT";
async function storeMaterial(env: Env, db: DB, authorization: Row, briefRow: Row, options: { role: MaterialRole; identity?: string; bytes: Uint8Array; mimeType: string; extension: string; sourceType: string; provider: string; providerAssetId?: string; sourceUrl?: string; landingUrl?: string; licenseCode: string; width: number; height: number; duration?: number; thumbnailUrl?: string }) {
  if (!env.BUCKET) throw new Error("R2 material storage is unavailable");
  const identity = clean(options.identity).replace(/[^a-zA-Z0-9_-]/g, "").slice(-48), suffix = identity ? `${identity}-` : "";
  const id = `${briefRow.id}-${suffix}${options.role}`, hash = await shaBytes(options.bytes), key = `v7/material-production/${authorization.run_id}/pilot/${clean(briefRow.id).split("-").at(-1)}-${suffix}${options.role.toLowerCase()}.${options.extension}`;
  await env.BUCKET.put(key, options.bytes, { httpMetadata: { contentType: options.mimeType }, customMetadata: { sha256: hash, briefId: String(briefRow.id), role: options.role, provider: options.provider, licenseCode: options.licenseCode } });
  if (!(await env.BUCKET.head(key))) throw new Error("R2_MATERIAL_READ_BACK_FAILED");
  const drive = await storeDriveBinaryArtifact({ folderPath: ["Channels", "Hidden Systems", "Projects", "V7 Greenfield Pilot", "Material Production", "Pilot 10"], fileName: `${clean(briefRow.id).split("-").at(-1)}-${suffix}${options.role.toLowerCase()}.${options.extension}`, content: options.bytes, mimeType: options.mimeType, artifactId: id, contentHash: hash });
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

const visionSchema = { type: "object", additionalProperties: false, properties: { semanticFit: { type: "integer", minimum: 0, maximum: 100 }, factualSafety: { type: "integer", minimum: 0, maximum: 100 }, composition: { type: "integer", minimum: 0, maximum: 100 }, mobileLegibility: { type: "integer", minimum: 0, maximum: 100 }, authenticity: { type: "integer", minimum: 0, maximum: 100 }, overall: { type: "integer", minimum: 0, maximum: 100 }, decision: { type: "string", enum: ["PASS", "REPAIR"] }, findings: { type: "array", maxItems: 5, items: { type: "string", minLength: 6, maxLength: 180 } }, exactRepair: { type: "string", minLength: 6, maxLength: 240 } }, required: ["semanticFit", "factualSafety", "composition", "mobileLegibility", "authenticity", "overall", "decision", "findings", "exactRepair"] };
const sourceFrameQaSchema = { type: "object", additionalProperties: false, properties: { semanticSpecificity: { type: "integer", minimum: 0, maximum: 100 }, contradictionSafety: { type: "integer", minimum: 0, maximum: 100 }, contextFit: { type: "integer", minimum: 0, maximum: 100 }, frameDifferentiation: { type: "integer", minimum: 0, maximum: 100 }, mobileClarity: { type: "integer", minimum: 0, maximum: 100 }, overall: { type: "integer", minimum: 0, maximum: 100 }, decision: { type: "string", enum: ["PASS", "REPAIR"] }, findings: { type: "array", minItems: 1, maxItems: 5, items: { type: "string", minLength: 8, maxLength: 220 } }, replacementQuery: { type: "string", minLength: 8, maxLength: 180 }, sourceLayerContract: { type: "string", minLength: 8, maxLength: 260 } }, required: ["semanticSpecificity", "contradictionSafety", "contextFit", "frameDifferentiation", "mobileClarity", "overall", "decision", "findings", "replacementQuery", "sourceLayerContract"] };
const compositeCandidateSchema = { type: "object", additionalProperties: false, properties: { semanticFit: { type: "integer", minimum: 0, maximum: 100 }, factualSafety: { type: "integer", minimum: 0, maximum: 100 }, composition: { type: "integer", minimum: 0, maximum: 100 }, mobileLegibility: { type: "integer", minimum: 0, maximum: 100 }, authenticity: { type: "integer", minimum: 0, maximum: 100 }, progression: { type: "integer", minimum: 0, maximum: 100 }, overall: { type: "integer", minimum: 0, maximum: 100 } }, required: ["semanticFit", "factualSafety", "composition", "mobileLegibility", "authenticity", "progression", "overall"] };
const compositeTournamentSchema = { type: "object", additionalProperties: false, properties: { winner: { type: "string", enum: ["A", "B", "C"] }, decision: { type: "string", enum: ["PASS", "REPAIR"] }, candidateA: compositeCandidateSchema, candidateB: compositeCandidateSchema, candidateC: compositeCandidateSchema, findings: { type: "array", minItems: 1, maxItems: 6, items: { type: "string", minLength: 8, maxLength: 220 } }, exactRepair: { type: "string", minLength: 8, maxLength: 260 } }, required: ["winner", "decision", "candidateA", "candidateB", "candidateC", "findings", "exactRepair"] };
const motionQaSchema = { type: "object", additionalProperties: false, properties: { semanticContinuity: { type: "integer", minimum: 0, maximum: 100 }, factualSafety: { type: "integer", minimum: 0, maximum: 100 }, transitionQuality: { type: "integer", minimum: 0, maximum: 100 }, mobileLegibility: { type: "integer", minimum: 0, maximum: 100 }, timingFit: { type: "integer", minimum: 0, maximum: 100 }, overall: { type: "integer", minimum: 0, maximum: 100 }, decision: { type: "string", enum: ["PASS", "REPAIR"] }, findings: { type: "array", minItems: 1, maxItems: 6, items: { type: "string", minLength: 8, maxLength: 220 } }, exactRepair: { type: "string", minLength: 8, maxLength: 260 } }, required: ["semanticContinuity", "factualSafety", "transitionQuality", "mobileLegibility", "timingFit", "overall", "decision", "findings", "exactRepair"] };
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
  const result = JSON.parse(output(payload)) as Row, dimensions = ["semanticFit", "factualSafety", "composition", "mobileLegibility", "authenticity"], hardPass = dimensions.every((key) => Number(result[key]) >= 86) && Number(result.overall) >= 90 && result.decision === "PASS", file = await db.prepare("SELECT id FROM v7_material_files WHERE brief_id=? AND asset_role='PRIMARY'").bind(requestRow.brief_id).first<Row>();
  await db.prepare("INSERT INTO v7_material_audits (id,program_id,run_id,authorization_id,brief_id,file_id,status,score,dimensions_json,provider_response_id,findings_json) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET file_id=excluded.file_id,status=excluded.status,score=excluded.score,dimensions_json=excluded.dimensions_json,provider_response_id=excluded.provider_response_id,findings_json=excluded.findings_json").bind(`${requestRow.brief_id}-PIXEL-AUDIT`, PROGRAM_ID, authorization.run_id, authorization.id, requestRow.brief_id, file?.id || "MISSING", hardPass ? "PASS" : "REPAIR_REQUIRED", Number(result.overall), JSON.stringify(Object.fromEntries(dimensions.map((key) => [key, Number(result[key])]))), payload.id, JSON.stringify([...(arr(result.findings)), clean(result.exactRepair)].filter(Boolean))).run();
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
  if (!run || !authorization || authorization.status !== "AUTHORIZED" || !["PILOT_RUNNING", "PILOT_REPAIR_RUNNING"].includes(clean(run.status))) return snapshot();
  const repairOnly = run.status === "PILOT_REPAIR_RUNNING";
  try {
    const active = await db.prepare("SELECT * FROM v7_material_requests WHERE authorization_id=? AND provider='OPENAI' AND status IN ('QUEUED','IN_PROGRESS') ORDER BY created_at LIMIT 1").bind(authorization.id).first<Row>();
    if (repairOnly) {
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
    await db.batch([db.prepare("UPDATE v7_material_briefs SET status='REPAIR_REQUIRED' WHERE run_id=? AND pilot=1 AND status IN ('MATERIALIZING','QA_DISPATCHING')").bind(run.id), db.prepare("UPDATE v7_material_runs SET status='REPAIR_REQUIRED' WHERE id=?").bind(run.id), db.prepare("UPDATE v7_material_authorizations SET status='REPAIR_REQUIRED',updated_at=? WHERE id=?").bind(now, authorization.id), db.prepare("UPDATE v7_stage_states SET status='REPAIR_REQUIRED',blocker='PILOT_UNIT_FAILED',evidence_summary=?,updated_at=? WHERE id=?").bind(`Stored work preserved · ${message}`, now, STAGE_ID)]);
  }
  await syncRunTotals(db, clean(run.id));
  const materialized = await db.prepare("SELECT COUNT(DISTINCT brief_id) AS total FROM v7_material_files WHERE authorization_id=? AND asset_role='PRIMARY'").bind(authorization.id).first<{ total: number }>(), audited = await db.prepare("SELECT COUNT(*) AS total FROM v7_material_audits WHERE authorization_id=?").bind(authorization.id).first<{ total: number }>();
  const state = await db.prepare("SELECT status FROM v7_material_runs WHERE id=?").bind(run.id).first<{ status: string }>();
  if (["PILOT_RUNNING", "PILOT_REPAIR_RUNNING"].includes(clean(state?.status))) await db.prepare("UPDATE v7_stage_states SET evidence_summary=?,updated_at=? WHERE id=?").bind(`${Number(materialized?.total || 0)}/${authorization.shot_count} materialized · ${Number(audited?.total || 0)}/${authorization.shot_count} pixel audited`, new Date().toISOString(), STAGE_ID).run();
  return snapshot();
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
  const sourceDownloadUrls = arr(contract.sources).map(rec).map((source) => ({ state: clean(source.state), fileId: clean(source.fileId), sha256: clean(source.sha256), url: `/api/factory/material-production?executionSource=${encodeURIComponent(clean(claimed.id))}&leaseToken=${encodeURIComponent(leaseToken)}&fileId=${encodeURIComponent(clean(source.fileId))}` }));
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
  if (requestedFileId && (job.job_type !== "MOTION_PROOF_RENDER" || !allowedSources.includes(requestedFileId))) throw new Error("MEDIA_SOURCE_NOT_AUTHORIZED");
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

export async function GET(request: Request) { try { const params = new URL(request.url).searchParams; if (params.has("executionSource")) return await executionSource(request); if (params.has("file")) return await materialFile(request); return Response.json(await snapshot()); } catch (error) { const message = error instanceof Error ? error.message : "Stage 09 could not load"; return Response.json({ error: message }, { status: /UNAUTHORIZED/.test(message) ? 401 : /LEASE_INVALID/.test(message) ? 409 : /NOT_FOUND|MISSING/.test(message) ? 404 : 500 }); } }
export async function POST(request: Request) {
  try {
    const body = await request.json() as Row;
    if (body.action === "QUALIFY_RELIABILITY_BASELINE") return Response.json(await qualifyReliabilityBaseline(), { status: 201 });
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
    if (body.action === "PREPARE_MOTION_RIGHTS_REPAIR") return Response.json(await prepareMotionRightsRepair());
    if (body.action === "REPLACE_SOURCE_CANDIDATE") return Response.json(await replaceSourceCandidate(), { status: 202 });
    if (body.action === "EXECUTOR_HEARTBEAT") return await executorHeartbeat(request, body);
    if (body.action === "CLAIM_MEDIA_JOB") return await claimMediaJob(request, body);
    if (body.action === "CLAIM_MOTION_JOB") return await claimMotionJobBootstrap(body);
    if (body.action === "COMPLETE_MEDIA_JOB") return await completeMediaJob(request, body);
    if (body.action === "COMPLETE_MOTION_PROOF") return await completeMotionProof(request, body);
    if (body.action === "FAIL_MEDIA_JOB") return await failMediaJob(request, body);
    return Response.json({ error: "Unsupported Stage 09 action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stage 09 failed";
    const status = /UNAUTHORIZED/.test(message)
      ? 401
      : /NOT_FROZEN|INCOMPLETE|REQUIRED|BLOCKED|CIRCUIT|ACTIVE|MISSING|NOT_FOUND|PIXEL|CANDIDATE|LEASE_INVALID/.test(message)
        ? 409
        : 500;
    return Response.json({ error: message }, { status });
  }
}
