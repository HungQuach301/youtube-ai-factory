CREATE TABLE `v7_evaluation_provider_audio_hash_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'EVALUATION_PROVIDER_AUDIO_HASH_RECOVERY_V1'),
  `idempotency_key` text NOT NULL UNIQUE,
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('RUNNING','COMPLETE','FAILED')),
  `planned_history_items` integer NOT NULL CHECK (`planned_history_items` BETWEEN 1 AND 16),
  `processed_history_items` integer NOT NULL DEFAULT 0 CHECK (`processed_history_items` BETWEEN 0 AND 16),
  `successful_history_items` integer NOT NULL DEFAULT 0 CHECK (`successful_history_items` BETWEEN 0 AND 16),
  `failed_history_items` integer NOT NULL DEFAULT 0 CHECK (`failed_history_items` BETWEEN 0 AND 16),
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` BETWEEN 0 AND 16),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `error_code` text,
  `actor` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` text
);
--> statement-breakpoint
CREATE TABLE `v7_evaluation_provider_audio_hash_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `history_recovery_run_id` text NOT NULL,
  `audio_hash_run_id` text NOT NULL,
  `history_item_id` text NOT NULL,
  `provider_request_id` text NOT NULL,
  `attempt_number` integer NOT NULL CHECK (`attempt_number` BETWEEN 1 AND 2),
  `retrieval_state` text NOT NULL CHECK (`retrieval_state` IN ('PASS','FAILED')),
  `http_status` integer NOT NULL CHECK (`http_status` BETWEEN 0 AND 599),
  `exact_audio_hash` text CHECK (`exact_audio_hash` IS NULL OR length(`exact_audio_hash`) = 64),
  `byte_size` integer NOT NULL DEFAULT 0 CHECK (`byte_size` >= 0),
  `content_type` text,
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `exact_audio_hash_verified` integer NOT NULL CHECK (`exact_audio_hash_verified` IN (0,1)),
  `historical_plan_coverage_verified` integer NOT NULL DEFAULT 0 CHECK (`historical_plan_coverage_verified` = 0),
  `rights_pass_authority` integer NOT NULL DEFAULT 0 CHECK (`rights_pass_authority` = 0),
  `dataset_sealing_authority` integer NOT NULL DEFAULT 0 CHECK (`dataset_sealing_authority` = 0),
  `assurance_qualification_authority` integer NOT NULL DEFAULT 0 CHECK (`assurance_qualification_authority` = 0),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `provider_requests` integer NOT NULL DEFAULT 1 CHECK (`provider_requests` = 1),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((`retrieval_state`='PASS' AND `exact_audio_hash_verified`=1 AND `exact_audio_hash` IS NOT NULL AND `byte_size`>0) OR (`retrieval_state`='FAILED' AND `exact_audio_hash_verified`=0 AND `exact_audio_hash` IS NULL)),
  FOREIGN KEY (`history_recovery_run_id`) REFERENCES `v7_evaluation_provider_history_recovery_runs`(`id`),
  FOREIGN KEY (`audio_hash_run_id`) REFERENCES `v7_evaluation_provider_audio_hash_runs`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_provider_audio_hash_receipt_attempt_uq` ON `v7_evaluation_provider_audio_hash_receipts` (`channel_id`,`history_item_id`,`attempt_number`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_provider_audio_hash_receipt_no_update`
