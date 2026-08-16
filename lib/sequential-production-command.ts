import { SEQUENTIAL_PRODUCTION_CONTRACT } from "@/app/production-control-contract";

type Row = Record<string, unknown>;
type RunResult = { success?: boolean; meta?: { changes?: number } };
type Statement = { bind(...values: unknown[]): Statement; all<T = Row>(): Promise<{ results?: T[] }>; first<T = Row>(): Promise<T | null>; run(): Promise<RunResult> };
export type SequentialCommandDB = { prepare(query: string): Statement; batch(statements: Statement[]): Promise<RunResult[]> };
type StoredObject = { arrayBuffer(): Promise<ArrayBuffer> };
export type SequentialBucket = { put(key: string, value: Uint8Array | string, options?: Record<string, unknown>): Promise<void>; get(key: string): Promise<StoredObject | null> };
export type SequentialCommandRuntime = { DB: SequentialCommandDB; BUCKET: SequentialBucket };

export type SequentialAction = "START_STAGE" | "PRODUCE_ARTIFACT" | "VERIFY_ARTIFACT" | "FREEZE_STAGE" | "REOPEN_ROOT_STAGE";
export type SequentialCommandBody = {
  action: SequentialAction;
  channelId: string;
  sequence: number;
  stageKey: string;
  expectedStageState: string;
  artifactType?: string;
  artifactId?: string;
  content?: unknown;
  parentArtifactIds?: string[];
  rightsState?: string;
  costState?: string;
  provider?: string;
  providerRequestId?: string;
  verification?: Record<string, unknown>;
  reason?: string;
};
export type SequentialActor = { email: string; displayName: string; actorType: "CHANNEL_OWNER" | "SYSTEM_AUTOMATION" };
export type SequentialCommandReceipt = {
  contract: typeof SEQUENTIAL_PRODUCTION_CONTRACT;
  outcome: "RECORDED" | "IDEMPOTENT_REPLAY";
  action: SequentialAction;
  channelId: string;
  sequence: number;
  stageKey: string;
  stageState: string;
  artifactId: string | null;
  providerRequests: number;
  spendUsd: number;
  authority: { actor: string; queueExclusive: true; publishingMutation: false; legacyReuse: false };
  detail: Record<string, unknown>;
};

export class SequentialCommandError extends Error {
  constructor(public readonly code: string, public readonly status: number, message: string) { super(message); this.name = "SequentialCommandError"; }
}

const now = () => new Date().toISOString();
const clean = (value: unknown) => String(value ?? "").trim();
const json = (value: unknown) => JSON.stringify(value);
const parseJson = <T>(value: unknown, fallback: T): T => { try { return JSON.parse(clean(value)) as T; } catch { return fallback; } };
const bytes = (value: string) => new TextEncoder().encode(value);
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
async function sha256(value: string | Uint8Array) {
  const input = typeof value === "string" ? bytes(value) : value;
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", input))].map((part) => part.toString(16).padStart(2, "0")).join("");
}
async function rows(db: SequentialCommandDB, query: string, ...values: unknown[]) { return (await db.prepare(query).bind(...values).all<Row>()).results ?? []; }
async function first(db: SequentialCommandDB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values).first<Row>(); }
function object(value: unknown, field: string) { if (!value || typeof value !== "object" || Array.isArray(value)) throw new SequentialCommandError("COMMAND_VALIDATION_FAILED", 400, `${field} must be an object`); return value as Row; }
function text(value: unknown, field: string, min = 1, max = 512) { const result = clean(value); if (result.length < min || result.length > max) throw new SequentialCommandError("COMMAND_VALIDATION_FAILED", 400, `${field} must contain ${min}-${max} characters`); return result; }
function integer(value: unknown, field: string, min: number, max: number) { const result = Number(value); if (!Number.isInteger(result) || result < min || result > max) throw new SequentialCommandError("COMMAND_VALIDATION_FAILED", 400, `${field} must be an integer between ${min} and ${max}`); return result; }
function stringArray(value: unknown, field: string, max = 256) { if (!Array.isArray(value) || value.length > max) throw new SequentialCommandError("COMMAND_VALIDATION_FAILED", 400, `${field} must be an array with at most ${max} items`); const result = value.map((item, index) => text(item, `${field}[${index}]`, 1, 512)); if (new Set(result).size !== result.length) throw new SequentialCommandError("COMMAND_VALIDATION_FAILED", 400, `${field} must not contain duplicates`); return result; }

