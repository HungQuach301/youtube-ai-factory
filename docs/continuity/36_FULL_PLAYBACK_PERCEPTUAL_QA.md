# Full-playback perceptual QA correction

Date: 2026-08-18 (Asia/Bangkok)

## Production finding

Golden revision 9 is a valid VP9/Opus file, but it is not a competitive video. A direct read-back of the exact production bytes (`d1bb546f224e4f787b0a7f8f77b32357324dec4f41af2d101378bc6c1bfb5055`) shows one repeated dark dashboard-card treatment across the full 80.252 seconds. The renderer loops 33 flattened PNGs and creates pixel delta with crop/pan. It does not create B-roll, layered object motion, semantic animation, or meaningful visual treatment diversity.

The prior deterministic gate confused camera movement with content movement. The prior independent audit saw contact sheets, not full temporal experience. Its score has no playback release authority.

## Runtime correction

- Migration 0047 changes revision 9 from `AUDIT_PASS_PLAYBACK_REQUIRED` to `REPAIR_REQUIRED` and appends immutable failure evidence.
- `GoldenMasterScan.motionProvenance` is mandatory.
- Camera-only segments may cover at most 35% of a master.
- At least 45% of segments require layered semantic animation.
- At least 20% of segments require source-video/B-roll composition.
- At least three visual treatments are required.
- The current flattened-PNG executor explicitly declares `FLAT_FRAME_CAMERA_MOTION`; it cannot pass by producing pixel deltas.
- `AUDIT_GOLDEN_AUDIO_PERCEPTUAL` sends the exact master-linked audience mix to `gpt-audio-1.5`, records token usage/cost, and requires timestamped defects plus all-dimension floors. Metadata, ASR and loudness remain diagnostic inputs only.

## Scale rule

No per-video exception may weaken these thresholds. A failure routes to the owning production capability: storyboard treatment selection, source acquisition, layered motion compiler, voice generation, music/SFX composition, or master composer. QA records the defect and blocks release; it does not patch the finished master.

## Next production action

Run the immutable perceptual audio audit on revision 9, then create a new golden revision only after replacing the flat-frame renderer with a mixed-treatment motion compositor. Reuse the narration only if the audio perceptual audit passes and the narration checksum remains identical. Stage 11, subsequent videos, and auto-publish remain blocked.

## Revision 9 audio audit result

The one authorized `gpt-audio-1.5` request heard the exact 80-second audience mix and returned `REPAIR_REQUIRED`: overall 65; voice naturalness 70; pronunciation 85; pacing/prosody 60; mix balance 75; music dynamics 50; SFX timing 45; P0/P1 `1/3`. Findings: robotic/monotonous opening at 0–5s, unnatural pauses at 15–20s, static-like music at 40–45s and an abrupt seam at 60–65s. Measured cost was `$0.0297665`.

Audio reuse is now denied unless the immediately prior revision has both deterministic `audio.status=PASS` and `perceptualAudioAudit.decision=PASS`. The reusable production correction uses longer semantic TTS sections, 1.02 speed, 250ms equal-power section crossfades, a sinusoidal rather than square-wave music bed, and windowed SFX tails. The failed r9 audio assets remain immutable evidence.
