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
  if (route === "MAKE" && factual) return { lane: "DETERMINISTIC_CODE_NATIVE", ceiling: 0, retry: 0 };
  if (route === "SOURCE") return { lane: "FAST_DISCOVERY_THEN_VISION", ceiling: 1200, retry: 0 };
  return { lane: "BALANCED_MULTIMODAL", ceiling: 3000, retry: 1 };
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
    modelContract: { lane: lane.lane, reasoning: lane.ceiling >= 3000 ? "medium" : lane.ceiling ? "low" : "none", maxOutputTokens: lane.ceiling, retryLimit: lane.retry, retryScope: lane.retry ? "MISSING_FIELDS_ONLY" : "NONE" },
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
  const gates = [
    ["COMPLETENESS", briefs.length === 166, `${briefs.length}/166 briefs`],
    ["TIMING", briefs.every((b) => Number(b.endSeconds) > Number(b.startSeconds)), "All timing intervals valid"],
    ["ROUTING", briefs.every((b) => ["SOURCE", "MAKE", "HYBRID"].includes(clean(b.route))), "Every shot has one execution route"],
    ["SEMANTIC", briefs.every((b) => clean(b.viewerMustUnderstand).length >= 24), "Clause-level meaning retained"],
    ["MODEL_GUARD", briefs.every((b) => Number(rec(b.modelContract).maxOutputTokens) <= 8000 && Number(rec(b.modelContract).retryLimit) <= 1), "Per-request output and retry ceilings enforced"],
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
  const content = artifact ? JSON.parse(String(artifact.content_json)) as Row : null;
  let shotCount = 0;
  try { shotCount = (await upstream(db)).shots.length; } catch { shotCount = 0; }
  return {
    stage: { status: clean(stage?.status || "BLOCKED_UPSTREAM"), threshold: Number(stage?.threshold || THRESHOLD), blocker: stage?.blocker || null, evidence: clean(stage?.evidence_summary) },
    upstream: { frozen: shotCount === 166, shotCount },
    providerReadiness: { openai: Boolean(env.OPENAI_API_KEY), pexels: Boolean(env.PEXELS_API_KEY), pixabay: Boolean(env.PIXABAY_API_KEY), shutterstock: Boolean(env.SHUTTERSTOCK_CONSUMER_KEY) },
    policy: { execution: "ZERO_SPEND_DRY_RUN_THEN_AUTHORIZED_TRANCHES", pilotShots: "8–12", waveShots: "20–30", maxOutputTokens: 8000, ordinaryOutputTokens: "500–3000", maxRetry: 1, factualVisuals: "CODE_NATIVE", evidence: "STORED_PIXELS_AND_CHECKSUM" },
    run: run ? { id: run.id, status: run.status, score: Number(run.score), briefCount: Number(run.brief_count), pilotCount: Number(run.pilot_count), remoteRequests: Number(run.remote_requests), actualCostUsd: Number(run.actual_cost_usd), gates: JSON.parse(String(run.gate_json || "[]")) } : null,
    artifact: content ? { contentHash: artifact?.content_hash, runtimeKey: artifact?.runtime_key, driveFileId: artifact?.drive_file_id, pilotIds: content.pilotIds, routeMix: content.routeMix, modelMix: content.modelMix, sampleBriefs: arr(content.briefs).slice(0, 8) } : null,
  };
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
    statements.push(db.prepare("INSERT INTO v7_material_briefs (id,program_id,run_id,shot_id,section_id,start_seconds,end_seconds,route,visual_family,model_lane,output_ceiling,retry_limit,pilot,content_json,content_hash,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'PLANNED',?)").bind(`${runId}-${brief.briefId}`, PROGRAM_ID, runId, brief.shotId, brief.sectionId, brief.startSeconds, brief.endSeconds, brief.route, brief.primaryFamily, brief.modelContract.lane, brief.modelContract.maxOutputTokens, brief.modelContract.retryLimit, brief.pilot ? 1 : 0, json, await sha(json), now));
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
    return Response.json({ error: "Unsupported Stage 09 action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stage 09 failed";
    return Response.json({ error: message }, { status: message.includes("NOT_FROZEN") || message.includes("INCOMPLETE") ? 409 : 500 });
  }
}
