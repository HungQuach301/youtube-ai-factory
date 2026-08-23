CREATE TABLE `v7_evaluation_commercial_clean_audio_policies` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'COMMERCIAL_CLEAN_AUDIO_REGENERATION_V1'),
  `entitlement_policy_version` text NOT NULL CHECK (`entitlement_policy_version` = 'ELEVENLABS_COMMERCIAL_ENTITLEMENT_V1'),
  `maximum_replacement_fixtures` integer NOT NULL CHECK (`maximum_replacement_fixtures` = 1),
  `maximum_subscription_reads` integer NOT NULL CHECK (`maximum_subscription_reads` = 1),
  `maximum_tts_requests` integer NOT NULL CHECK (`maximum_tts_requests` = 1),
  `maximum_tts_characters` integer NOT NULL CHECK (`maximum_tts_characters` = 700),
  `reserved_spend_ceiling_usd` real NOT NULL CHECK (`reserved_spend_ceiling_usd` = 0.08),
  `verified_terms_snapshot_required` integer NOT NULL CHECK (`verified_terms_snapshot_required` = 1),
  `rights_pass_authority` integer NOT NULL CHECK (`rights_pass_authority` = 1),
  `owner_ground_truth_required` integer NOT NULL CHECK (`owner_ground_truth_required` = 1),
  `dataset_sealing_authority` integer NOT NULL DEFAULT 0 CHECK (`dataset_sealing_authority` = 0),
  `assurance_qualification_authority` integer NOT NULL DEFAULT 0 CHECK (`assurance_qualification_authority` = 0),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_commercial_clean_audio_policy_channel_uq` ON `v7_evaluation_commercial_clean_audio_policies` (`channel_id`,`policy_version`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_commercial_clean_audio_policy_no_update`
BEFORE UPDATE ON `v7_evaluation_commercial_clean_audio_policies`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_COMMERCIAL_CLEAN_AUDIO_POLICY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_commercial_clean_audio_policy_no_delete`
BEFORE DELETE ON `v7_evaluation_commercial_clean_audio_policies`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_COMMERCIAL_CLEAN_AUDIO_POLICY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_commercial_clean_audio_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'COMMERCIAL_CLEAN_AUDIO_REGENERATION_V1'),
  `idempotency_key` text NOT NULL UNIQUE,
  `intent_hash` text NOT NULL CHECK (length(`intent_hash`) = 64),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('PLANNED','RUNNING','COMPLETE','FAILED')),
  `subscription_reads` integer NOT NULL DEFAULT 0 CHECK (`subscription_reads` BETWEEN 0 AND 1),
  `tts_requests` integer NOT NULL DEFAULT 0 CHECK (`tts_requests` BETWEEN 0 AND 1),
  `tts_characters` integer NOT NULL CHECK (`tts_characters` BETWEEN 1 AND 700),
  `reserved_spend_usd` real NOT NULL CHECK (`reserved_spend_usd` = 0.08),
  `actor` text NOT NULL,
  `error_code` text,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` text
);
--> statement-breakpoint
CREATE INDEX `v7_evaluation_commercial_clean_audio_run_channel_idx` ON `v7_evaluation_commercial_clean_audio_runs` (`channel_id`,`created_at`);
--> statement-breakpoint
CREATE TABLE `v7_evaluation_commercial_subscription_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'COMMERCIAL_CLEAN_AUDIO_REGENERATION_V1'),
  `entitlement_policy_version` text NOT NULL CHECK (`entitlement_policy_version` = 'ELEVENLABS_COMMERCIAL_ENTITLEMENT_V1'),
  `subscription_tier` text NOT NULL CHECK (`subscription_tier` IN ('starter','creator','pro','scale','business','enterprise')),
  `subscription_status` text NOT NULL CHECK (`subscription_status` = 'active'),
  `entitlement_state` text NOT NULL CHECK (`entitlement_state` = 'EXPLICIT_ACTIVE_PAID_BASE_PLAN'),
  `commercial_use_eligible` integer NOT NULL CHECK (`commercial_use_eligible` = 1),
  `exact_response_hash` text NOT NULL CHECK (length(`exact_response_hash`) = 64),
  `response_byte_size` integer NOT NULL CHECK (`response_byte_size` > 0),
  `r2_storage_key` text NOT NULL,
  `r2_readback_hash` text NOT NULL CHECK (`r2_readback_hash` = `exact_response_hash`),
  `r2_readback_verified` integer NOT NULL CHECK (`r2_readback_verified` = 1),
  `observed_at` text NOT NULL,
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`run_id`) REFERENCES `v7_evaluation_commercial_clean_audio_runs`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_commercial_subscription_run_uq` ON `v7_evaluation_commercial_subscription_receipts` (`run_id`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_commercial_subscription_no_update`
BEFORE UPDATE ON `v7_evaluation_commercial_subscription_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_COMMERCIAL_SUBSCRIPTION_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_commercial_subscription_no_delete`
BEFORE DELETE ON `v7_evaluation_commercial_subscription_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_COMMERCIAL_SUBSCRIPTION_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_commercial_clean_audio_provider_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL,
  `subscription_receipt_id` text NOT NULL,
  `channel_id` text NOT NULL,
  `provider_native_request_id` text NOT NULL,
  `exact_response_hash` text NOT NULL CHECK (length(`exact_response_hash`) = 64),
  `response_byte_size` integer NOT NULL CHECK (`response_byte_size` > 10000),
  `voice_id` text NOT NULL,
  `model_id` text NOT NULL CHECK (`model_id` = 'eleven_multilingual_v2'),
  `settings_hash` text NOT NULL CHECK (length(`settings_hash`) = 64),
  `narration_hash` text NOT NULL CHECK (length(`narration_hash`) = 64),
  `r2_storage_key` text NOT NULL,
  `r2_readback_hash` text NOT NULL CHECK (`r2_readback_hash` = `exact_response_hash`),
  `r2_readback_verified` integer NOT NULL CHECK (`r2_readback_verified` = 1),
  `rights_state` text NOT NULL CHECK (`rights_state` = 'PASS'),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`run_id`) REFERENCES `v7_evaluation_commercial_clean_audio_runs`(`id`),
  FOREIGN KEY (`subscription_receipt_id`) REFERENCES `v7_evaluation_commercial_subscription_receipts`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_commercial_clean_audio_provider_run_uq` ON `v7_evaluation_commercial_clean_audio_provider_receipts` (`run_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_commercial_clean_audio_provider_request_uq` ON `v7_evaluation_commercial_clean_audio_provider_receipts` (`provider_native_request_id`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_commercial_clean_audio_provider_no_update`
