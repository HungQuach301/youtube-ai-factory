# AI Factory Working Instructions

## Repository authority

This Git repository is the sole source of project truth and knowledge. Chat transcripts, Personal Context, Library, Drive, scratch folders, screenshots, patches, bundles and archives are discovery or recovery aids only. They cannot override tracked source, decisions or reconciled runtime evidence.

The active policy is [`docs/governance/REPOSITORY_SOURCE_OF_TRUTH.md`](docs/governance/REPOSITORY_SOURCE_OF_TRUTH.md).

## Start every chat

1. Read `docs/README.md` and follow its required reading order before changing source.
2. Verify the exact repository, branch, HEAD, remote and `git status --short --branch`; never infer source from a prior chat transcript.
3. If the required commit is absent, fetch or clone `origin/main`. Do not reconstruct ordinary source from an old chat or Library capsule while the canonical remote is available.
4. Treat the product as a multi-channel operating system. V7/V23 is the Video Production Engine, not the whole product.
5. Reconcile current state, open issues, active roadmap wave and protected scope.
6. State the bounded outcome, acceptance evidence and protected scope.

## Non-negotiable controls

- New portfolio slices are read-only until a separately approved typed command contract grants mutation authority.
- Build quality into every owning stage. QA is independent release assurance, not a repair department.
- Preserve recommendation, expert decision and committed state as separate facts.
- Niche Discovery must output a comparable opportunity portfolio, never a single champion presented as a yes/no decision.
- Only typed `NICHE_OPPORTUNITY` aggregates may enter Niche Discovery; content pillars, series and video topics belong downstream in Channel Studio/Content Planning.
- Slices 4–8 are permanent commercial-tool capabilities with owned data/API/UI/audit/metrics boundaries, never one-time project tasks or manual document workflows.
- Keep system rank, expert priority, selection, commitment and Channel Strategy activation as separate versioned facts.
- Treat niche prerequisites as hard gates; an attractive-market score cannot compensate for a failed prerequisite.
- Route expert-seeded and system-discovered niche hypotheses through the same support, contradiction and unknown-evidence workflow.
- No demo/local fallback may replace unavailable canonical data.
- No operator-facing slice is commercial-ready without responsive, interaction, accessibility, truthful-state and performance evidence.
- One chat may mutate a given worktree at a time.
- Do not deploy, dispatch a provider, migrate data, run production QA or delete legacy state without explicit authority and runtime reconciliation.
- Capability qualification, active settings/version, cost reservation, rights eligibility and idempotency are dispatch prerequisites.
- Plans, schemas, migrations, UI labels and provider responses do not prove completion by themselves.

## Standing owner production authority

`OWNER_STANDING_PRODUCTION_AUTHORITY_V1`, granted 2026-08-21, covers roadmap-bounded production deployments, additive migrations, production QA and provider dispatch without asking the owner for a duplicate chat confirmation. Every operation must still pass the active typed plan, capability/settings qualification, atomic budget reservation, rights, safety, idempotency and fencing gates. This standing authority does not authorize auto-publish, public publication, deletion of historical evidence or weakening a hard gate; those remain separate typed owner decisions.

## Documentation and continuity rule

Before a chat rollover or after a coherent material milestone, the active assistant must:

1. finish the smallest coherent unit and run the required verification;
2. update the relevant current state, decision, issue and roadmap documents;
3. run `npm run check:docs` and the relevant source checks;
4. review the full diff and create a bounded Git commit;
5. push to `origin/main`;
6. verify local HEAD equals `origin/main` and the worktree is clean;
7. report `ROLLOVER READY` only after those gates pass.

Optional patches, bundles and archives are derivative disaster-recovery exports, not project authority. Do not copy nested repository bundles into this repository. If the Git checkpoint cannot complete, report `ROLLOVER BLOCKED`, keep the worktree intact and name the failed gate.

## End every material session

Record actual tests/build/lint results, deployment truth, known limitations, exact next action and protected scope. A material handoff is not complete until the canonical Git remote contains the checkpoint.
