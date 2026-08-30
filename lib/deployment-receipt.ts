import { canonicalHash, canonicalStringify } from "./canonical-json";

export const DEPLOYMENT_RECEIPT_SCHEMA_VERSION = "DEPLOYMENT_RECEIPT_V1" as const;
export const DEPLOYMENT_RECEIPT_MAX_FINALIZATION_LAG_MS = 30 * 60 * 1000;
export const DEPLOYMENT_REPOSITORY = "HungQuach301/youtube-ai-factory" as const;

const SHA_PATTERN = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/;
const SECRET_KEY_PATTERN = /(?:authorization|cookie|credential|password|private[_-]?key|secret|token|api[_-]?key|client[_-]?secret)/i;
const REDACTED = "[REDACTED]";

export type SmokeReadbackResult = {
  production_smoke: "PASS";
  d1_readback: "PASS" | "NOT_APPLICABLE";
  r2_readback: "PASS" | "NOT_APPLICABLE";
  provider_requests: number;
  actual_spend_micros: number;
  temporary_controls_removed: true;
};

export type DeploymentReceiptInput = {
  receipt_schema_version: typeof DEPLOYMENT_RECEIPT_SCHEMA_VERSION;
  work_package_id: string;
  pull_request: string;
  github_repository: typeof DEPLOYMENT_REPOSITORY;
  github_commit_sha: string;
  git_tree_sha: string;
  sites_version: number;
  sites_source_commit: string;
  sites_source_tree_sha: string;
  schema_version: string;
  environment_revision: number;
  deployment_terminal_status: "SUCCEEDED";
  deployed_at: string;
  smoke_readback_result: SmokeReadbackResult;
  verified_at: string;
};

export type SealedDeploymentReceipt = DeploymentReceiptInput & {
  receipt_id: string;
  receipt_hash: string;
  verification_result: "PASS";
};

export type ExactTreePreparation = Pick<DeploymentReceiptInput,
  "github_repository" | "github_commit_sha" | "git_tree_sha" | "sites_source_commit" | "sites_source_tree_sha"
> & { preparation_status: "READY" };

export class DeploymentReceiptError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 409) {
    super(message);
    this.name = "DeploymentReceiptError";
  }
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_BODY_INVALID", "Deployment receipt must be a JSON object", 400);
  }
  return value as Record<string, unknown>;
}

function requiredString(record: Record<string, unknown>, key: string) {
  const value = typeof record[key] === "string" ? record[key].trim() : "";
  if (!value) throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_FIELD_MISSING", `Required deployment receipt field is missing: ${key}`, 400);
  return value;
}

function integer(record: Record<string, unknown>, key: string, minimum = 0) {
  const value = Number(record[key]);
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_FIELD_INVALID", `Deployment receipt field must be an integer >= ${minimum}: ${key}`, 400);
  }
  return value;
}

function sha(record: Record<string, unknown>, key: string) {
  const value = requiredString(record, key).toLowerCase();
  if (!SHA_PATTERN.test(value)) throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_SHA_INVALID", `Deployment receipt field is not an exact Git object SHA: ${key}`, 400);
  return value;
}

function timestamp(record: Record<string, unknown>, key: string) {
  const value = requiredString(record, key);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) {
    throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_TIMESTAMP_INVALID", `Deployment receipt timestamp must be canonical UTC: ${key}`, 400);
  }
  return { value, milliseconds };
}

function enumValue<T extends string>(record: Record<string, unknown>, key: string, allowed: readonly T[]) {
  const value = requiredString(record, key) as T;
  if (!allowed.includes(value)) throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_FIELD_INVALID", `Deployment receipt field is invalid: ${key}`, 400);
  return value;
}

export function redactSecretValues(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecretValues);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
    key,
    SECRET_KEY_PATTERN.test(key) ? REDACTED : redactSecretValues(entry),
  ]));
}

