"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FactoryShell, ProjectionState, StatusPill } from "./factory-shell";

type Portfolio = {
  generatedAt: string;
  sourceState: string;
  summary: { channels: number; activeVideos: number; blockedStages: number; recordedCostUsd: number };
  channels: Array<{ id: string; name: string; market: string; language: string; niche: string; program: { id: string; status: string; productionAuthorized: boolean } | null; videos: { count: number; active: number; averageProgress: number }; operations: { stageCount: number; blockerCount: number; actualCostUsd: number; billingState: string }; integrity: string; nextAction: string }>;
  reconciliation: { orphanVideos: number; orphanPrograms: number };
  capabilities: Array<{ id: string; label: string; href: string; state: string }>;
};

export default function Home() {
  const [data, setData] = useState<Portfolio | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    fetch("/api/factory/portfolio", { cache: "no-store" }).then(async (response) => {
      const payload = await response.json() as Portfolio & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Portfolio projection is unavailable");
      if (active) setData(payload);
    }).catch((reason) => active && setError(reason instanceof Error ? reason.message : "Portfolio projection is unavailable"));
    return () => { active = false; };
  }, []);
  return <FactoryShell active="portfolio">
    <ProjectionState loading={!data && !error} error={error} data={data} label="factory portfolio" />
    {data && <>
      <header className="pfTop"><div><p>CANONICAL OPERATING PORTFOLIO</p><h1>Operate channels, not isolated videos.</h1><span>One evidence-linked view from market discovery through channel systems and controlled production.</span></div><StatusPill tone={data.reconciliation.orphanPrograms || data.reconciliation.orphanVideos ? "warn" : "good"}>{data.sourceState.replaceAll("_", " ")}</StatusPill></header>
      <section className="pfMetrics" aria-label="Portfolio metrics">
        <article><small>CHANNELS</small><strong>{data.summary.channels}</strong><span>canonical channel identities</span></article>
        <article><small>ACTIVE VIDEOS</small><strong>{data.summary.activeVideos}</strong><span>migration-bridge projects</span></article>
        <article><small>BLOCKED STAGES</small><strong>{data.summary.blockedStages}</strong><span>owned upstream, not deferred to QA</span></article>
        <article><small>RECORDED COST</small><strong>${data.summary.recordedCostUsd.toFixed(2)}</strong><span>not verified billing truth</span></article>
      </section>
      <section className="pfSection">
        <header><div><p>CHANNEL SYSTEMS</p><h2>Portfolio health and next valid action</h2></div><span>{data.channels.length} scope(s)</span></header>
        {data.channels.length ? <div className="pfChannelGrid">{data.channels.map((channel) => <Link href={`/channels/${encodeURIComponent(channel.id)}`} className="pfChannelCard" key={channel.id}>
          <div className="pfCardTop"><span className="pfAvatar">{channel.name.slice(0, 2).toUpperCase()}</span><StatusPill tone={channel.integrity === "READY" ? "good" : "warn"}>{channel.integrity}</StatusPill></div>
          <h3>{channel.name}</h3><p>{channel.niche}</p><div className="pfMeta"><span>{channel.market} · {channel.language}</span><span>{channel.videos.active}/{channel.videos.count} active</span></div>
          <div className="pfProgress" role="progressbar" aria-label={`${channel.name} average video progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={channel.videos.averageProgress}><i aria-hidden="true" style={{ width: `${channel.videos.averageProgress}%` }} /></div>
          <footer><span>{channel.program?.status || "NO PROGRAM MAPPING"}</span><b>Open channel →</b></footer>
        </Link>)}</div> : <div className="pfEmpty"><h3>No canonical channels</h3><p>The registry is empty. No sample channels were generated.</p></div>}
      </section>
      <section className="pfSection">
        <header><div><p>FACTORY CAPABILITIES</p><h2>Connected operating surfaces</h2></div></header>
        <div className="pfCapabilityGrid">{data.capabilities.map((item, index) => <Link href={item.href} key={item.id}><span>0{index + 1}</span><h3>{item.label}</h3><p>{item.state.replaceAll("_", " ")}</p><b>Enter capability →</b></Link>)}</div>
      </section>
      {(data.reconciliation.orphanVideos > 0 || data.reconciliation.orphanPrograms > 0) && <section className="pfIntegrity"><strong>Reconciliation required</strong><span>{data.reconciliation.orphanVideos} orphan video(s) · {data.reconciliation.orphanPrograms} orphan program(s)</span></section>}
    </>}
  </FactoryShell>;
}
