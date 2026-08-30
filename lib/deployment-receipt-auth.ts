import { canonicalStringify } from "./canonical-json";
import {
  DEPLOYMENT_REPOSITORY,
  DeploymentReceiptError,
  type DeploymentReceiptInput,
} from "./deployment-receipt";

export const DEPLOYMENT_RECEIPT_AUTOMATION_AUTH_VERSION = "DEPLOYMENT_RECEIPT_AUTOMATION_AUTH_V1" as const;
export const DEPLOYMENT_RECEIPT_AUTOMATION_ISSUER = "youtube-ai-factory-sites-deployment-control" as const;
export const DEPLOYMENT_RECEIPT_AUTOMATION_SUBJECT = "exact-tree-deployment-receipt-writer" as const;
export const DEPLOYMENT_RECEIPT_AUTOMATION_ACTOR_TYPE = "AUTOMATION" as const;
export const DEPLOYMENT_RECEIPT_AUTOMATION_SCOPE = "deployment_receipt:append" as const;
export const DEPLOYMENT_RECEIPT_AUTOMATION_ENVIRONMENT = "production" as const;
export const DEPLOYMENT_RECEIPT_AUTOMATION_METHOD = "POST" as const;
export const DEPLOYMENT_RECEIPT_AUTOMATION_ROUTE = "/api/factory/deployment-evidence" as const;
export const DEPLOYMENT_RECEIPT_AUTOMATION_MAX_TTL_MS = 5 * 60 * 1000;
export const DEPLOYMENT_RECEIPT_AUTOMATION_CLOCK_SKEW_MS = 30 * 1000;
export const DEPLOYMENT_RECEIPT_AUTOMATION_READ_SUBJECT = "exact-tree-deployment-receipt-reader" as const;
export const DEPLOYMENT_RECEIPT_AUTOMATION_READ_SCOPE = "deployment_receipt:read" as const;
export const DEPLOYMENT_RECEIPT_AUTOMATION_READ_METHOD = "GET" as const;
export const DEPLOYMENT_RECEIPT_AUTOMATION_READ_ROUTE = "/api/factory/deployment-evidence/automation-read" as const;

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{16,200}$/;

export const DEPLOYMENT_RECEIPT_AUTOMATION_HEADERS = {
  version: "x-factory-automation-version",
  issuer: "x-factory-automation-issuer",
  subject: "x-factory-automation-subject",
  actorType: "x-factory-automation-actor-type",
  scope: "x-factory-automation-scope",
  environment: "x-factory-automation-environment",
  issuedAt: "x-factory-automation-issued-at",
  expiresAt: "x-factory-automation-expires-at",
  nonce: "x-factory-automation-nonce",
  idempotencyKey: "idempotency-key",
  bodyHash: "x-content-sha256",
  repository: "x-deployment-repository",
  githubCommit: "x-deployment-github-commit",
  gitTree: "x-deployment-git-tree",
  sitesVersion: "x-deployment-sites-version",
  environmentRevision: "x-deployment-environment-revision",
  signature: "x-factory-automation-signature",
} as const;

export type DeploymentReceiptAutomationClaims = {
  version: typeof DEPLOYMENT_RECEIPT_AUTOMATION_AUTH_VERSION;
  issuer: typeof DEPLOYMENT_RECEIPT_AUTOMATION_ISSUER;
  subject: typeof DEPLOYMENT_RECEIPT_AUTOMATION_SUBJECT;
  actor_type: typeof DEPLOYMENT_RECEIPT_AUTOMATION_ACTOR_TYPE;
  scope: typeof DEPLOYMENT_RECEIPT_AUTOMATION_SCOPE;
  environment: typeof DEPLOYMENT_RECEIPT_AUTOMATION_ENVIRONMENT;
  method: typeof DEPLOYMENT_RECEIPT_AUTOMATION_METHOD;
  route: typeof DEPLOYMENT_RECEIPT_AUTOMATION_ROUTE;
  issued_at: string;
  expires_at: string;
  nonce: string;
  idempotency_key: string;
  body_sha256: string;
  github_repository: typeof DEPLOYMENT_REPOSITORY;
  github_commit_sha: string;
  git_tree_sha: string;
  sites_version: number;
  environment_revision: number;
};

