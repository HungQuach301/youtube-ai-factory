import assert from "node:assert/strict";
import { ContentAutopilotError, parseContentAutopilotBody, validateContentAutopilotIdempotencyKey } from "../lib/content-autopilot-command";

const policy = {
  mode: "FULL_AUTOPILOT",
  dailyBudgetUsd: 25,
  monthlyBudgetUsd: 500,
  perVideoCostCeilingUsd: 40,
  cadencePerMonth: 8,
  repairLimit: 1,
  riskTolerance: "LOW",
  autoProduction: true,
  autoPublish: false,
  escalationRules: ["Material strategy change", "Evidence contradiction", "Cost above policy ceiling"],
};

const configured = parseContentAutopilotBody({ action: "configure_automation_policy", channelId: "channel-hidden-systems", expectedPolicyVersion: 0, expectedRunVersion: 0, policy });
assert.equal(configured.action, "CONFIGURE_AUTOMATION_POLICY");
assert.equal(configured.policy?.mode, "FULL_AUTOPILOT");
assert.equal(configured.policy?.autoProduction, true);
assert.equal(configured.policy?.autoPublish, false);
assert.equal(configured.policy?.cadencePerMonth, 8);

for (const action of ["RUN_CONTENT_AUTOPILOT", "PAUSE_AUTOPILOT", "RESUME_AUTOPILOT", "EMERGENCY_STOP"] as const) {
  assert.equal(parseContentAutopilotBody({ action, channelId: "channel-hidden-systems", expectedPolicyVersion: 1, expectedRunVersion: 1 }).action, action);
}

for (const mode of ["EXCEPTIONS_ONLY", "EXPERT_REVIEW"] as const) {
  assert.equal(parseContentAutopilotBody({ action: "CONFIGURE_AUTOMATION_POLICY", channelId: "channel-hidden-systems", expectedPolicyVersion: 1, expectedRunVersion: 1, policy: { ...policy, mode } }).policy?.mode, mode);
}

assert.throws(
  () => parseContentAutopilotBody({ action: "CONFIGURE_AUTOMATION_POLICY", channelId: "channel-hidden-systems", expectedPolicyVersion: 0, expectedRunVersion: 0, policy: { ...policy, autoProduction: false, autoPublish: true } }),
  (error: unknown) => error instanceof ContentAutopilotError && error.code === "COMMAND_VALIDATION_FAILED",
);
assert.throws(
  () => parseContentAutopilotBody({ action: "CONFIGURE_AUTOMATION_POLICY", channelId: "channel-hidden-systems", expectedPolicyVersion: 0, expectedRunVersion: 0, policy: { ...policy, mode: "UNBOUNDED" } }),
  (error: unknown) => error instanceof ContentAutopilotError && error.code === "COMMAND_VALIDATION_FAILED",
);
assert.equal(validateContentAutopilotIdempotencyKey("prod.hidden-systems.content-run.v1"), "prod.hidden-systems.content-run.v1");
assert.throws(() => validateContentAutopilotIdempotencyKey("short"), ContentAutopilotError);

console.log("Content System & Planning contract passed: 3 participation modes, 5 commands, version inputs, emergency recovery and production/publishing authority separation.");
