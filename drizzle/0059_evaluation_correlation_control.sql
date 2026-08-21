CREATE TABLE `v7_evaluation_correlation_snapshots` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'EVALUATION_CORRELATION_CONTROL_V1'),
  `candidate_count` integer NOT NULL CHECK (`candidate_count` >= 0),
  `primary_representative_count` integer NOT NULL CHECK (`primary_representative_count` >= 0),
  `exact_duplicate_deferred_count` integer NOT NULL CHECK (`exact_duplicate_deferred_count` >= 0),
  `correlated_variant_deferred_count` integer NOT NULL CHECK (`correlated_variant_deferred_count` >= 0),
  `independent_count_eligible` integer NOT NULL CHECK (`independent_count_eligible` >= 0),
  `evidence_json` text NOT NULL,
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_correlation_snapshot_uq` ON `v7_evaluation_correlation_snapshots` (`channel_id`,`policy_version`);
--> statement-breakpoint
CREATE TABLE `v7_evaluation_correlation_items` (
  `id` text PRIMARY KEY NOT NULL,
  `snapshot_id` text NOT NULL,
  `channel_id` text NOT NULL,
  `candidate_id` text NOT NULL,
  `exact_artifact_hash` text NOT NULL CHECK (length(`exact_artifact_hash`) = 64),
  `lineage_group_key` text NOT NULL,
  `representative_candidate_id` text NOT NULL,
  `relation_class` text NOT NULL CHECK (`relation_class` IN ('INDEPENDENT_SINGLETON','EXACT_BYTE_DUPLICATE','CORRELATED_VARIANT')),
  `queue_role` text NOT NULL CHECK (`queue_role` IN ('PRIMARY_REPRESENTATIVE','EXACT_DUPLICATE_DEFERRED','CORRELATED_VARIANT_DEFERRED')),
  `attention_state` text NOT NULL CHECK (`attention_state` IN ('READY_PRIMARY','DEFERRED_EXACT_DUPLICATE','DEFERRED_CORRELATED_VARIANT')),
  `independent_count_eligible` integer NOT NULL CHECK (`independent_count_eligible` IN (0,1)),
  `selection_rank` integer NOT NULL CHECK (`selection_rank` >= 1),
  `selection_basis_json` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'EVALUATION_CORRELATION_CONTROL_V1'),
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`snapshot_id`) REFERENCES `v7_evaluation_correlation_snapshots`(`id`),
  FOREIGN KEY (`candidate_id`) REFERENCES `v7_evaluation_candidates`(`id`),
  FOREIGN KEY (`representative_candidate_id`) REFERENCES `v7_evaluation_candidates`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_correlation_item_candidate_uq` ON `v7_evaluation_correlation_items` (`candidate_id`,`policy_version`);
