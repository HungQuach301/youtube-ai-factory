CREATE TABLE `factory_evidence_bundles` (
  `id` text PRIMARY KEY NOT NULL,
  `bundle_key` text NOT NULL,
  `video_id` text NOT NULL,
  `artifact_version_id` text NOT NULL,
  `canonical_timebase_id` text NOT NULL,
  `exact_artifact_hash` text NOT NULL CHECK (length(`exact_artifact_hash`) = 64),
  `source_commit` text NOT NULL CHECK (length(`source_commit`) = 40),
  `deployment_version` text NOT NULL,
  `runtime_version` text NOT NULL,
  `manifest_json` text NOT NULL CHECK (json_valid(`manifest_json`)),
  `manifest_hash` text NOT NULL CHECK (length(`manifest_hash`) = 64),
  `coverage_state` text NOT NULL CHECK (`coverage_state` IN ('COMPLETE','PARTIAL')),
  `lineage_state` text NOT NULL CHECK (`lineage_state` = 'CURRENT'),
  `r22_authority` integer NOT NULL CHECK (`r22_authority` = 0),
  `master_authority` integer NOT NULL CHECK (`master_authority` = 0),
  `release_authority` integer NOT NULL CHECK (`release_authority` = 0),
  `publication_authority` integer NOT NULL CHECK (`publication_authority` = 0),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`artifact_version_id`) REFERENCES `factory_artifact_versions`(`id`),
  FOREIGN KEY (`canonical_timebase_id`) REFERENCES `factory_canonical_timebases`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_evidence_bundle_key_uq` ON `factory_evidence_bundles` (`bundle_key`);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_evidence_bundle_exact_manifest_uq` ON `factory_evidence_bundles` (`artifact_version_id`,`exact_artifact_hash`,`manifest_hash`);
--> statement-breakpoint
CREATE TABLE `factory_evidence_items` (
  `id` text PRIMARY KEY NOT NULL,
  `bundle_id` text NOT NULL,
  `evidence_key` text NOT NULL,
  `evidence_type` text NOT NULL CHECK (`evidence_type` IN ('SOURCE','ASSET','TRANSFORM','FRAME','AUDIO','BROWSER','RIGHTS','COST','LOG')),
  `assurance_layer` text NOT NULL CHECK (`assurance_layer` IN ('L0','L1','L2','L3','L4','L5','L6','L7')),
  `content_hash` text NOT NULL CHECK (length(`content_hash`) = 64),
  `storage_key` text,
  `start_frame` integer CHECK (`start_frame` IS NULL OR `start_frame` >= 0),
  `end_frame_exclusive` integer CHECK (`end_frame_exclusive` IS NULL OR `end_frame_exclusive` > `start_frame`),
  `start_audio_sample` integer CHECK (`start_audio_sample` IS NULL OR `start_audio_sample` >= 0),
  `end_audio_sample_exclusive` integer CHECK (`end_audio_sample_exclusive` IS NULL OR `end_audio_sample_exclusive` > `start_audio_sample`),
  `observation_state` text NOT NULL CHECK (`observation_state` IN ('OBSERVED','UNOBSERVED')),
  `provenance_json` text NOT NULL CHECK (json_valid(`provenance_json`)),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`bundle_id`) REFERENCES `factory_evidence_bundles`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_evidence_item_key_uq` ON `factory_evidence_items` (`bundle_id`,`evidence_key`);
--> statement-breakpoint
CREATE INDEX `factory_evidence_item_layer_time_idx` ON `factory_evidence_items` (`bundle_id`,`assurance_layer`,`start_frame`,`start_audio_sample`);
--> statement-breakpoint
CREATE TABLE `factory_assurance_judge_qualifications` (
  `id` text PRIMARY KEY NOT NULL,
  `qualification_key` text NOT NULL,
  `assurance_layer` text NOT NULL CHECK (`assurance_layer` IN ('L0','L1','L2','L3','L4','L5','L6','L7')),
  `channel_id` text NOT NULL,
  `format_key` text NOT NULL,
  `decision_role` text NOT NULL CHECK (`decision_role` IN ('DETERMINISTIC_CHECKER','AI_JUDGE','BROWSER_AGENT','INDEPENDENT_ADJUDICATOR')),
  `provider_binding_id` text,
  `provider_qualification_id` text,
  `judge_version` text NOT NULL,
  `model_version` text NOT NULL,
  `prompt_hash` text NOT NULL CHECK (length(`prompt_hash`) = 64),
  `rubric_hash` text NOT NULL CHECK (length(`rubric_hash`) = 64),
  `schema_hash` text NOT NULL CHECK (length(`schema_hash`) = 64),
  `sampler_hash` text NOT NULL CHECK (length(`sampler_hash`) = 64),
  `sample_size` integer NOT NULL CHECK (`sample_size` > 0),
  `p0_recall` real NOT NULL CHECK (`p0_recall` BETWEEN 0 AND 1),
  `p1_recall` real NOT NULL CHECK (`p1_recall` BETWEEN 0 AND 1),
  `clean_precision` real NOT NULL CHECK (`clean_precision` BETWEEN 0 AND 1),
  `critical_false_clean_count` integer NOT NULL CHECK (`critical_false_clean_count` >= 0),
  `exact_byte_repeatability` real NOT NULL CHECK (`exact_byte_repeatability` BETWEEN 0 AND 1),
  `p0_p1_decision_flip_count` integer NOT NULL CHECK (`p0_p1_decision_flip_count` >= 0),
  `evidence_timecode_validity` real NOT NULL CHECK (`evidence_timecode_validity` BETWEEN 0 AND 1),
  `structured_output_validity` real NOT NULL CHECK (`structured_output_validity` BETWEEN 0 AND 1),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('QUALIFIED','ADVISORY')),
  `pass_authority` integer NOT NULL CHECK (`pass_authority` = 0),
  `qualification_hash` text NOT NULL CHECK (length(`qualification_hash`) = 64),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `qualified_at` text NOT NULL,
  `expires_at` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`provider_binding_id`) REFERENCES `factory_provider_bindings`(`id`),
  FOREIGN KEY (`provider_qualification_id`) REFERENCES `factory_capability_qualifications`(`id`),
  CHECK ((`provider_binding_id` IS NULL AND `provider_qualification_id` IS NULL) OR (`provider_binding_id` IS NOT NULL AND `provider_qualification_id` IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_judge_qualification_key_uq` ON `factory_assurance_judge_qualifications` (`qualification_key`);
