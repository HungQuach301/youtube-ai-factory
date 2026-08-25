# Technical Runtime Architecture

**State:** `ACTIVE_NORMATIVE__PARTIAL_IMPLEMENTATION`
**Policy:** `FACTORY_TECHNICAL_RUNTIME_ARCHITECTURE_V1`
**Effective:** 2026-08-24

## Runtime planes

| Plane | Components | Contract boundary |
|---|---|---|
| Business/Creative | Intelligence, Channel Strategy, Content Planning, Claim Graph, Blueprint Compiler | Emits versioned intent; no provider SDK calls |
| Control | Stage Registry, typed commands, policy resolver, leases/fencing, eligibility, budget, rights | Authorizes every mutation and external dispatch |
| Production/Media | Candidate service, Visual Grammar Resolver, asset adapters, Scene Graph Renderer, audio/mix, compositor | Produces exact bytes; cannot accept its own output |
| Evidence/Assurance | Deterministic analyzers, evidence sampler, AI judges, Browser agent, adjudicator | Observes exact artifacts and writes immutable receipts |
| Learning | Prediction, analytics ingestion, experiment evaluator, promotion/rollback service | Binds outcomes to exact strategy/capability/master versions |

## Core services

- `BlueprintCompiler`: converts claim graph, script, Channel DNA and format policy into sequence and treatment assertions.
- `ShotContractCompiler`: covers the canonical duration with typed visual/audio jobs and handoffs.
- `VisualGrammarResolver`: selects qualified SOURCE/MAKE/HYBRID treatment routes.
- `ProviderGateway`: authorizes, dispatches, records and reconciles every external call.
- `SceneGraphRenderer`: deterministically renders objects, states, charts, maps, ledgers, captions and transitions.
- `MediaOrchestrator`: schedules assets, audio, composition, derivatives and integrated canary work.
- `EvidenceLineageService`: binds sources, assets, transforms, exact bytes, QA and performance.
- `AssuranceOrchestrator`: executes L0-L7 under qualification and cost policy.
- `ProjectionService`: exposes canonical state to Portfolio, Channel Studio, Video Engine and QA Cockpit.
- `LearningService`: compares prediction/actuals and creates promotion or rollback candidates.

## Typed state machine and event model

The active command vocabulary remains `START_STAGE`, `PRODUCE_ARTIFACT`, `VERIFY_ARTIFACT`, `FREEZE_STAGE` and `REOPEN_ROOT_STAGE`. Every command contains expected state/version, actor, lease/fencing token, idempotency key, intent hash, policy versions and cost/rights scope.

Canonical events are append-only:

```text
CommandAccepted | CommandRejected | WorkReserved | ProviderDispatched
ProviderReconciled | ArtifactMaterialized | ArtifactVerified | StageFrozen
DependencyStale | AssuranceStarted | FindingRecorded | VerdictRecorded
ExceptionRouted | ReleaseReady | Published | PerformanceObserved
LearningCandidateCreated | VersionPromoted | VersionRevoked | VersionRolledBack
```

Projections are derived from events and authoritative tables; frontends do not maintain editable shadow status.

## Canonical timebase

One `canonical_timebase_id` fixes frame rate, audio sample rate, duration and rounding policy. Narration clauses, audio sample ranges, shot frame ranges, captions, transitions, QA timecodes and retention events use the same conversion functions. Duration mismatch beyond one frame or one audio-sample tolerance fails closed.

## Render orchestration and fencing

Each job obtains an exclusive lease with a monotonic fencing token. Workers checkpoint bounded sub-jobs, heartbeat, reconcile active provider requests and may resume only from exact verified inputs. A stale worker cannot publish bytes, settle cost or freeze a stage. Retry preserves idempotency and never reruns completed provider work or exact bytes.

The integrated canary renders the hardest 60-90 seconds through the same production code path as the master. Canary success qualifies only its exact dependency set and does not substitute for exact-master assurance.

## Data and storage

Git owns code/contracts/docs; D1 owns operational metadata and receipts; R2 owns active media/evidence exact bytes; Drive is `USER_CONTROLLED_RECOVERY_ARCHIVE`; scratch is disposable. Every object uses content hash, stable ID, parent lineage and retention class. No filename, URL or UI row is artifact identity.

## Observability and incident evidence

Every command/job/request exposes redacted trace/span IDs, stage/video/channel identity, lease/fencing state, reservation/actual cost, provider-native ID, latency, attempt, output hash and terminal classification. Dashboards separate pending, running, unknown, failed, reconciled and accepted state.

