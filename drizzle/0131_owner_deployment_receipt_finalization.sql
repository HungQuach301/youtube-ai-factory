-- READ_BACK: SELECT actor_type,actor_subject,command,attempted_at,idempotency_key,result,result_code,receipt_id,receipt_hash FROM factory_deployment_receipt_owner_audit_events ORDER BY attempted_at DESC,id DESC LIMIT 20;
-- FORWARD_RECOVERY: correct server-owned deployment evidence and deploy a new exact tree; never update/delete an owner command, audit event, or immutable receipt.
CREATE TABLE `factory_deployment_receipt_owner_commands` (
  `idempotency_key` text PRIMARY KEY NOT NULL CHECK (length(`idempotency_key`) BETWEEN 16 AND 200),
  `request_hash` text NOT NULL CHECK (length(`request_hash`) = 64),
  `actor_type` text NOT NULL CHECK (`actor_type` = 'CHATGPT_OWNER'),
  `actor_subject` text NOT NULL,
  `command` text NOT NULL CHECK (`command` = 'FINALIZE_DEPLOYMENT_RECEIPT'),
  `receipt_id` text NOT NULL,
  `receipt_hash` text NOT NULL CHECK (length(`receipt_hash`) = 64),
  `result` text NOT NULL CHECK (`result` IN ('CREATED','IDEMPOTENT_REPLAY')),
  `executed_at` text NOT NULL,
  `recorded_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`receipt_id`) REFERENCES `factory_deployment_receipts`(`receipt_id`)
);
--> statement-breakpoint
CREATE TRIGGER `factory_deployment_receipt_owner_commands_no_update` BEFORE UPDATE ON `factory_deployment_receipt_owner_commands` BEGIN SELECT RAISE(ABORT,'FACTORY_DEPLOYMENT_RECEIPT_OWNER_COMMANDS_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_deployment_receipt_owner_commands_no_delete` BEFORE DELETE ON `factory_deployment_receipt_owner_commands` BEGIN SELECT RAISE(ABORT,'FACTORY_DEPLOYMENT_RECEIPT_OWNER_COMMANDS_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `factory_deployment_receipt_owner_audit_events` (
  `id` text PRIMARY KEY NOT NULL,
  `actor_type` text NOT NULL CHECK (`actor_type` = 'CHATGPT_OWNER'),
  `actor_subject` text NOT NULL,
  `command` text NOT NULL CHECK (`command` = 'FINALIZE_DEPLOYMENT_RECEIPT'),
  `attempted_at` text NOT NULL,
  `idempotency_key` text NOT NULL,
  `request_hash` text NOT NULL CHECK (length(`request_hash`) = 64),
  `result` text NOT NULL CHECK (`result` IN ('CREATED','IDEMPOTENT_REPLAY','REJECTED')),
  `result_code` text NOT NULL,
  `receipt_id` text,
  `receipt_hash` text CHECK (`receipt_hash` IS NULL OR length(`receipt_hash`) = 64),
  `recorded_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `factory_deployment_receipt_owner_audit_key_idx` ON `factory_deployment_receipt_owner_audit_events` (`idempotency_key`,`attempted_at`);
--> statement-breakpoint
CREATE TRIGGER `factory_deployment_receipt_owner_audit_no_update` BEFORE UPDATE ON `factory_deployment_receipt_owner_audit_events` BEGIN SELECT RAISE(ABORT,'FACTORY_DEPLOYMENT_RECEIPT_OWNER_AUDIT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_deployment_receipt_owner_audit_no_delete` BEFORE DELETE ON `factory_deployment_receipt_owner_audit_events` BEGIN SELECT RAISE(ABORT,'FACTORY_DEPLOYMENT_RECEIPT_OWNER_AUDIT_IMMUTABLE'); END;
