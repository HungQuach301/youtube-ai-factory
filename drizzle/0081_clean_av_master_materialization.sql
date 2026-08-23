CREATE TABLE `v7_evaluation_clean_av_master_policies` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'CLEAN_AV_MASTER_MATERIALIZATION_V1'),
  `target_blueprint_key` text NOT NULL CHECK (`target_blueprint_key` = 'CLEAN_AUDIO_VISUAL_MASTER_NEGATIVE'),
  `source_clean_control_policy_version` text NOT NULL CHECK (`source_clean_control_policy_version` = 'CLEAN_AUDIO_CONTROL_ELIGIBILITY_V1'),
  `maximum_masters` integer NOT NULL CHECK (`maximum_masters` = 1),
  `archival_width` integer NOT NULL CHECK (`archival_width` = 1920),
  `archival_height` integer NOT NULL CHECK (`archival_height` = 1080),
  `distribution_width` integer NOT NULL CHECK (`distribution_width` = 1280),
  `distribution_height` integer NOT NULL CHECK (`distribution_height` = 720),
  `frame_rate` real NOT NULL CHECK (`frame_rate` = 30),
  `audio_sample_rate_hz` integer NOT NULL CHECK (`audio_sample_rate_hz` = 48000),
  `maximum_av_end_delta_ms` integer NOT NULL CHECK (`maximum_av_end_delta_ms` = 80),
  `maximum_archival_bytes` integer NOT NULL CHECK (`maximum_archival_bytes` = 50000000),
  `maximum_distribution_bytes` integer NOT NULL CHECK (`maximum_distribution_bytes` = 20000000),
  `maximum_contact_sheet_bytes` integer NOT NULL CHECK (`maximum_contact_sheet_bytes` = 5000000),
  `exact_parent_readback_required` integer NOT NULL CHECK (`exact_parent_readback_required` = 1),
  `all_object_readback_required` integer NOT NULL CHECK (`all_object_readback_required` = 1),
  `owner_clean_label_required` integer NOT NULL CHECK (`owner_clean_label_required` = 1),
  `authority_boundary` text NOT NULL CHECK (`authority_boundary` = 'CLEAN_AV_TECHNICAL_MATERIALIZATION_ONLY'),
  `dataset_sealing_authority` integer NOT NULL DEFAULT 0 CHECK (`dataset_sealing_authority` = 0),
  `assurance_qualification_authority` integer NOT NULL DEFAULT 0 CHECK (`assurance_qualification_authority` = 0),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_clean_av_master_policy_channel_uq`
  ON `v7_evaluation_clean_av_master_policies` (`channel_id`,`policy_version`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_av_master_policy_no_update`
