-- READ_BACK: SELECT handler_identity,actor_type,actor_subject_hash,action,resource_scope,correlation_id,request_hash,phase,domain_receipt_reference,canonical_timestamp FROM factory_write_command_audit ORDER BY canonical_timestamp,id;
-- FORWARD_RECOVERY: preserve every immutable authorization and terminal event; deploy a higher-numbered additive migration and corrected command code, then append a new correlated execution without updating or deleting prior audit rows.
CREATE TABLE `factory_write_command_audit` (
  `id` text PRIMARY KEY NOT NULL,
  `handler_identity` text NOT NULL,
  `actor_type` text NOT NULL,
  `actor_subject_hash` text NOT NULL CHECK (length(`actor_subject_hash`) = 64),
  `action` text NOT NULL,
  `resource_scope` text NOT NULL,
  `correlation_id` text NOT NULL,
  `request_hash` text NOT NULL CHECK (length(`request_hash`) = 64),
  `phase` text NOT NULL CHECK (`phase` IN ('AUTHORIZED','SUCCEEDED','FAILED')),
  `domain_receipt_reference` text,
  `canonical_timestamp` text NOT NULL,
  `recorded_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (`correlation_id`,`phase`)
);
--> statement-breakpoint
CREATE INDEX `factory_write_command_audit_handler_action_idx`
  ON `factory_write_command_audit` (`handler_identity`,`action`,`canonical_timestamp`);
--> statement-breakpoint
CREATE INDEX `factory_write_command_audit_resource_idx`
  ON `factory_write_command_audit` (`resource_scope`,`canonical_timestamp`);
--> statement-breakpoint
CREATE TRIGGER `factory_write_command_audit_no_update`
BEFORE UPDATE ON `factory_write_command_audit`
BEGIN
  SELECT RAISE(ABORT,'FACTORY_WRITE_COMMAND_AUDIT_IMMUTABLE');
END;
--> statement-breakpoint
CREATE TRIGGER `factory_write_command_audit_no_delete`
BEFORE DELETE ON `factory_write_command_audit`
BEGIN
  SELECT RAISE(ABORT,'FACTORY_WRITE_COMMAND_AUDIT_IMMUTABLE');
END;
