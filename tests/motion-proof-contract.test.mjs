import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const route = await readFile(new URL("../app/api/factory/material-production/route.ts", import.meta.url), "utf8");
const page = await readFile(new URL("../app/material-production/page.tsx", import.meta.url), "utf8");
const executor = await readFile(new URL("../scripts/media-executor.mjs", import.meta.url), "utf8");
const migration = await readFile(new URL("../drizzle/0020_goofy_chimera.sql", import.meta.url), "utf8");
const rightsMigration = await readFile(new URL("../drizzle/0021_material_gateway.sql", import.meta.url), "utf8");

test("motion proof is gated by frozen continuity and champion C", () => {
  assert.match(route, /checkpoint_code='CONTINUITY_HARDENING_01'/);
  assert.match(route, /lifecycle_state !== "FROZEN"/);
  assert.match(route, /status='PASS' AND winner='C'/);
  assert.match(route, /CHAMPION_C_NOT_AUTHORIZED_FOR_MOTION/);
});

test("motion renderer uses exact immutable sources and no audio", () => {
  assert.match(route, /sourceHashesMustMatch: true/);
  assert.match(route, /exactSourceCount: 3/);
  assert.match(route, /audio: "NONE"/);
  assert.match(executor, /libvpx-vp9/);
  assert.match(executor, /COMPLETE_MOTION_PROOF/);
});

test("chat-run executor uses a one-time exact-job capability", () => {
  assert.match(route, /CLAIM_EXACT_MOTION_JOB_ONCE/);
  assert.match(route, /MOTION_BOOTSTRAP_UNAUTHORIZED/);
  assert.match(route, /delete contract\.bootstrap/);
  assert.match(executor, /MOTION_EXECUTOR_BOOTSTRAP_TOKEN/);
  assert.match(executor, /CLAIM_MOTION_JOB/);
});

test("motion QA is one bounded ledgered request", () => {
  assert.match(route, /"MOTION_PROOF_QA"/);
  assert.match(route, /max_output_tokens: 4000/);
  assert.match(route, /MOTION_QA_PROVIDER_INCOMPLETE/);
  assert.match(route, /PILOT_10_SHOT_AUTHORIZATION_REQUIRED/);
});

test("motion pass opens bounded pilot before sequence proof", () => {
  assert.match(route, /AUTHORIZE_PILOT_AFTER_MOTION/);
  assert.match(route, /MOTION_PROOF_PASS_REQUIRED/);
  assert.match(route, /clean\(run\?\.status\) === "PILOT_PASS" \? "SEQUENCE_PROOF"/);
  assert.match(route, /sequence and scale remain locked/);
});

test("bounded pilot repair targets the current unmaterialized failure", () => {
  assert.match(route, /t\.status='NO_PIXEL_CHAMPION' AND f\.id IS NULL/);
  assert.match(route, /if \(failedTournament\) return failedTournament/);
  assert.match(route, /status='STORED_VERIFIED'/);
});

test("exhausted source search upgrades one unit with durable lineage", () => {
  assert.match(route, /UPGRADE_FAILED_UNIT_ARCHITECTURE/);
  assert.match(route, /SOURCE_TO_HYBRID_SPLIT_V1/);
  assert.match(route, /v7_material_unit_repairs/);
  assert.match(route, /SUPERSEDED_BY_ARCHITECTURE_REPAIR/);
  assert.match(route, /authoredLayerMustProve/);
  assert.match(route, /VALUES \(\?,\?,\?,\?,\?,'SOURCE_TO_HYBRID_SPLIT_V1','APPLIED',\?,\?,\?,\?,\?,\?\)/);
});

test("pilot unit work is protected by an atomic phase claim", () => {
  assert.match(route, /async function claimBriefPhase/);
  assert.match(route, /status NOT IN \('MATERIALIZING','QA_DISPATCHING'\)/);
  assert.match(route, /if \(await claimBriefPhase\(db, clean\(target\.id\), "QA_DISPATCHING"\)\)/);
  assert.match(route, /status IN \('MATERIALIZING','QA_DISPATCHING'\)/);
});