BEFORE UPDATE ON `v7_evaluation_clean_av_master_policies`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AV_MASTER_POLICY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_av_master_policy_no_delete`
BEFORE DELETE ON `v7_evaluation_clean_av_master_policies`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AV_MASTER_POLICY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_clean_av_master_tasks` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'CLEAN_AV_MASTER_MATERIALIZATION_V1'),
  `blueprint_id` text NOT NULL UNIQUE,
  `source_clean_control_receipt_id` text NOT NULL UNIQUE,
  `source_audio_artifact_id` text NOT NULL UNIQUE,
  `source_audio_rights_receipt_id` text NOT NULL,
  `source_audio_hash` text NOT NULL CHECK (length(`source_audio_hash`) = 64),
  `source_controlled_defect_receipt_id` text NOT NULL UNIQUE,
  `task_state` text NOT NULL CHECK (`task_state` = 'OPEN'),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`blueprint_id`) REFERENCES `v7_evaluation_controlled_fixture_blueprints`(`id`),
  FOREIGN KEY (`source_clean_control_receipt_id`) REFERENCES `v7_evaluation_clean_audio_control_eligibility_receipts`(`id`),
  FOREIGN KEY (`source_audio_artifact_id`) REFERENCES `v7_evaluation_commercial_clean_audio_artifacts`(`id`),
  FOREIGN KEY (`source_audio_rights_receipt_id`) REFERENCES `v7_evaluation_commercial_clean_audio_rights_receipts`(`id`),
  FOREIGN KEY (`source_controlled_defect_receipt_id`) REFERENCES `v7_evaluation_controlled_defect_derivation_receipts`(`id`)
);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_av_master_task_no_update`
BEFORE UPDATE ON `v7_evaluation_clean_av_master_tasks`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AV_MASTER_TASK_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_av_master_task_no_delete`
BEFORE DELETE ON `v7_evaluation_clean_av_master_tasks`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AV_MASTER_TASK_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_clean_av_master_materialization_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `task_id` text NOT NULL UNIQUE,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'CLEAN_AV_MASTER_MATERIALIZATION_V1'),
  `blueprint_id` text NOT NULL UNIQUE,
  `source_clean_control_receipt_id` text NOT NULL UNIQUE,
  `source_audio_artifact_id` text NOT NULL UNIQUE,
  `source_audio_rights_receipt_id` text NOT NULL,
  `source_audio_hash` text NOT NULL CHECK (length(`source_audio_hash`) = 64),
  `source_audio_readback_hash` text NOT NULL CHECK (`source_audio_readback_hash` = `source_audio_hash`),
  `source_audio_readback_bytes` integer NOT NULL CHECK (`source_audio_readback_bytes` > 10000),
  `visual_manifest_storage_key` text NOT NULL UNIQUE,
  `visual_manifest_hash` text NOT NULL CHECK (length(`visual_manifest_hash`) = 64),
  `visual_manifest_readback_hash` text NOT NULL CHECK (`visual_manifest_readback_hash` = `visual_manifest_hash`),
  `archival_storage_key` text NOT NULL UNIQUE,
  `archival_hash` text NOT NULL CHECK (length(`archival_hash`) = 64),
  `archival_bytes` integer NOT NULL CHECK (`archival_bytes` > 10000),
  `archival_readback_hash` text NOT NULL CHECK (`archival_readback_hash` = `archival_hash`),
  `distribution_storage_key` text NOT NULL UNIQUE,
  `distribution_hash` text NOT NULL CHECK (length(`distribution_hash`) = 64),
  `distribution_bytes` integer NOT NULL CHECK (`distribution_bytes` > 10000),
  `distribution_readback_hash` text NOT NULL CHECK (`distribution_readback_hash` = `distribution_hash`),
  `contact_sheet_storage_key` text NOT NULL UNIQUE,
  `contact_sheet_hash` text NOT NULL CHECK (length(`contact_sheet_hash`) = 64),
  `contact_sheet_bytes` integer NOT NULL CHECK (`contact_sheet_bytes` > 1000),
  `contact_sheet_readback_hash` text NOT NULL CHECK (`contact_sheet_readback_hash` = `contact_sheet_hash`),
  `technical_evidence_storage_key` text NOT NULL UNIQUE,
  `technical_evidence_hash` text NOT NULL CHECK (length(`technical_evidence_hash`) = 64),
  `technical_evidence_readback_hash` text NOT NULL CHECK (`technical_evidence_readback_hash` = `technical_evidence_hash`),
  `archival_width` integer NOT NULL CHECK (`archival_width` = 1920),
  `archival_height` integer NOT NULL CHECK (`archival_height` = 1080),
  `distribution_width` integer NOT NULL CHECK (`distribution_width` = 1280),
  `distribution_height` integer NOT NULL CHECK (`distribution_height` = 720),
  `frame_rate` real NOT NULL CHECK (`frame_rate` = 30),
  `audio_sample_rate_hz` integer NOT NULL CHECK (`audio_sample_rate_hz` = 48000),
  `audio_duration_seconds` real NOT NULL CHECK (`audio_duration_seconds` > 30 AND `audio_duration_seconds` < 45),
  `video_duration_seconds` real NOT NULL CHECK (`video_duration_seconds` > 30 AND `video_duration_seconds` < 45),
  `av_start_delta_ms` real NOT NULL CHECK (abs(`av_start_delta_ms`) <= 20),
  `av_end_delta_ms` real NOT NULL CHECK (abs(`av_end_delta_ms`) <= 80),
  `technical_qa_state` text NOT NULL CHECK (`technical_qa_state` = 'PASS'),
  `rights_state` text NOT NULL CHECK (`rights_state` = 'PASS'),
  `factory_qa_state` text NOT NULL CHECK (`factory_qa_state` = 'PENDING'),
  `browser_qa_state` text NOT NULL CHECK (`browser_qa_state` = 'PENDING'),
  `owner_ground_truth_state` text NOT NULL CHECK (`owner_ground_truth_state` = 'NOT_EVALUATED'),
  `materialization_state` text NOT NULL CHECK (`materialization_state` = 'EXACT_LINEAGE_CHECKSUM_SYNC_VERIFIED'),
  `actor` text NOT NULL,
  `idempotency_key` text NOT NULL UNIQUE,
  `request_hash` text NOT NULL CHECK (length(`request_hash`) = 64),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `authority_boundary` text NOT NULL CHECK (`authority_boundary` = 'CLEAN_AV_TECHNICAL_MATERIALIZATION_ONLY'),
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `dataset_eligible` integer NOT NULL DEFAULT 0 CHECK (`dataset_eligible` = 0),
  `qualification_eligible` integer NOT NULL DEFAULT 0 CHECK (`qualification_eligible` = 0),
  `release_eligible` integer NOT NULL DEFAULT 0 CHECK (`release_eligible` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`task_id`) REFERENCES `v7_evaluation_clean_av_master_tasks`(`id`),
  FOREIGN KEY (`blueprint_id`) REFERENCES `v7_evaluation_controlled_fixture_blueprints`(`id`)
);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_av_master_materialization_no_update`
BEFORE UPDATE ON `v7_evaluation_clean_av_master_materialization_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AV_MASTER_MATERIALIZATION_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_av_master_materialization_no_delete`
BEFORE DELETE ON `v7_evaluation_clean_av_master_materialization_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AV_MASTER_MATERIALIZATION_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_clean_av_factory_qa_policies` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'CLEAN_AV_FACTORY_QA_V1'),
  `model_id` text NOT NULL CHECK (`model_id` = 'gpt-5.6'),
  `maximum_requests` integer NOT NULL CHECK (`maximum_requests` = 1),
  `reserved_spend_ceiling_usd` real NOT NULL CHECK (`reserved_spend_ceiling_usd` = 0.50),
  `overall_floor` integer NOT NULL CHECK (`overall_floor` = 92),
  `dimension_floor` integer NOT NULL CHECK (`dimension_floor` = 90),
  `authority_boundary` text NOT NULL CHECK (`authority_boundary` = 'INDEPENDENT_REVIEW_ONLY'),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_clean_av_factory_qa_policy_channel_uq`
  ON `v7_evaluation_clean_av_factory_qa_policies` (`channel_id`,`policy_version`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_av_factory_qa_policy_no_update`
BEFORE UPDATE ON `v7_evaluation_clean_av_factory_qa_policies`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AV_FACTORY_QA_POLICY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_av_factory_qa_policy_no_delete`
BEFORE DELETE ON `v7_evaluation_clean_av_factory_qa_policies`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AV_FACTORY_QA_POLICY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_clean_av_factory_qa_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `materialization_receipt_id` text NOT NULL UNIQUE,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'CLEAN_AV_FACTORY_QA_V1'),
  `idempotency_key` text NOT NULL UNIQUE,
  `request_hash` text NOT NULL CHECK (length(`request_hash`) = 64),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('PLANNED','RUNNING','COMPLETE','FAILED')),
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` BETWEEN 0 AND 1),
  `reserved_spend_usd` real NOT NULL DEFAULT 0.50 CHECK (`reserved_spend_usd` = 0.50),
  `actual_spend_usd` real,
  `error_code` text,
  `actor` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` text,
  FOREIGN KEY (`materialization_receipt_id`) REFERENCES `v7_evaluation_clean_av_master_materialization_receipts`(`id`)
);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_av_factory_qa_run_no_delete`
BEFORE DELETE ON `v7_evaluation_clean_av_factory_qa_runs`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AV_FACTORY_QA_RUN_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_clean_av_factory_qa_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL UNIQUE,
  `materialization_receipt_id` text NOT NULL UNIQUE,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'CLEAN_AV_FACTORY_QA_V1'),
  `distribution_hash` text NOT NULL CHECK (length(`distribution_hash`) = 64),
  `contact_sheet_hash` text NOT NULL CHECK (length(`contact_sheet_hash`) = 64),
  `source_audio_qa_receipt_id` text NOT NULL,
  `source_audio_qa_state` text NOT NULL CHECK (`source_audio_qa_state` = 'LIKELY_CLEAN'),
  `model_id` text NOT NULL CHECK (`model_id` = 'gpt-5.6'),
  `provider_response_id` text NOT NULL UNIQUE,
  `provider_response_storage_key` text NOT NULL UNIQUE,
  `provider_response_hash` text NOT NULL CHECK (length(`provider_response_hash`) = 64),
  `provider_response_readback_hash` text NOT NULL CHECK (`provider_response_readback_hash` = `provider_response_hash`),
  `decision_state` text NOT NULL CHECK (`decision_state` IN ('LIKELY_CLEAN','LIKELY_DEFECT_PRESENT')),
  `overall_score` integer NOT NULL CHECK (`overall_score` BETWEEN 0 AND 100),
  `dimensions_json` text NOT NULL CHECK (json_valid(`dimensions_json`)),
  `p0_count` integer NOT NULL CHECK (`p0_count` >= 0),
  `p1_count` integer NOT NULL CHECK (`p1_count` >= 0),
  `findings_json` text NOT NULL CHECK (json_valid(`findings_json`)),
  `rationale` text NOT NULL,
  `usage_json` text NOT NULL CHECK (json_valid(`usage_json`)),
  `actual_spend_usd` real NOT NULL CHECK (`actual_spend_usd` BETWEEN 0 AND 0.50),
  `authority_boundary` text NOT NULL CHECK (`authority_boundary` = 'INDEPENDENT_REVIEW_ONLY'),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`run_id`) REFERENCES `v7_evaluation_clean_av_factory_qa_runs`(`id`),
  FOREIGN KEY (`materialization_receipt_id`) REFERENCES `v7_evaluation_clean_av_master_materialization_receipts`(`id`)
);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_av_factory_qa_receipt_no_update`
BEFORE UPDATE ON `v7_evaluation_clean_av_factory_qa_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AV_FACTORY_QA_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_av_factory_qa_receipt_no_delete`
BEFORE DELETE ON `v7_evaluation_clean_av_factory_qa_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AV_FACTORY_QA_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_clean_av_browser_qa_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `materialization_receipt_id` text NOT NULL UNIQUE,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'CLEAN_AV_BROWSER_QA_V1'),
  `distribution_hash` text NOT NULL CHECK (length(`distribution_hash`) = 64),
  `playback_coverage_ratio` real NOT NULL CHECK (`playback_coverage_ratio` >= 0.98 AND `playback_coverage_ratio` <= 1.01),
  `pause_resume_observed` integer NOT NULL CHECK (`pause_resume_observed` = 1),
  `seek_observed` integer NOT NULL CHECK (`seek_observed` = 1),
  `ended_observed` integer NOT NULL CHECK (`ended_observed` = 1),
  `audio_track_observed` integer NOT NULL CHECK (`audio_track_observed` = 1),
  `meaningful_motion_observed` integer NOT NULL CHECK (`meaningful_motion_observed` = 1),
  `mobile_legibility_observed` integer NOT NULL CHECK (`mobile_legibility_observed` = 1),
  `focus_reflow_observed` integer NOT NULL CHECK (`focus_reflow_observed` = 1),
  `page_error_count` integer NOT NULL CHECK (`page_error_count` = 0),
  `decision_state` text NOT NULL CHECK (`decision_state` IN ('LIKELY_CLEAN','LIKELY_DEFECT_PRESENT','UNCERTAIN')),
  `observations_json` text NOT NULL CHECK (json_valid(`observations_json`)),
  `actor` text NOT NULL,
  `idempotency_key` text NOT NULL UNIQUE,
  `request_hash` text NOT NULL CHECK (length(`request_hash`) = 64),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `authority_boundary` text NOT NULL CHECK (`authority_boundary` = 'INDEPENDENT_BROWSER_REVIEW_ONLY'),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`materialization_receipt_id`) REFERENCES `v7_evaluation_clean_av_master_materialization_receipts`(`id`)
);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_av_browser_qa_receipt_no_update`
BEFORE UPDATE ON `v7_evaluation_clean_av_browser_qa_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AV_BROWSER_QA_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_av_browser_qa_receipt_no_delete`
BEFORE DELETE ON `v7_evaluation_clean_av_browser_qa_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AV_BROWSER_QA_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_clean_av_owner_ground_truth_tasks` (
  `id` text PRIMARY KEY NOT NULL,
  `materialization_receipt_id` text NOT NULL UNIQUE,
  `factory_qa_receipt_id` text NOT NULL UNIQUE,
  `browser_qa_receipt_id` text NOT NULL UNIQUE,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'CLEAN_AV_OWNER_GROUND_TRUTH_V1'),
  `distribution_hash` text NOT NULL CHECK (length(`distribution_hash`) = 64),
  `task_state` text NOT NULL CHECK (`task_state` = 'OPEN'),
  `authority_boundary` text NOT NULL CHECK (`authority_boundary` = 'OWNER_GROUND_TRUTH_ONLY'),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`materialization_receipt_id`) REFERENCES `v7_evaluation_clean_av_master_materialization_receipts`(`id`),
  FOREIGN KEY (`factory_qa_receipt_id`) REFERENCES `v7_evaluation_clean_av_factory_qa_receipts`(`id`),
  FOREIGN KEY (`browser_qa_receipt_id`) REFERENCES `v7_evaluation_clean_av_browser_qa_receipts`(`id`)
);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_av_owner_task_no_update`
BEFORE UPDATE ON `v7_evaluation_clean_av_owner_ground_truth_tasks`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AV_OWNER_TASK_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_av_owner_task_no_delete`
BEFORE DELETE ON `v7_evaluation_clean_av_owner_ground_truth_tasks`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AV_OWNER_TASK_IMMUTABLE'); END;
--> statement-breakpoint
INSERT INTO `v7_evaluation_clean_av_master_policies`
  (`id`,`channel_id`,`policy_version`,`target_blueprint_key`,`source_clean_control_policy_version`,`maximum_masters`,`archival_width`,`archival_height`,`distribution_width`,`distribution_height`,`frame_rate`,`audio_sample_rate_hz`,`maximum_av_end_delta_ms`,`maximum_archival_bytes`,`maximum_distribution_bytes`,`maximum_contact_sheet_bytes`,`exact_parent_readback_required`,`all_object_readback_required`,`owner_clean_label_required`,`authority_boundary`)
