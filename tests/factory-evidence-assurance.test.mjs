import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  FACTORY_ASSURANCE_LAYERS,
  adjudicateFactoryAssuranceRun,
  createFactoryEvidenceBundle,
  recordFactoryAssuranceDependencyDrift,
  recordFactoryAssuranceLayerReceipt,
  registerFactoryAssuranceJudgeQualification,
  startFactoryAssuranceRun,
} from "../lib/factory-evidence-assurance.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const migrations = readdirSync(new URL("../drizzle", import.meta.url)).filter((name) => name.endsWith(".sql")).sort();
const hashA = "a".repeat(64), hashB = "b".repeat(64), hashC = "c".repeat(64), hashD = "d".repeat(64), hashE = "e".repeat(64), hashF = "f".repeat(64);

function d1(database) {
  return {
    prepare(query) {
      const statement = database.prepare(query); let values = [];
      return {
        bind(...next) { values = next; return this; },
        async first() { return statement.get(...values) ?? null; },
        async all() { return { results: statement.all(...values) }; },
        async run() { const result = statement.run(...values); return { success: true, meta: { changes: result.changes } }; },
      };
    },
    async batch(statements) {
      database.exec("BEGIN IMMEDIATE");
      try { const output = []; for (const statement of statements) output.push(await statement.run()); database.exec("COMMIT"); return output; }
      catch (error) { database.exec("ROLLBACK"); throw error; }
    },
  };
}

function setup() {
  const database = new DatabaseSync(":memory:"); database.exec("PRAGMA foreign_keys=ON");
  for (const migration of migrations) database.exec(read(`drizzle/${migration}`));
  database.prepare(`INSERT INTO factory_canonical_timebases
    (id,video_id,contract_version,frame_rate_numerator,frame_rate_denominator,audio_sample_rate_hz,total_frames,total_audio_samples,rounding_policy,definition_hash)
    VALUES ('timebase-assurance','video-assurance','FACTORY_RUNTIME_CONTRACT_V1',30,1,48000,1800,2880000,'HALF_AWAY_FROM_ZERO_V1',?)`).run(hashA);
  database.prepare(`INSERT INTO factory_artifact_versions
    (id,artifact_id,version,artifact_kind,source_entity_type,source_entity_id,content_hash,storage_key,mime_type,byte_size,lineage_json,lifecycle_state)
    VALUES ('artifact-version-assurance','artifact-assurance',1,'ASSURANCE_FIXTURE','TEST','fixture-assurance',?,'evidence/fixture.webm','video/webm',1234,'{}','FROZEN')`).run(hashB);
  database.prepare(`INSERT INTO factory_providers (id,provider_key,provider_version,connection_ref,lifecycle_state,health_state,metadata_json)
    VALUES ('provider-assurance','ASSURANCE_PROVIDER','V1','connection:assurance','ACTIVE','HEALTHY','{}')`).run();
  database.prepare(`INSERT INTO factory_capabilities (id,capability_key,capability_version,plane,input_schema_hash,output_schema_hash,lifecycle_state)
    VALUES ('capability-assurance','MULTIMODAL_ASSURANCE','V1','EVIDENCE_ASSURANCE',?,?,'ACTIVE')`).run(hashC, hashD);
  database.prepare(`INSERT INTO factory_provider_bindings
    (id,provider_id,capability_id,binding_version,endpoint_or_model,model_version,input_schema_hash,output_schema_hash,settings_hash,rights_policy_version,retention_policy_version,rate_card_version,max_payload_bytes,timeout_ms,retry_ceiling,fallback_binding_id,priority,lifecycle_state)
    VALUES ('binding-assurance','provider-assurance','capability-assurance','V1','assurance:model','MODEL_V1',?,?,?,'RIGHTS_V1','RETENTION_V1','RATE_V1',1000000,30000,0,NULL,10,'ACTIVE')`).run(hashC, hashD, hashE);
  database.prepare(`INSERT INTO factory_capability_qualifications
    (id,binding_id,qualification_version,standard_version,qualified_archetypes_json,settings_hash,sample_size,first_pass_yield,p0_escape_count,evidence_hash,lifecycle_state,qualified_at,expires_at)
    VALUES ('provider-qualification-assurance','binding-assurance',1,'STANDARD_V3','["ASSURANCE"]',?,20,1,0,?,'QUALIFIED','2026-08-24T00:00:00.000Z','2027-08-24T00:00:00.000Z')`).run(hashE, hashF);
  return { database, db: d1(database) };
}

