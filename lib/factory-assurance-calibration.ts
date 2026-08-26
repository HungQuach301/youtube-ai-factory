import { canonicalHash, canonicalStringify } from "@/lib/canonical-json";
import { FACTORY_ASSURANCE_LAYERS } from "@/lib/factory-evidence-assurance";
import { FactoryRuntimeError, type FactoryRuntimeDB } from "@/lib/factory-runtime-writer";

export const FACTORY_ASSURANCE_CALIBRATION_VERSION = "FACTORY_ASSURANCE_CALIBRATION_V1" as const;
export const FACTORY_ASSURANCE_CALIBRATION_THRESHOLD_VERSION = "AI_FIRST_ASSURANCE_CALIBRATION_THRESHOLDS_V1" as const;

type AssuranceLayer = typeof FACTORY_ASSURANCE_LAYERS[number];
type Outcome = "PASS" | "FAIL" | "INCOMPLETE" | "HUMAN_ESCALATION_REQUIRED";
type Severity = "NONE" | "P0" | "P1" | "P2" | "P3";
type LabelSource = "OWNER_CONFIRMED" | "SEALED_CLEAN_CONTROL" | "SEALED_DEFECT_CONTROL";
type DependencyIdentity = {
  judgeVersion: string;
  modelVersion: string;
  promptHash: string;
  rubricHash: string;
  schemaHash: string;
  samplerHash: string;
};

const hashPattern = /^[a-f0-9]{64}$/;
const identityPattern = /^[A-Za-z0-9._:@/-]{3,200}$/;
const keyPattern = /^[A-Za-z0-9._:-]{16,200}$/;
const json = (value: unknown) => canonicalStringify(value);
const deterministicId = (prefix: string, hash: string) => `${prefix}-${hash.slice(0, 24)}`;
const layerSet = new Set<string>(FACTORY_ASSURANCE_LAYERS);

function assertHash(label: string, value: unknown) {
  if (!hashPattern.test(String(value ?? ""))) throw new FactoryRuntimeError("ASSURANCE_CALIBRATION_INPUT_INVALID", 400, `${label} must be a lowercase SHA-256 value`, [`${label}_INVALID`]);
}

function assertIdentity(label: string, value: unknown) {
  if (!identityPattern.test(String(value ?? "").trim())) throw new FactoryRuntimeError("ASSURANCE_CALIBRATION_INPUT_INVALID", 400, `${label} is invalid`, [`${label}_INVALID`]);
}

function assertKey(label: string, value: unknown) {
  if (!keyPattern.test(String(value ?? "").trim())) throw new FactoryRuntimeError("ASSURANCE_CALIBRATION_INPUT_INVALID", 400, `${label} is invalid`, [`${label}_INVALID`]);
}

function assertLayer(value: unknown): asserts value is AssuranceLayer {
  if (!layerSet.has(String(value ?? ""))) throw new FactoryRuntimeError("ASSURANCE_CALIBRATION_LAYER_INVALID", 400, "Calibration layer must be L0-L7");
}

function assertDependency(dependency: DependencyIdentity) {
  assertIdentity("JUDGE_VERSION", dependency.judgeVersion);
  assertIdentity("MODEL_VERSION", dependency.modelVersion);
  assertHash("PROMPT_HASH", dependency.promptHash);
  assertHash("RUBRIC_HASH", dependency.rubricHash);
  assertHash("SCHEMA_HASH", dependency.schemaHash);
  assertHash("SAMPLER_HASH", dependency.samplerHash);
}

export type FactoryAssuranceCalibrationObservationInput = DependencyIdentity & {
  observationKey: string;
  repeatIndex: number;
  observedOutcome: Outcome;
  observedSeverity: Severity;
  evidenceTimecodeValid: boolean;
  structuredOutputValid: boolean;
  confidence: number;
  providerResponseId?: string;
  rawResponseHash?: string;
  usage?: Record<string, unknown>;
  actualSpendMicros?: number;
  evidenceHash: string;
};

export type FactoryAssuranceCalibrationCaseInput = {
  caseKey: string;
  assuranceLayer: AssuranceLayer;
  exactArtifactHash: string;
  evidenceBundleHash: string;
  labelSource: LabelSource;
  expectedOutcome: Outcome;
  expectedSeverity: Severity;
  defectFamily: string;
  correlationGroup: string;
  ownerLabelHash: string;
  blindControl: boolean;
  productionHoldout: boolean;
  evidenceHash: string;
  observations: FactoryAssuranceCalibrationObservationInput[];
};

