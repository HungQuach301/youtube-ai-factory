# Wave 3 Owner-label Workflow Execution Record

**Class:** `EXECUTION_EVIDENCE`  
**Date:** 2026-08-21 (Asia/Bangkok)  
**Policy:** `EVALUATION_OWNER_LABEL_POLICY_V1`

## Purpose

Convert artifact-level owner judgment into attributable, exact-byte evaluation evidence without treating a rejected package, an inherited rejection or a UI action as ground truth. Only candidates with current byte/checksum/provenance verification, rights `PASS`, candidate-evidence lifecycle and zero release eligibility can enter the queue.

## Source outcome

Migration `0058_evaluation_owner_label_workflow.sql` creates immutable task and receipt ledgers. Each task binds one candidate to its exact 64-character artifact hash and the active defect taxonomy. Each accepted receipt records one of `REJECTED_DEFECT_PRESENT`, `CLEAN_NEGATIVE_CONTROL` or `EXCLUDE_UNUSABLE`, a reasoned owner statement, complete taxonomy coverage, a canonical request/evidence hash and the authenticated actor.

The owner workflow is server-rendered inside the operator surface. It streams the eligible R2 artifact only after SIWC owner authentication, recomputes SHA-256 before playback and rejects changed bytes. Every active defect family must be classified `PRESENT`, `ABSENT` or `NOT_APPLICABLE`. A rejected decision requires at least one present defect; a clean negative forbids all present defects.

## Safety boundary

- Scoped automation credentials cannot view or record owner judgments.
- Rights-pending, blocked, quarantined, release-eligible or non-byte-exact evidence cannot receive a task or receipt.
- Existing defect labels and new tasks/receipts are append-only.
- Labeling does not create `VERIFIED_FIXTURE`, `GOLD_ELIGIBLE`, dataset membership, assurance qualification or release authority.
- `EXCLUDE_UNUSABLE` preserves the artifact and receipt while excluding it from later counts.
- Provider requests and spend are structurally zero.

## Verification

- Exact-hash, rights, lifecycle, taxonomy-coverage and decision-consistency unit tests: PASS.
- Migration replay and immutability/zero-spend regressions: PASS.
- Full build and catalog-wide performance budget: PASS without raising a budget.
- Production migration/read-back: PASS in Sites v407.
- Exact production queue: 525 tasks, 525 open, zero receipts, zero owner-confirmed candidates and zero labelled candidates.
- Rights remained 525 PASS / 63 pending; seven quarantined candidates remained excluded.
- Unauthenticated owner workflow request: rejected with `401`.
- Provider requests/spend, fixture promotion, sealed datasets and release eligibility: unchanged at zero for this slice.

## Next gate

The owner must now classify the 525 eligible tasks through an authenticated ChatGPT Site session. Receipt counts are evidence, not a sealed dataset. Correlation groups and duplicate hashes must be adjudicated before any calibration, qualification or regression split can be sealed. The 63 rights-pending tasks remain on their separate evidence-collection lanes.
