import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const route = await readFile(new URL("../app/api/factory/material-production/route.ts", import.meta.url), "utf8");

test("Batch 2 is a 50-shot controlled scale from 36 to 86 of 166", () => {
  assert.match(route, /LIMIT 50 OFFSET 26/);
  assert.match(route, /targetPortfolioComplete: 86/);
  assert.match(route, /Number\(batch\.completed_units\) !== 50/);
});

test("Batch 1 P2 findings become production regressions before Batch 2", () => {
  for (const control of ["NO_INACTIVE_PARTICIPANT_NAME", "EXIT_CONTRAST_4_5", "BARRIER_PRECEDENCE_BEFORE_ABSENCE", "ART_DIRECTION_SEPARATION"]) assert.match(route, new RegExp(control));
  assert.match(route, /BATCH_2_PREFLIGHT_FAILED/);
  assert.match(route, /duplicateSpecifications: 0/);
  assert.match(route, /QUALITY_FIRST_WITH_RUNAWAY_PROTECTION/);
});

test("Batch 2 completes products before one independent audit", () => {
  assert.match(route, /WAVE_BATCH_2_PRODUCT_AUDIT/);
  assert.match(route, /BATCH_2_PRODUCT_AUDIT_FIREWALL/);
  assert.match(route, /sample\.length !== 10/);
  assert.match(route, /outputRepair: false/);
  assert.match(route, /retryWithoutEngineChange: false/);
});

test("Batch 2 pass thresholds are stricter than Batch 1 controlled release", () => {
  assert.match(route, /Number\(result\.overall\) >= 90/);
  assert.match(route, /Number\(result\.semanticFit\) >= 90/);
  assert.match(route, /Number\(result\.factualSafety\) >= 92/);
  assert.match(route, /\["P0", "P1"\]\.includes/);
});

test("failed Batch 2 QA replaces V8 with a contract-bound V9 engine and preserves evidence", () => {
  for (const control of [
    "SHOT_PRODUCT_ENGINE_V9_CONTRACT_BOUND_SCENE_GRAPH",
    "CONTRACT_BOUND_SCENE_GRAPH_V9",
    "CONTRACT_BOUND_SCENE_GRAPH_COMPILER_V9",
    "CONTRACT_STATE_BINDING",
    "UNSUPPORTED_GENERIC_INJECTION",
    "CONTRACT_PIXEL_SIGNATURE",
    "CROSS_PRODUCT_PIXEL_REUSE",
    "CROSS_PRODUCT_FRAME_REUSE",
  ]) assert.match(route, new RegExp(control));
  assert.match(route, /frameSignatures\.size !== 150/);
  assert.match(route, /PRODUCT_COMPLETE_REJECTED_ENGINE_EVIDENCE/);
  assert.match(route, /priorProductsPreservedAsEvidence: true/);
  assert.match(route, /retryPriorAudit: false/);
  assert.match(route, /reproduceScope: "ALL_50_PRODUCTS"/);
  assert.match(route, /superseded\?\.id \|\| null/);
});

test("Batch 2 V9 production uses the batch-bound engine and never falls back to V8", () => {
  assert.match(route, /const engineVersion = clean\(batch\.engine_version\)/);
  assert.match(route, /BATCH_2_ENGINE_NOT_QUALIFIED/);
  assert.match(route, /SHOT_PRODUCT_SPECIFICATION_V3_CONTRACT_BOUND/);
  assert.match(route, /wave-09-batch-2-engine-v9/);
  assert.match(route, /150_OF_150/);
});

test("Batch 2 V9 audit is lineage-qualified and exactly-once across reconnects", () => {
  for (const control of [
    "WAVE_AUDIT_CONTROL_V3_DURABLE_IDEMPOTENT_INTENT",
    "50_OF_50_CONTRACTS_AND_150_OF_150_UNIQUE_FRAMES_PASS",
    "rejectedBatch\\?\\.status",
    "ENGINE_ROOT_CAUSE_PRESERVED",
    "REQUEST_IDEMPOTENCY_CONFLICT",
    "BATCH_2_AUDIT_INTENT_CONFLICT",
  ]) assert.match(route, new RegExp(control));
  assert.match(route, /stableRequestId \|\|/);
  assert.match(route, /ON CONFLICT\(id\) DO NOTHING/);
  assert.match(route, /'PREPARING',0,'BLOCKED'/);
  assert.match(route, /providerDispatches: 0/);
  assert.match(route, /const frameContent = await Promise\.all/);
});

