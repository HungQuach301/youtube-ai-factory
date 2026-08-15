# Niche Opportunity Portfolio V2 — Read-only Projection & Commercial UI

**Slice:** `02_READ_ONLY_PORTFOLIO`
**Projection:** `NICHE_PORTFOLIO_PROJECTION_V2`
**Policy:** `NICHE_OPPORTUNITY_POLICY_V2`
**Status:** `PRODUCTION_DEPLOYED_READ_ONLY`
**Date:** 2026-08-15 (Asia/Bangkok)
**Deployment:** Sites v297 / `b08cf9a10ced2911da891bf0361916a28daf2600` / succeeded

## Outcome

The `/niche-discovery` product surface now presents a portfolio of potential niches instead of one research champion followed by a yes/no decision. It provides:

- a side-by-side comparison matrix;
- independent system rank and expert priority columns;
- separate Market Attractiveness, Ability to Win and Evidence Confidence axes;
- market demand, growth, monetization and saturation evidence;
- audience characteristics, needs, preferences, pains/tensions and jobs-to-be-done;
- competitor strength, weakness, defensibility, content advantage and exploitable gaps;
- prerequisite and winning-criterion detail, including capability gaps, closing actions and proof methods;
- balanced support, contradiction and unknown research questions;
- filters, sorting and expandable opportunity dossiers across channel and portfolio scopes.

The surface is responsive, keyboard accessible and designed as the commercial decision workspace for Niche Discovery. It contains no V2 write control.

## Canonical compatibility bridge

The current production database contains immutable V1 Stage 01/02 Intelligence artifacts, not the full V2 aggregate. Slice 2 therefore reads those artifacts through:

`CANONICAL_V7_READ_ONLY_COMPATIBILITY_BRIDGE`

The bridge follows four rules:

1. Preserve the V1 candidate order as `systemRank`, labelled as legacy research order.
2. Never reinterpret the legacy candidate score as Market Attractiveness, Ability to Win or a V2 total.
3. Project an axis only when the canonical artifact explicitly records it. Evidence Confidence may be visibly labelled `COMPATIBILITY_DERIVED` from five V1 foundation gates.
4. Render absent audience, competitor, research or Conditions to Win facts as `Not recorded`; never generate a demo or fill a gap with inference.

This makes missing data an owning-stage research requirement, not a UI defect for QA to repair.

## Projection and API

- Domain projection: `lib/niche-portfolio-projection.ts`.
- Client contract: `app/niche-portfolio-contract.ts`.
- API: `GET /api/factory/niche-portfolio?channel=<canonical-channel-id>`.
- UI: `app/niche-portfolio-view.tsx` mounted at `/niche-discovery`.

The endpoint is `no-store`, fail-closed, and returns:

- `404` for a missing canonical channel;
- `503` for unavailable database/schema/query/artifact state;
- no demo/local fallback;
- no `POST`, `PATCH` or `DELETE` handler.

## Comparison eligibility

An opportunity is `COMPARABLE` only when canonical evidence contains:

- all three V2 axes explicitly recorded;
- meaningful market, audience and competitor coverage;
- at least one prerequisite and one winning criterion;
- a balanced support/contradiction/unknown research plan; and
- at least 60% V1 foundation evidence confidence while the compatibility bridge remains active.

A non-comparable opportunity remains visible as `RESEARCH_REQUIRED`. A comparable opportunity with any prerequisite other than `PASS` is `BLOCKED_BY_PREREQUISITE`; no score can compensate for that hard gate.

At least two comparable opportunities are required for `PORTFOLIO_COMPARABLE`. Expert priority remains empty until a later append-only V2 command records it.

## Commercial UI/UX controls

- The comparison matrix is horizontally contained at narrow widths and keeps opportunity identity visible.
- Dossiers expand with native accessible `details/summary` controls.
- All buttons and selects meet the minimum interaction target and visible-focus rules.
- Tablet and mobile layouts collapse axes, dossier columns, Conditions to Win and research questions without truncating decision content.
- Status is never communicated by colour alone; text labels remain visible.
- Missing values say `Not recorded`, not `0`.
- The page contains no disabled or deceptive mutation control.
- Reduced-motion and forced-colour foundations remain inherited from the commercial shell.

## Authority boundary

```text
activation = READ_ONLY
V2 commands = DECLARED_NOT_ROUTED
provider requests = 0
spend USD = 0
production-data mutation = false
Channel Strategy = BLOCKED
```

The deployed V1 expert-decision command remains compatibility-only and is no longer the primary `/niche-discovery` interaction. It cannot be interpreted as expert priority, selection or commitment.

## Verification

- Niche Opportunity Contract V2: 10/10 acceptance groups.
- Canonical projection fixtures: two comparable opportunities with explicit axes, audience needs, competitor strength, prerequisites and winning criteria pass.
- Commercial UI static contract: 26/26.
- Async API boundaries: 31/31.
- Targeted ESLint for all Slice 2 executable files: pass.
- Production build and Sites Worker artifact: pass.
- Rendered commercial contract: pass.
- Client performance budgets: CSS 55,902/60,000; page JS 46,387/50,000; total JS+CSS 292,578/300,000 gzip bytes.
- Full regression: 95/95.

Agent-preview visual inspection was attempted after the server became healthy, but the approved cloud-browser surface timed out before the page became reachable. This is an environment limitation, not evidence of a product pass. Final browser/assistive/Web Vitals commercial acceptance therefore remains open and must use canonical production when an approved reachable surface is available.

## Exact next action

Implement Slice 3: an append-only, identity-bound expert hypothesis intake contract and UI. `SUBMIT_NICHE_HYPOTHESIS` must capture assumptions, rationale and winning thesis, then enter the same research pipeline as system discoveries. It must not grant comparison eligibility, expert priority, selection, commitment or Channel Strategy authority.

## Protected scope

- No V2 mutation until Slice 3's command contract, authentication, idempotency, versioning, audit and lineage are accepted.
- No production database migration in Slice 2.
- No provider call, spend, pilot, selection, commitment or Channel Strategy activation.
- No hidden V1-to-V2 score conversion and no aggregate score.
- No fabricated canonical evidence and no responsibility shifted to QA.
