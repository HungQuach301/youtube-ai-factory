import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { canonicalHash, canonicalStringify, CanonicalizationError } from "../lib/canonical-json.ts";
import {
  applyAtomicReservation,
  classifyProviderFailure,
  deriveArtifactIntegrityState,
  evaluateDispatchFirewall,
  evaluateFencedLease,
  evaluateSafetyScopeEvidence,
  lintFinancialSafety,
  redactTraceAttributes,
} from "../lib/production-integrity.ts";
import { evaluateElevenLabsCommercialEntitlement } from "../lib/elevenlabs-commercial-entitlement.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

test("canonical JSON is order-independent, NFC-normalized and rejects ambiguous inputs", async () => {
  const left = { z: 2, nested: { b: true, a: "e\u0301" }, a: -0 };
  const right = { a: 0, nested: { a: "é", b: true }, z: 2 };
  assert.equal(canonicalStringify(left), canonicalStringify(right));
  assert.equal(await canonicalHash(left), await canonicalHash(right));
  assert.throws(() => canonicalStringify({ invalid: undefined }), CanonicalizationError);
  assert.throws(() => canonicalStringify({ value: Number.NaN }), /NON_FINITE_NUMBER|NaN/);
  assert.throws(() => canonicalStringify({ "e\u0301": 1, "é": 2 }), /NFC normalization/);
});

test("immutability and downstream eligibility are independent", () => {
  const frozenButBlocked = deriveArtifactIntegrityState({ lifecycleState: "FROZEN", rightsEligible: true, costEligible: true, capabilityCurrent: true, hardGateStates: ["NOT_EVALUATED"] });
  assert.equal(frozenButBlocked.immutabilityState, "SEALED");
  assert.equal(frozenButBlocked.eligibilityState, "BLOCKED");
  const staleCapability = deriveArtifactIntegrityState({ lifecycleState: "FROZEN", rightsEligible: true, costEligible: true, capabilityCurrent: false, hardGateStates: ["PASS"] });
  assert.equal(staleCapability.eligibilityState, "REQUALIFICATION_REQUIRED");
});

test("M0 and M1 NOT_EVALUATED remain distinct and fail closed", () => {
  const result = evaluateSafetyScopeEvidence([
    { standardId: "VQ-M0-SAFETY-SCOPE", level: "M0", state: "NOT_EVALUATED" },
    { standardId: "VQ-M1-RIGHTS-LINEAGE", level: "M1", state: "FAIL", evidenceHash: "hash" },
  ]);
  assert.equal(result.eligible, false);
  assert.deepEqual(result.notEvaluated, ["VQ-M0-SAFETY-SCOPE"]);
  assert.deepEqual(result.failed, ["VQ-M1-RIGHTS-LINEAGE"]);
});

test("deterministic financial safety lint is high precision", () => {
  assert.equal(lintFinancialSafety("Authorization, clearing, and settlement are different institutional phases.").state, "PASS");
  assert.equal(lintFinancialSafety("Based on your income, you should invest in this fund.").state, "FAIL");
});

test("fencing rejects stale writers even while a replacement lease is active", () => {
  const lease = { id: "lease-new", stageKey: "09", fencingToken: 12, state: "ACTIVE", expiresAt: "2026-08-21T01:20:00.000Z", heartbeatAt: "2026-08-21T01:10:00.000Z" };
  const stale = evaluateFencedLease(lease, { leaseId: "lease-old", stageKey: "09", fencingToken: 11, nowIso: "2026-08-21T01:11:00.000Z", maximumHeartbeatAgeMs: 180_000 });
  assert.equal(stale.eligible, false);
  assert.ok(stale.reasons.includes("STALE_FENCING_TOKEN"));
  const current = evaluateFencedLease(lease, { leaseId: "lease-new", stageKey: "09", fencingToken: 12, nowIso: "2026-08-21T01:11:00.000Z", maximumHeartbeatAgeMs: 180_000 });
  assert.equal(current.eligible, true);
});

