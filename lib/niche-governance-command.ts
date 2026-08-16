export const NICHE_GOVERNANCE_COMMAND_VERSION = "NICHE_COMMITMENT_GOVERNANCE_V1" as const;
const PORTFOLIO_ID = "CANONICAL_PORTFOLIO";

type Row = Record<string, unknown>;
type D1Result = { meta?: { changes?: number } };
type Statement = { bind: (...values: unknown[]) => Statement; all: <T>() => Promise<{ results?: T[] }>; run: () => Promise<D1Result> };
export type NicheGovernanceDB = { prepare: (query: string) => Statement; batch: (statements: Statement[]) => Promise<D1Result[]> };
export type NicheGovernanceActor = { email: string; displayName: string; role: "OWNER_EXPERT" | "PORTFOLIO_GOVERNANCE" };

export type NicheSelectionBody = {
  action: "SELECT_NICHE_FOR_COMMITMENT";
  expectedSelectionVersion: number;
  expectedPriorityVersion: number;
  expectedComparableSetHash: string;
  opportunityId: string;
  rationale: string;
  tradeoffs: string[];
  commitmentConditions: string[];
};
export type NicheCommitmentBody = {
  action: "COMMIT_NICHE";
  expectedCommitmentVersion: number;
  expectedSelectionVersion: number;
  selectionId: string;
  governance: {
    owner: string;
    rationale: string;
    riskAcceptance: string;
    reviewCadenceDays: number;
    revisitTriggers: string[];
    evidenceReviewed: true;
    priorityReviewed: true;
    noActivationAcknowledged: true;
  };
};
export type NicheGovernanceBody = NicheSelectionBody | NicheCommitmentBody;
export type NicheGovernanceCommand = { body: NicheGovernanceBody; actor: NicheGovernanceActor; idempotencyKey: string; correlationId?: string | null; causationId?: string | null };
export type NicheGovernanceReceipt = {
  contract: typeof NICHE_GOVERNANCE_COMMAND_VERSION;
  outcome: "RECORDED" | "IDEMPOTENT_REPLAY";
  state: "SELECTED_PENDING_COMMITMENT" | "COMMITTED";
  selection: { id: string; version: number; opportunityId: string; priorityVersion: number; systemRank: number; expertPriority: number; rationale: string; tradeoffs: string[]; commitmentConditions: string[]; recordedBy: string; recordedAt: string };
  commitment: null | { id: string; version: number; selectionId: string; opportunityId: string; governanceOwner: string; rationale: string; riskAcceptance: string; reviewCadenceDays: number; revisitTriggers: string[]; committedBy: string; committedAt: string };
  authority: { authenticated: true; authorized: true; providerRequests: 0; spendUsd: 0; aggregateScore: null; systemRankMutation: false; expertPriorityMutation: false; axisMutation: false; evidenceSufficiencyMutation: false; eligibilityMutation: false; nicheSelection: boolean; nicheCommitment: boolean; channelNicheMutation: false; channelStrategyActivation: false };
  nextAction: "COMMIT_NICHE" | "AWAIT_SLICE_8_CHANNEL_STRATEGY_ACTIVATION";
};

export class NicheGovernanceCommandError extends Error {
  constructor(public readonly code: string, public readonly status: number, message: string) { super(message); this.name = "NicheGovernanceCommandError"; }
}

function clean(value: unknown) { return String(value ?? "").trim(); }
function text(value: unknown, field: string, min = 1, max = 2000) { const result = clean(value); if (result.length < min || result.length > max) throw new NicheGovernanceCommandError("COMMAND_VALIDATION_FAILED", 400, `${field} must contain ${min}-${max} characters`); return result; }
function integer(value: unknown, field: string, min: number, max: number) { const result = Number(value); if (!Number.isInteger(result) || result < min || result > max) throw new NicheGovernanceCommandError("COMMAND_VALIDATION_FAILED", 400, `${field} must be an integer between ${min} and ${max}`); return result; }
function hash(value: unknown, field: string) { const result = text(value, field, 64, 64).toLowerCase(); if (!/^[a-f0-9]{64}$/.test(result)) throw new NicheGovernanceCommandError("COMMAND_VALIDATION_FAILED", 400, `${field} must be a SHA-256 digest`); return result; }
function list(value: unknown, field: string, min = 1, max = 12) { if (!Array.isArray(value) || value.length < min || value.length > max) throw new NicheGovernanceCommandError("COMMAND_VALIDATION_FAILED", 400, `${field} must contain ${min}-${max} items`); const items = value.map((item, index) => text(item, `${field}[${index}]`, 8, 800)); if (new Set(items).size !== items.length) throw new NicheGovernanceCommandError("COMMAND_VALIDATION_FAILED", 400, `${field} must not contain duplicates`); return items; }
function object(value: unknown, field: string) { if (!value || typeof value !== "object" || Array.isArray(value)) throw new NicheGovernanceCommandError("COMMAND_VALIDATION_FAILED", 400, `${field} must be an object`); return value as Row; }
function trueValue(value: unknown, field: string): true { if (value !== true) throw new NicheGovernanceCommandError("GOVERNANCE_CONFIRMATION_REQUIRED", 400, `${field} must be explicitly confirmed`); return true; }
function parseArray(value: unknown) { try { const result = JSON.parse(clean(value)); return Array.isArray(result) ? result.map(clean).filter(Boolean) : []; } catch { return []; } }