test("hybrid renderer repair preserves failed pixels and binds exact states", () => {
  assert.match(route, /REPAIR_FAILED_UNIT_RENDERER/);
  assert.match(route, /SEMANTIC_STATE_RENDERER_V2/);
  assert.match(route, /"MP-153": \[\["PAYMENT STATUS","PROCESSING","NOT SETTLED"\],\["VERIFICATION CHECK","CONFIRMING","NOT SETTLED"\]/);
  assert.match(route, /prior QA \$\{Number\(prior\?\.score \|\| 0\)\}\/100 and 3 frame hashes preserved/);
});

test("incomplete pixel QA gets one lineage-bound ceiling-only retry", () => {
  assert.match(route, /PREPARE_INCOMPLETE_PIXEL_QA_RETRY/);
  assert.match(route, /OUTPUT_CEILING_RETRY_ALREADY_USED/);
  assert.match(route, /retry_scope='OUTPUT_CEILING_ONLY'/);
  assert.match(route, /maxOutputTokens: 16000/);
  assert.match(route, /promptChanged: false, pixelsChanged: false/);
});

test("final composition delta preserves history and exhausts automatic repair", () => {
  assert.match(route, /REPAIR_FAILED_UNIT_COMPOSITION/);
  assert.match(route, /DOCUMENTARY_RAIL_LAYOUT_V3/);
  assert.match(route, /qaLayout: "B"/);
  assert.match(route, /noFurtherAutomaticRepair: true/);
  assert.match(route, /SEMANTIC_RENDER_DELTA/);
  assert.match(route, /"PILOT_REPAIR_BLOCKED"/);
});

test("motion proof state has a durable migration", () => {
  assert.match(migration, /CREATE TABLE `v7_motion_proofs`/);
  assert.match(migration, /`source_hashes_json` text NOT NULL/);
  assert.match(migration, /`provider_response_id` text/);
});

test("rights evidence repair preserves the failed audit before re-adjudication", () => {
  assert.match(route, /MOTION_RIGHTS_BUNDLE_V1/);
  assert.match(route, /MOTION_RIGHTS_REPAIR_SCOPE_MISMATCH/);
  assert.match(route, /prior QA \$\{Number\(proof\.score\)\}\/100 preserved · no new QA request dispatched/);
  assert.match(route, /PREPARE_MOTION_RIGHTS_REPAIR/);
  assert.match(rightsMigration, /CREATE TABLE `v7_motion_audits`/);
  assert.match(rightsMigration, /`evidence_bundle_hash` text NOT NULL/);
});

test("motion QA receives verified rights lineage without changing pixels", () => {
  assert.match(route, /Rights and provenance are registry evidence, not audience-facing content/);
  assert.match(route, /RIGHTS AND PROVENANCE RECORD · SHA-256/);
  assert.match(route, /MOTION_RIGHTS_SOURCE_INVALID/);
  assert.match(route, /storageStatus: clean\(file\.status\)/);
});

test("commercial reliability baseline quarantines production and compiles hardest-first archetypes", () => {
  assert.match(route, /STAGE09_RELIABILITY_BASELINE_V2/);
  assert.match(route, /QUALIFY_RELIABILITY_BASELINE/);
  assert.match(route, /PRODUCTION_EXECUTION_QUARANTINED/);
  assert.match(route, /TRANSACTION_STATE_PROOF/);
  assert.match(route, /MP_153_QUALIFICATION_FIXTURE_MISSING/);
  assert.match(route, /generic stock rejected/);
  assert.match(route, /neutral confirmation/);
  assert.match(route, /ARCHETYPE_CERTIFICATION_REQUIRED/);
});

test("hardest-first certification uses owned controlled-state pixels and one scoped QA", () => {
  assert.match(route, /BUILD_HARDEST_ARCHETYPE_CERTIFICATION/);
  assert.match(route, /CONTROLLED_TRANSACTION_STATE_UI_V1/);
  assert.match(route, /THREE_DISTINCT_FRAMES/);
  assert.match(route, /ARCHETYPE_CERTIFICATION_QA/);
  assert.match(route, /REPAIR_HARDEST_ARCHETYPE_CERTIFICATION/);
  assert.match(route, /THREE_DISTINCT_SEMANTIC_STATES/);
  assert.match(route, /NEGATIVE_STATE_ALL_FRAMES/);
  assert.match(route, /QUALITY_PLATEAU_REDESIGN_REQUIRED/);
  assert.match(route, /phase\.startsWith\("ARCHETYPE_CERTIFICATION"\)/);
  assert.match(route, /every\(\(key\) => Number\(result\[key\]\) >= 90\)/);
  assert.match(route, /production execution remains frozen/);
});

test("remaining archetypes certify in risk order with one scoped request at a time", () => {
  assert.match(route, /ARCHETYPE_CERTIFICATION_ORDER/);
  assert.match(route, /SOURCE_AUTHORED_HYBRID/);
  assert.match(route, /RIGHTS_SENSITIVE/);
  assert.match(route, /MOBILE_TEXT_INTENSIVE/);
  assert.match(route, /BUILD_NEXT_ARCHETYPE_CERTIFICATION/);
  assert.match(route, /RUN_NEXT_ARCHETYPE_QA/);
  assert.match(route, /POLL_NEXT_ARCHETYPE_QA/);
  assert.match(route, /NO_ACTIVE_ARCHETYPE_QA_TO_POLL/);
  assert.match(route, /REPAIR_NEXT_ARCHETYPE_CERTIFICATION/);
  assert.match(route, /REGISTERED_PROVENANCE/);
  assert.match(route, /improvement >= 3/);
  assert.match(route, /MOBILE_TEXT_PORTRAIT_V2/);
  assert.match(route, /PORTRAIT_540X960/);
  assert.match(route, /RECONCILED_WATERFALL_V2/);
  assert.match(route, /SIGNED_COMPONENTS/);
  assert.match(route, /ORDERED_PROCESS_ROUTE_V2/);
  assert.match(route, /SPECIFIC_NAMED_ENDPOINTS/);
  assert.match(route, /CONCRETE_DECISION_STAGE/);
  assert.match(route, /PRIMITIVE_ARROWHEADS/);
  assert.match(route, /ABSTRACT_THREAD_METAPHOR_V2/);
  assert.match(route, /CONCRETE_THREAD_METAPHOR/);
  assert.match(route, /SAME_OBJECT_TRANSFORMS/);
  assert.match(route, /TANGLE_SORT_CLEAR/);
  assert.match(route, /RECONCILE_ARCHETYPE_ATTEMPT_LIMITS/);
  assert.match(route, /attempt>=2 AND status='REPAIR_REQUIRED'/);
  assert.match(route, /QUALITY_FLOOR_REDESIGN_REQUIRED/);
  assert.match(route, /reusableFrameSet/);
  assert.match(route, /QA_ENTRY/);
  assert.match(route, /MOTION_ENTRY/);
  assert.match(route, /source_hashes_json FROM v7_motion_proofs/);
  assert.match(route, /e\.evidence_type='SOURCE_FRAME_SET'/);
  assert.match(route, /a\.status='PASS'/);
  assert.match(route, /lineage\.length === 3/);
  assert.match(route, /\["SOURCE_AUTHORED_HYBRID", "RIGHTS_SENSITIVE"\]\.includes\(archetype\)/);
  assert.doesNotMatch(route.match(/async function reusableFrameSet[\s\S]*?return \[\] as Row\[\];\n}/)?.[0] || "", /b\.route='HYBRID'/);
  assert.match(route, /ACTIVE_REMOTE_REQUESTS_MUST_FINISH_FIRST/);
  assert.match(route, /production execution remains frozen/);
});

