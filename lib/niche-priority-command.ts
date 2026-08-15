export const NICHE_PRIORITY_COMMAND_VERSION = "NICHE_PRIORITY_COMMAND_V1" as const;
const PORTFOLIO_ID = "CANONICAL_PORTFOLIO";

export type NichePriorityOrigin = "SYSTEM_DISCOVERED" | "EXPERT_SEEDED";
export type NichePriorityItem = {
  opportunityId: string;
  priority: number;
  rationale: string;
};
export type NichePriorityBody = {
  action: "SET_NICHE_PRIORITY";
  expectedPriorityVersion: number;
  expectedComparableSetHash: string;
  portfolioRationale: string;
  priorities: NichePriorityItem[];
};
export type NichePriorityActor = { email: string; displayName: string; role: "OWNER_EXPERT" };
export type NichePriorityCommand = { body: NichePriorityBody; actor: NichePriorityActor; idempotencyKey: string; correlationId?: string | null; causationId?: string | null };
export type NichePriorityReceipt = {
  contract: typeof NICHE_PRIORITY_COMMAND_VERSION;
  outcome: "RECORDED" | "IDEMPOTENT_REPLAY";
  prioritySet: { id: string; version: number; comparableSetHash: string; itemCount: number; portfolioRationale: string; recordedAt: string; priorities: Array<{ opportunityId: string; priority: number; rationale: string; scoringVersion: number; evidenceVersion: number }> };
  authority: {
    authenticated: true; authorized: true; providerRequests: 0; spendUsd: 0; aggregateScore: null;
    expertPriorityMutation: true; systemRankMutation: false; axisMutation: false; evidenceSufficiencyMutation: false;
    eligibilityMutation: false; nicheSelection: false; nicheCommitment: false; channelNicheMutation: false; channelStrategyActivation: false;
  };
  nextAction: "REVIEW_EXPERT_PRIORITIES";
};

type Row = Record<string, unknown>;
type D1Result = { meta?: { changes?: number } };
type Statement = { bind: (...values: unknown[]) => Statement; all: <T>() => Promise<{ results?: T[] }>; run: () => Promise<D1Result> };
export type NichePriorityDB = { prepare: (query: string) => Statement; batch: (statements: Statement[]) => Promise<D1Result[]> };

export class NichePriorityCommandError extends Error {
  constructor(public readonly code: string, public readonly status: number, message: string) { super(message); this.name = "NichePriorityCommandError"; }
}

function clean(value: unknown) { return String(value ?? "").trim(); }
function text(value: unknown, field: string, min = 1, max = 2000) { const result = clean(value); if (result.length < min || result.length > max) throw new NichePriorityCommandError("COMMAND_VALIDATION_FAILED", 400, `${field} must contain ${min}-${max} characters`); return result; }
function integer(value: unknown, field: string, min: number, max: number) { const result = Number(value); if (!Number.isInteger(result) || result < min || result > max) throw new NichePriorityCommandError("COMMAND_VALIDATION_FAILED", 400, `${field} must be an integer between ${min} and ${max}`); return result; }
function oneOf<T extends string>(value: unknown, field: string, values: readonly T[]) { const result = clean(value).toUpperCase() as T; if (!values.includes(result)) throw new NichePriorityCommandError("COMMAND_VALIDATION_FAILED", 400, `${field} is not supported`); return result; }
function priorityItem(value: unknown, index: number): NichePriorityItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new NichePriorityCommandError("COMMAND_VALIDATION_FAILED", 400, `priorities[${index}] must be an object`);
  const row = value as Row;
  return {
    opportunityId: text(row.opportunityId, `priorities[${index}].opportunityId`, 1, 256),
    priority: integer(row.priority, `priorities[${index}].priority`, 1, 50), rationale: text(row.rationale, `priorities[${index}].rationale`, 20, 2000),
  };
}

