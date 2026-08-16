import { getChatGPTUser } from "@/app/chatgpt-auth";
import { ContentAutopilotError, previewContentAutopilotImpact, type ContentAutopilotDB } from "@/lib/content-autopilot-command";

export const dynamic = "force-dynamic";
const NO_STORE = { "cache-control": "no-store" };
const MAX_BODY_BYTES = 32_000;
type RuntimeEnv = { DB?: ContentAutopilotDB; FACTORY_EXPERT_EMAILS?: string };

async function runtime() { const { env } = await import("cloudflare:workers"); return env as unknown as RuntimeEnv; }
function clean(value: unknown) { return String(value ?? "").trim(); }
function failure(code: string, message: string, status: number) { return Response.json({ error: { code, message }, fallback: false, mutation: false, providerRequests: 0, spendUsd: 0, channelStrategyMutation: false, providerDispatch: false, productionMutation: false, publishingMutation: false }, { status, headers: NO_STORE }); }

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return failure("SIWC_AUTHENTICATION_REQUIRED", "Sign in with ChatGPT before previewing automation changes", 401);
    const env = await runtime();
    if (!env.DB) return failure("CANONICAL_DATABASE_UNAVAILABLE", "Canonical database binding is unavailable", 503);
    const allowlist = new Set(clean(env.FACTORY_EXPERT_EMAILS).split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
    if (!allowlist.size) return failure("EXPERT_ALLOWLIST_UNCONFIGURED", "The server-side owner allowlist is not configured", 503);
    if (!allowlist.has(user.email.trim().toLowerCase())) return failure("CHANNEL_OWNER_AUTHORIZATION_REQUIRED", "This identity is not authorized to control automation", 403);
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return failure("JSON_CONTENT_TYPE_REQUIRED", "Content-Type must be application/json", 415);
    const declared = Number(request.headers.get("content-length") || 0);
    if (declared > MAX_BODY_BYTES) throw new ContentAutopilotError("COMMAND_BODY_TOO_LARGE", 413, "The impact preview request exceeds 32 KB");
    let body: unknown;
    try { body = await request.json(); } catch { return failure("COMMAND_JSON_INVALID", "The request body is not valid JSON", 400); }
    return Response.json(await previewContentAutopilotImpact(env.DB, body), { headers: NO_STORE });
  } catch (error) {
    if (error instanceof ContentAutopilotError) return failure(error.code, error.message, error.status);
    return failure("CONTENT_AUTOPILOT_PREVIEW_UNAVAILABLE", "Automation impact preview is unavailable", 503);
  }
}
