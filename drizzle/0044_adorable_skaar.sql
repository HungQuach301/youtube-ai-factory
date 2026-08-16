CREATE TABLE `v7_sequential_audio_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`queue_id` text NOT NULL,
	`stem_type` text NOT NULL,
	`provider` text NOT NULL,
	`provider_voice_id` text,
	`provider_request_id` text,
	`storage_key` text NOT NULL,
	`mime_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	`sha256` text NOT NULL,
	`sample_rate` integer NOT NULL,
	`channels` integer NOT NULL,
	`sample_count` integer NOT NULL,
	`duration_seconds` real NOT NULL,
	`peak_dbfs` real NOT NULL,
	`rms_dbfs` real NOT NULL,
	`silence_ratio` real NOT NULL,
	`rights_state` text NOT NULL,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`metadata_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_sequential_audio_queue_stem_uq` ON `v7_sequential_audio_assets` (`queue_id`,`stem_type`);--> statement-breakpoint
CREATE INDEX `v7_sequential_audio_queue_provider_idx` ON `v7_sequential_audio_assets` (`queue_id`,`provider`);--> statement-breakpoint
CREATE TABLE `v7_sequential_media_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`queue_id` text NOT NULL,
	`shot_id` text NOT NULL,
	`asset_mode` text NOT NULL,
	`provider` text NOT NULL,
	`provider_asset_id` text,
	`provider_request_id` text,
	`storage_key` text NOT NULL,
	`mime_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	`sha256` text NOT NULL,
	`source_url` text,
	`license_url` text,
	`rights_state` text NOT NULL,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`metadata_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_sequential_media_queue_shot_uq` ON `v7_sequential_media_assets` (`queue_id`,`shot_id`);--> statement-breakpoint
CREATE INDEX `v7_sequential_media_queue_provider_idx` ON `v7_sequential_media_assets` (`queue_id`,`provider`);