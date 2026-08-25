CREATE TABLE `factory_providers` (
  `id` text PRIMARY KEY NOT NULL,
  `provider_key` text NOT NULL,
  `provider_version` text NOT NULL,
  `connection_ref` text,
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('ACTIVE','SUSPENDED','REVOKED')),
  `health_state` text NOT NULL CHECK (`health_state` IN ('HEALTHY','DEGRADED','UNAVAILABLE','UNKNOWN')),
  `metadata_json` text NOT NULL CHECK (json_valid(`metadata_json`)),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_provider_key_version_uq` ON `factory_providers` (`provider_key`,`provider_version`);
--> statement-breakpoint
CREATE TABLE `factory_capabilities` (
  `id` text PRIMARY KEY NOT NULL,
  `capability_key` text NOT NULL,
  `capability_version` text NOT NULL,
  `plane` text NOT NULL CHECK (`plane` IN ('BUSINESS_CREATIVE','CONTROL','PRODUCTION_MEDIA','EVIDENCE_ASSURANCE','LEARNING')),
  `input_schema_hash` text NOT NULL CHECK (length(`input_schema_hash`) = 64),
  `output_schema_hash` text NOT NULL CHECK (length(`output_schema_hash`) = 64),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('ACTIVE','SUPERSEDED','REVOKED')),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_capability_key_version_uq` ON `factory_capabilities` (`capability_key`,`capability_version`);
--> statement-breakpoint
CREATE TABLE `factory_provider_bindings` (
  `id` text PRIMARY KEY NOT NULL,
  `provider_id` text NOT NULL,
  `capability_id` text NOT NULL,
  `binding_version` text NOT NULL,
  `endpoint_or_model` text NOT NULL,
  `model_version` text NOT NULL,
  `input_schema_hash` text NOT NULL CHECK (length(`input_schema_hash`) = 64),
  `output_schema_hash` text NOT NULL CHECK (length(`output_schema_hash`) = 64),
  `settings_hash` text NOT NULL CHECK (length(`settings_hash`) = 64),
  `rights_policy_version` text NOT NULL,
  `retention_policy_version` text NOT NULL,
  `rate_card_version` text NOT NULL,
  `max_payload_bytes` integer NOT NULL CHECK (`max_payload_bytes` > 0),
  `timeout_ms` integer NOT NULL CHECK (`timeout_ms` BETWEEN 1000 AND 1800000),
  `retry_ceiling` integer NOT NULL CHECK (`retry_ceiling` BETWEEN 0 AND 3),
  `fallback_binding_id` text,
  `priority` integer NOT NULL DEFAULT 100 CHECK (`priority` >= 0),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('ACTIVE','SUSPENDED','REVOKED')),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`provider_id`) REFERENCES `factory_providers`(`id`),
  FOREIGN KEY (`capability_id`) REFERENCES `factory_capabilities`(`id`),
  FOREIGN KEY (`fallback_binding_id`) REFERENCES `factory_provider_bindings`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_provider_binding_version_uq` ON `factory_provider_bindings` (`provider_id`,`capability_id`,`binding_version`);
--> statement-breakpoint
CREATE INDEX `factory_provider_binding_route_idx` ON `factory_provider_bindings` (`capability_id`,`lifecycle_state`,`priority`);
--> statement-breakpoint
CREATE TABLE `factory_capability_qualifications` (
  `id` text PRIMARY KEY NOT NULL,
  `binding_id` text NOT NULL,
  `qualification_version` integer NOT NULL CHECK (`qualification_version` > 0),
  `standard_version` text NOT NULL,
  `qualified_archetypes_json` text NOT NULL CHECK (json_valid(`qualified_archetypes_json`)),
  `settings_hash` text NOT NULL CHECK (length(`settings_hash`) = 64),
  `sample_size` integer NOT NULL CHECK (`sample_size` >= 0),
  `first_pass_yield` real NOT NULL CHECK (`first_pass_yield` BETWEEN 0 AND 1),
  `p0_escape_count` integer NOT NULL CHECK (`p0_escape_count` >= 0),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('QUALIFIED','STALE','REVOKED')),
  `qualified_at` text,
  `expires_at` text,
  `revoked_at` text,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`binding_id`) REFERENCES `factory_provider_bindings`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_capability_qualification_version_uq` ON `factory_capability_qualifications` (`binding_id`,`qualification_version`);
