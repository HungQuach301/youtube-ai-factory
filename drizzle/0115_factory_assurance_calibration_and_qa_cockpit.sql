CREATE TABLE `factory_assurance_calibration_campaigns` (
  `id` text PRIMARY KEY NOT NULL,
  `campaign_key` text NOT NULL,
  `channel_id` text NOT NULL,
  `format_key` text NOT NULL,
  `policy_version` text NOT NULL,
  `standard_version` text NOT NULL,
  `dataset_version` text NOT NULL,
  `dataset_manifest_hash` text NOT NULL CHECK (length(`dataset_manifest_hash`) = 64),
  `target_layers_json` text NOT NULL CHECK (json_valid(`target_layers_json`)),
  `correlation_policy_version` text NOT NULL,
  `automation_mode` text NOT NULL CHECK (`automation_mode` = 'AI_SHADOW'),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('MEASURED_QUALIFIED_CANDIDATE','MEASURED_ADVISORY','BLOCKED')),
  `expected_case_count` integer NOT NULL CHECK (`expected_case_count` > 0),
  `qualification_authority` integer NOT NULL CHECK (`qualification_authority` = 0),
  `pass_authority` integer NOT NULL CHECK (`pass_authority` = 0),
  `acceptance_authority` text NOT NULL CHECK (`acceptance_authority` = 'ADVISORY_ONLY'),
  `provider_dispatch_authority` integer NOT NULL CHECK (`provider_dispatch_authority` = 0),
  `r22_authority` integer NOT NULL CHECK (`r22_authority` = 0),
  `master_authority` integer NOT NULL CHECK (`master_authority` = 0),
  `release_authority` integer NOT NULL CHECK (`release_authority` = 0),
  `publication_authority` integer NOT NULL CHECK (`publication_authority` = 0),
  `campaign_hash` text NOT NULL CHECK (length(`campaign_hash`) = 64),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_calibration_campaign_key_uq` ON `factory_assurance_calibration_campaigns` (`campaign_key`);
--> statement-breakpoint
CREATE INDEX `factory_assurance_calibration_scope_idx` ON `factory_assurance_calibration_campaigns` (`channel_id`,`format_key`,`lifecycle_state`,`created_at`);
--> statement-breakpoint
CREATE TABLE `factory_assurance_calibration_cases` (
  `id` text PRIMARY KEY NOT NULL,
  `campaign_id` text NOT NULL,
  `case_key` text NOT NULL,
  `assurance_layer` text NOT NULL CHECK (`assurance_layer` IN ('L0','L1','L2','L3','L4','L5','L6','L7')),
  `exact_artifact_hash` text NOT NULL CHECK (length(`exact_artifact_hash`) = 64),
  `evidence_bundle_hash` text NOT NULL CHECK (length(`evidence_bundle_hash`) = 64),
  `label_source` text NOT NULL CHECK (`label_source` IN ('OWNER_CONFIRMED','SEALED_CLEAN_CONTROL','SEALED_DEFECT_CONTROL')),
  `expected_outcome` text NOT NULL CHECK (`expected_outcome` IN ('PASS','FAIL','INCOMPLETE','HUMAN_ESCALATION_REQUIRED')),
  `expected_severity` text NOT NULL CHECK (`expected_severity` IN ('NONE','P0','P1','P2','P3')),
  `defect_family` text NOT NULL,
  `correlation_group` text NOT NULL,
  `owner_label_hash` text NOT NULL CHECK (length(`owner_label_hash`) = 64),
  `blind_control` integer NOT NULL CHECK (`blind_control` IN (0,1)),
  `production_holdout` integer NOT NULL CHECK (`production_holdout` IN (0,1)),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`campaign_id`) REFERENCES `factory_assurance_calibration_campaigns`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_calibration_case_key_uq` ON `factory_assurance_calibration_cases` (`campaign_id`,`case_key`);
--> statement-breakpoint
CREATE INDEX `factory_assurance_calibration_case_layer_idx` ON `factory_assurance_calibration_cases` (`campaign_id`,`assurance_layer`,`correlation_group`);
--> statement-breakpoint
CREATE TABLE `factory_assurance_calibration_observations` (
  `id` text PRIMARY KEY NOT NULL,
  `campaign_id` text NOT NULL,
  `case_id` text NOT NULL,
  `observation_key` text NOT NULL,
  `assurance_layer` text NOT NULL CHECK (`assurance_layer` IN ('L0','L1','L2','L3','L4','L5','L6','L7')),
  `judge_version` text NOT NULL,
  `model_version` text NOT NULL,
  `prompt_hash` text NOT NULL CHECK (length(`prompt_hash`) = 64),
  `rubric_hash` text NOT NULL CHECK (length(`rubric_hash`) = 64),
  `schema_hash` text NOT NULL CHECK (length(`schema_hash`) = 64),
  `sampler_hash` text NOT NULL CHECK (length(`sampler_hash`) = 64),
  `repeat_index` integer NOT NULL CHECK (`repeat_index` >= 1),
  `observed_outcome` text NOT NULL CHECK (`observed_outcome` IN ('PASS','FAIL','INCOMPLETE','HUMAN_ESCALATION_REQUIRED')),
  `observed_severity` text NOT NULL CHECK (`observed_severity` IN ('NONE','P0','P1','P2','P3')),
  `evidence_timecode_valid` integer NOT NULL CHECK (`evidence_timecode_valid` IN (0,1)),
  `structured_output_valid` integer NOT NULL CHECK (`structured_output_valid` IN (0,1)),
  `confidence` real NOT NULL CHECK (`confidence` BETWEEN 0 AND 1),
  `provider_response_id` text,
  `raw_response_hash` text CHECK (`raw_response_hash` IS NULL OR length(`raw_response_hash`) = 64),
  `usage_json` text NOT NULL CHECK (json_valid(`usage_json`)),
  `actual_spend_micros` integer NOT NULL CHECK (`actual_spend_micros` >= 0),
  `observation_hash` text NOT NULL CHECK (length(`observation_hash`) = 64),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`campaign_id`) REFERENCES `factory_assurance_calibration_campaigns`(`id`),
  FOREIGN KEY (`case_id`) REFERENCES `factory_assurance_calibration_cases`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_calibration_observation_key_uq` ON `factory_assurance_calibration_observations` (`observation_key`);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_calibration_repeat_uq` ON `factory_assurance_calibration_observations` (`case_id`,`judge_version`,`model_version`,`prompt_hash`,`rubric_hash`,`schema_hash`,`sampler_hash`,`repeat_index`);
