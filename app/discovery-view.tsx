"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DiscoveryProjection } from "./discovery-contract";
import { FactoryShell, ProjectionState, StatusPill } from "./factory-shell";

function field(item: Record<string, unknown>, key: string) { return String(item[key] ?? ""); }

export function DiscoveryView({ mode }: { mode: "intelligence" | "niches" }) {
  const params = useSearchParams();
  const requestedChannel = params.get("channel") || "";
  const [scope, setScope] = useState(requestedChannel);
  const [data, setData] = useState<DiscoveryProjection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [decisionAction, setDecisionAction] = useState<"ACCEPT" | "REJECT" | "REQUEST_MORE_EVIDENCE">("ACCEPT");
  const [rationale, setRationale] = useState("");
  const [assetType, setAssetType] = useState<"RULE" | "RUBRIC_ANCHOR" | "EXAMPLE" | "ANTI_PATTERN" | "EXCEPTION_PATTERN">("RUBRIC_ANCHOR");
  const [assetSummary, setAssetSummary] = useState("");
  const [decisionNotice, setDecisionNotice] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const idempotency = useRef<{ fingerprint: string; key: string } | null>(null);
  useEffect(() => {
    let active = true;
    fetch(`/api/factory/discovery${scope ? `?channel=${encodeURIComponent(scope)}` : ""}`, { cache: "no-store" }).then(async (response) => {
      const payload = await response.json() as DiscoveryProjection & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Discovery projection is unavailable");
      if (active) setData(payload);
    }).catch((reason) => active && setError(reason instanceof Error ? reason.message : "Discovery projection is unavailable"));
    return () => { active = false; };
  }, [scope, reload]);
  function changeScope(value: string) { setData(null); setError(null); setDecisionNotice(null); setDecisionError(null); setScope(value); }
  async function submitDecision(event: { preventDefault: () => void }) {
    event.preventDefault();
    const command = data?.workflow.decisionCommand;
    if (!command || submitting) return;
    setSubmitting(true); setDecisionError(null); setDecisionNotice(null);
    try {
      const commandBody = {
        channelId: scope, programId: command.programId, expectedAggregateVersion: command.expectedAggregateVersion,
        expectedDecisionVersion: command.expectedDecisionVersion, candidateId: command.candidateId,
        candidateVersion: command.candidateVersion, evidenceVersion: command.evidenceVersion,
        action: decisionAction, rationale, reusableAsset: { type: assetType, summary: assetSummary },
      };
      const fingerprint = JSON.stringify(commandBody);
      if (!idempotency.current || idempotency.current.fingerprint !== fingerprint) idempotency.current = { fingerprint, key: `niche-ui:${crypto.randomUUID()}` };
      const response = await fetch("/api/factory/niche-decisions", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": idempotency.current.key },
        body: fingerprint,
      });
      const payload = await response.json() as { outcome?: string; decision?: { version?: number }; error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || "The expert decision stopped safely");
      setDecisionNotice(`${payload.outcome === "IDEMPOTENT_REPLAY" ? "Decision replay verified" : "Decision recorded"} · version ${payload.decision?.version || command.expectedDecisionVersion + 1} · zero provider requests`);
      idempotency.current = null; setRationale(""); setAssetSummary(""); setReload((value) => value + 1);
    } catch (reason) {
      setDecisionError(reason instanceof Error ? reason.message : "The expert decision stopped safely");
    } finally { setSubmitting(false); }
  }
  const ready = useMemo(() => data?.niche.candidates.filter((item) => item.readiness === "EVIDENCE_READY_EXPERT_DECISION_REQUIRED").length || 0, [data]);
  return <FactoryShell active={mode === "intelligence" ? "intelligence" : "niches"}>
    <ProjectionState loading={!data && !error} error={error} data={data} label={mode === "intelligence" ? "market intelligence" : "niche candidates"} />
    {data && <>
      <header className="pfTop"><div><p>{mode === "intelligence" ? "MARKET · USER · COMPETITOR INTELLIGENCE" : "NICHE DISCOVERY · EXPERT GATE"}</p><h1>{mode === "intelligence" ? "Evidence before positioning." : "Rank broadly. Commit deliberately."}</h1><span>{mode === "intelligence" ? "Separate market demand, audience tension and competitor patterns before a niche is committed." : "Automation organizes and ranks evidence; the owner retains the irreversible niche decision."}</span></div><label className="pfSelect"><span>CHANNEL SCOPE</span><select value={scope} onChange={(event) => changeScope(event.target.value)}><option value="">Portfolio</option>{data.channels.map((channel) => <option value={channel.id} key={channel.id}>{channel.name}</option>)}</select></label></header>
      <section className="pfEvidenceBar"><div><small>ARTIFACTS</small><strong>{data.evidence.artifactCount}</strong></div><div><small>VERIFIED SOURCES</small><strong>{data.evidence.verifiedSources}</strong></div><div><small>PRIMARY SOURCES</small><strong>{data.evidence.primarySources}</strong></div><div><small>CLAIMS / P0</small><strong>{data.evidence.claims} / {data.evidence.p0Claims}</strong></div><StatusPill tone={data.integrity.state === "READY" ? "good" : "warn"}>{data.integrity.state}</StatusPill></section>
      {mode === "intelligence" ? <>
        <section className="pfHeroPanel"><small>MARKET THESIS</small><h2>{data.market.thesis || "No evidence-backed market thesis is available."}</h2><p>{data.market.targetMarket || "Unbound market"} · {data.market.targetLanguage || "Unbound language"}</p></section>
        <div className="pfThreeCol">
          <section className="pfSection"><header><div><p>MARKET</p><h2>Opportunity clusters</h2></div><span>{data.market.clusters.length}</span></header><div className="pfCompactList">{data.market.clusters.map((item, index) => <article key={field(item, "name") || index}><strong>{field(item, "name")}</strong><p>{field(item, "demandSignal")}</p><span>{field(item, "competitionGap")}</span></article>)}</div></section>
          <section className="pfSection"><header><div><p>USER</p><h2>Audience tensions</h2></div><span>{data.audience.segments.length}</span></header><div className="pfCompactList">{data.audience.segments.map((item, index) => <article key={field(item, "segment") || index}><strong>{field(item, "segment")}</strong><p>{field(item, "tension")}</p><span>{field(item, "desiredPayoff")}</span></article>)}</div></section>
          <section className="pfSection"><header><div><p>COMPETITOR</p><h2>Patterns and gaps</h2></div><span>{data.competitors.references.length} refs</span></header><div className="pfCompactList">{data.competitors.patterns.slice(0, 6).map((pattern) => <article key={pattern}><strong>{pattern}</strong></article>)}{data.competitors.gaps && <article className="accent"><small>GAP STATEMENT</small><p>{data.competitors.gaps}</p></article>}</div></section>
        </div>
      </> : <>
        <section className="pfDecisionBand"><div><small>CURRENT CHANNEL NICHE</small><strong>{data.niche.currentNiche || "No committed niche in this scope"}</strong><span>Existing channel state</span></div><div><small>RESEARCH CHAMPION</small><strong>{data.niche.researchChampion || "No champion artifact"}</strong><span>Recommendation only</span></div><div><small>READY FOR EXPERT DECISION</small><strong>{ready}</strong><span>No automatic commitment</span></div></section>
        <section className={`pfWorkflowGate ${data.workflow.result?.downstreamGate.state === "READY_FOR_TYPED_HANDOFF" ? "ready" : "blocked"}`}>
          <header><div><small>EXECUTABLE WORKFLOW · {data.workflow.contract}</small><h2>{data.workflow.result?.state.replaceAll("_", " ") || data.workflow.scopeState.replaceAll("_", " ")}</h2></div><StatusPill tone={data.workflow.result?.downstreamGate.state === "READY_FOR_TYPED_HANDOFF" ? "good" : "warn"}>{data.workflow.result?.downstreamGate.state.replaceAll("_", " ") || "NO HANDOFF"}</StatusPill></header>
          {data.workflow.result ? <><div className="pfWorkflowMetrics"><article><small>READINESS</small><strong>{data.workflow.result.readiness.replaceAll("_", " ")}</strong></article><article><small>POLICY</small><strong>{data.workflow.result.policyVersion}</strong></article><article><small>DECISION BINDING</small><strong>{data.workflow.decisionBinding.replaceAll("_", " ")}</strong></article><article><small>CHANNEL STRATEGY</small><strong>{data.workflow.result.downstreamGate.reason}</strong></article></div><footer><div><small>ALLOWED NEXT ACTIONS</small><span>{data.workflow.result.allowedNextActions.join(" · ")}</span></div><div><small>COMMAND AUTHORITY</small><span>Expert decision routed · SIWC + owner allowlist · zero provider requests · USD 0 · no automatic Channel Strategy activation</span></div></footer></> : <p>{data.workflow.blockers.join(" ")}</p>}
        </section>
        {data.workflow.decisionCommand && <section className="pfExpertDecision" aria-labelledby="expert-decision-title">
          <header><div><small>OWNER / EXPERT COMMAND · APPEND-ONLY</small><h2 id="expert-decision-title">Record a version-bound decision</h2><p>Decision v{data.workflow.decisionCommand.expectedDecisionVersion + 1} will bind only to the current champion and evidence. It will not change the channel niche or activate Channel Strategy.</p></div><StatusPill tone="good">ZERO SPEND</StatusPill></header>
          <form onSubmit={submitDecision}>
            <label><span>DECISION</span><select value={decisionAction} onChange={(event) => setDecisionAction(event.target.value as typeof decisionAction)}><option value="ACCEPT">Accept recommendation</option><option value="REJECT">Reject recommendation</option><option value="REQUEST_MORE_EVIDENCE">Request more evidence</option></select></label>
            <label className="wide"><span>RATIONALE · IMMUTABLE</span><textarea required minLength={40} maxLength={4000} value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="Explain the evidence, trade-off and expert judgment behind this decision." /></label>
            <label><span>REUSABLE KNOWLEDGE TYPE</span><select value={assetType} onChange={(event) => setAssetType(event.target.value as typeof assetType)}><option value="RUBRIC_ANCHOR">Rubric anchor</option><option value="RULE">Rule</option><option value="EXAMPLE">Example</option><option value="ANTI_PATTERN">Anti-pattern</option><option value="EXCEPTION_PATTERN">Exception pattern</option></select></label>
            <label className="wide"><span>REUSABLE KNOWLEDGE ASSET</span><textarea required minLength={20} maxLength={2000} value={assetSummary} onChange={(event) => setAssetSummary(event.target.value)} placeholder="Capture the generalizable lesson that future niche decisions can reuse." /></label>
            <div className="pfDecisionSubmit"><div><small>BOUND CONTEXT</small><span>aggregate {data.workflow.decisionCommand.expectedAggregateVersion} · candidate {data.workflow.decisionCommand.candidateVersion} · evidence {data.workflow.decisionCommand.evidenceVersion}</span></div><button type="submit" disabled={submitting || rationale.trim().length < 40 || assetSummary.trim().length < 20}>{submitting ? "Recording…" : "Record expert decision"}</button></div>
          </form>
          <div className="pfDecisionTruth" role="status" aria-live="polite">{decisionNotice && <strong>{decisionNotice}</strong>}{decisionError && <strong className="error">{decisionError}</strong>}<span>Identity-bound · idempotent · optimistic concurrency · immutable audit lineage</span></div>
        </section>}
        {data.niche.candidates.length ? <div className="pfCandidateGrid">{data.niche.candidates.map((candidate, index) => <article key={candidate.id} className={candidate.recommendationState === "RESEARCH_CHAMPION" ? "champion" : ""}><header><span>#{String(index + 1).padStart(2, "0")}</span><StatusPill tone={candidate.readiness.startsWith("EVIDENCE_READY") ? "good" : candidate.readiness === "REVIEW_REQUIRED" ? "warn" : "neutral"}>{candidate.readiness.replaceAll("_", " ")}</StatusPill></header><h2>{candidate.title}</h2><p>{candidate.viewerPromise}</p><div className="pfScores"><span><small>SCORE</small><b>{candidate.score}</b></span><span><small>NOVELTY</small><b>{candidate.novelty}</b></span><span><small>EVERGREEN</small><b>{candidate.evergreenFit}</b></span><span><small>VISUAL</small><b>{candidate.visualPotential}</b></span></div><footer><span>{candidate.recommendationState.replaceAll("_", " ")}</span><b>{data.workflow.result?.expertDecisionOutcome?.candidateId === candidate.id ? data.workflow.result.state.replaceAll("_", " ") : "Expert decision required"}</b></footer></article>)}</div> : <div className="pfEmpty"><h3>No evidence-backed candidates</h3><p>No synthetic candidate was generated. Complete the owning Intelligence evidence flow.</p></div>}
      </>}
    </>}
  </FactoryShell>;
}
