CREATE TABLE `v7_evaluation_rights_evidence_tasks` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `candidate_id` text NOT NULL,
  `task_type` text NOT NULL CHECK (`task_type` IN ('PROVIDER_TERMS_AND_PLAN_RECEIPT','COMPOSITE_PARENT_RIGHTS_MANIFEST','AUTHORSHIP_SOURCE_RECEIPT')),
  `task_state` text NOT NULL DEFAULT 'OPEN' CHECK (`task_state` = 'OPEN'),
  `blocking_reason` text NOT NULL,
  `requirements_json` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'EVALUATION_RIGHTS_EVIDENCE_POLICY_V1'),
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`candidate_id`) REFERENCES `v7_evaluation_candidates`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_rights_evidence_task_uq` ON `v7_evaluation_rights_evidence_tasks` (`candidate_id`,`policy_version`);
--> statement-breakpoint
CREATE INDEX `v7_evaluation_rights_evidence_task_lane_idx` ON `v7_evaluation_rights_evidence_tasks` (`channel_id`,`task_type`,`task_state`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_rights_evidence_task_no_update`
BEFORE UPDATE ON `v7_evaluation_rights_evidence_tasks`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_RIGHTS_EVIDENCE_TASK_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_rights_evidence_task_no_delete`
BEFORE DELETE ON `v7_evaluation_rights_evidence_tasks`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_RIGHTS_EVIDENCE_TASK_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_provider_terms_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `provider_family` text NOT NULL CHECK (`provider_family` IN ('ELEVENLABS','OPENAI','PEXELS','PIXABAY','OTHER_PROVIDER')),
  `jurisdiction_scope` text NOT NULL,
  `terms_version` text NOT NULL,
  `terms_effective_at` text NOT NULL,
  `terms_source_url` text NOT NULL,
  `terms_snapshot_hash` text NOT NULL CHECK (length(`terms_snapshot_hash`) = 64),
  `account_plan` text NOT NULL,
  `plan_valid_from` text NOT NULL,
  `plan_valid_until` text,
  `plan_evidence_hash` text NOT NULL CHECK (length(`plan_evidence_hash`) = 64),
  `commercial_use_state` text NOT NULL CHECK (`commercial_use_state` = 'VERIFIED_PAID_COMMERCIAL_USE'),
  `supplemental_terms_json` text NOT NULL,
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `actor` text NOT NULL,
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_provider_terms_receipt_uq` ON `v7_evaluation_provider_terms_receipts` (`channel_id`,`provider_family`,`terms_snapshot_hash`,`plan_evidence_hash`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_provider_terms_receipt_no_update`
BEFORE UPDATE ON `v7_evaluation_provider_terms_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_PROVIDER_TERMS_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_provider_terms_receipt_no_delete`
BEFORE DELETE ON `v7_evaluation_provider_terms_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_PROVIDER_TERMS_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_candidate_provider_rights_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `candidate_id` text NOT NULL,
  `provider_terms_receipt_id` text NOT NULL,
  `provider_request_id` text NOT NULL,
  `provider_response_id` text NOT NULL,
  `generation_at` text NOT NULL,
  `artifact_hash` text NOT NULL CHECK (length(`artifact_hash`) = 64),
  `voice_id` text,
  `model_id` text NOT NULL,
  `binding_state` text NOT NULL CHECK (`binding_state` = 'EXACT_REQUEST_RESPONSE_ARTIFACT_BINDING_VERIFIED'),
  `rights_state` text NOT NULL CHECK (`rights_state` = 'PASS'),
  `facts_json` text NOT NULL,
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `actor` text NOT NULL,
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`candidate_id`) REFERENCES `v7_evaluation_candidates`(`id`),
  FOREIGN KEY (`provider_terms_receipt_id`) REFERENCES `v7_evaluation_provider_terms_receipts`(`id`),
  FOREIGN KEY (`provider_request_id`) REFERENCES `production_v2_provider_requests`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_candidate_provider_rights_receipt_uq` ON `v7_evaluation_candidate_provider_rights_receipts` (`candidate_id`,`provider_request_id`,`provider_terms_receipt_id`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_candidate_provider_rights_receipt_no_update`