export type VerifiedDeploymentReceiptAutomationRequest = {
  actor: `${typeof DEPLOYMENT_RECEIPT_AUTOMATION_ACTOR_TYPE}:${typeof DEPLOYMENT_RECEIPT_AUTOMATION_SUBJECT}`;
  claims: DeploymentReceiptAutomationClaims;
  body: DeploymentReceiptInput;
};

export type DeploymentReceiptAutomationReadClaims = {
  version: typeof DEPLOYMENT_RECEIPT_AUTOMATION_AUTH_VERSION;
  issuer: typeof DEPLOYMENT_RECEIPT_AUTOMATION_ISSUER;
  subject: typeof DEPLOYMENT_RECEIPT_AUTOMATION_READ_SUBJECT;
  actor_type: typeof DEPLOYMENT_RECEIPT_AUTOMATION_ACTOR_TYPE;
  scope: typeof DEPLOYMENT_RECEIPT_AUTOMATION_READ_SCOPE;
  environment: typeof DEPLOYMENT_RECEIPT_AUTOMATION_ENVIRONMENT;
  method: typeof DEPLOYMENT_RECEIPT_AUTOMATION_READ_METHOD;
  route: typeof DEPLOYMENT_RECEIPT_AUTOMATION_READ_ROUTE;
  issued_at: string;
  expires_at: string;
  nonce: string;
};

function requiredHeader(request: Request, name: string) {
  const value = request.headers.get(name)?.trim() || "";
  if (!value) throw new DeploymentReceiptError("AUTOMATION_AUTHENTICATION_REQUIRED", "A complete signed deployment receipt credential is required", 401);
  return value;
}

function canonicalTimestamp(value: string, field: string) {
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) {
    throw new DeploymentReceiptError("AUTOMATION_TIMESTAMP_INVALID", `Automation ${field} must be canonical UTC`, 401);
  }
  return milliseconds;
}

function safeInteger(value: string, field: string, minimum: number) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new DeploymentReceiptError("AUTOMATION_BINDING_INVALID", `Automation ${field} binding is invalid`, 401);
  }
  return parsed;
}

function exact(value: string, expected: string, code = "AUTOMATION_SCOPE_FORBIDDEN") {
  if (value !== expected) throw new DeploymentReceiptError(code, "Automation credential is not authorized for this exact operation", 403);
}

function object(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_BODY_INVALID", "Deployment receipt must be a JSON object", 400);
  }
  return value as Record<string, unknown>;
}

function stringField(record: Record<string, unknown>, field: string) {
  return typeof record[field] === "string" ? String(record[field]).trim() : "";
}

function integerField(record: Record<string, unknown>, field: string) {
  const value = Number(record[field]);
  return Number.isSafeInteger(value) ? value : Number.NaN;
}

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function fromHex(value: string) {
  if (!SHA256_PATTERN.test(value)) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  return bytes;
}

export async function deploymentReceiptBodyHash(rawBody: string) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawBody)));
}

export function buildDeploymentReceiptAutomationSigningPayload(claims: DeploymentReceiptAutomationClaims) {
  return canonicalStringify(claims);
}

export function buildDeploymentReceiptAutomationReadSigningPayload(claims: DeploymentReceiptAutomationReadClaims) {
  return canonicalStringify(claims);
}

async function verifyHmac(secret: string, payload: string, signatureHex: string) {
  const signature = fromHex(signatureHex);
  if (!signature || secret.length < 32) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify("HMAC", key, signature, new TextEncoder().encode(payload));
}