function bundleInput(overrides = {}) {
  return {
    bundleKey: "factory:evidence:bundle:assurance:0001", videoId: "video-assurance", artifactVersionId: "artifact-version-assurance", canonicalTimebaseId: "timebase-assurance",
    exactArtifactHash: hashB, sourceCommit: "1".repeat(40), deploymentVersion: "sites-v536", runtimeVersion: "ASSURANCE_RUNTIME_V1", evidenceHash: hashA,
    items: FACTORY_ASSURANCE_LAYERS.map((layer, index) => ({ evidenceKey: `factory:evidence:${layer.toLowerCase()}:0001`, evidenceType: layer === "L4" ? "AUDIO" : layer === "L6" ? "BROWSER" : "FRAME", assuranceLayer: layer,
      contentHash: [hashA, hashB, hashC, hashD, hashE, hashF, hashA, hashB][index], startFrame: 0, endFrameExclusive: 30, observed: true, provenance: { layer } })),
    ...overrides,
  };
}

function qualificationInput(layer, overrides = {}) {
  const decisionRole = layer === "L0" ? "DETERMINISTIC_CHECKER" : layer === "L6" ? "BROWSER_AGENT" : layer === "L7" ? "INDEPENDENT_ADJUDICATOR" : "AI_JUDGE";
  const needsProvider = decisionRole === "AI_JUDGE" || decisionRole === "INDEPENDENT_ADJUDICATOR";
  return {
    qualificationKey: `factory:assurance:qualification:${layer.toLowerCase()}:0001`, assuranceLayer: layer, channelId: "hidden-systems", formatKey: "hidden-systems-documentary", decisionRole,
    ...(needsProvider ? { providerBindingId: "binding-assurance", providerQualificationId: "provider-qualification-assurance" } : {}),
    judgeVersion: `JUDGE_${layer}_V1`, modelVersion: needsProvider ? "MODEL_V1" : `INTERNAL_${layer}_V1`, promptHash: hashA, rubricHash: hashB, schemaHash: hashC, samplerHash: hashD,
    sampleSize: 100, p0Recall: 1, p1Recall: 0.96, cleanPrecision: 0.99, criticalFalseCleanCount: 0, exactByteRepeatability: 0.97, p0P1DecisionFlipCount: 0,
    evidenceTimecodeValidity: 0.96, structuredOutputValidity: 1, qualifiedAt: "2026-08-25T00:00:00.000Z", expiresAt: "2027-08-25T00:00:00.000Z", evidenceHash: hashE, ...overrides,
  };
}

async function createRun(db, overrides = {}) {
  const bundle = await createFactoryEvidenceBundle(db, bundleInput());
  const qualifications = new Map();
  for (const layer of FACTORY_ASSURANCE_LAYERS) qualifications.set(layer, (await registerFactoryAssuranceJudgeQualification(db, qualificationInput(layer))).qualificationId);
  const run = await startFactoryAssuranceRun(db, {
    runKey: "factory:assurance:run:0001", videoId: "video-assurance", channelId: "hidden-systems", formatKey: "hidden-systems-documentary", evidenceBundleId: bundle.bundleId,
    exactArtifactHash: hashB, policyVersion: "AI_FIRST_PRODUCTION_ASSURANCE_V1", standardVersion: "VIDEO_QUALITY_STANDARD_V3", requiredLayers: [...FACTORY_ASSURANCE_LAYERS], producerId: "producer:fixture",
    rightsState: "PASS", costReconciliationState: "RECONCILED", activeProviderRequests: 0, evidenceHash: hashF, ...overrides,
  });
  return { bundle, qualifications, run };
}

