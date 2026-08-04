import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import {
  narrationSegments,
  productionPackages,
  sceneManifest,
  scriptVersions,
  videoProjects,
  workflowEvents,
} from "../../../../../db/schema";

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
  await db.insert(sceneManifest).values(scenes).onConflictDoNothing();
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
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load production workspace" }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await seedProduction(id);
    const db = await getDb();
    const payload = await request.json() as { action?: "APPROVE_SCENE" | "PASS_STORYBOARD_GATE" | "BUILD_EXPORT"; sceneId?: string };
    if (payload.action === "APPROVE_SCENE") {
      if (!payload.sceneId) return Response.json({ error: "sceneId is required" }, { status: 400 });
      const [scene] = await db.select().from(sceneManifest).where(eq(sceneManifest.id, payload.sceneId)).limit(1);
      if (!scene || scene.projectId !== id) return Response.json({ error: "Scene not found" }, { status: 404 });
      await db.update(sceneManifest).set({ sceneStatus: "APPROVED", updatedAt: new Date().toISOString() }).where(eq(sceneManifest.id, scene.id));
      return Response.json({ ok: true });
    }
    if (payload.action === "PASS_STORYBOARD_GATE") {
      const scenes = await db.select().from(sceneManifest).where(eq(sceneManifest.projectId, id));
      if (!scenes.length || scenes.some((scene) => scene.sceneStatus !== "APPROVED")) return Response.json({ error: "Approve every scene before passing the storyboard gate" }, { status: 409 });
      await db.update(videoProjects).set({ status: "PRODUCTION_PREP", progress: 78, nextAction: "Source licensed media and build export", updatedAt: new Date().toISOString() }).where(eq(videoProjects.id, id));
      const events = await db.select().from(workflowEvents).where(eq(workflowEvents.projectId, id));
      if (!events.some((event) => event.eventType === "STORYBOARD_GATE_PASSED")) await db.insert(workflowEvents).values({ projectId: id, fromStatus: "STORYBOARDING", toStatus: "PRODUCTION_PREP", eventType: "STORYBOARD_GATE_PASSED", summary: `${scenes.length} scene briefs approved; media sourcing and export unlocked` });
      return Response.json({ ok: true });
    }
    if (payload.action === "BUILD_EXPORT") {
      const result = await buildPackage(id);
      return Response.json({ ok: true, ...result });
    }
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to update production workspace" }, { status: 500 });
  }
}
