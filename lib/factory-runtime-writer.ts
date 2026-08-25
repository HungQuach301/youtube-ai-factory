import { canonicalHash, canonicalStringify } from "@/lib/canonical-json";
import {
  FACTORY_RUNTIME_CONTRACT_VERSION,
  assertFactoryRuntimeCommand,
  replayFactoryRuntimeEvents,
  resolveStaleDependencies,
  type FactoryRuntimeCommandType,
  type FactoryRuntimeEventType,
} from "@/lib/factory-runtime-contracts";

export const FACTORY_RUNTIME_WRITER_VERSION = "FACTORY_RUNTIME_WRITER_V1" as const;
export const FACTORY_RUNTIME_REPLAY_VERSION = "FACTORY_RUNTIME_REPLAY_V1" as const;

type Row = Record<string, unknown>;
type RunResult = { success?: boolean; meta?: { changes?: number } };
export type FactoryRuntimeStatement = {
  bind(...values: unknown[]): FactoryRuntimeStatement;
  all<T = Row>(): Promise<{ results?: T[] }>;
  first<T = Row>(): Promise<T | null>;
  run(): Promise<RunResult>;
};

export type FactoryRuntimeDB = {
  prepare(query: string): FactoryRuntimeStatement;
  batch(statements: FactoryRuntimeStatement[]): Promise<RunResult[]>;
};

export type FactoryRuntimeExecution = {
  now?: () => Date;
  id?: (prefix: string) => string;
};

export type FactoryRuntimeActorType = "OWNER" | "OPERATOR" | "SYSTEM" | "ASSURANCE";

export type FactoryRuntimeCommandInput = {
  streamType: string;
  streamId: string;
  commandType: FactoryRuntimeCommandType;
  expectedState: string;
  expectedVersion: number;
  actorType: FactoryRuntimeActorType;
  actorId: string;
  leaseId: string;
  fencingToken: number;
  idempotencyKey: string;
  intentHash: string;
  policyVersions: Record<string, string>;
  costScope: Record<string, unknown>;
  rightsScope: Record<string, unknown>;
  payload: Record<string, unknown>;
  evidenceHash: string;
  correlationId?: string;
  causationId?: string | null;
};

export type FactoryRuntimeEffectContext = {
  commandId: string;
  acceptedEventId: string;
  effectEventId: string;
  occurredAt: string;
  finalVersion: number;
  evidenceHash: string;
};

export type FactoryRuntimeEffectBuilder = (context: FactoryRuntimeEffectContext) => FactoryRuntimeStatement[];

export class FactoryRuntimeError extends Error {
  constructor(public readonly code: string, public readonly status: number, message: string, public readonly reasons: string[] = []) {
    super(message);
    this.name = "FactoryRuntimeError";
  }
}

const clean = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);
const json = (value: unknown) => canonicalStringify(value);
const parse = <T>(value: unknown, fallback: T): T => { try { return JSON.parse(clean(value)) as T; } catch { return fallback; } };
const timestamp = (execution?: FactoryRuntimeExecution) => (execution?.now?.() ?? new Date()).toISOString();
const identifier = (prefix: string, execution?: FactoryRuntimeExecution) => execution?.id?.(prefix) ?? `${prefix}-${crypto.randomUUID()}`;
const changes = (result: RunResult | undefined) => Number(result?.meta?.changes ?? 0);
const hashPattern = /^[a-f0-9]{64}$/;
const idPattern = /^[A-Za-z0-9._:@/-]{3,200}$/;
const idempotencyPattern = /^[A-Za-z0-9._:-]{16,200}$/;

async function first(db: FactoryRuntimeDB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values).first<Row>(); }
async function rows(db: FactoryRuntimeDB, query: string, ...values: unknown[]) { return (await db.prepare(query).bind(...values).all<Row>()).results ?? []; }

function requireIdentity(value: unknown, label: string) {
  const result = clean(value);
  if (!idPattern.test(result)) throw new FactoryRuntimeError(`${label}_INVALID`, 400, `${label} is invalid`);
  return result;
}

function requireIdempotency(value: unknown) {
  const result = clean(value);
  if (!idempotencyPattern.test(result)) throw new FactoryRuntimeError("IDEMPOTENCY_KEY_INVALID", 400, "A 16-200 character idempotency key is required");
  return result;
}

function requireHash(value: unknown, label: string) {
  const result = clean(value);
  if (!hashPattern.test(result)) throw new FactoryRuntimeError(`${label}_INVALID`, 400, `${label} must be a lowercase SHA-256 value`);
  return result;
}

function eventActorType(actorType: FactoryRuntimeActorType) {
  return actorType === "ASSURANCE" ? "JUDGE" : actorType;
}

function effectEvent(commandType: FactoryRuntimeCommandType): FactoryRuntimeEventType | null {
  if (commandType === "PRODUCE_ARTIFACT") return "ArtifactMaterialized";
  if (commandType === "VERIFY_ARTIFACT") return "ArtifactVerified";
  if (commandType === "FREEZE_STAGE") return "StageFrozen";
  if (commandType === "REOPEN_ROOT_STAGE") return "DependencyStale";
  return null;
}

function projectionCore(input: { streamType: string; streamId: string; currentVersion: number; currentState: string; headEventId: string | null; headEvidenceHash: string | null }) {
  return {
    contractVersion: FACTORY_RUNTIME_CONTRACT_VERSION,
    streamType: input.streamType,
    streamId: input.streamId,
    currentVersion: input.currentVersion,
    currentState: input.currentState,
    headEventId: input.headEventId,
    headEvidenceHash: input.headEvidenceHash,
  };
}

