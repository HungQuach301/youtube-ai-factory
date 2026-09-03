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
const routePath = "app/api/factory/continuity/route.ts";
const pagePath = "app/continuity/page.tsx";
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
    token: 0,
    reservation: 0,
    spend: 0,
    business: 0,
    audits: 0,
  };
}

function guardedEnv(allowlist, observed, db) {
  return new Proxy({ FACTORY_EXPERT_EMAILS: allowlist, DB: db }, {
    get(target, property, receiver) {
      if (property === "BUCKET") observed.r2 += 1;
      if (String(property).includes("API_KEY") || String(property).includes("PROVIDER")) observed.provider += 1;
      if (String(property).includes("TOKEN")) observed.token += 1;
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
        bind(...next) {
          values = next;
          return this;
        },
        async run() {
          if (options.failPhase === values[8]) throw new Error("AUDIT_" + values[8] + "_FAILED");
          events.push({ sql, values });
          return {};
        },
        async all() {
          return { results: [] };
        },
        async first() {
          return null;
        },
      };
    },
    async batch() {
      return [];
    },
  };
}

async function executeGuard({ user, allowlist, url, method = "POST", headers = {}, db }) {
  const observed = counters();
  const request = new Request(url ?? "https://factory.invalid/api/factory/continuity", {
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
    continuityOwnerRuntimeEnv: async () => env,
  };
  const result = await vm.runInNewContext(
    transpile(["ownerFailure", "continuityOwnerSameOrigin", "authorizeContinuityOwnerWrite"])
      + "\nauthorizeContinuityOwnerWrite(request);",
    context,
  );
  return { result, observed };
}

async function executeBody(rawBody, headers = {}) {
  const request = new Request("https://factory.invalid/api/factory/continuity", {
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
    OWNER_ACTIONS: new Set(["CAPTURE_CHECKPOINT"]),
  };
  return vm.runInNewContext(
    transpile(["ownerFailure", "sha256RawBody", "readBoundedContinuityOwnerBody"])
      + "\nreadBoundedContinuityOwnerBody(request);",
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
    action: "CAPTURE_CHECKPOINT",
    resourceScope: "factory:continuity:checkpoint",
    correlationId: "test:correlation",
    requestHash: "a".repeat(64),
  };
  const context = { Response, appendWriteCommandAudit, db, identity, responseFactory };
  const result = await vm.runInNewContext(
    transpile(["runAuditedContinuityOwnerAction"])
      + "\nrunAuditedContinuityOwnerAction(db, identity, responseFactory);",
    context,
  );
  return { result, events };
}

test("M1-03E protects exactly continuity POST before body and existing business execution", () => {
  const [analysis] = analyzeAuthSource(route, routePath).filter((item) => item.method === "POST");
  assert.equal(analysis.covered, true);
  assert.equal(analysis.authenticationGuard, "authorizeContinuityOwnerWrite");
  assert.equal(analysis.authorizationGuard, "authorizeContinuityOwnerWrite");

  const post = declarationSource("POST");
  const guard = post.indexOf("await authorizeContinuityOwnerWrite(request)");
  const body = post.indexOf("await readBoundedContinuityOwnerBody(request)");
  const identity = post.indexOf("await continuityOwnerAuditIdentity(");
  const audited = post.indexOf("await runAuditedContinuityOwnerAction(");
  const action = post.indexOf("executeContinuityOwnerAction(authorization.db, body.action)");
  assert.ok(guard >= 0 && guard < body && body < identity && identity < audited && audited < action);
  assert.equal(post.includes("request.json()"), false);
  assert.ok(post.includes('ownerFailure("CONTINUITY_CHECKPOINT_FAILED", 500)'));

  const page = source(pagePath);
  assert.ok(page.includes('fetch("/api/factory/continuity", { method: "POST"'));
  assert.ok(page.includes('JSON.stringify({ action: "CAPTURE_CHECKPOINT" })'));
  assert.ok(page.includes("Capture verified checkpoint"));
});

test("authentication, allowlist, origin, path, query, and database denials are exact and side-effect free", async () => {
  const db = recordingDb([]);
  const cases = [
    { user: null, allowlist: "owner@example.com", db, status: 401, code: "SIWC_AUTHENTICATION_REQUIRED" },
    { user: { email: "owner@example.com" }, allowlist: "", db, status: 503, code: "OWNER_WRITE_ALLOWLIST_UNCONFIGURED" },
    { user: { email: "intruder@example.com" }, allowlist: "owner@example.com", db, status: 403, code: "OWNER_WRITE_AUTHORIZATION_REQUIRED" },
    { user: { email: "owner@example.com" }, allowlist: "owner@example.com", db, headers: { origin: "https://evil.invalid" }, status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED" },
    { user: { email: "owner@example.com" }, allowlist: "owner@example.com", db, headers: { "sec-fetch-site": "cross-site" }, status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED" },
    { user: { email: "owner@example.com" }, allowlist: "owner@example.com", db, url: "https://factory.invalid/api/factory/continuity?x=1", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED" },
    { user: { email: "owner@example.com" }, allowlist: "owner@example.com", db, url: "https://factory.invalid/api/factory/continuity/extra", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED" },
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

test("body reader enforces content type, byte ceiling, fatal UTF-8, object, exact field, and action", async () => {
  const cases = [
    { raw: "{}", headers: { "content-type": "text/plain" }, status: 415, code: "JSON_CONTENT_TYPE_REQUIRED" },
    { raw: "{}", headers: { "content-length": String(16 * 1024 + 1) }, status: 413, code: "OWNER_WRITE_BODY_TOO_LARGE" },
    { raw: "x".repeat(16 * 1024 + 1), status: 413, code: "OWNER_WRITE_BODY_TOO_LARGE" },
    { raw: new Uint8Array([0xc3, 0x28]), status: 400, code: "OWNER_WRITE_JSON_INVALID" },
    { raw: "{", status: 400, code: "OWNER_WRITE_JSON_INVALID" },
    { raw: "null", status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { raw: "[]", status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { raw: "{}", status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { raw: JSON.stringify({ action: "CAPTURE_CHECKPOINT", extra: true }), status: 400, code: "OWNER_WRITE_COMMAND_FIELD_FORBIDDEN" },
    { raw: JSON.stringify({ action: "RUN" }), status: 403, code: "OWNER_WRITE_ACTION_FORBIDDEN" },
  ];
  for (const item of cases) {
    const result = await executeBody(item.raw, item.headers);
    assert.ok(result instanceof Response);
    assert.equal(result.status, item.status);
    assert.deepEqual(await result.json(), { error: item.code });
  }
});

test("valid action hashes exact raw bytes", async () => {
  const raw = ' { "action" : "CAPTURE_CHECKPOINT" } ';
  const result = await executeBody(raw);
  assert.equal(result.action, "CAPTURE_CHECKPOINT");
  assert.equal(result.bodySha256, createHash("sha256").update(Buffer.from(raw)).digest("hex"));
});

test("audit identity hashes normalized subject and validates or generates correlation id", async () => {
  const raw = JSON.stringify({ action: "CAPTURE_CHECKPOINT" });
  const body = await executeBody(raw);
  const validRequest = new Request("https://factory.invalid/api/factory/continuity", {
    method: "POST",
    headers: { "x-correlation-id": "valid:correlation-123" },
  });
  const context = {
    Request,
    crypto,
    request: validRequest,
    hashActorSubject,
    OWNER_HANDLER_IDENTITY: handlerIdentity,
    OWNER_RESOURCE_SCOPE: "factory:continuity:checkpoint",
    CORRELATION_ID_PATTERN: /^[A-Za-z0-9._:-]{8,200}$/,
  };
  const identity = await vm.runInNewContext(
    transpile(["continuityOwnerCorrelationId", "continuityOwnerAuditIdentity"])
      + '\ncontinuityOwnerAuditIdentity(request, "owner@example.com", "CAPTURE_CHECKPOINT", "' + body.bodySha256 + '");',
    context,
  );
  assert.deepEqual({ ...identity }, {
    handlerIdentity,
    actorType: "CHATGPT_OWNER",
    actorSubjectHash: await hashActorSubject("CHATGPT_OWNER", "owner@example.com"),
    action: "CAPTURE_CHECKPOINT",
    resourceScope: "factory:continuity:checkpoint",
    correlationId: "valid:correlation-123",
    requestHash: createHash("sha256").update(Buffer.from(raw)).digest("hex"),
  });

  context.request = new Request("https://factory.invalid/api/factory/continuity", {
    method: "POST",
    headers: { "x-correlation-id": "bad id" },
  });
  const generated = await vm.runInNewContext(
    transpile(["continuityOwnerCorrelationId"]) + "\ncontinuityOwnerCorrelationId(request);",
    context,
  );
  assert.match(generated, /^continuity-owner:[0-9a-f-]{36}$/);
  assert.equal(route.includes("rawBody:"), false);
  assert.equal(route.includes("user.email,"), false);
});

test("immutable audit is AUTHORIZED then SUCCEEDED with captured snapshot reference", async () => {
  const success = await executeAudited(async () => ({
    response: Response.json({ ok: true }),
    domainReceiptReference: "YTAF-V7-GREENFIELD-CONTINUITY-0123456789abcdef",
  }));
  assert.equal(success.result.status, 200);
  assert.deepEqual(success.events.map((item) => item.values[8]), ["AUTHORIZED", "SUCCEEDED"]);
  assert.deepEqual(success.events.map((item) => item.values[9]), [
    null,
    "YTAF-V7-GREENFIELD-CONTINUITY-0123456789abcdef",
  ]);
});

test("non-success and business exceptions audit FAILED with no domain reference", async () => {
  const rejected = await executeAudited(async () => ({
    response: Response.json({ error: "blocked" }, { status: 409 }),
    domainReceiptReference: null,
  }));
  assert.equal(rejected.result.status, 409);
  assert.deepEqual(rejected.events.map((item) => item.values[8]), ["AUTHORIZED", "FAILED"]);
  assert.deepEqual(rejected.events.map((item) => item.values[9]), [null, null]);

  await assert.rejects(
    () => executeAudited(async () => { throw new Error("BUSINESS_SENTINEL"); }),
    /BUSINESS_SENTINEL/,
  );
});

test("failed AUTHORIZED prevents execution and failed SUCCEEDED records FAILED", async () => {
  const events = [];
  let executions = 0;
  const db = recordingDb(events, { failPhase: "AUTHORIZED" });
  const identity = {
    handlerIdentity,
    actorType: "CHATGPT_OWNER",
    actorSubjectHash: "b".repeat(64),
    action: "CAPTURE_CHECKPOINT",
    resourceScope: "factory:continuity:checkpoint",
    correlationId: "test:correlation",
    requestHash: "a".repeat(64),
  };
  await assert.rejects(
    () => vm.runInNewContext(
      transpile(["runAuditedContinuityOwnerAction"])
        + "\nrunAuditedContinuityOwnerAction(db, identity, execute);",
      {
        Response,
        appendWriteCommandAudit,
        db,
        identity,
        execute: async () => {
          executions += 1;
          return { response: Response.json({ ok: true }), domainReceiptReference: "snapshot" };
        },
      },
    ),
    /AUDIT_AUTHORIZED_FAILED/,
  );
  assert.equal(executions, 0);
  assert.deepEqual(events, []);

  const terminalEvents = [];
  const terminalDb = recordingDb(terminalEvents, { failPhase: "SUCCEEDED" });
  await assert.rejects(
    () => vm.runInNewContext(
      transpile(["runAuditedContinuityOwnerAction"])
        + "\nrunAuditedContinuityOwnerAction(db, identity, execute);",
      {
        Response,
        appendWriteCommandAudit,
        db: terminalDb,
        identity,
        execute: async () => ({
          response: Response.json({ ok: true }),
          domainReceiptReference: "snapshot",
        }),
      },
    ),
    /AUDIT_SUCCEEDED_FAILED/,
  );
  assert.deepEqual(terminalEvents.map((item) => item.values[8]), ["AUTHORIZED", "FAILED"]);
  assert.deepEqual(terminalEvents.map((item) => item.values[9]), [null, null]);
});

test("CAPTURE_CHECKPOINT preserves success and active-provider business behavior", async () => {
  const statements = [];
  const db = {
    prepare(sql) {
      statements.push(sql);
      return {
        bind() { return this; },
        async run() { return {}; },
      };
    },
  };
  const base = {
    generatedAt: "2026-09-01T00:00:00.000Z",
    state: { checkpoint: "CONTINUITY_HARDENING_01" },
    ledger: { activeRequests: 0 },
    blockers: [],
  };
  const context = {
    Response,
    PROGRAM_ID: "YTAF-V7-GREENFIELD",
    runtime: async (value) => {
      assert.equal(value, db);
      return db;
    },
    buildSnapshot: async () => base,
    sha: async () => "0123456789abcdef" + "0".repeat(48),
    db,
  };
  const success = await vm.runInNewContext(
    transpile(["ownerFailure", "executeContinuityOwnerAction"])
      + '\nexecuteContinuityOwnerAction(db, "CAPTURE_CHECKPOINT");',
    context,
  );
  assert.equal(success.response.status, 200);
  assert.equal(success.domainReceiptReference, "YTAF-V7-GREENFIELD-CONTINUITY-0123456789abcdef");
  const payload = await success.response.json();
  assert.deepEqual(payload.captured, {
    id: "YTAF-V7-GREENFIELD-CONTINUITY-0123456789abcdef",
    lifecycleState: "FROZEN",
    contentHash: "0123456789abcdef" + "0".repeat(48),
  });
  assert.equal(statements.length, 1);
  assert.match(statements[0], /INSERT INTO v7_continuity_snapshots/);
  assert.match(statements[0], /ON CONFLICT\(id\) DO NOTHING/);

  statements.length = 0;
  context.buildSnapshot = async () => ({ ...base, ledger: { activeRequests: 1 } });
  const blocked = await vm.runInNewContext(
    transpile(["ownerFailure", "executeContinuityOwnerAction"])
      + '\nexecuteContinuityOwnerAction(db, "CAPTURE_CHECKPOINT");',
    context,
  );
  assert.equal(blocked.response.status, 409);
  assert.deepEqual(await blocked.response.json(), {
    error: "Checkpoint capture is blocked while provider requests are active",
  });
  assert.equal(blocked.domainReceiptReference, null);
  assert.deepEqual(statements, []);
});

test("registry and ratchets move exactly one POST without new gaps", () => {
  const registry = JSON.parse(source("governance/registries/http-handlers.json"));
  const handlers = registry.handlers;
  assert.deepEqual(handlers.find((item) => item.identity === handlerIdentity), {
    identity: handlerIdentity,
    sourceFile: routePath,
    routePath: "/api/factory/continuity",
    method: "POST",
    readWrite: "WRITE",
    actor: "CHATGPT_OWNER",
    authentication: "CHATGPT_SIWC",
    authorization: "FACTORY_EXPERT_EMAILS_ALLOWLIST_AND_SAME_ORIGIN_AND_EXACT_ACTION",
    audit: "IMMUTABLE_WRITE_COMMAND_AUDIT_AND_CONTINUITY_SNAPSHOT",
    status: "PROTECTED",
    remediationWp: "NONE",
  });
  assert.equal(handlers.length, 100);
  assert.equal(handlers.filter((item) => item.status === "PROTECTED").length, 24);
  assert.equal(handlers.filter((item) => item.status === "GAP_UNAUTHENTICATED_WRITE").length, 21);
  assert.deepEqual(
    ["GET", "POST"].map((method) => handlers.filter((item) =>
      item.status === "GAP_UNAUTHENTICATED_WRITE" && item.method === method).length),
    [13, 8],
  );
  assert.deepEqual(Object.fromEntries(
    ["PUBLIC", "CHATGPT_OWNER", "AUTOMATION", "PROVIDER_CALLBACK", "INTERNAL_SYSTEM", "UNCLASSIFIED"]
      .map((actor) => [actor, handlers.filter((item) => item.actor === actor).length])), {
    PUBLIC: 0,
    CHATGPT_OWNER: 30,
    AUTOMATION: 5,
    PROVIDER_CALLBACK: 1,
    INTERNAL_SYSTEM: 1,
    UNCLASSIFIED: 63,
  });

  const auth = JSON.parse(source("governance/baselines/auth-coverage.json")).uncoveredHandlers;
  assert.equal(auth.length, 41);
  assert.equal(auth.some((item) => item.identity === handlerIdentity), false);
  assert.deepEqual(
    ["GET", "POST", "HEAD"].map((method) => auth.filter((item) => item.method === method).length),
    [32, 8, 1],
  );
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
  for (const [name, digest] of Object.entries(expected)) {
    assert.equal(createHash("sha256").update(source("drizzle/" + name)).digest("hex"), digest);
  }
});
