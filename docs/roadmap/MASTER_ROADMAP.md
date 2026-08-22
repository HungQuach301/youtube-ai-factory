# AI Factory Master Roadmap

**State:** `ACTIVE`
**Reconciled:** 2026-08-22
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
- Wave 3 Evaluation Foundation phase 1: production-runtime accepted in Sites v393.
- Wave 3 corpus verification: production-accepted through Sites v397; all 595 candidates were read back, with 12 blocked and 63 rights-pending retained for evidence repair.
- Wave 3 blocked-evidence diagnostics: v2 production-active in Sites v400; seven source/object byte divergences and five metadata-only conflicts are proven.
- Wave 3 evidence disposition: migration `0054` is production-active in Sites v401 with exactly 7 quarantined and 5 metadata-only blocked candidates.
- Wave 3 metadata reconciliation: migration `0055` is production-active in Sites v402 with 5 accepted rebinds, 0 technical blocks and 68 rights-pending.
- Wave 3 rights reconciliation: migration `0056` is production-active in Sites v403 with 5 accepted channel-authorship receipts and 63 provider-terms-pending records.
- Wave 3 provider-family diagnostics: production-accepted in Sites v404 with 46 ElevenLabs audio and 17 no-provider records.
- Wave 3 rights evidence collection: production-accepted in Sites v405 with immutable 46/16/1 collection lanes and zero automatic PASS.
- Wave 3 owner-label workflow: production-accepted in Sites v407 with 525 exact-byte tasks, zero receipts and zero fixture promotion.
- Wave 3 correlation control: production-accepted in Sites v409; 525 immutable tasks project to 82 actionable primaries and 443 deferred correlated variants.
- Wave 3 owner-review usability: production-active in Sites v411 under `EVALUATION_OWNER_REVIEW_UX_V2`; first-owner-sample verification pending.
- Mandatory Browser assurance: production-active in Sites v414 under `BROWSER_ASSURANCE_GATE_V1` and migration `0060`; fixture playback/motion/focus pass, audio perception and zoom/reflow remain fail-closed pending owner supplementation, with zero PASS receipts.
- Factory corpus Browser QA: production-active under `FACTORY_BROWSER_QA_POLICY_V1`; the no-authority fixture passes. Migration `0066` proves and immutably corrects all 47 legacy Browser-labelled rows as structured JSON, so the current eligible audio/video queue is zero.
- Owner-review canonical form incident: root hotfix is production-active in Sites v416; the first real submission failed before receipt insertion because `NOT_APPLICABLE` confidence was undefined. Explicit-null normalization, inline error preservation and replay redirect pass 165/165 tests with zero post-deploy Worker errors; owner resubmission of sample 1 and visible transition to sample 2 are next.
- Owner-review endpoint incident: the second sample-1 submission was preserved inline, but Worker read-back proves `form.action` resolved to the hidden input and POSTed to `[object HTMLInputElement]` with 404. Sites v418 deploys attribute-based endpoint resolution from exact source `fce8dbc65da228d21b6526b5dd987716c7fdf3e6`; the collision regression and all 165/165 tests pass, post-deploy Worker errors are zero, and a fresh owner resubmission is next.

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

Status: `PHASE_11_FACTORY_BROWSER_QA_ACTIVE__JSON_MISROUTING_CORRECTED__NO_MEDIA_QUEUE`.

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

Phase 2 production evidence: Sites v395 activated migration `0053`; v396 and v397 hardened browser idempotency and redirect freshness without weakening authorization. Thirty durable runs read all 595 objects and 851,549,647 bytes. Results are 595 byte-verified, 588 checksum PASS, 583 provenance PASS, 520 rights PASS, 63 rights-pending and 12 blocked. Provider requests and spend are zero; verified/gold/release-eligible fixtures and sealed datasets remain zero. The next gate is to investigate the 12 exact failures, collect the 63 missing rights receipts, bind owner-confirmed defect labels, then remove duplicate/correlated revisions before sealing calibration data.

Phase 3 diagnostics aggregate the latest immutable receipt for each blocked candidate. Sites v399 reported 12 R2 metadata conflicts, including seven byte-size/checksum failures. Sites v400 proved seven source-hash/object-byte and source-size/object-size divergences; the other five are checksum-PASS metadata-binding failures. It also resolved the rights bases to eight incomplete-authorship and four missing-provider-terms records. Identifiers, storage keys, hashes, byte values and object metadata remain server-side; diagnostic work used zero provider request and zero spend.

