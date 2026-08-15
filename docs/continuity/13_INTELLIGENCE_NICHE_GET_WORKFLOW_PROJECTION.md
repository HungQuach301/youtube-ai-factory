# Intelligence & Niche — GET Workflow Projection

**Projection:** `DISCOVERY_WORKFLOW_PROJECTION_V1`  
**Compiler:** `INTELLIGENCE_NICHE_WORKFLOW_V1`  
**Source classification:** `RECONSTRUCTED_V1_INTELLIGENCE_NICHE_GET_PROJECTION_GUARD`  
**Authority:** read-only; commands remain `DECLARED_NOT_ROUTED`

## Implemented outcome

`GET /api/factory/discovery?channel=<id>` now compiles canonical Discovery evidence into an executable workflow read model. The Niche Discovery UI exposes workflow state, readiness, decision binding, allowed next actions and the Channel Strategy handoff gate.

Portfolio scope never compiles one channel from another channel's evidence. It returns `CHANNEL_SCOPE_REQUIRED` until a single canonical channel is selected.

## Canonical version bindings

| Workflow field | Canonical source |
|---|---|
| aggregate version | `v7_program_contracts.version` |
| evidence and candidate version | Stage 01 `v7_intelligence_runs.attempt` bound through artifact `run_id` |
| candidate identity | Stage 01 artifact ID + candidate position |
| evidence lifecycle | Stage 01 artifact `lifecycle_state` |
| source floors | verified and Tier-1 source records for the selected program |
| unresolved P0 | P0 claims without verified/resolved/controlled status |
| contradiction review | explicit artifact flag or a non-empty fully resolved contradiction set |
| expert decision | strict `NICHE_EXPERT_DECISION_V1` envelope only |

No timestamp, title, channel field or demo value is substituted for a missing canonical version.

## Expert decision compatibility envelope

The read model accepts an existing `v7_decision_records` row only when all of these are true:

- `decision_code = NICHE_EXPERT_DECISION_V1`;
- `effective_version` equals the program aggregate version;
- status is `ACCEPT`, `REJECT` or `REQUEST_MORE_EVIDENCE`;
- rationale contains explicit channel, candidate, candidate version, evidence version and reusable expert asset fields;
- the compiler independently verifies channel, champion and version consistency.

A malformed or stale envelope produces `DECISION_RECONCILIATION_REQUIRED`; it cannot open the downstream gate. Legacy/pending decision rows remain evidence but grant no authority.

## UI and operational states

- `CHANNEL_SCOPE_REQUIRED`: select one channel; no cross-channel compilation.
- `CANONICAL_PREREQUISITES_MISSING`: program, Stage 01 artifact or run version is absent.
- `DECISION_RECONCILIATION_REQUIRED`: a version-bound decision record is malformed or stale.
- `COMPILED`: the pure compiler returned a fail-closed lifecycle result.

The UI explicitly shows all command contracts as declared, unrouted, zero-provider and zero-spend. It never presents a recommendation as a commitment.

## Verification contract

- Canonical recommendation with no bound expert decision → `EXPERT_DECISION_REQUIRED`; Channel Strategy blocked.
- Version-matched expert acceptance → `NICHE_ACCEPTED`; typed handoff ready.
- Stale aggregate decision → reconciliation required; handoff blocked.
- Portfolio scope → channel selection required.
- Existing eight compiler lifecycle tests remain enforced during every verified build.
- Local agent preview confirmed the canonical-database failure surface remains truthful and fail-closed with no demo fallback.

## Known limitation

There is no identity-bound expert decision command or dedicated decision schema yet. The compatibility envelope is read-only and is not a substitute for an authenticated, idempotent, audited command path.

## Exact next product action

After the production checkpoint is verified, design and implement the dedicated owner/expert decision aggregate and command boundary: SIWC identity, authorization, idempotency key, expected aggregate version, immutable rationale/reusable asset, audit lineage and zero-provider execution. Generate and inspect a migration before any database change. Keep niche commitment and Channel Strategy activation as separate commands.

## Protected scope

- No implicit decision from rank, score or legacy niche fields.
- No provider dispatch or paid request.
- No runtime DDL or automatic migration.
- No production QA dispatch or V23 change.
- No command route until identity, authorization, concurrency, audit and rollback controls pass.
