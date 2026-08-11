# Stage 09 Material Production Architecture v2.0

Status: LOCKED for Production Pipeline V7  
Scope: fresh material production after Stage 08 semantic-shot freeze

Version 2.0 incorporates the production findings from MP-001 Pixel QA at 23/100 and 76/100. The target is not to repair one checkout shot; it is to make the same failure class structurally impossible before Stage 09 scales.

## Target operating architecture

Stage 09 is split into six planes. Sites is the control plane; CPU/GPU-heavy video decoding and rendering belong to an asynchronous media-execution plane. A synchronous page request may coordinate one state transition but may never perform a full production wave.

| Plane | Responsibility | Scaling boundary | Current readiness |
|---|---|---|---|
| Control plane | contracts, state, authorization, request/cost ledger, stop/resume | D1 state and immutable evidence references | Ready |
| Source intelligence | provider/local/Drive retrieval, actual-video decoding, frame sampling, negative evidence | queue-backed media workers | Blocked pending actual-frame extractor |
| Semantic composition | family renderer registry, structured factual data, composite tournament | stateless renderer workers | Partial; MP-001 renderer only |
| Perceptual QA | candidate, composite, motion and sequence critics | bounded AI jobs with stored inputs/outputs | Partial; candidate and composite QA implemented |
| Evidence plane | R2 working bytes, Google Drive canonical archive, checksum, rights and lineage | content-addressed immutable storage | Ready |
| Scale governor | tranche admission, adaptive concurrency, backpressure and circuit breakers | one unit → pilot → sequence → waves | Contracted; locked until quality pilot passes |

### Non-negotiable separation

The control plane never treats a provider thumbnail as decoded video evidence and never performs long video work inline. The execution plane receives an idempotent job, reads stored source bytes, writes derived frames or renders, then returns checksums and evidence IDs. Only stored results may advance the state machine.

## Quality-production process v2

1. **Compile the immutable material brief.** Inherit timing, narration clause, viewer-state change, factual acceptance, required evidence and prohibited evidence from Stage 08.
2. **Acquire real source bytes.** Search provider, personal and reusable libraries. Record rights before download; store the selected original in R2 and Google Drive.
3. **Decode the actual video.** Sample frames and short clip windows from the stored MP4. A provider thumbnail is discovery evidence only.
4. **Run negative-evidence detection.** Reject cash, wrong payment mode, logos, faces, obstructed focal objects, unreadable screens and every brief-specific prohibition before scoring relevance.
5. **Run the source-frame tournament.** Rank actual frames or clip windows for context, action, composition, authenticity and editability.
6. **Generate composite alternatives.** A family-specific renderer produces at least three materially different compositions; changing only color, copy or state label does not create a candidate.
7. **Run composite Pixel QA.** Inspect stored audience-facing entry, midpoint and exit pixels at 1080p and 360p. Every supporting dimension must be at least 86 and overall at least 90.
8. **Render motion proof.** Bind the champion to narration timing and prove entry, meaningful change and exit. Static state screenshots cannot prove final motion.
9. **Run a 30-second sequence gate.** Check semantic continuity, repetition, rhythm, crop, mobile legibility and audio-handoff intent across neighboring shots.
10. **Admit a bounded tranche.** Expansion is authorized only after all upstream evidence is terminal and passing.

## Scale governor

| Tranche | Scope | Admission evidence | Maximum automatic action |
|---|---:|---|---|
| Root-cause recovery | 1 failed unit | stored diagnosis and changed mechanism, not cosmetic retry | one newly authorized unit |
| Quality pilot | 8–12 shots | every material and motion proof passes | no automatic expansion |
| Sequence pilot | one representative 30-second sequence | playback, continuity, diversity and audio handoff pass | authorize first wave |
| Production wave | 20–30 shots | prior wave defect/cost/provider health within tolerance | next bounded wave |
| Completion | remaining shots | 100% evidence coverage and no open P0/P1 | handoff to composition |

Concurrency is adaptive from two to eight workers. It decreases when provider failures exceed 10%, P1 defects exceed 5%, duplicate signatures exceed 2%, queue age grows abnormally or actual cost varies by more than 20% from the request contract. Any P0 immediately stops new dispatch. Completed units are immutable; a wave resume starts from the first incomplete unit.

## Required artifact lineage

Every final material must retain this trace:

`shot contract → source query → candidate pixels → selected source bytes → decoded frame/clip → renderer version → composite candidates → champion → motion render → Pixel QA → sequence QA`

Missing lineage blocks scale even when the pixels appear acceptable. This prevents an attractive but unrepeatable manual exception from becoming the basis for automated production.

## Objective

Stage 09 converts every frozen semantic shot contract into a rights-ready, stored, visually verified production asset. A prompt, URL, catalog result, generation plan or provider thumbnail never counts as material evidence.

## Product-complete wave execution

Production waves use `SPECIFIED → PRODUCING → PRODUCT_COMPLETE` as their business lifecycle. Batch boundaries coordinate load only; they are not QA gates. Every shot is compiled into a source-bound three-state product specification and becomes complete only after stored-pixel read-back, three distinct hashes, mobile-safe fit, temporal delta, provenance and forbidden-evidence checks pass.

