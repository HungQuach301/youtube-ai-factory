# Current State

**State:** `ACTIVE_CURRENT_STATE`  
**Reconciled:** 2026-08-25 (Asia/Bangkok)

## Repository and documentation

```text
REPOSITORY_POLICY = GIT_REPOSITORY_SSOT_V1
REPLICATION_POLICY = DUAL_REMOTE_SINGLE_COMMIT_SSOT_V1
SITES_REMOTE = origin/main
GITHUB_TARGET = HungQuach301/youtube-ai-factory
GITHUB_SYNC = SYNCHRONIZED
INITIAL_MIRROR_BASELINE_SHA = 2431a800d2d540bcfea141c98c9977cd46667950
EXCLUDED_REPOSITORY = HungQuach301/youtube-ai-factory-v2
DOCUMENTATION = COMPLETE_FOR_APPROVED_DESIGN_SCOPE
ARCHIVE_AUTHORITY = HISTORICAL_READ_ONLY
PHASE_45 = IN_PROGRESS__CONTRACT_FOUNDATION_IMPLEMENTED
SOURCE_MIGRATION = 0106_FACTORY_RUNTIME_CONTRACT_FOUNDATION
```

The active knowledge base is indexed by `docs/README.md`. Superseded execution records, prior roadmaps, detailed diagnostics and old snapshots are isolated under `docs/archive`; they retain audit value but have no current mutation or acceptance authority.

## Production truth

```text
CHANNEL = Hidden Systems
MARKET_LANGUAGE = US / English en-US
R21_MASTER_SHA256 = 3f968794b1d5a0c01ea924e2e61d8efd5aed072f587157d515701cf4c0213a89
R21_DURATION = 63.833 seconds
R21_AUDIO = PASS 95 / P0 0 / P1 0 / P2 2
R21_VISUAL = FAIL 67 / P0 0 / P1 2 / P2 3
R21_DISPOSITION = IMMUTABLE_REJECTED_EVIDENCE
R22 = DESIGN_ONLY__NOT_DISPATCHED
BROWSER = BLOCKED
OWNER_FREEZE = BLOCKED
RELEASE = FALSE
PUBLICATION = FALSE
```

R21 fails because settlement is not visibly completed, explanatory mechanisms remain slide-like/repetitive, mobile labels are too small, phase topology is reused and future ledger values appear prematurely. Its en-US audio PASS applies only to the exact R21 bytes and cannot authorize R22.

R22 may be append-only only from the exact R21 visual FAIL/audio PASS pair. It must implement distinct authorization, clearing and settlement mechanisms; visible merchant receipt; future-state suppression; fewer/larger mobile labels; and `Reality -> Mechanism -> Proof`. No document alone authorizes provider dispatch or Production mutation.

## Active design and implementation boundary

The Business, Technical Runtime, Visual Production, E2E Gate, Visual/Motion, AI Assurance, Data/Provider, Multi-Channel Learning and Cross-Cutting architectures are normative. Hidden Systems Visual DNA V1 and Video Quality Standard V3 govern new work.

Phase 45 migration `0106_factory_runtime_contract_foundation.sql` now defines immutable Factory-wide contract registry, canonical timebase, runtime event, Channel Visual Profile, Series/Format, Video Blueprint, Shot Contract, Scene Graph, artifact-version and dependency-invalidation records. The shared runtime library implements integer frame/sample conversion, exact Shot coverage validation, typed command/event validation, deterministic event replay and transitive stale-dependency resolution. Durable command receipts and lease/fencing mutation remain in the next slice. This is a schema and deterministic-contract foundation only; it creates no provider, render, assurance, release or publication authority.

Still required before R22:

- D1 command/event writers, projections and service integration on top of the append-only foundation;
- fenced workers, persisted dependency-stale orchestration and exact replay controls;
- Visual Grammar Resolver, Blueprint/Shot compilers and Scene Graph Renderer;
- Provider Gateway, rights/cost/idempotency reconciliation and qualified bindings;
- L0-L7 Assurance Orchestrator, judge calibration and QA Cockpit;
- retention, recovery and incident-control enforcement exercises;
- exact dual-remote verification after every material checkpoint.

## Next protected action

```text
1. Implement the Phase 45 command-receipt/event writer, lease/fencing runtime, dependency invalidation service and exact replay projection from migration `0106`.
2. Implement the Provider Gateway and compile Visual DNA -> Blueprint -> Shot Contract -> Scene Graph without revision branching.
3. Qualify exact R22 provider, visual, audio and assurance dependencies.
4. Pass zero-spend preflight and the integrated canary admission gate.
5. Compile and run R22 only after those controls create explicit Production authority.
```

Migration `0106` adds immutable schema only. This state creates no paid request, R22, Browser, release or publication authority.
