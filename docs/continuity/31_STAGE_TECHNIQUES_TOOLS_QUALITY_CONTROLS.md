# Stage Techniques, Tools, and Quality Controls

Status: authoritative stage-technique and tool specification for the `V7_V23_4_V281` sequential production contract. Document 34 supersedes its audience-facing quality thresholds where the two conflict. Document 37 is authoritative for first-pass capability qualification, production preflight and the independent-assurance failure policy. Stage 00–10 remain control-state frozen for video #1; Stage 11 is state-ready but quality-ineligible and operationally paused.

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
- **Partial:** Google Drive archive handoff, renderer/compositor, FFmpeg/ffprobe execution in the new sequential namespace, media candidate tournament, automated timeline evaluators, voice/prosody evaluation and full-duration audio mixing.
- **Required next:** Standard Registry and inheritance/trigger resolver; canonical control-state plus quality-eligibility projection; real temporal-pixel motion proof; perceptual voice and production music/SFX gates; adaptive narration-duration shot compilation; golden-sequence assurance. Stage 11–16 remain downstream work after these gates.

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
| 07A — Voice and sound design | Cast one narrator identity; run bounded take comparisons over the hardest passages; define pronunciation, prosody, pacing, music, ambience, SFX, silence and route-specific sonic rules. | ElevenLabs; forced alignment/ASR; pitch/pause/seam analysis; FFmpeg audio analysis. **Partial.** | One narrator identity; exact pronunciation; no corrupt speech or seam; performance contract and real take-tournament audio; route-specific music/SFX functions. Document 34 M0–M3 controls apply. |
| 07B — Visual grammar and asset strategy | Define visual grammar and per-scene SOURCE / MAKE / HYBRID strategy; run provider and style tournaments within rights and budget limits. | Pexels, Pixabay, Shutterstock, OpenAI image generation, asset registry, OpenAI vision analysis. **Partial.** | Rights path exists before use; no generic AI-image fallback; visual system is coherent; duplicate target ≤2%; provider/style champion and prohibited patterns are frozen. |
| 08 — Script-to-shot compilation | Compile the exact approved narration duration into typed scene programs and adaptive shot/event contracts with entry, internal events and exit states. | Standard resolver, deterministic compiler, JSON schema validation, D1 shot-contract registry. **Repair required for video #1.** | Exact 0–canonical-duration coverage; no fixed shot/asset count; every narration clause maps to a visual job, route, required/prohibited evidence and timing. Document 34 pacing ranges are M2/M3, not a universal 3.5-second shot gate. |
| 09 — Visual asset and motion production | Source/generate assets, store bytes, decode pixels and render temporal states; bind only semantically/rights-eligible candidates. | Approved stock/generation providers, renderer, FFmpeg/ffprobe, R2/Drive, independent vision audit. **Quality repair required.** | Actual ENTRY/MIDPOINT/EXIT pixels or video, distinct temporal hashes, exact semantic onset, rights lineage and route-specific visual grammar. Text descriptions of temporal states are not proof. |
| 10 — Voice, music, SFX and mix production | Synthesize section-bounded narration; evaluate performance; create production music/SFX/ambience; build and measure the full-duration audience mix. | ElevenLabs, forced alignment/ASR, pitch/pause/seam analysis, production audio providers/tools, BS.1770-compatible measurement, FFmpeg, R2. **Quality repair required.** | Natural voice, correct pronunciation, no seam/corruption, real production music/SFX, cue sheet, full-duration mix, `-14 ±1 LUFS-I`, true peak `≤-1 dBTP`, rights and read-back. Placeholder waveforms and hard-coded scores are ineligible. |
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

The Stage Contract Registry, typed commands, receipts, lease handling, cost/rights plans and storage/read-back controls are live. Video #1 Stage 00–10 are historically frozen and Stage 11 is state-ready. Document 34 establishes that the current lineage is not Video Excellence eligible, so state readiness cannot authorize Stage 11.

The remaining order is:

1. **Standard and projection repair:** implement Document 34 Registry, M0–M4 resolver, quality eligibility and truthful operational UI.
2. **Evidence gate repair:** add real voice/prosody, music/SFX/mix and decoded temporal-pixel proof.
3. **Adaptive recompilation:** supersede the 600-second/84-shot Stage 08 revision with exact `704.446958`-second coverage; add/replace only required Stage 09/10 outputs.
4. **Golden sequence:** render and independently audit the hardest 60–90 seconds before authorizing full-video repair.
5. **Stage 11–15:** edit/mix, pre-master QA, immutable master, independent assurance and owner-ready only from a fully eligible lineage.
6. **Stage 16:** ingest actual YouTube Analytics only after separately authorized publication.
7. **Sequential scale-out:** video #2 remains locked until video #1 is `OWNER_READY`; no parallel production.

The revised delivery slices are recorded in Document 33; the governing quality contract is Document 34.
