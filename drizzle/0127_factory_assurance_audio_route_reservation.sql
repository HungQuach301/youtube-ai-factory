CREATE TABLE `factory_assurance_audio_route_reservation_policies` (
  `id` text PRIMARY KEY NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_ASSURANCE_AUDIO_ROUTE_RESERVATION_V1'),
  `capability_key` text NOT NULL CHECK (`capability_key` = 'CONTROLLED_FIXTURE_CLEAN_AUDIO_SYNTHESIS'),
  `capability_version` text NOT NULL CHECK (`capability_version` = 'V1'),
  `dispatch_mode` text NOT NULL CHECK (`dispatch_mode` = 'PLAN_ONLY'),
  `required_route_decisions` integer NOT NULL CHECK (`required_route_decisions` = 1),
  `required_cost_reservations` integer NOT NULL CHECK (`required_cost_reservations` = 1),
  `reserved_provider_requests` integer NOT NULL CHECK (`reserved_provider_requests` = 2),
  `reserved_spend_micros` integer NOT NULL CHECK (`reserved_spend_micros` = 80000),
  `provider_generation_requests` integer NOT NULL CHECK (`provider_generation_requests` = 0),
  `provider_dispatch_authority` integer NOT NULL CHECK (`provider_dispatch_authority` = 0),
  `r22_authority` integer NOT NULL CHECK (`r22_authority` = 0),
  `release_authority` integer NOT NULL CHECK (`release_authority` = 0),
  `publication_authority` integer NOT NULL CHECK (`publication_authority` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_audio_route_reservation_policy_version_uq`
  ON `factory_assurance_audio_route_reservation_policies` (`policy_version`);
--> statement-breakpoint
CREATE TABLE `factory_assurance_audio_route_reservation_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `certification_run_id` text NOT NULL,
  `contract_id` text NOT NULL,
  `idempotency_key` text NOT NULL UNIQUE,
  `request_hash` text NOT NULL CHECK (length(`request_hash`) = 64),
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_ASSURANCE_AUDIO_ROUTE_RESERVATION_V1'),
  `plan_state` text NOT NULL CHECK (`plan_state` IN ('PLANNED','BLOCKED')),
  `blockers_json` text NOT NULL CHECK (json_valid(`blockers_json`)),
  `provider_id` text NOT NULL,
  `binding_id` text NOT NULL,
  `qualification_id` text NOT NULL,
  `rights_receipt_id` text NOT NULL,
  `drift_receipt_id` text NOT NULL,
  `cost_envelope_id` text NOT NULL,
  `work_request_id` text,
  `route_decision_id` text,
  `cost_reservation_id` text,
  `runtime_command_id` text,
  `runtime_event_id` text,
  `runtime_lease_id` text,
  `canonical_work_requests` integer NOT NULL CHECK (`canonical_work_requests` IN (0,1)),
  `canonical_route_decisions` integer NOT NULL CHECK (`canonical_route_decisions` IN (0,1)),
  `canonical_cost_reservations` integer NOT NULL CHECK (`canonical_cost_reservations` IN (0,1)),
  `reserved_provider_requests` integer NOT NULL CHECK (`reserved_provider_requests` IN (0,2)),
  `reserved_spend_micros` integer NOT NULL CHECK (`reserved_spend_micros` IN (0,80000)),
  `provider_generation_requests` integer NOT NULL CHECK (`provider_generation_requests` = 0),
  `provider_dispatch_authority` integer NOT NULL CHECK (`provider_dispatch_authority` = 0),
  `cost_reservation_authority` integer NOT NULL CHECK (`cost_reservation_authority` = 0),
  `r22_authority` integer NOT NULL CHECK (`r22_authority` = 0),
  `master_authority` integer NOT NULL CHECK (`master_authority` = 0),
  `release_authority` integer NOT NULL CHECK (`release_authority` = 0),
  `publication_authority` integer NOT NULL CHECK (`publication_authority` = 0),
  `provider_requests` integer NOT NULL CHECK (`provider_requests` = 0),
  `spend_micros` integer NOT NULL CHECK (`spend_micros` = 0),
  `evaluated_at` text NOT NULL,
  `actor` text NOT NULL,
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`certification_run_id`) REFERENCES `factory_assurance_audio_provider_certification_runs`(`id`),
  FOREIGN KEY (`contract_id`) REFERENCES `factory_assurance_controlled_fixture_audio_request_contracts`(`id`),
  FOREIGN KEY (`provider_id`) REFERENCES `factory_providers`(`id`),
  FOREIGN KEY (`binding_id`) REFERENCES `factory_provider_bindings`(`id`),
  FOREIGN KEY (`qualification_id`) REFERENCES `factory_capability_qualifications`(`id`),
  FOREIGN KEY (`rights_receipt_id`) REFERENCES `factory_rights_eligibility_receipts`(`id`),
  FOREIGN KEY (`drift_receipt_id`) REFERENCES `factory_provider_drift_receipts`(`id`),
  FOREIGN KEY (`cost_envelope_id`) REFERENCES `factory_cost_envelopes`(`id`),
  FOREIGN KEY (`work_request_id`) REFERENCES `factory_provider_work_requests`(`id`),
  FOREIGN KEY (`route_decision_id`) REFERENCES `factory_provider_route_decisions`(`id`),
  FOREIGN KEY (`cost_reservation_id`) REFERENCES `factory_provider_cost_reservations`(`id`),
  FOREIGN KEY (`runtime_command_id`) REFERENCES `factory_runtime_commands`(`id`),
  FOREIGN KEY (`runtime_event_id`) REFERENCES `factory_runtime_events`(`id`),
  FOREIGN KEY (`runtime_lease_id`) REFERENCES `factory_runtime_leases`(`id`),
  CHECK ((`plan_state`='PLANNED' AND `work_request_id` IS NOT NULL AND `route_decision_id` IS NOT NULL AND `cost_reservation_id` IS NOT NULL
    AND `runtime_command_id` IS NOT NULL AND `runtime_event_id` IS NOT NULL AND `runtime_lease_id` IS NOT NULL
    AND `canonical_work_requests`=1 AND `canonical_route_decisions`=1 AND `canonical_cost_reservations`=1
    AND `reserved_provider_requests`=2 AND `reserved_spend_micros`=80000)
    OR (`plan_state`='BLOCKED' AND `work_request_id` IS NULL AND `route_decision_id` IS NULL AND `cost_reservation_id` IS NULL
    AND `runtime_command_id` IS NULL AND `runtime_event_id` IS NULL AND `runtime_lease_id` IS NULL
    AND `canonical_work_requests`=0 AND `canonical_route_decisions`=0 AND `canonical_cost_reservations`=0
    AND `reserved_provider_requests`=0 AND `reserved_spend_micros`=0))
);
--> statement-breakpoint
CREATE INDEX `factory_assurance_audio_route_reservation_contract_idx`
  ON `factory_assurance_audio_route_reservation_runs` (`contract_id`,`evaluated_at`,`created_at`);
