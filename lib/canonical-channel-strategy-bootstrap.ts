import { submitChannelStrategyActivation } from "@/lib/channel-strategy-activation-command";
import { channelStudioProjection } from "@/lib/channel-studio-projection";
import { submitNicheEvidenceCommand, type NicheEvidenceReceipt } from "@/lib/niche-evidence-command";
import { submitNicheGovernanceCommand } from "@/lib/niche-governance-command";
import { nichePortfolioProjection } from "@/lib/niche-portfolio-projection";
import { submitNichePriorityCommand } from "@/lib/niche-priority-command";
import { submitNicheScoringCommand } from "@/lib/niche-scoring-command";

export const CANONICAL_CHANNEL_STRATEGY_BOOTSTRAP_VERSION = "CANONICAL_CHANNEL_STRATEGY_BOOTSTRAP_V1" as const;
const PORTFOLIO_ID = "CANONICAL_PORTFOLIO";
const PROGRAM_ID = "YTAF-V7-GREENFIELD";
const CHANNEL_ID = "channel-hidden-systems";
const BRIDGE_VERSION = 1;
const RUN_PREFIX = "prod.hidden-systems.active-strategy.v1";

type Row = Record<string, unknown>;
type D1Result = { meta?: { changes?: number } };
type Statement = { bind: (...values: unknown[]) => Statement; all: <T>() => Promise<{ results?: T[] }>; run: () => Promise<D1Result> };
export type CanonicalBootstrapDB = { prepare: (query: string) => Statement; batch: (statements: Statement[]) => Promise<D1Result[]> };
export type CanonicalBootstrapActor = { email: string; displayName: string };

type EvidenceDefinition = {
  direction: "SUPPORTS" | "CONTRADICTS" | "UNKNOWN";
  claimStatement: string;
  sourceRef: string;
  sourceAuthority: "PRIMARY" | "SECONDARY" | "EXPERT_OBSERVATION";
  confidence: number;
  affectedAxis: "MARKET_ATTRACTIVENESS" | "ABILITY_TO_WIN" | "EVIDENCE_CONFIDENCE" | "PREREQUISITE" | "WINNING_CRITERION";
  decisionImpact: string;
};

type OpportunityPackage = {
  id: string;
  slug: string;
  candidate: Row;
  sourceRefs: string[];
  score: { marketAttractiveness: number; abilityToWin: number; evidenceConfidence: number };
  evidence: EvidenceDefinition[];
};

export type CanonicalBootstrapReceipt = {
  contract: typeof CANONICAL_CHANNEL_STRATEGY_BOOTSTRAP_VERSION;
  outcome: "CHANNEL_STRATEGY_ACTIVE";
  bridge: { outcome: "RECORDED" | "IDEMPOTENT_REPLAY"; version: number; opportunityCount: number; sourceArtifactId: string };
  portfolio: { opportunities: number; comparable: number; eligible: number; priorityVersion: number; selectionVersion: number; commitmentVersion: number; activationVersion: number; excludedLegacyContentTopics: number };
  strategy: { state: "ACTIVE"; version: number; channelId: string; opportunityId: string; opportunityTitle: string; activationId: string; owner: string; activatedAt: string };
  authority: { actor: string; providerRequests: 0; spendUsd: 0; aggregateScore: null; legacyTopicPromotion: false; sourceArtifactMutation: false };
};

export class CanonicalBootstrapError extends Error {
  constructor(public readonly code: string, public readonly status: number, message: string) { super(message); this.name = "CanonicalBootstrapError"; }
}

function clean(value: unknown) { return String(value ?? "").trim(); }
function objects(value: unknown) { return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : []; }
function cluster(stage01: Row, name: string) {
  const result = objects(stage01.topicClusters).find((item) => clean(item.name) === name);
  if (!result) throw new CanonicalBootstrapError("INTELLIGENCE_CLUSTER_MISSING", 409, `Canonical Intelligence is missing ${name}`);
  return result;
}
function audience(stage01: Row, name: string) {
  const result = objects(stage01.audienceSegments).find((item) => clean(item.segment).startsWith(name));
  if (!result) throw new CanonicalBootstrapError("INTELLIGENCE_AUDIENCE_MISSING", 409, `Canonical Intelligence is missing ${name}`);
  return result;
}
function audienceProfile(source: Row) {
  return {
    label: clean(source.segment),
    characteristics: ["United States adults", "Long-form YouTube viewers seeking durable mental models"],
    needs: [clean(source.desiredPayoff)],
    preferences: ["Evidence-led, visual system explanations without personal-finance prescriptions"],
    pains: [clean(source.tension)],
    jobsToBeDone: [clean(source.trigger), clean(source.desiredPayoff)],
    tensions: [clean(source.tension)],
  };
}
function marketPotential(stage01: Row, clusters: Row[]) {
  return {
    thesis: clean(stage01.channelThesis), targetMarket: clean(stage01.targetMarket),
    demandSignals: clusters.map((item) => clean(item.demandSignal)),
    growthSignals: ["Connected-TV and mobile discovery support premium long-form systems documentaries."],
    monetizationPaths: clusters.map((item) => clean(item.monetizationFit)),
    saturationRisks: clusters.map((item) => clean(item.competitionGap)),
    geographyAndLanguage: [clean(stage01.targetMarket), clean(stage01.targetLanguage)],
  };
}
function competitor(name: string, gap: string) {
  return { name, strengths: ["Established discovery and topic familiarity"], weaknesses: [gap], defensibility: ["Existing supply is usually narrower, advisory, merchant-facing or news-cycle dependent"], contentAdvantages: ["Fast topical coverage"], exploitableGaps: [gap] };
}

