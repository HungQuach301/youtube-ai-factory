# Visual Production Operating Model

**State:** `ACTIVE_NORMATIVE`
**Policy:** `VISUAL_PRODUCTION_OPERATING_MODEL_V1`
**Effective:** 2026-08-24

## Purpose

This document defines how YouTube AI Factory turns an audience need and evidence-backed claim into audience-ready moving images. It governs every channel and video; channel-specific Visual DNA may narrow it but cannot weaken its hard controls.

The required lineage is:

```text
Audience need
  -> claim and source
  -> narration clause
  -> visual intent
  -> Video Blueprint
  -> Shot Contract
  -> candidate tournament
  -> frozen asset and rights receipt
  -> Scene Graph and canonical timebase
  -> exact render
  -> exact-master assurance
  -> performance observation
```

## Ownership hierarchy

| Level | Owns | Must not own |
|---|---|---|
| Factory | Hard gates, typed contracts, provider/capability qualification, rights, cost, timebase, evidence and assurance | Channel taste or episode-specific story choices |
| Channel | Audience, market/language, brand, voice, Visual DNA, treatment policy and risk envelope | Factory hard-gate exceptions |
| Series/Format | Repeatable story form, signature devices, duration bands and variation rules | Unbounded template reuse |
| Video | Claim graph, narrative, treatment allocation, Video Blueprint and payoff | Provider secrets or release authority |
| Sequence | Local causal objective, tension/payoff and continuity | Independent final acceptance |
| Shot | Exact visual job, entry/internal/exit state, assets, timing and evidence | Hidden fallback or inferred rights |
| Asset/Render | Exact bytes, provenance, derivatives and technical identity | Semantic authority outside its Shot Contract |

## Visual truth model

Every beat must perform at least one typed job:

- `REALITY_ANCHOR`: establish a real person, object, place, consequence or environment.
- `MECHANISM_EXPLANATION`: reveal a hidden process, state transition or causal link.
- `QUANTITATIVE_PROOF`: show an exact magnitude, comparison, distribution or change.
- `GEOGRAPHIC_PROOF`: show location, route, jurisdiction or spatial dependency.
- `TEMPORAL_PROOF`: show before/mid/after state and when the change occurs.
- `DECISION_PROOF`: show the choice, threshold, failure, exception or final payoff.

The preferred explanatory rhythm is `Reality -> Mechanism -> Proof`. A sequence may reorder it only when the Video Blueprint records a reason.

## Treatment families

| Family | Best use | Required proof | Prohibited use |
|---|---|---|---|
| Documentary footage | Reality, emotion, context, physical consequence | Source/provenance, active motion and semantic match | Generic mood B-roll standing in for a mechanism |
| System diagram | Actors, objects, state and causal relationships | Typed nodes/edges, entry/mid/exit states | Reusing one topology with relabelled text |
| Animated chart | Exact comparison, trend, distribution or variance | Source dataset, units, dates, arithmetic and scale | AI-generated values or decorative axes |
| Animated map | Route, geography, jurisdiction or diffusion | GeoJSON/source, coordinate validation and temporal route state | Geographic implication without verified data |
| Ledger/state machine | Obligation, accounting, balance or workflow state | Conservation rules and only-current-state disclosure | Displaying future values before activation |
| Sankey/flow | Quantity flowing between actors | Source/target conservation and visible direction | Using the same path as authorization, clearing and settlement |
| Timeline | Order, latency, exception and deadline | Canonical timebase and event identity | Equal-card slides that do not show progression |
| UI/data animation | Controlled interface or data-system behavior | Exact state and no invented evidence | Fake production proof or unreadable dashboards |
| 2.5D/3D scene | Spatial or mechanical relationship not legible in 2D | Camera and object motion with semantic purpose | Decorative parallax or camera-only progress |
| Hybrid composition | Connect reality to an abstract mechanism or proof | Explicit semantic handoff between treatments | Collage without a causal role |

## SOURCE, MAKE and HYBRID routing

- `SOURCE`: licensed or owned real media is the strongest evidence.
- `MAKE`: code-native diagram, chart, map, ledger or controlled animation is required for exact meaning.
- `HYBRID`: real footage must be connected to a code-native mechanism or proof.

The Visual Grammar Resolver selects a route from the visual job, claim type, evidence needs, Channel Visual DNA, capability qualification, rights eligibility, cost envelope and diversity state. It must fail closed when no qualified route exists. It may not silently replace a failed specialist route with a generic image.

## Video Blueprint contract

The Video Blueprint freezes:

- channel, series/format and policy versions;
- target audience, market and language;
- title promise, claim graph and final takeaway;
- story clock, hook, escalation, payoff and expected retention risks;
- sequence objectives and `Reality -> Mechanism -> Proof` allocation;
- treatment mix and maximum consecutive use;
- data/chart/map requirements;
- narration and canonical duration;
- cost, rights and provider envelopes;
- critical visual, audio and browser acceptance conditions.

The Blueprint is a production input, not proof that media exists.

