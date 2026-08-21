CREATE TABLE `v7_learning_ready_contract_registry` (
  `id` text PRIMARY KEY NOT NULL,
  `contract_key` text NOT NULL,
  `artifact_type` text NOT NULL,
  `contract_version` text NOT NULL,
  `owner_plane` text NOT NULL,
  `stage_bindings_json` text NOT NULL,
  `required_parent_types_json` text NOT NULL,
  `exit_evidence_json` text NOT NULL,
  `lifecycle_state` text NOT NULL DEFAULT 'SCHEMA_DEFINED',
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `active` integer NOT NULL DEFAULT 1,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_learning_ready_registry_key_version_uq` ON `v7_learning_ready_contract_registry` (`contract_key`,`contract_version`);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_learning_ready_registry_artifact_version_uq` ON `v7_learning_ready_contract_registry` (`artifact_type`,`contract_version`);
--> statement-breakpoint
CREATE TABLE `v7_channel_identity_contracts` (
  `id` text PRIMARY KEY NOT NULL, `channel_id` text NOT NULL, `version` integer NOT NULL CHECK (`version` > 0), `lifecycle_state` text NOT NULL DEFAULT 'DRAFT',
  `strategy_binding_hash` text NOT NULL, `voice_json` text NOT NULL, `voice_settings_hash` text NOT NULL, `visual_grammar_json` text NOT NULL,
  `music_policy_json` text NOT NULL, `pronunciation_lexicon_ref` text NOT NULL, `terminology_ledger_ref` text NOT NULL, `content_hash` text,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP, `sealed_at` text, `superseded_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_channel_identity_version_uq` ON `v7_channel_identity_contracts` (`channel_id`,`version`);
--> statement-breakpoint
CREATE INDEX `v7_channel_identity_state_idx` ON `v7_channel_identity_contracts` (`channel_id`,`lifecycle_state`);
--> statement-breakpoint
CREATE TABLE `v7_packaging_promise_contracts` (
  `id` text PRIMARY KEY NOT NULL, `queue_id` text NOT NULL, `version` integer NOT NULL CHECK (`version` > 0), `lifecycle_state` text NOT NULL DEFAULT 'DRAFT',
  `creative_route_id` text NOT NULL, `channel_identity_hash` text NOT NULL, `title_variants_json` text NOT NULL, `thumbnail_concept_json` text NOT NULL,
  `audience_promise` text NOT NULL, `differentiation_hypothesis` text NOT NULL, `promised_claim_ids_json` text NOT NULL, `mobile_legibility_state` text NOT NULL DEFAULT 'NOT_EVALUATED',
  `content_hash` text, `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP, `sealed_at` text, `superseded_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_packaging_promise_queue_version_uq` ON `v7_packaging_promise_contracts` (`queue_id`,`version`);
--> statement-breakpoint
CREATE INDEX `v7_packaging_promise_state_idx` ON `v7_packaging_promise_contracts` (`queue_id`,`lifecycle_state`);
--> statement-breakpoint
CREATE TABLE `v7_predicted_performance_artifacts` (
  `id` text PRIMARY KEY NOT NULL, `queue_id` text NOT NULL, `version` integer NOT NULL CHECK (`version` > 0), `lifecycle_state` text NOT NULL DEFAULT 'DRAFT',
  `baseline_ref` text NOT NULL, `packaging_promise_hash` text NOT NULL, `composition_stage_hashes_json` text NOT NULL, `retention_curve_json` text NOT NULL,
  `beat_risks_json` text NOT NULL, `predicted_ctr_json` text NOT NULL, `critic_predictions_json` text NOT NULL, `content_hash` text,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP, `sealed_at` text, `superseded_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_predicted_performance_queue_version_uq` ON `v7_predicted_performance_artifacts` (`queue_id`,`version`);
--> statement-breakpoint
CREATE INDEX `v7_predicted_performance_state_idx` ON `v7_predicted_performance_artifacts` (`queue_id`,`lifecycle_state`);
--> statement-breakpoint
CREATE TABLE `v7_experiment_definitions` (
  `id` text PRIMARY KEY NOT NULL, `channel_id` text NOT NULL, `version` integer NOT NULL CHECK (`version` > 0), `lifecycle_state` text NOT NULL DEFAULT 'DRAFT',
  `hypothesis` text NOT NULL, `variable_tested` text NOT NULL, `variables_held_constant_json` text NOT NULL, `minimum_sample_size` integer NOT NULL CHECK (`minimum_sample_size` >= 2),
  `decision_criterion_json` text NOT NULL, `packaging_promise_hash` text NOT NULL, `prediction_hash` text NOT NULL, `content_hash` text,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP, `activated_at` text, `concluded_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_experiment_channel_version_uq` ON `v7_experiment_definitions` (`channel_id`,`version`);
--> statement-breakpoint
CREATE INDEX `v7_experiment_state_idx` ON `v7_experiment_definitions` (`channel_id`,`lifecycle_state`);
--> statement-breakpoint
CREATE TABLE `v7_learning_candidates` (
  `id` text PRIMARY KEY NOT NULL, `channel_id` text NOT NULL, `experiment_id` text NOT NULL, `lifecycle_state` text NOT NULL DEFAULT 'INSUFFICIENT_EVIDENCE',
  `target` text NOT NULL CHECK (`target` IN ('CHANNEL_STRATEGY','PRODUCTION_STANDARD')), `target_version` integer NOT NULL CHECK (`target_version` > 0),
  `independent_video_ids_json` text NOT NULL, `observed_sample_size` integer NOT NULL DEFAULT 0 CHECK (`observed_sample_size` >= 0), `actual_vs_predicted_json` text NOT NULL,
  `consistent_direction` integer NOT NULL DEFAULT 0, `evidence_hash` text, `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP, `eligible_at` text, `promoted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_learning_candidate_experiment_target_uq` ON `v7_learning_candidates` (`experiment_id`,`target`);
--> statement-breakpoint
CREATE INDEX `v7_learning_candidate_state_idx` ON `v7_learning_candidates` (`channel_id`,`lifecycle_state`);
--> statement-breakpoint
CREATE TABLE `v7_learning_promotion_receipts` (
  `id` text PRIMARY KEY NOT NULL, `learning_candidate_id` text NOT NULL, `command_version` text NOT NULL CHECK (`command_version` = 'PROMOTE_LEARNING_V1'),
  `idempotency_key` text NOT NULL, `actor_email` text NOT NULL, `owner_identity_bound` integer NOT NULL CHECK (`owner_identity_bound` = 1),
  `target` text NOT NULL CHECK (`target` IN ('CHANNEL_STRATEGY','PRODUCTION_STANDARD')), `prior_version` integer NOT NULL CHECK (`prior_version` > 0),
  `new_version` integer NOT NULL CHECK (`new_version` > `prior_version`), `evidence_hash` text NOT NULL, `outcome` text NOT NULL,
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0), `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_learning_promotion_idempotency_uq` ON `v7_learning_promotion_receipts` (`idempotency_key`);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_learning_promotion_candidate_uq` ON `v7_learning_promotion_receipts` (`learning_candidate_id`);
--> statement-breakpoint
CREATE TABLE `v7_rights_compliance_manifests` (
  `id` text PRIMARY KEY NOT NULL, `queue_id` text NOT NULL, `version` integer NOT NULL CHECK (`version` > 0), `lifecycle_state` text NOT NULL DEFAULT 'NOT_EVALUATED',
  `license_terms_json` text NOT NULL, `territory_json` text NOT NULL, `valid_from` text NOT NULL, `valid_until` text NOT NULL, `commercial_use` integer NOT NULL,
  `editorial_only` integer NOT NULL, `content_id_state` text NOT NULL DEFAULT 'NOT_EVALUATED', `ai_disclosure_state` text NOT NULL DEFAULT 'NOT_EVALUATED',
  `advertiser_friendly_state` text NOT NULL DEFAULT 'NOT_EVALUATED', `reused_content_state` text NOT NULL DEFAULT 'NOT_EVALUATED', `evidence_hash` text,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP, `sealed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_rights_compliance_queue_version_uq` ON `v7_rights_compliance_manifests` (`queue_id`,`version`);
--> statement-breakpoint
CREATE INDEX `v7_rights_compliance_state_idx` ON `v7_rights_compliance_manifests` (`queue_id`,`lifecycle_state`);
--> statement-breakpoint
CREATE TABLE `v7_animatic_contracts` (
  `id` text PRIMARY KEY NOT NULL, `queue_id` text NOT NULL, `version` integer NOT NULL CHECK (`version` > 0), `lifecycle_state` text NOT NULL DEFAULT 'DRAFT',
  `packaging_promise_hash` text NOT NULL, `prediction_hash` text NOT NULL, `shot_cue_program_hash` text NOT NULL, `draft_audio_hash` text NOT NULL,
  `duration_seconds` real NOT NULL CHECK (`duration_seconds` > 0), `timed_frames_json` text NOT NULL, `promise_to_content_state` text NOT NULL DEFAULT 'NOT_EVALUATED',
  `story_retention_state` text NOT NULL DEFAULT 'NOT_EVALUATED', `evidence_hash` text, `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP, `sealed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_animatic_queue_version_uq` ON `v7_animatic_contracts` (`queue_id`,`version`);
--> statement-breakpoint
CREATE INDEX `v7_animatic_state_idx` ON `v7_animatic_contracts` (`queue_id`,`lifecycle_state`);
--> statement-breakpoint
CREATE TABLE `v7_master_delivery_contracts` (
  `id` text PRIMARY KEY NOT NULL, `queue_id` text NOT NULL, `version` integer NOT NULL CHECK (`version` > 0), `lifecycle_state` text NOT NULL DEFAULT 'DRAFT',
  `archival_codec` text NOT NULL CHECK (`archival_codec` IN ('FFV1','PRORES_422_HQ')), `archival_container` text NOT NULL, `archival_audio_codec` text NOT NULL CHECK (`archival_audio_codec` = 'PCM'),
  `archival_sample_rate` integer NOT NULL CHECK (`archival_sample_rate` = 48000), `archival_file_hash` text, `archival_stream_hash` text,
  `distribution_codec` text NOT NULL, `distribution_container` text NOT NULL, `distribution_file_hash` text, `distribution_stream_hash` text,
  `derived_from_archival_hash` text, `r2_reconciliation_state` text NOT NULL DEFAULT 'NOT_EVALUATED', `drive_reconciliation_state` text NOT NULL DEFAULT 'NOT_EVALUATED',
  `rights_manifest_hash` text NOT NULL, `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP, `sealed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_master_delivery_queue_version_uq` ON `v7_master_delivery_contracts` (`queue_id`,`version`);
--> statement-breakpoint
CREATE INDEX `v7_master_delivery_state_idx` ON `v7_master_delivery_contracts` (`queue_id`,`lifecycle_state`);
--> statement-breakpoint
INSERT INTO `v7_learning_ready_contract_registry`
  (`id`,`contract_key`,`artifact_type`,`contract_version`,`owner_plane`,`stage_bindings_json`,`required_parent_types_json`,`exit_evidence_json`)
VALUES
  ('LRCP-CHANNEL-IDENTITY','CHANNEL_IDENTITY','CHANNEL_IDENTITY_CONTRACT','LEARNING_READY_CONTRACT_PACK_V1','CHANNEL_IDENTITY','["00","07A","07B"]','["CHANNEL_STRATEGY_BINDING"]','["voice settings hash","visual grammar","music policy","terminology ledger"]'),
  ('LRCP-PACKAGING-PROMISE','PACKAGING_PROMISE','PACKAGING_PROMISE_CONTRACT','LEARNING_READY_CONTRACT_PACK_V1','PACKAGING_PUBLISHING','["04","06","14","15"]','["CREATIVE_ROUTE","CHANNEL_IDENTITY_CONTRACT"]','["title variants","thumbnail concept","audience promise","promise-to-content bindings"]'),
  ('LRCP-PREDICTED-PERFORMANCE','PREDICTED_PERFORMANCE','PREDICTED_PERFORMANCE_ARTIFACT','LEARNING_READY_CONTRACT_PACK_V1','MEASUREMENT_LEARNING','["04","05","08","11","16"]','["PACKAGING_PROMISE_CONTRACT","STORY_CLOCK","SHOT_CUE_PROGRAM"]','["baseline reference","retention curve","beat risks","CTR prediction","composition lineage"]'),
  ('LRCP-EXPERIMENT','EXPERIMENT_DEFINITION','EXPERIMENT_DEFINITION','LEARNING_READY_CONTRACT_PACK_V1','MEASUREMENT_LEARNING','["04","15","16"]','["PACKAGING_PROMISE_CONTRACT","PREDICTED_PERFORMANCE_ARTIFACT"]','["one tested variable","held constants","minimum sample","decision criterion"]'),
  ('LRCP-LEARNING','LEARNING_CANDIDATE','LEARNING_CANDIDATE','LEARNING_READY_CONTRACT_PACK_V1','MEASUREMENT_LEARNING','["16"]','["EXPERIMENT_DEFINITION","ACTUAL_PERFORMANCE_ARTIFACT"]','["actual-versus-predicted","independent video count","evidence sufficiency","target version lineage"]'),
  ('LRCP-RIGHTS-COMPLIANCE','RIGHTS_COMPLIANCE','RIGHTS_COMPLIANCE_MANIFEST','LEARNING_READY_CONTRACT_PACK_V1','RIGHTS_COMPLIANCE','["04","07A","07B","09","10","13","15"]','["CHANNEL_IDENTITY_CONTRACT","PACKAGING_PROMISE_CONTRACT"]','["license terms","territory and duration","commercial eligibility","Content ID","platform disclosures"]'),
  ('LRCP-ANIMATIC','ANIMATIC','ANIMATIC_CONTRACT','LEARNING_READY_CONTRACT_PACK_V1','CONTENT_DESIGN','["08","09"]','["PACKAGING_PROMISE_CONTRACT","PREDICTED_PERFORMANCE_ARTIFACT","SHOT_CUE_PROGRAM"]','["draft audio","timed frames","exact duration","promise-to-content preflight","retention and story verdict"]'),
  ('LRCP-MASTER-DELIVERY','MASTER_DELIVERY','MASTER_DELIVERY_CONTRACT','LEARNING_READY_CONTRACT_PACK_V1','MEDIA_PRODUCTION','["11","12","13","15"]','["EDIT_TIMELINE","RIGHTS_COMPLIANCE_MANIFEST"]','["archival master","PCM 48 kHz","distribution derivative","file and stream hashes","R2 and Drive reconciliation"]');
