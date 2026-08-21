# Wave 3 Blocked-Evidence Diagnostic Execution Record

**Class:** `EXECUTION_EVIDENCE`  
**Date:** 2026-08-21 (Asia/Bangkok)  
**Policy:** `IMMUTABLE_RECEIPT_AGGREGATION_V1`

## Outcome

Source now turns the twelve blocked corpus candidates into a sanitized diagnostic projection. The projection reads each candidate's latest immutable verification receipt and aggregates three dimensions:

- allowlisted reconciliation reason code;
- byte/checksum/provenance state combination;
- candidate kind.

It does not repair or reclassify any evidence.

## Privacy and authority boundary

- Unknown receipt reasons collapse to `UNKNOWN_RECONCILIATION_REASON`.
- Missing reason arrays become `RECONCILIATION_REASON_MISSING`.
- Source artifact IDs, candidate IDs, storage keys, hashes, object metadata and raw arbitrary reason text are excluded from the projection and UI.
- Provider requests, spend, fixture promotion, dataset membership, rights changes, owner labels and release eligibility remain zero-authority paths.

## Source changes

- `summarizeCorpusEvidenceConflicts` provides deterministic, sorted aggregation.
- The evaluation API and canonical sequential projection read only the latest receipt attached to blocked candidates.
- The Video Engine shows blocked count, rights queue, dominant reason, state combination and modality distribution.
- The production contract now recognizes `CORPUS_BYTE_RECONCILIATION_COMPLETE` explicitly.

## Verification

- Targeted evaluation/first-pass regression: 16/16 PASS.
- Changed-scope ESLint: PASS.
- No migration is required; migrations `0052` and `0053` remain the authoritative persistent model.
- Production cause distribution remains `PRODUCTION_EVIDENCE_REQUIRED` until checkpoint deployment and live read-back.

## Next gate

Deploy the diagnostic source and read the production reason/state/kind distribution. Only then select a bounded append-only repair or exclusion workflow. Existing receipts must not be rewritten.
