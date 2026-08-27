import { canonicalHash, canonicalStringify } from "@/lib/canonical-json";
import { FACTORY_ASSURANCE_CALIBRATION_THRESHOLD_VERSION } from "@/lib/factory-assurance-calibration";
import { FACTORY_ASSURANCE_LAYERS } from "@/lib/factory-evidence-assurance";
import { FactoryRuntimeError, type FactoryRuntimeDB } from "@/lib/factory-runtime-writer";

export const FACTORY_ASSURANCE_CORPUS_ADMISSION_VERSION = "FACTORY_ASSURANCE_CORPUS_ADMISSION_V1" as const;

type AssuranceLayer = typeof FACTORY_ASSURANCE_LAYERS[number];
type LabelSource = "OWNER_CONFIRMED" | "SEALED_CLEAN_CONTROL" | "SEALED_DEFECT_CONTROL";
type Outcome = "PASS" | "FAIL" | "INCOMPLETE" | "HUMAN_ESCALATION_REQUIRED";
type Severity = "NONE" | "P0" | "P1" | "P2" | "P3";
type Partition = "REFERENCE" | "CALIBRATION" | "BLIND_QUALIFICATION" | "PRODUCTION_HOLDOUT" | "UNASSIGNED";

const hashPattern = /^[a-f0-9]{64}$/;
const identityPattern = /^[A-Za-z0-9._:@/-]{3,240}$/;
const keyPattern = /^[A-Za-z0-9._:-]{16,240}$/;
const layerSet = new Set<string>(FACTORY_ASSURANCE_LAYERS);
const json = (value: unknown) => canonicalStringify(value);
const deterministicId = (prefix: string, hash: string) => `${prefix}-${hash.slice(0, 24)}`;

function assertHash(label: string, value: unknown) {
  if (!hashPattern.test(String(value ?? ""))) throw new FactoryRuntimeError("ASSURANCE_CORPUS_INPUT_INVALID", 400, `${label} must be a lowercase SHA-256 value`, [`${label}_INVALID`]);
}

function assertIdentity(label: string, value: unknown) {
  if (!identityPattern.test(String(value ?? "").trim())) throw new FactoryRuntimeError("ASSURANCE_CORPUS_INPUT_INVALID", 400, `${label} is invalid`, [`${label}_INVALID`]);
}

function assertKey(label: string, value: unknown) {
  if (!keyPattern.test(String(value ?? "").trim())) throw new FactoryRuntimeError("ASSURANCE_CORPUS_INPUT_INVALID", 400, `${label} is invalid`, [`${label}_INVALID`]);
}

export type FactoryAssuranceCorpusItemInput = {
  itemKey: string;
  sourceFamily: string;
  sourceId: string;
  sourceReceiptId: string;
  candidateKind: string;
  mimeType: string;
  storageKey?: string | null;
  byteSize?: number | null;
  exactArtifactHash: string;
  labelSource: LabelSource;
  expectedOutcome: Outcome;
  expectedSeverity: Severity;
  defectFamilies: string[];
  applicableLayers: AssuranceLayer[];
  correlationGroup: string;
  ownerLabelHash: string;
  bytesState: "READBACK_VERIFIED" | "NOT_VERIFIED";
  checksumState: "PASS" | "NOT_VERIFIED";
  rightsState: "PASS" | "NOT_REQUIRED" | "UNKNOWN";
  partitionHint: Partition;
  countEligible: boolean;
  evidenceHash: string;
};

export type FactoryAssuranceCorpusSnapshotInput = {
  snapshotKey: string;
  channelId: string;
  formatKey: string;
  policyVersion: string;
  sourceSnapshotHash: string;
  items: FactoryAssuranceCorpusItemInput[];
  evidenceHash: string;
};

type Gap = { assuranceLayer: AssuranceLayer; gapKey: string; requiredCount: number; observedCount: number };

