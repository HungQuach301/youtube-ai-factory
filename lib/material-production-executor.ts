import { storeDriveJsonArtifact } from "./google-drive";
import { storeMaterial, type MaterialRole } from "./material-production-storage";
import {
  appendWriteCommandAudit,
  hashActorSubject,
  sha256Text,
  type WriteCommandAuditIdentity,
} from "./write-command-audit";

const PROGRAM_ID = "YTAF-V7-GREENFIELD";
const STAGE_ID = `${PROGRAM_ID}-STAGE-09`;
const HANDLER_IDENTITY = "app/api/factory/material-production/executor/route.ts#POST";
const MOTION_RENDERER_VERSION = "FRAMEFLOW_MOTION_PROOF_V1";
const SEQUENCE_RENDERER_VERSION = "CANONICAL_10MP_SEQUENCE_V1";
const INTEGRATED_SEQUENCE_COMPOSER_VERSION = "INTEGRATED_SEQUENCE_COMPOSER_V2_1_TIMEBASE_SAFE";

export const INTERNAL_EXECUTOR_ACTIONS = new Set([
  "EXECUTOR_HEARTBEAT",
  "CLAIM_MEDIA_JOB",
  "CLAIM_MOTION_JOB",
  "COMPLETE_MEDIA_JOB",
  "COMPLETE_MOTION_PROOF",
  "COMPLETE_SEQUENCE_PROOF",
  "COMPLETE_SEQUENCE_PRODUCT",
  "FAIL_MEDIA_JOB",
]);

type Statement = {
  bind: (...values: unknown[]) => Statement;
  run: () => Promise<unknown>;
  all: <T>() => Promise<{ results?: T[] }>;
  first: <T>() => Promise<T | null>;
};

type DB = {
  prepare: (query: string) => Statement;
  batch: (statements: Statement[]) => Promise<unknown>;
};

type BucketObject = { body: ReadableStream; httpMetadata?: { contentType?: string } };
type Bucket = {
  put: (key: string, value: string | ArrayBuffer | Uint8Array, options?: Record<string, unknown>) => Promise<unknown>;
  head: (key: string) => Promise<unknown>;
  get: (key: string) => Promise<BucketObject | null>;
};
type Env = { DB?: DB; BUCKET?: Bucket; MEDIA_EXECUTOR_SHARED_SECRET?: string };
type Row = Record<string, unknown>;

export class MaterialExecutorError extends Error {
  constructor(public code: string, public status: number) {
    super(code);
  }
}

export type AuthorizedMaterialExecutorCommand = {
  env: Env;
  db: DB;
  body: Row;
  action: string;
  executorId: string;
  auditIdentity: WriteCommandAuditIdentity;
  domainReference: string;
};

function clean(value: unknown) { return String(value ?? "").trim(); }
function short(value: unknown, length = 72) { const text = clean(value); return text.length <= length ? text : `${text.slice(0, length - 1)}…`; }
function arr(value: unknown) { return Array.isArray(value) ? value : []; }
function rec(value: unknown): Row { return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {}; }

async function shaBytes(value: ArrayBuffer | Uint8Array) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((item) => item.toString(16).padStart(2, "0")).join("");
}

async function sha(value: string) { return shaBytes(new TextEncoder().encode(value)); }

