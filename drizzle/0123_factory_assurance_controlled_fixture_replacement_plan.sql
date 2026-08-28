CREATE TABLE `factory_assurance_controlled_fixture_replacement_plan_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `terminal_run_id` text NOT NULL,
  `remediation_snapshot_id` text NOT NULL,
  `idempotency_key` text NOT NULL,
  `request_hash` text NOT NULL CHECK (length(`request_hash`) = 64),
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_ASSURANCE_CONTROLLED_FIXTURE_REPLACEMENT_PLAN_V1'),
  `scope_items` integer NOT NULL CHECK (`scope_items` > 0),
  `planned_work_orders` integer NOT NULL CHECK (`planned_work_orders` = `scope_items`),
  `provider_audio_orders` integer NOT NULL CHECK (`provider_audio_orders` >= 0),
  `composite_master_orders` integer NOT NULL CHECK (`composite_master_orders` >= 0),
  `authorship_orders` integer NOT NULL CHECK (`authorship_orders` >= 0),
  `materialized_items` integer NOT NULL CHECK (`materialized_items` = 0),
  `pending_materialization_items` integer NOT NULL CHECK (`pending_materialization_items` = `scope_items`),
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
  FOREIGN KEY (`terminal_run_id`) REFERENCES `factory_assurance_current_rights_terminal_disposition_runs`(`id`),
  FOREIGN KEY (`remediation_snapshot_id`) REFERENCES `factory_assurance_corpus_remediation_snapshots`(`id`),
  CHECK (`provider_audio_orders` + `composite_master_orders` + `authorship_orders` = `scope_items`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_controlled_fixture_replacement_plan_run_idempotency_uq` ON `factory_assurance_controlled_fixture_replacement_plan_runs` (`terminal_run_id`,`idempotency_key`);
--> statement-breakpoint
CREATE INDEX `factory_assurance_controlled_fixture_replacement_plan_run_scope_idx` ON `factory_assurance_controlled_fixture_replacement_plan_runs` (`remediation_snapshot_id`,`lifecycle_state`,`created_at`);
--> statement-breakpoint
CREATE TABLE `factory_assurance_controlled_fixture_replacement_work_orders` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL,
  `terminal_run_id` text NOT NULL,
  `terminal_receipt_id` text NOT NULL,
  `remediation_snapshot_id` text NOT NULL,
  `source_candidate_id` text NOT NULL,
  `source_artifact_id` text NOT NULL,
  `candidate_kind` text NOT NULL CHECK (`candidate_kind` IN ('AUDIO','MASTER','PACKAGING')),
  `historical_exact_artifact_hash` text NOT NULL CHECK (length(`historical_exact_artifact_hash`) = 64),
  `terminal_reason` text NOT NULL CHECK (`terminal_reason` IN ('HISTORICAL_PROVIDER_BINDING_UNRECOVERABLE','HISTORICAL_SOURCE_LINEAGE_UNRECOVERABLE')),
  `required_receipt_type` text NOT NULL CHECK (`required_receipt_type` IN ('PROVIDER_TERMS_AND_PLAN_RECEIPT','COMPOSITE_PARENT_RIGHTS_MANIFEST','AUTHORSHIP_SOURCE_RECEIPT')),
  `replacement_route` text NOT NULL CHECK (`replacement_route` IN ('NEW_PROVIDER_AUDIO_WITH_NATIVE_BINDING','NEW_COMPOSITE_MASTER_WITH_EXACT_PARENT_MANIFEST','NEW_AUTHORED_FIXTURE_WITH_EXACT_SOURCE_RECEIPT')),
  `replacement_identity` text NOT NULL,
  `replacement_correlation_group` text NOT NULL,
  `generation_contract_json` text NOT NULL CHECK (json_valid(`generation_contract_json`)),
  `rights_lineage_contract_json` text NOT NULL CHECK (json_valid(`rights_lineage_contract_json`)),
  `independence_contract_json` text NOT NULL CHECK (json_valid(`independence_contract_json`)),
  `work_order_state` text NOT NULL CHECK (`work_order_state` = 'PLANNED_ZERO_DISPATCH'),
  `materialization_state` text NOT NULL CHECK (`materialization_state` = 'NOT_MATERIALIZED'),
  `source_disposition` text NOT NULL CHECK (`source_disposition` = 'QUARANTINED_FAILURE_EVIDENCE_ONLY'),
  `source_rights_eligible` integer NOT NULL CHECK (`source_rights_eligible` = 0),
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_ASSURANCE_CONTROLLED_FIXTURE_REPLACEMENT_PLAN_V1'),
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
  FOREIGN KEY (`run_id`) REFERENCES `factory_assurance_controlled_fixture_replacement_plan_runs`(`id`),
  FOREIGN KEY (`terminal_run_id`) REFERENCES `factory_assurance_current_rights_terminal_disposition_runs`(`id`),
  FOREIGN KEY (`terminal_receipt_id`) REFERENCES `factory_assurance_current_rights_terminal_disposition_receipts`(`id`),
  FOREIGN KEY (`remediation_snapshot_id`) REFERENCES `factory_assurance_corpus_remediation_snapshots`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_controlled_fixture_replacement_work_order_receipt_uq` ON `factory_assurance_controlled_fixture_replacement_work_orders` (`run_id`,`terminal_receipt_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_controlled_fixture_replacement_work_order_identity_uq` ON `factory_assurance_controlled_fixture_replacement_work_orders` (`replacement_identity`);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_controlled_fixture_replacement_work_order_correlation_uq` ON `factory_assurance_controlled_fixture_replacement_work_orders` (`replacement_correlation_group`);
--> statement-breakpoint
CREATE INDEX `factory_assurance_controlled_fixture_replacement_work_order_queue_idx` ON `factory_assurance_controlled_fixture_replacement_work_orders` (`remediation_snapshot_id`,`replacement_route`,`materialization_state`);
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_controlled_fixture_replacement_plan_runs_no_update` BEFORE UPDATE ON `factory_assurance_controlled_fixture_replacement_plan_runs` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CONTROLLED_FIXTURE_REPLACEMENT_PLAN_RUNS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_controlled_fixture_replacement_plan_runs_no_delete` BEFORE DELETE ON `factory_assurance_controlled_fixture_replacement_plan_runs` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CONTROLLED_FIXTURE_REPLACEMENT_PLAN_RUNS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_controlled_fixture_replacement_work_orders_no_update` BEFORE UPDATE ON `factory_assurance_controlled_fixture_replacement_work_orders` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CONTROLLED_FIXTURE_REPLACEMENT_WORK_ORDERS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_controlled_fixture_replacement_work_orders_no_delete` BEFORE DELETE ON `factory_assurance_controlled_fixture_replacement_work_orders` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CONTROLLED_FIXTURE_REPLACEMENT_WORK_ORDERS_APPEND_ONLY'); END;
