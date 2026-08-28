CREATE TABLE `factory_assurance_controlled_fixture_materialization_admission_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `replacement_plan_run_id` text NOT NULL,
  `remediation_snapshot_id` text NOT NULL,
  `idempotency_key` text NOT NULL,
  `request_hash` text NOT NULL CHECK (length(`request_hash`) = 64),
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_ASSURANCE_CONTROLLED_FIXTURE_MATERIALIZATION_ADMISSION_V1'),
  `scope_items` integer NOT NULL CHECK (`scope_items` > 0),
  `selected_batch_items` integer NOT NULL CHECK (`selected_batch_items` IN (0,1)),
  `provider_audio_pending_items` integer NOT NULL CHECK (`provider_audio_pending_items` >= 0),
  `composite_master_pending_items` integer NOT NULL CHECK (`composite_master_pending_items` >= 0),
  `authorship_pending_items` integer NOT NULL CHECK (`authorship_pending_items` >= 0),
  `dispatch_ready_items` integer NOT NULL CHECK (`dispatch_ready_items` = 0),
  `blocked_items` integer NOT NULL CHECK (`blocked_items` = `scope_items`),
  `materialized_items` integer NOT NULL CHECK (`materialized_items` = 0),
  `planned_max_provider_requests` integer NOT NULL CHECK (`planned_max_provider_requests` IN (0,2)),
  `planned_max_spend_micros` integer NOT NULL CHECK (`planned_max_spend_micros` IN (0,80000)),
  `active_provider_bindings_observed` integer NOT NULL CHECK (`active_provider_bindings_observed` >= 0),
  `current_qualified_bindings_observed` integer NOT NULL CHECK (`current_qualified_bindings_observed` >= 0),
  `current_rights_bindings_observed` integer NOT NULL CHECK (`current_rights_bindings_observed` >= 0),
  `current_drift_bindings_observed` integer NOT NULL CHECK (`current_drift_bindings_observed` >= 0),
  `active_cost_envelopes_observed` integer NOT NULL CHECK (`active_cost_envelopes_observed` >= 0),
  `admission_state` text NOT NULL CHECK (`admission_state` = 'BLOCKED'),
  `blockers_json` text NOT NULL CHECK (json_valid(`blockers_json`)),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` = 'COMPLETE'),
  `actor` text NOT NULL,
  `count_eligible` integer NOT NULL CHECK (`count_eligible` = 0),
  `qualification_authority` integer NOT NULL CHECK (`qualification_authority` = 0),
  `pass_authority` integer NOT NULL CHECK (`pass_authority` = 0),
  `provider_dispatch_authority` integer NOT NULL CHECK (`provider_dispatch_authority` = 0),
  `cost_reservation_authority` integer NOT NULL CHECK (`cost_reservation_authority` = 0),
  `r22_authority` integer NOT NULL CHECK (`r22_authority` = 0),
  `master_authority` integer NOT NULL CHECK (`master_authority` = 0),
  `release_authority` integer NOT NULL CHECK (`release_authority` = 0),
  `publication_authority` integer NOT NULL CHECK (`publication_authority` = 0),
  `provider_requests` integer NOT NULL CHECK (`provider_requests` = 0),
  `spend_micros` integer NOT NULL CHECK (`spend_micros` = 0),
  `manifest_hash` text NOT NULL CHECK (length(`manifest_hash`) = 64),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`replacement_plan_run_id`) REFERENCES `factory_assurance_controlled_fixture_replacement_plan_runs`(`id`),
  FOREIGN KEY (`remediation_snapshot_id`) REFERENCES `factory_assurance_corpus_remediation_snapshots`(`id`),
  CHECK (`provider_audio_pending_items` + `composite_master_pending_items` + `authorship_pending_items` = `scope_items`),
  CHECK (`selected_batch_items` = 0 OR (`planned_max_provider_requests` = 2 AND `planned_max_spend_micros` = 80000)),
  CHECK (`selected_batch_items` = 1 OR (`planned_max_provider_requests` = 0 AND `planned_max_spend_micros` = 0))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_controlled_fixture_materialization_admission_run_idempotency_uq` ON `factory_assurance_controlled_fixture_materialization_admission_runs` (`replacement_plan_run_id`,`idempotency_key`);
--> statement-breakpoint
CREATE INDEX `factory_assurance_controlled_fixture_materialization_admission_run_scope_idx` ON `factory_assurance_controlled_fixture_materialization_admission_runs` (`remediation_snapshot_id`,`admission_state`,`created_at`);
--> statement-breakpoint
CREATE TABLE `factory_assurance_controlled_fixture_materialization_admission_items` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL,
  `replacement_plan_run_id` text NOT NULL,
  `work_order_id` text NOT NULL,
  `remediation_snapshot_id` text NOT NULL,
  `replacement_route` text NOT NULL CHECK (`replacement_route` IN ('NEW_PROVIDER_AUDIO_WITH_NATIVE_BINDING','NEW_COMPOSITE_MASTER_WITH_EXACT_PARENT_MANIFEST','NEW_AUTHORED_FIXTURE_WITH_EXACT_SOURCE_RECEIPT')),
  `replacement_identity` text NOT NULL,
  `replacement_correlation_group` text NOT NULL,
  `historical_exact_artifact_hash` text NOT NULL CHECK (length(`historical_exact_artifact_hash`) = 64),
  `queue_position` integer NOT NULL CHECK (`queue_position` > 0),
  `admission_lane` text NOT NULL CHECK (`admission_lane` IN ('SELECTED_PROVIDER_AUDIO_BATCH','WAITING_PROVIDER_AUDIO_BATCH_SETTLEMENT','WAITING_EXACT_NEW_PARENT_SET','WAITING_OWNER_AUTHORED_SOURCE')),
  `admission_state` text NOT NULL CHECK (`admission_state` = 'BLOCKED'),
  `blockers_json` text NOT NULL CHECK (json_valid(`blockers_json`)),
  `planned_max_provider_requests` integer NOT NULL CHECK (`planned_max_provider_requests` IN (0,2)),
  `planned_max_spend_micros` integer NOT NULL CHECK (`planned_max_spend_micros` IN (0,80000)),
  `materialization_state` text NOT NULL CHECK (`materialization_state` = 'NOT_MATERIALIZED'),
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_ASSURANCE_CONTROLLED_FIXTURE_MATERIALIZATION_ADMISSION_V1'),
  `count_eligible` integer NOT NULL CHECK (`count_eligible` = 0),
  `qualification_authority` integer NOT NULL CHECK (`qualification_authority` = 0),
  `pass_authority` integer NOT NULL CHECK (`pass_authority` = 0),
  `provider_dispatch_authority` integer NOT NULL CHECK (`provider_dispatch_authority` = 0),
  `cost_reservation_authority` integer NOT NULL CHECK (`cost_reservation_authority` = 0),
  `r22_authority` integer NOT NULL CHECK (`r22_authority` = 0),
  `master_authority` integer NOT NULL CHECK (`master_authority` = 0),
  `release_authority` integer NOT NULL CHECK (`release_authority` = 0),
  `publication_authority` integer NOT NULL CHECK (`publication_authority` = 0),
  `provider_requests` integer NOT NULL CHECK (`provider_requests` = 0),
  `spend_micros` integer NOT NULL CHECK (`spend_micros` = 0),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`run_id`) REFERENCES `factory_assurance_controlled_fixture_materialization_admission_runs`(`id`),
  FOREIGN KEY (`replacement_plan_run_id`) REFERENCES `factory_assurance_controlled_fixture_replacement_plan_runs`(`id`),
  FOREIGN KEY (`work_order_id`) REFERENCES `factory_assurance_controlled_fixture_replacement_work_orders`(`id`),
  FOREIGN KEY (`remediation_snapshot_id`) REFERENCES `factory_assurance_corpus_remediation_snapshots`(`id`),
  CHECK (`admission_lane` = 'SELECTED_PROVIDER_AUDIO_BATCH' OR (`planned_max_provider_requests` = 0 AND `planned_max_spend_micros` = 0)),
  CHECK (`admission_lane` <> 'SELECTED_PROVIDER_AUDIO_BATCH' OR (`replacement_route` = 'NEW_PROVIDER_AUDIO_WITH_NATIVE_BINDING' AND `planned_max_provider_requests` = 2 AND `planned_max_spend_micros` = 80000))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_controlled_fixture_materialization_admission_item_work_order_uq` ON `factory_assurance_controlled_fixture_materialization_admission_items` (`run_id`,`work_order_id`);
