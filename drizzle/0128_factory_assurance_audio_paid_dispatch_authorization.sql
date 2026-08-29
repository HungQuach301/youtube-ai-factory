CREATE TABLE `factory_assurance_audio_paid_dispatch_authorization_policies` (
  `id` text PRIMARY KEY NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_ASSURANCE_AUDIO_PAID_DISPATCH_AUTHORIZATION_V1'),
  `capability_key` text NOT NULL CHECK (`capability_key` = 'CONTROLLED_FIXTURE_CLEAN_AUDIO_SYNTHESIS'),
  `capability_version` text NOT NULL CHECK (`capability_version` = 'V1'),
  `authorization_scope` text NOT NULL CHECK (`authorization_scope` = 'ONE_EXACT_PROVIDER_DISPATCH'),
  `authorization_validity_seconds` integer NOT NULL CHECK (`authorization_validity_seconds` = 900),
  `authorized_provider_requests` integer NOT NULL CHECK (`authorized_provider_requests` = 1),
  `authorized_spend_micros` integer NOT NULL CHECK (`authorized_spend_micros` = 80000),
  `required_provider_metadata_reads` integer NOT NULL CHECK (`required_provider_metadata_reads` = 3),
  `required_public_rights_reads` integer NOT NULL CHECK (`required_public_rights_reads` = 1),
  `provider_generation_requests` integer NOT NULL CHECK (`provider_generation_requests` = 0),
  `provider_requests` integer NOT NULL CHECK (`provider_requests` = 0),
  `spend_micros` integer NOT NULL CHECK (`spend_micros` = 0),
  `retry_authority` integer NOT NULL CHECK (`retry_authority` = 0),
  `fallback_authority` integer NOT NULL CHECK (`fallback_authority` = 0),
  `r22_authority` integer NOT NULL CHECK (`r22_authority` = 0),
  `master_authority` integer NOT NULL CHECK (`master_authority` = 0),
  `release_authority` integer NOT NULL CHECK (`release_authority` = 0),
  `publication_authority` integer NOT NULL CHECK (`publication_authority` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_audio_paid_dispatch_authorization_policy_version_uq`
  ON `factory_assurance_audio_paid_dispatch_authorization_policies` (`policy_version`);
--> statement-breakpoint
CREATE TABLE `factory_assurance_audio_paid_dispatch_authorization_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `route_reservation_run_id` text NOT NULL,
  `certification_run_id` text NOT NULL,
  `contract_id` text NOT NULL,
  `work_request_id` text NOT NULL,
  `route_decision_id` text NOT NULL,
  `cost_reservation_id` text NOT NULL,
  `provider_id` text NOT NULL,
  `binding_id` text NOT NULL,
  `qualification_id` text NOT NULL,
  `rights_receipt_id` text NOT NULL,
  `drift_receipt_id` text NOT NULL,
  `idempotency_key` text NOT NULL UNIQUE,
  `request_hash` text NOT NULL CHECK (length(`request_hash`) = 64),
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_ASSURANCE_AUDIO_PAID_DISPATCH_AUTHORIZATION_V1'),
  `authorization_state` text NOT NULL CHECK (`authorization_state` IN ('AUTHORIZED','BLOCKED')),
  `authorization_scope` text NOT NULL CHECK (`authorization_scope` = 'ONE_EXACT_PROVIDER_DISPATCH'),
  `blockers_json` text NOT NULL CHECK (json_valid(`blockers_json`)),
  `subscription_tier` text,
  `subscription_status` text,
  `subscription_response_hash` text CHECK (`subscription_response_hash` IS NULL OR length(`subscription_response_hash`) = 64),
  `subscription_storage_key` text,
  `subscription_readback_hash` text CHECK (`subscription_readback_hash` IS NULL OR length(`subscription_readback_hash`) = 64),
  `subscription_readback_state` text NOT NULL CHECK (`subscription_readback_state` IN ('PASS','FAIL')),
  `voice_response_hash` text CHECK (`voice_response_hash` IS NULL OR length(`voice_response_hash`) = 64),
  `model_response_hash` text CHECK (`model_response_hash` IS NULL OR length(`model_response_hash`) = 64),
  `official_rights_response_hash` text CHECK (`official_rights_response_hash` IS NULL OR length(`official_rights_response_hash`) = 64),
  `official_rights_storage_key` text,
  `official_rights_readback_hash` text CHECK (`official_rights_readback_hash` IS NULL OR length(`official_rights_readback_hash`) = 64),
  `official_rights_readback_state` text NOT NULL CHECK (`official_rights_readback_state` IN ('PASS','FAIL')),
  `normalized_observation_json` text NOT NULL CHECK (json_valid(`normalized_observation_json`)),
  `provider_metadata_reads` integer NOT NULL CHECK (`provider_metadata_reads` IN (0,3)),
  `public_rights_reads` integer NOT NULL CHECK (`public_rights_reads` IN (0,1)),
  `authorized_provider_requests` integer NOT NULL CHECK (`authorized_provider_requests` IN (0,1)),
  `authorized_spend_micros` integer NOT NULL CHECK (`authorized_spend_micros` IN (0,80000)),
  `provider_dispatch_authority` integer NOT NULL CHECK (`provider_dispatch_authority` IN (0,1)),
  `provider_generation_requests` integer NOT NULL CHECK (`provider_generation_requests` = 0),
  `provider_requests` integer NOT NULL CHECK (`provider_requests` = 0),
  `spend_micros` integer NOT NULL CHECK (`spend_micros` = 0),
  `retry_authority` integer NOT NULL CHECK (`retry_authority` = 0),
  `fallback_authority` integer NOT NULL CHECK (`fallback_authority` = 0),
  `r22_authority` integer NOT NULL CHECK (`r22_authority` = 0),
  `master_authority` integer NOT NULL CHECK (`master_authority` = 0),
  `release_authority` integer NOT NULL CHECK (`release_authority` = 0),
  `publication_authority` integer NOT NULL CHECK (`publication_authority` = 0),
  `runtime_command_id` text,
  `runtime_event_id` text,
  `runtime_lease_id` text,
  `observed_at` text NOT NULL,
  `authorization_expires_at` text,
  `actor` text NOT NULL,
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`route_reservation_run_id`) REFERENCES `factory_assurance_audio_route_reservation_runs`(`id`),
  FOREIGN KEY (`certification_run_id`) REFERENCES `factory_assurance_audio_provider_certification_runs`(`id`),
  FOREIGN KEY (`contract_id`) REFERENCES `factory_assurance_controlled_fixture_audio_request_contracts`(`id`),
  FOREIGN KEY (`work_request_id`) REFERENCES `factory_provider_work_requests`(`id`),
  FOREIGN KEY (`route_decision_id`) REFERENCES `factory_provider_route_decisions`(`id`),
  FOREIGN KEY (`cost_reservation_id`) REFERENCES `factory_provider_cost_reservations`(`id`),
  FOREIGN KEY (`provider_id`) REFERENCES `factory_providers`(`id`),
  FOREIGN KEY (`binding_id`) REFERENCES `factory_provider_bindings`(`id`),
  FOREIGN KEY (`qualification_id`) REFERENCES `factory_capability_qualifications`(`id`),
  FOREIGN KEY (`rights_receipt_id`) REFERENCES `factory_rights_eligibility_receipts`(`id`),
  FOREIGN KEY (`drift_receipt_id`) REFERENCES `factory_provider_drift_receipts`(`id`),
  FOREIGN KEY (`runtime_command_id`) REFERENCES `factory_runtime_commands`(`id`),
  FOREIGN KEY (`runtime_event_id`) REFERENCES `factory_runtime_events`(`id`),
  FOREIGN KEY (`runtime_lease_id`) REFERENCES `factory_runtime_leases`(`id`),
  CHECK ((`authorization_state`='AUTHORIZED'
      AND `subscription_tier` IS NOT NULL AND `subscription_status`='active'
      AND `subscription_response_hash` IS NOT NULL AND `subscription_storage_key` IS NOT NULL
      AND `subscription_readback_hash`=`subscription_response_hash` AND `subscription_readback_state`='PASS'
      AND `voice_response_hash` IS NOT NULL AND `model_response_hash` IS NOT NULL
      AND `official_rights_response_hash` IS NOT NULL AND `official_rights_storage_key` IS NOT NULL
      AND `official_rights_readback_hash`=`official_rights_response_hash` AND `official_rights_readback_state`='PASS'
      AND `provider_metadata_reads`=3 AND `public_rights_reads`=1
      AND `authorized_provider_requests`=1 AND `authorized_spend_micros`=80000 AND `provider_dispatch_authority`=1
      AND `runtime_command_id` IS NOT NULL AND `runtime_event_id` IS NOT NULL AND `runtime_lease_id` IS NOT NULL
      AND `authorization_expires_at` IS NOT NULL)
    OR (`authorization_state`='BLOCKED'
      AND `authorized_provider_requests`=0 AND `authorized_spend_micros`=0 AND `provider_dispatch_authority`=0
      AND `runtime_command_id` IS NULL AND `runtime_event_id` IS NULL AND `runtime_lease_id` IS NULL
      AND `authorization_expires_at` IS NULL))
);
--> statement-breakpoint
CREATE INDEX `factory_assurance_audio_paid_dispatch_authorization_reservation_idx`
  ON `factory_assurance_audio_paid_dispatch_authorization_runs` (`cost_reservation_id`,`observed_at`,`created_at`);