test("Batch 2 V11 audit accepts the preserved V10 lineage and keeps intent separate from request dispatch", () => {
  assert.match(route, /clean\(batch\?\.engine_version\) === WAVE_BATCH_2_V11_ENGINE_VERSION/);
  assert.match(route, /const v11QualifiedAudit/);
  assert.match(route, /50_CONTRACTS_50_PROJECTIONS_50_GRAMMARS_150_FRAMES_PASS/);
  assert.match(route, /rootPolicy\.v8V9V10ProductsPreservedAsEvidence === true/);
  assert.match(route, /v8InitialAudit \|\| v9QualifiedAudit \|\| v10QualifiedAudit \|\| v11QualifiedAudit/);
});

test("failed V9 is replaced by V10 archetype-native semantic compilation", () => {
  for (const control of [
    "SHOT_PRODUCT_ENGINE_V10_ARCHETYPE_SEMANTIC_COMPILER",
    "ARCHETYPE_SEMANTIC_MANIFEST_V10",
    "ARCHETYPE_SEMANTIC_COMPILER_V10",
    "ARCHETYPE_NATIVE_VISUAL_GRAMMAR",
    "ELEMENT_PROVENANCE_COMPLETE",
    "DIRECTED_STATE_TRANSITIONS",
    "CROSS_PRODUCT_GRAMMAR_REUSE",
    "50_CONTRACTS_50_GRAMMARS_150_FRAMES_PASS",
  ]) assert.match(route, new RegExp(control));
  assert.match(route, /familyCounts\.size >= 5/);
  assert.match(route, /maximumFamilyShare <= 0\.6/);
  assert.match(route, /v8AndV9ProductsPreservedAsEvidence: true/);
  assert.match(route, /retryPriorAudits: false/);
  assert.match(route, /ADOPT_WAVE_BATCH_2_V10_ENGINE_ROOT_CORRECTION/);
  assert.match(route, /claim: clean\(contract\.claim\)/);
  assert.match(route, /if\(archetypeBound&&!contractNativeScene\).*currentBinding\.clause/);
});

test("V10 activation is preflighted at zero spend and committed exactly once", () => {
  for (const control of [
    "v7_batch_activation_preflights",
    "v7_batch_activations",
    "PREFLIGHT_WAVE_BATCH_2_V10_ACTIVATION",
    "ZERO-SPEND-PREFLIGHT-V1",
    "ACTIVATION-V1",
    "BATCH_2_V10_ZERO_SPEND_PREFLIGHT_REQUIRED",
    "BATCH_2_V10_ATOMIC_COMMIT_FAILED",
    "BATCH_2_V10_ACTIVATION_READBACK_INCONSISTENT",
  ]) assert.match(route, new RegExp(control));
  assert.match(route, /idempotency_key=\?/);
  assert.match(route, /providerDispatches: 0/);
  assert.match(route, /requestsDelta: 0, costDelta: 0/);
  assert.match(route, /verifyCommittedWaveBatch2V10Activation/);
  assert.match(route, /startIndex \+ 5/);
  assert.match(route, /status: complete \? passed \? "PASS" : "FAIL" : "RUNNING"/);
  assert.match(route, /result\.nextIndex/);
});