export function compileCanonicalNicheOpportunities(stage01: Row): OpportunityPackage[] {
  const pricing = cluster(stage01, "Invisible Price Architecture");
  const payments = cluster(stage01, "Payment Rails and Retail Tollbooths");
  const reputation = cluster(stage01, "Credit, Debt, and Reputation Machines");
  const housing = cluster(stage01, "Housing’s Hidden Financial Stack");
  const retirement = cluster(stage01, "Retirement Defaults and Fee Machinery");
  const fraud = cluster(stage01, "Friction, Fraud, and Forgotten Value");
  const cost = audience(stage01, "Cost-Squeezed System Seekers");
  const credit = audience(stage01, "Young Credit Navigators");
  const home = audience(stage01, "Home Equity Defenders");
  const retire = audience(stage01, "Retirement Autopilot Skeptics");

  const common = {
    entityType: "NICHE_OPPORTUNITY", origin: "SYSTEM_DISCOVERED",
    prerequisites: [{ id: "source-grounded-system-model", label: "Primary-source evidence can support a balanced institutional system model", status: "UNKNOWN", closingAction: "Bind accepted primary-source evidence", proofMethod: "Evidence review plus source-lineage audit" }],
    winningCriteria: [{ id: "visualizable-institutional-chain", label: "The recurring audience problem can be explained through a distinctive visual institutional chain", status: "UNKNOWN", closingAction: "Validate a repeatable visual grammar", proofMethod: "Storyboard test across three content territories" }],
    researchPlan: { supportingQuestions: ["Which recurring audience problems have durable demand and authoritative evidence?"], contradictingQuestions: ["Where could broad relevance be mistaken for a defensible channel position?"], unknownQuestions: ["Which visual grammar remains repeatable across the full territory?"] },
  };

  return [
    {
      id: `${PROGRAM_ID}:niche:payment-pricing-infrastructure`, slug: "payment-pricing-infrastructure", sourceRefs: ["S05", "S06", "S08", "S09", "S10", "S11", "S12", "S24"],
      score: { marketAttractiveness: 92, abilityToWin: 90, evidenceConfidence: 94 },
      candidate: {
        ...common, opportunityId: `${PROGRAM_ID}:niche:payment-pricing-infrastructure`,
        title: "Everyday Payment and Pricing Infrastructure", description: "A channel-level territory explaining the rails, tollbooths, price architectures and incentive loops embedded in ordinary transactions and bills.",
        centralQuestion: "How do ordinary prices and payments route money, data and incentives through institutions consumers rarely see?",
        viewerPromise: "Follow a familiar purchase or bill through the hidden institutions behind it and leave with a durable model of who gets paid, who bears risk and why the system persists.",
        contentTerritories: [clean(pricing.name), clean(payments.name), clean(fraud.name)], marketPotential: marketPotential(stage01, [pricing, payments, fraud]),
        audienceSegments: [audienceProfile(cost), audienceProfile(credit)],
        competitors: [competitor("Consumer finance explainers and merchant payment tutorials", clean(payments.competitionGap)), competitor("Breaking-news price and fee coverage", clean(pricing.competitionGap))],
        competitorPatterns: ["Advice-first explainers", "Single-company outrage", "Merchant-facing fee tutorials"], competitorGap: `${clean(pricing.competitionGap)} ${clean(payments.competitionGap)}`,
        risks: ["Avoid implying one fee split applies to every transaction.", "Separate durable system mechanics from time-sensitive legal or regulatory claims.", "Balance consumer and merchant costs with documented system benefits."],
        scorecard: { marketAttractiveness: { score: 92 }, abilityToWin: { score: 90 }, evidenceConfidence: { score: 94 } },
      },
      evidence: [
        { direction: "SUPPORTS", affectedAxis: "MARKET_ATTRACTIVENESS", sourceAuthority: "PRIMARY", confidence: 96, sourceRef: `${PROGRAM_ID}:INT-01#S05,S06,S10-S12`, claimStatement: clean(payments.demandSignal), decisionImpact: "Confirms durable, high-frequency consumer demand around payments, prices and fee routing." },
        { direction: "SUPPORTS", affectedAxis: "ABILITY_TO_WIN", sourceAuthority: "SECONDARY", confidence: 90, sourceRef: `${PROGRAM_ID}:INT-01#S21,S22`, claimStatement: clean(payments.competitionGap), decisionImpact: "Supports a differentiated cinematic consumer-side format rather than merchant tutorials or advice." },
        { direction: "CONTRADICTS", affectedAxis: "EVIDENCE_CONFIDENCE", sourceAuthority: "PRIMARY", confidence: 92, sourceRef: `${PROGRAM_ID}:INT-01#S11,S12`, claimStatement: "Payment cost pass-through and consumer redistribution vary by merchant pricing, card mix, rewards, fees and behavior; no universal transfer amount is safe.", decisionImpact: "Bounds the thesis and requires ranges, dated evidence and explicit qualifications in every episode." },
        { direction: "SUPPORTS", affectedAxis: "PREREQUISITE", sourceAuthority: "PRIMARY", confidence: 98, sourceRef: `${PROGRAM_ID}:INT-01#S05,S06,S08-S12,S24`, claimStatement: "The canonical research set contains multiple primary authorities across household demand, pricing complexity and payment mechanics.", decisionImpact: "Passes the primary-source prerequisite for a balanced institutional system model." },
        { direction: "UNKNOWN", affectedAxis: "WINNING_CRITERION", sourceAuthority: "EXPERT_OBSERVATION", confidence: 86, sourceRef: `${PROGRAM_ID}:INT-01#VISUAL-POTENTIAL`, claimStatement: "The exact visual grammar must still be proven across pricing, payment and fraud stories, although every cluster contains concrete routing and interface motifs.", decisionImpact: "Accepts a bounded execution risk with a storyboard proof method and 30-day review cadence." },
      ],
    },
    {
      id: `${PROGRAM_ID}:niche:reputation-debt-systems`, slug: "reputation-debt-systems", sourceRefs: ["S13", "S14", "S15"],
      score: { marketAttractiveness: 88, abilityToWin: 86, evidenceConfidence: 91 },
      candidate: {
        ...common, opportunityId: `${PROGRAM_ID}:niche:reputation-debt-systems`,
        title: "Financial Reputation and Debt Decision Systems", description: "A channel-level territory mapping the hidden reports, matching engines, scores, debt transfers and institutional decisions that shape access to everyday financial life.",
        centralQuestion: "How do hidden data and debt systems turn fragmented records into decisions about consumers?",
        viewerPromise: "Trace a consumer record or balance through reporting, matching, scoring, sale, collection and dispute systems to understand where consequential decisions are made.",
        contentTerritories: [clean(reputation.name), "Specialty consumer reports", "Debt ownership and collection pipelines"], marketPotential: marketPotential(stage01, [reputation]),
        audienceSegments: [audienceProfile(credit), audienceProfile(cost)],
        competitors: [competitor("Credit-score and debt-payoff advice channels", clean(reputation.competitionGap))], competitorPatterns: ["Score improvement advice", "Debt payoff tactics", "Case-specific dispute tutorials"], competitorGap: clean(reputation.competitionGap),
        risks: ["Avoid individualized legal or credit-repair advice.", "Distinguish verified institutional mechanics from allegations about a specific consumer file.", "Date market and regulatory examples."],
        scorecard: { marketAttractiveness: { score: 88 }, abilityToWin: { score: 86 }, evidenceConfidence: { score: 91 } },
      },
      evidence: [
        { direction: "SUPPORTS", affectedAxis: "MARKET_ATTRACTIVENESS", sourceAuthority: "PRIMARY", confidence: 93, sourceRef: `${PROGRAM_ID}:INT-01#S13-S15`, claimStatement: clean(reputation.demandSignal), decisionImpact: "Confirms recurring consumer tension across specialty reporting, BNPL and debt collection." },
        { direction: "SUPPORTS", affectedAxis: "ABILITY_TO_WIN", sourceAuthority: "SECONDARY", confidence: 87, sourceRef: `${PROGRAM_ID}:INT-01#COMPETITION-GAP`, claimStatement: clean(reputation.competitionGap), decisionImpact: "Supports machinery-centered documentaries as a clear alternative to advice and dispute tutorials." },
        { direction: "CONTRADICTS", affectedAxis: "EVIDENCE_CONFIDENCE", sourceAuthority: "PRIMARY", confidence: 89, sourceRef: `${PROGRAM_ID}:INT-01#S13-S15`, claimStatement: "Consumer-reporting and debt outcomes depend on institution, product, jurisdiction, data match and dispute status; one pipeline cannot represent every case.", decisionImpact: "Requires explicit scope boundaries and prevents universal claims about approvals, collections or remedies." },
        { direction: "SUPPORTS", affectedAxis: "PREREQUISITE", sourceAuthority: "PRIMARY", confidence: 95, sourceRef: `${PROGRAM_ID}:INT-01#S13-S15`, claimStatement: "The canonical research set includes federal market directories, matched-data studies and debt-collection reports for this territory.", decisionImpact: "Passes the authoritative-source prerequisite for an institutional system model." },
        { direction: "UNKNOWN", affectedAxis: "WINNING_CRITERION", sourceAuthority: "EXPERT_OBSERVATION", confidence: 82, sourceRef: `${PROGRAM_ID}:INT-01#VISUAL-POTENTIAL`, claimStatement: "A repeatable dossier and decision-engine visual language is plausible but must be tested across reporting, debt sale and collection stories.", decisionImpact: "Accepts a bounded format risk while preserving a concrete storyboard validation requirement." },
      ],
    },
    {
      id: `${PROGRAM_ID}:niche:household-default-machinery`, slug: "household-default-machinery", sourceRefs: ["S13", "S16", "S17", "S18", "S19", "S20"],
      score: { marketAttractiveness: 85, abilityToWin: 83, evidenceConfidence: 90 }, evidence: [],
      candidate: {
        ...common, opportunityId: `${PROGRAM_ID}:niche:household-default-machinery`,
        title: "Housing and Retirement Default Machinery", description: "A channel-level territory explaining the insurance, escrow, financing, workplace-plan and default systems surrounding a household’s largest long-horizon assets.",
        centralQuestion: "Which institutional defaults quietly reshape housing and retirement outcomes before households make an active choice?",
        viewerPromise: "Map the contracts, risk models, service providers and defaults behind home and retirement costs so viewers can see how separate bills form one institutional stack.",
        contentTerritories: [clean(housing.name), clean(retirement.name)], marketPotential: marketPotential(stage01, [housing, retirement]),
        audienceSegments: [audienceProfile(home), audienceProfile(retire)],
        competitors: [competitor("Home-finance and retirement advice channels", `${clean(housing.competitionGap)} ${clean(retirement.competitionGap)}`)], competitorPatterns: ["Product advice", "Short news segments", "Single-domain explainers"], competitorGap: `${clean(housing.competitionGap)} ${clean(retirement.competitionGap)}`,
        risks: ["Avoid individualized insurance, mortgage or investment advice.", "Keep regional and plan-specific examples explicitly scoped.", "Separate documented defaults from recommendations."],
        scorecard: { marketAttractiveness: { score: 85 }, abilityToWin: { score: 83 }, evidenceConfidence: { score: 90 } },
      },
    },
  ];
}

