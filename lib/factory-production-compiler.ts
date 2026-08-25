import { canonicalHash, canonicalStringify } from "@/lib/canonical-json";
import { resolveFactoryProviderRoute, type FactoryProviderRouteDecision, type FactoryProviderWorkRequest } from "@/lib/factory-provider-gateway";
import { FACTORY_RUNTIME_CONTRACT_VERSION, validateCanonicalTimebase, validateShotCoverage, type CanonicalTimebase } from "@/lib/factory-runtime-contracts";
import {
  FactoryRuntimeError,
  submitFactoryRuntimeCommandWithEffects,
  type FactoryRuntimeCommandInput,
  type FactoryRuntimeDB,
  type FactoryRuntimeExecution,
} from "@/lib/factory-runtime-writer";

export const FACTORY_PRODUCTION_COMPILER_VERSION = "FACTORY_PRODUCTION_COMPILER_V1" as const;
export const FACTORY_SCENE_GRAPH_RENDERER_CONTRACT_VERSION = "FACTORY_SCENE_GRAPH_RENDERER_V1" as const;

type Row = Record<string, unknown>;
type VisualJob = "REALITY_ANCHOR" | "MECHANISM_EXPLANATION" | "QUANTITATIVE_PROOF" | "GEOGRAPHIC_PROOF" | "TEMPORAL_PROOF" | "DECISION_PROOF";
type VisualRoute = "SOURCE" | "MAKE" | "HYBRID";

export type FactoryProductionRouteCandidate = {
  route: VisualRoute;
  treatmentFamily: string;
  capabilityKey: string;
  capabilityVersion: string;
  archetype: string;
  expectedOutputSchemaHash: string;
  requiredSettingsHash: string;
  standardVersion: string;
  rightsPolicyVersion: string;
  retentionPolicyVersion: string;
  minimumSampleSize: number;
  minimumFirstPassYield: number;
  payloadBytes: number;
  requestedBindingId?: string | null;
};

export type FactoryProductionSegment = {
  id: string;
  claimId: string;
  startFrame: number;
  endFrameExclusive: number;
  visualJob: VisualJob;
  routeCandidate: FactoryProductionRouteCandidate;
  evidenceHashes: string[];
  datasetHash?: string | null;
  objectContinuityKey?: string | null;
};

export type FactoryProductionCompilationInput = {
  videoId: string;
  version: number;
  channelVisualProfileVersionId: string;
  seriesFormatVersionId: string;
  canonicalTimebaseId: string;
  claimGraphHash: string;
  narrationHash: string;
  segments: FactoryProductionSegment[];
  createdBy: string;
  idempotencyKey: string;
  evidenceHash: string;
};

type PlannedShot = {
  id: string;
  sequence: number;
  segment: FactoryProductionSegment;
  route: VisualRoute;
  treatmentFamily: string;
  inputHash: string;
  contentHash: string;
  workRequestId: string;
  routeDecisionId: string;
  providerWorkRequest: FactoryProviderWorkRequest;
  routeDecision: FactoryProviderRouteDecision;
  contract: Record<string, unknown>;
};

export type FactoryProductionCompilationPlan = {
  outcome: "READY" | "BLOCKED";
  reasons: string[];
  inputHash: string;
  outputHash: string | null;
  blueprintId: string | null;
  sceneGraphId: string | null;
  blueprint: Record<string, unknown> | null;
  sceneGraph: Record<string, unknown> | null;
  shots: PlannedShot[];
  providerRequests: 0;
  spendMicros: 0;
};

const clean = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);
const hashPattern = /^[a-f0-9]{64}$/;
const identityPattern = /^[A-Za-z0-9._:@/-]{3,200}$/;
const json = (value: unknown) => canonicalStringify(value);

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

function arrayOfStrings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function requireIdentity(value: unknown, label: string) {
  const normalized = clean(value);
  if (!identityPattern.test(normalized)) throw new FactoryRuntimeError(`${label}_INVALID`, 400, `${label} is invalid`);
  return normalized;
}

function deterministicId(prefix: string, hash: string, suffix?: number) {
  return `${prefix}-${hash.slice(0, 24)}${suffix ? `-${suffix}` : ""}`;
}

