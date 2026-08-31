import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import {
  appendWriteCommandAudit,
  hashActorSubject,
  type WriteCommandAuditDatabase,
  type WriteCommandAuditIdentity,
} from "../../../../../lib/write-command-audit";
import {
  narrationSegments,
  productionPackages,
  sceneManifest,
  scriptVersions,
  videoProjects,
  workflowEvents,
} from "../../../../../db/schema";

const OWNER_HANDLER_IDENTITY = "app/api/projects/[id]/production/route.ts#POST";
const OWNER_ACTIONS = new Set(["APPROVE_SCENE", "PASS_STORYBOARD_GATE", "BUILD_EXPORT"]);
const MAX_OWNER_BODY_BYTES = 16 * 1024;
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9._:-]{8,200}$/;

type ProductionOwnerAction = "APPROVE_SCENE" | "PASS_STORYBOARD_GATE" | "BUILD_EXPORT";
type ProductionOwnerPayload = { action: ProductionOwnerAction; sceneId?: string };
type ProductionOwnerRuntimeEnv = {
  DB?: WriteCommandAuditDatabase;
  FACTORY_EXPERT_EMAILS?: string;
};

function ownerFailure(error: string, status: number) {
  return Response.json({ error }, { status });
}

function ownerSameOrigin(request: Request) {
  const url = new URL(request.url);
  return request.method === "POST"
    && /^\/api\/projects\/[^/]+\/production$/.test(url.pathname)
    && url.search === ""
    && request.headers.get("origin") === url.origin
    && request.headers.get("sec-fetch-site") === "same-origin";
}

async function productionOwnerRuntimeEnv(): Promise<ProductionOwnerRuntimeEnv> {
  const { env } = await import("cloudflare:workers");
  return env as ProductionOwnerRuntimeEnv;
}

async function authorizeProductionOwnerWrite(request: Request) {
  const user = await getChatGPTUser();
  if (!user?.email) return ownerFailure("SIWC_AUTHENTICATION_REQUIRED", 401);

  const env = await productionOwnerRuntimeEnv();
  const normalizedEmail = user.email.trim().toLowerCase();
  const owners = String(env.FACTORY_EXPERT_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (owners.length === 0) return ownerFailure("OWNER_WRITE_ALLOWLIST_UNCONFIGURED", 503);
  if (!owners.includes(normalizedEmail)) return ownerFailure("OWNER_WRITE_AUTHORIZATION_REQUIRED", 403);
  if (!ownerSameOrigin(request)) return ownerFailure("OWNER_WRITE_SAME_ORIGIN_REQUIRED", 403);
  if (!env.DB) return ownerFailure("CANONICAL_DATABASE_UNAVAILABLE", 503);

  return { env, normalizedEmail };
}

async function sha256RawBody(bytes: ArrayBuffer) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((item) => item.toString(16).padStart(2, "0")).join("");
}

async function readBoundedProductionOwnerBody(request: Request) {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") return ownerFailure("JSON_CONTENT_TYPE_REQUIRED", 415);

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_OWNER_BODY_BYTES) {
    return ownerFailure("OWNER_WRITE_BODY_TOO_LARGE", 413);
  }

  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > MAX_OWNER_BODY_BYTES) return ownerFailure("OWNER_WRITE_BODY_TOO_LARGE", 413);

  let parsed: unknown;
  try {
    const rawBody = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    parsed = JSON.parse(rawBody);
  } catch {
    return ownerFailure("OWNER_WRITE_JSON_INVALID", 400);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return ownerFailure("OWNER_WRITE_COMMAND_INVALID", 400);
  }

  const record = parsed as Record<string, unknown>;
  if (typeof record.action !== "string" || !OWNER_ACTIONS.has(record.action)) {
    return ownerFailure("OWNER_WRITE_ACTION_FORBIDDEN", 403);
  }

  const action = record.action as ProductionOwnerAction;
  const allowedFields = action === "APPROVE_SCENE" ? new Set(["action", "sceneId"]) : new Set(["action"]);
  if (Object.keys(record).some((key) => !allowedFields.has(key))) {
    return ownerFailure("OWNER_WRITE_COMMAND_FIELD_FORBIDDEN", 400);
  }
  if (action === "APPROVE_SCENE" && (typeof record.sceneId !== "string" || record.sceneId.trim().length === 0)) {
    return ownerFailure("SCENE_ID_REQUIRED", 400);
  }

  return {
    bodySha256: await sha256RawBody(bytes),
    payload: {
      action,
      ...(action === "APPROVE_SCENE" ? { sceneId: String(record.sceneId).trim() } : {}),
    } satisfies ProductionOwnerPayload,
  };
}

