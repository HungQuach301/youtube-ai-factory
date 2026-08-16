CREATE TABLE `content_automation_policies` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`policy_version` integer NOT NULL,
	`strategy_activation_id` text NOT NULL,
	`strategy_version` integer NOT NULL,
	`mode` text NOT NULL,
	`lifecycle_state` text DEFAULT 'ACTIVE' NOT NULL,
	`daily_budget_usd` real DEFAULT 0 NOT NULL,
	`monthly_budget_usd` real DEFAULT 0 NOT NULL,
	`per_video_cost_ceiling_usd` real DEFAULT 0 NOT NULL,
	`cadence_per_month` integer DEFAULT 8 NOT NULL,
	`repair_limit` integer DEFAULT 1 NOT NULL,
	`risk_tolerance` text DEFAULT 'LOW' NOT NULL,
	`auto_production` integer DEFAULT false NOT NULL,
	`auto_publish` integer DEFAULT false NOT NULL,
	`escalation_rules_json` text NOT NULL,
	`actor_email` text NOT NULL,
	`actor_display_name` text NOT NULL,
	`actor_role` text DEFAULT 'CHANNEL_OWNER' NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`supersedes_policy_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`strategy_activation_id`) REFERENCES `channel_strategy_activations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_automation_policy_channel_version_uq` ON `content_automation_policies` (`channel_id`,`policy_version`);--> statement-breakpoint
CREATE UNIQUE INDEX `content_automation_policy_idempotency_uq` ON `content_automation_policies` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `content_automation_policy_state_idx` ON `content_automation_policies` (`channel_id`,`lifecycle_state`,`created_at`);--> statement-breakpoint
CREATE TABLE `content_opportunities` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`series_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`system_rank` integer NOT NULL,
	`title` text NOT NULL,
	`audience_problem` text NOT NULL,
	`core_question` text NOT NULL,
	`evidence_refs_json` text NOT NULL,
	`strategy_fit` integer NOT NULL,
	`audience_demand` integer NOT NULL,
	`differentiation` integer NOT NULL,
	`evidence_readiness` integer NOT NULL,
	`production_complexity` text NOT NULL,
	`estimated_cost_usd` real NOT NULL,
	`lifecycle_state` text DEFAULT 'PRIORITIZED' NOT NULL,
	`rationale` text NOT NULL,
	`content_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `content_planning_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`series_id`) REFERENCES `content_series`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_opportunity_run_rank_uq` ON `content_opportunities` (`run_id`,`system_rank`);--> statement-breakpoint
CREATE INDEX `content_opportunity_series_idx` ON `content_opportunities` (`series_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `content_pillars` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`position` integer NOT NULL,
	`title` text NOT NULL,
	`purpose` text NOT NULL,
	`audience_need` text NOT NULL,
	`differentiation` text NOT NULL,
	`evidence_requirement` text NOT NULL,
	`winning_criteria_json` text NOT NULL,
	`lifecycle_state` text DEFAULT 'ACTIVE' NOT NULL,
	`content_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `content_planning_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_pillar_run_position_uq` ON `content_pillars` (`run_id`,`position`);--> statement-breakpoint
CREATE INDEX `content_pillar_channel_idx` ON `content_pillars` (`channel_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `content_planning_audits` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`event_type` text NOT NULL,
	`actor_type` text NOT NULL,
	`actor_email` text,
	`policy_version` integer NOT NULL,
	`strategy_version` integer NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`detail_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_planning_audit_event_uq` ON `content_planning_audits` (`entity_id`,`event_type`);--> statement-breakpoint
