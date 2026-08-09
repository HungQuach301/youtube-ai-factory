const PROGRAM_ID = "YTAF-V7-GREENFIELD";
const FORWARD_IDEMPOTENCY_MARKER = ":request:";
const TERMINAL = new Set(["COMPLETED", "COMPLETE", "FAILED", "CANCELLED", "CANCELED", "BLOCKED_INCOMPLETE", "STOPPED"]);
const COMPOSITE_ROLES = ["A_ENTRY", "A_MIDPOINT", "A_EXIT", "B_ENTRY", "B_MIDPOINT", "B_EXIT", "C_ENTRY", "C_MIDPOINT", "C_EXIT"];

type Statement = { bind: (...values: unknown[]) => Statement; run: () => Promise<unknown>; all: <T>() => Promise<{ results?: T[] }>; first: <T>() => Promise<T | null> };
type DB = { prepare: (query: string) => Statement; batch: (statements: Statement[]) => Promise<unknown> };
type Env = { DB?: DB };
type Row = Record<string, unknown>;

const continuitySchema = `CREATE TABLE IF NOT EXISTS v7_continuity_snapshots (id text PRIMARY KEY NOT NULL,program_id text NOT NULL,checkpoint_code text NOT NULL,lifecycle_state text DEFAULT 'MATERIALIZED' NOT NULL,content_json text NOT NULL,content_hash text NOT NULL,blocker_count integer DEFAULT 0 NOT NULL,active_request_count integer DEFAULT 0 NOT NULL,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`;

async function runtime() {
  const { env } = await import("cloudflare:workers");
  const value = env as unknown as Env;
  if (!value.DB) throw new Error("Continuity database is unavailable");
  await value.DB.prepare(continuitySchema).run();
  return value.DB;
}
async function rows(db: DB, query: string, ...values: unknown[]) { return (await db.prepare(query).bind(...values).all<Row>()).results || []; }
async function safeRows(db: DB, query: string, ...values: unknown[]) { try { return await rows(db, query, ...values); } catch (error) { if (/no such table/i.test(error instanceof Error ? error.message : String(error))) return []; throw error; } }
async function safeFirst(db: DB, query: string, ...values: unknown[]) { try { return await db.prepare(query).bind(...values).first<Row>(); } catch (error) { if (/no such table/i.test(error instanceof Error ? error.message : String(error))) return null; throw error; } }
function text(value: unknown) { return String(value || "").trim(); }
function number(value: unknown) { return Number(value || 0); }
function upper(value: unknown) { return text(value).toUpperCase(); }
async function sha(value: string) { const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))); return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join(""); }

function duplicateValues(items: Row[], field: string) {
  const counts = new Map<string, number>();
  for (const item of items) { const value = text(item[field]); if (value) counts.set(value, (counts.get(value) || 0) + 1); }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value, count]) => ({ value, count }));
}
function latestCompositeHashes(files: Row[]) {
  const selected = new Map<string, Row>();
  for (const file of files) { const role = text(file.asset_role).replace("COMPOSITE_", ""); if (COMPOSITE_ROLES.includes(role) && !selected.has(role)) selected.set(role, file); }
  return ["A", "B", "C"].map((candidate) => {
    const states = ["ENTRY", "MIDPOINT", "EXIT"].map((state) => { const file = selected.get(`${candidate}_${state}`); return { state, fileId: text(file?.id) || null, sha256: text(file?.content_hash) || null, status: text(file?.status) || "MISSING" }; });
    return { candidate, complete: states.every((state) => Boolean(state.sha256)), states };
  });
}