export type FactoryAssuranceCalibrationPackageInput = {
  campaignKey: string;
  channelId: string;
  formatKey: string;
  policyVersion: string;
  standardVersion: string;
  datasetVersion: string;
  datasetManifestHash: string;
  correlationPolicyVersion: string;
  cases: FactoryAssuranceCalibrationCaseInput[];
  evidenceHash: string;
};

export type FactoryAssuranceCalibrationLayerResult = DependencyIdentity & {
  assuranceLayer: AssuranceLayer;
  sampleSize: number;
  independentLabelCount: number;
  blindControlCount: number;
  productionHoldoutCount: number;
  correlationGroupCount: number;
  p0Recall: number;
  p1Recall: number;
  cleanPrecision: number;
  criticalFalseCleanCount: number;
  exactByteRepeatability: number;
  p0P1DecisionFlipCount: number;
  evidenceTimecodeValidity: number;
  structuredOutputValidity: number;
  lifecycleState: "QUALIFIED_CANDIDATE" | "ADVISORY";
  reasons: string[];
  qualificationAuthority: false;
  passAuthority: false;
  acceptanceAuthority: "ADVISORY_ONLY";
};

const ratio = (numerator: number, denominator: number) => denominator > 0 ? numerator / denominator : 0;
const signature = (observation: FactoryAssuranceCalibrationObservationInput) => `${observation.observedOutcome}:${observation.observedSeverity}`;
const dependencySignature = (observation: FactoryAssuranceCalibrationObservationInput) => json({
  judgeVersion: observation.judgeVersion,
  modelVersion: observation.modelVersion,
  promptHash: observation.promptHash,
  rubricHash: observation.rubricHash,
  schemaHash: observation.schemaHash,
  samplerHash: observation.samplerHash,
});

