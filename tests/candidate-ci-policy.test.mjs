import assert from "node:assert/strict";
import test from "node:test";
import { analyzeActorSource, analyzeAuthSource, analyzeGetWritesSource, collectRouteHandlers, handlerId, routePath, validateHandlerRegistry } from "../scripts/lib/candidate-ci-policy.mjs";

const uncovered = (source) => analyzeAuthSource(source).filter((handler) => !handler.covered).map((handler) => handler.identity);

test("an auth import alone cannot cover an exported handler", () => {
  const source = `
    import { requireOwnerAuth } from "./auth";
    export async function POST(request: Request) {
      return Response.json({ ok: true });
    }
  `;
  assert.deepEqual(uncovered(source), ["app/api/example/route.ts#POST"]);
});

test("an auth comment cannot cover an exported handler", () => {
  const source = `
    export async function POST(request: Request) {
      // requireOwnerAuth(request) and reject unauthorized callers
      return Response.json({ ok: true });
    }
  `;
  assert.deepEqual(uncovered(source), ["app/api/example/route.ts#POST"]);
});

test("a token environment-variable name cannot cover an exported handler", () => {
  const source = `
    type Env = { OWNER_AUTH_TOKEN?: string };
    export async function POST(request: Request) {
      const tokenName = "OWNER_AUTH_TOKEN";
      return Response.json({ tokenName });
    }
  `;
  assert.deepEqual(uncovered(source), ["app/api/example/route.ts#POST"]);
});

test("auth in a different handler cannot cover the unguarded handler", () => {
  const source = `
    async function authorized(request: Request) {
      if (!await secretMatches(request.headers.get("authorization") || "", "expected")) {
        throw new Error("UNAUTHORIZED 401");
      }
      return { actor: "owner" };
    }
    export async function GET(request: Request) {
      await authorized(request);
      return Response.json({ ok: true });
    }
    export async function POST(request: Request) {
      return Response.json({ ok: true });
    }
  `;
  assert.deepEqual(uncovered(source), ["app/api/example/route.ts#POST"]);
});

test("a called no-op helper with an auth-like name cannot cover a handler", () => {
  const source = `
    async function authorized(_request: Request) { return { actor: "owner" }; }
    export async function POST(request: Request) {
      await authorized(request);
      return Response.json({ ok: true });
    }
  `;
  assert.deepEqual(uncovered(source), ["app/api/example/route.ts#POST"]);
});

test("an exact token comparison plus denial covers the same automation handler", () => {
  const source = `
    export async function POST(request: Request) {
      if (!await secretMatches(request.headers.get("authorization") || "", env.AUTOMATION_TOKEN || "")) {
        return Response.json({ error: "AUTHORIZATION_REQUIRED" }, { status: 401 });
      }
      return Response.json({ ok: true });
    }
  `;
  assert.deepEqual(uncovered(source), []);
});

test("GET write analysis follows a directly invoked project-owned helper", () => {
  const source = `
    async function snapshot() {
      await db.prepare("INSERT INTO audit_rows (id) VALUES (?)").bind("1").run();
      return {};
    }
    export async function GET() { return Response.json(await snapshot()); }
  `;
  const debt = analyzeGetWritesSource(source);
  assert.equal(debt.length, 1);
  assert.match(debt[0].evidence.join("\n"), /snapshot:SQL:INSERT_INTO/);
});

test("a prohibited command literal requires exact AGENT denial evidence", () => {
  const source = `
    export async function POST(request: Request) {
      const action = (await request.json()).action;
      if (action === "PUBLISH_VIDEO") return Response.json({ ok: true });
      return Response.json({ ok: false });
    }
  `;
  assert.deepEqual(analyzeActorSource(source).map((item) => item.command), ["PUBLISH_VIDEO"]);
});

test("comments cannot invent a prohibited command", () => {
  const source = `
    export async function POST(request: Request) {
      // PUBLISH_VIDEO is intentionally not implemented.
      return Response.json({ ok: false });
    }
  `;
  assert.deepEqual(analyzeActorSource(source), []);
});

function registryEntry(sourceFile, method) {
  return {
    identity: handlerId(sourceFile, method), sourceFile, routePath: routePath(sourceFile), method,
    readWrite: ["GET", "HEAD", "OPTIONS"].includes(method) ? "READ" : "WRITE",
    actor: "CHATGPT_OWNER", authentication: "NONE", authorization: "NONE",
    audit: "NONE_PROVEN", status: "GAP_AUTHENTICATION", remediationWp: "M1-03",
  };
}

function registryHandlers(source, path = "app/api/example/route.ts") {
  return collectRouteHandlers(source, path).map((handler) => ({ identity: handlerId(path, handler.method) }));
}

test("handler registry rejects a newly exported handler with no entry", () => {
  const handlers = registryHandlers("export async function GET() {} export async function POST() {}");
  const registry = { version: 1, identityKey: "sourceFile#method", handlers: [registryEntry("app/api/example/route.ts", "GET")] };
  assert.throws(() => validateHandlerRegistry(registry, handlers), /missing from registry/);
});

test("handler registry rejects an orphan entry", () => {
  const handlers = registryHandlers("export async function GET() {}");
  const registry = { version: 1, identityKey: "sourceFile#method", handlers: [registryEntry("app/api/example/route.ts", "GET"), registryEntry("app/api/example/route.ts", "POST")] };
  assert.throws(() => validateHandlerRegistry(registry, handlers), /Orphan handler registry entries/);
});

test("handler registry rejects method/file identity mismatch", () => {
  const entry = registryEntry("app/api/example/route.ts", "GET");
  entry.sourceFile = "app/api/other/route.ts";
  const registry = { version: 1, identityKey: "sourceFile#method", handlers: [entry] };
  assert.throws(() => validateHandlerRegistry(registry, []), /method\/file mismatch/);
});

test("imports, comments, strings, token names, and unexported helpers do not create handler entries", () => {
  const source = `
    import { POST as importedPost } from "./other";
    // export async function PUT() {}
    const tokenName = "DELETE";
    async function PATCH() {}
    export const GET = async () => Response.json({ importedPost, tokenName });
  `;
  assert.deepEqual(collectRouteHandlers(source).map((handler) => handler.method), ["GET"]);
});

test("named aliases and exported handler variables are counted structurally", () => {
  const source = `
    async function readHandler() { return Response.json({ ok: true }); }
    const writeHandler = async () => Response.json({ ok: true });
    export { readHandler as GET };
    export const POST = writeHandler;
  `;
  assert.deepEqual(collectRouteHandlers(source).map((handler) => handler.method), ["GET", "POST"]);
});