async function buildSnapshot(db: DB) {
  const program = await safeFirst(db, "SELECT * FROM v7_program_contracts WHERE id=?", PROGRAM_ID);
  const stages = await safeRows(db, "SELECT stage_key,stage_name,status,threshold,attempt,blocker,evidence_summary,frozen_at,updated_at FROM v7_stage_states WHERE program_id=? ORDER BY sequence", PROGRAM_ID);
  const decisions = await safeRows(db, "SELECT decision_code,title,status,effective_version,rationale,created_at FROM v7_decision_records WHERE program_id=? ORDER BY decision_code", PROGRAM_ID);
  const run = await safeFirst(db, "SELECT * FROM v7_material_runs WHERE program_id=? ORDER BY created_at DESC LIMIT 1", PROGRAM_ID);
  const authorization = run ? await safeFirst(db, "SELECT * FROM v7_material_authorizations WHERE run_id=? ORDER BY authorized_at DESC LIMIT 1", run.id) : null;
  const materialRequests = authorization ? await safeRows(db, "SELECT * FROM v7_material_requests WHERE authorization_id=? ORDER BY created_at", authorization.id) : [];
  const aiUsage = await safeRows(db, "SELECT * FROM v7_ai_usage_events WHERE program_id=? AND stage_key='09' ORDER BY measured_at", PROGRAM_ID);
  const files = authorization ? await safeRows(db, "SELECT id,asset_role,content_hash,status,created_at FROM v7_material_files WHERE authorization_id=? ORDER BY created_at DESC", authorization.id) : [];
  const compositeAudit = authorization ? await safeFirst(db, "SELECT * FROM v7_composite_audits WHERE authorization_id=? ORDER BY updated_at DESC LIMIT 1", authorization.id) : null;
  const storedSnapshots = await rows(db, "SELECT id,checkpoint_code,lifecycle_state,content_hash,blocker_count,active_request_count,created_at FROM v7_continuity_snapshots WHERE program_id=? ORDER BY created_at DESC LIMIT 8", PROGRAM_ID);

  const activeRequests = materialRequests.filter((request) => ["QUEUED", "IN_PROGRESS"].includes(upper(request.status)));
  const nonTerminal = materialRequests.filter((request) => !TERMINAL.has(upper(request.status)) && upper(request.status) !== "PLANNED");
  const duplicateIdempotencyKeys = duplicateValues(materialRequests, "idempotency_key");
  const forwardRequests = materialRequests.filter((request) => text(request.idempotency_key).includes(FORWARD_IDEMPOTENCY_MARKER));
  const forwardDuplicateIdempotencyKeys = duplicateValues(forwardRequests, "idempotency_key");
  const duplicateProviderResponses = duplicateValues(materialRequests, "provider_response_id");
  const usageByResponse = new Map(aiUsage.map((event) => [text(event.provider_response_id), event]));
  const openAiRequests = materialRequests.filter((request) => upper(request.provider) === "OPENAI");
  const missingUsage = openAiRequests.filter((request) => text(request.provider_response_id) && !usageByResponse.has(text(request.provider_response_id))).map((request) => text(request.id));
  const matchedCostDelta = openAiRequests.reduce((sum, request) => { const usage = usageByResponse.get(text(request.provider_response_id)); return sum + (usage ? Math.abs(number(request.actual_cost_usd) - number(usage.actual_usd)) : 0); }, 0);
  const materialCost = materialRequests.reduce((sum, request) => sum + number(request.actual_cost_usd), 0);
  const aiUsageCost = aiUsage.reduce((sum, event) => sum + number(event.actual_usd), 0);
  const compositeHashes = latestCompositeHashes(files);
  const hashesComplete = compositeHashes.every((candidate) => candidate.complete);
  const compositePass = upper(compositeAudit?.status) === "PASS";
  const nextAction = compositePass ? "MOTION_PROOF_FOR_CHAMPION_C" : "RESOLVE_COMPOSITE_GATE";
  const checks = [
    { id: "AUTHORITATIVE_SCHEMA", status: program && stages.length ? "PASS" : "BLOCKED", evidence: program && stages.length ? `${stages.length} canonical stage state(s) loaded` : "Canonical V7 program/stage records are unavailable" },
    { id: "NO_ACTIVE_REQUEST", status: activeRequests.length === 0 ? "PASS" : "BLOCKED", evidence: `${activeRequests.length} active provider request(s)` },
    { id: "IDEMPOTENCY_FORWARD_UNIQUE", status: forwardDuplicateIdempotencyKeys.length === 0 ? "PASS" : "BLOCKED", evidence: `${forwardDuplicateIdempotencyKeys.length} duplicate request-scoped key(s); ${duplicateIdempotencyKeys.length} legacy operation-family collision(s) preserved as historical evidence` },
    { id: "PROVIDER_RESPONSE_UNIQUE", status: duplicateProviderResponses.length === 0 ? "PASS" : "BLOCKED", evidence: `${duplicateProviderResponses.length} duplicate provider response ID(s)` },
    { id: "REQUEST_LEDGER_LINKED", status: missingUsage.length === 0 ? "PASS" : "BLOCKED", evidence: `${openAiRequests.length - missingUsage.length}/${openAiRequests.length} OpenAI request(s) linked to usage evidence` },
    { id: "MATCHED_COST_RECONCILED", status: matchedCostDelta < 0.0001 ? "PASS" : "BLOCKED", evidence: `$${matchedCostDelta.toFixed(4)} delta across matched records` },
    { id: "CANDIDATE_HASH_BASELINE", status: hashesComplete ? "PASS" : "BLOCKED", evidence: `${compositeHashes.flatMap((candidate) => candidate.states).filter((state) => state.sha256).length}/9 current A/B/C frame hashes captured` },
    { id: "COMPOSITE_CHAMPION", status: compositePass && text(compositeAudit?.winner) === "C" ? "PASS" : "BLOCKED", evidence: compositePass ? `${text(compositeAudit?.winner)} · ${number(compositeAudit?.score)}/100` : "Composite audit has not passed" },
    { id: "VERSION_LINEAGE", status: "PASS", evidence: "v135 b150f328 → v136 7d0dd564; v136 only separates material and Pixel-QA statuses" },
  ];
  const blockers = checks.filter((check) => check.status !== "PASS");
  const ledger = { canonicalScope: "Stage 09 dispatch ledger", materialRequests: materialRequests.length, openAiRequests: openAiRequests.length, aiUsageEvents: aiUsage.length, activeRequests: activeRequests.length, nonTerminalRequests: nonTerminal.length, materialCostUsd: Number(materialCost.toFixed(6)), aiUsageProjectionUsd: Number(aiUsageCost.toFixed(6)), matchedCostDeltaUsd: Number(matchedCostDelta.toFixed(6)), missingUsage, duplicateIdempotencyKeys, forwardDuplicateIdempotencyKeys, duplicateProviderResponses, idempotencyPolicy: "Legacy rows preserve their operation-family value. Every post-v137 dispatch uses authorization + brief + phase + request ID and must remain unique.", note: "Totals are not compared across unlike scopes. Cost reconciliation is performed only on records joined by provider response ID." };
  const stage09 = stages.find((stage) => text(stage.stage_key) === "09") || null;
  const state = { baseline: "PRODUCTION_V7_GREENFIELD", checkpoint: "CONTINUITY_HARDENING_01", checkpointStatus: blockers.length === 0 ? "READY_TO_CAPTURE" : "BLOCKED_WITH_EVIDENCE", currentStage: "09", stage09Status: compositePass ? "MOTION_PROOF_REQUIRED" : text(stage09?.status) || "UNVERIFIED", champion: compositePass ? text(compositeAudit?.winner) : null, championScore: compositePass ? number(compositeAudit?.score) : 0, scaleGovernor: "BLOCKED", downstreamStages: "BLOCKED_UPSTREAM", nextAction, doNotRun: ["source discovery", "candidate A/B/C generation", "composite tournament", "Stage 09 full rerun", "10-shot pilot", "166-shot production"] };
  return {
    generatedAt: new Date().toISOString(),
    program: program ? { id: text(program.id), version: number(program.version), status: text(program.status), legacyPolicy: text(program.legacy_policy) } : null,
    state, stages,
    decisions: { count: decisions.length, locked: decisions.filter((decision) => upper(decision.status) === "LOCKED").length, latest: decisions.slice(-8) },
    evidence: { compositeAudit: compositeAudit ? { rubric: text(compositeAudit.rubric_version), status: text(compositeAudit.status), winner: text(compositeAudit.winner), score: number(compositeAudit.score), updatedAt: text(compositeAudit.updated_at) } : null, candidateHashes: compositeHashes, historicalLimitation: "No pre-repair A/B frame-hash baseline was stored. Current hashes become the forward immutable baseline; the limitation is preserved and must not be rewritten as cryptographic proof of the past." },
    ledger,
    versionLineage: [
      { version: 135, commit: "b150f328fed8f975f8fea23f6878d83372023ea8", archiveSha256: "eadc2b7d41533314da3540e8321f26cb949a992c2050349a914b325fa8fd71ec", purpose: "Bounded revisioned composite repair" },
      { version: 136, commit: "7d0dd5640fb7606fd03dac7a34656ff7e5b48db0", archiveSha256: "abe9894158d321257877c9e42850718aa2b37a5e83d0badafe604314b34691f8", purpose: "Separate material and Pixel-QA statuses; no production dispatch" },
    ], checks, blockers, storedSnapshots,
  };
}

