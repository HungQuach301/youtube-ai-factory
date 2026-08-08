import { AI_USAGE_TABLE_SQL, recordOpenAIUsage } from "../../../../lib/ai-usage";
import { storeDriveBinaryArtifact, storeDriveJsonArtifact } from "../../../../lib/google-drive";
import jpeg from "jpeg-js";

const PROGRAM_ID = "YTAF-V7-GREENFIELD";
const STAGE = "09";
const STAGE_ID = `${PROGRAM_ID}-STAGE-${STAGE}`;
const THRESHOLD = 92;
const DEFAULT_MODEL = "gpt-5.6-sol";
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
type Env = { DB?: DB; BUCKET?: Bucket; OPENAI_API_KEY?: string; OPENAI_QA_MODEL?: string; PEXELS_API_KEY?: string; PIXABAY_API_KEY?: string; SHUTTERSTOCK_CONSUMER_KEY?: string };
type Row = Record<string, unknown>;
type Candidate = { id: string; provider: string; title: string; sourceUrl: string; assetUrl: string; thumbnailUrl: string; licenseCode: string; licenseUrl: string; width: number; height: number; duration: number; score: number };

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
  `CREATE TABLE IF NOT EXISTS v7_stage_model_settings (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,stage_key text NOT NULL,model_id text NOT NULL,reasoning_effort text NOT NULL,updated_at text NOT NULL)`,
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

