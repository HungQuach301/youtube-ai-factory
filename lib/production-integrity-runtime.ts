import { canonicalHash } from "@/lib/canonical-json";
import { classifyProviderFailure, evaluateDispatchFirewall, evaluateFencedLease, redactTraceAttributes } from "@/lib/production-integrity";
import { VIDEO_QUALITY_STANDARD_VERSION } from "@/lib/video-quality-standard";

type Row = Record<string, unknown>;
type RunResult = { meta?: { changes?: number } };
type Statement = { bind(...values: unknown[]): Statement; all<T = Row>(): Promise<{ results?: T[] }>; first<T = Row>(): Promise<T | null>; run(): Promise<RunResult> };
export type ProductionIntegrityDB = { prepare(query: string): Statement; batch(statements: Statement[]): Promise<RunResult[]> };

const clean = (value: unknown) => String(value ?? "").trim();
const now = () => new Date().toISOString();
const json = (value: unknown) => JSON.stringify(value);
const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const parseJson = <T,>(value: unknown, fallback: T): T => { try { return JSON.parse(clean(value)) as T; } catch { return fallback; } };
async function first(db: ProductionIntegrityDB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values).first<Row>(); }

export class ProductionIntegrityError extends Error {
  constructor(public readonly code: string, public readonly status: number, message: string, public readonly reasons: string[] = []) {
    super(message);
    this.name = "ProductionIntegrityError";
  }
}

export function readFencingHeaders(request: Request) {
  const leaseId = clean(request.headers.get("x-sequential-lease-id"));
  const fencingToken = Number(request.headers.get("x-sequential-fencing-token"));
  if (!leaseId || !Number.isSafeInteger(fencingToken) || fencingToken <= 0) throw new ProductionIntegrityError("FENCED_LEASE_HEADERS_REQUIRED", 409, "A current lease ID and positive fencing token are required");
  return { leaseId, fencingToken };
}

export async function issueFencingToken(db: ProductionIntegrityDB, programId: string) {
  const row = await first(db, `INSERT INTO v7_integrity_fence_counters (program_id,next_token,updated_at) VALUES (?,1,?)
    ON CONFLICT(program_id) DO UPDATE SET next_token=next_token+1,updated_at=excluded.updated_at RETURNING next_token`, programId, now());
  const token = Number(row?.next_token || 0);
  if (!Number.isSafeInteger(token) || token <= 0) throw new ProductionIntegrityError("FENCING_TOKEN_ISSUE_FAILED", 503, "A monotonic fencing token could not be issued");
  return token;
}

export async function assertCommandLease(db: ProductionIntegrityDB, input: { programId: string; queueId: string; stageKey: string; leaseId: string; fencingToken: number }) {
  const row = await first(db, "SELECT * FROM v7_sequential_leases WHERE program_id=? AND queue_id=? AND stage_key=? AND lifecycle_state='ACTIVE' ORDER BY fencing_token DESC LIMIT 1", input.programId, input.queueId, input.stageKey);
  const result = evaluateFencedLease(row ? {
    id: clean(row.id), stageKey: clean(row.stage_key), fencingToken: Number(row.fencing_token), state: clean(row.lifecycle_state),
    expiresAt: clean(row.expires_at), heartbeatAt: clean(row.heartbeat_at || row.acquired_at),
  } : null, { leaseId: input.leaseId, stageKey: input.stageKey, fencingToken: input.fencingToken, nowIso: now(), maximumHeartbeatAgeMs: 5 * 60_000 });
  const stage = await first(db, "SELECT active_fencing_token FROM v7_sequential_stage_runs WHERE queue_id=? AND stage_key=? LIMIT 1", input.queueId, input.stageKey);
  if (Number(stage?.active_fencing_token || 0) !== input.fencingToken) result.reasons.push("STAGE_FENCING_TOKEN_MISMATCH");
  if (!result.eligible || result.reasons.length) throw new ProductionIntegrityError("STALE_OR_INVALID_FENCING_LEASE", 409, "The command was rejected because its production lease is stale or invalid", [...new Set(result.reasons)]);
  return row!;
}

