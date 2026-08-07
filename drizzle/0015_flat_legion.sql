CREATE TABLE `v7_intelligence_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`run_id` text NOT NULL,
	`stage_key` text NOT NULL,
	`provider_response_id` text NOT NULL,
	`provider_status` text DEFAULT 'queued' NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`heartbeat_at` text NOT NULL,
	`started_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`finalized_at` text,
	`error` text
);