BEFORE UPDATE ON `v7_evaluation_provider_audio_hash_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_PROVIDER_AUDIO_HASH_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_provider_audio_hash_receipt_no_delete`
BEFORE DELETE ON `v7_evaluation_provider_audio_hash_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_PROVIDER_AUDIO_HASH_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_provider_audio_hash_candidate_diagnostics` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `audio_hash_run_id` text NOT NULL,
  `candidate_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'EVALUATION_PROVIDER_AUDIO_HASH_RECOVERY_V1'),
  `exact_hash_match_count` integer NOT NULL CHECK (`exact_hash_match_count` >= 0),
  `matched_history_item_ids_json` text NOT NULL,
  `provider_binding_state` text NOT NULL CHECK (`provider_binding_state` IN ('NO_EXACT_AUDIO_HASH_MATCH','UNIQUE_EXACT_AUDIO_HASH_MATCH','EQUIVALENT_BYTES_MULTIPLE_REQUESTS')),
  `exact_audio_hash_verified` integer NOT NULL CHECK (`exact_audio_hash_verified` IN (0,1)),
  `historical_plan_coverage_verified` integer NOT NULL DEFAULT 0 CHECK (`historical_plan_coverage_verified` = 0),
  `rights_pass_authority` integer NOT NULL DEFAULT 0 CHECK (`rights_pass_authority` = 0),
  `dataset_sealing_authority` integer NOT NULL DEFAULT 0 CHECK (`dataset_sealing_authority` = 0),
  `assurance_qualification_authority` integer NOT NULL DEFAULT 0 CHECK (`assurance_qualification_authority` = 0),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`audio_hash_run_id`) REFERENCES `v7_evaluation_provider_audio_hash_runs`(`id`),
  FOREIGN KEY (`candidate_id`) REFERENCES `v7_evaluation_candidates`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_provider_audio_hash_candidate_diagnostic_uq` ON `v7_evaluation_provider_audio_hash_candidate_diagnostics` (`audio_hash_run_id`,`candidate_id`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_provider_audio_hash_candidate_diagnostic_no_update`
BEFORE UPDATE ON `v7_evaluation_provider_audio_hash_candidate_diagnostics`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_PROVIDER_AUDIO_HASH_CANDIDATE_DIAGNOSTIC_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_provider_audio_hash_candidate_diagnostic_no_delete`
BEFORE DELETE ON `v7_evaluation_provider_audio_hash_candidate_diagnostics`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_PROVIDER_AUDIO_HASH_CANDIDATE_DIAGNOSTIC_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_provider_audio_hash_snapshots` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `audio_hash_run_id` text NOT NULL UNIQUE,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'EVALUATION_PROVIDER_AUDIO_HASH_RECOVERY_V1'),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('IN_PROGRESS','COMPLETE','EXHAUSTED_FAILURE')),
  `history_items_total` integer NOT NULL CHECK (`history_items_total` >= 0),
  `history_items_hash_verified` integer NOT NULL CHECK (`history_items_hash_verified` >= 0),
  `history_items_retryable` integer NOT NULL CHECK (`history_items_retryable` >= 0),
  `history_items_exhausted` integer NOT NULL CHECK (`history_items_exhausted` >= 0),
  `candidates_diagnosed` integer NOT NULL CHECK (`candidates_diagnosed` >= 0),
  `unique_exact_hash_matches` integer NOT NULL CHECK (`unique_exact_hash_matches` >= 0),
  `equivalent_exact_hash_match_sets` integer NOT NULL CHECK (`equivalent_exact_hash_match_sets` >= 0),
  `no_exact_hash_matches` integer NOT NULL CHECK (`no_exact_hash_matches` >= 0),
  `provider_requests_cumulative` integer NOT NULL CHECK (`provider_requests_cumulative` BETWEEN 0 AND 132),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `historical_plan_coverage_verified` integer NOT NULL DEFAULT 0 CHECK (`historical_plan_coverage_verified` = 0),
  `rights_pass_authority` integer NOT NULL DEFAULT 0 CHECK (`rights_pass_authority` = 0),
  `dataset_sealing_authority` integer NOT NULL DEFAULT 0 CHECK (`dataset_sealing_authority` = 0),
  `assurance_qualification_authority` integer NOT NULL DEFAULT 0 CHECK (`assurance_qualification_authority` = 0),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`audio_hash_run_id`) REFERENCES `v7_evaluation_provider_audio_hash_runs`(`id`)
);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_provider_audio_hash_snapshot_no_update`
BEFORE UPDATE ON `v7_evaluation_provider_audio_hash_snapshots`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_PROVIDER_AUDIO_HASH_SNAPSHOT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_provider_audio_hash_snapshot_no_delete`
BEFORE DELETE ON `v7_evaluation_provider_audio_hash_snapshots`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_PROVIDER_AUDIO_HASH_SNAPSHOT_IMMUTABLE'); END;
