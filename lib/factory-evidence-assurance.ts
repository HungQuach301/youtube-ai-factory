import { canonicalHash, canonicalStringify } from "@/lib/canonical-json";
import { FactoryRuntimeError, type FactoryRuntimeDB } from "@/lib/factory-runtime-writer";

export const FACTORY_EVIDENCE_ASSURANCE_VERSION = "FACTORY_EVIDENCE_LINEAGE_ASSURANCE_FOUNDATION_V1" as const;
export const FACTORY_ASSURANCE_LAYERS = ["L0", "L1", "L2", "L3", "L4", "L5", "L6", "L7"] as const;

type AssuranceLayer = typeof FACTORY_ASSURANCE_LAYERS[number];
type Row = Record<string, unknown>;
const clean = (value: unknown) => String(value ?? "").trim();
const numeric = (value: unknown) => Number(value ?? 0);
const json = (value: unknown) => canonicalStringify(value);
const hashPattern = /^[a-f0-9]{64}$/;
const commitPattern = /^[a-f0-9]{40}$/;
const identityPattern = /^[A-Za-z0-9._:@/-]{3,200}$/;
const keyPattern = /^[A-Za-z0-9._:-]{16,200}$/;
const deterministicId = (prefix: string, hash: string) => `${prefix}-${hash.slice(0, 24)}`;

async function first(db: FactoryRuntimeDB, query: string, ...values: unknown[]) {
  return db.prepare(query).bind(...values).first<Row>();
}

async function rows(db: FactoryRuntimeDB, query: string, ...values: unknown[]) {
  return (await db.prepare(query).bind(...values).all<Row>()).results ?? [];
}

function assertIdentity(label: string, value: unknown) {
  if (!identityPattern.test(clean(value))) throw new FactoryRuntimeError("ASSURANCE_INPUT_INVALID", 400, `${label} is invalid`, [`${label}_INVALID`]);
}

function assertKey(label: string, value: unknown) {
  if (!keyPattern.test(clean(value))) throw new FactoryRuntimeError("ASSURANCE_INPUT_INVALID", 400, `${label} is invalid`, [`${label}_INVALID`]);
}

function assertHash(label: string, value: unknown) {
  if (!hashPattern.test(clean(value))) throw new FactoryRuntimeError("ASSURANCE_INPUT_INVALID", 400, `${label} must be a lowercase SHA-256 value`, [`${label}_INVALID`]);
}

function assertLayer(value: unknown): asserts value is AssuranceLayer {
  if (!FACTORY_ASSURANCE_LAYERS.includes(clean(value) as AssuranceLayer)) throw new FactoryRuntimeError("ASSURANCE_LAYER_INVALID", 400, "The assurance layer must be L0-L7");
}

function assertRatio(label: string, value: number) {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new FactoryRuntimeError("ASSURANCE_QUALIFICATION_METRIC_INVALID", 400, `${label} must be between zero and one`);
}

export type FactoryEvidenceItemInput = {
  evidenceKey: string;
  evidenceType: "SOURCE" | "ASSET" | "TRANSFORM" | "FRAME" | "AUDIO" | "BROWSER" | "RIGHTS" | "COST" | "LOG";
  assuranceLayer: AssuranceLayer;
  contentHash: string;
  storageKey?: string;
  startFrame?: number;
  endFrameExclusive?: number;
  startAudioSample?: number;
  endAudioSampleExclusive?: number;
  observed: boolean;
  provenance: Record<string, unknown>;
};

export type FactoryEvidenceBundleInput = {
  bundleKey: string;
  videoId: string;
  artifactVersionId: string;
  canonicalTimebaseId: string;
  exactArtifactHash: string;
  sourceCommit: string;
  deploymentVersion: string;
  runtimeVersion: string;
  items: FactoryEvidenceItemInput[];
  evidenceHash: string;
};

