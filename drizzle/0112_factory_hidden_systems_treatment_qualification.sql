CREATE TABLE `factory_treatment_qualification_packages` (
  `id` text PRIMARY KEY NOT NULL,
  `qualification_key` text NOT NULL,
  `channel_id` text NOT NULL,
  `visual_profile_policy` text NOT NULL,
  `standard_version` text NOT NULL,
  `corpus_version` text NOT NULL,
  `corpus_hash` text NOT NULL CHECK (length(`corpus_hash`) = 64),
  `settings_hash` text NOT NULL CHECK (length(`settings_hash`) = 64),
  `encoder_build_hash` text NOT NULL CHECK (length(`encoder_build_hash`) = 64),
  `compositor_version` text NOT NULL,
  `encoder_version` text NOT NULL,
  `width` integer NOT NULL CHECK (`width` = 1920),
  `height` integer NOT NULL CHECK (`height` = 1080),
  `frame_rate_numerator` integer NOT NULL CHECK (`frame_rate_numerator` = 30),
  `frame_rate_denominator` integer NOT NULL CHECK (`frame_rate_denominator` = 1),
  `case_count` integer NOT NULL CHECK (`case_count` >= 10),
  `required_routes_json` text NOT NULL CHECK (json_valid(`required_routes_json`)),
  `required_treatments_json` text NOT NULL CHECK (json_valid(`required_treatments_json`)),
  `output_hash` text NOT NULL CHECK (length(`output_hash`) = 64),
  `readback_hash` text NOT NULL CHECK (`readback_hash` = `output_hash`),
  `deterministic_replay_hash` text NOT NULL CHECK (`deterministic_replay_hash` = `output_hash`),
  `verification_state` text NOT NULL CHECK (`verification_state` = 'PASS'),
  `authority_boundary` text NOT NULL CHECK (`authority_boundary` = 'INTERNAL_TREATMENT_QUALIFICATION_ONLY'),
  `r22_authority` integer NOT NULL CHECK (`r22_authority` = 0),
  `master_authority` integer NOT NULL CHECK (`master_authority` = 0),
  `release_authority` integer NOT NULL CHECK (`release_authority` = 0),
  `publication_authority` integer NOT NULL CHECK (`publication_authority` = 0),
  `zero_dispatch` integer NOT NULL CHECK (`zero_dispatch` = 1),
  `provider_requests` integer NOT NULL CHECK (`provider_requests` = 0),
  `spend_micros` integer NOT NULL CHECK (`spend_micros` = 0),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_treatment_qualification_key_uq` ON `factory_treatment_qualification_packages` (`qualification_key`);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_treatment_qualification_exact_settings_uq` ON `factory_treatment_qualification_packages` (`channel_id`,`visual_profile_policy`,`standard_version`,`corpus_hash`,`settings_hash`,`encoder_build_hash`);
--> statement-breakpoint
CREATE TABLE `factory_treatment_qualification_case_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `package_id` text NOT NULL,
  `case_key` text NOT NULL,
  `treatment_family` text NOT NULL,
  `route` text NOT NULL CHECK (`route` IN ('SOURCE','MAKE','HYBRID')),
  `topology_hash` text NOT NULL CHECK (length(`topology_hash`) = 64),
  `state_sample_hashes_json` text NOT NULL CHECK (json_valid(`state_sample_hashes_json`)),
  `state_count` integer NOT NULL CHECK (`state_count` >= 3),
  `minimum_font_px` integer NOT NULL CHECK (`minimum_font_px` >= 48),
  `maximum_simultaneous_labels` integer NOT NULL CHECK (`maximum_simultaneous_labels` <= 5),
  `contrast_ratio` real NOT NULL CHECK (`contrast_ratio` >= 4.5),
  `safe_margin_px` integer NOT NULL CHECK (`safe_margin_px` >= 96),
  `color_redundancy_state` text NOT NULL CHECK (`color_redundancy_state` = 'PASS'),
  `future_state_suppression_state` text NOT NULL CHECK (`future_state_suppression_state` = 'PASS'),
  `anti_slide_state` text NOT NULL CHECK (`anti_slide_state` = 'PASS'),
  `asset_preparation_state` text NOT NULL CHECK (`asset_preparation_state` IN ('PASS','NOT_APPLICABLE')),
  `dataset_hash` text,
  `parent_asset_hash` text,
  `transform_manifest_hash` text,
  `derivative_hash` text,
  `verification_state` text NOT NULL CHECK (`verification_state` = 'PASS'),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`package_id`) REFERENCES `factory_treatment_qualification_packages`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_treatment_qualification_case_uq` ON `factory_treatment_qualification_case_receipts` (`package_id`,`case_key`);
--> statement-breakpoint
CREATE TRIGGER `factory_treatment_qualification_packages_no_update` BEFORE UPDATE ON `factory_treatment_qualification_packages` BEGIN SELECT RAISE(ABORT,'FACTORY_TREATMENT_QUALIFICATION_PACKAGES_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_treatment_qualification_packages_no_delete` BEFORE DELETE ON `factory_treatment_qualification_packages` BEGIN SELECT RAISE(ABORT,'FACTORY_TREATMENT_QUALIFICATION_PACKAGES_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_treatment_qualification_case_receipts_no_update` BEFORE UPDATE ON `factory_treatment_qualification_case_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_TREATMENT_QUALIFICATION_CASE_RECEIPTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_treatment_qualification_case_receipts_no_delete` BEFORE DELETE ON `factory_treatment_qualification_case_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_TREATMENT_QUALIFICATION_CASE_RECEIPTS_APPEND_ONLY'); END;