export function evaluateExactTreePreparation(input: {
  github_repository: string;
  github_commit_sha: string;
  git_tree_sha: string;
  sites_source_commit: string;
  sites_source_tree_sha: string;
}): ExactTreePreparation {
  const record = object(input);
  const githubRepository = requiredString(record, "github_repository");
  if (githubRepository !== DEPLOYMENT_REPOSITORY) {
    throw new DeploymentReceiptError("DEPLOYMENT_REPOSITORY_MISMATCH", "Deployment preparation targets a non-canonical repository", 409);
  }
  const githubCommitSha = sha(record, "github_commit_sha");
  const gitTreeSha = sha(record, "git_tree_sha");
  const sitesSourceCommit = sha(record, "sites_source_commit");
  const sitesSourceTreeSha = sha(record, "sites_source_tree_sha");
  if (gitTreeSha !== sitesSourceTreeSha) {
    throw new DeploymentReceiptError("EXACT_TREE_MISMATCH", "GitHub and Sites source trees are not exact-match; deployment preparation is blocked", 409);
  }
  return {
    github_repository: DEPLOYMENT_REPOSITORY,
    github_commit_sha: githubCommitSha,
    git_tree_sha: gitTreeSha,
    sites_source_commit: sitesSourceCommit,
    sites_source_tree_sha: sitesSourceTreeSha,
    preparation_status: "READY",
  };
}

export async function sealDeploymentReceipt(value: unknown): Promise<SealedDeploymentReceipt> {
  const record = object(redactSecretValues(value));
  const preparation = evaluateExactTreePreparation({
    github_repository: requiredString(record, "github_repository"),
    github_commit_sha: requiredString(record, "github_commit_sha"),
    git_tree_sha: requiredString(record, "git_tree_sha"),
    sites_source_commit: requiredString(record, "sites_source_commit"),
    sites_source_tree_sha: requiredString(record, "sites_source_tree_sha"),
  });
  const receiptSchemaVersion = enumValue(record, "receipt_schema_version", [DEPLOYMENT_RECEIPT_SCHEMA_VERSION] as const);
  const workPackageId = requiredString(record, "work_package_id");
  const pullRequest = requiredString(record, "pull_request");
  if (!new RegExp(`^https://github\\.com/${DEPLOYMENT_REPOSITORY.replace("/", "\\/")}\\/pull\\/[1-9][0-9]*$`).test(pullRequest)) {
    throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_PULL_REQUEST_INVALID", "Deployment receipt must reference a canonical pull request", 400);
  }
  const sitesVersion = integer(record, "sites_version", 1);
  const schemaVersion = requiredString(record, "schema_version");
  if (!/^\d{4}(?:_[A-Z0-9_]+)?$/.test(schemaVersion)) {
    throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_SCHEMA_INVALID", "Schema version must identify the exact monotonic migration", 400);
  }
  const environmentRevision = integer(record, "environment_revision");
  const deploymentTerminalStatus = enumValue(record, "deployment_terminal_status", ["SUCCEEDED"] as const);
  const deployedAt = timestamp(record, "deployed_at");
  const verifiedAt = timestamp(record, "verified_at");
  if (verifiedAt.milliseconds < deployedAt.milliseconds || verifiedAt.milliseconds - deployedAt.milliseconds > DEPLOYMENT_RECEIPT_MAX_FINALIZATION_LAG_MS) {
    throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_STALE", "Deployment receipt was not finalized within the allowed terminal-evidence window", 409);
  }

  const smoke = object(record.smoke_readback_result);
  const smokeReadbackResult: SmokeReadbackResult = {
    production_smoke: enumValue(smoke, "production_smoke", ["PASS"] as const),
    d1_readback: enumValue(smoke, "d1_readback", ["PASS", "NOT_APPLICABLE"] as const),
    r2_readback: enumValue(smoke, "r2_readback", ["PASS", "NOT_APPLICABLE"] as const),
    provider_requests: integer(smoke, "provider_requests"),
    actual_spend_micros: integer(smoke, "actual_spend_micros"),
    temporary_controls_removed: smoke.temporary_controls_removed === true
      ? true
      : (() => { throw new DeploymentReceiptError("TEMPORARY_CONTROLS_REMAIN", "Temporary controls must be removed before a receipt can pass", 409); })(),
  };

  const body: DeploymentReceiptInput = {
    receipt_schema_version: receiptSchemaVersion,
    work_package_id: workPackageId,
    pull_request: pullRequest,
    github_repository: preparation.github_repository,
    github_commit_sha: preparation.github_commit_sha,
    git_tree_sha: preparation.git_tree_sha,
    sites_version: sitesVersion,
    sites_source_commit: preparation.sites_source_commit,
    sites_source_tree_sha: preparation.sites_source_tree_sha,
    schema_version: schemaVersion,
    environment_revision: environmentRevision,
    deployment_terminal_status: deploymentTerminalStatus,
    deployed_at: deployedAt.value,
    smoke_readback_result: smokeReadbackResult,
    verified_at: verifiedAt.value,
  };
  const receiptHash = await canonicalHash(body);
  return {
    ...body,
    receipt_id: `deployment-receipt-${receiptHash.slice(0, 32)}`,
    receipt_hash: receiptHash,
    verification_result: "PASS",
  };
}

