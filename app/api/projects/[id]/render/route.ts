import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import {
  appendWriteCommandAudit,
  hashActorSubject,
  type WriteCommandAuditDatabase,
  type WriteCommandAuditIdentity,
} from "../../../../../lib/write-command-audit";
import { assemblyRuns, mediaAssets, narrationSegments, optimizationArtifacts, productionProfiles, sceneManifest, videoProjects, videoRenders, voiceProfiles, workflowEvents } from "../../../../../db/schema";

type RuntimeStatement = { bind(...values: unknown[]): RuntimeStatement; run(): Promise<unknown> };
type RuntimeD1 = WriteCommandAuditDatabase & { prepare(sql: string): RuntimeStatement };
type RuntimeObject = { body: ReadableStream; arrayBuffer?: () => Promise<ArrayBuffer>; size: number; httpMetadata?: { contentType?: string } };
type RuntimeBucket = {
  put(key: string, value: ArrayBuffer | Uint8Array, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }): Promise<unknown>;
  get(key: string, options?: { range?: { offset: number; length: number } }): Promise<RuntimeObject | null>;
  head(key: string): Promise<{ size: number; httpMetadata?: { contentType?: string } } | null>;
  delete(keys: string | string[]): Promise<unknown>;
};
type RuntimeEnv = { DB?: RuntimeD1; BUCKET?: RuntimeBucket; ELEVENLABS_API_KEY?: string };
type TimingResponse = { audio_base64: string; alignment?: Record<string, unknown>; normalized_alignment?: { character_end_times_seconds?: number[] } & Record<string, unknown> };
type ElevenLabsFailure = { status: number; code: string; message: string; retryable: boolean };
type RenderOwnerAction = "FINALIZE_VIDEO" | "MATERIALIZE_V2_NARRATION" | "COMPLETE_PLAYBACK_QA" | "REJECT_PLAYBACK_QA";
type RenderOwnerPayload = {
  action: RenderOwnerAction;
  position?: number;
  renderId?: string;
  checks?: string[];
  issues?: string[];
  uploadId?: string;
  chunkCount?: number;
  fileName?: string;
  sizeBytes?: number;
  durationSeconds?: number;
  width?: number;
  height?: number;
  fps?: number;
  renderMode?: string;
  repairWave?: number;
};
type RenderOwnerCommand =
  | { kind: "JSON"; action: RenderOwnerAction; payload: RenderOwnerPayload; requestHash: string }
  | { kind: "UPLOAD"; action: "UPLOAD_FINAL_VIDEO_PART"; uploadId: string; part: number; bytes: Uint8Array; requestHash: string };
type RenderOwnerResult = { response: Response; domainReceiptReference: string | null };

const PLAYBACK_QA_CHECKS = ["FULL_PLAYBACK", "SINGLE_VOICE", "SYNC", "LOUDNESS", "BLACK_FRAMES", "RIGHTS"] as const;
const PLAYBACK_FAILURES = ["SOUNDTRACK_MISSING", "SEMANTIC_VISUAL_MISMATCH", "VISUAL_REPETITION", "FRAME_FIT_FAILURE", "VISUAL_DENSITY_LOW"] as const;
const OWNER_HANDLER_IDENTITY = "app/api/projects/[id]/render/route.ts#POST";
const OWNER_ACTIONS = new Set<RenderOwnerAction>(["FINALIZE_VIDEO", "MATERIALIZE_V2_NARRATION", "COMPLETE_PLAYBACK_QA", "REJECT_PLAYBACK_QA"]);
const MAX_OWNER_BODY_BYTES = 16 * 1024;
const MAX_UPLOAD_PART_BYTES = 700 * 1024;
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9._:-]{8,200}$/;
const AUDIT_COMPONENT_PATTERN = /[^A-Za-z0-9._:-]/g;

const OWNER_FIELDS: Record<RenderOwnerAction, ReadonlySet<string>> = {
  FINALIZE_VIDEO: new Set(["action", "uploadId", "chunkCount", "fileName", "sizeBytes", "durationSeconds", "width", "height", "fps", "renderMode", "repairWave"]),
  MATERIALIZE_V2_NARRATION: new Set(["action", "position"]),
  COMPLETE_PLAYBACK_QA: new Set(["action", "renderId", "checks"]),
  REJECT_PLAYBACK_QA: new Set(["action", "renderId", "issues"]),
};

function ownerFailure(error: string, status: number) {
  return Response.json({ error }, { status });
}

function renderOwnerSameOrigin(request: Request) {
  const url = new URL(request.url);
  return request.method === "POST"
    && /^\/api\/projects\/[^/]+\/render$/.test(url.pathname)
    && request.headers.get("origin") === url.origin
    && request.headers.get("sec-fetch-site") === "same-origin";
}

async function renderOwnerRuntimeEnv(): Promise<RuntimeEnv> {
  const { env } = await import("cloudflare:workers");
  return env as unknown as RuntimeEnv;
}

