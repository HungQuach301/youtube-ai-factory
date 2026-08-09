CREATE TABLE `v7_motion_audits` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`run_id` text NOT NULL,
	`authorization_id` text NOT NULL,
	`brief_id` text NOT NULL,
	`proof_id` text NOT NULL,
	`rubric_version` text NOT NULL,
	`attempt` integer NOT NULL,
	`status` text NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`dimensions_json` text DEFAULT '{}' NOT NULL,
	`findings_json` text DEFAULT '[]' NOT NULL,
	`evidence_bundle_json` text DEFAULT '{}' NOT NULL,
	`evidence_bundle_hash` text NOT NULL,
	`request_id` text,
	`provider_response_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
