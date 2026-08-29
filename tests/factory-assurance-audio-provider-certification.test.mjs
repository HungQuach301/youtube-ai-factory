import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { certifyFactoryAssuranceAudioProvider } from "../lib/factory-assurance-audio-provider-certification.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const migrations = readdirSync(new URL("../drizzle", import.meta.url)).filter((name) => name.endsWith(".sql")).sort();
const hash = (value) => createHash("sha256").update(value).digest("hex");
const H = Object.fromEntries("abcdefghijklmno".split("").map((key) => [key, hash(key)]));

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
  const objects = new Map();
  const bucket = {
    async put(key, value) {
      const bytes = typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(value.buffer ?? value, value.byteOffset ?? 0, value.byteLength ?? value.length);
      objects.set(key, bytes.slice());
    },
    async get(key) {
      const bytes = objects.get(key); if (!bytes) return null;
      return { async arrayBuffer() { return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength); } };
    },
  };
  return { database, db: d1(database), bucket, objects };
}

function seedExactEvidence(database, objects) {
  const bytes = new Uint8Array(12_345); for (let index = 0; index < bytes.length; index += 1) bytes[index] = index % 251;
  const artifactHash = createHash("sha256").update(bytes).digest("hex"), storageKey = "factory/test/clean-audio.mp3";
  objects.set(storageKey, bytes);
  database.exec("PRAGMA foreign_keys=OFF");
  database.prepare(`INSERT INTO factory_assurance_controlled_fixture_audio_preflight_runs
    (id,admission_run_id,admission_item_id,replacement_plan_run_id,work_order_id,remediation_snapshot_id,idempotency_key,request_hash,policy_version,future_work_request_id,cost_envelope_id,typed_request_contracts,exact_audio_bindings,exact_audio_qualifications,exact_audio_rights_receipts,exact_audio_current_drift_receipts,exact_audio_route_ready_bindings,active_cost_envelopes,canonical_work_requests,canonical_route_decisions,canonical_cost_reservations,dispatch_ready_items,blocked_items,planned_max_provider_requests,planned_max_spend_micros,preflight_state,blockers_json,lifecycle_state,evaluated_at,actor,count_eligible,qualification_authority,pass_authority,provider_dispatch_authority,cost_reservation_authority,r22_authority,master_authority,release_authority,publication_authority,provider_requests,spend_micros,manifest_hash,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      "preflight-0125","admission","admission-item","replacement-plan","work-order","snapshot","preflight-idempotency-0001",H.a,"FACTORY_ASSURANCE_CONTROLLED_FIXTURE_AUDIO_PREFLIGHT_V1","future-request","envelope",1,0,0,0,0,0,1,0,0,0,0,1,2,80000,"BLOCKED",JSON.stringify(["EXACT_AUDIO_PROVIDER_BINDING_REQUIRED"]),"COMPLETE","2026-08-29T00:00:00.000Z","owner@example.com",0,0,0,0,0,0,0,0,0,0,0,H.b,H.c,
    );
  database.prepare(`INSERT INTO factory_assurance_controlled_fixture_audio_request_contracts
    (id,run_id,admission_item_id,work_order_id,future_work_request_id,capability_key,capability_version,archetype,input_contract_json,input_hash,payload_bytes,output_schema_json,output_schema_hash,settings_contract_json,settings_hash,quality_standard_version,rights_policy_version,retention_policy_version,dispatch_mode,max_provider_requests,max_spend_micros,fallback_allowed,cost_envelope_id,binding_id,qualification_id,rights_receipt_id,drift_receipt_id,canonical_work_request_id,canonical_route_decision_id,canonical_cost_reservation_id,route_preflight_state,blockers_json,materialization_state,policy_version,count_eligible,qualification_authority,pass_authority,provider_dispatch_authority,cost_reservation_authority,r22_authority,master_authority,release_authority,publication_authority,provider_requests,spend_micros,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      "audio-contract-0125","preflight-0125","admission-item","work-order","future-request","CONTROLLED_FIXTURE_CLEAN_AUDIO_SYNTHESIS","V1","CLEAN_AUDIO_CONTROL",JSON.stringify({ text: "sealed" }),H.d,320,JSON.stringify({ type: "audio/mpeg" }),H.e,JSON.stringify({ voiceIdentity: "PINNED_EXACTLY_AT_BINDING" }),H.f,"FACTORY_CONTROLLED_FIXTURE_AUDIO_QUALITY_STANDARD_V1","FACTORY_CONTROLLED_FIXTURE_AUDIO_COMMERCIAL_RIGHTS_V1","FACTORY_CONTROLLED_FIXTURE_AUDIO_RETENTION_V1","PLAN_ONLY",2,80000,0,"envelope",null,null,null,null,null,null,null,"BLOCKED",JSON.stringify(["EXACT_AUDIO_PROVIDER_BINDING_REQUIRED"]),"NOT_MATERIALIZED","FACTORY_ASSURANCE_CONTROLLED_FIXTURE_AUDIO_PREFLIGHT_V1",0,0,0,0,0,0,0,0,0,0,0,H.g,
    );
  database.prepare(`INSERT INTO v7_evaluation_commercial_subscription_receipts
    (id,run_id,channel_id,policy_version,entitlement_policy_version,subscription_tier,subscription_status,entitlement_state,commercial_use_eligible,exact_response_hash,response_byte_size,r2_storage_key,r2_readback_hash,r2_readback_verified,observed_at,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run("subscription-old","commercial-run","channel-hidden-systems","COMMERCIAL_CLEAN_AUDIO_REGENERATION_V1","ELEVENLABS_COMMERCIAL_ENTITLEMENT_V1","starter","active","EXPLICIT_ACTIVE_PAID_BASE_PLAN",1,H.h,100,"subscription.json",H.h,1,"2026-08-20T00:00:00.000Z",H.i);
  database.prepare(`INSERT INTO v7_evaluation_commercial_clean_audio_provider_receipts
    (id,run_id,subscription_receipt_id,channel_id,provider_native_request_id,exact_response_hash,response_byte_size,voice_id,model_id,settings_hash,narration_hash,r2_storage_key,r2_readback_hash,r2_readback_verified,rights_state,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run("provider-old","commercial-run","subscription-old","channel-hidden-systems","native-request-old",artifactHash,bytes.length,"JBFqnCBsd6RMkjVDRZzb","eleven_multilingual_v2","e9155130223efee78f8e83109f9057003d2ceea67cda385e43fb2d25c510911d",H.j,storageKey,artifactHash,1,"PASS",H.k);
  database.prepare(`INSERT INTO v7_evaluation_commercial_clean_audio_artifacts
    (id,run_id,provider_receipt_id,channel_id,policy_version,replaces_artifact_id,storage_key,mime_type,byte_size,sha256,materialization_state,rights_state,owner_ground_truth_state,factory_audio_qa_state,dataset_eligible,qualification_eligible,release_eligible)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run("artifact-old","commercial-run","provider-old","channel-hidden-systems","COMMERCIAL_CLEAN_AUDIO_REGENERATION_V1","replaced-old",storageKey,"audio/mpeg",bytes.length,artifactHash,"BYTES_PROVIDER_ENTITLEMENT_AND_RIGHTS_VERIFIED","PASS","NOT_EVALUATED","PENDING",0,0,0);
  database.prepare(`INSERT INTO v7_evaluation_commercial_clean_audio_rights_receipts
    (id,artifact_id,provider_receipt_id,subscription_receipt_id,official_terms_snapshot_receipt_id,channel_id,policy_version,jurisdiction_scope,input_ownership_state,model_state,entitlement_state,rights_state,adjudication_outcome,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run("rights-old","artifact-old","provider-old","subscription-old","terms-old","channel-hidden-systems","COMMERCIAL_CLEAN_AUDIO_REGENERATION_V1","NON_EEA_VIETNAM","CHANNEL_AUTHORED_TEXT_HASH_BOUND","NON_BETA_PINNED_MODEL","EXPLICIT_ACTIVE_PAID_BASE_PLAN","PASS","COMMERCIAL_RIGHTS_PASS_GENERATION_TIME_PAID_PLAN",H.l);
  database.prepare(`INSERT INTO v7_evaluation_factory_audio_qa_recovery_receipts
    (id,recovery_run_id,provider_response_receipt_id,failed_run_id,artifact_id,channel_id,policy_version,exact_artifact_hash,model_id,provider_response_id,decision_state,owner_attention_state,overall_score,dimensions_json,p0_count,p1_count,findings_json,rationale,usage_json,actual_spend_usd,authority_boundary,evidence_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run("qa-old","qa-recovery-run","qa-provider-response","qa-failed-run","artifact-old","channel-hidden-systems","FACTORY_AUDIO_QA_RECOVERY_V1",artifactHash,"gpt-audio-1.5","qa-response-id","LIKELY_CLEAN","NO_IMMEDIATE_OWNER_ACTION",98,"[]",0,0,"[]","Exact clean control passed independent audio review.","{}",0.01,"INDEPENDENT_REVIEW_ONLY",H.m);
  database.prepare(`INSERT INTO v7_evaluation_clean_audio_owner_ground_truth_receipts
    (id,task_id,artifact_id,qa_recovery_receipt_id,channel_id,policy_version,exact_artifact_hash,decision_state,full_listen_attested,observed_defects_json,rationale,actor,idempotency_key,request_hash,evidence_hash,authority_boundary,dataset_sealing_authority,assurance_qualification_authority,release_authority)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run("owner-old","owner-task","artifact-old","qa-old","channel-hidden-systems","CLEAN_AUDIO_OWNER_GROUND_TRUTH_V1",artifactHash,"CLEAN_CONFIRMED",1,"[]","Owner listened fully and confirmed the exact clean control.","owner@example.com","owner-ground-truth-0001",H.n,H.o,"OWNER_GROUND_TRUTH_ONLY",0,0,0);
  database.prepare(`INSERT INTO v7_evaluation_clean_audio_control_eligibility_receipts
    (id,task_id,channel_id,policy_version,blueprint_id,artifact_id,rights_receipt_id,qa_recovery_receipt_id,owner_receipt_id,exact_artifact_hash,r2_readback_hash,r2_readback_bytes,fixture_role,candidate_kind,decision_state,bytes_state,checksum_state,provenance_state,rights_state,factory_qa_state,owner_ground_truth_state,audio_observable_labels_json,lineage_group_key,independent_count_eligible,reference_eligible,candidate_items_after,owner_confirmed_references_after,clean_negative_controls_after,controlled_injection_fixtures_after,p0_families_covered_after,p0_families_required,readiness_state,actor,idempotency_key,request_hash,evidence_hash,authority_boundary,provider_requests,spend_usd,dataset_eligible,dataset_sealing_authority,assurance_qualification_authority,release_eligible,release_authority)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      "eligibility-old","eligibility-task","channel-hidden-systems","CLEAN_AUDIO_CONTROL_ELIGIBILITY_V1","blueprint-old","artifact-old","rights-old","qa-old","owner-old",artifactHash,artifactHash,bytes.length,"CLEAN_NEGATIVE","AUDIO","ELIGIBLE_CLEAN_CONTROL_REFERENCE","READBACK_VERIFIED","PASS","PASS","PASS","LIKELY_CLEAN","CLEAN_CONFIRMED","[]","controlled-fixture:clean-audio:v1",1,1,1,1,1,0,0,5,"INSUFFICIENT_GROUND_TRUTH","owner@example.com","clean-control-eligibility-0001",H.a,H.b,"CLEAN_CONTROL_REFERENCE_ONLY",0,0,0,0,0,0,0,
    );
  database.exec("PRAGMA foreign_keys=ON");
  return artifactHash;
}

function providerFetch() {
  let calls = 0;
  const fetcher = async (input) => {
    calls += 1; const url = String(input);
    if (url.endsWith("/v1/user/subscription")) return Response.json({ tier: "starter", status: "active" });
    if (url.includes("/v1/voices/")) return Response.json({ voice_id: "JBFqnCBsd6RMkjVDRZzb", name: "Documentary narrator", category: "premade" });
    if (url.endsWith("/v1/models")) return Response.json([{ model_id: "eleven_multilingual_v2", can_do_text_to_speech: true, requires_alpha_access: false, can_use_style: true, can_use_speaker_boost: true, maximum_text_length_per_request: 10_000 }]);
    return Response.json({ article: { id: 13313564601361, updated_at: "2026-08-11T11:49:17Z", body: "All paid plans include a commercial license, provided you are not using Beta Services." } });
  };
  return { fetcher, calls: () => calls };
}

test("certifies one exact ElevenLabs audio binding from sealed clean evidence and current zero-generation observations", async () => {
  const { database, db, bucket, objects } = setup(); seedExactEvidence(database, objects);
  const provider = providerFetch();
  const input = { env: { DB: db, BUCKET: bucket, ELEVENLABS_API_KEY: "test-secret" }, actor: "owner@example.com", idempotencyKey: "assurance-audio-provider-certification-test-0001", observedAt: "2026-08-29T01:00:00.000Z", fetcher: provider.fetcher };
  const result = await certifyFactoryAssuranceAudioProvider(input);
  assert.equal(result.certificationState, "CERTIFIED", JSON.stringify(result));
  assert.deepEqual({ state: result.certificationState, bindings: result.exactAudioBindings, qualifications: result.exactAudioQualifications, rights: result.exactAudioRightsReceipts, drift: result.exactAudioCurrentDriftReceipts, ready: result.exactAudioRouteReadyBindings, metadataReads: result.providerMetadataReads, rightsReads: result.publicRightsReads, generations: result.providerGenerationRequests, workRequests: result.canonicalWorkRequests, reservations: result.canonicalCostReservations, spend: result.spendMicros },
    { state: "CERTIFIED", bindings: 1, qualifications: 1, rights: 1, drift: 1, ready: 1, metadataReads: 3, rightsReads: 1, generations: 0, workRequests: 0, reservations: 0, spend: 0 });
  assert.equal(provider.calls(), 4);
  assert.equal(database.prepare("SELECT COUNT(*) count FROM factory_provider_work_requests").get().count, 0);
  assert.equal(database.prepare("SELECT COUNT(*) count FROM factory_provider_cost_reservations").get().count, 0);
  assert.equal(database.prepare("SELECT drift_state FROM factory_provider_drift_receipts WHERE id=?").get(result.driftReceiptId).drift_state, "CURRENT");
  assert.equal(database.prepare("SELECT commercial_use_state FROM factory_rights_eligibility_receipts WHERE id=?").get(result.rightsReceiptId).commercial_use_state, "ELIGIBLE");
  assert.equal((await certifyFactoryAssuranceAudioProvider(input)).outcome, "IDEMPOTENT_REPLAY");
  assert.equal(provider.calls(), 4);
  assert.throws(() => database.prepare("UPDATE factory_assurance_audio_provider_certification_runs SET certification_state='BLOCKED'").run(), /APPEND_ONLY/);
});

test("records BLOCKED without canonical provider controls when the historical exact clean reference is absent", async () => {
  const { database, db, bucket } = setup();
  database.exec("PRAGMA foreign_keys=OFF");
  database.prepare(`INSERT INTO factory_assurance_controlled_fixture_audio_preflight_runs
    (id,admission_run_id,admission_item_id,replacement_plan_run_id,work_order_id,remediation_snapshot_id,idempotency_key,request_hash,policy_version,future_work_request_id,cost_envelope_id,typed_request_contracts,exact_audio_bindings,exact_audio_qualifications,exact_audio_rights_receipts,exact_audio_current_drift_receipts,exact_audio_route_ready_bindings,active_cost_envelopes,canonical_work_requests,canonical_route_decisions,canonical_cost_reservations,dispatch_ready_items,blocked_items,planned_max_provider_requests,planned_max_spend_micros,preflight_state,blockers_json,lifecycle_state,evaluated_at,actor,count_eligible,qualification_authority,pass_authority,provider_dispatch_authority,cost_reservation_authority,r22_authority,master_authority,release_authority,publication_authority,provider_requests,spend_micros,manifest_hash,evidence_hash)
    VALUES ('preflight-blocked','a','b','c','d','e','preflight-blocked-0001',?, 'FACTORY_ASSURANCE_CONTROLLED_FIXTURE_AUDIO_PREFLIGHT_V1','f','g',1,0,0,0,0,0,1,0,0,0,0,1,2,80000,'BLOCKED','[]','COMPLETE','2026-08-29T00:00:00.000Z','owner@example.com',0,0,0,0,0,0,0,0,0,0,0,?,?)`).run(H.a,H.b,H.c);
  database.prepare(`INSERT INTO factory_assurance_controlled_fixture_audio_request_contracts
    (id,run_id,admission_item_id,work_order_id,future_work_request_id,capability_key,capability_version,archetype,input_contract_json,input_hash,payload_bytes,output_schema_json,output_schema_hash,settings_contract_json,settings_hash,quality_standard_version,rights_policy_version,retention_policy_version,dispatch_mode,max_provider_requests,max_spend_micros,fallback_allowed,cost_envelope_id,route_preflight_state,blockers_json,materialization_state,policy_version,count_eligible,qualification_authority,pass_authority,provider_dispatch_authority,cost_reservation_authority,r22_authority,master_authority,release_authority,publication_authority,provider_requests,spend_micros,evidence_hash)
    VALUES ('contract-blocked','preflight-blocked','b','d','f','CONTROLLED_FIXTURE_CLEAN_AUDIO_SYNTHESIS','V1','CLEAN_AUDIO_CONTROL','{}',?,100,'{}',?,'{}',?,'FACTORY_CONTROLLED_FIXTURE_AUDIO_QUALITY_STANDARD_V1','FACTORY_CONTROLLED_FIXTURE_AUDIO_COMMERCIAL_RIGHTS_V1','FACTORY_CONTROLLED_FIXTURE_AUDIO_RETENTION_V1','PLAN_ONLY',2,80000,0,'g','BLOCKED','[]','NOT_MATERIALIZED','FACTORY_ASSURANCE_CONTROLLED_FIXTURE_AUDIO_PREFLIGHT_V1',0,0,0,0,0,0,0,0,0,0,0,?)`).run(H.d,H.e,H.f,H.g);
  database.exec("PRAGMA foreign_keys=ON");
  const provider = providerFetch();
  const result = await certifyFactoryAssuranceAudioProvider({ env: { DB: db, BUCKET: bucket, ELEVENLABS_API_KEY: "test-secret" }, actor: "owner@example.com", idempotencyKey: "assurance-audio-provider-certification-blocked-0001", observedAt: "2026-08-29T01:00:00.000Z", fetcher: provider.fetcher });
  assert.equal(result.certificationState, "BLOCKED");
  assert.ok(result.blockers.includes("HISTORICAL_CLEAN_AUDIO_REFERENCE_REQUIRED"));
  assert.equal(database.prepare("SELECT COUNT(*) count FROM factory_provider_bindings WHERE capability_id IN (SELECT id FROM factory_capabilities WHERE capability_key='CONTROLLED_FIXTURE_CLEAN_AUDIO_SYNTHESIS')").get().count, 0);
  assert.equal(database.prepare("SELECT provider_generation_requests FROM factory_assurance_audio_provider_certification_runs").get().provider_generation_requests, 0);
});
