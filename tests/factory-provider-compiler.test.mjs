import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { canonicalHash } from "../lib/canonical-json.ts";
import { planFactoryProductionCompilation, persistFactoryProductionCompilation } from "../lib/factory-production-compiler.ts";
import { resolveFactoryProviderRoute } from "../lib/factory-provider-gateway.ts";
import { createCanonicalTimebase } from "../lib/factory-runtime-contracts.ts";
import { reserveFactoryRuntimeWork, verifyFactoryRuntimeReplay } from "../lib/factory-runtime-writer.ts";

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

function setup() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys=ON");
  for (const migration of migrations) database.exec(read(`drizzle/${migration}`));
  return { database, db: d1(database) };
}

function execution() {
  let sequence = 0;
  return { now: () => new Date("2026-08-25T00:00:00.000Z"), id: (prefix) => `${prefix}-compiler-${++sequence}` };
}

function seedFoundation(database) {
  const timebase = createCanonicalTimebase({ frameRateNumerator: 30, frameRateDenominator: 1, audioSampleRateHz: 48_000, totalFrames: 90 });
  database.prepare(`INSERT INTO factory_canonical_timebases
    (id,video_id,contract_version,frame_rate_numerator,frame_rate_denominator,audio_sample_rate_hz,total_frames,total_audio_samples,rounding_policy,definition_hash)
    VALUES ('timebase-generic','video-generic-canary','FACTORY_RUNTIME_CONTRACT_V1',?,?,?,?,?,?,?)`).run(
      timebase.frameRateNumerator, timebase.frameRateDenominator, timebase.audioSampleRateHz, timebase.totalFrames, timebase.totalAudioSamples, timebase.roundingPolicy, hashA);
  database.prepare(`INSERT INTO factory_channel_visual_profile_versions
    (id,channel_id,version,policy_version,market,language,profile_json,input_hash,content_hash,lifecycle_state,created_by)
    VALUES ('visual-profile-generic','channel-generic',1,'VISUAL_POLICY_V1','US','en-US',?,?,?,'FROZEN','owner:test')`).run(
      JSON.stringify({ allowedRoutes: ["SOURCE", "MAKE", "HYBRID"], allowedTreatmentFamilies: ["DOCUMENTARY", "DIAGRAM", "CHART"], prohibitedPatterns: ["SLIDE_DECK"], maxConsecutiveTreatment: 2 }), hashA, hashB);
  database.prepare(`INSERT INTO factory_series_format_versions
    (id,channel_id,format_key,version,format_json,input_hash,content_hash,lifecycle_state,created_by)
    VALUES ('series-format-generic','channel-generic','EXPLAINER',1,?,?,?,'FROZEN','owner:test')`).run(JSON.stringify({ prohibitedPatterns: ["REPEATED_TOPOLOGY"] }), hashB, hashC);
  database.prepare(`INSERT INTO factory_providers
    (id,provider_key,provider_version,connection_ref,lifecycle_state,health_state,metadata_json)
    VALUES ('provider-internal','INTERNAL_CODE_ENGINE','V1',NULL,'ACTIVE','HEALTHY','{}')`).run();
  database.prepare(`INSERT INTO factory_capabilities
    (id,capability_key,capability_version,plane,input_schema_hash,output_schema_hash,lifecycle_state)
    VALUES ('capability-visual','VISUAL_SCENE_COMPOSITION','V1','PRODUCTION_MEDIA',?,?,'ACTIVE')`).run(hashD, hashE);
  database.prepare(`INSERT INTO factory_provider_bindings
    (id,provider_id,capability_id,binding_version,endpoint_or_model,model_version,input_schema_hash,output_schema_hash,settings_hash,rights_policy_version,retention_policy_version,rate_card_version,max_payload_bytes,timeout_ms,retry_ceiling,fallback_binding_id,priority,lifecycle_state)
    VALUES ('binding-visual','provider-internal','capability-visual','V1','internal:scene-compiler','V1',?,?,?,'RIGHTS_INTERNAL_V1','RETENTION_INTERNAL_V1','ZERO_COST_V1',1000000,30000,0,NULL,10,'ACTIVE')`).run(hashD, hashE, hashF);
  database.prepare(`INSERT INTO factory_capability_qualifications
    (id,binding_id,qualification_version,standard_version,qualified_archetypes_json,settings_hash,sample_size,first_pass_yield,p0_escape_count,evidence_hash,lifecycle_state,qualified_at)
    VALUES ('qualification-visual','binding-visual',1,'VISUAL_STANDARD_V3',?,?,12,1,0,?,'QUALIFIED','2026-08-24T00:00:00.000Z')`).run(JSON.stringify(["DOCUMENTARY", "MECHANISM", "QUANTITATIVE"]), hashF, hashA);
  database.prepare(`INSERT INTO factory_rights_eligibility_receipts
    (id,binding_id,rights_policy_version,retention_policy_version,commercial_use_state,evidence_hash,valid_from,expires_at)
    VALUES ('rights-visual','binding-visual','RIGHTS_INTERNAL_V1','RETENTION_INTERNAL_V1','ELIGIBLE',?,'2026-08-24T00:00:00.000Z','2027-08-24T00:00:00.000Z')`).run(hashB);
}

