"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

type Gate = { id: string; status: string; evidence: string };
type Brief = { briefId: string; shotId: string; startSeconds: number; endSeconds: number; viewerMustUnderstand: string; route: string; primaryFamily: string; renderPolicy: string; modelContract: { lane: string; expectedOutputTokens: number; safetyCeilingTokens: number; retryLimit: number }; pilot?: boolean };
type Snapshot = {
  stage: { status: string; threshold: number; blocker?: string; evidence: string };
  upstream: { frozen: boolean; shotCount: number };
  providerReadiness: Record<string, boolean>;
  policy: Record<string, string | number>;
  run: null | { status: string; score: number; briefCount: number; pilotCount: number; remoteRequests: number; actualCostUsd: number; gates: Gate[] };
  artifact: null | { contentHash: string; routeMix: Record<string, number>; modelMix: Record<string, number>; sampleBriefs: Brief[]; pilotIds: string[] };
  authorization: null | { id: string; status: string; shotCount: number; maxRemoteRequests: number; maxActualSpendUsd: number; authorizedAt: string; revokedAt?: string; modelPolicy: Record<string, unknown> };
  provider: { model: string; reasoningEffort: string; modelOptions: Array<{ id: string; label: string; description: string }>; reasoningOptions: string[] };
  pilot: { materialized: number; audited: number; total: number; percent: number; items: Array<{ id: string; briefId: string; route: string; family: string; meaning: string; status: string; file: null | { id: string; provider: string; mimeType: string; bytes: number; hash: string; previewUrl: string }; overlay: null | { id: string; previewUrl: string }; tournament: null | { status: string; score: number; candidateCount: number; providerCoverage: number; championId?: string }; audit: null | { status: string; score: number; findings: string[] } }> };
  requestLedger: { total: number; planned: number; active: number; complete: number; incomplete: number; actualCostUsd: number; recent: Array<{ id: string; briefId: string; phase: string; provider: string; modelId: string; status: string; inputTokens: number; outputTokens: number; reasoningTokens: number; actualCostUsd: number; error?: string; createdAt: string }> };
};

