# Intelligence & Niche Discovery — Executable Contract V1

**Contract:** `INTELLIGENCE_NICHE_WORKFLOW_V1`  
**Policy:** `INTELLIGENCE_NICHE_POLICY_V1`  
**Status:** `CONTRACT_IMPLEMENTED_ZERO_SPEND_NOT_ROUTED`  
**Source baseline:** Sites v289 / `87dae74fffc9d7388152e532efcbae6387cdaed5`  
**Deployment:** not deployed

## Outcome and scope

This contract converts the Intelligence and Niche Discovery slice from a read-only recommendation surface into a versioned, executable decision specification without activating database writes, provider calls or production commands.

It owns the boundary:

`Market/User/Competitor evidence → ranked niche recommendation → owner/expert decision → typed Channel Strategy handoff`

It does not collect evidence, call a model, persist decisions, commit a niche or activate Channel Strategy. Those actions require separately approved command handlers, migrations, runtime reconciliation and deployment evidence.

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
| `NICHE_ACCEPTED` | expert accepts matching candidate/evidence/channel versions | prepare typed Channel Strategy handoff | ready for typed handoff |

Ranking cannot create `NICHE_ACCEPTED`. A matching owner/expert decision is mandatory.

## Declared command contracts

All commands are `DECLARED_NOT_ROUTED`; this milestone grants no runtime authority.

| Command | Autonomy | Authority | Current ceilings |
|---|---|---|---|
| `REQUEST_EVIDENCE_REFRESH` | A3 bounded | system within approved policy | 1 logical attempt, 0 provider requests, USD 0 |
| `SUBMIT_EXPERT_DECISION` | A2 approval required | owner/expert | 1 logical attempt, 0 provider requests, USD 0 |
| `PROPOSE_POLICY_IMPROVEMENT` | A1 recommendation | system within policy | 1 logical attempt, 0 provider requests, USD 0 |
| `PROMOTE_POLICY_VERSION` | A2 approval required | expert + engineering | 1 logical attempt, 0 provider requests, USD 0 |

Future handlers must add idempotency key, expected aggregate version, actor identity, expiry, correlation/causation IDs and immutable decision evidence before routing.

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
| Zero-spend declaration | design is testable without hidden execution | command ceilings and `DECLARED_NOT_ROUTED` |

## Prevent, Detect and Contain

- **Prevent:** canonical IDs; version-bound evidence/decision; explicit expert role; no implicit commitment from ranking.
- **Detect:** source and P0 floors; contradiction review; stale candidate/evidence version; cross-channel decision detection.
- **Contain:** fail-closed invalid state; expert commitment gate; Channel Strategy handoff blocked until accepted.

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
- All declared commands remain zero-spend and unrouted.
- Downstream handoff is available only for version-matched expert acceptance.
- Governed promotion and demotion controls are executable contract output.
- The contract gate runs during every verified production build.

## Known limitations

- No persistence schema or migration exists for the new aggregate/decision records.
- No command API or identity/authorization handler is active.
- No provider or evidence-refresh executor is active.
- Existing `/intelligence` remains the protected V7 compatibility execution workspace.
- Commercial browser/hydration acceptance remains pending due preview-browser infrastructure timeouts.

## Exact next action

Integrate this compiler into a GET-only workflow projection using canonical Discovery data and expose the derived state/readiness/downstream gate on the existing read surfaces. Do not route any command, create a migration, deploy or dispatch a provider. Browser acceptance resumes separately when the approved browser surface is reachable.

## Protected scope

- No POST/PATCH/DELETE command handler.
- No runtime DDL, migration or canonical write.
- No provider request, spend, production QA or V23.4 dispatch.
- No automatic niche commitment or Channel Strategy activation.
- No commercial-ready claim while browser evidence remains pending.