BEFORE UPDATE ON `v7_evaluation_commercial_clean_audio_provider_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_COMMERCIAL_CLEAN_AUDIO_PROVIDER_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_commercial_clean_audio_provider_no_delete`
BEFORE DELETE ON `v7_evaluation_commercial_clean_audio_provider_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_COMMERCIAL_CLEAN_AUDIO_PROVIDER_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_commercial_clean_audio_artifacts` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL,
  `provider_receipt_id` text NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'COMMERCIAL_CLEAN_AUDIO_REGENERATION_V1'),
  `replaces_artifact_id` text NOT NULL,
  `storage_key` text NOT NULL UNIQUE,
  `mime_type` text NOT NULL CHECK (`mime_type` = 'audio/mpeg'),
  `byte_size` integer NOT NULL CHECK (`byte_size` > 10000),
  `sha256` text NOT NULL CHECK (length(`sha256`) = 64),
  `materialization_state` text NOT NULL CHECK (`materialization_state` = 'BYTES_PROVIDER_ENTITLEMENT_AND_RIGHTS_VERIFIED'),
  `rights_state` text NOT NULL CHECK (`rights_state` = 'PASS'),
  `owner_ground_truth_state` text NOT NULL CHECK (`owner_ground_truth_state` = 'NOT_EVALUATED'),
  `factory_audio_qa_state` text NOT NULL CHECK (`factory_audio_qa_state` = 'PENDING'),
  `dataset_eligible` integer NOT NULL DEFAULT 0 CHECK (`dataset_eligible` = 0),
  `qualification_eligible` integer NOT NULL DEFAULT 0 CHECK (`qualification_eligible` = 0),
  `release_eligible` integer NOT NULL DEFAULT 0 CHECK (`release_eligible` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`run_id`) REFERENCES `v7_evaluation_commercial_clean_audio_runs`(`id`),
  FOREIGN KEY (`provider_receipt_id`) REFERENCES `v7_evaluation_commercial_clean_audio_provider_receipts`(`id`),
  FOREIGN KEY (`replaces_artifact_id`) REFERENCES `v7_evaluation_materialized_fixture_artifacts`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_commercial_clean_audio_artifact_channel_uq` ON `v7_evaluation_commercial_clean_audio_artifacts` (`channel_id`,`policy_version`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_commercial_clean_audio_artifact_no_update`
