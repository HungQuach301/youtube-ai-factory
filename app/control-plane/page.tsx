"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Dashboard = {
  program: {
    id: string;
    version: number;
    status: string;
    executionMode: string;
    qualityPolicy: string;
    legacyPolicy: string;
    overallFloor: number;
    criticalFloor: number;
    dimensionFloor: number;
    p0Tolerance: number;
    p1Tolerance: number;
    maximumAttempts: number;
    minimumImprovement: number;
    productionAuthorized: boolean;
  };
  stages: Array<{ id: string; stageKey: string; sequence: number; stageName: string; status: string; threshold: number; attempt: number; blocker: string | null; evidenceSummary: string }>;
  evidence: Array<{ id: string; entityType: string; title: string; lifecycleState: string; storageState: string; quarantineState: string }>;
  lifecycle: Array<{ state: string; count: number }>;
  assets: Array<{ id: string; name: string; assetClass: string; lifecycleState: string; syncState: string; rightsState: string; reusableEligible: boolean; quarantined: boolean; costUsd: number }>;
  costs: Array<{ id: string; stageKey: string; provider: string; costClass: string; costType: string; status: string; estimatedUsd: number; actualUsd: number; note: string }>;
  aiUsage: Array<{ id: string; runId: string; stageKey: string; provider: string; modelId: string; providerResponseId: string; providerStatus: string; inputTokens: number; cachedInputTokens: number; outputTokens: number; reasoningTokens: number; totalTokens: number; webSearchCalls: number; tokenCostUsd: number; toolCostUsd: number; actualUsd: number; pricingStatus: string; measuredAt: string }>;
  costSummary: { actualCost: number; estimatedCost: number; reusableValue: number; aiActualCost: number; tokenCost: number; toolCost: number; inputTokens: number; cachedInputTokens: number; outputTokens: number; reasoningTokens: number; webSearchCalls: number; measuredResponses: number; rateExceptions: number; incompleteResponses: number };
  reconciliation?: { discovered: number; reconciled: number; failed: number; failures: string[] };
  storage: Array<{ id: string; tier: string; bindingName: string; role: string; implementationState: string; verificationState: string; evidence: string; requiredForProduction: boolean }>;
  decisions: Array<{ id: string; decisionCode: string; title: string; status: string }>;
  latestAudit: null | {
    status: string;
    architectureScore: number;
    evidenceScore: number;
    costScore: number;
    storageScore: number;
    productionAuthorized: boolean;
    checks: Array<{ id: string; label: string; status: string; evidence: string }>;
    blockers: Array<{ code: string; severity: string; message: string; nextAction: string }>;
  };
  guardrails: { legacyQuarantine: boolean; zeroP0: boolean; zeroP1: boolean; boundedRepair: boolean; productionAuthorized: boolean };
};

const labels: Record<string, string> = {
  PLAN: "Plan",
  MATERIALIZED: "Materialized",
  VERIFIED: "Verified",
  FROZEN: "Frozen",
  REJECTED: "Rejected",
  ESCALATED: "Escalated",
};

function human(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}

