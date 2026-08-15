import { discoveryProjection } from "@/lib/discovery-projection";

export const NICHE_EXPERT_DECISION_COMMAND_VERSION = "NICHE_EXPERT_DECISION_COMMAND_V1" as const;

export type NicheDecisionAction = "ACCEPT" | "REJECT" | "REQUEST_MORE_EVIDENCE";
export type ReusableAssetType = "RULE" | "RUBRIC_ANCHOR" | "EXAMPLE" | "ANTI_PATTERN" | "EXCEPTION_PATTERN";

export type NicheDecisionBody = {
  channelId: string;
  programId: string;
  expectedAggregateVersion: number;
  expectedDecisionVersion: number;
  candidateId: string;
  candidateVersion: number;
  evidenceVersion: number;
  action: NicheDecisionAction;
  rationale: string;
  reusableAsset: { type: ReusableAssetType; summary: string };
};

export type NicheDecisionActor = { email: string; displayName: string; role: "OWNER_EXPERT" };
export type NicheDecisionCommand = {
  body: NicheDecisionBody;
  actor: NicheDecisionActor;
  idempotencyKey: string;
  correlationId?: string | null;
  causationId?: string | null;
};

export type NicheDecisionReceipt = {
  contract: typeof NICHE_EXPERT_DECISION_COMMAND_VERSION;
  outcome: "RECORDED" | "IDEMPOTENT_REPLAY";
  decision: {
    id: string;
    version: number;
    aggregateVersion: number;
    channelId: string;
    programId: string;
    action: NicheDecisionAction;
    candidateId: string;
    candidateVersion: number;
    evidenceVersion: number;
    actorRole: "OWNER_EXPERT";
    createdAt: string;
  };
  authority: {
    authenticated: true;
    authorized: true;
    providerRequests: 0;
    spendUsd: 0;
    channelNicheMutation: false;
    channelStrategyActivation: false;
  };
};

type Row = Record<string, unknown>;
type D1Result = { meta?: { changes?: number } };
type Statement = {
  bind: (...values: unknown[]) => Statement;
  all: <T>() => Promise<{ results?: T[] }>;
  run: () => Promise<D1Result>;
};
export type NicheDecisionDB = {
  prepare: (query: string) => Statement;
  batch: (statements: Statement[]) => Promise<D1Result[]>;
};

export class NicheDecisionCommandError extends Error {
  constructor(public readonly code: string, public readonly status: number, message: string) {
    super(message);
    this.name = "NicheDecisionCommandError";
  }
}

const actions = new Set<NicheDecisionAction>(["ACCEPT", "REJECT", "REQUEST_MORE_EVIDENCE"]);
const assetTypes = new Set<ReusableAssetType>(["RULE", "RUBRIC_ANCHOR", "EXAMPLE", "ANTI_PATTERN", "EXCEPTION_PATTERN"]);

function clean(value: unknown) { return String(value ?? "").trim(); }
function integer(value: unknown) { return Number.isInteger(value) ? Number(value) : Number.NaN; }
function boundedText(value: unknown, field: string, minimum: number, maximum: number) {
  const result = clean(value);
  if (result.length < minimum || result.length > maximum) throw new NicheDecisionCommandError("COMMAND_VALIDATION_FAILED", 400, `${field} must contain ${minimum}-${maximum} characters`);
  return result;
}
function boundedId(value: unknown, field: string) { return boundedText(value, field, 1, 256); }
function expectedVersion(value: unknown, field: string, minimum: number) {
  const result = integer(value);
  if (!Number.isInteger(result) || result < minimum) throw new NicheDecisionCommandError("COMMAND_VALIDATION_FAILED", 400, `${field} must be an integer >= ${minimum}`);
  return result;
}

