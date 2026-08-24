# Repository Synchronization and Recovery

**State:** `ACTIVE_NORMATIVE__GITHUB_REMOTE_PENDING`
**Policy:** `DUAL_REMOTE_SINGLE_COMMIT_SSOT_V1`
**Effective:** 2026-08-24

## Decision

The Git repository is one source of truth replicated to two remotes:

```text
ChatGPT Sites source remote: origin/main
Personal GitHub mirror:      github/main
Canonical identity:          one exact commit SHA on main
```

`HungQuach301/youtube-ai-factory-v2` is explicitly excluded. It is neither a source, mirror, upstream, fallback nor recovery input for this repository.

The personal GitHub target is a new private repository named `HungQuach301/youtube-ai-factory`. Until it exists and both remote refs match, repository state is `GITHUB_REMOTE_PENDING` and must not be described as synchronized.

## Single-source semantics

There are not two editable truths. A material checkpoint is complete only when local `main`, `origin/main` and `github/main` resolve to the same commit. Any mismatch becomes `SYNC_BLOCKED`; neither remote silently wins.

Runtime D1/R2 state and immutable Production receipts remain authoritative for runtime facts. Git holds code/contracts/docs truth. Google Drive and other archives remain recovery copies only.

## Write protocol

1. Start from clean local `main` matching both remotes.
2. Reconcile runtime/source truth before editing status documents.
3. Make a bounded change; run required documentation, tests and build gates.
4. Review the full diff and secret scan.
5. Commit once on `main` under the standing repository policy.
6. Push the exact commit to `origin/main` through the Sites checkpoint flow when deployment is part of the change.
7. Push the same exact commit to `github/main` without merge, rebase or content rewrite.
8. Fetch both and prove the three SHAs are identical; require a clean worktree.

## Divergence protocol

- Stop new mutation and mark `SYNC_BLOCKED`.
- Fetch both remotes and preserve their exact refs.
- Do not force-push, reset, merge or cherry-pick automatically.
- Determine which commits contain reconciled runtime evidence and approved project decisions.
- Record the resolution in the decision log; add a regression guard if mechanical.
- Restore one linear `main`, then push the same commit to both remotes.

## Recovery protocol

Prefer cloning the personal GitHub mirror for user-controlled recovery, then add the Sites remote through the Site lifecycle checkout. Verify `main` identity before using either source. If one remote is unavailable, work remains read-only unless the other remote and the last recorded sync receipt prove an exact clean checkpoint.

Required recovery evidence:

```text
repository name and excluded repositories
main commit SHA
origin/main SHA
github/main SHA
documentation check result
relevant tests/build result
Production URL and runtime checkpoint
protected scope and exact next action
```

Bundles, archives, Library files, Drive copies and chat transcripts cannot override the repository.

## Security

- Never store GitHub, Sites, provider or deployment credentials in Git configuration, remote URLs, docs or logs.
- The GitHub repository is private by default.
- Do not track `.env`, runtime dumps, raw secrets, personal provenance or unredacted provider responses.
- Publication and widening repository/Site access are separate owner-authorized actions.
