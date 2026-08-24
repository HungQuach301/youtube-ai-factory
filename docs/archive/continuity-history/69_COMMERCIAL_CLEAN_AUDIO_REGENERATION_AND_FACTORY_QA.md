# Commercial clean-audio regeneration and Factory QA

**Policies:** `COMMERCIAL_CLEAN_AUDIO_REGENERATION_V1`, `FACTORY_AUDIO_QA_POLICY_V1`

**Scope:** the original YouTube AI Factory only. This work does not modify or authorize the separate V2 project.

## Why a replacement lane is required

The first clean-audio control is immutable and was generated while the subscription snapshot exposed only `payg · active`. `ELEVENLABS_COMMERCIAL_ENTITLEMENT_V1` correctly leaves that artifact rights-pending because PAYG alone does not prove a paid base plan. The former materializer also has a one-fixture lifetime ceiling, so it cannot be replayed after the owner activates a paid subscription.

Migration `0075_commercial_clean_audio_regeneration.sql` adds an append-only replacement lane rather than rewriting the original artifact or weakening its rights state.

## Bounded regeneration contract

`COMMERCIAL_CLEAN_AUDIO_REGENERATION_V1` permits exactly one replacement attempt. It has these hard limits:

- at most one ElevenLabs subscription read;
- at most one ElevenLabs text-to-speech request;
- at most 700 narration characters;
- USD 0.08 reserved-spend ceiling;
- the existing pinned voice, `eleven_multilingual_v2`, output format and settings;
- the shared explicit paid-tier evaluator: active Starter, Creator, Pro, Scale, Business or Enterprise only;
- a previously verified official `TERMS_OF_USE` snapshot with exact R2 read-back;
- the exact generation-time subscription response stored privately, SHA-256 sealed and read back from R2;
- a provider-native TTS request ID, exact audio-byte SHA-256 and R2 read-back.

Only a fully verified chain may append a rights receipt with `PASS` for the replacement artifact. The first artifact and every prior receipt remain unchanged. No dataset, assurance, owner-ground-truth or release authority is created.

## Factory-first perceptual audio QA

`FACTORY_AUDIO_QA_POLICY_V1` accepts only the exact replacement MP3 after commercial-rights PASS and R2 verification. It permits one `gpt-audio-1.5` review request under a USD 0.20 reserved ceiling and appends an `INDEPENDENT_REVIEW_ONLY` receipt covering:

- voice naturalness;
- pronunciation;
- pacing and prosody;
- audio continuity;
- noise and artifacts;
- listener fatigue;
- semantic delivery.

`LIKELY_CLEAN` requires an overall score of at least 92, every dimension at least 90, and zero P0/P1 defects. Anything else is `LIKELY_DEFECT_PRESENT` and routes an exception to the owner. The Factory cannot impersonate owner ground truth, add a gold-set member, qualify a capability or release media.

## Source verification checkpoint

```text
MIGRATION = 0075_COMMERCIAL_CLEAN_AUDIO_REGENERATION
REPLACEMENT_ATTEMPTS_MAX = 1
SUBSCRIPTION_READS_MAX = 1
TTS_REQUESTS_MAX = 1
TTS_CHARACTERS_MAX = 700
REGEN_RESERVED_SPEND_USD = 0.08
FACTORY_AUDIO_QA_REQUESTS_MAX = 1
FACTORY_AUDIO_QA_RESERVED_SPEND_USD = 0.20
TARGETED_REGRESSION = 50_OF_50_PASS
FULL_REGRESSION = 180_OF_180_PASS__VERIFIED_BUILD_PASS
PROVIDER_REQUESTS_THIS_SOURCE_SLICE = 0
SPEND_USD_THIS_SOURCE_SLICE = 0
RIGHTS_DATASET_ASSURANCE_RELEASE_AUTHORITY = 0_0_0_0
PRODUCTION_STATE = PRODUCTION_ACTIVE_SITES_V453
PRODUCTION_SOURCE_COMMIT = 6a024081acc54e70815ecd1d4dccdb85860f6935
```

## Next protected action

Sites v453 deploys the bounded lane from exact source `6a024081acc54e70815ecd1d4dccdb85860f6935`. Verify the paid plan through the authenticated production action and create at most one replacement. Run Factory audio QA only if the replacement receives a fully bound commercial-rights PASS. Owner clean ground truth remains a separate later gate. Golden r10, Stage 11, Videos 2–15 and auto-publish remain blocked.
