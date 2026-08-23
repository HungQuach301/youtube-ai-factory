import { canonicalHash, canonicalStringify, sha256Hex } from "@/lib/canonical-json";
import { measureOpenAIUsage } from "@/lib/ai-usage";
import { evaluateElevenLabsCommercialEntitlement } from "@/lib/elevenlabs-commercial-entitlement";

export const AUDIENCE_POLICY_VERSION = "YOUTUBE_AUDIENCE_MASTER_STANDARD_V1" as const;
export const AUDIENCE_BLUEPRINT_VERSION = "AUDIENCE_GOLDEN_BLUEPRINT_V1" as const;
const CHANNEL_ID = "channel-hidden-systems";
const VISUAL_DIMENSIONS = ["promiseDelivery", "semanticClarity", "visualRichness", "meaningfulMotion", "mobileLegibility", "retentionPacing"] as const;
const AUDIO_DIMENSIONS = ["naturalness", "pronunciation", "pacingProsody", "continuity", "mixClarity", "listenerComfort"] as const;
const CHUNK_MAX = 400_000;
type Row = Record<string, unknown>;
type RunResult = { meta?: { changes?: number } };
type Statement = { bind(...values: unknown[]): Statement; first<T = Row>(): Promise<T | null>; run(): Promise<RunResult> };
export type AudienceGoldenDB = { prepare(query: string): Statement };
type StoredObject = { arrayBuffer(): Promise<ArrayBuffer> };
export type AudienceGoldenBucket = {
  put(key: string, value: Uint8Array, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }): Promise<unknown>;
  get(key: string): Promise<StoredObject | null>;
};
export type AudienceGoldenEnv = { DB: AudienceGoldenDB; BUCKET: AudienceGoldenBucket; ELEVENLABS_API_KEY?: string; OPENAI_API_KEY?: string };

const clean = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);
const now = () => new Date().toISOString();
const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const jsonObject = (value: unknown): Row | null => {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Row;
  try { const parsed = JSON.parse(clean(value)); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Row : null; } catch { return null; }
};
const jsonArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  try { const parsed = JSON.parse(clean(value)); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
};
const base64 = (bytes: Uint8Array) => { let out = ""; for (let offset = 0; offset < bytes.length; offset += 0x8000) out += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000)); return btoa(out); };
async function first(db: AudienceGoldenDB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values).first<Row>(); }
async function run(db: AudienceGoldenDB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values.map((value) => value === undefined ? null : value)).run(); }
function outputText(payload: Row) {
  if (typeof payload.output_text === "string") return payload.output_text;
  for (const item of Array.isArray(payload.output) ? payload.output as Row[] : []) for (const block of Array.isArray(item.content) ? item.content as Row[] : []) if (typeof block.text === "string") return block.text;
  return "";
}

export class AudienceGoldenError extends Error {
  constructor(public code: string, public status: number, message: string) { super(message); }
}

export const AUDIENCE_GOLDEN_NARRATION = `Một khoản thanh toán bằng thẻ trông như hoàn tất chỉ trong một giây. Nhưng phía sau cú chạm ấy là ba quyết định khác nhau. Đầu tiên là authorization: ngân hàng phát hành kiểm tra thẻ, hạn mức và tín hiệu rủi ro, rồi đặt một khoản giữ tạm thời. Đây chưa phải tiền đã chuyển. Tiếp theo là clearing: đơn vị chấp nhận thẻ gửi bản ghi giao dịch qua mạng lưới, nơi số tiền, phí và trách nhiệm được đối chiếu. Nếu số tiền cuối cùng thay đổi, khoản giữ ban đầu có thể khác với bản ghi clearing. Cuối cùng là settlement: các nghĩa vụ ròng được chuyển giữa các bên và người bán nhận tiền theo lịch của mình. Vì thế, trạng thái pending không đồng nghĩa với bị trừ hai lần, còn approved không đồng nghĩa người bán đã nhận tiền. Khi một giao dịch bị hủy, hết hạn giữ, hoàn tiền hoặc tranh chấp, nhánh xử lý lại khác. Cách đọc đúng là hỏi ba câu: ngân hàng đã cho phép chưa, bản ghi cuối đã được đối chiếu chưa, và tiền đã thực sự quyết toán chưa. Ba lớp, ba thời điểm, một giao dịch.`;

export const AUDIENCE_GOLDEN_STORY = {
  episodeKey: "card-payment-three-hidden-decisions",
  titlePromise: "Điều gì thực sự xảy ra sau một cú chạm thẻ?",
  hookSeconds: 7,
  scenes: [
    { key: "hook", start: 0, end: 7, treatment: "kinetic-type", promise: "Một giây ở quầy, ba quyết định phía sau" },
    { key: "authorization", start: 7, end: 18, treatment: "system-flow", promise: "Approval là quyền cho phép và khoản giữ" },
    { key: "hold", start: 18, end: 27, treatment: "account-ledger", promise: "Giữ tạm không phải tiền đã chuyển" },
    { key: "clearing", start: 27, end: 39, treatment: "data-matrix", promise: "Bản ghi cuối và phí được đối chiếu" },
    { key: "settlement", start: 39, end: 51, treatment: "network-flow", promise: "Nghĩa vụ ròng mới thực sự di chuyển" },
    { key: "myth", start: 51, end: 61, treatment: "state-comparison", promise: "Pending, approved và paid khác nhau" },
    { key: "exceptions", start: 61, end: 70, treatment: "branch-map", promise: "Hủy, hoàn, tranh chấp tạo nhánh mới" },
    { key: "payoff", start: 70, end: 78, treatment: "timeline-summary", promise: "Ba câu hỏi để đọc đúng mọi giao dịch" },
  ],
  visualFamilies: ["kinetic-type", "system-flow", "account-ledger", "data-matrix", "network-flow", "state-comparison", "branch-map", "timeline-summary"],
  prohibitions: ["generic-slide-layout", "camera-only-motion", "decorative-stock-footage", "production-residue", "small-critical-text"],
};

