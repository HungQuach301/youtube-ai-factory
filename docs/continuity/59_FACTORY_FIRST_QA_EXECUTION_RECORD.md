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
PROVIDER_REQUEST_CEILING = 84
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

## Production diagnostic — Sites v420

Production activated migration `0061` and read back exactly 82 tasks, two owner anchors, 82 pending, zero Factory receipts, zero Factory provider requests and zero Factory spend. The first idempotent calibration attempt stopped on an OpenAI `400` before a receipt was written. Batch remained locked. The route now records only the provider's bounded error code/message so the same run can be replayed without exposing credentials or creating a second calibration intent.

The bounded diagnostic proved the candidate bytes were not one of the raster formats accepted by OpenAI vision; it did not by itself establish the underlying format. Migration `0062` adds the hash, MIME and transform identity of the exact review input. The Factory now sniffs bytes rather than trusting a declared MIME type, passes JPEG/PNG/GIF/WebP unchanged and renders only a positively detected self-contained SVG to a 1920×1080 PNG. Active SVG content, remote resources, doctypes, entities and unknown formats fail closed. The original R2 hash remains the candidate authority; the derived PNG hash is separate review evidence.

Sites v422 replayed the same calibration intent after `0062`. Both anchors produced `LIKELY_DEFECT_PRESENT`, two immutable Factory receipts and measured spend of $0.03106, but anchor agreement was 0/2. The registry correctly became `CALIBRATION_FAILED`; 80 tasks remain pending and batch is locked. A sanitized diagnostic projection now exposes only owner-present, Factory-present, Factory-uncertain and missed owner-present defect keys so prompt/model calibration can be evidence-driven without exposing bytes, rationales or identities.

Production diagnostics show the same misses on both anchors: `MOBILE_LEGIBILITY` and `PRODUCTION_RESIDUE`; `NEAR_STATIC_MOTION` was correctly detected. `FACTORY_QA_CALIBRATION_V2` preserves both V1 receipts, adds a calibration version to runs/receipts/registry, defines mobile review at an approximately 360 CSS-pixel presentation width and treats the exact internal phrase as residue even when styled as footer copy. The cumulative request ceiling becomes 84 solely to retain two failed V1 calibration calls plus two V2 calls and the original 80 pending tasks; the $6.75 spend ceiling is unchanged.
