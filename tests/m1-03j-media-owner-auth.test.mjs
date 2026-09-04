import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { analyzeActorSource, analyzeAuthSource } from "../scripts/lib/candidate-ci-policy.mjs";

const root = process.cwd();
const routePath = "app/api/projects/[id]/media/route.ts";
const handlerIdentity = routePath + "#POST";
const source = (path) => readFileSync(join(root, path), "utf8");
const route = source(routePath);
const routeFile = ts.createSourceFile(routePath, route, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

const actions = new Set([
  "PREPARE_VISUAL_COMPOSITION_V2",
  "REPAIR_OPTIMIZED_WAVE",
  "MATERIALIZE_OPTIMIZED_WAVE",
  "FINALIZE_MOTION_UPLOAD",
  "SET_AUTOMATION_MODE",
  "AUTO_SOURCE_ALL",
  "GENERATE_DIAGRAMS",
  "GENERATE_MOTION_VISUALS",
  "REGISTER_LINK",
  "SELECT_DISCOVERY",
  "VERIFY_RIGHTS",
  "APPROVE_ASSET",
  "BUILD_ASSEMBLY",
]);
const fields = {
  PREPARE_VISUAL_COMPOSITION_V2: new Set(["action", "repairCycle"]),
  REPAIR_OPTIMIZED_WAVE: new Set(["action", "batchSize", "repairCycle"]),
  MATERIALIZE_OPTIMIZED_WAVE: new Set(["action", "batchSize"]),
  FINALIZE_MOTION_UPLOAD: new Set(["action", "uploadId", "chunkCount", "sceneId", "parentAssetId", "fileName", "sizeBytes"]),
  SET_AUTOMATION_MODE: new Set(["action", "verificationMode"]),
  AUTO_SOURCE_ALL: new Set(["action"]),
  GENERATE_DIAGRAMS: new Set(["action"]),
  GENERATE_MOTION_VISUALS: new Set(["action"]),
  REGISTER_LINK: new Set(["action", "sceneId", "sourceUrl", "licenseType", "licenseProof"]),
  SELECT_DISCOVERY: new Set(["action", "sceneId", "candidate"]),
  VERIFY_RIGHTS: new Set(["action", "assetId", "licenseProof"]),
  APPROVE_ASSET: new Set(["action", "assetId"]),
  BUILD_ASSEMBLY: new Set(["action"]),
};
const formFields = new Set(["file", "sceneId", "generatedMotion", "parentAssetId", "licenseType", "licenseProof"]);
const candidateFields = new Set(["id", "provider", "category", "title", "mediaType", "thumbnailUrl", "assetUrl", "landingUrl", "licenseType", "licenseUrl", "creator", "sourceAssetId", "score"]);

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
  const url = options.url || "https://factory.invalid/api/projects/project-1/media";
  const headers = new Headers(options.headers || {});
  if (!(body instanceof FormData) && !headers.has("content-type")) headers.set("content-type", options.contentType || "application/json");
  if (!headers.has("origin")) headers.set("origin", options.origin || "https://factory.invalid");
  if (!headers.has("sec-fetch-site")) headers.set("sec-fetch-site", options.fetchSite || "same-origin");
  return new Request(url, { method: options.method || "POST", headers, body });
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
      if (String(property).includes("API_KEY") || String(property).includes("SECRET")) observed.provider += 1;
      return Reflect.get(target, property, receiver);
    },
  });
  const result = await vm.runInNewContext(
    transpile(["mediaOwnerFailure", "mediaOwnerSameOrigin", "authorizeMediaOwnerWrite"]) + "\nauthorizeMediaOwnerWrite(request);",
    {
      Response,
      Request,
      URL,
      request: ownerRequest("{broken", options),
      getChatGPTUser: async () => options.user === undefined ? { email: "owner@example.com" } : options.user,
      mediaOwnerRuntimeEnv: async () => { observed.environment += 1; return environment; },
    },
  );
  return { result, observed };
}