async function projectionCheckpointStatement(db: FactoryRuntimeDB, input: {
  streamType: string; streamId: string; streamVersion: number; state: string; headEventId: string; headEvidenceHash: string;
}, execution?: FactoryRuntimeExecution) {
  const projection = projectionCore({ ...input, currentVersion: input.streamVersion, currentState: input.state });
  const projectionJson = json(projection), projectionHash = await canonicalHash(projection);
  return db.prepare(`INSERT INTO factory_runtime_projection_checkpoints
    (id,stream_type,stream_id,stream_version,state,head_event_id,head_evidence_hash,projection_json,projection_hash)
    VALUES (?,?,?,?,?,?,?,?,?)`).bind(identifier("factory-projection", execution), input.streamType, input.streamId, input.streamVersion, input.state, input.headEventId, input.headEvidenceHash, projectionJson, projectionHash);
}

function eventStatement(db: FactoryRuntimeDB, input: {
  id: string; streamType: string; streamId: string; streamVersion: number; eventType: FactoryRuntimeEventType; actorType: string; actorId: string;
  commandId?: string | null; causationId?: string | null; correlationId: string; leaseId?: string | null; fencingToken?: number | null;
  idempotencyKey: string; intentHash: string; payload: Record<string, unknown>; evidenceHash: string; occurredAt: string;
}) {
  return db.prepare(`INSERT INTO factory_runtime_events
    (id,stream_type,stream_id,stream_version,event_type,actor_type,actor_id,command_id,causation_id,correlation_id,lease_id,fencing_token,idempotency_key,intent_hash,payload_json,evidence_hash,occurred_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
    input.id, input.streamType, input.streamId, input.streamVersion, input.eventType, input.actorType, input.actorId, input.commandId ?? null, input.causationId ?? null,
    input.correlationId, input.leaseId ?? null, input.fencingToken ?? null, input.idempotencyKey, input.intentHash, json(input.payload), input.evidenceHash, input.occurredAt,
  );
}

function commandStatement(db: FactoryRuntimeDB, commandId: string, input: FactoryRuntimeCommandInput, receivedAt: string) {
  return db.prepare(`INSERT INTO factory_runtime_commands
    (id,stream_type,stream_id,command_type,expected_state,expected_version,actor_type,actor_id,lease_id,fencing_token,idempotency_key,intent_hash,policy_versions_json,cost_scope_json,rights_scope_json,received_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
    commandId, input.streamType, input.streamId, input.commandType, input.expectedState, input.expectedVersion, input.actorType, input.actorId, input.leaseId, input.fencingToken,
    input.idempotencyKey, input.intentHash, json(input.policyVersions), json(input.costScope), json(input.rightsScope), receivedAt,
  );
}

async function commandReplay(db: FactoryRuntimeDB, idempotencyKey: string, intentHash: string) {
  const command = await first(db, "SELECT * FROM factory_runtime_commands WHERE idempotency_key=? LIMIT 1", idempotencyKey);
  if (!command) return null;
  if (clean(command.intent_hash) !== intentHash) throw new FactoryRuntimeError("IDEMPOTENCY_KEY_REUSED", 409, "The idempotency key is bound to another command intent");
  const events = await rows(db, "SELECT * FROM factory_runtime_events WHERE command_id=? ORDER BY stream_version", command.id);
  const rejected = events.find((event) => clean(event.event_type) === "CommandRejected");
  const rejectionPayload = parse<{ reasons?: string[] }>(rejected?.payload_json, {});
  return {
    outcome: "IDEMPOTENT_REPLAY" as const,
    decision: rejected ? "REJECTED" as const : "ACCEPTED" as const,
    commandId: clean(command.id),
    streamType: clean(command.stream_type),
    streamId: clean(command.stream_id),
    streamVersion: Math.max(...events.map((event) => number(event.stream_version)), number(command.expected_version)),
    eventIds: events.map((event) => clean(event.id)),
    reasons: Array.isArray(rejectionPayload.reasons) ? rejectionPayload.reasons.filter((value) => typeof value === "string") : [],
    providerRequests: 0,
    spendUsd: 0,
  };
}

export async function reserveFactoryRuntimeWork(db: FactoryRuntimeDB, input: {
  streamType: string; streamId: string; stageKey: string; expectedState: string; expectedVersion: number; actorType: FactoryRuntimeActorType; actorId: string;
  idempotencyKey: string; intentHash: string; evidenceHash: string; correlationId?: string; leaseDurationMs?: number;
}, execution?: FactoryRuntimeExecution) {
  const streamType = requireIdentity(input.streamType, "STREAM_TYPE"), streamId = requireIdentity(input.streamId, "STREAM_ID"), stageKey = requireIdentity(input.stageKey, "STAGE_KEY");
  const actorId = requireIdentity(input.actorId, "ACTOR_ID"), idempotencyKey = requireIdempotency(input.idempotencyKey), intentHash = requireHash(input.intentHash, "INTENT_HASH"), evidenceHash = requireHash(input.evidenceHash, "EVIDENCE_HASH");
  if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 0) throw new FactoryRuntimeError("EXPECTED_VERSION_INVALID", 400, "expectedVersion must be a non-negative integer");
  const duration = input.leaseDurationMs ?? 15 * 60_000;
  if (!Number.isSafeInteger(duration) || duration < 30_000 || duration > 30 * 60_000) throw new FactoryRuntimeError("LEASE_DURATION_INVALID", 400, "Lease duration must be between 30 seconds and 30 minutes");
  const replay = await first(db, "SELECT * FROM factory_runtime_leases WHERE idempotency_key=? LIMIT 1", idempotencyKey);
  if (replay) {
    if (clean(replay.intent_hash) !== intentHash) throw new FactoryRuntimeError("IDEMPOTENCY_KEY_REUSED", 409, "The lease idempotency key is bound to another intent");
    return { outcome: "IDEMPOTENT_REPLAY" as const, leaseId: clean(replay.id), fencingToken: number(replay.fencing_token), streamVersion: input.expectedVersion + 1, providerRequests: 0, spendUsd: 0 };
  }
  const now = timestamp(execution), expiresAt = new Date(Date.parse(now) + duration).toISOString();
  let stream = await first(db, "SELECT * FROM factory_runtime_streams WHERE stream_type=? AND stream_id=?", streamType, streamId);
  if (stream && (number(stream.current_version) !== input.expectedVersion || clean(stream.current_state) !== input.expectedState)) {
    throw new FactoryRuntimeError("STREAM_EXPECTATION_MISMATCH", 409, "The work reservation expected another stream state or version", [
      `EXPECTED_VERSION:${input.expectedVersion}`, `CURRENT_VERSION:${number(stream.current_version)}`, `EXPECTED_STATE:${input.expectedState}`, `CURRENT_STATE:${clean(stream.current_state)}`,
    ]);
  }
  const scopeId = `${streamType}:${streamId}`;
  const counter = await first(db, `INSERT INTO factory_runtime_fence_counters (scope_id,next_token,updated_at) VALUES (?,1,?)
    ON CONFLICT(scope_id) DO UPDATE SET next_token=next_token+1,updated_at=excluded.updated_at RETURNING next_token`, scopeId, now);
  const fencingToken = number(counter?.next_token);
  if (!Number.isSafeInteger(fencingToken) || fencingToken <= 0) throw new FactoryRuntimeError("FENCING_TOKEN_ISSUE_FAILED", 503, "A monotonic fencing token could not be issued");
  const leaseId = identifier("factory-lease", execution), eventId = identifier("factory-event", execution), correlationId = input.correlationId || leaseId;
  const finalVersion = input.expectedVersion + 1;
  const checkpoint = await projectionCheckpointStatement(db, { streamType, streamId, streamVersion: finalVersion, state: "WorkReserved", headEventId: eventId, headEvidenceHash: evidenceHash }, execution);
  try {
    await db.batch([
      db.prepare(`INSERT INTO factory_runtime_streams (stream_type,stream_id,current_version,current_state,updated_at)
        VALUES (?,?,0,?,?) ON CONFLICT(stream_type,stream_id) DO NOTHING`).bind(streamType, streamId, input.expectedState, now),
      db.prepare(`UPDATE factory_runtime_leases SET lifecycle_state='ORPHANED',orphaned_at=?,released_at=?
        WHERE stream_type=? AND stream_id=? AND lifecycle_state='ACTIVE' AND expires_at<=?`).bind(now, now, streamType, streamId, now),
      db.prepare(`INSERT INTO factory_runtime_leases
        (id,stream_type,stream_id,stage_key,lifecycle_state,owner_type,owner_id,fencing_token,acquired_at,heartbeat_at,expires_at,idempotency_key,intent_hash)
        VALUES (?,?,?,?,'ACTIVE',?,?,?,?,?,?,?,?)`).bind(leaseId, streamType, streamId, stageKey, input.actorType, actorId, fencingToken, now, now, expiresAt, idempotencyKey, intentHash),
      db.prepare(`UPDATE factory_runtime_streams SET active_stage_key=?,active_lease_id=?,active_fencing_token=?,updated_at=?
        WHERE stream_type=? AND stream_id=? AND current_version=? AND current_state=?`).bind(stageKey, leaseId, fencingToken, now, streamType, streamId, input.expectedVersion, input.expectedState),
      eventStatement(db, { id: eventId, streamType, streamId, streamVersion: finalVersion, eventType: "WorkReserved", actorType: eventActorType(input.actorType), actorId, correlationId,
        leaseId, fencingToken, idempotencyKey: `runtime:event:${eventId}`, intentHash, payload: { stageKey, expectedState: input.expectedState, expectedVersion: input.expectedVersion, expiresAt, zeroSpend: true }, evidenceHash, occurredAt: now }),
      checkpoint,
    ]);
  } catch (error) {
    const existing = await first(db, "SELECT * FROM factory_runtime_leases WHERE idempotency_key=? LIMIT 1", idempotencyKey);
    if (existing && clean(existing.intent_hash) === intentHash) return { outcome: "IDEMPOTENT_REPLAY" as const, leaseId: clean(existing.id), fencingToken: number(existing.fencing_token), streamVersion: finalVersion, providerRequests: 0, spendUsd: 0 };
    throw new FactoryRuntimeError("WORK_RESERVATION_CONFLICT", 409, error instanceof Error ? error.message : "Work reservation conflict");
  }
  stream = await first(db, "SELECT * FROM factory_runtime_streams WHERE stream_type=? AND stream_id=?", streamType, streamId);
  if (!stream || number(stream.current_version) !== finalVersion || clean(stream.active_lease_id) !== leaseId) throw new FactoryRuntimeError("WORK_RESERVATION_PROJECTION_FAILED", 503, "The work reservation projection was not committed");
  return { outcome: "RESERVED" as const, leaseId, fencingToken, streamVersion: finalVersion, expiresAt, eventId, providerRequests: 0, spendUsd: 0 };
}

