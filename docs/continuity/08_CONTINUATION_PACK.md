# Continuation Protocol

**Policy:** `GIT_REPOSITORY_SSOT_V1`
**Supersedes:** `SOURCE_CONTINUITY_CAPSULE_V1` as the ordinary chat-continuation mechanism

## Session start

1. Clone or fetch the canonical repository and switch to `main`.
2. Verify branch, HEAD, remote and clean/dirty worktree truth.
3. Read `docs/README.md` in its required order.
4. Reconcile runtime evidence, active requests, spend and deployment only when the authorized task needs them.
5. Identify the active roadmap wave, one bounded next action and the protected no-rerun list.
6. Perform no mutation while material contradictions remain unresolved.

## Session close

Record:

- completed and incomplete work;
- exact commit and changed contracts;
- tests, build, lint and benchmark truth;
- provider request and cost truth;
- new, superseded or unresolved decisions;
- production/deployment truth;
- blockers and protected scope;
- one exact next action.

Commit and push the coherent checkpoint to `origin/main`. Verify local HEAD equals the remote and the worktree is clean before reporting `ROLLOVER READY`.

## Recovery

Ordinary recovery uses Git:

```bash
git clone <origin>
cd youtube-ai-factory
git switch main
git pull --ff-only origin main
npm run check:docs
```

Historical bundles, patches, archives and Library copies may be used only for disaster recovery when the canonical Git remote cannot provide the required commit. A recovered source must be compared with repository history and committed before it becomes authoritative.

## Current protected handoff

- FP1, FP2 mechanism and FP3 are implemented.
- Only one of 22 capability/operation bindings is qualified.
- Golden r10, Stage 11, Videos 2–15 and auto-publish remain blocked.
- Wave 3 corpus byte reconciliation is production-complete: 595 read, 12 blocked and 63 rights-pending.
- The next implementation boundary is WP7 evidence repair, owner labels and correlation control.
- Do not skip to paid FP4 dispatch.
