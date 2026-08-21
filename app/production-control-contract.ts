export const SEQUENTIAL_PRODUCTION_CONTRACT = "V7_V23_4_V281" as const;

export type PriorWorkClass =
  | "FOUNDATION_AVAILABLE"
  | "PARTIAL_REJECTED"
  | "REJECTED_OUTPUT"
  | "STANDARD_NOT_MET"
  | "OWNER_REJECTED"
  | "NOT_STARTED";

export type EffectiveProductionState =
  | "ROOT_REPAIR_REQUIRED"
  | "QUALITY_BLOCKED"
  | "PRODUCTION_RUNNING"
  | "ACTION_REQUIRED"
  | "OWNER_READY"
  | "BLOCKED_UPSTREAM";

export type ProductionPhaseKey = "FOUNDATION" | "STORY" | "MEDIA" | "EDIT" | "LEARNING";

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
    controlState: string;
    qualityEligibility: "BLOCKED_VIDEO_STANDARD_V2" | "VIDEO_EXCELLENCE_ELIGIBLE";
    qualityStandardVersion: string;
    nextValidAction: string;
    effectiveState: EffectiveProductionState;
    effectiveStateLabel: string;
    effectiveStateSummary: string;
    rootStageKeys: string[];
    rootStageLabels: string[];
    nextMilestone: string;
  };
  firstPass: {
    standardVersion: "FIRST_PASS_QUALITY_V1";
    currentSlice: "WAVE_2";
    currentSliceState: "CONTRACT_SCHEMA_ACTIVE";
    nextSlice: "WP7_EVALUATION_FOUNDATION";
    nextSliceLabel: string;
    capabilityRegistryState: "QUALIFICATION_REQUIRED" | "PARTIALLY_QUALIFIED" | "QUALIFIED";
    dispatchGuardState: "ENFORCED";
    goldenR10Eligible: boolean;
    independentAssurancePolicy: "ONE_CONFIRMATION";
    executableContract: {
      state: "VERIFIED";
      programVersion: "SHOT_CUE_PROGRAM_V1";
      compilerVersion: "DETERMINISTIC_SHOT_CUE_COMPILER_1.0.0";
      durationSeconds: number;
      shotCount: number;
      treatmentFamilyCount: number;
      timelineGaps: number;
      timelineOverlaps: number;
      schemaGaps: number;
      providerRequests: 0;
      spendUsd: 0;
    };
    capabilitiesTotal: number;
    capabilitiesQualified: number;
    archetypesTotal: number;
    archetypesQualified: number;
    fixturesDesigned: number;
    capabilities: Array<{
      id: string;
      key: string;
      version: string;
      plane: string;
      label: string;
      provider: string;
      toolOrModel: string;
      stageKeys: string[];
      state: string;
      qualifiedArchetypes: number;
      requiredArchetypes: number;
      firstPassYield: number;
    }>;
    archetypes: Array<{
      id: string;
      key: string;
      plane: string;
      label: string;
      riskTier: string;
      minimumYield: number;
      state: string;
      capabilityLabels: string[];
      evidence: string[];
    }>;
    contractPack: {
      version: "LEARNING_READY_CONTRACT_PACK_V1";
      state: "CONTRACT_SCHEMA_ACTIVE";
      contractsDefined: number;
      contractsSealed: number;
      providerRequests: 0;
      spendUsd: 0;
      definitions: Array<{ key: string; artifactType: string; ownerPlane: string; stageBindings: string[]; lifecycleState: string }>;
    };
    readiness: Array<{ id: string; label: string; passed: boolean; evidence: string; owningStages: string[] }>;
  };
  operations: {
    activeProviderRequests: number;
    completedProviderRequests: number;
    failedProviderRequests: number;
    actualSpendUsd: number;
    maxSpendUsd: number;
    actualProviderRequests: number;
    maxProviderRequests: number;
    budgetState: string;
  };
  quality: {
    eligibility: "BLOCKED_VIDEO_STANDARD_V2" | "VIDEO_EXCELLENCE_ELIGIBLE";
    standardVersion: string;
    registryCount: number;
    resolvedStandards: number;
    hardStandards: number;
    passedHardStandards: number;
    goldenSequenceState: string;
    goldenSequenceDurationSeconds: number;
    goldenMasterUrl?: string;
    goldenMasterState: string;
    goldenMasterProbe?: { width?: number; height?: number; durationSeconds?: number; averageFrameRate?: number; audioSampleRate?: number; audioChannels?: number };
    gaps: Array<{ standardId: string; level: string; owningStage: string; status: string; evidenceRequired: string[] }>;
  };
  stages: Array<{
    key: string;
    sequence: number;
    name: string;
    displayName: string;
    plane: string;
    state: string;
    gateVersion: string;
    requiredArtifacts: string[];
    evidence: string;
    blocker?: string;
    phaseKey: ProductionPhaseKey;
    phaseLabel: string;
    effectiveState: string;
    effectiveStateLabel: string;
    attention: boolean;
    inputHealth: string;
    gateSummary: string;
    nextAction: string;
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
