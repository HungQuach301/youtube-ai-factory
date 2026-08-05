CREATE TABLE `quality_gate_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`version` integer NOT NULL,
	`loop_number` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'READY' NOT NULL,
	`decision` text NOT NULL,
	`composite_score` integer DEFAULT 0 NOT NULL,
	`core_score` integer DEFAULT 0 NOT NULL,
	`adapter_score` integer DEFAULT 0 NOT NULL,
	`format_adapter` text NOT NULL,
	`rubric_json` text NOT NULL,
	`hard_gates_json` text NOT NULL,
	`critic_results_json` text NOT NULL,
	`repair_plan_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quality_gate_settings` (
	`project_id` text PRIMARY KEY NOT NULL,
	`verification_mode` text DEFAULT 'AUTOPILOT' NOT NULL,
	`minimum_score` integer DEFAULT 85 NOT NULL,
	`dimension_floor` integer DEFAULT 70 NOT NULL,
	`critical_floor` integer DEFAULT 80 NOT NULL,
	`format_adapter` text DEFAULT 'EXPLAINER_DOCUMENTARY' NOT NULL,
	`maximum_repair_loops` integer DEFAULT 2 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
