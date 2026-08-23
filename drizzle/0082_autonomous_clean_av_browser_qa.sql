CREATE TABLE `v7_evaluation_clean_av_browser_qa_automation_policies` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'CLEAN_AV_AUTONOMOUS_BROWSER_QA_V1'),
  `maximum_attempts` integer NOT NULL CHECK (`maximum_attempts` = 3),
  `minimum_playback_coverage_ratio` real NOT NULL CHECK (`minimum_playback_coverage_ratio` = 0.98),
  `minimum_audio_rms` real NOT NULL CHECK (`minimum_audio_rms` = 0.002),
  `minimum_motion_samples` integer NOT NULL CHECK (`minimum_motion_samples` = 4),
  `minimum_mobile_frame_samples` integer NOT NULL CHECK (`minimum_mobile_frame_samples` = 4),
  `authority_boundary` text NOT NULL CHECK (`authority_boundary` = 'INDEPENDENT_BROWSER_REVIEW_ONLY'),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_clean_av_browser_qa_automation_policy_channel_uq`
  ON `v7_evaluation_clean_av_browser_qa_automation_policies` (`channel_id`,`policy_version`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_av_browser_qa_automation_policy_no_update`
BEFORE UPDATE ON `v7_evaluation_clean_av_browser_qa_automation_policies`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AV_BROWSER_QA_AUTOMATION_POLICY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_av_browser_qa_automation_policy_no_delete`
BEFORE DELETE ON `v7_evaluation_clean_av_browser_qa_automation_policies`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AV_BROWSER_QA_AUTOMATION_POLICY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_clean_av_browser_qa_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `materialization_receipt_id` text NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'CLEAN_AV_AUTONOMOUS_BROWSER_QA_V1'),
  `attempt_number` integer NOT NULL CHECK (`attempt_number` BETWEEN 1 AND 3),
  `idempotency_key` text NOT NULL UNIQUE,
  `request_hash` text NOT NULL CHECK (length(`request_hash`) = 64),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('PLANNED','RUNNING','COMPLETE','FAILED')),
  `distribution_hash` text NOT NULL CHECK (length(`distribution_hash`) = 64),
  `browser_session_id` text,
  `browser_name` text,
  `browser_version` text,
  `user_agent` text,
  `viewport_width` integer,
  `viewport_height` integer,
  `playback_coverage_ratio` real,
  `pause_resume_observed` integer,
  `seek_observed` integer,
  `ended_observed` integer,
  `audio_track_observed` integer,
  `maximum_audio_rms` real,
  `meaningful_motion_observed` integer,
  `motion_samples` integer,
  `mobile_legibility_observed` integer,
  `mobile_frame_samples` integer,
  `focus_reflow_observed` integer,
  `page_error_count` integer,
  `event_trace_json` text CHECK (`event_trace_json` IS NULL OR json_valid(`event_trace_json`)),
  `observations_json` text CHECK (`observations_json` IS NULL OR json_valid(`observations_json`)),
  `evidence_bundle_hash` text CHECK (`evidence_bundle_hash` IS NULL OR length(`evidence_bundle_hash`) = 64),
  `failure_code` text,
  `actor` text NOT NULL,
  `authority_boundary` text NOT NULL CHECK (`authority_boundary` = 'INDEPENDENT_BROWSER_REVIEW_ONLY'),
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `dataset_eligible` integer NOT NULL DEFAULT 0 CHECK (`dataset_eligible` = 0),
  `qualification_eligible` integer NOT NULL DEFAULT 0 CHECK (`qualification_eligible` = 0),
  `release_eligible` integer NOT NULL DEFAULT 0 CHECK (`release_eligible` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` text,
  FOREIGN KEY (`materialization_receipt_id`) REFERENCES `v7_evaluation_clean_av_master_materialization_receipts`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_clean_av_browser_qa_run_attempt_uq`
  ON `v7_evaluation_clean_av_browser_qa_runs` (`materialization_receipt_id`,`attempt_number`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_av_browser_qa_run_no_delete`
