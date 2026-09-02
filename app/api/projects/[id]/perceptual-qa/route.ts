import { and, desc, eq, inArray, or } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import {
  appendWriteCommandAudit,
  hashActorSubject,
  type WriteCommandAuditDatabase,
  type WriteCommandAuditIdentity,
} from "../../../../../lib/write-command-audit";
import { evidenceBindings, evidenceRecords, videoRenders, workflowEvents } from "../../../../../db/schema";

type RuntimeEnv = {
  DB?: WriteCommandAuditDatabase;
  FACTORY_EXPERT_EMAILS?: string;
  OPENAI_API_KEY?: string;
  OPENAI_QA_MODEL?: string;
};
type FrameInput = { shotId: string; title: string; family: string; timestamp: number; intent: string; imageDataUrl: string };
type Finding = { timestamp: number; shotId: string; severity: "P0" | "P1" | "P2"; category: string; observation: string; evidence: string; rootCause: string; repairAction: string; acceptanceTest: string; confidence: number };
type RepairPackage = { id: string; layer: string; title: string; severity: "P0" | "P1" | "P2"; findingCount: number; affectedShotIds: string[]; rootCause: string; automatedAction: string; acceptanceTests: string[]; status: "QUEUED" | "MATERIALIZING" | "READY_FOR_RENDER" };

const CRITICS = ["Executive producer", "Story & retention", "Visual director", "Semantic alignment", "Sound director", "Audience simulator", "Competitive editor", "Factual & brand safety"];
const SCORE_KEYS = ["story", "semanticFit", "visualQuality", "visualVariety", "pacing", "emphasis", "soundDesign", "competitiveReadiness"];
const REPAIR_TAXONOMY = [
  { key: "CLEAN_OUTPUT", layer: "COMPOSITOR", title: "Remove production and debug overlays", match: /url|filename|asset id|template|base|peak|accent|debug|provenance|source-title|source title/i, action: "Enforce a clean audience-only render layer; strip source URLs, filenames, asset IDs, family labels, state labels and diagnostic chrome before composition." },
  { key: "SHOT_BINDING", layer: "TIMELINE", title: "Rebind shots to narration boundaries", match: /boundar|offset|sync|stale frame|lag|timing|preceding shot|duration discrep/i, action: "Re-freeze continuous shot in/out points, reset visual media at every shot entry and bind entry–mid–exit states to the contracted narration interval." },
  { key: "SEMANTIC_FIT", layer: "ASSET_SELECTION", title: "Replace semantically incorrect visuals", match: /semantic|narration|incorrect|mismatch|unrelated|unsupported|contradict/i, action: "Invalidate the selected asset and rerun narration-bound sourcing/generation with exact entities, mechanism, exclusions and an adversarial semantic selection gate." },
  { key: "FACTUAL_MODEL", layer: "INFORMATION_DESIGN", title: "Rebuild factual payment-system models", match: /issuer|acquirer|router|settlement|clearing|authorization|payment topology|waterfall|gross-to-net|fee/i, action: "Use the controlled payment model: cardholder → merchant → acquirer/processor → network → issuer for authorization; show clearing and settlement as later, distinct states." },
  { key: "VISUAL_DIVERSITY", layer: "VISUAL_SYSTEM", title: "Eliminate frozen and repeated templates", match: /repeat|frozen|static|one-beat|placeholder|generic|same template|monoton/i, action: "Reallocate unique assets and distinct entry–mid–exit states; prohibit adjacent family repetition and require shot-specific motion or information change." },
  { key: "FRAME_LEGIBILITY", layer: "COMPOSITION", title: "Repair crop, hierarchy and mobile legibility", match: /crop|legib|mobile|contrast|empty space|obstruct|tiny|label|composition/i, action: "Recompose to a 16:9 safe frame, 32 px minimum essential labels, high-contrast state encoding and no decorative dead space or obstructed subject." },
  { key: "SOUND_MIX", layer: "AUDIO", title: "Rebuild narration, music, ambience and SFX mix", match: /sound|audio|music|ambience|sfx|loudness|dialog|waveform|silence/i, action: "Preserve independent stems, regenerate missing beds, apply narration-first ducking, verify integrated loudness/true peak and require audible evidence for every mandatory layer." },
  { key: "FINAL_QC", layer: "QUALITY", title: "Run independent pre-export and full-master QC", match: /brand|factual|qc|release|finished master|production metadata/i, action: "Run OCR/artifact scan, shot-boundary inspection, factual review, mobile legibility, audio-stem audit and duration verification before a new master becomes QA-eligible." },
] as const;

