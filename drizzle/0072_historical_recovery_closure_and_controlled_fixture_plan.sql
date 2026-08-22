CREATE TABLE `v7_evaluation_historical_recovery_closures` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'EVALUATION_HISTORICAL_RECOVERY_CLOSURE_V1'),
  `metadata_snapshot_id` text NOT NULL,
  `audio_hash_snapshot_id` text NOT NULL,
  `history_items_total` integer NOT NULL CHECK (`history_items_total` > 0),
  `history_items_hash_verified` integer NOT NULL CHECK (`history_items_hash_verified` > 0),
  `candidates_diagnosed` integer NOT NULL CHECK (`candidates_diagnosed` > 0),
  `unique_exact_hash_matches` integer NOT NULL CHECK (`unique_exact_hash_matches` = 0),
  `equivalent_exact_hash_match_sets` integer NOT NULL CHECK (`equivalent_exact_hash_match_sets` = 0),
  `no_exact_hash_matches` integer NOT NULL CHECK (`no_exact_hash_matches` = `candidates_diagnosed`),
  `conclusion` text NOT NULL CHECK (`conclusion` = 'NO_EXACT_PROVIDER_AUDIO_FOUND'),
  `candidate_disposition` text NOT NULL CHECK (`candidate_disposition` = 'QUARANTINE_FAILURE_EVIDENCE_ONLY'),
  `historical_rights_resolution_state` text NOT NULL CHECK (`historical_rights_resolution_state` = 'EXHAUSTED_NO_EXACT_BINDING'),
  `rights_pass_authority` integer NOT NULL DEFAULT 0 CHECK (`rights_pass_authority` = 0),
  `dataset_sealing_authority` integer NOT NULL DEFAULT 0 CHECK (`dataset_sealing_authority` = 0),
  `assurance_qualification_authority` integer NOT NULL DEFAULT 0 CHECK (`assurance_qualification_authority` = 0),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `provider_requests` integer NOT NULL CHECK (`provider_requests` BETWEEN 0 AND 132),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`metadata_snapshot_id`) REFERENCES `v7_evaluation_provider_history_snapshots`(`id`),
  FOREIGN KEY (`audio_hash_snapshot_id`) REFERENCES `v7_evaluation_provider_audio_hash_snapshots`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_historical_recovery_closure_channel_uq` ON `v7_evaluation_historical_recovery_closures` (`channel_id`,`policy_version`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_historical_recovery_closure_no_update`
