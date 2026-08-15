import assert from "node:assert/strict";
import { compileIntelligenceNicheWorkflow, type ExpertDecision, type IntelligenceNicheWorkflowInput } from "../lib/intelligence-niche-workflow-contract";

const base: IntelligenceNicheWorkflowInput = {
  portfolioId: "portfolio-1", channelId: "channel-1", aggregateVersion: 3, currentNiche: "Hidden Systems Behind Money", researchChampionId: "candidate-1",
  candidates: [{ id: "candidate-1", version: 2, title: "The Hidden Cost of Convenience", score: 91, evidenceVersion: 4 }],
  evidence: { version: 4, marketArtifactState: "FROZEN", verifiedSources: 12, primarySources: 4, unresolvedP0Claims: 0, contradictionsReviewed: true }, expertDecision: null,
};
const expert = (action: ExpertDecision["action"], overrides: Partial<ExpertDecision> = {}): ExpertDecision => ({
  decisionId: `decision-${action.toLowerCase()}`, channelId: "channel-1", actorRole: "OWNER_EXPERT", action, candidateId: "candidate-1", candidateVersion: 2, evidenceVersion: 4,
  decidedAt: "2026-08-15T00:00:00.000Z", rationale: "Evidence package and differentiation were reviewed.", reusableAsset: { type: "RUBRIC_ANCHOR", summary: "Prefer system-level differentiation with explicit factual-risk controls." }, ...overrides,
});

const pending = compileIntelligenceNicheWorkflow(base);
assert.equal(pending.state, "EXPERT_DECISION_REQUIRED");
assert.equal(pending.readiness, "EVIDENCE_READY_EXPERT_DECISION_REQUIRED");
assert.equal(pending.commitment, null);
assert.equal(pending.downstreamGate.state, "BLOCKED");
assert.equal(pending.evidenceAssessment.ready, true);
assert.equal(pending.evidenceAssessment.passedCount, 7);
assert.equal(pending.commandContracts.find((command) => command.command === "SUBMIT_EXPERT_DECISION")?.activation, "ROUTED_ZERO_SPEND");
assert.ok(pending.commandContracts.every((command) => command.ceilings.providerRequests === 0 && command.ceilings.spendUsd === 0));
assert.ok(pending.commandContracts.filter((command) => command.command !== "SUBMIT_EXPERT_DECISION").every((command) => command.activation === "DECLARED_NOT_ROUTED"));

const accepted = compileIntelligenceNicheWorkflow({ ...base, expertDecision: expert("ACCEPT") });
assert.equal(accepted.state, "NICHE_ACCEPTED_PENDING_COMMITMENT");
assert.equal(accepted.expertDecisionOutcome?.niche, "The Hidden Cost of Convenience");
assert.equal(accepted.commitment, null);
assert.deepEqual(accepted.allowedNextActions, ["PREPARE_TYPED_NICHE_COMMITMENT"]);
assert.equal(accepted.downstreamGate.state, "READY_FOR_TYPED_HANDOFF");
assert.match(accepted.downstreamGate.handoffId || "", /^channel-1:strategy:/);

const rejected = compileIntelligenceNicheWorkflow({ ...base, expertDecision: expert("REJECT") });
assert.equal(rejected.state, "NICHE_REJECTED");
assert.equal(rejected.commitment, null);
assert.equal(rejected.downstreamGate.state, "BLOCKED");

const moreEvidence = compileIntelligenceNicheWorkflow({ ...base, expertDecision: expert("REQUEST_MORE_EVIDENCE") });
assert.equal(moreEvidence.state, "MORE_EVIDENCE_REQUIRED");
assert.deepEqual(moreEvidence.allowedNextActions, ["REQUEST_BOUNDED_EVIDENCE_REFRESH"]);

const insufficient = compileIntelligenceNicheWorkflow({ ...base, evidence: { ...base.evidence, primarySources: 2 } });
assert.equal(insufficient.state, "INSUFFICIENT_EVIDENCE");
assert.equal(insufficient.downstreamGate.state, "BLOCKED");
assert.deepEqual(insufficient.evidenceAssessment.gaps, ["PRIMARY_SOURCE_FLOOR"]);
assert.match(insufficient.downstreamGate.reason, /PRIMARY_SOURCE_FLOOR/);

const stale = compileIntelligenceNicheWorkflow({ ...base, expertDecision: expert("ACCEPT", { candidateVersion: 1, evidenceVersion: 3 }) });
assert.equal(stale.state, "CONTRACT_INVALID");
assert.ok(stale.errors.includes("DECISION_CANDIDATE_VERSION_STALE"));
assert.ok(stale.errors.includes("DECISION_EVIDENCE_VERSION_STALE"));

const crossChannel = compileIntelligenceNicheWorkflow({ ...base, expertDecision: expert("ACCEPT", { channelId: "channel-2" }) });
assert.equal(crossChannel.state, "CONTRACT_INVALID");
assert.ok(crossChannel.errors.includes("CROSS_CHANNEL_DECISION_REJECTED"));
assert.equal(crossChannel.downstreamGate.state, "BLOCKED");

const mismatchedChampion = compileIntelligenceNicheWorkflow({
  ...base,
  candidates: [...base.candidates, { id: "candidate-2", version: 1, title: "A different candidate", score: 89, evidenceVersion: 4 }],
  expertDecision: expert("ACCEPT", { candidateId: "candidate-2", candidateVersion: 1 }),
});
assert.equal(mismatchedChampion.state, "CONTRACT_INVALID");
assert.ok(mismatchedChampion.errors.includes("DECISION_RESEARCH_CHAMPION_MISMATCH"));
assert.equal(mismatchedChampion.commitment, null);
assert.equal(mismatchedChampion.downstreamGate.state, "BLOCKED");

assert.deepEqual(pending.improvement.promotionPath, ["BACKTEST", "SHADOW", "EXPERT_REVIEW", "BOUNDED_CANARY", "MONITOR", "RETAIN_OR_ROLLBACK"]);
assert.ok(pending.improvement.expertApprovalRequired.includes("Autonomy expansion"));
assert.ok(pending.controls.contain.includes("Owner/expert decision gate"));
assert.ok(pending.controls.contain.includes("Separate typed niche-commitment boundary"));
console.log("Intelligence & Niche executable contract passed 8 lifecycle paths with fail-closed versioning, expert decision, separate commitment, zero-spend commands and governed improvement controls.");