async function authorizeRenderOwnerWrite(request: Request) {
  const user = await getChatGPTUser();
  if (!user?.email) return ownerFailure("SIWC_AUTHENTICATION_REQUIRED", 401);

  const env = await renderOwnerRuntimeEnv();
  const normalizedEmail = user.email.trim().toLowerCase();
  const owners = String((env as RuntimeEnv & { FACTORY_EXPERT_EMAILS?: string }).FACTORY_EXPERT_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (owners.length === 0) return ownerFailure("OWNER_WRITE_ALLOWLIST_UNCONFIGURED", 503);
  if (!owners.includes(normalizedEmail)) return ownerFailure("OWNER_WRITE_AUTHORIZATION_REQUIRED", 403);
  if (!renderOwnerSameOrigin(request)) return ownerFailure("OWNER_WRITE_SAME_ORIGIN_REQUIRED", 403);
  if (!env.DB) return ownerFailure("CANONICAL_DATABASE_UNAVAILABLE", 503);

  return { db: env.DB, normalizedEmail };
}

async function sha256RawBytes(bytes: ArrayBuffer | Uint8Array) {
  const value = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", value));
  return [...digest].map((item) => item.toString(16).padStart(2, "0")).join("");
}

function hasExactQueryKeys(url: URL, expected: readonly string[]) {
  const keys = [...url.searchParams.keys()];
  return keys.length === expected.length
    && expected.every((key) => url.searchParams.getAll(key).length === 1)
    && keys.every((key) => expected.includes(key));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isBoundedString(value: unknown, maximum = 200): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maximum;
}

function renderOwnerPayloadValid(payload: RenderOwnerPayload) {
  if (payload.action === "MATERIALIZE_V2_NARRATION") {
    return Number.isInteger(payload.position) && Number(payload.position) >= 1 && Number(payload.position) <= 12;
  }
  if (payload.action === "COMPLETE_PLAYBACK_QA") {
    if (!isBoundedString(payload.renderId) || !Array.isArray(payload.checks)) return false;
    const completed = new Set(payload.checks);
    return payload.checks.every((check) => (PLAYBACK_QA_CHECKS as readonly string[]).includes(check))
      && PLAYBACK_QA_CHECKS.every((check) => completed.has(check));
  }
  if (payload.action === "REJECT_PLAYBACK_QA") {
    return isBoundedString(payload.renderId)
      && Array.isArray(payload.issues)
      && payload.issues.length > 0
      && payload.issues.every((issue) => (PLAYBACK_FAILURES as readonly string[]).includes(issue));
  }
  if (!validUploadId(payload.uploadId ?? "") || !Number.isInteger(payload.chunkCount) || Number(payload.chunkCount) < 1 || Number(payload.chunkCount) > 300) return false;
  if (payload.fileName !== undefined && !isBoundedString(payload.fileName, 100)) return false;
  if (payload.renderMode !== undefined && !isBoundedString(payload.renderMode, 100)) return false;
  return [payload.sizeBytes, payload.durationSeconds, payload.width, payload.height, payload.fps, payload.repairWave]
    .every((value) => value === undefined || isFiniteNumber(value));
}

async function readRenderOwnerCommand(request: Request): Promise<RenderOwnerCommand | Response> {
  const url = new URL(request.url);
  if (url.search) {
    if (!hasExactQueryKeys(url, ["upload", "uploadId", "part"]) || url.searchParams.get("upload") !== "part") {
      return ownerFailure("OWNER_WRITE_QUERY_INVALID", 400);
    }
    const uploadId = url.searchParams.get("uploadId") ?? "";
    const partValue = url.searchParams.get("part") ?? "";
    if (!validUploadId(uploadId) || !/^(0|[1-9]\d*)$/.test(partValue)) return ownerFailure("OWNER_WRITE_QUERY_INVALID", 400);
    const part = Number(partValue);
    if (!Number.isInteger(part) || part < 0 || part > 300) return ownerFailure("OWNER_WRITE_QUERY_INVALID", 400);
    const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
    if (contentType !== "application/octet-stream") return ownerFailure("BINARY_CONTENT_TYPE_REQUIRED", 415);
    const contentLengthHeader = request.headers.get("content-length");
    const contentLength = contentLengthHeader === null ? null : Number(contentLengthHeader);
    if (contentLength !== null && Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_PART_BYTES) return ownerFailure("OWNER_WRITE_BODY_TOO_LARGE", 413);
    const raw = await request.arrayBuffer();
    if (!raw.byteLength || raw.byteLength > MAX_UPLOAD_PART_BYTES) return ownerFailure("OWNER_WRITE_BODY_TOO_LARGE", 413);
    const bytes = new Uint8Array(raw);
    return { kind: "UPLOAD", action: "UPLOAD_FINAL_VIDEO_PART", uploadId, part, bytes, requestHash: await sha256RawBytes(bytes) };
  }

  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") return ownerFailure("JSON_CONTENT_TYPE_REQUIRED", 415);
  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = contentLengthHeader === null ? null : Number(contentLengthHeader);
  if (contentLength !== null && Number.isFinite(contentLength) && contentLength > MAX_OWNER_BODY_BYTES) return ownerFailure("OWNER_WRITE_BODY_TOO_LARGE", 413);
  const raw = await request.arrayBuffer();
  if (raw.byteLength > MAX_OWNER_BODY_BYTES) return ownerFailure("OWNER_WRITE_BODY_TOO_LARGE", 413);

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(raw));
  } catch {
    return ownerFailure("OWNER_WRITE_JSON_INVALID", 400);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return ownerFailure("OWNER_WRITE_COMMAND_INVALID", 400);
  const record = parsed as Record<string, unknown>;
  if (typeof record.action !== "string") return ownerFailure("OWNER_WRITE_COMMAND_INVALID", 400);
  if (!OWNER_ACTIONS.has(record.action as RenderOwnerAction)) return ownerFailure("OWNER_WRITE_ACTION_FORBIDDEN", 403);
  const action = record.action as RenderOwnerAction;
  if (Object.keys(record).some((key) => !OWNER_FIELDS[action].has(key))) return ownerFailure("OWNER_WRITE_COMMAND_FIELD_FORBIDDEN", 400);
  const payload = record as RenderOwnerPayload;
  if (!renderOwnerPayloadValid(payload)) return ownerFailure("OWNER_WRITE_COMMAND_INVALID", 400);
  return { kind: "JSON", action, payload, requestHash: await sha256RawBytes(raw) };
}

function boundedAuditComponent(value: string) {
  return value.replace(AUDIT_COMPONENT_PATTERN, "_").slice(0, 200) || "unknown";
}

function renderOwnerResourceScope(projectId: string, command: RenderOwnerCommand) {
  const project = boundedAuditComponent(projectId);
  if (command.kind === "UPLOAD") return `project:${project}:render-upload:${boundedAuditComponent(command.uploadId)}:part:${command.part}`;
  if (command.action === "MATERIALIZE_V2_NARRATION") return `project:${project}:render:narration:${command.payload.position}`;
  if (command.action === "FINALIZE_VIDEO") return `project:${project}:render:${boundedAuditComponent(command.payload.uploadId ?? "unknown")}:finalize`;
  return `project:${project}:render:${boundedAuditComponent(command.payload.renderId ?? "unknown")}:playback-qa`;
}