test("failed V10 is replaced by V11 contract semantic projection", () => {
  for (const control of [
    "SHOT_PRODUCT_ENGINE_V11_CONTRACT_SEMANTIC_PROJECTION",
    "CONTRACT_SEMANTIC_PROJECTION_V11",
    "CONTRACT_SEMANTIC_PROJECTION_COMPILER_V11",
    "VISIBLE_ENTITY_ACTION_CONSTRAINT_PROJECTION",
    "PREFLIGHT_WAVE_BATCH_2_V11_ACTIVATION",
    "ADOPT_WAVE_BATCH_2_V11_ENGINE_ROOT_CORRECTION",
    "BATCH_2_V10_METADATA_RENDERER_DISCONNECT",
    "50_CONTRACTS_50_PROJECTIONS_50_GRAMMARS_150_FRAMES_PASS",
  ]) assert.match(route, new RegExp(control));
  assert.match(route, /stateProjection: semanticProjection \? stateProjection/);
  assert.match(route, /semanticProjection=clean\(semantic\.version\)==="CONTRACT_SEMANTIC_PROJECTION_V11"/);
  assert.match(route, /contractBoundGraph=.*\|\|semanticProjection/);
  assert.match(route, /semanticProjectionCoverage.*50/);
  assert.match(route, /v8V9V10ProductsPreservedAsEvidence: true/);
  assert.match(route, /BATCH_2_V11_ATOMIC_COMMIT_FAILED/);
  assert.match(route, /verifyCommittedWaveBatch2V11Activation/);
});

test("failed V11 is replaced by V12 structured visual ontology with physical motion and collision gates", () => {
  for (const control of [
    "SHOT_PRODUCT_ENGINE_V12_STRUCTURED_VISUAL_ONTOLOGY",
    "STRUCTURED_VISUAL_ONTOLOGY_V12",
    "STRUCTURED_VISUAL_ONTOLOGY_COMPILER_V12",
    "ACTOR_LANE_CONTAINER_BOUNDARY_MOVING_ENTITY_STATE",
    "PHYSICAL_MOTION_NOT_LABEL_SWAP",
    "CLIPPING_AND_CONNECTOR_INTERSECTION",
    "PREFLIGHT_WAVE_BATCH_2_V12_ACTIVATION",
    "ADOPT_WAVE_BATCH_2_V12_ENGINE_ROOT_CORRECTION",
    "50_ONTOLOGIES_50_MOTION_PATHS_150_FRAMES_LAYOUT_SAFE",
  ]) assert.match(route, new RegExp(control));
  assert.match(route, /ontologyCoverage === 50/);
  assert.match(route, /motionCoverage === 50/);
  assert.match(route, /layoutSafeCoverage === 50/);
  assert.match(route, /familyCounts\.size === 8/);
  assert.match(route, /maximumFamilyShare <= 0\.25/);
  assert.match(route, /v8V9V10V11ProductsPreservedAsEvidence: true/);
  assert.match(route, /BATCH_2_V12_ATOMIC_COMMIT_FAILED/);
  assert.match(route, /verifyCommittedWaveBatch2V12Activation/);
});

