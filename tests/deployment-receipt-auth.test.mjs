import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  DEPLOYMENT_RECEIPT_AUTOMATION_ACTOR_TYPE,
  DEPLOYMENT_RECEIPT_AUTOMATION_AUTH_VERSION,
  DEPLOYMENT_RECEIPT_AUTOMATION_ENVIRONMENT,
  DEPLOYMENT_RECEIPT_AUTOMATION_HEADERS,
  DEPLOYMENT_RECEIPT_AUTOMATION_ISSUER,
  DEPLOYMENT_RECEIPT_AUTOMATION_METHOD,
  DEPLOYMENT_RECEIPT_AUTOMATION_ROUTE,
  DEPLOYMENT_RECEIPT_AUTOMATION_SCOPE,
  DEPLOYMENT_RECEIPT_AUTOMATION_SUBJECT,
  authorizeDeploymentReceiptOwner,
  buildDeploymentReceiptAutomationSigningPayload,
  deploymentReceiptBodyHash,
  verifyDeploymentReceiptAutomationAuth,
} from "../lib/deployment-receipt-auth.ts";
import {
  DeploymentReceiptError,
  recordAuthorizedDeploymentReceipt,
} from "../lib/deployment-receipt.ts";

const sha = (character) => character.repeat(40);
const now = Date.parse("2026-08-30T05:00:00.000Z");

function validReceipt(overrides = {}) {
  return {
    receipt_schema_version: "DEPLOYMENT_RECEIPT_V1",
    work_package_id: "M0-04",
    pull_request: "https://github.com/HungQuach301/youtube-ai-factory/pull/8",
    github_repository: "HungQuach301/youtube-ai-factory",
    github_commit_sha: sha("a"),
    git_tree_sha: sha("b"),
    sites_version: 570,
    sites_source_commit: sha("c"),
    sites_source_tree_sha: sha("b"),
    schema_version: "0129_EXACT_TREE_DEPLOYMENT_RECEIPTS",
    environment_revision: 78,
    deployment_terminal_status: "SUCCEEDED",
    deployed_at: "2026-08-30T04:10:00.000Z",
    smoke_readback_result: {
      production_smoke: "PASS",
      d1_readback: "PASS",
      r2_readback: "PASS",
      provider_requests: 0,
      actual_spend_micros: 0,
      temporary_controls_removed: true,
    },
    verified_at: "2026-08-30T04:20:00.000Z",
    ...overrides,
  };
}

function randomCredential() {
  const bytes = crypto.getRandomValues(new Uint8Array(48));
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function sqliteAdapter(db) {
  return {
    prepare(sql) {
      return {
        values: [],
        bind(...values) { this.values = values; return this; },
        async run() { return db.prepare(sql).run(...this.values); },
        async first() { return db.prepare(sql).get(...this.values) ?? null; },
      };
    },
  };
}

function receiptDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("../drizzle/0129_exact_tree_deployment_receipts.sql", import.meta.url), "utf8"));
  db.exec(readFileSync(new URL("../drizzle/0130_scoped_deployment_receipt_writer.sql", import.meta.url), "utf8"));
  return { db, adapter: sqliteAdapter(db) };
}

