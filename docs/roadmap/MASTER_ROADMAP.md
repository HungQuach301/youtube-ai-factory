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
- FP3.1 production migration: active in Sites v389 after v388 failed safely before publish and exposed the historical fencing-token backfill defect.
- FP3.1 runtime QA: zero-dispatch acceptance passed in Sites v390; Sites v391 removed the temporary QA authorization path, the environment key is absent and a retired QA header is rejected with `401`.
- Wave 2 Learning-ready Contract Pack: production-runtime accepted in Sites v392 with migration `0051` active and zero-dispatch read-back passed.
- Wave 3 Evaluation Foundation phase 1: production-runtime accepted in Sites v393; read-only corpus verification is next.

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

Status: `PRODUCTION_RUNTIME_ACCEPTED__CONTENT_SAFETY_GATE_REMAINS_BLOCKED`.

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

Source evidence on 2026-08-21: all 52 migrations replay through `0050`; canonicalization, stale fencing, real SQLite reservation ceilings, actual-cost ceilings, safety-state separation, settings supersede, failure taxonomy and route-firewall regressions pass. The first authorized production checkpoint failed safely before publish because historical leases shared the default fencing token; the corrected replay covers multiple released leases, an expired active lease and a current active lease. Sites v389 applied the corrected migration. Sites v390 read-back and zero-dispatch probes passed with unchanged provider/spend totals. Sites v391 removed the temporary QA authorization branch. Wave 1 infrastructure is accepted; the actual `VQ-M0-SAFETY-SCOPE` content state remains `NOT_EVALUATED` and blocks production dispatch. Wave 2 may proceed only as zero-spend schema, policy and regression work.

## Wave 2 — Learning-ready Contract Pack

Status: `PRODUCTION_RUNTIME_ACCEPTED__ZERO_DISPATCH`.

Scope:

- `ChannelIdentityContract`.
- `PackagingPromiseContract`.
- `PredictedPerformanceArtifact` composition across Stages 04, 05, 08 and 11.
- `ExperimentDefinition`, `LearningCandidate` and `PROMOTE_LEARNING` contract.
- Rights and platform-compliance schemas.
- Animatic contract and promise-to-content preflight.
- Archival/distribution master contract.

This wave changes schemas and policy only. It does not authorize paid production.

Evidence on 2026-08-21: `LEARNING_READY_CONTRACT_PACK_V1` defines exactly eight zero-dispatch registry entries and adds append-only persistence for channel identity, packaging promise, predicted performance, experiment definition, learning candidate/promotion receipt, rights/compliance, animatic and archival/distribution delivery. Sites v392 applied `0051`. Direct production read-back found all eight schema definitions, zero rows across all nine artifact/receipt tables, zero integrity reservations/traces, unchanged provider/spend totals and no worker errors. Validators fail closed on unsealed prediction, underpowered experiments, non-owner promotion, unevaluated compliance, failed animatic gates and invalid master lineage. No actual Video #1 artifact or runtime learning command was activated.

## Wave 3 — WP7 Evaluation Foundation

Entry gate: `PASS` — Wave 2 migration is active with eight definitions, zero request/spend delta and no protected-lock regression.

Status: `PHASE_1_PRODUCTION_RUNTIME_ACCEPTED__CORPUS_VERIFICATION_NEXT`.

Scope:

1. Inventory the historical failure corpus.
2. Verify bytes, checksum, provenance, owner decision and defect labels.
3. Remove duplicate and correlated revisions from evaluation counts.
4. Create clip, shot, audio, master and packaging gold sets.
5. Add controlled defect-injected fixtures.
6. Measure precision, recall, repeatability and cost.
7. Qualify assurance only after every P0 defect family reaches its approved recall floor.

The reported 595 outputs and 15 rejected masters are candidate evidence, not automatically a gold set.

Evidence on 2026-08-21: `EVALUATION_FOUNDATION_V1` defines six zero-spend components, candidate verification, correlation/de-duplication, blinded dataset splits, controlled-injection lineage, eleven initial defect families and per-family precision/recall/repeatability/cost results. Sites v393 applied migration `0052`. Direct live read-back reports 595 candidate artifacts, 15 rejected packages, zero verified/gold/release-eligible fixtures, zero sealed datasets and unchanged provider/spend totals. No assurance capability is qualified. Exact next gate: read back exact R2 bytes, recompute checksums, verify provenance/rights and bind owner labels before de-duplicated calibration data can be sealed.

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