async function readCommand(request) {
  return vm.runInNewContext(
    transpile([
      "mediaOwnerFailure",
      "mediaOwnerSha256RawBytes",
      "mediaOwnerBoundedString",
      "mediaOwnerAllowedKeys",
      "mediaOwnerExactQueryKeys",
      "mediaOwnerFiniteInteger",
      "mediaOwnerCandidateValid",
      "mediaOwnerJsonPayloadValid",
      "readMediaOwnerCommand",
    ]) + "\nreadMediaOwnerCommand(request);",
    {
      Response,
      Request,
      URL,
      Headers,
      FormData,
      File,
      TextDecoder,
      Uint8Array,
      crypto,
      request,
      safeUploadId: (value) => /^[a-zA-Z0-9-]{12,80}$/.test(value),
      MEDIA_OWNER_ACTIONS: actions,
      MEDIA_OWNER_FIELDS: fields,
      MEDIA_OWNER_FORM_FIELDS: formFields,
      MEDIA_OWNER_CANDIDATE_FIELDS: candidateFields,
      MAX_MEDIA_OWNER_JSON_BYTES: 32 * 1024,
      MAX_MEDIA_OWNER_FORM_BYTES: 52 * 1024 * 1024,
      MAX_MEDIA_OWNER_UPLOAD_PART_BYTES: 700 * 1024,
    },
  );
}

test("M1-03J protects every media POST mode before params, body, runtime DDL, D1, R2, provider, reservation, spend, usage, and business", () => {
  const [analysis] = analyzeAuthSource(route, routePath).filter((item) => item.method === "POST");
  assert.equal(analysis.covered, true);
  assert.equal(analysis.authenticationGuard, "authorizeMediaOwnerWrite");
  assert.equal(analysis.authorizationGuard, "authorizeMediaOwnerWrite");
  const post = functionSource("POST");
  const guard = post.indexOf("await authorizeMediaOwnerWrite(request)");
  const actor = post.indexOf("requireOwnerAuthority(authorization.actorType)");
  const clone = post.indexOf("request.clone()");
  const command = post.indexOf("await readMediaOwnerCommand(request)");
  const params = post.indexOf("await context.params");
  const audit = post.indexOf("await runAuditedMediaOwnerCommand(");
  const execute = post.indexOf("executeMediaOwnerCommand(executionRequest, id)");
  assert.ok(guard >= 0 && guard < actor && actor < clone && clone < command && command < params && params < audit && audit < execute);
  for (const forbidden of [
    "request.json(",
    "request.arrayBuffer(",
    "request.formData(",
    "ensureMediaSchema(",
    "getDb(",
    ".prepare(",
    ".batch(",
    ".put(",
    ".delete(",
    "fetch(",
    "recordOpenAIUsage(",
    "reserve",
    "spend",
  ]) assert.equal(post.includes(forbidden), false, forbidden + " must remain behind authorization");
});