test("migration 0114 installs immutable exact evidence and L0-L7 assurance foundation with zero downstream authority", () => {
  assert.equal(migrations.at(-1), "0124_factory_assurance_controlled_fixture_materialization_admission.sql");
  const migration = read("drizzle/0114_factory_evidence_lineage_and_assurance_foundation.sql");
  for (const table of ["factory_evidence_bundles", "factory_evidence_items", "factory_assurance_judge_qualifications", "factory_assurance_runs", "factory_assurance_layer_receipts", "factory_assurance_decision_receipts", "factory_assurance_drift_receipts"]) assert.ok(migration.includes("CREATE TABLE `" + table + "`"));
  assert.match(migration, /candidate_outcome.*AI_ACCEPTED/);
  assert.match(migration, /acceptance_authority.*= 0/);
  assert.match(migration, /acceptance_authority.*ADVISORY_ONLY/);
  assert.doesNotMatch(migration, /api\.openai\.com|elevenlabs\.io|youtube-ai-factory-v2/);
});

test("exact evidence bundle and L0-L7 shadow receipts remain append-only and cannot self-accept", async () => {
  const { database, db } = setup();
  const { bundle, qualifications, run } = await createRun(db);
  assert.equal(bundle.coverageState, "COMPLETE"); assert.equal(bundle.acceptanceAuthority, false); assert.equal(run.acceptanceAuthority, false);
  assert.equal((await createFactoryEvidenceBundle(db, bundleInput())).outcome, "IDEMPOTENT_REPLAY");
  await assert.rejects(() => recordFactoryAssuranceLayerReceipt(db, {
    runId: run.runId, assuranceLayer: "L0", qualificationId: qualifications.get("L0"), observerId: "producer:fixture", exactArtifactHash: hashB, outcome: "PASS", score: 99,
    p0Count: 0, p1Count: 0, p2Count: 0, p3Count: 0, confidence: 0.99, findings: [], evidenceRefs: ["factory:evidence:l0:0001"], unobservedDimensions: [], evidenceHash: hashA, observedAt: "2026-08-25T01:00:00.000Z",
  }), (error) => error?.reasons?.includes("PRODUCER_CANNOT_PASS_OWN_OUTPUT"));
  for (const layer of FACTORY_ASSURANCE_LAYERS) await recordFactoryAssuranceLayerReceipt(db, {
    runId: run.runId, assuranceLayer: layer, qualificationId: qualifications.get(layer), observerId: `observer:${layer.toLowerCase()}`, exactArtifactHash: hashB, outcome: "PASS", score: 96,
    p0Count: 0, p1Count: 0, p2Count: 0, p3Count: 0, confidence: 0.97, findings: [], evidenceRefs: [`factory:evidence:${layer.toLowerCase()}:0001`], unobservedDimensions: [], evidenceHash: hashA, observedAt: "2026-08-25T01:00:00.000Z",
  });
  const decision = await adjudicateFactoryAssuranceRun(db, { runId: run.runId, decisionKey: "factory:assurance:decision:0001", exactArtifactHash: hashB, overallScore: 96, adjudicatorConfidence: 0.97,
    criticalDimensionScores: { factual: 96, semantic: 96, audio: 96 }, criticalDimensionFloors: { factual: 95, semantic: 95, audio: 90 }, disagreement: [], rootOwner: "owner:human-exception", evidenceHash: hashC });
  assert.equal(decision.candidateOutcome, "AI_ACCEPTED");
  assert.equal(decision.decision, "HUMAN_ESCALATION_REQUIRED");
  assert.ok(decision.reasons.includes("AUTO_ACCEPT_AUTHORITY_NOT_QUALIFIED"));
  assert.equal(database.prepare("SELECT COUNT(*) total FROM factory_assurance_layer_receipts WHERE pass_authority=0").get().total, 8);
  assert.throws(() => database.prepare("UPDATE factory_assurance_decision_receipts SET outcome='CONTENT_REJECTED'").run(), /FACTORY_ASSURANCE_DECISION_RECEIPTS_APPEND_ONLY/);
});