Independent QA runs only after every shot in the batch is `PRODUCT_COMPLETE`. A failed audit rejects the production-engine version and names the root production layer. It never authorizes cosmetic output repair or a retry without an engine change. The affected engine capability must be corrected, regression-qualified and used to reproduce affected products under a new version while preserving failed outputs as immutable evidence.

## Binding decisions

1. **Meaning precedes pixels.** Every material brief inherits immutable timing, narration clause, visual job, entry/motion/exit states, factual acceptance and mobile acceptance from Stage 08.
2. **Use the correct production route.** Literal physical reality is sourced; invisible mechanisms, quantities and causal models are authored with code-native motion; hybrid shots combine real context with an exact explanatory layer.
3. **Factual graphics are deterministic.** Diagrams, charts, maps, timelines, receipts and equations are rendered from structured data with SVG/D3/Remotion-style components. Image-generation models may create illustrative texture or conceptual imagery, never unverified factual topology or numbers.
4. **Actual pixels are the evidence.** Candidate selection inspects fetched or generated files, not metadata alone. Entry, midpoint and exit frames are evaluated at production size and 360p/mobile size.
5. **Diversity is global, not local.** A contact-sheet and similarity pass reject duplicate assets, repeated compositions, template runs and neighboring shots with indistinguishable visual grammar.
6. **Production is tranche-authorized.** Execution order is zero-spend dry run → 8–12 shot pilot → 30-second sequence QA → bounded 20–30 shot waves → exception repair. A later tranche cannot begin until the preceding tranche passes.
7. **Deterministic-first model routing.** Rules and provider metadata remove ineligible candidates; embeddings shortlist; vision judges only the top candidates; high reasoning is reserved for factual or ambiguous finalists.
8. **Token and spend are request contracts.** Every request records model, reasoning, input budget, output ceiling, retry allowance, idempotency key, provider response ID, usage and actual cost before the next request may start.
9. **Incomplete output is a hard blocker, never a degraded artifact.** `max_output_tokens` or any provider-incomplete state stops that unit. The orchestrator may request only the missing fields once; it may not silently truncate, invent defaults or lower a gate.
10. **Stop and resume are provider-aware.** Background responses keep their provider IDs; emergency stop cancels cancellable responses, prevents new dispatch, and preserves validated work.
11. **Expected budgets are not quality ceilings.** Each lane has a normal output range and a larger safety ceiling. Critical semantic or factual adjudication receives the headroom it needs; observed P95 usage calibrates the envelope after quality is proven.
12. **Whole-unit recovery is explicit.** Automatic retry is delta-only. A complete unit may be rerun only after a stored root-cause diagnosis authorizes a bounded recovery; completed batches remain immutable.

These controls follow the official OpenAI guidance that reasoning tokens are included in output-token usage, `max_output_tokens` can produce an incomplete response, and Structured Outputs should be used for schema adherence.

## Material funnel

| Phase | Input | Method | Remote spend | Exit evidence |
|---|---|---|---:|---|
| Dry run | 166 frozen shot contracts | Deterministic compiler | $0 | 166 stored material briefs |
| Discovery | One authorized tranche | Provider search + local/Drive retrieval | Low | Candidate records with rights metadata |
| Shortlist | Candidate metadata/thumbnails | Rules + embeddings | Low | 6–10 viable candidates |
| Pixel QA | Top candidates | Vision inspection at entry/mid/exit | Bounded | 3 scored candidates |
| Final adjudication | Top 1–2 | Appropriate reasoning lane | Bounded | One champion or explicit exception |
| Materialization | Champion | Fetch/generate/render | Provider-specific | Stored bytes, checksum, provenance, rights |
| Sequence QA | Bound assets | Contact sheet + 30-second playback | Bounded | Semantic, variety, fit and rhythm evidence |

## Adaptive token envelopes

| Lane | Typical use | Reasoning | Expected output | Safety ceiling | Automatic retry |
|---|---|---|---:|---:|---:|
| Deterministic | rules, routing, validation, rendering | none | 0 | 0 | 0 |
| Fast query | query variation, metadata normalization | low | 500–1,500 | 3,000 | 0 |
| Single-candidate vision | one stored asset at entry/mid/exit | low/medium | 1,500–4,000 | 8,000 | 1 delta only |
| Multi-candidate comparison | compare three stored candidates | medium | 3,000–8,000 | 16,000 | 1 delta only |
| Critical adjudication | factual ambiguity, semantic conflict, release exception | high | 8,000–16,000 | 32,000 | 1 delta only |

The 32,000 value is a safety envelope, not a target. New critical tasks begin with 25,000 tokens of combined reasoning/output headroom during calibration, then use measured P95 consumption plus margin. The orchestrator batches by estimated token weight rather than a fixed number of shots and never submits a whole-project generation request.

### Completion and retry state machine

1. A complete schema-valid response advances to semantic validation.
2. `incomplete` with `max_output_tokens` stores provider evidence and moves the unit to `BLOCKED_INCOMPLETE`.
3. If the missing fields can be isolated, one delta request receives the missing-field contract and prior response ID.
4. A second incomplete response becomes `HUMAN_OR_ROOT_CAUSE_REVIEW`; it never triggers a retry cascade.
5. Transport errors may receive one idempotent transport retry and do not consume the semantic delta allowance.
6. A full-unit rerun requires a new authorization that names the root cause, affected unit IDs and maximum request count.

