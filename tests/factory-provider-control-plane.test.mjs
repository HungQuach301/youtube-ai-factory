import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { resolveFactoryProviderRoute } from "../lib/factory-provider-gateway.ts";
import {
  authorizeFactoryProviderFallbackPlan,
  reconcileFactoryProviderRequest,
  recordFactoryProviderDriftObservation,
  reserveFactoryProviderCostPlan,
} from "../lib/factory-provider-control-plane.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const migrations = readdirSync(new URL("../drizzle", import.meta.url)).filter((name) => name.endsWith(".sql")).sort();
const hashA = "a".repeat(64), hashB = "b".repeat(64), hashC = "c".repeat(64), hashD = "d".repeat(64), hashE = "e".repeat(64), hashF = "f".repeat(64);

function d1(database) {
  return {
    prepare(query) {
      const statement = database.prepare(query); let values = [];
      return {
        bind(...next) { values = next; return this; },
        async first() { return statement.get(...values) ?? null; },
        async all() { return { results: statement.all(...values) }; },
        async run() { const result = statement.run(...values); return { success: true, meta: { changes: result.changes } }; },
      };
    },
    async batch(statements) {
      database.exec("BEGIN IMMEDIATE");
      try { const output = []; for (const statement of statements) output.push(await statement.run()); database.exec("COMMIT"); return output; }
      catch (error) { database.exec("ROLLBACK"); throw error; }
    },
  };
}

function setup() {
  const database = new DatabaseSync(":memory:"); database.exec("PRAGMA foreign_keys=ON");
  for (const migration of migrations) database.exec(read(`drizzle/${migration}`));
  seed(database);
  return { database, db: d1(database) };
}

