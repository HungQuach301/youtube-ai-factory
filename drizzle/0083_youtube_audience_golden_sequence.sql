CREATE TABLE `v7_youtube_audience_master_policies` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'YOUTUBE_AUDIENCE_MASTER_STANDARD_V1'),
  `overall_floor` integer NOT NULL CHECK (`overall_floor` = 92),
  `critical_dimension_floor` integer NOT NULL CHECK (`critical_dimension_floor` = 90),
  `maximum_p0` integer NOT NULL CHECK (`maximum_p0` = 0),
  `maximum_p1` integer NOT NULL CHECK (`maximum_p1` = 0),
  `maximum_p2` integer NOT NULL CHECK (`maximum_p2` = 2),
  `minimum_duration_seconds` integer NOT NULL CHECK (`minimum_duration_seconds` = 60),
  `maximum_duration_seconds` integer NOT NULL CHECK (`maximum_duration_seconds` = 90),
  `minimum_semantic_runtime_ratio` real NOT NULL CHECK (`minimum_semantic_runtime_ratio` = 0.95),
  `maximum_slideshow_runtime_ratio` real NOT NULL CHECK (`maximum_slideshow_runtime_ratio` = 0.15),
  `minimum_meaningful_motion_ratio` real NOT NULL CHECK (`minimum_meaningful_motion_ratio` = 0.70),
  `minimum_first_30_motion_ratio` real NOT NULL CHECK (`minimum_first_30_motion_ratio` = 0.85),
  `maximum_camera_only_ratio` real NOT NULL CHECK (`maximum_camera_only_ratio` = 0.20),
  `minimum_treatment_families` integer NOT NULL CHECK (`minimum_treatment_families` = 3),
  `minimum_critical_font_px_1080` integer NOT NULL CHECK (`minimum_critical_font_px_1080` = 38),
  `maximum_visual_event_interval_seconds` real NOT NULL CHECK (`maximum_visual_event_interval_seconds` = 5),
  `maximum_static_hold_seconds` real NOT NULL CHECK (`maximum_static_hold_seconds` = 3.5),
  `factory_visual_requests_max` integer NOT NULL CHECK (`factory_visual_requests_max` = 1),
  `factory_audio_requests_max` integer NOT NULL CHECK (`factory_audio_requests_max` = 1),
  `tts_requests_max` integer NOT NULL CHECK (`tts_requests_max` = 1),
  `reserved_spend_ceiling_usd` real NOT NULL CHECK (`reserved_spend_ceiling_usd` = 2.20),
  `auto_publish` integer NOT NULL DEFAULT 0 CHECK (`auto_publish` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_youtube_audience_master_policy_channel_uq` ON `v7_youtube_audience_master_policies` (`channel_id`,`policy_version`);
--> statement-breakpoint
CREATE TRIGGER `v7_youtube_audience_master_policy_no_update` BEFORE UPDATE ON `v7_youtube_audience_master_policies` BEGIN SELECT RAISE(ABORT, 'YOUTUBE_AUDIENCE_MASTER_POLICY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_youtube_audience_master_policy_no_delete` BEFORE DELETE ON `v7_youtube_audience_master_policies` BEGIN SELECT RAISE(ABORT, 'YOUTUBE_AUDIENCE_MASTER_POLICY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_youtube_audience_master_dispositions` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL,
  `master_hash` text NOT NULL CHECK (length(`master_hash`) = 64),
  `decision_state` text NOT NULL CHECK (`decision_state` = 'DEFECT_REJECTED'),
  `defects_json` text NOT NULL CHECK (json_valid(`defects_json`)),
  `owner_full_playback_attested` integer NOT NULL CHECK (`owner_full_playback_attested` = 0),
  `authority_boundary` text NOT NULL CHECK (`authority_boundary` = 'OWNER_OBSERVATION_REJECTION_ONLY'),
  `actor` text NOT NULL,
  `idempotency_key` text NOT NULL UNIQUE,
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_youtube_audience_master_disposition_hash_uq` ON `v7_youtube_audience_master_dispositions` (`master_hash`);
--> statement-breakpoint
CREATE TRIGGER `v7_youtube_audience_master_disposition_no_update` BEFORE UPDATE ON `v7_youtube_audience_master_dispositions` BEGIN SELECT RAISE(ABORT, 'YOUTUBE_AUDIENCE_MASTER_DISPOSITION_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_youtube_audience_master_disposition_no_delete` BEFORE DELETE ON `v7_youtube_audience_master_dispositions` BEGIN SELECT RAISE(ABORT, 'YOUTUBE_AUDIENCE_MASTER_DISPOSITION_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_youtube_golden_sequence_blueprints` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL,
  `blueprint_version` text NOT NULL CHECK (`blueprint_version` = 'AUDIENCE_GOLDEN_BLUEPRINT_V1'),
  `episode_key` text NOT NULL,
  `title_promise` text NOT NULL,
  `narration_text` text NOT NULL,
  `narration_hash` text NOT NULL CHECK (length(`narration_hash`) = 64),
  `story_contract_json` text NOT NULL CHECK (json_valid(`story_contract_json`)),
  `visual_contract_json` text NOT NULL CHECK (json_valid(`visual_contract_json`)),
  `audio_contract_json` text NOT NULL CHECK (json_valid(`audio_contract_json`)),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` = 'SEALED'),
  `actor` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_youtube_golden_sequence_blueprint_channel_uq` ON `v7_youtube_golden_sequence_blueprints` (`channel_id`,`blueprint_version`);
--> statement-breakpoint
CREATE TRIGGER `v7_youtube_golden_sequence_blueprint_no_update` BEFORE UPDATE ON `v7_youtube_golden_sequence_blueprints` BEGIN SELECT RAISE(ABORT, 'YOUTUBE_GOLDEN_BLUEPRINT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_youtube_golden_sequence_blueprint_no_delete` BEFORE DELETE ON `v7_youtube_golden_sequence_blueprints` BEGIN SELECT RAISE(ABORT, 'YOUTUBE_GOLDEN_BLUEPRINT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_youtube_golden_audio_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `blueprint_id` text NOT NULL,
  `policy_version` text NOT NULL,
  `idempotency_key` text NOT NULL UNIQUE,
  `intent_hash` text NOT NULL CHECK (length(`intent_hash`) = 64),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('PLANNED','RUNNING','COMPLETE','FAILED')),
  `subscription_reads` integer NOT NULL DEFAULT 0 CHECK (`subscription_reads` BETWEEN 0 AND 1),
  `tts_requests` integer NOT NULL DEFAULT 0 CHECK (`tts_requests` BETWEEN 0 AND 1),
  `reserved_spend_usd` real NOT NULL CHECK (`reserved_spend_usd` = 0.20),
  `error_code` text,
  `actor` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` text,
  FOREIGN KEY (`blueprint_id`) REFERENCES `v7_youtube_golden_sequence_blueprints`(`id`)
);
--> statement-breakpoint
CREATE TABLE `v7_youtube_golden_audio_artifacts` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL UNIQUE,
  `channel_id` text NOT NULL,
  `blueprint_id` text NOT NULL UNIQUE,
  `provider_family` text NOT NULL CHECK (`provider_family` = 'ELEVENLABS'),
  `provider_native_request_id` text NOT NULL UNIQUE,
  `voice_id` text NOT NULL,
  `model_id` text NOT NULL,
  `subscription_tier` text NOT NULL,
  `subscription_status` text NOT NULL CHECK (`subscription_status` = 'active'),
  `subscription_response_hash` text NOT NULL CHECK (length(`subscription_response_hash`) = 64),
  `subscription_storage_key` text NOT NULL UNIQUE,
  `subscription_readback_hash` text NOT NULL CHECK (`subscription_readback_hash` = `subscription_response_hash`),
  `storage_key` text NOT NULL UNIQUE,
  `mime_type` text NOT NULL CHECK (`mime_type` = 'audio/mpeg'),
  `byte_size` integer NOT NULL CHECK (`byte_size` > 10000),
  `sha256` text NOT NULL CHECK (length(`sha256`) = 64),
  `readback_sha256` text NOT NULL CHECK (`readback_sha256` = `sha256`),
  `rights_state` text NOT NULL CHECK (`rights_state` = 'PASS'),
  `narration_hash` text NOT NULL CHECK (length(`narration_hash`) = 64),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `authority_boundary` text NOT NULL CHECK (`authority_boundary` = 'GOLDEN_AUDIO_SOURCE_ONLY'),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`run_id`) REFERENCES `v7_youtube_golden_audio_runs`(`id`),
  FOREIGN KEY (`blueprint_id`) REFERENCES `v7_youtube_golden_sequence_blueprints`(`id`)
);
--> statement-breakpoint
CREATE TRIGGER `v7_youtube_golden_audio_artifact_no_update` BEFORE UPDATE ON `v7_youtube_golden_audio_artifacts` BEGIN SELECT RAISE(ABORT, 'YOUTUBE_GOLDEN_AUDIO_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_youtube_golden_audio_artifact_no_delete` BEFORE DELETE ON `v7_youtube_golden_audio_artifacts` BEGIN SELECT RAISE(ABORT, 'YOUTUBE_GOLDEN_AUDIO_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_youtube_golden_upload_chunks` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `blueprint_id` text NOT NULL,
  `role` text NOT NULL CHECK (`role` IN ('MASTER','AUDIENCE_MIX','ATLAS_1','ATLAS_2','ATLAS_3','ATLAS_4')),
  `full_hash` text NOT NULL CHECK (length(`full_hash`) = 64),
  `total_bytes` integer NOT NULL CHECK (`total_bytes` > 1000),
  `chunk_index` integer NOT NULL CHECK (`chunk_index` >= 0),
  `chunk_count` integer NOT NULL CHECK (`chunk_count` BETWEEN 1 AND 128),
  `chunk_hash` text NOT NULL CHECK (length(`chunk_hash`) = 64),
  `chunk_bytes` integer NOT NULL CHECK (`chunk_bytes` BETWEEN 1 AND 400000),
  `storage_key` text NOT NULL UNIQUE,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_youtube_golden_upload_chunk_uq` ON `v7_youtube_golden_upload_chunks` (`blueprint_id`,`role`,`full_hash`,`chunk_index`);
--> statement-breakpoint
CREATE TABLE `v7_youtube_golden_materialization_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `blueprint_id` text NOT NULL UNIQUE,
  `audio_artifact_id` text NOT NULL UNIQUE,
  `policy_version` text NOT NULL,
  `master_storage_key` text NOT NULL UNIQUE,
  `master_hash` text NOT NULL UNIQUE CHECK (length(`master_hash`) = 64),
  `master_bytes` integer NOT NULL CHECK (`master_bytes` > 100000),
  `master_readback_hash` text NOT NULL CHECK (`master_readback_hash` = `master_hash`),
  `audience_mix_storage_key` text NOT NULL UNIQUE,
  `audience_mix_hash` text NOT NULL CHECK (length(`audience_mix_hash`) = 64),
  `audience_mix_bytes` integer NOT NULL CHECK (`audience_mix_bytes` > 10000),
  `audience_mix_readback_hash` text NOT NULL CHECK (`audience_mix_readback_hash` = `audience_mix_hash`),
  `atlas_manifest_json` text NOT NULL CHECK (json_valid(`atlas_manifest_json`)),
  `technical_evidence_json` text NOT NULL CHECK (json_valid(`technical_evidence_json`)),
  `visual_manifest_json` text NOT NULL CHECK (json_valid(`visual_manifest_json`)),
  `duration_seconds` real NOT NULL CHECK (`duration_seconds` BETWEEN 60 AND 90),
  `width` integer NOT NULL CHECK (`width` = 2560),
  `height` integer NOT NULL CHECK (`height` = 1440),
  `frame_rate` real NOT NULL CHECK (`frame_rate` = 30),
  `video_codec` text NOT NULL CHECK (`video_codec` = 'h264'),
  `audio_codec` text NOT NULL CHECK (`audio_codec` = 'aac'),
  `audio_sample_rate_hz` integer NOT NULL CHECK (`audio_sample_rate_hz` = 48000),
  `deterministic_state` text NOT NULL CHECK (`deterministic_state` = 'PASS'),
  `rights_state` text NOT NULL CHECK (`rights_state` = 'PASS'),
  `actor` text NOT NULL,
  `idempotency_key` text NOT NULL UNIQUE,
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `authority_boundary` text NOT NULL CHECK (`authority_boundary` = 'AUDIENCE_GOLDEN_TECHNICAL_ONLY'),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`blueprint_id`) REFERENCES `v7_youtube_golden_sequence_blueprints`(`id`),
  FOREIGN KEY (`audio_artifact_id`) REFERENCES `v7_youtube_golden_audio_artifacts`(`id`)
);
--> statement-breakpoint
CREATE TRIGGER `v7_youtube_golden_materialization_no_update` BEFORE UPDATE ON `v7_youtube_golden_materialization_receipts` BEGIN SELECT RAISE(ABORT, 'YOUTUBE_GOLDEN_MATERIALIZATION_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_youtube_golden_materialization_no_delete` BEFORE DELETE ON `v7_youtube_golden_materialization_receipts` BEGIN SELECT RAISE(ABORT, 'YOUTUBE_GOLDEN_MATERIALIZATION_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_youtube_golden_qa_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `materialization_receipt_id` text NOT NULL,
  `policy_version` text NOT NULL,
  `qa_layer` text NOT NULL CHECK (`qa_layer` IN ('FACTORY_VISUAL','FACTORY_AUDIO','BROWSER_DEVICE')),
  `decision_state` text NOT NULL CHECK (`decision_state` IN ('PASS','FAIL')),
  `overall_score` integer NOT NULL CHECK (`overall_score` BETWEEN 0 AND 100),
  `dimensions_json` text NOT NULL CHECK (json_valid(`dimensions_json`)),
  `p0_count` integer NOT NULL CHECK (`p0_count` >= 0),
  `p1_count` integer NOT NULL CHECK (`p1_count` >= 0),
  `p2_count` integer NOT NULL CHECK (`p2_count` >= 0),
  `findings_json` text NOT NULL CHECK (json_valid(`findings_json`)),
  `evidence_json` text NOT NULL CHECK (json_valid(`evidence_json`)),
  `provider_response_id` text,
  `provider_response_storage_key` text,
  `provider_response_hash` text,
  `actual_spend_usd` real NOT NULL DEFAULT 0 CHECK (`actual_spend_usd` BETWEEN 0 AND 1.50),
  `actor` text NOT NULL,
  `idempotency_key` text NOT NULL UNIQUE,
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `authority_boundary` text NOT NULL CHECK (`authority_boundary` IN ('INDEPENDENT_FACTORY_REVIEW_ONLY','INDEPENDENT_BROWSER_REVIEW_ONLY')),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`materialization_receipt_id`) REFERENCES `v7_youtube_golden_materialization_receipts`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_youtube_golden_qa_layer_uq` ON `v7_youtube_golden_qa_receipts` (`materialization_receipt_id`,`qa_layer`);
--> statement-breakpoint
CREATE TRIGGER `v7_youtube_golden_qa_no_update` BEFORE UPDATE ON `v7_youtube_golden_qa_receipts` BEGIN SELECT RAISE(ABORT, 'YOUTUBE_GOLDEN_QA_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_youtube_golden_qa_no_delete` BEFORE DELETE ON `v7_youtube_golden_qa_receipts` BEGIN SELECT RAISE(ABORT, 'YOUTUBE_GOLDEN_QA_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_youtube_golden_owner_tasks` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `materialization_receipt_id` text NOT NULL UNIQUE,
  `policy_version` text NOT NULL,
  `task_state` text NOT NULL CHECK (`task_state` IN ('LOCKED','REVIEW_REQUIRED','COMPLETE')),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`materialization_receipt_id`) REFERENCES `v7_youtube_golden_materialization_receipts`(`id`)
);
--> statement-breakpoint
CREATE TABLE `v7_youtube_golden_owner_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `task_id` text NOT NULL UNIQUE,
  `materialization_receipt_id` text NOT NULL UNIQUE,
  `policy_version` text NOT NULL,
  `decision_state` text NOT NULL CHECK (`decision_state` IN ('CLEAN_CONFIRMED','DEFECT_REJECTED')),
  `full_playback_attested` integer NOT NULL CHECK (`full_playback_attested` = 1),
  `defects_json` text NOT NULL CHECK (json_valid(`defects_json`)),
  `rationale` text NOT NULL,
  `actor` text NOT NULL,
  `idempotency_key` text NOT NULL UNIQUE,
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `authority_boundary` text NOT NULL CHECK (`authority_boundary` = 'OWNER_GROUND_TRUTH_ONLY'),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`task_id`) REFERENCES `v7_youtube_golden_owner_tasks`(`id`),
  FOREIGN KEY (`materialization_receipt_id`) REFERENCES `v7_youtube_golden_materialization_receipts`(`id`)
);
--> statement-breakpoint
CREATE TRIGGER `v7_youtube_golden_owner_receipt_no_update` BEFORE UPDATE ON `v7_youtube_golden_owner_receipts` BEGIN SELECT RAISE(ABORT, 'YOUTUBE_GOLDEN_OWNER_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_youtube_golden_owner_receipt_no_delete` BEFORE DELETE ON `v7_youtube_golden_owner_receipts` BEGIN SELECT RAISE(ABORT, 'YOUTUBE_GOLDEN_OWNER_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_youtube_golden_freeze_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `materialization_receipt_id` text NOT NULL UNIQUE,
  `owner_receipt_id` text NOT NULL UNIQUE,
  `policy_version` text NOT NULL,
  `decision_state` text NOT NULL CHECK (`decision_state` = 'FROZEN_AUDIENCE_GOLDEN'),
  `overall_score` integer NOT NULL CHECK (`overall_score` >= 92),
  `p0_count` integer NOT NULL CHECK (`p0_count` = 0),
  `p1_count` integer NOT NULL CHECK (`p1_count` = 0),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `actor` text NOT NULL,
  `authority_boundary` text NOT NULL CHECK (`authority_boundary` = 'GOLDEN_SEQUENCE_FREEZE_ONLY'),
  `full_video_release_authority` integer NOT NULL DEFAULT 0 CHECK (`full_video_release_authority` = 0),
  `publication_authority` integer NOT NULL DEFAULT 0 CHECK (`publication_authority` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`materialization_receipt_id`) REFERENCES `v7_youtube_golden_materialization_receipts`(`id`),
  FOREIGN KEY (`owner_receipt_id`) REFERENCES `v7_youtube_golden_owner_receipts`(`id`)
);
--> statement-breakpoint
CREATE TRIGGER `v7_youtube_golden_freeze_no_update` BEFORE UPDATE ON `v7_youtube_golden_freeze_receipts` BEGIN SELECT RAISE(ABORT, 'YOUTUBE_GOLDEN_FREEZE_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_youtube_golden_freeze_no_delete` BEFORE DELETE ON `v7_youtube_golden_freeze_receipts` BEGIN SELECT RAISE(ABORT, 'YOUTUBE_GOLDEN_FREEZE_IMMUTABLE'); END;
--> statement-breakpoint
INSERT INTO `v7_youtube_audience_master_policies`
  (`id`,`channel_id`,`policy_version`,`overall_floor`,`critical_dimension_floor`,`maximum_p0`,`maximum_p1`,`maximum_p2`,`minimum_duration_seconds`,`maximum_duration_seconds`,`minimum_semantic_runtime_ratio`,`maximum_slideshow_runtime_ratio`,`minimum_meaningful_motion_ratio`,`minimum_first_30_motion_ratio`,`maximum_camera_only_ratio`,`minimum_treatment_families`,`minimum_critical_font_px_1080`,`maximum_visual_event_interval_seconds`,`maximum_static_hold_seconds`,`factory_visual_requests_max`,`factory_audio_requests_max`,`tts_requests_max`,`reserved_spend_ceiling_usd`)
VALUES ('youtube-audience-master-policy:channel-hidden-systems:v1','channel-hidden-systems','YOUTUBE_AUDIENCE_MASTER_STANDARD_V1',92,90,0,0,2,60,90,0.95,0.15,0.70,0.85,0.20,3,38,5,3.5,1,1,1,2.20);
