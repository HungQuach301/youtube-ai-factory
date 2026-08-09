CREATE TABLE `v7_continuity_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`checkpoint_code` text NOT NULL,
	`lifecycle_state` text DEFAULT 'MATERIALIZED' NOT NULL,
	`content_json` text NOT NULL,
	`content_hash` text NOT NULL,
	`blocker_count` integer DEFAULT 0 NOT NULL,
	`active_request_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
