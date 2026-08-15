export const NICHE_EVIDENCE_COMMAND_VERSION = "NICHE_EVIDENCE_WORKFLOW_V1" as const;

export type NicheEvidenceAction = "PREPARE_NICHE_RESEARCH_PLAN" | "REQUEST_NICHE_VALIDATION" | "RECORD_NICHE_EVIDENCE_REVIEW";
export type NicheEvidenceOrigin = "SYSTEM_DISCOVERED" | "EXPERT_SEEDED";

type BaseBody = {
  action: NicheEvidenceAction;
  channelId: string;
  programId: string;
  opportunityId: string;
  opportunityOrigin: NicheEvidenceOrigin;
  expectedAggregateVersion: number;
  expectedEvidenceVersion: number;
};

export type PrepareResearchPlanBody = BaseBody & {
  action: "PREPARE_NICHE_RESEARCH_PLAN";
  supportingQuestions: string[];
  contradictingQuestions: string[];
  unknownQuestions: string[];
  sourceClasses: string[];
  providerAllowlist: string[];
  maxSources: number;
  maxProviderRequests: number;
  maxSpendUsd: number;
};

export type RequestValidationBody = BaseBody & {
  action: "REQUEST_NICHE_VALIDATION";
  planVersion: number;
  approvalRationale: string;
};

export type RecordEvidenceReviewBody = BaseBody & {
  action: "RECORD_NICHE_EVIDENCE_REVIEW";
  planVersion: number;
  direction: "SUPPORTS" | "CONTRADICTS" | "UNKNOWN";
  claimStatement: string;
  sourceRef: string;
  sourceAuthority: "PRIMARY" | "SECONDARY" | "EXPERT_OBSERVATION";
  observedAt: string;
  freshness: "CURRENT" | "AGING" | "STALE" | "UNKNOWN";
  confidence: number;
  affectedAxis: "MARKET_ATTRACTIVENESS" | "ABILITY_TO_WIN" | "EVIDENCE_CONFIDENCE" | "PREREQUISITE" | "WINNING_CRITERION";
  disposition: "ACCEPTED" | "REJECTED" | "NEEDS_MORE_RESEARCH";
  decisionImpact: string;
};

export type NicheEvidenceBody = PrepareResearchPlanBody | RequestValidationBody | RecordEvidenceReviewBody;
export type NicheEvidenceActor = { email: string; displayName: string; role: "OWNER_EXPERT" };
export type NicheEvidenceCommand = { body: NicheEvidenceBody; actor: NicheEvidenceActor; idempotencyKey: string; correlationId?: string | null; causationId?: string | null };

export type NicheEvidenceReceipt = {
  contract: typeof NICHE_EVIDENCE_COMMAND_VERSION;
  outcome: "RECORDED" | "IDEMPOTENT_REPLAY";
  event: { id: string; action: NicheEvidenceAction; evidenceVersion: number; planVersion: number; opportunityId: string; opportunityOrigin: NicheEvidenceOrigin; createdAt: string };
  authority: {
    authenticated: true; authorized: true; providerRequests: 0; spendUsd: 0; comparisonEligibility: false;
    systemRankMutation: false; expertPriorityMutation: false; nicheSelection: false; nicheCommitment: false;
    channelNicheMutation: false; channelStrategyActivation: false;
  };
  nextAction: "REQUEST_NICHE_VALIDATION" | "RECORD_NICHE_EVIDENCE_REVIEW" | "CONTINUE_EVIDENCE_REVIEW";
};

type Row = Record<string, unknown>;
type D1Result = { meta?: { changes?: number } };
type Statement = { bind: (...values: unknown[]) => Statement; all: <T>() => Promise<{ results?: T[] }>; run: () => Promise<D1Result> };
export type NicheEvidenceDB = { prepare: (query: string) => Statement; batch: (statements: Statement[]) => Promise<D1Result[]> };

export class NicheEvidenceCommandError extends Error {
  constructor(public readonly code: string, public readonly status: number, message: string) { super(message); this.name = "NicheEvidenceCommandError"; }
}

