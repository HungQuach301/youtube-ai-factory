import { canonicalHash, canonicalStringify, sha256Hex } from "@/lib/canonical-json";
import {
  FACTORY_NON_R22_CANARY_ENTRY_PNG_BASE64,
  FACTORY_NON_R22_CANARY_EXIT_PNG_BASE64,
  FACTORY_NON_R22_CANARY_FIXTURE_VERSION,
  FACTORY_NON_R22_CANARY_MIDPOINT_PNG_BASE64,
  FACTORY_NON_R22_CANARY_WEBM_BASE64,
} from "@/lib/factory-non-r22-canary-fixture";
import { persistFactoryProductionCompilation, type FactoryProductionCompilationInput } from "@/lib/factory-production-compiler";
import {
  materializeFactoryIntegratedCanary,
  verifyFactoryAssetEligibility,
  type FactoryAssetEligibilityInput,
  type FactoryIntegratedCanaryInput,
  type FactoryPixelVideoEnv,
} from "@/lib/factory-pixel-video-compositor";
import { materializeFactorySceneGraphRender } from "@/lib/factory-scene-graph-renderer";
import { createCanonicalTimebase } from "@/lib/factory-runtime-contracts";
import {
  FactoryRuntimeError,
  reconcileFactoryRuntimeOrphan,
  releaseFactoryRuntimeLease,
  reserveFactoryRuntimeWork,
  verifyFactoryRuntimeReplay,
  type FactoryRuntimeCommandInput,
  type FactoryRuntimeExecution,
} from "@/lib/factory-runtime-writer";

export const FACTORY_NON_R22_LIVE_CANARY_QUALIFICATION_VERSION = "FACTORY_NON_R22_LIVE_CANARY_QUALIFICATION_V1" as const;
export const FACTORY_NON_R22_LIVE_CANARY_QUALIFICATION_KEY = "factory:qualification:non-r22-live-canary:v1" as const;

type Row = Record<string, unknown>;

const VIDEO_ID = "qualification-live-canary-v1";
const RECOVERY_STREAM_ID = "qualification-live-canary-recovery-v1";
const PROFILE_ID = "visual-profile-live-canary-v1";
const FORMAT_ID = "series-format-live-canary-v1";
const TIMEBASE_ID = "timebase-live-canary-v1";
const PROVIDER_ID = "provider-live-canary-internal-v1";
const CAPABILITY_ID = "capability-live-canary-composition-v1";
const BINDING_ID = "binding-live-canary-composition-v1";
const QUALIFICATION_ID = "qualification-live-canary-composition-v1";
const RIGHTS_ID = "rights-live-canary-internal-v1";
const RENDER_WORKER_ID = "worker-live-canary-render-v1";
const COMPOSITOR_ID = "worker-live-canary-compositor-v1";
const REALITY_ASSET_ID = "asset-live-canary-reality-v1";
const PROOF_ASSET_ID = "asset-live-canary-proof-v1";
const HASH_A = "a".repeat(64), HASH_B = "b".repeat(64), HASH_C = "c".repeat(64), HASH_D = "d".repeat(64), HASH_E = "e".repeat(64), HASH_F = "f".repeat(64);
const REALITY_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#061b18"/><circle cx="80" cy="90" r="42" fill="#76e0bb"/><text x="145" y="96" fill="#ffffff" font-family="Arial" font-size="22">REALITY</text></svg>\n';
const PROOF_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#2a1c13"/><rect x="55" y="110" width="42" height="40" fill="#f1c56d"/><rect x="130" y="78" width="42" height="72" fill="#f1c56d"/><rect x="205" y="42" width="42" height="108" fill="#f1c56d"/><text x="70" y="28" fill="#ffffff" font-family="Arial" font-size="20">PROOF</text></svg>\n';

const clean = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);

async function first(env: FactoryPixelVideoEnv, query: string, ...values: unknown[]) {
  return env.DB.prepare(query).bind(...values).first<Row>();
}

