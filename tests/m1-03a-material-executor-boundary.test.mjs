import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  INTERNAL_EXECUTOR_ACTIONS,
  MaterialExecutorError,
  authorizeMaterialExecutorRequest,
  executeAuthorizedMaterialExecutorCommand,
} from "../lib/material-production-executor.ts";
import { appendWriteCommandAudit, hashActorSubject, sha256Text } from "../lib/write-command-audit.ts";
import { analyzeAuthSource } from "../scripts/lib/candidate-ci-policy.mjs";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");
const executorRoutePath = "app/api/factory/material-production/executor/route.ts";
const ownerRoutePath = "app/api/factory/material-production/route.ts";
const expectedActions = [
  "CLAIM_MEDIA_JOB",
  "CLAIM_MOTION_JOB",
  "COMPLETE_MEDIA_JOB",
  "COMPLETE_MOTION_PROOF",
  "COMPLETE_SEQUENCE_PRODUCT",
  "COMPLETE_SEQUENCE_PROOF",
  "EXECUTOR_HEARTBEAT",
  "FAIL_MEDIA_JOB",
];

function request(body, credential = "") {
  const headers = { "content-type": "application/json", "x-correlation-id": `test:${crypto.randomUUID()}` };
  if (credential) headers["x-frameflow-executor-key"] = credential;
  return new Request("https://factory.invalid/api/factory/material-production/executor", { method: "POST", headers, body: JSON.stringify(body) });
}

function rejectingDatabase() {
  const observed = { prepares: 0, reads: 0, mutations: 0, audits: 0 };
  return {
    observed,
    prepare(sql) {
      observed.prepares += 1;
      let values = [];
      return {
        bind(...next) { values = next; return this; },
        async first() { observed.reads += 1; return null; },
        async all() { observed.reads += 1; return { results: [] }; },
        async run() {
          observed.mutations += 1;
          if (sql.includes("factory_write_command_audit")) observed.audits += 1;
          return { values };
        },
      };
    },
    async batch() { observed.mutations += 1; },
  };
}

class ExecutionDatabase {
  constructor({ failHeartbeat = false } = {}) {
    this.events = [];
    this.failHeartbeat = failHeartbeat;
  }
  prepare(sql) {
    const shouldFailHeartbeat = () => this.failHeartbeat;
    const clearHeartbeatFailure = () => { this.failHeartbeat = false; };
    const record = (event) => this.events.push(event);
    let values = [];
    return {
      bind(...next) { values = next; return this; },
      async run() {
        if (sql.includes("v7_media_executors") && shouldFailHeartbeat()) {
          clearHeartbeatFailure();
          throw new Error("HEARTBEAT_STORAGE_FAILED");
        }
        record({ sql, values });
        return {};
      },
      async first() { return null; },
      async all() { return { results: [] }; },
    };
  }
  async batch(statements) { for (const statement of statements) await statement.run(); }
}

test("registry classifies exactly 100 handlers and protects the INTERNAL_SYSTEM executor boundary", () => {
  const registry = JSON.parse(source("governance/registries/http-handlers.json"));
  const baseline = JSON.parse(source("governance/baselines/auth-coverage.json"));
  const byIdentity = new Map(registry.handlers.map((entry) => [entry.identity, entry]));
  const executor = byIdentity.get(`${executorRoutePath}#POST`);
  const owner = byIdentity.get(`${ownerRoutePath}#POST`);
  assert.equal(registry.handlers.length, 100);
  assert.equal(baseline.uncoveredHandlers.length, 49);
  assert.equal(registry.handlers.filter((entry) => entry.status === "GAP_UNAUTHENTICATED_WRITE").length, 29);
  assert.deepEqual({ actor: executor.actor, authentication: executor.authentication, authorization: executor.authorization, audit: executor.audit, status: executor.status }, {
    actor: "INTERNAL_SYSTEM",
    authentication: "INTERNAL_EXECUTOR_SECRET_OR_ONE_TIME_MOTION_CAPABILITY",
    authorization: "EXACT_EXECUTOR_COMMAND_AND_JOB_LEASE",
    audit: "IMMUTABLE_WRITE_COMMAND_AUDIT_AND_DOMAIN_RECEIPT",
    status: "PROTECTED",
  });
  assert.equal(owner.actor, "CHATGPT_OWNER");
  assert.equal(owner.status, "PROTECTED");
  assert.equal(owner.remediationWp, "NONE");
  assert.equal(baseline.uncoveredHandlers.some((entry) => entry.identity === `${executorRoutePath}#POST`), false);
  assert.equal(baseline.uncoveredHandlers.some((entry) => entry.identity === `${ownerRoutePath}#POST`), false);
});

