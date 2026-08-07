CREATE TABLE `v7_creative_artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`run_id` text NOT NULL,
	`lifecycle_state` text DEFAULT 'MATERIALIZED' NOT NULL,
	`content_json` text NOT NULL,
	`content_hash` text NOT NULL,
	`runtime_key` text,
	`drive_file_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `v7_creative_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`run_id` text NOT NULL,
	`provider_response_id` text NOT NULL,
	`provider_status` text DEFAULT 'queued' NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`heartbeat_at` text NOT NULL,
	`started_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`finalized_at` text,
	`error` text
);
--> statement-breakpoint
CREATE TABLE `v7_creative_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`attempt` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'RUNNING' NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`threshold` integer DEFAULT 90 NOT NULL,
	`model_id` text NOT NULL,
	`gate_json` text DEFAULT '[]' NOT NULL,
	`started_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text
);
