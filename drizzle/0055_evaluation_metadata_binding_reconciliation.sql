CREATE TABLE `v7_evaluation_metadata_binding_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `candidate_id` text NOT NULL,
  `basis_verification_receipt_id` text NOT NULL,
  `observed_artifact_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'METADATA_BINDING_RECONCILIATION_V1'),
  `binding_state` text NOT NULL CHECK (`binding_state` = 'UNIQUE_STORAGE_HASH_REBIND_VERIFIED'),
  `facts_json` text NOT NULL,
  `basis_evidence_hash` text NOT NULL,
  `actor` text NOT NULL,
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`candidate_id`) REFERENCES `v7_evaluation_candidates`(`id`),
  FOREIGN KEY (`basis_verification_receipt_id`) REFERENCES `v7_evaluation_verification_receipts`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_metadata_binding_receipt_uq` ON `v7_evaluation_metadata_binding_receipts` (`candidate_id`,`basis_verification_receipt_id`,`observed_artifact_id`,`policy_version`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_metadata_binding_receipt_no_update`
BEFORE UPDATE ON `v7_evaluation_metadata_binding_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_METADATA_BINDING_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_metadata_binding_receipt_no_delete`
BEFORE DELETE ON `v7_evaluation_metadata_binding_receipts`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_METADATA_BINDING_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_incident_resolutions` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `incident_id` text NOT NULL,
  `candidate_id` text NOT NULL,
  `resolution_type` text NOT NULL CHECK (`resolution_type` = 'METADATA_ALIAS_VERIFIED'),
  `resolution_receipt_id` text NOT NULL,
  `actor` text NOT NULL,
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`incident_id`) REFERENCES `v7_evaluation_evidence_incidents`(`id`),
  FOREIGN KEY (`candidate_id`) REFERENCES `v7_evaluation_candidates`(`id`),
  FOREIGN KEY (`resolution_receipt_id`) REFERENCES `v7_evaluation_metadata_binding_receipts`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_incident_resolution_uq` ON `v7_evaluation_incident_resolutions` (`incident_id`,`resolution_type`,`resolution_receipt_id`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_incident_resolution_no_update`
BEFORE UPDATE ON `v7_evaluation_incident_resolutions`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_INCIDENT_RESOLUTION_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_incident_resolution_no_delete`
BEFORE DELETE ON `v7_evaluation_incident_resolutions`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_INCIDENT_RESOLUTION_IMMUTABLE'); END;
--> statement-breakpoint
INSERT INTO `v7_evaluation_metadata_binding_receipts`
  (`id`,`channel_id`,`candidate_id`,`basis_verification_receipt_id`,`observed_artifact_id`,`policy_version`,`binding_state`,`facts_json`,`basis_evidence_hash`,`actor`)
SELECT
  'evaluation-metadata-binding:' || c.id || ':' || r.id,
  c.channel_id,
  c.id,
  r.id,
  json_extract(r.object_metadata_json,'$.artifactId'),
  'METADATA_BINDING_RECONCILIATION_V1',
  'UNIQUE_STORAGE_HASH_REBIND_VERIFIED',
  json_object('bytesReadback',1,'checksumExact',1,'candidateSourceExact',1,'metadataPackageExact',1,'metadataHashExact',1,'metadataEngineExact',1,'observedArtifactIdPresent',1,'uniqueStorageHashSource',1,'legacySources',0),
  r.evidence_hash,
  'SYSTEM_MIGRATION_0055'
FROM `v7_evaluation_candidates` c
JOIN `v7_evaluation_verification_receipts` r ON r.id=c.latest_verification_receipt_id
JOIN `production_v2_artifacts` source ON c.source_table='production_v2_artifacts' AND source.id=c.source_id
WHERE c.verification_state='BLOCKED'
  AND r.bytes_state='READBACK_VERIFIED'
  AND r.checksum_state='PASS'
  AND r.provenance_state='FAIL'
  AND r.reconciliation_reasons_json LIKE '%R2_OBJECT_METADATA_MISMATCH%'
  AND r.reconciliation_reasons_json NOT LIKE '%PROVENANCE_JSON_INVALID%'
  AND r.reconciliation_reasons_json NOT LIKE '%LEGACY_SOURCE_ISOLATION_UNPROVEN%'
  AND json_extract(source.provenance_json,'$.legacySources')=0
  AND c.content_hash=source.sha256
  AND r.computed_hash=source.sha256
  AND c.byte_size=source.byte_size
  AND r.actual_bytes=source.byte_size
  AND length(trim(json_extract(r.object_metadata_json,'$.artifactId')))>0
  AND json_extract(r.object_metadata_json,'$.artifactId')<>source.id
  AND json_extract(r.object_metadata_json,'$.packageId')=source.package_id
  AND lower(json_extract(r.object_metadata_json,'$.sha256'))=lower(source.sha256)
  AND json_extract(r.object_metadata_json,'$.engineVersion')=source.engine_version
  AND NOT EXISTS (SELECT 1 FROM production_v2_artifacts other WHERE other.id<>source.id AND other.storage_key=source.storage_key AND lower(other.sha256)=lower(source.sha256));
--> statement-breakpoint
INSERT INTO `v7_evaluation_incident_resolutions`
  (`id`,`channel_id`,`incident_id`,`candidate_id`,`resolution_type`,`resolution_receipt_id`,`actor`)
SELECT
  'evaluation-incident-resolution:' || i.id,
  i.channel_id,
  i.id,
  i.candidate_id,
  'METADATA_ALIAS_VERIFIED',
  b.id,
  'SYSTEM_MIGRATION_0055'
FROM `v7_evaluation_evidence_incidents` i
JOIN `v7_evaluation_metadata_binding_receipts` b ON b.candidate_id=i.candidate_id AND b.basis_verification_receipt_id=i.basis_receipt_id
WHERE i.incident_type='R2_METADATA_BINDING_MISMATCH';
--> statement-breakpoint
UPDATE `v7_evaluation_candidates`
SET `provenance_state`='PASS',
    `verification_state`='PARTIAL_RIGHTS_PENDING',
    `verified_at`=CURRENT_TIMESTAMP
WHERE `id` IN (SELECT `candidate_id` FROM `v7_evaluation_metadata_binding_receipts` WHERE `binding_state`='UNIQUE_STORAGE_HASH_REBIND_VERIFIED')
  AND `bytes_state`='READBACK_VERIFIED'
  AND `checksum_state`='PASS'
  AND `rights_verification_state`<>'PASS';