type PerceptualQaOwnerAction = "START_RUN" | "ANALYZE_BATCH" | "FINALIZE_RUN" | "BUILD_REPAIR_WAVE";
type PerceptualQaAudioMetrics = {
  masterDurationSeconds: number;
  decodedDurationSeconds: number;
  sampleRate: number;
  channels: number;
  peakAmplitude: number;
  meanOneSecondRms: number;
  rmsVariation: number;
  silentSeconds: number;
  silenceRatio: number;
  expectedNarrationCoverage: string;
  reviewMethod: string;
  qualityPolicy: string;
};
type PerceptualQaOwnerPayload = {
  action: PerceptualQaOwnerAction;
  runId?: string;
  frames?: FrameInput[];
  audioMetrics?: PerceptualQaAudioMetrics;
};
type PerceptualQaOwnerCommand = { action: PerceptualQaOwnerAction; payload: PerceptualQaOwnerPayload; requestHash: string };

const PERCEPTUAL_QA_OWNER_HANDLER_IDENTITY = "app/api/projects/[id]/perceptual-qa/route.ts#POST";
const PERCEPTUAL_QA_OWNER_ACTIONS = new Set<PerceptualQaOwnerAction>(["START_RUN", "ANALYZE_BATCH", "FINALIZE_RUN", "BUILD_REPAIR_WAVE"]);
const PERCEPTUAL_QA_OWNER_FIELDS: Record<PerceptualQaOwnerAction, ReadonlySet<string>> = {
  START_RUN: new Set(["action"]),
  ANALYZE_BATCH: new Set(["action", "runId", "frames"]),
  FINALIZE_RUN: new Set(["action", "runId", "audioMetrics"]),
  BUILD_REPAIR_WAVE: new Set(["action", "runId"]),
};
const PERCEPTUAL_QA_AUDIO_FIELDS = new Set(["masterDurationSeconds", "decodedDurationSeconds", "sampleRate", "channels", "peakAmplitude", "meanOneSecondRms", "rmsVariation", "silentSeconds", "silenceRatio", "expectedNarrationCoverage", "reviewMethod", "qualityPolicy"]);
const PERCEPTUAL_QA_FRAME_FIELDS = new Set(["shotId", "title", "family", "timestamp", "intent", "imageDataUrl"]);
const MAX_PERCEPTUAL_QA_OWNER_BODY_BYTES = 10 * 1024 * 1024;
const MAX_PERCEPTUAL_QA_FRAME_DATA_URL_BYTES = 700 * 1024;
const PERCEPTUAL_QA_CORRELATION_ID_PATTERN = /^[A-Za-z0-9._:-]{8,200}$/;
const PERCEPTUAL_QA_AUDIT_COMPONENT_PATTERN = /[^A-Za-z0-9._:-]/g;

function perceptualQaOwnerFailure(error: string, status: number) {
  return Response.json({ error }, { status });
}

function perceptualQaOwnerSameOrigin(request: Request) {
  const url = new URL(request.url);
  return request.method === "POST"
    && /^\/api\/projects\/[^/]+\/perceptual-qa$/.test(url.pathname)
    && request.headers.get("origin") === url.origin
    && request.headers.get("sec-fetch-site") === "same-origin";
}

