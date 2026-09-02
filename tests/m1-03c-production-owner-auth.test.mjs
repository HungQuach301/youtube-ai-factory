import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { appendWriteCommandAudit, hashActorSubject } from "../lib/write-command-audit.ts";
import { analyzeActorSource, analyzeAuthSource } from "../scripts/lib/candidate-ci-policy.mjs";

const root = process.cwd();
const routePath = "app/api/projects/[id]/production/route.ts";
const handlerIdentity = routePath + "#POST";
const source = (path) => readFileSync(join(root, path), "utf8");
const route = source(routePath);
const routeFile = ts.createSourceFile(routePath, route, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

function declarationSource(name) {
  const declaration = routeFile.statements.find((statement) =>
    (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name?.text === name);
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
  return { body: 0, database: 0, r2: 0, provider: 0, spend: 0, business: 0, audits: 0 };
}

function guardedEnv(allowlist, observed, db = {}) {
  return new Proxy({ FACTORY_EXPERT_EMAILS: allowlist, DB: db }, {
    get(target, property, receiver) {
      if (property === "DB") observed.database += 1;
      if (property === "BUCKET") observed.r2 += 1;
      if (["OPENAI_API_KEY", "ELEVENLABS_API_KEY", "PEXELS_API_KEY", "PIXABAY_API_KEY"].includes(String(property))) observed.provider += 1;
      if (property === "ACTUAL_SPEND" || property === "COST_RESERVATION") observed.spend += 1;
      return Reflect.get(target, property, receiver);
    },
  });
}

async function executeGuard(user, env, headers = {}) {
  const request = new Request("https://factory.invalid/api/projects/project-1/production", {
    method: "POST",
    headers: {
      origin: "https://factory.invalid",
      "sec-fetch-site": "same-origin",
      ...headers,
    },
  });
  const context = {
    Request,
    Response,
    URL,
    Set,
    request,
    getChatGPTUser: async () => user,
    productionOwnerRuntimeEnv: async () => env,
  };
  return vm.runInNewContext(transpile(["ownerFailure", "ownerSameOrigin", "authorizeProductionOwnerWrite"]) +
    "\nauthorizeProductionOwnerWrite(request);", context);
}

async function executeBody(rawBody, headers = {}) {
  const request = new Request("https://factory.invalid/api/projects/project-1/production", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: rawBody,
  });
  const context = {
    Request,
    Response,
    Set,
    TextDecoder,
    crypto,
    request,
    MAX_OWNER_BODY_BYTES: 16 * 1024,
    OWNER_ACTIONS: new Set(["APPROVE_SCENE", "PASS_STORYBOARD_GATE", "BUILD_EXPORT"]),
  };
  return vm.runInNewContext(transpile(["ownerFailure", "sha256RawBody", "readBoundedProductionOwnerBody"]) +
    "\nreadBoundedProductionOwnerBody(request);", context);
}

function recordingDb(events, options = {}) {
  return {
    prepare(sql) {
      let values = [];
      return {
        bind(...next) { values = next; return this; },
        async run() {
          if (options.failSuccess && values[8] === "SUCCEEDED") throw new Error("AUDIT_SUCCESS_FAILED");
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
    action: "BUILD_EXPORT",
    resourceScope: "project:project-1:production",
    correlationId: "test:correlation",
    requestHash: "a".repeat(64),
  };
  const context = { Response, appendWriteCommandAudit, db, identity, responseFactory };
  const result = await vm.runInNewContext(transpile(["runAuditedProductionOwnerAction"]) +
    "\nrunAuditedProductionOwnerAction(db, identity, responseFactory);", context);
  return { result, events };
}

test("M1-03C guards exactly production POST before body, schema, database, and side effects", () => {
  const [analysis] = analyzeAuthSource(route, routePath).filter((item) => item.method === "POST");
  assert.equal(analysis.covered, true);
  assert.equal(analysis.authenticationGuard, "authorizeProductionOwnerWrite");
  assert.equal(analysis.authorizationGuard, "authorizeProductionOwnerWrite");

  const post = declarationSource("POST");
  const guard = post.indexOf("await authorizeProductionOwnerWrite(request)");
  const body = post.indexOf("await readBoundedProductionOwnerBody(request)");
  const params = post.indexOf("await context.params");
  const auditIdentity = post.indexOf("await productionOwnerAuditIdentity(");
  const auditedCommand = post.indexOf("await runAuditedProductionOwnerAction(");
  assert.ok(guard >= 0 && guard < body);
  assert.ok(body < params && params < auditIdentity && auditIdentity < auditedCommand);
  assert.equal(post.includes("request.json()"), false);
  assert.equal(post.includes("ensureProductionSchema"), false);
  assert.equal(post.includes("seedProduction"), false);
  assert.equal(post.includes("getDb"), false);

  const executor = declarationSource("executeProductionOwnerAction");
  assert.ok(executor.indexOf("await ensureProductionSchema()") < executor.indexOf("await seedProduction(projectId)"));
  assert.ok(executor.indexOf("await seedProduction(projectId)") < executor.indexOf("await getDb()"));

  const audited = declarationSource("runAuditedProductionOwnerAction");
  assert.ok(audited.indexOf('"AUTHORIZED"') < audited.indexOf("await execute()"));
});

test("authentication, allowlist, and same-origin denials are exact and side-effect free", async () => {
  const cases = [
    { user: null, allowlist: "owner@example.com", headers: {}, status: 401, code: "SIWC_AUTHENTICATION_REQUIRED" },
    { user: { email: "owner@example.com" }, allowlist: "", headers: {}, status: 503, code: "OWNER_WRITE_ALLOWLIST_UNCONFIGURED" },
    { user: { email: "intruder@example.com" }, allowlist: "owner@example.com", headers: {}, status: 403, code: "OWNER_WRITE_AUTHORIZATION_REQUIRED" },
    { user: { email: "owner@example.com" }, allowlist: "owner@example.com", headers: { origin: "https://evil.invalid" }, status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED" },
  ];
  for (const item of cases) {
    const observed = counters();
    const result = await executeGuard(item.user, guardedEnv(item.allowlist, observed), item.headers);
    assert.ok(result instanceof Response);
    assert.equal(result.status, item.status);
    assert.deepEqual(await result.json(), { error: item.code });
    assert.equal(observed.body, 0);
    assert.equal(observed.r2, 0);
    assert.equal(observed.provider, 0);
    assert.equal(observed.spend, 0);
    assert.equal(observed.business, 0);
    assert.equal(observed.audits, 0);
  }
});

test("owner guard normalizes allowlist identity and requires canonical audit database", async () => {
  const observed = counters();
  const db = recordingDb([]);
  const result = await executeGuard({ email: " Owner@Example.COM " }, guardedEnv("owner@example.com", observed, db));
  assert.equal(result.normalizedEmail, "owner@example.com");
  assert.equal(result.env.DB, db);

  const missing = await executeGuard({ email: "owner@example.com" }, { FACTORY_EXPERT_EMAILS: "owner@example.com" });
  assert.ok(missing instanceof Response);
  assert.equal(missing.status, 503);
  assert.deepEqual(await missing.json(), { error: "CANONICAL_DATABASE_UNAVAILABLE" });
});

test("body reader enforces JSON, exact actions, exact fields, and a 16 KiB byte ceiling", async () => {
  for (const action of ["APPROVE_SCENE", "PASS_STORYBOARD_GATE", "BUILD_EXPORT"]) {
    const raw = action === "APPROVE_SCENE"
      ? JSON.stringify({ action, sceneId: "scene-1" })
      : JSON.stringify({ action });
    const result = await executeBody(raw);
    assert.equal(result.payload.action, action);
    assert.equal(result.bodySha256, createHash("sha256").update(Buffer.from(raw)).digest("hex"));
  }

  const forbidden = await executeBody(JSON.stringify({ action: "DELETE_PROJECT" }));
  assert.equal(forbidden.status, 403);
  assert.deepEqual(await forbidden.json(), { error: "OWNER_WRITE_ACTION_FORBIDDEN" });

  const extra = await executeBody(JSON.stringify({ action: "BUILD_EXPORT", sceneId: "forbidden" }));
  assert.equal(extra.status, 400);
  assert.deepEqual(await extra.json(), { error: "OWNER_WRITE_COMMAND_FIELD_FORBIDDEN" });

  const missingScene = await executeBody(JSON.stringify({ action: "APPROVE_SCENE" }));
  assert.equal(missingScene.status, 400);
  assert.deepEqual(await missingScene.json(), { error: "SCENE_ID_REQUIRED" });

  const oversized = await executeBody(JSON.stringify({ action: "BUILD_EXPORT", padding: "x".repeat(17 * 1024) }));
  assert.equal(oversized.status, 413);
  assert.deepEqual(await oversized.json(), { error: "OWNER_WRITE_BODY_TOO_LARGE" });

  const wrongType = await executeBody("{}", { "content-type": "text/plain" });
  assert.equal(wrongType.status, 415);
  assert.deepEqual(await wrongType.json(), { error: "JSON_CONTENT_TYPE_REQUIRED" });
});

test("immutable audit is AUTHORIZED before business and reaches one terminal phase", async () => {
  const success = await executeAudited(async () => Response.json({ ok: true }));
  assert.equal(success.result.status, 200);
  assert.deepEqual(success.events.map((item) => item.values[8]), ["AUTHORIZED", "SUCCEEDED"]);

  const rejected = await executeAudited(async () => Response.json({ error: "blocked" }, { status: 409 }));
  assert.equal(rejected.result.status, 409);
  assert.deepEqual(rejected.events.map((item) => item.values[8]), ["AUTHORIZED", "FAILED"]);

  await assert.rejects(
    () => executeAudited(async () => { throw new Error("BUSINESS_SENTINEL"); }),
    /BUSINESS_SENTINEL/,
  );

  await assert.rejects(
    () => executeAudited(async () => Response.json({ ok: true }), { failSuccess: true }),
    /AUDIT_SUCCESS_FAILED/,
  );
});

test("audit identity is exact, hashes normalized subject/raw body, and validates or generates correlation id", async () => {
  const raw = JSON.stringify({ action: "BUILD_EXPORT" });
  const body = await executeBody(raw);
  const context = {
    Request,
    crypto,
    request: new Request("https://factory.invalid/api/projects/p-1/production", {
      method: "POST",
      headers: { "x-correlation-id": "valid:correlation-123" },
    }),
    body,
    hashActorSubject,
    OWNER_HANDLER_IDENTITY: handlerIdentity,
    CORRELATION_ID_PATTERN: /^[A-Za-z0-9._:-]{8,200}$/,
  };
  const identity = await vm.runInNewContext(
    transpile(["productionOwnerCorrelationId", "productionOwnerAuditIdentity"]) +
      '\nproductionOwnerAuditIdentity(request, "p-1", "owner@example.com", "BUILD_EXPORT", body.bodySha256);',
    context,
  );
  assert.deepEqual({ ...identity }, {
    handlerIdentity,
    actorType: "CHATGPT_OWNER",
    actorSubjectHash: await hashActorSubject("CHATGPT_OWNER", "owner@example.com"),
    action: "BUILD_EXPORT",
    resourceScope: "project:p-1:production",
    correlationId: "valid:correlation-123",
    requestHash: createHash("sha256").update(Buffer.from(raw)).digest("hex"),
  });
  assert.equal(route.includes("rawBody:"), false);
  assert.equal(route.includes("user.email,"), false);
});

test("governance ratchets are exact while M1-06 actor debt remains untouched", () => {
  const registry = JSON.parse(source("governance/registries/http-handlers.json"));
  const handlers = registry.handlers;
  const entry = handlers.find((item) => item.identity === handlerIdentity);
  assert.deepEqual(entry, {
    identity: handlerIdentity,
    sourceFile: routePath,
    routePath: "/api/projects/[id]/production",
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
  assert.equal(handlers.filter((item) => item.status === "PROTECTED").length, 21);
  assert.equal(handlers.filter((item) => item.actor === "CHATGPT_OWNER").length, 27);
  assert.equal(handlers.filter((item) => item.actor === "UNCLASSIFIED").length, 66);
  assert.equal(handlers.filter((item) => item.status === "GAP_UNAUTHENTICATED_WRITE").length, 24);
  assert.deepEqual(
    ["GET", "POST"].map((method) => handlers.filter((item) => item.status === "GAP_UNAUTHENTICATED_WRITE" && item.method === method).length),
    [13, 11],
  );

  const auth = JSON.parse(source("governance/baselines/auth-coverage.json")).uncoveredHandlers;
  assert.equal(auth.length, 44);
  assert.equal(auth.some((item) => item.identity === handlerIdentity), false);
  assert.deepEqual(
    ["GET", "POST", "HEAD"].map((method) => auth.filter((item) => item.method === method).length),
    [32, 11, 1],
  );

  const noWrite = JSON.parse(source("governance/baselines/no-write-in-get.json"));
  const noWriteEntries = noWrite.handlersWithReachableWrites;
  assert.equal(noWriteEntries.length, 16);

  const actor = JSON.parse(source("governance/baselines/actor-separation.json"));
  const actorEntries = actor.unseparatedCommands;
  assert.equal(actorEntries.length, 19);
  assert.equal(actorEntries.some((item) =>
    JSON.stringify(item).includes(handlerIdentity + ":APPROVE_SCENE")), true);
  assert.equal(analyzeActorSource(route, routePath).some((item) =>
    item.identity === handlerIdentity + ":APPROVE_SCENE"), true);
});

test("migration head and historical migration hashes remain 0132 with no provider or spend delta", () => {
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
  assert.equal(route.includes("fetch("), false);
  assert.equal(route.includes("OPENAI_API_KEY"), false);
  assert.equal(route.includes("COST_RESERVATION"), false);
  assert.equal(route.includes("ACTUAL_SPEND"), false);
});
