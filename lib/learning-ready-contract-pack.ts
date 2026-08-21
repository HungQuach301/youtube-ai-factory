import { canonicalHash } from "@/lib/canonical-json";

export const LEARNING_READY_CONTRACT_PACK_VERSION = "LEARNING_READY_CONTRACT_PACK_V1" as const;
export const PROMOTE_LEARNING_COMMAND_VERSION = "PROMOTE_LEARNING_V1" as const;

export type LearningReadyContractKey =
  | "CHANNEL_IDENTITY"
  | "PACKAGING_PROMISE"
  | "PREDICTED_PERFORMANCE"
  | "EXPERIMENT_DEFINITION"
  | "LEARNING_CANDIDATE"
  | "RIGHTS_COMPLIANCE"
  | "ANIMATIC"
  | "MASTER_DELIVERY";

export type ContractDefinition = {
  key: LearningReadyContractKey;
  artifactType: string;
  ownerPlane: string;
  stageBindings: string[];
  requiredParentTypes: string[];
  exitEvidence: string[];
  providerPlan: { mode: "ZERO_DISPATCH"; requestBudget: 0; spendBudgetUsd: 0 };
};

const zeroDispatch = { mode: "ZERO_DISPATCH", requestBudget: 0, spendBudgetUsd: 0 } as const;

export const LEARNING_READY_CONTRACT_DEFINITIONS: ContractDefinition[] = [
  {
    key: "CHANNEL_IDENTITY",
    artifactType: "CHANNEL_IDENTITY_CONTRACT",
    ownerPlane: "CHANNEL_IDENTITY",
    stageBindings: ["00", "07A", "07B"],
    requiredParentTypes: ["CHANNEL_STRATEGY_BINDING"],
    exitEvidence: ["voice settings hash", "visual grammar", "music policy", "terminology ledger"],
    providerPlan: zeroDispatch,
  },
  {
    key: "PACKAGING_PROMISE",
    artifactType: "PACKAGING_PROMISE_CONTRACT",
    ownerPlane: "PACKAGING_PUBLISHING",
    stageBindings: ["04", "06", "14", "15"],
    requiredParentTypes: ["CREATIVE_ROUTE", "CHANNEL_IDENTITY_CONTRACT"],
    exitEvidence: ["title variants", "thumbnail concept", "audience promise", "promise-to-content bindings"],
    providerPlan: zeroDispatch,
  },
  {
    key: "PREDICTED_PERFORMANCE",
    artifactType: "PREDICTED_PERFORMANCE_ARTIFACT",
    ownerPlane: "MEASUREMENT_LEARNING",
    stageBindings: ["04", "05", "08", "11", "16"],
    requiredParentTypes: ["PACKAGING_PROMISE_CONTRACT", "STORY_CLOCK", "SHOT_CUE_PROGRAM"],
    exitEvidence: ["baseline reference", "retention curve", "beat risks", "CTR prediction", "composition lineage"],
    providerPlan: zeroDispatch,
  },
  {
    key: "EXPERIMENT_DEFINITION",
    artifactType: "EXPERIMENT_DEFINITION",
    ownerPlane: "MEASUREMENT_LEARNING",
    stageBindings: ["04", "15", "16"],
    requiredParentTypes: ["PACKAGING_PROMISE_CONTRACT", "PREDICTED_PERFORMANCE_ARTIFACT"],
    exitEvidence: ["one tested variable", "held constants", "minimum sample", "decision criterion"],
    providerPlan: zeroDispatch,
  },
  {
    key: "LEARNING_CANDIDATE",
    artifactType: "LEARNING_CANDIDATE",
    ownerPlane: "MEASUREMENT_LEARNING",
    stageBindings: ["16"],
    requiredParentTypes: ["EXPERIMENT_DEFINITION", "ACTUAL_PERFORMANCE_ARTIFACT"],
    exitEvidence: ["actual-versus-predicted", "independent video count", "evidence sufficiency", "target version lineage"],
    providerPlan: zeroDispatch,
  },
  {
    key: "RIGHTS_COMPLIANCE",
    artifactType: "RIGHTS_COMPLIANCE_MANIFEST",
    ownerPlane: "RIGHTS_COMPLIANCE",
    stageBindings: ["04", "07A", "07B", "09", "10", "13", "15"],
    requiredParentTypes: ["CHANNEL_IDENTITY_CONTRACT", "PACKAGING_PROMISE_CONTRACT"],
    exitEvidence: ["license terms", "territory and duration", "commercial eligibility", "Content ID", "platform disclosures"],
    providerPlan: zeroDispatch,
  },
  {
    key: "ANIMATIC",
    artifactType: "ANIMATIC_CONTRACT",
    ownerPlane: "CONTENT_DESIGN",
    stageBindings: ["08", "09"],
    requiredParentTypes: ["PACKAGING_PROMISE_CONTRACT", "PREDICTED_PERFORMANCE_ARTIFACT", "SHOT_CUE_PROGRAM"],
    exitEvidence: ["draft audio", "timed frames", "exact duration", "promise-to-content preflight", "retention and story verdict"],
    providerPlan: zeroDispatch,
  },
  {
    key: "MASTER_DELIVERY",
    artifactType: "MASTER_DELIVERY_CONTRACT",
    ownerPlane: "MEDIA_PRODUCTION",
    stageBindings: ["11", "12", "13", "15"],
    requiredParentTypes: ["EDIT_TIMELINE", "RIGHTS_COMPLIANCE_MANIFEST"],
    exitEvidence: ["lossless or mezzanine archival master", "PCM 48 kHz", "derived distribution render", "file and stream hashes", "R2 and Drive reconciliation"],
    providerPlan: zeroDispatch,
  },
];