test("infrastructure gaps stay ASSURANCE_INCOMPLETE while proved hard failures become CONTENT_REJECTED", async () => {
  {
    const { db } = setup(); const { run } = await createRun(db, { rightsState: "UNKNOWN", costReconciliationState: "UNKNOWN_SPEND_RESERVED", activeProviderRequests: 1 });
    const result = await adjudicateFactoryAssuranceRun(db, { runId: run.runId, decisionKey: "factory:assurance:decision:incomplete:0001", exactArtifactHash: hashB,
      criticalDimensionScores: {}, criticalDimensionFloors: {}, disagreement: [], rootOwner: "runtime:assurance", evidenceHash: hashA });
    assert.equal(result.decision, "ASSURANCE_INCOMPLETE");
    assert.equal(result.candidateOutcome, "ASSURANCE_INCOMPLETE");
  }
  {
    const { db } = setup(); const { run, qualifications } = await createRun(db);
    await recordFactoryAssuranceLayerReceipt(db, { runId: run.runId, assuranceLayer: "L0", qualificationId: qualifications.get("L0"), observerId: "checker:l0", exactArtifactHash: hashB,
      outcome: "FAIL", score: 20, p0Count: 1, p1Count: 0, p2Count: 0, p3Count: 0, confidence: 1, findings: [{ severity: "P0", startFrame: 0, endFrameExclusive: 1 }],
      evidenceRefs: ["factory:evidence:l0:0001"], unobservedDimensions: [], evidenceHash: hashA, observedAt: "2026-08-25T01:00:00.000Z" });
    const result = await adjudicateFactoryAssuranceRun(db, { runId: run.runId, decisionKey: "factory:assurance:decision:reject:0001", exactArtifactHash: hashB, overallScore: 20, adjudicatorConfidence: 1,
      criticalDimensionScores: { technical: 20 }, criticalDimensionFloors: { technical: 95 }, disagreement: [], rootOwner: "runtime:renderer", evidenceHash: hashA });
    assert.equal(result.decision, "CONTENT_REJECTED");
  }
});

test("prompt, rubric, schema or sampler drift stales qualification and blocks a new PASS receipt", async () => {
  const { database, db } = setup(); const { run, qualifications } = await createRun(db);
  const qualificationId = qualifications.get("L2");
  const drift = await recordFactoryAssuranceDependencyDrift(db, { qualificationId, observationKey: "factory:assurance:drift:l2:0001",
    observed: { judgeVersion: "JUDGE_L2_V1", modelVersion: "MODEL_V1", promptHash: hashF, rubricHash: hashB, schemaHash: hashC, samplerHash: hashD }, observedAt: "2026-08-25T01:00:00.000Z", evidenceHash: hashE });
  assert.equal(drift.driftState, "STALE"); assert.deepEqual(drift.driftDimensions, ["promptHash"]); assert.equal(drift.passAuthority, false);
  await assert.rejects(() => recordFactoryAssuranceLayerReceipt(db, { runId: run.runId, assuranceLayer: "L2", qualificationId, observerId: "observer:l2", exactArtifactHash: hashB,
    outcome: "PASS", score: 96, p0Count: 0, p1Count: 0, p2Count: 0, p3Count: 0, confidence: 0.97, findings: [], evidenceRefs: ["factory:evidence:l2:0001"], unobservedDimensions: [], evidenceHash: hashA, observedAt: "2026-08-25T02:00:00.000Z" }), (error) => error?.reasons?.includes("QUALIFICATION_NOT_CURRENT"));
  assert.throws(() => database.prepare("DELETE FROM factory_assurance_drift_receipts").run(), /FACTORY_ASSURANCE_DRIFT_RECEIPTS_APPEND_ONLY/);
});