Phase 4 adds migration `0054` and `EVALUATION_EVIDENCE_DISPOSITION_V1`. Sites v401 production acceptance reports twelve incidents, seven immutable quarantine dispositions, seven `EXCLUDED` and five metadata-review `BLOCKED` candidates. It deleted no object or evidence, rewrote no receipt, promoted no fixture and changed no provider/spend or release lock.

Phase 5 adds migration `0055` and `METADATA_BINDING_RECONCILIATION_V1`. Sites v402 accepted all five strict unique storage/hash rebinds and reports zero technical blocks, zero open incidents, seven quarantined and 68 rights-pending. All gold, dataset and release counts remain zero.

Phase 6 adds migration `0056`, `EVALUATION_RIGHTS_RECONCILIATION_V1` and sanitized rights-basis/modality counts. Sites v403 accepted all five bounded channel-authorship receipts. Rights PASS is 525 and the remaining queue is exactly 63 `PROVIDER_TERMS_RECEIPT_MISSING`: 46 audio, 16 master and one clip. Gold, datasets, release, provider request and spend remain unchanged. Provider-family aggregation is source-ready; production read-back must separate direct provider terms from no-provider composite masters before a collection workflow is designed.

Sites v404 completed that read-back: 46 candidates are ElevenLabs audio and 17 declare no provider, comprising 16 masters and one clip. No OpenAI, Pexels or Pixabay family is present in the open queue.

Phase 7 adds migration `0057` and `EVALUATION_RIGHTS_EVIDENCE_POLICY_V1`. It creates immutable task, provider terms/plan, exact candidate-provider binding, composite parent-rights and authorship receipt tables. Sites v405 proves exactly 46 provider, 16 composite and one authorship task while rights PASS/pending remain 525/63 and provider/spend remain unchanged. It backfilled no receipt and updated no rights to PASS.

Phase 8 adds migration `0058` and `EVALUATION_OWNER_LABEL_POLICY_V1`. Only exact byte/checksum/provenance-verified, rights-PASS candidate evidence receives a task. SIWC-authenticated owners can play/read the exact R2 bytes and must classify the complete active defect taxonomy before an immutable receipt is accepted. Sites v407 created 525 open tasks and zero receipts; 63 rights-pending and seven quarantined candidates remain outside the queue. The slice promoted no fixture, sealed no dataset and added zero request/spend.

Phase 9 adds migration `0059` and `EVALUATION_CORRELATION_CONTROL_V1`. It preserves all owner-label tasks, collapses exact-byte duplicates, groups unique revisions by shot/package artifact lineage, and routes exactly one deterministic representative per family to owner attention. Sites v409 activated the policy from source `213038f808911ce31a38a708346e9f790417c0bf`: all 525 assignments are present, 82 are actionable independent-count primaries, 443 are correlated variants deferred and zero are exact duplicates deferred. Rights remain 525 PASS / 63 pending / seven excluded; owner receipts, fixtures, datasets, provider requests and slice spend remain zero. The next gate is real owner classification of the 82 representatives in parallel with exact rights-evidence collection for the 46/16/1 lanes.

Owner-review usability hardening adds `EVALUATION_OWNER_REVIEW_UX_V2`: a three-step Vietnamese workflow, full-screen entry, media-specific owner-observable defects and server-enforced separation from rights/master-lineage evidence. Sites v411 production read-back returns the exact UX version, 82 actionable primaries, zero receipts, zero request/spend and zero Worker errors. Full regression passes 162/162 and non-SIWC access remains fail-closed at `401`; agent preview cannot enter the owner route without a local evidence fixture and owner identity. The SIWC owner must still verify the first real sample before usability acceptance closes.

Browser assurance hardening adds `BROWSER_ASSURANCE_GATE_V1` as a separate mandatory exact-master release gate. Migration `0060` creates append-only tasks and receipts; the server-rendered surface requires at least 98% continuous playback plus pause/resume/seek/end, visibility, motion, audible audio, keyboard focus, zoom/reflow and zero console errors. Browser QA discovered and resolved one runtime defect, then passed playback/motion/focus while correctly remaining blocked on audio perception and zoom/reflow. Full regression passes 164/164 with zero provider request/spend. Sites v414 deployed exact source commit `3cfc3d9ddd8d99175eee112e5943029106559256` with zero post-deploy Worker errors. The two owner-supplemented observations are next; this work does not open FP4, Golden r10 or Stage 11.

