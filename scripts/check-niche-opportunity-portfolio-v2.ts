import assert from "node:assert/strict";
import {
  NICHE_OPPORTUNITY_POLICY_VERSION,
  compileNicheOpportunityPortfolio,
  isNicheOpportunityTransitionAllowed,
  type NicheOpportunity,
  type NichePortfolioInput,
} from "../lib/niche-opportunity-portfolio-contract";

function opportunity(id: string, origin: NicheOpportunity["hypothesis"]["origin"], market: number, ability: number, priority: number | null = null): NicheOpportunity {
  const claimIds = [`${id}-claim-market`, `${id}-claim-win`];
  return {
    opportunityId: id,
    portfolioId: "portfolio-1",
    version: 1,
    state: priority ? "EXPERT_PRIORITIZED" : "COMPARABLE",
    hypothesis: {
      hypothesisId: `${id}-hypothesis`, portfolioId: "portfolio-1", version: 1, origin, title: `${id} niche`, description: "A bounded niche hypothesis.", submittedBy: origin === "EXPERT_SEEDED" ? "expert-1" : "system",
      rationale: "Demand and differentiation signals warrant comparison.", audienceAssumptions: ["Busy knowledge workers"], demandAssumptions: ["Recurring demand"], knownCompetitors: ["Competitor A"], winningThesis: "Win through evidence-led narrative depth.", createdAt: "2026-08-15T00:00:00.000Z",
    },
    researchPlan: { planId: `${id}-plan`, version: 1, supportingQuestions: ["Which signals support demand?"], contradictingQuestions: ["Which facts falsify demand?"], unknownQuestions: ["Which uncertainty changes the decision?"], sourceClasses: ["YouTube primary data", "Audience research"] },
    evidenceClaims: [
      { claimId: claimIds[0], claimType: "MARKET_DEMAND", statement: "Demand is durable.", direction: "SUPPORTS", sourceRefs: ["source-1"], sourceAuthority: "PRIMARY", observedAt: "2026-08-14T00:00:00.000Z", freshness: "CURRENT", confidence: 86, verificationState: "VERIFIED", affectedAxis: "MARKET_ATTRACTIVENESS" },
      { claimId: claimIds[1], claimType: "WIN_CONDITION", statement: "Depth is defensible.", direction: "UNKNOWN", sourceRefs: ["source-2"], sourceAuthority: "SECONDARY", observedAt: "2026-08-14T00:00:00.000Z", freshness: "CURRENT", confidence: 72, verificationState: "VERIFIED", affectedAxis: "ABILITY_TO_WIN" },
    ],
    marketPotential: { demandSignals: ["Stable search intent"], growthSignals: ["Growing discussion"], monetizationPaths: ["Ads", "Sponsorship"], saturationRisks: ["Established incumbents"], geographyAndLanguage: ["English / global"], evidenceClaimIds: [claimIds[0]] },
    audiences: [{ segmentId: `${id}-audience`, label: "Knowledge workers", characteristics: ["Time poor"], needs: ["Clarity"], preferences: ["Visual explanations"], pains: ["Fragmented information"], jobsToBeDone: ["Make better decisions"], evidenceClaimIds: [claimIds[0]] }],
    competitors: [{ competitorId: `${id}-competitor`, name: "Competitor A", strengths: ["Large audience"], weaknesses: ["Shallow evidence"], defensibility: ["Brand"], contentAdvantages: ["Publishing cadence"], exploitableGaps: ["Evidence depth"], evidenceClaimIds: [claimIds[1]] }],
    capabilityProfile: [{ capabilityId: `${id}-research`, label: "Research depth", currentLevel: 78, evidence: ["Prior production"], owner: "Editorial" }],
    winConditions: [
      { conditionId: `${id}-pre`, kind: "PREREQUISITE", label: "Reliable primary research", rationale: "Claims must be defensible.", requiredLevel: 70, currentCapabilityLevel: 78, gap: 0, status: "PASS", evidenceClaimIds: [claimIds[1]], capabilityId: `${id}-research`, closingAction: "Maintain sourcing rubric.", estimatedTimeDays: 0, estimatedCostUsd: 0, proofMethod: "Three pilot scripts pass source audit." },
      { conditionId: `${id}-win`, kind: "WINNING_CRITERION", label: "Distinct evidence-led storytelling", rationale: "This creates a repeatable advantage.", requiredLevel: 90, currentCapabilityLevel: 78, gap: 12, status: "GAP", evidenceClaimIds: [claimIds[1]], capabilityId: `${id}-research`, closingAction: "Pilot a repeatable evidence narrative format.", estimatedTimeDays: 14, estimatedCostUsd: 500, proofMethod: "Pilot exceeds retention and trust targets." },
    ],
    scorecard: {
      marketAttractiveness: { score: market, rationale: "Demand, growth and monetization evidence.", evidenceClaimIds: [claimIds[0]] },
      abilityToWin: { score: ability, rationale: "Capability and competitor-gap evidence.", evidenceClaimIds: [claimIds[1]] },
      evidenceConfidence: { score: 78, rationale: "Current mixed-source evidence with explicit unknowns.", evidenceClaimIds: claimIds },
    },
    expertPriority: priority ? { priority, actorRole: "OWNER_EXPERT", rationale: "Portfolio fit and expert judgment.", recordedAt: "2026-08-15T01:00:00.000Z" } : null,
  };
}

