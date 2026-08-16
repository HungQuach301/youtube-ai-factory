import { resolveActiveNichePriority, type NicheGovernanceDB } from "@/lib/niche-governance-command";

export const CHANNEL_STRATEGY_ACTIVATION_VERSION = "CHANNEL_STRATEGY_ACTIVATION_V1" as const;
const PORTFOLIO_ID = "CANONICAL_PORTFOLIO";
type Row = Record<string, unknown>;
export type ChannelStrategyActivationActor = { email: string; displayName: string; role: "PORTFOLIO_GOVERNANCE" };
export type ChannelStrategyActivationBody = {
  action: "ACTIVATE_CHANNEL_STRATEGY";
  expectedActivationVersion: number;
  expectedChannelStrategyVersion: number;
  expectedCommitmentVersion: number;
  commitmentId: string;
  strategy: {
    owner: string;
    rationale: string;
    viewerPromise: string;
    differentiation: string;
    audienceFocus: string;
    contentBoundaries: string[];
    successMeasures: string[];
    reviewCadenceDays: number;
    commitmentReviewed: true;
    activationAcknowledged: true;
  };
};
export type ChannelStrategyActivationCommand = { body: ChannelStrategyActivationBody; actor: ChannelStrategyActivationActor; idempotencyKey: string; correlationId?: string | null; causationId?: string | null };
export type ChannelStrategyActivationReceipt = {
  contract: typeof CHANNEL_STRATEGY_ACTIVATION_VERSION;
  outcome: "RECORDED" | "IDEMPOTENT_REPLAY";
  state: "CHANNEL_STRATEGY_ACTIVATED";
  activation: { id: string; activationVersion: number; channelStrategyVersion: number; commitmentId: string; commitmentVersion: number; channelId: string; programId: string; opportunityId: string; owner: string; rationale: string; viewerPromise: string; differentiation: string; audienceFocus: string; contentBoundaries: string[]; successMeasures: string[]; reviewCadenceDays: number; activatedBy: string; activatedAt: string };
  authority: { authenticated: true; authorized: true; providerRequests: 0; spendUsd: 0; aggregateScore: null; systemRankMutation: false; expertPriorityMutation: false; selectionMutation: false; commitmentMutation: false; axisMutation: false; evidenceSufficiencyMutation: false; eligibilityMutation: false; legacyChannelNicheMutation: false; channelStrategyBindingMutation: true; channelStrategyActivation: true };
  nextAction: "OPEN_CHANNEL_STRATEGY";
};

export class ChannelStrategyActivationError extends Error {
  constructor(public readonly code: string, public readonly status: number, message: string) { super(message); this.name = "ChannelStrategyActivationError"; }
}
function clean(value: unknown) { return String(value ?? "").trim(); }
function object(value: unknown, field: string) { if (!value || typeof value !== "object" || Array.isArray(value)) throw new ChannelStrategyActivationError("COMMAND_VALIDATION_FAILED", 400, `${field} must be an object`); return value as Row; }
function text(value: unknown, field: string, min = 1, max = 4000) { const result = clean(value); if (result.length < min || result.length > max) throw new ChannelStrategyActivationError("COMMAND_VALIDATION_FAILED", 400, `${field} must contain ${min}-${max} characters`); return result; }
function integer(value: unknown, field: string, min: number, max: number) { const result = Number(value); if (!Number.isInteger(result) || result < min || result > max) throw new ChannelStrategyActivationError("COMMAND_VALIDATION_FAILED", 400, `${field} must be an integer between ${min} and ${max}`); return result; }
function list(value: unknown, field: string, min = 1, max = 12) { if (!Array.isArray(value) || value.length < min || value.length > max) throw new ChannelStrategyActivationError("COMMAND_VALIDATION_FAILED", 400, `${field} must contain ${min}-${max} items`); const result = value.map((item, index) => text(item, `${field}[${index}]`, 8, 800)); if (new Set(result).size !== result.length) throw new ChannelStrategyActivationError("COMMAND_VALIDATION_FAILED", 400, `${field} must not contain duplicates`); return result; }
function confirmed(value: unknown, field: string): true { if (value !== true) throw new ChannelStrategyActivationError("ACTIVATION_CONFIRMATION_REQUIRED", 400, `${field} must be explicitly confirmed`); return true; }
function parseArray(value: unknown) { try { const result = JSON.parse(clean(value)); return Array.isArray(result) ? result.map(clean).filter(Boolean) : []; } catch { return []; } }
async function first(db: NicheGovernanceDB, query: string, ...values: unknown[]) { return ((await db.prepare(query).bind(...values).all<Row>()).results || [])[0] || null; }
async function sha256(value: string) { const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join(""); }

