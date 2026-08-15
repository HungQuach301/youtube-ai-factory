# Niche Intelligence & Portfolio Decision System — Contract V2

**Contract:** `NICHE_OPPORTUNITY_PORTFOLIO_V2`  
**Policy:** `NICHE_OPPORTUNITY_POLICY_V2`  
**Status:** `SLICE_3_1_NICHE_IDENTITY_REPAIR_PRODUCTION_DEPLOYED`
**Date:** 2026-08-15 (Asia/Bangkok)
**Contract deployment:** Sites v295 / `022f72f4ee06703225e4520bcf83983f887fade4` / succeeded
**Latest combined deployment:** Sites v301 / `89b9a9ebcb152a498a60ba991debeca3ae43f236` / succeeded

## Business outcome

Niche Discovery is no longer designed as one research champion followed by an expert yes/no. Its decision output is a versioned portfolio of potential niches that lets an expert compare and prioritize opportunities using the same evidence frame.

Every opportunity must make five questions visible:

1. How attractive is the market?
2. Who is the audience, and what are their characteristics, needs, preferences, pains and jobs-to-be-done?
3. How strong and defensible are the competitors, and where are their exploitable gaps?
4. Can this Factory win, given its current capabilities?
5. What prerequisites and winning criteria must be satisfied, how large are the gaps, and how will success be proven?

An expert may also submit a niche hypothesis based on experience or intuition. Expert-seeded and system-discovered hypotheses pass through the same research contract: seek supporting evidence, actively seek contradictory evidence and make decision-changing unknowns explicit. Expert authority changes priority and approval; it does not bypass evidence quality.

## Decision facts that must remain separate

```text
system discovery/rank
  ≠ expert priority
  ≠ selected for commitment
  ≠ committed niche
  ≠ activated Channel Strategy
```

The system never compresses the three decision axes into an opaque total score:

- `Market Attractiveness`: demand, growth, monetization, saturation and addressable geography/language.
- `Ability to Win`: differentiation, capability fit, competitor gaps, production feasibility and defensibility.
- `Evidence Confidence`: authority, freshness, coverage, contradiction review and unresolved uncertainty.

Prerequisites are hard gates. High market attractiveness cannot compensate for a missing legal right, production capability, reliable evidence source, viable unit economics or another prerequisite.

## Executable domain model

| Entity | Purpose |
|---|---|
| `NicheHypothesis` | Records system-discovered or expert-seeded thesis and its assumptions |
| `ResearchPlan` | Forces support, contradiction and unknown questions before validation |
| `EvidenceClaim` | Keeps statement, direction, source authority, freshness, confidence and affected axis explicit |
| `MarketPotentialProfile` | Captures demand, growth, monetization, saturation and market scope |
| `AudienceSegmentProfile` | Captures characteristics, needs, preferences, pains and jobs-to-be-done |
| `CompetitorProfile` | Captures strength, weakness, defensibility, content advantage and exploitable gap |
| `CapabilityProfile` | Records the Factory's present ability and evidence for it |
| `WinCondition` | Separates prerequisite from winning criterion and exposes gap, closing action, cost/time and proof |
| `NicheScorecard` | Preserves the three independent axes without a total score |
| `ExpertPriority` | Records expert ordering and rationale separately from system rank |
| `NicheOpportunity` | Versioned dossier joining the above facts for comparison |

Source: `lib/niche-opportunity-portfolio-contract.ts`.

## Entity granularity boundary

The comparison unit is exactly one `NICHE_OPPORTUNITY`: a bounded market, a specific audience, a recurring need/problem, a distinct content promise, a scalable content territory, monetization potential, a competitor gap and an evidence-testable right to win.

The hierarchy is:

`MARKET → NICHE_OPPORTUNITY → CONTENT_PILLAR → SERIES_CONCEPT → VIDEO_TOPIC_CANDIDATE`

No content pillar, series or video topic may be promoted into the niche comparison by score, title similarity or legacy research order. Historical Stage 01 `candidates` are `VIDEO_TOPIC_CANDIDATE` records and belong to Channel Studio/Content Planning. See Document 19.

## Lifecycle and command boundaries

Lifecycle:

`DISCOVERED → EVIDENCE_GATHERING → COMPARABLE → EXPERT_PRIORITIZED → SELECTED_PENDING_COMMITMENT → COMMITTED`

Revalidation may move a comparable or prioritized opportunity back to evidence gathering. Selection may return to expert prioritization. Direct `EXPERT_PRIORITIZED → COMMITTED` is forbidden.

Declared V2 commands:

| Command | Current authority |
|---|---|
| `SUBMIT_NICHE_HYPOTHESIS` | expert approval required |
| `PREPARE_NICHE_RESEARCH_PLAN` | system recommendation within policy |
| `REQUEST_NICHE_VALIDATION` | bounded, expert-approved research request |
| `RECORD_EVIDENCE_REVIEW` | expert approval required |
| `SET_NICHE_PRIORITY` | expert approval required |
| `REQUEST_NICHE_PILOT` | expert-approved bounded pilot |
| `SELECT_NICHE_FOR_COMMITMENT` | expert approval required |
| `COMMIT_NICHE` | Portfolio Governance |
| `ACTIVATE_CHANNEL_STRATEGY` | separate Portfolio Governance command |

