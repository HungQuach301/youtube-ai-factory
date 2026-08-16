export const SEQUENTIAL_PRODUCTION_CONTRACT = "V7_V23_4_V281" as const;

export type SequentialProductionProjection = {
  contract: typeof SEQUENTIAL_PRODUCTION_CONTRACT;
  channel: { id: string; name: string; market: string; language: string };
  program: {
    state: string;
    mode: "ONE_VIDEO_AT_A_TIME";
    targetVideos: number;
    currentSequence: number;
    completedVideos: number;
    blockedVideos: number;
    overallFloor: number;
    criticalFloor: number;
    dimensionFloor: number;
    p0Tolerance: number;
    p1Tolerance: number;
    maximumRepairLoops: number;
    ownerGate: string;
    autoDispatch: boolean;
    autoPublish: boolean;
  };
  currentVideo: {
    id: string;
    packageId: string;
    sequence: number;
    title: string;
    state: string;
    sourceBriefHash: string;
    priorMasterState: string;
    activeStageKey: string;
    activeStageName: string;
    activeStageState: string;
    nextAction: string;
  };
  stages: Array<{
    key: string;
    sequence: number;
    name: string;
    plane: string;
    state: string;
    gateVersion: string;
    requiredArtifacts: string[];
    evidence: string;
    blocker?: string;
  }>;
  queue: Array<{
    id: string;
    sequence: number;
    title: string;
    state: string;
    active: boolean;
    priorMasterState: string;
    ownerReady: boolean;
  }>;
  architecture: Array<{ version: "V7" | "V23.4" | "V281"; role: string; controls: string[] }>;
  critics: Array<{ name: string; job: string; hardFloor: number }>;
  releaseRules: string[];
  historical: {
    rejectedMasters: number;
    preservedArtifacts: number;
    policy: string;
    reason: string;
  };
  integrity: {
    state: "READY" | "BLOCKED";
    checks: Array<{ label: string; passed: boolean; evidence: string }>;
  };
};
