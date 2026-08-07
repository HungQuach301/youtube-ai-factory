CREATE TABLE `v7_claim_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`run_id` text NOT NULL,
	`claim_text` text NOT NULL,
	`claim_class` text NOT NULL,
	`risk_level` text NOT NULL,
	`status` text DEFAULT 'CONTROLLED' NOT NULL,
	`source_ids_json` text NOT NULL,
	`counter_evidence` text DEFAULT '' NOT NULL,
	`qualification` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `v7_intelligence_artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`run_id` text NOT NULL,
	`stage_key` text NOT NULL,
	`artifact_type` text NOT NULL,
	`title` text NOT NULL,
	`lifecycle_state` text DEFAULT 'MATERIALIZED' NOT NULL,
	`content_json` text NOT NULL,
	`content_hash` text NOT NULL,
	`runtime_key` text,
	`drive_file_id` text,
	`source_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `v7_intelligence_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`stage_key` text NOT NULL,
	`attempt` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'RUNNING' NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`threshold` integer DEFAULT 90 NOT NULL,
	`model_id` text NOT NULL,
	`source_mode` text DEFAULT 'OPENAI_WEB_SEARCH' NOT NULL,
	`gate_json` text DEFAULT '[]' NOT NULL,
	`started_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE TABLE `v7_intelligence_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`run_id` text NOT NULL,
	`stage_key` text NOT NULL,
	`source_type` text NOT NULL,
	`title` text NOT NULL,
	`publisher` text NOT NULL,
	`url` text NOT NULL,
	`published_at` text,
	`authority_tier` text NOT NULL,
	`freshness_state` text NOT NULL,
	`verification_state` text DEFAULT 'WEB_GROUNDED' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
