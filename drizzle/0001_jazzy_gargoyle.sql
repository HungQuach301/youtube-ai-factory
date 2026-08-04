CREATE TABLE `content_briefs` (
	`project_id` text PRIMARY KEY NOT NULL,
	`target_viewer` text NOT NULL,
	`central_question` text NOT NULL,
	`viewer_promise` text NOT NULL,
	`unique_angle` text NOT NULL,
	`format` text NOT NULL,
	`risk_note` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `critic_evaluations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` text NOT NULL,
	`script_version_id` text NOT NULL,
	`critic_type` text NOT NULL,
	`score` integer NOT NULL,
	`decision` text NOT NULL,
	`findings` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `research_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`claim_text` text NOT NULL,
	`risk_level` text NOT NULL,
	`status` text NOT NULL,
	`source_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `research_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`publisher` text NOT NULL,
	`url` text NOT NULL,
	`authority` text NOT NULL,
	`freshness` text NOT NULL,
	`status` text DEFAULT 'VERIFIED' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `script_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`version` integer NOT NULL,
	`content` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`critic_score` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
