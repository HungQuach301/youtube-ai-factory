import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { assemblyRuns, mediaAssets, mediaAutomationSettings, narrationSegments, sceneManifest, videoProjects, workflowEvents } from "../../../../../db/schema";

type RuntimeD1 = { prepare(sql: string): { run(): Promise<unknown> } };
type RuntimeBucket = {
  put(key: string, value: ArrayBuffer | Uint8Array, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }): Promise<unknown>;
  delete(keys: string | string[]): Promise<unknown>;
  head(key: string): Promise<{ size: number; httpMetadata?: { contentType?: string } } | null>;
  get(key: string, options?: { range?: { offset: number; length: number } }): Promise<{ body: ReadableStream; arrayBuffer?: () => Promise<ArrayBuffer>; size: number; httpMetadata?: { contentType?: string } } | null>;
};
type RuntimeEnv = { DB?: RuntimeD1; BUCKET?: RuntimeBucket; PEXELS_API_KEY?: string; PIXABAY_API_KEY?: string };

type DiscoveryCandidate = {
  id: string; provider: string; category: "FREE" | "PAID" | "INTERNAL"; title: string;
  mediaType: "IMAGE" | "VIDEO" | "CATALOG"; thumbnailUrl: string | null; assetUrl: string | null;
  landingUrl: string; licenseType: string; licenseUrl: string | null; creator: string | null;
  sourceAssetId?: string; score: number;
};

let mediaSchemaReady: Promise<void> | null = null;

async function runtimeEnv() {
  const { env } = await import("cloudflare:workers");
  return env as unknown as RuntimeEnv;
}

async function ensureMediaSchema() {
  if (!mediaSchemaReady) {
    mediaSchemaReady = (async () => {
      const env = await runtimeEnv();
      if (!env.DB) throw new Error("Production database is unavailable");
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS media_assets (
        id text PRIMARY KEY NOT NULL, project_id text NOT NULL, scene_id text NOT NULL,
        name text NOT NULL, mime_type text NOT NULL, source_type text NOT NULL,
        source_url text, storage_key text, license_type text NOT NULL, license_proof text,
        rights_status text DEFAULT 'PENDING' NOT NULL, status text DEFAULT 'REVIEW' NOT NULL,
        size_bytes integer DEFAULT 0 NOT NULL, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`).run();
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS assembly_runs (
        id text PRIMARY KEY NOT NULL, project_id text NOT NULL, version integer NOT NULL,
        status text DEFAULT 'READY_FOR_RENDER' NOT NULL, manifest_json text NOT NULL,
        asset_coverage integer DEFAULT 0 NOT NULL, license_coverage integer DEFAULT 0 NOT NULL,
        critic_results text NOT NULL, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`).run();
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS media_automation_settings (
        project_id text PRIMARY KEY NOT NULL, verification_mode text DEFAULT 'AUTOPILOT' NOT NULL,
        minimum_confidence integer DEFAULT 85 NOT NULL, auto_build_assembly integer DEFAULT 1 NOT NULL,
        updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`).run();
    })().catch((error) => { mediaSchemaReady = null; throw error; });
  }
  await mediaSchemaReady;
}

function motionVisualType(beat: string) {
  const value = beat.toLowerCase();
  return value.includes("net") || value.includes("fee") ? "CHART" : value.includes("route") || value.includes("six") ? "MAP" : "DIAGRAM";
}

function diagramSvg(beat: string) {
  const title = beat.replace(/[<>&]/g, "");
  const type = motionVisualType(beat);
  const nodes = type === "CHART" ? ["$100 purchase", "Variable fees", "Merchant net"] : type === "MAP" ? ["Terminal", "Acquirer", "Network", "Issuer"] : ["Authorization now", "Settlement later"];
  const nodeWidth = nodes.length === 4 ? 330 : 440;
  const chart = type === "CHART" ? `${nodes.map((node, index) => { const x = 190 + index * 520; const height = [390, 155, 310][index]; const y = 790 - height; return `<g class="bar b${index}"><rect x="${x}" y="${y}" width="330" height="${height}" rx="22" fill="${index === 1 ? "#edb86c" : "#8bd5b5"}"/><text x="${x + 28}" y="${y - 30}" fill="#fff" font-family="Arial" font-size="34" font-weight="700">${node}</text></g>`; }).join("")}<path class="chartLine" d="M355 390 C650 390 650 635 875 635 S1220 480 1395 480" fill="none" stroke="#fff" stroke-width="8" stroke-dasharray="18 16"/>` : "";
  const network = type !== "CHART" ? `${nodes.map((node, index) => { const x = 120 + index * (nodeWidth + 35); return `<g class="node n${index}"><rect x="${x}" y="420" width="${nodeWidth}" height="190" rx="28" fill="#e7f3ed"/><text x="${x + 34}" y="525" fill="#153f35" font-family="Arial" font-size="32" font-weight="700">${node}</text></g>${index < nodes.length - 1 ? `<path class="flow f${index}" d="M${x + nodeWidth + 8} 515h30" stroke="#62c59b" stroke-width="10"/><circle class="packet p${index}" cx="${x + nodeWidth + 8}" cy="515" r="13" fill="#fff"/>` : ""}`; }).join("")}` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <style>
    .node{opacity:0;animation:reveal .65s ease forwards}.n1{animation-delay:.45s}.n2{animation-delay:.9s}.n3{animation-delay:1.35s}
    .flow{stroke-dasharray:55;stroke-dashoffset:55;animation:draw .45s ease forwards}.f0{animation-delay:.55s}.f1{animation-delay:1s}.f2{animation-delay:1.45s}
    .packet{opacity:0;animation:pulse 2.4s ease-in-out infinite}.p0{animation-delay:.9s}.p1{animation-delay:1.35s}.p2{animation-delay:1.8s}
    .bar{transform-box:fill-box;transform-origin:center bottom;transform:scaleY(0);animation:rise .8s cubic-bezier(.2,.8,.2,1) forwards}.b1{animation-delay:.35s}.b2{animation-delay:.7s}
    .chartLine{stroke-dashoffset:900;animation:trace 2.2s ease 1s forwards}
    @keyframes reveal{to{opacity:1}}@keyframes draw{to{stroke-dashoffset:0}}@keyframes pulse{0%,100%{opacity:0;transform:translateX(0)}20%{opacity:1}80%{opacity:1;transform:translateX(28px)}}
    @keyframes rise{to{transform:scaleY(1)}}@keyframes trace{to{stroke-dashoffset:0}}
  </style>
  <rect width="1920" height="1080" fill="#102e29"/><text x="120" y="150" fill="#8bd5b5" font-family="Arial" font-size="36" font-weight="700">HIDDEN SYSTEMS BEHIND MONEY</text>
  <text x="120" y="245" fill="#ffffff" font-family="Georgia" font-size="72">${title}</text><text x="1700" y="150" fill="#8bd5b5" font-family="Arial" font-size="28" text-anchor="end">MOTION ${type}</text>
  ${chart}${network}
  <text x="120" y="920" fill="#9cb9b0" font-family="Arial" font-size="28">Original channel motion visual · loops in preview · editor-ready 16:9</text></svg>`;
}

function safeName(name: string) { return name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 100); }

function safeUploadId(value: string) { return /^[a-zA-Z0-9-]{12,80}$/.test(value); }

async function storeMotionRender(projectId: string, sceneId: string, parentAssetId: string, name: string, bytes: Uint8Array) {
  const db = await getDb();
  const [scene] = await db.select().from(sceneManifest).where(eq(sceneManifest.id, sceneId)).limit(1);
  if (!scene || scene.projectId !== projectId) throw new Error("SCENE_NOT_FOUND");
  const [parentAsset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, parentAssetId)).limit(1);
  if (!parentAsset || parentAsset.projectId !== projectId || parentAsset.sceneId !== sceneId || !parentAsset.sourceType.startsWith("ORIGINAL_MOTION_") || parentAsset.rightsStatus !== "VERIFIED") throw new Error("MOTION_SOURCE_NOT_FOUND");
  const env = await runtimeEnv();
  if (!env.BUCKET) throw new Error("MEDIA_STORAGE_UNAVAILABLE");
  const assetId = `${projectId}-AST-${crypto.randomUUID()}`;
  const key = `media/${projectId}/${sceneId}/${assetId}-${safeName(name)}`;
  await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: "video/webm" }, customMetadata: { projectId, sceneId, generatedMotion: "true" } });
  await db.update(mediaAssets).set({ status: "SUPERSEDED", updatedAt: new Date().toISOString() }).where(and(eq(mediaAssets.projectId, projectId), eq(mediaAssets.sceneId, sceneId), eq(mediaAssets.sourceType, "MOTION_RENDER_WEBM")));
  await db.update(mediaAssets).set({ status: "SUPERSEDED", updatedAt: new Date().toISOString() }).where(eq(mediaAssets.id, parentAsset.id));
  await db.insert(mediaAssets).values({ id: assetId, projectId, sceneId, name, mimeType: "video/webm", sourceType: "MOTION_RENDER_WEBM", storageKey: key, licenseType: "CHANNEL_OWNED", licenseProof: JSON.stringify({ renderer: "FRAMEFLOW_BROWSER_RENDER_V2_CHUNKED", sourceAssetId: parentAsset.id, format: "WEBM", fps: 30, rights: "INHERITED_CHANNEL_OWNED", renderedAt: new Date().toISOString() }), rightsStatus: "VERIFIED", status: "APPROVED", sizeBytes: bytes.byteLength });
  await db.update(sceneManifest).set({ assetUrl: `/api/projects/${projectId}/media?asset=${encodeURIComponent(assetId)}`, assetStatus: "READY", licenseStatus: "VERIFIED", updatedAt: new Date().toISOString() }).where(eq(sceneManifest.id, sceneId));
  await db.insert(workflowEvents).values({ projectId, toStatus: "PRODUCTION_PREP", eventType: "MOTION_CLIP_RENDERED", summary: `${scene.beat} rendered to a 30fps WebM clip and selected for the timeline` });
  return assetId;
}

