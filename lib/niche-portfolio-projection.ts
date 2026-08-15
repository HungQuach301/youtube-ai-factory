import type { NicheOpportunityProjection, NichePortfolioProjection, PortfolioAudience, PortfolioAxis, PortfolioCompetitor, PortfolioCondition } from "@/app/niche-portfolio-contract";
import { NICHE_OPPORTUNITY_POLICY_VERSION } from "@/lib/niche-opportunity-portfolio-contract";
import { ChannelNotFoundError } from "@/lib/portfolio-projection";

type Statement = { bind: (...values: unknown[]) => Statement; all: <T>() => Promise<{ results?: T[] }> };
type DB = { prepare: (query: string) => Statement };
type RuntimeEnv = { DB?: DB };
type Row = Record<string, unknown>;

async function database() {
  const { env } = await import("cloudflare:workers");
  const runtime = env as unknown as RuntimeEnv;
  if (!runtime.DB) throw new Error("Canonical database binding is unavailable");
  return runtime.DB;
}
async function rows(db: DB, query: string, ...values: unknown[]) { return (await db.prepare(query).bind(...values).all<Row>()).results || []; }
function text(value: unknown) { return String(value ?? "").trim(); }
function numberOrNull(value: unknown) { const parsed = Number(value); return value !== null && value !== undefined && value !== "" && Number.isFinite(parsed) ? parsed : null; }
function record(value: unknown): Row { return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {}; }
function objects(value: unknown) { return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : []; }
function strings(value: unknown) {
  if (Array.isArray(value)) return value.flatMap((item) => typeof item === "string" || typeof item === "number" ? [text(item)] : []).filter(Boolean);
  const single = text(value); return single ? [single] : [];
}
function unique(values: string[]) { return [...new Set(values.map((value) => value.trim()).filter(Boolean))]; }
function nested(row: Row, ...keys: string[]) { let value: unknown = row; for (const key of keys) value = record(value)[key]; return value; }
function resolvedClaim(value: unknown) { return /VERIFIED|RESOLVED|PASS|CONTROLLED|APPROVED/i.test(text(value)); }
function parseArtifact(row: Row | undefined) {
  if (!row) return null;
  const parsed = JSON.parse(text(row.content_json));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(`Artifact ${text(row.id)} has an invalid canonical payload`);
  return parsed as Row;
}
function parseJsonArray(value: unknown) {
  try { return strings(JSON.parse(text(value))); }
  catch { return []; }
}
function axis(candidate: Row, key: "marketAttractiveness" | "abilityToWin" | "evidenceConfidence", derivedEvidence: number): PortfolioAxis {
  const explicit = numberOrNull(nested(candidate, "scorecard", key, "score")) ?? numberOrNull(candidate[key]);
  if (explicit !== null && explicit >= 0 && explicit <= 100) return { score: explicit, state: "RECORDED", basis: `Canonical ${key} field` };
  if (key === "evidenceConfidence") return { score: derivedEvidence, state: "COMPATIBILITY_DERIVED", basis: "Passed V1 foundation gates ÷ five; not a V2 claim-level score" };
  return { score: null, state: "NOT_RECORDED", basis: `Canonical V1 does not separately record ${key}` };
}
function coverage(present: number, expected: number) { return present === 0 ? "MISSING" as const : present >= expected ? "RECORDED" as const : "PARTIAL" as const; }
function condition(item: unknown, id: string): PortfolioCondition | null {
  if (typeof item === "string") return { id, label: item, rationale: null, status: "UNKNOWN", gap: null, closingAction: null, proofMethod: null };
  const source = record(item), label = text(source.label) || text(source.title) || text(source.condition);
  if (!label) return null;
  const rawStatus = text(source.status).toUpperCase();
  return {
    id: text(source.id) || id, label, rationale: text(source.rationale) || null,
    status: rawStatus === "PASS" ? "PASS" : rawStatus === "GAP" ? "GAP" : "UNKNOWN",
    gap: numberOrNull(source.gap), closingAction: text(source.closingAction) || text(source.action) || null,
    proofMethod: text(source.proofMethod) || text(source.proof) || null,
  };
}
function conditions(candidate: Row, kind: "PREREQUISITE" | "WINNING_CRITERION") {
  const direct = kind === "PREREQUISITE" ? candidate.prerequisites : candidate.winningCriteria;
  const combined = Array.isArray(direct) ? direct : objects(candidate.winConditions).filter((item) => text(item.kind) === kind);
  return (Array.isArray(combined) ? combined : []).map((item, index) => condition(item, `${kind.toLowerCase()}:${index + 1}`)).filter((item): item is PortfolioCondition => Boolean(item));
}
function audience(source: Row): PortfolioAudience {
  return {
    label: text(source.label) || text(source.segment) || text(source.title) || "Unlabelled audience segment",
    characteristics: strings(source.characteristics), needs: strings(source.needs), preferences: strings(source.preferences), pains: strings(source.pains),
    jobsToBeDone: strings(source.jobsToBeDone), tensions: unique([...strings(source.tensions), ...strings(source.tension)]),
  };
}
function competitor(source: Row): PortfolioCompetitor {
  return {
    name: text(source.name) || text(source.title) || "Unlabelled competitor",
    strengths: strings(source.strengths), weaknesses: strings(source.weaknesses), defensibility: strings(source.defensibility),
    contentAdvantages: strings(source.contentAdvantages), exploitableGaps: unique([...strings(source.exploitableGaps), ...strings(source.gaps)]),
  };
}
function marketSignals(candidate: Row, stage01: Row) {
  const potential = record(candidate.marketPotential);
  const clusters = objects(stage01.topicClusters);
  return {
    thesis: text(potential.thesis) || text(stage01.channelThesis) || null,
    targetMarket: text(potential.targetMarket) || text(stage01.targetMarket) || null,
    demandSignals: unique([...strings(potential.demandSignals), ...strings(candidate.demandSignals), ...clusters.flatMap((item) => strings(item.demandSignal))]),
    growthSignals: unique([...strings(potential.growthSignals), ...strings(candidate.growthSignals), ...clusters.flatMap((item) => strings(item.growthSignal))]),
    monetizationPaths: unique([...strings(potential.monetizationPaths), ...strings(candidate.monetizationPaths)]),
    saturationRisks: unique([...strings(potential.saturationRisks), ...strings(candidate.saturationRisks)]),
    geographyAndLanguage: unique([...strings(potential.geographyAndLanguage), text(stage01.targetMarket), text(stage01.targetLanguage)]),
  };
}

