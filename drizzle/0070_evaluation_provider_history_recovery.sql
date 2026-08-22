CREATE TABLE `v7_evaluation_provider_history_recovery_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'EVALUATION_PROVIDER_HISTORY_RECOVERY_V1'),
  `idempotency_key` text NOT NULL UNIQUE,
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('RUNNING','COMPLETE','FAILED')),
  `date_after_unix` integer NOT NULL,
  `date_before_unix` integer NOT NULL,
  `maximum_history_items` integer NOT NULL CHECK (`maximum_history_items` = 1000),
  `history_items_received` integer NOT NULL DEFAULT 0 CHECK (`history_items_received` BETWEEN 0 AND 1000),
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` BETWEEN 0 AND 2),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `error_code` text,
  `actor` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` text,
  CHECK (`date_before_unix` > `date_after_unix`)
);
--> statement-breakpoint
CREATE TABLE `v7_evaluation_provider_history_items` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `recovery_run_id` text NOT NULL,
  `provider_family` text NOT NULL CHECK (`provider_family` = 'ELEVENLABS'),
  `history_item_id` text NOT NULL,
  `provider_request_id` text,
  `generation_unix` integer NOT NULL,
  `voice_id` text,
  `model_id` text,
  `source_type` text NOT NULL,
  `content_type` text NOT NULL,
  `output_format` text,
  `text_hash` text CHECK (`text_hash` IS NULL OR length(`text_hash`) = 64),
  `settings_hash` text CHECK (`settings_hash` IS NULL OR length(`settings_hash`) = 64),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `rights_pass_authority` integer NOT NULL DEFAULT 0 CHECK (`rights_pass_authority` = 0),
  `dataset_sealing_authority` integer NOT NULL DEFAULT 0 CHECK (`dataset_sealing_authority` = 0),
  `assurance_qualification_authority` integer NOT NULL DEFAULT 0 CHECK (`assurance_qualification_authority` = 0),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`recovery_run_id`) REFERENCES `v7_evaluation_provider_history_recovery_runs`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_provider_history_item_uq` ON `v7_evaluation_provider_history_items` (`channel_id`,`history_item_id`,`recovery_run_id`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_provider_history_item_no_update`
BEFORE UPDATE ON `v7_evaluation_provider_history_items`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_PROVIDER_HISTORY_ITEM_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_provider_history_item_no_delete`
BEFORE DELETE ON `v7_evaluation_provider_history_items`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_PROVIDER_HISTORY_ITEM_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_provider_history_candidate_diagnostics` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `recovery_run_id` text NOT NULL,
  `candidate_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'EVALUATION_PROVIDER_HISTORY_RECOVERY_V1'),
  `metadata_match_count` integer NOT NULL CHECK (`metadata_match_count` >= 0),
  `native_request_id_match_count` integer NOT NULL CHECK (`native_request_id_match_count` >= 0),
  `diagnostic_state` text NOT NULL CHECK (`diagnostic_state` IN ('NO_METADATA_MATCH','UNIQUE_METADATA_MATCH_REQUIRES_AUDIO_HASH','AMBIGUOUS_METADATA_MATCH')),
  `exact_audio_hash_verified` integer NOT NULL DEFAULT 0 CHECK (`exact_audio_hash_verified` = 0),
  `historical_plan_coverage_verified` integer NOT NULL DEFAULT 0 CHECK (`historical_plan_coverage_verified` = 0),
  `rights_pass_authority` integer NOT NULL DEFAULT 0 CHECK (`rights_pass_authority` = 0),
  `dataset_sealing_authority` integer NOT NULL DEFAULT 0 CHECK (`dataset_sealing_authority` = 0),
  `assurance_qualification_authority` integer NOT NULL DEFAULT 0 CHECK (`assurance_qualification_authority` = 0),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`recovery_run_id`) REFERENCES `v7_evaluation_provider_history_recovery_runs`(`id`),
  FOREIGN KEY (`candidate_id`) REFERENCES `v7_evaluation_candidates`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_provider_history_candidate_diagnostic_uq` ON `v7_evaluation_provider_history_candidate_diagnostics` (`candidate_id`,`recovery_run_id`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_provider_history_candidate_diagnostic_no_update`
BEFORE UPDATE ON `v7_evaluation_provider_history_candidate_diagnostics`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_PROVIDER_HISTORY_CANDIDATE_DIAGNOSTIC_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_provider_history_candidate_diagnostic_no_delete`
BEFORE DELETE ON `v7_evaluation_provider_history_candidate_diagnostics`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_PROVIDER_HISTORY_CANDIDATE_DIAGNOSTIC_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_provider_history_snapshots` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `recovery_run_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'EVALUATION_PROVIDER_HISTORY_RECOVERY_V1'),
  `history_items_received` integer NOT NULL CHECK (`history_items_received` BETWEEN 0 AND 1000),
  `history_items_with_native_request_id` integer NOT NULL CHECK (`history_items_with_native_request_id` >= 0),
  `candidates_diagnosed` integer NOT NULL CHECK (`candidates_diagnosed` >= 0),
  `unique_metadata_matches` integer NOT NULL CHECK (`unique_metadata_matches` >= 0),
  `no_metadata_matches` integer NOT NULL CHECK (`no_metadata_matches` >= 0),
  `ambiguous_metadata_matches` integer NOT NULL CHECK (`ambiguous_metadata_matches` >= 0),
  `subscription_tier` text NOT NULL,
  `subscription_status` text NOT NULL,
  `billing_period` text,
  `subscription_observed_at` text NOT NULL,
  `current_subscription_only` integer NOT NULL DEFAULT 1 CHECK (`current_subscription_only` = 1),
  `historical_plan_coverage_verified` integer NOT NULL DEFAULT 0 CHECK (`historical_plan_coverage_verified` = 0),
  `history_response_hash` text NOT NULL CHECK (length(`history_response_hash`) = 64),
  `subscription_response_hash` text NOT NULL CHECK (length(`subscription_response_hash`) = 64),
  `rights_pass_authority` integer NOT NULL DEFAULT 0 CHECK (`rights_pass_authority` = 0),
  `dataset_sealing_authority` integer NOT NULL DEFAULT 0 CHECK (`dataset_sealing_authority` = 0),
  `assurance_qualification_authority` integer NOT NULL DEFAULT 0 CHECK (`assurance_qualification_authority` = 0),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `provider_requests` integer NOT NULL CHECK (`provider_requests` = 2),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`recovery_run_id`) REFERENCES `v7_evaluation_provider_history_recovery_runs`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_provider_history_snapshot_uq` ON `v7_evaluation_provider_history_snapshots` (`channel_id`,`policy_version`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_provider_history_snapshot_no_update`
BEFORE UPDATE ON `v7_evaluation_provider_history_snapshots`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_PROVIDER_HISTORY_SNAPSHOT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_provider_history_snapshot_no_delete`
BEFORE DELETE ON `v7_evaluation_provider_history_snapshots`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_PROVIDER_HISTORY_SNAPSHOT_IMMUTABLE'); END;
