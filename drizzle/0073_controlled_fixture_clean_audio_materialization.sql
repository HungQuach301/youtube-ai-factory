CREATE TABLE `v7_evaluation_fixture_materialization_policies` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'CONTROLLED_FIXTURE_MATERIALIZATION_V1'),
  `plan_id` text NOT NULL,
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` = 'CLEAN_PARENT_AUDIO_ENABLED'),
  `maximum_materialized_fixtures` integer NOT NULL CHECK (`maximum_materialized_fixtures` = 1),
  `maximum_provider_requests` integer NOT NULL CHECK (`maximum_provider_requests` = 2),
  `maximum_tts_requests` integer NOT NULL CHECK (`maximum_tts_requests` = 1),
  `maximum_tts_characters` integer NOT NULL CHECK (`maximum_tts_characters` = 700),
  `reserved_spend_ceiling_usd` real NOT NULL CHECK (`reserved_spend_ceiling_usd` = 0.08),
  `clean_parent_first` integer NOT NULL CHECK (`clean_parent_first` = 1),
  `commercial_rights_receipt_required` integer NOT NULL CHECK (`commercial_rights_receipt_required` = 1),
  `owner_ground_truth_required` integer NOT NULL CHECK (`owner_ground_truth_required` = 1),
  `rights_pass_authority` integer NOT NULL DEFAULT 0 CHECK (`rights_pass_authority` = 0),
  `dataset_sealing_authority` integer NOT NULL DEFAULT 0 CHECK (`dataset_sealing_authority` = 0),
  `assurance_qualification_authority` integer NOT NULL DEFAULT 0 CHECK (`assurance_qualification_authority` = 0),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`plan_id`) REFERENCES `v7_evaluation_controlled_fixture_plan_registry`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_fixture_materialization_policy_channel_uq` ON `v7_evaluation_fixture_materialization_policies` (`channel_id`,`policy_version`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_fixture_materialization_policy_no_update`
BEFORE UPDATE ON `v7_evaluation_fixture_materialization_policies`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_FIXTURE_MATERIALIZATION_POLICY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_fixture_materialization_policy_no_delete`
BEFORE DELETE ON `v7_evaluation_fixture_materialization_policies`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_FIXTURE_MATERIALIZATION_POLICY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_fixture_voice_identity_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'CONTROLLED_FIXTURE_MATERIALIZATION_V1'),
  `identity_scope` text NOT NULL CHECK (`identity_scope` = 'EVALUATION_FIXTURE_ONLY'),
  `provider_family` text NOT NULL CHECK (`provider_family` = 'ELEVENLABS'),
  `voice_id` text NOT NULL CHECK (`voice_id` = 'JBFqnCBsd6RMkjVDRZzb'),
  `voice_name` text NOT NULL CHECK (`voice_name` = 'Documentary narrator'),
  `model_id` text NOT NULL CHECK (`model_id` = 'eleven_multilingual_v2'),
  `output_format` text NOT NULL CHECK (`output_format` = 'mp3_44100_128'),
  `settings_json` text NOT NULL,
  `settings_hash` text NOT NULL CHECK (length(`settings_hash`) = 64),
  `production_inheritance_authority` integer NOT NULL DEFAULT 0 CHECK (`production_inheritance_authority` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_fixture_voice_identity_channel_uq` ON `v7_evaluation_fixture_voice_identity_receipts` (`channel_id`,`policy_version`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_fixture_voice_identity_no_update`
BEFORE UPDATE ON `v7_evaluation_fixture_voice_identity_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_FIXTURE_VOICE_IDENTITY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_fixture_voice_identity_no_delete`
BEFORE DELETE ON `v7_evaluation_fixture_voice_identity_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_FIXTURE_VOICE_IDENTITY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_fixture_materialization_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'CONTROLLED_FIXTURE_MATERIALIZATION_V1'),
  `blueprint_id` text NOT NULL,
  `voice_identity_receipt_id` text NOT NULL,
  `idempotency_key` text NOT NULL UNIQUE,
  `intent_hash` text NOT NULL CHECK (length(`intent_hash`) = 64),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('PLANNED','RUNNING','COMPLETE','FAILED')),
  `planned_fixtures` integer NOT NULL CHECK (`planned_fixtures` = 1),
  `tts_characters` integer NOT NULL CHECK (`tts_characters` BETWEEN 1 AND 700),
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` BETWEEN 0 AND 2),
  `tts_requests` integer NOT NULL DEFAULT 0 CHECK (`tts_requests` BETWEEN 0 AND 1),
  `reserved_spend_usd` real NOT NULL CHECK (`reserved_spend_usd` = 0.08),
  `spend_accounting_state` text NOT NULL CHECK (`spend_accounting_state` = 'RESERVED_CEILING_PROVIDER_METER_PENDING'),
  `actor` text NOT NULL,
  `error_code` text,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` text,
  FOREIGN KEY (`blueprint_id`) REFERENCES `v7_evaluation_controlled_fixture_blueprints`(`id`),
  FOREIGN KEY (`voice_identity_receipt_id`) REFERENCES `v7_evaluation_fixture_voice_identity_receipts`(`id`)
);
--> statement-breakpoint
CREATE INDEX `v7_evaluation_fixture_materialization_run_channel_idx` ON `v7_evaluation_fixture_materialization_runs` (`channel_id`,`created_at`);
--> statement-breakpoint
CREATE TABLE `v7_evaluation_fixture_provider_binding_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `run_id` text NOT NULL,
  `provider_family` text NOT NULL CHECK (`provider_family` = 'ELEVENLABS'),
  `operation` text NOT NULL CHECK (`operation` = 'CLEAN_AUDIO_CONTROL_TTS'),
  `provider_native_request_id` text NOT NULL,
  `exact_response_hash` text NOT NULL CHECK (length(`exact_response_hash`) = 64),
  `response_byte_size` integer NOT NULL CHECK (`response_byte_size` > 10000),
  `subscription_tier` text NOT NULL,
  `subscription_status` text NOT NULL,
  `subscription_response_hash` text NOT NULL CHECK (length(`subscription_response_hash`) = 64),
  `subscription_observed_at` text NOT NULL,
  `voice_id` text NOT NULL,
  `model_id` text NOT NULL,
  `settings_hash` text NOT NULL CHECK (length(`settings_hash`) = 64),
  `r2_storage_key` text NOT NULL,
  `r2_readback_hash` text NOT NULL CHECK (`r2_readback_hash` = `exact_response_hash`),
  `r2_readback_verified` integer NOT NULL CHECK (`r2_readback_verified` = 1),
  `rights_state` text NOT NULL CHECK (`rights_state` = 'PROVIDER_TERMS_RECEIPT_REQUIRED'),
  `qualification_authority` integer NOT NULL DEFAULT 0 CHECK (`qualification_authority` = 0),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`run_id`) REFERENCES `v7_evaluation_fixture_materialization_runs`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_fixture_provider_binding_run_uq` ON `v7_evaluation_fixture_provider_binding_receipts` (`run_id`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_fixture_provider_binding_no_update`