## Quality gates

- 100% briefs inherit exact shot timing and meaning.
- 100% have one explicit SOURCE, MAKE or HYBRID route.
- 100% specify required and prohibited visual evidence.
- Factual graphics use code-native rendering and reconciled data.
- Provider candidates are judged from stored pixels before selection.
- No candidate may repeat a neighboring asset, composition or template family.
- All assets fill 1920×1080 safely; essential labels remain legible at 360p.
- Every selected asset has stored bytes, SHA-256, provenance and rights status.
- Pilot and sequence QA must pass before full production.
- No P0/P1 issue, missing evidence or unbounded request can advance.

## Current implementation boundary

Wave 09.1 implements the zero-spend dry-run compiler. Wave 09.2 adds an immutable 8–12 shot pilot authorization and per-request ledger before any dispatch. Authorization itself creates no OpenAI or media-provider request and spends $0.

Wave 09.3 executes only that authorized pilot. It is resumable at one material unit per step: discovery, download or authored generation, R2 + Google Drive storage, checksum verification, pixel QA, and pilot sequence QA. Provider URLs and thumbnails remain candidates until bytes are stored. SOURCE and HYBRID shots retain the original provider file; HYBRID shots additionally receive a channel-owned explanatory overlay. MAKE shots receive a channel-owned 1920×1080 vector source. No 166-shot expansion is authorized by a pilot run.

Wave 09.4 is a clean material-quality rebuild. Stage 09.3 bytes remain immutable failure evidence and are never offered as candidates. The rebuild creates a new run and authorization with these additional gates:

- SOURCE/HYBRID discovery must collect 6–12 candidate thumbnails across every healthy provider. No provider wins by response order or metadata rank.
- A multimodal tournament inspects the real candidate pixels and returns one champion plus rejection reasons. Broad topic similarity, generic finance imagery and provider-default bias are explicit failures.
- MAKE/HYBRID explanatory layers use a renderer selected by visual family: mechanism diagram, route map, chart/waterfall, timeline, receipt/economic object, comic, doodle or system UI. One universal instruction-board template is prohibited.
- Every authored material stores separate entry, midpoint and exit raster evidence. These are audience-facing frames with no URL, filename, family name, debug pill, QA label or production instruction.
- Pixel QA receives all three states and a 360p-safe rendering. A single still can never prove motion semantics.
- Only the ten failed pilot units are rebuilt. Full 166-shot production remains blocked until the clean pilot passes every material and sequence gate.

### Candidate-pixel tournament

1. Generate short, concrete, noun-and-action provider queries from the frozen clause; abstract story prose is excluded.
2. Fetch candidates from all connected providers independently. A timeout reduces provider coverage but never promotes another provider by default.
3. Reject invalid aspect ratio, insufficient resolution, duplicate provider IDs, missing preview pixels and already-used assets deterministically.
4. Submit 6–12 real thumbnails in one bounded vision comparison. The structured response must name a candidate ID, semantic score, specificity score, composition score, authenticity score and rejection reason.
5. Score pixels against the responsibility of their route. `SOURCE` must itself prove the frozen clause (semantic fit ≥90; other dimensions ≥86). In `HYBRID`, provider footage proves only the literal real-world context and must not contradict the authored explanation (context fit ≥82, specificity ≥80, composition/authenticity ≥86); the completed composite must still pass the ≥90 full semantic QA.
6. A failed tournament stores its best candidate, dimension scores and rejection reason. One bounded repair changes the concrete query and excludes every previously rejected provider asset. A second failure blocks the unit; it never reruns the full pilot or silently lowers a threshold.
7. A repaired unit is not accepted when its bytes are merely stored. It must complete checksum/provenance verification and the same full Pixel QA contract as every other unit.
8. A successful bounded repair pauses at `PILOT_REPAIR_REVIEW` only after Pixel QA passes. No later pilot unit may dispatch until the user explicitly continues, so a repair click cannot silently expand spend scope.
9. A legacy `PILOT_REPAIR_REVIEW` record with stored bytes but no Pixel QA is resumed as `PILOT_REPAIR_RUNNING`; the repaired unit is audited first and MP-002 remains blocked.
10. Download only the champion. Selection evidence, rejected candidates and provider coverage are stored before materialization.

### Family renderer contract

For every `HYBRID` unit, Pixel QA evaluates three stored audience-facing composites—not a provider thumbnail followed by separate planning graphics. The provider frame is rasterized as the real-world context layer; the authored layer supplies only the exact semantic states required by the frozen clause. Production instructions, source labels, filenames, placeholders and internal taxonomy are prohibited from these frames. A repaired composite overwrites its prior QA proxies and checksum record before a fresh audit; the old failed audit is never reused as evidence.

Pixel QA is a critical adjudication request and therefore uses the approved 8,000-token safety envelope while retaining a 1,500-token expected output. `max_output_tokens` is classified as provider-incomplete, not a visual verdict. The previous audit remains historical only and cannot close the repaired-unit gate; exactly one bounded incomplete retry is allowed.

The Hybrid Compositor must preserve the documentary provider frame as context while authoring the exact semantic state at production size. Transaction-state pilots use a visibly unbranded reader/terminal, explicit blank → amount → processing progression, and no audience-facing counters, filenames, URLs, asset IDs, debug pills, or production instructions. A failed delta retry returns the unit to root-cause authorization; it never silently dispatches later pilot units.

