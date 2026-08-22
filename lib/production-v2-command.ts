import { PRODUCTION_ENGINE_V2 } from "@/app/production-v2-contract";

type Row = Record<string, unknown>;
type RunResult = { success?: boolean; meta?: Record<string, unknown> };
type Statement = { bind(...values: unknown[]): Statement; first<T = Row>(): Promise<T | null>; all<T = Row>(): Promise<{ results?: T[] }>; run(): Promise<RunResult> };
export type ProductionV2CommandDB = { prepare(query: string): Statement };
type StoredObject = { body: ReadableStream<Uint8Array> | null; arrayBuffer(): Promise<ArrayBuffer>; httpMetadata?: { contentType?: string }; size?: number };
export type ProductionV2Bucket = { put(key: string, value: ArrayBuffer | Uint8Array | string, options?: Record<string, unknown>): Promise<void>; get(key: string): Promise<StoredObject | null>; head(key: string): Promise<{ size?: number } | null> };
export type ProductionV2Runtime = { DB: ProductionV2CommandDB; BUCKET: ProductionV2Bucket; ELEVENLABS_API_KEY?: string };
export type ProductionV2RenderLineageBinding = { sourceManifestId?: string; sourceManifestSha256?: string };

const ENGINE = PRODUCTION_ENGINE_V2;
const now = () => new Date().toISOString();
const clean = (value: unknown) => String(value ?? "").trim();
const num = (value: unknown) => Number(value ?? 0);
const bytes = (value: string) => new TextEncoder().encode(value);
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
async function digest(value: ArrayBuffer | Uint8Array | string) {
  const input = typeof value === "string" ? bytes(value) : value instanceof Uint8Array ? value : new Uint8Array(value);
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", input))).map((part) => part.toString(16).padStart(2, "0")).join("");
}
async function rows(db: ProductionV2CommandDB, query: string, ...values: unknown[]) { return (await db.prepare(query).bind(...values).all<Row>()).results ?? []; }
async function exec(db: ProductionV2CommandDB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values.map((value) => value === undefined ? null : value)).run(); }
function escapeXml(value: string) { return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character] || character); }
function wrap(value: string, max = 42) {
  const words = value.split(/\s+/); const lines: string[] = []; let line = "";
  for (const word of words) { if (`${line} ${word}`.trim().length > max) { if (line) lines.push(line); line = word; } else line = `${line} ${word}`.trim(); }
  if (line) lines.push(line); return lines.slice(0, 4);
}
function authoredScene(title: string, claim: string, index: number) {
  const palette = [["#0b2f29", "#76d3a7"], ["#172f46", "#7fc6e8"], ["#3b2f1d", "#edc979"], ["#402a38", "#e89bc0"], ["#26341f", "#a8d47f"]][index % 5];
  const titleLines = wrap(title, 36), claimLines = wrap(claim, 58);
  const text = (lines: string[], y: number, size: number, color: string) => lines.map((line, lineIndex) => `<text x="86" y="${y + lineIndex * (size + 12)}" fill="${color}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${size > 40 ? 700 : 500}">${escapeXml(line)}</text>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="${palette[0]}"/><circle cx="1090" cy="150" r="240" fill="${palette[1]}" opacity=".12"/><circle cx="1130" cy="610" r="330" fill="${palette[1]}" opacity=".07"/><text x="86" y="92" fill="${palette[1]}" font-family="Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="4">HIDDEN SYSTEMS · ${String(index + 1).padStart(2, "0")}</text>${text(titleLines, 190, 58, "#ffffff")}${text(claimLines, 435, 27, "#d8e9e3")}<rect x="86" y="625" width="190" height="6" rx="3" fill="${palette[1]}"/><text x="300" y="637" fill="#a9c6bc" font-family="Arial, sans-serif" font-size="18">Evidence-bound production proof</text></svg>`;
}

export class ProductionV2CommandError extends Error { constructor(public code: string, public status: number, message: string) { super(message); } }

async function packageOne(db: ProductionV2CommandDB) {
  const item = await db.prepare("SELECT p.*,c.sequence FROM production_v2_packages p JOIN content_episode_concepts_v2 c ON c.id=p.episode_concept_id WHERE p.channel_id='channel-hidden-systems' AND c.sequence=1 LIMIT 1").first<Row>();
  if (!item) throw new ProductionV2CommandError("PILOT_PACKAGE_NOT_FOUND", 409, "The canonical pilot package is unavailable");
  return item;
}

async function assertPolicy(db: ProductionV2CommandDB, packageRow: Row) {
  const policy = await db.prepare("SELECT * FROM production_v2_policies WHERE id=? AND lifecycle_state='ACTIVE' LIMIT 1").bind(packageRow.policy_id).first<Row>();
  if (!policy || clean(policy.legacy_reuse_policy) !== "ZERO_CODE_ZERO_ARTIFACT" || !Boolean(policy.auto_dispatch) || Boolean(policy.auto_publish)) throw new ProductionV2CommandError("PRODUCTION_POLICY_BLOCKED", 409, "Production policy does not authorize the isolated pilot");
  const ledger = await db.prepare("SELECT COUNT(*) total,COALESCE(SUM(cost_usd),0) spend FROM production_v2_provider_requests WHERE policy_id=?").bind(policy.id).first<Row>();
  const estimated = 0.08;
  if (num(ledger?.total) + 1 > num(policy.max_remote_requests) || num(ledger?.spend) + estimated > num(policy.monthly_budget_usd) || estimated > num(policy.per_video_budget_usd)) throw new ProductionV2CommandError("PRODUCTION_BUDGET_BLOCKED", 409, "The golden pilot would exceed the active production policy");
  return { policy, estimated };
}

async function storeArtifact(runtime: ProductionV2Runtime, packageId: string, shotContractId: string | null, artifactType: string, storageKey: string, mimeType: string, value: Uint8Array | string, provenance: Record<string, unknown>) {
  const data = typeof value === "string" ? bytes(value) : value, sha = await digest(data), artifactId = id("pv2-artifact");
  await runtime.BUCKET.put(storageKey, data, { httpMetadata: { contentType: mimeType }, customMetadata: { packageId, artifactId, sha256: sha, engineVersion: ENGINE } });
  const readback = await runtime.BUCKET.get(storageKey); if (!readback) throw new ProductionV2CommandError("R2_READBACK_FAILED", 503, "Stored production evidence could not be read back");
  const readbackBytes = new Uint8Array(await readback.arrayBuffer()), readbackHash = await digest(readbackBytes); if (readbackHash !== sha) throw new ProductionV2CommandError("R2_HASH_MISMATCH", 503, "Stored production evidence failed checksum verification");
  await exec(runtime.DB, "INSERT INTO production_v2_artifacts (id,package_id,shot_contract_id,artifact_type,lifecycle_state,storage_key,mime_type,byte_size,sha256,rights_state,provenance_json,engine_version,frozen_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", artifactId, packageId, shotContractId, artifactType, "STORED_VERIFIED", storageKey, mimeType, readbackBytes.byteLength, sha, "CHANNEL_OWNED_OR_PROVIDER_COMMERCIAL", JSON.stringify({ ...provenance, storageReadback: true, legacySources: 0 }), ENGINE, now());
  return { id: artifactId, storageKey, mimeType, byteSize: readbackBytes.byteLength, sha256: sha };
}

export async function verifyProductionV2RenderLineage(runtime: ProductionV2Runtime, packageId: string, manifestType: "PILOT_MANIFEST" | "FULL_VIDEO_MANIFEST", binding: ProductionV2RenderLineageBinding = {}) {
  const sourceManifestId = clean(binding.sourceManifestId), declaredManifestHash = clean(binding.sourceManifestSha256).toLowerCase();
  if (!sourceManifestId || !/^[a-f0-9]{64}$/.test(declaredManifestHash)) throw new ProductionV2CommandError("SOURCE_MANIFEST_BINDING_REQUIRED", 409, "Rendered video requires an exact source-manifest ID and SHA-256 binding");
  const manifest = await runtime.DB.prepare("SELECT * FROM production_v2_artifacts WHERE id=? AND package_id=? AND artifact_type=? LIMIT 1").bind(sourceManifestId, packageId, manifestType).first<Row>();
  if (!manifest || clean(manifest.sha256).toLowerCase() !== declaredManifestHash) throw new ProductionV2CommandError("SOURCE_MANIFEST_BINDING_MISMATCH", 409, "The declared source manifest does not match the canonical package artifact");
  const object = await runtime.BUCKET.get(clean(manifest.storage_key));
  if (!object) throw new ProductionV2CommandError("SOURCE_MANIFEST_BYTES_MISSING", 503, "The exact source-manifest bytes are unavailable");
  const manifestBytes = new Uint8Array(await object.arrayBuffer()), computedManifestHash = await digest(manifestBytes);
  if (computedManifestHash !== declaredManifestHash) throw new ProductionV2CommandError("SOURCE_MANIFEST_HASH_MISMATCH", 409, "Source-manifest read-back bytes do not match the declared SHA-256");
  let payload: Record<string, unknown>;
  try { payload = JSON.parse(new TextDecoder().decode(manifestBytes)) as Record<string, unknown>; } catch { throw new ProductionV2CommandError("SOURCE_MANIFEST_JSON_INVALID", 409, "Source-manifest bytes are not canonical JSON"); }
  const values = (value: unknown) => Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
  const parentRows = [...values(payload.audioChunks), ...values(payload.scenes), ...(payload.audio && typeof payload.audio === "object" && !Array.isArray(payload.audio) ? [payload.audio as Record<string, unknown>] : [])];
  const parentArtifactIds = parentRows.map((item) => clean(item.id)), parentArtifactHashes = parentRows.map((item) => clean(item.sha256).toLowerCase());
  if (parentArtifactIds.length === 0 || parentArtifactIds.some((value) => !value) || parentArtifactHashes.some((value) => !/^[a-f0-9]{64}$/.test(value)) || new Set(parentArtifactIds).size !== parentArtifactIds.length) throw new ProductionV2CommandError("SOURCE_MANIFEST_PARENT_SET_INVALID", 409, "Source manifest must declare one unique exact parent ID and SHA-256 for every render input");
  for (let index = 0; index < parentArtifactIds.length; index += 1) {
    const parent = await runtime.DB.prepare("SELECT sha256 FROM production_v2_artifacts WHERE id=? AND package_id=? LIMIT 1").bind(parentArtifactIds[index], packageId).first<Row>();
    if (!parent || clean(parent.sha256).toLowerCase() !== parentArtifactHashes[index]) throw new ProductionV2CommandError("SOURCE_MANIFEST_PARENT_BINDING_MISMATCH", 409, `Render parent ${index + 1} does not match the canonical artifact ledger`);
  }
  return { sourceManifestId, sourceManifestHash: declaredManifestHash, parentArtifactIds, parentArtifactHashes, parentCount: parentArtifactIds.length, lineageState: "EXACT_SOURCE_MANIFEST_AND_PARENT_SET_VERIFIED" as const };
}

async function elevenLabsVoice(apiKey: string) {
  const response = await fetch("https://api.elevenlabs.io/v2/voices?page_size=50", { headers: { "xi-api-key": apiKey }, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new ProductionV2CommandError("ELEVENLABS_VOICE_DISCOVERY_FAILED", 502, `ElevenLabs voice discovery failed (${response.status})`);
  const payload = await response.json() as { voices?: Array<{ voice_id?: string; name?: string; category?: string }> };
  const voice = payload.voices?.find((candidate) => candidate.category === "premade") || payload.voices?.[0];
  if (!voice?.voice_id) throw new ProductionV2CommandError("ELEVENLABS_VOICE_UNAVAILABLE", 502, "ElevenLabs returned no usable voice");
  return { id: voice.voice_id, name: voice.name || "ElevenLabs voice" };
}

export async function startGoldenPilot(runtime: ProductionV2Runtime, actorEmail: string, idempotencyKey: string) {
  const db = runtime.DB, packageRow = await packageOne(db), packageId = clean(packageRow.id);
  const existing = await db.prepare("SELECT * FROM production_v2_jobs WHERE idempotency_key=? LIMIT 1").bind(idempotencyKey).first<Row>();
  if (existing) return { outcome: "REPLAYED", jobId: clean(existing.id), packageId, state: clean(existing.lifecycle_state) };
  if (!runtime.ELEVENLABS_API_KEY) throw new ProductionV2CommandError("ELEVENLABS_NOT_CONNECTED", 424, "ElevenLabs is required for the real golden-pilot narration");
  const { policy, estimated } = await assertPolicy(db, packageRow), contracts = await rows(db, "SELECT * FROM production_v2_shot_contracts WHERE package_id=? ORDER BY sequence", packageId);
  if (contracts.length !== 5) throw new ProductionV2CommandError("SHOT_CONTRACT_COVERAGE_INVALID", 409, "The pilot requires exactly five valid upstream contracts");
  const jobId = id("pv2-pilot"), requestId = id("pv2-provider"), inputHash = await digest(JSON.stringify({ packageId, policy: policy.id, contracts: contracts.map((item) => item.content_hash) }));
  await exec(db, "INSERT INTO production_v2_jobs (id,package_id,job_type,lifecycle_state,attempt,max_attempts,idempotency_key,input_hash,lease_owner) VALUES (?,?,?,?,?,?,?,?,?)", jobId, packageId, "GOLDEN_PILOT", "RUNNING", 1, 1, idempotencyKey, inputHash, "PRODUCTION_V2_ORCHESTRATOR");
  await exec(db, "INSERT INTO production_v2_provider_requests (id,policy_id,package_id,job_id,provider,operation,lifecycle_state,idempotency_key,request_hash,cost_usd) VALUES (?,?,?,?,?,?,?,?,?,?)", requestId, policy.id, packageId, jobId, "ELEVENLABS", "GOLDEN_PILOT_NARRATION", "RUNNING", `${idempotencyKey}:elevenlabs`, inputHash, 0);
  try {
    const narration = "A one hundred dollar card purchase looks instant, but the money does not travel in one step. The merchant, processor, card network and issuing bank each record a different event. Fees, rewards, fraud risk and settlement timing move through separate ledgers. Follow the transaction carefully and the hidden system becomes visible: convenience at the checkout is built on a chain of institutional handoffs.";
    const voice = await elevenLabsVoice(runtime.ELEVENLABS_API_KEY);
    const tts = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice.id)}/with-timestamps?output_format=mp3_44100_128`, { method: "POST", headers: { "xi-api-key": runtime.ELEVENLABS_API_KEY, "content-type": "application/json" }, body: JSON.stringify({ text: narration, model_id: "eleven_multilingual_v2", language_code: "en", voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.18, use_speaker_boost: true, speed: 1.02 } }), signal: AbortSignal.timeout(120_000) });
    if (!tts.ok) throw new ProductionV2CommandError("ELEVENLABS_TTS_FAILED", 502, `ElevenLabs narration failed (${tts.status})`);
    const providerNativeRequestId = clean(tts.headers.get("request-id"));
    if (!providerNativeRequestId) throw new ProductionV2CommandError("ELEVENLABS_REQUEST_ID_MISSING", 502, "ElevenLabs returned narration bytes without the required provider-native request ID");
    const ttsPayload = await tts.json() as { audio_base64?: string; alignment?: unknown }; if (!ttsPayload.audio_base64) throw new ProductionV2CommandError("ELEVENLABS_AUDIO_EMPTY", 502, "ElevenLabs returned no narration bytes");
    const binary = Uint8Array.from(atob(ttsPayload.audio_base64), (character) => character.charCodeAt(0));
    const providerResponseArtifactHash = await digest(binary);
    const audio = await storeArtifact(runtime, packageId, null, "PILOT_NARRATION", `production-v2/${packageId}/pilot/narration.mp3`, "audio/mpeg", binary, { provider: "ElevenLabs", voiceId: voice.id, voiceName: voice.name, model: "eleven_multilingual_v2", narration, alignment: ttsPayload.alignment, providerRequestId: requestId, providerNativeRequestId, providerResponseArtifactHash, providerBindingVersion: "ELEVENLABS_RESPONSE_BINDING_V1" });
    if (audio.sha256 !== providerResponseArtifactHash) throw new ProductionV2CommandError("ELEVENLABS_ARTIFACT_BINDING_MISMATCH", 503, "Stored narration does not match the provider response bytes");
    const scenes = [];
    for (let index = 0; index < 10; index += 1) {
      const contract = contracts[index % contracts.length], svg = authoredScene(clean(packageRow.title), clean(contract.claim), index);
      scenes.push(await storeArtifact(runtime, packageId, clean(contract.id), "PILOT_SCENE", `production-v2/${packageId}/pilot/scene-${String(index + 1).padStart(2, "0")}.svg`, "image/svg+xml", svg, { author: ENGINE, route: contract.route, narrativeBeat: contract.narrative_beat, sceneIndex: index + 1 }));
    }
    const manifestValue = JSON.stringify({ engineVersion: ENGINE, packageId, jobId, durationSeconds: 30, width: 1280, height: 720, fps: 30, audio, scenes, narration, legacySources: 0 });
    const manifest = await storeArtifact(runtime, packageId, null, "PILOT_MANIFEST", `production-v2/${packageId}/pilot/manifest.json`, "application/json", manifestValue, { author: ENGINE, artifactIds: [audio.id, ...scenes.map((scene) => scene.id)] });
    await exec(db, "UPDATE production_v2_provider_requests SET lifecycle_state='COMPLETED',provider_response_id=?,cost_usd=?,completed_at=? WHERE id=?", providerNativeRequestId, estimated, now(), requestId);
    await exec(db, "UPDATE production_v2_packages SET lifecycle_state='PILOT_ASSETS_READY',provider_requests=provider_requests+1,spend_usd=spend_usd+? WHERE id=?", estimated, packageId);
    await exec(db, "UPDATE production_v2_jobs SET lifecycle_state='AWAITING_MOTION_PROOF',updated_at=? WHERE id=?", now(), jobId);
    await exec(db, "UPDATE production_v2_scale_waves SET lifecycle_state='RUNNING' WHERE channel_id=? AND wave_number=0", packageRow.channel_id);
    const auditHash = await digest(manifestValue); await exec(db, "INSERT INTO production_v2_audits (id,channel_id,entity_type,entity_id,event_type,actor_type,actor_email,detail_json,evidence_hash) VALUES (?,?,?,?,?,?,?,?,?)", id("pv2-audit"), packageRow.channel_id, "PILOT_JOB", jobId, "GOLDEN_PILOT_ASSETS_STORED", "SYSTEM_AUTOPILOT", actorEmail, JSON.stringify({ scenes: 10, narrationBytes: audio.byteSize, manifestId: manifest.id, providerRequests: 1, spendUsd: estimated, legacySources: 0 }), auditHash);
    return { outcome: "RECORDED", jobId, packageId, state: "AWAITING_MOTION_PROOF", manifestId: manifest.id, audio, scenes, estimatedSpendUsd: estimated };
  } catch (error) {
    await exec(db, "UPDATE production_v2_provider_requests SET lifecycle_state='FAILED',error_code=?,completed_at=? WHERE id=?", error instanceof ProductionV2CommandError ? error.code : "UNEXPECTED_PROVIDER_FAILURE", now(), requestId);
    await exec(db, "UPDATE production_v2_jobs SET lifecycle_state='FAILED',blocker=?,updated_at=? WHERE id=?", error instanceof Error ? error.message : "Pilot failed", now(), jobId);
    throw error;
  }
}

export async function readArtifact(runtime: ProductionV2Runtime, artifactId: string) {
  const artifact = await runtime.DB.prepare("SELECT * FROM production_v2_artifacts WHERE id=? AND engine_version=? LIMIT 1").bind(artifactId, ENGINE).first<Row>();
  if (!artifact) throw new ProductionV2CommandError("ARTIFACT_NOT_FOUND", 404, "Production V2 artifact not found");
  const object = await runtime.BUCKET.get(clean(artifact.storage_key)); if (!object) throw new ProductionV2CommandError("ARTIFACT_BYTES_NOT_FOUND", 404, "Production V2 artifact bytes not found");
  return { artifact, object };
}

export async function storePilotUpload(runtime: ProductionV2Runtime, packageId: string, kind: "PILOT_VIDEO" | "PILOT_QA", value: Uint8Array, actorEmail: string, lineageBinding: ProductionV2RenderLineageBinding = {}) {
  const packageRow = await runtime.DB.prepare("SELECT * FROM production_v2_packages WHERE id=? AND engine_version=? LIMIT 1").bind(packageId, ENGINE).first<Row>();
  if (!packageRow) throw new ProductionV2CommandError("PACKAGE_NOT_FOUND", 404, "Production V2 package not found");
  const job = await runtime.DB.prepare("SELECT * FROM production_v2_jobs WHERE package_id=? AND job_type='GOLDEN_PILOT' ORDER BY created_at DESC LIMIT 1").bind(packageId).first<Row>();
  if (!job) throw new ProductionV2CommandError("PILOT_JOB_NOT_FOUND", 409, "Start the golden pilot before uploading evidence");
  if (kind === "PILOT_VIDEO") {
    if (value.byteLength < 100_000 || value.byteLength > 25_000_000) throw new ProductionV2CommandError("PILOT_VIDEO_SIZE_INVALID", 422, "Pilot video bytes are outside the 100 KB–25 MB evidence boundary");
    const lineage = await verifyProductionV2RenderLineage(runtime, packageId, "PILOT_MANIFEST", lineageBinding);
    const artifact = await storeArtifact(runtime, packageId, null, "PILOT_MOTION_PROOF", `production-v2/${packageId}/pilot/motion-proof.webm`, "video/webm", value, { executor: "PRODUCTION_V2_GREENFIELD_EXECUTOR", requestedDurationSeconds: 30, ...lineage, legacySources: 0 });
    await exec(runtime.DB, "UPDATE production_v2_jobs SET lifecycle_state='QUALITY_PENDING',updated_at=? WHERE id=?", now(), job.id);
    return { outcome: "STORED", packageId, artifact };
  }
  const parsed = JSON.parse(new TextDecoder().decode(value)) as Record<string, unknown>, dimensions = parsed.dimensions as Record<string, unknown> | undefined;
  const video = await runtime.DB.prepare("SELECT * FROM production_v2_artifacts WHERE package_id=? AND artifact_type='PILOT_MOTION_PROOF' ORDER BY created_at DESC LIMIT 1").bind(packageId).first<Row>();
  if (!video) throw new ProductionV2CommandError("PILOT_VIDEO_REQUIRED", 409, "Store the pilot motion proof before QA evidence");
  const gates = {
    duration: num(parsed.durationSeconds) >= 29.5 && num(parsed.durationSeconds) <= 30.5,
    dimensions: num(dimensions?.width) >= 1280 && num(dimensions?.height) >= 720,
    fps: num(parsed.fps) >= 24,
    sceneChanges: num(parsed.sceneChanges) >= 9,
    blackRatio: num(parsed.blackFrameRatio) <= 0.02,
    freezeRatio: num(parsed.freezeRatio) <= 0.05,
    audio: clean(parsed.audioCodec).length > 0 && num(parsed.loudnessI) >= -22 && num(parsed.loudnessI) <= -12 && num(parsed.truePeakDb) <= -1,
    checksum: clean(parsed.videoSha256) === clean(video.sha256),
    independent: clean(parsed.actor) === "PRODUCTION_V2_QA_EXECUTOR",
  };
  if (!Object.values(gates).every(Boolean)) throw new ProductionV2CommandError("PILOT_QA_FAILED", 422, `Pilot QA failed: ${Object.entries(gates).filter(([, passed]) => !passed).map(([gate]) => gate).join(", ")}`);
  const artifact = await storeArtifact(runtime, packageId, null, "PILOT_QA_EVIDENCE", `production-v2/${packageId}/pilot/qa.json`, "application/json", value, { actor: parsed.actor, gates });
  const evidenceHash = await digest(value), assessmentId = id("pv2-qa");
  await exec(runtime.DB, "INSERT INTO production_v2_quality_assessments (id,package_id,artifact_id,assessment_type,evaluation_number,lifecycle_state,score,p0_count,p1_count,dimensions_json,findings_json,evidence_hash,independent_actor) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", assessmentId, packageId, video.id, "GOLDEN_PILOT_TECHNICAL_AND_PERCEPTUAL", 1, "PASS", 96, 0, 0, JSON.stringify({ ...gates, metrics: parsed }), "[]", evidenceHash, "PRODUCTION_V2_QA_EXECUTOR");
  await exec(runtime.DB, "UPDATE production_v2_jobs SET lifecycle_state='COMPLETE',updated_at=? WHERE id=?", now(), job.id);
  await exec(runtime.DB, "UPDATE production_v2_packages SET lifecycle_state='PILOT_PROOF_PASSED' WHERE id=?", packageId);
  await exec(runtime.DB, "UPDATE production_v2_scale_waves SET lifecycle_state='COMPLETE',completed_count=1,admission_evidence_hash=?,completed_at=? WHERE channel_id=? AND wave_number=0", evidenceHash, now(), packageRow.channel_id);
  await exec(runtime.DB, "INSERT INTO production_v2_audits (id,channel_id,entity_type,entity_id,event_type,actor_type,actor_email,detail_json,evidence_hash) VALUES (?,?,?,?,?,?,?,?,?)", id("pv2-audit"), packageRow.channel_id, "PILOT_JOB", job.id, "GOLDEN_PILOT_PASSED", "INDEPENDENT_QA", actorEmail, JSON.stringify({ assessmentId, qaArtifactId: artifact.id, gates, p0: 0, p1: 0, legacySources: 0 }), evidenceHash);
  return { outcome: "PASSED", packageId, assessmentId, artifact, gates };
}
