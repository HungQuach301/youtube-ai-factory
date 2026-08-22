CREATE TABLE `v7_evaluation_provider_binding_diagnostics` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `task_id` text NOT NULL,
  `candidate_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'EVALUATION_PROVIDER_BINDING_DIAGNOSTIC_V1'),
  `source_artifact_id` text NOT NULL,
  `artifact_hash` text NOT NULL CHECK (length(`artifact_hash`) = 64),
  `matching_request_count` integer NOT NULL CHECK (`matching_request_count` >= 0),
  `completed_request_count` integer NOT NULL CHECK (`completed_request_count` >= 0),
  `legacy_hash_prefix_match_count` integer NOT NULL CHECK (`legacy_hash_prefix_match_count` >= 0),
  `provider_native_response_id_verified` integer NOT NULL DEFAULT 0 CHECK (`provider_native_response_id_verified` = 0),
  `terms_plan_evidence_verified` integer NOT NULL DEFAULT 0 CHECK (`terms_plan_evidence_verified` = 0),
  `diagnostic_state` text NOT NULL CHECK (`diagnostic_state` IN ('LEGACY_SYNTHETIC_RESPONSE_BINDING_DISCOVERED','REQUEST_BINDING_MISSING','REQUEST_BINDING_AMBIGUOUS')),
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
CREATE UNIQUE INDEX `v7_evaluation_provider_binding_diagnostic_task_uq` ON `v7_evaluation_provider_binding_diagnostics` (`task_id`,`policy_version`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_provider_binding_diagnostic_no_update`
BEFORE UPDATE ON `v7_evaluation_provider_binding_diagnostics`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_PROVIDER_BINDING_DIAGNOSTIC_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_provider_binding_diagnostic_no_delete`
BEFORE DELETE ON `v7_evaluation_provider_binding_diagnostics`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_PROVIDER_BINDING_DIAGNOSTIC_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_provider_binding_diagnostic_snapshots` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'EVALUATION_PROVIDER_BINDING_DIAGNOSTIC_V1'),
  `tasks_diagnosed` integer NOT NULL CHECK (`tasks_diagnosed` >= 0),
  `legacy_synthetic_bindings` integer NOT NULL CHECK (`legacy_synthetic_bindings` >= 0),
  `request_binding_missing` integer NOT NULL CHECK (`request_binding_missing` >= 0),
  `request_binding_ambiguous` integer NOT NULL CHECK (`request_binding_ambiguous` >= 0),
  `provider_native_response_ids_verified` integer NOT NULL DEFAULT 0 CHECK (`provider_native_response_ids_verified` = 0),
  `terms_plan_evidence_verified` integer NOT NULL DEFAULT 0 CHECK (`terms_plan_evidence_verified` = 0),
  `rights_pass_authority` integer NOT NULL DEFAULT 0 CHECK (`rights_pass_authority` = 0),
  `dataset_sealing_authority` integer NOT NULL DEFAULT 0 CHECK (`dataset_sealing_authority` = 0),
  `assurance_qualification_authority` integer NOT NULL DEFAULT 0 CHECK (`assurance_qualification_authority` = 0),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_provider_binding_diagnostic_snapshot_uq` ON `v7_evaluation_provider_binding_diagnostic_snapshots` (`channel_id`,`policy_version`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_provider_binding_diagnostic_snapshot_no_update`
