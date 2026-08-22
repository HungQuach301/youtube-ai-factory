CREATE TABLE `v7_evaluation_regression_corpus_registry` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'WP7_REGRESSION_CORPUS_POLICY_V1'),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('INSUFFICIENT_GROUND_TRUTH','READY_FOR_DATASET_DESIGN')),
  `target_reference_minimum` integer NOT NULL DEFAULT 10 CHECK (`target_reference_minimum` = 10),
  `target_reference_maximum` integer NOT NULL DEFAULT 15 CHECK (`target_reference_maximum` = 15),
  `dataset_sealing_authority` integer NOT NULL DEFAULT 0 CHECK (`dataset_sealing_authority` = 0),
  `assurance_qualification_authority` integer NOT NULL DEFAULT 0 CHECK (`assurance_qualification_authority` = 0),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_regression_corpus_registry_channel_uq` ON `v7_evaluation_regression_corpus_registry` (`channel_id`,`policy_version`);
--> statement-breakpoint
CREATE TABLE `v7_evaluation_regression_corpus_items` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `candidate_id` text NOT NULL,
  `factory_task_id` text NOT NULL,
  `source_lane` text NOT NULL CHECK (`source_lane` IN ('OWNER_ANCHOR','FACTORY_VISUAL_FAILURE')),
  `source_receipt_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'WP7_REGRESSION_CORPUS_POLICY_V1'),
  `exact_artifact_hash` text NOT NULL CHECK (length(`exact_artifact_hash`) = 64),
  `lineage_group_key` text NOT NULL,
  `candidate_kind` text NOT NULL,
  `artifact_type` text NOT NULL,
  `mime_type` text NOT NULL,
  `evidence_authority` text NOT NULL CHECK (`evidence_authority` IN ('OWNER_CONFIRMED_REFERENCE','INDEPENDENT_REVIEW_ONLY')),
  `expected_decision` text NOT NULL CHECK (`expected_decision` IN ('DEFECT_PRESENT','CLEAN_NEGATIVE')),
  `labels_json` text NOT NULL,
  `independent_count_eligible` integer NOT NULL CHECK (`independent_count_eligible` = 1),
  `reference_eligible` integer NOT NULL CHECK (`reference_eligible` IN (0,1)),
  `dataset_eligible` integer NOT NULL DEFAULT 0 CHECK (`dataset_eligible` = 0),
  `release_eligible` integer NOT NULL DEFAULT 0 CHECK (`release_eligible` = 0),
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`candidate_id`) REFERENCES `v7_evaluation_candidates`(`id`),
  FOREIGN KEY (`factory_task_id`) REFERENCES `v7_evaluation_factory_qa_tasks`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_regression_corpus_item_source_uq` ON `v7_evaluation_regression_corpus_items` (`source_lane`,`source_receipt_id`,`policy_version`);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_regression_corpus_item_candidate_lane_uq` ON `v7_evaluation_regression_corpus_items` (`candidate_id`,`source_lane`,`policy_version`);
