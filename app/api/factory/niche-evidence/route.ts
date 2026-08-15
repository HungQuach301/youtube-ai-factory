import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  NicheEvidenceCommandError,
  parseNicheEvidenceBody,
  submitNicheEvidenceCommand,
  validateNicheEvidenceIdempotencyKey,
  type NicheEvidenceDB,
} from "@/lib/niche-evidence-command";

export const dynamic = "force-dynamic";
const NO_STORE = { "cache-control": "no-store" };
const MAX_BODY_BYTES = 32_000;

function failure(code: string, message: string, status: number) {
  return Response.json({ error: { code, message }, fallback: false, providerRequests: 0, spendUsd: 0 }, { status, headers: NO_STORE });
}
async function runtime() {
  const { env } = await import("cloudflare:workers");
  return env as unknown as { DB?: NicheEvidenceDB; FACTORY_EXPERT_EMAILS?: string };
}
async function readBoundedBody(request: Request) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) throw new NicheEvidenceCommandError("COMMAND_BODY_TOO_LARGE", 413, "The evidence command exceeds 32 KB");
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let value = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    total += chunk.value.byteLength;
    if (total > MAX_BODY_BYTES) { await reader.cancel(); throw new NicheEvidenceCommandError("COMMAND_BODY_TOO_LARGE", 413, "The evidence command exceeds 32 KB"); }
    value += decoder.decode(chunk.value, { stream: true });
  }
  return value + decoder.decode();
}

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return failure("SIWC_AUTHENTICATION_REQUIRED", "Sign in with ChatGPT before changing the niche evidence workflow", 401);
    const env = await runtime();
    if (!env.DB) return failure("CANONICAL_DATABASE_UNAVAILABLE", "Canonical database binding is unavailable", 503);
    const allowlist = new Set(String(env.FACTORY_EXPERT_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
    if (!allowlist.size) return failure("EXPERT_ALLOWLIST_UNCONFIGURED", "The server-side owner/expert allowlist is not configured", 503);
    if (!allowlist.has(user.email.trim().toLowerCase())) return failure("OWNER_EXPERT_AUTHORIZATION_REQUIRED", "This identity is not authorized to operate the evidence workflow", 403);
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return failure("JSON_CONTENT_TYPE_REQUIRED", "Content-Type must be application/json", 415);
    const raw = await readBoundedBody(request);
    let json: unknown;
    try { json = JSON.parse(raw); } catch { return failure("COMMAND_JSON_INVALID", "The request body is not valid JSON", 400); }
    const body = parseNicheEvidenceBody(json);
    const idempotencyKey = validateNicheEvidenceIdempotencyKey(request.headers.get("idempotency-key"));
    const receipt = await submitNicheEvidenceCommand(env.DB, {
      body, actor: { email: user.email, displayName: user.displayName, role: "OWNER_EXPERT" }, idempotencyKey,
      correlationId: request.headers.get("x-correlation-id"), causationId: request.headers.get("x-causation-id"),
    });
    return Response.json(receipt, { status: receipt.outcome === "RECORDED" ? 201 : 200, headers: NO_STORE });
  } catch (error) {
    if (error instanceof NicheEvidenceCommandError) return failure(error.code, error.message, error.status);
    return failure("NICHE_EVIDENCE_COMMAND_UNAVAILABLE", "The niche evidence command is unavailable", 503);
  }
}
