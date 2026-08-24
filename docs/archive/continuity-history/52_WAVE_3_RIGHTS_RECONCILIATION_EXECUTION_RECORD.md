# Wave 3 Rights Reconciliation Execution Record

**Class:** `EXECUTION_EVIDENCE`  
**Date:** 2026-08-21 (Asia/Bangkok)  
**Policy:** `EVALUATION_RIGHTS_RECONCILIATION_V1`

## Production basis

Sites v402 applied metadata reconciliation with the exact expected outcome: five accepted metadata-binding receipts, zero technical blocks, zero open incidents, seven quarantined candidates and 68 rights-pending candidates. Technical integrity is not rights authority.

## Source outcome

Migration `0056_evaluation_rights_reconciliation.sql` creates an append-only evaluation-rights receipt only for a candidate that:

- already has an accepted metadata-binding receipt;
- has read-back bytes, checksum and provenance PASS;
- has an accepted rights declaration;
- is not audio or video;
- has no provider in provenance;
- has an explicit channel author, actor or executor;
- proves zero legacy sources.

The receipt uses basis `CHANNEL_AUTHORED_EVALUATION_USE`. It can move only rights verification to PASS and verification state to `EVIDENCE_VERIFIED`. The artifact remains `CANDIDATE_EVIDENCE`: owner decision, defect label, correlation/de-duplication and permanent release ineligibility are unchanged.

The projection also adds sanitized rights-basis and candidate-kind counts for the remaining rights queue. Unknown basis text is collapsed and no artifact ID, storage key, hash, provider identifier or receipt content is exposed.

## Safety boundary

- provider terms cannot be inferred from a generic declaration;
- audio/video/provider-bound material cannot enter the channel-authored lane;
- rights receipts are append-only and reject update/delete;
- zero provider request and zero spend are database constraints;
- no fixture, dataset, qualification or release state is promoted.

## Verification

- Targeted Evaluation Foundation, contract-pack and integrity regression: 27/27 PASS.
- The migration fixture proves metadata reconciliation and rights reconciliation are separate receipts.
- The candidate remains `CANDIDATE_EVIDENCE` after rights PASS.
- Production migration/read-back: PASS in Sites v403.
- Exact result: 5 channel-authorship receipts, rights PASS 525, rights-pending 63.
- Remaining basis: 63 `PROVIDER_TERMS_RECEIPT_MISSING`.
- Remaining modality: 46 audio, 16 master and 1 clip.
- Provider slice stayed zero; global totals remain 56 historical requests, zero active and `$13.247131145833333`.

## Next gate

Deploy the sanitized provider-family diagnostic. Split direct provider assets from composite masters that require a parent-lineage manifest, then create an explicit evidence-collection plan without fabricating license receipts.
