# Video Production Quality Standard V3

**State:** `ACTIVE_NORMATIVE__IMPLEMENTATION_REQUIRED`
**Policy:** `VIDEO_PRODUCTION_QUALITY_STANDARD_V3`
**Effective:** 2026-08-24
**Supersedes for new production:** `34_VIDEO_PRODUCTION_QUALITY_STANDARD_V2.md`

V2 remains immutable historical evidence. V3 is the active standard for new canaries and masters; it does not retroactively convert any prior result.

## Acceptance rule

A master is audience-acceptable only when all mandatory dimensions pass on the exact Production artifact. Overall score at least 92 is necessary but not sufficient. Every active critical dimension must meet its inherited Standard Registry floor and never fall below 90. P0 and P1 must be zero. P2 may not exceed the active channel/format ceiling. Missing evidence fails closed.

## Mandatory quality dimensions

| Dimension | Minimum outcome |
|---|---|
| Market and language | English `en-US`, US-context fit and no Vietnamese audience text |
| Promise and factual integrity | Title promise completed; claims sourced/qualified; data exact |
| Narrative and comprehension | Clear hook, causal progression, closed loops and final takeaway |
| Visual semantic fit | Every shot performs its contract; no generic or misleading media |
| Visual richness and authenticity | Documentary reality, mechanisms and proof are coherently mixed |
| Temporal and motion quality | Meaningful state progression; no excessive hold or camera-only motion |
| Phase distinction | Different causal phases use structurally appropriate mechanisms |
| Mobile legibility | Critical labels readable at target mobile viewport; progressive disclosure |
| Voice and pronunciation | One stable narrator, natural en-US delivery and correct terminology |
| Audio mix | Full-duration voice/music/SFX balance, no seam/click/clip, correct loudness |
| A/V integration | Visual onset, emphasis, transition and payoff align to exact audio |
| Rights and provenance | Every production byte has eligible rights and complete lineage |
| Accessibility | Contrast, non-color-only distinction, captions and readable focus order |
| Technical master | Decode, duration, resolution, frame rate, sync, no corruption/freeze/black defect |
| Cost and runtime integrity | Reserved/reconciled cost, zero active request, idempotent/fenced execution |
| Browser playback | Exact master plays fully and supports required interaction/reflow evidence |

## Severity

- `P0`: unsafe, materially false, rights-invalid, exact-artifact mismatch, unreleasable output form or other catastrophic defect.
- `P1`: major audience or promise failure requiring root revision; cannot be accepted.
- `P2`: bounded quality issue that does not break a critical dimension and remains within the active ceiling.
- `P3`: cosmetic observation without acceptance impact; tracked for learning, not used to hide a pattern.

Repeated P2 of the same root cause may be promoted to P1 by the active rubric.

## Visual and motion controls

- Critical narration clauses have visible evidence, not decorative imagery.
- Reality anchors, mechanisms and quantitative/geographic/temporal proof connect semantically.
- Authorization, clearing, settlement and exceptions are visually distinct.
- Charts/maps/ledgers use verified data, units, dates and conservation rules.
- Future state is not visible before activation.
- Entry, internal and exit states are materially distinct where the Shot Contract requires change.
- Repeated-layout fingerprints and slide grammar are measured before master.
- A static contact sheet cannot prove temporal quality.
- Typography is mobile-safe, high contrast and subordinate to the visual mechanism.

## Audio controls

- Exact full mix, not transcript alone, is evaluated.
- One narrator identity and frozen Channel voice settings.
- Pronunciation dictionary, pacing, pauses, pitch, prosody and emphasis are within the active contract.
- Seam, click, clip, corruption, abrupt timbre or volume change are absent.
- Music and SFX have explicit narrative functions, correct loudness/ducking and commercial rights.
- Silence is intentional and not automatically filled.

## Production workflow gates

| Gate | Definition of Ready | Exit evidence |
|---|---|---|
| Claim/Evidence | Current audience and sources | Claim graph, contradiction/unknown ledger |
| Script | Critical claims supported | Locked narration, terminology and timing |
| Video Blueprint | Script and Channel Visual DNA frozen | Sequence/treatment/data/rights/cost/acceptance plan |
| Shot Contracts | Canonical duration available | Full timeline coverage and executable assertions |
| Asset eligibility | Qualified routes available | Exact bytes, rights, provenance, tournament winner |
| Animatic | Shot contracts complete | End-to-end semantic coverage and timing |
| Integrated canary | Hardest sequence chosen | Combined visual/motion/audio PASS |
| Exact master | Frozen inputs and zero active request | Hash, lineage, technical and cost evidence |
| AI assurance | Exact master available | L0-L7 receipts and authoritative outcome |
| Release | Assurance and owner/qualified-AI authority | Release receipt bound to exact hash |
| Publication | Release-ready artifact | Separate schedule/channel/publication command |

## First-pass quality and repair

Quality is built into the owning stage through typed assertions, qualification and producer self-check. Independent assurance never repairs output. A proved failure routes to one root owner and creates at most one append-only revision under the current repair authority. Repeating unchanged generation or weakening a threshold is prohibited.

## AI assurance transition

Until the AI Assurance capability passes qualification, its PASS is advisory and the owner-full-playback gate remains. Qualification may transition the channel through `AI_SHADOW`, `AI_PRIMARY_HUMAN_SAMPLE`, `AI_AUTONOMOUS_EXCEPTION_ONLY` and finally `FULL_AUTOPILOT_RELEASE_READY`. Auto-publish is never implied.

## Accessibility and localization

- Use WCAG-compatible contrast targets and do not encode role/state by color alone.
- Captions, critical type and controls must survive mobile viewport and zoom/reflow checks.
- Audience content is English `en-US`; operator localization is separately versioned.
- Units, currency, date, terminology and pronunciation must match the US audience contract.

## Cross-cutting controls

Secrets never enter Git, prompts, logs or UI. Provider/model/rubric drift makes qualification stale. Data retention, disaster recovery, incident containment and rollback preserve immutable evidence. Performance learning requires sufficient multi-video evidence and an authorized version promotion.

## R22 application

R22 is the first V3 canary. It must pass phase distinction, completed settlement payoff, mobile labels, future-state suppression, hybrid reality/mechanism/proof integration and exact-artifact L0-L7 assurance. R21 remains immutable visual FAIL/audio PASS evidence and cannot be rescored under V3 to gain authority.
