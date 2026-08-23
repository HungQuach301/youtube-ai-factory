CREATE TABLE `v7_youtube_golden_audio_recovery_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `failed_run_id` text NOT NULL UNIQUE,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'YOUTUBE_AUDIENCE_MASTER_STANDARD_V1'),
  `recovery_version` text NOT NULL CHECK (`recovery_version` = 'AUDIENCE_GOLDEN_POST_TTS_RECOVERY_V1'),
  `failure_basis` text NOT NULL CHECK (`failure_basis` = 'POST_TTS_INTERNAL_CONTRACT_FAILURE'),
  `idempotency_key` text NOT NULL UNIQUE,
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('RUNNING','COMPLETE','FAILED')),
  `subscription_reads` integer NOT NULL DEFAULT 0 CHECK (`subscription_reads` BETWEEN 0 AND 1),
  `tts_requests` integer NOT NULL DEFAULT 0 CHECK (`tts_requests` BETWEEN 0 AND 1),
  `provider_native_request_id` text,
  `exact_audio_hash` text,
  `error_code` text,
  `actor` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` text,
  FOREIGN KEY (`failed_run_id`) REFERENCES `v7_youtube_golden_audio_runs`(`id`)
);
--> statement-breakpoint
CREATE TRIGGER `v7_youtube_golden_audio_recovery_no_delete` BEFORE DELETE ON `v7_youtube_golden_audio_recovery_receipts` BEGIN SELECT RAISE(ABORT, 'YOUTUBE_GOLDEN_AUDIO_RECOVERY_APPEND_ONLY'); END;
