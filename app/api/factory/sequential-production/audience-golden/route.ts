import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  AudienceGoldenError,
  audienceGoldenSnapshot,
  bootstrapAudienceGoldenAuthorized,
  commitAudienceGoldenMaterializationAuthorized,
  createAudienceGoldenRepairRevisionAuthorized,
  generateAudienceGoldenAudioAuthorized,
  readAudienceGoldenMediaAuthorized,
  recordAudienceGoldenBrowserQaAuthorized,
  recordAudienceGoldenOwnerDecisionAuthorized,
  runAudienceGoldenAudioQaAuthorized,
  runAudienceGoldenAudioQaRecoveryAuthorized,
  runAudienceGoldenVisualQaAuthorized,
  stageAudienceGoldenChunkAuthorized,
  type AudienceGoldenBucket,
  type AudienceGoldenDB,
  type AudienceGoldenEnv,
} from "@/lib/youtube-audience-golden";

export const dynamic = "force-dynamic";
const NO_STORE = { "cache-control": "no-store" };
type RuntimeEnv = AudienceGoldenEnv & { FACTORY_EXPERT_EMAILS?: string; FACTORY_AUTOMATION_ACTOR_EMAIL?: string; AUDIENCE_GOLDEN_AUTOMATION_TOKEN?: string };
type Row = Record<string, unknown>;
const clean = (value: unknown) => String(value ?? "").trim();
const fromBase64 = (value: string) => { const binary = atob(value), bytes = new Uint8Array(binary.length); for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index); return bytes; };
async function secretMatches(left: string, right: string) { if (!left || !right) return false; const encode = (value: string) => new TextEncoder().encode(value), [a, b] = await Promise.all([crypto.subtle.digest("SHA-256", encode(left)), crypto.subtle.digest("SHA-256", encode(right))]); const av = new Uint8Array(a), bv = new Uint8Array(b); let difference = av.length ^ bv.length; for (let index = 0; index < Math.min(av.length, bv.length); index += 1) difference |= av[index] ^ bv[index]; return difference === 0; }

