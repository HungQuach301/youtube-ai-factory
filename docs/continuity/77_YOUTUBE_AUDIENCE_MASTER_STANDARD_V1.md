# YouTube Audience Master Standard V1

**Class:** `NORMATIVE` plus owner disposition evidence  
**Status:** `ACTIVE`  
**Date:** 2026-08-23 (Asia/Bangkok)  
**Scope:** original YouTube AI Factory only; Production V2 is excluded and must remain untouched.

## 1. Purpose

`YOUTUBE_AUDIENCE_MASTER_STANDARD_V1` is the release constitution for a viewer-facing YouTube video. It sits above technical materialization, contact-sheet review and Browser playback evidence. A decodable file with valid checksums, audible audio, pixel change and responsive controls is only a technical clean-control; it is not an audience-ready master.

The standard preserves every prior receipt as immutable evidence while correcting the release interpretation exposed by the owner's review of distribution SHA-256 `db65f24a28252757901ab5c16fac8711dd6f4ca8e83bd5963ebb6e80c666781c`.

## 2. Authority and release rule

Official YouTube requirements define upload compatibility, policy and disclosure obligations. The Factory's internal standard is intentionally stricter because compatibility does not prove audience quality.

A master is `YOUTUBE_AUDIENCE_READY` only when all of the following are true:

- weighted score is at least `92/100`;
- Content, Visual, Motion and Audio each score at least `90/100`;
- `P0 = 0`, `P1 = 0`, and at most two accepted `P2` observations remain;
- Technical Master, Rights/Policy, Factory full-video QA, Browser/device QA, owner perceptual decision and YouTube upload/checks each independently pass;
- the exact archival and distribution bytes, evidence bundle and decisions bind the same immutable lineage;
- release and publication remain separate typed authorities; auto-publish remains OFF.

No average score, contact sheet, motion percentage, model opinion or browser telemetry may compensate for a failed hard gate.

## 3. Defect severity

| Severity | Meaning | Required disposition |
|---|---|---|
| `P0` | Unsafe, false, rights-invalid, corrupted, materially misleading, missing essential A/V, severe sync failure or output-form mismatch affecting the whole experience | Reject immediately; reopen the owning stage; no release waiver |
| `P1` | Major audience-quality failure: slide-like presentation, weak semantic motion, unreadable mobile text, repetitive treatment, poor hook/payoff, distracting narration/mix or sustained retention risk | Reject; repair the owning capability; zero P1 required for release |
| `P2` | Local polish issue that does not materially impair comprehension, truth or retention | At most two may be explicitly accepted with rationale and no recurrence pattern |

## 4. Weighted audience scorecard

| Dimension | Weight | Release floor | Evidence |
|---|---:|---:|---|
| Content, truth and originality | 20 | 90 | claim-source graph, script audit, originality review |
| Story, hook, pacing and retention design | 15 | 90 | beat map, full-timeline audit, retention contract |
| Visual richness and semantic fit | 15 | 90 | shot/claim lineage, full-video review, source diversity report |
| Motion and editing | 15 | 90 | decoded temporal analysis plus full playback |
| Typography, diagrams and mobile legibility | 8 | 90 | OCR, contrast, safe-area and device-frame evidence |
| Narration and speech continuity | 10 | 90 | ASR/alignment, perceptual audio review, device audition |
| Mix, music and sound design | 5 | 90 | BS.1770 measurements, cue sheet, perceptual review |
| Packaging: title and thumbnail | 7 | 90 | packaging-promise contract and mobile thumbnail review |
| Captions and accessibility | 5 | 90 | caption coverage/timing and accessibility checks |

The weighted score is informative only after every applicable hard gate passes.

## 5. Content, originality and narrative controls

### 5.1 Hard gates

- The title, thumbnail, first 30 seconds, body and payoff express the same promise.
- The hook begins within `0–8 seconds`; the viewer understands the specific payoff by 30 seconds.
- Every consequential claim is bound to dated authoritative evidence or an explicit qualifier.
- The episode adds original explanation, synthesis, reporting, diagramming or argument; mass-produced templates, generic AI phrasing and minimally transformed source material are ineligible.
- Every beat changes knowledge, expectation, emotion or mental model. Generic intros, repeated exposition and summary-only endings are prohibited.
- A progress, reveal, contrast, open loop, proof point or meaningful visual reset normally occurs every `20–40 seconds`.
- Midpoint re-hook occurs within `40–60%` of runtime and payoff within the final `20%`, unless a stricter episode contract applies.

### 5.2 Post-publish learning targets

These are `M4` learning targets, never fabricated pre-publish evidence:

