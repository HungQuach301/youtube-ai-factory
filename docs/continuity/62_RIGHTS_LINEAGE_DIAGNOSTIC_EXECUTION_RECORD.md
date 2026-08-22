# Rights Lineage Diagnostic and Render Hardening Execution Record

**Class:** `EXECUTION_EVIDENCE`

**Policy:** `EVALUATION_RIGHTS_LINEAGE_DIAGNOSTIC_V1`

**Production state:** `SOURCE_READY__PRODUCTION_PENDING`

## Outcome

Migration `0068_evaluation_rights_lineage_diagnostics.sql` creates an immutable, zero-authority diagnostic for the 16 historical composite-master tasks and one historical authorship/clip task. It records only facts present on each source artifact: exact artifact identity/hash, any declared source-manifest binding, any declared parent set and the count of manifests discoverable in the same package.

A same-package manifest is explicitly not accepted as an exact render binding. The diagnostic can never create rights PASS, a composite/authorship receipt, dataset membership, assurance qualification or release eligibility.

## Recurrence prevention

The Production V2 upload path now rejects every new pilot or full-master render unless the caller binds:

- exact source-manifest artifact ID;
- exact source-manifest SHA-256;
- manifest bytes that read back to the same hash;
- one unique parent artifact ID/hash per render input;
- parent records that match the canonical package ledger.

Only after all checks pass is the render stored with `EXACT_SOURCE_MANIFEST_AND_PARENT_SET_VERIFIED` provenance. The contract applies before storage, so an unbound render cannot enter the new artifact ledger.

## Historical boundary

The historical 16 masters and one clip remain `PARTIAL_RIGHTS_PENDING`. Their co-located manifests do not retroactively prove which inputs produced their exact bytes. The 46 ElevenLabs audio tasks are unchanged and still require a terms snapshot and paid-plan evidence covering generation time plus exact request/response/artifact binding.

## Source verification

```text
MIGRATION = 0068_SOURCE_READY
POLICY = EVALUATION_RIGHTS_LINEAGE_DIAGNOSTIC_V1
RIGHTS_PASS_AUTHORITY = FALSE
DATASET_SEALING_AUTHORITY = FALSE
ASSURANCE_QUALIFICATION_AUTHORITY = FALSE
RELEASE_AUTHORITY = FALSE
NEW_RENDER_LINEAGE_GATE = EXACT_MANIFEST_ID_SHA256_AND_PARENT_SET
PROVIDER_REQUESTS = 0
SPEND_USD = 0
```

Targeted Evaluation Foundation tests and the verified production build pass. Production deployment and D1 read-back must be appended before this record can claim an active production count.

## Next protected action

Deploy the additive migration, read back the immutable 16/1 diagnostic distribution, and keep all 17 historical artifacts fail-closed. Then collect authoritative historical ElevenLabs terms/plan evidence and design new controlled clean/defect fixtures; do not promote historical rights from package correlation.
