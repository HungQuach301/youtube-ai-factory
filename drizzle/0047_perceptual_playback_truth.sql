UPDATE `v7_video_quality_standards`
SET `metric`='encoded master plus motion provenance, full decoded scan, audio perception, independent semantic audit and observed end-to-end playback',
    `threshold_or_range`='camera-only <=35%; semantic motion >=45%; source video >=20%; >=3 visual treatments; audio perceptual PASS; human playback PASS'
WHERE `standard_version`='VIDEO_PRODUCTION_QUALITY_STANDARD_V2' AND `id`='VQ-M1-GOLDEN-PLAYBACK';

INSERT INTO `v7_video_quality_evidence`
(`id`,`program_id`,`queue_id`,`standard_version`,`standard_id`,`evaluation_number`,`lifecycle_state`,`evidence_kind`,`measured_value_json`,`findings_json`,`evaluated_by`)
SELECT 'seq-quality-perceptual-truth-' || lower(hex(randomblob(12))),g.`program_id`,g.`queue_id`,g.`standard_version`,'VQ-M1-GOLDEN-PLAYBACK',
  COALESCE((SELECT MAX(e.`evaluation_number`) FROM `v7_video_quality_evidence` e WHERE e.`queue_id`=g.`queue_id` AND e.`standard_version`=g.`standard_version` AND e.`standard_id`='VQ-M1-GOLDEN-PLAYBACK'),0)+1,
  'FAIL','MOTION','{"reason":"CAMERA_ONLY_SLIDESHOW","rendererMode":"FLAT_FRAME_CAMERA_MOTION","cameraOnlyCoverage":1,"semanticMotionCoverage":0,"sourceVideoCoverage":0,"visualTreatmentCount":1}',
  '["The master loops flattened PNGs with crop/pan. Camera movement is not semantic motion, B-roll, or meaningful animation."]','SYSTEM_MIGRATION_0047'
FROM `v7_golden_sequences` g
WHERE g.`standard_version`='VIDEO_PRODUCTION_QUALITY_STANDARD_V2' AND g.`lifecycle_state`='AUDIT_PASS_PLAYBACK_REQUIRED';

UPDATE `v7_golden_sequences`
SET `lifecycle_state`='REPAIR_REQUIRED',`updated_at`=CURRENT_TIMESTAMP
WHERE `standard_version`='VIDEO_PRODUCTION_QUALITY_STANDARD_V2' AND `lifecycle_state`='AUDIT_PASS_PLAYBACK_REQUIRED';