export function parseSequentialCommandBody(value: unknown): SequentialCommandBody {
  const row = object(value, "command"), action = clean(row.action).toUpperCase() as SequentialAction;
  if (!["START_STAGE", "PRODUCE_ARTIFACT", "VERIFY_ARTIFACT", "FREEZE_STAGE", "REOPEN_ROOT_STAGE"].includes(action)) throw new SequentialCommandError("COMMAND_VALIDATION_FAILED", 400, "Unsupported sequential production action");
  const body: SequentialCommandBody = {
    action,
    channelId: text(row.channelId, "channelId", 3, 256),
    sequence: integer(row.sequence, "sequence", 1, 15),
    stageKey: text(row.stageKey, "stageKey", 2, 3),
    expectedStageState: text(row.expectedStageState, "expectedStageState", 3, 40),
  };
  if (action === "PRODUCE_ARTIFACT") {
    body.artifactType = text(row.artifactType, "artifactType", 2, 160);
    body.content = object(row.content, "content");
    body.parentArtifactIds = stringArray(row.parentArtifactIds ?? [], "parentArtifactIds");
    body.rightsState = text(row.rightsState, "rightsState", 3, 80);
    body.costState = text(row.costState, "costState", 3, 80);
    body.provider = clean(row.provider) || undefined;
    body.providerRequestId = clean(row.providerRequestId) || undefined;
  }
  if (action === "VERIFY_ARTIFACT") {
    body.artifactId = text(row.artifactId, "artifactId", 8, 256);
    body.verification = object(row.verification, "verification");
  }
  if (action === "REOPEN_ROOT_STAGE") body.reason = text(row.reason, "reason", 12, 1000);
  return body;
}

export function validateSequentialIdempotencyKey(value: unknown) {
  const key = text(value, "Idempotency-Key", 16, 200);
  if (!/^[A-Za-z0-9._:-]+$/.test(key)) throw new SequentialCommandError("COMMAND_VALIDATION_FAILED", 400, "Idempotency-Key contains unsupported characters");
  return key;
}

type Context = { program: Row; queue: Row; stage: Row; contract: Row };
async function commandContext(db: SequentialCommandDB, body: SequentialCommandBody): Promise<Context> {
  const program = await first(db, "SELECT * FROM v7_sequential_programs WHERE channel_id=? AND contract_version=? LIMIT 1", body.channelId, SEQUENTIAL_PRODUCTION_CONTRACT);
  if (!program || clean(program.lifecycle_state) !== "ACTIVE") throw new SequentialCommandError("SEQUENTIAL_PROGRAM_NOT_ACTIVE", 409, "The sequential production program is not active");
  if (clean(program.execution_mode) !== "ONE_VIDEO_AT_A_TIME") throw new SequentialCommandError("SEQUENTIAL_MODE_INVALID", 409, "The program is not enforcing one-video-at-a-time execution");
  const queue = await first(db, "SELECT * FROM v7_sequential_queue WHERE program_id=? AND sequence=? LIMIT 1", program.id, body.sequence);
  if (!queue) throw new SequentialCommandError("QUEUE_ITEM_NOT_FOUND", 404, "The requested video is not in the sequential queue");
  if (!Boolean(queue.active) || Number(program.current_sequence) !== body.sequence) throw new SequentialCommandError("VIDEO_BLOCKED_PREVIOUS_VIDEO", 409, "This video is blocked until the previous video becomes owner-ready");
  const stage = await first(db, "SELECT * FROM v7_sequential_stage_runs WHERE queue_id=? AND stage_key=? LIMIT 1", queue.id, body.stageKey);
  if (!stage) throw new SequentialCommandError("STAGE_RUN_NOT_FOUND", 404, "The requested stage run does not exist");
  const contract = await first(db, "SELECT * FROM v7_stage_contract_registry WHERE contract_version=? AND stage_key=? AND active=1 LIMIT 1", program.contract_version, body.stageKey);
  if (!contract) throw new SequentialCommandError("STAGE_CONTRACT_NOT_FOUND", 409, "No active Stage Contract Registry entry exists");
  const allowed = parseJson<string[]>(contract.allowed_commands_json, []);
  if (!allowed.includes(body.action)) throw new SequentialCommandError("COMMAND_NOT_ALLOWED_FOR_STAGE", 409, "The Stage Contract Registry does not allow this command");
  if (clean(stage.lifecycle_state) !== body.expectedStageState) throw new SequentialCommandError("STAGE_STATE_CONFLICT", 409, `Expected ${body.expectedStageState}; current state is ${clean(stage.lifecycle_state)}`);
  return { program, queue, stage, contract };
}