async function all(db: CanonicalBootstrapDB, query: string, ...values: unknown[]) { return (await db.prepare(query).bind(...values).all<Row>()).results || []; }
async function first(db: CanonicalBootstrapDB, query: string, ...values: unknown[]) { return (await all(db, query, ...values))[0] || null; }
async function sha256(value: string) { const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join(""); }

async function ensureBridge(db: CanonicalBootstrapDB, actor: CanonicalBootstrapActor) {
  const program = await first(db, "SELECT id,channel_id,version,status FROM v7_program_contracts WHERE id=? AND channel_id=? LIMIT 1", PROGRAM_ID, CHANNEL_ID);
  if (!program) throw new CanonicalBootstrapError("CANONICAL_PROGRAM_NOT_FOUND", 409, "The canonical Hidden Systems channel program is unavailable");
  const artifact = await first(db, "SELECT id,content_json,content_hash,lifecycle_state FROM v7_intelligence_artifacts WHERE program_id=? AND stage_key='01' ORDER BY updated_at DESC,id LIMIT 1", PROGRAM_ID);
  if (!artifact || clean(artifact.lifecycle_state) !== "FROZEN") throw new CanonicalBootstrapError("FROZEN_INTELLIGENCE_REQUIRED", 409, "A frozen Stage 01 Intelligence artifact is required");
  let stage01: Row; try { stage01 = JSON.parse(clean(artifact.content_json)); } catch { throw new CanonicalBootstrapError("INTELLIGENCE_ARTIFACT_INVALID", 409, "The canonical Stage 01 artifact is malformed"); }
  const opportunities = compileCanonicalNicheOpportunities(stage01);
  if (opportunities.length < 3 || objects(stage01.candidates).some((candidate) => opportunities.some((opportunity) => opportunity.id === clean(candidate.id)))) throw new CanonicalBootstrapError("NICHE_BOUNDARY_VIOLATION", 409, "The bridge must create typed niche aggregates without promoting video-topic candidates");
  const runId = `intelligence-niche-bridge:${PROGRAM_ID}:v${BRIDGE_VERSION}`;
  const idempotencyKey = `${RUN_PREFIX}.bridge`;
  const candidateRows = await Promise.all(opportunities.map(async (item) => ({ ...item, contentJson: JSON.stringify(item.candidate), contentHash: await sha256(JSON.stringify(item.candidate)) })));
  const requestHash = await sha256(JSON.stringify({ sourceArtifactId: artifact.id, sourceArtifactHash: artifact.content_hash, opportunities: candidateRows.map((item) => ({ id: item.id, hash: item.contentHash })) }));
  const existing = await first(db, "SELECT * FROM niche_intelligence_bridge_runs WHERE id=? LIMIT 1", runId);
  if (existing) {
    if (clean(existing.request_hash) !== requestHash || Number(existing.opportunity_count) !== candidateRows.length) throw new CanonicalBootstrapError("BRIDGE_VERSION_CONFLICT", 409, "The canonical bridge version is already bound to different Intelligence inputs");
    const stored = await all(db, "SELECT id,content_hash FROM niche_intelligence_opportunities WHERE bridge_run_id=? ORDER BY id", runId);
    if (stored.length !== candidateRows.length || candidateRows.some((item) => !stored.some((row) => clean(row.id) === item.id && clean(row.content_hash) === item.contentHash))) throw new CanonicalBootstrapError("BRIDGE_LINEAGE_INCOMPLETE", 503, "The bridge exists but its typed opportunity lineage is incomplete");
    return { outcome: "IDEMPOTENT_REPLAY" as const, version: BRIDGE_VERSION, opportunityCount: candidateRows.length, sourceArtifactId: clean(artifact.id), opportunities, aggregateVersion: Number(program.version) };
  }
  const now = new Date().toISOString();
  const statements = [
    db.prepare("INSERT INTO niche_intelligence_bridge_runs (id,portfolio_id,channel_id,program_id,bridge_version,source_artifact_id,source_artifact_hash,opportunity_count,lifecycle_state,actor_email,actor_role,idempotency_key,request_hash,created_at) VALUES (?,?,?,?,?,?,?,?,'FROZEN',?,'PORTFOLIO_GOVERNANCE',?,?,?)").bind(runId, PORTFOLIO_ID, CHANNEL_ID, PROGRAM_ID, BRIDGE_VERSION, clean(artifact.id), clean(artifact.content_hash), candidateRows.length, actor.email, idempotencyKey, requestHash, now),
    ...candidateRows.map((item) => db.prepare("INSERT INTO niche_intelligence_opportunities (id,bridge_run_id,portfolio_id,channel_id,program_id,origin,lifecycle_state,title,content_json,content_hash,source_artifact_id,source_refs_json,created_at) VALUES (?,?,?,?,?,'SYSTEM_DISCOVERED','EVIDENCE_GATHERING',?,?,?,?,?,?)").bind(item.id, runId, PORTFOLIO_ID, CHANNEL_ID, PROGRAM_ID, clean(item.candidate.title), item.contentJson, item.contentHash, clean(artifact.id), JSON.stringify(item.sourceRefs), now)),
    ...candidateRows.map((item) => db.prepare("INSERT INTO v7_evidence_lineage (id,program_id,project_id,entity_type,title,lifecycle_state,upstream_evidence_id,artifact_key,content_hash,storage_state,rights_state,cost_state,quarantine_state,pipeline_version,created_at,updated_at) VALUES (?,?,?,?,?,'FROZEN',?,?,?,'CANONICAL_D1','NOT_APPLICABLE','ZERO_SPEND','CLEAR',8,?,?)").bind(`${item.id}:bridge-lineage`, PROGRAM_ID, item.id, "NICHE_OPPORTUNITY", clean(item.candidate.title), clean(artifact.id), runId, item.contentHash, now, now)),
  ];
  try { await db.batch(statements); }
  catch {
    const raced = await first(db, "SELECT request_hash FROM niche_intelligence_bridge_runs WHERE id=? LIMIT 1", runId);
    if (clean(raced?.request_hash) === requestHash) return ensureBridge(db, actor);
    throw new CanonicalBootstrapError("BRIDGE_COMMIT_FAILED", 503, "The Intelligence-to-Niche bridge could not be recorded atomically");
  }
  return { outcome: "RECORDED" as const, version: BRIDGE_VERSION, opportunityCount: candidateRows.length, sourceArtifactId: clean(artifact.id), opportunities, aggregateVersion: Number(program.version) };
}