test("data visualization V3 is a new audited design scope rather than attempt three", () => {
  assert.match(route, /v7_archetype_design_authorizations/);
  assert.match(route, /AUTHORIZE_DATA_VISUALIZATION_V3/);
  assert.match(route, /RECONCILED_WATERFALL_PRIMITIVES_V3/);
  assert.match(route, /DATA_VISUALIZATION_V2_BLOCKED_90_EVIDENCE_REQUIRED/);
  assert.match(route, /NEW_DESIGN_SCOPE_NOT_RETRY/);
  assert.match(route, /PRIMITIVE_OPERATORS/);
  assert.match(route, /CONNECTOR_TOPOLOGY/);
  assert.match(route, /GLYPH_SET_CLOSED/);
  assert.match(route, /ARITHMETIC_RECONCILIATION/);
  assert.match(route, /100\+10-5/);
  assert.match(route, /attempt,created_at,updated_at\) VALUES \(\?,\?,\?,\?,\?,\?,\?,\?,\?,\?,\?,\?,1,\?,\?\)/);
});

test("8 of 8 certification closes with zero-spend regression before pilot", () => {
  assert.match(route, /v7_archetype_regressions/);
  assert.match(route, /RUN_ARCHETYPE_REGRESSION/);
  assert.match(route, /EIGHT_ARCHETYPES_CERTIFIED/);
  assert.match(route, /LATEST_CERTIFICATIONS_PASS/);
  assert.match(route, /DIMENSION_FLOORS/);
  assert.match(route, /FRAME_HASH_INTEGRITY/);
  assert.match(route, /ZERO_SPEND_PILOT_REPLAY/);
  assert.match(route, /V3_DESIGN_AUDIT/);
  assert.match(route, /ARCHETYPE_REGRESSION_V2/);
  assert.match(route, /REQUEST_SCOPED_IDEMPOTENCY/);
  assert.match(route, /scoped_total/);
  assert.match(route, /immutable legacy rows excluded/);
  assert.match(route, /PILOT_READY_NOT_STARTED/);
});

