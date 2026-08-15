"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { NicheOpportunityProjection, NichePortfolioProjection, PortfolioAxis, PortfolioCondition } from "./niche-portfolio-contract";
import { FactoryShell, ProjectionState, StatusPill } from "./factory-shell";

type Filter = "ALL" | NicheOpportunityProjection["eligibility"];
type Sort = "SYSTEM_RANK" | "MARKET_ATTRACTIVENESS" | "ABILITY_TO_WIN" | "EVIDENCE_CONFIDENCE";

function axisLabel(axis: PortfolioAxis) { return axis.score === null ? "Not recorded" : `${axis.score}`; }
function axisTone(axis: PortfolioAxis) { return axis.state === "RECORDED" ? "recorded" : axis.state === "COMPATIBILITY_DERIVED" ? "derived" : "missing"; }
function statusTone(status: NicheOpportunityProjection["eligibility"]) { return status === "ELIGIBLE" ? "good" : status === "BLOCKED_BY_PREREQUISITE" ? "bad" : "warn"; }
function coverageTone(status: "RECORDED" | "PARTIAL" | "MISSING") { return status === "RECORDED" ? "good" : status === "PARTIAL" ? "warn" : "neutral"; }
function list(items: string[], empty: string) { return items.length ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="npMissing">{empty}</p>; }

function AxisCell({ axis, compact = false }: { axis: PortfolioAxis; compact?: boolean }) {
  return <div className={`npAxis ${axisTone(axis)} ${compact ? "compact" : ""}`} title={axis.basis}>
    <strong>{axisLabel(axis)}</strong><span>{axis.state.replaceAll("_", " ")}</span>
  </div>;
}

function ConditionList({ title, conditions }: { title: string; conditions: PortfolioCondition[] }) {
  return <section className="npConditions"><header><h4>{title}</h4><span>{conditions.length}</span></header>{conditions.length ? conditions.map((item) => <article key={item.id} className={item.status.toLowerCase()}><div><StatusPill tone={item.status === "PASS" ? "good" : item.status === "GAP" ? "bad" : "warn"}>{item.status}</StatusPill><strong>{item.label}</strong></div>{item.rationale && <p>{item.rationale}</p>}<dl><div><dt>Capability gap</dt><dd>{item.gap ?? "Not quantified"}</dd></div><div><dt>Closing action</dt><dd>{item.closingAction || "Not recorded"}</dd></div><div><dt>Proof method</dt><dd>{item.proofMethod || "Not recorded"}</dd></div></dl></article>) : <p className="npMissing">No canonical {title.toLowerCase()} has been recorded. The opportunity stays research-required.</p>}</section>;
}

