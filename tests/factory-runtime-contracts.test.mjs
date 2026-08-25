import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  assertFactoryRuntimeCommand,
  assertFactoryRuntimeEvent,
  createCanonicalTimebase,
  frameToSample,
  replayFactoryRuntimeEvents,
  resolveStaleDependencies,
  sampleToFrame,
  validateCanonicalTimebase,
  validateShotCoverage,
} from "../lib/factory-runtime-contracts.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const hash = "a".repeat(64);

test("canonical timebase uses deterministic integer frame and sample conversion", () => {
  const timebase = createCanonicalTimebase({ frameRateNumerator: 30_000, frameRateDenominator: 1_001, audioSampleRateHz: 48_000, totalFrames: 1_800 });
  assert.deepEqual(validateCanonicalTimebase(timebase), { valid: true, reasons: [], deltaSamples: 0 });
  assert.equal(frameToSample(0, timebase), 0);
  assert.equal(frameToSample(timebase.totalFrames, timebase), timebase.totalAudioSamples);
  for (const frame of [1, 30, 899, 1_799, 1_800]) assert.ok(Math.abs(sampleToFrame(frameToSample(frame, timebase), timebase) - frame) <= 1);
  assert.throws(() => createCanonicalTimebase({ frameRateNumerator: 0, frameRateDenominator: 1, audioSampleRateHz: 48_000, totalFrames: 10 }), /FRAME_RATE_NUMERATOR/);
  assert.throws(() => frameToSample(1_801, timebase), /FRAME_OUT_OF_RANGE/);
  const normalized = createCanonicalTimebase({ frameRateNumerator: 60_000, frameRateDenominator: 2_002, audioSampleRateHz: 48_000, totalFrames: 1_800 });
  assert.equal(normalized.frameRateNumerator, 30_000);
  assert.equal(normalized.frameRateDenominator, 1_001);
  assert.equal(normalized.totalAudioSamples, timebase.totalAudioSamples);
});

test("shot coverage rejects gaps, overlaps and non-contiguous sequence", () => {
  const valid = validateShotCoverage([
    { id: "shot-1", sequence: 1, startFrame: 0, endFrameExclusive: 300 },
    { id: "shot-2", sequence: 2, startFrame: 300, endFrameExclusive: 900 },
  ], 900);
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.reasons, []);
  const invalid = validateShotCoverage([
    { id: "shot-1", sequence: 1, startFrame: 0, endFrameExclusive: 301 },
    { id: "shot-3", sequence: 3, startFrame: 300, endFrameExclusive: 850 },
  ], 900);
  assert.equal(invalid.valid, false);
  assert.ok(invalid.reasons.includes("SHOT_OVERLAP:300-301"));
  assert.ok(invalid.reasons.includes("SHOT_SEQUENCE_INVALID:shot-3"));
  assert.ok(invalid.reasons.includes("SHOT_GAP:850-900"));
});

test("dependency invalidation resolves every transitive downstream artifact once", () => {
  const result = resolveStaleDependencies([
    { id: "binding-1", upstreamArtifactVersionId: "claim-v1", downstreamArtifactVersionId: "blueprint-v1" },
    { id: "binding-2", upstreamArtifactVersionId: "blueprint-v1", downstreamArtifactVersionId: "scene-v1" },
    { id: "binding-3", upstreamArtifactVersionId: "scene-v1", downstreamArtifactVersionId: "master-v1" },
    { id: "binding-cycle", upstreamArtifactVersionId: "master-v1", downstreamArtifactVersionId: "blueprint-v1" },
    { id: "unrelated", upstreamArtifactVersionId: "other-v1", downstreamArtifactVersionId: "other-v2" },
  ], ["claim-v1"]);
  assert.deepEqual(result.staleBindingIds, ["binding-1", "binding-2", "binding-3", "binding-cycle"]);
  assert.deepEqual(result.staleArtifactVersionIds, ["blueprint-v1", "master-v1", "scene-v1"]);
});

