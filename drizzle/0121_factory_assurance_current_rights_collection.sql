CREATE TABLE `factory_assurance_current_rights_collection_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `inventory_run_id` text NOT NULL,
  `remediation_snapshot_id` text NOT NULL,
  `idempotency_key` text NOT NULL,
  `request_hash` text NOT NULL CHECK (length(`request_hash`) = 64),
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_ASSURANCE_CURRENT_RIGHTS_COLLECTION_V1'),
  `collection_scope_items` integer NOT NULL CHECK (`collection_scope_items` >= 0),
  `open_tasks` integer NOT NULL CHECK (`open_tasks` = `collection_scope_items`),
  `provider_terms_tasks` integer NOT NULL CHECK (`provider_terms_tasks` >= 0),
  `composite_manifest_tasks` integer NOT NULL CHECK (`composite_manifest_tasks` >= 0),
  `authorship_tasks` integer NOT NULL CHECK (`authorship_tasks` >= 0),
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
  FOREIGN KEY (`inventory_run_id`) REFERENCES `factory_assurance_current_rights_inventory_runs`(`id`),
  FOREIGN KEY (`remediation_snapshot_id`) REFERENCES `factory_assurance_corpus_remediation_snapshots`(`id`),
  CHECK (`provider_terms_tasks` + `composite_manifest_tasks` + `authorship_tasks` = `collection_scope_items`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_current_rights_collection_run_idempotency_uq` ON `factory_assurance_current_rights_collection_runs` (`inventory_run_id`,`idempotency_key`);
--> statement-breakpoint
CREATE INDEX `factory_assurance_current_rights_collection_run_scope_idx` ON `factory_assurance_current_rights_collection_runs` (`remediation_snapshot_id`,`lifecycle_state`,`created_at`);
--> statement-breakpoint
CREATE TABLE `factory_assurance_current_rights_collection_tasks` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL,
  `inventory_run_id` text NOT NULL,
  `inventory_receipt_id` text NOT NULL,
  `remediation_snapshot_id` text NOT NULL,
  `remediation_item_id` text NOT NULL,
  `source_candidate_id` text NOT NULL,
  `source_artifact_id` text NOT NULL,
  `candidate_kind` text NOT NULL CHECK (`candidate_kind` IN ('AUDIO','MASTER','PACKAGING')),
  `exact_artifact_hash` text NOT NULL CHECK (length(`exact_artifact_hash`) = 64),
  `required_receipt_type` text NOT NULL CHECK (`required_receipt_type` IN ('PROVIDER_TERMS_AND_PLAN_RECEIPT','COMPOSITE_PARENT_RIGHTS_MANIFEST','AUTHORSHIP_SOURCE_RECEIPT')),
  `collection_state` text NOT NULL CHECK (`collection_state` = 'RECEIPT_REQUIRED'),
  `requirements_json` text NOT NULL,
  `source_receipt_table` text,
  `source_receipt_id` text,
  `source_receipt_evidence_hash` text,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_ASSURANCE_CURRENT_RIGHTS_COLLECTION_V1'),
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
  FOREIGN KEY (`run_id`) REFERENCES `factory_assurance_current_rights_collection_runs`(`id`),
  FOREIGN KEY (`inventory_run_id`) REFERENCES `factory_assurance_current_rights_inventory_runs`(`id`),
  FOREIGN KEY (`inventory_receipt_id`) REFERENCES `factory_assurance_current_rights_inventory_receipts`(`id`),
  FOREIGN KEY (`remediation_snapshot_id`) REFERENCES `factory_assurance_corpus_remediation_snapshots`(`id`),
  CHECK (`source_receipt_table` IS NULL AND `source_receipt_id` IS NULL AND `source_receipt_evidence_hash` IS NULL)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_current_rights_collection_task_item_uq` ON `factory_assurance_current_rights_collection_tasks` (`run_id`,`inventory_receipt_id`);
--> statement-breakpoint
CREATE INDEX `factory_assurance_current_rights_collection_task_queue_idx` ON `factory_assurance_current_rights_collection_tasks` (`remediation_snapshot_id`,`collection_state`,`required_receipt_type`,`candidate_kind`);
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_current_rights_collection_runs_no_update` BEFORE UPDATE ON `factory_assurance_current_rights_collection_runs` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CURRENT_RIGHTS_COLLECTION_RUNS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_current_rights_collection_runs_no_delete` BEFORE DELETE ON `factory_assurance_current_rights_collection_runs` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CURRENT_RIGHTS_COLLECTION_RUNS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_current_rights_collection_tasks_no_update` BEFORE UPDATE ON `factory_assurance_current_rights_collection_tasks` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CURRENT_RIGHTS_COLLECTION_TASKS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_current_rights_collection_tasks_no_delete` BEFORE DELETE ON `factory_assurance_current_rights_collection_tasks` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CURRENT_RIGHTS_COLLECTION_TASKS_APPEND_ONLY'); END;
