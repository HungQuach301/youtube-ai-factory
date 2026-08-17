# Video Production Quality Standard V2

Status: authoritative quality constitution for audience-facing video produced by the YouTube AI Factory. It supplements Documents 30–33. Where an older document hard-codes `84 shots`, a `600-second` picture clock, a universal `3.5-second` shot ceiling, artifact-count completion, or plan/metadata as perceptual proof, this document is authoritative for future eligibility and repair decisions.

Date established: 2026-08-17 (Asia/Bangkok)

## 1. Product decision

Audience-facing video is the Factory's core product. A video is not complete because records, prompts, source files, stems or hashes exist. It is complete only when the actual viewer-facing pixels and mixed audio are semantically correct, intelligible, coherent, compelling, rights-safe, technically valid and independently assured.

The active channel contract remains:

- channel: `Hidden Systems Behind Money`;
- niche: `Everyday Payment and Pricing Infrastructure`;
- market/language: United States / `en-US`;
- format: premium faceless documentary-explainer under an anonymous channel-owned brand;
- viewer promise: reveal how familiar transactions and bills route money, data, risk and incentives through hidden institutions;
- hard boundary: no personalized financial, legal, investment or credit-repair advice;
- operating mode: one video at a time, auto-publish OFF, owner/expert involvement by exception.

## 2. Standard inheritance

Every production unit inherits standards in this order:

```text
Channel Constitution
  → Content Pillar Playbook
    → Series-format Contract
      → Episode Contract
        → Beat / Shot / Audio-cue Contract
```

A descendant may add or tighten a standard. It may not weaken an ancestor's `M0` or `M1` requirement. When two active standards conflict, the higher enforcement level wins; at the same level, the more specific scope wins only when it is stricter.

## 3. Enforcement levels

| Level | Meaning | Runtime behavior | Waiver policy |
|---|---|---|---|
| `M0 — NON_NEGOTIABLE` | Truth, rights, safety, provenance or evidence invariant | stop; block downstream; reopen owning stage; preserve failure; escalate after repair limit | none |
| `M1 — RELEASE_HARD_GATE` | Universal viewer-quality requirement | fail closed; maximum two root-cause repairs; no release until pass | may be changed only by a new pre-production contract, never waived after failure |
| `M2 — CONDITIONAL_HARD_GATE` | Becomes mandatory when its route, series, claim, medium or risk trigger is active | evaluate trigger; if true, behave exactly like M1; otherwise mark `NOT_APPLICABLE` with reason | same as M1 after trigger |
| `M3 — ADAPTIVE_TARGET` | Preferred range used to optimize performance | warn; require rationale and perceptual evidence; fail only when an actual dimension or hard gate is harmed | bounded evidence-backed deviation allowed |
| `M4 — POST_PUBLISH_LEARNING` | Outcome metric available only from the real published video | never blocks pre-publish; bind actual analytics to exact master and update future target versions | not applicable |

No average score can compensate for an M0/M1/M2 failure. A target such as WPM, pitch range, music coverage or event cadence must not be promoted into a hard gate merely because it is easy to count.

## 4. Universal Channel Constitution

### 4.1 Audience promise and narrative integrity

| Standard | Level | Required evidence |
|---|---|---|
| Title, thumbnail, first 30 seconds and final payoff express the same promise | M1 | title/thumbnail contract, opening transcript, ending transcript, critic evidence |
| Central hook appears in 0–15 seconds and the viewer promise is clear by 30 seconds | M1 for the promise; M3 for exact second | full timeline and retention-contract inspection |
| Every beat changes viewer knowledge, expectation, emotion or mental model | M1 | beat map plus full-playback verification |
| Midpoint re-hook occurs within 40–60% and payoff within the final 20% unless the episode contract justifies a stricter structure | M3 | story clock and full playback |
| No generic intro, repeated exposition, summary-only ending or extended CTA | M1 | narration and playback evidence |
| Runtime is normally 480–720 seconds; the exact canonical duration comes from the approved natural narration, not a preselected picture clock | M1 | measured narration and master duration |

### 4.2 Truth, scope and safety

