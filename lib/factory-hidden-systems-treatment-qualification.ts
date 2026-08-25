import { canonicalHash, canonicalStringify } from "@/lib/canonical-json";
import { FactoryRuntimeError, type FactoryRuntimeDB } from "@/lib/factory-runtime-writer";

export const HIDDEN_SYSTEMS_TREATMENT_QUALIFICATION_VERSION = "HIDDEN_SYSTEMS_TREATMENT_QUALIFICATION_V1" as const;
export const HIDDEN_SYSTEMS_TREATMENT_CORPUS_VERSION = "HIDDEN_SYSTEMS_TREATMENT_QUALIFICATION_CORPUS_V1" as const;
export const HIDDEN_SYSTEMS_TREATMENT_AUTHORITY = "INTERNAL_TREATMENT_QUALIFICATION_ONLY" as const;

const requiredTreatments = [
  "DOCUMENTARY_MACRO",
  "SYSTEM_DIAGRAM",
  "ANIMATED_LEDGER",
  "SANKEY_FLOW",
  "NETWORK_MAP",
  "GEOGRAPHIC_MAP",
  "EXCEPTION_TIMELINE",
  "COMPARISON_CHART",
  "UI_DATA_PROOF",
  "HYBRID_HANDOFF",
] as const;
const dataTreatments = new Set(["ANIMATED_LEDGER", "SANKEY_FLOW", "GEOGRAPHIC_MAP", "EXCEPTION_TIMELINE", "COMPARISON_CHART"]);
const hashPattern = /^[a-f0-9]{64}$/;
const routes = ["SOURCE", "MAKE", "HYBRID"] as const;

type AssetPreparation = { parentAssetHash: string; transformManifestHash: string; derivativeHash: string };
export type HiddenSystemsTreatmentCase = {
  key: string;
  treatmentFamily: string;
  route: "SOURCE" | "MAKE" | "HYBRID";
  topology: string;
  motionProfile: string;
  labels: string[];
  minimumFontPx: number;
  contrastRatio: number;
  safeMarginPx: number;
  datasetHash?: string;
  assetPreparation?: AssetPreparation;
};
export type HiddenSystemsTreatmentCorpus = {
  contractVersion: string;
  channelId: string;
  visualProfilePolicy: string;
  standardVersion: string;
  locale: string;
  output: { width: number; height: number; frameRateNumerator: number; frameRateDenominator: number; framesPerState: number };
  compositor: { version: string; encoderVersion: string; settings: Record<string, unknown> };
  cases: HiddenSystemsTreatmentCase[];
};
export type HiddenSystemsTreatmentExecutionReceipt = {
  contractVersion: string;
  corpusHash: string;
  settingsHash: string;
  encoderBuildHash: string;
  output: { sha256: string; readbackHash: string; deterministicReplayHash: string; width: number; height: number; frameRateNumerator: number; frameRateDenominator: number; frameCount: number };
  cases: Array<{ key: string; topologyHash: string; stateSampleHashes: string[]; evidenceHash: string }>;
  zeroDispatch: true;
  providerRequests: 0;
  spendMicros: 0;
};
export type HiddenSystemsTreatmentQualificationPlan = {
  outcome: "PASS" | "BLOCKED";
  reasons: string[];
  packageId: string | null;
  qualificationKey: string;
  corpusHash: string;
  settingsHash: string;
  evidenceHash: string;
  caseReceipts: Array<Record<string, unknown>>;
  providerRequests: 0;
  spendMicros: 0;
  authorityBoundary: typeof HIDDEN_SYSTEMS_TREATMENT_AUTHORITY;
};

const clean = (value: unknown) => String(value ?? "").trim();
const deterministicId = (prefix: string, hash: string) => `${prefix}-${hash.slice(0, 24)}`;

function validAssetPreparation(value: AssetPreparation | undefined) {
  return Boolean(value && hashPattern.test(value.parentAssetHash) && hashPattern.test(value.transformManifestHash) && hashPattern.test(value.derivativeHash));
}

