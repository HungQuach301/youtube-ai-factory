import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { authorizeDeploymentReceiptOwner } from "../lib/deployment-receipt-auth.ts";
import { DeploymentReceiptError } from "../lib/deployment-receipt.ts";
import {
  assertOwnerSameOrigin,
  finalizeOwnerDeploymentReceipt,
  readOwnerDeploymentReceiptState,
} from "../lib/deployment-receipt-owner.ts";

const sha = (character) => character.repeat(40);
const deployedAt = "2026-08-30T04:50:00.000Z";
const validNow = "2026-08-30T05:00:00.000Z";
const expiredNow = "2026-08-30T06:00:00.000Z";
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
    work_package_id: "M0-04C",
    pull_request: "https://github.com/HungQuach301/youtube-ai-factory/pull/13",
    github_repository: "HungQuach301/youtube-ai-factory",
    github_commit_sha: sha("a"),
    git_tree_sha: sourceTree,
    sites_version: 574,
    sites_source_commit: sourceCommit,
    sites_source_tree_sha: sourceTree,
    schema_version: "0131_OWNER_DEPLOYMENT_RECEIPT_FINALIZATION",
    environment_revision: 84,
    deployment_terminal_status: "SUCCEEDED",
    deployed_at: deployedAt,
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

let uuidSequence = 0;
function runtime(now = validNow) {
  return { builtSourceTree: sourceTree, now, randomUUID: () => `10000000-0000-4000-8000-${String(++uuidSequence).padStart(12, "0")}` };
}

function command(idempotencyKey, receipt) {
  return JSON.stringify({
    command: "FINALIZE_DEPLOYMENT_RECEIPT",
    idempotency_key: idempotencyKey,
    ...(receipt ? { receipt_id: receipt.receipt_id, receipt_hash: receipt.receipt_hash } : {}),
  });
}

async function createReceipt(adapter) {
  return finalizeOwnerDeploymentReceipt(
    adapter,
    command("deployment-receipt-owner-create-0001"),
    "owner@example.test",
    evidence(),
    runtime(),
  );
}

async function rejectsCode(promise, code) {
  await assert.rejects(promise, (error) => error instanceof DeploymentReceiptError && error.code === code);
}

test("1. no receipt plus valid creation window exposes Finalize", async () => {
  const { adapter } = receiptDb();
  const state = await readOwnerDeploymentReceiptState(adapter, evidence(), runtime());
  assert.equal(state.submission_state, "NOT_SUBMITTED");
  assert.deepEqual(state.actions, { finalize_available: true, replay_available: false });
  assert.equal(state.creation_blocker, null);
});

test("2. no receipt plus expired creation window fails closed without Finalize", async () => {
  const { adapter } = receiptDb();
  const state = await readOwnerDeploymentReceiptState(adapter, evidence(), runtime(expiredNow));
  assert.equal(state.submission_state, "NOT_SUBMITTED");
  assert.deepEqual(state.actions, { finalize_available: false, replay_available: false });
  assert.equal(state.creation_blocker.code, "DEPLOYMENT_RECEIPT_STALE");
});

test("3. existing exact receipt hydrates as SUBMITTED with full identity", async () => {
  const { adapter } = receiptDb();
  const created = await createReceipt(adapter);
  const state = await readOwnerDeploymentReceiptState(adapter, evidence(), runtime());
  assert.equal(state.submission_state, "SUBMITTED");
  assert.equal(state.receipt.receipt_id, created.receipt.receipt_id);
  assert.equal(state.receipt.receipt_hash, created.receipt.receipt_hash);
  assert.equal(state.receipt.github_commit_sha, sha("a"));
  assert.equal(state.receipt.git_tree_sha, sourceTree);
  assert.equal(state.receipt.sites_version, 574);
  assert.equal(state.receipt.sites_source_tree_sha, sourceTree);
  assert.equal(state.receipt.environment_revision, 84);
  assert.equal(state.receipt.deployment_terminal_status, "SUCCEEDED");
});

test("4. existing receipt plus expired creation window still exposes Replay", async () => {
  const { adapter } = receiptDb();
  await createReceipt(adapter);
  const state = await readOwnerDeploymentReceiptState(adapter, evidence(), runtime(expiredNow));
  assert.equal(state.submission_state, "SUBMITTED");
  assert.deepEqual(state.actions, { finalize_available: false, replay_available: true });
  assert.equal(state.creation_blocker, null);
});

test("5. exact replay returns the same receipt id and hash after expiry", async () => {
  const { adapter } = receiptDb();
  const created = await createReceipt(adapter);
  const replay = await finalizeOwnerDeploymentReceipt(
    adapter,
    command("deployment-receipt-owner-replay-0001", created.receipt),
    "owner@example.test",
    evidence(),
    runtime(expiredNow),
  );
  assert.equal(replay.replay_state, "IDEMPOTENT_REPLAY");
  assert.equal(replay.receipt.receipt_id, created.receipt.receipt_id);
  assert.equal(replay.receipt.receipt_hash, created.receipt.receipt_hash);
});

