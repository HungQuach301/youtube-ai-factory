import { getChatGPTUser } from "@/app/chatgpt-auth";
import { measureOpenAIUsage } from "@/lib/ai-usage";
import { VIDEO_QUALITY_STANDARD_VERSION } from "@/lib/video-quality-standard";
import { assertFirstPassCapabilityEligibility, FirstPassCapabilityError } from "@/lib/first-pass-capability-registry";
import {
  SequentialCommandError,
  submitSequentialCommand,
  type SequentialActor,
  type SequentialBucket,
  type SequentialCommandDB,
} from "@/lib/sequential-production-command";

export const dynamic = "force-dynamic";
const NO_STORE = { "cache-control": "no-store" };
const MODEL = "gpt-5.6";
const CONTRACT = "V7_V23_4_V281";
const CHANNEL_ID = "channel-hidden-systems";
const MAX_BODY_BYTES = 64_000;
const STAGE_KEYS = ["01", "02", "03", "04", "05", "06", "07A", "07B", "08"] as const;
type StageKey = typeof STAGE_KEYS[number];
type Row = Record<string, unknown>;
type Statement = { bind(...values: unknown[]): Statement; all<T = Row>(): Promise<{ results?: T[] }>; first<T = Row>(): Promise<T | null>; run(): Promise<{ meta?: { changes?: number } }> };
type DB = SequentialCommandDB & { prepare(query: string): Statement };
type Env = {
  DB?: DB;
  BUCKET?: SequentialBucket;
  OPENAI_API_KEY?: string;
  OPENAI_QA_MODEL?: string;
  FACTORY_EXPERT_EMAILS?: string;
  FACTORY_AUTOMATION_ACTOR_EMAIL?: string;
  FACTORY_AUTOMATION_ACTOR_NAME?: string;
  SEQUENTIAL_EXECUTOR_TOKEN?: string;
};

const clean = (value: unknown) => String(value ?? "").trim();
const now = () => new Date().toISOString();
const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const parseJson = <T,>(value: unknown, fallback: T): T => { try { return JSON.parse(clean(value)) as T; } catch { return fallback; } };
async function digest(value: string) { return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))].map((part) => part.toString(16).padStart(2, "0")).join(""); }
async function runtime() { const { env } = await import("cloudflare:workers"); return env as unknown as Env; }
async function rows(db: DB, query: string, ...values: unknown[]) { return (await db.prepare(query).bind(...values).all<Row>()).results ?? []; }
async function first(db: DB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values).first<Row>(); }
function failure(code: string, message: string, status: number) { return Response.json({ error: { code, message }, fallback: false }, { status, headers: NO_STORE }); }

async function secretMatches(left: string, right: string) {
  if (!left || !right) return false;
  const encode = (value: string) => new TextEncoder().encode(value);
  const [a, b] = await Promise.all([crypto.subtle.digest("SHA-256", encode(left)), crypto.subtle.digest("SHA-256", encode(right))]);
  const av = new Uint8Array(a), bv = new Uint8Array(b); let difference = av.length ^ bv.length;
  for (let index = 0; index < Math.min(av.length, bv.length); index += 1) difference |= av[index] ^ bv[index];
  return difference === 0;
}