VALUES
  ('clean-av-master-policy:hidden-systems:v1','channel-hidden-systems','CLEAN_AV_MASTER_MATERIALIZATION_V1','CLEAN_AUDIO_VISUAL_MASTER_NEGATIVE','CLEAN_AUDIO_CONTROL_ELIGIBILITY_V1',1,1920,1080,1280,720,30,48000,80,50000000,20000000,5000000,1,1,1,'CLEAN_AV_TECHNICAL_MATERIALIZATION_ONLY');
--> statement-breakpoint
INSERT INTO `v7_evaluation_clean_av_factory_qa_policies`
  (`id`,`channel_id`,`policy_version`,`model_id`,`maximum_requests`,`reserved_spend_ceiling_usd`,`overall_floor`,`dimension_floor`,`authority_boundary`)
VALUES
  ('clean-av-factory-qa-policy:hidden-systems:v1','channel-hidden-systems','CLEAN_AV_FACTORY_QA_V1','gpt-5.6',1,0.50,92,90,'INDEPENDENT_REVIEW_ONLY');
--> statement-breakpoint
INSERT INTO `v7_evaluation_clean_av_master_tasks`
  (`id`,`channel_id`,`policy_version`,`blueprint_id`,`source_clean_control_receipt_id`,`source_audio_artifact_id`,`source_audio_rights_receipt_id`,`source_audio_hash`,`source_controlled_defect_receipt_id`,`task_state`)
