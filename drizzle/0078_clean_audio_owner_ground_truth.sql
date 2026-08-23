CREATE TABLE `v7_evaluation_clean_audio_owner_ground_truth_policies` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'CLEAN_AUDIO_OWNER_GROUND_TRUTH_V1'),
  `source_qa_policy_version` text NOT NULL CHECK (`source_qa_policy_version` = 'FACTORY_AUDIO_QA_RECOVERY_V1'),
  `maximum_owner_decisions` integer NOT NULL CHECK (`maximum_owner_decisions` = 1),
  `full_listen_required` integer NOT NULL CHECK (`full_listen_required` = 1),
  `exact_byte_readback_required` integer NOT NULL CHECK (`exact_byte_readback_required` = 1),
  `authority_boundary` text NOT NULL CHECK (`authority_boundary` = 'OWNER_GROUND_TRUTH_ONLY'),
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `dataset_sealing_authority` integer NOT NULL DEFAULT 0 CHECK (`dataset_sealing_authority` = 0),
  `assurance_qualification_authority` integer NOT NULL DEFAULT 0 CHECK (`assurance_qualification_authority` = 0),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_clean_audio_owner_ground_truth_policy_channel_uq`
  ON `v7_evaluation_clean_audio_owner_ground_truth_policies` (`channel_id`,`policy_version`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_audio_owner_ground_truth_policy_no_update`
BEFORE UPDATE ON `v7_evaluation_clean_audio_owner_ground_truth_policies`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AUDIO_OWNER_GROUND_TRUTH_POLICY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_audio_owner_ground_truth_policy_no_delete`
BEFORE DELETE ON `v7_evaluation_clean_audio_owner_ground_truth_policies`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AUDIO_OWNER_GROUND_TRUTH_POLICY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_clean_audio_owner_ground_truth_tasks` (
  `id` text PRIMARY KEY NOT NULL,
  `artifact_id` text NOT NULL UNIQUE,
  `qa_recovery_receipt_id` text NOT NULL UNIQUE,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'CLEAN_AUDIO_OWNER_GROUND_TRUTH_V1'),
  `exact_artifact_hash` text NOT NULL CHECK (length(`exact_artifact_hash`) = 64),
  `task_state` text NOT NULL CHECK (`task_state` = 'OPEN'),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`artifact_id`) REFERENCES `v7_evaluation_commercial_clean_audio_artifacts`(`id`),
  FOREIGN KEY (`qa_recovery_receipt_id`) REFERENCES `v7_evaluation_factory_audio_qa_recovery_receipts`(`id`)
);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_audio_owner_ground_truth_task_no_update`
BEFORE UPDATE ON `v7_evaluation_clean_audio_owner_ground_truth_tasks`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AUDIO_OWNER_GROUND_TRUTH_TASK_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_audio_owner_ground_truth_task_no_delete`
BEFORE DELETE ON `v7_evaluation_clean_audio_owner_ground_truth_tasks`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AUDIO_OWNER_GROUND_TRUTH_TASK_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_clean_audio_owner_ground_truth_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `task_id` text NOT NULL UNIQUE,
  `artifact_id` text NOT NULL UNIQUE,
  `qa_recovery_receipt_id` text NOT NULL UNIQUE,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'CLEAN_AUDIO_OWNER_GROUND_TRUTH_V1'),
  `exact_artifact_hash` text NOT NULL CHECK (length(`exact_artifact_hash`) = 64),
  `decision_state` text NOT NULL CHECK (`decision_state` IN ('CLEAN_CONFIRMED','DEFECT_REJECTED')),
  `full_listen_attested` integer NOT NULL CHECK (`full_listen_attested` = 1),
  `observed_defects_json` text NOT NULL,
  `rationale` text NOT NULL CHECK (length(`rationale`) BETWEEN 12 AND 1000),
  `actor` text NOT NULL,
  `idempotency_key` text NOT NULL UNIQUE,
  `request_hash` text NOT NULL CHECK (length(`request_hash`) = 64),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `authority_boundary` text NOT NULL CHECK (`authority_boundary` = 'OWNER_GROUND_TRUTH_ONLY'),
  `dataset_sealing_authority` integer NOT NULL DEFAULT 0 CHECK (`dataset_sealing_authority` = 0),
  `assurance_qualification_authority` integer NOT NULL DEFAULT 0 CHECK (`assurance_qualification_authority` = 0),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`task_id`) REFERENCES `v7_evaluation_clean_audio_owner_ground_truth_tasks`(`id`),
  FOREIGN KEY (`artifact_id`) REFERENCES `v7_evaluation_commercial_clean_audio_artifacts`(`id`),
  FOREIGN KEY (`qa_recovery_receipt_id`) REFERENCES `v7_evaluation_factory_audio_qa_recovery_receipts`(`id`)
);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_audio_owner_ground_truth_receipt_no_update`
BEFORE UPDATE ON `v7_evaluation_clean_audio_owner_ground_truth_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AUDIO_OWNER_GROUND_TRUTH_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_audio_owner_ground_truth_receipt_no_delete`
BEFORE DELETE ON `v7_evaluation_clean_audio_owner_ground_truth_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AUDIO_OWNER_GROUND_TRUTH_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
INSERT INTO `v7_evaluation_clean_audio_owner_ground_truth_policies`
  (`id`,`channel_id`,`policy_version`,`source_qa_policy_version`,`maximum_owner_decisions`,`full_listen_required`,`exact_byte_readback_required`,`authority_boundary`)
VALUES
  ('clean-audio-owner-ground-truth-policy:hidden-systems:v1','channel-hidden-systems','CLEAN_AUDIO_OWNER_GROUND_TRUTH_V1','FACTORY_AUDIO_QA_RECOVERY_V1',1,1,1,'OWNER_GROUND_TRUTH_ONLY');
--> statement-breakpoint
INSERT INTO `v7_evaluation_clean_audio_owner_ground_truth_tasks`
  (`id`,`artifact_id`,`qa_recovery_receipt_id`,`channel_id`,`policy_version`,`exact_artifact_hash`,`task_state`)
SELECT
  'clean-audio-owner-ground-truth-task:' || q.`artifact_id`,
  q.`artifact_id`,
  q.`id`,
  q.`channel_id`,
  'CLEAN_AUDIO_OWNER_GROUND_TRUTH_V1',
  q.`exact_artifact_hash`,
  'OPEN'
FROM `v7_evaluation_factory_audio_qa_recovery_receipts` q
JOIN `v7_evaluation_commercial_clean_audio_artifacts` a ON a.`id`=q.`artifact_id`
JOIN `v7_evaluation_commercial_clean_audio_rights_receipts` r ON r.`artifact_id`=a.`id`
WHERE q.`channel_id`='channel-hidden-systems'
  AND q.`decision_state`='LIKELY_CLEAN'
  AND q.`p0_count`=0
  AND q.`p1_count`=0
  AND q.`authority_boundary`='INDEPENDENT_REVIEW_ONLY'
  AND a.`rights_state`='PASS'
  AND r.`rights_state`='PASS'
ORDER BY q.`created_at`,q.`id`
LIMIT 1;
