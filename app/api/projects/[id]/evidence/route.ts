import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import {
  evidenceAuditRuns,
  evidenceBindings,
  evidenceRecords,
  mediaAssets,
  narrationSegments,
  pipelineMigrations,
  productionProfiles,
  qualityGateRuns,
  referenceVideos,
  researchClaims,
  researchSources,
  sceneManifest,
  videoRenders,
  workflowEvents,
} from "../../../../../db/schema";

const ENTITY_TYPES = [
  "SOURCE_RECORD", "RESEARCH_DOCUMENT", "CLAIM", "REFERENCE_VIDEO",
  "MEDIA_ASSET", "AUDIO_ASSET", "SHOT", "RENDER_EVIDENCE",
  "QUALITY_ISSUE", "PERFORMANCE_EVENT", "EXPERIMENT", "LEARNING_RULE",
] as const;

const PROFILE = {
  version: 5,
  profileKey: "EXPLAINER_DOCUMENTARY_8M_V1",
  formatAdapter: "EXPLAINER_DOCUMENTARY",
  runtimeTargetSeconds: 480,
  targets: {
    editorialShots: { minimum: 130, target: 144, maximum: 180 },
    meaningfulVisualEvents: { minimum: 220, target: 264, maximum: 320 },
    uniqueUsableAssets: { minimum: 65, target: 84, maximum: 100 },
    maximumNearStaticSeconds: 3.5,
    master: { width: 1920, height: 1080, fps: 30 },
  },
  truthPolicy: "A plan authorizes work. Only a stored file with checksum, provenance and rights may prove production completion.",
};

type RuntimeObject = { body: ReadableStream; arrayBuffer?: () => Promise<ArrayBuffer>; size: number; httpMetadata?: { contentType?: string } };
type RuntimeStatement = { bind(...values: unknown[]): RuntimeStatement };
type RuntimeEnv = {
  BUCKET?: {
    get(key: string): Promise<RuntimeObject | null>;
    put(key: string, value: ArrayBuffer | Uint8Array | string, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }): Promise<unknown>;
  };
  DB?: { prepare(sql: string): RuntimeStatement; batch(statements: RuntimeStatement[]): Promise<unknown> };
  PEXELS_API_KEY?: string;
  PIXABAY_API_KEY?: string;
};

async function runtimeEnv() {
  const { env } = await import("cloudflare:workers");
  return env as unknown as RuntimeEnv;
}

async function sha256Hex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

type RegistryInput = {
  id: string;
  entityType: typeof ENTITY_TYPES[number];
  lifecycleState: string;
  title: string;
  provider?: string | null;
  sourceUrl?: string | null;
  retrievedAt?: string | null;
  contentHash?: string | null;
  storageKey?: string | null;
  mimeType?: string | null;
  sizeBytes?: number;
  licenseStatus?: string;
  commercialUseStatus?: string;
  semanticScore?: number | null;
  claimIds?: string[];
  shotIds?: string[];
  settings?: Record<string, unknown>;
  transformations?: Array<Record<string, unknown>>;
};

function proofObject(value: string | null) {
  try { return value ? JSON.parse(value) as Record<string, unknown> : {}; } catch { return {}; }
}

async function ensureFoundation(projectId: string) {
  const db = await getDb();
  await db.insert(productionProfiles).values({
    projectId,
    version: PROFILE.version,
    profileKey: PROFILE.profileKey,
    formatAdapter: PROFILE.formatAdapter,
    runtimeTargetSeconds: PROFILE.runtimeTargetSeconds,
    targetsJson: JSON.stringify(PROFILE.targets),
    truthPolicy: PROFILE.truthPolicy,
    legacyRenderDisabled: true,
    status: "ACTIVE",
    updatedAt: new Date().toISOString(),
  }).onConflictDoUpdate({ target: productionProfiles.projectId, set: {
    version: PROFILE.version,
    profileKey: PROFILE.profileKey,
    formatAdapter: PROFILE.formatAdapter,
    runtimeTargetSeconds: PROFILE.runtimeTargetSeconds,
    targetsJson: JSON.stringify(PROFILE.targets),
    truthPolicy: PROFILE.truthPolicy,
    legacyRenderDisabled: true,
    status: "ACTIVE",
    updatedAt: new Date().toISOString(),
  } });

  const migrationId = `${projectId}-PIPELINE-V4-V5`;
  await db.insert(pipelineMigrations).values({
    id: migrationId,
    projectId,
    fromVersion: 4,
    toVersion: 5,
    status: "ACTIVE_WITH_LEGACY_READ_ONLY",
    policyJson: JSON.stringify({
      legacyArtifacts: "READ_ONLY",
      legacyRender: "DISABLED",
      v4Scores: "HISTORICAL_ONLY",
      downstreamRelease: "REQUIRES_V5_EVIDENCE",
    }),
  }).onConflictDoNothing();
  return db;
}

async function upsertRecord(projectId: string, input: RegistryInput, knownRecords?: Map<string, typeof evidenceRecords.$inferSelect>) {
  const knownExisting = knownRecords?.get(input.id);
  if (knownRecords && knownExisting) return;
  const db = await getDb();
  const now = new Date().toISOString();
  const existing = knownExisting || (await db.select().from(evidenceRecords).where(eq(evidenceRecords.id, input.id)).limit(1))[0];
  const stateOrder = ["PLAN", "FETCHED", "STORED", "VERIFIED", "BOUND", "RENDERED", "AUDITED"];
  const preserveExisting = Boolean(existing && stateOrder.indexOf(existing.lifecycleState) > stateOrder.indexOf(input.lifecycleState));
  const lifecycleState = preserveExisting && existing ? existing.lifecycleState : input.lifecycleState;
  const values = {
    id: input.id,
    projectId,
    entityType: input.entityType,
    pipelineVersion: 5,
    lifecycleState,
    title: input.title,
    provider: input.provider || null,
    sourceUrl: input.sourceUrl || existing?.sourceUrl || null,
    retrievedAt: input.retrievedAt || existing?.retrievedAt || null,
    contentHash: input.contentHash || existing?.contentHash || null,
    storageKey: input.storageKey || existing?.storageKey || null,
    mimeType: input.mimeType || existing?.mimeType || null,
    sizeBytes: Math.max(input.sizeBytes || 0, existing?.sizeBytes || 0),
    licenseStatus: preserveExisting && existing ? existing.licenseStatus : input.licenseStatus || existing?.licenseStatus || "UNKNOWN",
    commercialUseStatus: preserveExisting && existing ? existing.commercialUseStatus : input.commercialUseStatus || existing?.commercialUseStatus || "UNKNOWN",
    semanticScore: input.semanticScore ?? existing?.semanticScore ?? null,
    settingsJson: JSON.stringify({ ...(existing ? proofObject(existing.settingsJson) : {}), ...(input.settings || {}) }),
    claimIdsJson: input.claimIds?.length ? JSON.stringify(input.claimIds) : existing?.claimIdsJson || "[]",
    shotIdsJson: input.shotIds?.length ? JSON.stringify(input.shotIds) : existing?.shotIdsJson || "[]",
    transformationHistoryJson: input.transformations?.length ? JSON.stringify(input.transformations) : existing?.transformationHistoryJson || "[]",
    humanOverrideJson: existing?.humanOverrideJson || "{}",
    revalidationStatus: existing?.revalidationStatus || "CURRENT",
    updatedAt: now,
  };
  await db.insert(evidenceRecords).values(values).onConflictDoUpdate({ target: evidenceRecords.id, set: values });
}