`SUBMIT_NICHE_HYPOTHESIS` is now `ROUTED_ZERO_SPEND`. Every other V2 command remains `DECLARED_NOT_ROUTED`, provider requests `0`, spend USD `0`. The V1 expert-decision POST remains deployed only as a compatibility boundary; it is not V2 expert prioritization and cannot commit a niche.

## Portfolio comparison policy

- A decision-ready portfolio requires at least two evidence-comparable opportunities.
- System rank uses transparent lexicographic ordering: eligibility, Market Attractiveness, Ability to Win, then Evidence Confidence.
- Blocked opportunities remain visible with prerequisite gaps; they cannot outrank an eligible opportunity by score compensation.
- Expert priority is stored and rendered independently from system rank.
- A single researched hypothesis remains `RESEARCH_IN_PROGRESS`; it is not presented as a decision winner.
- Invalid identity, version, policy, cross-portfolio, research, audience, competitor, win-condition or score data returns `CONTRACT_INVALID` with no comparison output.

## Conditions to Win

Every opportunity must contain both:

- at least one `PREREQUISITE`, evaluated as `PASS`, `GAP` or `UNKNOWN`; and
- at least one `WINNING_CRITERION`, describing the advantage required to outperform credible competitors.

Each condition binds required capability, current capability, calculated gap, evidence, owner action, estimated time/cost and proof method. This turns “what it takes to win” into an executable capability-development and pilot agenda rather than a narrative note.

## Continuous improvement without hidden policy drift

The slice records expert reprioritization, evidence contradictions, pilot outcomes, channel outcomes, capability-gap closure and calibration drift as learning signals. A proposed change follows:

`OBSERVE → QUALIFY → PROPOSE → BACKTEST → SHADOW → EXPERT REVIEW → BOUNDED CANARY → RETAIN OR ROLLBACK`

No threshold, weight, policy, autonomy or spend ceiling promotes automatically. Historical evidence and decisions remain immutable; improved versions supersede them. QA verifies the system independently but does not repair evidence, close capability gaps or make the niche decision.

## Delivery slices

| Slice | Deliverable | Status |
|---|---|---|
| 1 | Niche Opportunity Contract V2, state machine, score/evidence/win-condition policy and contract tests | implemented |
| 2 | Read-only Niche Portfolio projection and commercial comparison UI | implemented |
| 3 | Expert hypothesis intake with append-only identity/version contract | implemented |
| 3.1 | Niche identity/granularity repair and legacy topic isolation | production deployed |
| 4 | Evidence Intelligence & Validation capability | next |
| 5 | Evidence-backed Niche Portfolio Comparison capability | pending |
| 6 | Expert Prioritization Workspace capability | pending |
| 7 | Niche Commitment & Governance capability | pending |
| 8 | Channel Strategy Activation capability | pending |

Slices 4–8 are permanent, operator-facing capabilities of the commercial tool. They require durable data contracts, APIs/domain services, commercial UI, audit/evidence lineage, automation boundaries, expert authority, metrics and governed continuous-improvement signals. They are not one-time project activities, documents or manual acceptance steps.

## Slice 1 acceptance evidence

- System-discovered and expert-seeded hypotheses use the same validation path.
- Multiple opportunities remain visible and comparable.
- Market Attractiveness, Ability to Win and Evidence Confidence remain separate; `totalScore` is explicitly null.
- A failed prerequisite blocks eligibility even with a market score of 99.
- Conditions to Win expose capability gaps and proof methods.
- Expert priority and system rank can disagree without either overwriting the other.
- Selection cannot jump directly to commitment, and Channel Strategy remains blocked.
- Duplicate or cross-portfolio inputs fail closed.
- All nine V2 commands are declared and zero-spend; only hypothesis intake is routed.
- Improvement policy cannot promote automatically.

Continuous gate: `npm run check:niche-portfolio-v2`, executed by every verified build.

## Exact next action

Implement Slice 4 as the permanent Evidence Intelligence & Validation feature. System-discovered and expert-seeded hypotheses must share the same support, contradiction and unknown workflow. Provider execution requires an approved plan, explicit source/spend ceilings and idempotency; validation alone must not grant comparison eligibility, priority, selection, commitment or Channel Strategy activation.

## Protected scope

- Only `SUBMIT_NICHE_HYPOTHESIS` is routed in Slice 3.
- The only new mutation is the append-only hypothesis/audit/lineage write from migration 0031.
- No provider request or spend.
- No replacement or reinterpretation of historical V1 records.
- No single-winner yes/no UI for V2.
- No aggregate score that can hide evidence uncertainty or compensate for a failed prerequisite.
- No automatic policy promotion and no responsibility shifted to QA.
