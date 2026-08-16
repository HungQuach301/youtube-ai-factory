import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const route = await readFile(new URL("../app/api/factory/material-production/route.ts", import.meta.url), "utf8");
const page = await readFile(new URL("../app/material-production/page.tsx", import.meta.url), "utf8");
const home = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const shell = await readFile(new URL("../app/factory-shell.tsx", import.meta.url), "utf8");
const portfolioRoute = await readFile(new URL("../app/api/factory/portfolio/route.ts", import.meta.url), "utf8");
const channelRoute = await readFile(new URL("../app/api/factory/channels/[id]/route.ts", import.meta.url), "utf8");
const portfolioProjection = await readFile(new URL("../lib/portfolio-projection.ts", import.meta.url), "utf8");
const discoveryRoute = await readFile(new URL("../app/api/factory/discovery/route.ts", import.meta.url), "utf8");
const discoveryProjection = await readFile(new URL("../lib/discovery-projection.ts", import.meta.url), "utf8");
const nichePortfolioRoute = await readFile(new URL("../app/api/factory/niche-portfolio/route.ts", import.meta.url), "utf8");
const nichePortfolioProjection = await readFile(new URL("../lib/niche-portfolio-projection.ts", import.meta.url), "utf8");
const nichePortfolioView = await readFile(new URL("../app/niche-portfolio-view.tsx", import.meta.url), "utf8");
const discoveryView = await readFile(new URL("../app/discovery-view.tsx", import.meta.url), "utf8");
const portfolioCss = await readFile(new URL("../app/portfolio.css", import.meta.url), "utf8");
const nicheHypothesisRoute = await readFile(new URL("../app/api/factory/niche-hypotheses/route.ts", import.meta.url), "utf8");
const nicheHypothesisCommand = await readFile(new URL("../lib/niche-hypothesis-command.ts", import.meta.url), "utf8");
const nicheScoringRoute = await readFile(new URL("../app/api/factory/niche-scoring/route.ts", import.meta.url), "utf8");
const nicheScoringCommand = await readFile(new URL("../lib/niche-scoring-command.ts", import.meta.url), "utf8");
const nichePriorityRoute = await readFile(new URL("../app/api/factory/niche-priorities/route.ts", import.meta.url), "utf8");
const nichePriorityCommand = await readFile(new URL("../lib/niche-priority-command.ts", import.meta.url), "utf8");
const strategyActivationRoute = await readFile(new URL("../app/api/factory/channel-strategy-activations/route.ts", import.meta.url), "utf8");
const strategyActivationCommand = await readFile(new URL("../lib/channel-strategy-activation-command.ts", import.meta.url), "utf8");
const intelligenceNicheWorkflow = await readFile(new URL("../lib/intelligence-niche-workflow-contract.ts", import.meta.url), "utf8");
const nichePortfolioV2 = await readFile(new URL("../lib/niche-opportunity-portfolio-contract.ts", import.meta.url), "utf8");
const studioRoute = await readFile(new URL("../app/api/factory/channel-studio/route.ts", import.meta.url), "utf8");
const studioProjection = await readFile(new URL("../lib/channel-studio-projection.ts", import.meta.url), "utf8");
const marketPage = await readFile(new URL("../app/market-intelligence/page.tsx", import.meta.url), "utf8");
const nichePage = await readFile(new URL("../app/niche-discovery/page.tsx", import.meta.url), "utf8");
const studioPage = await readFile(new URL("../app/channel-studio/page.tsx", import.meta.url), "utf8");
const contentPlanningContract = await readFile(new URL("../app/content-planning-contract.ts", import.meta.url), "utf8");
const contentAutopilotCommand = await readFile(new URL("../lib/content-autopilot-command.ts", import.meta.url), "utf8");
const contentAutopilotRoute = await readFile(new URL("../app/api/factory/content-autopilot/route.ts", import.meta.url), "utf8");
const canonicalContentBootstrap = await readFile(new URL("../lib/canonical-content-autopilot-bootstrap.ts", import.meta.url), "utf8");
const contentMigration = await readFile(new URL("../drizzle/0038_clean_dexter_bennett.sql", import.meta.url), "utf8");

test("the canonical shell is portfolio-first without replacing the protected production workspace", () => {
  assert.doesNotMatch(home, /export \{ default \} from "\.\/material-production\/page"/);
  assert.match(home, /Operate channels, not isolated videos/);
  assert.match(home, /\/api\/factory\/portfolio/);
  assert.match(home, /No sample channels were generated/);
  assert.match(page, /import Image from "next\/image"/);
  assert.match(page, /productionBatch/);
  assert.match(page, /previewUrl/);
  assert.match(page, /Preflight and start Batch 2/);
});