| Standard | Level | Required evidence |
|---|---|---|
| Every consequential claim maps to a dated primary/authoritative source or an explicit qualifier | M0 | claim-source graph and qualifier ledger |
| Narration, labels, diagrams, footage and motion express the same factual proposition | M0 | claim-to-shot-to-pixel lineage |
| No unsupported universal fee, redistribution, outcome, recovery or decision claim | M0 | contradiction/qualification review |
| No unsupported single-company accusation or intent attribution | M0 | source and inference separation |
| No personalized financial, legal, investment or credit-repair advice | M0 | script and safety audit |
| Uncertainty, jurisdiction, date and variability remain visible where material | M0/M2 | route-specific trigger and visual/narrative evidence |

### 4.3 Narration writing

The narration is written for listening, not silent reading.

| Control | Standard | Level |
|---|---|---|
| Overall speech rate | target 140–160 WPM including pauses | M3 |
| Hook/escalation | normally 150–170 WPM | M3 |
| Mechanism/terminology-dense passages | normally 125–150 WPM | M3 |
| Payoff | normally 135–155 WPM | M3 |
| Sentence length | median 10–18 words; review sentences over 24 words | M3 |
| Breath group | normally 5–12 words or 2.5–5 seconds | M3 |
| New concept density | no more than two new entities in roughly 10–15 seconds without a recap or map | M3; M1 if comprehension fails |
| Terminology | introduce `term → plain meaning → role`; maintain one canonical term per concept | M1 |
| Causal clarity | normally one principal causal step per sentence | M3; M1 if ambiguity changes meaning |
| Numbers | identify unit, scope and date; avoid multiple unrelated numbers in one sentence | M1/M3 |

Narration must include an executable performance layer: section intent, energy, pace, emphasis, pauses and pronunciation. Markup is production metadata and must never be read aloud.

### 4.4 TTS segmentation and continuity

- Generate narration in semantic paragraphs, normally 300–800 characters per request; do not use provider-maximum chunks as a quality strategy.
- Never cut a sentence, named entity, numerical comparison or causal chain between requests.
- Lock one voice ID, model, settings envelope, pronunciation dictionary and context policy.
- Each seam must pass click, breath, noise-floor, timbre, pitch and pacing continuity checks.
- Regenerate only failed sections; unchanged eligible sections remain immutable.
- Transcript/forced-alignment mismatch target is below 1%; financial terms, names and numbers require exact correspondence.

Generation segmentation and seam integrity are M1. The preferred character range is M3 unless provider evidence makes it a required conditional gate.

### 4.5 Voice identity and performance

The channel voice is neutral US English: intelligent, curious, authoritative without lecturing, warm without salesmanship, and capable of explaining complex systems without trailer-style exaggeration.

Universal M1 gates:

- one narrator identity across the complete video;
- correct pronunciation of every financial term, organization, name, number and abbreviation;
- no clipped/doubled phoneme, corrupt speech, metallic tail, breath glitch, abrupt speed change or audible chunk seam;
- no material timbre drift between sections;
- intelligible on headphones, laptop, phone speaker and mono fold-down;
- speech matches locked narration and timing lineage.

Adaptive M3 performance targets:

- most phrases use approximately 3–8 semitones of voice-relative pitch range;
- three consecutive sentences below roughly 2 semitones trigger a monotony review;
- recurrent excursions above roughly 10–12 semitones without semantic/emotional purpose trigger an exaggeration review;
- chunk-to-chunk median pitch drift above roughly 1–1.5 semitones triggers consistency review;
- micro-emphasis pause 80–200 ms, clause pause 150–300 ms, sentence pause 250–500 ms, beat reset 500–900 ms, deliberate dramatic pause normally no more than 1.2 seconds;
- emphasis may combine local pitch, duration, loudness and pause, but must not apply the same pattern to every key term.

Provider speed should normally remain around `0.95–1.08`. A value outside that range triggers an M2 take tournament. Provider extremes may not be used merely to force runtime compliance.

Before the full narration, the voice tournament must test at least: the hook, the densest mechanism passage, the authorization/clearing/settlement sequence, a number-heavy passage and the payoff.

### 4.6 Music identity and cue design

The channel's sonic identity is restrained, investigative and modern, with forward movement and clarity rather than generic corporate, trailer, villain, surveillance or cyberpunk cues. Lyrics are excluded while narration is active.

Every cue declares one function: `CURIOSITY`, `ORIENTATION`, `MECHANISM`, `ESCALATION`, `REVEAL`, `CONSEQUENCE`, `PAYOFF` or `SILENCE`.

Universal M1 gates:

