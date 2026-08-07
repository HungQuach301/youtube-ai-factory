"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Gate = { id: string; label: string; status: string; evidence: string };
type Stage = { id: string; stageKey: string; stageName: string; status: string; threshold: number; attempt: number; blocker: string | null; evidenceSummary: string; artifactId: string | null };
type Artifact = { id: string; stageKey: string; artifactType: string; title: string; lifecycleState: string; content: Record<string, unknown>; contentHash: string; runtimeKey: string; driveFileId: string; sourceCount: number; createdAt: string };
type Run = { id: string; stageKey: string; attempt: number; status: string; score: number; threshold: number; gates: Gate[]; startedAt: string; completedAt: string | null };
type Job = { id: string; runId: string; stageKey: string; status: string; providerStatus: string; heartbeatAt: string; startedAt: string; finalizedAt: string | null; error: string | null };
type Data = {
  program: { productionAuthorized: boolean; executionMode: string; status: string };
  provider: { connected: boolean; model: string; sourceMode: string };
  stages: Stage[]; runs: Run[]; jobs: Job[]; artifacts: Artifact[]; sourceCount: number; claimCount: number;
};

const human = (value?: string | null) => (value || "").replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
const list = <T,>(value: unknown) => Array.isArray(value) ? value as T[] : [];

