import { readFile } from "node:fs/promises";

const files = Object.fromEntries(await Promise.all([
  ["shell", "app/factory-shell.tsx"],
  ["portfolio", "app/page.tsx"],
  ["market", "app/market-intelligence/page.tsx"],
  ["niche", "app/niche-discovery/page.tsx"],
  ["studio", "app/channel-studio/page.tsx"],
  ["discoveryView", "app/discovery-view.tsx"],
  ["nichePortfolioView", "app/niche-portfolio-view.tsx"],
  ["nichePortfolioRoute", "app/api/factory/niche-portfolio/route.ts"],
  ["nichePortfolioProjection", "lib/niche-portfolio-projection.ts"],
  ["hypothesisRoute", "app/api/factory/niche-hypotheses/route.ts"],
  ["hypothesisCommand", "lib/niche-hypothesis-command.ts"],
  ["decisionRoute", "app/api/factory/niche-decisions/route.ts"],
  ["css", "app/portfolio.css"],
].map(async ([key, file]) => [key, await readFile(file, "utf8")])));

const checks = [
  ["skip link", files.shell.includes("Skip to main content")],
  ["single named main target", files.shell.includes('id="main-content"')],
  ["current-page navigation", files.shell.includes("aria-current=")],
  ["assistive loading status", files.shell.includes('role="status"') && files.shell.includes('aria-busy="true"')],
  ["loading heading hierarchy", files.shell.includes('className="pfSrOnly"') && files.css.includes(".pfSrOnly")],
  ["fail-closed recovery copy", files.shell.includes("No demo or local fallback was substituted")],
  ["named numeric progress", files.portfolio.includes('role="progressbar"') && files.portfolio.includes("aria-valuenow")],
  ["non-blank async fallbacks", [files.market, files.niche, files.studio].every((source) => !source.includes("fallback={null}") && source.includes("ProjectionState loading"))],
  ["visible keyboard focus", files.css.includes(":focus-visible") && files.css.includes("outline:3px")],
  ["minimum interaction target", files.css.includes("min-height:44px")],
  ["reduced-motion support", files.css.includes("prefers-reduced-motion:reduce")],
  ["forced-colors support", files.css.includes("forced-colors:active")],
  ["tablet breakpoint", files.css.includes("@media(max-width:820px)")],
  ["mobile breakpoint", files.css.includes("@media(max-width:520px)")],
  ["expert decision form labels", files.discoveryView.includes("RATIONALE · IMMUTABLE") && files.discoveryView.includes("REUSABLE KNOWLEDGE ASSET")],
  ["expert decision truthful scope", files.discoveryView.includes("It will not change the channel niche or activate Channel Strategy")],
  ["authoritative evidence readiness", files.discoveryView.includes("EVIDENCE READINESS · AUTHORITATIVE") && files.discoveryView.includes("evidenceAssessment.criteria")],
  ["V2 comparable portfolio surface", files.nichePortfolioView.includes("Opportunity comparison") && files.nichePortfolioView.includes("Opportunity dossiers")],
  ["V2 three-axis decision frame", files.nichePortfolioView.includes("MARKET ATTRACTIVENESS") && files.nichePortfolioView.includes("ABILITY TO WIN") && files.nichePortfolioView.includes("EVIDENCE CONFIDENCE")],
  ["V2 audience competitor and win detail", files.nichePortfolioView.includes("Who must choose this channel") && files.nichePortfolioView.includes("Strength, defence and exploitable gaps") && files.nichePortfolioView.includes("Winning criteria")],
  ["V2 truthful missing-data state", files.nichePortfolioView.includes("Not recorded") && files.nichePortfolioProjection.includes("NOT_RECORDED")],
  ["V2 comparison GET boundary", files.nichePortfolioRoute.includes("export async function GET") && !/export async function (POST|PATCH|DELETE)/.test(files.nichePortfolioRoute)],
  ["V2 bounded hypothesis intake", files.nichePortfolioView.includes("Submit a niche hypothesis for verification") && files.hypothesisRoute.includes("submitNicheHypothesis")],
  ["V2 assumptions are not evidence", files.nichePortfolioView.includes("EXPERT INPUT · NOT EVIDENCE") && files.nichePortfolioProjection.includes("Expert demand assumptions are not market evidence")],
  ["V2 hypothesis zero-spend authority", files.hypothesisCommand.includes("providerRequests: 0") && files.hypothesisCommand.includes("comparisonEligibility: false") && files.hypothesisCommand.includes("channelStrategyActivation: false")],
  ["SIWC hypothesis authentication", files.hypothesisRoute.includes("getChatGPTUser") && files.hypothesisRoute.includes("SIWC_AUTHENTICATION_REQUIRED")],
  ["server-side hypothesis authorization", files.hypothesisRoute.includes("FACTORY_EXPERT_EMAILS") && files.hypothesisRoute.includes("OWNER_EXPERT_AUTHORIZATION_REQUIRED")],
  ["idempotent hypothesis boundary", files.hypothesisRoute.includes('request.headers.get("idempotency-key")')],
  ["SIWC decision authentication", files.decisionRoute.includes("getChatGPTUser") && files.decisionRoute.includes("SIWC_AUTHENTICATION_REQUIRED")],
  ["server-side expert authorization", files.decisionRoute.includes("FACTORY_EXPERT_EMAILS") && files.decisionRoute.includes("OWNER_EXPERT_AUTHORIZATION_REQUIRED")],
  ["idempotent decision boundary", files.decisionRoute.includes('request.headers.get("idempotency-key")')],
];

const failures = checks.filter(([, passed]) => !passed);
if (failures.length) {
  console.error("Commercial UI contract violations:");
  for (const [label] of failures) console.error(`- ${label}`);
  process.exit(1);
}

console.log(`Commercial UI static contract passed ${checks.length}/${checks.length} checks.`);
