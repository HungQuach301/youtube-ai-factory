# Clean-audio control eligibility gate

**Policy:** `CLEAN_AUDIO_CONTROL_ELIGIBILITY_V1`

**Scope:** one deterministic eligibility decision for the exact 35-second commercial replacement already proven Rights PASS, independently reviewed `LIKELY_CLEAN` and owner-confirmed `CLEAN_CONFIRMED`. The separate V2 project is excluded and untouched.

## Purpose

Owner ground truth is necessary but does not by itself create a regression reference. Migration `0079_clean_audio_control_eligibility.sql` adds a separate, append-only gate that binds the sealed `CLEAN_AUDIO_NEGATIVE` blueprint to the complete evidence chain and re-reads the current R2 bytes before recognizing one clean-negative reference.

The gate requires:

- blueprint `cfp-v1-12` with role `CLEAN_NEGATIVE` and candidate kind `AUDIO`;
- exact provider-native request identity, response SHA-256 and R2 read-back;
- commercial Rights `PASS`;
- independent Factory QA `LIKELY_CLEAN` with P0=0 and P1=0;
- owner `CLEAN_CONFIRMED`, full-listen attestation and zero observed defects;
- current R2 byte size and SHA-256 equal to every sealed evidence binding.

## Result and authority boundary

One successful evaluation writes one immutable `ELIGIBLE_CLEAN_CONTROL_REFERENCE` receipt. Its eight owner-observable audio labels are all `ABSENT`; the receipt is independent-count and reference eligible under lineage `controlled-fixture:clean-audio:v1`.

The receipt updates the truthful readiness projection from two to three owner-confirmed references and from zero to one clean-negative control. Controlled injections remain zero and P0 coverage remains 0/5, so readiness stays `INSUFFICIENT_GROUND_TRUTH`.

```text
MIGRATION = 0079_CLEAN_AUDIO_CONTROL_ELIGIBILITY
POLICY = CLEAN_AUDIO_CONTROL_ELIGIBILITY_V1
MAXIMUM_ELIGIBILITY_RECEIPTS = 1
EXACT_BYTE_R2_READBACK_REQUIRED = TRUE
DECISION = ELIGIBLE_CLEAN_CONTROL_REFERENCE
REFERENCE_ELIGIBLE = TRUE
DATASET_ELIGIBLE = FALSE
DATASET_SEALING_AUTHORITY = FALSE
ASSURANCE_QUALIFICATION_AUTHORITY = FALSE
RELEASE_ELIGIBLE = FALSE
RELEASE_AUTHORITY = FALSE
PROVIDER_REQUESTS = 0
SPEND_USD = 0
READINESS = INSUFFICIENT_GROUND_TRUTH
TARGETED_REGRESSION = 36_OF_36_PASS
FULL_REGRESSION = 184_OF_184_PASS__VERIFIED_BUILD_PASS
PRODUCTION_STATE = COMPLETE_SITES_V461
```

## Operator behavior

Section 7 appears only after the owner clean receipt exists. The operator action sends no provider request. The server re-reads exact R2 audio, validates the complete immutable chain and writes the sole receipt idempotently. The read-back view shows the recognized clean-negative reference and the still-blocked readiness state.

The same deterministic command also supports a dedicated server-side secret whose scope is hard-bound to `EVALUATE_CLEAN_AUDIO_CONTROL_ELIGIBILITY`. It cannot authenticate any other evaluation action. The shared automation identity must still be present in the owner allowlist, and the endpoint retains every evidence and authority check. This allows the Factory operator to execute machine-verifiable gates without transferring routine button work to the owner.

## Production acceptance

Sites v461 deployed source `afc96961562619faa8e29a996c65bbd7c00d85cd` and recorded receipt `clean-audio-control-eligibility-receipt-5c1400f0-0c9f-42ae-a3d0-a7c2970388c5` with HTTP 201. Decision is `ELIGIBLE_CLEAN_CONTROL_REFERENCE`; R2 read-back is verified; checksum, provenance and rights are PASS; Factory QA is `LIKELY_CLEAN`; owner truth is `CLEAN_CONFIRMED`. The snapshot now contains 36 candidates, three owner-confirmed references and one clean-negative control. Controlled injections remain zero and P0 coverage remains 0/5, so readiness remains `INSUFFICIENT_GROUND_TRUTH`. The action made zero provider requests, spent USD 0 and recent Worker errors are zero.

## Next protected action

After production acceptance, design controlled defect derivatives from this clean parent under separate per-fixture mutation and oracle gates. Do not seal a dataset, qualify assurance, open Golden r10 or Stage 11, release media, process Videos 2–15 or enable auto-publish from this reference alone.
