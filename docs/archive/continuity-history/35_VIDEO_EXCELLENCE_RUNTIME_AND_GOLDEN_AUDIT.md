# Video Excellence Runtime and Golden Sequence Audit

**Execution date:** 2026-08-17 (Asia/Bangkok)  
**Quality contract:** `VIDEO_PRODUCTION_QUALITY_STANDARD_V2`  
**Production deployment:** Sites v359  
**Source checkpoint before this record:** `41a28ef3edb778b0961fdc00d110d07065d47791`  
**Release conclusion:** `REPAIR_REQUIRED` / Stage 11 fail-closed

## 1. Authorized boundary and ledger

The production run was bounded by one approved plan covering Stages 08–10 and the golden sequence:

```text
PLAN_ID = seq-plan-ee7708c3-4f6d-4c06-8b37-efa8b55e604f
MAX_SPEND_USD = 20.00
MAX_PROVIDER_REQUESTS = 40
ACTUAL_SPEND_USD = 12.471527595833333
ACTUAL_PROVIDER_REQUESTS = 40
ACTIVE_PROVIDER_REQUESTS = 0
AUTO_PUBLISH = FALSE
```

The request ceiling is exhausted. No further provider dispatch is authorized by this plan even though `7.528472404166667 USD` remains below the monetary ceiling. Authentication secrets were neither logged nor persisted in project artifacts.

## 2. Implementation result against the seven requested steps

| Step | Production result | Release meaning |
|---|---|---|
| Standard Registry and M0–M4 resolver | Implemented: 19 inherited standards, 18 hard gates, Channel → Pillar → Series → Episode resolution, no descendant weakening | Control plane complete |
| Truthful projection/UI and Stage 11 block | Implemented and production-verified | Stage 11 remains blocked when quality evidence is missing or failed |
| Voice, pronunciation, pitch, pause, prosody, seam, music/SFX and mix evaluators | Implemented; revision 2 audio passed every deterministic hard check | Audio measurements pass, but do not override audiovisual coverage failure |
| Real motion evidence | Implemented as stored PNG bytes at ENTRY/MIDPOINT/EXIT, 45 frames for the golden sequence | Pixel existence and temporal change pass; semantic correctness does not |
| Stage 08 full-duration recompilation | Completed with 98 adaptive shots covering the canonical duration | Replaces fixed `84` as current Stage 08 evidence |
| Hardest 60–90 second golden sequence | Produced twice; revision 2 contains 15 shots, 45 frames and a 64.594333-second audience mix | Within requested duration band, but manifest/playback duration is not reconciled |
| Golden sequence quality pass | **Not achieved**; independent audit scored 46 with five P1 findings | `REPAIR_REQUIRED`; no release authority |

## 3. Stage 08 authoritative result

```text
STAGE_08_REVISION = RECOMPILED_AND_FROZEN
CANONICAL_START_SECONDS = 0
CANONICAL_END_SECONDS = 704.4469583333333
DISPLAY_DURATION_SECONDS = 704.446958
ADAPTIVE_SHOT_COUNT = 98
TIMELINE_GAPS = 0
TIMELINE_OVERLAPS = 0
FIXED_COUNT_AUTHORITY = FALSE
```

The prior `84 shots / 600 seconds` revision remains immutable history only. The new count of `98` is also a derived result, not a universal target. Future shot counts must continue to follow narration semantics and meaningful visual events.

## 4. Golden revision 2 measured evidence

```text
GOLDEN_ID = golden-sequence-83539abb-71e8-411a-9fe5-95ee58ed39d2
REVISION = 2
MANIFEST_WINDOW = 122.741160_TO_208.071703
MANIFEST_DURATION_SECONDS = 85.330543
AUDIENCE_MIX_DURATION_SECONDS = 64.59433333333334
UNRECONCILED_DURATION_SECONDS = 20.73620966666666
SHOTS = 15
TEMPORAL_PNG_FRAMES = 45
VOICE = ELEVENLABS_ADAM_PAYG
TRANSCRIPT_MISMATCH_RATIO = 0
WPM = 138.40223342604872
PITCH_PROSODY_RANGE_SEMITONES = 8.181888479684941
PAUSE_COUNT = 30
MEDIAN_PAUSE_MS = 281.07291666666663
INTEGRATED_LOUDNESS_LUFS = -13.999999591535643
TRUE_PEAK_DBTP = -1.3618062737559953
DETERMINISTIC_AUDIO_ASSESSMENT = PASS
```

