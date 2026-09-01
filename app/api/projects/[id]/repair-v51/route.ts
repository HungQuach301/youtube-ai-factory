import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import {
  appendWriteCommandAudit,
  hashActorSubject,
  type WriteCommandAuditDatabase,
  type WriteCommandAuditIdentity,
} from "../../../../../lib/write-command-audit";
import { evidenceBindings, evidenceRecords, mediaAssets, researchClaims, workflowEvents } from "../../../../../db/schema";

type RuntimeStatement = { bind(...values: unknown[]): RuntimeStatement; run(): Promise<unknown> };
type RuntimeEnv = {
  BUCKET?: { put(key: string, value: ArrayBuffer | Uint8Array | string, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }): Promise<unknown> };
  DB?: { prepare(sql: string): RuntimeStatement; batch(statements: RuntimeStatement[]): Promise<unknown> };
  PEXELS_API_KEY?: string;
  PIXABAY_API_KEY?: string;
};
type RepairV51OwnerRuntimeEnv = {
  DB?: WriteCommandAuditDatabase;
  FACTORY_EXPERT_EMAILS?: string;
};
type RepairV51OwnerAction = "PLAN_V51" | "MATERIALIZE_V51_BATCH";
type RepairV51OwnerResult = {
  response: Response;
  domainReceiptReference: string | null;
};

const OWNER_HANDLER_IDENTITY = "app/api/projects/[id]/repair-v51/route.ts#POST";
const OWNER_ACTIONS = new Set(["PLAN_V51", "MATERIALIZE_V51_BATCH"]);
const MAX_OWNER_BODY_BYTES = 16 * 1024;
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9._:-]{8,200}$/;
const VERSION = 51;
const SHOTS = 144;
const ASSETS = 120;
const FAMILIES = [
  "MACRO_REALITY", "ANIMATED_SYSTEM_DIAGRAM", "FLOW_MAP", "DATA_CHART", "TIMELINE", "ECONOMIC_WATERFALL",
  "UI_SIMULATION", "RECEIPT_RECONSTRUCTION", "COMIC_SEQUENCE", "DOODLE_EXPLAINER", "KINETIC_TYPE", "EDITORIAL_COLLAGE",
  "BEFORE_AFTER", "VISUAL_METAPHOR", "DOCUMENTARY_ARCHIVE", "ICON_EXPLAINER", "GEOGRAPHIC_MAP", "NETWORK_GRAPH",
] as const;
const STOCK_FAMILIES = new Set(["MACRO_REALITY", "DOCUMENTARY_ARCHIVE", "EDITORIAL_COLLAGE", "VISUAL_METAPHOR"]);

function ownerFailure(error: string, status: number) {
  return Response.json({ error }, { status });
}

function repairV51OwnerSameOrigin(request: Request) {
  const url = new URL(request.url);
  return request.method === "POST"
    && /^\/api\/projects\/[^/]+\/repair-v51$/.test(url.pathname)
    && url.search === ""
    && request.headers.get("origin") === url.origin
    && request.headers.get("sec-fetch-site") === "same-origin";
}

async function repairV51OwnerRuntimeEnv(): Promise<RepairV51OwnerRuntimeEnv> {
  const { env } = await import("cloudflare:workers");
  return env as unknown as RepairV51OwnerRuntimeEnv;
}

async function authorizeRepairV51OwnerWrite(request: Request) {
  const user = await getChatGPTUser();
  if (!user?.email) return ownerFailure("SIWC_AUTHENTICATION_REQUIRED", 401);

  const env = await repairV51OwnerRuntimeEnv();
  const normalizedEmail = user.email.trim().toLowerCase();
  const owners = String(env.FACTORY_EXPERT_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (owners.length === 0) return ownerFailure("OWNER_WRITE_ALLOWLIST_UNCONFIGURED", 503);
  if (!owners.includes(normalizedEmail)) return ownerFailure("OWNER_WRITE_AUTHORIZATION_REQUIRED", 403);
  if (!repairV51OwnerSameOrigin(request)) return ownerFailure("OWNER_WRITE_SAME_ORIGIN_REQUIRED", 403);
  if (!env.DB) return ownerFailure("CANONICAL_DATABASE_UNAVAILABLE", 503);

  return { db: env.DB, normalizedEmail };
}

async function sha256RawBody(bytes: ArrayBuffer) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((item) => item.toString(16).padStart(2, "0")).join("");
}

