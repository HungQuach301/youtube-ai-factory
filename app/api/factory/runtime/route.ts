import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  FactoryRuntimeError,
  heartbeatFactoryRuntimeLease,
  materializeFactoryDependencyStaleProjection,
  readFactoryRuntimeProjection,
  reconcileFactoryRuntimeOrphan,
  releaseFactoryRuntimeLease,
  reserveFactoryRuntimeWork,
  submitFactoryRuntimeCommand,
  verifyFactoryRuntimeReplay,
  type FactoryRuntimeCommandInput,
  type FactoryRuntimeDB,
} from "@/lib/factory-runtime-writer";
import { persistFactoryProductionCompilation, type FactoryProductionCompilationInput } from "@/lib/factory-production-compiler";
import {
  materializeFactorySceneGraphRender,
  type FactoryRenderBucket,
  type FactorySceneRenderInput,
} from "@/lib/factory-scene-graph-renderer";
import {
  materializeFactoryIntegratedCanary,
  verifyFactoryAssetEligibility,
  type FactoryAssetEligibilityInput,
  type FactoryIntegratedCanaryInput,
} from "@/lib/factory-pixel-video-compositor";
import { runFactoryNonR22LiveCanaryQualification } from "@/lib/factory-non-r22-canary-qualification";

export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" };
const MAX_BODY_BYTES = 48_000;

type RuntimeEnv = {
  DB?: FactoryRuntimeDB;
  BUCKET?: FactoryRenderBucket;
  FACTORY_EXPERT_EMAILS?: string;
  FACTORY_RUNTIME_WRITER_ENABLED?: string;
  FACTORY_RUNTIME_R22_AUTHORIZED?: string;
  FACTORY_PRODUCTION_COMPILER_ENABLED?: string;
  FACTORY_SCENE_RENDERER_ENABLED?: string;
  FACTORY_ASSET_ELIGIBILITY_ENABLED?: string;
  FACTORY_PIXEL_COMPOSITOR_ENABLED?: string;
  FACTORY_NON_R22_CANARY_QUALIFICATION_ENABLED?: string;
};

type JsonRecord = Record<string, unknown>;

function failure(code: string, message: string, status: number, reasons: string[] = []) {
  return Response.json({ error: { code, message, reasons }, providerRequests: 0, spendUsd: 0 }, { status, headers: NO_STORE });
}

async function runtime() {
  const { env } = await import("cloudflare:workers");
  return env as unknown as RuntimeEnv;
}

function record(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new FactoryRuntimeError("COMMAND_BODY_INVALID", 400, "The request body must be a JSON object");
  return value as JsonRecord;
}

