# Wave 3 Correlation Control Execution Record

**Class:** `EXECUTION_EVIDENCE`  
**Date:** 2026-08-21 (Asia/Bangkok)  
**Policy:** `EVALUATION_CORRELATION_CONTROL_V1`

## Purpose

Reduce owner attention and prevent correlated revisions from inflating evaluation sample size without deleting, rewriting or silently resolving any of the 525 immutable owner-label tasks.

## Source outcome

Migration `0059_evaluation_correlation_control.sql` creates one immutable snapshot and one immutable assignment per currently eligible owner-label candidate. Selection is hierarchical:

1. Byte-identical artifacts are collapsed by exact SHA-256; one evidence-rich deterministic representative survives and other copies become `EXACT_DUPLICATE_DEFERRED`.
2. Unique hashes are grouped by shot contract plus artifact type, or for non-shot evidence by package plus candidate kind and artifact type.
3. One representative per lineage family becomes `READY_PRIMARY`; other unique variants become `CORRELATED_VARIANT_DEFERRED`.
4. Ranking prefers stored artifact-level P0/P1 evidence, then the latest source timestamp, then a deterministic candidate ID tie-break.

The previous 525 task ledger remains unchanged. Deferred evidence remains available for later coverage-gap review but cannot enter the primary owner queue or independent counts.

## Runtime boundary

- Owner playback and receipt submission now require `READY_PRIMARY` plus `independent_count_eligible=1`.
- An exact duplicate or correlated variant cannot bypass the reduced queue by calling the route directly.
- The policy changes attention routing only. It does not create an owner decision, label, fixture, gold record, dataset item, qualification or release authority.
- No provider request, external model call or spend is required.

## Verification

- Exact-hash cardinality and one-primary-per-lineage validator: PASS.
- Synthetic five-candidate migration fixture: three primary, one exact duplicate deferred and one correlated variant deferred; all five original tasks preserved.
- Append-only snapshot/item triggers: PASS.
- Migration replay through `0059`: PASS.
- Full build and catalog-wide performance gate: PASS.
- Production migration/read-back: pending checkpoint.

## Next gate

Activate `0059`, read back the actual production reduction and then collect owner labels only for actionable primary representatives. Rights evidence for 63 excluded candidates remains a separate parallel lane. No dataset may be sealed until labels and independent-count assignments are both durable.
