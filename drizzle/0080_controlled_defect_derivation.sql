CREATE TABLE `v7_evaluation_controlled_defect_derivation_policies` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'CONTROLLED_DEFECT_DERIVATION_V1'),
  `source_clean_control_policy_version` text NOT NULL CHECK (`source_clean_control_policy_version` = 'CLEAN_AUDIO_CONTROL_ELIGIBILITY_V1'),
  `target_blueprint_key` text NOT NULL CHECK (`target_blueprint_key` = 'RIGHTS_LINEAGE_MISSING_POSITIVE'),
  `maximum_derivatives` integer NOT NULL CHECK (`maximum_derivatives` = 1),
  `mutation_operation` text NOT NULL CHECK (`mutation_operation` = 'REMOVE_REQUIRED_RIGHTS_RECEIPT_REFERENCE'),
  `oracle_kind` text NOT NULL CHECK (`oracle_kind` = 'DETERMINISTIC'),
  `exact_parent_readback_required` integer NOT NULL CHECK (`exact_parent_readback_required` = 1),
  `manifest_readback_required` integer NOT NULL CHECK (`manifest_readback_required` = 1),
  `authority_boundary` text NOT NULL CHECK (`authority_boundary` = 'CONTROLLED_FIXTURE_GROUND_TRUTH_ONLY'),
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `dataset_sealing_authority` integer NOT NULL DEFAULT 0 CHECK (`dataset_sealing_authority` = 0),
  `assurance_qualification_authority` integer NOT NULL DEFAULT 0 CHECK (`assurance_qualification_authority` = 0),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_controlled_defect_derivation_policy_channel_uq`
  ON `v7_evaluation_controlled_defect_derivation_policies` (`channel_id`,`policy_version`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_controlled_defect_derivation_policy_no_update`
