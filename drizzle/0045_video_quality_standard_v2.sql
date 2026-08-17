CREATE TABLE IF NOT EXISTS `v7_video_quality_standards` (
  `id` text PRIMARY KEY NOT NULL,
  `standard_version` text NOT NULL,
  `scope` text NOT NULL,
  `scope_key` text NOT NULL,
  `enforcement_level` text NOT NULL,
  `trigger` text NOT NULL,
  `metric` text NOT NULL,
  `threshold_or_range` text NOT NULL,
  `evidence_required_json` text NOT NULL,
  `owning_stage` text NOT NULL,
  `failure_action` text NOT NULL,
  `waiver_policy` text NOT NULL,
  `active` integer DEFAULT 1 NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `v7_video_quality_standard_version_id_uq` ON `v7_video_quality_standards` (`standard_version`,`id`);
CREATE INDEX IF NOT EXISTS `v7_video_quality_standard_scope_idx` ON `v7_video_quality_standards` (`standard_version`,`scope`,`scope_key`,`active`);

CREATE TABLE IF NOT EXISTS `v7_video_quality_evidence` (
  `id` text PRIMARY KEY NOT NULL,
  `program_id` text NOT NULL,
  `queue_id` text NOT NULL,
  `standard_version` text NOT NULL,
  `standard_id` text NOT NULL,
  `evaluation_number` integer NOT NULL,
  `lifecycle_state` text NOT NULL,
  `evidence_kind` text NOT NULL,
  `artifact_id` text,
  `storage_key` text,
  `evidence_hash` text,
  `measured_value_json` text NOT NULL,
  `findings_json` text NOT NULL DEFAULT '[]',
  `evaluated_by` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `v7_video_quality_evidence_eval_uq` ON `v7_video_quality_evidence` (`queue_id`,`standard_version`,`standard_id`,`evaluation_number`);
CREATE INDEX IF NOT EXISTS `v7_video_quality_evidence_latest_idx` ON `v7_video_quality_evidence` (`queue_id`,`standard_id`,`created_at`);

CREATE TABLE IF NOT EXISTS `v7_golden_sequences` (
  `id` text PRIMARY KEY NOT NULL,
  `program_id` text NOT NULL,
  `queue_id` text NOT NULL,
  `standard_version` text NOT NULL,
  `revision` integer NOT NULL,
  `lifecycle_state` text NOT NULL,
  `start_seconds` real NOT NULL,
  `end_seconds` real NOT NULL,
  `duration_seconds` real NOT NULL,
  `narration_text` text NOT NULL,
  `manifest_json` text NOT NULL,
  `quality_json` text NOT NULL DEFAULT '{}',
  `evidence_hash` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `v7_golden_sequence_queue_revision_uq` ON `v7_golden_sequences` (`queue_id`,`revision`);

CREATE TABLE IF NOT EXISTS `v7_golden_sequence_assets` (
  `id` text PRIMARY KEY NOT NULL,
  `golden_sequence_id` text NOT NULL,
  `role` text NOT NULL,
  `shot_id` text,
  `temporal_state` text,
  `storage_key` text NOT NULL,
  `mime_type` text NOT NULL,
  `byte_size` integer NOT NULL,
  `sha256` text NOT NULL,
  `rights_state` text NOT NULL,
  `metadata_json` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `v7_golden_sequence_asset_role_uq` ON `v7_golden_sequence_assets` (`golden_sequence_id`,`role`,`shot_id`,`temporal_state`);

INSERT OR IGNORE INTO `v7_video_quality_standards`
(`id`,`standard_version`,`scope`,`scope_key`,`enforcement_level`,`trigger`,`metric`,`threshold_or_range`,`evidence_required_json`,`owning_stage`,`failure_action`,`waiver_policy`) VALUES
('VQ-M0-FACTUAL-TRACEABILITY','VIDEO_PRODUCTION_QUALITY_STANDARD_V2','CHANNEL','channel-hidden-systems','M0','ALWAYS','claim-to-source-to-pixel traceability','100% consequential claims','["SOURCE","PIXELS"]','03/08/09','STOP','NONE'),
('VQ-M0-SAFETY-SCOPE','VIDEO_PRODUCTION_QUALITY_STANDARD_V2','CHANNEL','channel-hidden-systems','M0','ALWAYS','unsupported or personalized advice','0 unsupported claims; no personal advice','["SOURCE"]','03/06','STOP','NONE'),
('VQ-M1-NARRATION-VOICE','VIDEO_PRODUCTION_QUALITY_STANDARD_V2','CHANNEL','channel-hidden-systems','M1','ALWAYS','voice identity, pronunciation, alignment, pitch, pause, seams and corruption','one voice; mismatch <1%; P0/P1=0','["AUDIO","TRANSCRIPT","WAVEFORM"]','07A/10','REOPEN','NONE'),
('VQ-M1-TTS-SEGMENTATION','VIDEO_PRODUCTION_QUALITY_STANDARD_V2','CHANNEL','channel-hidden-systems','M1','ALWAYS','semantic TTS segmentation and seam integrity','300-800 preferred characters; no sentence/entity split','["AUDIO","TRANSCRIPT"]','10','REPAIR','NONE'),
('VQ-M1-AUDIO-MIX','VIDEO_PRODUCTION_QUALITY_STANDARD_V2','CHANNEL','channel-hidden-systems','M1','ALWAYS','full audience mix loudness, peak and masking','-14 +/-1 LUFS-I; <=-1 dBTP; narration lead >=10 LU','["MIX","WAVEFORM"]','10/11','REOPEN','NONE'),
('VQ-M1-MUSIC-SFX','VIDEO_PRODUCTION_QUALITY_STANDARD_V2','CHANNEL','channel-hidden-systems','M1','ALWAYS','production music/SFX rights, cue function and masking','no placeholder; full cue sheet; no masking','["AUDIO","MIX"]','07A/10','REPAIR','NONE'),
('VQ-M1-TEMPORAL-PIXELS','VIDEO_PRODUCTION_QUALITY_STANDARD_V2','CHANNEL','channel-hidden-systems','M1','ALWAYS','decoded ENTRY/MIDPOINT/EXIT pixels and temporal delta','3 real frames; distinct hashes; semantic change','["PIXELS","MOTION"]','09','REOPEN','NONE'),
('VQ-M1-SEMANTIC-ALIGNMENT','VIDEO_PRODUCTION_QUALITY_STANDARD_V2','CHANNEL','channel-hidden-systems','M1','ALWAYS','narration-to-visual semantic alignment','score >=94; P0/P1=0','["PIXELS","MOTION"]','08/09','REPAIR','NONE'),
('VQ-M1-MOBILE-LEGIBILITY','VIDEO_PRODUCTION_QUALITY_STANDARD_V2','CHANNEL','channel-hidden-systems','M1','ALWAYS','real render mobile legibility','score >=90; no cropped/unreadable essential text','["PIXELS"]','09/11','REPAIR','NONE'),
('VQ-M1-CANONICAL-COVERAGE','VIDEO_PRODUCTION_QUALITY_STANDARD_V2','CHANNEL','channel-hidden-systems','M1','ALWAYS','narration timeline coverage','0 to canonical duration; gaps=0; overlaps=0','["MOTION"]','08','REOPEN','NONE'),
('VQ-M1-RIGHTS-LINEAGE','VIDEO_PRODUCTION_QUALITY_STANDARD_V2','CHANNEL','channel-hidden-systems','M1','ALWAYS','source, transform, rights, cost and checksum lineage','100% complete','["SOURCE","PIXELS","AUDIO"]','09/10','STOP','NONE'),
('VQ-M1-GOLDEN-PLAYBACK','VIDEO_PRODUCTION_QUALITY_STANDARD_V2','CHANNEL','channel-hidden-systems','M1','GOLDEN_SEQUENCE','60-90 second real audience playback','overall >=92; factual/semantic/voice >=94; all critical >=90','["MOTION","MIX"]','09/10/11','STOP','NONE'),
('VQ-M2-HOOK-PACING','VIDEO_PRODUCTION_QUALITY_STANDARD_V2','CHANNEL','channel-hidden-systems','M2','HOOK','hook shot and meaningful-event timing','shot 1.5-4s; event 1.5-3s; near-static <=3.5s','["MOTION"]','08/09','REPAIR','PRE_PRODUCTION_VERSION_ONLY'),
('VQ-M3-ADAPTIVE-PACING','VIDEO_PRODUCTION_QUALITY_STANDARD_V2','CHANNEL','channel-hidden-systems','M3','ALWAYS','route-aware shot/event/static duration','Document 34 adaptive pacing matrix','["MOTION"]','08/09','WARN','PRE_PRODUCTION_VERSION_ONLY'),
('VQ-M2-PILLAR-TRANSACTION-CHAIN','VIDEO_PRODUCTION_QUALITY_STANDARD_V2','PILLAR','everyday-transaction-tollbooths','M2','PILLAR_ACTIVE','institutional roles and phase separation','merchant/processor/acquirer/network/issuer; authorization != clearing != settlement','["SOURCE","PIXELS","MOTION"]','03/06/08/09','STOP','NONE'),
('VQ-M2-PILLAR-FLOW-LEGEND','VIDEO_PRODUCTION_QUALITY_STANDARD_V2','PILLAR','everyday-transaction-tollbooths','M2','PILLAR_ACTIVE','data, money, fee and liability flow distinction','persistent actors and legend','["PIXELS","MOTION"]','07B/08/09','REPAIR','NONE'),
('VQ-M2-PILLAR-EXCEPTION','VIDEO_PRODUCTION_QUALITY_STANDARD_V2','PILLAR','everyday-transaction-tollbooths','M2','PILLAR_ACTIVE','material exception/failure path','at least one qualified path','["SOURCE","MOTION"]','03/05/06/08','REPAIR','NONE'),
('VQ-M2-SERIES-FOLLOW-THE-FEE','VIDEO_PRODUCTION_QUALITY_STANDARD_V2','SERIES','follow-the-fee','M2','SERIES_ACTIVE','fee chain and actor net position','ranges/qualifiers and transaction reconciliation','["SOURCE","PIXELS","MOTION"]','03/06/08/09','STOP','NONE'),
('VQ-M2-EPISODE-100-CARD','VIDEO_PRODUCTION_QUALITY_STANDARD_V2','EPISODE','what-really-happens-to-a-100-card-purchase','M2','EPISODE_ACTIVE','$100 purchase invariant and timing','exact amount remains transaction anchor; no universal fee split','["SOURCE","PIXELS","MOTION"]','03/06/08/09','STOP','NONE');

UPDATE `v7_sequential_stage_runs`
SET `blocker`='VIDEO_PRODUCTION_QUALITY_STANDARD_V2: current Stage 08-10 lineage is quality-ineligible; run authorized repair and golden sequence before Stage 11',
    `evidence_summary`='Control state READY; quality eligibility BLOCKED_VIDEO_STANDARD_V2',
    `updated_at`=CURRENT_TIMESTAMP
WHERE `stage_key`='11' AND `lifecycle_state`='READY' AND `queue_id` IN (
  SELECT q.`id` FROM `v7_sequential_queue` q JOIN `v7_sequential_programs` p ON p.`id`=q.`program_id`
  WHERE p.`channel_id`='channel-hidden-systems' AND q.`sequence`=1
);