function clean(value: unknown) { return String(value ?? "").trim(); }
function integer(value: unknown) { return Number.isInteger(value) ? Number(value) : Number.NaN; }
function boundedText(value: unknown, field: string, minimum: number, maximum: number) {
  const result = clean(value);
  if (result.length < minimum || result.length > maximum) throw new NicheEvidenceCommandError("COMMAND_VALIDATION_FAILED", 400, `${field} must contain ${minimum}-${maximum} characters`);
  return result;
}
function boundedId(value: unknown, field: string) { return boundedText(value, field, 1, 256); }
function boundedInteger(value: unknown, field: string, minimum: number, maximum: number) {
  const result = integer(value);
  if (!Number.isInteger(result) || result < minimum || result > maximum) throw new NicheEvidenceCommandError("COMMAND_VALIDATION_FAILED", 400, `${field} must be an integer between ${minimum} and ${maximum}`);
  return result;
}
function boundedList(value: unknown, field: string, minimumItems: number, maximumItems: number) {
  if (!Array.isArray(value)) throw new NicheEvidenceCommandError("COMMAND_VALIDATION_FAILED", 400, `${field} must be an array`);
  const items = [...new Set(value.map((item) => boundedText(item, `${field} item`, 4, 500)))];
  if (items.length < minimumItems || items.length > maximumItems) throw new NicheEvidenceCommandError("COMMAND_VALIDATION_FAILED", 400, `${field} must contain ${minimumItems}-${maximumItems} distinct items`);
  return items;
}
function oneOf<T extends string>(value: unknown, field: string, values: readonly T[]): T {
  const result = clean(value).toUpperCase() as T;
  if (!values.includes(result)) throw new NicheEvidenceCommandError("COMMAND_VALIDATION_FAILED", 400, `${field} is not supported`);
  return result;
}
function base(body: Record<string, unknown>): BaseBody {
  return {
    action: oneOf(body.action, "action", ["PREPARE_NICHE_RESEARCH_PLAN", "REQUEST_NICHE_VALIDATION", "RECORD_NICHE_EVIDENCE_REVIEW"] as const),
    channelId: boundedId(body.channelId, "channelId"), programId: boundedId(body.programId, "programId"), opportunityId: boundedId(body.opportunityId, "opportunityId"),
    opportunityOrigin: oneOf(body.opportunityOrigin, "opportunityOrigin", ["SYSTEM_DISCOVERED", "EXPERT_SEEDED"] as const),
    expectedAggregateVersion: boundedInteger(body.expectedAggregateVersion, "expectedAggregateVersion", 1, Number.MAX_SAFE_INTEGER),
    expectedEvidenceVersion: boundedInteger(body.expectedEvidenceVersion, "expectedEvidenceVersion", 0, Number.MAX_SAFE_INTEGER),
  };
}

