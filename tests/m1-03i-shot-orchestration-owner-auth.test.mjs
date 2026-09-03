import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { hashActorSubject } from "../lib/write-command-audit.ts";
import { analyzeAuthSource } from "../scripts/lib/candidate-ci-policy.mjs";

const root = process.cwd();
const routePath = "app/api/factory/shot-orchestration/route.ts";
const handlerIdentity = routePath + "#POST";
const source = (path) => readFileSync(join(root, path), "utf8");
const route = source(routePath);
const routeFile = ts.createSourceFile(routePath, route, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const actions = new Set([
  "EMERGENCY_STOP",
  "AUTHORIZE_RECOVERY",
  "REVOKE_AUTHORIZATION",
  "RECLASSIFY_COST_GUARD_STOP",
  "RECONCILE_FROZEN_TRUTH",
  "NORMALIZE_AND_REAUDIT",
  "SET_MODEL",
  "RUN",
  "RECOVER",
  "POLL",
  "APPLY_COST_GUARD",
]);
const fields = {
  EMERGENCY_STOP: new Set(["action"]),
  AUTHORIZE_RECOVERY: new Set(["action", "maxSpendUsd", "retryBudget"]),
  REVOKE_AUTHORIZATION: new Set(["action"]),
  RECLASSIFY_COST_GUARD_STOP: new Set(["action"]),
  RECONCILE_FROZEN_TRUTH: new Set(["action"]),
  NORMALIZE_AND_REAUDIT: new Set(["action"]),
  SET_MODEL: new Set(["action", "modelId", "reasoningEffort"]),
  RUN: new Set(["action"]),
  RECOVER: new Set(["action"]),
  POLL: new Set(["action"]),
  APPLY_COST_GUARD: new Set(["action"]),
};
const modelOptions = [
  { id: "gpt-5.6-sol" },
  { id: "gpt-5.6-terra" },
  { id: "gpt-5.6-luna" },
];
const reasoningOptions = ["low", "medium", "high"];

function functionSource(name) {
  const declaration = routeFile.statements.find((statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === name);
  assert.ok(declaration, name + " must remain a top-level function");
  return route.slice(declaration.getStart(routeFile), declaration.end);
}

function transpile(names) {
  const input = names.map(functionSource).join("\n").replaceAll("export async function", "async function");
  return ts.transpileModule(input, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
}

function request(body = "{}", options = {}) {
  const headers = {
    "content-type": options.contentType || "application/json",
    origin: options.origin || "https://factory.invalid",
    "sec-fetch-site": options.fetchSite || "same-origin",
    ...(options.headers || {}),
  };
  return new Request(options.url || "https://factory.invalid/api/factory/shot-orchestration", {
    method: options.method || "POST",
    headers,
    body,
  });
}

async function executeGuard(options = {}) {
  const observed = { environment: 0, d1: 0, provider: 0 };
  const db = new Proxy({}, {
    get() {
      observed.d1 += 1;
      return () => {
        observed.d1 += 1;
      };
    },
  });
  const environment = new Proxy({
    DB: options.db === undefined ? db : options.db,
    FACTORY_EXPERT_EMAILS: options.allowlist === undefined ? "owner@example.com" : options.allowlist,
  }, {
    get(target, property, receiver) {
      if (property === "OPENAI_API_KEY" || property === "BUCKET") observed.provider += 1;
      return Reflect.get(target, property, receiver);
    },
  });
  const req = request("{}", options);
  const result = await vm.runInNewContext(
    transpile(["shotOrchestrationOwnerFailure", "shotOrchestrationOwnerSameOrigin", "authorizeShotOrchestrationOwnerWrite"]) + "\nauthorizeShotOrchestrationOwnerWrite(request);",
    {
      Response,
      Request,
      URL,
      request: req,
      getChatGPTUser: async () => options.user === undefined ? { email: "owner@example.com" } : options.user,
      shotOrchestrationOwnerEnvironment: async () => {
        observed.environment += 1;
        return environment;
      },
    },
  );
  return { result, observed };
}

async function readCommand(body, options = {}) {
  return vm.runInNewContext(
    transpile([
      "shotOrchestrationOwnerFailure",
      "shotOrchestrationSha256RawBytes",
      "shotOrchestrationExactKeys",
      "shotOrchestrationBoundedString",
      "shotOrchestrationOwnerPayloadValid",
      "readShotOrchestrationOwnerCommand",
    ]) + "\nreadShotOrchestrationOwnerCommand(request);",
    {
      Response,
      Request,
      TextDecoder,
      crypto,
      request: request(body, options),
      SHOT_ORCHESTRATION_OWNER_ACTIONS: actions,
      SHOT_ORCHESTRATION_OWNER_FIELDS: fields,
      MAX_SHOT_ORCHESTRATION_OWNER_BODY_BYTES: 8 * 1024,
      MODEL_OPTIONS: modelOptions,
      REASONING_OPTIONS: reasoningOptions,
    },
  );
}

test("M1-03I protects Stage 08 POST before body, runtime DDL, D1, R2, provider, reservation, spend, and business", () => {
  const [analysis] = analyzeAuthSource(route, routePath).filter((item) => item.method === "POST");
  assert.equal(analysis.covered, true);
  assert.equal(analysis.authenticationGuard, "authorizeShotOrchestrationOwnerWrite");
  assert.equal(analysis.authorizationGuard, "authorizeShotOrchestrationOwnerWrite");
  const post = functionSource("POST");
  const guard = post.indexOf("await authorizeShotOrchestrationOwnerWrite(request)");
  const body = post.indexOf("await readShotOrchestrationOwnerCommand(request)");
  const identity = post.indexOf("await shotOrchestrationOwnerAuditIdentity(");
  const audited = post.indexOf("await runAuditedShotOrchestrationOwnerCommand(");
  const execute = post.indexOf("executeShotOrchestrationOwnerCommand(command)");
  assert.ok(guard >= 0 && guard < body && body < identity && identity < audited && audited < execute);
  assert.equal(post.includes("context.params"), false);
  for (const forbidden of [
    "request.json(",
    "request.arrayBuffer(",
    "request.formData(",
    "runtime(",
    ".prepare(",
    ".batch(",
    ".put(",
    ".delete(",
    "fetch(",
    "activeAuthorization(",
    "launchBatch(",
    "recordOpenAIUsage(",
  ]) assert.equal(post.includes(forbidden), false, forbidden + " must remain behind the owner boundary");
});

test("authentication and exact same-origin denials do not read runtime bindings or touch D1/provider state", async () => {
  const cases = [
    { user: null, status: 401, code: "SIWC_AUTHENTICATION_REQUIRED", environment: 0 },
    { origin: "https://evil.invalid", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED", environment: 0 },
    { fetchSite: "cross-site", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED", environment: 0 },
    { url: "https://factory.invalid/api/factory/shot-orchestration/extra", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED", environment: 0 },
    { method: "PUT", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED", environment: 0 },
    { allowlist: "", status: 503, code: "OWNER_WRITE_ALLOWLIST_UNCONFIGURED", environment: 1 },
    { user: { email: "intruder@example.com" }, status: 403, code: "OWNER_WRITE_AUTHORIZATION_REQUIRED", environment: 1 },
    { db: null, status: 503, code: "CANONICAL_DATABASE_UNAVAILABLE", environment: 1 },
  ];
  for (const item of cases) {
    const { result, observed } = await executeGuard(item);
    assert.ok(result instanceof Response);
    assert.equal(result.status, item.status);
    assert.deepEqual(await result.json(), { error: item.code });
    assert.equal(observed.environment, item.environment);
    assert.equal(observed.d1, 0);
    assert.equal(observed.provider, 0);
  }
  const authSource = functionSource("authorizeShotOrchestrationOwnerWrite");
  assert.equal(authSource.includes("runtime("), false);
  assert.equal(authSource.includes(".prepare("), false);
  assert.equal(authSource.includes(".batch("), false);
});

test("owner identity normalization, subject hash, resource scope, and correlation are bounded", async () => {
  const allowed = await executeGuard({ user: { email: " Owner@Example.COM " }, allowlist: "other@example.com, owner@example.com" });
  assert.equal(allowed.result.normalizedEmail, "owner@example.com");
  const command = { action: "POLL", payload: { action: "POLL" }, requestHash: "a".repeat(64) };
  const identity = await vm.runInNewContext(
    transpile([
      "shotOrchestrationBoundedAuditComponent",
      "shotOrchestrationOwnerCorrelationId",
      "shotOrchestrationOwnerAuditIdentity",
    ]) + "\nshotOrchestrationOwnerAuditIdentity(request, \"owner@example.com\", command);",
    {
      request: request("{}", { headers: { "x-correlation-id": "valid:correlation-123" } }),
      command,
      crypto,
      hashActorSubject,
      SHOT_ORCHESTRATION_OWNER_HANDLER_IDENTITY: handlerIdentity,
      SHOT_ORCHESTRATION_CORRELATION_ID_PATTERN: /^[A-Za-z0-9._:-]{8,200}$/,
      SHOT_ORCHESTRATION_AUDIT_COMPONENT_PATTERN: /[^A-Za-z0-9._:-]/g,
      PROGRAM_ID: "YTAF-V7-GREENFIELD",
      STAGE: "08",
    },
  );
  assert.equal(identity.actorType, "CHATGPT_OWNER");
  assert.equal(identity.actorSubjectHash, await hashActorSubject("CHATGPT_OWNER", "owner@example.com"));
  assert.equal(identity.resourceScope, "program:YTAF-V7-GREENFIELD:stage:08");
  assert.equal(identity.correlationId, "valid:correlation-123");
  assert.equal(identity.requestHash, command.requestHash);
});

test("typed command envelope preserves exactly eleven actions and strict per-action fields", async () => {
  assert.equal(actions.size, 11);
  assert.ok(actions.has("POLL"), "POLL remains explicitly dispatch-capable");
  const invalid = [
    { body: "{}", options: { contentType: "text/plain" }, status: 415, code: "JSON_CONTENT_TYPE_REQUIRED" },
    { body: "{}", options: { headers: { "content-length": String(8 * 1024 + 1) } }, status: 413, code: "OWNER_WRITE_BODY_TOO_LARGE" },
    { body: "{", status: 400, code: "OWNER_WRITE_JSON_INVALID" },
    { body: "null", status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: JSON.stringify({ action: "PUBLISH" }), status: 403, code: "STAGE08_OWNER_ACTION_FORBIDDEN" },
    { body: JSON.stringify({ action: "RUN", extra: true }), status: 400, code: "OWNER_WRITE_COMMAND_FIELD_FORBIDDEN" },
    { body: JSON.stringify({ action: "AUTHORIZE_RECOVERY", maxSpendUsd: 25.01, retryBudget: 0 }), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: JSON.stringify({ action: "AUTHORIZE_RECOVERY", maxSpendUsd: 1, retryBudget: 3 }), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: JSON.stringify({ action: "SET_MODEL", modelId: "unknown", reasoningEffort: "low" }), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
  ];
  for (const item of invalid) {
    const result = await readCommand(item.body, item.options || {});
    assert.ok(result instanceof Response);
    assert.equal(result.status, item.status);
    assert.deepEqual(await result.json(), { error: item.code });
  }
  for (const action of actions) {
    let payload = { action };
    if (action === "AUTHORIZE_RECOVERY") payload = { action, maxSpendUsd: 5, retryBudget: 1 };
    if (action === "SET_MODEL") payload = { action, modelId: "gpt-5.6-sol", reasoningEffort: "low" };
    const raw = JSON.stringify(payload);
    const result = await readCommand(raw);
    assert.equal(result.action, action);
    assert.equal(JSON.stringify(result.payload), JSON.stringify(payload));
    assert.equal(result.requestHash, createHash("sha256").update(Buffer.from(raw)).digest("hex"));
  }
});

test("immutable audit is AUTHORIZED before business with exactly one terminal outcome", async () => {
  async function run(responseFactory) {
    const events = [];
    let executions = 0;
    const command = { action: "RUN", payload: { action: "RUN" }, requestHash: "a".repeat(64) };
    const identity = { handlerIdentity, actorType: "CHATGPT_OWNER", actorSubjectHash: "b".repeat(64), action: "RUN", resourceScope: "program:YTAF-V7-GREENFIELD:stage:08", correlationId: "test:correlation", requestHash: command.requestHash };
    const response = await vm.runInNewContext(
      transpile([
        "shotOrchestrationBoundedAuditComponent",
        "shotOrchestrationDomainReceipt",
        "runAuditedShotOrchestrationOwnerCommand",
      ]) + "\nrunAuditedShotOrchestrationOwnerCommand(db, identity, command, execute);",
      {
        Response,
        db: {},
        identity,
        command,
        execute: async () => {
          executions += 1;
          return responseFactory();
        },
        appendWriteCommandAudit: async (_db, _identity, phase, receipt) => {
          events.push({ phase, receipt });
        },
        SHOT_ORCHESTRATION_AUDIT_COMPONENT_PATTERN: /[^A-Za-z0-9._:-]/g,
        PROGRAM_ID: "YTAF-V7-GREENFIELD",
        STAGE: "08",
      },
    );
    return { response, events, executions };
  }
  const success = await run(() => Response.json({ stage: { status: "RUNNING" } }, { status: 202 }));
  assert.equal(success.response.status, 202);
  assert.equal(success.executions, 1);
  assert.deepEqual(success.events.map((item) => item.phase), ["AUTHORIZED", "SUCCEEDED"]);
  assert.equal(success.events[1].receipt, "stage08:RUN:RUNNING");
  const failure = await run(() => Response.json({ error: "blocked" }, { status: 409 }));
  assert.equal(failure.executions, 1);
  assert.deepEqual(failure.events.map((item) => item.phase), ["AUTHORIZED", "FAILED"]);
});

test("Stage 08 cost, recovery, model-binding, retry, stop, and dispatch invariants remain behind the boundary", () => {
  const executor = functionSource("executeShotOrchestrationOwnerCommand");
  for (const action of actions) assert.ok(executor.includes('body.action === "' + action + '"'));
  assert.ok(executor.includes('body.action === "POLL") return Response.json(await poll())'));
  const authorization = functionSource("authorizeRecovery");
  assert.ok(authorization.includes("no request launched"));
  assert.ok(authorization.includes("maxSpendUsd>25"));
  assert.ok(authorization.includes("retryBudget>2"));
  const capacity = functionSource("fillCapacity");
  assert.ok(capacity.indexOf("activeAuthorization(db,runId)") < capacity.indexOf("launchBatch("));
  assert.ok(capacity.includes("approved_request_count"));
  assert.ok(capacity.includes("max_spend_usd"));
  const start = functionSource("start");
  assert.ok(start.includes("COST_AUTHORIZATION_REQUIRED"));
  assert.ok(start.includes("COST_AUTHORIZATION_INVALID"));
  const stop = functionSource("emergencyStop");
  assert.ok(stop.includes("REVOKED_BY_EMERGENCY_STOP"));
});

test("provider behavior is mocked by tests and raw provider response bodies cannot escape", () => {
  const provider = functionSource("provider");
  assert.ok(provider.includes("PROVIDER_START_FAILED"));
  assert.equal(provider.includes("await r.text()"), false);
  assert.equal(route.includes("M1_03I_LIVE_PROVIDER_TEST"), false);
  assert.equal(route.includes("M1_03I_LIVE_SPEND_TEST"), false);
});

test("registry and auth baseline move exactly one Stage 08 POST to M1-03I ratchets", () => {
  const handlers = JSON.parse(source("governance/registries/http-handlers.json")).handlers;
  assert.deepEqual(handlers.find((item) => item.identity === handlerIdentity), {
    identity: handlerIdentity,
    sourceFile: routePath,
    routePath: "/api/factory/shot-orchestration",
    method: "POST",
    readWrite: "WRITE",
    actor: "CHATGPT_OWNER",
    authentication: "CHATGPT_SIWC",
    authorization: "FACTORY_EXPERT_EMAILS_ALLOWLIST_AND_SAME_ORIGIN_AND_EXACT_ACTION",
    audit: "IMMUTABLE_WRITE_COMMAND_AUDIT_AND_STAGE08_DOMAIN_RECEIPT",
    status: "PROTECTED",
    remediationWp: "NONE",
  });
  assert.equal(handlers.length, 100);
  assert.equal(handlers.filter((item) => item.status === "PROTECTED").length, 24);
  assert.equal(handlers.filter((item) => item.status === "GAP_UNAUTHENTICATED_WRITE").length, 21);
  assert.deepEqual(["GET", "POST"].map((method) => handlers.filter((item) => item.status === "GAP_UNAUTHENTICATED_WRITE" && item.method === method).length), [13, 8]);
  assert.equal(handlers.filter((item) => item.actor === "CHATGPT_OWNER").length, 30);
  assert.equal(handlers.filter((item) => item.actor === "UNCLASSIFIED").length, 63);
  const auth = JSON.parse(source("governance/baselines/auth-coverage.json")).uncoveredHandlers;
  assert.equal(auth.length, 41);
  assert.equal(auth.some((item) => item.identity === handlerIdentity), false);
  assert.deepEqual(["GET", "POST", "HEAD"].map((method) => auth.filter((item) => item.method === method).length), [32, 8, 1]);
  assert.equal(JSON.parse(source("governance/baselines/no-write-in-get.json")).handlersWithReachableWrites.length, 16);
  assert.equal(JSON.parse(source("governance/baselines/actor-separation.json")).unseparatedCommands.length, 17);
});

test("migration head remains 0132 and migrations 0129 through 0132 are byte-identical", () => {
  const expected = {
    "0129_exact_tree_deployment_receipts.sql": "ffe1b3eaa00078f477afd043cbeb8662cd4ae1e305f5082b089f0b0e501ecea4",
    "0130_scoped_deployment_receipt_writer.sql": "113fb6178656a057e2e63b6cef24b018da92beab3f915b1c7a11cd690af0ad9e",
    "0131_owner_deployment_receipt_finalization.sql": "2683d493076d2f47149a33a592ddd9ba30d3c6444e343c77549cc9fd2167de84",
    "0132_factory_write_command_audit.sql": "b61157d4ef1c5687264969c001cafa82c854d2ffbb621befa4a7ad487f734969",
  };
  const migrations = readdirSync(join(root, "drizzle")).filter((name) => name.endsWith(".sql")).sort();
  assert.equal(migrations.at(-1), "0132_factory_write_command_audit.sql");
  assert.equal(migrations.some((name) => name.startsWith("0133")), false);
  for (const [name, digest] of Object.entries(expected)) {
    assert.equal(createHash("sha256").update(source("drizzle/" + name)).digest("hex"), digest);
  }
});
