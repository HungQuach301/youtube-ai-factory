import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  LEARNING_READY_CONTRACT_DEFINITIONS,
  compileLearningReadyContractPack,
  evaluateLearningPromotion,
  validateAnimaticContract,
  validateChannelIdentityContract,
  validateContractDefinitions,
  validateExperimentDefinition,
  validateMasterDeliveryContract,
  validatePackagingPromiseContract,
  validatePredictedPerformanceArtifact,
  validateRightsComplianceManifest,
} from "../lib/learning-ready-contract-pack.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const hash = "a".repeat(64);

test("Wave 2 defines all eight learning-ready contracts with zero provider authority", async () => {
  const lint = validateContractDefinitions();
  assert.equal(lint.passed, true);
  assert.equal(lint.contractCount, 8);
  assert.equal(lint.providerRequests, 0);
  assert.equal(lint.spendUsd, 0);
  assert.deepEqual(new Set(LEARNING_READY_CONTRACT_DEFINITIONS.map((item) => item.key)), new Set([
    "CHANNEL_IDENTITY", "PACKAGING_PROMISE", "PREDICTED_PERFORMANCE", "EXPERIMENT_DEFINITION",
    "LEARNING_CANDIDATE", "RIGHTS_COMPLIANCE", "ANIMATIC", "MASTER_DELIVERY",
  ]));
  const compiled = await compileLearningReadyContractPack();
  assert.equal(compiled.manifest.lifecycleState, "SCHEMA_DEFINED");
  assert.equal(compiled.manifest.mutationAuthority, "NONE");
  assert.match(compiled.contentHash, /^[a-f0-9]{64}$/);
});

test("identity and packaging are channel-scoped, lineage-bound and fail closed", () => {
  assert.equal(validateChannelIdentityContract({
    scope: "CHANNEL", version: 1, strategyBindingHash: hash, voiceSettingsHash: hash,
    pronunciationLexiconRef: "r2://identity/pronunciation-v1", terminologyLedgerRef: "r2://identity/terms-v1",
    visualGrammar: { palette: ["#000000"] }, musicPolicy: { genreRange: ["documentary"] },
  }).eligible, true);
  assert.equal(validateChannelIdentityContract({
    scope: "VIDEO", version: 1, strategyBindingHash: hash, voiceSettingsHash: hash,
    pronunciationLexiconRef: "", terminologyLedgerRef: "", visualGrammar: {}, musicPolicy: {},
  }).eligible, false);
  assert.equal(validatePackagingPromiseContract({
    creativeRouteId: "route-04", channelIdentityHash: hash, titleVariants: ["Why the price changes", "The hidden price switch"],
    thumbnailConcept: "One price splits into two states", audiencePromise: "Explain why checkout changes the number",
    differentiationHypothesis: "Mechanism teardown instead of consumer advice", promisedClaimIds: ["claim-1"], mobileLegibilityState: "PASS",
  }).eligible, true);
  assert.ok(validatePackagingPromiseContract({
    creativeRouteId: "", channelIdentityHash: "bad", titleVariants: ["short"], thumbnailConcept: "", audiencePromise: "",
    differentiationHypothesis: "", promisedClaimIds: [], mobileLegibilityState: "NOT_EVALUATED",
  }).errors.includes("MOBILE_LEGIBILITY_NOT_PASSED"));
});

test("prediction, experiment and promotion require sealed precommitment and sufficient independent evidence", () => {
  assert.equal(validatePredictedPerformanceArtifact({
    baselineRef: "baseline:channel:pillar:format:v1", packagingPromiseHash: hash, compositionStages: ["04", "05", "08", "11"],
    retentionCurve: [{ elapsedRatio: 0, predictedRetention: 1 }, { elapsedRatio: 0.5, predictedRetention: 0.65 }, { elapsedRatio: 1, predictedRetention: 0.42 }],
    beatRisks: [{ beatId: "beat-1", risk: 0.2 }], predictedCtr: { minimum: 0.03, expected: 0.05, maximum: 0.08 }, lifecycleState: "SEALED",
  }).eligible, true);
  assert.equal(validateExperimentDefinition({
    hypothesis: "A mechanism-reveal thumbnail increases CTR", variableTested: "thumbnail_concept",
    variablesHeldConstant: ["title", "topic", "release_window"], minimumSampleSize: 2, decisionCriterion: "CTR delta >= 0.5 percentage point",
  }).eligible, true);
  const blocked = evaluateLearningPromotion({
    learningState: "INSUFFICIENT_EVIDENCE", target: "CHANNEL_STRATEGY", independentVideoIds: ["video-1"],
    observedSampleSize: 1, minimumSampleSize: 2, consistentDirection: false, ownerIdentityBound: false, evidenceHash: "bad", createsNewVersion: false,
  });
  assert.equal(blocked.authorized, false);
  assert.deepEqual(blocked.reasons, [
    "LEARNING_NOT_PROMOTION_ELIGIBLE", "TWO_INDEPENDENT_VIDEOS_REQUIRED", "MINIMUM_SAMPLE_NOT_MET",
    "RESULT_DIRECTION_NOT_CONSISTENT", "OWNER_IDENTITY_REQUIRED", "PROMOTION_EVIDENCE_HASH_INVALID", "IN_PLACE_MUTATION_FORBIDDEN",
  ]);
  assert.equal(evaluateLearningPromotion({
    learningState: "PROMOTION_ELIGIBLE", target: "PRODUCTION_STANDARD", independentVideoIds: ["video-1", "video-2"],
    observedSampleSize: 2, minimumSampleSize: 2, consistentDirection: true, ownerIdentityBound: true, evidenceHash: hash, createsNewVersion: true,
  }).authorized, true);
});

