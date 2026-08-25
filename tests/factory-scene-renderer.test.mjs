import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { canonicalHash, sha256Hex } from "../lib/canonical-json.ts";
import { persistFactoryProductionCompilation } from "../lib/factory-production-compiler.ts";
import { materializeFactorySceneGraphRender, planFactorySceneGraphRender } from "../lib/factory-scene-graph-renderer.ts";
import { createCanonicalTimebase } from "../lib/factory-runtime-contracts.ts";
import { FactoryRuntimeError, reserveFactoryRuntimeWork } from "../lib/factory-runtime-writer.ts";

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

function execution(nowIso = "2026-08-25T00:00:00.000Z", namespace = "render") {
  let sequence = 0;
  return { now: () => new Date(nowIso), id: (prefix) => `${prefix}-${namespace}-${++sequence}` };
}

function seedFoundation(database) {
  const timebase = createCanonicalTimebase({ frameRateNumerator: 30, frameRateDenominator: 1, audioSampleRateHz: 48_000, totalFrames: 90 });
  database.prepare(`INSERT INTO factory_canonical_timebases
    (id,video_id,contract_version,frame_rate_numerator,frame_rate_denominator,audio_sample_rate_hz,total_frames,total_audio_samples,rounding_policy,definition_hash)
    VALUES ('timebase-render','video-render-canary','FACTORY_RUNTIME_CONTRACT_V1',?,?,?,?,?,?,?)`).run(
    timebase.frameRateNumerator, timebase.frameRateDenominator, timebase.audioSampleRateHz, timebase.totalFrames, timebase.totalAudioSamples, timebase.roundingPolicy, hashA);
  database.prepare(`INSERT INTO factory_channel_visual_profile_versions
    (id,channel_id,version,policy_version,market,language,profile_json,input_hash,content_hash,lifecycle_state,created_by)
    VALUES ('visual-profile-render','channel-render',1,'VISUAL_POLICY_V1','US','en-US',?,?,?,'FROZEN','owner:test')`).run(
    JSON.stringify({ allowedRoutes: ["SOURCE", "MAKE", "HYBRID"], allowedTreatmentFamilies: ["DOCUMENTARY", "DIAGRAM", "CHART"], prohibitedPatterns: ["SLIDE_DECK"], maxConsecutiveTreatment: 2 }), hashA, hashB);
  database.prepare(`INSERT INTO factory_series_format_versions
    (id,channel_id,format_key,version,format_json,input_hash,content_hash,lifecycle_state,created_by)
    VALUES ('series-format-render','channel-render','EXPLAINER',1,?,?,?,'FROZEN','owner:test')`).run(JSON.stringify({ prohibitedPatterns: ["REPEATED_TOPOLOGY"] }), hashB, hashC);
  database.prepare(`INSERT INTO factory_providers
    (id,provider_key,provider_version,connection_ref,lifecycle_state,health_state,metadata_json)
    VALUES ('provider-render-internal','INTERNAL_CODE_ENGINE','V1',NULL,'ACTIVE','HEALTHY','{}')`).run();
  database.prepare(`INSERT INTO factory_capabilities
    (id,capability_key,capability_version,plane,input_schema_hash,output_schema_hash,lifecycle_state)
    VALUES ('capability-render','VISUAL_SCENE_COMPOSITION','V1','PRODUCTION_MEDIA',?,?,'ACTIVE')`).run(hashD, hashE);
  database.prepare(`INSERT INTO factory_provider_bindings
    (id,provider_id,capability_id,binding_version,endpoint_or_model,model_version,input_schema_hash,output_schema_hash,settings_hash,rights_policy_version,retention_policy_version,rate_card_version,max_payload_bytes,timeout_ms,retry_ceiling,fallback_binding_id,priority,lifecycle_state)
    VALUES ('binding-render','provider-render-internal','capability-render','V1','internal:scene-renderer','V1',?,?,?,'RIGHTS_INTERNAL_V1','RETENTION_INTERNAL_V1','ZERO_COST_V1',1000000,30000,0,NULL,10,'ACTIVE')`).run(hashD, hashE, hashF);
  database.prepare(`INSERT INTO factory_capability_qualifications
    (id,binding_id,qualification_version,standard_version,qualified_archetypes_json,settings_hash,sample_size,first_pass_yield,p0_escape_count,evidence_hash,lifecycle_state,qualified_at,expires_at)
    VALUES ('qualification-render','binding-render',1,'VISUAL_STANDARD_V3',?,?,12,1,0,?,'QUALIFIED','2026-08-24T00:00:00.000Z','2027-08-24T00:00:00.000Z')`).run(JSON.stringify(["DOCUMENTARY", "MECHANISM", "TEMPORAL", "QUANTITATIVE"]), hashF, hashA);
  database.prepare(`INSERT INTO factory_rights_eligibility_receipts
    (id,binding_id,rights_policy_version,retention_policy_version,commercial_use_state,evidence_hash,valid_from,expires_at)
    VALUES ('rights-render','binding-render','RIGHTS_INTERNAL_V1','RETENTION_INTERNAL_V1','ELIGIBLE',?,'2026-08-24T00:00:00.000Z','2027-08-24T00:00:00.000Z')`).run(hashB);
  database.prepare(`INSERT INTO factory_render_worker_bindings
    (id,provider_binding_id,qualification_id,worker_key,worker_version,renderer_version,input_schema_hash,output_schema_hash,settings_hash,max_frames_per_job,lifecycle_state,evidence_hash)
    VALUES ('worker-render-v1','binding-render','qualification-render','SCENE_RENDERER','V1','FACTORY_SCENE_GRAPH_RENDERER_V1',?,?,?,900,'ACTIVE',?)`).run(hashD, hashE, hashF, hashC);
}