Phase 10 replaces sequential owner labor with `FACTORY_FIRST_QA_POLICY_V1`. Two owner-saved exact-byte receipts are calibration anchors. Migration `0061` creates 82 Factory tasks, append-only independent receipts, a five-item batch limit and initial hard ceilings of 82 provider requests / $6.75. Batch execution remains locked until the independent vision reviewer rediscovers every owner-present defect on both anchors. Non-image evidence is routed to mandatory Browser playback without requesting owner action. The exact next gate is production deployment, anchor read-back and two-anchor calibration; no dataset, assurance qualification or release gate is opened by this phase.

Sites v420 activated the task ledger and confirmed 82 tasks / two anchors / zero receipts. Calibration failed closed before receipt creation because the exact anchor bytes were not a supported raster image. Source migration `0062` binds a separate review-input hash and self-contained SVG-to-PNG transform while preserving the original R2 hash. The same calibration run is replayed only after `0062` is active; batch remains locked.

Sites v422 then completed Calibration V1 but missed `MOBILE_LEGIBILITY` and `PRODUCTION_RESIDUE` on both anchors, so agreement remained 0/2 and batch stayed locked. Migration `0063` preserves those receipts and versions Calibration V2 with a 360px mobile presentation rule and explicit internal-residue semantics. The cumulative request ceiling is transparently raised to 84 to include the two retained V1 calls plus two V2 calls and the original 80 pending tasks; the $6.75 ceiling is unchanged.

Sites v424 completed Calibration V2 with the same two misses on both anchors; cumulative measured usage is four provider calls and $0.06268. A direct renderer inspection confirmed that the review PNG preserves the small text and internal footer, so another prompt-only retry is not justified. Migration `0064` adds a separate immutable deterministic adjudication receipt for exactly two closed SVG conditions—declared text below the mobile floor and the known internal residue phrase—and combines those signals with the preserved V2 model receipt. The next gate is a zero-provider adjudication of the same two anchors; bounded batch execution opens only if both combined results agree with the owner anchors.

Sites v425 passed zero-provider combined calibration at 2/2 and drained all 80 non-anchor primaries through sixteen bounded batches. The raw outcomes were 33 independent likely-defect receipts and 47 fail-closed Browser-required receipts. Sites v429 production diagnostics then proved all 47 were `application/json`, not temporal/audio. Sites v430 preserves the raw receipts and adds immutable `STRUCTURED_EVIDENCE_ONLY` adjudications, leaving zero open Browser media tasks. Cumulative Factory usage remains 37 requests and $0.4314096 against ceilings of 84 and $6.75; recent error-only Worker logs are empty. No fixture, dataset, assurance or release state was promoted; rights-evidence collection and gold-set construction remain independently blocked.

Phase 11 adds `FACTORY_BROWSER_QA_POLICY_V1` and migration `0065` as a corpus-evaluation lane separate from `BROWSER_ASSURANCE_GATE_V1`. The execution surface accepts only real `audio/*` or `video/*`, preflights exact bytes and requires full visible playback, control/event ordering, audio/motion/focus/reflow/runtime checks and complete media-observable taxonomy labels before one immutable independent receipt can be stored. `UNCERTAIN` fails closed to owner attention. Migration `0066` fixes the historical route that treated every non-image as Browser media: all 47 source rows are JSON and now have preserved superseding adjudications. Sites v430 is active, tests pass 169/169, the fixture passes, the real media queue is zero and rights/gold gates remain independent.

Phase 12 production activates `WP7_REGRESSION_CORPUS_POLICY_V1` and migration `0067` in Sites v432. Direct read-back reports 35 immutable items: 33 non-anchor visual failures as `INDEPENDENT_REVIEW_ONLY` and two owner receipts as `OWNER_CONFIRMED_REFERENCE`. There are zero clean negatives, zero controlled injections and 0/5 P0 families covered, so readiness is correctly `INSUFFICIENT_GROUND_TRUTH`; dataset, assurance and release authority are all false. The verified build and 170/170 regressions pass, the slice adds zero request/spend and recent Worker errors are zero. Next is the 63-item rights lane plus bounded owner-confirmed and controlled-fixture design; FP4/FP5 remain closed.

Phase 13 adds `EVALUATION_RIGHTS_LINEAGE_DIAGNOSTIC_V1` and migration `0068`. It diagnoses the 16 composite-master tasks and one authorship/clip task from the source artifact's own provenance and explicitly refuses to treat a same-package manifest as an exact render binding. The current historical lane remains rights-pending with zero promotion authority. The Production V2 upload path is hardened for future pilot and full masters: exact manifest ID/SHA-256, R2 read-back and complete parent ID/hash reconciliation are mandatory before storage. This slice creates no provider request or spend. Production activation and exact count read-back are the next checkpoint; 46 historical ElevenLabs tasks remain a separate authoritative-terms lane.

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
