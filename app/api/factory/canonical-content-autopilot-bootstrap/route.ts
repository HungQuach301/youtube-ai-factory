import { activateCanonicalContentAutopilot } from "@/lib/canonical-content-autopilot-bootstrap";
import { ContentAutopilotError, type ContentAutopilotDB } from "@/lib/content-autopilot-command";

export const dynamic = "force-dynamic";
const NO_STORE = { "cache-control": "no-store" }, EXPECTED_ACTION = "ACTIVATE_CANONICAL_CONTENT_AUTOPILOT";
type RuntimeEnv = { DB?: ContentAutopilotDB; FACTORY_AUTOMATION_TOKEN?: string; FACTORY_AUTOMATION_ACTOR_EMAIL?: string; FACTORY_AUTOMATION_ACTOR_NAME?: string };
function failure(code: string, message: string, status: number) { return Response.json({ error: { code, message }, fallback: false, providerRequests: 0, spendUsd: 0, channelStrategyMutation: false, providerDispatch: false, productionMutation: false, publishingMutation: false }, { status, headers: NO_STORE }); }
async function runtime() { const { env } = await import("cloudflare:workers"); return env as unknown as RuntimeEnv; }
async function digest(value: string) { return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))); }
async function secretMatches(actual: string, expected: string) { if (!actual || !expected) return false; const [left, right] = await Promise.all([digest(actual), digest(expected)]); if (left.length !== right.length) return false; let mismatch = 0; for (let index = 0; index < left.length; index += 1) mismatch |= left[index] ^ right[index]; return mismatch === 0; }
function bearer(request: Request) { const value = request.headers.get("authorization") || ""; return value.startsWith("Bearer ") ? value.slice(7).trim() : ""; }

export async function POST(request: Request) {
  try {
    const env = await runtime(); if (!env.DB) return failure("CANONICAL_DATABASE_UNAVAILABLE", "Canonical database binding is unavailable", 503); if (!env.FACTORY_AUTOMATION_TOKEN || !env.FACTORY_AUTOMATION_ACTOR_EMAIL) return failure("AUTOMATION_AUTHORITY_UNCONFIGURED", "The bounded production automation authority is not configured", 503); if (!await secretMatches(bearer(request), env.FACTORY_AUTOMATION_TOKEN)) return failure("AUTOMATION_AUTHORIZATION_REQUIRED", "A valid bounded production automation token is required", 401); if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return failure("JSON_CONTENT_TYPE_REQUIRED", "Content-Type must be application/json", 415);
    let body: unknown; try { body = await request.json(); } catch { return failure("COMMAND_JSON_INVALID", "The request body is not valid JSON", 400); } if (!body || typeof body !== "object" || Array.isArray(body) || String((body as Record<string, unknown>).action || "").toUpperCase() !== EXPECTED_ACTION) return failure("COMMAND_VALIDATION_FAILED", `action must be ${EXPECTED_ACTION}`, 400);
    return Response.json(await activateCanonicalContentAutopilot(env.DB, { email: env.FACTORY_AUTOMATION_ACTOR_EMAIL.trim().toLowerCase(), displayName: (env.FACTORY_AUTOMATION_ACTOR_NAME || "Hung Quach").trim() }), { status: 201, headers: NO_STORE });
  } catch (error) { if (error instanceof ContentAutopilotError) return failure(error.code, error.message, error.status); return failure("CANONICAL_CONTENT_AUTOPILOT_BOOTSTRAP_UNAVAILABLE", "The canonical Content Autopilot bootstrap is unavailable", 503); }
}
