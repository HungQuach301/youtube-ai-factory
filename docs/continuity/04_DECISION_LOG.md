# Decision Log

## ADR-051 — Continuity is a projection, not duplicate state

The continuity control reads canonical stage, material, evidence, decision and usage records. It may persist immutable snapshots, but it may not create a separately editable current-state model.

## ADR-052 — Reconcile only like-for-like cost scopes

Material-request totals and global AI-usage totals are not compared directly. Cost reconciliation joins records by provider response ID and reports unmatched scopes separately.

## ADR-053 — Forward hash baseline preserves an evidence limitation

Because pre-repair A/B hashes were not stored, current A/B/C entry-mid-exit hashes become the forward immutable baseline. The system records the historical limitation rather than manufacturing a pass.

## ADR-054 — Continuity capture has zero dispatch authority

The continuity route can read evidence, export a pack and store a snapshot. It cannot invoke OpenAI, a media provider, a worker, pilot execution or scale authorization.

## ADR-055 — Controlled release balances speed and semantic quality

Effective 2026-08-10 for Stage 09 stabilized material releases, `CONTROLLED_RELEASE_GATE_V1` adds a controlled tier without converting prior failures into passes. Standard release remains overall ≥92 with every dimension ≥90 and zero P0/P1. Controlled release requires overall ≥88, Semantic Fit ≥82, every other dimension ≥88, zero P0, zero semantic P1 and at most one presentation P1. Scores 84–87 are internal-only; overall <84 or Semantic Fit <82 is blocked. Controlled scale uses a 25% independent QA sample while deterministic and per-unit terminal gates remain mandatory. MP-002 request 85 remains blocked at 84 overall / 68 Semantic Fit; request 86 and batch release are not authorized.

## ADR-056 — Usage evidence is not billing evidence

Effective 2026-08-12, the Factory distinguishes `estimatedCostUsd`, provider-reported usage and `billingVerifiedCostUsd`. A completed OpenAI response ID plus its usage payload proves provider execution and supports a rate-card estimate, but does not prove that the user's OpenAI organization was invoiced. Billing remains `NOT_VERIFIED` until Organization Costs is connected and joined to the same project/time scope. UI and reports may not describe an estimate as an actual charge.

## ADR-057 — Expert decision, niche commitment and strategy activation are separate commands

Effective 2026-08-15, `SUBMIT_EXPERT_DECISION` is the first routed Intelligence/Niche command. It appends an SIWC-attributed, allowlisted, idempotent and version-bound decision plus audit/evidence lineage at zero provider spend. It does not update `channels.niche` and does not activate Channel Strategy. Acceptance creates handoff eligibility only; niche commitment and downstream activation require distinct typed boundaries so automation cannot convert a recommendation or expert review into an irreversible portfolio mutation.

## ADR-058 — Evidence workflow is append-only and cannot grant decision authority

Effective 2026-08-15, Slice 4 provides one versioned support/contradiction/unknown workflow for system-discovered niches and expert-seeded hypotheses. Research planning, bounded validation approval and expert evidence review are durable product capabilities, but none may mutate score, comparison eligibility, system rank, expert priority, selection, commitment or Channel Strategy activation. The current validation command records `APPROVED_NOT_DISPATCHED`; actual provider requests and spend remain zero until a separate typed execution command is implemented and reconciled.

## ADR-059 — Comparison uses evidence sufficiency and lexicographic axes, never a total score

Effective 2026-08-15, Slice 5 records an append-only, latest-evidence-bound assessment shared by system-discovered and expert-seeded niches. The server verifies accepted evidence bindings, support/contradiction/unknown coverage, a primary source and freshness before granting comparison sufficiency. Market Attractiveness, Ability to Win and Evidence Confidence remain independent. System rank orders sufficient assessments lexicographically by eligibility and the three axes; no aggregate score exists. Prerequisite gaps hard-block eligibility, while winning-criterion gaps remain explicit closing/proof work. Expert priority, selection, commitment, `channels.niche` and Channel Strategy activation remain separate capabilities.
