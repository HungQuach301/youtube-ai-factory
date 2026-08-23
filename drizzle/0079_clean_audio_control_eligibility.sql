CREATE TABLE `v7_evaluation_clean_audio_control_eligibility_policies` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'CLEAN_AUDIO_CONTROL_ELIGIBILITY_V1'),
  `source_owner_policy_version` text NOT NULL CHECK (`source_owner_policy_version` = 'CLEAN_AUDIO_OWNER_GROUND_TRUTH_V1'),
  `source_fixture_plan_version` text NOT NULL CHECK (`source_fixture_plan_version` = 'CONTROLLED_FIXTURE_PLAN_V1'),
  `maximum_eligibility_receipts` integer NOT NULL CHECK (`maximum_eligibility_receipts` = 1),
  `exact_byte_readback_required` integer NOT NULL CHECK (`exact_byte_readback_required` = 1),
  `authority_boundary` text NOT NULL CHECK (`authority_boundary` = 'CLEAN_CONTROL_REFERENCE_ONLY'),
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `dataset_sealing_authority` integer NOT NULL DEFAULT 0 CHECK (`dataset_sealing_authority` = 0),
  `assurance_qualification_authority` integer NOT NULL DEFAULT 0 CHECK (`assurance_qualification_authority` = 0),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_clean_audio_control_eligibility_policy_channel_uq`
  ON `v7_evaluation_clean_audio_control_eligibility_policies` (`channel_id`,`policy_version`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_audio_control_eligibility_policy_no_update`