export function parseChannelStrategyActivationBody(value: unknown): ChannelStrategyActivationBody {
  const row = object(value, "command");
  if (clean(row.action).toUpperCase() !== "ACTIVATE_CHANNEL_STRATEGY") throw new ChannelStrategyActivationError("COMMAND_VALIDATION_FAILED", 400, "action must be ACTIVATE_CHANNEL_STRATEGY");
  const strategy = object(row.strategy, "strategy");
  return {
    action: "ACTIVATE_CHANNEL_STRATEGY",
    expectedActivationVersion: integer(row.expectedActivationVersion, "expectedActivationVersion", 0, Number.MAX_SAFE_INTEGER),
    expectedChannelStrategyVersion: integer(row.expectedChannelStrategyVersion, "expectedChannelStrategyVersion", 0, Number.MAX_SAFE_INTEGER),
    expectedCommitmentVersion: integer(row.expectedCommitmentVersion, "expectedCommitmentVersion", 1, Number.MAX_SAFE_INTEGER),
    commitmentId: text(row.commitmentId, "commitmentId", 1, 256),
    strategy: {
      owner: text(strategy.owner, "strategy.owner", 3, 256), rationale: text(strategy.rationale, "strategy.rationale", 30),
      viewerPromise: text(strategy.viewerPromise, "strategy.viewerPromise", 20, 1000), differentiation: text(strategy.differentiation, "strategy.differentiation", 20, 1000), audienceFocus: text(strategy.audienceFocus, "strategy.audienceFocus", 20, 1000),
      contentBoundaries: list(strategy.contentBoundaries, "strategy.contentBoundaries"), successMeasures: list(strategy.successMeasures, "strategy.successMeasures"),
      reviewCadenceDays: integer(strategy.reviewCadenceDays, "strategy.reviewCadenceDays", 7, 365), commitmentReviewed: confirmed(strategy.commitmentReviewed, "strategy.commitmentReviewed"), activationAcknowledged: confirmed(strategy.activationAcknowledged, "strategy.activationAcknowledged"),
    },
  };
}
export function validateChannelStrategyActivationIdempotencyKey(value: unknown) { const key = text(value, "Idempotency-Key", 12, 200); if (!/^[A-Za-z0-9._:-]+$/.test(key)) throw new ChannelStrategyActivationError("COMMAND_VALIDATION_FAILED", 400, "Idempotency-Key contains unsupported characters"); return key; }
function receipt(row: Row, replay: boolean): ChannelStrategyActivationReceipt {
  return { contract: CHANNEL_STRATEGY_ACTIVATION_VERSION, outcome: replay ? "IDEMPOTENT_REPLAY" : "RECORDED", state: "CHANNEL_STRATEGY_ACTIVATED", activation: { id: clean(row.id), activationVersion: Number(row.activation_version), channelStrategyVersion: Number(row.channel_strategy_version), commitmentId: clean(row.commitment_id), commitmentVersion: Number(row.commitment_version), channelId: clean(row.channel_id), programId: clean(row.program_id), opportunityId: clean(row.opportunity_id), owner: clean(row.strategy_owner), rationale: clean(row.rationale), viewerPromise: clean(row.viewer_promise), differentiation: clean(row.differentiation), audienceFocus: clean(row.audience_focus), contentBoundaries: parseArray(row.content_boundaries_json), successMeasures: parseArray(row.success_measures_json), reviewCadenceDays: Number(row.review_cadence_days), activatedBy: clean(row.actor_display_name) || clean(row.actor_email), activatedAt: clean(row.created_at) }, authority: { authenticated: true, authorized: true, providerRequests: 0, spendUsd: 0, aggregateScore: null, systemRankMutation: false, expertPriorityMutation: false, selectionMutation: false, commitmentMutation: false, axisMutation: false, evidenceSufficiencyMutation: false, eligibilityMutation: false, legacyChannelNicheMutation: false, channelStrategyBindingMutation: true, channelStrategyActivation: true }, nextAction: "OPEN_CHANNEL_STRATEGY" };
}

