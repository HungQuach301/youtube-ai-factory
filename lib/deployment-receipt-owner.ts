import { canonicalHash } from "./canonical-json";
import {
  DEPLOYMENT_RECEIPT_SCHEMA_VERSION,
  DEPLOYMENT_REPOSITORY,
  DeploymentReceiptError,
  recordDeploymentReceipt,
  sealDeploymentReceipt,
  type DeploymentReceiptDatabase,
  type DeploymentReceiptInput,
  type SealedDeploymentReceipt,
} from "./deployment-receipt";

export const FINALIZE_DEPLOYMENT_RECEIPT_COMMAND = "FINALIZE_DEPLOYMENT_RECEIPT" as const;
export const OWNER_DEPLOYMENT_RECEIPT_ROUTE = "/api/factory/deployment-evidence/finalize" as const;

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{16,200}$/;
const RECEIPT_ID_PATTERN = /^deployment-receipt-[0-9a-f]{32}$/;
const RECEIPT_HASH_PATTERN = /^[0-9a-f]{64}$/;
const EVIDENCE_KEYS = new Set([
  "work_package_id", "pull_request", "github_repository", "github_commit_sha", "git_tree_sha", "sites_version",
  "sites_source_commit", "sites_source_tree_sha", "schema_version", "environment_revision", "deployment_terminal_status",
  "deployed_at", "manifest_mismatch", "smoke_readback_result",
]);
const COMMAND_KEYS = new Set(["command", "idempotency_key", "receipt_id", "receipt_hash"]);

type OwnerCommandRow = {
  idempotency_key: string;
  request_hash: string;
  receipt_id: string;
  receipt_hash: string;
};

type OwnerCommand = {
  command: typeof FINALIZE_DEPLOYMENT_RECEIPT_COMMAND;
  idempotency_key: string;
  receipt_id?: string;
  receipt_hash?: string;
};

export type OwnerDeploymentReceiptState = {
  submission_state: "SUBMITTED" | "NOT_SUBMITTED";
  receipt: SealedDeploymentReceipt | null;
  actions: {
    finalize_available: boolean;
    replay_available: boolean;
  };
  creation_blocker: null | {
    code: string;
    message: string;
  };
};

export type OwnerDeploymentEvidenceRuntime = {
  builtSourceTree: string;
  now?: string;
  randomUUID?: () => string;
};

export type OwnerDeploymentReceiptResult = {
  receipt: SealedDeploymentReceipt;
  replay_state: "CREATED" | "IDEMPOTENT_REPLAY";
};

function object(value: unknown, code: string, message: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new DeploymentReceiptError(code, message, 400);
  return value as Record<string, unknown>;
}

function exactKeys(record: Record<string, unknown>, allowed: Set<string>, code: string) {
  if (Object.keys(record).some((key) => !allowed.has(key))) {
    throw new DeploymentReceiptError(code, "Request contains unsupported caller-controlled fields", 400);
  }
}

function string(record: Record<string, unknown>, key: string) {
  const value = typeof record[key] === "string" ? record[key].trim() : "";
  if (!value) throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_FIELD_MISSING", `Required server deployment evidence is missing: ${key}`, 503);
  return value;
}

function integer(record: Record<string, unknown>, key: string, minimum = 0) {
  const value = Number(record[key]);
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_FIELD_INVALID", `Server deployment evidence is invalid: ${key}`, 503);
  }
  return value;
}

