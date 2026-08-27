# AI-First Production Assurance

**State:** `ACTIVE_NORMATIVE__CALIBRATION_REQUIRED`
**Policy:** `AI_FIRST_PRODUCTION_ASSURANCE_V1`
**Effective:** 2026-08-24

## Objective

Every Production master is checked by AI and deterministic systems. After qualification, 90-95% of routine eligible videos should reach an acceptance or rejection outcome without the owner watching the entire video. Humans handle novel risk, disagreement, legal/rights ambiguity, new formats and publication decisions.

Production workers cannot accept their own output. All decisions bind to the exact Production bytes, deployment and policy versions.

## Assurance stack

| Layer | Scope | Required output |
|---|---|---|
| L0 Deterministic | Hash, decode, A/V sync, freeze/black frames, overflow, OCR, contrast, loudness, rights, arithmetic, layout repetition, future-state leakage, cost and active requests | Typed PASS/FAIL with measured evidence |
| L1 Claim/Factual | Promise, claims, sources, narration and visual proof | Timecoded factual findings and unobserved claims |
| L2 Visual-Semantic | Relevance, phase distinction, documentary integration, mobile legibility, composition, slide grammar and residue | Timecoded findings with frame evidence |
| L3 Temporal/Motion | Before/mid/after, causal progression, holds, repeated composition, object continuity and final payoff | Dense temporal evidence, not one contact sheet |
| L4 Audio-Native | Exact full mix, en-US pronunciation, voice consistency, pacing, prosody, seams, music/SFX and A/V timing | Exact-audio verdict and timecoded findings |
| L5 Audience/Retention | Hook, comprehension, fatigue, overload, attention risk and promise payoff | Predicted drop-off and audience-impact findings |
| L6 Browser Agent | Full Production playback, seek, pause/resume, ended state, audio presence, viewport/reflow, page errors and media identity | Browser receipt bound to exact master |
| L7 Independent Adjudicator | Structured evidence from all prior layers plus rights/cost/security | One authoritative outcome and root routing |

An infrastructure failure that prevents observation is `ASSURANCE_INCOMPLETE`, not `CONTENT_REJECTED`.

## Outcomes

- `AI_ACCEPTED`: all required evidence is complete and every authority condition passes.
- `CONTENT_REJECTED`: content or artifact fails a proved hard or critical gate.
- `HUMAN_ESCALATION_REQUIRED`: evidence is complete enough to identify a real decision but qualification, disagreement, novelty, brand, rights or legal risk requires a person.
- `ASSURANCE_INCOMPLETE`: required evidence could not be observed or a judge/runtime failed; no content verdict or downstream authority is granted.

## Auto-accept contract

`AI_ACCEPTED` requires:

- all deterministic gates PASS;
- 100% required evidence coverage;
- overall score at least 92;
- every critical dimension at least the Standard Registry floor and never below 90;
- P0=0, P1=0 and P2 within the active policy ceiling;
- visual, temporal, audio and Browser PASS;
- no critical judge disagreement;
- adjudicator confidence at least 0.92;
- rights PASS, cost reconciled and zero active provider request;
- every model, prompt, rubric, schema and evidence sampler still qualified;
- exact master hash matches the artifact presented for release.

An average score cannot compensate for factual, rights, lineage, exact-artifact, safety, accessibility or critical perceptual failure.

## Rejection and routing

Automatic rejection is required for a deterministic hard failure, proved P0, corroborated P1, exact-artifact mismatch, unknown/invalid rights, unsupported critical claim, incorrect data, uncompleted payoff or another active hard gate. The result routes to one root owner:

```text
Factory capability | Channel Visual DNA | Video Blueprint | Shot Contract
Audio | Renderer | Runtime | Rights | Data/claim | Browser surface
```

Automated repair is limited to one append-only root revision under the active plan unless a separately approved contract grants another. No infinite repair-QA loop is allowed.

## Qualification

Each judge is qualified per capability, channel, format, evidence sampler and decision role. Calibration uses immutable rejected masters, known clean controls, owner labels, controlled isolated defects and production holdouts.

Each L0-L7 calibration result must contain at least twenty independently labeled cases, five blind controls, three Production holdouts, ten independent correlation groups and two observations of unchanged exact bytes per case under one judge/model/prompt/rubric/schema/sampler identity. These are anti-correlation and repeatability admission floors, not substitutes for the quality metrics below.

Calibration threshold V2 additionally requires at least ten distinct exact artifact hashes and ten distinct evidence-bundle hashes per layer, five distinct blind-control artifacts, three distinct Production-holdout artifacts, owner-confirmed labels for every holdout, no conflicting label on the same bytes, and a unique execution receipt plus raw-response hash for each repeat. Every observation must reconcile cost and report zero active provider requests before the layer can become a candidate. Repeating one artifact under invented correlation-group names can never qualify a judge.

| Metric | Requirement |
|---|---:|
| P0 defect recall | 100% |
| P1 defect recall | at least 95% |
| Clean precision | at least 98% |
| Critical false-clean | 0 |
| Repeatability on exact bytes | at least 95% |
| P0/P1 decision flip | 0 |
| Evidence/timecode validity | at least 95% |
| Structured output validity | 100% |

