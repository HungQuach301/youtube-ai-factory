import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { analyzeActorSource, analyzeAuthSource } from "../scripts/lib/candidate-ci-policy.mjs";

const root = process.cwd();
const routePath = "app/api/factory/creative-contract/route.ts";
const handlerIdentity = routePath + "#POST";
const programId = "YTAF-V7-GREENFIELD";
const stageKey = "04";
const source = (path) => readFileSync(join(root, path), "utf8");
const route = source(routePath);
const routeFile = ts.createSourceFile(routePath, route, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const actions = new Set(["RUN", "POLL", "REPAIR_SCORING"]);
const fields = {
  RUN: new Set(["action"]),
  POLL: new Set(["action"]),
  REPAIR_SCORING: new Set(["action"]),
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
  return new Request(options.url || "https://factory.invalid/api/factory/creative-contract", {
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
    transpile(["creativeOwnerFailure", "creativeOwnerSameOrigin", "authorizeCreativeOwnerWrite"]) + "\nauthorizeCreativeOwnerWrite(request);",
    {
      Response,
      URL,
      request,
      getChatGPTUser: async () => options.user === undefined ? { email: "owner@example.com" } : options.user,
      creativeAuthorizationEnv: async () => { observed.environment += 1; return environment; },
    },
  );
  return { result, observed };
}

async function readCommand(request) {
  return vm.runInNewContext(
    transpile([
      "creativeOwnerFailure",
      "creativeOwnerSha256RawBytes",
      "creativeOwnerExactKeys",
      "readCreativeOwnerCommand",
    ]) + "\nreadCreativeOwnerCommand(request);",
    {
      Response,
      TextDecoder,
      Uint8Array,
      crypto,
      request,
      CREATIVE_OWNER_ACTIONS: actions,
      CREATIVE_OWNER_FIELDS: fields,
      MAX_CREATIVE_OWNER_BODY_BYTES: 16 * 1024,
    },
  );
}

test("M1-03N protects creative-contract POST before body, runtime DDL, D1, R2, Drive, provider, spend, usage, audit, and business", () => {
  const [analysis] = analyzeAuthSource(route, routePath).filter((item) => item.method === "POST");
  assert.equal(analysis.covered, true);
  assert.equal(analysis.authenticationGuard, "authorizeCreativeOwnerWrite");
  assert.equal(analysis.authorizationGuard, "authorizeCreativeOwnerWrite");
  const post = functionSource("POST");
  const guard = post.indexOf("await authorizeCreativeOwnerWrite(request)");
  const actor = post.indexOf("requireCreativeOwnerAuthority(authorization.actorType)");
  const command = post.indexOf("await readCreativeOwnerCommand(request)");
  const binding = post.indexOf("await bindCreativeOwnerResource(authorization.db)");
  const entitlement = post.indexOf("await authorizeCreativeOwnerEntitlement(");
  const identity = post.indexOf("await creativeOwnerAuditIdentity(");
  const replay = post.indexOf("await lookupCreativeOwnerReplay(");
  const audit = post.indexOf("await runAuditedCreativeOwnerCommand(");
  const execute = post.indexOf("executeCreativeOwnerCommand(command, entitlement)");
  assert.ok(guard >= 0 && guard < actor && actor < command && command < binding && binding < entitlement && entitlement < identity && identity < replay && replay < audit && audit < execute);
  for (const forbidden of [
    "request.json(", "request.arrayBuffer(", "request.formData(", "runtime(", "tables.map(", "getDb(", ".prepare(",
    ".insert(", ".update(", ".delete(", ".put(", "storeDriveJsonArtifact(", "fetch(", "reserve", "spend", "recordOpenAIUsage(",
  ]) assert.equal(post.includes(forbidden), false, forbidden + " must remain behind authorization");
});

test("anonymous, wrong-origin, non-owner, unconfigured, and unavailable-database denials touch no body or mutable dependency", async () => {
  const cases = [
    { user: null, status: 401, code: "SIWC_AUTHENTICATION_REQUIRED", environment: 0 },
    { origin: "https://evil.invalid", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED", environment: 0 },
    { fetchSite: "cross-site", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED", environment: 0 },
    { url: "https://factory.invalid/api/factory/creative-contract/extra", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED", environment: 0 },
    { url: "https://factory.invalid/api/factory/creative-contract?action=RUN", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED", environment: 0 },
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

test("explicit owner authority denies AGENT before creative commands", async () => {
  const actorSource = functionSource("requireCreativeOwnerAuthority");
  assert.ok(actorSource.includes('actorType === "AGENT"'));
  assert.ok(actorSource.includes("AGENT_OWNER_COMMAND_FORBIDDEN"));
  assert.equal(analyzeActorSource(route, routePath).some((item) => actions.has(item.command)), false);
  const denial = await vm.runInNewContext(
    transpile(["creativeOwnerFailure", "requireCreativeOwnerAuthority"]) + '\nrequireCreativeOwnerAuthority("AGENT");',
    { Response },
  );
  assert.equal(denial.status, 403);
});

test("strict JSON envelope covers exactly RUN, POLL, and REPAIR_SCORING with action-only raw hashes", async () => {
  for (const action of actions) {
    const payload = { action };
    const raw = JSON.stringify(payload);
    const command = await readCommand(ownerRequest(raw));
    assert.equal(command.action, action);
    assert.equal(JSON.stringify(command.payload), raw);
    assert.equal(command.requestHash, createHash("sha256").update(Buffer.from(raw)).digest("hex"));
  }
  const invalid = [
    { body: "{", status: 400, code: "OWNER_WRITE_JSON_INVALID" },
    { body: "null", status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: JSON.stringify({}), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: JSON.stringify({ action: "run" }), status: 403, code: "CREATIVE_OWNER_ACTION_FORBIDDEN" },
    { body: JSON.stringify({ action: "RUN_STAGE" }), status: 403, code: "CREATIVE_OWNER_ACTION_FORBIDDEN" },
    { body: JSON.stringify({ action: "PUBLISH_VIDEO" }), status: 403, code: "CREATIVE_OWNER_ACTION_FORBIDDEN" },
    { body: JSON.stringify({ action: "RUN", stage: "04" }), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: JSON.stringify({ action: "POLL", programId }), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: JSON.stringify({ action: "REPAIR_SCORING", mode: "extra" }), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
  ];
  for (const item of invalid) {
    const response = await readCommand(ownerRequest(item.body));
    assert.ok(response instanceof Response);
    assert.equal(response.status, item.status);
    assert.deepEqual(await response.json(), { error: item.code });
  }
  assert.equal((await readCommand(ownerRequest("{}", { headers: { "content-length": "invalid" } }))).status, 400);
  assert.equal((await readCommand(ownerRequest("{}", { headers: { "content-length": String(16 * 1024 + 1) } }))).status, 413);
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

test("fixed resource binding requires the canonical program and its exact Stage 04 row", async () => {
  async function bind(programRow, stageRow) {
    const calls = [];
    const db = {
      prepare(sql) {
        calls.push({ sql, bindings: [] });
        const call = calls.at(-1);
        const statement = {
          bind(...values) { call.bindings = values; return statement; },
          async first() { return sql.includes("v7_program_contracts") ? programRow : stageRow; },
        };
        return statement;
      },
    };
    const response = await vm.runInNewContext(
      transpile(["creativeOwnerFailure", "bindCreativeOwnerResource"]) + "\nbindCreativeOwnerResource(db);",
      { Response, db, PROGRAM_ID: programId, STAGE: stageKey },
    );
    return { response, calls };
  }
  const found = await bind(
    { id: programId, production_authorized: 1 },
    { program_id: programId, stage_key: stageKey, status: "READY", attempt: 1 },
  );
  assert.equal(found.response.id, programId);
  assert.equal(found.response.productionAuthorized, true);
  assert.equal(found.response.stageKey, stageKey);
  assert.equal(found.response.stageStatus, "READY");
  assert.equal(found.response.stageAttempt, 1);
  assert.equal(found.calls.length, 2);
  assert.match(found.calls[0].sql, /SELECT id,production_authorized FROM v7_program_contracts WHERE id = \? LIMIT 1/);
  assert.deepEqual(found.calls[0].bindings, [programId]);
  assert.match(found.calls[1].sql, /WHERE id = \? AND program_id = \? AND stage_key = \? LIMIT 1/);
  assert.deepEqual(found.calls[1].bindings, [programId + "-STAGE-" + stageKey, programId, stageKey]);
  assert.equal((await bind(null, null)).response.status, 404);
  assert.equal((await bind({ id: programId, production_authorized: 1 }, { program_id: "other", stage_key: stageKey, status: "READY", attempt: 0 })).response.status, 404);
  assert.equal((await bind({ id: programId, production_authorized: 1 }, { program_id: programId, stage_key: "05", status: "READY", attempt: 0 })).response.status, 404);
});

test("action entitlements fail closed for paid RUN, active-job POLL, and deterministic score repair", async () => {
  async function authorize(action, options = {}) {
    const command = { action, payload: { action }, requestHash: "a".repeat(64) };
    const binding = {
      id: programId,
      productionAuthorized: options.productionAuthorized ?? true,
      stageKey,
      stageStatus: options.stageStatus ?? (action === "RUN" ? "READY" : action === "POLL" ? "RUNNING" : "REPAIR_REQUIRED"),
      stageAttempt: options.stageAttempt ?? 0,
    };
    const env = options.apiKey === false ? {} : { OPENAI_API_KEY: "configured" };
    const db = {
      prepare(sql) {
        const statement = {
          bind() { return statement; },
          async first() {
            if (sql.includes("v7_creative_jobs")) return options.activeJob === false ? null : { id: "job-1" };
            return options.repairArtifact === false ? null : { id: "artifact-1" };
          },
        };
        return statement;
      },
    };
    return vm.runInNewContext(
      transpile(["creativeOwnerFailure", "authorizeCreativeOwnerEntitlement"]) + "\nauthorizeCreativeOwnerEntitlement(db, env, command, binding);",
      { Response, db, env, command, binding, PROGRAM_ID: programId },
    );
  }
  assert.equal((await authorize("RUN", { productionAuthorized: false })).status, 409);
  assert.equal((await authorize("RUN", { stageStatus: "BLOCKED_UPSTREAM" })).status, 409);
  assert.equal((await authorize("RUN", { stageAttempt: 3 })).status, 409);
  assert.equal((await authorize("RUN", { apiKey: false })).status, 503);
  assert.equal((await authorize("RUN")).kind, "PAID_BACKGROUND_CREATIVE_TOURNAMENT");
  assert.equal((await authorize("POLL", { stageStatus: "READY" })).status, 409);
  assert.equal((await authorize("POLL", { apiKey: false })).status, 503);
  assert.equal((await authorize("POLL", { activeJob: false })).status, 409);
  assert.equal((await authorize("POLL")).kind, "PROVIDER_STATUS_READ_AND_BOUNDED_FINALIZATION");
  assert.equal((await authorize("REPAIR_SCORING", { productionAuthorized: false })).status, 409);
  assert.equal((await authorize("REPAIR_SCORING", { stageStatus: "READY" })).status, 409);
  assert.equal((await authorize("REPAIR_SCORING", { repairArtifact: false })).status, 409);
  assert.equal((await authorize("REPAIR_SCORING")).kind, "DETERMINISTIC_CREATIVE_SCORE_REPAIR");
  const entitlementSource = functionSource("authorizeCreativeOwnerEntitlement");
  for (const forbidden of ["fetch(", "startProvider(", "retrieveProvider(", ".run(", ".batch(", ".put(", "storeDriveJsonArtifact(", "recordOpenAIUsage(", "reserve", "spend"]) {
    assert.equal(entitlementSource.includes(forbidden), false);
  }
});

test("idempotent replay returns the immutable receipt and conflicts on key reuse with a different request", async () => {
  async function lookup(rows, requestHash = "a".repeat(64)) {
    const statement = { bind() { return statement; }, async all() { return { results: rows }; } };
    const db = { prepare() { return statement; } };
    const identity = { handlerIdentity, requestHash, correlationId: "test:correlation" };
    return vm.runInNewContext(
      transpile(["creativeOwnerFailure", "lookupCreativeOwnerReplay"]) + "\nlookupCreativeOwnerReplay(db, identity);",
      { Response, db, identity },
    );
  }
  const receipt = "creative:" + programId + ":RUN:04:run-1:job-1:queued:no-artifact:no-hash";
  const replay = await lookup([{ handler_identity: handlerIdentity, request_hash: "a".repeat(64), phase: "SUCCEEDED", domain_receipt_reference: receipt }]);
  assert.equal(replay.status, 200);
  assert.deepEqual(await replay.json(), { ok: true, replay: true, receipt });
  assert.equal((await lookup([{ handler_identity: handlerIdentity, request_hash: "b".repeat(64), phase: "SUCCEEDED", domain_receipt_reference: receipt }])).status, 409);
  assert.equal((await lookup([{ handler_identity: handlerIdentity, request_hash: "a".repeat(64), phase: "AUTHORIZED", domain_receipt_reference: null }])).status, 409);
  assert.equal(await lookup([]), null);
});

test("immutable audit emits AUTHORIZED then exactly one terminal phase with Stage 04 domain receipts", async () => {
  async function run(responseFactory) {
    const events = [];
    const command = { action: "RUN", payload: { action: "RUN" }, requestHash: "a".repeat(64) };
    const identity = {
      handlerIdentity,
      actorType: "CHATGPT_OWNER",
      actorSubjectHash: "b".repeat(64),
      action: command.action,
      resourceScope: "program:" + programId + ":creative-contract:stage:" + stageKey,
      correlationId: "test:correlation",
      requestHash: command.requestHash,
    };
    const response = await vm.runInNewContext(
      transpile([
        "creativeOwnerBoundedAuditComponent",
        "creativeOwnerFirstRecord",
        "creativeOwnerDomainReceipt",
        "runAuditedCreativeOwnerCommand",
      ]) + "\nrunAuditedCreativeOwnerCommand(db, identity, command, execute);",
      {
        Response,
        db: {},
        identity,
        command,
        execute: async () => responseFactory(),
        appendWriteCommandAudit: async (_db, _identity, phase, receipt) => { events.push({ phase, receipt }); },
        PROGRAM_ID: programId,
        STAGE: stageKey,
        CREATIVE_OWNER_AUDIT_COMPONENT_PATTERN: /[^A-Za-z0-9._:-]/g,
      },
    );
    return { response, events };
  }
  const success = await run(() => Response.json({
    stage: { stageKey, status: "RUNNING" },
    runs: [{ id: "run-1", status: "RUNNING" }],
    jobs: [{ id: "job-1", providerStatus: "queued" }],
    artifacts: [],
  }));
  assert.deepEqual(success.events.map((item) => item.phase), ["AUTHORIZED", "SUCCEEDED"]);
  assert.equal(success.events[1].receipt, "creative:" + programId + ":RUN:04:run-1:job-1:queued:no-artifact:no-hash");
  const failure = await run(() => Response.json({ error: "blocked" }, { status: 409 }));
  assert.deepEqual(failure.events.map((item) => item.phase), ["AUTHORIZED", "FAILED"]);
});

test("three commands preserve existing Creative Contract provider, repair, storage, usage, and GET behavior", () => {
  const execute = functionSource("executeCreativeOwnerCommand");
  assert.ok(execute.includes('command.action === "RUN"'));
  assert.ok(execute.includes('command.action === "POLL"'));
  assert.ok(execute.includes("start()"));
  assert.ok(execute.includes("poll()"));
  assert.ok(execute.includes("repairScoringContract()"));
  for (const forbidden of ["fetch(", "tables.map(", "storeDriveJsonArtifact(", "recordOpenAIUsage("]) assert.equal(execute.includes(forbidden), false);
  assert.equal(functionSource("GET"), 'export async function GET(){try{return Response.json(await snapshot());}catch(error){return Response.json({error:error instanceof Error?error.message:"Creative Contract could not load"},{status:500});}}');
  assert.equal(programId, "YTAF-V7-GREENFIELD");
  assert.equal(stageKey, "04");
  assert.ok(functionSource("start").includes("stage.attempt>=3"));
  assert.ok(functionSource("start").indexOf("await startProvider") < functionSource("start").indexOf("await db.batch"));
  assert.ok(functionSource("startProvider").includes('method: "POST"'));
  assert.ok(functionSource("poll").includes("retrieveProvider"));
  assert.equal(functionSource("repairScoringContract").includes("startProvider"), false);
  assert.equal(functionSource("repairScoringContract").includes("retrieveProvider"), false);
  assert.ok(functionSource("finalize").includes("env.BUCKET.put"));
  assert.ok(functionSource("finalize").includes("env.BUCKET.head"));
  assert.ok(functionSource("finalize").includes("storeDriveJsonArtifact"));
  assert.ok(functionSource("finalize").includes("recordOpenAIUsage"));
});

test("registry, auth, actor separation, and GET baselines ratchet exactly once", () => {
  const handlers = JSON.parse(source("governance/registries/http-handlers.json")).handlers;
  assert.deepEqual(handlers.find((item) => item.identity === handlerIdentity), {
    identity: handlerIdentity,
    sourceFile: routePath,
    routePath: "/api/factory/creative-contract",
    method: "POST",
    readWrite: "WRITE",
    actor: "CHATGPT_OWNER",
    authentication: "CHATGPT_SIWC",
    authorization: "FACTORY_EXPERT_EMAILS_ALLOWLIST_AND_SAME_ORIGIN_AND_EXACT_CREATIVE_ACTION_AND_FIXED_PROGRAM_RESOURCE_AND_STAGE_ENTITLEMENT",
    audit: "IMMUTABLE_WRITE_COMMAND_AUDIT_AND_CREATIVE_DOMAIN_RECEIPT_AND_IDEMPOTENT_REPLAY",
    status: "PROTECTED",
    remediationWp: "NONE",
  });
  assert.equal(handlers.length, 100);
  assert.equal(handlers.filter((item) => item.status === "PROTECTED").length, 26);
  assert.equal(handlers.filter((item) => item.status === "GAP_UNAUTHENTICATED_WRITE").length, 19);
  assert.deepEqual(["GET", "POST"].map((method) => handlers.filter((item) => item.status === "GAP_UNAUTHENTICATED_WRITE" && item.method === method).length), [13, 6]);
  assert.equal(handlers.filter((item) => item.actor === "CHATGPT_OWNER").length, 32);
  assert.equal(handlers.filter((item) => item.actor === "UNCLASSIFIED").length, 61);
  const auth = JSON.parse(source("governance/baselines/auth-coverage.json")).uncoveredHandlers;
  assert.equal(auth.length, 39);
  assert.equal(auth.some((item) => item.identity === handlerIdentity), false);
  assert.deepEqual(["GET", "POST", "HEAD"].map((method) => auth.filter((item) => item.method === method).length), [32, 6, 1]);
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
