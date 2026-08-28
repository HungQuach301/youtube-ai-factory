CREATE TABLE `factory_assurance_current_rights_inventory_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `remediation_snapshot_id` text NOT NULL,
  `idempotency_key` text NOT NULL,
  `request_hash` text NOT NULL CHECK (length(`request_hash`) = 64),
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_ASSURANCE_CURRENT_RIGHTS_INVENTORY_V1'),
  `evaluated_at` text NOT NULL,
  `eligible_items` integer NOT NULL CHECK (`eligible_items` >= 0),
  `attached_receipt_items` integer NOT NULL CHECK (`attached_receipt_items` >= 0),
  `pending_receipt_items` integer NOT NULL CHECK (`pending_receipt_items` >= 0),
  `quarantined_items_excluded` integer NOT NULL CHECK (`quarantined_items_excluded` >= 0),
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
  FOREIGN KEY (`remediation_snapshot_id`) REFERENCES `factory_assurance_corpus_remediation_snapshots`(`id`),
  CHECK (`attached_receipt_items` + `pending_receipt_items` = `eligible_items`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_current_rights_inventory_run_idempotency_uq` ON `factory_assurance_current_rights_inventory_runs` (`remediation_snapshot_id`,`idempotency_key`);
--> statement-breakpoint
CREATE INDEX `factory_assurance_current_rights_inventory_run_scope_idx` ON `factory_assurance_current_rights_inventory_runs` (`remediation_snapshot_id`,`lifecycle_state`,`created_at`);
--> statement-breakpoint
CREATE TABLE `factory_assurance_current_rights_inventory_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL,
  `remediation_snapshot_id` text NOT NULL,
  `remediation_item_id` text NOT NULL,
  `remediation_evidence_receipt_id` text NOT NULL,
  `source_candidate_id` text NOT NULL,
  `source_artifact_id` text NOT NULL,
  `candidate_kind` text NOT NULL CHECK (`candidate_kind` IN ('AUDIO','MASTER','PACKAGING')),
  `exact_artifact_hash` text NOT NULL CHECK (length(`exact_artifact_hash`) = 64),
  `required_receipt_type` text NOT NULL CHECK (`required_receipt_type` IN ('PROVIDER_TERMS_AND_PLAN_RECEIPT','COMPOSITE_PARENT_RIGHTS_MANIFEST','AUTHORSHIP_SOURCE_RECEIPT')),
  `source_receipt_table` text CHECK (`source_receipt_table` IN ('v7_evaluation_candidate_provider_rights_receipts','v7_evaluation_composite_rights_manifests','v7_evaluation_authorship_receipts')),
  `source_receipt_id` text,
  `source_receipt_evidence_hash` text CHECK (`source_receipt_evidence_hash` IS NULL OR length(`source_receipt_evidence_hash`) = 64),
  `artifact_binding_state` text NOT NULL CHECK (`artifact_binding_state` IN ('EXACT_HASH_BOUND','MISSING_OR_MISMATCHED')),
  `validity_state` text NOT NULL CHECK (`validity_state` IN ('CURRENT','GENERATION_TIME_AND_CURRENT_PLAN_VERIFIED','NOT_APPLICABLE','MISSING_OR_INVALID')),
  `commercial_scope_state` text NOT NULL CHECK (`commercial_scope_state` IN ('VERIFIED','MISSING_OR_INVALID')),
  `coverage_state` text NOT NULL CHECK (`coverage_state` IN ('COMPLETE','MISSING_OR_INVALID')),
  `inventory_state` text NOT NULL CHECK (`inventory_state` IN ('SOURCE_RECEIPT_ATTACHED','SOURCE_RECEIPT_REQUIRED')),
  `classification_reasons_json` text NOT NULL CHECK (json_valid(`classification_reasons_json`)),
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_ASSURANCE_CURRENT_RIGHTS_INVENTORY_V1'),
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
  FOREIGN KEY (`run_id`) REFERENCES `factory_assurance_current_rights_inventory_runs`(`id`),
  FOREIGN KEY (`remediation_snapshot_id`) REFERENCES `factory_assurance_corpus_remediation_snapshots`(`id`),
  FOREIGN KEY (`remediation_item_id`) REFERENCES `factory_assurance_corpus_remediation_items`(`id`),
  FOREIGN KEY (`remediation_evidence_receipt_id`) REFERENCES `factory_assurance_corpus_remediation_evidence_receipts`(`id`),
  CHECK ((`inventory_state` = 'SOURCE_RECEIPT_ATTACHED' AND `source_receipt_table` IS NOT NULL AND `source_receipt_id` IS NOT NULL AND `source_receipt_evidence_hash` IS NOT NULL AND `artifact_binding_state` = 'EXACT_HASH_BOUND' AND `commercial_scope_state` = 'VERIFIED' AND `coverage_state` = 'COMPLETE') OR (`inventory_state` = 'SOURCE_RECEIPT_REQUIRED' AND `source_receipt_table` IS NULL AND `source_receipt_id` IS NULL AND `source_receipt_evidence_hash` IS NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_current_rights_inventory_receipt_item_uq` ON `factory_assurance_current_rights_inventory_receipts` (`run_id`,`remediation_item_id`);
--> statement-breakpoint
CREATE INDEX `factory_assurance_current_rights_inventory_receipt_queue_idx` ON `factory_assurance_current_rights_inventory_receipts` (`remediation_snapshot_id`,`inventory_state`,`required_receipt_type`,`candidate_kind`);
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_current_rights_inventory_runs_no_update` BEFORE UPDATE ON `factory_assurance_current_rights_inventory_runs` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CURRENT_RIGHTS_INVENTORY_RUNS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_current_rights_inventory_runs_no_delete` BEFORE DELETE ON `factory_assurance_current_rights_inventory_runs` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CURRENT_RIGHTS_INVENTORY_RUNS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_current_rights_inventory_receipts_no_update` BEFORE UPDATE ON `factory_assurance_current_rights_inventory_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CURRENT_RIGHTS_INVENTORY_RECEIPTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_current_rights_inventory_receipts_no_delete` BEFORE DELETE ON `factory_assurance_current_rights_inventory_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CURRENT_RIGHTS_INVENTORY_RECEIPTS_APPEND_ONLY'); END;
