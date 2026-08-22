CREATE TABLE `v7_evaluation_rights_lineage_diagnostics` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `task_id` text NOT NULL,
  `candidate_id` text NOT NULL,
  `task_type` text NOT NULL CHECK (`task_type` IN ('COMPOSITE_PARENT_RIGHTS_MANIFEST','AUTHORSHIP_SOURCE_RECEIPT')),
  `policy_version` text NOT NULL CHECK (`policy_version` = 'EVALUATION_RIGHTS_LINEAGE_DIAGNOSTIC_V1'),
  `source_artifact_id` text NOT NULL,
  `artifact_hash` text NOT NULL CHECK (length(`artifact_hash`) = 64),
  `declared_source_manifest_id` text,
  `declared_source_manifest_hash` text,
  `discoverable_package_manifest_count` integer NOT NULL CHECK (`discoverable_package_manifest_count` >= 0),
  `declared_parent_count` integer NOT NULL CHECK (`declared_parent_count` >= 0),
  `verified_parent_count` integer NOT NULL DEFAULT 0 CHECK (`verified_parent_count` = 0),
  `diagnostic_state` text NOT NULL CHECK (`diagnostic_state` IN ('SOURCE_LINEAGE_BINDING_MISSING','SOURCE_LINEAGE_DECLARED_UNVERIFIED')),
  `reasons_json` text NOT NULL,
  `rights_pass_authority` integer NOT NULL DEFAULT 0 CHECK (`rights_pass_authority` = 0),
  `dataset_sealing_authority` integer NOT NULL DEFAULT 0 CHECK (`dataset_sealing_authority` = 0),
  `assurance_qualification_authority` integer NOT NULL DEFAULT 0 CHECK (`assurance_qualification_authority` = 0),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`task_id`) REFERENCES `v7_evaluation_rights_evidence_tasks`(`id`),
  FOREIGN KEY (`candidate_id`) REFERENCES `v7_evaluation_candidates`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_rights_lineage_diagnostic_task_uq` ON `v7_evaluation_rights_lineage_diagnostics` (`task_id`,`policy_version`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_rights_lineage_diagnostic_no_update`
BEFORE UPDATE ON `v7_evaluation_rights_lineage_diagnostics`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_RIGHTS_LINEAGE_DIAGNOSTIC_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_rights_lineage_diagnostic_no_delete`
BEFORE DELETE ON `v7_evaluation_rights_lineage_diagnostics`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_RIGHTS_LINEAGE_DIAGNOSTIC_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_rights_lineage_diagnostic_snapshots` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'EVALUATION_RIGHTS_LINEAGE_DIAGNOSTIC_V1'),
  `tasks_diagnosed` integer NOT NULL CHECK (`tasks_diagnosed` >= 0),
  `composite_tasks` integer NOT NULL CHECK (`composite_tasks` >= 0),
  `authorship_tasks` integer NOT NULL CHECK (`authorship_tasks` >= 0),
  `source_lineage_binding_missing` integer NOT NULL CHECK (`source_lineage_binding_missing` >= 0),
  `source_lineage_declared_unverified` integer NOT NULL CHECK (`source_lineage_declared_unverified` >= 0),
  `rights_pass_authority` integer NOT NULL DEFAULT 0 CHECK (`rights_pass_authority` = 0),
  `dataset_sealing_authority` integer NOT NULL DEFAULT 0 CHECK (`dataset_sealing_authority` = 0),
  `assurance_qualification_authority` integer NOT NULL DEFAULT 0 CHECK (`assurance_qualification_authority` = 0),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_rights_lineage_diagnostic_snapshot_uq` ON `v7_evaluation_rights_lineage_diagnostic_snapshots` (`channel_id`,`policy_version`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_rights_lineage_diagnostic_snapshot_no_update`
