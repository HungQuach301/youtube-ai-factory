CREATE TABLE `v7_youtube_golden_audio_qa_recovery_authorizations` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `materialization_receipt_id` text NOT NULL UNIQUE,
  `failed_idempotency_key` text NOT NULL UNIQUE,
  `failed_error_code` text NOT NULL CHECK (`failed_error_code` = 'AUDIO_QA_OUTPUT_INVALID'),
  `failure_evidence_source` text NOT NULL CHECK (`failure_evidence_source` = 'EXECUTOR_OBSERVED_PROVIDER_CONTRACT_FAILURE'),
  `exact_audio_hash` text NOT NULL CHECK (length(`exact_audio_hash`) = 64),
  `maximum_additional_provider_requests` integer NOT NULL DEFAULT 1 CHECK (`maximum_additional_provider_requests` = 1),
  `authority_boundary` text NOT NULL CHECK (`authority_boundary` = 'ONE_EXACT_AUDIO_QA_RECOVERY_ONLY'),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`materialization_receipt_id`) REFERENCES `v7_youtube_golden_materialization_receipts`(`id`)
);
--> statement-breakpoint
CREATE TRIGGER `v7_youtube_golden_audio_qa_recovery_authorization_no_update` BEFORE UPDATE ON `v7_youtube_golden_audio_qa_recovery_authorizations` BEGIN SELECT RAISE(ABORT, 'YOUTUBE_GOLDEN_AUDIO_QA_RECOVERY_AUTHORIZATION_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_youtube_golden_audio_qa_recovery_authorization_no_delete` BEFORE DELETE ON `v7_youtube_golden_audio_qa_recovery_authorizations` BEGIN SELECT RAISE(ABORT, 'YOUTUBE_GOLDEN_AUDIO_QA_RECOVERY_AUTHORIZATION_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_youtube_golden_audio_qa_recovery_claims` (
  `id` text PRIMARY KEY NOT NULL,
  `authorization_id` text NOT NULL UNIQUE,
  `materialization_receipt_id` text NOT NULL UNIQUE,
  `idempotency_key` text NOT NULL UNIQUE,
  `exact_audio_hash` text NOT NULL CHECK (length(`exact_audio_hash`) = 64),
  `actor` text NOT NULL,
  `authority_boundary` text NOT NULL CHECK (`authority_boundary` = 'ONE_EXACT_AUDIO_QA_RECOVERY_CLAIM'),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`authorization_id`) REFERENCES `v7_youtube_golden_audio_qa_recovery_authorizations`(`id`),
  FOREIGN KEY (`materialization_receipt_id`) REFERENCES `v7_youtube_golden_materialization_receipts`(`id`)
);
--> statement-breakpoint
CREATE TRIGGER `v7_youtube_golden_audio_qa_recovery_claim_no_update` BEFORE UPDATE ON `v7_youtube_golden_audio_qa_recovery_claims` BEGIN SELECT RAISE(ABORT, 'YOUTUBE_GOLDEN_AUDIO_QA_RECOVERY_CLAIM_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_youtube_golden_audio_qa_recovery_claim_no_delete` BEFORE DELETE ON `v7_youtube_golden_audio_qa_recovery_claims` BEGIN SELECT RAISE(ABORT, 'YOUTUBE_GOLDEN_AUDIO_QA_RECOVERY_CLAIM_IMMUTABLE'); END;
--> statement-breakpoint
INSERT INTO `v7_youtube_golden_audio_qa_recovery_authorizations`
  (`id`,`channel_id`,`materialization_receipt_id`,`failed_idempotency_key`,`failed_error_code`,`failure_evidence_source`,`exact_audio_hash`,`authority_boundary`)
SELECT
  'audience-golden-audio-qa-recovery-authorization:r6',
  m.`channel_id`,
  m.`id`,
  'audience-golden:audio-qa:r6:20260823',
  'AUDIO_QA_OUTPUT_INVALID',
  'EXECUTOR_OBSERVED_PROVIDER_CONTRACT_FAILURE',
  m.`audience_mix_hash`,
  'ONE_EXACT_AUDIO_QA_RECOVERY_ONLY'
FROM `v7_youtube_golden_materialization_receipts` m
JOIN `v7_youtube_golden_sequence_blueprints` b ON b.`id` = m.`blueprint_id`
WHERE b.`id` = 'audience-golden-blueprint:channel-hidden-systems:r6'
  AND EXISTS (SELECT 1 FROM `v7_youtube_golden_qa_receipts` q WHERE q.`materialization_receipt_id` = m.`id` AND q.`qa_layer` = 'FACTORY_VISUAL')
  AND NOT EXISTS (SELECT 1 FROM `v7_youtube_golden_qa_receipts` q WHERE q.`materialization_receipt_id` = m.`id` AND q.`qa_layer` = 'FACTORY_AUDIO');
