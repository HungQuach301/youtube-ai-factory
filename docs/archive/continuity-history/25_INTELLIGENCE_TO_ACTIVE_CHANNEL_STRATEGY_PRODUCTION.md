# Document 25 — Intelligence to Active Channel Strategy Production Acceptance

## Outcome

On 2026-08-16, Sites production v308 executed the complete canonical flow:

```text
FROZEN INTELLIGENCE
  → 3 typed NICHE_OPPORTUNITY aggregates
  → 2 balanced evidence-sufficient assessments
  → 2 eligible comparable opportunities
  → expert priority v1
  → selection v1
  → commitment v1
  → Channel Strategy activation v1
  → Channel Studio ACTIVE
```

The selected and activated niche is **Everyday Payment and Pricing Infrastructure** for `channel-hidden-systems` / Hidden Systems Behind Money.

## Why the bridge is necessary

Intelligence answers what the market, audiences and competitors reveal. Niche Discovery answers which recurring channel-level territory is worth pursuing and whether the factory can win. The production repair introduces an explicit append-only bridge instead of treating the 17 Stage 01 episode candidates as niches.

Three channel-level territories were materialized from the canonical Intelligence clusters and audience segments:

1. Everyday Payment and Pricing Infrastructure — selected and active.
2. Financial Reputation and Debt Decision Systems — comparable, eligible and expert priority 2.
3. Housing and Retirement Default Machinery — retained as research-required; no evidence or score was fabricated to make it comparable.

## Production facts

```text
SITES_VERSION = 308
SOURCE_COMMIT = f534d5e4cb9c70f65d127b3522f7e400a681337f
BRIDGE_VERSION = 1
OPPORTUNITIES = 3
COMPARABLE = 2
ELIGIBLE = 2
PRIORITY_VERSION = 1
SELECTION_VERSION = 1
COMMITMENT_VERSION = 1
ACTIVATION_VERSION = 1
CHANNEL_STRATEGY_VERSION = 1
DECISION_STATE = CHANNEL_STRATEGY_ACTIVATED
CHANNEL_STUDIO_STRATEGY = ACTIVE
INTEGRITY = READY
LEGACY_VIDEO_TOPICS_EXCLUDED = 17
PROVIDER_REQUESTS = 0
SPEND_USD = 0
AGGREGATE_SCORE = null
```

## QA evidence

- Verified build: 38 async API boundaries, 57/57 commercial UI checks, 10/10 Niche V2 groups, eight Intelligence/Niche lifecycle paths, canonical bootstrap contract, rendered fail-closed behavior and client performance budget.
- Regression: 95/95 tests passed.
- Production mutation: HTTP 201 with `CHANNEL_STRATEGY_ACTIVE`.
- Idempotency: replay returned HTTP 200, `IDEMPOTENT_REPLAY`, version 1 and the same activation ID.
- Persistence: a later independent reload returned Niche Portfolio `CHANNEL_STRATEGY_ACTIVATED`, activation workspace `ACTIVE`, Channel Studio strategy `ACTIVE`, version 1 and the same activation ID.
- Boundary: invalid automation token returned 401 with `channelStrategyActivation=false`.
- Boundary: unsupported action returned 400 with `channelStrategyActivation=false`.
- Source immutability: Stage 01 remains `FROZEN` with the pre-bridge content hash and contains zero embedded niche rows; typed opportunities live in the bridge ledger.
- Topic isolation: all 17 video-topic candidates remain excluded from niche ranking and governance.

## Active strategy contract

- Viewer promise: reveal how an ordinary purchase or bill routes money, data, risk and incentives through hidden institutions, ending with a durable mental model rather than personal-finance advice.
- Differentiation: premium faceless system documentaries use a familiar transaction as narrative spine, primary-source evidence as authority and original institutional maps.
- Audience: U.S. adults ages 18–64 facing opaque prices, fees, payment rails and financial decisions.
- Review cadence: 30 days.
- Hard boundaries: no personalized advice; no unsupported company accusations; no universal fee/outcome generalizations; no video-topic promotion; material uncertainty must remain visible.

## Exact next action

Define Content System & Planning as a new, separately authorized product boundary consuming the active strategy. It must own typed pillars, series and editorial plans and must not inherit provider-dispatch, production, publishing or spend authority from Channel Strategy activation.
