# Stage Techniques, Tools, and Quality Controls

Status: authoritative implementation and control specification for the `V7_V23_4_V281` sequential production contract. Stage 00–10 are implemented and frozen for video #1; Stage 11 is ready and Stage 12–16 remain blocked upstream.

## Product and language decisions

- The operator UI remains English-only for the current implementation. Vietnamese translation is intentionally removed from the current scope.
- Multilingual UI is deferred until a separate localization contract defines message keys, fallback language, translation ownership, formatting, and regression coverage.
- The target video remains English (`en-US`) for a US audience, long-form 16:9 faceless explainer/documentary, with quality prioritized over throughput.
- One video may produce or spend at a time. Videos 2–15 remain blocked until the preceding video is `OWNER_READY`.
- Automatic YouTube publishing remains OFF and publishing stays a separately authorized action.

## Controls applied to every stage

1. **Locked inputs:** every input records its artifact ID, revision, parent lineage, policy/gate version, and SHA-256 checksum.
2. **Bounded execution:** jobs have an idempotency identity, exclusive lease, timeout, checkpoint, retry ceiling, cost ceiling, and emergency stop.
3. **Unique provider requests:** every external request has a unique request ID. Blind retries and unchanged batch reruns are forbidden.
4. **Real-output proof:** a URL, prompt, plan, provider acknowledgement, or database row is not a media output. Eligible media requires stored bytes, successful decode/read-back, and evidence from the actual bytes.
5. **Separated storage authority:** D1 owns operational state and eligibility, R2 owns runtime bytes, and Google Drive owns the durable user archive. No layer silently substitutes for another.
6. **Integrity:** checksums are recorded before and after transfer, transform, render, and archive handoff.
7. **Rights and provenance:** source, license/usage rights, provider response, transformation history, and production binding are required before downstream use.
8. **Quality floors:** overall score ≥92, every critical critic ≥90, every dimension ≥86, P0=0, and unresolved material P1=0. An average cannot compensate for a hard-gate failure.
9. **Root-cause repair:** at most two repair loops under the active contract. Repair reopens the owning stage, creates a new immutable revision, and preserves failed artifacts and critic evidence.
10. **Legacy firewall:** prior masters, media, bindings, hashes, stale designs, and QA PASS decisions remain audit-only and cannot enter candidate search, rendering, rescoring, or release.

## Tool availability legend

- **Available:** integration or runtime foundation exists in the current system.
- **Partial:** capability exists, but is not yet bound end-to-end to the new sequential stage state machine.
- **Required:** part of the approved design but not yet implemented as a production-ready sequential runtime.

Current inventory:

- **Available and bound:** Cloudflare D1/R2; the 18-stage registry; eligibility engine; all five typed commands; immutable command receipts; exclusive leases; OpenAI Stage 01–08 compiler; approved cost/rights plans; Pexels/Pixabay acquisition; deterministic channel-owned SVG construction; ElevenLabs synthesis; provider/cost ledger; SHA-256/read-back proof; legacy dependency firewall.
- **Partial:** Google Drive archive handoff, renderer/compositor, FFmpeg/ffprobe execution in the new sequential namespace, media candidate tournament, and automated timeline evaluators.
- **Required next:** Stage 11–13 clean edit, pre-master verification and immutable master runtime; Stage 14 V281 eight-critic assurance; Stage 15 owner-ready command; Stage 16 YouTube Analytics learning ingestion.

## Detailed 18-stage production specification

