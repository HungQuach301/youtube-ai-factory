import { getChatGPTUser } from "@/app/chatgpt-auth";
import { measureOpenAIUsage } from "@/lib/ai-usage";
import { canonicalHash } from "@/lib/canonical-json";
import {
  evaluateFactoryQaResult,
  FACTORY_FIRST_QA_MAXIMUM_BATCH,
  FACTORY_FIRST_QA_MAXIMUM_REQUEST_RESERVATION_USD,
  FACTORY_FIRST_QA_POLICY_VERSION,
  isOwnerObservableDefect,
  type FactoryQaResult,
} from "@/lib/evaluation-foundation";

export const dynamic = "force-dynamic";
const NO_STORE = { "cache-control": "no-store" };
const CHANNEL_ID = "channel-hidden-systems";
type Row = Record<string, unknown>;
type RunResult = { meta?: { changes?: number } };
type Statement = { bind(...values: unknown[]): Statement; all<T = Row>(): Promise<{ results?: T[] }>; first<T = Row>(): Promise<T | null>; run(): Promise<RunResult> };
type DB = { prepare(query: string): Statement; batch(statements: Statement[]): Promise<RunResult[]> };
type StoredObject = { arrayBuffer(): Promise<ArrayBuffer>; size?: number };
type Bucket = { get(key: string): Promise<StoredObject | null> };
type Env = { DB?: DB; BUCKET?: Bucket; OPENAI_API_KEY?: string; OPENAI_QA_MODEL?: string; FACTORY_QA_EXECUTOR_TOKEN?: string; FACTORY_EXPERT_EMAILS?: string; FACTORY_AUTOMATION_ACTOR_EMAIL?: string; FACTORY_AUTOMATION_ACTOR_NAME?: string };

class FactoryQaError extends Error { constructor(public code: string, public status: number, message: string) { super(message); } }
const clean = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const now = () => new Date().toISOString();
const json = <T,>(value: unknown, fallback: T): T => { try { return JSON.parse(clean(value)) as T; } catch { return fallback; } };
async function runtime() { const { env } = await import("cloudflare:workers"); return env as unknown as Env; }
async function first(db: DB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values).first<Row>(); }
async function rows(db: DB, query: string, ...values: unknown[]) { return (await db.prepare(query).bind(...values).all<Row>()).results ?? []; }
async function run(db: DB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values.map((value) => value === undefined ? null : value)).run(); }
async function sha256(value: string | Uint8Array) { const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value; const input = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer; return [...new Uint8Array(await crypto.subtle.digest("SHA-256", input))].map((part) => part.toString(16).padStart(2, "0")).join(""); }
function base64(bytes: Uint8Array) { let binary = ""; for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000)); return btoa(binary); }
function outputText(payload: Row) { if (typeof payload.output_text === "string") return payload.output_text; for (const item of Array.isArray(payload.output) ? payload.output : []) { const content = item && typeof item === "object" && Array.isArray((item as { content?: unknown[] }).content) ? (item as { content: unknown[] }).content : []; for (const block of content) if (block && typeof block === "object" && typeof (block as { text?: unknown }).text === "string") return String((block as { text: string }).text); } return ""; }
async function secretMatches(left: string, right: string) { if (!left || !right) return false; const encode = (value: string) => new TextEncoder().encode(value), [a, b] = await Promise.all([crypto.subtle.digest("SHA-256", encode(left)), crypto.subtle.digest("SHA-256", encode(right))]); const av = new Uint8Array(a), bv = new Uint8Array(b); let difference = av.length ^ bv.length; for (let index = 0; index < Math.min(av.length, bv.length); index += 1) difference |= av[index] ^ bv[index]; return difference === 0; }