export function validateContractDefinitions(definitions: ContractDefinition[] = LEARNING_READY_CONTRACT_DEFINITIONS) {
  const errors: string[] = [];
  const keys = new Set<string>();
  const artifactTypes = new Set<string>();
  for (const definition of definitions) {
    if (keys.has(definition.key)) errors.push(`DUPLICATE_CONTRACT_KEY:${definition.key}`);
    if (artifactTypes.has(definition.artifactType)) errors.push(`DUPLICATE_ARTIFACT_TYPE:${definition.artifactType}`);
    keys.add(definition.key);
    artifactTypes.add(definition.artifactType);
    if (!definition.ownerPlane || definition.stageBindings.length === 0) errors.push(`OWNER_OR_STAGE_MISSING:${definition.key}`);
    if (definition.requiredParentTypes.length === 0 || definition.exitEvidence.length === 0) errors.push(`LINEAGE_OR_EVIDENCE_MISSING:${definition.key}`);
    if (definition.providerPlan.mode !== "ZERO_DISPATCH" || definition.providerPlan.requestBudget !== 0 || definition.providerPlan.spendBudgetUsd !== 0) errors.push(`NON_ZERO_PROVIDER_PLAN:${definition.key}`);
  }
  const expected = new Set<LearningReadyContractKey>(["CHANNEL_IDENTITY", "PACKAGING_PROMISE", "PREDICTED_PERFORMANCE", "EXPERIMENT_DEFINITION", "LEARNING_CANDIDATE", "RIGHTS_COMPLIANCE", "ANIMATIC", "MASTER_DELIVERY"]);
  for (const key of expected) if (!keys.has(key)) errors.push(`REQUIRED_CONTRACT_MISSING:${key}`);
  return { passed: errors.length === 0 && definitions.length === expected.size, contractCount: definitions.length, providerRequests: 0 as const, spendUsd: 0 as const, errors };
}

