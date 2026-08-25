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

test("checkpoint preserves Stage 09 protected scope", async () => {
  const state = await readFile(statePath, "utf8");
  assert.match(state, /STAGE_09 = MOTION_PROOF_REQUIRED/);
  assert.match(state, /CHAMPION = C/);
  assert.match(state, /STAGE_09_FROZEN = FALSE/);
  assert.match(state, /Do not rerun source discovery/);
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