Below these thresholds, a judge is `ADVISORY` and cannot write PASS. Any model, provider, prompt, rubric, schema or sampler change makes the related qualification stale until requalification.

## Automation maturity

1. `AI_SHADOW`: AI evaluates; human retains routine decision authority.
2. `AI_PRIMARY_HUMAN_SAMPLE`: AI decides first; humans review escalations, new-format firsts and a bounded sample.
3. `AI_AUTONOMOUS_EXCEPTION_ONLY`: qualified AI accepts/rejects; risk-based audit is normally about 5%.
4. `FULL_AUTOPILOT_RELEASE_READY`: qualified AI may create `RELEASE_READY`; publication remains a separate authority.

The current owner-full-playback gate remains until qualification evidence authorizes a transition. A future `QUALIFIED_AI_AUDIENCE_ACCEPTANCE_RECEIPT` may replace routine playback only for a qualified channel and format with no novel risk, disagreement or rights ambiguity.

## Receipt contract

Every verdict stores:

- exact master, audio and evidence hashes;
- source commit, deployment and runtime version;
- provider/model/version and native response ID;
- prompt, rubric, schema and sampler hashes;
- input/output usage, reservation and reconciled actual cost;
- dimension scores and P0/P1/P2/P3 findings;
- timecodes, evidence references and confidence;
- unobserved dimensions and judge disagreements;
- root repair owner and acceptance authority;
- idempotency key and full raw response exact bytes.

An incomplete receipt cannot open a downstream gate.

## Cost and retry controls

Run zero-spend checks first, then artifact-level claim/shot checks, one full visual/temporal review, one full audio review, one Browser review and one evidence-only adjudication. Call an extra judge only for disagreement.

Cache by exact hash; do not QA unchanged bytes. Reconcile provider history before retrying, preserve the same idempotency identity, reserve cost before dispatch and fail closed as `UNKNOWN_SPEND_RESERVED` when execution state is unknown.

## Factory QA Cockpit

The operator surface must show the exact master, each judge's progress and authority, evidence coverage, timecoded findings with seek, frame/audio evidence, confidence, disagreement, root owner, estimated/actual cost, escalation reason and exact next action. Summary counts must distinguish accepted, automatically rejected, escalated and assurance-incomplete videos.

The canonical `/qa-cockpit` projection reads immutable Factory calibration and Assurance receipts. It must show a truthful empty or blocked state when evidence is absent, distinguish measured `QUALIFIED_CANDIDATE` from a registered current qualification, expose dependency mismatch/drift and keep PASS authority closed. Its V3 remediation view may inventory exact candidate inputs and their byte/rights/correlation/owner-label blockers, but those work items remain count-ineligible until reviewed into a later immutable corpus snapshot. It cannot substitute legacy QA, demo rows or inferred completion.

## R22 canary

R22 is the first canary for L0-L7. Because the capability is not yet qualified, a first apparent AI PASS still requires the current owner gate or an explicit calibration decision. R22 must not inherit a PASS from R21 audio or from source-atlas inspection; every verdict binds only to R22 exact bytes.

## Current implementation boundary

Migration `0114` and `factory-evidence-assurance` implement the source-level Evidence Lineage and L0-L7 `AI_SHADOW` foundation. Evidence bundles bind a frozen artifact hash to the canonical frame/audio timebase, Git source commit, deployment/runtime versions and typed provenance. Qualification records bind the exact judge, model, prompt, rubric, schema and sampler; append-only drift observations invalidate later PASS receipts. Layer receipts enforce independent observers and preserve unobserved dimensions, while aggregate decisions keep infrastructure gaps as `ASSURANCE_INCOMPLETE` and proved hard failures as `CONTENT_REJECTED`.

This foundation deliberately has no Production acceptance authority. A fully passing run may compute candidate `AI_ACCEPTED`, but the persisted outcome remains `HUMAN_ESCALATION_REQUIRED` with `ADVISORY_ONLY` authority until judge calibration and a separately governed maturity transition succeed. Sites v539 verifies all four migration `0115` tables live and empty, the canonical QA Cockpit route deployed, owner-only access preserved and no temporary writer/Assurance/R22 flags at environment revision 50. Calibration threshold V2 hardens anti-correlation and execution-receipt admission before dataset execution. Migration `0118` and QA Cockpit remediation-evidence projection are live in Sites v545. A bounded zero-provider run reads all 66 current remediation objects (846,257,129 bytes): 62 pass exact checksum/provenance binding, four fail byte/metadata binding, and all 66 remain blocked because no current immutable rights receipt exists. The final batch replays idempotently; every count/qualification/PASS/provider/R22/master/release/publication authority and all spend remain zero. Temporary writer/evidence flags and the credential are absent at environment revision 57. Exact-evidence correction, current-rights receipts, new corpus review, dataset execution and exact qualification registration remain pending. No provider dispatch, Browser session, R22, master, release or publication action is implemented by this slice.
