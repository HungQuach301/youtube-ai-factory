CREATE TABLE `reference_benchmark_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`version` integer NOT NULL,
	`status` text DEFAULT 'READY' NOT NULL,
	`decision` text NOT NULL,
	`composite_score` integer DEFAULT 0 NOT NULL,
	`gap_matrix_json` text NOT NULL,
	`critic_results_json` text NOT NULL,
	`recommendations_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reference_settings` (
	`project_id` text PRIMARY KEY NOT NULL,
	`verification_mode` text DEFAULT 'AUTOPILOT' NOT NULL,
	`minimum_score` integer DEFAULT 75 NOT NULL,
	`market` text DEFAULT 'US' NOT NULL,
	`language` text DEFAULT 'en' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reference_videos` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`youtube_video_id` text NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`channel_name` text NOT NULL,
	`reference_group` text NOT NULL,
	`thumbnail_url` text,
	`published_at` text,
	`duration_seconds` integer DEFAULT 0 NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`like_count` integer DEFAULT 0 NOT NULL,
	`comment_count` integer DEFAULT 0 NOT NULL,
	`reference_score` integer DEFAULT 0 NOT NULL,
	`insight_json` text NOT NULL,
	`status` text DEFAULT 'INCLUDED' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