export function authorizeDeploymentReceiptOwner(
  user: { email: string } | null,
  configuredOwnerEmails: string | undefined,
) {
  if (!user) throw new DeploymentReceiptError("SIWC_AUTHENTICATION_REQUIRED", "Sign in with ChatGPT before reading deployment evidence", 401);
  const allowlist = new Set(String(configuredOwnerEmails || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
  if (!allowlist.size || !allowlist.has(user.email.trim().toLowerCase())) {
    throw new DeploymentReceiptError("OWNER_AUTHORIZATION_REQUIRED", "This identity is not authorized to access deployment evidence", 403);
  }
  return user;
}

export async function verifyDeploymentReceiptAutomationAuth(
  request: Request,
  rawBody: string,
  secret: string | undefined,
  nowMilliseconds = Date.now(),
): Promise<VerifiedDeploymentReceiptAutomationRequest> {
  const url = new URL(request.url);
  if (request.method !== DEPLOYMENT_RECEIPT_AUTOMATION_METHOD || url.pathname !== DEPLOYMENT_RECEIPT_AUTOMATION_ROUTE || url.search) {
    throw new DeploymentReceiptError("AUTOMATION_TARGET_FORBIDDEN", "Automation credential is not valid for this method or route", 403);
  }
  if (!secret || secret.length < 32) {
    throw new DeploymentReceiptError("AUTOMATION_AUTHORITY_UNCONFIGURED", "Deployment receipt automation authority is not configured", 503);
  }

  const version = requiredHeader(request, DEPLOYMENT_RECEIPT_AUTOMATION_HEADERS.version);
  const issuer = requiredHeader(request, DEPLOYMENT_RECEIPT_AUTOMATION_HEADERS.issuer);
  const subject = requiredHeader(request, DEPLOYMENT_RECEIPT_AUTOMATION_HEADERS.subject);
  const actorType = requiredHeader(request, DEPLOYMENT_RECEIPT_AUTOMATION_HEADERS.actorType);
  const scope = requiredHeader(request, DEPLOYMENT_RECEIPT_AUTOMATION_HEADERS.scope);
  const environment = requiredHeader(request, DEPLOYMENT_RECEIPT_AUTOMATION_HEADERS.environment);
  const issuedAt = requiredHeader(request, DEPLOYMENT_RECEIPT_AUTOMATION_HEADERS.issuedAt);
  const expiresAt = requiredHeader(request, DEPLOYMENT_RECEIPT_AUTOMATION_HEADERS.expiresAt);
  const nonce = requiredHeader(request, DEPLOYMENT_RECEIPT_AUTOMATION_HEADERS.nonce);
  const idempotencyKey = requiredHeader(request, DEPLOYMENT_RECEIPT_AUTOMATION_HEADERS.idempotencyKey);
  const claimedBodyHash = requiredHeader(request, DEPLOYMENT_RECEIPT_AUTOMATION_HEADERS.bodyHash).toLowerCase();
  const repository = requiredHeader(request, DEPLOYMENT_RECEIPT_AUTOMATION_HEADERS.repository);
  const githubCommit = requiredHeader(request, DEPLOYMENT_RECEIPT_AUTOMATION_HEADERS.githubCommit).toLowerCase();
  const gitTree = requiredHeader(request, DEPLOYMENT_RECEIPT_AUTOMATION_HEADERS.gitTree).toLowerCase();
  const sitesVersion = safeInteger(requiredHeader(request, DEPLOYMENT_RECEIPT_AUTOMATION_HEADERS.sitesVersion), "Sites version", 1);
  const environmentRevision = safeInteger(requiredHeader(request, DEPLOYMENT_RECEIPT_AUTOMATION_HEADERS.environmentRevision), "environment revision", 0);
  const signature = requiredHeader(request, DEPLOYMENT_RECEIPT_AUTOMATION_HEADERS.signature).toLowerCase();

  exact(version, DEPLOYMENT_RECEIPT_AUTOMATION_AUTH_VERSION);
  exact(issuer, DEPLOYMENT_RECEIPT_AUTOMATION_ISSUER);
  exact(subject, DEPLOYMENT_RECEIPT_AUTOMATION_SUBJECT);
  exact(actorType, DEPLOYMENT_RECEIPT_AUTOMATION_ACTOR_TYPE);
  exact(scope, DEPLOYMENT_RECEIPT_AUTOMATION_SCOPE);
  exact(environment, DEPLOYMENT_RECEIPT_AUTOMATION_ENVIRONMENT);
  exact(repository, DEPLOYMENT_REPOSITORY, "DEPLOYMENT_REPOSITORY_MISMATCH");
  if (!REQUEST_ID_PATTERN.test(nonce) || !REQUEST_ID_PATTERN.test(idempotencyKey)) {
    throw new DeploymentReceiptError("AUTOMATION_REPLAY_IDENTITY_INVALID", "Automation nonce and idempotency key must be stable bounded identifiers", 401);
  }

  const issuedAtMilliseconds = canonicalTimestamp(issuedAt, "issued_at");
  const expiresAtMilliseconds = canonicalTimestamp(expiresAt, "expires_at");
  if (expiresAtMilliseconds <= issuedAtMilliseconds || expiresAtMilliseconds - issuedAtMilliseconds > DEPLOYMENT_RECEIPT_AUTOMATION_MAX_TTL_MS) {
    throw new DeploymentReceiptError("AUTOMATION_EXPIRY_INVALID", "Automation credential expiry is outside the bounded lifetime", 401);
  }
  if (nowMilliseconds + DEPLOYMENT_RECEIPT_AUTOMATION_CLOCK_SKEW_MS < issuedAtMilliseconds || nowMilliseconds > expiresAtMilliseconds) {
    throw new DeploymentReceiptError("AUTOMATION_CREDENTIAL_EXPIRED", "Automation credential is expired or not yet valid", 401);
  }

  const actualBodyHash = await deploymentReceiptBodyHash(rawBody);
  if (!SHA256_PATTERN.test(claimedBodyHash) || claimedBodyHash !== actualBodyHash) {
    throw new DeploymentReceiptError("AUTOMATION_BODY_HASH_MISMATCH", "Signed body hash does not match the exact request body", 401);
  }

  let parsed: unknown;
  try { parsed = JSON.parse(rawBody); }
  catch { throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_JSON_INVALID", "Deployment receipt is not valid JSON", 400); }
  const body = object(parsed);
  if (stringField(body, "github_repository") !== repository
    || stringField(body, "github_commit_sha").toLowerCase() !== githubCommit
    || stringField(body, "git_tree_sha").toLowerCase() !== gitTree
    || integerField(body, "sites_version") !== sitesVersion
    || integerField(body, "environment_revision") !== environmentRevision) {
    throw new DeploymentReceiptError("AUTOMATION_EVIDENCE_BINDING_MISMATCH", "Signed deployment identity does not match the receipt body", 409);
  }

  const claims: DeploymentReceiptAutomationClaims = {
    version: DEPLOYMENT_RECEIPT_AUTOMATION_AUTH_VERSION,
    issuer: DEPLOYMENT_RECEIPT_AUTOMATION_ISSUER,
    subject: DEPLOYMENT_RECEIPT_AUTOMATION_SUBJECT,
    actor_type: DEPLOYMENT_RECEIPT_AUTOMATION_ACTOR_TYPE,
    scope: DEPLOYMENT_RECEIPT_AUTOMATION_SCOPE,
    environment: DEPLOYMENT_RECEIPT_AUTOMATION_ENVIRONMENT,
    method: DEPLOYMENT_RECEIPT_AUTOMATION_METHOD,
    route: DEPLOYMENT_RECEIPT_AUTOMATION_ROUTE,
    issued_at: issuedAt,
    expires_at: expiresAt,
    nonce,
    idempotency_key: idempotencyKey,
    body_sha256: actualBodyHash,
    github_repository: DEPLOYMENT_REPOSITORY,
    github_commit_sha: githubCommit,
    git_tree_sha: gitTree,
    sites_version: sitesVersion,
    environment_revision: environmentRevision,
  };
  if (!await verifyHmac(secret, buildDeploymentReceiptAutomationSigningPayload(claims), signature)) {
    throw new DeploymentReceiptError("AUTOMATION_SIGNATURE_INVALID", "Automation request signature is invalid", 401);
  }
  return {
    actor: `${DEPLOYMENT_RECEIPT_AUTOMATION_ACTOR_TYPE}:${DEPLOYMENT_RECEIPT_AUTOMATION_SUBJECT}`,
    claims,
    body: body as DeploymentReceiptInput,
  };
}

export async function verifyDeploymentReceiptAutomationReadAuth(
  request: Request,
  secret: string | undefined,
  nowMilliseconds = Date.now(),
) {
  const url = new URL(request.url);
  if (request.method !== DEPLOYMENT_RECEIPT_AUTOMATION_READ_METHOD || url.pathname !== DEPLOYMENT_RECEIPT_AUTOMATION_READ_ROUTE || url.search) {
    throw new DeploymentReceiptError("AUTOMATION_TARGET_FORBIDDEN", "Automation read credential is not valid for this method or route", 403);
  }
  if (!secret || secret.length < 32) {
    throw new DeploymentReceiptError("AUTOMATION_AUTHORITY_UNCONFIGURED", "Deployment receipt automation authority is not configured", 503);
  }
  const map = DEPLOYMENT_RECEIPT_AUTOMATION_HEADERS;
  const claims: DeploymentReceiptAutomationReadClaims = {
    version: requiredHeader(request, map.version) as DeploymentReceiptAutomationReadClaims["version"],
    issuer: requiredHeader(request, map.issuer) as DeploymentReceiptAutomationReadClaims["issuer"],
    subject: requiredHeader(request, map.subject) as DeploymentReceiptAutomationReadClaims["subject"],
    actor_type: requiredHeader(request, map.actorType) as DeploymentReceiptAutomationReadClaims["actor_type"],
    scope: requiredHeader(request, map.scope) as DeploymentReceiptAutomationReadClaims["scope"],
    environment: requiredHeader(request, map.environment) as DeploymentReceiptAutomationReadClaims["environment"],
    method: DEPLOYMENT_RECEIPT_AUTOMATION_READ_METHOD,
    route: DEPLOYMENT_RECEIPT_AUTOMATION_READ_ROUTE,
    issued_at: requiredHeader(request, map.issuedAt),
    expires_at: requiredHeader(request, map.expiresAt),
    nonce: requiredHeader(request, map.nonce),
  };
  exact(claims.version, DEPLOYMENT_RECEIPT_AUTOMATION_AUTH_VERSION);
  exact(claims.issuer, DEPLOYMENT_RECEIPT_AUTOMATION_ISSUER);
  exact(claims.subject, DEPLOYMENT_RECEIPT_AUTOMATION_READ_SUBJECT);
  exact(claims.actor_type, DEPLOYMENT_RECEIPT_AUTOMATION_ACTOR_TYPE);
  exact(claims.scope, DEPLOYMENT_RECEIPT_AUTOMATION_READ_SCOPE);
  exact(claims.environment, DEPLOYMENT_RECEIPT_AUTOMATION_ENVIRONMENT);
  if (!REQUEST_ID_PATTERN.test(claims.nonce)) throw new DeploymentReceiptError("AUTOMATION_REPLAY_IDENTITY_INVALID", "Automation read nonce is invalid", 401);
  const issuedAtMilliseconds = canonicalTimestamp(claims.issued_at, "issued_at");
  const expiresAtMilliseconds = canonicalTimestamp(claims.expires_at, "expires_at");
  if (expiresAtMilliseconds <= issuedAtMilliseconds || expiresAtMilliseconds - issuedAtMilliseconds > DEPLOYMENT_RECEIPT_AUTOMATION_MAX_TTL_MS) {
    throw new DeploymentReceiptError("AUTOMATION_EXPIRY_INVALID", "Automation read credential expiry is outside the bounded lifetime", 401);
  }
  if (nowMilliseconds + DEPLOYMENT_RECEIPT_AUTOMATION_CLOCK_SKEW_MS < issuedAtMilliseconds || nowMilliseconds > expiresAtMilliseconds) {
    throw new DeploymentReceiptError("AUTOMATION_CREDENTIAL_EXPIRED", "Automation read credential is expired or not yet valid", 401);
  }
  const signature = requiredHeader(request, map.signature).toLowerCase();
  if (!await verifyHmac(secret, buildDeploymentReceiptAutomationReadSigningPayload(claims), signature)) {
    throw new DeploymentReceiptError("AUTOMATION_SIGNATURE_INVALID", "Automation read signature is invalid", 401);
  }
  return { actor: `${DEPLOYMENT_RECEIPT_AUTOMATION_ACTOR_TYPE}:${DEPLOYMENT_RECEIPT_AUTOMATION_READ_SUBJECT}` as const, claims };
}