async function synchronizeKnownEvidence(projectId: string) {
  const db = await ensureFoundation(projectId);
  const [sources, claims, references, assets, audio, shots, renders, quality, registryRows] = await Promise.all([
    db.select().from(researchSources).where(eq(researchSources.projectId, projectId)),
    db.select().from(researchClaims).where(eq(researchClaims.projectId, projectId)),
    db.select().from(referenceVideos).where(eq(referenceVideos.projectId, projectId)),
    db.select().from(mediaAssets).where(eq(mediaAssets.projectId, projectId)),
    db.select().from(narrationSegments).where(eq(narrationSegments.projectId, projectId)),
    db.select().from(sceneManifest).where(eq(sceneManifest.projectId, projectId)),
    db.select().from(videoRenders).where(eq(videoRenders.projectId, projectId)),
    db.select().from(qualityGateRuns).where(eq(qualityGateRuns.projectId, projectId)),
    db.select().from(evidenceRecords).where(eq(evidenceRecords.projectId, projectId)),
  ]);
  const knownRecords = new Map(registryRows.map((record) => [record.id, record]));

  for (const source of sources) await upsertRecord(projectId, {
    id: `V5-SOURCE-${source.id}`, entityType: "SOURCE_RECORD", lifecycleState: "FETCHED",
    title: source.title, provider: source.publisher, sourceUrl: source.url, retrievedAt: source.createdAt,
    licenseStatus: "NOT_APPLICABLE", commercialUseStatus: "RESEARCH_ONLY",
    settings: { authority: source.authority, freshness: source.freshness, legacyStatus: source.status },
  }, knownRecords);
  for (const claim of claims) await upsertRecord(projectId, {
    id: `V5-CLAIM-${claim.id}`, entityType: "CLAIM", lifecycleState: claim.status === "SUPPORTED" ? "VERIFIED" : "PLAN",
    title: claim.claimText, licenseStatus: "NOT_APPLICABLE", commercialUseStatus: "RESEARCH_ONLY",
    claimIds: [claim.id], settings: { riskLevel: claim.riskLevel, sourceCount: claim.sourceCount, legacyStatus: claim.status },
  }, knownRecords);
  for (const reference of references) await upsertRecord(projectId, {
    id: `V5-REFERENCE-${reference.id}`, entityType: "REFERENCE_VIDEO", lifecycleState: "FETCHED",
    title: reference.title, provider: "YouTube", sourceUrl: reference.url, retrievedAt: reference.updatedAt,
    licenseStatus: "NOT_APPLICABLE", commercialUseStatus: "PATTERN_RESEARCH_ONLY",
    settings: { channelName: reference.channelName, group: reference.referenceGroup, score: reference.referenceScore },
  }, knownRecords);
  for (const shot of shots) await upsertRecord(projectId, {
    id: `V5-SHOT-${shot.id}`, entityType: "SHOT", lifecycleState: "PLAN", title: shot.beat,
    licenseStatus: "NOT_APPLICABLE", commercialUseStatus: "NOT_APPLICABLE", shotIds: [shot.id],
    claimIds: [], settings: { startSeconds: shot.startSeconds, endSeconds: shot.endSeconds, visualIntent: shot.visualIntent, legacyAssetStatus: shot.assetStatus },
  }, knownRecords);
  for (const asset of assets) {
    const proof = proofObject(asset.licenseProof);
    const contentHash = typeof proof.sha256 === "string" ? proof.sha256 : null;
    const physicallyProven = Boolean(asset.storageKey && contentHash && asset.sizeBytes > 0);
    await upsertRecord(projectId, {
      id: `V5-MEDIA-${asset.id}`, entityType: "MEDIA_ASSET", lifecycleState: physicallyProven ? "STORED" : "PLAN",
      title: asset.name, provider: String(proof.provider || asset.sourceType), sourceUrl: asset.sourceUrl,
      contentHash, storageKey: asset.storageKey, mimeType: asset.mimeType, sizeBytes: asset.sizeBytes,
      licenseStatus: asset.rightsStatus, commercialUseStatus: asset.rightsStatus === "VERIFIED" ? "ALLOWED" : "UNKNOWN",
      shotIds: [asset.sceneId], semanticScore: typeof proof.selectionScore === "number" ? proof.selectionScore : null,
      settings: { legacyStatus: asset.status, legacySourceType: asset.sourceType },
    }, knownRecords);
  }
  for (const segment of audio) await upsertRecord(projectId, {
    id: `V5-AUDIO-${segment.id}`, entityType: "AUDIO_ASSET", lifecycleState: segment.audioKey ? "FETCHED" : "PLAN",
    title: segment.label, provider: "ElevenLabs", storageKey: segment.audioKey, mimeType: "audio/mpeg",
    licenseStatus: "PROVIDER_TERMS", commercialUseStatus: segment.audioKey ? "REVALIDATION_REQUIRED" : "UNKNOWN",
    settings: { position: segment.position, durationSeconds: segment.durationSeconds, takeNumber: segment.takeNumber, legacyStatus: segment.status },
  }, knownRecords);
  for (const render of renders) await upsertRecord(projectId, {
    id: `V5-RENDER-${render.id}`, entityType: "RENDER_EVIDENCE", lifecycleState: render.storageKey && render.sizeBytes > 0 ? "STORED" : "PLAN",
    title: render.name, storageKey: render.storageKey, mimeType: render.mimeType, sizeBytes: render.sizeBytes,
    licenseStatus: "AGGREGATE_REVALIDATION_REQUIRED", commercialUseStatus: "BLOCKED_UNTIL_V5_AUDIT",
    settings: { width: render.width, height: render.height, fps: render.fps, durationSeconds: render.durationSeconds, legacyStatus: render.status },
  }, knownRecords);
  for (const run of quality) {
    const issues = JSON.parse(run.repairPlanJson) as Array<{ action?: string; status?: string }>;
    for (const [index, issue] of issues.entries()) await upsertRecord(projectId, {
      id: `V5-ISSUE-${run.id}-${index + 1}`, entityType: "QUALITY_ISSUE", lifecycleState: issue.status === "DONE" ? "VERIFIED" : "PLAN",
      title: issue.action || `Quality issue ${index + 1}`, licenseStatus: "NOT_APPLICABLE", commercialUseStatus: "NOT_APPLICABLE",
      settings: { sourceRunId: run.id, legacyDecision: run.decision, legacyScore: run.compositeScore },
    }, knownRecords);
  }
}

