import { FACTORY_ASSURANCE_LAYERS } from "@/lib/factory-evidence-assurance";

export const FACTORY_QA_COCKPIT_VERSION = "FACTORY_QA_COCKPIT_PROJECTION_V1" as const;

type Row = Record<string, unknown>;
type Statement = { bind(...values: unknown[]): Statement; all<T = Row>(): Promise<{ results?: T[] }> };
export type FactoryQaCockpitDB = { prepare(query: string): Statement };
type AssuranceLayer = typeof FACTORY_ASSURANCE_LAYERS[number];

const text = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);
const json = <T>(value: unknown, fallback: T): T => { try { return JSON.parse(text(value)) as T; } catch { return fallback; } };
async function rows(db: FactoryQaCockpitDB, query: string, ...values: unknown[]) {
  return (await db.prepare(query).bind(...values).all<Row>()).results ?? [];
}

const layerDefinition: Record<AssuranceLayer, { name: string; role: string; evidence: string }> = {
  L0: { name: "Deterministic integrity", role: "DETERMINISTIC_CHECKER", evidence: "Decode, hash, A/V sync, rights, cost, layout and measured hard gates" },
  L1: { name: "Claim and factual proof", role: "AI_JUDGE", evidence: "Promise, claims, source coverage and unsupported certainty" },
  L2: { name: "Visual-semantic quality", role: "AI_JUDGE", evidence: "Relevance, phase distinction, mobile legibility and slide grammar" },
  L3: { name: "Temporal and motion", role: "AI_JUDGE", evidence: "Entry, mutation, exit, causal progression, continuity and payoff" },
  L4: { name: "Audio-native quality", role: "AI_JUDGE", evidence: "Exact mix, en-US voice, pacing, seams, music, SFX and timing" },
  L5: { name: "Audience and retention", role: "AI_JUDGE", evidence: "Hook, comprehension, fatigue, drop-off risk and promise payoff" },
  L6: { name: "Browser playback", role: "BROWSER_AGENT", evidence: "Full playback, seek, pause, ended state, audio and responsive runtime" },
  L7: { name: "Independent adjudication", role: "INDEPENDENT_ADJUDICATOR", evidence: "All prior evidence, disagreement, rights, cost and root routing" },
};

export type FactoryQaCockpitProjection = Awaited<ReturnType<typeof factoryQaCockpitProjection>>;

