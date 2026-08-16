# Stage Techniques, Tools, and Quality Controls

Status: authoritative implementation specification for the `V7_V23_4_V281` sequential production contract. It records the required production method; it does not claim that the new video-01 artifacts have already been produced.

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

- **Available:** Cloudflare D1 and R2, Google Drive archive path, OpenAI model adapters, ElevenLabs, Pexels, Pixabay, Shutterstock, FFmpeg/ffprobe media executor, provider/cost ledgers, queue contracts, and the legacy dependency firewall.
- **Partial:** stage-specific routes, renderer/compositor, media candidate tournament, and automated evaluators.
- **Required:** executable Stage Contract Registry, typed sequential commands and eligibility engine, the full V281 eight-critic runtime, and YouTube Analytics learning ingestion.

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
| 10 — Voice, music, and SFX production | Synthesize the locked narration; create music/SFX/ambience stems; perform measured mix and timing alignment. | ElevenLabs/OpenAI TTS under the frozen route; FFmpeg and `ebur128`; waveform analysis. **Partial.** | One voice; 48 kHz audio; integrated loudness target −14 LUFS; true peak ≤−1 dBTP; A/V alignment ≤120 ms; stems, waveform evidence, and measured mix stored. |
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

The migration, read-only contract/projection, owner UI, historical quarantine, and quality/data policy are implemented. The new sequential execution runtime is not yet complete: current legacy stage routes still write their older state namespaces, and no typed command currently advances `v7_sequential_stage_runs`.

The implementation order is therefore:

1. **Executable foundation:** create the Stage Contract Registry, artifact eligibility engine, and typed commands `START_STAGE`, `PRODUCE_ARTIFACT`, `VERIFY_ARTIFACT`, `FREEZE_STAGE`, and `REOPEN_ROOT_STAGE` with SIWC authority, idempotency, leases, lineage, cost, and audit controls.
2. **Video-01 design package:** bind the active niche/strategy/brief versions and produce/freeze new Stage 00–07B artifacts. This phase remains zero media-provider spend until Stage 07B approves a bounded provider plan.
3. **Shot and media runtime:** compile Stage 08 contracts; adapt the existing media executor and providers to the new sequential namespace; produce Stage 09–10 artifacts with real-byte and rights evidence.
4. **Edit and master:** integrate the compositor, full-timeline verification, and immutable master workflow for Stages 11–13.
5. **Independent assurance:** implement the eight-critic V281 runtime, root-cause repair router, and Stage 14 quality adjudication.
6. **Owner gate:** implement the identity-bound owner-ready command and evidence/cost/rights reconciliation for Stage 15. Keep publication separate and OFF.
7. **Learning:** only after separately authorized publication, implement Stage 16 YouTube Analytics ingestion and version-bound learning.
8. **Sequential scale-out:** unlock video 2 only after video 1 is owner-ready; repeat the same contract through video 15 without parallel production.

Immediate acceptance target: complete Step 1 and prove, with zero provider calls and zero production spend, that video #1 can advance from Stage 00 only through valid typed commands while video #2 remains blocked and all legacy artifacts remain ineligible.
