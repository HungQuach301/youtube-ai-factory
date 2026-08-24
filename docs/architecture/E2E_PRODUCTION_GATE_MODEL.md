# End-to-End Production Gate Model

**State:** `ACTIVE_NORMATIVE__IMPLEMENTATION_REQUIRED`  
**Policy:** `E2E_PRODUCTION_GATE_MODEL_V1`  
**Effective:** 2026-08-24

## Purpose

This model turns an audience opportunity into an exact, evidence-bound release candidate. Data lifecycle, production workflow and acceptance are separate concerns: every stage has a Definition of Ready, producer self-check, independent gate, failure owner and typed handoff.

## Canonical workflow and gates

| Stage | Definition of Ready | Producer self-check | Independent gate and PASS evidence | Failure owner | Downstream handoff |
|---|---|---|---|---|---|
| Audience need | Versioned market, audience and channel context | Opportunity is specific, comparable and within channel envelope | `CHANNEL_STRATEGY_GATE`: active strategy/DNA, demand evidence, budget/risk eligibility | Channel Strategy | Opportunity brief |
| Claim graph | Research plan and source policy | Each material claim has scope, date, confidence and contradiction state | `CLAIM_EVIDENCE_GATE`: qualified sources and exact evidence bindings; unknown factual safety fails closed | Research/Claims | Frozen claim graph |
| Narrative | Frozen claims and video promise | Every sentence maps to claim/purpose; no unsupported certainty | `SCRIPT_VISUAL_COVERAGE_GATE`: factual, audience, pacing and visualizability coverage | Editorial | Versioned script and narration clauses |
| Visual intent | Script clauses and Channel Visual DNA | Every clause has typed audience job and treatment intent | `VISUAL_INTENT_GATE`: SOURCE/MAKE/HYBRID eligibility and no uncovered duration | Visual Planning | Visual-intent program |
| Video Blueprint | Claims, narration, format and Visual DNA | Sequences follow `Reality -> Mechanism -> Proof`; novelty and duration budgets fit | `VIDEO_BLUEPRINT_GATE`: coverage, treatment diversity, capability and cost feasibility | Creative Director | Frozen blueprint |
| Shot Contracts | Blueprint and canonical timebase | Frame/sample ranges are gap-free, non-overlapping and acceptance-testable | `SHOT_CONTRACT_GATE`: exact lineage, rights needs, motion/typography and evidence contract | Shot Planning | Compiled shot jobs |
| Candidate tournament | Shot jobs and provider eligibility | Relevant candidates compared for meaning, quality, diversity, rights and cost | `ASSET_RIGHTS_ELIGIBILITY_GATE`: winner is qualified, licensed and frozen to exact bytes/range/crop | Asset/Provider | Champion manifest and rights receipt |
| Animatic | Champion plan, draft audio and shot timing | Full duration plays coherently on target viewport; no slide grammar | `ANIMATIC_GATE`: story clarity, timing, coverage and treatment rhythm | Edit/Creative | Accepted timing plan |
| Qualified production | Accepted animatic and qualified capabilities | Visual/audio outputs meet their contracts and hashes reconcile | `VISUAL_CAPABILITY_GATE` plus `AUDIO_CAPABILITY_GATE`: capability receipts active for exact versions | Capability owners | Verified components |
| Scene graph | Verified components and frozen timebase | Objects, states, transitions, captions and transforms compile deterministically | `SCENE_GRAPH_GATE`: schema, determinism, lineage, bounds and mobile-safe layout | Renderer | Frozen render manifest |
| Integrated canary | Hardest 60-90 seconds selected before master render | Canary uses the exact Production path and dependency versions | `INTEGRATED_CANARY_GATE`: deterministic, semantic, temporal and audio checks pass | Root production owner | Master-render authorization |
| Exact master | Passed canary and frozen dependencies | Master decodes; hashes, duration, A/V sync and delivery properties reconcile | `EXACT_MASTER_GATE`: one exact master hash and complete lineage | Compositor | Exact-master evidence bundle |
| AI assurance | Exact master and qualified L0-L7 bindings | Evidence coverage, cost and raw responses complete | `AI_PRODUCTION_ASSURANCE_GATE`: `AI_ACCEPTED`, `CONTENT_REJECTED`, `ASSURANCE_INCOMPLETE` or `HUMAN_ESCALATION_REQUIRED` | Assurance/root defect owner | Acceptance or exception receipt |
| Freeze and release | Accepted exact hash, no stale dependency and applicable human authority | All receipts bind the same bytes; release policy satisfied | `RELEASE_GATE`: creates `RELEASE_READY`; never implies publication | Release authority | Release-ready package |
| Publication | Release-ready package and separate publication authorization | Channel, metadata, schedule and rollback target verified | `PUBLICATION_GATE`: provider receipt and exact published identity | Publication owner | Published identity |
| Performance learning | Published identity and measurement window | Metrics reconcile to exact video, prediction and treatments | `LEARNING_PROMOTION_GATE`: minimum sample, experiment validity and no unresolved confounder | Learning/Channel | Candidate, promotion, revoke or rollback |

## Gate rules

- A producer cannot independently PASS its own output.
- A score average cannot compensate for a hard factual, rights, safety, exact-byte or P0/P1 failure.
- A PASS binds exact input/output hashes, policy versions, acceptance authority and evidence limitations.
- Upstream mutation makes dependent gates stale; it never edits historical receipts.
- Infrastructure failure is `ASSURANCE_INCOMPLETE`, not content rejection.
- Repair routes to one root owner and permits at most one bounded append-only root revision before escalation.
- Release and publication are distinct commands, connections and receipts.

## State transitions

```text
DRAFT -> READY -> PRODUCING -> PRODUCED -> VERIFYING -> VERIFIED -> FROZEN
                 |             |            |
                 +-> BLOCKED   +-> FAILED   +-> ESCALATED

VERIFIED/FROZEN -> STALE only through a recorded dependency/version event
```

UI labels are projections only. A transition is authoritative only when the typed event and required receipt exist.

## Current boundary

R21 remains immutable evidence. R22 is the first intended canary for this model but remains undispatched until its contracts, capabilities and gates are implemented and qualified. Legacy Production V2 is outside this change.