BEFORE UPDATE ON `v7_evaluation_controlled_defect_derivation_policies`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CONTROLLED_DEFECT_DERIVATION_POLICY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_controlled_defect_derivation_policy_no_delete`
BEFORE DELETE ON `v7_evaluation_controlled_defect_derivation_policies`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CONTROLLED_DEFECT_DERIVATION_POLICY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_controlled_defect_derivation_tasks` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'CONTROLLED_DEFECT_DERIVATION_V1'),
  `blueprint_id` text NOT NULL UNIQUE,
  `source_clean_control_receipt_id` text NOT NULL UNIQUE,
  `source_artifact_id` text NOT NULL UNIQUE,
  `source_rights_receipt_id` text NOT NULL,
  `source_artifact_hash` text NOT NULL CHECK (length(`source_artifact_hash`) = 64),
  `expected_defect_key` text NOT NULL CHECK (`expected_defect_key` = 'RIGHTS_LINEAGE_MISSING'),
  `task_state` text NOT NULL CHECK (`task_state` = 'OPEN'),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`blueprint_id`) REFERENCES `v7_evaluation_controlled_fixture_blueprints`(`id`),
  FOREIGN KEY (`source_clean_control_receipt_id`) REFERENCES `v7_evaluation_clean_audio_control_eligibility_receipts`(`id`),
  FOREIGN KEY (`source_artifact_id`) REFERENCES `v7_evaluation_commercial_clean_audio_artifacts`(`id`),
  FOREIGN KEY (`source_rights_receipt_id`) REFERENCES `v7_evaluation_commercial_clean_audio_rights_receipts`(`id`)
);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_controlled_defect_derivation_task_no_update`
BEFORE UPDATE ON `v7_evaluation_controlled_defect_derivation_tasks`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CONTROLLED_DEFECT_DERIVATION_TASK_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_controlled_defect_derivation_task_no_delete`
BEFORE DELETE ON `v7_evaluation_controlled_defect_derivation_tasks`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CONTROLLED_DEFECT_DERIVATION_TASK_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_controlled_defect_derivation_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `task_id` text NOT NULL UNIQUE,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'CONTROLLED_DEFECT_DERIVATION_V1'),
  `blueprint_id` text NOT NULL UNIQUE,
  `source_clean_control_receipt_id` text NOT NULL UNIQUE,
  `source_artifact_id` text NOT NULL UNIQUE,
  `source_rights_receipt_id` text NOT NULL,
  `source_artifact_hash` text NOT NULL CHECK (length(`source_artifact_hash`) = 64),
  `parent_readback_hash` text NOT NULL CHECK (`parent_readback_hash` = `source_artifact_hash`),
  `parent_readback_bytes` integer NOT NULL CHECK (`parent_readback_bytes` > 10000),
  `clean_manifest_storage_key` text NOT NULL UNIQUE,
  `clean_manifest_hash` text NOT NULL CHECK (length(`clean_manifest_hash`) = 64),
  `clean_manifest_bytes` integer NOT NULL CHECK (`clean_manifest_bytes` > 100),
  `clean_manifest_readback_hash` text NOT NULL CHECK (`clean_manifest_readback_hash` = `clean_manifest_hash`),
  `mutated_manifest_storage_key` text NOT NULL UNIQUE,
  `mutated_manifest_hash` text NOT NULL CHECK (length(`mutated_manifest_hash`) = 64),
  `mutated_manifest_bytes` integer NOT NULL CHECK (`mutated_manifest_bytes` > 100),
  `mutated_manifest_readback_hash` text NOT NULL CHECK (`mutated_manifest_readback_hash` = `mutated_manifest_hash`),
  `removed_manifest_key` text NOT NULL CHECK (`removed_manifest_key` = 'rightsReceiptId'),
  `mutation_isolated` integer NOT NULL CHECK (`mutation_isolated` = 1),
  `expected_defect_key` text NOT NULL CHECK (`expected_defect_key` = 'RIGHTS_LINEAGE_MISSING'),
  `severity` text NOT NULL CHECK (`severity` = 'P0'),
  `decision_state` text NOT NULL CHECK (`decision_state` = 'CONTROLLED_DEFECT_PRESENT'),
  `oracle_kind` text NOT NULL CHECK (`oracle_kind` = 'DETERMINISTIC'),
  `oracle_state` text NOT NULL CHECK (`oracle_state` = 'PASS'),
  `oracle_proof_json` text NOT NULL CHECK (json_valid(`oracle_proof_json`)),
  `ground_truth_authority` text NOT NULL CHECK (`ground_truth_authority` = 'DETERMINISTIC_SYSTEM_ORACLE'),
  `lineage_group_key` text NOT NULL CHECK (`lineage_group_key` = 'controlled-fixture:rights-lineage-missing:v1'),
  `controlled_injection_eligible` integer NOT NULL CHECK (`controlled_injection_eligible` = 1),
  `p0_family_coverage_eligible` integer NOT NULL CHECK (`p0_family_coverage_eligible` = 1),
  `candidate_items_after` integer NOT NULL CHECK (`candidate_items_after` >= 1),
  `owner_confirmed_references_after` integer NOT NULL CHECK (`owner_confirmed_references_after` >= 1),
  `clean_negative_controls_after` integer NOT NULL CHECK (`clean_negative_controls_after` >= 1),
  `controlled_injection_fixtures_after` integer NOT NULL CHECK (`controlled_injection_fixtures_after` >= 1),
  `p0_families_covered_after` integer NOT NULL CHECK (`p0_families_covered_after` >= 1),
  `p0_families_required` integer NOT NULL CHECK (`p0_families_required` = 5),
  `readiness_state` text NOT NULL CHECK (`readiness_state` = 'INSUFFICIENT_GROUND_TRUTH'),
  `actor` text NOT NULL,
  `idempotency_key` text NOT NULL UNIQUE,
  `request_hash` text NOT NULL CHECK (length(`request_hash`) = 64),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `authority_boundary` text NOT NULL CHECK (`authority_boundary` = 'CONTROLLED_FIXTURE_GROUND_TRUTH_ONLY'),
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `dataset_eligible` integer NOT NULL DEFAULT 0 CHECK (`dataset_eligible` = 0),
  `dataset_sealing_authority` integer NOT NULL DEFAULT 0 CHECK (`dataset_sealing_authority` = 0),
  `assurance_qualification_authority` integer NOT NULL DEFAULT 0 CHECK (`assurance_qualification_authority` = 0),
  `release_eligible` integer NOT NULL DEFAULT 0 CHECK (`release_eligible` = 0),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`task_id`) REFERENCES `v7_evaluation_controlled_defect_derivation_tasks`(`id`),
  FOREIGN KEY (`blueprint_id`) REFERENCES `v7_evaluation_controlled_fixture_blueprints`(`id`),
  FOREIGN KEY (`source_clean_control_receipt_id`) REFERENCES `v7_evaluation_clean_audio_control_eligibility_receipts`(`id`),
  FOREIGN KEY (`source_artifact_id`) REFERENCES `v7_evaluation_commercial_clean_audio_artifacts`(`id`),
  FOREIGN KEY (`source_rights_receipt_id`) REFERENCES `v7_evaluation_commercial_clean_audio_rights_receipts`(`id`)
);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_controlled_defect_derivation_receipt_no_update`
BEFORE UPDATE ON `v7_evaluation_controlled_defect_derivation_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CONTROLLED_DEFECT_DERIVATION_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_controlled_defect_derivation_receipt_no_delete`
BEFORE DELETE ON `v7_evaluation_controlled_defect_derivation_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CONTROLLED_DEFECT_DERIVATION_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
INSERT INTO `v7_evaluation_controlled_defect_derivation_policies`
  (`id`,`channel_id`,`policy_version`,`source_clean_control_policy_version`,`target_blueprint_key`,`maximum_derivatives`,`mutation_operation`,`oracle_kind`,`exact_parent_readback_required`,`manifest_readback_required`,`authority_boundary`)
