# Wave 3 Correlation Control Execution Record

**Class:** `EXECUTION_EVIDENCE`  
**Date:** 2026-08-21 (Asia/Bangkok)  
**Policy:** `EVALUATION_CORRELATION_CONTROL_V1`

## Purpose

Reduce owner attention and prevent correlated revisions from inflating evaluation sample size without deleting, rewriting or silently resolving any of the 525 immutable owner-label tasks.

## Production outcome

Migration `0059_evaluation_correlation_control.sql` creates one immutable snapshot and one immutable assignment per currently eligible owner-label candidate. Selection is hierarchical:

1. Byte-identical artifacts are collapsed by exact SHA-256; one evidence-rich deterministic representative survives and other copies become `EXACT_DUPLICATE_DEFERRED`.
2. Unique hashes are grouped by shot contract plus artifact type, or for non-shot evidence by package plus candidate kind and artifact type.
3. One representative per lineage family becomes `READY_PRIMARY`; other unique variants become `CORRELATED_VARIANT_DEFERRED`.
4. Ranking prefers stored artifact-level P0/P1 evidence, then the latest source timestamp, then a deterministic candidate ID tie-break.

Sites v409 activated migration `0059` from source commit `213038f808911ce31a38a708346e9f790417c0bf`. The previous 525 task ledger remains unchanged. Production assigned all 525 eligible candidates to 82 actionable primary representatives and 443 correlated variants; no byte-identical duplicate was present in this corpus. Deferred evidence remains available for later coverage-gap review but cannot enter the primary owner queue or independent counts.

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
- Production migration/read-back in Sites v409: PASS.
- Candidate/task preservation: 595 candidates, 525 owner-label tasks and zero owner receipts.
- Attention projection: 82 actionable primaries, 443 correlated variants deferred and zero exact duplicates deferred.
- Independent-count projection: 82 eligible.
- Eligibility boundaries: 525 rights PASS, 63 rights-pending and seven excluded.
- Slice side effects: zero provider requests, zero spend, zero Worker error events.

## Next gate

Collect real owner labels only for the 82 actionable primary representatives. In parallel, collect exact historical rights evidence for 46 ElevenLabs audio records, composite parent-rights manifests for 16 masters and authorship/source evidence for one clip. No dataset may be sealed until the required labels and independent-count assignments are both durable.