export function parseNichePriorityBody(value: unknown): NichePriorityBody {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new NichePriorityCommandError("COMMAND_VALIDATION_FAILED", 400, "A JSON expert-priority command is required");
  const row = value as Row;
  if (!Array.isArray(row.priorities) || row.priorities.length < 2 || row.priorities.length > 50) throw new NichePriorityCommandError("COMMAND_VALIDATION_FAILED", 400, "priorities must contain the complete 2-50 opportunity comparable portfolio");
  const priorities = row.priorities.map(priorityItem);
  if (new Set(priorities.map((item) => item.opportunityId)).size !== priorities.length) throw new NichePriorityCommandError("COMMAND_VALIDATION_FAILED", 400, "Each comparable opportunity must appear exactly once");
  const orderedRanks = priorities.map((item) => item.priority).sort((a, b) => a - b);
  if (orderedRanks.some((rank, index) => rank !== index + 1)) throw new NichePriorityCommandError("COMMAND_VALIDATION_FAILED", 400, "Expert priorities must be unique and contiguous from 1 to the comparable opportunity count");
  const expectedComparableSetHash = text(row.expectedComparableSetHash, "expectedComparableSetHash", 64, 64).toLowerCase(); if (!/^[a-f0-9]{64}$/.test(expectedComparableSetHash)) throw new NichePriorityCommandError("COMMAND_VALIDATION_FAILED", 400, "expectedComparableSetHash must be a SHA-256 digest");
  return { action: oneOf(row.action, "action", ["SET_NICHE_PRIORITY"] as const), expectedPriorityVersion: integer(row.expectedPriorityVersion, "expectedPriorityVersion", 0, Number.MAX_SAFE_INTEGER), expectedComparableSetHash, portfolioRationale: text(row.portfolioRationale, "portfolioRationale", 20, 4000), priorities };
}
export function validateNichePriorityIdempotencyKey(value: unknown) { const key = text(value, "Idempotency-Key", 12, 200); if (!/^[A-Za-z0-9._:-]+$/.test(key)) throw new NichePriorityCommandError("COMMAND_VALIDATION_FAILED", 400, "Idempotency-Key contains unsupported characters"); return key; }
async function first(db: NichePriorityDB, query: string, ...values: unknown[]) { return ((await db.prepare(query).bind(...values).all<Row>()).results || [])[0] || null; }
async function all(db: NichePriorityDB, query: string, ...values: unknown[]) { return (await db.prepare(query).bind(...values).all<Row>()).results || []; }
async function sha256(value: string) { const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join(""); }

async function receipt(db: NichePriorityDB, row: Row, replay: boolean): Promise<NichePriorityReceipt> {
  const items = await all(db, "SELECT * FROM niche_expert_priority_items WHERE priority_set_id=? ORDER BY expert_priority,id", clean(row.id));
  return {
    contract: NICHE_PRIORITY_COMMAND_VERSION, outcome: replay ? "IDEMPOTENT_REPLAY" : "RECORDED",
    prioritySet: { id: clean(row.id), version: Number(row.priority_version), comparableSetHash: clean(row.comparable_set_hash), itemCount: Number(row.item_count), portfolioRationale: clean(row.portfolio_rationale), recordedAt: clean(row.created_at), priorities: items.map((item) => ({ opportunityId: clean(item.opportunity_id), priority: Number(item.expert_priority), rationale: clean(item.rationale), scoringVersion: Number(item.scoring_version), evidenceVersion: Number(item.evidence_version) })) },
    authority: { authenticated: true, authorized: true, providerRequests: 0, spendUsd: 0, aggregateScore: null, expertPriorityMutation: true, systemRankMutation: false, axisMutation: false, evidenceSufficiencyMutation: false, eligibilityMutation: false, nicheSelection: false, nicheCommitment: false, channelNicheMutation: false, channelStrategyActivation: false },
    nextAction: "REVIEW_EXPERT_PRIORITIES",
  };
}

