import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { analyzeActorSource, analyzeAuthSource } from "../scripts/lib/candidate-ci-policy.mjs";

const root = process.cwd();
const routePath = "app/api/factory/intelligence/route.ts";
const handlerIdentity = routePath + "#POST";
const programId = "YTAF-V7-GREENFIELD";
const source = (path) => readFileSync(join(root, path), "utf8");
const route = source(routePath);
const routeFile = ts.createSourceFile(routePath, route, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const actions = new Set(["RUN_STAGE", "POLL_STAGE"]);
const stages = new Set(["01", "02", "03"]);
const fields = { RUN_STAGE: new Set(["action", "stage"]), POLL_STAGE: new Set(["action", "stage"]) };

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
  return new Request(options.url || "https://factory.invalid/api/factory/intelligence", {
    method: options.method || "POST",
    headers,
    body,
  });
}

async function executeGuard(options = {}) {
  const observed = { body: 0, environment: 0, d1: 0, r2: 0, provider: 0 };
  const db = new Proxy({}, { get() { observed.d1 += 1; return () => { observed.d1 += 1; }; } });
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
  const request = ownerRequest("{broken", options);
  const originalArrayBuffer = request.arrayBuffer.bind(request);
  request.arrayBuffer = async () => { observed.body += 1; return originalArrayBuffer(); };
  const result = await vm.runInNewContext(
    transpile(["intelligenceOwnerFailure", "intelligenceOwnerSameOrigin", "authorizeIntelligenceOwnerWrite"]) + "\nauthorizeIntelligenceOwnerWrite(request);",
    {
      Response,
      URL,
      request,
      getChatGPTUser: async () => options.user === undefined ? { email: "owner@example.com" } : options.user,
      intelligenceAuthorizationEnv: async () => { observed.environment += 1; return environment; },
    },
  );
  return { result, observed };
}

async function readCommand(request) {
  return vm.runInNewContext(
    transpile([
      "intelligenceOwnerFailure",
      "intelligenceOwnerSha256RawBytes",
      "intelligenceOwnerExactKeys",
      "intelligenceOwnerPayloadValid",
      "readIntelligenceOwnerCommand",
    ]) + "\nreadIntelligenceOwnerCommand(request);",
    {
      Response,
      TextDecoder,
      Uint8Array,
      crypto,
      request,
      INTELLIGENCE_OWNER_ACTIONS: actions,
      INTELLIGENCE_OWNER_STAGES: stages,
      INTELLIGENCE_OWNER_FIELDS: fields,
      MAX_INTELLIGENCE_OWNER_BODY_BYTES: 16 * 1024,
    },
  );
}

test("M1-03M protects intelligence POST before body, runtime DDL, D1, R2, Drive, provider, spend, usage, audit, and business", () => {
  const [analysis] = analyzeAuthSource(route, routePath).filter((item) => item.method === "POST");
  assert.equal(analysis.covered, true);
  assert.equal(analysis.authenticationGuard, "authorizeIntelligenceOwnerWrite");
  assert.equal(analysis.authorizationGuard, "authorizeIntelligenceOwnerWrite");
  const post = functionSource("POST");
  const guard = post.indexOf("await authorizeIntelligenceOwnerWrite(request)");
  const actor = post.indexOf("requireIntelligenceOwnerAuthority(authorization.actorType)");
  const command = post.indexOf("await readIntelligenceOwnerCommand(request)");
  const binding = post.indexOf("await bindIntelligenceOwnerResource(authorization.db)");
  const entitlement = post.indexOf("authorizeIntelligenceOwnerEntitlement(");
  const identity = post.indexOf("await intelligenceOwnerAuditIdentity(");
  const replay = post.indexOf("await lookupIntelligenceOwnerReplay(");
  const audit = post.indexOf("await runAuditedIntelligenceOwnerCommand(");
  const execute = post.indexOf("executeIntelligenceOwnerCommand(command, entitlement)");
  assert.ok(guard >= 0 && guard < actor && actor < command && command < binding && binding < entitlement && entitlement < identity && identity < replay && replay < audit && audit < execute);
  for (const forbidden of [
    "request.json(", "request.arrayBuffer(", "request.formData(", "runtime(", "schema.map(", "getDb(", ".prepare(",
    ".insert(", ".update(", ".delete(", ".put(", "storeDriveJsonArtifact(", "fetch(", "reserve", "spend", "recordOpenAIUsage(",
  ]) assert.equal(post.includes(forbidden), false, forbidden + " must remain behind authorization");
});

