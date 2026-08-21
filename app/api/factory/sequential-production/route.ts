import { getChatGPTUser } from "@/app/chatgpt-auth";
import { sequentialProductionProjection, type SequentialProductionDB } from "@/lib/sequential-production-projection";
import { SequentialCommandError, parseSequentialCommandBody, submitSequentialCommand, validateSequentialIdempotencyKey, type SequentialBucket, type SequentialCommandDB } from "@/lib/sequential-production-command";
import { ProductionIntegrityError } from "@/lib/production-integrity-runtime";

export const dynamic = "force-dynamic";
const NO_STORE = { "cache-control": "no-store" };
const MAX_BODY_BYTES = 512_000;
type RuntimeEnv = {
  DB?: SequentialProductionDB & SequentialCommandDB;
  BUCKET?: SequentialBucket;
  FACTORY_EXPERT_EMAILS?: string;
  FACTORY_AUTOMATION_ACTOR_EMAIL?: string;
  FACTORY_AUTOMATION_ACTOR_NAME?: string;
  SEQUENTIAL_EXECUTOR_TOKEN?: string;
};
async function runtime() { const { env } = await import("cloudflare:workers"); return env as unknown as RuntimeEnv; }
function failure(code: string, message: string, status: number) { return Response.json({ error: { code, message }, fallback: false }, { status, headers: NO_STORE }); }
function clean(value: unknown) { return String(value ?? "").trim(); }
async function secretMatches(left: string, right: string) {
  if (!left || !right) return false;
  const encode = (value: string) => new TextEncoder().encode(value), [a, b] = await Promise.all([crypto.subtle.digest("SHA-256", encode(left)), crypto.subtle.digest("SHA-256", encode(right))]);
  const av = new Uint8Array(a), bv = new Uint8Array(b); let difference = av.length ^ bv.length;
  for (let index = 0; index < Math.min(av.length, bv.length); index += 1) difference |= av[index] ^ bv[index];
  return difference === 0;
}

async function authorizedRuntime(request: Request) {
  const env = await runtime(); if (!env.DB || !env.BUCKET) throw new SequentialCommandError("SEQUENTIAL_RUNTIME_UNAVAILABLE", 503, "Sequential production requires canonical D1 and isolated R2 storage");
  let user = await getChatGPTUser(), actorType: "CHANNEL_OWNER" | "SYSTEM_AUTOMATION" = "CHANNEL_OWNER";
  if (!user && await secretMatches(request.headers.get("x-sequential-executor-token") || "", env.SEQUENTIAL_EXECUTOR_TOKEN || "")) {
    const email = clean(env.FACTORY_AUTOMATION_ACTOR_EMAIL); if (email) { user = { email, displayName: clean(env.FACTORY_AUTOMATION_ACTOR_NAME) || email, fullName: null }; actorType = "SYSTEM_AUTOMATION"; }
  }
  if (!user) throw new SequentialCommandError("SIWC_AUTHENTICATION_REQUIRED", 401, "Sign in with ChatGPT or present the scoped sequential executor credential");
  const allowlist = new Set(clean(env.FACTORY_EXPERT_EMAILS).split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
  if (!allowlist.size || !allowlist.has(user.email.trim().toLowerCase())) throw new SequentialCommandError("CHANNEL_OWNER_AUTHORIZATION_REQUIRED", 403, "This identity is not authorized to control sequential production");
  return { env, actor: { email: user.email, displayName: user.displayName, actorType } };
}

export async function GET(request: Request) {
  try {
    const env = await runtime(); if (!env.DB) return failure("CANONICAL_DATABASE_UNAVAILABLE", "Canonical database binding is unavailable", 503);
    const channelId = new URL(request.url).searchParams.get("channel") || "channel-hidden-systems";
    return Response.json(await sequentialProductionProjection(channelId, env.DB), { headers: NO_STORE });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sequential production projection is unavailable";
    return failure(message === "CHANNEL_NOT_FOUND" ? "CHANNEL_NOT_FOUND" : "SEQUENTIAL_PROJECTION_UNAVAILABLE", message, message === "CHANNEL_NOT_FOUND" ? 404 : 503);
  }
}

export async function POST(request: Request) {
  try {
    const context = await authorizedRuntime(request);
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return failure("JSON_CONTENT_TYPE_REQUIRED", "Content-Type must be application/json", 415);
    const declared = Number(request.headers.get("content-length") || 0); if (declared > MAX_BODY_BYTES) return failure("COMMAND_BODY_TOO_LARGE", "The sequential command exceeds 512 KB", 413);
    let value: unknown; try { value = await request.json(); } catch { return failure("COMMAND_JSON_INVALID", "The request body is not valid JSON", 400); }
    const body = parseSequentialCommandBody(value), receipt = await submitSequentialCommand({ DB: context.env.DB!, BUCKET: context.env.BUCKET! }, { body, actor: context.actor, idempotencyKey: validateSequentialIdempotencyKey(request.headers.get("idempotency-key")) });
    return Response.json(receipt, { status: receipt.outcome === "RECORDED" ? 201 : 200, headers: NO_STORE });
  } catch (error) {
    if (error instanceof ProductionIntegrityError) return Response.json({ error: { code: error.code, message: error.message, reasons: error.reasons }, fallback: false, providerRequests: 0, spendUsd: 0 }, { status: error.status, headers: NO_STORE });
    if (error instanceof SequentialCommandError) return failure(error.code, error.message, error.status);
    return failure("SEQUENTIAL_COMMAND_FAILED", error instanceof Error ? error.message : "Sequential production command failed", 503);
  }
}
