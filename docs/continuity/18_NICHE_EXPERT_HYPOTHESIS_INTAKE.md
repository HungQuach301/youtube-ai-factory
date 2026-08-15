# Niche Opportunity Portfolio V2 — Expert Hypothesis Intake

**Slice:** `03_EXPERT_HYPOTHESIS_INTAKE`  
**Command:** `SUBMIT_NICHE_HYPOTHESIS`  
**Contract:** `NICHE_HYPOTHESIS_INTAKE_V1`  
**Status:** `PRODUCTION_DEPLOYED_ZERO_SPEND_APPEND`  
**Date:** 2026-08-15 (Asia/Bangkok)
**Deployment:** Sites v299 / `a674e347731e226430c5a17956beacfb659833ff` / succeeded

## Outcome

An authorized expert can submit a niche inferred from experience or intuition without bypassing the burden of proof. The command records:

- canonical channel/program scope and expected aggregate/hypothesis versions;
- title, bounded description and immutable rationale;
- audience assumptions, demand assumptions and known competitors;
- a winning thesis;
- authenticated actor, idempotency, correlation, request hash, audit and evidence lineage.

The resulting opportunity enters `EVIDENCE_GATHERING`, remains `RESEARCH_REQUIRED`, receives no system rank or expert priority, and exposes only `PREPARE_NICHE_RESEARCH_PLAN` as its next action.

## Authority boundary

```text
provider requests = 0
spend USD = 0
comparison eligibility = false
expert priority mutation = false
niche selection = false
niche commitment = false
channels.niche mutation = false
Channel Strategy activation = false
```

Authentication uses dispatch-owned SIWC through `getChatGPTUser`. Authorization is enforced server-side with `FACTORY_EXPERT_EMAILS`. Client affordances never grant authority.

## Persistence and atomicity

Migration `0031_famous_puff_adder.sql` creates:

- `niche_hypotheses`: immutable expert inputs with unique program/hypothesis version and idempotency key;
- `niche_hypothesis_audits`: one immutable audit bound to each hypothesis.

The command batches hypothesis, audit and `v7_evidence_lineage` writes atomically. It performs no runtime DDL. Optimistic aggregate and hypothesis versions reject stale or cross-channel commands. A reused idempotency key returns the original receipt only when the request hash matches; otherwise it fails closed.

## Projection and commercial UI

`NICHE_PORTFOLIO_PROJECTION_V2` now joins the append-only hypotheses with canonical system-discovered opportunities. Expert assumptions are displayed in a dedicated `EXPERT INPUT · NOT EVIDENCE` panel and never populate market, audience, competitor or score evidence fields.

The `/niche-discovery` form supports channel selection, commercial field labels, accessible status feedback, responsive one-column collapse and an explicit zero-spend/downstream-authority statement. Submitting refreshes the portfolio so the new research-required dossier appears alongside existing opportunities.

## Acceptance evidence

- 32/32 asynchronous API boundaries.
- 31/31 commercial UI static checks.
- Contract checks: valid record, exact replay, conflicting replay, stale version and cross-channel rejection.
- Atomic append verified for hypothesis, audit and lineage.
- Projection verified: unranked, no V2 axes, no priority, research-required and next action only `PREPARE_NICHE_RESEARCH_PLAN`.
- SIWC failure is typed, no-store and zero-spend in the rendered Worker contract.
- Targeted lint, production build/artifact and 95/95 regression tests pass.
- Client budgets remain within limits: CSS 56,343/60,000; page JS 46,387/50,000; total 294,440/300,000 gzip bytes.

The approved cloud-browser surface timed out reaching the healthy agent preview, so browser hydration, interaction, accessibility, visual-regression and Web Vitals evidence remain open rather than claimed.

## Exact next action

Implement Slice 4: create a versioned research plan and a separately approved, bounded evidence-validation command for both system and expert hypotheses. It must explicitly seek support, contradiction and decision-changing unknowns, enforce source/provider/spend ceilings, and require expert evidence review before comparison eligibility.

Slice 4 is a permanent capability of the tool, followed by permanent capabilities for evidence-backed comparison (Slice 5), expert prioritization (Slice 6), niche commitment/governance (Slice 7) and Channel Strategy activation (Slice 8). None may be reduced to a one-time implementation task or manual document workflow.

## Protected scope

- No provider dispatch in Slice 3.
- No automatic research-plan completion or fabricated evidence.
- No score, system rank or expert priority for an unvalidated expert hypothesis.
- No selection, commitment, `channels.niche` mutation or Channel Strategy activation.
- No automatic policy promotion and no repair responsibility shifted to QA.
