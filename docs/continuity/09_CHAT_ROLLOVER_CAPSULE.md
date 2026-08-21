# Chat Rollover Handoff

**Policy:** `GIT_REPOSITORY_SSOT_V1`

**Current source classification:** `FP3_1_SOURCE_IMPLEMENTED_WITH_PRODUCTION_HISTORY_BACKFILL_FIX__PRODUCTION_RUNTIME_UNCHANGED`

**Production URL:** `https://youtube-ai-factory.quach-hung.chatgpt.site`

## Canonical recovery source

The canonical source is `origin/main` of this repository. Project memory and prior chats may help discover context, but a new chat must continue from the tracked knowledge base and exact Git state.

## Required new-chat sequence

1. Read `AGENTS.md`.
2. Read `docs/README.md` and its canonical sequence.
3. Verify `git rev-parse HEAD`, `git status --short --branch` and `git remote -v`.
4. Run `npm run check:docs`.
5. Read the current roadmap wave and only the documents it names.
6. Reconcile production/runtime state before any externally mutating action.

## Current handoff truth

- The latest code baseline before knowledge consolidation is `5b669fc9230f5b012ebe4aa2c0b5c21fa50df890`.
- FP1 truthful operator projection is implemented.
- FP2 Capability Registry mechanism is implemented.
- One of 22 capability/operation bindings is qualified.
- FP3 deterministic ShotCueProgram is sealed: 80.252 seconds, eight typed shots/treatments, zero timing/schema gaps, zero provider requests and zero spend.
- FP3.1 Production Integrity is implemented and tested in source. The first authorized Sites v388 checkpoint failed before publish on duplicate historical default fencing tokens; migration `0050` now backfills unique program-local tokens and passes a multi-lease history fixture. Production remains on the prior live version.
- Golden r9 is immutable rejected evidence.
- Golden r10, Stage 11, Videos 2–15 and auto-publish are blocked.
- Paid FP4 authority has not been granted.
- The next implementation milestone is separately authorized FP3.1 production migration and zero-dispatch runtime QA. Only after that gate closes may the Learning-ready Contract Pack and WP7 Evaluation Foundation proceed.

## Protected no-rerun list

Do not:

- reconstruct or rerun completed Niche, Channel Strategy or Content Planning slices without a new verified defect;
- treat historical Production Engine V2 masters as reusable or release-eligible;
- restore generic fallback, placeholder eligibility or routine QA-guided repair loops;
- render Golden r10 or open Stage 11 before required qualifications pass;
- dispatch providers, migrate production data, deploy, publish or delete legacy state without explicit authority and runtime reconciliation.

## Rollover-ready gate

A material session is ready to roll over only when intended changes are committed, pushed to `origin/main`, documentation checks and relevant regressions are recorded, local HEAD equals the remote and the worktree is clean.

Historical FP2/FP3 bundles and archives remain external derivative recovery exports. They are not required for ordinary continuation and are not project authority.
