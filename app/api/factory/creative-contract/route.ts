import { storeDriveJsonArtifact } from "../../../../lib/google-drive";
import { AI_USAGE_TABLE_SQL, recordOpenAIUsage } from "../../../../lib/ai-usage";
import { getChatGPTUser } from "../../../chatgpt-auth";
import {
  appendWriteCommandAudit,
  hashActorSubject,
  type WriteCommandAuditDatabase,
  type WriteCommandAuditIdentity,
} from "../../../../lib/write-command-audit";

const PROGRAM_ID = "YTAF-V7-GREENFIELD";
const STAGE = "04";
const THRESHOLD = 90;
const MODEL = "gpt-5.6";

type Statement = { bind: (...values: unknown[]) => Statement; run: () => Promise<unknown>; all: <T>() => Promise<{ results?: T[] }>; first: <T>() => Promise<T | null> };
type Database = WriteCommandAuditDatabase & { prepare: (sql: string) => Statement; batch: (statements: Statement[]) => Promise<unknown> };
type Bucket = { put: (key: string, value: string, options?: Record<string, unknown>) => Promise<unknown>; head: (key: string) => Promise<unknown> };
type Runtime = { DB?: Database; BUCKET?: Bucket; OPENAI_API_KEY?: string; OPENAI_QA_MODEL?: string; FACTORY_EXPERT_EMAILS?: string };
type Gate = { id: string; label: string; status: "PASS" | "FAIL"; evidence: string };


type CreativeOwnerAction = "RUN" | "POLL" | "REPAIR_SCORING";
type CreativeOwnerPayload =
  | { action: "RUN" }
  | { action: "POLL" }
  | { action: "REPAIR_SCORING" };
type CreativeOwnerCommand = {
  action: CreativeOwnerAction;
  payload: CreativeOwnerPayload;
  requestHash: string;
};
type CreativeOwnerAuditRow = {
  handler_identity: string;
  request_hash: string;
  phase: "AUTHORIZED" | "SUCCEEDED" | "FAILED";
  domain_receipt_reference: string | null;
};
type CreativeProgramBinding = {
  id: string;
  productionAuthorized: boolean;
  stageKey: typeof STAGE;
  stageStatus: string;
  stageAttempt: number;
};
type CreativeOwnerEntitlement =
  | { action: "RUN"; kind: "PAID_BACKGROUND_CREATIVE_TOURNAMENT"; db: Database; providerApiKey: string }
  | { action: "POLL"; kind: "PROVIDER_STATUS_READ_AND_BOUNDED_FINALIZATION"; db: Database; providerApiKey: string; activeJobId: string }
  | { action: "REPAIR_SCORING"; kind: "DETERMINISTIC_CREATIVE_SCORE_REPAIR"; db: Database; artifactId: string };

const CREATIVE_OWNER_HANDLER_IDENTITY = "app/api/factory/creative-contract/route.ts#POST";
const CREATIVE_OWNER_ACTIONS = new Set<CreativeOwnerAction>(["RUN", "POLL", "REPAIR_SCORING"]);
const CREATIVE_OWNER_FIELDS: Record<CreativeOwnerAction, ReadonlySet<string>> = {
  RUN: new Set(["action"]),
  POLL: new Set(["action"]),
  REPAIR_SCORING: new Set(["action"]),
};
const MAX_CREATIVE_OWNER_BODY_BYTES = 16 * 1024;
const CREATIVE_OWNER_CORRELATION_ID_PATTERN = /^[A-Za-z0-9._:-]{8,200}$/;
const CREATIVE_OWNER_AUDIT_COMPONENT_PATTERN = /[^A-Za-z0-9._:-]/g;

async function creativeAuthorizationEnv() {
  const { env } = await import("cloudflare:workers");
  return env as unknown as Runtime;
}

function creativeOwnerFailure(error: string, status: number) {
  return Response.json({ error }, { status });
}

function creativeOwnerSameOrigin(request: Request) {
  const url = new URL(request.url);
  return request.method === "POST"
    && url.pathname === "/api/factory/creative-contract"
    && url.search === ""
    && request.headers.get("origin") === url.origin
    && request.headers.get("sec-fetch-site") === "same-origin";
}