BEFORE UPDATE ON `v7_evaluation_commercial_clean_audio_artifacts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_COMMERCIAL_CLEAN_AUDIO_ARTIFACT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_commercial_clean_audio_artifact_no_delete`
BEFORE DELETE ON `v7_evaluation_commercial_clean_audio_artifacts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_COMMERCIAL_CLEAN_AUDIO_ARTIFACT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_commercial_clean_audio_rights_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `artifact_id` text NOT NULL,
  `provider_receipt_id` text NOT NULL,
  `subscription_receipt_id` text NOT NULL,
  `official_terms_snapshot_receipt_id` text NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'COMMERCIAL_CLEAN_AUDIO_REGENERATION_V1'),
  `jurisdiction_scope` text NOT NULL CHECK (`jurisdiction_scope` = 'NON_EEA_VIETNAM'),
  `input_ownership_state` text NOT NULL CHECK (`input_ownership_state` = 'CHANNEL_AUTHORED_TEXT_HASH_BOUND'),
  `model_state` text NOT NULL CHECK (`model_state` = 'NON_BETA_PINNED_MODEL'),
  `entitlement_state` text NOT NULL CHECK (`entitlement_state` = 'EXPLICIT_ACTIVE_PAID_BASE_PLAN'),
  `rights_state` text NOT NULL CHECK (`rights_state` = 'PASS'),
  `adjudication_outcome` text NOT NULL CHECK (`adjudication_outcome` = 'COMMERCIAL_RIGHTS_PASS_GENERATION_TIME_PAID_PLAN'),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`artifact_id`) REFERENCES `v7_evaluation_commercial_clean_audio_artifacts`(`id`),
  FOREIGN KEY (`provider_receipt_id`) REFERENCES `v7_evaluation_commercial_clean_audio_provider_receipts`(`id`),
  FOREIGN KEY (`subscription_receipt_id`) REFERENCES `v7_evaluation_commercial_subscription_receipts`(`id`),
  FOREIGN KEY (`official_terms_snapshot_receipt_id`) REFERENCES `v7_evaluation_official_terms_snapshot_receipts`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_commercial_clean_audio_rights_artifact_uq` ON `v7_evaluation_commercial_clean_audio_rights_receipts` (`artifact_id`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_commercial_clean_audio_rights_no_update`
BEFORE UPDATE ON `v7_evaluation_commercial_clean_audio_rights_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_COMMERCIAL_CLEAN_AUDIO_RIGHTS_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_commercial_clean_audio_rights_no_delete`
BEFORE DELETE ON `v7_evaluation_commercial_clean_audio_rights_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_COMMERCIAL_CLEAN_AUDIO_RIGHTS_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_factory_audio_qa_policies` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_AUDIO_QA_POLICY_V1'),
  `model_id` text NOT NULL CHECK (`model_id` = 'gpt-audio-1.5'),
  `maximum_provider_requests` integer NOT NULL CHECK (`maximum_provider_requests` = 1),
  `reserved_spend_ceiling_usd` real NOT NULL CHECK (`reserved_spend_ceiling_usd` = 0.20),
  `overall_floor` integer NOT NULL CHECK (`overall_floor` = 92),
  `dimension_floor` integer NOT NULL CHECK (`dimension_floor` = 90),
  `maximum_p0` integer NOT NULL CHECK (`maximum_p0` = 0),
  `maximum_p1` integer NOT NULL CHECK (`maximum_p1` = 0),
  `authority_boundary` text NOT NULL CHECK (`authority_boundary` = 'INDEPENDENT_REVIEW_ONLY'),
  `owner_ground_truth_required` integer NOT NULL CHECK (`owner_ground_truth_required` = 1),
  `dataset_sealing_authority` integer NOT NULL DEFAULT 0 CHECK (`dataset_sealing_authority` = 0),
  `assurance_qualification_authority` integer NOT NULL DEFAULT 0 CHECK (`assurance_qualification_authority` = 0),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_factory_audio_qa_policy_channel_uq` ON `v7_evaluation_factory_audio_qa_policies` (`channel_id`,`policy_version`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_factory_audio_qa_policy_no_update`
BEFORE UPDATE ON `v7_evaluation_factory_audio_qa_policies`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_FACTORY_AUDIO_QA_POLICY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_factory_audio_qa_policy_no_delete`
BEFORE DELETE ON `v7_evaluation_factory_audio_qa_policies`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_FACTORY_AUDIO_QA_POLICY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_factory_audio_qa_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_AUDIO_QA_POLICY_V1'),
  `artifact_id` text NOT NULL,
  `idempotency_key` text NOT NULL UNIQUE,
  `request_hash` text NOT NULL CHECK (length(`request_hash`) = 64),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('PLANNED','RUNNING','COMPLETE','FAILED')),
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` BETWEEN 0 AND 1),
  `reserved_spend_usd` real NOT NULL CHECK (`reserved_spend_usd` = 0.20),
  `actual_spend_usd` real NOT NULL DEFAULT 0 CHECK (`actual_spend_usd` BETWEEN 0 AND 0.20),
  `actor` text NOT NULL,
  `error_code` text,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` text,
  FOREIGN KEY (`artifact_id`) REFERENCES `v7_evaluation_commercial_clean_audio_artifacts`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_factory_audio_qa_run_artifact_uq` ON `v7_evaluation_factory_audio_qa_runs` (`artifact_id`);
--> statement-breakpoint
CREATE TABLE `v7_evaluation_factory_audio_qa_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL,
  `artifact_id` text NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_AUDIO_QA_POLICY_V1'),
  `exact_artifact_hash` text NOT NULL CHECK (length(`exact_artifact_hash`) = 64),
  `model_id` text NOT NULL CHECK (`model_id` = 'gpt-audio-1.5'),
  `provider_response_id` text NOT NULL,
  `decision_state` text NOT NULL CHECK (`decision_state` IN ('LIKELY_CLEAN','LIKELY_DEFECT_PRESENT','NEEDS_OWNER')),
  `owner_attention_state` text NOT NULL CHECK (`owner_attention_state` IN ('NO_IMMEDIATE_OWNER_ACTION','OWNER_EXCEPTION')),
  `overall_score` integer NOT NULL CHECK (`overall_score` BETWEEN 0 AND 100),
  `dimensions_json` text NOT NULL,
  `p0_count` integer NOT NULL CHECK (`p0_count` >= 0),
  `p1_count` integer NOT NULL CHECK (`p1_count` >= 0),
  `findings_json` text NOT NULL,
  `rationale` text NOT NULL,
  `usage_json` text NOT NULL,
  `actual_spend_usd` real NOT NULL CHECK (`actual_spend_usd` BETWEEN 0 AND 0.20),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`run_id`) REFERENCES `v7_evaluation_factory_audio_qa_runs`(`id`),
  FOREIGN KEY (`artifact_id`) REFERENCES `v7_evaluation_commercial_clean_audio_artifacts`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_factory_audio_qa_receipt_artifact_uq` ON `v7_evaluation_factory_audio_qa_receipts` (`artifact_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_factory_audio_qa_receipt_response_uq` ON `v7_evaluation_factory_audio_qa_receipts` (`provider_response_id`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_factory_audio_qa_receipt_no_update`
