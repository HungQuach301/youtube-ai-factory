import { Suspense } from "react";
import { NichePortfolioView } from "../niche-portfolio-view";
import { FactoryShell, ProjectionState, StatusPill } from "../factory-shell";
import { nichePortfolioProjection } from "@/lib/niche-portfolio-projection";

export const dynamic = "force-dynamic";

async function loadActivationPanelData(channelId: string | null) {
  try {
    return await nichePortfolioProjection(channelId);
  } catch {
    return null;
  }
}

async function ActivationPanel({ channelId }: { channelId: string | null }) {
  const data = await loadActivationPanelData(channelId);
  if (!data) return <section className="npEvidenceWorkflow"><header><div><small>SLICE 8 · CHANNEL STRATEGY ACTIVATION</small><h2>Projection unavailable</h2></div><StatusPill tone="warn">FAIL CLOSED</StatusPill></header></section>;
  const workspace = data.activationWorkspace, governance = data.governanceWorkspace, opportunity = data.comparison.find((item) => item.opportunityId === workspace.opportunityId), ready = workspace.state === "READY_FOR_ACTIVATION" || workspace.state === "STALE";
  return <><section className="npEvidenceWorkflow"><header><div><small>SLICE 7</small><h2>Select, then commit</h2></div><StatusPill tone={governance.state === "COMMITTED" ? "good" : "warn"}>{governance.state.replaceAll("_", " ")}</StatusPill></header><div className="npDownstream"><strong>{governance.reason}</strong><span>Slice 8 activates.</span></div></section><section className="npEvidenceWorkflow"><header><div><small>SLICE 8 · CHANNEL STRATEGY ACTIVATION</small><h2>Activate only from commitment</h2></div><StatusPill tone={workspace.state === "ACTIVE" ? "good" : "warn"}>{workspace.state.replaceAll("_", " ")}</StatusPill></header><div className="npDownstream"><strong>{workspace.reason}</strong><span>{opportunity?.title || "No commitment"}</span></div>{ready && <form className="npEvidenceForm" action="/api/factory/channel-strategy-activations" method="post"><input type="hidden" name="action" value="ACTIVATE_CHANNEL_STRATEGY"/><input type="hidden" name="expectedActivationVersion" value={workspace.activationVersion}/><input type="hidden" name="expectedChannelStrategyVersion" value={workspace.channelStrategyVersion}/><input type="hidden" name="expectedCommitmentVersion" value={workspace.commitmentVersion}/><input type="hidden" name="commitmentId" value={workspace.commitmentId || ""}/><input type="hidden" name="idempotencyKey" value={`channel-strategy:${workspace.commitmentId}:v${workspace.channelStrategyVersion + 1}`}/><label><span>Owner</span><input name="owner" required minLength={3} defaultValue="Portfolio Governance" /></label><label><span>Review days</span><input name="reviewCadenceDays" required type="number" min={7} max={365} defaultValue={30} /></label>{[["rationale", "Activation rationale", 30], ["viewerPromise", "Viewer promise", 20], ["differentiation", "Differentiation", 20], ["audienceFocus", "Audience focus", 20], ["contentBoundaries", "Content boundaries · one per line", 8], ["successMeasures", "Success measures · one per line", 8]].map(([name, label, min]) => <label key={name}><span>{label}</span><textarea name={name as string} required minLength={min as number} /></label>)}<input type="hidden" name="commitmentReviewed" value="true"/><input type="hidden" name="activationAcknowledged" value="true"/><footer className="wide"><p>Submitting confirms commitment review and activates only the strategy binding.</p><button>Activate strategy v{workspace.channelStrategyVersion + 1}</button></footer></form>}</section></>;
}

export default async function NicheDiscoveryPage({ searchParams }: { searchParams: Promise<{ channel?: string }> }) { const query = await searchParams; return <Suspense fallback={<FactoryShell active="niches"><ProjectionState loading error={null} data={null} label="niche opportunity portfolio" /></FactoryShell>}><NichePortfolioView activationPanel={<ActivationPanel channelId={query.channel || null} />} /></Suspense>; }
