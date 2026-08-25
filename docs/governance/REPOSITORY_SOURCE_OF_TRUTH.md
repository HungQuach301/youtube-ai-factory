# Repository Source-of-Truth Policy

**Policy:** `GIT_REPOSITORY_SSOT_V1`
**Effective:** 2026-08-20
**Canonical repository:** `youtube-ai-factory`
**Canonical branch:** `main`
**Replication policy:** `DUAL_REMOTE_SINGLE_COMMIT_SSOT_V1`
**Excluded repository:** `HungQuach301/youtube-ai-factory-v2`

## Decision

The tracked contents and history of this Git repository are the sole durable source of project truth and knowledge. A future chat must be able to recover the project state, governing decisions, exact next action and protected scope by cloning or fetching this repository without reading a prior conversation.

The repository is replicated as the same Git object graph to ChatGPT Sites `origin/main` and the private personal GitHub repository `HungQuach301/youtube-ai-factory` at `github/main`. One exact `main` commit is the source of truth; the remotes are mirrors, not independent authorities. The complete history was imported and exact-SHA equality was verified on 2026-08-25, so repository state is `SYNCHRONIZED`. Any later mismatch immediately changes state to `SYNC_BLOCKED`. The full migration, divergence and recovery protocol is in [`REPOSITORY_SYNC_AND_RECOVERY.md`](REPOSITORY_SYNC_AND_RECOVERY.md).

Chat history, model memory, local scratch directories, ChatGPT Library, Google Drive, exported patches, Git bundles and archives may preserve redundant evidence. They cannot introduce, override or complete a project fact until that fact is reconciled and committed here.

## What belongs in the repository

- Executable source, schemas, migrations and tests.
- Current-state and continuity documents.
- Architecture decisions and standards.
- Master issue and risk disposition.
- Roadmap, work-package gates and acceptance evidence.
- External assessments with provenance and reconciliation.
- Small evidence files required to explain a decision.
- Scripts that validate documentation integrity and recovery instructions.

## What does not become canonical by itself

- A chat answer or screenshot.
- A plan that has not produced stored evidence.
- An expert recommendation without disposition.
- A provider response without reconciliation.
- A local or Library file not tracked by Git.
- A generated bundle or archive of this repository.
- A UI state that conflicts with the underlying evidence.

## Conflict resolution

1. Reconcile runtime evidence and source before editing a status statement.
2. Preserve the losing statement as historical evidence; do not rewrite history.
3. Record the resolution in the decision log or issue registry.
4. Name the exact document or ADR that supersedes the earlier statement.
5. Add a regression or validation check when the conflict can recur mechanically.

## Document lifecycle

Every normative or current-state document must have an identifiable owner scope and one of these states:

- `ACTIVE`
- `HISTORICAL`
- `SUPERSEDED_BY:<path-or-ADR>`
- `EVIDENCE_ONLY`
- `CALIBRATION_REQUIRED`

Only active documents remain in the ordinary reading tree and are indexed by `docs/README.md`. Superseded plans, numbered execution records, diagnostics and prior snapshots live under `docs/archive` with `HISTORICAL_READ_ONLY` authority. Git history and the archive preserve lineage without letting old plans drive current work.

## New-chat recovery protocol

```bash
git clone -o github https://github.com/HungQuach301/youtube-ai-factory.git
cd youtube-ai-factory
git switch main
git pull --ff-only github main
git status --short --branch
npm run check:docs
```

Then read the required sequence in `docs/README.md`. Do not reconstruct source from a transcript when the Git remote is available.

## Material-session close protocol

1. Finish the smallest coherent authorized unit.
2. Run the relevant tests and `npm run check:docs`.
3. Update current state, decisions, issue disposition and roadmap truth.
4. Review the full diff and confirm no secrets or generated runtime data are tracked.
5. Commit with a bounded message.
6. Push the same exact commit to `origin/main` and `github/main` without history rewrite.
7. Verify local HEAD, `origin/main` and `github/main` are identical and the worktree is clean.
8. Report the exact commit, verification results, limitations, protected scope and next action.

Optional bundles or archives may be generated for disaster recovery, but they are derivative exports and must never be required for ordinary chat continuation.

## Deletion and cleanup

Legacy documents, source or evidence may be removed from the active tree only when:

- their canonical replacement is committed;
- provenance and relevant decisions are preserved;
- no active code, test, migration or document references them;
- the cleanup is explicitly owner-authorized and independently validated.

Prefer a tracked move to `docs/archive` over byte deletion when the material retains audit value. This consolidation does not delete runtime evidence or change Production state.
