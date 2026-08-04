CREATE TABLE `narration_segments` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`script_version_id` text NOT NULL,
	`position` integer NOT NULL,
	`label` text NOT NULL,
	`text` text NOT NULL,
	`character_count` integer NOT NULL,
	`status` text DEFAULT 'READY' NOT NULL,
	`duration_seconds` real,
	`audio_key` text,
	`alignment` text,
	`take_number` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pronunciation_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` text NOT NULL,
	`term` text NOT NULL,
	`pronunciation` text NOT NULL,
	`rule_type` text DEFAULT 'ALIAS' NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `voice_evaluations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` text NOT NULL,
	`segment_id` text NOT NULL,
	`take_number` integer NOT NULL,
	`pronunciation_score` integer NOT NULL,
	`pace_score` integer NOT NULL,
	`consistency_score` integer NOT NULL,
	`decision` text NOT NULL,
	`findings` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `voice_profiles` (
	`project_id` text PRIMARY KEY NOT NULL,
	`provider` text DEFAULT 'ELEVENLABS' NOT NULL,
	`voice_id` text NOT NULL,
	`voice_name` text NOT NULL,
	`model_id` text DEFAULT 'eleven_multilingual_v2' NOT NULL,
	`stability` real DEFAULT 0.55 NOT NULL,
	`similarity_boost` real DEFAULT 0.78 NOT NULL,
	`style` real DEFAULT 0.2 NOT NULL,
	`speed` real DEFAULT 0.96 NOT NULL,
	`status` text DEFAULT 'CANDIDATE' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