export async function audienceGoldenSnapshot(db: AudienceGoldenDB) {
  const [policy, disposition, blueprint] = await Promise.all([
    first(db, "SELECT * FROM v7_youtube_audience_master_policies WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, AUDIENCE_POLICY_VERSION),
    first(db, "SELECT * FROM v7_youtube_audience_master_dispositions WHERE channel_id=? ORDER BY created_at DESC LIMIT 1", CHANNEL_ID),
    first(db, "SELECT * FROM v7_youtube_golden_sequence_blueprints WHERE channel_id=? AND blueprint_version=? ORDER BY created_at DESC,id DESC LIMIT 1", CHANNEL_ID, AUDIENCE_BLUEPRINT_VERSION),
  ]);
  const [audio, materialization] = blueprint ? await Promise.all([
    first(db, "SELECT * FROM v7_youtube_golden_audio_artifacts WHERE blueprint_id=? LIMIT 1", blueprint.id),
    first(db, "SELECT * FROM v7_youtube_golden_materialization_receipts WHERE blueprint_id=? LIMIT 1", blueprint.id),
  ]) : [null, null];
  const [visualQa, audioQa, browserQa, ownerTask, freeze] = materialization ? await Promise.all([
    first(db, "SELECT * FROM v7_youtube_golden_qa_receipts WHERE materialization_receipt_id=? AND qa_layer='FACTORY_VISUAL' LIMIT 1", materialization.id),
    first(db, "SELECT * FROM v7_youtube_golden_qa_receipts WHERE materialization_receipt_id=? AND qa_layer='FACTORY_AUDIO' LIMIT 1", materialization.id),
    first(db, "SELECT * FROM v7_youtube_golden_qa_receipts WHERE materialization_receipt_id=? AND qa_layer='BROWSER_DEVICE' LIMIT 1", materialization.id),
    first(db, "SELECT * FROM v7_youtube_golden_owner_tasks WHERE materialization_receipt_id=? LIMIT 1", materialization.id),
    first(db, "SELECT * FROM v7_youtube_golden_freeze_receipts WHERE materialization_receipt_id=? LIMIT 1", materialization.id),
  ]) : [null, null, null, null, null];
  const ownerReceipt = ownerTask ? await first(db, "SELECT * FROM v7_youtube_golden_owner_receipts WHERE task_id=? LIMIT 1", ownerTask.id) : null;
  const qa = (row: Row | null) => row ? ({ id: clean(row.id), decisionState: clean(row.decision_state), overallScore: number(row.overall_score), dimensions: jsonObject(row.dimensions_json), p0Count: number(row.p0_count), p1Count: number(row.p1_count), p2Count: number(row.p2_count), findings: jsonArray(row.findings_json), evidence: jsonObject(row.evidence_json), actualSpendUsd: number(row.actual_spend_usd) }) : null;
  return {
    policy: policy ? { version: clean(policy.policy_version), overallFloor: number(policy.overall_floor), criticalDimensionFloor: number(policy.critical_dimension_floor), maximumP0: number(policy.maximum_p0), maximumP1: number(policy.maximum_p1), maximumP2: number(policy.maximum_p2), releaseAuthority: false } : null,
    currentMasterDisposition: disposition ? { decisionState: clean(disposition.decision_state), defects: jsonArray(disposition.defects_json), ownerFullPlaybackAttested: Boolean(number(disposition.owner_full_playback_attested)) } : null,
    blueprint: blueprint ? { id: clean(blueprint.id), version: clean(blueprint.blueprint_version), titlePromise: clean(blueprint.title_promise), narrationText: clean(blueprint.narration_text), narrationHash: clean(blueprint.narration_hash), storyContract: jsonObject(blueprint.story_contract_json), lifecycleState: clean(blueprint.lifecycle_state) } : null,
    audio: audio ? { id: clean(audio.id), hash: clean(audio.sha256), bytes: number(audio.byte_size), rightsState: clean(audio.rights_state), providerRequestId: clean(audio.provider_native_request_id), subscriptionTier: clean(audio.subscription_tier), sourceUrl: "/api/factory/sequential-production/audience-golden?media=source-audio" } : null,
    materialization: materialization ? { id: clean(materialization.id), masterHash: clean(materialization.master_hash), masterBytes: number(materialization.master_bytes), durationSeconds: number(materialization.duration_seconds), width: number(materialization.width), height: number(materialization.height), frameRate: number(materialization.frame_rate), deterministicState: clean(materialization.deterministic_state), rightsState: clean(materialization.rights_state), technicalEvidence: jsonObject(materialization.technical_evidence_json), visualManifest: jsonObject(materialization.visual_manifest_json), masterUrl: "/api/factory/sequential-production/audience-golden?media=master" } : null,
    factoryVisualQa: qa(visualQa), factoryAudioQa: qa(audioQa), browserQa: qa(browserQa),
    ownerTask: ownerTask ? { id: clean(ownerTask.id), state: ownerReceipt ? "COMPLETE" : clean(ownerTask.task_state) } : null,
    ownerReceipt: ownerReceipt ? { id: clean(ownerReceipt.id), decisionState: clean(ownerReceipt.decision_state), fullPlaybackAttested: Boolean(number(ownerReceipt.full_playback_attested)), rationale: clean(ownerReceipt.rationale) } : null,
    freeze: freeze ? { id: clean(freeze.id), decisionState: clean(freeze.decision_state), overallScore: number(freeze.overall_score), frozenAt: clean(freeze.created_at), publicationAuthority: false } : null,
    nextAction: freeze ? "FROZEN" : ownerTask && !ownerReceipt ? "OWNER_FULL_PLAYBACK_REQUIRED" : visualQa && audioQa && (clean(visualQa.decision_state) === "FAIL" || clean(audioQa.decision_state) === "FAIL") ? "CREATE_REPAIR_REVISION" : materialization && !visualQa ? "RUN_FACTORY_VISUAL_QA" : materialization && !audioQa ? "RUN_FACTORY_AUDIO_QA" : materialization && !browserQa ? "RUN_BROWSER_QA" : audio && !materialization ? "MATERIALIZE_MASTER" : blueprint && !audio ? "GENERATE_AUDIO" : "SEAL_BLUEPRINT",
  };
}

export async function createAudienceGoldenRepairRevisionAuthorized(env: AudienceGoldenEnv, actor: string, idempotencyKey: string) {
  const latest = await first(env.DB, "SELECT * FROM v7_youtube_golden_sequence_blueprints WHERE channel_id=? ORDER BY created_at DESC,id DESC LIMIT 1", CHANNEL_ID);
  if (clean(latest?.id).endsWith(":r2")) return createAudienceGoldenRepairRevision3Authorized(env, actor, idempotencyKey, latest as Row);
  const priorReceipt = await first(env.DB, "SELECT * FROM v7_youtube_golden_revision_receipts WHERE channel_id=? AND idempotency_key=? LIMIT 1", CHANNEL_ID, idempotencyKey); if (priorReceipt) return { outcome: "REPLAYED", snapshot: await audienceGoldenSnapshot(env.DB) };
  const rejected = await first(env.DB, "SELECT * FROM v7_youtube_golden_sequence_blueprints WHERE channel_id=? ORDER BY created_at DESC,id DESC LIMIT 1", CHANNEL_ID); if (!rejected) throw new AudienceGoldenError("REJECTED_BLUEPRINT_MISSING", 409, "A rejected Golden blueprint is required");
  const materialization = await first(env.DB, "SELECT * FROM v7_youtube_golden_materialization_receipts WHERE blueprint_id=?", rejected.id); if (!materialization) throw new AudienceGoldenError("REJECTED_MATERIALIZATION_MISSING", 409, "A rejected materialization is required");
  const [visualQa, audioQa] = await Promise.all([first(env.DB, "SELECT * FROM v7_youtube_golden_qa_receipts WHERE materialization_receipt_id=? AND qa_layer='FACTORY_VISUAL'", materialization.id), first(env.DB, "SELECT * FROM v7_youtube_golden_qa_receipts WHERE materialization_receipt_id=? AND qa_layer='FACTORY_AUDIO'", materialization.id)]);
  if (!visualQa || !audioQa || (clean(visualQa.decision_state) !== "FAIL" && clean(audioQa.decision_state) !== "FAIL")) throw new AudienceGoldenError("REPAIR_FAILURE_EVIDENCE_REQUIRED", 409, "Independent failure evidence is required before revision");
  const replacementId = `audience-golden-blueprint:${CHANNEL_ID}:r2`, existing = await first(env.DB, "SELECT id FROM v7_youtube_golden_sequence_blueprints WHERE id=?", replacementId); if (!existing) {
    const narration = AUDIENCE_GOLDEN_NARRATION.replaceAll(":", ".").replaceAll(";", "."), narrationHash = await sha256Hex(new TextEncoder().encode(narration));
    const repairContract = { revision: 2, rootOwners: ["VISUAL_GRAMMAR", "MOBILE_TYPOGRAPHY", "AUDIO_MIX", "VOICE_PACING"], visual: { distinctScenePalettes: 8, persistentChrome: false, minimumSupportingFontPx1080: 46, hookProgressIntervalSeconds: 1.8 }, audio: { speechSpeed: .98, stability: .56, style: .06, musicBed: false, targetLufs: -14, truePeakDbtp: -2 } };
    await run(env.DB, `INSERT INTO v7_youtube_golden_sequence_blueprints (id,channel_id,policy_version,blueprint_version,episode_key,title_promise,narration_text,narration_hash,story_contract_json,visual_contract_json,audio_contract_json,lifecycle_state,actor) VALUES (?,?,?,?,?,?,?,?,?,?,?,'SEALED',?)`, replacementId, CHANNEL_ID, AUDIENCE_POLICY_VERSION, AUDIENCE_BLUEPRINT_VERSION, `${AUDIENCE_GOLDEN_STORY.episodeKey}-revision-2`, AUDIENCE_GOLDEN_STORY.titlePromise, narration, narrationHash, canonicalStringify({ ...AUDIENCE_GOLDEN_STORY, repairContract }), canonicalStringify(repairContract.visual), canonicalStringify(repairContract.audio), actor);
    const evidenceHash = await canonicalHash({ rejectedBlueprintId: rejected.id, rejectedMaterializationId: materialization.id, replacementId, visualFailureReceiptId: visualQa.id, audioFailureReceiptId: audioQa.id, repairContract });
    await run(env.DB, "INSERT INTO v7_youtube_golden_revision_receipts (id,channel_id,rejected_blueprint_id,rejected_materialization_receipt_id,replacement_blueprint_id,revision_key,visual_failure_receipt_id,audio_failure_receipt_id,repair_contract_json,actor,idempotency_key,evidence_hash) VALUES (?,?,?,?,?,'AUDIENCE_GOLDEN_REVISION_2',?,?,?,?,?,?)", makeId("audience-golden-revision"), CHANNEL_ID, rejected.id, materialization.id, replacementId, visualQa.id, audioQa.id, canonicalStringify(repairContract), actor, idempotencyKey, evidenceHash);
  }
  return { outcome: "REPAIR_REVISION_SEALED", snapshot: await audienceGoldenSnapshot(env.DB) };
}

async function createAudienceGoldenRepairRevision3Authorized(env: AudienceGoldenEnv, actor: string, idempotencyKey: string, rejected: Row) {
  const priorReceipt = await first(env.DB, "SELECT * FROM v7_youtube_golden_revision_3_receipts WHERE channel_id=? AND idempotency_key=? LIMIT 1", CHANNEL_ID, idempotencyKey); if (priorReceipt) return { outcome: "REPLAYED", snapshot: await audienceGoldenSnapshot(env.DB) };
  const materialization = await first(env.DB, "SELECT * FROM v7_youtube_golden_materialization_receipts WHERE blueprint_id=?", rejected.id); if (!materialization) throw new AudienceGoldenError("REJECTED_MATERIALIZATION_MISSING", 409, "Revision 2 materialization is required");
  const [visualQa, audioQa] = await Promise.all([first(env.DB, "SELECT * FROM v7_youtube_golden_qa_receipts WHERE materialization_receipt_id=? AND qa_layer='FACTORY_VISUAL'", materialization.id), first(env.DB, "SELECT * FROM v7_youtube_golden_qa_receipts WHERE materialization_receipt_id=? AND qa_layer='FACTORY_AUDIO'", materialization.id)]);
  if (!visualQa || clean(visualQa.decision_state) !== "FAIL" || !audioQa || clean(audioQa.decision_state) !== "PASS") throw new AudienceGoldenError("REVISION_3_EVIDENCE_REQUIRED", 409, "Revision 3 requires failed visual QA and passing exact-audio QA");
  const replacementId = `audience-golden-blueprint:${CHANNEL_ID}:r3`, existing = await first(env.DB, "SELECT id FROM v7_youtube_golden_sequence_blueprints WHERE id=?", replacementId);
  if (!existing) {
    const narration = clean(rejected.narration_text), narrationHash = await sha256Hex(new TextEncoder().encode(narration));
    const repairContract = { revision: 3, rootOwners: ["VISUAL_GRAMMAR", "MOBILE_TYPOGRAPHY", "SEMANTIC_EXAMPLES", "RETENTION_PACING"], inheritedAudioPassReceiptId: audioQa.id, visual: { microSceneIntervalSeconds: 2.2, minimumSupportingFontPx1080: 54, repeatedCompositionMaximum: 1, numericHoldExample: true, twoSidedClearingReconciliation: true, persistentChrome: false }, audio: { settingsInheritedFromPassingRevision: 2, musicBed: false, targetLufs: -14, truePeakDbtp: -2 } };
    await run(env.DB, `INSERT INTO v7_youtube_golden_sequence_blueprints (id,channel_id,policy_version,blueprint_version,episode_key,title_promise,narration_text,narration_hash,story_contract_json,visual_contract_json,audio_contract_json,lifecycle_state,actor) VALUES (?,?,?,?,?,?,?,?,?,?,?,'SEALED',?)`, replacementId, CHANNEL_ID, AUDIENCE_POLICY_VERSION, AUDIENCE_BLUEPRINT_VERSION, `${AUDIENCE_GOLDEN_STORY.episodeKey}-revision-3`, AUDIENCE_GOLDEN_STORY.titlePromise, narration, narrationHash, canonicalStringify({ ...AUDIENCE_GOLDEN_STORY, repairContract }), canonicalStringify(repairContract.visual), canonicalStringify(repairContract.audio), actor);
    const evidenceHash = await canonicalHash({ rejectedBlueprintId: rejected.id, rejectedMaterializationId: materialization.id, replacementId, visualFailureReceiptId: visualQa.id, audioPassReceiptId: audioQa.id, repairContract });
    await run(env.DB, "INSERT INTO v7_youtube_golden_revision_3_receipts (id,channel_id,rejected_blueprint_id,rejected_materialization_receipt_id,replacement_blueprint_id,revision_key,visual_failure_receipt_id,audio_pass_receipt_id,repair_contract_json,actor,idempotency_key,evidence_hash) VALUES (?,?,?,?,?,'AUDIENCE_GOLDEN_REVISION_3',?,?,?,?,?,?)", makeId("audience-golden-revision-3"), CHANNEL_ID, rejected.id, materialization.id, replacementId, visualQa.id, audioQa.id, canonicalStringify(repairContract), actor, idempotencyKey, evidenceHash);
  }
  return { outcome: "REPAIR_REVISION_3_SEALED", snapshot: await audienceGoldenSnapshot(env.DB) };
}

export async function bootstrapAudienceGoldenAuthorized(env: AudienceGoldenEnv, actor: string, idempotencyKey: string) {
  if (!/^[A-Za-z0-9._:-]{16,160}$/.test(idempotencyKey)) throw new AudienceGoldenError("IDEMPOTENCY_KEY_INVALID", 400, "A stable idempotency key is required");
  const current = await first(env.DB, "SELECT * FROM v7_evaluation_clean_av_master_materialization_receipts WHERE channel_id=? LIMIT 1", CHANNEL_ID);
  if (!current) throw new AudienceGoldenError("CURRENT_MASTER_EVIDENCE_MISSING", 409, "The current technical-control master evidence is required before replacement");
  const priorDisposition = await first(env.DB, "SELECT id FROM v7_youtube_audience_master_dispositions WHERE channel_id=? LIMIT 1", CHANNEL_ID);
  if (!priorDisposition) {
    const defects = ["OUTPUT_FORM_MISMATCH", "VISUAL_RICHNESS_LOW", "MEANINGFUL_MOTION_LOW", "MOBILE_TYPOGRAPHY_WEAK", "RETENTION_RISK"];
    const evidenceHash = await canonicalHash({ masterHash: current.distribution_hash, decisionState: "DEFECT_REJECTED", defects, ownerFullPlaybackAttested: false, authorityBoundary: "OWNER_OBSERVATION_REJECTION_ONLY" });
    await run(env.DB, `INSERT INTO v7_youtube_audience_master_dispositions (id,channel_id,policy_version,master_hash,decision_state,defects_json,owner_full_playback_attested,authority_boundary,actor,idempotency_key,evidence_hash) VALUES (?,?,?,?,'DEFECT_REJECTED',?,0,'OWNER_OBSERVATION_REJECTION_ONLY',?,?,?)`, makeId("audience-disposition"), CHANNEL_ID, AUDIENCE_POLICY_VERSION, clean(current.distribution_hash), canonicalStringify(defects), actor, `${idempotencyKey}:disposition`, evidenceHash);
  }
  let blueprint = await first(env.DB, "SELECT * FROM v7_youtube_golden_sequence_blueprints WHERE channel_id=? LIMIT 1", CHANNEL_ID);
  if (!blueprint) {
    const narrationHash = await sha256Hex(new TextEncoder().encode(AUDIENCE_GOLDEN_NARRATION));
    const visualContract = { resolution: "2560x1440", frameRate: 30, minimumCriticalFontPx1080: 38, semanticRuntimeRatio: 1, slideshowRuntimeRatio: 0, meaningfulMotionRatio: 0.92, first30MotionRatio: 0.96, cameraOnlyRatio: 0, maximumStaticHoldSeconds: 2.8, maximumVisualEventIntervalSeconds: 4.5, treatmentFamilies: AUDIENCE_GOLDEN_STORY.visualFamilies.length };
    const audioContract = { language: "vi", provider: "ELEVENLABS", model: "eleven_multilingual_v2", targetLufs: -14, truePeakCeilingDbtp: -1, sampleRateHz: 48000, oneSubscriptionReadMaximum: true, oneTtsRequestMaximum: true };
    const blueprintId = `audience-golden-blueprint:${CHANNEL_ID}:v1`;
    await run(env.DB, `INSERT INTO v7_youtube_golden_sequence_blueprints (id,channel_id,policy_version,blueprint_version,episode_key,title_promise,narration_text,narration_hash,story_contract_json,visual_contract_json,audio_contract_json,lifecycle_state,actor) VALUES (?,?,?,?,?,?,?,?,?,?,?,'SEALED',?)`, blueprintId, CHANNEL_ID, AUDIENCE_POLICY_VERSION, AUDIENCE_BLUEPRINT_VERSION, AUDIENCE_GOLDEN_STORY.episodeKey, AUDIENCE_GOLDEN_STORY.titlePromise, AUDIENCE_GOLDEN_NARRATION, narrationHash, canonicalStringify(AUDIENCE_GOLDEN_STORY), canonicalStringify(visualContract), canonicalStringify(audioContract), actor);
    blueprint = await first(env.DB, "SELECT * FROM v7_youtube_golden_sequence_blueprints WHERE id=?", blueprintId);
  }
  return { outcome: "BLUEPRINT_SEALED", snapshot: await audienceGoldenSnapshot(env.DB) };
}

export async function generateAudienceGoldenAudioAuthorized(env: AudienceGoldenEnv, actor: string, idempotencyKey: string) {
  if (!env.ELEVENLABS_API_KEY) throw new AudienceGoldenError("ELEVENLABS_API_KEY_REQUIRED", 424, "ElevenLabs is required");
  const prior = await first(env.DB, "SELECT * FROM v7_youtube_golden_audio_runs WHERE channel_id=? AND idempotency_key=? LIMIT 1", CHANNEL_ID, idempotencyKey);
  if (prior && clean(prior.lifecycle_state) === "COMPLETE") return { outcome: "REPLAYED", snapshot: await audienceGoldenSnapshot(env.DB) };
  const recoveryMode = Boolean(prior && clean(prior.lifecycle_state) === "FAILED" && number(prior.subscription_reads) === 1 && number(prior.tts_requests) === 1 && clean(prior.error_code) === "UNEXPECTED_GOLDEN_AUDIO_FAILURE");
  if (prior && !recoveryMode) throw new AudienceGoldenError("GOLDEN_AUDIO_ALREADY_ATTEMPTED", 409, `The immutable audio attempt is ${clean(prior.lifecycle_state)}`);
  const [blueprint, existing, priorVoice] = await Promise.all([
    first(env.DB, "SELECT * FROM v7_youtube_golden_sequence_blueprints WHERE channel_id=? AND blueprint_version=? ORDER BY created_at DESC,id DESC LIMIT 1", CHANNEL_ID, AUDIENCE_BLUEPRINT_VERSION),
    first(env.DB, "SELECT id FROM v7_youtube_golden_audio_artifacts WHERE blueprint_id=(SELECT id FROM v7_youtube_golden_sequence_blueprints WHERE channel_id=? ORDER BY created_at DESC,id DESC LIMIT 1) LIMIT 1", CHANNEL_ID),
    first(env.DB, `SELECT p.voice_id FROM v7_evaluation_commercial_clean_audio_artifacts a
      JOIN v7_evaluation_commercial_clean_audio_provider_receipts p ON p.id=a.provider_receipt_id
      WHERE a.channel_id=? ORDER BY a.created_at DESC LIMIT 1`, CHANNEL_ID),
  ]);
  if (!blueprint || existing || !priorVoice || !clean(priorVoice.voice_id)) throw new AudienceGoldenError(existing ? "GOLDEN_AUDIO_CEILING_REACHED" : "GOLDEN_AUDIO_PREREQUISITES_MISSING", 409, existing ? "The single TTS ceiling has been reached" : "A sealed blueprint and verified voice lineage are required");
  const revisionTwo = clean(blueprint.id).endsWith(":r2");
  const requestBody = { text: clean(blueprint.narration_text), model_id: "eleven_multilingual_v2", voice_settings: revisionTwo ? { stability: .56, similarity_boost: .78, style: .06, speed: .98, use_speaker_boost: true } : { stability: .66, similarity_boost: .8, style: .14, speed: 1.06, use_speaker_boost: true } };
  const intentHash = await canonicalHash({ blueprintId: blueprint.id, narrationHash: blueprint.narration_hash, voiceId: priorVoice.voice_id, requestBody });
  const runId = recoveryMode ? clean(prior?.id) : makeId("audience-golden-audio-run"), recoveryId = recoveryMode ? makeId("audience-golden-audio-recovery") : "";
  if (recoveryMode) {
    const existingRecovery = await first(env.DB, "SELECT * FROM v7_youtube_golden_audio_recovery_receipts WHERE failed_run_id=? LIMIT 1", runId); if (existingRecovery) throw new AudienceGoldenError("GOLDEN_AUDIO_RECOVERY_ALREADY_ATTEMPTED", 409, `The append-only recovery is ${clean(existingRecovery.lifecycle_state)}`);
    await run(env.DB, "INSERT INTO v7_youtube_golden_audio_recovery_receipts (id,channel_id,failed_run_id,policy_version,recovery_version,failure_basis,idempotency_key,lifecycle_state,actor) VALUES (?,?,?,?,'AUDIENCE_GOLDEN_POST_TTS_RECOVERY_V1','POST_TTS_INTERNAL_CONTRACT_FAILURE',?,'RUNNING',?)", recoveryId, CHANNEL_ID, runId, AUDIENCE_POLICY_VERSION, `${idempotencyKey}:post-tts-recovery`, actor);
  } else await run(env.DB, "INSERT INTO v7_youtube_golden_audio_runs (id,channel_id,blueprint_id,policy_version,idempotency_key,intent_hash,lifecycle_state,reserved_spend_usd,actor) VALUES (?,?,?,?,?,?,'PLANNED',0.20,?)", runId, CHANNEL_ID, blueprint.id, AUDIENCE_POLICY_VERSION, idempotencyKey, intentHash, actor);
  try {
    if (!recoveryMode) await run(env.DB, "UPDATE v7_youtube_golden_audio_runs SET lifecycle_state='RUNNING' WHERE id=?", runId);
    const subscriptionResponse = await fetch("https://api.elevenlabs.io/v1/user/subscription", { headers: { "xi-api-key": env.ELEVENLABS_API_KEY }, signal: AbortSignal.timeout(30_000) });
    await run(env.DB, recoveryMode ? "UPDATE v7_youtube_golden_audio_recovery_receipts SET subscription_reads=1 WHERE id=?" : "UPDATE v7_youtube_golden_audio_runs SET subscription_reads=1 WHERE id=?", recoveryMode ? recoveryId : runId);
    if (!subscriptionResponse.ok) throw new AudienceGoldenError("ELEVENLABS_SUBSCRIPTION_CHECK_FAILED", 502, `ElevenLabs subscription check failed (${subscriptionResponse.status})`);
    const subscriptionText = await subscriptionResponse.text(); const subscription = jsonObject(subscriptionText); if (!subscription) throw new AudienceGoldenError("ELEVENLABS_SUBSCRIPTION_RESPONSE_INVALID", 502, "The subscription response was invalid");
    const entitlement = evaluateElevenLabsCommercialEntitlement(subscription); if (!entitlement.commercialUseEligible) throw new AudienceGoldenError("ELEVENLABS_ACTIVE_PAID_PLAN_REQUIRED", 409, `An active paid base plan is required (${entitlement.state})`);
    const subscriptionBytes = new TextEncoder().encode(subscriptionText), subscriptionHash = await sha256Hex(subscriptionBytes), subscriptionKey = `youtube-audience-golden/v1/subscription/${subscriptionHash}.json`;
    await env.BUCKET.put(subscriptionKey, subscriptionBytes, { httpMetadata: { contentType: "application/json" }, customMetadata: { sha256: subscriptionHash, runId } });
    const subscriptionStored = await env.BUCKET.get(subscriptionKey); if (!subscriptionStored || await sha256Hex(new Uint8Array(await subscriptionStored.arrayBuffer())) !== subscriptionHash) throw new AudienceGoldenError("SUBSCRIPTION_R2_READBACK_FAILED", 503, "Subscription evidence failed exact read-back");
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(clean(priorVoice.voice_id))}?output_format=mp3_44100_128`, { method: "POST", headers: { "xi-api-key": env.ELEVENLABS_API_KEY, "content-type": "application/json", "idempotency-key": idempotencyKey }, body: JSON.stringify(requestBody), signal: AbortSignal.timeout(180_000) });
    await run(env.DB, recoveryMode ? "UPDATE v7_youtube_golden_audio_recovery_receipts SET tts_requests=1 WHERE id=?" : "UPDATE v7_youtube_golden_audio_runs SET tts_requests=1 WHERE id=?", recoveryMode ? recoveryId : runId);
    if (!response.ok) throw new AudienceGoldenError("ELEVENLABS_GOLDEN_TTS_FAILED", 502, `ElevenLabs synthesis failed (${response.status})`);
    const providerRequestId = clean(response.headers.get("request-id")); if (!providerRequestId) throw new AudienceGoldenError("ELEVENLABS_REQUEST_ID_MISSING", 502, "ElevenLabs returned no provider request ID");
    const bytes = new Uint8Array(await response.arrayBuffer()); if (bytes.byteLength < 10_000) throw new AudienceGoldenError("ELEVENLABS_AUDIO_INVALID", 502, "ElevenLabs returned an invalid audio body");
    const hash = await sha256Hex(bytes), storageKey = `youtube-audience-golden/v1/source-audio/${hash}.mp3`;
    await env.BUCKET.put(storageKey, bytes, { httpMetadata: { contentType: "audio/mpeg" }, customMetadata: { sha256: hash, providerRequestId, narrationHash: clean(blueprint.narration_hash), releaseEligible: "false" } });
    const stored = await env.BUCKET.get(storageKey); if (!stored || await sha256Hex(new Uint8Array(await stored.arrayBuffer())) !== hash) throw new AudienceGoldenError("GOLDEN_AUDIO_R2_READBACK_FAILED", 503, "Audio failed exact R2 read-back");
    const artifactId = makeId("audience-golden-audio"), evidenceHash = await canonicalHash({ runId, blueprintId: blueprint.id, providerRequestId, voiceId: priorVoice.voice_id, modelId: "eleven_multilingual_v2", tier: entitlement.tier, status: entitlement.status, subscriptionHash, storageKey, hash, bytes: bytes.byteLength, narrationHash: blueprint.narration_hash, rightsState: "PASS" });
    await run(env.DB, `INSERT INTO v7_youtube_golden_audio_artifacts (id,run_id,channel_id,blueprint_id,provider_family,provider_native_request_id,voice_id,model_id,subscription_tier,subscription_status,subscription_response_hash,subscription_storage_key,subscription_readback_hash,storage_key,mime_type,byte_size,sha256,readback_sha256,rights_state,narration_hash,evidence_hash,authority_boundary) VALUES (?,?,?,?,'ELEVENLABS',?,?,?,?,?,?,?,?,?,'audio/mpeg',?,?,?,?,?,?,'GOLDEN_AUDIO_SOURCE_ONLY')`, artifactId, runId, CHANNEL_ID, blueprint.id, providerRequestId, priorVoice.voice_id, "eleven_multilingual_v2", entitlement.tier, "active", subscriptionHash, subscriptionKey, subscriptionHash, storageKey, bytes.byteLength, hash, hash, "PASS", blueprint.narration_hash, evidenceHash);
    if (recoveryMode) await run(env.DB, "UPDATE v7_youtube_golden_audio_recovery_receipts SET lifecycle_state='COMPLETE',provider_native_request_id=?,exact_audio_hash=?,completed_at=? WHERE id=?", providerRequestId, hash, now(), recoveryId); else await run(env.DB, "UPDATE v7_youtube_golden_audio_runs SET lifecycle_state='COMPLETE',completed_at=? WHERE id=?", now(), runId);
    return { outcome: "AUDIO_CREATED", snapshot: await audienceGoldenSnapshot(env.DB) };
  } catch (error) {
    const known = error instanceof AudienceGoldenError ? error : new AudienceGoldenError("UNEXPECTED_GOLDEN_AUDIO_FAILURE", 500, "Unexpected Golden audio failure");
    await run(env.DB, recoveryMode ? "UPDATE v7_youtube_golden_audio_recovery_receipts SET lifecycle_state='FAILED',error_code=?,completed_at=? WHERE id=?" : "UPDATE v7_youtube_golden_audio_runs SET lifecycle_state='FAILED',error_code=?,completed_at=? WHERE id=?", known.code, now(), recoveryMode ? recoveryId : runId).catch(() => undefined);
    throw known;
  }
}

const roleMime = (role: string) => role === "MASTER" ? "video/mp4" : role === "AUDIENCE_MIX" ? "audio/mpeg" : "image/jpeg";
const chunkKey = (blueprintId: string, role: string, fullHash: string, index: number, hash: string) => `youtube-audience-golden/v1/staging/${blueprintId}/${role}/${fullHash}/${String(index).padStart(3, "0")}-${hash}.part`;
export async function stageAudienceGoldenChunkAuthorized(env: AudienceGoldenEnv, args: { blueprintId: string; role: string; fullHash: string; totalBytes: number; chunkIndex: number; chunkCount: number; chunkHash: string; bytes: Uint8Array }) {
  const role = clean(args.role).toUpperCase();
  if (!["MASTER", "AUDIENCE_MIX", "ATLAS_1", "ATLAS_2", "ATLAS_3", "ATLAS_4"].includes(role)) throw new AudienceGoldenError("UPLOAD_ROLE_INVALID", 400, "Use an allowlisted Golden role");
  if (!/^[a-f0-9]{64}$/.test(args.fullHash) || !/^[a-f0-9]{64}$/.test(args.chunkHash) || args.bytes.byteLength < 1 || args.bytes.byteLength > CHUNK_MAX || args.chunkCount < 1 || args.chunkCount > 128 || args.chunkIndex < 0 || args.chunkIndex >= args.chunkCount) throw new AudienceGoldenError("UPLOAD_DESCRIPTOR_INVALID", 400, "The chunk descriptor is invalid");
  if (await sha256Hex(args.bytes) !== args.chunkHash) throw new AudienceGoldenError("UPLOAD_CHUNK_HASH_MISMATCH", 409, "The staged chunk hash differs from its bytes");
  const blueprint = await first(env.DB, "SELECT id FROM v7_youtube_golden_sequence_blueprints WHERE id=? AND channel_id=?", args.blueprintId, CHANNEL_ID); if (!blueprint) throw new AudienceGoldenError("BLUEPRINT_NOT_FOUND", 404, "The sealed blueprint was not found");
  const key = chunkKey(args.blueprintId, role, args.fullHash, args.chunkIndex, args.chunkHash);
  await env.BUCKET.put(key, args.bytes, { httpMetadata: { contentType: "application/octet-stream" }, customMetadata: { sha256: args.chunkHash, role, fullHash: args.fullHash, releaseEligible: "false" } });
  const stored = await env.BUCKET.get(key); if (!stored || await sha256Hex(new Uint8Array(await stored.arrayBuffer())) !== args.chunkHash) throw new AudienceGoldenError("UPLOAD_READBACK_FAILED", 503, "The staged chunk failed exact read-back");
  await run(env.DB, "INSERT OR IGNORE INTO v7_youtube_golden_upload_chunks (id,channel_id,blueprint_id,role,full_hash,total_bytes,chunk_index,chunk_count,chunk_hash,chunk_bytes,storage_key) VALUES (?,?,?,?,?,?,?,?,?,?,?)", makeId("golden-chunk"), CHANNEL_ID, args.blueprintId, role, args.fullHash, args.totalBytes, args.chunkIndex, args.chunkCount, args.chunkHash, args.bytes.byteLength, key);
  return { outcome: "CHUNK_STAGED", role, index: args.chunkIndex, releaseAuthority: false };
}

async function assemble(env: AudienceGoldenEnv, blueprintId: string, descriptor: Row) {
  const role = clean(descriptor.role).toUpperCase(), fullHash = clean(descriptor.fullHash), chunks = Array.isArray(descriptor.chunks) ? descriptor.chunks as Row[] : [];
  if (!role || !/^[a-f0-9]{64}$/.test(fullHash) || !Number.isInteger(number(descriptor.totalBytes)) || chunks.length < 1 || chunks.length > 128) throw new AudienceGoldenError("ASSEMBLY_DESCRIPTOR_INVALID", 400, "A complete staged descriptor is required");
  const parts: Uint8Array[] = []; let total = 0;
  for (const [index, chunk] of chunks.entries()) {
    if (number(chunk.index) !== index || !/^[a-f0-9]{64}$/.test(clean(chunk.hash))) throw new AudienceGoldenError("ASSEMBLY_CHUNK_ORDER_INVALID", 400, "Chunks must be contiguous and hash-bound");
    const stored = await env.BUCKET.get(chunkKey(blueprintId, role, fullHash, index, clean(chunk.hash))); if (!stored) throw new AudienceGoldenError("ASSEMBLY_CHUNK_MISSING", 404, "A staged chunk is missing");
    const bytes = new Uint8Array(await stored.arrayBuffer()); if (bytes.byteLength !== number(chunk.size) || await sha256Hex(bytes) !== clean(chunk.hash)) throw new AudienceGoldenError("ASSEMBLY_CHUNK_MISMATCH", 409, "A staged chunk differs from its descriptor"); parts.push(bytes); total += bytes.byteLength;
  }
  if (total !== number(descriptor.totalBytes)) throw new AudienceGoldenError("ASSEMBLY_TOTAL_MISMATCH", 409, "Staged byte total mismatch");
  const bytes = new Uint8Array(total); let offset = 0; for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
  if (await sha256Hex(bytes) !== fullHash) throw new AudienceGoldenError("ASSEMBLY_HASH_MISMATCH", 409, "The assembled object hash mismatched");
  return { role, fullHash, bytes, mimeType: roleMime(role) };
}

export async function commitAudienceGoldenMaterializationAuthorized(env: AudienceGoldenEnv, actor: string, idempotencyKey: string, body: Row) {
  const [blueprint, audio, existing, policy] = await Promise.all([
    first(env.DB, "SELECT * FROM v7_youtube_golden_sequence_blueprints WHERE id=? AND channel_id=?", clean(body.blueprintId), CHANNEL_ID),
    first(env.DB, "SELECT * FROM v7_youtube_golden_audio_artifacts WHERE blueprint_id=? AND channel_id=?", clean(body.blueprintId), CHANNEL_ID),
    first(env.DB, "SELECT id FROM v7_youtube_golden_materialization_receipts WHERE blueprint_id=?", clean(body.blueprintId)),
    first(env.DB, "SELECT * FROM v7_youtube_audience_master_policies WHERE channel_id=? AND policy_version=?", CHANNEL_ID, AUDIENCE_POLICY_VERSION),
  ]);
  if (!blueprint || !audio || !policy || existing) throw new AudienceGoldenError(existing ? "MATERIALIZATION_CEILING_REACHED" : "MATERIALIZATION_PREREQUISITES_MISSING", 409, existing ? "The one-master ceiling has been reached" : "Blueprint, Rights PASS audio and policy are required");
  const descriptors = jsonObject(body.descriptors); if (!descriptors) throw new AudienceGoldenError("DESCRIPTORS_REQUIRED", 400, "Staged descriptors are required");
  const roles = ["MASTER", "AUDIENCE_MIX", "ATLAS_1", "ATLAS_2", "ATLAS_3", "ATLAS_4"];
  const objects = await Promise.all(roles.map((role) => assemble(env, clean(blueprint.id), jsonObject(descriptors[role]) || {})));
  const technical = jsonObject(body.technicalEvidence) || {}, visual = jsonObject(body.visualManifest) || {}, duration = number(technical.durationSeconds);
  const deterministicPass = duration >= number(policy.minimum_duration_seconds) && duration <= number(policy.maximum_duration_seconds) && number(technical.width) === 2560 && number(technical.height) === 1440 && number(technical.frameRate) === 30 && clean(technical.videoCodec).toLowerCase() === "h264" && clean(technical.audioCodec).toLowerCase() === "aac" && number(technical.audioSampleRateHz) === 48000 && number(technical.blackFrameRatio) <= .01 && number(technical.freezeRatio) <= .05 && number(technical.integratedLufs) >= -16 && number(technical.integratedLufs) <= -12 && number(technical.truePeakDbtp) <= -1;
  const visualPass = number(visual.semanticRuntimeRatio) >= number(policy.minimum_semantic_runtime_ratio) && number(visual.slideshowRuntimeRatio) <= number(policy.maximum_slideshow_runtime_ratio) && number(visual.meaningfulMotionRatio) >= number(policy.minimum_meaningful_motion_ratio) && number(visual.first30MotionRatio) >= number(policy.minimum_first_30_motion_ratio) && number(visual.cameraOnlyRatio) <= number(policy.maximum_camera_only_ratio) && number(visual.treatmentFamilies) >= number(policy.minimum_treatment_families) && number(visual.minimumCriticalFontPx1080) >= number(policy.minimum_critical_font_px_1080) && number(visual.maximumVisualEventIntervalSeconds) <= number(policy.maximum_visual_event_interval_seconds) && number(visual.maximumStaticHoldSeconds) <= number(policy.maximum_static_hold_seconds);
  if (!deterministicPass || !visualPass) throw new AudienceGoldenError("AUDIENCE_MASTER_DETERMINISTIC_GATE_FAILED", 422, `Deterministic gates failed: technical=${deterministicPass}, visual=${visualPass}`);
  const storedObjects: { role: string; key: string; hash: string; bytes: number }[] = [];
  for (const object of objects) { const ext = object.role === "MASTER" ? "mp4" : object.role === "AUDIENCE_MIX" ? "mp3" : "jpg", key = `youtube-audience-golden/v1/final/${object.role.toLowerCase()}/${object.fullHash}.${ext}`; await env.BUCKET.put(key, object.bytes, { httpMetadata: { contentType: object.mimeType }, customMetadata: { sha256: object.fullHash, blueprintId: clean(blueprint.id), releaseEligible: "false" } }); const stored = await env.BUCKET.get(key); if (!stored || await sha256Hex(new Uint8Array(await stored.arrayBuffer())) !== object.fullHash) throw new AudienceGoldenError("FINAL_R2_READBACK_FAILED", 503, `${object.role} failed exact final read-back`); storedObjects.push({ role: object.role, key, hash: object.fullHash, bytes: object.bytes.byteLength }); }
  const byRole = Object.fromEntries(storedObjects.map((item) => [item.role, item])), atlasManifest = { frameCoverage: jsonArray(body.atlasFrames), atlases: roles.slice(2).map((role) => byRole[role]) };
  const evidenceHash = await canonicalHash({ blueprintId: blueprint.id, audioArtifactId: audio.id, technical, visual, storedObjects, atlasManifest, deterministicState: "PASS", rightsState: "PASS" }), receiptId = makeId("audience-golden-materialization");
  await run(env.DB, `INSERT INTO v7_youtube_golden_materialization_receipts (id,channel_id,blueprint_id,audio_artifact_id,policy_version,master_storage_key,master_hash,master_bytes,master_readback_hash,audience_mix_storage_key,audience_mix_hash,audience_mix_bytes,audience_mix_readback_hash,atlas_manifest_json,technical_evidence_json,visual_manifest_json,duration_seconds,width,height,frame_rate,video_codec,audio_codec,audio_sample_rate_hz,deterministic_state,rights_state,actor,idempotency_key,evidence_hash,authority_boundary) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'AUDIENCE_GOLDEN_TECHNICAL_ONLY')`, receiptId, CHANNEL_ID, blueprint.id, audio.id, AUDIENCE_POLICY_VERSION, byRole.MASTER.key, byRole.MASTER.hash, byRole.MASTER.bytes, byRole.MASTER.hash, byRole.AUDIENCE_MIX.key, byRole.AUDIENCE_MIX.hash, byRole.AUDIENCE_MIX.bytes, byRole.AUDIENCE_MIX.hash, canonicalStringify(atlasManifest), canonicalStringify(technical), canonicalStringify(visual), duration, 2560, 1440, 30, "h264", "aac", 48000, "PASS", "PASS", actor, idempotencyKey, evidenceHash);
  return { outcome: "MATERIALIZED", snapshot: await audienceGoldenSnapshot(env.DB) };
}

async function storeQa(env: AudienceGoldenEnv, args: { materialization: Row; layer: string; result: Row; responseText?: string; providerResponseId?: string; usage?: Row; actor: string; idempotencyKey: string; evidence: Row }) {
  const policy = await first(env.DB, "SELECT * FROM v7_youtube_audience_master_policies WHERE channel_id=?", CHANNEL_ID); if (!policy) throw new AudienceGoldenError("POLICY_MISSING", 409, "Audience policy missing");
  const dimensions = jsonObject(args.result.dimensions) || {}, overall = Math.trunc(number(args.result.overall)), p0 = Math.trunc(number(args.result.p0Count)), p1 = Math.trunc(number(args.result.p1Count)), p2 = Math.trunc(number(args.result.p2Count)), findings = Array.isArray(args.result.findings) ? args.result.findings : [], rationale = clean(args.result.rationale);
  const dimensionValues = Object.values(dimensions).map(number), pass = overall >= number(policy.overall_floor) && dimensionValues.length >= 6 && dimensionValues.every((value) => value >= number(policy.critical_dimension_floor)) && p0 === 0 && p1 === 0 && p2 <= number(policy.maximum_p2);
  let responseKey: string | null = null, responseHash: string | null = null;
  if (args.responseText) { const bytes = new TextEncoder().encode(args.responseText); responseHash = await sha256Hex(bytes); responseKey = `youtube-audience-golden/v1/qa/${args.layer.toLowerCase()}/${responseHash}.json`; await env.BUCKET.put(responseKey, bytes, { httpMetadata: { contentType: "application/json" }, customMetadata: { sha256: responseHash, layer: args.layer } }); const readback = await env.BUCKET.get(responseKey); if (!readback || await sha256Hex(new Uint8Array(await readback.arrayBuffer())) !== responseHash) throw new AudienceGoldenError("QA_RESPONSE_READBACK_FAILED", 503, "QA provider response failed exact read-back"); }
  const evidenceHash = await canonicalHash({ materializationId: args.materialization.id, layer: args.layer, decisionState: pass ? "PASS" : "FAIL", overall, dimensions, p0, p1, p2, findings, rationale, providerResponseId: args.providerResponseId, responseHash, usage: args.usage, evidence: args.evidence });
  await run(env.DB, `INSERT INTO v7_youtube_golden_qa_receipts (id,channel_id,materialization_receipt_id,policy_version,qa_layer,decision_state,overall_score,dimensions_json,p0_count,p1_count,p2_count,findings_json,evidence_json,provider_response_id,provider_response_storage_key,provider_response_hash,actual_spend_usd,actor,idempotency_key,evidence_hash,authority_boundary) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, makeId("audience-golden-qa"), CHANNEL_ID, args.materialization.id, AUDIENCE_POLICY_VERSION, args.layer, pass ? "PASS" : "FAIL", overall, canonicalStringify(dimensions), p0, p1, p2, canonicalStringify(findings), canonicalStringify({ rationale, ...args.evidence }), args.providerResponseId || null, responseKey, responseHash, number(args.usage?.actualUsd), args.actor, args.idempotencyKey, evidenceHash, args.layer === "BROWSER_DEVICE" ? "INDEPENDENT_BROWSER_REVIEW_ONLY" : "INDEPENDENT_FACTORY_REVIEW_ONLY");
  await maybeCreateOwnerTask(env.DB);
  return { outcome: pass ? "PASS" : "FAIL", snapshot: await audienceGoldenSnapshot(env.DB) };
}

