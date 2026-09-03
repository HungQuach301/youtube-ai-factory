import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { analyzeActorSource, analyzeAuthSource } from "../scripts/lib/candidate-ci-policy.mjs";

const root = process.cwd();
const routePath = "app/api/factory/control-plane/route.ts";
const handlerIdentity = routePath + "#POST";
const programId = "YTAF-V7-GREENFIELD";
const source = (path) => readFileSync(join(root, path), "utf8");
const route = source(routePath);
const routeFile = ts.createSourceFile(routePath, route, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const actions = new Set(["SET_MODE", "RECONCILE_AI_USAGE", "RUN_FOUNDATION_AUDIT"]);
const fields = {
  SET_MODE: new Set(["action", "mode"]),
  RECONCILE_AI_USAGE: new Set(["action"]),
  RUN_FOUNDATION_AUDIT: new Set(["action"]),
};
const modes = new Set(["AUTOPILOT", "APPROVAL_GATES", "MANUAL"]);

function functionSource(name) {
  const declaration = routeFile.statements.find((statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === name);
  assert.ok(declaration, name + " must remain a top-level function");
  return route.slice(declaration.getStart(routeFile), declaration.end);
}

function transpile(names) {
  const input = names.map(functionSource).join("\n").replaceAll("export async function", "async function");
  return ts.transpileModule(input, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
}

function ownerRequest(body = "{}", options = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has("content-type")) headers.set("content-type", options.contentType || "application/json");
  if (!headers.has("origin")) headers.set("origin", options.origin || "https://factory.invalid");
  if (!headers.has("sec-fetch-site")) headers.set("sec-fetch-site", options.fetchSite || "same-origin");
  return new Request(options.url || "https://factory.invalid/api/factory/control-plane", {
    method: options.method || "POST",
    headers,
    body,
  });
}

async function executeGuard(options = {}) {
  const observed = { environment: 0, d1: 0, r2: 0, provider: 0 };
  const db = new Proxy({}, {
    get() {
      observed.d1 += 1;
      return () => { observed.d1 += 1; };
    },
  });
  const environment = new Proxy({
    DB: options.db === undefined ? db : options.db,
    FACTORY_EXPERT_EMAILS: options.allowlist === undefined ? "owner@example.com" : options.allowlist,
  }, {
    get(target, property, receiver) {
      if (property === "BUCKET") observed.r2 += 1;
      if (property === "OPENAI_API_KEY") observed.provider += 1;
      return Reflect.get(target, property, receiver);
    },
  });
  const result = await vm.runInNewContext(
    transpile(["controlPlaneOwnerFailure", "controlPlaneOwnerSameOrigin", "authorizeControlPlaneOwnerWrite"]) + "\nauthorizeControlPlaneOwnerWrite(request);",
    {
      Response,
      Request,
      URL,
      request: ownerRequest("{broken", options),
      getChatGPTUser: async () => options.user === undefined ? { email: "owner@example.com" } : options.user,
      runtimeEnv: async () => { observed.environment += 1; return environment; },
    },
  );
  return { result, observed };
}

async function readCommand(request) {
  return vm.runInNewContext(
    transpile([
      "controlPlaneOwnerFailure",
      "controlPlaneOwnerSha256RawBytes",
      "controlPlaneOwnerExactKeys",
      "controlPlaneOwnerPayloadValid",
      "readControlPlaneOwnerCommand",
    ]) + "\nreadControlPlaneOwnerCommand(request);",
    {
      Response,
      Headers,
      TextDecoder,
      Uint8Array,
      crypto,
      request,
      CONTROL_PLANE_OWNER_ACTIONS: actions,
      CONTROL_PLANE_OWNER_FIELDS: fields,
      CONTROL_PLANE_MODES: modes,
      MAX_CONTROL_PLANE_OWNER_BODY_BYTES: 16 * 1024,
    },
  );
}

test("M1-03L protects control-plane POST before body, runtime DDL, D1, R2, provider, reservation, spend, usage, audit, and business", () => {
  const [analysis] = analyzeAuthSource(route, routePath).filter((item) => item.method === "POST");
  assert.equal(analysis.covered, true);
  assert.equal(analysis.authenticationGuard, "authorizeControlPlaneOwnerWrite");
  assert.equal(analysis.authorizationGuard, "authorizeControlPlaneOwnerWrite");
  const post = functionSource("POST");
  const guard = post.indexOf("await authorizeControlPlaneOwnerWrite(request)");
  const actor = post.indexOf("requireControlPlaneOwnerAuthority(authorization.actorType)");
  const command = post.indexOf("await readControlPlaneOwnerCommand(request)");
  const binding = post.indexOf("await bindControlPlaneOwnerResource(authorization.db)");
  const entitlement = post.indexOf("authorizeControlPlaneEntitlement(authorization.db, authorization.env, command)");
  const replay = post.indexOf("await lookupControlPlaneOwnerReplay(");
  const audit = post.indexOf("await runAuditedControlPlaneOwnerCommand(");
  const execute = post.indexOf("executeControlPlaneOwnerCommand(command, entitlement)");
  assert.ok(guard >= 0 && guard < actor && actor < command && command < binding && binding < entitlement && entitlement < replay && replay < audit && audit < execute);
  for (const forbidden of [
    "request.json(",
    "request.arrayBuffer(",
    "request.formData(",
    "ensureFoundationSchema(",
    "seedControlPlane(",
    "getDb(",
    ".prepare(",
    ".batch(",
    ".insert(",
    ".update(",
    ".delete(",
    ".put(",
    "fetch(",
    "reserve",
    "spend",
    "recordOpenAIUsage(",
    "appendWriteCommandAudit(",
  ]) assert.equal(post.includes(forbidden), false, forbidden + " must remain behind authorization and binding");
});

test("anonymous, wrong-origin, non-owner, unconfigured, and unavailable-database denials touch no body or mutable dependency", async () => {
  const cases = [
    { user: null, status: 401, code: "SIWC_AUTHENTICATION_REQUIRED", environment: 0 },
    { origin: "https://evil.invalid", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED", environment: 0 },
    { fetchSite: "cross-site", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED", environment: 0 },
    { url: "https://factory.invalid/api/factory/control-plane/extra", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED", environment: 0 },
    { url: "https://factory.invalid/api/factory/control-plane?action=wrong", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED", environment: 0 },
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
    assert.equal(observed.r2, 0);
    assert.equal(observed.provider, 0);
  }
});

test("explicit owner authority denies AGENT before global control-plane business authority", async () => {
  const actorSource = functionSource("requireControlPlaneOwnerAuthority");
  assert.ok(actorSource.includes('actorType === "AGENT"'));
  assert.ok(actorSource.includes("AGENT_OWNER_COMMAND_FORBIDDEN"));
  assert.equal(analyzeActorSource(route, routePath).some((item) => ["SET_MODE", "RUN_FOUNDATION_AUDIT"].includes(item.command)), false);
  const denial = await vm.runInNewContext(
    transpile(["controlPlaneOwnerFailure", "requireControlPlaneOwnerAuthority"]) + '\nrequireControlPlaneOwnerAuthority("AGENT");',
    { Response },
  );
  assert.equal(denial.status, 403);
});

test("strict JSON envelope covers exactly three actions, three modes, fixed resource, and raw hashes", async () => {
  const valid = [
    { action: "SET_MODE", mode: "AUTOPILOT" },
    { action: "SET_MODE", mode: "APPROVAL_GATES" },
    { action: "SET_MODE", mode: "MANUAL" },
    { action: "RECONCILE_AI_USAGE" },
    { action: "RUN_FOUNDATION_AUDIT" },
  ];
  for (const payload of valid) {
    const raw = JSON.stringify(payload);
    const command = await readCommand(ownerRequest(raw));
    assert.equal(command.action, payload.action);
    assert.equal(command.requestHash, createHash("sha256").update(Buffer.from(raw)).digest("hex"));
  }
  const invalid = [
    { body: "{", status: 400, code: "OWNER_WRITE_JSON_INVALID" },
    { body: "null", status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: JSON.stringify({}), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: JSON.stringify({ action: "set_mode", mode: "AUTOPILOT" }), status: 403, code: "CONTROL_PLANE_OWNER_ACTION_FORBIDDEN" },
    { body: JSON.stringify({ action: "PUBLISH_VIDEO" }), status: 403, code: "CONTROL_PLANE_OWNER_ACTION_FORBIDDEN" },
    { body: JSON.stringify({ action: "SET_MODE" }), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: JSON.stringify({ action: "SET_MODE", mode: "AGENT" }), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: JSON.stringify({ action: "RUN_FOUNDATION_AUDIT", mode: "MANUAL" }), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: JSON.stringify({ action: "RECONCILE_AI_USAGE", programId }), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
  ];
  for (const item of invalid) {
    const response = await readCommand(ownerRequest(item.body));
    assert.ok(response instanceof Response);
    assert.equal(response.status, item.status);
    assert.deepEqual(await response.json(), { error: item.code });
  }
});

test("multipart and binary are rejected before stream materialization", async () => {
  for (const contentType of ["multipart/form-data; boundary=test", "application/octet-stream"]) {
    let reads = 0;
    const response = await readCommand({
      headers: new Headers({ "content-type": contentType }),
      arrayBuffer: async () => { reads += 1; return new ArrayBuffer(0); },
    });
    assert.ok(response instanceof Response);
    assert.equal(response.status, 415);
    assert.equal(reads, 0);
  }
});

test("fixed global resource binding performs one exact D1 read and rejects a missing or mismatched program", async () => {
  async function bind(row) {
    const calls = [];
    const statement = {
      bind(...values) { calls.push(values); return statement; },
      async first() { return row; },
    };
    const db = { prepare(sql) { calls.push(sql); return statement; } };
    const response = await vm.runInNewContext(
      transpile(["controlPlaneOwnerFailure", "bindControlPlaneOwnerResource"]) + "\nbindControlPlaneOwnerResource(db);",
      { Response, db, PROGRAM_ID: programId },
    );
    return { response, calls };
  }
  const found = await bind({ id: programId });
  assert.equal(found.response, null);
  assert.match(found.calls[0], /SELECT id FROM v7_program_contracts WHERE id = \? LIMIT 1/);
  assert.deepEqual(found.calls[1], [programId]);
  for (const row of [null, { id: "other-program" }]) {
    const missing = await bind(row);
    assert.equal(missing.response.status, 404);
  }
});

test("action entitlements are exact, fail closed, and do not construct provider, reserve, or spend work", async () => {
  function authorize(action, env) {
    const db = {};
    return vm.runInNewContext(
      transpile(["controlPlaneOwnerFailure", "authorizeControlPlaneEntitlement"]) + "\nauthorizeControlPlaneEntitlement(db, env, command);",
      { Response, db, env, command: { action, payload: { action }, requestHash: "a".repeat(64) } },
    );
  }
  assert.equal((await authorize("SET_MODE", {})).kind, "CONTROL_PLANE_ZERO_SPEND");
  const providerMissing = await authorize("RECONCILE_AI_USAGE", {});
  assert.equal(providerMissing.status, 503);
  assert.deepEqual(await providerMissing.json(), { error: "PROVIDER_READ_ENTITLEMENT_UNAVAILABLE" });
  const providerRead = await authorize("RECONCILE_AI_USAGE", { OPENAI_API_KEY: "configured" });
  assert.equal(providerRead.kind, "NON_DISPATCH_PROVIDER_READ");
  const bucketMissing = await authorize("RUN_FOUNDATION_AUDIT", {});
  assert.equal(bucketMissing.status, 503);
  assert.deepEqual(await bucketMissing.json(), { error: "RUNTIME_OBJECT_STORAGE_UNAVAILABLE" });
  assert.equal((await authorize("RUN_FOUNDATION_AUDIT", { BUCKET: {} })).kind, "FOUNDATION_AUDIT_STORAGE");

  const execute = functionSource("executeControlPlaneOwnerCommand");
  assert.ok(execute.includes('method: "GET"'));
  assert.ok(execute.includes("/v1/responses/${encodeURIComponent(job.provider_response_id)}"));
  assert.equal(execute.includes('method: "POST"'), false);
  assert.equal(/\breserve\s*\(/.test(execute), false);
  assert.equal(/\bspend\s*\(/.test(execute), false);
});

test("idempotent replay returns the immutable receipt and conflicts on key reuse with a different request", async () => {
  async function lookup(rows, requestHash = "a".repeat(64)) {
    const statement = {
      bind() { return statement; },
      async all() { return { results: rows }; },
    };
    const db = { prepare() { return statement; } };
    const identity = { handlerIdentity, requestHash, correlationId: "test:correlation" };
    return vm.runInNewContext(
      transpile(["controlPlaneOwnerFailure", "lookupControlPlaneOwnerReplay"]) + "\nlookupControlPlaneOwnerReplay(db, identity);",
      { Response, db, identity },
    );
  }
  const receipt = `control-plane:${programId}:SET_MODE:MANUAL`;
  const replay = await lookup([{ handler_identity: handlerIdentity, request_hash: "a".repeat(64), phase: "SUCCEEDED", domain_receipt_reference: receipt }]);
  assert.equal(replay.status, 200);
  assert.deepEqual(await replay.json(), { ok: true, replay: true, receipt });
  const conflict = await lookup([{ handler_identity: handlerIdentity, request_hash: "b".repeat(64), phase: "SUCCEEDED", domain_receipt_reference: receipt }]);
  assert.equal(conflict.status, 409);
  const incomplete = await lookup([{ handler_identity: handlerIdentity, request_hash: "a".repeat(64), phase: "AUTHORIZED", domain_receipt_reference: null }]);
  assert.equal(incomplete.status, 409);
  assert.equal(await lookup([]), null);
});

test("immutable audit emits AUTHORIZED then exactly one terminal phase with action-bound domain receipts", async () => {
  async function run(command, responseFactory) {
    const events = [];
    let executions = 0;
    const identity = { handlerIdentity, actorType: "CHATGPT_OWNER", actorSubjectHash: "b".repeat(64), action: command.action, resourceScope: `program:${programId}:control-plane`, correlationId: "test:correlation", requestHash: command.requestHash };
    const response = await vm.runInNewContext(
      transpile(["controlPlaneOwnerBoundedAuditComponent", "controlPlaneOwnerDomainReceipt", "runAuditedControlPlaneOwnerCommand"]) + "\nrunAuditedControlPlaneOwnerCommand(db, identity, command, execute);",
      {
        Response,
        db: {},
        identity,
        command,
        execute: async () => { executions += 1; return responseFactory(); },
        appendWriteCommandAudit: async (_db, _identity, phase, receipt) => { events.push({ phase, receipt }); },
        PROGRAM_ID: programId,
        CONTROL_PLANE_OWNER_AUDIT_COMPONENT_PATTERN: /[^A-Za-z0-9._:-]/g,
      },
    );
    return { response, events, executions };
  }
  const command = { action: "SET_MODE", payload: { action: "SET_MODE", mode: "MANUAL" }, requestHash: "a".repeat(64) };
  const success = await run(command, () => Response.json({ ok: true }));
  assert.equal(success.executions, 1);
  assert.deepEqual(success.events.map((item) => item.phase), ["AUTHORIZED", "SUCCEEDED"]);
  assert.equal(success.events[1].receipt, `control-plane:${programId}:SET_MODE:MANUAL`);
  const failure = await run(command, () => Response.json({ error: "blocked" }, { status: 409 }));
  assert.equal(failure.executions, 1);
  assert.deepEqual(failure.events.map((item) => item.phase), ["AUTHORIZED", "FAILED"]);
});

test("three owner actions retain their bounded business behavior and add no runtime schema creation", () => {
  const execute = functionSource("executeControlPlaneOwnerCommand");
  for (const action of actions) assert.ok(execute.includes('payload.action === "' + action + '"') || execute.includes('payload.action !== "' + action + '"'));
  assert.ok(execute.includes("recordOpenAIUsage({ db: entitlement.db"));
  assert.ok(execute.includes("entitlement.bucket.put"));
  assert.ok(execute.includes("entitlement.bucket.head"));
  assert.ok(execute.includes("productionAuthorized"));
  assert.equal((route.match(/CREATE TABLE IF NOT EXISTS/g) || []).length, 10);
  assert.equal(route.includes("M1_03L_LIVE_PROVIDER_TEST"), false);
  assert.equal(route.includes("M1_03L_LIVE_SPEND_TEST"), false);
});

test("registry, auth, actor separation, and GET baselines ratchet exactly once", () => {
  const handlers = JSON.parse(source("governance/registries/http-handlers.json")).handlers;
  assert.deepEqual(handlers.find((item) => item.identity === handlerIdentity), {
    identity: handlerIdentity,
    sourceFile: routePath,
    routePath: "/api/factory/control-plane",
    method: "POST",
    readWrite: "WRITE",
    actor: "CHATGPT_OWNER",
    authentication: "CHATGPT_SIWC",
    authorization: "FACTORY_EXPERT_EMAILS_ALLOWLIST_AND_SAME_ORIGIN_AND_EXACT_CONTROL_PLANE_ACTION_AND_FIXED_PROGRAM_RESOURCE_AND_ACTION_ENTITLEMENT",
    audit: "IMMUTABLE_WRITE_COMMAND_AUDIT_AND_CONTROL_PLANE_DOMAIN_RECEIPT_AND_IDEMPOTENT_REPLAY",
    status: "PROTECTED",
    remediationWp: "NONE",
  });
  assert.equal(handlers.length, 100);
  assert.equal(handlers.filter((item) => item.status === "PROTECTED").length, 24);
  assert.equal(handlers.filter((item) => item.status === "GAP_UNAUTHENTICATED_WRITE").length, 21);
  assert.deepEqual(["GET", "POST"].map((method) => handlers.filter((item) => item.status === "GAP_UNAUTHENTICATED_WRITE" && item.method === method).length), [13, 8]);
  assert.equal(handlers.filter((item) => item.actor === "CHATGPT_OWNER").length, 30);
  assert.equal(handlers.filter((item) => item.actor === "AUTOMATION").length, 5);
  assert.equal(handlers.filter((item) => item.actor === "PROVIDER_CALLBACK").length, 1);
  assert.equal(handlers.filter((item) => item.actor === "INTERNAL_SYSTEM").length, 1);
  assert.equal(handlers.filter((item) => item.actor === "PUBLIC").length, 0);
  assert.equal(handlers.filter((item) => item.actor === "UNCLASSIFIED").length, 63);
  const auth = JSON.parse(source("governance/baselines/auth-coverage.json")).uncoveredHandlers;
  assert.equal(auth.length, 41);
  assert.equal(auth.some((item) => item.identity === handlerIdentity), false);
  assert.deepEqual(["GET", "POST", "HEAD"].map((method) => auth.filter((item) => item.method === method).length), [32, 8, 1]);
  const actor = JSON.parse(source("governance/baselines/actor-separation.json")).unseparatedCommands;
  assert.equal(actor.length, 17);
  assert.equal(actor.some((item) => item.handler === handlerIdentity), false);
  assert.equal(JSON.parse(source("governance/baselines/no-write-in-get.json")).handlersWithReachableWrites.length, 16);
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
