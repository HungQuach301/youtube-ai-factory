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
const routePath = "app/api/factory/storage/google-drive/route.ts";
const callbackPath = "app/api/factory/storage/google-drive/callback/route.ts";
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

function sideEffectCounters() {
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
      if (["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_DRIVE_REFRESH_TOKEN"].includes(String(property))) {
        observed.provider += 1;
      }
      if (String(property).includes("TOKEN")) observed.token += 1;
      if (String(property).includes("RESERVATION")) observed.reservation += 1;
      if (String(property).includes("SPEND")) observed.spend += 1;
      return Reflect.get(target, property, receiver);
    },
  });
}

async function executeGuard({ user, allowlist, url, method = "POST", headers = {}, db }) {
  const observed = sideEffectCounters();
  const request = new Request(url ?? "https://factory.invalid/api/factory/storage/google-drive", {
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
    Set,
    request,
    getChatGPTUser: async () => user,
    googleDriveOwnerRuntimeEnv: async () => env,
  };
  const result = await vm.runInNewContext(
    transpile(["ownerFailure", "googleDriveOwnerSameOrigin", "authorizeGoogleDriveOwnerWrite"])
      + "\nauthorizeGoogleDriveOwnerWrite(request);",
    context,
  );
  return { result, observed };
}

async function executeBody(rawBody, headers = {}) {
  const request = new Request("https://factory.invalid/api/factory/storage/google-drive", {
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
    OWNER_ACTIONS: new Set(["VERIFY", "DISCONNECT"]),
  };
  return vm.runInNewContext(
    transpile(["ownerFailure", "sha256RawBody", "readBoundedGoogleDriveOwnerBody"])
      + "\nreadBoundedGoogleDriveOwnerBody(request);",
    context,
  );
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
      };
    },
  };
}

async function executeAudited(responseFactory, options = {}) {
  const events = [];
  const db = recordingDb(events, options);
  const identity = {
    handlerIdentity,
    actorType: "CHATGPT_OWNER",
    actorSubjectHash: await hashActorSubject("CHATGPT_OWNER", "owner@example.com"),
    action: "VERIFY",
    resourceScope: "factory:storage:google-drive",
    correlationId: "test:correlation",
    requestHash: "a".repeat(64),
  };
  const context = { Response, appendWriteCommandAudit, db, identity, responseFactory };
  const result = await vm.runInNewContext(
    transpile(["runAuditedGoogleDriveOwnerAction"])
      + "\nrunAuditedGoogleDriveOwnerAction(db, identity, responseFactory);",
    context,
  );
  return { result, events };
}

test("M1-03D protects exactly Google Drive POST before body and preserves GET/callback", () => {
  const [analysis] = analyzeAuthSource(route, routePath).filter((item) => item.method === "POST");
  assert.equal(analysis.covered, true);
  assert.equal(analysis.authenticationGuard, "authorizeGoogleDriveOwnerWrite");
  assert.equal(analysis.authorizationGuard, "authorizeGoogleDriveOwnerWrite");

  const post = declarationSource("POST");
  const guard = post.indexOf("await authorizeGoogleDriveOwnerWrite(request)");
  const body = post.indexOf("await readBoundedGoogleDriveOwnerBody(request)");
  const identity = post.indexOf("await googleDriveOwnerAuditIdentity(");
  const audited = post.indexOf("await runAuditedGoogleDriveOwnerAction(");
  const action = post.indexOf("executeGoogleDriveOwnerAction(request, body.action)");
  assert.ok(guard >= 0 && guard < body && body < identity && identity < audited && audited < action);
  assert.equal(post.includes("request.json()"), false);
  assert.ok(post.includes('ownerFailure("GOOGLE_DRIVE_ACTION_FAILED", 500)'));

  assert.equal(createHash("sha256").update(declarationSource("GET")).digest("hex"), "65ab34bd41527229752eef64677babbb9f1e4516e1cb1757f5d013c328eb063d");
  assert.equal(createHash("sha256").update(source(callbackPath)).digest("hex"), "7507e589e7175ff6ee3ca428bb6f42cbde660ac8e73a0096351d7d0a681b87c4");
  assert.equal(createHash("sha256").update(source("lib/google-drive.ts")).digest("hex"), "6b87c8c7d1f19fafc0f4d9d84ed5b52fdf34e621bcd6eebf1462bce99c77c75e");
});