BEFORE UPDATE ON `v7_evaluation_rights_lineage_diagnostic_snapshots`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_RIGHTS_LINEAGE_DIAGNOSTIC_SNAPSHOT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_rights_lineage_diagnostic_snapshot_no_delete`
BEFORE DELETE ON `v7_evaluation_rights_lineage_diagnostic_snapshots`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_RIGHTS_LINEAGE_DIAGNOSTIC_SNAPSHOT_IMMUTABLE'); END;
--> statement-breakpoint
INSERT INTO `v7_evaluation_rights_lineage_diagnostics`
  (`id`,`channel_id`,`task_id`,`candidate_id`,`task_type`,`policy_version`,`source_artifact_id`,`artifact_hash`,`declared_source_manifest_id`,`declared_source_manifest_hash`,`discoverable_package_manifest_count`,`declared_parent_count`,`diagnostic_state`,`reasons_json`)
SELECT
  'rights-lineage-diagnostic:' || t.id,
  t.channel_id,t.id,t.candidate_id,t.task_type,'EVALUATION_RIGHTS_LINEAGE_DIAGNOSTIC_V1',a.id,lower(a.sha256),
  NULLIF(trim(COALESCE(json_extract(a.provenance_json,'$.sourceManifestId'),'')),''),
  NULLIF(lower(trim(COALESCE(json_extract(a.provenance_json,'$.sourceManifestHash'),''))),''),
  (SELECT COUNT(*) FROM production_v2_artifacts m WHERE m.package_id=a.package_id AND m.artifact_type=CASE WHEN t.task_type='COMPOSITE_PARENT_RIGHTS_MANIFEST' THEN 'FULL_VIDEO_MANIFEST' ELSE 'PILOT_MANIFEST' END),
  COALESCE(json_array_length(json_extract(a.provenance_json,'$.parentArtifactIds')),0),
  CASE WHEN NULLIF(trim(COALESCE(json_extract(a.provenance_json,'$.sourceManifestId'),'')),'') IS NULL
    OR length(trim(COALESCE(json_extract(a.provenance_json,'$.sourceManifestHash'),''))) != 64
    OR COALESCE(json_array_length(json_extract(a.provenance_json,'$.parentArtifactIds')),0)=0
    THEN 'SOURCE_LINEAGE_BINDING_MISSING' ELSE 'SOURCE_LINEAGE_DECLARED_UNVERIFIED' END,
  CASE WHEN NULLIF(trim(COALESCE(json_extract(a.provenance_json,'$.sourceManifestId'),'')),'') IS NULL
    OR length(trim(COALESCE(json_extract(a.provenance_json,'$.sourceManifestHash'),''))) != 64
    OR COALESCE(json_array_length(json_extract(a.provenance_json,'$.parentArtifactIds')),0)=0
    THEN json_array('SOURCE_ARTIFACT_HAS_NO_EXACT_MANIFEST_BINDING','SOURCE_ARTIFACT_HAS_NO_EXACT_PARENT_SET','SAME_PACKAGE_MANIFEST_IS_NOT_EXACT_RENDER_BINDING')
    ELSE json_array('R2_MANIFEST_READBACK_REQUIRED','PARENT_ARTIFACT_HASH_READBACK_REQUIRED','PARENT_RIGHTS_RECEIPTS_REQUIRED') END
FROM `v7_evaluation_rights_evidence_tasks` t
JOIN `v7_evaluation_candidates` c ON c.id=t.candidate_id
JOIN `production_v2_artifacts` a ON c.source_table='production_v2_artifacts' AND a.id=c.source_id
WHERE t.channel_id='channel-hidden-systems' AND t.task_type IN ('COMPOSITE_PARENT_RIGHTS_MANIFEST','AUTHORSHIP_SOURCE_RECEIPT');
--> statement-breakpoint
INSERT INTO `v7_evaluation_rights_lineage_diagnostic_snapshots`
  (`id`,`channel_id`,`policy_version`,`tasks_diagnosed`,`composite_tasks`,`authorship_tasks`,`source_lineage_binding_missing`,`source_lineage_declared_unverified`)
SELECT
  'rights-lineage-diagnostic-snapshot:channel-hidden-systems','channel-hidden-systems','EVALUATION_RIGHTS_LINEAGE_DIAGNOSTIC_V1',COUNT(*),
  COALESCE(SUM(CASE WHEN task_type='COMPOSITE_PARENT_RIGHTS_MANIFEST' THEN 1 ELSE 0 END),0),
  COALESCE(SUM(CASE WHEN task_type='AUTHORSHIP_SOURCE_RECEIPT' THEN 1 ELSE 0 END),0),
  COALESCE(SUM(CASE WHEN diagnostic_state='SOURCE_LINEAGE_BINDING_MISSING' THEN 1 ELSE 0 END),0),
  COALESCE(SUM(CASE WHEN diagnostic_state='SOURCE_LINEAGE_DECLARED_UNVERIFIED' THEN 1 ELSE 0 END),0)
FROM `v7_evaluation_rights_lineage_diagnostics`
WHERE channel_id='channel-hidden-systems' AND policy_version='EVALUATION_RIGHTS_LINEAGE_DIAGNOSTIC_V1';
