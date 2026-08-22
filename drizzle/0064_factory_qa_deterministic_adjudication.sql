ALTER TABLE `v7_evaluation_factory_qa_registry` ADD COLUMN `adjudication_version` text;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_factory_qa_adjudications` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `task_id` text NOT NULL,
  `source_receipt_id` text NOT NULL,
  `adjudication_version` text NOT NULL CHECK (`adjudication_version` = 'FACTORY_QA_DETERMINISTIC_ADJUDICATION_V1'),
  `exact_artifact_hash` text NOT NULL CHECK (length(`exact_artifact_hash`) = 64),
  `deterministic_signals_json` text NOT NULL,
  `decision_state` text NOT NULL CHECK (`decision_state` IN ('LIKELY_DEFECT_PRESENT','LIKELY_CLEAN','NEEDS_OWNER')),
  `labels_json` text NOT NULL,
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `idempotency_key` text NOT NULL,
  `actor` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`task_id`) REFERENCES `v7_evaluation_factory_qa_tasks`(`id`),
  FOREIGN KEY (`source_receipt_id`) REFERENCES `v7_evaluation_factory_qa_receipts`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_factory_qa_adjudication_task_uq` ON `v7_evaluation_factory_qa_adjudications` (`task_id`,`adjudication_version`);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_factory_qa_adjudication_idempotency_uq` ON `v7_evaluation_factory_qa_adjudications` (`channel_id`,`idempotency_key`,`task_id`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_factory_qa_adjudication_no_update`
BEFORE UPDATE ON `v7_evaluation_factory_qa_adjudications`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_FACTORY_QA_ADJUDICATION_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_factory_qa_adjudication_no_delete`
BEFORE DELETE ON `v7_evaluation_factory_qa_adjudications`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_FACTORY_QA_ADJUDICATION_IMMUTABLE'); END;
