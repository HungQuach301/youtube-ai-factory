import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { canonicalHash, sha256Hex } from "../lib/canonical-json.ts";
import {
  materializeFactoryIntegratedCanary,
  planFactoryIntegratedCanary,
  verifyFactoryAssetEligibility,
} from "../lib/factory-pixel-video-compositor.ts";
import { runFactoryNonR22LiveCanaryQualification } from "../lib/factory-non-r22-canary-qualification.ts";
import { persistFactoryProductionCompilation } from "../lib/factory-production-compiler.ts";
import { materializeFactorySceneGraphRender } from "../lib/factory-scene-graph-renderer.ts";
import { createCanonicalTimebase } from "../lib/factory-runtime-contracts.ts";
import { FactoryRuntimeError, reserveFactoryRuntimeWork, verifyFactoryRuntimeReplay } from "../lib/factory-runtime-writer.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const migrations = readdirSync(new URL("../drizzle", import.meta.url)).filter((name) => name.endsWith(".sql")).sort();
const hashA = "a".repeat(64), hashB = "b".repeat(64), hashC = "c".repeat(64), hashD = "d".repeat(64), hashE = "e".repeat(64), hashF = "f".repeat(64);

function d1(database) {
  function prepare(query) {
    const statement = database.prepare(query);
    let values = [];
    return {
      bind(...next) { values = next; return this; },
      async first() { return statement.get(...values) ?? null; },
      async all() { return { results: statement.all(...values) }; },
      async run() { const result = statement.run(...values); return { success: true, meta: { changes: result.changes } }; },
    };
  }
  return {
    prepare,
    async batch(statements) {
      database.exec("BEGIN IMMEDIATE");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        database.exec("COMMIT");
        return results;
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

function bucket() {
  const objects = new Map();
  return {
    objects,
    async put(key, value) { objects.set(key, new Uint8Array(value)); },
    async get(key) {
      const value = objects.get(key);
      return value ? { async arrayBuffer() { return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength); } } : null;
    },
  };
}

function setup() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys=ON");
  for (const migration of migrations) database.exec(read(`drizzle/${migration}`));
  return { database, db: d1(database), bucket: bucket() };
}

function execution(nowIso = "2026-08-25T00:00:00.000Z", namespace = "pixel") {
  let sequence = 0;
  return { now: () => new Date(nowIso), id: (prefix) => `${prefix}-${namespace}-${++sequence}` };
}

async function seedFoundation(database, storage) {
  const timebase = createCanonicalTimebase({ frameRateNumerator: 30, frameRateDenominator: 1, audioSampleRateHz: 48_000, totalFrames: 1800 });
  database.prepare(`INSERT INTO factory_canonical_timebases
    (id,video_id,contract_version,frame_rate_numerator,frame_rate_denominator,audio_sample_rate_hz,total_frames,total_audio_samples,rounding_policy,definition_hash)
    VALUES ('timebase-pixel','video-pixel-canary','FACTORY_RUNTIME_CONTRACT_V1',?,?,?,?,?,?,?)`).run(
    timebase.frameRateNumerator, timebase.frameRateDenominator, timebase.audioSampleRateHz, timebase.totalFrames, timebase.totalAudioSamples, timebase.roundingPolicy, hashA);
  database.prepare(`INSERT INTO factory_channel_visual_profile_versions
    (id,channel_id,version,policy_version,market,language,profile_json,input_hash,content_hash,lifecycle_state,created_by)
    VALUES ('visual-profile-pixel','channel-pixel',1,'VISUAL_POLICY_V1','US','en-US',?,?,?,'FROZEN','owner:test')`).run(
    JSON.stringify({ allowedRoutes: ["SOURCE", "MAKE", "HYBRID"], allowedTreatmentFamilies: ["DOCUMENTARY", "DIAGRAM", "CHART"], prohibitedPatterns: ["SLIDE_DECK"], maxConsecutiveTreatment: 2 }), hashA, hashB);
  database.prepare(`INSERT INTO factory_series_format_versions
    (id,channel_id,format_key,version,format_json,input_hash,content_hash,lifecycle_state,created_by)
    VALUES ('series-format-pixel','channel-pixel','EXPLAINER',1,?,?,?,'FROZEN','owner:test')`).run(JSON.stringify({ prohibitedPatterns: ["REPEATED_TOPOLOGY"] }), hashB, hashC);
  database.prepare(`INSERT INTO factory_providers
    (id,provider_key,provider_version,connection_ref,lifecycle_state,health_state,metadata_json)
    VALUES ('provider-pixel-internal','INTERNAL_MEDIA_WORKER','V1',NULL,'ACTIVE','HEALTHY','{}')`).run();
  database.prepare(`INSERT INTO factory_capabilities
    (id,capability_key,capability_version,plane,input_schema_hash,output_schema_hash,lifecycle_state)
    VALUES ('capability-pixel','VISUAL_SCENE_COMPOSITION','V1','PRODUCTION_MEDIA',?,?,'ACTIVE')`).run(hashD, hashE);
  database.prepare(`INSERT INTO factory_provider_bindings
    (id,provider_id,capability_id,binding_version,endpoint_or_model,model_version,input_schema_hash,output_schema_hash,settings_hash,rights_policy_version,retention_policy_version,rate_card_version,max_payload_bytes,timeout_ms,retry_ceiling,fallback_binding_id,priority,lifecycle_state)
    VALUES ('binding-pixel','provider-pixel-internal','capability-pixel','V1','internal:pixel-video-compositor','V1',?,?,?,'RIGHTS_INTERNAL_V1','RETENTION_INTERNAL_V1','ZERO_COST_V1',8000000,300000,0,NULL,10,'ACTIVE')`).run(hashD, hashE, hashF);
  database.prepare(`INSERT INTO factory_capability_qualifications
    (id,binding_id,qualification_version,standard_version,qualified_archetypes_json,settings_hash,sample_size,first_pass_yield,p0_escape_count,evidence_hash,lifecycle_state,qualified_at,expires_at)
    VALUES ('qualification-pixel','binding-pixel',1,'VISUAL_STANDARD_V3',?,?,24,1,0,?,'QUALIFIED','2026-08-24T00:00:00.000Z','2027-08-24T00:00:00.000Z')`).run(JSON.stringify(["DOCUMENTARY", "MECHANISM", "QUANTITATIVE"]), hashF, hashA);
  database.prepare(`INSERT INTO factory_rights_eligibility_receipts
    (id,binding_id,rights_policy_version,retention_policy_version,commercial_use_state,evidence_hash,valid_from,expires_at)
    VALUES ('rights-pixel','binding-pixel','RIGHTS_INTERNAL_V1','RETENTION_INTERNAL_V1','ELIGIBLE',?,'2026-08-24T00:00:00.000Z','2027-08-24T00:00:00.000Z')`).run(hashB);
  database.prepare(`INSERT INTO factory_render_worker_bindings
    (id,provider_binding_id,qualification_id,worker_key,worker_version,renderer_version,input_schema_hash,output_schema_hash,settings_hash,max_frames_per_job,lifecycle_state,evidence_hash)
    VALUES ('worker-render-pixel','binding-pixel','qualification-pixel','SCENE_RENDERER','V1','FACTORY_SCENE_GRAPH_RENDERER_V1',?,?,?,3000,'ACTIVE',?)`).run(hashD, hashE, hashF, hashC);
  database.prepare(`INSERT INTO factory_pixel_compositor_bindings
    (id,provider_binding_id,qualification_id,worker_key,worker_version,compositor_version,encoder_version,input_schema_hash,output_schema_hash,settings_hash,output_mime_type,output_codec,max_frames_per_job,lifecycle_state,evidence_hash)
    VALUES ('worker-compositor-pixel','binding-pixel','qualification-pixel','PIXEL_VIDEO_COMPOSITOR','V1','FACTORY_PIXEL_VIDEO_COMPOSITOR_V1','FFMPEG_LIBVPX_VP9_BITEXACT_V1',?,?,?,'video/webm','vp9',3000,'ACTIVE',?)`).run(hashD, hashE, hashF, hashC);
  const sourceBytes = new TextEncoder().encode("sealed-source-frame-bytes-v1"), sourceHash = await sha256Hex(sourceBytes), sourceKey = `factory/assets/${sourceHash}.png`;
  await storage.put(sourceKey, sourceBytes);
  database.prepare(`INSERT INTO factory_artifact_versions
    (id,artifact_id,version,artifact_kind,source_entity_type,source_entity_id,content_hash,storage_key,mime_type,byte_size,lineage_json,lifecycle_state)
    VALUES ('asset-pixel-v1','artifact:asset-pixel',1,'SOURCE_MEDIA','SOURCE_ASSET','source-asset-pixel',?,?, 'image/png',?,'{}','MATERIALIZED')`).run(sourceHash, sourceKey, sourceBytes.byteLength);
  return { sourceHash, sourceKey, sourceBytes };
}

function routeCandidate(archetype, route, treatmentFamily) {
  return {
    route, treatmentFamily, capabilityKey: "VISUAL_SCENE_COMPOSITION", capabilityVersion: "V1", archetype,
    expectedOutputSchemaHash: hashE, requiredSettingsHash: hashF, standardVersion: "VISUAL_STANDARD_V3", rightsPolicyVersion: "RIGHTS_INTERNAL_V1",
    retentionPolicyVersion: "RETENTION_INTERNAL_V1", minimumSampleSize: 10, minimumFirstPassYield: 0.95, payloadBytes: 1024, requestedBindingId: "binding-pixel",
  };
}

function compilationInput() {
  return {
    videoId: "video-pixel-canary", version: 1, channelVisualProfileVersionId: "visual-profile-pixel", seriesFormatVersionId: "series-format-pixel",
    canonicalTimebaseId: "timebase-pixel", claimGraphHash: hashC, narrationHash: hashD, createdBy: "owner:test",
    idempotencyKey: "factory:compilation:pixel-canary:0001", evidenceHash: hashE,
    segments: [
      { id: "segment-reality", claimId: "claim-reality", startFrame: 0, endFrameExclusive: 600, visualJob: "REALITY_ANCHOR", routeCandidate: routeCandidate("DOCUMENTARY", "SOURCE", "DOCUMENTARY"), evidenceHashes: [hashA], assetArtifactVersionIds: ["asset-pixel-v1"] },
      { id: "segment-mechanism", claimId: "claim-mechanism", startFrame: 600, endFrameExclusive: 1200, visualJob: "MECHANISM_EXPLANATION", routeCandidate: routeCandidate("MECHANISM", "MAKE", "DIAGRAM"), evidenceHashes: [hashB], objectContinuityKey: "object-flow" },
      { id: "segment-proof", claimId: "claim-proof", startFrame: 1200, endFrameExclusive: 1800, visualJob: "QUANTITATIVE_PROOF", routeCandidate: routeCandidate("QUANTITATIVE", "HYBRID", "CHART"), evidenceHashes: [hashC], datasetHash: hashD, assetArtifactVersionIds: ["asset-pixel-v1"] },
    ],
  };
}

async function createRenderedTape(setupState, run) {
  const { db } = setupState, input = compilationInput();
  const reservation = await reserveFactoryRuntimeWork(db, {
    streamType: "VIDEO", streamId: input.videoId, stageKey: "INTEGRATED_CANARY", expectedState: "READY", expectedVersion: 0,
    actorType: "SYSTEM", actorId: "system:compositor", idempotencyKey: "factory:pixel:lease:0001", intentHash: hashA, evidenceHash: hashB,
  }, run);
  const compileCommand = {
    streamType: "VIDEO", streamId: input.videoId, commandType: "PRODUCE_ARTIFACT", expectedState: "WorkReserved", expectedVersion: 1, actorType: "SYSTEM", actorId: "system:compiler",
    leaseId: reservation.leaseId, fencingToken: reservation.fencingToken, idempotencyKey: "factory:pixel:compile-command:0001", intentHash: await canonicalHash(input),
    policyVersions: { runtime: "V1", visual: "V3" }, costScope: { mode: "ZERO_SPEND", maxProviderRequests: 0, maxSpendMicros: 0 },
    rightsScope: { policy: "RIGHTS_INTERNAL_V1", commercialUse: "ELIGIBLE" }, payload: { artifactKind: "PRODUCTION_PLAN_BUNDLE", providerRequests: 0, spendUsd: 0 }, evidenceHash: hashE,
  };
  const compiled = await persistFactoryProductionCompilation(db, input, compileCommand, run);
  const renderInput = { videoId: input.videoId, sceneGraphId: compiled.sceneGraphId, workerBindingId: "worker-render-pixel", frameStart: 0, frameEndExclusive: 1800, width: 320, height: 180, idempotencyKey: "factory:pixel:scene-render:0001", evidenceHash: hashF };
  const renderCommand = {
    ...compileCommand, expectedState: "ArtifactMaterialized", expectedVersion: 3, actorId: "system:renderer", idempotencyKey: "factory:pixel:render-command:0001", intentHash: await canonicalHash(renderInput),
    payload: { artifactKind: "SCENE_RENDER_TAPE", providerRequests: 0, spendUsd: 0 },
  };
  const rendered = await materializeFactorySceneGraphRender({ DB: db, BUCKET: setupState.bucket }, renderInput, renderCommand, run);
  return { reservation, rendered };
}

async function qualifyAsset(setupState, reservation, run) {
  const input = { videoId: "video-pixel-canary", artifactVersionId: "asset-pixel-v1", rightsReceiptId: "rights-pixel", sourceAssetId: "source-asset-pixel", modificationState: "ALLOWED", territoryScope: "US", width: 320, height: 180, idempotencyKey: "factory:pixel:asset-eligibility:0001", evidenceHash: hashA };
  const command = {
    streamType: "VIDEO", streamId: input.videoId, commandType: "VERIFY_ARTIFACT", expectedState: "ArtifactMaterialized", expectedVersion: 5, actorType: "SYSTEM", actorId: "system:rights",
    leaseId: reservation.leaseId, fencingToken: reservation.fencingToken, idempotencyKey: "factory:pixel:asset-command:0001", intentHash: await canonicalHash(input),
    policyVersions: { runtime: "V1", rights: "RIGHTS_INTERNAL_V1" }, costScope: { mode: "ZERO_SPEND", maxProviderRequests: 0, maxSpendMicros: 0 },
    rightsScope: { policy: "RIGHTS_INTERNAL_V1", commercialUse: "ELIGIBLE" }, payload: { artifactKind: "SOURCE_MEDIA", providerRequests: 0, spendUsd: 0 }, evidenceHash: hashA,
  };
  return verifyFactoryAssetEligibility({ DB: setupState.db, BUCKET: setupState.bucket }, input, command, run);
}

async function stagedCanaryInput(storage, renderTapeArtifactVersionId) {
  const output = new TextEncoder().encode("deterministic-qualified-vp9-canary-bytes-v1"), outputHash = await sha256Hex(output), outputStorageKey = `factory/canaries/${outputHash}.webm`;
  await storage.put(outputStorageKey, output);
  const samples = [];
  for (const [role, timestampMs] of [["ENTRY", 0], ["MIDPOINT", 30_000], ["EXIT", 59_967]]) {
    const bytes = new TextEncoder().encode(`decoded-pixel-sample-${role}`), sha256 = await sha256Hex(bytes), storageKey = `factory/canaries/samples/${sha256}.png`;
    await storage.put(storageKey, bytes);
    samples.push({ role, storageKey, sha256, byteSize: bytes.byteLength, timestampMs, width: 320, height: 180 });
  }
  return {
    videoId: "video-pixel-canary", renderTapeArtifactVersionId, compositorBindingId: "worker-compositor-pixel", frameStart: 0, frameEndExclusive: 1800,
    outputStorageKey, expectedOutputHash: outputHash, expectedByteSize: output.byteLength, deterministicReplayHash: outputHash,
    probe: { mimeType: "video/webm", codec: "vp9", width: 320, height: 180, frameRateNumerator: 30, frameRateDenominator: 1, frameCount: 1800, durationMs: 60_000 },
    samples, idempotencyKey: "factory:pixel:integrated-canary:0001", evidenceHash: hashF,
  };
}

test("migrations 0110-0111 install append-only canary admission and one bounded live qualification receipt", () => {
  assert.equal(migrations.at(-1), "0117_factory_assurance_corpus_remediation_inventory.sql");
  const migration = read("drizzle/0110_factory_asset_eligibility_and_pixel_canary.sql");
  for (const table of ["factory_asset_eligibility_receipts", "factory_pixel_compositor_bindings", "factory_video_composition_jobs", "factory_integrated_canary_receipts"]) assert.ok(migration.includes("CREATE TABLE `" + table + "`"));
  assert.match(migration, /FACTORY_INTEGRATED_CANARY_RECEIPTS_APPEND_ONLY/);
  const route = read("app/api/factory/runtime/route.ts"), executor = read("scripts/factory-pixel-video-compositor.mjs");
  assert.match(route, /FACTORY_ASSET_ELIGIBILITY_ENABLED !== "true"/);
  assert.match(route, /FACTORY_PIXEL_COMPOSITOR_ENABLED !== "true"/);
  assert.match(route, /materializeFactoryIntegratedCanary/);
  assert.match(executor, /libvpx-vp9/);
  assert.match(executor, /integrated canary must be 60-90 seconds/);
  assert.match(executor, /exact input hash mismatch/);
  assert.doesNotMatch(`${migration}\n${route}\n${executor}`, /api\.openai\.com|elevenlabs\.io|youtube-ai-factory-v2/);
  const qualification = read("drizzle/0111_factory_live_canary_qualification.sql");
  assert.match(qualification, /factory_live_canary_qualification_receipts/);
  assert.match(qualification, /FACTORY_LIVE_CANARY_QUALIFICATION_RECEIPTS_APPEND_ONLY/);
  assert.match(route, /FACTORY_NON_R22_CANARY_QUALIFICATION_ENABLED !== "true"/);
  assert.match(route, /RUN_NON_R22_LIVE_CANARY_QUALIFICATION/);
  assert.match(route, /x-factory-runtime-qualification-token/);
  assert.match(route, /FACTORY_RUNTIME_QUALIFICATION_TOKEN/);
  assert.match(route, /action === "RUN_NON_R22_LIVE_CANARY_QUALIFICATION"/);
  assert.match(route, /await secretMatches/);
  assert.match(route, /if \(!left \|\| !right\) return false/);
  assert.match(route, /assertR22Blocked\(env, body, action\)/);
});

test("controlled FFmpeg executor produces exact-repeat VP9 bytes from one sealed SOURCE/MAKE/HYBRID package", { skip: spawnSync("ffmpeg", ["-version"]).status !== 0 || spawnSync("ffprobe", ["-version"]).status !== 0 }, () => {
  const work = mkdtempSync(join(tmpdir(), "factory-pixel-executor-test-"));
  try {
    const packagePath = new URL("../tests/fixtures/factory-pixel-compositor/package.json", import.meta.url).pathname;
    const executorPath = new URL("../scripts/factory-pixel-video-compositor.mjs", import.meta.url).pathname;
    const run = (name) => JSON.parse(execFileSync(process.execPath, [executorPath, "--package", packagePath, "--output", join(work, name)], { encoding: "utf8", maxBuffer: 4_000_000 }));
    const first = run("canary-a.webm"), second = run("canary-b.webm");
    assert.equal(first.output.sha256, "cb7ff0c35a03a21f6dd5ddb6b7c72c6056e35cfbf94e15559b32ceb5150adb21");
    assert.equal(first.output.sha256, second.output.sha256);
    assert.deepEqual({ frames: first.output.frameCount, durationMs: first.output.durationMs, codec: first.output.codec, width: first.output.width, height: first.output.height }, { frames: 1800, durationMs: 60_000, codec: "vp9", width: 320, height: 180 });
    assert.deepEqual(first.samples.map((sample) => sample.role).sort(), ["ENTRY", "EXIT", "MIDPOINT"]);
    assert.equal(first.providerRequests, 0);
    assert.equal(first.spendMicros, 0);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

test("qualified assets and exact render tape produce one fenced 60-second pixel/video canary receipt", async () => {
  const state = setup(), run = execution();
  await seedFoundation(state.database, state.bucket);
  const { reservation, rendered } = await createRenderedTape(state, run);
  const eligibility = await qualifyAsset(state, reservation, run);
  assert.equal(eligibility.outcome, "VERIFIED");
  const input = await stagedCanaryInput(state.bucket, rendered.artifactVersionId);
  const firstPlan = await planFactoryIntegratedCanary({ DB: state.db, BUCKET: state.bucket }, input, "2026-08-25T00:00:00.000Z");
  const secondPlan = await planFactoryIntegratedCanary({ DB: state.db, BUCKET: state.bucket }, input, "2026-08-25T00:00:00.000Z");
  assert.equal(firstPlan.outcome, "READY");
  assert.equal(firstPlan.inputHash, secondPlan.inputHash);
  assert.equal(firstPlan.assetReceiptIds.length, 1);
  const command = {
    streamType: "VIDEO", streamId: input.videoId, commandType: "PRODUCE_ARTIFACT", expectedState: "ArtifactVerified", expectedVersion: 7, actorType: "SYSTEM", actorId: "system:compositor",
    leaseId: reservation.leaseId, fencingToken: reservation.fencingToken, idempotencyKey: "factory:pixel:canary-command:0001", intentHash: await canonicalHash(input),
    policyVersions: { runtime: "V1", compositor: "V1" }, costScope: { mode: "ZERO_SPEND", maxProviderRequests: 0, maxSpendMicros: 0 },
    rightsScope: { policy: "RIGHTS_INTERNAL_V1", commercialUse: "ELIGIBLE" }, payload: { artifactKind: "INTEGRATED_CANARY_VIDEO", providerRequests: 0, spendUsd: 0 }, evidenceHash: hashF,
  };
  const canary = await materializeFactoryIntegratedCanary({ DB: state.db, BUCKET: state.bucket }, input, command, run);
  assert.equal(canary.outcome, "MATERIALIZED");
  assert.equal(canary.providerRequests, 0);
  assert.equal(canary.spendMicros, 0);
  assert.equal(state.database.prepare("SELECT COUNT(*) total FROM factory_video_composition_jobs").get().total, 1);
  assert.equal(state.database.prepare("SELECT COUNT(*) total FROM factory_integrated_canary_receipts WHERE verification_state='PASS' AND zero_dispatch=1").get().total, 1);
  assert.equal(state.database.prepare("SELECT COUNT(*) total FROM factory_dependency_bindings WHERE dependency_type='COMPOSED_FROM'").get().total, 2);
  const replay = await materializeFactoryIntegratedCanary({ DB: state.db, BUCKET: state.bucket }, input, command, run);
  assert.equal(replay.outcome, "IDEMPOTENT_REPLAY");
  const runtimeReplay = await verifyFactoryRuntimeReplay(state.db, { streamType: "VIDEO", streamId: input.videoId }, run);
  assert.equal(runtimeReplay.verificationState, "PASS");
  assert.throws(() => state.database.prepare("UPDATE factory_integrated_canary_receipts SET verification_state='FAIL'").run(), /FACTORY_INTEGRATED_CANARY_RECEIPTS_APPEND_ONLY/);
});

test("missing asset qualification and stale compositor fences fail closed before an authoritative canary", async () => {
  const missing = setup(), missingRun = execution("2026-08-25T00:00:00.000Z", "missing");
  await seedFoundation(missing.database, missing.bucket);
  const missingRendered = await createRenderedTape(missing, missingRun);
  const missingInput = await stagedCanaryInput(missing.bucket, missingRendered.rendered.artifactVersionId);
  const blocked = await planFactoryIntegratedCanary({ DB: missing.db, BUCKET: missing.bucket }, missingInput, "2026-08-25T00:00:00.000Z");
  assert.equal(blocked.outcome, "BLOCKED");
  assert.ok(blocked.reasons.some((reason) => reason.includes("ASSET_ELIGIBILITY_RECEIPT_REQUIRED")));

  const stale = setup(), staleRun = execution("2026-08-25T00:00:00.000Z", "stale");
  await seedFoundation(stale.database, stale.bucket);
  const { reservation, rendered } = await createRenderedTape(stale, staleRun);
  await qualifyAsset(stale, reservation, staleRun);
  const input = await stagedCanaryInput(stale.bucket, rendered.artifactVersionId);
  const command = {
    streamType: "VIDEO", streamId: input.videoId, commandType: "PRODUCE_ARTIFACT", expectedState: "ArtifactVerified", expectedVersion: 7, actorType: "SYSTEM", actorId: "system:compositor",
    leaseId: reservation.leaseId, fencingToken: reservation.fencingToken, idempotencyKey: "factory:pixel:stale-canary-command:0001", intentHash: await canonicalHash(input),
    policyVersions: { runtime: "V1", compositor: "V1" }, costScope: { mode: "ZERO_SPEND", maxProviderRequests: 0, maxSpendMicros: 0 },
    rightsScope: { policy: "RIGHTS_INTERNAL_V1", commercialUse: "ELIGIBLE" }, payload: { artifactKind: "INTEGRATED_CANARY_VIDEO", providerRequests: 0, spendUsd: 0 }, evidenceHash: hashF,
  };
  await assert.rejects(
    () => materializeFactoryIntegratedCanary({ DB: stale.db, BUCKET: stale.bucket }, input, command, execution("2026-08-25T00:20:00.000Z", "late")),
    (error) => error instanceof FactoryRuntimeError && error.code === "PIXEL_COMPOSITOR_FENCE_PRECHECK_FAILED",
  );
  assert.equal(stale.database.prepare("SELECT COUNT(*) total FROM factory_video_composition_jobs").get().total, 0);
  assert.equal(stale.database.prepare("SELECT COUNT(*) total FROM factory_integrated_canary_receipts").get().total, 0);
});

test("bounded non-R22 runner seals real WebM, releases success, reconciles one orphan and replays both streams exactly", async () => {
  const state = setup(), run = execution("2026-08-25T13:30:00.000Z", "live-qualification");
  const result = await runFactoryNonR22LiveCanaryQualification({ DB: state.db, BUCKET: state.bucket }, "owner:qualification", run);
  assert.equal(result.outcome, "QUALIFIED");
  assert.equal(result.verificationState, "PASS");
  assert.equal(result.outputHash, "cb7ff0c35a03a21f6dd5ddb6b7c72c6056e35cfbf94e15559b32ceb5150adb21");
  assert.equal(result.providerRequests, 0);
  assert.equal(result.spendMicros, 0);
  assert.equal(state.database.prepare("SELECT COUNT(*) total FROM factory_live_canary_qualification_receipts WHERE verification_state='PASS' AND zero_dispatch=1").get().total, 1);
  assert.equal(state.database.prepare("SELECT COUNT(*) total FROM factory_integrated_canary_receipts WHERE verification_state='PASS'").get().total, 1);
  assert.equal(state.database.prepare("SELECT COUNT(*) total FROM factory_runtime_leases WHERE lifecycle_state='RELEASED'").get().total, 1);
  assert.equal(state.database.prepare("SELECT COUNT(*) total FROM factory_runtime_leases WHERE lifecycle_state='ORPHANED'").get().total, 1);
  assert.equal(state.database.prepare("SELECT COUNT(*) total FROM factory_runtime_replay_receipts WHERE verification_state='PASS'").get().total, 2);
  const replay = await runFactoryNonR22LiveCanaryQualification({ DB: state.db, BUCKET: state.bucket }, "owner:qualification", run);
  assert.equal(replay.outcome, "IDEMPOTENT_REPLAY");
  assert.equal(state.database.prepare("SELECT COUNT(*) total FROM factory_live_canary_qualification_receipts").get().total, 1);
  assert.equal(state.database.prepare("SELECT COUNT(*) total FROM factory_video_composition_jobs").get().total, 1);
  assert.throws(() => state.database.prepare("UPDATE factory_live_canary_qualification_receipts SET verification_state='FAIL'").run(), /FACTORY_LIVE_CANARY_QUALIFICATION_RECEIPTS_APPEND_ONLY/);
});