export async function createFactoryEvidenceBundle(db: FactoryRuntimeDB, input: FactoryEvidenceBundleInput) {
  for (const [label, value] of [["VIDEO_ID", input.videoId], ["ARTIFACT_VERSION_ID", input.artifactVersionId], ["CANONICAL_TIMEBASE_ID", input.canonicalTimebaseId], ["DEPLOYMENT_VERSION", input.deploymentVersion], ["RUNTIME_VERSION", input.runtimeVersion]] as const) assertIdentity(label, value);
  assertKey("BUNDLE_KEY", input.bundleKey); assertHash("EXACT_ARTIFACT_HASH", input.exactArtifactHash); assertHash("EVIDENCE_HASH", input.evidenceHash);
  if (!commitPattern.test(input.sourceCommit)) throw new FactoryRuntimeError("ASSURANCE_INPUT_INVALID", 400, "SOURCE_COMMIT must be an exact Git commit", ["SOURCE_COMMIT_INVALID"]);
  if (!Array.isArray(input.items) || input.items.length === 0) throw new FactoryRuntimeError("EVIDENCE_BUNDLE_EMPTY", 400, "An evidence bundle requires at least one item");
  const artifact = await first(db, `SELECT a.content_hash,a.lifecycle_state,t.video_id,t.total_frames,t.total_audio_samples,
      (SELECT COUNT(*) FROM factory_dependency_bindings b JOIN factory_dependency_invalidations i ON i.dependency_binding_id=b.id WHERE b.downstream_artifact_version_id=a.id) invalidation_count
    FROM factory_artifact_versions a JOIN factory_canonical_timebases t ON t.id=? WHERE a.id=?`, input.canonicalTimebaseId, input.artifactVersionId);
  const reasons: string[] = [];
  if (!artifact) reasons.push("ARTIFACT_OR_TIMEBASE_NOT_FOUND");
  if (artifact) {
    if (clean(artifact.video_id) !== input.videoId) reasons.push("TIMEBASE_VIDEO_MISMATCH");
    if (clean(artifact.content_hash) !== input.exactArtifactHash) reasons.push("EXACT_ARTIFACT_HASH_MISMATCH");
    if (clean(artifact.lifecycle_state) !== "FROZEN") reasons.push("ARTIFACT_NOT_FROZEN");
    if (numeric(artifact.invalidation_count) > 0) reasons.push("ARTIFACT_DEPENDENCY_STALE");
  }
  const keys = new Set<string>();
  for (const item of input.items) {
    assertKey("EVIDENCE_KEY", item.evidenceKey); assertLayer(item.assuranceLayer); assertHash("ITEM_CONTENT_HASH", item.contentHash);
    if (keys.has(item.evidenceKey)) reasons.push("DUPLICATE_EVIDENCE_KEY");
    keys.add(item.evidenceKey);
    if (item.storageKey !== undefined && (!clean(item.storageKey) || clean(item.storageKey).length > 1000)) reasons.push("EVIDENCE_STORAGE_KEY_INVALID");
    const framePair = item.startFrame !== undefined || item.endFrameExclusive !== undefined;
    const samplePair = item.startAudioSample !== undefined || item.endAudioSampleExclusive !== undefined;
    if (framePair && (!Number.isSafeInteger(item.startFrame) || !Number.isSafeInteger(item.endFrameExclusive) || Number(item.startFrame) < 0 || Number(item.endFrameExclusive) <= Number(item.startFrame) || Number(item.endFrameExclusive) > numeric(artifact?.total_frames))) reasons.push("EVIDENCE_FRAME_RANGE_INVALID");
    if (samplePair && (!Number.isSafeInteger(item.startAudioSample) || !Number.isSafeInteger(item.endAudioSampleExclusive) || Number(item.startAudioSample) < 0 || Number(item.endAudioSampleExclusive) <= Number(item.startAudioSample) || Number(item.endAudioSampleExclusive) > numeric(artifact?.total_audio_samples))) reasons.push("EVIDENCE_AUDIO_RANGE_INVALID");
  }
  if (reasons.length) throw new FactoryRuntimeError("EVIDENCE_BUNDLE_BLOCKED", 409, "The exact-artifact evidence bundle is blocked", [...new Set(reasons)].sort());
  const normalizedItems = [...input.items].sort((left, right) => left.evidenceKey.localeCompare(right.evidenceKey)).map((item) => ({ ...item, storageKey: item.storageKey ?? null }));
  const manifest = { version: FACTORY_EVIDENCE_ASSURANCE_VERSION, videoId: input.videoId, artifactVersionId: input.artifactVersionId, canonicalTimebaseId: input.canonicalTimebaseId, exactArtifactHash: input.exactArtifactHash, sourceCommit: input.sourceCommit, deploymentVersion: input.deploymentVersion, runtimeVersion: input.runtimeVersion, items: normalizedItems };
  const manifestHash = await canonicalHash(manifest);
  const existing = await first(db, "SELECT * FROM factory_evidence_bundles WHERE bundle_key=?", input.bundleKey);
  if (existing) {
    if (clean(existing.manifest_hash) !== manifestHash) throw new FactoryRuntimeError("EVIDENCE_BUNDLE_IDEMPOTENCY_CONFLICT", 409, "The evidence bundle key is bound to another exact manifest");
    return { outcome: "IDEMPOTENT_REPLAY" as const, bundleId: clean(existing.id), manifestHash, coverageState: clean(existing.coverage_state), acceptanceAuthority: false };
  }
  const bundleId = deterministicId("factory-evidence-bundle", manifestHash);
  const coverageState = input.items.every((item) => item.observed) ? "COMPLETE" : "PARTIAL";
  const statements = [db.prepare(`INSERT INTO factory_evidence_bundles
    (id,bundle_key,video_id,artifact_version_id,canonical_timebase_id,exact_artifact_hash,source_commit,deployment_version,runtime_version,manifest_json,manifest_hash,coverage_state,lineage_state,r22_authority,master_authority,release_authority,publication_authority,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'CURRENT',0,0,0,0,?)`).bind(bundleId, input.bundleKey, input.videoId, input.artifactVersionId, input.canonicalTimebaseId, input.exactArtifactHash, input.sourceCommit, input.deploymentVersion, input.runtimeVersion, json(manifest), manifestHash, coverageState, input.evidenceHash)];
  for (const item of normalizedItems) {
    const itemHash = await canonicalHash({ version: FACTORY_EVIDENCE_ASSURANCE_VERSION, bundleId, item });
    statements.push(db.prepare(`INSERT INTO factory_evidence_items
      (id,bundle_id,evidence_key,evidence_type,assurance_layer,content_hash,storage_key,start_frame,end_frame_exclusive,start_audio_sample,end_audio_sample_exclusive,observation_state,provenance_json,evidence_hash)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(deterministicId("factory-evidence-item", itemHash), bundleId, item.evidenceKey, item.evidenceType, item.assuranceLayer, item.contentHash, item.storageKey, item.startFrame ?? null, item.endFrameExclusive ?? null, item.startAudioSample ?? null, item.endAudioSampleExclusive ?? null, item.observed ? "OBSERVED" : "UNOBSERVED", json(item.provenance), itemHash));
  }
  await db.batch(statements);
  return { outcome: "RECORDED" as const, bundleId, manifestHash, coverageState, itemCount: normalizedItems.length, acceptanceAuthority: false, r22Authority: false, providerRequests: 0, spendMicros: 0 };
}

export type FactoryAssuranceQualificationInput = {
  qualificationKey: string;
  assuranceLayer: AssuranceLayer;
  channelId: string;
  formatKey: string;
  decisionRole: "DETERMINISTIC_CHECKER" | "AI_JUDGE" | "BROWSER_AGENT" | "INDEPENDENT_ADJUDICATOR";
  providerBindingId?: string;
  providerQualificationId?: string;
  judgeVersion: string;
  modelVersion: string;
  promptHash: string;
  rubricHash: string;
  schemaHash: string;
  samplerHash: string;
  sampleSize: number;
  p0Recall: number;
  p1Recall: number;
  cleanPrecision: number;
  criticalFalseCleanCount: number;
  exactByteRepeatability: number;
  p0P1DecisionFlipCount: number;
  evidenceTimecodeValidity: number;
  structuredOutputValidity: number;
  qualifiedAt: string;
  expiresAt: string;
  evidenceHash: string;
};

export async function registerFactoryAssuranceJudgeQualification(db: FactoryRuntimeDB, input: FactoryAssuranceQualificationInput) {
  assertKey("QUALIFICATION_KEY", input.qualificationKey); assertLayer(input.assuranceLayer);
  for (const [label, value] of [["CHANNEL_ID", input.channelId], ["FORMAT_KEY", input.formatKey], ["JUDGE_VERSION", input.judgeVersion], ["MODEL_VERSION", input.modelVersion]] as const) assertIdentity(label, value);
  for (const [label, value] of [["PROMPT_HASH", input.promptHash], ["RUBRIC_HASH", input.rubricHash], ["SCHEMA_HASH", input.schemaHash], ["SAMPLER_HASH", input.samplerHash], ["EVIDENCE_HASH", input.evidenceHash]] as const) assertHash(label, value);
  for (const [label, value] of [["P0_RECALL", input.p0Recall], ["P1_RECALL", input.p1Recall], ["CLEAN_PRECISION", input.cleanPrecision], ["EXACT_BYTE_REPEATABILITY", input.exactByteRepeatability], ["EVIDENCE_TIMECODE_VALIDITY", input.evidenceTimecodeValidity], ["STRUCTURED_OUTPUT_VALIDITY", input.structuredOutputValidity]] as const) assertRatio(label, value);
  if (!Number.isSafeInteger(input.sampleSize) || input.sampleSize < 1 || !Number.isSafeInteger(input.criticalFalseCleanCount) || input.criticalFalseCleanCount < 0 || !Number.isSafeInteger(input.p0P1DecisionFlipCount) || input.p0P1DecisionFlipCount < 0 || !Number.isFinite(Date.parse(input.qualifiedAt)) || !Number.isFinite(Date.parse(input.expiresAt)) || input.expiresAt <= input.qualifiedAt) throw new FactoryRuntimeError("ASSURANCE_QUALIFICATION_INPUT_INVALID", 400, "The assurance qualification window or counts are invalid");
  const expectedRole = input.assuranceLayer === "L0" ? "DETERMINISTIC_CHECKER" : input.assuranceLayer === "L6" ? "BROWSER_AGENT" : input.assuranceLayer === "L7" ? "INDEPENDENT_ADJUDICATOR" : "AI_JUDGE";
  if (input.decisionRole !== expectedRole) throw new FactoryRuntimeError("ASSURANCE_QUALIFICATION_ROLE_MISMATCH", 409, `Layer ${input.assuranceLayer} requires role ${expectedRole}`);
  if ((input.providerBindingId === undefined) !== (input.providerQualificationId === undefined)) throw new FactoryRuntimeError("ASSURANCE_PROVIDER_QUALIFICATION_INCOMPLETE", 400, "Provider binding and qualification must be supplied together");
  if (input.providerBindingId && input.providerQualificationId) {
    assertIdentity("PROVIDER_BINDING_ID", input.providerBindingId); assertIdentity("PROVIDER_QUALIFICATION_ID", input.providerQualificationId);
    const provider = await first(db, `SELECT b.lifecycle_state binding_state,b.model_version,c.plane,q.lifecycle_state qualification_state,q.expires_at,
        (SELECT drift_state FROM factory_provider_drift_receipts d WHERE d.binding_id=b.id ORDER BY d.observed_at DESC,d.created_at DESC,d.id DESC LIMIT 1) drift_state
      FROM factory_provider_bindings b JOIN factory_capabilities c ON c.id=b.capability_id
      JOIN factory_capability_qualifications q ON q.id=? AND q.binding_id=b.id WHERE b.id=?`, input.providerQualificationId, input.providerBindingId);
    if (!provider || clean(provider.binding_state) !== "ACTIVE" || clean(provider.plane) !== "EVIDENCE_ASSURANCE" || clean(provider.qualification_state) !== "QUALIFIED" || (provider.expires_at && clean(provider.expires_at) <= input.qualifiedAt) || clean(provider.drift_state) === "STALE" || clean(provider.model_version) !== input.modelVersion) throw new FactoryRuntimeError("ASSURANCE_PROVIDER_QUALIFICATION_BLOCKED", 409, "The exact provider binding is not current and qualified for assurance");
  } else if (input.decisionRole === "AI_JUDGE" || input.decisionRole === "INDEPENDENT_ADJUDICATOR") {
    throw new FactoryRuntimeError("ASSURANCE_PROVIDER_BINDING_REQUIRED", 409, "AI judge and adjudicator qualifications require an exact provider binding");
  }
  const qualifies = input.p0Recall === 1 && input.p1Recall >= 0.95 && input.cleanPrecision >= 0.98 && input.criticalFalseCleanCount === 0 && input.exactByteRepeatability >= 0.95 && input.p0P1DecisionFlipCount === 0 && input.evidenceTimecodeValidity >= 0.95 && input.structuredOutputValidity === 1;
  const lifecycleState = qualifies ? "QUALIFIED" : "ADVISORY";
  const qualificationHash = await canonicalHash({ version: FACTORY_EVIDENCE_ASSURANCE_VERSION, ...input, lifecycleState, passAuthority: false });
  const existing = await first(db, "SELECT * FROM factory_assurance_judge_qualifications WHERE qualification_key=?", input.qualificationKey);
  if (existing) {
    if (clean(existing.qualification_hash) !== qualificationHash) throw new FactoryRuntimeError("ASSURANCE_QUALIFICATION_IDEMPOTENCY_CONFLICT", 409, "The qualification key is bound to another calibration result");
    return { outcome: "IDEMPOTENT_REPLAY" as const, qualificationId: clean(existing.id), lifecycleState: clean(existing.lifecycle_state), qualificationHash, passAuthority: false };
  }
  const qualificationId = deterministicId("factory-assurance-qualification", qualificationHash);
  await db.prepare(`INSERT INTO factory_assurance_judge_qualifications
    (id,qualification_key,assurance_layer,channel_id,format_key,decision_role,provider_binding_id,provider_qualification_id,judge_version,model_version,prompt_hash,rubric_hash,schema_hash,sampler_hash,sample_size,p0_recall,p1_recall,clean_precision,critical_false_clean_count,exact_byte_repeatability,p0_p1_decision_flip_count,evidence_timecode_validity,structured_output_validity,lifecycle_state,pass_authority,qualification_hash,evidence_hash,qualified_at,expires_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, ?,0,?,?,?,?)`).bind(qualificationId, input.qualificationKey, input.assuranceLayer, input.channelId, input.formatKey, input.decisionRole, input.providerBindingId ?? null, input.providerQualificationId ?? null, input.judgeVersion, input.modelVersion, input.promptHash, input.rubricHash, input.schemaHash, input.samplerHash, input.sampleSize, input.p0Recall, input.p1Recall, input.cleanPrecision, input.criticalFalseCleanCount, input.exactByteRepeatability, input.p0P1DecisionFlipCount, input.evidenceTimecodeValidity, input.structuredOutputValidity, lifecycleState, qualificationHash, input.evidenceHash, input.qualifiedAt, input.expiresAt).run();
  return { outcome: "RECORDED" as const, qualificationId, lifecycleState, qualificationHash, passAuthority: false, providerRequests: 0, spendMicros: 0 };
}

export type FactoryAssuranceDependencyObservation = { judgeVersion: string; modelVersion: string; promptHash: string; rubricHash: string; schemaHash: string; samplerHash: string };

export async function recordFactoryAssuranceDependencyDrift(db: FactoryRuntimeDB, input: { qualificationId: string; observationKey: string; observed: FactoryAssuranceDependencyObservation; observedAt: string; evidenceHash: string }) {
  assertIdentity("QUALIFICATION_ID", input.qualificationId); assertKey("OBSERVATION_KEY", input.observationKey); assertHash("EVIDENCE_HASH", input.evidenceHash);
  for (const [label, value] of [["JUDGE_VERSION", input.observed.judgeVersion], ["MODEL_VERSION", input.observed.modelVersion]] as const) assertIdentity(label, value);
  for (const [label, value] of [["PROMPT_HASH", input.observed.promptHash], ["RUBRIC_HASH", input.observed.rubricHash], ["SCHEMA_HASH", input.observed.schemaHash], ["SAMPLER_HASH", input.observed.samplerHash]] as const) assertHash(label, value);
  if (!Number.isFinite(Date.parse(input.observedAt))) throw new FactoryRuntimeError("ASSURANCE_DRIFT_OBSERVED_AT_INVALID", 400, "The assurance drift timestamp is invalid");
  const qualification = await first(db, "SELECT * FROM factory_assurance_judge_qualifications WHERE id=?", input.qualificationId);
  if (!qualification) throw new FactoryRuntimeError("ASSURANCE_QUALIFICATION_NOT_FOUND", 404, "The assurance qualification does not exist");
  const baseline: FactoryAssuranceDependencyObservation = { judgeVersion: clean(qualification.judge_version), modelVersion: clean(qualification.model_version), promptHash: clean(qualification.prompt_hash), rubricHash: clean(qualification.rubric_hash), schemaHash: clean(qualification.schema_hash), samplerHash: clean(qualification.sampler_hash) };
  const dimensions = (Object.keys(baseline) as (keyof FactoryAssuranceDependencyObservation)[]).filter((key) => baseline[key] !== input.observed[key]);
  const driftState = dimensions.length ? "STALE" : "CURRENT";
  const observationHash = await canonicalHash({ version: FACTORY_EVIDENCE_ASSURANCE_VERSION, qualificationId: input.qualificationId, baseline, observed: input.observed, dimensions, driftState, observedAt: input.observedAt });
  const existing = await first(db, "SELECT * FROM factory_assurance_drift_receipts WHERE observation_key=?", input.observationKey);
  if (existing) {
    if (clean(existing.observation_hash) !== observationHash) throw new FactoryRuntimeError("ASSURANCE_DRIFT_IDEMPOTENCY_CONFLICT", 409, "The observation key is bound to another dependency observation");
    return { outcome: "IDEMPOTENT_REPLAY" as const, driftReceiptId: clean(existing.id), driftState: clean(existing.drift_state), observationHash, passAuthority: false };
  }
  const driftReceiptId = deterministicId("factory-assurance-drift", observationHash);
  await db.prepare(`INSERT INTO factory_assurance_drift_receipts
    (id,qualification_id,observation_key,baseline_json,observed_json,drift_dimensions_json,drift_state,invalidates_qualification,pass_authority,observation_hash,evidence_hash,observed_at)
    VALUES (?,?,?,?,?,?,?,?,0,?,?,?)`).bind(driftReceiptId, input.qualificationId, input.observationKey, json(baseline), json(input.observed), json(dimensions), driftState, driftState === "STALE" ? 1 : 0, observationHash, input.evidenceHash, input.observedAt).run();
  return { outcome: "RECORDED" as const, driftReceiptId, driftState, driftDimensions: dimensions, invalidatesQualification: driftState === "STALE", observationHash, passAuthority: false };
}

export type FactoryAssuranceRunInput = {
  runKey: string;
  videoId: string;
  channelId: string;
  formatKey: string;
  evidenceBundleId: string;
  exactArtifactHash: string;
  policyVersion: string;
  standardVersion: string;
  requiredLayers: AssuranceLayer[];
  producerId: string;
  rightsState: "PASS" | "FAIL" | "UNKNOWN";
  costReconciliationState: "RECONCILED" | "UNRECONCILED" | "UNKNOWN_SPEND_RESERVED";
  activeProviderRequests: number;
  evidenceHash: string;
};

export async function startFactoryAssuranceRun(db: FactoryRuntimeDB, input: FactoryAssuranceRunInput) {
  assertKey("RUN_KEY", input.runKey); assertHash("EXACT_ARTIFACT_HASH", input.exactArtifactHash); assertHash("EVIDENCE_HASH", input.evidenceHash);
  for (const [label, value] of [["VIDEO_ID", input.videoId], ["CHANNEL_ID", input.channelId], ["FORMAT_KEY", input.formatKey], ["EVIDENCE_BUNDLE_ID", input.evidenceBundleId], ["POLICY_VERSION", input.policyVersion], ["STANDARD_VERSION", input.standardVersion], ["PRODUCER_ID", input.producerId]] as const) assertIdentity(label, value);
  if (!Number.isSafeInteger(input.activeProviderRequests) || input.activeProviderRequests < 0) throw new FactoryRuntimeError("ASSURANCE_ACTIVE_REQUEST_COUNT_INVALID", 400, "Active provider requests must be a non-negative integer");
  const layers = [...new Set(input.requiredLayers)].sort();
  for (const layer of layers) assertLayer(layer);
  if (json(layers) !== json(FACTORY_ASSURANCE_LAYERS)) throw new FactoryRuntimeError("ASSURANCE_LAYER_COVERAGE_INCOMPLETE", 409, "A full Production assurance run requires L0-L7 exactly once");
  const bundle = await first(db, `SELECT b.*,a.lifecycle_state artifact_state,
      (SELECT COUNT(*) FROM factory_dependency_bindings d JOIN factory_dependency_invalidations i ON i.dependency_binding_id=d.id WHERE d.downstream_artifact_version_id=b.artifact_version_id) invalidation_count
    FROM factory_evidence_bundles b JOIN factory_artifact_versions a ON a.id=b.artifact_version_id WHERE b.id=?`, input.evidenceBundleId);
  const reasons: string[] = [];
  if (!bundle) reasons.push("EVIDENCE_BUNDLE_NOT_FOUND");
  if (bundle) {
    if (clean(bundle.video_id) !== input.videoId) reasons.push("EVIDENCE_BUNDLE_VIDEO_MISMATCH");
    if (clean(bundle.exact_artifact_hash) !== input.exactArtifactHash) reasons.push("EXACT_ARTIFACT_HASH_MISMATCH");
    if (clean(bundle.lineage_state) !== "CURRENT" || clean(bundle.artifact_state) !== "FROZEN" || numeric(bundle.invalidation_count) > 0) reasons.push("EVIDENCE_LINEAGE_STALE");
  }
  if (reasons.length) throw new FactoryRuntimeError("ASSURANCE_RUN_BLOCKED", 409, "The assurance run is blocked", reasons);
  const intent = { version: FACTORY_EVIDENCE_ASSURANCE_VERSION, ...input, requiredLayers: layers, automationMode: "AI_SHADOW", acceptanceAuthority: false };
  const intentHash = await canonicalHash(intent);
  const existing = await first(db, "SELECT * FROM factory_assurance_runs WHERE run_key=?", input.runKey);
  if (existing) {
    if (clean(existing.intent_hash) !== intentHash) throw new FactoryRuntimeError("ASSURANCE_RUN_IDEMPOTENCY_CONFLICT", 409, "The assurance run key is bound to another exact intent");
    return { outcome: "IDEMPOTENT_REPLAY" as const, runId: clean(existing.id), intentHash, acceptanceAuthority: false };
  }
  const runId = deterministicId("factory-assurance-run", intentHash);
  await db.prepare(`INSERT INTO factory_assurance_runs
    (id,run_key,video_id,channel_id,format_key,evidence_bundle_id,exact_artifact_hash,policy_version,standard_version,automation_mode,required_layers_json,producer_id,rights_state,cost_reconciliation_state,active_provider_requests,lifecycle_state,acceptance_authority,r22_authority,master_authority,release_authority,publication_authority,intent_hash,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,'AI_SHADOW',?,?,?,?,?,'STARTED',0,0,0,0,0,?,?)`).bind(runId, input.runKey, input.videoId, input.channelId, input.formatKey, input.evidenceBundleId, input.exactArtifactHash, input.policyVersion, input.standardVersion, json(layers), input.producerId, input.rightsState, input.costReconciliationState, input.activeProviderRequests, intentHash, input.evidenceHash).run();
  return { outcome: "STARTED_AI_SHADOW" as const, runId, intentHash, acceptanceAuthority: false, r22Authority: false, providerRequests: 0, spendMicros: 0 };
}

export type FactoryAssuranceLayerReceiptInput = {
  runId: string;
  assuranceLayer: AssuranceLayer;
  qualificationId: string;
  observerId: string;
  exactArtifactHash: string;
  outcome: "PASS" | "FAIL" | "INCOMPLETE" | "ADVISORY";
  score?: number;
  p0Count: number;
  p1Count: number;
  p2Count: number;
  p3Count: number;
  confidence?: number;
  findings: Record<string, unknown>[];
  evidenceRefs: string[];
  unobservedDimensions: string[];
  providerResponseId?: string;
  rawResponseHash?: string;
  usage?: Record<string, unknown>;
  actualSpendMicros?: number;
  evidenceHash: string;
  observedAt: string;
};

export async function recordFactoryAssuranceLayerReceipt(db: FactoryRuntimeDB, input: FactoryAssuranceLayerReceiptInput) {
  assertIdentity("RUN_ID", input.runId); assertLayer(input.assuranceLayer); assertIdentity("QUALIFICATION_ID", input.qualificationId); assertIdentity("OBSERVER_ID", input.observerId);
  assertHash("EXACT_ARTIFACT_HASH", input.exactArtifactHash); assertHash("EVIDENCE_HASH", input.evidenceHash);
  if (input.rawResponseHash !== undefined) assertHash("RAW_RESPONSE_HASH", input.rawResponseHash);
  if (!Number.isFinite(Date.parse(input.observedAt))) throw new FactoryRuntimeError("ASSURANCE_OBSERVED_AT_INVALID", 400, "The layer observation timestamp is invalid");
  for (const [label, value] of [["P0_COUNT", input.p0Count], ["P1_COUNT", input.p1Count], ["P2_COUNT", input.p2Count], ["P3_COUNT", input.p3Count], ["ACTUAL_SPEND_MICROS", input.actualSpendMicros ?? 0]] as const) if (!Number.isSafeInteger(value) || value < 0) throw new FactoryRuntimeError("ASSURANCE_LAYER_COUNT_INVALID", 400, `${label} must be a non-negative integer`);
  if (input.score !== undefined && (!Number.isFinite(input.score) || input.score < 0 || input.score > 100)) throw new FactoryRuntimeError("ASSURANCE_LAYER_SCORE_INVALID", 400, "Layer score must be between zero and 100");
  if (input.confidence !== undefined) assertRatio("CONFIDENCE", input.confidence);
  if (!Array.isArray(input.findings) || !Array.isArray(input.evidenceRefs) || !Array.isArray(input.unobservedDimensions)) throw new FactoryRuntimeError("ASSURANCE_LAYER_RECEIPT_INVALID", 400, "Findings, evidence references and unobserved dimensions must be arrays");
  if (input.outcome === "PASS" && (input.p0Count > 0 || input.p1Count > 0 || input.score === undefined || input.confidence === undefined || input.unobservedDimensions.length > 0)) throw new FactoryRuntimeError("ASSURANCE_LAYER_PASS_INVALID", 409, "PASS cannot hide P0/P1 or unobserved dimensions and requires score and confidence");
  if (input.outcome === "INCOMPLETE" && input.unobservedDimensions.length === 0) throw new FactoryRuntimeError("ASSURANCE_INCOMPLETE_WITHOUT_GAP", 409, "INCOMPLETE requires explicit unobserved dimensions");
  if (input.outcome === "FAIL" && input.findings.length === 0) throw new FactoryRuntimeError("ASSURANCE_FAIL_WITHOUT_FINDING", 409, "FAIL requires at least one finding");
  const row = await first(db, `SELECT r.*,q.assurance_layer qualification_layer,q.channel_id qualification_channel_id,q.format_key qualification_format_key,q.lifecycle_state qualification_state,q.expires_at,
      (SELECT drift_state FROM factory_assurance_drift_receipts d WHERE d.qualification_id=q.id ORDER BY d.observed_at DESC,d.created_at DESC,d.id DESC LIMIT 1) drift_state
    FROM factory_assurance_runs r JOIN factory_assurance_judge_qualifications q ON q.id=? WHERE r.id=?`, input.qualificationId, input.runId);
  const reasons: string[] = [];
  if (!row) reasons.push("ASSURANCE_RUN_OR_QUALIFICATION_NOT_FOUND");
  if (row) {
    if (clean(row.exact_artifact_hash) !== input.exactArtifactHash) reasons.push("EXACT_ARTIFACT_HASH_MISMATCH");
    if (clean(row.qualification_layer) !== input.assuranceLayer) reasons.push("QUALIFICATION_LAYER_MISMATCH");
    if (clean(row.qualification_channel_id) !== clean(row.channel_id) || clean(row.qualification_format_key) !== clean(row.format_key)) reasons.push("QUALIFICATION_SCOPE_MISMATCH");
    if (input.outcome === "PASS" && clean(row.producer_id) === input.observerId) reasons.push("PRODUCER_CANNOT_PASS_OWN_OUTPUT");
    if (input.outcome === "PASS" && (clean(row.qualification_state) !== "QUALIFIED" || clean(row.drift_state) === "STALE" || clean(row.expires_at) <= input.observedAt)) reasons.push("QUALIFICATION_NOT_CURRENT");
  }
  for (const evidenceKey of input.evidenceRefs) {
    assertKey("EVIDENCE_REF", evidenceKey);
    const evidence = await first(db, `SELECT i.id FROM factory_evidence_items i JOIN factory_assurance_runs r ON r.evidence_bundle_id=i.bundle_id
      WHERE r.id=? AND i.evidence_key=? AND i.assurance_layer=? AND i.observation_state='OBSERVED'`, input.runId, evidenceKey, input.assuranceLayer);
    if (!evidence) reasons.push(`EVIDENCE_REF_NOT_OBSERVED:${evidenceKey}`);
  }
  if (reasons.length) throw new FactoryRuntimeError("ASSURANCE_LAYER_RECEIPT_BLOCKED", 409, "The assurance layer receipt is blocked", [...new Set(reasons)].sort());
  const normalized = { version: FACTORY_EVIDENCE_ASSURANCE_VERSION, ...input, usage: input.usage ?? {}, actualSpendMicros: input.actualSpendMicros ?? 0 };
  const receiptHash = await canonicalHash(normalized);
  const existing = await first(db, "SELECT * FROM factory_assurance_layer_receipts WHERE run_id=? AND assurance_layer=?", input.runId, input.assuranceLayer);
  if (existing) {
    if (clean(existing.receipt_hash) !== receiptHash) throw new FactoryRuntimeError("ASSURANCE_LAYER_RECEIPT_CONFLICT", 409, "The run already has a different receipt for this layer");
    return { outcome: "IDEMPOTENT_REPLAY" as const, receiptId: clean(existing.id), receiptHash, passAuthority: false };
  }
  const receiptId = deterministicId("factory-assurance-layer", receiptHash);
  await db.prepare(`INSERT INTO factory_assurance_layer_receipts
    (id,run_id,assurance_layer,qualification_id,observer_id,exact_artifact_hash,outcome,score,p0_count,p1_count,p2_count,p3_count,confidence,findings_json,evidence_refs_json,unobserved_dimensions_json,provider_response_id,raw_response_hash,usage_json,actual_spend_micros,pass_authority,receipt_hash,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)`).bind(receiptId, input.runId, input.assuranceLayer, input.qualificationId, input.observerId, input.exactArtifactHash, input.outcome, input.score ?? null, input.p0Count, input.p1Count, input.p2Count, input.p3Count, input.confidence ?? null, json(input.findings), json(input.evidenceRefs), json(input.unobservedDimensions), input.providerResponseId ?? null, input.rawResponseHash ?? null, json(input.usage ?? {}), input.actualSpendMicros ?? 0, receiptHash, input.evidenceHash).run();
  return { outcome: "RECORDED" as const, receiptId, receiptHash, layerOutcome: input.outcome, passAuthority: false };
}

export type FactoryAssuranceDecisionInput = {
  runId: string;
  decisionKey: string;
  exactArtifactHash: string;
  overallScore?: number;
  adjudicatorConfidence?: number;
  criticalDimensionScores: Record<string, number>;
  criticalDimensionFloors: Record<string, number>;
  disagreement: string[];
  rootOwner: string;
  evidenceHash: string;
};

export async function adjudicateFactoryAssuranceRun(db: FactoryRuntimeDB, input: FactoryAssuranceDecisionInput) {
  assertIdentity("RUN_ID", input.runId); assertKey("DECISION_KEY", input.decisionKey); assertHash("EXACT_ARTIFACT_HASH", input.exactArtifactHash); assertIdentity("ROOT_OWNER", input.rootOwner); assertHash("EVIDENCE_HASH", input.evidenceHash);
  if (input.overallScore !== undefined && (!Number.isFinite(input.overallScore) || input.overallScore < 0 || input.overallScore > 100)) throw new FactoryRuntimeError("ASSURANCE_DECISION_SCORE_INVALID", 400, "Overall score must be between zero and 100");
  if (input.adjudicatorConfidence !== undefined) assertRatio("ADJUDICATOR_CONFIDENCE", input.adjudicatorConfidence);
  const run = await first(db, "SELECT * FROM factory_assurance_runs WHERE id=?", input.runId);
  if (!run) throw new FactoryRuntimeError("ASSURANCE_RUN_NOT_FOUND", 404, "The assurance run does not exist");
  if (clean(run.exact_artifact_hash) !== input.exactArtifactHash) throw new FactoryRuntimeError("ASSURANCE_EXACT_ARTIFACT_MISMATCH", 409, "The decision is not bound to the run's exact artifact");
  const receipts = await rows(db, `SELECT r.*,
      q.lifecycle_state qualification_state,q.expires_at,
      (SELECT drift_state FROM factory_assurance_drift_receipts d WHERE d.qualification_id=q.id ORDER BY d.observed_at DESC,d.created_at DESC,d.id DESC LIMIT 1) drift_state
    FROM factory_assurance_layer_receipts r JOIN factory_assurance_judge_qualifications q ON q.id=r.qualification_id WHERE r.run_id=? ORDER BY r.assurance_layer`, input.runId);
  const receiptByLayer = new Map(receipts.map((receipt) => [clean(receipt.assurance_layer), receipt]));
  const missingLayers = FACTORY_ASSURANCE_LAYERS.filter((layer) => !receiptByLayer.has(layer));
  const reasons: string[] = [];
  const contentFailure = receipts.some((receipt) => clean(receipt.outcome) === "FAIL" || numeric(receipt.p0_count) > 0 || numeric(receipt.p1_count) > 0) || clean(run.rights_state) === "FAIL";
  const incomplete = missingLayers.length > 0 || receipts.some((receipt) => clean(receipt.outcome) === "INCOMPLETE") || clean(run.rights_state) === "UNKNOWN" || clean(run.cost_reconciliation_state) !== "RECONCILED" || numeric(run.active_provider_requests) > 0;
  const staleOrAdvisory = receipts.some((receipt) => clean(receipt.outcome) === "ADVISORY" || clean(receipt.qualification_state) !== "QUALIFIED" || clean(receipt.drift_state) === "STALE");
  const unobserved = receipts.some((receipt) => { try { return JSON.parse(clean(receipt.unobserved_dimensions_json)).length > 0; } catch { return true; } });
  const dimensionsMeetFloor = Object.entries(input.criticalDimensionFloors).every(([key, floor]) => Number.isFinite(floor) && floor >= 90 && Number(input.criticalDimensionScores[key]) >= floor);
  let candidateOutcome: "AI_ACCEPTED" | "CONTENT_REJECTED" | "HUMAN_ESCALATION_REQUIRED" | "ASSURANCE_INCOMPLETE";
  if (contentFailure) { candidateOutcome = "CONTENT_REJECTED"; reasons.push("PROVED_CONTENT_OR_HARD_GATE_FAILURE"); }
  else if (incomplete) { candidateOutcome = "ASSURANCE_INCOMPLETE"; reasons.push("REQUIRED_ASSURANCE_EVIDENCE_INCOMPLETE"); }
  else if (staleOrAdvisory || unobserved || input.disagreement.length > 0) { candidateOutcome = "HUMAN_ESCALATION_REQUIRED"; reasons.push("QUALIFICATION_DISAGREEMENT_OR_OBSERVATION_REQUIRES_HUMAN"); }
  else if ((input.overallScore ?? -1) < 92 || (input.adjudicatorConfidence ?? -1) < 0.92 || !dimensionsMeetFloor) { candidateOutcome = "CONTENT_REJECTED"; reasons.push("ACTIVE_STANDARD_THRESHOLD_NOT_MET"); }
  else candidateOutcome = "AI_ACCEPTED";
  const outcome = candidateOutcome === "AI_ACCEPTED" ? "HUMAN_ESCALATION_REQUIRED" : candidateOutcome;
  if (candidateOutcome === "AI_ACCEPTED") reasons.push("AUTO_ACCEPT_AUTHORITY_NOT_QUALIFIED");
  const normalized = { version: FACTORY_EVIDENCE_ASSURANCE_VERSION, ...input, candidateOutcome, outcome, missingLayers, reasons, maximumRootRevisions: 1, acceptanceAuthority: "ADVISORY_ONLY" };
  const decisionHash = await canonicalHash(normalized);
  const existing = await first(db, "SELECT * FROM factory_assurance_decision_receipts WHERE decision_key=?", input.decisionKey);
  if (existing) {
    if (clean(existing.decision_hash) !== decisionHash) throw new FactoryRuntimeError("ASSURANCE_DECISION_IDEMPOTENCY_CONFLICT", 409, "The decision key is bound to another verdict");
    return { outcome: "IDEMPOTENT_REPLAY" as const, decisionReceiptId: clean(existing.id), decision: clean(existing.outcome), candidateOutcome: clean(existing.candidate_outcome), decisionHash, acceptanceAuthority: "ADVISORY_ONLY" as const };
  }
  const decisionReceiptId = deterministicId("factory-assurance-decision", decisionHash);
  await db.prepare(`INSERT INTO factory_assurance_decision_receipts
    (id,run_id,decision_key,exact_artifact_hash,candidate_outcome,outcome,overall_score,adjudicator_confidence,critical_dimension_scores_json,missing_layers_json,disagreement_json,reasons_json,root_owner,maximum_root_revisions,acceptance_authority,release_ready_authority,publication_authority,decision_hash,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1,'ADVISORY_ONLY',0,0,?,?)`).bind(decisionReceiptId, input.runId, input.decisionKey, input.exactArtifactHash, candidateOutcome, outcome, input.overallScore ?? null, input.adjudicatorConfidence ?? null, json(input.criticalDimensionScores), json(missingLayers), json(input.disagreement), json(reasons), input.rootOwner, decisionHash, input.evidenceHash).run();
  return { outcome: "RECORDED" as const, decisionReceiptId, decision: outcome, candidateOutcome, missingLayers, reasons, decisionHash, acceptanceAuthority: "ADVISORY_ONLY" as const, releaseReadyAuthority: false, publicationAuthority: false, providerRequests: 0, spendMicros: 0 };
}