test("rights, animatic and master delivery gates reject late or irreversible defects", () => {
  assert.equal(validateRightsComplianceManifest({
    territory: ["US"], validFrom: "2026-01-01T00:00:00.000Z", validUntil: "2027-01-01T00:00:00.000Z",
    commercialUse: true, editorialOnly: false, contentIdState: "CLEAR", aiDisclosureState: "PASS", advertiserFriendlyState: "PASS", reusedContentState: "PASS",
  }).eligible, true);
  assert.equal(validateAnimaticContract({
    packagingPromiseHash: hash, predictionHash: hash, shotCueProgramHash: hash, draftAudioHash: hash,
    durationSeconds: 80.252, canonicalDurationSeconds: 80.252, timedFrameCount: 24, promiseToContentState: "PASS", storyRetentionState: "PASS",
  }).eligible, true);
  assert.equal(validateMasterDeliveryContract({
    archivalCodec: "FFV1", archivalAudioCodec: "PCM", archivalSampleRate: 48_000, archivalFileHash: hash, archivalStreamHash: hash,
    distributionCodec: "VP9", distributionFileHash: hash, distributionStreamHash: hash, derivedFromArchivalHash: hash, r2Reconciled: true, driveReconciled: true,
  }).eligible, true);
  assert.ok(validateMasterDeliveryContract({
    archivalCodec: "VP9", archivalAudioCodec: "OPUS", archivalSampleRate: 24_000, archivalFileHash: hash, archivalStreamHash: hash,
    distributionCodec: "VP9", distributionFileHash: hash, distributionStreamHash: hash, derivedFromArchivalHash: hash, r2Reconciled: false, driveReconciled: false,
  }).errors.includes("ARCHIVAL_CODEC_NOT_MEZZANINE"));
});

test("migration 0051 installs the registry and enforces zero-spend owner-bound version promotion", () => {
  const migration = read("drizzle/0051_learning_ready_contract_pack.sql");
  for (const table of [
    "v7_learning_ready_contract_registry", "v7_channel_identity_contracts", "v7_packaging_promise_contracts",
    "v7_predicted_performance_artifacts", "v7_experiment_definitions", "v7_learning_candidates",
    "v7_learning_promotion_receipts", "v7_rights_compliance_manifests", "v7_animatic_contracts", "v7_master_delivery_contracts",
  ]) assert.match(migration, new RegExp(table));
  assert.doesNotMatch(migration, /api\.openai\.com|elevenlabs\.io|pexels\.com\/v1/);

  const db = new DatabaseSync(":memory:");
  const migrations = readdirSync(new URL("../drizzle", import.meta.url)).filter((name) => name.endsWith(".sql")).sort();
  for (const file of migrations) db.exec(read(`drizzle/${file}`));
  assert.equal(migrations.at(-1), "0079_clean_audio_control_eligibility.sql");
  assert.equal(db.prepare("SELECT COUNT(*) total FROM v7_learning_ready_contract_registry").get().total, 8);
  assert.equal(db.prepare("SELECT COALESCE(SUM(provider_requests),0) requests,COALESCE(SUM(spend_usd),0) spend FROM v7_learning_ready_contract_registry").get().requests, 0);
  assert.throws(() => db.prepare("UPDATE v7_learning_ready_contract_registry SET spend_usd=1 WHERE id='LRCP-CHANNEL-IDENTITY'").run(), /CHECK constraint failed/);
  const receipt = db.prepare(`INSERT INTO v7_learning_promotion_receipts
    (id,learning_candidate_id,command_version,idempotency_key,actor_email,owner_identity_bound,target,prior_version,new_version,evidence_hash,outcome)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  assert.throws(() => receipt.run("r1", "l1", "PROMOTE_LEARNING_V1", "key-1", "owner@example.test", 0, "CHANNEL_STRATEGY", 1, 2, hash, "PROMOTED"), /CHECK constraint failed/);
  assert.throws(() => receipt.run("r2", "l2", "PROMOTE_LEARNING_V1", "key-2", "owner@example.test", 1, "CHANNEL_STRATEGY", 2, 2, hash, "PROMOTED"), /CHECK constraint failed/);
  receipt.run("r3", "l3", "PROMOTE_LEARNING_V1", "key-3", "owner@example.test", 1, "PRODUCTION_STANDARD", 1, 2, hash, "PROMOTED");
  assert.equal(db.prepare("SELECT new_version FROM v7_learning_promotion_receipts WHERE id='r3'").get().new_version, 2);
});