export function parseNicheGovernanceBody(value: unknown): NicheGovernanceBody {
  const row = object(value, "command"); const action = clean(row.action).toUpperCase();
  if (action === "SELECT_NICHE_FOR_COMMITMENT") return {
    action, expectedSelectionVersion: integer(row.expectedSelectionVersion, "expectedSelectionVersion", 0, Number.MAX_SAFE_INTEGER),
    expectedPriorityVersion: integer(row.expectedPriorityVersion, "expectedPriorityVersion", 1, Number.MAX_SAFE_INTEGER), expectedComparableSetHash: hash(row.expectedComparableSetHash, "expectedComparableSetHash"),
    opportunityId: text(row.opportunityId, "opportunityId", 1, 256), rationale: text(row.rationale, "rationale", 20, 4000), tradeoffs: list(row.tradeoffs, "tradeoffs"), commitmentConditions: list(row.commitmentConditions, "commitmentConditions"),
  };
  if (action === "COMMIT_NICHE") { const governance = object(row.governance, "governance"); return {
    action, expectedCommitmentVersion: integer(row.expectedCommitmentVersion, "expectedCommitmentVersion", 0, Number.MAX_SAFE_INTEGER), expectedSelectionVersion: integer(row.expectedSelectionVersion, "expectedSelectionVersion", 1, Number.MAX_SAFE_INTEGER), selectionId: text(row.selectionId, "selectionId", 1, 256),
    governance: { owner: text(governance.owner, "governance.owner", 3, 256), rationale: text(governance.rationale, "governance.rationale", 30, 4000), riskAcceptance: text(governance.riskAcceptance, "governance.riskAcceptance", 20, 2000), reviewCadenceDays: integer(governance.reviewCadenceDays, "governance.reviewCadenceDays", 7, 365), revisitTriggers: list(governance.revisitTriggers, "governance.revisitTriggers"), evidenceReviewed: trueValue(governance.evidenceReviewed, "governance.evidenceReviewed"), priorityReviewed: trueValue(governance.priorityReviewed, "governance.priorityReviewed"), noActivationAcknowledged: trueValue(governance.noActivationAcknowledged, "governance.noActivationAcknowledged") },
  }; }
  throw new NicheGovernanceCommandError("COMMAND_VALIDATION_FAILED", 400, "action must be SELECT_NICHE_FOR_COMMITMENT or COMMIT_NICHE");
}
export function validateNicheGovernanceIdempotencyKey(value: unknown) { const key = text(value, "Idempotency-Key", 12, 200); if (!/^[A-Za-z0-9._:-]+$/.test(key)) throw new NicheGovernanceCommandError("COMMAND_VALIDATION_FAILED", 400, "Idempotency-Key contains unsupported characters"); return key; }
async function first(db: NicheGovernanceDB, query: string, ...values: unknown[]) { return ((await db.prepare(query).bind(...values).all<Row>()).results || [])[0] || null; }
async function all(db: NicheGovernanceDB, query: string, ...values: unknown[]) { return (await db.prepare(query).bind(...values).all<Row>()).results || []; }
async function sha256(value: string) { const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join(""); }