export async function heartbeatFactoryRuntimeLease(db: FactoryRuntimeDB, input: { leaseId: string; fencingToken: number; extensionMs?: number }, execution?: FactoryRuntimeExecution) {
  const leaseId = requireIdentity(input.leaseId, "LEASE_ID"), now = timestamp(execution), extension = input.extensionMs ?? 15 * 60_000;
  if (!Number.isSafeInteger(input.fencingToken) || input.fencingToken <= 0) throw new FactoryRuntimeError("FENCING_TOKEN_INVALID", 400, "A positive fencing token is required");
  if (!Number.isSafeInteger(extension) || extension < 30_000 || extension > 30 * 60_000) throw new FactoryRuntimeError("LEASE_EXTENSION_INVALID", 400, "Lease extension must be between 30 seconds and 30 minutes");
  const expiresAt = new Date(Date.parse(now) + extension).toISOString();
  const result = await db.prepare(`UPDATE factory_runtime_leases SET heartbeat_at=?,expires_at=?
    WHERE id=? AND fencing_token=? AND lifecycle_state='ACTIVE' AND expires_at>? AND EXISTS (
      SELECT 1 FROM factory_runtime_streams s WHERE s.active_lease_id=factory_runtime_leases.id AND s.active_fencing_token=factory_runtime_leases.fencing_token
    )`).bind(now, expiresAt, leaseId, input.fencingToken, now).run();
  if (changes(result) !== 1) throw new FactoryRuntimeError("STALE_OR_INVALID_FENCING_LEASE", 409, "The lease heartbeat was rejected because the writer is stale");
  return { outcome: "HEARTBEAT_RECORDED" as const, leaseId, fencingToken: input.fencingToken, heartbeatAt: now, expiresAt };
}

