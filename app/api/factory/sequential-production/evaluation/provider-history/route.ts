import { getChatGPTUser } from "@/app/chatgpt-auth";
import { canonicalHash } from "@/lib/canonical-json";
import { EVALUATION_PROVIDER_HISTORY_RECOVERY_VERSION } from "@/lib/evaluation-foundation";

export const dynamic = "force-dynamic";
const NO_STORE = { "cache-control": "no-store" };
const CHANNEL_ID = "channel-hidden-systems";
const MAXIMUM_HISTORY_ITEMS = 1000;
const MATCH_WINDOW_SECONDS = 900;
type Row = Record<string, unknown>;
type RunResult = { meta?: { changes?: number } };
type Statement = { bind(...values: unknown[]): Statement; all<T = Row>(): Promise<{ results?: T[] }>; first<T = Row>(): Promise<T | null>; run(): Promise<RunResult> };
type DB = { prepare(query: string): Statement; batch(statements: Statement[]): Promise<RunResult[]> };
type Env = { DB?: DB; ELEVENLABS_API_KEY?: string; FACTORY_EXPERT_EMAILS?: string; FACTORY_AUTOMATION_ACTOR_EMAIL?: string; FACTORY_AUTOMATION_ACTOR_NAME?: string; SEQUENTIAL_EXECUTOR_TOKEN?: string };
type HistoryItem = { history_item_id?: string; request_id?: string | null; date_unix?: number; voice_id?: string | null; model_id?: string | null; source?: string | null; content_type?: string | null; output_format?: string | null; text?: string | null; settings?: unknown };

class ProviderHistoryError extends Error { constructor(public code: string, public status: number, message: string) { super(message); } }
const clean = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
async function runtime() { const { env } = await import("cloudflare:workers"); return env as unknown as Env; }
async function first(db: DB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values).first<Row>(); }
async function rows(db: DB, query: string, ...values: unknown[]) { return (await db.prepare(query).bind(...values).all<Row>()).results ?? []; }
async function run(db: DB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values.map((value) => value === undefined ? null : value)).run(); }
async function sha256(value: string) { const bytes = new TextEncoder().encode(value); return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map((part) => part.toString(16).padStart(2, "0")).join(""); }
async function secretMatches(left: string, right: string) { if (!left || !right) return false; const encode = (value: string) => new TextEncoder().encode(value), [a, b] = await Promise.all([crypto.subtle.digest("SHA-256", encode(left)), crypto.subtle.digest("SHA-256", encode(right))]); const av = new Uint8Array(a), bv = new Uint8Array(b); let difference = av.length ^ bv.length; for (let index = 0; index < Math.min(av.length, bv.length); index += 1) difference |= av[index] ^ bv[index]; return difference === 0; }
function parseObject(value: unknown) { try { const parsed = JSON.parse(clean(value)); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}; } catch { return {}; } }
function timestamp(value: unknown) { const parsed = Date.parse(clean(value)); return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : 0; }

