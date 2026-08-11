"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Batch = { status: string; completed: number; total: number; auditStatus: string; auditScore: number; activatedAt?: string };
type OperatorState = {
  controlPlane: { version: string; mode: string; mediaPolicy: string; generatedAt: string };
  checkpoint: { deployment: string; sourceCheckpoint: string; status: string };
  stage: { status: string; blocker: string | null; evidence: string; updatedAt: string | null };
  portfolio: { complete: number; total: number; baseline: number };
  batches: { batch1: Batch | null; batch2: Batch | null };
  activation: { batch2Records: number; idempotencyKey: string; canStart: boolean };
  requests: { total: number; active: number; complete: number; actualCostUsd: number };
  safeguards: Record<string, boolean>;
};

const labels: Record<string, string> = {
  batch1Seal: "Batch 1 sealed",
  portfolioBaseline: "Portfolio 36/166",
  noBatch2Activation: "No Batch 2 activation",
  activeRequestsZero: "No active requests",
  noOutputRepair: "Output repair disabled",
  rootCauseOnly: "Root-cause routing",
};

function human(value: string) { return value.replaceAll("_", " "); }

export default function MaterialProductionOperator() {
  const [data, setData] = useState<OperatorState | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("Reading canonical production state…");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/factory/material-production?view=operator", { cache: "no-store" });
      const payload = await response.json() as OperatorState & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Canonical state could not be read");
      setData(payload); setError(""); setNotice("Canonical state read successfully");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Canonical state could not be read");
    }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void refresh(), 0); return () => window.clearTimeout(timer); }, [refresh]);

  const safeguardsPass = useMemo(() => data ? Object.values(data.safeguards).every(Boolean) : false, [data]);

  async function startBatch2() {
    if (!data?.activation.canStart || !safeguardsPass || working) return;
    setWorking(true); setNotice("Running bounded preflight…");
    try {
      const response = await fetch("/api/factory/material-production", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": data.activation.idempotencyKey },
        body: JSON.stringify({ action: "START_WAVE_BATCH_2", idempotencyKey: data.activation.idempotencyKey }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Batch 2 activation failed closed");
      setNotice("Activation accepted once · reading back canonical state…");
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Batch 2 activation failed closed");
    } finally { setWorking(false); }
  }

  if (!data) return <main className="operatorShell"><section className="operatorLoading"><span className="operatorPulse"/><h1>Production Operator</h1><p>{error || notice}</p><button onClick={() => void refresh()}>Retry canonical read</button></section></main>;

  const batch2 = data.batches.batch2;
  return <main className="operatorShell">
    <header className="operatorTopbar">
      <Link href="/" className="operatorBrand"><span>F</span><div><strong>Frameflow</strong><small>Production Operator</small></div></Link>
      <div className="operatorLive"><i/> {data.controlPlane.version} · {data.checkpoint.status}</div>
    </header>

    <section className="operatorHero">
      <div><p>STAGE 09 · CONTROL PLANE LITE</p><h1>Run production without loading the gallery.</h1><span>Canonical state, activation control, request exposure and QA status only. Media stays on demand.</span></div>
      <button className="operatorRefresh" onClick={() => void refresh()} disabled={working}>↻ Refresh state</button>
    </section>

    <div className={error ? "operatorNotice error" : "operatorNotice"}><span>{error ? "!" : "✓"}</span>{error || notice}<time>{new Date(data.controlPlane.generatedAt).toLocaleString()}</time></div>

    <section className="operatorMetrics">
      <article><small>CHECKPOINT</small><strong>{data.checkpoint.deployment}</strong><span>from {data.checkpoint.sourceCheckpoint}</span></article>
      <article><small>PORTFOLIO</small><strong>{data.portfolio.complete}<em>/{data.portfolio.total}</em></strong><span>canonical products</span></article>
      <article><small>ACTIVE REQUESTS</small><strong className={data.requests.active ? "danger" : "good"}>{data.requests.active}</strong><span>{data.requests.total} ledger records</span></article>
      <article><small>ACTIVATION RECORDS</small><strong>{data.activation.batch2Records}</strong><span>Batch 2 · maximum one</span></article>
    </section>

    <section className="operatorGrid">
      <article className="operatorPanel batchPanel">
        <header><div><p>PRODUCTION PROGRESS</p><h2>Batch control</h2></div><b>{human(data.stage.status)}</b></header>
        <div className="batchRows">
          <div><span>01</span><div><strong>Batch 1</strong><small>{data.batches.batch1 ? `${data.batches.batch1.completed}/${data.batches.batch1.total} products · audit ${data.batches.batch1.auditScore}/100` : "No record"}</small></div><b>{data.batches.batch1 ? human(data.batches.batch1.status) : "MISSING"}</b></div>
          <div className={batch2 ? "current" : "pending"}><span>02</span><div><strong>Batch 2</strong><small>{batch2 ? `${batch2.completed}/${batch2.total} products · audit ${human(batch2.auditStatus)}` : "Approved · awaiting one activation"}</small></div><b>{batch2 ? human(batch2.status) : "NOT STARTED"}</b></div>
          <div className="locked"><span>03</span><div><strong>Batch 3</strong><small>Hard stop after 86/166</small></div><b>LOCKED</b></div>
        </div>
        <footer><span>{data.stage.evidence}</span></footer>
      </article>

      <article className="operatorPanel guardPanel">
        <header><div><p>FAIL-CLOSED PREFLIGHT</p><h2>Dispatch safeguards</h2></div><b>{safeguardsPass ? "PASS" : "BLOCKED"}</b></header>
        <div className="guardList">{Object.entries(data.safeguards).map(([key, pass]) => <div key={key}><i className={pass ? "pass" : "fail"}>{pass ? "✓" : "×"}</i><span>{labels[key] || human(key)}</span><b>{pass ? "PASS" : "FAIL"}</b></div>)}</div>
        <button className="batchStart" onClick={() => void startBatch2()} disabled={!data.activation.canStart || !safeguardsPass || working || Boolean(error)}>{working ? "Activating with idempotency control…" : batch2 ? "Batch 2 already activated" : "Preflight and start Batch 2"}</button>
        <small className="idempotency">Idempotency · {data.activation.idempotencyKey}</small>
      </article>
    </section>

    <section className="operatorPanel ledgerPanel">
      <header><div><p>REQUEST & COST LEDGER</p><h2>Current exposure</h2></div><b>${data.requests.actualCostUsd.toFixed(4)}</b></header>
      <div><span><small>TOTAL</small><strong>{data.requests.total}</strong></span><span><small>COMPLETE</small><strong>{data.requests.complete}</strong></span><span><small>ACTIVE</small><strong>{data.requests.active}</strong></span><span><small>MEDIA POLICY</small><strong>{human(data.controlPlane.mediaPolicy)}</strong></span></div>
    </section>

    <footer className="operatorFooter"><span>Historical evidence and production assets are preserved. Legacy controls are removed from the active operating path.</span><Link href="/control-plane">Architecture & governance →</Link></footer>
  </main>;
}
