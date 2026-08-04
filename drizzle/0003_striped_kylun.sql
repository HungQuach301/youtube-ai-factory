CREATE TABLE `production_packages` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`version` integer NOT NULL,
	`status` text DEFAULT 'READY' NOT NULL,
	`manifest_json` text NOT NULL,
	`total_duration` real DEFAULT 0 NOT NULL,
	`export_format` text DEFAULT 'FRAMEFLOW_JSON_V1' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scene_manifest` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`segment_id` text NOT NULL,
	`scene_number` integer NOT NULL,
	`start_seconds` real,
	`end_seconds` real,
	`beat` text NOT NULL,
	`narration_excerpt` text NOT NULL,
	`visual_intent` text NOT NULL,
	`shot_type` text NOT NULL,
	`media_strategy` text NOT NULL,
	`search_query` text NOT NULL,
	`asset_source` text NOT NULL,
	`asset_url` text,
	`license_status` text DEFAULT 'NEEDS_SOURCE' NOT NULL,
	`asset_status` text DEFAULT 'PLANNED' NOT NULL,
	`scene_status` text DEFAULT 'DRAFT' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
