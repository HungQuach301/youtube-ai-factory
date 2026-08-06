CREATE TABLE `evidence_audit_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`pipeline_version` integer DEFAULT 5 NOT NULL,
	`status` text NOT NULL,
	`integrity_score` integer DEFAULT 0 NOT NULL,
	`plan_ready` integer DEFAULT false NOT NULL,
	`material_ready` integer DEFAULT false NOT NULL,
	`master_ready` integer DEFAULT false NOT NULL,
	`counts_json` text NOT NULL,
	`blockers_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `evidence_bindings` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`from_record_id` text NOT NULL,
	`to_record_id` text NOT NULL,
	`relationship` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `evidence_records` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`pipeline_version` integer DEFAULT 5 NOT NULL,
	`lifecycle_state` text DEFAULT 'PLAN' NOT NULL,
	`title` text NOT NULL,
	`provider` text,
	`source_url` text,
	`retrieved_at` text,
	`content_hash` text,
	`storage_key` text,
	`mime_type` text,
	`size_bytes` integer DEFAULT 0 NOT NULL,
	`license_status` text DEFAULT 'UNKNOWN' NOT NULL,
	`commercial_use_status` text DEFAULT 'UNKNOWN' NOT NULL,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`model_id` text,
	`model_version` text,
	`prompt` text,
	`seed` text,
	`settings_json` text DEFAULT '{}' NOT NULL,
	`semantic_score` integer,
	`claim_ids_json` text DEFAULT '[]' NOT NULL,
	`shot_ids_json` text DEFAULT '[]' NOT NULL,
	`transformation_history_json` text DEFAULT '[]' NOT NULL,
	`human_override_json` text DEFAULT '{}' NOT NULL,
	`expires_at` text,
	`revalidation_status` text DEFAULT 'CURRENT' NOT NULL,
	`supersedes_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pipeline_migrations` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`from_version` integer NOT NULL,
	`to_version` integer NOT NULL,
	`status` text NOT NULL,
	`policy_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `production_profiles` (
	`project_id` text PRIMARY KEY NOT NULL,
	`version` integer DEFAULT 5 NOT NULL,
	`profile_key` text NOT NULL,
	`format_adapter` text NOT NULL,
	`runtime_target_seconds` integer NOT NULL,
	`targets_json` text NOT NULL,
	`truth_policy` text NOT NULL,
	`legacy_render_disabled` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