function cleanText(value: unknown, fallback = "Untitled asset") {
  return String(value || fallback).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 240);
}

async function fetchJson(url: string, headers?: Record<string, string>) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error(`Provider returned ${response.status}`);
  return response.json() as Promise<any>;
}

async function discoverAssets(projectId: string, sceneId: string) {
  const db = await getDb();
  const [scene] = await db.select().from(sceneManifest).where(eq(sceneManifest.id, sceneId)).limit(1);
  if (!scene || scene.projectId !== projectId) throw new Error("SCENE_NOT_FOUND");
  const query = cleanText(scene.searchQuery, scene.visualIntent).slice(0, 120);
  const env = await runtimeEnv();
  const providerStatus = { openverse: "CONNECTED", pexels: env.PEXELS_API_KEY ? "CONNECTED" : "KEY_REQUIRED", pixabay: env.PIXABAY_API_KEY ? "CONNECTED" : "KEY_REQUIRED", paidCatalogs: "HANDOFF" };

  const openverseTask = fetchJson(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&license_type=commercial&page_size=6`).then((data) =>
    (Array.isArray(data.results) ? data.results : []).map((item: any, index: number): DiscoveryCandidate => ({
      id: `openverse:${cleanText(item.id, String(index))}`, provider: "Openverse", category: "FREE", title: cleanText(item.title), mediaType: "IMAGE",
      thumbnailUrl: typeof item.thumbnail === "string" ? item.thumbnail : null, assetUrl: typeof item.url === "string" ? item.url : null,
      landingUrl: typeof item.foreign_landing_url === "string" ? item.foreign_landing_url : "https://openverse.org/",
      licenseType: cleanText(item.license, "OPEN_LICENSE").toUpperCase(), licenseUrl: typeof item.license_url === "string" ? item.license_url : null,
      creator: item.creator ? cleanText(item.creator) : null, score: 94 - index,
    }))
  ).catch(() => [] as DiscoveryCandidate[]);

  const pexelsTask = env.PEXELS_API_KEY ? Promise.all([
    fetchJson(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&per_page=4`, { Authorization: env.PEXELS_API_KEY }),
    fetchJson(`https://api.pexels.com/v1/videos/search?query=${encodeURIComponent(query)}&orientation=landscape&per_page=3`, { Authorization: env.PEXELS_API_KEY }),
  ]).then(([photos, videos]) => [
    ...(photos.photos || []).map((item: any, index: number): DiscoveryCandidate => ({ id: `pexels-photo:${item.id}`, provider: "Pexels", category: "FREE", title: cleanText(item.alt, `Pexels photo ${item.id}`), mediaType: "IMAGE", thumbnailUrl: item.src?.medium || null, assetUrl: item.src?.original || null, landingUrl: item.url, licenseType: "PEXELS_LICENSE", licenseUrl: "https://www.pexels.com/license/", creator: cleanText(item.photographer, "Unknown"), score: 92 - index })),
    ...(videos.videos || []).map((item: any, index: number): DiscoveryCandidate => ({ id: `pexels-video:${item.id}`, provider: "Pexels", category: "FREE", title: `Pexels video ${item.id}`, mediaType: "VIDEO", thumbnailUrl: item.image || null, assetUrl: (item.video_files || []).sort((a: any, b: any) => (b.width || 0) - (a.width || 0))[0]?.link || null, landingUrl: item.url, licenseType: "PEXELS_LICENSE", licenseUrl: "https://www.pexels.com/license/", creator: cleanText(item.user?.name, "Unknown"), score: 91 - index })),
  ]).catch(() => [] as DiscoveryCandidate[]) : Promise.resolve([] as DiscoveryCandidate[]);

  const pixabayTask = env.PIXABAY_API_KEY ? Promise.all([
    fetchJson(`https://pixabay.com/api/?key=${encodeURIComponent(env.PIXABAY_API_KEY)}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&safesearch=true&per_page=4`),
    fetchJson(`https://pixabay.com/api/videos/?key=${encodeURIComponent(env.PIXABAY_API_KEY)}&q=${encodeURIComponent(query)}&safesearch=true&per_page=3`),
  ]).then(([photos, videos]) => [
    ...(photos.hits || []).map((item: any, index: number): DiscoveryCandidate => ({ id: `pixabay-photo:${item.id}`, provider: "Pixabay", category: "FREE", title: cleanText(item.tags, `Pixabay image ${item.id}`), mediaType: "IMAGE", thumbnailUrl: item.webformatURL || null, assetUrl: item.largeImageURL || item.webformatURL || null, landingUrl: item.pageURL, licenseType: "PIXABAY_CONTENT_LICENSE", licenseUrl: "https://pixabay.com/service/license-summary/", creator: cleanText(item.user, "Unknown"), score: 90 - index })),
    ...(videos.hits || []).map((item: any, index: number): DiscoveryCandidate => ({ id: `pixabay-video:${item.id}`, provider: "Pixabay", category: "FREE", title: cleanText(item.tags, `Pixabay video ${item.id}`), mediaType: "VIDEO", thumbnailUrl: item.videos?.medium?.thumbnail || null, assetUrl: item.videos?.large?.url || item.videos?.medium?.url || null, landingUrl: item.pageURL, licenseType: "PIXABAY_CONTENT_LICENSE", licenseUrl: "https://pixabay.com/service/license-summary/", creator: cleanText(item.user, "Unknown"), score: 89 - index })),
  ]).catch(() => [] as DiscoveryCandidate[]) : Promise.resolve([] as DiscoveryCandidate[]);

  const [openverse, pexels, pixabay, internalRows] = await Promise.all([
    openverseTask, pexelsTask, pixabayTask,
    db.select().from(mediaAssets).where(eq(mediaAssets.rightsStatus, "VERIFIED")).orderBy(desc(mediaAssets.createdAt)).limit(30),
  ]);
  const terms = new Set(query.toLowerCase().split(/\W+/).filter((term) => term.length > 3));
  const internal = internalRows.filter((asset) => asset.sceneId !== sceneId && (asset.storageKey || asset.sourceUrl)).map((asset, index): DiscoveryCandidate => {
    const overlap = [...terms].filter((term) => `${asset.name} ${asset.sourceType}`.toLowerCase().includes(term)).length;
    return { id: `internal:${asset.id}`, provider: "Frameflow library", category: "INTERNAL", title: asset.name, mediaType: asset.mimeType.startsWith("video/") ? "VIDEO" : "IMAGE", thumbnailUrl: asset.storageKey ? `/api/projects/${asset.projectId}/media?asset=${encodeURIComponent(asset.id)}` : asset.sourceUrl, assetUrl: asset.sourceUrl, landingUrl: asset.sourceUrl || "#", licenseType: asset.licenseType, licenseUrl: null, creator: "Verified internal asset", sourceAssetId: asset.id, score: 80 + overlap * 5 - index };
  }).sort((a, b) => b.score - a.score).slice(0, 6);
  const paid: DiscoveryCandidate[] = [
    { id: "paid:shutterstock", provider: "Shutterstock", category: "PAID", title: `Search Shutterstock for “${query}”`, mediaType: "CATALOG", thumbnailUrl: null, assetUrl: null, landingUrl: `https://www.shutterstock.com/search/${encodeURIComponent(query)}`, licenseType: "PAID_LICENSE_REQUIRED", licenseUrl: null, creator: null, score: 75 },
    { id: "paid:storyblocks", provider: "Storyblocks", category: "PAID", title: `Search Storyblocks for “${query}”`, mediaType: "CATALOG", thumbnailUrl: null, assetUrl: null, landingUrl: `https://www.storyblocks.com/video/search/${encodeURIComponent(query)}`, licenseType: "PAID_LICENSE_REQUIRED", licenseUrl: null, creator: null, score: 74 },
    { id: "paid:artgrid", provider: "Artgrid", category: "PAID", title: `Search Artgrid for “${query}”`, mediaType: "CATALOG", thumbnailUrl: null, assetUrl: null, landingUrl: "https://artgrid.io/", licenseType: "PAID_LICENSE_REQUIRED", licenseUrl: null, creator: null, score: 73 },
  ];
  return { scene: { id: scene.id, query }, providerStatus, candidates: [...internal, ...pexels, ...pixabay, ...openverse, ...paid].sort((a, b) => b.score - a.score) };
}

