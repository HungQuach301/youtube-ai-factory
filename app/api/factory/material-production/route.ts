import { storeDriveJsonArtifact } from "../../../../lib/google-drive";

const PROGRAM_ID = "YTAF-V7-GREENFIELD";
const STAGE_ID = `${PROGRAM_ID}-STAGE-09`;
const THRESHOLD = 92;

type Statement = {
  bind: (...values: unknown[]) => Statement;
  run: () => Promise<unknown>;
  all: <T>() => Promise<{ results?: T[] }>;
  first: <T>() => Promise<T | null>;
};
type DB = { prepare: (query: string) => Statement; batch: (statements: Statement[]) => Promise<unknown> };
type Bucket = { put: (key: string, value: string, options?: Record<string, unknown>) => Promise<unknown>; head: (key: string) => Promise<unknown> };
type Env = { DB?: DB; BUCKET?: Bucket; OPENAI_API_KEY?: string; PEXELS_API_KEY?: string; PIXABAY_API_KEY?: string; SHUTTERSTOCK_CONSUMER_KEY?: string };
type Row = Record<string, unknown>;

const schema = [
  `CREATE TABLE IF NOT EXISTS v7_stage_states (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, stage_key text NOT NULL, sequence integer NOT NULL, stage_name text NOT NULL, status text DEFAULT 'BLOCKED_UPSTREAM' NOT NULL, threshold integer DEFAULT 92 NOT NULL, attempt integer DEFAULT 0 NOT NULL, artifact_id text, blocker text, evidence_summary text DEFAULT 'No verified artifact' NOT NULL, frozen_at text, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_shot_artifacts (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,run_id text NOT NULL,lifecycle_state text DEFAULT 'MATERIALIZED' NOT NULL,content_json text NOT NULL,content_hash text NOT NULL,runtime_key text,drive_file_id text,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_material_runs (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, status text DEFAULT 'BUILDING' NOT NULL, mode text DEFAULT 'ZERO_SPEND_DRY_RUN' NOT NULL, brief_count integer DEFAULT 0 NOT NULL, pilot_count integer DEFAULT 0 NOT NULL, score integer DEFAULT 0 NOT NULL, remote_requests integer DEFAULT 0 NOT NULL, actual_cost_usd real DEFAULT 0 NOT NULL, gate_json text DEFAULT '[]' NOT NULL, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, completed_at text)`,
  `CREATE TABLE IF NOT EXISTS v7_material_briefs (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, run_id text NOT NULL, shot_id text NOT NULL, section_id text NOT NULL, start_seconds real NOT NULL, end_seconds real NOT NULL, route text NOT NULL, visual_family text NOT NULL, model_lane text NOT NULL, output_ceiling integer DEFAULT 0 NOT NULL, retry_limit integer DEFAULT 0 NOT NULL, pilot integer DEFAULT false NOT NULL, content_json text NOT NULL, content_hash text NOT NULL, status text DEFAULT 'PLANNED' NOT NULL, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_material_artifacts (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, run_id text NOT NULL, lifecycle_state text DEFAULT 'DRY_RUN_FROZEN' NOT NULL, content_json text NOT NULL, content_hash text NOT NULL, runtime_key text, drive_file_id text, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_material_authorizations (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, run_id text NOT NULL, scope text DEFAULT 'PILOT' NOT NULL, status text DEFAULT 'AUTHORIZED' NOT NULL, shot_count integer NOT NULL, max_remote_requests integer NOT NULL, max_actual_spend_usd real NOT NULL, model_policy_json text NOT NULL, authorized_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, revoked_at text, completed_at text, updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_material_requests (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, run_id text NOT NULL, authorization_id text NOT NULL, brief_id text NOT NULL, phase text NOT NULL, provider text NOT NULL, model_id text NOT NULL, reasoning text NOT NULL, status text DEFAULT 'PLANNED' NOT NULL, idempotency_key text NOT NULL, provider_response_id text, input_tokens integer DEFAULT 0 NOT NULL, output_tokens integer DEFAULT 0 NOT NULL, reasoning_tokens integer DEFAULT 0 NOT NULL, expected_output_tokens integer DEFAULT 0 NOT NULL, max_output_tokens integer DEFAULT 0 NOT NULL, estimated_cost_usd real DEFAULT 0 NOT NULL, actual_cost_usd real DEFAULT 0 NOT NULL, retry_of text, retry_scope text DEFAULT 'NONE' NOT NULL, error text, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
] as const;

const arr = (value: unknown) => Array.isArray(value) ? value : [];
const rec = (value: unknown) => value && typeof value === "object" ? value as Row : {};
const clean = (value: unknown) => String(value || "").replace(/\s+/g, " ").trim();

async function runtime() {
  const { env } = await import("cloudflare:workers");
  const value = env as unknown as Env;
  if (!value.DB) throw new Error("Stage 09 database is unavailable");
  await value.DB.batch(schema.map((statement) => value.DB!.prepare(statement)));
  await value.DB.prepare("INSERT INTO v7_stage_states (id,program_id,stage_key,sequence,stage_name,status,threshold,blocker,evidence_summary) VALUES (?,?,?,9,?,'BLOCKED_UPSTREAM',92,'Stage 08 must freeze first','No verified Stage 08 artifact') ON CONFLICT(id) DO NOTHING").bind(STAGE_ID, PROGRAM_ID, "09", "Fresh material production").run();
  return value;
}

async function sha(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return [...bytes].map((item) => item.toString(16).padStart(2, "0")).join("");
}

function routeFor(sourceMode: string) {
  if (sourceMode === "SOURCE_PROVIDER") return "SOURCE";
  if (sourceMode === "HYBRID") return "HYBRID";
  return "MAKE";
}

function laneFor(route: string, family: string) {
  const factual = /map|chart|timeline|receipt|system|diagram|waterfall|counter/i.test(family);
  if (route === "MAKE" && factual) return { lane: "DETERMINISTIC_CODE_NATIVE", reasoning: "none", expected: 0, safety: 0, retry: 0, escalation: "CRITICAL_ADJUDICATION" };
  if (route === "SOURCE") return { lane: "SINGLE_CANDIDATE_VISION", reasoning: "medium", expected: 4000, safety: 8000, retry: 1, escalation: "MULTI_CANDIDATE_COMPARE" };
  return { lane: "MULTI_CANDIDATE_COMPARE", reasoning: "medium", expected: 8000, safety: 16000, retry: 1, escalation: "CRITICAL_ADJUDICATION" };
}

function queryFor(shot: Row) {
  const clause = clean(shot.narrationClause).slice(0, 90);
  const job = clean(shot.visualJob).slice(0, 110);
  return [
    `${job}; documentary wide shot; no logos, text, screens or cash`,
    `${clause}; literal physical action; authentic US context; clean 16:9 composition`,
    `${job}; close detail and human-scale context; no staged corporate handshake`,
  ];
}

function compileBrief(shot: Row, index: number) {
  const sourceMode = clean(shot.sourceMode) || "MAKE_ORIGINAL";
  const route = routeFor(sourceMode);
  const family = clean(shot.primaryFamily) || "Authored explanatory motion";
  const lane = laneFor(route, family);
  const visualJob = clean(shot.visualJob);
  return {
    briefId: `MP-${String(index + 1).padStart(3, "0")}`,
    shotId: clean(shot.slotId),
    sectionId: clean(shot.sectionId),
    startSeconds: Number(shot.startSeconds),
    endSeconds: Number(shot.endSeconds),
    narrationClause: clean(shot.narrationClause),
    viewerMustUnderstand: visualJob,
    route,
    primaryFamily: family,
    secondaryFamily: clean(shot.secondaryFamily),
    requiredEvidence: [clean(shot.entryState), clean(shot.motionEvent), clean(shot.exitState), clean(shot.factualAcceptance)].filter(Boolean),
    prohibitedEvidence: ["audience-facing URLs, filenames or provider labels", "generic payment imagery without clause-level proof", "cash imagery used to represent authorization", "cropped, letterboxed or mobile-illegible output"],
    providerQueries: route === "MAKE" ? [] : queryFor(shot),
    candidatePolicy: { discover: route === "MAKE" ? 0 : 12, shortlist: route === "MAKE" ? 0 : 6, pixelQa: route === "MAKE" ? 0 : 3, finalists: route === "MAKE" ? 1 : 2 },
    renderPolicy: route === "SOURCE" ? "SOURCE_PIXELS" : /map|chart|timeline|receipt|system|diagram|waterfall|counter/i.test(family) ? "CODE_NATIVE_1920X1080" : "AUTHORED_OR_GENERATIVE_1920X1080",
    frameChecks: ["ENTRY", "MIDPOINT", "EXIT", "MOBILE_360P"],
    modelContract: { lane: lane.lane, reasoning: lane.reasoning, expectedOutputTokens: lane.expected, safetyCeilingTokens: lane.safety, retryLimit: lane.retry, retryScope: lane.retry ? "MISSING_FIELDS_ONLY" : "NONE", escalationLane: lane.escalation, incompletePolicy: "BLOCK_GATE" },
    antiRepeat: clean(shot.antiRepeatControl) || "Reject neighboring duplicate asset, composition, family state or camera path",
    acceptance: [clean(shot.mobileAcceptance), clean(shot.factualAcceptance), "Stored bytes, SHA-256, provenance and rights record are mandatory"].filter(Boolean),
  };
}

function selectPilot(briefs: Row[]) {
  const chosen: Row[] = [];
  const families = new Set<string>();
  const routes = new Set<string>();
  for (const brief of briefs) {
    const family = clean(brief.primaryFamily);
    const route = clean(brief.route);
    if (!families.has(family) || !routes.has(route)) {
      chosen.push(brief); families.add(family); routes.add(route);
    }
    if (chosen.length >= 10) break;
  }
  for (const brief of briefs) {
    if (chosen.length >= 10) break;
    if (!chosen.includes(brief)) chosen.push(brief);
  }
  return chosen.map((item) => clean(item.briefId));
}

async function upstream(db: DB) {
  const stage = await db.prepare("SELECT status,artifact_id FROM v7_stage_states WHERE id=?").bind(`${PROGRAM_ID}-STAGE-08`).first<{ status: string; artifact_id: string }>();
  if (stage?.status !== "FROZEN") throw new Error("STAGE_08_NOT_FROZEN");
  const artifact = await db.prepare("SELECT id,content_json,content_hash FROM v7_shot_artifacts WHERE id=? AND lifecycle_state='FROZEN'").bind(stage.artifact_id).first<{ id: string; content_json: string; content_hash: string }>();
  if (!artifact) throw new Error("FROZEN_SHOT_ARTIFACT_NOT_FOUND");
  const content = JSON.parse(artifact.content_json) as Row;
  const shots = arr(content.shots).map(rec);
  if (shots.length < 150) throw new Error(`SHOT_CONTRACT_INCOMPLETE · ${shots.length}/150 minimum`);
  return { artifact, content, shots };
}

function audit(briefs: Row[], pilotIds: string[]) {
  const allowedCeilings: Record<string, number> = { DETERMINISTIC_CODE_NATIVE: 0, FAST_QUERY: 3000, SINGLE_CANDIDATE_VISION: 8000, MULTI_CANDIDATE_COMPARE: 16000, CRITICAL_ADJUDICATION: 32000 };
  const gates = [
    ["COMPLETENESS", briefs.length === 166, `${briefs.length}/166 briefs`],
    ["TIMING", briefs.every((b) => Number(b.endSeconds) > Number(b.startSeconds)), "All timing intervals valid"],
    ["ROUTING", briefs.every((b) => ["SOURCE", "MAKE", "HYBRID"].includes(clean(b.route))), "Every shot has one execution route"],
    ["SEMANTIC", briefs.every((b) => clean(b.viewerMustUnderstand).length >= 24), "Clause-level meaning retained"],
    ["MODEL_GUARD", briefs.every((b) => { const c = rec(b.modelContract); return Number(c.safetyCeilingTokens) <= (allowedCeilings[clean(c.lane)] ?? -1) && Number(c.expectedOutputTokens) <= Number(c.safetyCeilingTokens) && Number(c.retryLimit) <= 1 && clean(c.incompletePolicy) === "BLOCK_GATE"; }), "Adaptive expected budgets, lane safety ceilings and incomplete blockers enforced"],
    ["PILOT", pilotIds.length >= 8 && pilotIds.length <= 12, `${pilotIds.length} diverse pilot shots`],
    ["ZERO_SPEND", true, "0 remote requests · $0.00 actual cost"],
    ["PIXEL_EVIDENCE", briefs.every((b) => arr(b.frameChecks).length === 4), "Entry, midpoint, exit and 360p checks contracted"],
  ].map(([id, passed, evidence]) => ({ id, status: passed ? "PASS" : "FAIL", evidence }));
  const score = Math.round(gates.filter((gate) => gate.status === "PASS").length / gates.length * 100);
  return { gates, score, passed: score >= THRESHOLD && gates.every((gate) => gate.status === "PASS") };
}

async function snapshot() {
  const env = await runtime();
  const db = env.DB!;
  const stage = await db.prepare("SELECT * FROM v7_stage_states WHERE id=?").bind(STAGE_ID).first<Row>();
  const run = await db.prepare("SELECT * FROM v7_material_runs WHERE program_id=? ORDER BY created_at DESC LIMIT 1").bind(PROGRAM_ID).first<Row>();
  const artifact = run ? await db.prepare("SELECT content_json,content_hash,runtime_key,drive_file_id FROM v7_material_artifacts WHERE run_id=?").bind(run.id).first<Row>() : null;
  const authorization = run ? await db.prepare("SELECT * FROM v7_material_authorizations WHERE run_id=? ORDER BY authorized_at DESC LIMIT 1").bind(run.id).first<Row>() : null;
  const requestRows = authorization ? await db.prepare("SELECT * FROM v7_material_requests WHERE authorization_id=? ORDER BY created_at ASC").bind(authorization.id).all<Row>() : { results: [] };
  const content = artifact ? JSON.parse(String(artifact.content_json)) as Row : null;
  let shotCount = 0;
  try { shotCount = (await upstream(db)).shots.length; } catch { shotCount = 0; }
  return {
    stage: { status: clean(stage?.status || "BLOCKED_UPSTREAM"), threshold: Number(stage?.threshold || THRESHOLD), blocker: stage?.blocker || null, evidence: clean(stage?.evidence_summary) },
    upstream: { frozen: shotCount === 166, shotCount },
    providerReadiness: { openai: Boolean(env.OPENAI_API_KEY), pexels: Boolean(env.PEXELS_API_KEY), pixabay: Boolean(env.PIXABAY_API_KEY), shutterstock: Boolean(env.SHUTTERSTOCK_CONSUMER_KEY) },
    policy: { execution: "ZERO_SPEND_DRY_RUN_THEN_AUTHORIZED_TRANCHES", pilotShots: "8–12", waveShots: "20–30", expectedOutputTokens: "500–16000", safetyCeilings: "3000/8000/16000/32000", criticalCalibrationHeadroom: 25000, maxRetry: 1, retryPolicy: "DELTA_ONLY", incompletePolicy: "BLOCK_GATE", factualVisuals: "CODE_NATIVE", evidence: "STORED_PIXELS_AND_CHECKSUM" },
    run: run ? { id: run.id, status: run.status, score: Number(run.score), briefCount: Number(run.brief_count), pilotCount: Number(run.pilot_count), remoteRequests: Number(run.remote_requests), actualCostUsd: Number(run.actual_cost_usd), gates: JSON.parse(String(run.gate_json || "[]")) } : null,
    artifact: content ? { contentHash: artifact?.content_hash, runtimeKey: artifact?.runtime_key, driveFileId: artifact?.drive_file_id, pilotIds: content.pilotIds, routeMix: content.routeMix, modelMix: content.modelMix, sampleBriefs: arr(content.briefs).slice(0, 8) } : null,
    authorization: authorization ? { id: authorization.id, runId: authorization.run_id, scope: authorization.scope, status: authorization.status, shotCount: Number(authorization.shot_count), maxRemoteRequests: Number(authorization.max_remote_requests), maxActualSpendUsd: Number(authorization.max_actual_spend_usd), modelPolicy: JSON.parse(String(authorization.model_policy_json || "{}")), authorizedAt: authorization.authorized_at, revokedAt: authorization.revoked_at } : null,
    requestLedger: { total: requestRows.results?.length || 0, planned: requestRows.results?.filter((row) => row.status === "PLANNED").length || 0, active: requestRows.results?.filter((row) => ["QUEUED", "IN_PROGRESS"].includes(String(row.status))).length || 0, complete: requestRows.results?.filter((row) => row.status === "COMPLETE").length || 0, incomplete: requestRows.results?.filter((row) => row.status === "BLOCKED_INCOMPLETE").length || 0, actualCostUsd: (requestRows.results || []).reduce((sum, row) => sum + Number(row.actual_cost_usd || 0), 0) },
  };
}

async function authorizePilot() {
  const env = await runtime();
  const db = env.DB!;
  const run = await db.prepare("SELECT * FROM v7_material_runs WHERE program_id=? ORDER BY created_at DESC LIMIT 1").bind(PROGRAM_ID).first<Row>();
  if (!run || !["PILOT_READY", "PILOT_AUTHORIZED"].includes(clean(run.status))) throw new Error("PILOT_CONTRACT_NOT_READY");
  const existing = await db.prepare("SELECT id,status FROM v7_material_authorizations WHERE run_id=? ORDER BY authorized_at DESC LIMIT 1").bind(run.id).first<Row>();
  if (existing?.status === "AUTHORIZED") return snapshot();
  const pilots = await db.prepare("SELECT id FROM v7_material_briefs WHERE run_id=? AND pilot=1 ORDER BY start_seconds ASC").bind(run.id).all<Row>();
  const shotCount = pilots.results?.length || 0;
  if (shotCount < 8 || shotCount > 12) throw new Error(`PILOT_SCOPE_INVALID · ${shotCount}/8–12`);
  const now = new Date().toISOString();
  const id = `${run.id}-PILOT-AUTH-${Date.now()}`;
  const modelPolicy = { version: "ADAPTIVE_ENVELOPE_V2", qualityMode: "MAXIMUM_QUALITY", dispatch: "NOT_STARTED", lanes: { fastQuery: { expected: 1500, safety: 3000 }, singleVision: { expected: 4000, safety: 8000 }, comparison: { expected: 8000, safety: 16000 }, critical: { expected: 16000, calibrationHeadroom: 25000, safety: 32000 } }, incomplete: "BLOCK_GATE", semanticRetry: "ONE_DELTA_ONLY", transportRetry: "ONE_IDEMPOTENT_ONLY", fullUnitRecovery: "ROOT_CAUSE_AUTHORIZATION_REQUIRED" };
  await db.batch([
    db.prepare("INSERT INTO v7_material_authorizations (id,program_id,run_id,scope,status,shot_count,max_remote_requests,max_actual_spend_usd,model_policy_json,authorized_at,updated_at) VALUES (?,?,?,'PILOT','AUTHORIZED',?,80,50,?,?,?)").bind(id, PROGRAM_ID, run.id, shotCount, JSON.stringify(modelPolicy), now, now),
    db.prepare("UPDATE v7_material_runs SET status='PILOT_AUTHORIZED' WHERE id=?").bind(run.id),
    db.prepare("UPDATE v7_stage_states SET status='PILOT_AUTHORIZED',blocker='PILOT_DISPATCH_NOT_STARTED',evidence_summary=?,updated_at=? WHERE id=?").bind(`${shotCount} pilot shots authorized · 0 remote requests · $0 actual cost`, now, STAGE_ID),
  ]);
  return snapshot();
}

async function revokePilot() {
  const env = await runtime();
  const db = env.DB!;
  const authorization = await db.prepare("SELECT * FROM v7_material_authorizations WHERE program_id=? AND status='AUTHORIZED' ORDER BY authorized_at DESC LIMIT 1").bind(PROGRAM_ID).first<Row>();
  if (!authorization) return snapshot();
  const active = await db.prepare("SELECT id FROM v7_material_requests WHERE authorization_id=? AND status IN ('QUEUED','IN_PROGRESS') LIMIT 1").bind(authorization.id).first<Row>();
  if (active) throw new Error("ACTIVE_REMOTE_REQUESTS_MUST_STOP_FIRST");
  const now = new Date().toISOString();
  await db.batch([
    db.prepare("UPDATE v7_material_authorizations SET status='REVOKED',revoked_at=?,updated_at=? WHERE id=?").bind(now, now, authorization.id),
    db.prepare("UPDATE v7_material_runs SET status='PILOT_READY' WHERE id=?").bind(authorization.run_id),
    db.prepare("UPDATE v7_stage_states SET status='PILOT_READY',blocker=NULL,evidence_summary='Pilot authorization revoked · no active remote requests',updated_at=? WHERE id=?").bind(now, STAGE_ID),
  ]);
  return snapshot();
}

async function buildDryRun() {
  const env = await runtime();
  const db = env.DB!;
  const up = await upstream(db);
  const briefs = up.shots.map((shot, index) => compileBrief(shot, index));
  const pilotIds = selectPilot(briefs);
  const normalized = briefs.map((brief) => ({ ...brief, pilot: pilotIds.includes(brief.briefId) }));
  const qa = audit(normalized, pilotIds);
  const now = new Date().toISOString();
  const runId = `${PROGRAM_ID}-09-DRY-${Date.now()}`;
  const artifactId = `${runId}-ARTIFACT`;
  const routeMix = Object.fromEntries(["SOURCE", "MAKE", "HYBRID"].map((route) => [route, normalized.filter((brief) => brief.route === route).length]));
  const modelMix = Object.fromEntries([...new Set(normalized.map((brief) => brief.modelContract.lane))].map((lane) => [lane, normalized.filter((brief) => brief.modelContract.lane === lane).length]));
  const artifact = { title: "Stage 09 zero-spend material-production dry run", upstreamArtifactId: up.artifact.id, upstreamHash: up.artifact.content_hash, generatedAt: now, briefs: normalized, pilotIds, routeMix, modelMix, executionAuthorization: "PILOT_NOT_YET_AUTHORIZED", remoteRequests: 0, actualCostUsd: 0 };
  const envelope = JSON.stringify({ pipelineVersion: 7, stage: "09", artifact }, null, 2);
  const contentHash = await sha(envelope);
  const runtimeKey = `v7/material-production/${artifactId}.json`;
  if (!env.BUCKET) throw new Error("R2_STORE_FAILED · Runtime storage unavailable");
  await env.BUCKET.put(runtimeKey, envelope, { httpMetadata: { contentType: "application/json" }, customMetadata: { stage: "09", contentHash } });
  if (!(await env.BUCKET.head(runtimeKey))) throw new Error("R2_STORE_FAILED · Read-back failed");
  const drive = await storeDriveJsonArtifact({ folderPath: ["Channels", "Hidden Systems", "Projects", "V7 Greenfield Pilot", "Material Production"], fileName: `stage-09-dry-run-${runId.slice(-13)}.json`, content: envelope, artifactId, contentHash });
  const statements: Statement[] = [
    db.prepare("INSERT INTO v7_material_runs (id,program_id,status,mode,brief_count,pilot_count,score,remote_requests,actual_cost_usd,gate_json,created_at,completed_at) VALUES (?,?,?,'ZERO_SPEND_DRY_RUN',?,?,?,0,0,?,?,?)").bind(runId, PROGRAM_ID, qa.passed ? "PILOT_READY" : "REPAIR_REQUIRED", normalized.length, pilotIds.length, qa.score, JSON.stringify(qa.gates), now, now),
    db.prepare("INSERT INTO v7_material_artifacts (id,program_id,run_id,lifecycle_state,content_json,content_hash,runtime_key,drive_file_id,created_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(artifactId, PROGRAM_ID, runId, qa.passed ? "DRY_RUN_FROZEN" : "REPAIR_REQUIRED", JSON.stringify(artifact), contentHash, runtimeKey, drive.id, now),
    db.prepare("UPDATE v7_stage_states SET status=?,artifact_id=?,blocker=?,evidence_summary=?,updated_at=? WHERE id=?").bind(qa.passed ? "PILOT_READY" : "REPAIR_REQUIRED", artifactId, qa.passed ? null : "DRY_RUN_GATE_FAILED", `${qa.score}/100 · ${normalized.length} briefs · ${pilotIds.length} pilot shots · zero remote requests · $0`, now, STAGE_ID),
  ];
  for (const brief of normalized) {
    const json = JSON.stringify(brief);
    statements.push(db.prepare("INSERT INTO v7_material_briefs (id,program_id,run_id,shot_id,section_id,start_seconds,end_seconds,route,visual_family,model_lane,output_ceiling,retry_limit,pilot,content_json,content_hash,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'PLANNED',?)").bind(`${runId}-${brief.briefId}`, PROGRAM_ID, runId, brief.shotId, brief.sectionId, brief.startSeconds, brief.endSeconds, brief.route, brief.primaryFamily, brief.modelContract.lane, brief.modelContract.safetyCeilingTokens, brief.modelContract.retryLimit, brief.pilot ? 1 : 0, json, await sha(json), now));
  }
  for (let index = 0; index < statements.length; index += 40) await db.batch(statements.slice(index, index + 40));
  return snapshot();
}

export async function GET() {
  try { return Response.json(await snapshot()); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Stage 09 could not load" }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: string };
    if (body.action === "BUILD_DRY_RUN") return Response.json(await buildDryRun(), { status: 201 });
    if (body.action === "AUTHORIZE_PILOT") return Response.json(await authorizePilot(), { status: 201 });
    if (body.action === "REVOKE_PILOT") return Response.json(await revokePilot());
    return Response.json({ error: "Unsupported Stage 09 action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stage 09 failed";
    return Response.json({ error: message }, { status: message.includes("NOT_FROZEN") || message.includes("INCOMPLETE") ? 409 : 500 });
  }
}
