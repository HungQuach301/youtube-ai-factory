CREATE TABLE `v7_asset_registry` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`project_id` text,
	`name` text NOT NULL,
	`asset_class` text NOT NULL,
	`lifecycle_state` text DEFAULT 'PLAN' NOT NULL,
	`provider` text,
	`mime_type` text,
	`content_hash` text,
	`runtime_key` text,
	`drive_file_id` text,
	`local_relative_path` text,
	`sync_state` text DEFAULT 'NOT_STORED' NOT NULL,
	`rights_state` text DEFAULT 'UNKNOWN' NOT NULL,
	`reusable_eligible` integer DEFAULT false NOT NULL,
	`quarantined` integer DEFAULT false NOT NULL,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `v7_cost_events` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`project_id` text,
	`stage_key` text NOT NULL,
	`provider` text NOT NULL,
	`cost_class` text NOT NULL,
	`cost_type` text NOT NULL,
	`status` text DEFAULT 'ESTIMATED' NOT NULL,
	`estimated_usd` real DEFAULT 0 NOT NULL,
	`actual_usd` real DEFAULT 0 NOT NULL,
	`reusable_allocation_usd` real DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`asset_id` text,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `v7_decision_records` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`decision_code` text NOT NULL,
	`title` text NOT NULL,
	`status` text NOT NULL,
	`effective_version` integer DEFAULT 7 NOT NULL,
	`rationale` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `v7_evidence_lineage` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`project_id` text,
	`entity_type` text NOT NULL,
	`title` text NOT NULL,
	`lifecycle_state` text DEFAULT 'PLAN' NOT NULL,
	`upstream_evidence_id` text,
	`artifact_key` text,
	`content_hash` text,
	`storage_state` text DEFAULT 'NOT_STORED' NOT NULL,
	`rights_state` text DEFAULT 'NOT_APPLICABLE' NOT NULL,
	`cost_state` text DEFAULT 'NOT_APPLICABLE' NOT NULL,
	`quarantine_state` text DEFAULT 'CLEAR' NOT NULL,
	`pipeline_version` integer DEFAULT 7 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `v7_foundation_audits` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`status` text NOT NULL,
	`architecture_score` integer DEFAULT 0 NOT NULL,
	`evidence_score` integer DEFAULT 0 NOT NULL,
	`cost_score` integer DEFAULT 0 NOT NULL,
	`storage_score` integer DEFAULT 0 NOT NULL,
	`production_authorized` integer DEFAULT false NOT NULL,
	`checks_json` text NOT NULL,
	`blockers_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `v7_program_contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`version` integer DEFAULT 7 NOT NULL,
	`status` text DEFAULT 'FOUNDATION_BUILD' NOT NULL,
	`execution_mode` text DEFAULT 'AUTOPILOT' NOT NULL,
	`quality_policy` text DEFAULT 'MAXIMUM_QUALITY_FIRST' NOT NULL,
	`legacy_policy` text DEFAULT 'HISTORICAL_QUARANTINE' NOT NULL,
	`overall_floor` integer DEFAULT 92 NOT NULL,
	`critical_floor` integer DEFAULT 90 NOT NULL,
	`dimension_floor` integer DEFAULT 86 NOT NULL,
	`p0_tolerance` integer DEFAULT 0 NOT NULL,
	`p1_tolerance` integer DEFAULT 0 NOT NULL,
	`maximum_attempts` integer DEFAULT 3 NOT NULL,
	`minimum_improvement` integer DEFAULT 3 NOT NULL,
	`production_authorized` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `v7_stage_states` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`stage_key` text NOT NULL,
	`sequence` integer NOT NULL,
	`stage_name` text NOT NULL,
	`status` text DEFAULT 'BLOCKED' NOT NULL,
	`threshold` integer DEFAULT 92 NOT NULL,
	`attempt` integer DEFAULT 0 NOT NULL,
	`artifact_id` text,
	`blocker` text,
	`evidence_summary` text DEFAULT 'No verified artifact' NOT NULL,
	`frozen_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `v7_storage_contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`tier` text NOT NULL,
	`binding_name` text NOT NULL,
	`role` text NOT NULL,
	`required_for_production` integer DEFAULT true NOT NULL,
	`implementation_state` text DEFAULT 'CONTRACT_READY' NOT NULL,
	`verification_state` text DEFAULT 'NOT_VERIFIED' NOT NULL,
	`last_verified_at` text,
	`evidence` text DEFAULT 'Awaiting verification' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