--> statement-breakpoint
CREATE INDEX `v7_evaluation_correlation_queue_idx` ON `v7_evaluation_correlation_items` (`channel_id`,`attention_state`,`queue_role`,`candidate_id`);
--> statement-breakpoint
CREATE INDEX `v7_evaluation_correlation_lineage_idx` ON `v7_evaluation_correlation_items` (`channel_id`,`lineage_group_key`,`independent_count_eligible`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_correlation_item_no_update`
BEFORE UPDATE ON `v7_evaluation_correlation_items`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CORRELATION_ITEM_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_correlation_item_no_delete`
BEFORE DELETE ON `v7_evaluation_correlation_items`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CORRELATION_ITEM_IMMUTABLE'); END;
--> statement-breakpoint
INSERT INTO `v7_evaluation_correlation_snapshots`
  (`id`,`channel_id`,`policy_version`,`candidate_count`,`primary_representative_count`,`exact_duplicate_deferred_count`,`correlated_variant_deferred_count`,`independent_count_eligible`,`evidence_json`)
SELECT
  'evaluation-correlation-snapshot:' || channel_id || ':v1',channel_id,'EVALUATION_CORRELATION_CONTROL_V1',COUNT(*),0,0,0,0,
  '{"authority":"ATTENTION_ROUTING_ONLY","exactBytes":"SHA256","lineage":"SHOT_OR_PACKAGE_ARTIFACT_FAMILY","fixturePromotion":0,"datasetAuthority":0}'
FROM `v7_evaluation_owner_label_tasks`
GROUP BY channel_id;
--> statement-breakpoint
INSERT INTO `v7_evaluation_correlation_items`
  (`id`,`snapshot_id`,`channel_id`,`candidate_id`,`exact_artifact_hash`,`lineage_group_key`,`representative_candidate_id`,`relation_class`,`queue_role`,`attention_state`,`independent_count_eligible`,`selection_rank`,`selection_basis_json`,`policy_version`)
WITH eligible AS (
  SELECT
    t.channel_id,t.candidate_id,lower(t.exact_artifact_hash) exact_artifact_hash,t.candidate_kind,t.artifact_type,
    a.shot_contract_id,a.package_id,a.created_at,
    COALESCE((SELECT MAX(q.p0_count * 1000 + q.p1_count) FROM production_v2_quality_assessments q WHERE q.artifact_id=a.id),0) defect_weight,
    CASE WHEN a.shot_contract_id IS NOT NULL
      THEN 'SHOT:' || a.shot_contract_id || ':TYPE:' || lower(t.artifact_type)
      ELSE 'PACKAGE:' || a.package_id || ':KIND:' || t.candidate_kind || ':TYPE:' || lower(t.artifact_type)
    END lineage_group_key
  FROM v7_evaluation_owner_label_tasks t
  JOIN v7_evaluation_candidates c ON c.id=t.candidate_id
  JOIN production_v2_artifacts a ON c.source_table='production_v2_artifacts' AND a.id=c.source_id
  WHERE t.policy_version='EVALUATION_OWNER_LABEL_POLICY_V1'
    AND c.lifecycle_state='CANDIDATE_EVIDENCE' AND c.verification_state='EVIDENCE_VERIFIED'
    AND c.rights_verification_state='PASS' AND c.release_eligible=0
), exact_ranked AS (
  SELECT eligible.*,
    COUNT(*) OVER (PARTITION BY channel_id,exact_artifact_hash) exact_group_size,
    ROW_NUMBER() OVER (PARTITION BY channel_id,exact_artifact_hash ORDER BY defect_weight DESC,created_at DESC,candidate_id) exact_rank
  FROM eligible
), hash_representatives AS (
  SELECT exact_ranked.*,
    COUNT(*) OVER (PARTITION BY channel_id,lineage_group_key) lineage_unique_hash_count,
    ROW_NUMBER() OVER (PARTITION BY channel_id,lineage_group_key ORDER BY defect_weight DESC,created_at DESC,candidate_id) lineage_rank
  FROM exact_ranked
  WHERE exact_rank=1
), resolved AS (
  SELECT e.*,
    h.lineage_group_key resolved_lineage_group_key,h.lineage_unique_hash_count,h.lineage_rank,
    FIRST_VALUE(h.candidate_id) OVER (PARTITION BY h.channel_id,h.lineage_group_key ORDER BY h.lineage_rank) lineage_representative_candidate_id
  FROM exact_ranked e
  JOIN hash_representatives h ON h.channel_id=e.channel_id AND h.exact_artifact_hash=e.exact_artifact_hash
)
SELECT
  'evaluation-correlation-item:' || candidate_id,
  'evaluation-correlation-snapshot:' || channel_id || ':v1',channel_id,candidate_id,exact_artifact_hash,resolved_lineage_group_key,
  lineage_representative_candidate_id,
  CASE WHEN exact_group_size>1 THEN 'EXACT_BYTE_DUPLICATE' WHEN lineage_unique_hash_count>1 THEN 'CORRELATED_VARIANT' ELSE 'INDEPENDENT_SINGLETON' END,
  CASE WHEN exact_rank>1 THEN 'EXACT_DUPLICATE_DEFERRED' WHEN lineage_rank>1 THEN 'CORRELATED_VARIANT_DEFERRED' ELSE 'PRIMARY_REPRESENTATIVE' END,
  CASE WHEN exact_rank>1 THEN 'DEFERRED_EXACT_DUPLICATE' WHEN lineage_rank>1 THEN 'DEFERRED_CORRELATED_VARIANT' ELSE 'READY_PRIMARY' END,
  CASE WHEN exact_rank=1 AND lineage_rank=1 THEN 1 ELSE 0 END,
  CASE WHEN exact_rank>1 THEN exact_rank ELSE lineage_rank END,
  json_object('exactGroupSize',exact_group_size,'lineageUniqueHashCount',lineage_unique_hash_count,'defectEvidenceWeight',defect_weight,'sourceCreatedAt',created_at,'rule','DEFECT_EVIDENCE_THEN_LATEST_THEN_ID'),
  'EVALUATION_CORRELATION_CONTROL_V1'
FROM resolved;
--> statement-breakpoint
UPDATE `v7_evaluation_correlation_snapshots`
SET
  `primary_representative_count`=(SELECT COUNT(*) FROM v7_evaluation_correlation_items i WHERE i.snapshot_id=v7_evaluation_correlation_snapshots.id AND i.queue_role='PRIMARY_REPRESENTATIVE'),
  `exact_duplicate_deferred_count`=(SELECT COUNT(*) FROM v7_evaluation_correlation_items i WHERE i.snapshot_id=v7_evaluation_correlation_snapshots.id AND i.queue_role='EXACT_DUPLICATE_DEFERRED'),
  `correlated_variant_deferred_count`=(SELECT COUNT(*) FROM v7_evaluation_correlation_items i WHERE i.snapshot_id=v7_evaluation_correlation_snapshots.id AND i.queue_role='CORRELATED_VARIANT_DEFERRED'),
  `independent_count_eligible`=(SELECT COUNT(*) FROM v7_evaluation_correlation_items i WHERE i.snapshot_id=v7_evaluation_correlation_snapshots.id AND i.independent_count_eligible=1);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_correlation_snapshot_no_update`
BEFORE UPDATE ON `v7_evaluation_correlation_snapshots`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CORRELATION_SNAPSHOT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_correlation_snapshot_no_delete`
BEFORE DELETE ON `v7_evaluation_correlation_snapshots`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_CORRELATION_SNAPSHOT_IMMUTABLE'); END;
