"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { ChannelStudioProjection, ContentBand } from "../channel-studio-contract";
import { FactoryShell, ProjectionState, StatusPill } from "../factory-shell";

const bands: ContentBand[] = ["OPPORTUNITY", "BACKLOG", "PLANNED", "PRODUCTION", "TERMINAL", "UNKNOWN"];

function Studio() {
  const params = useSearchParams();
  const [scope, setScope] = useState(params.get("channel") || "");
  const [data, setData] = useState<ChannelStudioProjection | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    fetch(`/api/factory/channel-studio${scope ? `?channel=${encodeURIComponent(scope)}` : ""}`, { cache: "no-store" }).then(async (response) => {
      const payload = await response.json() as ChannelStudioProjection & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Channel Studio projection is unavailable");
      if (active) setData(payload);
    }).catch((reason) => active && setError(reason instanceof Error ? reason.message : "Channel Studio projection is unavailable"));
    return () => { active = false; };
  }, [scope]);
  function changeScope(value: string) { setData(null); setError(null); setScope(value); }
  return <FactoryShell active="studio">
    <ProjectionState loading={!data && !error} error={error} data={data} label="Channel Studio" />
    {data && <>
      <header className="pfTop"><div><p>CHANNEL STUDIO · CONTENT PORTFOLIO</p><h1>Build a repeatable channel system.</h1><span>Connect niche intent, channel strategy, pillars, series, editorial queue and production intake without promoting compatibility data into approved commitments.</span></div><label className="pfSelect"><span>CHANNEL SCOPE</span><select value={scope} onChange={(event) => changeScope(event.target.value)}><option value="">Default portfolio channel</option>{data.channels.map((channel) => <option value={channel.id} key={channel.id}>{channel.name}</option>)}</select></label></header>
      {data.selectedChannel ? <>
        <section className="pfStudioIdentity"><span className="pfAvatar">{data.selectedChannel.name.slice(0, 2).toUpperCase()}</span><div><small>{data.selectedChannel.id}</small><h2>{data.selectedChannel.name}</h2><p>{data.selectedChannel.market} · {data.selectedChannel.language}</p></div><StatusPill tone={data.integrity.state === "READY" ? "good" : "warn"}>{data.integrity.state}</StatusPill></section>
        <section className="pfStrategyThread">
          <article><small>NICHE STATE</small><h3>{data.nicheDecision.currentNiche || "Unbound"}</h3><p>{data.nicheDecision.provenance.replaceAll("_", " ")}</p><span>{data.nicheDecision.decisionAuthority.replaceAll("_", " ")}</span></article>
          <article><small>CHANNEL STRATEGY</small><h3>{data.strategy.state.replaceAll("_", " ")}</h3><p>{data.strategy.viewerPromise || "No viewer promise is inferred."}</p><span>{data.strategy.state === "ACTIVE" ? `Version ${data.strategy.version} · ${data.strategy.owner}` : "Slice 8 activation required"}</span></article>
          <article><small>CONTENT SYSTEM</small><h3>{data.pillars.length} pillar label(s) · {data.legacyTopicCandidates.length} topic candidate(s)</h3><p>Series aggregate: {data.series.state.replaceAll("_", " ")}</p><span>Legacy content stays below niche strategy</span></article>
          <article><small>PRODUCTION HANDOFF</small><h3>{data.productionHandoff.state.replaceAll("_", " ")}</h3><p>{data.productionHandoff.eligibleCompatibilityItems} compatibility item(s) score-ready</p><span>No intake command is exposed</span></article>
        </section>
        <div className="pfTwoCol studio">
          <section className="pfSection"><header><div><p>CONTENT PORTFOLIO</p><h2>Lifecycle bands preserve raw state</h2></div><span>{data.portfolio.length} item(s)</span></header><div className="pfBandSummary">{bands.map((band) => <div key={band}><small>{band}</small><strong>{data.summary[band]}</strong></div>)}</div>
            {data.portfolio.length ? <div className="pfTable">{data.portfolio.map((item) => <Link href={`/projects/${encodeURIComponent(item.id)}`} key={item.id}><span><small>{item.id} · {item.pillar || "Unassigned"}</small><strong>{item.title}</strong><em>{item.nextAction}</em></span><span><StatusPill>{item.rawStatus}</StatusPill><b>{item.score}/100</b></span></Link>)}</div> : <div className="pfEmpty"><h3>No content bridge records</h3><p>No opportunity, plan or production item was synthesized.</p></div>}
            <header><div><p>LEGACY V1 · CONTENT PLANNING</p><h2>Video topic candidates</h2></div><span>{data.legacyTopicCandidates.length} preserved</span></header>
            {data.contentResearchChampion && <p><strong>Legacy topic champion:</strong> {data.contentResearchChampion.title}. This is content research, not a niche decision.</p>}
            {data.legacyTopicCandidates.length ? <div className="pfCompactList">{data.legacyTopicCandidates.map((item) => <article key={item.id}><small>{item.entityType.replaceAll("_", " ")} · {item.score}/100</small><strong>{item.title}</strong><p>{item.centralQuestion || item.viewerPromise || "No topic question recorded"}</p><span>{item.provenance.replaceAll("_", " ")}</span></article>)}</div> : <div className="pfEmpty"><h3>No legacy topic candidates</h3><p>No content topic was synthesized.</p></div>}
          </section>
          <aside className="pfStudioRail">
            <section className="pfSection"><header><div><p>PILLAR COMPATIBILITY</p><h2>Not approved identities</h2></div></header><div className="pfCompactList">{data.pillars.map((pillar) => <article key={pillar.label}><strong>{pillar.label}</strong><p>{pillar.itemCount} item(s)</p><span>{pillar.provenance.replaceAll("_", " ")}</span></article>)}</div></section>
            <section className="pfSection blocked"><header><div><p>HANDOFF BLOCKERS</p><h2>Production remains contained</h2></div></header><ul>{data.productionHandoff.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></section>
          </aside>
        </div>
      </> : <div className="pfEmpty"><h3>No canonical channels</h3><p>Channel Studio has no scope and generated no demonstration content.</p></div>}
    </>}
  </FactoryShell>;
}

export default function ChannelStudioPage() { return <Suspense fallback={<FactoryShell active="studio"><ProjectionState loading error={null} data={null} label="Channel Studio" /></FactoryShell>}><Studio /></Suspense>; }
