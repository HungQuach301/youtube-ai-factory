# Document 21 — Niche Evidence Sufficiency, Three-Axis Scoring & Portfolio Comparison

Last reconciled: 2026-08-15 (Asia/Bangkok)

## Product capability

Slice 5 is a permanent capability of the multi-channel tool. It consumes frozen Slice 4 expert-reviewed evidence and records a new, versioned assessment for a typed `NICHE_OPPORTUNITY`. System-discovered and expert-seeded opportunities use the same command, gates, projection and ranking policy.

Slice 5 answers three questions without collapsing them into one number:

1. Is the evidence sufficient to support a comparison?
2. What are the independent values of Market Attractiveness, Ability to Win and Evidence Confidence?
3. Which prerequisites block eligibility and which winning criteria still require capability-building?

## Canonical boundaries

- Contract: `NICHE_SCORING_COMMAND_V1` / `NICHE_SCORING_ASSESSMENT_V1`.
- Command: `POST /api/factory/niche-scoring`.
- Persistence: `niche_scoring_assessments` and `niche_scoring_assessment_audits`, migration 0033.
- Projection: `NICHE_PORTFOLIO_PROJECTION_V2.scoringAssessment`.
- UI: the Slice 5 workspace inside every opportunity dossier and the portfolio comparison matrix at `/niche-discovery`.
- Identity: SIWC-authenticated and server-allowlisted owner/expert.
- Concurrency: expected aggregate, evidence and scoring versions plus idempotency key.
- Lineage: each assessment creates a frozen `NICHE_SCORING_ASSESSMENT` evidence-lineage record.
- Actual provider requests and spend: `0` / `$0`.

## Evidence-sufficiency algorithm

The server—not the browser—computes sufficiency. A scoring assessment must bind accepted Slice 4 review-event IDs from the same opportunity and latest evidence version. Each binding is checked against its declared decision axis.

The current minimum evidence contract requires:

- accepted evidence for all three scoring axes;
- accepted evidence for prerequisites and winning criteria;
- at least one bound supporting finding;
- at least one bound contradicting finding;
- at least one bound decision-changing unknown finding;
- at least one primary source;
- no bound review with stale or unknown freshness.

Missing direction balance, primary-source coverage or freshness produces `INSUFFICIENT` and `RESEARCH_REQUIRED`. It does not silently discard the assessment; the recorded gaps become the next research input.

## Three separate axes and ranking

Each axis stores its own 0–100 score, expert basis and evidence-event bindings. The data model has no aggregate-total field. The API receipt explicitly returns `aggregateScore: null`.

Only `SUFFICIENT` assessments enter the comparable set. System rank uses a deterministic lexicographic policy:

1. eligibility tier;
2. Market Attractiveness descending;
3. Ability to Win descending;
4. Evidence Confidence descending;
5. stable channel/opportunity identity as tie-breaker.

This order is not an aggregate score. Expert priority remains a separate versioned fact and is never used to manufacture the system rank.

## Prerequisites and winning criteria

Every recorded condition contains label, status, evidence basis, closing action and proof method.

- Any prerequisite `GAP` or `UNKNOWN` is a hard block: `BLOCKED_BY_PREREQUISITE`.
- A winning-criterion gap remains visible as a capability gap and closing plan; it does not masquerade as a prerequisite.
- `ELIGIBLE` means evidence-sufficient and prerequisite-clear. It does not mean selected, committed or activated.

## Expert-in-loop and automation leverage

Automation owns identity validation, evidence binding, freshness/direction/source checks, version conflict detection, eligibility rules, deterministic ordering, audit and lineage. The expert owns scores, rationales, condition judgment, closing actions and proof methods. This keeps judgment where experience matters while making every repetitive control deterministic and scalable.

## Protected invariants

Slice 5 cannot:

- create a total score;
- write or infer expert priority;
- select or commit a niche;
- mutate `channels.niche`;
- activate Channel Strategy;
- dispatch a provider;
- rewrite Slice 4 review events;
- promote legacy V1 video topics into V2 niches.

QA verifies release evidence and invariants. It is not a repair queue and cannot change product facts to make a gate pass.

## Continuous improvement loop

Each new assessment is append-only and version-bound. Insufficient assessments preserve explicit gaps. Subsequent Slice 4 reviews increase the evidence version; the next Slice 5 assessment must bind that latest version and can measure which gaps were closed. Over time, observed channel outcomes may tune axis rubrics and thresholds through a new policy version, never by retroactively editing historical scores or evidence.

## Acceptance evidence

- 34/34 asynchronous API boundaries.
- 41/41 commercial UI static contracts.
- Canonical command tests cover idempotent replay, stale scoring version, stale evidence version, insufficient direction coverage, hard prerequisite block, successful expert-seeded comparison, zero-spend and no downstream mutation.
- 10/10 Niche Portfolio V2 groups and eight Intelligence/Niche lifecycle paths remain green.
- Production build, Sites artifact, rendered command-authentication and commercial client budgets remain enforced.

## Exact next action

After the Slice 5 production checkpoint and recovery-tested source capsule, implement Slice 6 as the permanent expert-prioritization capability. Slice 6 must rank a comparable list by an explicit expert priority fact without rewriting system rank, the three axes, evidence sufficiency or eligibility. It must not select, commit or activate a niche; those remain Slice 7 and Slice 8 boundaries.

Completed in Slice 6. Document 22 is now authoritative for expert priority and the next action.

## No-rerun list

- Do not reconstruct or rerun Slices 1–5.
- Do not reinterpret Stage 01 video candidates as niches.
- Do not use the V1 expert-decision command as V2 expert priority.
- Do not dispatch providers from hypothesis, Slice 4 or Slice 5 routes.
- Do not move commitment or Channel Strategy authority into Slice 6.