function receiptFromRow(row: Row, replay: boolean): SequentialCommandReceipt {
  const detail = parseJson<Record<string, unknown>>(row.detail_json, {});
  return {
    contract: SEQUENTIAL_PRODUCTION_CONTRACT,
    outcome: replay ? "IDEMPOTENT_REPLAY" : "RECORDED",
    action: clean(row.command) as SequentialAction,
    channelId: clean(detail.channelId),
    sequence: Number(detail.sequence),
    stageKey: clean(row.stage_key),
    stageState: clean(row.stage_state),
    artifactId: clean(row.artifact_id) || null,
    providerRequests: Number(row.provider_requests || 0),
    spendUsd: Number(row.spend_usd || 0),
    authority: { actor: clean(row.actor_email), queueExclusive: true, publishingMutation: false, legacyReuse: false },
    detail,
  };
}

async function recordReceipt(db: SequentialCommandDB, values: { key: string; hash: string; body: SequentialCommandBody; actor: SequentialActor; context: Context; stageState: string; artifactId?: string | null; detail: Record<string, unknown>; providerRequests?: number; spendUsd?: number }) {
  const receiptId = id("seq-receipt"), detail = { channelId: values.body.channelId, sequence: values.body.sequence, ...values.detail };
  await db.prepare("INSERT INTO v7_sequential_command_receipts (id,idempotency_key,request_hash,command,program_id,queue_id,stage_key,actor_type,actor_email,outcome,stage_state,artifact_id,provider_requests,spend_usd,detail_json) VALUES (?,?,?,?,?,?,?,?,?,'RECORDED',?,?,?,?,?)")
    .bind(receiptId, values.key, values.hash, values.body.action, values.context.program.id, values.context.queue.id, values.body.stageKey, values.actor.actorType, values.actor.email.toLowerCase(), values.stageState, values.artifactId || null, values.providerRequests || 0, values.spendUsd || 0, json(detail)).run();
  const row = await first(db, "SELECT * FROM v7_sequential_command_receipts WHERE id=?", receiptId);
  if (!row) throw new SequentialCommandError("COMMAND_RECEIPT_MISSING", 503, "The command receipt could not be read back");
  return receiptFromRow(row, false);
}

async function assertPredecessorsFrozen(db: SequentialCommandDB, context: Context) {
  const predecessors = parseJson<string[]>(context.contract.predecessor_keys_json, []);
  for (const key of predecessors) {
    const predecessor = await first(db, "SELECT lifecycle_state FROM v7_sequential_stage_runs WHERE queue_id=? AND stage_key=? LIMIT 1", context.queue.id, key);
    if (clean(predecessor?.lifecycle_state) !== "FROZEN") throw new SequentialCommandError("UPSTREAM_STAGE_NOT_FROZEN", 409, `Stage ${key} must freeze before Stage ${clean(context.stage.stage_key)} can start`);
  }
}