async function authorizePerceptualQaOwnerWrite(request: Request) {
  const user = await getChatGPTUser();
  if (!user?.email) return perceptualQaOwnerFailure("SIWC_AUTHENTICATION_REQUIRED", 401);

  const env = await runtimeEnv();
  const normalizedEmail = user.email.trim().toLowerCase();
  const owners = String(env.FACTORY_EXPERT_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (owners.length === 0) return perceptualQaOwnerFailure("OWNER_WRITE_ALLOWLIST_UNCONFIGURED", 503);
  if (!owners.includes(normalizedEmail)) return perceptualQaOwnerFailure("OWNER_WRITE_AUTHORIZATION_REQUIRED", 403);
  if (!perceptualQaOwnerSameOrigin(request)) return perceptualQaOwnerFailure("OWNER_WRITE_SAME_ORIGIN_REQUIRED", 403);
  if (!env.DB) return perceptualQaOwnerFailure("CANONICAL_DATABASE_UNAVAILABLE", 503);
  return { db: env.DB, normalizedEmail };
}

async function perceptualQaSha256RawBytes(bytes: ArrayBuffer | Uint8Array) {
  const value = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", value));
  return [...digest].map((item) => item.toString(16).padStart(2, "0")).join("");
}

function perceptualQaExactKeys(value: Record<string, unknown>, expected: ReadonlySet<string>) {
  const keys = Object.keys(value);
  return keys.length === expected.size && keys.every((key) => expected.has(key));
}

function perceptualQaBoundedString(value: unknown, maximum: number) {
  return typeof value === "string" && value.length > 0 && value.length <= maximum;
}

function perceptualQaFiniteNumber(value: unknown, minimum: number, maximum: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function perceptualQaFrameValid(value: unknown): value is FrameInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const frame = value as Record<string, unknown>;
  if (!perceptualQaExactKeys(frame, PERCEPTUAL_QA_FRAME_FIELDS)) return false;
  if (!perceptualQaBoundedString(frame.shotId, 200) || !perceptualQaBoundedString(frame.title, 500) || !perceptualQaBoundedString(frame.family, 100) || !perceptualQaBoundedString(frame.intent, 2000)) return false;
  if (!perceptualQaFiniteNumber(frame.timestamp, 0, 3600)) return false;
  if (typeof frame.imageDataUrl !== "string" || frame.imageDataUrl.length > MAX_PERCEPTUAL_QA_FRAME_DATA_URL_BYTES || !frame.imageDataUrl.startsWith("data:image/jpeg;base64,")) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(frame.imageDataUrl.slice("data:image/jpeg;base64,".length));
}

function perceptualQaAudioMetricsValid(value: unknown): value is PerceptualQaAudioMetrics {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const audio = value as Record<string, unknown>;
  if (!perceptualQaExactKeys(audio, PERCEPTUAL_QA_AUDIO_FIELDS)) return false;
  return perceptualQaFiniteNumber(audio.masterDurationSeconds, 1, 3600)
    && perceptualQaFiniteNumber(audio.decodedDurationSeconds, 1, 3600)
    && perceptualQaFiniteNumber(audio.sampleRate, 8000, 192000)
    && Number.isInteger(audio.channels) && Number(audio.channels) >= 1 && Number(audio.channels) <= 8
    && perceptualQaFiniteNumber(audio.peakAmplitude, 0, 2)
    && perceptualQaFiniteNumber(audio.meanOneSecondRms, 0, 2)
    && perceptualQaFiniteNumber(audio.rmsVariation, 0, 2)
    && perceptualQaFiniteNumber(audio.silentSeconds, 0, 3600)
    && perceptualQaFiniteNumber(audio.silenceRatio, 0, 1)
    && perceptualQaBoundedString(audio.expectedNarrationCoverage, 500)
    && perceptualQaBoundedString(audio.reviewMethod, 500)
    && perceptualQaBoundedString(audio.qualityPolicy, 1000);
}

function perceptualQaOwnerPayloadValid(payload: PerceptualQaOwnerPayload) {
  if (payload.action === "START_RUN") return true;
  if (!perceptualQaBoundedString(payload.runId, 200)) return false;
  if (payload.action === "BUILD_REPAIR_WAVE") return true;
  if (payload.action === "FINALIZE_RUN") return perceptualQaAudioMetricsValid(payload.audioMetrics);
  if (!Array.isArray(payload.frames) || payload.frames.length < 1 || payload.frames.length > 12 || !payload.frames.every(perceptualQaFrameValid)) return false;
  const bindings = payload.frames.map((frame) => `${frame.shotId}:${frame.timestamp}`);
  return new Set(bindings).size === bindings.length;
}

async function readPerceptualQaOwnerCommand(request: Request): Promise<PerceptualQaOwnerCommand | Response> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") return perceptualQaOwnerFailure("JSON_CONTENT_TYPE_REQUIRED", 415);
  const lengthHeader = request.headers.get("content-length");
  const contentLength = lengthHeader === null ? null : Number(lengthHeader);
  if (contentLength !== null && (!Number.isFinite(contentLength) || contentLength < 0)) return perceptualQaOwnerFailure("OWNER_WRITE_CONTENT_LENGTH_INVALID", 400);
  if (contentLength !== null && contentLength > MAX_PERCEPTUAL_QA_OWNER_BODY_BYTES) return perceptualQaOwnerFailure("OWNER_WRITE_BODY_TOO_LARGE", 413);
  const raw = await request.arrayBuffer();
  if (!raw.byteLength || raw.byteLength > MAX_PERCEPTUAL_QA_OWNER_BODY_BYTES) return perceptualQaOwnerFailure("OWNER_WRITE_BODY_TOO_LARGE", 413);

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(raw));
  } catch {
    return perceptualQaOwnerFailure("OWNER_WRITE_JSON_INVALID", 400);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return perceptualQaOwnerFailure("OWNER_WRITE_COMMAND_INVALID", 400);
  const record = parsed as Record<string, unknown>;
  if (typeof record.action !== "string") return perceptualQaOwnerFailure("OWNER_WRITE_COMMAND_INVALID", 400);
  if (!PERCEPTUAL_QA_OWNER_ACTIONS.has(record.action as PerceptualQaOwnerAction)) return perceptualQaOwnerFailure("PERCEPTUAL_QA_OWNER_ACTION_FORBIDDEN", 403);
  const action = record.action as PerceptualQaOwnerAction;
  if (!perceptualQaExactKeys(record, PERCEPTUAL_QA_OWNER_FIELDS[action])) return perceptualQaOwnerFailure("OWNER_WRITE_COMMAND_FIELD_FORBIDDEN", 400);
  const payload = record as PerceptualQaOwnerPayload;
  if (!perceptualQaOwnerPayloadValid(payload)) return perceptualQaOwnerFailure("OWNER_WRITE_COMMAND_INVALID", 400);
  return { action, payload, requestHash: await perceptualQaSha256RawBytes(raw) };
}

