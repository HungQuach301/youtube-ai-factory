"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Tab = "brief" | "evidence" | "script" | "critics" | "voice" | "production" | "history";
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
  { key: "voice", label: "Voice studio" },
  { key: "production", label: "Storyboard & export" },
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
  const currentStageIndex = data?.project.status === "PRODUCTION_PREP" ? 5 : data?.project.status === "STORYBOARDING" ? 3 : data?.project.status === "VOICE_PRODUCTION" ? 4 : data?.project.status === "SCRIPTING" ? 2 : data?.project.status === "RESEARCHING" ? 1 : 0;

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
          <div><small>Current gate</small><strong>{currentStageIndex >= 5 ? "Production asset readiness" : currentStageIndex >= 3 ? "Storyboard approval" : "Script quality review"}</strong></div>
          <div><small>Evidence coverage</small><strong>{supportedClaims}/{data.claims.length} claims passed</strong></div>
          <div><small>Latest version</small><strong>Script v{latest?.version || 1}</strong></div>
          <div><small>Next unlock</small><strong>{currentStageIndex >= 5 ? "Final video assembly" : currentStageIndex >= 3 ? "Editor export package" : "Storyboard generation"}</strong></div>
        </div>

        <nav className="projectTabs" aria-label="Project workspace sections">
          {tabs.map((item) => <button key={item.key} className={tab === item.key ? "active" : ""} onClick={() => setTab(item.key)}>{item.label}{item.key === "critics" && currentCritics.length > 0 && <span>{currentCritics.length}</span>}</button>)}
        </nav>

        <div className="projectContent">
          {tab === "brief" && <BriefView brief={data.brief} onContinue={() => setTab("evidence")} />}
          {tab === "evidence" && <EvidenceView sources={data.sources} claims={data.claims} />}
          {tab === "script" && <ScriptView latest={latest} sections={scriptSections} versions={data.scripts} onRun={() => runAction("RUN_CRITICS")} busy={busy} />}
          {tab === "critics" && <CriticsView critics={currentCritics} onRun={() => runAction("RUN_CRITICS")} onRevise={() => runAction("CREATE_REVISION")} busy={busy} />}
          {tab === "voice" && <VoiceStudio projectId={id} setProjectNotice={setNotice} />}
          {tab === "production" && <ProductionStudio projectId={id} setProjectNotice={setNotice} />}
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
    const payload = await response.json().catch(() => ({})) as ProductionData & { error?: string };
    if (!response.ok) throw new Error(payload.error || "Production workspace could not be loaded");
    setProduction(payload);
  }, [projectId]);

  useEffect(() => {
    let active = true;
    fetch(`/api/projects/${projectId}/production`, { signal: AbortSignal.timeout(15000) })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as ProductionData & { error?: string };
        if (!response.ok) throw new Error(payload.error || "Production workspace could not be loaded");
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

function formatTime(value: number | null) {
  const seconds = Math.max(0, Math.round(value || 0));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