export async function runAudienceGoldenVisualQaAuthorized(env: AudienceGoldenEnv, actor: string, idempotencyKey: string) {
  if (!env.OPENAI_API_KEY) throw new AudienceGoldenError("OPENAI_API_KEY_REQUIRED", 424, "OpenAI visual QA is required");
  const materialization = await first(env.DB, "SELECT * FROM v7_youtube_golden_materialization_receipts WHERE blueprint_id=(SELECT id FROM v7_youtube_golden_sequence_blueprints WHERE channel_id=? ORDER BY created_at DESC,id DESC LIMIT 1)", CHANNEL_ID), existing = materialization ? await first(env.DB, "SELECT id FROM v7_youtube_golden_qa_receipts WHERE materialization_receipt_id=? AND qa_layer='FACTORY_VISUAL'", materialization.id) : null; if (!materialization || existing) throw new AudienceGoldenError(existing ? "VISUAL_QA_CEILING_REACHED" : "MATERIALIZATION_REQUIRED", 409, existing ? "The visual QA request ceiling was reached" : "Materialization is required");
  const manifest = jsonObject(materialization.atlas_manifest_json), atlases = manifest && Array.isArray(manifest.atlases) ? manifest.atlases as Row[] : []; if (atlases.length !== 4) throw new AudienceGoldenError("ATLAS_SET_INVALID", 409, "Exactly four time-bound atlases are required");
  const images: { type: "input_image"; image_url: string; detail: "high" }[] = [];
  for (const atlas of atlases) { const object = await env.BUCKET.get(clean(atlas.key)); if (!object) throw new AudienceGoldenError("ATLAS_MISSING", 404, "An exact atlas is missing"); const bytes = new Uint8Array(await object.arrayBuffer()); if (await sha256Hex(bytes) !== clean(atlas.hash)) throw new AudienceGoldenError("ATLAS_HASH_MISMATCH", 409, "An atlas differs from its sealed hash"); images.push({ type: "input_image", image_url: `data:image/jpeg;base64,${base64(bytes)}`, detail: "high" }); }
  const properties = Object.fromEntries(VISUAL_DIMENSIONS.map((key) => [key, { type: "integer", minimum: 0, maximum: 100 }]));
  const schema = { type: "object", additionalProperties: false, properties: { overall: { type: "integer", minimum: 0, maximum: 100 }, dimensions: { type: "object", additionalProperties: false, properties, required: [...VISUAL_DIMENSIONS] }, p0Count: { type: "integer", minimum: 0 }, p1Count: { type: "integer", minimum: 0 }, p2Count: { type: "integer", minimum: 0 }, findings: { type: "array", items: { type: "object", additionalProperties: false, properties: { timecode: { type: "string" }, severity: { type: "string", enum: ["P0", "P1", "P2", "P3"] }, defect: { type: "string" }, evidence: { type: "string" } }, required: ["timecode", "severity", "defect", "evidence"] } }, rationale: { type: "string" } }, required: ["overall", "dimensions", "p0Count", "p1Count", "p2Count", "findings", "rationale"] };
  const prompt = `Independent adversarial YouTube audience-master visual QA. These are four chronological, timecode-labelled atlases covering the complete ${number(materialization.duration_seconds).toFixed(2)}-second video at dense intervals; they are pixel evidence, not native video playback and not audio evidence. Judge title-promise delivery, semantic clarity, visual richness, meaningful non-camera motion progression, mobile legibility, and retention pacing. Reject slide-deck composition, prolonged holds, tiny labels, decorative motion, repeated layouts, production residue, or confusing authorization/clearing/settlement states. PASS requires overall >=92, every dimension >=90, P0=0, P1=0, P2<=2. Return strict evidence only.`;
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json", "idempotency-key": idempotencyKey }, body: JSON.stringify({ model: "gpt-5.6", reasoning: { effort: "high" }, input: [{ role: "user", content: [{ type: "input_text", text: prompt }, ...images] }], text: { format: { type: "json_schema", name: "audience_golden_visual_qa", strict: true, schema } } }), signal: AbortSignal.timeout(180_000) });
  if (!response.ok) throw new AudienceGoldenError("VISUAL_QA_PROVIDER_FAILED", 502, `OpenAI visual QA failed (${response.status})`); const responseText = await response.text(), payload = jsonObject(responseText); if (!payload) throw new AudienceGoldenError("VISUAL_QA_RESPONSE_INVALID", 502, "OpenAI returned invalid visual QA JSON"); const result = jsonObject(outputText(payload)); if (!result) throw new AudienceGoldenError("VISUAL_QA_OUTPUT_INVALID", 502, "OpenAI returned no structured visual verdict"); const usage = measureOpenAIUsage(payload, "gpt-5.6");
  return storeQa(env, { materialization, layer: "FACTORY_VISUAL", result, responseText, providerResponseId: clean(payload.id), usage, actor, idempotencyKey, evidence: { evidenceScope: "FOUR_TIME_BOUND_PIXEL_ATLASES", atlasManifestHash: await canonicalHash(manifest), nativeVideoObserved: false } });
}