export async function factoryQaCockpitProjection(db: FactoryQaCockpitDB) {
  const [calibrationRows, qualificationRows, layerReceiptRows, runRows, evidenceRows] = await Promise.all([
    rows(db, `SELECT r.*,c.dataset_version,c.dataset_manifest_hash,c.lifecycle_state campaign_state,c.created_at campaign_created_at
      FROM factory_assurance_calibration_results r JOIN factory_assurance_calibration_campaigns c ON c.id=r.campaign_id
      ORDER BY c.created_at DESC,r.created_at DESC,r.id DESC`),
    rows(db, `SELECT q.*,
      (SELECT drift_state FROM factory_assurance_drift_receipts d WHERE d.qualification_id=q.id ORDER BY d.observed_at DESC,d.created_at DESC,d.id DESC LIMIT 1) drift_state
      FROM factory_assurance_judge_qualifications q ORDER BY q.qualified_at DESC,q.created_at DESC,q.id DESC`),
    rows(db, `SELECT assurance_layer,COUNT(*) receipt_count,
      SUM(CASE WHEN outcome='PASS' THEN 1 ELSE 0 END) pass_count,
      SUM(CASE WHEN outcome='FAIL' THEN 1 ELSE 0 END) fail_count,
      SUM(CASE WHEN outcome='INCOMPLETE' THEN 1 ELSE 0 END) incomplete_count,
      SUM(CASE WHEN outcome='ADVISORY' THEN 1 ELSE 0 END) advisory_count,
      SUM(p0_count) p0_count,SUM(p1_count) p1_count,SUM(p2_count) p2_count,SUM(p3_count) p3_count,
      SUM(actual_spend_micros) actual_spend_micros
      FROM factory_assurance_layer_receipts GROUP BY assurance_layer`),
    rows(db, `SELECT r.id,r.run_key,r.video_id,r.channel_id,r.format_key,r.exact_artifact_hash,r.automation_mode,r.rights_state,r.cost_reconciliation_state,r.active_provider_requests,r.created_at,
      b.coverage_state,b.source_commit,b.deployment_version,b.runtime_version,
      d.candidate_outcome,d.outcome,d.overall_score,d.adjudicator_confidence,d.root_owner,d.reasons_json,
      (SELECT COUNT(*) FROM factory_assurance_layer_receipts lr WHERE lr.run_id=r.id) layer_receipt_count,
      (SELECT COALESCE(SUM(lr.actual_spend_micros),0) FROM factory_assurance_layer_receipts lr WHERE lr.run_id=r.id) actual_spend_micros,
      (SELECT COALESCE(SUM(lr.p0_count),0) FROM factory_assurance_layer_receipts lr WHERE lr.run_id=r.id) p0_count,
      (SELECT COALESCE(SUM(lr.p1_count),0) FROM factory_assurance_layer_receipts lr WHERE lr.run_id=r.id) p1_count,
      (SELECT COALESCE(SUM(lr.p2_count),0) FROM factory_assurance_layer_receipts lr WHERE lr.run_id=r.id) p2_count
      FROM factory_assurance_runs r JOIN factory_evidence_bundles b ON b.id=r.evidence_bundle_id
      LEFT JOIN factory_assurance_decision_receipts d ON d.run_id=r.id
      ORDER BY r.created_at DESC,r.id DESC LIMIT 20`),
    rows(db, `SELECT
      (SELECT COUNT(*) FROM factory_evidence_bundles) bundle_count,
      (SELECT COUNT(*) FROM factory_evidence_items) item_count,
      (SELECT COUNT(*) FROM factory_assurance_calibration_campaigns) calibration_campaign_count,
      (SELECT COUNT(*) FROM factory_assurance_calibration_cases) calibration_case_count,
      (SELECT COUNT(*) FROM factory_assurance_calibration_observations) calibration_observation_count,
      (SELECT COUNT(*) FROM factory_assurance_decision_receipts) decision_count`),
  ]);

  const latestCalibration = new Map<AssuranceLayer, Row>();
  for (const row of calibrationRows) {
    const layer = text(row.assurance_layer) as AssuranceLayer;
    if (layerDefinition[layer] && !latestCalibration.has(layer)) latestCalibration.set(layer, row);
  }
  const latestQualification = new Map<AssuranceLayer, Row>();
  for (const row of qualificationRows) {
    const layer = text(row.assurance_layer) as AssuranceLayer;
    if (layerDefinition[layer] && !latestQualification.has(layer)) latestQualification.set(layer, row);
  }
  const receiptSummary = new Map(layerReceiptRows.map((row) => [text(row.assurance_layer) as AssuranceLayer, row]));
  const blockers: string[] = [];

  const layers = FACTORY_ASSURANCE_LAYERS.map((layer) => {
    const calibration = latestCalibration.get(layer);
    const qualification = latestQualification.get(layer);
    const receipt = receiptSummary.get(layer);
    const calibrationState = calibration ? text(calibration.lifecycle_state) : "NOT_CALIBRATED";
    const qualificationState = qualification ? text(qualification.lifecycle_state) : "NOT_REGISTERED";
    const driftState = qualification ? text(qualification.drift_state) || "UNOBSERVED" : "NOT_APPLICABLE";
    const dependencyCurrent = Boolean(calibration && qualification)
      && ["judge_version", "model_version", "prompt_hash", "rubric_hash", "schema_hash", "sampler_hash"].every((key) => text(calibration?.[key]) === text(qualification?.[key]));
    const layerBlockers: string[] = [];
    if (!calibration) layerBlockers.push("IMMUTABLE_CALIBRATION_RESULT_REQUIRED");
    else if (calibrationState !== "QUALIFIED_CANDIDATE") layerBlockers.push("CALIBRATION_BELOW_ACTIVE_THRESHOLD");
    if (!qualification) layerBlockers.push("EXACT_JUDGE_QUALIFICATION_NOT_REGISTERED");
    else if (qualificationState !== "QUALIFIED") layerBlockers.push("JUDGE_REMAINS_ADVISORY");
    if (driftState === "STALE") layerBlockers.push("JUDGE_DEPENDENCY_STALE");
    if (calibration && qualification && !dependencyCurrent) layerBlockers.push("CALIBRATION_QUALIFICATION_IDENTITY_MISMATCH");
    for (const blocker of layerBlockers) blockers.push(`${layer}:${blocker}`);
    return {
      layer,
      ...layerDefinition[layer],
      calibrationState,
      qualificationState,
      driftState,
      dependencyCurrent,
      datasetVersion: text(calibration?.dataset_version) || null,
      dependency: calibration || qualification ? {
        judgeVersion: text(calibration?.judge_version ?? qualification?.judge_version),
        modelVersion: text(calibration?.model_version ?? qualification?.model_version),
        promptHash: text(calibration?.prompt_hash ?? qualification?.prompt_hash),
        rubricHash: text(calibration?.rubric_hash ?? qualification?.rubric_hash),
        schemaHash: text(calibration?.schema_hash ?? qualification?.schema_hash),
        samplerHash: text(calibration?.sampler_hash ?? qualification?.sampler_hash),
      } : null,
      metrics: calibration ? {
        sampleSize: number(calibration.sample_size),
        p0Recall: number(calibration.p0_recall),
        p1Recall: number(calibration.p1_recall),
        cleanPrecision: number(calibration.clean_precision),
        criticalFalseCleanCount: number(calibration.critical_false_clean_count),
        repeatability: number(calibration.exact_byte_repeatability),
        decisionFlips: number(calibration.p0_p1_decision_flip_count),
        timecodeValidity: number(calibration.evidence_timecode_validity),
        structuredOutputValidity: number(calibration.structured_output_validity),
      } : null,
      receipts: {
        total: number(receipt?.receipt_count),
        pass: number(receipt?.pass_count),
        fail: number(receipt?.fail_count),
        incomplete: number(receipt?.incomplete_count),
        advisory: number(receipt?.advisory_count),
        p0: number(receipt?.p0_count),
        p1: number(receipt?.p1_count),
        p2: number(receipt?.p2_count),
        p3: number(receipt?.p3_count),
        actualSpendMicros: number(receipt?.actual_spend_micros),
      },
      blockers: layerBlockers,
      passAuthority: false as const,
    };
  });

  const recentRuns = runRows.map((row) => ({
    id: text(row.id),
    runKey: text(row.run_key),
    videoId: text(row.video_id),
    channelId: text(row.channel_id),
    formatKey: text(row.format_key),
    exactArtifactHash: text(row.exact_artifact_hash),
    automationMode: text(row.automation_mode),
    coverageState: text(row.coverage_state),
    sourceCommit: text(row.source_commit),
    deploymentVersion: text(row.deployment_version),
    runtimeVersion: text(row.runtime_version),
    rightsState: text(row.rights_state),
    costReconciliationState: text(row.cost_reconciliation_state),
    activeProviderRequests: number(row.active_provider_requests),
    layerReceipts: number(row.layer_receipt_count),
    candidateOutcome: text(row.candidate_outcome) || null,
    outcome: text(row.outcome) || "ASSURANCE_INCOMPLETE",
    overallScore: row.overall_score === null || row.overall_score === undefined ? null : number(row.overall_score),
    confidence: row.adjudicator_confidence === null || row.adjudicator_confidence === undefined ? null : number(row.adjudicator_confidence),
    rootOwner: text(row.root_owner) || null,
    reasons: json<string[]>(row.reasons_json, []),
    p0: number(row.p0_count), p1: number(row.p1_count), p2: number(row.p2_count),
    actualSpendMicros: number(row.actual_spend_micros),
    createdAt: text(row.created_at),
    acceptanceAuthority: "ADVISORY_ONLY" as const,
  }));
  const evidence = evidenceRows[0] ?? {};
  const outcomeCounts = recentRuns.reduce<Record<string, number>>((accumulator, run) => {
    accumulator[run.outcome] = (accumulator[run.outcome] ?? 0) + 1;
    return accumulator;
  }, {});
  const activeProviderRequests = recentRuns.reduce((total, run) => total + run.activeProviderRequests, 0);
  const actualSpendMicros = layers.reduce((total, layer) => total + layer.receipts.actualSpendMicros, 0);
  const qualifiedCandidateLayers = layers.filter((layer) => layer.calibrationState === "QUALIFIED_CANDIDATE").length;
  const currentQualifiedLayers = layers.filter((layer) => layer.qualificationState === "QUALIFIED" && layer.driftState !== "STALE" && layer.dependencyCurrent).length;
  if (activeProviderRequests > 0) blockers.push("ACTIVE_PROVIDER_REQUESTS_MUST_RECONCILE");
  if (recentRuns.some((run) => run.costReconciliationState !== "RECONCILED")) blockers.push("ASSURANCE_COST_RECONCILIATION_INCOMPLETE");

  return {
    version: FACTORY_QA_COCKPIT_VERSION,
    mode: "AI_SHADOW" as const,
    authority: {
      acceptance: "ADVISORY_ONLY" as const,
      pass: false as const,
      providerDispatch: false as const,
      r22: false as const,
      master: false as const,
      release: false as const,
      publication: false as const,
    },
    state: blockers.length === 0 && qualifiedCandidateLayers === 8 && currentQualifiedLayers === 8 ? "SHADOW_READY" as const : "CALIBRATION_REQUIRED" as const,
    summary: {
      calibrationCampaigns: number(evidence.calibration_campaign_count),
      calibrationCases: number(evidence.calibration_case_count),
      calibrationObservations: number(evidence.calibration_observation_count),
      qualifiedCandidateLayers,
      currentQualifiedLayers,
      evidenceBundles: number(evidence.bundle_count),
      evidenceItems: number(evidence.item_count),
      assuranceRuns: recentRuns.length,
      decisions: number(evidence.decision_count),
      activeProviderRequests,
      actualSpendMicros,
      outcomeCounts,
    },
    layers,
    recentRuns,
    blockers: [...new Set(blockers)].sort(),
    nextAction: qualifiedCandidateLayers < 8
      ? "Run blind-control and production-holdout calibration for every missing L0-L7 dependency identity; keep results advisory."
      : currentQualifiedLayers < 8
        ? "Register the exact current judge, model, prompt, rubric, schema and sampler qualifications; keep PASS authority closed."
        : "Run one exact-artifact L0-L7 AI_SHADOW assurance exercise with cost, rights and active-request reconciliation.",
  };
}