export async function submitChannelStrategyActivation(db: NicheGovernanceDB, command: ChannelStrategyActivationCommand): Promise<ChannelStrategyActivationReceipt> {
  if (command.actor.role !== "PORTFOLIO_GOVERNANCE") throw new ChannelStrategyActivationError("PORTFOLIO_GOVERNANCE_AUTHORIZATION_REQUIRED", 403, "Activation requires Portfolio Governance authority");
  const body = parseChannelStrategyActivationBody(command.body), idempotencyKey = validateChannelStrategyActivationIdempotencyKey(command.idempotencyKey), actorEmail = clean(command.actor.email).toLowerCase(), actorDisplayName = text(command.actor.displayName, "actor.displayName", 1, 256);
  if (!actorEmail) throw new ChannelStrategyActivationError("CHANNEL_STRATEGY_AUTHORIZATION_REQUIRED", 403, "An authorized identity is required");
  const requestHash = await sha256(JSON.stringify({ actorEmail, ...body }));
  const replay = await first(db, "SELECT * FROM channel_strategy_activations WHERE idempotency_key=? LIMIT 1", idempotencyKey);
  if (replay) { if (clean(replay.request_hash) !== requestHash) throw new ChannelStrategyActivationError("IDEMPOTENCY_KEY_REUSED", 409, "The idempotency key is already bound to another activation"); return receipt(replay, true); }
  const latestActivation = await first(db, "SELECT * FROM channel_strategy_activations WHERE portfolio_id=? ORDER BY activation_version DESC LIMIT 1", PORTFOLIO_ID);
  if (Number(latestActivation?.activation_version || 0) !== body.expectedActivationVersion) throw new ChannelStrategyActivationError("ACTIVATION_VERSION_CONFLICT", 409, "A newer activation version exists; reload before submitting");
  const commitment = await first(db, "SELECT * FROM niche_portfolio_commitments WHERE portfolio_id=? ORDER BY commitment_version DESC LIMIT 1", PORTFOLIO_ID);
  if (!commitment || clean(commitment.id) !== body.commitmentId || Number(commitment.commitment_version) !== body.expectedCommitmentVersion) throw new ChannelStrategyActivationError("ACTIVE_COMMITMENT_REQUIRED", 409, "Activation requires the latest explicit Slice 7 commitment");
  const channelId = clean(commitment.channel_id), latestForChannel = await first(db, "SELECT * FROM channel_strategy_activations WHERE channel_id=? ORDER BY channel_strategy_version DESC LIMIT 1", channelId);
  if (Number(latestForChannel?.channel_strategy_version || 0) !== body.expectedChannelStrategyVersion) throw new ChannelStrategyActivationError("CHANNEL_STRATEGY_VERSION_CONFLICT", 409, "A newer Channel Strategy version exists; reload before submitting");
  const selection = await first(db, "SELECT * FROM niche_portfolio_selections WHERE portfolio_id=? ORDER BY selection_version DESC LIMIT 1", PORTFOLIO_ID);
  if (!selection || clean(commitment.selection_id) !== clean(selection.id) || Number(commitment.selection_version) !== Number(selection.selection_version)) throw new ChannelStrategyActivationError("ACTIVE_COMMITMENT_STALE", 409, "The commitment no longer binds the latest explicit selection");
  let active; try { active = await resolveActiveNichePriority(db); } catch { throw new ChannelStrategyActivationError("ACTIVE_COMMITMENT_STALE", 409, "The committed priority or evidence lineage is stale; recommit before activation"); }
  const opportunityId = clean(commitment.opportunity_id), item = active.priorityItems.find((candidate) => clean(candidate.opportunity_id) === opportunityId), assessment = active.latestScoring.get(opportunityId);
  if (!item || !assessment || clean(assessment.comparison_eligibility) !== "ELIGIBLE" || clean(commitment.priority_set_id) !== clean(active.prioritySet.id) || Number(commitment.priority_version) !== Number(active.prioritySet.priority_version) || clean(commitment.comparable_set_hash) !== active.comparableSetHash || Number(commitment.aggregate_version) !== Number(item.aggregate_version) || Number(commitment.evidence_version) !== Number(item.evidence_version) || Number(commitment.scoring_version) !== Number(item.scoring_version)) throw new ChannelStrategyActivationError("ACTIVE_COMMITMENT_STALE", 409, "The commitment is stale against the current program, evidence, scoring or priority lineage");
  const activationVersion = body.expectedActivationVersion + 1, channelStrategyVersion = body.expectedChannelStrategyVersion + 1, activationId = `channel-strategy-activation:${crypto.randomUUID()}`, auditId = `${activationId}:audit`, lineageId = `${activationId}:lineage`, now = new Date().toISOString(), correlationId = command.correlationId ? text(command.correlationId, "X-Correlation-Id", 1, 256) : `channel-strategy-activation:${idempotencyKey}`, causationId = command.causationId ? text(command.causationId, "X-Causation-Id", 1, 256) : clean(commitment.id);
  const values = [activationId, PORTFOLIO_ID, activationVersion, channelStrategyVersion, "ACTIVATE_CHANNEL_STRATEGY", "ACTIVATED", clean(commitment.id), Number(commitment.commitment_version), clean(commitment.selection_id), Number(commitment.selection_version), clean(commitment.priority_set_id), Number(commitment.priority_version), clean(commitment.comparable_set_hash), channelId, clean(commitment.program_id), opportunityId, clean(commitment.opportunity_origin), Number(commitment.aggregate_version), Number(commitment.evidence_version), Number(commitment.scoring_version), Number(commitment.system_rank_at_commitment), Number(commitment.expert_priority_at_commitment), body.strategy.owner, body.strategy.rationale, body.strategy.viewerPromise, body.strategy.differentiation, body.strategy.audienceFocus, JSON.stringify(body.strategy.contentBoundaries), JSON.stringify(body.strategy.successMeasures), body.strategy.reviewCadenceDays, true, true, actorEmail, actorDisplayName, "PORTFOLIO_GOVERNANCE", idempotencyKey, requestHash, correlationId, causationId, clean(latestActivation?.id) || null, clean(latestForChannel?.id) || null, now];
  try { await db.batch([
    db.prepare("INSERT INTO channel_strategy_activations (id,portfolio_id,activation_version,channel_strategy_version,action,lifecycle_state,commitment_id,commitment_version,selection_id,selection_version,priority_set_id,priority_version,comparable_set_hash,channel_id,program_id,opportunity_id,opportunity_origin,aggregate_version,evidence_version,scoring_version,system_rank_at_activation,expert_priority_at_activation,strategy_owner,rationale,viewer_promise,differentiation,audience_focus,content_boundaries_json,success_measures_json,review_cadence_days,commitment_reviewed,activation_acknowledged,actor_email,actor_display_name,actor_role,idempotency_key,request_hash,correlation_id,causation_id,supersedes_activation_id,supersedes_channel_strategy_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(...values),
    db.prepare("INSERT INTO channel_strategy_activation_audits (id,activation_id,portfolio_id,channel_id,event_type,actor_email,actor_role,idempotency_key,request_hash,correlation_id,causation_id,evidence_lineage_id,created_at) VALUES (?,?,?,?, 'CHANNEL_STRATEGY_ACTIVATED',?,'PORTFOLIO_GOVERNANCE',?,?,?,?,?,?)").bind(auditId, activationId, PORTFOLIO_ID, channelId, actorEmail, idempotencyKey, requestHash, correlationId, causationId, lineageId, now),
    db.prepare("INSERT INTO v7_evidence_lineage (id,program_id,project_id,entity_type,title,lifecycle_state,upstream_evidence_id,artifact_key,content_hash,storage_state,rights_state,cost_state,quarantine_state,pipeline_version,created_at,updated_at) VALUES (?,?,?,?,?,'FROZEN',?,?,?,'CANONICAL_D1','NOT_APPLICABLE','ZERO_SPEND','CLEAR',8,?,?)").bind(lineageId, clean(commitment.program_id), opportunityId, "CHANNEL_STRATEGY_ACTIVATION", `Channel Strategy activation v${channelStrategyVersion}`, clean(commitment.id), activationId, requestHash, now, now),
  ]); } catch { const raced = await first(db, "SELECT * FROM channel_strategy_activations WHERE idempotency_key=? LIMIT 1", idempotencyKey); if (raced && clean(raced.request_hash) === requestHash) return receipt(raced, true); const current = await first(db, "SELECT * FROM channel_strategy_activations WHERE portfolio_id=? ORDER BY activation_version DESC LIMIT 1", PORTFOLIO_ID); if (Number(current?.activation_version || 0) !== body.expectedActivationVersion) throw new ChannelStrategyActivationError("ACTIVATION_VERSION_CONFLICT", 409, "A concurrent activation won; reload before submitting"); throw new ChannelStrategyActivationError("ACTIVATION_COMMIT_FAILED", 503, "The Channel Strategy activation could not be recorded atomically"); }
  const stored = await first(db, "SELECT * FROM channel_strategy_activations WHERE id=? LIMIT 1", activationId); if (!stored || clean(stored.request_hash) !== requestHash) throw new ChannelStrategyActivationError("ACTIVATION_COMMIT_NOT_VERIFIED", 503, "The activation write could not be verified"); return receipt(stored, false);
}