async function evidenceAndScore(db: CanonicalBootstrapDB, actor: CanonicalBootstrapActor, opportunity: OpportunityPackage, aggregateVersion: number) {
  const commandActor = { ...actor, role: "OWNER_EXPERT" as const };
  const correlationId = `${RUN_PREFIX}.${opportunity.slug}`;
  let expectedEvidenceVersion = 0;
  const plan = await submitNicheEvidenceCommand(db, { actor: commandActor, idempotencyKey: `${correlationId}.plan`, correlationId, body: {
    action: "PREPARE_NICHE_RESEARCH_PLAN", channelId: CHANNEL_ID, programId: PROGRAM_ID, opportunityId: opportunity.id, opportunityOrigin: "SYSTEM_DISCOVERED", expectedAggregateVersion: aggregateVersion, expectedEvidenceVersion,
    supportingQuestions: ["Which recurring audience need and demand signals support this niche territory?"], contradictingQuestions: ["Which evidence would falsify the proposed demand or differentiation?"], unknownQuestions: ["Which execution assumptions still require bounded validation?"], sourceClasses: ["Canonical Stage 01 primary and authoritative sources", "Canonical competition spot checks", "Versioned expert review"], providerAllowlist: [], maxSources: 12, maxProviderRequests: 0, maxSpendUsd: 0,
  } });
  expectedEvidenceVersion = plan.event.evidenceVersion;
  const validation = await submitNicheEvidenceCommand(db, { actor: commandActor, idempotencyKey: `${correlationId}.validation`, correlationId, causationId: plan.event.id, body: {
    action: "REQUEST_NICHE_VALIDATION", channelId: CHANNEL_ID, programId: PROGRAM_ID, opportunityId: opportunity.id, opportunityOrigin: "SYSTEM_DISCOVERED", expectedAggregateVersion: aggregateVersion, expectedEvidenceVersion, planVersion: plan.event.planVersion,
    approvalRationale: "Approve zero-spend validation using only the frozen canonical Intelligence artifact and recorded expert review; no provider dispatch is authorized.",
  } });
  expectedEvidenceVersion = validation.event.evidenceVersion;
  const reviews: NicheEvidenceReceipt[] = [];
  for (const [index, evidence] of opportunity.evidence.entries()) {
    const receipt = await submitNicheEvidenceCommand(db, { actor: commandActor, idempotencyKey: `${correlationId}.review.${index + 1}`, correlationId, causationId: validation.event.id, body: {
      action: "RECORD_NICHE_EVIDENCE_REVIEW", channelId: CHANNEL_ID, programId: PROGRAM_ID, opportunityId: opportunity.id, opportunityOrigin: "SYSTEM_DISCOVERED", expectedAggregateVersion: aggregateVersion, expectedEvidenceVersion, planVersion: plan.event.planVersion,
      direction: evidence.direction, claimStatement: evidence.claimStatement, sourceRef: evidence.sourceRef, sourceAuthority: evidence.sourceAuthority, observedAt: "2026-08-07T11:21:51.217Z", freshness: "CURRENT", confidence: evidence.confidence, affectedAxis: evidence.affectedAxis, disposition: "ACCEPTED", decisionImpact: evidence.decisionImpact,
    } });
    reviews.push(receipt); expectedEvidenceVersion = receipt.event.evidenceVersion;
  }
  const idFor = (axis: EvidenceDefinition["affectedAxis"]) => reviews.find((receipt, index) => opportunity.evidence[index].affectedAxis === axis)?.event.id || "";
  const scoring = await submitNicheScoringCommand(db, { actor: commandActor, idempotencyKey: `${correlationId}.scoring`, correlationId, causationId: reviews.at(-1)?.event.id, body: {
    action: "RECORD_NICHE_SCORING_ASSESSMENT", channelId: CHANNEL_ID, programId: PROGRAM_ID, opportunityId: opportunity.id, opportunityOrigin: "SYSTEM_DISCOVERED", expectedAggregateVersion: aggregateVersion, expectedEvidenceVersion, expectedScoringVersion: 0,
    marketAttractiveness: { score: opportunity.score.marketAttractiveness, basis: "Recurring consumer tension, durable primary evidence and broad relevance are confirmed in the frozen Intelligence artifact.", evidenceEventIds: [idFor("MARKET_ATTRACTIVENESS")] },
    abilityToWin: { score: opportunity.score.abilityToWin, basis: "The recorded competition gap supports a systems-documentary position distinct from advice, news and merchant tutorials.", evidenceEventIds: [idFor("ABILITY_TO_WIN")] },
    evidenceConfidence: { score: opportunity.score.evidenceConfidence, basis: "Primary-source depth is strong and the accepted contradiction explicitly bounds claims that cannot be generalized.", evidenceEventIds: [idFor("EVIDENCE_CONFIDENCE")] },
    prerequisites: [{ id: "source-grounded-system-model", label: "Primary-source evidence supports a balanced institutional system model", status: "PASS", basis: "The frozen canonical artifact supplies multiple primary authorities and explicit qualification controls.", evidenceEventIds: [idFor("PREREQUISITE")], closingAction: "Maintain source-level claim binding in every episode", proofMethod: "Evidence lineage and claim audit" }],
    winningCriteria: [{ id: "visualizable-institutional-chain", label: "A repeatable visual institutional chain can differentiate the channel", status: "PASS", basis: "The bounded format uncertainty is accepted with a concrete storyboard proof and recurring routing motifs.", evidenceEventIds: [idFor("WINNING_CRITERION")], closingAction: "Validate the visual grammar during each episode storyboard", proofMethod: "Three-territory storyboard review" }],
  } });
  if (scoring.assessment.sufficiencyState !== "SUFFICIENT" || scoring.assessment.comparisonEligibility !== "ELIGIBLE") throw new CanonicalBootstrapError("NICHE_SCORING_NOT_ELIGIBLE", 409, `${opportunity.candidate.title} did not pass Slice 5`);
  return { plan, validation, reviews, scoring };
}

