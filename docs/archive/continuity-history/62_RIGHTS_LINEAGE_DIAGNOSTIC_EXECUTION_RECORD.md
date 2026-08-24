# Rights Lineage Diagnostic and Render Hardening Execution Record

**Class:** `EXECUTION_EVIDENCE`

**Policy:** `EVALUATION_RIGHTS_LINEAGE_DIAGNOSTIC_V1`

**Production state:** `ACTIVE__HISTORICAL_RIGHTS_FAIL_CLOSED`

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

The verified build and full regression pass 171/171. Sites v434 activated migration `0068`; Sites v435 exposed only sanitized aggregate counts. Direct authenticated production read-back reports exactly 17 diagnostics: 16 composite tasks, one authorship task, 17 `SOURCE_LINEAGE_BINDING_MISSING` and zero declared-but-unverified bindings. Every authority flag is false, provider request/spend are 0/$0 and recent error-only Worker logs contain zero events.

## Production acceptance

```text
SITES_VERSION = 435
SOURCE_COMMIT = a3b315383aa7da4cddd994e9fe019bff8384b741
MIGRATION = 0068_ACTIVE
DIAGNOSTICS = 17
COMPOSITE_TASKS = 16
AUTHORSHIP_TASKS = 1
SOURCE_LINEAGE_BINDING_MISSING = 17
SOURCE_LINEAGE_DECLARED_UNVERIFIED = 0
RIGHTS_PASS_AUTHORITY = FALSE
DATASET_SEALING_AUTHORITY = FALSE
ASSURANCE_QUALIFICATION_AUTHORITY = FALSE
RELEASE_AUTHORITY = FALSE
PROVIDER_REQUESTS = 0
SPEND_USD = 0
FULL_REGRESSION = 171_OF_171_PASS
RECENT_WORKER_ERRORS = 0
```

## Next protected action

Keep all 17 historical composite/authorship artifacts fail-closed. Collect authoritative historical ElevenLabs terms/plan evidence for the separate 46-audio lane and design new controlled clean/defect fixtures; do not promote historical rights from package correlation.