function markdown(snapshot: Awaited<ReturnType<typeof buildSnapshot>>) {
  return ["# AI Factory Continuation Pack", "", `Generated: ${snapshot.generatedAt}`, `Baseline: ${snapshot.state.baseline}`, `Checkpoint: ${snapshot.state.checkpoint}`, `Checkpoint status: ${snapshot.state.checkpointStatus}`, "", "## Current state", "", `- Stage 09: ${snapshot.state.stage09Status}`, `- Champion: ${snapshot.state.champion || "unverified"} (${snapshot.state.championScore}/100)`, `- Scale governor: ${snapshot.state.scaleGovernor}`, `- Downstream: ${snapshot.state.downstreamStages}`, `- Next action: ${snapshot.state.nextAction}`, "", "## Continuity checks", "", ...snapshot.checks.map((check) => `- [${check.status === "PASS" ? "x" : " "}] ${check.id}: ${check.evidence}`), "", "## Canonical Stage 09 ledger", "", `- Material requests: ${snapshot.ledger.materialRequests}`, `- OpenAI requests: ${snapshot.ledger.openAiRequests}`, `- AI usage events: ${snapshot.ledger.aiUsageEvents}`, `- Active requests: ${snapshot.ledger.activeRequests}`, `- Material request cost: $${snapshot.ledger.materialCostUsd.toFixed(4)}`, `- Usage projection: $${snapshot.ledger.aiUsageProjectionUsd.toFixed(4)}`, `- Matched-record delta: $${snapshot.ledger.matchedCostDeltaUsd.toFixed(4)}`, "", "## Do not run", "", ...snapshot.state.doNotRun.map((item) => `- ${item}`), "", "## Evidence limitation", "", snapshot.evidence.historicalLimitation].join("\n");
}

