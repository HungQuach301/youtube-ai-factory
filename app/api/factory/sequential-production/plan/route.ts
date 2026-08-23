import { getChatGPTUser } from "@/app/chatgpt-auth";
import { SequentialCommandError, type SequentialCommandDB } from "@/lib/sequential-production-command";

export const dynamic = "force-dynamic";
const NO_STORE = { "cache-control": "no-store" };
const CHANNEL_ID = "channel-hidden-systems";
const CONTRACT = "V7_V23_4_V281";
const PER_VIDEO_HARD_CAP_USD = 40;
type Row = Record<string, unknown>;
type Statement = { bind(...values: unknown[]): Statement; first<T = Row>(): Promise<T | null>; run(): Promise<unknown> };
type DB = SequentialCommandDB & { prepare(query: string): Statement };
type Env = { DB?: DB; FACTORY_EXPERT_EMAILS?: string; FACTORY_AUTOMATION_ACTOR_EMAIL?: string; FACTORY_AUTOMATION_ACTOR_NAME?: string; SEQUENTIAL_EXECUTOR_TOKEN?: string };
const clean = (value: unknown) => String(value ?? "").trim();
const now = () => new Date().toISOString();
const json = (value: unknown) => JSON.stringify(value);
async function digest(value: string) { return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))].map((part) => part.toString(16).padStart(2, "0")).join(""); }
async function runtime() { const { env } = await import("cloudflare:workers"); return env as unknown as Env; }
async function secretMatches(left: string, right: string) { if (!left || !right) return false; const encode = (value: string) => new TextEncoder().encode(value), [a, b] = await Promise.all([crypto.subtle.digest("SHA-256", encode(left)), crypto.subtle.digest("SHA-256", encode(right))]); const av = new Uint8Array(a), bv = new Uint8Array(b); let difference = av.length ^ bv.length; for (let index = 0; index < Math.min(av.length, bv.length); index += 1) difference |= av[index] ^ bv[index]; return difference === 0; }
async function authorized(request: Request) {
  const env = await runtime(); if (!env.DB) throw new SequentialCommandError("SEQUENTIAL_RUNTIME_UNAVAILABLE", 503, "Canonical D1 is required");
  let user = await getChatGPTUser();
  if (!user && await secretMatches(request.headers.get("x-sequential-executor-token") || "", env.SEQUENTIAL_EXECUTOR_TOKEN || "")) { const email = clean(env.FACTORY_AUTOMATION_ACTOR_EMAIL); if (email) user = { email, displayName: clean(env.FACTORY_AUTOMATION_ACTOR_NAME) || email, fullName: null }; }
  if (!user) throw new SequentialCommandError("SIWC_AUTHENTICATION_REQUIRED", 401, "Owner authentication is required");
  const allowlist = new Set(clean(env.FACTORY_EXPERT_EMAILS).split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
  if (!allowlist.has(user.email.toLowerCase())) throw new SequentialCommandError("CHANNEL_OWNER_AUTHORIZATION_REQUIRED", 403, "This identity cannot approve production cost and rights");
  return { env, user };
}

export async function POST(request: Request) {
  try {
    const { env, user } = await authorized(request), body = await request.json().catch(() => null) as Row | null;
    if (!body || clean(body.action) !== "APPROVE_COST_RIGHTS_PLAN") return Response.json({ error: { code: "PLAN_ACTION_INVALID", message: "Use APPROVE_COST_RIGHTS_PLAN" } }, { status: 400, headers: NO_STORE });
    const idempotencyKey = clean(request.headers.get("idempotency-key")); if (idempotencyKey.length < 16 || !/^[A-Za-z0-9._:-]+$/.test(idempotencyKey)) return Response.json({ error: { code: "IDEMPOTENCY_KEY_INVALID", message: "A stable idempotency key is required" } }, { status: 400, headers: NO_STORE });
    const program = await env.DB!.prepare("SELECT * FROM v7_sequential_programs WHERE channel_id=? AND contract_version=? AND lifecycle_state='ACTIVE' LIMIT 1").bind(CHANNEL_ID, CONTRACT).first<Row>();
    const queue = program ? await env.DB!.prepare("SELECT * FROM v7_sequential_queue WHERE program_id=? AND sequence=1 AND active=1 LIMIT 1").bind(program.id).first<Row>() : null;
    if (!program || !queue) throw new SequentialCommandError("VIDEO_01_NOT_ACTIVE", 409, "Video #1 must own the queue");
    const gate = await env.DB!.prepare("SELECT COUNT(*) total FROM v7_sequential_stage_runs WHERE queue_id=? AND stage_key IN ('00','01','02','03','04','05','06','07A','07B') AND lifecycle_state='FROZEN'").bind(queue.id).first<Row>();
    if (Number(gate?.total || 0) !== 9) throw new SequentialCommandError("DESIGN_STAGES_NOT_FROZEN", 409, "Stage 00–07B must all freeze before approving Stage 08–10 spend");
    const requestEvidenceHash = await digest(json({ idempotencyKey, maxSpendUsd: body.maxSpendUsd, maxProviderRequests: body.maxProviderRequests }));
    const existing = await env.DB!.prepare("SELECT * FROM v7_sequential_budget_plans WHERE queue_id=? AND approval_evidence_hash=? LIMIT 1").bind(queue.id, requestEvidenceHash).first<Row>();
    if (existing) return Response.json({ outcome: "IDEMPOTENT_REPLAY", planId: existing.id, version: existing.version, lifecycleState: existing.lifecycle_state, maxSpendUsd: existing.max_spend_usd, maxProviderRequests: existing.max_provider_requests }, { headers: NO_STORE });
    const spend = await env.DB!.prepare("SELECT COALESCE(SUM(cost_usd),0) total FROM v7_sequential_provider_requests WHERE queue_id=? AND lifecycle_state IN ('COMPLETED','FAILED')").bind(queue.id).first<Row>();
    const spentBeforePlan = Number(spend?.total || 0), requested = Number(body.maxSpendUsd), maxRequests = Number(body.maxProviderRequests);
    if (!Number.isFinite(requested) || requested <= 0 || requested > 30 || spentBeforePlan + requested > PER_VIDEO_HARD_CAP_USD) throw new SequentialCommandError("PLAN_BUDGET_EXCEEDS_HARD_CAP", 409, "Stage 08–10 plan must keep total sequential spend within $40 and new spend within $30");
    if (!Number.isInteger(maxRequests) || maxRequests < 3 || maxRequests > 120) throw new SequentialCommandError("PLAN_REQUEST_CAP_INVALID", 400, "Provider request cap must be 3–120");
    const versionRow = await env.DB!.prepare("SELECT COALESCE(MAX(version),0) version FROM v7_sequential_budget_plans WHERE queue_id=?").bind(queue.id).first<Row>(), version = Number(versionRow?.version || 0) + 1;
    const providerPlan = { OPENAI: { stages: ["08", "GOLDEN"], maximumRequests: 5, maximumSpendUsd: 7 }, PEXELS: { stages: ["09", "GOLDEN"], maximumRequests: Math.max(1, maxRequests - 16), maximumSpendUsd: 0 }, PIXABAY: { stages: ["09", "GOLDEN"], fallbackOnly: true, maximumSpendUsd: 0 }, ELEVENLABS: { stages: ["10", "GOLDEN"], maximumRequests: 12, maximumSpendUsd: 8 }, contingencyUsd: Math.max(0, requested - 15), forbidden: ["LEGACY_ASSET_REUSE", "UNLICENSED_DOWNLOAD", "PLACEHOLDER_MUSIC_SFX", "AUTO_PUBLISH"] };
    const rightsPlan = { SOURCE: { providers: ["PEXELS", "PIXABAY"], commercialUse: "VERIFY_PROVIDER_LICENSE_AND_STORE_SOURCE_URL" }, MAKE: { owner: "CHANNEL", commercialUse: "CHANNEL_OWNED_ORIGINAL" }, HYBRID: { requirement: "BOTH_SOURCE_LICENSE_AND_CHANNEL_OWNED_OVERLAY" }, ELEVENLABS: { requirement: "EXPLICIT_PAID_SUBSCRIPTION_TIER_VERIFIED_BEFORE_SYNTHESIS__PAYG_ALONE_INELIGIBLE", voiceIdentity: "ONE_LOCKED_VOICE" }, audit: { storeBytes: true, sha256: true, providerResponseIds: true, licenseUrls: true } };
    const planId = `seq-plan-${crypto.randomUUID()}`, approvalEvidenceHash = requestEvidenceHash;
    await env.DB!.prepare("INSERT INTO v7_sequential_budget_plans (id,program_id,queue_id,version,lifecycle_state,stage_scope_json,max_spend_usd,max_provider_requests,provider_plan_json,rights_plan_json,actual_spend_usd,actual_provider_requests,approved_by,approval_evidence_hash,created_at,updated_at) VALUES (?,?,?,?,'APPROVED',?,?,?,?,?,0,0,?,?,?,?)")
      .bind(planId, program.id, queue.id, version, json(["08", "09", "10", "GOLDEN"]), requested, maxRequests, json(providerPlan), json(rightsPlan), user.email.toLowerCase(), approvalEvidenceHash, now(), now()).run();
    return Response.json({ outcome: "APPROVED", planId, version, stageScope: ["08", "09", "10", "GOLDEN"], maxSpendUsd: requested, maxProviderRequests: maxRequests, spentBeforePlanUsd: spentBeforePlan, totalHardCapUsd: PER_VIDEO_HARD_CAP_USD, providerPlan, rightsPlan, approvedBy: user.email, approvalEvidenceHash }, { status: 201, headers: NO_STORE });
  } catch (error) {
    if (error instanceof SequentialCommandError) return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status, headers: NO_STORE });
    return Response.json({ error: { code: "PLAN_APPROVAL_FAILED", message: error instanceof Error ? error.message : "Plan approval failed" } }, { status: 503, headers: NO_STORE });
  }
}