export async function runAudienceGoldenAudioQaAuthorized(env: AudienceGoldenEnv, actor: string, idempotencyKey: string) {
  if (!env.OPENAI_API_KEY) throw new AudienceGoldenError("OPENAI_API_KEY_REQUIRED", 424, "OpenAI audio QA is required");
  const materialization = await first(env.DB, "SELECT * FROM v7_youtube_golden_materialization_receipts WHERE blueprint_id=(SELECT id FROM v7_youtube_golden_sequence_blueprints WHERE channel_id=? ORDER BY created_at DESC,id DESC LIMIT 1)", CHANNEL_ID), existing = materialization ? await first(env.DB, "SELECT id FROM v7_youtube_golden_qa_receipts WHERE materialization_receipt_id=? AND qa_layer='FACTORY_AUDIO'", materialization.id) : null; if (!materialization || existing) throw new AudienceGoldenError(existing ? "AUDIO_QA_CEILING_REACHED" : "MATERIALIZATION_REQUIRED", 409, existing ? "The audio QA request ceiling was reached" : "Materialization is required");
  const object = await env.BUCKET.get(clean(materialization.audience_mix_storage_key)); if (!object) throw new AudienceGoldenError("AUDIENCE_MIX_MISSING", 404, "Exact audience mix missing"); const bytes = new Uint8Array(await object.arrayBuffer()); if (await sha256Hex(bytes) !== clean(materialization.audience_mix_hash)) throw new AudienceGoldenError("AUDIENCE_MIX_HASH_MISMATCH", 409, "Exact audience mix hash mismatch");
  const dimensionProps = Object.fromEntries(AUDIO_DIMENSIONS.map((key) => [key, { type: "integer", minimum: 0, maximum: 100 }]));
  const parameters = { type: "object", additionalProperties: false, properties: { overall: { type: "integer", minimum: 0, maximum: 100 }, dimensions: { type: "object", additionalProperties: false, properties: dimensionProps, required: [...AUDIO_DIMENSIONS] }, p0Count: { type: "integer", minimum: 0 }, p1Count: { type: "integer", minimum: 0 }, p2Count: { type: "integer", minimum: 0 }, findings: { type: "array", items: { type: "object", additionalProperties: false, properties: { timecode: { type: "string" }, severity: { type: "string", enum: ["P0", "P1", "P2", "P3"] }, defect: { type: "string" }, evidence: { type: "string" } }, required: ["timecode", "severity", "defect", "evidence"] } }, rationale: { type: "string" } }, required: ["overall", "dimensions", "p0Count", "p1Count", "p2Count", "findings", "rationale"] };
  const prompt = `Listen to the entire exact ${number(materialization.duration_seconds).toFixed(2)}-second Vietnamese audience mix as an independent adversarial YouTube QA reviewer. Judge naturalness, pronunciation, pacing/prosody, continuity/seams, mix clarity, and listener comfort. Reject clicks, clipping, bad joins, excessive bed, robotic cadence, fatigue, or semantic delivery confusion. PASS requires overall >=92, every dimension >=90, P0=0, P1=0, P2<=2. Use the function exactly once.`;
  const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json", "idempotency-key": idempotencyKey }, body: JSON.stringify({ model: "gpt-audio-1.5", modalities: ["text"], max_completion_tokens: 3000, parallel_tool_calls: false, tools: [{ type: "function", function: { name: "record_audience_audio_qa", description: "Record exact-audio QA evidence", parameters } }], tool_choice: { type: "function", function: { name: "record_audience_audio_qa" } }, messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "input_audio", input_audio: { data: base64(bytes), format: "mp3" } }] }] }), signal: AbortSignal.timeout(180_000) });
  if (!response.ok) throw new AudienceGoldenError("AUDIO_QA_PROVIDER_FAILED", 502, `OpenAI audio QA failed (${response.status})`); const responseText = await response.text(), payload = jsonObject(responseText); if (!payload) throw new AudienceGoldenError("AUDIO_QA_RESPONSE_INVALID", 502, "OpenAI returned invalid audio QA JSON"); const choices = Array.isArray(payload.choices) ? payload.choices as Row[] : [], message = jsonObject(choices[0]?.message), calls = message && Array.isArray(message.tool_calls) ? message.tool_calls as Row[] : [], fn = jsonObject(calls[0]?.function), result = jsonObject(fn?.arguments); if (!result) throw new AudienceGoldenError("AUDIO_QA_OUTPUT_INVALID", 502, "OpenAI returned no required function evidence"); const usage = measureOpenAIUsage(payload, "gpt-audio-1.5");
  return storeQa(env, { materialization, layer: "FACTORY_AUDIO", result, responseText, providerResponseId: clean(payload.id), usage, actor, idempotencyKey, evidence: { evidenceScope: "EXACT_FULL_AUDIENCE_MIX", audienceMixHash: clean(materialization.audience_mix_hash), fullAudioObserved: true } });
}