export async function heartbeatProductionLease(db: ProductionIntegrityDB, input: { programId: string; queueId: string; stageKey: string; leaseId: string; fencingToken: number; actor: string }) {
  await assertCommandLease(db, input);
  const timestamp = now(), expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
  const result = await db.prepare("UPDATE v7_sequential_leases SET heartbeat_at=?,expires_at=? WHERE id=? AND fencing_token=? AND lifecycle_state='ACTIVE'").bind(timestamp, expiresAt, input.leaseId, input.fencingToken).run();
  if (Number(result.meta?.changes || 0) !== 1) throw new ProductionIntegrityError("LEASE_HEARTBEAT_CONFLICT", 409, "The production lease heartbeat lost its fencing race");
  return { outcome: "HEARTBEAT_RECORDED" as const, leaseId: input.leaseId, fencingToken: input.fencingToken, heartbeatAt: timestamp, expiresAt, actor: input.actor };
}

export async function reconcileExpiredProductionLease(db: ProductionIntegrityDB, input: { programId: string; queueId: string; stageKey: string; actor: string }) {
  const lease = await first(db, "SELECT * FROM v7_sequential_leases WHERE program_id=? AND queue_id=? AND stage_key=? AND lifecycle_state='ACTIVE' ORDER BY fencing_token DESC LIMIT 1", input.programId, input.queueId, input.stageKey);
  if (!lease) return { outcome: "NO_ACTIVE_LEASE" as const };
  if (Date.parse(clean(lease.expires_at)) > Date.now()) throw new ProductionIntegrityError("ACTIVE_LEASE_NOT_EXPIRED", 409, "An unexpired lease cannot be reconciled as an orphan");
  const timestamp = now(), incidentId = makeId("integrity-incident");
  await db.batch([
    db.prepare("UPDATE v7_sequential_leases SET lifecycle_state='ORPHANED',orphaned_at=?,released_at=? WHERE id=? AND fencing_token=? AND lifecycle_state='ACTIVE'").bind(timestamp, timestamp, lease.id, lease.fencing_token),
    db.prepare("UPDATE v7_sequential_stage_runs SET lifecycle_state='READY',eligibility_state='BLOCKED',active_fencing_token=NULL,blocker='ORPHAN_RECONCILED_RESTART_REQUIRED',updated_at=? WHERE queue_id=? AND stage_key=? AND active_fencing_token=?").bind(timestamp, input.queueId, input.stageKey, lease.fencing_token),
    db.prepare("UPDATE v7_integrity_cost_reservations SET lifecycle_state='ORPHANED',orphaned_at=?,updated_at=? WHERE lease_id=? AND fencing_token=? AND lifecycle_state IN ('RESERVED','DISPATCHED')").bind(timestamp, timestamp, lease.id, lease.fencing_token),
    db.prepare("INSERT INTO v7_integrity_incidents (id,program_id,queue_id,stage_key,incident_type,severity,lifecycle_state,failure_class,detail_json,owner) VALUES (?,?,?,?,?,'P1','OPEN','TRANSIENT',?,?)").bind(incidentId, input.programId, input.queueId, input.stageKey, "ORPHANED_PRODUCTION_LEASE", json({ leaseId: lease.id, fencingToken: lease.fencing_token, reconciledBy: input.actor }), "PRODUCTION_INTEGRITY_OWNER"),
  ]);
  return { outcome: "ORPHAN_RECONCILED" as const, incidentId, priorLeaseId: clean(lease.id), priorFencingToken: Number(lease.fencing_token) };
}

async function latestSafetyState(db: ProductionIntegrityDB, queueId: string) {
  const row = await first(db, `SELECT lifecycle_state,evidence_hash FROM v7_video_quality_evidence
    WHERE queue_id=? AND standard_version=? AND standard_id='VQ-M0-SAFETY-SCOPE'
    ORDER BY evaluation_number DESC,created_at DESC LIMIT 1`, queueId, VIDEO_QUALITY_STANDARD_VERSION);
  return row && clean(row.lifecycle_state) === "PASS" && clean(row.evidence_hash) ? "PASS" as const : row ? clean(row.lifecycle_state) as "FAIL" | "BLOCKED" | "NOT_EVALUATED" : "NOT_EVALUATED" as const;
}

export type DispatchAuthorization = { traceId: string; reservationId: string; leaseId: string; fencingToken: number; outcome: "AUTHORIZED" };