test("new route is structurally protected and exposes only the eight exact executor actions", () => {
  const [analysis] = analyzeAuthSource(source(executorRoutePath), executorRoutePath);
  assert.equal(analysis.covered, true);
  assert.equal(analysis.authenticationGuard, "authorizeExecutorCommand");
  assert.equal(analysis.authorizationGuard, "authorizeExecutorCommand");
  assert.deepEqual([...INTERNAL_EXECUTOR_ACTIONS].sort(), expectedActions);
  const ownerRoute = source(ownerRoutePath), executorModule = source("lib/material-production-executor.ts");
  for (const action of expectedActions) {
    assert.equal(ownerRoute.includes(`"${action}"`), false, `${action} must not remain implemented by the owner route`);
    assert.equal(executorModule.includes(`"${action}"`), true);
  }
  assert.ok(ownerRoute.indexOf("INTERNAL_EXECUTOR_ACTIONS.has(action)") < ownerRoute.indexOf("await assertLegacyIsolation(action)"));
});

test("missing and invalid executor credentials return 401 before DB, R2, provider, reservation, spend, or audit", async () => {
  for (const credential of ["", crypto.randomUUID()]) {
    const observed = { databaseReads: 0, bucketReads: 0 };
    const env = new Proxy({ MEDIA_EXECUTOR_SHARED_SECRET: crypto.randomUUID() }, {
      get(target, property, receiver) {
        if (property === "DB") observed.databaseReads += 1;
        if (property === "BUCKET") observed.bucketReads += 1;
        return Reflect.get(target, property, receiver);
      },
    });
    const body = { action: "EXECUTOR_HEARTBEAT", executorId: `executor-${crypto.randomUUID()}` };
    await assert.rejects(
      authorizeMaterialExecutorRequest(request(body, credential), body, JSON.stringify(body), env),
      (error) => error instanceof MaterialExecutorError && error.status === 401,
    );
    assert.deepEqual(observed, { databaseReads: 0, bucketReads: 0 });
  }
});

test("valid credential rejects owner commands with 403 and zero side effects", async () => {
  const credential = crypto.randomUUID(), observed = { databaseReads: 0 };
  const env = new Proxy({ MEDIA_EXECUTOR_SHARED_SECRET: credential }, {
    get(target, property, receiver) { if (property === "DB") observed.databaseReads += 1; return Reflect.get(target, property, receiver); },
  });
  const body = { action: "AUTHORIZE_PILOT", executorId: `executor-${crypto.randomUUID()}` };
  await assert.rejects(
    authorizeMaterialExecutorRequest(request(body, credential), body, JSON.stringify(body), env),
    (error) => error instanceof MaterialExecutorError && error.status === 403,
  );
  assert.equal(observed.databaseReads, 0);
});

test("wrong job, lease, executor, or one-time motion capability binding returns 403/409 with zero mutation and audit", async () => {
  const credential = crypto.randomUUID(), db = rejectingDatabase();
  const completion = { action: "COMPLETE_MEDIA_JOB", executorId: `executor-${crypto.randomUUID()}`, jobId: crypto.randomUUID(), leaseToken: crypto.randomUUID() };
  await assert.rejects(
    authorizeMaterialExecutorRequest(request(completion, credential), completion, JSON.stringify(completion), { MEDIA_EXECUTOR_SHARED_SECRET: credential, DB: db }),
    (error) => error instanceof MaterialExecutorError && error.status === 409,
  );
  const motion = { action: "CLAIM_MOTION_JOB", executorId: `executor-${crypto.randomUUID()}`, jobId: crypto.randomUUID(), bootstrapToken: crypto.randomUUID() };
  await assert.rejects(
    authorizeMaterialExecutorRequest(request(motion), motion, JSON.stringify(motion), { DB: db }),
    (error) => error instanceof MaterialExecutorError && error.status === 403,
  );
  assert.equal(db.observed.mutations, 0);
  assert.equal(db.observed.audits, 0);
});

test("valid one-time motion capability is hash-, job-, expiry-, and executor-bound without mutation", async () => {
  const bootstrapToken = crypto.randomUUID(), executorId = `executor-${crypto.randomUUID()}`, jobId = crypto.randomUUID();
  const job = { id: jobId, job_type: "MOTION_PROOF_RENDER", status: "QUEUED", attempt: 0, max_attempts: 2, contract_json: JSON.stringify({ bootstrap: { tokenHash: await sha256Text(bootstrapToken), expiresAt: new Date(Date.now() + 60_000).toISOString(), scope: "CLAIM_EXACT_MOTION_JOB_ONCE" } }) };
  const observed = { mutations: 0 };
  const db = {
    prepare() {
      return { bind() { return this; }, async first() { return job; }, async all() { return { results: [] }; }, async run() { observed.mutations += 1; } };
    },
    async batch() { observed.mutations += 1; },
  };
  const body = { action: "CLAIM_MOTION_JOB", executorId, jobId, bootstrapToken };
  const authorization = await authorizeMaterialExecutorRequest(request(body), body, JSON.stringify(body), { DB: db });
  assert.equal(authorization.action, "CLAIM_MOTION_JOB");
  assert.equal(authorization.auditIdentity.resourceScope, `job:${jobId}`);
  assert.equal(observed.mutations, 0);
});

