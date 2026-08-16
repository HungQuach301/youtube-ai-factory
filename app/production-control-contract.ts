export const SEQUENTIAL_PRODUCTION_CONTRACT = "V7_V23_4_V281" as const;

export type PriorWorkClass =
  | "FOUNDATION_AVAILABLE"
  | "PARTIAL_REJECTED"
  | "REJECTED_OUTPUT"
  | "STANDARD_NOT_MET"
  | "OWNER_REJECTED"
  | "NOT_STARTED";

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
    nameVi: string;
    plane: string;
    state: string;
    gateVersion: string;
    requiredArtifacts: string[];
    evidence: string;
    blocker?: string;
    priorWork: {
      classification: PriorWorkClass;
      label: string;
      summary: string;
      reusable: string;
      excluded: string;
      currentRequirement: string;
    };
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
  historySummary: Array<{ label: string; count: number; description: string; classification: PriorWorkClass | "FOUNDATION_GROUP" | "REBUILD_GROUP" | "FINAL_GROUP" }>;
  dataPolicy: Array<{
    id: "CURRENT_BUSINESS_FACTS" | "REUSABLE_KNOWLEDGE" | "NEW_EPISODE_ARTIFACTS" | "AUDIT_ONLY" | "PROHIBITED_INPUTS";
    title: string;
    decision: string;
    examples: string[];
    howUsed: string;
    storage: string;
  }>;
  storageDesign: Array<{ layer: "D1" | "R2" | "Google Drive"; purpose: string; stores: string; authority: string }>;
  lineageFlow: Array<{ step: number; title: string; detail: string }>;
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
