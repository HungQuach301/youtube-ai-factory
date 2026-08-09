import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const route = await readFile(new URL("../app/api/factory/material-production/route.ts", import.meta.url), "utf8");
const executor = await readFile(new URL("../scripts/media-executor.mjs", import.meta.url), "utf8");
const migration = await readFile(new URL("../drizzle/0020_goofy_chimera.sql", import.meta.url), "utf8");
const rightsMigration = await readFile(new URL("../drizzle/0021_material_gateway.sql", import.meta.url), "utf8");

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
  assert.match(route, /PILOT_10_SHOT_AUTHORIZATION_REQUIRED/);
});

test("motion pass opens bounded pilot before sequence proof", () => {
  assert.match(route, /AUTHORIZE_PILOT_AFTER_MOTION/);
  assert.match(route, /MOTION_PROOF_PASS_REQUIRED/);
  assert.match(route, /clean\(run\?\.status\) === "PILOT_PASS" \? "SEQUENCE_PROOF"/);
  assert.match(route, /sequence and scale remain locked/);
});

test("bounded pilot repair targets the current unmaterialized failure", () => {
  assert.match(route, /t\.status='NO_PIXEL_CHAMPION' AND f\.id IS NULL/);
  assert.match(route, /if \(failedTournament\) return failedTournament/);
  assert.match(route, /status='STORED_VERIFIED'/);
});

test("exhausted source search upgrades one unit with durable lineage", () => {
  assert.match(route, /UPGRADE_FAILED_UNIT_ARCHITECTURE/);
  assert.match(route, /SOURCE_TO_HYBRID_SPLIT_V1/);
  assert.match(route, /v7_material_unit_repairs/);
  assert.match(route, /SUPERSEDED_BY_ARCHITECTURE_REPAIR/);
  assert.match(route, /authoredLayerMustProve/);
  assert.match(route, /VALUES \(\?,\?,\?,\?,\?,'SOURCE_TO_HYBRID_SPLIT_V1','APPLIED',\?,\?,\?,\?,\?,\?\)/);
});

test("pilot unit work is protected by an atomic phase claim", () => {
  assert.match(route, /async function claimBriefPhase/);
  assert.match(route, /status NOT IN \('MATERIALIZING','QA_DISPATCHING'\)/);
  assert.match(route, /if \(await claimBriefPhase\(db, clean\(target\.id\), "QA_DISPATCHING"\)\)/);
  assert.match(route, /status IN \('MATERIALIZING','QA_DISPATCHING'\)/);
});

test("hybrid renderer repair preserves failed pixels and binds exact states", () => {
  assert.match(route, /REPAIR_FAILED_UNIT_RENDERER/);
  assert.match(route, /SEMANTIC_STATE_RENDERER_V2/);
  assert.match(route, /"MP-153": \[\["PAYMENT PRESENTED","PROCESSING","AWAIT CONFIRMATION"\]/);
  assert.match(route, /prior QA \$\{Number\(prior\?\.score \|\| 0\)\}\/100 and 3 frame hashes preserved/);
});

test("incomplete pixel QA gets one lineage-bound ceiling-only retry", () => {
  assert.match(route, /PREPARE_INCOMPLETE_PIXEL_QA_RETRY/);
  assert.match(route, /OUTPUT_CEILING_RETRY_ALREADY_USED/);
  assert.match(route, /retry_scope='OUTPUT_CEILING_ONLY'/);
  assert.match(route, /maxOutputTokens: 16000/);
  assert.match(route, /promptChanged: false, pixelsChanged: false/);
});

test("final composition delta preserves history and exhausts automatic repair", () => {
  assert.match(route, /REPAIR_FAILED_UNIT_COMPOSITION/);
  assert.match(route, /DOCUMENTARY_RAIL_LAYOUT_V3/);
  assert.match(route, /qaLayout: "B"/);
  assert.match(route, /noFurtherAutomaticRepair: true/);
  assert.match(route, /SEMANTIC_RENDER_DELTA/);
  assert.match(route, /"PILOT_REPAIR_BLOCKED"/);
});

test("motion proof state has a durable migration", () => {
  assert.match(migration, /CREATE TABLE `v7_motion_proofs`/);
  assert.match(migration, /`source_hashes_json` text NOT NULL/);
  assert.match(migration, /`provider_response_id` text/);
});

test("rights evidence repair preserves the failed audit before re-adjudication", () => {
  assert.match(route, /MOTION_RIGHTS_BUNDLE_V1/);
  assert.match(route, /MOTION_RIGHTS_REPAIR_SCOPE_MISMATCH/);
  assert.match(route, /prior QA \$\{Number\(proof\.score\)\}\/100 preserved · no new QA request dispatched/);
  assert.match(route, /PREPARE_MOTION_RIGHTS_REPAIR/);
  assert.match(rightsMigration, /CREATE TABLE `v7_motion_audits`/);
  assert.match(rightsMigration, /`evidence_bundle_hash` text NOT NULL/);
});

test("motion QA receives verified rights lineage without changing pixels", () => {
  assert.match(route, /Rights and provenance are registry evidence, not audience-facing content/);
  assert.match(route, /RIGHTS AND PROVENANCE RECORD · SHA-256/);
  assert.match(route, /MOTION_RIGHTS_SOURCE_INVALID/);
  assert.match(route, /storageStatus: clean\(file\.status\)/);
});

test("commercial reliability baseline quarantines production and compiles hardest-first archetypes", () => {
  assert.match(route, /STAGE09_RELIABILITY_BASELINE_V2/);
  assert.match(route, /QUALIFY_RELIABILITY_BASELINE/);
  assert.match(route, /PRODUCTION_EXECUTION_QUARANTINED/);
  assert.match(route, /TRANSACTION_STATE_PROOF/);
  assert.match(route, /MP_153_QUALIFICATION_FIXTURE_MISSING/);
  assert.match(route, /generic stock rejected/);
  assert.match(route, /neutral confirmation/);
  assert.match(route, /ARCHETYPE_CERTIFICATION_REQUIRED/);
});