BEFORE UPDATE ON `v7_evaluation_fixture_provider_binding_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_FIXTURE_PROVIDER_BINDING_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_fixture_provider_binding_no_delete`
BEFORE DELETE ON `v7_evaluation_fixture_provider_binding_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_FIXTURE_PROVIDER_BINDING_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_materialized_fixture_artifacts` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `run_id` text NOT NULL,
  `blueprint_id` text NOT NULL,
  `provider_binding_receipt_id` text NOT NULL,
  `fixture_role` text NOT NULL CHECK (`fixture_role` = 'CLEAN_NEGATIVE'),
  `candidate_kind` text NOT NULL CHECK (`candidate_kind` = 'AUDIO'),
  `artifact_type` text NOT NULL CHECK (`artifact_type` = 'CLEAN_AUDIO_CONTROL'),
  `storage_key` text NOT NULL UNIQUE,
  `mime_type` text NOT NULL CHECK (`mime_type` = 'audio/mpeg'),
  `byte_size` integer NOT NULL CHECK (`byte_size` > 10000),
  `sha256` text NOT NULL CHECK (length(`sha256`) = 64),
  `materialization_state` text NOT NULL CHECK (`materialization_state` = 'BYTES_AND_PROVIDER_BINDING_VERIFIED_RIGHTS_REVIEW_REQUIRED'),
  `rights_state` text NOT NULL CHECK (`rights_state` = 'PROVIDER_TERMS_RECEIPT_REQUIRED'),
  `owner_ground_truth_state` text NOT NULL CHECK (`owner_ground_truth_state` = 'NOT_EVALUATED'),
  `dataset_eligible` integer NOT NULL DEFAULT 0 CHECK (`dataset_eligible` = 0),
  `qualification_eligible` integer NOT NULL DEFAULT 0 CHECK (`qualification_eligible` = 0),
  `release_eligible` integer NOT NULL DEFAULT 0 CHECK (`release_eligible` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`run_id`) REFERENCES `v7_evaluation_fixture_materialization_runs`(`id`),
  FOREIGN KEY (`blueprint_id`) REFERENCES `v7_evaluation_controlled_fixture_blueprints`(`id`),
  FOREIGN KEY (`provider_binding_receipt_id`) REFERENCES `v7_evaluation_fixture_provider_binding_receipts`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_materialized_fixture_blueprint_uq` ON `v7_evaluation_materialized_fixture_artifacts` (`blueprint_id`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_materialized_fixture_artifact_no_update`