function decodeBase64(value: string) {
  const binary = atob(value.replace(/\s+/g, ""));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function command(input: Omit<FactoryRuntimeCommandInput, "actorType" | "actorId" | "costScope" | "rightsScope" | "policyVersions">, actorId: string): FactoryRuntimeCommandInput {
  return {
    ...input,
    actorType: "OWNER",
    actorId,
    policyVersions: { runtime: "V1", visual: "V3", qualification: FACTORY_NON_R22_LIVE_CANARY_QUALIFICATION_VERSION },
    costScope: { mode: "ZERO_SPEND", maxProviderRequests: 0, maxSpendMicros: 0 },
    rightsScope: { policy: "RIGHTS_INTERNAL_V1", commercialUse: "ELIGIBLE" },
  };
}

function routeCandidate(archetype: string, route: "SOURCE" | "MAKE" | "HYBRID", treatmentFamily: string) {
  return {
    route, treatmentFamily, capabilityKey: "LIVE_CANARY_VISUAL_COMPOSITION", capabilityVersion: "V1", archetype,
    expectedOutputSchemaHash: HASH_E, requiredSettingsHash: HASH_F, standardVersion: "VISUAL_STANDARD_V3", rightsPolicyVersion: "RIGHTS_INTERNAL_V1",
    retentionPolicyVersion: "RETENTION_INTERNAL_V1", minimumSampleSize: 10, minimumFirstPassYield: 0.95, payloadBytes: 1024, requestedBindingId: BINDING_ID,
  };
}

function compilationInput(actorId: string): FactoryProductionCompilationInput {
  return {
    videoId: VIDEO_ID, version: 1, channelVisualProfileVersionId: PROFILE_ID, seriesFormatVersionId: FORMAT_ID, canonicalTimebaseId: TIMEBASE_ID,
    claimGraphHash: HASH_C, narrationHash: HASH_D, createdBy: actorId, idempotencyKey: "factory:live-canary:compilation:v1", evidenceHash: HASH_E,
    segments: [
      { id: "segment-live-reality", claimId: "claim-live-reality", startFrame: 0, endFrameExclusive: 600, visualJob: "REALITY_ANCHOR", routeCandidate: routeCandidate("DOCUMENTARY", "SOURCE", "DOCUMENTARY"), evidenceHashes: [HASH_A], assetArtifactVersionIds: [REALITY_ASSET_ID] },
      { id: "segment-live-mechanism", claimId: "claim-live-mechanism", startFrame: 600, endFrameExclusive: 1200, visualJob: "MECHANISM_EXPLANATION", routeCandidate: routeCandidate("MECHANISM", "MAKE", "DIAGRAM"), evidenceHashes: [HASH_B], objectContinuityKey: "live-object-flow" },
      { id: "segment-live-proof", claimId: "claim-live-proof", startFrame: 1200, endFrameExclusive: 1800, visualJob: "QUANTITATIVE_PROOF", routeCandidate: routeCandidate("QUANTITATIVE", "HYBRID", "CHART"), evidenceHashes: [HASH_C], datasetHash: HASH_D, assetArtifactVersionIds: [PROOF_ASSET_ID] },
    ],
  };
}

async function stageFixtureBytes(env: FactoryPixelVideoEnv) {
  const reality = new TextEncoder().encode(REALITY_SVG), proof = new TextEncoder().encode(PROOF_SVG), output = decodeBase64(FACTORY_NON_R22_CANARY_WEBM_BASE64);
  const sampleInputs = [
    { role: "ENTRY" as const, timestampMs: 0, bytes: decodeBase64(FACTORY_NON_R22_CANARY_ENTRY_PNG_BASE64) },
    { role: "MIDPOINT" as const, timestampMs: 30_000, bytes: decodeBase64(FACTORY_NON_R22_CANARY_MIDPOINT_PNG_BASE64) },
    { role: "EXIT" as const, timestampMs: 59_933, bytes: decodeBase64(FACTORY_NON_R22_CANARY_EXIT_PNG_BASE64) },
  ];
  const realityHash = await sha256Hex(reality), proofHash = await sha256Hex(proof), outputHash = await sha256Hex(output);
  if (realityHash !== "1897dbfb39850827bad5391c9ea4c53b02ee813c9289487e34ba739d15761fc4" || proofHash !== "23cc7b62ac10e571b8ef0521866222c1eb1b3be95bc65e7f949e1065f52e76a6" || outputHash !== "cb7ff0c35a03a21f6dd5ddb6b7c72c6056e35cfbf94e15559b32ceb5150adb21") {
    throw new FactoryRuntimeError("LIVE_CANARY_FIXTURE_HASH_MISMATCH", 503, "The tracked qualification fixture bytes do not match their frozen hashes");
  }
  const realityKey = `factory/qualification/assets/${realityHash}.svg`, proofKey = `factory/qualification/assets/${proofHash}.svg`, outputKey = `factory/qualification/canaries/${outputHash}.webm`;
  await Promise.all([
    env.BUCKET.put(realityKey, reality, { httpMetadata: { contentType: "image/svg+xml" } }),
    env.BUCKET.put(proofKey, proof, { httpMetadata: { contentType: "image/svg+xml" } }),
    env.BUCKET.put(outputKey, output, { httpMetadata: { contentType: "video/webm" } }),
  ]);
  const samples = [];
  for (const sample of sampleInputs) {
    const sha256 = await sha256Hex(sample.bytes), storageKey = `factory/qualification/canaries/samples/${sha256}.png`;
    await env.BUCKET.put(storageKey, sample.bytes, { httpMetadata: { contentType: "image/png" } });
    samples.push({ role: sample.role, storageKey, sha256, byteSize: sample.bytes.byteLength, timestampMs: sample.timestampMs, width: 320, height: 180 });
  }
  return { reality, proof, output, realityHash, proofHash, outputHash, realityKey, proofKey, outputKey, samples };
}

async function seedQualificationFoundation(env: FactoryPixelVideoEnv, actorId: string, fixture: Awaited<ReturnType<typeof stageFixtureBytes>>) {
  const timebase = createCanonicalTimebase({ frameRateNumerator: 30, frameRateDenominator: 1, audioSampleRateHz: 48_000, totalFrames: 1800 });
  await env.DB.batch([
    env.DB.prepare(`INSERT OR IGNORE INTO factory_canonical_timebases
      (id,video_id,contract_version,frame_rate_numerator,frame_rate_denominator,audio_sample_rate_hz,total_frames,total_audio_samples,rounding_policy,definition_hash)
      VALUES (?,?,'FACTORY_RUNTIME_CONTRACT_V1',?,?,?,?,?,?,?)`).bind(TIMEBASE_ID, VIDEO_ID, timebase.frameRateNumerator, timebase.frameRateDenominator, timebase.audioSampleRateHz, timebase.totalFrames, timebase.totalAudioSamples, timebase.roundingPolicy, HASH_A),
    env.DB.prepare(`INSERT OR IGNORE INTO factory_channel_visual_profile_versions
      (id,channel_id,version,policy_version,market,language,profile_json,input_hash,content_hash,lifecycle_state,created_by)
      VALUES (?,'channel-live-canary-qualification',1,'VISUAL_POLICY_V1','US','en-US',?,?,?,'FROZEN',?)`).bind(PROFILE_ID, canonicalStringify({ allowedRoutes: ["SOURCE", "MAKE", "HYBRID"], allowedTreatmentFamilies: ["DOCUMENTARY", "DIAGRAM", "CHART"], prohibitedPatterns: ["SLIDE_DECK"], maxConsecutiveTreatment: 2 }), HASH_A, HASH_B, actorId),
    env.DB.prepare(`INSERT OR IGNORE INTO factory_series_format_versions
      (id,channel_id,format_key,version,format_json,input_hash,content_hash,lifecycle_state,created_by)
      VALUES (?,'channel-live-canary-qualification','QUALIFICATION_EXPLAINER',1,?,?,?,'FROZEN',?)`).bind(FORMAT_ID, canonicalStringify({ prohibitedPatterns: ["REPEATED_TOPOLOGY"] }), HASH_B, HASH_C, actorId),
    env.DB.prepare(`INSERT OR IGNORE INTO factory_providers
      (id,provider_key,provider_version,connection_ref,lifecycle_state,health_state,metadata_json)
      VALUES (?,'INTERNAL_LIVE_CANARY_WORKER','V1',NULL,'ACTIVE','HEALTHY',?)`).bind(PROVIDER_ID, canonicalStringify({ fixtureVersion: FACTORY_NON_R22_CANARY_FIXTURE_VERSION, zeroDispatch: true })),
    env.DB.prepare(`INSERT OR IGNORE INTO factory_capabilities
      (id,capability_key,capability_version,plane,input_schema_hash,output_schema_hash,lifecycle_state)
      VALUES (?,'LIVE_CANARY_VISUAL_COMPOSITION','V1','PRODUCTION_MEDIA',?,?,'ACTIVE')`).bind(CAPABILITY_ID, HASH_D, HASH_E),
    env.DB.prepare(`INSERT OR IGNORE INTO factory_provider_bindings
      (id,provider_id,capability_id,binding_version,endpoint_or_model,model_version,input_schema_hash,output_schema_hash,settings_hash,rights_policy_version,retention_policy_version,rate_card_version,max_payload_bytes,timeout_ms,retry_ceiling,fallback_binding_id,priority,lifecycle_state)
      VALUES (?,?,?,'V1','internal:live-canary-compositor','V1',?,?,?,'RIGHTS_INTERNAL_V1','RETENTION_INTERNAL_V1','ZERO_COST_V1',8000000,300000,0,NULL,10,'ACTIVE')`).bind(BINDING_ID, PROVIDER_ID, CAPABILITY_ID, HASH_D, HASH_E, HASH_F),
    env.DB.prepare(`INSERT OR IGNORE INTO factory_capability_qualifications
      (id,binding_id,qualification_version,standard_version,qualified_archetypes_json,settings_hash,sample_size,first_pass_yield,p0_escape_count,evidence_hash,lifecycle_state,qualified_at,expires_at)
      VALUES (?,? ,1,'VISUAL_STANDARD_V3',?,?,24,1,0,?,'QUALIFIED','2026-08-25T00:00:00.000Z','2036-08-25T00:00:00.000Z')`).bind(QUALIFICATION_ID, BINDING_ID, canonicalStringify(["DOCUMENTARY", "MECHANISM", "QUANTITATIVE"]), HASH_F, fixture.outputHash),
    env.DB.prepare(`INSERT OR IGNORE INTO factory_rights_eligibility_receipts
      (id,binding_id,rights_policy_version,retention_policy_version,commercial_use_state,evidence_hash,valid_from,expires_at)
      VALUES (?,?,'RIGHTS_INTERNAL_V1','RETENTION_INTERNAL_V1','ELIGIBLE',?,'2026-08-25T00:00:00.000Z','2036-08-25T00:00:00.000Z')`).bind(RIGHTS_ID, BINDING_ID, fixture.outputHash),
    env.DB.prepare(`INSERT OR IGNORE INTO factory_render_worker_bindings
      (id,provider_binding_id,qualification_id,worker_key,worker_version,renderer_version,input_schema_hash,output_schema_hash,settings_hash,max_frames_per_job,lifecycle_state,evidence_hash)
      VALUES (?,?,?,'LIVE_CANARY_SCENE_RENDERER','V1','FACTORY_SCENE_GRAPH_RENDERER_V1',?,?,?,3000,'ACTIVE',?)`).bind(RENDER_WORKER_ID, BINDING_ID, QUALIFICATION_ID, HASH_D, HASH_E, HASH_F, fixture.outputHash),
    env.DB.prepare(`INSERT OR IGNORE INTO factory_pixel_compositor_bindings
      (id,provider_binding_id,qualification_id,worker_key,worker_version,compositor_version,encoder_version,input_schema_hash,output_schema_hash,settings_hash,output_mime_type,output_codec,max_frames_per_job,lifecycle_state,evidence_hash)
      VALUES (?,?,?,'LIVE_CANARY_PIXEL_COMPOSITOR','V1','FACTORY_PIXEL_VIDEO_COMPOSITOR_V1','FFMPEG_LIBVPX_VP9_BITEXACT_V1',?,?,?,'video/webm','vp9',3000,'ACTIVE',?)`).bind(COMPOSITOR_ID, BINDING_ID, QUALIFICATION_ID, HASH_D, HASH_E, HASH_F, fixture.outputHash),
    env.DB.prepare(`INSERT OR IGNORE INTO factory_artifact_versions
      (id,artifact_id,version,artifact_kind,source_entity_type,source_entity_id,content_hash,storage_key,mime_type,byte_size,lineage_json,lifecycle_state)
      VALUES (?,'artifact:live-canary-reality',1,'SOURCE_MEDIA','SOURCE_ASSET','source-live-canary-reality',?,?, 'image/svg+xml',?,?,'MATERIALIZED')`).bind(REALITY_ASSET_ID, fixture.realityHash, fixture.realityKey, fixture.reality.byteLength, canonicalStringify({ fixtureVersion: FACTORY_NON_R22_CANARY_FIXTURE_VERSION, route: "SOURCE" })),
    env.DB.prepare(`INSERT OR IGNORE INTO factory_artifact_versions
      (id,artifact_id,version,artifact_kind,source_entity_type,source_entity_id,content_hash,storage_key,mime_type,byte_size,lineage_json,lifecycle_state)
      VALUES (?,'artifact:live-canary-proof',1,'SOURCE_MEDIA','SOURCE_ASSET','source-live-canary-proof',?,?, 'image/svg+xml',?,?,'MATERIALIZED')`).bind(PROOF_ASSET_ID, fixture.proofHash, fixture.proofKey, fixture.proof.byteLength, canonicalStringify({ fixtureVersion: FACTORY_NON_R22_CANARY_FIXTURE_VERSION, route: "HYBRID" })),
  ]);
  const [timebaseRow, compositorRow, realityRow, proofRow] = await Promise.all([
    first(env, "SELECT * FROM factory_canonical_timebases WHERE id=?", TIMEBASE_ID),
    first(env, "SELECT * FROM factory_pixel_compositor_bindings WHERE id=?", COMPOSITOR_ID),
    first(env, "SELECT * FROM factory_artifact_versions WHERE id=?", REALITY_ASSET_ID),
    first(env, "SELECT * FROM factory_artifact_versions WHERE id=?", PROOF_ASSET_ID),
  ]);
  if (!timebaseRow || !compositorRow || clean(realityRow?.content_hash) !== fixture.realityHash || clean(proofRow?.content_hash) !== fixture.proofHash) {
    throw new FactoryRuntimeError("LIVE_CANARY_FOUNDATION_RECONCILIATION_FAILED", 503, "The live qualification foundation did not reconcile to exact seeded identities and bytes");
  }
}

async function verifyStoredBytes(env: FactoryPixelVideoEnv, key: string, expectedHash: string, expectedSize: number) {
  const object = await env.BUCKET.get(key);
  if (!object) throw new FactoryRuntimeError("LIVE_CANARY_R2_READBACK_MISSING", 503, "The qualification output is missing from active storage");
  const bytes = new Uint8Array(await object.arrayBuffer()), hash = await sha256Hex(bytes);
  if (hash !== expectedHash || bytes.byteLength !== expectedSize) throw new FactoryRuntimeError("LIVE_CANARY_R2_READBACK_MISMATCH", 503, "The qualification output read-back does not match its exact receipt");
}

export async function runFactoryNonR22LiveCanaryQualification(env: FactoryPixelVideoEnv, actorId: string, execution?: FactoryRuntimeExecution) {
  if (!actorId || actorId.length > 200) throw new FactoryRuntimeError("LIVE_CANARY_ACTOR_INVALID", 400, "A bounded authenticated owner identity is required");
  const prior = await first(env, "SELECT * FROM factory_live_canary_qualification_receipts WHERE qualification_key=?", FACTORY_NON_R22_LIVE_CANARY_QUALIFICATION_KEY);
  if (prior) {
    const job = await first(env, "SELECT * FROM factory_video_composition_jobs WHERE id=?", prior.composition_job_id);
    if (!job) throw new FactoryRuntimeError("LIVE_CANARY_RECEIPT_LINEAGE_MISSING", 503, "The qualification receipt lost its composition-job lineage");
    await verifyStoredBytes(env, clean(job.storage_key), clean(prior.output_hash), number(job.byte_size));
    return { outcome: "IDEMPOTENT_REPLAY" as const, qualificationReceiptId: clean(prior.id), videoId: VIDEO_ID, recoveryStreamId: RECOVERY_STREAM_ID, outputHash: clean(prior.output_hash), verificationState: clean(prior.verification_state), providerRequests: 0, spendMicros: 0 };
  }

  const fixture = await stageFixtureBytes(env);
  await seedQualificationFoundation(env, actorId, fixture);
  const reserve = await reserveFactoryRuntimeWork(env.DB, {
    streamType: "VIDEO", streamId: VIDEO_ID, stageKey: "NON_R22_LIVE_CANARY", expectedState: "READY", expectedVersion: 0, actorType: "OWNER", actorId,
    idempotencyKey: "factory:live-canary:lease:v1", intentHash: HASH_A, evidenceHash: fixture.outputHash,
  }, execution);
  const compilation = compilationInput(actorId);
  const compileCommand = command({
    streamType: "VIDEO", streamId: VIDEO_ID, commandType: "PRODUCE_ARTIFACT", expectedState: "WorkReserved", expectedVersion: 1,
    leaseId: reserve.leaseId, fencingToken: reserve.fencingToken, idempotencyKey: "factory:live-canary:compile-command:v1", intentHash: await canonicalHash(compilation),
    payload: { artifactKind: "PRODUCTION_PLAN_BUNDLE", providerRequests: 0, spendUsd: 0 }, evidenceHash: HASH_E,
  }, actorId);
  const compiled = await persistFactoryProductionCompilation(env.DB, compilation, compileCommand, execution);
  const renderInput = { videoId: VIDEO_ID, sceneGraphId: compiled.sceneGraphId, workerBindingId: RENDER_WORKER_ID, frameStart: 0, frameEndExclusive: 1800, width: 320, height: 180, idempotencyKey: "factory:live-canary:scene-render:v1", evidenceHash: HASH_F };
  const renderCommand = command({
    streamType: "VIDEO", streamId: VIDEO_ID, commandType: "PRODUCE_ARTIFACT", expectedState: "ArtifactMaterialized", expectedVersion: 3,
    leaseId: reserve.leaseId, fencingToken: reserve.fencingToken, idempotencyKey: "factory:live-canary:render-command:v1", intentHash: await canonicalHash(renderInput),
    payload: { artifactKind: "SCENE_RENDER_TAPE", providerRequests: 0, spendUsd: 0 }, evidenceHash: HASH_F,
  }, actorId);
  const rendered = await materializeFactorySceneGraphRender(env, renderInput, renderCommand, execution);
  const assetInputs: FactoryAssetEligibilityInput[] = [
    { videoId: VIDEO_ID, artifactVersionId: REALITY_ASSET_ID, rightsReceiptId: RIGHTS_ID, sourceAssetId: "source-live-canary-reality", modificationState: "ALLOWED", territoryScope: "US", width: 320, height: 180, idempotencyKey: "factory:live-canary:asset-reality:v1", evidenceHash: fixture.realityHash },
    { videoId: VIDEO_ID, artifactVersionId: PROOF_ASSET_ID, rightsReceiptId: RIGHTS_ID, sourceAssetId: "source-live-canary-proof", modificationState: "ALLOWED", territoryScope: "US", width: 320, height: 180, idempotencyKey: "factory:live-canary:asset-proof:v1", evidenceHash: fixture.proofHash },
  ];
  for (let index = 0; index < assetInputs.length; index += 1) {
    const asset = assetInputs[index], expectedVersion = index === 0 ? 5 : 7;
    await verifyFactoryAssetEligibility(env, asset, command({
      streamType: "VIDEO", streamId: VIDEO_ID, commandType: "VERIFY_ARTIFACT", expectedState: index === 0 ? "ArtifactMaterialized" : "ArtifactVerified", expectedVersion,
      leaseId: reserve.leaseId, fencingToken: reserve.fencingToken, idempotencyKey: `factory:live-canary:asset-command:${index + 1}:v1`, intentHash: await canonicalHash(asset),
      payload: { artifactKind: "SOURCE_MEDIA", providerRequests: 0, spendUsd: 0 }, evidenceHash: asset.evidenceHash,
    }, actorId), execution);
  }
  const canaryInput: FactoryIntegratedCanaryInput = {
    videoId: VIDEO_ID, renderTapeArtifactVersionId: rendered.artifactVersionId, compositorBindingId: COMPOSITOR_ID, frameStart: 0, frameEndExclusive: 1800,
    outputStorageKey: fixture.outputKey, expectedOutputHash: fixture.outputHash, expectedByteSize: fixture.output.byteLength, deterministicReplayHash: fixture.outputHash,
    probe: { mimeType: "video/webm", codec: "vp9", width: 320, height: 180, frameRateNumerator: 30, frameRateDenominator: 1, frameCount: 1800, durationMs: 60_000 },
    samples: fixture.samples, idempotencyKey: "factory:live-canary:composition:v1", evidenceHash: fixture.outputHash,
  };
  const canaryCommand = command({
    streamType: "VIDEO", streamId: VIDEO_ID, commandType: "PRODUCE_ARTIFACT", expectedState: "ArtifactVerified", expectedVersion: 9,
    leaseId: reserve.leaseId, fencingToken: reserve.fencingToken, idempotencyKey: "factory:live-canary:composition-command:v1", intentHash: await canonicalHash(canaryInput),
    payload: { artifactKind: "INTEGRATED_CANARY_VIDEO", providerRequests: 0, spendUsd: 0 }, evidenceHash: fixture.outputHash,
  }, actorId);
  await materializeFactoryIntegratedCanary(env, canaryInput, canaryCommand, execution);
  const canaryReplay = await materializeFactoryIntegratedCanary(env, canaryInput, canaryCommand, execution);
  if (canaryReplay.outcome !== "IDEMPOTENT_REPLAY") throw new FactoryRuntimeError("LIVE_CANARY_IDEMPOTENT_REPLAY_FAILED", 503, "The exact canary replay did not resolve to its original receipt");
  const release = await releaseFactoryRuntimeLease(env.DB, { leaseId: reserve.leaseId, fencingToken: reserve.fencingToken }, execution);
  if (release.outcome !== "RELEASED" && release.outcome !== "IDEMPOTENT_REPLAY") throw new FactoryRuntimeError("LIVE_CANARY_LEASE_RELEASE_FAILED", 503, "The successful canary lease was not released cleanly");
  const mainReplay = await verifyFactoryRuntimeReplay(env.DB, { streamType: "VIDEO", streamId: VIDEO_ID }, execution);
  const mainReplayAgain = await verifyFactoryRuntimeReplay(env.DB, { streamType: "VIDEO", streamId: VIDEO_ID }, execution);
  if (mainReplay.verificationState !== "PASS" || mainReplayAgain.outcome !== "IDEMPOTENT_REPLAY") throw new FactoryRuntimeError("LIVE_CANARY_RUNTIME_REPLAY_FAILED", 503, "The live canary event stream did not replay exactly");

  const now = execution?.now?.() ?? new Date();
  const recoveryExecution: FactoryRuntimeExecution = { ...execution, now: () => new Date(now.getTime() - 60_000) };
  const orphanLease = await reserveFactoryRuntimeWork(env.DB, {
    streamType: "VIDEO", streamId: RECOVERY_STREAM_ID, stageKey: "CONTROLLED_ORPHAN_RECOVERY", expectedState: "READY", expectedVersion: 0, actorType: "OWNER", actorId,
    idempotencyKey: "factory:live-canary:orphan-lease:v1", intentHash: HASH_B, evidenceHash: fixture.outputHash, leaseDurationMs: 30_000,
  }, recoveryExecution);
  const orphan = await reconcileFactoryRuntimeOrphan(env.DB, {
    streamType: "VIDEO", streamId: RECOVERY_STREAM_ID, actorType: "OWNER", actorId, idempotencyKey: "factory:live-canary:orphan-reconcile:v1", intentHash: HASH_C, evidenceHash: fixture.outputHash,
  }, execution);
  const orphanReplay = await reconcileFactoryRuntimeOrphan(env.DB, {
    streamType: "VIDEO", streamId: RECOVERY_STREAM_ID, actorType: "OWNER", actorId, idempotencyKey: "factory:live-canary:orphan-reconcile:v1", intentHash: HASH_C, evidenceHash: fixture.outputHash,
  }, execution);
  const recoveryReplay = await verifyFactoryRuntimeReplay(env.DB, { streamType: "VIDEO", streamId: RECOVERY_STREAM_ID }, execution);
  const recoveryReplayAgain = await verifyFactoryRuntimeReplay(env.DB, { streamType: "VIDEO", streamId: RECOVERY_STREAM_ID }, execution);
  if (orphan.outcome !== "ORPHAN_RECONCILED" || orphanReplay.outcome !== "IDEMPOTENT_REPLAY" || recoveryReplay.verificationState !== "PASS" || recoveryReplayAgain.outcome !== "IDEMPOTENT_REPLAY") {
    throw new FactoryRuntimeError("LIVE_CANARY_ORPHAN_RECOVERY_FAILED", 503, "The bounded orphan/replay recovery exercise did not close exactly");
  }
  const canaryReceipt = await first(env, `SELECT r.*,j.id composition_job_id FROM factory_integrated_canary_receipts r JOIN factory_video_composition_jobs j ON j.id=r.composition_job_id WHERE r.artifact_version_id=?`, canaryReplay.artifactVersionId);
  const mainReplayRow = await first(env, "SELECT id FROM factory_runtime_replay_receipts WHERE stream_type='VIDEO' AND stream_id=? AND verification_state='PASS' ORDER BY created_at DESC LIMIT 1", VIDEO_ID);
  const recoveryReplayRow = await first(env, "SELECT id FROM factory_runtime_replay_receipts WHERE stream_type='VIDEO' AND stream_id=? AND verification_state='PASS' ORDER BY created_at DESC LIMIT 1", RECOVERY_STREAM_ID);
  const mainLeaseRow = await first(env, "SELECT lifecycle_state FROM factory_runtime_leases WHERE id=?", reserve.leaseId), orphanLeaseRow = await first(env, "SELECT lifecycle_state FROM factory_runtime_leases WHERE id=?", orphanLease.leaseId);
  if (!canaryReceipt || !mainReplayRow || !recoveryReplayRow || clean(mainLeaseRow?.lifecycle_state) !== "RELEASED" || clean(orphanLeaseRow?.lifecycle_state) !== "ORPHANED") {
    throw new FactoryRuntimeError("LIVE_CANARY_FINAL_RECONCILIATION_FAILED", 503, "The canary, release, orphan and replay receipts did not reconcile");
  }
  const evidenceHash = await canonicalHash({
    qualificationVersion: FACTORY_NON_R22_LIVE_CANARY_QUALIFICATION_VERSION, fixtureVersion: FACTORY_NON_R22_CANARY_FIXTURE_VERSION,
    integratedCanaryReceiptId: canaryReceipt.id, compositionJobId: canaryReceipt.composition_job_id, mainReplayReceiptId: mainReplayRow.id,
    orphanEventId: orphan.eventId, orphanReplayReceiptId: recoveryReplayRow.id, outputHash: fixture.outputHash,
  });
  const receiptId = `factory-live-canary-qualification-${evidenceHash.slice(0, 24)}`;
  try {
    await env.DB.prepare(`INSERT INTO factory_live_canary_qualification_receipts
      (id,qualification_key,fixture_version,video_id,recovery_stream_id,integrated_canary_receipt_id,composition_job_id,main_replay_receipt_id,orphan_event_id,orphan_replay_receipt_id,output_hash,main_lease_state,orphan_lease_state,canary_replay_state,orphan_replay_state,verification_state,zero_dispatch,provider_requests,spend_micros,evidence_hash)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,'RELEASED','ORPHANED','IDEMPOTENT_REPLAY','IDEMPOTENT_REPLAY','PASS',1,0,0,?)`).bind(
      receiptId, FACTORY_NON_R22_LIVE_CANARY_QUALIFICATION_KEY, FACTORY_NON_R22_CANARY_FIXTURE_VERSION, VIDEO_ID, RECOVERY_STREAM_ID,
      canaryReceipt.id, canaryReceipt.composition_job_id, mainReplayRow.id, orphan.eventId, recoveryReplayRow.id, fixture.outputHash, evidenceHash,
    ).run();
  } catch {
    const concurrent = await first(env, "SELECT * FROM factory_live_canary_qualification_receipts WHERE qualification_key=?", FACTORY_NON_R22_LIVE_CANARY_QUALIFICATION_KEY);
    if (!concurrent || clean(concurrent.evidence_hash) !== evidenceHash) throw new FactoryRuntimeError("LIVE_CANARY_QUALIFICATION_WRITE_CONFLICT", 409, "The qualification receipt could not be committed exactly");
  }
  await verifyStoredBytes(env, fixture.outputKey, fixture.outputHash, fixture.output.byteLength);
  return { outcome: "QUALIFIED" as const, qualificationReceiptId: receiptId, videoId: VIDEO_ID, recoveryStreamId: RECOVERY_STREAM_ID, integratedCanaryReceiptId: clean(canaryReceipt.id), outputHash: fixture.outputHash, evidenceHash, mainReplayReceiptId: clean(mainReplayRow.id), orphanReplayReceiptId: clean(recoveryReplayRow.id), providerRequests: 0, spendMicros: 0, verificationState: "PASS" as const };
}