BEFORE UPDATE ON `v7_evaluation_candidate_provider_rights_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CANDIDATE_PROVIDER_RIGHTS_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_candidate_provider_rights_receipt_no_delete`
BEFORE DELETE ON `v7_evaluation_candidate_provider_rights_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CANDIDATE_PROVIDER_RIGHTS_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_composite_rights_manifests` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `candidate_id` text NOT NULL,
  `artifact_hash` text NOT NULL CHECK (length(`artifact_hash`) = 64),
  `parent_artifact_ids_json` text NOT NULL,
  `parent_artifact_hashes_json` text NOT NULL,
  `parent_rights_receipt_ids_json` text NOT NULL,
  `parent_count` integer NOT NULL CHECK (`parent_count` > 0),
  `verified_parent_count` integer NOT NULL CHECK (`verified_parent_count` >= 0),
  `lineage_state` text NOT NULL CHECK (`lineage_state` = 'EXACT_PARENT_SET_VERIFIED'),
  `rights_state` text NOT NULL CHECK (`rights_state` = 'PASS'),
  `manifest_hash` text NOT NULL CHECK (length(`manifest_hash`) = 64),
  `actor` text NOT NULL,
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`candidate_id`) REFERENCES `v7_evaluation_candidates`(`id`),
  CHECK (`verified_parent_count` = `parent_count`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_composite_rights_manifest_uq` ON `v7_evaluation_composite_rights_manifests` (`candidate_id`,`artifact_hash`,`manifest_hash`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_composite_rights_manifest_no_update`
BEFORE UPDATE ON `v7_evaluation_composite_rights_manifests`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_COMPOSITE_RIGHTS_MANIFEST_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_composite_rights_manifest_no_delete`
BEFORE DELETE ON `v7_evaluation_composite_rights_manifests`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_COMPOSITE_RIGHTS_MANIFEST_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_authorship_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `candidate_id` text NOT NULL,
  `artifact_hash` text NOT NULL CHECK (length(`artifact_hash`) = 64),
  `authorship_type` text NOT NULL CHECK (`authorship_type` IN ('CHANNEL_ORIGINAL','WORK_FOR_HIRE','RENDERED_COMPOSITE')),
  `author_identity` text NOT NULL,
  `source_manifest_id` text,
  `source_manifest_hash` text,
  `territory` text NOT NULL,
  `valid_from` text NOT NULL,
  `valid_until` text,
  `commercial_use_state` text NOT NULL CHECK (`commercial_use_state` = 'VERIFIED_COMMERCIAL_USE'),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `actor` text NOT NULL,
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`candidate_id`) REFERENCES `v7_evaluation_candidates`(`id`),
  CHECK (`authorship_type` != 'RENDERED_COMPOSITE' OR (`source_manifest_id` IS NOT NULL AND length(`source_manifest_hash`) = 64))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_authorship_receipt_uq` ON `v7_evaluation_authorship_receipts` (`candidate_id`,`artifact_hash`,`evidence_hash`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_authorship_receipt_no_update`
BEFORE UPDATE ON `v7_evaluation_authorship_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_AUTHORSHIP_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_authorship_receipt_no_delete`
BEFORE DELETE ON `v7_evaluation_authorship_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_AUTHORSHIP_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
INSERT INTO `v7_evaluation_rights_evidence_tasks`
  (`id`,`channel_id`,`candidate_id`,`task_type`,`blocking_reason`,`requirements_json`,`policy_version`)
SELECT
  'evaluation-rights-task:' || c.id,
  c.channel_id,
  c.id,
  CASE
    WHEN lower(trim(COALESCE(json_extract(a.provenance_json,'$.provider'),''))) LIKE '%eleven%'
      THEN 'PROVIDER_TERMS_AND_PLAN_RECEIPT'
    WHEN c.candidate_kind='MASTER'
      THEN 'COMPOSITE_PARENT_RIGHTS_MANIFEST'
    ELSE 'AUTHORSHIP_SOURCE_RECEIPT'
  END,
  CASE
    WHEN lower(trim(COALESCE(json_extract(a.provenance_json,'$.provider'),''))) LIKE '%eleven%'
      THEN 'HISTORICAL_TERMS_PLAN_AND_EXACT_REQUEST_BINDING_REQUIRED'
    WHEN c.candidate_kind='MASTER'
      THEN 'EXACT_PARENT_SET_AND_PARENT_RIGHTS_COVERAGE_REQUIRED'
    ELSE 'RENDER_OR_SOURCE_AUTHORSHIP_PROOF_REQUIRED'
  END,
  CASE
    WHEN lower(trim(COALESCE(json_extract(a.provenance_json,'$.provider'),''))) LIKE '%eleven%'
      THEN json_array('terms snapshot effective at generation','paid-plan evidence covering generation time','completed provider request and response','exact artifact hash binding','voice and model identity','supplemental terms applicability')
    WHEN c.candidate_kind='MASTER'
      THEN json_array('exact parent artifact IDs and hashes','PASS rights receipt for every parent','artifact-to-parent manifest binding','composite manifest hash')
    ELSE json_array('exact artifact hash','author or work-for-hire identity','source or render manifest','territory and commercial-use term')
  END,
  'EVALUATION_RIGHTS_EVIDENCE_POLICY_V1'
FROM `v7_evaluation_candidates` c
JOIN `v7_evaluation_verification_receipts` r ON r.id=c.latest_verification_receipt_id
JOIN `production_v2_artifacts` a ON c.source_table='production_v2_artifacts' AND a.id=c.source_id
WHERE c.verification_state='PARTIAL_RIGHTS_PENDING'
  AND r.rights_basis='PROVIDER_TERMS_RECEIPT_MISSING';
