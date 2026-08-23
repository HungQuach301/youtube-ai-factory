CREATE TABLE `v7_evaluation_factory_audio_qa_recovery_policies` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_AUDIO_QA_RECOVERY_V1'),
  `source_policy_version` text NOT NULL CHECK (`source_policy_version` = 'FACTORY_AUDIO_QA_POLICY_V1'),
  `eligible_failure_code` text NOT NULL CHECK (`eligible_failure_code` = 'FACTORY_AUDIO_QA_RESPONSE_INVALID'),
  `output_contract_version` text NOT NULL CHECK (`output_contract_version` = 'FORCED_FUNCTION_CALL_V1'),
  `maximum_authorized_recovery_attempts` integer NOT NULL CHECK (`maximum_authorized_recovery_attempts` = 1),
  `maximum_additional_provider_requests` integer NOT NULL CHECK (`maximum_additional_provider_requests` = 1),
  `additional_reserved_spend_usd` real NOT NULL CHECK (`additional_reserved_spend_usd` = 0.20),
  `cumulative_reserved_spend_ceiling_usd` real NOT NULL CHECK (`cumulative_reserved_spend_ceiling_usd` = 0.40),
  `authority_boundary` text NOT NULL CHECK (`authority_boundary` = 'INDEPENDENT_REVIEW_ONLY'),
  `owner_ground_truth_required` integer NOT NULL CHECK (`owner_ground_truth_required` = 1),
  `dataset_sealing_authority` integer NOT NULL DEFAULT 0 CHECK (`dataset_sealing_authority` = 0),
  `assurance_qualification_authority` integer NOT NULL DEFAULT 0 CHECK (`assurance_qualification_authority` = 0),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_factory_audio_qa_recovery_policy_channel_uq`
  ON `v7_evaluation_factory_audio_qa_recovery_policies` (`channel_id`,`policy_version`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_factory_audio_qa_recovery_policy_no_update`
BEFORE UPDATE ON `v7_evaluation_factory_audio_qa_recovery_policies`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_FACTORY_AUDIO_QA_RECOVERY_POLICY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_factory_audio_qa_recovery_policy_no_delete`
BEFORE DELETE ON `v7_evaluation_factory_audio_qa_recovery_policies`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_FACTORY_AUDIO_QA_RECOVERY_POLICY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_factory_audio_qa_recovery_authorizations` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_AUDIO_QA_RECOVERY_V1'),
  `failed_run_id` text NOT NULL UNIQUE,
  `artifact_id` text NOT NULL UNIQUE,
  `failed_provider_requests` integer NOT NULL CHECK (`failed_provider_requests` = 1),
  `failed_error_code` text NOT NULL CHECK (`failed_error_code` = 'FACTORY_AUDIO_QA_RESPONSE_INVALID'),
  `failed_actual_spend_state` text NOT NULL CHECK (`failed_actual_spend_state` = 'UNVERIFIED_RESERVED_AT_0_20'),
  `authorization_state` text NOT NULL CHECK (`authorization_state` = 'AUTHORIZED_ONE_RECOVERY'),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`failed_run_id`) REFERENCES `v7_evaluation_factory_audio_qa_runs`(`id`),
  FOREIGN KEY (`artifact_id`) REFERENCES `v7_evaluation_commercial_clean_audio_artifacts`(`id`)
);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_factory_audio_qa_recovery_authorization_no_update`
BEFORE UPDATE ON `v7_evaluation_factory_audio_qa_recovery_authorizations`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_FACTORY_AUDIO_QA_RECOVERY_AUTHORIZATION_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_factory_audio_qa_recovery_authorization_no_delete`
BEFORE DELETE ON `v7_evaluation_factory_audio_qa_recovery_authorizations`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_FACTORY_AUDIO_QA_RECOVERY_AUTHORIZATION_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_factory_audio_qa_recovery_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `authorization_id` text NOT NULL UNIQUE,
  `failed_run_id` text NOT NULL UNIQUE,
  `artifact_id` text NOT NULL UNIQUE,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_AUDIO_QA_RECOVERY_V1'),
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
  FOREIGN KEY (`authorization_id`) REFERENCES `v7_evaluation_factory_audio_qa_recovery_authorizations`(`id`),
  FOREIGN KEY (`failed_run_id`) REFERENCES `v7_evaluation_factory_audio_qa_runs`(`id`),
  FOREIGN KEY (`artifact_id`) REFERENCES `v7_evaluation_commercial_clean_audio_artifacts`(`id`)
);
--> statement-breakpoint
CREATE TABLE `v7_evaluation_factory_audio_qa_provider_response_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `source_run_id` text NOT NULL UNIQUE,
  `source_run_kind` text NOT NULL CHECK (`source_run_kind` IN ('ORIGINAL','RECOVERY')),
  `channel_id` text NOT NULL,
  `capture_policy_version` text NOT NULL CHECK (`capture_policy_version` = 'FACTORY_AUDIO_QA_PROVIDER_RESPONSE_CAPTURE_V1'),
  `output_contract_version` text NOT NULL CHECK (`output_contract_version` = 'FORCED_FUNCTION_CALL_V1'),
  `provider_response_id` text NOT NULL UNIQUE,
  `exact_response_hash` text NOT NULL CHECK (length(`exact_response_hash`) = 64),
  `response_byte_size` integer NOT NULL CHECK (`response_byte_size` > 0),
  `r2_storage_key` text NOT NULL UNIQUE,
  `r2_readback_hash` text NOT NULL CHECK (`r2_readback_hash` = `exact_response_hash`),
  `r2_readback_verified` integer NOT NULL CHECK (`r2_readback_verified` = 1),
  `usage_json` text NOT NULL,
  `actual_spend_usd` real NOT NULL CHECK (`actual_spend_usd` BETWEEN 0 AND 0.20),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_factory_audio_qa_provider_response_no_update`