export function evaluateFactoryAssuranceCalibrationLayer(layer: AssuranceLayer, cases: FactoryAssuranceCalibrationCaseInput[]): FactoryAssuranceCalibrationLayerResult {
  assertLayer(layer);
  if (!cases.length || cases.some((item) => item.assuranceLayer !== layer)) throw new FactoryRuntimeError("ASSURANCE_CALIBRATION_CASE_SCOPE_INVALID", 409, `Layer ${layer} requires scoped calibration cases`);
  const firstObservation = cases[0]?.observations[0];
  if (!firstObservation) throw new FactoryRuntimeError("ASSURANCE_CALIBRATION_OBSERVATIONS_REQUIRED", 409, `Layer ${layer} requires observations`);
  assertDependency(firstObservation);
  const expectedDependency = dependencySignature(firstObservation);
  const primaryObservations: FactoryAssuranceCalibrationObservationInput[] = [];
  const reasons: string[] = [];
  let repeatableCases = 0;
  let p0P1DecisionFlipCount = 0;

  for (const item of cases) {
    if (item.observations.length < 2) reasons.push(`REPEAT_OBSERVATION_REQUIRED:${item.caseKey}`);
    const repeats = [...item.observations].sort((left, right) => left.repeatIndex - right.repeatIndex);
    const repeatIndexes = new Set<number>();
    for (const observation of repeats) {
      assertDependency(observation);
      if (dependencySignature(observation) !== expectedDependency) reasons.push(`DEPENDENCY_IDENTITY_MIXED:${item.caseKey}`);
      if (!Number.isSafeInteger(observation.repeatIndex) || observation.repeatIndex < 1 || repeatIndexes.has(observation.repeatIndex)) reasons.push(`REPEAT_INDEX_INVALID:${item.caseKey}`);
      repeatIndexes.add(observation.repeatIndex);
      if (!Number.isFinite(observation.confidence) || observation.confidence < 0 || observation.confidence > 1) reasons.push(`CONFIDENCE_INVALID:${item.caseKey}`);
    }
    if (repeats[0]) primaryObservations.push(repeats[0]);
    const distinct = new Set(repeats.map(signature));
    if (repeats.length >= 2 && distinct.size === 1) repeatableCases += 1;
    if (["P0", "P1"].includes(item.expectedSeverity) && distinct.size > 1) p0P1DecisionFlipCount += 1;
  }

  const p0Cases = cases.filter((item) => item.expectedSeverity === "P0");
  const p1Cases = cases.filter((item) => item.expectedSeverity === "P1");
  const cleanCases = cases.filter((item) => item.expectedOutcome === "PASS" && item.expectedSeverity === "NONE");
  const primaryFor = (item: FactoryAssuranceCalibrationCaseInput) => item.observations.slice().sort((left, right) => left.repeatIndex - right.repeatIndex)[0];
  const detects = (item: FactoryAssuranceCalibrationCaseInput) => {
    const observed = primaryFor(item);
    return Boolean(observed && observed.observedOutcome === "FAIL" && observed.observedSeverity === item.expectedSeverity);
  };
  const cleanCorrect = cleanCases.filter((item) => {
    const observed = primaryFor(item);
    return observed?.observedOutcome === "PASS" && observed.observedSeverity === "NONE";
  }).length;
  const criticalFalseCleanCount = [...p0Cases, ...p1Cases].filter((item) => primaryFor(item)?.observedOutcome === "PASS").length;
  const allObservations = cases.flatMap((item) => item.observations);
  const result: FactoryAssuranceCalibrationLayerResult = {
    assuranceLayer: layer,
    judgeVersion: firstObservation.judgeVersion,
    modelVersion: firstObservation.modelVersion,
    promptHash: firstObservation.promptHash,
    rubricHash: firstObservation.rubricHash,
    schemaHash: firstObservation.schemaHash,
    samplerHash: firstObservation.samplerHash,
    sampleSize: cases.length,
    independentLabelCount: cases.filter((item) => item.labelSource === "OWNER_CONFIRMED" || item.labelSource.startsWith("SEALED_")).length,
    blindControlCount: cases.filter((item) => item.blindControl).length,
    productionHoldoutCount: cases.filter((item) => item.productionHoldout).length,
    correlationGroupCount: new Set(cases.map((item) => item.correlationGroup)).size,
    p0Recall: ratio(p0Cases.filter(detects).length, p0Cases.length),
    p1Recall: ratio(p1Cases.filter(detects).length, p1Cases.length),
    cleanPrecision: ratio(cleanCorrect, cleanCases.length),
    criticalFalseCleanCount,
    exactByteRepeatability: ratio(repeatableCases, cases.length),
    p0P1DecisionFlipCount,
    evidenceTimecodeValidity: ratio(allObservations.filter((item) => item.evidenceTimecodeValid).length, allObservations.length),
    structuredOutputValidity: ratio(allObservations.filter((item) => item.structuredOutputValid).length, allObservations.length),
    lifecycleState: "ADVISORY",
    reasons,
    qualificationAuthority: false,
    passAuthority: false,
    acceptanceAuthority: "ADVISORY_ONLY",
  };
  const structuralPass = result.sampleSize >= 20 && result.independentLabelCount === result.sampleSize && result.blindControlCount >= 5 && result.productionHoldoutCount >= 3 && result.correlationGroupCount >= 10 && reasons.length === 0;
  const metricPass = result.p0Recall === 1 && result.p1Recall >= 0.95 && result.cleanPrecision >= 0.98 && result.criticalFalseCleanCount === 0 && result.exactByteRepeatability >= 0.95 && result.p0P1DecisionFlipCount === 0 && result.evidenceTimecodeValidity >= 0.95 && result.structuredOutputValidity === 1;
  if (!structuralPass) result.reasons.push("CALIBRATION_DATASET_OR_REPEAT_COVERAGE_BELOW_POLICY");
  if (!metricPass) result.reasons.push("CALIBRATION_METRICS_BELOW_ACTIVE_THRESHOLD");
  result.reasons = [...new Set(result.reasons)].sort();
  result.lifecycleState = structuralPass && metricPass ? "QUALIFIED_CANDIDATE" : "ADVISORY";
  return result;
}

