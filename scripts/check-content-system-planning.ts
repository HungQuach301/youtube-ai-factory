import assert from "node:assert/strict";
import { ContentAutopilotError, compileEpisodeConcepts, parseContentAutopilotBody, planningCostPreview, validateContentAutopilotIdempotencyKey, type PolicyInput } from "../lib/content-autopilot-command";

const policy: PolicyInput = {
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

const apply = parseContentAutopilotBody({ action: "APPLY_POLICY_AND_REBUILD_PLAN", channelId: "channel-hidden-systems", expectedPolicyVersion: 5, expectedRunVersion: 4, policy: { ...policy, cadencePerMonth: 15 } });
assert.equal(apply.action, "APPLY_POLICY_AND_REBUILD_PLAN");
assert.equal(apply.policy?.cadencePerMonth, 15);
for (const cadencePerMonth of [1, 8, 15, 60]) {
  const candidate = { ...policy, cadencePerMonth }, concepts = compileEpisodeConcepts(candidate), costs = planningCostPreview(candidate);
  assert.equal(concepts.length, cadencePerMonth);
  assert.equal(new Set(concepts.map((item) => item.title)).size, cadencePerMonth);
  assert.equal(concepts.every((item, index) => item.sequence === index + 1), true);
  assert.equal(costs.projectedCostUsd, concepts.reduce((total, item) => total + item.estimatedCostUsd, 0));
}
assert.equal(planningCostPreview({ ...policy, cadencePerMonth: 15 }).projectedCostUsd, 293);
assert.equal(planningCostPreview({ ...policy, cadencePerMonth: 15, monthlyBudgetUsd: 100 }).withinBudget, false);

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

console.log("Content System & Planning contract passed: 3 participation modes, 6 commands, exact 1/8/15/60 cadence, budget blocking, version inputs, emergency recovery and authority separation.");
