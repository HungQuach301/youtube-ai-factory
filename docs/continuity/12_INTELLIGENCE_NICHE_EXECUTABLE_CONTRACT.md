# Intelligence & Niche Discovery — Executable Contract V1

**Contract:** `INTELLIGENCE_NICHE_WORKFLOW_V1`  
**Policy:** `INTELLIGENCE_NICHE_POLICY_V1`  
**Status:** `CONTRACT_GET_PROJECTION_AND_EXPERT_DECISION_COMMAND_IMPLEMENTED`
**Source baseline:** Sites v289 / `87dae74fffc9d7388152e532efcbae6387cdaed5`  
**Deployment:** Sites v291 / `4cd4162742795dffb52f307e65295c6293ff0a18` / succeeded

## Outcome and scope

This contract converts the Intelligence and Niche Discovery slice into a versioned, executable decision workflow. The dedicated owner/expert decision command is now routed as a zero-spend append-only write; evidence refresh, policy improvement and policy promotion remain unrouted.

Evidence readiness is owned by one seven-criterion assessment. Candidate labels, workflow state, decision-command visibility and downstream reason must derive from that same assessment; Document 15 records the production defect and repair.

It owns the boundary:

`Market/User/Competitor evidence → ranked niche recommendation → owner/expert decision → typed Channel Strategy handoff`

It does not collect evidence, call a model, commit a niche or activate Channel Strategy. Recording an expert decision persists only the decision aggregate, audit record and evidence lineage.

## Link to the eight Factory components

| Upstream/current/downstream component | Contract link |
|---|---|
| 1. Intelligence | Supplies versioned market, user, competitor, source and claim evidence |
| 2. Niche Discovery | Produces an evidence-backed research champion without committing it |
| 3. Channel Strategy | Receives a handoff only after matching expert acceptance |
| 4. Content System & Planning | Remains blocked until Channel Strategy creates an approved version |
| 5. Video Production Engine | Receives no authority from this contract |
| 6. Publishing & Distribution | Unaffected and blocked by downstream lifecycle |
| 7. Learning & Optimization | Supplies outcome, override and calibration signals to the improvement loop |
| 8. Portfolio Governance | Owns cross-channel isolation, policy promotion and autonomy ceilings |

The connection is enforced by versioned handoff and blocking states, not by UI navigation alone.

## Canonical input contract

- Portfolio ID, channel ID and aggregate version.
- Current committed niche, kept separate from recommendation.
- Versioned niche candidates and one optional research champion ID.
- Evidence version, market-artifact lifecycle, verified/primary source counts, unresolved P0 claims and contradiction-review state.
- Optional owner/expert decision bound to channel, candidate version and evidence version.
- Every expert decision must include rationale and one reusable knowledge asset.

## Lifecycle state machine

| State | Entry rule | Allowed next action | Downstream |
|---|---|---|---|
| `CONTRACT_INVALID` | missing IDs, duplicate candidate, stale version or cross-channel decision | reconcile canonical state | blocked |
| `INSUFFICIENT_EVIDENCE` | evidence floor or candidate threshold not met | bounded evidence refresh/review | blocked |
| `EXPERT_DECISION_REQUIRED` | score ≥85, frozen artifact, ≥10 verified sources, ≥3 primary sources, zero unresolved P0 and contradiction review complete | accept, reject or request more evidence | blocked |
| `MORE_EVIDENCE_REQUIRED` | expert requests additional evidence | bounded evidence refresh | blocked |
| `NICHE_REJECTED` | expert rejects matching candidate version | next candidate or evidence refresh | blocked |
| `NICHE_ACCEPTED_PENDING_COMMITMENT` | expert accepts matching candidate/evidence/channel versions | prepare separate typed niche commitment | handoff eligible; no channel mutation |

Ranking cannot create `NICHE_ACCEPTED_PENDING_COMMITMENT`. A matching owner/expert decision is mandatory, and even that decision does not mutate the committed channel niche.

## Command contracts

| Command | Autonomy | Authority | Current ceilings |
|---|---|---|---|
| `REQUEST_EVIDENCE_REFRESH` | A3 bounded | system within approved policy | 1 logical attempt, 0 provider requests, USD 0 |
| `SUBMIT_EXPERT_DECISION` | A2 approval required | SIWC-authenticated allowlisted owner/expert | routed, 1 logical attempt, 0 provider requests, USD 0 |
| `PROPOSE_POLICY_IMPROVEMENT` | A1 recommendation | system within policy | 1 logical attempt, 0 provider requests, USD 0 |
| `PROMOTE_POLICY_VERSION` | A2 approval required | expert + engineering | 1 logical attempt, 0 provider requests, USD 0 |