function perceptualQaBoundedAuditComponent(value: string) {
  return value.replace(PERCEPTUAL_QA_AUDIT_COMPONENT_PATTERN, "_").slice(0, 200) || "unknown";
}

function perceptualQaOwnerResourceScope(projectId: string, command: PerceptualQaOwnerCommand) {
  const project = perceptualQaBoundedAuditComponent(projectId);
  if (command.action === "START_RUN") return `project:${project}:perceptual-qa:start`;
  return `project:${project}:perceptual-qa:${perceptualQaBoundedAuditComponent(command.payload.runId ?? "unknown")}`;
}

function perceptualQaOwnerCorrelationId(request: Request) {
  const supplied = request.headers.get("x-correlation-id")?.trim() ?? "";
  return PERCEPTUAL_QA_CORRELATION_ID_PATTERN.test(supplied) ? supplied : `perceptual-qa-owner:${crypto.randomUUID()}`;
}

async function perceptualQaOwnerAuditIdentity(request: Request, projectId: string, normalizedEmail: string, command: PerceptualQaOwnerCommand): Promise<WriteCommandAuditIdentity> {
  return {
    handlerIdentity: PERCEPTUAL_QA_OWNER_HANDLER_IDENTITY,
    actorType: "CHATGPT_OWNER",
    actorSubjectHash: await hashActorSubject("CHATGPT_OWNER", normalizedEmail),
    action: command.action,
    resourceScope: perceptualQaOwnerResourceScope(projectId, command),
    correlationId: perceptualQaOwnerCorrelationId(request),
    requestHash: command.requestHash,
  };
}
async function runtimeEnv() { const { env } = await import("cloudflare:workers"); return env as unknown as RuntimeEnv; }
function parse(value: string | null) { try { return value ? JSON.parse(value) as Record<string, unknown> : {}; } catch { return {}; } }
function chunks<T>(items: T[], size = 40) { const result: T[][] = []; for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size)); return result; }
function clusterFindings(findings: Finding[]) {
  const assigned = new Set<number>(); const packages: RepairPackage[] = REPAIR_TAXONOMY.map((rule, ruleIndex) => { const matches = findings.map((finding, index) => ({ finding, index })).filter(({ finding }) => rule.match.test(`${finding.category} ${finding.observation} ${finding.rootCause} ${finding.repairAction}`)); matches.forEach(({ index }) => assigned.add(index)); const severity = matches.some(({ finding }) => finding.severity === "P0") ? "P0" : matches.some(({ finding }) => finding.severity === "P1") ? "P1" : "P2"; return { id: `WP-${String(ruleIndex + 1).padStart(2, "0")}`, layer: rule.layer, title: rule.title, severity, findingCount: matches.length, affectedShotIds: [...new Set(matches.map(({ finding }) => finding.shotId))], rootCause: matches[0]?.finding.rootCause || "Systemic quality control gap", automatedAction: rule.action, acceptanceTests: [...new Set(matches.map(({ finding }) => finding.acceptanceTest))].slice(0, 5), status: "QUEUED" }; }).filter((item) => item.findingCount > 0); const residual = findings.filter((_, index) => !assigned.has(index)); if (residual.length) packages.push({ id: `WP-${String(packages.length + 1).padStart(2, "0")}`, layer: "EDITORIAL", title: "Resolve remaining shot-specific defects", severity: residual.some((finding) => finding.severity === "P0") ? "P0" : residual.some((finding) => finding.severity === "P1") ? "P1" : "P2", findingCount: residual.length, affectedShotIds: [...new Set(residual.map((finding) => finding.shotId))], rootCause: "Shot-specific defects outside the systemic clusters", automatedAction: "Regenerate only the affected shots under their frozen narration and evidence contracts, then rescore them before master binding.", acceptanceTests: [...new Set(residual.map((finding) => finding.acceptanceTest))].slice(0, 5), status: "QUEUED" }); return packages;
}
function outputText(payload: Record<string, unknown>) { const direct = payload.output_text; if (typeof direct === "string") return direct; const output = Array.isArray(payload.output) ? payload.output : []; for (const item of output) { const content = item && typeof item === "object" && Array.isArray((item as { content?: unknown[] }).content) ? (item as { content: unknown[] }).content : []; for (const block of content) if (block && typeof block === "object" && typeof (block as { text?: unknown }).text === "string") return String((block as { text: string }).text); } throw new Error("OpenAI returned no structured QA output"); }
async function openaiStructured(name: string, schema: Record<string, unknown>, content: Array<Record<string, unknown>>) {
  const env = await runtimeEnv(); if (!env.OPENAI_API_KEY) throw new Error("Connect OPENAI_API_KEY in Factory Connections before AI Perceptual QA");
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ model: env.OPENAI_QA_MODEL || "gpt-5.6", reasoning: { effort: "high" }, input: [{ role: "user", content }], text: { format: { type: "json_schema", name, strict: true, schema } } }), signal: AbortSignal.timeout(180000) });
  if (!response.ok) throw new Error(`OpenAI perceptual critic failed (${response.status})`);
  return JSON.parse(outputText(await response.json() as Record<string, unknown>)) as Record<string, unknown>;
}