- real composed/selected audio bytes with commercial rights and source lineage;
- full-timeline cue sheet and final mix placement;
- no unmodified short loop repeated as a complete soundtrack;
- no audible loop seam, abrupt tonal discontinuity or music that masks narration;
- music and silence follow narrative beats rather than arbitrary shot counts;
- no placeholder sine tone, diagnostic beep or metadata-only sound contract accepted as production music/SFX.

Adaptive M3 targets for an 8–12 minute video:

- normally 4–8 cue placements and 2–3 recurring motifs;
- a cue may run roughly 45–150 seconds when harmony, instrumentation, intensity or arrangement evolves;
- active music coverage may be approximately 65–85%, with the remainder deliberate silence/ambience;
- reference tempo bands: curiosity 85–110 BPM, explanation 70–95, escalation 90–115, consequence 65–90, payoff 70–95.

The story contract, not the percentage, decides whether a passage carries music.

### 4.7 SFX and ambience

SFX may be causal, spatial, state-changing, emphatic or environmental. Each foreground cue must bind to a visible/narrated event. Electronic payment may not be represented by literal cash/coin sounds unless the narration explicitly uses that metaphor and no factual confusion results. Generic whooshes, repeated template cues and unsupported alarm/drama are prohibited.

Meaningful non-speech sound must be represented in captions. SFX may not mask the leading or trailing phoneme of narration. These are M1 gates; preferred cue density is M3.

### 4.8 Audio mix and measurement

Measurements use an ITU-R BS.1770-compatible method. The current online distribution target is an internal contract, not a claim about a YouTube-mandated loudness target.

| Metric | Target | Level |
|---|---:|---|
| Integrated master loudness | `-14 ±1 LUFS-I` | M1 |
| Maximum true peak | `≤ -1 dBTP` | M1 |
| Loudness range | normally `4–8 LU` | M3; M1 if mobile intelligibility fails |
| Narration-to-music difference during speech | minimum about `10 LU`, target `12–16 LU` | M1 minimum / M3 target |
| Music duck | normally `6–12 dB`, attack 80–250 ms, release 300–800 ms | M3; audible pumping is M1 failure |
| Ordinary SFX ceiling | approximately `-8 dBFS` | M3; clipping/masking is M1 failure |
| Narration noise floor | normally better than `-50 dBFS` | M3; audible noise discontinuity is M1 failure |
| A/V sync | `≤120 ms` | M1 |
| Claim-specific visual onset | normally within two 30-fps frames of the relevant narration | M1 |

The final mix must be auditioned on headphones, laptop, phone speaker at practical volume, mono fold-down and a modest-noise environment.

### 4.9 Visual semantics and source routing

Every visual must explain, prove, orient or create a justified emotional state. Topic similarity, decorative motion and aesthetic polish alone do not establish semantic fit.

M0/M1 gates:

- every shot binds narration range, claim IDs, viewer-state change, visual job, entry/internal/exit states, route, required/forbidden elements, text, rights and mobile acceptance;
- `SOURCE` is used for observable reality; `MAKE` for mechanisms, diagrams, charts, maps, UI and receipts; `HYBRID` only when both evidence and authored explanation are needed;
- no generic office/card/hand footage used as filler;
- no meaningless generated image fallback;
- no arrow, connector, label, layout or animation may imply a false route, timing, amount, responsibility or causal relationship;
- actual stored pixels/video and decoded temporal evidence are required; text descriptions of entry/midpoint/exit are not motion proof;
- no debug label, shot ID, watermark, bounding box, template residue, cropped essential text or unreadable mobile label.

### 4.10 Adaptive visual pacing

`3.5 seconds` is not a universal maximum shot duration. The system distinguishes editorial shot duration, meaningful visual-event interval and near-static interval.

| Segment / visual type | Typical shot duration | Meaningful-event target | Near-static ceiling |
|---|---:|---:|---:|
| Hook 0–15 s | 1.5–4 s | 1.5–3 s | 3.5 s |
| Setup/orientation | 3–7 s | 2.5–4 s | 5 s |
| Real-world SOURCE | 3–7 s | 3–5 s | 6 s |
| HYBRID | 5–10 s | 2.5–4.5 s | 6 s |
| Explanatory diagram / MAKE | 7–15 s | 2–4 s | 5 s |
| Data visualization | 6–15 s | 2.5–5 s | 6 s |
| Consequence / emotional passage | 4–9 s | 3–6 s | 7 s |
| Payoff | 4–10 s | 3–6 s | 7 s |

