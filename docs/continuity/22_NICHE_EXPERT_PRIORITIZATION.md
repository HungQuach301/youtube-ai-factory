# Document 22 — Permanent, Versioned Expert Prioritization

Last reconciled: 2026-08-16 (Asia/Bangkok)

## Product capability

Slice 6 is the permanent expert-prioritization workspace over the complete evidence-comparable portfolio produced by Slice 5. It records expert judgment as a separate append-only fact. It does not reinterpret, overwrite or compensate for system evidence.

The expert orders every current comparable `NICHE_OPPORTUNITY`, records a portfolio-level rationale and records an opportunity-specific rationale. The set is atomic: partial, duplicate, non-contiguous or research-required lists fail closed.

## Canonical boundaries

- Contract: `NICHE_PRIORITY_COMMAND_V1` / `NICHE_EXPERT_PRIORITY_V1`.
- Command: `SET_NICHE_PRIORITY` through `POST /api/factory/niche-priorities`.
- Persistence: `niche_expert_priority_sets`, `niche_expert_priority_items` and `niche_expert_priority_audits`, migration 0034.
- Projection: `NICHE_PORTFOLIO_PROJECTION_V2.priorityWorkspace` and `expertPriorityFact`.
- UI: the Slice 6 workspace and independent Expert Priority column at `/niche-discovery`.
- Identity: SIWC-authenticated and server-allowlisted owner/expert.
- Concurrency: expected priority version plus each opportunity's latest program, evidence and scoring versions.
- Lineage: one frozen `NICHE_EXPERT_PRIORITY_SET` record for every accepted version.
- Actual provider requests and spend: `0` / `$0`.

## Atomic comparable-set contract

The server resolves the latest canonical program for every channel and the latest Slice 5 scoring assessment for every opportunity. Only `SUFFICIENT` assessments belong to the comparable set. A valid priority command must:

1. contain every and only the current comparable opportunity;
2. bind the canonical channel, program, origin, aggregate, evidence and scoring versions;
3. assign one unique contiguous priority from `1..N`;
4. contain a substantive rationale for the portfolio and each opportunity; and
5. pass idempotency and optimistic priority-version controls.

The resulting set stores its own canonical comparable-set hash. It is append-only and immutable.

## Independence and stale-state policy

Expert priority and system rank may agree or disagree. Neither overwrites the other. Recording or projecting Slice 6 cannot change:

- Market Attractiveness;
- Ability to Win;
- Evidence Confidence;
- evidence sufficiency or its gaps;
- comparison eligibility;
- prerequisites or winning criteria; or
- Slice 5 system rank.

If the comparable membership, aggregate version, evidence version or scoring version changes, the prior set remains historical evidence but projects as `STALE`. The lifecycle returns to `COMPARABLE` until an expert records a new priority version. No historical priority is silently edited.

## Authority boundary

Slice 6 authorizes only `expertPriorityMutation: true`. It explicitly reports:

```text
systemRankMutation = false
axisMutation = false
evidenceSufficiencyMutation = false
eligibilityMutation = false
nicheSelection = false
nicheCommitment = false
channelNicheMutation = false
channelStrategyActivation = false
providerRequests = 0
spendUsd = 0
aggregateScore = null
```

Slice 7 owns selection, commitment and governance. Slice 8 separately owns Channel Strategy activation. Direct expert-priority-to-commitment transition remains forbidden.

## Commercial workspace

The workspace shows system rank, the three Slice 5 axes and eligibility as read-only context beside editable expert priority and rationale. It requires the canonical all-channel portfolio scope, exposes active/stale/version state, supports accessible numeric ordering and prevents submission until ranks are complete and contiguous. The comparison matrix and dossier show versioned active or stale facts without hiding system rank.

## Acceptance evidence

- Canonical command tests cover complete comparable ordering, append-only record, idempotent replay, idempotency conflict, stale priority version and partial-portfolio rejection.
- Projection tests prove system rank, all three axes and eligibility are unchanged before and after expert priority.
- Reassessment tests prove a newer Slice 5 version makes the priority set stale instead of rewriting it.
- Atomic set, item, audit and frozen-lineage writes are verified.
- SIWC, server allowlist, no-store and zero-spend API boundaries are enforced.
- Commercial UI, async boundary, Niche V2, Intelligence/Niche, build, artifact, rendered authentication, performance and full regression gates remain continuous.

## Exact next action

After the Slice 6 production checkpoint and recovery-tested source capsule, implement Slice 7 as the permanent Niche Commitment & Governance capability. Slice 7 must preserve expert priority as an input fact, introduce an explicit selection state before commitment, prohibit direct `EXPERT_PRIORITIZED → COMMITTED`, and keep Channel Strategy activation blocked for Slice 8.

## Protected scope

- Do not reconstruct or rerun Slices 1–6.
- Do not use the V1 expert-decision command as Slice 6 priority, Slice 7 selection or commitment.
- Do not select, commit or mutate `channels.niche` in Slice 6.
- Do not activate Channel Strategy before Slice 8.
- Do not create a total score or compensate for a prerequisite gap.
- Do not dispatch providers or move authority into QA.