test("authentication, allowlist, origin, and database denials are exact with zero side effects", async () => {
  const db = recordingDb([]);
  const cases = [
    { user: null, allowlist: "owner@example.com", db, status: 401, code: "SIWC_AUTHENTICATION_REQUIRED" },
    { user: { email: "owner@example.com" }, allowlist: "", db, status: 503, code: "OWNER_WRITE_ALLOWLIST_UNCONFIGURED" },
    { user: { email: "intruder@example.com" }, allowlist: "owner@example.com", db, status: 403, code: "OWNER_WRITE_AUTHORIZATION_REQUIRED" },
    { user: { email: "owner@example.com" }, allowlist: "owner@example.com", db, headers: { origin: "https://evil.invalid" }, status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED" },
    { user: { email: "owner@example.com" }, allowlist: "owner@example.com", db, url: "https://factory.invalid/api/factory/storage/google-drive?x=1", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED" },
    { user: { email: "owner@example.com" }, allowlist: "owner@example.com", db: undefined, status: 503, code: "CANONICAL_DATABASE_UNAVAILABLE" },
  ];

  for (const item of cases) {
    const { result, observed } = await executeGuard(item);
    assert.ok(result instanceof Response);
    assert.equal(result.status, item.status);
    assert.deepEqual(await result.json(), { error: item.code });
    assert.deepEqual(observed, sideEffectCounters());
  }
});

test("owner guard normalizes SIWC email and requires exact allowlist membership", async () => {
  const db = recordingDb([]);
  const allowed = await executeGuard({
    user: { email: " Owner@Example.COM " },
    allowlist: "another@example.com, owner@example.com",
    db,
  });
  assert.equal(allowed.result.normalizedEmail, "owner@example.com");
  assert.equal(allowed.result.db, db);

  const notSubstring = await executeGuard({
    user: { email: "owner@example.com.evil" },
    allowlist: "owner@example.com",
    db,
  });
  assert.equal(notSubstring.result.status, 403);
  assert.deepEqual(await notSubstring.result.json(), { error: "OWNER_WRITE_AUTHORIZATION_REQUIRED" });
});

test("body reader enforces content type, byte ceiling, UTF-8 JSON object, action, and fields", async () => {
  const cases = [
    { raw: "{}", headers: { "content-type": "text/plain" }, status: 415, code: "JSON_CONTENT_TYPE_REQUIRED" },
    { raw: "{}", headers: { "content-length": String(16 * 1024 + 1) }, status: 413, code: "OWNER_WRITE_BODY_TOO_LARGE" },
    { raw: "x".repeat(16 * 1024 + 1), status: 413, code: "OWNER_WRITE_BODY_TOO_LARGE" },
    { raw: new Uint8Array([0xc3, 0x28]), status: 400, code: "OWNER_WRITE_JSON_INVALID" },
    { raw: "{", status: 400, code: "OWNER_WRITE_JSON_INVALID" },
    { raw: "null", status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { raw: "[]", status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { raw: "{}", status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { raw: JSON.stringify({ action: "VERIFY", extra: true }), status: 400, code: "OWNER_WRITE_COMMAND_FIELD_FORBIDDEN" },
    { raw: JSON.stringify({ action: "CONNECT" }), status: 403, code: "OWNER_WRITE_ACTION_FORBIDDEN" },
  ];
  for (const item of cases) {
    const result = await executeBody(item.raw, item.headers);
    assert.ok(result instanceof Response);
    assert.equal(result.status, item.status);
    assert.deepEqual(await result.json(), { error: item.code });
  }
});

test("valid VERIFY and DISCONNECT commands hash the exact raw bytes", async () => {
  for (const action of ["VERIFY", "DISCONNECT"]) {
    const raw = ` { "action" : "${action}" } `;
    const result = await executeBody(raw);
    assert.equal(result.action, action);
    assert.equal(result.bodySha256, createHash("sha256").update(Buffer.from(raw)).digest("hex"));
  }
});

test("audit identity hashes normalized subject and validates or generates correlation id", async () => {
  const raw = JSON.stringify({ action: "VERIFY" });
  const body = await executeBody(raw);
  const validRequest = new Request("https://factory.invalid/api/factory/storage/google-drive", {
    method: "POST",
    headers: { "x-correlation-id": "valid:correlation-123" },
  });
  const context = {
    Request,
    crypto,
    request: validRequest,
    body,
    hashActorSubject,
    OWNER_HANDLER_IDENTITY: handlerIdentity,
    CORRELATION_ID_PATTERN: /^[A-Za-z0-9._:-]{8,200}$/,
  };
  const identity = await vm.runInNewContext(
    transpile(["googleDriveOwnerCorrelationId", "googleDriveOwnerAuditIdentity"])
      + '\ngoogleDriveOwnerAuditIdentity(request, "owner@example.com", "VERIFY", body.bodySha256);',
    context,
  );
  assert.deepEqual({ ...identity }, {
    handlerIdentity,
    actorType: "CHATGPT_OWNER",
    actorSubjectHash: await hashActorSubject("CHATGPT_OWNER", "owner@example.com"),
    action: "VERIFY",
    resourceScope: "factory:storage:google-drive",
    correlationId: "valid:correlation-123",
    requestHash: createHash("sha256").update(Buffer.from(raw)).digest("hex"),
  });

  context.request = new Request("https://factory.invalid/api/factory/storage/google-drive", {
    method: "POST",
    headers: { "x-correlation-id": "bad id" },
  });
  const generated = await vm.runInNewContext(
    transpile(["googleDriveOwnerCorrelationId"])
      + "\ngoogleDriveOwnerCorrelationId(request);",
    context,
  );
  assert.match(generated, /^google-drive-owner:[0-9a-f-]{36}$/);
  assert.equal(route.includes("rawBody:"), false);
  assert.equal(route.includes("user.email,"), false);
});

test("immutable audit writes AUTHORIZED before execution and exactly one terminal outcome", async () => {
  const success = await executeAudited(async () => Response.json({ ok: true }));
  assert.equal(success.result.status, 200);
  assert.deepEqual(success.events.map((item) => item.values[8]), ["AUTHORIZED", "SUCCEEDED"]);
  assert.deepEqual(success.events.map((item) => item.values[9]), [null, null]);

  const rejected = await executeAudited(async () => Response.json({ error: "blocked" }, { status: 409 }));
  assert.equal(rejected.result.status, 409);
  assert.deepEqual(rejected.events.map((item) => item.values[8]), ["AUTHORIZED", "FAILED"]);

  const events = [];
  let executions = 0;
  const db = recordingDb(events, { failPhase: "AUTHORIZED" });
  const identity = {
    handlerIdentity,
    actorType: "CHATGPT_OWNER",
    actorSubjectHash: "b".repeat(64),
    action: "VERIFY",
    resourceScope: "factory:storage:google-drive",
    correlationId: "test:correlation",
    requestHash: "a".repeat(64),
  };
  await assert.rejects(
    () => vm.runInNewContext(
      transpile(["runAuditedGoogleDriveOwnerAction"])
        + "\nrunAuditedGoogleDriveOwnerAction(db, identity, execute);",
      { Response, appendWriteCommandAudit, db, identity, execute: async () => { executions += 1; return Response.json({ ok: true }); } },
    ),
    /AUDIT_AUTHORIZED_FAILED/,
  );
  assert.equal(executions, 0);
  assert.deepEqual(events, []);
});

test("audit and business exceptions reach FAILED and surface only through the generic POST catch", async () => {
  await assert.rejects(
    () => executeAudited(async () => { throw new Error("BUSINESS_SECRET_SENTINEL"); }),
    /BUSINESS_SECRET_SENTINEL/,
  );
  await assert.rejects(
    () => executeAudited(async () => Response.json({ ok: true }), { failPhase: "SUCCEEDED" }),
    /AUDIT_SUCCEEDED_FAILED/,
  );
  const post = declarationSource("POST");
  assert.ok(post.includes('ownerFailure("GOOGLE_DRIVE_ACTION_FAILED", 500)'));
  assert.equal(post.includes("error.message"), false);
  assert.equal(post.includes("response.text"), false);
  assert.equal(post.includes("response.json"), false);
});

test("authorized VERIFY and DISCONNECT invoke only their existing helper once", async () => {
  for (const action of ["VERIFY", "DISCONNECT"]) {
    const calls = { verify: 0, disconnect: 0, status: 0, origin: null };
    const request = new Request("https://factory.invalid/api/factory/storage/google-drive", {
      method: "POST",
      headers: { "x-forwarded-host": "factory.example", "x-forwarded-proto": "https" },
    });
    const context = {
      Request,
      Response,
      URL,
      request,
      action,
      verifyDriveConnection: async () => { calls.verify += 1; },
      disconnectDrive: async () => { calls.disconnect += 1; },
      driveStatus: async (origin) => { calls.status += 1; calls.origin = origin; return { connected: action === "VERIFY" }; },
    };
    const response = await vm.runInNewContext(
      transpile(["ownerFailure", "requestOrigin", "executeGoogleDriveOwnerAction"])
        + "\nexecuteGoogleDriveOwnerAction(request, action);",
      context,
    );
    assert.equal(response.status, 200);
    assert.deepEqual(calls, {
      verify: action === "VERIFY" ? 1 : 0,
      disconnect: action === "DISCONNECT" ? 1 : 0,
      status: 1,
      origin: "https://factory.example",
    });
  }
});

test("registry, ratchets, migrations, and no-new-side-effect boundaries are exact", () => {
  const registry = JSON.parse(source("governance/registries/http-handlers.json"));
  const handlers = registry.handlers;
  assert.deepEqual(handlers.find((item) => item.identity === handlerIdentity), {
    identity: handlerIdentity,
    sourceFile: routePath,
    routePath: "/api/factory/storage/google-drive",
    method: "POST",
    readWrite: "WRITE",
    actor: "CHATGPT_OWNER",
    authentication: "CHATGPT_SIWC",
    authorization: "FACTORY_EXPERT_EMAILS_ALLOWLIST_AND_SAME_ORIGIN_AND_EXACT_ACTION",
    audit: "IMMUTABLE_WRITE_COMMAND_AUDIT",
    status: "PROTECTED",
    remediationWp: "NONE",
  });
  assert.equal(handlers.length, 100);
  assert.equal(handlers.filter((item) => item.status === "PROTECTED").length, 16);
  assert.equal(handlers.filter((item) => item.status === "GAP_UNAUTHENTICATED_WRITE").length, 29);
  assert.deepEqual(
    ["GET", "POST"].map((method) => handlers.filter((item) => item.status === "GAP_UNAUTHENTICATED_WRITE" && item.method === method).length),
    [13, 16],
  );
  assert.deepEqual(Object.fromEntries(
    ["PUBLIC", "CHATGPT_OWNER", "AUTOMATION", "PROVIDER_CALLBACK", "INTERNAL_SYSTEM", "UNCLASSIFIED"]
      .map((actor) => [actor, handlers.filter((item) => item.actor === actor).length])), {
    PUBLIC: 0,
    CHATGPT_OWNER: 22,
    AUTOMATION: 5,
    PROVIDER_CALLBACK: 1,
    INTERNAL_SYSTEM: 1,
    UNCLASSIFIED: 71,
  });

  const callback = handlers.find((item) => item.identity === callbackPath + "#GET");
  assert.deepEqual(callback, {
    identity: callbackPath + "#GET",
    sourceFile: callbackPath,
    routePath: "/api/factory/storage/google-drive/callback",
    method: "GET",
    readWrite: "READ",
    actor: "PROVIDER_CALLBACK",
    authentication: "OAUTH_STATE",
    authorization: "OAUTH_STATE_BINDING",
    audit: "DRIVE_CONNECTION_STATE_UPDATE",
    status: "PARTIAL_CALLBACK_STATE_ONLY",
    remediationWp: "M1-09",
  });
  assert.deepEqual(handlers.find((item) => item.identity === routePath + "#GET"), {
    identity: routePath + "#GET",
    sourceFile: routePath,
    routePath: "/api/factory/storage/google-drive",
    method: "GET",
    readWrite: "READ",
    actor: "UNCLASSIFIED",
    authentication: "NONE",
    authorization: "NONE",
    audit: "NOT_APPLICABLE_READ_ONLY",
    status: "GAP_UNAUTHENTICATED_READ",
    remediationWp: "M1-04",
  });

  const auth = JSON.parse(source("governance/baselines/auth-coverage.json")).uncoveredHandlers;
  assert.equal(auth.length, 49);
  assert.equal(auth.some((item) => item.identity === handlerIdentity), false);
  assert.deepEqual(
    ["GET", "POST", "HEAD"].map((method) => auth.filter((item) => item.method === method).length),
    [32, 16, 1],
  );

  const expectedMigrations = {
    "0129_exact_tree_deployment_receipts.sql": "ffe1b3eaa00078f477afd043cbeb8662cd4ae1e305f5082b089f0b0e501ecea4",
    "0130_scoped_deployment_receipt_writer.sql": "113fb6178656a057e2e63b6cef24b018da92beab3f915b1c7a11cd690af0ad9e",
    "0131_owner_deployment_receipt_finalization.sql": "2683d493076d2f47149a33a592ddd9ba30d3c6444e343c77549cc9fd2167de84",
    "0132_factory_write_command_audit.sql": "b61157d4ef1c5687264969c001cafa82c854d2ffbb621befa4a7ad487f734969",
  };
  const migrations = readdirSync(join(root, "drizzle")).filter((name) => name.endsWith(".sql")).sort();
  assert.equal(migrations.at(-1), "0132_factory_write_command_audit.sql");
  for (const [name, digest] of Object.entries(expectedMigrations)) {
    assert.equal(createHash("sha256").update(source("drizzle/" + name)).digest("hex"), digest);
  }

  for (const forbidden of ["fetch(", "BUCKET", "R2Bucket", "COST_RESERVATION", "ACTUAL_SPEND", "decrypt", "revokeToken"] ) {
    assert.equal(route.includes(forbidden), false);
  }
});