BEFORE UPDATE ON `v7_evaluation_materialized_fixture_artifacts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_MATERIALIZED_FIXTURE_ARTIFACT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_materialized_fixture_artifact_no_delete`
BEFORE DELETE ON `v7_evaluation_materialized_fixture_artifacts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_MATERIALIZED_FIXTURE_ARTIFACT_IMMUTABLE'); END;
--> statement-breakpoint
INSERT INTO `v7_evaluation_fixture_materialization_policies`
  (`id`,`channel_id`,`policy_version`,`plan_id`,`lifecycle_state`,`maximum_materialized_fixtures`,`maximum_provider_requests`,`maximum_tts_requests`,`maximum_tts_characters`,`reserved_spend_ceiling_usd`,`clean_parent_first`,`commercial_rights_receipt_required`,`owner_ground_truth_required`)
VALUES
  ('fixture-materialization-policy:hidden-systems:v1','channel-hidden-systems','CONTROLLED_FIXTURE_MATERIALIZATION_V1','controlled-fixture-plan:hidden-systems:v1','CLEAN_PARENT_AUDIO_ENABLED',1,2,1,700,0.08,1,1,1);
--> statement-breakpoint
INSERT INTO `v7_evaluation_fixture_voice_identity_receipts`
  (`id`,`channel_id`,`policy_version`,`identity_scope`,`provider_family`,`voice_id`,`voice_name`,`model_id`,`output_format`,`settings_json`,`settings_hash`)
VALUES
  ('fixture-voice-identity:hidden-systems:v1','channel-hidden-systems','CONTROLLED_FIXTURE_MATERIALIZATION_V1','EVALUATION_FIXTURE_ONLY','ELEVENLABS','JBFqnCBsd6RMkjVDRZzb','Documentary narrator','eleven_multilingual_v2','mp3_44100_128','{"stability":0.62,"similarity_boost":0.78,"style":0.18,"speed":1,"use_speaker_boost":true}','e9155130223efee78f8e83109f9057003d2ceea67cda385e43fb2d25c510911d');