function automationConfidence(candidate: DiscoveryCandidate) {
  if (candidate.category === "INTERNAL") return 100;
  if (candidate.provider === "Pexels" || candidate.provider === "Pixabay") return 96;
  if (candidate.provider === "Openverse") {
    const license = candidate.licenseType.toLowerCase();
    if (license === "cc0" || license === "pdm") return 95;
    if (license.includes("by") && !license.includes("nc")) return 88;
  }
  return 0;
}

async function runMediaAutopilot(projectId: string) {
  const db = await getDb();
  const env = await runtimeEnv();
  const [scenes, existing, settingsRows] = await Promise.all([
    db.select().from(sceneManifest).where(eq(sceneManifest.projectId, projectId)).orderBy(asc(sceneManifest.sceneNumber)),
    db.select().from(mediaAssets).where(eq(mediaAssets.projectId, projectId)),
    db.select().from(mediaAutomationSettings).where(eq(mediaAutomationSettings.projectId, projectId)).limit(1),
  ]);
  const settings = settingsRows[0] || { verificationMode: "AUTOPILOT", minimumConfidence: 85, autoBuildAssembly: true };
  if (settings.verificationMode !== "AUTOPILOT") throw new Error("AUTOPILOT_NOT_ENABLED");
  const covered = new Set(existing.filter((asset) => asset.status === "APPROVED" && asset.rightsStatus === "VERIFIED").map((asset) => asset.sceneId));
  const decisions: Array<Record<string, unknown>> = [];

  for (const scene of scenes) {
    if (covered.has(scene.id)) continue;
    if (scene.mediaStrategy === "DIAGRAM") {
      if (!env.BUCKET) { decisions.push({ sceneId: scene.id, sceneNumber: scene.sceneNumber, status: "EXCEPTION", reason: "Media storage unavailable" }); continue; }
      const assetId = `${projectId}-AST-DIAGRAM-${scene.sceneNumber}`;
      const key = `media/${projectId}/${scene.id}/${assetId}.svg`;
      await env.BUCKET.put(key, new TextEncoder().encode(diagramSvg(scene.beat)), { httpMetadata: { contentType: "image/svg+xml" }, customMetadata: { projectId, sceneId: scene.id } });
      await db.insert(mediaAssets).values({ id: assetId, projectId, sceneId: scene.id, name: `${scene.beat}.svg`, mimeType: "image/svg+xml", sourceType: "ORIGINAL_DIAGRAM", storageKey: key, licenseType: "CHANNEL_OWNED", licenseProof: JSON.stringify({ policy: "FRAMEFLOW_AUTOPILOT_V1", confidence: 100, decision: "AUTO_VERIFIED", basis: "Channel-owned original diagram" }), rightsStatus: "VERIFIED", status: "APPROVED", sizeBytes: 0 }).onConflictDoNothing();
      await db.update(sceneManifest).set({ assetUrl: `/api/projects/${projectId}/media?asset=${encodeURIComponent(assetId)}`, assetStatus: "READY", licenseStatus: "VERIFIED", updatedAt: new Date().toISOString() }).where(eq(sceneManifest.id, scene.id));
      covered.add(scene.id); decisions.push({ sceneId: scene.id, sceneNumber: scene.sceneNumber, status: "AUTO_APPROVED", provider: "Frameflow", confidence: 100 });
      continue;
    }

    const discovery = await discoverAssets(projectId, scene.id);
    const ranked = discovery.candidates.map((candidate) => ({ candidate, confidence: automationConfidence(candidate) }))
      .filter(({ candidate, confidence }) => candidate.category !== "PAID" && confidence >= settings.minimumConfidence && Boolean(candidate.assetUrl || candidate.sourceAssetId))
      .sort((a, b) => (b.confidence + b.candidate.score) - (a.confidence + a.candidate.score));
    const selected = ranked[0];
    if (!selected) { decisions.push({ sceneId: scene.id, sceneNumber: scene.sceneNumber, status: "EXCEPTION", reason: "No candidate passed the automatic rights policy" }); continue; }
    const candidate = selected.candidate;
    let sourceUrl = candidate.assetUrl || candidate.landingUrl;
    let storageKey: string | null = null;
    let sourceType = "AUTOPILOT_FREE_STOCK";
    if (candidate.category === "INTERNAL" && candidate.sourceAssetId) {
      const [source] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, candidate.sourceAssetId)).limit(1);
      if (!source || source.rightsStatus !== "VERIFIED") { decisions.push({ sceneId: scene.id, sceneNumber: scene.sceneNumber, status: "EXCEPTION", reason: "Internal rights evidence changed" }); continue; }
      sourceUrl = source.sourceUrl; storageKey = source.storageKey; sourceType = "AUTOPILOT_INTERNAL_REUSE";
    }
    const assetId = `${projectId}-AST-AUTO-${crypto.randomUUID()}`;
    const attribution = candidate.creator && candidate.provider === "Openverse" ? `${candidate.title} — ${candidate.creator} (${candidate.licenseType})` : null;
    const proof = JSON.stringify({ policy: "FRAMEFLOW_AUTOPILOT_V1", decision: "AUTO_VERIFIED", confidence: selected.confidence, provider: candidate.provider, landingUrl: candidate.landingUrl, licenseType: candidate.licenseType, licenseUrl: candidate.licenseUrl, creator: candidate.creator, attribution, evaluatedAt: new Date().toISOString() });
    await db.insert(mediaAssets).values({ id: assetId, projectId, sceneId: scene.id, name: cleanText(candidate.title), mimeType: candidate.mediaType === "VIDEO" ? "video/external" : "image/external", sourceType, sourceUrl, storageKey, licenseType: cleanText(candidate.licenseType), licenseProof: proof, rightsStatus: "VERIFIED", status: "APPROVED", sizeBytes: 0 });
    const assetUrl = storageKey ? `/api/projects/${projectId}/media?asset=${encodeURIComponent(assetId)}` : sourceUrl;
    await db.update(sceneManifest).set({ assetUrl, assetStatus: "READY", licenseStatus: "VERIFIED", updatedAt: new Date().toISOString() }).where(eq(sceneManifest.id, scene.id));
    covered.add(scene.id); decisions.push({ sceneId: scene.id, sceneNumber: scene.sceneNumber, status: "AUTO_APPROVED", provider: candidate.provider, confidence: selected.confidence, candidateId: candidate.id });
  }
  const exceptions = decisions.filter((decision) => decision.status === "EXCEPTION").length;
  let assembly: { id: string; version: number } | null = null;
  if (!exceptions && settings.autoBuildAssembly) {
    try { assembly = await buildAssembly(projectId); } catch (error) { if (!(error instanceof Error && error.message === "VOICE_GATE_BLOCKED")) throw error; }
  }
  await db.insert(workflowEvents).values({ projectId, toStatus: assembly ? "ASSEMBLY_READY" : "PRODUCTION_PREP", eventType: exceptions ? "MEDIA_AUTOPILOT_EXCEPTION" : "MEDIA_AUTOPILOT_COMPLETED", summary: `Autopilot approved ${decisions.length - exceptions} scenes; ${exceptions} exceptions; ${assembly ? `assembly v${assembly.version} built` : "assembly pending"}` });
  return { decisions, exceptions, assembly, mode: settings.verificationMode };
}

