CREATE TABLE `v7_browser_assurance_tasks` (
  `id` text PRIMARY KEY NOT NULL,
  `program_id` text NOT NULL,
  `queue_id` text NOT NULL,
  `golden_sequence_id` text NOT NULL,
  `master_asset_id` text NOT NULL,
  `master_sha256` text NOT NULL CHECK (length(`master_sha256`) = 64),
  `gate_version` text NOT NULL CHECK (`gate_version` = 'BROWSER_ASSURANCE_GATE_V1'),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('PENDING','PASS','FAIL')),
  `latest_evidence_hash` text,
  `completed_at` text,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`golden_sequence_id`) REFERENCES `v7_golden_sequences`(`id`),
  FOREIGN KEY (`master_asset_id`) REFERENCES `v7_golden_sequence_assets`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_browser_assurance_task_master_uq` ON `v7_browser_assurance_tasks` (`golden_sequence_id`,`master_asset_id`,`gate_version`);
--> statement-breakpoint
CREATE INDEX `v7_browser_assurance_task_queue_idx` ON `v7_browser_assurance_tasks` (`queue_id`,`lifecycle_state`,`created_at`);
--> statement-breakpoint
CREATE TABLE `v7_browser_assurance_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `task_id` text NOT NULL,
  `program_id` text NOT NULL,
  `queue_id` text NOT NULL,
  `golden_sequence_id` text NOT NULL,
  `master_asset_id` text NOT NULL,
  `master_sha256` text NOT NULL CHECK (length(`master_sha256`) = 64),
  `gate_version` text NOT NULL CHECK (`gate_version` = 'BROWSER_ASSURANCE_GATE_V1'),
  `observer_actor` text NOT NULL,
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `decision` text NOT NULL CHECK (`decision` IN ('PASS','FAIL')),
  `observed_json` text NOT NULL,
  `findings_json` text NOT NULL,
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`task_id`) REFERENCES `v7_browser_assurance_tasks`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_browser_assurance_receipt_task_uq` ON `v7_browser_assurance_receipts` (`task_id`);
--> statement-breakpoint
CREATE TRIGGER `v7_browser_assurance_receipt_no_update`
BEFORE UPDATE ON `v7_browser_assurance_receipts`
BEGIN SELECT RAISE(ABORT, 'BROWSER_ASSURANCE_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_browser_assurance_receipt_no_delete`
BEFORE DELETE ON `v7_browser_assurance_receipts`
BEGIN SELECT RAISE(ABORT, 'BROWSER_ASSURANCE_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint

UPDATE `v7_video_quality_standards`
SET `metric`='exact-master browser playback plus independent rendered-experience assurance',
    `threshold_or_range`='full visible playback; >=98% continuous coverage; pause/resume/seek/ended; audio and motion observed; keyboard focus and zoom/reflow PASS; console errors=0; open findings=0',
    `evidence_required_json`='["MASTER"]',
    `owning_stage`='14',
    `failure_action`='REOPEN'
WHERE `standard_version`='VIDEO_PRODUCTION_QUALITY_STANDARD_V2' AND `id`='VQ-M1-GOLDEN-PLAYBACK';
--> statement-breakpoint

INSERT INTO `v7_browser_assurance_tasks`
  (`id`,`program_id`,`queue_id`,`golden_sequence_id`,`master_asset_id`,`master_sha256`,`gate_version`,`lifecycle_state`)
SELECT
  'browser-assurance-task:' || g.id || ':' || a.id,g.program_id,g.queue_id,g.id,a.id,lower(a.sha256),'BROWSER_ASSURANCE_GATE_V1','PENDING'
FROM `v7_golden_sequences` g
JOIN `v7_golden_sequence_assets` a ON a.golden_sequence_id=g.id AND a.role='GOLDEN_MASTER_VIDEO'
WHERE g.lifecycle_state='AUDIT_PASS_PLAYBACK_REQUIRED'
  AND NOT EXISTS (SELECT 1 FROM `v7_browser_assurance_tasks` t WHERE t.golden_sequence_id=g.id AND t.master_asset_id=a.id);
