CREATE TABLE `niche_scoring_assessment_audits` (
	`id` text PRIMARY KEY NOT NULL,
	`assessment_id` text NOT NULL,
	`program_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`opportunity_id` text NOT NULL,
	`event_type` text DEFAULT 'NICHE_SCORING_ASSESSMENT_RECORDED' NOT NULL,
	`actor_email` text NOT NULL,
	`actor_role` text DEFAULT 'OWNER_EXPERT' NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`correlation_id` text NOT NULL,
	`causation_id` text,
	`evidence_lineage_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`assessment_id`) REFERENCES `niche_scoring_assessments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `niche_scoring_audits_assessment_uq` ON `niche_scoring_assessment_audits` (`assessment_id`);--> statement-breakpoint
CREATE INDEX `niche_scoring_audits_opportunity_created_idx` ON `niche_scoring_assessment_audits` (`opportunity_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `niche_scoring_assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`portfolio_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`program_id` text NOT NULL,
	`opportunity_id` text NOT NULL,
	`opportunity_origin` text NOT NULL,
	`aggregate_version` integer NOT NULL,
	`evidence_version` integer NOT NULL,
	`scoring_version` integer NOT NULL,
	`action` text DEFAULT 'RECORD_NICHE_SCORING_ASSESSMENT' NOT NULL,
	`sufficiency_state` text NOT NULL,
	`sufficiency_gaps_json` text NOT NULL,
	`market_attractiveness_score` integer NOT NULL,
	`market_attractiveness_basis` text NOT NULL,
	`market_attractiveness_evidence_json` text NOT NULL,
	`ability_to_win_score` integer NOT NULL,
	`ability_to_win_basis` text NOT NULL,
	`ability_to_win_evidence_json` text NOT NULL,
	`evidence_confidence_score` integer NOT NULL,
	`evidence_confidence_basis` text NOT NULL,
	`evidence_confidence_evidence_json` text NOT NULL,
	`prerequisites_json` text NOT NULL,
	`winning_criteria_json` text NOT NULL,
	`comparison_eligibility` text NOT NULL,
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
CREATE UNIQUE INDEX `niche_scoring_opportunity_version_uq` ON `niche_scoring_assessments` (`opportunity_id`,`scoring_version`);--> statement-breakpoint
CREATE UNIQUE INDEX `niche_scoring_idempotency_uq` ON `niche_scoring_assessments` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `niche_scoring_program_created_idx` ON `niche_scoring_assessments` (`program_id`,`created_at`);