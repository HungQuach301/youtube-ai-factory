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
const routePath = "app/api/projects/[id]/perceptual-qa/route.ts";
const handlerIdentity = `${routePath}#POST`;
const source = (path) => readFileSync(join(root, path), "utf8");
const route = source(routePath);
const routeFile = ts.createSourceFile(routePath, route, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const actions = new Set(["START_RUN", "ANALYZE_BATCH", "FINALIZE_RUN", "BUILD_REPAIR_WAVE"]);
const fields = {
  START_RUN: new Set(["action"]),
  ANALYZE_BATCH: new Set(["action", "runId", "frames"]),
  FINALIZE_RUN: new Set(["action", "runId", "audioMetrics"]),
  BUILD_REPAIR_WAVE: new Set(["action", "runId"]),
};
const frameFields = new Set(["shotId", "title", "family", "timestamp", "intent", "imageDataUrl"]);
const audioFields = new Set(["masterDurationSeconds", "decodedDurationSeconds", "sampleRate", "channels", "peakAmplitude", "meanOneSecondRms", "rmsVariation", "silentSeconds", "silenceRatio", "expectedNarrationCoverage", "reviewMethod", "qualityPolicy"]);

function functionSource(name) {
  const declaration = routeFile.statements.find((statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === name);
  assert.ok(declaration, `${name} must remain a top-level function`);
  return route.slice(declaration.getStart(routeFile), declaration.end);
}

function transpile(names) {
  const input = names.map(functionSource).join("\n").replaceAll("export async function", "async function");
  return ts.transpileModule(input, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
}

function request(body, options = {}) {
  const headers = { "content-type": options.contentType || "application/json", origin: options.origin || "https://factory.invalid", "sec-fetch-site": options.fetchSite || "same-origin", ...(options.headers || {}) };
  return new Request(options.url || "https://factory.invalid/api/projects/project-1/perceptual-qa", { method: options.method || "POST", headers, body });
}

async function executeGuard(options = {}) {
  const observed = { runtime: 0, database: 0, provider: 0 };
  const env = new Proxy({ FACTORY_EXPERT_EMAILS: options.allowlist === undefined ? "owner@example.com" : options.allowlist, DB: options.db === undefined ? {} : options.db, OPENAI_API_KEY: "must-not-be-read" }, {
    get(target, property, receiver) {
      if (property === "DB") observed.database += 1;
      if (property === "OPENAI_API_KEY" || property === "OPENAI_QA_MODEL") observed.provider += 1;
      return Reflect.get(target, property, receiver);
    },
  });
  const req = request("{}", options);
  const result = await vm.runInNewContext(
    transpile(["perceptualQaOwnerFailure", "perceptualQaOwnerSameOrigin", "authorizePerceptualQaOwnerWrite"]) + "\nauthorizePerceptualQaOwnerWrite(request);",
    { Response, Request, URL, request: req, getChatGPTUser: async () => options.user === undefined ? { email: "owner@example.com" } : options.user, runtimeEnv: async () => { observed.runtime += 1; return env; } },
  );
  return { result, observed };
}

async function readCommand(body, options = {}) {
  const req = request(body, options);
  return vm.runInNewContext(
    transpile(["perceptualQaOwnerFailure", "perceptualQaSha256RawBytes", "perceptualQaExactKeys", "perceptualQaBoundedString", "perceptualQaFiniteNumber", "perceptualQaFrameValid", "perceptualQaAudioMetricsValid", "perceptualQaOwnerPayloadValid", "readPerceptualQaOwnerCommand"]) + "\nreadPerceptualQaOwnerCommand(request);",
    {
      Response, Request, TextDecoder, crypto, request: req,
      PERCEPTUAL_QA_OWNER_ACTIONS: actions, PERCEPTUAL_QA_OWNER_FIELDS: fields, PERCEPTUAL_QA_FRAME_FIELDS: frameFields, PERCEPTUAL_QA_AUDIO_FIELDS: audioFields,
      MAX_PERCEPTUAL_QA_OWNER_BODY_BYTES: 10 * 1024 * 1024, MAX_PERCEPTUAL_QA_FRAME_DATA_URL_BYTES: 700 * 1024,
    },
  );
}

function recordingDb(events, failPhase = null) {
  return {
    prepare(sql) {
      let values = [];
      return { bind(...next) { values = next; return this; }, async run() { if (sql.includes("factory_write_command_audit") && values[8] === failPhase) throw new Error(`AUDIT_${failPhase}_FAILED`); events.push({ sql, values }); return {}; } };
    },
  };
}

async function executeAudited(responseFactory, options = {}) {
  const events = [];
  const db = recordingDb(events, options.failPhase || null);
  const command = options.command || { action: "START_RUN", payload: { action: "START_RUN" }, requestHash: "a".repeat(64) };
  const identity = { handlerIdentity, actorType: "CHATGPT_OWNER", actorSubjectHash: "b".repeat(64), action: command.action, resourceScope: "project:p-1:perceptual-qa:start", correlationId: "test:correlation", requestHash: command.requestHash };
  let executions = 0;
  const execute = async () => { executions += 1; return responseFactory(); };
  const result = await vm.runInNewContext(
    transpile(["perceptualQaBoundedAuditComponent", "perceptualQaDomainReceipt", "runAuditedPerceptualQaOwnerCommand"]) + "\nrunAuditedPerceptualQaOwnerCommand(db, identity, command, execute);",
    { Response, appendWriteCommandAudit, db, identity, command, execute, PERCEPTUAL_QA_AUDIT_COMPONENT_PATTERN: /[^A-Za-z0-9._:-]/g },
  );
  return { result, events, executions };
}

test("M1-03H protects perceptual QA POST before params, body, D1, provider, and business", () => {
  const [analysis] = analyzeAuthSource(route, routePath).filter((item) => item.method === "POST");
  assert.equal(analysis.covered, true);
  assert.equal(analysis.authenticationGuard, "authorizePerceptualQaOwnerWrite");
  assert.equal(analysis.authorizationGuard, "authorizePerceptualQaOwnerWrite");
  const post = functionSource("POST");
  const guard = post.indexOf("await authorizePerceptualQaOwnerWrite(request)");
  const body = post.indexOf("await readPerceptualQaOwnerCommand(request)");
  const params = post.indexOf("await context.params");
  const identity = post.indexOf("await perceptualQaOwnerAuditIdentity(");
  const audited = post.indexOf("await runAuditedPerceptualQaOwnerCommand(");
  const execute = post.indexOf("executePerceptualQaOwnerCommand(id, command.payload)");
  assert.ok(guard >= 0 && guard < body && body < params && params < identity && identity < audited && audited < execute);
  for (const forbidden of ["request.json()", "getDb(", "runtimeEnv(", "openaiStructured(", "fetch(", ".insert(", ".update("]) assert.equal(post.includes(forbidden), false);
  const executor = functionSource("executePerceptualQaOwnerCommand");
  assert.ok(executor.indexOf("const shotMap") < executor.indexOf('openaiStructured("perceptual_frame_findings"'));
});

test("authentication, allowlist, exact route, origin, and canonical DB denials fail closed", async () => {
  const cases = [
    { user: null, status: 401, code: "SIWC_AUTHENTICATION_REQUIRED" },
    { allowlist: "", status: 503, code: "OWNER_WRITE_ALLOWLIST_UNCONFIGURED" },
    { user: { email: "intruder@example.com" }, status: 403, code: "OWNER_WRITE_AUTHORIZATION_REQUIRED" },
    { origin: "https://evil.invalid", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED" },
    { fetchSite: "cross-site", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED" },
    { url: "https://factory.invalid/api/projects/project-1/perceptual-qa/extra", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED" },
    { method: "PUT", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED" },
    { db: null, status: 503, code: "CANONICAL_DATABASE_UNAVAILABLE" },
  ];
  for (const item of cases) {
    const { result, observed } = await executeGuard(item);
    assert.ok(result instanceof Response);
    assert.equal(result.status, item.status);
    assert.deepEqual(await result.json(), { error: item.code });
    assert.equal(observed.provider, 0);
  }
});

test("normalized owner identity is exact and correlation/request hashes are bounded", async () => {
  const allowed = await executeGuard({ user: { email: " Owner@Example.COM " }, allowlist: "other@example.com, owner@example.com" });
  assert.equal(allowed.result.normalizedEmail, "owner@example.com");
  const command = { action: "FINALIZE_RUN", payload: { action: "FINALIZE_RUN", runId: "run-1" }, requestHash: "a".repeat(64) };
  const req = request("{}", { headers: { "x-correlation-id": "valid:correlation-123" } });
  const identity = await vm.runInNewContext(
    transpile(["perceptualQaBoundedAuditComponent", "perceptualQaOwnerResourceScope", "perceptualQaOwnerCorrelationId", "perceptualQaOwnerAuditIdentity"]) + '\nperceptualQaOwnerAuditIdentity(request, "p-1", "owner@example.com", command);',
    { request: req, command, crypto, hashActorSubject, PERCEPTUAL_QA_OWNER_HANDLER_IDENTITY: handlerIdentity, PERCEPTUAL_QA_CORRELATION_ID_PATTERN: /^[A-Za-z0-9._:-]{8,200}$/, PERCEPTUAL_QA_AUDIT_COMPONENT_PATTERN: /[^A-Za-z0-9._:-]/g },
  );
  assert.equal(identity.actorType, "CHATGPT_OWNER");
  assert.equal(identity.actorSubjectHash, await hashActorSubject("CHATGPT_OWNER", "owner@example.com"));
  assert.equal(identity.resourceScope, "project:p-1:perceptual-qa:run-1");
  assert.equal(identity.correlationId, "valid:correlation-123");
});

test("JSON envelope enforces exact actions, fields, byte bounds, frame schema, and audio schema", async () => {
  const invalid = [
    { body: "{}", options: { contentType: "text/plain" }, status: 415, code: "JSON_CONTENT_TYPE_REQUIRED" },
    { body: "{}", options: { headers: { "content-length": String(10 * 1024 * 1024 + 1) } }, status: 413, code: "OWNER_WRITE_BODY_TOO_LARGE" },
    { body: "{", status: 400, code: "OWNER_WRITE_JSON_INVALID" },
    { body: "null", status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: JSON.stringify({ action: "PUBLISH_VIDEO" }), status: 403, code: "PERCEPTUAL_QA_OWNER_ACTION_FORBIDDEN" },
    { body: JSON.stringify({ action: "START_RUN", extra: true }), status: 400, code: "OWNER_WRITE_COMMAND_FIELD_FORBIDDEN" },
    { body: JSON.stringify({ action: "ANALYZE_BATCH", runId: "run-1", frames: [] }), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: JSON.stringify({ action: "ANALYZE_BATCH", runId: "run-1", frames: [{ shotId: "shot-1", title: "x", family: "REAL", timestamp: 1, intent: "x", imageDataUrl: "data:image/png;base64,AAAA" }] }), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: JSON.stringify({ action: "FINALIZE_RUN", runId: "run-1", audioMetrics: {} }), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
  ];
  for (const item of invalid) {
    const result = await readCommand(item.body, item.options || {});
    assert.ok(result instanceof Response);
    assert.equal(result.status, item.status);
    assert.deepEqual(await result.json(), { error: item.code });
  }
  const startRaw = JSON.stringify({ action: "START_RUN" });
  const start = await readCommand(startRaw);
  assert.equal(start.action, "START_RUN");
  assert.equal(start.requestHash, createHash("sha256").update(Buffer.from(startRaw)).digest("hex"));
  const frame = { shotId: "shot-1", title: "Entry", family: "REAL_FOOTAGE", timestamp: 1.5, intent: "Show the payment flow", imageDataUrl: "data:image/jpeg;base64,/9j/AA==" };
  const analyze = await readCommand(JSON.stringify({ action: "ANALYZE_BATCH", runId: "run-1", frames: [frame] }));
  assert.equal(analyze.action, "ANALYZE_BATCH");
  const audioMetrics = { masterDurationSeconds: 480, decodedDurationSeconds: 480, sampleRate: 48000, channels: 2, peakAmplitude: 0.9, meanOneSecondRms: 0.2, rmsVariation: 0.1, silentSeconds: 4, silenceRatio: 0.0083, expectedNarrationCoverage: "12 stems", reviewMethod: "sampled frames and decoded waveform", qualityPolicy: "maximum quality" };
  const finalize = await readCommand(JSON.stringify({ action: "FINALIZE_RUN", runId: "run-1", audioMetrics }));
  assert.equal(finalize.action, "FINALIZE_RUN");
});

test("immutable audit is AUTHORIZED before business and has one terminal phase with domain receipt", async () => {
  const success = await executeAudited(async () => Response.json({ ok: true, runId: "p-1-PQA-1" }));
  assert.equal(success.result.status, 200);
  assert.equal(success.executions, 1);
  assert.deepEqual(success.events.map((event) => event.values[8]), ["AUTHORIZED", "SUCCEEDED"]);
  assert.equal(success.events[1].values[9], "perceptual-qa:p-1-PQA-1:STARTED");
  const rejected = await executeAudited(async () => Response.json({ error: "blocked" }, { status: 409 }));
  assert.equal(rejected.result.status, 409);
  assert.deepEqual(rejected.events.map((event) => event.values[8]), ["AUTHORIZED", "FAILED"]);
  const events = []; let executions = 0;
  await assert.rejects(() => vm.runInNewContext(
    transpile(["perceptualQaBoundedAuditComponent", "perceptualQaDomainReceipt", "runAuditedPerceptualQaOwnerCommand"]) + "\nrunAuditedPerceptualQaOwnerCommand(db, identity, command, execute);",
    { Response, appendWriteCommandAudit, db: recordingDb(events, "AUTHORIZED"), identity: { handlerIdentity, actorType: "CHATGPT_OWNER", actorSubjectHash: "b".repeat(64), action: "START_RUN", resourceScope: "project:p-1", correlationId: "test:correlation", requestHash: "a".repeat(64) }, command: { action: "START_RUN", payload: { action: "START_RUN" }, requestHash: "a".repeat(64) }, execute: async () => { executions += 1; return Response.json({ ok: true }); }, PERCEPTUAL_QA_AUDIT_COMPONENT_PATTERN: /[^A-Za-z0-9._:-]/g },
  ), /AUDIT_AUTHORIZED_FAILED/);
  assert.equal(executions, 0);
});

test("OpenAI behavior is fully mocked and raw provider error cannot escape", async () => {
  let requests = 0; const secret = "raw-provider-secret-must-not-escape";
  await assert.rejects(
    () => vm.runInNewContext(
      transpile(["openaiStructured"]) + '\nopenaiStructured("test", {}, []);',
      { AbortSignal, Error, JSON, Response, runtimeEnv: async () => ({ OPENAI_API_KEY: "mock-only", OPENAI_QA_MODEL: "gpt-5.6" }), fetch: async () => { requests += 1; return new Response(secret, { status: 500 }); } },
    ),
    (error) => error instanceof Error && error.message === "OpenAI perceptual critic failed (500)" && !error.message.includes(secret),
  );
  assert.equal(requests, 1);
  assert.equal(route.includes("detail.slice"), false);
  assert.equal(route.includes("M1_03H_LIVE_PROVIDER_TEST"), false);
  assert.equal(route.includes("M1_03H_LIVE_SPEND_TEST"), false);
});

test("registry and auth baseline move exactly one POST to M1-03H ratchets", () => {
  const handlers = JSON.parse(source("governance/registries/http-handlers.json")).handlers;
  assert.deepEqual(handlers.find((item) => item.identity === handlerIdentity), {
    identity: handlerIdentity, sourceFile: routePath, routePath: "/api/projects/[id]/perceptual-qa", method: "POST", readWrite: "WRITE", actor: "CHATGPT_OWNER", authentication: "CHATGPT_SIWC", authorization: "FACTORY_EXPERT_EMAILS_ALLOWLIST_AND_SAME_ORIGIN_AND_EXACT_ACTION", audit: "IMMUTABLE_WRITE_COMMAND_AUDIT_AND_DOMAIN_RECEIPT", status: "PROTECTED", remediationWp: "NONE",
  });
  assert.equal(handlers.length, 100);
  assert.equal(handlers.filter((item) => item.status === "PROTECTED").length, 20);
  assert.equal(handlers.filter((item) => item.status === "GAP_UNAUTHENTICATED_WRITE").length, 25);
  assert.deepEqual(["GET", "POST"].map((method) => handlers.filter((item) => item.status === "GAP_UNAUTHENTICATED_WRITE" && item.method === method).length), [13, 12]);
  assert.equal(handlers.filter((item) => item.actor === "CHATGPT_OWNER").length, 26);
  assert.equal(handlers.filter((item) => item.actor === "UNCLASSIFIED").length, 67);
  const auth = JSON.parse(source("governance/baselines/auth-coverage.json")).uncoveredHandlers;
  assert.equal(auth.length, 45);
  assert.equal(auth.some((item) => item.identity === handlerIdentity), false);
  assert.deepEqual(["GET", "POST", "HEAD"].map((method) => auth.filter((item) => item.method === method).length), [32, 12, 1]);
  assert.equal(JSON.parse(source("governance/baselines/no-write-in-get.json")).handlersWithReachableWrites.length, 16);
  assert.equal(JSON.parse(source("governance/baselines/actor-separation.json")).unseparatedCommands.length, 19);
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
  for (const [name, digest] of Object.entries(expected)) assert.equal(createHash("sha256").update(source(`drizzle/${name}`)).digest("hex"), digest);
});