--> statement-breakpoint
CREATE INDEX `v7_evaluation_regression_corpus_authority_idx` ON `v7_evaluation_regression_corpus_items` (`channel_id`,`evidence_authority`,`expected_decision`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_regression_corpus_item_no_update`
BEFORE UPDATE ON `v7_evaluation_regression_corpus_items`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_REGRESSION_CORPUS_ITEM_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_regression_corpus_item_no_delete`
BEFORE DELETE ON `v7_evaluation_regression_corpus_items`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_REGRESSION_CORPUS_ITEM_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `v7_evaluation_regression_readiness_snapshots` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `policy_version` text NOT NULL CHECK (`policy_version` = 'WP7_REGRESSION_CORPUS_POLICY_V1'),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('INSUFFICIENT_GROUND_TRUTH','READY_FOR_DATASET_DESIGN')),
  `candidate_items` integer NOT NULL CHECK (`candidate_items` >= 0),
  `independent_review_only` integer NOT NULL CHECK (`independent_review_only` >= 0),
  `owner_confirmed_references` integer NOT NULL CHECK (`owner_confirmed_references` >= 0),
  `clean_negative_controls` integer NOT NULL CHECK (`clean_negative_controls` >= 0),
  `controlled_injection_fixtures` integer NOT NULL DEFAULT 0 CHECK (`controlled_injection_fixtures` = 0),
  `p0_families_covered` integer NOT NULL CHECK (`p0_families_covered` >= 0),
  `p0_families_required` integer NOT NULL CHECK (`p0_families_required` >= 0),
  `readiness_json` text NOT NULL,
  `dataset_sealing_authority` integer NOT NULL DEFAULT 0 CHECK (`dataset_sealing_authority` = 0),
  `assurance_qualification_authority` integer NOT NULL DEFAULT 0 CHECK (`assurance_qualification_authority` = 0),
  `release_authority` integer NOT NULL DEFAULT 0 CHECK (`release_authority` = 0),
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_regression_readiness_channel_uq` ON `v7_evaluation_regression_readiness_snapshots` (`channel_id`,`policy_version`);
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_regression_readiness_no_update`
BEFORE UPDATE ON `v7_evaluation_regression_readiness_snapshots`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_REGRESSION_READINESS_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `v7_evaluation_regression_readiness_no_delete`
BEFORE DELETE ON `v7_evaluation_regression_readiness_snapshots`
BEGIN SELECT RAISE(ABORT, 'EVALUATION_REGRESSION_READINESS_IMMUTABLE'); END;
--> statement-breakpoint
INSERT INTO `v7_evaluation_regression_corpus_registry`
  (`id`,`channel_id`,`policy_version`,`lifecycle_state`)
VALUES
  ('wp7-regression-corpus:channel-hidden-systems','channel-hidden-systems','WP7_REGRESSION_CORPUS_POLICY_V1','INSUFFICIENT_GROUND_TRUTH');
--> statement-breakpoint
INSERT INTO `v7_evaluation_regression_corpus_items`
  (`id`,`channel_id`,`candidate_id`,`factory_task_id`,`source_lane`,`source_receipt_id`,`policy_version`,`exact_artifact_hash`,`lineage_group_key`,`candidate_kind`,`artifact_type`,`mime_type`,`evidence_authority`,`expected_decision`,`labels_json`,`independent_count_eligible`,`reference_eligible`)
SELECT
  'wp7-regression-owner:' || o.id,
  q.channel_id,q.candidate_id,q.id,'OWNER_ANCHOR',o.id,'WP7_REGRESSION_CORPUS_POLICY_V1',lower(q.exact_artifact_hash),i.lineage_group_key,q.candidate_kind,q.artifact_type,q.mime_type,
  'OWNER_CONFIRMED_REFERENCE',
  CASE WHEN o.decision_state='CLEAN_NEGATIVE_CONTROL' THEN 'CLEAN_NEGATIVE' ELSE 'DEFECT_PRESENT' END,
  o.labels_json,1,1
FROM `v7_evaluation_factory_qa_tasks` q
JOIN `v7_evaluation_owner_label_receipts` o ON o.task_id=q.owner_task_id AND o.candidate_id=q.candidate_id AND lower(o.exact_artifact_hash)=lower(q.exact_artifact_hash)
JOIN `v7_evaluation_correlation_items` i ON i.candidate_id=q.candidate_id AND i.policy_version='EVALUATION_CORRELATION_CONTROL_V1' AND i.independent_count_eligible=1
JOIN `v7_evaluation_candidates` c ON c.id=q.candidate_id AND c.verification_state='EVIDENCE_VERIFIED' AND c.rights_verification_state='PASS' AND c.release_eligible=0
WHERE q.channel_id='channel-hidden-systems' AND q.task_class='OWNER_ANCHOR' AND o.decision_state IN ('REJECTED_DEFECT_PRESENT','CLEAN_NEGATIVE_CONTROL');
--> statement-breakpoint
INSERT INTO `v7_evaluation_regression_corpus_items`
  (`id`,`channel_id`,`candidate_id`,`factory_task_id`,`source_lane`,`source_receipt_id`,`policy_version`,`exact_artifact_hash`,`lineage_group_key`,`candidate_kind`,`artifact_type`,`mime_type`,`evidence_authority`,`expected_decision`,`labels_json`,`independent_count_eligible`,`reference_eligible`)
