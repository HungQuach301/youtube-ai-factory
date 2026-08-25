import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const routePath = new URL("../app/api/factory/continuity/route.ts", import.meta.url);
const materialRoutePath = new URL("../app/api/factory/material-production/route.ts", import.meta.url);
const statePath = new URL("../docs/continuity/03_CURRENT_STATE.md", import.meta.url);
const migrationPath = new URL("../drizzle/0019_burly_ogun.sql", import.meta.url);

test("continuity endpoint has zero provider-dispatch authority", async () => {
  const source = await readFile(routePath, "utf8");
  assert.doesNotMatch(source, /OPENAI_API_KEY|PEXELS_API_KEY|PIXABAY_API_KEY|SHUTTERSTOCK_CONSUMER_KEY/);
  assert.doesNotMatch(source, /responses\.create|api\.openai\.com|RUN_COMPOSITE_TOURNAMENT|START_PILOT|RESUME_PILOT/);
  assert.match(source, /CAPTURE_CHECKPOINT/);
  assert.match(source, /activeRequests > 0/);
  assert.match(source, /provider_response_id/);
});

test("checkpoint preserves the current R21 and R22 protected scope", async () => {
  const state = await readFile(statePath, "utf8");
  assert.match(state, /R21_AUDIO = PASS 95/);
  assert.match(state, /R21_VISUAL = FAIL 67/);
  assert.match(state, /R21_DISPOSITION = IMMUTABLE_REJECTED_EVIDENCE/);
  assert.match(state, /R22 = DESIGN_ONLY__NOT_DISPATCHED/);
  assert.match(state, /BROWSER = BLOCKED/);
  assert.match(state, /RELEASE = FALSE/);
  assert.match(state, /No document alone authorizes provider dispatch or Production mutation/);
});

test("continuity snapshots have a durable migration", async () => {
  const migration = await readFile(migrationPath, "utf8");
  assert.match(migration, /CREATE TABLE `v7_continuity_snapshots`/);
  assert.match(migration, /`content_hash` text NOT NULL/);
  assert.match(migration, /`active_request_count` integer DEFAULT 0 NOT NULL/);
});

test("idempotency is request-scoped forward without rewriting legacy evidence", async () => {
  const continuity = await readFile(routePath, "utf8");
  const material = await readFile(materialRoutePath, "utf8");
  assert.match(material, /const idempotencyKey = `\$\{operationKey\}:request:\$\{id\}`/);
  assert.match(continuity, /IDEMPOTENCY_FORWARD_UNIQUE/);
  assert.match(continuity, /legacy operation-family collision/);
  assert.doesNotMatch(continuity, /UPDATE v7_material_requests SET idempotency_key/);
});
