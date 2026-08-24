# AI Factory Master Roadmap

**State:** `ACTIVE`  
**Reconciled:** 2026-08-24

## Current position

Architecture and documentation are complete for the approved design scope. Historical plans and execution records are archived. Runtime implementation, qualification and R22 Production remain open. GitHub mirroring is blocked only by repository access in the connected GitHub integration.

## Phase 44 — SSOT closure and repository synchronization

**Status:** `ACTIVE__GITHUB_ACCESS_REQUIRED`

Exit evidence:

- active document index contains only current authority;
- superseded/history files are isolated under `docs/archive`;
- documentation/build checks PASS and Sites checkpoint is clean;
- GitHub target is verified without importing any V2 content;
- local `HEAD`, `origin/main` and `github/main` are the same exact commit.

## Phase 45 — Contracts and technical runtime

**Status:** `NEXT__IMPLEMENTATION_REQUIRED`

Implement:

1. append-only entities for Visual Profile, Blueprint, Shot Contract, Scene Graph, Provider/Capability Qualification, Rights, Cost, QA and Learning Promotion;
2. typed event model, canonical timebase, dependency-stale resolution, leases and fencing;
3. Provider Gateway with explicit qualified fallback, idempotency and cost/rights reconciliation;
4. Blueprint/Shot compilers, Visual Grammar Resolver and Scene Graph Renderer;
5. Evidence Lineage and L0-L7 Assurance Orchestrator;
6. Control Plane, Channel Studio, Video Engine and QA Cockpit projections;
7. retention, recovery, incident, accessibility and localization enforcement.

Exit evidence includes schema/event/timebase tests, exact replay, stale-worker rejection, provider reconciliation, rights/cost/idempotency checks, recovery exercise, exact-artifact assurance and judge qualification readiness.

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
