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
const routePath = "app/api/projects/[id]/render/route.ts";
const handlerIdentity = routePath + "#POST";
const source = (path) => readFileSync(join(root, path), "utf8");
const route = source(routePath);
const routeFile = ts.createSourceFile(routePath, route, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const actions = ["FINALIZE_VIDEO", "MATERIALIZE_V2_NARRATION", "COMPLETE_PLAYBACK_QA", "REJECT_PLAYBACK_QA"];
const checks = ["FULL_PLAYBACK", "SINGLE_VOICE", "SYNC", "LOUDNESS", "BLACK_FRAMES", "RIGHTS"];
const failures = ["SOUNDTRACK_MISSING", "SEMANTIC_VISUAL_MISMATCH", "VISUAL_REPETITION", "FRAME_FIT_FAILURE", "VISUAL_DENSITY_LOW"];
const ownerFields = {
  FINALIZE_VIDEO: new Set(["action", "uploadId", "chunkCount", "fileName", "sizeBytes", "durationSeconds", "width", "height", "fps", "renderMode", "repairWave"]),
  MATERIALIZE_V2_NARRATION: new Set(["action", "position"]),
  COMPLETE_PLAYBACK_QA: new Set(["action", "renderId", "checks"]),
  REJECT_PLAYBACK_QA: new Set(["action", "renderId", "issues"]),
};

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
  return { body: 0, params: 0, database: 0, r2: 0, provider: 0, reservation: 0, spend: 0, business: 0, audits: 0 };
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

function guardedEnv(allowlist, db, observed) {
  return new Proxy({ FACTORY_EXPERT_EMAILS: allowlist, DB: db }, {
    get(target, property, receiver) {
      if (property === "BUCKET") observed.r2 += 1;
      if (property === "ELEVENLABS_API_KEY") observed.provider += 1;
      if (String(property).includes("RESERVATION")) observed.reservation += 1;
      if (String(property).includes("SPEND")) observed.spend += 1;
      return Reflect.get(target, property, receiver);
    },
  });
}

async function executeGuard({ user, allowlist = "owner@example.com", db = recordingDb([]), url, method = "POST", headers = {} }) {
  const observed = counters();
  const request = new Request(url || "https://factory.invalid/api/projects/project-1/render", {
    method,
    headers: { origin: "https://factory.invalid", "sec-fetch-site": "same-origin", ...headers },
  });
  request.arrayBuffer = async () => { observed.body += 1; return new ArrayBuffer(0); };
  const context = {
    Request,
    Response,
    URL,
    request,
    getChatGPTUser: async () => user,
    renderOwnerRuntimeEnv: async () => guardedEnv(allowlist, db, observed),
  };
  const result = await vm.runInNewContext(
    transpile(["ownerFailure", "renderOwnerSameOrigin", "authorizeRenderOwnerWrite"])
      + "\nauthorizeRenderOwnerWrite(request);",
    context,
  );
  return { result, observed };
}

async function executeCommand(url, body, contentType = "application/json", headers = {}) {
  const request = new Request(url, { method: "POST", headers: { "content-type": contentType, ...headers }, body });
  const context = {
    Request,
    Response,
    URL,
    Set,
    TextDecoder,
    Uint8Array,
    crypto,
    request,
    OWNER_ACTIONS: new Set(actions),
    OWNER_FIELDS: ownerFields,
    PLAYBACK_QA_CHECKS: checks,
    PLAYBACK_FAILURES: failures,
    MAX_OWNER_BODY_BYTES: 16 * 1024,
    MAX_UPLOAD_PART_BYTES: 700 * 1024,
  };
  return vm.runInNewContext(
    transpile(["ownerFailure", "validUploadId", "sha256RawBytes", "hasExactQueryKeys", "isFiniteNumber", "isBoundedString", "renderOwnerPayloadValid", "readRenderOwnerCommand"])
      + "\nreadRenderOwnerCommand(request);",
    context,
  );
}

async function executeAudited(resultFactory, options = {}) {
  const events = [];
  const db = recordingDb(events, options);
  const identity = {
    handlerIdentity,
    actorType: "CHATGPT_OWNER",
    actorSubjectHash: await hashActorSubject("CHATGPT_OWNER", "owner@example.com"),
    action: "FINALIZE_VIDEO",
    resourceScope: "project:p-1:render:upload-123456:finalize",
    correlationId: "test:correlation",
    requestHash: "a".repeat(64),
  };
  let executions = 0;
  const execute = async () => { executions += 1; return resultFactory(); };
  const result = await vm.runInNewContext(
    transpile(["runAuditedRenderOwnerCommand"]) + "\nrunAuditedRenderOwnerCommand(db, identity, execute);",
    { Response, appendWriteCommandAudit, db, identity, execute },
  );
  return { result, events, executions };
}

test("M1-03G protects render POST before params, request bytes, runtime, and every side effect", () => {
  const [analysis] = analyzeAuthSource(route, routePath).filter((item) => item.method === "POST");
  assert.equal(analysis.covered, true);
  assert.equal(analysis.authenticationGuard, "authorizeRenderOwnerWrite");
  assert.equal(analysis.authorizationGuard, "authorizeRenderOwnerWrite");

  const post = declarationSource("POST");
  const guard = post.indexOf("await authorizeRenderOwnerWrite(request)");
  const body = post.indexOf("await readRenderOwnerCommand(request)");
  const params = post.indexOf("await context.params");
  const identity = post.indexOf("await renderOwnerAuditIdentity(");
  const audited = post.indexOf("await runAuditedRenderOwnerCommand(");
  const execute = post.indexOf("executeRenderOwnerCommand(id, command)");
  assert.ok(guard >= 0 && guard < body && body < params && params < identity && identity < audited && audited < execute);
  assert.equal(post.includes("request.json()"), false);
  for (const forbidden of ["ensureSchema(", "getDb(", "runtimeEnv(", "BUCKET", "ELEVENLABS_API_KEY", "fetch("]) {
    assert.equal(post.includes(forbidden), false, "POST must not invoke " + forbidden + " directly");
  }
  assert.ok(post.includes('ownerFailure("RENDER_OWNER_ACTION_FAILED", 500)'));
});

test("authentication, allowlist, exact route, origin, and canonical database denials are fail closed", async () => {
  const cases = [
    { user: null, status: 401, code: "SIWC_AUTHENTICATION_REQUIRED" },
    { user: { email: "owner@example.com" }, allowlist: "", status: 503, code: "OWNER_WRITE_ALLOWLIST_UNCONFIGURED" },
    { user: { email: "intruder@example.com" }, status: 403, code: "OWNER_WRITE_AUTHORIZATION_REQUIRED" },
    { user: { email: "owner@example.com" }, headers: { origin: "https://evil.invalid" }, status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED" },
    { user: { email: "owner@example.com" }, headers: { "sec-fetch-site": "cross-site" }, status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED" },
    { user: { email: "owner@example.com" }, url: "https://factory.invalid/api/projects/project-1/render/extra", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED" },
    { user: { email: "owner@example.com" }, method: "PUT", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED" },
    { user: { email: "owner@example.com" }, db: null, status: 503, code: "CANONICAL_DATABASE_UNAVAILABLE" },
  ];
  for (const item of cases) {
    const { result, observed } = await executeGuard(item);
    assert.ok(result instanceof Response);
    assert.equal(result.status, item.status);
    assert.deepEqual(await result.json(), { error: item.code });
    assert.deepEqual(observed, counters());
  }
});

test("owner identity normalization is exact and query-bearing upload route passes the common guard", async () => {
  const allowed = await executeGuard({
    user: { email: " Owner@Example.COM " },
    allowlist: "another@example.com, owner@example.com",
    url: "https://factory.invalid/api/projects/project-1/render?upload=part&uploadId=upload-123456&part=0",
  });
  assert.equal(allowed.result.normalizedEmail, "owner@example.com");

  const denied = await executeGuard({ user: { email: "owner@example.com.evil" } });
  assert.equal(denied.result.status, 403);
});

test("JSON envelope enforces content type, byte ceiling, UTF-8, object, exact fields, types, and action allowlist", async () => {
  const url = "https://factory.invalid/api/projects/project-1/render";
  const invalid = [
    { body: "{}", type: "text/plain", status: 415, code: "JSON_CONTENT_TYPE_REQUIRED" },
    { body: "{}", headers: { "content-length": String(16 * 1024 + 1) }, status: 413, code: "OWNER_WRITE_BODY_TOO_LARGE" },
    { body: "x".repeat(16 * 1024 + 1), status: 413, code: "OWNER_WRITE_BODY_TOO_LARGE" },
    { body: new Uint8Array([0xc3, 0x28]), status: 400, code: "OWNER_WRITE_JSON_INVALID" },
    { body: "{", status: 400, code: "OWNER_WRITE_JSON_INVALID" },
    { body: "null", status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: "[]", status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: "{}", status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: JSON.stringify({ action: "MATERIALIZE_V2_NARRATION", position: 1, extra: true }), status: 400, code: "OWNER_WRITE_COMMAND_FIELD_FORBIDDEN" },
    { body: JSON.stringify({ action: "DELETE_VIDEO" }), status: 403, code: "OWNER_WRITE_ACTION_FORBIDDEN" },
    { body: JSON.stringify({ action: "PUBLISH_VIDEO" }), status: 403, code: "OWNER_WRITE_ACTION_FORBIDDEN" },
    { body: JSON.stringify({ action: "MATERIALIZE_V2_NARRATION", position: "1" }), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: JSON.stringify({ action: "MATERIALIZE_V2_NARRATION", position: 13 }), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: JSON.stringify({ action: "FINALIZE_VIDEO", uploadId: "short", chunkCount: 1 }), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: JSON.stringify({ action: "FINALIZE_VIDEO", uploadId: "upload-123456", chunkCount: 301 }), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: JSON.stringify({ action: "COMPLETE_PLAYBACK_QA", renderId: "render-1", checks: checks.slice(0, 5) }), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: JSON.stringify({ action: "REJECT_PLAYBACK_QA", renderId: "render-1", issues: ["UNKNOWN"] }), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
  ];
  for (const item of invalid) {
    const result = await executeCommand(url, item.body, item.type, item.headers);
    assert.ok(result instanceof Response);
    assert.equal(result.status, item.status);
    assert.deepEqual(await result.json(), { error: item.code });
  }

  const valid = [
    { action: "FINALIZE_VIDEO", uploadId: "upload-123456", chunkCount: 1, fileName: "master.webm", sizeBytes: 1024, durationSeconds: 480, width: 1920, height: 1080, fps: 30, renderMode: "OPTIMIZED_V2", repairWave: 0 },
    { action: "MATERIALIZE_V2_NARRATION", position: 1 },
    { action: "COMPLETE_PLAYBACK_QA", renderId: "render-1", checks },
    { action: "REJECT_PLAYBACK_QA", renderId: "render-1", issues: failures },
  ];
  for (const payload of valid) {
    const raw = JSON.stringify(payload);
    const result = await executeCommand(url, raw);
    assert.equal(result.kind, "JSON");
    assert.equal(result.action, payload.action);
    assert.equal(result.requestHash, createHash("sha256").update(Buffer.from(raw)).digest("hex"));
  }
});

test("binary upload has exact query, content type, bounds, bytes hash, and no JSON bypass", async () => {
  const base = "https://factory.invalid/api/projects/project-1/render";
  const invalid = [
    { url: base + "?upload=part&uploadId=upload-123456&part=0&extra=1", body: "x", type: "application/octet-stream", status: 400, code: "OWNER_WRITE_QUERY_INVALID" },
    { url: base + "?upload=part&uploadId=upload-123456&part=0&part=1", body: "x", type: "application/octet-stream", status: 400, code: "OWNER_WRITE_QUERY_INVALID" },
    { url: base + "?upload=other&uploadId=upload-123456&part=0", body: "x", type: "application/octet-stream", status: 400, code: "OWNER_WRITE_QUERY_INVALID" },
    { url: base + "?upload=part&uploadId=short&part=0", body: "x", type: "application/octet-stream", status: 400, code: "OWNER_WRITE_QUERY_INVALID" },
    { url: base + "?upload=part&uploadId=upload-123456&part=301", body: "x", type: "application/octet-stream", status: 400, code: "OWNER_WRITE_QUERY_INVALID" },
    { url: base + "?upload=part&uploadId=upload-123456&part=0", body: "x", type: "application/json", status: 415, code: "BINARY_CONTENT_TYPE_REQUIRED" },
    { url: base + "?upload=part&uploadId=upload-123456&part=0", body: new Uint8Array(700 * 1024 + 1), type: "application/octet-stream", status: 413, code: "OWNER_WRITE_BODY_TOO_LARGE" },
  ];
  for (const item of invalid) {
    const result = await executeCommand(item.url, item.body, item.type);
    assert.equal(result.status, item.status);
    assert.deepEqual(await result.json(), { error: item.code });
  }
  const bytes = new Uint8Array([1, 2, 3, 4]);
  const result = await executeCommand(base + "?upload=part&uploadId=upload-123456&part=300", bytes, "application/octet-stream");
  assert.equal(result.kind, "UPLOAD");
  assert.equal(result.action, "UPLOAD_FINAL_VIDEO_PART");
  assert.equal(result.part, 300);
  assert.equal(result.requestHash, createHash("sha256").update(bytes).digest("hex"));
});

test("audit identity hashes normalized owner, bounds resource scope, and validates correlation", async () => {
  const command = { kind: "JSON", action: "COMPLETE_PLAYBACK_QA", payload: { action: "COMPLETE_PLAYBACK_QA", renderId: "render-1", checks }, requestHash: "a".repeat(64) };
  const request = new Request("https://factory.invalid/api/projects/p-1/render", { method: "POST", headers: { "x-correlation-id": "valid:correlation-123" } });
  const context = {
    Request,
    crypto,
    request,
    command,
    hashActorSubject,
    OWNER_HANDLER_IDENTITY: handlerIdentity,
    CORRELATION_ID_PATTERN: /^[A-Za-z0-9._:-]{8,200}$/,
    AUDIT_COMPONENT_PATTERN: /[^A-Za-z0-9._:-]/g,
  };
  const identity = await vm.runInNewContext(
    transpile(["boundedAuditComponent", "renderOwnerResourceScope", "renderOwnerCorrelationId", "renderOwnerAuditIdentity"])
      + '\nrenderOwnerAuditIdentity(request, "p-1", "owner@example.com", command);',
    context,
  );
  assert.deepEqual({ ...identity }, {
    handlerIdentity,
    actorType: "CHATGPT_OWNER",
    actorSubjectHash: await hashActorSubject("CHATGPT_OWNER", "owner@example.com"),
    action: "COMPLETE_PLAYBACK_QA",
    resourceScope: "project:p-1:render:render-1:playback-qa",
    correlationId: "valid:correlation-123",
    requestHash: "a".repeat(64),
  });
  const generated = await vm.runInNewContext(
    transpile(["renderOwnerCorrelationId"]) + "\nrenderOwnerCorrelationId(request);",
    { request: new Request("https://factory.invalid", { headers: { "x-correlation-id": "bad id" } }), CORRELATION_ID_PATTERN: /^[A-Za-z0-9._:-]{8,200}$/, crypto },
  );
  assert.match(generated, /^render-owner:[0-9a-f-]{36}$/);
});

test("immutable audit writes AUTHORIZED before business and exactly one terminal phase with receipt", async () => {
  const success = await executeAudited(async () => ({ response: Response.json({ ok: true }), domainReceiptReference: "render:p-1-FINAL-V1:v1:READY" }));
  assert.equal(success.result.status, 200);
  assert.equal(success.executions, 1);
  assert.deepEqual(success.events.map((event) => event.values[8]), ["AUTHORIZED", "SUCCEEDED"]);
  assert.deepEqual(success.events.map((event) => event.values[9]), [null, "render:p-1-FINAL-V1:v1:READY"]);

  const rejected = await executeAudited(async () => ({ response: Response.json({ error: "blocked" }, { status: 409 }), domainReceiptReference: null }));
  assert.equal(rejected.result.status, 409);
  assert.deepEqual(rejected.events.map((event) => event.values[8]), ["AUTHORIZED", "FAILED"]);

  const exceptionEvents = [];
  await assert.rejects(
    () => vm.runInNewContext(
      transpile(["runAuditedRenderOwnerCommand"]) + "\nrunAuditedRenderOwnerCommand(db, identity, execute);",
      {
        Response,
        appendWriteCommandAudit,
        db: recordingDb(exceptionEvents),
        identity: { handlerIdentity, actorType: "CHATGPT_OWNER", actorSubjectHash: "b".repeat(64), action: "FINALIZE_VIDEO", resourceScope: "project:p-1:render", correlationId: "test:correlation", requestHash: "a".repeat(64) },
        execute: async () => { throw new Error("BUSINESS_SENTINEL"); },
      },
    ),
    /BUSINESS_SENTINEL/,
  );
  assert.deepEqual(exceptionEvents.map((event) => event.values[8]), ["AUTHORIZED", "FAILED"]);
});

test("failed AUTHORIZED blocks business and failed SUCCEEDED records FAILED", async () => {
  const identity = { handlerIdentity, actorType: "CHATGPT_OWNER", actorSubjectHash: "b".repeat(64), action: "FINALIZE_VIDEO", resourceScope: "project:p-1:render", correlationId: "test:correlation", requestHash: "a".repeat(64) };
  let executions = 0;
  await assert.rejects(
    () => vm.runInNewContext(
      transpile(["runAuditedRenderOwnerCommand"]) + "\nrunAuditedRenderOwnerCommand(db, identity, execute);",
      { Response, appendWriteCommandAudit, db: recordingDb([], { failPhase: "AUTHORIZED" }), identity, execute: async () => { executions += 1; return { response: Response.json({ ok: true }), domainReceiptReference: "receipt" }; } },
    ),
    /AUDIT_AUTHORIZED_FAILED/,
  );
  assert.equal(executions, 0);

  const events = [];
  await assert.rejects(
    () => vm.runInNewContext(
      transpile(["runAuditedRenderOwnerCommand"]) + "\nrunAuditedRenderOwnerCommand(db, identity, execute);",
      { Response, appendWriteCommandAudit, db: recordingDb(events, { failPhase: "SUCCEEDED" }), identity, execute: async () => ({ response: Response.json({ ok: true }), domainReceiptReference: "receipt" }) },
    ),
    /AUDIT_SUCCEEDED_FAILED/,
  );
  assert.deepEqual(events.map((event) => event.values[8]), ["AUTHORIZED", "FAILED"]);
});

test("domain receipts cover upload, narration, render, QA pass, and QA rejection without sensitive payloads", () => {
  const executor = declarationSource("executeRenderOwnerCommand");
  for (const receipt of ["render-upload:${key}:${command.requestHash}", "narration:${segmentId}:REUSED", "narration:${segmentId}:MATERIALIZED", "render:${renderId}:v${version}:${status}", "playback-qa:${render.id}:QA_PASSED", "playback-qa:${render.id}:${status}:wave:${repairWave}"]) {
    assert.ok(executor.includes(receipt));
  }
  const audited = declarationSource("runAuditedRenderOwnerCommand");
  assert.ok(audited.indexOf('"AUTHORIZED"') < audited.indexOf("await execute()"));
  assert.equal(route.includes("rawBody:"), false);
  assert.equal(route.includes("providerResponse:"), false);
  assert.equal(route.includes("authorization:"), false);
});

test("provider behavior is fully mocked, remains bounded to two attempts, and never exposes raw provider body", async () => {
  let providerRequests = 0;
  const rawSecret = "provider-secret-body-must-not-escape";
  const context = {
    Response,
    URL,
    encodeURIComponent,
    setTimeout: (resolve) => resolve(),
    fetch: async () => {
      providerRequests += 1;
      return new Response(JSON.stringify({ detail: { status: "provider_internal", message: rawSecret } }), { status: 500 });
    },
    env: { ELEVENLABS_API_KEY: "mock-only" },
    profile: { voiceId: "voice-1", modelId: "model-1", stability: 0.5, similarityBoost: 0.8, style: 0.2, speed: 1 },
  };
  const result = await vm.runInNewContext(
    transpile(["elevenLabsFailure", "requestElevenLabsNarration"]) + '\nrequestElevenLabsNarration(env, profile, "mock text");',
    context,
  );
  assert.equal(providerRequests, 2);
  assert.equal(result.response, null);
  assert.equal(result.attempts, 2);
  assert.equal(result.failure.message.includes(rawSecret), false);
  assert.equal(route.includes("M1_03G_LIVE_PROVIDER_TEST"), false);
  assert.equal(route.includes("M1_03G_LIVE_SPEND_TEST"), false);
});

test("registry and auth baseline move exactly one POST and reach M1-03G ratchets", () => {
  const handlers = JSON.parse(source("governance/registries/http-handlers.json")).handlers;
  assert.deepEqual(handlers.find((item) => item.identity === handlerIdentity), {
    identity: handlerIdentity,
    sourceFile: routePath,
    routePath: "/api/projects/[id]/render",
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
  assert.equal(handlers.filter((item) => item.status === "PROTECTED").length, 23);
  assert.equal(handlers.filter((item) => item.status === "GAP_UNAUTHENTICATED_WRITE").length, 22);
  assert.deepEqual(["GET", "POST"].map((method) => handlers.filter((item) => item.status === "GAP_UNAUTHENTICATED_WRITE" && item.method === method).length), [13, 9]);
  assert.equal(handlers.filter((item) => item.actor === "CHATGPT_OWNER").length, 29);
  assert.equal(handlers.filter((item) => item.actor === "UNCLASSIFIED").length, 64);

  const auth = JSON.parse(source("governance/baselines/auth-coverage.json")).uncoveredHandlers;
  assert.equal(auth.length, 42);
  assert.equal(auth.some((item) => item.identity === handlerIdentity), false);
  assert.deepEqual(["GET", "POST", "HEAD"].map((method) => auth.filter((item) => item.method === method).length), [32, 9, 1]);
  assert.equal(JSON.parse(source("governance/baselines/no-write-in-get.json")).handlersWithReachableWrites.length, 16);
  assert.equal(JSON.parse(source("governance/baselines/actor-separation.json")).unseparatedCommands.length, 17);
});

test("migration head remains 0132, migrations 0129 through 0132 are byte-identical, and no 0133 exists", () => {
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