function productionOwnerCorrelationId(request: Request) {
  const supplied = request.headers.get("x-correlation-id")?.trim() ?? "";
  return CORRELATION_ID_PATTERN.test(supplied) ? supplied : `production-owner:${crypto.randomUUID()}`;
}

async function productionOwnerAuditIdentity(
  request: Request,
  projectId: string,
  normalizedEmail: string,
  action: ProductionOwnerAction,
  bodySha256: string,
): Promise<WriteCommandAuditIdentity> {
  return {
    handlerIdentity: OWNER_HANDLER_IDENTITY,
    actorType: "CHATGPT_OWNER",
    actorSubjectHash: await hashActorSubject("CHATGPT_OWNER", normalizedEmail),
    action,
    resourceScope: `project:${projectId}:production`,
    correlationId: productionOwnerCorrelationId(request),
    requestHash: bodySha256,
  };
}

const sceneBlueprints = [
  { beat: "The tap", visualIntent: "Macro close-up of a card tapping a payment terminal; hold on APPROVED while the world behind it stays unseen.", shotType: "Macro b-roll", mediaStrategy: "STOCK_PAID", searchQuery: "contactless credit card payment terminal macro 4k", assetSource: "Artgrid / Storyblocks" },
  { beat: "Approval is not money", visualIntent: "Split-screen diagram: green authorization signal now, actual funds moving later.", shotType: "Original diagram", mediaStrategy: "DIAGRAM", searchQuery: "authorization versus settlement payment flow", assetSource: "Frameflow diagram" },
  { beat: "Six participants", visualIntent: "Build a clean six-node transaction map one participant at a time, keeping the cardholder at the center.", shotType: "Motion diagram", mediaStrategy: "GENERATIVE", searchQuery: "six party credit card transaction network diagram", assetSource: "Generated + original layout" },
  { beat: "The $100 receipt", visualIntent: "A $100 receipt anchors the example; labels separate customer total from merchant net deposit.", shotType: "Tabletop insert", mediaStrategy: "STOCK_FREE", searchQuery: "restaurant receipt credit card close up vertical blank", assetSource: "Pexels / Pixabay" },
  { beat: "Authorization route", visualIntent: "Animate the request from terminal to acquirer, network and issuer, then return the response in reverse.", shotType: "Route map", mediaStrategy: "DIAGRAM", searchQuery: "card authorization request acquirer network issuer flow", assetSource: "Frameflow diagram" },
  { beat: "Issuer decision", visualIntent: "Abstract risk engine checks available credit and fraud signals without showing a real bank interface.", shotType: "UI abstraction", mediaStrategy: "GENERATIVE", searchQuery: "bank fraud risk decision dashboard abstract cinematic", assetSource: "Generated visual" },
  { beat: "Batch and clear", visualIntent: "Many approved transactions stack into a batch, reconcile, and flow into clearing lanes overnight.", shotType: "Data animation", mediaStrategy: "GENERATIVE", searchQuery: "payment transaction batch clearing data animation", assetSource: "Generated visual" },
  { beat: "The net deposit", visualIntent: "Finish on a simple fee waterfall: $100 purchase, variable costs, merchant net deposit; label all values illustrative.", shotType: "Original diagram", mediaStrategy: "DIAGRAM", searchQuery: "merchant card payment fee waterfall diagram", assetSource: "Frameflow diagram" },
];

