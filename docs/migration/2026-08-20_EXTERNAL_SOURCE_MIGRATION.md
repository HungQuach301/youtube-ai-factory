# External Source Migration — 2026-08-20

**State:** `COMPLETE_PENDING_GIT_CHECKPOINT`

## Purpose

Account for project knowledge found outside the canonical repository and record whether it was imported, already represented, superseded or excluded as a derivative recovery artifact.

## Inventory

| External source | Disposition | Evidence |
|---|---|---|
| FP2 Capability Registry v385 capsule | Already represented and superseded by FP3/current Git history | Documents 03, 09 and 38 are tracked; later commits preserve the change history |
| FP3 ShotCueProgram v387 capsule | Already represented exactly | External Documents 03, 09 and 39 compare equal to tracked files; HEAD `5b669fc` exists on `origin/main` |
| Slice 6–8, Channel Strategy and earlier capsules | Already represented by later tracked source and commit history | Current repository contains Documents 16–27 and all later product checkpoints |
| Git bundles, binary patches and tracked-source archives | Not imported | Derivative recovery exports of commits already present on canonical remote; importing them would duplicate and recursively archive the repository |
| Temporary clean-recovery checkouts | Not imported | Disposable verification workspaces, not project knowledge |
| Detailed expert assessment markdown | Imported byte-for-byte | [`../expert-assessments/2026-08-20_VIDEO_ENGINE_DETAILED_IMPROVEMENT_SPEC.md`](../expert-assessments/2026-08-20_VIDEO_ENGINE_DETAILED_IMPROVEMENT_SPEC.md), SHA-256 `4cc45dd5f786e8714c7363cc851e03c8e2cb12a0ca7fea30e8f1410715255b5f` |
| Chat maximum-length screenshot | Imported as non-normative evidence | [`../evidence/chat-rollover/2026-08-20_CHAT_LENGTH_LIMIT.jpg`](../evidence/chat-rollover/2026-08-20_CHAT_LENGTH_LIMIT.jpg), SHA-256 `82206b8a328b52fe66ddc8a51484ef6f8a1a50f94ed31754eb36f6272664cbb3` |
| Expert A–G issue ledger and whole-system WP1–WP7 assessment | Reconciled into canonical documents | Master issue registry, target architecture, roadmap and expert reconciliation |

## Preservation rule

The external directories are not deleted by this migration. Their project knowledge has been reconciled, but deletion is a separate destructive operation and requires explicit scope after the canonical Git checkpoint is verified.

## Completion gate

Migration becomes `COMPLETE` only when:

- documentation validation passes;
- the full diff is reviewed;
- the consolidation is committed;
- the commit is pushed to `origin/main`;
- local HEAD equals `origin/main` with a clean worktree.