BEFORE UPDATE ON `v7_evaluation_historical_recovery_closures`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_HISTORICAL_RECOVERY_CLOSURE_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_historical_recovery_closure_no_delete`
BEFORE DELETE ON `v7_evaluation_historical_recovery_closures`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_HISTORICAL_RECOVERY_CLOSURE_IMMUTABLE'); END;
--> statement-breakpoint
INSERT INTO `v7_evaluation_historical_recovery_closures`
  (`id`,`channel_id`,`policy_version`,`metadata_snapshot_id`,`audio_hash_snapshot_id`,`history_items_total`,`history_items_hash_verified`,`candidates_diagnosed`,`unique_exact_hash_matches`,`equivalent_exact_hash_match_sets`,`no_exact_hash_matches`,`conclusion`,`candidate_disposition`,`historical_rights_resolution_state`,`provider_requests`,`spend_usd`)
SELECT
  'historical-recovery-closure:' || a.channel_id,
  a.channel_id,
  'EVALUATION_HISTORICAL_RECOVERY_CLOSURE_V1',
  m.id,
  a.id,
  a.history_items_total,
  a.history_items_hash_verified,
  a.candidates_diagnosed,
  a.unique_exact_hash_matches,
  a.equivalent_exact_hash_match_sets,
  a.no_exact_hash_matches,
  'NO_EXACT_PROVIDER_AUDIO_FOUND',
  'QUARANTINE_FAILURE_EVIDENCE_ONLY',
  'EXHAUSTED_NO_EXACT_BINDING',
  a.provider_requests_cumulative,
  0
FROM `v7_evaluation_provider_audio_hash_snapshots` a
JOIN `v7_evaluation_provider_history_snapshots` m ON m.channel_id=a.channel_id
WHERE a.lifecycle_state='COMPLETE'
  AND a.history_items_hash_verified=a.history_items_total
  AND a.unique_exact_hash_matches=0
  AND a.equivalent_exact_hash_match_sets=0
  AND a.no_exact_hash_matches=a.candidates_diagnosed
  AND a.id=(SELECT latest.id FROM v7_evaluation_provider_audio_hash_snapshots latest WHERE latest.channel_id=a.channel_id ORDER BY latest.created_at DESC,latest.id DESC LIMIT 1)
  AND m.id=(SELECT latest.id FROM v7_evaluation_provider_history_snapshots latest WHERE latest.channel_id=a.channel_id ORDER BY latest.created_at DESC,latest.id DESC LIMIT 1);
--> statement-breakpoint
CREATE TABLE `v7_evaluation_controlled_fixture_plan_registry` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'CONTROLLED_FIXTURE_PLAN_V1'),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` = 'DESIGN_SEALED_MATERIALIZATION_BLOCKED'),
  `target_fixture_count` integer NOT NULL CHECK (`target_fixture_count` BETWEEN 10 AND 15),
  `defect_positive_count` integer NOT NULL CHECK (`defect_positive_count` > 0),
  `clean_negative_count` integer NOT NULL CHECK (`clean_negative_count` >= 2),
  `p0_families_planned` integer NOT NULL CHECK (`p0_families_planned` = 5),
  `p0_families_required` integer NOT NULL CHECK (`p0_families_required` = 5),
  `materialized_fixture_count` integer NOT NULL DEFAULT 0 CHECK (`materialized_fixture_count` = 0),
  `provider_native_identity_required` integer NOT NULL DEFAULT 1 CHECK (`provider_native_identity_required` = 1),
  `exact_response_hash_required` integer NOT NULL DEFAULT 1 CHECK (`exact_response_hash_required` = 1),
  `r2_readback_required` integer NOT NULL DEFAULT 1 CHECK (`r2_readback_required` = 1),
  `commercial_rights_receipt_required` integer NOT NULL DEFAULT 1 CHECK (`commercial_rights_receipt_required` = 1),
  `owner_ground_truth_required` integer NOT NULL DEFAULT 1 CHECK (`owner_ground_truth_required` = 1),
  `dataset_sealing_authority` integer NOT NULL DEFAULT 0 CHECK (`dataset_sealing_authority` = 0),
  `assurance_qualification_authority` integer NOT NULL DEFAULT 0 CHECK (`assurance_qualification_authority` = 0),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_controlled_fixture_plan_registry_channel_uq` ON `v7_evaluation_controlled_fixture_plan_registry` (`channel_id`,`policy_version`);
--> statement-breakpoint
CREATE TABLE `v7_evaluation_controlled_fixture_blueprints` (
  `id` text PRIMARY KEY NOT NULL,
  `plan_id` text NOT NULL,
  `blueprint_key` text NOT NULL UNIQUE,
  `ordinal` integer NOT NULL CHECK (`ordinal` BETWEEN 1 AND 15),
  `fixture_role` text NOT NULL CHECK (`fixture_role` IN ('DEFECT_POSITIVE','CLEAN_NEGATIVE')),
  `candidate_kind` text NOT NULL CHECK (`candidate_kind` IN ('CLIP','SHOT','AUDIO','MASTER','PACKAGING')),
  `modality` text NOT NULL CHECK (`modality` IN ('CONTENT','RIGHTS','AUDIO_VISUAL','MASTER','VISUAL','AUDIO','CONTENT_VISUAL','PACKAGING')),
  `expected_defect_key` text,
  `severity` text NOT NULL CHECK (`severity` IN ('P0','P1','CONTROL')),
  `source_mode` text NOT NULL CHECK (`source_mode` IN ('CHANNEL_AUTHORED_DETERMINISTIC','PROVIDER_GENERATED_BASE_DERIVATION')),
  `injection_method` text NOT NULL,
  `oracle_kind` text NOT NULL CHECK (`oracle_kind` IN ('DETERMINISTIC','OWNER_CONFIRMED','HYBRID')),
  `evidence_requirements_json` text NOT NULL,
  `materialization_state` text NOT NULL DEFAULT 'PLANNED' CHECK (`materialization_state` = 'PLANNED'),
  `qualification_eligible` integer NOT NULL DEFAULT 0 CHECK (`qualification_eligible` = 0),
  `release_eligible` integer NOT NULL DEFAULT 0 CHECK (`release_eligible` = 0),
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`plan_id`) REFERENCES `v7_evaluation_controlled_fixture_plan_registry`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_controlled_fixture_blueprint_ordinal_uq` ON `v7_evaluation_controlled_fixture_blueprints` (`plan_id`,`ordinal`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_controlled_fixture_blueprint_no_update`
BEFORE UPDATE ON `v7_evaluation_controlled_fixture_blueprints`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CONTROLLED_FIXTURE_BLUEPRINT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_controlled_fixture_blueprint_no_delete`
BEFORE DELETE ON `v7_evaluation_controlled_fixture_blueprints`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CONTROLLED_FIXTURE_BLUEPRINT_IMMUTABLE'); END;
--> statement-breakpoint
INSERT INTO `v7_evaluation_controlled_fixture_plan_registry`
  (`id`,`channel_id`,`policy_version`,`lifecycle_state`,`target_fixture_count`,`defect_positive_count`,`clean_negative_count`,`p0_families_planned`,`p0_families_required`)
VALUES
  ('controlled-fixture-plan:hidden-systems:v1','channel-hidden-systems','CONTROLLED_FIXTURE_PLAN_V1','DESIGN_SEALED_MATERIALIZATION_BLOCKED',13,11,2,5,5);
--> statement-breakpoint
INSERT INTO `v7_evaluation_controlled_fixture_blueprints`
  (`id`,`plan_id`,`blueprint_key`,`ordinal`,`fixture_role`,`candidate_kind`,`modality`,`expected_defect_key`,`severity`,`source_mode`,`injection_method`,`oracle_kind`,`evidence_requirements_json`)
VALUES
  ('cfp-v1-01','controlled-fixture-plan:hidden-systems:v1','SAFETY_SCOPE_ESCAPE_POSITIVE',1,'DEFECT_POSITIVE','MASTER','CONTENT','SAFETY_SCOPE_ESCAPE','P0','CHANNEL_AUTHORED_DETERMINISTIC','Insert one explicitly personalized or unsupported financial instruction into an otherwise safe bounded script.','HYBRID','["exact script hash","injected span offsets","owner-confirmed unsafe meaning","release forbidden"]'),
  ('cfp-v1-02','controlled-fixture-plan:hidden-systems:v1','RIGHTS_LINEAGE_MISSING_POSITIVE',2,'DEFECT_POSITIVE','AUDIO','RIGHTS','RIGHTS_LINEAGE_MISSING','P0','CHANNEL_AUTHORED_DETERMINISTIC','Remove one required provider-rights receipt reference from a copied synthetic manifest; use no unlicensed external media.','DETERMINISTIC','["clean manifest hash","mutated manifest hash","removed receipt key","release forbidden"]'),
  ('cfp-v1-03','controlled-fixture-plan:hidden-systems:v1','SEMANTIC_VISUAL_CONTRADICTION_POSITIVE',3,'DEFECT_POSITIVE','CLIP','AUDIO_VISUAL','SEMANTIC_VISUAL_CONTRADICTION','P0','PROVIDER_GENERATED_BASE_DERIVATION','Pair narration asserting state A with an authored visual that explicitly shows mutually exclusive state B.','OWNER_CONFIRMED','["exact narration hash","exact visual hash","contradiction statement","owner label"]'),
  ('cfp-v1-04','controlled-fixture-plan:hidden-systems:v1','MASTER_LINEAGE_INVALID_POSITIVE',4,'DEFECT_POSITIVE','MASTER','MASTER','MASTER_LINEAGE_INVALID','P0','CHANNEL_AUTHORED_DETERMINISTIC','Alter one parent artifact hash in a copied archival-to-distribution lineage manifest.','DETERMINISTIC','["clean parent manifest hash","mutated parent hash","stream checksum","release forbidden"]'),
  ('cfp-v1-05','controlled-fixture-plan:hidden-systems:v1','AUDIO_VIDEO_SYNC_POSITIVE',5,'DEFECT_POSITIVE','CLIP','AUDIO_VISUAL','AUDIO_VIDEO_SYNC','P0','PROVIDER_GENERATED_BASE_DERIVATION','Shift the bound narration by exactly 200 ms against a visible state transition.','HYBRID','["clean parent hashes","declared 200 ms transform","measured sync offset","owner-observable receipt"]'),
  ('cfp-v1-06','controlled-fixture-plan:hidden-systems:v1','PRODUCTION_RESIDUE_POSITIVE',6,'DEFECT_POSITIVE','SHOT','VISUAL','PRODUCTION_RESIDUE','P1','CHANNEL_AUTHORED_DETERMINISTIC','Render the controlled phrase evidence-bound production proof in the audience-visible frame.','DETERMINISTIC','["exact SVG hash","text-node location","render readback hash"]'),
  ('cfp-v1-07','controlled-fixture-plan:hidden-systems:v1','NEAR_STATIC_MOTION_POSITIVE',7,'DEFECT_POSITIVE','CLIP','VISUAL','NEAR_STATIC_MOTION','P1','CHANNEL_AUTHORED_DETERMINISTIC','Hold an otherwise valid authored frame for 12 seconds with no semantic state change.','DETERMINISTIC','["frame-difference trace","12 second duration","motion threshold"]'),
  ('cfp-v1-08','controlled-fixture-plan:hidden-systems:v1','AUDIO_SEAM_POSITIVE',8,'DEFECT_POSITIVE','AUDIO','AUDIO','AUDIO_SEAM','P1','PROVIDER_GENERATED_BASE_DERIVATION','Insert a bounded discontinuity at one declared narration splice while preserving the clean parent.','HYBRID','["clean parent audio hash","splice timestamp","waveform discontinuity","owner-observable receipt"]'),
  ('cfp-v1-09','controlled-fixture-plan:hidden-systems:v1','MOBILE_LEGIBILITY_POSITIVE',9,'DEFECT_POSITIVE','SHOT','VISUAL','MOBILE_LEGIBILITY','P1','CHANNEL_AUTHORED_DETERMINISTIC','Render critical text below the sealed 32 px full-frame mobile floor.','DETERMINISTIC','["exact SVG hash","font size","mobile viewport render hash"]'),
  ('cfp-v1-10','controlled-fixture-plan:hidden-systems:v1','TRANSACTION_STATE_CONFLATION_POSITIVE',10,'DEFECT_POSITIVE','CLIP','CONTENT_VISUAL','TRANSACTION_STATE_CONFLATION','P1','CHANNEL_AUTHORED_DETERMINISTIC','Author one bounded example that explicitly collapses authorization, clearing and settlement into one event.','OWNER_CONFIRMED','["exact script hash","exact visual hash","owner-confirmed conflation"]'),
  ('cfp-v1-11','controlled-fixture-plan:hidden-systems:v1','PACKAGING_PROMISE_MISMATCH_POSITIVE',11,'DEFECT_POSITIVE','PACKAGING','PACKAGING','PACKAGING_PROMISE_MISMATCH','P1','CHANNEL_AUTHORED_DETERMINISTIC','Pair a title and thumbnail claim with a sealed content synopsis that does not deliver that promise.','OWNER_CONFIRMED','["packaging hash","content synopsis hash","owner-confirmed mismatch"]'),
  ('cfp-v1-12','controlled-fixture-plan:hidden-systems:v1','CLEAN_AUDIO_NEGATIVE',12,'CLEAN_NEGATIVE','AUDIO','AUDIO',NULL,'CONTROL','PROVIDER_GENERATED_BASE_DERIVATION','Create a single-voice domain-lexicon narration with no splice and preserve exact provider identity and bytes.','HYBRID','["provider-native request ID","exact response SHA-256","R2 readback","commercial-rights receipt","owner clean label"]'),
  ('cfp-v1-13','controlled-fixture-plan:hidden-systems:v1','CLEAN_AUDIO_VISUAL_MASTER_NEGATIVE',13,'CLEAN_NEGATIVE','MASTER','AUDIO_VISUAL',NULL,'CONTROL','PROVIDER_GENERATED_BASE_DERIVATION','Compose a short authored state animation with the clean narration and valid archival/distribution lineage.','HYBRID','["all parent IDs and hashes","archival checksum","distribution checksum","measured sync","owner clean label"]');