| Stage | Required technique and process | Tools | Control standard and required evidence |
|---|---|---|---|
| 00 — Production authority and lineage | Compile the active business facts into a video-specific production policy; lock the exclusive lease, lineage, budget, provider ceilings, and stop/resume state. | D1 Control Plane, policy compiler, SHA-256, cost ledger. **Partial** until typed sequential commands exist. | Exactly one active queue item; source brief/version/hash locked; auto-dispatch and auto-publish OFF; active provider requests = 0; policy, canonical brief hash, and exclusive lease stored before progression. |
| 01 — Market, audience, and topic intelligence | Synthesize the active audience definition, audience job-to-be-done, demand context, topic promise, and competitive bar for this episode. Do not import old research as current evidence. | OpenAI reasoning and structured extraction; approved search/retrieval adapter; D1 evidence registry. **Partial.** | Every material audience or market assertion is evidence-backed or explicitly qualified; output is episode-specific, versioned, and linked to the canonical brief. |
| 02 — Reference analysis | Build a current reference set; analyze parity, gaps, strengths, weaknesses, and anti-copy constraints. | Reference ingestion, YouTube Data/search target, OpenAI text/vision analysis. **Partial.** | Every reference has provenance and access date; parity/gap matrix is symmetric; differentiators are explicit; imitation of protected expression is prohibited. |
| 03 — Truth research and claim mapping | Retrieve primary sources where possible; build a claim-to-source graph, qualifier ledger, contradiction ledger, and unsupported-claim list. | OpenAI structured extraction; search/retrieval adapter; D1 source and claim registry. **Partial.** | 100% of factual claims map to a source or explicit qualifier; unresolved contradictions and unsupported critical claims block script lock. |
| 04 — Creative route selection | Generate four materially distinct creative routes; run a seven-critic tournament; freeze one champion with reasons and rejected-route evidence. | OpenAI ideation and structured critic calls; deterministic score and decision schema. **Partial.** | Four distinct routes; all challengers viable; champion score ≥92; no single-model self-approval; decision, critic evidence, and frozen champion persisted. |
| 05 — Story architecture | Create the story clock, retention spine, curiosity loops, escalation, payoff map, and claim-to-beat map. | OpenAI story design; deterministic duration/beat checks. **Partial.** | Every beat changes viewer knowledge, expectation, emotion, or decision state; every payoff closes a planted loop; no unsupported claim enters the narrative spine. |
| 06 — Script creation and lock | Write a claim-bound script; enforce terminology; calculate narration timing; run script critics; freeze narration text. | OpenAI writing/critics, claim checker, terminology ledger, deterministic word/time calculator. **Partial.** | 100% claim traceability; target 8–12 minute duration; `en-US`; terminology consistent; no unresolved critical critic defect; locked narration checksum recorded. |
| 07A — Voice and sound design | Cast one narrator identity; run bounded take comparisons; define pronunciation, prosody, pacing, music, ambience, SFX, and silence rules. | ElevenLabs; OpenAI TTS fallback only when explicitly eligible; FFmpeg audio analysis. **Partial.** | One narrator identity across the video; no mixed voices; pronunciation and pacing approved; soundscape contract and take-tournament evidence frozen before full synthesis. |
| 07B — Visual grammar and asset strategy | Define visual grammar and per-scene SOURCE / MAKE / HYBRID strategy; run provider and style tournaments within rights and budget limits. | Pexels, Pixabay, Shutterstock, OpenAI image generation, asset registry, OpenAI vision analysis. **Partial.** | Rights path exists before use; no generic AI-image fallback; visual system is coherent; duplicate target ≤2%; provider/style champion and prohibited patterns are frozen. |
| 08 — Script-to-shot compilation | Compile locked narration into typed scene programs and shot contracts with entry, midpoint, and exit states. | Deterministic compiler, JSON schema validation, D1 shot-contract registry. **Required** for the new sequential namespace. | Every narration clause maps to a shot job, route, duration, required/prohibited evidence, and exact narration range; schema validation and narration checksum match are hard gates. |
| 09 — Visual asset production | Source or generate real assets; store bytes; decode and inspect pixels; prove motion through entry–midpoint–exit states; bind only eligible candidates. | Approved stock/generation providers, FFmpeg/ffprobe, media executor, R2/Drive, OpenAI vision. **Partial.** | Actual bytes and decode proof required; rights and lineage complete; three distinct temporal-frame hashes for motion; source QA overall ≥90 and every dimension ≥86; maximum three bounded candidates per job; no blind retry. |
| 10 — Voice, music, and SFX production | Synthesize the locked narration; create music/SFX/ambience stems; perform measured waveform analysis and timing validation. | ElevenLabs under the frozen commercial route; deterministic PCM/WAV writer; waveform measurement; R2 read-back. **Implemented.** | One locked voice; narration duration 480–720 s; provider-native 24 kHz mono PCM is retained as the Stage 10 mezzanine; measured peak/RMS/silence and SHA-256 are required. Stage 11 must mix/resample at 48 kHz and Stage 13 must deliver 48 kHz distribution audio. |
| 11 — Picture edit and audio composition | Compose the typed scene program; make every cut, motion, layer, and sound perform a narrative job; lock picture and clean audience render. | Custom renderer/compositor plus FFmpeg. **Partial.** | No unjustified static section over 7 seconds; captions target ≤5 words per display unit; no debug/template residue; duplicate visual content ≤2%; exact narration-to-scene constraints pass. |
| 12 — Pre-master timeline verification | Inspect the entire timeline, mobile presentation, technical defects, safe zones, captions, and A/V sync before rendering the master. | FFmpeg/ffprobe including black, freeze, silence, clipping, and stream probes; deterministic timeline QA. **Partial.** | Zero black/drop/freeze/clipping defects; A/V sync ≤120 ms; mobile-legibility review at 25% scale; safe zones and full-timeline scan pass; failures return to the owning stage. |
| 13 — Immutable master render | Render the frame-aligned distribution master; probe it; read it back from runtime and archive storage; reconcile checksums. | FFmpeg/ffprobe, R2, Google Drive archive, SHA-256. **Partial.** | Locked profile: 1920×1080, 30 fps, Rec.709, 48 kHz audio; duration within ±1 frame of contract; source/render/R2/archive checksums reconcile; master revision is immutable. |
| 14 — Independent full-video assurance | Watch the complete master; inspect three temporal samples per editorial shot; run eight independent critics and deterministic technical checks. | OpenAI text/vision/audio evaluators plus FFmpeg/ffprobe and deterministic measurement. **Required** as a unified V281 runtime. | Every critic ≥90; overall ≥92; every dimension ≥86; P0=0 and material P1=0; all critics evaluate the same master checksum; critic calls are independent and cannot see one another's result before adjudication. |
| 15 — Owner-ready release gate | Reconcile evidence, rights, costs, checksums, upstream frozen states, and critic results; create a signed owner-ready assessment without publishing. | D1 audit/evidence ledger; SIWC-authenticated typed owner-ready command. **Required.** | All upstream stages FROZEN; active provider requests = 0; open exceptions = 0; no failed hard gate; owner-ready decision is append-only, identity-bound, and separate from publication authority. |
| 16 — Post-publish learning handoff | After a separately authorized publication, ingest real performance data and bind it to the published master, strategy, and learning contract. | YouTube Data/Analytics target plus D1 learning registry. **Required.** | Only metrics from the valid published video; exact master and strategy versions bound; no simulated data; learning may recommend but cannot silently mutate strategy or production policy. |