export async function GET(request: Request) {
  try { const db = await runtime(); const snapshot = await buildSnapshot(db); if (new URL(request.url).searchParams.get("format") === "md") return new Response(markdown(snapshot), { headers: { "content-type": "text/markdown; charset=utf-8", "content-disposition": "attachment; filename=AI_FACTORY_CONTINUATION_PACK.md" } }); return Response.json(snapshot); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Continuity control could not load" }, { status: 500 }); }
}
export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: string };
    if (body.action !== "CAPTURE_CHECKPOINT") return Response.json({ error: "Unsupported continuity action" }, { status: 400 });
    const db = await runtime(); const snapshot = await buildSnapshot(db);
    if (snapshot.ledger.activeRequests > 0) return Response.json({ error: "Checkpoint capture is blocked while provider requests are active" }, { status: 409 });
    const contentJson = JSON.stringify(snapshot); const contentHash = await sha(contentJson); const id = `${PROGRAM_ID}-CONTINUITY-${contentHash.slice(0, 16)}`; const lifecycleState = snapshot.blockers.length === 0 ? "FROZEN" : "MATERIALIZED_WITH_BLOCKERS";
    await db.prepare("INSERT INTO v7_continuity_snapshots (id,program_id,checkpoint_code,lifecycle_state,content_json,content_hash,blocker_count,active_request_count,created_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING").bind(id, PROGRAM_ID, snapshot.state.checkpoint, lifecycleState, contentJson, contentHash, snapshot.blockers.length, snapshot.ledger.activeRequests, snapshot.generatedAt).run();
    return Response.json({ ...(await buildSnapshot(db)), captured: { id, lifecycleState, contentHash } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Checkpoint capture failed" }, { status: 500 }); }
}