function seed(database) {
  database.prepare(`INSERT INTO factory_providers (id,provider_key,provider_version,connection_ref,lifecycle_state,health_state,metadata_json)
    VALUES ('provider-primary','PRIMARY_PROVIDER','V1','connection:primary','ACTIVE','HEALTHY','{}'),('provider-fallback','FALLBACK_PROVIDER','V1','connection:fallback','ACTIVE','HEALTHY','{}')`).run();
  database.prepare(`INSERT INTO factory_capabilities (id,capability_key,capability_version,plane,input_schema_hash,output_schema_hash,lifecycle_state)
    VALUES ('capability-vision','VISION_JUDGE','V1','EVIDENCE_ASSURANCE',?,?,'ACTIVE')`).run(hashD, hashE);
  database.prepare(`INSERT INTO factory_provider_bindings
    (id,provider_id,capability_id,binding_version,endpoint_or_model,model_version,input_schema_hash,output_schema_hash,settings_hash,rights_policy_version,retention_policy_version,rate_card_version,max_payload_bytes,timeout_ms,retry_ceiling,fallback_binding_id,priority,lifecycle_state)
    VALUES ('binding-fallback','provider-fallback','capability-vision','V1','fallback:model','MODEL_V1',?,?,?,'RIGHTS_V1','RETENTION_V1','RATE_V1',1000000,30000,0,NULL,20,'ACTIVE')`).run(hashD, hashE, hashF);
  database.prepare(`INSERT INTO factory_provider_bindings
    (id,provider_id,capability_id,binding_version,endpoint_or_model,model_version,input_schema_hash,output_schema_hash,settings_hash,rights_policy_version,retention_policy_version,rate_card_version,max_payload_bytes,timeout_ms,retry_ceiling,fallback_binding_id,priority,lifecycle_state)
    VALUES ('binding-primary','provider-primary','capability-vision','V1','primary:model','MODEL_V1',?,?,?,'RIGHTS_V1','RETENTION_V1','RATE_V1',1000000,30000,0,'binding-fallback',10,'ACTIVE')`).run(hashD, hashE, hashF);
  database.prepare(`INSERT INTO factory_capability_qualifications
    (id,binding_id,qualification_version,standard_version,qualified_archetypes_json,settings_hash,sample_size,first_pass_yield,p0_escape_count,evidence_hash,lifecycle_state,qualified_at,expires_at)
    VALUES ('qualification-primary','binding-primary',1,'STANDARD_V1','["DOCUMENTARY"]',?,20,1,0,?,'QUALIFIED','2026-08-24T00:00:00.000Z','2027-08-24T00:00:00.000Z'),
           ('qualification-fallback','binding-fallback',1,'STANDARD_V1','["DOCUMENTARY"]',?,20,1,0,?,'QUALIFIED','2026-08-24T00:00:00.000Z','2027-08-24T00:00:00.000Z')`).run(hashF, hashA, hashF, hashB);
  database.prepare(`INSERT INTO factory_rights_eligibility_receipts
    (id,binding_id,rights_policy_version,retention_policy_version,commercial_use_state,evidence_hash,valid_from,expires_at)
    VALUES ('rights-primary','binding-primary','RIGHTS_V1','RETENTION_V1','ELIGIBLE',?,'2026-08-24T00:00:00.000Z','2027-08-24T00:00:00.000Z'),
           ('rights-fallback','binding-fallback','RIGHTS_V1','RETENTION_V1','ELIGIBLE',?,'2026-08-24T00:00:00.000Z','2027-08-24T00:00:00.000Z')`).run(hashA, hashB);
  database.prepare(`INSERT INTO factory_runtime_commands
    (id,stream_type,stream_id,command_type,expected_state,expected_version,actor_type,actor_id,lease_id,fencing_token,idempotency_key,intent_hash,policy_versions_json,cost_scope_json,rights_scope_json,received_at)
    VALUES ('command-provider-plan','VIDEO','video-provider-control','PRODUCE_ARTIFACT','READY',0,'SYSTEM','system:provider-control','lease-provider-control',1,'factory:provider:control:command:0001',?,'{}','{}','{}','2026-08-25T00:00:00.000Z')`).run(hashA);
  database.prepare(`INSERT INTO factory_runtime_streams (stream_type,stream_id,current_version,current_state,updated_at)
    VALUES ('VIDEO','video-provider-control',0,'READY','2026-08-25T00:00:00.000Z')`).run();
  database.prepare(`INSERT INTO factory_runtime_events
    (id,stream_type,stream_id,stream_version,event_type,actor_type,actor_id,command_id,correlation_id,idempotency_key,intent_hash,payload_json,evidence_hash,occurred_at)
    VALUES ('event-provider-plan','VIDEO','video-provider-control',1,'CommandRejected','SYSTEM','system:provider-control','command-provider-plan','correlation-provider-control','factory:provider:control:event:0001',?,'{}',?,'2026-08-25T00:00:00.000Z')`).run(hashA, hashB);
  database.prepare(`INSERT INTO factory_provider_work_requests
    (id,video_id,capability_key,capability_version,archetype,input_hash,payload_bytes,expected_output_schema_hash,required_settings_hash,rights_policy_version,retention_policy_version,dispatch_mode,max_provider_requests,max_spend_micros,fallback_allowed,idempotency_key,intent_hash,created_by_command_id)
    VALUES ('work-request-provider-plan','video-provider-control','VISION_JUDGE','V1','DOCUMENTARY',?,1000,?,?,'RIGHTS_V1','RETENTION_V1','PLAN_ONLY',1,1000,0,'factory:provider:work-request:0001',?,'command-provider-plan')`).run(hashC, hashE, hashF, hashA);
  database.prepare(`INSERT INTO factory_provider_route_decisions
    (id,work_request_id,binding_id,qualification_id,decision,reasons_json,provider_requests,spend_micros,fallback_used,decision_hash,created_by_event_id)
    VALUES ('route-provider-plan','work-request-provider-plan','binding-primary','qualification-primary','PLANNED_ZERO_DISPATCH','[]',0,0,0,?,'event-provider-plan')`).run(hashB);
  database.prepare(`INSERT INTO factory_cost_envelopes
    (id,scope_type,scope_id,currency,max_spend_micros,max_provider_requests,policy_version,lifecycle_state,evidence_hash)
    VALUES ('cost-envelope-provider-plan','VIDEO','video-provider-control','USD',1000,1,'COST_POLICY_V1','ACTIVE',?)`).run(hashC);
}