function routeAllowedForJob(job: VisualJob, route: VisualRoute) {
  if (job === "REALITY_ANCHOR") return route === "SOURCE" || route === "HYBRID";
  if (job === "QUANTITATIVE_PROOF" || job === "GEOGRAPHIC_PROOF") return route === "MAKE" || route === "HYBRID";
  return route === "MAKE" || route === "HYBRID";
}

function validateInput(input: FactoryProductionCompilationInput) {
  const reasons: string[] = [];
  for (const [label, value] of [["VIDEO_ID", input.videoId], ["VISUAL_PROFILE_VERSION_ID", input.channelVisualProfileVersionId], ["SERIES_FORMAT_VERSION_ID", input.seriesFormatVersionId], ["CANONICAL_TIMEBASE_ID", input.canonicalTimebaseId], ["CREATED_BY", input.createdBy]] as const) {
    if (!identityPattern.test(clean(value))) reasons.push(`${label}_INVALID`);
  }
  for (const [label, value] of [["CLAIM_GRAPH_HASH", input.claimGraphHash], ["NARRATION_HASH", input.narrationHash], ["EVIDENCE_HASH", input.evidenceHash]] as const) {
    if (!hashPattern.test(clean(value))) reasons.push(`${label}_INVALID`);
  }
  if (!Number.isSafeInteger(input.version) || input.version < 1) reasons.push("BLUEPRINT_VERSION_INVALID");
  if (!/^[A-Za-z0-9._:-]{16,200}$/.test(input.idempotencyKey)) reasons.push("IDEMPOTENCY_KEY_INVALID");
  if (!input.segments.length) reasons.push("NARRATION_SEGMENTS_REQUIRED");
  return reasons;
}

function timebaseFrom(row: Row): CanonicalTimebase {
  return {
    frameRateNumerator: number(row.frame_rate_numerator), frameRateDenominator: number(row.frame_rate_denominator), audioSampleRateHz: number(row.audio_sample_rate_hz),
    totalFrames: number(row.total_frames), totalAudioSamples: number(row.total_audio_samples), roundingPolicy: clean(row.rounding_policy) as CanonicalTimebase["roundingPolicy"],
  };
}

