CREATE TABLE `v7_evaluation_factory_browser_qa_registry` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_BROWSER_QA_POLICY_V1'),
  `lifecycle_state` text NOT NULL DEFAULT 'ACTIVE' CHECK (`lifecycle_state` IN ('ACTIVE','PAUSED','QUALIFICATION_FAILED')),
  `authority_boundary` text NOT NULL CHECK (`authority_boundary` = 'INDEPENDENT_REVIEW_ONLY'),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_factory_browser_qa_registry_channel_uq` ON `v7_evaluation_factory_browser_qa_registry` (`channel_id`,`policy_version`);
--> statement-breakpoint
CREATE TABLE `v7_evaluation_factory_browser_qa_tasks` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `factory_task_id` text NOT NULL,
  `source_receipt_id` text NOT NULL,
  `candidate_id` text NOT NULL,
  `exact_artifact_hash` text NOT NULL CHECK (length(`exact_artifact_hash`) = 64),
  `candidate_kind` text NOT NULL,
  `artifact_type` text NOT NULL,
  `mime_type` text NOT NULL CHECK (`mime_type` LIKE 'audio/%' OR `mime_type` LIKE 'video/%'),
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_BROWSER_QA_POLICY_V1'),
  `lifecycle_state` text NOT NULL DEFAULT 'PENDING' CHECK (`lifecycle_state` IN ('PENDING','LIKELY_DEFECT_PRESENT','LIKELY_CLEAN','NEEDS_OWNER')),
  `latest_evidence_hash` text,
  `completed_at` text,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`factory_task_id`) REFERENCES `v7_evaluation_factory_qa_tasks`(`id`),
  FOREIGN KEY (`source_receipt_id`) REFERENCES `v7_evaluation_factory_qa_receipts`(`id`),
  FOREIGN KEY (`candidate_id`) REFERENCES `v7_evaluation_candidates`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_factory_browser_qa_task_candidate_uq` ON `v7_evaluation_factory_browser_qa_tasks` (`candidate_id`,`policy_version`);
--> statement-breakpoint
CREATE INDEX `v7_evaluation_factory_browser_qa_task_queue_idx` ON `v7_evaluation_factory_browser_qa_tasks` (`channel_id`,`lifecycle_state`,`created_at`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_factory_browser_qa_task_binding_no_update`
BEFORE UPDATE OF `channel_id`,`factory_task_id`,`source_receipt_id`,`candidate_id`,`exact_artifact_hash`,`candidate_kind`,`artifact_type`,`mime_type`,`policy_version` ON `v7_evaluation_factory_browser_qa_tasks`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_FACTORY_BROWSER_QA_TASK_BINDING_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_factory_browser_qa_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `task_id` text NOT NULL,
  `candidate_id` text NOT NULL,
  `exact_artifact_hash` text NOT NULL CHECK (length(`exact_artifact_hash`) = 64),
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_BROWSER_QA_POLICY_V1'),
  `session_id` text NOT NULL,
  `decision_state` text NOT NULL CHECK (`decision_state` IN ('LIKELY_DEFECT_PRESENT','LIKELY_CLEAN','NEEDS_OWNER')),
  `owner_attention_state` text NOT NULL CHECK (`owner_attention_state` IN ('OWNER_REQUIRED','NO_IMMEDIATE_OWNER_ACTION')),
  `labels_json` text NOT NULL,
  `summary` text NOT NULL,
  `browser_evidence_json` text NOT NULL,
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `observer_actor` text NOT NULL,
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`task_id`) REFERENCES `v7_evaluation_factory_browser_qa_tasks`(`id`),
  FOREIGN KEY (`candidate_id`) REFERENCES `v7_evaluation_candidates`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_factory_browser_qa_receipt_task_uq` ON `v7_evaluation_factory_browser_qa_receipts` (`task_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_factory_browser_qa_receipt_session_uq` ON `v7_evaluation_factory_browser_qa_receipts` (`session_id`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_factory_browser_qa_receipt_no_update`
BEFORE UPDATE ON `v7_evaluation_factory_browser_qa_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_FACTORY_BROWSER_QA_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_factory_browser_qa_receipt_no_delete`
BEFORE DELETE ON `v7_evaluation_factory_browser_qa_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_FACTORY_BROWSER_QA_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
INSERT INTO `v7_evaluation_factory_browser_qa_registry`
  (`id`,`channel_id`,`policy_version`,`lifecycle_state`,`authority_boundary`)
VALUES
  ('factory-browser-qa:channel-hidden-systems','channel-hidden-systems','FACTORY_BROWSER_QA_POLICY_V1','ACTIVE','INDEPENDENT_REVIEW_ONLY');
--> statement-breakpoint
INSERT INTO `v7_evaluation_factory_browser_qa_tasks`
  (`id`,`channel_id`,`factory_task_id`,`source_receipt_id`,`candidate_id`,`exact_artifact_hash`,`candidate_kind`,`artifact_type`,`mime_type`,`policy_version`)
SELECT
  'factory-browser-qa-task:' || q.candidate_id,
  q.channel_id,q.id,r.id,q.candidate_id,lower(q.exact_artifact_hash),q.candidate_kind,q.artifact_type,q.mime_type,'FACTORY_BROWSER_QA_POLICY_V1'
FROM `v7_evaluation_factory_qa_tasks` q
JOIN `v7_evaluation_factory_qa_receipts` r ON r.task_id=q.id AND r.review_surface='BROWSER_REQUIRED'
WHERE q.channel_id='channel-hidden-systems'
  AND (q.mime_type LIKE 'audio/%' OR q.mime_type LIKE 'video/%');