export async function recordFactoryAssuranceCalibrationPackage(db: FactoryRuntimeDB, input: FactoryAssuranceCalibrationPackageInput) {
  assertKey("CAMPAIGN_KEY", input.campaignKey);
  for (const [label, value] of [["CHANNEL_ID", input.channelId], ["FORMAT_KEY", input.formatKey], ["POLICY_VERSION", input.policyVersion], ["STANDARD_VERSION", input.standardVersion], ["DATASET_VERSION", input.datasetVersion], ["CORRELATION_POLICY_VERSION", input.correlationPolicyVersion]] as const) assertIdentity(label, value);
  assertHash("DATASET_MANIFEST_HASH", input.datasetManifestHash);
  assertHash("EVIDENCE_HASH", input.evidenceHash);
  if (!Array.isArray(input.cases) || input.cases.length === 0) throw new FactoryRuntimeError("ASSURANCE_CALIBRATION_CASES_REQUIRED", 400, "Calibration requires cases");
  const caseKeys = new Set<string>();
  const observationKeys = new Set<string>();
  for (const item of input.cases) {
    assertKey("CASE_KEY", item.caseKey); assertLayer(item.assuranceLayer); assertHash("EXACT_ARTIFACT_HASH", item.exactArtifactHash); assertHash("EVIDENCE_BUNDLE_HASH", item.evidenceBundleHash); assertHash("OWNER_LABEL_HASH", item.ownerLabelHash); assertHash("CASE_EVIDENCE_HASH", item.evidenceHash);
    assertIdentity("DEFECT_FAMILY", item.defectFamily); assertIdentity("CORRELATION_GROUP", item.correlationGroup);
    if (caseKeys.has(item.caseKey)) throw new FactoryRuntimeError("ASSURANCE_CALIBRATION_CASE_KEY_DUPLICATE", 409, "Calibration case keys must be unique");
    caseKeys.add(item.caseKey);
    for (const observation of item.observations) {
      assertKey("OBSERVATION_KEY", observation.observationKey); assertHash("OBSERVATION_EVIDENCE_HASH", observation.evidenceHash); assertDependency(observation);
      if (observation.rawResponseHash !== undefined) assertHash("RAW_RESPONSE_HASH", observation.rawResponseHash);
      if (observationKeys.has(observation.observationKey)) throw new FactoryRuntimeError("ASSURANCE_CALIBRATION_OBSERVATION_KEY_DUPLICATE", 409, "Calibration observation keys must be unique");
      observationKeys.add(observation.observationKey);
      if (!Number.isSafeInteger(observation.actualSpendMicros ?? 0) || (observation.actualSpendMicros ?? 0) < 0) throw new FactoryRuntimeError("ASSURANCE_CALIBRATION_SPEND_INVALID", 400, "Observed spend must be a non-negative integer");
    }
  }
  const targetLayers = [...new Set(input.cases.map((item) => item.assuranceLayer))].sort() as AssuranceLayer[];
  if (json(targetLayers) !== json(FACTORY_ASSURANCE_LAYERS)) throw new FactoryRuntimeError("ASSURANCE_CALIBRATION_LAYER_COVERAGE_INCOMPLETE", 409, "A Factory calibration package must cover L0-L7 exactly");
  const results = FACTORY_ASSURANCE_LAYERS.map((layer) => evaluateFactoryAssuranceCalibrationLayer(layer, input.cases.filter((item) => item.assuranceLayer === layer)));
  const lifecycleState = results.every((item) => item.lifecycleState === "QUALIFIED_CANDIDATE") ? "MEASURED_QUALIFIED_CANDIDATE" : "MEASURED_ADVISORY";
  const manifest = { version: FACTORY_ASSURANCE_CALIBRATION_VERSION, ...input, cases: [...input.cases].sort((left, right) => left.caseKey.localeCompare(right.caseKey)).map((item) => ({ ...item, observations: [...item.observations].sort((left, right) => left.observationKey.localeCompare(right.observationKey)) })), targetLayers, lifecycleState, results, qualificationAuthority: false, acceptanceAuthority: "ADVISORY_ONLY" };
  const campaignHash = await canonicalHash(manifest);
  const existing = await db.prepare("SELECT id,campaign_hash,lifecycle_state FROM factory_assurance_calibration_campaigns WHERE campaign_key=?").bind(input.campaignKey).first<Record<string, unknown>>();
  if (existing) {
    if (String(existing.campaign_hash) !== campaignHash) throw new FactoryRuntimeError("ASSURANCE_CALIBRATION_IDEMPOTENCY_CONFLICT", 409, "The campaign key is bound to another calibration manifest");
    return { outcome: "IDEMPOTENT_REPLAY" as const, campaignId: String(existing.id), campaignHash, lifecycleState: String(existing.lifecycle_state), results, qualificationAuthority: false, passAuthority: false, acceptanceAuthority: "ADVISORY_ONLY" as const };
  }
  const campaignId = deterministicId("factory-assurance-calibration", campaignHash);
  const statements = [db.prepare(`INSERT INTO factory_assurance_calibration_campaigns
    (id,campaign_key,channel_id,format_key,policy_version,standard_version,dataset_version,dataset_manifest_hash,target_layers_json,correlation_policy_version,automation_mode,lifecycle_state,expected_case_count,qualification_authority,pass_authority,acceptance_authority,provider_dispatch_authority,r22_authority,master_authority,release_authority,publication_authority,campaign_hash,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,'AI_SHADOW',?,?,0,0,'ADVISORY_ONLY',0,0,0,0,0,?,?)`).bind(campaignId, input.campaignKey, input.channelId, input.formatKey, input.policyVersion, input.standardVersion, input.datasetVersion, input.datasetManifestHash, json(targetLayers), input.correlationPolicyVersion, lifecycleState, input.cases.length, campaignHash, input.evidenceHash)];
  for (const item of [...input.cases].sort((left, right) => left.caseKey.localeCompare(right.caseKey))) {
    const { observations: caseObservations, ...caseManifest } = item;
    const caseHash = await canonicalHash({ version: FACTORY_ASSURANCE_CALIBRATION_VERSION, campaignId, item: caseManifest });
    const caseId = deterministicId("factory-assurance-calibration-case", caseHash);
    statements.push(db.prepare(`INSERT INTO factory_assurance_calibration_cases
      (id,campaign_id,case_key,assurance_layer,exact_artifact_hash,evidence_bundle_hash,label_source,expected_outcome,expected_severity,defect_family,correlation_group,owner_label_hash,blind_control,production_holdout,evidence_hash)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(caseId, campaignId, item.caseKey, item.assuranceLayer, item.exactArtifactHash, item.evidenceBundleHash, item.labelSource, item.expectedOutcome, item.expectedSeverity, item.defectFamily, item.correlationGroup, item.ownerLabelHash, item.blindControl ? 1 : 0, item.productionHoldout ? 1 : 0, item.evidenceHash));
    for (const observation of [...caseObservations].sort((left, right) => left.observationKey.localeCompare(right.observationKey))) {
      const observationHash = await canonicalHash({ version: FACTORY_ASSURANCE_CALIBRATION_VERSION, campaignId, caseId, observation });
      statements.push(db.prepare(`INSERT INTO factory_assurance_calibration_observations
        (id,campaign_id,case_id,observation_key,assurance_layer,judge_version,model_version,prompt_hash,rubric_hash,schema_hash,sampler_hash,repeat_index,observed_outcome,observed_severity,evidence_timecode_valid,structured_output_valid,confidence,provider_response_id,raw_response_hash,usage_json,actual_spend_micros,observation_hash,evidence_hash)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(deterministicId("factory-assurance-calibration-observation", observationHash), campaignId, caseId, observation.observationKey, item.assuranceLayer, observation.judgeVersion, observation.modelVersion, observation.promptHash, observation.rubricHash, observation.schemaHash, observation.samplerHash, observation.repeatIndex, observation.observedOutcome, observation.observedSeverity, observation.evidenceTimecodeValid ? 1 : 0, observation.structuredOutputValid ? 1 : 0, observation.confidence, observation.providerResponseId ?? null, observation.rawResponseHash ?? null, json(observation.usage ?? {}), observation.actualSpendMicros ?? 0, observationHash, observation.evidenceHash));
    }
  }
  for (const result of results) {
    const resultKey = `${input.campaignKey}:result:${result.assuranceLayer.toLowerCase()}`;
    const resultHash = await canonicalHash({ version: FACTORY_ASSURANCE_CALIBRATION_VERSION, campaignId, result, thresholdVersion: FACTORY_ASSURANCE_CALIBRATION_THRESHOLD_VERSION });
    statements.push(db.prepare(`INSERT INTO factory_assurance_calibration_results
      (id,campaign_id,result_key,assurance_layer,judge_version,model_version,prompt_hash,rubric_hash,schema_hash,sampler_hash,sample_size,independent_label_count,blind_control_count,production_holdout_count,correlation_group_count,p0_recall,p1_recall,clean_precision,critical_false_clean_count,exact_byte_repeatability,p0_p1_decision_flip_count,evidence_timecode_validity,structured_output_validity,lifecycle_state,threshold_version,qualification_authority,pass_authority,acceptance_authority,result_hash,evidence_hash)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,'ADVISORY_ONLY',?,?)`).bind(deterministicId("factory-assurance-calibration-result", resultHash), campaignId, resultKey, result.assuranceLayer, result.judgeVersion, result.modelVersion, result.promptHash, result.rubricHash, result.schemaHash, result.samplerHash, result.sampleSize, result.independentLabelCount, result.blindControlCount, result.productionHoldoutCount, result.correlationGroupCount, result.p0Recall, result.p1Recall, result.cleanPrecision, result.criticalFalseCleanCount, result.exactByteRepeatability, result.p0P1DecisionFlipCount, result.evidenceTimecodeValidity, result.structuredOutputValidity, result.lifecycleState, FACTORY_ASSURANCE_CALIBRATION_THRESHOLD_VERSION, resultHash, input.evidenceHash));
  }
  await db.batch(statements);
  return { outcome: "RECORDED_AI_SHADOW" as const, campaignId, campaignHash, lifecycleState, results, caseCount: input.cases.length, observationCount: input.cases.reduce((total, item) => total + item.observations.length, 0), qualificationAuthority: false, passAuthority: false, acceptanceAuthority: "ADVISORY_ONLY" as const, providerDispatchAuthority: false, r22Authority: false, releaseAuthority: false, publicationAuthority: false };
}