The hook ceiling and route-specific pacing requirements are M2. The duration/event bands are M3. An unjustified near-static interval over seven seconds is M1. A longer diagram is eligible when its internal state changes carry meaning. Decorative zoom, pan, particles or color changes do not count as meaningful events.

Shot, asset and visual-event counts are derived outputs, never independent release gates:

```text
1 editorial shot ≠ 1 base asset ≠ 1 meaningful visual event
```

### 4.11 Text, captions and mobile legibility

- closed captions are distinct from graphical labels;
- captions transcribe speech and meaningful non-speech audio and remain synchronized;
- essential graphical text at 1920×1080 is normally at least 38 px; secondary labels normally at least 32–34 px; headlines normally at least 52 px;
- essential content remains within at least a 5% safe margin;
- normal text contrast target is at least 4.5:1;
- diagram labels normally contain 2–5 words; headlines normally 6–10 words and no more than two lines;
- mobile QA is performed on the real render at 25% scale and representative phone viewports.

Caption completeness, timing, cropped text and mobile readability are M1. Numeric typography targets are M3 unless the actual render is unreadable.

### 4.12 Technical master, rights and release

Universal M0/M1 controls:

- 16:9, 1920×1080, 30 fps progressive, Rec.709, 48 kHz distribution audio;
- video and audio duration reconcile within ±1 frame of the canonical timeline;
- complete source, transformation, rights, provider, cost and checksum lineage;
- realistic altered/synthetic media receives a documented YouTube disclosure decision;
- master and archive bytes read back and reconcile;
- all upstream stages eligible, active provider requests zero, open exceptions zero;
- auto-publish remains OFF; owner-ready is separate from publish authority.

### 4.13 Video Excellence release floors

| Dimension | Release floor |
|---|---:|
| Factual safety | 94 |
| Semantic narration–visual alignment | 94 |
| Voice intelligibility and consistency | 94 |
| Story and payoff | 90 |
| Visual direction | 90 |
| Music and sound design | 90 |
| Retention design | 90 |
| Mobile legibility | 90 |
| Overall | 92 |
| P0 defects | 0 |
| Critical P1 defects | 0 |

Only actual audience-facing audio, pixels and master playback may satisfy these floors. Provider completion, record counts, plans, prompts, URLs, declared state transitions or hard-coded scores do not constitute perceptual evidence.

## 5. Content Pillar Playbooks

### 5.1 Pillar 1 — Everyday Transaction Tollbooths

Series: `Follow the Fee`, `The Rails Under It`.

Conditional M2 gates when this pillar is active:

- begin with a concrete transaction or payment action;
- identify merchant, processor, acquirer, network, issuer and consumer roles where applicable;
- separate authorization, clearing, settlement, dispute/reversal and failure states;
- visually distinguish data/message, money, fee and risk/liability flows;
- qualify fee amounts, scope, date, variation and recipient;
- do not assert a universal source or redistribution amount for rewards;
- include at least one material exception/failure path;
- maintain one institutional map, actor identity and flow legend across the episode.

Voice is precise with forward motion and slows at dense actor/stage passages. Music may use a restrained transaction pulse. SFX may mark ledger/state/data changes but may not imply physical cash movement.

### 5.2 Pillar 2 — Invisible Price Architecture

Series: `Receipt X-Ray`, `Default by Design`.

Conditional M2 gates:

- separate advertised/base price, mandatory fee, optional add-on, tax and final amount;
- show the exact chronology by which the price changes;
- reconcile all displayed line items and totals;
- distinguish documented personalization/default mechanics from inference;
- do not infer malicious intent from friction evidence alone;
- include conditions/counterexamples where the mechanism does not apply;
- label illustrative UI reconstruction and bind real interfaces to dated evidence.

Voice is investigative, not outraged. Music may carry subtle tension/reveal but must avoid villain framing.

### 5.3 Pillar 3 — Risk and Reputation Machines

Series: `Who Decides?`, `The Dispute Machine`.

Conditional M2 gates:

- separate data furnishing, identity matching, scoring/modeling, institutional decision and action;
- do not equate a score/model output with a final decision;
- do not convert correlation into causation;
- show uncertainty, missing data, dispute state, date and jurisdiction;
- do not claim proprietary model internals without authoritative evidence;
- enforce privacy and sensitive-data controls;
- exclude individualized credit-repair or dispute advice.