BEFORE UPDATE ON `v7_evaluation_clean_audio_control_eligibility_policies`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AUDIO_CONTROL_ELIGIBILITY_POLICY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_audio_control_eligibility_policy_no_delete`
BEFORE DELETE ON `v7_evaluation_clean_audio_control_eligibility_policies`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AUDIO_CONTROL_ELIGIBILITY_POLICY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_clean_audio_control_eligibility_tasks` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'CLEAN_AUDIO_CONTROL_ELIGIBILITY_V1'),
  `blueprint_id` text NOT NULL UNIQUE,
  `artifact_id` text NOT NULL UNIQUE,
  `rights_receipt_id` text NOT NULL UNIQUE,
  `qa_recovery_receipt_id` text NOT NULL UNIQUE,
  `owner_receipt_id` text NOT NULL UNIQUE,
  `exact_artifact_hash` text NOT NULL CHECK (length(`exact_artifact_hash`) = 64),
  `task_state` text NOT NULL CHECK (`task_state` = 'OPEN'),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`blueprint_id`) REFERENCES `v7_evaluation_controlled_fixture_blueprints`(`id`),
  FOREIGN KEY (`artifact_id`) REFERENCES `v7_evaluation_commercial_clean_audio_artifacts`(`id`),
  FOREIGN KEY (`rights_receipt_id`) REFERENCES `v7_evaluation_commercial_clean_audio_rights_receipts`(`id`),
  FOREIGN KEY (`qa_recovery_receipt_id`) REFERENCES `v7_evaluation_factory_audio_qa_recovery_receipts`(`id`),
  FOREIGN KEY (`owner_receipt_id`) REFERENCES `v7_evaluation_clean_audio_owner_ground_truth_receipts`(`id`)
);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_audio_control_eligibility_task_no_update`
BEFORE UPDATE ON `v7_evaluation_clean_audio_control_eligibility_tasks`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AUDIO_CONTROL_ELIGIBILITY_TASK_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_audio_control_eligibility_task_no_delete`
BEFORE DELETE ON `v7_evaluation_clean_audio_control_eligibility_tasks`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AUDIO_CONTROL_ELIGIBILITY_TASK_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_clean_audio_control_eligibility_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `task_id` text NOT NULL UNIQUE,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'CLEAN_AUDIO_CONTROL_ELIGIBILITY_V1'),
  `blueprint_id` text NOT NULL UNIQUE,
  `artifact_id` text NOT NULL UNIQUE,
  `rights_receipt_id` text NOT NULL UNIQUE,
  `qa_recovery_receipt_id` text NOT NULL UNIQUE,
  `owner_receipt_id` text NOT NULL UNIQUE,
  `exact_artifact_hash` text NOT NULL CHECK (length(`exact_artifact_hash`) = 64),
  `r2_readback_hash` text NOT NULL CHECK (`r2_readback_hash` = `exact_artifact_hash`),
  `r2_readback_bytes` integer NOT NULL CHECK (`r2_readback_bytes` > 10000),
  `fixture_role` text NOT NULL CHECK (`fixture_role` = 'CLEAN_NEGATIVE'),
  `candidate_kind` text NOT NULL CHECK (`candidate_kind` = 'AUDIO'),
  `decision_state` text NOT NULL CHECK (`decision_state` = 'ELIGIBLE_CLEAN_CONTROL_REFERENCE'),
  `bytes_state` text NOT NULL CHECK (`bytes_state` = 'READBACK_VERIFIED'),
  `checksum_state` text NOT NULL CHECK (`checksum_state` = 'PASS'),
  `provenance_state` text NOT NULL CHECK (`provenance_state` = 'PASS'),
  `rights_state` text NOT NULL CHECK (`rights_state` = 'PASS'),
  `factory_qa_state` text NOT NULL CHECK (`factory_qa_state` = 'LIKELY_CLEAN'),
  `owner_ground_truth_state` text NOT NULL CHECK (`owner_ground_truth_state` = 'CLEAN_CONFIRMED'),
  `audio_observable_labels_json` text NOT NULL CHECK (json_valid(`audio_observable_labels_json`)),
  `lineage_group_key` text NOT NULL CHECK (`lineage_group_key` = 'controlled-fixture:clean-audio:v1'),
  `independent_count_eligible` integer NOT NULL CHECK (`independent_count_eligible` = 1),
  `reference_eligible` integer NOT NULL CHECK (`reference_eligible` = 1),
  `candidate_items_after` integer NOT NULL CHECK (`candidate_items_after` >= 1),
  `owner_confirmed_references_after` integer NOT NULL CHECK (`owner_confirmed_references_after` >= 1),
  `clean_negative_controls_after` integer NOT NULL CHECK (`clean_negative_controls_after` >= 1),
  `controlled_injection_fixtures_after` integer NOT NULL CHECK (`controlled_injection_fixtures_after` >= 0),
  `p0_families_covered_after` integer NOT NULL CHECK (`p0_families_covered_after` >= 0),
  `p0_families_required` integer NOT NULL CHECK (`p0_families_required` = 5),
  `readiness_state` text NOT NULL CHECK (`readiness_state` = 'INSUFFICIENT_GROUND_TRUTH'),
  `actor` text NOT NULL,
  `idempotency_key` text NOT NULL UNIQUE,
  `request_hash` text NOT NULL CHECK (length(`request_hash`) = 64),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `authority_boundary` text NOT NULL CHECK (`authority_boundary` = 'CLEAN_CONTROL_REFERENCE_ONLY'),
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `dataset_eligible` integer NOT NULL DEFAULT 0 CHECK (`dataset_eligible` = 0),
  `dataset_sealing_authority` integer NOT NULL DEFAULT 0 CHECK (`dataset_sealing_authority` = 0),
  `assurance_qualification_authority` integer NOT NULL DEFAULT 0 CHECK (`assurance_qualification_authority` = 0),
  `release_eligible` integer NOT NULL DEFAULT 0 CHECK (`release_eligible` = 0),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`task_id`) REFERENCES `v7_evaluation_clean_audio_control_eligibility_tasks`(`id`),
  FOREIGN KEY (`blueprint_id`) REFERENCES `v7_evaluation_controlled_fixture_blueprints`(`id`),
  FOREIGN KEY (`artifact_id`) REFERENCES `v7_evaluation_commercial_clean_audio_artifacts`(`id`),
  FOREIGN KEY (`rights_receipt_id`) REFERENCES `v7_evaluation_commercial_clean_audio_rights_receipts`(`id`),
  FOREIGN KEY (`qa_recovery_receipt_id`) REFERENCES `v7_evaluation_factory_audio_qa_recovery_receipts`(`id`),
  FOREIGN KEY (`owner_receipt_id`) REFERENCES `v7_evaluation_clean_audio_owner_ground_truth_receipts`(`id`)
);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_audio_control_eligibility_receipt_no_update`
BEFORE UPDATE ON `v7_evaluation_clean_audio_control_eligibility_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AUDIO_CONTROL_ELIGIBILITY_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_audio_control_eligibility_receipt_no_delete`
BEFORE DELETE ON `v7_evaluation_clean_audio_control_eligibility_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AUDIO_CONTROL_ELIGIBILITY_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
INSERT INTO `v7_evaluation_clean_audio_control_eligibility_policies`
  (`id`,`channel_id`,`policy_version`,`source_owner_policy_version`,`source_fixture_plan_version`,`maximum_eligibility_receipts`,`exact_byte_readback_required`,`authority_boundary`)
