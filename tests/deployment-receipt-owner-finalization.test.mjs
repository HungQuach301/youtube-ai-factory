import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { authorizeDeploymentReceiptOwner } from "../lib/deployment-receipt-auth.ts";
import { DeploymentReceiptError } from "../lib/deployment-receipt.ts";
import {
  assertOwnerSameOrigin,
  finalizeOwnerDeploymentReceipt,
} from "../lib/deployment-receipt-owner.ts";

const sha = (character) => character.repeat(40);
const now = "2026-08-30T05:00:00.000Z";
const sourceCommit = sha("c");
const sourceTree = sha("b");

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
  for (const migration of [
    "0129_exact_tree_deployment_receipts.sql",
    "0130_scoped_deployment_receipt_writer.sql",
    "0131_owner_deployment_receipt_finalization.sql",
  ]) db.exec(readFileSync(new URL(`../drizzle/${migration}`, import.meta.url), "utf8"));
  return { db, adapter: sqliteAdapter(db) };
}

function evidence(overrides = {}) {
  return JSON.stringify({
    work_package_id: "M0-04B",
    pull_request: "https://github.com/HungQuach301/youtube-ai-factory/pull/10",
    github_repository: "HungQuach301/youtube-ai-factory",
    github_commit_sha: sha("a"),
    git_tree_sha: sourceTree,
    sites_version: 573,
    sites_source_commit: sourceCommit,
    sites_source_tree_sha: sourceTree,
    schema_version: "0131_OWNER_DEPLOYMENT_RECEIPT_FINALIZATION",
    environment_revision: 82,
    deployment_terminal_status: "SUCCEEDED",
    deployed_at: "2026-08-30T04:50:00.000Z",
    manifest_mismatch: 0,
    smoke_readback_result: {
      production_smoke: "PASS",
      d1_readback: "PASS",
      r2_readback: "NOT_APPLICABLE",
      provider_requests: 0,
      actual_spend_micros: 0,
      temporary_controls_removed: true,
    },
    ...overrides,
  });
}

function command(idempotencyKey = "deployment-receipt-owner-idempotency-0001", overrides = {}) {
  return JSON.stringify({ command: "FINALIZE_DEPLOYMENT_RECEIPT", idempotency_key: idempotencyKey, ...overrides });
}

