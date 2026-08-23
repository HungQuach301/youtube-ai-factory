CREATE TABLE `v7_youtube_golden_revision_14_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `rejected_blueprint_id` text NOT NULL UNIQUE,
  `rejected_materialization_receipt_id` text NOT NULL UNIQUE,
  `replacement_blueprint_id` text NOT NULL UNIQUE,
  `revision_key` text NOT NULL CHECK (`revision_key` = 'AUDIENCE_GOLDEN_REVISION_14'),
  `visual_failure_receipt_id` text NOT NULL UNIQUE,
  `audio_pass_receipt_id` text NOT NULL UNIQUE,
  `asset_manifest_json` text NOT NULL CHECK (json_valid(`asset_manifest_json`)),
  `repair_contract_json` text NOT NULL CHECK (json_valid(`repair_contract_json`)),
  `actor` text NOT NULL,
  `idempotency_key` text NOT NULL UNIQUE,
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`rejected_blueprint_id`) REFERENCES `v7_youtube_golden_sequence_blueprints`(`id`),
  FOREIGN KEY (`replacement_blueprint_id`) REFERENCES `v7_youtube_golden_sequence_blueprints`(`id`),
  FOREIGN KEY (`visual_failure_receipt_id`) REFERENCES `v7_youtube_golden_qa_receipts`(`id`),
  FOREIGN KEY (`audio_pass_receipt_id`) REFERENCES `v7_youtube_golden_qa_receipts`(`id`)
);
--> statement-breakpoint
CREATE TRIGGER `v7_youtube_golden_revision_14_no_update` BEFORE UPDATE ON `v7_youtube_golden_revision_14_receipts` BEGIN SELECT RAISE(ABORT, 'YOUTUBE_GOLDEN_REVISION_14_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_youtube_golden_revision_14_no_delete` BEFORE DELETE ON `v7_youtube_golden_revision_14_receipts` BEGIN SELECT RAISE(ABORT, 'YOUTUBE_GOLDEN_REVISION_14_IMMUTABLE'); END;