function constantTimeHexEqual(left: string, right: string) {
  const size = Math.max(left.length, right.length, 64);
  let difference = left.length ^ right.length;
  for (let index = 0; index < size; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export async function secretMatches(provided: string, expected: string) {
  if (!provided || !expected) return false;
  const [left, right] = await Promise.all([sha(provided), sha(expected)]);
  return constantTimeHexEqual(left, right);
}

function decodeBase64(value: string) {
  const normalized = value.replace(/^data:[^;]+;base64,/, "");
  const binary = atob(normalized), bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function validImage(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/png") return bytes.length > 8 && bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  if (mimeType === "image/jpeg") return bytes.length > 4 && bytes[0] === 255 && bytes[1] === 216 && bytes.at(-2) === 255 && bytes.at(-1) === 217;
  return false;
}

function validWebm(bytes: Uint8Array) {
  return bytes.length > 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
}

async function rawRuntime() {
  const { env } = await import("cloudflare:workers");
  return env as unknown as Env;
}

function denial(code: string, status: number): never {
  throw new MaterialExecutorError(code, status);
}

function correlationId(request: Request) {
  const supplied = clean(request.headers.get("x-correlation-id"));
  return /^[A-Za-z0-9._:-]{8,200}$/.test(supplied) ? supplied : `material-executor:${crypto.randomUUID()}`;
}

async function boundJob(db: DB, body: Row) {
  const jobId = clean(body.jobId), leaseToken = clean(body.leaseToken), executorId = clean(body.executorId);
  if (!jobId || !leaseToken || !executorId) return null;
  const job = await db.prepare("SELECT * FROM v7_media_jobs WHERE id=? AND status='LEASED'").bind(jobId).first<Row>();
  if (!job || !clean(job.lease_token_hash) || !constantTimeHexEqual(await sha(leaseToken), clean(job.lease_token_hash))) return null;
  if (new Date(clean(job.lease_expires_at)).getTime() < Date.now()) return null;
  const expectedOwner = clean(job.lease_owner);
  if (expectedOwner !== executorId && expectedOwner !== `bootstrap:${executorId}`) return null;
  return job;
}

async function motionBootstrapJob(db: DB, body: Row) {
  const jobId = clean(body.jobId), token = clean(body.bootstrapToken), executorId = clean(body.executorId);
  if (!jobId || !token || !executorId) return null;
  const job = await db.prepare("SELECT * FROM v7_media_jobs WHERE id=? AND job_type='MOTION_PROOF_RENDER' AND status='QUEUED' AND attempt<max_attempts").bind(jobId).first<Row>();
  if (!job) return null;
  const contract = rec(JSON.parse(String(job.contract_json))), bootstrap = rec(contract.bootstrap), expectedHash = clean(bootstrap.tokenHash);
  if (!expectedHash || !constantTimeHexEqual(await sha(token), expectedHash) || new Date(clean(bootstrap.expiresAt)).getTime() < Date.now()) return null;
  return job;
}

export async function authorizeMaterialExecutorRequest(request: Request, body: Row, rawBody: string, providedEnv?: Env): Promise<AuthorizedMaterialExecutorCommand> {
  const env = providedEnv || await rawRuntime();
  const supplied = clean(request.headers.get("x-frameflow-executor-key"));
  const sharedSecretValid = await secretMatches(supplied, clean(env.MEDIA_EXECUTOR_SHARED_SECRET));
  const action = clean(body.action);
  if (!INTERNAL_EXECUTOR_ACTIONS.has(action)) {
    if (!sharedSecretValid) denial("MEDIA_EXECUTOR_UNAUTHORIZED", 401);
    denial("EXECUTOR_ACTION_FORBIDDEN", 403);
  }
  const capabilityCandidate = (action === "CLAIM_MOTION_JOB"
      && Boolean(clean(body.jobId) && clean(body.bootstrapToken) && clean(body.executorId)))
    || (["COMPLETE_MOTION_PROOF", "FAIL_MEDIA_JOB"].includes(action)
      && Boolean(clean(body.jobId) && clean(body.leaseToken) && clean(body.executorId)));
  if (!sharedSecretValid && !capabilityCandidate) denial("MEDIA_EXECUTOR_UNAUTHORIZED", 401);
  if (!env.DB) throw new MaterialExecutorError("MEDIA_EXECUTOR_DATABASE_UNAVAILABLE", 503);
  const db = env.DB;
  const executorId = clean(body.executorId) || "default-media-executor";
  let resourceScope = `executor:${executorId}`;
  let domainReference = `executor:${executorId}`;
  let capabilityAuthorized = false;

  if (action === "CLAIM_MOTION_JOB" && !sharedSecretValid) {
    const job = await motionBootstrapJob(db, { ...body, executorId });
    if (!job) denial("MOTION_BOOTSTRAP_BINDING_INVALID", 403);
    capabilityAuthorized = true;
    resourceScope = `job:${clean(job.id)}`;
    domainReference = resourceScope;
  } else if (["COMPLETE_MOTION_PROOF", "FAIL_MEDIA_JOB"].includes(action) && !sharedSecretValid) {
    const job = await boundJob(db, { ...body, executorId });
    if (!job || clean(job.job_type) !== "MOTION_PROOF_RENDER" || !clean(job.lease_owner).startsWith("bootstrap:")) denial("MEDIA_JOB_LEASE_INVALID", 409);
    capabilityAuthorized = true;
    resourceScope = `job:${clean(job.id)}`;
    domainReference = resourceScope;
  }

  if (!sharedSecretValid && !capabilityAuthorized) denial("MEDIA_EXECUTOR_UNAUTHORIZED", 401);

  if (["COMPLETE_MEDIA_JOB", "COMPLETE_MOTION_PROOF", "COMPLETE_SEQUENCE_PROOF", "COMPLETE_SEQUENCE_PRODUCT", "FAIL_MEDIA_JOB"].includes(action) && !capabilityAuthorized) {
    const job = await boundJob(db, { ...body, executorId });
    if (!job) denial("MEDIA_JOB_LEASE_INVALID", 409);
    resourceScope = `job:${clean(job.id)}`;
    domainReference = resourceScope;
  } else if (action === "CLAIM_MEDIA_JOB") {
    resourceScope = `program:${PROGRAM_ID}:media-queue`;
    domainReference = resourceScope;
  } else if (action === "CLAIM_MOTION_JOB" && sharedSecretValid) {
    const job = await motionBootstrapJob(db, { ...body, executorId });
    if (!job) denial("MOTION_BOOTSTRAP_UNAUTHORIZED", 403);
    resourceScope = `job:${clean(job.id)}`;
    domainReference = resourceScope;
  }

  const actorSubjectHash = await hashActorSubject("INTERNAL_SYSTEM", executorId);
  return {
    env,
    db,
    body: { ...body, executorId },
    action,
    executorId,
    domainReference,
    auditIdentity: {
      handlerIdentity: HANDLER_IDENTITY,
      actorType: "INTERNAL_SYSTEM",
      actorSubjectHash,
      action,
      resourceScope,
      correlationId: correlationId(request),
      requestHash: await sha256Text(rawBody),
    },
  };
}

function claimedJobPayload(claimed: Row, leaseToken: string) {
  const contract = rec(JSON.parse(String(claimed.contract_json)));
  const sourceDownloadUrls = arr(contract.sources).map(rec).map((source) => ({ state: clean(source.state), logicalId: clean(source.logicalId), fileId: clean(source.fileId), sha256: clean(source.sha256), url: `/api/factory/material-production?executionSource=${encodeURIComponent(clean(claimed.id))}&leaseToken=${encodeURIComponent(leaseToken)}&fileId=${encodeURIComponent(clean(source.fileId))}` }));
  return { id: claimed.id, type: claimed.job_type, briefId: claimed.brief_id, attempt: Number(claimed.attempt), maxAttempts: Number(claimed.max_attempts), leaseExpiresAt: claimed.lease_expires_at, leaseToken, sourceDownloadUrl: `/api/factory/material-production?executionSource=${encodeURIComponent(clean(claimed.id))}&leaseToken=${encodeURIComponent(leaseToken)}`, sourceDownloadUrls, contract };
}

async function claimMotionJobBootstrap(command: AuthorizedMaterialExecutorCommand) {
  const { db, body, executorId } = command, jobId = clean(body.jobId), now = new Date().toISOString();
  const job = await motionBootstrapJob(db, body);
  if (!job) throw new MaterialExecutorError("MOTION_BOOTSTRAP_UNAUTHORIZED", 403);
  const contract = rec(JSON.parse(String(job.contract_json)));
  const leaseToken = crypto.randomUUID(), tokenHash = await sha(leaseToken), expiry = new Date(Date.now() + 10 * 60_000).toISOString();
  delete contract.bootstrap;
  await db.prepare("UPDATE v7_media_jobs SET status='LEASED',attempt=attempt+1,lease_owner=?,lease_token_hash=?,lease_expires_at=?,contract_json=?,updated_at=? WHERE id=? AND status='QUEUED'").bind(`bootstrap:${executorId}`, tokenHash, expiry, JSON.stringify(contract), now, jobId).run();
  const claimed = await db.prepare("SELECT * FROM v7_media_jobs WHERE id=? AND status='LEASED' AND lease_owner=?").bind(jobId, `bootstrap:${executorId}`).first<Row>();
  if (!claimed) throw new MaterialExecutorError("MOTION_BOOTSTRAP_CLAIM_CONFLICT", 409);
  return Response.json({ status: "LEASED", job: claimedJobPayload(claimed, leaseToken) });
}

async function executorHeartbeat({ db, body, executorId }: AuthorizedMaterialExecutorCommand) {
  const version = clean(body.version) || "unknown", capabilities = arr(body.capabilities).map(clean).filter(Boolean).slice(0, 20), now = new Date().toISOString();
  await db.prepare("INSERT INTO v7_media_executors (id,program_id,status,version,capabilities_json,last_seen_at,created_at,updated_at) VALUES (?,?,'ONLINE',?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status='ONLINE',version=excluded.version,capabilities_json=excluded.capabilities_json,last_seen_at=excluded.last_seen_at,updated_at=excluded.updated_at").bind(executorId, PROGRAM_ID, version, JSON.stringify(capabilities), now, now, now).run();
  return Response.json({ status: "READY", executorId, serverTime: now });
}

async function claimMediaJob({ db, executorId }: AuthorizedMaterialExecutorCommand) {
  const now = new Date().toISOString(), expiry = new Date(Date.now() + 10 * 60_000).toISOString();
  await db.prepare("UPDATE v7_media_jobs SET status='QUEUED',lease_owner=NULL,lease_token_hash=NULL,lease_expires_at=NULL,updated_at=? WHERE program_id=? AND status='LEASED' AND lease_expires_at<? AND attempt<max_attempts").bind(now, PROGRAM_ID, now).run();
  await db.prepare("UPDATE v7_media_jobs SET status='FAILED',error='LEASE_EXHAUSTED',updated_at=? WHERE program_id=? AND status='LEASED' AND lease_expires_at<? AND attempt>=max_attempts").bind(now, PROGRAM_ID, now).run();
  const job = await db.prepare("SELECT * FROM v7_media_jobs WHERE program_id=? AND status='QUEUED' AND attempt<max_attempts ORDER BY priority DESC,created_at ASC LIMIT 1").bind(PROGRAM_ID).first<Row>();
  if (!job) return Response.json({ status: "IDLE", retryAfterSeconds: 15 });
  const leaseToken = crypto.randomUUID(), tokenHash = await sha(leaseToken);
  await db.prepare("UPDATE v7_media_jobs SET status='LEASED',attempt=attempt+1,lease_owner=?,lease_token_hash=?,lease_expires_at=?,updated_at=? WHERE id=? AND status='QUEUED'").bind(executorId, tokenHash, expiry, now, job.id).run();
  const claimed = await db.prepare("SELECT * FROM v7_media_jobs WHERE id=? AND status='LEASED' AND lease_owner=?").bind(job.id, executorId).first<Row>();
  if (!claimed) return Response.json({ status: "RETRY", retryAfterSeconds: 2 }, { status: 409 });
  return Response.json({ status: "LEASED", job: claimedJobPayload(claimed, leaseToken) });
}

async function completeMediaJob({ env, db, body }: AuthorizedMaterialExecutorCommand) {
  if (!env.BUCKET) throw new Error("R2_MATERIAL_STORAGE_REQUIRED");
  const jobId = clean(body.jobId), job = await db.prepare("SELECT * FROM v7_media_jobs WHERE id=? AND status='LEASED'").bind(jobId).first<Row>();
  if (!job) throw new MaterialExecutorError("MEDIA_JOB_LEASE_INVALID", 409);
  const source = await db.prepare("SELECT * FROM v7_material_files WHERE id=?").bind(job.source_file_id).first<Row>();
  const brief = await db.prepare("SELECT * FROM v7_material_briefs WHERE id=?").bind(job.brief_id).first<Row>();
  const authorization = await db.prepare("SELECT * FROM v7_material_authorizations WHERE id=?").bind(job.authorization_id).first<Row>();
  if (!source || !brief || !authorization) throw new Error("MEDIA_JOB_LINEAGE_MISSING");
  const probe = rec(body.probe), frames = arr(body.frames).map(rec), contract = rec(JSON.parse(String(job.contract_json))), expected = rec(contract.output), requiredRoles = ["ENTRY", "MIDPOINT", "EXIT"];
  if (clean(body.sourceHash) !== clean(source.content_hash)) throw new Error("MEDIA_SOURCE_HASH_MISMATCH");
  if (frames.length !== 3 || !requiredRoles.every((role) => frames.filter((frame) => clean(frame.role) === role).length === 1)) throw new Error("MEDIA_FRAME_SET_INVALID");
  if (Math.abs(Number(probe.durationSeconds) - Number(source.duration_seconds || 0)) > 0.25) throw new Error("MEDIA_DURATION_MISMATCH");
  const storedFrameIds: string[] = [];
  for (const frame of frames) {
    const role = clean(frame.role), mimeType = clean(frame.mimeType), bytes = decodeBase64(clean(frame.base64));
    if (Number(frame.width) !== Number(expected.width) || Number(frame.height) !== Number(expected.height) || !validImage(bytes, mimeType) || bytes.byteLength < 20_000 || bytes.byteLength > 2_500_000) throw new Error(`MEDIA_FRAME_INVALID · ${role}`);
    const storedRole = (`SOURCE_${role}`) as "SOURCE_ENTRY" | "SOURCE_MIDPOINT" | "SOURCE_EXIT";
    storedFrameIds.push(await storeMaterial(env, db, authorization, brief, { role: storedRole, identity: clean(jobId).split("-SOURCE-FRAMES-").at(-1), bytes, mimeType, extension: mimeType === "image/png" ? "png" : "jpg", sourceType: "DECODED_SOURCE_FRAME", provider: "MEDIA_EXECUTOR", providerAssetId: clean(source.provider_asset_id), sourceUrl: clean(source.source_url), landingUrl: clean(source.landing_url), licenseCode: clean(source.license_code), width: Number(frame.width), height: Number(frame.height), duration: Number(frame.timestampSeconds) }));
  }
  const evidence = { version: "SOURCE_FRAME_EVIDENCE_V1", jobId, briefId: job.brief_id, sourceFileId: source.id, sourceHash: source.content_hash, probe, frames: frames.map((frame, index) => ({ role: clean(frame.role), timestampSeconds: Number(frame.timestampSeconds), width: Number(frame.width), height: Number(frame.height), mimeType: clean(frame.mimeType), fileId: storedFrameIds[index] })), completedAt: new Date().toISOString() };
  const json = JSON.stringify(evidence, null, 2), hash = await sha(json), key = `v7/material-production/${job.run_id}/execution/${jobId}-evidence.json`;
  await env.BUCKET.put(key, json, { httpMetadata: { contentType: "application/json" }, customMetadata: { contentHash: hash, jobId, briefId: clean(job.brief_id) } });
  const drive = await storeDriveJsonArtifact({ folderPath: ["Channels", "Hidden Systems", "Projects", "V7 Greenfield Pilot", "Material Production", "Execution Evidence"], fileName: `${jobId}-evidence.json`, content: json, artifactId: `${jobId}-EVIDENCE`, contentHash: hash });
  const now = new Date().toISOString();
  await db.batch([
    db.prepare("INSERT INTO v7_media_evidence (id,program_id,run_id,authorization_id,brief_id,job_id,evidence_type,status,content_json,content_hash,runtime_key,drive_file_id,created_at) VALUES (?,?,?,?,?,?,'SOURCE_FRAME_SET','TECHNICALLY_VERIFIED',?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status='TECHNICALLY_VERIFIED',content_json=excluded.content_json,content_hash=excluded.content_hash,runtime_key=excluded.runtime_key,drive_file_id=excluded.drive_file_id").bind(`${jobId}-EVIDENCE`, PROGRAM_ID, job.run_id, job.authorization_id, job.brief_id, jobId, json, hash, key, drive.id, now),
    db.prepare("UPDATE v7_media_jobs SET status='COMPLETE',output_json=?,error=NULL,completed_at=?,updated_at=?,lease_token_hash=NULL,lease_expires_at=NULL WHERE id=?").bind(JSON.stringify({ evidenceId: `${jobId}-EVIDENCE`, frameFileIds: storedFrameIds }), now, now, jobId),
    db.prepare("UPDATE v7_stage_states SET blocker='SOURCE_FRAME_QA_REQUIRED',evidence_summary=?,updated_at=? WHERE id=?").bind(`${job.brief_id} source bytes and decoded frames technically verified · semantic acceptance pending`, now, STAGE_ID),
  ]);
  return Response.json({ status: "COMPLETE", jobId, evidenceId: `${jobId}-EVIDENCE`, frameFileIds: storedFrameIds });
}

async function completeSequenceProduct({ env, db, body }: AuthorizedMaterialExecutorCommand) {
  if (!env.BUCKET) throw new Error("R2_MATERIAL_STORAGE_REQUIRED");
  const jobId = clean(body.jobId), job = await db.prepare("SELECT * FROM v7_media_jobs WHERE id=? AND status='LEASED' AND job_type='INTEGRATED_SEQUENCE_RENDER'").bind(jobId).first<Row>();
  if (!job) throw new MaterialExecutorError("MEDIA_JOB_LEASE_INVALID", 409);
  const contract = rec(JSON.parse(String(job.contract_json))), product = await db.prepare("SELECT * FROM v7_sequence_products WHERE id=? AND status='PRODUCING'").bind(contract.productId).first<Row>(), authorization = await db.prepare("SELECT * FROM v7_material_authorizations WHERE id=?").bind(job.authorization_id).first<Row>();
  if (!product || !authorization || clean(product.specification_hash) !== clean(await sha(JSON.stringify(contract.specification)))) throw new Error("SEQUENCE_PRODUCT_LINEAGE_MISSING");
  const expectedSources = arr(contract.sources).map(rec), returnedHashes = arr(body.sourceHashes).map(rec);
  if (expectedSources.length !== 30 || returnedHashes.length !== 30 || !expectedSources.every((source) => returnedHashes.some((item) => clean(item.fileId) === clean(source.fileId) && clean(item.sha256) === clean(source.sha256)))) throw new Error("SEQUENCE_PRODUCT_SOURCE_HASH_MISMATCH");
  const render = rec(body.render), videoBytes = decodeBase64(clean(render.base64)), durationSeconds = Number(render.durationSeconds), fps = Number(render.fps), expectedOutput = rec(contract.output), measurements = rec(body.measurements), corrections = arr(body.corrections).map(rec), iterations = Number(body.iterations);
  if (clean(render.mimeType) !== "video/webm" || !validWebm(videoBytes) || videoBytes.byteLength < 100_000 || videoBytes.byteLength > 60_000_000) throw new Error("SEQUENCE_PRODUCT_RENDER_INVALID");
  const contractFit = Number(render.width) === Number(expectedOutput.width) && Number(render.height) === Number(expectedOutput.height) && Math.abs(durationSeconds - 30) <= 0.08 && Math.abs(fps - 30) <= 0.2;
  const productionComplete = contractFit
    && iterations >= 1 && iterations <= Number(product.max_iterations)
    && measurements.sourceHashMatch === true
    && measurements.noCrop === true
    && measurements.mobileSafe === true
    && measurements.fullFrameScan === true
    && Number(measurements.framesScanned) >= 890
    && Number(measurements.continuityEdges) === 9
    && Number(measurements.adjacentTreatmentDuplicates) === 0
    && Number(measurements.blackFrameSeconds) <= 0.04
    && Number(measurements.maxFrozenFrameSeconds) <= 1.7;
  const now = new Date().toISOString();
  if (!productionComplete) {
    await db.batch([
      db.prepare("UPDATE v7_sequence_products SET status='PRODUCTION_BLOCKED',iteration=?,measurements_json=?,corrections_json=?,updated_at=? WHERE id=?").bind(iterations, JSON.stringify(measurements), JSON.stringify(corrections), now, product.id),
      db.prepare("UPDATE v7_media_jobs SET status='COMPLETE',output_json=?,error='PRODUCTION_DOD_NOT_MET',completed_at=?,updated_at=?,lease_token_hash=NULL,lease_expires_at=NULL WHERE id=?").bind(JSON.stringify({ productId: product.id, productionComplete: false, measurements, corrections }), now, now, jobId),
      db.prepare("UPDATE v7_stage_states SET status='PRODUCTION_BLOCKED',blocker='SEQUENCE_COMPOSER_DID_NOT_CONVERGE',evidence_summary=?,updated_at=? WHERE id=?").bind(`Integrated composer stopped after ${iterations}/${Number(product.max_iterations)} internal iterations · PRODUCT_COMPLETE not declared · QA requests 0 · scale locked`, now, STAGE_ID),
    ]);
    return Response.json({ status: "PRODUCTION_BLOCKED", productId: product.id, measurements, corrections });
  }
  const frames = arr(body.frames).map(rec), expectedSamples = arr(contract.samplePositions).map(rec);
  if (frames.length !== 10 || !expectedSamples.every((sample) => frames.some((frame) => clean(frame.role) === clean(sample.role) && clean(frame.logicalId) === clean(sample.logicalId)))) throw new Error("SEQUENCE_PRODUCT_SAMPLE_SET_INVALID");
  const brief = { id: "SEQUENCE-PRODUCT-V2" } as Row, identity = clean(product.specification_hash).slice(0, 16);
  const productFileId = await storeMaterial(env, db, authorization, brief, { role: "SEQUENCE_PRODUCT", identity, bytes: videoBytes, mimeType: "video/webm", extension: "webm", sourceType: INTEGRATED_SEQUENCE_COMPOSER_VERSION, provider: "FRAMEFLOW_EXECUTOR", providerAssetId: clean(product.id), sourceUrl: clean(product.id), landingUrl: clean(product.id), licenseCode: "CHANNEL_OWNED", width: Number(render.width), height: Number(render.height), duration: durationSeconds });
  const storedFrames: Row[] = [];
  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index], bytes = decodeBase64(clean(frame.base64)), mimeType = clean(frame.mimeType), role = clean(frame.role), logicalId = clean(frame.logicalId);
    if (Number(frame.width) !== 960 || Number(frame.height) !== 540 || !validImage(bytes, mimeType) || bytes.byteLength < 20_000 || bytes.byteLength > 2_500_000) throw new Error(`SEQUENCE_PRODUCT_SAMPLE_INVALID · ${logicalId}`);
    const fileId = await storeMaterial(env, db, authorization, brief, { role: `SEQUENCE_PRODUCT_SAMPLE_${index + 1}` as MaterialRole, identity, bytes, mimeType, extension: mimeType === "image/png" ? "png" : "jpg", sourceType: `${INTEGRATED_SEQUENCE_COMPOSER_VERSION}_SAMPLE`, provider: "FRAMEFLOW_EXECUTOR", providerAssetId: productFileId, sourceUrl: productFileId, landingUrl: clean(product.id), licenseCode: "CHANNEL_OWNED", width: 960, height: 540, duration: Number(frame.timestampSeconds) });
    storedFrames.push({ role, logicalId, timestampSeconds: Number(frame.timestampSeconds), fileId, sha256: await shaBytes(bytes) });
  }
  const renderHash = await shaBytes(videoBytes), evidence = { version: "SEQUENCE_PRODUCT_EVIDENCE_V2", productId: product.id, sourceProofId: product.source_proof_id, jobId, composer: product.composer_version, specificationHash: product.specification_hash, sourceManifestHash: product.source_manifest_hash, lifecycleState: "PRODUCT_COMPLETE", iterations, corrections, measurements, render: { mimeType: "video/webm", codec: clean(render.codec), width: Number(render.width), height: Number(render.height), durationSeconds, fps, audio: "NONE", sha256: renderHash }, sourceHashes: returnedHashes, frames: storedFrames, completedAt: now };
  const json = JSON.stringify(evidence, null, 2), evidenceHash = await sha(json), key = `v7/material-production/${job.run_id}/sequence-products/${product.id}-evidence.json`;
  await env.BUCKET.put(key, json, { httpMetadata: { contentType: "application/json" }, customMetadata: { contentHash: evidenceHash, productId: clean(product.id), lifecycleState: "PRODUCT_COMPLETE" } });
  const drive = await storeDriveJsonArtifact({ folderPath: ["Channels", "Hidden Systems", "Projects", "V7 Greenfield Pilot", "Material Production", "Sequence Products"], fileName: `${product.id}-evidence.json`, content: json, artifactId: `${product.id}-EVIDENCE`, contentHash: evidenceHash });
  await db.batch([
    db.prepare("INSERT INTO v7_media_evidence (id,program_id,run_id,authorization_id,brief_id,job_id,evidence_type,status,content_json,content_hash,runtime_key,drive_file_id,created_at) VALUES (?,?,?,?,?,?,'SEQUENCE_PRODUCT','PRODUCT_COMPLETE',?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status='PRODUCT_COMPLETE',content_json=excluded.content_json,content_hash=excluded.content_hash,runtime_key=excluded.runtime_key,drive_file_id=excluded.drive_file_id").bind(`${product.id}-EVIDENCE`, PROGRAM_ID, job.run_id, job.authorization_id, "SEQUENCE-PRODUCT-V2", jobId, json, evidenceHash, key, drive.id, now),
    db.prepare("UPDATE v7_sequence_products SET status='PRODUCT_COMPLETE',iteration=?,product_file_id=?,evidence_id=?,measurements_json=?,corrections_json=?,content_hash=?,updated_at=?,completed_at=? WHERE id=?").bind(iterations, productFileId, `${product.id}-EVIDENCE`, JSON.stringify(measurements), JSON.stringify(corrections), renderHash, now, now, product.id),
    db.prepare("UPDATE v7_media_jobs SET status='COMPLETE',output_json=?,error=NULL,completed_at=?,updated_at=?,lease_token_hash=NULL,lease_expires_at=NULL WHERE id=?").bind(JSON.stringify({ productId: product.id, productComplete: true, evidenceId: `${product.id}-EVIDENCE`, productFileId, frameFileIds: storedFrames.map((frame) => frame.fileId) }), now, now, jobId),
    db.prepare("UPDATE v7_stage_states SET status='PRODUCT_COMPLETE',blocker='INDEPENDENT_RELEASE_AUDIT_NOT_STARTED',evidence_summary=?,updated_at=? WHERE id=?").bind(`30-second product complete after ${iterations} integrated production iteration(s) · full-file deterministic Definition of Done passed · QA requests 0 · independent audit not started`, now, STAGE_ID),
  ]);
  return Response.json({ status: "PRODUCT_COMPLETE", productId: product.id, evidenceId: `${product.id}-EVIDENCE`, productFileId, frameFileIds: storedFrames.map((frame) => frame.fileId), measurements, corrections });
}

async function completeSequenceProof({ env, db, body }: AuthorizedMaterialExecutorCommand) {
  if (!env.BUCKET) throw new Error("R2_MATERIAL_STORAGE_REQUIRED");
  const jobId = clean(body.jobId), job = await db.prepare("SELECT * FROM v7_media_jobs WHERE id=? AND status='LEASED' AND job_type='SEQUENCE_PROOF_RENDER'").bind(jobId).first<Row>();
  if (!job) throw new MaterialExecutorError("MEDIA_JOB_LEASE_INVALID", 409);
  const contract = rec(JSON.parse(String(job.contract_json))), proof = await db.prepare("SELECT * FROM v7_sequence_proofs WHERE id=?").bind(contract.proofId).first<Row>(), authorization = await db.prepare("SELECT * FROM v7_material_authorizations WHERE id=?").bind(job.authorization_id).first<Row>();
  if (!proof || !authorization) throw new Error("SEQUENCE_PROOF_LINEAGE_MISSING");
  const expectedSources = arr(contract.sources).map(rec), returnedHashes = arr(body.sourceHashes).map(rec);
  if (expectedSources.length !== 30 || returnedHashes.length !== 30 || !expectedSources.every((source) => returnedHashes.some((item) => clean(item.fileId) === clean(source.fileId) && clean(item.sha256) === clean(source.sha256)))) throw new Error("SEQUENCE_SOURCE_HASH_MISMATCH");
  const render = rec(body.render), videoBytes = decodeBase64(clean(render.base64)), durationSeconds = Number(render.durationSeconds), fps = Number(render.fps), expectedOutput = rec(contract.output);
  if (clean(render.mimeType) !== "video/webm" || !validWebm(videoBytes) || videoBytes.byteLength < 100_000 || videoBytes.byteLength > 60_000_000) throw new Error("SEQUENCE_RENDER_INVALID");
  if (Number(render.width) !== Number(expectedOutput.width) || Number(render.height) !== Number(expectedOutput.height) || Math.abs(durationSeconds - 30) > 0.08 || Math.abs(fps - 30) > 0.2) throw new Error("SEQUENCE_RENDER_CONTRACT_MISMATCH");
  const frames = arr(body.frames).map(rec), expectedSamples = arr(contract.samplePositions).map(rec);
  if (frames.length !== 10 || !expectedSamples.every((sample) => frames.some((frame) => clean(frame.role) === clean(sample.role) && clean(frame.logicalId) === clean(sample.logicalId)))) throw new Error("SEQUENCE_SAMPLE_SET_INVALID");
  const brief = { id: "SEQUENCE-10MP" } as Row, identity = clean(proof.content_hash).slice(0, 16);
  const sequenceFileId = await storeMaterial(env, db, authorization, brief, { role: "SEQUENCE_PROOF", identity, bytes: videoBytes, mimeType: "video/webm", extension: "webm", sourceType: SEQUENCE_RENDERER_VERSION, provider: "FRAMEFLOW_EXECUTOR", providerAssetId: clean(proof.id), sourceUrl: clean(proof.id), landingUrl: clean(proof.id), licenseCode: "CHANNEL_OWNED", width: Number(render.width), height: Number(render.height), duration: durationSeconds });
  const storedFrames: Row[] = [];
  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index], bytes = decodeBase64(clean(frame.base64)), mimeType = clean(frame.mimeType), role = clean(frame.role), logicalId = clean(frame.logicalId);
    if (Number(frame.width) !== 960 || Number(frame.height) !== 540 || !validImage(bytes, mimeType) || bytes.byteLength < 20_000 || bytes.byteLength > 2_500_000) throw new Error(`SEQUENCE_SAMPLE_INVALID · ${logicalId}`);
    const fileId = await storeMaterial(env, db, authorization, brief, { role: `SEQUENCE_SAMPLE_${index + 1}` as MaterialRole, identity, bytes, mimeType, extension: mimeType === "image/png" ? "png" : "jpg", sourceType: `${SEQUENCE_RENDERER_VERSION}_SAMPLE`, provider: "FRAMEFLOW_EXECUTOR", providerAssetId: sequenceFileId, sourceUrl: sequenceFileId, landingUrl: clean(proof.id), licenseCode: "CHANNEL_OWNED", width: 960, height: 540, duration: Number(frame.timestampSeconds) });
    storedFrames.push({ role, logicalId, timestampSeconds: Number(frame.timestampSeconds), fileId, sha256: await shaBytes(bytes) });
  }
  const evidence = { version: "SEQUENCE_PROOF_EVIDENCE_V1", proofId: proof.id, jobId, renderer: proof.version, sequenceFileId, render: { mimeType: "video/webm", codec: clean(render.codec), width: Number(render.width), height: Number(render.height), durationSeconds, fps, audio: "NONE", sha256: await shaBytes(videoBytes) }, sourceHashes: returnedHashes, frames: storedFrames, completedAt: new Date().toISOString() };
  const json = JSON.stringify(evidence, null, 2), evidenceHash = await sha(json), key = `v7/material-production/${job.run_id}/sequence/${proof.id}-evidence.json`;
  await env.BUCKET.put(key, json, { httpMetadata: { contentType: "application/json" }, customMetadata: { contentHash: evidenceHash, proofId: clean(proof.id) } });
  if (!(await env.BUCKET.head(key))) throw new Error("SEQUENCE_EVIDENCE_READ_BACK_FAILED");
  const drive = await storeDriveJsonArtifact({ folderPath: ["Channels", "Hidden Systems", "Projects", "V7 Greenfield Pilot", "Material Production", "Sequence Proof"], fileName: `${proof.id}-evidence.json`, content: json, artifactId: `${proof.id}-EVIDENCE`, contentHash: evidenceHash });
  const now = new Date().toISOString();
  await db.batch([
    db.prepare("INSERT INTO v7_media_evidence (id,program_id,run_id,authorization_id,brief_id,job_id,evidence_type,status,content_json,content_hash,runtime_key,drive_file_id,created_at) VALUES (?,?,?,?,?,?,'SEQUENCE_PROOF','TECHNICALLY_VERIFIED',?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status='TECHNICALLY_VERIFIED',content_json=excluded.content_json,content_hash=excluded.content_hash,runtime_key=excluded.runtime_key,drive_file_id=excluded.drive_file_id").bind(`${proof.id}-EVIDENCE`, PROGRAM_ID, job.run_id, job.authorization_id, "SEQUENCE-10MP", jobId, json, evidenceHash, key, drive.id, now),
    db.prepare("UPDATE v7_sequence_proofs SET status='QA_REQUIRED',sequence_file_id=?,evidence_id=?,content_hash=?,updated_at=? WHERE id=?").bind(sequenceFileId, `${proof.id}-EVIDENCE`, evidenceHash, now, proof.id),
    db.prepare("UPDATE v7_media_jobs SET status='COMPLETE',output_json=?,error=NULL,completed_at=?,updated_at=?,lease_token_hash=NULL,lease_expires_at=NULL WHERE id=?").bind(JSON.stringify({ proofId: proof.id, evidenceId: `${proof.id}-EVIDENCE`, sequenceFileId, frameFileIds: storedFrames.map((frame) => frame.fileId) }), now, now, jobId),
    db.prepare("UPDATE v7_stage_states SET status='SEQUENCE_QA_REQUIRED',blocker='SEQUENCE_PERCEPTUAL_QA_REQUIRED',evidence_summary='30-second WebM stored · 10/10 unit samples verified · sequence QA required · scale locked',updated_at=? WHERE id=?").bind(now, STAGE_ID),
  ]);
  return Response.json({ status: "COMPLETE", proofId: proof.id, evidenceId: `${proof.id}-EVIDENCE`, sequenceFileId, frameFileIds: storedFrames.map((frame) => frame.fileId) });
}