function statusTone(status: string) {
  if (["PASS", "VERIFIED", "FROZEN", "READY", "LOCKED"].includes(status)) return "pass";
  if (["FAIL", "BLOCKED", "CONFIG_REQUIRED", "AGENT_REQUIRED"].includes(status)) return "blocked";
  return "pending";
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("en-US", { notation: value >= 1000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
}

function dollars(value: number) {
  return value < 1 ? value.toFixed(4) : value.toFixed(2);
}

function stageRoute(stageKey: string) {
  if (["01", "02", "03"].includes(stageKey)) return "/intelligence";
  if (stageKey === "04") return "/creative-contract";
  if (stageKey === "05") return "/story-architecture";
  if (stageKey === "06") return "/script-development";
  if (["07A", "07B"].includes(stageKey)) return "/production-design";
  if (stageKey === "08") return "/shot-orchestration";
  return null;
}

export default function ControlPlanePage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/factory/control-plane", { cache: "no-store" });
      const payload = await response.json() as Dashboard & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Control plane could not load");
      setData(payload);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Control plane could not load");
    }
  }, []);

  useEffect(() => {
    const request = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(request);
  }, [load]);

  async function act(action: string, body: Record<string, string> = {}) {
    setWorking(action);
    setError(null);
    try {
      const response = await fetch("/api/factory/control-plane", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const payload = await response.json() as Dashboard & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Action failed");
      setData(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Action failed");
    } finally {
      setWorking(null);
    }
  }

  const waveReadiness = useMemo(() => {
    if (!data?.latestAudit) return 0;
    const audit = data.latestAudit;
    return Math.round((audit.architectureScore + audit.evidenceScore + audit.costScore + audit.storageScore) / 4);
  }, [data]);

  if (!data) {
    return <main className="v7Loading"><span>V7</span><h1>Loading the authoritative control plane…</h1>{error && <><p>{error}</p><button onClick={() => void load()}>Try again</button></>}</main>;
  }

  const audit = data.latestAudit;
  const productionBlocked = !data.program.productionAuthorized;

  return (
    <main className="v7ControlShell">
      <aside className="v7SideNav">
        <Link className="v7Brand" href="/"><span>F</span><div><strong>Frameflow</strong><small>Production V7</small></div></Link>
        <nav aria-label="V7 control plane sections">
          <a className="active" href="#overview"><i>01</i>Control plane</a>
          <a href="#states"><i>02</i>State machine</a>
          <a href="#evidence"><i>03</i>Evidence lineage</a>
          <a href="#assets"><i>04</i>Asset registry</a>
          <a href="#costs"><i>05</i>Cost center</a>
          <a href="#storage"><i>06</i>Storage contracts</a>
          <a href="#decisions"><i>07</i>Decision register</a>
        </nav>
        <div className="v7SideFoot">
          <span className="v7Lock">V7</span>
          <div><strong>Greenfield locked</strong><small>Legacy is read-only</small></div>
        </div>
      </aside>

      <section className="v7Workspace">
        <header className="v7Topbar">
          <div>
            <Link href="/">← Command center</Link>
            <p>PRODUCTION PIPELINE V7 · WAVE 1</p>
            <h1>Control Plane & Foundation</h1>
          </div>
          <div className="v7TopActions">
            <span className={`v7Badge ${productionBlocked ? "blocked" : "pass"}`}>{productionBlocked ? "PRODUCTION LOCKED" : "PRODUCTION AUTHORIZED"}</span>
            {!productionBlocked && <Link className="v7OutlineButton" href="/intelligence">Open Wave 2 Intelligence →</Link>}
            <Link className="v7OutlineButton" href="/settings">Factory settings</Link>
          </div>
        </header>

        {error && <div className="v7Error" role="alert"><strong>Action stopped</strong><span>{error}</span></div>}

        <section id="overview" className="v7Hero">
          <div className="v7HeroCopy">
            <p>AUTHORITATIVE PROGRAM CONTRACT</p>
            <h2>Plans authorize work. Only verified artifacts prove completion.</h2>
            <span>Wave 1 establishes the state, evidence, cost and storage controls that every later production stage must obey.</span>
          </div>
          <div className="v7HeroStatus">
            <small>CURRENT STATE</small>
            <strong>{human(data.program.status)}</strong>
            <div className="v7Readiness"><i><b style={{ width: `${waveReadiness}%` }} /></i><span>{waveReadiness}% verified</span></div>
          </div>
        </section>

        <section className="v7ContractBar">
          <div><small>PIPELINE</small><strong>V{data.program.version} · GREENFIELD</strong></div>
          <div><small>QUALITY</small><strong>Maximum quality first</strong></div>
          <div><small>RELEASE FLOOR</small><strong>{data.program.overallFloor} / critical {data.program.criticalFloor}</strong></div>
          <div><small>P0 / P1</small><strong>{data.program.p0Tolerance} / {data.program.p1Tolerance}</strong></div>
          <div><small>REPAIR</small><strong>{data.program.maximumAttempts} attempts · +{data.program.minimumImprovement}</strong></div>
        </section>

        <section className="v7ModeAndAudit">
          <article>
            <div><small>EXECUTION MODE</small><h3>Same gates, different participation</h3></div>
            <div className="v7ModeSwitch" role="group" aria-label="Execution mode">
              {["AUTOPILOT", "APPROVAL_GATES", "MANUAL"].map((mode) => <button key={mode} className={data.program.executionMode === mode ? "active" : ""} disabled={working !== null} onClick={() => void act("SET_MODE", { mode })}>{human(mode)}</button>)}
            </div>
          </article>
          <article className="auditAction">
            <div><small>FOUNDATION AUDIT</small><h3>{audit ? human(audit.status) : "Not executed"}</h3><p>{audit ? `${audit.checks.filter((check) => check.status === "PASS" || check.status === "OPTIONAL").length}/${audit.checks.length} policy checks satisfied` : "Test actual D1, R2 and Google Drive paths, locked ADRs and production blockers."}</p></div>
            <button disabled={working !== null} onClick={() => void act("RUN_FOUNDATION_AUDIT")}>{working === "RUN_FOUNDATION_AUDIT" ? "Verifying actual services…" : audit ? "Audit again" : "Run Wave 1 audit"}</button>
          </article>
        </section>

        <section id="states" className="v7Panel">
          <header className="v7SectionTitle"><div><p>DEPENDENCY-AWARE STATE MACHINE</p><h2>17 lifecycle stages · 18 stage contracts</h2></div><span>Downstream remains blocked until Stage 00 freezes</span></header>
          <div className="v7StageGrid">
            {data.stages.map((stage) => <article key={stage.id} className={stage.status.toLowerCase()}>
              <header><span>{stage.stageKey}</span><b>≥{stage.threshold}</b></header>
              <strong>{stage.stageName}</strong>
              <p>{stage.evidenceSummary}</p>
              <footer><span>{human(stage.status)}</span>{stageRoute(stage.stageKey)&&stage.status!=="BLOCKED_UPSTREAM"?<Link href={stageRoute(stage.stageKey)!}>{stage.status==="READY"?"Open & run":"Open"} →</Link>:<small>Attempt {stage.attempt}/{data.program.maximumAttempts}</small>}</footer>
            </article>)}
          </div>
        </section>

        <section id="evidence" className="v7Panel">
          <header className="v7SectionTitle"><div><p>PRODUCT TRUTH</p><h2>Evidence lineage & lifecycle</h2></div><span>{data.evidence.length} authoritative foundation records</span></header>
          <div className="v7Lifecycle">
            {data.lifecycle.map((item, index) => <article key={item.state}><small>{String(index + 1).padStart(2, "0")}</small><strong>{item.count}</strong><span>{labels[item.state]}</span></article>)}
          </div>
          <div className="v7EvidenceList">
            {data.evidence.map((item) => <article key={item.id}><div><span className={`v7StatusDot ${statusTone(item.lifecycleState)}`} /><div><small>{human(item.entityType)}</small><strong>{item.title}</strong></div></div><div><b>{human(item.lifecycleState)}</b><span>{human(item.storageState)}</span>{item.quarantineState === "ENFORCED" && <em>QUARANTINE ENFORCED</em>}</div></article>)}
          </div>
        </section>

        <div className="v7TwoColumn">
          <section id="assets" className="v7Panel">
            <header className="v7SectionTitle"><div><p>REUSABLE MEDIA ASSET LIBRARY</p><h2>Asset registry</h2></div><span>{data.assets.length} V7 assets</span></header>
            <div className="v7EmptyState"><span>0</span><h3>No production assets accepted</h3><p>This is correct for Wave 1. New assets may enter only after Stage 00 freezes and all required storage paths are verified.</p></div>
            <div className="v7Rule"><b>LEGACY POLICY</b><span>V5/V6 materials are historical QA evidence and excluded from V7 selection.</span></div>
          </section>

          <section id="costs" className="v7Panel">
            <header className="v7SectionTitle"><div><p>COST & UNIT ECONOMICS</p><h2>Cost Control Center</h2></div><button className="v7ReconcileButton" disabled={working !== null} onClick={() => void act("RECONCILE_AI_USAGE")}>{working === "RECONCILE_AI_USAGE" ? "Reading provider usage…" : "Reconcile AI usage"}</button></header>
            <div className="v7CostMetrics">
              <article><small>ACTUAL</small><strong>${data.costSummary.actualCost.toFixed(2)}</strong></article>
              <article><small>PENDING ESTIMATE</small><strong>${data.costSummary.estimatedCost.toFixed(2)}</strong></article>
              <article><small>MEASURED RESPONSES</small><strong>{data.costSummary.measuredResponses}</strong></article>
            </div>
            <div className="v7UsageMetrics">
              <article><small>INPUT TOKENS</small><strong>{compactNumber(data.costSummary.inputTokens)}</strong><span>{compactNumber(data.costSummary.cachedInputTokens)} cached</span></article>
              <article><small>OUTPUT TOKENS</small><strong>{compactNumber(data.costSummary.outputTokens)}</strong><span>{compactNumber(data.costSummary.reasoningTokens)} reasoning</span></article>
              <article><small>WEB SEARCH</small><strong>{data.costSummary.webSearchCalls}</strong><span>${data.costSummary.toolCost.toFixed(3)} tool cost</span></article>
              <article><small>MODEL TOKENS</small><strong>${data.costSummary.tokenCost.toFixed(3)}</strong><span>{data.costSummary.rateExceptions === 0 ? "all rates verified" : `${data.costSummary.rateExceptions} rate exceptions`}</span></article>
            </div>
            {data.reconciliation && <div className={`v7ReconcileResult ${data.reconciliation.failed ? "warning" : "pass"}`}><strong>{data.reconciliation.reconciled}/{data.reconciliation.discovered} responses reconciled</strong><span>{data.reconciliation.failed ? `${data.reconciliation.failed} response(s) could not be read; retry remains safe.` : "Historical Wave 2 and Stage 04 usage is now reflected below."}</span></div>}
            <div className="v7PricingNote">USD is calculated from provider-reported tokens and tool calls. Reasoning tokens are shown separately but already included in output tokens, so they are never billed twice.</div>
            <details className="v7RequestLedger">
              <summary><span>AI request ledger</span><b>{data.aiUsage.length} requests · {data.costSummary.incompleteResponses} incomplete</b></summary>
              <div className="v7RequestLedgerHead"><span>REQUEST</span><span>TOKENS</span><span>STATUS</span><span>COST</span></div>
              {data.aiUsage.map((usage) => <details className="v7RequestRow" key={usage.id}>
                <summary>
                  <span><b>Stage {usage.stageKey} · {usage.modelId}</b><small>{new Date(usage.measuredAt).toLocaleString()} · {usage.providerResponseId.slice(0, 18)}…</small></span>
                  <span><b>{usage.totalTokens.toLocaleString()}</b><small>{usage.reasoningTokens.toLocaleString()} reasoning</small></span>
                  <span className={usage.providerStatus === "completed" ? "pass" : "blocked"}>{human(usage.providerStatus)}</span>
                  <span><b>${dollars(usage.actualUsd)}</b><small>{usage.webSearchCalls} web search</small></span>
                </summary>
                <div className="v7RequestDetail">
                  <div><small>RESPONSE ID</small><code>{usage.providerResponseId}</code></div>
                  <div><small>RUN ID</small><code>{usage.runId}</code></div>
                  <div><small>INPUT</small><b>{usage.inputTokens.toLocaleString()} · {usage.cachedInputTokens.toLocaleString()} cached</b></div>
                  <div><small>OUTPUT</small><b>{usage.outputTokens.toLocaleString()} · {usage.reasoningTokens.toLocaleString()} reasoning</b></div>
                  <div><small>TOKEN COST</small><b>${dollars(usage.tokenCostUsd)}</b></div>
                  <div><small>TOOL COST</small><b>${dollars(usage.toolCostUsd)}</b></div>
                </div>
              </details>)}
            </details>
            {data.costs.map((cost) => <div className="v7CostRow" key={cost.id}><div><small>STAGE {cost.stageKey} · {cost.provider}</small><strong>{human(cost.costType)}</strong><p>{cost.note}</p></div><div><b>${dollars(cost.actualUsd)}</b><span>{human(cost.status)}</span></div></div>)}
          </section>
        </div>

        <section id="storage" className="v7Panel">
          <header className="v7SectionTitle"><div><p>GOOGLE DRIVE–FIRST STORAGE + REGISTRY</p><h2>Storage contracts</h2></div><Link href="/settings/storage">Manage storage →</Link></header>
          <div className="v7StorageGrid">
            {data.storage.map((item) => <article key={item.id} className={statusTone(item.verificationState)}><header><span>{item.tier.split("_").map((word) => word[0]).join("").slice(0, 3)}</span><b>{item.requiredForProduction ? human(item.verificationState) : "Optional"}</b></header><h3>{human(item.tier)}</h3><p>{item.role}</p><footer><code>{item.requiredForProduction ? "REQUIRED" : "OPTIONAL"}</code><span>{item.evidence}</span></footer></article>)}
          </div>
        </section>

        {audit && <section className="v7Panel">
          <header className="v7SectionTitle"><div><p>ACTUAL-SERVICE VERIFICATION</p><h2>Latest foundation audit</h2></div><span>{audit.productionAuthorized ? "Release path open" : `${audit.blockers.length} production blockers`}</span></header>
          <div className="v7AuditScores">
            {[['Architecture', audit.architectureScore], ['Evidence', audit.evidenceScore], ['Cost ledger', audit.costScore], ['Storage', audit.storageScore]].map(([label, score]) => <article key={String(label)}><small>{label}</small><strong>{score}<span>/100</span></strong><i><b style={{ width: `${score}%` }} /></i></article>)}
          </div>
          <div className="v7CheckList">{audit.checks.map((check) => <article key={check.id}><span className={statusTone(check.status)}>{check.status === "PASS" ? "✓" : check.status === "OPTIONAL" ? "○" : "!"}</span><div><strong>{check.label}</strong><p>{check.evidence}</p></div><b>{check.status}</b></article>)}</div>
          {audit.blockers.length > 0 && <div className="v7BlockerList"><h3>Production authorization withheld</h3>{audit.blockers.map((blocker) => <article key={blocker.code}><span>{blocker.severity}</span><div><strong>{blocker.message}</strong><p>{blocker.nextAction}</p></div></article>)}</div>}
        </section>}

        <section id="decisions" className="v7Panel">
          <header className="v7SectionTitle"><div><p>ARCHITECTURE DECISION REGISTER</p><h2>{data.decisions.length} locked decisions</h2></div><span>Changes require a new documented version</span></header>
          <div className="v7DecisionGrid">{data.decisions.map((decision) => <article key={decision.id}><span>{decision.decisionCode}</span><strong>{decision.title}</strong><b>{decision.status}</b></article>)}</div>
        </section>

        <footer className="v7PageFooter"><div><strong>Wave 1 rule</strong><span>No research, script, material generation or render is authorized until the foundation audit passes.</span></div><Link href="/">Return to Command center →</Link></footer>
      </section>
    </main>
  );
}