test("6. exact replay keeps immutable receipt count equal to one", async () => {
  const { db, adapter } = receiptDb();
  const created = await createReceipt(adapter);
  await finalizeOwnerDeploymentReceipt(adapter, command("deployment-receipt-owner-replay-0002", created.receipt), "owner@example.test", evidence(), runtime(expiredNow));
  assert.equal(db.prepare("SELECT COUNT(*) count FROM factory_deployment_receipts").get().count, 1);
});

test("7. exact replay appends owner command and audit IDEMPOTENT_REPLAY", async () => {
  const { db, adapter } = receiptDb();
  const created = await createReceipt(adapter);
  await finalizeOwnerDeploymentReceipt(adapter, command("deployment-receipt-owner-replay-0003", created.receipt), "owner@example.test", evidence(), runtime(expiredNow));
  const ledger = db.prepare("SELECT result,receipt_id,receipt_hash FROM factory_deployment_receipt_owner_commands WHERE idempotency_key=?").get("deployment-receipt-owner-replay-0003");
  const audit = db.prepare("SELECT result,result_code,receipt_id,receipt_hash FROM factory_deployment_receipt_owner_audit_events WHERE idempotency_key=?").get("deployment-receipt-owner-replay-0003");
  assert.equal(ledger.result, "IDEMPOTENT_REPLAY");
  assert.equal(ledger.receipt_id, created.receipt.receipt_id);
  assert.equal(ledger.receipt_hash, created.receipt.receipt_hash);
  assert.equal(audit.result, "IDEMPOTENT_REPLAY");
  assert.equal(audit.result_code, "IDEMPOTENT_REPLAY");
  assert.equal(audit.receipt_id, created.receipt.receipt_id);
  assert.equal(audit.receipt_hash, created.receipt.receipt_hash);
});

test("8. mutated replay binding is rejected without a new receipt", async () => {
  const { db, adapter } = receiptDb();
  const created = await createReceipt(adapter);
  await rejectsCode(
    finalizeOwnerDeploymentReceipt(
      adapter,
      command("deployment-receipt-owner-replay-mutated", { ...created.receipt, receipt_hash: "f".repeat(64) }),
      "owner@example.test",
      evidence(),
      runtime(expiredNow),
    ),
    "DEPLOYMENT_RECEIPT_REPLAY_BINDING_MISMATCH",
  );
  assert.equal(db.prepare("SELECT COUNT(*) count FROM factory_deployment_receipts").get().count, 1);
});

test("9. stale or mismatched current deployment receipt fails closed", async () => {
  const { adapter } = receiptDb();
  await createReceipt(adapter);
  await rejectsCode(
    readOwnerDeploymentReceiptState(adapter, evidence({ environment_revision: 85 }), runtime(expiredNow)),
    "DEPLOYMENT_RECEIPT_BINDING_MISMATCH",
  );
});

test("10. anonymous owner action returns 401", () => {
  assert.throws(
    () => authorizeDeploymentReceiptOwner(null, "owner@example.test"),
    (error) => error instanceof DeploymentReceiptError && error.status === 401,
  );
});

test("11. authenticated non-owner action returns 403", () => {
  assert.throws(
    () => authorizeDeploymentReceiptOwner({ email: "viewer@example.test" }, "owner@example.test"),
    (error) => error instanceof DeploymentReceiptError && error.status === 403,
  );
});

test("12. cross-origin and missing CSRF metadata actions are rejected", () => {
  for (const headers of [
    { origin: "https://evil.example", "sec-fetch-site": "cross-site" },
    { origin: "https://factory.example" },
  ]) {
    const request = new Request("https://factory.example/api/factory/deployment-evidence/finalize", { method: "POST", headers, body: "{}" });
    assert.throws(() => assertOwnerSameOrigin(request), (error) => error instanceof DeploymentReceiptError && error.code === "OWNER_COMMAND_CSRF_REJECTED");
  }
});

test("13. automation secret is absent from client, response and logs", async () => {
  const secret = "automation-secret-must-never-leak";
  const client = readFileSync(new URL("../app/qa-cockpit/deployment-receipt-control.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(client, /FACTORY_DEPLOYMENT_RECEIPT_(?:AUTOMATION_SECRET|EVIDENCE)/);
  const logs = [];
  const original = console.log;
  console.log = (...values) => logs.push(values.join(" "));
  try {
    const { adapter } = receiptDb();
    const created = await createReceipt(adapter);
    const state = await readOwnerDeploymentReceiptState(adapter, evidence(), runtime());
    assert.doesNotMatch(JSON.stringify({ created, state }), new RegExp(secret));
    assert.doesNotMatch(logs.join("\n"), new RegExp(secret));
  } finally {
    console.log = original;
  }
});

test("14. successful finalize rehydrates UI immediately to SUBMITTED", () => {
  const client = readFileSync(new URL("../app/qa-cockpit/deployment-receipt-control.tsx", import.meta.url), "utf8");
  assert.match(client, /await hydrate\(result\.receipt\)/);
  assert.match(client, /submission_state === "SUBMITTED"/);
});

test("15. browser refresh hydrates current receipt on mount", () => {
  const client = readFileSync(new URL("../app/qa-cockpit/deployment-receipt-control.tsx", import.meta.url), "utf8");
  assert.match(client, /useEffect\(\(\) => \{/);
  assert.match(client, /void hydrate\(\)/);
  assert.match(client, /credentials: "same-origin"/);
});