async function completeMotionProof({ env, db, body }: AuthorizedMaterialExecutorCommand) {
  if (!env.BUCKET) throw new Error("R2_MATERIAL_STORAGE_REQUIRED");
  const jobId = clean(body.jobId), job = await db.prepare("SELECT * FROM v7_media_jobs WHERE id=? AND status='LEASED' AND job_type='MOTION_PROOF_RENDER'").bind(jobId).first<Row>();
  if (!job) throw new MaterialExecutorError("MEDIA_JOB_LEASE_INVALID", 409);
  const contract = rec(JSON.parse(String(job.contract_json))), proof = await db.prepare("SELECT * FROM v7_motion_proofs WHERE id=?").bind(contract.proofId).first<Row>(), brief = await db.prepare("SELECT * FROM v7_material_briefs WHERE id=?").bind(job.brief_id).first<Row>(), authorization = await db.prepare("SELECT * FROM v7_material_authorizations WHERE id=?").bind(job.authorization_id).first<Row>();
  if (!proof || !brief || !authorization || proof.champion !== "C") throw new Error("MOTION_PROOF_LINEAGE_MISSING");
  const expectedSources = arr(contract.sources).map(rec), returnedHashes = arr(body.sourceHashes).map(rec);
  if (expectedSources.length !== 3 || returnedHashes.length !== 3 || !expectedSources.every((source) => returnedHashes.some((item) => clean(item.fileId) === clean(source.fileId) && clean(item.sha256) === clean(source.sha256)))) throw new Error("MOTION_SOURCE_HASH_MISMATCH");
  const render = rec(body.render), videoBytes = decodeBase64(clean(render.base64)), durationSeconds = Number(render.durationSeconds), fps = Number(render.fps);
  if (clean(render.mimeType) !== "video/webm" || !validWebm(videoBytes) || videoBytes.byteLength < 40_000 || videoBytes.byteLength > 12_000_000) throw new Error("MOTION_RENDER_INVALID");
  if (Number(render.width) !== Number(rec(contract.output).width) || Number(render.height) !== Number(rec(contract.output).height) || Math.abs(durationSeconds - Number(contract.durationSeconds)) > Number(rec(contract.acceptance).durationToleranceSeconds || 0.08) || Math.abs(fps - Number(contract.fps)) > 0.2) throw new Error("MOTION_RENDER_CONTRACT_MISMATCH");
  const frames = arr(body.frames).map(rec), roles = ["ENTRY", "MIDPOINT", "EXIT"];
  if (frames.length !== 3 || !roles.every((role) => frames.filter((frame) => clean(frame.role) === role).length === 1)) throw new Error("MOTION_SAMPLE_SET_INVALID");
  const motionFileId = await storeMaterial(env, db, authorization, brief, { role: "MOTION_PROOF", identity: clean(proof.id).split("-MOTION-").at(-1), bytes: videoBytes, mimeType: "video/webm", extension: "webm", sourceType: MOTION_RENDERER_VERSION, provider: "FRAMEFLOW_EXECUTOR", providerAssetId: clean(proof.id), sourceUrl: clean(proof.id), landingUrl: clean(proof.id), licenseCode: "CHANNEL_OWNED", width: Number(render.width), height: Number(render.height), duration: durationSeconds });
  const storedFrames: Array<{ role: string; timestampSeconds: number; fileId: string; sha256: string }> = [];
  for (const frame of frames) {
    const role = clean(frame.role), bytes = decodeBase64(clean(frame.base64)), mimeType = clean(frame.mimeType);
    if (Number(frame.width) !== 960 || Number(frame.height) !== 540 || !validImage(bytes, mimeType) || bytes.byteLength < 20_000 || bytes.byteLength > 2_500_000) throw new Error(`MOTION_SAMPLE_INVALID · ${role}`);
    const fileId = await storeMaterial(env, db, authorization, brief, { role: `MOTION_${role}` as MaterialRole, identity: clean(proof.id).split("-MOTION-").at(-1), bytes, mimeType, extension: mimeType === "image/png" ? "png" : "jpg", sourceType: `${MOTION_RENDERER_VERSION}_SAMPLE`, provider: "FRAMEFLOW_EXECUTOR", providerAssetId: motionFileId, sourceUrl: motionFileId, landingUrl: clean(proof.id), licenseCode: "CHANNEL_OWNED", width: 960, height: 540, duration: Number(frame.timestampSeconds) });
    storedFrames.push({ role, timestampSeconds: Number(frame.timestampSeconds), fileId, sha256: await shaBytes(bytes) });
  }
  const evidence = { version: "MOTION_PROOF_EVIDENCE_V1", proofId: proof.id, jobId, champion: "C", compositeRubric: proof.composite_rubric, renderer: proof.renderer_version, motionFileId, render: { mimeType: "video/webm", codec: clean(render.codec), width: Number(render.width), height: Number(render.height), durationSeconds, fps, audio: "NONE", sha256: await shaBytes(videoBytes) }, sourceHashes: returnedHashes, frames: storedFrames, completedAt: new Date().toISOString() };
  const json = JSON.stringify(evidence, null, 2), evidenceHash = await sha(json), key = `v7/material-production/${job.run_id}/motion/${proof.id}-evidence.json`;
  await env.BUCKET.put(key, json, { httpMetadata: { contentType: "application/json" }, customMetadata: { contentHash: evidenceHash, proofId: clean(proof.id) } });
  if (!(await env.BUCKET.head(key))) throw new Error("MOTION_EVIDENCE_READ_BACK_FAILED");
  const drive = await storeDriveJsonArtifact({ folderPath: ["Channels", "Hidden Systems", "Projects", "V7 Greenfield Pilot", "Material Production", "Motion Proof"], fileName: `${proof.id}-evidence.json`, content: json, artifactId: `${proof.id}-EVIDENCE`, contentHash: evidenceHash });
  const now = new Date().toISOString();
  await db.batch([
    db.prepare("INSERT INTO v7_media_evidence (id,program_id,run_id,authorization_id,brief_id,job_id,evidence_type,status,content_json,content_hash,runtime_key,drive_file_id,created_at) VALUES (?,?,?,?,?,?,'MOTION_PROOF','TECHNICALLY_VERIFIED',?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status='TECHNICALLY_VERIFIED',content_json=excluded.content_json,content_hash=excluded.content_hash,runtime_key=excluded.runtime_key,drive_file_id=excluded.drive_file_id").bind(`${proof.id}-EVIDENCE`, PROGRAM_ID, job.run_id, job.authorization_id, job.brief_id, jobId, json, evidenceHash, key, drive.id, now),
    db.prepare("UPDATE v7_motion_proofs SET status='QA_REQUIRED',motion_file_id=?,evidence_id=?,content_hash=?,updated_at=? WHERE id=?").bind(motionFileId, `${proof.id}-EVIDENCE`, evidenceHash, now, proof.id),
    db.prepare("UPDATE v7_media_jobs SET status='COMPLETE',output_json=?,error=NULL,completed_at=?,updated_at=?,lease_token_hash=NULL,lease_expires_at=NULL WHERE id=?").bind(JSON.stringify({ proofId: proof.id, evidenceId: `${proof.id}-EVIDENCE`, motionFileId, frameFileIds: storedFrames.map((frame) => frame.fileId) }), now, now, jobId),
    db.prepare("UPDATE v7_stage_states SET status='MOTION_QA_REQUIRED',blocker='MOTION_PERCEPTUAL_QA_REQUIRED',evidence_summary=?,updated_at=? WHERE id=?").bind(`Champion C WebM stored and sampled · ${durationSeconds.toFixed(2)}s · ${fps.toFixed(2)}fps · motion QA required`, now, STAGE_ID),
  ]);
  return Response.json({ status: "COMPLETE", proofId: proof.id, evidenceId: `${proof.id}-EVIDENCE`, motionFileId, frameFileIds: storedFrames.map((frame) => frame.fileId) });
}