function routeCandidate(archetype, route, treatmentFamily) {
  return {
    route, treatmentFamily, capabilityKey: "VISUAL_SCENE_COMPOSITION", capabilityVersion: "V1", archetype,
    expectedOutputSchemaHash: hashE, requiredSettingsHash: hashF, standardVersion: "VISUAL_STANDARD_V3", rightsPolicyVersion: "RIGHTS_INTERNAL_V1",
    retentionPolicyVersion: "RETENTION_INTERNAL_V1", minimumSampleSize: 10, minimumFirstPassYield: 0.95, payloadBytes: 1024, requestedBindingId: "binding-render",
  };
}

function compilationInput(withSource = false) {
  return {
    videoId: "video-render-canary", version: 1, channelVisualProfileVersionId: "visual-profile-render", seriesFormatVersionId: "series-format-render",
    canonicalTimebaseId: "timebase-render", claimGraphHash: hashC, narrationHash: hashD, createdBy: "owner:test",
    idempotencyKey: `factory:compilation:render:${withSource ? "source" : "make"}:0001`, evidenceHash: hashE,
    segments: [
      withSource
        ? { id: "segment-reality", claimId: "claim-reality", startFrame: 0, endFrameExclusive: 30, visualJob: "REALITY_ANCHOR", routeCandidate: routeCandidate("DOCUMENTARY", "SOURCE", "DOCUMENTARY"), evidenceHashes: [hashA] }
        : { id: "segment-mechanism", claimId: "claim-mechanism", startFrame: 0, endFrameExclusive: 30, visualJob: "MECHANISM_EXPLANATION", routeCandidate: routeCandidate("MECHANISM", "MAKE", "DIAGRAM"), evidenceHashes: [hashA], objectContinuityKey: "object-flow" },
      { id: "segment-temporal", claimId: "claim-temporal", startFrame: 30, endFrameExclusive: 60, visualJob: "TEMPORAL_PROOF", routeCandidate: routeCandidate("TEMPORAL", "MAKE", "DIAGRAM"), evidenceHashes: [hashB], objectContinuityKey: "object-flow" },
      { id: "segment-proof", claimId: "claim-proof", startFrame: 60, endFrameExclusive: 90, visualJob: "QUANTITATIVE_PROOF", routeCandidate: routeCandidate("QUANTITATIVE", "MAKE", "CHART"), evidenceHashes: [hashC], datasetHash: hashD },
    ],
  };
}

