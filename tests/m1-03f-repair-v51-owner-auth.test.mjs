import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { appendWriteCommandAudit, hashActorSubject } from "../lib/write-command-audit.ts";
import { analyzeAuthSource } from "../scripts/lib/candidate-ci-policy.mjs";

const root = process.cwd();
const routePath = "app/api/projects/[id]/repair-v51/route.ts";
const handlerIdentity = routePath + "#POST";
const source = (path) => readFileSync(join(root, path), "utf8");
const route = source(routePath);
const routeFile = ts.createSourceFile(routePath, route, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

function declarationSource(name) {
  const declaration = routeFile.statements.find((statement) =>
    ts.isFunctionDeclaration(statement) && statement.name?.text === name);
  assert.ok(declaration, name + " must remain a top-level declaration");
  return route.slice(declaration.getStart(routeFile), declaration.end);
}

function transpile(names) {
  const input = names.map(declarationSource).join("\n").replaceAll("export async function", "async function");
  return ts.transpileModule(input, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
}

function counters() {
  return {
    body: 0,
    databasePrepare: 0,
    databaseWrite: 0,
    r2: 0,
    provider: 0,
    providerKey: 0,
    token: 0,
    reservation: 0,
    spend: 0,
    business: 0,
    command: 0,
    audits: 0,
  };
}

function guardedEnv(allowlist, observed, db) {
  return new Proxy({ FACTORY_EXPERT_EMAILS: allowlist, DB: db }, {
    get(target, property, receiver) {
      if (property === "BUCKET") observed.r2 += 1;
      if (["PEXELS_API_KEY", "PIXABAY_API_KEY"].includes(String(property))) observed.providerKey += 1;
      if (String(property).includes("PROVIDER")) observed.provider += 1;
      if (String(property).includes("TOKEN") || String(property).includes("SECRET")) observed.token += 1;
      if (String(property).includes("RESERVATION")) observed.reservation += 1;
      if (String(property).includes("SPEND")) observed.spend += 1;
      return Reflect.get(target, property, receiver);
    },
  });
}

function recordingDb(events, options = {}) {
  return {
    prepare(sql) {
      let values = [];
      return {
        bind(...next) { values = next; return this; },
        async run() {
          if (options.failPhase === values[8]) throw new Error("AUDIT_" + values[8] + "_FAILED");
          events.push({ sql, values });
          return {};
        },
      };
    },
  };
}

async function executeGuard({ user, allowlist, url, method = "POST", headers = {}, db }) {
  const observed = counters();
  const request = new Request(url ?? "https://factory.invalid/api/projects/project-1/repair-v51", {
    method,
    headers: {
      origin: "https://factory.invalid",
      "sec-fetch-site": "same-origin",
      ...headers,
    },
  });
  request.arrayBuffer = async () => {
    observed.body += 1;
    return new ArrayBuffer(0);
  };
  const env = guardedEnv(allowlist, observed, db);
  const context = {
    Request,
    Response,
    URL,
    request,
    getChatGPTUser: async () => user,
    repairV51OwnerRuntimeEnv: async () => env,
  };
  const result = await vm.runInNewContext(
    transpile(["ownerFailure", "repairV51OwnerSameOrigin", "authorizeRepairV51OwnerWrite"])
      + "\nauthorizeRepairV51OwnerWrite(request);",
    context,
  );
  return { result, observed };
}

async function executeBody(rawBody, headers = {}) {
  const request = new Request("https://factory.invalid/api/projects/project-1/repair-v51", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: rawBody,
  });
  const context = {
    Request,
    Response,
    Set,
    TextDecoder,
    Uint8Array,
    crypto,
    request,
    MAX_OWNER_BODY_BYTES: 16 * 1024,
    OWNER_ACTIONS: new Set(["PLAN_V51", "MATERIALIZE_V51_BATCH"]),
  };
  return vm.runInNewContext(
    transpile(["ownerFailure", "sha256RawBody", "readBoundedRepairV51OwnerBody"])
      + "\nreadBoundedRepairV51OwnerBody(request);",
    context,
  );
}

async function executeAudited(responseFactory, options = {}) {
  const events = [];
  const db = recordingDb(events, options);
  const identity = {
    handlerIdentity,
    actorType: "CHATGPT_OWNER",
    actorSubjectHash: await hashActorSubject("CHATGPT_OWNER", "owner@example.com"),
    action: "PLAN_V51",
    resourceScope: "project:project-1:repair-v51",
    correlationId: "test:correlation",
    requestHash: "a".repeat(64),
  };
  let executions = 0;
  const execute = async () => { executions += 1; return responseFactory(); };
  const context = { Response, appendWriteCommandAudit, db, identity, execute };
  const result = await vm.runInNewContext(
    transpile(["runAuditedRepairV51OwnerAction"])
      + "\nrunAuditedRepairV51OwnerAction(db, identity, execute);",
    context,
  );
  return { result, events, executions };
}

test("M1-03F protects exactly repair-v51 POST before body, params, runtime, and business execution", () => {
  const [analysis] = analyzeAuthSource(route, routePath).filter((item) => item.method === "POST");
  assert.equal(analysis.covered, true);
  assert.equal(analysis.authenticationGuard, "authorizeRepairV51OwnerWrite");
  assert.equal(analysis.authorizationGuard, "authorizeRepairV51OwnerWrite");

  const post = declarationSource("POST");
  const guard = post.indexOf("await authorizeRepairV51OwnerWrite(request)");
  const body = post.indexOf("await readBoundedRepairV51OwnerBody(request)");
  const params = post.indexOf("await context.params");
  const identity = post.indexOf("await repairV51OwnerAuditIdentity(");
  const audited = post.indexOf("await runAuditedRepairV51OwnerAction(");
  const execute = post.indexOf("executeRepairV51OwnerAction(id, body.action)");
  assert.ok(guard >= 0 && guard < body && body < params && params < identity && identity < audited && audited < execute);
  assert.equal(post.includes("request.json()"), false);
  for (const forbidden of ["getDb(", "runtimeEnv(", "plan(", "materialize(", "BUCKET", "PEXELS_API_KEY", "PIXABAY_API_KEY", "fetch("]) {
    assert.equal(post.includes(forbidden), false, "POST must not invoke " + forbidden + " before audited executor");
  }
  assert.ok(post.includes('ownerFailure("REPAIR_V51_ACTION_FAILED", 500)'));
});

test("authentication, allowlist, origin, path, query, and canonical database denials are exact and side-effect free", async () => {
  const db = recordingDb([]);
  const cases = [
    { user: null, allowlist: "owner@example.com", db, status: 401, code: "SIWC_AUTHENTICATION_REQUIRED" },
    { user: { email: "owner@example.com" }, allowlist: "", db, status: 503, code: "OWNER_WRITE_ALLOWLIST_UNCONFIGURED" },
    { user: { email: "intruder@example.com" }, allowlist: "owner@example.com", db, status: 403, code: "OWNER_WRITE_AUTHORIZATION_REQUIRED" },
    { user: { email: "owner@example.com" }, allowlist: "owner@example.com", db, headers: { origin: "https://evil.invalid" }, status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED" },
    { user: { email: "owner@example.com" }, allowlist: "owner@example.com", db, headers: { "sec-fetch-site": "cross-site" }, status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED" },
    { user: { email: "owner@example.com" }, allowlist: "owner@example.com", db, url: "https://factory.invalid/api/projects/project-1/repair-v51?x=1", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED" },
    { user: { email: "owner@example.com" }, allowlist: "owner@example.com", db, url: "https://factory.invalid/api/projects/project-1/repair-v51/extra", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED" },
    { user: { email: "owner@example.com" }, allowlist: "owner@example.com", db, method: "PUT", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED" },
    { user: { email: "owner@example.com" }, allowlist: "owner@example.com", db: undefined, status: 503, code: "CANONICAL_DATABASE_UNAVAILABLE" },
  ];
  for (const item of cases) {
    const { result, observed } = await executeGuard(item);
    assert.ok(result instanceof Response);
    assert.equal(result.status, item.status);
    assert.deepEqual(await result.json(), { error: item.code });
    assert.deepEqual(observed, counters());
  }
});

test("owner identity is normalized and matched as an exact allowlist member", async () => {
  const db = recordingDb([]);
  const allowed = await executeGuard({
    user: { email: " Owner@Example.COM " },
    allowlist: "another@example.com, owner@example.com",
    db,
  });
  assert.equal(allowed.result.normalizedEmail, "owner@example.com");
  assert.equal(allowed.result.db, db);

  const denied = await executeGuard({
    user: { email: "owner@example.com.evil" },
    allowlist: "owner@example.com",
    db,
  });
  assert.equal(denied.result.status, 403);
  assert.deepEqual(await denied.result.json(), { error: "OWNER_WRITE_AUTHORIZATION_REQUIRED" });
});

test("body reader enforces content type, byte ceiling, fatal UTF-8, object, exact field, and exact action allowlist", async () => {
  const cases = [
    { raw: "{}", headers: { "content-type": "text/plain" }, status: 415, code: "JSON_CONTENT_TYPE_REQUIRED" },
    { raw: "{}", headers: { "content-length": String(16 * 1024 + 1) }, status: 413, code: "OWNER_WRITE_BODY_TOO_LARGE" },
    { raw: "x".repeat(16 * 1024 + 1), status: 413, code: "OWNER_WRITE_BODY_TOO_LARGE" },
    { raw: new Uint8Array([0xc3, 0x28]), status: 400, code: "OWNER_WRITE_JSON_INVALID" },
    { raw: "{", status: 400, code: "OWNER_WRITE_JSON_INVALID" },
    { raw: "null", status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { raw: "[]", status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { raw: "{}", status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { raw: JSON.stringify({ action: "PLAN_V51", extra: true }), status: 400, code: "OWNER_WRITE_COMMAND_FIELD_FORBIDDEN" },
    { raw: JSON.stringify({ action: "DELETE" }), status: 403, code: "OWNER_WRITE_ACTION_FORBIDDEN" },
  ];
  for (const item of cases) {
    const result = await executeBody(item.raw, item.headers);
    assert.ok(result instanceof Response);
    assert.equal(result.status, item.status);
    assert.deepEqual(await result.json(), { error: item.code });
  }
  for (const action of ["PLAN_V51", "MATERIALIZE_V51_BATCH"]) {
    const raw = JSON.stringify({ action });
    const result = await executeBody(raw);
    assert.equal(result.action, action);
    assert.equal(result.bodySha256, createHash("sha256").update(Buffer.from(raw)).digest("hex"));
  }
});

test("valid action hashes exact raw request bytes rather than normalized JSON", async () => {
  const raw = ' { "action" : "PLAN_V51" } ';
  const result = await executeBody(raw);
  assert.equal(result.action, "PLAN_V51");
  assert.equal(result.bodySha256, createHash("sha256").update(Buffer.from(raw)).digest("hex"));
});

test("audit identity hashes normalized subject and validates or generates correlation id", async () => {
  const raw = JSON.stringify({ action: "PLAN_V51" });
  const body = await executeBody(raw);
  const context = {
    Request,
    crypto,
    request: new Request("https://factory.invalid/api/projects/p-1/repair-v51", {
      method: "POST",
      headers: { "x-correlation-id": "valid:correlation-123" },
    }),
    hashActorSubject,
    OWNER_HANDLER_IDENTITY: handlerIdentity,
    CORRELATION_ID_PATTERN: /^[A-Za-z0-9._:-]{8,200}$/,
  };
  const identity = await vm.runInNewContext(
    transpile(["repairV51OwnerCorrelationId", "repairV51OwnerAuditIdentity"])
      + '\nrepairV51OwnerAuditIdentity(request, "p-1", "owner@example.com", "PLAN_V51", "' + body.bodySha256 + '");',
    context,
  );
  assert.deepEqual({ ...identity }, {
    handlerIdentity,
    actorType: "CHATGPT_OWNER",
    actorSubjectHash: await hashActorSubject("CHATGPT_OWNER", "owner@example.com"),
    action: "PLAN_V51",
    resourceScope: "project:p-1:repair-v51",
    correlationId: "valid:correlation-123",
    requestHash: createHash("sha256").update(Buffer.from(raw)).digest("hex"),
  });

  context.request = new Request("https://factory.invalid/api/projects/p-1/repair-v51", {
    method: "POST",
    headers: { "x-correlation-id": "bad id" },
  });
  const generated = await vm.runInNewContext(
    transpile(["repairV51OwnerCorrelationId"]) + "\nrepairV51OwnerCorrelationId(request);",
    context,
  );
  assert.match(generated, /^repair-v51-owner:[0-9a-f-]{36}$/);
  assert.equal(route.includes("rawBody:"), false);
  assert.equal(route.includes("user.email,"), false);
});

test("immutable audit is AUTHORIZED then SUCCEEDED with exact domain receipt reference", async () => {
  const success = await executeAudited(async () => ({
    response: Response.json({ ok: true }),
    domainReceiptReference: "repair-v51:p-1:PLAN_V51:5.1:MATERIALIZATION_REQUIRED:0:0",
  }));
  assert.equal(success.result.status, 200);
  assert.equal(success.executions, 1);
  assert.deepEqual(success.events.map((item) => item.values[8]), ["AUTHORIZED", "SUCCEEDED"]);
  assert.deepEqual(success.events.map((item) => item.values[9]), [null, "repair-v51:p-1:PLAN_V51:5.1:MATERIALIZATION_REQUIRED:0:0"]);
});

test("non-success and business exceptions audit FAILED and failed AUTHORIZED prevents command execution", async () => {
  const rejected = await executeAudited(async () => ({
    response: Response.json({ error: "blocked" }, { status: 409 }),
    domainReceiptReference: null,
  }));
  assert.equal(rejected.result.status, 409);
  assert.deepEqual(rejected.events.map((item) => item.values[8]), ["AUTHORIZED", "FAILED"]);

  await assert.rejects(
    () => executeAudited(async () => { throw new Error("BUSINESS_SENTINEL"); }),
    /BUSINESS_SENTINEL/,
  );

  const events = [];
  const db = recordingDb(events, { failPhase: "AUTHORIZED" });
  const identity = {
    handlerIdentity,
    actorType: "CHATGPT_OWNER",
    actorSubjectHash: "b".repeat(64),
    action: "PLAN_V51",
    resourceScope: "project:p-1:repair-v51",
    correlationId: "test:correlation",
    requestHash: "a".repeat(64),
  };
  let executions = 0;
  await assert.rejects(
    () => vm.runInNewContext(
      transpile(["runAuditedRepairV51OwnerAction"])
        + "\nrunAuditedRepairV51OwnerAction(db, identity, execute);",
      {
        Response,
        appendWriteCommandAudit,
        db,
        identity,
        execute: async () => {
          executions += 1;
          return { response: Response.json({ ok: true }), domainReceiptReference: "receipt" };
        },
      },
    ),
    /AUDIT_AUTHORIZED_FAILED/,
  );
  assert.equal(executions, 0);
  assert.deepEqual(events, []);
});

test("failed SUCCEEDED records terminal FAILED", async () => {
  const events = [];
  const db = recordingDb(events, { failPhase: "SUCCEEDED" });
  const identity = {
    handlerIdentity,
    actorType: "CHATGPT_OWNER",
    actorSubjectHash: "b".repeat(64),
    action: "PLAN_V51",
    resourceScope: "project:p-1:repair-v51",
    correlationId: "test:correlation",
    requestHash: "a".repeat(64),
  };
  await assert.rejects(
    () => vm.runInNewContext(
      transpile(["runAuditedRepairV51OwnerAction"])
        + "\nrunAuditedRepairV51OwnerAction(db, identity, execute);",
      {
        Response,
        appendWriteCommandAudit,
        db,
        identity,
        execute: async () => ({
          response: Response.json({ ok: true }),
          domainReceiptReference: "receipt",
        }),
      },
    ),
    /AUDIT_SUCCEEDED_FAILED/,
  );
  assert.deepEqual(events.map((item) => item.values[8]), ["AUTHORIZED", "FAILED"]);
  assert.deepEqual(events.map((item) => item.values[9]), [null, null]);
});

test("PLAN_V51 and MATERIALIZE_V51_BATCH call existing business exactly once and preserve response shape", async () => {
  for (const action of ["PLAN_V51", "MATERIALIZE_V51_BATCH"]) {
    let planCalls = 0;
    let materializeCalls = 0;
    const repair = { version: "5.1", status: "MATERIALIZATION_REQUIRED", materialized: 7, boundShots: 12 };
    const context = {
      Response,
      projectId: "p-1",
      action,
      plan: async (id) => { assert.equal(id, "p-1"); planCalls += 1; return repair; },
      materialize: async (id) => { assert.equal(id, "p-1"); materializeCalls += 1; return repair; },
      repairV51DomainReceiptReference: (id, exactAction, result) => `repair-v51:${id}:${exactAction}:${result.version}:${result.status}:${result.materialized}:${result.boundShots}`,
    };
    const result = await vm.runInNewContext(
      transpile(["executeRepairV51OwnerAction"])
        + "\nexecuteRepairV51OwnerAction(projectId, action);",
      context,
    );
    assert.equal(planCalls, action === "PLAN_V51" ? 1 : 0);
    assert.equal(materializeCalls, action === "MATERIALIZE_V51_BATCH" ? 1 : 0);
    assert.equal(result.response.status, 200);
    assert.deepEqual(await result.response.json(), { ok: true, repair });
    assert.equal(result.domainReceiptReference, `repair-v51:p-1:${action}:5.1:MATERIALIZATION_REQUIRED:7:12`);
  }
});

test("registry and auth baseline move exactly one POST and ratchets reach M1-03F targets", () => {
  const handlers = JSON.parse(source("governance/registries/http-handlers.json")).handlers;
  assert.deepEqual(handlers.find((item) => item.identity === handlerIdentity), {
    identity: handlerIdentity,
    sourceFile: routePath,
    routePath: "/api/projects/[id]/repair-v51",
    method: "POST",
    readWrite: "WRITE",
    actor: "CHATGPT_OWNER",
    authentication: "CHATGPT_SIWC",
    authorization: "FACTORY_EXPERT_EMAILS_ALLOWLIST_AND_SAME_ORIGIN_AND_EXACT_ACTION",
    audit: "IMMUTABLE_WRITE_COMMAND_AUDIT_AND_DOMAIN_RECEIPT",
    status: "PROTECTED",
    remediationWp: "NONE",
  });
  assert.equal(handlers.length, 100);
  assert.equal(handlers.filter((item) => item.status === "PROTECTED").length, 20);
  assert.equal(handlers.filter((item) => item.status === "GAP_UNAUTHENTICATED_WRITE").length, 25);
  assert.deepEqual(
    ["GET", "POST"].map((method) => handlers.filter((item) => item.status === "GAP_UNAUTHENTICATED_WRITE" && item.method === method).length),
    [13, 12],
  );
  assert.equal(handlers.filter((item) => item.actor === "CHATGPT_OWNER").length, 26);
  assert.equal(handlers.filter((item) => item.actor === "UNCLASSIFIED").length, 67);

  const auth = JSON.parse(source("governance/baselines/auth-coverage.json")).uncoveredHandlers;
  assert.equal(auth.length, 45);
  assert.equal(auth.some((item) => item.identity === handlerIdentity), false);
  assert.deepEqual(
    ["GET", "POST", "HEAD"].map((method) => auth.filter((item) => item.method === method).length),
    [32, 12, 1],
  );
  assert.equal(JSON.parse(source("governance/baselines/no-write-in-get.json")).handlersWithReachableWrites.length, 16);
  assert.equal(JSON.parse(source("governance/baselines/actor-separation.json")).unseparatedCommands.length, 19);
});

test("migration head remains 0132, 0129 through 0132 are byte-identical, and no 0133 exists", () => {
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

test("M1-03F test suite performs no live provider request or spend", () => {
  assert.equal(route.includes("M1_03F_LIVE_PROVIDER_TEST"), false);
  assert.equal(route.includes("M1_03F_LIVE_SPEND_TEST"), false);
});
