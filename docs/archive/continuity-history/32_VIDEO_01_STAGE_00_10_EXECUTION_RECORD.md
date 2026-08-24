# Video #1 — Stage 00–10 Production Execution Record

Date: 2026-08-16  
Contract: `V7_V23_4_V281`  
Video: `What Really Happens to a $100 Card Purchase?`  
Status: Stage 00–10 control-state `FROZEN`; Stage 11 control-state `READY` but `BLOCKED_VIDEO_STANDARD_V2`; videos 2–15 `BLOCKED_PREVIOUS_VIDEO`.

Quality correction recorded 2026-08-17: Document 34 preserves this execution history but finds the current Stage 08–10 lineage ineligible for audience-facing composition. The execution facts below are immutable and must not be reinterpreted as Video Excellence proof.

## Acceptance result

The authorized checkpoint is complete. Every current-video stage transition was made through a typed command receipt. No legacy production artifact was eligible. Stage 00 used no provider and incurred no spend. Provider execution began only after the current stage contract permitted it; Stage 08–10 additionally required an approved bounded cost/rights plan.

| Scope | Production result | Stored eligibility evidence |
|---|---|---|
| Runtime foundation | 18 ordered stage contracts; five typed commands; exclusive leases; idempotent receipts; bounded root repair | D1 registry/state/receipts/events; R2 artifact JSON and content checksum |
| Stage 00 proof | Video #1 completed only by `START → PRODUCE ×3 → VERIFY ×3 → FREEZE`; video #2 rejected with `VIDEO_BLOCKED_PREVIOUS_VIDEO` | 3/3 frozen artifacts; provider requests 0; spend $0 |
| Stage 01–07B | 8 stages, 24 new artifacts, frozen from current parent lineage only | OpenAI response IDs, usage estimates, parent IDs, `legacySources=0`, quality floor proof |
| Stage 08 | 84 contiguous shot contracts over 0–600 s | typed scene program; SOURCE/MAKE/HYBRID route; ENTRY/MIDPOINT/EXIT; exact coverage/gap checks |
| Stage 09 | 84/84 new media assets | real bytes, SHA-256, R2 read-back, shot binding, provider/license lineage |
| Stage 10 | narration, music and SFX stems frozen | commercial voice tier, WAV bytes, SHA-256/read-back, duration/peak/RMS/silence measurements |

The Stage 10 row proves stored bytes and the prior contract transition only. It does not prove natural voice performance, production music/SFX or a full-duration audience mix under Document 34.

## Command and eligibility model

Only these commands mutate the sequential runtime:

1. `START_STAGE` verifies queue ownership, predecessor eligibility, expected state, exclusive lease and attempt ceiling.
2. `PRODUCE_ARTIFACT` requires an artifact type declared by the active Stage Contract, valid parent lineage, rights/cost states, approved plan when required, and stored R2 read-back.
3. `VERIFY_ARTIFACT` runs deterministic stage checks and records immutable verification evidence.
4. `FREEZE_STAGE` requires the exact required artifact set, all artifacts verified, eligible rights/cost/bytes, and zero active provider requests. It then opens only the immediate successor.
5. `REOPEN_ROOT_STAGE` requires a frozen root stage, a material reason and remaining repair allowance. It supersedes the root-stage artifacts, blocks downstream stages and preserves prior revisions.

The eligibility engine fails closed on wrong queue, wrong stage state, missing/incorrect artifact type, unverified predecessor, invalid parent, missing stored bytes, failed read-back, checksum mismatch, unacceptable rights/cost state, legacy hash, unapproved budget plan or active provider request.

## Stage-by-stage execution evidence

| Stage | Newly frozen artifact set | Technique/tool used | Control outcome |
|---|---|---|---|
| 00 | production policy; canonical brief hash; exclusive lease | deterministic policy compiler, D1, SHA-256 | zero provider calls; zero spend; exclusive video-01 authority |
| 01 | episode intelligence dossier; audience job; competitive bar | OpenAI structured response + fresh web search | quality floors met; primary-source evidence; $1.107285 estimate |
| 02 | reference set; parity matrix; anti-copy constraints | OpenAI structured response + fresh web search | analysis-only rights state; $1.401545 estimate |
| 03 | primary sources; claim-source graph; contradiction ledger | OpenAI structured response + fresh primary research | first response incomplete and retained; successful retry $1.315238; failed attempt $1.451830 |
| 04 | four creative routes; seven-critic decision; frozen champion | OpenAI structured tournament | champion and rejected-route evidence frozen; $0.589210 |
| 05 | story clock; retention spine; claim-beat map | OpenAI structured story compiler | 8–12 minute architecture and claim linkage; $0.747490 |
| 06 | locked narration; terminology ledger; script critic evidence | OpenAI structured script compiler | complete en-US narration and script checksum; $0.676940 |
| 07A | one narrator identity; take tournaments; soundscape contract | OpenAI production-design compiler | first artifact-set failure retained; successful attempt $0.730765; failed attempt $0.701660 |
| 07B | visual grammar; SOURCE MAKE HYBRID routing; provider tournament | OpenAI production-design compiler | rights routes and prohibited patterns frozen; $0.808005 |
| 08 | shot contracts; typed scene programs; ENTRY MIDPOINT EXIT | OpenAI schema-bound compiler + deterministic timeline validation | exactly 84 shots, 0–600 s, contiguous; $1.282605 |
| 09 | stored source bytes; rights lineage; three-frame motion proof | Pexels, Pixabay fallback, deterministic original SVG, R2 | 84/84 stored; 73 MAKE, 7 HYBRID, 4 SOURCE; 10 Pexels, 1 Pixabay, 73 internal |
| 10 | audio stems; waveform evidence; measured mix | ElevenLabs multilingual v2, locked Adam voice, deterministic WAV/metrics, R2 | final narration 704.447 s; 33,813,498 bytes; all three stems read back and frozen |