## SOURCE / MAKE / HYBRID routing

- **SOURCE:** use rights-cleared real footage or images when documentary truth, real place/object identity, or factual evidence matters.
- **MAKE:** generate or construct visuals when explanation, abstraction, diagrammatic clarity, or unavailable footage makes creation superior.
- **HYBRID:** combine sourced evidence with designed overlays, motion, or generated explanatory components while preserving source provenance.
- Route selection is made in Stage 07B and made executable in Stage 08. Stage 09 may not silently switch routes. A route change reopens the owning design stage and creates a new revision.

## Eight-critic release panel

The Stage 14 panel consists of Executive Producer, Story and Retention, Visual Direction, Semantic Alignment, Audio Direction, Audience Simulation, Competitive Editor, and Truth/Brand Safety. Each critic receives the same immutable master identity but evaluates independently. The adjudicator may aggregate only after every result is stored. A failed hard gate routes repair to the stage that owns the defect, not to QA as a generic repair department.

## Implementation truth and next delivery plan

The Stage Contract Registry, eligibility engine, typed commands, command receipts, lease handling, cost/rights plans, OpenAI compilation, real-media acquisition/construction and audio synthesis are live in the new sequential namespace. Video #1 Stage 00–10 are frozen; Stage 11 is ready. The Stage 00 zero-spend proof, video-02 lock, legacy firewall, failed-attempt retention and Stage 10 root-cause repair have all been exercised against production state.

The remaining order is:

1. **Stage 11 — edit and mix:** create a deterministic 600-second edit decision list, compose all 84 shot programs, resample/mix audio at 48 kHz, run duplicate/static/debug-residue controls, and store a clean audience render.
2. **Stage 12 — pre-master verification:** run full-timeline black/freeze/silence/clipping, mobile-legibility, safe-zone, caption and A/V-sync checks; route failures to their root stage.
3. **Stage 13 — immutable master:** render 1920×1080/30 fps/Rec.709 with 48 kHz audio; read back R2 and archive copies; reconcile exact checksums.
4. **Stage 14 — independent assurance:** perform uninterrupted full playback, three temporal samples per editorial shot, eight independent critics and fail-closed score adjudication.
5. **Stage 15 — owner-ready:** reconcile rights, cost, checksums, frozen stages and critic evidence through an identity-bound command. Publishing remains separate and OFF.
6. **Stage 16 — learning:** only after separately authorized publication, bind actual YouTube Analytics to the exact master and strategy versions.
7. **Sequential scale-out:** video #2 unlocks only after video #1 is `OWNER_READY`; no parallel production.

The detailed delivery slices and acceptance evidence are recorded in Document 33.