async function activePriority(db: NicheGovernanceDB) {
  const prioritySet = await first(db, "SELECT * FROM niche_expert_priority_sets WHERE portfolio_id=? ORDER BY priority_version DESC LIMIT 1", PORTFOLIO_ID);
  if (!prioritySet) throw new NicheGovernanceCommandError("ACTIVE_PRIORITY_REQUIRED", 409, "Record an active Slice 6 expert-priority set before selection");
  const priorityItems = await all(db, "SELECT * FROM niche_expert_priority_items WHERE priority_set_id=? ORDER BY expert_priority,id", clean(prioritySet.id));
  const programRows = await all(db, "SELECT id,channel_id,version,updated_at FROM v7_program_contracts ORDER BY updated_at DESC,id");
  const latestPrograms = new Map<string, Row>(); for (const program of programRows) if (!latestPrograms.has(clean(program.channel_id))) latestPrograms.set(clean(program.channel_id), program);
  const programs = [...latestPrograms.values()], programIds = programs.map((program) => clean(program.id));
  if (!programIds.length) throw new NicheGovernanceCommandError("ACTIVE_PRIORITY_STALE", 409, "The selected priority set has no current canonical program");
  const scoringRows = await all(db, `SELECT * FROM niche_scoring_assessments WHERE program_id IN (${programIds.map(() => "?").join(",")}) ORDER BY scoring_version DESC,id`, ...programIds);
  const latestScoring = new Map<string, Row>(); for (const assessment of scoringRows) { const current = latestScoring.get(clean(assessment.opportunity_id)); if (!current || Number(assessment.scoring_version) > Number(current.scoring_version)) latestScoring.set(clean(assessment.opportunity_id), assessment); }
  const comparable = [...latestScoring.values()].filter((assessment) => clean(assessment.sufficiency_state) === "SUFFICIENT");
  const comparableIds = comparable.map((item) => clean(item.opportunity_id)).sort(), priorityIds = priorityItems.map((item) => clean(item.opportunity_id)).sort();
  if (comparableIds.length < 2 || comparableIds.length !== priorityIds.length || comparableIds.some((id, index) => id !== priorityIds[index])) throw new NicheGovernanceCommandError("ACTIVE_PRIORITY_STALE", 409, "Comparable membership changed; record a new Slice 6 priority version");
  const programsById = new Map(programs.map((program) => [clean(program.id), program]));
  const bindingsCurrent = priorityItems.every((item) => { const assessment = latestScoring.get(clean(item.opportunity_id)), program = programsById.get(clean(item.program_id)); return assessment && program && Number(program.version) === Number(item.aggregate_version) && Number(assessment.evidence_version) === Number(item.evidence_version) && Number(assessment.scoring_version) === Number(item.scoring_version); });
  if (!bindingsCurrent) throw new NicheGovernanceCommandError("ACTIVE_PRIORITY_STALE", 409, "A bound program, evidence or scoring version changed; reprioritize before selection");
  comparable.sort((a, b) => { const tier = (row: Row) => clean(row.comparison_eligibility) === "ELIGIBLE" ? 0 : 1; return tier(a) - tier(b) || Number(b.market_attractiveness_score) - Number(a.market_attractiveness_score) || Number(b.ability_to_win_score) - Number(a.ability_to_win_score) || Number(b.evidence_confidence_score) - Number(a.evidence_confidence_score) || clean(a.channel_id).localeCompare(clean(b.channel_id)) || clean(a.opportunity_id).localeCompare(clean(b.opportunity_id)); });
  const systemRanks = new Map(comparable.map((item, index) => [clean(item.opportunity_id), index + 1]));
  const comparableSetHash = await sha256(JSON.stringify([...comparable].sort((a, b) => clean(a.opportunity_id).localeCompare(clean(b.opportunity_id))).map((item) => ({ opportunityId: clean(item.opportunity_id), channelId: clean(item.channel_id), programId: clean(item.program_id), aggregateVersion: Number(programsById.get(clean(item.program_id))?.version), evidenceVersion: Number(item.evidence_version), scoringVersion: Number(item.scoring_version), eligibility: clean(item.comparison_eligibility), marketAttractiveness: Number(item.market_attractiveness_score), abilityToWin: Number(item.ability_to_win_score), evidenceConfidence: Number(item.evidence_confidence_score) }))));
  if (comparableSetHash !== clean(prioritySet.comparable_set_hash)) throw new NicheGovernanceCommandError("ACTIVE_PRIORITY_STALE", 409, "The comparable portfolio changed; record a new Slice 6 priority version");
  return { prioritySet, priorityItems, latestScoring, programsById, systemRanks, comparableSetHash };
}

