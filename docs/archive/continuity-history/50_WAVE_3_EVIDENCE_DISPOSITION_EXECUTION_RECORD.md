# Wave 3 Evidence Disposition Execution Record

**Class:** `EXECUTION_EVIDENCE`  
**Date:** 2026-08-21 (Asia/Bangkok)  
**Policy:** `EVALUATION_EVIDENCE_DISPOSITION_V1`

## Production basis

Sites v400 field-fact read-back established two non-overlapping groups among the twelve blocked candidates:

- seven candidates have checksum failure, source-hash/object-byte divergence and source-byte-size/object-size divergence;
- five candidates have checksum PASS and provenance FAIL from an R2 artifact-ID metadata mismatch only;
- all twelve retain an independent rights blocker: eight `AUTHORSHIP_EVIDENCE_INCOMPLETE` and four `PROVIDER_TERMS_RECEIPT_MISSING`.

## Source outcome

Migration `0054_evaluation_evidence_disposition.sql` creates two append-only records:

1. an immutable evidence incident for every byte-divergent or metadata-binding candidate;
2. an immutable quarantine disposition for byte-divergent candidates only.

The seven byte-divergent candidate projections become `EXCLUDED` with reason `DECLARED_SOURCE_BYTES_DIVERGE_FROM_R2_OBJECT`. Their source objects, D1 artifacts, verification receipts and incident records remain intact. The five metadata-only candidates remain `BLOCKED`; only new binding evidence may re-adjudicate them.

## Safety boundary

- no R2 object is deleted, replaced or copied;
- no declared hash, byte size, provenance or verification receipt is overwritten;
- quarantine removes evaluation eligibility and cannot create release eligibility;
- incident and disposition tables reject update and delete;
- migration and projections are database-only, with zero provider request and zero spend;
- verified fixtures, gold eligibility, sealed datasets and release eligibility remain zero.

## Verification

- Targeted evaluation/first-pass regression: 17/17 PASS.
- Migration replay covers one byte-divergent and one metadata-only fixture.
- Immutability triggers reject incident update and disposition delete.
- Changed-scope ESLint: PASS.
- Production migration/read-back: PASS in Sites v401.
- Exact result: 12 incidents, 7 quarantine dispositions, 7 `EXCLUDED`, 5 metadata-review `BLOCKED`.
- Provider slice: zero request and zero spend; global totals unchanged at 56 historical requests, zero active and `$13.247131145833333`.

## Next gate

Deploy the strict append-only metadata rebind for the five checksum-valid candidates. Rights evidence and owner defect labels remain later gates.