SELECT
  'clean-av-master-task:' || c.`artifact_id`,
  c.`channel_id`,
  'CLEAN_AV_MASTER_MATERIALIZATION_V1',
  b.`id`,
  c.`id`,
  c.`artifact_id`,
  c.`rights_receipt_id`,
  lower(c.`exact_artifact_hash`),
  d.`id`,
  'OPEN'
FROM `v7_evaluation_clean_audio_control_eligibility_receipts` c
JOIN `v7_evaluation_controlled_fixture_blueprints` b
  ON b.`blueprint_key`='CLEAN_AUDIO_VISUAL_MASTER_NEGATIVE'
JOIN `v7_evaluation_controlled_defect_derivation_receipts` d
  ON d.`channel_id`=c.`channel_id`
WHERE c.`channel_id`='channel-hidden-systems'
  AND c.`decision_state`='ELIGIBLE_CLEAN_CONTROL_REFERENCE'
  AND c.`bytes_state`='READBACK_VERIFIED'
  AND c.`checksum_state`='PASS'
  AND c.`rights_state`='PASS'
  AND c.`owner_ground_truth_state`='CLEAN_CONFIRMED'
  AND c.`reference_eligible`=1
  AND b.`fixture_role`='CLEAN_NEGATIVE'
  AND b.`candidate_kind`='MASTER'
  AND b.`modality`='AUDIO_VISUAL'
  AND b.`oracle_kind`='HYBRID'
  AND d.`decision_state`='CONTROLLED_DEFECT_PRESENT'
  AND d.`oracle_state`='PASS'
ORDER BY c.`created_at`,c.`id`
LIMIT 1;
