CREATE TABLE `media_automation_settings` (
	`project_id` text PRIMARY KEY NOT NULL,
	`verification_mode` text DEFAULT 'AUTOPILOT' NOT NULL,
	`minimum_confidence` integer DEFAULT 85 NOT NULL,
	`auto_build_assembly` integer DEFAULT true NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