async function authorizeCreativeOwnerWrite(request: Request) {
  const user = await getChatGPTUser();
  if (!user?.email) return creativeOwnerFailure("SIWC_AUTHENTICATION_REQUIRED", 401);
  if (!creativeOwnerSameOrigin(request)) return creativeOwnerFailure("OWNER_WRITE_SAME_ORIGIN_REQUIRED", 403);

  const env = await creativeAuthorizationEnv();
  const normalizedEmail = user.email.trim().toLowerCase();
  const owners = String(env.FACTORY_EXPERT_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (owners.length === 0) return creativeOwnerFailure("OWNER_WRITE_ALLOWLIST_UNCONFIGURED", 503);
  if (!owners.includes(normalizedEmail)) return creativeOwnerFailure("OWNER_WRITE_AUTHORIZATION_REQUIRED", 403);
  if (!env.DB) return creativeOwnerFailure("CANONICAL_DATABASE_UNAVAILABLE", 503);
  return { db: env.DB, env, normalizedEmail, actorType: "CHATGPT_OWNER" as const };
}

function requireCreativeOwnerAuthority(actorType: string) {
  if (actorType === "AGENT") return creativeOwnerFailure("AGENT_OWNER_COMMAND_FORBIDDEN", 403);
  return actorType === "CHATGPT_OWNER" ? null : creativeOwnerFailure("OWNER_WRITE_AUTHORIZATION_REQUIRED", 403);
}

async function creativeOwnerSha256RawBytes(bytes: ArrayBuffer | Uint8Array) {
  const value = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", value));
  return [...digest].map((item) => item.toString(16).padStart(2, "0")).join("");
}

function creativeOwnerExactKeys(value: Record<string, unknown>, expected: ReadonlySet<string>) {
  const keys = Object.keys(value);
  return keys.length === expected.size && keys.every((key) => expected.has(key));
}

async function readCreativeOwnerCommand(request: Request): Promise<CreativeOwnerCommand | Response> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") return creativeOwnerFailure("JSON_CONTENT_TYPE_REQUIRED", 415);
  const lengthHeader = request.headers.get("content-length");
  const contentLength = lengthHeader === null ? null : Number(lengthHeader);
  if (contentLength !== null && (!Number.isFinite(contentLength) || contentLength < 0)) return creativeOwnerFailure("OWNER_WRITE_CONTENT_LENGTH_INVALID", 400);
  if (contentLength !== null && contentLength > MAX_CREATIVE_OWNER_BODY_BYTES) return creativeOwnerFailure("OWNER_WRITE_BODY_TOO_LARGE", 413);
  const raw = await request.arrayBuffer();
  if (!raw.byteLength || raw.byteLength > MAX_CREATIVE_OWNER_BODY_BYTES) return creativeOwnerFailure("OWNER_WRITE_BODY_TOO_LARGE", 413);

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(raw));
  } catch {
    return creativeOwnerFailure("OWNER_WRITE_JSON_INVALID", 400);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return creativeOwnerFailure("OWNER_WRITE_COMMAND_INVALID", 400);
  const record = parsed as Record<string, unknown>;
  if (typeof record.action !== "string") return creativeOwnerFailure("OWNER_WRITE_COMMAND_INVALID", 400);
  if (!CREATIVE_OWNER_ACTIONS.has(record.action as CreativeOwnerAction)) return creativeOwnerFailure("CREATIVE_OWNER_ACTION_FORBIDDEN", 403);
  const action = record.action as CreativeOwnerAction;
  if (!creativeOwnerExactKeys(record, CREATIVE_OWNER_FIELDS[action])) return creativeOwnerFailure("OWNER_WRITE_COMMAND_INVALID", 400);
  const payload = record as CreativeOwnerPayload;
  return { action, payload, requestHash: await creativeOwnerSha256RawBytes(raw) };
}

async function bindCreativeOwnerResource(db: Database): Promise<CreativeProgramBinding | Response> {
  const program = await db.prepare("SELECT id,production_authorized FROM v7_program_contracts WHERE id = ? LIMIT 1")
    .bind(PROGRAM_ID)
    .first<{ id: string; production_authorized: number }>();
  if (program?.id !== PROGRAM_ID) return creativeOwnerFailure("CREATIVE_PROGRAM_RESOURCE_NOT_FOUND", 404);
  const stage = await db.prepare("SELECT program_id,stage_key,status,attempt FROM v7_stage_states WHERE id = ? AND program_id = ? AND stage_key = ? LIMIT 1")
    .bind(`${PROGRAM_ID}-STAGE-${STAGE}`, PROGRAM_ID, STAGE)
    .first<{ program_id: string; stage_key: string; status: string; attempt: number }>();
  if (!stage || stage.program_id !== PROGRAM_ID || stage.stage_key !== STAGE) return creativeOwnerFailure("CREATIVE_STAGE04_RESOURCE_NOT_FOUND", 404);
  return {
    id: program.id,
    productionAuthorized: Boolean(program.production_authorized),
    stageKey: STAGE,
    stageStatus: stage.status,
    stageAttempt: Number(stage.attempt),
  };
}

async function authorizeCreativeOwnerEntitlement(
  db: Database,
  env: Runtime,
  command: CreativeOwnerCommand,
  binding: CreativeProgramBinding,
): Promise<CreativeOwnerEntitlement | Response> {
  if (command.action === "RUN") {
    if (!binding.productionAuthorized) return creativeOwnerFailure("CREATIVE_RUN_ENTITLEMENT_UNAVAILABLE", 409);
    if (!["READY", "REPAIR_REQUIRED"].includes(binding.stageStatus)) return creativeOwnerFailure("CREATIVE_RUN_ENTITLEMENT_UNAVAILABLE", 409);
    if (!Number.isInteger(binding.stageAttempt) || binding.stageAttempt < 0 || binding.stageAttempt >= 3) return creativeOwnerFailure("CREATIVE_RUN_ENTITLEMENT_UNAVAILABLE", 409);
    if (!env.OPENAI_API_KEY) return creativeOwnerFailure("PROVIDER_DISPATCH_ENTITLEMENT_UNAVAILABLE", 503);
    return { action: command.action, kind: "PAID_BACKGROUND_CREATIVE_TOURNAMENT", db, providerApiKey: env.OPENAI_API_KEY };
  }
  if (command.action === "POLL") {
    if (binding.stageStatus !== "RUNNING") return creativeOwnerFailure("CREATIVE_POLL_ENTITLEMENT_UNAVAILABLE", 409);
    if (!env.OPENAI_API_KEY) return creativeOwnerFailure("PROVIDER_STATUS_ENTITLEMENT_UNAVAILABLE", 503);
    const active = await db.prepare("SELECT id FROM v7_creative_jobs WHERE program_id = ? AND status = 'ACTIVE' ORDER BY started_at DESC LIMIT 1")
      .bind(PROGRAM_ID)
      .first<{ id: string }>();
    if (!active?.id) return creativeOwnerFailure("CREATIVE_POLL_ENTITLEMENT_UNAVAILABLE", 409);
    return { action: command.action, kind: "PROVIDER_STATUS_READ_AND_BOUNDED_FINALIZATION", db, providerApiKey: env.OPENAI_API_KEY, activeJobId: active.id };
  }
  if (!binding.productionAuthorized || binding.stageStatus !== "REPAIR_REQUIRED") return creativeOwnerFailure("CREATIVE_REPAIR_ENTITLEMENT_UNAVAILABLE", 409);
  const artifact = await db.prepare("SELECT id FROM v7_creative_artifacts WHERE program_id = ? AND lifecycle_state = 'REPAIR_REQUIRED' ORDER BY created_at DESC LIMIT 1")
    .bind(PROGRAM_ID)
    .first<{ id: string }>();
  if (!artifact?.id) return creativeOwnerFailure("CREATIVE_REPAIR_ENTITLEMENT_UNAVAILABLE", 409);
  return { action: command.action, kind: "DETERMINISTIC_CREATIVE_SCORE_REPAIR", db, artifactId: artifact.id };
}

