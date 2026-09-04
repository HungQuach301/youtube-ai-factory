import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { INTERNAL_EXECUTOR_ACTIONS } from "../lib/material-production-executor.ts";
import { appendWriteCommandAudit, hashActorSubject, sha256Text } from "../lib/write-command-audit.ts";
import { analyzeAuthSource } from "../scripts/lib/candidate-ci-policy.mjs";

const root = process.cwd();
const routePath = "app/api/factory/material-production/route.ts";
const handlerIdentity = `${routePath}#POST`;
const ownerScope = "program:YTAF-V7-GREENFIELD:stage:09";
const source = (path) => readFileSync(join(root, path), "utf8");
const route = source(routePath);
const routeFile = ts.createSourceFile(routePath, route, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const expectedExecutorActions = [
  "CLAIM_MEDIA_JOB",
  "CLAIM_MOTION_JOB",
  "COMPLETE_MEDIA_JOB",
  "COMPLETE_MOTION_PROOF",
  "COMPLETE_SEQUENCE_PRODUCT",
  "COMPLETE_SEQUENCE_PROOF",
  "EXECUTOR_HEARTBEAT",
  "FAIL_MEDIA_JOB",
];

function functionSource(name) {
  const declaration = routeFile.statements.find((statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === name);
  assert.ok(declaration, `${name} must remain a top-level function`);
  return route.slice(declaration.getStart(routeFile), declaration.end);
}

function transpile(functionNames) {
  const input = functionNames.map(functionSource).join("\n").replaceAll("export async function", "async function");
  return ts.transpileModule(input, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
}

function sideEffectCounters() {
  return {
    bodyParses: 0,
    database: 0,
    r2: 0,
    drive: 0,
    providerRequests: 0,
    reservations: 0,
    spend: 0,
    commands: 0,
    audits: 0,
  };
}

function guardedEnv(allowlist, observed) {
  return new Proxy({ FACTORY_EXPERT_EMAILS: allowlist }, {
    get(target, property, receiver) {
      if (property === "DB") observed.database += 1;
      if (property === "BUCKET") observed.r2 += 1;
      if (property === "DRIVE_CLIENT_ID" || property === "GOOGLE_DRIVE_CLIENT_ID") observed.drive += 1;
      if (["OPENAI_API_KEY", "ELEVENLABS_API_KEY", "PEXELS_API_KEY", "PIXABAY_API_KEY", "SHUTTERSTOCK_CONSUMER_KEY"].includes(String(property))) observed.providerRequests += 1;
      if (property === "COST_RESERVATION") observed.reservations += 1;
      if (property === "ACTUAL_SPEND") observed.spend += 1;
      return Reflect.get(target, property, receiver);
    },
  });
}

async function executeGuard(user, env) {
  const context = {
    Response,
    getChatGPTUser: async () => user,
    runtimeEnv: async () => env,
  };
  return vm.runInNewContext(`${transpile(["authorizeWriteAccess"])}\nauthorizeWriteAccess();`, context);
}

function recordingDb(events, options = {}) {
  return {
    prepare(sql) {
      let values = [];
      return {
        bind(...next) { values = next; return this; },
        async run() {
          if (options.failSuccessAudit && sql.includes("factory_write_command_audit") && values[8] === "SUCCEEDED") throw new Error("AUDIT_SUCCESS_WRITE_FAILED");
          events.push({ kind: "database", sql, values });
          return {};
        },
        async first() { return null; },
        async all() { return { results: [] }; },
      };
    },
    async batch() { events.push({ kind: "database-batch" }); },
  };
}

async function executePost(rawBody, options = {}) {
  const events = [];
  const db = recordingDb(events, options);
  const request = new Request("https://factory.invalid/api/factory/material-production", {
    method: "POST",
    headers: { "content-type": "application/json", "x-correlation-id": options.correlationId || "test:owner-command" },
    body: rawBody,
  });
  const auditIdentity = {
    handlerIdentity,
    actorType: "CHATGPT_OWNER",
    actorSubjectHash: await hashActorSubject("CHATGPT_OWNER", "owner@example.com"),
    action: JSON.parse(rawBody).action,
    resourceScope: ownerScope,
    correlationId: options.correlationId || "test:owner-command",
    requestHash: await sha256Text(rawBody),
  };
  const context = {
    Response,
    Error,
    console: { error() {} },
    INTERNAL_EXECUTOR_ACTIONS,
    OWNER_RESOURCE_SCOPE: ownerScope,
    authorizeWriteAccess: async () => ({ user: { email: "owner@example.com" }, env: { DB: db }, ownerIdentity: "owner@example.com" }),
    clean: (value) => String(value ?? "").trim(),
    ownerAuditIdentity: async () => auditIdentity,
    appendWriteCommandAudit,
    assertLegacyIsolation: async () => { events.push({ kind: "legacy-isolation" }); },
    qualifyReliabilityBaseline: async () => {
      events.push({ kind: "business" });
      if (options.failBusiness) throw new Error("OWNER_BUSINESS_SENTINEL_FAILURE");
      return { status: "QUALIFIED", behavior: "UNCHANGED" };
    },
  };
  const response = await vm.runInNewContext(`${transpile(["POST"])}\nPOST(request);`, { ...context, request });
  return { response, events, auditIdentity };
}

test("M1-03B protects exactly the owner POST before body parsing or runtime mutation", () => {
  const [analysis] = analyzeAuthSource(route, routePath).filter((entry) => entry.method === "POST");
  assert.equal(analysis.covered, true);
  assert.equal(analysis.authenticationGuard, "authorizeWriteAccess");
  assert.equal(analysis.authorizationGuard, "authorizeWriteAccess");
  const post = functionSource("POST");
  const guard = post.indexOf("await authorizeWriteAccess()");
  const bodyRead = post.indexOf("await request.text()");
  const executorDenial = post.indexOf("INTERNAL_EXECUTOR_ACTIONS.has(action)");
  const databaseBinding = post.indexOf("authorization.env.DB");
  const authorizedAudit = post.indexOf('appendWriteCommandAudit(db, auditIdentity, "AUTHORIZED"');
  const firstBusinessCall = post.indexOf("await assertLegacyIsolation(action)");
  assert.ok(guard >= 0 && guard < bodyRead);
  assert.ok(bodyRead < executorDenial && executorDenial < databaseBinding);
  assert.ok(databaseBinding < authorizedAudit && authorizedAudit < firstBusinessCall);
  assert.equal(post.includes("request.json()"), false);
});

test("anonymous, unconfigured allowlist, and non-owner denials are exact and side-effect free", async () => {
  const cases = [
    { user: null, allowlist: "owner@example.com", status: 401, code: "SIWC_AUTHENTICATION_REQUIRED" },
    { user: { email: "owner@example.com" }, allowlist: "", status: 503, code: "OWNER_WRITE_ALLOWLIST_UNCONFIGURED" },
    { user: { email: "intruder@example.com" }, allowlist: "owner@example.com", status: 403, code: "OWNER_WRITE_AUTHORIZATION_REQUIRED" },
  ];
  for (const item of cases) {
    const observed = sideEffectCounters();
    const result = await executeGuard(item.user, guardedEnv(item.allowlist, observed));
    assert.ok(result instanceof Response);
    assert.equal(result.status, item.status);
    assert.deepEqual(await result.json(), { error: item.code });
    assert.deepEqual(observed, sideEffectCounters());
  }
});

test("all owner denial responses return before body parsing, command execution, or audit", async () => {
  for (const [status, code] of [[401, "SIWC_AUTHENTICATION_REQUIRED"], [403, "OWNER_WRITE_AUTHORIZATION_REQUIRED"], [503, "OWNER_WRITE_ALLOWLIST_UNCONFIGURED"]]) {
    const observed = sideEffectCounters();
    const request = { async text() { observed.bodyParses += 1; return "{}"; } };
    const context = {
      Response,
      console: { error() {} },
      authorizeWriteAccess: async () => Response.json({ error: code }, { status }),
      appendWriteCommandAudit: async () => { observed.audits += 1; },
      INTERNAL_EXECUTOR_ACTIONS,
      clean: (value) => String(value ?? "").trim(),
    };
    const response = await vm.runInNewContext(`${transpile(["POST"])}\nPOST(request);`, { ...context, request });
    assert.equal(response.status, status);
    assert.deepEqual(await response.json(), { error: code });
    assert.deepEqual(observed, sideEffectCounters());
  }
});

test("the eight INTERNAL_EXECUTOR_ACTIONS remain 403 denials before DB, command, and audit", async () => {
  assert.deepEqual([...INTERNAL_EXECUTOR_ACTIONS].sort(), expectedExecutorActions);
  for (const action of expectedExecutorActions) {
    const observed = sideEffectCounters();
    const env = new Proxy({ DB: {} }, {
      get(target, property, receiver) { if (property === "DB") observed.database += 1; return Reflect.get(target, property, receiver); },
    });
    const request = new Request("https://factory.invalid/api/factory/material-production", { method: "POST", body: JSON.stringify({ action }) });
    const context = {
      Response,
      console: { error() {} },
      INTERNAL_EXECUTOR_ACTIONS,
      clean: (value) => String(value ?? "").trim(),
      authorizeWriteAccess: async () => ({ user: { email: "owner@example.com" }, env, ownerIdentity: "owner@example.com" }),
      ownerAuditIdentity: async () => { observed.audits += 1; },
      appendWriteCommandAudit: async () => { observed.audits += 1; },
      assertLegacyIsolation: async () => { observed.commands += 1; },
    };
    const response = await vm.runInNewContext(`${transpile(["POST"])}\nPOST(request);`, { ...context, request });
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "INTERNAL_EXECUTOR_ROUTE_REQUIRED" });
    assert.deepEqual(observed, sideEffectCounters());
  }
});

test("authorized owner preserves the existing action response and audits AUTHORIZED then SUCCEEDED", async () => {
  const rawBody = JSON.stringify({ action: "QUALIFY_RELIABILITY_BASELINE", existingPayload: { keep: true } });
  const { response, events } = await executePost(rawBody, { correlationId: "owner:success:001" });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { status: "QUALIFIED", behavior: "UNCHANGED" });
  const audits = events.filter((event) => event.kind === "database" && event.sql.includes("factory_write_command_audit"));
  assert.deepEqual(audits.map((event) => event.values[8]), ["AUTHORIZED", "SUCCEEDED"]);
  assert.equal(audits[0].values[6], "owner:success:001");
  assert.equal(audits[0].values[6], audits[1].values[6]);
  assert.deepEqual(events.map((event) => event.kind), ["database", "legacy-isolation", "business", "database"]);
});