--> statement-breakpoint
CREATE TABLE `factory_assurance_calibration_results` (
  `id` text PRIMARY KEY NOT NULL,
  `campaign_id` text NOT NULL,
  `result_key` text NOT NULL,
  `assurance_layer` text NOT NULL CHECK (`assurance_layer` IN ('L0','L1','L2','L3','L4','L5','L6','L7')),
  `judge_version` text NOT NULL,
  `model_version` text NOT NULL,
  `prompt_hash` text NOT NULL CHECK (length(`prompt_hash`) = 64),
  `rubric_hash` text NOT NULL CHECK (length(`rubric_hash`) = 64),
  `schema_hash` text NOT NULL CHECK (length(`schema_hash`) = 64),
  `sampler_hash` text NOT NULL CHECK (length(`sampler_hash`) = 64),
  `sample_size` integer NOT NULL CHECK (`sample_size` > 0),
  `independent_label_count` integer NOT NULL CHECK (`independent_label_count` >= 0),
  `blind_control_count` integer NOT NULL CHECK (`blind_control_count` >= 0),
  `production_holdout_count` integer NOT NULL CHECK (`production_holdout_count` >= 0),
  `correlation_group_count` integer NOT NULL CHECK (`correlation_group_count` > 0),
  `p0_recall` real NOT NULL CHECK (`p0_recall` BETWEEN 0 AND 1),
  `p1_recall` real NOT NULL CHECK (`p1_recall` BETWEEN 0 AND 1),
  `clean_precision` real NOT NULL CHECK (`clean_precision` BETWEEN 0 AND 1),
  `critical_false_clean_count` integer NOT NULL CHECK (`critical_false_clean_count` >= 0),
  `exact_byte_repeatability` real NOT NULL CHECK (`exact_byte_repeatability` BETWEEN 0 AND 1),
  `p0_p1_decision_flip_count` integer NOT NULL CHECK (`p0_p1_decision_flip_count` >= 0),
  `evidence_timecode_validity` real NOT NULL CHECK (`evidence_timecode_validity` BETWEEN 0 AND 1),
  `structured_output_validity` real NOT NULL CHECK (`structured_output_validity` BETWEEN 0 AND 1),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('QUALIFIED_CANDIDATE','ADVISORY')),
  `threshold_version` text NOT NULL,
  `qualification_authority` integer NOT NULL CHECK (`qualification_authority` = 0),
  `pass_authority` integer NOT NULL CHECK (`pass_authority` = 0),
  `acceptance_authority` text NOT NULL CHECK (`acceptance_authority` = 'ADVISORY_ONLY'),
  `result_hash` text NOT NULL CHECK (length(`result_hash`) = 64),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`campaign_id`) REFERENCES `factory_assurance_calibration_campaigns`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_calibration_result_key_uq` ON `factory_assurance_calibration_results` (`result_key`);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_calibration_campaign_layer_uq` ON `factory_assurance_calibration_results` (`campaign_id`,`assurance_layer`);
--> statement-breakpoint
CREATE INDEX `factory_assurance_calibration_result_scope_idx` ON `factory_assurance_calibration_results` (`assurance_layer`,`lifecycle_state`,`created_at`);
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_calibration_campaigns_no_update` BEFORE UPDATE ON `factory_assurance_calibration_campaigns` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CALIBRATION_CAMPAIGNS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_calibration_campaigns_no_delete` BEFORE DELETE ON `factory_assurance_calibration_campaigns` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CALIBRATION_CAMPAIGNS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_calibration_cases_no_update` BEFORE UPDATE ON `factory_assurance_calibration_cases` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CALIBRATION_CASES_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_calibration_cases_no_delete` BEFORE DELETE ON `factory_assurance_calibration_cases` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CALIBRATION_CASES_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_calibration_observations_no_update` BEFORE UPDATE ON `factory_assurance_calibration_observations` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CALIBRATION_OBSERVATIONS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_calibration_observations_no_delete` BEFORE DELETE ON `factory_assurance_calibration_observations` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CALIBRATION_OBSERVATIONS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_calibration_results_no_update` BEFORE UPDATE ON `factory_assurance_calibration_results` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CALIBRATION_RESULTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_calibration_results_no_delete` BEFORE DELETE ON `factory_assurance_calibration_results` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CALIBRATION_RESULTS_APPEND_ONLY'); END;
