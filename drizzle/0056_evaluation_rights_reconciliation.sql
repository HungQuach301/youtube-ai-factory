CREATE TABLE `v7_evaluation_rights_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `candidate_id` text NOT NULL,
  `basis_verification_receipt_id` text NOT NULL,
  `basis_metadata_binding_receipt_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'EVALUATION_RIGHTS_RECONCILIATION_V1'),
  `rights_state` text NOT NULL CHECK (`rights_state` = 'PASS'),
  `rights_basis` text NOT NULL CHECK (`rights_basis` = 'CHANNEL_AUTHORED_EVALUATION_USE'),
  `facts_json` text NOT NULL,
  `basis_evidence_hash` text NOT NULL,
  `actor` text NOT NULL,
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`candidate_id`) REFERENCES `v7_evaluation_candidates`(`id`),
  FOREIGN KEY (`basis_verification_receipt_id`) REFERENCES `v7_evaluation_verification_receipts`(`id`),
  FOREIGN KEY (`basis_metadata_binding_receipt_id`) REFERENCES `v7_evaluation_metadata_binding_receipts`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_rights_receipt_uq` ON `v7_evaluation_rights_receipts` (`candidate_id`,`basis_verification_receipt_id`,`basis_metadata_binding_receipt_id`,`policy_version`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_rights_receipt_no_update`
BEFORE UPDATE ON `v7_evaluation_rights_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_RIGHTS_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_rights_receipt_no_delete`
BEFORE DELETE ON `v7_evaluation_rights_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_RIGHTS_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
INSERT INTO `v7_evaluation_rights_receipts`
  (`id`,`channel_id`,`candidate_id`,`basis_verification_receipt_id`,`basis_metadata_binding_receipt_id`,`policy_version`,`rights_state`,`rights_basis`,`facts_json`,`basis_evidence_hash`,`actor`)
SELECT
  'evaluation-rights:' || c.id || ':' || r.id,
  c.channel_id,
  c.id,
  r.id,
  b.id,
  'EVALUATION_RIGHTS_RECONCILIATION_V1',
  'PASS',
  'CHANNEL_AUTHORED_EVALUATION_USE',
  json_object('metadataRebindVerified',1,'declaredRightsAccepted',1,'channelAuthorPresent',1,'providerAbsent',1,'providerMediaAbsent',1,'legacySources',0),
  r.evidence_hash,
  'SYSTEM_MIGRATION_0056'
FROM `v7_evaluation_candidates` c
JOIN `v7_evaluation_verification_receipts` r ON r.id=c.latest_verification_receipt_id
JOIN `v7_evaluation_metadata_binding_receipts` b ON b.candidate_id=c.id AND b.basis_verification_receipt_id=r.id AND b.binding_state='UNIQUE_STORAGE_HASH_REBIND_VERIFIED'
JOIN `production_v2_artifacts` source ON c.source_table='production_v2_artifacts' AND source.id=c.source_id
WHERE c.verification_state='PARTIAL_RIGHTS_PENDING'
  AND c.bytes_state='READBACK_VERIFIED'
  AND c.checksum_state='PASS'
  AND c.provenance_state='PASS'
  AND c.rights_declared_state IN ('CHANNEL_OWNED_OR_PROVIDER_COMMERCIAL','CHANNEL_OWNED_ORIGINAL','COMMERCIAL_LICENSE_VERIFIED')
  AND lower(COALESCE(c.mime_type,source.mime_type,'')) NOT LIKE 'audio/%'
  AND lower(COALESCE(c.mime_type,source.mime_type,'')) NOT LIKE 'video/%'
  AND length(trim(COALESCE(json_extract(source.provenance_json,'$.provider'),'')))=0
  AND length(trim(COALESCE(json_extract(source.provenance_json,'$.author'),json_extract(source.provenance_json,'$.actor'),json_extract(source.provenance_json,'$.executor'),'')))>0
  AND json_extract(source.provenance_json,'$.legacySources')=0;
--> statement-breakpoint
UPDATE `v7_evaluation_candidates`
SET `rights_verification_state`='PASS',
    `verification_state`='EVIDENCE_VERIFIED',
    `verified_at`=CURRENT_TIMESTAMP
WHERE `id` IN (SELECT `candidate_id` FROM `v7_evaluation_rights_receipts` WHERE `rights_state`='PASS')
  AND `bytes_state`='READBACK_VERIFIED'
  AND `checksum_state`='PASS'
  AND `provenance_state`='PASS';