test("controlled canary V2 binds certified artifacts and preserves failed V1", () => {
  assert.match(route, /CONTROLLED_CANARY_V2_PROMOTED_BINDING/);
  assert.match(route, /LEGACY_CONTROLLED_CANARY_VERSION = "CONTROLLED_CANARY_V1"/);
  assert.match(route, /v7_pilot_canaries/);
  assert.match(route, /v7_artifact_promotions/);
  assert.match(route, /PROMOTION_BINDING_REGRESSION_V1/);
  assert.match(route, /AUTHORIZE_CONTROLLED_CANARY/);
  assert.match(route, /ARCHETYPE_REGRESSION_PASS_100_REQUIRED/);
  assert.match(route, /PILOT_REPLAY_10_OF_10_ZERO_SPEND_REQUIRED/);
  assert.match(route, /CERTIFICATION_TO_PRODUCTION_BINDING/);
  assert.match(route, /BOUND_HASH_CONGRUENCE/);
  assert.match(route, /UNIT_CONTRACT_CONGRUENCE/);
  assert.match(route, /CANARY_ARTIFACT_READINESS/);
  assert.match(route, /NO_LEGACY_FALLBACK/);
  assert.match(route, /CANARY_V2_ZERO_SPEND_PREFLIGHT_FAILED/);
  assert.match(route, /CANARY_PROMOTED_PIXEL_QA/);
  assert.match(route, /execution_state='CANARY_ONLY'/);
  assert.match(route, /CANARY_DISPATCH_FIREWALL/);
  assert.match(route, /CANARY_CONCURRENCY_LIMIT/);
  assert.match(route, /START_CONTROLLED_CANARY_UNIT/);
  assert.match(route, /UNIT_PASS_REVIEW/);
  assert.match(route, /RELEASE_NEXT_CONTROLLED_CANARY_UNIT/);
  assert.match(route, /EXPLICIT_NEXT_UNIT_RELEASE_REQUIRED/);
  assert.match(route, /CANARY_UNIT_GATE_FAILED/);
  assert.match(route, /SEQUENCE_PROOF_READY_NOT_STARTED/);
});

