# WP7 Regression Corpus Execution Record

**Class:** `EXECUTION_EVIDENCE`

**Policy:** `WP7_REGRESSION_CORPUS_POLICY_V1`

**Source state:** `SOURCE_ACCEPTED__PRODUCTION_MIGRATION_PENDING`

## Outcome

Migration `0067_wp7_regression_corpus.sql` converts the completed Factory-first QA evidence into an immutable regression-corpus ledger without converting independent model review into ground truth.

The expected production backfill is:

- 33 non-anchor visual failures as `INDEPENDENT_REVIEW_ONLY` corpus candidates;
- two exact-byte owner anchors as `OWNER_CONFIRMED_REFERENCE` items;
- zero sealed dataset items, zero assurance qualification authority and zero release authority.

The migration derives the counts from durable receipts at deployment time. These values remain expected, not accepted production evidence, until direct post-deploy read-back confirms them.

## Ground-truth firewall

The corpus contract distinguishes three concepts that must not be collapsed:

1. A Factory finding is useful failure evidence.
2. An owner-confirmed reference is eligible to inform later gold-set design.
3. A sealed blinded dataset is a separate future artifact requiring all readiness gates.

The current readiness state is intentionally `INSUFFICIENT_GROUND_TRUTH`. Dataset design cannot become ready until the corpus has 10–15 bounded owner-confirmed references, at least one clean negative control, at least one controlled-injection fixture and complete owner-confirmed coverage of active P0 defect families. Readiness alone still does not seal a dataset or qualify assurance.

## Immutable lineage

Every corpus item binds:

- the exact candidate SHA-256;
- the independent correlation lineage and count eligibility;
- the source Factory task and immutable owner or Factory receipt;
- candidate kind, artifact type and MIME;
- evidence authority, expected decision and complete stored labels.

Item and readiness-snapshot updates/deletes are rejected by database triggers. The policy adds zero provider request and zero spend and cannot mutate candidate qualification or release state.

## Source verification

- Full verified build: PASS.
- Full regression: 170/170 PASS.
- All migrations replay through `0067` in SQLite.
- Source diff check: PASS.
- Provider requests/spend added by this slice: 0 / $0.

## Next protected action

Deploy the private checkpoint, confirm migration `0067` and read the sanitized Factory QA projection. Expected truth is 35 corpus items = 33 independent-review candidates + two owner-confirmed references, with zero clean negatives, zero controlled injections, incomplete P0 coverage and `INSUFFICIENT_GROUND_TRUTH`. If the counts differ, stop and diagnose rather than editing receipts or promoting evidence.

After production acceptance, continue the 63-item rights-evidence lane and design the bounded owner-confirmed/controlled-fixture set. Do not run assurance qualification, open FP4/FP5, render Golden r10 or open Stage 11.