Audio passing does not imply golden playback passing. The current audience mix is 20.736210 seconds shorter than the manifested edit, so complete narration coverage and synchronization are unproven.

## 5. Independent audit verdict

The first audit attempt ended provider-complete but returned no adjudication because the output budget was consumed by reasoning. The runtime correctly recorded no pass and allowed one bounded delta retry. The second audit completed and is authoritative:

| Dimension | Score | Required floor | Result |
|---|---:|---:|---|
| Factual safety | 72 | 94 | Fail |
| Semantic alignment | 28 | 94 | Fail |
| Voice evidence | 68 | 90 | Fail |
| Visual direction | 31 | 90 | Fail |
| Music and sound design | 70 | 90 | Fail |
| Mobile legibility | 76 | 90 | Fail |
| Transaction chain | 39 | 90 | Fail |
| Overall | 46 | 92 | Fail |
| P0 | 0 | 0 | Pass |
| P1 | 5 | 0 | Fail |

```text
AUDIT_DECISION = REPAIR_REQUIRED
AUDIT_HASH = c6728b7db4383bf10f526537f9b7d3808bbb73d5e9d19071ab70578cb608e957
AUDIT_PROVIDER_STATUS = completed
AUDIT_REQUEST_COST_USD = 0.0968
```

Release-blocking findings:

1. Audience pixels repeat a generic institutional-chain template instead of realizing the shot-specific approval card, lifecycle, checkout, map-build and information-request scenes.
2. Audience-visible production instructions remain in the graphics, including uppercase wording constraints.
3. The six transaction states are not visibly distinguished and message, money, settlement and payout flows risk being conflated.
4. The 64.594333-second mix does not cover the 85.330543-second manifest.
5. Identical aggregate temporal-delta ratios and near-identical layouts do not prove the claimed shot-specific semantic transitions.
6. The `Follow the Fee` route shows no fee amount, split, deduction or recipient attribution.
7. Low-contrast labels and instruction-like copy weaken mobile legibility and finish.
8. Stored music/SFX measurements do not prove cue-by-cue synchronization across the manifested edit.

## 6. Current Standard Registry evidence state

Six of eighteen inherited hard standards pass. The following hard standards remain failed or not evaluated:

- `VQ-M0-FACTUAL-TRACEABILITY` — FAIL
- `VQ-M0-SAFETY-SCOPE` — NOT_EVALUATED
- `VQ-M1-GOLDEN-PLAYBACK` — FAIL
- `VQ-M1-MOBILE-LEGIBILITY` — FAIL
- `VQ-M1-RIGHTS-LINEAGE` — NOT_EVALUATED
- `VQ-M1-SEMANTIC-ALIGNMENT` — FAIL
- `VQ-M2-HOOK-PACING` — NOT_EVALUATED
- `VQ-M2-PILLAR-EXCEPTION` — NOT_EVALUATED
- `VQ-M2-PILLAR-FLOW-LEGEND` — FAIL
- `VQ-M2-PILLAR-TRANSACTION-CHAIN` — FAIL
- `VQ-M2-SERIES-FOLLOW-THE-FEE` — FAIL
- `VQ-M2-EPISODE-100-CARD` — NOT_EVALUATED

## 7. Root-cause repair contract for golden revision 3

The next revision must repair the production system, not merely lower thresholds or relabel evidence:

1. Reconcile one canonical golden duration before rendering. The manifest, narration, cue timeline, frame timeline and audience mix must match within one 30-fps frame.
2. Compile shot-specific scene programs. Every ENTRY/MIDPOINT/EXIT frame must render the active claim, actor/state change, fee fact and route-specific legend rather than a shared generic template.
3. Separate author instructions from audience copy structurally. Instruction fields must never enter the raster text layer.
4. Show the complete `Follow the Fee` logic: qualified amount/range, payer, recipient, deduction and actor net position. Message, money, fee and risk flows require distinct stable encodings.
5. Show and preserve the six-state lifecycle with factual timing qualifiers and an explicit exception/failure branch.
6. Bind every music/SFX cue to a measured state change and store cue-by-cue playback evidence.
7. Evaluate actual 25%-scale and phone-width pixels; inactive states must remain readable and essential copy must meet contrast/safe-area requirements.
8. Run independent audit only after all deterministic evidence is complete. Required result remains overall ≥92, factual safety ≥94, semantic alignment ≥94, every other critical dimension ≥90, P0=0 and P1=0.

