import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildWave9ExecutionPartitions, providerRecoveryDecision, qualifyWave9ScaleReadiness, runWave9ChaosQualification } from "../lib/wave9-scale-readiness.mjs";

test("full Wave 9 is one logical activation with checkpointed internal partitions", () => {
  const ids = Array.from({ length: 166 }, (_, index) => `MP-${String(index + 1).padStart(3, "0")}`);
  const completed = ids.slice(0, 36);
  const partitions = buildWave9ExecutionPartitions(ids, completed);
  assert.equal(partitions.length, 26);
  assert.equal(partitions.flatMap((item) => item.unitIds).length, 130);
  assert.ok(partitions.every((item) => item.unitIds.length === 5 && item.maxConcurrent === 1));
});

test("provider recovery never creates a replacement while the old response is nonterminal", () => {
  assert.equal(providerRecoveryDecision({ providerStatus: "in_progress", ageMinutes: 5, cancelRequested: false }).action, "POLL_EXISTING");
  assert.equal(providerRecoveryDecision({ providerStatus: "in_progress", ageMinutes: 16, cancelRequested: false }).action, "CANCEL_EXISTING_ONCE");
  assert.equal(providerRecoveryDecision({ providerStatus: "in_progress", ageMinutes: 16, cancelRequested: true }).action, "AWAIT_CANCEL_TERMINAL");
  assert.equal(providerRecoveryDecision({ providerStatus: "completed", ageMinutes: 16, cancelRequested: false }).action, "RECONCILE_TERMINAL");
});

test("scale hardening passes control plane but keeps governor blocked for independent quality evidence", () => {
  const result = qualifyWave9ScaleReadiness({ briefCount: 166, acceptedBaseline: 36, activeRequests: 0, requestCount: 131, uniqueRequestKeys: 131, boundResponseCount: 131, uniqueResponseIds: 131, completedBoundRequests: 130, matchedCompletedUsage: 130, rejectedAuditScore: 27, rejectedAuditStatus: "ENGINE_ROOT_CAUSE_REQUIRED" });
  assert.equal(result.status, "HARDENING_PASS");
  assert.equal(result.scaleGovernor, "BLOCKED_QUALITY_EVIDENCE");
  assert.equal(result.executionPlan.physicalPartitions, 26);
  assert.equal(result.providerRequestsDelta, 0);
});

test("chaos harness covers ten bounded recovery cases", () => {
  const result = runWave9ChaosQualification();
  assert.equal(result.status, "PASS");
  assert.equal(result.total, 10);
});

test("production route exposes one reconcile action and no request 132 path", () => {
  const route = fs.readFileSync(new URL("../app/api/factory/material-production/route.ts", import.meta.url), "utf8");
  assert.match(route, /RECONCILE_AND_QUALIFY_WAVE_9_SCALE_READINESS/);
  assert.match(route, /WAVE_9_SCALE_READINESS_POLICY\.version/);
  assert.match(route, /responses\/\$\{encodeURIComponent\(providerResponseId\)\}\/cancel/);
  assert.doesNotMatch(route, /REQUEST_132|request 132/i);
});