export async function recordAudienceGoldenBrowserQaAuthorized(env: AudienceGoldenEnv, actor: string, idempotencyKey: string, evidence: Row) {
  const materialization = await first(env.DB, "SELECT * FROM v7_youtube_golden_materialization_receipts WHERE blueprint_id=(SELECT id FROM v7_youtube_golden_sequence_blueprints WHERE channel_id=? ORDER BY created_at DESC,id DESC LIMIT 1)", CHANNEL_ID), existing = materialization ? await first(env.DB, "SELECT id FROM v7_youtube_golden_qa_receipts WHERE materialization_receipt_id=? AND qa_layer='BROWSER_DEVICE'", materialization.id) : null; if (!materialization || existing) throw new AudienceGoldenError(existing ? "BROWSER_QA_CEILING_REACHED" : "MATERIALIZATION_REQUIRED", 409, existing ? "Browser QA is append-only" : "Materialization required");
  const pass = number(evidence.playbackCoverageRatio) >= .98 && evidence.pauseResumeObserved === true && evidence.seekObserved === true && evidence.endedObserved === true && evidence.audioTrackObserved === true && evidence.meaningfulMotionObserved === true && evidence.mobileLegibilityObserved === true && evidence.focusReflowObserved === true && number(evidence.pageErrorCount) === 0;
  const dimensions = { playbackIntegrity: pass ? 100 : 70, interactionIntegrity: pass ? 100 : 70, motionObservation: pass ? 96 : 70, mobileLegibility: pass ? 96 : 70, audioPresence: pass ? 100 : 70, pageStability: pass ? 100 : 70 };
  return storeQa(env, { materialization, layer: "BROWSER_DEVICE", result: { overall: pass ? 97 : 70, dimensions, p0Count: pass ? 0 : 1, p1Count: 0, p2Count: 0, findings: pass ? [] : [{ timecode: "browser", severity: "P0", defect: "Browser evidence incomplete", evidence: canonicalStringify(evidence) }], rationale: pass ? "Full production playback and required mobile interaction observations passed." : "Browser evidence is incomplete." }, actor, idempotencyKey, evidence });
}