export async function releaseFactoryRuntimeLease(db: FactoryRuntimeDB, input: { leaseId: string; fencingToken: number }, execution?: FactoryRuntimeExecution) {
  const leaseId = requireIdentity(input.leaseId, "LEASE_ID"), now = timestamp(execution);
  if (!Number.isSafeInteger(input.fencingToken) || input.fencingToken <= 0) throw new FactoryRuntimeError("FENCING_TOKEN_INVALID", 400, "A positive fencing token is required");
  const lease = await first(db, "SELECT * FROM factory_runtime_leases WHERE id=?", leaseId);
  if (!lease || number(lease.fencing_token) !== input.fencingToken) throw new FactoryRuntimeError("STALE_OR_INVALID_FENCING_LEASE", 409, "The lease release was rejected because the writer is stale");
  if (clean(lease.lifecycle_state) === "RELEASED") return { outcome: "IDEMPOTENT_REPLAY" as const, leaseId, fencingToken: input.fencingToken, releasedAt: clean(lease.released_at) };
  if (clean(lease.lifecycle_state) !== "ACTIVE") throw new FactoryRuntimeError("LEASE_NOT_ACTIVE", 409, "Only an active lease can be released cleanly", [clean(lease.lifecycle_state)]);
  const result = await db.batch([
    db.prepare(`UPDATE factory_runtime_leases SET lifecycle_state='RELEASED',released_at=?
      WHERE id=? AND fencing_token=? AND lifecycle_state='ACTIVE'`).bind(now, leaseId, input.fencingToken),
    db.prepare(`UPDATE factory_runtime_streams SET active_stage_key=NULL,active_lease_id=NULL,active_fencing_token=NULL,updated_at=?
      WHERE stream_type=? AND stream_id=? AND active_lease_id=? AND active_fencing_token=?`).bind(now, lease.stream_type, lease.stream_id, leaseId, input.fencingToken),
  ]);
  if (changes(result[0]) !== 1 || changes(result[1]) !== 1) throw new FactoryRuntimeError("LEASE_RELEASE_WRITE_CONFLICT", 409, "The lease release did not win the current fence");
  return { outcome: "RELEASED" as const, leaseId, fencingToken: input.fencingToken, releasedAt: now };
}

async function persistedRejectedCommand(db: FactoryRuntimeDB, input: FactoryRuntimeCommandInput, reasons: string[], execution?: FactoryRuntimeExecution) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const stream = await first(db, "SELECT * FROM factory_runtime_streams WHERE stream_type=? AND stream_id=?", input.streamType, input.streamId);
    if (!stream) throw new FactoryRuntimeError("RUNTIME_STREAM_NOT_FOUND", 404, "The runtime stream does not exist", reasons);
    const now = timestamp(execution), commandId = identifier("factory-command", execution), eventId = identifier("factory-event", execution), nextVersion = number(stream.current_version) + 1;
    const payload = { reasons, expectedState: input.expectedState, expectedVersion: input.expectedVersion, currentState: clean(stream.current_state), currentVersion: number(stream.current_version) };
    const checkpoint = await projectionCheckpointStatement(db, { streamType: input.streamType, streamId: input.streamId, streamVersion: nextVersion, state: clean(stream.current_state), headEventId: eventId, headEvidenceHash: input.evidenceHash }, execution);
    try {
      await db.batch([
        commandStatement(db, commandId, input, now),
        eventStatement(db, { id: eventId, streamType: input.streamType, streamId: input.streamId, streamVersion: nextVersion, eventType: "CommandRejected", actorType: eventActorType(input.actorType), actorId: input.actorId,
          commandId, causationId: input.causationId, correlationId: input.correlationId || commandId, leaseId: input.leaseId, fencingToken: input.fencingToken,
          idempotencyKey: `runtime:event:${eventId}`, intentHash: input.intentHash, payload, evidenceHash: input.evidenceHash, occurredAt: now }),
        checkpoint,
      ]);
      return { outcome: "RECORDED" as const, decision: "REJECTED" as const, commandId, streamType: input.streamType, streamId: input.streamId, streamVersion: nextVersion, eventIds: [eventId], reasons, providerRequests: 0, spendUsd: 0 };
    } catch (error) {
      const replay = await commandReplay(db, input.idempotencyKey, input.intentHash);
      if (replay) return replay;
      if (attempt === 1) throw new FactoryRuntimeError("COMMAND_REJECTION_WRITE_CONFLICT", 409, error instanceof Error ? error.message : "Command rejection write conflict", reasons);
    }
  }
  throw new FactoryRuntimeError("COMMAND_REJECTION_WRITE_CONFLICT", 409, "Command rejection could not be persisted", reasons);
}

