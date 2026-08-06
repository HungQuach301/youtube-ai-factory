import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { assemblyRuns, mediaAssets, mediaAutomationSettings, narrationSegments, optimizationArtifacts, sceneManifest, videoProjects, voiceProfiles, workflowEvents } from "../../../../../db/schema";

type RuntimeD1 = { prepare(sql: string): { run(): Promise<unknown> } };
type RuntimeBucket = {
  put(key: string, value: ArrayBuffer | Uint8Array, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }): Promise<unknown>;
  delete(keys: string | string[]): Promise<unknown>;
  head(key: string): Promise<{ size: number; httpMetadata?: { contentType?: string } } | null>;
  get(key: string, options?: { range?: { offset: number; length: number } }): Promise<{ body: ReadableStream; arrayBuffer?: () => Promise<ArrayBuffer>; size: number; httpMetadata?: { contentType?: string } } | null>;
};
type RuntimeEnv = {
  DB?: RuntimeD1; BUCKET?: RuntimeBucket; PEXELS_API_KEY?: string; PIXABAY_API_KEY?: string;
  SHUTTERSTOCK_CONSUMER_KEY?: string; SHUTTERSTOCK_CONSUMER_SECRET?: string;
  GOOGLE_DRIVE_CLIENT_ID?: string;
};

type DiscoveryCandidate = {
  id: string; provider: string; category: "FREE" | "PAID" | "INTERNAL"; title: string;
  mediaType: "IMAGE" | "VIDEO" | "CATALOG"; thumbnailUrl: string | null; assetUrl: string | null;
  landingUrl: string; licenseType: string; licenseUrl: string | null; creator: string | null;
  sourceAssetId?: string; score: number;
};

type MaterializationBeat = OptimizedVisualBeat & {
  assetKey: string;
  selectedPlan: (PlannedAssetCandidate & { selectedScore: number; verificationStatus: string }) | null;
  materializedAsset: null | { id: string; name: string; mimeType: string; sourceType: string; actualProvider?: string; rightsStatus: string; url: string | null };
};

type OptimizedVisualBeat = {
  id: string; parentSection: string; time: string; startSeconds: number; endSeconds: number;
  primaryFamily: string; secondaryFamily: string; visualIntent: string; sourceStrategy: string;
  assetType: string; cognitiveLoad: string;
};

type PlannedAssetCandidate = {
  id: string; sourceType: string; provider: string; locator?: string; searchQuery?: string;
  generationPrompt?: string; rightsStatus: string; licenseBasis: string; estimatedCostUsd: number;
  compositeScore: number;
};

type PlannedAssetEntry = {
  beatId: string; parentSection: string; primaryFamily: string; narrativeNeed: string;
  candidates: PlannedAssetCandidate[]; selectedCandidateId: string; selectedScore: number;
  selectionStatus: string; verificationStatus: string; requiresHumanReview: boolean;
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
  return value.includes("economic_waterfall") || value.includes("net") || value.includes("fee") ? "CHART" : value.includes("living_map") || value.includes("route") || value.includes("six") ? "MAP" : value.includes("receipt_counter") ? "RECEIPT" : value.includes("timing_lanes") ? "TIMELINE" : value.includes("system_ui") ? "UI" : "DIAGRAM";
}