async function maybeCreateOwnerTask(db: AudienceGoldenDB) {
  const materialization = await first(db, "SELECT * FROM v7_youtube_golden_materialization_receipts WHERE blueprint_id=(SELECT id FROM v7_youtube_golden_sequence_blueprints WHERE channel_id=? ORDER BY created_at DESC,id DESC LIMIT 1)", CHANNEL_ID); if (!materialization) return;
  const [visual, audio, browser, existing] = await Promise.all([first(db, "SELECT * FROM v7_youtube_golden_qa_receipts WHERE materialization_receipt_id=? AND qa_layer='FACTORY_VISUAL'", materialization.id), first(db, "SELECT * FROM v7_youtube_golden_qa_receipts WHERE materialization_receipt_id=? AND qa_layer='FACTORY_AUDIO'", materialization.id), first(db, "SELECT * FROM v7_youtube_golden_qa_receipts WHERE materialization_receipt_id=? AND qa_layer='BROWSER_DEVICE'", materialization.id), first(db, "SELECT id FROM v7_youtube_golden_owner_tasks WHERE materialization_receipt_id=?", materialization.id)]);
  if (!existing && materialization && [visual, audio, browser].every((item) => item && clean(item.decision_state) === "PASS")) await run(db, "INSERT INTO v7_youtube_golden_owner_tasks (id,channel_id,materialization_receipt_id,policy_version,task_state) VALUES (?,?,?,?,'REVIEW_REQUIRED')", makeId("audience-golden-owner-task"), CHANNEL_ID, materialization.id, AUDIENCE_POLICY_VERSION);
}