test("failed V18 is replaced by V19 systemic process correction rather than sample patches", () => {
  for (const control of [
    "SHOT_PRODUCT_ENGINE_V18_PIXEL_LAYOUT_COMPILER",
    "SHOT_PRODUCT_ENGINE_V19_SYSTEMIC_CONSTRAINT_COMPILER",
    "CONSTRAINT_SCENE_SPECIFICATION_V19",
    "SYSTEMIC_CONSTRAINT_COMPILER_V19",
    "ROOT_CAUSE_TO_PROCESS_V1",
    "ROOT_CAUSE_VERIFIED",
    "MONOLITHIC_SAMPLE_BRANCH_RENDERER_PLUS_SELF_ATTESTED_LAYOUT_PROOF",
    "SEMANTIC_TOPOLOGY_CLASSIFICATION",
    "CONSTRAINT_SOLVED_GEOMETRY",
    "PRIMITIVE_ONLY_RENDERER",
    "RECOMPUTED_LAYOUT_AND_MOBILE_MEASUREMENTS",
    "ADVERSARIAL_FIXTURE_QUALIFICATION",
    "V19_3_PORT_EGRESS_COMPLETE_LAYOUT_SOLVER",
    "CAPACITY_SAFE_SLOTS_AND_TOPOLOGY_DIRECTED_MOTION_PATH",
    "TOPOLOGY_DIRECTED_DISTINCT_ANCHORS",
    "OBSTACLE_AVOIDING_CONNECTOR_PORT_AND_PERIMETER_SOLVER",
    "OBSTACLE_AVOIDING_PERIMETER_PORTS",
    "EGRESS_COMPLETE_PRIMITIVE_PLACEMENT",
    "LOGICAL_ID_BRANCH",
    "AUDIT_SAMPLE_BRANCH",
    "FRAME_COORDINATE_PATCH",
    "CONSTRAINT_SOLVED_PRIMITIVES_ONLY",
    "SCENE_SPEC_TO_PIXEL_TRACE",
    "SCENE_SPEC_LAYOUT_SAFETY",
    "SCENE_SPEC_PHYSICAL_TRANSITION",
    "PREFLIGHT_WAVE_BATCH_2_V19_SYSTEMIC_ACTIVATION",
    "ADOPT_WAVE_BATCH_2_V19_SYSTEMIC_PROCESS_CORRECTION",
    "50_PRODUCTS_150_FRAMES_10_ADVERSARIAL_FIXTURES_MEASURED",
  ]) assert.match(route, new RegExp(control));
  assert.match(route, /sceneSpecCoverage === 50/);
  assert.match(route, /pixelTraceCoverage === 50/);
  assert.match(route, /adversarial\.pass === 10/);
  assert.match(route, /rootCauseGate/);
  assert.match(route, /familyCounts\.size === 10/);
  assert.match(route, /maximumFamilyShare <= 0\.2/);
  assert.match(route, /v8V9V10V11V12V13V14V15V16V17V18ProductsPreservedAsEvidence: true/);
  assert.match(route, /BATCH_2_V13_ATOMIC_COMMIT_FAILED/);
  assert.match(route, /verifyCommittedWaveBatch2V13Activation/);
  assert.match(route, /WAVE_BATCH_2_V13_REJECTED_ENGINE_VERSION/);
  assert.match(route, /rendererContract\.input === "CONSTRAINT_SOLVED_PRIMITIVES_ONLY"/);
  assert.match(route, /rendererContract\.logicalIdBranchingForbidden === true/);
  assert.match(route, /rendererContract\.auditSampleBranchingForbidden === true/);
  assert.doesNotMatch(route.match(/function contractNativeSceneSpecification[\s\S]*?function waveProductionManifest/)?.[0] || "", /MP-\d{3}|auditedCompositions|auditedBlueprint/);
  assert.match(route, /tokenFallbackForbidden === true/);
  assert.match(route, /function systemicMotionPath/);
  assert.match(route, /motionPathObjectIntersectionCount/);
  assert.match(route, /motionPathSafeAreaFailures/);
  assert.match(route, /motionRailReserved/);
  assert.match(route, /ZERO-SPEND-PREFLIGHT-V19-3/);
  assert.match(route, /failedV19InitialPreflightPreservedAsEvidence: true/);
  assert.match(route, /failedV19_1PreflightPreservedAsEvidence: true/);
  assert.match(route, /failedV19_2PreflightPreservedAsEvidence: true/);
  assert.match(route, /primitiveEgressFailures/);
  assert.match(route, /everyPrimitiveHasEgressPort/);
  assert.doesNotMatch(route, /const path = \[objects\[0\], objects\[Math\.floor\(objects\.length \/ 2\)\], objects\[objects\.length - 1\]\]/);
});