export async function compileLearningReadyContractPack() {
  const lint = validateContractDefinitions();
  if (!lint.passed) throw new Error(`LEARNING_READY_CONTRACT_PACK_INVALID:${lint.errors.join("|")}`);
  const manifest = {
    artifactType: "LEARNING_READY_CONTRACT_PACK_MANIFEST" as const,
    version: LEARNING_READY_CONTRACT_PACK_VERSION,
    lifecycleState: "SCHEMA_DEFINED" as const,
    definitions: LEARNING_READY_CONTRACT_DEFINITIONS,
    mutationAuthority: "NONE" as const,
    providerPlan: zeroDispatch,
  };
  return { manifest, lint, contentHash: await canonicalHash(manifest) };
}

const hashPattern = /^[a-f0-9]{64}$/;

export function validateChannelIdentityContract(input: {
  scope: string;
  version: number;
  strategyBindingHash: string;
  voiceSettingsHash: string;
  pronunciationLexiconRef: string;
  visualGrammar: Record<string, unknown>;
  musicPolicy: Record<string, unknown>;
  terminologyLedgerRef: string;
}) {
  const errors: string[] = [];
  if (input.scope !== "CHANNEL") errors.push("IDENTITY_MUST_BE_CHANNEL_SCOPED");
  if (!Number.isSafeInteger(input.version) || input.version < 1) errors.push("IDENTITY_VERSION_INVALID");
  if (!hashPattern.test(input.strategyBindingHash) || !hashPattern.test(input.voiceSettingsHash)) errors.push("IDENTITY_HASH_INVALID");
  if (!input.pronunciationLexiconRef || !input.terminologyLedgerRef) errors.push("IDENTITY_LEDGER_REFERENCE_MISSING");
  if (Object.keys(input.visualGrammar).length === 0 || Object.keys(input.musicPolicy).length === 0) errors.push("IDENTITY_GRAMMAR_INCOMPLETE");
  return { eligible: errors.length === 0, errors };
}

export function validatePackagingPromiseContract(input: {
  creativeRouteId: string;
  channelIdentityHash: string;
  titleVariants: string[];
  thumbnailConcept: string;
  audiencePromise: string;
  differentiationHypothesis: string;
  promisedClaimIds: string[];
  mobileLegibilityState: "PASS" | "FAIL" | "NOT_EVALUATED";
}) {
  const errors: string[] = [];
  if (!input.creativeRouteId || !hashPattern.test(input.channelIdentityHash)) errors.push("PACKAGING_PARENT_BINDING_INVALID");
  if (input.titleVariants.length < 2 || input.titleVariants.some((title) => title.trim().length < 8)) errors.push("TITLE_VARIANTS_INCOMPLETE");
  if (!input.thumbnailConcept || !input.audiencePromise || !input.differentiationHypothesis) errors.push("PACKAGING_PROMISE_INCOMPLETE");
  if (input.promisedClaimIds.length === 0) errors.push("PROMISE_CLAIM_BINDING_MISSING");
  if (input.mobileLegibilityState !== "PASS") errors.push("MOBILE_LEGIBILITY_NOT_PASSED");
  return { eligible: errors.length === 0, errors };
}

