CREATE TABLE `assembly_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`version` integer NOT NULL,
	`status` text DEFAULT 'READY_FOR_RENDER' NOT NULL,
	`manifest_json` text NOT NULL,
	`asset_coverage` integer DEFAULT 0 NOT NULL,
	`license_coverage` integer DEFAULT 0 NOT NULL,
	`critic_results` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`scene_id` text NOT NULL,
	`name` text NOT NULL,
	`mime_type` text NOT NULL,
	`source_type` text NOT NULL,
	`source_url` text,
	`storage_key` text,
	`license_type` text NOT NULL,
	`license_proof` text,
	`rights_status` text DEFAULT 'PENDING' NOT NULL,
	`status` text DEFAULT 'REVIEW' NOT NULL,
	`size_bytes` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