VALUES
  ('controlled-defect-derivation-policy:hidden-systems:v1','channel-hidden-systems','CONTROLLED_DEFECT_DERIVATION_V1','CLEAN_AUDIO_CONTROL_ELIGIBILITY_V1','RIGHTS_LINEAGE_MISSING_POSITIVE',1,'REMOVE_REQUIRED_RIGHTS_RECEIPT_REFERENCE','DETERMINISTIC',1,1,'CONTROLLED_FIXTURE_GROUND_TRUTH_ONLY');
--> statement-breakpoint
INSERT INTO `v7_evaluation_controlled_defect_derivation_tasks`
  (`id`,`channel_id`,`policy_version`,`blueprint_id`,`source_clean_control_receipt_id`,`source_artifact_id`,`source_rights_receipt_id`,`source_artifact_hash`,`expected_defect_key`,`task_state`)
SELECT
  'controlled-defect-derivation-task:' || c.`artifact_id`,
  c.`channel_id`,
  'CONTROLLED_DEFECT_DERIVATION_V1',
  b.`id`,
  c.`id`,
  c.`artifact_id`,
  c.`rights_receipt_id`,
  lower(c.`exact_artifact_hash`),
  'RIGHTS_LINEAGE_MISSING',
  'OPEN'
FROM `v7_evaluation_clean_audio_control_eligibility_receipts` c
JOIN `v7_evaluation_controlled_fixture_blueprints` b ON b.`blueprint_key`='RIGHTS_LINEAGE_MISSING_POSITIVE'
WHERE c.`channel_id`='channel-hidden-systems'
  AND c.`decision_state`='ELIGIBLE_CLEAN_CONTROL_REFERENCE'
  AND c.`bytes_state`='READBACK_VERIFIED'
  AND c.`checksum_state`='PASS'
  AND c.`provenance_state`='PASS'
  AND c.`rights_state`='PASS'
  AND c.`owner_ground_truth_state`='CLEAN_CONFIRMED'
  AND c.`reference_eligible`=1
  AND c.`authority_boundary`='CLEAN_CONTROL_REFERENCE_ONLY'
  AND b.`fixture_role`='DEFECT_POSITIVE'
  AND b.`candidate_kind`='AUDIO'
  AND b.`expected_defect_key`='RIGHTS_LINEAGE_MISSING'
  AND b.`severity`='P0'
  AND b.`oracle_kind`='DETERMINISTIC'
ORDER BY c.`created_at`,c.`id`
LIMIT 1;