function selectionReceipt(row: Row, replay: boolean): NicheGovernanceReceipt {
  return { contract: NICHE_GOVERNANCE_COMMAND_VERSION, outcome: replay ? "IDEMPOTENT_REPLAY" : "RECORDED", state: "SELECTED_PENDING_COMMITMENT", selection: { id: clean(row.id), version: Number(row.selection_version), opportunityId: clean(row.opportunity_id), priorityVersion: Number(row.priority_version), systemRank: Number(row.system_rank_at_selection), expertPriority: Number(row.expert_priority_at_selection), rationale: clean(row.rationale), tradeoffs: parseArray(row.tradeoffs_json), commitmentConditions: parseArray(row.commitment_conditions_json), recordedBy: clean(row.actor_display_name) || clean(row.actor_email), recordedAt: clean(row.created_at) }, commitment: null, authority: { authenticated: true, authorized: true, providerRequests: 0, spendUsd: 0, aggregateScore: null, systemRankMutation: false, expertPriorityMutation: false, axisMutation: false, evidenceSufficiencyMutation: false, eligibilityMutation: false, nicheSelection: true, nicheCommitment: false, channelNicheMutation: false, channelStrategyActivation: false }, nextAction: "COMMIT_NICHE" };
}
function commitmentReceipt(selection: Row, row: Row, replay: boolean): NicheGovernanceReceipt {
  const base = selectionReceipt(selection, replay); return { ...base, outcome: replay ? "IDEMPOTENT_REPLAY" : "RECORDED", state: "COMMITTED", commitment: { id: clean(row.id), version: Number(row.commitment_version), selectionId: clean(row.selection_id), opportunityId: clean(row.opportunity_id), governanceOwner: clean(row.governance_owner), rationale: clean(row.rationale), riskAcceptance: clean(row.risk_acceptance), reviewCadenceDays: Number(row.review_cadence_days), revisitTriggers: parseArray(row.revisit_triggers_json), committedBy: clean(row.actor_display_name) || clean(row.actor_email), committedAt: clean(row.created_at) }, authority: { ...base.authority, nicheSelection: false, nicheCommitment: true }, nextAction: "AWAIT_SLICE_8_CHANNEL_STRATEGY_ACTIVATION" };
}