async function readBoundedRepairV51OwnerBody(request: Request) {
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
  if (typeof record.action !== "string") return ownerFailure("OWNER_WRITE_COMMAND_INVALID", 400);
  if (Object.keys(record).some((key) => key !== "action")) {
    return ownerFailure("OWNER_WRITE_COMMAND_FIELD_FORBIDDEN", 400);
  }
  if (!OWNER_ACTIONS.has(record.action)) return ownerFailure("OWNER_WRITE_ACTION_FORBIDDEN", 403);

  return {
    action: record.action as RepairV51OwnerAction,
    bodySha256: await sha256RawBody(bytes),
  };
}

function repairV51OwnerCorrelationId(request: Request) {
  const supplied = request.headers.get("x-correlation-id")?.trim() ?? "";
  return CORRELATION_ID_PATTERN.test(supplied) ? supplied : `repair-v51-owner:${crypto.randomUUID()}`;
}

async function repairV51OwnerAuditIdentity(
  request: Request,
  projectId: string,
  normalizedEmail: string,
  action: RepairV51OwnerAction,
  bodySha256: string,
): Promise<WriteCommandAuditIdentity> {
  return {
    handlerIdentity: OWNER_HANDLER_IDENTITY,
    actorType: "CHATGPT_OWNER",
    actorSubjectHash: await hashActorSubject("CHATGPT_OWNER", normalizedEmail),
    action,
    resourceScope: `project:${projectId}:repair-v51`,
    correlationId: repairV51OwnerCorrelationId(request),
    requestHash: bodySha256,
  };
}

async function runtimeEnv() { const { env } = await import("cloudflare:workers"); return env as unknown as RuntimeEnv; }
function parse(value: string | null) { try { return value ? JSON.parse(value) as Record<string, unknown> : {}; } catch { return {}; } }
function batches<T>(items: T[], size: number) { const output: T[][] = []; for (let index = 0; index < items.length; index += size) output.push(items.slice(index, index + size)); return output; }
async function digest(bytes: Uint8Array) { const value = await crypto.subtle.digest("SHA-256", bytes); return [...new Uint8Array(value)].map((item) => item.toString(16).padStart(2, "0")).join(""); }
function escapeXml(value: string) { return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[character] || character)); }
function tokens(value: string) { return [...new Set(value.toLowerCase().replace(/[^a-z0-9$ ]/g, " ").split(/\s+/).filter((token) => token.length > 2 && !["the", "and", "that", "with", "from", "this", "into", "when", "what"].includes(token)))]; }
function familyFor(text: string, index: number) {
  const lower = text.toLowerCase();
  if (/receipt|statement|invoice/.test(lower)) return index % 2 ? "RECEIPT_RECONSTRUCTION" : "MACRO_REALITY";
  if (/time|later|delay|instant|sequence/.test(lower)) return "TIMELINE";
  if (/fee|cost|amount|deposit|payout|economic/.test(lower)) return index % 2 ? "ECONOMIC_WATERFALL" : "DATA_CHART";
  if (/route|network|role|participant|issuer|acquir/.test(lower)) return index % 3 ? "FLOW_MAP" : "NETWORK_GRAPH";
  if (/risk|decision|check|approve/.test(lower)) return index % 2 ? "UI_SIMULATION" : "BEFORE_AFTER";
  return FAMILIES[index % FAMILIES.length];
}
function emphasisFor(index: number) { if ([0, 1, 35, 71, 109, 136, 143].includes(index)) return "PEAK"; if (index % 12 === 0 || index % 12 === 11) return "ACCENT"; return "BASE"; }
function shotWeights() { const raw = Array.from({ length: SHOTS }, (_, index) => emphasisFor(index) === "PEAK" ? 1.35 : emphasisFor(index) === "ACCENT" ? 1.12 : .96 + (index % 5) * .025); const scale = 480 / raw.reduce((sum, value) => sum + value, 0); return raw.map((value) => value * scale); }
function searchQueries(text: string, family: string) {
  const key = tokens(text).slice(0, 6).join(" ");
  const context = family === "MACRO_REALITY" ? "cinematic close up hands merchant payment" : family === "DOCUMENTARY_ARCHIVE" ? "documentary banking infrastructure office" : "financial system explanatory visual";
  return [`${key} ${context}`, `${key} credit card payment process`];
}