async function compile(database, db, run, withSource = false) {
  const input = compilationInput(withSource);
  const reservation = await reserveFactoryRuntimeWork(db, {
    streamType: "VIDEO", streamId: input.videoId, stageKey: "BLUEPRINT_COMPILATION", expectedState: "READY", expectedVersion: 0,
    actorType: "SYSTEM", actorId: "system:compiler", idempotencyKey: `factory:render:lease:${withSource ? "source" : "make"}:0001`, intentHash: hashA, evidenceHash: hashB,
  }, run);
  const command = {
    streamType: "VIDEO", streamId: input.videoId, commandType: "PRODUCE_ARTIFACT", expectedState: "WorkReserved", expectedVersion: 1, actorType: "SYSTEM", actorId: "system:compiler",
    leaseId: reservation.leaseId, fencingToken: reservation.fencingToken, idempotencyKey: `factory:render:compile-command:${withSource ? "source" : "make"}:0001`, intentHash: await canonicalHash(input),
    policyVersions: { runtime: "V1", visual: "V3" }, costScope: { mode: "ZERO_SPEND", maxProviderRequests: 0, maxSpendMicros: 0 },
    rightsScope: { policy: "RIGHTS_INTERNAL_V1", commercialUse: "ELIGIBLE" }, payload: { artifactKind: "PRODUCTION_PLAN_BUNDLE", providerRequests: 0, spendUsd: 0 }, evidenceHash: hashE,
  };
  const compiled = await persistFactoryProductionCompilation(db, input, command, run);
  assert.equal(database.prepare("SELECT current_version FROM factory_runtime_streams WHERE stream_id=?").get(input.videoId).current_version, 3);
  return { input, reservation, compiled };
}

function renderInput(sceneGraphId, suffix = "0001") {
  return { videoId: "video-render-canary", sceneGraphId, workerBindingId: "worker-render-v1", frameStart: 0, frameEndExclusive: 90, width: 1920, height: 1080, idempotencyKey: `factory:scene-render:materialize:${suffix}`, evidenceHash: hashF };
}

async function renderCommand(input, reservation) {
  return {
    streamType: "VIDEO", streamId: input.videoId, commandType: "PRODUCE_ARTIFACT", expectedState: "ArtifactMaterialized", expectedVersion: 3, actorType: "SYSTEM", actorId: "system:renderer",
    leaseId: reservation.leaseId, fencingToken: reservation.fencingToken, idempotencyKey: "factory:scene-render:command:0001", intentHash: await canonicalHash(input),
    policyVersions: { runtime: "V1", renderer: "V1" }, costScope: { mode: "ZERO_SPEND", maxProviderRequests: 0, maxSpendMicros: 0 },
    rightsScope: { policy: "RIGHTS_INTERNAL_V1", commercialUse: "ELIGIBLE" }, payload: { artifactKind: "SCENE_RENDER_TAPE", providerRequests: 0, spendUsd: 0 }, evidenceHash: hashF,
  };
}

test("migration 0109 installs append-only qualified render worker, jobs and exact-byte receipts", () => {
  assert.equal(migrations.at(-1), "0113_factory_provider_cost_reconciliation_and_drift.sql");
  const migration = read("drizzle/0109_factory_scene_renderer_and_workers.sql");
  for (const table of ["factory_render_worker_bindings", "factory_scene_render_jobs", "factory_scene_render_receipts"]) assert.ok(migration.includes("CREATE TABLE `" + table + "`"));
  assert.match(migration, /FACTORY_SCENE_RENDER_RECEIPTS_APPEND_ONLY/);
  assert.doesNotMatch(migration, /api\.openai\.com|elevenlabs\.io|youtube-ai-factory-v2/);
  const route = read("app/api/factory/runtime/route.ts");
  assert.match(route, /FACTORY_SCENE_RENDERER_ENABLED !== "true"/);
  assert.match(route, /materializeFactorySceneGraphRender/);
  assert.doesNotMatch(route, /api\.openai\.com|elevenlabs\.io/);
});

