"use client";

import { useEffect, useState } from "react";

type Receipt = {
  receipt_id: string;
  receipt_hash: string;
  github_commit_sha: string;
  git_tree_sha: string;
  sites_version: number;
  sites_source_commit: string;
  sites_source_tree_sha: string;
  schema_version: string;
  environment_revision: number;
  deployment_terminal_status: "SUCCEEDED";
};

type DeploymentReceiptState = {
  submission_state: "SUBMITTED" | "NOT_SUBMITTED";
  receipt: Receipt | null;
  actions: {
    finalize_available: boolean;
    replay_available: boolean;
  };
  creation_blocker: null | {
    code: string;
    message: string;
  };
};

type FinalizationResult = {
  receipt?: Receipt;
  replay_state?: "CREATED" | "IDEMPOTENT_REPLAY";
  error?: { message?: string };
};

export function DeploymentReceiptControl() {
  const [running, setRunning] = useState(false);
  const [state, setState] = useState<DeploymentReceiptState | null>(null);

  async function hydrate(expected?: Receipt) {
    const response = await fetch("/api/factory/deployment-evidence", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) return null;
    const result = await response.json() as DeploymentReceiptState;
    if (expected && (!result.receipt
      || result.receipt.receipt_id !== expected.receipt_id
      || result.receipt.receipt_hash !== expected.receipt_hash)) {
      return null;
    }
    setState(result);
    return result;
  }

  useEffect(() => {
    void hydrate();
  }, []);

  async function submit(replay: boolean) {
    const receipt = state?.receipt;
    if (replay && !receipt) return;
    setRunning(true);
    try {
      const body = {
        command: "FINALIZE_DEPLOYMENT_RECEIPT",
        idempotency_key: `deployment-receipt-owner-${crypto.randomUUID()}`,
        ...(replay ? { receipt_id: receipt!.receipt_id, receipt_hash: receipt!.receipt_hash } : {}),
      };
      const response = await fetch("/api/factory/deployment-evidence/finalize", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json() as FinalizationResult;
      if (!response.ok || !result.receipt || !result.replay_state) {
        return;
      }
      await hydrate(result.receipt);
    } catch {
      // The next hydration remains fail-closed; server errors expose no secret material.
    } finally {
      setRunning(false);
    }
  }

  const receipt = state?.receipt;
  const submitted = state?.submission_state === "SUBMITTED";

  return <section className="qaPanel">
    <header><div><small>Deployment evidence</small><h2>Immutable deployment receipt</h2></div><span>{!state ? "LOADING" : submitted ? "SUBMITTED" : "NOT SUBMITTED"}</span></header>
    {receipt && <div className="qaCorpus qaReceiptGrid">{[
      ["Receipt ID", receipt.receipt_id], ["Receipt hash", receipt.receipt_hash],
      ["GitHub commit", receipt.github_commit_sha], ["Git tree", receipt.git_tree_sha],
      ["Sites version", receipt.sites_version], ["Sites source commit", receipt.sites_source_commit],
      ["Sites source tree", receipt.sites_source_tree_sha], ["Schema version", receipt.schema_version],
      ["Environment revision", receipt.environment_revision], ["Terminal status", receipt.deployment_terminal_status],
    ].map(([label, value]) => <article key={label}><small>{label}</small><code>{value}</code></article>)}</div>}
    <div className="qaAction">
      {state?.actions.finalize_available && <button type="button" onClick={() => void submit(false)} disabled={running}>
        {running ? "Finalizing immutable receipt…" : "Finalize deployment receipt"}
      </button>}
      {state?.actions.replay_available && <button type="button" onClick={() => void submit(true)} disabled={running}>
        {running ? "Replaying exact finalization…" : "Replay exact finalization"}
      </button>}
      {state?.creation_blocker && !submitted && <code>{state.creation_blocker.code}</code>}
    </div>
  </section>;
}
