"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useParams } from "next/navigation";

type Tab = "optimization" | "brief" | "evidence" | "script" | "critics" | "voice" | "production" | "media" | "composer" | "references" | "quality" | "history";
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
  { key: "optimization", label: "Optimization OS" },
  { key: "brief", label: "Opportunity brief" },
  { key: "evidence", label: "Evidence & claims" },
  { key: "script", label: "Script versions" },
  { key: "critics", label: "Critic review" },
  { key: "voice", label: "Voice studio" },
  { key: "production", label: "Storyboard & export" },
  { key: "media", label: "Media & assembly" },
  { key: "composer", label: "Final composer" },
  { key: "references", label: "Reference intelligence" },
  { key: "quality", label: "Universal quality gate" },
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
  const currentStageIndex = data?.project.status === "RENDER_READY" ? 6 : data?.project.status === "ASSEMBLY_READY" ? 5 : data?.project.status === "PRODUCTION_PREP" ? 5 : data?.project.status === "STORYBOARDING" ? 3 : data?.project.status === "VOICE_PRODUCTION" ? 4 : data?.project.status === "SCRIPTING" ? 2 : data?.project.status === "RESEARCHING" ? 1 : 0;

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
          {stages.map((stage, index) => <div key={stage} className={`stageNode ${index < currentStageIndex ? "done" : index === currentStageIndex ? "current" : ""}`}><span>{index < currentStageIndex ? "✓" : index + 1}</span><small>{stage}</small></div>)}
        </div>
      </header>

      <section className="projectBody">
        <div className="projectNotice" role="status"><span>✓</span>{notice}</div>
        <div className="workspaceSummary">
          <div><small>Current gate</small><strong>{currentStageIndex >= 6 ? "Final playback QA" : currentStageIndex >= 5 ? "Production asset readiness" : currentStageIndex >= 3 ? "Storyboard approval" : "Script quality review"}</strong></div>
          <div><small>Evidence coverage</small><strong>{supportedClaims}/{data.claims.length} claims passed</strong></div>
          <div><small>Latest version</small><strong>Script v{latest?.version || 1}</strong></div>
          <div><small>Next unlock</small><strong>{currentStageIndex >= 6 ? "Publishing package" : currentStageIndex >= 5 ? "Final video assembly" : currentStageIndex >= 3 ? "Editor export package" : "Storyboard generation"}</strong></div>
        </div>

        <nav className="projectTabs" aria-label="Project workspace sections">
          {tabs.map((item) => <button key={item.key} className={tab === item.key ? "active" : ""} onClick={() => setTab(item.key)}>{item.label}{item.key === "critics" && currentCritics.length > 0 && <span>{currentCritics.length}</span>}</button>)}
        </nav>

        <div className="projectContent">
          {tab === "optimization" && <ContinuousOptimizationSystem projectId={id} setProjectNotice={setNotice} />}
          {tab === "brief" && <BriefView brief={data.brief} onContinue={() => setTab("evidence")} />}
          {tab === "evidence" && <EvidenceView sources={data.sources} claims={data.claims} />}
          {tab === "script" && <ScriptView latest={latest} sections={scriptSections} versions={data.scripts} onRun={() => runAction("RUN_CRITICS")} busy={busy} />}
          {tab === "critics" && <CriticsView critics={currentCritics} onRun={() => runAction("RUN_CRITICS")} onRevise={() => runAction("CREATE_REVISION")} busy={busy} />}
          {tab === "voice" && <VoiceStudio projectId={id} setProjectNotice={setNotice} />}
          {tab === "production" && <ProductionStudio projectId={id} setProjectNotice={setNotice} />}
          {tab === "media" && <MediaStudio projectId={id} setProjectNotice={setNotice} />}
          {tab === "composer" && <FinalComposer projectId={id} setProjectNotice={setNotice} />}
          {tab === "references" && <ReferenceIntelligence projectId={id} setProjectNotice={setNotice} />}
          {tab === "quality" && <UniversalQualityGate projectId={id} setProjectNotice={setNotice} />}
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

type VoiceData = {
  provider: { name: string; connected: boolean; storageReady: boolean };
  profile: { voiceName: string; voiceId: string; modelId: string; stability: number; similarityBoost: number; style: number; speed: number; status: string };
  segments: Array<{ id: string; position: number; label: string; text: string; characterCount: number; status: string; durationSeconds: number | null; takeNumber: number; audioKey: string | null }>;
  rules: Array<{ id: number; term: string; pronunciation: string; ruleType: string; status: string }>;
  evaluations: Array<{ id: number; segmentId: string; takeNumber: number; pronunciationScore: number; paceScore: number; consistencyScore: number; decision: string; findings: string }>;
  gatePassed: boolean;
};

function VoiceStudio({ projectId, setProjectNotice }: { projectId: string; setProjectNotice: (message: string) => void }) {
  const [voice, setVoice] = useState<VoiceData | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const loadVoice = useCallback(async () => {
    const response = await fetch(`/api/projects/${projectId}/voice`);
    if (!response.ok) throw new Error();
    setVoice(await response.json() as VoiceData);
  }, [projectId]);

  useEffect(() => {
    let active = true;
    fetch(`/api/projects/${projectId}/voice`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload: VoiceData) => active && setVoice(payload))
      .catch(() => active && setProjectNotice("Voice workspace could not be loaded"));
    return () => { active = false; };
  }, [projectId, setProjectNotice]);

  async function voiceAction(action: "LOCK_VOICE" | "GENERATE_SEGMENT" | "APPROVE_SEGMENT" | "PASS_VOICE_GATE", segmentId?: string) {
    setWorkingId(segmentId || (action === "PASS_VOICE_GATE" ? "gate" : "profile"));
    setProjectNotice(action === "LOCK_VOICE" ? "Locking the channel voice profile…" : action === "GENERATE_SEGMENT" ? "Generating narration with timestamps…" : action === "PASS_VOICE_GATE" ? "Closing the voice gate and unlocking storyboard production…" : "Approving narration take…");
    try {
      const response = await fetch(`/api/projects/${projectId}/voice`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, segmentId }) });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: string };
        if (payload.error === "ELEVENLABS_NOT_CONNECTED") {
          setProjectNotice("Secure ElevenLabs connection required before audio generation");
          return;
        }
        throw new Error();
      }
      await loadVoice();
      setProjectNotice(action === "LOCK_VOICE" ? "Channel voice profile locked" : action === "GENERATE_SEGMENT" ? "New narration take ready for the listening gate" : action === "PASS_VOICE_GATE" ? "Voice gate passed · storyboard production unlocked" : "Narration segment approved");
    } catch { setProjectNotice("Voice action failed safely · no approved audio was replaced"); }
    finally { setWorkingId(null); }
  }

  if (!voice) return <section className="workspacePanel voiceLoading"><span>◌</span><p>Preparing narration segments…</p></section>;
  const totalCharacters = voice.segments.reduce((sum, segment) => sum + segment.characterCount, 0);
  const approved = voice.segments.filter((segment) => segment.status === "APPROVED").length;
  const generated = voice.segments.filter((segment) => segment.audioKey).length;
  const estimatedMinutes = Math.max(1, Math.round(voice.segments.reduce((sum, segment) => sum + segment.text.split(/\s+/).length, 0) / 150));

  return <div className="voiceStudioLayout">
    <section className="workspacePanel voiceMain">
      <div className="contentHeader voiceHeader"><div><p className="eyebrow">WS-05 · narration production</p><h2>Voice studio</h2><p>Generate and approve narration one segment at a time. A failed take never replaces approved audio.</p></div><span className={`providerState ${voice.provider.connected ? "connected" : "waiting"}`}><i />{voice.provider.connected ? "ElevenLabs connected" : "Secure connection required"}</span></div>
      {!voice.provider.connected && <div className="connectionBanner"><span className="connectionIcon">⌁</span><div><strong>Audio generation is safely locked</strong><p>Add the ElevenLabs key as a protected workspace secret. It is never stored in project data or sent to the browser.</p></div><span className="secretBadge">Secret-only</span></div>}
      <div className="voiceMetrics"><div><small>Segments</small><strong>{voice.segments.length}</strong></div><div><small>Generated</small><strong>{generated}</strong></div><div><small>Approved</small><strong>{approved}/{voice.segments.length}</strong></div><div><small>Est. narration</small><strong>~{estimatedMinutes} min</strong></div><div><small>Character budget</small><strong>{totalCharacters.toLocaleString("en-US")}</strong></div></div>
      <div className="segmentList">{voice.segments.map((segment) => {
        const evaluation = voice.evaluations.find((item) => item.segmentId === segment.id && item.takeNumber === segment.takeNumber);
        const busy = workingId === segment.id;
        return <article className={`voiceSegment ${segment.status.toLowerCase()}`} key={segment.id}>
          <div className="segmentNumber">{String(segment.position).padStart(2, "0")}</div>
          <div className="segmentBody"><header><div><strong>{segment.label}</strong><span>{segment.characterCount} characters · take {segment.takeNumber || "—"}</span></div><span className={`segmentStatus ${segment.status.toLowerCase()}`}>{segment.status.replaceAll("_", " ")}</span></header><p>{segment.text}</p>
            {segment.audioKey && <div className="audioReview"><audio controls preload="none" src={`/api/projects/${projectId}/voice?audio=${encodeURIComponent(segment.id)}`} /><div className="qualityScores"><span>Pronunciation <strong>{evaluation?.pronunciationScore || "—"}</strong></span><span>Pace <strong>{evaluation?.paceScore || "—"}</strong></span><span>Consistency <strong>{evaluation?.consistencyScore || "—"}</strong></span></div></div>}
            <footer><span>{segment.durationSeconds ? `${segment.durationSeconds.toFixed(1)} sec` : "Awaiting first take"}</span><div><button className="secondaryButton compact" disabled={busy || !voice.provider.connected} onClick={() => voiceAction("GENERATE_SEGMENT", segment.id)}>{busy ? "Working…" : segment.audioKey ? "Regenerate" : "Generate take"}</button>{segment.audioKey && segment.status !== "APPROVED" && <button className="primaryButton compact" disabled={busy} onClick={() => voiceAction("APPROVE_SEGMENT", segment.id)}>Approve take</button>}</div></footer>
          </div>
        </article>;
      })}</div>
    </section>
    <aside className="voiceSideRail">
      <section className="workspacePanel voiceProfile"><div className="sideTitle"><p className="eyebrow">Channel identity</p><h3>Voice profile</h3></div><div className="voiceIdentity"><span>DN</span><div><strong>{voice.profile.voiceName}</strong><p>US English · calm authority</p></div></div><dl><div><dt>Model</dt><dd>{voice.profile.modelId.replaceAll("_", " ")}</dd></div><div><dt>Stability</dt><dd>{Math.round(voice.profile.stability * 100)}%</dd></div><div><dt>Similarity</dt><dd>{Math.round(voice.profile.similarityBoost * 100)}%</dd></div><div><dt>Delivery speed</dt><dd>{voice.profile.speed}×</dd></div></dl><button className={voice.profile.status === "LOCKED" ? "lockedVoice" : "primaryButton"} disabled={workingId === "profile" || voice.profile.status === "LOCKED"} onClick={() => voiceAction("LOCK_VOICE")}>{voice.profile.status === "LOCKED" ? "✓ Voice locked" : "Lock channel voice"}</button></section>
      <section className="workspacePanel pronunciationPanel"><div className="sideTitle"><p className="eyebrow">Pronunciation guardrail</p><h3>Term rules</h3></div><div>{voice.rules.map((rule) => <article key={rule.id}><div><strong>{rule.term}</strong><span>{rule.ruleType}</span></div><p>{rule.pronunciation}</p></article>)}</div><button className="textButton">＋ Add term rule</button></section>
      <section className="workspacePanel gateChecklist"><div className="sideTitle"><p className="eyebrow">Voice gate</p><h3>Approval criteria</h3></div><ul><li className={generated === voice.segments.length ? "done" : ""}>All segments generated</li><li className={approved === voice.segments.length ? "done" : ""}>Human listening complete</li><li className={voice.evaluations.every((item) => item.pronunciationScore >= 90) ? "done" : ""}>Pronunciation ≥ 90</li><li className={approved === voice.segments.length ? "done" : ""}>Pace and tone consistent</li></ul><button disabled={approved !== voice.segments.length || workingId === "gate" || voice.gatePassed} className={voice.gatePassed ? "lockedVoice" : "primaryButton"} onClick={() => voiceAction("PASS_VOICE_GATE")}>{voice.gatePassed ? "✓ Voice gate passed" : workingId === "gate" ? "Passing gate…" : "Pass voice gate"}</button></section>
    </aside>
  </div>;
}

type ProductionData = {
  scenes: Array<{ id: string; sceneNumber: number; startSeconds: number | null; endSeconds: number | null; beat: string; narrationExcerpt: string; visualIntent: string; shotType: string; mediaStrategy: string; searchQuery: string; assetSource: string; licenseStatus: string; assetStatus: string; sceneStatus: string }>;
  segments: Array<{ id: string; status: string; durationSeconds: number | null }>;
  packages: Array<{ id: string; version: number; status: string; totalDuration: number; exportFormat: string; createdAt: string }>;
  gates: { voice: boolean; storyboardReady: boolean; storyboardPassed: boolean; licensesReady: boolean };
};

