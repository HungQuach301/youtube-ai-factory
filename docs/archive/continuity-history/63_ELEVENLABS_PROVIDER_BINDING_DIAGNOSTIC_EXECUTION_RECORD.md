# ElevenLabs Provider-Binding Diagnostic and Future Audio Hardening

**Class:** `EXECUTION_EVIDENCE`

**Policy:** `EVALUATION_PROVIDER_BINDING_DIAGNOSTIC_V1`

**Production state:** `ACTIVE__HISTORICAL_RIGHTS_FAIL_CLOSED`

## Outcome

Migration `0069_evaluation_provider_binding_diagnostics.sql` diagnoses all 46 historical ElevenLabs audio-rights tasks without creating a rights receipt. Production read-back reports 46/46 unique matches between the stored artifact SHA-256 prefix and the historical `provider_response_id`. Source inspection proves that the old write path generated this 24-character value from the audio hash itself. It is therefore a legacy internal binding, not a provider-native request or response ID.

All 46 historical records remain `PARTIAL_RIGHTS_PENDING`. The diagnostic sets provider-native ID verification, historical terms/plan verification, rights authority, dataset authority, assurance authority and release authority to zero.

## Recurrence prevention

The Production V2 pilot and full-narration write paths now require the provider-native response header before accepting generated audio:

- ElevenLabs must return `request-id`;
- the internal provider-request row ID is stored in artifact provenance;
- the provider-native request ID is stored both in the provider ledger and artifact provenance;
- SHA-256 is computed directly from the provider response bytes and stored as the response-to-artifact binding;
- R2 read-back must reproduce that exact SHA-256 before the provider request is completed;
- a missing provider-native ID or hash mismatch fails closed.

The OpenAI narration fallback applies the same rule using `x-request-id`. No artifact-hash prefix may masquerade as a provider-native response ID in the hardened path.

## Production evidence

```text
SITES_VERSION = 437
SOURCE_CHECKPOINT_COMMIT = 1e0789a02c95b923fcd3fa87f1e560b8291b3000
MIGRATION = 0069_ACTIVE
TASKS_DIAGNOSED = 46
LEGACY_SYNTHETIC_BINDINGS = 46
REQUEST_BINDING_MISSING = 0
REQUEST_BINDING_AMBIGUOUS = 0
PROVIDER_NATIVE_RESPONSE_IDS_VERIFIED = 0
TERMS_PLAN_EVIDENCE_VERIFIED = 0
RIGHTS_DATASET_ASSURANCE_RELEASE_AUTHORITY = 0_0_0_0
RIGHTS_PASS_PENDING = 525_63
FULL_REGRESSION = 172_OF_172_PASS
PROVIDER_REQUESTS = 0
SPEND_USD = 0
```

The production projection is sanitized: it exposes counts and authority flags only, not provider request IDs, artifact IDs, hashes, account data or raw provenance.

## Evidence boundary

The current ElevenLabs terms and the current subscription state cannot be applied retroactively. A historical candidate-provider rights receipt still requires a terms snapshot effective at generation time and paid-plan evidence whose validity interval covers the artifact generation timestamp, in addition to an exact provider request/response/artifact binding. The 46 legacy synthetic bindings do not satisfy that contract.

## Next protected action

Collect authoritative historical ElevenLabs terms snapshots and paid-plan/billing evidence covering the generation intervals. Reconcile them against the immutable candidate task ledger. If a provider-native historical request ID cannot be recovered from authoritative provider history, keep that candidate rights-pending and use newly generated controlled fixtures with the hardened binding path for the assurance corpus.
