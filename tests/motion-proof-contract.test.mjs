import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const route = await readFile(new URL("../app/api/factory/material-production/route.ts", import.meta.url), "utf8");
const executor = await readFile(new URL("../scripts/media-executor.mjs", import.meta.url), "utf8");
const migration = await readFile(new URL("../drizzle/0020_goofy_chimera.sql", import.meta.url), "utf8");

test("motion proof is gated by frozen continuity and champion C", () => {
  assert.match(route, /checkpoint_code='CONTINUITY_HARDENING_01'/);
  assert.match(route, /lifecycle_state !== "FROZEN"/);
  assert.match(route, /status='PASS' AND winner='C'/);
  assert.match(route, /CHAMPION_C_NOT_AUTHORIZED_FOR_MOTION/);
});

test("motion renderer uses exact immutable sources and no audio", () => {
  assert.match(route, /sourceHashesMustMatch: true/);
  assert.match(route, /exactSourceCount: 3/);
  assert.match(route, /audio: "NONE"/);
  assert.match(executor, /libvpx-vp9/);
  assert.match(executor, /COMPLETE_MOTION_PROOF/);
});

test("chat-run executor uses a one-time exact-job capability", () => {
  assert.match(route, /CLAIM_EXACT_MOTION_JOB_ONCE/);
  assert.match(route, /MOTION_BOOTSTRAP_UNAUTHORIZED/);
  assert.match(route, /delete contract\.bootstrap/);
  assert.match(executor, /MOTION_EXECUTOR_BOOTSTRAP_TOKEN/);
  assert.match(executor, /CLAIM_MOTION_JOB/);
});

test("motion QA is one bounded ledgered request", () => {
  assert.match(route, /"MOTION_PROOF_QA"/);
  assert.match(route, /max_output_tokens: 4000/);
  assert.match(route, /MOTION_QA_PROVIDER_INCOMPLETE/);
  assert.match(route, /30_SECOND_SEQUENCE_PROOF_REQUIRED/);
});

test("motion proof state has a durable migration", () => {
  assert.match(migration, /CREATE TABLE `v7_motion_proofs`/);
  assert.match(migration, /`source_hashes_json` text NOT NULL/);
  assert.match(migration, /`provider_response_id` text/);
});