async function hmac(secret, payload) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function signedRequest(secret, body, options = {}) {
  const rawBody = typeof body === "string" ? body : JSON.stringify(body);
  const issuedAt = options.issuedAt || new Date(now - 30_000).toISOString();
  const expiresAt = options.expiresAt || new Date(now + 120_000).toISOString();
  const bodyHash = options.claimedBodyHash || await deploymentReceiptBodyHash(rawBody);
  const claims = {
    version: DEPLOYMENT_RECEIPT_AUTOMATION_AUTH_VERSION,
    issuer: DEPLOYMENT_RECEIPT_AUTOMATION_ISSUER,
    subject: DEPLOYMENT_RECEIPT_AUTOMATION_SUBJECT,
    actor_type: DEPLOYMENT_RECEIPT_AUTOMATION_ACTOR_TYPE,
    scope: options.scope || DEPLOYMENT_RECEIPT_AUTOMATION_SCOPE,
    environment: DEPLOYMENT_RECEIPT_AUTOMATION_ENVIRONMENT,
    method: options.method || DEPLOYMENT_RECEIPT_AUTOMATION_METHOD,
    route: options.route || DEPLOYMENT_RECEIPT_AUTOMATION_ROUTE,
    issued_at: issuedAt,
    expires_at: expiresAt,
    nonce: options.nonce || "deployment-receipt-nonce-0001",
    idempotency_key: options.idempotencyKey || "deployment-receipt-idempotency-0001",
    body_sha256: bodyHash,
    github_repository: options.repositoryBinding ?? body.github_repository,
    github_commit_sha: options.githubCommitBinding ?? body.github_commit_sha,
    git_tree_sha: options.gitTreeBinding ?? body.git_tree_sha,
    sites_version: options.sitesVersionBinding ?? body.sites_version,
    environment_revision: options.environmentRevisionBinding ?? body.environment_revision,
  };
  const headers = new Headers({ "content-type": "application/json" });
  const map = DEPLOYMENT_RECEIPT_AUTOMATION_HEADERS;
  for (const [name, value] of [
    [map.version, claims.version], [map.issuer, claims.issuer], [map.subject, claims.subject], [map.actorType, claims.actor_type],
    [map.scope, claims.scope], [map.environment, claims.environment], [map.issuedAt, claims.issued_at], [map.expiresAt, claims.expires_at],
    [map.nonce, claims.nonce], [map.idempotencyKey, claims.idempotency_key], [map.bodyHash, claims.body_sha256],
    [map.repository, claims.github_repository], [map.githubCommit, claims.github_commit_sha], [map.gitTree, claims.git_tree_sha],
    [map.sitesVersion, claims.sites_version], [map.environmentRevision, claims.environment_revision],
  ]) headers.set(name, String(value));
  headers.set(map.signature, await hmac(secret, buildDeploymentReceiptAutomationSigningPayload(claims)));
  return new Request(`https://factory.example${options.requestRoute || DEPLOYMENT_RECEIPT_AUTOMATION_ROUTE}`, {
    method: options.requestMethod || DEPLOYMENT_RECEIPT_AUTOMATION_METHOD,
    headers,
    body: rawBody,
  });
}

async function execute(request, secret, adapter) {
  const rawBody = await request.text();
  const authorization = await verifyDeploymentReceiptAutomationAuth(request, rawBody, secret, now);
  return recordAuthorizedDeploymentReceipt(adapter, authorization.body, authorization);
}

async function rejectsCode(promise, code) {
  await assert.rejects(promise, (error) => error instanceof DeploymentReceiptError && error.code === code);
}

test("1. missing automation credential returns 401", async () => {
  const rawBody = JSON.stringify(validReceipt());
  const request = new Request(`https://factory.example${DEPLOYMENT_RECEIPT_AUTOMATION_ROUTE}`, { method: "POST", headers: { "content-type": "application/json" }, body: rawBody });
  await rejectsCode(verifyDeploymentReceiptAutomationAuth(request, rawBody, randomCredential(), now), "AUTOMATION_AUTHENTICATION_REQUIRED");
});

test("2. invalid SIWC identity returns 401 for human read authorization", () => {
  assert.throws(() => authorizeDeploymentReceiptOwner(null, "owner@example.test"), (error) => error instanceof DeploymentReceiptError && error.status === 401 && error.code === "SIWC_AUTHENTICATION_REQUIRED");
});

test("3. wrong automation scope returns 403", async () => {
  const secret = randomCredential();
  const request = await signedRequest(secret, validReceipt(), { scope: "factory:write" });
  await rejectsCode(execute(request, secret, receiptDb().adapter), "AUTOMATION_SCOPE_FORBIDDEN");
});

test("4. expired automation credential is rejected", async () => {
  const secret = randomCredential();
  const request = await signedRequest(secret, validReceipt(), {
    issuedAt: new Date(now - 180_000).toISOString(),
    expiresAt: new Date(now - 60_000).toISOString(),
  });
  await rejectsCode(execute(request, secret, receiptDb().adapter), "AUTOMATION_CREDENTIAL_EXPIRED");
});

test("5. automation credential is rejected on a different method or route", async () => {
  const secret = randomCredential();
  const methodRequest = await signedRequest(secret, validReceipt(), { method: "PUT", requestMethod: "PUT" });
  await rejectsCode(execute(methodRequest, secret, receiptDb().adapter), "AUTOMATION_TARGET_FORBIDDEN");
  const routeRequest = await signedRequest(secret, validReceipt(), { route: "/api/factory/runtime", requestRoute: "/api/factory/runtime" });
  await rejectsCode(execute(routeRequest, secret, receiptDb().adapter), "AUTOMATION_TARGET_FORBIDDEN");
});

test("6. exact body hash mismatch is rejected", async () => {
  const secret = randomCredential();
  const request = await signedRequest(secret, validReceipt(), { claimedBodyHash: "0".repeat(64) });
  await rejectsCode(execute(request, secret, receiptDb().adapter), "AUTOMATION_BODY_HASH_MISMATCH");
});