BEFORE DELETE ON `v7_evaluation_clean_av_browser_qa_runs`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AV_BROWSER_QA_RUN_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_clean_av_browser_qa_evidence_objects` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL,
  `materialization_receipt_id` text NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'CLEAN_AV_AUTONOMOUS_BROWSER_QA_V1'),
  `role` text NOT NULL CHECK (`role` IN ('MOBILE_CUE_1','MOBILE_CUE_2','MOBILE_CUE_3','MOBILE_CUE_4')),
  `media_time_seconds` real NOT NULL CHECK (`media_time_seconds` >= 0),
  `storage_key` text NOT NULL UNIQUE,
  `mime_type` text NOT NULL CHECK (`mime_type` = 'image/jpeg'),
  `byte_size` integer NOT NULL CHECK (`byte_size` BETWEEN 1000 AND 120000),
  `sha256` text NOT NULL CHECK (length(`sha256`) = 64),
  `readback_sha256` text NOT NULL CHECK (`readback_sha256` = `sha256`),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`run_id`) REFERENCES `v7_evaluation_clean_av_browser_qa_runs`(`id`),
  FOREIGN KEY (`materialization_receipt_id`) REFERENCES `v7_evaluation_clean_av_master_materialization_receipts`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_clean_av_browser_qa_evidence_role_uq`
  ON `v7_evaluation_clean_av_browser_qa_evidence_objects` (`run_id`,`role`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_av_browser_qa_evidence_no_update`
BEFORE UPDATE ON `v7_evaluation_clean_av_browser_qa_evidence_objects`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AV_BROWSER_QA_EVIDENCE_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_av_browser_qa_evidence_no_delete`
BEFORE DELETE ON `v7_evaluation_clean_av_browser_qa_evidence_objects`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AV_BROWSER_QA_EVIDENCE_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_clean_av_browser_qa_evidence_links` (
  `id` text PRIMARY KEY NOT NULL,
  `browser_qa_receipt_id` text NOT NULL UNIQUE,
  `run_id` text NOT NULL UNIQUE,
  `materialization_receipt_id` text NOT NULL UNIQUE,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'CLEAN_AV_AUTONOMOUS_BROWSER_QA_V1'),
  `evidence_bundle_hash` text NOT NULL CHECK (length(`evidence_bundle_hash`) = 64),
  `authority_boundary` text NOT NULL CHECK (`authority_boundary` = 'INDEPENDENT_BROWSER_REVIEW_ONLY'),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`browser_qa_receipt_id`) REFERENCES `v7_evaluation_clean_av_browser_qa_receipts`(`id`),
  FOREIGN KEY (`run_id`) REFERENCES `v7_evaluation_clean_av_browser_qa_runs`(`id`),
  FOREIGN KEY (`materialization_receipt_id`) REFERENCES `v7_evaluation_clean_av_master_materialization_receipts`(`id`)
);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_av_browser_qa_evidence_link_no_update`
BEFORE UPDATE ON `v7_evaluation_clean_av_browser_qa_evidence_links`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AV_BROWSER_QA_EVIDENCE_LINK_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_clean_av_browser_qa_evidence_link_no_delete`
BEFORE DELETE ON `v7_evaluation_clean_av_browser_qa_evidence_links`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CLEAN_AV_BROWSER_QA_EVIDENCE_LINK_IMMUTABLE'); END;
--> statement-breakpoint
INSERT INTO `v7_evaluation_clean_av_browser_qa_automation_policies`
  (`id`,`channel_id`,`policy_version`,`maximum_attempts`,`minimum_playback_coverage_ratio`,`minimum_audio_rms`,`minimum_motion_samples`,`minimum_mobile_frame_samples`,`authority_boundary`)
VALUES
  ('clean-av-autonomous-browser-qa-policy:channel-hidden-systems','channel-hidden-systems','CLEAN_AV_AUTONOMOUS_BROWSER_QA_V1',3,0.98,0.002,4,4,'INDEPENDENT_BROWSER_REVIEW_ONLY');