| Family | Required visual proof | Prohibited fallback |
|---|---|---|
| Mechanism diagram | named roles, directional transfer, decision state | anonymous nodes and decorative dashes |
| Route map | origin, destination, ordered path and moving token | undirected network wallpaper |
| Chart / waterfall | reconciled values, labeled baseline and visible delta | bars without data |
| Timeline | distinct states, ordered time and delayed consequence | evenly spaced generic cards |
| Receipt / economic object | one persistent amount that visibly decomposes | decorative receipt placeholder |
| Comic | concrete actor/action/consequence across panels | generic office characters |
| Doodle | one hand-built metaphor with progressive reveal | icon collage |
| System UI | one task-specific decision interface with hierarchy | fake provider dashboard or tiny labels |

### Stage 09.4 release thresholds

- Candidate tournament coverage: 100% of SOURCE/HYBRID pilot units; 6–12 inspected pixels per unit unless fewer valid candidates exist, which blocks rather than auto-selects.
- Per-material semantic fit: >=90; P0 factual units >=94; every supporting dimension >=86.
- Entry/midpoint/exit evidence: 3/3 stored and materially different for every MAKE/HYBRID unit.
- Mobile safety: all essential labels readable at 360p with no crop or letterbox.
- Diversity: no three consecutive same-family shots; no duplicate primary hash, candidate ID, composition signature or renderer state sequence.
- Audience-pixel cleanliness: zero URLs, filenames, provider names, template names, debug labels or production metadata.
- Rights and storage: 100% SHA-256, provenance, rights, R2 runtime copy and immutable Google Drive original.
- Retry policy: at most one missing-field delta. Query repair or whole-unit rebuild requires stored root cause and never reuses a rejected candidate.

### Pilot execution state machine

`PILOT_AUTHORIZED → PILOT_RUNNING → MATERIALIZED → PIXEL_AUDITED → PILOT_PASS | REPAIR_REQUIRED`

- One HTTP step performs at most one material unit or advances one background vision review.
- The browser may close; stored units and request records are authoritative on resume.
- Emergency stop prevents new dispatch and cancels every cancellable OpenAI background response by provider response ID.
- Provider discovery and file download calls are short-lived, individually ledgered operations. They are never represented as cancellable after completion.
- A pilot PASS authorizes review of the next production tranche; it does not automatically dispatch it.
- Sequence QA checks the ten-shot set for exact scope, route/family diversity, physical-file uniqueness, provenance completeness and pixel-QA completion. Playback rhythm remains a later edit/render gate and may not be inferred from metadata.

## Locked architecture decisions

## Wave 09.6 — Commercial reliability baseline

Stage 09 production execution is quarantined at checkpoint v150 and cannot dispatch another normal provider request. A deterministic Shot Contract Compiler now transforms each pilot brief into a narrative claim, observable evidence, temporal evidence, allowed modality, forbidden assumptions, risk tier and repair route before source discovery.

The compiler treats MP-153 as the hardest-first `TRANSACTION_STATE_PROOF` fixture. Generic stock is rejected at contract lint because it cannot prove `PROCESSING → VERIFIED → VERIFIED / NOT SETTLED`; allowed modalities are controlled UI, authored state animation or a verified hybrid. This is an intentional early redesign result, not another Pixel-QA failure.

Eight archetypes enter contract qualification independently: transaction-state proof, data visualization, process route, documentary live action, source-authored hybrid, abstract authored, rights-sensitive and mobile-text intensive. Contract qualification does not certify production. Each archetype remains blocked until a real stored artifact establishes first-pass yield and the release threshold.

The dispatch firewall is systemic: while the reliability baseline is `FROZEN`, normal discovery, tournament, render-QA and retry phases cannot create a provider request. Only an explicitly scoped `ARCHETYPE_CERTIFICATION` phase may later open after its own bounded authorization.

Hardest-first evidence begins with MP-153. The `CONTROLLED_TRANSACTION_STATE_UI_V1` renderer creates three channel-owned states, runs checksum/read-back and deterministic lint, and only then permits one `ARCHETYPE_CERTIFICATION_QA` request. Certification uses a stricter 90 floor per dimension and 92 overall; a PASS certifies only `TRANSACTION_STATE_PROOF`, never the remaining archetypes or pilot production.

- **ADR-054 — Production execution and architecture qualification are separate lifecycles.** A batch cannot mutate its compiler, renderer or ledger contract while producing release artifacts.
- **ADR-055 — Claims compile before pixels are acquired.** A shot without observable evidence, allowed modality and forbidden assumptions fails at zero spend.
- **ADR-056 — Archetypes certify hardest-first.** A passing easy champion never authorizes an untested semantic class.
- **ADR-057 — Repair routes follow root-cause layers.** Contract, source, renderer, evidence and execution failures do not share a generic retry path.
- **ADR-058 — Commercial release is yield-based.** Scale admission requires archetype coverage and measured first-pass yield, not one aggregate score.

