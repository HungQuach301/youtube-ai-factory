CREATE TABLE `v7_evaluation_factory_qa_registry` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_FIRST_QA_POLICY_V1'),
  `lifecycle_state` text NOT NULL DEFAULT 'CALIBRATION_REQUIRED' CHECK (`lifecycle_state` IN ('CALIBRATION_REQUIRED','CALIBRATION_PASS','CALIBRATION_FAILED','ACTIVE')),
  `owner_attention_policy` text NOT NULL CHECK (`owner_attention_policy` = 'EXCEPTIONS_AND_AUDIT_SAMPLE_ONLY'),
  `provider_request_ceiling` integer NOT NULL CHECK (`provider_request_ceiling` > 0),
  `spend_ceiling_usd` real NOT NULL CHECK (`spend_ceiling_usd` > 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_factory_qa_registry_channel_uq` ON `v7_evaluation_factory_qa_registry` (`channel_id`,`policy_version`);
--> statement-breakpoint
CREATE TABLE `v7_evaluation_factory_qa_tasks` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `owner_task_id` text NOT NULL,
  `candidate_id` text NOT NULL,
  `exact_artifact_hash` text NOT NULL CHECK (length(`exact_artifact_hash`) = 64),
  `candidate_kind` text NOT NULL,
  `artifact_type` text NOT NULL,
  `mime_type` text NOT NULL,
  `task_class` text NOT NULL CHECK (`task_class` IN ('OWNER_ANCHOR','UNREVIEWED_PRIMARY')),
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_FIRST_QA_POLICY_V1'),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`owner_task_id`) REFERENCES `v7_evaluation_owner_label_tasks`(`id`),
  FOREIGN KEY (`candidate_id`) REFERENCES `v7_evaluation_candidates`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_factory_qa_task_candidate_uq` ON `v7_evaluation_factory_qa_tasks` (`candidate_id`,`policy_version`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_factory_qa_task_no_update`
BEFORE UPDATE ON `v7_evaluation_factory_qa_tasks`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_FACTORY_QA_TASK_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_factory_qa_task_no_delete`
BEFORE DELETE ON `v7_evaluation_factory_qa_tasks`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_FACTORY_QA_TASK_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_factory_qa_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `run_mode` text NOT NULL CHECK (`run_mode` IN ('CALIBRATION','BATCH')),
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_FIRST_QA_POLICY_V1'),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('PLANNED','RUNNING','CALIBRATION_PASS','CALIBRATION_FAILED','COMPLETED','PARTIAL','FAILED')),
  `candidate_ids_json` text NOT NULL,
  `planned_candidates` integer NOT NULL CHECK (`planned_candidates` BETWEEN 0 AND 5),
  `processed_candidates` integer NOT NULL DEFAULT 0,
  `provider_requests` integer NOT NULL DEFAULT 0,
  `reserved_usd` real NOT NULL DEFAULT 0 CHECK (`reserved_usd` >= 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` >= 0),
  `anchor_agreements` integer NOT NULL DEFAULT 0,
  `idempotency_key` text NOT NULL,
  `intent_hash` text NOT NULL CHECK (length(`intent_hash`) = 64),
  `actor` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_factory_qa_run_idempotency_uq` ON `v7_evaluation_factory_qa_runs` (`channel_id`,`idempotency_key`);
--> statement-breakpoint
CREATE TABLE `v7_evaluation_factory_qa_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `run_id` text NOT NULL,
  `task_id` text NOT NULL,
  `candidate_id` text NOT NULL,
  `exact_artifact_hash` text NOT NULL CHECK (length(`exact_artifact_hash`) = 64),
  `review_surface` text NOT NULL CHECK (`review_surface` IN ('OPENAI_VISION','BROWSER_REQUIRED','UNSUPPORTED_MEDIA')),
  `decision_state` text NOT NULL CHECK (`decision_state` IN ('LIKELY_DEFECT_PRESENT','LIKELY_CLEAN','NEEDS_OWNER','BROWSER_REQUIRED','UNSUPPORTED_MEDIA')),
  `owner_attention_state` text NOT NULL CHECK (`owner_attention_state` IN ('OWNER_REQUIRED','OWNER_EXCEPTION','AUDIT_SAMPLE','NO_IMMEDIATE_OWNER_ACTION')),
  `labels_json` text NOT NULL,
  `summary` text NOT NULL,
  `model_id` text,
  `provider_response_id` text,
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` IN (0,1)),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` >= 0),
  `request_hash` text NOT NULL CHECK (length(`request_hash`) = 64),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `actor` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`run_id`) REFERENCES `v7_evaluation_factory_qa_runs`(`id`),
  FOREIGN KEY (`task_id`) REFERENCES `v7_evaluation_factory_qa_tasks`(`id`),
  FOREIGN KEY (`candidate_id`) REFERENCES `v7_evaluation_candidates`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_factory_qa_receipt_task_uq` ON `v7_evaluation_factory_qa_receipts` (`task_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_factory_qa_receipt_response_uq` ON `v7_evaluation_factory_qa_receipts` (`provider_response_id`) WHERE `provider_response_id` IS NOT NULL;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_factory_qa_receipt_no_update`
BEFORE UPDATE ON `v7_evaluation_factory_qa_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_FACTORY_QA_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_factory_qa_receipt_no_delete`
BEFORE DELETE ON `v7_evaluation_factory_qa_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_FACTORY_QA_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
INSERT INTO `v7_evaluation_factory_qa_registry`
  (`id`,`channel_id`,`policy_version`,`owner_attention_policy`,`provider_request_ceiling`,`spend_ceiling_usd`)
VALUES
  ('factory-first-qa:channel-hidden-systems','channel-hidden-systems','FACTORY_FIRST_QA_POLICY_V1','EXCEPTIONS_AND_AUDIT_SAMPLE_ONLY',82,6.75);
--> statement-breakpoint
INSERT INTO `v7_evaluation_factory_qa_tasks`
  (`id`,`channel_id`,`owner_task_id`,`candidate_id`,`exact_artifact_hash`,`candidate_kind`,`artifact_type`,`mime_type`,`task_class`,`policy_version`)
SELECT
  'factory-first-qa-task:' || t.candidate_id,
  t.channel_id,
  t.id,
  t.candidate_id,
  lower(t.exact_artifact_hash),
  t.candidate_kind,
  t.artifact_type,
  c.mime_type,
  CASE WHEN EXISTS (SELECT 1 FROM v7_evaluation_owner_label_receipts r WHERE r.task_id=t.id) THEN 'OWNER_ANCHOR' ELSE 'UNREVIEWED_PRIMARY' END,
  'FACTORY_FIRST_QA_POLICY_V1'
FROM v7_evaluation_owner_label_tasks t
JOIN v7_evaluation_candidates c ON c.id=t.candidate_id
JOIN v7_evaluation_correlation_items i ON i.candidate_id=t.candidate_id AND i.policy_version='EVALUATION_CORRELATION_CONTROL_V1'
WHERE t.channel_id='channel-hidden-systems'
  AND i.attention_state='READY_PRIMARY'
  AND i.independent_count_eligible=1;