async function submitFactoryRuntimeCommandInternal(db: FactoryRuntimeDB, command: FactoryRuntimeCommandInput, execution?: FactoryRuntimeExecution, effectBuilder?: FactoryRuntimeEffectBuilder) {
  const validation = assertFactoryRuntimeCommand(command);
  const evidenceHash = requireHash(command.evidenceHash, "EVIDENCE_HASH");
  requireIdentity(command.streamType, "STREAM_TYPE"); requireIdentity(command.streamId, "STREAM_ID"); requireIdentity(command.actorId, "ACTOR_ID");
  requireIdempotency(command.idempotencyKey); requireHash(command.intentHash, "INTENT_HASH");
  if (!validation.valid) throw new FactoryRuntimeError("COMMAND_CONTRACT_INVALID", 400, "The command contract is invalid", validation.reasons);
  const replay = await commandReplay(db, command.idempotencyKey, command.intentHash); if (replay) return replay;
  const stream = await first(db, "SELECT * FROM factory_runtime_streams WHERE stream_type=? AND stream_id=?", command.streamType, command.streamId);
  if (!stream) throw new FactoryRuntimeError("RUNTIME_STREAM_NOT_FOUND", 404, "Reserve work before submitting a runtime command");
  const lease = await first(db, "SELECT * FROM factory_runtime_leases WHERE id=? AND stream_type=? AND stream_id=?", command.leaseId, command.streamType, command.streamId);
  const now = timestamp(execution), reasons: string[] = [];
  if (number(stream.current_version) !== command.expectedVersion) reasons.push("EXPECTED_VERSION_MISMATCH");
  if (clean(stream.current_state) !== command.expectedState) reasons.push("EXPECTED_STATE_MISMATCH");
  if (!lease) reasons.push("LEASE_NOT_FOUND");
  else {
    if (clean(lease.lifecycle_state) !== "ACTIVE") reasons.push("LEASE_NOT_ACTIVE");
    if (number(lease.fencing_token) !== command.fencingToken) reasons.push("STALE_FENCING_TOKEN");
    if (clean(lease.expires_at) <= now) reasons.push("LEASE_EXPIRED");
    if (clean(stream.active_lease_id) !== command.leaseId || number(stream.active_fencing_token) !== command.fencingToken) reasons.push("STREAM_FENCING_MISMATCH");
  }
  if (reasons.length) return persistedRejectedCommand(db, { ...command, evidenceHash }, reasons, execution);
  const commandId = identifier("factory-command", execution), acceptedEventId = identifier("factory-event", execution), effect = effectEvent(command.commandType), effectEventId = effect ? identifier("factory-event", execution) : null;
  const acceptedVersion = command.expectedVersion + 1, finalVersion = acceptedVersion + (effect ? 1 : 0), finalState = effect ?? clean(stream.current_state), finalHeadId = effectEventId || acceptedEventId;
  const statements: FactoryRuntimeStatement[] = [
    commandStatement(db, commandId, command, now),
    eventStatement(db, { id: acceptedEventId, streamType: command.streamType, streamId: command.streamId, streamVersion: acceptedVersion, eventType: "CommandAccepted", actorType: eventActorType(command.actorType), actorId: command.actorId,
      commandId, causationId: command.causationId, correlationId: command.correlationId || commandId, leaseId: command.leaseId, fencingToken: command.fencingToken,
      idempotencyKey: `runtime:event:${acceptedEventId}`, intentHash: command.intentHash, payload: { commandType: command.commandType, writerVersion: FACTORY_RUNTIME_WRITER_VERSION }, evidenceHash, occurredAt: now }),
  ];
  if (effect && effectEventId) statements.push(eventStatement(db, { id: effectEventId, streamType: command.streamType, streamId: command.streamId, streamVersion: finalVersion, eventType: effect, actorType: eventActorType(command.actorType), actorId: command.actorId,
    commandId, causationId: acceptedEventId, correlationId: command.correlationId || commandId, leaseId: command.leaseId, fencingToken: command.fencingToken,
    idempotencyKey: `runtime:event:${effectEventId}`, intentHash: command.intentHash, payload: { ...command.payload, commandType: command.commandType, writerVersion: FACTORY_RUNTIME_WRITER_VERSION }, evidenceHash, occurredAt: now }));
  if (effectBuilder) {
    if (!effect || !effectEventId) throw new FactoryRuntimeError("RUNTIME_EFFECT_EVENT_REQUIRED", 400, "Atomic command effects require a command that emits an effect event");
    statements.push(...effectBuilder({ commandId, acceptedEventId, effectEventId, occurredAt: now, finalVersion, evidenceHash }));
  }
  if (command.commandType === "FREEZE_STAGE" || command.commandType === "REOPEN_ROOT_STAGE") {
    statements.push(
      db.prepare("UPDATE factory_runtime_leases SET lifecycle_state='RELEASED',released_at=? WHERE id=? AND fencing_token=? AND lifecycle_state='ACTIVE'").bind(now, command.leaseId, command.fencingToken),
      db.prepare("UPDATE factory_runtime_streams SET active_stage_key=NULL,active_lease_id=NULL,active_fencing_token=NULL,updated_at=? WHERE stream_type=? AND stream_id=? AND active_lease_id=? AND active_fencing_token=?").bind(now, command.streamType, command.streamId, command.leaseId, command.fencingToken),
    );
  }
  statements.push(await projectionCheckpointStatement(db, { streamType: command.streamType, streamId: command.streamId, streamVersion: finalVersion, state: finalState, headEventId: finalHeadId, headEvidenceHash: evidenceHash }, execution));
  try {
    await db.batch(statements);
  } catch (error) {
    const concurrentReplay = await commandReplay(db, command.idempotencyKey, command.intentHash); if (concurrentReplay) return concurrentReplay;
    return persistedRejectedCommand(db, command, ["WRITE_CONFLICT_OR_STALE_FENCE", error instanceof Error ? error.message : "UNKNOWN_WRITE_CONFLICT"], execution);
  }
  return { outcome: "RECORDED" as const, decision: "ACCEPTED" as const, commandId, streamType: command.streamType, streamId: command.streamId, streamVersion: finalVersion,
    eventIds: effectEventId ? [acceptedEventId, effectEventId] : [acceptedEventId], reasons: [], providerRequests: 0, spendUsd: 0 };
}

