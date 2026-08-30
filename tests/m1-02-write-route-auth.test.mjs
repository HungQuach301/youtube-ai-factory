import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { analyzeAuthSource } from "../scripts/lib/candidate-ci-policy.mjs";

const root = process.cwd();
const targets = {
  "app/api/projects/route.ts": ["GET", "PATCH", "POST"],
  "app/api/projects/[id]/quality/route.ts": ["GET", "POST"],
  "app/api/projects/[id]/voice/route.ts": ["GET", "POST"],
  "app/api/projects/[id]/master-v5/route.ts": ["POST"],
};
const resolvedIdentities = Object.entries(targets).flatMap(([path, methods]) => methods.map((method) => `${path}#${method}`)).sort();

function source(path) {
  return readFileSync(join(root, path), "utf8");
}

function guardSource(path) {
  const text = source(path);
  const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const guard = file.statements.find((statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === "authorizeWriteAccess");
  assert.ok(guard, `${path} must define authorizeWriteAccess`);
  return text.slice(guard.getStart(file), guard.end);
}

async function executeGuard(path, user, env, counters) {
  const javascript = ts.transpileModule(guardSource(path), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  const context = {
    Response,
    getChatGPTUser: async () => user,
    runtimeEnv: async () => { counters.environmentReads += 1; return env; },
    getDb: async () => { counters.databaseMutations += 1; },
    fetch: async () => { counters.providerRequests += 1; },
    reserveCost: async () => { counters.costReservations += 1; },
  };
  return vm.runInNewContext(`${javascript}\nauthorizeWriteAccess();`, context);
}

function counters() {
  return { environmentReads: 0, databaseMutations: 0, providerRequests: 0, costReservations: 0 };
}

test("M1-02 exact write handlers authenticate and authorize before their first side effect", () => {
  for (const [path, methods] of Object.entries(targets)) {
    const analyzed = new Map(analyzeAuthSource(source(path), path).map((entry) => [entry.method, entry]));
    for (const method of methods) {
      const result = analyzed.get(method);
      assert.ok(result, `${path}#${method} must remain exported`);
      assert.equal(result.covered, true, `${path}#${method} must be covered`);
      assert.equal(result.authenticationGuard, "authorizeWriteAccess");
      assert.equal(result.authorizationGuard, "authorizeWriteAccess");
      assert.deepEqual(result.reasons, []);
    }
  }
});

test("anonymous requests return 401 before database, provider, or cost side effects", async () => {
  for (const path of Object.keys(targets)) {
    const observed = counters();
    const result = await executeGuard(path, null, {}, observed);
    assert.ok(result instanceof Response);
    assert.equal(result.status, 401);
    assert.deepEqual(observed, { environmentReads: 0, databaseMutations: 0, providerRequests: 0, costReservations: 0 });
  }
});

test("authenticated unauthorized actors return 403 with zero side effects", async () => {
  for (const path of Object.keys(targets)) {
    const observed = counters();
    const env = new Proxy({ FACTORY_EXPERT_EMAILS: "owner@example.com" }, {
      get(target, property, receiver) {
        if (property === "DB" || property === "BUCKET") observed.databaseMutations += 1;
        if (property === "ELEVENLABS_API_KEY") observed.providerRequests += 1;
        if (property === "COST_RESERVATION") observed.costReservations += 1;
        return Reflect.get(target, property, receiver);
      },
    });
    const result = await executeGuard(path, { email: "intruder@example.com", displayName: "Intruder", fullName: null }, env, observed);
    assert.ok(result instanceof Response);
    assert.equal(result.status, 403);
    assert.equal(observed.environmentReads, 1);
    assert.equal(observed.databaseMutations, 0);
    assert.equal(observed.providerRequests, 0);
    assert.equal(observed.costReservations, 0);
  }
});

test("authorized owners pass the guard and existing success behavior remains present", async () => {
  const sentinels = {
    "app/api/projects/route.ts": ["PROJECT_CREATED", "STATUS_ADVANCED", "status: 201"],
    "app/api/projects/[id]/quality/route.ts": ["RUN_GATE", "SET_MODE", "APPROVE_GATE"],
    "app/api/projects/[id]/voice/route.ts": ["GENERATE_SEGMENT", "APPROVE_SEGMENT", "api.elevenlabs.io/v1/text-to-speech"],
    "app/api/projects/[id]/master-v5/route.ts": ["MATERIALIZE_SOUNDSCAPE", "FINALIZE_V5", "COMPLETE_V5_QA"],
  };
  for (const path of Object.keys(targets)) {
    const observed = counters();
    const env = { FACTORY_EXPERT_EMAILS: "owner@example.com" };
    const result = await executeGuard(path, { email: "OWNER@example.com", displayName: "Owner", fullName: null }, env, observed);
    assert.equal(result.user.email, "OWNER@example.com");
    assert.equal(result.env, env);
    for (const sentinel of sentinels[path]) assert.ok(source(path).includes(sentinel), `${path} lost ${sentinel}`);
  }
});

test("registry and baseline resolve exactly the eight M1-02 write identities", () => {
  const registry = JSON.parse(source("governance/registries/http-handlers.json"));
  const baseline = JSON.parse(source("governance/baselines/auth-coverage.json"));
  const registryByIdentity = new Map(registry.handlers.map((entry) => [entry.identity, entry]));
  const baselineIdentities = new Set(baseline.uncoveredHandlers.map((entry) => entry.identity));
  for (const identity of resolvedIdentities) {
    const entry = registryByIdentity.get(identity);
    assert.equal(entry.actor, "CHATGPT_OWNER");
    assert.equal(entry.authentication, "CHATGPT_SIWC");
    assert.equal(entry.authorization, "FACTORY_EXPERT_EMAILS_ALLOWLIST");
    assert.equal(baselineIdentities.has(identity), false);
  }
  assert.equal(baselineIdentities.has("app/api/projects/[id]/master-v5/route.ts#GET"), true);
});
