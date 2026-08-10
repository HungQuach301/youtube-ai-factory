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