function eligibleForLayer(item: FactoryAssuranceCorpusItemInput, layer: AssuranceLayer) {
  return item.countEligible && item.applicableLayers.includes(layer) && item.bytesState === "READBACK_VERIFIED" && item.checksumState === "PASS" && ["PASS", "NOT_REQUIRED"].includes(item.rightsState);
}

export function evaluateFactoryAssuranceCorpusAdmission(items: FactoryAssuranceCorpusItemInput[]) {
  const labelByArtifact = new Map<string, Set<string>>();
  for (const item of items) {
    const labels = labelByArtifact.get(item.exactArtifactHash) ?? new Set<string>();
    labels.add(`${item.expectedOutcome}:${item.expectedSeverity}`);
    labelByArtifact.set(item.exactArtifactHash, labels);
  }
  const conflictedArtifacts = new Set([...labelByArtifact.entries()].filter(([, labels]) => labels.size > 1).map(([artifact]) => artifact));
  const gaps: Gap[] = [];
  const layerReadiness = FACTORY_ASSURANCE_LAYERS.map((assuranceLayer) => {
    const scoped = items.filter((item) => eligibleForLayer(item, assuranceLayer) && !conflictedArtifacts.has(item.exactArtifactHash));
    const sampleSize = scoped.length;
    const distinctArtifacts = new Set(scoped.map((item) => item.exactArtifactHash)).size;
    const distinctCorrelationGroups = new Set(scoped.map((item) => item.correlationGroup)).size;
    const ownerHoldouts = scoped.filter((item) => item.partitionHint === "PRODUCTION_HOLDOUT" && item.labelSource === "OWNER_CONFIRMED").length;
    const blindControls = scoped.filter((item) => item.partitionHint === "BLIND_QUALIFICATION").length;
    const calibrationCases = scoped.filter((item) => item.partitionHint === "CALIBRATION").length;
    const cleanControls = scoped.filter((item) => item.expectedOutcome === "PASS" && item.expectedSeverity === "NONE").length;
    const p0Cases = scoped.filter((item) => item.expectedSeverity === "P0").length;
    const p1Cases = scoped.filter((item) => item.expectedSeverity === "P1").length;
    const checks: Array<[string, number, number]> = [
      ["CASE_COUNT_BELOW_MINIMUM", 20, sampleSize],
      ["DISTINCT_EXACT_ARTIFACTS_BELOW_MINIMUM", 10, distinctArtifacts],
      ["CORRELATION_GROUPS_BELOW_MINIMUM", 10, distinctCorrelationGroups],
      ["BLIND_CONTROLS_BELOW_MINIMUM", 5, blindControls],
      ["OWNER_CONFIRMED_HOLDOUTS_BELOW_MINIMUM", 3, ownerHoldouts],
      ["CALIBRATION_PARTITION_BELOW_MINIMUM", 12, calibrationCases],
      ["CLEAN_CONTROLS_BELOW_MINIMUM", 5, cleanControls],
      ["P0_CASES_MISSING", 1, p0Cases],
      ["P1_CASES_MISSING", 1, p1Cases],
    ];
    for (const [gapKey, requiredCount, observedCount] of checks) if (observedCount < requiredCount) gaps.push({ assuranceLayer, gapKey, requiredCount, observedCount });
    return { assuranceLayer, sampleSize, distinctArtifacts, distinctCorrelationGroups, ownerHoldouts, blindControls, calibrationCases, cleanControls, p0Cases, p1Cases, lifecycleState: checks.every(([, required, observed]) => observed >= required) ? "ADMISSION_READY" : "ADMISSION_INSUFFICIENT" };
  });
  const partitionCounts = Object.fromEntries(["REFERENCE", "CALIBRATION", "BLIND_QUALIFICATION", "PRODUCTION_HOLDOUT", "UNASSIGNED"].map((partition) => [partition, items.filter((item) => item.partitionHint === partition).length]));
  return {
    lifecycleState: layerReadiness.every((item) => item.lifecycleState === "ADMISSION_READY") ? "ADMISSION_READY" as const : "ADMISSION_INSUFFICIENT" as const,
    candidateCount: items.length,
    ownerConfirmedCount: items.filter((item) => item.labelSource === "OWNER_CONFIRMED").length,
    sealedCleanCount: items.filter((item) => item.labelSource === "SEALED_CLEAN_CONTROL").length,
    sealedDefectCount: items.filter((item) => item.labelSource === "SEALED_DEFECT_CONTROL").length,
    distinctArtifactCount: new Set(items.map((item) => item.exactArtifactHash)).size,
    distinctCorrelationGroupCount: new Set(items.map((item) => item.correlationGroup)).size,
    partitionCounts,
    layerReadiness,
    gaps,
    qualificationAuthority: false,
    passAuthority: false,
    providerDispatchAuthority: false,
    r22Authority: false,
    masterAuthority: false,
    releaseAuthority: false,
    publicationAuthority: false,
  };
}