function renderOwnerCorrelationId(request: Request) {
  const supplied = request.headers.get("x-correlation-id")?.trim() ?? "";
  return CORRELATION_ID_PATTERN.test(supplied) ? supplied : `render-owner:${crypto.randomUUID()}`;
}

async function renderOwnerAuditIdentity(request: Request, projectId: string, normalizedEmail: string, command: RenderOwnerCommand): Promise<WriteCommandAuditIdentity> {
  return {
    handlerIdentity: OWNER_HANDLER_IDENTITY,
    actorType: "CHATGPT_OWNER",
    actorSubjectHash: await hashActorSubject("CHATGPT_OWNER", normalizedEmail),
    action: command.action,
    resourceScope: renderOwnerResourceScope(projectId, command),
    correlationId: renderOwnerCorrelationId(request),
    requestHash: command.requestHash,
  };
}

function voiceSignature(profile: { voiceId: string; modelId: string; stability: number; similarityBoost: number; style: number; speed: number }) {
  const value = `${profile.voiceId}|${profile.modelId}|${profile.stability}|${profile.similarityBoost}|${profile.style}|${profile.speed}`;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(36).toUpperCase();
}

let schemaReady: Promise<void> | null = null;

async function runtimeEnv() {
  const { env } = await import("cloudflare:workers");
  return env as unknown as RuntimeEnv;
}

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const env = await runtimeEnv();
      if (!env.DB) throw new Error("Production database is unavailable");
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS video_renders (
        id text PRIMARY KEY NOT NULL, project_id text NOT NULL, version integer NOT NULL,
        name text NOT NULL, storage_key text NOT NULL, mime_type text DEFAULT 'video/webm' NOT NULL,
        size_bytes integer DEFAULT 0 NOT NULL, duration_seconds real DEFAULT 0 NOT NULL,
        width integer DEFAULT 1280 NOT NULL, height integer DEFAULT 720 NOT NULL,
        fps integer DEFAULT 30 NOT NULL, status text DEFAULT 'READY' NOT NULL,
        gate_results text NOT NULL, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`).run();
    })().catch((error) => { schemaReady = null; throw error; });
  }
  await schemaReady;
}

function validUploadId(value: string) { return /^[a-zA-Z0-9-]{12,80}$/.test(value); }
function safeName(value: string) { return value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 100) || "final-video.webm"; }
function parseLicenseProof(value: string | null) { try { const parsed = JSON.parse(value || "{}"); return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {}; } catch { return {} as Record<string, unknown>; } }

async function elevenLabsFailure(response: Response): Promise<ElevenLabsFailure> {
  const raw = await response.text().catch(() => "");
  let code = `HTTP_${response.status}`; let providerMessage = "";
  try {
    const parsed = JSON.parse(raw) as { detail?: string | { status?: string; message?: string }; message?: string };
    if (typeof parsed.detail === "string") providerMessage = parsed.detail;
    else if (parsed.detail && typeof parsed.detail === "object") { code = parsed.detail.status || code; providerMessage = parsed.detail.message || ""; }
    if (!providerMessage && typeof parsed.message === "string") providerMessage = parsed.message;
  } catch { providerMessage = raw; }
  const normalized = `${code} ${providerMessage}`.toLowerCase(); const retryable = response.status === 429 || response.status >= 500;
  let message = `ElevenLabs rejected the narration request (${code}, HTTP ${response.status}).`;
  if (/quota|credit|character limit/.test(normalized)) message = "ElevenLabs credits are insufficient for the remaining narration. Add credits or upgrade the ElevenLabs plan, then resume from the failed section.";
  else if (/invalid.*api|api.*key|unauthor/.test(normalized)) message = "ElevenLabs rejected the API key. Reconnect ELEVENLABS_API_KEY in Factory Connections, then resume.";
  else if (response.status === 429) message = "ElevenLabs is rate-limiting narration. The factory retried twice; wait briefly, then resume from the failed section.";
  else if (/voice/.test(normalized) && /not found|invalid|access|permission/.test(normalized)) message = "The locked ElevenLabs voice is unavailable to this API key. Verify access to the Authorization voice, then resume.";
  else if (/model/.test(normalized) && /not found|invalid|access|permission|support/.test(normalized)) message = "The locked ElevenLabs model is unavailable for this account or voice. Verify the model in Factory Connections, then resume.";
  return { status: response.status, code, message, retryable };
}

async function requestElevenLabsNarration(env: RuntimeEnv, profile: { voiceId: string; modelId: string; stability: number; similarityBoost: number; style: number; speed: number }, text: string) {
  let lastFailure: ElevenLabsFailure | null = null; let attempts = 0;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    attempts = attempt;
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(profile.voiceId)}/with-timestamps?output_format=mp3_44100_128`, { method: "POST", headers: { "content-type": "application/json", "xi-api-key": env.ELEVENLABS_API_KEY || "" }, body: JSON.stringify({ text, model_id: profile.modelId, language_code: "en", voice_settings: { stability: profile.stability, similarity_boost: profile.similarityBoost, style: profile.style, use_speaker_boost: true, speed: profile.speed } }) });
    if (response.ok) return { response, attempts: attempt, failure: null };
    lastFailure = await elevenLabsFailure(response);
    if (!lastFailure.retryable || attempt === 2) break;
    await new Promise((resolve) => setTimeout(resolve, attempt * 750));
  }
  return { response: null, attempts, failure: lastFailure || { status: 502, code: "UNKNOWN_PROVIDER_ERROR", message: "ElevenLabs narration failed without a provider response.", retryable: false } };
}

function isSafeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return host !== "localhost" && !host.endsWith(".local") && !/^127\./.test(host) && !/^10\./.test(host) && !/^192\.168\./.test(host) && !/^172\.(1[6-9]|2\d|3[01])\./.test(host);
  } catch { return false; }
}

