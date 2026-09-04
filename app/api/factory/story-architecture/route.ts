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
const STAGE = "05";
const THRESHOLD = 92;
const MODEL = "gpt-5.6";

type Statement = { bind: (...values: unknown[]) => Statement; run: () => Promise<unknown>; all: <T>() => Promise<{ results?: T[] }>; first: <T>() => Promise<T | null> };
type Database = WriteCommandAuditDatabase & { prepare: (sql: string) => Statement; batch: (statements: Statement[]) => Promise<unknown> };
type Bucket = { put: (key: string, value: string, options?: Record<string, unknown>) => Promise<unknown>; head: (key: string) => Promise<unknown> };
type Runtime = { DB?: Database; BUCKET?: Bucket; OPENAI_API_KEY?: string; OPENAI_QA_MODEL?: string; FACTORY_EXPERT_EMAILS?: string };
type Gate = { id: string; label: string; status: "PASS" | "FAIL"; evidence: string };

type StoryOwnerAction = "RUN" | "POLL";
type StoryOwnerPayload =
  | { action: "RUN" }
  | { action: "POLL" };
type StoryOwnerCommand = {
  action: StoryOwnerAction;
  payload: StoryOwnerPayload;
  requestHash: string;
};
type StoryOwnerAuditRow = {
  handler_identity: string;
  request_hash: string;
  phase: "AUTHORIZED" | "SUCCEEDED" | "FAILED";
  domain_receipt_reference: string | null;
};
type StoryProgramBinding = {
  id: string;
  productionAuthorized: boolean;
  stageKey: typeof STAGE;
  stageStatus: string;
  stageAttempt: number;
};
type StoryOwnerEntitlement =
  | { action: "RUN"; kind: "PAID_BACKGROUND_STORY_ARCHITECTURE"; db: Database; providerApiKey: string; upstreamArtifactId: string }
  | { action: "POLL"; kind: "PROVIDER_STATUS_READ_AND_BOUNDED_FINALIZATION"; db: Database; providerApiKey: string; activeJobId: string };

const STORY_OWNER_HANDLER_IDENTITY = "app/api/factory/story-architecture/route.ts#POST";
const STORY_OWNER_ACTIONS = new Set<StoryOwnerAction>(["RUN", "POLL"]);
const STORY_OWNER_FIELDS: Record<StoryOwnerAction, ReadonlySet<string>> = {
  RUN: new Set(["action"]),
  POLL: new Set(["action"]),
};
const MAX_STORY_OWNER_BODY_BYTES = 16 * 1024;
const STORY_OWNER_CORRELATION_ID_PATTERN = /^[A-Za-z0-9._:-]{8,200}$/;
const STORY_OWNER_AUDIT_COMPONENT_PATTERN = /[^A-Za-z0-9._:-]/g;

async function storyAuthorizationEnv() {
  const { env } = await import("cloudflare:workers");
  return env as unknown as Runtime;
}

function storyOwnerFailure(error: string, status: number) {
  return Response.json({ error }, { status });
}

function storyOwnerSameOrigin(request: Request) {
  const url = new URL(request.url);
  return request.method === "POST"
    && url.pathname === "/api/factory/story-architecture"
    && url.search === ""
    && request.headers.get("origin") === url.origin
    && request.headers.get("sec-fetch-site") === "same-origin";
}