export async function recordAudienceGoldenOwnerDecisionAuthorized(env: AudienceGoldenEnv, actor: string, idempotencyKey: string, body: Row) {
  const materialization = await first(env.DB, "SELECT * FROM v7_youtube_golden_materialization_receipts WHERE blueprint_id=(SELECT id FROM v7_youtube_golden_sequence_blueprints WHERE channel_id=? ORDER BY created_at DESC,id DESC LIMIT 1)", CHANNEL_ID), task = materialization ? await first(env.DB, "SELECT * FROM v7_youtube_golden_owner_tasks WHERE materialization_receipt_id=?", materialization.id) : null, existing = task ? await first(env.DB, "SELECT id FROM v7_youtube_golden_owner_receipts WHERE task_id=?", task.id) : null; if (!task || !materialization || existing) throw new AudienceGoldenError(existing ? "OWNER_DECISION_ALREADY_RECORDED" : "OWNER_TASK_NOT_READY", 409, existing ? "Owner ground truth is immutable" : "All independent QA gates must pass first");
  if (body.fullPlaybackAttested !== true) throw new AudienceGoldenError("FULL_PLAYBACK_ATTESTATION_REQUIRED", 422, "The owner must attest complete playback"); const decision = clean(body.decisionState).toUpperCase(); if (!["CLEAN_CONFIRMED", "DEFECT_REJECTED"].includes(decision)) throw new AudienceGoldenError("OWNER_DECISION_INVALID", 400, "Use CLEAN_CONFIRMED or DEFECT_REJECTED"); const defects = Array.isArray(body.defects) ? body.defects : [], rationale = clean(body.rationale); if (rationale.length < 12 || (decision === "DEFECT_REJECTED" && defects.length < 1)) throw new AudienceGoldenError("OWNER_EVIDENCE_INCOMPLETE", 422, "A rationale and defect evidence are required");
  const receiptId = makeId("audience-golden-owner-receipt"), evidenceHash = await canonicalHash({ taskId: task.id, materializationId: materialization.id, masterHash: materialization.master_hash, decision, fullPlaybackAttested: true, defects, rationale, actor });
  await run(env.DB, "INSERT INTO v7_youtube_golden_owner_receipts (id,channel_id,task_id,materialization_receipt_id,policy_version,decision_state,full_playback_attested,defects_json,rationale,actor,idempotency_key,evidence_hash,authority_boundary) VALUES (?,?,?,?,?,?,1,?,?,?,?,?,'OWNER_GROUND_TRUTH_ONLY')", receiptId, CHANNEL_ID, task.id, materialization.id, AUDIENCE_POLICY_VERSION, decision, canonicalStringify(defects), rationale, actor, idempotencyKey, evidenceHash);
  if (decision === "CLEAN_CONFIRMED") {
    const qaRows = await Promise.all(["FACTORY_VISUAL", "FACTORY_AUDIO", "BROWSER_DEVICE"].map((layer) => first(env.DB, "SELECT * FROM v7_youtube_golden_qa_receipts WHERE materialization_receipt_id=? AND qa_layer=?", materialization.id, layer))); if (qaRows.some((row) => !row || clean(row.decision_state) !== "PASS")) throw new AudienceGoldenError("FREEZE_QA_GATE_FAILED", 409, "All QA layers must remain PASS");
    const overall = Math.min(...qaRows.map((row) => number(row?.overall_score))), p0 = qaRows.reduce((sum, row) => sum + number(row?.p0_count), 0), p1 = qaRows.reduce((sum, row) => sum + number(row?.p1_count), 0); if (overall < 92 || p0 || p1) throw new AudienceGoldenError("FREEZE_SCORE_GATE_FAILED", 409, "Freeze score gates failed"); const freezeHash = await canonicalHash({ materializationId: materialization.id, masterHash: materialization.master_hash, ownerReceiptId: receiptId, qaReceiptIds: qaRows.map((row) => row?.id), overall, p0, p1, decisionState: "FROZEN_AUDIENCE_GOLDEN" });
    await run(env.DB, "INSERT INTO v7_youtube_golden_freeze_receipts (id,channel_id,materialization_receipt_id,owner_receipt_id,policy_version,decision_state,overall_score,p0_count,p1_count,evidence_hash,actor,authority_boundary) VALUES (?,?,?,?,?,'FROZEN_AUDIENCE_GOLDEN',?,?,0,?,?,'GOLDEN_SEQUENCE_FREEZE_ONLY')", makeId("audience-golden-freeze"), CHANNEL_ID, materialization.id, receiptId, AUDIENCE_POLICY_VERSION, overall, p0, freezeHash, actor);
  }
  return { outcome: decision === "CLEAN_CONFIRMED" ? "FROZEN_AUDIENCE_GOLDEN" : "DEFECT_REJECTED", snapshot: await audienceGoldenSnapshot(env.DB) };
}