function ProductionStudio({ projectId, setProjectNotice }: { projectId: string; setProjectNotice: (message: string) => void }) {
  const [production, setProduction] = useState<ProductionData | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadProduction = useCallback(async () => {
    setLoadError(null);
    const response = await fetch(`/api/projects/${projectId}/production`, { signal: AbortSignal.timeout(15000) });
    const payload = await response.json().catch(() => ({})) as ProductionData;
    if (!response.ok) throw new Error("Scene manifest could not be prepared. Please try again.");
    setProduction(payload);
  }, [projectId]);

  useEffect(() => {
    let active = true;
    fetch(`/api/projects/${projectId}/production`, { signal: AbortSignal.timeout(15000) })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as ProductionData;
        if (!response.ok) throw new Error("Scene manifest could not be prepared. Please try again.");
        return payload;
      })
      .then((payload) => { if (active) setProduction(payload); })
      .catch((error: Error) => {
        if (!active) return;
        const message = error.name === "TimeoutError" ? "Scene manifest timed out. Please retry." : error.message;
        setLoadError(message);
        setProjectNotice(message);
      });
    return () => { active = false; };
  }, [projectId, setProjectNotice]);

  async function productionAction(action: "APPROVE_SCENE" | "PASS_STORYBOARD_GATE" | "BUILD_EXPORT", sceneId?: string) {
    setWorking(sceneId || action);
    setProjectNotice(action === "APPROVE_SCENE" ? "Approving scene brief…" : action === "PASS_STORYBOARD_GATE" ? "Validating storyboard continuity…" : "Building editor-ready production package…");
    try {
      const response = await fetch(`/api/projects/${projectId}/production`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, sceneId }) });
      if (!response.ok) throw new Error();
      await loadProduction();
      setProjectNotice(action === "APPROVE_SCENE" ? "Scene brief approved" : action === "PASS_STORYBOARD_GATE" ? "Storyboard gate passed · media sourcing unlocked" : "Production package ready to download");
    } catch { setProjectNotice("Production action stopped at its gate · no approved work was changed"); }
    finally { setWorking(null); }
  }

  if (loadError) return <section className="workspacePanel productionError"><span>!</span><h2>Scene manifest could not load</h2><p>{loadError}</p><button className="primaryButton" onClick={() => loadProduction().catch((error: Error) => setLoadError(error.message))}>Try again</button></section>;
  if (!production) return <section className="workspacePanel voiceLoading"><span>◌</span><p>Building the scene manifest from approved narration…</p></section>;
  const approved = production.scenes.filter((scene) => scene.sceneStatus === "APPROVED").length;
  const licensed = production.scenes.filter((scene) => scene.licenseStatus === "VERIFIED").length;
  const mediaMix = production.scenes.reduce<Record<string, number>>((mix, scene) => ({ ...mix, [scene.mediaStrategy]: (mix[scene.mediaStrategy] || 0) + 1 }), {});
  const latestPackage = production.packages[0];

  return <div className="productionLayout">
    <section className="workspacePanel productionMain">
      <div className="contentHeader"><div><p className="eyebrow">WS-06 · production blueprint</p><h2>Storyboard & scene manifest</h2><p>Every scene is tied to approved narration, a sourcing strategy and a license gate. Planned assets are never presented as acquired media.</p></div><span className="coverageScore">{approved}/{production.scenes.length} scenes approved</span></div>
      <div className="productionMetrics"><div><small>Runtime</small><strong>{Math.round(production.scenes.reduce((max, scene) => Math.max(max, scene.endSeconds || 0), 0))} sec</strong></div><div><small>Scene coverage</small><strong>{production.gates.storyboardReady ? "100%" : "Needs work"}</strong></div><div><small>Licenses verified</small><strong>{licensed}/{production.scenes.length}</strong></div><div><small>Export packages</small><strong>{production.packages.length}</strong></div></div>
      <div className="sceneList">{production.scenes.map((scene) => <article key={scene.id} className={`sceneCard ${scene.sceneStatus.toLowerCase()}`}>
        <div className="sceneTime"><strong>{String(scene.sceneNumber).padStart(2, "0")}</strong><span>{formatTime(scene.startSeconds)}–{formatTime(scene.endSeconds)}</span></div>
        <div className="sceneContent"><header><div><strong>{scene.beat}</strong><span>{scene.shotType}</span></div><div className="sceneBadges"><span className={`license ${scene.licenseStatus.toLowerCase()}`}>{scene.licenseStatus.replaceAll("_", " ")}</span><span>{scene.mediaStrategy.replaceAll("_", " ")}</span></div></header><p className="visualIntent">{scene.visualIntent}</p><blockquote>“{scene.narrationExcerpt}”</blockquote><div className="sourcePlan"><div><small>Source plan</small><strong>{scene.assetSource}</strong></div><div><small>Search / generation prompt</small><strong>{scene.searchQuery}</strong></div></div><footer><span>{scene.assetStatus.replaceAll("_", " ")}</span><button disabled={working === scene.id || scene.sceneStatus === "APPROVED"} className={scene.sceneStatus === "APPROVED" ? "lockedVoice" : "secondaryButton compact"} onClick={() => productionAction("APPROVE_SCENE", scene.id)}>{scene.sceneStatus === "APPROVED" ? "✓ Approved" : working === scene.id ? "Approving…" : "Approve scene"}</button></footer></div>
      </article>)}</div>
    </section>
    <aside className="productionRail">
      <section className="workspacePanel"><div className="sideTitle"><p className="eyebrow">Media strategy</p><h3>Planned source mix</h3></div><div className="mediaMix">{Object.entries(mediaMix).map(([strategy, count]) => <div key={strategy}><span>{strategy.replaceAll("_", " ")}</span><strong>{count} scenes</strong></div>)}</div><p className="railNote">Stock and generated visuals remain marked “needs source” until a file and its usage rights are attached.</p></section>
      <section className="workspacePanel gateChecklist"><div className="sideTitle"><p className="eyebrow">Storyboard gate</p><h3>Human review</h3></div><ul><li className={production.gates.voice ? "done" : ""}>Approved voice locked</li><li className={production.gates.storyboardReady ? "done" : ""}>Visual intent complete</li><li className={approved === production.scenes.length ? "done" : ""}>All scene briefs approved</li><li className={production.gates.storyboardPassed ? "done" : ""}>Continuity gate recorded</li></ul><button disabled={approved !== production.scenes.length || production.gates.storyboardPassed || working === "PASS_STORYBOARD_GATE"} className={production.gates.storyboardPassed ? "lockedVoice" : "primaryButton"} onClick={() => productionAction("PASS_STORYBOARD_GATE")}>{production.gates.storyboardPassed ? "✓ Storyboard passed" : "Pass storyboard gate"}</button></section>
      <section className="workspacePanel exportPanel"><div className="sideTitle"><p className="eyebrow">Editor handoff</p><h3>Production package</h3></div><p>JSON includes scene timing, approved audio URLs, character timestamps, source queries and 4K/30fps handoff settings.</p><button disabled={working === "BUILD_EXPORT"} className="primaryButton" onClick={() => productionAction("BUILD_EXPORT")}>{working === "BUILD_EXPORT" ? "Building…" : "Build export package"}</button>{latestPackage && <a className="downloadPackage" href={`/api/projects/${projectId}/production?download=latest`}>↓ Download package v{latestPackage.version}</a>}<small>Final render stays blocked until every external asset license is verified.</small></section>
    </aside>
  </div>;
}

type MediaData = {
  scenes: Array<{ id: string; sceneNumber: number; startSeconds: number; endSeconds: number; beat: string; visualIntent: string; mediaStrategy: string; searchQuery: string; assetUrl: string | null; assetStatus: string; licenseStatus: string }>;
  assets: Array<{ id: string; sceneId: string; name: string; mimeType: string; sourceType: string; sourceUrl: string | null; storageKey: string | null; licenseType: string; licenseProof: string | null; rightsStatus: string; status: string; sizeBytes: number }>;
  runs: Array<{ id: string; version: number; status: string; assetCoverage: number; licenseCoverage: number; criticResults: string; createdAt: string }>;
  automation: { verificationMode: "AUTOPILOT" | "REVIEW"; minimumConfidence: number; autoBuildAssembly: boolean };
  gates: { voice: boolean; assetCoverage: number; rightsCoverage: number; assemblyReady: boolean };
};

type DiscoveryCandidate = { id: string; provider: string; category: "FREE" | "PAID" | "INTERNAL"; title: string; mediaType: "IMAGE" | "VIDEO" | "CATALOG"; thumbnailUrl: string | null; assetUrl: string | null; landingUrl: string; licenseType: string; licenseUrl: string | null; creator: string | null; sourceAssetId?: string; score: number };
type DiscoveryResult = { scene: { id: string; query: string }; providerStatus: Record<string, string>; candidates: DiscoveryCandidate[] };
type PreviewMedia = { title: string; url: string; mimeType: string; sourceType: string };
type RenderProgress = { status: "RUNNING" | "DONE" | "ERROR"; current: number; total: number; percent: number; label: string; message: string };

