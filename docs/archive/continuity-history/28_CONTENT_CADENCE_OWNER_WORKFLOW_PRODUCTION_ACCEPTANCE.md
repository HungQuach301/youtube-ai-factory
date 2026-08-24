# Content Cadence & Owner Workflow — Production Acceptance

Date: 2026-08-16

## Decision

Channel Studio is owner-first. The normal workflow is:

1. Edit Automation settings.
2. Review a mutation-free impact preview.
3. Apply changes and rebuild the 30-day plan atomically.
4. Intervene only for explicit evidence, risk, integrity or budget exceptions.

Technical versions, pause/resume, emergency stop, scoring detail and append-only activity are available under **Activity & system details**, not in the primary workflow.

## Exact cadence invariant

For monthly target `N`, a current accepted run must have exactly:

- `N` distinct Episode Concepts;
- `N` editorial plan items;
- `N` production-ready briefs.

An Opportunity is reusable market territory. An Episode Concept is one concrete, unique production unit. One Opportunity may therefore yield multiple Episode Concepts without weakening evidence lineage or uniqueness.

Production handoff is blocked unless exact cadence, current strategy/settings lineage, budget, integrity and zero open exceptions all pass.

## Authority boundary

Content planning remains zero-provider and zero-spend. It does not mutate Channel Strategy and does not inherit provider dispatch, production mutation or publishing authority. `autoProduction` authorizes only downstream handoff after all gates pass. `autoPublish` remains false in the accepted owner configuration.

## V2 append-only model

- `content_episode_concepts_v2`
- `editorial_plan_items_v2`
- `production_briefs_v2`

V1 records remain immutable compatibility history. V2 rows bind run → opportunity → series → episode concept → plan item → production brief.

## Production acceptance checkpoints

1. **Safety gate:** target/plan/brief mismatch blocks handoff and reports reconciliation required.
2. **Cadence engine:** deterministic 1/8/15/60 compilation, unique concepts, cost preview and atomic apply/rebuild.
3. **Owner FE:** business-first tabs, four business stages, plain-language settings, impact preview and one primary apply action; responsive and accessible.
4. **Production QA:** immutable deployment verified; canonical 15/15/15 state, integrity ready, no open exceptions, zero provider requests/spend, automatic production handoff enabled and publishing unauthorized.

## Automated acceptance evidence

- Commercial UI static contract.
- Canonical projection and Intelligence/Niche regression suites.
- Content System & Planning executable contract.
- Production build and rendered journeys.
- Client performance budgets.
- Full Node regression suite.

No P0/P1 defect may remain open when checkpoint 4 is closed.