test("anonymous, wrong-origin, non-owner, unconfigured, and unavailable-database denials touch no body or mutable dependency", async () => {
  const cases = [
    { user: null, status: 401, code: "SIWC_AUTHENTICATION_REQUIRED", environment: 0 },
    { origin: "https://evil.invalid", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED", environment: 0 },
    { fetchSite: "cross-site", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED", environment: 0 },
    { url: "https://factory.invalid/api/factory/intelligence/extra", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED", environment: 0 },
    { url: "https://factory.invalid/api/factory/intelligence?stage=01", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED", environment: 0 },
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
    assert.equal(observed.body, 0);
    assert.equal(observed.d1, 0);
    assert.equal(observed.r2, 0);
    assert.equal(observed.provider, 0);
  }
});

test("explicit owner authority denies AGENT before intelligence stage commands", async () => {
  const actorSource = functionSource("requireIntelligenceOwnerAuthority");
  assert.ok(actorSource.includes('actorType === "AGENT"'));
  assert.ok(actorSource.includes("AGENT_OWNER_COMMAND_FORBIDDEN"));
  assert.equal(analyzeActorSource(route, routePath).some((item) => actions.has(item.command)), false);
  const denial = await vm.runInNewContext(
    transpile(["intelligenceOwnerFailure", "requireIntelligenceOwnerAuthority"]) + '\nrequireIntelligenceOwnerAuthority("AGENT");',
    { Response },
  );
  assert.equal(denial.status, 403);
});

test("strict JSON envelope covers exactly two actions, three stages, exact fields, and raw hashes", async () => {
  for (const action of actions) for (const stage of stages) {
    const payload = { action, stage };
    const raw = JSON.stringify(payload);
    const command = await readCommand(ownerRequest(raw));
    assert.equal(command.action, action);
    assert.equal(command.payload.stage, stage);
    assert.equal(command.requestHash, createHash("sha256").update(Buffer.from(raw)).digest("hex"));
  }
  const invalid = [
    { body: "{", status: 400, code: "OWNER_WRITE_JSON_INVALID" },
    { body: "null", status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: JSON.stringify({}), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: JSON.stringify({ action: "run_stage", stage: "01" }), status: 403, code: "INTELLIGENCE_OWNER_ACTION_FORBIDDEN" },
    { body: JSON.stringify({ action: "PUBLISH_VIDEO", stage: "01" }), status: 403, code: "INTELLIGENCE_OWNER_ACTION_FORBIDDEN" },
    { body: JSON.stringify({ action: "RUN_STAGE" }), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: JSON.stringify({ action: "RUN_STAGE", stage: "1" }), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: JSON.stringify({ action: "POLL_STAGE", stage: "04" }), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: JSON.stringify({ action: "RUN_STAGE", stage: "01", mode: "extra" }), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
  ];
  for (const item of invalid) {
    const response = await readCommand(ownerRequest(item.body));
    assert.ok(response instanceof Response);
    assert.equal(response.status, item.status);
    assert.deepEqual(await response.json(), { error: item.code });
  }
  const invalidLength = await readCommand(ownerRequest("{}", { headers: { "content-length": "invalid" } }));
  assert.equal(invalidLength.status, 400);
  const declaredOversize = await readCommand(ownerRequest("{}", { headers: { "content-length": String(16 * 1024 + 1) } }));
  assert.equal(declaredOversize.status, 413);
});

test("multipart, binary, empty, and oversized bodies are rejected before command execution", async () => {
  for (const contentType of ["multipart/form-data; boundary=test", "application/octet-stream"]) {
    let reads = 0;
    const response = await readCommand({
      headers: new Headers({ "content-type": contentType }),
      arrayBuffer: async () => { reads += 1; return new ArrayBuffer(0); },
    });
    assert.equal(response.status, 415);
    assert.equal(reads, 0);
  }
  assert.equal((await readCommand(ownerRequest(""))).status, 413);
  assert.equal((await readCommand(ownerRequest("x".repeat(16 * 1024 + 1)))).status, 413);
});

test("fixed program binding performs one exact D1 read and rejects missing or mismatched resources", async () => {
  async function bind(row) {
    const calls = [];
    const statement = {
      bind(...values) { calls.push(values); return statement; },
      async first() { return row; },
    };
    const db = { prepare(sql) { calls.push(sql); return statement; } };
    const response = await vm.runInNewContext(
      transpile(["intelligenceOwnerFailure", "bindIntelligenceOwnerResource"]) + "\nbindIntelligenceOwnerResource(db);",
      { Response, db, PROGRAM_ID: programId },
    );
    return { response, calls };
  }
  const found = await bind({ id: programId, production_authorized: 1 });
  assert.equal(found.response.id, programId);
  assert.equal(found.response.productionAuthorized, true);
  assert.match(found.calls[0], /SELECT id,production_authorized FROM v7_program_contracts WHERE id = \? LIMIT 1/);
  assert.deepEqual(found.calls[1], [programId]);
  for (const row of [null, { id: "other-program", production_authorized: 1 }]) {
    const missing = await bind(row);
    assert.equal(missing.response.status, 404);
  }
});

test("action entitlements distinguish paid dispatch from provider polling without constructing provider or spend work", async () => {
  function authorize(action, env, productionAuthorized = true) {
    const db = {};
    const command = { action, payload: { action, stage: "01" }, requestHash: "a".repeat(64) };
    const binding = { id: programId, productionAuthorized };
    return vm.runInNewContext(
      transpile(["intelligenceOwnerFailure", "authorizeIntelligenceOwnerEntitlement"]) + "\nauthorizeIntelligenceOwnerEntitlement(db, env, command, binding);",
      { Response, db, env, command, binding },
    );
  }
  const foundationBlocked = await authorize("RUN_STAGE", { OPENAI_API_KEY: "configured" }, false);
  assert.equal(foundationBlocked.status, 409);
  const providerMissing = await authorize("RUN_STAGE", {}, true);
  assert.equal(providerMissing.status, 503);
  const dispatch = await authorize("RUN_STAGE", { OPENAI_API_KEY: "configured" }, true);
  assert.equal(dispatch.kind, "PAID_WEB_GROUNDED_PROVIDER_DISPATCH");
  const poll = await authorize("POLL_STAGE", {}, false);
  assert.equal(poll.kind, "PROVIDER_STATUS_READ_AND_BOUNDED_FINALIZATION");
  const entitlementSource = functionSource("authorizeIntelligenceOwnerEntitlement");
  for (const forbidden of ["fetch(", "startOpenAIResearch(", "retrieveOpenAIResearch(", "reserve", "spend", "recordOpenAIUsage("]) assert.equal(entitlementSource.includes(forbidden), false);
});

test("idempotent replay returns the immutable receipt and conflicts on key reuse with a different request", async () => {
  async function lookup(rows, requestHash = "a".repeat(64)) {
    const statement = { bind() { return statement; }, async all() { return { results: rows }; } };
    const db = { prepare() { return statement; } };
    const identity = { handlerIdentity, requestHash, correlationId: "test:correlation" };
    return vm.runInNewContext(
      transpile(["intelligenceOwnerFailure", "lookupIntelligenceOwnerReplay"]) + "\nlookupIntelligenceOwnerReplay(db, identity);",
      { Response, db, identity },
    );
  }
  const receipt = `intelligence:${programId}:RUN_STAGE:01:run-1:job-1:queued:no-artifact`;
  const replay = await lookup([{ handler_identity: handlerIdentity, request_hash: "a".repeat(64), phase: "SUCCEEDED", domain_receipt_reference: receipt }]);
  assert.equal(replay.status, 200);
  assert.deepEqual(await replay.json(), { ok: true, replay: true, receipt });
  assert.equal((await lookup([{ handler_identity: handlerIdentity, request_hash: "b".repeat(64), phase: "SUCCEEDED", domain_receipt_reference: receipt }])).status, 409);
  assert.equal((await lookup([{ handler_identity: handlerIdentity, request_hash: "a".repeat(64), phase: "AUTHORIZED", domain_receipt_reference: null }])).status, 409);
  assert.equal(await lookup([]), null);
});

test("immutable audit emits AUTHORIZED then exactly one terminal phase with stage-bound receipts", async () => {
  async function run(responseFactory) {
    const events = [];
    const command = { action: "RUN_STAGE", payload: { action: "RUN_STAGE", stage: "01" }, requestHash: "a".repeat(64) };
    const identity = { handlerIdentity, actorType: "CHATGPT_OWNER", actorSubjectHash: "b".repeat(64), action: command.action, resourceScope: `program:${programId}:intelligence:stage:01`, correlationId: "test:correlation", requestHash: command.requestHash };
    const response = await vm.runInNewContext(
      transpile([
        "intelligenceOwnerBoundedAuditComponent", "intelligenceOwnerStageRecord", "intelligenceOwnerDomainReceipt", "runAuditedIntelligenceOwnerCommand",
      ]) + "\nrunAuditedIntelligenceOwnerCommand(db, identity, command, execute);",
      {
        Response,
        db: {}, identity, command,
        execute: async () => responseFactory(),
        appendWriteCommandAudit: async (_db, _identity, phase, receipt) => { events.push({ phase, receipt }); },
        PROGRAM_ID: programId,
        INTELLIGENCE_OWNER_AUDIT_COMPONENT_PATTERN: /[^A-Za-z0-9._:-]/g,
      },
    );
    return { response, events };
  }
  const success = await run(() => Response.json({
    runs: [{ id: "run-1", stageKey: "01", status: "RUNNING" }],
    jobs: [{ id: "job-1", stageKey: "01", providerStatus: "queued" }],
    artifacts: [],
  }));
  assert.deepEqual(success.events.map((item) => item.phase), ["AUTHORIZED", "SUCCEEDED"]);
  assert.equal(success.events[1].receipt, `intelligence:${programId}:RUN_STAGE:01:run-1:job-1:queued:no-artifact`);
  const failure = await run(() => Response.json({ error: "blocked" }, { status: 409 }));
  assert.deepEqual(failure.events.map((item) => item.phase), ["AUTHORIZED", "FAILED"]);
});

test("two commands preserve all three stage contracts and provider behavior", () => {
  const execute = functionSource("executeIntelligenceOwnerCommand");
  assert.ok(execute.includes('command.action === "RUN_STAGE"'));
  assert.ok(execute.includes("startStage(command.payload.stage)"));
  assert.ok(execute.includes("pollStage(command.payload.stage)"));
  for (const forbidden of ["fetch(", "schema.map(", "storeDriveJsonArtifact(", "recordOpenAIUsage("]) assert.equal(execute.includes(forbidden), false);
  assert.match(route, /"01": \{ name: "Market & audience intelligence", threshold: 85/);
  assert.match(route, /"02": \{ name: "Reference intelligence", threshold: 90/);
  assert.match(route, /"03": \{ name: "Research & claim graph", threshold: 92/);
  assert.ok(functionSource("startStage").includes("state.attempt >= 3"));
  assert.ok(functionSource("startStage").includes("status='ACTIVE'"));
  const provider = functionSource("startOpenAIResearch");
  assert.ok(provider.includes('method: "POST"'));
  assert.ok(provider.includes('type: "web_search", return_token_budget: "unlimited"'));
  assert.ok(provider.includes("background: true"));
  assert.ok(provider.includes("store: true"));
  const finalize = functionSource("finalizeStage");
  assert.ok(finalize.includes("env.BUCKET.put"));
  assert.ok(finalize.includes("env.BUCKET.head"));
  assert.ok(finalize.includes("storeDriveJsonArtifact"));
  assert.ok(finalize.includes("recordOpenAIUsage"));
});

test("registry, auth, actor separation, and GET baselines ratchet exactly once", () => {
  const handlers = JSON.parse(source("governance/registries/http-handlers.json")).handlers;
  assert.deepEqual(handlers.find((item) => item.identity === handlerIdentity), {
    identity: handlerIdentity,
    sourceFile: routePath,
    routePath: "/api/factory/intelligence",
    method: "POST",
    readWrite: "WRITE",
    actor: "CHATGPT_OWNER",
    authentication: "CHATGPT_SIWC",
    authorization: "FACTORY_EXPERT_EMAILS_ALLOWLIST_AND_SAME_ORIGIN_AND_EXACT_INTELLIGENCE_ACTION_AND_FIXED_PROGRAM_RESOURCE_AND_STAGE_ENTITLEMENT",
    audit: "IMMUTABLE_WRITE_COMMAND_AUDIT_AND_INTELLIGENCE_DOMAIN_RECEIPT_AND_IDEMPOTENT_REPLAY",
    status: "PROTECTED",
    remediationWp: "NONE",
  });
  assert.equal(handlers.length, 100);
  assert.equal(handlers.filter((item) => item.status === "PROTECTED").length, 27);
  assert.equal(handlers.filter((item) => item.status === "GAP_UNAUTHENTICATED_WRITE").length, 18);
  assert.deepEqual(["GET", "POST"].map((method) => handlers.filter((item) => item.status === "GAP_UNAUTHENTICATED_WRITE" && item.method === method).length), [13, 5]);
  assert.equal(handlers.filter((item) => item.actor === "CHATGPT_OWNER").length, 33);
  assert.equal(handlers.filter((item) => item.actor === "UNCLASSIFIED").length, 60);
  const auth = JSON.parse(source("governance/baselines/auth-coverage.json")).uncoveredHandlers;
  assert.equal(auth.length, 38);
  assert.equal(auth.some((item) => item.identity === handlerIdentity), false);
  assert.deepEqual(["GET", "POST", "HEAD"].map((method) => auth.filter((item) => item.method === method).length), [32, 5, 1]);
  const actor = JSON.parse(source("governance/baselines/actor-separation.json")).unseparatedCommands;
  assert.equal(actor.length, 17);
  assert.equal(actor.some((item) => item.handler === handlerIdentity), false);
  const getWrites = JSON.parse(source("governance/baselines/no-write-in-get.json")).handlersWithReachableWrites;
  assert.equal(getWrites.length, 16);
  assert.deepEqual(getWrites.find((item) => item.identity === routePath + "#GET"), {
    identity: routePath + "#GET",
    evidence: ["runtime:CALL:batch"],
  });
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
  for (const [name, digest] of Object.entries(expected)) assert.equal(createHash("sha256").update(source("drizzle/" + name)).digest("hex"), digest);
});
