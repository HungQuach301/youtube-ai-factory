# WP7 Regression Corpus Execution Record

**Class:** `EXECUTION_EVIDENCE`

**Policy:** `WP7_REGRESSION_CORPUS_POLICY_V1`

**Production state:** `ACTIVE__INSUFFICIENT_GROUND_TRUTH`

## Outcome

Migration `0067_wp7_regression_corpus.sql` converts the completed Factory-first QA evidence into an immutable regression-corpus ledger without converting independent model review into ground truth.

Production read-back after Sites v432 is:

- 33 non-anchor visual failures as `INDEPENDENT_REVIEW_ONLY` corpus candidates;
- two exact-byte owner anchors as `OWNER_CONFIRMED_REFERENCE` items;
- zero sealed dataset items, zero assurance qualification authority and zero release authority.

The migration derived these counts from durable receipts at deployment time. Direct authenticated read-back confirmed 35 total items, 33 independent-review candidates and two owner-confirmed references.

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

## Production acceptance

```text
SITES_VERSION = 432
SOURCE_COMMIT = 5cc7be4018f6399a705a682d840a293c5e3e24dd
CORPUS_ITEMS = 35
INDEPENDENT_REVIEW_ONLY = 33
OWNER_CONFIRMED_REFERENCES = 2
CLEAN_NEGATIVE_CONTROLS = 0
CONTROLLED_INJECTION_FIXTURES = 0
P0_FAMILIES_COVERED = 0_OF_5
READINESS = INSUFFICIENT_GROUND_TRUTH
DATASET_SEALING_AUTHORITY = FALSE
ASSURANCE_QUALIFICATION_AUTHORITY = FALSE
RELEASE_AUTHORITY = FALSE
PROVIDER_REQUESTS = 0
SPEND_USD = 0
RECENT_WORKER_ERRORS = 0
```

The pre-existing Factory ledger remains unchanged at 82 tasks, zero pending, 84 raw receipts, 37 likely-defect raw receipts, 47 structured-evidence adjudications, zero open Browser tasks, 37 provider requests and $0.4314096.

## Next protected action

Continue the 63-item rights-evidence lane and design the bounded owner-confirmed/controlled-fixture set. Do not run assurance qualification, open FP4/FP5, render Golden r10 or open Stage 11.
