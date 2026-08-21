CREATE TABLE `v7_evaluation_foundation_registry` (
  `id` text PRIMARY KEY NOT NULL,
  `component_key` text NOT NULL,
  `foundation_version` text NOT NULL CHECK (`foundation_version` = 'EVALUATION_FOUNDATION_V1'),
  `purpose` text NOT NULL,
  `exit_evidence_json` text NOT NULL,
  `lifecycle_state` text NOT NULL DEFAULT 'SCHEMA_DEFINED',
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `active` integer NOT NULL DEFAULT 1,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_registry_key_version_uq` ON `v7_evaluation_foundation_registry` (`component_key`,`foundation_version`);
--> statement-breakpoint
CREATE TABLE `v7_evaluation_corpus_sources` (
  `id` text PRIMARY KEY NOT NULL,
  `source_family` text NOT NULL,
  `source_table` text NOT NULL,
  `candidate_kind` text NOT NULL CHECK (`candidate_kind` IN ('MIXED','CLIP','SHOT','AUDIO','MASTER','PACKAGING')),
  `authority_state` text NOT NULL DEFAULT 'CANDIDATE_EVIDENCE_ONLY',
  `inclusion_rule_json` text NOT NULL,
  `verification_requirements_json` text NOT NULL,
  `active` integer NOT NULL DEFAULT 1,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_corpus_source_uq` ON `v7_evaluation_corpus_sources` (`source_family`,`source_table`);
--> statement-breakpoint
CREATE TABLE `v7_evaluation_candidates` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `source_family` text NOT NULL,
  `source_table` text NOT NULL,
  `source_id` text NOT NULL,
  `source_parent_id` text,
  `candidate_kind` text NOT NULL CHECK (`candidate_kind` IN ('CLIP','SHOT','AUDIO','MASTER','PACKAGING')),
  `artifact_type` text NOT NULL,
  `lifecycle_state` text NOT NULL DEFAULT 'CANDIDATE_EVIDENCE' CHECK (`lifecycle_state` IN ('CANDIDATE_EVIDENCE','VERIFICATION_IN_PROGRESS','VERIFIED_FIXTURE','GOLD_ELIGIBLE','EXCLUDED')),
  `storage_key` text,
  `mime_type` text,
  `byte_size` integer,
  `content_hash` text,
  `bytes_state` text NOT NULL DEFAULT 'NOT_VERIFIED',
  `checksum_state` text NOT NULL DEFAULT 'DECLARED_UNVERIFIED',
  `provenance_state` text NOT NULL DEFAULT 'DECLARED_UNVERIFIED',
  `owner_decision_state` text NOT NULL DEFAULT 'NOT_VERIFIED',
  `defect_label_state` text NOT NULL DEFAULT 'NOT_LABELLED',
  `rights_declared_state` text NOT NULL DEFAULT 'UNKNOWN',
  `rights_verification_state` text NOT NULL DEFAULT 'NOT_VERIFIED',
  `correlation_group` text NOT NULL,
  `dedup_hash` text,
  `exclusion_reason` text,
  `release_eligible` integer NOT NULL DEFAULT 0 CHECK (`release_eligible` = 0),
  `qualification_eligible` integer NOT NULL DEFAULT 0 CHECK (`qualification_eligible` IN (0,1)),
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `verified_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_candidate_source_uq` ON `v7_evaluation_candidates` (`source_table`,`source_id`);
--> statement-breakpoint
CREATE INDEX `v7_evaluation_candidate_channel_state_idx` ON `v7_evaluation_candidates` (`channel_id`,`lifecycle_state`,`candidate_kind`);
--> statement-breakpoint
CREATE INDEX `v7_evaluation_candidate_dedup_idx` ON `v7_evaluation_candidates` (`dedup_hash`,`correlation_group`);
--> statement-breakpoint
CREATE TABLE `v7_evaluation_defect_taxonomy` (
  `id` text PRIMARY KEY NOT NULL,
  `defect_key` text NOT NULL,
  `label` text NOT NULL,
  `severity` text NOT NULL CHECK (`severity` IN ('P0','P1','P2')),
  `modality` text NOT NULL,
  `owning_stage` text NOT NULL,
  `deterministic_detectable` integer NOT NULL DEFAULT 0,
  `approved_recall_floor` real,
  `description` text NOT NULL,
  `lifecycle_state` text NOT NULL DEFAULT 'CALIBRATION_REQUIRED',
  `active` integer NOT NULL DEFAULT 1,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_defect_key_uq` ON `v7_evaluation_defect_taxonomy` (`defect_key`);
--> statement-breakpoint
CREATE TABLE `v7_evaluation_defect_labels` (
  `id` text PRIMARY KEY NOT NULL,
  `candidate_id` text NOT NULL,
  `defect_id` text NOT NULL,
  `label_source` text NOT NULL CHECK (`label_source` IN ('OWNER','INDEPENDENT_REVIEW','CONTROLLED_INJECTION')),
  `polarity` text NOT NULL CHECK (`polarity` IN ('PRESENT','ABSENT')),
  `confidence` real NOT NULL CHECK (`confidence` >= 0 AND `confidence` <= 1),
  `evidence_hash` text NOT NULL,
  `actor` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`candidate_id`) REFERENCES `v7_evaluation_candidates`(`id`),
  FOREIGN KEY (`defect_id`) REFERENCES `v7_evaluation_defect_taxonomy`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_defect_label_uq` ON `v7_evaluation_defect_labels` (`candidate_id`,`defect_id`,`label_source`,`evidence_hash`);
--> statement-breakpoint
CREATE TABLE `v7_evaluation_datasets` (
  `id` text PRIMARY KEY NOT NULL,
  `dataset_key` text NOT NULL,
  `dataset_version` integer NOT NULL CHECK (`dataset_version` > 0),
  `dataset_type` text NOT NULL CHECK (`dataset_type` IN ('CALIBRATION','QUALIFICATION','REGRESSION')),
  `candidate_kind` text NOT NULL CHECK (`candidate_kind` IN ('MIXED','CLIP','SHOT','AUDIO','MASTER','PACKAGING')),
  `lifecycle_state` text NOT NULL DEFAULT 'DRAFT' CHECK (`lifecycle_state` IN ('DRAFT','SEALED','SUPERSEDED')),
  `blinded` integer NOT NULL DEFAULT 1,
  `independence_policy_json` text NOT NULL,
  `manifest_hash` text,
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sealed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_dataset_key_version_uq` ON `v7_evaluation_datasets` (`dataset_key`,`dataset_version`);
--> statement-breakpoint
CREATE TABLE `v7_evaluation_dataset_items` (
  `id` text PRIMARY KEY NOT NULL,
  `dataset_id` text NOT NULL,
  `candidate_id` text NOT NULL,
  `split` text NOT NULL CHECK (`split` IN ('CALIBRATION','QUALIFICATION','REGRESSION')),
  `role` text NOT NULL CHECK (`role` IN ('POSITIVE','NEGATIVE','CONTROL')),
  `correlation_group` text NOT NULL,
  `item_hash` text NOT NULL,
  `count_eligible` integer NOT NULL DEFAULT 0 CHECK (`count_eligible` IN (0,1)),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`dataset_id`) REFERENCES `v7_evaluation_datasets`(`id`),
  FOREIGN KEY (`candidate_id`) REFERENCES `v7_evaluation_candidates`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_dataset_item_uq` ON `v7_evaluation_dataset_items` (`dataset_id`,`candidate_id`);
--> statement-breakpoint
CREATE INDEX `v7_evaluation_dataset_correlation_idx` ON `v7_evaluation_dataset_items` (`dataset_id`,`correlation_group`,`count_eligible`);
--> statement-breakpoint
CREATE TABLE `v7_assurance_qualification_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `capability_id` text NOT NULL,
  `capability_version` text NOT NULL,
  `settings_hash` text NOT NULL,
  `dataset_id` text NOT NULL,
  `lifecycle_state` text NOT NULL DEFAULT 'PLANNED' CHECK (`lifecycle_state` IN ('PLANNED','RUNNING','COMPLETED','FAILED','QUALIFIED','BLOCKED')),
  `blinded` integer NOT NULL DEFAULT 1,
  `repeat_count` integer NOT NULL DEFAULT 3 CHECK (`repeat_count` >= 1),
  `sampling_policy_json` text NOT NULL,
  `maximum_provider_requests` integer NOT NULL DEFAULT 0,
  `maximum_spend_usd` real NOT NULL DEFAULT 0,
  `actual_provider_requests` integer NOT NULL DEFAULT 0,
  `actual_spend_usd` real NOT NULL DEFAULT 0,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` text,
  FOREIGN KEY (`dataset_id`) REFERENCES `v7_evaluation_datasets`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_assurance_qualification_run_uq` ON `v7_assurance_qualification_runs` (`capability_id`,`capability_version`,`settings_hash`,`dataset_id`);
--> statement-breakpoint
CREATE TABLE `v7_assurance_qualification_results` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL,
  `defect_id` text NOT NULL,
  `sample_size` integer NOT NULL CHECK (`sample_size` >= 0),
  `precision` real,
  `recall` real,
  `repeatability` real,
  `p0_escape_count` integer NOT NULL DEFAULT 0 CHECK (`p0_escape_count` >= 0),
  `cost_per_evaluated_item_usd` real,
  `lifecycle_state` text NOT NULL DEFAULT 'NOT_EVALUATED',
  `evidence_hash` text,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`run_id`) REFERENCES `v7_assurance_qualification_runs`(`id`),
  FOREIGN KEY (`defect_id`) REFERENCES `v7_evaluation_defect_taxonomy`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_assurance_qualification_result_uq` ON `v7_assurance_qualification_results` (`run_id`,`defect_id`);
--> statement-breakpoint
CREATE TABLE `v7_evaluation_inventory_snapshots` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `foundation_version` text NOT NULL,
  `candidate_artifacts` integer NOT NULL,
  `rejected_packages` integer NOT NULL,
  `verified_fixtures` integer NOT NULL DEFAULT 0,
  `gold_eligible` integer NOT NULL DEFAULT 0,
  `duplicate_hash_groups` integer NOT NULL DEFAULT 0,
  `provider_requests` integer NOT NULL DEFAULT 0 CHECK (`provider_requests` = 0),
  `spend_usd` real NOT NULL DEFAULT 0 CHECK (`spend_usd` = 0),
  `evidence_json` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_evaluation_inventory_channel_version_uq` ON `v7_evaluation_inventory_snapshots` (`channel_id`,`foundation_version`);
--> statement-breakpoint
INSERT INTO `v7_evaluation_foundation_registry` (`id`,`component_key`,`foundation_version`,`purpose`,`exit_evidence_json`) VALUES
  ('EVF-CORPUS','CORPUS_INVENTORY','EVALUATION_FOUNDATION_V1','Inventory historical evidence without promoting it to ground truth','["source identity","candidate count","zero release eligibility"]'),
  ('EVF-VERIFICATION','FIXTURE_VERIFICATION','EVALUATION_FOUNDATION_V1','Verify bytes, checksum, provenance, owner decision, rights and labels','["R2 read-back","checksum receipt","owner-confirmed label"]'),
  ('EVF-DEDUP','CORRELATION_CONTROL','EVALUATION_FOUNDATION_V1','Exclude duplicate and correlated revisions from evaluation counts','["dedup hash","correlation group","independent count"]'),
  ('EVF-DATASET','BLINDED_DATASETS','EVALUATION_FOUNDATION_V1','Seal calibration, qualification and regression datasets','["manifest hash","blinded input","split lineage"]'),
  ('EVF-INJECTION','CONTROLLED_DEFECTS','EVALUATION_FOUNDATION_V1','Create controlled defect-positive and clean negative fixtures','["injection manifest","expected defect","clean parent hash"]'),
  ('EVF-QUALIFICATION','ASSURANCE_QUALIFICATION','EVALUATION_FOUNDATION_V1','Measure precision, recall, repeatability and cost before assurance use','["approved P0 recall floors","zero P0 escapes","repeatability","cost"]');
--> statement-breakpoint
INSERT INTO `v7_evaluation_corpus_sources` (`id`,`source_family`,`source_table`,`candidate_kind`,`inclusion_rule_json`,`verification_requirements_json`) VALUES
  ('EVS-PRODUCTION-V2-ARTIFACTS','PRODUCTION_V2_REJECTED','production_v2_artifacts','MIXED','{"packageState":"REJECTED_QUALITY","releaseEligible":false}','["bytes read-back","sha256 recompute","provenance verification","owner defect label","rights verification","dedup and correlation"]'),
  ('EVS-PRODUCTION-V2-PACKAGES','PRODUCTION_V2_REJECTED','production_v2_packages','MASTER','{"lifecycleState":"REJECTED_QUALITY","packageEvidenceOnly":true}','["actual master artifact binding","owner decision receipt","defect labels"]'),
  ('EVS-GOLDEN-SEQUENCES','GOLDEN_REJECTED','v7_golden_sequences','MIXED','{"rejectedRevisionsOnly":true,"releaseEligible":false}','["asset bytes","master binding","audit lineage","owner decision","defect labels"]');
--> statement-breakpoint
INSERT INTO `v7_evaluation_defect_taxonomy` (`id`,`defect_key`,`label`,`severity`,`modality`,`owning_stage`,`deterministic_detectable`,`description`) VALUES
  ('EVD-SAFETY','SAFETY_SCOPE_ESCAPE','Financial safety-scope escape','P0','CONTENT','03/06',0,'Unsafe, personalized or unsupported financial guidance escapes the owning-stage safety gate.'),
  ('EVD-RIGHTS','RIGHTS_LINEAGE_MISSING','Missing or invalid rights lineage','P0','RIGHTS','07A/07B/09/10/15',1,'Audience asset lacks verified commercial rights, territory, term or provenance.'),
  ('EVD-SEMANTIC','SEMANTIC_VISUAL_CONTRADICTION','Narration and visual contradiction','P0','AUDIO_VISUAL','08/09/14',0,'A visual communicates a materially different claim, actor or direction from narration.'),
  ('EVD-MASTER','MASTER_LINEAGE_INVALID','Invalid audience-master lineage','P0','MASTER','13/14',1,'Playback, checksum, stream or archival-to-distribution lineage is incomplete or invalid.'),
  ('EVD-SYNC','AUDIO_VIDEO_SYNC','Audience-visible audio/video sync defect','P0','AUDIO_VISUAL','11/12/14',1,'Audio and the relevant visible event exceed the calibrated archetype-specific tolerance.'),
  ('EVD-RESIDUE','PRODUCTION_RESIDUE','Audience-visible production residue','P1','VISUAL','09/12',1,'Prompt, debug, URL, filename, QA label or other production residue is visible.'),
  ('EVD-STATIC','NEAR_STATIC_MOTION','Near-static visual passage','P1','VISUAL','09/12',1,'A passage relies on camera-only or negligible semantic motion beyond its calibrated duration.'),
  ('EVD-SEAM','AUDIO_SEAM','Audible mix or narration seam','P1','AUDIO','10/11/12',1,'A splice, abrupt bed transition, broken pause or static-like boundary is audible.'),
  ('EVD-MOBILE','MOBILE_LEGIBILITY','Mobile legibility failure','P1','VISUAL','07B/09/14',1,'Meaningful text, hierarchy or diagram detail is unreadable at the mobile evaluation size.'),
  ('EVD-STATE','TRANSACTION_STATE_CONFLATION','Transaction-state conflation','P1','CONTENT_VISUAL','03/06/08/14',0,'Authorization, clearing, settlement or responsibility boundaries are materially conflated.'),
  ('EVD-PACKAGING','PACKAGING_PROMISE_MISMATCH','Packaging promise/content mismatch','P1','PACKAGING','04/06/14',0,'Title or thumbnail promise is not delivered by the content or overstates the supported claim.');
--> statement-breakpoint
INSERT INTO `v7_evaluation_candidates`
  (`id`,`channel_id`,`source_family`,`source_table`,`source_id`,`source_parent_id`,`candidate_kind`,`artifact_type`,`storage_key`,`mime_type`,`byte_size`,`content_hash`,`owner_decision_state`,`rights_declared_state`,`correlation_group`,`dedup_hash`)
SELECT
  'evaluation-candidate:' || a.id,
  p.channel_id,
  'PRODUCTION_V2_REJECTED',
  'production_v2_artifacts',
  a.id,
  a.package_id,
  CASE
    WHEN lower(a.artifact_type) LIKE '%audio%' OR lower(a.mime_type) LIKE 'audio/%' THEN 'AUDIO'
    WHEN lower(a.artifact_type) LIKE '%master%' THEN 'MASTER'
    WHEN lower(a.artifact_type) LIKE '%thumbnail%' OR lower(a.artifact_type) LIKE '%packag%' THEN 'PACKAGING'
    WHEN a.shot_contract_id IS NOT NULL THEN 'SHOT'
    ELSE 'CLIP'
  END,
  a.artifact_type,
  a.storage_key,
  a.mime_type,
  a.byte_size,
  a.sha256,
  'INHERITED_PACKAGE_REJECTION',
  a.rights_state,
  a.package_id,
  a.sha256
FROM `production_v2_artifacts` a
JOIN `production_v2_packages` p ON p.id=a.package_id
WHERE p.lifecycle_state='REJECTED_QUALITY';
--> statement-breakpoint
INSERT INTO `v7_evaluation_inventory_snapshots`
  (`id`,`channel_id`,`foundation_version`,`candidate_artifacts`,`rejected_packages`,`verified_fixtures`,`gold_eligible`,`duplicate_hash_groups`,`evidence_json`)
SELECT
  'evaluation-inventory:' || p.channel_id || ':v1',
  p.channel_id,
  'EVALUATION_FOUNDATION_V1',
  (SELECT COUNT(*) FROM v7_evaluation_candidates c WHERE c.channel_id=p.channel_id),
  COUNT(*),
  0,
  0,
  (SELECT COUNT(*) FROM (SELECT dedup_hash FROM v7_evaluation_candidates c WHERE c.channel_id=p.channel_id AND dedup_hash IS NOT NULL GROUP BY dedup_hash HAVING COUNT(*) > 1)),
  '{"authority":"CANDIDATE_EVIDENCE_ONLY","bytesVerified":0,"ownerLabelsVerified":0,"releaseEligible":0}'
FROM `production_v2_packages` p
WHERE p.lifecycle_state='REJECTED_QUALITY'
GROUP BY p.channel_id;
