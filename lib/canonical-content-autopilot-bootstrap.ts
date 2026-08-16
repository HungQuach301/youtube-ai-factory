import { submitContentAutopilotCommand, type ContentAutopilotDB } from "@/lib/content-autopilot-command";
import { contentPlanningProjection } from "@/lib/content-planning-projection";

export const CANONICAL_CONTENT_AUTOPILOT_BOOTSTRAP_VERSION = "CANONICAL_CONTENT_AUTOPILOT_BOOTSTRAP_V1" as const;
const CHANNEL_ID = "channel-hidden-systems";
type Row = Record<string, unknown>;
async function first(db: ContentAutopilotDB, query: string, ...values: unknown[]) { return ((await db.prepare(query).bind(...values).all<Row>()).results || [])[0] || null; }

export async function activateCanonicalContentAutopilot(db: ContentAutopilotDB, actor: { email: string; displayName: string }) {
  const currentPolicy = await first(db, "SELECT policy_version FROM content_automation_policies WHERE channel_id=? ORDER BY policy_version DESC LIMIT 1", CHANNEL_ID);
  const policyVersion = Number(currentPolicy?.policy_version || 0);
  const policy = policyVersion ? { outcome: "IDEMPOTENT_REPLAY" as const, policyVersion } : await submitContentAutopilotCommand(db, { body: { action: "CONFIGURE_AUTOMATION_POLICY", channelId: CHANNEL_ID, expectedPolicyVersion: 0, expectedRunVersion: 0, policy: { mode: "FULL_AUTOPILOT", dailyBudgetUsd: 25, monthlyBudgetUsd: 500, perVideoCostCeilingUsd: 40, cadencePerMonth: 8, repairLimit: 1, riskTolerance: "LOW", autoProduction: true, autoPublish: false, escalationRules: ["Material strategy change", "Evidence contradiction or readiness below policy", "Legal, safety or unsupported-claim risk", "Cost above the per-video ceiling", "Repair limit exhausted", "Publishing outside approved boundaries"] } }, actor: { ...actor, role: "PORTFOLIO_GOVERNANCE" }, idempotencyKey: "prod.hidden-systems.content-policy.v1" });
  const currentRun = await first(db, "SELECT run_version FROM content_planning_runs WHERE channel_id=? ORDER BY run_version DESC LIMIT 1", CHANNEL_ID), expectedRunVersion = Number(currentRun?.run_version || 0);
  const run = expectedRunVersion ? { outcome: "IDEMPOTENT_REPLAY" as const } : await submitContentAutopilotCommand(db, { body: { action: "RUN_CONTENT_AUTOPILOT", channelId: CHANNEL_ID, expectedPolicyVersion: policy.policyVersion, expectedRunVersion: 0 }, actor: { ...actor, role: "PORTFOLIO_GOVERNANCE" }, idempotencyKey: "prod.hidden-systems.content-run.v1" });
  const projection = await contentPlanningProjection(CHANNEL_ID, db);
  return { contract: CANONICAL_CONTENT_AUTOPILOT_BOOTSTRAP_VERSION, outcome: "CONTENT_SYSTEM_PLANNING_ACTIVE", policy: { outcome: policy.outcome, mode: projection.policy.mode, state: projection.policy.state, version: projection.policy.version }, run: { outcome: run.outcome, state: projection.run.state, version: projection.run.version }, content: { pillars: projection.summary.pillars, series: projection.summary.series, opportunities: projection.summary.opportunities, planned: projection.summary.planned, briefsReady: projection.summary.briefsReady, openExceptions: projection.summary.openExceptions }, handoff: projection.handoff, authority: { actor: actor.email, systemActor: "SYSTEM_AUTOPILOT", providerRequests: 0, spendUsd: 0, channelStrategyMutation: false, providerDispatch: false, productionMutation: false, publishingMutation: false } };
}
