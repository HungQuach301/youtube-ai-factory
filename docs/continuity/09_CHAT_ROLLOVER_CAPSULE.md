# Chat Rollover Handoff

**Policy:** `GIT_REPOSITORY_SSOT_V1`  
**Source classification:** `R21_VISUAL_FAIL_67__AUDIO_PASS_95__R22_DESIGN_ONLY`  
**Repository sync:** `SYNCHRONIZED`

## Start here

1. Read `AGENTS.md` and `docs/README.md`.
2. Verify repository name, `main`, `HEAD`, remotes and clean worktree.
3. Run `npm run check:docs`.
4. Read `03_CURRENT_STATE.md`, the active issue registry and current roadmap phase.
5. Ignore `docs/archive` unless investigating historical evidence.

## Current truth

- The approved design documentation is complete and the historical corpus is isolated under `docs/archive`.
- R21 exact master `3f968794…` is immutable: en-US audio PASS 95, visual FAIL 67.
- R22 is design-only and may not dispatch until Phase 45 implementation, dependency qualification, zero-spend preflight and integrated canary admission pass.
- Browser, owner freeze, release and publication are blocked.
- Phase 45 foundation `4c45e5bd…` is canonicalized and deployed: migration `0106` and its twelve `factory_*` tables are verified in live D1.
- Migration `0107`, the single command/event writer, leases/fencing, persisted stale projections and exact replay deployed in Sites version 514; all nineteen `factory_*` tables are verified in live D1. The SIWC/allowlist-protected route remains disabled by default, zero-spend and R22-blocked.
- Migration `0108`, the zero-dispatch Provider Gateway and deterministic Visual Profile -> Blueprint -> Shot Contract -> Scene Graph compiler are implemented and locally verified. Deployment/live-D1 verification is the active checkpoint; automatic fallback, provider dispatch, R22 and Production rendering remain blocked.
- Local, Sites and private GitHub `main` are synchronized on one exact commit after the Phase 45 synchronization checkpoint.
- `HungQuach301/youtube-ai-factory` contains the complete Sites Git history; the verified common baseline is `2431a800d2d540bcfea141c98c9977cd46667950`.
- `HungQuach301/youtube-ai-factory-v2` is never an upstream, mirror, fallback or recovery source.
- Concurrent GitHub merge `03434774…` is preserved for audit but its older tree/V2 classification is non-normative; the forward reconciliation commit must be the common tip on both remotes.

## Exact next action

Before the next mutation, re-prove:

```text
HEAD = origin/main = github/main
```

Then deploy/verify migration `0108`, preserve exact dual-remote equality, and implement the deterministic Scene Graph Renderer plus qualified worker/recovery path. Do not reconstruct from chat, re-run R21, dispatch R22, weaken a gate or publish.

## Rollover completion

Report `ROLLOVER READY` only when intended changes are committed, relevant checks pass, both remotes contain the same commit and the worktree is clean. Otherwise report `ROLLOVER BLOCKED` with the exact failed gate.
