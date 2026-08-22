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

Migration `0054_evaluation_evidence_disposition.sql` separates byte divergence from metadata-only conflict. A source hash or byte-size mismatch against recomputed R2 bytes creates an immutable P0 incident and an immutable `QUARANTINE_EVALUATION_ONLY` disposition; the candidate projection becomes `EXCLUDED` while all source objects and prior receipts remain intact. A checksum-PASS artifact-ID metadata conflict creates an immutable P1 incident and remains `BLOCKED` until a new binding receipt proves the relationship. Neither lane can promote a fixture or create release eligibility.

Migration `0055_evaluation_metadata_binding_reconciliation.sql` resolves only the metadata-only lane. Its append-only receipt requires exact candidate/source/computed bytes, exact byte size, exact R2 package/hash/engine metadata, zero legacy sources, a present stale artifact ID and a storage-key/hash pair unique to the source D1 row. An accepted rebind changes provenance to PASS and verification to `PARTIAL_RIGHTS_PENDING`; it cannot change rights, labels, fixture state, qualification or release eligibility.

Migration `0056_evaluation_rights_reconciliation.sql` is a separate rights decision. It may pass only a metadata-rebound, non-audio/non-video candidate with an accepted declaration, no provider, an explicit channel author/actor/executor and zero legacy sources. Provider terms are never inferred. Its append-only receipt changes rights verification and technical evidence state only; candidate lifecycle, labels, qualification and release remain unchanged. The rights queue projection exposes only allowlisted basis and modality counts.

Rights provider-family diagnostics normalize source provenance to a closed public/operator taxonomy and collapse all other values. Raw provider strings, terms data, source IDs and hashes remain server-side. A distribution/master with no direct provider declaration is not automatically channel-authored; it requires a composite parent-lineage rights manifest.

Migration `0057_evaluation_rights_evidence_collection.sql` turns the classified queue into immutable evidence tasks without creating rights authority. Provider proof is split into a terms/paid-plan receipt and an exact candidate-request-response-artifact binding. Composite masters require exact parent IDs, hashes and one PASS rights receipt per parent. Authorship proof binds the exact artifact and requires a source manifest for rendered composites. Present-day terms, package-level requests and generic declarations are never sufficient historical evidence.

Migration `0068_evaluation_rights_lineage_diagnostics.sql` records the historical render-lineage gap instead of inferring across package membership. A same-package manifest is discoverable context, not proof that its bytes were the inputs to a particular rendered artifact. The immutable diagnostic therefore grants zero rights, dataset, assurance or release authority. For all new Production V2 render uploads, the runtime requires the exact source-manifest ID and SHA-256, reads back that manifest, verifies every declared parent ID/hash against D1 and stores the verified source-manifest and parent set in the rendered artifact provenance. Missing or mismatched lineage rejects the upload before storage.

Blocked-evidence diagnostics aggregate only the latest immutable receipt bound to each blocked candidate. The public/operator projection may expose allowlisted reason codes, state combinations, candidate-kind counts and field-level mismatch counts derived server-side from candidate/source declarations, recomputed object bytes and parsed R2 metadata. It must not expose source IDs, storage keys, hashes, byte values, raw object metadata or arbitrary receipt text. Missing declarations are not mismatches. Diagnostics create no authority to repair, relabel, exclude, promote or release a candidate.

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

Production byte reconciliation is complete under `CORPUS_VERIFICATION_POLICY_V1`. Thirty bounded runs read 595 objects and 851,549,647 bytes. The exact states are 595 byte-verified, 588 checksum PASS, 583 provenance PASS, 520 rights PASS, 63 rights-pending and 12 blocked. These remain candidate-evidence states: verified fixtures, gold eligibility, sealed datasets and release eligibility are all zero. The verification plane used zero provider request and zero spend.

## Next phase

Sites v404 classified the 63 provider-terms-pending candidates as 46 ElevenLabs audio and 17 no-provider records: 16 masters and one clip. Sites v405 activated migration `0057` and created the exact 46/16/1 immutable task ledger without changing rights. Collect historical terms and paid-plan evidence covering each generation time, bind exact provider requests to exact audio hashes, construct composite rights manifests from verified parent lineage and establish the clip's source/authorship basis. Bind owner-confirmed defect labels only after rights evidence is durable. No dataset may be sealed and no assurance provider may be called until those gates pass.

### Owner-label contract

`EVALUATION_OWNER_LABEL_POLICY_V1` admits only current `EVIDENCE_VERIFIED`, rights-PASS, release-ineligible candidate evidence. A task binds the exact artifact hash and complete active taxonomy. SIWC owner authentication is required both to stream the R2 bytes and to append a decision. `REJECTED_DEFECT_PRESENT` requires a positive label; `CLEAN_NEGATIVE_CONTROL` forbids positive labels; `EXCLUDE_UNUSABLE` preserves evidence but removes it from later counts. Label receipts do not imply independent correlation, dataset membership, gold eligibility or assurance qualification.

### Correlation and owner-attention contract

`EVALUATION_CORRELATION_CONTROL_V1` never deletes a task. It first collapses exact SHA-256 copies, then groups the surviving unique hashes by shot/artifact family or package/kind/artifact family. One deterministic representative receives primary attention and independent-count eligibility. Other bytes remain append-only as deferred exact duplicates or correlated variants. Deferred items may be reopened only through a later typed coverage-gap policy; they cannot silently enter counts or bypass the primary queue.

### Factory-first QA contract

`FACTORY_FIRST_QA_POLICY_V1` uses the two existing exact-byte owner receipts as calibration anchors, not as permission to imitate the owner. The independent lane must rediscover every owner-present defect on both anchors before any batch can run. It reads the exact R2 object, recomputes SHA-256, evaluates every media-observable taxonomy item and stores a separate append-only Factory receipt plus `INDEPENDENT_REVIEW` labels.

Image review is structured vision evidence. Audio and temporal artifacts require full Browser playback and remain `BROWSER_REQUIRED` until that lane produces evidence. A still SHOT is judged as an intermediate visual: missing voice is not itself an image defect, while a visibly static slide/template or audience-visible production residue may be. Factory output cannot set owner-confirmed state, promote a fixture, seal a dataset, qualify assurance or create release eligibility. Owner attention is exception- and audit-sample-based after calibration.

### WP7 regression-corpus contract

`WP7_REGRESSION_CORPUS_POLICY_V1` converts durable QA failures into an immutable candidate ledger while preserving evidence authority. Factory findings remain `INDEPENDENT_REVIEW_ONLY`; only exact-byte owner receipts may create `OWNER_CONFIRMED_REFERENCE` items. Neither class enters a dataset automatically.

The first readiness boundary requires 10–15 bounded owner-confirmed references, at least one clean negative control, at least one controlled-injection fixture and complete owner-confirmed coverage of every active P0 defect family. Meeting that boundary permits dataset design only. Blinding, split lineage, sealing and assurance qualification remain separate gates. Missing evidence produces `INSUFFICIENT_GROUND_TRUTH`; no average score or Factory candidate count may compensate.
