"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Tab = "brief" | "evidence" | "script" | "critics" | "history";
type Workspace = {
  project: { id: string; title: string; pillar: string; status: string; progress: number; spentUsd: number; budgetUsd: number };
  brief: { targetViewer: string; centralQuestion: string; viewerPromise: string; uniqueAngle: string; format: string; riskNote: string; status: string };
  sources: Array<{ id: string; title: string; publisher: string; url: string; authority: string; freshness: string; status: string }>;
  claims: Array<{ id: string; claimText: string; riskLevel: string; status: string; sourceCount: number }>;
  scripts: Array<{ id: string; version: number; content: string; status: string; criticScore: number | null; createdAt: string }>;
  critics: Array<{ id: number; scriptVersionId: string; criticType: string; score: number; decision: string; findings: string }>;
  events: Array<{ id: number; eventType: string; summary: string; createdAt: string }>;
};

const tabs: Array<{ key: Tab; label: string }> = [
  { key: "brief", label: "Opportunity brief" },
  { key: "evidence", label: "Evidence & claims" },
  { key: "script", label: "Script versions" },
  { key: "critics", label: "Critic review" },
  { key: "history", label: "History" },
];

const stages = ["Opportunity", "Research", "Script", "Storyboard", "Voice", "Production", "Publish"];

