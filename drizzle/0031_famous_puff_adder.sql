CREATE TABLE `niche_hypotheses` (
	`id` text PRIMARY KEY NOT NULL,
	`portfolio_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`program_id` text NOT NULL,
	`aggregate_version` integer NOT NULL,
	`hypothesis_version` integer NOT NULL,
	`origin` text DEFAULT 'EXPERT_SEEDED' NOT NULL,
	`lifecycle_state` text DEFAULT 'EVIDENCE_GATHERING' NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`rationale` text NOT NULL,
	`audience_assumptions_json` text NOT NULL,
	`demand_assumptions_json` text NOT NULL,
	`known_competitors_json` text NOT NULL,
	`winning_thesis` text NOT NULL,
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
CREATE UNIQUE INDEX `niche_hypotheses_program_version_uq` ON `niche_hypotheses` (`program_id`,`hypothesis_version`);--> statement-breakpoint
CREATE UNIQUE INDEX `niche_hypotheses_idempotency_uq` ON `niche_hypotheses` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `niche_hypotheses_channel_created_idx` ON `niche_hypotheses` (`channel_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `niche_hypothesis_audits` (
	`id` text PRIMARY KEY NOT NULL,
	`hypothesis_id` text NOT NULL,
	`program_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`event_type` text DEFAULT 'NICHE_HYPOTHESIS_SUBMITTED' NOT NULL,
	`actor_email` text NOT NULL,
	`actor_role` text DEFAULT 'OWNER_EXPERT' NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`correlation_id` text NOT NULL,
	`causation_id` text,
	`evidence_lineage_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`hypothesis_id`) REFERENCES `niche_hypotheses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `niche_hypothesis_audits_hypothesis_uq` ON `niche_hypothesis_audits` (`hypothesis_id`);--> statement-breakpoint
CREATE INDEX `niche_hypothesis_audits_program_created_idx` ON `niche_hypothesis_audits` (`program_id`,`created_at`);