test("authorized execution appends AUTHORIZED then SUCCEEDED with one correlation and no raw credential", async () => {
  const credential = crypto.randomUUID(), executorId = `executor-${crypto.randomUUID()}`, db = new ExecutionDatabase();
  const body = { action: "EXECUTOR_HEARTBEAT", executorId, version: "test", capabilities: ["ffmpeg"] };
  const authorization = await authorizeMaterialExecutorRequest(request(body, credential), body, JSON.stringify(body), { MEDIA_EXECUTOR_SHARED_SECRET: credential, DB: db });
  const response = await executeAuthorizedMaterialExecutorCommand(authorization);
  assert.equal(response.status, 200);
  const audits = db.events.filter((event) => event.sql.includes("factory_write_command_audit"));
  assert.deepEqual(audits.map((event) => event.values[8]), ["AUTHORIZED", "SUCCEEDED"]);
  assert.equal(audits[0].values[6], audits[1].values[6]);
  assert.equal(db.events[0], audits[0]);
  assert.equal(JSON.stringify(audits).includes(credential), false);
  assert.equal(audits[0].values[2], "INTERNAL_SYSTEM");
  assert.equal(audits[0].values[3], await hashActorSubject("INTERNAL_SYSTEM", executorId));
});

test("authorized business failure appends FAILED with the original correlation", async () => {
  const credential = crypto.randomUUID(), db = new ExecutionDatabase({ failHeartbeat: true });
  const body = { action: "EXECUTOR_HEARTBEAT", executorId: `executor-${crypto.randomUUID()}` };
  const authorization = await authorizeMaterialExecutorRequest(request(body, credential), body, JSON.stringify(body), { MEDIA_EXECUTOR_SHARED_SECRET: credential, DB: db });
  await assert.rejects(executeAuthorizedMaterialExecutorCommand(authorization), /HEARTBEAT_STORAGE_FAILED/);
  const audits = db.events.filter((event) => event.sql.includes("factory_write_command_audit"));
  assert.deepEqual(audits.map((event) => event.values[8]), ["AUTHORIZED", "FAILED"]);
  assert.equal(audits[0].values[6], audits[1].values[6]);
});

test("0132 audit schema is immutable, read-backable, and excludes raw secret, header, body, and personal-name columns", async () => {
  const migration = source("drizzle/0132_factory_write_command_audit.sql");
  assert.match(migration, /READ_BACK:/);
  assert.match(migration, /FORWARD_RECOVERY:/);
  assert.match(migration, /AUTHORIZED','SUCCEEDED','FAILED/);
  assert.match(migration, /factory_write_command_audit_no_update/);
  assert.match(migration, /factory_write_command_audit_no_delete/);
  assert.doesNotMatch(migration, /raw_token|authorization_header|request_body|personal_full_name/i);
  const sqlite = new DatabaseSync(":memory:");
  for (const statement of migration.split("--> statement-breakpoint").map((item) => item.trim()).filter(Boolean)) sqlite.exec(statement);
  const adapter = {
    prepare(sql) {
      let values = [];
      return { bind(...next) { values = next; return this; }, async run() { sqlite.prepare(sql).run(...values); } };
    },
  };
  const identity = { handlerIdentity: `${executorRoutePath}#POST`, actorType: "INTERNAL_SYSTEM", actorSubjectHash: await hashActorSubject("INTERNAL_SYSTEM", crypto.randomUUID()), action: "EXECUTOR_HEARTBEAT", resourceScope: "executor:test", correlationId: `test:${crypto.randomUUID()}`, requestHash: await sha256Text("{}") };
  await appendWriteCommandAudit(adapter, identity, "AUTHORIZED", "executor:test");
  await appendWriteCommandAudit(adapter, identity, "SUCCEEDED", "executor:test");
  assert.deepEqual(sqlite.prepare("SELECT phase FROM factory_write_command_audit ORDER BY canonical_timestamp,id").all().map((row) => row.phase).sort(), ["AUTHORIZED", "SUCCEEDED"]);
  assert.throws(() => sqlite.exec("UPDATE factory_write_command_audit SET action='FAIL_MEDIA_JOB'"), /IMMUTABLE/);
  assert.throws(() => sqlite.exec("DELETE FROM factory_write_command_audit"), /IMMUTABLE/);
});

test("media executor uses only the exact new command endpoint and carries executor identity", () => {
  const script = source("scripts/media-executor.mjs");
  assert.match(script, /\/api\/factory\/material-production\/executor`/);
  assert.doesNotMatch(script, /const endpoint = `\$\{baseUrl\}\/api\/factory\/material-production`;/);
  assert.match(script, /JSON\.stringify\(\{ action, executorId, \.\.\.payload \}\)/);
});

test("M1-03A has zero provider request, reservation, and spend behavior", () => {
  const route = source(executorRoutePath), executorModule = source("lib/material-production-executor.ts");
  assert.doesNotMatch(route, /api\.openai\.com|api\.elevenlabs\.io|reserveCost|actual_spend|actualCost/);
  assert.doesNotMatch(executorModule, /api\.openai\.com|api\.elevenlabs\.io|reserveCost|actual_spend|actualCost/);
});
