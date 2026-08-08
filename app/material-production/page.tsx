"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Gate = { id: string; status: string; evidence: string };
type Brief = { briefId: string; shotId: string; startSeconds: number; endSeconds: number; viewerMustUnderstand: string; route: string; primaryFamily: string; renderPolicy: string; modelContract: { lane: string; maxOutputTokens: number; retryLimit: number }; pilot?: boolean };
type Snapshot = {
  stage: { status: string; threshold: number; blocker?: string; evidence: string };
  upstream: { frozen: boolean; shotCount: number };
  providerReadiness: Record<string, boolean>;
  policy: Record<string, string | number>;
  run: null | { status: string; score: number; briefCount: number; pilotCount: number; remoteRequests: number; actualCostUsd: number; gates: Gate[] };
  artifact: null | { contentHash: string; routeMix: Record<string, number>; modelMix: Record<string, number>; sampleBriefs: Brief[]; pilotIds: string[] };
};

export default function MaterialProductionPage() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/factory/material-production", { cache: "no-store" });
      const payload = await response.json() as Snapshot & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Stage 09 could not load");
      setData(payload); setError(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Stage 09 could not load"); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function build() {
    setWorking(true); setError(null);
    try {
      const response = await fetch("/api/factory/material-production", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "BUILD_DRY_RUN" }) });
      const payload = await response.json() as Snapshot & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Dry run failed");
      setData(payload);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Dry run failed"); }
    finally { setWorking(false); }
  }
  if (!data) return <main className="shotShell"><p className="stateBanner">{error || "Loading Stage 09 production contract…"}</p></main>;
  const ready = data.stage.status === "READY" || data.stage.status === "PILOT_READY";
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
      <button onClick={build} disabled={working || !ready}>{working ? "Compiling 166 local briefs…" : data.run ? "Rebuild deterministic dry run" : "Build zero-spend dry run"}</button>
    </section>
    {error && <p className="stateBanner errorState">{error}</p>}
    <section className="shotDoctrine">
      <header><p>MATERIAL FUNNEL · LOCKED</p><h2>Deterministic first. Expensive intelligence last.</h2><span>Pilot production stays unauthorized until this contract passes.</span></header>
      <div className="shotMetrics">
        {[['01','Rules','Reject impossible routes and rights failures.'],['02','Retrieval','Search provider, Drive and reusable library.'],['03','Shortlist','Embeddings narrow candidates without long outputs.'],['04','Pixel QA','Vision inspects only top three actual files.'],['05','Adjudicate','High reasoning only for ambiguous finalists.'],['06','Store','Bytes, checksum, provenance and rights become evidence.']].map(([n,t,d])=><article key={n}><small>{n}</small><h3>{t}</h3><p>{d}</p></article>)}
      </div>
    </section>
    <section className="shotProgress">
      <header><div><p>DRY-RUN AUDIT</p><h2>{data.run ? `${data.run.status.replaceAll("_", " ")} · ${data.run.briefCount} briefs` : "Awaiting compilation"}</h2></div><strong>{data.run?.pilotCount || 0} pilot shots</strong></header>
      <div className="shotGates">{(data.run?.gates || []).map((gate)=><article key={gate.id} className={gate.status === "PASS" ? "pass" : "fail"}><b>{gate.status === "PASS" ? "✓" : "!"} {gate.id.replaceAll("_", " ")}</b><span>{gate.evidence}</span></article>)}</div>
    </section>
    <section className="shotArtifact">
      <header><div><p>EXECUTION SAFETY CONTRACT</p><h2>Token and cost controls are bound per request</h2></div><span>{data.artifact ? `SHA-256 · ${data.artifact.contentHash.slice(0, 16)}…` : "Not stored yet"}</span></header>
      <div className="shotMetrics">
        <article><small>ORDINARY OUTPUT</small><h3>500–3,000</h3><p>Only the fields needed by one candidate decision.</p></article>
        <article><small>ABSOLUTE CEILING</small><h3>8,000</h3><p>Reserved for critical factual ambiguity.</p></article>
        <article><small>RETRY</small><h3>1 delta</h3><p>Never repeat a completed request or whole batch.</p></article>
        <article><small>PILOT</small><h3>8–12 shots</h3><p>No full production before sequence QA passes.</p></article>
      </div>
    </section>
    {data.artifact && <section className="shotSamples">
      <header><div><p>SAMPLE MATERIAL BRIEFS</p><h2>Production routes are visible before spend</h2></div><span>SOURCE {data.artifact.routeMix.SOURCE || 0} · MAKE {data.artifact.routeMix.MAKE || 0} · HYBRID {data.artifact.routeMix.HYBRID || 0}</span></header>
      <div>{data.artifact.sampleBriefs.map((brief)=><article key={brief.briefId}><b>{brief.briefId} · {brief.route}{brief.pilot ? " · PILOT" : ""}</b><h3>{brief.primaryFamily}</h3><p>{brief.viewerMustUnderstand}</p><footer><span>{brief.startSeconds.toFixed(1)}–{brief.endSeconds.toFixed(1)}s</span><span>{brief.renderPolicy}</span><span>{brief.modelContract.lane} · {brief.modelContract.maxOutputTokens} tokens</span></footer></article>)}</div>
    </section>}
    <section className="shotGates"><article className={data.run?.status === "PILOT_READY" ? "pass" : "fail"}><b>{data.run?.status === "PILOT_READY" ? "✓ Pilot contract ready" : "○ Pilot blocked"}</b><span>{data.run?.status === "PILOT_READY" ? "Next wave may authorize only the selected 8–12 shots." : "Build and pass the zero-spend dry run first."}</span></article></section>
  </main>;
}