test("runtime event contract fails closed on unsupported or unbound evidence", () => {
  assert.equal(assertFactoryRuntimeEvent({ eventType: "ArtifactVerified", streamVersion: 1, idempotencyKey: "runtime:event:0001", intentHash: hash, evidenceHash: hash, fencingToken: 1 }).valid, true);
  assert.deepEqual(assertFactoryRuntimeEvent({ eventType: "PASS", streamVersion: 0, idempotencyKey: "short", intentHash: "bad", evidenceHash: "bad", fencingToken: 0 }).reasons, [
    "EVENT_TYPE_UNSUPPORTED", "STREAM_VERSION_INVALID", "IDEMPOTENCY_KEY_INVALID", "INTENT_HASH_INVALID", "EVIDENCE_HASH_INVALID", "FENCING_TOKEN_INVALID",
  ]);
});

test("typed command envelopes require state/version, fencing, policy, cost and rights scope", () => {
  const valid = assertFactoryRuntimeCommand({
    commandType: "START_STAGE", expectedState: "READY", expectedVersion: 0, actorType: "OWNER", actorId: "owner:hung",
    leaseId: "lease:r22:stage:00", fencingToken: 1, idempotencyKey: "runtime:command:r22:0001", intentHash: hash,
    policyVersions: { runtime: "V1", quality: "V3" }, costScope: { budgetPlanId: "budget:r22:v1" }, rightsScope: { policy: "RIGHTS_V1" },
  });
  assert.deepEqual(valid, { valid: true, reasons: [] });
  const blocked = assertFactoryRuntimeCommand({
    commandType: "RUN_ANYTHING", expectedState: "", expectedVersion: -1, actorType: "PROVIDER", actorId: "x",
    leaseId: "short", fencingToken: 0, idempotencyKey: "short", intentHash: "bad", policyVersions: {}, costScope: {}, rightsScope: {},
  });
  assert.deepEqual(blocked.reasons, [
    "COMMAND_TYPE_UNSUPPORTED", "EXPECTED_STATE_INVALID", "EXPECTED_VERSION_INVALID", "ACTOR_TYPE_INVALID", "ACTOR_ID_INVALID", "LEASE_ID_INVALID",
    "FENCING_TOKEN_INVALID", "IDEMPOTENCY_KEY_INVALID", "INTENT_HASH_INVALID", "POLICY_VERSIONS_INVALID", "COST_SCOPE_INVALID", "RIGHTS_SCOPE_INVALID",
  ]);
});

test("runtime event replay is deterministic and rejects missing versions or mixed streams", () => {
  const events = [
    { id: "event-2", streamType: "VIDEO", streamId: "r22", streamVersion: 2, eventType: "StageFrozen", idempotencyKey: "runtime:event:r22:0002", intentHash: hash, evidenceHash: hash, fencingToken: 2 },
    { id: "event-1", streamType: "VIDEO", streamId: "r22", streamVersion: 1, eventType: "CommandAccepted", idempotencyKey: "runtime:event:r22:0001", intentHash: hash, evidenceHash: hash, fencingToken: 1 },
  ];
  assert.deepEqual(replayFactoryRuntimeEvents(events), { state: "StageFrozen", streamVersion: 2, eventCount: 2, headEventId: "event-2", headEvidenceHash: hash });
  assert.throws(() => replayFactoryRuntimeEvents([{ ...events[0], streamVersion: 3 }, events[1]]), /RUNTIME_EVENT_VERSION_GAP/);
  assert.throws(() => replayFactoryRuntimeEvents([events[1], { ...events[0], streamId: "other" }]), /RUNTIME_EVENT_STREAM_MISMATCH/);
});

