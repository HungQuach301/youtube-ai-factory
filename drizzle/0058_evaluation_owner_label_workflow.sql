CREATE TABLE `v7_evaluation_owner_label_tasks` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `candidate_id` text NOT NULL,
  `exact_artifact_hash` text NOT NULL CHECK (length(`exact_artifact_hash`) = 64),
  `candidate_kind` text NOT NULL,
  `artifact_type` text NOT NULL,
  `taxonomy_version` text NOT NULL CHECK (`taxonomy_version` = 'EVALUATION_DEFECT_TAXONOMY_V1'),
  `requirements_json` text NOT NULL,
  `task_state` text NOT NULL DEFAULT 'OPEN' CHECK (`task_state` = 'OPEN'),
  `policy_version` text NOT NULL CHECK (`policy_version` = 'EVALUATION_OWNER_LABEL_POLICY_V1'),
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`candidate_id`) REFERENCES `v7_evaluation_candidates`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_owner_label_task_uq` ON `v7_evaluation_owner_label_tasks` (`candidate_id`,`policy_version`);
--> statement-breakpoint
CREATE INDEX `v7_evaluation_owner_label_task_queue_idx` ON `v7_evaluation_owner_label_tasks` (`channel_id`,`task_state`,`candidate_kind`,`created_at`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_owner_label_task_no_update`
BEFORE UPDATE ON `v7_evaluation_owner_label_tasks`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_OWNER_LABEL_TASK_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_owner_label_task_no_delete`
BEFORE DELETE ON `v7_evaluation_owner_label_tasks`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_OWNER_LABEL_TASK_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_owner_label_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `task_id` text NOT NULL,
  `candidate_id` text NOT NULL,
  `exact_artifact_hash` text NOT NULL CHECK (length(`exact_artifact_hash`) = 64),
  `decision_state` text NOT NULL CHECK (`decision_state` IN ('REJECTED_DEFECT_PRESENT','CLEAN_NEGATIVE_CONTROL','EXCLUDE_UNUSABLE')),
  `rationale` text NOT NULL CHECK (length(`rationale`) BETWEEN 12 AND 2000),
  `labels_json` text NOT NULL,
  `taxonomy_version` text NOT NULL CHECK (`taxonomy_version` = 'EVALUATION_DEFECT_TAXONOMY_V1'),
  `taxonomy_manifest_hash` text NOT NULL CHECK (length(`taxonomy_manifest_hash`) = 64),
  `present_count` integer NOT NULL CHECK (`present_count` >= 0),
  `absent_count` integer NOT NULL CHECK (`absent_count` >= 0),
  `not_applicable_count` integer NOT NULL CHECK (`not_applicable_count` >= 0),
  `idempotency_key` text NOT NULL CHECK (length(`idempotency_key`) BETWEEN 16 AND 160),
  `request_hash` text NOT NULL CHECK (length(`request_hash`) = 64),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `actor` text NOT NULL,
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`task_id`) REFERENCES `v7_evaluation_owner_label_tasks`(`id`),
  FOREIGN KEY (`candidate_id`) REFERENCES `v7_evaluation_candidates`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_owner_label_receipt_task_uq` ON `v7_evaluation_owner_label_receipts` (`task_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_owner_label_receipt_idempotency_uq` ON `v7_evaluation_owner_label_receipts` (`channel_id`,`idempotency_key`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_owner_label_receipt_no_update`
BEFORE UPDATE ON `v7_evaluation_owner_label_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_OWNER_LABEL_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_owner_label_receipt_no_delete`
BEFORE DELETE ON `v7_evaluation_owner_label_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_OWNER_LABEL_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_defect_label_no_update`
BEFORE UPDATE ON `v7_evaluation_defect_labels`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_DEFECT_LABEL_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_defect_label_no_delete`
BEFORE DELETE ON `v7_evaluation_defect_labels`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_DEFECT_LABEL_IMMUTABLE'); END;
--> statement-breakpoint
INSERT INTO `v7_evaluation_owner_label_tasks`
  (`id`,`channel_id`,`candidate_id`,`exact_artifact_hash`,`candidate_kind`,`artifact_type`,`taxonomy_version`,`requirements_json`,`policy_version`)
SELECT
  'evaluation-owner-label-task:' || c.id,
  c.channel_id,
  c.id,
  lower(c.content_hash),
  c.candidate_kind,
  c.artifact_type,
  'EVALUATION_DEFECT_TAXONOMY_V1',
  '["owner-authenticated decision","exact artifact hash","complete active taxonomy","append-only receipt","zero fixture promotion"]',
  'EVALUATION_OWNER_LABEL_POLICY_V1'
FROM `v7_evaluation_candidates` c
WHERE c.lifecycle_state='CANDIDATE_EVIDENCE'
  AND c.verification_state='EVIDENCE_VERIFIED'
  AND c.bytes_state='READBACK_VERIFIED'
  AND c.checksum_state='PASS'
  AND c.provenance_state='PASS'
  AND c.rights_verification_state='PASS'
  AND c.release_eligible=0
  AND length(c.content_hash)=64;
