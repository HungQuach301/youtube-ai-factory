CREATE TABLE `v7_evaluation_factory_qa_routing_adjudications` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `task_id` text NOT NULL,
  `source_receipt_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'FACTORY_QA_ROUTING_ADJUDICATION_V1'),
  `original_surface` text NOT NULL CHECK (`original_surface` = 'BROWSER_REQUIRED'),
  `corrected_surface` text NOT NULL CHECK (`corrected_surface` = 'STRUCTURED_EVIDENCE_ONLY'),
  `exact_artifact_hash` text NOT NULL CHECK (length(`exact_artifact_hash`) = 64),
  `mime_type` text NOT NULL CHECK (`mime_type` = 'application/json'),
  `reason_code` text NOT NULL CHECK (`reason_code` = 'NON_MEDIA_MISROUTED_BY_LEGACY_DEFAULT'),
  `actor` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`task_id`) REFERENCES `v7_evaluation_factory_qa_tasks`(`id`),
  FOREIGN KEY (`source_receipt_id`) REFERENCES `v7_evaluation_factory_qa_receipts`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_factory_qa_routing_adjudication_receipt_uq` ON `v7_evaluation_factory_qa_routing_adjudications` (`source_receipt_id`,`policy_version`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_factory_qa_routing_adjudication_no_update`
BEFORE UPDATE ON `v7_evaluation_factory_qa_routing_adjudications`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_FACTORY_QA_ROUTING_ADJUDICATION_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_factory_qa_routing_adjudication_no_delete`
BEFORE DELETE ON `v7_evaluation_factory_qa_routing_adjudications`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_FACTORY_QA_ROUTING_ADJUDICATION_IMMUTABLE'); END;
--> statement-breakpoint
INSERT INTO `v7_evaluation_factory_qa_routing_adjudications`
  (`id`,`channel_id`,`task_id`,`source_receipt_id`,`policy_version`,`original_surface`,`corrected_surface`,`exact_artifact_hash`,`mime_type`,`reason_code`,`actor`)
SELECT
  'factory-qa-routing-adjudication:' || r.id,
  q.channel_id,q.id,r.id,'FACTORY_QA_ROUTING_ADJUDICATION_V1','BROWSER_REQUIRED','STRUCTURED_EVIDENCE_ONLY',lower(q.exact_artifact_hash),'application/json','NON_MEDIA_MISROUTED_BY_LEGACY_DEFAULT','SYSTEM_MIGRATION'
FROM `v7_evaluation_factory_qa_tasks` q
JOIN `v7_evaluation_factory_qa_receipts` r ON r.task_id=q.id AND r.review_surface='BROWSER_REQUIRED'
WHERE q.channel_id='channel-hidden-systems' AND lower(trim(q.mime_type))='application/json';