export function parseNicheDecisionBody(value: unknown): NicheDecisionBody {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new NicheDecisionCommandError("COMMAND_VALIDATION_FAILED", 400, "A JSON command object is required");
  const body = value as Record<string, unknown>;
  const reusable = body.reusableAsset;
  if (!reusable || typeof reusable !== "object" || Array.isArray(reusable)) throw new NicheDecisionCommandError("COMMAND_VALIDATION_FAILED", 400, "reusableAsset is required");
  const reusableRecord = reusable as Record<string, unknown>;
  const action = clean(body.action) as NicheDecisionAction;
  const type = clean(reusableRecord.type) as ReusableAssetType;
  if (!actions.has(action)) throw new NicheDecisionCommandError("COMMAND_VALIDATION_FAILED", 400, "action is not supported");
  if (!assetTypes.has(type)) throw new NicheDecisionCommandError("COMMAND_VALIDATION_FAILED", 400, "reusableAsset.type is not supported");
  return {
    channelId: boundedId(body.channelId, "channelId"),
    programId: boundedId(body.programId, "programId"),
    expectedAggregateVersion: expectedVersion(body.expectedAggregateVersion, "expectedAggregateVersion", 1),
    expectedDecisionVersion: expectedVersion(body.expectedDecisionVersion, "expectedDecisionVersion", 0),
    candidateId: boundedId(body.candidateId, "candidateId"),
    candidateVersion: expectedVersion(body.candidateVersion, "candidateVersion", 1),
    evidenceVersion: expectedVersion(body.evidenceVersion, "evidenceVersion", 1),
    action,
    rationale: boundedText(body.rationale, "rationale", 40, 4000),
    reusableAsset: { type, summary: boundedText(reusableRecord.summary, "reusableAsset.summary", 20, 2000) },
  };
}

export function validateIdempotencyKey(value: unknown) {
  const key = boundedText(value, "Idempotency-Key", 12, 200);
  if (!/^[A-Za-z0-9._:-]+$/.test(key)) throw new NicheDecisionCommandError("COMMAND_VALIDATION_FAILED", 400, "Idempotency-Key contains unsupported characters");
  return key;
}