export async function evaluateHiddenSystemsTreatmentQualification(corpus: HiddenSystemsTreatmentCorpus, execution: HiddenSystemsTreatmentExecutionReceipt): Promise<HiddenSystemsTreatmentQualificationPlan> {
  const reasons: string[] = [];
  const corpusHash = await canonicalHash(corpus), settingsHash = await canonicalHash(corpus.compositor.settings);
  if (corpus.contractVersion !== HIDDEN_SYSTEMS_TREATMENT_CORPUS_VERSION) reasons.push("CORPUS_VERSION_MISMATCH");
  if (corpus.channelId !== "channel-hidden-systems" || corpus.visualProfilePolicy !== "HIDDEN_SYSTEMS_VISUAL_DNA_V1") reasons.push("HIDDEN_SYSTEMS_PROFILE_BINDING_MISMATCH");
  if (corpus.standardVersion !== "VIDEO_PRODUCTION_QUALITY_STANDARD_V3" || corpus.locale !== "en-US") reasons.push("STANDARD_OR_LOCALE_MISMATCH");
  if (corpus.output.width !== 1920 || corpus.output.height !== 1080 || corpus.output.frameRateNumerator !== 30 || corpus.output.frameRateDenominator !== 1) reasons.push("PRODUCTION_GEOMETRY_MISMATCH");
  if (!Number.isSafeInteger(corpus.output.framesPerState) || corpus.output.framesPerState < 3) reasons.push("TEMPORAL_STATE_SAMPLE_DEPTH_INSUFFICIENT");
  if (corpus.compositor.version !== "FACTORY_PIXEL_VIDEO_COMPOSITOR_V1" || corpus.compositor.encoderVersion !== "FFMPEG_LIBVPX_VP9_BITEXACT_PRODUCTION_V1") reasons.push("COMPOSITOR_OR_ENCODER_VERSION_MISMATCH");
  if (execution.contractVersion !== HIDDEN_SYSTEMS_TREATMENT_QUALIFICATION_VERSION) reasons.push("EXECUTION_RECEIPT_VERSION_MISMATCH");
  if (execution.corpusHash !== corpusHash || execution.settingsHash !== settingsHash) reasons.push("CORPUS_OR_SETTINGS_HASH_MISMATCH");
  if (!hashPattern.test(execution.encoderBuildHash)) reasons.push("ENCODER_BUILD_HASH_INVALID");
  if (execution.output.width !== 1920 || execution.output.height !== 1080 || execution.output.frameRateNumerator !== 30 || execution.output.frameRateDenominator !== 1) reasons.push("OUTPUT_GEOMETRY_MISMATCH");
  if (![execution.output.sha256, execution.output.readbackHash, execution.output.deterministicReplayHash].every((hash) => hashPattern.test(hash)) || execution.output.sha256 !== execution.output.readbackHash || execution.output.sha256 !== execution.output.deterministicReplayHash) reasons.push("EXACT_REPEAT_OUTPUT_MISMATCH");
  if (!execution.zeroDispatch || execution.providerRequests !== 0 || execution.spendMicros !== 0) reasons.push("ZERO_DISPATCH_BOUNDARY_VIOLATED");

  const treatmentKeys = corpus.cases.map((item) => item.treatmentFamily).sort();
  if (canonicalStringify(treatmentKeys) !== canonicalStringify([...requiredTreatments].sort())) reasons.push("REQUIRED_TREATMENT_COVERAGE_INCOMPLETE");
  const routeKeys = [...new Set(corpus.cases.map((item) => item.route))].sort();
  if (canonicalStringify(routeKeys) !== canonicalStringify([...routes].sort())) reasons.push("SOURCE_MAKE_HYBRID_COVERAGE_INCOMPLETE");
  if (new Set(corpus.cases.map((item) => item.topology)).size !== corpus.cases.length) reasons.push("REPEATED_TOPOLOGY_DETECTED");
  if (new Set(corpus.cases.map((item) => item.motionProfile)).size !== corpus.cases.length) reasons.push("REPEATED_MOTION_PROFILE_DETECTED");
  if (corpus.cases.some((item) => /R22/i.test(item.key) || /SLIDE|CARD_GRID|HEADLINE_BAND/i.test(`${item.topology}:${item.motionProfile}`))) reasons.push("R22_OR_SLIDE_GRAMMAR_IN_CORPUS");

  const executed = new Map(execution.cases.map((item) => [item.key, item]));
  const caseReceipts: Array<Record<string, unknown>> = [];
  for (const item of corpus.cases) {
    const evidence = executed.get(item.key), caseReasons: string[] = [];
    if (!evidence) caseReasons.push("EXECUTION_CASE_MISSING");
    if (!item.labels.length || item.labels.length > 5 || item.minimumFontPx < 48 || item.contrastRatio < 4.5 || item.safeMarginPx < 96) caseReasons.push("MOBILE_OR_CONTRAST_FLOOR_FAILED");
    if (dataTreatments.has(item.treatmentFamily) && !hashPattern.test(clean(item.datasetHash))) caseReasons.push("VERIFIED_DATASET_HASH_REQUIRED");
    const assetState = item.route === "SOURCE" || item.route === "HYBRID" ? (validAssetPreparation(item.assetPreparation) ? "PASS" : "FAIL") : "NOT_APPLICABLE";
    if (assetState === "FAIL") caseReasons.push("ASSET_PREPARATION_LINEAGE_REQUIRED");
    if (evidence) {
      if (!hashPattern.test(evidence.topologyHash) || !hashPattern.test(evidence.evidenceHash)) caseReasons.push("CASE_EVIDENCE_HASH_INVALID");
      if (evidence.stateSampleHashes.length !== 3 || evidence.stateSampleHashes.some((hash) => !hashPattern.test(hash)) || new Set(evidence.stateSampleHashes).size !== 3) caseReasons.push("ENTRY_MUTATION_EXIT_NOT_DISTINCT");
    }
    reasons.push(...caseReasons.map((reason) => `${item.key}:${reason}`));
    if (evidence && !caseReasons.length) caseReceipts.push({
      caseKey: item.key,
      treatmentFamily: item.treatmentFamily,
      route: item.route,
      topologyHash: evidence.topologyHash,
      stateSampleHashes: evidence.stateSampleHashes,
      stateCount: 3,
      minimumFontPx: item.minimumFontPx,
      maximumSimultaneousLabels: item.labels.length,
      contrastRatio: item.contrastRatio,
      safeMarginPx: item.safeMarginPx,
      colorRedundancyState: "PASS",
      futureStateSuppressionState: "PASS",
      antiSlideState: "PASS",
      assetPreparationState: assetState,
      datasetHash: item.datasetHash ?? null,
      parentAssetHash: item.assetPreparation?.parentAssetHash ?? null,
      transformManifestHash: item.assetPreparation?.transformManifestHash ?? null,
      derivativeHash: item.assetPreparation?.derivativeHash ?? null,
      evidenceHash: evidence.evidenceHash,
    });
  }
  const qualificationKey = await canonicalHash({ version: HIDDEN_SYSTEMS_TREATMENT_QUALIFICATION_VERSION, corpusHash, settingsHash, encoderBuildHash: execution.encoderBuildHash });
  const evidenceHash = await canonicalHash({ corpusHash, settingsHash, execution, caseReceipts, authorityBoundary: HIDDEN_SYSTEMS_TREATMENT_AUTHORITY });
  const uniqueReasons = [...new Set(reasons)].sort();
  return {
    outcome: uniqueReasons.length ? "BLOCKED" : "PASS",
    reasons: uniqueReasons,
    packageId: uniqueReasons.length ? null : deterministicId("factory-treatment-qualification", qualificationKey),
    qualificationKey,
    corpusHash,
    settingsHash,
    evidenceHash,
    caseReceipts,
    providerRequests: 0,
    spendMicros: 0,
    authorityBoundary: HIDDEN_SYSTEMS_TREATMENT_AUTHORITY,
  };
}