async function startStage(db: SequentialCommandDB, context: Context, body: SequentialCommandBody, actor: SequentialActor, key: string, hash: string) {
  await assertPredecessorsFrozen(db, context);
  const running = await first(db, "SELECT stage_key FROM v7_sequential_stage_runs WHERE queue_id=? AND lifecycle_state='RUNNING' LIMIT 1", context.queue.id);
  if (running) throw new SequentialCommandError("ANOTHER_STAGE_RUNNING", 409, `Stage ${clean(running.stage_key)} already owns the production lease`);
  const timestamp = now(), expires = new Date(Date.now() + 15 * 60_000).toISOString(), leaseId = id("seq-lease");
  const result = await db.prepare("UPDATE v7_sequential_stage_runs SET lifecycle_state='RUNNING',attempt=attempt+1,blocker=NULL,updated_at=? WHERE id=? AND lifecycle_state='READY'").bind(timestamp, context.stage.id).run();
  if (Number(result.meta?.changes || 0) !== 1) throw new SequentialCommandError("STAGE_START_CONFLICT", 409, "The stage could not acquire its execution state");
  await db.batch([
    db.prepare("UPDATE v7_sequential_leases SET lifecycle_state='EXPIRED',released_at=? WHERE program_id=? AND lifecycle_state='ACTIVE' AND expires_at<=?").bind(timestamp, context.program.id, timestamp),
    db.prepare("INSERT INTO v7_sequential_leases (id,program_id,queue_id,stage_key,lifecycle_state,actor_email,acquired_at,expires_at) VALUES (?,?,?,?,'ACTIVE',?,?,?)").bind(leaseId, context.program.id, context.queue.id, body.stageKey, actor.email.toLowerCase(), timestamp, expires),
    db.prepare("INSERT INTO v7_sequential_events (id,program_id,queue_id,event_type,actor_type,detail_json,evidence_hash) VALUES (?,?,?,?,?,?,?)").bind(id("seq-event"), context.program.id, context.queue.id, "STAGE_STARTED", actor.actorType, json({ stageKey: body.stageKey, leaseId, expiresAt: expires }), hash),
  ]);
  return recordReceipt(db, { key, hash, body, actor, context, stageState: "RUNNING", detail: { leaseId, leaseExpiresAt: expires, zeroProviderRequests: true, zeroSpendUsd: 0 } });
}