function routeInput(overrides = {}) {
  return {
    videoId: "video-provider-control", capabilityKey: "VISION_JUDGE", capabilityVersion: "V1", archetype: "DOCUMENTARY", inputHash: hashC,
    payloadBytes: 1000, expectedOutputSchemaHash: hashE, requiredSettingsHash: hashF, standardVersion: "STANDARD_V1", rightsPolicyVersion: "RIGHTS_V1",
    retentionPolicyVersion: "RETENTION_V1", minimumSampleSize: 10, minimumFirstPassYield: 0.95, dispatchMode: "PLAN_ONLY", maxProviderRequests: 1,
    maxSpendMicros: 1000, fallbackAllowed: false, requestedBindingId: "binding-primary", evaluatedAt: "2026-08-25T00:00:00.000Z", ...overrides,
  };
}

test("migration 0113 installs append-only provider cost, native reconciliation, drift and explicit fallback controls", () => {
  assert.equal(migrations.at(-1), "0127_factory_assurance_audio_route_reservation.sql");
  const migration = read("drizzle/0113_factory_provider_cost_reconciliation_and_drift.sql");
  for (const table of ["factory_provider_cost_reservations", "factory_provider_native_request_receipts", "factory_provider_reconciliation_receipts", "factory_provider_drift_receipts", "factory_provider_fallback_authorizations"]) assert.ok(migration.includes("CREATE TABLE `" + table + "`"));
  assert.match(migration, /FACTORY_PROVIDER_COST_ENVELOPE_EXCEEDED/);
  assert.match(migration, /dispatch_authority.*= 0/);
  assert.match(migration, /retry_authority.*= 0/);
  assert.doesNotMatch(migration, /api\.openai\.com|elevenlabs\.io|youtube-ai-factory-v2/);
});

test("atomic cost reservation stays plan-only and native reconciliation blocks retry until provider history resolves", async () => {
  const { database, db } = setup();
  const input = {
    workRequestId: "work-request-provider-plan", routeDecisionId: "route-provider-plan", costEnvelopeId: "cost-envelope-provider-plan",
    bindingId: "binding-primary", qualificationId: "qualification-primary", idempotencyKey: "factory:provider:reservation:0001",
    requestedProviderRequests: 1, requestedSpendMicros: 600, policyVersion: "COST_POLICY_V1", evidenceHash: hashD,
  };
  const reserved = await reserveFactoryProviderCostPlan(db, input);
  assert.equal(reserved.outcome, "RESERVED_PLAN_ONLY");
  assert.equal(reserved.dispatchAuthority, false);
  assert.equal((await reserveFactoryProviderCostPlan(db, input)).outcome, "IDEMPOTENT_REPLAY");
  await assert.rejects(() => reserveFactoryProviderCostPlan(db, { ...input, idempotencyKey: "factory:provider:reservation:0002", requestedSpendMicros: 300 }), /insufficient remaining capacity/);

  const unknown = await reconcileFactoryProviderRequest(db, {
    reservationId: reserved.reservationId, reconciliationKey: "factory:provider:reconcile:unknown:0001", requestFingerprint: hashA, requestState: "UNKNOWN",
    nativeRequestId: "native-request-0001", usage: {}, actualProviderRequests: 0, actualSpendMicros: 0, observedAt: "2026-08-25T00:01:00.000Z", evidenceHash: hashE,
  });
  assert.equal(unknown.outcome, "UNKNOWN_SPEND_RESERVED");
  assert.equal(unknown.retryAuthority, false);
  const settled = await reconcileFactoryProviderRequest(db, {
    reservationId: reserved.reservationId, reconciliationKey: "factory:provider:reconcile:settled:0001", requestFingerprint: hashA, requestState: "SUCCEEDED",
    nativeRequestId: "native-request-0001", providerResponseId: "provider-response-0001", rawResponseHash: hashC, usage: { inputTokens: 100, outputTokens: 20 },
    actualProviderRequests: 1, actualSpendMicros: 550, observedAt: "2026-08-25T00:02:00.000Z", evidenceHash: hashF,
  });
  assert.equal(settled.outcome, "SETTLED");
  assert.equal(settled.remainingReservedSpendMicros, 50);
  assert.equal((await reconcileFactoryProviderRequest(db, {
    reservationId: reserved.reservationId, reconciliationKey: "factory:provider:reconcile:settled:0001", requestFingerprint: hashA, requestState: "SUCCEEDED",
    nativeRequestId: "native-request-0001", providerResponseId: "provider-response-0001", rawResponseHash: hashC, usage: { inputTokens: 100, outputTokens: 20 },
    actualProviderRequests: 1, actualSpendMicros: 550, observedAt: "2026-08-25T00:02:00.000Z", evidenceHash: hashF,
  })).outcome, "IDEMPOTENT_REPLAY");
  assert.equal(database.prepare("SELECT COUNT(*) total FROM factory_provider_native_request_receipts").get().total, 2);
  assert.equal(database.prepare("SELECT COUNT(*) total FROM factory_provider_reconciliation_receipts").get().total, 2);
  assert.throws(() => database.prepare("UPDATE factory_provider_cost_reservations SET reserved_spend_micros=1").run(), /FACTORY_PROVIDER_COST_RESERVATIONS_APPEND_ONLY/);
});

