# FP2 Capability Registry — execution record

Date: 2026-08-19  
Standard: `FIRST_PASS_QUALITY_V1`  
Scope: registry, fail-closed eligibility and operator projection only  
Provider calls/spend: `0 / $0`  
Golden revision created: none

## Outcome

FP2 moves quality control in front of production dispatch. A model, tool, renderer, source route, voice, soundscape, master renderer or assurance mechanism cannot be used merely because it is configured. It must have a version-matched, settings-hashed qualification against every hardest archetype required by the requested operation.

The initial state is intentionally `QUALIFICATION_REQUIRED`: the runtime contains nine capabilities, 20 hardest archetypes and 20 designed fixtures, but no fixture execution is represented as passed. Therefore every affected dispatch remains closed and Golden r10 remains forbidden.

## Canonical records

- `v7_first_pass_capabilities`: mechanism version, plane, provider/tool, stage scope, configuration, rights, cost and failure policy.
- `v7_first_pass_archetypes`: visual, audio, control and assurance problem classes with risk and minimum first-pass yield.
- `v7_first_pass_fixtures`: hardest-first inputs and required evidence.
- `v7_first_pass_qualifications`: immutable versioned outcome, settings hash, sample size, first-pass yield, P0 escapes, evidence hashes and revocation.
- `v7_first_pass_operation_requirements`: exact capability–archetype bindings for an operation/stage.
- `v7_first_pass_artifact_envelopes`: downstream lineage contract for sealed production artifacts.
- `v7_first_pass_dispatch_audits`: every eligibility decision, including blocked decisions with zero provider requests and zero spend.

## Registered capability planes

| Plane | Mechanisms | Owning stages |
|---|---|---|
| Control | control artifact compiler; ShotCueProgram compiler | 01–08 |
| Visual | rights-safe source acquisition; mixed-treatment layered compositor | 07B, 09, 11 |
| Audio | long-form narration; production music/ambience/SFX | 07A, 10, 11 |
| Master | immutable VP9/Opus render | 12–13 |
| Assurance | exact-master visual and audio confirmation | 14 |

The 20 archetypes comprise two control contracts, eight visual classes, eight audio classes and two exact-master assurance classes. Critical archetypes require first-pass yield of 97–100% as defined in the registry and always require `P0_ESCAPE_COUNT = 0`.

## Eligibility algorithm

For every active operation requirement, dispatch is eligible only when all of the following are true:

1. capability state and latest archetype qualification are `QUALIFIED`;
2. capability version and `FIRST_PASS_QUALITY_V1` match exactly;
3. the qualification has a non-empty settings hash;
4. sample size and evidence-hash coverage meet the operation floor;
5. first-pass yield meets the archetype/operation floor;
6. P0 escapes equal zero; and
7. the qualification has not been revoked.

An unknown operation has zero requirements and fails closed. A blocked decision is written to the dispatch audit before the API returns `FIRST_PASS_CAPABILITY_NOT_QUALIFIED` with `providerRequests: 0` and `spendUsd: 0`.

## Protected runtime boundaries

The guard executes before new OpenAI stage compilation, Stage 09 media production/finalization, Golden visual/audio planning or production, Golden master render, and independent visual/audio audit. Reconciliation of already-created asynchronous evidence remains separate so the system can safely close an historical job without authorizing a new request.

No old r9 output, settings, evidence hash or verdict is copied into an FP2 qualification. Golden r9 remains immutable rejected evidence.

## Operator projection

Video Engine now includes a Capability Registry view showing version, provider/tool, stage scope, qualification coverage, hardest archetypes, evidence types, yield floors and the enforced dispatch state. The Operate view advances to `FP3 · Executable Stage 07B/08 contracts`; it does not imply that registry installation equals capability qualification.

Production UI QA on v381 found that Golden r9's historical master scan omitted `motionProvenance`, causing the initial projection to retain only audio owners 07A/10 even though unresolved pixel/motion hard gaps still owned 07B/08/09. v382 corrects the fail-closed inference: when a rejected Golden has unresolved visual evidence owned by Stage 08/09, all reusable visual root owners 07B/08/09 remain open. The five-owner result is covered by regression tests both with and without historical motion-provenance telemetry.

The same browser pass observed a root-level hydration warning isolated to Video Engine, not the homepage or another async D1 route. v384 keeps the Factory shell synchronous and moves the async D1 projection into an explicit Suspense boundary with a truthful loading state. Root-attribute suppression remains limited to `<html>` and does not hide component-level mismatches. Production QA requires zero application-origin console errors after a fresh navigation.

## Next authorized action

Implement FP3 without provider dispatch: compile the frozen Stage 06/07A/07B intent into a typed, exact-duration ShotCueProgram with claim, visual, audio, rights and observable acceptance-test bindings. Golden r10, replacement production, FP4/FP5 provider calls, video #2 and auto-publish remain blocked.
