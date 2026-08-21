ALTER TABLE `v7_evaluation_candidates` ADD `verification_state` text NOT NULL DEFAULT 'PENDING';
--> statement-breakpoint
ALTER TABLE `v7_evaluation_candidates` ADD `latest_verification_receipt_id` text;
--> statement-breakpoint
ALTER TABLE `v7_evaluation_candidates` ADD `verification_attempted_at` text;
--> statement-breakpoint
CREATE INDEX `v7_evaluation_candidate_verification_idx` ON `v7_evaluation_candidates` (`channel_id`,`verification_state`,`id`);
--> statement-breakpoint
CREATE TABLE `v7_evaluation_verification_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `foundation_version` text NOT NULL CHECK (`foundation_version` = 'EVALUATION_FOUNDATION_V1'),
  `policy_version` text NOT NULL CHECK (`policy_version` = 'CORPUS_VERIFICATION_POLICY_V1'),
  `lifecycle_state` text NOT NULL DEFAULT 'PLANNED' CHECK (`lifecycle_state` IN ('PLANNED','RUNNING','COMPLETED','PARTIAL','FAILED')),
  `idempotency_key` text NOT NULL,
  `intent_hash` text NOT NULL,
  `candidate_ids_json` text NOT NULL,
  `maximum_candidates` integer NOT NULL CHECK (`maximum_candidates` BETWEEN 1 AND 20),
  `maximum_object_bytes` integer NOT NULL CHECK (`maximum_object_bytes` = 100000000),
  `planned_candidates` integer NOT NULL CHECK (`planned_candidates` BETWEEN 0 AND 20),
  `processed_candidates` integer NOT NULL DEFAULT 0 CHECK (`processed_candidates` BETWEEN 0 AND 20),
  `byte_verified_candidates` integer NOT NULL DEFAULT 0 CHECK (`byte_verified_candidates` BETWEEN 0 AND 20),
  `checksum_pass_candidates` integer NOT NULL DEFAULT 0 CHECK (`checksum_pass_candidates` BETWEEN 0 AND 20),
  `provenance_pass_candidates` integer NOT NULL DEFAULT 0 CHECK (`provenance_pass_candidates` BETWEEN 0 AND 20),
  `rights_pass_candidates` integer NOT NULL DEFAULT 0 CHECK (`rights_pass_candidates` BETWEEN 0 AND 20),
  `blocked_candidates` integer NOT NULL DEFAULT 0 CHECK (`blocked_candidates` BETWEEN 0 AND 20),
  `bytes_read` integer NOT NULL DEFAULT 0 CHECK (`bytes_read` >= 0),
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `actor` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_verification_run_idempotency_uq` ON `v7_evaluation_verification_runs` (`channel_id`,`idempotency_key`);
--> statement-breakpoint
CREATE INDEX `v7_evaluation_verification_run_state_idx` ON `v7_evaluation_verification_runs` (`channel_id`,`lifecycle_state`,`created_at`);
--> statement-breakpoint
CREATE TABLE `v7_evaluation_verification_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL,
  `candidate_id` text NOT NULL,
  `source_artifact_id` text NOT NULL,
  `storage_key` text NOT NULL,
  `declared_hash` text,
  `computed_hash` text,
  `declared_bytes` integer,
  `actual_bytes` integer,
  `bytes_state` text NOT NULL,
  `checksum_state` text NOT NULL,
  `provenance_state` text NOT NULL,
  `rights_verification_state` text NOT NULL,
  `rights_basis` text NOT NULL,
  `object_metadata_json` text NOT NULL,
  `reconciliation_reasons_json` text NOT NULL,
  `evidence_hash` text NOT NULL,
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`run_id`) REFERENCES `v7_evaluation_verification_runs`(`id`),
  FOREIGN KEY (`candidate_id`) REFERENCES `v7_evaluation_candidates`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_verification_receipt_run_candidate_uq` ON `v7_evaluation_verification_receipts` (`run_id`,`candidate_id`);
--> statement-breakpoint
CREATE INDEX `v7_evaluation_verification_receipt_candidate_idx` ON `v7_evaluation_verification_receipts` (`candidate_id`,`created_at`);
--> statement-breakpoint
UPDATE `v7_evaluation_foundation_registry`
SET `lifecycle_state`='ACTIVE'
WHERE `component_key` IN ('CORPUS_INVENTORY','FIXTURE_VERIFICATION','CORRELATION_CONTROL')
  AND `foundation_version`='EVALUATION_FOUNDATION_V1';