async function authorizeStoryOwnerWrite(request: Request) {
  const user = await getChatGPTUser();
  if (!user?.email) return storyOwnerFailure("SIWC_AUTHENTICATION_REQUIRED", 401);
  if (!storyOwnerSameOrigin(request)) return storyOwnerFailure("OWNER_WRITE_SAME_ORIGIN_REQUIRED", 403);

  const env = await storyAuthorizationEnv();
  const normalizedEmail = user.email.trim().toLowerCase();
  const owners = String(env.FACTORY_EXPERT_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (owners.length === 0) return storyOwnerFailure("OWNER_WRITE_ALLOWLIST_UNCONFIGURED", 503);
  if (!owners.includes(normalizedEmail)) return storyOwnerFailure("OWNER_WRITE_AUTHORIZATION_REQUIRED", 403);
  if (!env.DB) return storyOwnerFailure("CANONICAL_DATABASE_UNAVAILABLE", 503);
  return { db: env.DB, env, normalizedEmail, actorType: "CHATGPT_OWNER" as const };
}

function requireStoryOwnerAuthority(actorType: string) {
  if (actorType === "AGENT") return storyOwnerFailure("AGENT_OWNER_COMMAND_FORBIDDEN", 403);
  return actorType === "CHATGPT_OWNER" ? null : storyOwnerFailure("OWNER_WRITE_AUTHORIZATION_REQUIRED", 403);
}

async function storyOwnerSha256RawBytes(bytes: ArrayBuffer | Uint8Array) {
  const value = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", value));
  return [...digest].map((item) => item.toString(16).padStart(2, "0")).join("");
}

function storyOwnerExactKeys(value: Record<string, unknown>, expected: ReadonlySet<string>) {
  const keys = Object.keys(value);
  return keys.length === expected.size && keys.every((key) => expected.has(key));
}

async function readStoryOwnerCommand(request: Request): Promise<StoryOwnerCommand | Response> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") return storyOwnerFailure("JSON_CONTENT_TYPE_REQUIRED", 415);
  const lengthHeader = request.headers.get("content-length");
  const contentLength = lengthHeader === null ? null : Number(lengthHeader);
  if (contentLength !== null && (!Number.isFinite(contentLength) || contentLength < 0)) return storyOwnerFailure("OWNER_WRITE_CONTENT_LENGTH_INVALID", 400);
  if (contentLength !== null && contentLength > MAX_STORY_OWNER_BODY_BYTES) return storyOwnerFailure("OWNER_WRITE_BODY_TOO_LARGE", 413);
  const raw = await request.arrayBuffer();
  if (!raw.byteLength || raw.byteLength > MAX_STORY_OWNER_BODY_BYTES) return storyOwnerFailure("OWNER_WRITE_BODY_TOO_LARGE", 413);

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(raw));
  } catch {
    return storyOwnerFailure("OWNER_WRITE_JSON_INVALID", 400);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return storyOwnerFailure("OWNER_WRITE_COMMAND_INVALID", 400);
  const record = parsed as Record<string, unknown>;
  if (typeof record.action !== "string") return storyOwnerFailure("OWNER_WRITE_COMMAND_INVALID", 400);
  if (!STORY_OWNER_ACTIONS.has(record.action as StoryOwnerAction)) return storyOwnerFailure("STORY_OWNER_ACTION_FORBIDDEN", 403);
  const action = record.action as StoryOwnerAction;
  if (!storyOwnerExactKeys(record, STORY_OWNER_FIELDS[action])) return storyOwnerFailure("OWNER_WRITE_COMMAND_INVALID", 400);
  const payload = record as StoryOwnerPayload;
  return { action, payload, requestHash: await storyOwnerSha256RawBytes(raw) };
}

async function bindStoryOwnerResource(db: Database): Promise<StoryProgramBinding | Response> {
  const program = await db.prepare("SELECT id,production_authorized FROM v7_program_contracts WHERE id = ? LIMIT 1")
    .bind(PROGRAM_ID)
    .first<{ id: string; production_authorized: number }>();
  if (program?.id !== PROGRAM_ID) return storyOwnerFailure("STORY_PROGRAM_RESOURCE_NOT_FOUND", 404);
  const stage = await db.prepare("SELECT program_id,stage_key,status,attempt FROM v7_stage_states WHERE id = ? AND program_id = ? AND stage_key = ? LIMIT 1")
    .bind(`${PROGRAM_ID}-STAGE-${STAGE}`, PROGRAM_ID, STAGE)
    .first<{ program_id: string; stage_key: string; status: string; attempt: number }>();
  if (!stage || stage.program_id !== PROGRAM_ID || stage.stage_key !== STAGE) return storyOwnerFailure("STORY_STAGE05_RESOURCE_NOT_FOUND", 404);
  return {
    id: program.id,
    productionAuthorized: Boolean(program.production_authorized),
    stageKey: STAGE,
    stageStatus: stage.status,
    stageAttempt: Number(stage.attempt),
  };
}

async function authorizeStoryOwnerEntitlement(
  db: Database,
  env: Runtime,
  command: StoryOwnerCommand,
  binding: StoryProgramBinding,
): Promise<StoryOwnerEntitlement | Response> {
  if (command.action === "RUN") {
    if (!binding.productionAuthorized) return storyOwnerFailure("STORY_RUN_ENTITLEMENT_UNAVAILABLE", 409);
    if (!["READY", "REPAIR_REQUIRED"].includes(binding.stageStatus)) return storyOwnerFailure("STORY_RUN_ENTITLEMENT_UNAVAILABLE", 409);
    if (!Number.isInteger(binding.stageAttempt) || binding.stageAttempt < 0 || binding.stageAttempt >= 3) return storyOwnerFailure("STORY_RUN_ENTITLEMENT_UNAVAILABLE", 409);
    const upstream = await db.prepare("SELECT id FROM v7_creative_artifacts WHERE program_id = ? AND lifecycle_state = 'FROZEN' ORDER BY updated_at DESC LIMIT 1")
      .bind(PROGRAM_ID)
      .first<{ id: string }>();
    if (!upstream?.id) return storyOwnerFailure("STORY_RUN_ENTITLEMENT_UNAVAILABLE", 409);
    if (!env.OPENAI_API_KEY) return storyOwnerFailure("PROVIDER_DISPATCH_ENTITLEMENT_UNAVAILABLE", 503);
    return { action: command.action, kind: "PAID_BACKGROUND_STORY_ARCHITECTURE", db, providerApiKey: env.OPENAI_API_KEY, upstreamArtifactId: upstream.id };
  }
  if (binding.stageStatus !== "RUNNING") return storyOwnerFailure("STORY_POLL_ENTITLEMENT_UNAVAILABLE", 409);
  if (!env.OPENAI_API_KEY) return storyOwnerFailure("PROVIDER_STATUS_ENTITLEMENT_UNAVAILABLE", 503);
  const active = await db.prepare("SELECT id FROM v7_story_jobs WHERE program_id = ? AND status = 'ACTIVE' ORDER BY started_at DESC LIMIT 1")
    .bind(PROGRAM_ID)
    .first<{ id: string }>();
  if (!active?.id) return storyOwnerFailure("STORY_POLL_ENTITLEMENT_UNAVAILABLE", 409);
  return { action: command.action, kind: "PROVIDER_STATUS_READ_AND_BOUNDED_FINALIZATION", db, providerApiKey: env.OPENAI_API_KEY, activeJobId: active.id };
}

