# Production projection integrity execution record

**Class:** `EXECUTION_EVIDENCE`  
**Status:** `PRODUCTION_ACTIVE__SITES_V502`
**Date:** 2026-08-24 (Asia/Bangkok)  
**Scope:** original YouTube AI Factory only; the separate Production V2 project is excluded and untouched.

## Incident

Production had more than one frontend interpretation of the same operating chain. The canonical Audience Golden tables exposed R20 and its current visual/audio QA on the hidden `/video-engine/audience-golden` route, while `/video-engine?view=quality` still read legacy `v7_golden_sequences` and displayed an older 80.245-second master. Portfolio and channel-detail production links routed operators to `/control-plane`, and the V7/V23 stage pages could display `PASS`, `FROZEN` or `READY` without disclosing that those values were historical compatibility evidence.

This was a projection-authority defect, not missing material production. It made valid backend evidence undiscoverable and allowed stale frontend state to look current.

## Corrective architecture

- `CANONICAL_FACTORY_SURFACES` is the single registry for primary navigation.
- `/video-engine` is the only canonical production operator; `/video-engine/audience-golden` is its current exact-material sub-surface.
- `sequentialProductionProjection` now reads `audienceGoldenSnapshot` and reconciles it with legacy Golden evidence. When a current Audience Golden blueprint exists, its master identity, duration, hash, QA decisions, next action and root-stage ownership override legacy projections.
- V7/V23 routes remain available only for historical evidence and carry `HISTORICAL_COMPATIBILITY_EVIDENCE_ONLY`; they cannot grant current release eligibility.
- Portfolio, channel detail, continuity and storage settings route production work to the canonical Video Engine.

## Recurrence prevention

`npm run check:projection-integrity` is a mandatory build gate. It fails when:

1. a canonical surface links operators into `/control-plane`;
2. Video Engine stops reading `audienceGoldenSnapshot`;
3. Golden materials become undiscoverable from Video Engine;
4. the exact-material screen lacks a canonical return path; or
5. any compatibility route lacks its non-authoritative boundary notice.

Pure projection tests also prove that current Audience Golden bytes override legacy bytes and that visual, audio and Browser failures reopen the correct root stages. The existing Production V2 firewall remains mandatory and unchanged.

## R20 truth carried by the canonical projection

```text
REVISION = R20
MATERIALIZATION_ID = audience-golden-materialization-3049d7a5-2b00-4b8c-bf6b-79da41291db8
MASTER_SHA256 = 880e2fca00cd0405d5c8b604725885bc319d9dd3c69cf7a35cc9109b61a2a706
MASTER_BYTES = 17057292
DURATION = 77.1_SECONDS
PROBE = 2560x1440__30_FPS
FACTORY_VISUAL = FAIL_89__P0_0__P1_2__P2_2
FACTORY_AUDIO = PASS_95__P0_0__P1_0__P2_1
BROWSER_QA = PENDING
RELEASE_AUTHORITY = FALSE
```

## Verification and successor action

Source projection tests, the Projection Integrity Gate, full verified build, documentation check and the 16/16 V2 firewall passed. Sites v502 deployed source `a5753db44c146a51a4afc6e3e3ce46333efeccec` successfully to the owner-only Production Site. Browser preview verified canonical navigation, the Golden-material return path and the compatibility disclosure; preview D1 was intentionally empty and failed closed rather than substituting data. R20 remains rejected visual evidence. The bounded successor is now R21 under Document 78 and ADR-121; projection integrity itself grants no Browser QA, owner freeze, release or publication authority.
