# Historical Recovery Closure and Controlled Fixture Plan

**Class:** `EXECUTION_EVIDENCE`

**Policies:** `EVALUATION_HISTORICAL_RECOVERY_CLOSURE_V1` · `CONTROLLED_FIXTURE_PLAN_V1`

**Source state:** `MIGRATION_0072_SOURCE_READY__PRODUCTION_ACCEPTANCE_PENDING`

## Exact-audio result

The owner-authenticated production UI reports a terminal exact-audio snapshot:

```text
HISTORY_ITEMS_HASH_VERIFIED = 66_OF_66
RETRYABLE = 0
EXHAUSTED = 0
UNIQUE_EXACT_HASH_MATCHES = 0
EQUIVALENT_BYTES_MULTIPLE_REQUESTS = 0
NO_EXACT_HASH_MATCHES = 46_OF_46
PROVIDER_READS = 66
TTS_REQUESTS = 0
SPEND_USD = 0
```

This exhausts the bounded technical recovery lane. None of the 46 historical candidate byte hashes exists in the retained 66-item ElevenLabs history window. Timestamp, voice, model and text proximity are forbidden substitutes for exact bytes.

Migration `0072_historical_recovery_closure_and_controlled_fixture_plan.sql` converts a matching terminal production snapshot into an immutable closure receipt. It does not mutate any candidate. The 46 rows remain quarantined failure evidence with zero rights, dataset, assurance or release authority.

## Controlled fixture design

`CONTROLLED_FIXTURE_PLAN_V1` seals thirteen independent blueprints:

- eleven single-defect positives, one for every active defect family;
- all five P0 families explicitly covered;
- two clean negatives: clean audio and clean audio-visual master;
- deterministic, owner-confirmed or hybrid oracles selected per defect;
- no materialized fixture, provider request, spend or qualification authority in this source slice.

The design stays within the approved 10–15 reference range. It does not relabel rejected outputs as ground truth.

## Required materialization evidence

Every new provider-derived base must preserve:

1. provider-native request ID;
2. exact provider response SHA-256;
3. R2 byte read-back;
4. commercial-rights receipt effective at generation time;
5. clean-parent and deterministic transform hashes;
6. owner-confirmed ground truth for perceptual or semantic labels.

All fixtures are evaluation-only and permanently release-ineligible. A planned blueprint does not count as a controlled injection and cannot make the WP7 corpus ready.

## Next protected action

Apply migration `0072`, read back the immutable closure and thirteen-blueprint registry, then implement bounded fixture materialization. Materialization must create the clean parents first, derive one isolated defect per positive, and keep FP4/FP5, Golden r10, Stage 11 and publication closed until the resulting dataset and assurance capability pass their own gates.