test("drift makes the exact binding stale and fallback requires a separate one-time plan with zero dispatch authority", async () => {
  const { database, db } = setup();
  assert.equal((await resolveFactoryProviderRoute(db, routeInput())).decision, "PLANNED_ZERO_DISPATCH");
  const fallbackCurrent = await recordFactoryProviderDriftObservation(db, {
    bindingId: "binding-fallback", qualificationId: "qualification-fallback", observationKey: "factory:provider:drift:fallback:0001",
    observed: { modelVersion: "MODEL_V1", outputSchemaHash: hashE, settingsHash: hashF, rateCardVersion: "RATE_V1", rightsPolicyVersion: "RIGHTS_V1", retentionPolicyVersion: "RETENTION_V1" },
    observedAt: "2026-08-25T00:01:00.000Z", evidenceHash: hashA,
  });
  assert.equal(fallbackCurrent.driftState, "CURRENT");
  const fallback = await authorizeFactoryProviderFallbackPlan(db, {
    primaryBindingId: "binding-primary", fallbackBindingId: "binding-fallback", fallbackQualificationId: "qualification-fallback",
    authorizationKey: "factory:provider:fallback:authorization:0001", reason: "Primary provider is unavailable after reconciliation", authorizedBy: "owner:hung",
    maxProviderRequests: 1, maxSpendMicros: 800, expiresAt: "2026-08-25T01:00:00.000Z", evaluatedAt: "2026-08-25T00:02:00.000Z", evidenceHash: hashB,
  });
  assert.equal(fallback.outcome, "APPROVED_PLAN_ONLY");
  assert.equal(fallback.dispatchAuthority, false);
  assert.equal(fallback.fallbackUsed, false);
  const automatic = await resolveFactoryProviderRoute(db, routeInput({ fallbackAllowed: true }));
  assert.ok(automatic.reasons.includes("AUTOMATIC_PROVIDER_FALLBACK_DISABLED"));

  const stale = await recordFactoryProviderDriftObservation(db, {
    bindingId: "binding-primary", qualificationId: "qualification-primary", observationKey: "factory:provider:drift:primary:0001",
    observed: { modelVersion: "MODEL_V2", outputSchemaHash: hashE, settingsHash: hashF, rateCardVersion: "RATE_V2", rightsPolicyVersion: "RIGHTS_V1", retentionPolicyVersion: "RETENTION_V1" },
    observedAt: "2026-08-25T00:03:00.000Z", evidenceHash: hashC,
  });
  assert.equal(stale.driftState, "STALE");
  assert.equal(stale.invalidatesQualification, true);
  const blocked = await resolveFactoryProviderRoute(db, routeInput());
  assert.equal(blocked.decision, "BLOCKED");
  assert.ok(blocked.reasons.includes("PROVIDER_BINDING_DRIFT_STALE"));
  assert.throws(() => database.prepare("DELETE FROM factory_provider_drift_receipts").run(), /FACTORY_PROVIDER_DRIFT_RECEIPTS_APPEND_ONLY/);
});
