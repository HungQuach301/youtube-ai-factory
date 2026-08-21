ALTER TABLE `v7_sequential_artifacts` ADD COLUMN `immutability_state` text NOT NULL DEFAULT 'MUTABLE';
--> statement-breakpoint
ALTER TABLE `v7_sequential_artifacts` ADD COLUMN `eligibility_state` text NOT NULL DEFAULT 'PENDING';
--> statement-breakpoint
ALTER TABLE `v7_sequential_artifacts` ADD COLUMN `eligibility_reason_json` text NOT NULL DEFAULT '[]';
--> statement-breakpoint
ALTER TABLE `v7_sequential_artifacts` ADD COLUMN `canonicalization_version` text NOT NULL DEFAULT 'JCS_NFC_V1';
--> statement-breakpoint
ALTER TABLE `v7_sequential_artifacts` ADD COLUMN `capability_binding_hash` text;
--> statement-breakpoint
UPDATE `v7_sequential_artifacts`
SET `immutability_state`=CASE WHEN `lifecycle_state`='SUPERSEDED' THEN 'SUPERSEDED' WHEN `lifecycle_state`='FROZEN' THEN 'SEALED' ELSE 'MUTABLE' END,
    `eligibility_state`=CASE WHEN `lifecycle_state`='SUPERSEDED' THEN 'SUPERSEDED' ELSE 'BLOCKED' END,
    `eligibility_reason_json`=CASE WHEN `lifecycle_state`='SUPERSEDED' THEN '["ARTIFACT_SUPERSEDED"]' ELSE '["FP3_1_RECONCILIATION_REQUIRED"]' END;