function storyOwnerBoundedAuditComponent(value: string) {
  return value.replace(STORY_OWNER_AUDIT_COMPONENT_PATTERN, "_").slice(0, 200) || "unknown";
}

function storyOwnerCorrelationId(request: Request) {
  const supplied = request.headers.get("x-correlation-id")?.trim() ?? "";
  return STORY_OWNER_CORRELATION_ID_PATTERN.test(supplied) ? supplied : `story-owner:${crypto.randomUUID()}`;
}

async function storyOwnerAuditIdentity(
  request: Request,
  normalizedEmail: string,
  command: StoryOwnerCommand,
): Promise<WriteCommandAuditIdentity> {
  return {
    handlerIdentity: STORY_OWNER_HANDLER_IDENTITY,
    actorType: "CHATGPT_OWNER",
    actorSubjectHash: await hashActorSubject("CHATGPT_OWNER", normalizedEmail),
    action: command.action,
    resourceScope: `program:${PROGRAM_ID}:story-architecture:stage:${STAGE}`,
    correlationId: storyOwnerCorrelationId(request),
    requestHash: command.requestHash,
  };
}

async function lookupStoryOwnerReplay(db: Database, identity: WriteCommandAuditIdentity) {
  const result = await db.prepare(`SELECT handler_identity,request_hash,phase,domain_receipt_reference
    FROM factory_write_command_audit WHERE correlation_id = ? ORDER BY canonical_timestamp,id`)
    .bind(identity.correlationId)
    .all<StoryOwnerAuditRow>();
  const rows = result.results ?? [];
  if (!rows.length) return null;
  if (rows.some((row) => row.handler_identity !== identity.handlerIdentity || row.request_hash !== identity.requestHash)) {
    return storyOwnerFailure("OWNER_WRITE_IDEMPOTENCY_CONFLICT", 409);
  }
  const succeeded = rows.find((row) => row.phase === "SUCCEEDED");
  if (succeeded) return Response.json({ ok: true, replay: true, receipt: succeeded.domain_receipt_reference });
  return storyOwnerFailure("OWNER_WRITE_REPLAY_INCOMPLETE", 409);
}

function storyOwnerFirstRecord(value: unknown) {
  if (!Array.isArray(value) || !value[0] || typeof value[0] !== "object") return undefined;
  return value[0] as Record<string, unknown>;
}

async function storyOwnerDomainReceipt(command: StoryOwnerCommand, response: Response) {
  const payload = await response.clone().json().catch(() => ({})) as Record<string, unknown>;
  const stage = payload.stage && typeof payload.stage === "object" ? payload.stage as Record<string, unknown> : {};
  const run = storyOwnerFirstRecord(payload.runs);
  const job = storyOwnerFirstRecord(payload.jobs);
  const artifact = storyOwnerFirstRecord(payload.artifacts);
  const reference = [
    STAGE,
    String(run?.id ?? "no-run"),
    String(job?.id ?? "no-job"),
    String(job?.providerStatus ?? run?.status ?? stage.status ?? "no-status"),
    String(artifact?.id ?? "no-artifact"),
    String(artifact?.contentHash ?? "no-hash"),
  ].map(storyOwnerBoundedAuditComponent).join(":");
  return `story:${storyOwnerBoundedAuditComponent(PROGRAM_ID)}:${storyOwnerBoundedAuditComponent(command.action)}:${reference}`;
}

async function runAuditedStoryOwnerCommand(
  db: Database,
  identity: WriteCommandAuditIdentity,
  command: StoryOwnerCommand,
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
    await appendWriteCommandAudit(db, identity, "SUCCEEDED", await storyOwnerDomainReceipt(command, response));
    return response;
  } catch (error) {
    await appendWriteCommandAudit(db, identity, "FAILED", null);
    throw error;
  }
}

async function executeStoryOwnerCommand(command: StoryOwnerCommand, entitlement: StoryOwnerEntitlement) {
  if (command.action !== entitlement.action) return storyOwnerFailure("STORY_OWNER_ENTITLEMENT_MISMATCH", 403);
  try {
    if (command.action === "RUN") return Response.json(await start(), { status: 202 });
    return Response.json(await poll());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Story Architecture failed";
    return Response.json({ error: message }, { status: message.includes("not ready") || message.includes("must freeze") ? 409 : 500 });
  }
}