test("authorized business failure audits AUTHORIZED then FAILED with the same correlation", async () => {
  const rawBody = JSON.stringify({ action: "QUALIFY_RELIABILITY_BASELINE" });
  const { response, events } = await executePost(rawBody, { correlationId: "owner:failure:001", failBusiness: true });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "OWNER_BUSINESS_SENTINEL_FAILURE" });
  const audits = events.filter((event) => event.kind === "database" && event.sql.includes("factory_write_command_audit"));
  assert.deepEqual(audits.map((event) => event.values[8]), ["AUTHORIZED", "FAILED"]);
  assert.equal(audits[0].values[6], "owner:failure:001");
  assert.equal(audits[0].values[6], audits[1].values[6]);
});

test("a failed SUCCEEDED audit write falls closed to one FAILED terminal row", async () => {
  const rawBody = JSON.stringify({ action: "QUALIFY_RELIABILITY_BASELINE" });
  const { response, events } = await executePost(rawBody, { correlationId: "owner:audit-failure:001", failSuccessAudit: true });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "AUDIT_SUCCESS_WRITE_FAILED" });
  const audits = events.filter((event) => event.kind === "database" && event.sql.includes("factory_write_command_audit"));
  assert.deepEqual(audits.map((event) => event.values[8]), ["AUTHORIZED", "FAILED"]);
  assert.equal(audits[0].values[6], audits[1].values[6]);
});