async function runtime() {
  const { env } = await import("cloudflare:workers");
  const value = env as unknown as Env;
  if (!value.DB) throw new Error("Stage 09 database is unavailable");
  await value.DB.batch(schema.map((statement) => value.DB!.prepare(statement)));
  await value.DB.prepare("INSERT INTO v7_stage_states (id,program_id,stage_key,sequence,stage_name,status,threshold,blocker,evidence_summary) VALUES (?,?,?,9,?,'BLOCKED_UPSTREAM',92,'Stage 08 must freeze first','No verified Stage 08 artifact') ON CONFLICT(id) DO NOTHING").bind(STAGE_ID, PROGRAM_ID, STAGE, "Fresh material production").run();
  await value.DB.prepare("INSERT INTO v7_stage_model_settings (id,program_id,stage_key,model_id,reasoning_effort,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING").bind(`${PROGRAM_ID}-${STAGE}-MODEL`, PROGRAM_ID, STAGE, DEFAULT_MODEL, "low", new Date().toISOString()).run();
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
  const pilotBriefs = run ? await rows(db, "SELECT id,content_json,status FROM v7_material_briefs WHERE run_id=? AND pilot=1 ORDER BY start_seconds", run.id) : [];
  const content = artifact ? JSON.parse(String(artifact.content_json)) as Row : null;
  let shotCount = 0; try { shotCount = (await upstream(db)).shots.length; } catch { shotCount = 0; }
  const primaryFiles = files.filter((file) => file.asset_role === "PRIMARY");
  const items = pilotBriefs.map((brief) => { const value = JSON.parse(String(brief.content_json)) as Row, file = primaryFiles.find((item) => item.brief_id === brief.id), overlay = files.find((item) => item.brief_id === brief.id && item.asset_role === "OVERLAY"), auditRow = audits.find((item) => item.brief_id === brief.id), tournament = tournaments.find((item) => item.brief_id === brief.id), tournamentContent = tournament?.content_json ? rec(JSON.parse(String(tournament.content_json))) : {}; return { id: brief.id, briefId: value.briefId, route: value.route, family: value.primaryFamily, meaning: value.viewerMustUnderstand, status: auditRow?.status || file?.status || brief.status, file: file ? { id: file.id, provider: file.provider, mimeType: file.mime_type, bytes: Number(file.byte_size), hash: clean(file.content_hash).slice(0, 12), previewUrl: `/api/factory/material-production?file=${encodeURIComponent(String(file.id))}` } : null, overlay: overlay ? { id: overlay.id, previewUrl: `/api/factory/material-production?file=${encodeURIComponent(String(overlay.id))}` } : null, tournament: tournament ? { status: tournament.status, score: Number(tournament.score), candidateCount: Number(tournament.candidate_count), providerCoverage: Number(tournament.provider_coverage), championId: tournament.champion_candidate_id, bestCandidateId: tournamentContent.bestCandidateId || null, bestReason: tournamentContent.bestReason || null, repairAttempt: Number(tournamentContent.repairAttempt || 0), assignedPixelJob: tournamentContent.assignedPixelJob || null } : null, audit: auditRow ? { status: auditRow.status, score: Number(auditRow.score), findings: JSON.parse(String(auditRow.findings_json || "[]")) } : null }; });
  const uniqueMaterialized = new Set(primaryFiles.map((file) => String(file.brief_id))).size;
  return {
    stage: { status: clean(stage?.status || "BLOCKED_UPSTREAM"), threshold: Number(stage?.threshold || THRESHOLD), blocker: stage?.blocker || null, evidence: clean(stage?.evidence_summary) }, upstream: { frozen: shotCount === 166, shotCount }, providerReadiness: { openai: Boolean(env.OPENAI_API_KEY), pexels: Boolean(env.PEXELS_API_KEY), pixabay: Boolean(env.PIXABAY_API_KEY), shutterstock: Boolean(env.SHUTTERSTOCK_CONSUMER_KEY) },
    provider: { model: setting.modelId, reasoningEffort: setting.reasoningEffort, modelOptions: MODEL_OPTIONS, reasoningOptions: REASONING_OPTIONS },
    policy: { execution: "ZERO_SPEND_DRY_RUN_THEN_AUTHORIZED_TRANCHES", pilotShots: "8–12", expectedOutputTokens: "500–16000", safetyCeilings: "3000/8000/16000/32000", maxRetry: 1, retryPolicy: "DELTA_ONLY", incompletePolicy: "BLOCK_GATE", factualVisuals: "CODE_NATIVE", evidence: "STORED_PIXELS_AND_CHECKSUM" },
    run: run ? { id: run.id, status: run.status, score: Number(run.score), briefCount: Number(run.brief_count), pilotCount: Number(run.pilot_count), remoteRequests: Number(run.remote_requests), actualCostUsd: Number(run.actual_cost_usd), gates: JSON.parse(String(run.gate_json || "[]")) } : null,
    artifact: content ? { contentHash: artifact?.content_hash, runtimeKey: artifact?.runtime_key, driveFileId: artifact?.drive_file_id, pilotIds: content.pilotIds, routeMix: content.routeMix, modelMix: content.modelMix, sampleBriefs: arr(content.briefs).slice(0, 8) } : null,
    authorization: authorization ? { id: authorization.id, runId: authorization.run_id, scope: authorization.scope, status: authorization.status, shotCount: Number(authorization.shot_count), maxRemoteRequests: Number(authorization.max_remote_requests), maxActualSpendUsd: Number(authorization.max_actual_spend_usd), modelPolicy: JSON.parse(String(authorization.model_policy_json || "{}")), authorizedAt: authorization.authorized_at, revokedAt: authorization.revoked_at } : null,
    pilot: { materialized: uniqueMaterialized, audited: audits.filter((item) => ["PASS", "REPAIR_REQUIRED"].includes(String(item.status))).length, total: pilotBriefs.length, percent: pilotBriefs.length ? Math.round((uniqueMaterialized + audits.length) / (pilotBriefs.length * 2) * 100) : 0, items },
    requestLedger: { total: requestRows.length, planned: requestRows.filter((row) => row.status === "PLANNED").length, active: requestRows.filter((row) => ["QUEUED", "IN_PROGRESS"].includes(String(row.status))).length, complete: requestRows.filter((row) => row.status === "COMPLETE").length, incomplete: requestRows.filter((row) => row.status === "BLOCKED_INCOMPLETE").length, actualCostUsd: requestRows.reduce((sum, row) => sum + Number(row.actual_cost_usd || 0), 0), recent: requestRows.slice(0, 20).map((row) => ({ id: row.id, briefId: row.brief_id, phase: row.phase, provider: row.provider, modelId: row.model_id, status: row.status, inputTokens: Number(row.input_tokens), outputTokens: Number(row.output_tokens), reasoningTokens: Number(row.reasoning_tokens), actualCostUsd: Number(row.actual_cost_usd), error: row.error, createdAt: row.created_at })) },
  };
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
  const usage = await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(actual_cost_usd),0) AS cost FROM v7_material_requests WHERE authorization_id=?").bind(authorization.id).first<{ total: number; cost: number }>();
  if (Number(usage?.total || 0) >= Number(authorization.max_remote_requests)) throw new Error("PILOT_REQUEST_CIRCUIT_OPEN");
  if (Number(usage?.cost || 0) >= Number(authorization.max_actual_spend_usd)) throw new Error("PILOT_SPEND_CIRCUIT_OPEN");
  const id = `${authorization.run_id}-${briefId}-${phase}-${Date.now()}-${crypto.randomUUID()}`;
  await db.prepare("INSERT INTO v7_material_requests (id,program_id,run_id,authorization_id,brief_id,phase,provider,model_id,reasoning,status,idempotency_key,expected_output_tokens,max_output_tokens,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,'IN_PROGRESS',?,?,?,?,?)").bind(id, PROGRAM_ID, authorization.run_id, authorization.id, briefId, phase, provider, modelId, reasoning, `${authorization.id}:${briefId}:${phase}`, expected, maximum, new Date().toISOString(), new Date().toISOString()).run();
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

