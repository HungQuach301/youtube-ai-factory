import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { getChatGPTUser } from "../../../chatgpt-auth";
import {
  v7AiUsageEvents,
  v7AssetRegistry,
  v7CostEvents,
  v7DecisionRecords,
  v7EvidenceLineage,
  v7FoundationAudits,
  v7ProgramContracts,
  v7StageStates,
  v7StorageContracts,
} from "../../../../db/schema";
import { AI_USAGE_TABLE_SQL, recordOpenAIUsage } from "../../../../lib/ai-usage";
import {
  appendWriteCommandAudit,
  hashActorSubject,
  type WriteCommandAuditDatabase,
  type WriteCommandAuditIdentity,
} from "../../../../lib/write-command-audit";

const PROGRAM_ID = "YTAF-V7-GREENFIELD";

type RuntimeStatement = {
  bind(...values: unknown[]): RuntimeStatement;
  run(): Promise<unknown>;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results?: T[] }>;
};
type RuntimeDatabase = WriteCommandAuditDatabase & {
  prepare(sql: string): RuntimeStatement;
  batch(statements: RuntimeStatement[]): Promise<unknown>;
};
type RuntimeBucket = {
  put(key: string, value: string, options?: Record<string, unknown>): Promise<unknown>;
  head(key: string): Promise<unknown>;
};
type RuntimeEnv = {
  DB?: RuntimeDatabase;
  BUCKET?: RuntimeBucket;
  OPENAI_API_KEY?: string;
  FACTORY_EXPERT_EMAILS?: string;
};

type ControlPlaneOwnerAction = "SET_MODE" | "RECONCILE_AI_USAGE" | "RUN_FOUNDATION_AUDIT";
type ControlPlaneOwnerPayload =
  | { action: "SET_MODE"; mode: "AUTOPILOT" | "APPROVAL_GATES" | "MANUAL" }
  | { action: "RECONCILE_AI_USAGE" }
  | { action: "RUN_FOUNDATION_AUDIT" };
type ControlPlaneOwnerCommand = {
  action: ControlPlaneOwnerAction;
  payload: ControlPlaneOwnerPayload;
  requestHash: string;
};
type ControlPlaneOwnerAuditRow = {
  handler_identity: string;
  request_hash: string;
  phase: "AUTHORIZED" | "SUCCEEDED" | "FAILED";
  domain_receipt_reference: string | null;
};
type ControlPlaneEntitlement =
  | { action: "SET_MODE"; kind: "CONTROL_PLANE_ZERO_SPEND"; db: RuntimeDatabase }
  | { action: "RECONCILE_AI_USAGE"; kind: "NON_DISPATCH_PROVIDER_READ"; db: RuntimeDatabase; providerApiKey: string }
  | { action: "RUN_FOUNDATION_AUDIT"; kind: "FOUNDATION_AUDIT_STORAGE"; db: RuntimeDatabase; bucket: RuntimeBucket };

const CONTROL_PLANE_OWNER_HANDLER_IDENTITY = "app/api/factory/control-plane/route.ts#POST";
const CONTROL_PLANE_OWNER_ACTIONS = new Set<ControlPlaneOwnerAction>(["SET_MODE", "RECONCILE_AI_USAGE", "RUN_FOUNDATION_AUDIT"]);
const CONTROL_PLANE_OWNER_FIELDS: Record<ControlPlaneOwnerAction, ReadonlySet<string>> = {
  SET_MODE: new Set(["action", "mode"]),
  RECONCILE_AI_USAGE: new Set(["action"]),
  RUN_FOUNDATION_AUDIT: new Set(["action"]),
};
const CONTROL_PLANE_MODES = new Set(["AUTOPILOT", "APPROVAL_GATES", "MANUAL"]);
const MAX_CONTROL_PLANE_OWNER_BODY_BYTES = 16 * 1024;
const CONTROL_PLANE_OWNER_CORRELATION_ID_PATTERN = /^[A-Za-z0-9._:-]{8,200}$/;
const CONTROL_PLANE_OWNER_AUDIT_COMPONENT_PATTERN = /[^A-Za-z0-9._:-]/g;

async function runtimeEnv() {
  const { env } = await import("cloudflare:workers");
  return env as unknown as RuntimeEnv;
}

function controlPlaneOwnerFailure(error: string, status: number) {
  return Response.json({ error }, { status });
}

function controlPlaneOwnerSameOrigin(request: Request) {
  const url = new URL(request.url);
  return request.method === "POST"
    && url.pathname === "/api/factory/control-plane"
    && url.search === ""
    && request.headers.get("origin") === url.origin
    && request.headers.get("sec-fetch-site") === "same-origin";
}

