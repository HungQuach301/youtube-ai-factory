import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  FactoryRuntimeError,
  heartbeatFactoryRuntimeLease,
  materializeFactoryDependencyStaleProjection,
  readFactoryRuntimeProjection,
  reconcileFactoryRuntimeOrphan,
  reserveFactoryRuntimeWork,
  submitFactoryRuntimeCommand,
  verifyFactoryRuntimeReplay,
} from "../lib/factory-runtime-writer.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const migrations = readdirSync(new URL("../drizzle", import.meta.url)).filter((name) => name.endsWith(".sql")).sort();
const hashA = "a".repeat(64), hashB = "b".repeat(64), hashC = "c".repeat(64);

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

function execution(nowIso, namespace = "run") {
  let sequence = 0;
  return { now: () => new Date(nowIso), id: (prefix) => `${prefix}-${namespace}-${++sequence}` };
}

function command(overrides = {}) {
  return {
    streamType: "VIDEO",
    streamId: "video-runtime-test",
    commandType: "START_STAGE",
    expectedState: "WorkReserved",
    expectedVersion: 1,
    actorType: "SYSTEM",
    actorId: "system:test",
    leaseId: "lease-placeholder",
    fencingToken: 1,
    idempotencyKey: "runtime:command:test:0001",
    intentHash: hashA,
    policyVersions: { runtime: "V1", quality: "V3" },
    costScope: { mode: "ZERO_SPEND", reservedSpendUsd: 0 },
    rightsScope: { policy: "RIGHTS_V1", state: "NO_EXTERNAL_ASSET" },
    payload: { providerRequests: 0, spendUsd: 0 },
    evidenceHash: hashB,
    ...overrides,
  };
}