export async function recordFactoryAssuranceCorpusSnapshot(db: FactoryRuntimeDB, input: FactoryAssuranceCorpusSnapshotInput) {
  assertKey("SNAPSHOT_KEY", input.snapshotKey);
  for (const [label, value] of [["CHANNEL_ID", input.channelId], ["FORMAT_KEY", input.formatKey], ["POLICY_VERSION", input.policyVersion]] as const) assertIdentity(label, value);
  assertHash("SOURCE_SNAPSHOT_HASH", input.sourceSnapshotHash); assertHash("EVIDENCE_HASH", input.evidenceHash);
  const itemKeys = new Set<string>();
  for (const item of input.items) {
    assertKey("ITEM_KEY", item.itemKey); assertIdentity("SOURCE_FAMILY", item.sourceFamily); assertIdentity("SOURCE_ID", item.sourceId); assertIdentity("SOURCE_RECEIPT_ID", item.sourceReceiptId);
    assertIdentity("CANDIDATE_KIND", item.candidateKind); assertHash("EXACT_ARTIFACT_HASH", item.exactArtifactHash); assertHash("OWNER_LABEL_HASH", item.ownerLabelHash); assertHash("ITEM_EVIDENCE_HASH", item.evidenceHash);
    if (itemKeys.has(item.itemKey)) throw new FactoryRuntimeError("ASSURANCE_CORPUS_ITEM_KEY_DUPLICATE", 409, "Corpus item keys must be unique");
    itemKeys.add(item.itemKey);
    if (!item.applicableLayers.length || item.applicableLayers.some((layer) => !layerSet.has(layer))) throw new FactoryRuntimeError("ASSURANCE_CORPUS_LAYER_SCOPE_INVALID", 409, "Corpus items require valid L0-L7 applicability");
    if (item.partitionHint === "PRODUCTION_HOLDOUT" && item.labelSource !== "OWNER_CONFIRMED") throw new FactoryRuntimeError("ASSURANCE_CORPUS_HOLDOUT_OWNER_LABEL_REQUIRED", 409, "Production holdouts require owner-confirmed labels");
  }
  const sortedItems = [...input.items].sort((left, right) => left.itemKey.localeCompare(right.itemKey));
  const admission = evaluateFactoryAssuranceCorpusAdmission(sortedItems);
  const manifest = { version: FACTORY_ASSURANCE_CORPUS_ADMISSION_VERSION, thresholdVersion: FACTORY_ASSURANCE_CALIBRATION_THRESHOLD_VERSION, ...input, items: sortedItems, admission };
  const snapshotHash = await canonicalHash(manifest);
  const existing = await db.prepare("SELECT id,snapshot_hash,lifecycle_state FROM factory_assurance_calibration_corpus_snapshots WHERE snapshot_key=?").bind(input.snapshotKey).first<Record<string, unknown>>();
  if (existing) {
    if (String(existing.snapshot_hash) !== snapshotHash) throw new FactoryRuntimeError("ASSURANCE_CORPUS_IDEMPOTENCY_CONFLICT", 409, "The snapshot key is bound to another corpus manifest");
    return { outcome: "IDEMPOTENT_REPLAY" as const, snapshotId: String(existing.id), snapshotHash, lifecycleState: String(existing.lifecycle_state), ...admission };
  }
  const snapshotId = deterministicId("factory-assurance-corpus", snapshotHash);
  const statements = [db.prepare(`INSERT INTO factory_assurance_calibration_corpus_snapshots
    (id,snapshot_key,channel_id,format_key,policy_version,threshold_version,source_snapshot_hash,candidate_count,owner_confirmed_count,sealed_clean_count,sealed_defect_count,distinct_artifact_count,distinct_correlation_group_count,partition_counts_json,layer_readiness_json,lifecycle_state,qualification_authority,pass_authority,provider_dispatch_authority,r22_authority,master_authority,release_authority,publication_authority,provider_requests,spend_micros,snapshot_hash,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, ?,0,0,0,0,0,0,0,0,0,?,?)`).bind(snapshotId, input.snapshotKey, input.channelId, input.formatKey, input.policyVersion, FACTORY_ASSURANCE_CALIBRATION_THRESHOLD_VERSION, input.sourceSnapshotHash, admission.candidateCount, admission.ownerConfirmedCount, admission.sealedCleanCount, admission.sealedDefectCount, admission.distinctArtifactCount, admission.distinctCorrelationGroupCount, json(admission.partitionCounts), json(admission.layerReadiness), admission.lifecycleState, snapshotHash, input.evidenceHash)];
  for (const item of sortedItems) {
    const itemHash = await canonicalHash({ version: FACTORY_ASSURANCE_CORPUS_ADMISSION_VERSION, snapshotId, item });
    statements.push(db.prepare(`INSERT INTO factory_assurance_calibration_corpus_items
      (id,snapshot_id,item_key,source_family,source_id,source_receipt_id,candidate_kind,mime_type,storage_key,byte_size,exact_artifact_hash,label_source,expected_outcome,expected_severity,defect_families_json,applicable_layers_json,correlation_group,owner_label_hash,bytes_state,checksum_state,rights_state,partition_hint,count_eligible,evidence_hash)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(deterministicId("factory-assurance-corpus-item", itemHash), snapshotId, item.itemKey, item.sourceFamily, item.sourceId, item.sourceReceiptId, item.candidateKind, item.mimeType, item.storageKey ?? null, item.byteSize ?? null, item.exactArtifactHash, item.labelSource, item.expectedOutcome, item.expectedSeverity, json(item.defectFamilies), json(item.applicableLayers), item.correlationGroup, item.ownerLabelHash, item.bytesState, item.checksumState, item.rightsState, item.partitionHint, item.countEligible ? 1 : 0, item.evidenceHash));
  }
  for (const gap of admission.gaps) {
    const gapHash = await canonicalHash({ version: FACTORY_ASSURANCE_CORPUS_ADMISSION_VERSION, snapshotId, gap });
    statements.push(db.prepare(`INSERT INTO factory_assurance_calibration_corpus_gaps
      (id,snapshot_id,assurance_layer,gap_key,required_count,observed_count,blocking,evidence_hash) VALUES (?,?,?,?,?,?,1,?)`).bind(deterministicId("factory-assurance-corpus-gap", gapHash), snapshotId, gap.assuranceLayer, gap.gapKey, gap.requiredCount, gap.observedCount, gapHash));
  }
  await db.batch(statements);
  return { outcome: "RECORDED" as const, snapshotId, snapshotHash, ...admission };
}

type SourceRow = Record<string, unknown>;
const severityByDefect: Record<string, Severity> = {
  SAFETY_SCOPE_ESCAPE: "P0", RIGHTS_LINEAGE_MISSING: "P0", SEMANTIC_VISUAL_CONTRADICTION: "P0", MASTER_LINEAGE_INVALID: "P0", AUDIO_VIDEO_SYNC: "P0",
  PRODUCTION_RESIDUE: "P1", NEAR_STATIC_MOTION: "P1", AUDIO_SEAM: "P1", MOBILE_LEGIBILITY: "P1", TRANSACTION_STATE_CONFLATION: "P1", PACKAGING_PROMISE_MISMATCH: "P1",
};
const layersByDefect: Record<string, AssuranceLayer[]> = {
  SAFETY_SCOPE_ESCAPE: ["L0", "L1", "L5", "L7"],
  RIGHTS_LINEAGE_MISSING: ["L0", "L7"],
  SEMANTIC_VISUAL_CONTRADICTION: ["L1", "L2", "L3", "L7"],
  MASTER_LINEAGE_INVALID: ["L0", "L6", "L7"],
  AUDIO_VIDEO_SYNC: ["L0", "L3", "L4", "L6", "L7"],
  PRODUCTION_RESIDUE: ["L0", "L2", "L6", "L7"],
  NEAR_STATIC_MOTION: ["L0", "L2", "L3", "L5", "L6", "L7"],
  AUDIO_SEAM: ["L0", "L4", "L6", "L7"],
  MOBILE_LEGIBILITY: ["L0", "L2", "L5", "L6", "L7"],
  TRANSACTION_STATE_CONFLATION: ["L1", "L2", "L3", "L5", "L7"],
  PACKAGING_PROMISE_MISMATCH: ["L1", "L2", "L5", "L7"],
};

function strings(value: unknown): Array<Record<string, unknown>> {
  try { const parsed = typeof value === "string" ? JSON.parse(value) : value; return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === "object") as Array<Record<string, unknown>> : []; }
  catch { return []; }
}

function presentDefects(value: unknown) {
  return [...new Set(strings(value).filter((item) => ["PRESENT", "FAIL"].includes(String(item.status ?? item.polarity ?? "").toUpperCase())).map((item) => String(item.defectKey ?? item.defect_key ?? "").trim()).filter((key) => severityByDefect[key]))].sort();
}

function highestSeverity(defects: string[]): Severity {
  if (defects.some((key) => severityByDefect[key] === "P0")) return "P0";
  if (defects.some((key) => severityByDefect[key] === "P1")) return "P1";
  return "P2";
}

function applicableLayers(defects: string[], candidateKind: string, mimeType: string) {
  const layers = new Set<AssuranceLayer>(defects.flatMap((key) => layersByDefect[key] ?? []));
  const mime = mimeType.toLowerCase(), kind = candidateKind.toUpperCase();
  if (mime.startsWith("audio/") || mime.startsWith("video/")) layers.add("L4");
  if (mime.startsWith("video/") || kind === "MASTER" || kind === "CLIP") { layers.add("L3"); layers.add("L5"); layers.add("L6"); }
  if (mime.startsWith("image/") || mime.startsWith("video/")) layers.add("L2");
  layers.add("L0"); layers.add("L7");
  return FACTORY_ASSURANCE_LAYERS.filter((layer) => layers.has(layer));
}

async function sourceRows(db: FactoryRuntimeDB, query: string, ...values: unknown[]) {
  return (await db.prepare(query).bind(...values).all<SourceRow>()).results ?? [];
}

export async function materializeFactoryAssuranceCorpusAdmissionInventory(db: FactoryRuntimeDB, actor: string) {
  const [regressionRows, cleanAudioRows, controlledDefectRows] = await Promise.all([
    sourceRows(db, `SELECT x.id source_id,x.source_receipt_id,x.candidate_kind,x.mime_type,x.exact_artifact_hash,x.lineage_group_key,x.evidence_authority,x.expected_decision,x.labels_json,
      c.storage_key,c.byte_size,c.bytes_state,c.checksum_state,c.rights_verification_state
      FROM v7_evaluation_regression_corpus_items x JOIN v7_evaluation_candidates c ON c.id=x.candidate_id
      WHERE x.channel_id='channel-hidden-systems' AND x.independent_count_eligible=1 ORDER BY x.evidence_authority DESC,x.created_at,x.id`),
    sourceRows(db, `SELECT e.id source_id,e.owner_receipt_id source_receipt_id,e.candidate_kind,a.mime_type,e.exact_artifact_hash,e.lineage_group_key,a.storage_key,a.byte_size,
      e.audio_observable_labels_json labels_json,e.bytes_state,e.checksum_state,e.rights_state
      FROM v7_evaluation_clean_audio_control_eligibility_receipts e JOIN v7_evaluation_commercial_clean_audio_artifacts a ON a.id=e.artifact_id
      WHERE e.channel_id='channel-hidden-systems' AND e.reference_eligible=1 ORDER BY e.created_at,e.id`),
    sourceRows(db, `SELECT d.id source_id,d.id source_receipt_id,'PACKAGING' candidate_kind,'application/json' mime_type,d.mutated_manifest_hash exact_artifact_hash,d.lineage_group_key,
      d.mutated_manifest_storage_key storage_key,d.mutated_manifest_bytes byte_size,d.expected_defect_key,d.severity,d.oracle_state,d.evidence_hash source_evidence_hash
      FROM v7_evaluation_controlled_defect_derivation_receipts d
      WHERE d.channel_id='channel-hidden-systems' AND d.controlled_injection_eligible=1 ORDER BY d.created_at,d.id`),
  ]);
  const items: FactoryAssuranceCorpusItemInput[] = [];
  let blindIndex = 0;
  for (const row of regressionRows) {
    const defects = presentDefects(row.labels_json), owner = String(row.evidence_authority) === "OWNER_CONFIRMED_REFERENCE", clean = String(row.expected_decision) === "CLEAN_NEGATIVE";
    const candidateKind = String(row.candidate_kind), mimeType = String(row.mime_type), exactArtifactHash = String(row.exact_artifact_hash).toLowerCase();
    const evidenceHash = await canonicalHash({ version: FACTORY_ASSURANCE_CORPUS_ADMISSION_VERSION, sourceFamily: "WP7_REGRESSION_CORPUS", row });
    const partitionHint: Partition = owner ? "PRODUCTION_HOLDOUT" : blindIndex++ < 5 ? "BLIND_QUALIFICATION" : "CALIBRATION";
    items.push({
      itemKey: `factory:corpus:wp7:${String(row.source_id)}`, sourceFamily: "WP7_REGRESSION_CORPUS", sourceId: String(row.source_id), sourceReceiptId: String(row.source_receipt_id), candidateKind, mimeType,
      storageKey: row.storage_key ? String(row.storage_key) : null, byteSize: Number(row.byte_size) || null, exactArtifactHash,
      labelSource: owner ? "OWNER_CONFIRMED" : clean ? "SEALED_CLEAN_CONTROL" : "SEALED_DEFECT_CONTROL", expectedOutcome: clean ? "PASS" : "FAIL", expectedSeverity: clean ? "NONE" : highestSeverity(defects),
      defectFamilies: clean ? ["CLEAN_CONTROL"] : defects.length ? defects : ["UNRESOLVED_DEFECT_FAMILY"], applicableLayers: applicableLayers(defects, candidateKind, mimeType), correlationGroup: String(row.lineage_group_key),
      ownerLabelHash: await canonicalHash({ sourceReceiptId: row.source_receipt_id, labels: row.labels_json }), bytesState: String(row.bytes_state) === "READBACK_VERIFIED" ? "READBACK_VERIFIED" : "NOT_VERIFIED",
      checksumState: String(row.checksum_state) === "PASS" ? "PASS" : "NOT_VERIFIED", rightsState: String(row.rights_verification_state) === "PASS" ? "PASS" : "UNKNOWN", partitionHint,
      countEligible: defects.length > 0 || clean, evidenceHash,
    });
  }
  for (const row of cleanAudioRows) {
    const exactArtifactHash = String(row.exact_artifact_hash).toLowerCase(), evidenceHash = await canonicalHash({ version: FACTORY_ASSURANCE_CORPUS_ADMISSION_VERSION, sourceFamily: "OWNER_CLEAN_AUDIO", row });
    items.push({ itemKey: `factory:corpus:clean-audio:${String(row.source_id)}`, sourceFamily: "OWNER_CLEAN_AUDIO", sourceId: String(row.source_id), sourceReceiptId: String(row.source_receipt_id), candidateKind: "AUDIO", mimeType: String(row.mime_type), storageKey: String(row.storage_key), byteSize: Number(row.byte_size), exactArtifactHash,
      labelSource: "OWNER_CONFIRMED", expectedOutcome: "PASS", expectedSeverity: "NONE", defectFamilies: ["CLEAN_CONTROL"], applicableLayers: ["L0", "L4", "L5", "L7"], correlationGroup: String(row.lineage_group_key), ownerLabelHash: await canonicalHash({ sourceReceiptId: row.source_receipt_id, labels: row.labels_json }),
      bytesState: String(row.bytes_state) === "READBACK_VERIFIED" ? "READBACK_VERIFIED" : "NOT_VERIFIED", checksumState: String(row.checksum_state) === "PASS" ? "PASS" : "NOT_VERIFIED", rightsState: String(row.rights_state) === "PASS" ? "PASS" : "UNKNOWN", partitionHint: "PRODUCTION_HOLDOUT", countEligible: true, evidenceHash });
  }
  for (const row of controlledDefectRows) {
    const defect = String(row.expected_defect_key), evidenceHash = await canonicalHash({ version: FACTORY_ASSURANCE_CORPUS_ADMISSION_VERSION, sourceFamily: "CONTROLLED_DEFECT", row });
    items.push({ itemKey: `factory:corpus:controlled-defect:${String(row.source_id)}`, sourceFamily: "CONTROLLED_DEFECT", sourceId: String(row.source_id), sourceReceiptId: String(row.source_receipt_id), candidateKind: "PACKAGING", mimeType: "application/json", storageKey: String(row.storage_key), byteSize: Number(row.byte_size), exactArtifactHash: String(row.exact_artifact_hash).toLowerCase(),
      labelSource: "SEALED_DEFECT_CONTROL", expectedOutcome: "FAIL", expectedSeverity: severityByDefect[defect] ?? "P0", defectFamilies: [defect], applicableLayers: layersByDefect[defect] ?? ["L0", "L7"], correlationGroup: String(row.lineage_group_key), ownerLabelHash: await canonicalHash({ oracle: row.oracle_state, defect, sourceReceiptId: row.source_receipt_id }),
      bytesState: String(row.oracle_state) === "PASS" ? "READBACK_VERIFIED" : "NOT_VERIFIED", checksumState: String(row.oracle_state) === "PASS" ? "PASS" : "NOT_VERIFIED", rightsState: "NOT_REQUIRED", partitionHint: "CALIBRATION", countEligible: String(row.oracle_state) === "PASS", evidenceHash });
  }
  const sourceSnapshotHash = await canonicalHash({ version: FACTORY_ASSURANCE_CORPUS_ADMISSION_VERSION, actor, sources: items.map((item) => ({ itemKey: item.itemKey, exactArtifactHash: item.exactArtifactHash, evidenceHash: item.evidenceHash })) });
  return recordFactoryAssuranceCorpusSnapshot(db, {
    snapshotKey: "factory:assurance:corpus-admission:hidden-systems:v1", channelId: "channel-hidden-systems", formatKey: "hidden-systems-documentary", policyVersion: "AI_FIRST_PRODUCTION_ASSURANCE_V1", sourceSnapshotHash, items,
    evidenceHash: await canonicalHash({ version: FACTORY_ASSURANCE_CORPUS_ADMISSION_VERSION, sourceSnapshotHash, zeroDispatch: true, providerRequests: 0, spendMicros: 0 }),
  });
}
