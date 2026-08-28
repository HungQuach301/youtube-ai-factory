CREATE TABLE `factory_assurance_current_rights_terminal_disposition_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `collection_run_id` text NOT NULL,
  `inventory_run_id` text NOT NULL,
  `remediation_snapshot_id` text NOT NULL,
  `idempotency_key` text NOT NULL,
  `request_hash` text NOT NULL CHECK (length(`request_hash`) = 64),
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_ASSURANCE_CURRENT_RIGHTS_TERMINAL_DISPOSITION_V1'),
  `scope_items` integer NOT NULL CHECK (`scope_items` >= 0),
  `provider_binding_unrecoverable_items` integer NOT NULL CHECK (`provider_binding_unrecoverable_items` >= 0),
  `lineage_unrecoverable_items` integer NOT NULL CHECK (`lineage_unrecoverable_items` >= 0),
  `quarantined_items` integer NOT NULL CHECK (`quarantined_items` = `scope_items`),
  `replacement_required_items` integer NOT NULL CHECK (`replacement_required_items` = `scope_items`),
  `remaining_receipt_collection_items` integer NOT NULL CHECK (`remaining_receipt_collection_items` = 0),
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
  FOREIGN KEY (`collection_run_id`) REFERENCES `factory_assurance_current_rights_collection_runs`(`id`),
  FOREIGN KEY (`inventory_run_id`) REFERENCES `factory_assurance_current_rights_inventory_runs`(`id`),
  FOREIGN KEY (`remediation_snapshot_id`) REFERENCES `factory_assurance_corpus_remediation_snapshots`(`id`),
  CHECK (`provider_binding_unrecoverable_items` + `lineage_unrecoverable_items` = `scope_items`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_current_rights_terminal_disposition_run_idempotency_uq` ON `factory_assurance_current_rights_terminal_disposition_runs` (`collection_run_id`,`idempotency_key`);
--> statement-breakpoint
CREATE INDEX `factory_assurance_current_rights_terminal_disposition_run_scope_idx` ON `factory_assurance_current_rights_terminal_disposition_runs` (`remediation_snapshot_id`,`lifecycle_state`,`created_at`);
--> statement-breakpoint
CREATE TABLE `factory_assurance_current_rights_terminal_disposition_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL,
  `collection_run_id` text NOT NULL,
  `collection_task_id` text NOT NULL,
  `inventory_run_id` text NOT NULL,
  `remediation_snapshot_id` text NOT NULL,
  `source_candidate_id` text NOT NULL,
  `source_artifact_id` text NOT NULL,
  `candidate_kind` text NOT NULL CHECK (`candidate_kind` IN ('AUDIO','MASTER','PACKAGING')),
  `exact_artifact_hash` text NOT NULL CHECK (length(`exact_artifact_hash`) = 64),
  `required_receipt_type` text NOT NULL CHECK (`required_receipt_type` IN ('PROVIDER_TERMS_AND_PLAN_RECEIPT','COMPOSITE_PARENT_RIGHTS_MANIFEST','AUTHORSHIP_SOURCE_RECEIPT')),
  `terminal_reason` text NOT NULL CHECK (`terminal_reason` IN ('HISTORICAL_PROVIDER_BINDING_UNRECOVERABLE','HISTORICAL_SOURCE_LINEAGE_UNRECOVERABLE')),
  `evidence_source_table` text NOT NULL CHECK (`evidence_source_table` IN ('v7_evaluation_provider_audio_hash_candidate_diagnostics','v7_evaluation_rights_lineage_diagnostics')),
  `evidence_source_id` text NOT NULL,
  `evidence_source_hash` text NOT NULL CHECK (length(`evidence_source_hash`) = 64),
  `disposition` text NOT NULL CHECK (`disposition` = 'QUARANTINED_FAILURE_EVIDENCE_ONLY'),
  `replacement_action` text NOT NULL CHECK (`replacement_action` = 'CONTROLLED_FIXTURE_REPLACEMENT_REQUIRED'),
  `rights_eligible` integer NOT NULL CHECK (`rights_eligible` = 0),
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_ASSURANCE_CURRENT_RIGHTS_TERMINAL_DISPOSITION_V1'),
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
  FOREIGN KEY (`run_id`) REFERENCES `factory_assurance_current_rights_terminal_disposition_runs`(`id`),
  FOREIGN KEY (`collection_run_id`) REFERENCES `factory_assurance_current_rights_collection_runs`(`id`),
  FOREIGN KEY (`collection_task_id`) REFERENCES `factory_assurance_current_rights_collection_tasks`(`id`),
  FOREIGN KEY (`inventory_run_id`) REFERENCES `factory_assurance_current_rights_inventory_runs`(`id`),
  FOREIGN KEY (`remediation_snapshot_id`) REFERENCES `factory_assurance_corpus_remediation_snapshots`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_current_rights_terminal_disposition_receipt_task_uq` ON `factory_assurance_current_rights_terminal_disposition_receipts` (`run_id`,`collection_task_id`);
--> statement-breakpoint
CREATE INDEX `factory_assurance_current_rights_terminal_disposition_receipt_scope_idx` ON `factory_assurance_current_rights_terminal_disposition_receipts` (`remediation_snapshot_id`,`terminal_reason`,`candidate_kind`);
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_current_rights_terminal_disposition_runs_no_update` BEFORE UPDATE ON `factory_assurance_current_rights_terminal_disposition_runs` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CURRENT_RIGHTS_TERMINAL_DISPOSITION_RUNS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_current_rights_terminal_disposition_runs_no_delete` BEFORE DELETE ON `factory_assurance_current_rights_terminal_disposition_runs` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CURRENT_RIGHTS_TERMINAL_DISPOSITION_RUNS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_current_rights_terminal_disposition_receipts_no_update` BEFORE UPDATE ON `factory_assurance_current_rights_terminal_disposition_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CURRENT_RIGHTS_TERMINAL_DISPOSITION_RECEIPTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_current_rights_terminal_disposition_receipts_no_delete` BEFORE DELETE ON `factory_assurance_current_rights_terminal_disposition_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CURRENT_RIGHTS_TERMINAL_DISPOSITION_RECEIPTS_APPEND_ONLY'); END;