BEFORE UPDATE ON `v7_evaluation_factory_audio_qa_provider_response_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_FACTORY_AUDIO_QA_PROVIDER_RESPONSE_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_factory_audio_qa_provider_response_no_delete`
BEFORE DELETE ON `v7_evaluation_factory_audio_qa_provider_response_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_FACTORY_AUDIO_QA_PROVIDER_RESPONSE_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_factory_audio_qa_recovery_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `recovery_run_id` text NOT NULL UNIQUE,
  `provider_response_receipt_id` text NOT NULL UNIQUE,
  `failed_run_id` text NOT NULL UNIQUE,
  `artifact_id` text NOT NULL UNIQUE,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_AUDIO_QA_RECOVERY_V1'),
  `exact_artifact_hash` text NOT NULL CHECK (length(`exact_artifact_hash`) = 64),
  `model_id` text NOT NULL CHECK (`model_id` = 'gpt-audio-1.5'),
  `provider_response_id` text NOT NULL UNIQUE,
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
  `authority_boundary` text NOT NULL CHECK (`authority_boundary` = 'INDEPENDENT_REVIEW_ONLY'),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`recovery_run_id`) REFERENCES `v7_evaluation_factory_audio_qa_recovery_runs`(`id`),
  FOREIGN KEY (`provider_response_receipt_id`) REFERENCES `v7_evaluation_factory_audio_qa_provider_response_receipts`(`id`),
  FOREIGN KEY (`failed_run_id`) REFERENCES `v7_evaluation_factory_audio_qa_runs`(`id`),
  FOREIGN KEY (`artifact_id`) REFERENCES `v7_evaluation_commercial_clean_audio_artifacts`(`id`)
);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_factory_audio_qa_recovery_receipt_no_update`
BEFORE UPDATE ON `v7_evaluation_factory_audio_qa_recovery_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_FACTORY_AUDIO_QA_RECOVERY_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_factory_audio_qa_recovery_receipt_no_delete`
BEFORE DELETE ON `v7_evaluation_factory_audio_qa_recovery_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_FACTORY_AUDIO_QA_RECOVERY_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
INSERT INTO `v7_evaluation_factory_audio_qa_recovery_policies`
  (`id`,`channel_id`,`policy_version`,`source_policy_version`,`eligible_failure_code`,`output_contract_version`,`maximum_authorized_recovery_attempts`,`maximum_additional_provider_requests`,`additional_reserved_spend_usd`,`cumulative_reserved_spend_ceiling_usd`,`authority_boundary`,`owner_ground_truth_required`)
VALUES
  ('factory-audio-qa-recovery-policy:hidden-systems:v1','channel-hidden-systems','FACTORY_AUDIO_QA_RECOVERY_V1','FACTORY_AUDIO_QA_POLICY_V1','FACTORY_AUDIO_QA_RESPONSE_INVALID','FORCED_FUNCTION_CALL_V1',1,1,0.20,0.40,'INDEPENDENT_REVIEW_ONLY',1);
--> statement-breakpoint
INSERT INTO `v7_evaluation_factory_audio_qa_recovery_authorizations`
  (`id`,`channel_id`,`policy_version`,`failed_run_id`,`artifact_id`,`failed_provider_requests`,`failed_error_code`,`failed_actual_spend_state`,`authorization_state`)
SELECT
  'factory-audio-qa-recovery-authorization:' || r.`id`,
  r.`channel_id`,
  'FACTORY_AUDIO_QA_RECOVERY_V1',
  r.`id`,
  r.`artifact_id`,
  r.`provider_requests`,
  r.`error_code`,
  'UNVERIFIED_RESERVED_AT_0_20',
  'AUTHORIZED_ONE_RECOVERY'
FROM `v7_evaluation_factory_audio_qa_runs` r
WHERE r.`channel_id`='channel-hidden-systems'
  AND r.`policy_version`='FACTORY_AUDIO_QA_POLICY_V1'
  AND r.`lifecycle_state`='FAILED'
  AND r.`provider_requests`=1
  AND r.`error_code`='FACTORY_AUDIO_QA_RESPONSE_INVALID'
  AND NOT EXISTS (SELECT 1 FROM `v7_evaluation_factory_audio_qa_receipts` q WHERE q.`artifact_id`=r.`artifact_id`)
ORDER BY r.`created_at`,r.`id`
LIMIT 1;
