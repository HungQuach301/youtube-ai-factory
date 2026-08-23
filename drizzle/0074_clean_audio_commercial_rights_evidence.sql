CREATE TABLE `v7_evaluation_current_rights_evidence_capture_policies` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'EVALUATION_CURRENT_RIGHTS_EVIDENCE_CAPTURE_V1'),
  `jurisdiction_scope` text NOT NULL CHECK (`jurisdiction_scope` = 'NON_EEA_VIETNAM'),
  `expected_official_sources` integer NOT NULL CHECK (`expected_official_sources` = 4),
  `maximum_public_reads` integer NOT NULL CHECK (`maximum_public_reads` = 4),
  `maximum_source_bytes` integer NOT NULL CHECK (`maximum_source_bytes` = 2000000),
  `generation_time_subscription_binding_required` integer NOT NULL CHECK (`generation_time_subscription_binding_required` = 1),
  `base_plan_evidence_required` integer NOT NULL CHECK (`base_plan_evidence_required` = 1),
  `input_ownership_evidence_required` integer NOT NULL CHECK (`input_ownership_evidence_required` = 1),
  `beta_model_forbidden` integer NOT NULL CHECK (`beta_model_forbidden` = 1),
  `rights_pass_authority` integer NOT NULL DEFAULT 0 CHECK (`rights_pass_authority` = 0),
  `dataset_sealing_authority` integer NOT NULL DEFAULT 0 CHECK (`dataset_sealing_authority` = 0),
  `assurance_qualification_authority` integer NOT NULL DEFAULT 0 CHECK (`assurance_qualification_authority` = 0),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_current_rights_evidence_policy_channel_uq` ON `v7_evaluation_current_rights_evidence_capture_policies` (`channel_id`,`policy_version`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_current_rights_evidence_policy_no_update`