test("optimistic atomic reservations cannot concurrently exceed the ceiling", () => {
  const initial = { version: 7, maximumRequests: 10, maximumSpendUsd: 5, actualRequests: 8, actualSpendUsd: 4, reservedRequests: 0, reservedSpendUsd: 0 };
  const first = applyAtomicReservation(initial, { expectedVersion: 7, requests: 2, spendUsd: 1 });
  const concurrent = applyAtomicReservation(first.snapshot, { expectedVersion: 7, requests: 1, spendUsd: 0.1 });
  assert.equal(first.accepted, true);
  assert.equal(concurrent.accepted, false);
  assert.equal(concurrent.reason, "BUDGET_VERSION_CONFLICT");
});

test("dispatch firewall composes every prerequisite", () => {
  const base = { capabilityQualified: true, capabilitySettingsCurrent: true, leaseEligible: true, reservationState: "RESERVED", rightsState: "COMMERCIAL_LICENSE_VERIFIED", allowedRightsStates: ["COMMERCIAL_LICENSE_VERIFIED"], idempotencyKey: "dispatch:video01:09:0001", safetyRequired: true, safetyState: "PASS" };
  assert.equal(evaluateDispatchFirewall(base).authorized, true);
  const blocked = evaluateDispatchFirewall({ ...base, capabilitySettingsCurrent: false, safetyState: "NOT_EVALUATED" });
  assert.deepEqual(blocked.reasons, ["CAPABILITY_SETTINGS_SUPERSEDED", "SAFETY_SCOPE_NOT_EVALUATED"]);
});

test("failure taxonomy and trace redaction preserve incident evidence without secrets", () => {
  assert.equal(classifyProviderFailure("OPENAI_429_RATE_LIMIT"), "TRANSIENT");
  assert.equal(classifyProviderFailure("LICENSE_NOT_COMMERCIAL"), "RIGHTS");
  assert.deepEqual(redactTraceAttributes({ stage: "09", authorization: "Bearer secret", prompt: "private", count: 2 }), { stage: "09", authorization: "[REDACTED]", prompt: "[REDACTED]", count: 2 });
});

test("ElevenLabs commercial entitlement requires an explicit active paid base plan", () => {
  for (const tier of ["starter", "creator", "pro", "scale", "business", "enterprise"]) {
    assert.equal(evaluateElevenLabsCommercialEntitlement({ tier, status: "active" }).commercialUseEligible, true);
  }
  for (const subscription of [
    { tier: "payg", status: "active" },
    { tier: "free", status: "active" },
    { tier: "starter", status: "inactive" },
    { tier: "unknown", status: "active" },
    {},
  ]) assert.equal(evaluateElevenLabsCommercialEntitlement(subscription).commercialUseEligible, false);
  assert.equal(evaluateElevenLabsCommercialEntitlement({ tier: "payg", status: "active" }).state, "PAYG_BASE_PLAN_AMBIGUOUS");
});

test("every active V7 ElevenLabs synthesis path uses the shared entitlement evaluator", () => {
  for (const path of [
    "lib/controlled-fixture-materialization.ts",
    "lib/commercial-clean-audio-regeneration.ts",
    "app/api/factory/sequential-production/media/route.ts",
    "app/api/factory/sequential-production/quality/route.ts",
  ]) assert.match(read(path), /evaluateElevenLabsCommercialEntitlement/);
});

test("FP3.1 migration defines durable integrity state and atomic budget guards", () => {
  const migration = read("drizzle/0050_fp3_1_production_integrity.sql");
  for (const table of ["v7_integrity_fence_counters", "v7_integrity_cost_reservations", "v7_integrity_dispatch_traces", "v7_integrity_incidents"]) assert.match(migration, new RegExp(table));
  assert.match(migration, /immutability_state/);
  assert.match(migration, /eligibility_state/);
  assert.match(migration, /fencing_token/);
  assert.match(migration, /v7_sequential_one_active_lease_uq/);
  assert.match(migration, /INTEGRITY_STAGE_NOT_READY_FOR_LEASE/);
  assert.match(migration, /RAISE\(ABORT, 'INTEGRITY_REQUEST_CEILING_EXCEEDED'\)/);
  assert.match(migration, /RAISE\(ABORT, 'INTEGRITY_SPEND_CEILING_EXCEEDED'\)/);
  assert.match(migration, /RAISE\(ABORT, 'INTEGRITY_ACTUAL_SPEND_CEILING_EXCEEDED'\)/);
  assert.match(migration, /VQ-M0-SAFETY-SCOPE/);
  assert.doesNotMatch(migration, /api\.openai\.com|elevenlabs\.io|pexels\.com\/v1/);
});