export function parseNicheEvidenceBody(value: unknown): NicheEvidenceBody {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new NicheEvidenceCommandError("COMMAND_VALIDATION_FAILED", 400, "A JSON command object is required");
  const source = value as Record<string, unknown>;
  const common = base(source);
  if (common.action === "PREPARE_NICHE_RESEARCH_PLAN") {
    const spend = Number(source.maxSpendUsd);
    if (!Number.isFinite(spend) || spend < 0 || spend > 100 || Math.round(spend * 100) !== spend * 100) throw new NicheEvidenceCommandError("COMMAND_VALIDATION_FAILED", 400, "maxSpendUsd must be between 0 and 100 with at most two decimal places");
    return { ...common, action: common.action, supportingQuestions: boundedList(source.supportingQuestions, "supportingQuestions", 1, 12), contradictingQuestions: boundedList(source.contradictingQuestions, "contradictingQuestions", 1, 12), unknownQuestions: boundedList(source.unknownQuestions, "unknownQuestions", 1, 12), sourceClasses: boundedList(source.sourceClasses, "sourceClasses", 1, 12), providerAllowlist: boundedList(source.providerAllowlist, "providerAllowlist", 0, 8), maxSources: boundedInteger(source.maxSources, "maxSources", 1, 30), maxProviderRequests: boundedInteger(source.maxProviderRequests, "maxProviderRequests", 0, 10), maxSpendUsd: spend };
  }
  const planVersion = boundedInteger(source.planVersion, "planVersion", 1, Number.MAX_SAFE_INTEGER);
  if (common.action === "REQUEST_NICHE_VALIDATION") return { ...common, action: common.action, planVersion, approvalRationale: boundedText(source.approvalRationale, "approvalRationale", 20, 2000) };
  const observedAt = boundedText(source.observedAt, "observedAt", 10, 40);
  if (!Number.isFinite(Date.parse(observedAt))) throw new NicheEvidenceCommandError("COMMAND_VALIDATION_FAILED", 400, "observedAt must be an ISO date or timestamp");
  return {
    ...common, action: common.action, planVersion,
    direction: oneOf(source.direction, "direction", ["SUPPORTS", "CONTRADICTS", "UNKNOWN"] as const),
    claimStatement: boundedText(source.claimStatement, "claimStatement", 20, 2000), sourceRef: boundedText(source.sourceRef, "sourceRef", 4, 1000),
    sourceAuthority: oneOf(source.sourceAuthority, "sourceAuthority", ["PRIMARY", "SECONDARY", "EXPERT_OBSERVATION"] as const), observedAt: new Date(observedAt).toISOString(),
    freshness: oneOf(source.freshness, "freshness", ["CURRENT", "AGING", "STALE", "UNKNOWN"] as const), confidence: boundedInteger(source.confidence, "confidence", 0, 100),
    affectedAxis: oneOf(source.affectedAxis, "affectedAxis", ["MARKET_ATTRACTIVENESS", "ABILITY_TO_WIN", "EVIDENCE_CONFIDENCE", "PREREQUISITE", "WINNING_CRITERION"] as const),
    disposition: oneOf(source.disposition, "disposition", ["ACCEPTED", "REJECTED", "NEEDS_MORE_RESEARCH"] as const), decisionImpact: boundedText(source.decisionImpact, "decisionImpact", 20, 2000),
  };
}

export function validateNicheEvidenceIdempotencyKey(value: unknown) {
  const key = boundedText(value, "Idempotency-Key", 12, 200);
  if (!/^[A-Za-z0-9._:-]+$/.test(key)) throw new NicheEvidenceCommandError("COMMAND_VALIDATION_FAILED", 400, "Idempotency-Key contains unsupported characters");
  return key;
}

async function first(db: NicheEvidenceDB, query: string, ...values: unknown[]) { return ((await db.prepare(query).bind(...values).all<Row>()).results || [])[0] || null; }
async function sha256(value: string) { const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join(""); }
function parseArtifactOpportunity(row: Row | null, opportunityId: string) {
  if (!row) return false;
  try {
    const artifact = JSON.parse(clean(row.content_json)) as { nicheOpportunities?: Array<Record<string, unknown>> };
    return Array.isArray(artifact.nicheOpportunities) && artifact.nicheOpportunities.some((item, index) => clean(item.entityType) === "NICHE_OPPORTUNITY" && (clean(item.opportunityId) || clean(item.id) || `${clean(row.id)}:niche:${index + 1}`) === opportunityId);
  } catch { return false; }
}
function receipt(row: Row, replay: boolean): NicheEvidenceReceipt {
  const action = clean(row.action) as NicheEvidenceAction;
  return {
    contract: NICHE_EVIDENCE_COMMAND_VERSION, outcome: replay ? "IDEMPOTENT_REPLAY" : "RECORDED",
    event: { id: clean(row.id), action, evidenceVersion: Number(row.evidence_version), planVersion: Number(row.plan_version), opportunityId: clean(row.opportunity_id), opportunityOrigin: clean(row.opportunity_origin) as NicheEvidenceOrigin, createdAt: clean(row.created_at) },
    authority: { authenticated: true, authorized: true, providerRequests: 0, spendUsd: 0, comparisonEligibility: false, systemRankMutation: false, expertPriorityMutation: false, nicheSelection: false, nicheCommitment: false, channelNicheMutation: false, channelStrategyActivation: false },
    nextAction: action === "PREPARE_NICHE_RESEARCH_PLAN" ? "REQUEST_NICHE_VALIDATION" : action === "REQUEST_NICHE_VALIDATION" ? "RECORD_NICHE_EVIDENCE_REVIEW" : "CONTINUE_EVIDENCE_REVIEW",
  };
}