function Dossier({ opportunity }: { opportunity: NicheOpportunityProjection }) {
  return <details className="npDossier">
    <summary>
      <span className="npDossierRank">#{String(opportunity.systemRank).padStart(2, "0")}</span>
      <span><small>{opportunity.channel.name} · {opportunity.origin.replaceAll("_", " ")}</small><strong>{opportunity.title}</strong><em>{opportunity.centralQuestion || opportunity.viewerPromise || "No decision question recorded"}</em></span>
      <StatusPill tone={statusTone(opportunity.eligibility)}>{opportunity.eligibility.replaceAll("_", " ")}</StatusPill>
      <b aria-hidden="true">+</b>
    </summary>
    <div className="npDossierBody">
      <section className="npAxisPanel" aria-label={`${opportunity.title} scorecard`}><div><small>MARKET ATTRACTIVENESS</small><AxisCell axis={opportunity.axes.marketAttractiveness} /></div><div><small>ABILITY TO WIN</small><AxisCell axis={opportunity.axes.abilityToWin} /></div><div><small>EVIDENCE CONFIDENCE</small><AxisCell axis={opportunity.axes.evidenceConfidence} /></div><div><small>EXPERT PRIORITY</small><strong>{opportunity.expertPriority ?? "Not set"}</strong><span>{opportunity.expertPriorityBasis.replaceAll("_", " ")}</span></div></section>
      <div className="npCoverage" aria-label="Dossier evidence coverage">{Object.entries(opportunity.coverage).map(([key, value]) => <span key={key}><StatusPill tone={coverageTone(value)}>{value}</StatusPill><b>{key.replace(/([A-Z])/g, " $1")}</b></span>)}</div>
      <div className="npDetailGrid">
        <section className="npDetail"><header><small>01 · MARKET POTENTIAL</small><h3>Why this market may matter</h3></header><h4>Demand signals</h4>{list(opportunity.marketPotential.demandSignals, "Demand signals not recorded in the canonical artifact.")}<h4>Growth signals</h4>{list(opportunity.marketPotential.growthSignals, "Growth signals not recorded.")}<h4>Monetization paths</h4>{list(opportunity.marketPotential.monetizationPaths, "Monetization paths not recorded.")}<h4>Saturation risks</h4>{list(opportunity.marketPotential.saturationRisks, "Saturation risks not recorded.")}</section>
        <section className="npDetail"><header><small>02 · AUDIENCE</small><h3>Who must choose this channel</h3></header>{opportunity.audiences.length ? opportunity.audiences.map((audience) => <article className="npAudience" key={audience.label}><strong>{audience.label}</strong><dl><div><dt>Characteristics</dt><dd>{audience.characteristics.join(" · ") || "Not recorded"}</dd></div><div><dt>Needs</dt><dd>{audience.needs.join(" · ") || "Not recorded"}</dd></div><div><dt>Preferences</dt><dd>{audience.preferences.join(" · ") || "Not recorded"}</dd></div><div><dt>Pains / tensions</dt><dd>{[...audience.pains, ...audience.tensions].join(" · ") || "Not recorded"}</dd></div><div><dt>Jobs to be done</dt><dd>{audience.jobsToBeDone.join(" · ") || "Not recorded"}</dd></div></dl></article>) : <p className="npMissing">No canonical audience profile is bound to this opportunity.</p>}</section>
        <section className="npDetail"><header><small>03 · COMPETITION</small><h3>Strength, defence and exploitable gaps</h3></header>{opportunity.competitors.length ? opportunity.competitors.map((competitor) => <article className="npCompetitor" key={competitor.name}><strong>{competitor.name}</strong><dl><div><dt>Strengths</dt><dd>{competitor.strengths.join(" · ") || "Not recorded"}</dd></div><div><dt>Weaknesses</dt><dd>{competitor.weaknesses.join(" · ") || "Not recorded"}</dd></div><div><dt>Defensibility</dt><dd>{competitor.defensibility.join(" · ") || "Not recorded"}</dd></div><div><dt>Content advantage</dt><dd>{competitor.contentAdvantages.join(" · ") || "Not recorded"}</dd></div><div><dt>Exploitable gaps</dt><dd>{competitor.exploitableGaps.join(" · ") || opportunity.competitorGap || "Not recorded"}</dd></div></dl></article>) : <p className="npMissing">No canonical competitor profile is bound to this opportunity.</p>}{opportunity.competitorPatterns.length > 0 && <><h4>Observed competitor patterns</h4>{list(opportunity.competitorPatterns, "")}</>}</section>
      </div>
      <div className="npWinGrid"><ConditionList title="Prerequisites" conditions={opportunity.prerequisites} /><ConditionList title="Winning criteria" conditions={opportunity.winningCriteria} /></div>
      <section className="npResearchTruth"><header><div><small>RESEARCH BALANCE</small><h3>{opportunity.researchPlan.balanced ? "Support, contradiction and unknown questions are present" : "Balanced validation is incomplete"}</h3></div><StatusPill tone={opportunity.researchPlan.balanced ? "good" : "warn"}>{opportunity.researchPlan.balanced ? "BALANCED" : "RESEARCH GAP"}</StatusPill></header><div><article><strong>Support</strong>{list(opportunity.researchPlan.supportingQuestions, "Not recorded")}</article><article><strong>Contradict</strong>{list(opportunity.researchPlan.contradictingQuestions, "Not recorded")}</article><article><strong>Unknown</strong>{list(opportunity.researchPlan.unknownQuestions, "Not recorded")}</article></div><footer><span>{opportunity.evidence.verifiedSources} verified · {opportunity.evidence.primarySources} primary · {opportunity.evidence.unresolvedP0Claims} unresolved P0</span><b>Next: {opportunity.allowedNextActions.join(" · ")}</b></footer></section>
    </div>
  </details>;
}