Incident evidence preserves exact affected versions, timeline, logs without secrets, provider response identity, orphan/active work, cost exposure, containment and recovery action. Replay uses stored inputs and adapters in read-only simulation before any new mutation.

## UI architecture

| Surface | Primary truth | Key operator actions |
|---|---|---|
| Factory Control Plane | Providers, capabilities, qualifications, rights, budget, incidents and capacity | Configure envelope, qualify/revoke, reconcile, stop |
| Channel Studio | Strategy, identity, formats, Visual/Voice DNA, economics and experiments | Approve version, compare, rollback |
| Video Engine | Blueprint, stage state, contracts, assets, canary, exact master and root repair | Start/stop/resume, inspect lineage, route exception |
| Factory QA Cockpit | Exact master, judge authority, evidence, findings, cost and escalation | Seek evidence, accept/reject/escalate under authority |
| Portfolio | Channel priority, budget, capacity, risk and performance | Allocate, pause, scale or retire |

Every surface reads one canonical projection, discloses evidence limitations and fails closed; compatibility routes cannot grant current authority.

## Reliability, recovery and replay

- Queue priority, concurrency and SLA are policy-bound per capability and risk class.
- Dead-letter work remains visible and cost-reserved until reconciled.
- D1 point-in-time recovery, R2/Drive checksum reconciliation and Git recovery are tested separately.
- Recovery never marks an artifact verified without byte read-back.
- Provider/model/config drift invalidates affected caches and qualifications.
- Region/provider outage may switch only to an explicitly qualified fallback; otherwise work pauses.

## Security boundaries

Secrets are connection-scoped and server-only. Least privilege separates Production, QA and Publication connections. Logs/UI redact tokens and private provenance. Signed/identity-bound commands authorize high-impact actions; auto-publish, deletion and hard-gate weakening remain separately prohibited.

## Implementation order

1. Contracts/schema and event types.
2. Canonical timebase and dependency-stale resolver.
3. Provider Gateway and qualification/rights/cost integration. `PARTIAL: ZERO_DISPATCH_ROUTING_IMPLEMENTED`
4. Blueprint/Shot compilers and Visual Grammar Resolver. `IMPLEMENTED_FOR_DETERMINISTIC_ZERO_DISPATCH_PLANS`
5. Scene Graph Renderer, worker fencing and canary path. `PARTIAL: RENDER_TAPE, ASSET_ELIGIBILITY, FENCED PIXEL COMPOSITOR AND INTERNAL FIXTURE PROVEN; LIVE NON-R22 CANARY PENDING`
6. Evidence/Assurance orchestration and QA Cockpit. `PARTIAL: EXACT-LINEAGE L0-L7 AI_SHADOW LIVE SCHEMA IMPLEMENTED; CALIBRATION AND UI PENDING`
7. Learning, scale and rollback services.

R22 may compile only after its exact Phase 1-6 dependencies are implemented and qualified.

## Current implementation evidence

Migrations `0106`-`0114` implement the contract/timebase foundation, fenced canonical writer, append-only Provider Gateway/compiler/control records, deterministic render tape, canary compositor admission, bounded live runtime/treatment qualification receipts and the live-schema Evidence/Assurance shadow foundation. The Gateway remains `ZERO_DISPATCH`. The compiler creates Blueprint, full-duration Shot Contracts and Scene Graph; the renderer writes exact semantic tapes to R2. Asset eligibility binds exact R2 read-back to current rights. The pixel/video compositor accepts only a qualified active worker, exact tape and eligible SOURCE/HYBRID assets; it verifies 60-90 second coverage, VP9 geometry/timebase/frame count, deterministic replay hash and entry/midpoint/exit decoded pixels before atomically recording `COMPOSED_FROM` lineage, job, artifact and canary receipt. The Assurance foundation binds one frozen artifact to canonical frame/audio evidence, exact source/deployment/runtime identity, L0-L7 qualifications and immutable receipts; producer self-PASS, stale judge dependencies and infrastructure-as-content verdicts fail closed. It runs only as `AI_SHADOW`: candidate acceptance remains human escalation and every dispatch, AI acceptance, R22, master, release and publication authority is zero. Sites v536 verifies all seven `0114` tables live and empty with no temporary flags; judge calibration and QA Cockpit projections remain later work.