--> statement-breakpoint
CREATE INDEX `factory_capability_qualification_route_idx` ON `factory_capability_qualifications` (`binding_id`,`lifecycle_state`,`standard_version`,`qualification_version`);
--> statement-breakpoint
CREATE TABLE `factory_rights_eligibility_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `binding_id` text NOT NULL,
  `rights_policy_version` text NOT NULL,
  `retention_policy_version` text NOT NULL,
  `commercial_use_state` text NOT NULL CHECK (`commercial_use_state` IN ('ELIGIBLE','INELIGIBLE','UNKNOWN')),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `valid_from` text NOT NULL,
  `expires_at` text,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`binding_id`) REFERENCES `factory_provider_bindings`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_rights_eligibility_binding_policy_uq` ON `factory_rights_eligibility_receipts` (`binding_id`,`rights_policy_version`,`retention_policy_version`,`evidence_hash`);
--> statement-breakpoint
CREATE TABLE `factory_cost_envelopes` (
  `id` text PRIMARY KEY NOT NULL,
  `scope_type` text NOT NULL CHECK (`scope_type` IN ('FACTORY','CHANNEL','VIDEO','STAGE','REQUEST')),
  `scope_id` text NOT NULL,
  `currency` text NOT NULL CHECK (`currency` = 'USD'),
  `max_spend_micros` integer NOT NULL CHECK (`max_spend_micros` >= 0),
  `max_provider_requests` integer NOT NULL CHECK (`max_provider_requests` >= 0),
  `policy_version` text NOT NULL,
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('ACTIVE','SUPERSEDED','REVOKED')),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_cost_envelope_scope_policy_uq` ON `factory_cost_envelopes` (`scope_type`,`scope_id`,`policy_version`);
--> statement-breakpoint
CREATE TABLE `factory_provider_work_requests` (
  `id` text PRIMARY KEY NOT NULL,
  `video_id` text NOT NULL,
  `shot_contract_id` text,
  `capability_key` text NOT NULL,
  `capability_version` text NOT NULL,
  `archetype` text NOT NULL,
  `input_hash` text NOT NULL CHECK (length(`input_hash`) = 64),
  `payload_bytes` integer NOT NULL CHECK (`payload_bytes` >= 0),
  `expected_output_schema_hash` text NOT NULL CHECK (length(`expected_output_schema_hash`) = 64),
  `required_settings_hash` text NOT NULL CHECK (length(`required_settings_hash`) = 64),
  `rights_policy_version` text NOT NULL,
  `retention_policy_version` text NOT NULL,
  `dispatch_mode` text NOT NULL CHECK (`dispatch_mode` IN ('ZERO_DISPATCH','PLAN_ONLY','DISPATCH_ALLOWED')),
  `max_provider_requests` integer NOT NULL CHECK (`max_provider_requests` >= 0),
  `max_spend_micros` integer NOT NULL CHECK (`max_spend_micros` >= 0),
  `fallback_allowed` integer NOT NULL CHECK (`fallback_allowed` IN (0,1)),
  `idempotency_key` text NOT NULL,
  `intent_hash` text NOT NULL CHECK (length(`intent_hash`) = 64),
  `created_by_command_id` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`created_by_command_id`) REFERENCES `factory_runtime_commands`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_provider_work_request_idempotency_uq` ON `factory_provider_work_requests` (`idempotency_key`);
