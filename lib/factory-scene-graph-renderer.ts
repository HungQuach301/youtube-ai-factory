import { canonicalHash, canonicalStringify, sha256Hex } from "@/lib/canonical-json";
import {
  FACTORY_SCENE_GRAPH_RENDERER_CONTRACT_VERSION,
} from "@/lib/factory-production-compiler";
import {
  FactoryRuntimeError,
  submitFactoryRuntimeCommandWithEffects,
  type FactoryRuntimeCommandInput,
  type FactoryRuntimeDB,
  type FactoryRuntimeExecution,
} from "@/lib/factory-runtime-writer";

export const FACTORY_SCENE_RENDER_TAPE_VERSION = "FACTORY_SCENE_RENDER_TAPE_V1" as const;
export const FACTORY_SCENE_RENDERER_WORKER_VERSION = "FACTORY_SCENE_RENDERER_WORKER_V1" as const;
export const FACTORY_SCENE_RENDER_TAPE_MIME = "application/vnd.youtube-ai-factory.render-tape+json" as const;

type Row = Record<string, unknown>;
type SceneNode = {
  id: string;
  shotContractId: string;
  startFrame: number;
  endFrameExclusive: number;
  visualJob: string;
  route: string;
  treatmentFamily: string;
  continuityKey?: string | null;
  evidenceHashes?: string[];
  datasetHash?: string | null;
  assetArtifactVersionIds?: string[];
};

export type FactoryRenderBucketObject = { arrayBuffer(): Promise<ArrayBuffer> };
export type FactoryRenderBucket = {
  put(key: string, value: Uint8Array, options?: Record<string, unknown>): Promise<unknown>;
  get(key: string): Promise<FactoryRenderBucketObject | null>;
};

export type FactorySceneRenderEnv = { DB: FactoryRuntimeDB; BUCKET: FactoryRenderBucket };

export type FactorySceneRenderInput = {
  videoId: string;
  sceneGraphId: string;
  workerBindingId: string;
  frameStart: number;
  frameEndExclusive: number;
  width: number;
  height: number;
  idempotencyKey: string;
  evidenceHash: string;
};

export type FactorySceneRenderPlan = {
  outcome: "READY" | "BLOCKED";
  reasons: string[];
  inputHash: string;
  renderProgramHash: string | null;
  outputHash: string | null;
  deterministicReplayHash: string | null;
  storageKey: string | null;
  bytes: Uint8Array | null;
  tape: Record<string, unknown> | null;
  sceneGraphArtifactVersionId: string | null;
  providerRequests: 0;
  spendMicros: 0;
};

const clean = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);
const hashPattern = /^[a-f0-9]{64}$/;
const identityPattern = /^[A-Za-z0-9._:@/-]{3,200}$/;
const idempotencyPattern = /^[A-Za-z0-9._:-]{16,200}$/;

async function first(db: FactoryRuntimeDB, query: string, ...values: unknown[]) {
  return db.prepare(query).bind(...values).first<Row>();
}

