# QA and Eval Registry

**State:** `ACTIVE_NORMATIVE__CALIBRATION_REQUIRED`  
**Effective:** 2026-08-24

## Active exact-master stack

| Layer | Capability | Authority before qualification |
|---|---|---|
| L0 | Deterministic integrity, technical, rights, cost and layout checks | Hard measured gates |
| L1 | Claim and factual proof | Advisory/FAIL only |
| L2 | Visual-semantic quality | Advisory/FAIL only |
| L3 | Temporal/motion causality | Advisory/FAIL only |
| L4 | Exact-audio quality | Advisory/FAIL only |
| L5 | Audience/retention risk | Advisory |
| L6 | Browser full playback and runtime evidence | Evidence only |
| L7 | Independent evidence adjudication | No PASS until qualified |

Outcomes are `AI_ACCEPTED`, `CONTENT_REJECTED`, `HUMAN_ESCALATION_REQUIRED` and `ASSURANCE_INCOMPLETE`. Infrastructure failure cannot become a content verdict.

## Acceptance inheritance

Auto-accept requires all required evidence, overall at least 92, every critical dimension at its active Standard Registry floor and never below 90, P0/P1 zero, exact hash equality, rights PASS, cost reconciliation, zero active request and qualified bindings. A mean score cannot compensate for a hard factual, safety, rights, lineage, exact-byte or critical perceptual failure.

Video Quality Standard V3 owns new-production dimensions and thresholds. `AI_FIRST_PRODUCTION_ASSURANCE_V1` owns L0-L7 receipts and authority. No earlier Golden or V2 result grants current PASS.

## Judge qualification

| Metric | Minimum |
|---|---:|
| P0 recall | 100% |
| P1 recall | 95% |
| Clean precision | 98% |
| Critical false-clean | 0 |
| Exact-byte repeatability | 95% |
| P0/P1 decision flip | 0 |
| Evidence/timecode validity | 95% |
| Structured output validity | 100% |

Model, provider, prompt, rubric, schema or sampler change makes related qualification stale. Until qualified, a judge cannot write PASS.

## Finding and repair contract

Each finding records exact artifact hash, severity, timecode/evidence, confidence, unobserved dimensions, root owner, acceptance test and policy/model versions. Repair routes to one root owner and at most one bounded append-only root revision before escalation. QA never repairs its own finding.

## Current disposition

R21 visual FAIL 67 and audio PASS 95 remain exact-byte historical Production evidence. R22 must run the full active stack on its own exact bytes after its required capabilities are implemented and qualified. Browser, owner freeze, release and publication remain blocked.

## Phase 45 implementation evidence

| Work package | Stored evidence | Result | Authority |
|---|---|---|---|
| Contract foundation (`0106`) | Full migration replay; immutable triggers; rational frame/sample conversion; full Shot coverage; typed command/event fail-closed validation; deterministic replay; transitive dependency invalidation; live D1 table overview | `npm test`: 218/218 PASS; Production build PASS; documentation SSOT PASS; Production deployment PASS; all twelve `factory_*` tables visible in live D1; dual-remote synchronization PASS | No provider dispatch, R22, AI PASS, Browser, release or publication authority |
| Canonical runtime writer (`0107`) | Single-writer command/event receipts; expected-state/version conflicts; lease heartbeat/orphan recovery; monotonic fencing; stale-worker rejection; transitive stale projection; event/projection replay hashes; authenticated disabled-by-default route | Full repository tests: 224/224 PASS; targeted runtime tests: 31/31 PASS; documentation/build/deployment PASS; Sites version 514 and nineteen live `factory_*` tables verified; zero provider requests/spend; Production content unchanged | Runtime control evidence only; no provider dispatch, R22, AI PASS, Browser, release or publication authority |