test("all migrations replay and the real SQLite guards close concurrent and actual-cost overruns", () => {
  const db = new DatabaseSync(":memory:");
  const migrations = readdirSync(new URL("../drizzle", import.meta.url)).filter((name) => name.endsWith(".sql")).sort();
  const integrityMigrationIndex = migrations.indexOf("0050_fp3_1_production_integrity.sql");
  assert.ok(integrityMigrationIndex > 0);
  for (const migration of migrations.slice(0, integrityMigrationIndex)) db.exec(read(`drizzle/${migration}`));
  db.exec(`
    INSERT INTO v7_sequential_stage_runs
      (id,queue_id,stage_key,sequence,stage_name,owner_plane,lifecycle_state,gate_version,required_artifacts_json)
    VALUES
      ('historical-stage-09','historical-queue','09',9,'Visual','MEDIA_EXECUTION','RUNNING','V23.4','[]');
    INSERT INTO v7_sequential_leases
      (id,program_id,queue_id,stage_key,lifecycle_state,actor_email,acquired_at,expires_at,released_at)
    VALUES
      ('historical-lease-1','YTAF-V7-SEQUENTIAL','historical-queue','08','RELEASED','owner@example.test','2026-08-20T00:00:00.000Z','2026-08-20T00:15:00.000Z','2026-08-20T00:10:00.000Z'),
      ('historical-lease-2','YTAF-V7-SEQUENTIAL','historical-queue','08','RELEASED','owner@example.test','2026-08-20T01:00:00.000Z','2026-08-20T01:15:00.000Z','2026-08-20T01:10:00.000Z'),
      ('historical-lease-3','YTAF-V7-SEQUENTIAL','historical-queue','09','ACTIVE','owner@example.test','2026-08-20T02:00:00.000Z','2026-08-20T02:15:00.000Z',NULL),
      ('historical-lease-4','YTAF-V7-SEQUENTIAL','historical-queue','09','ACTIVE','owner@example.test','2026-08-21T00:00:00.000Z','2999-08-21T00:15:00.000Z',NULL);
  `);
  db.exec(read("drizzle/0050_fp3_1_production_integrity.sql"));
  for (const migration of migrations.slice(integrityMigrationIndex + 1)) db.exec(read(`drizzle/${migration}`));
  assert.equal(migrations.at(-1), "0109_factory_scene_renderer_and_workers.sql");
  const historicalLeases = db.prepare("SELECT id,fencing_token,lifecycle_state FROM v7_sequential_leases WHERE program_id='YTAF-V7-SEQUENTIAL' ORDER BY fencing_token").all();
  assert.deepEqual(historicalLeases.map((lease) => [lease.id, lease.fencing_token, lease.lifecycle_state]), [
    ["historical-lease-1", 1, "RELEASED"],
    ["historical-lease-2", 2, "RELEASED"],
    ["historical-lease-3", 3, "ORPHANED"],
    ["historical-lease-4", 4, "ACTIVE"],
  ]);
  assert.equal(db.prepare("SELECT active_fencing_token FROM v7_sequential_stage_runs WHERE id='historical-stage-09'").get().active_fencing_token, 4);
  assert.equal(db.prepare("SELECT next_token FROM v7_integrity_fence_counters WHERE program_id='YTAF-V7-SEQUENTIAL'").get().next_token, 4);
  const artifactColumns = db.prepare("PRAGMA table_info(v7_sequential_artifacts)").all().map((column) => column.name);
  assert.ok(artifactColumns.includes("immutability_state"));
  assert.ok(artifactColumns.includes("eligibility_state"));
  db.prepare(`INSERT INTO v7_sequential_budget_plans
    (id,program_id,queue_id,version,lifecycle_state,stage_scope_json,max_spend_usd,max_provider_requests,provider_plan_json,rights_plan_json,approved_by,approval_evidence_hash)
    VALUES ('integrity-plan','integrity-program','integrity-queue',1,'APPROVED','["09"]',2,2,'{}','{}','owner','hash')`).run();
  const insertReservation = db.prepare(`INSERT INTO v7_integrity_cost_reservations
    (id,plan_id,program_id,queue_id,stage_key,operation,providers_json,idempotency_key,intent_hash,lifecycle_state,reserved_provider_requests,reserved_spend_usd,lease_id,fencing_token,trace_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  insertReservation.run("reservation-1", "integrity-plan", "integrity-program", "integrity-queue", "09", "TEST", "[]", "key-1", "hash-1", "RESERVED", 2, 1, "lease-1", 1, "trace-1");
  assert.throws(() => insertReservation.run("reservation-2", "integrity-plan", "integrity-program", "integrity-queue", "09", "TEST", "[]", "key-2", "hash-2", "RESERVED", 1, 0, "lease-1", 1, "trace-2"), /INTEGRITY_REQUEST_CEILING_EXCEEDED/);
  assert.throws(() => db.prepare("UPDATE v7_sequential_budget_plans SET actual_spend_usd=2.01 WHERE id='integrity-plan'").run(), /INTEGRITY_ACTUAL_SPEND_CEILING_EXCEEDED/);
  db.prepare(`INSERT INTO v7_sequential_stage_runs (id,queue_id,stage_key,sequence,stage_name,owner_plane,lifecycle_state,gate_version,required_artifacts_json,eligibility_state)
    VALUES ('integrity-stage-09','integrity-queue','09',9,'Visual','MEDIA_EXECUTION','READY','V23.4','[]','BLOCKED')`).run();
  db.prepare(`INSERT INTO v7_sequential_stage_runs (id,queue_id,stage_key,sequence,stage_name,owner_plane,lifecycle_state,gate_version,required_artifacts_json,eligibility_state)
    VALUES ('integrity-stage-10','integrity-queue','10',10,'Audio','MEDIA_EXECUTION','READY','V23.4','[]','BLOCKED')`).run();
  const insertLease = db.prepare(`INSERT INTO v7_sequential_leases (id,program_id,queue_id,stage_key,lifecycle_state,actor_email,acquired_at,expires_at,fencing_token,heartbeat_at)
    VALUES (?,?,?,?, 'ACTIVE','owner@example.test','2026-08-21T00:00:00.000Z','2026-08-21T00:15:00.000Z',?,'2026-08-21T00:00:00.000Z')`);
  insertLease.run("integrity-lease-1", "integrity-program", "integrity-queue", "09", 1);
  assert.throws(() => insertLease.run("integrity-lease-2", "integrity-program", "integrity-queue", "10", 2), /UNIQUE constraint failed/);
});

test("every currently reachable sequential provider route imports the shared firewall", () => {
  for (const route of ["executor", "media", "quality"]) {
    const source = read(`app/api/factory/sequential-production/${route}/route.ts`);
    assert.match(source, /authorizeProductionDispatch/);
    assert.match(source, /readFencingHeaders/);
    assert.match(source, /reservation_id/);
    assert.match(source, /trace_id/);
  }
  const integrityRoute = read("app/api/factory/sequential-production/integrity/route.ts");
  assert.match(integrityRoute, /export async function GET\(request: Request\)/);
  assert.match(integrityRoute, /const \{ env \} = await authorized\(request\)/);
  assert.match(integrityRoute, /PROBE_DISPATCH_FIREWALL/);
  assert.match(integrityRoute, /BLOCKED_AS_EXPECTED/);
  assert.doesNotMatch(integrityRoute, /fetch\(/);
  assert.match(read("app/api/factory/sequential-production/media/route.ts"), /canonicalStringify\(JSON\.parse\(value\)\)/);
  assert.match(read("app/api/factory/sequential-production/quality/route.ts"), /canonicalStringify\(JSON\.parse\(value\)\)/);
  assert.match(read("lib/production-integrity-runtime.ts"), /INTEGRITY_IDEMPOTENT_REPLAY_BLOCKED/);
  assert.match(read("lib/production-integrity-runtime.ts"), /PROVIDER_NOT_IN_APPROVED_PLAN/);
  assert.match(read("lib/production-integrity-runtime.ts"), /lifecycle_state IN \('RUNNING','QUEUED'\) THEN 'FAILED'/);
  assert.match(read("app/api/factory/sequential-production/executor/route.ts"), /OPENAI_DISPATCH_NETWORK_ERROR/);
  assert.match(read("lib/sequential-production-command.ts"), /M0_SAFETY_SCOPE_PASS_REQUIRED/);
});
