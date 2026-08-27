# AI Factory Master Roadmap

**State:** `ACTIVE`  
**Reconciled:** 2026-08-26

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

**Status:** `IN_PROGRESS__ASSURANCE_CALIBRATION_SCHEMA_AND_QA_COCKPIT_LIVE__INTEGRITY_V2_SOURCE_QUALIFIED__DATASET_AND_R22_ADMISSION_PENDING`

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

Evidence passes 228/228 repository tests, 10/10 targeted Gateway/compiler/writer tests, the verified Production build and documentation SSOT gate. Sites version 516 deployment `appgdep_6a8d334895008191a77bf70256460f01` succeeded and live D1 exposes all twenty-eight `factory_*` tables. Exact dual-remote synchronization completed at `3d752ad907989d8ad16f9ecce092975e66767657`; the temporary workflow and bundle self-removed, trigger issue `#4` closed, and the bounded force authority expired. Sites version 520 records the completion and the forward-only exact-object protocol for later checkpoints. Actual provider dispatch/reconciliation, renderer workers, L0-L7 assurance and all R22 authority remain incomplete.

Completed in the fourth bounded Phase 45 slice:

- migration `0109_factory_scene_renderer_and_workers.sql` adds append-only qualified worker bindings, fenced render jobs and exact-byte render receipts;
- `factory-scene-graph-renderer` independently reproduces canonical per-frame semantic operation tapes from the exact Scene Graph/timebase and rejects mismatched graph/input snapshots;
- content-addressed render-tape bytes are written to R2, read back and hash/size verified before the canonical writer records artifact and `RENDERED_FROM` lineage;
- inactive, expired, settings-stale or unqualified workers fail closed; expired fences fail before storage mutation and a writer race cannot create an authoritative receipt;
- SOURCE/HYBRID nodes require exact asset-version bindings, so missing real-media inputs cannot be replaced by generic visuals;
- the authenticated action has a separately disabled renderer flag and retains zero provider requests, zero spend and the R22 block.

Evidence passes 231/231 repository tests, 13/13 focused Gateway/compiler/writer/renderer tests, the verified Production build and documentation SSOT gate. Sites version 521 deploys migration `0109`; live D1 exposes 50 user tables in total and thirty `factory_*` tables, including all three renderer tables. The output is a deterministic render tape, not a pixel/video master; asset-qualified composition, integrated canary, provider dispatch/reconciliation, L0-L7 assurance and all R22 authority remain incomplete.

Completed in the fifth bounded Phase 45 / Phase 46-admission slice:

- migration `0110_factory_asset_eligibility_and_pixel_canary.sql` adds append-only exact asset-eligibility receipts, qualified compositor bindings, composition jobs and integrated-canary receipts;
- SOURCE/HYBRID assets require materialized exact bytes, R2 read-back, current commercial rights, modification/territory scope and no stale dependency;
- the generic FFmpeg compositor consumes one exact render tape plus contiguous sealed SOURCE/MAKE/HYBRID inputs, rejects adjacent repeated motion profiles and emits deterministic VP9 WebM plus entry/midpoint/exit decoded pixels;
- canary finalization requires a qualified active worker/settings version, 60-90 second exact timebase/frame coverage, output read-back, deterministic replay hash, decoded sample hashes and an active lease/fence before atomically writing `COMPOSED_FROM` lineage;
- all new runtime actions are independently disabled by default, zero-spend and R22-blocked.

Evidence passes 235/235 repository tests, including a tracked executor fixture rendered twice to the same 60.000-second, 1,800-frame, 76,448-byte SHA-256 `cb7ff0c35a03a21f6dd5ddb6b7c72c6056e35cfbf94e15559b32ceb5150adb21`. Sites version 523 deploys migration `0110`; live D1 exposes 54 user tables and thirty-four `factory_*` tables, with zero rows in the four new tables. This proves compositor admission and local exact-repeat execution only. A bounded live non-R22 canary/recovery exercise, production-scale treatment qualification, provider reconciliation, L0-L7 assurance and every R22/release/publication authority remain incomplete.

Completed in the sixth bounded Phase 45 qualification slice:

- migration `0111_factory_live_canary_qualification.sql` adds one append-only receipt spanning exact canary output, clean success release, controlled orphan event and two PASS replay receipts;
- a fixed non-R22 runner stages the frozen WebM/PNG/SVG bytes to R2, seeds only its isolated internal qualification identities, executes compiler/render/rights/compositor through the canonical writer, releases the successful fence and reconciles one deliberately expired 30-second lease;
- canary replay, orphan reconciliation replay and both event-stream replays are idempotent; rerunning the whole qualification returns the original receipt;
- the action is separately disabled and preserves provider requests/spend at zero, while the route-level R22 block remains active.