--> statement-breakpoint
CREATE TABLE `factory_assurance_audio_route_plan_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL UNIQUE,
  `certification_run_id` text NOT NULL,
  `contract_id` text NOT NULL,
  `cost_envelope_id` text NOT NULL,
  `work_request_id` text,
  `route_decision_id` text,
  `cost_reservation_id` text,
  `route_input_hash` text NOT NULL CHECK (length(`route_input_hash`) = 64),
  `route_decision_hash` text CHECK (`route_decision_hash` IS NULL OR length(`route_decision_hash`) = 64),
  `reservation_intent_hash` text CHECK (`reservation_intent_hash` IS NULL OR length(`reservation_intent_hash`) = 64),
  `qualification_expires_at` text NOT NULL,
  `rights_expires_at` text NOT NULL,
  `drift_state` text NOT NULL CHECK (`drift_state` IN ('CURRENT','STALE')),
  `dispatch_mode` text NOT NULL CHECK (`dispatch_mode` = 'PLAN_ONLY'),
  `fallback_allowed` integer NOT NULL CHECK (`fallback_allowed` = 0),
  `envelope_scope_type` text NOT NULL CHECK (`envelope_scope_type` = 'REQUEST'),
  `envelope_currency` text NOT NULL CHECK (`envelope_currency` = 'USD'),
  `envelope_max_provider_requests` integer NOT NULL CHECK (`envelope_max_provider_requests` = 2),
  `envelope_max_spend_micros` integer NOT NULL CHECK (`envelope_max_spend_micros` = 80000),
  `receipt_state` text NOT NULL CHECK (`receipt_state` IN ('PASS','BLOCKED')),
  `blockers_json` text NOT NULL CHECK (json_valid(`blockers_json`)),
  `provider_requests` integer NOT NULL CHECK (`provider_requests` = 0),
  `spend_micros` integer NOT NULL CHECK (`spend_micros` = 0),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`run_id`) REFERENCES `factory_assurance_audio_route_reservation_runs`(`id`),
  FOREIGN KEY (`certification_run_id`) REFERENCES `factory_assurance_audio_provider_certification_runs`(`id`),
  FOREIGN KEY (`contract_id`) REFERENCES `factory_assurance_controlled_fixture_audio_request_contracts`(`id`),
  FOREIGN KEY (`cost_envelope_id`) REFERENCES `factory_cost_envelopes`(`id`),
  FOREIGN KEY (`work_request_id`) REFERENCES `factory_provider_work_requests`(`id`),
  FOREIGN KEY (`route_decision_id`) REFERENCES `factory_provider_route_decisions`(`id`),
  FOREIGN KEY (`cost_reservation_id`) REFERENCES `factory_provider_cost_reservations`(`id`),
  CHECK ((`receipt_state`='PASS' AND `work_request_id` IS NOT NULL AND `route_decision_id` IS NOT NULL AND `cost_reservation_id` IS NOT NULL
    AND `route_decision_hash` IS NOT NULL AND `reservation_intent_hash` IS NOT NULL)
    OR (`receipt_state`='BLOCKED' AND `work_request_id` IS NULL AND `route_decision_id` IS NULL AND `cost_reservation_id` IS NULL
    AND `route_decision_hash` IS NULL AND `reservation_intent_hash` IS NULL))
);
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_audio_route_reservation_policies_no_update` BEFORE UPDATE ON `factory_assurance_audio_route_reservation_policies` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_AUDIO_ROUTE_RESERVATION_POLICIES_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_audio_route_reservation_policies_no_delete` BEFORE DELETE ON `factory_assurance_audio_route_reservation_policies` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_AUDIO_ROUTE_RESERVATION_POLICIES_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_audio_route_reservation_runs_no_update` BEFORE UPDATE ON `factory_assurance_audio_route_reservation_runs` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_AUDIO_ROUTE_RESERVATION_RUNS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_audio_route_reservation_runs_no_delete` BEFORE DELETE ON `factory_assurance_audio_route_reservation_runs` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_AUDIO_ROUTE_RESERVATION_RUNS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_audio_route_plan_receipts_no_update` BEFORE UPDATE ON `factory_assurance_audio_route_plan_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_AUDIO_ROUTE_PLAN_RECEIPTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_audio_route_plan_receipts_no_delete` BEFORE DELETE ON `factory_assurance_audio_route_plan_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_AUDIO_ROUTE_PLAN_RECEIPTS_APPEND_ONLY'); END;
--> statement-breakpoint
INSERT INTO `factory_assurance_audio_route_reservation_policies`
  (`id`,`policy_version`,`capability_key`,`capability_version`,`dispatch_mode`,`required_route_decisions`,`required_cost_reservations`,`reserved_provider_requests`,`reserved_spend_micros`,`provider_generation_requests`,`provider_dispatch_authority`,`r22_authority`,`release_authority`,`publication_authority`)
VALUES
  ('factory-assurance-audio-route-reservation-policy-v1','FACTORY_ASSURANCE_AUDIO_ROUTE_RESERVATION_V1','CONTROLLED_FIXTURE_CLEAN_AUDIO_SYNTHESIS','V1','PLAN_ONLY',1,1,2,80000,0,0,0,0,0);