test("owner audit hashes exact raw bytes and normalized identity without PII or credentials", async () => {
  const rawEmail = "Owner.Person+Factory@example.com";
  const normalizedEmail = rawEmail.toLowerCase();
  const rawCredential = "Bearer owner-secret-sentinel";
  const rawBody = ` {"action":"  QUALIFY_RELIABILITY_BASELINE  ","credential":"${rawCredential}"} `;
  const request = new Request("https://factory.invalid/api/factory/material-production", { headers: { "x-correlation-id": "owner:audit:001", authorization: rawCredential } });
  const context = {
    crypto,
    clean: (value) => String(value ?? "").trim(),
    hashActorSubject,
    sha256Text,
    OWNER_HANDLER_IDENTITY: handlerIdentity,
    OWNER_RESOURCE_SCOPE: ownerScope,
    request,
    rawBody,
    normalizedEmail,
  };
  const identity = await vm.runInNewContext(`${transpile(["ownerCorrelationId", "ownerAuditIdentity"])}\nownerAuditIdentity(request, rawBody, "QUALIFY_RELIABILITY_BASELINE", normalizedEmail);`, context);
  assert.equal(identity.handlerIdentity, handlerIdentity);
  assert.equal(identity.actorType, "CHATGPT_OWNER");
  assert.equal(identity.actorSubjectHash, await hashActorSubject("CHATGPT_OWNER", normalizedEmail));
  assert.equal(identity.requestHash, await sha256Text(rawBody));
  assert.equal(identity.correlationId, "owner:audit:001");
  assert.equal(identity.resourceScope, ownerScope);
  const persisted = JSON.stringify(identity);
  assert.equal(persisted.includes(rawEmail), false);
  assert.equal(persisted.includes(normalizedEmail), false);
  assert.equal(persisted.includes(rawCredential), false);
  assert.equal(persisted.includes(rawBody), false);
});

