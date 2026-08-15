"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FactoryShell, ProjectionState, StatusPill } from "../../factory-shell";

type Detail = {
  channel: { id: string; name: string; market: string; language: string; niche: string };
  intelligence: { artifacts: number; sources: number; primarySources: number; claims: number; p0Claims: number; latestArtifacts: Array<Record<string, unknown>> };
  strategy: { state: string; program: { id: string; status: string; executionMode: string; qualityPolicy: string; productionAuthorized: boolean } | null };
  contentSystem: { state: string; videos: Array<{ id: string; title: string; pillar: string; status: string; score: number; progress: number; spentUsd: number; nextAction: string }> };
  production: { stages: Array<Record<string, unknown>>; evidenceCount: number; assetCount: number; quarantinedAssets: number };
  learning: { decisions: Array<Record<string, unknown>>; lineage: Array<Record<string, unknown>> };
  financial: { recordedCostUsd: number; measuredUsageUsd: number; billingState: string };
  integrity: { state: string; notes: string[] };
};

function value(item: Record<string, unknown>, key: string) { return String(item[key] ?? ""); }

export default function ChannelPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    let active = true;
    fetch(`/api/factory/channels/${encodeURIComponent(id)}`, { cache: "no-store" }).then(async (response) => {
      const payload = await response.json() as Detail & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Channel projection is unavailable");
      if (active) setData(payload);
    }).catch((reason) => active && setError(reason instanceof Error ? reason.message : "Channel projection is unavailable"));
    return () => { active = false; };
  }, [id]);
  return <FactoryShell active="portfolio">
    <ProjectionState loading={!data && !error} error={error} data={data} label="channel operating system" />
    {data && <>
      <header className="pfTop pfChannelTop"><div><Link className="pfBack" href="/">← Portfolio</Link><p>CHANNEL OPERATING SYSTEM · {data.channel.id}</p><h1>{data.channel.name}</h1><span>{data.channel.niche} · {data.channel.market} · {data.channel.language}</span></div><StatusPill tone={data.integrity.state === "READY" ? "good" : "warn"}>{data.integrity.state}</StatusPill></header>
      <section className="pfThread" aria-label="Channel operating thread">
        <article><span>01</span><small>INTELLIGENCE</small><strong>{data.intelligence.sources} sources</strong><p>{data.intelligence.claims} controlled claims · {data.intelligence.primarySources} primary</p><Link href={`/market-intelligence?channel=${encodeURIComponent(id)}`}>Inspect evidence →</Link></article>
        <article><span>02</span><small>STRATEGY FOUNDATION</small><strong>{data.strategy.state.replaceAll("_", " ")}</strong><p>{data.strategy.program?.status || "No mapped program"}</p><Link href={`/niche-discovery?channel=${encodeURIComponent(id)}`}>Inspect niche gate →</Link></article>
        <article><span>03</span><small>CONTENT SYSTEM</small><strong>{data.contentSystem.videos.length} bridge item(s)</strong><p>Canonical strategy/pillar identities pending</p><Link href={`/channel-studio?channel=${encodeURIComponent(id)}`}>Open Channel Studio →</Link></article>
        <article><span>04</span><small>PRODUCTION</small><strong>{data.production.stages.length} stage contract(s)</strong><p>{data.production.evidenceCount} evidence · {data.production.assetCount} assets</p><Link href="/control-plane">Open Video Engine →</Link></article>
        <article><span>05</span><small>LEARNING</small><strong>{data.learning.decisions.length} decision record(s)</strong><p>{data.learning.lineage.length} recent lineage records</p><Link href="/continuity">Inspect continuity →</Link></article>
      </section>
      <div className="pfTwoCol">
        <section className="pfSection"><header><div><p>CONTENT PORTFOLIO</p><h2>Read-only migration bridge</h2></div><StatusPill tone="warn">{data.contentSystem.state}</StatusPill></header>
          {data.contentSystem.videos.length ? <div className="pfTable">{data.contentSystem.videos.map((video) => <Link href={`/projects/${encodeURIComponent(video.id)}`} key={video.id}><span><small>{video.id} · {video.pillar}</small><strong>{video.title}</strong><em>{video.nextAction}</em></span><span><StatusPill>{video.status}</StatusPill><b>{video.progress}%</b></span></Link>)}</div> : <div className="pfEmpty"><h3>No linked video projects</h3><p>No compatibility item was created.</p></div>}
        </section>
        <aside className="pfSection"><header><div><p>PRODUCTION TRUTH</p><h2>Stage contracts</h2></div></header><div className="pfStageList">{data.production.stages.map((stage, index) => <article key={value(stage, "stage_key") || index}><span>{value(stage, "stage_key")}</span><div><strong>{value(stage, "stage_name")}</strong><p>{value(stage, "blocker") || value(stage, "evidence_summary")}</p></div><StatusPill tone={/FROZEN|PASS|COMPLETE/.test(value(stage, "status")) ? "good" : value(stage, "blocker") ? "bad" : "warn"}>{value(stage, "status")}</StatusPill></article>)}</div></aside>
      </div>
      <section className="pfFinance"><div><small>RECORDED COST</small><strong>${data.financial.recordedCostUsd.toFixed(4)}</strong></div><div><small>MEASURED USAGE</small><strong>${data.financial.measuredUsageUsd.toFixed(4)}</strong></div><p>{data.financial.billingState.replaceAll("_", " ")}</p></section>
    </>}
  </FactoryShell>;
}