CREATE INDEX `content_planning_audit_channel_idx` ON `content_planning_audits` (`channel_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `content_planning_exceptions` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`exception_type` text NOT NULL,
	`severity` text NOT NULL,
	`lifecycle_state` text DEFAULT 'OPEN' NOT NULL,
	`title` text NOT NULL,
	`detail` text NOT NULL,
	`owning_authority` text NOT NULL,
	`resolution` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`resolved_at` text,
	FOREIGN KEY (`run_id`) REFERENCES `content_planning_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `content_planning_exception_state_idx` ON `content_planning_exceptions` (`channel_id`,`lifecycle_state`,`created_at`);--> statement-breakpoint
CREATE TABLE `content_planning_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`run_version` integer NOT NULL,
	`policy_id` text NOT NULL,
	`policy_version` integer NOT NULL,
	`strategy_activation_id` text NOT NULL,
	`strategy_version` integer NOT NULL,
	`lifecycle_state` text DEFAULT 'COMPLETE' NOT NULL,
	`horizon_days` integer DEFAULT 30 NOT NULL,
	`pillar_count` integer NOT NULL,
	`series_count` integer NOT NULL,
	`opportunity_count` integer NOT NULL,
	`plan_item_count` integer NOT NULL,
	`brief_count` integer NOT NULL,
	`exception_count` integer DEFAULT 0 NOT NULL,
	`provider_requests` integer DEFAULT 0 NOT NULL,
	`spend_usd` real DEFAULT 0 NOT NULL,
	`actor_type` text DEFAULT 'SYSTEM_AUTOPILOT' NOT NULL,
	`policy_snapshot_json` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`policy_id`) REFERENCES `content_automation_policies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`strategy_activation_id`) REFERENCES `channel_strategy_activations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_planning_run_channel_version_uq` ON `content_planning_runs` (`channel_id`,`run_version`);--> statement-breakpoint
CREATE UNIQUE INDEX `content_planning_run_idempotency_uq` ON `content_planning_runs` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `content_planning_run_strategy_idx` ON `content_planning_runs` (`strategy_activation_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `content_series` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`pillar_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`position` integer NOT NULL,
	`title` text NOT NULL,
	`format` text NOT NULL,
	`repeatable_promise` text NOT NULL,
	`cadence_weight` integer NOT NULL,
	`lifecycle_state` text DEFAULT 'ACTIVE' NOT NULL,
	`content_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `content_planning_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pillar_id`) REFERENCES `content_pillars`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_series_run_position_uq` ON `content_series` (`run_id`,`position`);--> statement-breakpoint
CREATE INDEX `content_series_pillar_idx` ON `content_series` (`pillar_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `editorial_plan_items` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`opportunity_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`publish_offset_days` integer NOT NULL,
	`lifecycle_state` text DEFAULT 'PLANNED' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `editorial_plans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`opportunity_id`) REFERENCES `content_opportunities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `editorial_plan_item_sequence_uq` ON `editorial_plan_items` (`plan_id`,`sequence`);--> statement-breakpoint
CREATE UNIQUE INDEX `editorial_plan_item_opportunity_uq` ON `editorial_plan_items` (`plan_id`,`opportunity_id`);--> statement-breakpoint
CREATE TABLE `editorial_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`plan_version` integer NOT NULL,
	`horizon_days` integer NOT NULL,
	`cadence_per_month` integer NOT NULL,
	`lifecycle_state` text DEFAULT 'AUTO_APPROVED' NOT NULL,
	`rationale` text NOT NULL,
	`content_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `content_planning_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `editorial_plan_channel_version_uq` ON `editorial_plans` (`channel_id`,`plan_version`);--> statement-breakpoint
CREATE UNIQUE INDEX `editorial_plan_run_uq` ON `editorial_plans` (`run_id`);--> statement-breakpoint
CREATE TABLE `production_briefs_v1` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`plan_item_id` text NOT NULL,
	`opportunity_id` text NOT NULL,
	`brief_version` integer DEFAULT 1 NOT NULL,
	`viewer_payoff` text NOT NULL,
	`hook` text NOT NULL,
	`narrative_structure_json` text NOT NULL,
	`claims_json` text NOT NULL,
	`evidence_requirements_json` text NOT NULL,
	`visual_opportunities_json` text NOT NULL,
	`risk_controls_json` text NOT NULL,
	`target_duration_seconds` integer NOT NULL,
	`cost_ceiling_usd` real NOT NULL,
	`lifecycle_state` text DEFAULT 'READY_FOR_PRODUCTION' NOT NULL,
	`content_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `content_planning_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`plan_item_id`) REFERENCES `editorial_plan_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`opportunity_id`) REFERENCES `content_opportunities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `production_brief_plan_item_uq` ON `production_briefs_v1` (`plan_item_id`);--> statement-breakpoint
CREATE INDEX `production_brief_run_idx` ON `production_briefs_v1` (`run_id`,`created_at`);
