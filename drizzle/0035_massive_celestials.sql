CREATE TABLE `niche_portfolio_commitment_audits` (
	`id` text PRIMARY KEY NOT NULL,
	`commitment_id` text NOT NULL,
	`portfolio_id` text NOT NULL,
	`event_type` text DEFAULT 'NICHE_COMMITTED' NOT NULL,
	`actor_email` text NOT NULL,
	`actor_role` text DEFAULT 'PORTFOLIO_GOVERNANCE' NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`correlation_id` text NOT NULL,
	`causation_id` text,
	`evidence_lineage_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`commitment_id`) REFERENCES `niche_portfolio_commitments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `niche_commitment_audits_commitment_uq` ON `niche_portfolio_commitment_audits` (`commitment_id`);--> statement-breakpoint
CREATE INDEX `niche_commitment_audits_created_idx` ON `niche_portfolio_commitment_audits` (`portfolio_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `niche_portfolio_commitments` (
	`id` text PRIMARY KEY NOT NULL,
	`portfolio_id` text NOT NULL,
	`commitment_version` integer NOT NULL,
	`action` text DEFAULT 'COMMIT_NICHE' NOT NULL,
	`lifecycle_state` text DEFAULT 'COMMITTED' NOT NULL,
	`selection_id` text NOT NULL,
	`selection_version` integer NOT NULL,
	`priority_set_id` text NOT NULL,
	`priority_version` integer NOT NULL,
	`comparable_set_hash` text NOT NULL,
	`channel_id` text NOT NULL,
	`program_id` text NOT NULL,
	`opportunity_id` text NOT NULL,
	`opportunity_origin` text NOT NULL,
	`aggregate_version` integer NOT NULL,
	`evidence_version` integer NOT NULL,
	`scoring_version` integer NOT NULL,
	`system_rank_at_commitment` integer NOT NULL,
	`expert_priority_at_commitment` integer NOT NULL,
	`rationale` text NOT NULL,
	`governance_owner` text NOT NULL,
	`risk_acceptance` text NOT NULL,
	`review_cadence_days` integer NOT NULL,
	`revisit_triggers_json` text NOT NULL,
	`evidence_reviewed` integer DEFAULT false NOT NULL,
	`priority_reviewed` integer DEFAULT false NOT NULL,
	`no_activation_acknowledged` integer DEFAULT false NOT NULL,
	`actor_email` text NOT NULL,
	`actor_display_name` text NOT NULL,
	`actor_role` text DEFAULT 'PORTFOLIO_GOVERNANCE' NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`correlation_id` text NOT NULL,
	`causation_id` text,
	`supersedes_commitment_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`selection_id`) REFERENCES `niche_portfolio_selections`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`priority_set_id`) REFERENCES `niche_expert_priority_sets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `niche_commitments_portfolio_version_uq` ON `niche_portfolio_commitments` (`portfolio_id`,`commitment_version`);--> statement-breakpoint
CREATE UNIQUE INDEX `niche_commitments_idempotency_uq` ON `niche_portfolio_commitments` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `niche_commitments_opportunity_created_idx` ON `niche_portfolio_commitments` (`opportunity_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `niche_portfolio_selection_audits` (
	`id` text PRIMARY KEY NOT NULL,
	`selection_id` text NOT NULL,
	`portfolio_id` text NOT NULL,
	`event_type` text DEFAULT 'NICHE_SELECTED_PENDING_COMMITMENT' NOT NULL,
	`actor_email` text NOT NULL,
	`actor_role` text DEFAULT 'OWNER_EXPERT' NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`correlation_id` text NOT NULL,
	`causation_id` text,
	`evidence_lineage_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`selection_id`) REFERENCES `niche_portfolio_selections`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `niche_selection_audits_selection_uq` ON `niche_portfolio_selection_audits` (`selection_id`);--> statement-breakpoint
CREATE INDEX `niche_selection_audits_created_idx` ON `niche_portfolio_selection_audits` (`portfolio_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `niche_portfolio_selections` (
	`id` text PRIMARY KEY NOT NULL,
	`portfolio_id` text NOT NULL,
	`selection_version` integer NOT NULL,
	`action` text DEFAULT 'SELECT_NICHE_FOR_COMMITMENT' NOT NULL,
	`lifecycle_state` text DEFAULT 'SELECTED_PENDING_COMMITMENT' NOT NULL,
	`priority_set_id` text NOT NULL,
	`priority_version` integer NOT NULL,
	`comparable_set_hash` text NOT NULL,
	`channel_id` text NOT NULL,
	`program_id` text NOT NULL,
	`opportunity_id` text NOT NULL,
	`opportunity_origin` text NOT NULL,
	`aggregate_version` integer NOT NULL,
	`evidence_version` integer NOT NULL,
	`scoring_version` integer NOT NULL,
	`system_rank_at_selection` integer NOT NULL,
	`expert_priority_at_selection` integer NOT NULL,
	`rationale` text NOT NULL,
	`tradeoffs_json` text NOT NULL,
	`commitment_conditions_json` text NOT NULL,
	`actor_email` text NOT NULL,
	`actor_display_name` text NOT NULL,
	`actor_role` text DEFAULT 'OWNER_EXPERT' NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`correlation_id` text NOT NULL,
	`causation_id` text,
	`supersedes_selection_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`priority_set_id`) REFERENCES `niche_expert_priority_sets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `niche_selections_portfolio_version_uq` ON `niche_portfolio_selections` (`portfolio_id`,`selection_version`);--> statement-breakpoint
CREATE UNIQUE INDEX `niche_selections_idempotency_uq` ON `niche_portfolio_selections` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `niche_selections_opportunity_created_idx` ON `niche_portfolio_selections` (`opportunity_id`,`created_at`);