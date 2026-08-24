# Wave 3 Blocked-Evidence Diagnostic Execution Record

**Class:** `EXECUTION_EVIDENCE`  
**Date:** 2026-08-21 (Asia/Bangkok)  
**Policy:** `IMMUTABLE_RECEIPT_AGGREGATION_V2`

## Outcome

Sites v399 activated diagnostic v1 and confirmed the production distribution for all twelve blocked candidates:

- reason counts: 12 `R2_OBJECT_METADATA_MISMATCH`, 7 `BYTE_SIZE_MISMATCH`, 7 `CHECKSUM_MISMATCH`, plus 12 v1 unknown rights-basis codes;
- state counts: 7 `READBACK_VERIFIED/FAIL/FAIL` and 5 `READBACK_VERIFIED/PASS/FAIL`;
- modality counts: 8 clips, 2 audio artifacts and 2 masters.

Source v2 keeps those dimensions and adds a fourth sanitized field-fact dimension. It compares candidate/source declarations, recomputed R2 object bytes and parsed R2 metadata server-side. The projection aggregates:

- allowlisted reconciliation reason code;
- byte/checksum/provenance state combination;
- candidate kind;
- field-level mismatch fact.

It does not repair or reclassify any evidence.

Sites v400 production read-back reports these field facts:

- 12 `R2_ARTIFACT_ID_FIELD_MISMATCH`;
- 7 `R2_METADATA_HASH_DECLARATION_MISMATCH`;
- 7 `SOURCE_HASH_OBJECT_BYTES_MISMATCH`;
- 7 `SOURCE_BYTE_SIZE_OBJECT_MISMATCH`.

The rights bases are eight `AUTHORSHIP_EVIDENCE_INCOMPLETE` and four `PROVIDER_TERMS_RECEIPT_MISSING`. This proves seven source/object byte-divergent candidates and five metadata-only candidates.

## Privacy and authority boundary

- The known rights bases `DECLARATION_NOT_ELIGIBLE`, `PROVIDER_TERMS_RECEIPT_MISSING` and `AUTHORSHIP_EVIDENCE_INCOMPLETE` are allowlisted; every other unknown receipt reason collapses to `UNKNOWN_RECONCILIATION_REASON`.
- Missing reason arrays become `RECONCILIATION_REASON_MISSING`.
- Source artifact IDs, candidate IDs, storage keys, hashes, byte values, object metadata and raw arbitrary reason text are excluded from the projection and UI.
- Provider requests, spend, fixture promotion, dataset membership, rights changes, owner labels and release eligibility remain zero-authority paths.

## Source changes

- `summarizeCorpusEvidenceConflicts` provides deterministic, sorted reason/state/kind/fact aggregation and ignores absent numeric declarations instead of manufacturing mismatches.
- The evaluation API and canonical sequential projection read only the latest receipt attached to blocked candidates.
- The Video Engine shows blocked count, rights queue, dominant reason, state combination and modality distribution.
- The production contract now recognizes `CORPUS_BYTE_RECONCILIATION_COMPLETE` explicitly.

## Verification

- Targeted evaluation/first-pass regression: 16/16 PASS for v2.
- Changed-scope ESLint: PASS.
- No migration is required; migrations `0052` and `0053` remain the authoritative persistent model.
- Production v1 and v2 distributions are recorded above; both used zero provider request and zero spend.

## Next gate

Apply `EVALUATION_EVIDENCE_DISPOSITION_V1`: append incidents for all twelve, quarantine only the seven byte-divergent candidates and retain the five metadata-only candidates for a new binding-evidence review. Existing receipts must not be rewritten.
