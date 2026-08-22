# ElevenLabs History and Exact-Audio Recovery

**Class:** `EXECUTION_EVIDENCE`

**Policies:** `EVALUATION_PROVIDER_HISTORY_RECOVERY_V1` · `EVALUATION_PROVIDER_AUDIO_HASH_RECOVERY_V1`

**Production state:** `EXACT_AUDIO_COMPLETE__NO_MATCH__HISTORICAL_RECOVERY_EXHAUSTED__RIGHTS_FAIL_CLOSED`

## Production metadata outcome

The owner-authenticated production run on Sites v442 read the bounded ElevenLabs TTS history window and the current subscription once. It sealed 66 history items, all 66 with provider-native request IDs, and diagnosed the fixed set of 46 historical audio candidates.

Metadata alone does not identify the correct response: all 46 candidates have more than one time/voice/model/text-compatible history item. There are zero unique metadata matches and zero missing metadata matches. This is useful evidence that native history exists, but it is not a candidate-to-response binding.

```text
HISTORY_ITEMS = 66
HISTORY_ITEMS_WITH_NATIVE_REQUEST_ID = 66
CANDIDATES_DIAGNOSED = 46
UNIQUE_METADATA_MATCHES = 0
NO_METADATA_MATCHES = 0
AMBIGUOUS_METADATA_MATCHES = 46
CURRENT_SUBSCRIPTION = PAYG_ACTIVE
CURRENT_SUBSCRIPTION_ONLY = TRUE
HISTORICAL_PLAN_COVERAGE_VERIFIED = FALSE
PROVIDER_REQUESTS = 2
SPEND_USD = 0
RIGHTS_DATASET_ASSURANCE_RELEASE_AUTHORITY = 0_0_0_0
```

## Exact-audio recovery contract

Migration `0071_evaluation_provider_audio_hash_recovery.sql` and `EVALUATION_PROVIDER_AUDIO_HASH_RECOVERY_V1` convert each existing history item into exact-byte evidence without generating new media:

- download only the already-existing `/v1/history/{history_item_id}/audio` response;
- process no more than 16 history items per batch;
- allow no more than two immutable attempts per history item;
- compute SHA-256 directly from the response bytes;
- compare that hash to the immutable candidate/R2 artifact hash;
- preserve unique matches, equivalent-byte multi-request sets and missing matches as separate states;
- cap the whole lane at 132 provider reads, zero TTS and zero spend;
- never mutate candidate rights, dataset, assurance or release eligibility.

The owner UI orchestrates up to ten bounded batches from one explicit action. Every provider read and diagnostic is append-only and idempotent.

## Evidence boundary

An exact audio-byte match can recover a provider-native response binding. It still cannot prove that the account held a commercially eligible paid plan at the historical generation time. The current `payg · active` observation is current-only and cannot be applied retroactively.

No historical candidate receives rights PASS until both conditions exist:

1. exact provider-response-to-candidate-byte binding; and
2. authoritative terms and paid-plan/billing evidence covering the generation timestamp.

If historical plan coverage cannot be established, the candidate remains rights-pending and may be used only as quarantined failure evidence. New controlled fixtures must use the hardened write path.

## Production exact-audio outcome

The owner-authenticated terminal snapshot verified all 66 retained history audio objects. None matches the immutable SHA-256 of any of the 46 historical candidates.

```text
HISTORY_ITEMS_HASH_VERIFIED = 66_OF_66
UNIQUE_EXACT_HASH_MATCHES = 0
EQUIVALENT_BYTES_MULTIPLE_REQUESTS = 0
NO_EXACT_HASH_MATCHES = 46_OF_46
RETRYABLE_EXHAUSTED = 0_0
PROVIDER_READS = 66
TTS_REQUESTS = 0
SPEND_USD = 0
```

The bounded recovery lane is therefore exhausted. The historical candidates cannot enter the rights or gold-set path and remain quarantined failure evidence.

## Next protected action

Apply migration `0072`, seal the terminal no-match closure and activate the thirteen-blueprint controlled-fixture design. Then materialize new clean parents and isolated defect fixtures through the hardened provenance path. FP4/FP5 and Golden release remain closed.
