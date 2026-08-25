import { FactoryRuntimeError, type FactoryRuntimeDB } from "@/lib/factory-runtime-writer";
import type { FactoryRenderBucket } from "@/lib/factory-scene-graph-renderer";
import { runHiddenSystemsTreatmentLiveQualification } from "@/lib/factory-hidden-systems-treatment-live-runner";
import type {
  HiddenSystemsTreatmentCorpus,
  HiddenSystemsTreatmentExecutionReceipt,
} from "@/lib/factory-hidden-systems-treatment-qualification";

export const dynamic = "force-dynamic";
const NO_STORE = { "cache-control": "no-store" };
const MAX_BODY_BYTES = 520_000;

type Env = {
  DB?: FactoryRuntimeDB;
  BUCKET?: FactoryRenderBucket;
  FACTORY_EXPERT_EMAILS?: string;
  FACTORY_RUNTIME_WRITER_ENABLED?: string;
  FACTORY_HIDDEN_SYSTEMS_TREATMENT_QUALIFICATION_ENABLED?: string;
  FACTORY_RUNTIME_QUALIFICATION_TOKEN?: string;
  FACTORY_AUTOMATION_ACTOR_EMAIL?: string;
};
type JsonRecord = Record<string, unknown>;

function failure(code: string, message: string, status: number, reasons: string[] = []) {
  return Response.json({ error: { code, message, reasons }, providerRequests: 0, spendUsd: 0 }, { status, headers: NO_STORE });
}
async function runtime() { const { env } = await import("cloudflare:workers"); return env as unknown as Env; }
function record(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new FactoryRuntimeError("QUALIFICATION_BODY_INVALID", 400, "The qualification request must be a JSON object");
  return value as JsonRecord;
}
async function secretMatches(left: string, right: string) {
  if (!left || !right) return false;
  const bytes = (value: string) => new TextEncoder().encode(value);
  const [a, b] = await Promise.all([crypto.subtle.digest("SHA-256", bytes(left)), crypto.subtle.digest("SHA-256", bytes(right))]);
  const av = new Uint8Array(a), bv = new Uint8Array(b); let difference = av.length ^ bv.length;
  for (let index = 0; index < Math.min(av.length, bv.length); index += 1) difference |= av[index] ^ bv[index];
  return difference === 0;
}
async function readBody(request: Request) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BODY_BYTES) throw new FactoryRuntimeError("QUALIFICATION_BODY_TOO_LARGE", 413, "The bounded qualification request exceeds 520000 bytes");
  const reader = request.body?.getReader(); if (!reader) return "";
  const decoder = new TextDecoder(); let total = 0, result = "";
  while (true) {
    const chunk = await reader.read(); if (chunk.done) break;
    total += chunk.value.byteLength;
    if (total > MAX_BODY_BYTES) { await reader.cancel(); throw new FactoryRuntimeError("QUALIFICATION_BODY_TOO_LARGE", 413, "The bounded qualification request exceeds 520000 bytes"); }
    result += decoder.decode(chunk.value, { stream: true });
  }
  return result + decoder.decode();
}
function decodeBase64(value: unknown) {
  const encoded = typeof value === "string" ? value : "";
  if (!encoded || encoded.length > 540_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new FactoryRuntimeError("QUALIFICATION_OUTPUT_BASE64_INVALID", 400, "The qualification output must be bounded canonical base64");
  const binary = atob(encoded), output = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) output[index] = binary.charCodeAt(index);
  return output;
}

export async function POST(request: Request) {
  try {
    const env = await runtime();
    if (env.FACTORY_RUNTIME_WRITER_ENABLED !== "true" || env.FACTORY_HIDDEN_SYSTEMS_TREATMENT_QUALIFICATION_ENABLED !== "true") return failure("TREATMENT_QUALIFICATION_DISABLED", "The production-scale treatment qualification writer is disabled", 503);
    if (!env.DB || !env.BUCKET) return failure("QUALIFICATION_STORAGE_UNAVAILABLE", "Canonical D1/R2 bindings are unavailable", 503);
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return failure("JSON_CONTENT_TYPE_REQUIRED", "Content-Type must be application/json", 415);
    const authorized = await secretMatches(request.headers.get("x-factory-runtime-qualification-token") || "", env.FACTORY_RUNTIME_QUALIFICATION_TOKEN || "");
    const actorEmail = String(env.FACTORY_AUTOMATION_ACTOR_EMAIL || "").trim().toLowerCase();
    const allowlist = new Set(String(env.FACTORY_EXPERT_EMAILS || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean));
    if (!authorized || !actorEmail || !allowlist.has(actorEmail)) return failure("OWNER_EXPERT_AUTHORIZATION_REQUIRED", "A bounded owner qualification credential is required", 403);
    const body = record(JSON.parse(await readBody(request)));
    if (String(body.action || "").toUpperCase() !== "QUALIFY_HIDDEN_SYSTEMS_TREATMENTS") return failure("QUALIFICATION_ACTION_UNSUPPORTED", "Use the exact bounded treatment qualification action", 400);
    const authorityPayload = JSON.stringify({ action: body.action, corpus: body.corpus, execution: body.execution }).toUpperCase();
    if (Number(body.providerRequests ?? 0) !== 0 || Number(body.spendMicros ?? 0) !== 0 || authorityPayload.includes("R22")) throw new FactoryRuntimeError("QUALIFICATION_AUTHORITY_BOUNDARY_VIOLATED", 409, "The treatment qualification request cannot dispatch, spend or name R22");
    const corpus = record(body.corpus) as unknown as HiddenSystemsTreatmentCorpus;
    const execution = record(body.execution) as unknown as HiddenSystemsTreatmentExecutionReceipt;
    const outputBytes = decodeBase64(body.outputBase64);
    return Response.json(await runHiddenSystemsTreatmentLiveQualification({ DB: env.DB, BUCKET: env.BUCKET }, corpus, execution, outputBytes), { status: 201, headers: NO_STORE });
  } catch (error) {
    if (error instanceof FactoryRuntimeError) return failure(error.code, error.message, error.status, error.reasons);
    return failure("TREATMENT_QUALIFICATION_UNAVAILABLE", "The bounded treatment qualification is unavailable", 503);
  }
}
