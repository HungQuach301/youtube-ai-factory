CREATE TABLE `niche_expert_decision_audits` (
	`id` text PRIMARY KEY NOT NULL,
	`decision_id` text NOT NULL,
	`program_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`event_type` text DEFAULT 'NICHE_EXPERT_DECISION_RECORDED' NOT NULL,
	`actor_email` text NOT NULL,
	`actor_role` text DEFAULT 'OWNER_EXPERT' NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`correlation_id` text NOT NULL,
	`causation_id` text,
	`evidence_lineage_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`decision_id`) REFERENCES `niche_expert_decisions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `niche_expert_decision_audits_decision_uq` ON `niche_expert_decision_audits` (`decision_id`);--> statement-breakpoint
CREATE INDEX `niche_expert_decision_audits_program_created_idx` ON `niche_expert_decision_audits` (`program_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `niche_expert_decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`portfolio_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`program_id` text NOT NULL,
	`aggregate_version` integer NOT NULL,
	`decision_version` integer NOT NULL,
	`action` text NOT NULL,
	`candidate_id` text NOT NULL,
	`candidate_version` integer NOT NULL,
	`evidence_version` integer NOT NULL,
	`actor_email` text NOT NULL,
	`actor_display_name` text NOT NULL,
	`actor_role` text DEFAULT 'OWNER_EXPERT' NOT NULL,
	`rationale` text NOT NULL,
	`reusable_asset_type` text NOT NULL,
	`reusable_asset_summary` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`correlation_id` text NOT NULL,
	`causation_id` text,
	`supersedes_decision_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `niche_expert_decisions_program_version_uq` ON `niche_expert_decisions` (`program_id`,`decision_version`);--> statement-breakpoint
CREATE UNIQUE INDEX `niche_expert_decisions_idempotency_uq` ON `niche_expert_decisions` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `niche_expert_decisions_channel_created_idx` ON `niche_expert_decisions` (`channel_id`,`created_at`);