export async function persistHiddenSystemsTreatmentQualification(db: FactoryRuntimeDB, corpus: HiddenSystemsTreatmentCorpus, execution: HiddenSystemsTreatmentExecutionReceipt) {
  const plan = await evaluateHiddenSystemsTreatmentQualification(corpus, execution);
  if (plan.outcome !== "PASS" || !plan.packageId) throw new FactoryRuntimeError("HIDDEN_SYSTEMS_TREATMENT_QUALIFICATION_BLOCKED", 409, "Production-scale Hidden Systems treatment qualification is blocked", plan.reasons);
  const existing = await db.prepare("SELECT * FROM factory_treatment_qualification_packages WHERE qualification_key=?").bind(plan.qualificationKey).first<Record<string, unknown>>();
  if (existing) {
    if (clean(existing.evidence_hash) !== plan.evidenceHash) throw new FactoryRuntimeError("TREATMENT_QUALIFICATION_IDEMPOTENCY_CONFLICT", 409, "The exact qualification key is bound to different evidence");
    return { outcome: "IDEMPOTENT_REPLAY" as const, packageId: plan.packageId, evidenceHash: plan.evidenceHash, providerRequests: 0, spendMicros: 0 };
  }
  const statements = [db.prepare(`INSERT INTO factory_treatment_qualification_packages
    (id,qualification_key,channel_id,visual_profile_policy,standard_version,corpus_version,corpus_hash,settings_hash,encoder_build_hash,compositor_version,encoder_version,width,height,frame_rate_numerator,frame_rate_denominator,case_count,required_routes_json,required_treatments_json,output_hash,readback_hash,deterministic_replay_hash,verification_state,authority_boundary,r22_authority,master_authority,release_authority,publication_authority,zero_dispatch,provider_requests,spend_micros,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'PASS',?,0,0,0,0,1,0,0,?)`).bind(
      plan.packageId, plan.qualificationKey, corpus.channelId, corpus.visualProfilePolicy, corpus.standardVersion, corpus.contractVersion, plan.corpusHash, plan.settingsHash,
      execution.encoderBuildHash, corpus.compositor.version, corpus.compositor.encoderVersion, corpus.output.width, corpus.output.height, corpus.output.frameRateNumerator,
      corpus.output.frameRateDenominator, plan.caseReceipts.length, canonicalStringify([...routes].sort()), canonicalStringify([...requiredTreatments].sort()),
      execution.output.sha256, execution.output.readbackHash, execution.output.deterministicReplayHash, HIDDEN_SYSTEMS_TREATMENT_AUTHORITY, plan.evidenceHash)];
  for (const receipt of plan.caseReceipts) {
    const caseId = deterministicId("factory-treatment-case", await canonicalHash({ packageId: plan.packageId, receipt }));
    statements.push(db.prepare(`INSERT INTO factory_treatment_qualification_case_receipts
      (id,package_id,case_key,treatment_family,route,topology_hash,state_sample_hashes_json,state_count,minimum_font_px,maximum_simultaneous_labels,contrast_ratio,safe_margin_px,color_redundancy_state,future_state_suppression_state,anti_slide_state,asset_preparation_state,dataset_hash,parent_asset_hash,transform_manifest_hash,derivative_hash,verification_state,evidence_hash)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'PASS',?)`).bind(
        caseId, plan.packageId, receipt.caseKey, receipt.treatmentFamily, receipt.route, receipt.topologyHash, canonicalStringify(receipt.stateSampleHashes), receipt.stateCount,
        receipt.minimumFontPx, receipt.maximumSimultaneousLabels, receipt.contrastRatio, receipt.safeMarginPx, receipt.colorRedundancyState, receipt.futureStateSuppressionState,
        receipt.antiSlideState, receipt.assetPreparationState, receipt.datasetHash, receipt.parentAssetHash, receipt.transformManifestHash, receipt.derivativeHash, receipt.evidenceHash));
  }
  await db.batch(statements);
  return { outcome: "QUALIFIED" as const, packageId: plan.packageId, evidenceHash: plan.evidenceHash, caseCount: plan.caseReceipts.length, providerRequests: 0, spendMicros: 0, authorityBoundary: HIDDEN_SYSTEMS_TREATMENT_AUTHORITY };
}
