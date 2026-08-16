CREATE TABLE `channel_strategy_activation_audits` (
	`id` text PRIMARY KEY NOT NULL,
	`activation_id` text NOT NULL,
	`portfolio_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`event_type` text DEFAULT 'CHANNEL_STRATEGY_ACTIVATED' NOT NULL,
	`actor_email` text NOT NULL,
	`actor_role` text DEFAULT 'PORTFOLIO_GOVERNANCE' NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`correlation_id` text NOT NULL,
	`causation_id` text,
	`evidence_lineage_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`activation_id`) REFERENCES `channel_strategy_activations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `channel_strategy_activation_audits_activation_uq` ON `channel_strategy_activation_audits` (`activation_id`);--> statement-breakpoint
CREATE INDEX `channel_strategy_activation_audits_created_idx` ON `channel_strategy_activation_audits` (`channel_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `channel_strategy_activations` (
	`id` text PRIMARY KEY NOT NULL,
	`portfolio_id` text NOT NULL,
	`activation_version` integer NOT NULL,
	`channel_strategy_version` integer NOT NULL,
	`action` text DEFAULT 'ACTIVATE_CHANNEL_STRATEGY' NOT NULL,
	`lifecycle_state` text DEFAULT 'ACTIVATED' NOT NULL,
	`commitment_id` text NOT NULL,
	`commitment_version` integer NOT NULL,
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
	`system_rank_at_activation` integer NOT NULL,
	`expert_priority_at_activation` integer NOT NULL,
	`strategy_owner` text NOT NULL,
	`rationale` text NOT NULL,
	`viewer_promise` text NOT NULL,
	`differentiation` text NOT NULL,
	`audience_focus` text NOT NULL,
	`content_boundaries_json` text NOT NULL,
	`success_measures_json` text NOT NULL,
	`review_cadence_days` integer NOT NULL,
	`commitment_reviewed` integer DEFAULT false NOT NULL,
	`activation_acknowledged` integer DEFAULT false NOT NULL,
	`actor_email` text NOT NULL,
	`actor_display_name` text NOT NULL,
	`actor_role` text DEFAULT 'PORTFOLIO_GOVERNANCE' NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`correlation_id` text NOT NULL,
	`causation_id` text,
	`supersedes_activation_id` text,
	`supersedes_channel_strategy_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`commitment_id`) REFERENCES `niche_portfolio_commitments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`selection_id`) REFERENCES `niche_portfolio_selections`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`priority_set_id`) REFERENCES `niche_expert_priority_sets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `channel_strategy_activation_portfolio_version_uq` ON `channel_strategy_activations` (`portfolio_id`,`activation_version`);--> statement-breakpoint
CREATE UNIQUE INDEX `channel_strategy_activation_channel_version_uq` ON `channel_strategy_activations` (`channel_id`,`channel_strategy_version`);--> statement-breakpoint
CREATE UNIQUE INDEX `channel_strategy_activation_idempotency_uq` ON `channel_strategy_activations` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `channel_strategy_activation_commitment_created_idx` ON `channel_strategy_activations` (`commitment_id`,`created_at`);