const base: NichePortfolioInput = {
  portfolioId: "portfolio-1", portfolioVersion: 1, policyVersion: NICHE_OPPORTUNITY_POLICY_VERSION,
  opportunities: [opportunity("system", "SYSTEM_DISCOVERED", 90, 74), opportunity("expert", "EXPERT_SEEDED", 84, 92)],
};

const comparable = compileNicheOpportunityPortfolio(base);
assert.equal(comparable.decisionState, "PORTFOLIO_COMPARABLE");
assert.equal(comparable.comparison.length, 2);
assert.deepEqual(new Set(comparable.comparison.map((row) => row.origin)), new Set(["SYSTEM_DISCOVERED", "EXPERT_SEEDED"]));
assert.ok(comparable.comparison.every((row) => row.systemRank !== null));
assert.ok(comparable.comparison.every((row) => row.winningCriteria.length > 0));
assert.equal(comparable.rankingPolicy.totalScore, null);
assert.equal("totalScore" in comparable.comparison[0], false);
assert.notEqual(comparable.comparison[0].systemRank, comparable.comparison[0].expertPriority);
assert.ok(base.opportunities[1].researchPlan.supportingQuestions.length && base.opportunities[1].researchPlan.contradictingQuestions.length && base.opportunities[1].researchPlan.unknownQuestions.length);

const hardGate = structuredClone(base);
hardGate.opportunities[0].scorecard.marketAttractiveness.score = 99;
hardGate.opportunities[0].winConditions[0].status = "GAP";
hardGate.opportunities[0].winConditions[0].currentCapabilityLevel = 60;
hardGate.opportunities[0].winConditions[0].gap = 10;
const blocked = compileNicheOpportunityPortfolio(hardGate);
assert.equal(blocked.comparison.find((row) => row.opportunityId === "system")?.eligibility, "BLOCKED_BY_PREREQUISITE");
assert.equal(blocked.comparison.find((row) => row.opportunityId === "system")?.prerequisiteGaps[0], "Reliable primary research");

const prioritized = compileNicheOpportunityPortfolio({ ...base, opportunities: [opportunity("system", "SYSTEM_DISCOVERED", 90, 74, 2), opportunity("expert", "EXPERT_SEEDED", 84, 92, 1)] });
assert.equal(prioritized.decisionState, "EXPERT_PRIORITIZATION_RECORDED");
assert.equal(prioritized.comparison.find((row) => row.opportunityId === "system")?.systemRank, 1);
assert.equal(prioritized.comparison.find((row) => row.opportunityId === "system")?.expertPriority, 2);
assert.equal(prioritized.downstreamGate.state, "BLOCKED");

const invalidResearch = structuredClone(base);
invalidResearch.opportunities[1].researchPlan.contradictingQuestions = [];
assert.ok(compileNicheOpportunityPortfolio(invalidResearch).errors.includes("expert:BALANCED_RESEARCH_PLAN_REQUIRED"));

const crossPortfolio = structuredClone(base);
crossPortfolio.opportunities[0].portfolioId = "portfolio-2";
assert.ok(compileNicheOpportunityPortfolio(crossPortfolio).errors.includes("system:CROSS_PORTFOLIO_REFERENCE"));

const duplicated = compileNicheOpportunityPortfolio({ ...base, opportunities: [base.opportunities[0], base.opportunities[0]] });
assert.ok(duplicated.errors.includes("DUPLICATE_OPPORTUNITY_ID"));
assert.equal(duplicated.comparison.length, 0);

assert.equal(comparable.commandContracts.find((command) => command.command === "SUBMIT_NICHE_HYPOTHESIS")?.activation, "ROUTED_ZERO_SPEND");
assert.ok(comparable.commandContracts.filter((command) => ["SUBMIT_NICHE_HYPOTHESIS", "SELECT_NICHE_FOR_COMMITMENT", "COMMIT_NICHE", "ACTIVATE_CHANNEL_STRATEGY"].includes(command.command)).every((command) => command.activation === "ROUTED_ZERO_SPEND"));
assert.ok(comparable.commandContracts.filter((command) => !["SUBMIT_NICHE_HYPOTHESIS", "SELECT_NICHE_FOR_COMMITMENT", "COMMIT_NICHE", "ACTIVATE_CHANNEL_STRATEGY"].includes(command.command)).every((command) => command.activation === "DECLARED_NOT_ROUTED"));
assert.ok(comparable.commandContracts.every((command) => command.ceilings.providerRequests === 0 && command.ceilings.spendUsd === 0));
assert.equal(isNicheOpportunityTransitionAllowed("COMPARABLE", "EXPERT_PRIORITIZED"), true);
assert.equal(isNicheOpportunityTransitionAllowed("EXPERT_PRIORITIZED", "COMMITTED"), false);
assert.equal(isNicheOpportunityTransitionAllowed("SELECTED_PENDING_COMMITMENT", "COMMITTED"), true);
assert.equal(comparable.improvement.automaticPromotion, false);

console.log("Niche Opportunity Portfolio V2 contract passed 10/10 acceptance groups: comparable portfolio, expert-seeded validation, three separate axes, hard prerequisites, Conditions to Win, independent expert priority, guarded lifecycle, bounded zero-spend hypothesis intake, fail-closed validation and governed improvement.");