- first-30-second audience retention: target `≥75%`;
- 60-second retention: target `≥65%`;
- average percentage viewed: target `≥50%`, stretch `≥55%`;
- title/thumbnail CTR and retention are compared only within the same traffic-source and audience context.

## 6. Visual richness and semantic-fit controls

- At least `95%` of visible runtime must have a defensible semantic job: explain, prove, orient, compare, demonstrate or create a story-justified emotional state.
- Text-card or slideshow-like presentation may occupy at most `15%` of runtime and may not form the dominant treatment.
- No slide-only hold may exceed `10 seconds`; an unjustified static hold over `5 seconds` is P1 and over `8 seconds` is P0.
- Exact asset reuse is at most `5%` of runtime unless the recurrence is an intentional, meaning-changing motif.
- Generic stock or generic generated imagery is at most `35%` of runtime and must never be filler.
- The treatment mix must include at least three genuinely different semantic families, such as source footage, layered diagrams, maps, UI/receipt evidence, data visualization, spatial metaphor or authored object animation.
- Camera motion over a flattened card does not count as semantic motion, treatment diversity or new evidence.
- Every diagram arrow, label, amount, color and transition must preserve the factual route and causal relationship.

## 7. Motion and editing controls

- Meaningful visual events occur every `2.5–5 seconds`; the first 30 seconds target `2.5–3 seconds`.
- Default near-static interval is at most `3.5 seconds`; longer holds require a semantic state change or explicit rationale.
- Meaningful-motion coverage is at least `70%` of runtime and at least `85%` in the first 30 seconds.
- Median actively changing semantic region is at least `8%` of the frame; cursor blink, noise, particles, decorative zoom and global pan do not qualify.
- Editorial density normally lands at `12–20` meaningful shots per minute, derived from the story rather than used as a quota.
- Camera-only motion may cover at most `20%` of runtime.
- Repeated transition mechanics may not become a visible template pattern.
- Cuts, reveals and state changes must align with narration or sound cues within `100 ms` when the relationship is claim-specific.

## 8. Typography, diagrams and mobile legibility

The rendered video, not the design file, is authoritative.

- At 1920×1080, essential graphical body text is normally at least `38 px`, secondary labels `32–34 px`, and headlines `52 px` or larger.
- On the operator/browser surface, displayed body text must be at least `16 CSS px`, captions at least `18 CSS px`, and headings at least `24 CSS px` at representative mobile width.
- Normal text contrast is at least `4.5:1`; large text at least `3:1`.
- Essential content remains inside a `5%` safe margin.
- Diagram labels normally contain `2–5 words`; headlines normally contain `6–10 words` and at most two lines.
- OCR must recover `100%` of essential on-screen text, numbers, names and units from the exact distribution render.
- Mobile QA must inspect actual pixels at 25% scale and at representative `320–480 CSS px` viewports.

## 9. Narration, mix and sound

- Narration target is `145–165 WPM`, with slower mechanism-dense passages allowed when comprehension improves.
- Transcript mismatch/WER is at most `1%`; proper names, financial terms, numbers and units must be exact.
- No audible seam, clipped/doubled phoneme, material timbre drift, robotic cadence, unexplained pause or pronunciation defect is allowed.
- Integrated loudness is `-14 ±1 LUFS-I`; maximum true peak is `≤ -1 dBTP`.
- Narration noise floor target is better than `-55 dBFS`; signal-to-noise ratio is at least `25 dB`.
- Music under speech is normally `12–18 dB` below narration and must not pump or mask phonemes.
- Music, ambience and SFX must have an explicit narrative function and rights lineage; placeholder tones and generic loop beds are prohibited.
- A/V start/cue alignment is at most `100 ms`; end-duration delta is at most `80 ms`.
- The final mix is auditioned on headphones, laptop, phone speaker, mono fold-down and modest background noise.

## 10. Technical master, captions and packaging

- Default archival/distribution target is 16:9 `2560×1440`, progressive, Rec.709, H.264 High Profile in MP4, with 48 kHz stereo audio. A lower resolution requires an episode-specific reason and cannot reduce mobile legibility.
- Frame rate follows the native production clock; resampling policy must be explicit and A/V durations must reconcile within one output frame.
- The complete file must pass full decode, checksum, duration, black/freeze, corruption, range-read and re-download verification.
- Captions cover all speech and meaningful non-speech audio, remain synchronized and do not collide with essential graphical text.
- Thumbnail target is 16:9 and prepared at `3840×2160`; it must remain legible at mobile size, accurately represent the episode and avoid misleading clickbait.
- Title and thumbnail are tested as one packaging promise; they are not scored independently from the opening and payoff.