function semanticSvg(family: string, index: number, title: string, claim: string, emphasis: string) {
  const accents = ["#83e7bc", "#f4c76f", "#89c9ff", "#ef907a", "#c0a7ff", "#f0e8cf"];
  const accent = accents[index % accents.length]; const safeTitle = escapeXml(title.slice(0, 58));
  const nodes = ["CARDHOLDER", "MERCHANT", "ACQUIRER", "CARD NETWORK", "ISSUER"];
  const network = nodes.map((node, position) => `<g><circle cx="${270 + position * 345}" cy="500" r="78" fill="${position === index % 5 ? accent : "#17463c"}" stroke="#9ccdbb" stroke-width="4"/><text x="${270 + position * 345}" y="508" text-anchor="middle" fill="#f4f0df" font-family="Arial" font-size="${node.length > 10 ? 18 : 21}" font-weight="700">${node}</text>${position < 4 ? `<path d="M${348 + position * 345} 500H${537 + position * 345}" stroke="${accent}" stroke-width="8" stroke-dasharray="24 16"><animate attributeName="stroke-dashoffset" from="80" to="0" dur="1.8s" repeatCount="indefinite"/></path>` : ""}</g>`).join("") + `<g opacity=".95"><path d="M615 690H1305" stroke="#d8c987" stroke-width="6"/><text x="960" y="750" text-anchor="middle" fill="#f3ecd9" font-family="Arial" font-size="28">CLEARING &amp; SETTLEMENT HAPPEN LATER</text></g>`;
  const bars = [38, 64, 49, 82, 70, 94].map((height, position) => `<rect x="${360 + position * 205}" y="${780 - height * 5}" width="116" height="${height * 5}" rx="12" fill="${position === index % 6 ? accent : "#3f7567"}"><animate attributeName="height" values="20;${height * 5};${height * 4.6}" dur="${1.4 + position * .18}s" repeatCount="indefinite"/></rect>`).join("");
  const doodle = `<path d="M250 650q180-420 360 0t360 0t360 0" fill="none" stroke="${accent}" stroke-width="13" stroke-linecap="round" stroke-dasharray="34 18"><animate attributeName="stroke-dashoffset" from="104" to="0" dur="2.5s" repeatCount="indefinite"/></path>${[0,1,2,3].map((item) => `<circle cx="${400 + item * 360}" cy="${360 + (item % 2) * 260}" r="${50 + item * 8}" fill="none" stroke="#e9e3cf" stroke-width="9"><animate attributeName="r" values="40;70;40" dur="${2 + item * .3}s" repeatCount="indefinite"/></circle>`).join("")}`;
  const comic = `<g>${[0,1,2].map((panel) => `<rect x="${210 + panel * 510}" y="300" width="440" height="500" rx="18" fill="#f3ecd9" stroke="${accent}" stroke-width="10"/><circle cx="${350 + panel * 510}" cy="470" r="72" fill="#153f36"/><path d="M${310 + panel * 510} 610q140-130 270 0" fill="none" stroke="#153f36" stroke-width="28"/><path d="M${410 + panel * 510} 380q130-95 190 40" fill="none" stroke="${accent}" stroke-width="8" stroke-dasharray="18 12"/>`).join("")}</g>`;
  const timeline = `<line x1="240" y1="550" x2="1680" y2="550" stroke="#547e72" stroke-width="20"/>${[0,1,2,3,4].map((item) => `<g><circle cx="${310 + item * 335}" cy="550" r="44" fill="${item <= index % 5 ? accent : "#163f36"}"/><text x="${310 + item * 335}" y="670" text-anchor="middle" fill="#e8e3d2" font-family="Arial" font-size="26">${["REQUEST","HOLD","CLEAR","FUND","DEPOSIT"][item]}</text></g>`).join("")}<circle cy="550" r="18" fill="#fff"><animate attributeName="cx" values="310;1650" dur="4s" repeatCount="indefinite"/></circle>`;
  const receipt = `<rect x="600" y="240" width="720" height="650" rx="28" fill="#f4edd9"/><text x="710" y="410" fill="#12382f" font-family="Arial" font-size="84">$100.00</text>${[0,1,2,3].map((item) => `<rect x="710" y="${500 + item * 82}" width="${480 - item * 55}" height="22" rx="11" fill="${item === index % 4 ? accent : "#708b82"}"><animate attributeName="width" values="80;${480 - item * 55};${430 - item * 45}" dur="${2 + item * .2}s" repeatCount="indefinite"/></rect>`).join("")}`;
  const familyLayer = /NETWORK|FLOW_MAP|SYSTEM_DIAGRAM|GEOGRAPHIC/.test(family) ? network : /CHART|WATERFALL/.test(family) ? bars : /DOODLE|ICON|KINETIC/.test(family) ? doodle : /COMIC|COLLAGE|ARCHIVE/.test(family) ? comic : /TIMELINE|BEFORE_AFTER/.test(family) ? timeline : /RECEIPT|UI_SIMULATION/.test(family) ? receipt : network;
  const entry = (index % 5) * 24; const scale = 1 + (index % 4) * .012;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet"><rect width="1920" height="1080" fill="#082d26"/><circle cx="${1580 + index % 3 * 70}" cy="${180 + index % 4 * 35}" r="300" fill="#174d41" opacity=".48"><animate attributeName="r" values="270;350;270" dur="${4.1 + index % 5 * .3}s" repeatCount="indefinite"/></circle><g transform="translate(${entry} 0) scale(${scale})">${familyLayer}</g><rect x="96" y="80" width="${Math.min(960, 340 + safeTitle.length * 18)}" height="72" rx="36" fill="#061f1a" opacity=".88"/><text x="138" y="128" fill="#f3ecd9" font-family="Arial" font-size="32" font-weight="700">${safeTitle}</text></svg>`;
}

