CREATE TABLE `niche_evidence_workflow_audits` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`program_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`opportunity_id` text NOT NULL,
	`event_type` text NOT NULL,
	`actor_email` text NOT NULL,
	`actor_role` text DEFAULT 'OWNER_EXPERT' NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`correlation_id` text NOT NULL,
	`causation_id` text,
	`evidence_lineage_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `niche_evidence_workflow_events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `niche_evidence_audits_event_uq` ON `niche_evidence_workflow_audits` (`event_id`);--> statement-breakpoint
CREATE INDEX `niche_evidence_audits_opportunity_created_idx` ON `niche_evidence_workflow_audits` (`opportunity_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `niche_evidence_workflow_events` (
	`id` text PRIMARY KEY NOT NULL,
	`portfolio_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`program_id` text NOT NULL,
	`opportunity_id` text NOT NULL,
	`opportunity_origin` text NOT NULL,
	`aggregate_version` integer NOT NULL,
	`evidence_version` integer NOT NULL,
	`action` text NOT NULL,
	`plan_version` integer NOT NULL,
	`supporting_questions_json` text,
	`contradicting_questions_json` text,
	`unknown_questions_json` text,
	`source_classes_json` text,
	`provider_allowlist_json` text,
	`max_sources` integer,
	`max_provider_requests` integer,
	`max_spend_cents` integer,
	`validation_status` text,
	`validation_request_id` text,
	`claim_direction` text,
	`claim_statement` text,
	`source_ref` text,
	`source_authority` text,
	`observed_at` text,
	`freshness` text,
	`confidence` integer,
	`affected_axis` text,
	`review_disposition` text,
	`decision_impact` text,
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
CREATE UNIQUE INDEX `niche_evidence_events_opportunity_version_uq` ON `niche_evidence_workflow_events` (`opportunity_id`,`evidence_version`);--> statement-breakpoint
CREATE UNIQUE INDEX `niche_evidence_events_idempotency_uq` ON `niche_evidence_workflow_events` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `niche_evidence_events_program_created_idx` ON `niche_evidence_workflow_events` (`program_id`,`created_at`);