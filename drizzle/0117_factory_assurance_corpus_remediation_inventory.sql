CREATE TABLE `factory_assurance_corpus_remediation_snapshots` (
  `id` text PRIMARY KEY NOT NULL,
  `snapshot_key` text NOT NULL,
  `source_corpus_snapshot_id` text NOT NULL,
  `channel_id` text NOT NULL,
  `format_key` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_ASSURANCE_CORPUS_REMEDIATION_V1'),
  `candidate_count` integer NOT NULL CHECK (`candidate_count` >= 0),
  `l1_candidate_count` integer NOT NULL CHECK (`l1_candidate_count` >= 0),
  `l4_candidate_count` integer NOT NULL CHECK (`l4_candidate_count` >= 0),
  `exact_evidence_ready_count` integer NOT NULL CHECK (`exact_evidence_ready_count` >= 0),
  `owner_label_ready_count` integer NOT NULL CHECK (`owner_label_ready_count` >= 0),
  `independent_count` integer NOT NULL CHECK (`independent_count` >= 0),
  `ready_for_corpus_review_count` integer NOT NULL CHECK (`ready_for_corpus_review_count` >= 0),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('REMEDIATION_REQUIRED','REMEDIATION_INPUTS_AVAILABLE')),
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
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`source_corpus_snapshot_id`) REFERENCES `factory_assurance_calibration_corpus_snapshots`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_corpus_remediation_snapshot_key_uq` ON `factory_assurance_corpus_remediation_snapshots` (`snapshot_key`);
--> statement-breakpoint
CREATE INDEX `factory_assurance_corpus_remediation_scope_idx` ON `factory_assurance_corpus_remediation_snapshots` (`channel_id`,`format_key`,`lifecycle_state`,`created_at`);
--> statement-breakpoint
CREATE TABLE `factory_assurance_corpus_remediation_items` (
  `id` text PRIMARY KEY NOT NULL,
  `snapshot_id` text NOT NULL,
  `work_key` text NOT NULL,
  `source_candidate_id` text NOT NULL,
  `source_family` text NOT NULL,
  `candidate_kind` text NOT NULL CHECK (`candidate_kind` IN ('AUDIO','MASTER','PACKAGING')),
  `mime_type` text NOT NULL,
  `storage_key` text,
  `byte_size` integer,
  `exact_artifact_hash` text NOT NULL CHECK (length(`exact_artifact_hash`) = 64),
  `target_layers_json` text NOT NULL CHECK (json_valid(`target_layers_json`)),
  `correlation_group` text NOT NULL,
  `source_owner_receipt_id` text,
  `source_labels_json` text NOT NULL CHECK (json_valid(`source_labels_json`)),
  `exact_evidence_state` text NOT NULL CHECK (`exact_evidence_state` IN ('READY','READBACK_REQUIRED')),
  `owner_label_state` text NOT NULL CHECK (`owner_label_state` IN ('OWNER_CONFIRMED','OWNER_LABEL_REQUIRED')),
  `correlation_state` text NOT NULL CHECK (`correlation_state` IN ('INDEPENDENT','CORRELATION_REVIEW_REQUIRED')),
  `rights_state` text NOT NULL CHECK (`rights_state` IN ('PASS','UNKNOWN')),
  `readiness_state` text NOT NULL CHECK (`readiness_state` IN ('READY_FOR_CORPUS_REVIEW','EXACT_EVIDENCE_REQUIRED','OWNER_LABEL_REQUIRED','CORRELATION_REVIEW_REQUIRED')),
  `next_action` text NOT NULL,
  `count_eligible` integer NOT NULL CHECK (`count_eligible` = 0),
  `qualification_authority` integer NOT NULL CHECK (`qualification_authority` = 0),
  `pass_authority` integer NOT NULL CHECK (`pass_authority` = 0),
  `provider_dispatch_authority` integer NOT NULL CHECK (`provider_dispatch_authority` = 0),
  `r22_authority` integer NOT NULL CHECK (`r22_authority` = 0),
  `release_authority` integer NOT NULL CHECK (`release_authority` = 0),
  `publication_authority` integer NOT NULL CHECK (`publication_authority` = 0),
  `provider_requests` integer NOT NULL CHECK (`provider_requests` = 0),
  `spend_micros` integer NOT NULL CHECK (`spend_micros` = 0),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`snapshot_id`) REFERENCES `factory_assurance_corpus_remediation_snapshots`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_corpus_remediation_item_key_uq` ON `factory_assurance_corpus_remediation_items` (`snapshot_id`,`work_key`);
--> statement-breakpoint
CREATE INDEX `factory_assurance_corpus_remediation_queue_idx` ON `factory_assurance_corpus_remediation_items` (`snapshot_id`,`readiness_state`,`candidate_kind`);
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_corpus_remediation_snapshots_no_update` BEFORE UPDATE ON `factory_assurance_corpus_remediation_snapshots` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CORPUS_REMEDIATION_SNAPSHOTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_corpus_remediation_snapshots_no_delete` BEFORE DELETE ON `factory_assurance_corpus_remediation_snapshots` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CORPUS_REMEDIATION_SNAPSHOTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_corpus_remediation_items_no_update` BEFORE UPDATE ON `factory_assurance_corpus_remediation_items` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CORPUS_REMEDIATION_ITEMS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_corpus_remediation_items_no_delete` BEFORE DELETE ON `factory_assurance_corpus_remediation_items` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CORPUS_REMEDIATION_ITEMS_APPEND_ONLY'); END;
