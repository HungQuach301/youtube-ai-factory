CREATE TABLE `niche_intelligence_bridge_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`portfolio_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`program_id` text NOT NULL,
	`bridge_version` integer NOT NULL,
	`source_artifact_id` text NOT NULL,
	`source_artifact_hash` text NOT NULL,
	`opportunity_count` integer NOT NULL,
	`lifecycle_state` text DEFAULT 'FROZEN' NOT NULL,
	`actor_email` text NOT NULL,
	`actor_role` text DEFAULT 'PORTFOLIO_GOVERNANCE' NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `niche_intelligence_bridge_program_version_uq` ON `niche_intelligence_bridge_runs` (`program_id`,`bridge_version`);--> statement-breakpoint
CREATE UNIQUE INDEX `niche_intelligence_bridge_idempotency_uq` ON `niche_intelligence_bridge_runs` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `niche_intelligence_bridge_channel_created_idx` ON `niche_intelligence_bridge_runs` (`channel_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `niche_intelligence_opportunities` (
	`id` text PRIMARY KEY NOT NULL,
	`bridge_run_id` text NOT NULL,
	`portfolio_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`program_id` text NOT NULL,
	`origin` text DEFAULT 'SYSTEM_DISCOVERED' NOT NULL,
	`lifecycle_state` text DEFAULT 'EVIDENCE_GATHERING' NOT NULL,
	`title` text NOT NULL,
	`content_json` text NOT NULL,
	`content_hash` text NOT NULL,
	`source_artifact_id` text NOT NULL,
	`source_refs_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`bridge_run_id`) REFERENCES `niche_intelligence_bridge_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `niche_intelligence_opportunities_program_created_idx` ON `niche_intelligence_opportunities` (`program_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `niche_intelligence_opportunities_bridge_idx` ON `niche_intelligence_opportunities` (`bridge_run_id`);
