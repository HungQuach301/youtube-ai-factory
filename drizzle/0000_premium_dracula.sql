CREATE TABLE `channels` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`market` text DEFAULT 'US' NOT NULL,
	`language` text DEFAULT 'en-US' NOT NULL,
	`niche` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `video_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`title` text NOT NULL,
	`pillar` text NOT NULL,
	`status` text DEFAULT 'OPPORTUNITY_REVIEW' NOT NULL,
	`opportunity_score` integer DEFAULT 0 NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`budget_usd` real DEFAULT 0 NOT NULL,
	`spent_usd` real DEFAULT 0 NOT NULL,
	`next_action` text DEFAULT 'Review opportunity' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workflow_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` text NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`event_type` text NOT NULL,
	`summary` text NOT NULL,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