test("7. repository, tree, or version mismatch cannot record a receipt", async () => {
  const secret = randomCredential();
  for (const [request, expected] of [
    [await signedRequest(secret, validReceipt({ github_repository: "Other/repository" })), "DEPLOYMENT_REPOSITORY_MISMATCH"],
    [await signedRequest(secret, validReceipt({ sites_source_tree_sha: sha("d") }), { nonce: "deployment-receipt-nonce-tree", idempotencyKey: "deployment-receipt-idempotency-tree" }), "EXACT_TREE_MISMATCH"],
    [await signedRequest(secret, validReceipt({ sites_version: 571 }), { sitesVersionBinding: 570, nonce: "deployment-receipt-nonce-version", idempotencyKey: "deployment-receipt-idempotency-version" }), "AUTOMATION_EVIDENCE_BINDING_MISMATCH"],
  ]) {
    const { db, adapter } = receiptDb();
    await rejectsCode(execute(request, secret, adapter), expected);
    assert.equal(db.prepare("SELECT COUNT(*) count FROM factory_deployment_receipts").get().count, 0);
  }
});

test("8. missing terminal deployment status cannot record a receipt", async () => {
  const secret = randomCredential();
  const body = validReceipt();
  delete body.deployment_terminal_status;
  const { db, adapter } = receiptDb();
  await rejectsCode(execute(await signedRequest(secret, body), secret, adapter), "DEPLOYMENT_RECEIPT_FIELD_MISSING");
  assert.equal(db.prepare("SELECT COUNT(*) count FROM factory_deployment_receipts").get().count, 0);
});

test("9. exact authorized request creates exactly one receipt", async () => {
  const secret = randomCredential();
  const { db, adapter } = receiptDb();
  const result = await execute(await signedRequest(secret, validReceipt()), secret, adapter);
  assert.equal(result.idempotent, false);
  assert.match(result.receipt.receipt_id, /^deployment-receipt-[0-9a-f]{32}$/);
  assert.equal(db.prepare("SELECT COUNT(*) count FROM factory_deployment_receipts").get().count, 1);
  assert.equal(db.prepare("SELECT COUNT(*) count FROM factory_deployment_receipt_append_attempts").get().count, 1);
});

test("10. exact replay returns the same immutable receipt identity and hash", async () => {
  const secret = randomCredential();
  const { db, adapter } = receiptDb();
  const body = validReceipt();
  const first = await execute(await signedRequest(secret, body), secret, adapter);
  const replay = await execute(await signedRequest(secret, body), secret, adapter);
  assert.equal(replay.idempotent, true);
  assert.equal(replay.receipt.receipt_id, first.receipt.receipt_id);
  assert.equal(replay.receipt.receipt_hash, first.receipt.receipt_hash);
  assert.equal(db.prepare("SELECT COUNT(*) count FROM factory_deployment_receipts").get().count, 1);
});

test("11. mutated replay with the same idempotency key fails closed", async () => {
  const secret = randomCredential();
  const { db, adapter } = receiptDb();
  await execute(await signedRequest(secret, validReceipt()), secret, adapter);
  const mutated = validReceipt({ environment_revision: 79 });
  const request = await signedRequest(secret, mutated, { nonce: "deployment-receipt-nonce-mutated" });
  await rejectsCode(execute(request, secret, adapter), "DEPLOYMENT_RECEIPT_IDEMPOTENCY_CONFLICT");
  assert.equal(db.prepare("SELECT COUNT(*) count FROM factory_deployment_receipts").get().count, 1);
});

test("12. secret is absent from logs, response, receipt, and replay ledger", async () => {
  const secret = randomCredential();
  const logs = [];
  const originals = { log: console.log, warn: console.warn, error: console.error };
  console.log = (...values) => logs.push(values);
  console.warn = (...values) => logs.push(values);
  console.error = (...values) => logs.push(values);
  try {
    const { db, adapter } = receiptDb();
    const result = await execute(await signedRequest(secret, validReceipt(), {
      nonce: "deployment-receipt-nonce-secret-check",
      idempotencyKey: "deployment-receipt-idempotency-secret-check",
    }), secret, adapter);
    const persisted = JSON.stringify({
      receipt: db.prepare("SELECT * FROM factory_deployment_receipts").all(),
      attempts: db.prepare("SELECT * FROM factory_deployment_receipt_append_attempts").all(),
    });
    assert.doesNotMatch(JSON.stringify(result), new RegExp(secret));
    assert.doesNotMatch(persisted, new RegExp(secret));
    assert.doesNotMatch(JSON.stringify(logs), new RegExp(secret));
  } finally {
    console.log = originals.log;
    console.warn = originals.warn;
    console.error = originals.error;
  }
});
