# Clean-audio owner ground-truth gate

**Policy:** `CLEAN_AUDIO_OWNER_GROUND_TRUTH_V1`

**Scope:** one owner decision against the exact 35-second commercial replacement after Rights PASS and Factory Audio QA `LIKELY_CLEAN`. The separate V2 project is excluded and untouched.

## Purpose

The Factory receipt is independent review only. A 95/100 score with P0=0 and P1=0 cannot impersonate the owner or create a gold label. Migration `0078_clean_audio_owner_ground_truth.sql` therefore creates exactly one owner task only when production proves:

- the replacement artifact and commercial-rights receipt both PASS;
- the Factory recovery receipt binds the same exact SHA-256;
- Factory decision is `LIKELY_CLEAN` with P0=0 and P1=0;
- no owner receipt already exists.

## Owner evidence contract

The authenticated allowlisted owner must play the exact R2 audio from start to finish and choose one result:

- `CLEAN_CONFIRMED` with no observed defect; or
- `DEFECT_REJECTED` with at least one audio-observable defect and rationale.

The server reads the artifact from R2 again and rejects any byte-size or SHA-256 divergence. The append-only receipt binds task, artifact, Factory receipt, exact hash, decision, eight audio-observable defect keys, rationale, owner identity and idempotency request hash. One task and one receipt are the absolute ceiling.

```text
MIGRATION = 0078_CLEAN_AUDIO_OWNER_GROUND_TRUTH
POLICY = CLEAN_AUDIO_OWNER_GROUND_TRUTH_V1
MAXIMUM_OWNER_DECISIONS = 1
FULL_LISTEN_REQUIRED = TRUE
EXACT_BYTE_R2_READBACK_REQUIRED = TRUE
AUTHORITY_BOUNDARY = OWNER_GROUND_TRUTH_ONLY
PROVIDER_REQUESTS = 0
SPEND_USD = 0
DATASET_SEALING_AUTHORITY = FALSE
ASSURANCE_QUALIFICATION_AUTHORITY = FALSE
RELEASE_AUTHORITY = FALSE
TARGETED_REGRESSION = 53_OF_53_PASS
FULL_REGRESSION = 183_OF_183_PASS__VERIFIED_BUILD_PASS
PRODUCTION_STATE = ACCEPTED__SITES_V458
PRODUCTION_SOURCE_COMMIT = e8dd36f5a36a4527dc385ced9ad75baf19264ca0
OWNER_DECISION = CLEAN_CONFIRMED
FULL_LISTEN = ATTESTED
OWNER_REQUEST_ID = a2f797499ff47a53
POST_RUN_WORKER_ERRORS = 0
```

## UI behavior

Section 6 appears only after the clean Factory receipt exists. The owner confirmation checkbox stays disabled until the page observes continuous playback through the end. The server still requires an explicit full-listen attestation and exact-byte read-back; browser state alone is never authority. A successful form redirects to an immutable read-back view showing the owner decision and retained downstream locks.

## Production acceptance

Sites v458 deployed migration `0078`. The allowlisted owner listened through the exact 35-second replacement and submitted `CLEAN_CONFIRMED` with no observed defects, the required rationale and full-listen attestation. Request `a2f797499ff47a53` returned a successful 303 redirect after 1.323 seconds. The immutable read-back shows `CLEAN_CONFIRMED`, `ATTESTED` and `OWNER_GROUND_TRUTH_ONLY`; exact audio reads returned 200 and post-run Worker errors are zero.

## Next protected action

Design and implement a separate clean-control eligibility gate. Do not generate defect derivatives, seal a dataset, qualify audio capability, open Golden r10, Stage 11 or release from this owner receipt alone.