async function authorized(request: Request) {
  const env = await runtime(); if (!env.DB) throw new ProviderHistoryError("EVALUATION_RUNTIME_UNAVAILABLE", 503, "Provider-history recovery requires canonical D1");
  let user = await getChatGPTUser();
  if (!user && await secretMatches(request.headers.get("x-sequential-executor-token") || "", env.SEQUENTIAL_EXECUTOR_TOKEN || "")) {
    const email = clean(env.FACTORY_AUTOMATION_ACTOR_EMAIL); if (email) user = { email, displayName: clean(env.FACTORY_AUTOMATION_ACTOR_NAME) || email, fullName: null };
  }
  if (!user) throw new ProviderHistoryError("SIWC_AUTHENTICATION_REQUIRED", 401, "Owner or scoped automation authentication is required");
  const allowlist = new Set(clean(env.FACTORY_EXPERT_EMAILS).split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
  if (!allowlist.has(user.email.toLowerCase())) throw new ProviderHistoryError("CHANNEL_OWNER_AUTHORIZATION_REQUIRED", 403, "This identity cannot recover provider history");
  if (!env.ELEVENLABS_API_KEY) throw new ProviderHistoryError("ELEVENLABS_NOT_CONNECTED", 424, "ElevenLabs history recovery requires the existing server-side API binding");
  return { env: env as Env & { DB: DB; ELEVENLABS_API_KEY: string }, actor: user.email.toLowerCase() };
}

async function snapshot(db: DB) {
  const item = await first(db, `SELECT policy_version,history_items_received,history_items_with_native_request_id,candidates_diagnosed,unique_metadata_matches,no_metadata_matches,ambiguous_metadata_matches,
    subscription_tier,subscription_status,billing_period,current_subscription_only,historical_plan_coverage_verified,rights_pass_authority,dataset_sealing_authority,assurance_qualification_authority,release_authority,provider_requests,spend_usd,created_at
    FROM v7_evaluation_provider_history_snapshots WHERE channel_id=? AND policy_version=? LIMIT 1`, CHANNEL_ID, EVALUATION_PROVIDER_HISTORY_RECOVERY_VERSION);
  return item ? {
    policyVersion: clean(item.policy_version), historyItemsReceived: number(item.history_items_received), historyItemsWithNativeRequestId: number(item.history_items_with_native_request_id), candidatesDiagnosed: number(item.candidates_diagnosed),
    uniqueMetadataMatches: number(item.unique_metadata_matches), noMetadataMatches: number(item.no_metadata_matches), ambiguousMetadataMatches: number(item.ambiguous_metadata_matches), subscriptionTier: clean(item.subscription_tier), subscriptionStatus: clean(item.subscription_status), billingPeriod: clean(item.billing_period),
    currentSubscriptionOnly: Boolean(number(item.current_subscription_only)), historicalPlanCoverageVerified: Boolean(number(item.historical_plan_coverage_verified)), rightsPassAuthority: Boolean(number(item.rights_pass_authority)), datasetSealingAuthority: Boolean(number(item.dataset_sealing_authority)), assuranceQualificationAuthority: Boolean(number(item.assurance_qualification_authority)), releaseAuthority: Boolean(number(item.release_authority)), providerRequests: number(item.provider_requests), spendUsd: number(item.spend_usd), createdAt: clean(item.created_at),
  } : null;
}

async function insertBatches(db: DB, statements: Statement[]) {
  for (let offset = 0; offset < statements.length; offset += 50) await db.batch(statements.slice(offset, offset + 50));
}

export async function discoverProviderHistoryAuthorized(env: Env & { DB: DB; ELEVENLABS_API_KEY: string }, actor: string, idempotencyKey: string) {
  const db = env.DB;
  if (!/^[A-Za-z0-9._:-]{16,200}$/.test(idempotencyKey)) throw new ProviderHistoryError("IDEMPOTENCY_KEY_INVALID", 400, "A stable 16–200 character Idempotency-Key is required");
  const existingSnapshot = await snapshot(db); if (existingSnapshot) return { outcome: "REPLAYED", snapshot: existingSnapshot };
  const existing = await first(db, "SELECT lifecycle_state,error_code FROM v7_evaluation_provider_history_recovery_runs WHERE idempotency_key=? LIMIT 1", idempotencyKey);
  if (existing) throw new ProviderHistoryError("PROVIDER_HISTORY_RECOVERY_ALREADY_ATTEMPTED", 409, `The immutable recovery attempt is ${clean(existing.lifecycle_state)}${clean(existing.error_code) ? ` (${clean(existing.error_code)})` : ""}`);
  const candidates = await rows(db, `SELECT c.id,a.created_at,a.provenance_json
    FROM v7_evaluation_rights_evidence_tasks t JOIN v7_evaluation_candidates c ON c.id=t.candidate_id
    JOIN production_v2_artifacts a ON c.source_table='production_v2_artifacts' AND a.id=c.source_id
    WHERE t.channel_id=? AND t.task_type='PROVIDER_TERMS_AND_PLAN_RECEIPT' ORDER BY a.created_at,c.id`, CHANNEL_ID);
  if (candidates.length !== 46) throw new ProviderHistoryError("PROVIDER_HISTORY_TARGET_SET_CHANGED", 409, `Expected 46 immutable ElevenLabs candidates, found ${candidates.length}`);
  const candidateTimes = candidates.map((candidate) => timestamp(candidate.created_at));
  if (candidateTimes.some((value) => value <= 0)) throw new ProviderHistoryError("PROVIDER_HISTORY_TARGET_TIME_INVALID", 409, "Every target candidate requires a valid generation-adjacent timestamp");
  const dateAfter = Math.min(...candidateTimes) - 86_400, dateBefore = Math.max(...candidateTimes) + 86_400, runId = id("provider-history-run"), completedAt = () => new Date().toISOString();
  await run(db, `INSERT INTO v7_evaluation_provider_history_recovery_runs (id,channel_id,policy_version,idempotency_key,lifecycle_state,date_after_unix,date_before_unix,maximum_history_items,actor)
    VALUES (?,?,?,?,?,?,?,?,?)`, runId, CHANNEL_ID, EVALUATION_PROVIDER_HISTORY_RECOVERY_VERSION, idempotencyKey, "RUNNING", dateAfter, dateBefore, MAXIMUM_HISTORY_ITEMS, actor);
  try {
    const historyUrl = new URL("https://api.elevenlabs.io/v1/history");
    historyUrl.searchParams.set("page_size", String(MAXIMUM_HISTORY_ITEMS)); historyUrl.searchParams.set("date_after_unix", String(dateAfter)); historyUrl.searchParams.set("date_before_unix", String(dateBefore)); historyUrl.searchParams.set("sort_direction", "asc"); historyUrl.searchParams.set("source", "TTS");
    const [historyResponse, subscriptionResponse] = await Promise.all([
      fetch(historyUrl, { headers: { "xi-api-key": env.ELEVENLABS_API_KEY }, signal: AbortSignal.timeout(60_000) }),
      fetch("https://api.elevenlabs.io/v1/user/subscription", { headers: { "xi-api-key": env.ELEVENLABS_API_KEY }, signal: AbortSignal.timeout(30_000) }),
    ]);
    if (!historyResponse.ok) throw new ProviderHistoryError("ELEVENLABS_HISTORY_DISCOVERY_FAILED", 502, `ElevenLabs history discovery failed (${historyResponse.status})`);
    if (!subscriptionResponse.ok) throw new ProviderHistoryError("ELEVENLABS_SUBSCRIPTION_DISCOVERY_FAILED", 502, `ElevenLabs subscription discovery failed (${subscriptionResponse.status})`);
    const historyPayload = await historyResponse.json() as { history?: HistoryItem[]; has_more?: boolean }, subscriptionPayload = await subscriptionResponse.json() as Record<string, unknown>;
    const history = Array.isArray(historyPayload.history) ? historyPayload.history : [];
    if (historyPayload.has_more || history.length > MAXIMUM_HISTORY_ITEMS) throw new ProviderHistoryError("ELEVENLABS_HISTORY_WINDOW_EXCEEDS_BOUND", 409, "The bounded 1,000-item history window is incomplete; no snapshot was sealed");
    const normalized = await Promise.all(history.map(async (item) => {
      const historyItemId = clean(item.history_item_id), generationUnix = number(item.date_unix); if (!historyItemId || generationUnix <= 0) throw new ProviderHistoryError("ELEVENLABS_HISTORY_ITEM_INVALID", 502, "ElevenLabs returned a history item without canonical identity or time");
      const textHash = clean(item.text) ? await sha256(clean(item.text)) : null, settingsHash = item.settings && typeof item.settings === "object" ? await canonicalHash(item.settings) : null;
      const facts = { historyItemId, providerRequestId: clean(item.request_id) || null, generationUnix, voiceId: clean(item.voice_id) || null, modelId: clean(item.model_id) || null, sourceType: clean(item.source), contentType: clean(item.content_type), outputFormat: clean(item.output_format) || null, textHash, settingsHash };
      return { ...facts, evidenceHash: await canonicalHash(facts) };
    }));
    await insertBatches(db, normalized.map((item) => db.prepare(`INSERT INTO v7_evaluation_provider_history_items
      (id,channel_id,recovery_run_id,provider_family,history_item_id,provider_request_id,generation_unix,voice_id,model_id,source_type,content_type,output_format,text_hash,settings_hash,evidence_hash)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id("provider-history-item"), CHANNEL_ID, runId, "ELEVENLABS", item.historyItemId, item.providerRequestId, item.generationUnix, item.voiceId, item.modelId, item.sourceType, item.contentType, item.outputFormat, item.textHash, item.settingsHash, item.evidenceHash)));
    const diagnostics = await Promise.all(candidates.map(async (candidate) => {
      const provenance = parseObject(candidate.provenance_json), candidateTime = timestamp(candidate.created_at), voiceId = clean(provenance.voiceId), modelId = clean(provenance.model), narrationHash = clean(provenance.narration) ? await sha256(clean(provenance.narration)) : "";
      const matches = normalized.filter((item) => Math.abs(item.generationUnix - candidateTime) <= MATCH_WINDOW_SECONDS && (!voiceId || item.voiceId === voiceId) && (!modelId || item.modelId === modelId) && (!narrationHash || item.textHash === narrationHash));
      const withRequestId = matches.filter((item) => Boolean(item.providerRequestId)).length;
      return { candidateId: clean(candidate.id), matches: matches.length, withRequestId, state: matches.length === 0 ? "NO_METADATA_MATCH" : matches.length === 1 && withRequestId === 1 ? "UNIQUE_METADATA_MATCH_REQUIRES_AUDIO_HASH" : "AMBIGUOUS_METADATA_MATCH" };
    }));
    await insertBatches(db, diagnostics.map((item) => db.prepare(`INSERT INTO v7_evaluation_provider_history_candidate_diagnostics
      (id,channel_id,recovery_run_id,candidate_id,policy_version,metadata_match_count,native_request_id_match_count,diagnostic_state)
      VALUES (?,?,?,?,?,?,?,?)`).bind(id("provider-history-diagnostic"), CHANNEL_ID, runId, item.candidateId, EVALUATION_PROVIDER_HISTORY_RECOVERY_VERSION, item.matches, item.withRequestId, item.state)));
    const unique = diagnostics.filter((item) => item.state === "UNIQUE_METADATA_MATCH_REQUIRES_AUDIO_HASH").length, missing = diagnostics.filter((item) => item.state === "NO_METADATA_MATCH").length, ambiguous = diagnostics.length - unique - missing;
    const subscriptionObservedAt = completedAt(), historyResponseHash = await canonicalHash(historyPayload), subscriptionResponseHash = await canonicalHash(subscriptionPayload);
    await run(db, `INSERT INTO v7_evaluation_provider_history_snapshots
      (id,channel_id,recovery_run_id,policy_version,history_items_received,history_items_with_native_request_id,candidates_diagnosed,unique_metadata_matches,no_metadata_matches,ambiguous_metadata_matches,subscription_tier,subscription_status,billing_period,subscription_observed_at,history_response_hash,subscription_response_hash,provider_requests)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,2)`, id("provider-history-snapshot"), CHANNEL_ID, runId, EVALUATION_PROVIDER_HISTORY_RECOVERY_VERSION, normalized.length, normalized.filter((item) => Boolean(item.providerRequestId)).length, diagnostics.length, unique, missing, ambiguous, clean(subscriptionPayload.tier) || "UNKNOWN", clean(subscriptionPayload.status) || "UNKNOWN", clean(subscriptionPayload.billing_period) || null, subscriptionObservedAt, historyResponseHash, subscriptionResponseHash);
    await run(db, "UPDATE v7_evaluation_provider_history_recovery_runs SET lifecycle_state='COMPLETE',history_items_received=?,provider_requests=2,completed_at=? WHERE id=?", normalized.length, subscriptionObservedAt, runId);
    return { outcome: "RECORDED", snapshot: await snapshot(db) };
  } catch (error) {
    await run(db, "UPDATE v7_evaluation_provider_history_recovery_runs SET lifecycle_state='FAILED',provider_requests=2,error_code=?,completed_at=? WHERE id=?", error instanceof ProviderHistoryError ? error.code : "UNEXPECTED_PROVIDER_HISTORY_FAILURE", completedAt(), runId);
    throw error;
  }
}

async function discover(request: Request) {
  const { env, actor } = await authorized(request);
  return discoverProviderHistoryAuthorized(env, actor, clean(request.headers.get("idempotency-key")));
}

export async function GET(request: Request) {
  try { const { env } = await authorized(request); return Response.json({ snapshot: await snapshot(env.DB) }, { headers: NO_STORE }); }
  catch (error) { const known = error instanceof ProviderHistoryError ? error : new ProviderHistoryError("PROVIDER_HISTORY_READ_FAILED", 500, "Provider-history read failed"); return Response.json({ error: { code: known.code, message: known.message } }, { status: known.status, headers: NO_STORE }); }
}

export async function POST(request: Request) {
  try { return Response.json(await discover(request), { status: 201, headers: NO_STORE }); }
  catch (error) { const known = error instanceof ProviderHistoryError ? error : new ProviderHistoryError("PROVIDER_HISTORY_RECOVERY_FAILED", 500, "Provider-history recovery failed"); return Response.json({ error: { code: known.code, message: known.message } }, { status: known.status, headers: NO_STORE }); }
}
