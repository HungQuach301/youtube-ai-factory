DROP INDEX `v7_evaluation_factory_qa_receipt_task_uq`;
--> statement-breakpoint
ALTER TABLE `v7_evaluation_factory_qa_receipts` ADD COLUMN `calibration_version` text NOT NULL DEFAULT 'FACTORY_QA_CALIBRATION_V1' CHECK (`calibration_version` IN ('FACTORY_QA_CALIBRATION_V1','FACTORY_QA_CALIBRATION_V2'));
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_factory_qa_receipt_task_calibration_uq` ON `v7_evaluation_factory_qa_receipts` (`task_id`,`calibration_version`);
--> statement-breakpoint
ALTER TABLE `v7_evaluation_factory_qa_runs` ADD COLUMN `calibration_version` text NOT NULL DEFAULT 'FACTORY_QA_CALIBRATION_V1' CHECK (`calibration_version` IN ('FACTORY_QA_CALIBRATION_V1','FACTORY_QA_CALIBRATION_V2'));
--> statement-breakpoint
ALTER TABLE `v7_evaluation_factory_qa_registry` ADD COLUMN `calibration_version` text NOT NULL DEFAULT 'FACTORY_QA_CALIBRATION_V1' CHECK (`calibration_version` IN ('FACTORY_QA_CALIBRATION_V1','FACTORY_QA_CALIBRATION_V2'));
--> statement-breakpoint
UPDATE `v7_evaluation_factory_qa_registry`
SET `provider_request_ceiling`=84,`updated_at`=CURRENT_TIMESTAMP
WHERE `channel_id`='channel-hidden-systems' AND `policy_version`='FACTORY_FIRST_QA_POLICY_V1';
