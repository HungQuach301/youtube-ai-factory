# Chat Rollover Handoff

**Policy:** `GIT_REPOSITORY_SSOT_V1`

**Current source classification:** `WAVE_2_SOURCE_IMPLEMENTED_TESTED__PRODUCTION_MIGRATION_PENDING`

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
- FP3.1 Production Integrity is active. Sites v388 failed safely before publish on duplicate historical default fencing tokens; corrected migration `0050` became active in Sites v389. Sites v390 zero-dispatch runtime acceptance passed with unchanged provider/spend totals. Sites v391 removed the temporary QA source authorization path; its environment key is absent and a retired QA header is rejected with `401`.
- Production currently reports 56 historical provider requests (49 completed, seven failed), zero active requests and actual recorded spend of `$13.247131145833333`; FP3.1 added zero requests and zero spend.
- `VQ-M0-SAFETY-SCOPE` remains `NOT_EVALUATED`. FP3.1 proves the fail-closed infrastructure, not the financial-content safety evidence needed to open dispatch.
- Golden r9 is immutable rejected evidence.
- Golden r10, Stage 11, Videos 2–15 and auto-publish are blocked.
- Paid FP4 authority has not been granted.
- Wave 2 source defines all eight `LEARNING_READY_CONTRACT_PACK_V1` contracts plus migration `0051`, fail-closed validators, operator projection and regression coverage. It creates no actual channel/video artifacts and activates no learning command.
- Production remains Sites v391 on FP3.1; migration `0051` has not been applied. The next protected action is an explicitly authorized production checkpoint with zero-dispatch read-back, followed by WP7 Evaluation Foundation. Paid FP4/FP5 remains unauthorized.

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