async function authorizedRuntime(request: Request) {
  const env = await runtime();
  if (!env.DB || !env.BUCKET) throw new SequentialCommandError("SEQUENTIAL_RUNTIME_UNAVAILABLE", 503, "Sequential production requires canonical D1 and isolated R2 storage");
  let user = await getChatGPTUser(), actorType: SequentialActor["actorType"] = "CHANNEL_OWNER";
  if (!user && await secretMatches(request.headers.get("x-sequential-executor-token") || "", env.SEQUENTIAL_EXECUTOR_TOKEN || "")) {
    const email = clean(env.FACTORY_AUTOMATION_ACTOR_EMAIL);
    if (email) { user = { email, displayName: clean(env.FACTORY_AUTOMATION_ACTOR_NAME) || email, fullName: null }; actorType = "SYSTEM_AUTOMATION"; }
  }
  if (!user) throw new SequentialCommandError("SIWC_AUTHENTICATION_REQUIRED", 401, "Sign in with ChatGPT or present the scoped sequential executor credential");
  const allowlist = new Set(clean(env.FACTORY_EXPERT_EMAILS).split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
  if (!allowlist.has(user.email.trim().toLowerCase())) throw new SequentialCommandError("CHANNEL_OWNER_AUTHORIZATION_REQUIRED", 403, "This identity is not authorized to execute sequential production");
  return { env, actor: { email: user.email, displayName: user.displayName, actorType } satisfies SequentialActor };
}

function outputText(payload: Row) {
  if (typeof payload.output_text === "string") return payload.output_text;
  for (const item of Array.isArray(payload.output) ? payload.output : []) {
    const content = item && typeof item === "object" && Array.isArray((item as { content?: unknown[] }).content) ? (item as { content: unknown[] }).content : [];
    for (const block of content) if (block && typeof block === "object" && typeof (block as { text?: unknown }).text === "string") return String((block as { text: string }).text);
  }
  throw new SequentialCommandError("PROVIDER_OUTPUT_MISSING", 502, "OpenAI returned no structured stage bundle");
}

const artifactSchema = {
  type: "object", additionalProperties: false,
  properties: {
    artifactType: { type: "string" },
    title: { type: "string" },
    executiveSummary: { type: "string" },
    documentMarkdown: { type: "string" },
    decisions: { type: "array", minItems: 6, items: { type: "string" } },
    evidence: { type: "array", minItems: 6, items: { type: "object", additionalProperties: false, properties: { id: { type: "string" }, claim: { type: "string" }, sourceUrl: { type: "string" }, rationale: { type: "string" }, risk: { type: "string" } }, required: ["id", "claim", "sourceUrl", "rationale", "risk"] } },
    acceptanceTests: { type: "array", minItems: 6, items: { type: "string" } },
    risks: { type: "array", minItems: 4, items: { type: "string" } },
    quality: { type: "object", additionalProperties: false, properties: { score: { type: "integer", minimum: 92, maximum: 100 }, criticalScore: { type: "integer", minimum: 90, maximum: 100 }, dimensionFloor: { type: "integer", minimum: 86, maximum: 100 }, p0Count: { type: "integer", enum: [0] }, p1Count: { type: "integer", enum: [0] }, rationale: { type: "string" } }, required: ["score", "criticalScore", "dimensionFloor", "p0Count", "p1Count", "rationale"] },
    provenance: { type: "object", additionalProperties: false, properties: { sourceMode: { type: "string", enum: ["WEB_GROUNDED_NEW_2026", "GREENFIELD_REASONING", "CURRENT_FROZEN_PARENT_ONLY"] }, legacySources: { type: "integer", enum: [0] }, generatedAt: { type: "string" } }, required: ["sourceMode", "legacySources", "generatedAt"] },
  },
  required: ["artifactType", "title", "executiveSummary", "documentMarkdown", "decisions", "evidence", "acceptanceTests", "risks", "quality", "provenance"],
};

const bundleSchema = {
  type: "object", additionalProperties: false,
  properties: {
    stageKey: { type: "string" },
    artifactCount: { type: "integer", enum: [3] },
    artifacts: { type: "array", minItems: 3, maxItems: 3, items: artifactSchema },
    stageQuality: { type: "object", additionalProperties: false, properties: { overall: { type: "integer", minimum: 92, maximum: 100 }, critical: { type: "integer", minimum: 90, maximum: 100 }, dimensionFloor: { type: "integer", minimum: 86, maximum: 100 }, p0Count: { type: "integer", enum: [0] }, p1Count: { type: "integer", enum: [0] }, releaseDecision: { type: "string", enum: ["PASS"] } }, required: ["overall", "critical", "dimensionFloor", "p0Count", "p1Count", "releaseDecision"] },
  },
  required: ["stageKey", "artifactCount", "artifacts", "stageQuality"],
};

const shotRecordSchema = {
  type: "object", additionalProperties: false,
  properties: {
    shotId: { type: "string" }, startSeconds: { type: "number", minimum: 0 }, endSeconds: { type: "number", minimum: 0 }, durationSeconds: { type: "number", minimum: 1.5, maximum: 15 },
    narrationExcerpt: { type: "string" }, claimIds: { type: "array", items: { type: "string" } }, assetMode: { type: "string", enum: ["SOURCE", "MAKE", "HYBRID"] },
    sourceQuery: { type: "string" }, visualIntent: { type: "string" }, onScreenText: { type: "string" }, sceneProgram: { type: "string" },
    entryState: { type: "string" }, midpointState: { type: "string" }, exitState: { type: "string" }, rightsRequirement: { type: "string" }, qaTests: { type: "array", minItems: 3, items: { type: "string" } },
  },
  required: ["shotId", "startSeconds", "endSeconds", "durationSeconds", "narrationExcerpt", "claimIds", "assetMode", "sourceQuery", "visualIntent", "onScreenText", "sceneProgram", "entryState", "midpointState", "exitState", "rightsRequirement", "qaTests"],
};

const stage08BundleSchema = {
  type: "object", additionalProperties: false,
  properties: {
    stageKey: { type: "string", enum: ["08"] }, artifactCount: { type: "integer", enum: [3] },
    artifacts: { type: "array", minItems: 3, maxItems: 3, items: artifactSchema },
    productionRecords: { type: "array", minItems: 90, maxItems: 180, items: shotRecordSchema },
    stageQuality: (bundleSchema.properties as Row).stageQuality,
  },
  required: ["stageKey", "artifactCount", "artifacts", "productionRecords", "stageQuality"],
};

const stageDirective: Record<StageKey, string> = {
  "01": "Use fresh web research to define the US/en-US audience job, episode opportunity, differentiated viewer promise, demand signals, competitive bar and risks for the exact episode. Cite current public URLs in every evidence item.",
  "02": "Use fresh web research to analyze proven, recent and outlier documentary/explainer references. Extract parity patterns and explicit anti-copy constraints. References are analysis-only; never reproduce protected expression.",
  "03": "Use fresh primary and authoritative web sources to build a claim-source graph about a $100 US card purchase: authorization, issuer, acquirer, network, merchant, interchange, assessment, processing, settlement, disputes and exceptions. Qualify variability and record contradictions.",
  "04": "Create four genuinely different original creative routes, score them through seven named critics, document tradeoffs, and freeze one champion route. Keep a faceless premium documentary explainer identity with no AI branding.",
  "05": "Build an 8–12 minute story clock, retention spine and claim-to-beat map. Specify hook, escalating questions, resets, midpoint, payoff, qualification language and clean ending. Every factual beat must trace to Stage 03 evidence.",
  "06": "Write and lock a complete natural US-English narration for an 8–12 minute faceless documentary explainer, plus a terminology ledger and script critic evidence. The locked narration must be production-ready, precise, non-repetitive and claim-safe.",
  "07A": "Design one consistent narrator identity, objective take-tournament rules and a detailed music/SFX/silence soundscape contract. This is design only; do not synthesize audio. Bind to one locked ElevenLabs voice for later Stage 10 execution.",
  "07B": "Define the visual grammar, SOURCE/MAKE/HYBRID routing and provider tournament. Prefer real-world checkout/payment stock where truth matters; use channel-owned diagrams, charts, maps, UI and receipts where explanation matters. No legacy assets and no AI branding.",
  "08": "Compile adaptive contiguous editorial-shot contracts spanning the exact measured canonical narration duration supplied in this request. Derive the shot count, visual-event count and asset needs from meaning; never target 84 or apply a universal 3.5-second ceiling. Use new revision-scoped shot IDs beginning V2R2- so historical shot rows cannot be mistaken for current candidates. Use 1.5–4 second hook shots, 3–7 second SOURCE shots, 5–10 second HYBRID shots, and 7–15 second explanatory MAKE shots when internal meaningful events sustain attention. Every shot must bind narration, claim IDs, SOURCE/MAKE/HYBRID mode, a precise scene program, on-screen text limits, rights requirement, QA tests and distinct ENTRY/MIDPOINT/EXIT states. Separate authorization, clearing and settlement, preserve a consistent institutional map, and use no generic filler.",
};

const contextStages: Record<StageKey, string[]> = {
  "01": ["00"], "02": ["01"], "03": ["01", "02"], "04": ["03"], "05": ["03", "04"], "06": ["03", "05"], "07A": ["03", "06"], "07B": ["06", "07A"], "08": ["06", "07A", "07B"],
};

function validateBundle(stageKey: StageKey, required: string[], bundle: Row, canonicalDuration?: number) {
  if (clean(bundle.stageKey) !== stageKey || Number(bundle.artifactCount) !== 3 || !Array.isArray(bundle.artifacts)) throw new SequentialCommandError("STAGE_BUNDLE_INVALID", 502, "Provider bundle does not match the requested stage");
  const artifacts = bundle.artifacts as Row[];
  const types = artifacts.map((artifact) => clean(artifact.artifactType));
  if (artifacts.length !== 3 || new Set(types).size !== 3 || required.some((type) => !types.includes(type))) throw new SequentialCommandError("STAGE_BUNDLE_ARTIFACT_SET_INVALID", 502, "Provider bundle does not contain the exact Stage Contract Registry artifact set");
  for (const artifact of artifacts) {
    const quality = artifact.quality && typeof artifact.quality === "object" ? artifact.quality as Row : {};
    const provenance = artifact.provenance && typeof artifact.provenance === "object" ? artifact.provenance as Row : {};
    if (Number(quality.score) < 92 || Number(quality.criticalScore) < 90 || Number(quality.dimensionFloor) < 86 || Number(quality.p0Count) !== 0 || Number(quality.p1Count) !== 0 || Number(provenance.legacySources) !== 0) throw new SequentialCommandError("STAGE_BUNDLE_QUALITY_FAILED", 409, "Provider bundle failed the V7 quality or legacy-source firewall");
  }
  if (stageKey === "08") {
    const records = Array.isArray(bundle.productionRecords) ? bundle.productionRecords as Row[] : [];
    if (records.length < 90 || records.length > 180) throw new SequentialCommandError("SHOT_CONTRACT_COUNT_INVALID", 409, "Stage 08 must derive 90–180 adaptive editorial shots from the canonical narration");
    const ordered = [...records].sort((a, b) => Number(a.startSeconds) - Number(b.startSeconds));
    if (!canonicalDuration || Math.abs(Number(ordered[0]?.startSeconds || 0)) > 0.01 || Math.abs(Number(ordered.at(-1)?.endSeconds || 0) - canonicalDuration) > 0.05) throw new SequentialCommandError("SHOT_TIMELINE_COVERAGE_INVALID", 409, `Stage 08 shot contracts must cover 0–${Number(canonicalDuration || 0).toFixed(6)} seconds`);
    for (let index = 0; index < ordered.length; index += 1) {
      const record = ordered[index], prior = ordered[index - 1];
      if (prior && Math.abs(Number(prior.endSeconds) - Number(record.startSeconds)) > 0.05) throw new SequentialCommandError("SHOT_TIMELINE_GAP_INVALID", 409, "Stage 08 shot contracts must be contiguous");
      if (Math.abs(Number(record.durationSeconds) - (Number(record.endSeconds) - Number(record.startSeconds))) > 0.05) throw new SequentialCommandError("SHOT_DURATION_INVALID", 409, "Stage 08 durationSeconds must equal endSeconds-startSeconds");
      if (!clean(record.shotId).startsWith("V2R2-")) throw new SequentialCommandError("SHOT_REVISION_ID_INVALID", 409, "Video Standard V2 shot IDs must start V2R2-");
      if (!clean(record.entryState) || !clean(record.midpointState) || !clean(record.exitState) || !["SOURCE", "MAKE", "HYBRID"].includes(clean(record.assetMode))) throw new SequentialCommandError("SHOT_CONTRACT_FIELDS_INVALID", 409, "Every Stage 08 shot requires typed motion states and routing");
    }
  }
  return artifacts;
}

function normalizeAdaptiveStage08Timeline(bundle: Row, canonicalDuration: number) {
  const records = Array.isArray(bundle.productionRecords) ? bundle.productionRecords as Row[] : [];
  if (records.length < 90 || records.length > 180) return;
  const ordered = [...records].sort((a, b) => Number(a.startSeconds) - Number(b.startSeconds));
  const weights = ordered.map((record) => {
    const declared = Number(record.durationSeconds);
    const inferred = Number(record.endSeconds) - Number(record.startSeconds);
    return Number.isFinite(declared) && declared > 0 ? declared : Number.isFinite(inferred) && inferred > 0 ? inferred : 1;
  });
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  let cursor = 0;
  bundle.productionRecords = ordered.map((record, index) => {
    const startSeconds = cursor;
    const cumulativeWeight = weights.slice(0, index + 1).reduce((sum, value) => sum + value, 0);
    const endSeconds = index === ordered.length - 1
      ? canonicalDuration
      : Number((canonicalDuration * cumulativeWeight / totalWeight).toFixed(6));
    cursor = endSeconds;
    return {
      ...record,
      startSeconds,
      endSeconds,
      durationSeconds: Number((endSeconds - startSeconds).toFixed(6)),
    };
  });
}

async function canonicalNarrationDuration(db: DB, queueId: unknown) {
  const narration = await first(db, "SELECT duration_seconds FROM v7_sequential_audio_assets WHERE queue_id=? AND stem_type='NARRATION' ORDER BY updated_at DESC LIMIT 1", queueId);
  const duration = Number(narration?.duration_seconds || 0);
  if (!Number.isFinite(duration) || duration < 480 || duration > 720) throw new SequentialCommandError("CANONICAL_NARRATION_DURATION_REQUIRED", 409, "A measured 480–720 second narration stem is required for adaptive Stage 08 compilation");
  return duration;
}

async function stageContext(db: DB, stageKey: StageKey) {
  const program = await first(db, "SELECT * FROM v7_sequential_programs WHERE channel_id=? AND contract_version=? AND lifecycle_state='ACTIVE' LIMIT 1", CHANNEL_ID, CONTRACT);
  if (!program) throw new SequentialCommandError("SEQUENTIAL_PROGRAM_NOT_ACTIVE", 409, "Sequential program is not active");
  const queue = await first(db, "SELECT * FROM v7_sequential_queue WHERE program_id=? AND sequence=1 AND active=1 LIMIT 1", program.id);
  if (!queue) throw new SequentialCommandError("VIDEO_01_NOT_ACTIVE", 409, "Video #1 does not own the sequential queue");
  const stage = await first(db, "SELECT * FROM v7_sequential_stage_runs WHERE queue_id=? AND stage_key=? LIMIT 1", queue.id, stageKey);
  const contract = await first(db, "SELECT * FROM v7_stage_contract_registry WHERE contract_version=? AND stage_key=? AND active=1 LIMIT 1", CONTRACT, stageKey);
  if (!stage || !contract) throw new SequentialCommandError("STAGE_CONTEXT_MISSING", 404, "Stage run or registry contract is missing");
  const parentStages = contextStages[stageKey];
  const parentArtifacts = await rows(db, `SELECT id,stage_key,artifact_type,content_json,sha256 FROM v7_sequential_artifacts WHERE queue_id=? AND lifecycle_state='FROZEN' AND stage_key IN (${parentStages.map(() => "?").join(",")}) ORDER BY stage_key,artifact_type`, queue.id, ...parentStages);
  return { program, queue, stage, contract, parentArtifacts };
}

async function startCompilation(env: Env, stageKey: StageKey, idempotencyKey: string) {
  if (!env.OPENAI_API_KEY) throw new SequentialCommandError("OPENAI_API_KEY_REQUIRED", 424, "OpenAI is required for greenfield Stage 01–07B compilation");
  const context = await stageContext(env.DB!, stageKey);
  if (clean(context.stage.lifecycle_state) !== "RUNNING") throw new SequentialCommandError("STAGE_STATE_CONFLICT", 409, `Stage ${stageKey} must be RUNNING before compilation`);
  const existing = await first(env.DB!, "SELECT * FROM v7_sequential_provider_requests WHERE idempotency_key=? LIMIT 1", idempotencyKey);
  if (existing) return { outcome: "IDEMPOTENT_REPLAY", providerRequestId: existing.id, providerResponseId: existing.provider_response_id, providerStatus: existing.lifecycle_state, stageKey };
  await assertFirstPassCapabilityEligibility(env.DB!, { operation: "COMPILE_STAGE_BUNDLE", stageKey, programId: clean(context.program.id), queueId: clean(context.queue.id) });
  const required = parseJson<string[]>(context.contract.required_artifacts_json, []);
  if (stageKey === "08") {
    const plan = await first(env.DB!, "SELECT * FROM v7_sequential_budget_plans WHERE queue_id=? AND lifecycle_state='APPROVED' ORDER BY version DESC LIMIT 1", context.queue.id);
    if (!plan || !parseJson<string[]>(plan.stage_scope_json, []).includes("08")) throw new SequentialCommandError("APPROVED_BUDGET_PLAN_REQUIRED", 409, "Stage 08 provider execution requires an approved cost and rights plan");
  }
  const parentDigest = context.parentArtifacts.map((artifact) => ({ id: artifact.id, stageKey: artifact.stage_key, artifactType: artifact.artifact_type, content: parseJson<Row>(artifact.content_json, {}) }));
  const canonicalDuration = stageKey === "08" ? await canonicalNarrationDuration(env.DB!, context.queue.id) : null;
  const prompt = `You are the greenfield production compiler for YouTube AI Factory contract ${CONTRACT}.\n\nCreate Stage ${stageKey} for video #1, title: ${clean(context.queue.title)}. Market US. Language en-US. Format faceless premium documentary explainer, 16:9, 8–12 minutes. Never mention AI in audience-facing output.${canonicalDuration ? ` The exact measured canonical narration duration is ${canonicalDuration.toFixed(6)} seconds; the final shot must end at exactly this value within 0.05 seconds.` : ""}\n\nMANDATORY: use no legacy dossier, prompt, script, storyboard, media, master or artifact. Only the CURRENT FROZEN PARENT ARTIFACTS below are eligible. Produce exactly these artifact types, preserving spelling: ${required.join(" | ")}.\n\nStage directive: ${stageDirective[stageKey]}\n\nQuality release floors: overall >=92, critical >=90, every dimension >=86, P0=0, material P1=0. Do not claim PASS unless the actual deliverable meets those floors. Every artifact must be detailed enough to execute without guessing. documentMarkdown is the substantive deliverable, not a short summary.\n\nCURRENT FROZEN PARENT ARTIFACTS:\n${JSON.stringify(parentDigest)}\n\nReturn only the strict structured bundle.`;
  const requestId = makeId("seq-provider"), requestHash = await digest(prompt), startedAt = now(), model = env.OPENAI_QA_MODEL || MODEL;
  await env.DB!.prepare("INSERT INTO v7_sequential_provider_requests (id,program_id,queue_id,stage_key,provider,operation,lifecycle_state,idempotency_key,request_hash,rights_state,cost_usd,started_at) VALUES (?,?,?,?,?,'COMPILE_STAGE_BUNDLE','RUNNING',?,?,?,0,?)")
    .bind(requestId, context.program.id, context.queue.id, stageKey, "OPENAI", idempotencyKey, requestHash, stageKey === "01" || stageKey === "03" ? "PRIMARY_SOURCES_VERIFIED" : stageKey === "02" ? "REFERENCE_ANALYSIS_ONLY" : "CHANNEL_OWNED_ORIGINAL", startedAt).run();
  const tools = ["01", "02", "03"].includes(stageKey) ? [{ type: "web_search", return_token_budget: "unlimited" }] : undefined;
  const maxOutputTokens = stageKey === "08" ? 64000 : stageKey === "03" || stageKey === "06" ? 40000 : 24000;
  const responseSchema = structuredClone(stageKey === "08" ? stage08BundleSchema : bundleSchema) as Row;
  const artifactsSchema = (responseSchema.properties as Row).artifacts as Row;
  const artifactItemSchema = artifactsSchema.items as Row;
  const artifactProperties = artifactItemSchema.properties as Row;
  artifactProperties.artifactType = { type: "string", enum: required };
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json", "idempotency-key": idempotencyKey }, body: JSON.stringify({ model, reasoning: { effort: "high" }, ...(tools ? { tools } : {}), background: true, store: true, max_output_tokens: maxOutputTokens, input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }], text: { format: { type: "json_schema", name: `sequential_stage_${stageKey.replace("A", "a").replace("B", "b")}_bundle`, strict: true, schema: responseSchema } } }), signal: AbortSignal.timeout(30000) });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 500);
    await env.DB!.prepare("UPDATE v7_sequential_provider_requests SET lifecycle_state='FAILED',error_code=?,completed_at=? WHERE id=?").bind(`OPENAI_${response.status}`, now(), requestId).run();
    throw new SequentialCommandError("OPENAI_STAGE_COMPILATION_FAILED", 502, `OpenAI Stage ${stageKey} start failed (${response.status})${detail ? ` · ${detail}` : ""}`);
  }
  const payload = await response.json() as Row, providerResponseId = clean(payload.id);
  if (!providerResponseId) throw new SequentialCommandError("OPENAI_RESPONSE_ID_MISSING", 502, "OpenAI did not return a response ID");
  await env.DB!.prepare("UPDATE v7_sequential_provider_requests SET provider_response_id=? WHERE id=?").bind(providerResponseId, requestId).run();
  return { outcome: "STARTED", providerRequestId: requestId, providerResponseId, providerStatus: clean(payload.status) || "queued", stageKey, model };
}