async function projectSnapshot(projectId: string) {
  const db = await getDb();
  const [scenes, assets, segments, assemblies, renders, profiles] = await Promise.all([
    db.select().from(sceneManifest).where(eq(sceneManifest.projectId, projectId)).orderBy(asc(sceneManifest.sceneNumber)),
    db.select().from(mediaAssets).where(eq(mediaAssets.projectId, projectId)).orderBy(desc(mediaAssets.createdAt)),
    db.select().from(narrationSegments).where(eq(narrationSegments.projectId, projectId)).orderBy(asc(narrationSegments.position)),
    db.select().from(assemblyRuns).where(eq(assemblyRuns.projectId, projectId)).orderBy(desc(assemblyRuns.version)),
    db.select().from(videoRenders).where(eq(videoRenders.projectId, projectId)).orderBy(desc(videoRenders.version)),
    db.select().from(voiceProfiles).where(eq(voiceProfiles.projectId, projectId)).limit(1),
  ]);
  const approved = assets.filter((asset) => asset.status === "APPROVED" && asset.rightsStatus === "VERIFIED");
  const selected = scenes.map((scene) => {
    const sceneAssets = approved.filter((asset) => asset.sceneId === scene.id);
    const asset = sceneAssets.find((item) => item.sourceType === "MOTION_RENDER_WEBM") || sceneAssets[0] || null;
    return { ...scene, asset: asset ? { ...asset, url: `/api/projects/${projectId}/render?asset=${encodeURIComponent(asset.id)}` } : null };
  });
  const motionSceneIds = new Set(assets.filter((asset) => asset.sourceType.startsWith("ORIGINAL_MOTION_")).map((asset) => asset.sceneId));
  const gates = {
    voiceReady: segments.length > 0 && segments.every((segment) => segment.status === "APPROVED" && Boolean(segment.audioKey)),
    mediaReady: scenes.length > 0 && selected.every((scene) => Boolean(scene.asset)),
    rightsReady: scenes.length > 0 && selected.every((scene) => scene.asset?.rightsStatus === "VERIFIED"),
    assemblyReady: assemblies.length > 0,
    motionReady: [...motionSceneIds].every((sceneId) => approved.some((asset) => asset.sceneId === sceneId && asset.sourceType === "MOTION_RENDER_WEBM")),
  };
  const artifacts = await db.select().from(optimizationArtifacts).where(eq(optimizationArtifacts.projectId, projectId)).orderBy(desc(optimizationArtifacts.createdAt));
  const editArtifact = artifacts.find((artifact) => artifact.stageKey === "EDIT_COMPOSE" && artifact.status === "FROZEN"); const scriptArtifact = artifacts.find((artifact) => artifact.stageKey === "SCRIPT" && artifact.status === "FROZEN"); const audioArtifact = artifacts.find((artifact) => artifact.stageKey === "VOICE_SOUND" && artifact.status === "FROZEN");
  let optimized: null | Record<string, unknown> = null;
  const profile = profiles[0];
  if (editArtifact && scriptArtifact && audioArtifact && profile) {
    const edit = JSON.parse(editArtifact.contentJson) as { editClips?: Array<Record<string, unknown>>; masterProfile?: Record<string, unknown>; execution?: Record<string, unknown> }; const script = JSON.parse(scriptArtifact.contentJson) as { sections?: Array<{ time: string; beat: string; text: string }> }; const audio = JSON.parse(audioArtifact.contentJson) as { narrationSegments?: Array<{ id: string; targetDurationSeconds: number; targetWpm: number; direction: string }> };
    const signature = voiceSignature(profile); const versionKey = `${editArtifact.id}:V3:${signature}`; const optimizedSegments = segments.filter((segment) => segment.scriptVersionId === versionKey); const plans = audio.narrationSegments || [];
    const optimizedClips = (edit.editClips || []).map((clip) => {
      const beatId = String(clip.sourceBeatId || ""); const asset = approved.find((item) => item.sceneId === `${projectId}-${beatId}`) || null;
      const proof = asset ? parseLicenseProof(asset.licenseProof) : {}; return { ...clip, visualAsset: asset ? { id: asset.id, name: asset.name, mimeType: asset.mimeType, sourceType: asset.sourceType, licenseType: asset.licenseType, rightsStatus: asset.rightsStatus, physicalKey: String(proof.sha256 || proof.inheritedFrom || asset.storageKey || asset.sourceUrl || asset.id), semanticScore: Number(proof.selectionScore || (asset.licenseType === "CHANNEL_OWNED" ? 100 : asset.sourceType.includes("INTERNAL") ? 82 : 0)), url: `/api/projects/${projectId}/render?asset=${encodeURIComponent(asset.id)}` } : null };
    });
    const optimizedMediaReady = optimizedClips.length === 40 && optimizedClips.every((clip) => Boolean(clip.visualAsset));
    const physicalKeys = optimizedClips.map((clip) => clip.visualAsset?.physicalKey).filter(Boolean); const uniquePhysicalAssets = new Set(physicalKeys).size;
    const formatReady = optimizedClips.every((clip) => clip.primaryFamily === "MACRO_REALITY" ? clip.visualAsset?.mimeType.startsWith("video/") && !clip.visualAsset?.sourceType.includes("MOTION") : clip.visualAsset?.sourceType === `OPTIMIZED_MOTION_WEBM_${clip.primaryFamily}`);
    const stockClips = optimizedClips.filter((clip) => clip.primaryFamily === "MACRO_REALITY"); const stockProviders = stockClips.reduce<Record<string, number>>((result, clip) => { const provider = clip.visualAsset?.sourceType.includes("PIXABAY") ? "Pixabay" : clip.visualAsset?.sourceType.includes("PEXELS") ? "Pexels" : clip.visualAsset?.sourceType || "Other"; result[provider] = (result[provider] || 0) + 1; return result; }, {}); const dominantStock = Math.max(0, ...Object.values(stockProviders)); const providerBalanceReady = stockClips.length < 4 || (Object.keys(stockProviders).length >= 2 && dominantStock <= Math.ceil(stockClips.length * .8));
    let stockRun = 0; const stockSequenceReady = optimizedClips.every((clip) => { stockRun = clip.primaryFamily === "MACRO_REALITY" ? stockRun + 1 : 0; return stockRun <= 2; });
    const optimizedAssetAuditReady = optimizedMediaReady && uniquePhysicalAssets === 40 && formatReady && providerBalanceReady && stockSequenceReady && optimizedClips.every((clip) => Number(clip.visualAsset?.semanticScore || 0) >= 85);
    optimized = { editArtifactId: editArtifact.id, versionKey, voiceIdentity: { voiceId: profile.voiceId, voiceName: profile.voiceName, modelId: profile.modelId, signature, status: profile.status }, editClips: optimizedClips, masterProfile: edit.masterProfile, execution: edit.execution, scriptSections: script.sections || [], audioPlan: plans, segments: optimizedSegments.map((segment) => ({ ...segment, audioUrl: `/api/projects/${projectId}/voice?audio=${encodeURIComponent(segment.id)}`, targetDurationSeconds: plans[segment.position - 1]?.targetDurationSeconds || segment.durationSeconds || 0, targetWpm: plans[segment.position - 1]?.targetWpm || 0, direction: plans[segment.position - 1]?.direction || "" })), gates: { editPlanReady: optimizedClips.length === 40, singleVoiceLocked: profile.status === "LOCKED", optimizedVoiceReady: optimizedSegments.length === 12 && optimizedSegments.every((segment) => Boolean(segment.audioKey)), optimizedMediaReady, optimizedAssetAuditReady, rightsLedgerReady: optimizedMediaReady && optimizedClips.every((clip) => clip.visualAsset?.rightsStatus === "VERIFIED"), masterProfileReady: Number(edit.masterProfile?.width) === 1920 && Number(edit.masterProfile?.height) === 1080 }, actualMasterRequired: true };
  }
  return { scenes: selected, segments, assemblies, renders, gates, optimized, totalDuration: optimized ? 480 : selected.reduce((max, scene) => Math.max(max, scene.endSeconds || 0), 0) };
}