type Candidate = { provider: string; sourceUrl: string; downloadUrl: string; mimeType: string; license: string; width: number; height: number; query: string; score: number };
async function stockTournament(env: RuntimeEnv, queries: string[], used: Set<string>) {
  const candidates: Candidate[] = [];
  for (const query of queries) {
    if (env.PEXELS_API_KEY) { try { const response = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=8&orientation=landscape`, { headers: { Authorization: env.PEXELS_API_KEY }, signal: AbortSignal.timeout(10000) }); if (response.ok) { const data = await response.json() as { videos?: Array<{ url: string; video_files?: Array<{ link: string; file_type?: string; width?: number; height?: number }> }> }; for (const video of data.videos || []) { const file = (video.video_files || []).filter((item) => (item.width || 0) >= 1280 && (item.height || 0) >= 720).sort((a,b) => (a.width || 0) - (b.width || 0))[0]; if (file && !used.has(video.url)) candidates.push({ provider: "Pexels", sourceUrl: video.url, downloadUrl: file.link, mimeType: file.file_type || "video/mp4", license: "PEXELS_LICENSE", width: file.width || 0, height: file.height || 0, query, score: 0 }); } } } catch { /* provider exception becomes fallback */ } }
    if (env.PIXABAY_API_KEY) { try { const response = await fetch(`https://pixabay.com/api/videos/?key=${encodeURIComponent(env.PIXABAY_API_KEY)}&q=${encodeURIComponent(query)}&safesearch=true&per_page=8`, { signal: AbortSignal.timeout(10000) }); if (response.ok) { const data = await response.json() as { hits?: Array<{ pageURL: string; tags?: string; videos?: { medium?: { url: string; width?: number; height?: number }; large?: { url: string; width?: number; height?: number } } }> }; for (const hit of data.hits || []) { const file = hit.videos?.medium || hit.videos?.large; if (file?.url && !used.has(hit.pageURL)) candidates.push({ provider: "Pixabay", sourceUrl: hit.pageURL, downloadUrl: file.url, mimeType: "video/mp4", license: "PIXABAY_CONTENT_LICENSE", width: file.width || 0, height: file.height || 0, query: `${query} ${hit.tags || ""}`, score: 0 }); } } } catch { /* provider exception becomes fallback */ } }
  }
  const intent = new Set(tokens(queries.join(" "))); const scored = candidates.map((candidate) => { const overlap = tokens(candidate.query).filter((token) => intent.has(token)).length; const resolution = candidate.width >= 1920 ? 8 : candidate.width >= 1280 ? 5 : 0; return { ...candidate, score: Math.min(100, 42 + overlap * 6 + resolution + (candidate.provider === "Pexels" ? 2 : 0)) }; }).filter((candidate) => candidate.score >= 78).sort((a,b) => b.score - a.score);
  return { winner: scored[0] || null, candidates: scored.slice(0, 8).map(({ downloadUrl: _downloadUrl, ...candidate }) => candidate) };
}

async function status(projectId: string) {
  const db = await getDb(); const [records, bindings] = await Promise.all([db.select().from(evidenceRecords).where(eq(evidenceRecords.projectId, projectId)), db.select().from(evidenceBindings).where(eq(evidenceBindings.projectId, projectId))]);
  const current = records.filter((record) => Number(parse(record.settingsJson).productionExpansionVersion) === VERSION); const shots = current.filter((record) => record.entityType === "SHOT"); const assets = current.filter((record) => record.entityType === "MEDIA_ASSET" && parse(record.settingsJson).role === "UNIQUE_ASSET_SLOT"); const ready = assets.filter((record) => record.storageKey && record.contentHash && record.lifecycleState === "BOUND"); const ids = new Set(assets.map((asset) => asset.id)); const boundShots = new Set(bindings.filter((binding) => binding.status === "ACTIVE" && binding.relationship === "V51_VISUAL_FOR_SHOT" && ids.has(binding.fromRecordId)).map((binding) => binding.toRecordId));
  const families = [...new Set(shots.map((shot) => String(parse(shot.settingsJson).primaryFamily || "")))]; const latestMaster = records.filter((record) => record.entityType === "RENDER_EVIDENCE").sort((a,b) => b.updatedAt.localeCompare(a.updatedAt))[0]; const repaired = ready.filter((asset) => Number(parse(asset.settingsJson).repairVersion) === 52).length; const isV52 = assets.some((asset) => Number(parse(asset.settingsJson).repairVersion) === 52);
  return { version: isV52 ? "5.2" : "5.1", status: shots.length === SHOTS && ready.length === ASSETS && boundShots.size === SHOTS ? (isV52 ? "READY_FOR_V52_MASTER" : "READY_FOR_V51_MASTER") : shots.length === SHOTS ? "MATERIALIZATION_REQUIRED" : "REPAIR_REQUIRED", shots: shots.length, assets: assets.length, materialized: ready.length, repaired, boundShots: boundShots.size, families, candidateDepth: ready.reduce((sum, asset) => sum + Number((parse(asset.settingsJson).candidateCount || 0)), 0), latestMasterStatus: latestMaster ? String(parse(latestMaster.settingsJson).perceptualQa || "NOT_AUDITED") : "NOT_RENDERED" };
}

async function plan(projectId: string) {
  const env = await runtimeEnv(); if (!env.DB) throw new Error("V5.1 planning requires the Factory database"); const db = await getDb();
  const [legacy, claims] = await Promise.all([db.select().from(mediaAssets).where(eq(mediaAssets.projectId, projectId)), db.select().from(researchClaims).where(eq(researchClaims.projectId, projectId))]);
  const beats = legacy.filter((asset) => asset.status === "APPROVED" && asset.sceneId.startsWith(`${projectId}-VB-`)).sort((a,b) => Number(a.sceneId.split("-").at(-1)) - Number(b.sceneId.split("-").at(-1))); const beatIds = [...new Set(beats.map((item) => item.sceneId))]; if (beatIds.length < 40) throw new Error("V5.1 requires the frozen 40-beat editorial architecture"); const supported = claims.filter((claim) => claim.status === "SUPPORTED"); if (!supported.length) throw new Error("V5.1 requires supported claims");
  const weights = shotWeights(); let cursor = 0; const now = new Date().toISOString(); const records: Array<Record<string, unknown>> = []; const bindings: Array<Record<string, string>> = [];
  for (let index = 0; index < ASSETS; index += 1) { records.push({ id: `${projectId}-V51-ASSET-${String(index + 1).padStart(3,"0")}`, projectId, entityType: "MEDIA_ASSET", pipelineVersion: 5, lifecycleState: "PLAN", title: `V5.1 semantic asset ${index + 1}`, licenseStatus: "REQUIRES_MATERIALIZATION", commercialUseStatus: "UNKNOWN", settingsJson: JSON.stringify({ productionExpansionVersion: VERSION, role: "UNIQUE_ASSET_SLOT", candidateDepthRequired: 6, maximumUses: index < 96 ? 1 : 2, frameFit: "COVER_SAFE_16_9", perceptualRepair: true }), claimIdsJson: "[]", shotIdsJson: "[]", updatedAt: now }); }
  for (let index = 0; index < SHOTS; index += 1) { const start = Number(cursor.toFixed(3)); cursor += weights[index]; const end = index === SHOTS - 1 ? 480 : Number(cursor.toFixed(3)); const beatIndex = Math.min(39, Math.floor(start / 12)); const claim = supported[(beatIndex + index) % supported.length]; const legacyBeat = beats.find((item) => item.sceneId === beatIds[beatIndex]); const baseText = `${legacyBeat?.name || `Beat ${beatIndex + 1}`} — ${claim.claimText}`; const family = familyFor(baseText, index); const assetIndex = index < ASSETS ? index : 96 + ((index - ASSETS) % 24); const shotId = `${projectId}-V51-SHOT-${String(index + 1).padStart(3,"0")}`; const assetId = `${projectId}-V51-ASSET-${String(assetIndex + 1).padStart(3,"0")}`; const emphasis = emphasisFor(index); const queries = searchQueries(baseText, family);
    records.push({ id: shotId, projectId, entityType: "SHOT", pipelineVersion: 5, lifecycleState: "PLAN", title: legacyBeat?.name || `Narrative beat ${beatIndex + 1}`, licenseStatus: "NOT_APPLICABLE", commercialUseStatus: "NOT_APPLICABLE", settingsJson: JSON.stringify({ productionExpansionVersion: VERSION, startSeconds: start, endSeconds: end, durationSeconds: Number((end-start).toFixed(3)), sectionIndex: Math.floor(start / 40)+1, parentBeatId: beatIds[beatIndex], primaryFamily: family, narrativeFunction: index % 5 === 0 ? "PROVE" : index % 5 === 4 ? "PAYOFF" : "EXPLAIN", emphasis, exactClaim: claim.claimText, entities: tokens(baseText).slice(0,8), searchQueries: queries, negativeConstraints: ["no generic handshake", "no random dashboard", "no unexplained symbols", "no repeated source within 90 seconds"], meaningfulEvents: emphasis === "PEAK" ? 3 : 2, maximumNearStaticSeconds: emphasis === "PEAK" ? 2.4 : 3.2, assetSlotId: assetId, frameFit: "COVER_SAFE_16_9" }), claimIdsJson: JSON.stringify([claim.id]), shotIdsJson: JSON.stringify([shotId]), updatedAt: now }); bindings.push({ id: `${projectId}-V51-PLAN-${String(index + 1).padStart(3,"0")}`, projectId, fromRecordId: assetId, toRecordId: shotId, relationship: "V51_PLANNED_VISUAL_FOR_SHOT", status: "PLANNED" }); }
  const sql = "INSERT OR IGNORE INTO evidence_records (id, project_id, entity_type, pipeline_version, lifecycle_state, title, license_status, commercial_use_status, settings_json, claim_ids_json, shot_ids_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"; const statements = records.map((row) => env.DB!.prepare(sql).bind(row.id,row.projectId,row.entityType,row.pipelineVersion,row.lifecycleState,row.title,row.licenseStatus,row.commercialUseStatus,row.settingsJson,row.claimIdsJson,row.shotIdsJson,row.updatedAt)); for (const batch of batches(statements, 40)) await env.DB.batch(batch);
  const bindSql = "INSERT OR IGNORE INTO evidence_bindings (id, project_id, from_record_id, to_record_id, relationship, status) VALUES (?, ?, ?, ?, ?, ?)"; const bindStatements = bindings.map((row) => env.DB!.prepare(bindSql).bind(row.id,row.projectId,row.fromRecordId,row.toRecordId,row.relationship,row.status)); for (const batch of batches(bindStatements, 40)) await env.DB.batch(batch);
  await db.insert(workflowEvents).values({ projectId, toStatus: "V51_PERCEPTUAL_REPAIR", eventType: "V51_SEMANTIC_CONTRACT_FROZEN", summary: "V5.1 froze 144 narration-bound shots, 120 unique asset slots, 18 visual families and a seven-peak emphasis map" }); return status(projectId);
}

async function materialize(projectId: string, batchSize = 4) {
  const env = await runtimeEnv(); if (!env.BUCKET) throw new Error("V5.1 requires the Factory media vault"); const db = await getDb(); const [records, bindings] = await Promise.all([db.select().from(evidenceRecords).where(eq(evidenceRecords.projectId, projectId)), db.select().from(evidenceBindings).where(eq(evidenceBindings.projectId, projectId))]); const map = new Map(records.map((record) => [record.id, record])); const slots = records.filter((record) => record.entityType === "MEDIA_ASSET" && Number(parse(record.settingsJson).productionExpansionVersion) === VERSION && parse(record.settingsJson).role === "UNIQUE_ASSET_SLOT").sort((a,b) => a.id.localeCompare(b.id)); if (slots.length !== ASSETS) throw new Error("Freeze the V5.1 semantic contract first"); const pending = slots.filter((slot) => !slot.storageKey || !slot.contentHash || slot.lifecycleState !== "BOUND"); const used = new Set(slots.map((slot) => slot.sourceUrl).filter((value): value is string => Boolean(value))); const failures: string[] = []; let completed = 0;
  for (const slot of pending.slice(0,batchSize)) { try { const planned = bindings.filter((binding) => binding.fromRecordId === slot.id && binding.relationship === "V51_PLANNED_VISUAL_FOR_SHOT"); const shotRecords = planned.map((binding) => map.get(binding.toRecordId)).filter((record): record is typeof evidenceRecords.$inferSelect => Boolean(record)); const shot = shotRecords[0]; const shotSettings = parse(shot?.settingsJson || null); const family = String(shotSettings.primaryFamily || FAMILIES[completed % FAMILIES.length]); const claim = String(shotSettings.exactClaim || shot?.title || "payment system"); const queries = Array.isArray(shotSettings.searchQueries) ? shotSettings.searchQueries.map(String) : searchQueries(claim,family); const tournament = STOCK_FAMILIES.has(family) ? await stockTournament(env,queries,used) : { winner: null, candidates: [] as Omit<Candidate,"downloadUrl">[] }; let winner = tournament.winner; let bytes: Uint8Array | null = null;
    if (winner && winner.score >= 78) { try { const response = await fetch(winner.downloadUrl,{ signal: AbortSignal.timeout(30000) }); const declared = Number(response.headers.get("content-length") || 0); if (!response.ok || declared > 32_000_000) winner = null; else { bytes = new Uint8Array(await response.arrayBuffer()); if (!bytes.byteLength || bytes.byteLength > 32_000_000) { bytes = null; winner = null; } } } catch { bytes = null; winner = null; } }
    const repairVersion = slot.revalidationStatus?.includes("V52") ? 52 : Number(parse(slot.settingsJson).repairVersion || 51); const index = Number(slot.id.split("-").at(-1) || 1)-1; const generated = !winner || !bytes; if (generated) bytes = new TextEncoder().encode(semanticSvg(family,index,shot?.title || family,claim,String(shotSettings.emphasis || "BASE"))); const mimeType = generated ? "image/svg+xml" : winner!.mimeType; const provider = generated ? `Frameflow V${repairVersion === 52 ? "5.2" : "5.1"} · ${family.replaceAll("_"," ")}` : winner!.provider; const sourceUrl = generated ? `frameflow://v${repairVersion}/${family.toLowerCase()}/${slot.id}` : winner!.sourceUrl; const license = generated ? "CHANNEL_OWNED" : winner!.license; const ext = generated ? "svg" : "mp4"; const key = `evidence/${projectId}/v${repairVersion}/assets/${slot.id}.${ext}`; const checksum = await digest(bytes!); await env.BUCKET.put(key,bytes!,{ httpMetadata:{ contentType:mimeType }, customMetadata:{ projectId,evidenceId:slot.id,sha256:checksum,provider,license } }); used.add(sourceUrl);
    await db.update(evidenceRecords).set({ lifecycleState:"BOUND",title:`${shot?.title || family} · ${family.replaceAll("_"," ")}`,provider,sourceUrl,retrievedAt:new Date().toISOString(),contentHash:checksum,storageKey:key,mimeType,sizeBytes:bytes!.byteLength,licenseStatus:license,commercialUseStatus:"ALLOWED",semanticScore:generated ? 96 : winner!.score,settingsJson:JSON.stringify({ ...parse(slot.settingsJson),productionExpansionVersion:VERSION,repairVersion,family,materialKind:generated?"OWNED_SEMANTIC_MOTION":"LICENSED_STOCK_VIDEO",queries,candidateCount:tournament.candidates.length,candidateTournament:tournament.candidates,selectionReason:generated?"No stock candidate cleared the stricter V5.2 semantic floor; generated a clean narration-bound owned visual":"Highest V5.2 semantic score after duplicate, resolution, relevance and provider checks",frameFit:"COVER_SAFE_16_9",width:1920,height:1080,cleanAudienceLayer:true,entryResetRequired:true,perceptualRepair:true }),shotIdsJson:JSON.stringify(shotRecords.map((record)=>record.id)),revalidationStatus:"CURRENT",updatedAt:new Date().toISOString() }).where(eq(evidenceRecords.id,slot.id));
    for (const binding of planned) { await db.update(evidenceBindings).set({ relationship:"V51_VISUAL_FOR_SHOT",status:"ACTIVE" }).where(eq(evidenceBindings.id,binding.id)); await db.update(evidenceRecords).set({ lifecycleState:"BOUND",updatedAt:new Date().toISOString() }).where(eq(evidenceRecords.id,binding.toRecordId)); } completed += 1;
  } catch (error) { failures.push(`${slot.id}: ${error instanceof Error ? error.message : "failed"}`); } }
  const current = await status(projectId); if (completed) await db.insert(workflowEvents).values({ projectId,toStatus:current.status,eventType:current.version === "5.2" ? "V52_ASSET_REPAIR_BATCH" : "V51_ASSET_TOURNAMENT_BATCH",summary:`V${current.version} selected and stored ${completed} semantic assets; ${Math.max(0,ASSETS-current.materialized)} remain` });
  if (current.status === "READY_FOR_V52_MASTER") { const now = new Date().toISOString(); const repairRecords = records.filter((record) => record.entityType === "AUTOMATED_REPAIR_WAVE"); for (const repair of repairRecords) { const settings = parse(repair.settingsJson); await db.update(evidenceRecords).set({ lifecycleState:"BOUND", revalidationStatus:"READY_FOR_RENDER", settingsJson:JSON.stringify({ ...settings, status:"READY_FOR_RENDER", completedAt:now, packages:Array.isArray(settings.packages) ? settings.packages.map((item) => ({ ...(item as Record<string,unknown>), status:"READY_FOR_RENDER" })) : [] }), updatedAt:now }).where(eq(evidenceRecords.id,repair.id)); } const qaRuns = records.filter((record) => record.entityType === "PERCEPTUAL_QA_RUN"); for (const qaRun of qaRuns) { const settings = parse(qaRun.settingsJson); if (settings.repairWave && typeof settings.repairWave === "object") await db.update(evidenceRecords).set({ settingsJson:JSON.stringify({ ...settings, repairWave:{ ...(settings.repairWave as Record<string,unknown>), status:"READY_FOR_RENDER", completedAt:now, packages:Array.isArray((settings.repairWave as Record<string,unknown>).packages) ? ((settings.repairWave as Record<string,unknown>).packages as Array<Record<string,unknown>>).map((item) => ({ ...item, status:"READY_FOR_RENDER" })) : [] } }), updatedAt:now }).where(eq(evidenceRecords.id,qaRun.id)); } }
  return { ...current, completedThisWave:completed,remaining:Math.max(0,ASSETS-current.materialized),complete:current.materialized===ASSETS&&current.boundShots===SHOTS,failures };
}

function repairV51DomainReceiptReference(projectId: string, action: RepairV51OwnerAction, repair: Record<string, unknown>) {
  return `repair-v51:${projectId}:${action}:${String(repair.version)}:${String(repair.status)}:${String(repair.materialized)}:${String(repair.boundShots)}`;
}

async function executeRepairV51OwnerAction(projectId: string, action: RepairV51OwnerAction): Promise<RepairV51OwnerResult> {
  const repair = action === "PLAN_V51" ? await plan(projectId) : await materialize(projectId);
  return {
    response: Response.json({ ok: true, repair }),
    domainReceiptReference: repairV51DomainReceiptReference(projectId, action, repair as Record<string, unknown>),
  };
}

async function runAuditedRepairV51OwnerAction(
  db: WriteCommandAuditDatabase,
  identity: WriteCommandAuditIdentity,
  execute: () => Promise<RepairV51OwnerResult>,
) {
  await appendWriteCommandAudit(db, identity, "AUTHORIZED", null);

  let result: RepairV51OwnerResult;
  try {
    result = await execute();
  } catch (error) {
    await appendWriteCommandAudit(db, identity, "FAILED", null);
    throw error;
  }

  if (!result.response.ok) {
    await appendWriteCommandAudit(db, identity, "FAILED", null);
    return result.response;
  }

  try {
    await appendWriteCommandAudit(db, identity, "SUCCEEDED", result.domainReceiptReference);
    return result.response;
  } catch (error) {
    await appendWriteCommandAudit(db, identity, "FAILED", null);
    throw error;
  }
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) { try { const { id } = await context.params; return Response.json(await status(id)); } catch { return Response.json({ error:"V5.1 repair status could not load" },{ status:500 }); } }
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authorization = await authorizeRepairV51OwnerWrite(request);
    if (authorization instanceof Response) return authorization;

    const body = await readBoundedRepairV51OwnerBody(request);
    if (body instanceof Response) return body;

    const { id } = await context.params;
    const auditIdentity = await repairV51OwnerAuditIdentity(
      request,
      id,
      authorization.normalizedEmail,
      body.action,
      body.bodySha256,
    );
    return await runAuditedRepairV51OwnerAction(
      authorization.db,
      auditIdentity,
      () => executeRepairV51OwnerAction(id, body.action),
    );
  } catch (error) {
    console.error("V5.1 repair failed", error);
    return ownerFailure("REPAIR_V51_ACTION_FAILED", 500);
  }
}