test("anonymous, wrong-origin, non-owner, unconfigured, and unavailable-database denials touch no body or mutable dependency", async () => {
  const cases = [
    { user: null, status: 401, code: "SIWC_AUTHENTICATION_REQUIRED", environment: 0 },
    { origin: "https://evil.invalid", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED", environment: 0 },
    { fetchSite: "cross-site", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED", environment: 0 },
    { url: "https://factory.invalid/api/projects/project-1/media/extra", status: 403, code: "OWNER_WRITE_SAME_ORIGIN_REQUIRED", environment: 0 },
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

test("explicit owner authority separates APPROVE_ASSET from AGENT execution", async () => {
  const actor = functionSource("requireOwnerAuthority");
  assert.ok(actor.includes('actorType === "AGENT"'));
  assert.ok(actor.includes("AGENT_OWNER_COMMAND_FORBIDDEN"));
  const debt = analyzeActorSource(route, routePath);
  assert.equal(debt.some((item) => item.command === "APPROVE_ASSET"), false);
  const denial = await vm.runInNewContext(
    transpile(["mediaOwnerFailure", "requireOwnerAuthority"]) + '\nrequireOwnerAuthority("AGENT");',
    { Response },
  );
  assert.equal(denial.status, 403);
});

test("JSON envelope has exactly thirteen actions, bounded fields, nested candidate validation, and raw hashes", async () => {
  assert.equal(actions.size, 13);
  const valid = [
    { action: "PREPARE_VISUAL_COMPOSITION_V2", repairCycle: 1 },
    { action: "REPAIR_OPTIMIZED_WAVE", batchSize: 4, repairCycle: 2 },
    { action: "MATERIALIZE_OPTIMIZED_WAVE", batchSize: 4 },
    { action: "FINALIZE_MOTION_UPLOAD", uploadId: "upload-123456", chunkCount: 2, sceneId: "scene-1", parentAssetId: "asset-1", fileName: "motion.webm", sizeBytes: 100 },
    { action: "SET_AUTOMATION_MODE", verificationMode: "AUTOPILOT" },
    { action: "AUTO_SOURCE_ALL" },
    { action: "GENERATE_DIAGRAMS" },
    { action: "GENERATE_MOTION_VISUALS" },
    { action: "REGISTER_LINK", sceneId: "scene-1", sourceUrl: "https://example.com/asset", licenseType: "SOURCE_LICENSE" },
    { action: "SELECT_DISCOVERY", sceneId: "scene-1", candidate: { id: "candidate-1", provider: "Pexels", category: "FREE", title: "Clip", mediaType: "VIDEO", thumbnailUrl: null, assetUrl: "https://example.com/clip.mp4", landingUrl: "https://example.com", licenseType: "FREE", licenseUrl: null, creator: null, score: 92 } },
    { action: "VERIFY_RIGHTS", assetId: "asset-1", licenseProof: "Owner verified" },
    { action: "APPROVE_ASSET", assetId: "asset-1" },
    { action: "BUILD_ASSEMBLY" },
  ];
  for (const payload of valid) {
    const raw = JSON.stringify(payload);
    const command = await readCommand(ownerRequest(raw));
    assert.equal(command.kind, "JSON");
    assert.equal(command.action, payload.action);
    assert.equal(command.requestHash, createHash("sha256").update(Buffer.from(raw)).digest("hex"));
  }
  const invalid = [
    { body: "{", status: 400, code: "OWNER_WRITE_JSON_INVALID" },
    { body: "null", status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: JSON.stringify({ action: "PUBLISH_VIDEO" }), status: 403, code: "MEDIA_OWNER_ACTION_FORBIDDEN" },
    { body: JSON.stringify({ action: "BUILD_ASSEMBLY", extra: true }), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: JSON.stringify({ action: "VERIFY_RIGHTS", assetId: "" }), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
    { body: JSON.stringify({ action: "SELECT_DISCOVERY", sceneId: "scene-1", candidate: { id: "x", extra: true } }), status: 400, code: "OWNER_WRITE_COMMAND_INVALID" },
  ];
  for (const item of invalid) {
    const response = await readCommand(ownerRequest(item.body));
    assert.ok(response instanceof Response);
    assert.equal(response.status, item.status);
    assert.deepEqual(await response.json(), { error: item.code });
  }
});

test("binary upload-part protocol requires exact query, content type, byte bound, and raw hash", async () => {
  const bytes = new Uint8Array([1, 2, 3, 4]);
  const command = await readCommand(ownerRequest(bytes, {
    url: "https://factory.invalid/api/projects/project-1/media?motionUpload=part&uploadId=upload-123456&part=0",
    contentType: "application/octet-stream",
  }));
  assert.equal(command.kind, "UPLOAD_PART");
  assert.equal(command.action, "UPLOAD_MOTION_PART");
  assert.equal(command.part, 0);
  assert.equal(command.requestHash, createHash("sha256").update(bytes).digest("hex"));
  for (const url of [
    "https://factory.invalid/api/projects/project-1/media?motionUpload=part&uploadId=upload-123456",
    "https://factory.invalid/api/projects/project-1/media?motionUpload=part&uploadId=upload-123456&part=0&extra=1",
    "https://factory.invalid/api/projects/project-1/media?motionUpload=wrong&uploadId=upload-123456&part=0",
  ]) {
    const response = await readCommand(ownerRequest(bytes, { url, contentType: "application/octet-stream" }));
    assert.equal(response.status, 400);
  }
});

test("multipart upload protocol validates exact form fields, media type, size, and motion-parent contract", async () => {
  const form = new FormData();
  form.set("sceneId", "scene-1");
  form.set("licenseType", "OWNED");
  form.set("file", new File([new Uint8Array([1, 2, 3])], "image.png", { type: "image/png" }));
  const command = await readCommand(ownerRequest(form));
  assert.equal(command.kind, "FORM_UPLOAD");
  assert.equal(command.action, "UPLOAD_MEDIA_ASSET");
  assert.equal(command.sceneId, "scene-1");
  assert.equal(command.requestHash.length, 64);

  const extra = new FormData();
  extra.set("sceneId", "scene-1");
  extra.set("file", new File([new Uint8Array([1])], "image.png", { type: "image/png" }));
  extra.set("unexpected", "forbidden");
  const response = await readCommand(ownerRequest(extra));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "OWNER_WRITE_COMMAND_FIELD_FORBIDDEN" });

  const motion = new FormData();
  motion.set("sceneId", "scene-1");
  motion.set("generatedMotion", "true");
  motion.set("file", new File([new Uint8Array([1])], "motion.webm", { type: "video/webm" }));
  const motionResponse = await readCommand(ownerRequest(motion));
  assert.equal(motionResponse.status, 400);
});

test("project, scene, asset, internal-source, and parent-asset bindings precede media mutations", () => {
  const execute = functionSource("executeMediaOwnerCommand");
  const project = execute.indexOf("eq(videoProjects.id, id)");
  const requestMode = execute.indexOf("const requestUrl = new URL(request.url)");
  assert.ok(project >= 0 && project < requestMode);
  assert.ok(execute.includes("asset.projectId !== id"));
  assert.ok(execute.includes("scene.projectId !== id"));
  assert.ok(execute.includes("source.projectId !== id"));
  assert.ok(execute.includes("parentAsset.projectId !== id"));
  assert.ok(execute.includes("parentAsset.sceneId !== sceneId"));
  const verify = execute.indexOf('payload.action === "VERIFY_RIGHTS"');
  const verifyProject = execute.indexOf("asset.projectId !== id", verify);
  const verifyUpdate = execute.indexOf("db.update(mediaAssets)", verify);
  assert.ok(verify < verifyProject && verifyProject < verifyUpdate);
  const finalize = execute.indexOf('payload.action === "FINALIZE_MOTION_UPLOAD"');
  const parent = execute.indexOf("parentAsset.projectId !== id", finalize);
  const bucket = execute.indexOf("const parts: Uint8Array[]", finalize);
  assert.ok(finalize < parent && parent < bucket);
});

test("immutable audit is AUTHORIZED before business with exactly one terminal outcome and media receipt", async () => {
  async function run(responseFactory) {
    const events = [];
    let executions = 0;
    const command = { kind: "JSON", action: "APPROVE_ASSET", payload: { action: "APPROVE_ASSET", assetId: "asset-1" }, requestHash: "a".repeat(64) };
    const identity = { handlerIdentity, actorType: "CHATGPT_OWNER", actorSubjectHash: "b".repeat(64), action: command.action, resourceScope: "project:project-1:media:asset-1", correlationId: "test:correlation", requestHash: command.requestHash };
    const response = await vm.runInNewContext(
      transpile([
        "mediaOwnerBoundedAuditComponent",
        "mediaOwnerDomainReceipt",
        "runAuditedMediaOwnerCommand",
      ]) + "\nrunAuditedMediaOwnerCommand(db, identity, projectId, command, execute);",
      {
        Response,
        db: {},
        identity,
        projectId: "project-1",
        command,
        execute: async () => { executions += 1; return responseFactory(); },
        appendWriteCommandAudit: async (_db, _identity, phase, receipt) => { events.push({ phase, receipt }); },
        MEDIA_OWNER_AUDIT_COMPONENT_PATTERN: /[^A-Za-z0-9._:-]/g,
      },
    );
    return { response, events, executions };
  }
  const success = await run(() => Response.json({ ok: true, assetId: "asset-1" }));
  assert.equal(success.executions, 1);
  assert.deepEqual(success.events.map((item) => item.phase), ["AUTHORIZED", "SUCCEEDED"]);
  assert.equal(success.events[1].receipt, "media:project-1:APPROVE_ASSET:asset-1");
  const failure = await run(() => Response.json({ error: "blocked" }, { status: 409 }));
  assert.equal(failure.executions, 1);
  assert.deepEqual(failure.events.map((item) => item.phase), ["AUTHORIZED", "FAILED"]);
});

test("legacy v5 firewall and existing media commands remain behind the boundary without live provider or spend tests", () => {
  const execute = functionSource("executeMediaOwnerCommand");
  assert.ok(execute.includes("LEGACY_MATERIALIZATION_DISABLED_FOR_V5"));
  for (const action of actions) assert.ok(execute.includes('payload.action === "' + action + '"'));
  assert.equal(route.includes("M1_03J_LIVE_PROVIDER_TEST"), false);
  assert.equal(route.includes("M1_03J_LIVE_SPEND_TEST"), false);
  assert.equal(route.includes("recordOpenAIUsage("), false);
  assert.equal(route.includes("reserve"), false);
});

test("registry, auth, actor separation, and GET baselines ratchet exactly once", () => {
  const handlers = JSON.parse(source("governance/registries/http-handlers.json")).handlers;
  assert.deepEqual(handlers.find((item) => item.identity === handlerIdentity), {
    identity: handlerIdentity,
    sourceFile: routePath,
    routePath: "/api/projects/[id]/media",
    method: "POST",
    readWrite: "WRITE",
    actor: "CHATGPT_OWNER",
    authentication: "CHATGPT_SIWC",
    authorization: "FACTORY_EXPERT_EMAILS_ALLOWLIST_AND_SAME_ORIGIN_AND_EXACT_MEDIA_COMMAND_AND_PROJECT_RESOURCE_BINDING",
    audit: "IMMUTABLE_WRITE_COMMAND_AUDIT_AND_MEDIA_DOMAIN_RECEIPT",
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