function parseObject(value: unknown) {
  try {
    const parsed = JSON.parse(clean(value));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function parseNodes(value: unknown): SceneNode[] {
  const nodes = Array.isArray(value) ? value : [];
  return nodes.map((node) => node && typeof node === "object" && !Array.isArray(node) ? node as SceneNode : {} as SceneNode);
}

function deterministicId(prefix: string, hash: string) {
  return `${prefix}-${hash.slice(0, 24)}`;
}

function semanticOpcode(visualJob: string) {
  if (visualJob === "MECHANISM_EXPLANATION") return "RELATION_STATE";
  if (visualJob === "QUANTITATIVE_PROOF") return "DATA_REVEAL";
  if (visualJob === "GEOGRAPHIC_PROOF") return "GEO_STATE";
  if (visualJob === "TEMPORAL_PROOF") return "STATE_TRANSITION";
  if (visualJob === "DECISION_PROOF") return "DECISION_STATE";
  return "REALITY_LAYER";
}

function validateInput(input: FactorySceneRenderInput) {
  const reasons: string[] = [];
  for (const [label, value] of [["VIDEO_ID", input.videoId], ["SCENE_GRAPH_ID", input.sceneGraphId], ["WORKER_BINDING_ID", input.workerBindingId]] as const) {
    if (!identityPattern.test(clean(value))) reasons.push(`${label}_INVALID`);
  }
  if (!idempotencyPattern.test(clean(input.idempotencyKey))) reasons.push("IDEMPOTENCY_KEY_INVALID");
  if (!hashPattern.test(clean(input.evidenceHash))) reasons.push("EVIDENCE_HASH_INVALID");
  if (!Number.isSafeInteger(input.frameStart) || input.frameStart < 0) reasons.push("FRAME_START_INVALID");
  if (!Number.isSafeInteger(input.frameEndExclusive) || input.frameEndExclusive <= input.frameStart) reasons.push("FRAME_END_INVALID");
  if (!Number.isSafeInteger(input.width) || input.width < 320 || input.width > 3840) reasons.push("RENDER_WIDTH_INVALID");
  if (!Number.isSafeInteger(input.height) || input.height < 180 || input.height > 2160) reasons.push("RENDER_HEIGHT_INVALID");
  return reasons;
}

function validateNodes(nodes: SceneNode[], frameStart: number, frameEndExclusive: number) {
  const reasons: string[] = [];
  for (const node of nodes) {
    if (!identityPattern.test(clean(node.id)) || !identityPattern.test(clean(node.shotContractId))) reasons.push("SCENE_NODE_IDENTITY_INVALID");
    if (!Number.isSafeInteger(node.startFrame) || !Number.isSafeInteger(node.endFrameExclusive) || node.endFrameExclusive <= node.startFrame) reasons.push(`SCENE_NODE_RANGE_INVALID:${clean(node.id)}`);
    if (!clean(node.visualJob) || !clean(node.route) || !clean(node.treatmentFamily)) reasons.push(`SCENE_NODE_CONTRACT_INCOMPLETE:${clean(node.id)}`);
    if ((node.route === "SOURCE" || node.route === "HYBRID") && (!Array.isArray(node.assetArtifactVersionIds) || !node.assetArtifactVersionIds.length)) reasons.push(`SOURCE_ASSET_BINDING_REQUIRED:${clean(node.id)}`);
    if ((node.visualJob === "QUANTITATIVE_PROOF" || node.visualJob === "GEOGRAPHIC_PROOF") && !hashPattern.test(clean(node.datasetHash))) reasons.push(`VERIFIED_DATASET_HASH_REQUIRED:${clean(node.id)}`);
  }
  const active = nodes.filter((node) => node.endFrameExclusive > frameStart && node.startFrame < frameEndExclusive);
  if (!active.length) reasons.push("RENDER_RANGE_HAS_NO_SCENE_NODES");
  return [...new Set(reasons)].sort();
}

function buildRenderTape(input: FactorySceneRenderInput, graphHash: string, timebaseId: string, nodes: SceneNode[], worker: Row) {
  const activeNodes = nodes.filter((node) => node.endFrameExclusive > input.frameStart && node.startFrame < input.frameEndExclusive)
    .sort((left, right) => left.startFrame - right.startFrame || clean(left.id).localeCompare(clean(right.id)));
  const frames = [];
  for (let frame = input.frameStart; frame < input.frameEndExclusive; frame += 1) {
    const operations = activeNodes.filter((node) => node.startFrame <= frame && frame < node.endFrameExclusive).map((node) => {
      const duration = node.endFrameExclusive - node.startFrame;
      const progressPpm = duration <= 1 ? 1_000_000 : Math.floor(((frame - node.startFrame) * 1_000_000) / (duration - 1));
      return {
        opcode: semanticOpcode(node.visualJob),
        nodeId: node.id,
        shotContractId: node.shotContractId,
        visualJob: node.visualJob,
        route: node.route,
        treatmentFamily: node.treatmentFamily,
        continuityKey: node.continuityKey ?? null,
        evidenceHashes: [...(node.evidenceHashes ?? [])].sort(),
        datasetHash: node.datasetHash ?? null,
        assetArtifactVersionIds: [...(node.assetArtifactVersionIds ?? [])].sort(),
        progressPpm,
      };
    });
    frames.push({ frame, operations });
  }
  return {
    contractVersion: FACTORY_SCENE_RENDER_TAPE_VERSION,
    rendererContractVersion: FACTORY_SCENE_GRAPH_RENDERER_CONTRACT_VERSION,
    workerVersion: clean(worker.worker_version),
    workerSettingsHash: clean(worker.settings_hash),
    videoId: input.videoId,
    sceneGraphId: input.sceneGraphId,
    graphHash,
    canonicalTimebaseId: timebaseId,
    canvas: { width: input.width, height: input.height, colorSpace: "SRGB_V1", coordinateScalePpm: 1_000_000 },
    frameRange: { startFrame: input.frameStart, endFrameExclusive: input.frameEndExclusive },
    frames,
    providerRequests: 0,
    spendMicros: 0,
  };
}

export async function planFactorySceneGraphRender(db: FactoryRuntimeDB, input: FactorySceneRenderInput, evaluatedAt = new Date().toISOString()): Promise<FactorySceneRenderPlan> {
  const invalid = validateInput(input);
  if (invalid.length) throw new FactoryRuntimeError("SCENE_RENDER_INPUT_INVALID", 400, "The scene render input is invalid", invalid);
  const [graphRow, workerRow] = await Promise.all([
    first(db, `SELECT sg.*,bp.video_id,bp.content_hash blueprint_hash,t.total_frames,
      av.id scene_graph_artifact_version_id,sp.lifecycle_state stale_state
      FROM factory_scene_graphs sg
      JOIN factory_video_blueprints bp ON bp.id=sg.video_blueprint_id
      JOIN factory_canonical_timebases t ON t.id=sg.canonical_timebase_id
      LEFT JOIN factory_artifact_versions av ON av.artifact_id=('artifact:' || sg.id) AND av.artifact_kind='SCENE_GRAPH'
      LEFT JOIN factory_artifact_stale_projections sp ON sp.artifact_version_id=av.id AND sp.lifecycle_state='STALE'
      WHERE sg.id=?`, input.sceneGraphId),
    first(db, `SELECT w.*,b.lifecycle_state binding_state,b.settings_hash binding_settings_hash,
      p.lifecycle_state provider_state,p.health_state provider_health,
      q.binding_id qualification_binding_id,q.lifecycle_state qualification_state,q.settings_hash qualification_settings_hash,q.expires_at qualification_expires_at
      FROM factory_render_worker_bindings w
      JOIN factory_provider_bindings b ON b.id=w.provider_binding_id
      JOIN factory_providers p ON p.id=b.provider_id
      JOIN factory_capability_qualifications q ON q.id=w.qualification_id
      WHERE w.id=?`, input.workerBindingId),
  ]);
  const reasons: string[] = [];
  if (!graphRow) reasons.push("SCENE_GRAPH_NOT_FOUND");
  if (!workerRow) reasons.push("RENDER_WORKER_BINDING_NOT_FOUND");
  const provisionalHash = await canonicalHash({ input, rendererVersion: FACTORY_SCENE_GRAPH_RENDERER_CONTRACT_VERSION });
  if (!graphRow || !workerRow) return { outcome: "BLOCKED", reasons, inputHash: provisionalHash, renderProgramHash: null, outputHash: null, deterministicReplayHash: null, storageKey: null, bytes: null, tape: null, sceneGraphArtifactVersionId: null, providerRequests: 0, spendMicros: 0 };

  if (clean(graphRow.video_id) !== input.videoId) reasons.push("SCENE_GRAPH_VIDEO_MISMATCH");
  if (!new Set(["COMPILED", "FROZEN"]).has(clean(graphRow.lifecycle_state))) reasons.push("SCENE_GRAPH_NOT_RENDERABLE");
  if (clean(graphRow.renderer_contract_version) !== FACTORY_SCENE_GRAPH_RENDERER_CONTRACT_VERSION) reasons.push("SCENE_GRAPH_RENDERER_VERSION_MISMATCH");
  if (clean(graphRow.stale_state) === "STALE") reasons.push("SCENE_GRAPH_DEPENDENCY_STALE");
  if (!clean(graphRow.scene_graph_artifact_version_id)) reasons.push("SCENE_GRAPH_ARTIFACT_VERSION_REQUIRED");
  if (clean(workerRow.lifecycle_state) !== "ACTIVE") reasons.push("RENDER_WORKER_NOT_ACTIVE");
  if (clean(workerRow.binding_state) !== "ACTIVE" || clean(workerRow.provider_state) !== "ACTIVE" || clean(workerRow.provider_health) !== "HEALTHY") reasons.push("RENDER_WORKER_PROVIDER_NOT_ELIGIBLE");
  if (clean(workerRow.qualification_state) !== "QUALIFIED" || clean(workerRow.qualification_binding_id) !== clean(workerRow.provider_binding_id)) reasons.push("RENDER_WORKER_NOT_QUALIFIED");
  if (clean(workerRow.settings_hash) !== clean(workerRow.binding_settings_hash) || clean(workerRow.settings_hash) !== clean(workerRow.qualification_settings_hash)) reasons.push("RENDER_WORKER_SETTINGS_STALE");
  if (clean(workerRow.renderer_version) !== FACTORY_SCENE_GRAPH_RENDERER_CONTRACT_VERSION) reasons.push("RENDER_WORKER_VERSION_MISMATCH");
  if (clean(workerRow.qualification_expires_at) && clean(workerRow.qualification_expires_at) <= evaluatedAt) reasons.push("RENDER_WORKER_QUALIFICATION_EXPIRED");
  if (input.frameEndExclusive > number(graphRow.total_frames)) reasons.push("RENDER_RANGE_EXCEEDS_TIMEBASE");
  if (input.frameEndExclusive - input.frameStart > number(workerRow.max_frames_per_job)) reasons.push("RENDER_RANGE_EXCEEDS_WORKER_LIMIT");

  const graph = parseObject(graphRow.graph_json), graphHash = await canonicalHash(graph);
  if (graphHash !== clean(graphRow.graph_hash)) reasons.push("SCENE_GRAPH_HASH_MISMATCH");
  if (clean(graphRow.input_snapshot_hash) !== clean(graphRow.blueprint_hash)) reasons.push("SCENE_GRAPH_INPUT_SNAPSHOT_STALE");
  const nodes = parseNodes(graph.nodes);
  reasons.push(...validateNodes(nodes, input.frameStart, input.frameEndExclusive));
  const inputHash = await canonicalHash({ input, graphHash, workerBindingId: input.workerBindingId, workerVersion: workerRow.worker_version, settingsHash: workerRow.settings_hash, rendererVersion: FACTORY_SCENE_GRAPH_RENDERER_CONTRACT_VERSION });
  if (reasons.length) return { outcome: "BLOCKED", reasons: [...new Set(reasons)].sort(), inputHash, renderProgramHash: null, outputHash: null, deterministicReplayHash: null, storageKey: null, bytes: null, tape: null, sceneGraphArtifactVersionId: clean(graphRow.scene_graph_artifact_version_id) || null, providerRequests: 0, spendMicros: 0 };

  const renderProgramHash = await canonicalHash({ graphHash, nodes, frameRange: { startFrame: input.frameStart, endFrameExclusive: input.frameEndExclusive }, canvas: { width: input.width, height: input.height }, workerVersion: workerRow.worker_version, settingsHash: workerRow.settings_hash });
  const tape = buildRenderTape(input, graphHash, clean(graphRow.canonical_timebase_id), nodes, workerRow);
  const replayTape = buildRenderTape(input, graphHash, clean(graphRow.canonical_timebase_id), nodes, workerRow);
  const canonical = canonicalStringify(tape), replayCanonical = canonicalStringify(replayTape);
  const bytes = new TextEncoder().encode(canonical);
  const [outputHash, deterministicReplayHash] = await Promise.all([sha256Hex(bytes), sha256Hex(replayCanonical)]);
  if (outputHash !== deterministicReplayHash) throw new FactoryRuntimeError("SCENE_RENDER_NONDETERMINISTIC", 500, "Independent render passes produced different exact bytes");
  return {
    outcome: "READY", reasons: [], inputHash, renderProgramHash, outputHash, deterministicReplayHash,
    storageKey: `factory/scene-render-tapes/${input.videoId}/${outputHash}.json`, bytes, tape,
    sceneGraphArtifactVersionId: clean(graphRow.scene_graph_artifact_version_id), providerRequests: 0, spendMicros: 0,
  };
}

async function assertFencePreflight(db: FactoryRuntimeDB, command: FactoryRuntimeCommandInput, evaluatedAt: string) {
  const [stream, lease] = await Promise.all([
    first(db, "SELECT * FROM factory_runtime_streams WHERE stream_type=? AND stream_id=?", command.streamType, command.streamId),
    first(db, "SELECT * FROM factory_runtime_leases WHERE id=? AND stream_type=? AND stream_id=?", command.leaseId, command.streamType, command.streamId),
  ]);
  const reasons: string[] = [];
  if (!stream) reasons.push("RUNTIME_STREAM_NOT_FOUND");
  if (!lease) reasons.push("LEASE_NOT_FOUND");
  if (stream && (number(stream.current_version) !== command.expectedVersion || clean(stream.current_state) !== command.expectedState)) reasons.push("EXPECTED_STREAM_STATE_OR_VERSION_MISMATCH");
  if (stream && (clean(stream.active_lease_id) !== command.leaseId || number(stream.active_fencing_token) !== command.fencingToken)) reasons.push("STREAM_FENCING_MISMATCH");
  if (lease && (clean(lease.lifecycle_state) !== "ACTIVE" || number(lease.fencing_token) !== command.fencingToken || clean(lease.expires_at) <= evaluatedAt)) reasons.push("LEASE_STALE_OR_EXPIRED");
  if (reasons.length) throw new FactoryRuntimeError("RENDER_WORKER_FENCE_PRECHECK_FAILED", 409, "The render worker lease or fence is stale", reasons);
}

export async function materializeFactorySceneGraphRender(env: FactorySceneRenderEnv, input: FactorySceneRenderInput, command: FactoryRuntimeCommandInput, execution?: FactoryRuntimeExecution) {
  if (command.commandType !== "PRODUCE_ARTIFACT" || command.streamType !== "VIDEO" || command.streamId !== input.videoId) {
    throw new FactoryRuntimeError("SCENE_RENDER_RUNTIME_COMMAND_INVALID", 400, "Rendering requires PRODUCE_ARTIFACT on the exact video stream");
  }
  if (command.idempotencyKey === input.idempotencyKey) throw new FactoryRuntimeError("SCENE_RENDER_IDEMPOTENCY_NAMESPACE_COLLISION", 400, "Render and command idempotency keys must be distinct");
  const evaluatedAt = (execution?.now?.() ?? new Date()).toISOString();
  const plan = await planFactorySceneGraphRender(env.DB, input, evaluatedAt);
  if (plan.outcome !== "READY" || !plan.outputHash || !plan.renderProgramHash || !plan.deterministicReplayHash || !plan.storageKey || !plan.bytes || !plan.sceneGraphArtifactVersionId) {
    throw new FactoryRuntimeError("SCENE_RENDER_BLOCKED", 409, "Scene Graph rendering is blocked by an upstream contract, qualification or asset dependency", plan.reasons);
  }
  const existing = await first(env.DB, `SELECT j.*,r.storage_key,r.readback_hash,r.byte_size,r.artifact_version_id
    FROM factory_scene_render_jobs j JOIN factory_scene_render_receipts r ON r.render_job_id=j.id WHERE j.idempotency_key=?`, input.idempotencyKey);
  if (existing) {
    if (clean(existing.input_hash) !== plan.inputHash || clean(existing.output_hash) !== plan.outputHash) throw new FactoryRuntimeError("IDEMPOTENCY_KEY_REUSED", 409, "The render idempotency key is bound to another input");
    const object = await env.BUCKET.get(clean(existing.storage_key));
    if (!object) throw new FactoryRuntimeError("SCENE_RENDER_REPLAY_BYTES_MISSING", 503, "The exact prior render tape is missing from active storage");
    const bytes = new Uint8Array(await object.arrayBuffer()), readbackHash = await sha256Hex(bytes);
    if (readbackHash !== clean(existing.readback_hash) || bytes.byteLength !== number(existing.byte_size)) throw new FactoryRuntimeError("SCENE_RENDER_REPLAY_BYTES_MISMATCH", 503, "The exact prior render tape failed read-back verification");
    return { outcome: "IDEMPOTENT_REPLAY" as const, renderJobId: clean(existing.id), artifactVersionId: clean(existing.artifact_version_id), outputHash: plan.outputHash, storageKey: clean(existing.storage_key), providerRequests: 0, spendMicros: 0 };
  }

  await assertFencePreflight(env.DB, command, evaluatedAt);
  await env.BUCKET.put(plan.storageKey, plan.bytes, {
    httpMetadata: { contentType: FACTORY_SCENE_RENDER_TAPE_MIME },
    customMetadata: { sha256: plan.outputHash, rendererVersion: FACTORY_SCENE_GRAPH_RENDERER_CONTRACT_VERSION, sceneGraphId: input.sceneGraphId, workerBindingId: input.workerBindingId },
  });
  const stored = await env.BUCKET.get(plan.storageKey);
  if (!stored) throw new FactoryRuntimeError("SCENE_RENDER_R2_READBACK_FAILED", 503, "The exact render tape could not be read back from active storage");
  const readbackBytes = new Uint8Array(await stored.arrayBuffer()), readbackHash = await sha256Hex(readbackBytes);
  if (readbackHash !== plan.outputHash || readbackBytes.byteLength !== plan.bytes.byteLength) throw new FactoryRuntimeError("SCENE_RENDER_R2_HASH_MISMATCH", 503, "The stored render tape differs from the deterministic output");

  const renderJobId = deterministicId("factory-render-job", plan.inputHash);
  const artifactVersionId = deterministicId("factory-artifact-version", plan.outputHash);
  const receiptId = deterministicId("factory-render-receipt", plan.outputHash);
  const dependencyHash = await canonicalHash({ upstreamArtifactVersionId: plan.sceneGraphArtifactVersionId, downstreamArtifactVersionId: artifactVersionId, dependencyType: "RENDERED_FROM" });
  const dependencyId = deterministicId("factory-dependency", dependencyHash);
  const result = await submitFactoryRuntimeCommandWithEffects(env.DB, command, (context) => [
    env.DB.prepare(`INSERT INTO factory_artifact_versions
      (id,artifact_id,version,artifact_kind,source_entity_type,source_entity_id,content_hash,storage_key,mime_type,byte_size,lineage_json,lifecycle_state)
      VALUES (?,?,1,'SCENE_RENDER_TAPE','SCENE_GRAPH',?,?,?,?,?,?,'MATERIALIZED')`).bind(
      artifactVersionId, `artifact:${renderJobId}`, input.sceneGraphId, plan.outputHash, plan.storageKey, FACTORY_SCENE_RENDER_TAPE_MIME, plan.bytes!.byteLength,
      canonicalStringify({ sceneGraphArtifactVersionId: plan.sceneGraphArtifactVersionId, renderProgramHash: plan.renderProgramHash, workerBindingId: input.workerBindingId, eventId: context.effectEventId })),
    env.DB.prepare(`INSERT INTO factory_dependency_bindings
      (id,upstream_artifact_version_id,downstream_artifact_version_id,dependency_type,binding_hash,created_by_event_id)
      VALUES (?,?,?,'RENDERED_FROM',?,?)`).bind(dependencyId, plan.sceneGraphArtifactVersionId, artifactVersionId, dependencyHash, context.effectEventId),
    env.DB.prepare(`INSERT INTO factory_scene_render_jobs
      (id,video_id,scene_graph_id,worker_binding_id,lease_id,fencing_token,frame_start,frame_end_exclusive,input_hash,render_program_hash,output_hash,idempotency_key,lifecycle_state,provider_requests,spend_micros,command_id,event_id)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'MATERIALIZED',0,0,?,?)`).bind(
      renderJobId, input.videoId, input.sceneGraphId, input.workerBindingId, command.leaseId, command.fencingToken, input.frameStart, input.frameEndExclusive,
      plan.inputHash, plan.renderProgramHash, plan.outputHash, input.idempotencyKey, context.commandId, context.effectEventId),
    env.DB.prepare(`INSERT INTO factory_scene_render_receipts
      (id,render_job_id,artifact_version_id,renderer_version,storage_key,mime_type,byte_size,output_hash,readback_hash,deterministic_replay_hash,verification_state,zero_dispatch,provider_requests,spend_micros,evidence_hash)
      VALUES (?,?,?,?,?,?,?,?,?,?,'PASS',1,0,0,?)`).bind(
      receiptId, renderJobId, artifactVersionId, FACTORY_SCENE_GRAPH_RENDERER_CONTRACT_VERSION, plan.storageKey, FACTORY_SCENE_RENDER_TAPE_MIME,
      plan.bytes!.byteLength, plan.outputHash, readbackHash, plan.deterministicReplayHash, input.evidenceHash),
  ], execution);
  if (result.decision !== "ACCEPTED") throw new FactoryRuntimeError("SCENE_RENDER_COMMAND_REJECTED", 409, "The canonical writer rejected the rendered artifact", result.reasons);
  return { outcome: "MATERIALIZED" as const, renderJobId, receiptId, artifactVersionId, outputHash: plan.outputHash, storageKey: plan.storageKey, byteSize: plan.bytes.byteLength, providerRequests: 0, spendMicros: 0, commandId: result.commandId, eventIds: result.eventIds };
}
