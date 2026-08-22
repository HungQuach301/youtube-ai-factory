import { getChatGPTUser } from "@/app/chatgpt-auth";
import { ProductionV2CommandError, readArtifact, startGoldenPilot, storePilotUpload, type ProductionV2Bucket, type ProductionV2CommandDB } from "@/lib/production-v2-command";
import { prepareFullVideo, reconcileStaleProviderRequests, storeFullEvidence } from "@/lib/production-v2-scale";
import { productionV2Projection, type ProductionV2DB } from "@/lib/production-v2-projection";

export const dynamic = "force-dynamic";
const NO_STORE = { "cache-control": "no-store" };
type RuntimeEnv = { DB?: ProductionV2DB & ProductionV2CommandDB; BUCKET?: ProductionV2Bucket; OPENAI_API_KEY?: string; ELEVENLABS_API_KEY?: string; FACTORY_EXPERT_EMAILS?: string; FACTORY_AUTOMATION_ACTOR_EMAIL?: string; FACTORY_AUTOMATION_ACTOR_NAME?: string; PRODUCTION_V2_EXECUTOR_TOKEN?: string };
async function runtime() { const { env } = await import("cloudflare:workers"); return env as unknown as RuntimeEnv; }
function failure(code: string, message: string, status: number) {
  return Response.json({ error: { code, message }, fallback: false }, { status, headers: NO_STORE });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url), channelId = url.searchParams.get("channel") || "channel-hidden-systems";
    const env = await runtime();
    if (!env.DB) return failure("CANONICAL_DATABASE_UNAVAILABLE", "Canonical database binding is unavailable", 503);
    const artifactId = url.searchParams.get("artifact");
    if (artifactId) {
      if (!env.BUCKET) return failure("PRODUCTION_STORAGE_UNAVAILABLE", "Production V2 object storage is unavailable", 503);
      const { artifact, object } = await readArtifact({ DB: env.DB, BUCKET: env.BUCKET, ELEVENLABS_API_KEY: env.ELEVENLABS_API_KEY }, artifactId);
      return new Response(object.body, { headers: { ...NO_STORE, "content-type": String(artifact.mime_type), "content-length": String(artifact.byte_size), "x-content-sha256": String(artifact.sha256), "content-disposition": `inline; filename="${artifactId}"` } });
    }
    return Response.json(await productionV2Projection(channelId, env.DB), { headers: NO_STORE });
  } catch (error) {
    if (error instanceof ProductionV2CommandError) return failure(error.code, error.message, error.status);
    const message = error instanceof Error ? error.message : "Production Engine V2 projection is unavailable";
    return failure(message === "CHANNEL_NOT_FOUND" ? "CHANNEL_NOT_FOUND" : "PRODUCTION_V2_PROJECTION_UNAVAILABLE", message, message === "CHANNEL_NOT_FOUND" ? 404 : 503);
  }
}

export async function HEAD(request: Request) {
  try {
    const url = new URL(request.url), artifactId = url.searchParams.get("artifact");
    if (!artifactId) return new Response(null, { status: 400, headers: NO_STORE });
    const env = await runtime();
    if (!env.DB || !env.BUCKET) return new Response(null, { status: 503, headers: NO_STORE });
    const { artifact } = await readArtifact({ DB: env.DB, BUCKET: env.BUCKET, ELEVENLABS_API_KEY: env.ELEVENLABS_API_KEY }, artifactId);
    return new Response(null, { headers: { ...NO_STORE, "content-type": String(artifact.mime_type), "content-length": String(artifact.byte_size), "x-content-sha256": String(artifact.sha256) } });
  } catch (error) {
    return new Response(null, { status: error instanceof ProductionV2CommandError ? error.status : 503, headers: NO_STORE });
  }
}

async function secretMatches(left: string, right: string) {
  if (!left || !right) return false; const encode = (value: string) => new TextEncoder().encode(value);
  const [a, b] = await Promise.all([crypto.subtle.digest("SHA-256", encode(left)), crypto.subtle.digest("SHA-256", encode(right))]);
  const av = new Uint8Array(a), bv = new Uint8Array(b); let difference = av.length ^ bv.length; for (let index = 0; index < Math.min(av.length, bv.length); index += 1) difference |= av[index] ^ bv[index]; return difference === 0;
}

