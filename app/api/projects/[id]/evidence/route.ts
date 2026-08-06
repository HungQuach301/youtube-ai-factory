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
  const requiredMaterial = records.filter((record) => ["MEDIA_ASSET", "AUDIO_ASSET"].includes(record.entityType));
  const materialReady = requiredMaterial.length > 0 && requiredMaterial.every((record) => ["VERIFIED", "BOUND", "RENDERED", "AUDITED"].includes(record.lifecycleState) && recordIntegrity(record));
  const masterEvidence = records.filter((record) => record.entityType === "RENDER_EVIDENCE");
  const masterReady = materialReady && masterEvidence.some((record) => record.lifecycleState === "AUDITED" && recordIntegrity(record));
  const blockers = [
    ...invalid.map((record) => `${record.id}: lifecycle state exceeds its stored evidence`),
    ...(!planReady ? ["Plan gate requires source, claim and shot records"] : []),
    ...(!materialReady ? ["Material gate requires every used media/audio file to have bytes, checksum, provenance, rights and commercial-use clearance"] : []),
    ...(!masterReady ? ["Master gate requires a v5 render plus perceptual and technical audit evidence"] : []),
  ];
  const integrityScore = records.length ? Math.round(100 * (records.length - invalid.length) / records.length) : 0;
  const id = `${projectId}-EVIDENCE-AUDIT-${Date.now()}`;
  await db.insert(evidenceAuditRuns).values({ id, projectId, pipelineVersion: 5, status: invalid.length ? "REPAIR_REQUIRED" : "PASS", integrityScore, planReady, materialReady, masterReady, countsJson: JSON.stringify({ ...counts, total: records.length, bindings: bindings.length, historicalRenders: renders.length }), blockersJson: JSON.stringify(blockers) });
  return { id, status: invalid.length ? "REPAIR_REQUIRED" : "PASS", integrityScore, planReady, materialReady, masterReady, counts: { ...counts, total: records.length, bindings: bindings.length, historicalRenders: renders.length }, blockers };
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
  const profile = profileRows[0];
  return {
    profile: profile ? { ...profile, targets: JSON.parse(profile.targetsJson) } : null,
    entityTypes: ENTITY_TYPES,
    counts: { ...counts, total: records.length, bindings: bindings.length },
    lifecycle,
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
    const payload = await request.json() as { action?: "SYNC_REGISTRY" | "RUN_INTEGRITY_AUDIT" };
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
    return Response.json({ error: "Unknown evidence action" }, { status: 400 });
  } catch (error) {
    console.error("Evidence registry POST failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Evidence action could not be completed" }, { status: 500 });
  }
}