function routeCandidate(archetype, route, treatmentFamily) {
  return {
    route, treatmentFamily, capabilityKey: "VISUAL_SCENE_COMPOSITION", capabilityVersion: "V1", archetype,
    expectedOutputSchemaHash: hashE, requiredSettingsHash: hashF, standardVersion: "VISUAL_STANDARD_V3", rightsPolicyVersion: "RIGHTS_INTERNAL_V1",
    retentionPolicyVersion: "RETENTION_INTERNAL_V1", minimumSampleSize: 10, minimumFirstPassYield: 0.95, payloadBytes: 1024, requestedBindingId: "binding-visual",
  };
}

function compilationInput() {
  return {
    videoId: "video-generic-canary", version: 1, channelVisualProfileVersionId: "visual-profile-generic", seriesFormatVersionId: "series-format-generic",
    canonicalTimebaseId: "timebase-generic", claimGraphHash: hashC, narrationHash: hashD, createdBy: "owner:test",
    idempotencyKey: "factory:compilation:generic:0001", evidenceHash: hashE,
    segments: [
      { id: "segment-reality", claimId: "claim-reality", startFrame: 0, endFrameExclusive: 30, visualJob: "REALITY_ANCHOR", routeCandidate: routeCandidate("DOCUMENTARY", "SOURCE", "DOCUMENTARY"), evidenceHashes: [hashA] },
      { id: "segment-mechanism", claimId: "claim-mechanism", startFrame: 30, endFrameExclusive: 60, visualJob: "MECHANISM_EXPLANATION", routeCandidate: routeCandidate("MECHANISM", "MAKE", "DIAGRAM"), evidenceHashes: [hashB], objectContinuityKey: "object-flow" },
      { id: "segment-proof", claimId: "claim-proof", startFrame: 60, endFrameExclusive: 90, visualJob: "QUANTITATIVE_PROOF", routeCandidate: routeCandidate("QUANTITATIVE", "MAKE", "CHART"), evidenceHashes: [hashC], datasetHash: hashD },
    ],
  };
}

test("migration 0108 creates append-only Provider Gateway and compilation contracts", () => {
  assert.equal(migrations.at(-1), "0115_factory_assurance_calibration_and_qa_cockpit.sql");
  const migration = read("drizzle/0108_factory_provider_gateway_and_compilers.sql");
  for (const table of ["factory_providers", "factory_capabilities", "factory_provider_bindings", "factory_capability_qualifications", "factory_rights_eligibility_receipts", "factory_cost_envelopes", "factory_provider_work_requests", "factory_provider_route_decisions", "factory_production_compilation_receipts"]) {
    assert.ok(migration.includes("CREATE TABLE `" + table + "`"));
  }
  assert.match(migration, /PLANNED_ZERO_DISPATCH/);
  assert.match(migration, /FACTORY_PROVIDER_ROUTE_DECISIONS_APPEND_ONLY/);
  assert.doesNotMatch(migration, /api\.openai\.com|elevenlabs\.io|youtube-ai-factory-v2/);
});

test("Provider Gateway qualifies exact binding and blocks stale or dispatching requests", async () => {
  const { database, db } = setup();
  seedFoundation(database);
  const base = {
    videoId: "video-generic-canary", capabilityKey: "VISUAL_SCENE_COMPOSITION", capabilityVersion: "V1", archetype: "MECHANISM", inputHash: hashA,
    payloadBytes: 100, expectedOutputSchemaHash: hashE, requiredSettingsHash: hashF, standardVersion: "VISUAL_STANDARD_V3", rightsPolicyVersion: "RIGHTS_INTERNAL_V1",
    retentionPolicyVersion: "RETENTION_INTERNAL_V1", minimumSampleSize: 10, minimumFirstPassYield: 0.95, dispatchMode: "ZERO_DISPATCH", maxProviderRequests: 0,
    maxSpendMicros: 0, fallbackAllowed: false, requestedBindingId: "binding-visual", evaluatedAt: "2026-08-25T00:00:00.000Z",
  };
  const qualified = await resolveFactoryProviderRoute(db, base);
  assert.equal(qualified.decision, "PLANNED_ZERO_DISPATCH");
  assert.equal(qualified.bindingId, "binding-visual");
  assert.equal(qualified.providerRequests, 0);
  const dispatch = await resolveFactoryProviderRoute(db, { ...base, dispatchMode: "DISPATCH_ALLOWED", maxProviderRequests: 1, maxSpendMicros: 1000 });
  assert.equal(dispatch.decision, "BLOCKED");
  assert.ok(dispatch.reasons.includes("FACTORY_PROVIDER_DISPATCH_DISABLED"));
  const stale = await resolveFactoryProviderRoute(db, { ...base, standardVersion: "VISUAL_STANDARD_V4" });
  assert.equal(stale.decision, "BLOCKED");
  assert.ok(stale.reasons.includes("QUALIFICATION_STANDARD_MISMATCH"));
});