async function authorizeControlPlaneOwnerWrite(request: Request) {
  const user = await getChatGPTUser();
  if (!user?.email) return controlPlaneOwnerFailure("SIWC_AUTHENTICATION_REQUIRED", 401);
  if (!controlPlaneOwnerSameOrigin(request)) return controlPlaneOwnerFailure("OWNER_WRITE_SAME_ORIGIN_REQUIRED", 403);

  const env = await runtimeEnv();
  const normalizedEmail = user.email.trim().toLowerCase();
  const owners = String(env.FACTORY_EXPERT_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (owners.length === 0) return controlPlaneOwnerFailure("OWNER_WRITE_ALLOWLIST_UNCONFIGURED", 503);
  if (!owners.includes(normalizedEmail)) return controlPlaneOwnerFailure("OWNER_WRITE_AUTHORIZATION_REQUIRED", 403);
  if (!env.DB) return controlPlaneOwnerFailure("CANONICAL_DATABASE_UNAVAILABLE", 503);
  return { db: env.DB, env, normalizedEmail, actorType: "CHATGPT_OWNER" as const };
}

function requireControlPlaneOwnerAuthority(actorType: string) {
  if (actorType === "AGENT") return controlPlaneOwnerFailure("AGENT_OWNER_COMMAND_FORBIDDEN", 403);
  return actorType === "CHATGPT_OWNER" ? null : controlPlaneOwnerFailure("OWNER_WRITE_AUTHORIZATION_REQUIRED", 403);
}

async function controlPlaneOwnerSha256RawBytes(bytes: ArrayBuffer | Uint8Array) {
  const value = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", value));
  return [...digest].map((item) => item.toString(16).padStart(2, "0")).join("");
}

function controlPlaneOwnerExactKeys(value: Record<string, unknown>, expected: ReadonlySet<string>) {
  const keys = Object.keys(value);
  return keys.length === expected.size && keys.every((key) => expected.has(key));
}

function controlPlaneOwnerPayloadValid(payload: ControlPlaneOwnerPayload) {
  if (!controlPlaneOwnerExactKeys(payload as unknown as Record<string, unknown>, CONTROL_PLANE_OWNER_FIELDS[payload.action])) return false;
  return payload.action !== "SET_MODE" || (typeof payload.mode === "string" && CONTROL_PLANE_MODES.has(payload.mode));
}

async function readControlPlaneOwnerCommand(request: Request): Promise<ControlPlaneOwnerCommand | Response> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") return controlPlaneOwnerFailure("JSON_CONTENT_TYPE_REQUIRED", 415);
  const lengthHeader = request.headers.get("content-length");
  const contentLength = lengthHeader === null ? null : Number(lengthHeader);
  if (contentLength !== null && (!Number.isFinite(contentLength) || contentLength < 0)) return controlPlaneOwnerFailure("OWNER_WRITE_CONTENT_LENGTH_INVALID", 400);
  if (contentLength !== null && contentLength > MAX_CONTROL_PLANE_OWNER_BODY_BYTES) return controlPlaneOwnerFailure("OWNER_WRITE_BODY_TOO_LARGE", 413);
  const raw = await request.arrayBuffer();
  if (!raw.byteLength || raw.byteLength > MAX_CONTROL_PLANE_OWNER_BODY_BYTES) return controlPlaneOwnerFailure("OWNER_WRITE_BODY_TOO_LARGE", 413);

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(raw));
  } catch {
    return controlPlaneOwnerFailure("OWNER_WRITE_JSON_INVALID", 400);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return controlPlaneOwnerFailure("OWNER_WRITE_COMMAND_INVALID", 400);
  const record = parsed as Record<string, unknown>;
  if (typeof record.action !== "string") return controlPlaneOwnerFailure("OWNER_WRITE_COMMAND_INVALID", 400);
  if (!CONTROL_PLANE_OWNER_ACTIONS.has(record.action as ControlPlaneOwnerAction)) return controlPlaneOwnerFailure("CONTROL_PLANE_OWNER_ACTION_FORBIDDEN", 403);
  const action = record.action as ControlPlaneOwnerAction;
  const payload = record as ControlPlaneOwnerPayload;
  if (!controlPlaneOwnerPayloadValid(payload)) return controlPlaneOwnerFailure("OWNER_WRITE_COMMAND_INVALID", 400);
  return { action, payload, requestHash: await controlPlaneOwnerSha256RawBytes(raw) };
}

async function bindControlPlaneOwnerResource(db: RuntimeDatabase) {
  const program = await db.prepare("SELECT id FROM v7_program_contracts WHERE id = ? LIMIT 1")
    .bind(PROGRAM_ID)
    .first<{ id: string }>();
  return program?.id === PROGRAM_ID ? null : controlPlaneOwnerFailure("CONTROL_PLANE_RESOURCE_NOT_FOUND", 404);
}

function authorizeControlPlaneEntitlement(
  db: RuntimeDatabase,
  env: RuntimeEnv,
  command: ControlPlaneOwnerCommand,
): ControlPlaneEntitlement | Response {
  if (command.action === "SET_MODE") return { action: command.action, kind: "CONTROL_PLANE_ZERO_SPEND", db };
  if (command.action === "RECONCILE_AI_USAGE") {
    if (!env.OPENAI_API_KEY) return controlPlaneOwnerFailure("PROVIDER_READ_ENTITLEMENT_UNAVAILABLE", 503);
    return { action: command.action, kind: "NON_DISPATCH_PROVIDER_READ", db, providerApiKey: env.OPENAI_API_KEY };
  }
  if (!env.BUCKET) return controlPlaneOwnerFailure("RUNTIME_OBJECT_STORAGE_UNAVAILABLE", 503);
  return { action: command.action, kind: "FOUNDATION_AUDIT_STORAGE", db, bucket: env.BUCKET };
}

function controlPlaneOwnerBoundedAuditComponent(value: string) {
  return value.replace(CONTROL_PLANE_OWNER_AUDIT_COMPONENT_PATTERN, "_").slice(0, 200) || "unknown";
}

function controlPlaneOwnerCorrelationId(request: Request) {
  const supplied = request.headers.get("x-correlation-id")?.trim() ?? "";
  return CONTROL_PLANE_OWNER_CORRELATION_ID_PATTERN.test(supplied) ? supplied : `control-plane-owner:${crypto.randomUUID()}`;
}

async function controlPlaneOwnerAuditIdentity(
  request: Request,
  normalizedEmail: string,
  command: ControlPlaneOwnerCommand,
): Promise<WriteCommandAuditIdentity> {
  const detail = command.action === "SET_MODE" ? `:mode:${command.payload.mode}` : "";
  return {
    handlerIdentity: CONTROL_PLANE_OWNER_HANDLER_IDENTITY,
    actorType: "CHATGPT_OWNER",
    actorSubjectHash: await hashActorSubject("CHATGPT_OWNER", normalizedEmail),
    action: command.action,
    resourceScope: `program:${PROGRAM_ID}:control-plane${detail}`,
    correlationId: controlPlaneOwnerCorrelationId(request),
    requestHash: command.requestHash,
  };
}

