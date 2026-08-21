# Evaluation Foundation

**Class:** `NORMATIVE`

**Version:** `EVALUATION_FOUNDATION_V1`

**State:** `CANDIDATE_INVENTORY_ACTIVE__VERIFICATION_REQUIRED`

## Purpose

The Evaluation Foundation turns preserved production failures into trustworthy calibration, qualification and regression evidence. It does not assume that a rejected artifact is correctly labelled, independent, byte-accessible or useful as ground truth. Historical counts describe an inventory only.

The foundation exists before assurance qualification because a critic cannot be qualified by repeatedly scoring the same unverified material it is intended to judge.

## Evidence authority

An evaluation candidate becomes `GOLD_ELIGIBLE` only when all of these facts are independently stored:

1. exact bytes are read back from the authoritative object store;
2. the checksum is recomputed and matches the declared hash;
3. provenance and parent lineage are verified;
4. commercial rights are verified for the evaluation use;
5. an owner decision is bound to the exact bytes;
6. defect-present or defect-absent labels have evidence and an accountable actor;
7. the correlation group is known;
8. duplicate and correlated revisions are excluded from independent sample counts.

Package-level rejection may inform discovery. It cannot substitute for an artifact-level owner verdict or defect label. A package with no verified master binding is not represented as a master fixture.

Evaluation fixtures are permanently release-ineligible. They can qualify a measurement capability, but they can never become production candidates, masters or publishing evidence.

## Persistent model

Migration `0052_evaluation_foundation.sql` adds:

- a six-component Evaluation Foundation registry;
- a source registry for historical evidence families;
- candidate inventory with byte, checksum, provenance, rights, verdict, label, correlation and de-duplication state;
- an eleven-family initial defect taxonomy;
- evidence-bound defect labels;
- blinded calibration, qualification and regression datasets;
- dataset items with independent-count eligibility;
- assurance qualification runs and per-defect results;
- an immutable inventory snapshot.

Migration `0053_evaluation_corpus_verification.sql` adds bounded, idempotent verification runs and durable per-candidate receipts. `CORPUS_VERIFICATION_POLICY_V1` limits each runtime batch to 20 candidates and 100,000,000 bytes per object, binds recomputed bytes to source-artifact and R2 metadata, and database-constrains the verification plane to zero provider requests and zero spend.

D1 stores evidence state, relationships, decisions and metrics. R2 remains authoritative for media bytes. Migration backfill copies declared metadata but deliberately leaves byte, checksum, provenance, rights and labels unverified.

## Defect taxonomy

The initial taxonomy covers five P0 and six P1 families:

- P0: financial safety-scope escape, missing rights lineage, semantic visual contradiction, invalid master lineage and material A/V sync failure;
- P1: production residue, near-static motion, audio seams, mobile legibility, transaction-state conflation and packaging promise mismatch.

The taxonomy is a calibration starting point. Recall floors, precision floors, archetype-specific timing thresholds and perceptual boundaries remain `CALIBRATION_REQUIRED`; they are not copied from an expert proposal into production policy without fixture evidence.

## Dataset rules

- Calibration, qualification and regression are separate sealed datasets.
- Critic input is blinded to production verdict, provider, revision history and expected label.
- Duplicate hashes and correlated revisions do not increase sample size.
- Positive, negative and controlled-injection fixtures are all required.
- Controlled injections preserve a clean-parent hash and an injection manifest.
- Suggested injections include a 200 ms sync offset, audio seam, narration/visual contradiction, long near-static passage and missing rights lineage; exact values must be calibrated per archetype.
- Borderline repeat sampling is allowed only through a versioned sampling policy with measured variance.

## Assurance qualification

An assurance capability remains blocked until:

- its dataset is sealed and blinded;
- the independent sample minimum is met after de-duplication and correlation control;
- every P0 family has an approved recall floor and meets it;
- P0 escape count is zero;
- precision and repeatability are measured;
- capability version and settings hash are pinned;
- actual request and spend stay inside the approved qualification envelope.

No overall average can compensate for a failed P0 family. Missing floors or measurements produce `CALIBRATION_REQUIRED`, not PASS.

## Current phase

The first phase inventories production-history artifacts as `CANDIDATE_EVIDENCE`. The reported production corpus is expected to contain 595 artifact records associated with 15 rejected packages, but production migration and direct read-back must establish the exact live counts. At source checkpoint, verified fixtures, gold-eligible fixtures, sealed datasets, provider requests and spend are all zero.

## Next phase

Deploy migration `0053` and execute bounded read-only corpus verification. Byte/checksum/provenance PASS does not imply rights PASS: provider-bound material without a receipt remains `RECEIPT_REQUIRED`. After the sweep, collect missing rights evidence and owner labels, then de-duplicate and partition independent fixtures before creating any dataset or calling an assurance provider.