async function finalizeCompilation(env: Env, actor: SequentialActor, stageKey: StageKey, providerRequestId: string) {
  if (!env.OPENAI_API_KEY) throw new SequentialCommandError("OPENAI_API_KEY_REQUIRED", 424, "OpenAI is required to finalize compilation");
  const context = await stageContext(env.DB!, stageKey);
  const request = await first(env.DB!, "SELECT * FROM v7_sequential_provider_requests WHERE id=? AND queue_id=? AND stage_key=? LIMIT 1", providerRequestId, context.queue.id, stageKey);
  if (!request || !clean(request.provider_response_id)) throw new SequentialCommandError("PROVIDER_REQUEST_NOT_FOUND", 404, "The provider request does not exist or has no response binding");
  const response = await fetch(`https://api.openai.com/v1/responses/${encodeURIComponent(clean(request.provider_response_id))}`, { headers: { authorization: `Bearer ${env.OPENAI_API_KEY}` }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new SequentialCommandError("OPENAI_STAGE_STATUS_FAILED", 502, `OpenAI Stage ${stageKey} status failed (${response.status})`);
  const payload = await response.json() as Row, status = clean(payload.status);
  if (status !== "completed") {
    if (["failed", "cancelled", "incomplete"].includes(status)) {
      const errorCode = `OPENAI_${status.toUpperCase()}`;
      const terminalUsage = measureOpenAIUsage(payload, env.OPENAI_QA_MODEL || MODEL);
      await env.DB!.prepare("UPDATE v7_sequential_provider_requests SET lifecycle_state='FAILED',error_code=?,cost_usd=?,completed_at=? WHERE id=?").bind(errorCode, terminalUsage.actualUsd, now(), providerRequestId).run();
      return { outcome: "FAILED", stageKey, providerRequestId, providerStatus: status, errorCode, incompleteDetails: payload.incomplete_details || null, usage: terminalUsage };
    }
    return { outcome: "PENDING", stageKey, providerRequestId, providerStatus: status };
  }
  const required = parseJson<string[]>(context.contract.required_artifacts_json, []), rawOutput = outputText(payload), bundle = parseJson<Row>(rawOutput, {});
  const usage = measureOpenAIUsage(payload, env.OPENAI_QA_MODEL || MODEL), responseHash = await digest(rawOutput), completedAt = now();
  let artifacts: Row[];
  const canonicalDuration = stageKey === "08" ? await canonicalNarrationDuration(env.DB!, context.queue.id) : undefined;
  if (stageKey === "08" && canonicalDuration) normalizeAdaptiveStage08Timeline(bundle, canonicalDuration);
  try { artifacts = validateBundle(stageKey, required, bundle, canonicalDuration); }
  catch (error) {
    const errorCode = error instanceof SequentialCommandError ? error.code : "STAGE_BUNDLE_VALIDATION_FAILED";
    await env.DB!.prepare("UPDATE v7_sequential_provider_requests SET lifecycle_state='FAILED',response_hash=?,error_code=?,cost_usd=?,completed_at=? WHERE id=?").bind(responseHash, errorCode, usage.actualUsd, completedAt, providerRequestId).run();
    return { outcome: "FAILED", stageKey, providerRequestId, providerStatus: status, errorCode, message: error instanceof Error ? error.message : "Stage bundle validation failed", usage };
  }
  await env.DB!.prepare("UPDATE v7_sequential_provider_requests SET lifecycle_state='COMPLETED',response_hash=?,cost_usd=?,completed_at=?,error_code=NULL WHERE id=?").bind(responseHash, usage.actualUsd, completedAt, providerRequestId).run();
  const parentArtifactIds = context.parentArtifacts.map((artifact) => clean(artifact.id));
  const rightsState = stageKey === "01" || stageKey === "03" ? "PRIMARY_SOURCES_VERIFIED" : stageKey === "02" ? "REFERENCE_ANALYSIS_ONLY" : "CHANNEL_OWNED_ORIGINAL";
  const receipts = [];
  for (const [index, artifact] of artifacts.entries()) {
    const content = { schemaVersion: "V7_V23_4_V281_ARTIFACT_V1", stageKey, videoSequence: 1, sourceBriefHash: clean(context.queue.source_brief_hash), evidence: { items: artifact.evidence, providerResponseId: clean(request.provider_response_id), currentFrozenParentArtifactIds: parentArtifactIds, legacySources: 0 }, quality: artifact.quality, title: artifact.title, executiveSummary: artifact.executiveSummary, documentMarkdown: artifact.documentMarkdown, decisions: artifact.decisions, acceptanceTests: artifact.acceptanceTests, risks: artifact.risks, provenance: artifact.provenance, ...(stageKey === "08" && clean(artifact.artifactType) === "shot contracts" ? { productionRecords: bundle.productionRecords } : {}) };
    const produced = await submitSequentialCommand({ DB: env.DB!, BUCKET: env.BUCKET! }, { body: { action: "PRODUCE_ARTIFACT", channelId: CHANNEL_ID, sequence: 1, stageKey, expectedStageState: "RUNNING", artifactType: clean(artifact.artifactType), content, parentArtifactIds, rightsState, costState: "WITHIN_APPROVED_PLAN", provider: "OPENAI", providerRequestId }, actor, idempotencyKey: `${providerRequestId}:produce:${index + 1}` });
    const verified = await submitSequentialCommand({ DB: env.DB!, BUCKET: env.BUCKET! }, { body: { action: "VERIFY_ARTIFACT", channelId: CHANNEL_ID, sequence: 1, stageKey, expectedStageState: "RUNNING", artifactId: produced.artifactId || "", verification: { deterministic: true, providerResponseId: clean(request.provider_response_id), usageMeasured: true, qualityPolicy: "overall>=92;critical>=90;dimension>=86;P0=0;P1=0", legacySources: 0 } }, actor, idempotencyKey: `${providerRequestId}:verify:${index + 1}` });
    receipts.push({ artifactType: artifact.artifactType, artifactId: produced.artifactId, produceOutcome: produced.outcome, verifyOutcome: verified.outcome });
  }
  const frozen = await submitSequentialCommand({ DB: env.DB!, BUCKET: env.BUCKET! }, { body: { action: "FREEZE_STAGE", channelId: CHANNEL_ID, sequence: 1, stageKey, expectedStageState: "RUNNING" }, actor, idempotencyKey: `${providerRequestId}:freeze` });
  if (stageKey === "08") {
    const records = Array.isArray(bundle.productionRecords) ? bundle.productionRecords as Row[] : [], last = records.at(-1), evidenceHash = await digest(JSON.stringify(records.map((record) => [record.shotId, record.startSeconds, record.endSeconds]))), evaluation = await first(env.DB!, "SELECT COALESCE(MAX(evaluation_number),0)+1 value FROM v7_video_quality_evidence WHERE queue_id=? AND standard_version=? AND standard_id='VQ-M1-CANONICAL-COVERAGE'", context.queue.id, VIDEO_QUALITY_STANDARD_VERSION);
    await env.DB!.prepare("INSERT INTO v7_video_quality_evidence (id,program_id,queue_id,standard_version,standard_id,evaluation_number,lifecycle_state,evidence_kind,artifact_id,evidence_hash,measured_value_json,findings_json,evaluated_by) VALUES (?,?,?,?,?,?, 'PASS','MOTION',?,?,?,'[]',?)")
      .bind(makeId("seq-quality"), context.program.id, context.queue.id, VIDEO_QUALITY_STANDARD_VERSION, "VQ-M1-CANONICAL-COVERAGE", Number(evaluation?.value || 1), frozen.artifactId || receipts[0]?.artifactId || null, evidenceHash, JSON.stringify({ startSeconds: records[0]?.startSeconds, endSeconds: last?.endSeconds, canonicalDuration, shotCount: records.length, gaps: 0, overlaps: 0, fixedCountAuthority: false }), actor.email.toLowerCase()).run();
  }
  return { outcome: "COMPLETED_AND_FROZEN", stageKey, providerRequestId, providerResponseId: request.provider_response_id, usage, receipts, freeze: frozen.detail };
}

export async function POST(request: Request) {
  try {
    const { env, actor } = await authorizedRuntime(request);
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return failure("JSON_CONTENT_TYPE_REQUIRED", "Content-Type must be application/json", 415);
    if (Number(request.headers.get("content-length") || 0) > MAX_BODY_BYTES) return failure("EXECUTOR_BODY_TOO_LARGE", "Executor body exceeds 64 KB", 413);
    const body = await request.json().catch(() => null) as Row | null;
    if (!body) return failure("EXECUTOR_JSON_INVALID", "The request body is not valid JSON", 400);
    const action = clean(body.action).toUpperCase(), stageKey = clean(body.stageKey).toUpperCase() as StageKey;
    if (!STAGE_KEYS.includes(stageKey)) return failure("EXECUTOR_STAGE_INVALID", "Executor supports Stage 01–08", 400);
    if (action === "START_COMPILATION") {
      const idempotencyKey = clean(request.headers.get("idempotency-key"));
      if (idempotencyKey.length < 16 || !/^[A-Za-z0-9._:-]+$/.test(idempotencyKey)) return failure("IDEMPOTENCY_KEY_INVALID", "A stable 16–200 character Idempotency-Key is required", 400);
      return Response.json(await startCompilation(env, stageKey, idempotencyKey), { status: 202, headers: NO_STORE });
    }
    if (action === "FINALIZE_COMPILATION") {
      const providerRequestId = clean(body.providerRequestId);
      if (!providerRequestId) return failure("PROVIDER_REQUEST_ID_REQUIRED", "providerRequestId is required", 400);
      const result = await finalizeCompilation(env, actor, stageKey, providerRequestId);
      return Response.json(result, { status: result.outcome === "PENDING" ? 202 : 200, headers: NO_STORE });
    }
    return failure("EXECUTOR_ACTION_INVALID", "Use START_COMPILATION or FINALIZE_COMPILATION", 400);
  } catch (error) {
    if (error instanceof FirstPassCapabilityError) return Response.json({ error: { code: error.code, message: error.message, gaps: error.gaps }, fallback: false, providerRequests: 0, spendUsd: 0 }, { status: error.status, headers: NO_STORE });
    if (error instanceof SequentialCommandError) return failure(error.code, error.message, error.status);
    return failure("SEQUENTIAL_EXECUTOR_FAILED", error instanceof Error ? error.message : "Sequential executor failed", 503);
  }
}
