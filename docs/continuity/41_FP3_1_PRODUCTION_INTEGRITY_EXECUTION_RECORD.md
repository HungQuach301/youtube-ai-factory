# FP3.1 Production Integrity Execution Record

**Class:** `EXECUTION_EVIDENCE`
**Date:** 2026-08-21 (Asia/Bangkok)
**Source state:** `IMPLEMENTED_TESTED`
**Production state:** `UNCHANGED__MIGRATION_NOT_AUTHORIZED`

## Bounded authority

Implement the Wave 1 FP3.1 source hardening in the canonical Git repository. The slice explicitly excluded production migration, Sites deployment, provider dispatch, paid qualification, Golden r10, Stage 11, publishing and historical deletion.

## Implemented contracts

1. `JCS_NFC_V1` canonical serialization rejects ambiguous values, normalizes strings to NFC, sorts normalized keys and provides one SHA-256 path for command, artifact, intent and lineage hashes.
2. Artifact `immutability_state` and `eligibility_state` are independent. Migration backfill seals historical frozen bytes but blocks every historical lineage pending reconciliation.
3. Every stage lease receives a monotonic fencing token. Mutating commands verify lease ID, stage, token, expiry and heartbeat; orphan reconciliation cannot make old work eligible.
4. Dispatch follows `RESERVE -> DISPATCH -> SETTLE/FAILED/ORPHANED`. SQLite triggers protect both concurrent reservations and measured actual ceilings.
5. Idempotency keys bind one canonical intent. A replay with the same intent is fail-closed before provider work; a different intent using the key is rejected as a collision.
6. Capability authorization compares active capability version and active settings hash, superseding stale qualifications before dispatch.
7. Stage 06 records deterministic financial Safety Scope evidence. Downstream production treats missing evidence and `NOT_EVALUATED` separately from `FAIL`, but both are ineligible.
8. Sequential executor, media and quality provider paths use the shared firewall and record lease, reservation, trace and failure-class lineage.
9. A read-only integrity projection plus owner/system heartbeat and expired-orphan reconciliation endpoint were added. It has no provider or spend authority.

## Additive schema

Migration `drizzle/0050_fp3_1_production_integrity.sql` adds artifact eligibility state, lease fencing/heartbeat fields, provider trace bindings, active capability settings hashes and four integrity ledgers:

- `v7_integrity_fence_counters`
- `v7_integrity_cost_reservations`
- `v7_integrity_dispatch_traces`
- `v7_integrity_incidents`

No production schema was changed in this session. The migration replay was isolated in memory and applied all 52 tracked SQL migrations through `0050`.

## Verification evidence

```text
TARGETED_FP2_FP3_FP3_1_TESTS = PASS_23_OF_23
FULL_MIGRATION_REPLAY = PASS_52_FILES_THROUGH_0050
FULL_REPOSITORY_TESTS = PASS_139_OF_139
VERIFIED_BUILD = PASS
DOCUMENTATION_SSOT = PASS_53_MARKDOWN_FILES
CHANGED_SCOPE_LINT = PASS_0_ERRORS_0_WARNINGS
FULL_REPOSITORY_LINT = FAIL_24_LEGACY_ERRORS_OUTSIDE_FP3_1_SCOPE
CLIENT_BUDGETS_GZIP = CSS_60971_OF_62000__PAGE_JS_46388_OF_50000__TOTAL_309913_OF_310000
CANONICALIZATION_PROPERTIES = PASS
STALE_FENCING = PASS
CONCURRENT_SQLITE_RESERVATION_CEILING = PASS
ACTUAL_COST_CEILING = PASS
IDEMPOTENT_REPLAY_PROVIDER_BLOCK = PASS
PROVIDER_REQUESTS = 0
PROVIDER_SPEND_USD = 0
```

Git remote equality and clean-worktree verification remain required at handoff; the resulting pushed Git commit is the durable identity of this record.

## Issues advanced, not closed by source alone

- Source implementation advances A1–A5, D3, D7, F5 and X1–X4.
- A6, B10, full immutable-provider-version policy, semantic/human safety, trace retention/encryption and runtime operational evidence remain open or partial.
- B1–B3, C1, F1–F4, packaging, prediction, learning closure, WP7, FP4 and FP5 are outside this slice.

## Exact next protected action

Obtain separate authority to apply migration `0050` to production without provider dispatch, read back the migrated schema and reconciled rows, exercise fencing heartbeat/orphan and blocked-firewall probes at zero spend, inspect redacted trace/incident evidence, verify production logs, then record a production-runtime checkpoint. Do not start paid FP4/FP5 or Wave 2 merely because source tests pass.