--> statement-breakpoint
CREATE TABLE `factory_provider_route_decisions` (
  `id` text PRIMARY KEY NOT NULL,
  `work_request_id` text NOT NULL,
  `binding_id` text,
  `qualification_id` text,
  `decision` text NOT NULL CHECK (`decision` IN ('PLANNED_ZERO_DISPATCH','BLOCKED','AUTHORIZED_FOR_DISPATCH')),
  `reasons_json` text NOT NULL CHECK (json_valid(`reasons_json`)),
  `provider_requests` integer NOT NULL CHECK (`provider_requests` >= 0),
  `spend_micros` integer NOT NULL CHECK (`spend_micros` >= 0),
  `fallback_used` integer NOT NULL CHECK (`fallback_used` IN (0,1)),
  `decision_hash` text NOT NULL CHECK (length(`decision_hash`) = 64),
  `created_by_event_id` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`work_request_id`) REFERENCES `factory_provider_work_requests`(`id`),
  FOREIGN KEY (`binding_id`) REFERENCES `factory_provider_bindings`(`id`),
  FOREIGN KEY (`qualification_id`) REFERENCES `factory_capability_qualifications`(`id`),
  FOREIGN KEY (`created_by_event_id`) REFERENCES `factory_runtime_events`(`id`),
  CHECK (`decision` = 'AUTHORIZED_FOR_DISPATCH' OR (`provider_requests` = 0 AND `spend_micros` = 0)),
  CHECK (`fallback_used` = 0 OR `binding_id` IS NOT NULL)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_provider_route_decision_request_uq` ON `factory_provider_route_decisions` (`work_request_id`);
--> statement-breakpoint
CREATE TABLE `factory_production_compilation_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `video_id` text NOT NULL,
  `compiler_version` text NOT NULL,
  `visual_profile_version_id` text NOT NULL,
  `series_format_version_id` text NOT NULL,
  `canonical_timebase_id` text NOT NULL,
  `video_blueprint_id` text NOT NULL,
  `scene_graph_id` text NOT NULL,
  `shot_count` integer NOT NULL CHECK (`shot_count` > 0),
  `provider_route_decision_ids_json` text NOT NULL CHECK (json_valid(`provider_route_decision_ids_json`)),
  `input_hash` text NOT NULL CHECK (length(`input_hash`) = 64),
  `output_hash` text NOT NULL CHECK (length(`output_hash`) = 64),
  `verification_state` text NOT NULL CHECK (`verification_state` IN ('PASS','FAIL')),
  `zero_dispatch` integer NOT NULL CHECK (`zero_dispatch` = 1),
  `provider_requests` integer NOT NULL CHECK (`provider_requests` = 0),
  `spend_micros` integer NOT NULL CHECK (`spend_micros` = 0),
  `command_id` text NOT NULL,
  `event_id` text NOT NULL,
  `idempotency_key` text NOT NULL,
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`visual_profile_version_id`) REFERENCES `factory_channel_visual_profile_versions`(`id`),
  FOREIGN KEY (`series_format_version_id`) REFERENCES `factory_series_format_versions`(`id`),
  FOREIGN KEY (`canonical_timebase_id`) REFERENCES `factory_canonical_timebases`(`id`),
  FOREIGN KEY (`video_blueprint_id`) REFERENCES `factory_video_blueprints`(`id`),
  FOREIGN KEY (`scene_graph_id`) REFERENCES `factory_scene_graphs`(`id`),
  FOREIGN KEY (`command_id`) REFERENCES `factory_runtime_commands`(`id`),
  FOREIGN KEY (`event_id`) REFERENCES `factory_runtime_events`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_production_compilation_idempotency_uq` ON `factory_production_compilation_receipts` (`idempotency_key`);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_production_compilation_video_output_uq` ON `factory_production_compilation_receipts` (`video_id`,`output_hash`);
--> statement-breakpoint
CREATE TRIGGER `factory_provider_bindings_no_update` BEFORE UPDATE ON `factory_provider_bindings` BEGIN SELECT RAISE(ABORT,'FACTORY_PROVIDER_BINDINGS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_provider_bindings_no_delete` BEFORE DELETE ON `factory_provider_bindings` BEGIN SELECT RAISE(ABORT,'FACTORY_PROVIDER_BINDINGS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_capability_qualifications_no_update` BEFORE UPDATE ON `factory_capability_qualifications` BEGIN SELECT RAISE(ABORT,'FACTORY_CAPABILITY_QUALIFICATIONS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_capability_qualifications_no_delete` BEFORE DELETE ON `factory_capability_qualifications` BEGIN SELECT RAISE(ABORT,'FACTORY_CAPABILITY_QUALIFICATIONS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_provider_work_requests_no_update` BEFORE UPDATE ON `factory_provider_work_requests` BEGIN SELECT RAISE(ABORT,'FACTORY_PROVIDER_WORK_REQUESTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_provider_work_requests_no_delete` BEFORE DELETE ON `factory_provider_work_requests` BEGIN SELECT RAISE(ABORT,'FACTORY_PROVIDER_WORK_REQUESTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_provider_route_decisions_no_update` BEFORE UPDATE ON `factory_provider_route_decisions` BEGIN SELECT RAISE(ABORT,'FACTORY_PROVIDER_ROUTE_DECISIONS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_provider_route_decisions_no_delete` BEFORE DELETE ON `factory_provider_route_decisions` BEGIN SELECT RAISE(ABORT,'FACTORY_PROVIDER_ROUTE_DECISIONS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_production_compilation_receipts_no_update` BEFORE UPDATE ON `factory_production_compilation_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_PRODUCTION_COMPILATION_RECEIPTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_production_compilation_receipts_no_delete` BEFORE DELETE ON `factory_production_compilation_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_PRODUCTION_COMPILATION_RECEIPTS_APPEND_ONLY'); END;