const findingSchema = { type: "object", additionalProperties: false, properties: { findings: { type: "array", items: { type: "object", additionalProperties: false, properties: { timestamp: { type: "number" }, shotId: { type: "string" }, severity: { type: "string", enum: ["P0", "P1", "P2"] }, category: { type: "string" }, observation: { type: "string" }, evidence: { type: "string" }, rootCause: { type: "string" }, repairAction: { type: "string" }, acceptanceTest: { type: "string" }, confidence: { type: "integer", minimum: 0, maximum: 100 } }, required: ["timestamp", "shotId", "severity", "category", "observation", "evidence", "rootCause", "repairAction", "acceptanceTest", "confidence"] } }, batchVerdict: { type: "string" } }, required: ["findings", "batchVerdict"] };
const finalSchema = { type: "object", additionalProperties: false, properties: { decision: { type: "string", enum: ["PASS", "REPAIR_REQUIRED", "BLOCKED"] }, overallScore: { type: "integer", minimum: 0, maximum: 100 }, scores: { type: "object", additionalProperties: false, properties: Object.fromEntries(SCORE_KEYS.map((key) => [key, { type: "integer", minimum: 0, maximum: 100 }])), required: SCORE_KEYS }, criticConsensus: { type: "array", items: { type: "object", additionalProperties: false, properties: { critic: { type: "string" }, score: { type: "integer", minimum: 0, maximum: 100 }, verdict: { type: "string" }, decisiveFinding: { type: "string" } }, required: ["critic", "score", "verdict", "decisiveFinding"] } }, systemicDiagnosis: { type: "string" }, repairOrder: { type: "array", items: { type: "string" } }, releaseRationale: { type: "string" } }, required: ["decision", "overallScore", "scores", "criticConsensus", "systemicDiagnosis", "repairOrder", "releaseRationale"] };

async function qaSnapshot(projectId: string) {
  const db = await getDb(); const [runs, renders, records] = await Promise.all([db.select().from(evidenceRecords).where(eq(evidenceRecords.projectId, projectId)), db.select().from(videoRenders).where(eq(videoRenders.projectId, projectId)).orderBy(desc(videoRenders.version)), db.select().from(evidenceRecords).where(eq(evidenceRecords.projectId, projectId))]);
  const latestRun = runs.filter((row) => row.entityType === "PERCEPTUAL_QA_RUN").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]; const latestRender = renders.find((render) => render.id.includes("V5-MASTER") && !render.status.includes("QUARANTINED")) || null;
  const shots = records.filter((row) => row.entityType === "SHOT" && Number(parse(row.settingsJson).productionExpansionVersion) === 51).map((row) => { const settings = parse(row.settingsJson); return { id: row.id, title: row.title, startSeconds: Number(settings.startSeconds || 0), endSeconds: Number(settings.endSeconds || 0), family: String(settings.primaryFamily || "UNKNOWN"), intent: String(settings.exactClaim || settings.visualIntent || row.title) }; }).sort((a, b) => a.startSeconds - b.startSeconds);
  const settings = latestRun ? parse(latestRun.settingsJson) : null; const env = await runtimeEnv();
  return { policy: { mode: "MAXIMUM_QUALITY", costOptimization: "DEFERRED", frameCoverage: "THREE_TEMPORAL_SAMPLES_PER_EDITORIAL_SHOT", criticCount: CRITICS.length, autoPassFloor: 90, dimensionFloor: 86, p0Tolerance: 0 }, provider: { connected: Boolean(env.OPENAI_API_KEY), model: env.OPENAI_QA_MODEL || "gpt-5.6" }, render: latestRender ? { id: latestRender.id, version: latestRender.version, status: latestRender.status, durationSeconds: latestRender.durationSeconds, videoUrl: `/api/projects/${projectId}/render?video=${encodeURIComponent(latestRender.id)}` } : null, shots, latestRun: latestRun ? { id: latestRun.id, status: latestRun.lifecycleState, ...settings } : null };
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) { try { const { id } = await context.params; return Response.json(await qaSnapshot(id)); } catch (error) { console.error("Perceptual QA GET failed", error); return Response.json({ error: "AI Perceptual QA could not load" }, { status: 500 }); } }