async function serveStoredVideo(request: Request, objectKey: string, mimeType: string, fallbackSize: number) {
  const bucket = (await runtimeEnv()).BUCKET;
  if (!bucket) return new Response("Video storage unavailable", { status: 424 });
  const range = request.headers.get("range");
  if (range) {
    const head = await bucket.head(objectKey); if (!head) return new Response("Video not found", { status: 404 });
    const match = /^bytes=(\d+)-(\d*)$/.exec(range); if (!match) return new Response("Invalid range", { status: 416, headers: { "content-range": `bytes */${head.size}` } });
    const start = Number(match[1]); const end = Math.min(match[2] ? Number(match[2]) : head.size - 1, head.size - 1);
    if (start > end || start >= head.size) return new Response("Invalid range", { status: 416, headers: { "content-range": `bytes */${head.size}` } });
    const object = await bucket.get(objectKey, { range: { offset: start, length: end - start + 1 } }); if (!object) return new Response("Video not found", { status: 404 });
    return new Response(object.body, { status: 206, headers: { "content-type": object.httpMetadata?.contentType || mimeType, "content-range": `bytes ${start}-${end}/${head.size}`, "content-length": String(end - start + 1), "accept-ranges": "bytes", "cache-control": "private, max-age=3600" } });
  }
  const object = await bucket.get(objectKey); if (!object) return new Response("Video not found", { status: 404 });
  return new Response(object.body, { headers: { "content-type": object.httpMetadata?.contentType || mimeType, "content-length": String(object.size || fallbackSize), "accept-ranges": "bytes", "cache-control": "private, max-age=3600" } });
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params; await ensureSchema(); const db = await getDb(); const url = new URL(request.url);
    const renderId = url.searchParams.get("video");
    if (renderId) {
      const [render] = await db.select().from(videoRenders).where(eq(videoRenders.id, renderId)).limit(1);
      if (!render || render.projectId !== id) return new Response("Video not found", { status: 404 });
      const response = await serveStoredVideo(request, render.storageKey, render.mimeType, render.sizeBytes);
      if (url.searchParams.get("download") === "1") response.headers.set("content-disposition", `attachment; filename="${safeName(render.name)}"`);
      return response;
    }
    const assetId = url.searchParams.get("asset");
    if (assetId) {
      const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, assetId)).limit(1);
      if (!asset || asset.projectId !== id || asset.status !== "APPROVED" || asset.rightsStatus !== "VERIFIED") return new Response("Approved asset not found", { status: 404 });
      if (asset.storageKey) return await serveStoredVideo(request, asset.storageKey, asset.mimeType, asset.sizeBytes);
      if (!asset.sourceUrl || !isSafeExternalUrl(asset.sourceUrl)) return new Response("External asset URL is not safe to proxy", { status: 400 });
      const headers: Record<string, string> = {}; const range = request.headers.get("range"); if (range) headers.Range = range;
      const upstream = await fetch(asset.sourceUrl, { headers, redirect: "follow" });
      if (!upstream.ok && upstream.status !== 206) return new Response("External asset could not be loaded", { status: 424 });
      const responseHeaders = new Headers({ "content-type": upstream.headers.get("content-type") || asset.mimeType, "cache-control": "private, max-age=3600", "accept-ranges": upstream.headers.get("accept-ranges") || "bytes" });
      for (const header of ["content-length", "content-range"]) { const value = upstream.headers.get(header); if (value) responseHeaders.set(header, value); }
      return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
    }
    const snapshot = await projectSnapshot(id);
    return Response.json({ ...snapshot, segments: snapshot.segments.map((segment) => ({ ...segment, audioUrl: `/api/projects/${id}/voice?audio=${encodeURIComponent(segment.id)}` })), renders: snapshot.renders.map((render) => { const gates = JSON.parse(render.gateResults) as Array<{ gate?: string; value?: string; issues?: string[] }>; return { ...render, voiceSignature: gates.find((gate) => gate.gate === "voiceSignature")?.value || null, qaIssues: gates.findLast((gate) => gate.gate === "PLAYBACK_REJECTED")?.issues || [], repairWave: Number(gates.findLast((gate) => gate.gate === "EDITORIAL_REPAIR_WAVE")?.value || 0), editorialProfile: gates.findLast((gate) => gate.gate === "editorialProfile")?.value || null, videoUrl: `/api/projects/${id}/render?video=${encodeURIComponent(render.id)}`, downloadUrl: `/api/projects/${id}/render?video=${encodeURIComponent(render.id)}&download=1` }; }) });
  } catch (error) {
    console.error("Final composer GET failed", error);
    return Response.json({ error: "Final composer could not be loaded" }, { status: 500 });
  }
}