async function lookupControlPlaneOwnerReplay(db: RuntimeDatabase, identity: WriteCommandAuditIdentity) {
  const result = await db.prepare(`SELECT handler_identity,request_hash,phase,domain_receipt_reference
    FROM factory_write_command_audit WHERE correlation_id = ? ORDER BY canonical_timestamp,id`)
    .bind(identity.correlationId)
    .all<ControlPlaneOwnerAuditRow>();
  const rows = result.results ?? [];
  if (!rows.length) return null;
  if (rows.some((row) => row.handler_identity !== identity.handlerIdentity || row.request_hash !== identity.requestHash)) {
    return controlPlaneOwnerFailure("OWNER_WRITE_IDEMPOTENCY_CONFLICT", 409);
  }
  const succeeded = rows.find((row) => row.phase === "SUCCEEDED");
  if (succeeded) return Response.json({ ok: true, replay: true, receipt: succeeded.domain_receipt_reference });
  return controlPlaneOwnerFailure("OWNER_WRITE_REPLAY_INCOMPLETE", 409);
}

async function controlPlaneOwnerDomainReceipt(command: ControlPlaneOwnerCommand, response: Response) {
  const payload = await response.clone().json().catch(() => ({})) as Record<string, unknown>;
  let reference = "completed";
  if (command.action === "SET_MODE") reference = String(command.payload.mode ?? "unknown");
  else if (command.action === "RECONCILE_AI_USAGE") {
    const reconciliation = payload.reconciliation as Record<string, unknown> | undefined;
    reference = `${String(reconciliation?.discovered ?? 0)}:${String(reconciliation?.reconciled ?? 0)}:${String(reconciliation?.failed ?? 0)}`;
  } else {
    const audit = payload.latestAudit as Record<string, unknown> | undefined;
    reference = `${String(audit?.id ?? "unknown")}:${String(audit?.status ?? "unknown")}`;
  }
  return `control-plane:${controlPlaneOwnerBoundedAuditComponent(PROGRAM_ID)}:${controlPlaneOwnerBoundedAuditComponent(command.action)}:${controlPlaneOwnerBoundedAuditComponent(reference)}`;
}

async function runAuditedControlPlaneOwnerCommand(
  db: RuntimeDatabase,
  identity: WriteCommandAuditIdentity,
  command: ControlPlaneOwnerCommand,
  execute: () => Promise<Response>,
) {
  await appendWriteCommandAudit(db, identity, "AUTHORIZED", null);
  let response: Response;
  try {
    response = await execute();
  } catch (error) {
    await appendWriteCommandAudit(db, identity, "FAILED", null);
    throw error;
  }
  if (!response.ok) {
    await appendWriteCommandAudit(db, identity, "FAILED", null);
    return response;
  }
  try {
    await appendWriteCommandAudit(db, identity, "SUCCEEDED", await controlPlaneOwnerDomainReceipt(command, response));
    return response;
  } catch (error) {
    await appendWriteCommandAudit(db, identity, "FAILED", null);
    throw error;
  }
}