Voice is calm, careful and non-accusatory. Music is restrained and analytical; thriller/surveillance framing is prohibited without evidence-backed narrative purpose.

### 5.4 Pillar 4 — Defaults, Friction and Forgotten Value

Series: `Vanishing Balance`, `Household Infrastructure`.

Conditional M2 gates:

- reconstruct the timeline from the initial state through dormancy/default/transfer/recovery;
- distinguish custody, ownership, liability and responsibility at every handoff;
- show deadlines, jurisdiction and recovery limits;
- never promise recovery or compress a multi-year process into a false simple path;
- avoid sensational victim framing in place of mechanism;
- show branches, dead ends and conditions rather than a single deterministic outcome.

Voice is patient and empathetic without becoming sentimental. Music is wider and less dense, with deliberate time/state motifs rather than continuous alarm.

## 6. Series-format overlays

| Series | Additional M2 contract |
|---|---|
| Follow the Fee | fee chain, actor net position, ranges/qualifiers and transaction reconciliation |
| The Rails Under It | technical layers, message-versus-money timing and failure path |
| Receipt X-Ray | line-item arithmetic and base-to-final-price reconciliation |
| Default by Design | UI/state sequence, default-versus-choice distinction and no unsupported intent |
| Who Decides? | input, matching, model, decision, action and uncertainty |
| The Dispute Machine | procedural timeline, evidence movement and provisional-versus-final outcome |
| Vanishing Balance | custody, liability, dormancy, transfer and recovery boundary |
| Household Infrastructure | cross-system map, long-horizon interactions and regional/plan scope |

## 7. Standard Registry contract

Every executable standard must be stored once with:

| Field | Purpose |
|---|---|
| `standardId` | stable identity |
| `scope` | CHANNEL / PILLAR / SERIES / EPISODE / BEAT / SHOT / CUE |
| `enforcementLevel` | M0–M4 |
| `trigger` | explicit condition; always true for universal standards |
| `metric` | what is measured or adjudicated |
| `thresholdOrRange` | hard threshold or adaptive range |
| `evidenceRequired` | source, audio, waveform, pixels, motion, master, analytics |
| `owningStage` | stage responsible for construction and repair |
| `failureAction` | STOP / REOPEN / REPAIR / WARN / LEARN |
| `waiverPolicy` | NONE or PRE_PRODUCTION_VERSION_ONLY |
| `version` | immutable active standard version |

Hard-coded count/status strings outside the Registry may not create release authority.

## 8. Video #1 application and current evidence gap

Video #1 inherits:

```text
Hidden Systems Behind Money
  → Everyday Transaction Tollbooths
    → Follow the Fee
      → What Really Happens to a $100 Card Purchase?
```

The canonical approved narration currently measures `704.446958` seconds. The Stage 08 revision records exactly 84 shot contracts over `0–600` seconds. It cannot provide complete timeline coverage and is not eligible for Stage 11 under this standard. `84` may remain an immutable historical revision and an inventory count; it is not the required future editorial-shot count.

The following production evidence is preserved but not Video Excellence eligible:

- Stage 09 `three-frame motion proof` records text descriptions of entry/midpoint/exit rather than decoded rendered temporal pixels;
- Stage 10 narration uses provider speed `1.2` and must pass a real perceptual voice audit rather than duration-only acceptance;
- Stage 10 narration is generated in very large chunks and lacks the section-level seam/prosody proof required above;
- the 30-second music bed is generated from simple 110/165 Hz sine components and the 10-second SFX stem is a synthetic periodic beep family; these are placeholders, not production music/sound design;
- Stage 10 quality values are declared in artifact metadata and are not derived from independent listening evaluation;
- a stem list and mix contract do not prove a full-duration audience mix.

The D1 stage history remains immutable: Stage 09 and Stage 10 were control-state `FROZEN` under the prior contract. This document does not rewrite that history. It creates a new eligibility conclusion: Stage 11 must remain operationally paused until an authorized root-cause repair supersedes the affected revisions and satisfies V2 evidence.

## 9. Required next implementation plan

