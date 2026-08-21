# Wave 3 Corpus Verification — Source Execution Record

**Class:** `EXECUTION_EVIDENCE`

**Date:** 2026-08-21 (Asia/Bangkok)

**Policy:** `CORPUS_VERIFICATION_POLICY_V1`

**Production status:** pending additive migration and runtime acceptance

## Executed scope

- Added migration `0053` with bounded verification runs, per-candidate evidence receipts and candidate verification state.
- Added an owner/SIWC or scoped-automation route for `RUN_CORPUS_VERIFICATION_BATCH`.
- Limited each durable batch to 20 candidates and each in-worker object read to 100,000,000 bytes.
- Recomputed SHA-256 from exact R2 bytes and reconciled candidate declarations against the source artifact and R2 `artifactId`, `packageId`, `sha256` and `engineVersion` metadata.
- Added fail-closed provenance and rights classification. Provider-bound media without an explicit rights/terms receipt remains `RECEIPT_REQUIRED` even when bytes and checksum pass.
- Added an operator form that runs one owner-bound batch per submission without adding a client bundle or weakening the commercial performance budget.
- Added live projection fields for pending, byte, checksum, provenance, rights, blocked, run and byte-volume truth.

## Durable guarantees

- A candidate never becomes `VERIFIED_FIXTURE`, `GOLD_ELIGIBLE`, qualification-eligible or release-eligible from byte verification alone.
- Owner decisions and evidence-bound defect labels remain separate mandatory gates.
- Every run is idempotency-bound to an intent hash and stores its exact candidate list.
- Every receipt binds declared and computed hashes, declared and actual bytes, R2 metadata, reconciliation reasons and one canonical evidence hash.
- Verification-run and receipt tables database-constrain provider requests and spend to zero.
- External-provider rights are not inferred from a generic declaration; a receipt or terms-version binding is required.

## Verification truth

- Changed-scope ESLint: PASS.
- Targeted migration, policy, reconciliation, sequential control, integrity and learning-contract regressions: `27/27` PASS.
- Full repository regression: `151/151` PASS.
- Verified production build: PASS, including async boundaries, commercial contracts, sequential runtime and client performance budget (`309,913/310,000` gzip bytes).
- Migration replay through `0053`: PASS.
- `git diff --check`: PASS.

Repository-wide lint remains non-green because of pre-existing errors in legacy material/project routes outside this change; changed-scope lint is clean.

## Protected scope

This source change creates no provider request or spend, does not supply missing provider rights receipts, does not owner-label a defect, does not seal a dataset, does not qualify assurance, does not evaluate M0 Safety Scope, and does not unlock Golden r10, Stage 11, Videos 2–15, publication or auto-publish.

## Exact next action

Deploy the pushed source, apply migration `0053`, run the bounded production byte sweep, reconcile live counts and preserve every rights/label gap as an explicit blocker.
