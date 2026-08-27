CREATE TABLE `factory_assurance_corpus_remediation_incident_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `remediation_snapshot_id` text NOT NULL,
  `idempotency_key` text NOT NULL,
  `request_hash` text NOT NULL CHECK (length(`request_hash`) = 64),
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_ASSURANCE_CORPUS_REMEDIATION_INCIDENT_V1'),
  `inspected_items` integer NOT NULL CHECK (`inspected_items` BETWEEN 1 AND 4),
  `confirmed_overwrite_items` integer NOT NULL CHECK (`confirmed_overwrite_items` BETWEEN 1 AND 4),
  `quarantined_items` integer NOT NULL CHECK (`quarantined_items` BETWEEN 1 AND 4),
  `replacement_reference_items` integer NOT NULL CHECK (`replacement_reference_items` BETWEEN 0 AND 4),
  `rights_eligible_items` integer NOT NULL CHECK (`rights_eligible_items` >= 0),
  `rights_pending_items` integer NOT NULL CHECK (`rights_pending_items` >= 0),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` = 'COMPLETE'),
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
CREATE UNIQUE INDEX `factory_assurance_corpus_remediation_incident_run_idempotency_uq` ON `factory_assurance_corpus_remediation_incident_runs` (`remediation_snapshot_id`,`idempotency_key`);
--> statement-breakpoint
CREATE TABLE `factory_assurance_corpus_remediation_incident_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL,
  `remediation_snapshot_id` text NOT NULL,
  `remediation_item_id` text NOT NULL,
  `evidence_receipt_id` text NOT NULL,
  `source_candidate_id` text NOT NULL,
  `source_artifact_id` text NOT NULL,
  `storage_key` text NOT NULL,
  `declared_hash` text NOT NULL CHECK (length(`declared_hash`) = 64),
  `observed_hash` text NOT NULL CHECK (length(`observed_hash`) = 64),
  `declared_bytes` integer NOT NULL CHECK (`declared_bytes` >= 0),
  `observed_bytes` integer NOT NULL CHECK (`observed_bytes` >= 0),
  `observed_artifact_id` text NOT NULL,
  `incident_kind` text NOT NULL CHECK (`incident_kind` = 'MUTABLE_R2_KEY_OVERWRITE'),
  `byte_recovery_state` text NOT NULL CHECK (`byte_recovery_state` = 'UNRECOVERABLE_ORIGINAL_BYTES'),
  `disposition` text NOT NULL CHECK (`disposition` = 'QUARANTINED_NOT_RIGHTS_ELIGIBLE'),
  `replacement_binding_state` text NOT NULL CHECK (`replacement_binding_state` IN ('EXISTING_EXACT_CANDIDATE_REFERENCED','NO_EXACT_REPLACEMENT_REFERENCE')),
  `replacement_candidate_id` text,
  `replacement_evidence_receipt_id` text,
  `rights_action_state` text NOT NULL CHECK (`rights_action_state` = 'NOT_APPLICABLE_QUARANTINED'),
  `classification_reasons_json` text NOT NULL CHECK (json_valid(`classification_reasons_json`)),
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_ASSURANCE_CORPUS_REMEDIATION_INCIDENT_V1'),
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
  FOREIGN KEY (`run_id`) REFERENCES `factory_assurance_corpus_remediation_incident_runs`(`id`),
  FOREIGN KEY (`remediation_snapshot_id`) REFERENCES `factory_assurance_corpus_remediation_snapshots`(`id`),
  FOREIGN KEY (`remediation_item_id`) REFERENCES `factory_assurance_corpus_remediation_items`(`id`),
  FOREIGN KEY (`evidence_receipt_id`) REFERENCES `factory_assurance_corpus_remediation_evidence_receipts`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_corpus_remediation_incident_receipt_item_uq` ON `factory_assurance_corpus_remediation_incident_receipts` (`remediation_snapshot_id`,`remediation_item_id`,`policy_version`);
--> statement-breakpoint
CREATE INDEX `factory_assurance_corpus_remediation_incident_receipt_scope_idx` ON `factory_assurance_corpus_remediation_incident_receipts` (`remediation_snapshot_id`,`disposition`,`replacement_binding_state`,`created_at`);
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_corpus_remediation_incident_runs_no_update` BEFORE UPDATE ON `factory_assurance_corpus_remediation_incident_runs` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CORPUS_REMEDIATION_INCIDENT_RUNS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_corpus_remediation_incident_runs_no_delete` BEFORE DELETE ON `factory_assurance_corpus_remediation_incident_runs` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CORPUS_REMEDIATION_INCIDENT_RUNS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_corpus_remediation_incident_receipts_no_update` BEFORE UPDATE ON `factory_assurance_corpus_remediation_incident_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CORPUS_REMEDIATION_INCIDENT_RECEIPTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_corpus_remediation_incident_receipts_no_delete` BEFORE DELETE ON `factory_assurance_corpus_remediation_incident_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CORPUS_REMEDIATION_INCIDENT_RECEIPTS_APPEND_ONLY'); END;