export async function planFactoryProductionCompilation(db: FactoryRuntimeDB, input: FactoryProductionCompilationInput): Promise<FactoryProductionCompilationPlan> {
  const invalid = validateInput(input);
  if (invalid.length) throw new FactoryRuntimeError("PRODUCTION_COMPILATION_INPUT_INVALID", 400, "The production compilation input is invalid", invalid);
  const inputHash = await canonicalHash({ ...input, compilerVersion: FACTORY_PRODUCTION_COMPILER_VERSION });
  const [profileRow, formatRow, timebaseRow] = await Promise.all([
    first(db, "SELECT * FROM factory_channel_visual_profile_versions WHERE id=?", input.channelVisualProfileVersionId),
    first(db, "SELECT * FROM factory_series_format_versions WHERE id=?", input.seriesFormatVersionId),
    first(db, "SELECT * FROM factory_canonical_timebases WHERE id=?", input.canonicalTimebaseId),
  ]);
  const reasons: string[] = [];
  if (!profileRow || clean(profileRow.lifecycle_state) !== "FROZEN") reasons.push("CHANNEL_VISUAL_PROFILE_NOT_FROZEN");
  if (!formatRow || clean(formatRow.lifecycle_state) !== "FROZEN") reasons.push("SERIES_FORMAT_NOT_FROZEN");
  if (!timebaseRow || clean(timebaseRow.video_id) !== input.videoId) reasons.push("CANONICAL_TIMEBASE_NOT_BOUND_TO_VIDEO");
  if (profileRow && formatRow && clean(profileRow.channel_id) !== clean(formatRow.channel_id)) reasons.push("CHANNEL_FORMAT_BINDING_MISMATCH");
  if (reasons.length || !profileRow || !formatRow || !timebaseRow) return { outcome: "BLOCKED", reasons: [...new Set(reasons)].sort(), inputHash, outputHash: null, blueprintId: null, sceneGraphId: null, blueprint: null, sceneGraph: null, shots: [], providerRequests: 0, spendMicros: 0 };

  const profile = parseObject(profileRow.profile_json), format = parseObject(formatRow.format_json), timebase = timebaseFrom(timebaseRow);
  const timebaseValidation = validateCanonicalTimebase(timebase);
  if (!timebaseValidation.valid) reasons.push(...timebaseValidation.reasons);
  const allowedRoutes = new Set(arrayOfStrings(profile.allowedRoutes));
  const allowedTreatments = new Set(arrayOfStrings(profile.allowedTreatmentFamilies));
  const prohibitedPatterns = new Set([...arrayOfStrings(profile.prohibitedPatterns), ...arrayOfStrings(format.prohibitedPatterns)].map((item) => item.toUpperCase()));
  const maxConsecutiveTreatment = Number(profile.maxConsecutiveTreatment ?? 2);
  const sorted = [...input.segments].sort((left, right) => left.startFrame - right.startFrame || left.id.localeCompare(right.id));
  const plannedShots: PlannedShot[] = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const segment = sorted[index], sequence = index + 1, candidate = segment.routeCandidate;
    requireIdentity(segment.id, "NARRATION_SEGMENT_ID"); requireIdentity(segment.claimId, "CLAIM_ID");
    if (!routeAllowedForJob(segment.visualJob, candidate.route)) reasons.push(`VISUAL_ROUTE_JOB_MISMATCH:${segment.id}`);
    if (allowedRoutes.size && !allowedRoutes.has(candidate.route)) reasons.push(`VISUAL_ROUTE_NOT_ALLOWED:${segment.id}`);
    if (allowedTreatments.size && !allowedTreatments.has(candidate.treatmentFamily)) reasons.push(`TREATMENT_NOT_ALLOWED:${segment.id}`);
    if (prohibitedPatterns.has(candidate.treatmentFamily.toUpperCase()) || candidate.treatmentFamily.toUpperCase().includes("SLIDE")) reasons.push(`PROHIBITED_SLIDE_GRAMMAR:${segment.id}`);
    if ((segment.visualJob === "QUANTITATIVE_PROOF" || segment.visualJob === "GEOGRAPHIC_PROOF") && !hashPattern.test(clean(segment.datasetHash))) reasons.push(`VERIFIED_DATASET_HASH_REQUIRED:${segment.id}`);
    if (!segment.evidenceHashes.length || segment.evidenceHashes.some((hash) => !hashPattern.test(hash))) reasons.push(`SHOT_EVIDENCE_HASH_INVALID:${segment.id}`);

    const shotSeed = await canonicalHash({ videoId: input.videoId, version: input.version, sequence, segment });
    const shotId = deterministicId("factory-shot", shotSeed, sequence);
    const providerWorkRequest: FactoryProviderWorkRequest = {
      videoId: input.videoId, shotContractId: shotId, capabilityKey: candidate.capabilityKey, capabilityVersion: candidate.capabilityVersion, archetype: candidate.archetype,
      inputHash: shotSeed, payloadBytes: candidate.payloadBytes, expectedOutputSchemaHash: candidate.expectedOutputSchemaHash, requiredSettingsHash: candidate.requiredSettingsHash,
      standardVersion: candidate.standardVersion, rightsPolicyVersion: candidate.rightsPolicyVersion, retentionPolicyVersion: candidate.retentionPolicyVersion,
      minimumSampleSize: candidate.minimumSampleSize, minimumFirstPassYield: candidate.minimumFirstPassYield, dispatchMode: "ZERO_DISPATCH",
      maxProviderRequests: 0, maxSpendMicros: 0, fallbackAllowed: false, requestedBindingId: candidate.requestedBindingId ?? null,
    };
    const routeDecision = await resolveFactoryProviderRoute(db, providerWorkRequest);
    if (routeDecision.decision !== "PLANNED_ZERO_DISPATCH") reasons.push(...routeDecision.reasons.map((reason) => `${segment.id}:${reason}`));
    const contract = {
      contractVersion: FACTORY_RUNTIME_CONTRACT_VERSION, shotId, sequence, claimId: segment.claimId, narrationSegmentId: segment.id,
      frameRange: { startFrame: segment.startFrame, endFrameExclusive: segment.endFrameExclusive }, visualJob: segment.visualJob,
      route: candidate.route, treatmentFamily: candidate.treatmentFamily, evidenceHashes: [...segment.evidenceHashes].sort(), datasetHash: segment.datasetHash ?? null,
      objectContinuityKey: segment.objectContinuityKey ?? null, providerRouteDecisionHash: routeDecision.decisionHash, providerRequests: 0, spendMicros: 0,
    };
    const contentHash = await canonicalHash(contract);
    plannedShots.push({ id: shotId, sequence, segment, route: candidate.route, treatmentFamily: candidate.treatmentFamily, inputHash: shotSeed, contentHash,
      workRequestId: deterministicId("factory-provider-work", shotSeed), routeDecisionId: deterministicId("factory-provider-route", routeDecision.decisionHash), providerWorkRequest, routeDecision, contract });
  }

  const coverage = validateShotCoverage(plannedShots.map((shot) => ({ id: shot.id, sequence: shot.sequence, startFrame: shot.segment.startFrame, endFrameExclusive: shot.segment.endFrameExclusive })), timebase.totalFrames);
  if (!coverage.valid) reasons.push(...coverage.reasons);
  let consecutive = 0, previous = "";
  for (const shot of plannedShots) {
    consecutive = shot.treatmentFamily === previous ? consecutive + 1 : 1;
    previous = shot.treatmentFamily;
    if (!Number.isSafeInteger(maxConsecutiveTreatment) || maxConsecutiveTreatment < 1 || consecutive > maxConsecutiveTreatment) reasons.push(`TREATMENT_DURATION_POLICY_VIOLATION:${shot.id}`);
  }
  if (reasons.length) return { outcome: "BLOCKED", reasons: [...new Set(reasons)].sort(), inputHash, outputHash: null, blueprintId: null, sceneGraphId: null, blueprint: null, sceneGraph: null, shots: plannedShots, providerRequests: 0, spendMicros: 0 };

  const blueprint = {
    contractVersion: FACTORY_RUNTIME_CONTRACT_VERSION, compilerVersion: FACTORY_PRODUCTION_COMPILER_VERSION, videoId: input.videoId, version: input.version,
    channelVisualProfileVersionId: input.channelVisualProfileVersionId, seriesFormatVersionId: input.seriesFormatVersionId, canonicalTimebaseId: input.canonicalTimebaseId,
    claimGraphHash: input.claimGraphHash, narrationHash: input.narrationHash,
    visualGrammar: { hierarchy: ["REALITY","MECHANISM","PROOF"], sourceMakeHybridExplicit: true, antiSlideGrammar: true },
    shots: plannedShots.map((shot) => shot.contract), providerRequests: 0, spendMicros: 0,
  };
  const blueprintHash = await canonicalHash(blueprint), blueprintId = deterministicId("factory-blueprint", blueprintHash);
  const sceneGraph = {
    contractVersion: FACTORY_SCENE_GRAPH_RENDERER_CONTRACT_VERSION, videoId: input.videoId, blueprintId, canonicalTimebaseId: input.canonicalTimebaseId,
    timebase, nodes: plannedShots.map((shot) => ({ id: `node:${shot.id}`, shotContractId: shot.id, startFrame: shot.segment.startFrame, endFrameExclusive: shot.segment.endFrameExclusive,
      visualJob: shot.segment.visualJob, route: shot.route, treatmentFamily: shot.treatmentFamily, continuityKey: shot.segment.objectContinuityKey ?? null,
      cues: [{ type: "ENTER", frame: shot.segment.startFrame }, { type: "EXIT", frame: shot.segment.endFrameExclusive }] })),
    providerRequests: 0, spendMicros: 0,
  };
  const sceneGraphHash = await canonicalHash(sceneGraph), sceneGraphId = deterministicId("factory-scene-graph", sceneGraphHash);
  const outputHash = await canonicalHash({ blueprintHash, sceneGraphHash, shotContentHashes: plannedShots.map((shot) => shot.contentHash), routeDecisionHashes: plannedShots.map((shot) => shot.routeDecision.decisionHash) });
  return { outcome: "READY", reasons: [], inputHash, outputHash, blueprintId, sceneGraphId, blueprint, sceneGraph, shots: plannedShots, providerRequests: 0, spendMicros: 0 };
}

