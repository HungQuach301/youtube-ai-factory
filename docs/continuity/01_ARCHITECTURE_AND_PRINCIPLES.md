# Architecture and Principles

## Source-of-truth order

1. Stored artifact bytes, checksum and runtime/provider evidence.
2. Canonical state, artifact manifest and request ledger.
3. Locked architecture decisions.
4. Production specification and method.
5. Chat summary and Memory.

## Lifecycle

`PLAN → CANDIDATES → SELECTED → MATERIALIZED → VERIFIED → FROZEN`

`REJECTED`, `SUPERSEDED` and `ESCALATED` are terminal governance states. An upstream change marks dependent descendants stale; only affected descendants may be rebuilt, with regression checks on unchanged dependencies.

## Continuity architecture

The Continuity API projects state directly from authoritative V7 tables. It does not maintain a second editable stage state or second cost total. Immutable checkpoint snapshots record the projection, evidence limitations and hash at a point in time.

## Cost evidence hierarchy

1. Provider response ID and response payload prove that a provider execution exists.
2. Provider-reported token/tool usage supports an estimated cost using the configured rate card.
3. Organization Costs or invoice data is required to label an amount as billing-verified.

The system must display all three states separately. Missing billing access is an explicit `NOT_VERIFIED` state, never zero-cost proof and never permission to relabel an estimate as incurred spend.

## Visual, assurance and provider invariants

- Visual intent, Video Blueprint, Shot Contract and Scene Graph are typed versioned artifacts, not prose prompts.
- One canonical timebase binds narration, audio samples, frames, captions, findings and performance.
- A contact sheet or source atlas cannot prove temporal quality; assurance observes the exact Production master.
- Production workers never accept their own output. Independent assurance produces evidence; release and publication remain separate authorities.
- Every external call goes through the Provider Gateway after capability, settings, cost, rights, safety, idempotency and fencing checks.
- Git owns code/contracts/docs truth, D1 owns operational state, R2 owns active bytes and Drive is a user-controlled recovery archive.
- A provider, model, prompt, rubric, schema or sampler change makes dependent qualification stale.
- The repository is one Git object graph mirrored to `origin/main` and `github/main`; divergence blocks mutation. `youtube-ai-factory-v2` is excluded.
