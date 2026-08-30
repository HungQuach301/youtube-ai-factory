import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  DeploymentReceiptError,
  evaluateExactTreePreparation,
  readLatestDeploymentReceipt,
  recordDeploymentReceipt,
  redactSecretValues,
  sealDeploymentReceipt,
} from "../lib/deployment-receipt.ts";

const sha = (character) => character.repeat(40);

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
    deployed_at: "2026-08-30T01:00:00.000Z",
    smoke_readback_result: {
      production_smoke: "PASS",
      d1_readback: "PASS",
      r2_readback: "PASS",
      provider_requests: 0,
      actual_spend_micros: 0,
      temporary_controls_removed: true,
    },
    verified_at: "2026-08-30T01:12:00.000Z",
    ...overrides,
  };
}

async function rejectsCode(promise, code) {
  await assert.rejects(promise, (error) => error instanceof DeploymentReceiptError && error.code === code);
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

test("exact GitHub and Sites trees make deployment preparation READY", () => {
  const result = evaluateExactTreePreparation({
    github_repository: "HungQuach301/youtube-ai-factory",
    github_commit_sha: sha("a"),
    git_tree_sha: sha("b"),
    sites_source_commit: sha("c"),
    sites_source_tree_sha: sha("b"),
  });
  assert.equal(result.preparation_status, "READY");
  assert.equal(result.git_tree_sha, result.sites_source_tree_sha);
});

test("tree mismatch fails closed before deployment preparation", () => {
  assert.throws(() => evaluateExactTreePreparation({
    github_repository: "HungQuach301/youtube-ai-factory",
    github_commit_sha: sha("a"),
    git_tree_sha: sha("b"),
    sites_source_commit: sha("c"),
    sites_source_tree_sha: sha("d"),
  }), (error) => error instanceof DeploymentReceiptError && error.code === "EXACT_TREE_MISMATCH");
});

test("stale receipt cannot be sealed", async () => {
  await rejectsCode(sealDeploymentReceipt(validReceipt({ verified_at: "2026-08-30T01:31:00.000Z" })), "DEPLOYMENT_RECEIPT_STALE");
});

test("missing terminal deployment status cannot pass", async () => {
  const receipt = validReceipt();
  delete receipt.deployment_terminal_status;
  await rejectsCode(sealDeploymentReceipt(receipt), "DEPLOYMENT_RECEIPT_FIELD_MISSING");
});

test("secret-like evidence is redacted and excluded from the sealed receipt", async () => {
  const secret = "never-store-this-value";
  const redacted = redactSecretValues({ authorization: secret, nested: { api_key: secret, result: "PASS" } });
  assert.deepEqual(redacted, { authorization: "[REDACTED]", nested: { api_key: "[REDACTED]", result: "PASS" } });
  assert.doesNotMatch(JSON.stringify(redacted), new RegExp(secret));
  const sealed = await sealDeploymentReceipt({ ...validReceipt(), access_token: secret });
  assert.doesNotMatch(JSON.stringify(sealed), new RegExp(secret));
  assert.equal("access_token" in sealed, false);
});

test("receipt storage is append-only, immutable and idempotent", async () => {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("../drizzle/0129_exact_tree_deployment_receipts.sql", import.meta.url), "utf8"));
  const adapter = sqliteAdapter(db);
  const first = await recordDeploymentReceipt(adapter, validReceipt(), "owner@example.test");
  const replay = await recordDeploymentReceipt(adapter, validReceipt(), "owner@example.test");
  assert.equal(first.idempotent, false);
  assert.equal(replay.idempotent, true);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM factory_deployment_receipts").get().count, 1);
  assert.equal((await readLatestDeploymentReceipt(adapter)).verification_result, "PASS");
  assert.throws(() => db.prepare("UPDATE factory_deployment_receipts SET environment_revision=79").run(), /FACTORY_DEPLOYMENT_RECEIPTS_IMMUTABLE/);
  assert.throws(() => db.prepare("DELETE FROM factory_deployment_receipts").run(), /FACTORY_DEPLOYMENT_RECEIPTS_IMMUTABLE/);
  await rejectsCode(recordDeploymentReceipt(adapter, validReceipt({ github_commit_sha: sha("d") }), "owner@example.test"), "DEPLOYMENT_RECEIPT_IMMUTABLE_CONFLICT");
});

test("structured schema contains every minimum deployment identity field", () => {
  const schema = JSON.parse(readFileSync(new URL("../governance/schemas/deployment-receipt.schema.json", import.meta.url), "utf8"));
  for (const field of [
    "github_repository", "github_commit_sha", "git_tree_sha", "sites_version", "sites_source_commit",
    "schema_version", "environment_revision", "deployment_terminal_status", "deployed_at", "smoke_readback_result",
  ]) assert.ok(schema.required.includes(field), field);
  assert.equal(schema.additionalProperties, false);
});