- **ADR-028 — Adaptive token envelopes protect quality.** Token limits constrain runaway execution, not the completeness standard of an artifact.
- **ADR-029 — Provider-incomplete means gate-blocked.** Missing output can never be repaired with defaults or compensated by an average score.
- **ADR-030 — Automatic retry is delta-only.** Whole-unit recovery requires explicit root-cause authorization and preserves completed work.
- **ADR-031 — Usage calibrates envelopes after quality.** P95 token evidence may resize expected budgets but may never lower a quality gate.
- **ADR-032 — Pilot authorization precedes dispatch.** The authorization binds shot IDs, maximum remote requests, model policy and revocation state; creating it costs $0.
- **ADR-033 — Material identity is byte-backed.** A material is real only after R2 storage, SHA-256 read-back evidence and Google Drive archival; a provider URL, thumbnail or generated prompt cannot advance the gate.
- **ADR-034 — Pilot work is one-unit resumable.** Every UI tick may advance at most one brief or one background QA response, so page closure, timeout or provider latency never restarts completed work.
- **ADR-035 — SOURCE, MAKE and HYBRID preserve different evidence.** SOURCE stores the selected provider bytes; MAKE stores a channel-owned authored source; HYBRID stores both provider context and a separate owned explanatory layer.
- **ADR-036 — Pixel evidence and sequence evidence are not conflated.** Vision review scores the selected representative pixels; sequence QA scores the pilot set. Full entry/mid/exit playback remains mandatory downstream when the motion edit exists.
- **ADR-037 — Remote work is stop-aware and ledger-complete.** Every network call receives a request record with provider, phase, terminal status, token usage when applicable and actual measured cost before another unit advances.
- **ADR-038 — Candidate pixels precede provider selection.** Provider metadata may filter but may never choose a SOURCE/HYBRID champion; selection requires a stored multimodal tournament over real previews.
- **ADR-039 — Renderer identity follows meaning.** MAKE/HYBRID materials are rendered by a family-specific grammar. Recoloring or relabeling one generic template across meanings is a hard failure.
- **ADR-040 — Three states prove motion semantics.** Entry, midpoint and exit evidence are distinct stored raster artifacts. One frame or a storyboard proxy cannot satisfy material QA.
- **ADR-041 — Failure evidence is immutable but non-reusable.** Stage 09.3 assets remain auditable historical evidence; Stage 09.4 creates fresh bytes, candidate decisions and checksums for all ten pilot units.
- **ADR-042 — Provider health cannot become selection bias.** Timeouts and missing candidates are recorded as coverage defects. They never silently promote Pexels, Pixabay or any other provider.
- **ADR-043 — Control and media execution are separate planes.** Sites coordinates state and evidence; queue-backed workers decode video and render motion. Synchronous control requests never perform a production wave.
- **ADR-044 — Provider thumbnails are discovery-only.** SOURCE/HYBRID acceptance requires frames or clip windows decoded from the stored source video.
- **ADR-045 — Prohibited evidence is executable.** Every prohibited visual rule becomes a deterministic or vision detector before candidate scoring; a P0 contradiction cannot be averaged away.
- **ADR-046 — Composite quality has its own tournament.** A source champion is not a composite champion. At least three materially distinct finished compositions compete before motion production.
- **ADR-047 — Renderer registry is versioned and meaning-bound.** Each visual family declares structured inputs, visual grammar, motion semantics, mobile constraints, prohibited fallbacks and renderer version in lineage.
- **ADR-048 — Scale requires sequence evidence.** Per-shot PASS cannot authorize full production. A representative 30-second playback must prove continuity, variety, rhythm and audio handoff.
- **ADR-049 — Backpressure protects both quality and spend.** Concurrency responds to defect rate, duplicate rate, provider health, queue age and measured cost variance; any P0 stops dispatch.
- **ADR-050 — Root-cause recovery changes a mechanism.** A failed full-unit retry remains locked until a stored diagnosis names the changed source, renderer, QA or execution mechanism. Cosmetic reruns are prohibited.

## Wave 09.5 — Media Execution Plane V1

Wave 09.5 implements the durable boundary between orchestration and binary media work. It does not authorize a new visual, AI request or production tranche. It creates one root-cause source-frame job and proves that a separately operated executor can transform the already stored provider MP4 into inspectable evidence without substituting a thumbnail.

### Runtime topology

| Component | Owns | Must not do |
|---|---|---|
| Sites control plane | authorization, durable queue, leases, state transitions, evidence references and gates | decode video, run ffmpeg or infer media completion |
| D1 media queue | immutable contract, attempt count, lease owner, expiry, result and terminal failure | contain binary frames or credentials |
| R2 runtime store | original video, extracted frames and evidence manifest | represent an asset without checksum/read-back |
| Google Drive archive | reusable originals and immutable evidence manifests | replace runtime state or queue truth |
| Media executor | ffprobe, SHA-256, exact frame extraction and bounded upload | select creative meaning, call AI or advance scale |

### Source-frame job contract