test("compiler deterministically persists exact blueprint, shots, scene graph, lineage and receipt through one writer", async () => {
  const { database, db } = setup(), run = execution();
  seedFoundation(database);
  const input = compilationInput();
  const planned = await planFactoryProductionCompilation(db, input);
  assert.equal(planned.outcome, "READY");
  assert.equal(planned.shots.length, 3);
  assert.equal(planned.providerRequests, 0);
  const same = await planFactoryProductionCompilation(db, input);
  assert.equal(same.outputHash, planned.outputHash);
  assert.deepEqual(same.sceneGraph, planned.sceneGraph);

  const reservation = await reserveFactoryRuntimeWork(db, {
    streamType: "VIDEO", streamId: input.videoId, stageKey: "BLUEPRINT_COMPILATION", expectedState: "READY", expectedVersion: 0, actorType: "SYSTEM", actorId: "system:compiler",
    idempotencyKey: "factory:compiler:lease:0001", intentHash: hashA, evidenceHash: hashB,
  }, run);
  const command = {
    streamType: "VIDEO", streamId: input.videoId, commandType: "PRODUCE_ARTIFACT", expectedState: "WorkReserved", expectedVersion: 1, actorType: "SYSTEM", actorId: "system:compiler",
    leaseId: reservation.leaseId, fencingToken: reservation.fencingToken, idempotencyKey: "factory:compiler:command:0001", intentHash: await canonicalHash({ input, planned: planned.outputHash }),
    policyVersions: { runtime: "V1", visual: "V3", provider: "V1" }, costScope: { mode: "ZERO_SPEND", maxProviderRequests: 0, maxSpendMicros: 0 },
    rightsScope: { policy: "RIGHTS_INTERNAL_V1", commercialUse: "ELIGIBLE" }, payload: { artifactKind: "PRODUCTION_PLAN_BUNDLE", providerRequests: 0, spendUsd: 0 }, evidenceHash: hashE,
  };
  const compiled = await persistFactoryProductionCompilation(db, input, command, run);
  assert.equal(compiled.outcome, "COMPILED");
  assert.equal(compiled.shotCount, 3);
  assert.equal(database.prepare("SELECT COUNT(*) total FROM factory_video_blueprints").get().total, 1);
  assert.equal(database.prepare("SELECT COUNT(*) total FROM factory_shot_contracts").get().total, 3);
  assert.equal(database.prepare("SELECT COUNT(*) total FROM factory_scene_graphs").get().total, 1);
  assert.equal(database.prepare("SELECT COUNT(*) total FROM factory_provider_route_decisions WHERE decision='PLANNED_ZERO_DISPATCH' AND provider_requests=0 AND spend_micros=0").get().total, 3);
  assert.equal(database.prepare("SELECT COUNT(*) total FROM factory_dependency_bindings").get().total, 1);
  assert.equal(database.prepare("SELECT zero_dispatch FROM factory_production_compilation_receipts").get().zero_dispatch, 1);
  const replay = await persistFactoryProductionCompilation(db, input, command, run);
  assert.equal(replay.outcome, "IDEMPOTENT_REPLAY");
  assert.equal(database.prepare("SELECT COUNT(*) total FROM factory_runtime_commands").get().total, 1);
  assert.equal((await verifyFactoryRuntimeReplay(db, { streamType: "VIDEO", streamId: input.videoId }, run)).verificationState, "PASS");
  assert.throws(() => database.prepare("UPDATE factory_provider_route_decisions SET decision='BLOCKED'").run(), /FACTORY_PROVIDER_ROUTE_DECISIONS_APPEND_ONLY/);
});

test("compiler fails closed on slide grammar, missing data proof and unqualified capability", async () => {
  const { database, db } = setup();
  seedFoundation(database);
  const input = compilationInput();
  input.segments[1].routeCandidate.treatmentFamily = "SLIDE_DECK";
  input.segments[2].datasetHash = null;
  input.segments[0].routeCandidate.standardVersion = "VISUAL_STANDARD_V4";
  const plan = await planFactoryProductionCompilation(db, input);
  assert.equal(plan.outcome, "BLOCKED");
  assert.ok(plan.reasons.some((reason) => reason.includes("PROHIBITED_SLIDE_GRAMMAR")));
  assert.ok(plan.reasons.some((reason) => reason.includes("VERIFIED_DATASET_HASH_REQUIRED")));
  assert.ok(plan.reasons.some((reason) => reason.includes("QUALIFICATION_STANDARD_MISMATCH")));
  assert.equal(plan.providerRequests, 0);
  assert.equal(plan.spendMicros, 0);
});