function creativeOwnerBoundedAuditComponent(value: string) {
  return value.replace(CREATIVE_OWNER_AUDIT_COMPONENT_PATTERN, "_").slice(0, 200) || "unknown";
}

function creativeOwnerCorrelationId(request: Request) {
  const supplied = request.headers.get("x-correlation-id")?.trim() ?? "";
  return CREATIVE_OWNER_CORRELATION_ID_PATTERN.test(supplied) ? supplied : `creative-owner:${crypto.randomUUID()}`;
}

async function creativeOwnerAuditIdentity(
  request: Request,
  normalizedEmail: string,
  command: CreativeOwnerCommand,
): Promise<WriteCommandAuditIdentity> {
  return {
    handlerIdentity: CREATIVE_OWNER_HANDLER_IDENTITY,
    actorType: "CHATGPT_OWNER",
    actorSubjectHash: await hashActorSubject("CHATGPT_OWNER", normalizedEmail),
    action: command.action,
    resourceScope: `program:${PROGRAM_ID}:creative-contract:stage:${STAGE}`,
    correlationId: creativeOwnerCorrelationId(request),
    requestHash: command.requestHash,
  };
}

async function lookupCreativeOwnerReplay(db: Database, identity: WriteCommandAuditIdentity) {
  const result = await db.prepare(`SELECT handler_identity,request_hash,phase,domain_receipt_reference
    FROM factory_write_command_audit WHERE correlation_id = ? ORDER BY canonical_timestamp,id`)
    .bind(identity.correlationId)
    .all<CreativeOwnerAuditRow>();
  const rows = result.results ?? [];
  if (!rows.length) return null;
  if (rows.some((row) => row.handler_identity !== identity.handlerIdentity || row.request_hash !== identity.requestHash)) {
    return creativeOwnerFailure("OWNER_WRITE_IDEMPOTENCY_CONFLICT", 409);
  }
  const succeeded = rows.find((row) => row.phase === "SUCCEEDED");
  if (succeeded) return Response.json({ ok: true, replay: true, receipt: succeeded.domain_receipt_reference });
  return creativeOwnerFailure("OWNER_WRITE_REPLAY_INCOMPLETE", 409);
}

function creativeOwnerFirstRecord(value: unknown) {
  if (!Array.isArray(value) || !value[0] || typeof value[0] !== "object") return undefined;
  return value[0] as Record<string, unknown>;
}

async function creativeOwnerDomainReceipt(command: CreativeOwnerCommand, response: Response) {
  const payload = await response.clone().json().catch(() => ({})) as Record<string, unknown>;
  const stage = payload.stage && typeof payload.stage === "object" ? payload.stage as Record<string, unknown> : {};
  const run = creativeOwnerFirstRecord(payload.runs);
  const job = creativeOwnerFirstRecord(payload.jobs);
  const artifact = creativeOwnerFirstRecord(payload.artifacts);
  const reference = [
    STAGE,
    String(run?.id ?? "no-run"),
    String(job?.id ?? "no-job"),
    String(job?.providerStatus ?? run?.status ?? stage.status ?? "no-status"),
    String(artifact?.id ?? "no-artifact"),
    String(artifact?.contentHash ?? "no-hash"),
  ].map(creativeOwnerBoundedAuditComponent).join(":");
  return `creative:${creativeOwnerBoundedAuditComponent(PROGRAM_ID)}:${creativeOwnerBoundedAuditComponent(command.action)}:${reference}`;
}

async function runAuditedCreativeOwnerCommand(
  db: Database,
  identity: WriteCommandAuditIdentity,
  command: CreativeOwnerCommand,
  execute: () => Promise<Response>,
) {
  await appendWriteCommandAudit(db, identity, "AUTHORIZED", null);
  let response: Response;
  try {
    response = await execute();
  } catch (error) {
    await appendWriteCommandAudit(db, identity, "FAILED", null);
    throw error;
  }
  if (!response.ok) {
    await appendWriteCommandAudit(db, identity, "FAILED", null);
    return response;
  }
  try {
    await appendWriteCommandAudit(db, identity, "SUCCEEDED", await creativeOwnerDomainReceipt(command, response));
    return response;
  } catch (error) {
    await appendWriteCommandAudit(db, identity, "FAILED", null);
    throw error;
  }
}

async function executeCreativeOwnerCommand(command: CreativeOwnerCommand, entitlement: CreativeOwnerEntitlement) {
  if (command.action !== entitlement.action) return creativeOwnerFailure("CREATIVE_OWNER_ENTITLEMENT_MISMATCH", 403);
  try {
    if (command.action === "RUN") return Response.json(await start(), { status: 202 });
    if (command.action === "POLL") return Response.json(await poll());
    return Response.json(await repairScoringContract());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Creative Contract failed";
    return Response.json({ error: message }, { status: message.includes("not ready") || message.includes("must be frozen") || message.includes("repairable") ? 409 : 500 });
  }
}