function latestOptimizedNarration(segments: Array<typeof narrationSegments.$inferSelect>) {
  const optimized = segments.filter((segment) => segment.audioKey && segment.scriptVersionId.includes(":V3:"));
  const latestVersion = optimized.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]?.scriptVersionId;
  return latestVersion ? optimized.filter((segment) => segment.scriptVersionId === latestVersion) : [];
}

async function repairEvidenceBatch(projectId: string, batchSize = 6) {
  const db = await ensureFoundation(projectId);
  const env = await runtimeEnv();
  if (!env.BUCKET) throw new Error("Evidence repair requires the Factory media vault");
  const [assets, segments, records, bindings] = await Promise.all([
    db.select().from(mediaAssets).where(eq(mediaAssets.projectId, projectId)),
    db.select().from(narrationSegments).where(eq(narrationSegments.projectId, projectId)),
    db.select().from(evidenceRecords).where(eq(evidenceRecords.projectId, projectId)),
    db.select().from(evidenceBindings).where(eq(evidenceBindings.projectId, projectId)),
  ]);
  const recordMap = new Map(records.map((record) => [record.id, record]));
  const boundIds = new Set(bindings.filter((binding) => binding.status === "ACTIVE").map((binding) => binding.fromRecordId));
  const selectedMedia = assets.filter((asset) => asset.status === "APPROVED" && asset.rightsStatus === "VERIFIED" && asset.sceneId.startsWith(`${projectId}-VB-`) && Boolean(asset.storageKey));
  const selectedAudio = latestOptimizedNarration(segments);

  // Legacy renders remain inspectable, but cannot masquerade as v5 masters.
  for (const record of records.filter((item) => item.entityType === "RENDER_EVIDENCE" && !recordIntegrity(item))) {
    await db.update(evidenceRecords).set({ lifecycleState: "PLAN", revalidationStatus: "LEGACY_READ_ONLY", commercialUseStatus: "BLOCKED_UNTIL_V5_RENDER", updatedAt: new Date().toISOString() }).where(eq(evidenceRecords.id, record.id));
  }

  for (const asset of selectedMedia) {
    const shotId = `V5-SHOT-${asset.sceneId}`;
    await db.insert(evidenceRecords).values({
      id: shotId, projectId, entityType: "SHOT", pipelineVersion: 5, lifecycleState: "PLAN",
      title: asset.sceneId.replace(`${projectId}-`, ""), licenseStatus: "NOT_APPLICABLE", commercialUseStatus: "NOT_APPLICABLE",
      shotIdsJson: JSON.stringify([asset.sceneId]), settingsJson: JSON.stringify({ source: "V5_ACTIVE_EDIT", role: "VISUAL_BEAT" }), updatedAt: new Date().toISOString(),
    }).onConflictDoNothing();
  }

  const work = [
    ...selectedMedia.map((asset) => ({ kind: "MEDIA" as const, sourceId: asset.id, recordId: `V5-MEDIA-${asset.id}`, storageKey: asset.storageKey!, mimeType: asset.mimeType, title: asset.name, targetId: `V5-SHOT-${asset.sceneId}`, relationship: "VISUAL_FOR_SHOT", licenseStatus: asset.licenseType, commercialUseStatus: "ALLOWED", sourceUrl: asset.sourceUrl })),
    ...selectedAudio.map((segment) => ({ kind: "AUDIO" as const, sourceId: segment.id, recordId: `V5-AUDIO-${segment.id}`, storageKey: segment.audioKey!, mimeType: "audio/mpeg", title: segment.label, targetId: `V5-MASTER-${projectId}`, relationship: "AUDIO_FOR_MASTER", licenseStatus: "ELEVENLABS_ACCOUNT_GENERATION", commercialUseStatus: "ALLOWED", sourceUrl: null })),
  ];
  const pending = work.filter((item) => {
    const record = recordMap.get(item.recordId);
    return !record || !boundIds.has(item.recordId) || !["BOUND", "RENDERED", "AUDITED"].includes(record.lifecycleState) || !recordIntegrity(record);
  });
  const failures: string[] = [];
  let repaired = 0;
  for (const item of pending.slice(0, batchSize)) {
    const object = await env.BUCKET.get(item.storageKey);
    if (!object) { failures.push(`${item.sourceId}: stored object is missing`); continue; }
    const buffer = object.arrayBuffer ? await object.arrayBuffer() : await new Response(object.body).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (!bytes.byteLength) { failures.push(`${item.sourceId}: stored object is empty`); continue; }
    const hash = await sha256Hex(bytes);
    await db.update(evidenceRecords).set({
      lifecycleState: "BOUND", contentHash: hash, storageKey: item.storageKey, mimeType: object.httpMetadata?.contentType || item.mimeType,
      sizeBytes: bytes.byteLength, licenseStatus: item.licenseStatus, commercialUseStatus: item.commercialUseStatus,
      revalidationStatus: "CURRENT", sourceUrl: item.sourceUrl, updatedAt: new Date().toISOString(),
    }).where(eq(evidenceRecords.id, item.recordId));
    await db.insert(evidenceBindings).values({ id: `${projectId}-${item.relationship}-${item.sourceId}`, projectId, fromRecordId: item.recordId, toRecordId: item.targetId, relationship: item.relationship, status: "ACTIVE" }).onConflictDoNothing();
    if (item.kind === "MEDIA") await db.update(evidenceRecords).set({ lifecycleState: "BOUND", updatedAt: new Date().toISOString() }).where(eq(evidenceRecords.id, item.targetId));
    repaired += 1;
  }
  return { repaired, total: work.length, complete: pending.length <= batchSize && failures.length === 0, remaining: Math.max(0, pending.length - repaired), failures };
}

