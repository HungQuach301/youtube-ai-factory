# QA and Eval Registry

Every finding includes severity, exact evidence, affected artifact/hash, root stage, repair action, acceptance test, confidence and status.

## Stage 09 material gates — CONTROLLED_RELEASE_GATE_V1

- Standard: overall ≥92; every dimension ≥90; P0/P1 = 0.
- Controlled: overall ≥88; Semantic Fit ≥82; every other dimension ≥88; P0 = 0; semantic P1 = 0; presentation P1 ≤1.
- Controlled scale uses a 25% independent QA sample; deterministic and per-unit terminal gates still apply to every unit.
- Scores 84–87 are internal-only. Overall <84 or Semantic Fit <82 is blocked.
- Missing, duplicate or unknown-rights assets = 0.
- Entry, midpoint and exit are materially distinct for MAKE/HYBRID evidence.
- Audience pixels contain no URLs, filenames, provider names, debug labels or production instructions.
- Composite tournament pass does not substitute for motion or sequence proof.

Rubrics and thresholds cannot be changed after failure without a new decision record.

## Video Excellence golden sequence — 2026-08-17

Golden revision 2 passed deterministic transcript, pronunciation, seam, corruption, WPM/rhythm, pitch/prosody, pause, integrated-loudness and true-peak checks. It failed independent audience-facing adjudication:

```text
GOLDEN_ID = golden-sequence-83539abb-71e8-411a-9fe5-95ee58ed39d2
AUDIT_HASH = c6728b7db4383bf10f526537f9b7d3808bbb73d5e9d19071ab70578cb608e957
OVERALL = 46
FACTUAL_SAFETY = 72
SEMANTIC_ALIGNMENT = 28
VOICE_EVIDENCE = 68
VISUAL_DIRECTION = 31
MUSIC_SOUND_DESIGN = 70
MOBILE_LEGIBILITY = 76
TRANSACTION_CHAIN = 39
P0 = 0
P1 = 5
DECISION = REPAIR_REQUIRED
```

Open root causes are semantic pixel mismatch, audience-visible production instructions, flow/state conflation, absent fee presentation, manifest/mix duration mismatch, insufficient shot-specific temporal evidence and missing cue-by-cue synchronization. Document 35 is the complete evidence and repair ledger. Stage 11 remains fail-closed.

## Golden revision 8 closure — 2026-08-17

```text
GOLDEN_ID = golden-sequence-569c498c-f93a-440b-a2ba-91feeda6f52b
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

The repair preserved all floors. It reconciled actual TTS timing, stored transcript evidence, exact financial arithmetic, acquiring-side-to-issuer direction, covered-debit qualifications, high-contrast mobile pixels, and current-revision music/SFX bindings. Golden PASS is complete. Five full-video standards remain not evaluated, so Stage 11 remains fail-closed.

## Golden revision 8 playback correction — 2026-08-17

The score above remains historical component evidence, not a valid playback decision. No encoded master was audited and production displayed a single midpoint PNG plus an audio element. `VQ-M1-GOLDEN-PLAYBACK` is therefore reopened as `BLOCKED`; only `GOLDEN_MASTER_V1` evidence may close it. A provider audit may advance the state only to `AUDIT_PASS_PLAYBACK_REQUIRED`; final `PASS` requires an observed full native-video session with metadata, time progression, pause/resume, seek, audio track, visible motion and `ended=true`.
