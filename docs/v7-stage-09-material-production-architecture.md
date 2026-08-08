# Stage 09 Material Production Architecture v1.0

Status: LOCKED for Production Pipeline V7  
Scope: fresh material production after Stage 08 semantic-shot freeze

## Objective

Stage 09 converts every frozen semantic shot contract into a rights-ready, stored, visually verified production asset. A prompt, URL, catalog result, generation plan or provider thumbnail never counts as material evidence.

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
5. Select only a candidate scoring at least 90 semantic fit and 86 in every other dimension. Otherwise the unit becomes `NO_PIXEL_CHAMPION` and routes to bounded query repair or MAKE/HYBRID escalation.
6. Download only the champion. Selection evidence, rejected candidates and provider coverage are stored before materialization.

### Family renderer contract

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