async function authorized(request: Request, allowAutomation = false) {
  const { env } = await import("cloudflare:workers") as unknown as { env: RuntimeEnv };
  if (!env.DB || !env.BUCKET) throw new AudienceGoldenError("RUNTIME_UNAVAILABLE", 503, "Canonical D1 and R2 bindings are required");
  let user = await getChatGPTUser();
  const scopedAutomation = allowAutomation && await secretMatches(clean(request.headers.get("x-audience-golden-automation-token")), clean(env.AUDIENCE_GOLDEN_AUTOMATION_TOKEN));
  if (!user && scopedAutomation && clean(env.FACTORY_AUTOMATION_ACTOR_EMAIL)) user = { email: clean(env.FACTORY_AUTOMATION_ACTOR_EMAIL), displayName: "Audience Golden Executor", fullName: null };
  if (!user) throw new AudienceGoldenError("SIWC_AUTHENTICATION_REQUIRED", 401, "Owner or scoped Golden executor authentication is required");
  const allowlist = new Set(clean(env.FACTORY_EXPERT_EMAILS).split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
  if (!allowlist.has(user.email.toLowerCase())) throw new AudienceGoldenError("CHANNEL_OWNER_AUTHORIZATION_REQUIRED", 403, "This identity cannot operate the Golden Sequence");
  return { env: env as RuntimeEnv & { DB: AudienceGoldenDB; BUCKET: AudienceGoldenBucket }, actor: user.email.toLowerCase() };
}

function errorResponse(error: unknown) {
  const known = error instanceof AudienceGoldenError ? error : new AudienceGoldenError("AUDIENCE_GOLDEN_FAILED", 500, error instanceof Error ? error.message : "Unexpected Golden Sequence failure");
  return Response.json({ error: { code: known.code, message: known.message } }, { status: known.status, headers: NO_STORE });
}

export async function GET(request: Request) {
  try {
    const { env } = await authorized(request, true), media = new URL(request.url).searchParams.get("media");
    if (!media) return Response.json(await audienceGoldenSnapshot(env.DB), { headers: NO_STORE });
    const result = await readAudienceGoldenMediaAuthorized(env, media), range = request.headers.get("range"), common = { "accept-ranges": "bytes", "cache-control": "private, no-store", "content-type": result.mimeType, etag: `"${result.hash}"` };
    if (!range) return new Response(result.bytes, { headers: { ...common, "content-length": String(result.bytes.byteLength) } });
    const match = /^bytes=(\d*)-(\d*)$/.exec(range); if (!match) return new Response(null, { status: 416, headers: { ...common, "content-range": `bytes */${result.bytes.byteLength}` } });
    const start = match[1] ? Number(match[1]) : 0, end = match[2] ? Math.min(Number(match[2]), result.bytes.byteLength - 1) : result.bytes.byteLength - 1;
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= result.bytes.byteLength) return new Response(null, { status: 416, headers: { ...common, "content-range": `bytes */${result.bytes.byteLength}` } });
    const slice = result.bytes.slice(start, end + 1); return new Response(slice, { status: 206, headers: { ...common, "content-length": String(slice.byteLength), "content-range": `bytes ${start}-${end}/${result.bytes.byteLength}` } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as Row | null, action = clean(body?.action).toUpperCase();
    if (!body) throw new AudienceGoldenError("JSON_BODY_REQUIRED", 400, "A JSON request body is required");
    const { env, actor } = await authorized(request, action !== "OWNER_DECISION"), idempotencyKey = clean(request.headers.get("idempotency-key"));
    if (action === "BOOTSTRAP") return Response.json(await bootstrapAudienceGoldenAuthorized(env, actor, idempotencyKey), { status: 201, headers: NO_STORE });
    if (action === "CREATE_REPAIR_REVISION") return Response.json(await createAudienceGoldenRepairRevisionAuthorized(env, actor, idempotencyKey), { status: 201, headers: NO_STORE });
    if (action === "GENERATE_AUDIO") return Response.json(await generateAudienceGoldenAudioAuthorized(env, actor, idempotencyKey), { status: 201, headers: NO_STORE });
    if (action === "STAGE_CHUNK") return Response.json(await stageAudienceGoldenChunkAuthorized(env, { blueprintId: clean(body.blueprintId), role: clean(body.role), fullHash: clean(body.fullHash), totalBytes: Number(body.totalBytes), chunkIndex: Number(body.chunkIndex), chunkCount: Number(body.chunkCount), chunkHash: clean(body.chunkHash), bytes: fromBase64(clean(body.base64)) }), { status: 201, headers: NO_STORE });
    if (action === "COMMIT_MATERIALIZATION") return Response.json(await commitAudienceGoldenMaterializationAuthorized(env, actor, idempotencyKey, body), { status: 201, headers: NO_STORE });
    if (action === "RUN_FACTORY_VISUAL_QA") return Response.json(await runAudienceGoldenVisualQaAuthorized(env, actor, idempotencyKey), { status: 201, headers: NO_STORE });
    if (action === "RUN_FACTORY_AUDIO_QA") return Response.json(await runAudienceGoldenAudioQaAuthorized(env, actor, idempotencyKey), { status: 201, headers: NO_STORE });
    if (action === "RUN_FACTORY_AUDIO_QA_RECOVERY") return Response.json(await runAudienceGoldenAudioQaRecoveryAuthorized(env, actor, idempotencyKey), { status: 201, headers: NO_STORE });
    if (action === "RECORD_BROWSER_QA") return Response.json(await recordAudienceGoldenBrowserQaAuthorized(env, actor, idempotencyKey, body.evidence as Row), { status: 201, headers: NO_STORE });
    if (action === "OWNER_DECISION") return Response.json(await recordAudienceGoldenOwnerDecisionAuthorized(env, actor, idempotencyKey, body), { status: 201, headers: NO_STORE });
    throw new AudienceGoldenError("ACTION_INVALID", 400, "Unsupported Golden Sequence action");
  } catch (error) { return errorResponse(error); }
}