async function produceArtifact(runtime: SequentialCommandRuntime, context: Context, body: SequentialCommandBody, actor: SequentialActor, key: string, hash: string) {
  const required = parseJson<string[]>(context.contract.required_artifacts_json, []), artifactType = clean(body.artifactType);
  if (!required.includes(artifactType)) throw new SequentialCommandError("ARTIFACT_TYPE_NOT_REQUIRED", 409, `${artifactType} is not required by Stage ${body.stageKey}`);
  const policy = parseJson<{ providerAllowed?: boolean; providers?: string[]; budgetPlanRequired?: boolean }>(context.contract.provider_policy_json, {});
  if (body.provider && (!policy.providerAllowed || !policy.providers?.includes(body.provider))) throw new SequentialCommandError("PROVIDER_NOT_ALLOWED", 409, `${body.provider} is not allowed by the Stage Contract Registry`);
  if (policy.budgetPlanRequired) {
    const plan = await first(runtime.DB, "SELECT * FROM v7_sequential_budget_plans WHERE queue_id=? AND lifecycle_state='APPROVED' ORDER BY version DESC LIMIT 1", context.queue.id);
    if (!plan || !parseJson<string[]>(plan.stage_scope_json, []).includes(body.stageKey)) throw new SequentialCommandError("APPROVED_BUDGET_PLAN_REQUIRED", 409, "This stage requires an approved cost and rights plan");
  }
  const parentIds = body.parentArtifactIds || [];
  for (const parentId of parentIds) {
    const parent = await first(runtime.DB, "SELECT * FROM v7_sequential_artifacts WHERE id=? AND queue_id=? AND lifecycle_state='FROZEN' LIMIT 1", parentId, context.queue.id);
    if (!parent) throw new SequentialCommandError("PARENT_ARTIFACT_INELIGIBLE", 409, `Parent artifact ${parentId} is not frozen and eligible`);
  }
  const canonical = json(body.content), contentHash = await sha256(canonical);
  const legacy = await first(runtime.DB, "SELECT id FROM production_v2_artifacts WHERE sha256=? LIMIT 1", contentHash);
  if (legacy) throw new SequentialCommandError("LEGACY_HASH_BLOCKED", 409, "The Legacy Dependency Firewall rejected a prior artifact hash");
  const duplicate = await first(runtime.DB, "SELECT id FROM v7_sequential_artifacts WHERE queue_id=? AND sha256=? LIMIT 1", context.queue.id, contentHash);
  if (duplicate) throw new SequentialCommandError("ARTIFACT_CONTENT_DUPLICATE", 409, "This exact artifact content already exists in the current-video namespace");
  const revisionRow = await first(runtime.DB, "SELECT COALESCE(MAX(revision),0) revision FROM v7_sequential_artifacts WHERE queue_id=? AND stage_key=? AND artifact_type=?", context.queue.id, body.stageKey, artifactType);
  const revision = Number(revisionRow?.revision || 0) + 1, artifactId = id("seq-artifact"), storageKey = `sequential/${clean(context.program.id)}/${clean(context.queue.id)}/stage-${body.stageKey}/${encodeURIComponent(artifactType)}/r${revision}-${contentHash}.json`;
  await runtime.BUCKET.put(storageKey, canonical, { httpMetadata: { contentType: "application/json" }, customMetadata: { artifactId, sha256: contentHash, stageKey: body.stageKey, contract: SEQUENTIAL_PRODUCTION_CONTRACT } });
  const readback = await runtime.BUCKET.get(storageKey); if (!readback) throw new SequentialCommandError("R2_READBACK_FAILED", 503, "Stored artifact bytes could not be read back");
  const readbackBytes = new Uint8Array(await readback.arrayBuffer()), readbackHash = await sha256(readbackBytes);
  if (readbackHash !== contentHash) throw new SequentialCommandError("R2_HASH_MISMATCH", 503, "Stored artifact failed checksum verification");
  const lineageRootHash = await sha256(json({ sourceBriefHash: context.queue.source_brief_hash, stageKey: body.stageKey, parentIds, contentHash })), timestamp = now();
  await runtime.DB.batch([
    runtime.DB.prepare("INSERT INTO v7_sequential_artifacts (id,program_id,queue_id,stage_run_id,stage_key,artifact_type,revision,lifecycle_state,content_json,storage_key,mime_type,byte_size,sha256,parent_artifact_ids_json,lineage_root_hash,rights_state,cost_state,provider,provider_request_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'PRODUCED',?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(artifactId, context.program.id, context.queue.id, context.stage.id, body.stageKey, artifactType, revision, canonical, storageKey, "application/json", readbackBytes.byteLength, contentHash, json(parentIds), lineageRootHash, body.rightsState, body.costState, body.provider || null, body.providerRequestId || null, timestamp, timestamp),
    runtime.DB.prepare("INSERT INTO v7_sequential_events (id,program_id,queue_id,event_type,actor_type,detail_json,evidence_hash) VALUES (?,?,?,?,?,?,?)").bind(id("seq-event"), context.program.id, context.queue.id, "ARTIFACT_PRODUCED", actor.actorType, json({ stageKey: body.stageKey, artifactId, artifactType, revision, storageKey, byteSize: readbackBytes.byteLength }), contentHash),
  ]);
  return recordReceipt(runtime.DB, { key, hash, body, actor, context, stageState: "RUNNING", artifactId, detail: { artifactType, revision, sha256: contentHash, lineageRootHash, storageReadback: true, legacySources: 0 }, providerRequests: body.provider ? 1 : 0, spendUsd: 0 });
}

function validateArtifactContent(body: SequentialCommandBody, context: Context, artifact: Row) {
  const content = parseJson<Row>(artifact.content_json, {}), failures: string[] = [];
  if (clean(content.schemaVersion) !== "V7_V23_4_V281_ARTIFACT_V1") failures.push("schemaVersion");
  if (clean(content.stageKey) !== body.stageKey) failures.push("stageKey");
  if (Number(content.videoSequence) !== body.sequence) failures.push("videoSequence");
  if (clean(content.sourceBriefHash) !== clean(context.queue.source_brief_hash)) failures.push("sourceBriefHash");
  if (!content.evidence || typeof content.evidence !== "object") failures.push("evidence");
  const quality = content.quality && typeof content.quality === "object" ? content.quality as Row : {};
  const score = Number(quality.score || 0), p0 = Number(quality.p0Count || 0);
  if (body.stageKey === "00") {
    if (clean(artifact.artifact_type) === "production policy" && (clean(content.executionMode) !== "ONE_VIDEO_AT_A_TIME" || content.autoPublish !== false || Number(content.providerRequests) !== 0)) failures.push("productionPolicy");
    if (clean(artifact.artifact_type) === "canonical brief hash" && clean(content.canonicalBriefHash) !== clean(context.queue.source_brief_hash)) failures.push("canonicalBriefHash");
    if (clean(artifact.artifact_type) === "exclusive lease" && (clean(content.queueId) !== clean(context.queue.id) || content.video2Blocked !== true)) failures.push("exclusiveLease");
  } else if (score < 92 || p0 !== 0) failures.push("qualityFloor");
  if (body.stageKey === "09" && clean(artifact.artifact_type) === "stored source bytes") {
    const assets = Array.isArray(content.assets) ? content.assets as Row[] : [];
    if (assets.length !== 84 || assets.some((asset) => !clean(asset.storageKey) || !clean(asset.sha256) || Number(asset.byteSize || 0) <= 0 || asset.readbackVerified !== true)) failures.push("storedMediaAssets");
  }
  if (body.stageKey === "10" && clean(artifact.artifact_type) === "audio stems") {
    const stems = Array.isArray(content.stems) ? content.stems as Row[] : [];
    const narration = stems.find((stem) => clean(stem.stemType) === "NARRATION");
    if (stems.length < 3 || stems.some((stem) => !clean(stem.storageKey) || !clean(stem.sha256) || Number(stem.byteSize || 0) <= 0 || stem.readbackVerified !== true) || Number(narration?.durationSeconds || 0) < 480 || Number(narration?.durationSeconds || 0) > 720) failures.push("storedAudioStems");
  }
  if (failures.length) throw new SequentialCommandError("ARTIFACT_VERIFICATION_FAILED", 409, `Artifact failed deterministic checks: ${failures.join(", ")}`);
  return { score: body.stageKey === "00" ? 100 : score, p0Count: p0, deterministicChecks: "PASS" };
}

async function verifyArtifact(runtime: SequentialCommandRuntime, context: Context, body: SequentialCommandBody, actor: SequentialActor, key: string, hash: string) {
  const artifact = await first(runtime.DB, "SELECT * FROM v7_sequential_artifacts WHERE id=? AND queue_id=? AND stage_key=? LIMIT 1", body.artifactId, context.queue.id, body.stageKey);
  if (!artifact || clean(artifact.lifecycle_state) !== "PRODUCED") throw new SequentialCommandError("ARTIFACT_NOT_PRODUCED", 409, "The artifact is not in PRODUCED state");
  const eligibility = parseJson<{ rightsStates?: string[]; costStates?: string[]; requireStoredBytes?: boolean }>(context.contract.eligibility_policy_json, {});
  if (!eligibility.rightsStates?.includes(clean(artifact.rights_state))) throw new SequentialCommandError("ARTIFACT_RIGHTS_INELIGIBLE", 409, "The artifact rights state is not eligible for this stage");
  if (!eligibility.costStates?.includes(clean(artifact.cost_state))) throw new SequentialCommandError("ARTIFACT_COST_INELIGIBLE", 409, "The artifact cost state is not eligible for this stage");
  if (eligibility.requireStoredBytes && (!clean(artifact.storage_key) || Number(artifact.byte_size || 0) <= 0)) throw new SequentialCommandError("ARTIFACT_BYTES_REQUIRED", 409, "This stage requires stored artifact bytes");
  const object = await runtime.BUCKET.get(clean(artifact.storage_key)); if (!object) throw new SequentialCommandError("ARTIFACT_READBACK_MISSING", 503, "The artifact is missing from runtime storage");
  const readback = new Uint8Array(await object.arrayBuffer()), readbackHash = await sha256(readback);
  if (readbackHash !== clean(artifact.sha256)) throw new SequentialCommandError("ARTIFACT_READBACK_HASH_MISMATCH", 503, "The artifact read-back checksum does not match");
  const deterministic = validateArtifactContent(body, context, artifact), verification = { ...body.verification, ...deterministic, checksumMatch: true, rightsState: artifact.rights_state, costState: artifact.cost_state, verifiedBy: actor.email, verifiedAt: now() };
  await runtime.DB.batch([
    runtime.DB.prepare("UPDATE v7_sequential_artifacts SET lifecycle_state='VERIFIED',verification_json=?,verified_at=?,updated_at=? WHERE id=? AND lifecycle_state='PRODUCED'").bind(json(verification), verification.verifiedAt, verification.verifiedAt, artifact.id),
    runtime.DB.prepare("INSERT INTO v7_sequential_events (id,program_id,queue_id,event_type,actor_type,detail_json,evidence_hash) VALUES (?,?,?,?,?,?,?)").bind(id("seq-event"), context.program.id, context.queue.id, "ARTIFACT_VERIFIED", actor.actorType, json({ stageKey: body.stageKey, artifactId: artifact.id, verification }), hash),
  ]);
  return recordReceipt(runtime.DB, { key, hash, body, actor, context, stageState: "RUNNING", artifactId: clean(artifact.id), detail: { artifactType: artifact.artifact_type, verification } });
}

async function freezeStage(db: SequentialCommandDB, context: Context, body: SequentialCommandBody, actor: SequentialActor, key: string, hash: string) {
  const required = parseJson<string[]>(context.contract.required_artifacts_json, []), verified = await rows(db, "SELECT * FROM v7_sequential_artifacts WHERE queue_id=? AND stage_key=? AND lifecycle_state='VERIFIED' ORDER BY artifact_type,revision DESC", context.queue.id, body.stageKey);
  const latestByType = new Map<string, Row>(); for (const artifact of verified) if (!latestByType.has(clean(artifact.artifact_type))) latestByType.set(clean(artifact.artifact_type), artifact);
  const missing = required.filter((type) => !latestByType.has(type)); if (missing.length) throw new SequentialCommandError("REQUIRED_ARTIFACTS_NOT_VERIFIED", 409, `Verified artifacts are missing: ${missing.join(", ")}`);
  const activeProviders = await first(db, "SELECT COUNT(*) total FROM v7_sequential_provider_requests WHERE queue_id=? AND lifecycle_state IN ('RUNNING','QUEUED')", context.queue.id);
  if (Number(activeProviders?.total || 0) !== 0) throw new SequentialCommandError("ACTIVE_PROVIDER_REQUESTS_REMAIN", 409, "The stage cannot freeze while provider requests are active");
  const timestamp = now(), artifactIds = required.map((type) => clean(latestByType.get(type)?.id)), nextSequence = Number(context.stage.sequence) + 1;
  const next = await first(db, "SELECT * FROM v7_sequential_stage_runs WHERE queue_id=? AND sequence=? LIMIT 1", context.queue.id, nextSequence);
  await db.batch([
    ...artifactIds.map((artifactId) => db.prepare("UPDATE v7_sequential_artifacts SET lifecycle_state='FROZEN',frozen_at=?,updated_at=? WHERE id=? AND lifecycle_state='VERIFIED'").bind(timestamp, timestamp, artifactId)),
    db.prepare("UPDATE v7_sequential_stage_runs SET lifecycle_state='FROZEN',evidence_summary=?,blocker=NULL,frozen_at=?,updated_at=? WHERE id=? AND lifecycle_state='RUNNING'").bind(`${artifactIds.length}/${required.length} required artifacts frozen · checksum, lineage, rights and cost eligible`, timestamp, timestamp, context.stage.id),
    db.prepare("UPDATE v7_sequential_leases SET lifecycle_state='RELEASED',released_at=? WHERE program_id=? AND queue_id=? AND stage_key=? AND lifecycle_state='ACTIVE'").bind(timestamp, context.program.id, context.queue.id, body.stageKey),
    ...(next ? [db.prepare("UPDATE v7_sequential_stage_runs SET lifecycle_state='READY',blocker=NULL,evidence_summary=?,updated_at=? WHERE id=? AND lifecycle_state='BLOCKED_UPSTREAM'").bind(`Stage ${body.stageKey} frozen; predecessor evidence is eligible`, timestamp, next.id)] : []),
    db.prepare("INSERT INTO v7_sequential_events (id,program_id,queue_id,event_type,actor_type,detail_json,evidence_hash) VALUES (?,?,?,?,?,?,?)").bind(id("seq-event"), context.program.id, context.queue.id, "STAGE_FROZEN", actor.actorType, json({ stageKey: body.stageKey, artifactIds, nextStageKey: next?.stage_key || null }), hash),
  ]);
  return recordReceipt(db, { key, hash, body, actor, context, stageState: "FROZEN", detail: { artifactIds, requiredArtifacts: required, nextStageKey: next?.stage_key || null, activeProviderRequests: 0 } });
}

async function reopenRootStage(db: SequentialCommandDB, context: Context, body: SequentialCommandBody, actor: SequentialActor, key: string, hash: string) {
  if (Number(context.stage.attempt || 0) >= Number(context.program.maximum_repair_loops || 0) + 1) throw new SequentialCommandError("REPAIR_LIMIT_EXHAUSTED", 409, "The maximum root-cause repair loops have been exhausted");
  const timestamp = now(), downstream = await rows(db, "SELECT id,stage_key FROM v7_sequential_stage_runs WHERE queue_id=? AND sequence>? ORDER BY sequence", context.queue.id, context.stage.sequence);
  await db.batch([
    db.prepare("UPDATE v7_sequential_stage_runs SET lifecycle_state='READY',blocker=?,frozen_at=NULL,updated_at=? WHERE id=?").bind(`Root-cause repair authorized: ${body.reason}`, timestamp, context.stage.id),
    ...downstream.map((stage) => db.prepare("UPDATE v7_sequential_stage_runs SET lifecycle_state='BLOCKED_UPSTREAM',blocker=?,frozen_at=NULL,updated_at=? WHERE id=?").bind(`Stage ${body.stageKey} reopened for root-cause repair`, timestamp, stage.id)),
    db.prepare("UPDATE v7_sequential_artifacts SET lifecycle_state='SUPERSEDED',updated_at=? WHERE queue_id=? AND stage_key=? AND lifecycle_state IN ('PRODUCED','VERIFIED','FROZEN')").bind(timestamp, context.queue.id, body.stageKey),
    db.prepare("UPDATE v7_sequential_leases SET lifecycle_state='RELEASED',released_at=? WHERE program_id=? AND lifecycle_state='ACTIVE'").bind(timestamp, context.program.id),
    db.prepare("INSERT INTO v7_sequential_events (id,program_id,queue_id,event_type,actor_type,detail_json,evidence_hash) VALUES (?,?,?,?,?,?,?)").bind(id("seq-event"), context.program.id, context.queue.id, "ROOT_STAGE_REOPENED", actor.actorType, json({ stageKey: body.stageKey, reason: body.reason, downstreamBlocked: downstream.map((stage) => stage.stage_key) }), hash),
  ]);
  return recordReceipt(db, { key, hash, body, actor, context, stageState: "READY", detail: { reason: body.reason, downstreamBlocked: downstream.map((stage) => stage.stage_key), immutablePriorRevisionsPreserved: true } });
}

export async function submitSequentialCommand(runtime: SequentialCommandRuntime, command: { body: SequentialCommandBody; actor: SequentialActor; idempotencyKey: string }) {
  const body = parseSequentialCommandBody(command.body), key = validateSequentialIdempotencyKey(command.idempotencyKey), actorEmail = clean(command.actor.email).toLowerCase();
  if (!actorEmail) throw new SequentialCommandError("CHANNEL_OWNER_AUTHORIZATION_REQUIRED", 403, "Sequential production requires an authorized actor");
  const requestHash = await sha256(json({ actorEmail, body })), replay = await first(runtime.DB, "SELECT * FROM v7_sequential_command_receipts WHERE idempotency_key=? LIMIT 1", key);
  if (replay) { if (clean(replay.request_hash) !== requestHash) throw new SequentialCommandError("IDEMPOTENCY_KEY_REUSED", 409, "The idempotency key is bound to another command"); return receiptFromRow(replay, true); }
  const context = await commandContext(runtime.DB, body);
  if (body.action === "START_STAGE") return startStage(runtime.DB, context, body, command.actor, key, requestHash);
  if (body.action === "PRODUCE_ARTIFACT") return produceArtifact(runtime, context, body, command.actor, key, requestHash);
  if (body.action === "VERIFY_ARTIFACT") return verifyArtifact(runtime, context, body, command.actor, key, requestHash);
  if (body.action === "FREEZE_STAGE") return freezeStage(runtime.DB, context, body, command.actor, key, requestHash);
  return reopenRootStage(runtime.DB, context, body, command.actor, key, requestHash);
}
