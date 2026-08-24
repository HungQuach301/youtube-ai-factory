# Niche Evidence Intelligence & Validation

**Slice:** `04_EVIDENCE_INTELLIGENCE_VALIDATION`  
**Contract:** `NICHE_EVIDENCE_WORKFLOW_V1`  
**Status:** `IMPLEMENTED_ACCEPTANCE_GREEN`  
**Date:** 2026-08-15 (Asia/Bangkok)

## Product outcome

Slice 4 is a permanent commercial-tool capability for every typed `NICHE_OPPORTUNITY`. It gives system-discovered niches and expert-seeded hypotheses one governed workflow for:

1. preparing a balanced, versioned research plan;
2. approving a bounded validation envelope;
3. appending expert-reviewed evidence with provenance and decision impact.

The workflow improves evidence quality without leaking authority into system rank, expert priority, comparison eligibility, niche selection, commitment or Channel Strategy activation.

## Domain lifecycle

```text
NOT_STARTED
  → PREPARE_NICHE_RESEARCH_PLAN
PLAN_READY
  → REQUEST_NICHE_VALIDATION
VALIDATION_APPROVED / APPROVED_NOT_DISPATCHED
  → RECORD_NICHE_EVIDENCE_REVIEW (repeatable)
EVIDENCE_UNDER_REVIEW
  → Slice 5 scoring gate remains separately blocked
```

A revised plan appends a new `planVersion`, resets validation authority for that plan and requires a new validation approval. Every event increments `evidenceVersion`; optimistic concurrency and idempotency fail closed.

## Balanced research plan

Every plan must contain at least one item in each direction:

- supporting questions: evidence that could strengthen the opportunity;
- contradicting questions: evidence that could falsify or weaken it;
- unknown questions: uncertainties capable of changing the decision.

It also records source classes, an optional provider allowlist, maximum source count, maximum provider-request count and maximum spend. These values define an authority envelope only. The Slice 4 commands implemented here never dispatch a provider: actual provider requests and spend remain `0`.

## Expert evidence review

Each append-only review records:

- direction: `SUPPORTS`, `CONTRADICTS` or `UNKNOWN`;
- claim statement and source reference;
- source authority and observation date;
- freshness and confidence;
- affected axis or condition;
- expert disposition and decision impact;
- SIWC identity, idempotency, request hash, correlation/causation and frozen evidence lineage.

An accepted claim is still not a score. Slice 5 must separately evaluate sufficiency and compute the three-axis comparison facts.

## Technical ownership

- D1 append-only events: `niche_evidence_workflow_events`.
- D1 audit ledger: `niche_evidence_workflow_audits`.
- Migration: `drizzle/0032_smooth_nebula.sql`.
- Domain command: `lib/niche-evidence-command.ts`.
- Authenticated API: `POST /api/factory/niche-evidence`.
- Projection: `NicheOpportunityProjection.evidenceWorkflow` inside `NICHE_PORTFOLIO_PROJECTION_V2`.
- Commercial UI: the Slice 4 workspace inside each opportunity dossier at `/niche-discovery`.
- Lineage: one frozen `NICHE_EVIDENCE_EVENT` record per workflow event.

## Authority and safety boundaries

- SIWC establishes identity; `FACTORY_EXPERT_EMAILS` authorizes the owner/expert server-side.
- Every command requires a bounded body, idempotency key, aggregate version and evidence version.
- Opportunity identity is resolved from the canonical expert hypothesis or an explicit Stage 01 `NICHE_OPPORTUNITY`; video topics cannot enter.
- Expert-seeded and system-discovered opportunities share the same support/contradiction/unknown path.
- Validation approval is `APPROVED_NOT_DISPATCHED`; provider dispatch requires a future distinct typed command and reconciled provider/spend authority.
- Slice 4 cannot mutate comparison eligibility, rank, priority, selection, commitment, `channels.niche` or Channel Strategy.
- QA verifies release fitness independently; it does not repair research plans or evidence.

## Continuous improvement loop

Slice 4 improves itself through versioned evidence, not hidden prompt drift:

1. retain every plan/review version and its outcome;
2. measure coverage by evidence direction, source class, freshness, review disposition and affected axis;
3. identify repeated unknowns, contradiction misses and low-authority source patterns;
4. propose research-template/rubric changes as explicit versioned policy changes;
5. evaluate the challenger policy on historical frozen cases;
6. promote only after owner/expert approval and regression acceptance;
7. never rewrite historical events or relax hard authority boundaries.

## Acceptance evidence

- Commercial static contract: 40/40.
- Async API error boundaries: 33/33.
- Niche Opportunity Portfolio V2: 10/10 acceptance groups.
- Intelligence & Niche lifecycle: 8 paths.
- Canonical-data command/projection checks cover plan, replay, validation, review, stale-version rejection and non-mutation of eligibility/rank.
- Production build, Sites artifact validation and rendered zero-spend authentication checks pass.

## Exact next action

Run production checkpoint/reconciliation for Slice 4. After deployment and a new continuity capsule, begin Slice 5 as the permanent three-axis evidence sufficiency, scoring and portfolio-comparison capability. Slice 5 must consume Slice 4 reviews without retroactively mutating them.

## Protected scope

- Do not dispatch providers from the Slice 4 routes.
- Do not infer evidence from expert assumptions.
- Do not promote `VIDEO_TOPIC_CANDIDATE` into the niche workflow.
- Do not compute an aggregate total score.
- Do not move scoring, priority, commitment or activation authority into QA.
- Preserve Slices 4–8 as product features with owned data/API/UI/audit/metrics and governed improvement loops.