type RuntimeStatement = {
  bind: (...values: unknown[]) => RuntimeStatement;
  run: () => Promise<unknown>;
  first: <T>() => Promise<T | null>;
};
export type DeploymentReceiptDatabase = { prepare: (sql: string) => RuntimeStatement };

type ReceiptRow = {
  receipt_id: string;
  receipt_schema_version: string;
  work_package_id: string;
  pull_request: string;
  github_repository: string;
  github_commit_sha: string;
  git_tree_sha: string;
  sites_version: number;
  sites_source_commit: string;
  sites_source_tree_sha: string;
  schema_version: string;
  environment_revision: number;
  deployment_terminal_status: string;
  deployed_at: string;
  smoke_readback_result_json: string;
  verified_at: string;
  receipt_hash: string;
  verification_result: string;
};

function rowProjection(row: ReceiptRow | null) {
  if (!row) return null;
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
    smoke_readback_result: JSON.parse(row.smoke_readback_result_json),
    verified_at: row.verified_at,
    receipt_hash: row.receipt_hash,
    verification_result: row.verification_result,
  } as SealedDeploymentReceipt;
}

export async function recordDeploymentReceipt(db: DeploymentReceiptDatabase, value: unknown, actor: string) {
  const sealed = await sealDeploymentReceipt(value);
  const existing = await db.prepare("SELECT * FROM factory_deployment_receipts WHERE sites_version=? LIMIT 1").bind(sealed.sites_version).first<ReceiptRow>();
  if (existing) {
    if (existing.receipt_hash !== sealed.receipt_hash) {
      throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_IMMUTABLE_CONFLICT", "Sites version already has different immutable deployment evidence", 409);
    }
    return { receipt: rowProjection(existing), idempotent: true };
  }
  await db.prepare(`INSERT INTO factory_deployment_receipts
    (receipt_id,receipt_schema_version,work_package_id,pull_request,github_repository,github_commit_sha,git_tree_sha,sites_version,sites_source_commit,sites_source_tree_sha,schema_version,environment_revision,deployment_terminal_status,deployed_at,smoke_readback_result_json,verified_at,receipt_hash,verification_result,recorded_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'PASS',?)
    ON CONFLICT DO NOTHING`).bind(
    sealed.receipt_id, sealed.receipt_schema_version, sealed.work_package_id, sealed.pull_request, sealed.github_repository,
    sealed.github_commit_sha, sealed.git_tree_sha, sealed.sites_version, sealed.sites_source_commit, sealed.sites_source_tree_sha,
    sealed.schema_version, sealed.environment_revision, sealed.deployment_terminal_status, sealed.deployed_at,
    canonicalStringify(sealed.smoke_readback_result), sealed.verified_at, sealed.receipt_hash, actor,
  ).run();
  const stored = await db.prepare("SELECT * FROM factory_deployment_receipts WHERE sites_version=? LIMIT 1").bind(sealed.sites_version).first<ReceiptRow>();
  if (!stored || stored.receipt_hash !== sealed.receipt_hash) {
    throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_IMMUTABLE_CONFLICT", "Sites version already has different immutable deployment evidence", 409);
  }
  return { receipt: rowProjection(stored), idempotent: false };
}

export async function readLatestDeploymentReceipt(db: DeploymentReceiptDatabase) {
  const row = await db.prepare("SELECT * FROM factory_deployment_receipts ORDER BY sites_version DESC LIMIT 1").first<ReceiptRow>();
  if (!row) throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_NOT_AVAILABLE", "No immutable deployment receipt is available", 503);
  const projection = rowProjection(row)!;
  if (projection.deployment_terminal_status !== "SUCCEEDED" || projection.verification_result !== "PASS") {
    throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_INVALID", "Latest deployment receipt does not contain terminal PASS evidence", 503);
  }
  if (projection.git_tree_sha !== projection.sites_source_tree_sha) {
    throw new DeploymentReceiptError("EXACT_TREE_MISMATCH", "Latest deployment receipt contains mismatched source trees", 503);
  }
  return projection;
}
