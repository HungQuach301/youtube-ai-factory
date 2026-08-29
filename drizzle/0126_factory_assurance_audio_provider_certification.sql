CREATE TABLE `factory_assurance_audio_provider_certification_policies` (
  `id` text PRIMARY KEY NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_ASSURANCE_AUDIO_PROVIDER_CERTIFICATION_V1'),
  `capability_key` text NOT NULL CHECK (`capability_key` = 'CONTROLLED_FIXTURE_CLEAN_AUDIO_SYNTHESIS'),
  `capability_version` text NOT NULL CHECK (`capability_version` = 'V1'),
  `quality_standard_version` text NOT NULL CHECK (`quality_standard_version` = 'FACTORY_CONTROLLED_FIXTURE_AUDIO_QUALITY_STANDARD_V1'),
  `rights_policy_version` text NOT NULL CHECK (`rights_policy_version` = 'FACTORY_CONTROLLED_FIXTURE_AUDIO_COMMERCIAL_RIGHTS_V1'),
  `retention_policy_version` text NOT NULL CHECK (`retention_policy_version` = 'FACTORY_CONTROLLED_FIXTURE_AUDIO_RETENTION_V1'),
  `required_historical_clean_controls` integer NOT NULL CHECK (`required_historical_clean_controls` = 1),
  `required_provider_metadata_reads` integer NOT NULL CHECK (`required_provider_metadata_reads` = 3),
  `required_public_rights_reads` integer NOT NULL CHECK (`required_public_rights_reads` = 1),
  `qualification_validity_seconds` integer NOT NULL CHECK (`qualification_validity_seconds` = 604800),
  `rights_validity_seconds` integer NOT NULL CHECK (`rights_validity_seconds` = 604800),
  `provider_generation_requests` integer NOT NULL CHECK (`provider_generation_requests` = 0),
  `provider_dispatch_authority` integer NOT NULL CHECK (`provider_dispatch_authority` = 0),
  `cost_reservation_authority` integer NOT NULL CHECK (`cost_reservation_authority` = 0),
  `release_authority` integer NOT NULL CHECK (`release_authority` = 0),
  `publication_authority` integer NOT NULL CHECK (`publication_authority` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_audio_provider_certification_policy_version_uq`
  ON `factory_assurance_audio_provider_certification_policies` (`policy_version`);
--> statement-breakpoint
CREATE TABLE `factory_assurance_audio_provider_certification_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `preflight_run_id` text NOT NULL,
  `contract_id` text NOT NULL,
  `idempotency_key` text NOT NULL UNIQUE,
  `request_hash` text NOT NULL CHECK (length(`request_hash`) = 64),
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_ASSURANCE_AUDIO_PROVIDER_CERTIFICATION_V1'),
  `certification_state` text NOT NULL CHECK (`certification_state` IN ('CERTIFIED','BLOCKED')),
  `blockers_json` text NOT NULL CHECK (json_valid(`blockers_json`)),
  `provider_id` text,
  `capability_id` text,
  `binding_id` text,
  `qualification_id` text,
  `rights_receipt_id` text,
  `drift_receipt_id` text,
  `exact_audio_bindings` integer NOT NULL CHECK (`exact_audio_bindings` IN (0,1)),
  `exact_audio_qualifications` integer NOT NULL CHECK (`exact_audio_qualifications` IN (0,1)),
  `exact_audio_rights_receipts` integer NOT NULL CHECK (`exact_audio_rights_receipts` IN (0,1)),
  `exact_audio_current_drift_receipts` integer NOT NULL CHECK (`exact_audio_current_drift_receipts` IN (0,1)),
  `exact_audio_route_ready_bindings` integer NOT NULL CHECK (`exact_audio_route_ready_bindings` IN (0,1)),
  `provider_metadata_reads` integer NOT NULL CHECK (`provider_metadata_reads` = 3),
  `public_rights_reads` integer NOT NULL CHECK (`public_rights_reads` = 1),
  `provider_generation_requests` integer NOT NULL CHECK (`provider_generation_requests` = 0),
  `canonical_work_requests` integer NOT NULL CHECK (`canonical_work_requests` = 0),
  `canonical_route_decisions` integer NOT NULL CHECK (`canonical_route_decisions` = 0),
  `canonical_cost_reservations` integer NOT NULL CHECK (`canonical_cost_reservations` = 0),
  `provider_dispatch_authority` integer NOT NULL CHECK (`provider_dispatch_authority` = 0),
  `cost_reservation_authority` integer NOT NULL CHECK (`cost_reservation_authority` = 0),
  `r22_authority` integer NOT NULL CHECK (`r22_authority` = 0),
  `master_authority` integer NOT NULL CHECK (`master_authority` = 0),
  `release_authority` integer NOT NULL CHECK (`release_authority` = 0),
  `publication_authority` integer NOT NULL CHECK (`publication_authority` = 0),
  `spend_micros` integer NOT NULL CHECK (`spend_micros` = 0),
  `observed_at` text NOT NULL,
  `actor` text NOT NULL,
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`preflight_run_id`) REFERENCES `factory_assurance_controlled_fixture_audio_preflight_runs`(`id`),
  FOREIGN KEY (`contract_id`) REFERENCES `factory_assurance_controlled_fixture_audio_request_contracts`(`id`),
  FOREIGN KEY (`provider_id`) REFERENCES `factory_providers`(`id`),
  FOREIGN KEY (`capability_id`) REFERENCES `factory_capabilities`(`id`),
  FOREIGN KEY (`binding_id`) REFERENCES `factory_provider_bindings`(`id`),
  FOREIGN KEY (`qualification_id`) REFERENCES `factory_capability_qualifications`(`id`),
  FOREIGN KEY (`rights_receipt_id`) REFERENCES `factory_rights_eligibility_receipts`(`id`),
  FOREIGN KEY (`drift_receipt_id`) REFERENCES `factory_provider_drift_receipts`(`id`),
  CHECK ((`certification_state`='CERTIFIED' AND `provider_id` IS NOT NULL AND `capability_id` IS NOT NULL AND `binding_id` IS NOT NULL AND `qualification_id` IS NOT NULL AND `rights_receipt_id` IS NOT NULL AND `drift_receipt_id` IS NOT NULL
    AND `exact_audio_bindings`=1 AND `exact_audio_qualifications`=1 AND `exact_audio_rights_receipts`=1 AND `exact_audio_current_drift_receipts`=1 AND `exact_audio_route_ready_bindings`=1)
    OR (`certification_state`='BLOCKED' AND `provider_id` IS NULL AND `capability_id` IS NULL AND `binding_id` IS NULL AND `qualification_id` IS NULL AND `rights_receipt_id` IS NULL AND `drift_receipt_id` IS NULL
    AND `exact_audio_bindings`=0 AND `exact_audio_qualifications`=0 AND `exact_audio_rights_receipts`=0 AND `exact_audio_current_drift_receipts`=0 AND `exact_audio_route_ready_bindings`=0))
);
--> statement-breakpoint
CREATE INDEX `factory_assurance_audio_provider_certification_contract_idx`
  ON `factory_assurance_audio_provider_certification_runs` (`contract_id`,`observed_at`,`created_at`);