## 11. Rights, policy and AI disclosure

- Every source and transformation has a versioned license/provenance record and exact parent binding.
- YouTube originality/reused-content and repetitive/mass-produced-content risk is reviewed at channel and video level.
- Realistic altered or synthetic media receives an explicit YouTube disclosure decision before upload.
- Rights PASS, policy PASS and technical PASS are separate from audience-quality PASS.
- Upload completion, processing completion and platform checks are evidence gates, not publication authority.

## 12. Required QA stack

1. **Deterministic full-file QA:** decode, hashes, frames, freeze/black, motion provenance, typography/OCR, captions, loudness, peaks and A/V timing.
2. **Factory full-video multimodal QA:** the exact complete timeline and audio, not a contact sheet, sampled poster or detached soundtrack; outputs timestamped evidence under a forced schema.
3. **Browser/device QA:** complete playback with pause/resume/seek/end, audible decoded audio, mobile/desktop frames, focus, reflow, captions and zero runtime errors.
4. **Owner perceptual authority:** the owner may confirm or reject the audience experience. A rejection is sufficient to keep release closed; the Factory must not impersonate a full-playback attestation.
5. **YouTube upload QA:** exact processed rendition, HD/1440p readiness, captions, thumbnail, title, disclosure and platform checks before any separate publish command.

## 13. Current-master disposition

The current `cfp-v1-13` master retains its valid technical, Factory contact-sheet and Browser receipts. Those receipts prove exact-byte integrity, decode/playback, audible audio, pixel change, mobile-frame capture, focus/reflow and absence of runtime errors under their original contracts.

They do not prove competitive YouTube presentation. Owner-observed evidence classifies the current master as:

```text
AUDIENCE_MASTER = DEFECT_REJECTED
P0_OUTPUT_FORM_MISMATCH = PRESENT
P1_VISUAL_RICHNESS_INSUFFICIENT = PRESENT
P1_MEANINGFUL_MOTION_DENSITY_LOW = PRESENT
P1_MOBILE_TYPOGRAPHY_WEAK = PRESENT
P1_AUDIENCE_RETENTION_RISK_HIGH = PRESENT
OWNER_FULL_PLAYBACK_ATTESTATION = NOT_INFERRED
RELEASE_AUTHORITY = FALSE
```

The artifact remains an immutable `TECHNICAL_CLEAN_CONTROL_ONLY`. It must not be cosmetically patched or promoted to an audience master.

## 14. Next implementation sequence

1. Compile the standard into versioned contracts, deterministic analyzers, defect codes and a release scorecard.
2. Design a new `60–90 second` Golden Sequence blueprint with a real hook, mixed visual treatments, layered semantic animation, mobile typography and complete audio/caption cues.
3. Qualify only the assets, rendering capabilities and provider settings required by that blueprint; reserve cost before dispatch.
4. Render the Golden Sequence from clean lineage, then run deterministic, full-video multimodal, Browser/device and owner QA in that order.
5. Iterate only at the owning stage within a bounded repair budget; never let QA patch the finished output.
6. Freeze the first Golden Sequence that scores at least 92 with every critical dimension at least 90 and zero P0/P1.
7. Only after that freeze, expand the same validated visual language into the full Video #1 master and repeat the complete release stack.

Golden r10, Stage 11, Videos 2–15, release and publication remain blocked until this sequence passes. Production V2 remains a separate project and is not touched.

## 15. Official source baseline

Retrieved 2026-08-23; revalidate before a material platform-policy change:

- YouTube recommended upload encoding settings: <https://support.google.com/youtube/answer/1722171?hl=en>
- YouTube channel monetization and original/authentic content policies: <https://support.google.com/youtube/answer/1311392?hl=en-EN>
- YouTube thumbnail guidance: <https://support.google.com/youtube/answer/72431?hl=en>
- YouTube altered or synthetic content disclosure: <https://support.google.com/youtube/answer/14328491>
- YouTube Analytics: <https://support.google.com/youtube/answer/9002587>
- YouTube captions and translated metadata: <https://support.google.com/youtube/answer/4792576>

## 16. Source checkpoint verification

```text
DOCUMENTATION_SSOT = PASS__91_MARKDOWN_FILES__LOCAL_LINKS_RESOLVE
FULL_REGRESSION = 184_OF_184_PASS
VERIFIED_BUILD = PASS
PRODUCTION_V2_LEGACY_DEPENDENCY_FIREWALL = 14_OF_14_PASS
PROVIDER_REQUESTS_THIS_DOCUMENTATION_SLICE = 0
SPEND_USD_THIS_DOCUMENTATION_SLICE = 0
```