export default function IntelligencePage() {
  const [data, setData] = useState<Data | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [clock, setClock] = useState(() => Date.now());

  const load = useCallback(async () => {
    const response = await fetch("/api/factory/intelligence", { cache: "no-store" });
    const payload = await response.json() as Data & { error?: string };
    if (!response.ok) throw new Error(payload.error || "Wave 2 intelligence could not load");
    setData(payload);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load().catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load")); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function requestStage(action: "RUN_STAGE" | "POLL_STAGE", stage: string) {
    const response = await fetch("/api/factory/intelligence", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, stage }) });
    const payload = await response.json() as Data & { error?: string };
    if (!response.ok) throw new Error(payload.error || `Stage ${stage} failed`);
    setData(payload);
    return payload;
  }

  async function runStage(stage: string, resume = false) {
    setWorking(stage); setError(""); setNotice(resume ? `Resuming Stage ${stage} from its stored background job…` : `Stage ${stage} submitted as a resumable background research job…`);
    try {
      let payload = resume ? data! : await requestStage("RUN_STAGE", stage);
      const started = Date.now();
      let transientPollFailures = 0;
      while (Date.now() - started < 12 * 60 * 1000) {
        const result = payload.runs.find((run) => run.stageKey === stage);
        if (result && result.status !== "RUNNING") {
          setNotice(result.status === "PASS" ? `Stage ${stage} passed ${result.score}/${result.threshold}; evidence frozen in R2 and Google Drive.` : `Stage ${stage} stopped at its hard gate. A bounded repair attempt is available.`);
          return { passed: result.status === "PASS", payload };
        }
        await new Promise((resolve) => window.setTimeout(resolve, 3000));
        try {
          payload = await requestStage("POLL_STAGE", stage);
          transientPollFailures = 0;
        } catch (pollError) {
          transientPollFailures += 1;
          if (transientPollFailures >= 5) throw pollError;
          setNotice(`Stage ${stage} remains safe in the background · reconnecting status ${transientPollFailures}/5…`);
          await new Promise((resolve) => window.setTimeout(resolve, 5000));
          continue;
        }
        const job = payload.jobs.find((item) => item.stageKey === stage && item.status === "ACTIVE");
        const elapsed = Math.max(0, Math.floor((Date.now() - new Date(job?.startedAt || Date.now()).getTime()) / 1000));
        setNotice(`Stage ${stage} · ${human(job?.providerStatus || "finalizing")} · ${Math.floor(elapsed / 60)}m ${elapsed % 60}s · heartbeat active`);
      }
      throw new Error(`Stage ${stage} is still running safely in the background. Use Resume Wave 2 Autopilot to continue monitoring.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : `Stage ${stage} failed`); return { passed: false, payload: data! }; }
    finally { setWorking(null); }
  }

  async function runAutopilot() {
    let currentData = data!;
    for (const stage of ["01", "02", "03"]) {
      const current = currentData.stages.find((item) => item.stageKey === stage);
      if (current?.status === "FROZEN") continue;
      const active = currentData.jobs.find((job) => job.stageKey === stage && job.status === "ACTIVE");
      if (!active && (!current || !["READY", "REPAIR_REQUIRED"].includes(current.status))) { setError(`Stage ${stage} is still blocked by upstream evidence.`); return; }
      const result = await runStage(stage, Boolean(active)); currentData = result.payload;
      if (!result.passed) return;
    }
    setNotice("Wave 2 is frozen. Creative Contract is now authorized to begin.");
  }

  const latestRuns = useMemo(() => Object.fromEntries((data?.stages || []).map((stage) => [stage.stageKey, data?.runs.find((run) => run.stageKey === stage.stageKey) || null])), [data]);
  const latestArtifacts = useMemo(() => Object.fromEntries((data?.stages || []).map((stage) => [stage.stageKey, data?.artifacts.find((artifact) => artifact.stageKey === stage.stageKey) || null])), [data]);
  const progress = data ? Math.round(data.stages.filter((stage) => stage.status === "FROZEN").length / 3 * 100) : 0;
  const activeJobs = data?.jobs.filter((job) => job.status === "ACTIVE") || [];

  if (!data) return <main className="intelLoading"><span>V7</span><h1>Loading intelligence workspace…</h1>{error && <p>{error}</p>}</main>;

  return <main className="intelShell">
    <header className="intelTopbar">
      <div><Link href="/control-plane">← V7 Control Plane</Link><p>PRODUCTION V7 · WAVE 2</p><h1>Intelligence Foundry</h1></div>
      <div><span className={data.program.productionAuthorized ? "ready" : "blocked"}>{data.program.productionAuthorized ? "FOUNDATION AUTHORIZED" : "FOUNDATION BLOCKED"}</span><Link href="/settings">Factory settings</Link></div>
    </header>

    {error && <div className="intelAlert" role="alert"><strong>Execution stopped</strong><span>{error}</span></div>}

    <section className="intelHero">
      <div><p>GREENFIELD INTELLIGENCE CONTRACT</p><h2>Observe reality before inventing the story.</h2><span>Current web evidence selects the opportunity. References teach patterns without cloning. Primary sources control every claim that reaches Creative.</span></div>
      <aside><small>WAVE COMPLETION</small><strong>{progress}%</strong><i><b style={{ width: `${progress}%` }} /></i><span>{data.sourceCount} sources · {data.claimCount} claims</span></aside>
    </section>

    <section className="intelControlBar">
      <div><small>MODE</small><strong>{human(data.program.executionMode)}</strong></div>
      <div><small>RESEARCH PROVIDER</small><strong>{data.provider.connected ? `${data.provider.model} + web search` : "OpenAI connection required"}</strong></div>
      <div><small>POLICY</small><strong>Maximum quality · fresh evidence only</strong></div>
      <button disabled={Boolean(working) || !data.provider.connected || !data.program.productionAuthorized || progress === 100} onClick={() => void runAutopilot()}>{working ? `Running Stage ${working}…` : progress === 100 ? "Wave 2 frozen" : activeJobs.length ? "Resume Wave 2 Autopilot" : "Run Wave 2 Autopilot"}</button>
    </section>

    {notice && <div className="intelNotice"><span>✓</span>{notice}</div>}

    <section className="intelStages">
      {data.stages.map((stage) => {
        const run = latestRuns[stage.stageKey] as Run | null; const job = activeJobs.find((item) => item.stageKey === stage.stageKey); const ready = ["READY", "REPAIR_REQUIRED"].includes(stage.status) || Boolean(job); const frozen = stage.status === "FROZEN";
        return <article key={stage.stageKey} className={`${stage.status.toLowerCase()} ${working === stage.stageKey ? "running" : ""}`}>
          <header><span>{stage.stageKey}</span><b>{human(stage.status)}</b></header>
          <h2>{stage.stageName}</h2><p>{stage.evidenceSummary}</p>
          <div><small>HARD FLOOR</small><strong>{run ? `${run.score}/${stage.threshold}` : `≥${stage.threshold}`}</strong><small>ATTEMPT</small><strong>{stage.attempt}/3</strong></div>
          {job && <div className="intelJobStatus"><span className="intelPulse" /><strong>{human(job.providerStatus)}</strong><small>{Math.max(0, Math.floor((clock - new Date(job.startedAt).getTime()) / 1000))}s elapsed · resumable</small></div>}
          {run?.gates?.length ? <ul>{run.gates.map((gate) => <li key={gate.id}><span className={gate.status.toLowerCase()}>{gate.status === "PASS" ? "✓" : "!"}</span><div><strong>{gate.label}</strong><small>{gate.evidence}</small></div></li>)}</ul> : <div className="intelStageEmpty">No V7 artifact has been produced yet.</div>}
          <button disabled={Boolean(working) || !ready || frozen || !data.provider.connected} onClick={() => void runStage(stage.stageKey, Boolean(job))}>{working === stage.stageKey ? "Researching and adjudicating…" : frozen ? "Artifact frozen" : job ? "Resume monitoring this stage" : stage.status === "REPAIR_REQUIRED" ? "Run bounded repair attempt" : "Run this stage"}</button>
          {stage.blocker && <footer>{stage.blocker}</footer>}
        </article>;
      })}
    </section>

    <section className="intelArtifacts">
      <header><div><p>REAL DELIVERABLES</p><h2>Frozen intelligence artifacts</h2></div><span>R2 working copy + Google Drive canonical archive</span></header>
      {!data.artifacts.length && <div className="intelNoArtifacts"><strong>No plans masquerading as evidence</strong><p>Run Stage 01 to create the first stored, hashed and independently gated artifact.</p></div>}
      {data.stages.map((stage) => {
        const artifact = latestArtifacts[stage.stageKey] as Artifact | null; if (!artifact) return null; const content = artifact.content;
        const champion = content.champion as Record<string, unknown> | undefined;
        const candidates = list<Record<string, unknown>>(content.candidates);
        const references = list<Record<string, unknown>>(content.references);
        const claims = list<Record<string, unknown>>(content.claims);
        const sources = list<Record<string, unknown>>(content.sources);
        return <article className="intelArtifact" key={artifact.id}>
          <header><div><small>STAGE {stage.stageKey} · {human(artifact.artifactType)}</small><h3>{artifact.title}</h3></div><span>{artifact.lifecycleState} · {artifact.sourceCount} sources</span></header>
          {champion && <div className="intelChampion"><small>CHAMPION TOPIC</small><strong>{String(champion.title || "")}</strong><p>{String(champion.viewerPromise || "")}</p><em>{String(champion.differentiation || "")}</em></div>}
          {candidates.length > 0 && <div className="intelCardGrid">{candidates.slice(0, 12).map((candidate, index) => <article key={index}><span>{String(index + 1).padStart(2, "0")}</span><strong>{String(candidate.title || "")}</strong><p>{String(candidate.centralQuestion || "")}</p><b>{String(candidate.score || 0)}</b></article>)}</div>}
          {references.length > 0 && <div className="intelReferenceGrid">{references.map((reference, index) => <article key={index}><span>{String(reference.referenceGroup || "")}</span><strong>{String(reference.title || "")}</strong><small>{String(reference.channel || "")}</small><p>{String(reference.whyItWorks || "")}</p><a href={String(reference.url || "#")} target="_blank" rel="noreferrer">Open reference ↗</a></article>)}</div>}
          {claims.length > 0 && <div className="intelClaimList">{claims.map((claim, index) => <article key={index}><span>{String(claim.riskLevel || "")}</span><div><strong>{String(claim.text || "")}</strong><p>{String(claim.qualification || "")}</p></div><b>{list(claim.sourceIds).length} sources</b></article>)}</div>}
          <details className="intelSources"><summary>Source ledger · {sources.length} records</summary><div>{sources.map((source, index) => <a key={index} href={String(source.url || "#")} target="_blank" rel="noreferrer"><span>{String(source.authorityTier || "")}</span><strong>{String(source.title || "")}</strong><small>{String(source.publisher || "")}</small></a>)}</div></details>
          <footer><span>SHA-256 · {artifact.contentHash.slice(0, 16)}…</span><span>Stored in runtime and canonical archive</span></footer>
        </article>;
      })}
    </section>

    <footer className="intelFooter"><div><strong>Wave 2 release rule</strong><span>Creative Contract stays blocked until the claim graph freezes with zero unresolved P0 evidence defects.</span></div><Link href="/control-plane">Return to V7 Control Plane →</Link></footer>
  </main>;
}