--> statement-breakpoint
CREATE INDEX `factory_assurance_judge_qualification_scope_idx` ON `factory_assurance_judge_qualifications` (`channel_id`,`format_key`,`assurance_layer`,`lifecycle_state`,`qualified_at`);
--> statement-breakpoint
CREATE TABLE `factory_assurance_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `run_key` text NOT NULL,
  `video_id` text NOT NULL,
  `channel_id` text NOT NULL,
  `format_key` text NOT NULL,
  `evidence_bundle_id` text NOT NULL,
  `exact_artifact_hash` text NOT NULL CHECK (length(`exact_artifact_hash`) = 64),
  `policy_version` text NOT NULL,
  `standard_version` text NOT NULL,
  `automation_mode` text NOT NULL CHECK (`automation_mode` = 'AI_SHADOW'),
  `required_layers_json` text NOT NULL CHECK (json_valid(`required_layers_json`)),
  `producer_id` text NOT NULL,
  `rights_state` text NOT NULL CHECK (`rights_state` IN ('PASS','FAIL','UNKNOWN')),
  `cost_reconciliation_state` text NOT NULL CHECK (`cost_reconciliation_state` IN ('RECONCILED','UNRECONCILED','UNKNOWN_SPEND_RESERVED')),
  `active_provider_requests` integer NOT NULL CHECK (`active_provider_requests` >= 0),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` = 'STARTED'),
  `acceptance_authority` integer NOT NULL CHECK (`acceptance_authority` = 0),
  `r22_authority` integer NOT NULL CHECK (`r22_authority` = 0),
  `master_authority` integer NOT NULL CHECK (`master_authority` = 0),
  `release_authority` integer NOT NULL CHECK (`release_authority` = 0),
  `publication_authority` integer NOT NULL CHECK (`publication_authority` = 0),
  `intent_hash` text NOT NULL CHECK (length(`intent_hash`) = 64),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`evidence_bundle_id`) REFERENCES `factory_evidence_bundles`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_run_key_uq` ON `factory_assurance_runs` (`run_key`);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_run_exact_policy_uq` ON `factory_assurance_runs` (`evidence_bundle_id`,`exact_artifact_hash`,`policy_version`,`standard_version`);