async function authorized(request: Request) {
  const env = await runtime();
  if (!env.DB || !env.BUCKET) throw new FactoryQaError("FACTORY_QA_RUNTIME_UNAVAILABLE", 503, "Canonical D1 and R2 are required");
  let user = await getChatGPTUser();
  if (!user && await secretMatches(request.headers.get("x-factory-qa-executor-token") || "", env.FACTORY_QA_EXECUTOR_TOKEN || "")) {
    const email = clean(env.FACTORY_AUTOMATION_ACTOR_EMAIL);
    if (email) user = { email, displayName: clean(env.FACTORY_AUTOMATION_ACTOR_NAME) || email, fullName: null };
  }
  if (!user) throw new FactoryQaError("FACTORY_QA_AUTHENTICATION_REQUIRED", 401, "Owner or scoped Factory QA authentication is required");
  const allowlist = new Set(clean(env.FACTORY_EXPERT_EMAILS).split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
  if (!allowlist.has(user.email.toLowerCase())) throw new FactoryQaError("FACTORY_QA_AUTHORIZATION_REQUIRED", 403, "This identity cannot run Factory QA");
  return { env: env as Required<Pick<Env, "DB" | "BUCKET">> & Env, actor: user.email.toLowerCase() };
}

async function status(db: DB) {
  const [registry, taskSummary, receiptSummary, runSummary] = await Promise.all([
    first(db, "SELECT * FROM v7_evaluation_factory_qa_registry WHERE channel_id=? AND policy_version=?", CHANNEL_ID, FACTORY_FIRST_QA_POLICY_VERSION),
    first(db, `SELECT COUNT(*) tasks,
      COALESCE(SUM(CASE WHEN task_class='OWNER_ANCHOR' THEN 1 ELSE 0 END),0) anchors,
      COALESCE(SUM(CASE WHEN NOT EXISTS (SELECT 1 FROM v7_evaluation_factory_qa_receipts r WHERE r.task_id=t.id) THEN 1 ELSE 0 END),0) pending
      FROM v7_evaluation_factory_qa_tasks t WHERE channel_id=?`, CHANNEL_ID),
    first(db, `SELECT COUNT(*) receipts,COALESCE(SUM(provider_requests),0) provider_requests,COALESCE(SUM(spend_usd),0) spend_usd,
      COALESCE(SUM(CASE WHEN decision_state='LIKELY_DEFECT_PRESENT' THEN 1 ELSE 0 END),0) likely_defect,
      COALESCE(SUM(CASE WHEN decision_state='LIKELY_CLEAN' THEN 1 ELSE 0 END),0) likely_clean,
      COALESCE(SUM(CASE WHEN owner_attention_state IN ('OWNER_REQUIRED','OWNER_EXCEPTION') THEN 1 ELSE 0 END),0) owner_attention,
      COALESCE(SUM(CASE WHEN review_surface='BROWSER_REQUIRED' THEN 1 ELSE 0 END),0) browser_required
      FROM v7_evaluation_factory_qa_receipts WHERE channel_id=?`, CHANNEL_ID),
    first(db, "SELECT COUNT(*) runs,COALESCE(SUM(CASE WHEN lifecycle_state='CALIBRATION_PASS' THEN 1 ELSE 0 END),0) calibration_pass FROM v7_evaluation_factory_qa_runs WHERE channel_id=?", CHANNEL_ID),
  ]);
  return {
    policyVersion: FACTORY_FIRST_QA_POLICY_VERSION,
    lifecycleState: clean(registry?.lifecycle_state),
    ownerAttentionPolicy: clean(registry?.owner_attention_policy),
    tasks: number(taskSummary?.tasks), anchors: number(taskSummary?.anchors), pending: number(taskSummary?.pending),
    receipts: number(receiptSummary?.receipts), likelyDefect: number(receiptSummary?.likely_defect), likelyClean: number(receiptSummary?.likely_clean),
    ownerAttention: number(receiptSummary?.owner_attention), browserRequired: number(receiptSummary?.browser_required),
    runs: number(runSummary?.runs), calibrationPassRuns: number(runSummary?.calibration_pass),
    providerRequests: number(receiptSummary?.provider_requests), spendUsd: number(receiptSummary?.spend_usd),
    requestCeiling: number(registry?.provider_request_ceiling), spendCeilingUsd: number(registry?.spend_ceiling_usd),
  };
}

function observableTaxonomy(taxonomy: Row[], task: Row) {
  return taxonomy.filter((item) => isOwnerObservableDefect({ defectModality: clean(item.modality), candidateKind: clean(task.candidate_kind), mimeType: clean(task.mime_type) }));
}

async function inspectImage(env: Required<Pick<Env, "DB" | "BUCKET">> & Env, task: Row, taxonomy: Row[]) {
  if (!env.OPENAI_API_KEY) throw new FactoryQaError("OPENAI_API_KEY_REQUIRED", 424, "OpenAI vision is required for Factory QA");
  const object = await env.BUCKET.get(clean(task.storage_key));
  if (!object) throw new FactoryQaError("FACTORY_QA_ARTIFACT_MISSING", 404, "The exact Factory QA artifact is missing");
  const bytes = new Uint8Array(await object.arrayBuffer());
  const computedHash = await sha256(bytes);
  if (computedHash !== clean(task.exact_artifact_hash).toLowerCase()) throw new FactoryQaError("FACTORY_QA_ARTIFACT_HASH_MISMATCH", 409, "R2 bytes no longer match the QA task");
  const allowed = observableTaxonomy(taxonomy, task).map((item) => ({ defectKey: clean(item.defect_key), label: clean(item.label), severity: clean(item.severity), description: clean(item.description) }));
  if (!allowed.length) throw new FactoryQaError("FACTORY_QA_OBSERVABLE_TAXONOMY_EMPTY", 409, "No observable defect applies to this artifact");
  const prompt = `You are an independent first-pass Factory QA reviewer for a US faceless financial explainer. Judge only evidence visible in the exact pixels. Do not pretend this is an owner decision and do not infer rights or hidden lineage. Candidate kind: ${clean(task.candidate_kind)}. Artifact type: ${clean(task.artifact_type)}. MIME: ${clean(task.mime_type)}. A SHOT image is an intermediate visual, so missing voice is not itself a defect. For a still SHOT, mark NEAR_STATIC_MOTION PRESENT only when the slide/template composition itself provides no meaningful visual progression and is visibly unsuitable as production motion material. Treat prompts, QA labels, URLs, filenames, debug text and phrases such as "evidence-bound production proof" as PRODUCTION_RESIDUE. Assess every allowed defect exactly once. Use UNCERTAIN when pixels cannot prove the issue. Allowed taxonomy: ${JSON.stringify(allowed)}.`;
  const schema = {
    type: "object", additionalProperties: false,
    properties: {
      decisionState: { type: "string", enum: ["LIKELY_DEFECT_PRESENT", "LIKELY_CLEAN", "NEEDS_OWNER"] },
      summary: { type: "string" },
      labels: { type: "array", minItems: allowed.length, maxItems: allowed.length, items: { type: "object", additionalProperties: false, properties: {
        defectKey: { type: "string", enum: allowed.map((item) => item.defectKey) }, status: { type: "string", enum: ["PRESENT", "ABSENT", "UNCERTAIN"] }, confidence: { type: "number", minimum: 0, maximum: 1 }, rationale: { type: "string" },
      }, required: ["defectKey", "status", "confidence", "rationale"] } },
    }, required: ["decisionState", "summary", "labels"],
  };
  const model = clean(env.OPENAI_QA_MODEL) || "gpt-5.6";
  const requestIntent = { policyVersion: FACTORY_FIRST_QA_POLICY_VERSION, candidateId: clean(task.candidate_id), exactArtifactHash: computedHash, model, detail: "high", allowed };
  const requestHash = await canonicalHash(requestIntent);
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json", "idempotency-key": `factory-qa:${clean(task.id)}` }, body: JSON.stringify({
    model, reasoning: { effort: "none" }, max_output_tokens: 2000,
    input: [{ role: "user", content: [{ type: "input_text", text: prompt }, { type: "input_image", image_url: `data:${clean(task.mime_type)};base64,${base64(bytes)}`, detail: "high" }] }],
    text: { format: { type: "json_schema", name: "factory_first_qa", strict: true, schema } },
  }), signal: AbortSignal.timeout(180000) });
  if (!response.ok) {
    const failure = await response.json().catch(() => ({})) as Row;
    const providerError = failure.error && typeof failure.error === "object" ? failure.error as Row : {};
    const providerCode = clean(providerError.code || providerError.type).slice(0, 80);
    const providerMessage = clean(providerError.message).replace(/[\r\n]+/g, " ").slice(0, 240);
    throw new FactoryQaError("FACTORY_QA_PROVIDER_FAILED", 502, `OpenAI vision failed (${response.status})${providerCode ? ` [${providerCode}]` : ""}${providerMessage ? `: ${providerMessage}` : ""}`);
  }
  const payload = await response.json() as Row;
  const raw = outputText(payload), result = json<FactoryQaResult>(raw, {});
  const validation = evaluateFactoryQaResult({ result, observableDefectKeys: allowed.map((item) => item.defectKey) });
  if (clean(payload.status) !== "completed" || !validation.eligible) throw new FactoryQaError("FACTORY_QA_PROVIDER_OUTPUT_INVALID", 409, validation.reasons.join("; ") || "Provider output was incomplete");
  const usage = measureOpenAIUsage(payload, model);
  return { result, validation, usage, requestHash, providerResponseId: clean(payload.id), model };
}