test("controlled canary V3 materializes exact unit contracts without reusing certification pixels", () => {
  assert.match(route, /CONTROLLED_CANARY_V3_UNIT_SPECIFIC_ARTIFACT/);
  assert.match(route, /v7_unit_materializations/);
  assert.match(route, /UNIT_SEMANTIC_MANIFEST_V1/);
  assert.match(route, /CERTIFIED_RENDERER_UNIT_ADAPTER_V1/);
  assert.match(route, /AUTHORIZE_CONTROLLED_CANARY_V3/);
  assert.match(route, /FAILED_CANARY_V2_AUDIT_REQUIRED/);
  assert.match(route, /SEMANTIC_MANIFEST_CONGRUENCE/);
  assert.match(route, /UNIT_SPECIFIC_PIXELS/);
  assert.match(route, /NO_CERTIFICATION_PIXEL_REUSE/);
  assert.match(route, /CANARY_V3_ZERO_SPEND_PREFLIGHT_FAILED/);
  assert.match(route, /CANARY_UNIT_SPECIFIC_PIXEL_QA/);
  assert.match(route, /certificationPixelsReused: false/);
  assert.match(route, /sequenceProof: "BLOCKED"/);
  assert.match(route, /productionScale: "BLOCKED"/);
});

test("controlled canary V4 derives dispatch authority from one versioned capability contract", () => {
  assert.match(route, /CONTROLLED_CANARY_V4_CAPABILITY_BOUND_DISPATCH/);
  assert.match(route, /CANARY_DISPATCH_CAPABILITIES/);
  assert.match(route, /CANARY_HANDOFF_REGRESSION_V2/);
  assert.match(route, /AUTHORIZE_CONTROLLED_CANARY_V4/);
  assert.match(route, /FAILED_CANARY_V3_AUDIT_REQUIRED/);
  assert.match(route, /V3_UNIT_ARTIFACT_REPROMOTION/);
  assert.match(route, /DISPATCH_CAPABILITY_CONGRUENCE/);
  assert.match(route, /LEASE_HANDOFF_DRY_RUN/);
  assert.match(route, /CANARY_V4_ZERO_SPEND_PREFLIGHT_FAILED/);
  assert.match(route, /CANARY_DISPATCH_CAPABILITY_MISMATCH/);
  assert.match(route, /CANARY_AUDIT_CAPABILITY_MISMATCH/);
  assert.match(route, /capability\?\.phase === phase/);
  assert.match(route, /controlledCanaryAudit/);
  assert.match(route, /currentAudit:/);
});

test("controlled canary V5 binds MP-001 to certified source evidence behind an explicit release interlock", () => {
  assert.match(route, /CONTROLLED_CANARY_V5_SOURCE_BOUND_MATERIALIZATION/);
  assert.match(route, /UNIT_MATERIALIZATION_STRATEGY_REGISTRY_V2/);
  assert.match(route, /SOURCE_BOUND_COMPOSITE_CHAMPION_V1/);
  assert.match(route, /CANARY_MATERIALIZATION_REGRESSION_V2/);
  assert.match(route, /AUTHORIZE_CONTROLLED_CANARY_V5/);
  assert.match(route, /FAILED_CANARY_V4_84_AUDIT_REQUIRED/);
  assert.match(route, /CANARY_V5_COMPOSITE_C_PASS_REQUIRED/);
  assert.match(route, /CANARY_V5_SOURCE_EVIDENCE_PASS_REQUIRED/);
  assert.match(route, /CANARY_V5_MOTION_PROOF_PASS_REQUIRED/);
  assert.match(route, /MATERIALIZATION_STRATEGY_CONGRUENCE/);
  assert.match(route, /MP001_SOURCE_BOUND_COMPOSITE/);
  assert.match(route, /SOURCE_LINEAGE_READBACK/);
  assert.match(route, /EXPLICIT_RELEASE_INTERLOCK/);
  assert.match(route, /READY_FOR_EXPLICIT_UNIT_RELEASE/);
  assert.match(route, /RELEASE_CONTROLLED_CANARY_V5_UNIT/);
  assert.match(route, /CANARY_V5_ZERO_SPEND_PREFLIGHT_FAILED/);
  assert.match(page, /Authorize Canary V5 preflight/);
  assert.match(page, /Release V5 MP-001 · max \$1/);
  assert.match(page, /canaryAction\("RELEASE_CONTROLLED_CANARY_V5_UNIT"\)/);
  assert.match(page, /data\.canary\.version === "CONTROLLED_CANARY_V5_SOURCE_BOUND_MATERIALIZATION"/);
  assert.match(page, /data\.canary\.currentIndex !== 0/);
  assert.doesNotMatch(page, /data\?\.canary\?\.status !== "AUTHORIZED"/);
});