function MediaStudio({ projectId, setProjectNotice }: { projectId: string; setProjectNotice: (message: string) => void }) {
  const [media, setMedia] = useState<MediaData | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linkDrafts, setLinkDrafts] = useState<Record<string, string>>({});
  const [discoveries, setDiscoveries] = useState<Record<string, DiscoveryResult>>({});
  const [discoveryFilter, setDiscoveryFilter] = useState<Record<string, "ALL" | "FREE" | "PAID" | "INTERNAL">>({});
  const [previewMedia, setPreviewMedia] = useState<PreviewMedia | null>(null);
  const [renderProgress, setRenderProgress] = useState<RenderProgress | null>(null);

  const loadMedia = useCallback(async () => {
    setError(null);
    const response = await fetch(`/api/projects/${projectId}/media`, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("Media workspace could not be loaded");
    setMedia(await response.json() as MediaData);
  }, [projectId]);

  useEffect(() => {
    let active = true;
    fetch(`/api/projects/${projectId}/media`, { signal: AbortSignal.timeout(15000) })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Media workspace could not be loaded")))
      .then((payload: MediaData) => { if (active) setMedia(payload); })
      .catch((caught: Error) => { if (active) { setError(caught.message); setProjectNotice(caught.message); } });
    return () => { active = false; };
  }, [projectId, setProjectNotice]);

  async function mediaAction(action: "GENERATE_DIAGRAMS" | "GENERATE_MOTION_VISUALS" | "REGISTER_LINK" | "SELECT_DISCOVERY" | "SET_AUTOMATION_MODE" | "AUTO_SOURCE_ALL" | "VERIFY_RIGHTS" | "APPROVE_ASSET" | "BUILD_ASSEMBLY", input: { sceneId?: string; assetId?: string; sourceUrl?: string; candidate?: DiscoveryCandidate; verificationMode?: "AUTOPILOT" | "REVIEW" } = {}) {
    setWorking(input.assetId || input.sceneId || action);
    const labels = { GENERATE_DIAGRAMS: "Creating channel-owned diagrams…", GENERATE_MOTION_VISUALS: "Generating animated diagrams, charts and system maps…", REGISTER_LINK: "Registering media candidate…", SELECT_DISCOVERY: "Adding the selected candidate to rights review…", SET_AUTOMATION_MODE: "Updating the media verification policy…", AUTO_SOURCE_ALL: "Autopilot is searching, verifying and selecting media for every uncovered scene…", VERIFY_RIGHTS: "Recording human rights verification…", APPROVE_ASSET: "Approving asset for the timeline…", BUILD_ASSEMBLY: "Running assembly critics and building the timeline…" };
    setProjectNotice(labels[action]);
    try {
      const response = await fetch(`/api/projects/${projectId}/media`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...input, licenseType: action === "REGISTER_LINK" ? "SOURCE_LICENSE" : undefined, licenseProof: action === "VERIFY_RIGHTS" ? "Human verified source terms and intended YouTube use" : undefined }) });
      const payload = await response.json().catch(() => ({})) as { error?: string; decisions?: Array<{ status: string }>; exceptions?: number; assembly?: { version: number } | null };
      if (!response.ok) throw new Error(payload.error || "Media action stopped at its gate");
      await loadMedia();
      if (input.sceneId) setLinkDrafts((current) => ({ ...current, [input.sceneId!]: "" }));
      if (action === "AUTO_SOURCE_ALL") setProjectNotice(`Media Autopilot completed · ${(payload.decisions || []).filter((decision) => decision.status === "AUTO_APPROVED").length} scenes auto-approved${payload.exceptions ? ` · ${payload.exceptions} exception(s) need a safer source` : payload.assembly ? ` · assembly v${payload.assembly.version} built` : ""}`);
      else if (action === "BUILD_ASSEMBLY") setProjectNotice("Assembly gate passed · render package is ready");
      else setProjectNotice("Media workspace updated");
    } catch (caught) { setProjectNotice(caught instanceof Error && caught.message.includes("GATE_BLOCKED") ? "Assembly is blocked until every scene has one rights-verified asset" : caught instanceof Error ? caught.message : "Media action failed safely"); }
    finally { setWorking(null); }
  }

  async function searchAssets(sceneId: string) {
    setWorking(`discover:${sceneId}`); setProjectNotice("Searching free, paid and verified internal sources…");
    try {
      const response = await fetch(`/api/projects/${projectId}/media?discover=${encodeURIComponent(sceneId)}`, { signal: AbortSignal.timeout(15000) });
      const payload = await response.json().catch(() => ({})) as DiscoveryResult & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Asset search could not be completed");
      setDiscoveries((current) => ({ ...current, [sceneId]: payload }));
      setProjectNotice(`${payload.candidates.length} candidates found · rights verification remains required`);
    } catch (caught) { setProjectNotice(caught instanceof Error ? caught.message : "Asset search failed safely"); }
    finally { setWorking(null); }
  }

  async function uploadAsset(sceneId: string, file: File | undefined) {
    if (!file) return;
    setWorking(sceneId);
    setProjectNotice(`Uploading ${file.name} to protected media storage…`);
    try {
      const form = new FormData();
      form.set("sceneId", sceneId); form.set("file", file); form.set("licenseType", "OWNED_OR_LICENSED");
      const response = await fetch(`/api/projects/${projectId}/media`, { method: "POST", body: form });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Upload failed");
      await loadMedia(); setProjectNotice("Asset uploaded · verify usage rights before approval");
    } catch (caught) { setProjectNotice(caught instanceof Error ? caught.message : "Upload failed safely"); }
    finally { setWorking(null); }
  }

  async function renderMotionBlob(asset: MediaData["assets"][number], snapshot: MediaData, onProgress?: (percent: number) => void) {
    if (!("MediaRecorder" in window)) throw new Error("This browser cannot render WebM motion clips");
    const sourceUrl = asset.storageKey ? `/api/projects/${projectId}/media?asset=${encodeURIComponent(asset.id)}` : asset.sourceUrl;
    if (!sourceUrl) throw new Error("Motion source could not be loaded");
    const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("Motion source could not be loaded");
    const svgText = await response.text();
    const visibleSvg = svgText.includes("</style>") ? svgText.replace("</style>", `.node,.bar{opacity:1!important;transform:none!important}.flow,.chartLine{stroke-dashoffset:0!important}.packet{opacity:1!important;transform:none!important}</style>`) : svgText;
    const svgUrl = URL.createObjectURL(new Blob([visibleSvg], { type: "image/svg+xml" }));
    const image = new Image();
    try {
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Motion SVG could not be decoded")); image.src = svgUrl; });
      const canvas = document.createElement("canvas"); canvas.width = 1280; canvas.height = 720;
      const context = canvas.getContext("2d"); if (!context) throw new Error("Video canvas is unavailable");
      const stream = canvas.captureStream(30);
      const preferredTypes = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
      const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_500_000 }) : new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      const finished = new Promise<Blob>((resolve, reject) => { recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" })); recorder.onerror = () => reject(new Error("WebM encoder stopped unexpectedly")); });
      const scene = snapshot.scenes.find((item) => item.id === asset.sceneId);
      const durationMs = Math.round(Math.min(12, Math.max(5, (scene ? scene.endSeconds - scene.startSeconds : 6))) * 1000);
      const drawFrame = (elapsed: number) => {
        const loop = (elapsed % 4000) / 4000; const pulse = Math.sin(loop * Math.PI * 2); const scale = 1.012 + pulse * .006;
        const width = canvas.width * scale; const height = canvas.height * scale; const x = (canvas.width - width) / 2 + pulse * 3; const y = (canvas.height - height) / 2;
        context.fillStyle = "#102e29"; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, x, y, width, height);
        const scanX = Math.round(loop * (canvas.width + 180) - 90); const gradient = context.createLinearGradient(scanX - 90, 0, scanX + 90, 0);
        gradient.addColorStop(0, "rgba(139,213,181,0)"); gradient.addColorStop(.5, "rgba(139,213,181,.13)"); gradient.addColorStop(1, "rgba(139,213,181,0)"); context.fillStyle = gradient; context.fillRect(scanX - 90, 0, 180, canvas.height);
      };
      drawFrame(0);
      recorder.start(250);
      await new Promise<void>((resolve) => {
        const started = performance.now(); let lastReported = -5;
        const draw = (now: number) => { const elapsed = now - started; drawFrame(elapsed); const percent = Math.min(99, Math.round(elapsed / durationMs * 100)); if (percent >= lastReported + 5) { lastReported = percent; onProgress?.(percent); } if (elapsed < durationMs) requestAnimationFrame(draw); else resolve(); };
        requestAnimationFrame(draw);
      });
      recorder.stop(); stream.getTracks().forEach((track) => track.stop());
      const output = await finished; if (output.size < 1024) throw new Error("WebM encoder produced an empty clip"); onProgress?.(100); return output;
    } finally { URL.revokeObjectURL(svgUrl); }
  }

  async function uploadMotionRender(asset: MediaData["assets"][number], snapshot: MediaData, onProgress?: (percent: number, phase: "RENDER" | "UPLOAD") => void) {
    const blob = await renderMotionBlob(asset, snapshot, (percent) => onProgress?.(Math.round(percent * .8), "RENDER"));
    const name = `${asset.name.replace(/\.svg$/i, "").slice(0, 80)}.webm`;
    const uploadId = crypto.randomUUID(); const chunkSize = 512 * 1024; const chunkCount = Math.ceil(blob.size / chunkSize);
    for (let part = 0; part < chunkCount; part++) {
      const response = await fetch(`/api/projects/${projectId}/media?motionUpload=part&uploadId=${encodeURIComponent(uploadId)}&part=${part}`, { method: "POST", headers: { "content-type": "application/octet-stream" }, body: blob.slice(part * chunkSize, Math.min(blob.size, (part + 1) * chunkSize)) });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || `Upload part ${part + 1}/${chunkCount} failed`);
      onProgress?.(80 + Math.round((part + 1) / chunkCount * 18), "UPLOAD");
    }
    const response = await fetch(`/api/projects/${projectId}/media`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "FINALIZE_MOTION_UPLOAD", uploadId, chunkCount, sceneId: asset.sceneId, parentAssetId: asset.id, fileName: name, sizeBytes: blob.size }) });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) throw new Error(payload.error || "Rendered clip could not be saved");
    onProgress?.(100, "UPLOAD");
  }

  async function renderSingleMotion(asset: MediaData["assets"][number]) {
    if (!media) return; setWorking(`render:${asset.id}`); setProjectNotice(`Rendering ${asset.name} to a 30fps WebM clip…`);
    setRenderProgress({ status: "RUNNING", current: 1, total: 1, percent: 0, label: asset.name, message: "Preparing motion canvas" });
    try { await uploadMotionRender(asset, media, (percent, phase) => setRenderProgress({ status: "RUNNING", current: 1, total: 1, percent, label: asset.name, message: phase === "RENDER" ? "Capturing 30fps WebM" : "Uploading in safe-size parts" })); await loadMedia(); setRenderProgress({ status: "DONE", current: 1, total: 1, percent: 100, label: asset.name, message: "Clip stored and selected for the timeline" }); setProjectNotice("Motion clip rendered, stored and selected for the timeline"); }
    catch (caught) { const message = caught instanceof Error ? caught.message : "Motion render failed safely"; setRenderProgress({ status: "ERROR", current: 1, total: 1, percent: 0, label: asset.name, message }); setProjectNotice(message); }
    finally { setWorking(null); }
  }

  async function renderAllMotion() {
    if (!media) return;
    const sources = media.assets.filter((asset) => asset.sourceType.startsWith("ORIGINAL_MOTION_")).filter((asset, index, rows) => rows.findIndex((item) => item.sceneId === asset.sceneId) === index);
    if (!sources.length) { setProjectNotice("Generate motion visuals before rendering WebM clips"); return; }
    setWorking("RENDER_ALL_MOTION"); let completed = 0; const failures: string[] = [];
    for (const [index, asset] of sources.entries()) {
      setProjectNotice(`Rendering motion clip ${index + 1}/${sources.length} · ${asset.name}`);
      setRenderProgress({ status: "RUNNING", current: index + 1, total: sources.length, percent: 0, label: asset.name, message: "Preparing motion canvas" });
      try { await uploadMotionRender(asset, media, (percent, phase) => setRenderProgress({ status: "RUNNING", current: index + 1, total: sources.length, percent, label: asset.name, message: phase === "RENDER" ? "Capturing 30fps WebM" : "Uploading in safe-size parts" })); completed++; } catch (caught) { failures.push(`${asset.name}: ${caught instanceof Error ? caught.message : "Unknown render error"}`); }
    }
    await loadMedia(); setWorking(null); setRenderProgress({ status: failures.length ? "ERROR" : "DONE", current: sources.length, total: sources.length, percent: 100, label: `${completed} clips ready`, message: failures.length ? `${failures.length} failed · ${failures[0]}` : "All motion clips stored and selected" }); setProjectNotice(`Motion render completed · ${completed} clips ready${failures.length ? ` · ${failures.length} failed: ${failures[0]}` : ""}`);
  }

  if (error) return <section className="workspacePanel productionError"><span>!</span><h2>Media workspace could not load</h2><p>{error}</p><button className="primaryButton" onClick={() => loadMedia().catch((caught: Error) => setError(caught.message))}>Try again</button></section>;
  if (!media) return <section className="workspacePanel voiceLoading"><span>◌</span><p>Preparing media sourcing and assembly controls…</p></section>;
  const latestRun = media.runs[0];
  const approvedCount = media.scenes.filter((scene) => media.assets.some((asset) => asset.sceneId === scene.id && asset.status === "APPROVED" && asset.rightsStatus === "VERIFIED")).length;
  const assetUrl = (asset: MediaData["assets"][number]) => asset.storageKey ? `/api/projects/${projectId}/media?asset=${encodeURIComponent(asset.id)}` : asset.sourceUrl || "";
  const motionSources = media.assets.filter((asset) => asset.sourceType.startsWith("ORIGINAL_MOTION_")).filter((asset, index, rows) => rows.findIndex((item) => item.sceneId === asset.sceneId) === index);
  const renderedScenes = new Set(media.assets.filter((asset) => asset.sourceType === "MOTION_RENDER_WEBM" && asset.status === "APPROVED").map((asset) => asset.sceneId));
  const latestMotionIds = new Set(motionSources.map((asset) => asset.id));

  return <div className="mediaWorkspaceLayout">
    <section className="workspacePanel mediaMain">
      <div className="contentHeader"><div><p className="eyebrow">WS-07 · controlled media production</p><h2>Media sourcing & assembly</h2><p>Attach real files or source links, verify usage rights, then select exactly one approved visual for each scene.</p></div><span className={`providerState ${media.gates.assemblyReady ? "connected" : "waiting"}`}><i />{approvedCount}/8 scenes covered</span></div>
      <div className="mediaMetrics"><div><small>Approved coverage</small><strong>{media.gates.assetCoverage}%</strong></div><div><small>Candidate assets</small><strong>{media.assets.length}</strong></div><div><small>Voice locked</small><strong>{media.gates.voice ? "Yes" : "No"}</strong></div><div><small>Assembly versions</small><strong>{media.runs.length}</strong></div></div>
      <section className={`automationControl ${media.automation.verificationMode === "AUTOPILOT" ? "isAuto" : "isReview"}`}><div className="automationIntro"><span>MEDIA DECISION MODE</span><strong>{media.automation.verificationMode === "AUTOPILOT" ? "Autopilot · no human verification required" : "Review mode · human approval retained"}</strong><p>{media.automation.verificationMode === "AUTOPILOT" ? `Frameflow ranks visual fit, accepts only sources scoring at least ${media.automation.minimumConfidence}% rights confidence, records the evidence trail and excludes uncertain candidates.` : "Frameflow proposes ranked candidates; you verify rights and approve the final visual for each scene."}</p></div><div className="modeSelector"><button className={media.automation.verificationMode === "AUTOPILOT" ? "active" : ""} onClick={() => mediaAction("SET_AUTOMATION_MODE", { verificationMode: "AUTOPILOT" })}>Autopilot</button><button className={media.automation.verificationMode === "REVIEW" ? "active" : ""} onClick={() => mediaAction("SET_AUTOMATION_MODE", { verificationMode: "REVIEW" })}>Review mode</button></div>{media.automation.verificationMode === "AUTOPILOT" && <button className="autopilotRun" disabled={working === "AUTO_SOURCE_ALL"} onClick={() => mediaAction("AUTO_SOURCE_ALL")}>{working === "AUTO_SOURCE_ALL" ? "Evaluating every scene…" : media.gates.assemblyReady ? "Run Autopilot again" : "Run full media Autopilot"}</button>}</section>
      <div className="diagramAutomation motionAutomation"><div><span className="motionBadge">MOTION RENDER PIPELINE</span><strong>Generate motion visuals, then render editor-ready clips</strong><p>Frameflow creates looping 16:9 SVG motion, captures it at 30fps and stores a WebM clip in the internal media library. {renderedScenes.size}/{motionSources.length || 3} motion scenes rendered. Motion clips are silent until narration is added by Full Video Composer.</p></div><div className="motionControls"><button className="secondaryMotionButton" disabled={working === "GENERATE_MOTION_VISUALS" || working === "RENDER_ALL_MOTION"} onClick={() => mediaAction("GENERATE_MOTION_VISUALS")}>{working === "GENERATE_MOTION_VISUALS" ? "Generating…" : "1 · Generate motion"}</button><button className="primaryButton" disabled={!motionSources.length || working === "RENDER_ALL_MOTION"} onClick={renderAllMotion}>{working === "RENDER_ALL_MOTION" ? `Rendering ${renderProgress?.current || 1}/${renderProgress?.total || motionSources.length}…` : renderedScenes.size ? "2 · Re-render all WebM" : "2 · Render all WebM"}</button></div></div>
      {renderProgress && <section className={`renderProgressCard ${renderProgress.status.toLowerCase()}`} aria-live="polite"><div className="renderProgressHeader"><div><span>{renderProgress.status === "RUNNING" ? `RENDERING CLIP ${renderProgress.current}/${renderProgress.total}` : renderProgress.status}</span><strong>{renderProgress.label}</strong><p>{renderProgress.message}</p></div><b>{renderProgress.percent}%</b></div><div className="renderProgressTrack"><i style={{ width: `${renderProgress.percent}%` }} /></div>{renderProgress.status === "RUNNING" && <small>Keep this tab open while the browser captures the motion frames.</small>}</section>}
      <div className="mediaSceneList">{media.scenes.map((scene) => {
        const sceneAssets = media.assets.filter((asset) => asset.sceneId === scene.id);
        const selected = sceneAssets.find((asset) => asset.status === "APPROVED");
        return <article className={`mediaScene ${selected ? "covered" : ""}`} key={scene.id}>
          <header><span>{String(scene.sceneNumber).padStart(2, "0")}</span><div><strong>{scene.beat}</strong><p>{scene.visualIntent}</p></div><span className={`coverageTag ${selected ? "ready" : "missing"}`}>{selected ? "✓ Covered" : "Needs asset"}</span></header>
          <div className="mediaSceneBody"><div className="assetCandidates">
            {sceneAssets.length ? sceneAssets.map((asset) => <div className={`assetCandidate ${asset.status.toLowerCase()}`} key={asset.id}>
              <button className="assetPreview" aria-label={`Preview ${asset.name}`} disabled={!assetUrl(asset)} onClick={() => setPreviewMedia({ title: asset.name, url: assetUrl(asset), mimeType: asset.mimeType, sourceType: asset.sourceType })}>{asset.mimeType.startsWith("image/") && assetUrl(asset) ? <span className="assetImage" role="img" aria-label={`${asset.name} preview`} style={{ backgroundImage: `url(${assetUrl(asset)})` }} /> : <span>{asset.mimeType.startsWith("video/") ? "▶" : "↗"}</span>}<em>Preview</em></button>
              <div className="assetInfo"><strong>{asset.name}</strong><p>{asset.sourceType.replaceAll("_", " ")} · {asset.licenseType.replaceAll("_", " ")}</p><div><span className={`rights ${asset.rightsStatus.toLowerCase()}`}>{asset.rightsStatus.replaceAll("_", " ")}</span><span>{asset.status}</span></div></div>
              <div className="assetActions"><button disabled={!assetUrl(asset)} onClick={() => setPreviewMedia({ title: asset.name, url: assetUrl(asset), mimeType: asset.mimeType, sourceType: asset.sourceType })}>Preview</button>{asset.sourceType.startsWith("ORIGINAL_MOTION_") && latestMotionIds.has(asset.id) && <button className="renderAssetButton" disabled={working === `render:${asset.id}` || working === "RENDER_ALL_MOTION"} onClick={() => renderSingleMotion(asset)}>{working === `render:${asset.id}` ? "Rendering…" : renderedScenes.has(asset.sceneId) ? "Re-render WebM" : "Render WebM"}</button>}{asset.rightsStatus !== "VERIFIED" && <button disabled={working === asset.id} onClick={() => mediaAction("VERIFY_RIGHTS", { assetId: asset.id })}>Verify rights</button>}{asset.status !== "APPROVED" && asset.status !== "SUPERSEDED" && <button disabled={working === asset.id || asset.rightsStatus !== "VERIFIED"} onClick={() => mediaAction("APPROVE_ASSET", { assetId: asset.id })}>Approve</button>}</div>
            </div>) : <div className="noAsset"><span>＋</span><p>No candidate attached yet</p></div>}
          </div><aside className="sourceAssetControls"><small>{scene.mediaStrategy.replaceAll("_", " ")}</small><strong>{scene.searchQuery}</strong><button className="discoverButton" disabled={working === `discover:${scene.id}`} onClick={() => searchAssets(scene.id)}>{working === `discover:${scene.id}` ? "Searching sources…" : discoveries[scene.id] ? "Refresh candidates" : "Find media automatically"}</button><label className="uploadControl">Upload image/video<input type="file" accept="image/*,video/*" onChange={(event) => uploadAsset(scene.id, event.target.files?.[0])} /></label><div className="linkControl"><input type="url" placeholder="Paste licensed source URL" value={linkDrafts[scene.id] || ""} onChange={(event) => setLinkDrafts((current) => ({ ...current, [scene.id]: event.target.value }))}/><button disabled={!linkDrafts[scene.id] || working === scene.id} onClick={() => mediaAction("REGISTER_LINK", { sceneId: scene.id, sourceUrl: linkDrafts[scene.id] })}>Add link</button></div></aside></div>
          {discoveries[scene.id] && <section className="discoveryTray"><div className="discoveryHeader"><div><strong>Asset discovery</strong><span>{discoveries[scene.id].candidates.length} ranked candidates · {discoveries[scene.id].scene.query}</span></div><div className="discoveryFilters">{(["ALL", "FREE", "PAID", "INTERNAL"] as const).map((filter) => <button className={(discoveryFilter[scene.id] || "ALL") === filter ? "active" : ""} key={filter} onClick={() => setDiscoveryFilter((current) => ({ ...current, [scene.id]: filter }))}>{filter}</button>)}</div></div><div className="discoveryGrid">{discoveries[scene.id].candidates.filter((candidate) => (discoveryFilter[scene.id] || "ALL") === "ALL" || candidate.category === discoveryFilter[scene.id]).map((candidate) => <article className="discoveryCard" key={candidate.id}><div className="discoveryThumb">{candidate.thumbnailUrl ? <span style={{ backgroundImage: `url(${candidate.thumbnailUrl})` }} /> : <b>{candidate.mediaType === "CATALOG" ? "↗" : candidate.mediaType === "VIDEO" ? "▶" : "▧"}</b>}<em>{candidate.category}</em></div><div className="discoveryMeta"><small>{candidate.provider} · {candidate.mediaType}</small><strong title={candidate.title}>{candidate.title}</strong><p>{candidate.creator || "Catalog search"} · {candidate.licenseType.replaceAll("_", " ")}</p></div><div className="discoveryActions">{candidate.assetUrl && <button onClick={() => setPreviewMedia({ title: candidate.title, url: candidate.assetUrl!, mimeType: candidate.mediaType === "VIDEO" ? "video/external" : "image/external", sourceType: candidate.provider })}>Preview</button>}<a href={candidate.landingUrl} target="_blank" rel="noreferrer">View source</a>{candidate.category === "PAID" ? <span>Purchase, then upload</span> : <button disabled={working === scene.id} onClick={() => mediaAction("SELECT_DISCOVERY", { sceneId: scene.id, candidate })}>Select candidate</button>}</div></article>)}</div><p className="discoveryNotice">{media.automation.verificationMode === "AUTOPILOT" ? "Autopilot may select only candidates that pass its rights-confidence policy; uncertain results remain excluded." : "Search results are not automatic license approval. Verify the source terms and intended commercial YouTube use before approval."}</p></section>}
        </article>;
      })}</div>
    </section>
    <aside className="mediaRail">
      <section className="workspacePanel gateChecklist"><div className="sideTitle"><p className="eyebrow">Asset gate</p><h3>Render prerequisites</h3></div><ul><li className={media.gates.voice ? "done" : ""}>Approved narration locked</li><li className={media.gates.assetCoverage === 100 ? "done" : ""}>8/8 scenes have approved media</li><li className={media.gates.assemblyReady ? "done" : ""}>Selected assets rights-verified</li><li className={latestRun ? "done" : ""}>Assembly critics passed</li></ul><button disabled={!media.gates.assemblyReady || working === "BUILD_ASSEMBLY"} className={latestRun ? "lockedVoice" : "primaryButton"} onClick={() => mediaAction("BUILD_ASSEMBLY")}>{working === "BUILD_ASSEMBLY" ? "Reviewing…" : latestRun ? "Build next assembly version" : "Run assembly gate"}</button></section>
      <section className="workspacePanel sourcingPolicy"><div className="sideTitle"><p className="eyebrow">Rights policy</p><h3>Allowed sources</h3></div><ul><li><strong>Original</strong><span>Channel-owned diagrams and generated visuals</span></li><li><strong>Free stock</strong><span>Commercial-use terms recorded per asset</span></li><li><strong>Paid stock</strong><span>Subscription or receipt evidence retained</span></li><li><strong>External link</strong><span>Never approved until human verification</span></li></ul></section>
      <section className="workspacePanel assemblyPackage"><div className="sideTitle"><p className="eyebrow">Editor timeline</p><h3>Assembly package</h3></div>{latestRun ? <><div className="assemblyScore"><strong>{latestRun.assetCoverage}%</strong><span>coverage passed</span></div><a className="downloadPackage" href={`/api/projects/${projectId}/media?download=latest`}>↓ Download assembly v{latestRun.version}</a><p>Includes selected visuals, narration URLs, caption timings and four critic decisions.</p></> : <p>The package unlocks only after all eight scenes pass asset and rights gates.</p>}</section>
    </aside>
    {previewMedia && <div className="mediaPreviewOverlay" role="dialog" aria-modal="true" aria-label={`Preview ${previewMedia.title}`} onClick={() => setPreviewMedia(null)}><section className="mediaPreviewModal" onClick={(event) => event.stopPropagation()}><header><div><span>ASSET PREVIEW</span><strong>{previewMedia.title}</strong><p>{previewMedia.sourceType.replaceAll("_", " ")}</p></div><button aria-label="Close preview" onClick={() => setPreviewMedia(null)}>×</button></header><div className="mediaPreviewStage">{previewMedia.sourceType === "MOTION_RENDER_WEBM" && <span className="silentClipBadge">MOTION-ONLY · AUDIO ADDED IN FINAL COMPOSER</span>}{previewMedia.mimeType.startsWith("video/") ? <video src={previewMedia.url} controls autoPlay loop playsInline preload="auto" /> : previewMedia.mimeType === "image/svg+xml" || previewMedia.sourceType.includes("MOTION") ? <object data={previewMedia.url} type="image/svg+xml" aria-label={previewMedia.title} /> : <img src={previewMedia.url} alt={previewMedia.title} />}</div><footer><span>{previewMedia.sourceType === "MOTION_RENDER_WEBM" ? "This clip is intentionally silent · ElevenLabs narration is added in Full Video Composer" : previewMedia.sourceType.includes("MOTION") ? "Animation loops automatically · 16:9 editor-ready" : "Preview only · source rights policy still applies"}</span><a href={previewMedia.url} target="_blank" rel="noreferrer">Open full asset ↗</a></footer></section></div>}
  </div>;
}