const tables = [
  AI_USAGE_TABLE_SQL,
  `CREATE TABLE IF NOT EXISTS v7_creative_runs (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, attempt integer DEFAULT 1 NOT NULL, status text DEFAULT 'RUNNING' NOT NULL, score integer DEFAULT 0 NOT NULL, threshold integer DEFAULT 90 NOT NULL, model_id text NOT NULL, gate_json text DEFAULT '[]' NOT NULL, started_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, completed_at text)`,
  `CREATE TABLE IF NOT EXISTS v7_creative_jobs (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, run_id text NOT NULL, provider_response_id text NOT NULL, provider_status text DEFAULT 'queued' NOT NULL, status text DEFAULT 'ACTIVE' NOT NULL, heartbeat_at text NOT NULL, started_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, finalized_at text, error text)`,
  `CREATE TABLE IF NOT EXISTS v7_creative_artifacts (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, run_id text NOT NULL, lifecycle_state text DEFAULT 'MATERIALIZED' NOT NULL, content_json text NOT NULL, content_hash text NOT NULL, runtime_key text, drive_file_id text, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
] as const;

async function runtime() {
  const { env } = await import("cloudflare:workers");
  const value = env as unknown as Runtime;
  if (!value.DB) throw new Error("Creative Contract database is unavailable");
  await value.DB.batch(tables.map((sql) => value.DB!.prepare(sql)));
  return value;
}

const scoreFields = {
  promise: { type: "integer", minimum: 0, maximum: 100 }, originality: { type: "integer", minimum: 0, maximum: 100 },
  evidenceFit: { type: "integer", minimum: 0, maximum: 100 }, retentionPotential: { type: "integer", minimum: 0, maximum: 100 },
  visualPotential: { type: "integer", minimum: 0, maximum: 100 }, soundPotential: { type: "integer", minimum: 0, maximum: 100 },
};

const creativeSchema = {
  type: "object", additionalProperties: false,
  properties: {
    publicWorkingTitle: { type: "string" }, primaryViewer: { type: "string" }, transformation: { type: "string" }, centralQuestion: { type: "string" },
    candidates: { type: "array", minItems: 4, maxItems: 4, items: { type: "object", additionalProperties: false, properties: {
      id: { type: "string" }, name: { type: "string" }, oneSentencePromise: { type: "string" }, thesis: { type: "string" }, storyEngine: { type: "string" }, emotionalArc: { type: "string" },
      stakes: { type: "string" }, payoff: { type: "string" }, visualEngine: { type: "string" }, soundEngine: { type: "string" }, differentiation: { type: "string" },
      claimIds: { type: "array", minItems: 8, items: { type: "string" } }, scores: { type: "object", additionalProperties: false, properties: scoreFields, required: Object.keys(scoreFields) }, totalScore: { type: "integer", minimum: 0, maximum: 100 },
    }, required: ["id","name","oneSentencePromise","thesis","storyEngine","emotionalArc","stakes","payoff","visualEngine","soundEngine","differentiation","claimIds","scores","totalScore"] } },
    championId: { type: "string" }, championRationale: { type: "string" },
    contract: { type: "object", additionalProperties: false, properties: {
      audiencePromise: { type: "string" }, thesis: { type: "string" }, storyEngine: { type: "string" }, emotionalArc: { type: "string" }, stakes: { type: "string" }, payoff: { type: "string" },
      runtimeTargetSeconds: { type: "integer", minimum: 420, maximum: 600 }, spokenWordRange: { type: "string" }, hookContract: { type: "string" }, midpointContract: { type: "string" }, endingContract: { type: "string" },
      visualEngine: { type: "string" }, visualFamilies: { type: "array", minItems: 6, items: { type: "string" } }, visualProhibitions: { type: "array", minItems: 6, items: { type: "string" } },
      soundEngine: { type: "string" }, soundMotifs: { type: "array", minItems: 5, items: { type: "string" } }, soundProhibitions: { type: "array", minItems: 4, items: { type: "string" } },
      evidenceClaimIds: { type: "array", minItems: 8, items: { type: "string" } }, originalityControls: { type: "array", minItems: 6, items: { type: "string" } }, exclusions: { type: "array", minItems: 6, items: { type: "string" } }, acceptanceTests: { type: "array", minItems: 10, items: { type: "string" } },
    }, required: ["audiencePromise","thesis","storyEngine","emotionalArc","stakes","payoff","runtimeTargetSeconds","spokenWordRange","hookContract","midpointContract","endingContract","visualEngine","visualFamilies","visualProhibitions","soundEngine","soundMotifs","soundProhibitions","evidenceClaimIds","originalityControls","exclusions","acceptanceTests"] },
    critics: { type: "array", minItems: 7, items: { type: "object", additionalProperties: false, properties: { role: { type: "string" }, score: { type: "integer", minimum: 0, maximum: 100 }, verdict: { type: "string" }, strongestRisk: { type: "string" }, requiredControl: { type: "string" } }, required: ["role","score","verdict","strongestRisk","requiredControl"] } },
    adversarialRisks: { type: "array", minItems: 6, items: { type: "object", additionalProperties: false, properties: { risk: { type: "string" }, severity: { type: "string", enum: ["P0","P1","P2"] }, resolution: { type: "string" }, acceptanceTest: { type: "string" }, status: { type: "string", enum: ["RESOLVED","OPEN"] } }, required: ["risk","severity","resolution","acceptanceTest","status"] } },
  }, required: ["publicWorkingTitle","primaryViewer","transformation","centralQuestion","candidates","championId","championRationale","contract","critics","adversarialRisks"],
};

function arr(value: unknown) { return Array.isArray(value) ? value : []; }
function record(value: unknown) { return value && typeof value === "object" ? value as Record<string, unknown> : {}; }
const scoreKeys = Object.keys(scoreFields);
function clampScore(value: unknown) { return Math.max(0, Math.min(100, Math.round(Number(value) || 0))); }
function usesTenPointScale(artifact: Record<string, unknown>) {
  const values = arr(artifact.candidates).flatMap((candidate) => scoreKeys.map((key) => Number(record(record(candidate).scores)[key] || 0)));
  return values.length > 0 && values.every((value) => Number.isFinite(value) && value >= 0 && value <= 10);
}
function normalizeCandidateScores(artifact: Record<string, unknown>) {
  const tenPointScale = usesTenPointScale(artifact);
  return { ...artifact, candidates: arr(artifact.candidates).map((value) => {
    const candidate = record(value); const rawScores = record(candidate.scores);
    const scores = Object.fromEntries(scoreKeys.map((key) => [key, clampScore(Number(rawScores[key] || 0) * (tenPointScale ? 10 : 1))]));
    const totalScore = Math.round(scoreKeys.reduce((sum, key) => sum + Number(scores[key]), 0) / scoreKeys.length);
    return { ...candidate, scores, totalScore };
  }) };
}
function textOutput(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string") return payload.output_text;
  for (const item of arr(payload.output)) for (const block of arr(record(item).content)) if (typeof record(block).text === "string") return String(record(block).text);
  throw new Error("OpenAI returned no structured Creative Contract");
}

async function startProvider(env: Runtime, prompt: string) {
  if (!env.OPENAI_API_KEY) throw new Error("Connect OPENAI_API_KEY before running Stage 04");
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({
    model: env.OPENAI_QA_MODEL || MODEL, reasoning: { effort: "high" }, background: true, store: true,
    input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }], text: { format: { type: "json_schema", name: "v7_creative_contract", strict: true, schema: creativeSchema } },
  }), signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`OpenAI Creative Contract failed (${response.status}) · ${(await response.text()).replace(/\s+/g," ").slice(0,400)}`);
  const payload = await response.json() as Record<string, unknown>;
  if (typeof payload.id !== "string") throw new Error("OpenAI did not return a background response ID");
  return { id: payload.id, status: String(payload.status || "queued") };
}

async function retrieveProvider(env: Runtime, id: string) {
  if (!env.OPENAI_API_KEY) throw new Error("Connect OPENAI_API_KEY before resuming Stage 04");
  const response = await fetch(`https://api.openai.com/v1/responses/${encodeURIComponent(id)}`, { headers: { authorization: `Bearer ${env.OPENAI_API_KEY}` }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`OpenAI Creative status failed (${response.status}) · ${(await response.text()).replace(/\s+/g," ").slice(0,400)}`);
  return response.json() as Promise<Record<string, unknown>>;
}