test("the canonical shell exposes connected factory capabilities and preserves protected routes", () => {
  for (const href of ["/", "/market-intelligence", "/niche-discovery", "/channel-studio", "/control-plane", "/continuity", "/settings"]) assert.match(shell, new RegExp(href.replaceAll("/", "\\/")));
  assert.match(shell, /No demo or local fallback was substituted/);
  assert.match(shell, /Skip to main content/);
  assert.match(shell, /aria-current=/);
  assert.match(shell, /id="main-content"/);
  assert.match(shell, /role="status"/);
  assert.match(home, /role="progressbar"/);
  for (const acceptedPage of [marketPage, nichePage, studioPage]) {
    assert.doesNotMatch(acceptedPage, /fallback=\{null\}/);
    assert.match(acceptedPage, /ProjectionState loading/);
  }
});

test("portfolio and channel detail are GET-only fail-closed canonical projections", () => {
  assert.match(portfolioRoute, /cache-control": "no-store"/);
  assert.match(channelRoute, /ChannelNotFoundError \? 404 : 503/);
  assert.doesNotMatch(portfolioRoute + channelRoute, /export async function (POST|PATCH|DELETE)/);
  assert.match(portfolioProjection, /CANONICAL_PLUS_READ_ONLY_MIGRATION_BRIDGE/);
  assert.match(portfolioProjection, /READ_ONLY_MIGRATION_BRIDGE/);
  assert.match(portfolioProjection, /RECORDED_USAGE_NOT_VERIFIED_BILLING/);
});

test("intelligence and niche discovery keep evidence readiness separate from expert commitment", () => {
  assert.match(discoveryRoute, /cache-control": "no-store"/);
  assert.doesNotMatch(discoveryRoute, /export async function (POST|PATCH|DELETE)/);
  assert.match(discoveryProjection, /assessIntelligenceNicheEvidence/);
  assert.match(discoveryProjection, /foundationReady/);
  for (const criterion of ["CHAMPION_SCORE_FLOOR", "MARKET_ARTIFACT_FROZEN", "VERIFIED_SOURCE_FLOOR", "PRIMARY_SOURCE_FLOOR", "P0_CLAIMS_RESOLVED", "CONTRADICTIONS_REVIEWED"]) assert.match(intelligenceNicheWorkflow, new RegExp(criterion));
  assert.match(discoveryProjection, /EVIDENCE_READY_EXPERT_DECISION_REQUIRED/);
  assert.match(discoveryProjection, /OWNER_EXPERT_REQUIRED/);
  assert.match(discoveryProjection, /researchChampion/);
  assert.match(nichePortfolioV2, /NICHE_OPPORTUNITY_PORTFOLIO_V2/);
  assert.match(nichePortfolioV2, /SYSTEM_DISCOVERED.*EXPERT_SEEDED/s);
  assert.match(nichePortfolioV2, /MARKET_ATTRACTIVENESS.*ABILITY_TO_WIN.*EVIDENCE_CONFIDENCE/s);
  assert.match(nichePortfolioV2, /Prerequisites are hard gates/);
  assert.match(nichePortfolioV2, /SELECTED_PENDING_COMMITMENT/);
  assert.match(nichePortfolioV2, /ACTIVATE_CHANNEL_STRATEGY/);
  assert.match(nichePortfolioV2, /ACTIVATE_CHANNEL_STRATEGY/);
  assert.match(nichePortfolioRoute, /cache-control": "no-store"/);
  assert.doesNotMatch(nichePortfolioRoute, /export async function (POST|PATCH|DELETE)/);
  assert.match(nichePortfolioProjection, /NICHE_OPPORTUNITY_ONLY_WITH_EXPERT_HYPOTHESIS_APPEND/);
  assert.match(nichePortfolioProjection, /stage01\.nicheOpportunities/);
  assert.match(nichePortfolioProjection, /LEGACY|excludedLegacyContentTopics/);
  assert.doesNotMatch(nichePortfolioProjection, /CANONICAL_V1_CANDIDATE_ORDER/);
  assert.match(nichePortfolioProjection, /totalScore: null/);
  assert.match(nichePortfolioProjection, /hypothesisAppend: true/);
  assert.match(nichePortfolioProjection, /comparisonMutation: true/);
  assert.match(nichePortfolioProjection, /expertPriorityMutation: true/);
  assert.match(nichePortfolioProjection, /systemRankMutation: false/);
  assert.match(nichePortfolioProjection, /axisMutation: false/);
  assert.match(nichePortfolioProjection, /SLICE_5_LEXICOGRAPHIC_THREE_AXIS_EVIDENCE_ORDER/);
  assert.match(nichePortfolioView, /Opportunity comparison/);
  assert.match(nichePortfolioView, /Opportunity dossiers/);
  assert.match(nichePortfolioView, /Submit a niche hypothesis for verification/);
  assert.match(nichePortfolioView, /EXPERT INPUT · NOT EVIDENCE/);
  assert.match(discoveryView, /INTELLIGENCE → NICHE HANDOFF/);
  assert.match(discoveryView, /Open niche decision/);
  assert.match(nichePortfolioView, /ACTIVE CHANNEL STRATEGY/);
  assert.match(nichePortfolioView, /Intelligence to Channel Strategy decision path/);
  assert.match(nichePortfolioView, /Priority is locked to the active Channel Strategy/);
  assert.match(nichePortfolioView, /Add or research an alternative niche/);
  assert.match(portfolioCss, /@media\(max-width:1050px\).*\.pfShell\{display:block\}/s);
  assert.match(portfolioCss, /\.npComparisonCards\{display:grid/);
  assert.match(portfolioCss, /\.npDecisionMatrix>\.npTableScroll\{display:none\}/);
  assert.match(nicheHypothesisRoute, /getChatGPTUser/);
  assert.match(nicheHypothesisRoute, /FACTORY_EXPERT_EMAILS/);
  assert.match(nicheHypothesisCommand, /PREPARE_NICHE_RESEARCH_PLAN/);
  assert.match(nicheHypothesisCommand, /comparisonEligibility: false/);
  assert.match(nicheHypothesisCommand, /channelStrategyActivation: false/);
  assert.match(nicheScoringRoute, /getChatGPTUser/);
  assert.match(nicheScoringRoute, /FACTORY_EXPERT_EMAILS/);
  assert.match(nicheScoringCommand, /aggregateScore: null/);
  assert.match(nicheScoringCommand, /channelStrategyActivation: false/);
  assert.match(nicheScoringCommand, /INVALID_EVIDENCE_BINDING/);
  assert.match(nichePriorityRoute, /getChatGPTUser/);
  assert.match(nichePriorityRoute, /FACTORY_EXPERT_EMAILS/);
  assert.match(nichePriorityCommand, /SET_NICHE_PRIORITY/);
  assert.match(nichePriorityCommand, /systemRankMutation: false/);
  assert.match(nichePriorityCommand, /eligibilityMutation: false/);
  assert.match(nichePriorityCommand, /nicheSelection: false/);
  assert.match(nichePriorityCommand, /nicheCommitment: false/);
  assert.match(strategyActivationRoute, /getChatGPTUser/);
  assert.match(strategyActivationRoute, /FACTORY_EXPERT_EMAILS/);
  assert.match(strategyActivationCommand, /ACTIVE_COMMITMENT_REQUIRED/);
  assert.match(strategyActivationCommand, /channelStrategyBindingMutation: true/);
  assert.match(strategyActivationCommand, /legacyChannelNicheMutation: false/);
});

test("Channel Studio adds bounded Autopilot planning while preserving compatibility provenance", () => {
  assert.match(studioRoute, /cache-control": "no-store"/);
  assert.doesNotMatch(studioRoute, /export async function (POST|PATCH|DELETE)/);
  assert.match(studioProjection, /CHANNEL_FIELD_COMPATIBILITY_ONLY/);
  assert.match(studioProjection, /LEGACY_TEXT_LABEL/);
  assert.match(studioProjection, /SLICE_8_COMMITTED_OPPORTUNITY_BINDING/);
  assert.match(studioProjection, /contentPlanningProjection/);
  assert.match(studioPage, /Build once\. Operate by exception/);
  assert.match(studioPage, /Full Autopilot/);
  assert.match(studioPage, /Exceptions only/);
  assert.match(studioPage, /Expert review/);
  assert.match(studioPage, /Priority without a total score/);
  assert.match(studioPage, /SYSTEM_AUTOPILOT/);
  assert.match(studioPage, /Emergency stop/);
  assert.match(studioPage, /Legacy topics and existing Video Engine portfolio/);
  assert.match(portfolioCss, /\.cpControlGrid/);
  assert.match(portfolioCss, /@media\(max-width:1180px\).*\.cpControlGrid/s);
  assert.match(portfolioCss, /@media\(max-width:820px\).*\.cpPolicy form/s);
});

test("Content System and Planning closes eight slices inside an explicit authority envelope", () => {
  assert.match(contentPlanningContract, /FULL_AUTOPILOT.*EXCEPTIONS_ONLY.*EXPERT_REVIEW/);
  assert.match(contentPlanningContract, /SYSTEM_AUTOPILOT/);
  assert.match(contentPlanningContract, /READY_FOR_PRODUCTION/);
  assert.match(contentPlanningContract, /productionDispatchAuthorized/);
  assert.match(contentPlanningContract, /publishingAuthorized/);
  assert.match(contentAutopilotCommand, /ACTIVE_CHANNEL_STRATEGY_REQUIRED/);
  assert.match(contentAutopilotCommand, /POLICY_VERSION_CONFLICT/);
  assert.match(contentAutopilotCommand, /RUN_VERSION_CONFLICT/);
  assert.match(contentAutopilotCommand, /EMERGENCY_STOP/);
  assert.match(contentAutopilotCommand, /providerRequests: 0/);
  assert.match(contentAutopilotCommand, /channelStrategyMutation: false/);
  assert.match(contentAutopilotCommand, /providerDispatch: false/);
  assert.match(contentAutopilotCommand, /productionMutation: false/);
  assert.match(contentAutopilotCommand, /publishingMutation: false/);
  assert.match(contentAutopilotRoute, /getChatGPTUser/);
  assert.match(contentAutopilotRoute, /FACTORY_EXPERT_EMAILS/);
  assert.match(contentAutopilotRoute, /idempotency-key/);
  assert.match(canonicalContentBootstrap, /FULL_AUTOPILOT/);
  assert.match(canonicalContentBootstrap, /autoProduction: true/);
  assert.match(canonicalContentBootstrap, /autoPublish: false/);
  for (const table of ["content_automation_policies", "content_planning_runs", "content_pillars", "content_series", "content_opportunities", "editorial_plans", "editorial_plan_items", "production_briefs_v1", "content_planning_exceptions", "content_planning_audits"]) assert.match(contentMigration, new RegExp("CREATE TABLE `" + table + "`"));
});

test("operator state is a bounded canonical projection", () => {
  assert.match(route, /async function operatorSnapshot/);
  assert.match(route, /params\.get\("view"\) === "operator"/);
  assert.match(route, /cache-control": "no-store"/);
  assert.match(route, /wave_key='BATCH_1'/);
  assert.match(route, /wave_key='BATCH_2'/);
  assert.match(route, /status IN \('QUEUED','IN_PROGRESS'\)/);
});

test("Batch 2 activation is fail-closed and idempotent", () => {
  assert.match(route, /batch1Passed && portfolioComplete === 36 && !batch2 && activeRequests === 0/);
  assert.match(route, /batch2Records: batch2 \? 1 : 0/);
  assert.match(route, /if \(existing\) return snapshot\(\)/);
  assert.match(route, /START_WAVE_BATCH_2_V243/);
  assert.match(page, /START_WAVE_BATCH_2/);
  assert.match(page, /data\.requestLedger\.active > 0/);
});

test("the restored production UI exposes its original operational controls", () => {
  for (const legacy of ["AUTHORIZE_CONTROLLED_CANARY_V5", "BUILD_CANARY_RECOVERY_LANE", "RELEASE_PRODUCTION_RECOVERY_PROBE"]) {
    assert.match(page, new RegExp(legacy));
    assert.match(route, new RegExp(legacy));
  }
  assert.match(route, /LEGACY_ACTION_UNREACHABLE_AFTER_STABILIZATION/);
});

test("V21.4 preparing intent resumes automatically and reports transport truthfully", () => {
  assert.match(page, /\["PREPARING", "DISPATCHING", "AUTHORING"\]\.includes\(data\.semanticPlanControl\.status\)/);
  assert.match(page, /SEMANTIC PLAN INTENT · one approved request reserved · awaiting stable dispatch/);
  assert.match(page, /SEMANTIC PLAN DISPATCH · stable request recorded · awaiting provider response binding/);
  assert.match(page, /SEMANTIC PLAN AUTHORING · one provider response bound/);
  assert.match(page, /Resuming approved V21\.4 intent/);
  assert.match(page, /AUTHOR_WAVE_BATCH_2_V21_4_SEMANTIC_PLANS/);
  assert.match(page, /Factory-issued candidate spans/);
});