type RuntimeD1 = {
  prepare(sql: string): { run(): Promise<unknown> };
};

let productionSchemaReady: Promise<void> | null = null;

async function ensureProductionSchema() {
  if (!productionSchemaReady) {
    productionSchemaReady = (async () => {
      const { env } = await import("cloudflare:workers") as unknown as { env: { DB?: RuntimeD1 } };
      if (!env.DB) throw new Error("Production database is unavailable");
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS scene_manifest (
        id text PRIMARY KEY NOT NULL,
        project_id text NOT NULL,
        segment_id text NOT NULL,
        scene_number integer NOT NULL,
        start_seconds real,
        end_seconds real,
        beat text NOT NULL,
        narration_excerpt text NOT NULL,
        visual_intent text NOT NULL,
        shot_type text NOT NULL,
        media_strategy text NOT NULL,
        search_query text NOT NULL,
        asset_source text NOT NULL,
        asset_url text,
        license_status text DEFAULT 'NEEDS_SOURCE' NOT NULL,
        asset_status text DEFAULT 'PLANNED' NOT NULL,
        scene_status text DEFAULT 'DRAFT' NOT NULL,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`).run();
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS production_packages (
        id text PRIMARY KEY NOT NULL,
        project_id text NOT NULL,
        version integer NOT NULL,
        status text DEFAULT 'READY' NOT NULL,
        manifest_json text NOT NULL,
        total_duration real DEFAULT 0 NOT NULL,
        export_format text DEFAULT 'FRAMEFLOW_JSON_V1' NOT NULL,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`).run();
    })().catch((error) => {
      productionSchemaReady = null;
      throw error;
    });
  }
  await productionSchemaReady;
}

async function seedProduction(projectId: string) {
  const db = await getDb();
  const existing = await db.select({ id: sceneManifest.id }).from(sceneManifest).where(eq(sceneManifest.projectId, projectId)).limit(1);
  if (existing.length) return;
  const segments = await db.select().from(narrationSegments).where(eq(narrationSegments.projectId, projectId)).orderBy(asc(narrationSegments.position));
  if (!segments.length) return;
  if (segments.every((segment) => segment.status === "APPROVED")) {
    const events = await db.select().from(workflowEvents).where(eq(workflowEvents.projectId, projectId));
    if (!events.some((event) => event.eventType === "VOICE_GATE_PASSED")) {
      await db.update(videoProjects).set({ status: "STORYBOARDING", progress: 68, nextAction: "Review scene manifest", updatedAt: new Date().toISOString() }).where(eq(videoProjects.id, projectId));
      await db.insert(workflowEvents).values({ projectId, fromStatus: "VOICE_PRODUCTION", toStatus: "STORYBOARDING", eventType: "VOICE_GATE_PASSED", summary: `${segments.length} approved narration takes locked; storyboard production unlocked` });
    }
  }
  let cursor = 0;
  const scenes = sceneBlueprints.map((blueprint, index) => {
    const segment = segments[Math.min(Math.floor(index / 2), segments.length - 1)];
    const segmentDuration = segment.durationSeconds || 30;
    const duration = segmentDuration / 2;
    const startSeconds = cursor;
    cursor += duration;
    return {
      id: `${projectId}-SC-${String(index + 1).padStart(2, "0")}`,
      projectId,
      segmentId: segment.id,
      sceneNumber: index + 1,
      startSeconds,
      endSeconds: cursor,
      narrationExcerpt: segment.text.slice(0, 150) + (segment.text.length > 150 ? "…" : ""),
      ...blueprint,
      licenseStatus: blueprint.mediaStrategy === "DIAGRAM" ? "VERIFIED" : "NEEDS_SOURCE",
      assetStatus: blueprint.mediaStrategy === "DIAGRAM" ? "READY" : "PLANNED",
      sceneStatus: "DRAFT",
    };
  });
  // D1 has a bounded variable count per prepared statement. Eight scene rows
  // exceed that limit when Drizzle expands them into one multi-value insert,
  // so persist each small, idempotent row independently.
  for (const scene of scenes) {
    await db.insert(sceneManifest).values(scene).onConflictDoNothing();
  }
  await db.insert(workflowEvents).values({ projectId, toStatus: "STORYBOARDING", eventType: "SCENE_MANIFEST_CREATED", summary: `${scenes.length}-scene production manifest created from approved narration timing` });
}

