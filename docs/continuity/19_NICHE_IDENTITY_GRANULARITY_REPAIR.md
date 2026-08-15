# Niche Identity & Granularity Repair

**Slice:** `03_1_NICHE_IDENTITY_GRANULARITY_REPAIR`  
**Contract:** `NICHE_ENTITY_TAXONOMY_V1`  
**Status:** `PRODUCTION_DEPLOYED`  
**Date:** 2026-08-15 (Asia/Bangkok)
**Deployment:** Sites v301 / `89b9a9ebcb152a498a60ba991debeca3ae43f236` / succeeded

## Root cause and outcome

The Niche Discovery comparison was incorrectly populated from V1 Stage 01 `candidates`. Those records are individual video-topic candidates—such as questions about credit cards, reports or loans—inside one broader content territory. Their V1 order was displayed as a niche rank, so the UI compared videos rather than potential channel/niche strategies.

Slice 3.1 repairs the owning domain boundary. `/niche-discovery` now compares only typed `NICHE_OPPORTUNITY` records. Existing topic records are not deleted or reinterpreted; they remain visible under Channel Studio/Content Planning with explicit legacy provenance.

## Authoritative hierarchy

```text
MARKET
  → NICHE_OPPORTUNITY
    → CONTENT_PILLAR
      → SERIES_CONCEPT
        → VIDEO_TOPIC_CANDIDATE
```

One comparison row represents one potential channel strategy, never one video.

A system-discovered niche must explicitly provide:

- entity type `NICHE_OPPORTUNITY`;
- bounded market/geography/language;
- a specific audience and recurring need, pain or job-to-be-done;
- a distinct viewer/content promise;
- scalable content territories or pillars;
- evidence-ready market, competitor and ability-to-win fields.

An expert hypothesis enters as the same entity type but remains unranked and research-required until validation.

## Executable changes

- `lib/niche-portfolio-projection.ts` reads only explicit `nicheOpportunities`; it never promotes Stage 01 `candidates`.
- `NicheOpportunityProjection` exposes `entityType` and provenance.
- Legacy Stage 01 candidates are projected by Channel Studio as `VIDEO_TOPIC_CANDIDATE` with provenance `LEGACY_V1_VIDEO_TOPIC_CANDIDATE`.
- The historical champion is labelled a video-topic research champion, not a niche recommendation.
- Niche Discovery reports how many legacy content topics were excluded and shows a truthful empty state when no niche-level opportunity exists.
- Invalid declared niche records are excluded fail-closed and create a reconciliation note.

## Acceptance contract

- No legacy video title appears in the niche comparison.
- A typed, bounded system niche may appear and receive a V2 niche evidence rank.
- An expert hypothesis appears unranked and research-required.
- Legacy topic candidates remain available in Channel Studio.
- No data deletion, provider request, spend, selection, commitment, `channels.niche` mutation or Channel Strategy activation occurs.

## Product capability roadmap

Slices 4–8 are enduring commercial-tool capabilities:

1. Slice 4 — Evidence Intelligence & Validation.
2. Slice 5 — Niche Portfolio Comparison.
3. Slice 6 — Expert Prioritization Workspace.
4. Slice 7 — Niche Commitment & Governance.
5. Slice 8 — Channel Strategy Activation.

Each owns its data model, domain/API boundary, UI/UX, audit/evidence lineage, automation/expert authority, operational metrics and governed improvement loop. QA provides independent release assurance; it does not become the owning repair stage.

## Exact next action

Implement Slice 4 for typed niche opportunities only.

## Protected scope

- Preserve immutable V1 artifacts and their original scores/order.
- Do not use naming heuristics as authority; explicit type and aggregate contract control eligibility.
- Do not promote topics, pillars or series into Niche Discovery.
- Do not reinterpret an expert assumption as evidence.
- Keep priority, selection, commitment and Channel Strategy activation as separate versioned facts.
