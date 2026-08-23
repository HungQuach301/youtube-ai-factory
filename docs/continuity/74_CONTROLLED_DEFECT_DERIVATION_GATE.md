# Controlled defect derivation gate

**Policy:** `CONTROLLED_DEFECT_DERIVATION_V1`

**Scope:** one deterministic `RIGHTS_LINEAGE_MISSING` P0 fixture derived from the exact eligible clean-audio control. The separate V2 project is excluded and untouched.

## Purpose

The first defect-positive fixture must prove that a mutation is isolated before it can count as controlled ground truth. Migration `0080_controlled_defect_derivation.sql` opens one task only after the `ELIGIBLE_CLEAN_CONTROL_REFERENCE` receipt exists. The task binds blueprint `cfp-v1-02`, the clean-control receipt, exact commercial audio artifact, Rights PASS receipt and source SHA-256.

The action creates two canonical JSON manifests:

- a clean control manifest containing the required `rightsReceiptId`;
- a mutated manifest whose payload is identical except that `rightsReceiptId` is absent.

Both manifests are hashed, stored in R2 and read back. The clean parent audio is also read back and re-hashed before materialization. The deterministic oracle passes only when the removed key is exactly `rightsReceiptId`, the remaining payload hashes identically and the two manifest hashes are distinct.

## Authority-appropriate ground truth

Rights lineage is a system-owned property, not a perceptual observation. Its correct ground-truth authority is therefore `DETERMINISTIC_SYSTEM_ORACLE`, while semantic, visual and audio-observable fixtures continue to require owner confirmation or the blueprint's hybrid oracle. This does not weaken the corpus gate: the receipt is usable only for the named P0 family and cannot stand in for another family or for owner-observable truth.

## Result and protected scope

One successful derivation may create one `CONTROLLED_DEFECT_PRESENT` receipt with:

```text
BLUEPRINT = CFP_V1_02__RIGHTS_LINEAGE_MISSING_POSITIVE
EXPECTED_DEFECT = RIGHTS_LINEAGE_MISSING
SEVERITY = P0
ORACLE = DETERMINISTIC__PASS_REQUIRED
MUTATION = REMOVE_RIGHTS_RECEIPT_REFERENCE_ONLY
PARENT_R2_READBACK = REQUIRED
MANIFEST_R2_READBACK = REQUIRED
CONTROLLED_INJECTION_ELIGIBLE = TRUE
P0_FAMILY_COVERAGE_ELIGIBLE = TRUE
PROVIDER_REQUESTS = 0
SPEND_USD = 0
DATASET_ELIGIBLE = FALSE
ASSURANCE_QUALIFICATION_AUTHORITY = FALSE
RELEASE_ELIGIBLE = FALSE
RELEASE_AUTHORITY = FALSE
READINESS_AFTER_SUCCESS = INSUFFICIENT_GROUND_TRUTH
PRODUCTION_STATE = SOURCE_READY__DEPLOYMENT_PENDING
```

The projected corpus becomes 37 candidates, three owner-confirmed references, one clean-negative control, one controlled injection and 1/5 P0 family coverage. Readiness remains `INSUFFICIENT_GROUND_TRUTH` because the reference minimum is not met and four P0 families remain uncovered.

## Operator behavior

A dedicated secret is accepted only for `DERIVE_RIGHTS_LINEAGE_MISSING_CONTROL`. It cannot authenticate clean-control eligibility, owner labels, provider dispatch, dataset sealing, assurance, publishing, deletion or access changes. The action is idempotent and uses zero provider requests and zero spend.

## Next protected action

After production acceptance, design the next isolated fixture from a clean parent using the oracle required by its blueprint. Do not mass-materialize all blueprints, seal a dataset, qualify assurance, open Golden r10 or Stage 11, release media, process Videos 2–15 or enable auto-publish.
