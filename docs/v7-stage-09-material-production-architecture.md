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
9. **Incomplete output never triggers a full rerun.** `max_output_tokens` creates a bounded delta request for only the missing fields, at most once. Structured Outputs are mandatory for machine contracts.
10. **Stop and resume are provider-aware.** Background responses keep their provider IDs; emergency stop cancels cancellable responses, prevents new dispatch, and preserves validated work.

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

## Per-request ceilings

| Lane | Typical use | Reasoning | Output ceiling | Retry |
|---|---|---|---:|---:|
| Deterministic | rules, routing, validation, rendering | none | 0 | 0 |
| Fast | query variation, metadata normalization | low | 500–1,200 | 0 |
| Balanced | candidate comparison, ordinary vision QA | low/medium | 1,200–3,000 | 1 delta only |
| Critical | factual ambiguity, final exception adjudication | high | 4,000–8,000 | 1 delta only |

The orchestrator batches by estimated token weight rather than a fixed number of shots. It never submits a whole-project generation request.

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

Wave 09.1 implements the zero-spend dry-run compiler and pilot authorization contract. It creates no OpenAI or media-provider request. The next wave may dispatch only the approved pilot after the dry-run artifact passes its deterministic audit.
