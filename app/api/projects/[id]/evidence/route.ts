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
  BUCKET?: { get(key: string): Promise<RuntimeObject | null> };
  DB?: { prepare(sql: string): RuntimeStatement; batch(statements: RuntimeStatement[]): Promise<unknown> };
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
  const profile = profileRows[0];
  return {
    profile: profile ? { ...profile, targets: JSON.parse(profile.targetsJson) } : null,
    entityTypes: ENTITY_TYPES,
    counts: { ...counts, total: records.length, bindings: bindings.length },
    lifecycle,
    expansion: { status: expansionShots.length === 144 && expansionSlots.length === 84 && meaningfulEvents === 264 ? "CONTRACT_FROZEN" : "NOT_PLANNED", shots: expansionShots.length, assetSlots: expansionSlots.length, meaningfulEvents, runtimeSeconds: expansionShots.length ? Math.max(...expansionShots.map((record) => Number(proofObject(record.settingsJson).endSeconds || 0))) : 0, averageShotSeconds: expansionShots.length ? Number((480 / expansionShots.length).toFixed(2)) : 0, maximumNearStaticSeconds: expansionShots.length ? Math.max(...expansionShots.map((record) => Number(proofObject(record.settingsJson).maximumNearStaticSeconds || 0))) : 0 },
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
    const payload = await request.json() as { action?: "SYNC_REGISTRY" | "RUN_INTEGRITY_AUDIT" | "RUN_REPAIR_BATCH" | "PLAN_PRODUCTION_EXPANSION" };
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
    return Response.json({ error: "Unknown evidence action" }, { status: 400 });
  } catch (error) {
    console.error("Evidence registry POST failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Evidence action could not be completed" }, { status: 500 });
  }
}
