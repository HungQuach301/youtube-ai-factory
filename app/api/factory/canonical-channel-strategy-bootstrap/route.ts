import { activateCanonicalChannelStrategy, CanonicalBootstrapError, type CanonicalBootstrapDB } from "@/lib/canonical-channel-strategy-bootstrap";

export const dynamic = "force-dynamic";
const NO_STORE = { "cache-control": "no-store" };
const EXPECTED_ACTION = "ACTIVATE_CANONICAL_CHANNEL_STRATEGY";

type RuntimeEnv = {
  DB?: CanonicalBootstrapDB;
  FACTORY_AUTOMATION_TOKEN?: string;
  FACTORY_AUTOMATION_ACTOR_EMAIL?: string;
  FACTORY_AUTOMATION_ACTOR_NAME?: string;
};

function failure(code: string, message: string, status: number) {
  return Response.json({ error: { code, message }, fallback: false, providerRequests: 0, spendUsd: 0, aggregateScore: null, channelStrategyActivation: false }, { status, headers: NO_STORE });
}
async function runtime() { const { env } = await import("cloudflare:workers"); return env as unknown as RuntimeEnv; }
async function digest(value: string) { return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))); }
async function secretMatches(actual: string, expected: string) {
  if (!actual || !expected) return false;
  const [left, right] = await Promise.all([digest(actual), digest(expected)]);
  if (left.length !== right.length) return false;
  let mismatch = 0; for (let index = 0; index < left.length; index += 1) mismatch |= left[index] ^ right[index];
  return mismatch === 0;
}
function bearer(request: Request) {
  const value = request.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

export async function POST(request: Request) {
  try {
    const env = await runtime();
    if (!env.DB) return failure("CANONICAL_DATABASE_UNAVAILABLE", "Canonical database binding is unavailable", 503);
    if (!env.FACTORY_AUTOMATION_TOKEN || !env.FACTORY_AUTOMATION_ACTOR_EMAIL) return failure("AUTOMATION_AUTHORITY_UNCONFIGURED", "The bounded production automation authority is not configured", 503);
    if (!await secretMatches(bearer(request), env.FACTORY_AUTOMATION_TOKEN)) return failure("AUTOMATION_AUTHORIZATION_REQUIRED", "A valid bounded production automation token is required", 401);
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return failure("JSON_CONTENT_TYPE_REQUIRED", "Content-Type must be application/json", 415);
    const declared = Number(request.headers.get("content-length") || 0); if (declared > 2_000) return failure("COMMAND_BODY_TOO_LARGE", "The bootstrap command exceeds 2 KB", 413);
    let body: unknown; try { body = await request.json(); } catch { return failure("COMMAND_JSON_INVALID", "The request body is not valid JSON", 400); }
    if (!body || typeof body !== "object" || Array.isArray(body) || String((body as Record<string, unknown>).action || "").toUpperCase() !== EXPECTED_ACTION) return failure("COMMAND_VALIDATION_FAILED", `action must be ${EXPECTED_ACTION}`, 400);
    const receipt = await activateCanonicalChannelStrategy(env.DB, { email: env.FACTORY_AUTOMATION_ACTOR_EMAIL.trim().toLowerCase(), displayName: (env.FACTORY_AUTOMATION_ACTOR_NAME || "Hung Quach").trim() });
    return Response.json(receipt, { status: receipt.bridge.outcome === "RECORDED" ? 201 : 200, headers: NO_STORE });
  } catch (error) {
    if (error instanceof CanonicalBootstrapError) return failure(error.code, error.message, error.status);
    const candidate = error as { code?: unknown; status?: unknown; message?: unknown };
    if (typeof candidate.code === "string" && Number.isInteger(candidate.status)) return failure(candidate.code, String(candidate.message || "The canonical activation command was rejected"), Number(candidate.status));
    return failure("CANONICAL_CHANNEL_STRATEGY_BOOTSTRAP_UNAVAILABLE", "The canonical Channel Strategy bootstrap is unavailable", 503);
  }
}
