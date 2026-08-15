CREATE TABLE `niche_expert_priority_audits` (
	`id` text PRIMARY KEY NOT NULL,
	`priority_set_id` text NOT NULL,
	`portfolio_id` text NOT NULL,
	`event_type` text DEFAULT 'NICHE_EXPERT_PRIORITY_SET_RECORDED' NOT NULL,
	`actor_email` text NOT NULL,
	`actor_role` text DEFAULT 'OWNER_EXPERT' NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`correlation_id` text NOT NULL,
	`causation_id` text,
	`evidence_lineage_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`priority_set_id`) REFERENCES `niche_expert_priority_sets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `niche_priority_audits_set_uq` ON `niche_expert_priority_audits` (`priority_set_id`);--> statement-breakpoint
CREATE INDEX `niche_priority_audits_created_idx` ON `niche_expert_priority_audits` (`portfolio_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `niche_expert_priority_items` (
	`id` text PRIMARY KEY NOT NULL,
	`priority_set_id` text NOT NULL,
	`portfolio_id` text NOT NULL,
	`priority_version` integer NOT NULL,
	`channel_id` text NOT NULL,
	`program_id` text NOT NULL,
	`opportunity_id` text NOT NULL,
	`opportunity_origin` text NOT NULL,
	`aggregate_version` integer NOT NULL,
	`evidence_version` integer NOT NULL,
	`scoring_version` integer NOT NULL,
	`expert_priority` integer NOT NULL,
	`rationale` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`priority_set_id`) REFERENCES `niche_expert_priority_sets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `niche_priority_items_set_opportunity_uq` ON `niche_expert_priority_items` (`priority_set_id`,`opportunity_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `niche_priority_items_set_priority_uq` ON `niche_expert_priority_items` (`priority_set_id`,`expert_priority`);--> statement-breakpoint
CREATE INDEX `niche_priority_items_opportunity_created_idx` ON `niche_expert_priority_items` (`opportunity_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `niche_expert_priority_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`portfolio_id` text NOT NULL,
	`priority_version` integer NOT NULL,
	`action` text DEFAULT 'SET_NICHE_PRIORITY' NOT NULL,
	`comparable_set_hash` text NOT NULL,
	`item_count` integer NOT NULL,
	`portfolio_rationale` text NOT NULL,
	`actor_email` text NOT NULL,
	`actor_display_name` text NOT NULL,
	`actor_role` text DEFAULT 'OWNER_EXPERT' NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`correlation_id` text NOT NULL,
	`causation_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `niche_priority_sets_portfolio_version_uq` ON `niche_expert_priority_sets` (`portfolio_id`,`priority_version`);--> statement-breakpoint
CREATE UNIQUE INDEX `niche_priority_sets_idempotency_uq` ON `niche_expert_priority_sets` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `niche_priority_sets_created_idx` ON `niche_expert_priority_sets` (`portfolio_id`,`created_at`);