function parseCommand(rawBody: string): OwnerCommand {
  let value: unknown;
  try { value = JSON.parse(rawBody); }
  catch { throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_JSON_INVALID", "Owner command is not valid JSON", 400); }
  const command = object(value, "DEPLOYMENT_RECEIPT_COMMAND_INVALID", "Owner command must be a JSON object");
  exactKeys(command, COMMAND_KEYS, "DEPLOYMENT_RECEIPT_COMMAND_FIELD_FORBIDDEN");
  if (command.command !== FINALIZE_DEPLOYMENT_RECEIPT_COMMAND) {
    throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_COMMAND_FORBIDDEN", "Only FINALIZE_DEPLOYMENT_RECEIPT is accepted", 400);
  }
  const idempotencyKey = typeof command.idempotency_key === "string" ? command.idempotency_key.trim() : "";
  if (!REQUEST_ID_PATTERN.test(idempotencyKey)) {
    throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_IDEMPOTENCY_INVALID", "A stable idempotency key is required", 400);
  }
  const receiptId = typeof command.receipt_id === "string" ? command.receipt_id.trim().toLowerCase() : "";
  const receiptHash = typeof command.receipt_hash === "string" ? command.receipt_hash.trim().toLowerCase() : "";
  if (Boolean(receiptId) !== Boolean(receiptHash)
    || (receiptId && !RECEIPT_ID_PATTERN.test(receiptId))
    || (receiptHash && !RECEIPT_HASH_PATTERN.test(receiptHash))) {
    throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_REPLAY_BINDING_INVALID", "Exact replay requires a valid receipt_id and receipt_hash pair", 400);
  }
  return {
    command: FINALIZE_DEPLOYMENT_RECEIPT_COMMAND,
    idempotency_key: idempotencyKey,
    ...(receiptId ? { receipt_id: receiptId, receipt_hash: receiptHash } : {}),
  };
}

export function assertOwnerSameOrigin(request: Request) {
  const url = new URL(request.url);
  if (request.method !== "POST" || url.pathname !== OWNER_DEPLOYMENT_RECEIPT_ROUTE || url.search) {
    throw new DeploymentReceiptError("OWNER_COMMAND_TARGET_FORBIDDEN", "Owner command is not valid for this method or route", 403);
  }
  if (request.headers.get("origin") !== url.origin || request.headers.get("sec-fetch-site") !== "same-origin") {
    throw new DeploymentReceiptError("OWNER_COMMAND_CSRF_REJECTED", "Owner write requires a same-origin browser request", 403);
  }
}

function serverReceiptInput(evidenceJson: string | undefined, runtime: OwnerDeploymentEvidenceRuntime): DeploymentReceiptInput {
  if (!evidenceJson) throw new DeploymentReceiptError("DEPLOYMENT_EVIDENCE_UNAVAILABLE", "Server deployment evidence is unavailable", 503);
  let value: unknown;
  try { value = JSON.parse(evidenceJson); }
  catch { throw new DeploymentReceiptError("DEPLOYMENT_EVIDENCE_INVALID", "Server deployment evidence is malformed", 503); }
  const evidence = object(value, "DEPLOYMENT_EVIDENCE_INVALID", "Server deployment evidence must be an object");
  exactKeys(evidence, EVIDENCE_KEYS, "DEPLOYMENT_EVIDENCE_FIELD_FORBIDDEN");
  if (integer(evidence, "manifest_mismatch") !== 0) {
    throw new DeploymentReceiptError("DEPLOYMENT_MANIFEST_MISMATCH", "Deployment manifest mismatch blocks receipt finalization", 409);
  }
  const builtSourceTree = runtime.builtSourceTree.toLowerCase();
  const sitesSourceCommit = string(evidence, "sites_source_commit").toLowerCase();
  const sitesSourceTree = string(evidence, "sites_source_tree_sha").toLowerCase();
  const gitTree = string(evidence, "git_tree_sha").toLowerCase();
  if (sitesSourceTree !== builtSourceTree || gitTree !== builtSourceTree) {
    throw new DeploymentReceiptError("EXACT_TREE_MISMATCH", "GitHub, Sites and live server source trees are not exact-match", 409);
  }
  if (string(evidence, "deployment_terminal_status") !== "SUCCEEDED") {
    throw new DeploymentReceiptError("DEPLOYMENT_TERMINAL_SUCCESS_REQUIRED", "Terminal deployment success is required", 409);
  }
  return {
    receipt_schema_version: DEPLOYMENT_RECEIPT_SCHEMA_VERSION,
    work_package_id: string(evidence, "work_package_id"),
    pull_request: string(evidence, "pull_request"),
    github_repository: string(evidence, "github_repository") as typeof DEPLOYMENT_REPOSITORY,
    github_commit_sha: string(evidence, "github_commit_sha"),
    git_tree_sha: gitTree,
    sites_version: integer(evidence, "sites_version", 1),
    sites_source_commit: sitesSourceCommit,
    sites_source_tree_sha: sitesSourceTree,
    schema_version: string(evidence, "schema_version"),
    environment_revision: integer(evidence, "environment_revision"),
    deployment_terminal_status: "SUCCEEDED",
    deployed_at: string(evidence, "deployed_at"),
    smoke_readback_result: object(evidence.smoke_readback_result, "DEPLOYMENT_EVIDENCE_INVALID", "Server smoke/read-back evidence is missing") as DeploymentReceiptInput["smoke_readback_result"],
    verified_at: runtime.now || new Date().toISOString(),
  };
}

async function receiptById(db: DeploymentReceiptDatabase, receiptId: string) {
  const row = await db.prepare("SELECT * FROM factory_deployment_receipts WHERE receipt_id=? LIMIT 1").bind(receiptId).first<Record<string, unknown>>();
  if (!row) throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_NOT_AVAILABLE", "Immutable deployment receipt is unavailable", 503);
  return {
    receipt_schema_version: row.receipt_schema_version,
    receipt_id: row.receipt_id,
    work_package_id: row.work_package_id,
    pull_request: row.pull_request,
    github_repository: row.github_repository,
    github_commit_sha: row.github_commit_sha,
    git_tree_sha: row.git_tree_sha,
    sites_version: Number(row.sites_version),
    sites_source_commit: row.sites_source_commit,
    sites_source_tree_sha: row.sites_source_tree_sha,
    schema_version: row.schema_version,
    environment_revision: Number(row.environment_revision),
    deployment_terminal_status: row.deployment_terminal_status,
    deployed_at: row.deployed_at,
    smoke_readback_result: JSON.parse(String(row.smoke_readback_result_json)),
    verified_at: row.verified_at,
    receipt_hash: row.receipt_hash,
    verification_result: row.verification_result,
  } as SealedDeploymentReceipt;
}

async function receiptBySitesVersion(db: DeploymentReceiptDatabase, sitesVersion: number) {
  const row = await db.prepare("SELECT * FROM factory_deployment_receipts WHERE sites_version=? LIMIT 1")
    .bind(sitesVersion).first<Record<string, unknown>>();
  return row ? receiptById(db, String(row.receipt_id)) : null;
}

function assertExactReceiptBinding(receipt: SealedDeploymentReceipt, input: DeploymentReceiptInput) {
  const exactFields: (keyof DeploymentReceiptInput)[] = [
    "work_package_id", "pull_request", "github_repository", "github_commit_sha", "git_tree_sha", "sites_version",
    "sites_source_commit", "sites_source_tree_sha", "schema_version", "environment_revision", "deployment_terminal_status", "deployed_at",
  ];
  const mismatched = exactFields.filter((field) => receipt[field] !== input[field]);
  if (mismatched.length
    || receipt.verification_result !== "PASS"
    || receipt.git_tree_sha !== receipt.sites_source_tree_sha) {
    throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_BINDING_MISMATCH", "Immutable receipt is not bound to the current exact deployment", 409);
  }
}

export async function readOwnerDeploymentReceiptState(
  db: DeploymentReceiptDatabase,
  evidenceJson: string | undefined,
  runtime: OwnerDeploymentEvidenceRuntime,
): Promise<OwnerDeploymentReceiptState> {
  const input = serverReceiptInput(evidenceJson, runtime);
  const receipt = await receiptBySitesVersion(db, input.sites_version);
  if (receipt) {
    assertExactReceiptBinding(receipt, input);
    return {
      submission_state: "SUBMITTED",
      receipt,
      actions: { finalize_available: false, replay_available: true },
      creation_blocker: null,
    };
  }
  try {
    await sealDeploymentReceipt(input);
    return {
      submission_state: "NOT_SUBMITTED",
      receipt: null,
      actions: { finalize_available: true, replay_available: false },
      creation_blocker: null,
    };
  } catch (error) {
    if (error instanceof DeploymentReceiptError && error.code === "DEPLOYMENT_RECEIPT_STALE") {
      return {
        submission_state: "NOT_SUBMITTED",
        receipt: null,
        actions: { finalize_available: false, replay_available: false },
        creation_blocker: { code: error.code, message: error.message },
      };
    }
    throw error;
  }
}

async function audit(db: DeploymentReceiptDatabase, values: {
  actor: string; command: string; attemptedAt: string; idempotencyKey: string; requestHash: string;
  result: "CREATED" | "IDEMPOTENT_REPLAY" | "REJECTED"; resultCode: string; receiptId?: string; receiptHash?: string;
}, randomUUID: () => string) {
  await db.prepare(`INSERT INTO factory_deployment_receipt_owner_audit_events
    (id,actor_type,actor_subject,command,attempted_at,idempotency_key,request_hash,result,result_code,receipt_id,receipt_hash)
    VALUES (?,'CHATGPT_OWNER',?,?,?,?,?,?,?,?,?)`).bind(
    `deployment-receipt-owner-audit-${randomUUID()}`, values.actor, values.command, values.attemptedAt,
    values.idempotencyKey, values.requestHash, values.result, values.resultCode, values.receiptId || null, values.receiptHash || null,
  ).run();
}

export async function finalizeOwnerDeploymentReceipt(
  db: DeploymentReceiptDatabase,
  rawBody: string,
  actorEmail: string,
  evidenceJson: string | undefined,
  runtime: OwnerDeploymentEvidenceRuntime,
): Promise<OwnerDeploymentReceiptResult> {
  const command = parseCommand(rawBody);
  const requestHash = await canonicalHash(command);
  const attemptedAt = runtime.now || new Date().toISOString();
  const randomUUID = runtime.randomUUID || (() => crypto.randomUUID());
  const input = serverReceiptInput(evidenceJson, runtime);
  const existing = await db.prepare("SELECT * FROM factory_deployment_receipt_owner_commands WHERE idempotency_key=? LIMIT 1")
    .bind(command.idempotency_key).first<OwnerCommandRow>();
  if (existing) {
    if (existing.request_hash !== requestHash) {
      await audit(db, { actor: actorEmail, command: command.command, attemptedAt, idempotencyKey: command.idempotency_key, requestHash, result: "REJECTED", resultCode: "DEPLOYMENT_RECEIPT_IDEMPOTENCY_CONFLICT" }, randomUUID);
      throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_IDEMPOTENCY_CONFLICT", "Idempotency key is bound to a different owner command", 409);
    }
    const receipt = await receiptById(db, existing.receipt_id);
    if (receipt.receipt_hash !== existing.receipt_hash) throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_IMMUTABLE_CONFLICT", "Owner command ledger does not match immutable receipt", 409);
    assertExactReceiptBinding(receipt, input);
    if ((command.receipt_id && command.receipt_id !== receipt.receipt_id)
      || (command.receipt_hash && command.receipt_hash !== receipt.receipt_hash)) {
      await audit(db, { actor: actorEmail, command: command.command, attemptedAt, idempotencyKey: command.idempotency_key, requestHash, result: "REJECTED", resultCode: "DEPLOYMENT_RECEIPT_REPLAY_BINDING_MISMATCH" }, randomUUID);
      throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_REPLAY_BINDING_MISMATCH", "Replay binding does not match the immutable receipt", 409);
    }
    await audit(db, { actor: actorEmail, command: command.command, attemptedAt, idempotencyKey: command.idempotency_key, requestHash, result: "IDEMPOTENT_REPLAY", resultCode: "IDEMPOTENT_REPLAY", receiptId: receipt.receipt_id, receiptHash: receipt.receipt_hash }, randomUUID);
    return { receipt, replay_state: "IDEMPOTENT_REPLAY" };
  }

  if (command.receipt_id && command.receipt_hash) {
    try {
      const receipt = await receiptById(db, command.receipt_id);
      if (receipt.receipt_hash !== command.receipt_hash) {
        throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_REPLAY_BINDING_MISMATCH", "Replay hash does not match the immutable receipt", 409);
      }
      assertExactReceiptBinding(receipt, input);
      await db.prepare(`INSERT INTO factory_deployment_receipt_owner_commands
        (idempotency_key,request_hash,actor_type,actor_subject,command,receipt_id,receipt_hash,result,executed_at)
        VALUES (?,?,'CHATGPT_OWNER',?,?,?,?, 'IDEMPOTENT_REPLAY',?) ON CONFLICT DO NOTHING`).bind(
        command.idempotency_key, requestHash, actorEmail, command.command, receipt.receipt_id, receipt.receipt_hash, attemptedAt,
      ).run();
      const stored = await db.prepare("SELECT * FROM factory_deployment_receipt_owner_commands WHERE idempotency_key=? LIMIT 1")
        .bind(command.idempotency_key).first<OwnerCommandRow>();
      if (!stored || stored.request_hash !== requestHash || stored.receipt_id !== receipt.receipt_id || stored.receipt_hash !== receipt.receipt_hash) {
        throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_IDEMPOTENCY_CONFLICT", "Concurrent replay command conflicts with immutable evidence", 409);
      }
      await audit(db, { actor: actorEmail, command: command.command, attemptedAt, idempotencyKey: command.idempotency_key, requestHash, result: "IDEMPOTENT_REPLAY", resultCode: "IDEMPOTENT_REPLAY", receiptId: receipt.receipt_id, receiptHash: receipt.receipt_hash }, randomUUID);
      return { receipt, replay_state: "IDEMPOTENT_REPLAY" };
    } catch (error) {
      const code = error instanceof DeploymentReceiptError ? error.code : "DEPLOYMENT_RECEIPT_WRITE_UNAVAILABLE";
      await audit(db, { actor: actorEmail, command: command.command, attemptedAt, idempotencyKey: command.idempotency_key, requestHash, result: "REJECTED", resultCode: code }, randomUUID);
      throw error;
    }
  }

  let recorded: Awaited<ReturnType<typeof recordDeploymentReceipt>>;
  try {
    recorded = await recordDeploymentReceipt(db, input, `CHATGPT_OWNER:${actorEmail.toLowerCase()}`);
  } catch (error) {
    const code = error instanceof DeploymentReceiptError ? error.code : "DEPLOYMENT_RECEIPT_WRITE_UNAVAILABLE";
    await audit(db, { actor: actorEmail, command: command.command, attemptedAt, idempotencyKey: command.idempotency_key, requestHash, result: "REJECTED", resultCode: code }, randomUUID);
    throw error;
  }
  const replayState = recorded.idempotent ? "IDEMPOTENT_REPLAY" : "CREATED";
  await db.prepare(`INSERT INTO factory_deployment_receipt_owner_commands
    (idempotency_key,request_hash,actor_type,actor_subject,command,receipt_id,receipt_hash,result,executed_at)
    VALUES (?,?,'CHATGPT_OWNER',?,?,?,?,?,?) ON CONFLICT DO NOTHING`).bind(
    command.idempotency_key, requestHash, actorEmail, command.command, recorded.receipt.receipt_id,
    recorded.receipt.receipt_hash, replayState, attemptedAt,
  ).run();
  const stored = await db.prepare("SELECT * FROM factory_deployment_receipt_owner_commands WHERE idempotency_key=? LIMIT 1")
    .bind(command.idempotency_key).first<OwnerCommandRow>();
  if (!stored || stored.request_hash !== requestHash || stored.receipt_id !== recorded.receipt.receipt_id || stored.receipt_hash !== recorded.receipt.receipt_hash) {
    throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_IDEMPOTENCY_CONFLICT", "Concurrent owner command conflicts with immutable evidence", 409);
  }
  await audit(db, { actor: actorEmail, command: command.command, attemptedAt, idempotencyKey: command.idempotency_key, requestHash, result: replayState, resultCode: replayState, receiptId: recorded.receipt.receipt_id, receiptHash: recorded.receipt.receipt_hash }, randomUUID);
  return { receipt: recorded.receipt, replay_state: replayState };
}