export default function ProjectWorkspace() {
  const params = useParams<{ id: string }>();
  const id = params?.id || "VID-001";
  const [tab, setTab] = useState<Tab>("brief");
  const [data, setData] = useState<Workspace | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("Workspace loading…");

  const load = useCallback(async () => {
    const response = await fetch(`/api/projects/${id}/workspace`);
    if (!response.ok) throw new Error("Unable to load project workspace");
    const payload = await response.json() as Workspace;
    setData(payload);
    setNotice("All project records synced");
  }, [id]);

  useEffect(() => {
    let active = true;
    fetch(`/api/projects/${id}/workspace`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Workspace data could not be loaded")))
      .then((payload: Workspace) => {
        if (!active) return;
        setData(payload);
        setNotice("All project records synced");
      })
      .catch((error: Error) => active && setNotice(error.message));
    return () => { active = false; };
  }, [id]);

  async function runAction(action: "RUN_CRITICS" | "CREATE_REVISION") {
    setBusy(true);
    setNotice(action === "RUN_CRITICS" ? "Four independent critics are reviewing the latest script…" : "Creating a revision from critic findings…");
    try {
      const response = await fetch(`/api/projects/${id}/workspace`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
      if (!response.ok) throw new Error();
      await load();
      setTab(action === "RUN_CRITICS" ? "critics" : "script");
      setNotice(action === "RUN_CRITICS" ? "Critic gate completed · one revision requested" : "New script version created with a traceable revision event");
    } catch {
      setNotice("Action failed safely · no workflow state was advanced");
    } finally { setBusy(false); }
  }

  const latest = data?.scripts[0];
  const scriptSections = useMemo(() => {
    if (!latest) return [];
    try { return JSON.parse(latest.content) as Array<{ time: string; label: string; text: string }>; } catch { return []; }
  }, [latest]);
  const currentCritics = data?.critics.filter((critic) => critic.scriptVersionId === latest?.id) || [];
  const supportedClaims = data?.claims.filter((claim) => claim.status === "SUPPORTED").length || 0;

  if (!data) {
    return <main className="projectLoading"><span className="loadingMark">F</span><h1>{notice}</h1><button onClick={() => { window.location.href = "/"; }}>Return to command center</button></main>;
  }

  return (
    <main className="projectShell">
      <header className="projectHeader">
        <div className="projectHeaderTop">
          <button className="backLink" onClick={() => { window.location.href = "/"; }}>← Command center</button>
          <div className="headerTools"><span className="systemPulse"><i />Project synced</span><button className="secondaryButton">•••</button></div>
        </div>
        <div className="projectIdentity">
          <div><div className="projectKicker"><span>{data.project.id}</span><span>{data.project.pillar}</span></div><h1>{data.project.title}</h1></div>
          <div className="projectBudget"><small>Production budget</small><strong>${data.project.spentUsd.toFixed(2)} <span>/ ${data.project.budgetUsd}</span></strong></div>
        </div>
        <div className="stageRail">
          {stages.map((stage, index) => <div key={stage} className={`stageNode ${index < 2 ? "done" : index === 2 ? "current" : ""}`}><span>{index < 2 ? "✓" : index + 1}</span><small>{stage}</small></div>)}
        </div>
      </header>

      <section className="projectBody">
        <div className="projectNotice" role="status"><span>✓</span>{notice}</div>
        <div className="workspaceSummary">
          <div><small>Current gate</small><strong>Script quality review</strong></div>
          <div><small>Evidence coverage</small><strong>{supportedClaims}/{data.claims.length} claims passed</strong></div>
          <div><small>Latest version</small><strong>Script v{latest?.version || 1}</strong></div>
          <div><small>Next unlock</small><strong>Storyboard generation</strong></div>
        </div>

        <nav className="projectTabs" aria-label="Project workspace sections">
          {tabs.map((item) => <button key={item.key} className={tab === item.key ? "active" : ""} onClick={() => setTab(item.key)}>{item.label}{item.key === "critics" && currentCritics.length > 0 && <span>{currentCritics.length}</span>}</button>)}
        </nav>

        <div className="projectContent">
          {tab === "brief" && <BriefView brief={data.brief} onContinue={() => setTab("evidence")} />}
          {tab === "evidence" && <EvidenceView sources={data.sources} claims={data.claims} />}
          {tab === "script" && <ScriptView latest={latest} sections={scriptSections} versions={data.scripts} onRun={() => runAction("RUN_CRITICS")} busy={busy} />}
          {tab === "critics" && <CriticsView critics={currentCritics} onRun={() => runAction("RUN_CRITICS")} onRevise={() => runAction("CREATE_REVISION")} busy={busy} />}
          {tab === "history" && <HistoryView events={data.events} />}
        </div>
      </section>
    </main>
  );
}

function BriefView({ brief, onContinue }: { brief: Workspace["brief"]; onContinue: () => void }) {
  const fields = [
    ["Target viewer", brief.targetViewer], ["Central question", brief.centralQuestion], ["Viewer promise", brief.viewerPromise],
    ["Unique angle", brief.uniqueAngle], ["Format", brief.format], ["Accuracy risk", brief.riskNote],
  ];
  return <section className="workspacePanel"><div className="contentHeader"><div><p className="eyebrow">Gate 01 · approved</p><h2>Opportunity brief</h2><p>The immutable creative contract used by every downstream agent and reviewer.</p></div><span className="gatePassed">✓ Gate passed</span></div><div className="briefGrid">{fields.map(([label, value], index) => <article key={label} className={index < 4 ? "wideBrief" : ""}><small>{label}</small><p>{value}</p></article>)}</div><div className="panelFooter"><span>Changes after approval create a new brief version.</span><button className="primaryButton" onClick={onContinue}>Inspect evidence →</button></div></section>;
}

function EvidenceView({ sources, claims }: { sources: Workspace["sources"]; claims: Workspace["claims"] }) {
  return <div className="evidenceLayout"><section className="workspacePanel"><div className="contentHeader"><div><p className="eyebrow">Research pack</p><h2>Verified evidence</h2><p>Sources are ranked by authority and linked to claims before scripting.</p></div><span className="coverageScore">82% coverage</span></div><div className="sourceList">{sources.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="sourceRow"><span className="sourceIcon">↗</span><div><strong>{source.title}</strong><p>{source.publisher} · {source.freshness}</p></div><span className="authorityBadge">{source.authority}</span></a>)}</div></section><section className="workspacePanel claimPanel"><div className="contentHeader"><div><p className="eyebrow">Claim map</p><h2>What the script may say</h2></div></div><div className="claimList">{claims.map((claim) => <article key={claim.id}><div className="claimTop"><span>{claim.id.split("-").slice(-2).join("-")}</span><span className={`risk ${claim.riskLevel.toLowerCase()}`}>{claim.riskLevel} risk</span></div><p>{claim.claimText}</p><footer><span className={claim.status === "SUPPORTED" ? "supported" : "qualifier"}>{claim.status === "SUPPORTED" ? "✓ Supported" : "! Needs qualifier"}</span><span>{claim.sourceCount} sources</span></footer></article>)}</div></section></div>;
}

function ScriptView({ latest, sections, versions, onRun, busy }: { latest?: Workspace["scripts"][number]; sections: Array<{ time: string; label: string; text: string }>; versions: Workspace["scripts"]; onRun: () => void; busy: boolean }) {
  return <div className="scriptLayout"><section className="workspacePanel"><div className="contentHeader"><div><p className="eyebrow">Narration draft</p><h2>Script v{latest?.version}</h2><p>Every section remains linked to the approved brief and claim map.</p></div><button disabled={busy} className="primaryButton" onClick={onRun}>{busy ? "Reviewing…" : "Run critic gate"}</button></div><div className="scriptPaper">{sections.map((section) => <article key={`${section.time}-${section.label}`}><div><span>{section.time}</span><strong>{section.label}</strong></div><p>{section.text}</p></article>)}</div></section><aside className="versionRail"><h3>Version history</h3>{versions.map((version) => <button key={version.id} className={version.id === latest?.id ? "active" : ""}><span>v{version.version}</span><div><strong>{version.status.replaceAll("_", " ")}</strong><small>{version.criticScore ? `${version.criticScore}/100 critic score` : "Not scored"}</small></div></button>)}</aside></div>;
}

function CriticsView({ critics, onRun, onRevise, busy }: { critics: Workspace["critics"]; onRun: () => void; onRevise: () => void; busy: boolean }) {
  if (!critics.length) return <section className="workspacePanel emptyCritics"><span className="criticGlyph">◎</span><h2>Independent review is ready</h2><p>Four critics will evaluate factual accuracy, story quality, channel risk and originality. The gate cannot pass if a critical issue remains.</p><button disabled={busy} className="primaryButton" onClick={onRun}>{busy ? "Reviewing…" : "Run four critics"}</button></section>;
  const average = Math.round(critics.reduce((sum, critic) => sum + critic.score, 0) / critics.length);
  return <section className="workspacePanel"><div className="contentHeader"><div><p className="eyebrow">Gate 03 · changes requested</p><h2>Independent critic review</h2><p>Findings are isolated by role, then reconciled into a revision plan.</p></div><div className="criticAverage"><small>Composite</small><strong>{average}</strong><span>/100</span></div></div><div className="criticGrid">{critics.map((critic) => { const findings = JSON.parse(critic.findings) as string[]; return <article key={critic.id}><header><div><span className="criticAvatar">{critic.criticType.charAt(0)}</span><strong>{critic.criticType}</strong></div><span className={`decision ${critic.decision.toLowerCase()}`}>{critic.decision}</span></header><div className="criticScore"><strong>{critic.score}</strong><span>/100</span></div><ul>{findings.map((finding) => <li key={finding}>{finding}</li>)}</ul></article>; })}</div><div className="revisionCallout"><div><strong>1 revision required before storyboard</strong><p>The story critic requested a concrete $100 transaction example. All other findings remain as script guardrails.</p></div><button disabled={busy} className="primaryButton" onClick={onRevise}>{busy ? "Creating…" : "Create revised script"}</button></div></section>;
}

function HistoryView({ events }: { events: Workspace["events"] }) {
  return <section className="workspacePanel"><div className="contentHeader"><div><p className="eyebrow">Audit trail</p><h2>Project history</h2><p>Every gate, automation and revision produces a durable workflow event.</p></div></div><div className="historyList">{events.map((event) => <article key={event.id}><span className="historyDot"/><div><strong>{event.summary}</strong><p>{event.eventType.replaceAll("_", " ")} · {new Date(event.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</p></div></article>)}</div></section>;
}
