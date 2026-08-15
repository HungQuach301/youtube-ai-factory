export const NICHE_HYPOTHESIS_COMMAND_VERSION = "NICHE_HYPOTHESIS_INTAKE_V1" as const;

export type NicheHypothesisBody = {
  channelId: string;
  programId: string;
  expectedAggregateVersion: number;
  expectedHypothesisVersion: number;
  title: string;
  description: string;
  rationale: string;
  audienceAssumptions: string[];
  demandAssumptions: string[];
  knownCompetitors: string[];
  winningThesis: string;
};

export type NicheHypothesisActor = { email: string; displayName: string; role: "OWNER_EXPERT" };
export type NicheHypothesisCommand = {
  body: NicheHypothesisBody;
  actor: NicheHypothesisActor;
  idempotencyKey: string;
  correlationId?: string | null;
  causationId?: string | null;
};

export type NicheHypothesisReceipt = {
  contract: typeof NICHE_HYPOTHESIS_COMMAND_VERSION;
  outcome: "RECORDED" | "IDEMPOTENT_REPLAY";
  hypothesis: {
    id: string;
    version: number;
    aggregateVersion: number;
    channelId: string;
    programId: string;
    title: string;
    origin: "EXPERT_SEEDED";
    lifecycleState: "EVIDENCE_GATHERING";
    createdAt: string;
  };
  authority: {
    authenticated: true;
    authorized: true;
    providerRequests: 0;
    spendUsd: 0;
    comparisonEligibility: false;
    expertPriorityMutation: false;
    nicheSelection: false;
    nicheCommitment: false;
    channelNicheMutation: false;
    channelStrategyActivation: false;
  };
  nextAction: "PREPARE_NICHE_RESEARCH_PLAN";
};

type Row = Record<string, unknown>;
type D1Result = { meta?: { changes?: number } };
type Statement = {
  bind: (...values: unknown[]) => Statement;
  all: <T>() => Promise<{ results?: T[] }>;
  run: () => Promise<D1Result>;
};
export type NicheHypothesisDB = {
  prepare: (query: string) => Statement;
  batch: (statements: Statement[]) => Promise<D1Result[]>;
};

export class NicheHypothesisCommandError extends Error {
  constructor(public readonly code: string, public readonly status: number, message: string) {
    super(message);
    this.name = "NicheHypothesisCommandError";
  }
}

function clean(value: unknown) { return String(value ?? "").trim(); }
function integer(value: unknown) { return Number.isInteger(value) ? Number(value) : Number.NaN; }
function boundedText(value: unknown, field: string, minimum: number, maximum: number) {
  const result = clean(value);
  if (result.length < minimum || result.length > maximum) throw new NicheHypothesisCommandError("COMMAND_VALIDATION_FAILED", 400, `${field} must contain ${minimum}-${maximum} characters`);
  return result;
}
function boundedId(value: unknown, field: string) { return boundedText(value, field, 1, 256); }
function expectedVersion(value: unknown, field: string, minimum: number) {
  const result = integer(value);
  if (!Number.isInteger(result) || result < minimum) throw new NicheHypothesisCommandError("COMMAND_VALIDATION_FAILED", 400, `${field} must be an integer >= ${minimum}`);
  return result;
}
function boundedList(value: unknown, field: string, minimumItems: number, maximumItems: number) {
  if (!Array.isArray(value)) throw new NicheHypothesisCommandError("COMMAND_VALIDATION_FAILED", 400, `${field} must be an array`);
  const items = [...new Set(value.map((item) => boundedText(item, `${field} item`, 3, 320)))];
  if (items.length < minimumItems || items.length > maximumItems) throw new NicheHypothesisCommandError("COMMAND_VALIDATION_FAILED", 400, `${field} must contain ${minimumItems}-${maximumItems} distinct items`);
  return items;
}

export function parseNicheHypothesisBody(value: unknown): NicheHypothesisBody {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new NicheHypothesisCommandError("COMMAND_VALIDATION_FAILED", 400, "A JSON command object is required");
  const body = value as Record<string, unknown>;
  return {
    channelId: boundedId(body.channelId, "channelId"),
    programId: boundedId(body.programId, "programId"),
    expectedAggregateVersion: expectedVersion(body.expectedAggregateVersion, "expectedAggregateVersion", 1),
    expectedHypothesisVersion: expectedVersion(body.expectedHypothesisVersion, "expectedHypothesisVersion", 0),
    title: boundedText(body.title, "title", 4, 160),
    description: boundedText(body.description, "description", 20, 1200),
    rationale: boundedText(body.rationale, "rationale", 40, 4000),
    audienceAssumptions: boundedList(body.audienceAssumptions, "audienceAssumptions", 1, 12),
    demandAssumptions: boundedList(body.demandAssumptions, "demandAssumptions", 1, 12),
    knownCompetitors: boundedList(body.knownCompetitors, "knownCompetitors", 0, 12),
    winningThesis: boundedText(body.winningThesis, "winningThesis", 30, 2000),
  };
}