No failed threshold may be weakened. The existing revision 2 and audit remain immutable evidence.

## 8. Exact next action and authority boundary

The production request ledger is at `40/40`, so revision 3 cannot complete under the current plan. The next legal action is a separately approved bounded repair plan. A minimal envelope is expected to require up to five additional provider requests: narration chunk(s), transcription and one independent audit; actual execution must first reconcile whether existing audio can be reused without sacrificing complete semantic coverage.

Until a new request ceiling is explicitly approved:

```text
GOLDEN_SEQUENCE = REPAIR_REQUIRED
VIDEO_QUALITY_ELIGIBILITY = BLOCKED_VIDEO_STANDARD_V2
STAGE_11 = BLOCKED
AUTO_PUBLISH = FALSE
PROVIDER_DISPATCH = STOPPED_AT_AUTHORIZED_CEILING
```

## 9. Checkpoint verification

```text
TARGETED_SEQUENTIAL_TESTS = 13_OF_13_PASS
FULL_REGRESSION = 110_OF_110_PASS
PRODUCTION_BUILD = PASS
COMMERCIAL_STATIC_CONTRACT = 81_OF_81_PASS
RENDERED_COMMERCIAL_CONTRACT = PASS
CLIENT_PERFORMANCE_BUDGET = 309991_OF_310000_GZIP_BYTES_PASS
PRODUCTION_UI_READBACK = REPAIR_REQUIRED_6_OF_18_HARD_GATES_STAGE_11_BLOCKED
```

Unused legacy `.topbar` and `.topActions` CSS was removed to keep the client catalog inside its unchanged performance ceiling. No quality, release or provider budget was weakened.

## 10. Golden revisions 3–8 repair history

The authorized repair loop preserved every prior revision and audit. No threshold was weakened.

- Revision 3 repaired source-window selection, actual-TTS timing and real semantic PNG rendering; deterministic audio failed transcript/WPM gates.
- Revision 4 moved voice pacing into range and upgraded transcription; transcript mismatch remained above 1%.
- Revision 5 stored the provider transcript, canonicalized non-audible currency symbols and passed every audio hard gate after zero-provider byte reassessment.
- Revision 6 replaced generic cards with shot-specific Square, Stripe, gross/net and covered-debit programs; audit reached 90 but found two P1 traceability gaps.
- Revision 7 added the covered-debit calculation and current-revision cue bindings; audit exposed a missing `INTERCHANGE` label and low-contrast qualifiers.
- Revision 8 corrected the mandatory label, made qualifiers high contrast at every state and exposed acquiring-side-to-issuer direction from ENTRY.

Audio promotion between identical-narration revisions reused only checksum-verified current golden bytes. Metadata explicitly records `legacyAssetReuse=false`; music/SFX bindings were regenerated for the target revision.

## 11. Golden revision 8 authoritative PASS

```text
GOLDEN_ID = golden-sequence-569c498c-f93a-440b-a2ba-91feeda6f52b
REVISION = 8
DURATION_SECONDS = 80.24458333333334
SHOTS = 11
TEMPORAL_PNG_FRAMES = 33
RENDERER_VERSION = FOLLOW_FEE_PROGRAM_V4
VOICE = ELEVENLABS_ADAM_PAYG
TRANSCRIPTION_MODEL = GPT_4O_TRANSCRIBE
TRANSCRIPT_MISMATCH_RATIO = 0.0053475935828877
WPM = 131.59766754765377
PITCH_RANGE_SEMITONES = 8.506009906599894
PAUSE_COUNT = 22
MEDIAN_PAUSE_MS = 380.9270833333333
INTEGRATED_LOUDNESS_LUFS = -14.190724304029693
TRUE_PEAK_DBTP = -1.1501502719143972
TIMING_MAXIMUM_DELTA_SECONDS = 0
AUDIT_HASH = d0d588ba25fdcb5f8d27ff792240cca0d66d5f271067f4c87645bad103847a39
OVERALL = 94
FACTUAL_SAFETY = 97
SEMANTIC_ALIGNMENT = 96
VOICE_EVIDENCE = 98
VISUAL_DIRECTION = 94
MUSIC_SOUND_DESIGN = 91
MOBILE_LEGIBILITY = 92
TRANSACTION_CHAIN = 95
P0 = 0
P1 = 0
DECISION = PASS
```

