# Clean-audio commercial-rights evidence

## Decision

The clean-audio fixture remains rights-pending. Migration `0074_clean_audio_commercial_rights_evidence.sql` and policy `EVALUATION_CURRENT_RIGHTS_EVIDENCE_CAPTURE_V1` add an immutable, zero-generation evidence lane; they do not create a commercial-rights receipt.

The generation-time provider binding proves an exact provider-native request ID, exact audio bytes, R2 read-back, pinned `eleven_multilingual_v2`, and the subscription snapshot `payg · active`. That snapshot does not identify the underlying base plan or independently prove that the generation was covered by commercial-use terms.

## Bounded capture

The owner-authenticated command `CAPTURE_CURRENT_COMMERCIAL_RIGHTS_EVIDENCE` reads exactly four official sources:

1. ElevenLabs Terms of Use.
2. ElevenLabs commercial-publishing help.
3. ElevenLabs pay-as-you-go administration documentation.
4. ElevenLabs text-to-speech capability documentation.

Each response is bounded to 2,000,000 bytes, hashed exactly, stored in R2, read back, and recorded with its source URL, HTTP status, content type, retrieval time and evidence hash. The run permits four public reads, zero account reads, zero generation requests and zero spend.

## Diagnostic contract

The immutable diagnostic binds the source receipts to the exact clean-audio SHA-256, provider binding receipt, generation-time subscription response hash and observed time, the pinned non-Beta model, the channel-authored narration hash, and the `NON_EEA_VIETNAM` jurisdiction scope.

Even when all four source snapshots pass, the expected outcome is `REVIEW_REQUIRED_PAYG_BASE_PLAN_AMBIGUOUS`. The required next evidence is `GENERATION_TIME_BASE_PLAN_OR_CONTRACT_EVIDENCE`.

All promotion authorities remain zero:

- rights PASS: 0;
- dataset sealing: 0;
- assurance qualification: 0;
- release: 0.

## Next gate

Obtain authoritative generation-time base-plan or contract evidence. Only a separate adjudication policy may convert that evidence into a provider-terms receipt. Factory-first perceptual audio QA, owner clean-label verification, dataset membership and any downstream qualification remain blocked until that rights gate passes.

## Production result — 2026-08-23

Sites v448 activated migration 0074 and the owner-authenticated capture completed exactly once. Three source receipts passed with HTTP 200 and exact R2 read-back:

- `TERMS_OF_USE`;
- `PAYG_ADMINISTRATION_DOCS`;
- `TTS_CAPABILITY_DOCS`.

`PUBLISHING_COMMERCIAL_LICENSE_HELP` returned HTTP 403. Its exact HTTP response bytes were hashed and read back from R2, but the receipt is `HTTP_ERROR`, not verified commercial-license content. The immutable run therefore records 4/4 processed and 3/4 verified sources, zero account reads, zero generation requests and zero spend.

The diagnostic outcome is `REVIEW_REQUIRED_OFFICIAL_SOURCE_CAPTURE_INCOMPLETE`. Independently, the generation-time `payg · active` snapshot still leaves `BASE_PLAN_COMMERCIAL_RIGHTS_NOT_PROVEN`. Sites v449 exposes all four receipt states to the owner without exposing hashes or storage keys.

Production source checkpoints:

- evidence capture: commit `9bb5fe43bdff9c5ca0219878caa0aedac4249203`;
- receipt-detail projection: commit `2b0d2034d914be54eac707ad7db5f26dc972af3f`.