1. The control plane chooses only the current root-cause brief and its already stored primary video.
2. Planning creates one `SOURCE_FRAME_EXTRACTION` job and costs $0.
3. An executor heartbeat proves `ffprobe`, `ffmpeg`, SHA-256 and 960×540 JPEG capability.
4. A worker claims one job under a ten-minute lease. Expired leases are recoverable once; attempt exhaustion becomes a terminal failure.
5. The source download is authorized by both executor secret and per-job lease token.
6. The worker verifies the downloaded bytes against the frozen source SHA-256.
7. `ffprobe` supplies codec, original dimensions, duration and frame-rate evidence.
8. The worker extracts exact 10%, 50% and 90% frames using cover fit at 960×540.
9. Completion is rejected unless source hash, duration tolerance, image signatures, dimensions, frame roles and byte-size bounds all pass.
10. Frames and manifest are stored in R2 and Google Drive before the job becomes `COMPLETE`.

### Scaling and recovery behavior

- The executor claims at most one job per lease and never generates more work.
- Page refresh cannot duplicate a job; job identity and lease state are durable.
- Completion is idempotent by job/evidence identity.
- A worker crash preserves the job and source; the lease expires and one bounded recovery is allowed.
- No OpenAI or media-provider request is emitted by job planning, heartbeat, claim or source-frame completion.
- A technically verified frame set unlocks only source-frame semantic QA. Composite work remains blocked until the stored pixels pass that independent gate.

### Additional locked decisions

