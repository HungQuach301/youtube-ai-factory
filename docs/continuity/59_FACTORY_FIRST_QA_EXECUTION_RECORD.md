# Factory-first QA Execution Record

**Class:** `EXECUTION_EVIDENCE`

**Policy:** `FACTORY_FIRST_QA_POLICY_V1`

**Source state:** `IMPLEMENTED__PRODUCTION_ACCEPTANCE_PENDING`

## Outcome

The Evaluation Foundation no longer requires the owner to label every independent representative sequentially. Two exact-byte owner receipts are calibration anchors. Only after an independent reviewer finds every owner-present defect on both anchors may the bounded Factory batch lane process the remaining representatives.

## Authority boundary

- Factory receipts use `INDEPENDENT_REVIEW`; they never create `OWNER_CONFIRMED` evidence.
- Factory QA does not mutate the two existing owner receipts, candidate release eligibility, dataset membership, gold eligibility or assurance qualification.
- Image review reads exact R2 bytes, recomputes SHA-256 and uses structured vision output against the full observable taxonomy.
- Audio and temporal media remain `BROWSER_REQUIRED`; this state requests no immediate owner action and cannot be interpreted as PASS.
- Owner attention is reserved for P0 findings, uncertainty, explicit exceptions and later audit samples.

## Bounded execution envelope

```text
CALIBRATION_ANCHORS = 2
MAXIMUM_BATCH = 5
PROVIDER_REQUEST_CEILING = 82
SPEND_CEILING_USD = 6.75
MAXIMUM_IMAGE_REQUEST_RESERVATION_USD = 0.08
DEFAULT_MODEL = gpt-5.6
IMAGE_DETAIL = high
```

Migration `0061_factory_first_qa.sql` creates append-only tasks and receipts, bounded run evidence and the channel policy registry. The scoped executor token can run only this route and remains constrained by the registry ceilings, calibration gate, exact-byte checks and idempotency.

## Source verification

- Evaluation Foundation target tests: 20/20 PASS.
- Full regression: 166/166 PASS.
- Verified build: PASS, including async-boundary, commercial contract, sequential runtime and bounded vinext build checks.
- Agent-preview Browser QA: PASS for Vietnamese hierarchy, status-card readability, authority-boundary interaction and zero page console errors. The fixture is explicitly non-production and creates no receipt.
- Repository-wide lint remains red on pre-existing unrelated files; no new Factory-first QA lint finding was emitted.
- Production calibration, batch counts, measured usage, Browser-lane counts and post-deploy errors must be appended only after direct runtime read-back.

## Next protected action

Checkpoint and deploy this source, confirm migration `0061`, run exactly the two calibration anchors, then open bounded batches only if calibration is `CALIBRATION_PASS`. Do not ask the owner to continue the sequential queue while Factory processing is active.