--> statement-breakpoint
CREATE TABLE `factory_assurance_audio_paid_dispatch_entitlement_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL UNIQUE,
  `cost_reservation_id` text NOT NULL,
  `binding_id` text NOT NULL,
  `voice_id` text,
  `model_id` text,
  `official_rights_source_url` text NOT NULL,
  `subscription_response_hash` text CHECK (`subscription_response_hash` IS NULL OR length(`subscription_response_hash`) = 64),
  `subscription_storage_key` text,
  `subscription_readback_hash` text CHECK (`subscription_readback_hash` IS NULL OR length(`subscription_readback_hash`) = 64),
  `subscription_readback_state` text NOT NULL CHECK (`subscription_readback_state` IN ('PASS','FAIL')),
  `voice_response_hash` text CHECK (`voice_response_hash` IS NULL OR length(`voice_response_hash`) = 64),
  `model_response_hash` text CHECK (`model_response_hash` IS NULL OR length(`model_response_hash`) = 64),
  `official_rights_response_hash` text CHECK (`official_rights_response_hash` IS NULL OR length(`official_rights_response_hash`) = 64),
  `official_rights_storage_key` text,
  `official_rights_readback_hash` text CHECK (`official_rights_readback_hash` IS NULL OR length(`official_rights_readback_hash`) = 64),
  `receipt_state` text NOT NULL CHECK (`receipt_state` IN ('PASS','BLOCKED')),
  `blockers_json` text NOT NULL CHECK (json_valid(`blockers_json`)),
  `provider_metadata_reads` integer NOT NULL CHECK (`provider_metadata_reads` IN (0,3)),
  `public_rights_reads` integer NOT NULL CHECK (`public_rights_reads` IN (0,1)),
  `provider_generation_requests` integer NOT NULL CHECK (`provider_generation_requests` = 0),
  `provider_requests` integer NOT NULL CHECK (`provider_requests` = 0),
  `spend_micros` integer NOT NULL CHECK (`spend_micros` = 0),
  `retry_authority` integer NOT NULL CHECK (`retry_authority` = 0),
  `fallback_authority` integer NOT NULL CHECK (`fallback_authority` = 0),
  `r22_authority` integer NOT NULL CHECK (`r22_authority` = 0),
  `master_authority` integer NOT NULL CHECK (`master_authority` = 0),
  `release_authority` integer NOT NULL CHECK (`release_authority` = 0),
  `publication_authority` integer NOT NULL CHECK (`publication_authority` = 0),
  `observed_at` text NOT NULL,
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`run_id`) REFERENCES `factory_assurance_audio_paid_dispatch_authorization_runs`(`id`),
  FOREIGN KEY (`cost_reservation_id`) REFERENCES `factory_provider_cost_reservations`(`id`),
  FOREIGN KEY (`binding_id`) REFERENCES `factory_provider_bindings`(`id`)
);
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_audio_paid_dispatch_authorization_policies_no_update` BEFORE UPDATE ON `factory_assurance_audio_paid_dispatch_authorization_policies` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_AUDIO_PAID_DISPATCH_AUTHORIZATION_POLICIES_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_audio_paid_dispatch_authorization_policies_no_delete` BEFORE DELETE ON `factory_assurance_audio_paid_dispatch_authorization_policies` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_AUDIO_PAID_DISPATCH_AUTHORIZATION_POLICIES_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_audio_paid_dispatch_authorization_runs_no_update` BEFORE UPDATE ON `factory_assurance_audio_paid_dispatch_authorization_runs` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_AUDIO_PAID_DISPATCH_AUTHORIZATION_RUNS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_audio_paid_dispatch_authorization_runs_no_delete` BEFORE DELETE ON `factory_assurance_audio_paid_dispatch_authorization_runs` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_AUDIO_PAID_DISPATCH_AUTHORIZATION_RUNS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_audio_paid_dispatch_entitlement_receipts_no_update` BEFORE UPDATE ON `factory_assurance_audio_paid_dispatch_entitlement_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_AUDIO_PAID_DISPATCH_ENTITLEMENT_RECEIPTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_audio_paid_dispatch_entitlement_receipts_no_delete` BEFORE DELETE ON `factory_assurance_audio_paid_dispatch_entitlement_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_AUDIO_PAID_DISPATCH_ENTITLEMENT_RECEIPTS_APPEND_ONLY'); END;
--> statement-breakpoint
INSERT INTO `factory_assurance_audio_paid_dispatch_authorization_policies`
  (`id`,`policy_version`,`capability_key`,`capability_version`,`authorization_scope`,`authorization_validity_seconds`,`authorized_provider_requests`,`authorized_spend_micros`,`required_provider_metadata_reads`,`required_public_rights_reads`,`provider_generation_requests`,`provider_requests`,`spend_micros`,`retry_authority`,`fallback_authority`,`r22_authority`,`master_authority`,`release_authority`,`publication_authority`)
VALUES
  ('factory-assurance-audio-paid-dispatch-authorization-policy-v1','FACTORY_ASSURANCE_AUDIO_PAID_DISPATCH_AUTHORIZATION_V1','CONTROLLED_FIXTURE_CLEAN_AUDIO_SYNTHESIS','V1','ONE_EXACT_PROVIDER_DISPATCH',900,1,80000,3,1,0,0,0,0,0,0,0,0,0);
