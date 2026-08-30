-- READ_BACK: SELECT idempotency_key,request_body_hash,receipt_id,receipt_hash,github_repository,github_commit_sha,git_tree_sha,sites_version,environment_revision,actor_type,actor_subject,permission_scope,request_method,request_route FROM factory_deployment_receipt_append_attempts ORDER BY recorded_at DESC LIMIT 1;
-- FORWARD_RECOVERY: retry only the same signed body with the same idempotency key; a changed payload requires a new key and a new immutable Sites version, while conflicting or incomplete attempts remain preserved.
CREATE TABLE `factory_deployment_receipt_append_attempts` (
  `idempotency_key` text PRIMARY KEY NOT NULL CHECK (length(`idempotency_key`) BETWEEN 16 AND 200),
  `nonce` text NOT NULL UNIQUE CHECK (length(`nonce`) BETWEEN 16 AND 200),
  `request_body_hash` text NOT NULL CHECK (length(`request_body_hash`) = 64),
  `receipt_id` text NOT NULL CHECK (length(`receipt_id`) = 51),
  `receipt_hash` text NOT NULL CHECK (length(`receipt_hash`) = 64),
  `github_repository` text NOT NULL CHECK (`github_repository` = 'HungQuach301/youtube-ai-factory'),
  `github_commit_sha` text NOT NULL CHECK (length(`github_commit_sha`) IN (40,64)),
  `git_tree_sha` text NOT NULL CHECK (length(`git_tree_sha`) IN (40,64)),
  `sites_version` integer NOT NULL CHECK (`sites_version` > 0),
  `environment_revision` integer NOT NULL CHECK (`environment_revision` >= 0),
  `actor_type` text NOT NULL CHECK (`actor_type` = 'AUTOMATION'),
  `actor_subject` text NOT NULL CHECK (`actor_subject` = 'exact-tree-deployment-receipt-writer'),
  `permission_scope` text NOT NULL CHECK (`permission_scope` = 'deployment_receipt:append'),
  `request_method` text NOT NULL CHECK (`request_method` = 'POST'),
  `request_route` text NOT NULL CHECK (`request_route` = '/api/factory/deployment-evidence'),
  `recorded_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `factory_deployment_receipt_append_source_idx`
  ON `factory_deployment_receipt_append_attempts` (`github_commit_sha`,`git_tree_sha`,`sites_version`,`environment_revision`);
--> statement-breakpoint
CREATE TRIGGER `factory_deployment_receipt_append_attempts_no_update`
BEFORE UPDATE ON `factory_deployment_receipt_append_attempts`
BEGIN
  SELECT RAISE(ABORT,'FACTORY_DEPLOYMENT_RECEIPT_APPEND_ATTEMPTS_IMMUTABLE');
END;
--> statement-breakpoint
CREATE TRIGGER `factory_deployment_receipt_append_attempts_no_delete`
BEFORE DELETE ON `factory_deployment_receipt_append_attempts`
BEGIN
  SELECT RAISE(ABORT,'FACTORY_DEPLOYMENT_RECEIPT_APPEND_ATTEMPTS_IMMUTABLE');
END;
