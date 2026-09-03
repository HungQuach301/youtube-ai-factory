import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { analyzeActorSource, analyzeAuthSource } from "../scripts/lib/candidate-ci-policy.mjs";

const root = process.cwd();
const routePath = "app/api/projects/[id]/references/route.ts";
const handlerIdentity = routePath + "#POST";
const source = (path) => readFileSync(join(root, path), "utf8");
const route = source(routePath);
const routeFile = ts.createSourceFile(routePath, route, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const actions = new Set(["DISCOVER_REFERENCES", "RUN_BENCHMARK", "SET_MODE", "APPROVE_BENCHMARK", "TOGGLE_REFERENCE"]);
const fields = {
  DISCOVER_REFERENCES: new Set(["action"]),
  RUN_BENCHMARK: new Set(["action"]),
  SET_MODE: new Set(["action", "verificationMode"]),
  APPROVE_BENCHMARK: new Set(["action"]),
  TOGGLE_REFERENCE: new Set(["action", "referenceId"]),
};

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
  return new Request(options.url || "https://factory.invalid/api/projects/project-1/references", {
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
      if (property === "YOUTUBE_API_KEY") observed.provider += 1;
      return Reflect.get(target, property, receiver);
    },
  });
  const result = await vm.runInNewContext(
    transpile(["referenceOwnerFailure", "referenceOwnerSameOrigin", "authorizeReferenceOwnerWrite"]) + "\nauthorizeReferenceOwnerWrite(request);",
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
      "referenceOwnerFailure",
      "referenceOwnerSha256RawBytes",
      "referenceOwnerExactKeys",
      "referenceOwnerBoundedString",
      "referenceOwnerPayloadValid",
      "readReferenceOwnerCommand",
    ]) + "\nreadReferenceOwnerCommand(request);",
    {
      Response,
      Headers,
      TextDecoder,
      Uint8Array,
      crypto,
      request,
      REFERENCE_OWNER_ACTIONS: actions,
      REFERENCE_OWNER_FIELDS: fields,
      MAX_REFERENCE_OWNER_BODY_BYTES: 16 * 1024,
    },
  );
}

test("M1-03K protects references POST before params, body, runtime DDL, D1, R2, provider, spend, usage, audit, and business", () => {
  const [analysis] = analyzeAuthSource(route, routePath).filter((item) => item.method === "POST");
  assert.equal(analysis.covered, true);
  assert.equal(analysis.authenticationGuard, "authorizeReferenceOwnerWrite");
  assert.equal(analysis.authorizationGuard, "authorizeReferenceOwnerWrite");
  const post = functionSource("POST");
  const guard = post.indexOf("await authorizeReferenceOwnerWrite(request)");
  const actor = post.indexOf("requireOwnerAuthority(authorization.actorType)");
  const command = post.indexOf("await readReferenceOwnerCommand(request)");
  const params = post.indexOf("await context.params");
  const binding = post.indexOf("await bindReferenceOwnerResource(");
  const replay = post.indexOf("await lookupReferenceOwnerReplay(");
  const audit = post.indexOf("await runAuditedReferenceOwnerCommand(");
  const execute = post.indexOf("executeReferenceOwnerCommand(command, id)");
  assert.ok(guard >= 0 && guard < actor && actor < command && command < params && params < binding && binding < replay && replay < audit && audit < execute);
  for (const forbidden of [
    "request.json(",
    "request.arrayBuffer(",
    "request.formData(",
    "ensureSchema(",
    "getDb(",
    ".prepare(",
    ".insert(",
    ".update(",
    ".delete(",
    ".put(",
    "fetch(",
    "reserve",
    "spend",
    "recordOpenAIUsage(",
  ]) assert.equal(post.includes(forbidden), false, forbidden + " must remain behind authorization");
});

