CREATE TABLE `content_episode_concepts_v2` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`opportunity_id` text NOT NULL,
	`series_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`title` text NOT NULL,
	`core_question` text NOT NULL,
	`angle` text NOT NULL,
	`evidence_refs_json` text NOT NULL,
	`estimated_cost_usd` real NOT NULL,
	`lifecycle_state` text DEFAULT 'APPROVED_FOR_PLAN' NOT NULL,
	`content_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `content_planning_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`opportunity_id`) REFERENCES `content_opportunities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`series_id`) REFERENCES `content_series`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_episode_concept_run_sequence_uq` ON `content_episode_concepts_v2` (`run_id`,`sequence`);--> statement-breakpoint
CREATE UNIQUE INDEX `content_episode_concept_run_hash_uq` ON `content_episode_concepts_v2` (`run_id`,`content_hash`);--> statement-breakpoint
CREATE INDEX `content_episode_concept_opportunity_idx` ON `content_episode_concepts_v2` (`opportunity_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `editorial_plan_items_v2` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`episode_concept_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`publish_offset_days` integer NOT NULL,
	`lifecycle_state` text DEFAULT 'PLANNED' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `editorial_plans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`episode_concept_id`) REFERENCES `content_episode_concepts_v2`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `editorial_plan_item_v2_sequence_uq` ON `editorial_plan_items_v2` (`plan_id`,`sequence`);--> statement-breakpoint
CREATE UNIQUE INDEX `editorial_plan_item_v2_episode_uq` ON `editorial_plan_items_v2` (`plan_id`,`episode_concept_id`);--> statement-breakpoint
CREATE TABLE `production_briefs_v2` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`plan_item_id` text NOT NULL,
	`episode_concept_id` text NOT NULL,
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
	FOREIGN KEY (`plan_item_id`) REFERENCES `editorial_plan_items_v2`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`episode_concept_id`) REFERENCES `content_episode_concepts_v2`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `production_brief_v2_plan_item_uq` ON `production_briefs_v2` (`plan_item_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `production_brief_v2_episode_uq` ON `production_briefs_v2` (`episode_concept_id`);--> statement-breakpoint
CREATE INDEX `production_brief_v2_run_idx` ON `production_briefs_v2` (`run_id`,`created_at`);