function runtime() {
  let sequence = 0;
  return { builtSourceTree: sourceTree, now, randomUUID: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}` };
}

async function rejectsCode(promise, code) {
  await assert.rejects(promise, (error) => error instanceof DeploymentReceiptError && error.code === code);
}

test("1. anonymous owner POST is rejected with 401", () => {
  assert.throws(() => authorizeDeploymentReceiptOwner(null, "owner@example.test"), (error) => error instanceof DeploymentReceiptError && error.status === 401);
});

test("2. authenticated non-owner POST is rejected with 403", () => {
  assert.throws(() => authorizeDeploymentReceiptOwner({ email: "viewer@example.test" }, "owner@example.test"), (error) => error instanceof DeploymentReceiptError && error.status === 403);
});

test("3. wrong owner command is rejected", async () => {
  await rejectsCode(finalizeOwnerDeploymentReceipt(receiptDb().adapter, command(undefined, { command: "APPROVE_DEPLOYMENT" }), "owner@example.test", evidence(), runtime()), "DEPLOYMENT_RECEIPT_COMMAND_FORBIDDEN");
});

test("4. cross-origin and missing fetch-metadata owner requests are rejected", () => {
  for (const headers of [
    { origin: "https://evil.example", "sec-fetch-site": "cross-site" },
    { origin: "https://factory.example" },
  ]) {
    const request = new Request("https://factory.example/api/factory/deployment-evidence/finalize", { method: "POST", headers, body: "{}" });
    assert.throws(() => assertOwnerSameOrigin(request), (error) => error instanceof DeploymentReceiptError && error.code === "OWNER_COMMAND_CSRF_REJECTED");
  }
});

test("5. stale deployment evidence is rejected", async () => {
  const { db, adapter } = receiptDb();
  await rejectsCode(finalizeOwnerDeploymentReceipt(adapter, command(), "owner@example.test", evidence({ deployed_at: "2026-08-30T04:00:00.000Z" }), runtime()), "DEPLOYMENT_RECEIPT_STALE");
  assert.equal(db.prepare("SELECT COUNT(*) count FROM factory_deployment_receipts").get().count, 0);
  assert.equal(db.prepare("SELECT result FROM factory_deployment_receipt_owner_audit_events").get().result, "REJECTED");
});

test("6. tree or manifest mismatch is rejected", async () => {
  for (const [payload, code] of [
    [evidence({ sites_source_tree_sha: sha("d") }), "EXACT_TREE_MISMATCH"],
    [evidence({ manifest_mismatch: 1 }), "DEPLOYMENT_MANIFEST_MISMATCH"],
  ]) {
    const { db, adapter } = receiptDb();
    await rejectsCode(finalizeOwnerDeploymentReceipt(adapter, command(), "owner@example.test", payload, runtime()), code);
    assert.equal(db.prepare("SELECT COUNT(*) count FROM factory_deployment_receipts").get().count, 0);
  }
});

test("7. missing terminal success is rejected", async () => {
  const { db, adapter } = receiptDb();
  await rejectsCode(finalizeOwnerDeploymentReceipt(adapter, command(), "owner@example.test", evidence({ deployment_terminal_status: "BUILDING" }), runtime()), "DEPLOYMENT_TERMINAL_SUCCESS_REQUIRED");
  assert.equal(db.prepare("SELECT COUNT(*) count FROM factory_deployment_receipts").get().count, 0);
});

test("8. owner same-origin exact command creates one immutable receipt", async () => {
  const request = new Request("https://factory.example/api/factory/deployment-evidence/finalize", { method: "POST", headers: { origin: "https://factory.example", "sec-fetch-site": "same-origin" }, body: "{}" });
  assert.doesNotThrow(() => assertOwnerSameOrigin(request));
  const { db, adapter } = receiptDb();
  const result = await finalizeOwnerDeploymentReceipt(adapter, command(), "owner@example.test", evidence(), runtime());
  assert.equal(result.replay_state, "CREATED");
  assert.match(result.receipt.receipt_id, /^deployment-receipt-[0-9a-f]{32}$/);
  assert.match(result.receipt.receipt_hash, /^[0-9a-f]{64}$/);
  assert.equal(db.prepare("SELECT COUNT(*) count FROM factory_deployment_receipts").get().count, 1);
  assert.throws(() => db.prepare("UPDATE factory_deployment_receipt_owner_commands SET result='IDEMPOTENT_REPLAY'").run(), /IMMUTABLE/);
});

test("9. exact replay returns the same receipt id and hash", async () => {
  const { db, adapter } = receiptDb();
  const rt = runtime();
  const first = await finalizeOwnerDeploymentReceipt(adapter, command(), "owner@example.test", evidence(), rt);
  const replay = await finalizeOwnerDeploymentReceipt(adapter, command(), "owner@example.test", evidence(), rt);
  assert.equal(replay.replay_state, "IDEMPOTENT_REPLAY");
  assert.equal(replay.receipt.receipt_id, first.receipt.receipt_id);
  assert.equal(replay.receipt.receipt_hash, first.receipt.receipt_hash);
  assert.equal(db.prepare("SELECT COUNT(*) count FROM factory_deployment_receipt_owner_audit_events").get().count, 2);
});

test("10. mutated replay is rejected without another receipt", async () => {
  const { db, adapter } = receiptDb();
  const rt = runtime();
  await finalizeOwnerDeploymentReceipt(adapter, command(), "owner@example.test", evidence(), rt);
  await rejectsCode(finalizeOwnerDeploymentReceipt(adapter, command(undefined, { extra: "mutation" }), "owner@example.test", evidence(), rt), "DEPLOYMENT_RECEIPT_COMMAND_FIELD_FORBIDDEN");
  assert.equal(db.prepare("SELECT COUNT(*) count FROM factory_deployment_receipts").get().count, 1);
});

test("11. secrets and server evidence stay out of the client and result", async () => {
  const secret = "server-only-secret-value-that-must-never-appear";
  const client = readFileSync(new URL("../app/qa-cockpit/deployment-receipt-control.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(client, /FACTORY_DEPLOYMENT_RECEIPT_(?:AUTOMATION_SECRET|EVIDENCE)/);
  const { adapter } = receiptDb();
  const result = await finalizeOwnerDeploymentReceipt(adapter, command(), "owner@example.test", evidence(), runtime());
  assert.doesNotMatch(JSON.stringify(result), new RegExp(secret));
});

test("12. M0-04A append scope is unchanged and separate from owner/read routes", () => {
  const auth = readFileSync(new URL("../lib/deployment-receipt-auth.ts", import.meta.url), "utf8");
  const route = readFileSync(new URL("../app/api/factory/deployment-evidence/route.ts", import.meta.url), "utf8");
  assert.match(auth, /DEPLOYMENT_RECEIPT_AUTOMATION_SCOPE = "deployment_receipt:append"/);
  assert.match(auth, /DEPLOYMENT_RECEIPT_AUTOMATION_ROUTE = "\/api\/factory\/deployment-evidence"/);
  assert.match(route, /verifyDeploymentReceiptAutomationAuth/);
  assert.doesNotMatch(route, /FINALIZE_DEPLOYMENT_RECEIPT/);
});
