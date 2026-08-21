import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

test("V7 V23.4 V281 control plane is an exclusive per-video state machine", () => {
  const contract = read("app/production-control-contract.ts");
  const projection = read("lib/sequential-production-projection.ts");
  const workspace = read("app/video-engine/production-engine-workspace.tsx");
  assert.match(contract, /V7_V23_4_V281/);
  assert.match(contract, /ONE_VIDEO_AT_A_TIME/);
  assert.match(projection, /Exactly one video has an active lease/);
  assert.match(projection, /Video N\+1 cannot run before/);
  assert.match(workspace, /Verify the WP7 failure corpus/);
  assert.match(projection, /v7_evaluation_candidates/);
  assert.match(workspace, /Eight schemas bind the full operating loop/);
  assert.match(projection, /v7_learning_ready_contract_registry/);
  assert.match(workspace, /Capability Registry/);
  assert.match(workspace, /Eight independent critic roles/);
  assert.match(workspace, /18 stages grouped into five dependency phases/);
  assert.match(projection, /NEW_EPISODE_ARTIFACTS/);
  assert.match(projection, /PROHIBITED_INPUTS/);
  assert.doesNotMatch(workspace, /15 completed videos are ready/);
});

test("stage history is separated from new-video completion and legacy data eligibility", () => {
  const contract = read("app/production-control-contract.ts");
  const projection = read("lib/sequential-production-projection.ts");
  const workspace = read("app/video-engine/production-engine-workspace.tsx");
  assert.match(contract, /FOUNDATION_AVAILABLE/);
  assert.match(contract, /OWNER_REJECTED/);
  assert.match(projection, /Stages 00–08/);
  assert.match(projection, /Stages 09–13/);
  assert.match(projection, /Do not reuse old source bytes, frames, candidates, bindings, hashes, or masters/);
  assert.match(workspace, /Old data never marks a stage complete/);
  assert.match(workspace, /D1 decides state, R2 holds real bytes, and Google Drive provides the long-term archive/);
});

test("migration rejects prior masters without deleting their immutable artifacts", () => {
  const migration = read("drizzle/0042_flashy_black_tarantula.sql");
  assert.match(migration, /UPDATE `production_v2_packages`[\s\S]*lifecycle_state='REJECTED_QUALITY'/);
  assert.match(migration, /BLOCKED_PREVIOUS_VIDEO/);
  assert.match(migration, /WHERE q\.program_id='YTAF-V7-SEQUENTIAL' AND q\.sequence=1/);
  assert.match(migration, /Eight-critic full-master assurance/);
  assert.doesNotMatch(migration, /DELETE FROM `production_v2_artifacts`/);
});

test("release firewall preserves V7 quality floors and bounded root-cause repair", () => {
  const migration = read("drizzle/0042_flashy_black_tarantula.sql");
  const projection = read("lib/sequential-production-projection.ts");
  assert.match(migration, /15,1,92,90,86,0,0,2/);
  assert.match(projection, /P0=0 and no unresolved material P1/);
  assert.match(projection, /Only a new immutable master revision may be rescored/);
  assert.match(projection, /three temporal samples for every editorial shot/i);
});