async function authorizedRuntime(request: Request) {
  const env = await runtime(); if (!env.DB || !env.BUCKET) throw new ProductionV2CommandError("PRODUCTION_RUNTIME_UNAVAILABLE", 503, "Production V2 requires canonical D1 and isolated R2 storage");
  let user = await getChatGPTUser();
  if (!user && await secretMatches(request.headers.get("x-production-v2-executor-token") || "", env.PRODUCTION_V2_EXECUTOR_TOKEN || "")) {
    const email = String(env.FACTORY_AUTOMATION_ACTOR_EMAIL || "").trim(); if (email) user = { email, displayName: String(env.FACTORY_AUTOMATION_ACTOR_NAME || email), fullName: null };
  }
  if (!user) throw new ProductionV2CommandError("SIWC_AUTHENTICATION_REQUIRED", 401, "Sign in with ChatGPT or present the scoped Production V2 executor credential");
  const allowlist = new Set(String(env.FACTORY_EXPERT_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
  if (!allowlist.size || !allowlist.has(user.email.trim().toLowerCase())) throw new ProductionV2CommandError("CHANNEL_OWNER_AUTHORIZATION_REQUIRED", 403, "This identity is not authorized to control Production V2");
  return { user, env, runtime: { DB: env.DB, BUCKET: env.BUCKET, OPENAI_API_KEY: env.OPENAI_API_KEY, ELEVENLABS_API_KEY: env.ELEVENLABS_API_KEY } };
}

export async function POST(request: Request) {
  try {
    const context = await authorizedRuntime(request);
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return failure("JSON_CONTENT_TYPE_REQUIRED", "Content-Type must be application/json", 415);
    const body = await request.json() as { action?: string; sequence?: number };
    if (body.action !== "START_GOLDEN_PILOT" && body.action !== "PREPARE_FULL_VIDEO" && body.action !== "RECONCILE_STALE_PROVIDER_REQUESTS") return failure("COMMAND_UNSUPPORTED", "Unsupported Production V2 command", 400);
    const key = request.headers.get("idempotency-key")?.trim(); if (!key || key.length < 16 || key.length > 160) return failure("IDEMPOTENCY_KEY_INVALID", "A 16–160 character idempotency-key is required", 400);
    if (body.action === "PREPARE_FULL_VIDEO") { const sequence = Number(body.sequence); if (!Number.isInteger(sequence) || sequence < 1 || sequence > 15) return failure("SEQUENCE_INVALID", "Full-video sequence must be 1–15", 400); return Response.json(await prepareFullVideo(context.runtime, sequence, context.user.email, key), { status: 201, headers: NO_STORE }); }
    if (body.action === "RECONCILE_STALE_PROVIDER_REQUESTS") return Response.json(await reconcileStaleProviderRequests(context.runtime, context.user.email, key), { status: 201, headers: NO_STORE });
    return Response.json(await startGoldenPilot(context.runtime, context.user.email, key), { status: 201, headers: NO_STORE });
  } catch (error) {
    if (error instanceof ProductionV2CommandError) return failure(error.code, error.message, error.status);
    return failure("PRODUCTION_V2_COMMAND_FAILED", error instanceof Error ? error.message : "Production V2 command failed", 503);
  }
}

export async function PUT(request: Request) {
  try {
    const context = await authorizedRuntime(request), url = new URL(request.url), packageId = url.searchParams.get("package")?.trim(), kind = url.searchParams.get("kind");
    const allowed = new Set(["PILOT_VIDEO", "PILOT_QA", "FULL_VIDEO", "FULL_QA1", "FULL_QA_VISUAL", "FULL_QA2"]); if (!packageId || !kind || !allowed.has(kind)) return failure("UPLOAD_SCOPE_INVALID", "A valid package and Production V2 evidence kind are required", 400);
    const declared = Number(request.headers.get("content-length") || 0); if (declared > 90_000_000) return failure("UPLOAD_TOO_LARGE", "Production V2 evidence exceeds 90 MB", 413);
    const value = new Uint8Array(await request.arrayBuffer());
    const lineageBinding = { sourceManifestId: request.headers.get("x-source-manifest-id") || undefined, sourceManifestSha256: request.headers.get("x-source-manifest-sha256") || undefined };
    if (kind === "FULL_VIDEO" || kind === "FULL_QA1" || kind === "FULL_QA_VISUAL" || kind === "FULL_QA2") return Response.json(await storeFullEvidence(context.runtime, packageId, kind, value, context.user.email, lineageBinding), { status: 201, headers: NO_STORE });
    return Response.json(await storePilotUpload(context.runtime, packageId, kind as "PILOT_VIDEO" | "PILOT_QA", value, context.user.email, lineageBinding), { status: 201, headers: NO_STORE });
  } catch (error) {
    if (error instanceof ProductionV2CommandError) return failure(error.code, error.message, error.status);
    return failure("PRODUCTION_V2_UPLOAD_FAILED", error instanceof Error ? error.message : "Production V2 evidence upload failed", 503);
  }
}