--> statement-breakpoint
CREATE INDEX `factory_assurance_controlled_fixture_materialization_admission_item_queue_idx` ON `factory_assurance_controlled_fixture_materialization_admission_items` (`remediation_snapshot_id`,`admission_lane`,`queue_position`);
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_controlled_fixture_materialization_admission_runs_no_update` BEFORE UPDATE ON `factory_assurance_controlled_fixture_materialization_admission_runs` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CONTROLLED_FIXTURE_MATERIALIZATION_ADMISSION_RUNS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_controlled_fixture_materialization_admission_runs_no_delete` BEFORE DELETE ON `factory_assurance_controlled_fixture_materialization_admission_runs` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CONTROLLED_FIXTURE_MATERIALIZATION_ADMISSION_RUNS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_controlled_fixture_materialization_admission_items_no_update` BEFORE UPDATE ON `factory_assurance_controlled_fixture_materialization_admission_items` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CONTROLLED_FIXTURE_MATERIALIZATION_ADMISSION_ITEMS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_controlled_fixture_materialization_admission_items_no_delete` BEFORE DELETE ON `factory_assurance_controlled_fixture_materialization_admission_items` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_CONTROLLED_FIXTURE_MATERIALIZATION_ADMISSION_ITEMS_APPEND_ONLY'); END;
