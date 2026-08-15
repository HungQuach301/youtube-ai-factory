"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
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
      <span className="npDossierRank">{opportunity.systemRank === null ? "E" : `#${String(opportunity.systemRank).padStart(2, "0")}`}</span>
      <span><small>{opportunity.channel.name} · {opportunity.origin.replaceAll("_", " ")}</small><strong>{opportunity.title}</strong><em>{opportunity.centralQuestion || opportunity.viewerPromise || "No decision question recorded"}</em></span>
      <StatusPill tone={statusTone(opportunity.eligibility)}>{opportunity.eligibility.replaceAll("_", " ")}</StatusPill>
      <b aria-hidden="true">+</b>
    </summary>
    <div className="npDossierBody">
      <section className="npAxisPanel" aria-label={`${opportunity.title} scorecard`}><div><small>MARKET ATTRACTIVENESS</small><AxisCell axis={opportunity.axes.marketAttractiveness} /></div><div><small>ABILITY TO WIN</small><AxisCell axis={opportunity.axes.abilityToWin} /></div><div><small>EVIDENCE CONFIDENCE</small><AxisCell axis={opportunity.axes.evidenceConfidence} /></div><div><small>EXPERT PRIORITY</small><strong>{opportunity.expertPriority ?? "Not set"}</strong><span>{opportunity.expertPriorityBasis.replaceAll("_", " ")}</span></div></section>
      {opportunity.origin === "EXPERT_SEEDED" && <section className="npAssumptions"><header><div><small>EXPERT INPUT · NOT EVIDENCE</small><h3>Hypothesis and assumptions to validate</h3></div><StatusPill tone="warn">UNRANKED</StatusPill></header><p><strong>Rationale:</strong> {opportunity.hypothesis.rationale || "Not recorded"}</p><p><strong>Winning thesis:</strong> {opportunity.hypothesis.winningThesis || "Not recorded"}</p><div><article><strong>Audience assumptions</strong>{list(opportunity.hypothesis.audienceAssumptions, "Not recorded")}</article><article><strong>Demand assumptions</strong>{list(opportunity.hypothesis.demandAssumptions, "Not recorded")}</article><article><strong>Known competitors</strong>{list(opportunity.hypothesis.knownCompetitors, "Not recorded")}</article></div><footer>Submitted by {opportunity.hypothesis.submittedBy || "authorized expert"} · version {opportunity.hypothesis.version ?? "—"}. These statements do not populate evidence fields.</footer></section>}
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

function lines(value: string) { return value.split("\n").map((item) => item.trim()).filter(Boolean); }

function HypothesisIntake({ data, onRecorded }: { data: NichePortfolioProjection; onRecorded: () => void }) {
  const [channelId, setChannelId] = useState(data.intakeContexts[0]?.channelId || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rationale, setRationale] = useState("");
  const [audience, setAudience] = useState("");
  const [demand, setDemand] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [winningThesis, setWinningThesis] = useState("");
  const [status, setStatus] = useState<"IDLE" | "SUBMITTING" | "RECORDED" | "ERROR">("IDLE");
  const [message, setMessage] = useState("");
  const context = data.intakeContexts.find((item) => item.channelId === channelId) || data.intakeContexts[0];
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!context) return;
    setStatus("SUBMITTING"); setMessage("");
    try {
      const response = await fetch("/api/factory/niche-hypotheses", {
        method: "POST", headers: { "content-type": "application/json", "idempotency-key": `niche-hypothesis:${crypto.randomUUID()}` },
        body: JSON.stringify({ channelId: context.channelId, programId: context.programId, expectedAggregateVersion: context.aggregateVersion, expectedHypothesisVersion: context.expectedHypothesisVersion, title, description, rationale, audienceAssumptions: lines(audience), demandAssumptions: lines(demand), knownCompetitors: lines(competitors), winningThesis }),
      });
      const payload = await response.json() as { hypothesis?: { title: string }; error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || "The hypothesis could not be recorded");
      setStatus("RECORDED"); setMessage(`${payload.hypothesis?.title || title} entered evidence gathering. No provider request was dispatched.`);
      setTitle(""); setDescription(""); setRationale(""); setAudience(""); setDemand(""); setCompetitors(""); setWinningThesis("");
      onRecorded();
    } catch (reason) { setStatus("ERROR"); setMessage(reason instanceof Error ? reason.message : "The hypothesis could not be recorded"); }
  }
  return <section className="npHypothesis" aria-labelledby="hypothesis-intake-title"><header><div><small>EXPERT SENSE · TYPED INTAKE</small><h2 id="hypothesis-intake-title">Submit a niche hypothesis for verification</h2><p>Record your thesis and assumptions. The system will add an unranked, research-required dossier—without treating your sense as evidence.</p></div><div><StatusPill tone="good">ZERO SPEND</StatusPill><span>No provider dispatch</span></div></header>{context ? <form onSubmit={submit}><label><span>Channel</span><select value={context.channelId} onChange={(event) => setChannelId(event.target.value)}>{data.intakeContexts.map((item) => <option key={item.channelId} value={item.channelId}>{item.channelName}</option>)}</select></label><label><span>Hypothesis title</span><input required minLength={4} maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Invisible systems behind healthcare prices" /></label><label className="wide"><span>Description</span><textarea required minLength={20} maxLength={1200} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Define the niche boundary and the audience-facing problem." /></label><label className="wide"><span>Why your expert sense says this matters</span><textarea required minLength={40} maxLength={4000} value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="Record the experience, observations or pattern behind the hypothesis." /></label><label><span>Audience assumptions · one per line</span><textarea required value={audience} onChange={(event) => setAudience(event.target.value)} placeholder={"Time-poor operators\nNeed decision clarity"} /></label><label><span>Demand assumptions · one per line</span><textarea required value={demand} onChange={(event) => setDemand(event.target.value)} placeholder={"Recurring search intent\nHigh cost of wrong decisions"} /></label><label><span>Known competitors · one per line</span><textarea required value={competitors} onChange={(event) => setCompetitors(event.target.value)} placeholder={"Channel or product A\nNewsletter B"} /></label><label><span>Winning thesis</span><textarea required minLength={30} maxLength={2000} value={winningThesis} onChange={(event) => setWinningThesis(event.target.value)} placeholder="What repeatable capability or content advantage could let this channel win?" /></label><footer className="wide"><p>Submission creates no score, system rank, expert priority, selection, commitment or Channel Strategy activation.</p><button type="submit" disabled={status === "SUBMITTING"}>{status === "SUBMITTING" ? "Recording…" : "Submit for evidence gathering"}</button></footer>{message && <p className={`wide npFormStatus ${status.toLowerCase()}`} role="status">{message}</p>}</form> : <p className="npMissing">No canonical channel program is available for hypothesis intake.</p>}</section>;
}