export function validateHypothesisIdempotencyKey(value: unknown) {
  const key = boundedText(value, "Idempotency-Key", 12, 200);
  if (!/^[A-Za-z0-9._:-]+$/.test(key)) throw new NicheHypothesisCommandError("COMMAND_VALIDATION_FAILED", 400, "Idempotency-Key contains unsupported characters");
  return key;
}

async function first(db: NicheHypothesisDB, query: string, ...values: unknown[]) {
  return ((await db.prepare(query).bind(...values).all<Row>()).results || [])[0] || null;
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
function parseJsonList(value: unknown) {
  try { const parsed = JSON.parse(clean(value)); return Array.isArray(parsed) ? parsed.map(clean).filter(Boolean) : []; }
  catch { return []; }
}
function receipt(row: Row, replay: boolean): NicheHypothesisReceipt {
  return {
    contract: NICHE_HYPOTHESIS_COMMAND_VERSION,
    outcome: replay ? "IDEMPOTENT_REPLAY" : "RECORDED",
    hypothesis: {
      id: clean(row.id), version: Number(row.hypothesis_version), aggregateVersion: Number(row.aggregate_version),
      channelId: clean(row.channel_id), programId: clean(row.program_id), title: clean(row.title), origin: "EXPERT_SEEDED",
      lifecycleState: "EVIDENCE_GATHERING", createdAt: clean(row.created_at),
    },
    authority: {
      authenticated: true, authorized: true, providerRequests: 0, spendUsd: 0, comparisonEligibility: false,
      expertPriorityMutation: false, nicheSelection: false, nicheCommitment: false, channelNicheMutation: false,
      channelStrategyActivation: false,
    },
    nextAction: "PREPARE_NICHE_RESEARCH_PLAN",
  };
}

export async function submitNicheHypothesis(db: NicheHypothesisDB, command: NicheHypothesisCommand): Promise<NicheHypothesisReceipt> {
  const body = parseNicheHypothesisBody(command.body);
  const idempotencyKey = validateHypothesisIdempotencyKey(command.idempotencyKey);
  const actorEmail = clean(command.actor.email).toLowerCase();
  const actorDisplayName = boundedText(command.actor.displayName, "actor.displayName", 1, 256);
  if (!actorEmail || command.actor.role !== "OWNER_EXPERT") throw new NicheHypothesisCommandError("OWNER_EXPERT_AUTHORIZATION_REQUIRED", 403, "An authorized owner/expert identity is required");
  const canonicalBody = { ...body, audienceAssumptions: [...body.audienceAssumptions], demandAssumptions: [...body.demandAssumptions], knownCompetitors: [...body.knownCompetitors] };
  const requestHash = await sha256(JSON.stringify({ actorEmail, ...canonicalBody }));
  const existing = await first(db, "SELECT * FROM niche_hypotheses WHERE idempotency_key=? LIMIT 1", idempotencyKey);
  if (existing) {
    if (clean(existing.request_hash) !== requestHash) throw new NicheHypothesisCommandError("IDEMPOTENCY_KEY_REUSED", 409, "The idempotency key is already bound to a different hypothesis");
    return receipt(existing, true);
  }

  const program = await first(db, "SELECT id,channel_id,version FROM v7_program_contracts WHERE id=? AND channel_id=? LIMIT 1", body.programId, body.channelId);
  if (!program) throw new NicheHypothesisCommandError("CROSS_CHANNEL_PROGRAM_REFERENCE", 409, "The selected program does not belong to this channel");
  if (Number(program.version) !== body.expectedAggregateVersion) throw new NicheHypothesisCommandError("AGGREGATE_VERSION_CONFLICT", 409, "The channel aggregate changed; reload before submitting");
  const latest = await first(db, "SELECT hypothesis_version FROM niche_hypotheses WHERE program_id=? ORDER BY hypothesis_version DESC LIMIT 1", body.programId);
  const currentVersion = Number(latest?.hypothesis_version || 0);
  if (currentVersion !== body.expectedHypothesisVersion) throw new NicheHypothesisCommandError("HYPOTHESIS_VERSION_CONFLICT", 409, "A newer expert hypothesis exists; reload before submitting");

  const now = new Date().toISOString();
  const hypothesisVersion = currentVersion + 1;
  const hypothesisId = `niche-hypothesis:${crypto.randomUUID()}`;
  const auditId = `${hypothesisId}:audit`;
  const lineageId = `${hypothesisId}:lineage`;
  const correlationId = command.correlationId ? boundedId(command.correlationId, "X-Correlation-Id") : `niche-hypothesis:${idempotencyKey}`;
  const causationId = command.causationId ? boundedId(command.causationId, "X-Causation-Id") : null;
  const audienceJson = JSON.stringify(body.audienceAssumptions);
  const demandJson = JSON.stringify(body.demandAssumptions);
  const competitorsJson = JSON.stringify(body.knownCompetitors);

  try {
    await db.batch([
      db.prepare("INSERT INTO niche_hypotheses (id,portfolio_id,channel_id,program_id,aggregate_version,hypothesis_version,origin,lifecycle_state,title,description,rationale,audience_assumptions_json,demand_assumptions_json,known_competitors_json,winning_thesis,actor_email,actor_display_name,actor_role,idempotency_key,request_hash,correlation_id,causation_id,created_at) SELECT ?,?,?,?,?,?,'EXPERT_SEEDED','EVIDENCE_GATHERING',?,?,?,?,?,?,?, ?,?,'OWNER_EXPERT',?,?,?,?,? FROM v7_program_contracts WHERE id=? AND channel_id=? AND version=?")
        .bind(hypothesisId, "CANONICAL_PORTFOLIO", body.channelId, body.programId, body.expectedAggregateVersion, hypothesisVersion, body.title, body.description, body.rationale, audienceJson, demandJson, competitorsJson, body.winningThesis, actorEmail, actorDisplayName, idempotencyKey, requestHash, correlationId, causationId, now, body.programId, body.channelId, body.expectedAggregateVersion),
      db.prepare("INSERT INTO niche_hypothesis_audits (id,hypothesis_id,program_id,channel_id,event_type,actor_email,actor_role,idempotency_key,request_hash,correlation_id,causation_id,evidence_lineage_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .bind(auditId, hypothesisId, body.programId, body.channelId, "NICHE_HYPOTHESIS_SUBMITTED", actorEmail, "OWNER_EXPERT", idempotencyKey, requestHash, correlationId, causationId, lineageId, now),
      db.prepare("INSERT INTO v7_evidence_lineage (id,program_id,project_id,entity_type,title,lifecycle_state,upstream_evidence_id,artifact_key,content_hash,storage_state,rights_state,cost_state,quarantine_state,pipeline_version,created_at,updated_at) VALUES (?,?,?,?,?,'FROZEN',NULL,?,?,'CANONICAL_D1','NOT_APPLICABLE','ZERO_SPEND','CLEAR',7,?,?)")
        .bind(lineageId, body.programId, null, "NICHE_HYPOTHESIS", `Expert niche hypothesis v${hypothesisVersion}: ${body.title}`, hypothesisId, requestHash, now, now),
    ]);
  } catch {
    const racedReplay = await first(db, "SELECT * FROM niche_hypotheses WHERE idempotency_key=? LIMIT 1", idempotencyKey);
    if (racedReplay && clean(racedReplay.request_hash) === requestHash) return receipt(racedReplay, true);
    const current = await first(db, "SELECT hypothesis_version FROM niche_hypotheses WHERE program_id=? ORDER BY hypothesis_version DESC LIMIT 1", body.programId);
    if (Number(current?.hypothesis_version || 0) !== body.expectedHypothesisVersion) throw new NicheHypothesisCommandError("HYPOTHESIS_VERSION_CONFLICT", 409, "A concurrent expert hypothesis won; reload before submitting");
    throw new NicheHypothesisCommandError("HYPOTHESIS_COMMIT_FAILED", 503, "The hypothesis could not be recorded atomically");
  }

  const stored = await first(db, "SELECT * FROM niche_hypotheses WHERE id=? LIMIT 1", hypothesisId);
  if (!stored || clean(stored.request_hash) !== requestHash || parseJsonList(stored.audience_assumptions_json).length !== body.audienceAssumptions.length) throw new NicheHypothesisCommandError("HYPOTHESIS_COMMIT_NOT_VERIFIED", 503, "The hypothesis write could not be verified");
  return receipt(stored, false);
}