export async function submitNichePriorityCommand(db: NichePriorityDB, command: NichePriorityCommand): Promise<NichePriorityReceipt> {
  const body = parseNichePriorityBody(command.body); const idempotencyKey = validateNichePriorityIdempotencyKey(command.idempotencyKey); const actorEmail = clean(command.actor.email).toLowerCase(); const actorDisplayName = text(command.actor.displayName, "actor.displayName", 1, 256);
  if (!actorEmail || command.actor.role !== "OWNER_EXPERT") throw new NichePriorityCommandError("OWNER_EXPERT_AUTHORIZATION_REQUIRED", 403, "An authorized owner/expert identity is required");
  const requestHash = await sha256(JSON.stringify({ actorEmail, ...body }));
  const replay = await first(db, "SELECT * FROM niche_expert_priority_sets WHERE idempotency_key=? LIMIT 1", idempotencyKey);
  if (replay) { if (clean(replay.request_hash) !== requestHash) throw new NichePriorityCommandError("IDEMPOTENCY_KEY_REUSED", 409, "The idempotency key is already bound to a different priority command"); return receipt(db, replay, true); }
  const latestPrioritySet = await first(db, "SELECT * FROM niche_expert_priority_sets WHERE portfolio_id=? ORDER BY priority_version DESC LIMIT 1", PORTFOLIO_ID);
  if (Number(latestPrioritySet?.priority_version || 0) !== body.expectedPriorityVersion) throw new NichePriorityCommandError("PRIORITY_VERSION_CONFLICT", 409, "A newer expert-priority version exists; reload before submitting");

  const programRows = await all(db, "SELECT id,channel_id,version,updated_at FROM v7_program_contracts ORDER BY updated_at DESC,id");
  const latestPrograms = new Map<string, Row>(); for (const program of programRows) if (!latestPrograms.has(clean(program.channel_id))) latestPrograms.set(clean(program.channel_id), program);
  const programs = [...latestPrograms.values()]; const programIds = programs.map((program) => clean(program.id));
  if (!programIds.length) throw new NichePriorityCommandError("PORTFOLIO_NOT_COMPARABLE", 409, "No canonical channel program is available for expert prioritization");
  const placeholders = programIds.map(() => "?").join(",");
  const scoringRows = await all(db, `SELECT * FROM niche_scoring_assessments WHERE program_id IN (${placeholders}) ORDER BY scoring_version DESC,id`, ...programIds);
  const latestScoring = new Map<string, Row>(); for (const assessment of scoringRows) { const current = latestScoring.get(clean(assessment.opportunity_id)); if (!current || Number(assessment.scoring_version) > Number(current.scoring_version)) latestScoring.set(clean(assessment.opportunity_id), assessment); }
  const comparable = [...latestScoring.values()].filter((assessment) => clean(assessment.sufficiency_state) === "SUFFICIENT").sort((a, b) => clean(a.opportunity_id).localeCompare(clean(b.opportunity_id)));
  if (comparable.length < 2) throw new NichePriorityCommandError("PORTFOLIO_NOT_COMPARABLE", 409, "At least two evidence-sufficient opportunities are required for expert prioritization");
  const canonicalIds = comparable.map((item) => clean(item.opportunity_id)); const submittedIds = body.priorities.map((item) => item.opportunityId).sort();
  if (canonicalIds.length !== submittedIds.length || canonicalIds.some((id, index) => id !== submittedIds[index])) throw new NichePriorityCommandError("COMPARABLE_PORTFOLIO_CONFLICT", 409, "The command must prioritize every and only the current comparable opportunity");
  const programsById = new Map(programs.map((program) => [clean(program.id), program]));
  const comparableSetHash = await sha256(JSON.stringify(comparable.map((item) => ({ opportunityId: clean(item.opportunity_id), channelId: clean(item.channel_id), programId: clean(item.program_id), aggregateVersion: Number(programsById.get(clean(item.program_id))?.version), evidenceVersion: Number(item.evidence_version), scoringVersion: Number(item.scoring_version), eligibility: clean(item.comparison_eligibility), marketAttractiveness: Number(item.market_attractiveness_score), abilityToWin: Number(item.ability_to_win_score), evidenceConfidence: Number(item.evidence_confidence_score) }))));
  if (comparableSetHash !== body.expectedComparableSetHash) throw new NichePriorityCommandError("COMPARABLE_VERSION_CONFLICT", 409, "The comparable portfolio changed after this priority workspace was loaded");
  const priorityVersion = body.expectedPriorityVersion + 1; const setId = `niche-priority:${crypto.randomUUID()}`; const auditId = `${setId}:audit`; const lineageId = `${setId}:lineage`; const now = new Date().toISOString(); const correlationId = command.correlationId ? text(command.correlationId, "X-Correlation-Id", 1, 256) : `niche-priority:${idempotencyKey}`; const causationId = command.causationId ? text(command.causationId, "X-Causation-Id", 1, 256) : null;
  const setInsert = "INSERT INTO niche_expert_priority_sets (id,portfolio_id,priority_version,action,comparable_set_hash,item_count,portfolio_rationale,actor_email,actor_display_name,actor_role,idempotency_key,request_hash,correlation_id,causation_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
  const itemInsert = "INSERT INTO niche_expert_priority_items (id,priority_set_id,portfolio_id,priority_version,channel_id,program_id,opportunity_id,opportunity_origin,aggregate_version,evidence_version,scoring_version,expert_priority,rationale,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
  try {
    await db.batch([
      db.prepare(setInsert).bind(setId, PORTFOLIO_ID, priorityVersion, "SET_NICHE_PRIORITY", comparableSetHash, body.priorities.length, body.portfolioRationale, actorEmail, actorDisplayName, "OWNER_EXPERT", idempotencyKey, requestHash, correlationId, causationId, now),
      ...body.priorities.map((item) => { const assessment = latestScoring.get(item.opportunityId)!; const program = programsById.get(clean(assessment.program_id))!; return db.prepare(itemInsert).bind(`${setId}:item:${item.priority}`, setId, PORTFOLIO_ID, priorityVersion, clean(assessment.channel_id), clean(assessment.program_id), item.opportunityId, clean(assessment.opportunity_origin), Number(program.version), Number(assessment.evidence_version), Number(assessment.scoring_version), item.priority, item.rationale, now); }),
      db.prepare("INSERT INTO niche_expert_priority_audits (id,priority_set_id,portfolio_id,event_type,actor_email,actor_role,idempotency_key,request_hash,correlation_id,causation_id,evidence_lineage_id,created_at) VALUES (?,?,?,'NICHE_EXPERT_PRIORITY_SET_RECORDED',?,'OWNER_EXPERT',?,?,?,?,?,?)").bind(auditId, setId, PORTFOLIO_ID, actorEmail, idempotencyKey, requestHash, correlationId, causationId, lineageId, now),
      db.prepare("INSERT INTO v7_evidence_lineage (id,program_id,project_id,entity_type,title,lifecycle_state,upstream_evidence_id,artifact_key,content_hash,storage_state,rights_state,cost_state,quarantine_state,pipeline_version,created_at,updated_at) VALUES (?,?,?,?,?,'FROZEN',?,?,?,'CANONICAL_D1','NOT_APPLICABLE','ZERO_SPEND','CLEAR',7,?,?)").bind(lineageId, PORTFOLIO_ID, null, "NICHE_EXPERT_PRIORITY_SET", `Niche expert priority set v${priorityVersion}`, comparableSetHash, setId, requestHash, now, now),
    ]);
  } catch {
    const racedReplay = await first(db, "SELECT * FROM niche_expert_priority_sets WHERE idempotency_key=? LIMIT 1", idempotencyKey); if (racedReplay && clean(racedReplay.request_hash) === requestHash) return receipt(db, racedReplay, true);
    const current = await first(db, "SELECT * FROM niche_expert_priority_sets WHERE portfolio_id=? ORDER BY priority_version DESC LIMIT 1", PORTFOLIO_ID); if (Number(current?.priority_version || 0) !== body.expectedPriorityVersion) throw new NichePriorityCommandError("PRIORITY_VERSION_CONFLICT", 409, "A concurrent expert-priority command won; reload before submitting");
    throw new NichePriorityCommandError("PRIORITY_COMMIT_FAILED", 503, "The expert-priority set could not be recorded atomically");
  }
  const stored = await first(db, "SELECT * FROM niche_expert_priority_sets WHERE id=? LIMIT 1", setId); if (!stored || clean(stored.request_hash) !== requestHash) throw new NichePriorityCommandError("PRIORITY_COMMIT_NOT_VERIFIED", 503, "The expert-priority write could not be verified"); return receipt(db, stored, false);
}