export async function submitFactoryRuntimeCommand(db: FactoryRuntimeDB, command: FactoryRuntimeCommandInput, execution?: FactoryRuntimeExecution) {
  return submitFactoryRuntimeCommandInternal(db, command, execution);
}

export async function submitFactoryRuntimeCommandWithEffects(db: FactoryRuntimeDB, command: FactoryRuntimeCommandInput, buildEffects: FactoryRuntimeEffectBuilder, execution?: FactoryRuntimeExecution) {
  return submitFactoryRuntimeCommandInternal(db, command, execution, buildEffects);
}

export async function reconcileFactoryRuntimeOrphan(db: FactoryRuntimeDB, input: {
  streamType: string; streamId: string; actorType: FactoryRuntimeActorType; actorId: string; idempotencyKey: string; intentHash: string; evidenceHash: string;
}, execution?: FactoryRuntimeExecution) {
  const streamType = requireIdentity(input.streamType, "STREAM_TYPE"), streamId = requireIdentity(input.streamId, "STREAM_ID"), actorId = requireIdentity(input.actorId, "ACTOR_ID");
  const idempotencyKey = requireIdempotency(input.idempotencyKey), intentHash = requireHash(input.intentHash, "INTENT_HASH"), evidenceHash = requireHash(input.evidenceHash, "EVIDENCE_HASH"), now = timestamp(execution);
  const replay = await first(db, "SELECT * FROM factory_runtime_events WHERE idempotency_key=? LIMIT 1", idempotencyKey);
  if (replay) {
    if (clean(replay.intent_hash) !== intentHash) throw new FactoryRuntimeError("IDEMPOTENCY_KEY_REUSED", 409, "The orphan reconciliation key is bound to another intent");
    return { outcome: "IDEMPOTENT_REPLAY" as const, eventId: clean(replay.id), streamVersion: number(replay.stream_version) };
  }
  const stream = await first(db, "SELECT * FROM factory_runtime_streams WHERE stream_type=? AND stream_id=?", streamType, streamId);
  if (!stream || !clean(stream.active_lease_id)) return { outcome: "NO_ACTIVE_LEASE" as const };
  const lease = await first(db, "SELECT * FROM factory_runtime_leases WHERE id=? AND lifecycle_state='ACTIVE'", stream.active_lease_id);
  if (!lease) return { outcome: "NO_ACTIVE_LEASE" as const };
  if (clean(lease.expires_at) > now) throw new FactoryRuntimeError("ACTIVE_LEASE_NOT_EXPIRED", 409, "An unexpired lease cannot be reconciled as an orphan");
  const eventId = identifier("factory-event", execution), nextVersion = number(stream.current_version) + 1;
  const checkpoint = await projectionCheckpointStatement(db, { streamType, streamId, streamVersion: nextVersion, state: "ExceptionRouted", headEventId: eventId, headEvidenceHash: evidenceHash }, execution);
  await db.batch([
    db.prepare("UPDATE factory_runtime_leases SET lifecycle_state='ORPHANED',orphaned_at=?,released_at=? WHERE id=? AND lifecycle_state='ACTIVE' AND expires_at<=?").bind(now, now, lease.id, now),
    db.prepare("UPDATE factory_runtime_streams SET active_stage_key=NULL,active_lease_id=NULL,active_fencing_token=NULL,updated_at=? WHERE stream_type=? AND stream_id=? AND active_lease_id=?").bind(now, streamType, streamId, lease.id),
    eventStatement(db, { id: eventId, streamType, streamId, streamVersion: nextVersion, eventType: "ExceptionRouted", actorType: eventActorType(input.actorType), actorId, correlationId: eventId,
      leaseId: clean(lease.id), fencingToken: number(lease.fencing_token), idempotencyKey, intentHash, payload: { reason: "ORPHANED_RUNTIME_LEASE", priorLeaseId: lease.id, priorFencingToken: lease.fencing_token }, evidenceHash, occurredAt: now }),
    checkpoint,
  ]);
  return { outcome: "ORPHAN_RECONCILED" as const, eventId, streamVersion: nextVersion, priorLeaseId: clean(lease.id), priorFencingToken: number(lease.fencing_token) };
}

