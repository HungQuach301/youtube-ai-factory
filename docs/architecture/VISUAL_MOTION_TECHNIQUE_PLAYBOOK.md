# Visual and Motion Technique Playbook

**State:** `ACTIVE_NORMATIVE`  
**Policy:** `VISUAL_MOTION_TECHNIQUE_PLAYBOOK_V1`  
**Effective:** 2026-08-24

## Selection rules

Every visual must perform an audience job: establish reality, explain mechanism, prove a claim, compare alternatives, orient time/place or carry emotion. The Visual Grammar Resolver chooses `SOURCE`, `MAKE` or `HYBRID` using the Shot Contract, Channel Visual DNA, capability qualification, rights, cost and novelty budget.

The default explanatory sequence is `Reality -> Mechanism -> Proof`: documentary evidence establishes context; a diagram/map/chart reveals structure; an exact figure, state change or source-bound artifact proves the point. A treatment is not selected merely because it is available.

## Technique contracts

| Technique | Use when | Required construction | Motion grammar | Primary failure checks |
|---|---|---|---|---|
| Documentary B-roll | Place, people, object, consequence or scale must feel real | Source/creator, rights, exact range/crop, claim relevance and continuity anchor | Motivated movement; preserve subject/action direction | Generic filler, mismatch, staged implication, repeated clip, rights ambiguity |
| Animated diagram | Relationships or causal mechanism matter more than geography | Typed nodes/edges/states and narrated reveal order | Reveal cause before effect; persistent anchors; no decorative travel | Unexplained nodes, topology reuse, narration lag, false causality |
| Sankey/flow map | Quantity or entities move through a system | Conserved units, labeled sources/sinks and auditable values | Progressive flow synchronized to clauses; stable scale | Width not proportional, unit mixing, occlusion, invented flow |
| Geographic animated map | Location, route, boundary or geographic change is material | Qualified dataset, projection, date, legend and source | Orient wide, trace route, zoom semantically, prove destination | Geographic error, misleading projection, unreadable labels, fake precision |
| Timeline | Order, duration or change across time is the claim | Canonical dates/timebase, event identity and uncertainty | One direction; paced milestones; present state distinguished | Unequal spacing presented as equal, date ambiguity, too many simultaneous events |
| Ledger/state machine | Balances, obligations or discrete status changes explain the system | Typed accounts/states, valid transitions and arithmetic invariant | Highlight one mutation at a time; retain before/after | Broken totals, illegal transition, unexplained reset, UI-like decoration |
| Before/mid/after | Transformation and intermediate mechanism must be visible | Same object/reference frame across all phases | Match cut/object continuity; intermediate proof cannot be skipped | False comparison, inconsistent scale/crop, jump hiding the mechanism |
| Comparison chart | Relative magnitude, trend or trade-off is the claim | Source dataset, units, period, baseline and uncertainty | Establish axes first, reveal comparable series, annotate exact takeaway | Truncated/mixed axes, cherry-pick, mobile unreadability, decorative 3D |
| Network topology | Connectivity, dependency, propagation or concentration matters | Typed node/edge roles and direction; meaningful layout | Trace one path/risk at a time; preserve anchor positions | Hairball, meaningless nodes, false direction, repeated stock topology |
| Evidence UI/data artifact | Exact record, receipt or interface state proves the point | Redacted exact source, timestamp/version and permission | Focus/zoom only to cited evidence; preserve context | Fabricated UI, exposed secret/PII, illegible proof, context removed |

## Transition and camera grammar

- `Macro transition` changes place, time, causal layer or treatment family and must communicate that change.
- `Micro transition` advances state within one visual grammar and should preserve orientation.
- `Semantic zoom` moves between system and detail because meaning changes; it is not perpetual camera drift.
- `Match cut` preserves object, direction, silhouette or conceptual role across SOURCE/MAKE boundaries.
- `Object continuity` gives an entity stable identity across shots; color alone is insufficient where accessibility matters.
- Motion hierarchy permits one primary action, limited supporting motion and quiet background. Decorative loops never compete with proof.
- Temporal proof shows the state before, mutation during and result after when a claim depends on change.

## Composition diversity and anti-slide controls

The blueprint sets a treatment-duration budget and consecutive-treatment ceiling. Repeated centered card, identical node graph, uniform pan/zoom, static headline plus icon, or caption-dominated frame is classified as slide grammar. Diversity must come from the audience job and data shape, not random templates.

Candidate selection compares semantic fit, framing, authenticity, motion potential, visual novelty, rights and cost. Reuse is eligible only when the asset competes again; prior use creates no entitlement to selection.

## Typography, mobile and accessibility

- Design and test at the active mobile viewport and safe areas; desktop readability is insufficient.
- Establish an intentional type scale, line length and maximum simultaneous text load.
- Captions may support narration but cannot become the sole explanatory visual.
- Contrast follows the active Quality Standard; test normal, highlighted, dimmed and over-footage states.
- Encode categories using label/shape/pattern plus color; no critical distinction relies on red/green alone.
- Reduce motion, flashing and high-frequency texture; respect seizure and vestibular safety.
- Charts/maps retain units, dates, source identity and uncertainty after responsive layout.

## Localization

Hidden Systems targets US English (`en-US`). Dates, currency, decimals, units, pronunciation, legal/financial terms and maps use the channel locale contract. Translation/localization creates a new typed artifact and must re-run layout, factual and audio checks; text substitution into an already accepted master is prohibited.

## Evidence and qualification

Each technique is a capability with implementation/version, allowed archetypes, test corpus, visual/temporal metrics and revocation conditions. The Shot Contract names its acceptance evidence. Generated or code-native visuals cannot impersonate documentary evidence, and AI imagery cannot render exact financial, geographic or evidentiary claims.

The executable Hidden Systems corpus binds `DOCUMENTARY_MACRO`, `SYSTEM_DIAGRAM`, `ANIMATED_LEDGER`, `SANKEY_FLOW`, `NETWORK_MAP`, `GEOGRAPHIC_MAP`, `EXCEPTION_TIMELINE`, `COMPARISON_CHART`, `UI_DATA_PROOF` and `HYBRID_HANDOFF` to distinct topology and motion contracts. Every case has three decoded semantic states at exact 1920×1080/30fps, mobile/accessibility floors and either verified dataset lineage or exact SOURCE/HYBRID preparation hashes. Corpus PASS qualifies only the frozen implementation/settings/build tuple; changing the corpus, settings or encoder build requires a new append-only qualification.
