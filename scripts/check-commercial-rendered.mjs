import { pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";

const workerUrl = pathToFileURL(`${process.cwd()}/dist/server/index.js`);
workerUrl.searchParams.set("commercial-rendered-check", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);
const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
const ctx = { waitUntil() {}, passThroughOnException() {} };

const pageRoutes = ["/", "/market-intelligence", "/niche-discovery", "/channel-studio"];
const recoveryRoutes = [
  "/api/factory/portfolio",
  "/api/factory/discovery",
  "/api/factory/channel-studio",
  "/api/factory/channels/nonexistent",
];

function count(source, pattern) { return [...source.matchAll(pattern)].length; }
function assert(condition, message) { if (!condition) throw new Error(message); }

const timings = [];
for (const route of pageRoutes) {
  const started = performance.now();
  const response = await worker.fetch(new Request(`http://localhost${route}`, { headers: { accept: "text/html" } }), env, ctx);
  timings.push({ route, milliseconds: performance.now() - started });
  const html = await response.text();
  assert(response.status === 200, `${route} must render HTTP 200`);
  assert(/^text\/html\b/i.test(response.headers.get("content-type") || ""), `${route} must render HTML`);
  assert(/<html[^>]*\blang="en"/i.test(html), `${route} must declare document language`);
  assert(/<title>AI Factory — Multi-channel YouTube Operations<\/title>/i.test(html), `${route} must render the canonical title`);
  assert(count(html, /<main\b/gi) === 1, `${route} must render exactly one main landmark`);
  assert(html.includes('id="main-content"'), `${route} must render the skip-link target`);
  assert(html.includes('href="#main-content"'), `${route} must render a skip link`);
  assert(count(html, /aria-current="page"/gi) === 1, `${route} must expose one active navigation item`);
  assert(count(html, /<h1\b/gi) >= 1, `${route} must render an H1 during loading`);
  assert(html.includes('role="status"') && html.includes('aria-busy="true"'), `${route} must expose an assistive loading state`);
  assert(!/tabindex="[1-9]\d*"/i.test(html), `${route} must not use positive tabindex`);
  const ids = [...html.matchAll(/\sid="([^"]+)"/gi)].map((match) => match[1]);
  assert(new Set(ids).size === ids.length, `${route} must not render duplicate ids`);
}

for (const route of recoveryRoutes) {
  const response = await worker.fetch(new Request(`http://localhost${route}`, { headers: { accept: "application/json" } }), env, ctx);
  const payload = await response.json();
  assert(response.status === 503, `${route} must fail closed without canonical bindings`);
  assert(/^application\/json\b/i.test(response.headers.get("content-type") || ""), `${route} must return JSON recovery state`);
  assert(response.headers.get("cache-control") === "no-store", `${route} recovery response must be no-store`);
  assert(payload.fallback === false, `${route} must prohibit fallback data`);
  assert(typeof payload.error === "string" && payload.error.length > 0, `${route} must return an explicit recovery reason`);
}

const unauthenticatedDecision = await worker.fetch(new Request("http://localhost/api/factory/niche-decisions", { method: "POST", headers: { accept: "application/json", "content-type": "application/json", "idempotency-key": "rendered-check:001" }, body: "{}" }), env, ctx);
const unauthenticatedDecisionPayload = await unauthenticatedDecision.json();
assert(unauthenticatedDecision.status === 401, "niche decision command must reject a missing SIWC identity");
assert(unauthenticatedDecision.headers.get("cache-control") === "no-store", "niche decision authentication failure must be no-store");
assert(unauthenticatedDecisionPayload.error?.code === "SIWC_AUTHENTICATION_REQUIRED", "niche decision command must expose a typed authentication failure");
assert(unauthenticatedDecisionPayload.providerRequests === 0 && unauthenticatedDecisionPayload.spendUsd === 0, "niche decision authentication failure must remain zero-spend");

const unauthenticatedHypothesis = await worker.fetch(new Request("http://localhost/api/factory/niche-hypotheses", { method: "POST", headers: { accept: "application/json", "content-type": "application/json", "idempotency-key": "rendered-hypothesis:001" }, body: "{}" }), env, ctx);
const unauthenticatedHypothesisPayload = await unauthenticatedHypothesis.json();
assert(unauthenticatedHypothesis.status === 401, "niche hypothesis command must reject a missing SIWC identity");
assert(unauthenticatedHypothesis.headers.get("cache-control") === "no-store", "niche hypothesis authentication failure must be no-store");
assert(unauthenticatedHypothesisPayload.error?.code === "SIWC_AUTHENTICATION_REQUIRED", "niche hypothesis command must expose a typed authentication failure");
assert(unauthenticatedHypothesisPayload.providerRequests === 0 && unauthenticatedHypothesisPayload.spendUsd === 0, "niche hypothesis authentication failure must remain zero-spend");

const unauthenticatedEvidence = await worker.fetch(new Request("http://localhost/api/factory/niche-evidence", { method: "POST", headers: { accept: "application/json", "content-type": "application/json", "idempotency-key": "rendered-evidence:001" }, body: "{}" }), env, ctx);
const unauthenticatedEvidencePayload = await unauthenticatedEvidence.json();
assert(unauthenticatedEvidence.status === 401, "niche evidence command must reject a missing SIWC identity");
assert(unauthenticatedEvidence.headers.get("cache-control") === "no-store", "niche evidence authentication failure must be no-store");
assert(unauthenticatedEvidencePayload.error?.code === "SIWC_AUTHENTICATION_REQUIRED", "niche evidence command must expose a typed authentication failure");
assert(unauthenticatedEvidencePayload.providerRequests === 0 && unauthenticatedEvidencePayload.spendUsd === 0, "niche evidence authentication failure must remain zero-spend");

const slowest = timings.reduce((current, item) => item.milliseconds > current.milliseconds ? item : current);
assert(slowest.milliseconds <= 500, `${slowest.route} server-render ${slowest.milliseconds.toFixed(1)}ms exceeds the 500ms lab budget`);
console.log(`Commercial rendered contract passed ${pageRoutes.length} pages, ${recoveryRoutes.length} fail-closed read APIs and 3 SIWC-protected zero-spend commands; slowest server render ${slowest.route} ${slowest.milliseconds.toFixed(1)}ms/500ms.`);