Evidence passes 236/236 repository tests. Sites version 527 executes exactly one live non-R22 qualification canary and stores append-only receipt `factory-live-canary-qualification-6d527fcba653a020acfba9a6`. D1/R2 read-back proves exact VP9 output/read-back/replay hash `cb7ff0c35a03a21f6dd5ddb6b7c72c6056e35cfbf94e15559b32ceb5150adb21`, two PASS asset receipts, one PASS integrated canary, one released lease, one controlled orphan, two PASS replay receipts, zero provider dispatch and zero spend. The temporary writer, runner and qualification-token values were removed and the same source was redeployed at environment revision 46. No R21/R22, master, release or publication state changed.

Completed in source in the seventh bounded Phase 45 treatment-qualification slice:

- migration `0112_factory_hidden_systems_treatment_qualification.sql` adds append-only package and per-case receipts whose R22/master/release/publication authority fields are structurally zero;
- a frozen ten-case Hidden Systems corpus covers all Channel treatment families, three routes and distinct topology/motion contracts at exact 1920×1080/30fps;
- each case requires three distinct decoded semantic states, mobile/accessibility floors, future-state suppression, anti-slide proof and dataset or SOURCE/HYBRID preparation lineage;
- the deterministic qualifier binds the exact corpus, compositor settings and FFmpeg build, emits VP9 twice to the same bytes and refuses incomplete treatment, route, topology, temporal, asset-lineage or replay evidence.

Targeted qualification tests pass 5/5 and the full repository passes 241/241 with exact-repeat output SHA-256 `e6423727c7f18b59d6538fc9a097d744d59ac15e7d8011835920e91e07866d7b`, thirty distinct decoded state samples, zero provider requests and zero spend. Sites version 531 stores live package `factory-treatment-qualification-35941cd62fb0364063a1f98d` plus ten PASS case receipts. D1/R2 read back the exact 274,621-byte output and the same request returns `IDEMPOTENT_REPLAY`. The temporary writer, qualifier and credential are absent after the same-source environment-revision-50 redeployment. Exact R22 dependency admission remains pending; this evidence creates no R22, master, assurance, release or publication authority.

Completed in source in the eighth bounded Phase 45 provider-control slice:

- migration `0113_factory_provider_cost_reconciliation_and_drift.sql` adds immutable cost-reservation, provider-native request, reconciliation, drift and explicit fallback-authorization receipts;
- `factory-provider-control-plane` atomically reserves one exact route/envelope plan, preserves `UNKNOWN_SPEND_RESERVED` until the provider-native identity resolves and stores raw-response hash, usage and actual cost without granting retry;
- binding/model/settings/schema/rights/qualification drift appends a `STALE` receipt that blocks routing;
- fallback requires a separate one-time owner-approved plan pointing to the declared same-capability, active and currently qualified binding; automatic fallback remains blocked;
- all reservation, reconciliation and fallback records structurally retain zero dispatch, retry, R22, master, release and publication authority.

Evidence passes 3/3 focused provider-control tests and 244/244 repository tests plus the verified Production build and documentation gate. Sites v533 fails closed on the first compound D1 budget-trigger form before publication. The same atomic policy is split into D1-safe request/spend guards, and Sites v534 succeeds; read-back finds all five `0113` tables with zero rows while environment revision 50 retains no temporary flags. No API dispatch path, provider credential, provider request or spend is opened. Conservative reservation accounting does not auto-credit settled reservations; an explicit settlement-ledger policy is required before any future dispatch authority.

Completed in source in the ninth bounded Phase 45 Evidence/Assurance foundation slice:

- migration `0114_factory_evidence_lineage_and_assurance_foundation.sql` adds immutable exact-artifact evidence bundles/items, L0-L7 judge qualifications, shadow runs, layer receipts, decision receipts and assurance-dependency drift receipts;
- `factory-evidence-assurance` binds every observation to one frozen artifact hash, canonical frame/audio timebase, source commit, deployment/runtime version and typed provenance;
- production workers cannot PASS their own output; missing observation/runtime evidence becomes `ASSURANCE_INCOMPLETE`, while proved P0/P1 or hard-gate failure becomes `CONTENT_REJECTED`;
- model, judge, prompt, rubric, schema or sampler drift makes the exact qualification stale and blocks a later PASS receipt;
- the aggregate may record `AI_ACCEPTED` only as a candidate; the persisted outcome remains `HUMAN_ESCALATION_REQUIRED` under `ADVISORY_ONLY` until separate calibration opens acceptance authority;
- every provider dispatch, spend, automatic repair beyond one root revision, AI acceptance, R22, master, release and publication authority remains structurally zero.

