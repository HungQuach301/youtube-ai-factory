# Commercial clean-audio pre-TTS recovery

**Policy:** `COMMERCIAL_CLEAN_AUDIO_RECOVERY_V1`

**Scope:** one production failure in the original YouTube AI Factory. The separate V2 project is excluded and untouched.

## Production incident

On 2026-08-23 the owner invoked `REGENERATE_COMMERCIAL_CLEAN_AUDIO_CONTROL` from Sites v454. The Worker returned HTTP 500 with request/ray ID `a2f6e76fb9a9a8b5` after 5.272 seconds. The UI correctly retained the old fixture as rights-pending and did not open Factory Audio QA.

The root cause is an internal contract mismatch:

- `ELEVENLABS_COMMERCIAL_ENTITLEMENT_V1` emits `PAID_SUBSCRIPTION_CONFIRMED` for an eligible paid plan;
- migration `0075` requires the normalized evidence value `EXPLICIT_ACTIVE_PAID_BASE_PLAN` in `v7_evaluation_commercial_subscription_receipts`;
- the runtime attempted to insert the classifier value directly, so D1 rejected the receipt before the TTS fetch.

The failed run and its production log remain evidence. No replacement artifact, rights receipt or Factory QA receipt was created. Because the rejected insert precedes the TTS call, the incident sent zero TTS requests and incurred zero TTS spend.

## Systemic correction

The runtime now keeps the raw classifier state in the evidence hash while writing the schema's canonical entitlement value only after the shared evaluator returns eligible. This makes the classifier/output boundary explicit instead of weakening the database constraint.

Migration `0076_commercial_clean_audio_recovery.sql` adds an immutable recovery policy, authorization and consumption binding. It authorizes a recovery only when production contains the exact signature:

- prior run state `FAILED`;
- error `UNEXPECTED_COMMERCIAL_CLEAN_AUDIO_FAILURE`;
- exactly one subscription read;
- zero TTS requests;
- no replacement artifact.

The authorization permits one additional subscription read and at most the original single TTS request under the unchanged USD 0.08 ceiling. The recovery binding is appended before external work and cannot be updated or deleted. Any different failure signature remains fail-closed.

## Verification

```text
MIGRATION = 0076_COMMERCIAL_CLEAN_AUDIO_RECOVERY
ROOT_CAUSE = ENTITLEMENT_STATE_CONTRACT_MISMATCH
FAILED_HTTP_STATUS = 500
FAILED_REQUEST_ID = a2f6e76fb9a9a8b5
FAILED_TTS_REQUESTS = 0
FAILED_TTS_SPEND_USD = 0
RECOVERY_AUTHORIZATIONS_MAX = 1
ADDITIONAL_SUBSCRIPTION_READS_MAX = 1
TTS_REQUESTS_MAX = 1
RESERVED_SPEND_CEILING_USD = 0.08
TARGETED_REGRESSION = 51_OF_51_PASS
FULL_REGRESSION = 181_OF_181_PASS__VERIFIED_BUILD_PASS
PRODUCTION_STATE = SOURCE_READY__DEPLOYMENT_PENDING
```

## Next protected action

Deploy migration `0076`. Its conditional insert must prove the exact failed-run signature before the UI exposes **Chạy recovery và tạo replacement**. After recovery, run Factory Audio QA only if exact subscription/audio R2 evidence and rights all PASS. Owner ground truth, dataset, assurance and release remain separate and locked.