export async function materializeFactoryDependencyStaleProjection(db: FactoryRuntimeDB, input: { staleEventId: string; changedArtifactVersionIds: string[]; reason: string }, execution?: FactoryRuntimeExecution) {
  const staleEventId = requireIdentity(input.staleEventId, "STALE_EVENT_ID"), reason = clean(input.reason);
  if (reason.length < 8 || reason.length > 1000) throw new FactoryRuntimeError("STALE_REASON_INVALID", 400, "A bounded stale reason is required");
  const changed = [...new Set(input.changedArtifactVersionIds.map((id) => requireIdentity(id, "ARTIFACT_VERSION_ID")))].sort();
  if (!changed.length) throw new FactoryRuntimeError("CHANGED_ARTIFACTS_REQUIRED", 400, "At least one changed artifact version is required");
  const existing = await first(db, "SELECT * FROM factory_dependency_projection_receipts WHERE stale_event_id=? LIMIT 1", staleEventId);
  if (existing) return { outcome: "IDEMPOTENT_REPLAY" as const, receiptId: clean(existing.id), staleBindingIds: parse(existing.stale_binding_ids_json, []), staleArtifactVersionIds: parse(existing.stale_artifact_version_ids_json, []) };
  const event = await first(db, "SELECT * FROM factory_runtime_events WHERE id=? AND event_type='DependencyStale'", staleEventId);
  if (!event) throw new FactoryRuntimeError("DEPENDENCY_STALE_EVENT_REQUIRED", 409, "The projection must bind to a stored DependencyStale event");
  const bindings = await rows(db, "SELECT id,upstream_artifact_version_id,downstream_artifact_version_id FROM factory_dependency_bindings ORDER BY id");
  const resolution = resolveStaleDependencies(bindings.map((binding) => ({ id: clean(binding.id), upstreamArtifactVersionId: clean(binding.upstream_artifact_version_id), downstreamArtifactVersionId: clean(binding.downstream_artifact_version_id) })), changed);
  const inputHash = await canonicalHash({ staleEventId, changedArtifactVersionIds: changed, reason }), projectionHash = await canonicalHash(resolution), now = timestamp(execution), receiptId = identifier("factory-dependency-projection", execution);
  const evidenceHash = clean(event.evidence_hash);
  const bindingById = new Map(bindings.map((binding) => [clean(binding.id), binding]));
  const statements: FactoryRuntimeStatement[] = resolution.staleBindingIds.map((bindingId) => db.prepare(`INSERT INTO factory_dependency_invalidations
    (id,dependency_binding_id,stale_event_id,reason,evidence_hash) VALUES (?,?,?,?,?)`).bind(identifier("factory-invalidation", execution), bindingId, staleEventId, reason, evidenceHash));
  for (const artifactVersionId of resolution.staleArtifactVersionIds) statements.push(db.prepare(`INSERT INTO factory_artifact_stale_projections
    (artifact_version_id,lifecycle_state,projection_version,stale_event_id,reason,evidence_hash,updated_at) VALUES (?,'STALE',1,?,?,?,?)
    ON CONFLICT(artifact_version_id) DO UPDATE SET lifecycle_state='STALE',projection_version=projection_version+1,stale_event_id=excluded.stale_event_id,reason=excluded.reason,evidence_hash=excluded.evidence_hash,updated_at=excluded.updated_at`)
    .bind(artifactVersionId, staleEventId, reason, evidenceHash, now));
  statements.push(db.prepare(`INSERT INTO factory_dependency_projection_receipts
    (id,stale_event_id,input_artifact_ids_json,stale_binding_ids_json,stale_artifact_version_ids_json,input_hash,projection_hash)
    VALUES (?,?,?,?,?,?,?)`).bind(receiptId, staleEventId, json(changed), json(resolution.staleBindingIds), json(resolution.staleArtifactVersionIds), inputHash, projectionHash));
  if (resolution.staleBindingIds.some((bindingId) => !bindingById.has(bindingId))) throw new FactoryRuntimeError("DEPENDENCY_BINDING_RESOLUTION_INVALID", 500, "The stale resolver returned an unknown binding");
  await db.batch(statements);
  return { outcome: "MATERIALIZED" as const, receiptId, ...resolution, inputHash, projectionHash };
}