test("invalid incoming correlation IDs are replaced by bounded generated IDs", async () => {
  const request = new Request("https://factory.invalid/api/factory/material-production", { headers: { "x-correlation-id": "bad id with spaces" } });
  const generated = vm.runInNewContext(`${transpile(["ownerCorrelationId"])}\nownerCorrelationId(request);`, {
    crypto,
    clean: (value) => String(value ?? "").trim(),
    request,
  });
  assert.match(generated, /^material-owner:[0-9a-f-]{36}$/);
  assert.ok(generated.length <= 200);
});

test("registry and baseline move exactly one owner POST and preserve expected debt metrics", () => {
  const registry = JSON.parse(source("governance/registries/http-handlers.json"));
  const baseline = JSON.parse(source("governance/baselines/auth-coverage.json"));
  const entry = registry.handlers.find((item) => item.identity === handlerIdentity);
  assert.equal(registry.handlers.length, 100);
  assert.deepEqual({ actor: entry.actor, authentication: entry.authentication, authorization: entry.authorization, audit: entry.audit, status: entry.status, remediationWp: entry.remediationWp }, {
    actor: "CHATGPT_OWNER",
    authentication: "CHATGPT_SIWC",
    authorization: "FACTORY_EXPERT_EMAILS_ALLOWLIST",
    audit: "IMMUTABLE_WRITE_COMMAND_AUDIT_AND_DOMAIN_RECEIPT",
    status: "PROTECTED",
    remediationWp: "NONE",
  });
  assert.equal(baseline.uncoveredHandlers.length, 38);
  assert.equal(baseline.uncoveredHandlers.some((item) => item.identity === handlerIdentity), false);
  assert.deepEqual(Object.fromEntries(["GET", "POST", "HEAD"].map((method) => [method, baseline.uncoveredHandlers.filter((item) => item.method === method).length])), { GET: 32, POST: 5, HEAD: 1 });
  assert.equal(registry.handlers.filter((item) => item.status === "GAP_UNAUTHENTICATED_WRITE").length, 18);
});

test("migration head stays 0132 and migrations 0129 through 0132 are byte-identical", () => {
  const expected = {
    "0129_exact_tree_deployment_receipts.sql": "ffe1b3eaa00078f477afd043cbeb8662cd4ae1e305f5082b089f0b0e501ecea4",
    "0130_scoped_deployment_receipt_writer.sql": "113fb6178656a057e2e63b6cef24b018da92beab3f915b1c7a11cd690af0ad9e",
    "0131_owner_deployment_receipt_finalization.sql": "2683d493076d2f47149a33a592ddd9ba30d3c6444e343c77549cc9fd2167de84",
    "0132_factory_write_command_audit.sql": "b61157d4ef1c5687264969c001cafa82c854d2ffbb621befa4a7ad487f734969",
  };
  const migrations = readdirSync(join(root, "drizzle")).filter((name) => name.endsWith(".sql")).sort();
  assert.equal(migrations.at(-1), "0132_factory_write_command_audit.sql");
  for (const [name, digest] of Object.entries(expected)) {
    assert.equal(createHash("sha256").update(source(`drizzle/${name}`)).digest("hex"), digest);
  }
});
