# Clean audio control materialization

**Policy:** `CONTROLLED_FIXTURE_MATERIALIZATION_V1`

**Source boundary:** migration `0073_controlled_fixture_clean_audio_materialization.sql`, `lib/controlled-fixture-materialization.ts` and the owner-authenticated evaluation route are the canonical implementation.

**Production state:** `SITES_V446_ACTIVE__ONE_CLEAN_AUDIO_PARENT_MATERIALIZED__RIGHTS_AND_GROUND_TRUTH_PENDING`

## Purpose

Historical ElevenLabs bytes could not be recovered for any of the 46 quarantined audio candidates. This slice creates a new, independently bound clean parent for assurance calibration. It does not repair or promote historical artifacts.

## Bounded execution contract

- exactly one materialized fixture is enabled;
- the enabled blueprint is `CLEAN_AUDIO_NEGATIVE`;
- clean-parent-first is mandatory;
- provider ceiling is two calls: one current subscription read and one TTS request;
- TTS ceiling is 700 characters;
- reserved spend ceiling is USD 0.08;
- the evaluation-only voice identity is pinned to ElevenLabs voice `JBFqnCBsd6RMkjVDRZzb`, model `eleven_multilingual_v2`, output `mp3_44100_128` and an immutable settings hash;
- the provider-native request ID and exact response SHA-256 are mandatory;
- the exact response bytes are written to R2 and read back before an artifact receipt is created.

## Fail-closed result

A successful materialization ends at `BYTES_AND_PROVIDER_BINDING_VERIFIED_RIGHTS_REVIEW_REQUIRED`. Current subscription metadata is time-aligned evidence for the new request, but it is not itself a commercial-rights receipt. Therefore the artifact remains:

- `rights_state = PROVIDER_TERMS_RECEIPT_REQUIRED`;
- `owner_ground_truth_state = NOT_EVALUATED`;
- dataset-ineligible;
- assurance-qualification-ineligible;
- release-ineligible.

No materialization row mutates the sealed blueprint plan or any quarantined candidate. Commercial-rights adjudication and the owner clean label are separate future receipts.

## Production execution evidence

Sites v446 deployed exact source checkpoint `928a7fea6104b8b1abd66a9e1994f9327f23e6df` with migration `0073`. The deployment reached `succeeded`. The owner-authenticated production action then completed once and the immutable projection reported:

- materialized fixtures: 1 of 1 ceiling;
- provider requests: 2 of 2 ceiling;
- TTS requests: 1 of 1 ceiling;
- provider-native request ID: captured;
- exact provider response bytes: sealed;
- R2 read-back: PASS;
- browser media element: one audio source, `readyState = 4`, duration `37.012608` seconds;
- rights: PENDING;
- owner ground truth: `NOT_EVALUATED`;
- release: LOCKED.

Browser decode readiness proves that the stored MP3 can be loaded; it is not a perceptual clean verdict. No owner label or Factory QA receipt was manufactured from metadata.

## Next gate

Collect authoritative, generation-time commercial-rights evidence. Only after rights PASS may the exact audio enter Factory-first perceptual QA and then the owner ground-truth queue. The clean audio-visual master and all defect-positive derivatives remain blocked until this clean audio parent passes those gates.
