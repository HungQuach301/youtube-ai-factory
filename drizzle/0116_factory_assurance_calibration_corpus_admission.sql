CREATE TABLE `factory_assurance_calibration_corpus_snapshots` (
  `id` text PRIMARY KEY NOT NULL,
  `snapshot_key` text NOT NULL,
  `channel_id` text NOT NULL,
  `format_key` text NOT NULL,
  `policy_version` text NOT NULL,
  `threshold_version` text NOT NULL,
  `source_snapshot_hash` text NOT NULL CHECK (length(`source_snapshot_hash`) = 64),
  `candidate_count` integer NOT NULL CHECK (`candidate_count` >= 0),
  `owner_confirmed_count` integer NOT NULL CHECK (`owner_confirmed_count` >= 0),
  `sealed_clean_count` integer NOT NULL CHECK (`sealed_clean_count` >= 0),
  `sealed_defect_count` integer NOT NULL CHECK (`sealed_defect_count` >= 0),
  `distinct_artifact_count` integer NOT NULL CHECK (`distinct_artifact_count` >= 0),
  `distinct_correlation_group_count` integer NOT NULL CHECK (`distinct_correlation_group_count` >= 0),
  `partition_counts_json` text NOT NULL CHECK (json_valid(`partition_counts_json`)),
  `layer_readiness_json` text NOT NULL CHECK (json_valid(`layer_readiness_json`)),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('ADMISSION_READY','ADMISSION_INSUFFICIENT')),
  `qualification_authority` integer NOT NULL CHECK (`qualification_authority` = 0),
  `pass_authority` integer NOT NULL CHECK (`pass_authority` = 0),
  `provider_dispatch_authority` integer NOT NULL CHECK (`provider_dispatch_authority` = 0),
  `r22_authority` integer NOT NULL CHECK (`r22_authority` = 0),
  `master_authority` integer NOT NULL CHECK (`master_authority` = 0),
  `release_authority` integer NOT NULL CHECK (`release_authority` = 0),
  `publication_authority` integer NOT NULL CHECK (`publication_authority` = 0),
  `provider_requests` integer NOT NULL CHECK (`provider_requests` = 0),
  `spend_micros` integer NOT NULL CHECK (`spend_micros` = 0),
  `snapshot_hash` text NOT NULL CHECK (length(`snapshot_hash`) = 64),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_calibration_corpus_snapshot_key_uq` ON `factory_assurance_calibration_corpus_snapshots` (`snapshot_key`);
--> statement-breakpoint
CREATE INDEX `factory_assurance_calibration_corpus_snapshot_scope_idx` ON `factory_assurance_calibration_corpus_snapshots` (`channel_id`,`format_key`,`lifecycle_state`,`created_at`);
--> statement-breakpoint
CREATE TABLE `factory_assurance_calibration_corpus_items` (
  `id` text PRIMARY KEY NOT NULL,
  `snapshot_id` text NOT NULL,
  `item_key` text NOT NULL,
  `source_family` text NOT NULL,
  `source_id` text NOT NULL,
  `source_receipt_id` text NOT NULL,
  `candidate_kind` text NOT NULL,
  `mime_type` text NOT NULL,
  `storage_key` text,
  `byte_size` integer,
  `exact_artifact_hash` text NOT NULL CHECK (length(`exact_artifact_hash`) = 64),
  `label_source` text NOT NULL CHECK (`label_source` IN ('OWNER_CONFIRMED','SEALED_CLEAN_CONTROL','SEALED_DEFECT_CONTROL')),
  `expected_outcome` text NOT NULL CHECK (`expected_outcome` IN ('PASS','FAIL','INCOMPLETE','HUMAN_ESCALATION_REQUIRED')),
  `expected_severity` text NOT NULL CHECK (`expected_severity` IN ('NONE','P0','P1','P2','P3')),
  `defect_families_json` text NOT NULL CHECK (json_valid(`defect_families_json`)),
  `applicable_layers_json` text NOT NULL CHECK (json_valid(`applicable_layers_json`)),
  `correlation_group` text NOT NULL,
  `owner_label_hash` text NOT NULL CHECK (length(`owner_label_hash`) = 64),
  `bytes_state` text NOT NULL CHECK (`bytes_state` IN ('READBACK_VERIFIED','NOT_VERIFIED')),
  `checksum_state` text NOT NULL CHECK (`checksum_state` IN ('PASS','NOT_VERIFIED')),
  `rights_state` text NOT NULL CHECK (`rights_state` IN ('PASS','NOT_REQUIRED','UNKNOWN')),
  `partition_hint` text NOT NULL CHECK (`partition_hint` IN ('REFERENCE','CALIBRATION','BLIND_QUALIFICATION','PRODUCTION_HOLDOUT','UNASSIGNED')),
  `count_eligible` integer NOT NULL CHECK (`count_eligible` IN (0,1)),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`snapshot_id`) REFERENCES `factory_assurance_calibration_corpus_snapshots`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_calibration_corpus_item_key_uq` ON `factory_assurance_calibration_corpus_items` (`snapshot_id`,`item_key`);
--> statement-breakpoint
CREATE INDEX `factory_assurance_calibration_corpus_item_layer_idx` ON `factory_assurance_calibration_corpus_items` (`snapshot_id`,`partition_hint`,`label_source`,`correlation_group`);
--> statement-breakpoint
CREATE TABLE `factory_assurance_calibration_corpus_gaps` (
  `id` text PRIMARY KEY NOT NULL,
  `snapshot_id` text NOT NULL,
  `assurance_layer` text NOT NULL CHECK (`assurance_layer` IN ('L0','L1','L2','L3','L4','L5','L6','L7')),
  `gap_key` text NOT NULL,
  `required_count` integer NOT NULL CHECK (`required_count` >= 0),
  `observed_count` integer NOT NULL CHECK (`observed_count` >= 0),
  `blocking` integer NOT NULL CHECK (`blocking` = 1),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`snapshot_id`) REFERENCES `factory_assurance_calibration_corpus_snapshots`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_calibration_corpus_gap_uq` ON `factory_assurance_calibration_corpus_gaps` (`snapshot_id`,`assurance_layer`,`gap_key`);
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_calibration_corpus_snapshots_no_update` BEFORE UPDATE ON `factory_assurance_calibration_corpus_snapshots` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CALIBRATION_CORPUS_SNAPSHOTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_calibration_corpus_snapshots_no_delete` BEFORE DELETE ON `factory_assurance_calibration_corpus_snapshots` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CALIBRATION_CORPUS_SNAPSHOTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_calibration_corpus_items_no_update` BEFORE UPDATE ON `factory_assurance_calibration_corpus_items` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CALIBRATION_CORPUS_ITEMS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_calibration_corpus_items_no_delete` BEFORE DELETE ON `factory_assurance_calibration_corpus_items` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CALIBRATION_CORPUS_ITEMS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_calibration_corpus_gaps_no_update` BEFORE UPDATE ON `factory_assurance_calibration_corpus_gaps` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CALIBRATION_CORPUS_GAPS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_calibration_corpus_gaps_no_delete` BEFORE DELETE ON `factory_assurance_calibration_corpus_gaps` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CALIBRATION_CORPUS_GAPS_APPEND_ONLY'); END;
