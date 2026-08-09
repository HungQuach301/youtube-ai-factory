CREATE TABLE `v7_material_unit_repairs` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`run_id` text NOT NULL,
	`authorization_id` text NOT NULL,
	`brief_id` text NOT NULL,
	`repair_type` text NOT NULL,
	`status` text NOT NULL,
	`original_content_json` text NOT NULL,
	`original_content_hash` text NOT NULL,
	`repaired_content_json` text NOT NULL,
	`repaired_content_hash` text NOT NULL,
	`failure_evidence_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
