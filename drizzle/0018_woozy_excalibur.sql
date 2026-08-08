CREATE TABLE IF NOT EXISTS `v7_material_artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`run_id` text NOT NULL,
	`lifecycle_state` text DEFAULT 'DRY_RUN_FROZEN' NOT NULL,
	`content_json` text NOT NULL,
	`content_hash` text NOT NULL,
	`runtime_key` text,
	`drive_file_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `v7_material_authorizations` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`run_id` text NOT NULL,
	`scope` text DEFAULT 'PILOT' NOT NULL,
	`status` text DEFAULT 'AUTHORIZED' NOT NULL,
	`shot_count` integer NOT NULL,
	`max_remote_requests` integer NOT NULL,
	`max_actual_spend_usd` real NOT NULL,
	`model_policy_json` text NOT NULL,
	`authorized_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`revoked_at` text,
	`completed_at` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `v7_material_briefs` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`run_id` text NOT NULL,
	`shot_id` text NOT NULL,
	`section_id` text NOT NULL,
	`start_seconds` real NOT NULL,
	`end_seconds` real NOT NULL,
	`route` text NOT NULL,
	`visual_family` text NOT NULL,
	`model_lane` text NOT NULL,
	`output_ceiling` integer DEFAULT 0 NOT NULL,
	`retry_limit` integer DEFAULT 0 NOT NULL,
	`pilot` integer DEFAULT false NOT NULL,
	`content_json` text NOT NULL,
	`content_hash` text NOT NULL,
	`status` text DEFAULT 'PLANNED' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `v7_material_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`run_id` text NOT NULL,
	`authorization_id` text NOT NULL,
	`brief_id` text NOT NULL,
	`phase` text NOT NULL,
	`provider` text NOT NULL,
	`model_id` text NOT NULL,
	`reasoning` text NOT NULL,
	`status` text DEFAULT 'PLANNED' NOT NULL,
	`idempotency_key` text NOT NULL,
	`provider_response_id` text,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`reasoning_tokens` integer DEFAULT 0 NOT NULL,
	`expected_output_tokens` integer DEFAULT 0 NOT NULL,
	`max_output_tokens` integer DEFAULT 0 NOT NULL,
	`estimated_cost_usd` real DEFAULT 0 NOT NULL,
	`actual_cost_usd` real DEFAULT 0 NOT NULL,
	`retry_of` text,
	`retry_scope` text DEFAULT 'NONE' NOT NULL,
	`error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `v7_material_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`status` text DEFAULT 'BUILDING' NOT NULL,
	`mode` text DEFAULT 'ZERO_SPEND_DRY_RUN' NOT NULL,
	`brief_count` integer DEFAULT 0 NOT NULL,
	`pilot_count` integer DEFAULT 0 NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`remote_requests` integer DEFAULT 0 NOT NULL,
	`actual_cost_usd` real DEFAULT 0 NOT NULL,
	`gate_json` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text
);