const tables = [
  AI_USAGE_TABLE_SQL,
  `CREATE TABLE IF NOT EXISTS v7_story_runs (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, attempt integer DEFAULT 1 NOT NULL, status text DEFAULT 'RUNNING' NOT NULL, score integer DEFAULT 0 NOT NULL, threshold integer DEFAULT 92 NOT NULL, model_id text NOT NULL, gate_json text DEFAULT '[]' NOT NULL, started_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, completed_at text)`,
  `CREATE TABLE IF NOT EXISTS v7_story_jobs (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, run_id text NOT NULL, provider_response_id text NOT NULL, provider_status text DEFAULT 'queued' NOT NULL, status text DEFAULT 'ACTIVE' NOT NULL, heartbeat_at text NOT NULL, started_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, finalized_at text, error text)`,
  `CREATE TABLE IF NOT EXISTS v7_story_artifacts (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, run_id text NOT NULL, lifecycle_state text DEFAULT 'MATERIALIZED' NOT NULL, content_json text NOT NULL, content_hash text NOT NULL, runtime_key text, drive_file_id text, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
] as const;

async function runtime() { const { env } = await import("cloudflare:workers"); const value = env as unknown as Runtime; if (!value.DB) throw new Error("Story Architecture database is unavailable"); await value.DB.batch(tables.map((sql) => value.DB!.prepare(sql))); return value; }
function arr(value: unknown) { return Array.isArray(value) ? value : []; }
function record(value: unknown) { return value && typeof value === "object" ? value as Record<string, unknown> : {}; }
async function rows(db: Database, sql: string, ...bindings: unknown[]) { return (await db.prepare(sql).bind(...bindings).all<Record<string, unknown>>()).results || []; }
async function digest(content: string) { const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content))); return [...bytes].map((b) => b.toString(16).padStart(2,"0")).join(""); }
function textOutput(payload: Record<string, unknown>) { if (typeof payload.output_text === "string") return payload.output_text; for (const item of arr(payload.output)) for (const block of arr(record(item).content)) if (typeof record(block).text === "string") return String(record(block).text); throw new Error("OpenAI returned no structured Story Architecture"); }

const criticScore = { type: "integer", minimum: 0, maximum: 100 };
const storySchema = {
  type: "object", additionalProperties: false,
  properties: {
    title: { type: "string" }, centralDramaticQuestion: { type: "string" }, runtimeSeconds: { type: "integer", minimum: 420, maximum: 600 },
    acts: { type: "array", minItems: 3, maxItems: 3, items: { type: "object", additionalProperties: false, properties: { id:{type:"string"}, title:{type:"string"}, startSeconds:{type:"number"}, endSeconds:{type:"number"}, dramaticJob:{type:"string"}, escalation:{type:"string"}, actPayoff:{type:"string"} }, required:["id","title","startSeconds","endSeconds","dramaticJob","escalation","actPayoff"] } },
    beats: { type: "array", minItems: 12, maxItems: 18, items: { type: "object", additionalProperties: false, properties: {
      id:{type:"string"}, actId:{type:"string"}, title:{type:"string"}, startSeconds:{type:"number"}, endSeconds:{type:"number"}, storyFunction:{type:"string"}, narrationGoal:{type:"string"}, viewerBefore:{type:"string"}, viewerAfter:{type:"string"}, claimIds:{type:"array",minItems:1,items:{type:"string"}}, retentionDevice:{type:"string"}, visualGrammar:{type:"string"}, soundFunction:{type:"string"}, cognitiveLoad:{type:"string",enum:["LOW","MEDIUM","HIGH"]}, transitionLogic:{type:"string"}, acceptanceTests:{type:"array",minItems:2,items:{type:"string"}}
    }, required:["id","actId","title","startSeconds","endSeconds","storyFunction","narrationGoal","viewerBefore","viewerAfter","claimIds","retentionDevice","visualGrammar","soundFunction","cognitiveLoad","transitionLogic","acceptanceTests"] } },
    retentionSpine:{type:"array",minItems:6,items:{type:"object",additionalProperties:false,properties:{timeSeconds:{type:"number"},function:{type:"string"},promise:{type:"string"},payoffBeatId:{type:"string"}},required:["timeSeconds","function","promise","payoffBeatId"]}},
    critics:{type:"array",minItems:7,items:{type:"object",additionalProperties:false,properties:{role:{type:"string"},score:criticScore,verdict:{type:"string"},requiredControl:{type:"string"}},required:["role","score","verdict","requiredControl"]}},
    adversarialRisks:{type:"array",minItems:6,items:{type:"object",additionalProperties:false,properties:{risk:{type:"string"},severity:{type:"string",enum:["P0","P1","P2"]},resolution:{type:"string"},acceptanceTest:{type:"string"},status:{type:"string",enum:["RESOLVED","OPEN"]}},required:["risk","severity","resolution","acceptanceTest","status"]}},
  }, required:["title","centralDramaticQuestion","runtimeSeconds","acts","beats","retentionSpine","critics","adversarialRisks"]
};

function normalizeCritics(artifact: Record<string, unknown>) { const critics = arr(artifact.critics).map(record); const tenPoint = critics.length > 0 && critics.every((critic) => Number(critic.score) >= 0 && Number(critic.score) <= 10); return { ...artifact, critics: critics.map((critic) => ({ ...critic, score: Math.max(0,Math.min(100,Math.round(Number(critic.score||0)*(tenPoint?10:1)))) })) }; }

function evaluate(artifact: Record<string, unknown>, validClaims: string[], contractedRuntime: number) {
  const acts=arr(artifact.acts).map(record); const beats=arr(artifact.beats).map(record).sort((a,b)=>Number(a.startSeconds)-Number(b.startSeconds)); const spine=arr(artifact.retentionSpine).map(record); const critics=arr(artifact.critics).map(record); const risks=arr(artifact.adversarialRisks).map(record); const runtimeSeconds=Number(artifact.runtimeSeconds||0);
  const gaps=beats.reduce((count,beat,index)=>index&&Math.abs(Number(beat.startSeconds)-Number(beats[index-1].endSeconds))>.05?count+1:count,0); const overlaps=beats.reduce((count,beat,index)=>index&&Number(beat.startSeconds)<Number(beats[index-1].endSeconds)-.05?count+1:count,0);
  const usedClaims=new Set(beats.flatMap((beat)=>arr(beat.claimIds).map(String))); const invalidClaims=[...usedClaims].filter((id)=>!validClaims.includes(id)); const criticFloor=critics.length?Math.min(...critics.map((critic)=>Number(critic.score||0))):0;
  const completeBeats=beats.filter((beat)=>String(beat.viewerBefore||"").length>=15&&String(beat.viewerAfter||"").length>=15&&String(beat.visualGrammar||"").length>=20&&String(beat.soundFunction||"").length>=15&&arr(beat.acceptanceTests).length>=2).length;
  const first=beats[0]; const last=beats.at(-1); const midpoint=spine.some((item)=>Number(item.timeSeconds)>=runtimeSeconds*.4&&Number(item.timeSeconds)<=runtimeSeconds*.6); const payoff=spine.some((item)=>Number(item.timeSeconds)>=runtimeSeconds*.8);
  const gates:Gate[]=[
    {id:"ACTS",label:"Three-act dramatic architecture",status:acts.length===3?"PASS":"FAIL",evidence:`${acts.length}/3 acts`},
    {id:"BEATS",label:"Production-sized beat contract",status:beats.length>=12&&beats.length<=18?"PASS":"FAIL",evidence:`${beats.length} beats · accepted 12–18`},
    {id:"RUNTIME",label:"Runtime honors Creative Contract",status:runtimeSeconds===contractedRuntime&&runtimeSeconds>=420&&runtimeSeconds<=600?"PASS":"FAIL",evidence:`${runtimeSeconds}s / contracted ${contractedRuntime}s`},
    {id:"TIMELINE",label:"Continuous editorial clock",status:Number(first?.startSeconds)===0&&Math.abs(Number(last?.endSeconds)-runtimeSeconds)<.05&&gaps===0&&overlaps===0?"PASS":"FAIL",evidence:`0–${runtimeSeconds}s · ${gaps} gaps · ${overlaps} overlaps`},
    {id:"CLAIMS",label:"Claim-safe evidence binding",status:invalidClaims.length===0&&beats.every((beat)=>arr(beat.claimIds).length>0)?"PASS":"FAIL",evidence:`${usedClaims.size} claims used · ${invalidClaims.length} invalid`},
    {id:"COVERAGE",label:"Creative evidence coverage",status:validClaims.every((id)=>usedClaims.has(id))?"PASS":"FAIL",evidence:`${validClaims.filter((id)=>usedClaims.has(id)).length}/${validClaims.length} contracted claims covered`},
    {id:"PROGRESSION",label:"Viewer-state progression",status:completeBeats===beats.length&&new Set(beats.map((beat)=>String(beat.viewerAfter))).size===beats.length?"PASS":"FAIL",evidence:`${completeBeats}/${beats.length} complete · ${new Set(beats.map((beat)=>String(beat.viewerAfter))).size} unique outcomes`},
    {id:"RETENTION",label:"Hook, midpoint and final payoff",status:Number(first?.endSeconds)<=20&&spine.length>=6&&midpoint&&payoff?"PASS":"FAIL",evidence:`${spine.length} retention events · midpoint ${midpoint?"yes":"no"} · payoff ${payoff?"yes":"no"}`},
    {id:"AV",label:"Visual and sound meaning contracts",status:beats.every((beat)=>String(beat.visualGrammar||"").length>=20&&String(beat.soundFunction||"").length>=15)?"PASS":"FAIL",evidence:`${beats.length}/${beats.length} beats bound`},
    {id:"CRITICS",label:"Seven independent story critics",status:critics.length>=7&&criticFloor>=90?"PASS":"FAIL",evidence:`${critics.length}/7 · ${criticFloor}/90 floor`},
    {id:"ADVERSARIAL",label:"Resolved adversarial story review",status:risks.length>=6&&risks.every((risk)=>risk.status==="RESOLVED")?"PASS":"FAIL",evidence:`${risks.filter((risk)=>risk.status==="RESOLVED").length}/${risks.length} resolved`},
    {id:"ACCEPTANCE",label:"Executable beat-level acceptance",status:beats.every((beat)=>arr(beat.acceptanceTests).length>=2)?"PASS":"FAIL",evidence:`${beats.filter((beat)=>arr(beat.acceptanceTests).length>=2).length}/${beats.length} beats testable`},
  ];
  const score=Math.round(gates.filter((gate)=>gate.status==="PASS").length/gates.length*100); return {gates,score,criticFloor,passed:gates.every((gate)=>gate.status==="PASS")&&score>=THRESHOLD};
}

async function upstream(db:Database){
  const stage=await db.prepare("SELECT status,attempt,artifact_id FROM v7_stage_states WHERE id=?").bind(`${PROGRAM_ID}-STAGE-${STAGE}`).first<{status:string;attempt:number;artifact_id:string|null}>();
  const creative=await db.prepare("SELECT id,content_json,content_hash FROM v7_creative_artifacts WHERE program_id=? AND lifecycle_state='FROZEN' ORDER BY updated_at DESC LIMIT 1").bind(PROGRAM_ID).first<Record<string,unknown>>();
  if(!creative)throw new Error("Stage 04 Creative Contract must freeze before Story Architecture can run");
  const content=JSON.parse(String(creative.content_json)) as Record<string,unknown>; const contract=record(content.contract); return {stage,creative,content,contract,validClaims:arr(contract.evidenceClaimIds).map(String),runtime:Number(contract.runtimeTargetSeconds||0)};
}

async function startProvider(env:Runtime,prompt:string){if(!env.OPENAI_API_KEY)throw new Error("Connect OPENAI_API_KEY before running Stage 05");const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{authorization:`Bearer ${env.OPENAI_API_KEY}`,"content-type":"application/json"},body:JSON.stringify({model:env.OPENAI_QA_MODEL||MODEL,reasoning:{effort:"high"},background:true,store:true,input:[{role:"user",content:[{type:"input_text",text:prompt}]}],text:{format:{type:"json_schema",name:"v7_story_architecture",strict:true,schema:storySchema}}}),signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error(`OpenAI Story Architecture failed (${response.status}) · ${(await response.text()).replace(/\s+/g," ").slice(0,400)}`);const payload=await response.json() as Record<string,unknown>;if(typeof payload.id!=="string")throw new Error("OpenAI did not return a background response ID");return{id:payload.id,status:String(payload.status||"queued")};}
async function retrieveProvider(env:Runtime,id:string){if(!env.OPENAI_API_KEY)throw new Error("Connect OPENAI_API_KEY before resuming Stage 05");const response=await fetch(`https://api.openai.com/v1/responses/${encodeURIComponent(id)}`,{headers:{authorization:`Bearer ${env.OPENAI_API_KEY}`},signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error(`OpenAI Story status failed (${response.status}) · ${(await response.text()).replace(/\s+/g," ").slice(0,400)}`);return response.json() as Promise<Record<string,unknown>>;}

async function snapshot(){const env=await runtime();const db=env.DB!;const up=await upstream(db).catch(()=>null);const stage=await db.prepare("SELECT * FROM v7_stage_states WHERE id=?").bind(`${PROGRAM_ID}-STAGE-${STAGE}`).first<Record<string,unknown>>();const runs=await rows(db,"SELECT * FROM v7_story_runs WHERE program_id=? ORDER BY started_at DESC",PROGRAM_ID);const jobs=await rows(db,"SELECT * FROM v7_story_jobs WHERE program_id=? ORDER BY started_at DESC",PROGRAM_ID);const artifacts=await rows(db,"SELECT * FROM v7_story_artifacts WHERE program_id=? ORDER BY created_at DESC",PROGRAM_ID);return{provider:{connected:Boolean(env.OPENAI_API_KEY),model:env.OPENAI_QA_MODEL||MODEL},upstreamReady:Boolean(up),stage:{stageKey:STAGE,stageName:stage?.stage_name||"Story Architecture",status:stage?.status||"BLOCKED_UPSTREAM",threshold:Number(stage?.threshold||THRESHOLD),attempt:Number(stage?.attempt||0),blocker:stage?.blocker||null,evidenceSummary:stage?.evidence_summary||""},runs:runs.map((r)=>({id:r.id,status:r.status,score:Number(r.score),attempt:Number(r.attempt),threshold:Number(r.threshold),gates:JSON.parse(String(r.gate_json||"[]")),startedAt:r.started_at,completedAt:r.completed_at})),jobs:jobs.map((j)=>({id:j.id,status:j.status,providerStatus:j.provider_status,startedAt:j.started_at,heartbeatAt:j.heartbeat_at,error:j.error})),artifacts:artifacts.map((a)=>({id:a.id,lifecycleState:a.lifecycle_state,content:JSON.parse(String(a.content_json)),contentHash:a.content_hash,createdAt:a.created_at}))};}

async function start(){const env=await runtime();const db=env.DB!;const up=await upstream(db);if(!up.stage||!["READY","REPAIR_REQUIRED"].includes(up.stage.status))throw new Error("Story Architecture is not ready");if(up.stage.attempt>=3)throw new Error("Stage 05 exhausted three automatic attempts and requires senior review");const active=await db.prepare("SELECT id FROM v7_story_jobs WHERE program_id=? AND status='ACTIVE' LIMIT 1").bind(PROGRAM_ID).first();if(active)return snapshot();const prompt=`You are a senior documentary story room creating the production-binding Story Architecture for a maximum-quality US-English faceless YouTube documentary. Use only the frozen Creative Contract below. Do not add factual claims or change its runtime, audience promise, thesis, visual engine, sound engine, prohibitions or evidence IDs. Build exactly three acts and 12–18 continuous editorial beats spanning 0 to ${up.runtime} seconds with zero gaps or overlaps. The opening hook must resolve within 20 seconds, a midpoint re-hook must fall within 40–60% of runtime, and the final promise payoff must fall within the last 20%. Every beat must change viewer understanding, cite at least one allowed evidence claim ID, define distinct visual grammar and narrative sound function, and carry two executable acceptance tests. Cover every contracted claim ID at least once. Avoid list-like exposition, repeated visual templates, decorative stock, generic diagrams, unsupported numbers and summary-only endings. Seven independent critics score on a 0–100 scale, never 0–10, and every critic must reach 90. Resolve every adversarial risk. Return only JSON.\n\nFROZEN CREATIVE CONTRACT:\n${JSON.stringify(up.content)}`;const provider=await startProvider(env,prompt);const attempt=up.stage.attempt+1;const runId=`${PROGRAM_ID}-STORY-${Date.now()}`;const jobId=`${runId}-JOB`;const now=new Date().toISOString();await db.batch([db.prepare("INSERT INTO v7_story_runs (id,program_id,attempt,status,score,threshold,model_id,gate_json,started_at) VALUES (?,?,?,'RUNNING',0,?,?,'[]',?)").bind(runId,PROGRAM_ID,attempt,THRESHOLD,env.OPENAI_QA_MODEL||MODEL,now),db.prepare("INSERT INTO v7_story_jobs (id,program_id,run_id,provider_response_id,provider_status,status,heartbeat_at,started_at) VALUES (?,?,?,?,?,'ACTIVE',?,?)").bind(jobId,PROGRAM_ID,runId,provider.id,provider.status,now,now),db.prepare("UPDATE v7_stage_states SET status='RUNNING',attempt=?,blocker=null,evidence_summary='Story room active · background execution is resumable',updated_at=? WHERE id=?").bind(attempt,now,`${PROGRAM_ID}-STAGE-${STAGE}`)]);return snapshot();}

async function fail(db:Database,runId:string,jobId:string,message:string){const now=new Date().toISOString();await db.batch([db.prepare("UPDATE v7_story_jobs SET status='FAILED',provider_status='failed',heartbeat_at=?,finalized_at=?,error=? WHERE id=?").bind(now,now,message,jobId),db.prepare("UPDATE v7_story_runs SET status='FAILED',gate_json=?,completed_at=? WHERE id=?").bind(JSON.stringify([{id:"EXECUTION",label:"Execution integrity",status:"FAIL",evidence:message}]),now,runId),db.prepare("UPDATE v7_stage_states SET status='REPAIR_REQUIRED',blocker=?,evidence_summary='No Story Architecture frozen',updated_at=? WHERE id=?").bind(message,now,`${PROGRAM_ID}-STAGE-${STAGE}`)]);}

async function finalize(env:Runtime,runId:string,jobId:string,payload:Record<string,unknown>){const db=env.DB!;const now=new Date().toISOString();const up=await upstream(db);const artifact=normalizeCritics(JSON.parse(textOutput(payload)) as Record<string,unknown>);const review=evaluate(artifact,up.validClaims,up.runtime);const envelope=JSON.stringify({pipelineVersion:7,stage:STAGE,generatedAt:now,artifact},null,2);const hash=await digest(envelope);const artifactId=`${runId}-ARTIFACT`;const runtimeKey=`v7/story/${artifactId}.json`;if(!env.BUCKET)throw new Error("Runtime object storage is unavailable");await env.BUCKET.put(runtimeKey,envelope,{httpMetadata:{contentType:"application/json"},customMetadata:{pipelineVersion:"7",stage:STAGE,contentHash:hash}});if(!(await env.BUCKET.head(runtimeKey)))throw new Error("Story artifact read-back failed");const drive=await storeDriveJsonArtifact({folderPath:["Channels","Hidden Systems","Projects","V7 Greenfield Pilot","Story Architecture"],fileName:`05-story-architecture-${runId.slice(-13)}.json`,content:envelope,artifactId,contentHash:hash});const state=review.passed?"FROZEN":"REPAIR_REQUIRED";await db.batch([db.prepare("INSERT INTO v7_story_artifacts (id,program_id,run_id,lifecycle_state,content_json,content_hash,runtime_key,drive_file_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(artifactId,PROGRAM_ID,runId,state,JSON.stringify(artifact),hash,runtimeKey,drive.id,now,now),db.prepare("UPDATE v7_story_runs SET status=?,score=?,gate_json=?,completed_at=? WHERE id=?").bind(review.passed?"PASS":"REPAIR_REQUIRED",review.score,JSON.stringify(review.gates),now,runId),db.prepare("UPDATE v7_story_jobs SET status='COMPLETED',provider_status='completed',heartbeat_at=?,finalized_at=?,error=null WHERE id=?").bind(now,now,jobId),db.prepare("UPDATE v7_stage_states SET status=?,artifact_id=?,blocker=?,evidence_summary=?,frozen_at=?,updated_at=? WHERE id=?").bind(state,artifactId,review.passed?null:"One or more Story Architecture hard gates failed",`${review.score}/100 · critic floor ${review.criticFloor} · R2 and Drive verified`,review.passed?now:null,now,`${PROGRAM_ID}-STAGE-${STAGE}`),db.prepare("INSERT INTO v7_evidence_lineage (id,program_id,entity_type,title,lifecycle_state,upstream_evidence_id,artifact_key,content_hash,storage_state,rights_state,cost_state,quarantine_state,pipeline_version,updated_at) VALUES (?,?,?,?,?,?,?,?, 'R2_AND_DRIVE_VERIFIED','INTERNAL_ORIGINAL','MEASURED','CLEAR',7,?)").bind(`${artifactId}-EVIDENCE`,PROGRAM_ID,"STORY_ARCHITECTURE","Stage 05 Story Architecture",state,`${String(up.creative.id)}-EVIDENCE`,runtimeKey,hash,now)]);await recordOpenAIUsage({db,programId:PROGRAM_ID,runId,stageKey:STAGE,costType:"STORY_ARCHITECTURE",payload,fallbackModel:MODEL});if(review.passed)await db.batch([db.prepare("UPDATE v7_stage_states SET status='READY',blocker=null,evidence_summary='Stage 05 frozen; Script Development authorized',updated_at=? WHERE id=? AND status='BLOCKED_UPSTREAM'").bind(now,`${PROGRAM_ID}-STAGE-06`),db.prepare("UPDATE v7_program_contracts SET status='STAGE_05_FROZEN',updated_at=? WHERE id=?").bind(now,PROGRAM_ID)]);}

async function poll(){const env=await runtime();const db=env.DB!;const job=await db.prepare("SELECT id,run_id,provider_response_id FROM v7_story_jobs WHERE program_id=? AND status='ACTIVE' ORDER BY started_at DESC LIMIT 1").bind(PROGRAM_ID).first<{id:string;run_id:string;provider_response_id:string}>();if(!job)return snapshot();const payload=await retrieveProvider(env,job.provider_response_id);const status=String(payload.status||"unknown");const now=new Date().toISOString();await db.prepare("UPDATE v7_story_jobs SET provider_status=?,heartbeat_at=? WHERE id=?").bind(status,now,job.id).run();if(["queued","in_progress"].includes(status))return await snapshot();if(status!=="completed"){await recordOpenAIUsage({db,programId:PROGRAM_ID,runId:job.run_id,stageKey:STAGE,costType:"STORY_ARCHITECTURE",payload,fallbackModel:MODEL});await fail(db,job.run_id,job.id,`Provider ended with status ${status}`);return await snapshot();}try{await finalize(env,job.run_id,job.id,payload);return await snapshot();}catch(error){const message=error instanceof Error?error.message:"Story Architecture finalization failed";await fail(db,job.run_id,job.id,message);throw error;}}

export async function GET(){try{return Response.json(await snapshot());}catch(error){return Response.json({error:error instanceof Error?error.message:"Story Architecture could not load"},{status:500});}}
export async function POST(request: Request) {
  const authorization = await authorizeStoryOwnerWrite(request);
  if (authorization instanceof Response) return authorization;
  const actorFailure = requireStoryOwnerAuthority(authorization.actorType);
  if (actorFailure) return actorFailure;
  const command = await readStoryOwnerCommand(request);
  if (command instanceof Response) return command;
  const binding = await bindStoryOwnerResource(authorization.db);
  if (binding instanceof Response) return binding;
  const entitlement = await authorizeStoryOwnerEntitlement(authorization.db, authorization.env, command, binding);
  if (entitlement instanceof Response) return entitlement;
  const identity = await storyOwnerAuditIdentity(request, authorization.normalizedEmail, command);
  const replay = await lookupStoryOwnerReplay(authorization.db, identity);
  if (replay) return replay;
  return runAuditedStoryOwnerCommand(
    authorization.db,
    identity,
    command,
    () => executeStoryOwnerCommand(command, entitlement),
  );
}
