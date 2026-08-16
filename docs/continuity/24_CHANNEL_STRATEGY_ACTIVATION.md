# Document 24 — Permanent Channel Strategy Activation

## Status and scope

Slice 8 is the permanent, append-only activation layer over the latest active Slice 7 commitment. `ACTIVATE_CHANNEL_STRATEGY` is the only command that creates the canonical Channel Strategy binding. A commitment, selection, expert priority, system rank or legacy `channels.niche` value cannot activate strategy implicitly.

## Executable implementation

- Contract: `CHANNEL_STRATEGY_ACTIVATION_V1`.
- Endpoint: `POST /api/factory/channel-strategy-activations` with JSON and native-form receipts.
- Identity/authority: SIWC plus `FACTORY_EXPERT_EMAILS`; `PORTFOLIO_GOVERNANCE` authorization.
- Persistence: append-only activation and audit ledgers from migration 0036 plus frozen `CHANNEL_STRATEGY_ACTIVATION` lineage.
- Concurrency: expected global activation version, per-channel strategy version, commitment version and commitment ID.
- Binding: owner, rationale, viewer promise, differentiation, audience focus, content boundaries, success measures and review cadence.
- Projection: activation fact/workspace, explicit `BLOCKED`, `ACTIVATED` and `STALE` downstream gate states.
- Consumer: Channel Studio reads the active binding without gaining mutation or production authority.
- Actual provider requests/spend: `0` / `$0`.

## Hard gates

Activation succeeds only when the supplied commitment is the latest commitment, its selection is the latest active selection, its Slice 6 priority set remains active and the bound Slice 5 scoring/evidence facts remain current, sufficient and eligible. The channel, opportunity and all lineage IDs must match. Any upstream change preserves the historical activation row and projects it as `STALE`.

Idempotency replay returns the original receipt. Reusing an idempotency key with different input, sending a stale global/per-channel version, or supplying incomplete strategy fields fails closed before mutation.

## Authority isolation

Every receipt explicitly preserves:

```text
systemRankMutation = false
expertPriorityMutation = false
nicheSelectionMutation = false
nicheCommitmentMutation = false
axisMutation = false
evidenceSufficiencyMutation = false
eligibilityMutation = false
legacyChannelNicheMutation = false
channelStrategyBindingMutation = true
channelStrategyActivation = true
providerRequests = 0
spendUsd = 0
aggregateScore = null
```

The activation ledger—not `channels.niche`—is the canonical Channel Strategy binding. No provider, pilot, content-production or publishing operation is dispatched.

## Acceptance evidence

- Missing, stale or mismatched commitment fails closed.
- Success appends exactly one activation, one audit and one frozen lineage record atomically.
- Replay is idempotent; conflicting replay and stale versions are rejected.
- Projection regression proves system rank, expert priority, selection, commitment, axes, sufficiency, eligibility and legacy `channels.niche` are unchanged.
- Channel Studio consumes only an active binding; a later upstream assessment makes the binding stale without rewriting it.
- SIWC failures remain no-store, authority-false and zero-spend.
- Verified build enforces 37 API boundaries, 57 commercial UI checks, rendered fail-closed behavior and the 300 KB aggregate client budget; the regression suite passes 95/95.

## Production acceptance

Production v308 completed a real E2E transition on 2026-08-16. Two evidence-sufficient eligible niches formed the comparable set, the owner/expert priority set was recorded, the top niche was selected and committed, and Channel Strategy v1 was activated. Replay returned the same activation ID; independent Niche Portfolio and Channel Studio read-back plus reload both remained `ACTIVE`. Wrong-token and invalid-action boundary checks caused no mutation. Details are in Document 25.

## Exact next action

Create and verify the final source rollover capsule, then define the separately authorized Content System & Planning handoff contract. It may consume the active strategy binding, but it must not reinterpret activation as provider-dispatch or content-production authority.

## Protected scope

- Do not rerun or reconstruct Slices 1–8.
- Do not reinterpret the V1 expert decision or legacy `channels.niche`.
- Do not create a total score or compensate for failed prerequisites.
- Do not mutate rank, priority, selection, commitment, axes, evidence sufficiency or eligibility.
- Do not dispatch providers, produce content or incur spend.
