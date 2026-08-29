import { FACTORY_ASSURANCE_LAYERS } from "@/lib/factory-evidence-assurance";

export const FACTORY_QA_COCKPIT_VERSION = "FACTORY_QA_COCKPIT_PROJECTION_V12" as const;

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
  const [calibrationRows, qualificationRows, layerReceiptRows, runRows, evidenceRows, corpusRows, corpusGapRows, remediationRows, remediationQueueRows, remediationEvidenceRows, remediationIncidentRows, rightsInventoryRows, rightsCollectionRows, rightsCollectionTaskRows, rightsTerminalRows, rightsTerminalReceiptRows, replacementPlanRows, replacementWorkOrderRows, materializationAdmissionRows, materializationAdmissionItemRows, audioPreflightRows, audioRequestContractRows, audioProviderCertificationRows, audioRouteReservationRows] = await Promise.all([
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
    rows(db, `SELECT * FROM factory_assurance_calibration_corpus_snapshots ORDER BY created_at DESC,id DESC LIMIT 1`),
    rows(db, `SELECT assurance_layer,gap_key,required_count,observed_count FROM factory_assurance_calibration_corpus_gaps
      WHERE snapshot_id=(SELECT id FROM factory_assurance_calibration_corpus_snapshots ORDER BY created_at DESC,id DESC LIMIT 1)
      ORDER BY assurance_layer,gap_key`),
    rows(db, `SELECT * FROM factory_assurance_corpus_remediation_snapshots ORDER BY created_at DESC,id DESC LIMIT 1`),
    rows(db, `SELECT readiness_state,candidate_kind,COUNT(*) item_count FROM factory_assurance_corpus_remediation_items
      WHERE snapshot_id=(SELECT id FROM factory_assurance_corpus_remediation_snapshots ORDER BY created_at DESC,id DESC LIMIT 1)
      GROUP BY readiness_state,candidate_kind ORDER BY readiness_state,candidate_kind`),
    rows(db, `SELECT COUNT(*) checked_items,
      COALESCE(SUM(CASE WHEN bytes_state='READBACK_VERIFIED' THEN 1 ELSE 0 END),0) byte_verified_items,
      COALESCE(SUM(CASE WHEN checksum_state='PASS' THEN 1 ELSE 0 END),0) checksum_pass_items,
      COALESCE(SUM(CASE WHEN provenance_state='PASS' THEN 1 ELSE 0 END),0) provenance_pass_items,
      COALESCE(SUM(CASE WHEN rights_state='PASS' THEN 1 ELSE 0 END),0) rights_pass_items,
      COALESCE(SUM(CASE WHEN exact_evidence_state='READY' THEN 1 ELSE 0 END),0) exact_evidence_ready_items,
      COALESCE(SUM(actual_bytes),0) bytes_read
      FROM factory_assurance_corpus_remediation_evidence_receipts
      WHERE remediation_snapshot_id=(SELECT id FROM factory_assurance_corpus_remediation_snapshots ORDER BY created_at DESC,id DESC LIMIT 1)`),
    rows(db, `SELECT * FROM factory_assurance_corpus_remediation_incident_runs
      WHERE remediation_snapshot_id=(SELECT id FROM factory_assurance_corpus_remediation_snapshots ORDER BY created_at DESC,id DESC LIMIT 1)
      ORDER BY created_at DESC,id DESC LIMIT 1`),
    rows(db, `SELECT * FROM factory_assurance_current_rights_inventory_runs
      WHERE remediation_snapshot_id=(SELECT id FROM factory_assurance_corpus_remediation_snapshots ORDER BY created_at DESC,id DESC LIMIT 1)
      ORDER BY created_at DESC,id DESC LIMIT 1`),
    rows(db, `SELECT * FROM factory_assurance_current_rights_collection_runs
      WHERE remediation_snapshot_id=(SELECT id FROM factory_assurance_corpus_remediation_snapshots ORDER BY created_at DESC,id DESC LIMIT 1)
      ORDER BY created_at DESC,id DESC LIMIT 1`),
    rows(db, `SELECT required_receipt_type,collection_state,COUNT(*) task_count FROM factory_assurance_current_rights_collection_tasks
      WHERE run_id=(SELECT id FROM factory_assurance_current_rights_collection_runs
        WHERE remediation_snapshot_id=(SELECT id FROM factory_assurance_corpus_remediation_snapshots ORDER BY created_at DESC,id DESC LIMIT 1)
        ORDER BY created_at DESC,id DESC LIMIT 1)
      GROUP BY required_receipt_type,collection_state ORDER BY required_receipt_type,collection_state`),
    rows(db, `SELECT * FROM factory_assurance_current_rights_terminal_disposition_runs
      WHERE remediation_snapshot_id=(SELECT id FROM factory_assurance_corpus_remediation_snapshots ORDER BY created_at DESC,id DESC LIMIT 1)
      ORDER BY created_at DESC,id DESC LIMIT 1`),
    rows(db, `SELECT terminal_reason,disposition,replacement_action,COUNT(*) receipt_count FROM factory_assurance_current_rights_terminal_disposition_receipts
      WHERE run_id=(SELECT id FROM factory_assurance_current_rights_terminal_disposition_runs
        WHERE remediation_snapshot_id=(SELECT id FROM factory_assurance_corpus_remediation_snapshots ORDER BY created_at DESC,id DESC LIMIT 1)
        ORDER BY created_at DESC,id DESC LIMIT 1)
      GROUP BY terminal_reason,disposition,replacement_action ORDER BY terminal_reason`),
    rows(db, `SELECT * FROM factory_assurance_controlled_fixture_replacement_plan_runs
      WHERE remediation_snapshot_id=(SELECT id FROM factory_assurance_corpus_remediation_snapshots ORDER BY created_at DESC,id DESC LIMIT 1)
      ORDER BY created_at DESC,id DESC LIMIT 1`),
    rows(db, `SELECT replacement_route,work_order_state,materialization_state,COUNT(*) order_count FROM factory_assurance_controlled_fixture_replacement_work_orders
      WHERE run_id=(SELECT id FROM factory_assurance_controlled_fixture_replacement_plan_runs
        WHERE remediation_snapshot_id=(SELECT id FROM factory_assurance_corpus_remediation_snapshots ORDER BY created_at DESC,id DESC LIMIT 1)
        ORDER BY created_at DESC,id DESC LIMIT 1)
      GROUP BY replacement_route,work_order_state,materialization_state ORDER BY replacement_route`),
    rows(db, `SELECT * FROM factory_assurance_controlled_fixture_materialization_admission_runs
      WHERE remediation_snapshot_id=(SELECT id FROM factory_assurance_corpus_remediation_snapshots ORDER BY created_at DESC,id DESC LIMIT 1)
      ORDER BY created_at DESC,id DESC LIMIT 1`),
    rows(db, `SELECT admission_lane,admission_state,COUNT(*) item_count FROM factory_assurance_controlled_fixture_materialization_admission_items
      WHERE run_id=(SELECT id FROM factory_assurance_controlled_fixture_materialization_admission_runs
        WHERE remediation_snapshot_id=(SELECT id FROM factory_assurance_corpus_remediation_snapshots ORDER BY created_at DESC,id DESC LIMIT 1)
        ORDER BY created_at DESC,id DESC LIMIT 1)
      GROUP BY admission_lane,admission_state ORDER BY admission_lane`),
    rows(db, `SELECT * FROM factory_assurance_controlled_fixture_audio_preflight_runs
      WHERE remediation_snapshot_id=(SELECT id FROM factory_assurance_corpus_remediation_snapshots ORDER BY created_at DESC,id DESC LIMIT 1)
      ORDER BY created_at DESC,id DESC LIMIT 1`),
    rows(db, `SELECT capability_key,capability_version,archetype,dispatch_mode,route_preflight_state,materialization_state,max_provider_requests,max_spend_micros,COUNT(*) contract_count
      FROM factory_assurance_controlled_fixture_audio_request_contracts
      WHERE run_id=(SELECT id FROM factory_assurance_controlled_fixture_audio_preflight_runs
        WHERE remediation_snapshot_id=(SELECT id FROM factory_assurance_corpus_remediation_snapshots ORDER BY created_at DESC,id DESC LIMIT 1)
        ORDER BY created_at DESC,id DESC LIMIT 1)
      GROUP BY capability_key,capability_version,archetype,dispatch_mode,route_preflight_state,materialization_state,max_provider_requests,max_spend_micros`),
    rows(db, `SELECT * FROM factory_assurance_audio_provider_certification_runs
      WHERE contract_id=(SELECT id FROM factory_assurance_controlled_fixture_audio_request_contracts
        WHERE run_id=(SELECT id FROM factory_assurance_controlled_fixture_audio_preflight_runs
          WHERE remediation_snapshot_id=(SELECT id FROM factory_assurance_corpus_remediation_snapshots ORDER BY created_at DESC,id DESC LIMIT 1)
          ORDER BY created_at DESC,id DESC LIMIT 1)
        ORDER BY created_at DESC,id DESC LIMIT 1)
      ORDER BY observed_at DESC,created_at DESC,id DESC LIMIT 1`),
    rows(db, `SELECT * FROM factory_assurance_audio_route_reservation_runs
      WHERE contract_id=(SELECT id FROM factory_assurance_controlled_fixture_audio_request_contracts
        WHERE run_id=(SELECT id FROM factory_assurance_controlled_fixture_audio_preflight_runs
          WHERE remediation_snapshot_id=(SELECT id FROM factory_assurance_corpus_remediation_snapshots ORDER BY created_at DESC,id DESC LIMIT 1)
          ORDER BY created_at DESC,id DESC LIMIT 1)
        ORDER BY created_at DESC,id DESC LIMIT 1)
      ORDER BY evaluated_at DESC,created_at DESC,id DESC LIMIT 1`),
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
  const corpus = corpusRows[0];
  const remediation = remediationRows[0];
  const remediationEvidence = remediationEvidenceRows[0] ?? {};
  const remediationIncident = remediationIncidentRows[0] ?? {};
  const rightsInventory = rightsInventoryRows[0] ?? {};
  const rightsCollection = rightsCollectionRows[0] ?? {};
  const rightsTerminal = rightsTerminalRows[0] ?? {};
  const replacementPlan = replacementPlanRows[0] ?? {};
  const materializationAdmission = materializationAdmissionRows[0] ?? {};
  const audioPreflight = audioPreflightRows[0] ?? {};
  const audioProviderCertification = audioProviderCertificationRows[0] ?? {};
  const audioRouteReservation = audioRouteReservationRows[0] ?? {};
  const corpusLayerReadiness = json<Array<Record<string, unknown>>>(corpus?.layer_readiness_json, []);
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
  if (!corpus) blockers.push("CORPUS_ADMISSION_SNAPSHOT_REQUIRED");
  else if (text(corpus.lifecycle_state) !== "ADMISSION_READY") blockers.push("CORPUS_ADMISSION_INSUFFICIENT");
  if (corpus && text(corpus.lifecycle_state) !== "ADMISSION_READY" && !remediation) blockers.push("CORPUS_REMEDIATION_INVENTORY_REQUIRED");
  const failedEvidenceItems = Math.max(number(remediationEvidence.checked_items) - Math.min(number(remediationEvidence.checksum_pass_items), number(remediationEvidence.provenance_pass_items)), 0);
  if (failedEvidenceItems > number(remediationIncident.quarantined_items)) blockers.push("REMEDIATION_EVIDENCE_INCIDENT_DISPOSITION_REQUIRED");
  if (number(remediationIncident.rights_eligible_items) > 0 && !text(rightsInventory.id)) blockers.push("CURRENT_RIGHTS_INVENTORY_REQUIRED");
  if (number(rightsInventory.pending_receipt_items) > 0 && !text(rightsCollection.id)) blockers.push("CURRENT_RIGHTS_COLLECTION_QUEUE_REQUIRED");
  if (number(rightsCollection.open_tasks) > 0 && !text(rightsTerminal.id)) blockers.push("CURRENT_RIGHTS_TERMINAL_DISPOSITION_REQUIRED");
  if (text(rightsTerminal.id) && number(rightsTerminal.remaining_receipt_collection_items) === 0 && !text(replacementPlan.id)) blockers.push("CONTROLLED_FIXTURE_REPLACEMENT_PLAN_REQUIRED");
  if (text(replacementPlan.id) && number(replacementPlan.pending_materialization_items) > 0 && !text(materializationAdmission.id)) blockers.push("CONTROLLED_FIXTURE_MATERIALIZATION_ADMISSION_REQUIRED");
  if (text(materializationAdmission.id) && number(materializationAdmission.dispatch_ready_items) === 0) blockers.push("CONTROLLED_FIXTURE_MATERIALIZATION_BLOCKED");
  if (text(materializationAdmission.id) && number(materializationAdmission.selected_batch_items) === 1 && !text(audioPreflight.id)) blockers.push("CONTROLLED_FIXTURE_AUDIO_PREFLIGHT_REQUIRED");
  if (text(audioPreflight.id) && !text(audioProviderCertification.id)) blockers.push("CONTROLLED_FIXTURE_AUDIO_PROVIDER_CERTIFICATION_REQUIRED");
  if (text(audioProviderCertification.id) && text(audioProviderCertification.certification_state) !== "CERTIFIED") blockers.push("CONTROLLED_FIXTURE_AUDIO_PROVIDER_CERTIFICATION_BLOCKED");
  if (text(audioPreflight.id) && number(audioProviderCertification.exact_audio_route_ready_bindings) === 0) blockers.push("CONTROLLED_FIXTURE_AUDIO_ROUTE_BLOCKED");
  if (text(audioProviderCertification.certification_state) === "CERTIFIED" && !text(audioRouteReservation.id)) blockers.push("CONTROLLED_FIXTURE_AUDIO_ROUTE_RESERVATION_REQUIRED");
  if (text(audioRouteReservation.id) && text(audioRouteReservation.plan_state) !== "PLANNED") blockers.push("CONTROLLED_FIXTURE_AUDIO_ROUTE_RESERVATION_BLOCKED");

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
      corpusAdmissionState: corpus ? text(corpus.lifecycle_state) : "NOT_MATERIALIZED",
      corpusCandidates: number(corpus?.candidate_count),
      corpusOwnerConfirmed: number(corpus?.owner_confirmed_count),
      corpusDistinctArtifacts: number(corpus?.distinct_artifact_count),
      corpusDistinctCorrelationGroups: number(corpus?.distinct_correlation_group_count),
      remediationState: remediation ? text(remediation.lifecycle_state) : "NOT_MATERIALIZED",
      remediationCandidates: number(remediation?.candidate_count),
      remediationL1Candidates: number(remediation?.l1_candidate_count),
      remediationL4Candidates: number(remediation?.l4_candidate_count),
      remediationExactReady: number(remediation?.exact_evidence_ready_count),
      remediationOwnerLabelReady: number(remediation?.owner_label_ready_count),
      remediationIndependent: number(remediation?.independent_count),
      remediationReadyForReview: number(remediation?.ready_for_corpus_review_count),
      remediationEvidenceChecked: number(remediationEvidence.checked_items),
      remediationEvidenceRemaining: Math.max(0, number(remediation?.candidate_count) - number(remediationEvidence.checked_items)),
      remediationByteVerified: number(remediationEvidence.byte_verified_items),
      remediationChecksumPass: number(remediationEvidence.checksum_pass_items),
      remediationProvenancePass: number(remediationEvidence.provenance_pass_items),
      remediationRightsPass: number(remediationEvidence.rights_pass_items),
      remediationEvidenceReady: number(remediationEvidence.exact_evidence_ready_items),
      remediationQuarantined: number(remediationIncident.quarantined_items),
      remediationReplacementReferences: number(remediationIncident.replacement_reference_items),
      remediationRightsEligible: number(remediationIncident.rights_eligible_items),
      remediationRightsPending: number(remediationIncident.rights_pending_items),
      currentRightsInventoryState: text(rightsInventory.lifecycle_state) || "NOT_INVENTORIED",
      currentRightsEvaluatedAt: text(rightsInventory.evaluated_at) || null,
      currentRightsAttached: number(rightsInventory.attached_receipt_items),
      currentRightsPending: number(rightsInventory.pending_receipt_items),
      currentRightsCollectionState: text(rightsCollection.lifecycle_state) || "NOT_MATERIALIZED",
      currentRightsCollectionOpen: number(rightsCollection.open_tasks),
      currentRightsProviderTasks: number(rightsCollection.provider_terms_tasks),
      currentRightsCompositeTasks: number(rightsCollection.composite_manifest_tasks),
      currentRightsAuthorshipTasks: number(rightsCollection.authorship_tasks),
      currentRightsTerminalDispositionState: text(rightsTerminal.lifecycle_state) || "NOT_CLASSIFIED",
      currentRightsTerminalQuarantined: number(rightsTerminal.quarantined_items),
      currentRightsProviderUnrecoverable: number(rightsTerminal.provider_binding_unrecoverable_items),
      currentRightsLineageUnrecoverable: number(rightsTerminal.lineage_unrecoverable_items),
      currentRightsReplacementRequired: number(rightsTerminal.replacement_required_items),
      currentRightsRemainingCollection: number(rightsTerminal.remaining_receipt_collection_items),
      controlledFixtureReplacementPlanState: text(replacementPlan.lifecycle_state) || "NOT_PLANNED",
      controlledFixtureReplacementPlanned: number(replacementPlan.planned_work_orders),
      controlledFixtureProviderAudioOrders: number(replacementPlan.provider_audio_orders),
      controlledFixtureCompositeMasterOrders: number(replacementPlan.composite_master_orders),
      controlledFixtureAuthorshipOrders: number(replacementPlan.authorship_orders),
      controlledFixtureMaterialized: number(replacementPlan.materialized_items),
      controlledFixturePending: number(replacementPlan.pending_materialization_items),
      controlledFixtureMaterializationAdmissionState: text(materializationAdmission.admission_state) || "NOT_ADMITTED",
      controlledFixtureSelectedBatchItems: number(materializationAdmission.selected_batch_items),
      controlledFixtureDispatchReadyItems: number(materializationAdmission.dispatch_ready_items),
      controlledFixtureBlockedItems: number(materializationAdmission.blocked_items),
      controlledFixturePlannedMaxProviderRequests: number(materializationAdmission.planned_max_provider_requests),
      controlledFixturePlannedMaxSpendMicros: number(materializationAdmission.planned_max_spend_micros),
      controlledFixtureAudioPreflightState: text(audioPreflight.preflight_state) || "NOT_PREFLIGHTED",
      controlledFixtureAudioTypedRequestContracts: number(audioPreflight.typed_request_contracts),
      controlledFixtureAudioExactBindings: Math.max(number(audioPreflight.exact_audio_bindings), number(audioProviderCertification.exact_audio_bindings)),
      controlledFixtureAudioExactQualifications: Math.max(number(audioPreflight.exact_audio_qualifications), number(audioProviderCertification.exact_audio_qualifications)),
      controlledFixtureAudioExactRightsReceipts: Math.max(number(audioPreflight.exact_audio_rights_receipts), number(audioProviderCertification.exact_audio_rights_receipts)),
      controlledFixtureAudioCurrentDriftReceipts: Math.max(number(audioPreflight.exact_audio_current_drift_receipts), number(audioProviderCertification.exact_audio_current_drift_receipts)),
      controlledFixtureAudioRouteReadyBindings: Math.max(number(audioPreflight.exact_audio_route_ready_bindings), number(audioProviderCertification.exact_audio_route_ready_bindings)),
      controlledFixtureAudioActiveCostEnvelopes: number(audioPreflight.active_cost_envelopes),
      controlledFixtureAudioRouteReservationState: text(audioRouteReservation.plan_state) || "NOT_PLANNED",
      controlledFixtureAudioCanonicalWorkRequests: number(audioRouteReservation.canonical_work_requests),
      controlledFixtureAudioCanonicalRouteDecisions: number(audioRouteReservation.canonical_route_decisions),
      controlledFixtureAudioCostReservations: number(audioRouteReservation.canonical_cost_reservations),
      controlledFixtureAudioReservedProviderRequests: number(audioRouteReservation.reserved_provider_requests),
      controlledFixtureAudioReservedSpendMicros: number(audioRouteReservation.reserved_spend_micros),
      controlledFixtureAudioProviderCertificationState: text(audioProviderCertification.certification_state) || "NOT_CERTIFIED",
      controlledFixtureAudioProviderMetadataReads: number(audioProviderCertification.provider_metadata_reads),
      controlledFixtureAudioPublicRightsReads: number(audioProviderCertification.public_rights_reads),
      controlledFixtureAudioProviderGenerationRequests: number(audioProviderCertification.provider_generation_requests),
    },
    corpus: {
      snapshotHash: corpus ? text(corpus.snapshot_hash) : null,
      sourceSnapshotHash: corpus ? text(corpus.source_snapshot_hash) : null,
      partitionCounts: json<Record<string, number>>(corpus?.partition_counts_json, {}),
      layerReadiness: corpusLayerReadiness,
      gaps: corpusGapRows.map((row) => ({ layer: text(row.assurance_layer), key: text(row.gap_key), required: number(row.required_count), observed: number(row.observed_count) })),
      qualificationAuthority: false as const,
      passAuthority: false as const,
    },
    remediation: {
      snapshotHash: remediation ? text(remediation.snapshot_hash) : null,
      state: remediation ? text(remediation.lifecycle_state) : "NOT_MATERIALIZED",
      queue: remediationQueueRows.map((row) => ({ readiness: text(row.readiness_state), candidateKind: text(row.candidate_kind), count: number(row.item_count) })),
      evidence: {
        checked: number(remediationEvidence.checked_items),
        remaining: Math.max(0, number(remediation?.candidate_count) - number(remediationEvidence.checked_items)),
        byteVerified: number(remediationEvidence.byte_verified_items),
        checksumPass: number(remediationEvidence.checksum_pass_items),
        provenancePass: number(remediationEvidence.provenance_pass_items),
        rightsPass: number(remediationEvidence.rights_pass_items),
        exactReady: number(remediationEvidence.exact_evidence_ready_items),
        bytesRead: number(remediationEvidence.bytes_read),
        quarantined: number(remediationIncident.quarantined_items),
        replacementReferences: number(remediationIncident.replacement_reference_items),
        rightsEligible: number(remediationIncident.rights_eligible_items),
        rightsPending: number(remediationIncident.rights_pending_items),
        rightsInventoryState: text(rightsInventory.lifecycle_state) || "NOT_INVENTORIED",
        rightsEvaluatedAt: text(rightsInventory.evaluated_at) || null,
        rightsAttached: number(rightsInventory.attached_receipt_items),
        rightsInventoryPending: number(rightsInventory.pending_receipt_items),
        rightsCollectionState: text(rightsCollection.lifecycle_state) || "NOT_MATERIALIZED",
        rightsCollectionOpen: number(rightsCollection.open_tasks),
        rightsCollectionQueue: rightsCollectionTaskRows.map((row) => ({ receiptType: text(row.required_receipt_type), state: text(row.collection_state), count: number(row.task_count) })),
        rightsTerminalState: text(rightsTerminal.lifecycle_state) || "NOT_CLASSIFIED",
        rightsTerminalQuarantined: number(rightsTerminal.quarantined_items),
        rightsReplacementRequired: number(rightsTerminal.replacement_required_items),
        rightsRemainingCollection: number(rightsTerminal.remaining_receipt_collection_items),
        rightsTerminalQueue: rightsTerminalReceiptRows.map((row) => ({ reason: text(row.terminal_reason), disposition: text(row.disposition), replacementAction: text(row.replacement_action), count: number(row.receipt_count) })),
        controlledFixtureReplacementPlanState: text(replacementPlan.lifecycle_state) || "NOT_PLANNED",
        controlledFixtureReplacementPlanned: number(replacementPlan.planned_work_orders),
        controlledFixtureMaterialized: number(replacementPlan.materialized_items),
        controlledFixturePending: number(replacementPlan.pending_materialization_items),
        controlledFixtureReplacementQueue: replacementWorkOrderRows.map((row) => ({ route: text(row.replacement_route), state: text(row.work_order_state), materializationState: text(row.materialization_state), count: number(row.order_count) })),
        controlledFixtureMaterializationAdmissionState: text(materializationAdmission.admission_state) || "NOT_ADMITTED",
        controlledFixtureSelectedBatchItems: number(materializationAdmission.selected_batch_items),
        controlledFixtureDispatchReadyItems: number(materializationAdmission.dispatch_ready_items),
        controlledFixtureBlockedItems: number(materializationAdmission.blocked_items),
        controlledFixtureMaterializationAdmissionQueue: materializationAdmissionItemRows.map((row) => ({ lane: text(row.admission_lane), state: text(row.admission_state), count: number(row.item_count) })),
        controlledFixtureAudioPreflightState: text(audioPreflight.preflight_state) || "NOT_PREFLIGHTED",
        controlledFixtureAudioTypedRequestContracts: number(audioPreflight.typed_request_contracts),
        controlledFixtureAudioExactBindings: Math.max(number(audioPreflight.exact_audio_bindings), number(audioProviderCertification.exact_audio_bindings)),
        controlledFixtureAudioExactQualifications: Math.max(number(audioPreflight.exact_audio_qualifications), number(audioProviderCertification.exact_audio_qualifications)),
        controlledFixtureAudioExactRightsReceipts: Math.max(number(audioPreflight.exact_audio_rights_receipts), number(audioProviderCertification.exact_audio_rights_receipts)),
        controlledFixtureAudioCurrentDriftReceipts: Math.max(number(audioPreflight.exact_audio_current_drift_receipts), number(audioProviderCertification.exact_audio_current_drift_receipts)),
        controlledFixtureAudioRouteReadyBindings: Math.max(number(audioPreflight.exact_audio_route_ready_bindings), number(audioProviderCertification.exact_audio_route_ready_bindings)),
        controlledFixtureAudioActiveCostEnvelopes: number(audioPreflight.active_cost_envelopes),
        controlledFixtureAudioRouteReservationState: text(audioRouteReservation.plan_state) || "NOT_PLANNED",
        controlledFixtureAudioRouteReservationBlockers: json<string[]>(audioRouteReservation.blockers_json, []),
        controlledFixtureAudioCanonicalWorkRequests: number(audioRouteReservation.canonical_work_requests),
        controlledFixtureAudioCanonicalRouteDecisions: number(audioRouteReservation.canonical_route_decisions),
        controlledFixtureAudioCostReservations: number(audioRouteReservation.canonical_cost_reservations),
        controlledFixtureAudioReservedProviderRequests: number(audioRouteReservation.reserved_provider_requests),
        controlledFixtureAudioReservedSpendMicros: number(audioRouteReservation.reserved_spend_micros),
        controlledFixtureAudioProviderCertificationState: text(audioProviderCertification.certification_state) || "NOT_CERTIFIED",
        controlledFixtureAudioProviderCertificationBlockers: json<string[]>(audioProviderCertification.blockers_json, []),
        controlledFixtureAudioProviderMetadataReads: number(audioProviderCertification.provider_metadata_reads),
        controlledFixtureAudioPublicRightsReads: number(audioProviderCertification.public_rights_reads),
        controlledFixtureAudioProviderGenerationRequests: number(audioProviderCertification.provider_generation_requests),
        controlledFixtureAudioRequestContracts: audioRequestContractRows.map((row) => ({ capability: text(row.capability_key), version: text(row.capability_version), archetype: text(row.archetype), dispatchMode: text(row.dispatch_mode), routeState: text(row.route_preflight_state), materializationState: text(row.materialization_state), maxProviderRequests: number(row.max_provider_requests), maxSpendMicros: number(row.max_spend_micros), count: number(row.contract_count) })),
      },
      countEligible: false as const,
      qualificationAuthority: false as const,
      passAuthority: false as const,
    },
    layers,
    recentRuns,
    blockers: [...new Set(blockers)].sort(),
    nextAction: !corpus || text(corpus.lifecycle_state) !== "ADMISSION_READY"
      ? remediation
        ? number(remediationEvidence.checked_items) < number(remediation.candidate_count)
          ? "Complete exact R2 byte, checksum, provenance and current-rights evidence receipts for the bounded remediation inventory. No work item counts as calibration evidence by itself."
          : failedEvidenceItems > number(remediationIncident.quarantined_items)
            ? "Classify failed byte/provenance receipts append-only and quarantine unrecoverable source objects; never rewrite an old receipt into PASS."
            : !text(rightsInventory.id)
              ? `Inventory current immutable rights evidence for the ${number(remediationIncident.rights_eligible_items)} byte/provenance-eligible items; do not infer PASS from declarations or historical state.`
              : number(rightsInventory.pending_receipt_items) > 0
                ? text(rightsCollection.id)
                  ? text(rightsTerminal.id)
                    ? text(replacementPlan.id)
                      ? text(materializationAdmission.id)
                        ? text(audioPreflight.id)
                          ? !text(audioProviderCertification.id)
                            ? `Certify the exact ElevenLabs voice/model binding against the sealed clean-control bytes, current paid-plan metadata, current official commercial-rights source and CURRENT drift. This performs 3 provider metadata reads plus 1 public rights read, but 0 synthesis requests and $0 spend.`
                            : text(audioProviderCertification.certification_state) === "CERTIFIED"
                              ? !text(audioRouteReservation.id)
                                ? `Create the canonical PLAN_ONLY work request, route decision and exact $0.08 / 2-request reservation from the certified audio binding. Provider dispatch, synthesis and spend remain closed.`
                                : text(audioRouteReservation.plan_state) === "PLANNED"
                                  ? `The canonical PLAN_ONLY request, zero-dispatch route and $0.08 / 2-request reservation are frozen. Next require a separately typed paid-dispatch authorization with fresh generation-time rights and entitlement evidence; no provider call is authorized yet.`
                                  : `Resolve the fail-closed canonical audio route-reservation blockers against fresh qualification, rights and drift evidence. Do not dispatch, synthesize or spend.`
                              : `Resolve the fail-closed audio-provider certification blockers and record a fresh exact observation. Do not create a canonical work request, reservation or synthesis request while certification is blocked.`
                          : `Preflight the selected one-audio batch into one typed PLAN_ONLY request contract and one active $0.08 / 2-request cost envelope. Do not create a provider request, reservation or dispatch authority.`
                        : `Admit the ${number(replacementPlan.pending_materialization_items)} planned controlled fixtures into a zero-provider bounded materialization queue before any cost reservation or dispatch.`
                      : `Plan the ${number(rightsTerminal.replacement_required_items)} terminal quarantines as immutable zero-dispatch controlled-fixture work orders before any provider or composition request.`
                    : `Classify the ${number(rightsCollection.open_tasks)} collection tasks against immutable terminal recovery and lineage evidence before seeking new receipts. Do not retry exhausted historical recovery or infer rights from package correlation.`
                  : `Materialize a zero-provider collection queue for the ${number(rightsInventory.pending_receipt_items)} pending exact current rights receipts; do not infer PASS or fetch external evidence in the inventory step.`
              : "Resolve correlation and owner-label work for exact-evidence-ready items; then review eligible inputs into a new immutable corpus snapshot. No work item counts as calibration evidence by itself."
        : "Close the exact corpus-admission gaps by first materializing the zero-provider remediation inventory; do not execute any L0-L7 judge yet."
      : qualifiedCandidateLayers < 8
      ? "Run blind-control and production-holdout calibration for every missing L0-L7 dependency identity; keep results advisory."
      : currentQualifiedLayers < 8
        ? "Register the exact current judge, model, prompt, rubric, schema and sampler qualifications; keep PASS authority closed."
        : "Run one exact-artifact L0-L7 AI_SHADOW assurance exercise with cost, rights and active-request reconciliation.",
  };
}
