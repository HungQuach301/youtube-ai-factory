import { getChatGPTUser } from "@/app/chatgpt-auth";
import { ProductionIntegrityError, heartbeatProductionLease, readFencingHeaders, reconcileExpiredProductionLease, type ProductionIntegrityDB } from "@/lib/production-integrity-runtime";

export const dynamic = "force-dynamic";
const NO_STORE = { "cache-control": "no-store" };
const CHANNEL_ID = "channel-hidden-systems", CONTRACT = "V7_V23_4_V281";
type Row = Record<string, unknown>;
type Statement = { bind(...values: unknown[]): Statement; all<T = Row>(): Promise<{ results?: T[] }>; first<T = Row>(): Promise<T | null>; run(): Promise<{ meta?: { changes?: number } }> };
type DB = ProductionIntegrityDB & { prepare(query: string): Statement };
type Env = { DB?: DB; FACTORY_EXPERT_EMAILS?: string; FACTORY_AUTOMATION_ACTOR_EMAIL?: string; FACTORY_AUTOMATION_ACTOR_NAME?: string; SEQUENTIAL_EXECUTOR_TOKEN?: string };
const clean = (value: unknown) => String(value ?? "").trim();
async function runtime() { const { env } = await import("cloudflare:workers"); return env as unknown as Env; }
async function first(db: DB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values).first<Row>(); }
async function rows(db: DB, query: string, ...values: unknown[]) { return (await db.prepare(query).bind(...values).all<Row>()).results ?? []; }
async function secretMatches(left: string, right: string) { if (!left || !right) return false; const encode = (value: string) => new TextEncoder().encode(value), [a, b] = await Promise.all([crypto.subtle.digest("SHA-256", encode(left)), crypto.subtle.digest("SHA-256", encode(right))]); const av = new Uint8Array(a), bv = new Uint8Array(b); let difference = av.length ^ bv.length; for (let index = 0; index < Math.min(av.length, bv.length); index += 1) difference |= av[index] ^ bv[index]; return difference === 0; }

