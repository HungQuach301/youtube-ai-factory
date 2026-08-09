# Decision Log

## ADR-051 — Continuity is a projection, not duplicate state

The continuity control reads canonical stage, material, evidence, decision and usage records. It may persist immutable snapshots, but it may not create a separately editable current-state model.

## ADR-052 — Reconcile only like-for-like cost scopes

Material-request totals and global AI-usage totals are not compared directly. Cost reconciliation joins records by provider response ID and reports unmatched scopes separately.

## ADR-053 — Forward hash baseline preserves an evidence limitation

Because pre-repair A/B hashes were not stored, current A/B/C entry-mid-exit hashes become the forward immutable baseline. The system records the historical limitation rather than manufacturing a pass.

## ADR-054 — Continuity capture has zero dispatch authority

The continuity route can read evidence, export a pack and store a snapshot. It cannot invoke OpenAI, a media provider, a worker, pilot execution or scale authorization.
