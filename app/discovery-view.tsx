"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { DiscoveryProjection } from "./discovery-contract";
import { FactoryShell, ProjectionState, StatusPill } from "./factory-shell";

function field(item: Record<string, unknown>, key: string) { return String(item[key] ?? ""); }

export function DiscoveryView({ mode }: { mode: "intelligence" | "niches" }) {
  const params = useSearchParams();
  const requestedChannel = params.get("channel") || "";
  const [scope, setScope] = useState(requestedChannel);
  const [data, setData] = useState<DiscoveryProjection | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    fetch(`/api/factory/discovery${scope ? `?channel=${encodeURIComponent(scope)}` : ""}`, { cache: "no-store" }).then(async (response) => {
      const payload = await response.json() as DiscoveryProjection & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Discovery projection is unavailable");
      if (active) setData(payload);
    }).catch((reason) => active && setError(reason instanceof Error ? reason.message : "Discovery projection is unavailable"));
    return () => { active = false; };
  }, [scope]);
  function changeScope(value: string) { setData(null); setError(null); setScope(value); }
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
        {data.niche.candidates.length ? <div className="pfCandidateGrid">{data.niche.candidates.map((candidate, index) => <article key={candidate.id} className={candidate.recommendationState === "RESEARCH_CHAMPION" ? "champion" : ""}><header><span>#{String(index + 1).padStart(2, "0")}</span><StatusPill tone={candidate.readiness.startsWith("EVIDENCE_READY") ? "good" : candidate.readiness === "REVIEW_REQUIRED" ? "warn" : "neutral"}>{candidate.readiness.replaceAll("_", " ")}</StatusPill></header><h2>{candidate.title}</h2><p>{candidate.viewerPromise}</p><div className="pfScores"><span><small>SCORE</small><b>{candidate.score}</b></span><span><small>NOVELTY</small><b>{candidate.novelty}</b></span><span><small>EVERGREEN</small><b>{candidate.evergreenFit}</b></span><span><small>VISUAL</small><b>{candidate.visualPotential}</b></span></div><footer><span>{candidate.recommendationState.replaceAll("_", " ")}</span><b>Expert decision required</b></footer></article>)}</div> : <div className="pfEmpty"><h3>No evidence-backed candidates</h3><p>No synthetic candidate was generated. Complete the owning Intelligence evidence flow.</p></div>}
      </>}
    </>}
  </FactoryShell>;
}