export async function verifyFactoryRuntimeReplay(db: FactoryRuntimeDB, input: { streamType: string; streamId: string }, execution?: FactoryRuntimeExecution) {
  const streamType = requireIdentity(input.streamType, "STREAM_TYPE"), streamId = requireIdentity(input.streamId, "STREAM_ID");
  const stream = await first(db, "SELECT * FROM factory_runtime_streams WHERE stream_type=? AND stream_id=?", streamType, streamId);
  if (!stream) throw new FactoryRuntimeError("RUNTIME_STREAM_NOT_FOUND", 404, "The runtime stream does not exist");
  const storedEvents = await rows(db, "SELECT * FROM factory_runtime_events WHERE stream_type=? AND stream_id=? ORDER BY stream_version,id", streamType, streamId);
  const events = storedEvents.map((event) => ({
    id: clean(event.id), streamType: clean(event.stream_type), streamId: clean(event.stream_id), streamVersion: number(event.stream_version), eventType: clean(event.event_type) as FactoryRuntimeEventType,
    idempotencyKey: clean(event.idempotency_key), intentHash: clean(event.intent_hash), evidenceHash: clean(event.evidence_hash), fencingToken: event.fencing_token == null ? null : number(event.fencing_token),
  }));
  const replay = replayFactoryRuntimeEvents(events);
  const eventStreamHash = await canonicalHash(storedEvents.map((event) => ({
    id: event.id, streamVersion: event.stream_version, eventType: event.event_type, actorType: event.actor_type, actorId: event.actor_id, commandId: event.command_id,
    causationId: event.causation_id, correlationId: event.correlation_id, leaseId: event.lease_id, fencingToken: event.fencing_token, idempotencyKey: event.idempotency_key,
    intentHash: event.intent_hash, payload: parse(event.payload_json, {}), evidenceHash: event.evidence_hash, occurredAt: event.occurred_at,
  })));
  const existing = await first(db, "SELECT * FROM factory_runtime_replay_receipts WHERE stream_type=? AND stream_id=? AND event_stream_hash=?", streamType, streamId, eventStreamHash);
  if (existing) return { outcome: "IDEMPOTENT_REPLAY" as const, receiptId: clean(existing.id), verificationState: clean(existing.verification_state), failureReasons: parse(existing.failure_reasons_json, []) };
  const derived = projectionCore({ streamType, streamId, currentVersion: replay.streamVersion, currentState: replay.state, headEventId: replay.headEventId, headEvidenceHash: replay.headEvidenceHash });
  const stored = projectionCore({ streamType, streamId, currentVersion: number(stream.current_version), currentState: clean(stream.current_state), headEventId: clean(stream.head_event_id) || null, headEvidenceHash: clean(stream.head_evidence_hash) || null });
  const [derivedProjectionHash, storedProjectionHash] = await Promise.all([canonicalHash(derived), canonicalHash(stored)]), failureReasons: string[] = [];
  if (replay.streamVersion !== number(stream.current_version)) failureReasons.push("STREAM_VERSION_MISMATCH");
  if (replay.state !== clean(stream.current_state)) failureReasons.push("STREAM_STATE_MISMATCH");
  if (replay.headEventId !== (clean(stream.head_event_id) || null)) failureReasons.push("HEAD_EVENT_MISMATCH");
  if (replay.headEvidenceHash !== (clean(stream.head_evidence_hash) || null)) failureReasons.push("HEAD_EVIDENCE_HASH_MISMATCH");
  if (derivedProjectionHash !== storedProjectionHash) failureReasons.push("PROJECTION_HASH_MISMATCH");
  const verificationState = failureReasons.length ? "FAIL" : "PASS", receiptId = identifier("factory-replay", execution);
  await db.prepare(`INSERT INTO factory_runtime_replay_receipts
    (id,stream_type,stream_id,through_stream_version,event_count,event_stream_hash,derived_projection_hash,stored_projection_hash,verification_state,failure_reasons_json,executor_version)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(receiptId, streamType, streamId, replay.streamVersion, replay.eventCount, eventStreamHash, derivedProjectionHash, storedProjectionHash, verificationState, json(failureReasons), FACTORY_RUNTIME_REPLAY_VERSION).run();
  return { outcome: "VERIFIED" as const, receiptId, verificationState, failureReasons, eventCount: replay.eventCount, streamVersion: replay.streamVersion, eventStreamHash, derivedProjectionHash, storedProjectionHash };
}

export async function readFactoryRuntimeProjection(db: FactoryRuntimeDB, input: { streamType: string; streamId: string }) {
  const streamType = requireIdentity(input.streamType, "STREAM_TYPE"), streamId = requireIdentity(input.streamId, "STREAM_ID");
  const [stream, events, leases, staleArtifacts, replayReceipts] = await Promise.all([
    first(db, "SELECT * FROM factory_runtime_streams WHERE stream_type=? AND stream_id=?", streamType, streamId),
    rows(db, "SELECT * FROM factory_runtime_events WHERE stream_type=? AND stream_id=? ORDER BY stream_version DESC LIMIT 50", streamType, streamId),
    rows(db, "SELECT * FROM factory_runtime_leases WHERE stream_type=? AND stream_id=? ORDER BY fencing_token DESC LIMIT 20", streamType, streamId),
    rows(db, `SELECT p.* FROM factory_artifact_stale_projections p JOIN factory_artifact_versions a ON a.id=p.artifact_version_id
      WHERE a.source_entity_id=? AND p.lifecycle_state='STALE' ORDER BY p.updated_at DESC LIMIT 100`, streamId),
    rows(db, "SELECT * FROM factory_runtime_replay_receipts WHERE stream_type=? AND stream_id=? ORDER BY created_at DESC LIMIT 20", streamType, streamId),
  ]);
  return { contractVersion: FACTORY_RUNTIME_CONTRACT_VERSION, writerVersion: FACTORY_RUNTIME_WRITER_VERSION, stream, events, leases, staleArtifacts, replayReceipts, providerRequests: 0, spendUsd: 0 };
}