export async function nichePortfolioProjection(channelId?: string | null, databaseOverride?: DB): Promise<NichePortfolioProjection> {
  const db = databaseOverride || await database();
  const channelRows = await rows(db, "SELECT id,name,market,language,created_at FROM channels ORDER BY created_at,id");
  if (channelId && !channelRows.some((channel) => text(channel.id) === channelId)) throw new ChannelNotFoundError(`Channel ${channelId} does not exist`);
  const selectedChannels = channelId ? channelRows.filter((channel) => text(channel.id) === channelId) : channelRows;
  const allPrograms = await rows(db, "SELECT id,channel_id,version,status,updated_at FROM v7_program_contracts ORDER BY updated_at DESC,id");
  const latestPrograms = new Map<string, Row>();
  for (const program of allPrograms) if (!latestPrograms.has(text(program.channel_id))) latestPrograms.set(text(program.channel_id), program);
  const programs = selectedChannels.map((channel) => latestPrograms.get(text(channel.id))).filter((item): item is Row => Boolean(item));
  const programIds = programs.map((program) => text(program.id));
  const placeholders = programIds.map(() => "?").join(",");
  const [artifacts, sources, claims, hypotheses] = programIds.length ? await Promise.all([
    rows(db, `SELECT id,program_id,stage_key,lifecycle_state,content_json,updated_at FROM v7_intelligence_artifacts WHERE program_id IN (${placeholders}) ORDER BY updated_at DESC,id`, ...programIds),
    rows(db, `SELECT id,program_id,stage_key,authority_tier,verification_state FROM v7_intelligence_sources WHERE program_id IN (${placeholders})`, ...programIds),
    rows(db, `SELECT id,program_id,risk_level,status FROM v7_claim_nodes WHERE program_id IN (${placeholders})`, ...programIds),
    rows(db, `SELECT * FROM niche_hypotheses WHERE program_id IN (${placeholders}) ORDER BY created_at,id`, ...programIds),
  ]) : [[], [], [], []];

  const comparison: NicheOpportunityProjection[] = [];
  const notes: string[] = [];
  for (const channel of selectedChannels) {
    const program = latestPrograms.get(text(channel.id));
    if (!program) { notes.push(`Channel ${text(channel.name) || text(channel.id)} has no canonical program.`); continue; }
    const programArtifacts = artifacts.filter((item) => text(item.program_id) === text(program.id));
    const stage01Row = programArtifacts.find((item) => text(item.stage_key) === "01");
    const stage02Row = programArtifacts.find((item) => text(item.stage_key) === "02");
    const stage01 = parseArtifact(stage01Row);
    const stage02 = parseArtifact(stage02Row) || {};
    if (!stage01 || !stage01Row) { notes.push(`Channel ${text(channel.name) || text(channel.id)} has no canonical Stage 01 artifact.`); continue; }
    const programSources = sources.filter((item) => text(item.program_id) === text(program.id));
    const verifiedSources = programSources.filter((item) => /VERIFIED|WEB_GROUNDED|CONTROLLED/i.test(text(item.verification_state))).length;
    const primarySources = programSources.filter((item) => text(item.authority_tier) === "TIER_1_PRIMARY").length;
    const unresolvedP0Claims = claims.filter((item) => text(item.program_id) === text(program.id) && text(item.risk_level) === "P0" && !resolvedClaim(item.status)).length;
    const contradictionRows = objects(stage01.contradictions);
    const contradictionsReviewed = stage01.contradictionsReviewed === true || (contradictionRows.length > 0 && contradictionRows.every((item) => resolvedClaim(item.status)));
    const foundationGates = [text(stage01Row.lifecycle_state) === "FROZEN", verifiedSources >= 10, primarySources >= 3, unresolvedP0Claims === 0, contradictionsReviewed];
    const derivedEvidence = Math.round(foundationGates.filter(Boolean).length / foundationGates.length * 100);
    const stageAudiences = objects(stage01.audienceSegments).map(audience);
    const stageCompetitors = objects(stage02.references).map(competitor);
    const patterns = strings(stage02.crossReferencePatterns);
    const gap = text(stage02.gapStatement) || null;
    const champion = record(stage01.champion);
    const championTitle = text(champion.title);
    const sortedCandidates = objects(stage01.candidates).map((candidate, originalIndex) => ({ candidate, originalIndex })).sort((a, b) => (numberOrNull(b.candidate.score) ?? -1) - (numberOrNull(a.candidate.score) ?? -1) || a.originalIndex - b.originalIndex);
    sortedCandidates.forEach(({ candidate }, index) => {
      const opportunityId = `${text(stage01Row.id)}:${index + 1}`;
      const market = marketSignals(candidate, stage01);
      const candidateAudiences = objects(candidate.audienceSegments).map(audience);
      const candidateCompetitors = objects(candidate.competitors).map(competitor);
      const audiences = candidateAudiences.length ? candidateAudiences : stageAudiences;
      const competitors = candidateCompetitors.length ? candidateCompetitors : stageCompetitors;
      const prerequisites = conditions(candidate, "PREREQUISITE");
      const winningCriteria = conditions(candidate, "WINNING_CRITERION");
      const axes = {
        marketAttractiveness: axis(candidate, "marketAttractiveness", derivedEvidence),
        abilityToWin: axis(candidate, "abilityToWin", derivedEvidence),
        evidenceConfidence: axis(candidate, "evidenceConfidence", derivedEvidence),
      };
      const researchPlan = record(candidate.researchPlan);
      const plan = {
        supportingQuestions: strings(researchPlan.supportingQuestions), contradictingQuestions: strings(researchPlan.contradictingQuestions), unknownQuestions: strings(researchPlan.unknownQuestions),
        balanced: false,
      };
      plan.balanced = Boolean(plan.supportingQuestions.length && plan.contradictingQuestions.length && plan.unknownQuestions.length);
      const marketPresence = [market.demandSignals.length, market.growthSignals.length, market.monetizationPaths.length, market.saturationRisks.length].filter(Boolean).length;
      const audiencePresence = audiences.length ? audiences.flatMap((item) => [item.characteristics.length, item.needs.length, item.preferences.length, item.pains.length, item.jobsToBeDone.length, item.tensions.length]).filter(Boolean).length : 0;
      const competitorPresence = competitors.length ? competitors.flatMap((item) => [item.strengths.length, item.weaknesses.length, item.defensibility.length, item.contentAdvantages.length, item.exploitableGaps.length]).filter(Boolean).length : 0;
      const conditionsPresence = Number(prerequisites.length > 0) + Number(winningCriteria.length > 0);
      const axesPresence = Object.values(axes).filter((item) => item.state === "RECORDED").length;
      const comparable = axesPresence === 3 && marketPresence >= 2 && audiencePresence >= 3 && competitorPresence >= 2 && conditionsPresence === 2 && plan.balanced && derivedEvidence >= 60;
      const prerequisiteBlocked = prerequisites.some((item) => item.status !== "PASS");
      const expertPriority = numberOrNull(candidate.expertPriority);
      const eligibility = !comparable ? "RESEARCH_REQUIRED" : prerequisiteBlocked ? "BLOCKED_BY_PREREQUISITE" : "ELIGIBLE";
      comparison.push({
        opportunityId, channel: { id: text(channel.id), name: text(channel.name), market: text(channel.market), language: text(channel.language) },
        program: { id: text(program.id), version: Math.max(1, numberOrNull(program.version) ?? 1) }, title: text(candidate.title) || `Unlabelled niche opportunity ${index + 1}`,
        description: text(candidate.description) || null, viewerPromise: text(candidate.viewerPromise) || null, centralQuestion: text(candidate.centralQuestion) || null,
        origin: text(candidate.origin) === "EXPERT_SEEDED" ? "EXPERT_SEEDED" : "SYSTEM_DISCOVERED",
        lifecycleState: expertPriority !== null && comparable ? "EXPERT_PRIORITIZED" : comparable ? "COMPARABLE" : "EVIDENCE_GATHERING",
        eligibility, systemRank: index + 1, systemRankBasis: "CANONICAL_V1_CANDIDATE_ORDER", expertPriority,
        expertPriorityBasis: expertPriority === null ? "NOT_RECORDED" : "RECORDED_IN_SOURCE", axes, legacyScore: numberOrNull(candidate.score),
        hypothesis: { version: null, rationale: null, audienceAssumptions: [], demandAssumptions: [], knownCompetitors: [], winningThesis: null, submittedBy: null, createdAt: null }, marketPotential: market,
        audiences, competitors, competitorPatterns: patterns, competitorGap: gap, prerequisites, winningCriteria,
        risks: text(candidate.title) === championTitle ? strings(champion.risks) : strings(candidate.risks), researchPlan: plan,
        evidence: { artifactId: text(stage01Row.id), artifactState: text(stage01Row.lifecycle_state), verifiedSources, primarySources, unresolvedP0Claims, contradictionsReviewed },
        coverage: {
          marketPotential: coverage(marketPresence, 4), audience: coverage(audiencePresence, 5), competitor: coverage(competitorPresence, 4),
          conditionsToWin: coverage(conditionsPresence, 2), threeAxisScorecard: coverage(axesPresence, 3),
        },
        allowedNextActions: eligibility === "RESEARCH_REQUIRED" ? ["PREPARE_NICHE_RESEARCH_PLAN", "REQUEST_NICHE_VALIDATION"] : eligibility === "BLOCKED_BY_PREREQUISITE" ? ["REVIEW_CAPABILITY_GAPS", "REQUEST_NICHE_PILOT"] : ["SET_NICHE_PRIORITY", "REQUEST_NICHE_PILOT"],
      });
    });
  }
  for (const hypothesis of hypotheses) {
    const channel = selectedChannels.find((item) => text(item.id) === text(hypothesis.channel_id));
    const program = programs.find((item) => text(item.id) === text(hypothesis.program_id));
    if (!channel || !program) { notes.push(`Expert hypothesis ${text(hypothesis.id)} has an invalid channel/program binding.`); continue; }
    comparison.push({
      opportunityId: text(hypothesis.id),
      channel: { id: text(channel.id), name: text(channel.name), market: text(channel.market), language: text(channel.language) },
      program: { id: text(program.id), version: Math.max(1, numberOrNull(program.version) ?? 1) },
      title: text(hypothesis.title) || "Unlabelled expert hypothesis", description: text(hypothesis.description) || null,
      viewerPromise: null, centralQuestion: null, origin: "EXPERT_SEEDED", lifecycleState: "EVIDENCE_GATHERING", eligibility: "RESEARCH_REQUIRED",
      systemRank: null, systemRankBasis: "UNRANKED_EXPERT_HYPOTHESIS", expertPriority: null, expertPriorityBasis: "NOT_RECORDED",
      axes: {
        marketAttractiveness: { score: null, state: "NOT_RECORDED", basis: "Expert demand assumptions are not market evidence" },
        abilityToWin: { score: null, state: "NOT_RECORDED", basis: "A winning thesis is not validated ability-to-win evidence" },
        evidenceConfidence: { score: null, state: "NOT_RECORDED", basis: "No evidence review has been recorded" },
      },
      legacyScore: null,
      hypothesis: {
        version: numberOrNull(hypothesis.hypothesis_version), rationale: text(hypothesis.rationale) || null,
        audienceAssumptions: parseJsonArray(hypothesis.audience_assumptions_json), demandAssumptions: parseJsonArray(hypothesis.demand_assumptions_json),
        knownCompetitors: parseJsonArray(hypothesis.known_competitors_json), winningThesis: text(hypothesis.winning_thesis) || null,
        submittedBy: text(hypothesis.actor_display_name) || text(hypothesis.actor_email) || null, createdAt: text(hypothesis.created_at) || null,
      },
      marketPotential: { thesis: null, targetMarket: null, demandSignals: [], growthSignals: [], monetizationPaths: [], saturationRisks: [], geographyAndLanguage: [] },
      audiences: [], competitors: [], competitorPatterns: [], competitorGap: null, prerequisites: [], winningCriteria: [], risks: [],
      researchPlan: { supportingQuestions: [], contradictingQuestions: [], unknownQuestions: [], balanced: false },
      evidence: { artifactId: text(hypothesis.id), artifactState: "HYPOTHESIS_SUBMITTED", verifiedSources: 0, primarySources: 0, unresolvedP0Claims: 0, contradictionsReviewed: false },
      coverage: { marketPotential: "MISSING", audience: "MISSING", competitor: "MISSING", conditionsToWin: "MISSING", threeAxisScorecard: "MISSING" },
      allowedNextActions: ["PREPARE_NICHE_RESEARCH_PLAN"],
    });
  }
  comparison.sort((a, b) => {
    const order = { ELIGIBLE: 0, BLOCKED_BY_PREREQUISITE: 1, RESEARCH_REQUIRED: 2 };
    return order[a.eligibility] - order[b.eligibility]
      || (b.axes.marketAttractiveness.score ?? -1) - (a.axes.marketAttractiveness.score ?? -1)
      || (b.axes.abilityToWin.score ?? -1) - (a.axes.abilityToWin.score ?? -1)
      || (b.axes.evidenceConfidence.score ?? -1) - (a.axes.evidenceConfidence.score ?? -1)
      || a.channel.name.localeCompare(b.channel.name) || (a.systemRank ?? Number.MAX_SAFE_INTEGER) - (b.systemRank ?? Number.MAX_SAFE_INTEGER)
      || (a.hypothesis.version ?? 0) - (b.hypothesis.version ?? 0);
  });
  const comparable = comparison.filter((item) => item.lifecycleState !== "EVIDENCE_GATHERING");
  const prioritiesRecorded = comparable.length >= 2 && comparable.every((item) => item.expertPriority !== null);
  return {
    contract: "NICHE_PORTFOLIO_PROJECTION_V2", policyVersion: NICHE_OPPORTUNITY_POLICY_VERSION, generatedAt: new Date().toISOString(),
    sourceState: "CANONICAL_V7_WITH_EXPERT_HYPOTHESIS_APPEND", scope: { mode: channelId ? "CHANNEL" : "PORTFOLIO", channelId: channelId || null },
    channels: channelRows.map((channel) => ({ id: text(channel.id), name: text(channel.name), market: text(channel.market), language: text(channel.language) })),
    intakeContexts: programs.map((program) => {
      const channel = selectedChannels.find((item) => text(item.id) === text(program.channel_id));
      const latestHypothesisVersion = hypotheses.filter((item) => text(item.program_id) === text(program.id)).reduce((latest, item) => Math.max(latest, numberOrNull(item.hypothesis_version) ?? 0), 0);
      return { channelId: text(program.channel_id), channelName: text(channel?.name) || text(program.channel_id), programId: text(program.id), aggregateVersion: Math.max(1, numberOrNull(program.version) ?? 1), expectedHypothesisVersion: latestHypothesisVersion };
    }),
    decisionState: comparable.length < 2 ? "RESEARCH_IN_PROGRESS" : prioritiesRecorded ? "EXPERT_PRIORITIZATION_RECORDED" : "PORTFOLIO_COMPARABLE",
    summary: {
      opportunities: comparison.length, comparable: comparable.length, eligible: comparison.filter((item) => item.eligibility === "ELIGIBLE").length,
      blockedByPrerequisite: comparison.filter((item) => item.eligibility === "BLOCKED_BY_PREREQUISITE").length,
      researchRequired: comparison.filter((item) => item.eligibility === "RESEARCH_REQUIRED").length, expertSeeded: comparison.filter((item) => item.origin === "EXPERT_SEEDED").length,
    }, comparison,
    rankingPolicy: { systemRank: "CANONICAL_V1_CANDIDATE_ORDER_WITH_UNRANKED_EXPERT_INPUTS", expertPriority: "SEPARATE_VERSIONED_FACT", totalScore: null, note: "The bridge preserves legacy research order while expert inputs remain unranked until evidence validation. Neither becomes a V2 total score." },
    authority: { activation: "BOUNDED_HYPOTHESIS_INTAKE", v2Commands: "SUBMIT_NICHE_HYPOTHESIS_ROUTED_ZERO_SPEND", providerRequests: 0, spendUsd: 0, hypothesisAppend: true, comparisonMutation: false, channelNicheMutation: false },
    downstreamGate: { consumer: "CHANNEL_STRATEGY", state: "BLOCKED", reason: "Hypothesis intake creates research-required inputs only; expert priority, selection, commitment and strategy activation remain separate commands." },
    integrity: { state: notes.length ? "RECONCILIATION_REQUIRED" : "READY", notes },
  };
}