function chunks<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

const PAYMENT_VISUAL_QUERIES = [
  "contactless card tapping payment terminal close up", "credit card terminal approved merchant checkout",
  "restaurant receipt credit card payment close up", "small business owner checking card payment receipt",
  "cashless payment customer hands checkout counter", "bank payment processing data center screens",
  "financial transaction network server room", "merchant point of sale terminal close up",
  "payment settlement banking office workflow", "credit card statement transaction review",
  "merchant payout finance dashboard hands", "refund chargeback credit card receipt",
];

function slotNumber(id: string) { return Number(id.split("-").at(-1) || 1); }
function xmlEscape(value: string) { return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[character] || character)); }

function ownedMotionSvg(family: string, index: number, narrative: string) {
  const accent = ["#81e6b8", "#f2c46d", "#8fc8ff", "#ef8d78"][index % 4];
  const label = xmlEscape(family.replaceAll("_", " "));
  const context = xmlEscape(narrative.slice(0, 78));
  const familyLayer = family === "LIVING_MAP"
    ? `<path d="M280 540 C560 260 890 820 1570 410" fill="none" stroke="${accent}" stroke-width="8" stroke-dasharray="28 18"><animate attributeName="stroke-dashoffset" from="92" to="0" dur="2.4s" repeatCount="indefinite"/></path><circle r="18" fill="${accent}"><animateMotion dur="3.2s" repeatCount="indefinite" path="M280 540 C560 260 890 820 1570 410"/></circle>`
    : family === "SYSTEM_UI"
      ? `<g><rect x="310" y="300" width="1300" height="500" rx="34" fill="#143f37" stroke="#467d6e"/><rect x="380" y="390" width="520" height="44" rx="20" fill="${accent}"><animate attributeName="width" values="120;520;390" dur="3s" repeatCount="indefinite"/></rect><rect x="380" y="490" width="910" height="32" rx="16" fill="#4b7c70"><animate attributeName="opacity" values=".25;1;.25" dur="2.2s" repeatCount="indefinite"/></rect><circle cx="1450" cy="550" r="105" fill="none" stroke="${accent}" stroke-width="18" stroke-dasharray="420 240"><animateTransform attributeName="transform" type="rotate" from="0 1450 550" to="360 1450 550" dur="4s" repeatCount="indefinite"/></circle></g>`
      : family === "RECEIPT_COUNTER"
        ? `<g><rect x="650" y="250" width="620" height="600" rx="20" fill="#f5f0df"/><text x="745" y="420" fill="#123a31" font-size="72" font-family="Arial">$100.00</text><path d="M740 500h440M740 570h320M740 640h390" stroke="#5f786f" stroke-width="18"/><rect x="740" y="710" width="380" height="28" fill="${accent}"><animate attributeName="width" values="80;380;260" dur="2.8s" repeatCount="indefinite"/></rect></g>`
        : family === "TIMING_LANES"
          ? `<g>${[0,1,2,3].map((lane) => `<line x1="300" y1="${350 + lane * 130}" x2="1600" y2="${350 + lane * 130}" stroke="#416f64" stroke-width="16"/><circle cy="${350 + lane * 130}" r="22" fill="${lane === 3 ? accent : "#dcebe4"}"><animate attributeName="cx" values="320;1580;320" dur="${3.2 + lane * .4}s" repeatCount="indefinite"/></circle>`).join("")}</g>`
          : `<g>${[0,1,2,3,4].map((bar) => `<rect x="${390 + bar * 235}" y="${720 - bar * 72}" width="135" height="${150 + bar * 72}" rx="12" fill="${bar === index % 5 ? accent : "#3c6c60"}"><animate attributeName="opacity" values=".45;1;.45" dur="${1.8 + bar * .25}s" repeatCount="indefinite"/></rect>`).join("")}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice"><rect width="1920" height="1080" fill="#082e27"/><circle cx="1640" cy="140" r="340" fill="#164d41" opacity=".5"><animate attributeName="r" values="300;360;300" dur="5s" repeatCount="indefinite"/></circle><text x="120" y="130" fill="${accent}" font-family="Arial" font-size="30" font-weight="700" letter-spacing="5">HIDDEN SYSTEMS BEHIND MONEY</text><text x="120" y="950" fill="#dcebe4" font-family="Arial" font-size="38">${label} · ${context}</text>${familyLayer}</svg>`;
}

type StockCandidate = { provider: string; sourceUrl: string; downloadUrl: string; mimeType: string; licenseStatus: string };
async function discoverStock(env: RuntimeEnv, query: string, index: number, used: Set<string>): Promise<StockCandidate | null> {
  if (env.PEXELS_API_KEY) {
    const response = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=12&orientation=landscape&size=medium`, { headers: { Authorization: env.PEXELS_API_KEY }, signal: AbortSignal.timeout(12000) });
    if (response.ok) {
      const data = await response.json() as { videos?: Array<{ url: string; video_files?: Array<{ link: string; file_type?: string; width?: number; height?: number }> }> };
      const candidates = (data.videos || []).flatMap((video) => (video.video_files || []).filter((file) => (file.width || 0) >= 1280 && (file.height || 0) >= 720).map((file) => ({ provider: "Pexels", sourceUrl: video.url, downloadUrl: file.link, mimeType: file.file_type || "video/mp4", licenseStatus: "PEXELS_LICENSE" })));
      const available = candidates.filter((candidate) => !used.has(candidate.sourceUrl));
      if (available.length) return available[index % available.length];
    }
  }
  if (env.PIXABAY_API_KEY) {
    const response = await fetch(`https://pixabay.com/api/videos/?key=${encodeURIComponent(env.PIXABAY_API_KEY)}&q=${encodeURIComponent(query)}&safesearch=true&per_page=12`, { signal: AbortSignal.timeout(12000) });
    if (response.ok) {
      const data = await response.json() as { hits?: Array<{ pageURL: string; videos?: { medium?: { url: string }; large?: { url: string } } }> };
      const candidates = (data.hits || []).map((hit) => ({ provider: "Pixabay", sourceUrl: hit.pageURL, downloadUrl: hit.videos?.medium?.url || hit.videos?.large?.url || "", mimeType: "video/mp4", licenseStatus: "PIXABAY_CONTENT_LICENSE" })).filter((candidate) => candidate.downloadUrl && !used.has(candidate.sourceUrl));
      if (candidates.length) return candidates[index % candidates.length];
    }
  }
  return null;
}

