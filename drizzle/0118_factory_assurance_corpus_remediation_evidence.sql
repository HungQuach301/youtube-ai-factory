CREATE TABLE `factory_assurance_corpus_remediation_evidence_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `remediation_snapshot_id` text NOT NULL,
  `idempotency_key` text NOT NULL,
  `request_hash` text NOT NULL CHECK (length(`request_hash`) = 64),
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_ASSURANCE_CORPUS_REMEDIATION_EVIDENCE_V1'),
  `batch_limit` integer NOT NULL CHECK (`batch_limit` BETWEEN 1 AND 3),
  `planned_items` integer NOT NULL CHECK (`planned_items` BETWEEN 0 AND 3),
  `processed_items` integer NOT NULL CHECK (`processed_items` BETWEEN 0 AND 3),
  `byte_verified_items` integer NOT NULL CHECK (`byte_verified_items` BETWEEN 0 AND 3),
  `checksum_pass_items` integer NOT NULL CHECK (`checksum_pass_items` BETWEEN 0 AND 3),
  `provenance_pass_items` integer NOT NULL CHECK (`provenance_pass_items` BETWEEN 0 AND 3),
  `rights_pass_items` integer NOT NULL CHECK (`rights_pass_items` BETWEEN 0 AND 3),
  `exact_evidence_ready_items` integer NOT NULL CHECK (`exact_evidence_ready_items` BETWEEN 0 AND 3),
  `remaining_items` integer NOT NULL CHECK (`remaining_items` >= 0),
  `bytes_read` integer NOT NULL CHECK (`bytes_read` >= 0),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('PARTIAL_BATCH','COMPLETE')),
  `actor` text NOT NULL,
  `count_eligible` integer NOT NULL CHECK (`count_eligible` = 0),
  `qualification_authority` integer NOT NULL CHECK (`qualification_authority` = 0),
  `pass_authority` integer NOT NULL CHECK (`pass_authority` = 0),
  `provider_dispatch_authority` integer NOT NULL CHECK (`provider_dispatch_authority` = 0),
  `r22_authority` integer NOT NULL CHECK (`r22_authority` = 0),
  `master_authority` integer NOT NULL CHECK (`master_authority` = 0),
  `release_authority` integer NOT NULL CHECK (`release_authority` = 0),
  `publication_authority` integer NOT NULL CHECK (`publication_authority` = 0),
  `provider_requests` integer NOT NULL CHECK (`provider_requests` = 0),
  `spend_micros` integer NOT NULL CHECK (`spend_micros` = 0),
  `manifest_hash` text NOT NULL CHECK (length(`manifest_hash`) = 64),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`remediation_snapshot_id`) REFERENCES `factory_assurance_corpus_remediation_snapshots`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_corpus_remediation_evidence_run_idempotency_uq` ON `factory_assurance_corpus_remediation_evidence_runs` (`remediation_snapshot_id`,`idempotency_key`);
--> statement-breakpoint
CREATE INDEX `factory_assurance_corpus_remediation_evidence_run_scope_idx` ON `factory_assurance_corpus_remediation_evidence_runs` (`remediation_snapshot_id`,`lifecycle_state`,`created_at`);
--> statement-breakpoint
CREATE TABLE `factory_assurance_corpus_remediation_evidence_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL,
  `remediation_snapshot_id` text NOT NULL,
  `remediation_item_id` text NOT NULL,
  `source_candidate_id` text NOT NULL,
  `source_artifact_id` text NOT NULL,
  `storage_key` text NOT NULL,
  `mime_type` text NOT NULL,
  `declared_hash` text NOT NULL CHECK (length(`declared_hash`) = 64),
  `computed_hash` text,
  `declared_bytes` integer,
  `actual_bytes` integer NOT NULL CHECK (`actual_bytes` >= 0),
  `object_metadata_json` text NOT NULL CHECK (json_valid(`object_metadata_json`)),
  `source_provenance_json` text NOT NULL CHECK (json_valid(`source_provenance_json`)),
  `bytes_state` text NOT NULL CHECK (`bytes_state` IN ('READBACK_VERIFIED','OBJECT_MISSING','OBJECT_SIZE_LIMIT_EXCEEDED','BINDING_MISMATCH')),
  `checksum_state` text NOT NULL CHECK (`checksum_state` IN ('PASS','FAIL')),
  `provenance_state` text NOT NULL CHECK (`provenance_state` IN ('PASS','FAIL')),
  `rights_state` text NOT NULL CHECK (`rights_state` IN ('PASS','RECEIPT_REQUIRED')),
  `rights_receipt_kind` text NOT NULL,
  `rights_receipt_id` text,
  `exact_evidence_state` text NOT NULL CHECK (`exact_evidence_state` IN ('READY','BLOCKED')),
  `reconciliation_reasons_json` text NOT NULL CHECK (json_valid(`reconciliation_reasons_json`)),
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_ASSURANCE_CORPUS_REMEDIATION_EVIDENCE_V1'),
  `count_eligible` integer NOT NULL CHECK (`count_eligible` = 0),
  `qualification_authority` integer NOT NULL CHECK (`qualification_authority` = 0),
  `pass_authority` integer NOT NULL CHECK (`pass_authority` = 0),
  `provider_dispatch_authority` integer NOT NULL CHECK (`provider_dispatch_authority` = 0),
  `r22_authority` integer NOT NULL CHECK (`r22_authority` = 0),
  `master_authority` integer NOT NULL CHECK (`master_authority` = 0),
  `release_authority` integer NOT NULL CHECK (`release_authority` = 0),
  `publication_authority` integer NOT NULL CHECK (`publication_authority` = 0),
  `provider_requests` integer NOT NULL CHECK (`provider_requests` = 0),
  `spend_micros` integer NOT NULL CHECK (`spend_micros` = 0),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`run_id`) REFERENCES `factory_assurance_corpus_remediation_evidence_runs`(`id`),
  FOREIGN KEY (`remediation_snapshot_id`) REFERENCES `factory_assurance_corpus_remediation_snapshots`(`id`),
  FOREIGN KEY (`remediation_item_id`) REFERENCES `factory_assurance_corpus_remediation_items`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_corpus_remediation_evidence_receipt_item_uq` ON `factory_assurance_corpus_remediation_evidence_receipts` (`remediation_snapshot_id`,`remediation_item_id`,`policy_version`);
--> statement-breakpoint
CREATE INDEX `factory_assurance_corpus_remediation_evidence_receipt_scope_idx` ON `factory_assurance_corpus_remediation_evidence_receipts` (`remediation_snapshot_id`,`exact_evidence_state`,`rights_state`,`created_at`);
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_corpus_remediation_evidence_runs_no_update` BEFORE UPDATE ON `factory_assurance_corpus_remediation_evidence_runs` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CORPUS_REMEDIATION_EVIDENCE_RUNS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_corpus_remediation_evidence_runs_no_delete` BEFORE DELETE ON `factory_assurance_corpus_remediation_evidence_runs` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CORPUS_REMEDIATION_EVIDENCE_RUNS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_corpus_remediation_evidence_receipts_no_update` BEFORE UPDATE ON `factory_assurance_corpus_remediation_evidence_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CORPUS_REMEDIATION_EVIDENCE_RECEIPTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_corpus_remediation_evidence_receipts_no_delete` BEFORE DELETE ON `factory_assurance_corpus_remediation_evidence_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CORPUS_REMEDIATION_EVIDENCE_RECEIPTS_APPEND_ONLY'); END;