The routed handler requires an HTTP idempotency key, expected aggregate and decision versions, exact candidate/evidence versions, SIWC identity, a server-side expert allowlist, immutable rationale/reusable knowledge and correlation/causation lineage.

## Techniques and implementation patterns

| Technique | Purpose | Executable location |
|---|---|---|
| Contract-first domain model | lifecycle and authority exist before handlers | `lib/intelligence-niche-workflow-contract.ts` |
| Pure functional compiler | deterministic state derivation without side effects | `compileIntelligenceNicheWorkflow` |
| CQRS boundary | existing GET projections remain separate from future commands | discovery projection + declared command catalogue |
| Optimistic concurrency contract | stale candidate/evidence versions fail closed | version validation rules |
| Multi-channel isolation | a decision for another channel is rejected | `CROSS_CHANNEL_DECISION_REJECTED` |
| Evidence quality floors | quality is built into decision readiness | evidence-ready predicate |
| Expert leverage capture | every expert intervention creates reusable knowledge | `reusableAsset` requirement |
| Downstream containment | Channel Strategy cannot start from recommendation alone | typed downstream gate |
| Zero-spend command | expert intent is durable without hidden automation | routed handler with provider and spend ceilings fixed at zero |

## Prevent, Detect and Contain

- **Prevent:** canonical IDs; version-bound evidence/decision; explicit expert role; no implicit commitment from ranking.
- **Detect:** source and P0 floors; contradiction review; stale candidate/evidence version; cross-channel decision detection.
- **Contain:** fail-closed invalid state; expert-decision gate; separate typed niche-commitment boundary; separate Channel Strategy activation.

QA does not repair insufficient evidence or make the niche decision. Those responsibilities remain in Intelligence/Niche and the expert gate.

## Continuous improvement contract

### Signals

- evidence expiry or contradiction;
- expert override, rejection or reversal;
- ranking/calibration drift;
- repeated request-more-evidence patterns;
- observed niche/channel/content outcomes;
- cross-channel leakage or cost anomaly.

### Automatic proposals

- evidence refresh;
- candidate reorder within approved weights;
- rule, rubric, example, anti-pattern or evaluation-case candidate.

### Expert-controlled changes

- readiness threshold or weight;
- niche commitment or repositioning;
- policy promotion;
- autonomy or spend expansion;
- schema/code/migration change.

### Upgrade path

`OBSERVE → QUALIFY → DIAGNOSE → PROPOSE → CODIFY → BACKTEST → SHADOW → EXPERT REVIEW → BOUNDED CANARY → MONITOR → RETAIN OR ROLLBACK`

Automatic demotion occurs on severe evidence defect, calibration regression, material override increase, cross-channel leakage or cost anomaly. Historical decisions and failed evidence are superseded, never rewritten.

Each material expert intervention must emit at least one reusable rule, rubric anchor, example, anti-pattern or exception pattern so expert time increases future leverage instead of creating a permanent review queue.

## Verification

- Eight deterministic lifecycle paths pass: pending expert, accept, reject, more evidence, insufficient evidence, stale versions, cross-channel rejection and non-champion decision rejection.
- All commands remain zero-spend; only `SUBMIT_EXPERT_DECISION` is routed.
- Downstream handoff is available only for version-matched expert acceptance.
- Governed promotion and demotion controls are executable contract output.
- The contract gate runs during every verified production build.

## Known limitations

- No provider or evidence-refresh executor is active.
- Existing `/intelligence` remains the protected V7 compatibility execution workspace.
- Commercial browser/hydration acceptance remains pending due preview-browser infrastructure timeouts.

## Exact next action

See `docs/continuity/14_NICHE_EXPERT_DECISION_COMMAND.md` for the routed command. After production migration/runtime reconciliation and browser acceptance, design the separate niche-commitment command. Do not infer commitment from the decision record, route a provider or couple acceptance directly to Channel Strategy activation.

## Protected scope

- No command other than the bounded expert-decision POST.
- No runtime DDL; schema changes use inspected migrations only.
- No provider request, spend, production QA or V23.4 dispatch.
- No automatic niche commitment or Channel Strategy activation.
- No commercial-ready claim while browser evidence remains pending.
