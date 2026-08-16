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
  assert.match(projection, /Chỉ một video đang được phép chạy/);
  assert.match(projection, /Video N\+1 không được chạy trước/);
  assert.match(workspace, /Làm thật tốt video hiện tại trước khi mở video tiếp theo/);
  assert.match(workspace, /Tám vai trò đánh giá độc lập/);
  assert.match(workspace, /Không nhầm “đã từng làm” với “đã hoàn tất”/);
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
  assert.match(projection, /Stage 00–08/);
  assert.match(projection, /Stage 09–13/);
  assert.match(projection, /Không dùng lại source bytes, frame, candidate, binding, hash hoặc master cũ/);
  assert.match(workspace, /Không dùng dữ liệu cũ để đánh dấu hoàn tất/);
  assert.match(workspace, /D1 quyết định trạng thái; R2 giữ bytes thật; Google Drive là kho lưu trữ lâu dài/);
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
  assert.match(projection, /P0=0 và không còn P1 trọng yếu/);
  assert.match(projection, /Chỉ revision master mới, bất biến mới được chấm lại/);
  assert.match(projection, /ba mẫu thời gian cho mỗi cảnh biên tập/i);
});
