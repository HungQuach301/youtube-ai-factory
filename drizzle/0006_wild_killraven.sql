CREATE TABLE `video_renders` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`version` integer NOT NULL,
	`name` text NOT NULL,
	`storage_key` text NOT NULL,
	`mime_type` text DEFAULT 'video/webm' NOT NULL,
	`size_bytes` integer DEFAULT 0 NOT NULL,
	`duration_seconds` real DEFAULT 0 NOT NULL,
	`width` integer DEFAULT 1280 NOT NULL,
	`height` integer DEFAULT 720 NOT NULL,
	`fps` integer DEFAULT 30 NOT NULL,
	`status` text DEFAULT 'READY' NOT NULL,
	`gate_results` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