test("V19 independent audit firewall is capability and committed-lineage bound", () => {
  for (const control of [
    "const v19SystemicCapability",
    "const v19CommittedLineage",
    "const v19QualifiedAudit",
    "ADOPT_WAVE_BATCH_2_V19_SYSTEMIC_PROCESS_CORRECTION",
    "PREFLIGHT_WAVE_BATCH_2_V19_SYSTEMIC_ACTIVATION",
    "status='COMMITTED'",
    "SHOT_PRODUCT_DOD_V19_SYSTEMIC",
    "V19_3_PORT_EGRESS_COMPLETE_LAYOUT_SOLVER",
    "50_PRODUCTS_150_FRAMES_10_ADVERSARIAL_FIXTURES_MEASURED",
    "capability-bound committed systemic audit intent",
  ]) assert.match(route, new RegExp(control));
  assert.match(route, /clean\(v19Activation\?\.input_hash\) === clean\(v19Preflight\?\.input_hash\)/);
  assert.match(route, /clean\(v19Preflight\?\.source_batch_id\) === clean\(rejectedBatch\?\.id\)/);
  assert.match(route, /Number\(v19PreflightResult\.adversarialPass\) === 10/);
  assert.match(route, /Number\(v19PreflightResult\.layoutSafeCoverage\) === 50/);
  assert.match(route, /Number\(v19PreflightResult\.requestsDelta\) === 0/);
  assert.match(route, /v13QualifiedAudit \|\| v19QualifiedAudit/);
  assert.match(route, /currentDurableIntent/);
});

