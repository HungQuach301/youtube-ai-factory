CREATE TABLE `v7_artifact_promotions` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`baseline_id` text NOT NULL,
	`regression_id` text NOT NULL,
	`run_id` text NOT NULL,
	`authorization_id` text NOT NULL,
	`canary_version` text NOT NULL,
	`brief_id` text NOT NULL,
	`logical_brief_id` text NOT NULL,
	`archetype` text NOT NULL,
	`certification_id` text NOT NULL,
	`renderer_version` text NOT NULL,
	`contract_hash` text NOT NULL,
	`frame_ids_json` text NOT NULL,
	`frame_hashes_json` text NOT NULL,
	`status` text NOT NULL,
	`preflight_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_artifact_promotions_canary_brief_unique` ON `v7_artifact_promotions` (`canary_version`,`brief_id`);
