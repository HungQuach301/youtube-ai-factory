import assert from "node:assert/strict";
import test from "node:test";
import { analyzeActorSource, analyzeAuthSource, analyzeGetWritesSource } from "../scripts/lib/candidate-ci-policy.mjs";

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