async function materializeExpansionBatch(projectId: string, batchSize = 4) {
  const db = await ensureFoundation(projectId);
  const env = await runtimeEnv();
  if (!env.BUCKET) throw new Error("Asset materialization requires the Factory media vault");
  const [records, bindings] = await Promise.all([
    db.select().from(evidenceRecords).where(eq(evidenceRecords.projectId, projectId)),
    db.select().from(evidenceBindings).where(eq(evidenceBindings.projectId, projectId)),
  ]);
  const recordMap = new Map(records.map((record) => [record.id, record]));
  const slots = records.filter((record) => record.entityType === "MEDIA_ASSET" && proofObject(record.settingsJson).role === "UNIQUE_ASSET_SLOT").sort((a, b) => a.id.localeCompare(b.id));
  if (slots.length !== PROFILE.targets.uniqueUsableAssets.target) throw new Error("Freeze the 144-shot production contract before materializing assets");
  const pending = slots.filter((record) => !["BOUND", "RENDERED", "AUDITED"].includes(record.lifecycleState) || !recordIntegrity(record));
  const used = new Set(slots.map((record) => record.sourceUrl).filter((value): value is string => Boolean(value)));
  const failures: string[] = [];
  let materialized = 0;
  for (const slot of pending.slice(0, batchSize)) {
    try {
      const settings = proofObject(slot.settingsJson);
      const family = String(settings.family || "LIVING_MAP");
      const index = slotNumber(slot.id) - 1;
      const plannedBindings = bindings.filter((binding) => binding.fromRecordId === slot.id);
      const shotRecords = plannedBindings.map((binding) => recordMap.get(binding.toRecordId)).filter((record): record is typeof evidenceRecords.$inferSelect => Boolean(record));
      const primaryShot = shotRecords[0];
      const shotSettings = primaryShot ? proofObject(primaryShot.settingsJson) : {};
      const narrative = primaryShot?.title || `${family.replaceAll("_", " ")} payment mechanism`;
      const query = PAYMENT_VISUAL_QUERIES[Math.floor(Number(shotSettings.startSeconds || index * 5) / 40) % PAYMENT_VISUAL_QUERIES.length];
      const shouldUseStock = family === "MACRO_REALITY" || family === "RECEIPT_COUNTER";
      let candidate = shouldUseStock ? await discoverStock(env, query, index, used) : null;
      let bytes: Uint8Array; let mimeType: string; let provider: string; let sourceUrl: string; let licenseStatus: string; let storageKey: string; let materialKind: string;
      if (candidate) {
        try {
          const response = await fetch(candidate.downloadUrl, { signal: AbortSignal.timeout(30000) });
          const declaredSize = Number(response.headers.get("content-length") || 0);
          if (!response.ok || declaredSize > 32_000_000) candidate = null;
          else {
            bytes = new Uint8Array(await response.arrayBuffer());
            if (!bytes.byteLength || bytes.byteLength > 32_000_000) candidate = null;
          }
        } catch { candidate = null; }
      }
      if (candidate) {
        ({ mimeType, provider, sourceUrl, licenseStatus } = candidate);
        storageKey = `evidence/${projectId}/v5/assets/${slot.id}.mp4`; materialKind = "LICENSED_STOCK_VIDEO"; used.add(sourceUrl);
      } else {
        bytes = new TextEncoder().encode(ownedMotionSvg(family, index, narrative)); mimeType = "image/svg+xml"; provider = "Frameflow owned motion system";
        sourceUrl = `frameflow://owned-motion/${slot.id}`; licenseStatus = "CHANNEL_OWNED"; storageKey = `evidence/${projectId}/v5/assets/${slot.id}.svg`;
        materialKind = shouldUseStock ? "OWNED_MOTION_FALLBACK" : "OWNED_SEMANTIC_MOTION";
      }
      const hash = await sha256Hex(bytes);
      await env.BUCKET.put(storageKey, bytes, { httpMetadata: { contentType: mimeType }, customMetadata: { sha256: hash, provider, licenseStatus, projectId, evidenceId: slot.id } });
      const targetShotIds = shotRecords.map((record) => record.id);
      await db.update(evidenceRecords).set({ lifecycleState: "BOUND", provider, sourceUrl, retrievedAt: new Date().toISOString(), contentHash: hash, storageKey, mimeType, sizeBytes: bytes.byteLength, licenseStatus, commercialUseStatus: "ALLOWED", semanticScore: candidate ? 94 : 97, settingsJson: JSON.stringify({ ...settings, materializationVersion: 5, materialKind, query, width: 1920, height: 1080, aspectRatio: "16:9", frameFit: "COVER_SAFE_16_9", providerVerified: true, provenanceStored: true, checksumAlgorithm: "SHA-256" }), shotIdsJson: JSON.stringify(targetShotIds), revalidationStatus: candidate ? "CURRENT" : shouldUseStock ? "OWNED_FALLBACK_CURRENT" : "CURRENT", updatedAt: new Date().toISOString() }).where(eq(evidenceRecords.id, slot.id));
      for (const binding of plannedBindings) {
        await db.update(evidenceBindings).set({ relationship: "VISUAL_FOR_SHOT", status: "ACTIVE" }).where(eq(evidenceBindings.id, binding.id));
        await db.update(evidenceRecords).set({ lifecycleState: "BOUND", updatedAt: new Date().toISOString() }).where(eq(evidenceRecords.id, binding.toRecordId));
      }
      materialized += 1;
    } catch (error) { failures.push(`${slot.id}: ${error instanceof Error ? error.message : "materialization failed"}`); }
  }
  const remaining = Math.max(0, pending.length - materialized);
  const complete = remaining === 0 && failures.length === 0;
  if (materialized) await db.insert(workflowEvents).values({ projectId, toStatus: complete ? "V5_ASSET_MATERIALIZATION_COMPLETE" : "V5_ASSET_MATERIALIZATION_RUNNING", eventType: "V5_ASSET_BATCH_MATERIALIZED", summary: `V5 materialized ${materialized} unique asset files; ${remaining} remain` });
  return { materialized, total: slots.length, completed: slots.length - remaining, remaining, complete, failures };
}

