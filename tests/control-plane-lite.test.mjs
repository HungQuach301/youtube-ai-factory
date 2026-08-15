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
const intelligenceNicheWorkflow = await readFile(new URL("../lib/intelligence-niche-workflow-contract.ts", import.meta.url), "utf8");
const studioRoute = await readFile(new URL("../app/api/factory/channel-studio/route.ts", import.meta.url), "utf8");
const studioProjection = await readFile(new URL("../lib/channel-studio-projection.ts", import.meta.url), "utf8");
const marketPage = await readFile(new URL("../app/market-intelligence/page.tsx", import.meta.url), "utf8");
const nichePage = await readFile(new URL("../app/niche-discovery/page.tsx", import.meta.url), "utf8");
const studioPage = await readFile(new URL("../app/channel-studio/page.tsx", import.meta.url), "utf8");

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
});

test("Channel Studio preserves compatibility provenance and blocks production commands", () => {
  assert.match(studioRoute, /cache-control": "no-store"/);
  assert.doesNotMatch(studioRoute, /export async function (POST|PATCH|DELETE)/);
  assert.match(studioProjection, /CHANNEL_FIELD_COMPATIBILITY_ONLY/);
  assert.match(studioProjection, /LEGACY_TEXT_LABEL/);
  assert.match(studioProjection, /COMMAND_NOT_AUTHORIZED/);
  assert.match(studioProjection, /CANONICAL_AGGREGATE_NOT_IMPLEMENTED/);
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