--> statement-breakpoint
CREATE TABLE `factory_assurance_layer_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL,
  `assurance_layer` text NOT NULL CHECK (`assurance_layer` IN ('L0','L1','L2','L3','L4','L5','L6','L7')),
  `qualification_id` text NOT NULL,
  `observer_id` text NOT NULL,
  `exact_artifact_hash` text NOT NULL CHECK (length(`exact_artifact_hash`) = 64),
  `outcome` text NOT NULL CHECK (`outcome` IN ('PASS','FAIL','INCOMPLETE','ADVISORY')),
  `score` real CHECK (`score` IS NULL OR `score` BETWEEN 0 AND 100),
  `p0_count` integer NOT NULL CHECK (`p0_count` >= 0),
  `p1_count` integer NOT NULL CHECK (`p1_count` >= 0),
  `p2_count` integer NOT NULL CHECK (`p2_count` >= 0),
  `p3_count` integer NOT NULL CHECK (`p3_count` >= 0),
  `confidence` real CHECK (`confidence` IS NULL OR `confidence` BETWEEN 0 AND 1),
  `findings_json` text NOT NULL CHECK (json_valid(`findings_json`)),
  `evidence_refs_json` text NOT NULL CHECK (json_valid(`evidence_refs_json`)),
  `unobserved_dimensions_json` text NOT NULL CHECK (json_valid(`unobserved_dimensions_json`)),
  `provider_response_id` text,
  `raw_response_hash` text CHECK (`raw_response_hash` IS NULL OR length(`raw_response_hash`) = 64),
  `usage_json` text NOT NULL CHECK (json_valid(`usage_json`)),
  `actual_spend_micros` integer NOT NULL CHECK (`actual_spend_micros` >= 0),
  `pass_authority` integer NOT NULL CHECK (`pass_authority` = 0),
  `receipt_hash` text NOT NULL CHECK (length(`receipt_hash`) = 64),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`run_id`) REFERENCES `factory_assurance_runs`(`id`),
  FOREIGN KEY (`qualification_id`) REFERENCES `factory_assurance_judge_qualifications`(`id`),
  CHECK (`outcome` <> 'PASS' OR (`p0_count` = 0 AND `p1_count` = 0 AND `score` IS NOT NULL AND `confidence` IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_layer_receipt_uq` ON `factory_assurance_layer_receipts` (`run_id`,`assurance_layer`);