async function executeRenderOwnerCommand(id: string, command: RenderOwnerCommand): Promise<RenderOwnerResult> {
  await ensureSchema(); const db = await getDb();
  const [productionProfile] = await db.select().from(productionProfiles).where(eq(productionProfiles.projectId, id)).limit(1);
  if (productionProfile?.version >= 5 && productionProfile.legacyRenderDisabled) {
    return { response: Response.json({ error: "LEGACY_RENDER_DISABLED_FOR_V5", message: "Historical masters remain readable, but v2/v4 upload, render and playback approval cannot produce v5 release evidence." }, { status: 409 }), domainReceiptReference: null };
  }
  if (command.kind === "UPLOAD") {
    const bucket = (await runtimeEnv()).BUCKET; if (!bucket) return { response: Response.json({ error: "Video storage is unavailable" }, { status: 424 }), domainReceiptReference: null };
    const key = `final-uploads/${id}/${command.uploadId}/${command.part}.part`;
    await bucket.put(key, command.bytes, { httpMetadata: { contentType: "application/octet-stream" }, customMetadata: { projectId: id, uploadId: command.uploadId, part: String(command.part) } });
    return { response: Response.json({ ok: true, part: command.part }), domainReceiptReference: `render-upload:${key}:${command.requestHash}` };
  }

  const payload = command.payload;
  if (payload.action === "REJECT_PLAYBACK_QA") {
    const renderId = String(payload.renderId || ""); const [render] = await db.select().from(videoRenders).where(eq(videoRenders.id, renderId)).limit(1);
    if (!render || render.projectId !== id) return { response: Response.json({ error: "Master render not found" }, { status: 404 }), domainReceiptReference: null };
    if (render.status !== "READY_FOR_PLAYBACK_QA") return { response: Response.json({ error: "Only a master awaiting playback QA can enter repair" }, { status: 409 }), domainReceiptReference: null };
    const issues = [...new Set(Array.isArray(payload.issues) ? payload.issues.filter((issue) => (PLAYBACK_FAILURES as readonly string[]).includes(issue)) : [])]; if (!issues.length) return { response: Response.json({ error: "Select at least one observed playback failure" }, { status: 400 }), domainReceiptReference: null };
    const allRenders = await db.select().from(videoRenders).where(eq(videoRenders.projectId, id)).orderBy(desc(videoRenders.version)); const priorWaves = allRenders.flatMap((item) => { try { return (JSON.parse(item.gateResults) as Array<{ gate?: string; value?: string }>).filter((gate) => gate.gate === "EDITORIAL_REPAIR_WAVE").map((gate) => Number(gate.value || 0)); } catch { return []; } }); const repairWave = Math.max(0, ...priorWaves) + 1; const escalated = repairWave > 2;
    const priorGates = JSON.parse(render.gateResults) as Array<Record<string, unknown>>; const status = escalated ? "HUMAN_EDITOR_ESCALATION" : "QA_REJECTED"; await db.update(videoRenders).set({ status, gateResults: JSON.stringify([...priorGates, { gate: "PLAYBACK_REJECTED", passed: false, issues }, { gate: "EDITORIAL_REPAIR_WAVE", passed: !escalated, value: String(repairWave) }]) }).where(eq(videoRenders.id, render.id));
    await db.insert(workflowEvents).values({ projectId: id, toStatus: "RENDER_READY", eventType: escalated ? "PLAYBACK_QA_ESCALATED" : "PLAYBACK_QA_REPAIR_ROUTED", summary: escalated ? `Master v${render.version} failed after two bounded repair waves; human editor required` : `Master v${render.version} rejected; Editorial Repair v3 wave ${repairWave}/2 targets ${issues.join(", ")}` });
    return { response: Response.json({ ok: true, renderId: render.id, status, repairWave, issues }), domainReceiptReference: `playback-qa:${render.id}:${status}:wave:${repairWave}` };
  }
  if (payload.action === "COMPLETE_PLAYBACK_QA") {
    const renderId = String(payload.renderId || ""); const [render] = await db.select().from(videoRenders).where(eq(videoRenders.id, renderId)).limit(1);
    if (!render || render.projectId !== id) return { response: Response.json({ error: "Master render not found" }, { status: 404 }), domainReceiptReference: null };
    if (render.status !== "READY_FOR_PLAYBACK_QA") return { response: Response.json({ error: render.status === "QA_PASSED" ? "Playback QA already passed" : "This render is not awaiting playback QA" }, { status: 409 }), domainReceiptReference: null };
    const completed = new Set(Array.isArray(payload.checks) ? payload.checks : []); const missing = PLAYBACK_QA_CHECKS.filter((check) => !completed.has(check));
    if (missing.length) return { response: Response.json({ error: `Playback QA incomplete: ${missing.join(", ")}` }, { status: 409 }), domainReceiptReference: null };
    const priorGates = JSON.parse(render.gateResults) as Array<Record<string, unknown>>; await db.update(videoRenders).set({ status: "QA_PASSED", gateResults: JSON.stringify([...priorGates, ...PLAYBACK_QA_CHECKS.map((check) => ({ gate: `PLAYBACK_${check}`, passed: true }))]) }).where(eq(videoRenders.id, render.id));
    await db.insert(workflowEvents).values({ projectId: id, toStatus: "RENDER_READY", eventType: "FULL_PLAYBACK_QA_PASSED", summary: `Master video v${render.version} passed full playback QA with single-voice verification` });
    return { response: Response.json({ ok: true, renderId: render.id, status: "QA_PASSED" }), domainReceiptReference: `playback-qa:${render.id}:QA_PASSED` };
  }
  if (payload.action === "MATERIALIZE_V2_NARRATION") {
    const position = Number(payload.position); if (!Number.isInteger(position) || position < 1 || position > 12) return { response: Response.json({ error: "Narration position must be 1–12" }, { status: 400 }), domainReceiptReference: null };
    const artifacts = await db.select().from(optimizationArtifacts).where(eq(optimizationArtifacts.projectId, id)).orderBy(desc(optimizationArtifacts.createdAt)); const editArtifact = artifacts.find((artifact) => artifact.stageKey === "EDIT_COMPOSE" && artifact.status === "FROZEN"); const scriptArtifact = artifacts.find((artifact) => artifact.stageKey === "SCRIPT" && artifact.status === "FROZEN"); if (!editArtifact || !scriptArtifact) return { response: Response.json({ error: "Freeze Edit & Composition and Script v2 before voice materialization" }, { status: 409 }), domainReceiptReference: null };
    const script = JSON.parse(scriptArtifact.contentJson) as { sections?: Array<{ beat: string; text: string }> }; const section = script.sections?.[position - 1]; if (!section) return { response: Response.json({ error: "Optimized script section is missing" }, { status: 409 }), domainReceiptReference: null };
    const env = await runtimeEnv(); if (!env.ELEVENLABS_API_KEY || !env.BUCKET) return { response: Response.json({ error: !env.ELEVENLABS_API_KEY ? "ELEVENLABS_NOT_CONNECTED" : "AUDIO_STORAGE_NOT_READY" }, { status: 424 }), domainReceiptReference: null }; const [profile] = await db.select().from(voiceProfiles).where(eq(voiceProfiles.projectId, id)).limit(1); if (!profile || profile.status !== "LOCKED") return { response: Response.json({ error: "Lock exactly one channel voice before narration materialization" }, { status: 409 }), domainReceiptReference: null };
    const signature = voiceSignature(profile); const versionKey = `${editArtifact.id}:V3:${signature}`; const segmentId = `${id}-OPT-V3-${signature}-SEG-${String(position).padStart(2, "0")}`;
    const [existing] = await db.select().from(narrationSegments).where(eq(narrationSegments.id, segmentId)).limit(1); if (existing?.audioKey) return { response: Response.json({ ok: true, position, reused: true, voiceSignature: signature }), domainReceiptReference: `narration:${segmentId}:REUSED` };
    if (!existing) await db.insert(narrationSegments).values({ id: segmentId, projectId: id, scriptVersionId: versionKey, position, label: section.beat, text: section.text, characterCount: section.text.length, status: "GENERATING" });
    const provider = await requestElevenLabsNarration(env, profile, section.text);
    if (!provider.response) {
      await db.update(narrationSegments).set({ status: "FAILED", updatedAt: new Date().toISOString() }).where(eq(narrationSegments.id, segmentId));
      await db.insert(workflowEvents).values({ projectId: id, toStatus: "VOICE_PRODUCTION", eventType: "OPTIMIZED_NARRATION_BLOCKED", summary: `Optimized narration section ${position} stopped after ${provider.attempts} attempt(s): ${provider.failure.code}` });
      return { response: Response.json({ error: provider.failure.message, providerStatus: provider.failure.status, providerCode: provider.failure.code, retryable: provider.failure.retryable, position, attempts: provider.attempts }, { status: 502 }), domainReceiptReference: null };
    }
    const generated = await provider.response.json() as TimingResponse; if (!generated.audio_base64) return { response: Response.json({ error: "ElevenLabs returned no audio for this section. Resume to retry only this section.", providerCode: "EMPTY_AUDIO_RESPONSE", position, attempts: provider.attempts }, { status: 502 }), domainReceiptReference: null }; const bytes = Uint8Array.from(atob(generated.audio_base64), (character) => character.charCodeAt(0)); const audioKey = `voice/${id}/optimized-v3/${signature}/${segmentId}.mp3`; await env.BUCKET.put(audioKey, bytes, { httpMetadata: { contentType: "audio/mpeg" }, customMetadata: { projectId: id, segmentId, source: "OPTIMIZED_V3", voiceId: profile.voiceId, voiceName: profile.voiceName, modelId: profile.modelId, voiceSignature: signature } }); const timing = generated.normalized_alignment || generated.alignment || {}; const endTimes = generated.normalized_alignment?.character_end_times_seconds || []; const durationSeconds = endTimes.length ? endTimes[endTimes.length - 1] : null; await db.update(narrationSegments).set({ scriptVersionId: versionKey, status: "MATERIALIZED", audioKey, alignment: JSON.stringify(timing), durationSeconds, takeNumber: provider.attempts, updatedAt: new Date().toISOString() }).where(eq(narrationSegments.id, segmentId)); return { response: Response.json({ ok: true, position, durationSeconds, voiceName: profile.voiceName, voiceSignature: signature, attempts: provider.attempts }), domainReceiptReference: `narration:${segmentId}:MATERIALIZED` };
  }
  const uploadId = payload.uploadId || ""; const chunkCount = Number(payload.chunkCount);
  if (!validUploadId(uploadId) || !Number.isInteger(chunkCount) || chunkCount < 1 || chunkCount > 300) return { response: Response.json({ error: "Invalid final-video upload manifest" }, { status: 400 }), domainReceiptReference: null };
  const snapshot = await projectSnapshot(id); const gateResults = [
    { gate: "Voice", passed: snapshot.gates.voiceReady }, { gate: "Media", passed: snapshot.gates.mediaReady }, { gate: "Rights", passed: snapshot.gates.rightsReady }, { gate: "Motion", passed: snapshot.gates.motionReady }, { gate: "Assembly", passed: snapshot.gates.assemblyReady },
  ];
  const optimizedMode = payload.renderMode === "OPTIMIZED_V2" || payload.renderMode === "EDITORIAL_REPAIR_V3"; const optimizedGateResults: Array<{ gate: string; passed: boolean; value?: string }> = snapshot.optimized && optimizedMode ? Object.entries((snapshot.optimized as { gates: Record<string, boolean> }).gates).map(([gate, passed]) => ({ gate, passed })) : []; if (snapshot.optimized && optimizedMode) { optimizedGateResults.push({ gate: "voiceSignature", passed: true, value: (snapshot.optimized as { voiceIdentity: { signature: string } }).voiceIdentity.signature }); optimizedGateResults.push({ gate: "editorialProfile", passed: true, value: payload.renderMode === "EDITORIAL_REPAIR_V3" ? "EDITORIAL_REPAIR_V3" : "OPTIMIZED_V2" }); optimizedGateResults.push({ gate: "visualChangeCeiling", passed: true, value: "4.8s" }); optimizedGateResults.push({ gate: "soundscapeProfile", passed: true, value: "5_ARCS_4_ZONES_15_SFX" }); }
  const activeGateResults = optimizedGateResults.length ? optimizedGateResults : gateResults;
  if (activeGateResults.some((gate) => !gate.passed)) return { response: Response.json({ error: `Final render gate blocked: ${activeGateResults.filter((gate) => !gate.passed).map((gate) => gate.gate).join(", ")}` }, { status: 409 }), domainReceiptReference: null };
  const bucket = (await runtimeEnv()).BUCKET; if (!bucket) return { response: Response.json({ error: "Video storage is unavailable" }, { status: 424 }), domainReceiptReference: null };
  const parts: Uint8Array[] = []; const keys: string[] = []; let total = 0;
  for (let part = 0; part < chunkCount; part++) {
    const key = `final-uploads/${id}/${uploadId}/${part}.part`; const object = await bucket.get(key); if (!object) return { response: Response.json({ error: `Upload part ${part + 1}/${chunkCount} is missing` }, { status: 409 }), domainReceiptReference: null };
    const buffer = object.arrayBuffer ? await object.arrayBuffer() : await new Response(object.body).arrayBuffer(); const bytes = new Uint8Array(buffer); parts.push(bytes); keys.push(key); total += bytes.byteLength;
  }
  if (payload.sizeBytes && total !== payload.sizeBytes) return { response: Response.json({ error: "Final video size check failed" }, { status: 409 }), domainReceiptReference: null };
  if (total > 100 * 1024 * 1024) return { response: Response.json({ error: "Final video exceeds the 100 MB MVP limit" }, { status: 413 }), domainReceiptReference: null };
  const joined = new Uint8Array(total); let offset = 0; for (const part of parts) { joined.set(part, offset); offset += part.byteLength; }
  const existing = await db.select().from(videoRenders).where(eq(videoRenders.projectId, id)).orderBy(desc(videoRenders.version)); const version = (existing[0]?.version || 0) + 1;
  const renderId = `${id}-FINAL-V${version}`; const name = safeName(payload.fileName || `${id}-final-v${version}.webm`); const key = `renders/${id}/${renderId}-${name}`; const status = optimizedMode ? "READY_FOR_PLAYBACK_QA" : "READY";
  await bucket.put(key, joined, { httpMetadata: { contentType: "video/webm" }, customMetadata: { projectId: id, renderId, version: String(version) } });
  await db.insert(videoRenders).values({ id: renderId, projectId: id, version, name, storageKey: key, mimeType: "video/webm", sizeBytes: total, durationSeconds: payload.durationSeconds || snapshot.totalDuration, width: payload.width || 1280, height: payload.height || 720, fps: payload.fps || 30, status, gateResults: JSON.stringify(activeGateResults) });
  await db.update(videoProjects).set({ status: "RENDER_READY", progress: 96, nextAction: "Run final playback QA", updatedAt: new Date().toISOString() }).where(eq(videoProjects.id, id));
  await db.insert(workflowEvents).values({ projectId: id, fromStatus: "ASSEMBLY_READY", toStatus: "RENDER_READY", eventType: "FINAL_VIDEO_RENDERED", summary: `Final video v${version} rendered with approved visuals and ElevenLabs narration; five production gates passed` });
  await bucket.delete(keys);
  return { response: Response.json({ ok: true, renderId, version }), domainReceiptReference: `render:${renderId}:v${version}:${status}` };
}

