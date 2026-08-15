# AI Factory Working Instructions

## Start every chat

1. Read `README.md`, `docs/continuity/03_CURRENT_STATE.md`, `docs/continuity/09_CHAT_ROLLOVER_CAPSULE.md` and `docs/continuity/10_RECONSTRUCTED_SLICES_CHECKPOINT.md` before changing source.
2. Verify the exact worktree, branch, HEAD and `git status --short`; never infer source from a prior chat transcript.
3. If the required commit is absent, restore the latest verified continuity capsule from ChatGPT Library and validate `SHA256SUMS` before work.
4. Treat the product as a multi-channel operating system. V7/V23 is the Video Production Engine, not the whole product.
5. State the bounded outcome, acceptance evidence and protected scope.

## Non-negotiable controls

- New portfolio slices are read-only until a separately approved typed command contract grants mutation authority.
- Build quality into every owning stage. QA is independent release assurance, not a repair department.
- Preserve recommendation, expert decision and committed state as separate facts.
- Niche Discovery must output a comparable opportunity portfolio, never a single champion presented as a yes/no decision.
- Keep system rank, expert priority, selection, commitment and Channel Strategy activation as separate versioned facts.
- Treat niche prerequisites as hard gates; an attractive-market score cannot compensate for a failed prerequisite.
- Route expert-seeded and system-discovered niche hypotheses through the same support, contradiction and unknown-evidence workflow.
- No demo/local fallback may replace unavailable canonical data.
- No operator-facing slice is commercial-ready without responsive, interaction, accessibility, truthful-state and performance evidence.
- One chat may mutate a given worktree at a time.
- Do not deploy, dispatch a provider, migrate data, run production QA or delete legacy state without explicit authority and runtime reconciliation.

## Proactive continuity rule

Before a chat rollover or after a coherent material milestone, the active assistant owns continuity preparation. It must:

1. finish the smallest coherent unit and run the required verification;
2. create a local Git commit;
3. generate a binary patch, Git bundle, tracked-source archive, manifest and SHA-256 checksums;
4. prove recovery from the capsule in a clean checkout;
5. save the source capsule and updated checkpoint/handoff documents to ChatGPT Library;
6. report `ROLLOVER READY` only after those gates pass.

The user must never be asked to choose between reconstructing source and locating an old working copy. If capsule preparation cannot complete, report `ROLLOVER BLOCKED`, keep the worktree intact and name the failed gate.

## End every material session

Record actual tests/build/lint results, deployment truth, known limitations, exact next action and protected scope. Do not claim byte-identical recovery for rebuilt source; use `RECONSTRUCTED_V1` and preserve its verified commit/capsule identity.