export function validatePredictedPerformanceArtifact(input: {
  baselineRef: string;
  packagingPromiseHash: string;
  compositionStages: string[];
  retentionCurve: Array<{ elapsedRatio: number; predictedRetention: number }>;
  beatRisks: Array<{ beatId: string; risk: number }>;
  predictedCtr: { minimum: number; expected: number; maximum: number };
  lifecycleState: "DRAFT" | "SEALED";
}) {
  const errors: string[] = [];
  if (!input.baselineRef || !hashPattern.test(input.packagingPromiseHash)) errors.push("PREDICTION_PARENT_BINDING_INVALID");
  for (const stage of ["04", "05", "08", "11"]) if (!input.compositionStages.includes(stage)) errors.push(`PREDICTION_STAGE_MISSING:${stage}`);
  if (input.retentionCurve.length < 3 || input.retentionCurve.some((point, index, list) => point.elapsedRatio < 0 || point.elapsedRatio > 1 || point.predictedRetention < 0 || point.predictedRetention > 1 || (index > 0 && point.elapsedRatio <= list[index - 1].elapsedRatio))) errors.push("RETENTION_CURVE_INVALID");
  if (input.beatRisks.length === 0 || input.beatRisks.some((beat) => !beat.beatId || beat.risk < 0 || beat.risk > 1)) errors.push("BEAT_RISK_INVALID");
  const ctr = input.predictedCtr;
  if (!(ctr.minimum >= 0 && ctr.minimum <= ctr.expected && ctr.expected <= ctr.maximum && ctr.maximum <= 1)) errors.push("CTR_INTERVAL_INVALID");
  if (input.lifecycleState !== "SEALED") errors.push("PREDICTION_NOT_SEALED");
  return { eligible: errors.length === 0, errors };
}

export function validateExperimentDefinition(input: {
  hypothesis: string;
  variableTested: string;
  variablesHeldConstant: string[];
  minimumSampleSize: number;
  decisionCriterion: string;
}) {
  const errors: string[] = [];
  if (!input.hypothesis || !input.variableTested || input.variableTested.includes(",")) errors.push("EXACTLY_ONE_VARIABLE_REQUIRED");
  if (input.variablesHeldConstant.length < 2 || new Set(input.variablesHeldConstant).size !== input.variablesHeldConstant.length) errors.push("HELD_CONSTANTS_INCOMPLETE");
  if (!Number.isSafeInteger(input.minimumSampleSize) || input.minimumSampleSize < 2) errors.push("MINIMUM_SAMPLE_INVALID");
  if (!input.decisionCriterion) errors.push("DECISION_CRITERION_MISSING");
  return { eligible: errors.length === 0, errors };
}

export function evaluateLearningPromotion(input: {
  learningState: "INSUFFICIENT_EVIDENCE" | "PROMOTION_ELIGIBLE" | "PROMOTED";
  target: "CHANNEL_STRATEGY" | "PRODUCTION_STANDARD";
  independentVideoIds: string[];
  observedSampleSize: number;
  minimumSampleSize: number;
  consistentDirection: boolean;
  ownerIdentityBound: boolean;
  evidenceHash: string;
  createsNewVersion: boolean;
}) {
  const reasons: string[] = [];
  if (input.learningState !== "PROMOTION_ELIGIBLE") reasons.push("LEARNING_NOT_PROMOTION_ELIGIBLE");
  if (new Set(input.independentVideoIds).size < 2) reasons.push("TWO_INDEPENDENT_VIDEOS_REQUIRED");
  if (input.observedSampleSize < input.minimumSampleSize) reasons.push("MINIMUM_SAMPLE_NOT_MET");
  if (!input.consistentDirection) reasons.push("RESULT_DIRECTION_NOT_CONSISTENT");
  if (!input.ownerIdentityBound) reasons.push("OWNER_IDENTITY_REQUIRED");
  if (!hashPattern.test(input.evidenceHash)) reasons.push("PROMOTION_EVIDENCE_HASH_INVALID");
  if (!input.createsNewVersion) reasons.push("IN_PLACE_MUTATION_FORBIDDEN");
  return { command: PROMOTE_LEARNING_COMMAND_VERSION, authorized: reasons.length === 0, target: input.target, reasons };
}