--> statement-breakpoint
CREATE TABLE `factory_assurance_decision_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL,
  `decision_key` text NOT NULL,
  `exact_artifact_hash` text NOT NULL CHECK (length(`exact_artifact_hash`) = 64),
  `candidate_outcome` text NOT NULL CHECK (`candidate_outcome` IN ('AI_ACCEPTED','CONTENT_REJECTED','HUMAN_ESCALATION_REQUIRED','ASSURANCE_INCOMPLETE')),
  `outcome` text NOT NULL CHECK (`outcome` IN ('CONTENT_REJECTED','HUMAN_ESCALATION_REQUIRED','ASSURANCE_INCOMPLETE')),
  `overall_score` real CHECK (`overall_score` IS NULL OR `overall_score` BETWEEN 0 AND 100),
  `adjudicator_confidence` real CHECK (`adjudicator_confidence` IS NULL OR `adjudicator_confidence` BETWEEN 0 AND 1),
  `critical_dimension_scores_json` text NOT NULL CHECK (json_valid(`critical_dimension_scores_json`)),
  `missing_layers_json` text NOT NULL CHECK (json_valid(`missing_layers_json`)),
  `disagreement_json` text NOT NULL CHECK (json_valid(`disagreement_json`)),
  `reasons_json` text NOT NULL CHECK (json_valid(`reasons_json`)),
  `root_owner` text NOT NULL,
  `maximum_root_revisions` integer NOT NULL CHECK (`maximum_root_revisions` = 1),
  `acceptance_authority` text NOT NULL CHECK (`acceptance_authority` = 'ADVISORY_ONLY'),
  `release_ready_authority` integer NOT NULL CHECK (`release_ready_authority` = 0),
  `publication_authority` integer NOT NULL CHECK (`publication_authority` = 0),
  `decision_hash` text NOT NULL CHECK (length(`decision_hash`) = 64),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`run_id`) REFERENCES `factory_assurance_runs`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_decision_run_uq` ON `factory_assurance_decision_receipts` (`run_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_decision_key_uq` ON `factory_assurance_decision_receipts` (`decision_key`);
--> statement-breakpoint
CREATE TABLE `factory_assurance_drift_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `qualification_id` text NOT NULL,
  `observation_key` text NOT NULL,
  `baseline_json` text NOT NULL CHECK (json_valid(`baseline_json`)),
  `observed_json` text NOT NULL CHECK (json_valid(`observed_json`)),
  `drift_dimensions_json` text NOT NULL CHECK (json_valid(`drift_dimensions_json`)),
  `drift_state` text NOT NULL CHECK (`drift_state` IN ('CURRENT','STALE')),
  `invalidates_qualification` integer NOT NULL CHECK (`invalidates_qualification` IN (0,1)),
  `pass_authority` integer NOT NULL CHECK (`pass_authority` = 0),
  `observation_hash` text NOT NULL CHECK (length(`observation_hash`) = 64),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `observed_at` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`qualification_id`) REFERENCES `factory_assurance_judge_qualifications`(`id`),
  CHECK ((`drift_state` = 'CURRENT' AND `invalidates_qualification` = 0) OR (`drift_state` = 'STALE' AND `invalidates_qualification` = 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_assurance_drift_observation_key_uq` ON `factory_assurance_drift_receipts` (`observation_key`);
--> statement-breakpoint
CREATE INDEX `factory_assurance_drift_qualification_latest_idx` ON `factory_assurance_drift_receipts` (`qualification_id`,`observed_at`,`created_at`);
--> statement-breakpoint
CREATE TRIGGER `factory_evidence_bundles_no_update` BEFORE UPDATE ON `factory_evidence_bundles` BEGIN SELECT RAISE(ABORT,'FACTORY_EVIDENCE_BUNDLES_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_evidence_bundles_no_delete` BEFORE DELETE ON `factory_evidence_bundles` BEGIN SELECT RAISE(ABORT,'FACTORY_EVIDENCE_BUNDLES_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_evidence_items_no_update` BEFORE UPDATE ON `factory_evidence_items` BEGIN SELECT RAISE(ABORT,'FACTORY_EVIDENCE_ITEMS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_evidence_items_no_delete` BEFORE DELETE ON `factory_evidence_items` BEGIN SELECT RAISE(ABORT,'FACTORY_EVIDENCE_ITEMS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_judge_qualifications_no_update` BEFORE UPDATE ON `factory_assurance_judge_qualifications` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_JUDGE_QUALIFICATIONS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_judge_qualifications_no_delete` BEFORE DELETE ON `factory_assurance_judge_qualifications` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_JUDGE_QUALIFICATIONS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_runs_no_update` BEFORE UPDATE ON `factory_assurance_runs` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_RUNS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_runs_no_delete` BEFORE DELETE ON `factory_assurance_runs` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_RUNS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_layer_receipts_no_update` BEFORE UPDATE ON `factory_assurance_layer_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_LAYER_RECEIPTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_layer_receipts_no_delete` BEFORE DELETE ON `factory_assurance_layer_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_LAYER_RECEIPTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_decision_receipts_no_update` BEFORE UPDATE ON `factory_assurance_decision_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_DECISION_RECEIPTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_decision_receipts_no_delete` BEFORE DELETE ON `factory_assurance_decision_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_DECISION_RECEIPTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_drift_receipts_no_update` BEFORE UPDATE ON `factory_assurance_drift_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_DRIFT_RECEIPTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_assurance_drift_receipts_no_delete` BEFORE DELETE ON `factory_assurance_drift_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSURANCE_DRIFT_RECEIPTS_APPEND_ONLY'); END;