type ComposerData = {
  scenes: Array<{ id: string; sceneNumber: number; startSeconds: number; endSeconds: number; beat: string; asset: null | { id: string; name: string; mimeType: string; sourceType: string; url: string; rightsStatus: string } }>;
  segments: Array<{ id: string; position: number; label: string; status: string; durationSeconds: number | null; audioKey: string | null; audioUrl: string }>;
  assemblies: Array<{ id: string; version: number; status: string }>;
  renders: Array<{ id: string; version: number; name: string; sizeBytes: number; durationSeconds: number; width: number; height: number; fps: number; status: string; videoUrl: string; downloadUrl: string; createdAt: string }>;
  gates: { voiceReady: boolean; mediaReady: boolean; rightsReady: boolean; motionReady: boolean; assemblyReady: boolean };
  totalDuration: number;
};

type ComposerProgress = { status: "IDLE" | "RUNNING" | "DONE" | "ERROR"; percent: number; phase: string; message: string };
type LoadedVisual = { kind: "image"; source: HTMLImageElement; objectUrl: string } | { kind: "video"; source: HTMLVideoElement; objectUrl: string };

function FinalComposer({ projectId, setProjectNotice }: { projectId: string; setProjectNotice: (message: string) => void }) {
  const [composer, setComposer] = useState<ComposerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ComposerProgress>({ status: "IDLE", percent: 0, phase: "READY", message: "Waiting for all production gates" });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const loadComposer = useCallback(async () => {
    const response = await fetch(`/api/projects/${projectId}/render`, { signal: AbortSignal.timeout(20000) });
    const payload = await response.json().catch(() => ({})) as ComposerData & { error?: string };
    if (!response.ok) throw new Error(payload.error || "Final composer could not be loaded");
    setComposer(payload); setError(null);
  }, [projectId]);

  useEffect(() => {
    let active = true;
    fetch(`/api/projects/${projectId}/render`, { signal: AbortSignal.timeout(20000) })
      .then(async (response) => { const payload = await response.json().catch(() => ({})) as ComposerData & { error?: string }; if (!response.ok) throw new Error(payload.error || "Final composer could not be loaded"); return payload; })
      .then((payload) => { if (active) { setComposer(payload); setError(null); } })
      .catch((caught: Error) => { if (active) { setError(caught.message); setProjectNotice(caught.message); } });
    return () => { active = false; };
  }, [projectId, setProjectNotice]);

  async function loadVisual(scene: ComposerData["scenes"][number]) {
    if (!scene.asset) throw new Error(`Scene ${scene.sceneNumber} has no approved visual`);
    const response = await fetch(scene.asset.url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Scene ${scene.sceneNumber} visual could not be loaded`);
    const blob = await response.blob(); const objectUrl = URL.createObjectURL(blob);
    if (scene.asset.mimeType.startsWith("video/") || blob.type.startsWith("video/")) {
      const video = document.createElement("video"); video.src = objectUrl; video.muted = true; video.loop = true; video.playsInline = true; video.preload = "auto";
      await new Promise<void>((resolve, reject) => { video.onloadeddata = () => resolve(); video.onerror = () => reject(new Error(`Scene ${scene.sceneNumber} video could not be decoded`)); });
      return { kind: "video" as const, source: video, objectUrl };
    }
    const image = new Image(); await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error(`Scene ${scene.sceneNumber} image could not be decoded`)); image.src = objectUrl; });
    return { kind: "image" as const, source: image, objectUrl };
  }

  function drawCover(context: CanvasRenderingContext2D, source: CanvasImageSource, sourceWidth: number, sourceHeight: number, scale = 1) {
    const canvas = context.canvas; const base = Math.max(canvas.width / sourceWidth, canvas.height / sourceHeight) * scale; const width = sourceWidth * base; const height = sourceHeight * base;
    context.drawImage(source, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  }

  async function renderFinalVideo() {
    if (!composer || progress.status === "RUNNING") return;
    const failedGates = Object.entries(composer.gates).filter(([, passed]) => !passed).map(([gate]) => gate.replace("Ready", ""));
    if (failedGates.length) { setProjectNotice(`Final render blocked: ${failedGates.join(", ")}`); return; }
    if (!("MediaRecorder" in window) || !("AudioContext" in window)) { setProjectNotice("This browser cannot compose the final WebM video"); return; }
    const canvas = canvasRef.current; const context = canvas?.getContext("2d"); if (!canvas || !context) return;
    setProgress({ status: "RUNNING", percent: 1, phase: "PRELOAD", message: "Loading approved visuals and narration" }); setProjectNotice("Full Video Composer is preparing the approved timeline…");
    const loadedVisuals = new Map<string, LoadedVisual>(); let audioContext: AudioContext | null = null;
    try {
      audioContext = new AudioContext(); await audioContext.resume();
      for (const [index, scene] of composer.scenes.entries()) { loadedVisuals.set(scene.id, await loadVisual(scene)); setProgress({ status: "RUNNING", percent: 2 + Math.round((index + 1) / composer.scenes.length * 8), phase: "PRELOAD", message: `Loaded scene ${index + 1}/${composer.scenes.length}` }); }
      const destination = audioContext.createMediaStreamDestination();
      const audioBuffers: AudioBuffer[] = [];
      for (const [index, segment] of composer.segments.entries()) {
        const response = await fetch(segment.audioUrl, { signal: AbortSignal.timeout(30000) }); if (!response.ok) throw new Error(`Narration segment ${index + 1} could not be loaded`);
        audioBuffers.push(await audioContext.decodeAudioData(await response.arrayBuffer()));
      }
      const canvasStream = canvas.captureStream(30); const combined = new MediaStream([...canvasStream.getVideoTracks(), ...destination.stream.getAudioTracks()]);
      const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type)) || "";
      const recorder = mimeType ? new MediaRecorder(combined, { mimeType, videoBitsPerSecond: 3_200_000, audioBitsPerSecond: 128_000 }) : new MediaRecorder(combined);
      const chunks: BlobPart[] = []; recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      const finished = new Promise<Blob>((resolve, reject) => { recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" })); recorder.onerror = () => reject(new Error("The browser encoder stopped unexpectedly")); });
      for (const visual of loadedVisuals.values()) if (visual.kind === "video") await visual.source.play().catch(() => undefined);
      const leadSeconds = .15; const renderSeconds = Math.max(composer.totalDuration, audioBuffers.reduce((sum, buffer) => sum + buffer.duration, 0) + leadSeconds); const totalMs = Math.max(1000, renderSeconds * 1000); let audioCursor = leadSeconds; const audioSources: AudioBufferSourceNode[] = [];
      for (const buffer of audioBuffers) { const source = audioContext.createBufferSource(); source.buffer = buffer; source.connect(destination); source.start(audioContext.currentTime + audioCursor); audioCursor += buffer.duration; audioSources.push(source); }
      recorder.start(500); const started = performance.now();
      await new Promise<void>((resolve) => {
        const draw = (now: number) => {
          const elapsed = Math.min(totalMs, now - started); const seconds = elapsed / 1000; const scene = composer.scenes.find((item) => seconds >= item.startSeconds && seconds < item.endSeconds) || composer.scenes[composer.scenes.length - 1]; const visual = loadedVisuals.get(scene.id);
          context.fillStyle = "#081d18"; context.fillRect(0, 0, canvas.width, canvas.height);
          if (visual?.kind === "video" && visual.source.videoWidth) drawCover(context, visual.source, visual.source.videoWidth, visual.source.videoHeight, 1.01);
          if (visual?.kind === "image" && visual.source.naturalWidth) { const sceneLength = Math.max(1, scene.endSeconds - scene.startSeconds); const local = Math.max(0, seconds - scene.startSeconds) / sceneLength; drawCover(context, visual.source, visual.source.naturalWidth, visual.source.naturalHeight, 1.02 + local * .035); }
          const shade = context.createLinearGradient(0, 0, 0, canvas.height); shade.addColorStop(0, "rgba(5,20,17,.04)"); shade.addColorStop(.72, "rgba(5,20,17,.06)"); shade.addColorStop(1, "rgba(5,20,17,.58)"); context.fillStyle = shade; context.fillRect(0, 0, canvas.width, canvas.height);
          context.fillStyle = "rgba(8,29,24,.78)"; context.fillRect(34, 646, 520, 42); context.fillStyle = "#8bd5b5"; context.font = "700 16px Arial"; context.fillText(`SCENE ${String(scene.sceneNumber).padStart(2, "0")}  ·  ${scene.beat.toUpperCase()}`, 52, 673);
          const percent = 10 + Math.round(elapsed / totalMs * 70); setProgress({ status: "RUNNING", percent, phase: "COMPOSING", message: `Scene ${scene.sceneNumber}/${composer.scenes.length} · ${formatTime(seconds)} / ${formatTime(composer.totalDuration)}` });
          if (elapsed < totalMs) requestAnimationFrame(draw); else resolve();
        }; requestAnimationFrame(draw);
      });
      audioSources.forEach((source) => { try { source.stop(); } catch { /* already ended */ } }); recorder.stop(); combined.getTracks().forEach((track) => track.stop()); const blob = await finished;
      if (blob.size < 1024) throw new Error("The browser produced an empty final video");
      const uploadId = crypto.randomUUID(); const chunkSize = 512 * 1024; const chunkCount = Math.ceil(blob.size / chunkSize);
      for (let part = 0; part < chunkCount; part++) {
        const response = await fetch(`/api/projects/${projectId}/render?upload=part&uploadId=${encodeURIComponent(uploadId)}&part=${part}`, { method: "POST", headers: { "content-type": "application/octet-stream" }, body: blob.slice(part * chunkSize, Math.min(blob.size, (part + 1) * chunkSize)) });
        const payload = await response.json().catch(() => ({})) as { error?: string }; if (!response.ok) throw new Error(payload.error || `Final upload part ${part + 1}/${chunkCount} failed`);
        setProgress({ status: "RUNNING", percent: 80 + Math.round((part + 1) / chunkCount * 18), phase: "UPLOADING", message: `Stored part ${part + 1}/${chunkCount}` });
      }
      const response = await fetch(`/api/projects/${projectId}/render`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "FINALIZE_VIDEO", uploadId, chunkCount, fileName: `${projectId}-final.webm`, sizeBytes: blob.size, durationSeconds: renderSeconds, width: canvas.width, height: canvas.height, fps: 30 }) });
      const payload = await response.json().catch(() => ({})) as { error?: string; version?: number }; if (!response.ok) throw new Error(payload.error || "Final video could not be stored");
      await loadComposer(); setProgress({ status: "DONE", percent: 100, phase: "READY", message: `Final video v${payload.version || ""} includes approved visuals and narration` }); setProjectNotice("Final video is ready for playback review and download");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Final composition failed safely"; setProgress({ status: "ERROR", percent: 0, phase: "STOPPED", message }); setProjectNotice(message);
    } finally {
      for (const visual of loadedVisuals.values()) { if (visual.kind === "video") visual.source.pause(); URL.revokeObjectURL(visual.objectUrl); }
      if (audioContext) await audioContext.close().catch(() => undefined);
    }
  }

  if (error) return <section className="workspacePanel productionError"><span>!</span><h2>Final composer could not load</h2><p>{error}</p><button className="primaryButton" onClick={() => loadComposer().catch((caught: Error) => setError(caught.message))}>Try again</button></section>;
  if (!composer) return <section className="workspacePanel voiceLoading"><span>◌</span><p>Preparing final video composer…</p></section>;
  const latest = composer.renders[0]; const allPassed = Object.values(composer.gates).every(Boolean);
  const gates = [{ key: "voiceReady", label: "Approved ElevenLabs narration" }, { key: "mediaReady", label: "8/8 scenes have selected visuals" }, { key: "rightsReady", label: "Usage rights verified" }, { key: "motionReady", label: "Motion scenes rendered to WebM" }, { key: "assemblyReady", label: "Assembly critics passed" }] as const;
  return <div className="composerLayout">
    <section className="workspacePanel composerMain">
      <div className="contentHeader"><div><p className="eyebrow">WS-08 · final video production</p><h2>Full Video Composer</h2><p>Combines approved visual scenes with the locked ElevenLabs narration, records a synchronized 720p/30fps master and stores it in the project.</p></div><span className={`providerState ${allPassed ? "connected" : "waiting"}`}><i />{allPassed ? "Ready to compose" : "Waiting at gate"}</span></div>
      <div className="composerMetrics"><div><small>Runtime</small><strong>{formatTime(composer.totalDuration)}</strong></div><div><small>Scenes</small><strong>{composer.scenes.length}</strong></div><div><small>Voice tracks</small><strong>{composer.segments.length}</strong></div><div><small>Final renders</small><strong>{composer.renders.length}</strong></div></div>
      <div className="composerStage"><canvas className={latest && progress.status !== "RUNNING" ? "composerCanvasHidden" : ""} ref={canvasRef} width="1280" height="720" aria-label="Final composition preview canvas" />{latest && progress.status !== "RUNNING" && <video key={latest.id} src={latest.videoUrl} controls preload="metadata" playsInline />}{!latest && progress.status !== "RUNNING" && <div className="composerPlaceholder"><span>▶</span><strong>Final master not rendered yet</strong><p>Pass all five gates, then keep this tab open during the real-time composition.</p></div>}</div>
      <section className={`composerProgress ${progress.status.toLowerCase()}`} aria-live="polite"><div><span>{progress.phase}</span><strong>{progress.message}</strong></div><b>{progress.percent}%</b><i><em style={{ width: `${progress.percent}%` }} /></i></section>
      <div className="composerTimeline">{composer.scenes.map((scene) => <article key={scene.id}><div><span>{String(scene.sceneNumber).padStart(2, "0")}</span><i /></div><strong>{scene.beat}</strong><p>{formatTime(scene.startSeconds)}–{formatTime(scene.endSeconds)} · {scene.asset?.sourceType.replaceAll("_", " ") || "No visual"}</p></article>)}</div>
    </section>
    <aside className="composerRail">
      <section className="workspacePanel gateChecklist"><div className="sideTitle"><p className="eyebrow">Final render gate</p><h3>Five production checks</h3></div><ul>{gates.map((gate) => <li key={gate.key} className={composer.gates[gate.key] ? "done" : ""}>{gate.label}</li>)}</ul><button className="primaryButton" disabled={!allPassed || progress.status === "RUNNING"} onClick={renderFinalVideo}>{progress.status === "RUNNING" ? `${progress.phase.toLowerCase()}…` : latest ? "Render new final version" : "Compose final video"}</button><small className="composerWarning">Composition runs in real time (~{Math.ceil(composer.totalDuration)} seconds). Keep this tab open.</small></section>
      <section className="workspacePanel finalMaster"><div className="sideTitle"><p className="eyebrow">Master output</p><h3>{latest ? `Final video v${latest.version}` : "Awaiting first render"}</h3></div>{latest ? <><div className="masterState"><span>✓</span><div><strong>Playback-ready WebM</strong><p>{latest.width}×{latest.height} · {latest.fps}fps · {(latest.sizeBytes / 1024 / 1024).toFixed(1)} MB</p></div></div><a className="downloadPackage" href={latest.downloadUrl}>↓ Download final video</a><p>Includes synchronized channel visuals and ElevenLabs narration. Review playback before publishing.</p></> : <p>The final master appears here after the five gates pass and composition completes.</p>}</section>
    </aside>
  </div>;
}

type ReferenceData = {
  provider: { mode: "YOUTUBE_DATA_API" | "CURATED_PUBLIC_METADATA"; liveMetrics: boolean };
  settings: { verificationMode: "AUTOPILOT" | "REVIEW"; minimumScore: number; market: string; language: string };
  references: Array<{ id: string; youtubeVideoId: string; url: string; title: string; channelName: string; referenceGroup: "PROVEN" | "RECENT" | "OUTLIER"; thumbnailUrl: string | null; publishedAt: string | null; durationSeconds: number; viewCount: number; likeCount: number; commentCount: number; referenceScore: number; status: "INCLUDED" | "EXCLUDED"; insight: { hook: string; angle: string; lesson: string; analysisScope: string; reusePolicy: string } }>;
  runs: Array<{ id: string; version: number; status: "PASSED" | "AWAITING_REVIEW" | "BLOCKED"; decision: "RECOMPOSE_REQUIRED" | "PACKAGE_ONLY" | "PASS_WITH_BACKLOG"; compositeScore: number; createdAt: string; gaps: Array<{ dimension: string; benchmark: string; current: string; score: number; severity: "PASS" | "WATCH" | "REVISE"; action: string }>; critics: Array<{ critic: string; score: number; decision: string; finding: string }>; recommendations: { doNow: string[]; titleDirections: string[]; thumbnailDirections: string[]; nextLoop: string[] } }>;
};

function ReferenceIntelligence({ projectId, setProjectNotice }: { projectId: string; setProjectNotice: (message: string) => void }) {
  const [data, setData] = useState<ReferenceData | null>(null); const [working, setWorking] = useState<string | null>(null); const [error, setError] = useState<string | null>(null);
  const loadReferences = useCallback(async () => { const response = await fetch(`/api/projects/${projectId}/references`, { signal: AbortSignal.timeout(20000) }); const payload = await response.json().catch(() => ({})) as ReferenceData & { error?: string }; if (!response.ok) throw new Error(payload.error || "Reference intelligence could not be loaded"); setData(payload); setError(null); }, [projectId]);
  useEffect(() => { let active = true; fetch(`/api/projects/${projectId}/references`, { signal: AbortSignal.timeout(20000) }).then(async (response) => { const payload = await response.json().catch(() => ({})) as ReferenceData & { error?: string }; if (!response.ok) throw new Error(payload.error || "Reference intelligence could not be loaded"); return payload; }).then((payload) => { if (active) { setData(payload); setError(null); } }).catch((caught: Error) => { if (active) { setError(caught.message); setProjectNotice(caught.message); } }); return () => { active = false; }; }, [projectId, setProjectNotice]);

  async function referenceAction(action: "DISCOVER_REFERENCES" | "RUN_BENCHMARK" | "SET_MODE" | "APPROVE_BENCHMARK" | "TOGGLE_REFERENCE", input: { verificationMode?: "AUTOPILOT" | "REVIEW"; referenceId?: string } = {}) {
    setWorking(input.referenceId || action); const labels = { DISCOVER_REFERENCES: "Finding and ranking English-US YouTube references…", RUN_BENCHMARK: "Comparing VID-001 against reference patterns with five critics…", SET_MODE: "Updating the reference verification policy…", APPROVE_BENCHMARK: "Recording human approval for the reference gate…", TOGGLE_REFERENCE: "Updating the benchmark set…" }; setProjectNotice(labels[action]);
    try { const response = await fetch(`/api/projects/${projectId}/references`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...input }) }); const payload = await response.json().catch(() => ({})) as { error?: string; count?: number; composite?: number; decision?: string; status?: string }; if (!response.ok) throw new Error(payload.error || "Reference action stopped safely"); await loadReferences(); if (action === "DISCOVER_REFERENCES") setProjectNotice(`${payload.count || 0} reference videos ranked · no source footage imported`); else if (action === "RUN_BENCHMARK") setProjectNotice(`Reference benchmark completed · ${payload.composite}/100 · ${(payload.decision || "").replaceAll("_", " ")} · Universal Quality Gate is next`); else if (action === "APPROVE_BENCHMARK") setProjectNotice("Reference gate approved · Universal Quality Gate unlocked"); else setProjectNotice("Reference intelligence updated"); }
    catch (caught) { setProjectNotice(caught instanceof Error ? caught.message : "Reference action failed safely"); } finally { setWorking(null); }
  }

  if (error) return <section className="workspacePanel productionError"><span>!</span><h2>Reference intelligence could not load</h2><p>{error}</p><button className="primaryButton" onClick={() => loadReferences().catch((caught: Error) => setError(caught.message))}>Try again</button></section>;
  if (!data) return <section className="workspacePanel voiceLoading"><span>◌</span><p>Preparing reference intelligence…</p></section>;
  const included = data.references.filter((reference) => reference.status === "INCLUDED"); const latest = data.runs[0]; const groups = { proven: included.filter((reference) => reference.referenceGroup === "PROVEN").length, recent: included.filter((reference) => reference.referenceGroup === "RECENT").length, outlier: included.filter((reference) => reference.referenceGroup === "OUTLIER").length };
  return <div className="referenceLayout">
    <section className="workspacePanel referenceMain">
      <div className="contentHeader"><div><p className="eyebrow">WS-09 · pre-publish learning gate</p><h2>Reference Intelligence</h2><p>Learn from high-value YouTube patterns without copying footage, transcripts, titles or thumbnail compositions.</p></div><span className={`providerState ${data.provider.liveMetrics ? "connected" : "waiting"}`}><i />{data.provider.liveMetrics ? "Live YouTube metrics" : "Curated public metadata"}</span></div>
      <section className={`automationControl ${data.settings.verificationMode === "AUTOPILOT" ? "isAuto" : "isReview"}`}><div className="automationIntro"><span>REFERENCE GATE MODE</span><strong>{data.settings.verificationMode === "AUTOPILOT" ? `Autopilot · pass at ${data.settings.minimumScore}+ with no critical production gap` : "Review mode · human approval required"}</strong><p>{data.settings.verificationMode === "AUTOPILOT" ? "Five independent critics can unlock packaging while retaining a complete evidence trail." : "The engine produces the same benchmark, but you decide whether it may unlock publishing work."}</p></div><div className="modeSelector"><button className={data.settings.verificationMode === "AUTOPILOT" ? "active" : ""} onClick={() => referenceAction("SET_MODE", { verificationMode: "AUTOPILOT" })}>Autopilot</button><button className={data.settings.verificationMode === "REVIEW" ? "active" : ""} onClick={() => referenceAction("SET_MODE", { verificationMode: "REVIEW" })}>Review mode</button></div></section>
      <div className="referenceMetrics"><div><small>Included references</small><strong>{included.length}</strong></div><div><small>Proven winners</small><strong>{groups.proven}</strong></div><div><small>Recent winners</small><strong>{groups.recent}</strong></div><div><small>Outlier angles</small><strong>{groups.outlier}</strong></div><div><small>Latest benchmark</small><strong>{latest ? `${latest.compositeScore}/100` : "—"}</strong></div></div>
      <div className="referenceActions"><button className="secondaryMotionButton" disabled={working === "DISCOVER_REFERENCES"} onClick={() => referenceAction("DISCOVER_REFERENCES")}>{working === "DISCOVER_REFERENCES" ? "Discovering…" : data.references.length ? "Refresh reference set" : "1 · Discover references"}</button><button className="primaryButton" disabled={!included.length || working === "RUN_BENCHMARK"} onClick={() => referenceAction("RUN_BENCHMARK")}>{working === "RUN_BENCHMARK" ? "Running five critics…" : latest ? "2 · Run new benchmark" : "2 · Benchmark VID-001"}</button></div>
      {!data.references.length ? <div className="referenceEmpty"><span>◎</span><strong>No reference set yet</strong><p>Discover a balanced set of proven, recent and adjacent videos for the current English-US topic.</p></div> : <div className="referenceGrid">{data.references.map((reference) => <article className={`referenceCard ${reference.status.toLowerCase()}`} key={reference.id}><a className="referenceThumb" href={reference.url} target="_blank" rel="noreferrer"><span style={{ backgroundImage: `url(${reference.thumbnailUrl || `https://i.ytimg.com/vi/${reference.youtubeVideoId}/hqdefault.jpg`})` }} /><em>{reference.referenceGroup}</em><b>{reference.referenceScore}</b></a><div className="referenceMeta"><small>{reference.channelName}</small><strong>{reference.title}</strong><p><b>{reference.insight.hook}</b> · {reference.insight.angle}</p><blockquote>{reference.insight.lesson}</blockquote></div><footer><span>{reference.viewCount ? `${reference.viewCount.toLocaleString("en-US")} views` : "Pattern benchmark"}</span><button disabled={working === reference.id} onClick={() => referenceAction("TOGGLE_REFERENCE", { referenceId: reference.id })}>{reference.status === "INCLUDED" ? "Exclude" : "Include"}</button></footer></article>)}</div>}
      {latest && <section className="benchmarkResults"><div className="benchmarkHeader"><div><span>BENCHMARK V{latest.version}</span><strong>{latest.decision.replaceAll("_", " ")}</strong><p>{latest.status.replaceAll("_", " ")} · {latest.compositeScore}/100 composite</p></div><b className={`benchmarkDecision ${latest.decision.toLowerCase()}`}>{latest.decision === "PACKAGE_ONLY" ? "Keep video · revise package" : latest.decision === "RECOMPOSE_REQUIRED" ? "Return to production" : "Proceed with backlog"}</b></div><div className="gapTable"><div className="gapTableHead"><span>Dimension</span><span>Current assessment</span><span>Score</span><span>Decision</span></div>{latest.gaps.map((gap) => <article key={gap.dimension}><div><strong>{gap.dimension}</strong><small>{gap.benchmark}</small></div><p>{gap.current}<em>{gap.action}</em></p><b>{gap.score}</b><span className={gap.severity.toLowerCase()}>{gap.severity}</span></article>)}</div></section>}
    </section>
    <aside className="referenceRail">
      <section className="workspacePanel referenceDecision"><div className="sideTitle"><p className="eyebrow">Reference gate</p><h3>{latest ? latest.decision.replaceAll("_", " ") : "Awaiting benchmark"}</h3></div>{latest ? <><div className="referenceScore"><strong>{latest.compositeScore}</strong><span>/100</span></div><ul>{latest.critics.map((critic) => <li key={critic.critic}><div><strong>{critic.critic}</strong><span className={critic.decision.toLowerCase()}>{critic.decision}</span></div><p>{critic.finding}</p></li>)}</ul>{data.settings.verificationMode === "REVIEW" && latest.status === "AWAITING_REVIEW" && <button className="primaryButton" disabled={working === "APPROVE_BENCHMARK" || latest.decision === "RECOMPOSE_REQUIRED"} onClick={() => referenceAction("APPROVE_BENCHMARK")}>Approve reference gate</button>}</> : <p>Run discovery and benchmarking to determine whether the final video should be recomposed or sent to packaging.</p>}</section>
      {latest && <section className="workspacePanel benchmarkNext"><div className="sideTitle"><p className="eyebrow">Recommended next move</p><h3>Do now</h3></div><ol>{latest.recommendations.doNow.map((item) => <li key={item}>{item}</li>)}</ol><h4>Title directions</h4>{latest.recommendations.titleDirections.map((title) => <p key={title}>{title}</p>)}</section>}
      <section className="workspacePanel originalityPolicy"><div className="sideTitle"><p className="eyebrow">Originality firewall</p><h3>Pattern learning only</h3></div><ul><li className="done">No YouTube footage imported</li><li className="done">No transcript remixing</li><li className="done">No title or thumbnail cloning</li><li className="done">References retained as an audit trail</li></ul><small>YouTube videos remain external research sources, never production assets.</small></section>
    </aside>
  </div>;
}

type OptimizationData = {
  settings: { mode: "AUTOPILOT" | "EXCEPTIONS" | "MANUAL"; maximumAttempts: number; minimumImprovement: number; maximumWaveStages: number; regressionTolerance: number };
  contracts: Array<{ key: string; order: number; label: string; objective: string; optimizeFor: string[]; inputs: string[]; deliverable: string; candidatePolicy: string; evaluators: string[]; hardGates: string[]; threshold: number; attemptLimit: number; invalidates: string[] }>;
  cycles: Array<{ id: string; version: number; status: string; activeStage: string; stages: Array<{ key: string; order: number; status: string; score: number | null; attempt: number; evidence: string }>; issues: Array<{ id: string; severity: "P0" | "P1" | "P2"; artifact: string; issue: string; evidence: string; rootCause: string; owner: string; acceptance: string; status: string; stageKey: string }>; learning: { qualityPrinciple: string; source: string; calibrationStatus: string } }>;
  runs: Array<{ id: string; cycleId: string; stageKey: string; attempt: number; status: string; score: number; threshold: number; contract: OptimizationData["contracts"][number]; candidates: Array<{ id: string; label: string; thesis: string; scores: Record<string, number>; risks: string[]; compositeScore: number; status: string }>; decision: { winnerId: string; winnerLabel: string; score: number; threshold: number; improvement: number; noProgress: boolean; outputType: string; rationale: string } }>;
  artifacts: Array<{ id: string; cycleId: string; stageKey: string; version: number; status: string; artifactType: string; title: string; wordCount: number; content: { depthGateVersion?: number; summary?: string; fields?: Array<{ label: string; value: string }>; researchQuestions?: string[]; sourceHierarchy?: string[]; sources?: Array<{ id: string; title: string; publisher: string; status: string; authority: string; freshness?: string; url?: string }>; claims?: Array<{ id: string; text: string; risk: string; status: string; sourceCount: number; scriptPolicy: string }>; uncertaintyLedger?: string[]; coverageMatrix?: Array<{ area: string; requiredClaims: string[]; status: string; risk: string }>; claimSourceMatrix?: Array<{ claimId: string; claim: string; sourceIds: string[]; evidenceType: string; status: string }>; claimBeatMap?: Array<{ beat: string; claimIds: string[]; purpose: string }>; contradictions?: Array<{ question: string; resolution: string; status: string; evidence: string[] }>; hardGateSummary?: { minimumSources: number; actualSources: number; minimumClaims: number; actualClaims: number; p0ClaimsMapped: number; coverageAreasPassed: number; coverageAreasTotal: number }; acts?: Array<{ act: string; time: string; purpose: string; beats: Array<{ time: string; name: string; change: string; retention: string; visual: string }> }>; targetRuntime?: string; estimatedRuntime?: string; sections?: Array<{ beat: string; text: string }>; claimSafety?: string[]; productionNotes?: string[] } }>;
  artifactQa: Array<{ id: string; artifactId: string; cycleId: string; stageKey: string; attempt: number; status: string; decision: string; score: number; threshold: number; rubric: Array<{ dimension: string; score: number; evidence: string }>; issues: string[]; regression: { status: string; evidence: string } }>;
};

function ContinuousOptimizationSystem({ projectId, setProjectNotice }: { projectId: string; setProjectNotice: (message: string) => void }) {
  const [data, setData] = useState<OptimizationData | null>(null); const [working, setWorking] = useState<string | null>(null); const [error, setError] = useState<string | null>(null);
  const loadOptimization = useCallback(async () => { const response = await fetch(`/api/projects/${projectId}/optimization`, { signal: AbortSignal.timeout(20000) }); const payload = await response.json().catch(() => ({})) as OptimizationData & { error?: string }; if (!response.ok) throw new Error(payload.error || "Continuous Quality system could not be loaded"); setData(payload); setError(null); }, [projectId]);
  useEffect(() => { let active = true; fetch(`/api/projects/${projectId}/optimization`, { signal: AbortSignal.timeout(20000) }).then(async (response) => { const payload = await response.json().catch(() => ({})) as OptimizationData & { error?: string }; if (!response.ok) throw new Error(payload.error || "Continuous Quality system could not be loaded"); return payload; }).then((payload) => { if (active) { setData(payload); setError(null); } }).catch((caught: Error) => { if (active) { setError(caught.message); setProjectNotice(caught.message); } }); return () => { active = false; }; }, [projectId, setProjectNotice]);

  async function optimizationAction(action: "START_CYCLE" | "RUN_STAGE" | "RUN_WAVE" | "RUN_ARTIFACT_LOOP" | "SET_MODE" | "APPROVE_HANDOFF", input: { mode?: "AUTOPILOT" | "EXCEPTIONS" | "MANUAL" } = {}) {
    setWorking(action); const labels = { START_CYCLE: "Opening a controlled rebuild cycle and invalidating weak downstream artifacts…", RUN_STAGE: "Running the active candidate tournament and independent micro-gates…", RUN_WAVE: "Autopilot is selecting one bounded champion work packet…", RUN_ARTIFACT_LOOP: "Materializing the champion, running micro-QA, checking regressions and freezing the verified artifact…", SET_MODE: "Updating optimization governance…", APPROVE_HANDOFF: "Approving the selected champion work packet…" }; setProjectNotice(labels[action]);
    try { const response = await fetch(`/api/projects/${projectId}/optimization`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...input }) }); const payload = await response.json().catch(() => ({})) as { error?: string; version?: number; stageLabel?: string; score?: number; threshold?: number; status?: string; winner?: string; count?: number; nextStage?: string }; if (!response.ok) throw new Error(payload.error || "Optimization action stopped safely"); await loadOptimization(); if (action === "START_CYCLE") setProjectNotice(`Optimized rebuild cycle v${payload.version} started · Creative Strategy is active`); else if (action === "RUN_STAGE") setProjectNotice(`${payload.stageLabel || "Stage"} tournament · ${payload.score}/${payload.threshold} · ${(payload.status || "").replaceAll("_", " ")}`); else if (action === "RUN_WAVE") setProjectNotice(`Champion work packet selected · ${payload.count || 0} tournament processed · artifact is still required`); else if (action === "RUN_ARTIFACT_LOOP") setProjectNotice(`Artifact loop completed · ${payload.score}/${payload.threshold} · ${(payload.status || "").replaceAll("_", " ")} · downstream ${payload.status === "FROZEN" ? "unlocked" : "remains locked"}`); else if (action === "APPROVE_HANDOFF") setProjectNotice("Champion work packet approved · artifact generation is now authorized"); else setProjectNotice("Optimization governance updated"); }
    catch (caught) { setProjectNotice(caught instanceof Error ? caught.message : "Optimization action failed safely"); } finally { setWorking(null); }
  }

  if (error) return <section className="workspacePanel productionError"><span>!</span><h2>Continuous Quality system could not load</h2><p>{error}</p><button className="primaryButton" onClick={() => loadOptimization().catch((caught: Error) => setError(caught.message))}>Try again</button></section>;
  if (!data) return <section className="workspacePanel voiceLoading"><span>◌</span><p>Loading the Continuous Quality operating system…</p></section>;
  const cycle = data.cycles[0]; const activeContract = data.contracts.find((contract) => contract.key === cycle?.activeStage); const cycleRuns = cycle ? data.runs.filter((run) => run.cycleId === cycle.id) : []; const latestRun = cycleRuns.find((run) => run.stageKey === cycle?.activeStage) || cycleRuns[0]; const cycleArtifacts = cycle ? data.artifacts.filter((artifact) => artifact.cycleId === cycle.id) : []; const activeArtifact = cycleArtifacts.find((artifact) => artifact.stageKey === cycle?.activeStage) || cycleArtifacts[0]; const activeQa = activeArtifact && !activeArtifact.status.startsWith("SUPERSEDED") ? data.artifactQa.find((qa) => qa.artifactId === activeArtifact.id) : undefined; const passed = cycle?.stages.filter((stage) => ["PASSED_REUSED", "FROZEN", "HANDOFF_READY"].includes(stage.status)).length || 0; const openP0 = cycle?.issues.filter((issue) => issue.severity === "P0" && !["RESOLVED"].includes(issue.status)).length || 0; const attempts = cycleRuns.reduce((sum, run) => sum + run.attempt, 0); const activeState = cycle?.stages.find((stage) => stage.key === cycle.activeStage); const canRunArtifact = ["WORK_PACKET_READY", "REPAIR_REQUIRED", "ARTIFACT_READY"].includes(activeState?.status || ""); const canRunTournament = ["READY", "ACTIVE"].includes(activeState?.status || "");

  return <div className="optimizationLayout">
    <section className="workspacePanel optimizationMain">
      <div className="contentHeader"><div><p className="eyebrow">CQOS · quality by design</p><h2>Continuous Quality & Optimization System</h2><p>Quality is designed into every decision, candidate and handoff—from channel thesis to post-release learning.</p></div><span className={`providerState ${cycle?.status === "ACTIVE" ? "connected" : "waiting"}`}><i />{cycle ? `Cycle v${cycle.version} · ${cycle.status.replaceAll("_", " ")}` : "No rebuild cycle"}</span></div>
      <section className="qualityByDesign"><div><span>OPERATING PRINCIPLE</span><strong>Generate alternatives → challenge → select → verify → freeze → hand off</strong><p>Final QA verifies the system. It is never allowed to compensate for shallow content, weak visuals or incomplete sound design.</p></div><b>15 controlled stages</b></section>
      <section className={`automationControl ${data.settings.mode === "AUTOPILOT" ? "isAuto" : "isReview"}`}><div className="automationIntro"><span>OPTIMIZATION GOVERNANCE</span><strong>{data.settings.mode === "AUTOPILOT" ? `Autopilot · maximum ${data.settings.maximumWaveStages} stages per wave` : data.settings.mode === "EXCEPTIONS" ? "Verify exceptions · stop only on low confidence or blockers" : "Manual · approve every champion handoff"}</strong><p>Maximum {data.settings.maximumAttempts} attempts per stage · minimum +{data.settings.minimumImprovement} improvement · regression tolerance {data.settings.regressionTolerance} points.</p></div><div className="modeSelector qualityModes"><button className={data.settings.mode === "AUTOPILOT" ? "active" : ""} onClick={() => optimizationAction("SET_MODE", { mode: "AUTOPILOT" })}>Autopilot</button><button className={data.settings.mode === "EXCEPTIONS" ? "active" : ""} onClick={() => optimizationAction("SET_MODE", { mode: "EXCEPTIONS" })}>Exceptions</button><button className={data.settings.mode === "MANUAL" ? "active" : ""} onClick={() => optimizationAction("SET_MODE", { mode: "MANUAL" })}>Manual</button></div></section>
      {!cycle ? <section className="optimizationStart"><span>↻</span><h3>Rebuild VID-001 with quality designed in</h3><p>Reuse the approved channel, audience and topic foundation. Invalidate everything from Creative Strategy downstream and create a traceable optimization cycle.</p><button className="primaryButton" disabled={working === "START_CYCLE"} onClick={() => optimizationAction("START_CYCLE")}>{working === "START_CYCLE" ? "Starting controlled rebuild…" : "Start optimized rebuild cycle"}</button></section> : <>
        <div className="optimizationMetrics"><div><small>Controlled stages</small><strong>{passed}<span>/15</span></strong></div><div><small>Active stage</small><strong>{String(activeContract?.order || 0).padStart(2, "0")}</strong></div><div><small>Open P0 issues</small><strong>{openP0}</strong></div><div><small>Attempts consumed</small><strong>{attempts}</strong></div><div><small>Quality debt</small><strong>{cycle.issues.filter((issue) => issue.status !== "RESOLVED").length}</strong></div></div>
        <section className="stageContractMap"><div className="optimizationSectionTitle"><div><small>DEPENDENCY-AWARE PIPELINE</small><h3>15 stage contracts</h3></div><span>Downstream work remains invalid until upstream evidence passes</span></div><div className="contractGrid">{cycle.stages.map((stage) => { const contract = data.contracts.find((item) => item.key === stage.key); return <article className={`${stage.status.toLowerCase()} ${stage.key === cycle.activeStage ? "current" : ""}`} key={stage.key}><header><span>{String(stage.order).padStart(2, "0")}</span><b>{stage.score ?? "—"}</b></header><strong>{contract?.label}</strong><p>{stage.evidence}</p><footer>{stage.status.replaceAll("_", " ")} · attempt {stage.attempt}</footer></article>; })}</div></section>
        {activeContract && <section className="activeContract"><div className="optimizationSectionTitle"><div><small>ACTIVE STAGE {String(activeContract.order).padStart(2, "0")}</small><h3>{activeContract.label}</h3></div><span>Exit threshold {activeContract.threshold}</span></div><div className="contractBody"><div className="contractObjective"><strong>{activeContract.objective}</strong><p><b>Deliverable</b>{activeContract.deliverable}</p><p><b>Candidate policy</b>{activeContract.candidatePolicy}</p><div>{activeContract.optimizeFor.map((item) => <span key={item}>{item}</span>)}</div></div><div className="contractChecks"><article><small>INPUT CONTRACT</small>{activeContract.inputs.map((item) => <p key={item}>✓ {item}</p>)}</article><article><small>INDEPENDENT EVALUATORS</small>{activeContract.evaluators.map((item) => <p key={item}>◎ {item}</p>)}</article><article><small>HARD GATES</small>{activeContract.hardGates.map((item) => <p key={item}>! {item}</p>)}</article></div></div><div className="optimizationActions"><p>{activeState?.evidence}</p><div>{data.settings.mode === "MANUAL" && activeState?.status === "AWAITING_APPROVAL" && <button className="secondaryMotionButton" disabled={working === "APPROVE_HANDOFF"} onClick={() => optimizationAction("APPROVE_HANDOFF")}>Approve work packet</button>}{canRunTournament && <button className="secondaryMotionButton" disabled={working === "RUN_STAGE"} onClick={() => optimizationAction("RUN_STAGE")}>{working === "RUN_STAGE" ? "Running tournament…" : "1 · Run candidate tournament"}</button>}{canRunTournament && data.settings.mode !== "MANUAL" && <button className="secondaryMotionButton" disabled={working === "RUN_WAVE"} onClick={() => optimizationAction("RUN_WAVE")}>{working === "RUN_WAVE" ? "Selecting champion…" : "Autopilot · select one work packet"}</button>}{canRunArtifact && <button className="primaryButton" disabled={working === "RUN_ARTIFACT_LOOP"} onClick={() => optimizationAction("RUN_ARTIFACT_LOOP")}>{working === "RUN_ARTIFACT_LOOP" ? "Building → micro-QA → freezing…" : "2 · Run artifact execution loop"}</button>}</div></div></section>}
        {activeArtifact && <section className="artifactExecution"><div className="optimizationSectionTitle"><div><small>REAL DELIVERABLE · {activeArtifact.artifactType.replaceAll("_", " ")}</small><h3>{activeArtifact.title}</h3></div><span>v{activeArtifact.version} · {activeArtifact.status.replaceAll("_", " ")}{activeArtifact.wordCount ? ` · ${activeArtifact.wordCount} words` : ""}</span></div>{activeArtifact.status.startsWith("SUPERSEDED") && <div className="depthGateBlocker"><span>FALSE-POSITIVE CORRECTED</span><strong>Research v1 is preserved for audit, but no longer unlocks Story Architecture.</strong><p>Four sources and four claims cannot prove full coverage for a 7–10 minute documentary. Run the artifact loop to generate Research Depth Pack v2.</p></div>}<div className="artifactPreview">
          {activeArtifact.content.fields && <div className="artifactFields">{activeArtifact.content.fields.map((field) => <article key={field.label}><small>{field.label}</small><p>{field.value}</p></article>)}</div>}
          {activeArtifact.content.researchQuestions && <><div className="artifactColumns"><article><small>RESEARCH QUESTIONS</small>{activeArtifact.content.researchQuestions.map((item) => <p key={item}>→ {item}</p>)}</article><article><small>UNCERTAINTY LEDGER</small>{activeArtifact.content.uncertaintyLedger?.map((item) => <p key={item}>! {item}</p>)}</article></div><div className="artifactEvidence"><span>{activeArtifact.content.sources?.length || 0} depth-pack sources</span><span>{activeArtifact.content.claims?.length || 0} controlled claims</span><span>{activeArtifact.content.claims?.filter((claim) => claim.scriptPolicy.startsWith("May")).length || 0} script-eligible</span>{activeArtifact.content.depthGateVersion === 2 && <span>Depth Gate v2</span>}</div>{activeArtifact.content.hardGateSummary && <div className="depthGateMetrics"><article><small>OFFICIAL SOURCES</small><strong>{activeArtifact.content.hardGateSummary.actualSources}<b>/{activeArtifact.content.hardGateSummary.minimumSources} min</b></strong></article><article><small>CONTROLLED CLAIMS</small><strong>{activeArtifact.content.hardGateSummary.actualClaims}<b>/{activeArtifact.content.hardGateSummary.minimumClaims} min</b></strong></article><article><small>P0 MAPPED</small><strong>{activeArtifact.content.hardGateSummary.p0ClaimsMapped}</strong></article><article><small>COVERAGE AREAS</small><strong>{activeArtifact.content.hardGateSummary.coverageAreasPassed}<b>/{activeArtifact.content.hardGateSummary.coverageAreasTotal}</b></strong></article></div>}{activeArtifact.content.sources && activeArtifact.content.depthGateVersion === 2 && <details className="sourceLibrary"><summary>Official source library · {activeArtifact.content.sources.length} records</summary><div>{activeArtifact.content.sources.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><span>{source.authority.replaceAll("_", " ")}</span><strong>{source.title}</strong><p>{source.publisher} · {source.freshness}</p></a>)}</div></details>}{activeArtifact.content.coverageMatrix && <section className="depthMatrix"><header><small>TOPIC COVERAGE MATRIX</small><strong>Every required mechanism must be covered</strong></header><div>{activeArtifact.content.coverageMatrix.map((area) => <article key={area.area}><span className={area.risk.toLowerCase()}>{area.risk}</span><strong>{area.area}</strong><p>{area.requiredClaims.length} linked claims</p><b>{area.status}</b></article>)}</div></section>}{activeArtifact.content.claimSourceMatrix && <details className="evidenceMatrix"><summary>Claim–source matrix · {activeArtifact.content.claimSourceMatrix.length} claims</summary>{activeArtifact.content.claimSourceMatrix.map((row) => <article key={row.claimId}><header><span>{row.claimId.split("-").slice(-1)[0]}</span><strong>{row.claim}</strong><b>{row.status}</b></header><p>{row.sourceIds.length} official sources · {row.evidenceType.replaceAll("_", " ")}</p></article>)}</details>}{activeArtifact.content.claimBeatMap && <section className="claimBeatMap"><header><small>CLAIM → STORY-BEAT MAP</small><strong>Evidence is assigned before outlining</strong></header><div>{activeArtifact.content.claimBeatMap.map((item) => <article key={item.beat}><strong>{item.beat}</strong><p>{item.purpose}</p><span>{item.claimIds.length} claims</span></article>)}</div></section>}{activeArtifact.content.contradictions && <section className="contradictionPanel"><header><small>ADVERSARIAL CONTRADICTION REVIEW</small><strong>{activeArtifact.content.contradictions.filter((item) => item.status === "RESOLVED").length}/{activeArtifact.content.contradictions.length} resolved</strong></header>{activeArtifact.content.contradictions.map((item) => <article key={item.question}><div><strong>{item.question}</strong><span>{item.status}</span></div><p>{item.resolution}</p></article>)}</section>}</>}
          {activeArtifact.content.acts && <div className="outlineActs">{activeArtifact.content.acts.map((act) => <article key={act.act}><header><div><small>{act.time}</small><strong>{act.act}</strong></div><p>{act.purpose}</p></header>{act.beats.map((beat) => <div key={`${act.act}-${beat.time}`}><b>{beat.time}</b><strong>{beat.name}</strong><p>{beat.change}<small>{beat.retention} · {beat.visual}</small></p></div>)}</article>)}</div>}
          {activeArtifact.content.sections && <div className="scriptArtifact"><header><div><small>LOCKED NARRATION</small><strong>{activeArtifact.content.estimatedRuntime}</strong></div><span>{activeArtifact.content.targetRuntime}</span></header>{activeArtifact.content.sections.map((section) => <article key={section.beat}><small>{section.beat}</small><p>{section.text}</p></article>)}</div>}
        </div>{activeQa && <div className="microQa"><header><div><small>MICRO-QA · ATTEMPT {activeQa.attempt}</small><strong>{activeQa.decision.replaceAll("_", " ")}</strong></div><b>{activeQa.score}<span>/{activeQa.threshold}</span></b></header><div>{activeQa.rubric.map((item) => <article key={item.dimension}><div><strong>{item.dimension}</strong><b>{item.score}</b></div><p>{item.evidence}</p></article>)}</div><footer><span>Regression check · {activeQa.regression.status}</span><p>{activeQa.regression.evidence}</p></footer></div>}</section>}
        {latestRun && <section className="tournamentResults"><div className="optimizationSectionTitle"><div><small>LATEST CANDIDATE TOURNAMENT</small><h3>{latestRun.contract.label}</h3></div><span>{latestRun.status.replaceAll("_", " ")} · {latestRun.score}/{latestRun.threshold}</span></div><div className="candidateTournament">{latestRun.candidates.map((candidate) => <article className={candidate.status.toLowerCase()} key={candidate.id}><header><span>{candidate.status}</span><b>{candidate.compositeScore}</b></header><strong>{candidate.label}</strong><p>{candidate.thesis}</p><div>{Object.entries(candidate.scores).map(([key, value]) => <small key={key}>{key}<b>{value}</b></small>)}</div><footer>{candidate.risks.map((risk) => <em key={risk}>! {risk}</em>)}</footer></article>)}</div><div className="tournamentDecision"><span>CHAMPION DECISION</span><strong>{latestRun.decision.winnerLabel}</strong><p>{latestRun.decision.rationale}</p><small>Improvement signal: +{latestRun.decision.improvement} · output: {latestRun.decision.outputType.replaceAll("_", " ")}</small></div></section>}
      </>}
    </section>
    <aside className="optimizationRail">
      <section className="workspacePanel issueLedger"><div className="sideTitle"><p className="eyebrow">Quality issue ledger</p><h3>{cycle ? `${cycle.issues.length} root-cause records` : "Awaiting cycle"}</h3></div>{cycle ? cycle.issues.map((issue) => <article key={issue.id}><header><span className={issue.severity.toLowerCase()}>{issue.severity}</span><b>{issue.status}</b></header><strong>{issue.artifact}</strong><p>{issue.issue}</p><details><summary>Evidence & acceptance</summary><small><b>Evidence</b>{issue.evidence}</small><small><b>Root cause</b>{issue.rootCause}</small><small><b>Owner</b>{issue.owner}</small><small><b>Acceptance</b>{issue.acceptance}</small></details></article>) : <p>Starting a rebuild creates traceable issues from the strict Quality Gate result.</p>}</section>
      <section className="workspacePanel loopGuard"><div className="sideTitle"><p className="eyebrow">Infinite-loop firewall</p><h3>Bounded optimization</h3></div><ul><li>Maximum {data.settings.maximumAttempts} attempts per stage</li><li>Stop below +{data.settings.minimumImprovement} improvement</li><li>Escalate repeated failure signatures</li><li>Block regression above {data.settings.regressionTolerance} points</li><li>Never lower a threshold to pass</li><li>Never overwrite frozen evidence</li></ul></section>
      <section className="workspacePanel qualityMemory"><div className="sideTitle"><p className="eyebrow">Optimization memory</p><h3>{cycle?.learning.calibrationStatus || "Not calibrated"}</h3></div><p>{cycle?.learning.qualityPrinciple || "Real release data will calibrate every upstream contract."}</p><small>{cycle ? `Source: ${cycle.learning.source}` : "Start a controlled cycle to create the first learning packet."}</small></section>
    </aside>
  </div>;
}

type QualityData = {
  adapters: Array<{ key: string; label: string; focus: string; criteria: string[] }>;
  settings: { verificationMode: "AUTOPILOT" | "EXCEPTIONS" | "MANUAL"; minimumScore: number; dimensionFloor: number; criticalFloor: number; formatAdapter: string; maximumRepairLoops: number };
  runs: Array<{
    id: string; version: number; loopNumber: number; status: string; decision: "BLOCKED_CRITICAL" | "RECOMPOSE" | "PACKAGE_REPAIR" | "REPAIR_REQUIRED" | "PASS"; compositeScore: number; coreScore: number; adapterScore: number; formatAdapter: string; createdAt: string;
    rubric: Array<{ name: string; weight: number; score: number; critical: boolean; status: "PASS" | "WATCH" | "REVISE"; evidence: string; action: string }>;
    hardGates: Array<{ name: string; category?: "COMPLIANCE" | "PRODUCTION" | "TECHNICAL" | "ORIGINALITY"; status: "PASS" | "FAIL" | "ACTION"; evidence: string; action: string }>;
    critics: Array<{ critic: string; score: number; decision: string; finding: string }>;
    repairPlan: Array<{ owner: string; type: "AUTO" | "PACKAGE" | "EXCEPTION"; priority: string; status: string; action: string }>;
  }>;
};

function UniversalQualityGate({ projectId, setProjectNotice }: { projectId: string; setProjectNotice: (message: string) => void }) {
  const [data, setData] = useState<QualityData | null>(null); const [working, setWorking] = useState<string | null>(null); const [error, setError] = useState<string | null>(null);
  const loadQuality = useCallback(async () => { const response = await fetch(`/api/projects/${projectId}/quality`, { signal: AbortSignal.timeout(20000) }); const payload = await response.json().catch(() => ({})) as QualityData & { error?: string }; if (!response.ok) throw new Error(payload.error || "Universal Quality Gate could not be loaded"); setData(payload); setError(null); }, [projectId]);
  useEffect(() => { let active = true; fetch(`/api/projects/${projectId}/quality`, { signal: AbortSignal.timeout(20000) }).then(async (response) => { const payload = await response.json().catch(() => ({})) as QualityData & { error?: string }; if (!response.ok) throw new Error(payload.error || "Universal Quality Gate could not be loaded"); return payload; }).then((payload) => { if (active) { setData(payload); setError(null); } }).catch((caught: Error) => { if (active) { setError(caught.message); setProjectNotice(caught.message); } }); return () => { active = false; }; }, [projectId, setProjectNotice]);

  async function qualityAction(action: "RUN_GATE" | "SET_MODE" | "SET_ADAPTER" | "ROUTE_REPAIRS" | "APPROVE_GATE", input: { verificationMode?: "AUTOPILOT" | "EXCEPTIONS" | "MANUAL"; formatAdapter?: string } = {}) {
    setWorking(action); const labels = { RUN_GATE: "Twelve quality dimensions and six hard gates are being evaluated…", SET_MODE: "Updating the quality governance policy…", SET_ADAPTER: "Loading the selected content-format adapter…", ROUTE_REPAIRS: "Routing approved repair tasks to the publishing workflow…", APPROVE_GATE: "Recording final quality approval…" }; setProjectNotice(labels[action]);
    try { const response = await fetch(`/api/projects/${projectId}/quality`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...input }) }); const payload = await response.json().catch(() => ({})) as { error?: string; composite?: number; decision?: string; status?: string }; if (!response.ok) throw new Error(payload.error || "Quality action stopped safely"); await loadQuality(); if (action === "RUN_GATE") setProjectNotice(`Universal Quality Gate completed · ${payload.composite}/100 · ${(payload.decision || "").replaceAll("_", " ")}`); else if (action === "ROUTE_REPAIRS") setProjectNotice("Quality repair plan routed · publishing work may continue under the gate"); else if (action === "APPROVE_GATE") setProjectNotice("Universal Quality Gate approved · final publishing package unlocked"); else setProjectNotice("Universal Quality Gate settings updated"); }
    catch (caught) { setProjectNotice(caught instanceof Error ? caught.message : "Quality action failed safely"); } finally { setWorking(null); }
  }

  if (error) return <section className="workspacePanel productionError"><span>!</span><h2>Universal Quality Gate could not load</h2><p>{error}</p><button className="primaryButton" onClick={() => loadQuality().catch((caught: Error) => setError(caught.message))}>Try again</button></section>;
  if (!data) return <section className="workspacePanel voiceLoading"><span>◌</span><p>Preparing the universal quality framework…</p></section>;
  const latest = data.runs[0]; const adapter = data.adapters.find((item) => item.key === data.settings.formatAdapter) || data.adapters[0]; const hardPasses = latest?.hardGates.filter((gate) => gate.status === "PASS").length || 0; const openRepairs = latest?.repairPlan.filter((item) => item.status !== "DONE").length || 0; const perceivedQuality = latest ? [latest.rubric[2], latest.rubric[4], latest.rubric[6], latest.rubric[7], latest.rubric[8]] : [];
  const decisionCopy = latest?.decision === "PACKAGE_REPAIR" ? "Keep master · repair package" : latest?.decision === "RECOMPOSE" ? "Return to production" : latest?.decision === "BLOCKED_CRITICAL" ? "Publication blocked" : latest?.decision === "PASS" ? "Ready for final package" : "Targeted repair required";

  return <div className="qualityLayout">
    <section className="workspacePanel qualityMain">
      <div className="contentHeader"><div><p className="eyebrow">WS-10 · universal pre-publish control</p><h2>Universal Quality Gate</h2><p>A standardized quality operating system: 80% universal core, 20% format adapter, with non-negotiable hard gates.</p></div><span className={`providerState ${latest?.status === "PASSED" ? "connected" : "waiting"}`}><i />{latest ? latest.status.replaceAll("_", " ") : "Awaiting first run"}</span></div>
      <section className={`automationControl ${data.settings.verificationMode === "AUTOPILOT" ? "isAuto" : "isReview"}`}><div className="automationIntro"><span>QUALITY GOVERNANCE MODE</span><strong>{data.settings.verificationMode === "AUTOPILOT" ? `Autopilot · publish target ${data.settings.minimumScore}+` : data.settings.verificationMode === "EXCEPTIONS" ? "Verify exceptions · human only for material deviations" : "Manual approval · every run awaits review"}</strong><p>Hard-gate failures always block progression. Scores can route repairs, but can never override factual, rights or master-file failures.</p></div><div className="modeSelector qualityModes"><button className={data.settings.verificationMode === "AUTOPILOT" ? "active" : ""} onClick={() => qualityAction("SET_MODE", { verificationMode: "AUTOPILOT" })}>Autopilot</button><button className={data.settings.verificationMode === "EXCEPTIONS" ? "active" : ""} onClick={() => qualityAction("SET_MODE", { verificationMode: "EXCEPTIONS" })}>Exceptions</button><button className={data.settings.verificationMode === "MANUAL" ? "active" : ""} onClick={() => qualityAction("SET_MODE", { verificationMode: "MANUAL" })}>Manual</button></div></section>
      <section className="adapterControl"><div><small>ACTIVE FORMAT ADAPTER</small><strong>{adapter.label}</strong><p>{adapter.focus}</p></div><select aria-label="Content format adapter" value={data.settings.formatAdapter} onChange={(event) => qualityAction("SET_ADAPTER", { formatAdapter: event.target.value })}>{data.adapters.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></section>
      <div className="qualityMetrics"><div><small>Composite</small><strong>{latest ? latest.compositeScore : "—"}<span>/100</span></strong></div><div><small>Universal core</small><strong>{latest ? latest.coreScore : "—"}<span>80%</span></strong></div><div><small>Format adapter</small><strong>{latest ? latest.adapterScore : "—"}<span>20%</span></strong></div><div><small>Hard gates passed</small><strong>{latest ? `${hardPasses}/${latest.hardGates.length}` : "—"}</strong></div><div><small>Open repairs</small><strong>{latest ? openRepairs : "—"}</strong></div></div>
      <div className="qualityActions"><p>Maximum {data.settings.maximumRepairLoops} critic–repair–rescore loops before escalation.</p><button className="primaryButton" disabled={working === "RUN_GATE"} onClick={() => qualityAction("RUN_GATE")}>{working === "RUN_GATE" ? "Running 12 dimensions…" : latest ? "Run next quality loop" : "Run Universal Quality Gate"}</button></div>
      {latest && <section className="perceivedQuality"><div><small>VIEWER-PERCEIVED QUALITY</small><h3>Completion ≠ quality</h3><p>A finished file only proves the workflow ran. These five execution signals decide whether the video can compete.</p></div><div className="perceivedGrid">{perceivedQuality.map((item) => <article key={item.name}><header><strong>{item.name}</strong><b className={item.status.toLowerCase()}>{item.score}</b></header><i><span style={{ width: `${item.score}%` }} /></i><p>{item.evidence}</p></article>)}</div></section>}
      {!latest ? <div className="referenceEmpty"><span>◈</span><strong>Quality baseline not scored</strong><p>Run the gate to evaluate the final master, research, narration, visuals, rights, packaging and channel value as one system.</p></div> : <>
        <section className={`qualityDecisionBanner ${latest.decision.toLowerCase()}`}><div><span>QUALITY RUN V{latest.version} · LOOP {latest.loopNumber}</span><strong>{decisionCopy}</strong><p>{latest.compositeScore}/100 composite · {latest.coreScore} core · {latest.adapterScore} adapter</p></div><b>{latest.decision.replaceAll("_", " ")}</b></section>
        <section className="hardGatePanel"><div className="qualitySectionTitle"><div><small>NON-NEGOTIABLE CONTROLS</small><h3>Hard gates</h3></div><span>{hardPasses}/{latest.hardGates.length} passed</span></div><div className="hardGateGrid">{latest.hardGates.map((gate) => <article className={gate.status.toLowerCase()} key={gate.name}><header><span>{gate.status === "PASS" ? "✓" : gate.status === "FAIL" ? "×" : "!"}</span><div><strong>{gate.name}</strong><small>{gate.category ? `${gate.category} · ` : ""}{gate.status}</small></div></header><p>{gate.evidence}</p><footer>{gate.action}</footer></article>)}</div></section>
        <section className="rubricPanel"><div className="qualitySectionTitle"><div><small>STANDARDIZED SCORECARD</small><h3>12-dimension rubric</h3></div><span>Weighted to 100</span></div><div className="rubricTable"><div className="rubricHead"><span>Dimension</span><span>Assessment & action</span><span>Weight</span><span>Score</span></div>{latest.rubric.map((item) => <article key={item.name}><div><strong>{item.name}{item.critical && <em>critical</em>}</strong><i><b style={{ width: `${item.score}%` }} /></i></div><p>{item.evidence}<small>{item.action}</small></p><span>{item.weight}%</span><b className={item.status.toLowerCase()}>{item.score}</b></article>)}</div></section>
      </>}
    </section>
    <aside className="qualityRail">
      <section className="workspacePanel qualityVerdict"><div className="sideTitle"><p className="eyebrow">Gate verdict</p><h3>{latest ? decisionCopy : "Awaiting score"}</h3></div>{latest ? <><div className="qualityScoreRing" style={{ "--quality-score": `${latest.compositeScore * 3.6}deg` } as CSSProperties}><div><strong>{latest.compositeScore}</strong><span>/100</span></div></div><p>Publish target {data.settings.minimumScore}+ · dimension floor {data.settings.dimensionFloor} · critical floor {data.settings.criticalFloor}.</p>{data.settings.verificationMode !== "AUTOPILOT" && latest.status.includes("REVIEW") && <button className="primaryButton" disabled={working === "APPROVE_GATE" || ["BLOCKED_CRITICAL", "RECOMPOSE"].includes(latest.decision)} onClick={() => qualityAction("APPROVE_GATE")}>Approve quality gate</button>}{latest.decision === "PACKAGE_REPAIR" && !["AUTO_ROUTED", "REPAIR_ROUTED"].includes(latest.status) && <button className="primaryButton" disabled={working === "ROUTE_REPAIRS"} onClick={() => qualityAction("ROUTE_REPAIRS")}>Route package repairs</button>}</> : <p>The verdict combines deterministic controls with independent specialist critics.</p>}</section>
      {latest && <section className="workspacePanel qualityCritics"><div className="sideTitle"><p className="eyebrow">Adversarial review</p><h3>Six independent critics</h3></div><ul>{latest.critics.map((critic) => <li key={critic.critic}><div><strong>{critic.critic}</strong><b>{critic.score}</b></div><span>{critic.decision.replaceAll("_", " ")}</span><p>{critic.finding}</p></li>)}</ul></section>}
      {latest && <section className="workspacePanel repairQueue"><div className="sideTitle"><p className="eyebrow">Repair loop</p><h3>Routed action queue</h3></div>{latest.repairPlan.map((item) => <article key={`${item.owner}-${item.action}`}><header><span className={item.type.toLowerCase()}>{item.type}</span><b>{item.priority}</b><em className={item.status.toLowerCase()}>{item.status}</em></header><strong>{item.owner}</strong><p>{item.action}</p></article>)}</section>}
      <section className="workspacePanel adapterCard"><div className="sideTitle"><p className="eyebrow">20% format intelligence</p><h3>{adapter.label}</h3></div><p>{adapter.focus}</p><ul>{adapter.criteria.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul></section>
    </aside>
  </div>;
}

function formatTime(value: number | null) {
  const seconds = Math.max(0, Math.round(value || 0));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