VALUES
  ('clean-audio-control-eligibility-policy:hidden-systems:v1','channel-hidden-systems','CLEAN_AUDIO_CONTROL_ELIGIBILITY_V1','CLEAN_AUDIO_OWNER_GROUND_TRUTH_V1','CONTROLLED_FIXTURE_PLAN_V1',1,1,'CLEAN_CONTROL_REFERENCE_ONLY');
--> statement-breakpoint
INSERT INTO `v7_evaluation_clean_audio_control_eligibility_tasks`
  (`id`,`channel_id`,`policy_version`,`blueprint_id`,`artifact_id`,`rights_receipt_id`,`qa_recovery_receipt_id`,`owner_receipt_id`,`exact_artifact_hash`,`task_state`)
SELECT
  'clean-audio-control-eligibility-task:' || o.`artifact_id`,
  o.`channel_id`,
  'CLEAN_AUDIO_CONTROL_ELIGIBILITY_V1',
  b.`id`,
  o.`artifact_id`,
  r.`id`,
  q.`id`,
  o.`id`,
  lower(o.`exact_artifact_hash`),
  'OPEN'
FROM `v7_evaluation_clean_audio_owner_ground_truth_receipts` o
JOIN `v7_evaluation_commercial_clean_audio_artifacts` a ON a.`id`=o.`artifact_id`
JOIN `v7_evaluation_commercial_clean_audio_rights_receipts` r ON r.`artifact_id`=o.`artifact_id`
JOIN `v7_evaluation_factory_audio_qa_recovery_receipts` q ON q.`id`=o.`qa_recovery_receipt_id` AND q.`artifact_id`=o.`artifact_id`
JOIN `v7_evaluation_controlled_fixture_blueprints` b ON b.`blueprint_key`='CLEAN_AUDIO_NEGATIVE'
WHERE o.`channel_id`='channel-hidden-systems'
  AND o.`decision_state`='CLEAN_CONFIRMED'
  AND o.`full_listen_attested`=1
  AND json_array_length(o.`observed_defects_json`)=0
  AND lower(a.`sha256`)=lower(o.`exact_artifact_hash`)
  AND lower(q.`exact_artifact_hash`)=lower(o.`exact_artifact_hash`)
  AND a.`rights_state`='PASS'
  AND r.`rights_state`='PASS'
  AND q.`decision_state`='LIKELY_CLEAN'
  AND q.`p0_count`=0
  AND q.`p1_count`=0
  AND b.`fixture_role`='CLEAN_NEGATIVE'
  AND b.`candidate_kind`='AUDIO'
ORDER BY o.`created_at`,o.`id`
LIMIT 1;
