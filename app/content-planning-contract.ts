export type AutomationMode = "FULL_AUTOPILOT" | "EXCEPTIONS_ONLY" | "EXPERT_REVIEW";
export type AutomationState = "ACTIVE" | "PAUSED" | "EMERGENCY_STOPPED" | "STALE" | "NOT_CONFIGURED";

export type ContentPlanningProjection = {
  contract: "CONTENT_SYSTEM_PLANNING_PROJECTION_V1";
  generatedAt: string;
  channelId: string;
  strategy: { state: "ACTIVE" | "STALE" | "MISSING"; activationId: string | null; version: number; niche: string | null; viewerPromise: string | null };
  policy: {
    state: AutomationState;
    id: string | null;
    version: number;
    mode: AutomationMode | null;
    dailyBudgetUsd: number;
    monthlyBudgetUsd: number;
    perVideoCostCeilingUsd: number;
    cadencePerMonth: number;
    repairLimit: number;
    riskTolerance: "LOW" | "MEDIUM" | "HIGH";
    autoProduction: boolean;
    autoPublish: boolean;
    escalationRules: string[];
    configuredBy: string | null;
    configuredAt: string | null;
  };
  run: { state: "NOT_RUN" | "COMPLETE" | "STALE" | "BLOCKED"; id: string | null; version: number; horizonDays: number; actorType: "SYSTEM_AUTOPILOT" | null; providerRequests: number; spendUsd: number; createdAt: string | null };
  pillars: Array<{ id: string; position: number; title: string; purpose: string; audienceNeed: string; differentiation: string; evidenceRequirement: string; winningCriteria: string[]; state: string }>;
  series: Array<{ id: string; pillarId: string; position: number; title: string; format: string; repeatablePromise: string; cadenceWeight: number; state: string }>;
  opportunities: Array<{ id: string; seriesId: string; systemRank: number; title: string; audienceProblem: string; coreQuestion: string; evidenceRefs: string[]; axes: { strategyFit: number; audienceDemand: number; differentiation: number; evidenceReadiness: number }; productionComplexity: string; estimatedCostUsd: number; state: string; rationale: string }>;
  editorialPlan: { id: string | null; version: number; horizonDays: number; cadencePerMonth: number; state: "NOT_CREATED" | "AUTO_APPROVED" | "REVIEW_REQUIRED" | "STALE"; rationale: string | null; items: Array<{ id: string; sequence: number; publishOffsetDays: number; opportunityId: string; title: string; state: string }> };
  briefs: Array<{ id: string; opportunityId: string; title: string; version: number; viewerPayoff: string; hook: string; narrativeStructure: string[]; claims: string[]; evidenceRequirements: string[]; visualOpportunities: string[]; riskControls: string[]; targetDurationSeconds: number; costCeilingUsd: number; state: string }>;
  exceptions: Array<{ id: string; type: string; severity: string; state: string; title: string; detail: string; owningAuthority: string; resolution: string | null; createdAt: string }>;
  audit: Array<{ id: string; entityType: string; entityId: string; eventType: string; actorType: string; policyVersion: number; strategyVersion: number; createdAt: string }>;
  summary: { pillars: number; series: number; opportunities: number; planned: number; briefsReady: number; openExceptions: number; providerRequests: number; spendUsd: number };
  handoff: { state: "READY_FOR_PRODUCTION" | "PLANNING_REQUIRED" | "POLICY_REQUIRED" | "STRATEGY_REQUIRED" | "PAUSED"; eligibleBriefs: number; productionDispatchAuthorized: boolean; publishingAuthorized: boolean; blockers: string[] };
  integrity: { state: "READY" | "RECONCILIATION_REQUIRED"; notes: string[] };
};

export type ContentAutopilotReceipt = {
  contract: "CONTENT_AUTOPILOT_COMMAND_V1";
  outcome: "RECORDED" | "IDEMPOTENT_REPLAY";
  action: "CONFIGURE_AUTOMATION_POLICY" | "RUN_CONTENT_AUTOPILOT" | "PAUSE_AUTOPILOT" | "RESUME_AUTOPILOT" | "EMERGENCY_STOP";
  channelId: string;
  policyVersion: number;
  runVersion: number;
  state: string;
  authority: { actor: string; systemActor: "SYSTEM_AUTOPILOT"; providerRequests: 0; spendUsd: 0; channelStrategyMutation: false; providerDispatch: false; productionMutation: false; publishingMutation: false };
};