export async function readAudienceGoldenMediaAuthorized(env: AudienceGoldenEnv, role: string) {
  const normalized = clean(role);
  const row = normalized === "source-audio" ? await first(env.DB, "SELECT storage_key,sha256,mime_type FROM v7_youtube_golden_audio_artifacts WHERE blueprint_id=(SELECT id FROM v7_youtube_golden_sequence_blueprints WHERE channel_id=? ORDER BY created_at DESC,id DESC LIMIT 1)", CHANNEL_ID) : normalized === "master" ? await first(env.DB, "SELECT master_storage_key storage_key,master_hash sha256,'video/mp4' mime_type FROM v7_youtube_golden_materialization_receipts WHERE blueprint_id=(SELECT id FROM v7_youtube_golden_sequence_blueprints WHERE channel_id=? ORDER BY created_at DESC,id DESC LIMIT 1)", CHANNEL_ID) : null;
  if (!row) throw new AudienceGoldenError("MEDIA_NOT_FOUND", 404, "Golden media not found"); const object = await env.BUCKET.get(clean(row.storage_key)); if (!object) throw new AudienceGoldenError("MEDIA_BYTES_NOT_FOUND", 404, "Golden media bytes not found"); const bytes = new Uint8Array(await object.arrayBuffer()); if (await sha256Hex(bytes) !== clean(row.sha256)) throw new AudienceGoldenError("MEDIA_HASH_MISMATCH", 409, "Golden media failed exact read-back"); return { bytes, mimeType: clean(row.mime_type), hash: clean(row.sha256) };
}