export default function MaterialProductionPage() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modelId, setModelId] = useState("gpt-5.6-sol");
  const [reasoningEffort, setReasoningEffort] = useState("low");
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/factory/material-production", { cache: "no-store" });
      const payload = await response.json() as Snapshot & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Stage 09 could not load");
      setData(payload); setModelId(payload.provider.model); setReasoningEffort(payload.provider.reasoningEffort); setError(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Stage 09 could not load"); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => {
    if (data?.run?.status !== "PILOT_RUNNING" || working) return;
    const timer = window.setTimeout(() => {
      setWorking("STEP_PILOT");
      void fetch("/api/factory/material-production", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "STEP_PILOT" }) })
        .then(async (response) => { const payload = await response.json() as Snapshot & { error?: string }; if (!response.ok) throw new Error(payload.error || "Pilot execution failed"); setData(payload); setError(null); })
        .catch((reason: Error) => setError(reason.message))
        .finally(() => setWorking(null));
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [data?.run?.status, data?.pilot.materialized, data?.pilot.audited, data?.requestLedger.active, working]);
  async function build() {
    setWorking("BUILD"); setError(null);
    try {
      const response = await fetch("/api/factory/material-production", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "BUILD_DRY_RUN" }) });
      const payload = await response.json() as Snapshot & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Dry run failed");
      setData(payload);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Dry run failed"); }
    finally { setWorking(null); }
  }
  async function pilotAction(action: "AUTHORIZE_PILOT" | "REVOKE_PILOT") {
    setWorking(action); setError(null);
    try {
      const response = await fetch("/api/factory/material-production", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const payload = await response.json() as Snapshot & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Pilot authorization failed");
      setData(payload);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Pilot authorization failed"); }
    finally { setWorking(null); }
  }
  async function execute(action: "START_PILOT" | "STEP_PILOT" | "STOP_PILOT" | "RESUME_PILOT", quiet = false) {
    setWorking(action); if (!quiet) setError(null);
    try {
      const response = await fetch("/api/factory/material-production", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const payload = await response.json() as Snapshot & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Pilot execution failed");
      setData(payload); setError(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Pilot execution failed"); }
    finally { setWorking(null); }
  }
  async function saveModel() {
    setWorking("SET_MODEL"); setError(null);
    try {
      const response = await fetch("/api/factory/material-production", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "SET_MODEL", modelId, reasoningEffort }) });
      const payload = await response.json() as Snapshot & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Model selection failed");
      setData(payload);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Model selection failed"); }
    finally { setWorking(null); }
  }
  if (!data) return <main className="shotShell"><p className="stateBanner">{error || "Loading Stage 09 production contract…"}</p></main>;
  const ready = ["READY", "PILOT_READY", "PILOT_AUTHORIZED", "PILOT_PAUSED", "PILOT_PASS", "REPAIR_REQUIRED"].includes(data.stage.status);
  return <main className="shotShell">
    <nav className="shotTop"><Link href="/control-plane">← V7 Control Plane</Link><span>PRODUCTION V7 · STAGE 09</span><b>{data.stage.status.replaceAll("_", " ")}</b></nav>
    <section className="shotHero">
      <div><p>FRESH MATERIAL PRODUCTION</p><h1>Prove the meaning before acquiring the pixels.</h1><span>Every frozen shot becomes a source-ready material brief. No prompt, URL or catalog result counts as footage.</span></div>
      <aside><small>DRY-RUN FLOOR</small><strong>{data.run?.score || 0}<i>/100</i></strong><span>{data.run?.gates.filter((gate) => gate.status === "PASS").length || 0}/{data.run?.gates.length || 8} gates passed</span></aside>
    </section>
    <section className="shotControl">
      <div><small>UPSTREAM</small><strong>Stage 08 frozen · {data.upstream.shotCount} shots</strong></div>
      <div><small>EXECUTION</small><strong>Zero-spend dry run</strong></div>
      <div><small>REMOTE REQUESTS</small><strong>{data.run?.remoteRequests || 0}</strong></div>
      <div><small>ACTUAL COST</small><strong>${(data.run?.actualCostUsd || 0).toFixed(2)}</strong></div>
      <button onClick={build} disabled={Boolean(working) || !ready}>{working === "BUILD" ? "Creating clean Stage 09.4 run…" : data.run?.status === "REPAIR_REQUIRED" ? "Build clean Stage 09.4 pilot" : data.run ? "Rebuild deterministic dry run" : "Build zero-spend dry run"}</button>
    </section>
    {error && <p className="stateBanner errorState">{error}</p>}
    <section className="shotDoctrine">
      <header><p>MATERIAL FUNNEL · LOCKED</p><h2>Deterministic first. Expensive intelligence last.</h2><span>Pilot production stays unauthorized until this contract passes.</span></header>
      <div className="shotMetrics">
        {[['01','Rules','Reject impossible routes and rights failures.'],['02','Retrieval','Search every healthy provider with concrete queries.'],['03','Pixel tournament','Vision compares 6–12 real candidate thumbnails.'],['04','Family render','Eight meaning-specific authored grammars replace generic templates.'],['05','Three-state QA','Entry, midpoint, exit and 360p evidence are inspected.'],['06','Store','Bytes, checksum, provenance and rights become evidence.']].map(([n,t,d])=><article key={n}><small>{n}</small><h3>{t}</h3><p>{d}</p></article>)}
      </div>
    </section>
    <section className="shotProgress">
      <header><div><p>DRY-RUN AUDIT</p><h2>{data.run ? `${data.run.status.replaceAll("_", " ")} · ${data.run.briefCount} briefs` : "Awaiting compilation"}</h2></div><strong>{data.run?.pilotCount || 0} pilot shots</strong></header>
      <div className="shotGates">{(data.run?.gates || []).map((gate)=><article key={gate.id} className={gate.status === "PASS" ? "pass" : "fail"}><b>{gate.status === "PASS" ? "✓" : "!"} {gate.id.replaceAll("_", " ")}</b><span>{gate.evidence}</span></article>)}</div>
    </section>
    <section className="shotArtifact">
      <header><div><p>EXECUTION SAFETY CONTRACT</p><h2>Token and cost controls are bound per request</h2></div><span>{data.artifact ? `SHA-256 · ${data.artifact.contentHash.slice(0, 16)}…` : "Not stored yet"}</span></header>
      <div className="shotMetrics">
        <article><small>EXPECTED OUTPUT</small><h3>500–16,000</h3><p>Expected range adapts to query, vision, comparison or critical work.</p></article>
        <article><small>SAFETY ENVELOPES</small><h3>3k · 8k · 16k · 32k</h3><p>A safety ceiling is never treated as a quality target.</p></article>
        <article><small>INCOMPLETE</small><h3>Block gate</h3><p>One missing-field delta; then root-cause review, never degraded PASS.</p></article>
        <article><small>PILOT</small><h3>8–12 shots</h3><p>No full production before sequence QA passes.</p></article>
      </div>
    </section>
    {data.artifact && <section className="shotSamples">
      <header><div><p>SAMPLE MATERIAL BRIEFS</p><h2>Production routes are visible before spend</h2></div><span>SOURCE {data.artifact.routeMix.SOURCE || 0} · MAKE {data.artifact.routeMix.MAKE || 0} · HYBRID {data.artifact.routeMix.HYBRID || 0}</span></header>
      <div>{data.artifact.sampleBriefs.map((brief)=><article key={brief.briefId}><b>{brief.briefId} · {brief.route}{brief.pilot ? " · PILOT" : ""}</b><h3>{brief.primaryFamily}</h3><p>{brief.viewerMustUnderstand}</p><footer><span>{brief.startSeconds.toFixed(1)}–{brief.endSeconds.toFixed(1)}s</span><span>{brief.renderPolicy}</span><span>{brief.modelContract.lane} · expected {brief.modelContract.expectedOutputTokens.toLocaleString()} / safety {brief.modelContract.safetyCeilingTokens.toLocaleString()}</span></footer></article>)}</div>
    </section>}
    <section className="shotProgress">
      <header><div><p>PILOT EXECUTION AUTHORIZATION</p><h2>{data.authorization?.status === "AUTHORIZED" ? "Authorized · dispatch not started" : "Awaiting explicit authorization"}</h2></div><strong>$0 authorization cost</strong></header>
      <div className="shotMetrics">
        <article><small>SCOPE</small><h3>{data.authorization?.shotCount || data.run?.pilotCount || 0} shots</h3><p>Only selected pilot briefs may enter the next wave.</p></article>
        <article><small>REQUEST CIRCUIT</small><h3>{data.authorization?.maxRemoteRequests || 80}</h3><p>Hard stop on new remote dispatch, not a quality target.</p></article>
        <article><small>RUNAWAY CIRCUIT</small><h3>${(data.authorization?.maxActualSpendUsd || 50).toFixed(2)}</h3><p>Emergency ceiling for this pilot; actual spend remains fully measured.</p></article>
        <article><small>REQUEST LEDGER</small><h3>{data.requestLedger.total}</h3><p>{data.requestLedger.active} active · {data.requestLedger.complete} complete · ${data.requestLedger.actualCostUsd.toFixed(2)}</p></article>
      </div>
      <div className="shotGates">
        <article className={data.run?.status === "PILOT_READY" || data.authorization?.status === "AUTHORIZED" ? "pass" : "fail"}><b>{data.run?.status === "PILOT_READY" || data.authorization?.status === "AUTHORIZED" ? "✓ Pilot contract ready" : "○ Pilot blocked"}</b><span>Authorization binds scope, model policy, request circuit and revocation before dispatch.</span></article>
        <article className={data.authorization?.status === "AUTHORIZED" ? "pass" : "fail"}><b>{data.authorization?.status === "AUTHORIZED" ? "✓ Pilot authorized" : "○ No remote dispatch authorized"}</b><span>Creating or revoking this record does not call OpenAI or any media provider.</span></article>
      </div>
      {data.authorization?.status === "AUTHORIZED"
        ? <button onClick={() => void pilotAction("REVOKE_PILOT")} disabled={Boolean(working)}>{working === "REVOKE_PILOT" ? "Revoking…" : "Revoke pilot authorization"}</button>
        : <button onClick={() => void pilotAction("AUTHORIZE_PILOT")} disabled={Boolean(working) || data.run?.status !== "PILOT_READY"}>{working === "AUTHORIZE_PILOT" ? "Authorizing pilot…" : "Authorize 10-shot pilot · $0 now"}</button>}
    </section>
    {data.authorization && <section className="shotProgress">
      <header><div><p>STAGE 09.4 · MATERIAL QUALITY REBUILD</p><h2>Candidate-pixel champions, family renderers and three-state evidence</h2></div><strong>{data.pilot.percent}%</strong></header>
      <i><span style={{ width: `${data.pilot.percent}%` }} /></i>
      <div>
        <span><b>01</b>{data.pilot.materialized}/{data.pilot.total} materialized</span>
        <span><b>02</b>{data.pilot.audited}/{data.pilot.total} pixel audited</span>
        <span><b>03</b>{data.requestLedger.active} remote active</span>
        <span><b>04</b>${data.requestLedger.actualCostUsd.toFixed(4)} measured</span>
      </div>
      <div className="materialModelControl">
        <label>Vision model<select value={modelId} onChange={(event) => setModelId(event.target.value)} disabled={Boolean(working) || data.requestLedger.active > 0}>{data.provider.modelOptions.map((option) => <option key={option.id} value={option.id}>{option.label} · {option.description}</option>)}</select></label>
        <label>Reasoning<select value={reasoningEffort} onChange={(event) => setReasoningEffort(event.target.value)} disabled={Boolean(working) || data.requestLedger.active > 0}>{data.provider.reasoningOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
        <button onClick={() => void saveModel()} disabled={Boolean(working) || data.requestLedger.active > 0}>Save model for next request</button>
      </div>
      {data.run?.status === "PILOT_AUTHORIZED" && <button onClick={() => void execute("START_PILOT")} disabled={Boolean(working)}>Start authorized 10-shot pilot</button>}
      {data.run?.status === "PILOT_RUNNING" && <button onClick={() => void execute("STOP_PILOT")} disabled={working === "STOP_PILOT"}>{working === "STOP_PILOT" ? "Confirming provider stop…" : "Emergency stop · preserve completed materials"}</button>}
      {data.run?.status === "PILOT_PAUSED" && <button onClick={() => void execute("RESUME_PILOT")} disabled={Boolean(working)}>Resume from stored evidence</button>}
      {data.run?.status === "REPAIR_REQUIRED" && <button onClick={() => void execute("RESUME_PILOT")} disabled={Boolean(working)}>Resume bounded repair from stored evidence</button>}
      {data.run?.status === "PILOT_PASS" && <p className="stateBanner">Pilot PASS. Full 166-shot production remains locked pending review.</p>}
      {data.run?.status === "REPAIR_REQUIRED" && <p className="stateBanner errorState">Pilot repair required. No full-scale dispatch is authorized.</p>}
    </section>}
    {data.pilot.items.length > 0 && <section className="materialPilotGrid">
      {data.pilot.items.map((item) => <article key={item.id}>
        <header><b>{item.briefId} · {item.route}</b><span>{item.status.replaceAll("_", " ")}</span></header>
        <h3>{item.family}</h3><p>{item.meaning}</p>
        {item.file && (item.file.mimeType.startsWith("video/") ? <video controls preload="metadata" src={item.file.previewUrl} /> : <Image unoptimized width={1920} height={1080} src={item.file.previewUrl} alt={`${item.briefId} material preview`} />)}
        {item.tournament && <small>Pixel tournament · {item.tournament.status} · {item.tournament.candidateCount} candidates / {item.tournament.providerCoverage} providers · champion {item.tournament.score}/100</small>}
        <footer><span>{item.file ? `${item.file.provider} · ${(item.file.bytes / 1_000_000).toFixed(1)} MB · ${item.file.hash}` : "Awaiting stored bytes"}</span><b>{item.audit ? `${item.audit.status} · ${item.audit.score}/100` : "Pixel QA pending"}</b></footer>
        {item.audit?.findings?.[0] && <small>{item.audit.findings[0]}</small>}
      </article>)}
    </section>}
    {data.requestLedger.recent.length > 0 && <section className="materialLedger">
      <header><div><p>REQUEST-LEVEL COST LEDGER</p><h2>Every provider call is inspectable</h2></div><strong>{data.requestLedger.total} requests</strong></header>
      <div>{data.requestLedger.recent.map((request) => <article key={request.id}><span>{request.briefId}<b>{request.phase}</b></span><span>{request.provider}<b>{request.modelId}</b></span><span>{request.status}<b>{request.inputTokens.toLocaleString()} in · {request.outputTokens.toLocaleString()} out · {request.reasoningTokens.toLocaleString()} reasoning</b></span><strong>${request.actualCostUsd.toFixed(4)}</strong>{request.error && <small>{request.error}</small>}</article>)}</div>
    </section>}
  </main>;
}
