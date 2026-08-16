export const PRODUCTION_ENGINE_V2 = "PRODUCTION_ENGINE_V2_GREENFIELD" as const;

export type ProductionV2State =
  | "PRODUCTION_PACKAGE_COMPILED"
  | "PILOT_READY"
  | "PILOT_RUNNING"
  | "PILOT_PASSED"
  | "CANARY_RUNNING"
  | "QA1_REQUIRED"
  | "REPAIR_REQUIRED"
  | "QA2_REQUIRED"
  | "READY_FOR_PUBLISHING"
  | "BLOCKED";

export type ProductionV2Package = {
  id: string;
  sequence: number;
  title: string;
  state: ProductionV2State;
  targetDurationSeconds: number;
  shotCount: number;
  validShotContracts: number;
  artifacts: number;
  qaAssessments: number;
  providerRequests: number;
  failedProviderRequests: number;
  spendUsd: number;
  traceabilityComplete: boolean;
  legacySourceCount: number;
  engineVersion: string;
  masterArtifactId?: string;
};

export type ProductionV2Projection = {
  contract: typeof PRODUCTION_ENGINE_V2;
  channel: { id: string; name: string; market: string; language: string };
  policy: {
    version: number;
    state: string;
    mode: string;
    dailyBudgetUsd: number;
    monthlyBudgetUsd: number;
    perVideoBudgetUsd: number;
    maxRemoteRequests: number;
    maxRepairAttempts: number;
    autoDispatch: boolean;
    autoPublish: boolean;
    legacyReusePolicy: string;
  };
  summary: {
    targetVideos: number;
    packagesCompiled: number;
    shotContracts: number;
    validShotContracts: number;
    videosReady: number;
    openExceptions: number;
    providerRequests: number;
    failedProviderRequests: number;
    activeProviderRequests: number;
    spendUsd: number;
    legacySources: number;
  };
  checkpoints: Array<{
    number: number;
    label: string;
    state: "COMPLETE" | "ACTIVE" | "BLOCKED";
    evidence: string;
  }>;
  scaleWaves: Array<{
    number: number;
    state: string;
    packageCount: number;
    completedCount: number;
    p0Count: number;
    p1Rate: number;
    duplicateRate: number;
    providerFailureRate: number;
    costVarianceRate: number;
  }>;
  packages: ProductionV2Package[];
  integrity: {
    state: "READY" | "BLOCKED";
    checks: Array<{ id: string; label: string; passed: boolean; evidence: string }>;
    nextAction: string;
  };
};
