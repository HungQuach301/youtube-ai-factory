CREATE TABLE `optimization_artifact_qa` (
	`id` text PRIMARY KEY NOT NULL,
	`artifact_id` text NOT NULL,
	`cycle_id` text NOT NULL,
	`project_id` text NOT NULL,
	`stage_key` text NOT NULL,
	`attempt` integer DEFAULT 1 NOT NULL,
	`status` text NOT NULL,
	`decision` text NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`threshold` integer NOT NULL,
	`rubric_json` text NOT NULL,
	`issues_json` text NOT NULL,
	`regression_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `optimization_artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`cycle_id` text NOT NULL,
	`project_id` text NOT NULL,
	`stage_key` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'ARTIFACT_READY' NOT NULL,
	`artifact_type` text NOT NULL,
	`title` text NOT NULL,
	`content_json` text NOT NULL,
	`source_run_id` text NOT NULL,
	`word_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