## Shot Contract

Every shot records:

```text
shot_id
claim_id / narration_segment_id
canonical_timebase_id
visual_job
route = SOURCE | MAKE | HYBRID
treatment_family
entry_state / internal_events / exit_state
required_evidence / prohibited_patterns
candidate_requirements
rights_and_cost_envelope
mobile_safe_regions
continuity_in / continuity_out
acceptance_assertions
```

There is no universal shot-count or 3.5-second gate. Duration is compiled from narration, semantic density, motion events and the Channel/Format policy. Long holds need meaningful internal state change; fast cuts must remain comprehensible.

## Current executable compiler boundary

`factory-production-compiler` now implements the deterministic planning path for generic videos. It requires frozen Channel Visual Profile and Series/Format versions, one exact canonical timebase and typed narration segments; resolves only explicit SOURCE/MAKE/HYBRID candidates through the zero-dispatch Provider Gateway; enforces complete non-overlapping frame coverage, job/route compatibility, anti-slide patterns, data hashes for chart/map proof and treatment-duration policy; then materializes Blueprint, Shot Contracts, Scene Graph and lineage atomically through the canonical writer. It does not render pixels, dispatch providers, create R22 or qualify a channel/format by itself.

`factory-scene-graph-renderer` converts eligible Scene Graph nodes into a canonical per-frame semantic render tape, stores exact content-addressed bytes in R2 and records fenced lineage. `factory-pixel-video-compositor` is the next boundary: SOURCE/HYBRID asset versions must have exact-byte read-back and current rights eligibility; the qualified executor must cover one contiguous 60-90 second range, preserve the tape canvas/timebase, produce exact-repeat VP9 bytes and seal entry/midpoint/exit decoded pixels. The tracked fixture proves this generic executor without revision branching. It does not qualify Hidden Systems treatments or authorize a live/R22 canary, master or release.

## Candidate tournament

Eligible candidates compete on:

1. claim and visual-intent relevance;
2. documentary authenticity or explanatory precision;
3. framing and mobile readability;
4. entry/mid/exit motion potential;
5. novelty relative to the current video and channel history;
6. rights, provenance, cost and latency;
7. compatibility with adjacent shots and the Scene Graph.

The winner, rejected candidates, score evidence and selection reason are append-only. Previous assets have no incumbency privilege and must compete again.

## Scene Graph and canonical timebase

The Scene Graph is code-native and binds every object, state, animation and audio cue to one canonical timebase. It must support:

- clause, sample and frame range alignment;
- deterministic entry/internal/exit states;
- object continuity and semantic match cuts;
- motion hierarchy and focus order;
- charts/maps/ledgers driven by verified data;
- captions and typography inside mobile-safe regions;
- reproducible rendering from frozen inputs.

Camera movement alone is not meaningful motion. A sequence passes temporal proof only when audience-relevant state changes are visible.

## Composition and anti-slide controls

- No persistent headline band or repeated card grid as the default grammar.
- Do not reuse one topology for different causal phases.
- Do not reveal future ledger/map/state values before their event.
- Distinguish authorization, clearing, settlement and exception with different mechanisms.
- Use fewer, larger, higher-contrast labels; progressive disclosure is preferred.
- Treat typography as an annotation layer, not the primary visual content.
- Reality anchors must change the viewer's understanding, not decorate a slide.
- Consecutive treatments and layout fingerprints are measured; repeated-layout risk is a hard preflight input.

## Production gates

| Gate | Exit evidence |
|---|---|
| Channel Visual DNA | Versioned market, brand, voice, treatment and prohibited-pattern contract |
| Claim/Evidence | Every critical claim bound to qualified evidence or explicit qualifier |
| Video Blueprint | Complete narrative, treatment, data, rights, cost and acceptance plan |
| Shot Contracts | Exact timeline coverage and executable visual assertions |
| Asset Eligibility | Exact bytes, provenance, rights, technical decode and tournament winner |
| Animatic | Full canonical duration, semantic coverage and timing without final-quality substitution |
| Capability Qualification | Every used treatment/provider binding currently qualified |
| Integrated Canary | Hardest 60-90 seconds proves combined visual, motion and audio path |
| Exact Master | Reproducible bytes, complete lineage and zero active requests |
| AI Production Assurance | Exact-artifact multi-judge verdict under the assurance policy |
| Release | Separate acceptance authority; publication remains separate |

## Learning and scale

Performance observations bind back to claim, shot, treatment, capability and exact master. A single video cannot promote a new Factory or Channel standard. Promotion requires minimum evidence, controlled comparison, owner-authorized typed command and a new version. Rollback preserves all prior versions and videos.

## R21 and R22 boundary

R21 is immutable Production evidence: audio PASS 95 and visual FAIL 67. Its atlas does not qualify the visual system. R22 is the first canary for this operating model and may be created only as an append-only revision bound to the exact R21 visual FAIL/audio PASS receipts. This document grants no dispatch, Browser, owner-freeze, release or publication authority.