test("Recovery Lane replays the failed V5 handoff through an atomic zero-spend sink", () => {
  assert.match(route, /CANARY_RECOVERY_LANE_V1/);
  assert.match(route, /BUILD_CANARY_RECOVERY_LANE/);
  assert.match(route, /PRODUCTION_EXECUTION_QUARANTINED/);
  assert.match(route, /EXECUTION_STATE_CAPABILITY/);
  assert.match(route, /v7_canary_recovery_sessions/);
  assert.match(route, /v7_canary_transition_events/);
  assert.match(route, /v7_canary_request_intents/);
  assert.match(route, /v7_canary_outbox/);
  assert.match(route, /DETERMINISTIC_DRY_RUN_SINK/);
  assert.match(route, /READY_FOR_PRODUCTION_RECOVERY_PROBE/);
  assert.match(route, /DUPLICATE_RELEASE/);
  assert.match(route, /OUTBOX_DISPATCH_FAILURE/);
  assert.match(route, /CANARY_RECOVERY_ZERO_SPEND_INVARIANT_FAILED/);
  assert.match(page, /Build Recovery Lane E2E · \$0/);
  assert.match(page, /Run Production Recovery Probe · MP-001 · max \$1/);
  assert.match(page, /RELEASE_PRODUCTION_RECOVERY_PROBE/);
  assert.match(route, /releaseProductionRecoveryProbe/);
  assert.match(route, /PRODUCTION_RECOVERY_PROBE_CANONICAL_SNAPSHOT_DRIFT/);
  assert.match(route, /PRODUCTION_RECOVERY_PROBE_MP001_ONLY/);
  assert.match(route, /PRODUCTION_COMMITTED/);
  assert.match(route, /PRODUCTION_DISPATCHED/);
  assert.match(route, /autoRetry: false/);
  assert.match(route, /nextUnitDispatch: false/);
  assert.match(route, /PRODUCTION_RECOVERY_CONTRACT_ALIGNMENT_V1/);
  assert.match(route, /buildRecoveryContractAlignment/);
  assert.match(route, /SOURCE_BOUND_COMPOSITE_MANIFEST_V2/);
  assert.match(route, /ALIGNED_UNIT_CONTRACT/);
  assert.match(route, /sourceContractHash/);
  assert.match(route, /alignedContractHash/);
  assert.match(route, /releaseContractAlignedRecoveryProbe/);
  assert.match(route, /reconcileContractAlignedRecoveryTerminal/);
  assert.match(route, /RECONCILE_CONTRACT_ALIGNED_RECOVERY_TERMINAL/);
  assert.match(route, /LEGACY_TERMINAL_EVENT_ID_COLLISION/);
  assert.match(route, /ZERO_SPEND_RECONCILIATION/);
  assert.match(page, /Build MP-001 contract alignment · \$0/);
  assert.match(page, /Run contract-aligned MP-001 probe · max \$1/);
  assert.match(page, /Reconcile request 82 terminal · \$0/);
  assert.match(page, /Seal MP-001 recovery checkpoint · \$0/);
  assert.match(route, /RECOVERY_PASS_REVIEW/);
  assert.match(route, /FULL_QUEUE_BINDING_REQUIRED_BEFORE_NEXT_UNIT/);
});