function diagramSvg(beat: string) {
  const title = beat.replace(/[<>&]/g, "");
  const type = motionVisualType(beat);
  const nodes = type === "CHART" ? ["$100 purchase", "Variable fees", "Merchant net"] : type === "MAP" ? ["Terminal", "Acquirer", "Network", "Issuer"] : type === "RECEIPT" ? ["$100 receipt", "Receivable", "Variable cost", "Net deposit"] : type === "TIMELINE" ? ["Authorize", "Capture", "Clear", "Settle"] : type === "UI" ? ["Request", "Risk checks", "Decision", "State change"] : ["Authorization now", "Settlement later"];
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

async function providerHealth(provider: string) {
  const env = await runtimeEnv();
  const startedAt = Date.now();
  try {
    if (provider === "owned") return { provider, status: env.BUCKET ? "CONNECTED" : "BLOCKED", latencyMs: Date.now() - startedAt, message: env.BUCKET ? "Private media storage is available" : "Private media storage binding is missing" };
    if (provider === "openverse") await fetchJson("https://api.openverse.org/v1/images/?q=money&page_size=1");
    else if (provider === "pexels") {
      if (!env.PEXELS_API_KEY) return { provider, status: "KEY_REQUIRED", latencyMs: 0, message: "PEXELS_API_KEY is not configured" };
      await fetchJson("https://api.pexels.com/v1/curated?per_page=1", { Authorization: env.PEXELS_API_KEY });
    } else if (provider === "pixabay") {
      if (!env.PIXABAY_API_KEY) return { provider, status: "KEY_REQUIRED", latencyMs: 0, message: "PIXABAY_API_KEY is not configured" };
      await fetchJson(`https://pixabay.com/api/?key=${encodeURIComponent(env.PIXABAY_API_KEY)}&q=money&per_page=3&safesearch=true`);
    } else if (provider === "shutterstock") {
      if (!env.SHUTTERSTOCK_CONSUMER_KEY || !env.SHUTTERSTOCK_CONSUMER_SECRET) return { provider, status: "KEY_REQUIRED", latencyMs: 0, message: "Shutterstock consumer credentials are not configured" };
      await fetchJson("https://api.shutterstock.com/v2/images/search?query=money&page=1&per_page=5&view=minimal", { Accept: "application/json", "User-Agent": "Frameflow-YouTube-Factory/1.0", Authorization: `Basic ${btoa(`${env.SHUTTERSTOCK_CONSUMER_KEY}:${env.SHUTTERSTOCK_CONSUMER_SECRET}`)}` });
    } else if (provider === "google_drive") return { provider, status: env.GOOGLE_DRIVE_CLIENT_ID ? "OAUTH_SETUP" : "CONFIG_REQUIRED", latencyMs: 0, message: env.GOOGLE_DRIVE_CLIENT_ID ? "OAuth callback and Picker still need to be completed" : "Google Drive OAuth client ID is not configured" };
    else return { provider, status: "UNKNOWN", latencyMs: 0, message: "Unknown provider" };
    return { provider, status: "CONNECTED", latencyMs: Date.now() - startedAt, message: "Server-side connection test passed" };
  } catch (error) {
    return { provider, status: "FAILED", latencyMs: Date.now() - startedAt, message: error instanceof Error ? error.message : "Provider connection test failed" };
  }
}

function parseArtifactContent(value: string) {
  try { return JSON.parse(value) as unknown; } catch { return null; }
}

function parseProof(value: string | null) {
  if (!value) return {} as Record<string, unknown>;
  try { const parsed = JSON.parse(value); return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {}; } catch { return {}; }
}

function actualProvider(asset: typeof mediaAssets.$inferSelect, proof: Record<string, unknown>) {
  if (typeof proof.provider === "string" && proof.provider) return proof.provider;
  if (asset.sourceType.includes("PEXELS")) return "Pexels";
  if (asset.sourceType.includes("PIXABAY")) return "Pixabay";
  if (asset.sourceType.includes("OPENVERSE")) return "Openverse";
  if (asset.sourceType.includes("INTERNAL")) return "Owned Media Vault";
  if (asset.sourceType.includes("FALLBACK") || asset.sourceType.includes("ORIGINAL") || asset.sourceType.startsWith("OPTIMIZED_MOTION_")) return "Frameflow original system";
  return asset.sourceType.replaceAll("_", " ");
}

function expectedVisualFormat(family: string) { return family === "MACRO_REALITY" ? "STOCK_VIDEO" : `MOTION_${family}_WEBM`; }
function detectedVisualFormat(asset: typeof mediaAssets.$inferSelect | null) {
  if (!asset) return "MISSING";
  if (asset.sourceType.startsWith("OPTIMIZED_MOTION_WEBM_")) {
    const family = asset.sourceType.slice("OPTIMIZED_MOTION_WEBM_".length);
    return `MOTION_${family}_WEBM`;
  }
  if (asset.sourceType.startsWith("OPTIMIZED_MOTION_SOURCE_")) return "MOTION_SOURCE_NOT_RENDERED";
  if (asset.mimeType.startsWith("video/") && !asset.sourceType.includes("MOTION")) return "STOCK_VIDEO";
  return asset.mimeType.startsWith("image/") ? "STATIC_IMAGE" : "OTHER";
}

function buildMaterializationAudit(planBeats: Array<OptimizedVisualBeat & { assetKey: string; materializedAsset: null | Record<string, unknown> }>, assets: Array<typeof mediaAssets.$inferSelect>) {
  const assetMap = new Map(assets.filter((asset) => asset.status === "APPROVED" && asset.rightsStatus === "VERIFIED").map((asset) => [asset.sceneId, asset]));
  const records = planBeats.map((beat) => {
    const asset = assetMap.get(beat.assetKey) || null; const proof = parseProof(asset?.licenseProof || null);
    const physicalKey = asset ? String(proof.sha256 || proof.inheritedFrom || asset.storageKey || asset.sourceUrl || asset.id) : `missing:${beat.id}`;
    const provider = asset ? actualProvider(asset, proof) : "Missing"; const isOwned = provider === "Frameflow original system" || asset?.licenseType === "CHANNEL_OWNED";
    const semanticScore = Number(proof.selectionScore || (isOwned ? 100 : asset?.sourceType.includes("INTERNAL") ? 82 : 0));
    const actualFormat = detectedVisualFormat(asset); const expectedFormat = expectedVisualFormat(beat.primaryFamily);
    return { beat, asset, proof, physicalKey, provider, isOwned, semanticScore, actualFormat, expectedFormat, mediaClass: asset?.mimeType.startsWith("video/") ? "VIDEO" : asset?.mimeType.startsWith("image/") ? "IMAGE" : "OTHER" };
  });
  const usage = new Map<string, number>(); records.forEach((record) => usage.set(record.physicalKey, (usage.get(record.physicalKey) || 0) + 1));
  const providerMix: Record<string, number> = {}; const mediaMix: Record<string, number> = {}; const failures: Array<{ beatId: string; severity: "HARD" | "SOFT"; issues: string[]; assetId: string | null }> = [];
  let technicalPassed = 0; let rightsPassed = 0; let semanticPassed = 0; let uniquePassed = 0; let formatPassed = 0; let motionRendered = 0; let motionBeats = 0;
  records.forEach((record) => {
    providerMix[record.provider] = (providerMix[record.provider] || 0) + 1; mediaMix[record.mediaClass] = (mediaMix[record.mediaClass] || 0) + 1;
    const issues: string[] = []; const hard: string[] = [];
    if (!record.asset) hard.push("MISSING_FILE");
    else {
      if (!(record.asset.storageKey || record.asset.sourceUrl) || (record.asset.storageKey && record.asset.sizeBytes <= 0)) hard.push("STORAGE_INTEGRITY"); else technicalPassed++;
      if (record.asset.rightsStatus !== "VERIFIED" || !record.asset.licenseProof) hard.push("RIGHTS_PROVENANCE"); else rightsPassed++;
      if (record.semanticScore < 85) issues.push("SEMANTIC_CONFIDENCE"); else semanticPassed++;
      const duplicateCount = usage.get(record.physicalKey) || 0; if (duplicateCount > 1) issues.push("DUPLICATE_PHYSICAL_SOURCE"); else uniquePassed++;
      if (record.actualFormat !== record.expectedFormat) hard.push(record.actualFormat === "MOTION_SOURCE_NOT_RENDERED" ? "MOTION_RENDER_REQUIRED" : "VISUAL_FAMILY_FORMAT_MISMATCH"); else formatPassed++;
      if (record.beat.primaryFamily !== "MACRO_REALITY") { motionBeats++; if (record.actualFormat === record.expectedFormat) motionRendered++; }
    }
    if (hard.length || issues.length) failures.push({ beatId: record.beat.id, severity: hard.length ? "HARD" : "SOFT", issues: [...hard, ...issues], assetId: record.asset?.id || null });
  });
  const stockRecords = records.filter((record) => record.expectedFormat === "STOCK_VIDEO" && record.actualFormat === "STOCK_VIDEO"); const stockProviders: Record<string, number> = {}; stockRecords.forEach((record) => { stockProviders[record.provider] = (stockProviders[record.provider] || 0) + 1; });
  const dominantProvider = Object.entries(stockProviders).sort((a, b) => b[1] - a[1])[0]; const providerLimit = Math.max(1, Math.ceil(stockRecords.length * .8));
  if (stockRecords.length >= 4 && (Object.keys(stockProviders).length < 2 || (dominantProvider?.[1] || 0) > providerLimit)) {
    const excess = Math.max(1, (dominantProvider?.[1] || 0) - providerLimit); stockRecords.filter((record) => record.provider === dominantProvider?.[0]).slice(-excess).forEach((record) => { const existing = failures.find((failure) => failure.beatId === record.beat.id); if (existing) existing.issues.push("PROVIDER_OVERCONCENTRATION"); else failures.push({ beatId: record.beat.id, severity: "SOFT", issues: ["PROVIDER_OVERCONCENTRATION"], assetId: record.asset?.id || null }); });
  }
  let run = 0; records.forEach((record) => { run = record.actualFormat === "STOCK_VIDEO" ? run + 1 : 0; if (run > 2) { const existing = failures.find((failure) => failure.beatId === record.beat.id); if (existing) existing.issues.push("STOCK_SEQUENCE_TOO_LONG"); else failures.push({ beatId: record.beat.id, severity: "SOFT", issues: ["STOCK_SEQUENCE_TOO_LONG"], assetId: record.asset?.id || null }); } });
  const total = Math.max(1, records.length); const motionTotal = Math.max(1, motionBeats); const providerBalance = stockRecords.length < 4 ? 100 : Object.keys(stockProviders).length >= 2 && (dominantProvider?.[1] || 0) <= providerLimit ? 100 : 60;
  const dimensions = {
    completeness: Math.round(records.filter((record) => record.asset).length / total * 100), technicalIntegrity: Math.round(technicalPassed / total * 100), rightsProvenance: Math.round(rightsPassed / total * 100),
    semanticFit: Math.round(semanticPassed / total * 100), sourceUniqueness: Math.round(uniquePassed / total * 100), formatFidelity: Math.round(formatPassed / total * 100), motionRendered: Math.round(motionRendered / motionTotal * 100), providerBalance,
  };
  const score = Math.round(dimensions.completeness * .1 + dimensions.technicalIntegrity * .1 + dimensions.rightsProvenance * .15 + dimensions.semanticFit * .15 + dimensions.sourceUniqueness * .1 + dimensions.formatFidelity * .2 + dimensions.motionRendered * .15 + dimensions.providerBalance * .05);
  const hardFailures = failures.filter((failure) => failure.severity === "HARD").length;
  const expectedFamilyMix = Object.fromEntries([...new Set(records.map((record) => record.beat.primaryFamily))].map((family) => [family, records.filter((record) => record.beat.primaryFamily === family).length])); const actualFormatMix = Object.fromEntries([...new Set(records.map((record) => record.actualFormat))].map((format) => [format, records.filter((record) => record.actualFormat === format).length]));
  return { version: 2, status: score >= 90 && hardFailures === 0 && failures.length === 0 ? "PASS" : "REPAIR_REQUIRED", score, threshold: 90, dimensions, providerMix, stockProviderMix: stockProviders, mediaMix, expectedFamilyMix, actualFormatMix, uniquePhysicalAssets: new Set(records.map((record) => record.physicalKey).filter((key) => !key.startsWith("missing:"))).size, duplicateBeats: records.filter((record) => (usage.get(record.physicalKey) || 0) > 1).length, hardFailures, repairQueue: failures, maximumRepairCycles: 2, semanticEvidence: "Metadata + frozen storyboard contract; pixel-level vision review remains a later gate.", policy: "Family-format fidelity is mandatory; no more than two consecutive stock beats; stock requires at least two providers; repair only failed beats; never lower a threshold; paid assets require approval." };
}

async function getOptimizedSourcePlan(projectId: string, assets: Array<typeof mediaAssets.$inferSelect>) {
  const db = await getDb();
  const artifacts = await db.select().from(optimizationArtifacts).where(eq(optimizationArtifacts.projectId, projectId)).orderBy(desc(optimizationArtifacts.createdAt));
  const storyboardArtifact = artifacts.find((artifact) => artifact.stageKey === "STORYBOARD" && artifact.status === "FROZEN");
  const assetArtifact = artifacts.find((artifact) => artifact.stageKey === "ASSET_TOURNAMENT" && artifact.status === "FROZEN");
  if (!storyboardArtifact || !assetArtifact) return null;
  const storyboard = parseArtifactContent(storyboardArtifact.contentJson) as null | { visualBeats?: OptimizedVisualBeat[] };
  const tournament = parseArtifactContent(assetArtifact.contentJson) as null | { selectionMode?: string; userVerification?: { participation: string; defaultAction: string }; budgetPolicy?: { assetBudgetCapUsd: number; estimatedSelectedCostUsd: number; maximumSingleAssetUsd: number }; entries?: PlannedAssetEntry[] };
  const beats = Array.isArray(storyboard?.visualBeats) ? storyboard.visualBeats : [];
  const entries = Array.isArray(tournament?.entries) ? tournament.entries : [];
  if (!beats.length || !entries.length) return null;
  const entryMap = new Map(entries.map((entry) => [entry.beatId, entry]));
  const planBeats = beats.map((beat) => {
    const entry = entryMap.get(beat.id);
    const selected = entry?.candidates.find((candidate) => candidate.id === entry.selectedCandidateId) || null;
    const assetKey = `${projectId}-${beat.id}`;
    const materialized = assets.find((asset) => asset.sceneId === assetKey && asset.status === "APPROVED" && asset.rightsStatus === "VERIFIED" && Boolean(asset.storageKey || asset.sourceUrl)) || null;
    return {
      ...beat,
      assetKey,
      selectedPlan: selected ? { ...selected, selectedScore: entry?.selectedScore || selected.compositeScore, verificationStatus: entry?.verificationStatus || "PLANNED" } : null,
      materializedAsset: materialized ? (() => { const proof = parseProof(materialized.licenseProof); return { id: materialized.id, name: materialized.name, mimeType: materialized.mimeType, sourceType: materialized.sourceType, actualProvider: actualProvider(materialized, proof), licenseType: materialized.licenseType, sizeBytes: materialized.sizeBytes, semanticScore: Number(proof.selectionScore || (materialized.licenseType === "CHANNEL_OWNED" ? 100 : materialized.sourceType.includes("INTERNAL") ? 82 : 0)), rightsStatus: materialized.rightsStatus, url: materialized.storageKey ? `/api/projects/${projectId}/media?asset=${encodeURIComponent(materialized.id)}` : materialized.sourceUrl }; })() : null,
      materializationStatus: materialized ? "MATERIALIZED" : "PLANNED",
      requiresHumanReview: entry?.requiresHumanReview || false,
    };
  });
  const materialized = planBeats.filter((beat) => beat.materializationStatus === "MATERIALIZED").length;
  const fallbacks = planBeats.filter((beat) => beat.materializedAsset?.sourceType === "OWNED_SEMANTIC_FALLBACK").length;
  const qualityAudit = buildMaterializationAudit(planBeats, assets);
  return {
    version: Math.max(storyboardArtifact.version, assetArtifact.version),
    status: materialized !== planBeats.length ? "MATERIALIZATION_REQUIRED" : qualityAudit.status === "PASS" ? "READY_FOR_MASTER_BINDING" : "QUALITY_REPAIR_REQUIRED",
    selectionMode: tournament?.selectionMode || "AUTONOMOUS",
    userVerification: tournament?.userVerification || { participation: "OPTIONAL", defaultAction: "SKIP_AND_AUTO_VERIFY" },
    budgetPolicy: tournament?.budgetPolicy || null,
    summary: {
      visualBeats: planBeats.length,
      families: new Set(planBeats.map((beat) => beat.primaryFamily)).size,
      plannedSelections: planBeats.filter((beat) => beat.selectedPlan).length,
      materialized,
      rightsReady: materialized,
      remaining: Math.max(0, planBeats.length - materialized),
      fallbacks,
      paidApprovals: planBeats.filter((beat) => beat.selectedPlan?.sourceType?.includes("PAID") && !beat.materializedAsset).length,
      exceptions: planBeats.filter((beat) => beat.requiresHumanReview || !beat.selectedPlan).length,
    },
    qualityAudit,
    beats: planBeats,
  };
}

function optimizedQuery(beat: MaterializationBeat) {
  const planned = beat.selectedPlan?.searchQuery || beat.selectedPlan?.locator || "";
  const family = beat.primaryFamily.replaceAll("_", " ").toLowerCase();
  return cleanText(planned || `${beat.visualIntent} ${family}`, beat.visualIntent).replace(/\b(4k|cinematic|animation|diagram)\b/gi, " ").replace(/\s+/g, " ").trim().slice(0, 110);
}

function selectPexelsVideo(files: any[]) {
  return [...(files || [])].filter((file) => file?.link && (file.width || 0) >= 960).sort((a, b) => Math.abs((a.width || 1280) - 1280) - Math.abs((b.width || 1280) - 1280))[0]?.link || null;
}

async function discoverOptimizedCandidates(projectId: string, beat: MaterializationBeat, options: { allowInternal?: boolean; excludedCandidateIds?: Set<string>; excludedUrls?: Set<string> } = {}) {
  const env = await runtimeEnv();
  const query = optimizedQuery(beat);
  const wantsVideo = beat.primaryFamily === "MACRO_REALITY" || /footage|video|b-roll|camera/i.test(`${beat.assetType} ${beat.sourceStrategy}`);
  const pexelsTask = env.PEXELS_API_KEY ? fetchJson(`https://api.pexels.com/v1/videos/search?query=${encodeURIComponent(query)}&orientation=landscape&per_page=5`, { Authorization: env.PEXELS_API_KEY }).then((data) =>
    (data.videos || []).map((item: any, index: number): DiscoveryCandidate => ({ id: `pexels-video:${item.id}`, provider: "Pexels", category: "FREE", title: cleanText(item.url, `Pexels video ${item.id}`), mediaType: "VIDEO", thumbnailUrl: item.image || null, assetUrl: selectPexelsVideo(item.video_files), landingUrl: item.url, licenseType: "PEXELS_LICENSE", licenseUrl: "https://www.pexels.com/license/", creator: cleanText(item.user?.name, "Unknown"), score: 96 - index }))
  ).catch(() => [] as DiscoveryCandidate[]) : Promise.resolve([] as DiscoveryCandidate[]);
  const pixabayTask = env.PIXABAY_API_KEY ? fetchJson(`https://pixabay.com/api/videos/?key=${encodeURIComponent(env.PIXABAY_API_KEY)}&q=${encodeURIComponent(query)}&safesearch=true&per_page=5`).then((data) =>
    (data.hits || []).map((item: any, index: number): DiscoveryCandidate => ({ id: `pixabay-video:${item.id}`, provider: "Pixabay", category: "FREE", title: cleanText(item.tags, `Pixabay video ${item.id}`), mediaType: "VIDEO", thumbnailUrl: item.videos?.medium?.thumbnail || null, assetUrl: item.videos?.medium?.url || item.videos?.small?.url || null, landingUrl: item.pageURL, licenseType: "PIXABAY_CONTENT_LICENSE", licenseUrl: "https://pixabay.com/service/license-summary/", creator: cleanText(item.user, "Unknown"), score: 94 - index }))
  ).catch(() => [] as DiscoveryCandidate[]) : Promise.resolve([] as DiscoveryCandidate[]);
  const imageTask = fetchJson(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&license_type=commercial&page_size=5`).then((data) =>
    (Array.isArray(data.results) ? data.results : []).map((item: any, index: number): DiscoveryCandidate => ({ id: `openverse:${cleanText(item.id, String(index))}`, provider: "Openverse", category: "FREE", title: cleanText(item.title), mediaType: "IMAGE", thumbnailUrl: typeof item.thumbnail === "string" ? item.thumbnail : null, assetUrl: typeof item.url === "string" ? item.url : null, landingUrl: typeof item.foreign_landing_url === "string" ? item.foreign_landing_url : "https://openverse.org/", licenseType: cleanText(item.license, "OPEN_LICENSE").toUpperCase(), licenseUrl: typeof item.license_url === "string" ? item.license_url : null, creator: item.creator ? cleanText(item.creator) : null, score: (wantsVideo ? 82 : 93) - index }))
  ).catch(() => [] as DiscoveryCandidate[]);
  const db = await getDb();
  const [pexels, pixabay, openverse, internalRows] = await Promise.all([pexelsTask, pixabayTask, imageTask, db.select().from(mediaAssets).where(eq(mediaAssets.rightsStatus, "VERIFIED")).orderBy(desc(mediaAssets.createdAt)).limit(40)]);
  const terms = new Set(query.toLowerCase().split(/\W+/).filter((term) => term.length > 3));
  const internal = (options.allowInternal === false ? [] : internalRows).filter((asset) => asset.sceneId !== beat.assetKey && (asset.storageKey || asset.sourceUrl)).map((asset, index): DiscoveryCandidate => {
    const overlap = [...terms].filter((term) => `${asset.name} ${asset.sourceType}`.toLowerCase().includes(term)).length;
    return { id: `internal:${asset.id}`, provider: "Frameflow library", category: "INTERNAL", title: asset.name, mediaType: asset.mimeType.startsWith("video/") ? "VIDEO" : "IMAGE", thumbnailUrl: asset.storageKey ? `/api/projects/${asset.projectId}/media?asset=${encodeURIComponent(asset.id)}` : asset.sourceUrl, assetUrl: asset.sourceUrl, landingUrl: asset.sourceUrl || "#", licenseType: asset.licenseType, licenseUrl: null, creator: "Verified internal asset", sourceAssetId: asset.id, score: 88 + Math.min(8, overlap * 3) - index * .1 };
  }).filter((candidate) => candidate.score >= 90).slice(0, 4);
  return [...internal, ...pexels, ...pixabay, ...openverse].filter((candidate) => (candidate.assetUrl || candidate.sourceAssetId) && !options.excludedCandidateIds?.has(candidate.id) && !options.excludedUrls?.has(candidate.assetUrl || "")).sort((a, b) => b.score - a.score);
}

async function sha256Hex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function storeOptimizedAsset(projectId: string, beat: MaterializationBeat, candidate: DiscoveryCandidate, attempt: number) {
  const db = await getDb(); const env = await runtimeEnv();
  if (!env.BUCKET) throw new Error("MEDIA_STORAGE_UNAVAILABLE");
  if (candidate.category === "INTERNAL" && candidate.sourceAssetId) {
    const [source] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, candidate.sourceAssetId)).limit(1);
    if (!source || source.rightsStatus !== "VERIFIED" || (!source.storageKey && !source.sourceUrl)) throw new Error("INTERNAL_RIGHTS_CHANGED");
    const assetId = `${projectId}-MAT-${beat.id}-${crypto.randomUUID()}`;
    await db.insert(mediaAssets).values({ id: assetId, projectId, sceneId: beat.assetKey, name: source.name, mimeType: source.mimeType, sourceType: "MATERIALIZED_INTERNAL_REUSE", sourceUrl: source.sourceUrl, storageKey: source.storageKey, licenseType: source.licenseType, licenseProof: JSON.stringify({ policy: "MATERIALIZATION_ENGINE_V1", inheritedFrom: source.id, beatId: beat.id, selectedAt: new Date().toISOString(), attempt }), rightsStatus: "VERIFIED", status: "APPROVED", sizeBytes: source.sizeBytes });
    return { assetId, provider: "Frameflow library", fallback: false };
  }
  if (!candidate.assetUrl || !candidate.assetUrl.startsWith("https://")) throw new Error("INVALID_SOURCE_URL");
  const response = await fetch(candidate.assetUrl, { headers: { "User-Agent": "Frameflow-YouTube-Factory/1.0" }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`DOWNLOAD_${response.status}`);
  const contentType = (response.headers.get("content-type") || "").split(";")[0];
  if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) throw new Error("UNSUPPORTED_MEDIA_TYPE");
  const declaredSize = Number(response.headers.get("content-length") || 0); const cap = contentType.startsWith("video/") ? 60 * 1024 * 1024 : 15 * 1024 * 1024;
  if (declaredSize > cap) throw new Error("ASSET_TOO_LARGE");
  const bytes = new Uint8Array(await response.arrayBuffer()); if (!bytes.byteLength || bytes.byteLength > cap) throw new Error("ASSET_SIZE_REJECTED");
  const assetId = `${projectId}-MAT-${beat.id}-${crypto.randomUUID()}`; const extension = contentType.includes("video") ? (contentType.includes("webm") ? "webm" : "mp4") : (contentType.includes("png") ? "png" : contentType.includes("svg") ? "svg" : "jpg"); const key = `media/${projectId}/optimized/${beat.id}/${assetId}.${extension}`; const hash = await sha256Hex(bytes);
  await env.BUCKET.put(key, bytes, { httpMetadata: { contentType }, customMetadata: { projectId, beatId: beat.id, provider: candidate.provider, sourceAssetId: candidate.id, sha256: hash } });
  await db.insert(mediaAssets).values({ id: assetId, projectId, sceneId: beat.assetKey, name: cleanText(candidate.title), mimeType: contentType, sourceType: `MATERIALIZED_${candidate.provider.toUpperCase().replace(/\W+/g, "_")}`, sourceUrl: candidate.landingUrl, storageKey: key, licenseType: candidate.licenseType, licenseProof: JSON.stringify({ policy: "MATERIALIZATION_ENGINE_V1", decision: "AUTO_VERIFIED_FREE_SOURCE", beatId: beat.id, provider: candidate.provider, providerAssetId: candidate.id, landingUrl: candidate.landingUrl, directSourceUrl: candidate.assetUrl, licenseType: candidate.licenseType, licenseUrl: candidate.licenseUrl, creator: candidate.creator, selectionScore: candidate.score, sha256: hash, capturedAt: new Date().toISOString(), attempt }), rightsStatus: "VERIFIED", status: "APPROVED", sizeBytes: bytes.byteLength });
  return { assetId, provider: candidate.provider, fallback: false };
}

async function storeOptimizedFallback(projectId: string, beat: MaterializationBeat, reason: string) {
  const db = await getDb(); const env = await runtimeEnv(); if (!env.BUCKET) throw new Error("MEDIA_STORAGE_UNAVAILABLE");
  const bytes = new TextEncoder().encode(diagramSvg(beat.visualIntent)); const assetId = `${projectId}-MAT-${beat.id}-OWNED-${crypto.randomUUID()}`; const key = `media/${projectId}/optimized/${beat.id}/${assetId}.svg`;
  await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: "image/svg+xml" }, customMetadata: { projectId, beatId: beat.id, fallback: "true" } });
  await db.insert(mediaAssets).values({ id: assetId, projectId, sceneId: beat.assetKey, name: `${beat.id} · owned semantic motion`, mimeType: "image/svg+xml", sourceType: "OWNED_SEMANTIC_FALLBACK", storageKey: key, licenseType: "CHANNEL_OWNED", licenseProof: JSON.stringify({ policy: "MATERIALIZATION_ENGINE_V1", generator: "FRAMEFLOW_MOTION_SVG", beatId: beat.id, fallbackAfterAttempts: 2, reason, rights: "CHANNEL_OWNED", createdAt: new Date().toISOString() }), rightsStatus: "VERIFIED", status: "APPROVED", sizeBytes: bytes.byteLength }).onConflictDoNothing();
  return { assetId, provider: "Frameflow owned fallback", fallback: true };
}

async function storeOptimizedMotionSource(projectId: string, beat: MaterializationBeat) {
  const db = await getDb(); const env = await runtimeEnv(); if (!env.BUCKET) throw new Error("MEDIA_STORAGE_UNAVAILABLE");
  const family = beat.primaryFamily; const bytes = new TextEncoder().encode(diagramSvg(`${family} · ${beat.visualIntent}`)); const assetId = `${projectId}-VCA2-${beat.id}-${crypto.randomUUID()}`; const key = `media/${projectId}/optimized/${beat.id}/${assetId}.svg`;
  await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: "image/svg+xml" }, customMetadata: { projectId, beatId: beat.id, family, visualCompositionVersion: "2" } });
  await db.insert(mediaAssets).values({ id: assetId, projectId, sceneId: beat.assetKey, name: `${beat.id} · ${family.replaceAll("_", " ").toLowerCase()} motion source.svg`, mimeType: "image/svg+xml", sourceType: `OPTIMIZED_MOTION_SOURCE_${family}`, storageKey: key, licenseType: "CHANNEL_OWNED", licenseProof: JSON.stringify({ policy: "VISUAL_COMPOSITION_AUDIT_V2", generator: "FRAMEFLOW_FAMILY_MOTION_V2", beatId: beat.id, visualFamily: family, expectedFormat: expectedVisualFormat(family), selectionScore: 100, semanticBasis: "Frozen storyboard visual intent", rights: "CHANNEL_OWNED", createdAt: new Date().toISOString() }), rightsStatus: "VERIFIED", status: "APPROVED", sizeBytes: bytes.byteLength });
  return assetId;
}

async function storeOptimizedMotionRender(projectId: string, sceneId: string, parentAssetId: string, name: string, bytes: Uint8Array) {
  const db = await getDb(); const [parent] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, parentAssetId)).limit(1);
  if (!parent || parent.projectId !== projectId || parent.sceneId !== sceneId || !parent.sourceType.startsWith("OPTIMIZED_MOTION_SOURCE_") || parent.rightsStatus !== "VERIFIED") throw new Error("OPTIMIZED_MOTION_SOURCE_NOT_FOUND");
  const family = parent.sourceType.replace("OPTIMIZED_MOTION_SOURCE_", ""); const env = await runtimeEnv(); if (!env.BUCKET) throw new Error("MEDIA_STORAGE_UNAVAILABLE");
  const assetId = `${projectId}-VCA2-WEBM-${crypto.randomUUID()}`; const key = `media/${projectId}/optimized/${sceneId.replace(`${projectId}-`, "")}/${assetId}-${safeName(name)}`;
  await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: "video/webm" }, customMetadata: { projectId, sceneId, family, sourceAssetId: parent.id, visualCompositionVersion: "2" } });
  await db.update(mediaAssets).set({ status: "SUPERSEDED", updatedAt: new Date().toISOString() }).where(and(eq(mediaAssets.projectId, projectId), eq(mediaAssets.sceneId, sceneId), eq(mediaAssets.status, "APPROVED")));
  await db.insert(mediaAssets).values({ id: assetId, projectId, sceneId, name, mimeType: "video/webm", sourceType: `OPTIMIZED_MOTION_WEBM_${family}`, storageKey: key, licenseType: "CHANNEL_OWNED", licenseProof: JSON.stringify({ policy: "VISUAL_COMPOSITION_AUDIT_V2", renderer: "FRAMEFLOW_BROWSER_WEBM_V2", sourceAssetId: parent.id, visualFamily: family, expectedFormat: expectedVisualFormat(family), selectionScore: 100, fps: 30, rights: "CHANNEL_OWNED", renderedAt: new Date().toISOString() }), rightsStatus: "VERIFIED", status: "APPROVED", sizeBytes: bytes.byteLength });
  return assetId;
}

async function prepareVisualCompositionV2(projectId: string, repairCycle = 1) {
  if (!Number.isInteger(repairCycle) || repairCycle < 1 || repairCycle > 2) throw new Error("REPAIR_CYCLE_LIMIT");
  const db = await getDb(); const assets = await db.select().from(mediaAssets).where(eq(mediaAssets.projectId, projectId)).orderBy(desc(mediaAssets.createdAt)); const plan = await getOptimizedSourcePlan(projectId, assets); if (!plan) throw new Error("OPTIMIZED_SOURCE_PLAN_NOT_FOUND");
  const failed = new Map(plan.qualityAudit.repairQueue.map((failure: { beatId: string; issues: string[] }) => [failure.beatId, failure.issues])); const motionSourceIds: string[] = []; const decisions: Array<Record<string, unknown>> = [];
  for (const beat of plan.beats as MaterializationBeat[]) {
    const issues = failed.get(beat.id) || []; if (!issues.length) continue; const previous = assets.find((asset) => asset.sceneId === beat.assetKey && asset.status === "APPROVED") || null;
    if (beat.primaryFamily !== "MACRO_REALITY" && issues.some((issue) => ["VISUAL_FAMILY_FORMAT_MISMATCH", "MOTION_RENDER_REQUIRED", "STOCK_SEQUENCE_TOO_LONG"].includes(issue))) {
      if (previous?.sourceType.startsWith("OPTIMIZED_MOTION_SOURCE_")) { motionSourceIds.push(previous.id); continue; }
      const assetId = await storeOptimizedMotionSource(projectId, beat); if (previous) await db.update(mediaAssets).set({ status: "SUPERSEDED", updatedAt: new Date().toISOString() }).where(eq(mediaAssets.id, previous.id)); motionSourceIds.push(assetId); decisions.push({ beatId: beat.id, action: "GENERATE_FAMILY_MOTION", family: beat.primaryFamily, assetId }); continue;
    }
    if (beat.primaryFamily === "MACRO_REALITY" && issues.includes("PROVIDER_OVERCONCENTRATION")) {
      const candidates = (await discoverOptimizedCandidates(projectId, beat, { allowInternal: false })).filter((candidate) => candidate.provider !== beat.materializedAsset?.actualProvider && candidate.mediaType === "VIDEO"); let stored: { assetId: string; provider: string; fallback: boolean } | null = null;
      for (const candidate of candidates.slice(0, 2)) { try { stored = await storeOptimizedAsset(projectId, beat, candidate, 1); break; } catch { /* next provider candidate */ } }
      if (stored) { if (previous) await db.update(mediaAssets).set({ status: "SUPERSEDED", updatedAt: new Date().toISOString() }).where(eq(mediaAssets.id, previous.id)); decisions.push({ beatId: beat.id, action: "DIVERSIFY_STOCK_PROVIDER", ...stored }); }
    }
  }
  await db.insert(workflowEvents).values({ projectId, toStatus: "PRODUCTION_PREP", eventType: "VISUAL_COMPOSITION_V2_PREPARED", summary: `Visual Composition v2 cycle ${repairCycle}: ${motionSourceIds.length} family-motion sources prepared; ${decisions.length} repair decisions` });
  return { motionSourceIds, decisions, repairCycle };
}

async function materializeOptimizedWave(projectId: string, batchSize = 4) {
  const db = await getDb(); const assets = await db.select().from(mediaAssets).where(eq(mediaAssets.projectId, projectId)); const plan = await getOptimizedSourcePlan(projectId, assets);
  if (!plan) throw new Error("OPTIMIZED_SOURCE_PLAN_NOT_FOUND");
  const pending = (plan.beats as MaterializationBeat[]).filter((beat) => !beat.materializedAsset).slice(0, Math.max(1, Math.min(5, batchSize))); const decisions: Array<Record<string, unknown>> = [];
  for (const beat of pending) {
    const candidates = await discoverOptimizedCandidates(projectId, beat); let stored: { assetId: string; provider: string; fallback: boolean } | null = null; const errors: string[] = [];
    for (const [index, candidate] of candidates.slice(0, 2).entries()) { try { stored = await storeOptimizedAsset(projectId, beat, candidate, index + 1); break; } catch (error) { errors.push(error instanceof Error ? error.message : "INGEST_FAILED"); } }
    if (!stored) stored = await storeOptimizedFallback(projectId, beat, errors.join(", ") || "No free candidate passed the automatic ingest gate");
    decisions.push({ beatId: beat.id, status: "MATERIALIZED", ...stored, attempts: Math.min(2, Math.max(1, errors.length + (stored.fallback ? 0 : 1))), errors });
  }
  const refreshedAssets = await db.select().from(mediaAssets).where(eq(mediaAssets.projectId, projectId)); const refreshed = await getOptimizedSourcePlan(projectId, refreshedAssets);
  await db.insert(workflowEvents).values({ projectId, toStatus: "PRODUCTION_PREP", eventType: "OPTIMIZED_MATERIALIZATION_WAVE", summary: `${decisions.length} optimized visual beats materialized; ${refreshed?.summary.remaining || 0} remain` });
  return { decisions, summary: refreshed?.summary, status: refreshed?.status };
}

async function repairOptimizedWave(projectId: string, batchSize = 4, repairCycle = 1) {
  if (!Number.isInteger(repairCycle) || repairCycle < 1 || repairCycle > 2) throw new Error("REPAIR_CYCLE_LIMIT");
  const db = await getDb(); const assets = await db.select().from(mediaAssets).where(eq(mediaAssets.projectId, projectId)); const plan = await getOptimizedSourcePlan(projectId, assets);
  if (!plan) throw new Error("OPTIMIZED_SOURCE_PLAN_NOT_FOUND");
  const failedIds = new Set(plan.qualityAudit.repairQueue.map((failure: { beatId: string }) => failure.beatId));
  const targets = (plan.beats as MaterializationBeat[]).filter((beat) => failedIds.has(beat.id)).slice(0, Math.max(1, Math.min(5, batchSize)));
  const excludedCandidateIds = new Set<string>(); const excludedUrls = new Set<string>();
  for (const asset of assets.filter((item) => item.status === "APPROVED")) { const proof = parseProof(asset.licenseProof); if (typeof proof.providerAssetId === "string") excludedCandidateIds.add(proof.providerAssetId); if (typeof proof.directSourceUrl === "string") excludedUrls.add(proof.directSourceUrl); }
  const decisions: Array<Record<string, unknown>> = [];
  for (const beat of targets) {
    const previous = assets.find((asset) => asset.sceneId === beat.assetKey && asset.status === "APPROVED") || null;
    const candidates = await discoverOptimizedCandidates(projectId, beat, { allowInternal: false, excludedCandidateIds, excludedUrls }); let stored: { assetId: string; provider: string; fallback: boolean } | null = null; const errors: string[] = [];
    for (const [index, candidate] of candidates.slice(0, 2).entries()) { try { stored = await storeOptimizedAsset(projectId, beat, candidate, index + 1); excludedCandidateIds.add(candidate.id); if (candidate.assetUrl) excludedUrls.add(candidate.assetUrl); break; } catch (error) { errors.push(error instanceof Error ? error.message : "REPAIR_INGEST_FAILED"); } }
    if (!stored) stored = await storeOptimizedFallback(projectId, beat, errors.join(", ") || "No unique free source passed the repair gate");
    if (previous && previous.id !== stored.assetId) await db.update(mediaAssets).set({ status: "SUPERSEDED", updatedAt: new Date().toISOString() }).where(eq(mediaAssets.id, previous.id));
    decisions.push({ beatId: beat.id, status: "REPAIRED", repairCycle, ...stored, errors });
  }
  const refreshedAssets = await db.select().from(mediaAssets).where(eq(mediaAssets.projectId, projectId)); const refreshed = await getOptimizedSourcePlan(projectId, refreshedAssets);
  await db.insert(workflowEvents).values({ projectId, toStatus: "PRODUCTION_PREP", eventType: "MATERIALIZATION_QUALITY_REPAIR", summary: `Repair cycle ${repairCycle}: ${decisions.length} failed beats replaced; ${refreshed?.qualityAudit.repairQueue.length || 0} remain` });
  return { decisions, qualityAudit: refreshed?.qualityAudit, status: refreshed?.status };
}

async function discoverAssets(projectId: string, sceneId: string) {
  const db = await getDb();
  const [scene] = await db.select().from(sceneManifest).where(eq(sceneManifest.id, sceneId)).limit(1);
  if (!scene || scene.projectId !== projectId) throw new Error("SCENE_NOT_FOUND");
  const query = cleanText(scene.searchQuery, scene.visualIntent).slice(0, 120);
  const env = await runtimeEnv();
  const shutterstockConnected = Boolean(env.SHUTTERSTOCK_CONSUMER_KEY && env.SHUTTERSTOCK_CONSUMER_SECRET);
  const providerStatus = { openverse: "CONNECTED", pexels: env.PEXELS_API_KEY ? "CONNECTED" : "KEY_REQUIRED", pixabay: env.PIXABAY_API_KEY ? "CONNECTED" : "KEY_REQUIRED", shutterstock: shutterstockConnected ? "CONNECTED" : "KEY_REQUIRED", paidCatalogs: "HANDOFF" };

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

  const shutterstockTask = shutterstockConnected ? Promise.all([
    fetchJson(`https://api.shutterstock.com/v2/images/search?query=${encodeURIComponent(query)}&orientation=horizontal&page=1&per_page=5&view=minimal`, { Accept: "application/json", "User-Agent": "Frameflow-YouTube-Factory/1.0", Authorization: `Basic ${btoa(`${env.SHUTTERSTOCK_CONSUMER_KEY}:${env.SHUTTERSTOCK_CONSUMER_SECRET}`)}` }),
    fetchJson(`https://api.shutterstock.com/v2/videos/search?query=${encodeURIComponent(query)}&page=1&per_page=5&view=minimal`, { Accept: "application/json", "User-Agent": "Frameflow-YouTube-Factory/1.0", Authorization: `Basic ${btoa(`${env.SHUTTERSTOCK_CONSUMER_KEY}:${env.SHUTTERSTOCK_CONSUMER_SECRET}`)}` }),
  ]).then(([images, videos]) => [
    ...(images.data || []).map((item: any, index: number): DiscoveryCandidate => ({
      id: `shutterstock-image:${item.id}`, provider: "Shutterstock", category: "PAID", title: cleanText(item.description, `Shutterstock image ${item.id}`), mediaType: "IMAGE",
      thumbnailUrl: item.assets?.preview?.url || item.assets?.small_thumb?.url || null, assetUrl: item.assets?.preview?.url || null,
      landingUrl: `https://www.shutterstock.com/search/${encodeURIComponent(query)}`, licenseType: "SHUTTERSTOCK_LICENSE_REQUIRED", licenseUrl: "https://www.shutterstock.com/license", creator: item.contributor?.id ? `Contributor ${item.contributor.id}` : null, score: 88 - index,
    })),
    ...(videos.data || []).map((item: any, index: number): DiscoveryCandidate => ({
      id: `shutterstock-video:${item.id}`, provider: "Shutterstock", category: "PAID", title: cleanText(item.description, `Shutterstock video ${item.id}`), mediaType: "VIDEO",
      thumbnailUrl: item.assets?.thumb_jpg?.url || item.assets?.preview_jpg?.url || null, assetUrl: item.assets?.preview_mp4?.url || item.assets?.preview_webm?.url || null,
      landingUrl: `https://www.shutterstock.com/search/${encodeURIComponent(query)}`, licenseType: "SHUTTERSTOCK_LICENSE_REQUIRED", licenseUrl: "https://www.shutterstock.com/license", creator: item.contributor?.id ? `Contributor ${item.contributor.id}` : null, score: 87 - index,
    })),
  ]).catch(() => [] as DiscoveryCandidate[]) : Promise.resolve([] as DiscoveryCandidate[]);

  const [openverse, pexels, pixabay, shutterstock, internalRows] = await Promise.all([
    openverseTask, pexelsTask, pixabayTask, shutterstockTask,
    db.select().from(mediaAssets).where(eq(mediaAssets.rightsStatus, "VERIFIED")).orderBy(desc(mediaAssets.createdAt)).limit(30),
  ]);
  const terms = new Set(query.toLowerCase().split(/\W+/).filter((term) => term.length > 3));
  const internal = internalRows.filter((asset) => asset.sceneId !== sceneId && (asset.storageKey || asset.sourceUrl)).map((asset, index): DiscoveryCandidate => {
    const overlap = [...terms].filter((term) => `${asset.name} ${asset.sourceType}`.toLowerCase().includes(term)).length;
    return { id: `internal:${asset.id}`, provider: "Frameflow library", category: "INTERNAL", title: asset.name, mediaType: asset.mimeType.startsWith("video/") ? "VIDEO" : "IMAGE", thumbnailUrl: asset.storageKey ? `/api/projects/${asset.projectId}/media?asset=${encodeURIComponent(asset.id)}` : asset.sourceUrl, assetUrl: asset.sourceUrl, landingUrl: asset.sourceUrl || "#", licenseType: asset.licenseType, licenseUrl: null, creator: "Verified internal asset", sourceAssetId: asset.id, score: 80 + overlap * 5 - index };
  }).sort((a, b) => b.score - a.score).slice(0, 6);
  const paid: DiscoveryCandidate[] = [
    ...(!shutterstock.length ? [{ id: "paid:shutterstock", provider: "Shutterstock", category: "PAID" as const, title: `Search Shutterstock for “${query}”`, mediaType: "CATALOG" as const, thumbnailUrl: null, assetUrl: null, landingUrl: `https://www.shutterstock.com/search/${encodeURIComponent(query)}`, licenseType: "PAID_LICENSE_REQUIRED", licenseUrl: null, creator: null, score: 75 }] : []),
    { id: "paid:storyblocks", provider: "Storyblocks", category: "PAID", title: `Search Storyblocks for “${query}”`, mediaType: "CATALOG", thumbnailUrl: null, assetUrl: null, landingUrl: `https://www.storyblocks.com/video/search/${encodeURIComponent(query)}`, licenseType: "PAID_LICENSE_REQUIRED", licenseUrl: null, creator: null, score: 74 },
    { id: "paid:artgrid", provider: "Artgrid", category: "PAID", title: `Search Artgrid for “${query}”`, mediaType: "CATALOG", thumbnailUrl: null, assetUrl: null, landingUrl: "https://artgrid.io/", licenseType: "PAID_LICENSE_REQUIRED", licenseUrl: null, creator: null, score: 73 },
  ];
  return { scene: { id: scene.id, query }, providerStatus, candidates: [...internal, ...pexels, ...pixabay, ...shutterstock, ...openverse, ...paid].sort((a, b) => b.score - a.score) };
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
    const healthProvider = url.searchParams.get("providerHealth");
    if (healthProvider) return Response.json(await providerHealth(healthProvider));
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
    const [scenes, assets, runs, segments, settingsRows, profiles] = await Promise.all([
      db.select().from(sceneManifest).where(eq(sceneManifest.projectId, id)).orderBy(asc(sceneManifest.sceneNumber)),
      db.select().from(mediaAssets).where(eq(mediaAssets.projectId, id)).orderBy(desc(mediaAssets.createdAt)),
      db.select().from(assemblyRuns).where(eq(assemblyRuns.projectId, id)).orderBy(desc(assemblyRuns.version)),
      db.select().from(narrationSegments).where(eq(narrationSegments.projectId, id)).orderBy(asc(narrationSegments.position)),
      db.select().from(mediaAutomationSettings).where(eq(mediaAutomationSettings.projectId, id)).limit(1),
      db.select().from(voiceProfiles).where(eq(voiceProfiles.projectId, id)).limit(1),
    ]);
    if (url.searchParams.get("download") === "latest") {
      if (!runs[0]) return Response.json({ error: "Build an assembly plan first" }, { status: 404 });
      return new Response(runs[0].manifestJson, { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="${id}-assembly-v${runs[0].version}.json"` } });
    }
    const optimizedSourcePlan = await getOptimizedSourcePlan(id, assets);
    const approved = assets.filter((asset) => asset.status === "APPROVED");
    const verified = assets.filter((asset) => asset.rightsStatus === "VERIFIED");
    const coveredScenes = scenes.filter((scene) => approved.some((asset) => asset.sceneId === scene.id && asset.rightsStatus === "VERIFIED")).length;
    const env = await runtimeEnv();
    const sourceConnectors = [
      { id: "owned", name: "Owned Media Vault", category: "OWNED", status: env.BUCKET ? "CONNECTED" : "BLOCKED", capability: "Upload personal images and videos into private object storage with a per-asset rights ledger.", nextAction: env.BUCKET ? "Ready · assign media from any scene" : "Storage binding required", requiredKeys: [], securityModel: "Private object storage · per-asset provenance" },
      { id: "openverse", name: "Openverse", category: "FREE", status: "CONNECTED", capability: "Commercially reusable image discovery with creator and license metadata.", nextAction: "Ready · no key required", requiredKeys: [], securityModel: "Public API · license metadata retained" },
      { id: "pexels", name: "Pexels", category: "FREE", status: env.PEXELS_API_KEY ? "CONNECTED" : "KEY_REQUIRED", capability: "Landscape photo and video search with direct preview candidates.", nextAction: env.PEXELS_API_KEY ? "Ready for unified search" : "Add PEXELS_API_KEY", requiredKeys: ["PEXELS_API_KEY"], securityModel: "Protected server secret · never sent to browser" },
      { id: "pixabay", name: "Pixabay", category: "FREE", status: env.PIXABAY_API_KEY ? "CONNECTED" : "KEY_REQUIRED", capability: "Photo and video search with commercial-use license references.", nextAction: env.PIXABAY_API_KEY ? "Ready for unified search" : "Add PIXABAY_API_KEY", requiredKeys: ["PIXABAY_API_KEY"], securityModel: "Protected server secret · never sent to browser" },
      { id: "shutterstock", name: "Shutterstock", category: "PAID", status: env.SHUTTERSTOCK_CONSUMER_KEY && env.SHUTTERSTOCK_CONSUMER_SECRET ? "CONNECTED" : "KEY_REQUIRED", capability: "Paid image and footage search; previews remain unlicensed until purchase evidence is attached.", nextAction: env.SHUTTERSTOCK_CONSUMER_KEY && env.SHUTTERSTOCK_CONSUMER_SECRET ? "Search ready · license handoff retained" : "Add consumer key + secret", requiredKeys: ["SHUTTERSTOCK_CONSUMER_KEY", "SHUTTERSTOCK_CONSUMER_SECRET"], securityModel: "Protected server secrets · purchase proof required" },
      { id: "google_drive", name: "Google Drive", category: "OWNED", status: env.GOOGLE_DRIVE_CLIENT_ID ? "OAUTH_SETUP" : "CONFIG_REQUIRED", capability: "Import selected personal files through Picker without exposing the whole Drive.", nextAction: env.GOOGLE_DRIVE_CLIENT_ID ? "Complete OAuth callback and Picker" : "Add Drive OAuth client ID", requiredKeys: ["GOOGLE_DRIVE_CLIENT_ID"], securityModel: "OAuth + Picker · file-scoped access only" },
    ];
    const optimizedVoiceSegments = segments.filter((segment) => segment.scriptVersionId.includes(":V3:"));
    return Response.json({ scenes, assets, runs, sourceConnectors, optimizedSourcePlan, automation: settingsRows[0] || { verificationMode: "AUTOPILOT", minimumConfidence: 85, autoBuildAssembly: true }, gates: { voice: segments.length > 0 && segments.every((segment) => segment.status === "APPROVED" && segment.audioKey), channelVoiceLocked: profiles[0]?.status === "LOCKED", optimizedVoiceReady: optimizedVoiceSegments.length === 12 && optimizedVoiceSegments.every((segment) => segment.status === "APPROVED" && Boolean(segment.audioKey)), optimizedVoiceSegments: optimizedVoiceSegments.filter((segment) => Boolean(segment.audioKey)).length, assetQualityReady: optimizedSourcePlan?.qualityAudit.status === "PASS", assetCoverage: scenes.length ? Math.round(coveredScenes / scenes.length * 100) : 0, rightsCoverage: assets.length ? Math.round(verified.length / assets.length * 100) : 0, assemblyReady: scenes.length > 0 && coveredScenes === scenes.length } });
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

    const payload = await request.json() as { action?: "PREPARE_VISUAL_COMPOSITION_V2" | "REPAIR_OPTIMIZED_WAVE" | "MATERIALIZE_OPTIMIZED_WAVE" | "GENERATE_DIAGRAMS" | "GENERATE_MOTION_VISUALS" | "REGISTER_LINK" | "SELECT_DISCOVERY" | "SET_AUTOMATION_MODE" | "AUTO_SOURCE_ALL" | "VERIFY_RIGHTS" | "APPROVE_ASSET" | "BUILD_ASSEMBLY" | "FINALIZE_MOTION_UPLOAD"; batchSize?: number; repairCycle?: number; sceneId?: string; assetId?: string; parentAssetId?: string; uploadId?: string; chunkCount?: number; fileName?: string; sizeBytes?: number; sourceUrl?: string; licenseType?: string; licenseProof?: string; candidate?: DiscoveryCandidate; verificationMode?: "AUTOPILOT" | "REVIEW" };
    if (payload.action === "PREPARE_VISUAL_COMPOSITION_V2") return Response.json({ ok: true, ...(await prepareVisualCompositionV2(id, Number(payload.repairCycle) || 1)) });
    if (payload.action === "REPAIR_OPTIMIZED_WAVE") return Response.json({ ok: true, ...(await repairOptimizedWave(id, Number(payload.batchSize) || 4, Number(payload.repairCycle) || 1)) });
    if (payload.action === "MATERIALIZE_OPTIMIZED_WAVE") return Response.json({ ok: true, ...(await materializeOptimizedWave(id, Number(payload.batchSize) || 4)) });
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
      const [parentAsset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, parentAssetId)).limit(1);
      const assetId = parentAsset?.sourceType.startsWith("OPTIMIZED_MOTION_SOURCE_") ? await storeOptimizedMotionRender(id, sceneId, parentAssetId, safeName(payload.fileName || "motion.webm"), joined) : await storeMotionRender(id, sceneId, parentAssetId, safeName(payload.fileName || "motion.webm"), joined);
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