export async function authorizeProductionDispatch(db: ProductionIntegrityDB, input: {
  programId: string; queueId: string; stageKey: string; budgetScope?: string; operation: string; actor: string;
  providers: string[];
  idempotencyKey: string; intent: unknown; leaseId: string; fencingToken: number; qualificationIds: string[];
  requestedProviderRequests: number; requestedSpendUsd?: number; rightsState: string; allowedRightsStates: string[]; safetyRequired: boolean;
}) : Promise<DispatchAuthorization> {
  const intentHash = await canonicalHash(input.intent), existing = await first(db, "SELECT * FROM v7_integrity_cost_reservations WHERE idempotency_key=? LIMIT 1", input.idempotencyKey);
  if (existing) {
    if (clean(existing.intent_hash) !== intentHash) throw new ProductionIntegrityError("INTEGRITY_IDEMPOTENCY_KEY_REUSED", 409, "The dispatch idempotency key is already bound to another intent");
    throw new ProductionIntegrityError("INTEGRITY_IDEMPOTENT_REPLAY_BLOCKED", 409, "The dispatch intent already has an integrity reservation; replay cannot call the provider again", [clean(existing.lifecycle_state)]);
  }
  await assertCommandLease(db, input);
  const plan = await first(db, "SELECT * FROM v7_sequential_budget_plans WHERE queue_id=? AND lifecycle_state='APPROVED' ORDER BY version DESC LIMIT 1", input.queueId);
  const scope = parseJson<string[]>(plan?.stage_scope_json, []), budgetScope = input.budgetScope || input.stageKey;
  if (!plan || !scope.includes(budgetScope)) throw new ProductionIntegrityError("APPROVED_BUDGET_PLAN_REQUIRED", 409, `The active budget plan does not authorize ${budgetScope}`);
  const providerPlan = parseJson<Record<string, { stages?: string[] }>>(plan.provider_plan_json, {}), unauthorizedProviders = [...new Set(input.providers)].filter((provider) => !providerPlan[provider]?.stages?.includes(budgetScope));
  if (unauthorizedProviders.length) throw new ProductionIntegrityError("PROVIDER_NOT_IN_APPROVED_PLAN", 409, "One or more providers are outside the approved plan scope", unauthorizedProviders);
  const active = await first(db, "SELECT COALESCE(SUM(reserved_spend_usd),0) spend,COALESCE(SUM(reserved_provider_requests),0) requests FROM v7_integrity_cost_reservations WHERE plan_id=? AND lifecycle_state IN ('RESERVED','DISPATCHED')", plan.id);
  const remainingSpend = Math.max(0, Number(plan.max_spend_usd || 0) - Number(plan.actual_spend_usd || 0) - Number(active?.spend || 0));
  const reservedSpend = input.requestedSpendUsd === undefined ? remainingSpend : input.requestedSpendUsd;
  const safetyState = input.safetyRequired ? await latestSafetyState(db, input.queueId) : "PASS" as const;
  const firewall = evaluateDispatchFirewall({
    capabilityQualified: input.qualificationIds.length > 0,
    capabilitySettingsCurrent: true,
    leaseEligible: true,
    reservationState: "RESERVED",
    rightsState: input.rightsState,
    allowedRightsStates: input.allowedRightsStates,
    idempotencyKey: input.idempotencyKey,
    safetyRequired: input.safetyRequired,
    safetyState,
  });
  const traceId = makeId("integrity-trace"), reservationId = makeId("integrity-reservation"), timestamp = now();
  if (!firewall.authorized) {
    await db.prepare("INSERT INTO v7_integrity_dispatch_traces (id,program_id,queue_id,stage_key,operation,decision,reason_json,redacted_attributes_json,lease_id,fencing_token,capability_qualification_ids_json,safety_state,rights_state,completed_at) VALUES (?,?,?,?,?,'BLOCKED',?,?,?,?,?,?,?,?)")
      .bind(traceId, input.programId, input.queueId, input.stageKey, input.operation, json(firewall.reasons), json(redactTraceAttributes({ actor: input.actor, idempotencyKey: input.idempotencyKey })), input.leaseId, input.fencingToken, json(input.qualificationIds), safetyState, input.rightsState, timestamp).run();
    throw new ProductionIntegrityError("PRODUCTION_DISPATCH_BLOCKED", 409, "The production dispatch firewall rejected the request", firewall.reasons);
  }
  try {
    await db.batch([
      db.prepare("INSERT INTO v7_integrity_cost_reservations (id,plan_id,program_id,queue_id,stage_key,operation,providers_json,idempotency_key,intent_hash,lifecycle_state,reserved_provider_requests,reserved_spend_usd,lease_id,fencing_token,trace_id) VALUES (?,?,?,?,?,?,?,?,?, 'RESERVED',?,?,?,?,?,?)")
        .bind(reservationId, plan.id, input.programId, input.queueId, input.stageKey, input.operation, json([...new Set(input.providers)]), input.idempotencyKey, intentHash, input.requestedProviderRequests, reservedSpend, input.leaseId, input.fencingToken, traceId),
      db.prepare("INSERT INTO v7_integrity_dispatch_traces (id,program_id,queue_id,stage_key,operation,decision,reason_json,redacted_attributes_json,lease_id,fencing_token,reservation_id,capability_qualification_ids_json,safety_state,rights_state) VALUES (?,?,?,?,?,'AUTHORIZED','[]',?,?,?,?,?,?,?)")
        .bind(traceId, input.programId, input.queueId, input.stageKey, input.operation, json(redactTraceAttributes({ actor: input.actor, providers: input.providers, idempotencyKey: input.idempotencyKey, requestedProviderRequests: input.requestedProviderRequests, reservedSpendUsd: reservedSpend })), input.leaseId, input.fencingToken, reservationId, json(input.qualificationIds), safetyState, input.rightsState),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Budget reservation failed";
    const code = message.includes("INTEGRITY_REQUEST_CEILING_EXCEEDED") ? "INTEGRITY_REQUEST_CEILING_EXCEEDED" : message.includes("INTEGRITY_SPEND_CEILING_EXCEEDED") ? "INTEGRITY_SPEND_CEILING_EXCEEDED" : "INTEGRITY_RESERVATION_FAILED";
    throw new ProductionIntegrityError(code, code === "INTEGRITY_RESERVATION_FAILED" ? 503 : 409, message);
  }
  return { traceId, reservationId, leaseId: input.leaseId, fencingToken: input.fencingToken, outcome: "AUTHORIZED" };
}

export async function markDispatchStarted(db: ProductionIntegrityDB, reservationId: string) {
  await db.prepare("UPDATE v7_integrity_cost_reservations SET lifecycle_state='DISPATCHED',updated_at=? WHERE id=? AND lifecycle_state='RESERVED'").bind(now(), reservationId).run();
}

export async function settleProductionDispatch(db: ProductionIntegrityDB, input: { reservationId: string; traceId: string; actualProviderRequests: number; actualSpendUsd: number; failureCode?: string }) {
  const timestamp = now(), state = input.failureCode ? "FAILED" : "SETTLED", failureClass = input.failureCode ? classifyProviderFailure(input.failureCode) : null;
  const providerSettlement = input.failureCode
    ? db.prepare("UPDATE v7_sequential_provider_requests SET lifecycle_state=CASE WHEN lifecycle_state IN ('RUNNING','QUEUED') THEN 'FAILED' ELSE lifecycle_state END,failure_class=?,error_code=COALESCE(error_code,?),completed_at=CASE WHEN lifecycle_state IN ('RUNNING','QUEUED') THEN COALESCE(completed_at,?) ELSE completed_at END WHERE reservation_id=?").bind(failureClass, input.failureCode, timestamp, input.reservationId)
    : db.prepare("UPDATE v7_sequential_provider_requests SET failure_class=NULL WHERE reservation_id=?").bind(input.reservationId);
  await db.batch([
    db.prepare("UPDATE v7_integrity_cost_reservations SET lifecycle_state=?,actual_provider_requests=?,actual_spend_usd=?,settled_at=?,updated_at=? WHERE id=? AND lifecycle_state IN ('RESERVED','DISPATCHED')").bind(state, input.actualProviderRequests, input.actualSpendUsd, timestamp, timestamp, input.reservationId),
    providerSettlement,
    db.prepare(`UPDATE v7_sequential_budget_plans SET
      actual_provider_requests=(SELECT COUNT(*) FROM v7_sequential_provider_requests WHERE queue_id=v7_sequential_budget_plans.queue_id AND lifecycle_state IN ('COMPLETED','FAILED')),
      actual_spend_usd=(SELECT COALESCE(SUM(cost_usd),0) FROM v7_sequential_provider_requests WHERE queue_id=v7_sequential_budget_plans.queue_id AND lifecycle_state IN ('COMPLETED','FAILED')),
      updated_at=? WHERE id=(SELECT plan_id FROM v7_integrity_cost_reservations WHERE id=?)`).bind(timestamp, input.reservationId),
    db.prepare("UPDATE v7_integrity_dispatch_traces SET decision=?,reason_json=?,completed_at=? WHERE id=?").bind(input.failureCode ? "FAILED" : "SETTLED", json(input.failureCode ? [input.failureCode, failureClass] : []), timestamp, input.traceId),
  ]);
  return { lifecycleState: state, failureClass };
}