Evidence passes 4/4 focused Assurance tests and 248/248 repository tests plus the verified Production build. Sites v536 deploys migration `0114`; all seven live D1 tables read back with zero rows and environment revision 50 contains no temporary writer/Assurance/R22 flags. No judge/provider call or Browser session is part of this slice.

Completed in source in the tenth bounded Phase 45 calibration/Cockpit slice:

- migration `0115_factory_assurance_calibration_and_qa_cockpit.sql` adds append-only calibration campaigns, independently labeled per-layer cases, exact dependency observations and measured results;
- a candidate requires at least twenty cases per L0-L7 layer, five blind controls, three Production holdouts, ten correlation groups, two unchanged-byte observations per case, P0 recall 100%, P1 recall at least 95%, clean precision at least 98%, zero critical false-clean, repeatability at least 95%, zero P0/P1 decision flip, timecode validity at least 95% and structured-output validity 100%;
- dependency identity is exact across judge/model/prompt/rubric/schema/sampler, and a mismatch or repeat gap remains `ADVISORY`;
- `/qa-cockpit` is a canonical fail-closed read-only projection of calibration, registered qualification, dependency drift, exact evidence, layer receipts, outcomes, cost and root routing; it substitutes no demo state;
- `QUALIFIED_CANDIDATE` is deliberately separate from registered qualification and every PASS, dispatch, R22, master, release and publication authority remains zero.

Evidence passes 4/4 focused calibration/Cockpit tests and 252/252 repository tests plus the verified application build. Sites v539 deploys migration `0115`; all four live calibration tables read back with zero rows, `/qa-cockpit` is owner-only, and environment revision 50 retains no temporary qualification/R22 flags.

Calibration integrity threshold V2 is source-qualified. It closes a false-qualification path in which correlation-group labels could mask reused artifact/evidence bytes and observations could omit execution lineage. Candidate admission now requires distinct exact bytes and evidence, distinct blind and Production holdout artifacts, owner-confirmed holdouts, no conflicting label on the same bytes, unique per-repeat receipts, raw-response hashes, reconciled cost and zero active requests. The new negative control passes inside 5/5 focused calibration/Cockpit tests and 253/253 full repository tests. The first immutable dataset and actual judge execution remain pending; no provider, qualification/PASS, R22, master, release or publication authority is created.

Migration `0116` and `FACTORY_ASSURANCE_CORPUS_ADMISSION_V1` are live in Sites v541. The first bounded inventory stores 37 exact artifacts/correlation groups across 29 calibration, five blind and three owner-confirmed holdout items. It remains truthfully `ADMISSION_INSUFFICIENT` with 31 gaps: L1 has no admitted coverage, L4 has only one admitted case, and clean/P0/holdout coverage remains below threshold in multiple layers. The same payload returns `IDEMPOTENT_REPLAY`; zero provider requests/spend and every downstream authority remain locked. The next coherent unit is to materialize the missing independent L1/L4 and clean/P0 controls before any judge execution.

Source-qualified migration `0117` and `FACTORY_ASSURANCE_CORPUS_REMEDIATION_V1` add a zero-provider, append-only remediation inventory before any new corpus admission. It discovers only unadmitted AUDIO, MASTER and PACKAGING candidates, preserves exact-byte/read-back, rights, owner-label and correlation blockers separately, and marks every work item `count_eligible=0`. The QA Cockpit V3 exposes L1/L4 targets and the blocker queue without converting historical evidence into calibration truth. Focused corpus/remediation/Cockpit tests pass; live deployment, one bounded inventory, idempotent replay and D1 read-back remain required before this slice is complete.

## Phase 46 — R22 canary

**Status:** `GATED__LIVE_RUNTIME_AND_TREATMENTS_PASS__ASSURANCE_SOURCE_FOUNDATION_READY__LIVE_D1_CALIBRATION_AND_EXACT_DEPENDENCY_ADMISSION_PENDING`

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
