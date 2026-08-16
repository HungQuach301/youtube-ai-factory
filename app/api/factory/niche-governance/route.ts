import { getChatGPTUser } from "@/app/chatgpt-auth";
import { NicheGovernanceCommandError, parseNicheGovernanceBody, submitNicheGovernanceCommand, validateNicheGovernanceIdempotencyKey, type NicheGovernanceDB } from "@/lib/niche-governance-command";

export const dynamic = "force-dynamic";
const NO_STORE = { "cache-control": "no-store" };
const MAX_BODY_BYTES = 96_000;
function failure(code: string, message: string, status: number) { return Response.json({ error: { code, message }, fallback: false, providerRequests: 0, spendUsd: 0, aggregateScore: null, selection: false, commitment: false, channelNicheMutation: false, channelStrategyActivation: false }, { status, headers: NO_STORE }); }
async function runtime() { const { env } = await import("cloudflare:workers"); return env as unknown as { DB?: NicheGovernanceDB; FACTORY_EXPERT_EMAILS?: string }; }
async function readBody(request: Request) { const declared = Number(request.headers.get("content-length") || 0); if (declared > MAX_BODY_BYTES) throw new NicheGovernanceCommandError("COMMAND_BODY_TOO_LARGE", 413, "The governance command exceeds 96 KB"); if (!request.body) return ""; const reader = request.body.getReader(); const decoder = new TextDecoder(); let total = 0; let result = ""; while (true) { const chunk = await reader.read(); if (chunk.done) break; total += chunk.value.byteLength; if (total > MAX_BODY_BYTES) { await reader.cancel(); throw new NicheGovernanceCommandError("COMMAND_BODY_TOO_LARGE", 413, "The governance command exceeds 96 KB"); } result += decoder.decode(chunk.value, { stream: true }); } return result + decoder.decode(); }

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser(); if (!user) return failure("SIWC_AUTHENTICATION_REQUIRED", "Sign in with ChatGPT before recording governance decisions", 401);
    const env = await runtime(); if (!env.DB) return failure("CANONICAL_DATABASE_UNAVAILABLE", "Canonical database binding is unavailable", 503);
    const allowlist = new Set(String(env.FACTORY_EXPERT_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean)); if (!allowlist.size) return failure("EXPERT_ALLOWLIST_UNCONFIGURED", "The server-side governance allowlist is not configured", 503); if (!allowlist.has(user.email.trim().toLowerCase())) return failure("GOVERNANCE_AUTHORIZATION_REQUIRED", "This identity is not authorized for niche governance", 403);
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return failure("JSON_CONTENT_TYPE_REQUIRED", "Content-Type must be application/json", 415);
    let json: unknown; try { json = JSON.parse(await readBody(request)); } catch (error) { if (error instanceof NicheGovernanceCommandError) throw error; return failure("COMMAND_JSON_INVALID", "The request body is not valid JSON", 400); }
    const body = parseNicheGovernanceBody(json);
    const receipt = await submitNicheGovernanceCommand(env.DB, { body, actor: { email: user.email, displayName: user.displayName, role: body.action === "SELECT_NICHE_FOR_COMMITMENT" ? "OWNER_EXPERT" : "PORTFOLIO_GOVERNANCE" }, idempotencyKey: validateNicheGovernanceIdempotencyKey(request.headers.get("idempotency-key")), correlationId: request.headers.get("x-correlation-id"), causationId: request.headers.get("x-causation-id") });
    return Response.json(receipt, { status: receipt.outcome === "RECORDED" ? 201 : 200, headers: NO_STORE });
  } catch (error) { if (error instanceof NicheGovernanceCommandError) return failure(error.code, error.message, error.status); return failure("NICHE_GOVERNANCE_COMMAND_UNAVAILABLE", "The niche-governance command is unavailable", 503); }
}