The passing pixels show scoped Square and Stripe arithmetic, a qualified merchant contractual deduction, acquiring-side-to-issuer interchange direction, separate network/merchant-service categories, and the covered-debit build `$0.21 + $0.05 + up to $0.01 = up to $0.27` labeled as issuer interchange only and not total merchant acceptance cost.

## 12. Budget, projection and remaining release gate

```text
PLAN_ID = seq-plan-ecd39187-a01e-494d-90ed-d930de1e2d4c
PLAN_MAX_PROVIDER_REQUESTS = 60
ACTUAL_PROVIDER_REQUESTS = 53
PLAN_MAX_SPEND_USD = 20
ACTUAL_ESTIMATED_SPEND_USD = 13.070514645833333
ACTIVE_PROVIDER_REQUESTS = 0
STANDARD_REGISTRY = 19_RESOLVED_18_HARD
HARD_STANDARDS_PASSED = 13_OF_18
GOLDEN_SEQUENCE_STATE = PASS
VIDEO_QUALITY_ELIGIBILITY = BLOCKED_VIDEO_STANDARD_V2
STAGE_11 = BLOCKED_UPSTREAM
FULL_REGRESSION = 110_OF_110_PASS
PRODUCTION_BUILD = PASS
```

The remaining gaps are full-video evidence, not golden defects: `VQ-M0-SAFETY-SCOPE`, `VQ-M1-RIGHTS-LINEAGE`, `VQ-M2-HOOK-PACING`, `VQ-M2-PILLAR-EXCEPTION` and `VQ-M2-EPISODE-100-CARD`. The next action is to satisfy those five standards across the complete current lineage; only then may Stage 11 start.

## 13. Root-cause correction: component audit was not playback

Production review exposed a category error in the QA architecture: the runtime stored and scored frame components, then the UI coupled one `MIDPOINT` PNG with a separate audio control and labeled the result as an 80-second video. The audit sampler could therefore report high semantic scores without proving continuity, native duration, motion, seeking or audience playback.

The correction is systemic. Migration 0046 invalidates the false playback PASS without deleting its lineage. A reusable master-render job consumes all verified frame/audio inputs; the executor encodes the audience artifact; upload accepts only a contract-valid probe and full scan; read-back checksum and Range are mandatory; independent audit reviews decoded master contact sheets; and final PASS is reserved for a full observed native-video session. Production projection no longer exposes poster or mix URLs as a video fallback.

## 14. Production execution result

The production run found and fixed two additional scale defects rather than bypassing them. First, per-segment duration rounding under-produced frames; cumulative integer-frame allocation now guarantees the exact canonical total for any shot count. Second, `AUDIO_READY` was missing from the generic master-render transition; the state machine now supports `AUDIO_READY → MASTER_RENDERING` for every new revision.

Revision 8 master QA then identified the actual audience defect: mobile legibility `76`, one P1. Renderer V5 raised and persisted critical text floors. Revision 9 produced master SHA-256 `d1bb546f224e4f787b0a7f8f77b32357324dec4f41af2d101378bc6c1bfb5055`, 1920×1080 at 30 fps, 2,407 decoded frames, 33 unique semantic samples, 0 black seconds, 0.3 s maximum freeze, Opus stereo 48 kHz, integrated loudness −13.3 LUFS and true peak −3.6 dBFS. Full 1× A/V decode and seeks at 10/40/75 seconds passed; production Range returned `206`.

Independent audit passed at `94` with P0/P1 `0/0`, but the final state remains `AUDIT_PASS_PLAYBACK_REQUIRED`. The cloud browser policy blocked native playback from both Sites preview and its shared file. That environmental limitation is recorded as pending evidence; it was not converted into a false human PASS.
