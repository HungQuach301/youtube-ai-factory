CREATE TABLE `v7_evaluation_commercial_clean_audio_recovery_policies` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'COMMERCIAL_CLEAN_AUDIO_RECOVERY_V1'),
  `source_policy_version` text NOT NULL CHECK (`source_policy_version` = 'COMMERCIAL_CLEAN_AUDIO_REGENERATION_V1'),
  `eligible_failure_code` text NOT NULL CHECK (`eligible_failure_code` = 'UNEXPECTED_COMMERCIAL_CLEAN_AUDIO_FAILURE'),
  `root_cause_code` text NOT NULL CHECK (`root_cause_code` = 'ENTITLEMENT_STATE_CONTRACT_MISMATCH'),
  `maximum_authorized_recovery_attempts` integer NOT NULL CHECK (`maximum_authorized_recovery_attempts` = 1),
  `maximum_additional_subscription_reads` integer NOT NULL CHECK (`maximum_additional_subscription_reads` = 1),
  `maximum_tts_requests` integer NOT NULL CHECK (`maximum_tts_requests` = 1),
  `reserved_spend_ceiling_usd` real NOT NULL CHECK (`reserved_spend_ceiling_usd` = 0.08),
  `dataset_sealing_authority` integer NOT NULL DEFAULT 0 CHECK (`dataset_sealing_authority` = 0),
  `assurance_qualification_authority` integer NOT NULL DEFAULT 0 CHECK (`assurance_qualification_authority` = 0),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_commercial_clean_audio_recovery_policy_channel_uq`
  ON `v7_evaluation_commercial_clean_audio_recovery_policies` (`channel_id`,`policy_version`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_commercial_clean_audio_recovery_policy_no_update`
BEFORE UPDATE ON `v7_evaluation_commercial_clean_audio_recovery_policies`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_COMMERCIAL_CLEAN_AUDIO_RECOVERY_POLICY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_commercial_clean_audio_recovery_policy_no_delete`
BEFORE DELETE ON `v7_evaluation_commercial_clean_audio_recovery_policies`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_COMMERCIAL_CLEAN_AUDIO_RECOVERY_POLICY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_commercial_clean_audio_recovery_authorizations` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'COMMERCIAL_CLEAN_AUDIO_RECOVERY_V1'),
  `failed_run_id` text NOT NULL UNIQUE,
  `failed_subscription_reads` integer NOT NULL CHECK (`failed_subscription_reads` = 1),
  `failed_tts_requests` integer NOT NULL CHECK (`failed_tts_requests` = 0),
  `failed_error_code` text NOT NULL CHECK (`failed_error_code` = 'UNEXPECTED_COMMERCIAL_CLEAN_AUDIO_FAILURE'),
  `root_cause_code` text NOT NULL CHECK (`root_cause_code` = 'ENTITLEMENT_STATE_CONTRACT_MISMATCH'),
  `authorization_state` text NOT NULL CHECK (`authorization_state` = 'AUTHORIZED_ONE_RECOVERY'),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`failed_run_id`) REFERENCES `v7_evaluation_commercial_clean_audio_runs`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_commercial_clean_audio_recovery_authorization_channel_uq`
  ON `v7_evaluation_commercial_clean_audio_recovery_authorizations` (`channel_id`,`policy_version`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_commercial_clean_audio_recovery_authorization_no_update`
BEFORE UPDATE ON `v7_evaluation_commercial_clean_audio_recovery_authorizations`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_COMMERCIAL_CLEAN_AUDIO_RECOVERY_AUTHORIZATION_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_commercial_clean_audio_recovery_authorization_no_delete`
BEFORE DELETE ON `v7_evaluation_commercial_clean_audio_recovery_authorizations`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_COMMERCIAL_CLEAN_AUDIO_RECOVERY_AUTHORIZATION_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_commercial_clean_audio_recovery_bindings` (
  `id` text PRIMARY KEY NOT NULL,
  `authorization_id` text NOT NULL UNIQUE,
  `failed_run_id` text NOT NULL UNIQUE,
  `recovery_run_id` text NOT NULL UNIQUE,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'COMMERCIAL_CLEAN_AUDIO_RECOVERY_V1'),
  `binding_state` text NOT NULL CHECK (`binding_state` = 'RECOVERY_ATTEMPT_CONSUMED'),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`authorization_id`) REFERENCES `v7_evaluation_commercial_clean_audio_recovery_authorizations`(`id`),
  FOREIGN KEY (`failed_run_id`) REFERENCES `v7_evaluation_commercial_clean_audio_runs`(`id`),
  FOREIGN KEY (`recovery_run_id`) REFERENCES `v7_evaluation_commercial_clean_audio_runs`(`id`)
);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_commercial_clean_audio_recovery_binding_no_update`
BEFORE UPDATE ON `v7_evaluation_commercial_clean_audio_recovery_bindings`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_COMMERCIAL_CLEAN_AUDIO_RECOVERY_BINDING_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_commercial_clean_audio_recovery_binding_no_delete`
BEFORE DELETE ON `v7_evaluation_commercial_clean_audio_recovery_bindings`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_COMMERCIAL_CLEAN_AUDIO_RECOVERY_BINDING_IMMUTABLE'); END;
--> statement-breakpoint
INSERT INTO `v7_evaluation_commercial_clean_audio_recovery_policies`
  (`id`,`channel_id`,`policy_version`,`source_policy_version`,`eligible_failure_code`,`root_cause_code`,`maximum_authorized_recovery_attempts`,`maximum_additional_subscription_reads`,`maximum_tts_requests`,`reserved_spend_ceiling_usd`)
VALUES
  ('commercial-clean-audio-recovery-policy:hidden-systems:v1','channel-hidden-systems','COMMERCIAL_CLEAN_AUDIO_RECOVERY_V1','COMMERCIAL_CLEAN_AUDIO_REGENERATION_V1','UNEXPECTED_COMMERCIAL_CLEAN_AUDIO_FAILURE','ENTITLEMENT_STATE_CONTRACT_MISMATCH',1,1,1,0.08);
--> statement-breakpoint
INSERT INTO `v7_evaluation_commercial_clean_audio_recovery_authorizations`
  (`id`,`channel_id`,`policy_version`,`failed_run_id`,`failed_subscription_reads`,`failed_tts_requests`,`failed_error_code`,`root_cause_code`,`authorization_state`)
SELECT
  'commercial-clean-audio-recovery-authorization:' || `id`,
  `channel_id`,
  'COMMERCIAL_CLEAN_AUDIO_RECOVERY_V1',
  `id`,
  `subscription_reads`,
  `tts_requests`,
  `error_code`,
  'ENTITLEMENT_STATE_CONTRACT_MISMATCH',
  'AUTHORIZED_ONE_RECOVERY'
FROM `v7_evaluation_commercial_clean_audio_runs`
WHERE `channel_id`='channel-hidden-systems'
  AND `policy_version`='COMMERCIAL_CLEAN_AUDIO_REGENERATION_V1'
  AND `lifecycle_state`='FAILED'
  AND `subscription_reads`=1
  AND `tts_requests`=0
  AND `error_code`='UNEXPECTED_COMMERCIAL_CLEAN_AUDIO_FAILURE'
  AND NOT EXISTS (
    SELECT 1 FROM `v7_evaluation_commercial_clean_audio_artifacts`
    WHERE `channel_id`='channel-hidden-systems'
      AND `policy_version`='COMMERCIAL_CLEAN_AUDIO_REGENERATION_V1'
  )
ORDER BY `created_at`,`id`
LIMIT 1;