async function executePerceptualQaOwnerCommand(id: string, body: PerceptualQaOwnerPayload): Promise<Response> {
  try {
    const db = await getDb();
    if (body.action === "START_RUN") { const env = await runtimeEnv(); if (!env.OPENAI_API_KEY) return Response.json({ error: "OPENAI_API_KEY_REQUIRED" }, { status: 424 }); const snap = await qaSnapshot(id); if (!snap.render || snap.shots.length < 1) return Response.json({ error: "A stored V5 master and frozen shot contract are required" }, { status: 409 }); const runId = `${id}-PQA-${Date.now()}`; const settings = { role: "AI_PERCEPTUAL_QA_RUN", renderId: snap.render.id, mode: "MAXIMUM_QUALITY", costOptimization: "DEFERRED", phase: "CAPTURING", framesExpected: snap.shots.length * 3, framesAnalyzed: 0, batches: [], findings: [], startedAt: new Date().toISOString() }; await db.insert(evidenceRecords).values({ id: runId, projectId: id, entityType: "PERCEPTUAL_QA_RUN", pipelineVersion: 5, lifecycleState: "PLAN", title: `AI Perceptual QA · ${snap.render.id}`, provider: "OpenAI Responses Vision", modelId: env.OPENAI_QA_MODEL || "gpt-5.6", settingsJson: JSON.stringify(settings), licenseStatus: "INTERNAL_QA_EVIDENCE", commercialUseStatus: "ALLOWED", revalidationStatus: "IN_PROGRESS", updatedAt: new Date().toISOString() }); return Response.json({ ok: true, runId, snapshot: await qaSnapshot(id) }); }
    const runId = String(body.runId || ""); const run = (await db.select().from(evidenceRecords).where(eq(evidenceRecords.id, runId)).limit(1))[0]; if (!run || run.projectId !== id || run.entityType !== "PERCEPTUAL_QA_RUN") return Response.json({ error: "Perceptual QA run not found" }, { status: 404 }); const state = parse(run.settingsJson);
    if (body.action === "BUILD_REPAIR_WAVE" && !state.repairWave) { const repairHistory = (await db.select().from(evidenceRecords).where(eq(evidenceRecords.projectId, id))).filter((record) => record.entityType === "AUTOMATED_REPAIR_WAVE"); if (repairHistory.length >= 3) return Response.json({ error: "Three automatic repair waves are exhausted. Thresholds remain frozen; route this master to a human senior editor." }, { status: 409 }); }
    if (body.action === "BUILD_REPAIR_WAVE") {
      if (state.decision !== "REPAIR_REQUIRED") return Response.json({ error: "Only a QA-rejected master may create a repair wave" }, { status: 409 });
      const findings = (Array.isArray(state.findings) ? state.findings : []) as Finding[]; const packages = clusterFindings(findings); const records = await db.select().from(evidenceRecords).where(eq(evidenceRecords.projectId, id));
      const visualSlots = records.filter((record) => record.entityType === "MEDIA_ASSET" && Number(parse(record.settingsJson).productionExpansionVersion) === 51 && parse(record.settingsJson).role === "UNIQUE_ASSET_SLOT"); const shots = records.filter((record) => record.entityType === "SHOT" && Number(parse(record.settingsJson).productionExpansionVersion) === 51); const now = new Date().toISOString();
      for (const ids of chunks(visualSlots.map((slot) => slot.id))) await db.update(evidenceRecords).set({ lifecycleState: "PLAN", storageKey: null, contentHash: null, sourceUrl: null, mimeType: null, sizeBytes: 0, semanticScore: null, revalidationStatus: "V52_REMATERIALIZATION_REQUIRED", updatedAt: now }).where(inArray(evidenceRecords.id, ids));
      for (const ids of chunks(shots.map((shot) => shot.id))) await db.update(evidenceRecords).set({ lifecycleState: "PLAN", revalidationStatus: "V52_REBIND_REQUIRED", updatedAt: now }).where(inArray(evidenceRecords.id, ids));
      await db.update(evidenceBindings).set({ relationship: "V51_PLANNED_VISUAL_FOR_SHOT", status: "PLANNED" }).where(and(eq(evidenceBindings.projectId, id), or(eq(evidenceBindings.relationship, "V51_VISUAL_FOR_SHOT"), eq(evidenceBindings.relationship, "V51_PLANNED_VISUAL_FOR_SHOT"))));
      const renderId = String(state.renderId || ""); if (renderId) await db.update(videoRenders).set({ status: "V52_QUARANTINED_FOR_REBUILD" }).where(eq(videoRenders.id, renderId));
      const repairHistory = records.filter((record) => record.entityType === "AUTOMATED_REPAIR_WAVE"); const repairWave = { id: `${id}-REPAIR-V52-${Date.now()}`, version: "5.2", sourceQaRunId: runId, sourceRenderId: renderId, status: "MATERIALIZATION_REQUIRED", packages, totalFindings: findings.length, systemicPackages: packages.length, invalidatedAssets: visualSlots.length, invalidatedShots: shots.length, maximumWaves: 3, currentWave: repairHistory.length + 1, thresholdsFrozen: true, createdAt: now };
      await db.update(evidenceRecords).set({ settingsJson: JSON.stringify({ ...state, repairWave }), updatedAt: now }).where(eq(evidenceRecords.id, runId)); await db.insert(evidenceRecords).values({ id: repairWave.id, projectId: id, entityType: "AUTOMATED_REPAIR_WAVE", pipelineVersion: 5, lifecycleState: "PLAN", title: "Automated Repair Wave V5.2", provider: "Frameflow Root-Cause Repair Orchestrator", settingsJson: JSON.stringify(repairWave), licenseStatus: "INTERNAL_REPAIR_EVIDENCE", commercialUseStatus: "ALLOWED", revalidationStatus: "IN_PROGRESS", updatedAt: now }); await db.insert(workflowEvents).values({ projectId: id, toStatus: "V52_REPAIR_MATERIALIZATION", eventType: "V52_AUTOMATED_REPAIR_WAVE_BUILT", summary: `V5.2 clustered ${findings.length} findings into ${packages.length} root-cause work packages, quarantined the rejected master and invalidated ${visualSlots.length} assets for clean rematerialization` }); return Response.json({ ok: true, repairWave, snapshot: await qaSnapshot(id) });
    }
    if (body.action === "ANALYZE_BATCH") { const frames = body.frames || []; if (!frames.length || frames.length > 12) return Response.json({ error: "Each vision batch must contain 1–12 frames" }, { status: 400 }); const snapshot = await qaSnapshot(id); const shotMap = new Map(snapshot.shots.map((shot) => [shot.id, shot])); for (const frame of frames) { const shot = shotMap.get(frame.shotId); if (!shot || frame.timestamp < shot.startSeconds || frame.timestamp > shot.endSeconds) return Response.json({ error: "Frame is not bound to the requested project shot interval" }, { status: 409 }); } const frameContext = frames.map(({ imageDataUrl: _, ...frame }) => frame); const content: Array<Record<string, unknown>> = [{ type: "input_text", text: `You are an adversarial YouTube documentary quality panel. Evaluate these consecutive master-video frames against their timecodes, shot intent and narration meaning. Judge what a demanding human executive producer actually sees, not metadata or production claims. Detect semantic mismatch, generic or meaningless AI imagery, repetition, poor crop/aspect fit, illegible diagrams, weak composition, insufficient visual change, missing emphasis and confusing continuity. Never pass polish that is only decorative. Return only concrete timecoded defects that merit repair; use P0 for release-blocking, P1 for clearly below competitive quality, P2 for material polish. Frame contract: ${JSON.stringify(frameContext)}` }, ...frames.map((frame) => ({ type: "input_image", image_url: frame.imageDataUrl, detail: "high" }))]; const result = await openaiStructured("perceptual_frame_findings", findingSchema, content); const previousBatches = Array.isArray(state.batches) ? state.batches : []; const previousFindings = Array.isArray(state.findings) ? state.findings : []; const nextFindings = [...previousFindings, ...(Array.isArray(result.findings) ? result.findings : [])]; const next = { ...state, phase: "VISION_ANALYSIS", framesAnalyzed: Number(state.framesAnalyzed || 0) + frames.length, batches: [...previousBatches, { shots: frameContext.map((frame) => frame.shotId), verdict: result.batchVerdict, analyzedAt: new Date().toISOString() }], findings: nextFindings }; await db.update(evidenceRecords).set({ lifecycleState: "FETCHED", settingsJson: JSON.stringify(next), updatedAt: new Date().toISOString() }).where(eq(evidenceRecords.id, runId)); return Response.json({ ok: true, framesAnalyzed: next.framesAnalyzed, findings: result.findings || [] }); }
    if (body.action === "FINALIZE_RUN") { const findings = (Array.isArray(state.findings) ? state.findings : []) as Finding[]; const audio = body.audioMetrics || {}; const content: Array<Record<string, unknown>> = [{ type: "input_text", text: `Act as an independent adjudicator for a premium US YouTube explainer documentary. Eight critics must reach a defensible consensus: ${CRITICS.join(", ")}. This phase is MAXIMUM QUALITY; cost must not reduce coverage, critic depth, repair scope or thresholds. Use the timecoded visual findings and measured audio evidence below. PASS is allowed only with zero P0, no unresolved material P1, overall >=90 and every score >=86. A technically valid file is not a quality pass. Diagnose systemic root causes, order repairs by viewer impact, and be strict about generic/repeated visuals, semantic mismatch, crop/legibility, weak emphasis, absent music/ambience/SFX, and monotony. Findings: ${JSON.stringify(findings)} Audio evidence: ${JSON.stringify(audio)}` }]; const result = await openaiStructured("perceptual_master_verdict", finalSchema, content); const scores = result.scores && typeof result.scores === "object" ? result.scores as Record<string, number> : {}; const hasP0 = findings.some((item) => item.severity === "P0"); const materialP1 = findings.filter((item) => item.severity === "P1" && item.confidence >= 75).length; const floor = Math.min(...SCORE_KEYS.map((key) => Number(scores[key] || 0))); const declared = String(result.decision || "BLOCKED"); const decision = !hasP0 && materialP1 === 0 && Number(result.overallScore || 0) >= 90 && floor >= 86 && declared === "PASS" ? "PASS" : "REPAIR_REQUIRED"; const final = { ...state, phase: "COMPLETE", decision, overallScore: Number(result.overallScore || 0), scores, criticConsensus: result.criticConsensus, systemicDiagnosis: result.systemicDiagnosis, repairOrder: result.repairOrder, releaseRationale: result.releaseRationale, audioMetrics: audio, p0Count: findings.filter((item) => item.severity === "P0").length, p1Count: findings.filter((item) => item.severity === "P1").length, completedAt: new Date().toISOString() }; await db.update(evidenceRecords).set({ lifecycleState: decision === "PASS" ? "AUDITED" : "VERIFIED", settingsJson: JSON.stringify(final), semanticScore: Number(result.overallScore || 0), revalidationStatus: decision === "PASS" ? "CURRENT" : "REPAIR_REQUIRED", updatedAt: new Date().toISOString() }).where(eq(evidenceRecords.id, runId)); await db.insert(workflowEvents).values({ projectId: id, toStatus: decision === "PASS" ? "AI_PERCEPTUAL_QA_PASSED" : "AI_PERCEPTUAL_REPAIR_REQUIRED", eventType: `AI_PERCEPTUAL_QA_${decision}`, summary: `${CRITICS.length}-critic AI master review ${decision.toLowerCase().replaceAll("_", " ")} · ${Number(result.overallScore || 0)}/100 · ${findings.length} timecoded findings` }); return Response.json({ ok: true, decision, result: final }); }
    return Response.json({ error: "Unknown AI Perceptual QA action" }, { status: 400 });
  } catch (error) { console.error("Perceptual QA owner command failed", error); return perceptualQaOwnerFailure("PERCEPTUAL_QA_OWNER_ACTION_FAILED", 500); }
}

