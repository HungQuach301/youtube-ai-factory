# Document 23 — Permanent Niche Commitment & Governance

## Status and scope

Slice 7 is the permanent, append-only governance layer over the active Slice 6 expert-priority portfolio. It introduces two facts and two commands:

1. `SELECT_NICHE_FOR_COMMITMENT` records `SELECTED_PENDING_COMMITMENT`.
2. `COMMIT_NICHE` records `COMMITTED` only from the latest active selection.

Direct `EXPERT_PRIORITIZED → COMMITTED` is forbidden. Selection and commitment are not aliases for system rank, expert priority, the V1 expert decision, or Channel Strategy activation.

## Executable implementation

- Contract: `NICHE_COMMITMENT_GOVERNANCE_V1`.
- Endpoint: `POST /api/factory/niche-governance`.
- Identity: SIWC plus server-side `FACTORY_EXPERT_EMAILS` allowlist.
- Selection authority: `OWNER_EXPERT`.
- Commitment authority: `PORTFOLIO_GOVERNANCE`.
- Persistence: append-only selection, selection-audit, commitment and commitment-audit ledgers from migration 0035.
- Concurrency: expected selection/commitment/priority versions plus the current comparable-set hash.
- Lineage: frozen `NICHE_SELECTION` and `NICHE_COMMITMENT` records.
- Projection: `governanceWorkspace`, `selectionFact`, `commitmentFact` and explicit active/stale lifecycle states.
- Actual provider requests/spend: `0` / `$0`.

## Hard gates

Selection succeeds only when the Slice 6 priority set is active, the opportunity is a member of that set, its Slice 5 assessment is `SUFFICIENT`, and `comparison_eligibility` is `ELIGIBLE`. Commitment succeeds only when the supplied selection is the latest selection and its priority, program, evidence and scoring bindings are still current.

Any upstream membership, aggregate, evidence, scoring or priority change preserves the historical rows and projects selection/commitment as `STALE`. It never silently rewrites governance history.

## Authority isolation

Both receipts explicitly preserve:

```text
systemRankMutation = false
expertPriorityMutation = false
axisMutation = false
evidenceSufficiencyMutation = false
eligibilityMutation = false
channelNicheMutation = false
channelStrategyActivation = false
providerRequests = 0
spendUsd = 0
aggregateScore = null
```

Selection sets only `nicheSelection`; commitment sets only `nicheCommitment`. `channels.niche` remains unchanged and the downstream Channel Strategy gate remains `BLOCKED` even after commitment.

## Acceptance evidence

- Direct commitment without a selection is rejected.
- Selection and commitment each enforce idempotency and optimistic version control.
- Projection regression proves system rank, expert priority, all three axes, evidence sufficiency, eligibility and `channels.niche` are unchanged.
- A newer Slice 5 assessment makes priority, selection and commitment stale without rewriting their records.
- SIWC failures remain no-store, zero-spend and authority-false.
- Build, artifact, rendered authentication and the 300 KB aggregate client budget remain hard gates.

## Exact next action

After the Slice 7 production checkpoint and recovery-tested capsule, implement Slice 8 as permanent Channel Strategy Activation. Slice 8 must consume an active committed niche through a new versioned activation command, explicitly mutate the Channel Strategy binding, preserve every upstream fact, and remain idempotent, audited and fail-closed. Do not make commitment itself activate strategy.

## Protected scope

- Do not rerun or reconstruct Slices 1–7.
- Do not reinterpret the V1 expert decision.
- Do not create a total score or compensate for prerequisite gaps.
- Do not mutate Market Attractiveness, Ability to Win, Evidence Confidence, evidence sufficiency or eligibility.
- Do not mutate `channels.niche` or activate Channel Strategy in Slice 7.
- Do not dispatch providers or incur spend.
