# Wave 3 Metadata Binding Reconciliation Execution Record

**Class:** `EXECUTION_EVIDENCE`  
**Date:** 2026-08-21 (Asia/Bangkok)  
**Policy:** `METADATA_BINDING_RECONCILIATION_V1`

## Production basis

Sites v401 applied the evidence-disposition migration and returned exactly seven quarantined candidates, five blocked metadata-review candidates, twelve immutable incidents and seven immutable quarantine dispositions. The five remaining candidates are clips with:

- R2 byte read-back PASS;
- checksum PASS;
- candidate/source hash and byte size exact;
- R2 metadata package, hash and engine version exact;
- only the R2 `artifactId` field different;
- `AUTHORSHIP_EVIDENCE_INCOMPLETE`, so rights remain fail-closed.

## Source outcome

Migration `0055_evaluation_metadata_binding_reconciliation.sql` appends a provenance rebind receipt only when all of these conditions are true:

1. the object was read back and the checksum passes;
2. candidate, source and computed hashes are exact;
3. candidate, source and actual byte sizes are exact;
4. R2 package, hash and engine metadata match the source row;
5. the observed artifact ID is present and differs from the source row;
6. the source provenance proves zero legacy sources;
7. the storage-key/hash pair resolves uniquely to the source artifact row.

An accepted receipt changes only the candidate projection from provenance `FAIL` / verification `BLOCKED` to provenance `PASS` / `PARTIAL_RIGHTS_PENDING`. It does not change rights, owner decision, defect labels, fixture state, qualification eligibility or release eligibility.

## Persistence and immutability

- metadata-binding receipts are append-only;
- incident resolutions are separate append-only records;
- losing verification receipts and original incidents remain unchanged;
- no R2 object or source artifact is modified;
- zero provider request and zero spend are database constraints.

## Verification

- Targeted migration, Evaluation Foundation and integrity regression: 26/26 PASS.
- The fixture proves a stale observed artifact ID can rebind only through a unique exact storage-key/hash source.
- Rights remain `RECEIPT_REQUIRED` and lifecycle remains `CANDIDATE_EVIDENCE` after the rebind.
- Production migration/read-back: pending checkpoint.

## Next gate

Deploy migration `0055`. Expected production result is zero blocked metadata candidates, five accepted metadata rebind receipts, seven quarantined candidates and 68 rights-pending candidates. Gold eligibility, sealed datasets, release eligibility, provider requests and spend must remain zero.
