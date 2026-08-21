# Wave 3 Corpus Verification Production Acceptance

**Class:** `EXECUTION_EVIDENCE`  
**Date:** 2026-08-21 (Asia/Bangkok)  
**Policy:** `CORPUS_VERIFICATION_POLICY_V1`

## Outcome

Migration `0053_evaluation_corpus_verification.sql` is production-active. The owner-bound verifier completed the read-only R2 sweep for every historical candidate. This accepts the byte-reconciliation mechanism and its production run; it does not accept any candidate as a fixture, gold item or release candidate.

## Immutable deployment lineage

- Sites v395 deployed the verifier from source commit `a067e81e569faeaed898990e06fa154a3f3ec115`.
- Sites v396 deployed pending-cursor form idempotency from `cffae92dd89249d578161229b144127923c999ed`.
- Sites v397 deployed cursor-bearing `no-store` redirects from `1c0aa0f3146376210887cd2494082bb99c21f59d`.
- Production URL: `https://youtube-ai-factory.quach-hung.chatgpt.site`.

## Production read-back

| Measure | Exact result |
|---|---:|
| Verification runs | 30 |
| Candidate artifacts | 595 |
| Pending | 0 |
| Bytes read | 851,549,647 |
| Byte-verified | 595 |
| Checksum PASS | 588 |
| Provenance PASS | 583 |
| Rights PASS | 520 |
| Rights pending | 63 |
| Blocked | 12 |
| Verified fixtures | 0 |
| Gold-eligible fixtures | 0 |
| Release-eligible fixtures | 0 |
| Sealed datasets | 0 |
| Provider requests in this slice | 0 |
| Provider spend in this slice | $0 |

The 12 blocked candidates are evidence, not noise to suppress. Seven fail checksum reconciliation; twelve do not reach provenance PASS. The 63 rights-pending candidates passed the byte/checksum/provenance substrate but lack the explicit provider receipt required by policy. `520 + 63 = 583`, matching the provenance-qualified population.

## Operational observations

Production QA exposed stale post-redirect projections during repeated form submissions. Idempotency prevented duplicate verification runs. Sites v397 added a changing cursor to the redirect and `cache-control: no-store`. Cloudflare logs also recorded canceled browser navigations; no canceled invocation created a provider request, spend, fixture promotion or release authority. The final owner-bound retry completed the remaining 15 candidates.

## Preserved locks

- Global production remains 56 historical provider requests: 49 completed, seven failed and zero active.
- Global recorded spend remains `$13.247131145833333` of the historical `$20` plan.
- `VQ-M0-SAFETY-SCOPE` remains `NOT_EVALUATED` and dispatch-blocking.
- Golden r10, Stage 11, Videos 2–15, assurance qualification and auto-publish remain blocked.
- Historical rejected artifacts remain immutable and zero release-eligible.

## Acceptance and next gate

The corpus byte-reconciliation phase is accepted. WP7 is not complete. The next protected sequence is:

1. investigate the 12 blocked receipts without rewriting history;
2. collect explicit receipts for 63 rights-pending candidates;
3. bind owner-confirmed defect labels;
4. de-duplicate and remove correlated revisions;
5. partition independent calibration fixtures before sealing any dataset or calling an assurance provider.