function string(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function integer(value: unknown) { return Number(value); }

function ownerAllowlist(env: RuntimeEnv) {
  return new Set(String(env.FACTORY_EXPERT_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
}

async function authorize(env: RuntimeEnv) {
  const user = await getChatGPTUser();
  if (!user) throw new FactoryRuntimeError("SIWC_AUTHENTICATION_REQUIRED", 401, "Sign in with ChatGPT before using the Factory runtime");
  const allowlist = ownerAllowlist(env);
  if (!allowlist.size) throw new FactoryRuntimeError("EXPERT_ALLOWLIST_UNCONFIGURED", 503, "The server-side owner/expert allowlist is not configured");
  if (!allowlist.has(user.email.trim().toLowerCase())) throw new FactoryRuntimeError("OWNER_EXPERT_AUTHORIZATION_REQUIRED", 403, "This identity is not authorized to use the Factory runtime");
  return user;
}

function assertZeroSpend(body: JsonRecord) {
  const serialized = JSON.stringify(body);
  const command = recordOrEmpty(body.command), payload = recordOrEmpty(command.payload ?? body.payload), costScope = recordOrEmpty(command.costScope ?? body.costScope);
  const providerRequests = Number(body.providerRequests ?? payload.providerRequests ?? 0);
  const spendUsd = Number(body.spendUsd ?? payload.spendUsd ?? costScope.reservedSpendUsd ?? 0);
  if (providerRequests !== 0 || spendUsd !== 0 || /OPENAI_API_KEY|ELEVENLABS_API_KEY|https:\/\/api\./i.test(serialized)) {
    throw new FactoryRuntimeError("ZERO_SPEND_RUNTIME_BOUNDARY_VIOLATED", 409, "This runtime slice cannot dispatch providers or reserve spend");
  }
}

function assertR22Blocked(env: RuntimeEnv, body: JsonRecord) {
  if (env.FACTORY_RUNTIME_R22_AUTHORIZED === "true") return;
  if (JSON.stringify(body).toUpperCase().includes("R22")) throw new FactoryRuntimeError("R22_RUNTIME_NOT_AUTHORIZED", 409, "R22 remains design-only and cannot be dispatched by this runtime slice");
}

function recordOrEmpty(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function runtimeCommand(value: unknown, actor: { actorType: "OWNER"; actorId: string }) {
  const input = recordOrEmpty(value);
  return {
    ...input as unknown as FactoryRuntimeCommandInput, ...actor, streamType: string(input.streamType), streamId: string(input.streamId),
    commandType: string(input.commandType) as FactoryRuntimeCommandInput["commandType"], expectedState: string(input.expectedState), expectedVersion: integer(input.expectedVersion),
    leaseId: string(input.leaseId), fencingToken: integer(input.fencingToken), idempotencyKey: string(input.idempotencyKey), intentHash: string(input.intentHash),
    policyVersions: recordOrEmpty(input.policyVersions), costScope: recordOrEmpty(input.costScope), rightsScope: recordOrEmpty(input.rightsScope), payload: recordOrEmpty(input.payload),
    evidenceHash: string(input.evidenceHash), correlationId: string(input.correlationId) || undefined, causationId: string(input.causationId) || null,
  } satisfies FactoryRuntimeCommandInput;
}

async function readBoundedBody(request: Request) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) throw new FactoryRuntimeError("COMMAND_BODY_TOO_LARGE", 413, "The runtime command exceeds 48 KB");
  if (!request.body) return "";
  const reader = request.body.getReader(), decoder = new TextDecoder();
  let total = 0, value = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    total += chunk.value.byteLength;
    if (total > MAX_BODY_BYTES) { await reader.cancel(); throw new FactoryRuntimeError("COMMAND_BODY_TOO_LARGE", 413, "The runtime command exceeds 48 KB"); }
    value += decoder.decode(chunk.value, { stream: true });
  }
  return value + decoder.decode();
}

export async function GET(request: Request) {
  try {
    const env = await runtime();
    await authorize(env);
    if (!env.DB) return failure("CANONICAL_DATABASE_UNAVAILABLE", "Canonical database binding is unavailable", 503);
    const url = new URL(request.url);
    const projection = await readFactoryRuntimeProjection(env.DB, { streamType: string(url.searchParams.get("streamType")), streamId: string(url.searchParams.get("streamId")) });
    return Response.json(projection, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof FactoryRuntimeError) return failure(error.code, error.message, error.status, error.reasons);
    return failure("FACTORY_RUNTIME_READ_UNAVAILABLE", "The Factory runtime projection is unavailable", 503);
  }
}

export async function POST(request: Request) {
  try {
    const env = await runtime(), user = await authorize(env);
    if (!env.DB) return failure("CANONICAL_DATABASE_UNAVAILABLE", "Canonical database binding is unavailable", 503);
    if (env.FACTORY_RUNTIME_WRITER_ENABLED !== "true") return failure("FACTORY_RUNTIME_WRITER_DISABLED", "The canonical runtime writer is disabled until an explicit deployment authorization is configured", 503);
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return failure("JSON_CONTENT_TYPE_REQUIRED", "Content-Type must be application/json", 415);
    const raw = await readBoundedBody(request);
    let decoded: unknown;
    try { decoded = JSON.parse(raw); } catch { return failure("COMMAND_JSON_INVALID", "The request body is not valid JSON", 400); }
    const body = record(decoded), action = string(body.action).toUpperCase();
    assertZeroSpend(body);
    assertR22Blocked(env, body);
    const actor = { actorType: "OWNER" as const, actorId: user.email };

    if (action === "RESERVE_WORK") return Response.json(await reserveFactoryRuntimeWork(env.DB, {
      ...actor, streamType: string(body.streamType), streamId: string(body.streamId), stageKey: string(body.stageKey), expectedState: string(body.expectedState),
      expectedVersion: integer(body.expectedVersion), idempotencyKey: string(body.idempotencyKey), intentHash: string(body.intentHash), evidenceHash: string(body.evidenceHash),
      correlationId: string(body.correlationId) || undefined, leaseDurationMs: body.leaseDurationMs == null ? undefined : integer(body.leaseDurationMs),
    }), { status: 201, headers: NO_STORE });

    if (action === "HEARTBEAT_LEASE") return Response.json(await heartbeatFactoryRuntimeLease(env.DB, {
      leaseId: string(body.leaseId), fencingToken: integer(body.fencingToken), extensionMs: body.extensionMs == null ? undefined : integer(body.extensionMs),
    }), { headers: NO_STORE });

    if (action === "RELEASE_LEASE") return Response.json(await releaseFactoryRuntimeLease(env.DB, {
      leaseId: string(body.leaseId), fencingToken: integer(body.fencingToken),
    }), { headers: NO_STORE });

    if (action === "SUBMIT_COMMAND") {
      return Response.json(await submitFactoryRuntimeCommand(env.DB, runtimeCommand(body.command, actor)), { headers: NO_STORE });
    }

    if (action === "COMPILE_PRODUCTION_PLAN") {
      if (env.FACTORY_PRODUCTION_COMPILER_ENABLED !== "true") return failure("FACTORY_PRODUCTION_COMPILER_DISABLED", "The production compiler is disabled until an explicit deployment authorization is configured", 503);
      const compilation = recordOrEmpty(body.compilation) as unknown as FactoryProductionCompilationInput;
      return Response.json(await persistFactoryProductionCompilation(env.DB, { ...compilation, createdBy: user.email }, runtimeCommand(body.command, actor)), { status: 201, headers: NO_STORE });
    }

    if (action === "RENDER_SCENE_GRAPH") {
      if (env.FACTORY_SCENE_RENDERER_ENABLED !== "true") return failure("FACTORY_SCENE_RENDERER_DISABLED", "The deterministic Scene Graph Renderer is disabled until an explicit deployment authorization is configured", 503);
      if (!env.BUCKET) return failure("ACTIVE_MEDIA_STORAGE_UNAVAILABLE", "The active media storage binding is unavailable", 503);
      const render = recordOrEmpty(body.render) as unknown as FactorySceneRenderInput;
      return Response.json(await materializeFactorySceneGraphRender({ DB: env.DB, BUCKET: env.BUCKET }, render, runtimeCommand(body.command, actor)), { status: 201, headers: NO_STORE });
    }

    if (action === "VERIFY_ASSET_ELIGIBILITY") {
      if (env.FACTORY_ASSET_ELIGIBILITY_ENABLED !== "true") return failure("FACTORY_ASSET_ELIGIBILITY_DISABLED", "Asset eligibility verification is disabled until an explicit deployment authorization is configured", 503);
      if (!env.BUCKET) return failure("ACTIVE_MEDIA_STORAGE_UNAVAILABLE", "The active media storage binding is unavailable", 503);
      const asset = recordOrEmpty(body.asset) as unknown as FactoryAssetEligibilityInput;
      return Response.json(await verifyFactoryAssetEligibility({ DB: env.DB, BUCKET: env.BUCKET }, asset, runtimeCommand(body.command, actor)), { status: 201, headers: NO_STORE });
    }

    if (action === "FINALIZE_INTEGRATED_CANARY") {
      if (env.FACTORY_PIXEL_COMPOSITOR_ENABLED !== "true") return failure("FACTORY_PIXEL_COMPOSITOR_DISABLED", "The qualified pixel/video compositor is disabled until an explicit deployment authorization is configured", 503);
      if (!env.BUCKET) return failure("ACTIVE_MEDIA_STORAGE_UNAVAILABLE", "The active media storage binding is unavailable", 503);
      const canary = recordOrEmpty(body.canary) as unknown as FactoryIntegratedCanaryInput;
      return Response.json(await materializeFactoryIntegratedCanary({ DB: env.DB, BUCKET: env.BUCKET }, canary, runtimeCommand(body.command, actor)), { status: 201, headers: NO_STORE });
    }

    if (action === "RUN_NON_R22_LIVE_CANARY_QUALIFICATION") {
      if (env.FACTORY_NON_R22_CANARY_QUALIFICATION_ENABLED !== "true") return failure("FACTORY_NON_R22_CANARY_QUALIFICATION_DISABLED", "The bounded live qualification runner is disabled until an explicit deployment authorization is configured", 503);
      if (!env.BUCKET) return failure("ACTIVE_MEDIA_STORAGE_UNAVAILABLE", "The active media storage binding is unavailable", 503);
      return Response.json(await runFactoryNonR22LiveCanaryQualification({ DB: env.DB, BUCKET: env.BUCKET }, user.email), { status: 201, headers: NO_STORE });
    }

    if (action === "RECONCILE_ORPHAN") return Response.json(await reconcileFactoryRuntimeOrphan(env.DB, {
      ...actor, streamType: string(body.streamType), streamId: string(body.streamId), idempotencyKey: string(body.idempotencyKey),
      intentHash: string(body.intentHash), evidenceHash: string(body.evidenceHash),
    }), { headers: NO_STORE });

    if (action === "MATERIALIZE_DEPENDENCY_STALE") return Response.json(await materializeFactoryDependencyStaleProjection(env.DB, {
      staleEventId: string(body.staleEventId), changedArtifactVersionIds: Array.isArray(body.changedArtifactVersionIds) ? body.changedArtifactVersionIds.map(string) : [], reason: string(body.reason),
    }), { headers: NO_STORE });

    if (action === "VERIFY_REPLAY") return Response.json(await verifyFactoryRuntimeReplay(env.DB, {
      streamType: string(body.streamType), streamId: string(body.streamId),
    }), { headers: NO_STORE });

    return failure("FACTORY_RUNTIME_ACTION_UNSUPPORTED", "Use an allowlisted Factory runtime action", 400);
  } catch (error) {
    if (error instanceof FactoryRuntimeError) return failure(error.code, error.message, error.status, error.reasons);
    return failure("FACTORY_RUNTIME_COMMAND_UNAVAILABLE", "The Factory runtime command is unavailable", 503);
  }
}