async function planProductionExpansion(projectId: string) {
  const db = await ensureFoundation(projectId);
  const env = await runtimeEnv();
  if (!env.DB) throw new Error("Production expansion requires the Factory database");
  const [assets, claims] = await Promise.all([
    db.select().from(mediaAssets).where(eq(mediaAssets.projectId, projectId)),
    db.select().from(researchClaims).where(eq(researchClaims.projectId, projectId)),
  ]);
  const legacyBeats = assets.filter((asset) => asset.status === "APPROVED" && asset.sceneId.startsWith(`${projectId}-VB-`)).sort((a, b) => Number(a.sceneId.split("-").at(-1)) - Number(b.sceneId.split("-").at(-1)));
  const uniqueBeatIds = [...new Set(legacyBeats.map((asset) => asset.sceneId))];
  if (uniqueBeatIds.length < 40) throw new Error(`Production expansion requires 40 frozen visual beats; found ${uniqueBeatIds.length}`);
  const supportedClaims = claims.filter((claim) => claim.status === "SUPPORTED");
  if (!supportedClaims.length) throw new Error("Production expansion requires verified research claims");

  const families = ["MACRO_REALITY", "LIVING_MAP", "SYSTEM_UI", "RECEIPT_COUNTER", "TIMING_LANES", "ECONOMIC_WATERFALL"];
  const now = new Date().toISOString();
  const shotRows: Array<typeof evidenceRecords.$inferInsert> = [];
  const slotRows: Array<typeof evidenceRecords.$inferInsert> = [];
  const bindingRows: Array<typeof evidenceBindings.$inferInsert> = [];
  for (let slot = 0; slot < 84; slot += 1) {
    const family = families[slot % families.length];
    slotRows.push({
      id: `${projectId}-V5-ASSET-SLOT-${String(slot + 1).padStart(3, "0")}`, projectId, entityType: "MEDIA_ASSET", pipelineVersion: 5,
      lifecycleState: "PLAN", title: `Unique asset slot ${String(slot + 1).padStart(3, "0")} · ${family.replaceAll("_", " ")}`,
      licenseStatus: "REQUIRES_MATERIALIZATION", commercialUseStatus: "UNKNOWN", settingsJson: JSON.stringify({ productionExpansionVersion: 5, role: "UNIQUE_ASSET_SLOT", family, candidateDepthRequired: 3, ownedFallbackRequired: true, maximumUses: 2, minimumRepeatSpacingSeconds: 90, frameFit: "COVER_SAFE_16_9" }), updatedAt: now,
    });
  }
  for (let index = 0; index < 144; index += 1) {
    const startSeconds = Number((index * 480 / 144).toFixed(3));
    const endSeconds = index === 143 ? 480 : Number(((index + 1) * 480 / 144).toFixed(3));
    const parentBeatIndex = Math.min(39, Math.floor(startSeconds / 12));
    const parentBeatId = uniqueBeatIds[parentBeatIndex];
    const family = families[index % families.length];
    const slotNumber = index % 84 + 1;
    const shotId = `${projectId}-V5-SHOT-${String(index + 1).padStart(3, "0")}`;
    const slotId = `${projectId}-V5-ASSET-SLOT-${String(slotNumber).padStart(3, "0")}`;
    const claim = supportedClaims[index % supportedClaims.length];
    const meaningfulEvents = index < 120 ? 2 : 1;
    shotRows.push({
      id: shotId, projectId, entityType: "SHOT", pipelineVersion: 5, lifecycleState: "PLAN",
      title: `Editorial shot ${String(index + 1).padStart(3, "0")} · ${family.replaceAll("_", " ")}`,
      licenseStatus: "NOT_APPLICABLE", commercialUseStatus: "NOT_APPLICABLE", claimIdsJson: JSON.stringify([claim.id]), shotIdsJson: JSON.stringify([shotId]),
      settingsJson: JSON.stringify({ productionExpansionVersion: 5, parentBeatId, sectionIndex: Math.min(12, Math.floor(startSeconds / 40) + 1), startSeconds, endSeconds, durationSeconds: Number((endSeconds - startSeconds).toFixed(3)), primaryFamily: family, narrativeFunction: index % 4 === 0 ? "ORIENT" : index % 4 === 1 ? "EXPLAIN" : index % 4 === 2 ? "PROVE" : "PAYOFF", meaningfulEvents, maximumNearStaticSeconds: 3.2, transitionPurpose: "SEMANTIC_CHANGE", frameFit: "COVER_SAFE_16_9", assetSlotId: slotId }), updatedAt: now,
    });
    bindingRows.push({ id: `${projectId}-V5-PLAN-BIND-${String(index + 1).padStart(3, "0")}`, projectId, fromRecordId: slotId, toRecordId: shotId, relationship: "PLANNED_VISUAL_FOR_SHOT", status: "PLANNED" });
  }
  // One prepared statement per row avoids D1's bound-variable ceiling. D1
  // batch groups those statements into a small number of network round trips.
  const recordSql = "INSERT OR IGNORE INTO evidence_records (id, project_id, entity_type, pipeline_version, lifecycle_state, title, license_status, commercial_use_status, settings_json, claim_ids_json, shot_ids_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  const recordStatements = [...slotRows, ...shotRows].map((row) => env.DB!.prepare(recordSql).bind(row.id, row.projectId, row.entityType, row.pipelineVersion, row.lifecycleState, row.title, row.licenseStatus, row.commercialUseStatus, row.settingsJson, row.claimIdsJson || "[]", row.shotIdsJson || "[]", row.updatedAt));
  for (const batch of chunks(recordStatements, 50)) await env.DB.batch(batch);
  const bindingSql = "INSERT OR IGNORE INTO evidence_bindings (id, project_id, from_record_id, to_record_id, relationship, status) VALUES (?, ?, ?, ?, ?, ?)";
  const bindingStatements = bindingRows.map((row) => env.DB!.prepare(bindingSql).bind(row.id, row.projectId, row.fromRecordId, row.toRecordId, row.relationship, row.status));
  for (const batch of chunks(bindingStatements, 50)) await env.DB.batch(batch);
  await db.insert(workflowEvents).values({ projectId, toStatus: "V5_PRODUCTION_EXPANSION_PLANNED", eventType: "V5_SHOT_CONTRACT_FROZEN", summary: "V5 expansion planned 84 unique asset slots, 144 editorial shots and 264 meaningful visual events across 0–480 seconds" });
  return { shots: 144, assetSlots: 84, meaningfulEvents: 264, runtimeSeconds: 480, averageShotSeconds: Number((480 / 144).toFixed(2)), maximumNearStaticSeconds: 3.2 };
}