BEFORE UPDATE ON `v7_evaluation_provider_binding_diagnostic_snapshots`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_PROVIDER_BINDING_DIAGNOSTIC_SNAPSHOT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_provider_binding_diagnostic_snapshot_no_delete`
BEFORE DELETE ON `v7_evaluation_provider_binding_diagnostic_snapshots`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_PROVIDER_BINDING_DIAGNOSTIC_SNAPSHOT_IMMUTABLE'); END;
--> statement-breakpoint
INSERT INTO `v7_evaluation_provider_binding_diagnostics`
  (`id`,`channel_id`,`task_id`,`candidate_id`,`policy_version`,`source_artifact_id`,`artifact_hash`,`matching_request_count`,`completed_request_count`,`legacy_hash_prefix_match_count`,`diagnostic_state`,`reasons_json`)
SELECT
  'provider-binding-diagnostic:' || t.id,t.channel_id,t.id,t.candidate_id,'EVALUATION_PROVIDER_BINDING_DIAGNOSTIC_V1',a.id,lower(a.sha256),
  (SELECT COUNT(*) FROM production_v2_provider_requests p WHERE p.package_id=a.package_id AND p.provider='ELEVENLABS' AND p.operation IN ('GOLDEN_PILOT_NARRATION','FULL_VIDEO_NARRATION_CHUNK')),
  (SELECT COUNT(*) FROM production_v2_provider_requests p WHERE p.package_id=a.package_id AND p.provider='ELEVENLABS' AND p.operation IN ('GOLDEN_PILOT_NARRATION','FULL_VIDEO_NARRATION_CHUNK') AND p.lifecycle_state='COMPLETED'),
  (SELECT COUNT(*) FROM production_v2_provider_requests p WHERE p.package_id=a.package_id AND p.provider='ELEVENLABS' AND p.operation IN ('GOLDEN_PILOT_NARRATION','FULL_VIDEO_NARRATION_CHUNK') AND p.lifecycle_state='COMPLETED' AND lower(COALESCE(p.provider_response_id,''))=substr(lower(a.sha256),1,24)),
  CASE
    WHEN (SELECT COUNT(*) FROM production_v2_provider_requests p WHERE p.package_id=a.package_id AND p.provider='ELEVENLABS' AND p.operation IN ('GOLDEN_PILOT_NARRATION','FULL_VIDEO_NARRATION_CHUNK') AND p.lifecycle_state='COMPLETED' AND lower(COALESCE(p.provider_response_id,''))=substr(lower(a.sha256),1,24))=1 THEN 'LEGACY_SYNTHETIC_RESPONSE_BINDING_DISCOVERED'
    WHEN (SELECT COUNT(*) FROM production_v2_provider_requests p WHERE p.package_id=a.package_id AND p.provider='ELEVENLABS' AND p.operation IN ('GOLDEN_PILOT_NARRATION','FULL_VIDEO_NARRATION_CHUNK'))=0 THEN 'REQUEST_BINDING_MISSING'
    ELSE 'REQUEST_BINDING_AMBIGUOUS'
  END,
  CASE
    WHEN (SELECT COUNT(*) FROM production_v2_provider_requests p WHERE p.package_id=a.package_id AND p.provider='ELEVENLABS' AND p.operation IN ('GOLDEN_PILOT_NARRATION','FULL_VIDEO_NARRATION_CHUNK') AND p.lifecycle_state='COMPLETED' AND lower(COALESCE(p.provider_response_id,''))=substr(lower(a.sha256),1,24))=1
      THEN json_array('LEGACY_ARTIFACT_HASH_PREFIX_MATCH_ONLY','PROVIDER_NATIVE_REQUEST_ID_NOT_CAPTURED','TERMS_AND_PAID_PLAN_EVIDENCE_REQUIRED')
    WHEN (SELECT COUNT(*) FROM production_v2_provider_requests p WHERE p.package_id=a.package_id AND p.provider='ELEVENLABS' AND p.operation IN ('GOLDEN_PILOT_NARRATION','FULL_VIDEO_NARRATION_CHUNK'))=0
      THEN json_array('NO_SAME_PACKAGE_ELEVENLABS_REQUEST','PROVIDER_NATIVE_REQUEST_ID_NOT_CAPTURED','TERMS_AND_PAID_PLAN_EVIDENCE_REQUIRED')
    ELSE json_array('EXACT_ARTIFACT_TO_REQUEST_BINDING_NOT_UNIQUE','PROVIDER_NATIVE_REQUEST_ID_NOT_CAPTURED','TERMS_AND_PAID_PLAN_EVIDENCE_REQUIRED')
  END
FROM `v7_evaluation_rights_evidence_tasks` t
JOIN `v7_evaluation_candidates` c ON c.id=t.candidate_id
JOIN `production_v2_artifacts` a ON c.source_table='production_v2_artifacts' AND a.id=c.source_id
WHERE t.channel_id='channel-hidden-systems' AND t.task_type='PROVIDER_TERMS_AND_PLAN_RECEIPT';
--> statement-breakpoint
INSERT INTO `v7_evaluation_provider_binding_diagnostic_snapshots`
  (`id`,`channel_id`,`policy_version`,`tasks_diagnosed`,`legacy_synthetic_bindings`,`request_binding_missing`,`request_binding_ambiguous`)
SELECT 'provider-binding-diagnostic-snapshot:channel-hidden-systems','channel-hidden-systems','EVALUATION_PROVIDER_BINDING_DIAGNOSTIC_V1',COUNT(*),
  COALESCE(SUM(CASE WHEN diagnostic_state='LEGACY_SYNTHETIC_RESPONSE_BINDING_DISCOVERED' THEN 1 ELSE 0 END),0),
  COALESCE(SUM(CASE WHEN diagnostic_state='REQUEST_BINDING_MISSING' THEN 1 ELSE 0 END),0),
  COALESCE(SUM(CASE WHEN diagnostic_state='REQUEST_BINDING_AMBIGUOUS' THEN 1 ELSE 0 END),0)
FROM `v7_evaluation_provider_binding_diagnostics`
WHERE channel_id='channel-hidden-systems' AND policy_version='EVALUATION_PROVIDER_BINDING_DIAGNOSTIC_V1';
