# AI Factory Master Roadmap

**State:** `ACTIVE`  
**Reconciled:** 2026-08-25

## Current position

Architecture and documentation are complete for the approved design scope. Historical plans and execution records are archived. The private GitHub mirror contains the complete canonical history and exact-SHA synchronization is proven. Runtime implementation, qualification and R22 Production remain open.

## Phase 44 — SSOT closure and repository synchronization

**Status:** `COMPLETE__SYNCHRONIZED`

Exit evidence:

- active document index contains only current authority;
- superseded/history files are isolated under `docs/archive`;
- documentation/build checks PASS and Sites checkpoint is clean;
- GitHub target is verified without importing any V2 content;
- local `HEAD`, `origin/main` and `github/main` are the same exact commit.

Exit evidence was satisfied on 2026-08-25 with verified common baseline `2431a800d2d540bcfea141c98c9977cd46667950`; later checkpoints must repeat the equality proof.

## Phase 45 — Contracts and technical runtime

**Status:** `IN_PROGRESS__ZERO_DISPATCH_GATEWAY_AND_COMPILER_DEPLOYED`

Implement:

1. append-only entities for Visual Profile, Blueprint, Shot Contract, Scene Graph, Provider/Capability Qualification, Rights, Cost, QA and Learning Promotion;
2. typed event model, canonical timebase, dependency-stale resolution, leases and fencing;
3. Provider Gateway with explicit qualified fallback, idempotency and cost/rights reconciliation;
4. Blueprint/Shot compilers, Visual Grammar Resolver and Scene Graph Renderer;
5. Evidence Lineage and L0-L7 Assurance Orchestrator;
6. Control Plane, Channel Studio, Video Engine and QA Cockpit projections;
7. retention, recovery, incident, accessibility and localization enforcement.

Exit evidence includes schema/event/timebase tests, exact replay, stale-worker rejection, provider reconciliation, rights/cost/idempotency checks, recovery exercise, exact-artifact assurance and judge qualification readiness.

Completed in the first bounded Phase 45 slice:

- migration `0106_factory_runtime_contract_foundation.sql` creates immutable Factory-wide contract, timebase, runtime event, Visual Profile, Format, Blueprint, Shot, Scene Graph, artifact-version and dependency-lineage records;
- `factory-runtime-contracts` provides deterministic integer frame/sample conversion, full-timeline Shot coverage, command/event validation, deterministic replay and transitive dependency-stale resolution;
- migration replay, append-only triggers, JSON/hash constraints, stream-version/idempotency uniqueness and deterministic runtime tests pass with zero provider requests and zero Production content mutation.

The Phase 45 foundation deployed successfully, the foundation tables are visible in live D1, and its exact source tree is synchronized across Sites and private GitHub.

Completed in the second bounded Phase 45 slice:

- migration `0107_factory_runtime_writer_and_replay.sql` adds guarded streams, monotonic fence counters, exclusive expiring leases, append-only projection checkpoints, materialized stale projections and exact replay receipts;
- `factory-runtime-writer` is the single command/event mutation path and persists both accepted and rejected decisions;
- work reservation, heartbeat, bounded orphan recovery and stale-writer rejection use lease identity plus fencing token;
- dependency invalidation materializes the full transitive stale set exactly once, while replay verifies event bytes against stored projection state;
- `/api/factory/runtime` requires SIWC plus the owner/expert allowlist, is disabled by default, refuses R22 without separate authorization and has no provider client or spend authority;
- full repository tests pass 224/224 with zero provider requests and no Production content mutation.

Deployment evidence: Sites version 514 succeeded, migration `0107` is live and the D1 overview exposes all nineteen `factory_*` tables.

Completed in the third bounded Phase 45 slice:

- migration `0108_factory_provider_gateway_and_compilers.sql` adds append-only provider, capability, binding, qualification, rights, cost-envelope, typed work-request, route-decision and compilation receipts;
- `factory-provider-gateway` accepts typed requests only, selects an exact active/healthy/schema/settings/standard/archetype/rights-qualified binding, refuses automatic fallback and returns zero dispatch/spend;
- `factory-production-compiler` deterministically resolves explicit SOURCE/MAKE/HYBRID routes and compiles frozen Visual Profile/Format plus canonical timebase into full-coverage Blueprint, Shot Contracts and Scene Graph without revision branching;
- anti-slide grammar, data-proof, treatment-duration, exact coverage, qualification and rights gates fail closed;
- compiler records, artifact lineage and route decisions commit atomically with `ArtifactMaterialized` through the fenced canonical writer;
- the authenticated API adds a separately disabled compiler action while retaining zero-spend and R22 blocks.

Evidence passes 228/228 repository tests, 10/10 targeted Gateway/compiler/writer tests, the verified Production build and documentation SSOT gate. Sites version 516 deployment `appgdep_6a8d334895008191a77bf70256460f01` succeeded, live D1 exposes all twenty-eight `factory_*` tables and the deployment-receipt commit is synchronized exactly to private GitHub. Actual provider dispatch/reconciliation, renderer workers, L0-L7 assurance and all R22 authority remain incomplete.

## Phase 46 — R22 canary

**Status:** `GATED`

Compile R22 only from the exact R21 visual FAIL/audio PASS pair after Phase 45. Pass zero-spend preflight, render the hardest 60-90 seconds through the final Production path, then run full master and L0-L7 assurance. Current owner playback remains until AI qualification separately opens exception-only authority. Publication remains separate and blocked.

## Phase 47 — Qualification and exception-only operation

Calibrate judges/providers/capabilities on blind controls and production holdouts. Progress through `AI_SHADOW`, `AI_PRIMARY_HUMAN_SAMPLE` and only then qualified exception-only operation. Revoke on drift, false-clean, rights or cost/latency failure.

## Phase 48 — Multi-channel scale and learning

Scale only qualified channel/format/capability versions. Bind performance to exact published artifacts, predictions and timecodes; require minimum evidence for promotion; preserve champion/challenger and rollback. Auto-publish remains outside this roadmap until separately governed.

## Permanent protected scope

- R21 bytes and receipts are immutable.
- R22 is not authorized by documentation alone.
- No V2 repository input.
- No silent fallback, infinite repair loop, hard-gate weakening or QA on different bytes.
- Release and publication remain separate authorities.
