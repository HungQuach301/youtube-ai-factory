import assert from "node:assert/strict";
import test from "node:test";
import { canonicalGoldenRootStages, reconcileCanonicalGolden } from "../lib/canonical-production-projection.ts";

const legacy = { state: "READY", masterUrl: "/old.mp4", masterSha256: "old", durationSeconds: 80.245 };
const current = (overrides = {}) => ({
  blueprint: { id: "audience-golden-blueprint:channel-hidden-systems:r20" },
  materialization: { id: "mat-r20", masterHash: "new", masterBytes: 17057292, durationSeconds: 77.1, width: 2560, height: 1440, frameRate: 30, masterUrl: "/current.mp4" },
  factoryVisualQa: { decisionState: "FAIL", overallScore: 89, p0Count: 0, p1Count: 2, p2Count: 2 },
  factoryAudioQa: { decisionState: "PASS", overallScore: 95, p0Count: 0, p1Count: 0, p2Count: 1 },
  browserQa: null, freeze: null, nextAction: "CREATE_REPAIR_REVISION", ...overrides,
});

test("current Audience Golden overrides legacy master and state", () => {
  const result = reconcileCanonicalGolden(legacy, current());
  assert.equal(result.authority, "YOUTUBE_AUDIENCE_GOLDEN");
  assert.equal(result.revision, 20);
  assert.equal(result.masterSha256, "new");
  assert.equal(result.durationSeconds, 77.1);
  assert.equal(result.state, "REPAIR_REQUIRED");
  assert.deepEqual(canonicalGoldenRootStages(result, ["11"]), ["07B", "08", "09"]);
});

test("browser failure owns edit, verification and independent QA stages", () => {
  const result = reconcileCanonicalGolden(legacy, current({ factoryVisualQa: { decisionState: "PASS", overallScore: 94, p0Count: 0, p1Count: 0, p2Count: 1 }, browserQa: { decisionState: "FAIL", overallScore: 88, p0Count: 0, p1Count: 1, p2Count: 1 } }));
  assert.deepEqual(canonicalGoldenRootStages(result, []), ["11", "12", "14"]);
});

test("legacy evidence is only a fallback when no Audience Golden blueprint exists", () => {
  const result = reconcileCanonicalGolden(legacy, null);
  assert.equal(result.authority, "LEGACY_GOLDEN_FALLBACK");
  assert.equal(result.masterSha256, "old");
});