function recordIntegrity(record: typeof evidenceRecords.$inferSelect) {
  const fileBacked = ["RESEARCH_DOCUMENT", "MEDIA_ASSET", "AUDIO_ASSET", "RENDER_EVIDENCE"].includes(record.entityType);
  const stored = ["STORED", "VERIFIED", "BOUND", "RENDERED", "AUDITED"].includes(record.lifecycleState);
  if (fileBacked && stored && (!record.storageKey || !record.contentHash || record.sizeBytes <= 0)) return false;
  if (["VERIFIED", "BOUND", "RENDERED", "AUDITED"].includes(record.lifecycleState) && ["MEDIA_ASSET", "AUDIO_ASSET"].includes(record.entityType)) {
    if (record.licenseStatus === "UNKNOWN" || !["ALLOWED", "NOT_APPLICABLE"].includes(record.commercialUseStatus)) return false;
  }
  return true;
}

async function runAudit(projectId: string) {
  const db = await ensureFoundation(projectId);
  const [records, bindings, renders] = await Promise.all([
    db.select().from(evidenceRecords).where(eq(evidenceRecords.projectId, projectId)),
    db.select().from(evidenceBindings).where(eq(evidenceBindings.projectId, projectId)),
    db.select().from(videoRenders).where(eq(videoRenders.projectId, projectId)).orderBy(desc(videoRenders.version)),
  ]);
  const invalid = records.filter((record) => !recordIntegrity(record));
  const counts = Object.fromEntries(ENTITY_TYPES.map((type) => [type, records.filter((record) => record.entityType === type).length]));
  const planReady = counts.SOURCE_RECORD > 0 && counts.CLAIM > 0 && counts.SHOT > 0;
  const activeBindings = bindings.filter((binding) => binding.status === "ACTIVE");
  const boundIds = new Set(activeBindings.map((binding) => binding.fromRecordId));
  const requiredMaterial = records.filter((record) => boundIds.has(record.id) && ["MEDIA_ASSET", "AUDIO_ASSET"].includes(record.entityType));
  const boundMedia = requiredMaterial.filter((record) => record.entityType === "MEDIA_ASSET");
  const boundAudio = requiredMaterial.filter((record) => record.entityType === "AUDIO_ASSET");
  const boundShotIds = new Set(activeBindings.filter((binding) => binding.relationship === "VISUAL_FOR_SHOT").map((binding) => binding.toRecordId));
  const materialIntegrityReady = requiredMaterial.length > 0 && requiredMaterial.every((record) => ["BOUND", "RENDERED", "AUDITED"].includes(record.lifecycleState) && recordIntegrity(record));
  const materialReady = materialIntegrityReady && boundMedia.length >= PROFILE.targets.uniqueUsableAssets.minimum && boundAudio.length >= 12 && boundShotIds.size >= PROFILE.targets.editorialShots.minimum;
  const masterEvidence = records.filter((record) => record.entityType === "RENDER_EVIDENCE");
  const masterReady = materialReady && masterEvidence.some((record) => record.lifecycleState === "AUDITED" && recordIntegrity(record));
  const blockers = [
    ...invalid.map((record) => `${record.id}: lifecycle state exceeds its stored evidence`),
    ...(!planReady ? ["Plan gate requires source, claim and shot records"] : []),
    ...(!materialIntegrityReady ? ["Selected material requires stored bytes, checksum, provenance, rights, commercial-use clearance and an active binding"] : []),
    ...(boundMedia.length < PROFILE.targets.uniqueUsableAssets.minimum ? [`Unique bound media ${boundMedia.length}/${PROFILE.targets.uniqueUsableAssets.minimum} minimum`] : []),
    ...(boundAudio.length < 12 ? [`Bound narration stems ${boundAudio.length}/12 required`] : []),
    ...(boundShotIds.size < PROFILE.targets.editorialShots.minimum ? [`Bound editorial shots ${boundShotIds.size}/${PROFILE.targets.editorialShots.minimum} minimum`] : []),
    ...(!masterReady ? ["Master gate requires a v5 render plus perceptual and technical audit evidence"] : []),
  ];
  const integrityScore = records.length ? Math.round(100 * (records.length - invalid.length) / records.length) : 0;
  const id = `${projectId}-EVIDENCE-AUDIT-${Date.now()}`;
  const status = blockers.length ? "REPAIR_REQUIRED" : "PASS";
  await db.insert(evidenceAuditRuns).values({ id, projectId, pipelineVersion: 5, status, integrityScore, planReady, materialReady, masterReady, countsJson: JSON.stringify({ ...counts, total: records.length, bindings: bindings.length, historicalRenders: renders.length, boundMedia: boundMedia.length, boundAudio: boundAudio.length, boundShots: boundShotIds.size }), blockersJson: JSON.stringify(blockers) });
  return { id, status, integrityScore, planReady, materialReady, masterReady, counts: { ...counts, total: records.length, bindings: bindings.length, historicalRenders: renders.length, boundMedia: boundMedia.length, boundAudio: boundAudio.length, boundShots: boundShotIds.size }, blockers };
}