const EVENT_COLUMNS = ["id", "portfolio_id", "channel_id", "program_id", "opportunity_id", "opportunity_origin", "aggregate_version", "evidence_version", "action", "plan_version", "supporting_questions_json", "contradicting_questions_json", "unknown_questions_json", "source_classes_json", "provider_allowlist_json", "max_sources", "max_provider_requests", "max_spend_cents", "validation_status", "validation_request_id", "claim_direction", "claim_statement", "source_ref", "source_authority", "observed_at", "freshness", "confidence", "affected_axis", "review_disposition", "decision_impact", "actor_email", "actor_display_name", "actor_role", "idempotency_key", "request_hash", "correlation_id", "causation_id", "created_at"] as const;
const EVENT_INSERT = `INSERT INTO niche_evidence_workflow_events (${EVENT_COLUMNS.join(",")}) VALUES (${EVENT_COLUMNS.map(() => "?").join(",")})`;

export async function submitNicheEvidenceCommand(db: NicheEvidenceDB, command: NicheEvidenceCommand): Promise<NicheEvidenceReceipt> {
  const body = parseNicheEvidenceBody(command.body);
  const idempotencyKey = validateNicheEvidenceIdempotencyKey(command.idempotencyKey);
  const actorEmail = clean(command.actor.email).toLowerCase();
  const actorDisplayName = boundedText(command.actor.displayName, "actor.displayName", 1, 256);
  if (!actorEmail || command.actor.role !== "OWNER_EXPERT") throw new NicheEvidenceCommandError("OWNER_EXPERT_AUTHORIZATION_REQUIRED", 403, "An authorized owner/expert identity is required");
  const requestHash = await sha256(JSON.stringify({ actorEmail, ...body }));
  const existing = await first(db, "SELECT * FROM niche_evidence_workflow_events WHERE idempotency_key=? LIMIT 1", idempotencyKey);
  if (existing) {
    if (clean(existing.request_hash) !== requestHash) throw new NicheEvidenceCommandError("IDEMPOTENCY_KEY_REUSED", 409, "The idempotency key is already bound to a different evidence command");
    return receipt(existing, true);
  }

  const program = await first(db, "SELECT id,channel_id,version FROM v7_program_contracts WHERE id=? AND channel_id=? LIMIT 1", body.programId, body.channelId);
  if (!program) throw new NicheEvidenceCommandError("CROSS_CHANNEL_PROGRAM_REFERENCE", 409, "The selected program does not belong to this channel");
  if (Number(program.version) !== body.expectedAggregateVersion) throw new NicheEvidenceCommandError("AGGREGATE_VERSION_CONFLICT", 409, "The channel aggregate changed; reload before submitting");
  const expert = await first(db, "SELECT id FROM niche_hypotheses WHERE id=? AND channel_id=? AND program_id=? LIMIT 1", body.opportunityId, body.channelId, body.programId);
  const artifact = expert ? null : await first(db, "SELECT id,content_json FROM v7_intelligence_artifacts WHERE program_id=? AND stage_key='01' ORDER BY updated_at DESC,id LIMIT 1", body.programId);
  const resolvedOrigin: NicheEvidenceOrigin | null = expert ? "EXPERT_SEEDED" : parseArtifactOpportunity(artifact, body.opportunityId) ? "SYSTEM_DISCOVERED" : null;
  if (!resolvedOrigin) throw new NicheEvidenceCommandError("NICHE_OPPORTUNITY_NOT_FOUND", 404, "The typed niche opportunity is not available in this channel program");
  if (resolvedOrigin !== body.opportunityOrigin) throw new NicheEvidenceCommandError("OPPORTUNITY_ORIGIN_CONFLICT", 409, "The opportunity origin does not match its canonical identity");

  const latest = await first(db, "SELECT * FROM niche_evidence_workflow_events WHERE opportunity_id=? ORDER BY evidence_version DESC LIMIT 1", body.opportunityId);
  const currentEvidenceVersion = Number(latest?.evidence_version || 0);
  if (currentEvidenceVersion !== body.expectedEvidenceVersion) throw new NicheEvidenceCommandError("EVIDENCE_VERSION_CONFLICT", 409, "A newer evidence event exists; reload before submitting");
  const latestPlan = await first(db, "SELECT * FROM niche_evidence_workflow_events WHERE opportunity_id=? AND action='PREPARE_NICHE_RESEARCH_PLAN' ORDER BY plan_version DESC LIMIT 1", body.opportunityId);
  const latestPlanVersion = Number(latestPlan?.plan_version || 0);
  if (body.action !== "PREPARE_NICHE_RESEARCH_PLAN") {
    if (!latestPlan || latestPlanVersion !== body.planVersion) throw new NicheEvidenceCommandError("RESEARCH_PLAN_VERSION_CONFLICT", 409, "The command must reference the latest research plan");
  }
  let validationRequest: Row | null = null;
  if (body.action === "REQUEST_NICHE_VALIDATION") {
    validationRequest = await first(db, "SELECT * FROM niche_evidence_workflow_events WHERE opportunity_id=? AND action='REQUEST_NICHE_VALIDATION' AND plan_version=? LIMIT 1", body.opportunityId, body.planVersion);
    if (validationRequest) throw new NicheEvidenceCommandError("VALIDATION_ALREADY_REQUESTED", 409, "Validation has already been approved for this plan version");
  }
  if (body.action === "RECORD_NICHE_EVIDENCE_REVIEW") {
    validationRequest = await first(db, "SELECT * FROM niche_evidence_workflow_events WHERE opportunity_id=? AND action='REQUEST_NICHE_VALIDATION' AND plan_version=? ORDER BY evidence_version DESC LIMIT 1", body.opportunityId, body.planVersion);
    if (!validationRequest) throw new NicheEvidenceCommandError("VALIDATION_APPROVAL_REQUIRED", 409, "Approve the bounded validation request before recording evidence review");
  }

  const evidenceVersion = currentEvidenceVersion + 1;
  const planVersion = body.action === "PREPARE_NICHE_RESEARCH_PLAN" ? latestPlanVersion + 1 : body.planVersion;
  const eventId = `niche-evidence:${crypto.randomUUID()}`;
  const auditId = `${eventId}:audit`;
  const lineageId = `${eventId}:lineage`;
  const validationRequestId = body.action === "REQUEST_NICHE_VALIDATION" ? eventId : body.action === "RECORD_NICHE_EVIDENCE_REVIEW" ? clean(validationRequest?.id) : null;
  const correlationId = command.correlationId ? boundedId(command.correlationId, "X-Correlation-Id") : `niche-evidence:${idempotencyKey}`;
  const causationId = command.causationId ? boundedId(command.causationId, "X-Causation-Id") : null;
  const now = new Date().toISOString();
  const planBody = body.action === "PREPARE_NICHE_RESEARCH_PLAN" ? body : null;
  const reviewBody = body.action === "RECORD_NICHE_EVIDENCE_REVIEW" ? body : null;
  const eventValues: unknown[] = [
    eventId, "CANONICAL_PORTFOLIO", body.channelId, body.programId, body.opportunityId, resolvedOrigin, body.expectedAggregateVersion, evidenceVersion, body.action, planVersion,
    planBody ? JSON.stringify(planBody.supportingQuestions) : null, planBody ? JSON.stringify(planBody.contradictingQuestions) : null, planBody ? JSON.stringify(planBody.unknownQuestions) : null,
    planBody ? JSON.stringify(planBody.sourceClasses) : null, planBody ? JSON.stringify(planBody.providerAllowlist) : null,
    planBody?.maxSources ?? null, planBody?.maxProviderRequests ?? null, planBody ? Math.round(planBody.maxSpendUsd * 100) : null,
    body.action === "REQUEST_NICHE_VALIDATION" ? "APPROVED_NOT_DISPATCHED" : body.action === "RECORD_NICHE_EVIDENCE_REVIEW" ? "EXPERT_REVIEW_RECORDED" : "PLAN_READY",
    validationRequestId, reviewBody?.direction ?? null, reviewBody?.claimStatement ?? (body.action === "REQUEST_NICHE_VALIDATION" ? body.approvalRationale : null),
    reviewBody?.sourceRef ?? null, reviewBody?.sourceAuthority ?? null, reviewBody?.observedAt ?? null, reviewBody?.freshness ?? null, reviewBody?.confidence ?? null,
    reviewBody?.affectedAxis ?? null, reviewBody?.disposition ?? null, reviewBody?.decisionImpact ?? null,
    actorEmail, actorDisplayName, "OWNER_EXPERT", idempotencyKey, requestHash, correlationId, causationId, now,
  ];
  try {
    await db.batch([
      db.prepare(EVENT_INSERT).bind(...eventValues),
      db.prepare("INSERT INTO niche_evidence_workflow_audits (id,event_id,program_id,channel_id,opportunity_id,event_type,actor_email,actor_role,idempotency_key,request_hash,correlation_id,causation_id,evidence_lineage_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .bind(auditId, eventId, body.programId, body.channelId, body.opportunityId, body.action, actorEmail, "OWNER_EXPERT", idempotencyKey, requestHash, correlationId, causationId, lineageId, now),
      db.prepare("INSERT INTO v7_evidence_lineage (id,program_id,project_id,entity_type,title,lifecycle_state,upstream_evidence_id,artifact_key,content_hash,storage_state,rights_state,cost_state,quarantine_state,pipeline_version,created_at,updated_at) VALUES (?,?,?,?,?,'FROZEN',?,?,?,'CANONICAL_D1','NOT_APPLICABLE','ZERO_SPEND','CLEAR',7,?,?)")
        .bind(lineageId, body.programId, null, "NICHE_EVIDENCE_EVENT", `Niche evidence v${evidenceVersion}: ${body.action}`, body.opportunityId, eventId, requestHash, now, now),
    ]);
  } catch {
    const racedReplay = await first(db, "SELECT * FROM niche_evidence_workflow_events WHERE idempotency_key=? LIMIT 1", idempotencyKey);
    if (racedReplay && clean(racedReplay.request_hash) === requestHash) return receipt(racedReplay, true);
    const current = await first(db, "SELECT evidence_version FROM niche_evidence_workflow_events WHERE opportunity_id=? ORDER BY evidence_version DESC LIMIT 1", body.opportunityId);
    if (Number(current?.evidence_version || 0) !== body.expectedEvidenceVersion) throw new NicheEvidenceCommandError("EVIDENCE_VERSION_CONFLICT", 409, "A concurrent evidence event won; reload before submitting");
    throw new NicheEvidenceCommandError("EVIDENCE_COMMIT_FAILED", 503, "The evidence command could not be recorded atomically");
  }
  const stored = await first(db, "SELECT * FROM niche_evidence_workflow_events WHERE id=? LIMIT 1", eventId);
  if (!stored || clean(stored.request_hash) !== requestHash || Number(stored.evidence_version) !== evidenceVersion) throw new NicheEvidenceCommandError("EVIDENCE_COMMIT_NOT_VERIFIED", 503, "The evidence write could not be verified");
  return receipt(stored, false);
}