test("V19 audit rejection produces a full-scope V20 executable semantic process", () => {
  for (const control of [
    "SHOT_PRODUCT_ENGINE_V20_EXECUTABLE_SEMANTIC_OBLIGATION_COMPILER",
    "V20_2_GRAMMATICAL_SUBJECT_DISTINCT_STATE_SEMANTIC_QUALIFIER_COMPILER",
    "EXECUTABLE_SEMANTIC_SCENE_SPECIFICATION_V20",
    "CLAUSE_ROLE_STATE_CONTAINMENT_COMPILER",
    "EXPLICIT_MOVING_SUBJECT_ORIGIN_DESTINATION_AND_FORBIDDEN_DESTINATION",
    "AUDIENCE_VISIBLE_STATE_ASSERTIONS",
    "INTENDED_TARGET_CONTAINMENT_MEASUREMENT",
    "FORBIDDEN_DESTINATION_OCCUPANCY_MEASUREMENT",
    "keywordCardFallbackForbidden",
    "semanticAssertionsAudienceVisible",
    "semanticContainmentFailures",
    "forbiddenDestinationViolations",
    "PREFLIGHT_WAVE_BATCH_2_V20_SEMANTIC_ACTIVATION",
    "ADOPT_WAVE_BATCH_2_V20_SEMANTIC_PROCESS_CORRECTION",
    "50_PRODUCTS_150_FRAMES_EXECUTABLE_SEMANTIC_OBLIGATIONS_MEASURED",
    "v8ThroughV19ProductsPreservedAsEvidence: true",
  ]) assert.match(route, new RegExp(control));
  assert.match(route, /sceneMotionProof\.originVisible===true/);
  assert.match(route, /sceneMotionProof\.destinationContainmentVisible===true/);
  assert.match(route, /sceneMotionProof\.forbiddenDestinationNeverOccupied===true/);
  assert.match(route, /adversarial\.pass === 10/);
  assert.match(route, /semanticObligationCoverage === 50/);
  assert.doesNotMatch(route.match(/function contractNativeSceneSpecificationV20[\s\S]*?function waveProductionManifest/)?.[0] || "", /MP-\d{3}|auditSample\[|auditedCompositions|auditedBlueprint/);
});

test("V13 through V20 preserve strengths, rejection causes, and inherited capabilities", () => {
  for (const version of ["V13", "V14", "V15", "V16", "V17", "V18", "V19", "V20"]) assert.match(route, new RegExp(`version: "${version}"`));
  for (const score of [27, 28, 46, 59, 74, 76, 45, 48]) assert.match(route, new RegExp(`auditScore: ${score}`));
  for (const control of ["WAVE_ENGINE_EVOLUTION", "proven", "rejectedBecause", "inherited", "Semantic fit reached 86", "Factual safety held at 94", "V19 root-cause fixtures and measured layout gates", "150 unique deterministic frames", "V21 semantic-plan gate requirement"]) assert.match(route, new RegExp(control));
});

test("V20, V21 and V21.2 rejection evidence require one Factory-token-ID-bound request before V21.3", () => {
  for (const control of [
    "SHOT_PRODUCT_ENGINE_V21_AUTHORED_SEMANTIC_PLAN_COMPILER",
    "V21_3_FACTORY_ISSUED_TOKEN_ID_SOURCE_BINDING_AND_INDEPENDENT_VALIDATION",
    "AUTHOR_WAVE_BATCH_2_V21_3_SEMANTIC_PLANS",
    "WAVE_BATCH_2_V21_3_SEMANTIC_PLAN_AUTHORING",
    "AUTHORED_SEMANTIC_PLAN_SCENE_SPECIFICATION_V21",
    "AUTHORED_SOURCE_CITED_SEMANTIC_PLAN",
    "VALIDATED_AUTHORED_SEMANTIC_PLAN_AND_SOLVED_PRIMITIVES_ONLY",
    "heuristicParserFallbackForbidden",
    "FACTORY_ISSUED_TOKEN_ID_EXISTENCE_CONTIGUITY_COVERAGE_AND_AMBIGUITY_GATE_V3",
    "FACTORY_RECONSTRUCTED_FROM_FACTORY_ISSUED_TOKEN_IDS",
    "FACTORY_ISSUED_TOKEN_IDS_V1",
    "PREFLIGHT_WAVE_BATCH_2_V21_PLAN_ACTIVATION",
    "ADOPT_WAVE_BATCH_2_V21_SEMANTIC_PROCESS_CORRECTION",
    "50_VALIDATED_PLANS_50_CITATION_TRACES_150_FRAMES_MEASURED",
    "v8ThroughV20ProductsPreservedAsEvidence: true",
  ]) assert.match(route, new RegExp(control));
  assert.match(route, /Number\(audit\.score\) !== 48/);
  assert.match(route, /Number\(legacyResult\.plansValidated\) !== 47/);
  assert.match(route, /Number\(legacyResult\.providerDispatches\) !== 1/);
  assert.match(route, /Number\(v21_2Result\.plansValidated\) !== 25/);
  assert.match(route, /Number\(v21_2Result\.providerDispatches\) !== 1/);
  assert.match(route, /Number\(planResult\.providerDispatches\) !== 1/);
  assert.match(route, /Number\(result\.providerRequestsDelta\) !== 0/);
  assert.match(route, /clean\(rec\(semanticPlan\.validation\)\.sourceCitationGate\) !== "PASS"/);
  assert.match(route, /SEMANTIC_PLAN_EXPLICIT_ONE_REQUEST_GRANT/);
  assert.match(route, /oneRequestCeiling = intentRequestsBefore \+ 1/);
  assert.match(route, /max_remote_requests=CASE WHEN max_remote_requests<\? THEN \? ELSE max_remote_requests END/);
  assert.match(route, /BATCH_2_V21_ONE_REQUEST_GRANT_READBACK_REQUIRED/);
  assert.match(route, /semanticPlanStableRequestId: stableRequestId/);
  assert.match(route, /stableTransportResume: true/);
  assert.match(route, /BATCH_2_V21_ACTIVE_REQUESTS_MUST_BE_ZERO_OR_THE_BOUND_STABLE_REQUEST/);
  assert.match(route, /"idempotency-key": requestId/);
  assert.match(route, /tokenIds/);
  assert.match(route, /expectedIds/);
  assert.match(route, /position > 0 && index !== indexes\[position - 1\] \+ 1/);
  assert.match(route, /sourceTextReconstructedByFactory: true/);
  assert.match(route, /numericTokenOffsetsAccepted: false/);
  assert.match(route, /aiVerbatimCopyAccepted: false/);
  assert.doesNotMatch(route.match(/const semanticCitationSchema[^;]+;/)?.[0] || "", /quote/);
  assert.doesNotMatch(route.match(/const semanticCitationSchema[^;]+;/)?.[0] || "", /startToken|endToken/);
  assert.doesNotMatch(route.match(/function contractNativeSceneSpecificationV21[\s\S]*?function waveProductionManifest/)?.[0] || "", /MP-\d{3}|auditSample\[|auditedCompositions|auditedBlueprint/);
});
