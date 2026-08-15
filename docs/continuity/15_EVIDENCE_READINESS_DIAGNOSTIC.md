# Intelligence & Niche — Evidence Readiness Diagnostic V1

**Contract:** `EVIDENCE_READINESS_DIAGNOSTIC_V1`  
**Run date:** 2026-08-15 (Asia/Bangkok)  
**Trigger:** canonical production reconciliation for `channel-hidden-systems`  
**Authority:** read-only projection and compiler repair; no production command, provider request or spend

## Production evidence

The canonical channel projection returned all of the following at the same time:

- research champion `Who Really Pays for Your Credit Card Rewards?`, score 95;
- candidate label `EVIDENCE_READY_EXPERT_DECISION_REQUIRED`;
- projection integrity `READY`;
- workflow state `INSUFFICIENT_EVIDENCE`;
- no decision command and no explicit evidence-gap list.

This was a real product-state contradiction, not a responsive or visual-only issue.

## Root cause

Candidate cards derived readiness from only score, frozen Stage 01 and verified-source count. The executable workflow compiler correctly applied seven gates: champion binding, score, frozen artifact, verified sources, primary sources, resolved P0 claims and explicit contradiction review.

Two independent readiness calculations therefore allowed a candidate card to overstate authority while the workflow correctly failed closed.

## Systemic repair

- `assessIntelligenceNicheEvidence` is now the single authoritative seven-criterion assessor.
- The workflow result exposes `evidenceAssessment` with pass/fail, actual value, required value, passed count and typed gaps.
- Candidate readiness is derived from the same evidence foundation; it can no longer claim expert-decision readiness when the workflow is blocked.
- The Niche Discovery workflow gate renders the authoritative assessment accessibly and responsively.
- A blocked downstream reason names the exact typed gaps instead of the generic `Evidence readiness contract has not passed` message.

This keeps defect detection and explanation inside the owning Intelligence/Niche stage. QA remains independent assurance and is not assigned responsibility for reconstructing missing readiness evidence.

## Production verification

Sites v293 deployed successfully at commit `f61dc062617ab7107a5de5cd9e900c09d35220ae`. A direct canonical channel projection returned:

- `6/7` criteria passed;
- sole gap `CONTRADICTIONS_REVIEWED` (`Not recorded`; required `Reviewed`);
- all 17 candidates downgraded from the overstated ready label to `REVIEW_REQUIRED`;
- `decisionCommand = null`;
- downstream Channel Strategy state `BLOCKED` with the exact typed reason.

Provider requests and spend remained zero. No database or channel state was mutated.

## Protected scope

- No demo or local fallback.
- No production data mutation or runtime DDL.
- No evidence refresh, provider dispatch or spend.
- No expert decision, niche commitment or Channel Strategy activation.
- No relaxation of the seven evidence gates.

## Exact next action

Reconcile the deployed assessment against canonical production. If the only remaining gap is an absent explicit contradiction-review fact, design a separate append-only, identity-bound, zero-spend evidence-review command or ingest a valid owning-stage fact; never spoof readiness by editing the projection. Once all seven criteria pass, complete the decision-form browser/assistive/Web Vitals acceptance, then proceed to the separate typed niche-commitment command.