test("migration 0107 installs guarded writer, lease, stale projection and replay receipts", () => {
  assert.equal(migrations.at(-1), "0111_factory_live_canary_qualification.sql");
  const migration = read("drizzle/0107_factory_runtime_writer_and_replay.sql");
  for (const table of [
    "factory_runtime_streams", "factory_runtime_fence_counters", "factory_runtime_leases", "factory_runtime_projection_checkpoints",
    "factory_artifact_stale_projections", "factory_dependency_projection_receipts", "factory_runtime_replay_receipts",
  ]) assert.ok(migration.includes("CREATE TABLE `" + table + "`"));
  for (const guard of ["FACTORY_RUNTIME_EVENT_VERSION_CONFLICT", "FACTORY_STALE_OR_INVALID_FENCING_TOKEN", "FACTORY_FENCING_TOKEN_NOT_MONOTONIC"]) assert.match(migration, new RegExp(guard));
  assert.doesNotMatch(migration, /api\.openai\.com|elevenlabs\.io|INSERT INTO `v7_youtube|DELETE FROM `factory_runtime_events`/);
  const { database } = setup();
  assert.throws(() => database.prepare(`INSERT INTO factory_runtime_events
    (id,stream_type,stream_id,stream_version,event_type,actor_type,actor_id,correlation_id,idempotency_key,intent_hash,payload_json,evidence_hash,occurred_at)
    VALUES ('event-gap','VIDEO','missing-stream',99,'PerformanceObserved','SYSTEM','test','correlation','runtime:event:gap:0001',?,'{}',?,'2026-08-25T00:00:00.000Z')`).run(hashA, hashB), /FACTORY_RUNTIME_EVENT_VERSION_CONFLICT/);
});

test("runtime API is authenticated, fail-closed and zero-spend by default", () => {
  const route = read("app/api/factory/runtime/route.ts");
  assert.match(route, /getChatGPTUser/);
  assert.match(route, /FACTORY_EXPERT_EMAILS/);
  assert.match(route, /FACTORY_RUNTIME_WRITER_ENABLED !== "true"/);
  assert.match(route, /FACTORY_RUNTIME_R22_AUTHORIZED/);
  assert.match(route, /ZERO_SPEND_RUNTIME_BOUNDARY_VIOLATED/);
  assert.match(route, /R22_RUNTIME_NOT_AUTHORIZED/);
  assert.doesNotMatch(route, /fetch\(|api\.openai\.com|elevenlabs\.io/);
});

test("single writer persists work reservation, command decision, checkpoints and exact replay", async () => {
  const { database, db } = setup(), run = execution("2026-08-25T00:00:00.000Z");
  const reservation = await reserveFactoryRuntimeWork(db, {
    streamType: "VIDEO", streamId: "video-runtime-test", stageKey: "STAGE_01", expectedState: "READY", expectedVersion: 0,
    actorType: "SYSTEM", actorId: "system:test", idempotencyKey: "runtime:lease:test:0001", intentHash: hashA, evidenceHash: hashB,
  }, run);
  assert.equal(reservation.outcome, "RESERVED");
  assert.equal(reservation.fencingToken, 1);
  const accepted = await submitFactoryRuntimeCommand(db, command({ leaseId: reservation.leaseId, fencingToken: reservation.fencingToken }), run);
  assert.equal(accepted.decision, "ACCEPTED");
  assert.equal(accepted.streamVersion, 2);
  const replayedCommand = await submitFactoryRuntimeCommand(db, command({ leaseId: reservation.leaseId, fencingToken: reservation.fencingToken }), run);
  assert.equal(replayedCommand.outcome, "IDEMPOTENT_REPLAY");
  assert.equal(database.prepare("SELECT COUNT(*) total FROM factory_runtime_commands").get().total, 1);
  assert.equal(database.prepare("SELECT COUNT(*) total FROM factory_runtime_events").get().total, 2);
  assert.equal(database.prepare("SELECT COUNT(*) total FROM factory_runtime_projection_checkpoints").get().total, 2);
  const heartbeat = await heartbeatFactoryRuntimeLease(db, { leaseId: reservation.leaseId, fencingToken: 1 }, run);
  assert.equal(heartbeat.outcome, "HEARTBEAT_RECORDED");
  const replay = await verifyFactoryRuntimeReplay(db, { streamType: "VIDEO", streamId: "video-runtime-test" }, run);
  assert.equal(replay.verificationState, "PASS");
  assert.deepEqual(replay.failureReasons, []);
  const replayAgain = await verifyFactoryRuntimeReplay(db, { streamType: "VIDEO", streamId: "video-runtime-test" }, run);
  assert.equal(replayAgain.outcome, "IDEMPOTENT_REPLAY");
  assert.equal(database.prepare("SELECT COUNT(*) total FROM factory_runtime_replay_receipts").get().total, 1);
  assert.throws(() => database.prepare("UPDATE factory_runtime_replay_receipts SET verification_state='FAIL'").run(), /FACTORY_RUNTIME_REPLAY_RECEIPT_IMMUTABLE/);
});

test("concurrent expected-version writers create one effect and persist the losing decision", async () => {
  const { database, db } = setup(), run = execution("2026-08-25T00:00:00.000Z");
  const reservation = await reserveFactoryRuntimeWork(db, {
    streamType: "VIDEO", streamId: "video-runtime-test", stageKey: "STAGE_01", expectedState: "READY", expectedVersion: 0,
    actorType: "SYSTEM", actorId: "system:test", idempotencyKey: "runtime:lease:test:0001", intentHash: hashA, evidenceHash: hashB,
  }, run);
  await submitFactoryRuntimeCommand(db, command({ leaseId: reservation.leaseId, fencingToken: 1 }), run);
  const producer = (suffix, evidenceHash) => submitFactoryRuntimeCommand(db, command({
    commandType: "PRODUCE_ARTIFACT", expectedVersion: 2, leaseId: reservation.leaseId, fencingToken: 1,
    idempotencyKey: `runtime:command:produce:${suffix}`, intentHash: evidenceHash, evidenceHash,
    payload: { artifactVersionId: `artifact-${suffix}`, providerRequests: 0, spendUsd: 0 },
  }), run);
  const decisions = await Promise.all([producer("0001", hashB), producer("0002", hashC)]);
  assert.deepEqual(decisions.map((item) => item.decision).sort(), ["ACCEPTED", "REJECTED"]);
  assert.equal(database.prepare("SELECT COUNT(*) total FROM factory_runtime_events WHERE event_type='ArtifactMaterialized'").get().total, 1);
  assert.equal(database.prepare("SELECT COUNT(*) total FROM factory_runtime_events WHERE event_type='CommandRejected'").get().total, 1);
  const versions = database.prepare("SELECT stream_version FROM factory_runtime_events ORDER BY stream_version").all().map((row) => row.stream_version);
  assert.deepEqual(versions, [1, 2, 3, 4, 5]);
  assert.equal(new Set(versions).size, versions.length);
  const projection = await readFactoryRuntimeProjection(db, { streamType: "VIDEO", streamId: "video-runtime-test" });
  assert.equal(projection.stream.current_state, "ArtifactMaterialized");
  assert.equal(projection.providerRequests, 0);
  assert.equal(projection.spendUsd, 0);
});

test("orphan recovery issues a higher fence and rejects the stale worker", async () => {
  const { database, db } = setup();
  const firstRun = execution("2026-08-25T00:00:00.000Z"), lateRun = execution("2026-08-25T00:01:00.000Z");
  const firstLease = await reserveFactoryRuntimeWork(db, {
    streamType: "VIDEO", streamId: "video-runtime-test", stageKey: "STAGE_01", expectedState: "READY", expectedVersion: 0,
    actorType: "SYSTEM", actorId: "system:test", idempotencyKey: "runtime:lease:test:0001", intentHash: hashA, evidenceHash: hashB, leaseDurationMs: 30_000,
  }, firstRun);
  const orphan = await reconcileFactoryRuntimeOrphan(db, {
    streamType: "VIDEO", streamId: "video-runtime-test", actorType: "SYSTEM", actorId: "system:test", idempotencyKey: "runtime:orphan:test:0001", intentHash: hashB, evidenceHash: hashC,
  }, lateRun);
  assert.equal(orphan.outcome, "ORPHAN_RECONCILED");
  const secondLease = await reserveFactoryRuntimeWork(db, {
    streamType: "VIDEO", streamId: "video-runtime-test", stageKey: "STAGE_01", expectedState: "ExceptionRouted", expectedVersion: 2,
    actorType: "SYSTEM", actorId: "system:test", idempotencyKey: "runtime:lease:test:0002", intentHash: hashB, evidenceHash: hashC,
  }, lateRun);
  assert.equal(secondLease.fencingToken, 2);
  await assert.rejects(() => heartbeatFactoryRuntimeLease(db, { leaseId: firstLease.leaseId, fencingToken: 1 }, lateRun), (error) => error instanceof FactoryRuntimeError && error.code === "STALE_OR_INVALID_FENCING_LEASE");
  const staleDecision = await submitFactoryRuntimeCommand(db, command({
    expectedVersion: 3, leaseId: firstLease.leaseId, fencingToken: 1, idempotencyKey: "runtime:command:stale:0001", intentHash: hashC, evidenceHash: hashC,
  }), lateRun);
  assert.equal(staleDecision.decision, "REJECTED");
  assert.ok(staleDecision.reasons.includes("LEASE_NOT_ACTIVE"));
  assert.equal(database.prepare("SELECT lifecycle_state FROM factory_runtime_leases WHERE id=?").get(firstLease.leaseId).lifecycle_state, "ORPHANED");
});

test("DependencyStale event materializes every transitive downstream artifact exactly once", async () => {
  const { database, db } = setup(), run = execution("2026-08-25T00:00:00.000Z");
  const reservation = await reserveFactoryRuntimeWork(db, {
    streamType: "VIDEO", streamId: "video-runtime-test", stageKey: "STAGE_ROOT", expectedState: "READY", expectedVersion: 0,
    actorType: "SYSTEM", actorId: "system:test", idempotencyKey: "runtime:lease:test:0001", intentHash: hashA, evidenceHash: hashB,
  }, run);
  const started = await submitFactoryRuntimeCommand(db, command({ leaseId: reservation.leaseId, fencingToken: 1 }), run);
  const createdByEventId = started.eventIds[0];
  for (const [id, artifactId, version, contentHash] of [["artifact-a-v1", "artifact-a", 1, hashA], ["artifact-b-v1", "artifact-b", 1, hashB], ["artifact-c-v1", "artifact-c", 1, hashC]]) {
    database.prepare(`INSERT INTO factory_artifact_versions
      (id,artifact_id,version,artifact_kind,source_entity_type,source_entity_id,content_hash,lineage_json,lifecycle_state)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(id, artifactId, version, "PLANNING", "VIDEO", "video-runtime-test", contentHash, "{}", "FROZEN");
  }
  database.prepare(`INSERT INTO factory_dependency_bindings
    (id,upstream_artifact_version_id,downstream_artifact_version_id,dependency_type,binding_hash,created_by_event_id)
    VALUES ('binding-a-b','artifact-a-v1','artifact-b-v1','COMPILED_FROM',? ,?)`).run(hashA, createdByEventId);
  database.prepare(`INSERT INTO factory_dependency_bindings
    (id,upstream_artifact_version_id,downstream_artifact_version_id,dependency_type,binding_hash,created_by_event_id)
    VALUES ('binding-b-c','artifact-b-v1','artifact-c-v1','COMPILED_FROM',? ,?)`).run(hashB, createdByEventId);
  const reopened = await submitFactoryRuntimeCommand(db, command({
    commandType: "REOPEN_ROOT_STAGE", expectedVersion: 2, leaseId: reservation.leaseId, fencingToken: 1,
    idempotencyKey: "runtime:command:reopen:0001", intentHash: hashC, evidenceHash: hashC, payload: { changedArtifactVersionIds: ["artifact-a-v1"], reason: "Upstream claim changed" },
  }), run);
  assert.equal(reopened.decision, "ACCEPTED");
  const staleEvent = database.prepare("SELECT id FROM factory_runtime_events WHERE command_id=? AND event_type='DependencyStale'").get(reopened.commandId);
  const projection = await materializeFactoryDependencyStaleProjection(db, { staleEventId: staleEvent.id, changedArtifactVersionIds: ["artifact-a-v1"], reason: "Upstream claim changed" }, run);
  assert.deepEqual(projection.staleBindingIds, ["binding-a-b", "binding-b-c"]);
  assert.deepEqual(projection.staleArtifactVersionIds, ["artifact-b-v1", "artifact-c-v1"]);
  assert.equal(database.prepare("SELECT COUNT(*) total FROM factory_dependency_invalidations").get().total, 2);
  assert.deepEqual(database.prepare("SELECT artifact_version_id FROM factory_artifact_stale_projections ORDER BY artifact_version_id").all().map((row) => row.artifact_version_id), ["artifact-b-v1", "artifact-c-v1"]);
  const replay = await materializeFactoryDependencyStaleProjection(db, { staleEventId: staleEvent.id, changedArtifactVersionIds: ["artifact-a-v1"], reason: "Upstream claim changed" }, run);
  assert.equal(replay.outcome, "IDEMPOTENT_REPLAY");
  const exact = await verifyFactoryRuntimeReplay(db, { streamType: "VIDEO", streamId: "video-runtime-test" }, run);
  assert.equal(exact.verificationState, "PASS");
});
