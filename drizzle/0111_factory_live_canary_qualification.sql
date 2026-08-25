CREATE TABLE `factory_live_canary_qualification_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `qualification_key` text NOT NULL,
  `fixture_version` text NOT NULL,
  `video_id` text NOT NULL,
  `recovery_stream_id` text NOT NULL,
  `integrated_canary_receipt_id` text NOT NULL,
  `composition_job_id` text NOT NULL,
  `main_replay_receipt_id` text NOT NULL,
  `orphan_event_id` text NOT NULL,
  `orphan_replay_receipt_id` text NOT NULL,
  `output_hash` text NOT NULL CHECK (length(`output_hash`) = 64),
  `main_lease_state` text NOT NULL CHECK (`main_lease_state` = 'RELEASED'),
  `orphan_lease_state` text NOT NULL CHECK (`orphan_lease_state` = 'ORPHANED'),
  `canary_replay_state` text NOT NULL CHECK (`canary_replay_state` = 'IDEMPOTENT_REPLAY'),
  `orphan_replay_state` text NOT NULL CHECK (`orphan_replay_state` = 'IDEMPOTENT_REPLAY'),
  `verification_state` text NOT NULL CHECK (`verification_state` = 'PASS'),
  `zero_dispatch` integer NOT NULL CHECK (`zero_dispatch` = 1),
  `provider_requests` integer NOT NULL CHECK (`provider_requests` = 0),
  `spend_micros` integer NOT NULL CHECK (`spend_micros` = 0),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`integrated_canary_receipt_id`) REFERENCES `factory_integrated_canary_receipts`(`id`),
  FOREIGN KEY (`composition_job_id`) REFERENCES `factory_video_composition_jobs`(`id`),
  FOREIGN KEY (`main_replay_receipt_id`) REFERENCES `factory_runtime_replay_receipts`(`id`),
  FOREIGN KEY (`orphan_event_id`) REFERENCES `factory_runtime_events`(`id`),
  FOREIGN KEY (`orphan_replay_receipt_id`) REFERENCES `factory_runtime_replay_receipts`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_live_canary_qualification_key_uq` ON `factory_live_canary_qualification_receipts` (`qualification_key`);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_live_canary_qualification_canary_uq` ON `factory_live_canary_qualification_receipts` (`integrated_canary_receipt_id`);
--> statement-breakpoint
CREATE TRIGGER `factory_live_canary_qualification_receipts_no_update` BEFORE UPDATE ON `factory_live_canary_qualification_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_LIVE_CANARY_QUALIFICATION_RECEIPTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_live_canary_qualification_receipts_no_delete` BEFORE DELETE ON `factory_live_canary_qualification_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_LIVE_CANARY_QUALIFICATION_RECEIPTS_APPEND_ONLY'); END;
