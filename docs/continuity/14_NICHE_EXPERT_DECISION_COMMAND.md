# Niche Expert Decision — Command Boundary V1

**Command:** `NICHE_EXPERT_DECISION_COMMAND_V1`  
**Route:** `POST /api/factory/niche-decisions`  
**Autonomy:** `A2_APPROVAL_REQUIRED`  
**Authority:** `OWNER_EXPERT`  
**Execution ceiling:** one logical write, zero provider requests, USD 0  
**Migration:** `drizzle/0030_niche_expert_decision_command.sql` — generated, renamed above the existing 0029 migration, inspected and regeneration-stable

## Bounded outcome

An authenticated and explicitly allowlisted owner/expert can record an immutable, version-bound decision for the current research champion. The command appends three canonical facts atomically:

1. `niche_expert_decisions` decision aggregate version;
2. `niche_expert_decision_audits` identity/idempotency audit;
3. `v7_evidence_lineage` frozen zero-spend lineage record.

The command does not update `channels.niche`, dispatch a provider, request evidence, create a Channel Strategy aggregate or activate downstream work.

## Authority and identity

- Dispatch-owned SIWC supplies the authenticated email and optional display name.
- `FACTORY_EXPERT_EMAILS` is the server-side runtime allowlist; missing configuration fails closed.
- Sites access remains a separate hosting control. SIWC identity is not treated as proof of workspace authorization.
- Client controls are convenience only; every authorization decision is repeated server-side.

## Concurrency and idempotency

- `Idempotency-Key` is mandatory and globally unique.
- A retry with the same key and canonical payload returns `IDEMPOTENT_REPLAY` without another write.
- Reusing a key for a different actor/payload returns `IDEMPOTENCY_KEY_REUSED` / HTTP 409.
- The client submits `expectedAggregateVersion` and `expectedDecisionVersion` plus exact candidate/evidence versions from the GET projection.
- A stale aggregate, decision, candidate or evidence version returns a typed 409 and writes nothing.
- `(program_id, decision_version)` is unique; a concurrent winner causes the losing command to fail closed.

## Immutable expert leverage

Every decision requires:

- a 40–4000 character rationale;
- one 20–2000 character reusable knowledge asset;
- an asset type: rule, rubric anchor, example, anti-pattern or exception pattern.

Decision rows are append-only. Reversal creates a new version with `supersedes_decision_id`; prior judgment and learning remain auditable.

## UI/UX contract

The Niche Discovery surface shows the form only when canonical evidence is ready and a single channel is selected. It exposes the bound versions, validates meaningful rationale/knowledge length, preserves the idempotency key across a network retry of the same payload, announces success/failure through an assistive live region and maintains responsive touch/focus behavior.

Truthful copy states that recording a decision does not commit the channel niche or activate Channel Strategy.

## Acceptance contract

- pending, accepted, rejected, more-evidence, insufficient, stale and cross-channel compiler paths remain fail closed;
- canonical projection tests cover dedicated pending/accepted/stale decision bindings;
- command tests cover atomic record/audit/lineage creation, immutable channel niche, idempotent replay, payload-key conflict and optimistic-concurrency conflict;
- rendered worker rejects missing SIWC identity with a typed 401, no-store, zero-provider/zero-spend response;
- migration regeneration produces no additional schema diff;
- targeted lint, build, artifact, rendered, performance and full regression gates must pass before checkpoint.

## Next boundary

After production migration reconciliation and commercial browser acceptance, design the separate niche-commitment command. A recorded `ACCEPT` decision produces `NICHE_ACCEPTED_PENDING_COMMITMENT` and may make a typed handoff eligible, but it cannot mutate the committed channel niche or strategy state by itself.

## Protected scope

- No provider dispatch, spend, evidence refresh or policy promotion.
- No update/delete of expert decisions or audit lineage.
- No implicit commitment from rank, score, legacy decisions or `channels.niche`.
- No automatic Channel Strategy activation.
- No V7/V23 Video Production Engine mutation.