async function rows(db: Database, sql: string, ...bindings: unknown[]) { return (await db.prepare(sql).bind(...bindings).all<Record<string, unknown>>()).results || []; }
async function digest(content: string) { const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content))); return [...bytes].map((b) => b.toString(16).padStart(2,"0")).join(""); }

function evaluate(artifact: Record<string, unknown>) {
  const candidates = arr(artifact.candidates).map(record); const contract = record(artifact.contract); const critics = arr(artifact.critics).map(record); const risks = arr(artifact.adversarialRisks).map(record);
  const champion = candidates.find((candidate) => candidate.id === artifact.championId); const criticFloor = critics.length ? Math.min(...critics.map((critic) => Number(critic.score || 0))) : 0;
  const candidateFloor = candidates.length ? Math.min(...candidates.map((candidate) => Number(candidate.totalScore || 0))) : 0;
  const winnerScore = candidates.length ? Math.max(...candidates.map((candidate) => Number(candidate.totalScore || 0))) : 0;
  const gates: Gate[] = [
    { id:"TOURNAMENT",label:"Four differentiated creative routes",status:candidates.length===4&&new Set(candidates.map((c)=>String(c.name))).size===4?"PASS":"FAIL",evidence:`${candidates.length}/4 candidates · ${new Set(candidates.map((c)=>String(c.name))).size} unique` },
    { id:"CHAMPION",label:"Champion is tournament winner",status:Boolean(champion)&&Number(champion?.totalScore||0)===winnerScore&&winnerScore>=90?"PASS":"FAIL",evidence:`${String(champion?.name||"missing")} · ${Number(champion?.totalScore||0)}/100 · winner floor ≥90` },
    { id:"AUDIENCE",label:"Audience transformation contract",status:String(artifact.primaryViewer||"").length>=30&&String(artifact.transformation||"").length>=40&&String(contract.audiencePromise||"").length>=35?"PASS":"FAIL",evidence:"Viewer, before/after transformation and promise are explicit" },
    { id:"EVIDENCE",label:"Controlled evidence utilization",status:arr(contract.evidenceClaimIds).length>=8?"PASS":"FAIL",evidence:`${arr(contract.evidenceClaimIds).length}/8 claim IDs bound` },
    { id:"RUNTIME",label:"Exact runtime and narrative milestones",status:Number(contract.runtimeTargetSeconds)>=420&&Number(contract.runtimeTargetSeconds)<=600&&["hookContract","midpointContract","endingContract"].every((k)=>String(contract[k]||"").length>=25)?"PASS":"FAIL",evidence:`${contract.runtimeTargetSeconds||0}s target with hook, midpoint and ending` },
    { id:"VISUAL",label:"Ownable visual system",status:arr(contract.visualFamilies).length>=6&&arr(contract.visualProhibitions).length>=6?"PASS":"FAIL",evidence:`${arr(contract.visualFamilies).length} families · ${arr(contract.visualProhibitions).length} anti-template controls` },
    { id:"SOUND",label:"Narrative sound system",status:arr(contract.soundMotifs).length>=5&&arr(contract.soundProhibitions).length>=4?"PASS":"FAIL",evidence:`${arr(contract.soundMotifs).length} motifs · ${arr(contract.soundProhibitions).length} prohibitions` },
    { id:"ORIGINALITY",label:"Originality firewall",status:arr(contract.originalityControls).length>=6?"PASS":"FAIL",evidence:`${arr(contract.originalityControls).length}/6 controls` },
    { id:"CRITICS",label:"Seven independent critics",status:critics.length>=7&&criticFloor>=90?"PASS":"FAIL",evidence:`${critics.length}/7 critics · ${criticFloor}/90 floor` },
    { id:"ADVERSARIAL",label:"Resolved adversarial review",status:risks.length>=6&&risks.every((risk)=>risk.status==="RESOLVED")?"PASS":"FAIL",evidence:`${risks.filter((risk)=>risk.status==="RESOLVED").length}/${risks.length} resolved` },
    { id:"ACCEPTANCE",label:"Downstream acceptance contract",status:arr(contract.acceptanceTests).length>=10?"PASS":"FAIL",evidence:`${arr(contract.acceptanceTests).length}/10 executable tests` },
    { id:"PUBLIC_COPY",label:"Audience-facing brand policy",status:!(/\bAI\b/i.test(String(artifact.publicWorkingTitle||"")))?"PASS":"FAIL",evidence:"No AI reference in public working title" },
  ];
  const score = Math.round(gates.filter((g)=>g.status==="PASS").length/gates.length*100);
  return { gates, score, candidateFloor, criticFloor, passed: gates.every((g)=>g.status==="PASS")&&score>=THRESHOLD };
}

