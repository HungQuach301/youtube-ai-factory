# Niche Opportunity Portfolio V2 — Read-only Projection & Commercial UI

**Slice:** `02_READ_ONLY_PORTFOLIO`
**Projection:** `NICHE_PORTFOLIO_PROJECTION_V2`
**Policy:** `NICHE_OPPORTUNITY_POLICY_V2`
**Status:** `SLICE_3_1_GRANULARITY_REPAIRED_PENDING_CHECKPOINT`
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

Slice 3 extends this surface with one bounded write control. The comparison projection remains non-mutating; expert hypothesis assumptions are appended through a separate command and rendered as unranked, research-required inputs. See Document 18.

## Niche-only compatibility boundary

Production V1 Stage 01 `candidates` are video-topic candidates, not niche opportunities. Slice 3.1 removes them from the niche portfolio regardless of score or research order and preserves them in Channel Studio as `LEGACY_V1_VIDEO_TOPIC_CANDIDATE` records.

The projection now accepts only:

1. an explicit `nicheOpportunities` record typed `NICHE_OPPORTUNITY` and containing a market boundary, audience with recurring need, viewer promise and scalable content territory; or
2. an append-only expert hypothesis, rendered as an unranked, research-required `NICHE_OPPORTUNITY` input.

Invalid declared niche records fail closed. If no niche-level record exists, the UI shows an honest empty/research-pending state. It never inserts a topic, demo or inferred fallback.

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

At least two comparable niche opportunities are required for `PORTFOLIO_COMPARABLE`. Expert priority remains empty until a later append-only V2 command records it.

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

Checkpoint Slice 3.1, then implement Slice 4 as the permanent Evidence Intelligence & Validation feature. It must create versioned research plans and separately approved bounded validation for typed niche opportunities only.

## Protected scope

- No V2 mutation until Slice 3's command contract, authentication, idempotency, versioning, audit and lineage are accepted.
- No production database migration in Slice 2.
- No provider call, spend, pilot, selection, commitment or Channel Strategy activation.
- No hidden V1-to-V2 score conversion and no aggregate score.
- No fabricated canonical evidence and no responsibility shifted to QA.
