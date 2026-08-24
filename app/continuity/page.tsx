"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Check = { id: string; status: string; evidence: string };
type Snapshot = {
  state: { checkpointStatus: string; stage09Status: string; champion: string | null; championScore: number; scaleGovernor: string; nextAction: string; doNotRun: string[] };
  ledger: { materialRequests: number; openAiRequests: number; aiUsageEvents: number; activeRequests: number; materialCostUsd: number; aiUsageProjectionUsd: number; matchedCostDeltaUsd: number; note: string };
  evidence: { candidateHashes: Array<{ candidate: string; complete: boolean; states: Array<{ state: string; sha256: string | null; status: string }> }>; historicalLimitation: string };
  versionLineage: Array<{ version: number; commit: string; archiveSha256: string; purpose: string }>;
  checks: Check[];
  blockers: Check[];
  storedSnapshots: Array<{ id: string; checkpoint_code: string; lifecycle_state: string; content_hash: string; blocker_count: number; created_at: string }>;
  error?: string;
};

function tone(status: string) { return status === "PASS" || status === "FROZEN" || status === "READY_TO_CAPTURE" ? "pass" : "blocked"; }
function money(value: number) { return value.toFixed(4); }

export default function ContinuityPage() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { const response = await fetch("/api/factory/continuity", { cache: "no-store" }); const payload = await response.json() as Snapshot; if (!response.ok) throw new Error(payload.error || "Continuity control could not load"); setData(payload); setError(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Continuity control could not load"); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function capture() {
    setWorking(true); setError(null);
    try { const response = await fetch("/api/factory/continuity", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "CAPTURE_CHECKPOINT" }) }); const payload = await response.json() as Snapshot; if (!response.ok) throw new Error(payload.error || "Checkpoint capture failed"); setData(payload); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Checkpoint capture failed"); }
    finally { setWorking(false); }
  }

  if (!data) return <main className="continuityLoading"><span>V7 · CONTINUITY</span><h1>Recovering authoritative state…</h1>{error && <><p>{error}</p><button onClick={() => void load()}>Try again</button></>}</main>;
  return <main className="continuityShell">
    <header className="continuityTop">
      <div><Link href="/video-engine">← Canonical Video Engine</Link><p>AI FACTORY CONTINUITY SYSTEM</p><h1>One checkpoint. No hidden reruns.</h1><span>State, evidence, cost, lineage and immutable handoff are reconciled before Stage 09 can continue.</span></div>
      <div><b className={tone(data.state.checkpointStatus)}>{data.state.checkpointStatus.replaceAll("_", " ")}</b><a href="/api/factory/continuity?format=md">Download continuation pack</a></div>
    </header>
    {error && <div className="continuityError"><strong>Action stopped</strong><span>{error}</span></div>}
    <section className="continuityState">
      <article><small>STAGE 09</small><strong>{data.state.stage09Status.replaceAll("_", " ")}</strong><span>Stage remains unfrozen</span></article>
      <article><small>CHAMPION</small><strong>{data.state.champion || "—"} <i>{data.state.championScore}/100</i></strong><span>Composite evidence only</span></article>
      <article><small>ACTIVE REQUESTS</small><strong>{data.ledger.activeRequests}</strong><span>No dispatch from this page</span></article>
      <article><small>SCALE</small><strong>{data.state.scaleGovernor}</strong><span>Stage 10–16 blocked upstream</span></article>
    </section>
    <section className="continuityHero">
      <div><p>NEXT AUTHORIZED ACTION</p><h2>{data.state.nextAction.replaceAll("_", " ")}</h2><span>The composite tournament, source discovery and candidate generation are outside the permitted resume scope.</span></div>
      <button onClick={() => void capture()} disabled={working || data.ledger.activeRequests > 0}>{working ? "Capturing immutable evidence…" : "Capture verified checkpoint"}</button>
    </section>
    <section className="continuityPanel">
      <header><div><p>CONTINUITY HARDENING GATE</p><h2>{data.checks.filter((check) => check.status === "PASS").length}/{data.checks.length} controls pass</h2></div><span>{data.blockers.length} blocker(s)</span></header>
      <div className="continuityChecks">{data.checks.map((check) => <article key={check.id}><b className={tone(check.status)}>{check.status === "PASS" ? "✓" : "!"}</b><div><strong>{check.id.replaceAll("_", " ")}</strong><p>{check.evidence}</p></div><span>{check.status}</span></article>)}</div>
    </section>
    <section className="continuityColumns">
      <div className="continuityPanel ledger">
        <header><div><p>CANONICAL STAGE 09 LEDGER</p><h2>Join before compare</h2></div></header>
        <div className="continuityMetrics"><article><small>MATERIAL REQUESTS</small><strong>{data.ledger.materialRequests}</strong></article><article><small>OPENAI REQUESTS</small><strong>{data.ledger.openAiRequests}</strong></article><article><small>USAGE EVENTS</small><strong>{data.ledger.aiUsageEvents}</strong></article><article><small>MATCHED DELTA</small><strong>${money(data.ledger.matchedCostDeltaUsd)}</strong></article></div>
        <p>{data.ledger.note}</p><div className="continuityCost"><span>Dispatch ledger <b>${money(data.ledger.materialCostUsd)}</b></span><span>Usage projection <b>${money(data.ledger.aiUsageProjectionUsd)}</b></span></div>
      </div>
      <div className="continuityPanel">
        <header><div><p>FORWARD HASH BASELINE</p><h2>A/B/C · entry/mid/exit</h2></div></header>
        <div className="continuityHashes">{data.evidence.candidateHashes.map((candidate) => <article key={candidate.candidate}><strong>{candidate.candidate}</strong><div>{candidate.states.map((state) => <span key={state.state}><small>{state.state}</small><code>{state.sha256?.slice(0, 16) || "MISSING"}</code></span>)}</div></article>)}</div>
        <p className="continuityLimitation">{data.evidence.historicalLimitation}</p>
      </div>
    </section>
    <section className="continuityPanel">
      <header><div><p>VERSION PROVENANCE</p><h2>Why version 136 exists</h2></div><span>No production request</span></header>
      <div className="continuityVersions">{data.versionLineage.map((item) => <article key={item.version}><b>v{item.version}</b><div><strong>{item.purpose}</strong><code>{item.commit.slice(0, 12)} · {item.archiveSha256.slice(0, 16)}</code></div></article>)}</div>
    </section>
    <section className="continuityColumns">
      <div className="continuityPanel"><header><div><p>DO NOT RUN</p><h2>Protected scope</h2></div></header><ul>{data.state.doNotRun.map((item) => <li key={item}>{item}</li>)}</ul></div>
      <div className="continuityPanel"><header><div><p>IMMUTABLE CHECKPOINTS</p><h2>{data.storedSnapshots.length} stored</h2></div></header>{data.storedSnapshots.length ? <div className="continuitySnapshots">{data.storedSnapshots.map((item) => <article key={item.id}><span><b>{item.checkpoint_code}</b><small>{new Date(item.created_at).toLocaleString()}</small></span><code>{item.content_hash.slice(0, 18)}</code><em className={tone(item.lifecycle_state)}>{item.lifecycle_state.replaceAll("_", " ")}</em></article>)}</div> : <p>No immutable continuity snapshot has been captured yet.</p>}</div>
    </section>
  </main>;
}
