CREATE TABLE IF NOT EXISTS `v7_golden_master_jobs` (
  `id` text PRIMARY KEY NOT NULL,
  `golden_sequence_id` text NOT NULL,
  `revision` integer NOT NULL,
  `lifecycle_state` text NOT NULL,
  `render_spec_json` text NOT NULL,
  `master_asset_id` text,
  `probe_json` text,
  `scan_json` text,
  `playback_json` text,
  `error_code` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `v7_golden_master_job_sequence_uq` ON `v7_golden_master_jobs` (`golden_sequence_id`,`revision`);
CREATE INDEX IF NOT EXISTS `v7_golden_master_job_state_idx` ON `v7_golden_master_jobs` (`lifecycle_state`,`updated_at`);

UPDATE `v7_video_quality_standards`
SET `metric`='one encoded audience master, decoded full-frame scan, semantic audit and observed end-to-end playback',
    `threshold_or_range`='1920x1080; 30 fps; 48 kHz stereo; A/V within 1 frame; overall >=92; P0/P1=0; human playback PASS',
    `evidence_required_json`='["MASTER","MOTION","MIX"]',
    `owning_stage`='09/10/11/13/14'
WHERE `standard_version`='VIDEO_PRODUCTION_QUALITY_STANDARD_V2' AND `id`='VQ-M1-GOLDEN-PLAYBACK';

INSERT INTO `v7_video_quality_evidence`
(`id`,`program_id`,`queue_id`,`standard_version`,`standard_id`,`evaluation_number`,`lifecycle_state`,`evidence_kind`,`measured_value_json`,`findings_json`,`evaluated_by`)
SELECT 'seq-quality-master-truth-' || lower(hex(randomblob(12))),g.`program_id`,g.`queue_id`,g.`standard_version`,'VQ-M1-GOLDEN-PLAYBACK',
  COALESCE((SELECT MAX(e.`evaluation_number`) FROM `v7_video_quality_evidence` e WHERE e.`queue_id`=g.`queue_id` AND e.`standard_version`=g.`standard_version` AND e.`standard_id`='VQ-M1-GOLDEN-PLAYBACK'),0)+1,
  'BLOCKED','MASTER','{"reason":"COMPONENT_EVIDENCE_IS_NOT_A_MASTER_VIDEO","required":"ENCODED_MASTER_AND_FULL_PLAYBACK"}',
  '["The prior PASS used PNG samples and a separate audio mix; no audience master video existed."]','SYSTEM_MIGRATION_0046'
FROM `v7_golden_sequences` g
WHERE g.`standard_version`='VIDEO_PRODUCTION_QUALITY_STANDARD_V2' AND g.`lifecycle_state`='PASS';

UPDATE `v7_golden_sequences`
SET `lifecycle_state`='MASTER_REQUIRED',`updated_at`=CURRENT_TIMESTAMP
WHERE `standard_version`='VIDEO_PRODUCTION_QUALITY_STANDARD_V2' AND `lifecycle_state`='PASS';
