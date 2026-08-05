CREATE TABLE `optimization_cycles` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`version` integer NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`active_stage` text NOT NULL,
	`stage_state_json` text NOT NULL,
	`issue_ledger_json` text NOT NULL,
	`learning_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `optimization_settings` (
	`project_id` text PRIMARY KEY NOT NULL,
	`mode` text DEFAULT 'AUTOPILOT' NOT NULL,
	`maximum_attempts` integer DEFAULT 3 NOT NULL,
	`minimum_improvement` integer DEFAULT 3 NOT NULL,
	`maximum_wave_stages` integer DEFAULT 4 NOT NULL,
	`regression_tolerance` integer DEFAULT 5 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `optimization_stage_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`cycle_id` text NOT NULL,
	`project_id` text NOT NULL,
	`stage_key` text NOT NULL,
	`attempt` integer DEFAULT 1 NOT NULL,
	`status` text NOT NULL,
	`threshold` integer NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`contract_json` text NOT NULL,
	`candidates_json` text NOT NULL,
	`decision_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
