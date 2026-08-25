# Repository Synchronization and Recovery

**State:** `ACTIVE_NORMATIVE__SYNCHRONIZED`
**Policy:** `DUAL_REMOTE_SINGLE_COMMIT_SSOT_V1`
**Effective:** 2026-08-25

## Decision

The Git repository is one source of truth replicated to two remotes:

```text
ChatGPT Sites source remote: origin/main
Personal GitHub mirror:      github/main
Canonical identity:          one exact commit SHA on main
```

`HungQuach301/youtube-ai-factory-v2` is explicitly excluded. It is neither a source, mirror, upstream, fallback nor recovery input for this repository.

The new private `HungQuach301/youtube-ai-factory` repository is connected. Its bootstrap history was replaced by the complete canonical Sites history after checksum verification and a non-destructive staging-branch proof. Exact common commit `2431a800d2d540bcfea141c98c9977cd46667950` was independently observed on Sites `origin/main` and GitHub `main` on 2026-08-25. The bootstrap workflow and bundle parts are absent from canonical `main`.

Phase 45 synchronization receipt: the exact source tree first deployed by Sites was written to the private personal repository and canonicalized as commit `4c45e5bd36ec69c0eb09682fba3b411c723b84b2`, preserving parent `5f874568…` and tree `90a88e46…`. Because the GitHub API necessarily assigned a different commit identity to those identical bytes, displaced Sites tip `e16c8a0c…` was first preserved on `recovery/sites-e16c8a0-phase45`, then Sites `main` received one bounded `force-with-lease` update pinned to exact old SHA `e16c8a0c…`. The subsequent checkpoint restored exact equality across local `HEAD`, Sites `origin/main` and GitHub `main`. This exception is recoverable, content-preserving and grants no standing force-push authority. All later material changes must repeat the normal no-rewrite proof before new implementation begins.

Concurrent-tip receipt: while the canonical runtime writer checkpoint was being published, GitHub `main` advanced from common base `b6583a23…` to merge `03434774…`, whose tree restored an older baseline and whose message incorrectly assigned Phase 45 to V2. Publication stopped without force. The resolution preserves `03434774…` in ancestry, records its source/V2 claim as non-normative under ADR-139, and creates a forward merge using the reviewed canonical tree. This is a divergence reconciliation, not permission to import V2 or discard concurrent history.

Runtime-writer deployment receipt: the reconciled source tree built and deployed as Sites version 514; deployment `appgdep_6a8cf594c1c08191a846ec8365522b8c` succeeded and the live D1 overview verified nineteen `factory_*` tables including the seven `0107` writer/replay tables. The checkpoint made no provider request and changed no R21/R22 Production bytes.

Gateway/compiler deployment receipt: migration `0108` and its zero-dispatch runtime source built and deployed as Sites version 516; deployment `appgdep_6a8d334895008191a77bf70256460f01` succeeded and the live D1 overview verified twenty-eight `factory_*` tables. Writer/compiler feature flags remain disabled, no provider request or spend occurred, and no R21/R22 Production bytes changed.

Renderer-worker deployment receipt: migration `0109` and its qualified deterministic render-tape worker built and deployed as Sites version 521; the live D1 overview verified 50 user tables in total and thirty `factory_*` tables, including all three renderer tables. The renderer feature flag remains disabled, no provider request or spend occurred, and no R21/R22 pixel/video Production bytes changed.

Exact-history completion receipt: the owner approved one lease-bound replacement to exact Sites commit `3d752ad907989d8ad16f9ecce092975e66767657` and one temporary self-removing GitHub Actions workflow with `contents: write`. The workflow verified the immutable staging parent, incremental bundle prerequisites, exact target and target parent before using `force-with-lease`. After completion, GitHub `main`, Sites `origin/main` and local `HEAD` resolved to the approved SHA; `.github/workflows/one-time-exact-sites-sync.yml` and `.canonical-sync/youtube-ai-factory.bundle` were absent from final `main`, and trigger issue `#4` was closed. This receipt exhausts both approvals and grants no continuing force, workflow or staging authority.

## Initial mirror migration receipt

| Evidence | Verified result |
|---|---|
| Target | Private `HungQuach301/youtube-ai-factory`, default branch `main` |
| Connected authority | GitHub integration `admin` and `push` |
| Bundle integrity | SHA-256 `83b7fca58df377350634b39ecbb6fc247f94785bfa0640f9661a57586750b2c1`; complete history |
| Staging proof | `canonical-import` resolved to exact canonical commit before `main` replacement |
| Common baseline | `2431a800d2d540bcfea141c98c9977cd46667950` |
| Documentation gate | `Documentation SSOT PASS` |
| Bootstrap disposition | Workflow and bundle parts absent from canonical `main`; bootstrap issues closed |
| Excluded input | No file, commit, branch or tag imported from `youtube-ai-factory-v2` |

The initial force-replacement applied only to the owner-created bootstrap history after explicit owner continuation. It is not precedent or standing authority for future force-pushes.

No file, branch, commit or tag may be copied from `youtube-ai-factory-v2` during migration.

## Single-source semantics

There are not two editable truths. A material checkpoint is complete only when local `main`, `origin/main` and `github/main` resolve to the same commit. Any mismatch becomes `SYNC_BLOCKED`; neither remote silently wins.

Runtime D1/R2 state and immutable Production receipts remain authoritative for runtime facts. Git holds code/contracts/docs truth. Google Drive and other archives remain recovery copies only.

## Write protocol

1. Start from clean local `main` matching both remotes.
2. Reconcile runtime/source truth before editing status documents.
3. Make a bounded change; run required documentation, tests and build gates.
4. Review the full diff and secret scan.
5. Construct the reviewed tree once and create one forward commit on private GitHub `main` with the verified current common SHA as its only parent.
6. Recreate that exact Git commit object in the Sites checkout from the same parent, tree, message and GitHub-issued author/committer identity and timestamp; require the computed SHA to equal GitHub before moving local `main`.
7. Push the already-identical commit to `origin/main` through the Sites checkpoint flow when deployment is part of the change. Never merge, rebase, amend or content-rewrite either mirror.
8. Fetch both and prove local `HEAD`, `origin/main` and GitHub `main` are identical; require a clean worktree. Any object mismatch is `SYNC_BLOCKED`, not permission to force.

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