--> statement-breakpoint
ALTER TABLE `v7_sequential_stage_runs` ADD COLUMN `active_fencing_token` integer;
--> statement-breakpoint
ALTER TABLE `v7_sequential_stage_runs` ADD COLUMN `eligibility_state` text NOT NULL DEFAULT 'BLOCKED';
--> statement-breakpoint
ALTER TABLE `v7_sequential_leases` ADD COLUMN `fencing_token` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `v7_sequential_leases` ADD COLUMN `heartbeat_at` text;
--> statement-breakpoint
ALTER TABLE `v7_sequential_leases` ADD COLUMN `orphaned_at` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_sequential_lease_program_fence_uq` ON `v7_sequential_leases` (`program_id`,`fencing_token`);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_sequential_one_active_lease_uq` ON `v7_sequential_leases` (`program_id`) WHERE `lifecycle_state`='ACTIVE';
--> statement-breakpoint
CREATE TRIGGER `v7_sequential_active_lease_requires_ready_stage`
BEFORE INSERT ON `v7_sequential_leases`
WHEN NEW.`lifecycle_state`='ACTIVE' AND NOT EXISTS (
  SELECT 1 FROM `v7_sequential_stage_runs`
  WHERE `queue_id`=NEW.`queue_id` AND `stage_key`=NEW.`stage_key`
    AND `lifecycle_state`='READY' AND `active_fencing_token` IS NULL
)
BEGIN SELECT RAISE(ABORT, 'INTEGRITY_STAGE_NOT_READY_FOR_LEASE'); END;
--> statement-breakpoint
ALTER TABLE `v7_sequential_provider_requests` ADD COLUMN `lease_id` text;
--> statement-breakpoint
ALTER TABLE `v7_sequential_provider_requests` ADD COLUMN `fencing_token` integer;
--> statement-breakpoint
ALTER TABLE `v7_sequential_provider_requests` ADD COLUMN `reservation_id` text;
--> statement-breakpoint
ALTER TABLE `v7_sequential_provider_requests` ADD COLUMN `trace_id` text;
--> statement-breakpoint
ALTER TABLE `v7_sequential_provider_requests` ADD COLUMN `failure_class` text;
--> statement-breakpoint
ALTER TABLE `v7_first_pass_capabilities` ADD COLUMN `active_settings_hash` text NOT NULL DEFAULT 'UNRESOLVED';
--> statement-breakpoint
UPDATE `v7_first_pass_capabilities` SET `active_settings_hash`='4a4078fced5a30a4e0896d95419555893122fd8889cdd53f5501c86eca6f292d' WHERE `id`='FPC-SHOT-CUE-COMPILER' AND `capability_version`='1.1.0';
--> statement-breakpoint
CREATE TABLE `v7_integrity_fence_counters` (
  `program_id` text PRIMARY KEY NOT NULL,
  `next_token` integer NOT NULL DEFAULT 0,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `v7_integrity_fence_counters` (`program_id`,`next_token`)
SELECT `id`,COALESCE((SELECT MAX(`fencing_token`) FROM `v7_sequential_leases` l WHERE l.`program_id`=p.`id`),0) FROM `v7_sequential_programs` p;
--> statement-breakpoint
CREATE TABLE `v7_integrity_cost_reservations` (
  `id` text PRIMARY KEY NOT NULL,
  `plan_id` text NOT NULL,
  `program_id` text NOT NULL,
  `queue_id` text NOT NULL,
  `stage_key` text NOT NULL,
  `operation` text NOT NULL,
  `providers_json` text NOT NULL,
  `idempotency_key` text NOT NULL,
  `intent_hash` text NOT NULL,
  `lifecycle_state` text NOT NULL,
  `reserved_provider_requests` integer NOT NULL,
  `reserved_spend_usd` real NOT NULL,
  `actual_provider_requests` integer NOT NULL DEFAULT 0,
  `actual_spend_usd` real NOT NULL DEFAULT 0,
  `lease_id` text NOT NULL,
  `fencing_token` integer NOT NULL,
  `trace_id` text NOT NULL,
  `settled_at` text,
  `orphaned_at` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_integrity_reservation_idempotency_uq` ON `v7_integrity_cost_reservations` (`idempotency_key`);
--> statement-breakpoint
CREATE INDEX `v7_integrity_reservation_plan_state_idx` ON `v7_integrity_cost_reservations` (`plan_id`,`lifecycle_state`);
--> statement-breakpoint
CREATE TRIGGER `v7_integrity_reservation_request_ceiling`
BEFORE INSERT ON `v7_integrity_cost_reservations`
WHEN (SELECT `actual_provider_requests` FROM `v7_sequential_budget_plans` WHERE `id`=NEW.`plan_id`)
  + COALESCE((SELECT SUM(`reserved_provider_requests`) FROM `v7_integrity_cost_reservations` WHERE `plan_id`=NEW.`plan_id` AND `lifecycle_state` IN ('RESERVED','DISPATCHED')),0)
  + NEW.`reserved_provider_requests`
  > (SELECT `max_provider_requests` FROM `v7_sequential_budget_plans` WHERE `id`=NEW.`plan_id`)
BEGIN SELECT RAISE(ABORT, 'INTEGRITY_REQUEST_CEILING_EXCEEDED'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_integrity_reservation_spend_ceiling`
BEFORE INSERT ON `v7_integrity_cost_reservations`
WHEN (SELECT `actual_spend_usd` FROM `v7_sequential_budget_plans` WHERE `id`=NEW.`plan_id`)
  + COALESCE((SELECT SUM(`reserved_spend_usd`) FROM `v7_integrity_cost_reservations` WHERE `plan_id`=NEW.`plan_id` AND `lifecycle_state` IN ('RESERVED','DISPATCHED')),0)
  + NEW.`reserved_spend_usd`
  > (SELECT `max_spend_usd` FROM `v7_sequential_budget_plans` WHERE `id`=NEW.`plan_id`)
BEGIN SELECT RAISE(ABORT, 'INTEGRITY_SPEND_CEILING_EXCEEDED'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_integrity_budget_actual_request_ceiling`
BEFORE UPDATE OF `actual_provider_requests` ON `v7_sequential_budget_plans`
WHEN NEW.`actual_provider_requests` > NEW.`max_provider_requests`
BEGIN SELECT RAISE(ABORT, 'INTEGRITY_ACTUAL_REQUEST_CEILING_EXCEEDED'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_integrity_budget_actual_spend_ceiling`
BEFORE UPDATE OF `actual_spend_usd` ON `v7_sequential_budget_plans`
WHEN NEW.`actual_spend_usd` > NEW.`max_spend_usd`
BEGIN SELECT RAISE(ABORT, 'INTEGRITY_ACTUAL_SPEND_CEILING_EXCEEDED'); END;
--> statement-breakpoint
CREATE TABLE `v7_integrity_dispatch_traces` (
  `id` text PRIMARY KEY NOT NULL,
  `program_id` text NOT NULL,
  `queue_id` text NOT NULL,
  `stage_key` text NOT NULL,
  `operation` text NOT NULL,
  `decision` text NOT NULL,
  `reason_json` text NOT NULL,
  `redacted_attributes_json` text NOT NULL,
  `lease_id` text,
  `fencing_token` integer,
  `reservation_id` text,
  `capability_qualification_ids_json` text NOT NULL DEFAULT '[]',
  `safety_state` text NOT NULL,
  `rights_state` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `completed_at` text
);
--> statement-breakpoint
CREATE INDEX `v7_integrity_trace_queue_created_idx` ON `v7_integrity_dispatch_traces` (`queue_id`,`created_at`);
--> statement-breakpoint
CREATE TABLE `v7_integrity_incidents` (
  `id` text PRIMARY KEY NOT NULL,
  `program_id` text NOT NULL,
  `queue_id` text,
  `stage_key` text,
  `incident_type` text NOT NULL,
  `severity` text NOT NULL,
  `lifecycle_state` text NOT NULL,
  `failure_class` text NOT NULL,
  `trace_id` text,
  `detail_json` text NOT NULL,
  `owner` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `resolved_at` text
);
--> statement-breakpoint
INSERT INTO `v7_integrity_incidents` (`id`,`program_id`,`queue_id`,`stage_key`,`incident_type`,`severity`,`lifecycle_state`,`failure_class`,`detail_json`,`owner`)
SELECT 'FP3-1-SAFETY-SCOPE-OPEN',p.`id`,q.`id`,'03/06','SAFETY_SCOPE_NOT_EVALUATED','P0','OPEN','SAFETY','{"standardId":"VQ-M0-SAFETY-SCOPE","state":"NOT_EVALUATED","dispatchEligible":false}','CONTENT_SAFETY_OWNER'
FROM `v7_sequential_programs` p JOIN `v7_sequential_queue` q ON q.`program_id`=p.`id` AND q.`sequence`=1
WHERE p.`channel_id`='channel-hidden-systems';
