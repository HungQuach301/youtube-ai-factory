-- READ_BACK: SELECT receipt_id,github_commit_sha,git_tree_sha,sites_version,sites_source_commit,sites_source_tree_sha,schema_version,environment_revision,deployment_terminal_status,deployed_at,verification_result FROM factory_deployment_receipts ORDER BY sites_version DESC LIMIT 1;
-- FORWARD_RECOVERY: append a new receipt for a new immutable Sites version after correcting source or verification evidence; never update or delete an existing receipt.
CREATE TABLE `factory_deployment_receipts` (
  `receipt_id` text PRIMARY KEY NOT NULL,
  `receipt_schema_version` text NOT NULL CHECK (`receipt_schema_version` = 'DEPLOYMENT_RECEIPT_V1'),
  `work_package_id` text NOT NULL,
  `pull_request` text NOT NULL,
  `github_repository` text NOT NULL CHECK (`github_repository` = 'HungQuach301/youtube-ai-factory'),
  `github_commit_sha` text NOT NULL CHECK (length(`github_commit_sha`) IN (40,64)),
  `git_tree_sha` text NOT NULL CHECK (length(`git_tree_sha`) IN (40,64)),
  `sites_version` integer NOT NULL UNIQUE CHECK (`sites_version` > 0),
  `sites_source_commit` text NOT NULL CHECK (length(`sites_source_commit`) IN (40,64)),
  `sites_source_tree_sha` text NOT NULL CHECK (length(`sites_source_tree_sha`) IN (40,64)),
  `schema_version` text NOT NULL,
  `environment_revision` integer NOT NULL CHECK (`environment_revision` >= 0),
  `deployment_terminal_status` text NOT NULL CHECK (`deployment_terminal_status` = 'SUCCEEDED'),
  `deployed_at` text NOT NULL,
  `smoke_readback_result_json` text NOT NULL CHECK (json_valid(`smoke_readback_result_json`)),
  `verified_at` text NOT NULL,
  `receipt_hash` text NOT NULL UNIQUE CHECK (length(`receipt_hash`) = 64),
  `verification_result` text NOT NULL CHECK (`verification_result` = 'PASS'),
  `recorded_by` text NOT NULL,
  `recorded_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (`git_tree_sha` = `sites_source_tree_sha`),
  CHECK (json_extract(`smoke_readback_result_json`,'$.production_smoke') = 'PASS'),
  CHECK (json_extract(`smoke_readback_result_json`,'$.d1_readback') IN ('PASS','NOT_APPLICABLE')),
  CHECK (json_extract(`smoke_readback_result_json`,'$.r2_readback') IN ('PASS','NOT_APPLICABLE')),
  CHECK (json_extract(`smoke_readback_result_json`,'$.provider_requests') >= 0),
  CHECK (json_extract(`smoke_readback_result_json`,'$.actual_spend_micros') >= 0),
  CHECK (json_extract(`smoke_readback_result_json`,'$.temporary_controls_removed') = 1)
);
--> statement-breakpoint
CREATE INDEX `factory_deployment_receipts_source_idx`
  ON `factory_deployment_receipts` (`github_commit_sha`,`git_tree_sha`,`sites_source_commit`);
--> statement-breakpoint
CREATE TRIGGER `factory_deployment_receipts_no_update`
BEFORE UPDATE ON `factory_deployment_receipts`
BEGIN
  SELECT RAISE(ABORT,'FACTORY_DEPLOYMENT_RECEIPTS_IMMUTABLE');
END;
--> statement-breakpoint
CREATE TRIGGER `factory_deployment_receipts_no_delete`
BEFORE DELETE ON `factory_deployment_receipts`
BEGIN
  SELECT RAISE(ABORT,'FACTORY_DEPLOYMENT_RECEIPTS_IMMUTABLE');
END;