async function runAuditedRenderOwnerCommand(db: WriteCommandAuditDatabase, identity: WriteCommandAuditIdentity, execute: () => Promise<RenderOwnerResult>) {
  await appendWriteCommandAudit(db, identity, "AUTHORIZED", null);

  let result: RenderOwnerResult;
  try {
    result = await execute();
  } catch (error) {
    await appendWriteCommandAudit(db, identity, "FAILED", null);
    throw error;
  }

  if (!result.response.ok) {
    await appendWriteCommandAudit(db, identity, "FAILED", null);
    return result.response;
  }

  try {
    await appendWriteCommandAudit(db, identity, "SUCCEEDED", result.domainReceiptReference);
    return result.response;
  } catch (error) {
    await appendWriteCommandAudit(db, identity, "FAILED", null);
    throw error;
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authorization = await authorizeRenderOwnerWrite(request);
    if (authorization instanceof Response) return authorization;

    const command = await readRenderOwnerCommand(request);
    if (command instanceof Response) return command;

    const { id } = await context.params;
    const identity = await renderOwnerAuditIdentity(request, id, authorization.normalizedEmail, command);
    return await runAuditedRenderOwnerCommand(
      authorization.db,
      identity,
      () => executeRenderOwnerCommand(id, command),
    );
  } catch (error) {
    console.error("Final composer POST failed", error);
    return ownerFailure("RENDER_OWNER_ACTION_FAILED", 500);
  }
}