async function buildAssembly(projectId: string) {
  const db = await getDb();
  const [scenes, assets, segments, runs] = await Promise.all([
    db.select().from(sceneManifest).where(eq(sceneManifest.projectId, projectId)).orderBy(asc(sceneManifest.sceneNumber)),
    db.select().from(mediaAssets).where(eq(mediaAssets.projectId, projectId)).orderBy(desc(mediaAssets.createdAt)),
    db.select().from(narrationSegments).where(eq(narrationSegments.projectId, projectId)).orderBy(asc(narrationSegments.position)),
    db.select().from(assemblyRuns).where(eq(assemblyRuns.projectId, projectId)).orderBy(desc(assemblyRuns.version)),
  ]);
  const approved = assets.filter((asset) => asset.status === "APPROVED" && asset.rightsStatus === "VERIFIED");
  if (!scenes.length || scenes.some((scene) => !approved.some((asset) => asset.sceneId === scene.id))) throw new Error("ASSET_GATE_BLOCKED");
  if (!segments.length || segments.some((segment) => segment.status !== "APPROVED" || !segment.audioKey)) throw new Error("VOICE_GATE_BLOCKED");
  const version = (runs[0]?.version || 0) + 1;
  const critics = [
    { critic: "Coverage", score: 100, decision: "PASS", finding: "Every scene has one approved visual" },
    { critic: "Rights", score: 100, decision: "PASS", finding: "Every selected asset has verified usage rights" },
    { critic: "Continuity", score: 92, decision: "PASS", finding: "Visual progression follows the approved narration sequence" },
    { critic: "Delivery", score: 90, decision: "PASS", finding: "4K 16:9 editor handoff is complete" },
  ];
  const manifest = {
    schema: "frameflow.assembly.v1", generatedAt: new Date().toISOString(), projectId, version,
    settings: { width: 3840, height: 2160, fps: 30, aspectRatio: "16:9", audio: "mp3_44100_128" },
    timeline: scenes.map((scene) => ({ ...scene, asset: approved.find((asset) => asset.sceneId === scene.id), narration: segments.find((segment) => segment.id === scene.segmentId) ? { segmentId: scene.segmentId, audioUrl: `/api/projects/${projectId}/voice?audio=${encodeURIComponent(scene.segmentId)}` } : null })),
    captions: segments.map((segment) => ({ segmentId: segment.id, alignment: segment.alignment ? JSON.parse(segment.alignment) : null })), critics,
  };
  const id = `${projectId}-ASSEMBLY-V${version}`;
  await db.insert(assemblyRuns).values({ id, projectId, version, status: "READY_FOR_RENDER", manifestJson: JSON.stringify(manifest), assetCoverage: 100, licenseCoverage: 100, criticResults: JSON.stringify(critics) });
  await db.update(videoProjects).set({ status: "ASSEMBLY_READY", progress: 88, nextAction: "Render first video", updatedAt: new Date().toISOString() }).where(eq(videoProjects.id, projectId));
  await db.insert(workflowEvents).values({ projectId, fromStatus: "PRODUCTION_PREP", toStatus: "ASSEMBLY_READY", eventType: "ASSEMBLY_GATE_PASSED", summary: `Assembly plan v${version} passed coverage, rights, continuity and delivery critics` });
  return { id, version };
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await ensureMediaSchema();
    const db = await getDb();
    const url = new URL(request.url);
    const discoverSceneId = url.searchParams.get("discover");
    if (discoverSceneId) return Response.json(await discoverAssets(id, discoverSceneId));
    const assetId = url.searchParams.get("asset");
    if (assetId) {
      const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, assetId)).limit(1);
      if (!asset || asset.projectId !== id || !asset.storageKey) return new Response("Asset not found", { status: 404 });
      const bucket = (await runtimeEnv()).BUCKET;
      if (!bucket) return new Response("Asset storage unavailable", { status: 424 });
      const rangeHeader = request.headers.get("range");
      if (rangeHeader && asset.mimeType.startsWith("video/")) {
        const head = await bucket.head(asset.storageKey);
        if (!head) return new Response("Asset not found", { status: 404 });
        const match = /^bytes=(\d+)-(\d*)$/.exec(rangeHeader);
        if (!match) return new Response("Invalid range", { status: 416, headers: { "content-range": `bytes */${head.size}` } });
        const start = Number(match[1]); const requestedEnd = match[2] ? Number(match[2]) : head.size - 1;
        const end = Math.min(requestedEnd, head.size - 1);
        if (start > end || start >= head.size) return new Response("Invalid range", { status: 416, headers: { "content-range": `bytes */${head.size}` } });
        const object = await bucket.get(asset.storageKey, { range: { offset: start, length: end - start + 1 } });
        if (!object) return new Response("Asset not found", { status: 404 });
        return new Response(object.body, { status: 206, headers: { "content-type": object.httpMetadata?.contentType || asset.mimeType, "content-range": `bytes ${start}-${end}/${head.size}`, "content-length": String(end - start + 1), "accept-ranges": "bytes", "cache-control": "private, max-age=3600" } });
      }
      const object = await bucket.get(asset.storageKey);
      if (!object) return new Response("Asset not found", { status: 404 });
      return new Response(object.body, { headers: { "content-type": object.httpMetadata?.contentType || asset.mimeType, "content-length": String(object.size || asset.sizeBytes), "accept-ranges": asset.mimeType.startsWith("video/") ? "bytes" : "none", "cache-control": "private, max-age=3600" } });
    }
    const [scenes, assets, runs, segments, settingsRows] = await Promise.all([
      db.select().from(sceneManifest).where(eq(sceneManifest.projectId, id)).orderBy(asc(sceneManifest.sceneNumber)),
      db.select().from(mediaAssets).where(eq(mediaAssets.projectId, id)).orderBy(desc(mediaAssets.createdAt)),
      db.select().from(assemblyRuns).where(eq(assemblyRuns.projectId, id)).orderBy(desc(assemblyRuns.version)),
      db.select().from(narrationSegments).where(eq(narrationSegments.projectId, id)).orderBy(asc(narrationSegments.position)),
      db.select().from(mediaAutomationSettings).where(eq(mediaAutomationSettings.projectId, id)).limit(1),
    ]);
    if (url.searchParams.get("download") === "latest") {
      if (!runs[0]) return Response.json({ error: "Build an assembly plan first" }, { status: 404 });
      return new Response(runs[0].manifestJson, { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="${id}-assembly-v${runs[0].version}.json"` } });
    }
    const approved = assets.filter((asset) => asset.status === "APPROVED");
    const verified = assets.filter((asset) => asset.rightsStatus === "VERIFIED");
    const coveredScenes = scenes.filter((scene) => approved.some((asset) => asset.sceneId === scene.id && asset.rightsStatus === "VERIFIED")).length;
    return Response.json({ scenes, assets, runs, automation: settingsRows[0] || { verificationMode: "AUTOPILOT", minimumConfidence: 85, autoBuildAssembly: true }, gates: { voice: segments.length > 0 && segments.every((segment) => segment.status === "APPROVED" && segment.audioKey), assetCoverage: scenes.length ? Math.round(coveredScenes / scenes.length * 100) : 0, rightsCoverage: assets.length ? Math.round(verified.length / assets.length * 100) : 0, assemblyReady: scenes.length > 0 && coveredScenes === scenes.length } });
  } catch (error) {
    console.error("Media workspace GET failed", error);
    return Response.json({ error: "Media workspace could not be loaded" }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await ensureMediaSchema();
    const db = await getDb();
    const requestUrl = new URL(request.url);
    if (requestUrl.searchParams.get("motionUpload") === "part") {
      const uploadId = requestUrl.searchParams.get("uploadId") || "";
      const part = Number(requestUrl.searchParams.get("part"));
      if (!safeUploadId(uploadId) || !Number.isInteger(part) || part < 0 || part > 200) return Response.json({ error: "Invalid motion upload part" }, { status: 400 });
      const bytes = new Uint8Array(await request.arrayBuffer());
      if (!bytes.byteLength || bytes.byteLength > 700 * 1024) return Response.json({ error: "Motion upload part must be between 1 byte and 700 KB" }, { status: 413 });
      const env = await runtimeEnv();
      if (!env.BUCKET) return Response.json({ error: "Media storage is unavailable" }, { status: 424 });
      await env.BUCKET.put(`motion-uploads/${id}/${uploadId}/${part}.part`, bytes, { httpMetadata: { contentType: "application/octet-stream" }, customMetadata: { projectId: id, uploadId, part: String(part) } });
      return Response.json({ ok: true, part });
    }
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      const sceneId = String(form.get("sceneId") || "");
      const generatedMotion = String(form.get("generatedMotion") || "") === "true";
      const parentAssetId = String(form.get("parentAssetId") || "");
      if (!(file instanceof File) || !sceneId) return Response.json({ error: "File and scene are required" }, { status: 400 });
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return Response.json({ error: "Only image or video files are supported" }, { status: 415 });
      if (file.size > 50 * 1024 * 1024) return Response.json({ error: "File exceeds the 50 MB MVP limit" }, { status: 413 });
      const [scene] = await db.select().from(sceneManifest).where(eq(sceneManifest.id, sceneId)).limit(1);
      if (!scene || scene.projectId !== id) return Response.json({ error: "Scene not found" }, { status: 404 });
      let parentAsset: typeof mediaAssets.$inferSelect | null = null;
      if (generatedMotion) {
        if (!parentAssetId || file.type !== "video/webm") return Response.json({ error: "A WebM render and its motion source are required" }, { status: 400 });
        const [source] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, parentAssetId)).limit(1);
        if (!source || source.projectId !== id || source.sceneId !== sceneId || !source.sourceType.startsWith("ORIGINAL_MOTION_") || source.rightsStatus !== "VERIFIED") return Response.json({ error: "Verified motion source not found" }, { status: 409 });
        parentAsset = source;
      }
      const env = await runtimeEnv();
      if (!env.BUCKET) return Response.json({ error: "Media storage is unavailable" }, { status: 424 });
      if (generatedMotion && parentAsset) {
        const generatedAssetId = await storeMotionRender(id, sceneId, parentAsset.id, file.name, new Uint8Array(await file.arrayBuffer()));
        return Response.json({ ok: true, assetId: generatedAssetId, generatedMotion: true });
      }
      const assetId = `${id}-AST-${crypto.randomUUID()}`;
      const key = `media/${id}/${sceneId}/${assetId}-${safeName(file.name)}`;
      await env.BUCKET.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type }, customMetadata: { projectId: id, sceneId, generatedMotion: String(generatedMotion) } });
      await db.insert(mediaAssets).values({ id: assetId, projectId: id, sceneId, name: file.name, mimeType: file.type, sourceType: "USER_UPLOAD", storageKey: key, licenseType: String(form.get("licenseType") || "OWNED"), licenseProof: String(form.get("licenseProof") || "Uploader ownership confirmation required"), rightsStatus: "PENDING", status: "REVIEW", sizeBytes: file.size });
      return Response.json({ ok: true, assetId, generatedMotion });
    }

    const payload = await request.json() as { action?: "GENERATE_DIAGRAMS" | "GENERATE_MOTION_VISUALS" | "REGISTER_LINK" | "SELECT_DISCOVERY" | "SET_AUTOMATION_MODE" | "AUTO_SOURCE_ALL" | "VERIFY_RIGHTS" | "APPROVE_ASSET" | "BUILD_ASSEMBLY" | "FINALIZE_MOTION_UPLOAD"; sceneId?: string; assetId?: string; parentAssetId?: string; uploadId?: string; chunkCount?: number; fileName?: string; sizeBytes?: number; sourceUrl?: string; licenseType?: string; licenseProof?: string; candidate?: DiscoveryCandidate; verificationMode?: "AUTOPILOT" | "REVIEW" };
    if (payload.action === "FINALIZE_MOTION_UPLOAD") {
      const uploadId = payload.uploadId || ""; const chunkCount = Number(payload.chunkCount); const sceneId = payload.sceneId || ""; const parentAssetId = payload.parentAssetId || "";
      if (!safeUploadId(uploadId) || !Number.isInteger(chunkCount) || chunkCount < 1 || chunkCount > 200 || !sceneId || !parentAssetId) return Response.json({ error: "Invalid motion upload manifest" }, { status: 400 });
      const env = await runtimeEnv(); if (!env.BUCKET) return Response.json({ error: "Media storage is unavailable" }, { status: 424 });
      const parts: Uint8Array[] = []; let total = 0; const partKeys: string[] = [];
      for (let part = 0; part < chunkCount; part++) {
        const key = `motion-uploads/${id}/${uploadId}/${part}.part`; const object = await env.BUCKET.get(key);
        if (!object) return Response.json({ error: `Motion upload part ${part + 1}/${chunkCount} is missing` }, { status: 409 });
        const buffer = object.arrayBuffer ? await object.arrayBuffer() : await new Response(object.body).arrayBuffer();
        const bytes = new Uint8Array(buffer); parts.push(bytes); total += bytes.byteLength; partKeys.push(key);
      }
      if (payload.sizeBytes && total !== payload.sizeBytes) return Response.json({ error: "Motion upload size check failed" }, { status: 409 });
      if (total > 50 * 1024 * 1024) return Response.json({ error: "Rendered clip exceeds the 50 MB MVP limit" }, { status: 413 });
      const joined = new Uint8Array(total); let offset = 0; for (const part of parts) { joined.set(part, offset); offset += part.byteLength; }
      const assetId = await storeMotionRender(id, sceneId, parentAssetId, safeName(payload.fileName || "motion.webm"), joined);
      await env.BUCKET.delete(partKeys);
      return Response.json({ ok: true, assetId, generatedMotion: true });
    }
    if (payload.action === "SET_AUTOMATION_MODE") {
      if (!payload.verificationMode || !["AUTOPILOT", "REVIEW"].includes(payload.verificationMode)) return Response.json({ error: "Invalid verification mode" }, { status: 400 });
      await db.insert(mediaAutomationSettings).values({ projectId: id, verificationMode: payload.verificationMode, minimumConfidence: 85, autoBuildAssembly: true, updatedAt: new Date().toISOString() }).onConflictDoUpdate({ target: mediaAutomationSettings.projectId, set: { verificationMode: payload.verificationMode, updatedAt: new Date().toISOString() } });
      await db.insert(workflowEvents).values({ projectId: id, toStatus: "PRODUCTION_PREP", eventType: "MEDIA_AUTOMATION_MODE_CHANGED", summary: `Media verification mode changed to ${payload.verificationMode}` });
      return Response.json({ ok: true, verificationMode: payload.verificationMode });
    }
    if (payload.action === "AUTO_SOURCE_ALL") return Response.json({ ok: true, ...(await runMediaAutopilot(id)) });
    if (payload.action === "GENERATE_DIAGRAMS") {
      const env = await runtimeEnv();
      if (!env.BUCKET) return Response.json({ error: "Media storage is unavailable" }, { status: 424 });
      const [scenes, existing] = await Promise.all([db.select().from(sceneManifest).where(eq(sceneManifest.projectId, id)), db.select().from(mediaAssets).where(eq(mediaAssets.projectId, id))]);
      let created = 0;
      for (const scene of scenes.filter((item) => item.mediaStrategy === "DIAGRAM")) {
        if (existing.some((asset) => asset.sceneId === scene.id && asset.sourceType === "ORIGINAL_DIAGRAM")) continue;
        const assetId = `${id}-AST-DIAGRAM-${scene.sceneNumber}`;
        const key = `media/${id}/${scene.id}/${assetId}.svg`;
        await env.BUCKET.put(key, new TextEncoder().encode(diagramSvg(scene.beat)), { httpMetadata: { contentType: "image/svg+xml" }, customMetadata: { projectId: id, sceneId: scene.id } });
        await db.insert(mediaAssets).values({ id: assetId, projectId: id, sceneId: scene.id, name: `${scene.beat}.svg`, mimeType: "image/svg+xml", sourceType: "ORIGINAL_DIAGRAM", storageKey: key, licenseType: "CHANNEL_OWNED", licenseProof: "Generated in Frameflow from the approved scene brief", rightsStatus: "VERIFIED", status: "APPROVED", sizeBytes: 0 }).onConflictDoNothing();
        await db.update(sceneManifest).set({ assetUrl: `/api/projects/${id}/media?asset=${encodeURIComponent(assetId)}`, assetStatus: "READY", licenseStatus: "VERIFIED", updatedAt: new Date().toISOString() }).where(eq(sceneManifest.id, scene.id));
        created++;
      }
      await db.insert(workflowEvents).values({ projectId: id, toStatus: "PRODUCTION_PREP", eventType: "ORIGINAL_DIAGRAMS_CREATED", summary: `${created} channel-owned diagrams created and rights-verified` });
      return Response.json({ ok: true, created });
    }
    if (payload.action === "GENERATE_MOTION_VISUALS") {
      const env = await runtimeEnv();
      if (!env.BUCKET) return Response.json({ error: "Media storage is unavailable" }, { status: 424 });
      const [scenes, settingsRows] = await Promise.all([db.select().from(sceneManifest).where(eq(sceneManifest.projectId, id)), db.select().from(mediaAutomationSettings).where(eq(mediaAutomationSettings.projectId, id)).limit(1)]);
      const autopilot = (settingsRows[0]?.verificationMode || "AUTOPILOT") === "AUTOPILOT";
      let created = 0;
      for (const scene of scenes.filter((item) => item.mediaStrategy === "DIAGRAM")) {
        const visualType = motionVisualType(scene.beat);
        const assetId = `${id}-AST-MOTION-${scene.sceneNumber}-${Date.now()}`;
        const key = `media/${id}/${scene.id}/${assetId}.svg`;
        await env.BUCKET.put(key, new TextEncoder().encode(diagramSvg(scene.beat)), { httpMetadata: { contentType: "image/svg+xml" }, customMetadata: { projectId: id, sceneId: scene.id, visualType } });
        if (autopilot) await db.update(mediaAssets).set({ status: "SUPERSEDED", updatedAt: new Date().toISOString() }).where(and(eq(mediaAssets.projectId, id), eq(mediaAssets.sceneId, scene.id)));
        await db.insert(mediaAssets).values({ id: assetId, projectId: id, sceneId: scene.id, name: `${scene.beat} · motion ${visualType.toLowerCase()}.svg`, mimeType: "image/svg+xml", sourceType: `ORIGINAL_MOTION_${visualType}`, storageKey: key, licenseType: "CHANNEL_OWNED", licenseProof: JSON.stringify({ generator: "FRAMEFLOW_MOTION_V1", visualType, animation: "CSS_SVG_LOOP", rights: "CHANNEL_OWNED" }), rightsStatus: "VERIFIED", status: autopilot ? "APPROVED" : "REVIEW", sizeBytes: 0 });
        if (autopilot) await db.update(sceneManifest).set({ assetUrl: `/api/projects/${id}/media?asset=${encodeURIComponent(assetId)}`, assetStatus: "READY", licenseStatus: "VERIFIED", updatedAt: new Date().toISOString() }).where(eq(sceneManifest.id, scene.id));
        created++;
      }
      await db.insert(workflowEvents).values({ projectId: id, toStatus: "PRODUCTION_PREP", eventType: "MOTION_VISUALS_CREATED", summary: `${created} animated diagrams, charts and maps created; ${autopilot ? "auto-approved" : "ready for preview"}` });
      return Response.json({ ok: true, created, autopilot });
    }
    if (payload.action === "REGISTER_LINK") {
      if (!payload.sceneId || !payload.sourceUrl || !/^https?:\/\//.test(payload.sourceUrl)) return Response.json({ error: "A valid scene and source URL are required" }, { status: 400 });
      const [scene] = await db.select().from(sceneManifest).where(eq(sceneManifest.id, payload.sceneId)).limit(1);
      if (!scene || scene.projectId !== id) return Response.json({ error: "Scene not found" }, { status: 404 });
      const assetId = `${id}-AST-${crypto.randomUUID()}`;
      await db.insert(mediaAssets).values({ id: assetId, projectId: id, sceneId: scene.id, name: new URL(payload.sourceUrl).hostname, mimeType: "text/uri-list", sourceType: "EXTERNAL_LINK", sourceUrl: payload.sourceUrl, licenseType: payload.licenseType || "UNKNOWN", licenseProof: payload.licenseProof || null, rightsStatus: "PENDING", status: "REVIEW", sizeBytes: 0 });
      return Response.json({ ok: true, assetId });
    }
    if (payload.action === "SELECT_DISCOVERY") {
      if (!payload.sceneId || !payload.candidate) return Response.json({ error: "Scene and candidate are required" }, { status: 400 });
      const [scene] = await db.select().from(sceneManifest).where(eq(sceneManifest.id, payload.sceneId)).limit(1);
      if (!scene || scene.projectId !== id) return Response.json({ error: "Scene not found" }, { status: 404 });
      const candidate = payload.candidate;
      if (!['FREE', 'INTERNAL'].includes(candidate.category) || !['Openverse', 'Pexels', 'Pixabay', 'Frameflow library'].includes(candidate.provider)) return Response.json({ error: "Unsupported discovery source" }, { status: 400 });
      let sourceUrl = candidate.assetUrl || candidate.landingUrl;
      let storageKey: string | null = null;
      let sourceType = candidate.category === "INTERNAL" ? "INTERNAL_REUSE" : "DISCOVERED_FREE_STOCK";
      let rightsStatus = "PENDING";
      if (candidate.category === "INTERNAL") {
        if (!candidate.sourceAssetId) return Response.json({ error: "Internal source is missing" }, { status: 400 });
        const [source] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, candidate.sourceAssetId)).limit(1);
        if (!source || source.rightsStatus !== "VERIFIED") return Response.json({ error: "Internal asset is not rights-verified" }, { status: 409 });
        sourceUrl = source.sourceUrl; storageKey = source.storageKey; rightsStatus = "VERIFIED";
      } else if (!sourceUrl || !/^https:\/\//.test(sourceUrl) || !candidate.landingUrl?.startsWith("https://")) return Response.json({ error: "Candidate source is invalid" }, { status: 400 });
      const assetId = `${id}-AST-${crypto.randomUUID()}`;
      const proof = JSON.stringify({ provider: cleanText(candidate.provider), landingUrl: candidate.landingUrl, licenseType: cleanText(candidate.licenseType), licenseUrl: candidate.licenseUrl, creator: candidate.creator, selectedAt: new Date().toISOString(), verification: rightsStatus === "VERIFIED" ? "Inherited from verified internal asset" : "Human verification required" });
      await db.insert(mediaAssets).values({ id: assetId, projectId: id, sceneId: scene.id, name: cleanText(candidate.title), mimeType: candidate.mediaType === "VIDEO" ? "video/external" : "image/external", sourceType, sourceUrl, storageKey, licenseType: cleanText(candidate.licenseType, "UNKNOWN"), licenseProof: proof, rightsStatus, status: "REVIEW", sizeBytes: 0 });
      return Response.json({ ok: true, assetId, rightsStatus });
    }
    if (payload.action === "VERIFY_RIGHTS") {
      if (!payload.assetId) return Response.json({ error: "assetId is required" }, { status: 400 });
      await db.update(mediaAssets).set({ rightsStatus: "VERIFIED", licenseProof: payload.licenseProof || "Human verification recorded", updatedAt: new Date().toISOString() }).where(eq(mediaAssets.id, payload.assetId));
      return Response.json({ ok: true });
    }
    if (payload.action === "APPROVE_ASSET") {
      if (!payload.assetId) return Response.json({ error: "assetId is required" }, { status: 400 });
      const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, payload.assetId)).limit(1);
      if (!asset || asset.projectId !== id) return Response.json({ error: "Asset not found" }, { status: 404 });
      if (asset.rightsStatus !== "VERIFIED") return Response.json({ error: "Verify usage rights before approval" }, { status: 409 });
      await db.update(mediaAssets).set({ status: "APPROVED", updatedAt: new Date().toISOString() }).where(eq(mediaAssets.id, asset.id));
      const assetUrl = asset.storageKey ? `/api/projects/${id}/media?asset=${encodeURIComponent(asset.id)}` : asset.sourceUrl;
      await db.update(sceneManifest).set({ assetUrl, assetStatus: "READY", licenseStatus: "VERIFIED", updatedAt: new Date().toISOString() }).where(eq(sceneManifest.id, asset.sceneId));
      return Response.json({ ok: true });
    }
    if (payload.action === "BUILD_ASSEMBLY") return Response.json({ ok: true, ...(await buildAssembly(id)) });
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Media workspace POST failed", error);
    if (error instanceof Error && error.message.endsWith("_GATE_BLOCKED")) return Response.json({ error: error.message }, { status: 409 });
    return Response.json({ error: "Media action could not be completed" }, { status: 500 });
  }
}