async function upstream(db: Database) {
  const stageRows = await rows(db,"SELECT stage_key,status,artifact_id FROM v7_stage_states WHERE program_id=? AND stage_key IN ('01','02','03','04') ORDER BY sequence",PROGRAM_ID);
  if (["01","02","03"].some((key)=>stageRows.find((row)=>row.stage_key===key)?.status!=="FROZEN")) throw new Error("Stages 01–03 must be frozen before Creative Contract can run");
  const artifacts = await rows(db,"SELECT stage_key,content_json,content_hash,id FROM v7_intelligence_artifacts WHERE program_id=? AND lifecycle_state='FROZEN' AND stage_key IN ('01','02','03') ORDER BY created_at DESC",PROGRAM_ID);
  const latest = Object.fromEntries(["01","02","03"].map((key)=>[key,artifacts.find((row)=>row.stage_key===key)]));
  if (!latest["01"]||!latest["02"]||!latest["03"]) throw new Error("Frozen Wave 2 evidence is incomplete");
  return { stages: stageRows, market: JSON.parse(String(latest["01"].content_json)), references: JSON.parse(String(latest["02"].content_json)), research: JSON.parse(String(latest["03"].content_json)), upstreamEvidenceId: `${latest["03"].id}-EVIDENCE` };
}

async function snapshot() {
  const env=await runtime(); const db=env.DB!; const up=await upstream(db).catch(()=>null);
  const stage=await db.prepare("SELECT * FROM v7_stage_states WHERE id=?").bind(`${PROGRAM_ID}-STAGE-${STAGE}`).first<Record<string,unknown>>();
  const runs=await rows(db,"SELECT * FROM v7_creative_runs WHERE program_id=? ORDER BY started_at DESC",PROGRAM_ID); const jobs=await rows(db,"SELECT * FROM v7_creative_jobs WHERE program_id=? ORDER BY started_at DESC",PROGRAM_ID); const artifacts=await rows(db,"SELECT * FROM v7_creative_artifacts WHERE program_id=? ORDER BY created_at DESC",PROGRAM_ID);
  return { provider:{connected:Boolean(env.OPENAI_API_KEY),model:env.OPENAI_QA_MODEL||MODEL},upstreamReady:Boolean(up),stage:{stageKey:STAGE,stageName:stage?.stage_name||"Creative Contract",status:stage?.status||"BLOCKED_UPSTREAM",threshold:Number(stage?.threshold||THRESHOLD),attempt:Number(stage?.attempt||0),blocker:stage?.blocker||null,evidenceSummary:stage?.evidence_summary||""},runs:runs.map((r)=>({id:r.id,status:r.status,score:Number(r.score),attempt:Number(r.attempt),threshold:Number(r.threshold),gates:JSON.parse(String(r.gate_json||"[]")),startedAt:r.started_at,completedAt:r.completed_at})),jobs:jobs.map((j)=>({id:j.id,runId:j.run_id,status:j.status,providerStatus:j.provider_status,startedAt:j.started_at,heartbeatAt:j.heartbeat_at,error:j.error})),artifacts:artifacts.map((a)=>({id:a.id,lifecycleState:a.lifecycle_state,content:JSON.parse(String(a.content_json)),contentHash:a.content_hash,runtimeKey:a.runtime_key,driveFileId:a.drive_file_id,createdAt:a.created_at})) };
}

async function start() {
  const env=await runtime(); const db=env.DB!; const up=await upstream(db);
  const active=await db.prepare("SELECT id FROM v7_creative_jobs WHERE program_id=? AND status='ACTIVE' LIMIT 1").bind(PROGRAM_ID).first(); if(active)return snapshot();
  const stage=await db.prepare("SELECT status,attempt FROM v7_stage_states WHERE id=?").bind(`${PROGRAM_ID}-STAGE-${STAGE}`).first<{status:string;attempt:number}>();
  if(!stage||!["READY","REPAIR_REQUIRED"].includes(stage.status)) throw new Error("Creative Contract is not ready"); if(stage.attempt>=3) throw new Error("Stage 04 exhausted three automatic attempts and requires senior review");
  const prompt=`You are a seven-member senior creative board for a maximum-quality US-English faceless documentary channel, Hidden Systems Behind Money. Cost optimization is deferred. Use only the frozen evidence supplied below; do not add new factual claims. Generate exactly four materially different creative routes, score them independently, select one champion, then write a production-binding Creative Contract. SCORE CONTRACT: every one of the six candidate score fields is an integer on a 0–100 scale, never a 0–10 scale; totalScore is the rounded arithmetic mean of those six fields, never their sum; championId must identify the candidate with the highest totalScore and that winner must score at least 90. The public title must never mention AI. The contract must prevent the prior failure modes: generic repeated diagrams, stock selected by broad keywords, decorative visuals, missing music/ambience/SFX, weak mobile legibility, and unsupported claims. Visual families must assign different meaning-bearing grammars such as cinematic macro reality, living process maps, numerical charts, annotated documents, comic/doodle counterfactuals, timelines, maps, UI abstractions and economic waterfalls—not mere color swaps. Sound motifs must specify narrative function, not just mood. Every risk must be resolved with an executable acceptance test. Return only JSON.\n\nMARKET:\n${JSON.stringify(up.market)}\n\nREFERENCE PATTERNS (learn structure, never clone):\n${JSON.stringify(up.references)}\n\nCONTROLLED CLAIM GRAPH:\n${JSON.stringify(up.research)}`;
  const provider=await startProvider(env,prompt); const attempt=stage.attempt+1; const runId=`${PROGRAM_ID}-CREATIVE-${Date.now()}`; const jobId=`${runId}-JOB`; const now=new Date().toISOString();
  await db.batch([db.prepare("INSERT INTO v7_creative_runs (id,program_id,attempt,status,score,threshold,model_id,gate_json,started_at) VALUES (?, ?, ?, 'RUNNING',0,?,?,'[]',?)").bind(runId,PROGRAM_ID,attempt,THRESHOLD,env.OPENAI_QA_MODEL||MODEL,now),db.prepare("INSERT INTO v7_creative_jobs (id,program_id,run_id,provider_response_id,provider_status,status,heartbeat_at,started_at) VALUES (?,?,?,?,?,'ACTIVE',?,?)").bind(jobId,PROGRAM_ID,runId,provider.id,provider.status,now,now),db.prepare("UPDATE v7_stage_states SET status='RUNNING',attempt=?,blocker=null,evidence_summary='Creative tournament accepted · background adjudication active',updated_at=? WHERE id=?").bind(attempt,now,`${PROGRAM_ID}-STAGE-${STAGE}`)]);
  return snapshot();
}