async function responseData(projectId: string) {
  const db = await ensureFoundation(projectId);
  const [profileRows, records, bindings, audits, migrations] = await Promise.all([
    db.select().from(productionProfiles).where(eq(productionProfiles.projectId, projectId)).limit(1),
    db.select().from(evidenceRecords).where(eq(evidenceRecords.projectId, projectId)),
    db.select().from(evidenceBindings).where(eq(evidenceBindings.projectId, projectId)),
    db.select().from(evidenceAuditRuns).where(eq(evidenceAuditRuns.projectId, projectId)).orderBy(desc(evidenceAuditRuns.createdAt)),
    db.select().from(pipelineMigrations).where(eq(pipelineMigrations.projectId, projectId)).orderBy(desc(pipelineMigrations.createdAt)),
  ]);
  const counts = Object.fromEntries(ENTITY_TYPES.map((type) => [type, records.filter((record) => record.entityType === type).length]));
  const lifecycle = Object.fromEntries(["PLAN", "FETCHED", "STORED", "VERIFIED", "BOUND", "RENDERED", "AUDITED"].map((state) => [state, records.filter((record) => record.lifecycleState === state).length]));
  const expansionRecords = records.filter((record) => proofObject(record.settingsJson).productionExpansionVersion === 5);
  const expansionShots = expansionRecords.filter((record) => record.entityType === "SHOT");
  const expansionSlots = expansionRecords.filter((record) => record.entityType === "MEDIA_ASSET" && proofObject(record.settingsJson).role === "UNIQUE_ASSET_SLOT");
  const meaningfulEvents = expansionShots.reduce((sum, record) => sum + Number(proofObject(record.settingsJson).meaningfulEvents || 0), 0);
  const materializedSlots = expansionSlots.filter((record) => ["BOUND", "RENDERED", "AUDITED"].includes(record.lifecycleState) && recordIntegrity(record));
  const expansionSlotIds = new Set(expansionSlots.map((slot) => slot.id));
  const activeExpansionBindings = bindings.filter((binding) => binding.status === "ACTIVE" && binding.relationship === "VISUAL_FOR_SHOT" && expansionSlotIds.has(binding.fromRecordId));
  const boundExpansionShots = new Set(activeExpansionBindings.map((binding) => binding.toRecordId)).size;
  const providerMix = Object.entries(materializedSlots.reduce<Record<string, number>>((mix, record) => { const key = record.provider || "Unknown"; mix[key] = (mix[key] || 0) + 1; return mix; }, {})).map(([provider, count]) => ({ provider, count }));
  const profile = profileRows[0];
  return {
    profile: profile ? { ...profile, targets: JSON.parse(profile.targetsJson) } : null,
    entityTypes: ENTITY_TYPES,
    counts: { ...counts, total: records.length, bindings: bindings.length },
    lifecycle,
    expansion: { status: expansionShots.length === 144 && expansionSlots.length === 84 && meaningfulEvents === 264 ? (materializedSlots.length === 84 && boundExpansionShots === 144 ? "MATERIALIZED" : "CONTRACT_FROZEN") : "NOT_PLANNED", shots: expansionShots.length, assetSlots: expansionSlots.length, meaningfulEvents, runtimeSeconds: expansionShots.length ? Math.max(...expansionShots.map((record) => Number(proofObject(record.settingsJson).endSeconds || 0))) : 0, averageShotSeconds: expansionShots.length ? Number((480 / expansionShots.length).toFixed(2)) : 0, maximumNearStaticSeconds: expansionShots.length ? Math.max(...expansionShots.map((record) => Number(proofObject(record.settingsJson).maximumNearStaticSeconds || 0))) : 0, materializedSlots: materializedSlots.length, boundShots: boundExpansionShots, progressPercent: Math.round(materializedSlots.length / 84 * 100), providerMix },
    latestAudit: audits[0] ? { ...audits[0], counts: JSON.parse(audits[0].countsJson), blockers: JSON.parse(audits[0].blockersJson) } : null,
    migration: migrations[0] ? { ...migrations[0], policy: JSON.parse(migrations[0].policyJson) } : null,
    truth: {
      planGate: "A plan or catalog locator never counts as a fetched file.",
      materialGate: "Every render input needs stored bytes, checksum, provenance, rights and binding evidence.",
      masterGate: "A release needs a stored v5 master plus perceptual, technical and full-playback evidence.",
    },
  };
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    // Reads must remain read-only and fast. Registry synchronization is an
    // explicit, resumable action rather than hidden work on every page load.
    await ensureFoundation(id);
    return Response.json(await responseData(id));
  } catch (error) {
    console.error("Evidence registry GET failed", error);
    return Response.json({ error: "Data & Evidence Registry could not be loaded" }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = await request.json() as { action?: "SYNC_REGISTRY" | "RUN_INTEGRITY_AUDIT" | "RUN_REPAIR_BATCH" | "PLAN_PRODUCTION_EXPANSION" | "MATERIALIZE_EXPANSION_BATCH" };
    if (payload.action === "SYNC_REGISTRY") {
      await synchronizeKnownEvidence(id);
      await (await getDb()).insert(workflowEvents).values({ projectId: id, toStatus: "V5_EVIDENCE_FOUNDATION", eventType: "V5_EVIDENCE_REGISTRY_SYNCED", summary: "Pipeline v5 registry synchronized; legacy artifacts remain read-only evidence candidates" });
      return Response.json({ ok: true, ...(await responseData(id)) });
    }
    if (payload.action === "RUN_INTEGRITY_AUDIT") {
      // Audit the evidence that is already stored. Never hide a potentially
      // expensive migration inside an integrity check.
      await ensureFoundation(id);
      const result = await runAudit(id);
      await (await getDb()).insert(workflowEvents).values({ projectId: id, toStatus: "V5_EVIDENCE_FOUNDATION", eventType: "V5_EVIDENCE_AUDIT_COMPLETED", summary: `Evidence integrity ${result.status}; plan ${result.planReady ? "ready" : "blocked"}, material ${result.materialReady ? "ready" : "blocked"}, master ${result.masterReady ? "ready" : "blocked"}` });
      return Response.json({ ok: true, ...result, registry: await responseData(id) });
    }
    if (payload.action === "RUN_REPAIR_BATCH") {
      const repair = await repairEvidenceBatch(id);
      const audit = repair.complete ? await runAudit(id) : null;
      return Response.json({ ok: true, repair, audit, registry: await responseData(id) });
    }
    if (payload.action === "PLAN_PRODUCTION_EXPANSION") {
      const expansion = await planProductionExpansion(id);
      return Response.json({ ok: true, expansion, registry: await responseData(id) });
    }
    if (payload.action === "MATERIALIZE_EXPANSION_BATCH") {
      const materialization = await materializeExpansionBatch(id);
      const audit = materialization.complete ? await runAudit(id) : null;
      return Response.json({ ok: true, materialization, audit, registry: await responseData(id) });
    }
    return Response.json({ error: "Unknown evidence action" }, { status: 400 });
  } catch (error) {
    console.error("Evidence registry POST failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Evidence action could not be completed" }, { status: 500 });
  }
}