test("qualified fenced worker materializes deterministic render-tape bytes and exact R2 read-back once", async () => {
  const { database, db, bucket } = setup(), run = execution();
  seedFoundation(database);
  const { reservation, compiled } = await compile(database, db, run);
  const input = renderInput(compiled.sceneGraphId);
  const firstPlan = await planFactorySceneGraphRender(db, input, "2026-08-25T00:00:00.000Z");
  const secondPlan = await planFactorySceneGraphRender(db, input, "2026-08-25T00:00:00.000Z");
  assert.equal(firstPlan.outcome, "READY");
  assert.equal(firstPlan.outputHash, secondPlan.outputHash);
  assert.equal(firstPlan.outputHash, firstPlan.deterministicReplayHash);
  const command = await renderCommand(input, reservation);
  const rendered = await materializeFactorySceneGraphRender({ DB: db, BUCKET: bucket }, input, command, run);
  assert.equal(rendered.outcome, "MATERIALIZED");
  assert.equal(rendered.providerRequests, 0);
  assert.equal(rendered.spendMicros, 0);
  assert.equal(database.prepare("SELECT COUNT(*) total FROM factory_scene_render_jobs").get().total, 1);
  assert.equal(database.prepare("SELECT COUNT(*) total FROM factory_scene_render_receipts WHERE verification_state='PASS' AND zero_dispatch=1").get().total, 1);
  assert.equal(database.prepare("SELECT COUNT(*) total FROM factory_dependency_bindings WHERE dependency_type='RENDERED_FROM'").get().total, 1);
  const stored = bucket.objects.get(rendered.storageKey);
  assert.equal(await sha256Hex(stored), rendered.outputHash);
  const replay = await materializeFactorySceneGraphRender({ DB: db, BUCKET: bucket }, input, command, run);
  assert.equal(replay.outcome, "IDEMPOTENT_REPLAY");
  assert.equal(database.prepare("SELECT COUNT(*) total FROM factory_scene_render_jobs").get().total, 1);
  assert.throws(() => database.prepare("UPDATE factory_scene_render_receipts SET verification_state='FAIL'").run(), /FACTORY_SCENE_RENDER_RECEIPTS_APPEND_ONLY/);
});

test("expired worker fence fails before storage mutation and SOURCE nodes fail without exact asset bindings", async () => {
  const staleSetup = setup(), firstRun = execution("2026-08-25T00:00:00.000Z", "stale");
  seedFoundation(staleSetup.database);
  const { reservation, compiled } = await compile(staleSetup.database, staleSetup.db, firstRun);
  const input = renderInput(compiled.sceneGraphId, "stale-0001"), command = await renderCommand(input, reservation);
  await assert.rejects(
    () => materializeFactorySceneGraphRender({ DB: staleSetup.db, BUCKET: staleSetup.bucket }, input, command, execution("2026-08-25T00:20:00.000Z", "late")),
    (error) => error instanceof FactoryRuntimeError && error.code === "RENDER_WORKER_FENCE_PRECHECK_FAILED",
  );
  assert.equal(staleSetup.bucket.objects.size, 0);
  assert.equal(staleSetup.database.prepare("SELECT COUNT(*) total FROM factory_scene_render_jobs").get().total, 0);

  const sourceSetup = setup(), sourceRun = execution("2026-08-25T00:00:00.000Z", "source");
  seedFoundation(sourceSetup.database);
  const sourceCompiled = await compile(sourceSetup.database, sourceSetup.db, sourceRun, true);
  const blocked = await planFactorySceneGraphRender(sourceSetup.db, renderInput(sourceCompiled.compiled.sceneGraphId, "source-0001"), "2026-08-25T00:00:00.000Z");
  assert.equal(blocked.outcome, "BLOCKED");
  assert.ok(blocked.reasons.some((reason) => reason.includes("SOURCE_ASSET_BINDING_REQUIRED")));
});