async function authorized(request: Request) {
  const env = await runtime(); if (!env.DB) throw new ProductionIntegrityError("CANONICAL_DATABASE_UNAVAILABLE", 503, "Production integrity requires canonical D1");
  let user = await getChatGPTUser();
  if (!user && await secretMatches(request.headers.get("x-sequential-executor-token") || "", env.SEQUENTIAL_EXECUTOR_TOKEN || "")) { const email = clean(env.FACTORY_AUTOMATION_ACTOR_EMAIL); if (email) user = { email, displayName: clean(env.FACTORY_AUTOMATION_ACTOR_NAME) || email, fullName: null }; }
  if (!user) throw new ProductionIntegrityError("SIWC_AUTHENTICATION_REQUIRED", 401, "Owner or scoped automation authentication is required");
  const allowlist = new Set(clean(env.FACTORY_EXPERT_EMAILS).split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
  if (!allowlist.has(user.email.toLowerCase())) throw new ProductionIntegrityError("CHANNEL_OWNER_AUTHORIZATION_REQUIRED", 403, "This identity cannot operate production integrity controls");
  return { env, actor: user.email.toLowerCase() };
}

async function context(db: DB, stageKey?: string) {
  const program = await first(db, "SELECT * FROM v7_sequential_programs WHERE channel_id=? AND contract_version=? AND lifecycle_state='ACTIVE' LIMIT 1", CHANNEL_ID, CONTRACT), queue = program ? await first(db, "SELECT * FROM v7_sequential_queue WHERE program_id=? AND sequence=1 AND active=1 LIMIT 1", program.id) : null;
  if (!program || !queue) throw new ProductionIntegrityError("VIDEO_01_NOT_ACTIVE", 409, "Video #1 must own the sequential queue");
  const stage = stageKey ? await first(db, "SELECT * FROM v7_sequential_stage_runs WHERE queue_id=? AND stage_key=? LIMIT 1", queue.id, stageKey) : null;
  if (stageKey && !stage) throw new ProductionIntegrityError("STAGE_RUN_NOT_FOUND", 404, `Stage ${stageKey} is not registered`);
  return { program, queue, stage };
}

export async function GET(request: Request) {
  try {
    const { env } = await authorized(request);
    const ctx = await context(env.DB), [leases, reservations, traces, incidents, safety] = await Promise.all([
      rows(env.DB, "SELECT id,stage_key,lifecycle_state,fencing_token,heartbeat_at,expires_at,orphaned_at FROM v7_sequential_leases WHERE program_id=? ORDER BY fencing_token DESC LIMIT 20", ctx.program.id),
      rows(env.DB, "SELECT id,stage_key,operation,providers_json,lifecycle_state,reserved_provider_requests,reserved_spend_usd,actual_provider_requests,actual_spend_usd,fencing_token,created_at,settled_at FROM v7_integrity_cost_reservations WHERE queue_id=? ORDER BY created_at DESC LIMIT 30", ctx.queue.id),
      rows(env.DB, "SELECT id,stage_key,operation,decision,reason_json,safety_state,rights_state,created_at,completed_at FROM v7_integrity_dispatch_traces WHERE queue_id=? ORDER BY created_at DESC LIMIT 30", ctx.queue.id),
      rows(env.DB, "SELECT id,stage_key,incident_type,severity,lifecycle_state,failure_class,owner,created_at,resolved_at FROM v7_integrity_incidents WHERE program_id=? ORDER BY created_at DESC LIMIT 30", ctx.program.id),
      first(env.DB, "SELECT standard_id,lifecycle_state,evidence_hash,created_at FROM v7_video_quality_evidence WHERE queue_id=? AND standard_version='VIDEO_PRODUCTION_QUALITY_STANDARD_V2' AND standard_id='VQ-M0-SAFETY-SCOPE' ORDER BY evaluation_number DESC LIMIT 1", ctx.queue.id),
    ]);
    return Response.json({ integrityVersion: "FP3_1_PRODUCTION_INTEGRITY_V1", providerRequestsCreated: 0, spendUsd: 0, leases, reservations, traces, incidents, safetyScope: safety || { standard_id: "VQ-M0-SAFETY-SCOPE", lifecycle_state: "NOT_EVALUATED", evidence_hash: null } }, { headers: NO_STORE });
  } catch (error) { const status = error instanceof ProductionIntegrityError ? error.status : 503; return Response.json({ error: { code: error instanceof ProductionIntegrityError ? error.code : "INTEGRITY_PROJECTION_UNAVAILABLE", message: error instanceof Error ? error.message : "Integrity projection unavailable" } }, { status, headers: NO_STORE }); }
}

export async function POST(request: Request) {
  try {
    const { env, actor } = await authorized(request), body = await request.json().catch(() => null) as Row | null, action = clean(body?.action).toUpperCase(), stageKey = clean(body?.stageKey).toUpperCase();
    if (!stageKey) throw new ProductionIntegrityError("STAGE_KEY_REQUIRED", 400, "stageKey is required");
    const ctx = await context(env.DB!, stageKey);
    if (action === "HEARTBEAT_LEASE") return Response.json(await heartbeatProductionLease(env.DB!, { programId: clean(ctx.program.id), queueId: clean(ctx.queue.id), stageKey, ...readFencingHeaders(request), actor }), { status: 200, headers: NO_STORE });
    if (action === "RECONCILE_ORPHAN") return Response.json(await reconcileExpiredProductionLease(env.DB!, { programId: clean(ctx.program.id), queueId: clean(ctx.queue.id), stageKey, actor }), { status: 200, headers: NO_STORE });
    throw new ProductionIntegrityError("INTEGRITY_ACTION_INVALID", 400, "Use HEARTBEAT_LEASE or RECONCILE_ORPHAN");
  } catch (error) {
    if (error instanceof ProductionIntegrityError) return Response.json({ error: { code: error.code, message: error.message, reasons: error.reasons }, providerRequests: 0, spendUsd: 0 }, { status: error.status, headers: NO_STORE });
    return Response.json({ error: { code: "INTEGRITY_COMMAND_FAILED", message: error instanceof Error ? error.message : "Integrity command failed" } }, { status: 503, headers: NO_STORE });
  }
}