async function perceptualQaDomainReceipt(command: PerceptualQaOwnerCommand, response: Response) {
  const payload = await response.clone().json().catch(() => ({})) as Record<string, unknown>;
  if (command.action === "START_RUN") return `perceptual-qa:${perceptualQaBoundedAuditComponent(String(payload.runId ?? "unknown"))}:STARTED`;
  const runId = perceptualQaBoundedAuditComponent(command.payload.runId ?? "unknown");
  if (command.action === "ANALYZE_BATCH") return `perceptual-qa:${runId}:frames:${Number(payload.framesAnalyzed ?? 0)}`;
  if (command.action === "FINALIZE_RUN") return `perceptual-qa:${runId}:${perceptualQaBoundedAuditComponent(String(payload.decision ?? "unknown"))}`;
  const repairWave = payload.repairWave && typeof payload.repairWave === "object" ? payload.repairWave as Record<string, unknown> : {};
  return `perceptual-qa:${runId}:repair-wave:${perceptualQaBoundedAuditComponent(String(repairWave.id ?? "unknown"))}`;
}

async function runAuditedPerceptualQaOwnerCommand(db: WriteCommandAuditDatabase, identity: WriteCommandAuditIdentity, command: PerceptualQaOwnerCommand, execute: () => Promise<Response>) {
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
    await appendWriteCommandAudit(db, identity, "SUCCEEDED", await perceptualQaDomainReceipt(command, response));
    return response;
  } catch (error) {
    await appendWriteCommandAudit(db, identity, "FAILED", null);
    throw error;
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authorization = await authorizePerceptualQaOwnerWrite(request);
    if (authorization instanceof Response) return authorization;
    const command = await readPerceptualQaOwnerCommand(request);
    if (command instanceof Response) return command;
    const { id } = await context.params;
    const identity = await perceptualQaOwnerAuditIdentity(request, id, authorization.normalizedEmail, command);
    return await runAuditedPerceptualQaOwnerCommand(
      authorization.db,
      identity,
      command,
      () => executePerceptualQaOwnerCommand(id, command.payload),
    );
  } catch (error) {
    console.error("Perceptual QA POST failed", error);
    return perceptualQaOwnerFailure("PERCEPTUAL_QA_OWNER_ACTION_FAILED", 500);
  }
}