## Stage 09 material controls

- The Stage 08 route was binding; Stage 09 could not silently change SOURCE/MAKE/HYBRID mode.
- SOURCE/HYBRID items used stored Pexels bytes with one Pixabay fallback. Provider URL, license path and request result were recorded.
- MAKE items are channel-owned original SVG assets, not a reused template/media library.
- Each asset row records shot ID, provider, mode, byte count, SHA-256, rights state and R2 read-back.
- 84/84 assets exist. Count by mode: MAKE 73, HYBRID 7, SOURCE 4. Count by provider: internal original 73, Pexels 10, Pixabay 1.
- Provider failures were retained rather than hidden: three Pexels failures and one Pixabay failure. Normalized queries and the declared fallback path were used; there was no blind retry.

## Stage 10 repair record

The initial full narration request exceeded ElevenLabs' 10,000-character request limit and failed. The runtime was changed to split narration into two bounded chunks. That attempt produced a technically valid 863.968-second narration, but it exceeded the 480–720-second audience-runtime contract and was not accepted as final quality.

The cost/rights plan was versioned to permit the bounded repair. `REOPEN_ROOT_STAGE` superseded the prior Stage 10 artifacts, preserved the earlier evidence, blocked Stage 11–16 and returned Stage 10 to `READY`. Attempt 2 used ElevenLabs speed 1.2 and an attempt-specific storage namespace. The runtime measured 704.446958 seconds before artifact creation; the result then passed `PRODUCE_ARTIFACT`, `VERIFY_ARTIFACT` and `FREEZE_STAGE`.

Final stems:

| Stem | Provider | Duration | Sample rate | Bytes | SHA-256 | Rights |
|---|---|---:|---:|---:|---|---|
| Narration | ElevenLabs, Adam `pNInz6obpgDQGcFmaJgB`, PAYG | 704.447 s | 24 kHz mono | 33,813,498 | `6cd63b44f6e95f95232892b5a9163e2ef4c3acc8d563300d3a3c6fb25e855d6e` | commercial verified |
| Music bed | internal original | 30 s | 24 kHz mono | 1,440,044 | `5ed088481f9ffc8e802c24122844c096985c094882378679be32eaf6560889ef` | channel-owned/commercial verified |
| SFX cues | internal original | 10 s | 24 kHz mono | 480,044 | `fe2d199fb8ed692e3d969580269f147875b499ff92053c39e65403c8b7e14a18` | channel-owned/commercial verified |

The 24 kHz files are Stage 10 provider-native mezzanine stems. Stage 11 must mix/resample at 48 kHz; Stage 13 must verify 48 kHz distribution audio. This distinction prevents the intermediate format from being misreported as the final master format.

## Provider, rights and cost reconciliation

Approved plan v3 (`seq-plan-2ab378e3-bc9c-4542-b549-730f3d58151c`) covers Stage 08–10 with maximum new-phase spend $29 and 100 requests, within a $40 whole-video hard cap. Actual ledger state at closure: 31 requests, seven retained failures, zero active requests, estimated OpenAI usage $10.812573.

| Provider | Requests | Failed retained | Ledger cost | Rights/cost interpretation |
|---|---:|---:|---:|---|
| OpenAI | 11 | 2 | $10.812573 estimated | usage-derived estimate; not invoice proof |
| Pexels | 13 | 3 | $0 | commercial source lineage recorded |
| Pixabay | 2 | 1 | $0 | commercial fallback lineage recorded |
| ElevenLabs | 5 | 1 | $0 reported by API | PAYG commercial tier verified; API did not return a monetary amount, so no invoice amount is asserted |

Failed attempts are included in the request ledger and, where OpenAI returned usage, in the spend estimate. Provider usage evidence and billing evidence remain separate.

## Current gate state

- Stage 00–10: `FROZEN`, exact required artifact set 3/3 for each stage.
- Stage 11 D1 state: `READY`; quality eligibility: `BLOCKED_VIDEO_STANDARD_V2`. It is not a permitted production action until the required root-stage repair is separately authorized and completed.
- Stage 12–16: `BLOCKED_UPSTREAM`.
- Video #2 and videos #3–15: `BLOCKED_PREVIOUS_VIDEO`.
- Active provider requests: 0.
- Automatic YouTube publishing: OFF.
- UI language: English. Multilingual UI is intentionally deferred.

## Document 34 eligibility assessment

- Stage 08: 84 records are contiguous only over 0–600 seconds while narration is 704.446958 seconds; the revision cannot cover the canonical timeline.
- Stage 09: the recorded `three-frame motion proof` contains declared entry/midpoint/exit text rather than decoded rendered temporal pixels.
- Stage 10: narration speed is 1.2; chunking is materially larger than the new quality envelope; production music/SFX and a full-duration perceptually evaluated mix do not exist.
- Quality values in the current Stage 10 artifact are metadata declarations, not independent listening scores.
- Historical provider requests, costs, bytes, hashes and failures remain valid audit evidence and must not be deleted or overwritten.
