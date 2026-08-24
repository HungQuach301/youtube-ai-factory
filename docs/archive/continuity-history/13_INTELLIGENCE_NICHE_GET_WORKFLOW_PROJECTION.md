# Intelligence & Niche — GET Workflow Projection

**Projection:** `DISCOVERY_WORKFLOW_PROJECTION_V1`  
**Compiler:** `INTELLIGENCE_NICHE_WORKFLOW_V1`  
**Source classification:** `RECONSTRUCTED_V1_INTELLIGENCE_NICHE_GET_PROJECTION_GUARD`  
**Authority:** GET remains read-only; expert-decision command context is projected for the separately authorized zero-spend POST
**Deployment:** Sites v291 / `4cd4162742795dffb52f307e65295c6293ff0a18` / succeeded

## Implemented outcome

`GET /api/factory/discovery?channel=<id>` now compiles canonical Discovery evidence into an executable workflow read model. The Niche Discovery UI exposes workflow state, readiness, decision binding, allowed next actions and the Channel Strategy handoff gate.

The projection now also exposes the authoritative evidence assessment: seven typed criteria with actual and required values, exact gaps and one readiness verdict shared by candidate cards and the workflow compiler.

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
| expert decision | latest append-only `niche_expert_decisions` aggregate version |

No timestamp, title, channel field or demo value is substituted for a missing canonical version.

## Dedicated expert-decision binding

The read model accepts the latest dedicated decision row only when all of these are true:

- `aggregate_version` equals the program aggregate version;
- action is `ACCEPT`, `REJECT` or `REQUEST_MORE_EVIDENCE`;
- channel, candidate, candidate version and evidence version are explicit columns;
- actor role/email, idempotency key and request hash are present;
- immutable rationale and reusable expert asset fields are present;
- the compiler independently verifies channel, champion and version consistency.

A malformed or stale aggregate produces `DECISION_RECONCILIATION_REQUIRED`; it cannot open the downstream gate. Legacy `v7_decision_records`, ranking and channel niche fields grant no decision authority.

## UI and operational states

- `CHANNEL_SCOPE_REQUIRED`: select one channel; no cross-channel compilation.
- `CANONICAL_PREREQUISITES_MISSING`: program, Stage 01 artifact or run version is absent.
- `DECISION_RECONCILIATION_REQUIRED`: a version-bound decision record is malformed or stale.
- `COMPILED`: the pure compiler returned a fail-closed lifecycle result.

The UI projects exact expected aggregate, decision, candidate and evidence versions for the expert command. It explicitly states zero-provider/zero-spend authority and never presents a recommendation or recorded decision as a committed channel niche.

## Verification contract

- Canonical recommendation with no bound expert decision → `EXPERT_DECISION_REQUIRED`; Channel Strategy blocked.
- Version-matched expert acceptance → `NICHE_ACCEPTED_PENDING_COMMITMENT`; typed handoff eligible while committed niche remains unchanged.
- Stale aggregate decision → reconciliation required; handoff blocked.
- Portfolio scope → channel selection required.
- Existing eight compiler lifecycle tests remain enforced during every verified build.
- Local agent preview confirmed the canonical-database failure surface remains truthful and fail-closed with no demo fallback.

## Known limitation

The decision aggregate does not mutate `channels.niche` and does not activate Channel Strategy. Those remain separate future commands and acceptance gates.

## Exact next product action

After production migration/runtime reconciliation and browser acceptance, design the separate typed niche-commitment boundary. Keep Channel Strategy activation independent.

## Protected scope

- No implicit decision from rank, score or legacy niche fields.
- No provider dispatch or paid request.
- No runtime DDL or automatic migration.
- No production QA dispatch or V23 change.
- No automatic niche commitment or Channel Strategy activation.