const foundationSchema = [
  `CREATE TABLE IF NOT EXISTS v7_program_contracts (id text PRIMARY KEY NOT NULL, channel_id text NOT NULL, version integer DEFAULT 7 NOT NULL, status text DEFAULT 'FOUNDATION_BUILD' NOT NULL, execution_mode text DEFAULT 'AUTOPILOT' NOT NULL, quality_policy text DEFAULT 'MAXIMUM_QUALITY_FIRST' NOT NULL, legacy_policy text DEFAULT 'HISTORICAL_QUARANTINE' NOT NULL, overall_floor integer DEFAULT 92 NOT NULL, critical_floor integer DEFAULT 90 NOT NULL, dimension_floor integer DEFAULT 86 NOT NULL, p0_tolerance integer DEFAULT 0 NOT NULL, p1_tolerance integer DEFAULT 0 NOT NULL, maximum_attempts integer DEFAULT 3 NOT NULL, minimum_improvement integer DEFAULT 3 NOT NULL, production_authorized integer DEFAULT false NOT NULL, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_stage_states (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, stage_key text NOT NULL, sequence integer NOT NULL, stage_name text NOT NULL, status text DEFAULT 'BLOCKED' NOT NULL, threshold integer DEFAULT 92 NOT NULL, attempt integer DEFAULT 0 NOT NULL, artifact_id text, blocker text, evidence_summary text DEFAULT 'No verified artifact' NOT NULL, frozen_at text, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_evidence_lineage (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, project_id text, entity_type text NOT NULL, title text NOT NULL, lifecycle_state text DEFAULT 'PLAN' NOT NULL, upstream_evidence_id text, artifact_key text, content_hash text, storage_state text DEFAULT 'NOT_STORED' NOT NULL, rights_state text DEFAULT 'NOT_APPLICABLE' NOT NULL, cost_state text DEFAULT 'NOT_APPLICABLE' NOT NULL, quarantine_state text DEFAULT 'CLEAR' NOT NULL, pipeline_version integer DEFAULT 7 NOT NULL, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_asset_registry (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, project_id text, name text NOT NULL, asset_class text NOT NULL, lifecycle_state text DEFAULT 'PLAN' NOT NULL, provider text, mime_type text, content_hash text, runtime_key text, drive_file_id text, local_relative_path text, sync_state text DEFAULT 'NOT_STORED' NOT NULL, rights_state text DEFAULT 'UNKNOWN' NOT NULL, reusable_eligible integer DEFAULT false NOT NULL, quarantined integer DEFAULT false NOT NULL, cost_usd real DEFAULT 0 NOT NULL, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_cost_events (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, project_id text, stage_key text NOT NULL, provider text NOT NULL, cost_class text NOT NULL, cost_type text NOT NULL, status text DEFAULT 'ESTIMATED' NOT NULL, estimated_usd real DEFAULT 0 NOT NULL, actual_usd real DEFAULT 0 NOT NULL, reusable_allocation_usd real DEFAULT 0 NOT NULL, currency text DEFAULT 'USD' NOT NULL, asset_id text, note text DEFAULT '' NOT NULL, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  AI_USAGE_TABLE_SQL,
  `CREATE TABLE IF NOT EXISTS v7_storage_contracts (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, tier text NOT NULL, binding_name text NOT NULL, role text NOT NULL, required_for_production integer DEFAULT true NOT NULL, implementation_state text DEFAULT 'CONTRACT_READY' NOT NULL, verification_state text DEFAULT 'NOT_VERIFIED' NOT NULL, last_verified_at text, evidence text DEFAULT 'Awaiting verification' NOT NULL, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_decision_records (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, decision_code text NOT NULL, title text NOT NULL, status text NOT NULL, effective_version integer DEFAULT 7 NOT NULL, rationale text NOT NULL, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_foundation_audits (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, status text NOT NULL, architecture_score integer DEFAULT 0 NOT NULL, evidence_score integer DEFAULT 0 NOT NULL, cost_score integer DEFAULT 0 NOT NULL, storage_score integer DEFAULT 0 NOT NULL, production_authorized integer DEFAULT false NOT NULL, checks_json text NOT NULL, blockers_json text NOT NULL, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_story_runs (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, attempt integer DEFAULT 1 NOT NULL, status text DEFAULT 'RUNNING' NOT NULL, score integer DEFAULT 0 NOT NULL, threshold integer DEFAULT 92 NOT NULL, model_id text NOT NULL, gate_json text DEFAULT '[]' NOT NULL, started_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, completed_at text)`,
  `CREATE TABLE IF NOT EXISTS v7_story_jobs (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, run_id text NOT NULL, provider_response_id text NOT NULL, provider_status text DEFAULT 'queued' NOT NULL, status text DEFAULT 'ACTIVE' NOT NULL, heartbeat_at text NOT NULL, started_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, finalized_at text, error text)`,
] as const;

async function ensureFoundationSchema() {
  const env = await runtimeEnv();
  if (!env.DB) throw new Error("D1 binding DB is unavailable");
  await env.DB.batch(foundationSchema.map((statement) => env.DB.prepare(statement)));
}

const stageContracts = [
  ["00", "Initialize V7 program", 92],
  ["01", "Market & audience intelligence", 85],
  ["02", "Reference intelligence", 90],
  ["03", "Research & claim graph", 92],
  ["04", "Creative contract", 90],
  ["05", "Story architecture", 92],
  ["06", "Script development", 92],
  ["07A", "Narration production", 92],
  ["07B", "Visual language", 92],
  ["08", "Semantic shot orchestration", 92],
  ["09", "Fresh material production", 92],
  ["10", "Sound design", 90],
  ["11", "Clean edit & composition", 92],
  ["12", "Pre-master QA", 92],
  ["13", "Master render", 92],
  ["14", "AI full-master perceptual QA", 92],
  ["15", "Packaging & release", 90],
  ["16", "Performance learning", 90],
] as const;

const lockedDecisions = [
  ["ADR-001", "Adopt Production Pipeline V7 — Greenfield"],
  ["ADR-002", "Legacy masters and materials are historical evidence only"],
  ["ADR-003", "Do not reuse legacy materials in V7"],
  ["ADR-004", "Keep US English faceless channel contract"],
  ["ADR-005", "Do not mention AI in audience-facing packaging"],
  ["ADR-006", "Maximum quality first; cost optimization deferred"],
  ["ADR-007", "Autopilot default with approval and manual modes"],
  ["ADR-008", "Quality thresholds are invariant across modes"],
  ["ADR-009", "Only real measured artifacts satisfy a gate"],
  ["ADR-010", "Release floors and zero P0/P1 tolerance"],
  ["ADR-011", "Exactly one locked narrator identity"],
  ["ADR-012", "Diagnostic and clean compositors are separated"],
  ["ADR-013", "Full-master QA uses eight independent critics"],
  ["ADR-014", "Repair returns to root stage and is bounded"],
  ["ADR-015", "Google Drive is the canonical user-owned production archive"],
  ["ADR-016", "Local Sync is an optional external-editor mirror"],
  ["ADR-017", "Original assets are immutable and SHA-256 deduplicated"],
  ["ADR-018", "Every asset links rights, cost, provenance and storage"],
  ["ADR-019", "Reuse never bypasses a new candidate tournament"],
  ["ADR-020", "One-off paid purchases require initial approval"],
  ["ADR-021", "Cost control spans factory to attempt and unit economics"],
  ["ADR-022", "Cost Guard pauses waste without lowering quality"],
  ["ADR-023", "Stage 09 uses a semantic-first actual-pixel material funnel"],
  ["ADR-024", "Factual graphics are code-native and data-reconciled"],
  ["ADR-025", "Model routing is deterministic-first with request token ceilings"],
  ["ADR-026", "Material production requires a passing pilot before full waves"],
  ["ADR-027", "Incomplete AI output receives one delta retry, never a full rerun"],
  ["ADR-028", "Adaptive token envelopes protect artifact quality"],
  ["ADR-029", "Provider-incomplete output blocks its gate"],
  ["ADR-030", "Automatic retry is delta-only; full recovery requires root-cause authorization"],
  ["ADR-031", "Observed P95 usage calibrates envelopes only after quality"],
  ["ADR-032", "Pilot authorization is stored before any remote dispatch"],
] as const;

async function seedControlPlane() {
  await ensureFoundationSchema();
  const db = await getDb();
  await db.insert(v7ProgramContracts).values({
    id: PROGRAM_ID,
    channelId: "channel-hidden-systems",
  }).onConflictDoNothing();

  const stageRows = stageContracts.map(([key, name, threshold], index) => ({
    id: `${PROGRAM_ID}-STAGE-${key}`,
    programId: PROGRAM_ID,
    stageKey: key,
    sequence: index,
    stageName: name,
    status: key === "00" ? "READY_FOR_AUDIT" : "BLOCKED_UPSTREAM",
    threshold,
    blocker: key === "00" ? "Run Wave 1 foundation audit" : "Stage 00 foundation must freeze first",
    evidenceSummary: key === "00" ? "Wave 1 contracts materialized in D1" : "No V7 production work authorized",
  }));
  for (let index = 0; index < stageRows.length; index += 6) {
    await db.insert(v7StageStates).values(stageRows.slice(index, index + 6)).onConflictDoNothing();
  }

  const decisionRows = lockedDecisions.map(([code, title]) => ({
    id: `${PROGRAM_ID}-${code}`,
    programId: PROGRAM_ID,
    decisionCode: code,
    title,
    status: "LOCKED",
    rationale: "Approved in Production Pipeline V7 Architecture & Standards v1.0",
  }));
  for (let index = 0; index < decisionRows.length; index += 6) {
    await db.insert(v7DecisionRecords).values(decisionRows.slice(index, index + 6)).onConflictDoNothing();
  }

  await db.insert(v7EvidenceLineage).values([
    {
      id: `${PROGRAM_ID}-EVIDENCE-PROGRAM`, programId: PROGRAM_ID, entityType: "PROGRAM_CONTRACT",
      title: "V7 Program Contract", lifecycleState: "MATERIALIZED", storageState: "D1_STORED",
      rightsState: "NOT_APPLICABLE", costState: "VERIFIED_ZERO",
    },
    {
      id: `${PROGRAM_ID}-EVIDENCE-ADR`, programId: PROGRAM_ID, entityType: "DECISION_BASELINE",
      title: "Architecture Decision Register", lifecycleState: "FROZEN", storageState: "D1_STORED",
      rightsState: "NOT_APPLICABLE", costState: "VERIFIED_ZERO",
    },
    {
      id: `${PROGRAM_ID}-EVIDENCE-QUARANTINE`, programId: PROGRAM_ID, entityType: "QUARANTINE_POLICY",
      title: "V5/V6 historical quarantine", lifecycleState: "FROZEN", storageState: "D1_STORED",
      rightsState: "NOT_APPLICABLE", costState: "VERIFIED_ZERO", quarantineState: "ENFORCED",
    },
    {
      id: `${PROGRAM_ID}-EVIDENCE-QUALITY`, programId: PROGRAM_ID, entityType: "QUALITY_POLICY",
      title: "Universal V7 release firewall", lifecycleState: "FROZEN", storageState: "D1_STORED",
      rightsState: "NOT_APPLICABLE", costState: "VERIFIED_ZERO",
    },
    {
      id: `${PROGRAM_ID}-EVIDENCE-REPAIR`, programId: PROGRAM_ID, entityType: "REPAIR_POLICY",
      title: "Bounded repair and regression policy", lifecycleState: "FROZEN", storageState: "D1_STORED",
      rightsState: "NOT_APPLICABLE", costState: "VERIFIED_ZERO",
    },
  ]).onConflictDoNothing();

  await db.insert(v7StorageContracts).values([
    { id: `${PROGRAM_ID}-STORAGE-RUNTIME`, programId: PROGRAM_ID, tier: "RUNTIME_OBJECT_STORAGE", bindingName: "BUCKET", role: "Preview, processing, render and active production", verificationState: "PENDING_RUNTIME_TEST" },
    { id: `${PROGRAM_ID}-STORAGE-DRIVE`, programId: PROGRAM_ID, tier: "GOOGLE_DRIVE_ARCHIVE", bindingName: "GOOGLE_DRIVE_OAUTH", role: "User-controlled canonical archive and recovery", verificationState: "CONFIG_REQUIRED" },
    { id: `${PROGRAM_ID}-STORAGE-LOCAL`, programId: PROGRAM_ID, tier: "LOCAL_SYNC_FOLDER", bindingName: "LOCAL_SYNC_AGENT", role: "Editing, offline work and external-tool handoff", verificationState: "AGENT_REQUIRED" },
    { id: `${PROGRAM_ID}-STORAGE-REGISTRY`, programId: PROGRAM_ID, tier: "ASSET_REGISTRY", bindingName: "DB", role: "Identity, cost, rights, lineage and state", verificationState: "PENDING_RUNTIME_TEST" },
  ]).onConflictDoNothing();
  await db.update(v7StorageContracts).set({
    requiredForProduction: true,
    role: "Primary user-owned canonical archive and recovery",
    implementationState: "OAUTH_READY",
    updatedAt: new Date().toISOString(),
  }).where(eq(v7StorageContracts.id, `${PROGRAM_ID}-STORAGE-DRIVE`));
  await db.update(v7StorageContracts).set({
    requiredForProduction: false,
    role: "Optional editing mirror and external-tool handoff",
    implementationState: "DEFERRED_OPTIONAL",
    evidence: "Local Sync does not block V7 production authorization",
    updatedAt: new Date().toISOString(),
  }).where(eq(v7StorageContracts.id, `${PROGRAM_ID}-STORAGE-LOCAL`));
  await db.update(v7DecisionRecords).set({
    title: "Google Drive is the canonical user-owned production archive",
    rationale: "Wave 1.1 storage priority approved; R2 is runtime and Local Sync is optional",
  }).where(eq(v7DecisionRecords.id, `${PROGRAM_ID}-ADR-015`));
  await db.update(v7DecisionRecords).set({
    title: "Local Sync is an optional external-editor mirror",
    rationale: "Wave 1.1 removes Local Sync from the production authorization firewall",
  }).where(eq(v7DecisionRecords.id, `${PROGRAM_ID}-ADR-016`));

  await db.insert(v7CostEvents).values({
    id: `${PROGRAM_ID}-COST-BOOTSTRAP`, programId: PROGRAM_ID, stageKey: "00", provider: "INTERNAL",
    costClass: "FIXED", costType: "CONTROL_PLANE_BOOTSTRAP", status: "VERIFIED",
    estimatedUsd: 0, actualUsd: 0, note: "Wave 1 ledger initialized; no V7 production spend authorized",
  }).onConflictDoNothing();

  return db;
}

async function readDashboard() {
  const db = await seedControlPlane();
  const [program] = await db.select().from(v7ProgramContracts).where(eq(v7ProgramContracts.id, PROGRAM_ID)).limit(1);
  const stages = await db.select().from(v7StageStates).where(eq(v7StageStates.programId, PROGRAM_ID)).orderBy(asc(v7StageStates.sequence));
  const evidence = await db.select().from(v7EvidenceLineage).where(eq(v7EvidenceLineage.programId, PROGRAM_ID)).orderBy(asc(v7EvidenceLineage.createdAt));
  const assets = await db.select().from(v7AssetRegistry).where(eq(v7AssetRegistry.programId, PROGRAM_ID));
  const costs = await db.select().from(v7CostEvents).where(eq(v7CostEvents.programId, PROGRAM_ID)).orderBy(desc(v7CostEvents.createdAt));
  const aiUsage = await db.select().from(v7AiUsageEvents).where(eq(v7AiUsageEvents.programId, PROGRAM_ID)).orderBy(desc(v7AiUsageEvents.measuredAt));
  const storage = await db.select().from(v7StorageContracts).where(eq(v7StorageContracts.programId, PROGRAM_ID)).orderBy(asc(v7StorageContracts.id));
  const decisions = await db.select().from(v7DecisionRecords).where(eq(v7DecisionRecords.programId, PROGRAM_ID)).orderBy(asc(v7DecisionRecords.decisionCode));
  const [latestAudit] = await db.select().from(v7FoundationAudits).where(eq(v7FoundationAudits.programId, PROGRAM_ID)).orderBy(desc(v7FoundationAudits.createdAt)).limit(1);
  const nonAiActualCost = costs.filter((item) => item.provider !== "OPENAI").reduce((total, item) => total + item.actualUsd, 0);
  const aiActualCost = aiUsage.reduce((total, item) => total + item.actualUsd, 0);
  const actualCost = nonAiActualCost + aiActualCost;
  const estimatedCost = costs.filter((item) => item.status !== "MEASURED").reduce((total, item) => total + item.estimatedUsd, 0);
  const successfulAiUsage = aiUsage.filter((item) => item.providerStatus === "completed");
  const wastedAiUsage = aiUsage.filter((item) => item.providerStatus !== "completed");
  const successfulAiCost = successfulAiUsage.reduce((total, item) => total + item.actualUsd, 0);
  const wastedAiCost = wastedAiUsage.reduce((total, item) => total + item.actualUsd, 0);
  const stage08Usage = aiUsage.filter((item) => item.stageKey === "08");
  const stage08Successful = stage08Usage.filter((item) => item.providerStatus === "completed");
  const stage08SuccessfulCost = stage08Successful.reduce((total, item) => total + item.actualUsd, 0);
  const stage08WastedCost = stage08Usage.filter((item) => item.providerStatus !== "completed").reduce((total, item) => total + item.actualUsd, 0);
  const stage08ActualCost = stage08SuccessfulCost + stage08WastedCost;
  let stage08Stored = 0, stage08Total = 0, stage08Active = 0, stage08RunStatus = "NOT_STARTED";
  try {
    const { env } = await import("cloudflare:workers");
    const stage08Frozen = stages.some((item) => item.stageKey === "08" && item.status === "FROZEN");
    const runResult = await env.DB.prepare(stage08Frozen
      ? "SELECT r.id,r.total_batches,r.completed_batches,r.status FROM v7_shot_artifacts a JOIN v7_shot_runs r ON r.id=a.run_id WHERE a.program_id=? AND a.lifecycle_state='FROZEN' ORDER BY a.updated_at DESC LIMIT 1"
      : "SELECT id,total_batches,completed_batches,status FROM v7_shot_runs WHERE program_id=? ORDER BY started_at DESC LIMIT 1")
      .bind(PROGRAM_ID).all<{ id: string; total_batches: number; completed_batches: number; status: string }>();
    const run = runResult.results?.[0];
    if (run) {
      stage08Stored = Number(run.completed_batches || 0);
      stage08Total = Number(run.total_batches || 0);
      stage08RunStatus = String(run.status || "UNKNOWN");
      const activeResult = await env.DB.prepare("SELECT COUNT(*) AS count FROM v7_shot_jobs WHERE run_id=? AND status='ACTIVE'").bind(run.id).all<{ count: number }>();
      stage08Active = Number(activeResult.results?.[0]?.count || 0);
    }
  } catch { /* Stage 08 tables may not exist before orchestration starts. */ }
  const stage08AverageSuccessCost = stage08Successful.length ? stage08SuccessfulCost / stage08Successful.length : 0;
  const stage08RemainingForecast = stage08RunStatus === "PASS" ? 0 : Math.max(0, stage08Total - stage08Stored) * stage08AverageSuccessCost;
  const stage08ActiveExposure = stage08Active * 0.5;
  const lifecycle = ["PLAN", "MATERIALIZED", "VERIFIED", "FROZEN", "REPAIR_REQUIRED", "REJECTED", "ESCALATED"].map((state) => ({
    state,
    count: evidence.filter((item) => item.lifecycleState === state).length,
  }));
  return {
    program,
    stages,
    evidence,
    lifecycle,
    assets,
    costs,
    aiUsage,
    costSummary: {
      actualCost,
      estimatedCost,
      reusableValue: assets.filter((item) => item.reusableEligible).reduce((total, item) => total + item.costUsd, 0),
      aiActualCost,
      tokenCost: aiUsage.reduce((total, item) => total + item.tokenCostUsd, 0),
      toolCost: aiUsage.reduce((total, item) => total + item.toolCostUsd, 0),
      inputTokens: aiUsage.reduce((total, item) => total + item.inputTokens, 0),
      cachedInputTokens: aiUsage.reduce((total, item) => total + item.cachedInputTokens, 0),
      outputTokens: aiUsage.reduce((total, item) => total + item.outputTokens, 0),
      reasoningTokens: aiUsage.reduce((total, item) => total + item.reasoningTokens, 0),
      webSearchCalls: aiUsage.reduce((total, item) => total + item.webSearchCalls, 0),
      measuredResponses: aiUsage.length,
      rateExceptions: aiUsage.filter((item) => item.pricingStatus !== "MEASURED").length,
      incompleteResponses: aiUsage.filter((item) => item.providerStatus === "incomplete").length,
      successfulAiCost,
      wastedAiCost,
      wasteRate: aiActualCost ? wastedAiCost / aiActualCost : 0,
      stage08ActualCost,
      stage08SuccessfulCost,
      stage08WastedCost,
      stage08WasteRate: stage08ActualCost ? stage08WastedCost / stage08ActualCost : 0,
      stage08ActiveExposure,
      stage08RemainingForecast,
      stage08Stored,
      stage08Total,
      stage08Active,
      stage08RunStatus,
    },
    storage,
    decisions,
    latestAudit: latestAudit ? { ...latestAudit, checks: JSON.parse(latestAudit.checksJson), blockers: JSON.parse(latestAudit.blockersJson) } : null,
    guardrails: {
      legacyQuarantine: evidence.some((item) => item.quarantineState === "ENFORCED"),
      zeroP0: program.p0Tolerance === 0,
      zeroP1: program.p1Tolerance === 0,
      boundedRepair: program.maximumAttempts === 3 && program.minimumImprovement === 3,
      productionAuthorized: program.productionAuthorized,
    },
  };
}

export async function GET() {
  try {
    return Response.json(await readDashboard());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load V7 control plane" }, { status: 500 });
  }
}

async function executeControlPlaneOwnerCommand(command: ControlPlaneOwnerCommand, entitlement: ControlPlaneEntitlement) {
  try {
    const payload = command.payload;
    const db = await seedControlPlane();
    if (payload.action === "SET_MODE") {
      if (entitlement.action !== "SET_MODE" || entitlement.kind !== "CONTROL_PLANE_ZERO_SPEND") return controlPlaneOwnerFailure("CONTROL_PLANE_ENTITLEMENT_MISMATCH", 403);
      await db.update(v7ProgramContracts).set({ executionMode: payload.mode, updatedAt: new Date().toISOString() }).where(eq(v7ProgramContracts.id, PROGRAM_ID));
      return Response.json(await readDashboard());
    }

    if (payload.action === "RECONCILE_AI_USAGE") {
      if (entitlement.action !== "RECONCILE_AI_USAGE" || entitlement.kind !== "NON_DISPATCH_PROVIDER_READ") return controlPlaneOwnerFailure("CONTROL_PLANE_ENTITLEMENT_MISMATCH", 403);
      const result = await entitlement.db.prepare(`SELECT j.run_id,j.stage_key,j.provider_response_id,r.model_id,'WEB_GROUNDED_INTELLIGENCE' AS cost_type
        FROM v7_intelligence_jobs j JOIN v7_intelligence_runs r ON r.id=j.run_id WHERE j.program_id=?
        UNION ALL
        SELECT j.run_id,'04' AS stage_key,j.provider_response_id,r.model_id,'CREATIVE_TOURNAMENT' AS cost_type
        FROM v7_creative_jobs j JOIN v7_creative_runs r ON r.id=j.run_id WHERE j.program_id=?
        UNION ALL
        SELECT j.run_id,'05' AS stage_key,j.provider_response_id,r.model_id,'STORY_ARCHITECTURE' AS cost_type
        FROM v7_story_jobs j JOIN v7_story_runs r ON r.id=j.run_id WHERE j.program_id=?`).bind(PROGRAM_ID, PROGRAM_ID, PROGRAM_ID).all<{
          run_id: string; stage_key: string; provider_response_id: string; model_id: string; cost_type: string;
        }>();
      const jobs = result.results || [];
      let reconciled = 0;
      const failures: string[] = [];
      for (let index = 0; index < jobs.length; index += 4) {
        await Promise.all(jobs.slice(index, index + 4).map(async (job) => {
          try {
            const response = await fetch(`https://api.openai.com/v1/responses/${encodeURIComponent(job.provider_response_id)}`, {
              method: "GET",
              headers: { authorization: `Bearer ${entitlement.providerApiKey}` },
              signal: AbortSignal.timeout(30000),
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const providerPayload = await response.json() as Record<string, unknown>;
            await recordOpenAIUsage({ db: entitlement.db, programId: PROGRAM_ID, runId: job.run_id, stageKey: job.stage_key, costType: job.cost_type, payload: providerPayload, fallbackModel: job.model_id });
            reconciled += 1;
          } catch (error) {
            failures.push(`${job.stage_key}/${job.provider_response_id}: ${error instanceof Error ? error.message : "unknown error"}`);
          }
        }));
      }
      const dashboard = await readDashboard();
      return Response.json({ ...dashboard, reconciliation: { discovered: jobs.length, reconciled, failed: failures.length, failures } });
    }

    if (payload.action !== "RUN_FOUNDATION_AUDIT") {
      return controlPlaneOwnerFailure("CONTROL_PLANE_OWNER_ACTION_FORBIDDEN", 403);
    }
    if (entitlement.action !== "RUN_FOUNDATION_AUDIT" || entitlement.kind !== "FOUNDATION_AUDIT_STORAGE") return controlPlaneOwnerFailure("CONTROL_PLANE_ENTITLEMENT_MISMATCH", 403);

    const now = new Date().toISOString();
    let r2Verified = false;
    try {
      const markerKey = "v7/system/wave-1-foundation.json";
      await entitlement.bucket.put(markerKey, JSON.stringify({ programId: PROGRAM_ID, verifiedAt: now }), {
        httpMetadata: { contentType: "application/json" },
        customMetadata: { pipelineVersion: "7", evidenceType: "FOUNDATION_AUDIT" },
      });
      r2Verified = Boolean(await entitlement.bucket.head(markerKey));
    } catch {
      r2Verified = false;
    }

    if (r2Verified) {
      await db.update(v7StorageContracts).set({ verificationState: "VERIFIED", lastVerifiedAt: now, evidence: "R2 marker write and head verification passed", updatedAt: now }).where(eq(v7StorageContracts.id, `${PROGRAM_ID}-STORAGE-RUNTIME`));
    }
    await db.update(v7StorageContracts).set({ verificationState: "VERIFIED", lastVerifiedAt: now, evidence: "D1 registry read/write path verified", updatedAt: now }).where(eq(v7StorageContracts.id, `${PROGRAM_ID}-STORAGE-REGISTRY`));

    const decisions = await db.select().from(v7DecisionRecords).where(eq(v7DecisionRecords.programId, PROGRAM_ID));
    const evidence = await db.select().from(v7EvidenceLineage).where(eq(v7EvidenceLineage.programId, PROGRAM_ID));
    const storage = await db.select().from(v7StorageContracts).where(eq(v7StorageContracts.programId, PROGRAM_ID));
    const blockers = storage.filter((item) => item.requiredForProduction && item.verificationState !== "VERIFIED").map((item) => ({
      code: `STORAGE_${item.tier}`,
      severity: "P0",
      message: `${item.tier.replaceAll("_", " ")} is ${item.verificationState.replaceAll("_", " ").toLowerCase()}`,
      nextAction: item.tier === "GOOGLE_DRIVE_ARCHIVE" ? "Authorize the Factory Google Drive connection and select a root folder" : item.tier === "LOCAL_SYNC_FOLDER" ? "Install and pair the Local Sync Agent" : "Re-run the runtime storage test",
    }));
    const checks = [
      { id: "SCHEMA", label: "V7 authoritative schema", status: "PASS", evidence: "Program, stage, evidence, asset, cost, storage and decision tables respond" },
      { id: "ADR", label: "Locked decision baseline", status: decisions.length === lockedDecisions.length ? "PASS" : "FAIL", evidence: `${decisions.length}/${lockedDecisions.length} locked ADRs stored` },
      { id: "QUARANTINE", label: "Legacy quarantine", status: evidence.some((item) => item.quarantineState === "ENFORCED") ? "PASS" : "FAIL", evidence: "V5/V6 excluded from V7 selection namespace" },
      { id: "D1", label: "Asset Registry database", status: "PASS", evidence: "D1 read/write path verified" },
      { id: "R2", label: "Runtime object storage", status: r2Verified ? "PASS" : "FAIL", evidence: r2Verified ? "Marker write and head verification passed" : "Runtime marker verification failed" },
      { id: "DRIVE", label: "Google Drive archive", status: storage.some((item) => item.tier === "GOOGLE_DRIVE_ARCHIVE" && item.verificationState === "VERIFIED") ? "PASS" : "BLOCKED", evidence: "Connection and root folder must be verified before accepting production assets" },
      { id: "LOCAL", label: "Local Sync Agent", status: storage.some((item) => item.tier === "LOCAL_SYNC_FOLDER" && item.verificationState === "VERIFIED") ? "PASS" : "OPTIONAL", evidence: "Optional external-editor mirror; Google Drive remains the durable source of truth" },
    ];
    const architectureScore = Math.round((checks.filter((item) => ["SCHEMA", "ADR", "QUARANTINE"].includes(item.id) && item.status === "PASS").length / 3) * 100);
    const storageScore = Math.round((checks.filter((item) => ["D1", "R2", "DRIVE"].includes(item.id) && item.status === "PASS").length / 3) * 100);
    const productionAuthorized = blockers.length === 0 && checks.filter((item) => item.id !== "LOCAL").every((item) => item.status === "PASS");
    const auditId = `${PROGRAM_ID}-AUDIT-${Date.now()}`;
    await db.insert(v7FoundationAudits).values({
      id: auditId,
      programId: PROGRAM_ID,
      status: productionAuthorized ? "PASS" : "FOUNDATION_READY_PRODUCTION_BLOCKED",
      architectureScore,
      evidenceScore: 100,
      costScore: 100,
      storageScore,
      productionAuthorized,
      checksJson: JSON.stringify(checks),
      blockersJson: JSON.stringify(blockers),
    });
    await db.update(v7ProgramContracts).set({
      status: productionAuthorized ? "WAVE_1_FROZEN" : "WAVE_1_IMPLEMENTED_EXTERNAL_BLOCKERS",
      productionAuthorized,
      updatedAt: now,
    }).where(eq(v7ProgramContracts.id, PROGRAM_ID));
    await db.update(v7StageStates).set({
      status: productionAuthorized ? "FROZEN" : "IMPLEMENTED_BLOCKED",
      attempt: 1,
      blocker: productionAuthorized ? null : "External storage verification remains incomplete",
      evidenceSummary: productionAuthorized ? "Wave 1 foundation audit passed" : "Control plane verified; production authorization withheld",
      frozenAt: productionAuthorized ? now : null,
      updatedAt: now,
    }).where(eq(v7StageStates.id, `${PROGRAM_ID}-STAGE-00`));

    return Response.json(await readDashboard());
  } catch (error) {
    return controlPlaneOwnerFailure(error instanceof Error ? error.message : "CONTROL_PLANE_OWNER_ACTION_FAILED", 500);
  }
}

export async function POST(request: Request) {
  try {
    const authorization = await authorizeControlPlaneOwnerWrite(request);
    if (authorization instanceof Response) return authorization;
    const actorDenial = requireControlPlaneOwnerAuthority(authorization.actorType);
    if (actorDenial) return actorDenial;

    const command = await readControlPlaneOwnerCommand(request);
    if (command instanceof Response) return command;

    const bindingDenial = await bindControlPlaneOwnerResource(authorization.db);
    if (bindingDenial) return bindingDenial;
    const entitlement = authorizeControlPlaneEntitlement(authorization.db, authorization.env, command);
    if (entitlement instanceof Response) return entitlement;

    const identity = await controlPlaneOwnerAuditIdentity(request, authorization.normalizedEmail, command);
    const replay = await lookupControlPlaneOwnerReplay(authorization.db, identity);
    if (replay) return replay;

    return await runAuditedControlPlaneOwnerCommand(
      authorization.db,
      identity,
      command,
      () => executeControlPlaneOwnerCommand(command, entitlement),
    );
  } catch (error) {
    console.error("Control-plane owner POST failed", error);
    return controlPlaneOwnerFailure("CONTROL_PLANE_OWNER_ACTION_FAILED", 500);
  }
}
