CREATE TABLE `v7_sequence_product_audits` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`run_id` text NOT NULL,
	`authorization_id` text NOT NULL,
	`product_id` text NOT NULL,
	`rubric_version` text NOT NULL,
	`status` text NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`tier` text DEFAULT 'BLOCKED' NOT NULL,
	`dimensions_json` text DEFAULT '{}' NOT NULL,
	`findings_json` text DEFAULT '[]' NOT NULL,
	`request_id` text,
	`provider_response_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text
);