--> statement-breakpoint
CREATE TABLE `factory_assurance_audio_provider_observation_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL UNIQUE,
  `contract_id` text NOT NULL,
  `historical_voice_identity_receipt_id` text,
  `historical_provider_receipt_id` text,
  `historical_artifact_id` text,
  `historical_rights_receipt_id` text,
  `historical_qa_receipt_id` text,
  `historical_owner_receipt_id` text,
  `historical_eligibility_receipt_id` text,
  `historical_artifact_hash` text CHECK (`historical_artifact_hash` IS NULL OR length(`historical_artifact_hash`) = 64),
  `historical_r2_readback_state` text NOT NULL CHECK (`historical_r2_readback_state` IN ('PASS','FAIL')),
  `subscription_tier` text,
  `subscription_status` text,
  `subscription_response_hash` text CHECK (`subscription_response_hash` IS NULL OR length(`subscription_response_hash`) = 64),
  `voice_id` text,
  `voice_name` text,
  `voice_response_hash` text CHECK (`voice_response_hash` IS NULL OR length(`voice_response_hash`) = 64),
  `model_id` text,
  `model_response_hash` text CHECK (`model_response_hash` IS NULL OR length(`model_response_hash`) = 64),
  `official_rights_source_url` text NOT NULL CHECK (`official_rights_source_url` LIKE 'https://help.elevenlabs.io/%'),
  `official_rights_http_status` integer,
  `official_rights_response_hash` text CHECK (`official_rights_response_hash` IS NULL OR length(`official_rights_response_hash`) = 64),
  `official_rights_storage_key` text,
  `official_rights_readback_hash` text CHECK (`official_rights_readback_hash` IS NULL OR length(`official_rights_readback_hash`) = 64),
  `official_rights_readback_state` text NOT NULL CHECK (`official_rights_readback_state` IN ('PASS','FAIL')),
  `normalized_observation_json` text NOT NULL CHECK (json_valid(`normalized_observation_json`)),
  `observation_state` text NOT NULL CHECK (`observation_state` IN ('PASS','FAIL')),
  `blockers_json` text NOT NULL CHECK (json_valid(`blockers_json`)),
  `provider_metadata_reads` integer NOT NULL CHECK (`provider_metadata_reads` = 3),
  `public_rights_reads` integer NOT NULL CHECK (`public_rights_reads` = 1),
  `provider_generation_requests` integer NOT NULL CHECK (`provider_generation_requests` = 0),
  `spend_micros` integer NOT NULL CHECK (`spend_micros` = 0),
  `observed_at` text NOT NULL,
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`run_id`) REFERENCES `factory_assurance_audio_provider_certification_runs`(`id`),
  FOREIGN KEY (`contract_id`) REFERENCES `factory_assurance_controlled_fixture_audio_request_contracts`(`id`)
);
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_audio_provider_certification_policies_no_update` BEFORE UPDATE ON `factory_assurance_audio_provider_certification_policies` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_AUDIO_PROVIDER_CERTIFICATION_POLICIES_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_audio_provider_certification_policies_no_delete` BEFORE DELETE ON `factory_assurance_audio_provider_certification_policies` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_AUDIO_PROVIDER_CERTIFICATION_POLICIES_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_audio_provider_certification_runs_no_update` BEFORE UPDATE ON `factory_assurance_audio_provider_certification_runs` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_AUDIO_PROVIDER_CERTIFICATION_RUNS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_audio_provider_certification_runs_no_delete` BEFORE DELETE ON `factory_assurance_audio_provider_certification_runs` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_AUDIO_PROVIDER_CERTIFICATION_RUNS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_audio_provider_observation_receipts_no_update` BEFORE UPDATE ON `factory_assurance_audio_provider_observation_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_AUDIO_PROVIDER_OBSERVATION_RECEIPTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_audio_provider_observation_receipts_no_delete` BEFORE DELETE ON `factory_assurance_audio_provider_observation_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_AUDIO_PROVIDER_OBSERVATION_RECEIPTS_APPEND_ONLY'); END;
--> statement-breakpoint
INSERT INTO `factory_assurance_audio_provider_certification_policies`
  (`id`,`policy_version`,`capability_key`,`capability_version`,`quality_standard_version`,`rights_policy_version`,`retention_policy_version`,`required_historical_clean_controls`,`required_provider_metadata_reads`,`required_public_rights_reads`,`qualification_validity_seconds`,`rights_validity_seconds`,`provider_generation_requests`,`provider_dispatch_authority`,`cost_reservation_authority`,`release_authority`,`publication_authority`)
VALUES
  ('factory-assurance-audio-provider-certification-policy-v1','FACTORY_ASSURANCE_AUDIO_PROVIDER_CERTIFICATION_V1','CONTROLLED_FIXTURE_CLEAN_AUDIO_SYNTHESIS','V1','FACTORY_CONTROLLED_FIXTURE_AUDIO_QUALITY_STANDARD_V1','FACTORY_CONTROLLED_FIXTURE_AUDIO_COMMERCIAL_RIGHTS_V1','FACTORY_CONTROLLED_FIXTURE_AUDIO_RETENTION_V1',1,3,1,604800,604800,0,0,0,0,0);