- **ADR-051 — Binary execution is capability-isolated.** The media worker owns deterministic transforms only; it cannot select meaning, alter the frozen contract or authorize scale.
- **ADR-052 — Queue state is durable and lease-based.** One job has one active lease, a fixed expiry and a bounded attempt count; browser lifetime is irrelevant.
- **ADR-053 — Source hash crosses the trust boundary.** A worker must return the same SHA-256 as the stored original before any extracted frame is accepted.
- **ADR-054 — Frame evidence is exact and role-complete.** ENTRY, MIDPOINT and EXIT are mandatory, unique and production-sized; a provider poster cannot fill any role.
- **ADR-055 — Media completion requires two stores.** R2 read-back and Google Drive archive references are recorded before evidence becomes verified.
- **ADR-056 — Execution readiness is observable.** Configuration, heartbeat, queue depth, active lease, failure and evidence counts are visible in the Stage 09 control plane.
- **ADR-057 — Deterministic media work has zero AI authority.** The executor never calls an AI model. Semantic and composite adjudication remain separate, explicitly authorized gates.
- **ADR-058 — Worker transport and executor capability are independently authenticated.** A private Factory request must pass the hosting transport boundary before the application validates the executor secret; neither credential substitutes for the other.
- **ADR-059 — Worker credentials remain runtime-only.** `FACTORY_SITE_AUTH_TOKEN` and `MEDIA_EXECUTOR_SHARED_SECRET` are injected only into the executor runtime, never stored in D1, R2, Google Drive, source control, job payloads or browser responses.
- **ADR-060 — Cloud media execution is one-job-per-task.** The production packaging targets Google Cloud Run Jobs with a 15-minute timeout and zero platform retries; D1 lease expiry owns the single bounded recovery, preventing infrastructure retries from duplicating media work.
- **ADR-061 — Technical verification is not semantic acceptance.** Codec, dimensions, duration, checksums and three decoded frames prove that real bytes exist; they cannot prove clause-level relevance, contradiction safety or composition readiness. These states are stored separately and no score can bridge them.
- **ADR-062 — Source-frame QA judges actual decoded pixels before composition.** One bounded, ledgered vision request inspects ENTRY, MIDPOINT and EXIT for specificity, contradiction safety, context fit, temporal differentiation and mobile clarity. Every dimension must be at least 86 and overall at least 90.
- **ADR-063 — A failed source gate creates a replacement contract, not a cosmetic patch.** The audit records findings, a replacement query and an explicit source-layer contract. The same source evidence is immutable and cannot be re-audited to seek a different verdict; a new source asset and checksum are required.
- **ADR-064 — Source QA has a 3,000-token hard ceiling and zero automatic retries.** The expected structured result is 1,200 tokens. Incomplete provider output blocks the gate; it never launches a batch rerun or silently reduces the quality threshold.
- **ADR-065 — Source replacement is candidate-bounded and evidence-driven.** A failed source audit authorizes one new provider search/tournament/download at a time. The system may test at most three replacements for the root-cause unit; it never launches a full-pilot replacement wave.
- **ADR-066 — Poster selection is provisional.** A provider thumbnail tournament may choose which video is worth downloading, but only decoded ENTRY/MIDPOINT/EXIT pixels can accept the source. A new checksum creates new evidence and requires a fresh semantic audit.
- **ADR-067 — Rejected source bytes remain historical, never audience-facing.** Replacement overwrites the active PRIMARY binding only after new bytes are stored in R2 and Drive. Prior frame evidence and its failed audit remain immutable for learning, cost attribution and regression testing.
- **ADR-068 — Every decoded frame identity includes the source job.** `brief + role` is insufficient because a replacement would overwrite the prior ENTRY/MIDPOINT/EXIT files. Runtime keys, Drive filenames and evidence file IDs bind `brief + source-job + role`; legacy evidence without job lineage is invalid and must be decoded again before QA.
- **ADR-069 — HYBRID layer responsibilities are adjudicated separately.** Source footage must prove authentic physical context, clear tender/action, usable composition and contradiction safety. Exact illustrative values, explanatory labels and abstract mechanism states belong to the authored layer; source QA may not reject good footage for lacking those authored elements.
- **ADR-070 — Evaluator contracts are versioned evidence.** A corrected responsibility boundary creates a new rubric identity rather than overwriting a prior verdict. Re-adjudication of the same immutable pixels is allowed once for a materially revised rubric; both scores, provider response IDs, token usage and costs remain inspectable. For HYBRID checkout context, a plain visible payment-card action is sufficient; visual proof of credit-versus-debit and authored explanatory data are out of scope.
- **ADR-071 — Composite inputs must inherit accepted source lineage.** A HYBRID compositor may read only the ENTRY/MIDPOINT/EXIT files named by the current passing source-evidence manifest. Provider thumbnails, catalog posters and stale frame identities are prohibited compositor inputs.
- **ADR-072 — Three materially different composites compete on finished pixels.** Split proof, documentary rail and focus-lens layouts each render three stored states from the same accepted source. Candidate identity includes rubric and source hash, so a new source or compositor contract cannot silently reuse old pixels.
- **ADR-073 — Composite adjudication is winner-take-all and bounded.** One ledgered vision request compares nine actual audience-facing frames. It selects one candidate; PASS requires every winning dimension at least 86 and overall at least 90. No averaging, fallback promotion or automatic retry is permitted.
- **ADR-074 — Composite PASS cannot authorize scale.** It unlocks only motion proof. The selected file IDs, source evidence hash, scores, findings, provider response and cost remain immutable; motion and sequence gates must still pass before another pilot unit may run.
- **ADR-075 — A failed stabilized unit permits one append-only targeted repair, never a hidden rerender.** The failed audit, provider response, promotion, frame IDs and hashes remain immutable. A zero-spend repair compiler must translate the exact P0/P1 findings into deterministic pixel gates, create a new promotion, pass byte/hash/contract read-back and then require a separate explicit paid release. The repair audit receives a new attempt-qualified ID; a second repair and every later unit remain blocked unless the repaired unit reaches the frozen quality floors.
- **ADR-076 — Audience-visible text is a compiled contract surface.** Internal unit IDs, fixture labels, debug metadata and production instructions are prohibited renderer inputs. Co-visible state requirements and physical actions are checked at the state manifest before rendering; text boxes declare a pixel width and glyph budget so cropping is a build failure rather than a production QA discovery.
- **ADR-075 — Production observation calibrates the evaluator contract.** A model PASS is not accepted during Factory development when inspection of the same stored pixels reveals a systematic miss. The prior response remains immutable evidence; the compositor and rubric receive a new version, and downstream authorization returns to the composite gate.
- **ADR-076 — A tournament field must contain three viable alternatives.** Winner quality cannot conceal a deliberately or accidentally broken challenger. Every candidate must meet factual-safety, composition, mobile-legibility and overall field floors before the winner can authorize motion proof.
- **ADR-077 — Audience labels require narrative jobs.** Placeholder glyphs, internal state-machine legends, clipped or colliding text and generic debug/status UI are P1 composite failures. Every visible label must clarify the current narration state, not expose how the renderer works.
- **ADR-078 — Composite evidence lookup is version-exact.** Preview, adjudication, champion binding and motion handoff must resolve `rubric + source hash + candidate + state`; querying by reusable asset role alone is forbidden because it can surface stale pixels from an earlier compositor.
- **ADR-079 — Repair copy remains observation-bound.** A repair may name only what is visually established by the accepted source or explicitly authorized by the frozen authored contract. Derived labels such as “confirmed” or “authorization started” are prohibited unless the current shot is contracted to prove them.
- **ADR-080 — Provider completion and audit commit are recoverable as one logical operation.** If a provider response completes but verdict persistence fails, its request remains the sole reusable response for the matching rubric-file generation. Resume re-fetches that stored response and commits the audit without recording usage twice or dispatching another provider request.
- **ADR-081 — Challenger repair is delta-scoped and loop-bounded.** A failed field repairs only the named compositor defects, creates a new rubric identity and receives one new adjudication. Prior source evidence and passing candidate pixels are not regenerated; failure after the authorized delta remains blocked for explicit review.
- **ADR-082 — Awaited rejection ownership is mandatory.** Every Promise returned inside an API `try/catch` boundary must be explicitly awaited by that boundary. Promise ownership may not cross the boundary implicitly because a later rejection would bypass the intended error contract.
- **ADR-083 — Async-boundary safety is a build invariant.** A TypeScript type-aware audit scans every API route before each production build. It self-tests an unsafe and safe fixture, reports exact source positions and blocks checkpoint deployment when an un-awaited Promise return is found.
- **ADR-084 — Negative-path production QA is mandatory.** A successful build is insufficient for privileged executor routes. Each deployment must verify unauthorized heartbeat, claim, source-download and completion paths, plus an authorized non-mutating heartbeat whenever the executor is configured.
- **ADR-085 — Composite repair is revisioned and field-bounded.** A failed challenger cannot trigger source replacement or a full pilot rerun. The next compositor rubric copies every passing candidate byte-for-byte, re-renders only the named failed candidate/state, stores a new version-exact lineage, and permits exactly one fresh adjudication.
- **ADR-086 — A passing winner cannot hide an invalid tournament field.** Scale requires both a qualified champion and viable alternatives. Challenger defects are repaired before motion proof so the reusable renderer grammar is proven, not merely the one lucky output; a failed delta becomes `COMPOSITE_REPAIR_BLOCKED` and requires explicit root-cause review.
- **ADR-087 — Quality status is layer-qualified, never overloaded.** Material storage, source Pixel QA, composite adjudication and motion proof expose separate status fields. A failed historical source audit may remain immutable evidence, but it cannot overwrite or visually contradict a later passing composite revision.
- **ADR-088 — Continuity must freeze before motion dispatch.** A motion job may be created only when the immutable Continuity Hardening snapshot is `FROZEN`, active provider exposure is zero and the exact V5 composite champion is C. Planning the job costs $0 and cannot call a model.
- **ADR-089 — Motion proof is a real stored WebM, not inferred animation.** The isolated executor reads the three version-exact C frames by file ID and SHA-256, renders one narration-bound 960×540 VP9 WebM at 30fps with no audio or new text, then returns decoded 10%/50%/90% samples. R2 and Google Drive read-back precede semantic QA.
- **ADR-090 — Motion QA is bounded and cannot authorize scale.** One ledgered vision request judges only samples decoded from the stored WebM. PASS requires every dimension at least 86 and overall at least 90; it advances only to `SEQUENCE_PROOF_REQUIRED`. Incomplete output blocks the gate and never triggers an automatic retry.
- **ADR-091 — Interactive recovery uses an exact-job capability, not a reusable secret.** A private owner request may issue one short-lived bootstrap token for the already queued motion job. Only its hash and expiry are stored; successful claim deletes the bootstrap capability and replaces it with the normal one-job lease token. The capability cannot heartbeat, enumerate, claim another job or dispatch AI.
- **ADR-092 — Certification-to-production promotion is an immutable handoff.** A canary unit may consume only a frozen promotion record binding its compiled contract hash, archetype, certification ID, renderer version and exact three frame IDs/checksums. Certification registry state and production binding can no longer resolve independently.
- **ADR-093 — Canary admission validates the artifact it will actually read.** Before authorization, all ten bindings must pass certification linkage, byte/hash congruence, unit-contract congruence, R2 read-back and no-legacy-fallback checks with zero provider requests and zero cost delta.
- **ADR-094 — Canary V1 failure evidence is preserved.** The failed `CONTROLLED_CANARY_V1` record and its MP-153 legacy 69/100 binding remain immutable. The repaired flow opens `CONTROLLED_CANARY_V2_PROMOTED_BINDING`; it never resets, overwrites or retries V1.
- **ADR-095 — Canary QA reads promoted pixels only.** Its provider request receives the three production-bound frames named by the promotion record plus the exact compiled unit contract. `PRIMARY`, route, family, filename and latest-row fallback paths are prohibited during V2.
- **ADR-096 — Promotion regression closes the replay gap.** Routing replay is insufficient. The release gate additionally proves `CERTIFICATION_TO_PRODUCTION_BINDING`, `BOUND_HASH_CONGRUENCE`, `UNIT_CONTRACT_CONGRUENCE`, `CANARY_ARTIFACT_READINESS` and `NO_LEGACY_FALLBACK` for 10/10 units before any lease.
- **ADR-097 — Production owns product completeness.** Quality is created inside the production pipeline, not assembled from a chain of QA gates. Sequence production compiles one immutable product specification, then performs plan, compose, render, measure and bounded auto-correction in one production transaction. It may declare only `PRODUCT_COMPLETE` or `PRODUCTION_BLOCKED`.
- **ADR-098 — QA is an independent release audit.** Perceptual QA runs only after `PRODUCT_COMPLETE`; it cannot drive routine repair, compensate for missing production capabilities or become a per-adjustment loop. A deterministic defect escaping production rejects the composer version and becomes a system regression, not a request to patch one video.
- **ADR-099 — The audience-facing master is the production measurement surface.** Full-frame scan, duration/FPS read-back, black/freeze detection, mobile-safe contain, continuity-edge completeness and adjacent-treatment diversity are measured on the rendered WebM. Renderer intent or source-frame metadata cannot substitute for final-master evidence.
- **ADR-100 — Business lifecycle stays simple.** Sequence exposes only `SPECIFIED → PRODUCING → PRODUCT_COMPLETE → RELEASED`. Internal render and correction iterations remain evidence inside `PRODUCING`; they are not operator gates. A non-convergent composer stops at `PRODUCTION_BLOCKED` without handing unfinished work to QA.
- **ADR-101 — Sequence repair preserves sealed materials.** Composer V2 consumes the exact 10/10 promoted units and 30/30 hashes from the passing canary. It cannot regenerate a material, add a claim, add audience text, change canonical order or fall back to a legacy asset. Composition parameters may change only to satisfy the product specification.
- **ADR-102 — Temporal measurement is master-relative and frame-aligned.** Scene-state durations compile to whole 30fps frame counts, and every diagnostic timestamp is clamped to the duration measured from the current master. A nominal 30-second intent cannot authorize an out-of-range scan or substitute for measured timebase evidence.
- **ADR-103 — Independent audit is exactly-once and product-bound.** The audit firewall requires the latest product to be `PRODUCT_COMPLETE`, its stored product evidence to match, its internal iteration count to be within contract and zero prior product audits. PASS advances to `RELEASED`; rejection preserves the completed artifact but rejects the composer version and cannot enter a QA-directed repair loop.