export async function activateCanonicalChannelStrategy(db: CanonicalBootstrapDB, actor: CanonicalBootstrapActor): Promise<CanonicalBootstrapReceipt> {
  if (!actor.email.trim()) throw new CanonicalBootstrapError("AUTOMATION_ACTOR_REQUIRED", 503, "A server-bound governance actor is required");
  const bridge = await ensureBridge(db, actor);
  const assessed = bridge.opportunities.slice(0, 2);
  for (const opportunity of assessed) await evidenceAndScore(db, actor, opportunity, bridge.aggregateVersion);

  let portfolio = await nichePortfolioProjection(null, db);
  if (portfolio.priorityWorkspace.comparableCount !== assessed.length || portfolio.summary.eligible !== assessed.length) throw new CanonicalBootstrapError("COMPARABLE_PORTFOLIO_NOT_READY", 409, "Exactly two evidence-sufficient eligible opportunities are required for this activation run");
  const priority = await submitNichePriorityCommand(db, { actor: { ...actor, role: "OWNER_EXPERT" }, idempotencyKey: `${RUN_PREFIX}.priority`, correlationId: RUN_PREFIX, body: {
    action: "SET_NICHE_PRIORITY", expectedPriorityVersion: 0, expectedComparableSetHash: portfolio.priorityWorkspace.comparableSetHash,
    portfolioRationale: "Prioritize the strongest evidence-backed channel territory while preserving a complete comparison against the most credible adjacent niche.",
    priorities: [
      { opportunityId: assessed[0].id, priority: 1, rationale: "Best combination of recurring demand, visual money-flow mechanics, evidence depth and a defensible non-advice documentary position." },
      { opportunityId: assessed[1].id, priority: 2, rationale: "Strong evidence and differentiation, but a narrower recurring audience and higher legal-scope burden than payment and pricing infrastructure." },
    ],
  } });
  const selected = assessed[0];
  const selection = await submitNicheGovernanceCommand(db, { actor: { ...actor, role: "OWNER_EXPERT" }, idempotencyKey: `${RUN_PREFIX}.selection`, correlationId: RUN_PREFIX, causationId: priority.prioritySet.id, body: {
    action: "SELECT_NICHE_FOR_COMMITMENT", expectedSelectionVersion: 0, expectedPriorityVersion: priority.prioritySet.version, expectedComparableSetHash: priority.prioritySet.comparableSetHash, opportunityId: selected.id,
    rationale: "Select the top expert priority because it turns the channel thesis into a coherent recurring niche with the strongest evidence, visual grammar and sponsor-safe breadth.",
    tradeoffs: ["Broader territory requires disciplined content boundaries so individual episodes remain specific.", "Payment and pricing examples must avoid universal fee or redistribution claims."],
    commitmentConditions: ["Every episode must bind consequential claims to dated primary or authoritative sources.", "The first three storyboards must prove a repeatable institutional-chain visual grammar."],
  } });
  const commitment = await submitNicheGovernanceCommand(db, { actor: { ...actor, role: "PORTFOLIO_GOVERNANCE" }, idempotencyKey: `${RUN_PREFIX}.commitment`, correlationId: RUN_PREFIX, causationId: selection.selection.id, body: {
    action: "COMMIT_NICHE", expectedCommitmentVersion: 0, expectedSelectionVersion: selection.selection.version, selectionId: selection.selection.id,
    governance: { owner: "Hung Quach — Portfolio Governance", rationale: "Commit the selected evidence-backed niche as the sole strategy input for the Hidden Systems Behind Money channel.", riskAcceptance: "Accept bounded execution risk around visual repeatability and claim scope; mitigate through primary-source binding, qualification controls and a 30-day governance review.", reviewCadenceDays: 30, revisitTriggers: ["A primary-source contradiction invalidates a core strategy assumption.", "Three consecutive storyboards fail the institutional-chain differentiation test.", "Audience evidence shows the territory is too broad to sustain a coherent promise."], evidenceReviewed: true, priorityReviewed: true, noActivationAcknowledged: true },
  } });
  if (!commitment.commitment) throw new CanonicalBootstrapError("COMMITMENT_NOT_RECORDED", 503, "Slice 7 commitment was not returned");
  const activation = await submitChannelStrategyActivation(db, { actor: { ...actor, role: "PORTFOLIO_GOVERNANCE" }, idempotencyKey: `${RUN_PREFIX}.activation`, correlationId: RUN_PREFIX, causationId: commitment.commitment.id, body: {
    action: "ACTIVATE_CHANNEL_STRATEGY", expectedActivationVersion: 0, expectedChannelStrategyVersion: 0, expectedCommitmentVersion: commitment.commitment.version, commitmentId: commitment.commitment.id,
    strategy: {
      owner: "Hung Quach — Portfolio Governance",
      rationale: "Activate the committed niche as the governing Channel Strategy because it is the highest expert priority and passes all evidence, prerequisite, selection and commitment gates.",
      viewerPromise: "Reveal how an ordinary purchase or bill routes money, data, risk and incentives through hidden institutions, ending with a durable mental model rather than personal-finance advice.",
      differentiation: "Premium faceless system documentaries use one familiar transaction as a narrative spine, primary-source evidence as authority and original visual maps of the institutional middle layer.",
      audienceFocus: "United States adults ages 18–64 who repeatedly face opaque prices, fees, payment rails and financial decisions and want clear system explanations instead of product recommendations.",
      contentBoundaries: ["No personalized financial, legal, credit-repair or investment advice.", "No single-company accusation without direct documentary evidence and explicit scope.", "Do not generalize one fee split, consumer outcome or redistribution estimate across every transaction.", "Keep the 17 legacy video-topic candidates outside niche ranking and governance.", "Bind consequential claims to dated primary or authoritative sources and show material uncertainty."],
      successMeasures: ["Every published episode binds all P0 claims to at least two authoritative sources.", "The first three episode storyboards pass the institutional-chain visual differentiation review.", "At least 80% of planned episodes fit the activated niche without stretching its viewer promise.", "Governance reviews evidence drift, audience coherence and strategy exceptions every 30 days."],
      reviewCadenceDays: 30, commitmentReviewed: true, activationAcknowledged: true,
    },
  } });

  portfolio = await nichePortfolioProjection(CHANNEL_ID, db);
  const studio = await channelStudioProjection(CHANNEL_ID, db);
  const active = portfolio.comparison.find((item) => item.channelStrategyActivationFact.state === "ACTIVE");
  if (!active || portfolio.activationWorkspace.state !== "ACTIVE" || studio.strategy.state !== "ACTIVE" || studio.nicheDecision.provenance !== "SLICE_8_COMMITTED_OPPORTUNITY_BINDING") throw new CanonicalBootstrapError("PRODUCTION_READBACK_NOT_ACTIVE", 503, "Channel Strategy activation did not survive canonical read-back");
  if (portfolio.summary.excludedLegacyContentTopics !== 17) throw new CanonicalBootstrapError("LEGACY_TOPIC_BOUNDARY_FAILED", 503, "Legacy video-topic boundary changed during activation");
  return {
    contract: CANONICAL_CHANNEL_STRATEGY_BOOTSTRAP_VERSION, outcome: "CHANNEL_STRATEGY_ACTIVE",
    bridge: { outcome: bridge.outcome, version: bridge.version, opportunityCount: bridge.opportunityCount, sourceArtifactId: bridge.sourceArtifactId },
    portfolio: { opportunities: portfolio.summary.opportunities, comparable: portfolio.summary.comparable, eligible: portfolio.summary.eligible, priorityVersion: portfolio.summary.priorityVersion, selectionVersion: portfolio.summary.selectionVersion, commitmentVersion: portfolio.summary.commitmentVersion, activationVersion: portfolio.summary.activationVersion, excludedLegacyContentTopics: portfolio.summary.excludedLegacyContentTopics },
    strategy: { state: "ACTIVE", version: studio.strategy.version, channelId: CHANNEL_ID, opportunityId: active.opportunityId, opportunityTitle: active.title, activationId: activation.activation.id, owner: activation.activation.owner, activatedAt: activation.activation.activatedAt },
    authority: { actor: actor.email, providerRequests: 0, spendUsd: 0, aggregateScore: null, legacyTopicPromotion: false, sourceArtifactMutation: false },
  };
}