test("Release Train seals MP-001, batches zero-spend G0/G1 and opens only MP-002 sequence proof", () => {
  assert.match(route, /RELEASE_TRAIN_V1_SHOT_CONTRACT_QA/);
  assert.match(route, /SHOT_CONTRACT_PIXEL_QA_V1/);
  assert.match(route, /BUILD_RELEASE_TRAIN_PREFLIGHT/);
  assert.match(route, /RELEASE_RELEASE_TRAIN_SEQUENCE_PROOF/);
  assert.match(route, /START_RELEASE_TRAIN_BATCH/);
  assert.match(route, /RELEASE_NEXT_RELEASE_TRAIN_BATCH_UNIT/);
  assert.match(route, /RELEASE_TRAIN_CANONICAL_LEDGER_DRIFT/);
  assert.match(route, /MP001_94_ACCEPTED_EVIDENCE_REQUIRED/);
  assert.match(route, /SHOT_SPECIFIC_UNIT_CONTRACT_V1/);
  assert.match(route, /SHOT_SPECIFIC_SEMANTIC_MANIFEST_V1/);
  assert.match(route, /evaluateOnlyShotContract: true/);
  assert.match(route, /inferredArchetypeRequirements: false/);
  assert.match(route, /overallFloor: clean\(sourceContract\.risk_tier\) === "P0" \? 94 : 92/);
  assert.match(route, /dimensionFloor: 90/);
  assert.match(route, /PHYSICAL_UNIQUENESS/);
  assert.match(route, /RELEASE_TRAIN_ZERO_SPEND_INVARIANT_FAILED/);
  assert.match(route, /READY_FOR_SEQUENCE_PROOF/);
  assert.match(route, /SEQUENCE_PROOF_PASS_REVIEW/);
  assert.match(route, /SEQUENCE_OR_BATCH_FAILED_PRESERVED/);
  assert.match(route, /BATCH_UNIT_PASS_REVIEW/);
  assert.match(page, /Build Release Train G0\/G1 · \$0/);
  assert.match(page, /Build Production Scene Renderer v2 · \$0/);
  assert.match(page, /Run repaired MP-002 Sequence Proof · max \$1/);
  assert.match(page, /Run MP-003–MP-010 bounded batch/);
  assert.match(page, /data\.authorization\?\.modelPolicy\.batchAuthorized !== true/);
});

test("Production Scene Renderer preserves request 83 and preflights all remaining units before request 84", () => {
  assert.match(route, /RELEASE_TRAIN_V2_PRODUCTION_SCENE_RENDERER/);
  assert.match(route, /PRODUCTION_SCENE_RENDERER_V2/);
  assert.match(route, /SHOT_CONTRACT_PIXEL_QA_V2/);
  assert.match(route, /BUILD_PRODUCTION_SCENE_PREFLIGHT/);
  assert.match(route, /MP002_42_FAILED_SEQUENCE_PROOF_REQUIRED/);
  assert.match(route, /PRODUCTION_SCENE_CANONICAL_LEDGER_DRIFT/);
  assert.match(route, /EXECUTABLE_PRODUCTION_SCENE_CONTRACT_V2/);
  assert.match(route, /EXECUTABLE_PRODUCTION_SCENE_MANIFEST_V2/);
  assert.match(route, /PRODUCTION_SCENE_G0_FAILED/);
  assert.match(route, /PRODUCTION_SCENE_G1_FAILED/);
  assert.match(route, /PRODUCTION_SCENE_ZERO_SPEND_INVARIANT_FAILED/);
  assert.match(route, /EXIT contains APPROVED \+ \$100\.00/);
  assert.match(route, /proofCardRendererDisabled: true/);
  assert.match(route, /predictedOverall: 96/);
  assert.match(route, /predictedCriticalFloor: 93/);
  assert.match(route, /request 84 is the only possible next dispatch/);
  assert.match(page, /Build Production Scene Renderer v2 · \$0/);
  assert.match(page, /Run repaired MP-002 Sequence Proof · max \$1/);
});