export async function persistFactoryProductionCompilation(db: FactoryRuntimeDB, input: FactoryProductionCompilationInput, command: FactoryRuntimeCommandInput, execution?: FactoryRuntimeExecution) {
  const existing = await first(db, "SELECT * FROM factory_production_compilation_receipts WHERE idempotency_key=?", input.idempotencyKey);
  if (existing) {
    if (clean(existing.input_hash) !== await canonicalHash({ ...input, compilerVersion: FACTORY_PRODUCTION_COMPILER_VERSION })) throw new FactoryRuntimeError("IDEMPOTENCY_KEY_REUSED", 409, "The compilation idempotency key is bound to another input");
    return { outcome: "IDEMPOTENT_REPLAY" as const, receiptId: clean(existing.id), blueprintId: clean(existing.video_blueprint_id), sceneGraphId: clean(existing.scene_graph_id), outputHash: clean(existing.output_hash), providerRequests: 0, spendMicros: 0 };
  }
  if (command.commandType !== "PRODUCE_ARTIFACT" || command.streamId !== input.videoId) throw new FactoryRuntimeError("COMPILER_RUNTIME_COMMAND_INVALID", 400, "Compilation must use a PRODUCE_ARTIFACT command on the exact video stream");
  if (command.idempotencyKey === input.idempotencyKey) throw new FactoryRuntimeError("COMPILER_IDEMPOTENCY_NAMESPACE_COLLISION", 400, "Compilation and runtime command idempotency keys must be distinct");
  const plan = await planFactoryProductionCompilation(db, input);
  if (plan.outcome !== "READY" || !plan.outputHash || !plan.blueprintId || !plan.sceneGraphId || !plan.blueprint || !plan.sceneGraph) {
    throw new FactoryRuntimeError("PRODUCTION_COMPILATION_BLOCKED", 409, "Production compilation is blocked by an upstream contract or qualification", plan.reasons);
  }
  const blueprintHash = await canonicalHash(plan.blueprint), sceneGraphHash = await canonicalHash(plan.sceneGraph);
  const blueprintArtifactVersionId = deterministicId("factory-artifact-version", blueprintHash), sceneGraphArtifactVersionId = deterministicId("factory-artifact-version", sceneGraphHash);
  const dependencyHash = await canonicalHash({ upstreamArtifactVersionId: blueprintArtifactVersionId, downstreamArtifactVersionId: sceneGraphArtifactVersionId, dependencyType: "COMPILED_FROM" });
  const receiptId = deterministicId("factory-compilation", plan.outputHash), dependencyId = deterministicId("factory-dependency", dependencyHash);

  const result = await submitFactoryRuntimeCommandWithEffects(db, command, (context) => {
    const statements = plan.shots.flatMap((shot) => [
      db.prepare(`INSERT INTO factory_provider_work_requests
        (id,video_id,shot_contract_id,capability_key,capability_version,archetype,input_hash,payload_bytes,expected_output_schema_hash,required_settings_hash,rights_policy_version,retention_policy_version,dispatch_mode,max_provider_requests,max_spend_micros,fallback_allowed,idempotency_key,intent_hash,created_by_command_id)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
        shot.workRequestId, input.videoId, shot.id, shot.providerWorkRequest.capabilityKey, shot.providerWorkRequest.capabilityVersion, shot.providerWorkRequest.archetype, shot.providerWorkRequest.inputHash,
        shot.providerWorkRequest.payloadBytes, shot.providerWorkRequest.expectedOutputSchemaHash, shot.providerWorkRequest.requiredSettingsHash, shot.providerWorkRequest.rightsPolicyVersion,
        shot.providerWorkRequest.retentionPolicyVersion, "ZERO_DISPATCH", 0, 0, 0, `${input.idempotencyKey}:route:${shot.sequence}`, shot.inputHash, context.commandId),
      db.prepare(`INSERT INTO factory_provider_route_decisions
        (id,work_request_id,binding_id,qualification_id,decision,reasons_json,provider_requests,spend_micros,fallback_used,decision_hash,created_by_event_id)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(shot.routeDecisionId, shot.workRequestId, shot.routeDecision.bindingId, shot.routeDecision.qualificationId, shot.routeDecision.decision,
        json(shot.routeDecision.reasons), 0, 0, 0, shot.routeDecision.decisionHash, context.effectEventId),
    ]);
    statements.push(db.prepare(`INSERT INTO factory_video_blueprints
      (id,video_id,version,channel_visual_profile_version_id,series_format_version_id,canonical_timebase_id,claim_graph_hash,narration_hash,blueprint_json,input_hash,content_hash,lifecycle_state,created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,'COMPILED',?)`).bind(plan.blueprintId, input.videoId, input.version, input.channelVisualProfileVersionId, input.seriesFormatVersionId, input.canonicalTimebaseId,
      input.claimGraphHash, input.narrationHash, json(plan.blueprint), plan.inputHash, blueprintHash, input.createdBy));
    for (const shot of plan.shots) statements.push(db.prepare(`INSERT INTO factory_shot_contracts
      (id,video_blueprint_id,canonical_timebase_id,sequence,claim_id,narration_segment_id,start_frame,end_frame_exclusive,visual_job,route,treatment_family,contract_json,input_hash,content_hash,lifecycle_state)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'COMPILED')`).bind(shot.id, plan.blueprintId, input.canonicalTimebaseId, shot.sequence, shot.segment.claimId, shot.segment.id, shot.segment.startFrame,
      shot.segment.endFrameExclusive, shot.segment.visualJob, shot.route, shot.treatmentFamily, json(shot.contract), shot.inputHash, shot.contentHash));
    statements.push(
      db.prepare(`INSERT INTO factory_scene_graphs (id,video_blueprint_id,canonical_timebase_id,version,renderer_contract_version,graph_json,input_snapshot_hash,graph_hash,lifecycle_state)
        VALUES (?,?,?,?,?,?,?,?,'COMPILED')`).bind(plan.sceneGraphId, plan.blueprintId, input.canonicalTimebaseId, 1, FACTORY_SCENE_GRAPH_RENDERER_CONTRACT_VERSION, json(plan.sceneGraph), blueprintHash, sceneGraphHash),
      db.prepare(`INSERT INTO factory_artifact_versions (id,artifact_id,version,artifact_kind,source_entity_type,source_entity_id,content_hash,lineage_json,lifecycle_state)
        VALUES (?,?,1,'VIDEO_BLUEPRINT','VIDEO',?,?,?,'MATERIALIZED')`).bind(blueprintArtifactVersionId, `artifact:${plan.blueprintId}`, input.videoId, blueprintHash, json({ inputHash: plan.inputHash, eventId: context.effectEventId })),
      db.prepare(`INSERT INTO factory_artifact_versions (id,artifact_id,version,artifact_kind,source_entity_type,source_entity_id,content_hash,lineage_json,lifecycle_state)
        VALUES (?,?,1,'SCENE_GRAPH','VIDEO_BLUEPRINT',?,?,?,'MATERIALIZED')`).bind(sceneGraphArtifactVersionId, `artifact:${plan.sceneGraphId}`, plan.blueprintId, sceneGraphHash, json({ parentArtifactVersionId: blueprintArtifactVersionId, eventId: context.effectEventId })),
      db.prepare(`INSERT INTO factory_dependency_bindings (id,upstream_artifact_version_id,downstream_artifact_version_id,dependency_type,binding_hash,created_by_event_id)
        VALUES (?,?,?,'COMPILED_FROM',?,?)`).bind(dependencyId, blueprintArtifactVersionId, sceneGraphArtifactVersionId, dependencyHash, context.effectEventId),
      db.prepare(`INSERT INTO factory_production_compilation_receipts
        (id,video_id,compiler_version,visual_profile_version_id,series_format_version_id,canonical_timebase_id,video_blueprint_id,scene_graph_id,shot_count,provider_route_decision_ids_json,input_hash,output_hash,verification_state,zero_dispatch,provider_requests,spend_micros,command_id,event_id,idempotency_key,evidence_hash)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'PASS',1,0,0,?,?,?,?)`).bind(receiptId, input.videoId, FACTORY_PRODUCTION_COMPILER_VERSION, input.channelVisualProfileVersionId, input.seriesFormatVersionId,
        input.canonicalTimebaseId, plan.blueprintId, plan.sceneGraphId, plan.shots.length, json(plan.shots.map((shot) => shot.routeDecisionId)), plan.inputHash, plan.outputHash,
        context.commandId, context.effectEventId, input.idempotencyKey, input.evidenceHash),
    );
    return statements;
  }, execution);
  if (result.decision !== "ACCEPTED") throw new FactoryRuntimeError("PRODUCTION_COMPILATION_COMMAND_REJECTED", 409, "The canonical writer rejected the production compilation", result.reasons);
  return { outcome: "COMPILED" as const, receiptId, blueprintId: plan.blueprintId, sceneGraphId: plan.sceneGraphId, outputHash: plan.outputHash, shotCount: plan.shots.length, providerRequests: 0, spendMicros: 0, commandId: result.commandId, eventIds: result.eventIds };
}