async function fail(db:Database,runId:string,jobId:string,message:string){const now=new Date().toISOString();await db.batch([db.prepare("UPDATE v7_creative_jobs SET status='FAILED',provider_status='failed',heartbeat_at=?,finalized_at=?,error=? WHERE id=?").bind(now,now,message,jobId),db.prepare("UPDATE v7_creative_runs SET status='FAILED',gate_json=?,completed_at=? WHERE id=?").bind(JSON.stringify([{id:"EXECUTION",label:"Execution integrity",status:"FAIL",evidence:message}]),now,runId),db.prepare("UPDATE v7_stage_states SET status='REPAIR_REQUIRED',blocker=?,evidence_summary='No Creative Contract frozen',updated_at=? WHERE id=?").bind(message,now,`${PROGRAM_ID}-STAGE-${STAGE}`)]);}

async function finalize(env:Runtime,runId:string,jobId:string,payload:Record<string,unknown>){const db=env.DB!;const now=new Date().toISOString();const artifact=normalizeCandidateScores(JSON.parse(textOutput(payload)) as Record<string,unknown>);const review=evaluate(artifact);const envelope=JSON.stringify({pipelineVersion:7,stage:STAGE,generatedAt:now,artifact},null,2);const hash=await digest(envelope);const artifactId=`${runId}-ARTIFACT`;const runtimeKey=`v7/creative/${artifactId}.json`;if(!env.BUCKET)throw new Error("Runtime object storage is unavailable");await env.BUCKET.put(runtimeKey,envelope,{httpMetadata:{contentType:"application/json"},customMetadata:{pipelineVersion:"7",stage:STAGE,contentHash:hash}});if(!(await env.BUCKET.head(runtimeKey)))throw new Error("Creative artifact read-back failed");const drive=await storeDriveJsonArtifact({folderPath:["Channels","Hidden Systems","Projects","V7 Greenfield Pilot","Creative"],fileName:`04-creative-contract-${runId.slice(-13)}.json`,content:envelope,artifactId,contentHash:hash});const state=review.passed?"FROZEN":"REPAIR_REQUIRED";const up=await upstream(db);
  await db.batch([db.prepare("INSERT INTO v7_creative_artifacts (id,program_id,run_id,lifecycle_state,content_json,content_hash,runtime_key,drive_file_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(artifactId,PROGRAM_ID,runId,state,JSON.stringify(artifact),hash,runtimeKey,drive.id,now,now),db.prepare("UPDATE v7_creative_runs SET status=?,score=?,gate_json=?,completed_at=? WHERE id=?").bind(review.passed?"PASS":"REPAIR_REQUIRED",review.score,JSON.stringify(review.gates),now,runId),db.prepare("UPDATE v7_creative_jobs SET status='COMPLETED',provider_status='completed',heartbeat_at=?,finalized_at=?,error=null WHERE id=?").bind(now,now,jobId),db.prepare("UPDATE v7_stage_states SET status=?,artifact_id=?,blocker=?,evidence_summary=?,frozen_at=?,updated_at=? WHERE id=?").bind(state,artifactId,review.passed?null:"One or more Creative Contract hard gates failed",`${review.score}/100 · candidate floor ${review.candidateFloor} · critic floor ${review.criticFloor} · R2 and Drive verified`,review.passed?now:null,now,`${PROGRAM_ID}-STAGE-${STAGE}`),db.prepare("INSERT INTO v7_evidence_lineage (id,program_id,entity_type,title,lifecycle_state,upstream_evidence_id,artifact_key,content_hash,storage_state,rights_state,cost_state,quarantine_state,pipeline_version,updated_at) VALUES (?,?,?,?,?,?,?,?, 'R2_AND_DRIVE_VERIFIED','INTERNAL_ORIGINAL','MEASURED','CLEAR',7,?)").bind(`${artifactId}-EVIDENCE`,PROGRAM_ID,"CREATIVE_CONTRACT","Stage 04 Creative Contract",state,up.upstreamEvidenceId,runtimeKey,hash,now)]);
  await recordOpenAIUsage({db,programId:PROGRAM_ID,runId,stageKey:STAGE,costType:"CREATIVE_TOURNAMENT",payload,fallbackModel:MODEL});
  if(review.passed){await db.batch([db.prepare("UPDATE v7_stage_states SET status='READY',blocker=null,evidence_summary='Stage 04 frozen; Creative Contract accepted',updated_at=? WHERE id=? AND status='BLOCKED_UPSTREAM'").bind(now,`${PROGRAM_ID}-STAGE-05`),db.prepare("UPDATE v7_program_contracts SET status='STAGE_04_FROZEN',updated_at=? WHERE id=?").bind(now,PROGRAM_ID)]);}
}

async function repairScoringContract(){
  const env=await runtime(); const db=env.DB!; const now=new Date().toISOString();
  const row=await db.prepare("SELECT * FROM v7_creative_artifacts WHERE program_id=? AND lifecycle_state='REPAIR_REQUIRED' ORDER BY created_at DESC LIMIT 1").bind(PROGRAM_ID).first<Record<string,unknown>>();
  if(!row)throw new Error("No repairable Creative Contract was found");
  const prior=JSON.parse(String(row.content_json)) as Record<string,unknown>;
  if(!usesTenPointScale(prior))throw new Error("The latest Creative Contract does not have the known 0–10 scoring-scale defect");
  const artifact=normalizeCandidateScores(prior); const review=evaluate(artifact);
  if(!review.passed)throw new Error("Deterministic scoring repair completed, but another hard gate still blocks Stage 04");
  const envelope=JSON.stringify({pipelineVersion:7,stage:STAGE,generatedAt:now,repair:"DETERMINISTIC_SCORE_NORMALIZATION",supersedesHash:String(row.content_hash),artifact},null,2);
  const hash=await digest(envelope); const runtimeKey=String(row.runtime_key); const artifactId=String(row.id); const runId=String(row.run_id);
  if(!env.BUCKET)throw new Error("Runtime object storage is unavailable");
  await env.BUCKET.put(runtimeKey,envelope,{httpMetadata:{contentType:"application/json"},customMetadata:{pipelineVersion:"7",stage:STAGE,contentHash:hash,repair:"score-normalization"}});
  if(!(await env.BUCKET.head(runtimeKey)))throw new Error("Repaired Creative artifact read-back failed");
  const drive=await storeDriveJsonArtifact({folderPath:["Channels","Hidden Systems","Projects","V7 Greenfield Pilot","Creative"],fileName:`04-creative-contract-scoring-repair-${runId.slice(-13)}.json`,content:envelope,artifactId,contentHash:hash});
  await db.batch([
    db.prepare("UPDATE v7_creative_artifacts SET lifecycle_state='FROZEN',content_json=?,content_hash=?,drive_file_id=?,updated_at=? WHERE id=?").bind(JSON.stringify(artifact),hash,drive.id,now,artifactId),
    db.prepare("UPDATE v7_creative_runs SET status='PASS',score=?,gate_json=?,completed_at=? WHERE id=?").bind(review.score,JSON.stringify(review.gates),now,runId),
    db.prepare("UPDATE v7_stage_states SET status='FROZEN',artifact_id=?,blocker=null,evidence_summary=?,frozen_at=?,updated_at=? WHERE id=?").bind(artifactId,`${review.score}/100 · deterministic 0–100 scoring repair · candidate floor ${review.candidateFloor} · critic floor ${review.criticFloor} · R2 and Drive verified`,now,now,`${PROGRAM_ID}-STAGE-${STAGE}`),
    db.prepare("UPDATE v7_evidence_lineage SET lifecycle_state='FROZEN',content_hash=?,storage_state='R2_AND_DRIVE_VERIFIED',updated_at=? WHERE id=?").bind(hash,now,`${artifactId}-EVIDENCE`),
    db.prepare("UPDATE v7_stage_states SET status='READY',blocker=null,evidence_summary='Stage 04 frozen; Creative Contract accepted',updated_at=? WHERE id=? AND status='BLOCKED_UPSTREAM'").bind(now,`${PROGRAM_ID}-STAGE-05`),
    db.prepare("UPDATE v7_program_contracts SET status='STAGE_04_FROZEN',updated_at=? WHERE id=?").bind(now,PROGRAM_ID),
  ]);
  return snapshot();
}

async function poll(){const env=await runtime();const db=env.DB!;const job=await db.prepare("SELECT id,run_id,provider_response_id FROM v7_creative_jobs WHERE program_id=? AND status='ACTIVE' ORDER BY started_at DESC LIMIT 1").bind(PROGRAM_ID).first<{id:string;run_id:string;provider_response_id:string}>();if(!job)return snapshot();let payload:Record<string,unknown>;try{payload=await retrieveProvider(env,job.provider_response_id);}catch(error){const message=error instanceof Error?error.message:"Provider status unavailable";await db.prepare("UPDATE v7_creative_jobs SET heartbeat_at=?,error=? WHERE id=?").bind(new Date().toISOString(),message,job.id).run();throw new Error(`${message}. The job remains resumable.`);}try{const status=String(payload.status||"unknown");const now=new Date().toISOString();await db.batch([db.prepare("UPDATE v7_creative_jobs SET provider_status=?,heartbeat_at=? WHERE id=?").bind(status,now,job.id),db.prepare("UPDATE v7_stage_states SET evidence_summary=?,updated_at=? WHERE id=?").bind(`Creative board · ${status.replaceAll("_"," ")} · heartbeat ${now.slice(11,19)} UTC`,now,`${PROGRAM_ID}-STAGE-${STAGE}`)]);if(["queued","in_progress"].includes(status))return await snapshot();if(status!=="completed"){await recordOpenAIUsage({db,programId:PROGRAM_ID,runId:job.run_id,stageKey:STAGE,costType:"CREATIVE_TOURNAMENT",payload,fallbackModel:MODEL});await fail(db,job.run_id,job.id,`Provider ended with status ${status}`);return await snapshot();}await finalize(env,job.run_id,job.id,payload);return await snapshot();}catch(error){const message=error instanceof Error?error.message:"Creative Contract finalization failed";await fail(db,job.run_id,job.id,message);throw error;}}

export async function GET(){try{return Response.json(await snapshot());}catch(error){return Response.json({error:error instanceof Error?error.message:"Creative Contract could not load"},{status:500});}}
export async function POST(request: Request) {
  try {
    const authorization = await authorizeCreativeOwnerWrite(request);
    if (authorization instanceof Response) return authorization;
    const actorDenial = requireCreativeOwnerAuthority(authorization.actorType);
    if (actorDenial) return actorDenial;

    const command = await readCreativeOwnerCommand(request);
    if (command instanceof Response) return command;

    const binding = await bindCreativeOwnerResource(authorization.db);
    if (binding instanceof Response) return binding;
    const entitlement = await authorizeCreativeOwnerEntitlement(authorization.db, authorization.env, command, binding);
    if (entitlement instanceof Response) return entitlement;

    const identity = await creativeOwnerAuditIdentity(request, authorization.normalizedEmail, command);
    const replay = await lookupCreativeOwnerReplay(authorization.db, identity);
    if (replay) return replay;

    return await runAuditedCreativeOwnerCommand(
      authorization.db,
      identity,
      command,
      () => executeCreativeOwnerCommand(command, entitlement),
    );
  } catch (error) {
    console.error("Creative Contract owner POST failed", error);
    return creativeOwnerFailure("CREATIVE_OWNER_ACTION_FAILED", 500);
  }
}