test("Phase 45 contract migration replays and enforces immutable exact-lineage records", () => {
  const migrations = readdirSync(new URL("../drizzle", import.meta.url)).filter((name) => name.endsWith(".sql")).sort();
  assert.equal(migrations.at(-1), "0107_factory_runtime_writer_and_replay.sql");
  const migration = read("drizzle/0106_factory_runtime_contract_foundation.sql");
  for (const table of [
    "factory_contract_registry", "factory_canonical_timebases", "factory_runtime_commands", "factory_runtime_events", "factory_channel_visual_profile_versions",
    "factory_series_format_versions", "factory_video_blueprints", "factory_shot_contracts", "factory_scene_graphs", "factory_artifact_versions",
    "factory_dependency_bindings", "factory_dependency_invalidations",
  ]) assert.ok(migration.includes(`CREATE TABLE \`${table}\``));
  assert.doesNotMatch(migration, /api\.openai\.com|elevenlabs\.io|pexels\.com|INSERT INTO `v7_youtube/);

  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  for (const name of migrations) db.exec(read(`drizzle/${name}`));
  db.prepare(`INSERT INTO factory_canonical_timebases
    (id,video_id,contract_version,frame_rate_numerator,frame_rate_denominator,audio_sample_rate_hz,total_frames,total_audio_samples,rounding_policy,definition_hash)
    VALUES ('timebase-1','video-1','FACTORY_RUNTIME_CONTRACT_V1',30000,1001,48000,1800,2882880,'HALF_AWAY_FROM_ZERO_V1',?)`).run(hash);
  db.prepare(`INSERT INTO factory_runtime_commands
    (id,stream_type,stream_id,command_type,expected_state,expected_version,actor_type,actor_id,lease_id,fencing_token,idempotency_key,intent_hash,policy_versions_json,cost_scope_json,rights_scope_json,received_at)
    VALUES ('command-1','VIDEO','video-1','START_STAGE','READY',0,'SYSTEM','test','lease:video:stage:01',1,'runtime:command:test:0001',?,'{"runtime":"V1"}','{"budget":"plan-1"}','{"policy":"RIGHTS_V1"}','2026-08-25T00:00:00.000Z')`).run(hash);
  db.prepare(`INSERT INTO factory_runtime_streams
    (stream_type,stream_id,current_version,current_state,updated_at)
    VALUES ('VIDEO','video-1',0,'READY','2026-08-25T00:00:00.000Z')`).run();
  db.prepare(`INSERT INTO factory_runtime_events
    (id,stream_type,stream_id,stream_version,event_type,actor_type,actor_id,command_id,correlation_id,fencing_token,idempotency_key,intent_hash,payload_json,evidence_hash,occurred_at)
    VALUES ('event-1','VIDEO','video-1',1,'CommandRejected','SYSTEM','test','command-1','correlation-1',1,'runtime:event:test:0001',?,'{}',?,'2026-08-25T00:00:00.000Z')`).run(hash, hash);
  assert.throws(() => db.prepare("UPDATE factory_runtime_commands SET expected_state='RUNNING' WHERE id='command-1'").run(), /FACTORY_RUNTIME_COMMAND_IMMUTABLE/);
  assert.throws(() => db.prepare("UPDATE factory_runtime_events SET event_type='StageFrozen' WHERE id='event-1'").run(), /FACTORY_RUNTIME_EVENT_IMMUTABLE/);
  assert.throws(() => db.prepare("DELETE FROM factory_canonical_timebases WHERE id='timebase-1'").run(), /FACTORY_TIMEBASE_IMMUTABLE/);
  assert.throws(() => db.prepare(`INSERT INTO factory_runtime_events
    (id,stream_type,stream_id,stream_version,event_type,actor_type,actor_id,correlation_id,idempotency_key,intent_hash,payload_json,evidence_hash,occurred_at)
    VALUES ('event-2','VIDEO','video-1',1,'CommandRejected','SYSTEM','test','correlation-1','runtime:event:test:0002',?,'{}',?,'2026-08-25T00:00:01.000Z')`).run(hash, hash), /FACTORY_RUNTIME_EVENT_VERSION_CONFLICT/);
  assert.throws(() => db.prepare(`INSERT INTO factory_contract_registry
    (id,contract_key,contract_version,scope,schema_json,schema_hash,lifecycle_state)
    VALUES ('contract-1','VIDEO_BLUEPRINT','V1','VIDEO','not-json',?,'ACTIVE')`).run(hash), /CHECK constraint failed/);
});
