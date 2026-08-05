"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Tab = "brief" | "evidence" | "script" | "critics" | "voice" | "production" | "media" | "history";
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
  { key: "media", label: "Media & assembly" },
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
  const currentStageIndex = data?.project.status === "ASSEMBLY_READY" ? 5 : data?.project.status === "PRODUCTION_PREP" ? 5 : data?.project.status === "STORYBOARDING" ? 3 : data?.project.status === "VOICE_PRODUCTION" ? 4 : data?.project.status === "SCRIPTING" ? 2 : data?.project.status === "RESEARCHING" ? 1 : 0;

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
          {tab === "media" && <MediaStudio projectId={id} setProjectNotice={setNotice} />}
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

function formatTime(value: number | null) {
  const seconds = Math.max(0, Math.round(value || 0));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