1. Implement the versioned Standard Registry and inheritance/trigger resolver.
2. Add the Video Excellence eligibility projection; distinguish `controlState` from `qualityEligibility` and `nextValidAction`.
3. Repair the operational UI so all status, evidence and next actions come from one canonical projection.
4. Build narration/voice evaluation: WPM, forced alignment, pronunciation, pause, pitch/prosody, seam, corruption, intelligibility and multi-device audit.
5. Build real music/SFX production and full-timeline cue/mix evidence; prohibit placeholder waveform eligibility.
6. Replace text-only motion proof with decoded ENTRY/MIDPOINT/EXIT pixels/video and exact semantic timing.
7. Recompile Stage 08 adaptively from the `704.446958`-second narration; derive shots, events and assets rather than fixing counts.
8. Produce and independently audit a 60–90 second golden sequence containing the hardest institutional-chain passage.
9. Only after the golden sequence passes, authorize bounded full-video repair for the exact affected stages.
10. Start Stage 11 only when the complete current lineage is `VIDEO_EXCELLENCE_ELIGIBLE`.

Provider dispatch, production mutation, database migration, Stage reopen and deployment each require their own existing authority boundary. This document authorizes none of them.

## 10. Production execution addendum — 2026-08-17

Steps 1–8 above were executed under a separately approved bounded production plan. The Standard Registry, M0–M4 resolver, truthful projection/UI, Stage 11 release block, audio evaluators, real PNG evidence and adaptive Stage 08 compiler are deployed. Stage 08 now contains 98 derived shots covering `0–704.4469583333333` seconds with zero gaps and zero overlaps.

The golden sequence did not pass. Revision 2 has 45 real temporal PNG frames and a deterministic audio assessment of PASS, but its 64.594333-second audience mix does not reconcile with its 85.330543-second manifest. Independent audit scored 46/100 with five P1 findings, including generic/repeated pixels, audience-visible production instructions, missing `Follow the Fee` semantics and insufficient audiovisual synchronization evidence.

Document 35 is authoritative for exact measurements, scores, costs and the revision 3 root-cause repair contract. Current release state remains:

```text
GOLDEN_SEQUENCE = REPAIR_REQUIRED
VIDEO_QUALITY_ELIGIBILITY = BLOCKED_VIDEO_STANDARD_V2
STAGE_11 = BLOCKED
PROVIDER_REQUESTS = 40_OF_40_AUTHORIZED
```

## 11. Golden PASS addendum — 2026-08-17

The repair loop completed under separately approved request ceilings while retaining the original score floors. Golden revision 8 passes deterministic and independent gates:

```text
GOLDEN_REVISION = 8
GOLDEN_DURATION_SECONDS = 80.24458333333334
GOLDEN_TEMPORAL_FRAMES = 33_REAL_PNG
GOLDEN_AUDIO = PASS
GOLDEN_INDEPENDENT_AUDIT = PASS_94
GOLDEN_P0_P1 = 0_0
```

The passing visual system contains shot-specific gross/net, merchant-deduction, fee-ledger, Square, Stripe and covered-debit programs. ENTRY/MIDPOINT/EXIT evidence uses renderer-versioned immutable keys; audience text is structurally isolated from production instructions. Narration, music, SFX and audience mix share the exact TTS-reconciled timeline. Current-revision cue bindings and stored transcript bytes are checksum verified.

Golden PASS closes step 8 of the implementation plan. It does not authorize Stage 11 for the full video. The full `704.4469583333333`-second lineage still lacks five required standards: M0 safety scope, M1 rights lineage, M2 hook pacing, M2 exception-path coverage and M2 episode-wide `$100 card` evidence. Stage 11 remains `BLOCKED_UPSTREAM` until all five pass.

## 12. Encoded master amendment — 2026-08-17

The addendum above is superseded for playback eligibility. PNG temporal evidence and a separate WAV mix are components, not an audience video. The generic `GOLDEN_MASTER_V1` contract now requires an immutable render job, verified source checksums, one encoded WebM master, storage read-back, byte checksum, HTTP Range support, ffprobe metadata, full decoded frame count, black/freeze scan, 33 unique semantic samples extracted from the encoded output, three decoded contact sheets and A/V duration agreement within one frame.

Independent model review is deliberately non-final. It can only produce `AUDIT_PASS_PLAYBACK_REQUIRED`. A separate human playback gate owns the final transition to `PASS`; failed observations create findings and keep the control plane blocked. These requirements apply by contract to every future render, rather than being a one-off repair for the current video.