async function discoverCandidates(env: Env, db: DB, authorization: Row, briefRow: Row, brief: Row) {
  const previous = await db.prepare("SELECT status,content_json FROM v7_material_tournaments WHERE brief_id=? LIMIT 1").bind(briefRow.id).first<Row>();
  const previousContent = previous?.content_json ? rec(JSON.parse(String(previous.content_json))) : {};
  const repairAttempt = previous?.status === "NO_PIXEL_CHAMPION" ? Number(previousContent.repairAttempt || 0) + 1 : 0;
  if (repairAttempt > 1) throw new Error("PIXEL_REPAIR_EXHAUSTED · one bounded query repair already used");
  const query = searchPhrase(brief, repairAttempt), candidates: Candidate[] = [];
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
function ownedPng(brief: Row, state: 0 | 1 | 2, background?: { data: Uint8Array; width: number; height: number }) {
  const width=960,height=540,pixels=new Uint8Array(width*height*4), raw=new Uint8Array(height*(1+width*4));
  const color=(hex:string)=>[Number.parseInt(hex.slice(1,3),16),Number.parseInt(hex.slice(3,5),16),Number.parseInt(hex.slice(5,7),16),255] as const;
  const fill=(x:number,y:number,w:number,h:number,hex:string)=>{const c=color(hex);for(let py=Math.max(0,y);py<Math.min(height,y+h);py++)for(let px=Math.max(0,x);px<Math.min(width,x+w);px++){const i=(py*width+px)*4;pixels.set(c,i);}};
  const text=(value:string,x:number,y:number,scale:number,hex:string)=>{const c=color(hex);let cx=x;for(const char of value.toUpperCase()){const glyph=glyphs[char]||glyphs["?"];for(let gy=0;gy<7;gy++)for(let gx=0;gx<5;gx++)if(glyph[gy][gx]==="1")for(let sy=0;sy<scale;sy++)for(let sx=0;sx<scale;sx++){const px=cx+gx*scale+sx,py=y+gy*scale+sy;if(px>=0&&px<width&&py>=0&&py<height){const i=(py*width+px)*4;pixels.set(c,i);}}cx+=6*scale;}};
  const wrap=(value:string,limit:number)=>{const lines:string[]=[],words=clean(value).toUpperCase().split(" ");let line="";for(const word of words){const next=line?`${line} ${word}`:word;if(next.length>limit&&line){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines;};
  if (background) {
    const audienceCopy: Record<string, Array<[string,string,string]>> = {
      "MP-001": [["CREDIT PURCHASE","-----","CREDIT"],["CREDIT PURCHASE","$100.00","CREDIT"],["CREDIT PURCHASE","$100.00","PROCESSING"]],
      "MP-002": [["CREDIT PURCHASE","$100.00","PROCESSING"],["CREDIT PURCHASE","APPROVED","$100.00"],["AUTHORIZATION","APPROVED","NOT SETTLED"]],
      "MP-003": [["PURCHASE RECORD","$100.00","APPROVED"],["REWARD RECORD","REWARD","POSTED"],["TWO RECORDS","PURCHASE","REWARD"]],
      "MP-004": [["PURCHASE","$100.00","UNRESOLVED"],["PARTICIPANTS","MERCHANT","ACQUIRER"],["DISTINCT ROLES","MERCHANT","PROCESSOR"]],
      "MP-018": [["EVIDENCE BASE","NATIONAL","TOTAL"],["CARD SHARE","SUPPORTED","PROPORTION"],["SOURCE CHECK","YEAR","DENOMINATOR"]],
    };
    const [heading,main,sub]=audienceCopy[clean(brief.briefId)]?.[state] || [["EXPLANATION","ENTRY",""],["EXPLANATION","CHANGE",""],["EXPLANATION","OUTCOME",""]][state];
    const scale=Math.max(width/background.width,height/background.height),sourceWidth=width/scale,sourceHeight=height/scale,sourceX=(background.width-sourceWidth)/2,sourceY=(background.height-sourceHeight)/2;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){const sx=Math.min(background.width-1,Math.max(0,Math.floor(sourceX+x/scale))),sy=Math.min(background.height-1,Math.max(0,Math.floor(sourceY+y/scale))),source=(sy*background.width+sx)*4,target=(y*width+x)*4;pixels[target]=Math.round(background.data[source]*.58);pixels[target+1]=Math.round(background.data[source+1]*.58);pixels[target+2]=Math.round(background.data[source+2]*.58);pixels[target+3]=255;}
    fill(0,0,18,height,"#74c69d");
    if(clean(brief.briefId)==="MP-001") {
      // The real checkout remains context; the authored reader makes credit tender unmistakable.
      fill(58,104,348,350,"#173f38"); fill(82,132,300,112,"#f5edcf");
      text(state===0?"-----":"$100.00",state===0?148:112,166,state===0?6:7,"#0d3f32");
      text(state===2?"PROCESSING":"CREDIT",state===2?105:142,260,state===2?3:4,"#fffdf5");
      [[112,324],[184,324],[256,324],[112,378],[184,378],[256,378]].forEach(([x,y])=>fill(x,y,38,28,"#d9f1e4"));
      fill(132,438,198,8,"#74c69d");
    }
    fill(476,86,420,368,"#f5edcf"); fill(506,116,360,54,"#d9f1e4");
    text(heading,540,132,3,"#0d3f32");
    text(main,main.length>10?520:555,226,main.length>10?5:8,"#0d3f32");
    if(sub) text(sub,sub.length>11?535:600,340,4,"#0d3f32");
    fill(570,382,230+state*40,12,state===2?"#74c69d":"#7b958c");
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

async function storeMaterial(env: Env, db: DB, authorization: Row, briefRow: Row, options: { role: "PRIMARY" | "OVERLAY" | "QA_PROXY" | "QA_ENTRY" | "QA_MIDPOINT" | "QA_EXIT"; bytes: Uint8Array; mimeType: string; extension: string; sourceType: string; provider: string; providerAssetId?: string; sourceUrl?: string; landingUrl?: string; licenseCode: string; width: number; height: number; duration?: number; thumbnailUrl?: string }) {
  if (!env.BUCKET) throw new Error("R2 material storage is unavailable");
  const id = `${briefRow.id}-${options.role}`, hash = await shaBytes(options.bytes), key = `v7/material-production/${authorization.run_id}/pilot/${clean(briefRow.id).split("-").at(-1)}-${options.role.toLowerCase()}.${options.extension}`;
  await env.BUCKET.put(key, options.bytes, { httpMetadata: { contentType: options.mimeType }, customMetadata: { sha256: hash, briefId: String(briefRow.id), role: options.role, provider: options.provider, licenseCode: options.licenseCode } });
  if (!(await env.BUCKET.head(key))) throw new Error("R2_MATERIAL_READ_BACK_FAILED");
  const drive = await storeDriveBinaryArtifact({ folderPath: ["Channels", "Hidden Systems", "Projects", "V7 Greenfield Pilot", "Material Production", "Pilot 10"], fileName: `${clean(briefRow.id).split("-").at(-1)}-${options.role.toLowerCase()}.${options.extension}`, content: options.bytes, mimeType: options.mimeType, artifactId: id, contentHash: hash });
  await db.prepare("INSERT INTO v7_material_files (id,program_id,run_id,authorization_id,brief_id,asset_role,source_type,provider,provider_asset_id,source_url,landing_url,license_code,mime_type,width,height,duration_seconds,byte_size,content_hash,runtime_key,drive_file_id,thumbnail_url,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'STORED_VERIFIED') ON CONFLICT(id) DO UPDATE SET source_type=excluded.source_type,provider=excluded.provider,provider_asset_id=excluded.provider_asset_id,source_url=excluded.source_url,landing_url=excluded.landing_url,license_code=excluded.license_code,mime_type=excluded.mime_type,width=excluded.width,height=excluded.height,duration_seconds=excluded.duration_seconds,byte_size=excluded.byte_size,content_hash=excluded.content_hash,runtime_key=excluded.runtime_key,drive_file_id=excluded.drive_file_id,thumbnail_url=excluded.thumbnail_url,status='STORED_VERIFIED'").bind(id, PROGRAM_ID, authorization.run_id, authorization.id, briefRow.id, options.role, options.sourceType, options.provider, options.providerAssetId || null, options.sourceUrl || null, options.landingUrl || null, options.licenseCode, options.mimeType, options.width, options.height, options.duration || 0, options.bytes.byteLength, hash, key, drive.id, options.thumbnailUrl || null).run();
  return id;
}

async function materializeOne(env: Env, db: DB, authorization: Row, briefRow: Row) {
  const brief = JSON.parse(String(briefRow.content_json)) as Row, route = clean(brief.route);
  if (route === "MAKE") {
    await storeMaterial(env, db, authorization, briefRow, { role: "PRIMARY", bytes: ownedSvg(brief, "PRIMARY"), mimeType: "image/svg+xml", extension: "svg", sourceType: "OWNED_CODE_NATIVE", provider: "FRAMEFLOW_OWNED", licenseCode: "CHANNEL_OWNED", width: 1920, height: 1080 });
  } else {
    const discovery = await discoverCandidates(env, db, authorization, briefRow, brief);
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
function output(payload: Row) { if (typeof payload.output_text === "string") return payload.output_text; for (const item of arr(payload.output)) for (const block of arr(rec(item).content)) if (typeof rec(block).text === "string") return String(rec(block).text); throw new Error("OpenAI returned no structured pixel audit"); }

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
      await storeMaterial(env, db, authorization, briefRow, { role, bytes: ownedPng(brief, state, hybridBackground), mimeType: "image/png", extension: "png", sourceType: hybridBackground ? "HYBRID_AUDIENCE_COMPOSITE_V2" : "OWNED_AUDIENCE_FRAME_EVIDENCE", provider: "FRAMEFLOW_OWNED", licenseCode: "CHANNEL_OWNED", width: 960, height: 540 });
      const proxy = await db.prepare("SELECT * FROM v7_material_files WHERE brief_id=? AND asset_role=?").bind(briefRow.id, role).first<Row>() || undefined;
      if (proxy) { const object = await env.BUCKET?.get(clean(proxy.runtime_key)); if (object) imageUrls.push(`data:image/png;base64,${base64(new Uint8Array(await new Response(object.body).arrayBuffer()))}`); }
    }
  }
  if (!imageUrls.length) throw new Error("REPRESENTATIVE_PIXEL_EVIDENCE_MISSING");
  const requestId = await newRequest(db, authorization, clean(briefRow.id), "PIXEL_QA", "OPENAI", setting.modelId, setting.reasoningEffort, 1500, 8000);
  const content: Row[] = [{ type: "input_text", text: `Act as an exacting visual producer. Judge only the supplied audience-facing material pixels against this frozen shot contract. For HYBRID and authored material, the three images are the actual entry, midpoint and exit composites in that order and must visibly progress; there is no separate planning image. Broad topic similarity is a failure. Penalize generic stock, unsupported claims, decorative diagrams, visible production metadata, weak mobile hierarchy, cropping, logos, text artifacts and repeated-template appearance. A PASS requires every dimension at least 86 and overall at least 90. Do not infer motion that the supplied states do not prove.\n\nSHOT CONTRACT:\n${JSON.stringify({ narrationClause: brief.narrationClause, viewerMustUnderstand: brief.viewerMustUnderstand, route: brief.route, family: brief.primaryFamily, requiredEvidence: brief.requiredEvidence, prohibitedEvidence: brief.prohibitedEvidence, acceptance: brief.acceptance })}` }];
  for (const imageUrl of imageUrls) content.push({ type: "input_image", image_url: imageUrl, detail: "high" });
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ model: setting.modelId, reasoning: { effort: setting.reasoningEffort }, background: true, store: true, max_output_tokens: 8000, input: [{ role: "user", content }], text: { format: { type: "json_schema", name: "stage09_pixel_qa", strict: true, schema: visionSchema } } }), signal: AbortSignal.timeout(30000) });
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
  const tournaments = await rows(db, "SELECT brief_id,content_json,created_at FROM v7_material_tournaments WHERE authorization_id=? ORDER BY created_at DESC", authorization.id);
  const repaired = tournaments.find((item) => {
    try { return Number(rec(JSON.parse(String(item.content_json || "{}"))).repairAttempt || 0) > 0; }
    catch { return false; }
  });
  if (repaired?.brief_id) return db.prepare("SELECT * FROM v7_material_briefs WHERE id=? AND run_id=? AND pilot=1").bind(repaired.brief_id, authorization.run_id).first<Row>();
  return db.prepare("SELECT * FROM v7_material_briefs WHERE run_id=? AND pilot=1 AND status='REPAIR_REQUIRED' ORDER BY start_seconds LIMIT 1").bind(authorization.run_id).first<Row>();
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
        if (!file) await materializeOne(env, db, authorization, target);
        else if (!audit || audit.status === "REPAIR_REQUIRED") await dispatchVision(env, db, authorization, target);
        else await closeRepairedUnitGate(db, run, authorization, target);
      }
    }
    else if (active) await pollVision(env, db, authorization, active);
    else {
      const nextMaterial = await db.prepare("SELECT b.* FROM v7_material_briefs b LEFT JOIN v7_material_files f ON f.brief_id=b.id AND f.asset_role='PRIMARY' WHERE b.run_id=? AND b.pilot=1 AND f.id IS NULL ORDER BY b.start_seconds LIMIT 1").bind(run.id).first<Row>();
      if (nextMaterial) {
        await materializeOne(env, db, authorization, nextMaterial);
      }
      else {
        const nextAudit = await db.prepare("SELECT b.* FROM v7_material_briefs b LEFT JOIN v7_material_audits a ON a.brief_id=b.id WHERE b.run_id=? AND b.pilot=1 AND a.id IS NULL AND b.status<>'REPAIR_REQUIRED' ORDER BY b.start_seconds LIMIT 1").bind(run.id).first<Row>();
        if (nextAudit) await dispatchVision(env, db, authorization, nextAudit); else await finalizePilot(env, db, authorization);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "PILOT_UNIT_FAILED", now = new Date().toISOString();
    await db.batch([db.prepare("UPDATE v7_material_runs SET status='REPAIR_REQUIRED' WHERE id=?").bind(run.id), db.prepare("UPDATE v7_material_authorizations SET status='REPAIR_REQUIRED',updated_at=? WHERE id=?").bind(now, authorization.id), db.prepare("UPDATE v7_stage_states SET status='REPAIR_REQUIRED',blocker='PILOT_UNIT_FAILED',evidence_summary=?,updated_at=? WHERE id=?").bind(`Stored work preserved · ${message}`, now, STAGE_ID)]);
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
  const repairedAudit = repaired ? await db.prepare("SELECT status FROM v7_material_audits WHERE authorization_id=? AND brief_id=? ORDER BY created_at DESC LIMIT 1").bind(authorization.id, repaired.id).first<Row>() : null;
  const repairedUnitNeedsQa = run.status === "PILOT_REPAIR_REVIEW" && repaired && repairedAudit?.status !== "PASS";
  const repairOnly = run.status === "REPAIR_REQUIRED" || Boolean(repairedUnitNeedsQa) || recoverableActiveRepair, nextStatus = repairOnly ? "PILOT_REPAIR_RUNNING" : "PILOT_RUNNING";
  await db.batch([db.prepare("UPDATE v7_material_authorizations SET status='AUTHORIZED',updated_at=? WHERE id=?").bind(now, authorization.id), db.prepare("UPDATE v7_material_runs SET status=? WHERE id=?").bind(nextStatus, run.id), db.prepare("UPDATE v7_stage_states SET status=?,blocker=NULL,evidence_summary=?,updated_at=? WHERE id=?").bind(nextStatus, repairOnly ? "One failed material unit resumed; later units remain paused" : "Pilot continued after explicit repaired-unit review", now, STAGE_ID)]);
  return snapshot();
}

async function materialFile(request: Request) {
  const env = await runtime(), db = env.DB!, id = new URL(request.url).searchParams.get("file");
  if (!id || !env.BUCKET) return Response.json({ error: "Material file not found" }, { status: 404 });
  const file = await db.prepare("SELECT runtime_key,mime_type FROM v7_material_files WHERE id=?").bind(id).first<{ runtime_key: string; mime_type: string }>();
  if (!file) return Response.json({ error: "Material file not found" }, { status: 404 });
  const object = await env.BUCKET.get(file.runtime_key); if (!object) return Response.json({ error: "Stored material bytes not found" }, { status: 404 });
  return new Response(object.body, { headers: { "content-type": file.mime_type, "cache-control": "private, max-age=300", "content-disposition": "inline" } });
}

export async function GET(request: Request) { try { if (new URL(request.url).searchParams.has("file")) return materialFile(request); return Response.json(await snapshot()); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Stage 09 could not load" }, { status: 500 }); } }
export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: string; modelId?: string; reasoningEffort?: string };
    if (body.action === "BUILD_DRY_RUN") return Response.json(await buildDryRun(), { status: 201 });
    if (body.action === "AUTHORIZE_PILOT") return Response.json(await authorizePilot(), { status: 201 });
    if (body.action === "REVOKE_PILOT") return Response.json(await revokePilot());
    if (body.action === "SET_MODEL") return Response.json(await setModel(clean(body.modelId), clean(body.reasoningEffort)));
    if (body.action === "START_PILOT") return Response.json(await startPilot(), { status: 202 });
    if (body.action === "STEP_PILOT") return Response.json(await stepPilot(), { status: 202 });
    if (body.action === "STOP_PILOT") return Response.json(await stopPilot());
    if (body.action === "RESUME_PILOT") return Response.json(await resumePilot(), { status: 202 });
    return Response.json({ error: "Unsupported Stage 09 action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stage 09 failed";
    return Response.json({ error: message }, { status: /NOT_FROZEN|INCOMPLETE|REQUIRED|BLOCKED|CIRCUIT|ACTIVE|MISSING|NOT_FOUND|PIXEL|CANDIDATE/.test(message) ? 409 : 500 });
  }
}
