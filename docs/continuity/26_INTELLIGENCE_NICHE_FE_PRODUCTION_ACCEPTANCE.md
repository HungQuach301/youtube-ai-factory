# Document 26 — Intelligence–Niche FE Production Acceptance

## Outcome

The Intelligence–Niche stage is closed as a production product surface, not only as a backend activation. Sites v311 deployed functional commit `c292871bb210fc293327b01f82afb2253443b3fc` on 2026-08-16 and passed production read-back.

```text
FROZEN INTELLIGENCE
  → evidence summary and lineage
  → market, audience and competitor decision domains
  → explicit Niche portfolio handoff
  → responsive three-axis opportunity comparison
  → selected and committed niche
  → active Channel Strategy
  → Channel Studio consumer
```

## Production FE

### Intelligence

- Leads with what the evidence means before presenting the full research archive.
- Shows the handoff from frozen evidence to niche opportunity space.
- Separates market, audience and competitor evidence domains.
- Keeps the full thesis and evidence lineage available through disclosures.
- Provides one explicit action into Niche Discovery.

### Niche Discovery

- Leads with the active Channel Strategy and selected niche.
- Displays Market Attractiveness, Ability to Win and Evidence Confidence independently; no total score is invented.
- Uses responsive comparison cards instead of a desktop-width decision table.
- Keeps evidence dossiers expandable beside the decision summary.
- Locks the priority bound to the active strategy rather than exposing a misleading re-record action.
- Keeps governance history and alternative hypothesis intake available as secondary disclosures.
- Reuses the canonical client projection, removing a duplicate D1 read from the page route.

## Automated acceptance

```text
ASYNC_API_BOUNDARIES = 38_PASS
COMMERCIAL_UI = 57/57_PASS
INTELLIGENCE_NICHE_LIFECYCLES = 8/8_PASS
NICHE_V2_GROUPS = 10/10_PASS
REGRESSION = 95/95_PASS
RENDERED_JOURNEYS = 4_PAGES_4_READ_APIS_7_ZERO_SPEND_COMMANDS_PASS
SLOWEST_HARNESS_RENDER = 107.0MS_OF_500MS
CSS_GZIP = 59249_OF_60000_BYTES
LARGEST_PAGE_JS_GZIP = 46387_OF_50000_BYTES
CATALOG_ROUTE_SPLIT_GZIP = 304531_OF_305000_BYTES
```

The aggregate catalog budget is explicitly route-split; the strict per-CSS and per-page JavaScript ceilings remain unchanged.

## Production read-back

```text
INTELLIGENCE_CONTRACT = DISCOVERY_PROJECTION_V1
INTELLIGENCE_INTEGRITY = READY
FROZEN_STAGE_01 = TRUE
ARTIFACTS = 3
VERIFIED_SOURCES = 57
PRIMARY_SOURCES = 40
CLAIMS = 18
P0_CLAIMS = 8
MARKET_CLUSTERS = 6
AUDIENCE_SEGMENTS = 5
COMPETITOR_REFERENCES = 12

NICHE_CONTRACT = NICHE_PORTFOLIO_PROJECTION_V2
NICHE_OPPORTUNITIES = 3
COMPARABLE = 2
ELIGIBLE = 2
RESEARCH_REQUIRED = 1
DECISION_STATE = CHANNEL_STRATEGY_ACTIVATED
PRIORITY = ACTIVE_V1
GOVERNANCE = COMMITTED_V1
ACTIVATION = ACTIVE_V1
DOWNSTREAM = ACTIVATED
INTEGRITY = READY

ACTIVE_NICHE = Everyday Payment and Pricing Infrastructure
SYSTEM_RANK = 1
EXPERT_PRIORITY = 1
MARKET_ATTRACTIVENESS = 92
ABILITY_TO_WIN = 90
EVIDENCE_CONFIDENCE = 94

CHANNEL_STUDIO_CONTRACT = CHANNEL_STUDIO_PROJECTION_V1
CHANNEL_STUDIO_INTEGRITY = READY
CHANNEL_STRATEGY = ACTIVE_V1
PROVENANCE = SLICE_8_COMMITTED_OPPORTUNITY_BINDING
ACTIVATION_ID_MATCH = TRUE
```

Production pages `/market-intelligence`, `/niche-discovery` and `/channel-studio` each returned HTTP 200 after v311 deployment. The optimized Niche HTML response dropped from 15,988 to 14,643 bytes. The production shell screenshot rendered correctly at 1200×750. Error-only Worker logs for the most recent 30-minute QA window returned zero events. An unauthenticated production request remained rejected with HTTP 401 and did not alter the active binding.

## Closure and protected scope

```text
INTELLIGENCE_NICHE_STAGE = CLOSED_PRODUCTION_FE_QA
PROVIDER_REQUESTS = 0
SPEND_USD = 0
AGGREGATE_SCORE = null
LEGACY_VIDEO_TOPICS_EXCLUDED = 17
```

Do not rerun the canonical bootstrap, replace the activation or reinterpret legacy video topics as niches. A future change must begin from a newly observed defect or a separately authorized governance decision.

## Exact next boundary

Define Content System & Planning as a new, separately authorized consumer of the active Channel Strategy. It must own typed pillars, series and editorial planning and must not inherit provider dispatch, production, publishing or spend authority from the closed Intelligence–Niche stage.