async function first(db: NicheDecisionDB, query: string, ...values: unknown[]) {
  return ((await db.prepare(query).bind(...values).all<Row>()).results || [])[0] || null;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function receipt(row: Row, replay: boolean): NicheDecisionReceipt {
  return {
    contract: NICHE_EXPERT_DECISION_COMMAND_VERSION,
    outcome: replay ? "IDEMPOTENT_REPLAY" : "RECORDED",
    decision: {
      id: clean(row.id), version: Number(row.decision_version), aggregateVersion: Number(row.aggregate_version),
      channelId: clean(row.channel_id), programId: clean(row.program_id), action: clean(row.action) as NicheDecisionAction,
      candidateId: clean(row.candidate_id), candidateVersion: Number(row.candidate_version), evidenceVersion: Number(row.evidence_version),
      actorRole: "OWNER_EXPERT", createdAt: clean(row.created_at),
    },
    authority: { authenticated: true, authorized: true, providerRequests: 0, spendUsd: 0, channelNicheMutation: false, channelStrategyActivation: false },
  };
}

export async function submitNicheExpertDecision(db: NicheDecisionDB, command: NicheDecisionCommand): Promise<NicheDecisionReceipt> {
  const body = parseNicheDecisionBody(command.body);
  const idempotencyKey = validateIdempotencyKey(command.idempotencyKey);
  const actorEmail = clean(command.actor.email).toLowerCase();
  const actorDisplayName = boundedText(command.actor.displayName, "actor.displayName", 1, 256);
  if (!actorEmail || command.actor.role !== "OWNER_EXPERT") throw new NicheDecisionCommandError("OWNER_EXPERT_AUTHORIZATION_REQUIRED", 403, "An authorized owner/expert identity is required");
  const requestHash = await sha256(JSON.stringify({ actorEmail, ...body, reusableAsset: body.reusableAsset }));
  const existing = await first(db, "SELECT * FROM niche_expert_decisions WHERE idempotency_key=? LIMIT 1", idempotencyKey);
  if (existing) {
    if (clean(existing.request_hash) !== requestHash) throw new NicheDecisionCommandError("IDEMPOTENCY_KEY_REUSED", 409, "The idempotency key is already bound to a different command payload");
    return receipt(existing, true);
  }

  const projection = await discoveryProjection(body.channelId, db);
  const context = projection.workflow.decisionCommand;
  if (!context) throw new NicheDecisionCommandError("EVIDENCE_NOT_READY_FOR_EXPERT_DECISION", 422, "Canonical evidence is not ready for an owner/expert decision");
  if (context.programId !== body.programId || context.expectedAggregateVersion !== body.expectedAggregateVersion
    || context.candidateId !== body.candidateId || context.candidateVersion !== body.candidateVersion || context.evidenceVersion !== body.evidenceVersion) {
    throw new NicheDecisionCommandError("CANONICAL_DECISION_CONTEXT_STALE", 409, "Aggregate, candidate or evidence context changed; reload before deciding");
  }
  if (context.expectedDecisionVersion !== body.expectedDecisionVersion) throw new NicheDecisionCommandError("DECISION_VERSION_CONFLICT", 409, "A newer expert decision exists; reload before deciding");

  const now = new Date().toISOString();
  const decisionVersion = body.expectedDecisionVersion + 1;
  const decisionId = `niche-decision:${crypto.randomUUID()}`;
  const auditId = `${decisionId}:audit`;
  const lineageId = `${decisionId}:lineage`;
  const prior = body.expectedDecisionVersion > 0
    ? await first(db, "SELECT id FROM niche_expert_decisions WHERE program_id=? AND decision_version=? LIMIT 1", body.programId, body.expectedDecisionVersion)
    : null;
  const supersedesDecisionId = clean(prior?.id) || null;
  const correlationId = command.correlationId ? boundedId(command.correlationId, "X-Correlation-Id") : `niche-decision:${idempotencyKey}`;
  const causationId = command.causationId ? boundedId(command.causationId, "X-Causation-Id") : supersedesDecisionId;
  const upstreamEvidenceId = body.candidateId.includes(":") ? body.candidateId.slice(0, body.candidateId.lastIndexOf(":")) : body.candidateId;

  try {
    await db.batch([
      db.prepare("INSERT INTO niche_expert_decisions (id,portfolio_id,channel_id,program_id,aggregate_version,decision_version,action,candidate_id,candidate_version,evidence_version,actor_email,actor_display_name,actor_role,rationale,reusable_asset_type,reusable_asset_summary,idempotency_key,request_hash,correlation_id,causation_id,supersedes_decision_id,created_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,? FROM v7_program_contracts WHERE id=? AND channel_id=? AND version=?")
        .bind(decisionId, "CANONICAL_PORTFOLIO", body.channelId, body.programId, body.expectedAggregateVersion, decisionVersion, body.action, body.candidateId, body.candidateVersion, body.evidenceVersion, actorEmail, actorDisplayName, "OWNER_EXPERT", body.rationale, body.reusableAsset.type, body.reusableAsset.summary, idempotencyKey, requestHash, correlationId, causationId, supersedesDecisionId, now, body.programId, body.channelId, body.expectedAggregateVersion),
      db.prepare("INSERT INTO niche_expert_decision_audits (id,decision_id,program_id,channel_id,event_type,actor_email,actor_role,idempotency_key,request_hash,correlation_id,causation_id,evidence_lineage_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .bind(auditId, decisionId, body.programId, body.channelId, "NICHE_EXPERT_DECISION_RECORDED", actorEmail, "OWNER_EXPERT", idempotencyKey, requestHash, correlationId, causationId, lineageId, now),
      db.prepare("INSERT INTO v7_evidence_lineage (id,program_id,project_id,entity_type,title,lifecycle_state,upstream_evidence_id,artifact_key,content_hash,storage_state,rights_state,cost_state,quarantine_state,pipeline_version,created_at,updated_at) VALUES (?,?,?,?,?,'FROZEN',?,?,?,'CANONICAL_D1','NOT_APPLICABLE','ZERO_SPEND','CLEAR',7,?,?)")
        .bind(lineageId, body.programId, null, "NICHE_EXPERT_DECISION", `Owner/expert niche decision v${decisionVersion}`, upstreamEvidenceId, body.candidateId, requestHash, now, now),
    ]);
  } catch {
    const racedReplay = await first(db, "SELECT * FROM niche_expert_decisions WHERE idempotency_key=? LIMIT 1", idempotencyKey);
    if (racedReplay && clean(racedReplay.request_hash) === requestHash) return receipt(racedReplay, true);
    const currentProgram = await first(db, "SELECT version FROM v7_program_contracts WHERE id=? AND channel_id=? LIMIT 1", body.programId, body.channelId);
    if (!currentProgram || Number(currentProgram.version) !== body.expectedAggregateVersion) throw new NicheDecisionCommandError("AGGREGATE_VERSION_CONFLICT", 409, "The channel aggregate changed before the decision could be recorded");
    throw new NicheDecisionCommandError("DECISION_VERSION_CONFLICT", 409, "A concurrent expert decision won; reload before deciding");
  }

  const stored = await first(db, "SELECT * FROM niche_expert_decisions WHERE id=? LIMIT 1", decisionId);
  if (!stored || clean(stored.request_hash) !== requestHash) throw new NicheDecisionCommandError("DECISION_COMMIT_NOT_VERIFIED", 503, "The decision write could not be verified");
  return receipt(stored, false);
}