async function failMediaJob({ db, body }: AuthorizedMaterialExecutorCommand) {
  const jobId = clean(body.jobId), job = await db.prepare("SELECT * FROM v7_media_jobs WHERE id=? AND status='LEASED'").bind(jobId).first<Row>();
  if (!job) throw new MaterialExecutorError("MEDIA_JOB_LEASE_INVALID", 409);
  const retry = Number(job.attempt) < Number(job.max_attempts), now = new Date().toISOString();
  await db.prepare("UPDATE v7_media_jobs SET status=?,error=?,lease_owner=NULL,lease_token_hash=NULL,lease_expires_at=NULL,updated_at=? WHERE id=?").bind(retry ? "QUEUED" : "FAILED", short(body.error, 300) || "MEDIA_EXECUTION_FAILED", now, jobId).run();
  return Response.json({ status: retry ? "QUEUED" : "FAILED", jobId, retryRemaining: Math.max(0, Number(job.max_attempts) - Number(job.attempt)) });
}

function domainReceiptReference(body: Row, fallback: string) {
  for (const key of ["evidenceId", "productId", "proofId", "jobId", "executorId"]) {
    const value = clean(body[key]);
    if (value) return `${key}:${value}`;
  }
  return fallback;
}

export async function executeAuthorizedMaterialExecutorCommand(command: AuthorizedMaterialExecutorCommand) {
  await appendWriteCommandAudit(command.db, command.auditIdentity, "AUTHORIZED", command.domainReference);
  try {
    let response: Response;
    if (command.action === "EXECUTOR_HEARTBEAT") response = await executorHeartbeat(command);
    else if (command.action === "CLAIM_MEDIA_JOB") response = await claimMediaJob(command);
    else if (command.action === "CLAIM_MOTION_JOB") response = await claimMotionJobBootstrap(command);
    else if (command.action === "COMPLETE_MEDIA_JOB") response = await completeMediaJob(command);
    else if (command.action === "COMPLETE_MOTION_PROOF") response = await completeMotionProof(command);
    else if (command.action === "COMPLETE_SEQUENCE_PROOF") response = await completeSequenceProof(command);
    else if (command.action === "COMPLETE_SEQUENCE_PRODUCT") response = await completeSequenceProduct(command);
    else if (command.action === "FAIL_MEDIA_JOB") response = await failMediaJob(command);
    else throw new MaterialExecutorError("EXECUTOR_ACTION_FORBIDDEN", 403);
    const payload = rec(await response.clone().json().catch(() => ({})));
    await appendWriteCommandAudit(command.db, command.auditIdentity, response.ok ? "SUCCEEDED" : "FAILED", domainReceiptReference(payload, command.domainReference));
    return response;
  } catch (error) {
    await appendWriteCommandAudit(command.db, command.auditIdentity, "FAILED", command.domainReference);
    throw error;
  }
}
