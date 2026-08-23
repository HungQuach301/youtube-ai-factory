DROP INDEX `v7_youtube_golden_sequence_blueprint_channel_uq`;
--> statement-breakpoint
CREATE TABLE `v7_youtube_golden_revision_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `rejected_blueprint_id` text NOT NULL UNIQUE,
  `rejected_materialization_receipt_id` text NOT NULL UNIQUE,
  `replacement_blueprint_id` text NOT NULL UNIQUE,
  `revision_key` text NOT NULL CHECK (`revision_key` = 'AUDIENCE_GOLDEN_REVISION_2'),
  `visual_failure_receipt_id` text NOT NULL,
  `audio_failure_receipt_id` text NOT NULL,
  `repair_contract_json` text NOT NULL CHECK (json_valid(`repair_contract_json`)),
  `actor` text NOT NULL,
  `idempotency_key` text NOT NULL UNIQUE,
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`rejected_blueprint_id`) REFERENCES `v7_youtube_golden_sequence_blueprints`(`id`),
  FOREIGN KEY (`replacement_blueprint_id`) REFERENCES `v7_youtube_golden_sequence_blueprints`(`id`)
);
--> statement-breakpoint
CREATE TRIGGER `v7_youtube_golden_revision_no_update` BEFORE UPDATE ON `v7_youtube_golden_revision_receipts` BEGIN SELECT RAISE(ABORT, 'YOUTUBE_GOLDEN_REVISION_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_youtube_golden_revision_no_delete` BEFORE DELETE ON `v7_youtube_golden_revision_receipts` BEGIN SELECT RAISE(ABORT, 'YOUTUBE_GOLDEN_REVISION_IMMUTABLE'); END;
