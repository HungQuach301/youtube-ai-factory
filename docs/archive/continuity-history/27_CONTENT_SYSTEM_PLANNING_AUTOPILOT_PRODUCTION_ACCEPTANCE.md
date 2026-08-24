# Content System & Planning Autopilot — Production Acceptance

Date: 2026-08-16 (Asia/Bangkok)

## Closure

`CONTENT_SYSTEM_PLANNING_STAGE=CLOSED_PRODUCTION_FE_QA`

The active Channel Strategy v1 is compiled into a permanent, versioned Content System & Planning capability. The accepted operating mode is `FULL_AUTOPILOT`: the system performs routine planning as `SYSTEM_AUTOPILOT`; the owner/expert configures the authority envelope and handles only material exceptions.

## Eight accepted slices

1. Automation Policy & Authority — three selectable participation modes, versioned budget/cadence/risk/repair/publishing boundaries and emergency stop.
2. Content System Compiler — four strategy-bound content pillars and eight repeatable series.
3. Content Opportunity Backlog — eight evidence-bound opportunities with independent Strategy Fit, Audience Demand, Differentiation and Evidence Readiness axes; no total score.
4. Editorial Planning — one auto-approved 30-day, eight-item publishing sequence.
5. Production Brief Compiler — eight versioned, evidence/risk/cost-bound briefs in `READY_FOR_PRODUCTION`.
6. Autopilot Orchestrator — policy/strategy/version gates, system actor, immutable audit and exception routing.
7. Production FE — responsive Channel Studio control surface, policy controls, system/backlog/plan/brief projections, exception inbox, audit timeline and protected legacy compatibility state.
8. Production QA — normal path, emergency stop, resume, stale-plan detection and recompile verified on production.

## Production evidence

```text
FUNCTIONAL_SITES_VERSION = 313
FUNCTIONAL_SOURCE_COMMIT = f7a125c2f101c3ee3dca23e6d4a080f747142c46
FINAL_ACCEPTANCE_CHECKPOINT = SITES_V315
CHANNEL = channel-hidden-systems
CHANNEL_STRATEGY = ACTIVE_V1
ACTIVATION_ID = channel-strategy-activation:c7b50c41-7f09-4320-8bfe-93b0f4b0cf08
POLICY = ACTIVE_FULL_AUTOPILOT_V3
RUN = COMPLETE_V2
PILLARS = 4
SERIES = 8
OPPORTUNITIES = 8
EDITORIAL_PLAN_DAYS = 30
PLANNED_ITEMS = 8
BRIEFS_READY = 8
OPEN_EXCEPTIONS = 0
PROVIDER_REQUESTS = 0
PLANNING_SPEND_USD = 0
HANDOFF = READY_FOR_PRODUCTION
AUTO_PRODUCTION = TRUE
AUTO_PUBLISH = FALSE
INTEGRITY = READY
```

The production recovery sequence created policy v1/run v1, appended emergency-stop policy v2, appended resumed policy v3, correctly marked run v1 stale, then created run v2. No history was rewritten. Channel Strategy v1 and the Intelligence–Niche decision lineage remained unchanged.

## Authority boundary

Content Autopilot may compile content systems, backlogs, editorial plans and production briefs. It may not mutate Channel Strategy, call a provider, spend money, execute production or publish. `autoProduction=true` authorizes only the downstream handoff; actual production remains a separate Video Engine command. `autoPublish=false` keeps publishing explicitly closed.

## Verification

- 40/40 async API boundaries.
- 69/69 commercial UI contract checks.
- 10/10 control-plane tests and 96/96 full regressions.
- Four rendered journeys, four fail-closed read APIs and eight SIWC-protected zero-spend command checks.
- Client gzip: CSS 60,807/62,000; largest page JS 46,387/50,000; catalog 309,159/310,000.
- Production browser: all eight slices visible and closed; 4/8/8/8/8 object counts; zero application console errors.
- Production read-back: policy v3, run v2, `READY_FOR_PRODUCTION`, integrity `READY`, Strategy v1 lineage unchanged.
- Production font asset defect found during QA was repaired by removing build-machine `next/font` paths; final build contains no `/workspace/.../.vinext/fonts` URL.
- Slices 7 and 8 report `COMPLETE` only when the canonical handoff, eligible-brief equality, brief readiness, integrity, exception, zero-request, zero-spend, blocker and publishing-closure gates all pass.

## Protected next boundary

Do not rebuild or rerun Intelligence–Niche, Channel Strategy or Content System & Planning unless a new production defect or approved strategy/policy change exists. The next separately authorized stage is Video Production Engine execution from the eight eligible briefs. Provider dispatch, spend, asset production, QA and publishing must retain their own controls.
