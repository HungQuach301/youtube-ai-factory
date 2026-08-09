CREATE TABLE `v7_architecture_baselines` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`stage_key` text NOT NULL,
	`version` text NOT NULL,
	`status` text NOT NULL,
	`execution_state` text NOT NULL,
	`source_checkpoint` text NOT NULL,
	`controls_json` text NOT NULL,
	`qualification_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`frozen_at` text
);
--> statement-breakpoint
CREATE TABLE `v7_compiled_shot_contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`baseline_id` text NOT NULL,
	`brief_id` text NOT NULL,
	`archetype` text NOT NULL,
	`risk_tier` text NOT NULL,
	`claim` text NOT NULL,
	`required_evidence_json` text NOT NULL,
	`allowed_modalities_json` text NOT NULL,
	`forbidden_json` text NOT NULL,
	`repair_route` text NOT NULL,
	`lint_status` text NOT NULL,
	`lint_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `v7_archetype_qualifications` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`baseline_id` text NOT NULL,
	`archetype` text NOT NULL,
	`status` text NOT NULL,
	`hardest_fixture` text NOT NULL,
	`deterministic_checks_json` text NOT NULL,
	`evidence_status` text NOT NULL,
	`first_pass_yield` real DEFAULT 0 NOT NULL,
	`blocker` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
