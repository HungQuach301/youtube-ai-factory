CREATE TABLE `v7_google_drive_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'NOT_CONNECTED' NOT NULL,
	`refresh_token_ciphertext` text,
	`refresh_token_iv` text,
	`scope` text DEFAULT 'https://www.googleapis.com/auth/drive.file' NOT NULL,
	`root_folder_id` text,
	`root_folder_name` text DEFAULT 'Frameflow Factory' NOT NULL,
	`audit_folder_id` text,
	`marker_file_id` text,
	`last_verified_at` text,
	`last_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `v7_google_drive_oauth_states` (
	`id` text PRIMARY KEY NOT NULL,
	`redirect_uri` text NOT NULL,
	`return_to` text DEFAULT '/settings/storage' NOT NULL,
	`expires_at` text NOT NULL,
	`consumed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `v7_storage_sync_events` (
	`id` text PRIMARY KEY NOT NULL,
	`storage_tier` text NOT NULL,
	`action` text NOT NULL,
	`status` text NOT NULL,
	`artifact_id` text,
	`content_hash` text,
	`evidence_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