BEFORE UPDATE ON `v7_evaluation_factory_audio_qa_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_FACTORY_AUDIO_QA_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_factory_audio_qa_receipt_no_delete`
BEFORE DELETE ON `v7_evaluation_factory_audio_qa_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_FACTORY_AUDIO_QA_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
INSERT INTO `v7_evaluation_commercial_clean_audio_policies`
  (`id`,`channel_id`,`policy_version`,`entitlement_policy_version`,`maximum_replacement_fixtures`,`maximum_subscription_reads`,`maximum_tts_requests`,`maximum_tts_characters`,`reserved_spend_ceiling_usd`,`verified_terms_snapshot_required`,`rights_pass_authority`,`owner_ground_truth_required`)
VALUES
  ('commercial-clean-audio-policy:hidden-systems:v1','channel-hidden-systems','COMMERCIAL_CLEAN_AUDIO_REGENERATION_V1','ELEVENLABS_COMMERCIAL_ENTITLEMENT_V1',1,1,1,700,0.08,1,1,1);
--> statement-breakpoint
INSERT INTO `v7_evaluation_factory_audio_qa_policies`
  (`id`,`channel_id`,`policy_version`,`model_id`,`maximum_provider_requests`,`reserved_spend_ceiling_usd`,`overall_floor`,`dimension_floor`,`maximum_p0`,`maximum_p1`,`authority_boundary`,`owner_ground_truth_required`)
VALUES
  ('factory-audio-qa-policy:hidden-systems:v1','channel-hidden-systems','FACTORY_AUDIO_QA_POLICY_V1','gpt-audio-1.5',1,0.20,92,90,0,0,'INDEPENDENT_REVIEW_ONLY',1);