SELECT
  'wp7-regression-factory:' || f.id,
  q.channel_id,q.candidate_id,q.id,'FACTORY_VISUAL_FAILURE',f.id,'WP7_REGRESSION_CORPUS_POLICY_V1',lower(q.exact_artifact_hash),i.lineage_group_key,q.candidate_kind,q.artifact_type,q.mime_type,
  'INDEPENDENT_REVIEW_ONLY','DEFECT_PRESENT',f.labels_json,1,0
FROM `v7_evaluation_factory_qa_tasks` q
JOIN `v7_evaluation_factory_qa_registry` g ON g.channel_id=q.channel_id AND g.policy_version=q.policy_version
JOIN `v7_evaluation_factory_qa_receipts` f ON f.task_id=q.id AND f.calibration_version=g.calibration_version
JOIN `v7_evaluation_correlation_items` i ON i.candidate_id=q.candidate_id AND i.policy_version='EVALUATION_CORRELATION_CONTROL_V1' AND i.independent_count_eligible=1
JOIN `v7_evaluation_candidates` c ON c.id=q.candidate_id AND c.verification_state='EVIDENCE_VERIFIED' AND c.rights_verification_state='PASS' AND c.release_eligible=0
WHERE q.channel_id='channel-hidden-systems' AND q.task_class='UNREVIEWED_PRIMARY'
  AND f.review_surface='OPENAI_VISION' AND f.decision_state='LIKELY_DEFECT_PRESENT'
  AND NOT EXISTS (SELECT 1 FROM `v7_evaluation_factory_qa_routing_adjudications` a WHERE a.source_receipt_id=f.id);
--> statement-breakpoint
INSERT INTO `v7_evaluation_regression_readiness_snapshots`
  (`id`,`channel_id`,`policy_version`,`lifecycle_state`,`candidate_items`,`independent_review_only`,`owner_confirmed_references`,`clean_negative_controls`,`controlled_injection_fixtures`,`p0_families_covered`,`p0_families_required`,`readiness_json`)
SELECT
  'wp7-regression-readiness:channel-hidden-systems','channel-hidden-systems','WP7_REGRESSION_CORPUS_POLICY_V1','INSUFFICIENT_GROUND_TRUTH',
  COUNT(*),
  COALESCE(SUM(CASE WHEN evidence_authority='INDEPENDENT_REVIEW_ONLY' THEN 1 ELSE 0 END),0),
  COALESCE(SUM(CASE WHEN evidence_authority='OWNER_CONFIRMED_REFERENCE' THEN 1 ELSE 0 END),0),
  COALESCE(SUM(CASE WHEN evidence_authority='OWNER_CONFIRMED_REFERENCE' AND expected_decision='CLEAN_NEGATIVE' THEN 1 ELSE 0 END),0),
  0,
  (SELECT COUNT(DISTINCT d.defect_key)
    FROM v7_evaluation_defect_labels l
    JOIN v7_evaluation_defect_taxonomy d ON d.id=l.defect_id AND d.active=1 AND d.severity='P0'
    JOIN v7_evaluation_regression_corpus_items x ON x.candidate_id=l.candidate_id AND x.evidence_authority='OWNER_CONFIRMED_REFERENCE'
    WHERE l.label_source='OWNER' AND l.polarity='PRESENT'),
  (SELECT COUNT(*) FROM v7_evaluation_defect_taxonomy d WHERE d.active=1 AND d.severity='P0'),
  json_object(
    'authority','CANDIDATE_CORPUS_ONLY',
    'targetReferenceRange','10-15',
    'requiresOwnerConfirmedGroundTruth',1,
    'requiresCleanNegativeControl',1,
    'requiresControlledInjection',1,
    'requiresCompleteP0Coverage',1,
    'datasetSealed',0,
    'assuranceQualified',0,
    'releaseEligible',0
  )
FROM `v7_evaluation_regression_corpus_items`
WHERE channel_id='channel-hidden-systems';
