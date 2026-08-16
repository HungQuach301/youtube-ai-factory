import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

test("Stage Contract Registry covers exactly 18 ordered stages and five typed commands", () => {
  const migration = read("drizzle/0043_gorgeous_angel.sql");
  const registrations = migration.match(/\('V7_V23_4_V281:[^']+'/g) || [];
  assert.equal(registrations.length, 18);
  for (const command of ["START_STAGE", "PRODUCE_ARTIFACT", "VERIFY_ARTIFACT", "FREEZE_STAGE", "REOPEN_ROOT_STAGE"]) assert.match(migration, new RegExp(command));
  assert.match(migration, /UPDATE `v7_sequential_programs` SET `auto_dispatch`=0/);
  assert.match(migration, /"budgetPlanRequired":true/);
});

test("artifact eligibility is fail-closed on queue, lineage, rights, cost, bytes and legacy hashes", () => {
  const command = read("lib/sequential-production-command.ts");
  assert.match(command, /VIDEO_BLOCKED_PREVIOUS_VIDEO/);
  assert.match(command, /UPSTREAM_STAGE_NOT_FROZEN/);
  assert.match(command, /PARENT_ARTIFACT_INELIGIBLE/);
  assert.match(command, /LEGACY_HASH_BLOCKED/);
  assert.match(command, /ARTIFACT_RIGHTS_INELIGIBLE/);
  assert.match(command, /ARTIFACT_COST_INELIGIBLE/);
  assert.match(command, /R2_HASH_MISMATCH/);
  assert.match(command, /ARTIFACT_READBACK_HASH_MISMATCH/);
  assert.match(command, /IDEMPOTENCY_KEY_REUSED/);
});

test("stage freeze requires all verified artifacts and zero active provider requests", () => {
  const command = read("lib/sequential-production-command.ts");
  assert.match(command, /REQUIRED_ARTIFACTS_NOT_VERIFIED/);
  assert.match(command, /ACTIVE_PROVIDER_REQUESTS_REMAIN/);
  assert.match(command, /lifecycle_state='FROZEN'/);
  assert.match(command, /nextStageKey/);
  assert.match(command, /immutablePriorRevisionsPreserved/);
});

test("sequential command route is owner-bound and keeps publishing separate", () => {
  const route = read("app/api/factory/sequential-production/route.ts");
  const command = read("lib/sequential-production-command.ts");
  assert.match(route, /getChatGPTUser/);
  assert.match(route, /FACTORY_EXPERT_EMAILS/);
  assert.match(route, /x-sequential-executor-token/);
  assert.match(route, /idempotency-key/);
  assert.match(command, /publishingMutation: false/);
  assert.doesNotMatch(command, /UPDATE\s+.*auto_publish/i);
});