test("anonymous, wrong-origin, non-owner, unconfigured, and unavailable-database denials touch no body or mutable dependency", async () => {
  const cases = [
    { user: null, status: 401, code: "SIWC_AUTHENTICATION_REQUIRED", environment: 0 },
    { origin: "https://evil.invalid", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED", environment: 0 },
    { fetchSite: "cross-site", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED", environment: 0 },
    { url: "https://factory.invalid/api/projects/project-1/references/extra", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED", environment: 0 },
    { url: "https://factory.invalid/api/projects/project-1/references?mode=wrong", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED", environment: 0 },
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

test("explicit owner authority denies AGENT before APPROVE_BENCHMARK business authority", async () => {
  const actorSource = functionSource("requireOwnerAuthority");
  assert.ok(actorSource.includes('actorType === "AGENT"'));
  assert.ok(actorSource.includes("AGENT_OWNER_COMMAND_FORBIDDEN"));
  assert.equal(analyzeActorSource(route, routePath).some((item) => item.command === "APPROVE_BENCHMARK"), false);
  const denial = await vm.runInNewContext(
    transpile(["referenceOwnerFailure", "requireOwnerAuthority"]) + '\nrequireOwnerAuthority("AGENT");',
    { Response },
  );
  assert.equal(denial.status, 403);
});

test("strict JSON envelope covers exactly five actions, exact fields, modes, bounded references, and raw hashes", async () => {
  const valid = [
    { action: "DISCOVER_REFERENCES" },
    { action: "RUN_BENCHMARK" },
    { action: "SET_MODE", verificationMode: "AUTOPILOT" },
    { action: "APPROVE_BENCHMARK" },
    { action: "TOGGLE_REFERENCE", referenceId: "project-1-REF-video-1" },
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
    { body: JSON.stringify({ action: "discover_references" }), status: 403, code: "REFERENCE_OWNER_ACTION_FORBIDDEN" },
    { body: JSON.stringify({ action: "PUBLISH_VIDEO" }), status: 403, code: "REFERENCE_OWNER_ACTION_FORBIDDEN" },
    { body: JSON.stringify({ action: "RUN_BENCHMARK", referenceId: "extra" }), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: JSON.stringify({ action: "SET_MODE", verificationMode: "AGENT" }), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: JSON.stringify({ action: "TOGGLE_REFERENCE", referenceId: "" }), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
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

test("project and reference bindings are D1 reads only and reject unknown or cross-project resources", async () => {
  const run = async (projectFound, referenceFound, command) => {
    const calls = [];
    const db = {
      prepare(sql) {
        const statement = {
          bind(...values) { calls.push({ sql, values }); return statement; },
          async first() { return sql.includes("video_projects") ? projectFound : referenceFound; },
        };
        return statement;
      },
    };
    const response = await vm.runInNewContext(
      transpile(["referenceOwnerFailure", "referenceOwnerBoundedString", "bindReferenceOwnerResource"]) + "\nbindReferenceOwnerResource(db, projectId, command);",
      { Response, db, projectId: "project-1", command },
    );
    return { response, calls };
  };
  const command = { action: "TOGGLE_REFERENCE", payload: { action: "TOGGLE_REFERENCE", referenceId: "ref-1" }, requestHash: "a".repeat(64) };
  const missingProject = await run(null, null, command);
  assert.equal(missingProject.response.status, 404);
  assert.equal(missingProject.calls.length, 1);
  const crossProject = await run({ id: "project-1" }, null, command);
  assert.equal(crossProject.response.status, 404);
  assert.equal(crossProject.calls.length, 2);
  assert.deepEqual(crossProject.calls[1].values, ["ref-1", "project-1"]);
  const bound = await run({ id: "project-1" }, { id: "ref-1" }, command);
  assert.equal(bound.response, null);
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
      transpile(["referenceOwnerFailure", "lookupReferenceOwnerReplay"]) + "\nlookupReferenceOwnerReplay(db, identity);",
      { Response, db, identity },
    );
  }
  const replay = await lookup([{ handler_identity: handlerIdentity, request_hash: "a".repeat(64), phase: "SUCCEEDED", domain_receipt_reference: "references:project-1:TOGGLE_REFERENCE:ref-1:EXCLUDED" }]);
  assert.equal(replay.status, 200);
  assert.deepEqual(await replay.json(), { ok: true, replay: true, receipt: "references:project-1:TOGGLE_REFERENCE:ref-1:EXCLUDED" });
  const conflict = await lookup([{ handler_identity: handlerIdentity, request_hash: "b".repeat(64), phase: "SUCCEEDED", domain_receipt_reference: "receipt" }]);
  assert.equal(conflict.status, 409);
  const incomplete = await lookup([{ handler_identity: handlerIdentity, request_hash: "a".repeat(64), phase: "AUTHORIZED", domain_receipt_reference: null }]);
  assert.equal(incomplete.status, 409);
  assert.equal(await lookup([]), null);
});

test("immutable audit emits AUTHORIZED then exactly one terminal phase with a reference-domain receipt", async () => {
  async function run(responseFactory) {
    const events = [];
    let executions = 0;
    const command = { action: "TOGGLE_REFERENCE", payload: { action: "TOGGLE_REFERENCE", referenceId: "ref-1" }, requestHash: "a".repeat(64) };
    const identity = { handlerIdentity, actorType: "CHATGPT_OWNER", actorSubjectHash: "b".repeat(64), action: command.action, resourceScope: "project:project-1:references:reference:ref-1", correlationId: "test:correlation", requestHash: command.requestHash };
    const response = await vm.runInNewContext(
      transpile(["referenceOwnerBoundedAuditComponent", "referenceOwnerDomainReceipt", "runAuditedReferenceOwnerCommand"]) + "\nrunAuditedReferenceOwnerCommand(db, identity, projectId, command, execute);",
      {
        Response,
        db: {},
        identity,
        projectId: "project-1",
        command,
        execute: async () => { executions += 1; return responseFactory(); },
        appendWriteCommandAudit: async (_db, _identity, phase, receipt) => { events.push({ phase, receipt }); },
        REFERENCE_OWNER_AUDIT_COMPONENT_PATTERN: /[^A-Za-z0-9._:-]/g,
      },
    );
    return { response, events, executions };
  }
  const success = await run(() => Response.json({ ok: true, referenceId: "ref-1", status: "EXCLUDED" }));
  assert.equal(success.executions, 1);
  assert.deepEqual(success.events.map((item) => item.phase), ["AUTHORIZED", "SUCCEEDED"]);
  assert.equal(success.events[1].receipt, "references:project-1:TOGGLE_REFERENCE:ref-1:EXCLUDED");
  const failure = await run(() => Response.json({ error: "blocked" }, { status: 409 }));
  assert.equal(failure.executions, 1);
  assert.deepEqual(failure.events.map((item) => item.phase), ["AUTHORIZED", "FAILED"]);
});

test("all five owner actions preserve bounded behavior without R2, reservation, spend, or usage accounting", () => {
  const execute = functionSource("executeReferenceOwnerCommand");
  for (const action of actions) assert.ok(execute.includes('payload.action === "' + action + '"'));
  assert.ok(execute.includes("eq(referenceVideos.id, payload.referenceId!)"));
  assert.ok(execute.includes("eq(referenceBenchmarkRuns.projectId, projectId)"));
  assert.ok(execute.includes('nextAction: "Run Universal Quality Gate"'));
  assert.ok(route.includes("discoverLiveReferences"));
  assert.equal(route.includes("BUCKET"), false);
  assert.equal(route.includes("recordOpenAIUsage("), false);
  assert.equal(/\breserve\s*\(/.test(route), false);
  assert.equal(/\bspend\s*\(/.test(route), false);
  assert.equal(route.includes("M1_03K_LIVE_PROVIDER_TEST"), false);
  assert.equal(route.includes("M1_03K_LIVE_SPEND_TEST"), false);
});

test("registry, auth, actor separation, and GET baselines ratchet exactly once", () => {
  const handlers = JSON.parse(source("governance/registries/http-handlers.json")).handlers;
  assert.deepEqual(handlers.find((item) => item.identity === handlerIdentity), {
    identity: handlerIdentity,
    sourceFile: routePath,
    routePath: "/api/projects/[id]/references",
    method: "POST",
    readWrite: "WRITE",
    actor: "CHATGPT_OWNER",
    authentication: "CHATGPT_SIWC",
    authorization: "FACTORY_EXPERT_EMAILS_ALLOWLIST_AND_SAME_ORIGIN_AND_EXACT_REFERENCE_ACTION_AND_PROJECT_RESOURCE_BINDING",
    audit: "IMMUTABLE_WRITE_COMMAND_AUDIT_AND_REFERENCE_DOMAIN_RECEIPT_AND_IDEMPOTENT_REPLAY",
    status: "PROTECTED",
    remediationWp: "NONE",
  });
  assert.equal(handlers.length, 100);
  assert.equal(handlers.filter((item) => item.status === "PROTECTED").length, 25);
  assert.equal(handlers.filter((item) => item.status === "GAP_UNAUTHENTICATED_WRITE").length, 20);
  assert.deepEqual(["GET", "POST"].map((method) => handlers.filter((item) => item.status === "GAP_UNAUTHENTICATED_WRITE" && item.method === method).length), [13, 7]);
  assert.equal(handlers.filter((item) => item.actor === "CHATGPT_OWNER").length, 31);
  assert.equal(handlers.filter((item) => item.actor === "AUTOMATION").length, 5);
  assert.equal(handlers.filter((item) => item.actor === "PROVIDER_CALLBACK").length, 1);
  assert.equal(handlers.filter((item) => item.actor === "INTERNAL_SYSTEM").length, 1);
  assert.equal(handlers.filter((item) => item.actor === "PUBLIC").length, 0);
  assert.equal(handlers.filter((item) => item.actor === "UNCLASSIFIED").length, 62);
  const auth = JSON.parse(source("governance/baselines/auth-coverage.json")).uncoveredHandlers;
  assert.equal(auth.length, 40);
  assert.equal(auth.some((item) => item.identity === handlerIdentity), false);
  assert.deepEqual(["GET", "POST", "HEAD"].map((method) => auth.filter((item) => item.method === method).length), [32, 7, 1]);
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
