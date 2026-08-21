CREATE TABLE `v7_evaluation_evidence_incidents` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `candidate_id` text NOT NULL,
  `basis_receipt_id` text NOT NULL,
  `incident_type` text NOT NULL CHECK (`incident_type` IN ('SOURCE_OBJECT_BYTE_DIVERGENCE','R2_METADATA_BINDING_MISMATCH')),
  `severity` text NOT NULL CHECK (`severity` IN ('P0','P1')),
  `incident_state` text NOT NULL DEFAULT 'OPEN' CHECK (`incident_state` = 'OPEN'),
  `recommended_disposition` text NOT NULL CHECK (`recommended_disposition` IN ('QUARANTINE_EVALUATION_ONLY','RETAIN_BLOCKED_FOR_METADATA_REVIEW')),
  `facts_json` text NOT NULL,
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`candidate_id`) REFERENCES `v7_evaluation_candidates`(`id`),
  FOREIGN KEY (`basis_receipt_id`) REFERENCES `v7_evaluation_verification_receipts`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_evidence_incident_uq` ON `v7_evaluation_evidence_incidents` (`candidate_id`,`basis_receipt_id`,`incident_type`);
--> statement-breakpoint
CREATE INDEX `v7_evaluation_evidence_incident_state_idx` ON `v7_evaluation_evidence_incidents` (`channel_id`,`incident_state`,`incident_type`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_evidence_incident_no_update`
BEFORE UPDATE ON `v7_evaluation_evidence_incidents`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_EVIDENCE_INCIDENT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_evidence_incident_no_delete`
BEFORE DELETE ON `v7_evaluation_evidence_incidents`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_EVIDENCE_INCIDENT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_candidate_dispositions` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `candidate_id` text NOT NULL,
  `basis_receipt_id` text NOT NULL,
  `disposition` text NOT NULL CHECK (`disposition` = 'QUARANTINE_EVALUATION_ONLY'),
  `reason_code` text NOT NULL CHECK (`reason_code` = 'DECLARED_SOURCE_BYTES_DIVERGE_FROM_R2_OBJECT'),
  `evidence_hash` text NOT NULL,
  `actor` text NOT NULL,
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`candidate_id`) REFERENCES `v7_evaluation_candidates`(`id`),
  FOREIGN KEY (`basis_receipt_id`) REFERENCES `v7_evaluation_verification_receipts`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_candidate_disposition_uq` ON `v7_evaluation_candidate_dispositions` (`candidate_id`,`basis_receipt_id`,`disposition`);
--> statement-breakpoint
CREATE INDEX `v7_evaluation_candidate_disposition_idx` ON `v7_evaluation_candidate_dispositions` (`channel_id`,`disposition`,`created_at`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_candidate_disposition_no_update`
BEFORE UPDATE ON `v7_evaluation_candidate_dispositions`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CANDIDATE_DISPOSITION_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_candidate_disposition_no_delete`
BEFORE DELETE ON `v7_evaluation_candidate_dispositions`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CANDIDATE_DISPOSITION_IMMUTABLE'); END;
--> statement-breakpoint
INSERT INTO `v7_evaluation_evidence_incidents`
  (`id`,`channel_id`,`candidate_id`,`basis_receipt_id`,`incident_type`,`severity`,`recommended_disposition`,`facts_json`)
SELECT
  'evaluation-incident:' || c.id || ':' || r.id,
  c.channel_id,
  c.id,
  r.id,
  CASE WHEN r.checksum_state='FAIL' OR COALESCE(r.declared_bytes,-1)<>COALESCE(r.actual_bytes,-1)
    THEN 'SOURCE_OBJECT_BYTE_DIVERGENCE' ELSE 'R2_METADATA_BINDING_MISMATCH' END,
  CASE WHEN r.checksum_state='FAIL' OR COALESCE(r.declared_bytes,-1)<>COALESCE(r.actual_bytes,-1) THEN 'P0' ELSE 'P1' END,
  CASE WHEN r.checksum_state='FAIL' OR COALESCE(r.declared_bytes,-1)<>COALESCE(r.actual_bytes,-1)
    THEN 'QUARANTINE_EVALUATION_ONLY' ELSE 'RETAIN_BLOCKED_FOR_METADATA_REVIEW' END,
  json_object('bytesState',r.bytes_state,'checksumState',r.checksum_state,'provenanceState',r.provenance_state,'rightsState',r.rights_verification_state,'reasons',json(r.reconciliation_reasons_json))
FROM `v7_evaluation_candidates` c
JOIN `v7_evaluation_verification_receipts` r ON r.id=c.latest_verification_receipt_id
WHERE c.verification_state='BLOCKED'
  AND r.provenance_state='FAIL'
  AND (r.checksum_state='FAIL' OR r.reconciliation_reasons_json LIKE '%R2_OBJECT_METADATA_MISMATCH%');
--> statement-breakpoint
INSERT INTO `v7_evaluation_candidate_dispositions`
  (`id`,`channel_id`,`candidate_id`,`basis_receipt_id`,`disposition`,`reason_code`,`evidence_hash`,`actor`)
SELECT
  'evaluation-disposition:' || c.id || ':' || r.id,
  c.channel_id,
  c.id,
  r.id,
  'QUARANTINE_EVALUATION_ONLY',
  'DECLARED_SOURCE_BYTES_DIVERGE_FROM_R2_OBJECT',
  r.evidence_hash,
  'SYSTEM_MIGRATION_0054'
FROM `v7_evaluation_candidates` c
JOIN `v7_evaluation_verification_receipts` r ON r.id=c.latest_verification_receipt_id
WHERE c.verification_state='BLOCKED'
  AND (r.checksum_state='FAIL' OR COALESCE(r.declared_bytes,-1)<>COALESCE(r.actual_bytes,-1));
--> statement-breakpoint
UPDATE `v7_evaluation_candidates`
SET `lifecycle_state`='EXCLUDED',
    `verification_state`='EXCLUDED',
    `exclusion_reason`='DECLARED_SOURCE_BYTES_DIVERGE_FROM_R2_OBJECT',
    `qualification_eligible`=0,
    `verified_at`=NULL
WHERE `id` IN (SELECT `candidate_id` FROM `v7_evaluation_candidate_dispositions` WHERE `disposition`='QUARANTINE_EVALUATION_ONLY');
