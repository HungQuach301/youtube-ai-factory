# AI Factory Master Roadmap

**State:** `ACTIVE`
**Reconciled:** 2026-08-21
**Code baseline at consolidation:** `5b669fc9230f5b012ebe4aa2c0b5c21fa50df890`

## Current position

- FP1 truthful operator projection: implemented.
- FP2 Capability Registry mechanism: implemented.
- Capability qualification content: one of 22 operation bindings qualified.
- FP3 executable ShotCueProgram: implemented and sealed with zero provider requests/spend.
- Golden r10, Stage 11, Videos 2–15 and auto-publish: blocked.
- Paid FP4 authority: not granted.
- FP3.1 source, additive migration and local regression: implemented and tested.
- FP3.1 production migration and runtime QA: not authorized and not run.
- Next implementation milestone: separately authorize and execute FP3.1 production migration plus zero-dispatch runtime QA, not paid FP4 dispatch.

## Wave 0 — Repository knowledge consolidation

Deliverables:

- Repository source-of-truth policy.
- Canonical document index and reading order.
- Master issue registry.
- Expert-assessment reconciliation.
- Target operating architecture.
- External-source migration inventory.
- Documentation integrity check.

Exit evidence: committed and pushed Git checkpoint; local HEAD equals `origin/main`; clean worktree.

## Wave 1 — FP3.1 Production Integrity

Status: `SOURCE_IMPLEMENTED_TESTED__PRODUCTION_EVIDENCE_REQUIRED`.

Scope:

1. One canonical hashing implementation and explicit input-normalization policy.
2. Lease fencing token, heartbeat and orphan reconciliation.
3. Atomic `RESERVE -> DISPATCH -> SETTLE/ORPHAN` cost control.
4. Separate immutability and eligibility state.
5. Capability/settings supersede and requalification rules.
6. Close `VQ-M0-SAFETY-SCOPE` and fail closed on `NOT_EVALUATED` M0/M1.
7. Provider dispatch firewall across every production-bearing route.
8. Redacted tracing, request lineage and incident evidence.

Exit gates:

- zero provider requests and zero spend during hardening;
- stale writer tests pass;
- concurrent reservation tests cannot exceed ceiling;
- canonicalization property tests pass;
- no unqualified dispatch path remains.

Source evidence on 2026-08-21: all 52 migrations replay through `0050`; canonicalization, stale fencing, real SQLite reservation ceilings, actual-cost ceilings, safety-state separation, settings supersede, failure taxonomy and route-firewall regressions pass. Production exit is still open because migration, production read-back, trace inspection and zero-dispatch runtime QA were not authorized. Wave 2 must not start as an active implementation slice until that checkpoint is reconciled.

## Wave 2 — Learning-ready Contract Pack

Scope:

- `ChannelIdentityContract`.
- `PackagingPromiseContract`.
- `PredictedPerformanceArtifact` composition across Stages 04, 05, 08 and 11.
- `ExperimentDefinition`, `LearningCandidate` and `PROMOTE_LEARNING` contract.
- Rights and platform-compliance schemas.
- Animatic contract and promise-to-content preflight.
- Archival/distribution master contract.

This wave changes schemas and policy only. It does not authorize paid production.

## Wave 3 — WP7 Evaluation Foundation

Scope:

1. Inventory the historical failure corpus.
2. Verify bytes, checksum, provenance, owner decision and defect labels.
3. Remove duplicate and correlated revisions from evaluation counts.
4. Create clip, shot, audio, master and packaging gold sets.
5. Add controlled defect-injected fixtures.
6. Measure precision, recall, repeatability and cost.
7. Qualify assurance only after every P0 defect family reaches its approved recall floor.

The reported 595 outputs and 15 rejected masters are candidate evidence, not automatically a gold set.

## Wave 4 — Upstream and technical standards

Scope:

- Stage 01–06 evidence, claim, differentiation, story, prediction and safety contracts.
- Channel-identity inheritance in Stage 07A/07B.
- Adaptive Stage 08 semantics and animatic acceptance.
- Compositor benchmarks for all archetypes; qualification only for Video #1 dependencies first.
- Forced-alignment and pronunciation calibration.
- Frame-rate, mix, A/V sync and technical-master policy.
- Rights-safe source acquisition and reusable-asset eligibility.

Candidate thresholds remain `CALIBRATION_REQUIRED` until fixtures prove false-positive and false-negative behavior.

## Wave 5 — FP4 and FP5 qualification

- FP4 visual capability qualification, hardest-first and dependency-ordered.
- FP5 audio capability qualification after the production-audio provider and alignment stack are approved.
- Every request passes qualification, reservation, rights and idempotency guards before dispatch.

Exit gate: every capability/archetype required by Video #1 is qualified at the active version and settings hash.

## Wave 6 — Video #1 end to end

1. Reconcile and, where authorized, regenerate upstream artifacts under the active contracts.
2. Run packaging tournament and seal the promise.
3. Seal predicted performance and run the animatic gate.
4. Produce qualified visual and audio media.
5. Edit and reconcile the final prediction.
6. Create archival master and derived distribution render.
7. Run deterministic and independent assurance, including packaging.
8. Complete owner and platform-compliance gate.
9. Publish through a typed contract.
10. Collect Stage 16 actual performance.

## Wave 7 — Learning closure

- Compare actual performance with the sealed prediction.
- Attribute results to exact strategy, identity, packaging and capability versions.
- Keep underpowered findings as `INSUFFICIENT_EVIDENCE`.
- Require consistent evidence across at least two independent videos before promotion eligibility.
- Owner-authorized promotion creates a new version; it never mutates prior strategy or standard in place.

## Wave 8 — Multi-channel scale

Before a second channel:

- portfolio queue and channel-scoped lease;
- portfolio budget arbitration;
- qualified reusable asset library;
- cross-channel rights and data isolation;
- owner attention budget;
- sampling and escalation policy;
- channel-level rollback and incident management.

## Protected scope

Until the owning wave passes, do not render Golden r10, reopen Stage 11, dispatch FP4/FP5 providers, produce Videos 2–15, enable auto-publish, delete historical evidence or open a second channel.