BEFORE UPDATE ON `v7_evaluation_current_rights_evidence_capture_policies`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CURRENT_RIGHTS_EVIDENCE_POLICY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_current_rights_evidence_policy_no_delete`
BEFORE DELETE ON `v7_evaluation_current_rights_evidence_capture_policies`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CURRENT_RIGHTS_EVIDENCE_POLICY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_current_rights_evidence_capture_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'EVALUATION_CURRENT_RIGHTS_EVIDENCE_CAPTURE_V1'),
  `fixture_artifact_id` text NOT NULL,
  `provider_binding_receipt_id` text NOT NULL,
  `idempotency_key` text NOT NULL UNIQUE,
  `intent_hash` text NOT NULL CHECK (length(`intent_hash`) = 64),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('PLANNED','RUNNING','COMPLETE','FAILED')),
  `planned_sources` integer NOT NULL CHECK (`planned_sources` = 4),
  `processed_sources` integer NOT NULL DEFAULT 0 CHECK (`processed_sources` BETWEEN 0 AND 4),
  `verified_sources` integer NOT NULL DEFAULT 0 CHECK (`verified_sources` BETWEEN 0 AND 4),
  `public_reads` integer NOT NULL DEFAULT 0 CHECK (`public_reads` BETWEEN 0 AND 4),
  `account_reads` integer NOT NULL DEFAULT 0 CHECK (`account_reads` = 0),
  `provider_generation_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_generation_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `actor` text NOT NULL,
  `error_code` text,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` text,
  FOREIGN KEY (`fixture_artifact_id`) REFERENCES `v7_evaluation_materialized_fixture_artifacts`(`id`),
  FOREIGN KEY (`provider_binding_receipt_id`) REFERENCES `v7_evaluation_fixture_provider_binding_receipts`(`id`)
);
--> statement-breakpoint
CREATE INDEX `v7_evaluation_current_rights_evidence_run_channel_idx` ON `v7_evaluation_current_rights_evidence_capture_runs` (`channel_id`,`created_at`);
--> statement-breakpoint
CREATE TABLE `v7_evaluation_official_terms_snapshot_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'EVALUATION_CURRENT_RIGHTS_EVIDENCE_CAPTURE_V1'),
  `source_key` text NOT NULL CHECK (`source_key` IN ('TERMS_OF_USE','PUBLISHING_COMMERCIAL_LICENSE_HELP','PAYG_ADMINISTRATION_DOCS','TTS_CAPABILITY_DOCS')),
  `source_category` text NOT NULL CHECK (`source_category` IN ('TERMS','COMMERCIAL_LICENSE_HELP','ACCOUNT_BILLING_DOCS','PRODUCT_DOCUMENTATION')),
  `source_url` text NOT NULL CHECK (`source_url` LIKE 'https://elevenlabs.io/%' OR `source_url` LIKE 'https://help.elevenlabs.io/%'),
  `retrieval_state` text NOT NULL CHECK (`retrieval_state` IN ('PASS','HTTP_ERROR','NETWORK_ERROR','SOURCE_TOO_LARGE','R2_READBACK_FAILED')),
  `http_status` integer,
  `content_type` text,
  `response_byte_size` integer,
  `exact_response_hash` text CHECK (`exact_response_hash` IS NULL OR length(`exact_response_hash`) = 64),
  `r2_storage_key` text,
  `r2_readback_hash` text CHECK (`r2_readback_hash` IS NULL OR length(`r2_readback_hash`) = 64),
  `r2_readback_verified` integer NOT NULL DEFAULT 0 CHECK (`r2_readback_verified` IN (0,1)),
  `retrieved_at` text NOT NULL,
  `error_code` text,
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`run_id`) REFERENCES `v7_evaluation_current_rights_evidence_capture_runs`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_official_terms_snapshot_run_source_uq` ON `v7_evaluation_official_terms_snapshot_receipts` (`run_id`,`source_key`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_official_terms_snapshot_no_update`
BEFORE UPDATE ON `v7_evaluation_official_terms_snapshot_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_OFFICIAL_TERMS_SNAPSHOT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_official_terms_snapshot_no_delete`
BEFORE DELETE ON `v7_evaluation_official_terms_snapshot_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_OFFICIAL_TERMS_SNAPSHOT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_clean_audio_rights_diagnostics` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'EVALUATION_CURRENT_RIGHTS_EVIDENCE_CAPTURE_V1'),
  `fixture_artifact_id` text NOT NULL,
  `fixture_sha256` text NOT NULL CHECK (length(`fixture_sha256`) = 64),
  `provider_binding_receipt_id` text NOT NULL,
  `provider_native_request_id_verified` integer NOT NULL CHECK (`provider_native_request_id_verified` = 1),
  `generation_subscription_tier` text NOT NULL,
  `generation_subscription_status` text NOT NULL,
  `generation_subscription_response_hash` text NOT NULL CHECK (length(`generation_subscription_response_hash`) = 64),
  `generation_subscription_observed_at` text NOT NULL,
  `jurisdiction_scope` text NOT NULL CHECK (`jurisdiction_scope` = 'NON_EEA_VIETNAM'),
  `model_id` text NOT NULL,
  `beta_model_state` text NOT NULL CHECK (`beta_model_state` = 'NON_BETA_PINNED_MODEL'),
  `input_ownership_state` text NOT NULL CHECK (`input_ownership_state` = 'CHANNEL_AUTHORED_TEXT_HASH_BOUND'),
  `narration_hash` text NOT NULL CHECK (length(`narration_hash`) = 64),
  `official_sources_expected` integer NOT NULL CHECK (`official_sources_expected` = 4),
  `official_sources_verified` integer NOT NULL CHECK (`official_sources_verified` BETWEEN 0 AND 4),
  `official_source_coverage_state` text NOT NULL CHECK (`official_source_coverage_state` IN ('COMPLETE','PARTIAL')),
  `base_plan_evidence_state` text NOT NULL CHECK (`base_plan_evidence_state` = 'BASE_PLAN_COMMERCIAL_RIGHTS_NOT_PROVEN'),
  `adjudication_outcome` text NOT NULL CHECK (`adjudication_outcome` IN ('REVIEW_REQUIRED_PAYG_BASE_PLAN_AMBIGUOUS','REVIEW_REQUIRED_OFFICIAL_SOURCE_CAPTURE_INCOMPLETE')),
  `rights_state` text NOT NULL CHECK (`rights_state` = 'PROVIDER_TERMS_RECEIPT_REQUIRED'),
  `next_evidence_required` text NOT NULL CHECK (`next_evidence_required` = 'GENERATION_TIME_BASE_PLAN_OR_CONTRACT_EVIDENCE'),
  `rights_pass_authority` integer NOT NULL DEFAULT 0 CHECK (`rights_pass_authority` = 0),
  `dataset_sealing_authority` integer NOT NULL DEFAULT 0 CHECK (`dataset_sealing_authority` = 0),
  `assurance_qualification_authority` integer NOT NULL DEFAULT 0 CHECK (`assurance_qualification_authority` = 0),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `provider_generation_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_generation_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`run_id`) REFERENCES `v7_evaluation_current_rights_evidence_capture_runs`(`id`),
  FOREIGN KEY (`fixture_artifact_id`) REFERENCES `v7_evaluation_materialized_fixture_artifacts`(`id`),
  FOREIGN KEY (`provider_binding_receipt_id`) REFERENCES `v7_evaluation_fixture_provider_binding_receipts`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_clean_audio_rights_diagnostic_artifact_policy_uq` ON `v7_evaluation_clean_audio_rights_diagnostics` (`fixture_artifact_id`,`policy_version`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_audio_rights_diagnostic_no_update`
BEFORE UPDATE ON `v7_evaluation_clean_audio_rights_diagnostics`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AUDIO_RIGHTS_DIAGNOSTIC_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_audio_rights_diagnostic_no_delete`
BEFORE DELETE ON `v7_evaluation_clean_audio_rights_diagnostics`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AUDIO_RIGHTS_DIAGNOSTIC_IMMUTABLE'); END;
--> statement-breakpoint
INSERT INTO `v7_evaluation_current_rights_evidence_capture_policies`
  (`id`,`channel_id`,`policy_version`,`jurisdiction_scope`,`expected_official_sources`,`maximum_public_reads`,`maximum_source_bytes`,`generation_time_subscription_binding_required`,`base_plan_evidence_required`,`input_ownership_evidence_required`,`beta_model_forbidden`)
VALUES
  ('current-rights-evidence-policy:hidden-systems:v1','channel-hidden-systems','EVALUATION_CURRENT_RIGHTS_EVIDENCE_CAPTURE_V1','NON_EEA_VIETNAM',4,4,2000000,1,1,1,1);
