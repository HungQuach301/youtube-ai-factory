"use client";

import { useState } from "react";

type Receipt = {
  receipt_id: string;
  receipt_hash: string;
};

type FinalizationResult = {
  receipt?: Receipt;
  replay_state?: "CREATED" | "IDEMPOTENT_REPLAY";
  error?: { message?: string };
};

export function DeploymentReceiptControl() {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [replayState, setReplayState] = useState<"NOT_SUBMITTED" | "CREATED" | "IDEMPOTENT_REPLAY">("NOT_SUBMITTED");
  const [idempotencyKey] = useState(() => `deployment-receipt-owner-${crypto.randomUUID()}`);

  async function readBack() {
    const response = await fetch("/api/factory/deployment-evidence", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) return null;
    return await response.json() as Receipt;
  }

  async function finalize() {
    setRunning(true);
    setMessage("");
    try {
      const response = await fetch("/api/factory/deployment-evidence/finalize", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ command: "FINALIZE_DEPLOYMENT_RECEIPT", idempotency_key: idempotencyKey }),
      });
      const result = await response.json() as FinalizationResult;
      if (!response.ok || !result.receipt || !result.replay_state) throw new Error(result.error?.message || "Deployment receipt finalization failed");
      const readBackReceipt = await readBack();
      if (!readBackReceipt || readBackReceipt.receipt_id !== result.receipt.receipt_id || readBackReceipt.receipt_hash !== result.receipt.receipt_hash) {
        throw new Error("Immutable receipt read-back did not match the finalization result");
      }
      setReceipt(readBackReceipt);
      setReplayState(result.replay_state);
      setRunning(false);
    } catch (error) {
      setRunning(false);
      setMessage(error instanceof Error ? error.message : "Deployment receipt finalization failed");
    }
  }

  return <section className="qaPanel">
    <header><div><small>Deployment evidence</small><h2>Immutable deployment receipt</h2><p>Owner-only same-origin finalization. The browser supplies only the typed command and idempotency key; source identity, terminal status and smoke/read-back evidence remain server-side.</p></div><span>{replayState.replaceAll("_", " ")}</span></header>
    {receipt && <div className="qaCorpus qaReceiptGrid">
      <article><small>Receipt ID</small><code>{receipt.receipt_id}</code></article>
      <article><small>Receipt hash</small><code>{receipt.receipt_hash}</code></article>
    </div>}
    <div className="qaAction">
      <button type="button" onClick={finalize} disabled={running}>
        {running ? "Finalizing immutable receipt…" : replayState === "NOT_SUBMITTED" ? "Finalize deployment receipt" : "Replay exact finalization"}
      </button>
      <span>Fail-closed on stale, non-terminal, manifest or tree mismatch. No provider request or spend.</span>
      {message && <code>{message}</code>}
    </div>
  </section>;
}