async function selectNiche(db: NicheGovernanceDB, command: NicheGovernanceCommand & { body: NicheSelectionBody }, idempotencyKey: string, actorEmail: string, actorDisplayName: string, requestHash: string) {
  if (command.actor.role !== "OWNER_EXPERT") throw new NicheGovernanceCommandError("OWNER_EXPERT_AUTHORIZATION_REQUIRED", 403, "Selection requires an authorized owner/expert");
  const replay = await first(db, "SELECT * FROM niche_portfolio_selections WHERE idempotency_key=? LIMIT 1", idempotencyKey); if (replay) { if (clean(replay.request_hash) !== requestHash) throw new NicheGovernanceCommandError("IDEMPOTENCY_KEY_REUSED", 409, "The idempotency key is already bound to a different selection"); return selectionReceipt(replay, true); }
  const latestSelection = await first(db, "SELECT * FROM niche_portfolio_selections WHERE portfolio_id=? ORDER BY selection_version DESC LIMIT 1", PORTFOLIO_ID);
  if (Number(latestSelection?.selection_version || 0) !== command.body.expectedSelectionVersion) throw new NicheGovernanceCommandError("SELECTION_VERSION_CONFLICT", 409, "A newer selection version exists; reload before submitting");
  const active = await activePriority(db);
  if (Number(active.prioritySet.priority_version) !== command.body.expectedPriorityVersion || active.comparableSetHash !== command.body.expectedComparableSetHash) throw new NicheGovernanceCommandError("PRIORITY_VERSION_CONFLICT", 409, "The active Slice 6 priority set changed; reload before selecting");
  const item = active.priorityItems.find((row) => clean(row.opportunity_id) === command.body.opportunityId), assessment = active.latestScoring.get(command.body.opportunityId);
  if (!item || !assessment) throw new NicheGovernanceCommandError("PRIORITIZED_OPPORTUNITY_REQUIRED", 409, "Selection must reference an opportunity in the active priority set");
  if (clean(assessment.comparison_eligibility) !== "ELIGIBLE") throw new NicheGovernanceCommandError("PREREQUISITE_GATE_BLOCKED", 409, "Only an evidence-sufficient opportunity with every prerequisite passed may be selected");
  const selectionVersion = command.body.expectedSelectionVersion + 1, selectionId = `niche-selection:${crypto.randomUUID()}`, auditId = `${selectionId}:audit`, lineageId = `${selectionId}:lineage`, now = new Date().toISOString(), correlationId = command.correlationId ? text(command.correlationId, "X-Correlation-Id", 1, 256) : `niche-selection:${idempotencyKey}`, causationId = command.causationId ? text(command.causationId, "X-Causation-Id", 1, 256) : null, program = active.programsById.get(clean(item.program_id))!;
  const values = [selectionId, PORTFOLIO_ID, selectionVersion, "SELECT_NICHE_FOR_COMMITMENT", "SELECTED_PENDING_COMMITMENT", clean(active.prioritySet.id), Number(active.prioritySet.priority_version), active.comparableSetHash, clean(item.channel_id), clean(item.program_id), command.body.opportunityId, clean(item.opportunity_origin), Number(program.version), Number(item.evidence_version), Number(item.scoring_version), active.systemRanks.get(command.body.opportunityId), Number(item.expert_priority), command.body.rationale, JSON.stringify(command.body.tradeoffs), JSON.stringify(command.body.commitmentConditions), actorEmail, actorDisplayName, "OWNER_EXPERT", idempotencyKey, requestHash, correlationId, causationId, clean(latestSelection?.id) || null, now];
  try { await db.batch([
    db.prepare("INSERT INTO niche_portfolio_selections (id,portfolio_id,selection_version,action,lifecycle_state,priority_set_id,priority_version,comparable_set_hash,channel_id,program_id,opportunity_id,opportunity_origin,aggregate_version,evidence_version,scoring_version,system_rank_at_selection,expert_priority_at_selection,rationale,tradeoffs_json,commitment_conditions_json,actor_email,actor_display_name,actor_role,idempotency_key,request_hash,correlation_id,causation_id,supersedes_selection_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(...values),
    db.prepare("INSERT INTO niche_portfolio_selection_audits (id,selection_id,portfolio_id,event_type,actor_email,actor_role,idempotency_key,request_hash,correlation_id,causation_id,evidence_lineage_id,created_at) VALUES (?,?,?,'NICHE_SELECTED_PENDING_COMMITMENT',?,'OWNER_EXPERT',?,?,?,?,?,?)").bind(auditId, selectionId, PORTFOLIO_ID, actorEmail, idempotencyKey, requestHash, correlationId, causationId, lineageId, now),
    db.prepare("INSERT INTO v7_evidence_lineage (id,program_id,project_id,entity_type,title,lifecycle_state,upstream_evidence_id,artifact_key,content_hash,storage_state,rights_state,cost_state,quarantine_state,pipeline_version,created_at,updated_at) VALUES (?,?,?,?,?,'FROZEN',?,?,?,'CANONICAL_D1','NOT_APPLICABLE','ZERO_SPEND','CLEAR',7,?,?)").bind(lineageId, clean(item.program_id), command.body.opportunityId, "NICHE_SELECTION", `Niche selection v${selectionVersion}`, clean(active.prioritySet.id), selectionId, requestHash, now, now),
  ]); } catch { const raced = await first(db, "SELECT * FROM niche_portfolio_selections WHERE idempotency_key=? LIMIT 1", idempotencyKey); if (raced && clean(raced.request_hash) === requestHash) return selectionReceipt(raced, true); const current = await first(db, "SELECT * FROM niche_portfolio_selections WHERE portfolio_id=? ORDER BY selection_version DESC LIMIT 1", PORTFOLIO_ID); if (Number(current?.selection_version || 0) !== command.body.expectedSelectionVersion) throw new NicheGovernanceCommandError("SELECTION_VERSION_CONFLICT", 409, "A concurrent selection won; reload before submitting"); throw new NicheGovernanceCommandError("SELECTION_COMMIT_FAILED", 503, "The selection could not be recorded atomically"); }
  const stored = await first(db, "SELECT * FROM niche_portfolio_selections WHERE id=? LIMIT 1", selectionId); if (!stored || clean(stored.request_hash) !== requestHash) throw new NicheGovernanceCommandError("SELECTION_COMMIT_NOT_VERIFIED", 503, "The selection write could not be verified"); return selectionReceipt(stored, false);
}

async function commitNiche(db: NicheGovernanceDB, command: NicheGovernanceCommand & { body: NicheCommitmentBody }, idempotencyKey: string, actorEmail: string, actorDisplayName: string, requestHash: string) {
  if (command.actor.role !== "PORTFOLIO_GOVERNANCE") throw new NicheGovernanceCommandError("PORTFOLIO_GOVERNANCE_AUTHORIZATION_REQUIRED", 403, "Commitment requires Portfolio Governance authority");
  const replay = await first(db, "SELECT * FROM niche_portfolio_commitments WHERE idempotency_key=? LIMIT 1", idempotencyKey); if (replay) { if (clean(replay.request_hash) !== requestHash) throw new NicheGovernanceCommandError("IDEMPOTENCY_KEY_REUSED", 409, "The idempotency key is already bound to a different commitment"); const selection = await first(db, "SELECT * FROM niche_portfolio_selections WHERE id=? LIMIT 1", clean(replay.selection_id)); if (!selection) throw new NicheGovernanceCommandError("COMMITMENT_LINEAGE_INVALID", 503, "The committed selection lineage is unavailable"); return commitmentReceipt(selection, replay, true); }
  const latestCommitment = await first(db, "SELECT * FROM niche_portfolio_commitments WHERE portfolio_id=? ORDER BY commitment_version DESC LIMIT 1", PORTFOLIO_ID);
  if (Number(latestCommitment?.commitment_version || 0) !== command.body.expectedCommitmentVersion) throw new NicheGovernanceCommandError("COMMITMENT_VERSION_CONFLICT", 409, "A newer commitment version exists; reload before submitting");
  const selection = await first(db, "SELECT * FROM niche_portfolio_selections WHERE portfolio_id=? ORDER BY selection_version DESC LIMIT 1", PORTFOLIO_ID);
  if (!selection || clean(selection.id) !== command.body.selectionId || Number(selection.selection_version) !== command.body.expectedSelectionVersion) throw new NicheGovernanceCommandError("ACTIVE_SELECTION_REQUIRED", 409, "Commitment requires the latest explicit selection; direct priority-to-commitment is forbidden");
  const active = await activePriority(db), opportunityId = clean(selection.opportunity_id), item = active.priorityItems.find((row) => clean(row.opportunity_id) === opportunityId), assessment = active.latestScoring.get(opportunityId);
  if (!item || !assessment || clean(selection.priority_set_id) !== clean(active.prioritySet.id) || Number(selection.priority_version) !== Number(active.prioritySet.priority_version) || clean(selection.comparable_set_hash) !== active.comparableSetHash || Number(selection.aggregate_version) !== Number(item.aggregate_version) || Number(selection.evidence_version) !== Number(item.evidence_version) || Number(selection.scoring_version) !== Number(item.scoring_version)) throw new NicheGovernanceCommandError("ACTIVE_SELECTION_STALE", 409, "The selection is stale against the active priority and evidence lineage; select again before commitment");
  if (clean(assessment.comparison_eligibility) !== "ELIGIBLE") throw new NicheGovernanceCommandError("PREREQUISITE_GATE_BLOCKED", 409, "Commitment is blocked because a prerequisite is not passed");
  const commitmentVersion = command.body.expectedCommitmentVersion + 1, commitmentId = `niche-commitment:${crypto.randomUUID()}`, auditId = `${commitmentId}:audit`, lineageId = `${commitmentId}:lineage`, now = new Date().toISOString(), correlationId = command.correlationId ? text(command.correlationId, "X-Correlation-Id", 1, 256) : `niche-commitment:${idempotencyKey}`, causationId = command.causationId ? text(command.causationId, "X-Causation-Id", 1, 256) : selection.id;
  const values = [commitmentId, PORTFOLIO_ID, commitmentVersion, "COMMIT_NICHE", "COMMITTED", clean(selection.id), Number(selection.selection_version), clean(selection.priority_set_id), Number(selection.priority_version), clean(selection.comparable_set_hash), clean(selection.channel_id), clean(selection.program_id), opportunityId, clean(selection.opportunity_origin), Number(selection.aggregate_version), Number(selection.evidence_version), Number(selection.scoring_version), Number(selection.system_rank_at_selection), Number(selection.expert_priority_at_selection), command.body.governance.rationale, command.body.governance.owner, command.body.governance.riskAcceptance, command.body.governance.reviewCadenceDays, JSON.stringify(command.body.governance.revisitTriggers), true, true, true, actorEmail, actorDisplayName, "PORTFOLIO_GOVERNANCE", idempotencyKey, requestHash, correlationId, causationId, clean(latestCommitment?.id) || null, now];
  try { await db.batch([
    db.prepare("INSERT INTO niche_portfolio_commitments (id,portfolio_id,commitment_version,action,lifecycle_state,selection_id,selection_version,priority_set_id,priority_version,comparable_set_hash,channel_id,program_id,opportunity_id,opportunity_origin,aggregate_version,evidence_version,scoring_version,system_rank_at_commitment,expert_priority_at_commitment,rationale,governance_owner,risk_acceptance,review_cadence_days,revisit_triggers_json,evidence_reviewed,priority_reviewed,no_activation_acknowledged,actor_email,actor_display_name,actor_role,idempotency_key,request_hash,correlation_id,causation_id,supersedes_commitment_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(...values),
    db.prepare("INSERT INTO niche_portfolio_commitment_audits (id,commitment_id,portfolio_id,event_type,actor_email,actor_role,idempotency_key,request_hash,correlation_id,causation_id,evidence_lineage_id,created_at) VALUES (?,?,?,'NICHE_COMMITTED',?,'PORTFOLIO_GOVERNANCE',?,?,?,?,?,?)").bind(auditId, commitmentId, PORTFOLIO_ID, actorEmail, idempotencyKey, requestHash, correlationId, causationId, lineageId, now),
    db.prepare("INSERT INTO v7_evidence_lineage (id,program_id,project_id,entity_type,title,lifecycle_state,upstream_evidence_id,artifact_key,content_hash,storage_state,rights_state,cost_state,quarantine_state,pipeline_version,created_at,updated_at) VALUES (?,?,?,?,?,'FROZEN',?,?,?,'CANONICAL_D1','NOT_APPLICABLE','ZERO_SPEND','CLEAR',7,?,?)").bind(lineageId, clean(selection.program_id), opportunityId, "NICHE_COMMITMENT", `Niche commitment v${commitmentVersion}`, clean(selection.id), commitmentId, requestHash, now, now),
  ]); } catch { const raced = await first(db, "SELECT * FROM niche_portfolio_commitments WHERE idempotency_key=? LIMIT 1", idempotencyKey); if (raced && clean(raced.request_hash) === requestHash) return commitmentReceipt(selection, raced, true); const current = await first(db, "SELECT * FROM niche_portfolio_commitments WHERE portfolio_id=? ORDER BY commitment_version DESC LIMIT 1", PORTFOLIO_ID); if (Number(current?.commitment_version || 0) !== command.body.expectedCommitmentVersion) throw new NicheGovernanceCommandError("COMMITMENT_VERSION_CONFLICT", 409, "A concurrent commitment won; reload before submitting"); throw new NicheGovernanceCommandError("COMMITMENT_COMMIT_FAILED", 503, "The commitment could not be recorded atomically"); }
  const stored = await first(db, "SELECT * FROM niche_portfolio_commitments WHERE id=? LIMIT 1", commitmentId); if (!stored || clean(stored.request_hash) !== requestHash) throw new NicheGovernanceCommandError("COMMITMENT_COMMIT_NOT_VERIFIED", 503, "The commitment write could not be verified"); return commitmentReceipt(selection, stored, false);
}

export async function submitNicheGovernanceCommand(db: NicheGovernanceDB, command: NicheGovernanceCommand): Promise<NicheGovernanceReceipt> {
  const body = parseNicheGovernanceBody(command.body), idempotencyKey = validateNicheGovernanceIdempotencyKey(command.idempotencyKey), actorEmail = clean(command.actor.email).toLowerCase(), actorDisplayName = text(command.actor.displayName, "actor.displayName", 1, 256);
  if (!actorEmail) throw new NicheGovernanceCommandError("GOVERNANCE_AUTHORIZATION_REQUIRED", 403, "An authorized identity is required");
  const requestHash = await sha256(JSON.stringify({ actorEmail, ...body })), normalized = { ...command, body };
  return body.action === "SELECT_NICHE_FOR_COMMITMENT" ? selectNiche(db, normalized as NicheGovernanceCommand & { body: NicheSelectionBody }, idempotencyKey, actorEmail, actorDisplayName, requestHash) : commitNiche(db, normalized as NicheGovernanceCommand & { body: NicheCommitmentBody }, idempotencyKey, actorEmail, actorDisplayName, requestHash);
}