async function buildPackage(projectId: string) {
  const db = await getDb();
  const [project, latestScript, scenes, segments, packages] = await Promise.all([
    db.select().from(videoProjects).where(eq(videoProjects.id, projectId)).limit(1),
    db.select().from(scriptVersions).where(eq(scriptVersions.projectId, projectId)).orderBy(desc(scriptVersions.version)).limit(1),
    db.select().from(sceneManifest).where(eq(sceneManifest.projectId, projectId)).orderBy(asc(sceneManifest.sceneNumber)),
    db.select().from(narrationSegments).where(eq(narrationSegments.projectId, projectId)).orderBy(asc(narrationSegments.position)),
    db.select().from(productionPackages).where(eq(productionPackages.projectId, projectId)).orderBy(desc(productionPackages.version)),
  ]);
  const version = (packages[0]?.version || 0) + 1;
  const totalDuration = scenes.reduce((max, scene) => Math.max(max, scene.endSeconds || 0), 0);
  const manifest = {
    schema: "frameflow.production.v1",
    generatedAt: new Date().toISOString(),
    project: project[0],
    script: latestScript[0] ? { id: latestScript[0].id, version: latestScript[0].version } : null,
    narration: segments.map((segment) => ({
      id: segment.id, label: segment.label, text: segment.text, durationSeconds: segment.durationSeconds,
      status: segment.status, audioUrl: `/api/projects/${projectId}/voice?audio=${encodeURIComponent(segment.id)}`,
      alignment: segment.alignment ? JSON.parse(segment.alignment) : null,
    })),
    scenes,
    handoff: { fps: 30, resolution: "3840x2160", aspectRatio: "16:9", captions: "character timestamps included", finalRenderBlockedUntil: "all media licenses verified" },
  };
  const id = `${projectId}-PKG-V${version}`;
  await db.insert(productionPackages).values({ id, projectId, version, status: "READY", manifestJson: JSON.stringify(manifest), totalDuration, exportFormat: "FRAMEFLOW_JSON_V1" });
  await db.insert(workflowEvents).values({ projectId, toStatus: "PRODUCTION_PREP", eventType: "EXPORT_PACKAGE_BUILT", summary: `Production package v${version} built with narration, timestamps and ${scenes.length} scene briefs` });
  return { id, version };
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await ensureProductionSchema();
    await seedProduction(id);
    const db = await getDb();
    const url = new URL(request.url);
    const [scenes, segments, packages] = await Promise.all([
      db.select().from(sceneManifest).where(eq(sceneManifest.projectId, id)).orderBy(asc(sceneManifest.sceneNumber)),
      db.select().from(narrationSegments).where(eq(narrationSegments.projectId, id)).orderBy(asc(narrationSegments.position)),
      db.select().from(productionPackages).where(eq(productionPackages.projectId, id)).orderBy(desc(productionPackages.version)),
    ]);
    if (url.searchParams.get("download") === "latest") {
      if (!packages[0]) return Response.json({ error: "Build an export package first" }, { status: 404 });
      return new Response(packages[0].manifestJson, { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="${id}-production-v${packages[0].version}.json"` } });
    }
    const approvedVoice = segments.length > 0 && segments.every((segment) => segment.status === "APPROVED");
    return Response.json({
      scenes, segments, packages,
      gates: {
        voice: approvedVoice,
        storyboardReady: scenes.length > 0 && scenes.every((scene) => scene.visualIntent && scene.searchQuery),
        storyboardPassed: scenes.length > 0 && scenes.every((scene) => scene.sceneStatus === "APPROVED"),
        licensesReady: scenes.length > 0 && scenes.every((scene) => scene.licenseStatus === "VERIFIED"),
      },
    });
  } catch (error) {
    console.error("Production workspace GET failed", error);
    return Response.json({ error: "Scene manifest could not be prepared", code: "SCENE_MANIFEST_FAILED" }, { status: 500 });
  }
}

async function executeProductionOwnerAction(projectId: string, payload: ProductionOwnerPayload) {
  await ensureProductionSchema();
  await seedProduction(projectId);
  const db = await getDb();

  if (payload.action === "APPROVE_SCENE") {
    const sceneId = payload.sceneId as string;
    await db.update(sceneManifest)
      .set({ status: "APPROVED", updatedAt: new Date() })
      .where(eq(sceneManifest.id, sceneId));
    return Response.json({ ok: true, sceneId, status: "APPROVED" });
  }

  if (payload.action === "PASS_STORYBOARD_GATE") {
    const requiredScenes = await db.select().from(sceneManifest).where(eq(sceneManifest.projectId, projectId));
    const blockers = requiredScenes.filter((scene) => scene.reviewRequired === 1 && scene.status !== "APPROVED");
    if (blockers.length > 0) {
      return Response.json({ error: "All review-required scenes must be approved", blockerCount: blockers.length }, { status: 409 });
    }
    const eventId = crypto.randomUUID();
    await db.update(videoProjects)
      .set({ status: "STORYBOARD_APPROVED", updatedAt: new Date() })
      .where(eq(videoProjects.id, projectId));
    await db.insert(workflowEvents).values({
      id: eventId,
      projectId,
      eventType: "STORYBOARD_GATE_PASSED",
      fromState: "STORYBOARD_REVIEW",
      toState: "STORYBOARD_APPROVED",
      reasonCode: "OWNER_APPROVED",
      actorType: "HUMAN_OWNER",
      idempotencyKey: `storyboard-gate-${projectId}`,
      payload: JSON.stringify({ approvedAt: new Date().toISOString() }),
    });
    return Response.json({ ok: true, status: "STORYBOARD_APPROVED" });
  }

  if (payload.action === "BUILD_EXPORT") {
    const project = await db.query.videoProjects.findFirst({ where: eq(videoProjects.id, projectId) });
    if (project?.status !== "STORYBOARD_APPROVED") {
      return Response.json({ error: "Storyboard gate must pass before export" }, { status: 409 });
    }
    const pkg = await buildPackage(projectId);
    return Response.json({ ok: true, package: pkg });
  }

  return ownerFailure("OWNER_WRITE_ACTION_FORBIDDEN", 403);
}

async function runAuditedProductionOwnerAction(
  db: WriteCommandAuditDatabase,
  identity: WriteCommandAuditIdentity,
  execute: () => Promise<Response>,
) {
  await appendWriteCommandAudit(db, identity, "AUTHORIZED", null);

  let response: Response;
  try {
    response = await execute();
  } catch (error) {
    await appendWriteCommandAudit(db, identity, "FAILED", null);
    throw error;
  }

  if (!response.ok) {
    await appendWriteCommandAudit(db, identity, "FAILED", null);
    return response;
  }

  try {
    await appendWriteCommandAudit(db, identity, "SUCCEEDED", null);
    return response;
  } catch (error) {
    await appendWriteCommandAudit(db, identity, "FAILED", null);
    throw error;
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authorization = await authorizeProductionOwnerWrite(request);
    if (authorization instanceof Response) return authorization;

    const body = await readBoundedProductionOwnerBody(request);
    if (body instanceof Response) return body;

    const { id } = await context.params;
    const auditIdentity = await productionOwnerAuditIdentity(
      request,
      id,
      authorization.normalizedEmail,
      body.payload.action,
      body.bodySha256,
    );

    return await runAuditedProductionOwnerAction(
      authorization.env.DB as WriteCommandAuditDatabase,
      auditIdentity,
      () => executeProductionOwnerAction(id, body.payload),
    );
  } catch (error) {
    console.error("Production action failed", error);
    return Response.json({ error: "Production action could not be completed", code: "PRODUCTION_ACTION_FAILED" }, { status: 500 });
  }
}