export function validateRightsComplianceManifest(input: {
  territory: string[];
  validFrom: string;
  validUntil: string;
  commercialUse: boolean;
  editorialOnly: boolean;
  contentIdState: "CLEAR" | "BLOCKED" | "NOT_EVALUATED";
  aiDisclosureState: "PASS" | "FAIL" | "NOT_EVALUATED";
  advertiserFriendlyState: "PASS" | "FAIL" | "NOT_EVALUATED";
  reusedContentState: "PASS" | "FAIL" | "NOT_EVALUATED";
}) {
  const errors: string[] = [];
  if (input.territory.length === 0 || !Date.parse(input.validFrom) || !Date.parse(input.validUntil) || Date.parse(input.validUntil) <= Date.parse(input.validFrom)) errors.push("LICENSE_WINDOW_INVALID");
  if (!input.commercialUse || input.editorialOnly) errors.push("COMMERCIAL_RIGHTS_REQUIRED");
  if (input.contentIdState !== "CLEAR") errors.push("CONTENT_ID_NOT_CLEAR");
  for (const [gate, state] of [["AI_DISCLOSURE", input.aiDisclosureState], ["ADVERTISER_FRIENDLY", input.advertiserFriendlyState], ["REUSED_CONTENT", input.reusedContentState]] as const) if (state !== "PASS") errors.push(`${gate}_${state}`);
  return { eligible: errors.length === 0, errors };
}

export function validateAnimaticContract(input: {
  packagingPromiseHash: string;
  predictionHash: string;
  shotCueProgramHash: string;
  draftAudioHash: string;
  durationSeconds: number;
  canonicalDurationSeconds: number;
  timedFrameCount: number;
  promiseToContentState: "PASS" | "FAIL" | "NOT_EVALUATED";
  storyRetentionState: "PASS" | "FAIL" | "NOT_EVALUATED";
}) {
  const errors: string[] = [];
  for (const hash of [input.packagingPromiseHash, input.predictionHash, input.shotCueProgramHash, input.draftAudioHash]) if (!hashPattern.test(hash)) errors.push("ANIMATIC_PARENT_HASH_INVALID");
  if (Math.abs(input.durationSeconds - input.canonicalDurationSeconds) > 1 / 30) errors.push("ANIMATIC_DURATION_MISMATCH");
  if (input.timedFrameCount < 3) errors.push("ANIMATIC_TIMED_FRAMES_INCOMPLETE");
  if (input.promiseToContentState !== "PASS") errors.push("PROMISE_TO_CONTENT_NOT_PASSED");
  if (input.storyRetentionState !== "PASS") errors.push("STORY_RETENTION_NOT_PASSED");
  return { eligible: errors.length === 0, errors };
}

export function validateMasterDeliveryContract(input: {
  archivalCodec: "FFV1" | "PRORES_422_HQ" | string;
  archivalAudioCodec: string;
  archivalSampleRate: number;
  archivalFileHash: string;
  archivalStreamHash: string;
  distributionCodec: string;
  distributionFileHash: string;
  distributionStreamHash: string;
  derivedFromArchivalHash: string;
  r2Reconciled: boolean;
  driveReconciled: boolean;
}) {
  const errors: string[] = [];
  if (!["FFV1", "PRORES_422_HQ"].includes(input.archivalCodec)) errors.push("ARCHIVAL_CODEC_NOT_MEZZANINE");
  if (input.archivalAudioCodec !== "PCM" || input.archivalSampleRate !== 48_000) errors.push("ARCHIVAL_AUDIO_NOT_PCM_48KHZ");
  for (const hash of [input.archivalFileHash, input.archivalStreamHash, input.distributionFileHash, input.distributionStreamHash, input.derivedFromArchivalHash]) if (!hashPattern.test(hash)) errors.push("MASTER_HASH_INVALID");
  if (input.derivedFromArchivalHash !== input.archivalFileHash) errors.push("DISTRIBUTION_LINEAGE_INVALID");
  if (!input.distributionCodec || input.distributionCodec === input.archivalCodec) errors.push("DISTRIBUTION_DERIVATIVE_INVALID");
  if (!input.r2Reconciled || !input.driveReconciled) errors.push("ARCHIVE_STORAGE_RECONCILIATION_REQUIRED");
  return { eligible: errors.length === 0, errors };
}