export function NichePortfolioView() {
  const params = useSearchParams();
  const [scope, setScope] = useState(params.get("channel") || "");
  const [data, setData] = useState<NichePortfolioProjection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [sort, setSort] = useState<Sort>("SYSTEM_RANK");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    fetch(`/api/factory/niche-portfolio${scope ? `?channel=${encodeURIComponent(scope)}` : ""}`, { cache: "no-store" }).then(async (response) => {
      const payload = await response.json() as NichePortfolioProjection & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Niche portfolio projection is unavailable");
      if (active) setData(payload);
    }).catch((reason) => active && setError(reason instanceof Error ? reason.message : "Niche portfolio projection is unavailable"));
    return () => { active = false; };
  }, [scope, refresh]);
  function changeScope(value: string) { setData(null); setError(null); setScope(value); }
  const visible = useMemo(() => {
    const filtered = (data?.comparison || []).filter((item) => filter === "ALL" || item.eligibility === filter);
    return [...filtered].sort((a, b) => {
      if (sort === "MARKET_ATTRACTIVENESS") return (b.axes.marketAttractiveness.score ?? -1) - (a.axes.marketAttractiveness.score ?? -1);
      if (sort === "ABILITY_TO_WIN") return (b.axes.abilityToWin.score ?? -1) - (a.axes.abilityToWin.score ?? -1);
      if (sort === "EVIDENCE_CONFIDENCE") return (b.axes.evidenceConfidence.score ?? -1) - (a.axes.evidenceConfidence.score ?? -1);
      return a.channel.name.localeCompare(b.channel.name) || (a.systemRank ?? Number.MAX_SAFE_INTEGER) - (b.systemRank ?? Number.MAX_SAFE_INTEGER);
    });
  }, [data, filter, sort]);

  return <FactoryShell active="niches">
    <ProjectionState loading={!data && !error} error={error} data={data} label="niche opportunity portfolio" />
    {data && <>
      <header className="pfTop npTop"><div><p>NICHE INTELLIGENCE · PORTFOLIO DECISION</p><h1>Compare opportunity. Prove the right to win.</h1><span>Review a portfolio of potential niches across market demand, audience needs, competitor strength, evidence confidence and the capabilities required to win. No ranking can commit a niche.</span></div><label className="pfSelect"><span>CHANNEL SCOPE</span><select value={scope} onChange={(event) => changeScope(event.target.value)}><option value="">All channels</option>{data.channels.map((channel) => <option value={channel.id} key={channel.id}>{channel.name}</option>)}</select></label></header>
      <section className="npAuthority"><div><small>{data.contract} · BOUNDED EXPERT INTAKE</small><strong>{data.decisionState.replaceAll("_", " ")}</strong><p>Canonical evidence and expert-seeded hypotheses share one portfolio. Assumptions remain separate from evidence; the bridge never converts a legacy total or expert sense into a V2 axis.</p></div><div><StatusPill tone="good">ZERO SPEND</StatusPill><span>Only hypothesis intake is routed</span></div></section>
      <section className="npSummary" aria-label="Portfolio summary"><article><small>OPPORTUNITIES</small><strong>{data.summary.opportunities}</strong></article><article><small>COMPARABLE</small><strong>{data.summary.comparable}</strong></article><article><small>ELIGIBLE</small><strong>{data.summary.eligible}</strong></article><article><small>PREREQUISITE BLOCKED</small><strong>{data.summary.blockedByPrerequisite}</strong></article><article><small>RESEARCH REQUIRED</small><strong>{data.summary.researchRequired}</strong></article><article><small>EXPERT SEEDED</small><strong>{data.summary.expertSeeded}</strong></article></section>
      <section className="npControls" aria-label="Portfolio comparison controls"><div role="group" aria-label="Filter opportunities"><button className={filter === "ALL" ? "active" : ""} onClick={() => setFilter("ALL")}>All</button><button className={filter === "ELIGIBLE" ? "active" : ""} onClick={() => setFilter("ELIGIBLE")}>Eligible</button><button className={filter === "BLOCKED_BY_PREREQUISITE" ? "active" : ""} onClick={() => setFilter("BLOCKED_BY_PREREQUISITE")}>Prerequisite gaps</button><button className={filter === "RESEARCH_REQUIRED" ? "active" : ""} onClick={() => setFilter("RESEARCH_REQUIRED")}>Research required</button></div><label><span>SORT BY</span><select value={sort} onChange={(event) => setSort(event.target.value as Sort)}><option value="SYSTEM_RANK">System research rank</option><option value="MARKET_ATTRACTIVENESS">Market attractiveness</option><option value="ABILITY_TO_WIN">Ability to win</option><option value="EVIDENCE_CONFIDENCE">Evidence confidence</option></select></label></section>
      <HypothesisIntake data={data} onRecorded={() => setRefresh((value) => value + 1)} />
      {visible.length ? <>
        <section className="npMatrix" aria-labelledby="portfolio-matrix-title"><header><div><small>SIDE-BY-SIDE DECISION FRAME</small><h2 id="portfolio-matrix-title">Opportunity comparison</h2></div><span>{visible.length} shown · no total score</span></header><div className="npTableScroll"><table><thead><tr><th scope="col">Opportunity</th><th scope="col">System rank</th><th scope="col">Expert priority</th><th scope="col">Market attractiveness</th><th scope="col">Ability to win</th><th scope="col">Evidence confidence</th><th scope="col">Prerequisites</th><th scope="col">Winning criteria</th></tr></thead><tbody>{visible.map((item) => <tr key={item.opportunityId}><th scope="row"><small>{item.channel.name}</small><strong>{item.title}</strong><StatusPill tone={statusTone(item.eligibility)}>{item.eligibility.replaceAll("_", " ")}</StatusPill></th><td><b>{item.systemRank === null ? "—" : `#${item.systemRank}`}</b><span>{item.systemRank === null ? "Unranked expert input" : "V1 research order"}</span></td><td><b>{item.expertPriority ?? "—"}</b><span>{item.expertPriority === null ? "Separate fact not set" : "Expert recorded"}</span></td><td><AxisCell axis={item.axes.marketAttractiveness} compact /></td><td><AxisCell axis={item.axes.abilityToWin} compact /></td><td><AxisCell axis={item.axes.evidenceConfidence} compact /></td><td><b>{item.prerequisites.length || "—"}</b><span>{item.prerequisites.some((condition) => condition.status !== "PASS") ? "Gap / unknown" : item.prerequisites.length ? "Passed" : "Not recorded"}</span></td><td><b>{item.winningCriteria.length || "—"}</b><span>{item.winningCriteria.length ? "Defined" : "Not recorded"}</span></td></tr>)}</tbody></table></div></section>
        <section className="npDossiers" aria-labelledby="dossiers-title"><header><div><small>MARKET · AUDIENCE · COMPETITOR · CONDITIONS TO WIN</small><h2 id="dossiers-title">Opportunity dossiers</h2></div><span>Expand any niche for evidence detail</span></header>{visible.map((item) => <Dossier key={item.opportunityId} opportunity={item} />)}</section>
      </> : <section className="pfEmpty"><h3>No opportunities match this view</h3><p>Change the filter. No synthetic opportunity has been inserted.</p></section>}
      <section className="npDownstream"><strong>Channel Strategy remains blocked</strong><span>{data.downstreamGate.reason}</span></section>
    </>}
  </FactoryShell>;
}