export function NichePortfolioView() {
  const params = useSearchParams();
  const [scope, setScope] = useState(params.get("channel") || "");
  const [data, setData] = useState<NichePortfolioProjection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [sort, setSort] = useState<Sort>("SYSTEM_RANK");
  useEffect(() => {
    let active = true;
    fetch(`/api/factory/niche-portfolio${scope ? `?channel=${encodeURIComponent(scope)}` : ""}`, { cache: "no-store" }).then(async (response) => {
      const payload = await response.json() as NichePortfolioProjection & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Niche portfolio projection is unavailable");
      if (active) setData(payload);
    }).catch((reason) => active && setError(reason instanceof Error ? reason.message : "Niche portfolio projection is unavailable"));
    return () => { active = false; };
  }, [scope]);
  function changeScope(value: string) { setData(null); setError(null); setScope(value); }
  const visible = useMemo(() => {
    const filtered = (data?.comparison || []).filter((item) => filter === "ALL" || item.eligibility === filter);
    return [...filtered].sort((a, b) => {
      if (sort === "MARKET_ATTRACTIVENESS") return (b.axes.marketAttractiveness.score ?? -1) - (a.axes.marketAttractiveness.score ?? -1);
      if (sort === "ABILITY_TO_WIN") return (b.axes.abilityToWin.score ?? -1) - (a.axes.abilityToWin.score ?? -1);
      if (sort === "EVIDENCE_CONFIDENCE") return (b.axes.evidenceConfidence.score ?? -1) - (a.axes.evidenceConfidence.score ?? -1);
      return a.channel.name.localeCompare(b.channel.name) || a.systemRank - b.systemRank;
    });
  }, [data, filter, sort]);

  return <FactoryShell active="niches">
    <ProjectionState loading={!data && !error} error={error} data={data} label="niche opportunity portfolio" />
    {data && <>
      <header className="pfTop npTop"><div><p>NICHE INTELLIGENCE · PORTFOLIO DECISION</p><h1>Compare opportunity. Prove the right to win.</h1><span>Review a portfolio of potential niches across market demand, audience needs, competitor strength, evidence confidence and the capabilities required to win. No ranking can commit a niche.</span></div><label className="pfSelect"><span>CHANNEL SCOPE</span><select value={scope} onChange={(event) => changeScope(event.target.value)}><option value="">All channels</option>{data.channels.map((channel) => <option value={channel.id} key={channel.id}>{channel.name}</option>)}</select></label></header>
      <section className="npAuthority"><div><small>{data.contract} · READ ONLY</small><strong>{data.decisionState.replaceAll("_", " ")}</strong><p>Canonical V1 evidence is projected into the V2 comparison shape. Missing V2 facts remain visibly missing; the bridge never converts a legacy total into a V2 axis.</p></div><div><StatusPill tone="good">ZERO SPEND</StatusPill><span>All V2 commands remain declared, not routed</span></div></section>
      <section className="npSummary" aria-label="Portfolio summary"><article><small>OPPORTUNITIES</small><strong>{data.summary.opportunities}</strong></article><article><small>COMPARABLE</small><strong>{data.summary.comparable}</strong></article><article><small>ELIGIBLE</small><strong>{data.summary.eligible}</strong></article><article><small>PREREQUISITE BLOCKED</small><strong>{data.summary.blockedByPrerequisite}</strong></article><article><small>RESEARCH REQUIRED</small><strong>{data.summary.researchRequired}</strong></article><article><small>EXPERT SEEDED</small><strong>{data.summary.expertSeeded}</strong></article></section>
      <section className="npControls" aria-label="Portfolio comparison controls"><div role="group" aria-label="Filter opportunities"><button className={filter === "ALL" ? "active" : ""} onClick={() => setFilter("ALL")}>All</button><button className={filter === "ELIGIBLE" ? "active" : ""} onClick={() => setFilter("ELIGIBLE")}>Eligible</button><button className={filter === "BLOCKED_BY_PREREQUISITE" ? "active" : ""} onClick={() => setFilter("BLOCKED_BY_PREREQUISITE")}>Prerequisite gaps</button><button className={filter === "RESEARCH_REQUIRED" ? "active" : ""} onClick={() => setFilter("RESEARCH_REQUIRED")}>Research required</button></div><label><span>SORT BY</span><select value={sort} onChange={(event) => setSort(event.target.value as Sort)}><option value="SYSTEM_RANK">System research rank</option><option value="MARKET_ATTRACTIVENESS">Market attractiveness</option><option value="ABILITY_TO_WIN">Ability to win</option><option value="EVIDENCE_CONFIDENCE">Evidence confidence</option></select></label></section>
      {visible.length ? <>
        <section className="npMatrix" aria-labelledby="portfolio-matrix-title"><header><div><small>SIDE-BY-SIDE DECISION FRAME</small><h2 id="portfolio-matrix-title">Opportunity comparison</h2></div><span>{visible.length} shown · no total score</span></header><div className="npTableScroll"><table><thead><tr><th scope="col">Opportunity</th><th scope="col">System rank</th><th scope="col">Expert priority</th><th scope="col">Market attractiveness</th><th scope="col">Ability to win</th><th scope="col">Evidence confidence</th><th scope="col">Prerequisites</th><th scope="col">Winning criteria</th></tr></thead><tbody>{visible.map((item) => <tr key={item.opportunityId}><th scope="row"><small>{item.channel.name}</small><strong>{item.title}</strong><StatusPill tone={statusTone(item.eligibility)}>{item.eligibility.replaceAll("_", " ")}</StatusPill></th><td><b>#{item.systemRank}</b><span>V1 research order</span></td><td><b>{item.expertPriority ?? "—"}</b><span>{item.expertPriority === null ? "Separate fact not set" : "Expert recorded"}</span></td><td><AxisCell axis={item.axes.marketAttractiveness} compact /></td><td><AxisCell axis={item.axes.abilityToWin} compact /></td><td><AxisCell axis={item.axes.evidenceConfidence} compact /></td><td><b>{item.prerequisites.length || "—"}</b><span>{item.prerequisites.some((condition) => condition.status !== "PASS") ? "Gap / unknown" : item.prerequisites.length ? "Passed" : "Not recorded"}</span></td><td><b>{item.winningCriteria.length || "—"}</b><span>{item.winningCriteria.length ? "Defined" : "Not recorded"}</span></td></tr>)}</tbody></table></div></section>
        <section className="npDossiers" aria-labelledby="dossiers-title"><header><div><small>MARKET · AUDIENCE · COMPETITOR · CONDITIONS TO WIN</small><h2 id="dossiers-title">Opportunity dossiers</h2></div><span>Expand any niche for evidence detail</span></header>{visible.map((item) => <Dossier key={item.opportunityId} opportunity={item} />)}</section>
      </> : <section className="pfEmpty"><h3>No opportunities match this view</h3><p>Change the filter. No synthetic opportunity has been inserted.</p></section>}
      <section className="npExpertSeed"><div><small>EXPERT SENSE · SLICE 3</small><h2>Bring a niche hypothesis. Keep the burden of proof.</h2><p>Expert-seeded hypotheses will enter the same support, contradiction and unknown-evidence workflow as system discoveries. Intake is intentionally not routed in this read-only slice.</p></div><StatusPill tone="warn">COMMAND NOT ROUTED</StatusPill></section>
      <section className="npDownstream"><strong>Channel Strategy remains blocked</strong><span>{data.downstreamGate.reason}</span></section>
    </>}
  </FactoryShell>;
}