async function recordReceipt(db: DB, input: { runId: string; task: Row; taxonomy: Row[]; actor: string; reviewSurface: string; decisionState: string; ownerAttentionState: string; labels: Array<{ defectKey?: string; status?: string; confidence?: number; rationale?: string }>; summary: string; model?: string; providerResponseId?: string; providerRequests: number; spendUsd: number; requestHash: string }) {
  const normalizedLabels = input.labels.map((label) => ({ defectKey: clean(label.defectKey), status: clean(label.status), confidence: number(label.confidence), rationale: clean(label.rationale) })).sort((left, right) => left.defectKey.localeCompare(right.defectKey));
  const evidenceHash = await canonicalHash({ policyVersion: FACTORY_FIRST_QA_POLICY_VERSION, taskId: clean(input.task.id), candidateId: clean(input.task.candidate_id), exactArtifactHash: clean(input.task.exact_artifact_hash), reviewSurface: input.reviewSurface, decisionState: input.decisionState, labels: normalizedLabels, summary: input.summary, model: input.model || null, providerResponseId: input.providerResponseId || null, actor: input.actor });
  const receiptId = id("evaluation-factory-qa-receipt");
  const statements: Statement[] = [db.prepare(`INSERT INTO v7_evaluation_factory_qa_receipts
    (id,channel_id,run_id,task_id,candidate_id,exact_artifact_hash,review_surface,decision_state,owner_attention_state,labels_json,summary,model_id,provider_response_id,provider_requests,spend_usd,request_hash,evidence_hash,actor)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(receiptId, CHANNEL_ID, input.runId, input.task.id, input.task.candidate_id, input.task.exact_artifact_hash, input.reviewSurface, input.decisionState, input.ownerAttentionState, JSON.stringify(normalizedLabels), input.summary, input.model || null, input.providerResponseId || null, input.providerRequests, input.spendUsd, input.requestHash, evidenceHash, input.actor)];
  const taxonomyIds = new Map(input.taxonomy.map((item) => [clean(item.defect_key), clean(item.id)]));
  for (const label of normalizedLabels.filter((item) => ["PRESENT", "ABSENT"].includes(item.status))) statements.push(db.prepare("INSERT INTO v7_evaluation_defect_labels (id,candidate_id,defect_id,label_source,polarity,confidence,evidence_hash,actor) VALUES (?,?,?,?,?,?,?,?)").bind(id("evaluation-defect-label"), input.task.candidate_id, taxonomyIds.get(label.defectKey), "INDEPENDENT_REVIEW", label.status, label.confidence, evidenceHash, input.actor));
  await db.batch(statements);
  const durable = await first(db, "SELECT * FROM v7_evaluation_factory_qa_receipts WHERE id=?", receiptId);
  if (!durable) throw new FactoryQaError("FACTORY_QA_RECEIPT_NOT_DURABLE", 503, "Factory QA receipt read-back failed");
  return durable;
}

async function anchorAgreement(db: DB, candidateId: string, factoryLabels: Array<{ defectKey?: string; status?: string }>, decisionState: string) {
  const owner = await first(db, "SELECT r.* FROM v7_evaluation_owner_label_receipts r WHERE r.candidate_id=? LIMIT 1", candidateId);
  if (!owner) return false;
  const ownerLabels = json<Array<{ defectKey?: string; status?: string }>>(owner.labels_json, []);
  const factory = new Map(factoryLabels.map((item) => [clean(item.defectKey), clean(item.status)]));
  const ownerPresent = ownerLabels.filter((item) => clean(item.status) === "PRESENT").map((item) => clean(item.defectKey));
  return clean(owner.decision_state) === "REJECTED_DEFECT_PRESENT" && decisionState !== "LIKELY_CLEAN" && ownerPresent.length > 0 && ownerPresent.every((key) => factory.get(key) === "PRESENT");
}

export async function GET(request: Request) {
  try { const { env } = await authorized(request); return Response.json(await status(env.DB), { headers: NO_STORE }); }
  catch (error) { return Response.json({ error: { code: error instanceof FactoryQaError ? error.code : "FACTORY_QA_STATUS_UNAVAILABLE", message: error instanceof Error ? error.message : "Factory QA status unavailable" } }, { status: error instanceof FactoryQaError ? error.status : 503, headers: NO_STORE }); }
}

export async function POST(request: Request) {
  try {
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) throw new FactoryQaError("FACTORY_QA_CONTENT_TYPE_REQUIRED", 415, "Use application/json");
    const body = await request.json().catch(() => null) as Row | null;
    const action = clean(body?.action).toUpperCase(), mode = clean(body?.mode).toUpperCase();
    if (action !== "RUN_FACTORY_QA_BATCH" || !["CALIBRATION", "BATCH"].includes(mode)) throw new FactoryQaError("FACTORY_QA_ACTION_INVALID", 400, "Use RUN_FACTORY_QA_BATCH with CALIBRATION or BATCH mode");
    const limit = mode === "CALIBRATION" ? 2 : number(body?.limit || FACTORY_FIRST_QA_MAXIMUM_BATCH);
    if (!Number.isInteger(limit) || limit < 1 || limit > FACTORY_FIRST_QA_MAXIMUM_BATCH) throw new FactoryQaError("FACTORY_QA_BATCH_LIMIT_INVALID", 400, `limit must be 1-${FACTORY_FIRST_QA_MAXIMUM_BATCH}`);
    const idempotencyKey = clean(request.headers.get("idempotency-key"));
    if (idempotencyKey.length < 16 || idempotencyKey.length > 160) throw new FactoryQaError("FACTORY_QA_IDEMPOTENCY_KEY_INVALID", 400, "A stable 16-160 character idempotency key is required");
    const { env, actor } = await authorized(request), registry = await first(env.DB, "SELECT * FROM v7_evaluation_factory_qa_registry WHERE channel_id=? AND policy_version=?", CHANNEL_ID, FACTORY_FIRST_QA_POLICY_VERSION);
    if (!registry) throw new FactoryQaError("FACTORY_QA_REGISTRY_REQUIRED", 409, "Factory QA registry is unavailable");
    if (mode === "BATCH" && !["CALIBRATION_PASS", "ACTIVE"].includes(clean(registry.lifecycle_state))) throw new FactoryQaError("FACTORY_QA_CALIBRATION_REQUIRED", 409, "Two owner anchors must pass independent calibration first");
    const intentHash = await canonicalHash({ action, mode, limit, policyVersion: FACTORY_FIRST_QA_POLICY_VERSION });
    let qaRun = await first(env.DB, "SELECT * FROM v7_evaluation_factory_qa_runs WHERE channel_id=? AND idempotency_key=?", CHANNEL_ID, idempotencyKey);
    if (qaRun && clean(qaRun.intent_hash) !== intentHash) throw new FactoryQaError("FACTORY_QA_IDEMPOTENCY_CONFLICT", 409, "Idempotency key already belongs to another intent");
    if (!qaRun) {
      const selected = await rows(env.DB, `SELECT q.*,c.storage_key,c.verification_state,c.rights_verification_state,c.lifecycle_state,c.release_eligible
        FROM v7_evaluation_factory_qa_tasks q JOIN v7_evaluation_candidates c ON c.id=q.candidate_id
        WHERE q.channel_id=? AND q.task_class=?
          AND c.verification_state='EVIDENCE_VERIFIED' AND c.rights_verification_state='PASS' AND c.lifecycle_state='CANDIDATE_EVIDENCE' AND c.release_eligible=0
          AND NOT EXISTS (SELECT 1 FROM v7_evaluation_factory_qa_receipts r WHERE r.task_id=q.id)
        ORDER BY q.created_at,q.id LIMIT ?`, CHANNEL_ID, mode === "CALIBRATION" ? "OWNER_ANCHOR" : "UNREVIEWED_PRIMARY", limit);
      if (mode === "CALIBRATION" && selected.length !== 2) throw new FactoryQaError("FACTORY_QA_TWO_ANCHORS_REQUIRED", 409, "Calibration requires exactly two saved owner anchors");
      const imageRequests = selected.filter((item) => clean(item.mime_type).startsWith("image/")).length;
      const reservedUsd = imageRequests * FACTORY_FIRST_QA_MAXIMUM_REQUEST_RESERVATION_USD;
      const totals = await first(env.DB, `SELECT COALESCE(SUM(provider_requests),0) requests,COALESCE(SUM(spend_usd),0) spend,
        COALESCE((SELECT SUM(reserved_usd) FROM v7_evaluation_factory_qa_runs WHERE channel_id=? AND lifecycle_state IN ('PLANNED','RUNNING')),0) reserved
        FROM v7_evaluation_factory_qa_receipts WHERE channel_id=?`, CHANNEL_ID, CHANNEL_ID);
      if (number(totals?.requests) + imageRequests > number(registry.provider_request_ceiling) || number(totals?.spend) + number(totals?.reserved) + reservedUsd > number(registry.spend_ceiling_usd)) throw new FactoryQaError("FACTORY_QA_BUDGET_EXHAUSTED", 409, "Factory QA request or spend ceiling would be exceeded");
      const runId = id("evaluation-factory-qa-run");
      await run(env.DB, `INSERT INTO v7_evaluation_factory_qa_runs (id,channel_id,run_mode,policy_version,lifecycle_state,candidate_ids_json,planned_candidates,reserved_usd,idempotency_key,intent_hash,actor)
        VALUES (?,?,?,?,'PLANNED',?,?,?,?,?,?)`, runId, CHANNEL_ID, mode, FACTORY_FIRST_QA_POLICY_VERSION, JSON.stringify(selected.map((item) => clean(item.candidate_id))), selected.length, reservedUsd, idempotencyKey, intentHash, actor);
      qaRun = await first(env.DB, "SELECT * FROM v7_evaluation_factory_qa_runs WHERE id=?", runId);
    }
    if (!qaRun) throw new FactoryQaError("FACTORY_QA_RUN_NOT_DURABLE", 503, "Factory QA run could not be read back");
    if (["CALIBRATION_PASS", "CALIBRATION_FAILED", "COMPLETED"].includes(clean(qaRun.lifecycle_state))) return Response.json({ outcome: "REPLAYED", run: qaRun, factoryQa: await status(env.DB) }, { headers: NO_STORE });
    await run(env.DB, "UPDATE v7_evaluation_factory_qa_runs SET lifecycle_state='RUNNING' WHERE id=? AND lifecycle_state IN ('PLANNED','RUNNING','PARTIAL','FAILED')", qaRun.id);
    const taxonomy = await rows(env.DB, "SELECT id,defect_key,label,severity,modality,description FROM v7_evaluation_defect_taxonomy WHERE active=1 ORDER BY defect_key");
    const candidateIds = json<string[]>(qaRun.candidate_ids_json, []);
    let agreements = 0;
    for (const candidateId of candidateIds) {
      const existing = await first(env.DB, "SELECT * FROM v7_evaluation_factory_qa_receipts WHERE candidate_id=?", candidateId);
      if (existing) { if (mode === "CALIBRATION" && await anchorAgreement(env.DB, candidateId, json(existing.labels_json, []), clean(existing.decision_state))) agreements += 1; continue; }
      const task = await first(env.DB, `SELECT q.*,c.storage_key,c.verification_state,c.rights_verification_state,c.lifecycle_state,c.release_eligible
        FROM v7_evaluation_factory_qa_tasks q JOIN v7_evaluation_candidates c ON c.id=q.candidate_id WHERE q.candidate_id=?`, candidateId);
      if (!task) continue;
      if (!clean(task.mime_type).startsWith("image/")) {
        const requestHash = await canonicalHash({ policyVersion: FACTORY_FIRST_QA_POLICY_VERSION, candidateId, exactArtifactHash: task.exact_artifact_hash, reviewSurface: "BROWSER_REQUIRED" });
        await recordReceipt(env.DB, { runId: clean(qaRun.id), task, taxonomy, actor, reviewSurface: "BROWSER_REQUIRED", decisionState: "BROWSER_REQUIRED", ownerAttentionState: "NO_IMMEDIATE_OWNER_ACTION", labels: [], summary: "Temporal or audible media is queued for full Factory Browser playback before any perceptual conclusion; no owner action is requested yet.", providerRequests: 0, spendUsd: 0, requestHash });
        continue;
      }
      const inspected = await inspectImage(env, task, taxonomy);
      const labels = inspected.result.labels ?? [], present = labels.filter((item) => clean(item.status) === "PRESENT"), uncertain = labels.filter((item) => clean(item.status) === "UNCERTAIN");
      const p0 = new Set(taxonomy.filter((item) => clean(item.severity) === "P0").map((item) => clean(item.defect_key)));
      const ownerAttentionState = uncertain.length || present.some((item) => p0.has(clean(item.defectKey))) ? "OWNER_REQUIRED" : "NO_IMMEDIATE_OWNER_ACTION";
      await recordReceipt(env.DB, { runId: clean(qaRun.id), task, taxonomy, actor, reviewSurface: "OPENAI_VISION", decisionState: clean(inspected.result.decisionState), ownerAttentionState, labels, summary: clean(inspected.result.summary), model: inspected.model, providerResponseId: inspected.providerResponseId, providerRequests: 1, spendUsd: inspected.usage.actualUsd, requestHash: inspected.requestHash });
      if (mode === "CALIBRATION" && await anchorAgreement(env.DB, candidateId, labels, clean(inspected.result.decisionState))) agreements += 1;
    }
    const runTotals = await first(env.DB, "SELECT COUNT(*) processed,COALESCE(SUM(provider_requests),0) requests,COALESCE(SUM(spend_usd),0) spend FROM v7_evaluation_factory_qa_receipts WHERE run_id=?", qaRun.id);
    const processed = number(runTotals?.processed), complete = processed === candidateIds.length;
    const lifecycleState = mode === "CALIBRATION" ? complete && agreements === 2 ? "CALIBRATION_PASS" : "CALIBRATION_FAILED" : complete ? "COMPLETED" : "PARTIAL";
    await run(env.DB, "UPDATE v7_evaluation_factory_qa_runs SET lifecycle_state=?,processed_candidates=?,provider_requests=?,spend_usd=?,anchor_agreements=?,reserved_usd=0,completed_at=? WHERE id=?", lifecycleState, processed, runTotals?.requests, runTotals?.spend, agreements, now(), qaRun.id);
    if (mode === "CALIBRATION") await run(env.DB, "UPDATE v7_evaluation_factory_qa_registry SET lifecycle_state=?,updated_at=? WHERE channel_id=? AND policy_version=?", lifecycleState === "CALIBRATION_PASS" ? "CALIBRATION_PASS" : "CALIBRATION_FAILED", now(), CHANNEL_ID, FACTORY_FIRST_QA_POLICY_VERSION);
    if (mode === "BATCH" && complete) { const pending = await first(env.DB, "SELECT COUNT(*) pending FROM v7_evaluation_factory_qa_tasks t WHERE channel_id=? AND NOT EXISTS (SELECT 1 FROM v7_evaluation_factory_qa_receipts r WHERE r.task_id=t.id)", CHANNEL_ID); if (number(pending?.pending) === 0) await run(env.DB, "UPDATE v7_evaluation_factory_qa_registry SET lifecycle_state='ACTIVE',updated_at=? WHERE channel_id=? AND policy_version=?", now(), CHANNEL_ID, FACTORY_FIRST_QA_POLICY_VERSION); }
    return Response.json({ outcome: lifecycleState, run: await first(env.DB, "SELECT * FROM v7_evaluation_factory_qa_runs WHERE id=?", qaRun.id), factoryQa: await status(env.DB) }, { headers: NO_STORE });
  } catch (error) {
    return Response.json({ error: { code: error instanceof FactoryQaError ? error.code : "FACTORY_QA_FAILED", message: error instanceof Error ? error.message : "Factory QA failed" } }, { status: error instanceof FactoryQaError ? error.status : 503, headers: NO_STORE });
  }
}
