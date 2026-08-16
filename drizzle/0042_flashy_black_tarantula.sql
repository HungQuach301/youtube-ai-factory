CREATE TABLE `v7_sequential_events` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`queue_id` text,
	`event_type` text NOT NULL,
	`actor_type` text NOT NULL,
	`detail_json` text NOT NULL,
	`evidence_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `v7_sequential_events_program_idx` ON `v7_sequential_events` (`program_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `v7_sequential_programs` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`contract_version` text DEFAULT 'V7_V23_4_V281' NOT NULL,
	`lifecycle_state` text DEFAULT 'ACTIVE' NOT NULL,
	`execution_mode` text DEFAULT 'ONE_VIDEO_AT_A_TIME' NOT NULL,
	`target_videos` integer DEFAULT 15 NOT NULL,
	`current_sequence` integer DEFAULT 1 NOT NULL,
	`overall_floor` integer DEFAULT 92 NOT NULL,
	`critical_floor` integer DEFAULT 90 NOT NULL,
	`dimension_floor` integer DEFAULT 86 NOT NULL,
	`p0_tolerance` integer DEFAULT 0 NOT NULL,
	`p1_tolerance` integer DEFAULT 0 NOT NULL,
	`maximum_repair_loops` integer DEFAULT 2 NOT NULL,
	`owner_gate` text DEFAULT 'OWNER_READY_REQUIRED' NOT NULL,
	`historical_master_policy` text DEFAULT 'REJECTED_HISTORICAL_EVIDENCE' NOT NULL,
	`auto_dispatch` integer DEFAULT true NOT NULL,
	`auto_publish` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_sequential_program_channel_uq` ON `v7_sequential_programs` (`channel_id`);--> statement-breakpoint
CREATE TABLE `v7_sequential_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`package_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`title` text NOT NULL,
	`lifecycle_state` text NOT NULL,
	`active` integer DEFAULT false NOT NULL,
	`source_brief_hash` text NOT NULL,
	`prior_master_state` text DEFAULT 'REJECTED_QUALITY' NOT NULL,
	`release_assessment_id` text,
	`owner_ready_at` text,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_sequential_queue_program_sequence_uq` ON `v7_sequential_queue` (`program_id`,`sequence`);--> statement-breakpoint
CREATE UNIQUE INDEX `v7_sequential_queue_package_uq` ON `v7_sequential_queue` (`package_id`);--> statement-breakpoint
CREATE INDEX `v7_sequential_queue_state_idx` ON `v7_sequential_queue` (`program_id`,`lifecycle_state`);--> statement-breakpoint
CREATE TABLE `v7_sequential_release_assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`queue_id` text NOT NULL,
	`master_artifact_id` text NOT NULL,
	`evaluation_number` integer NOT NULL,
	`lifecycle_state` text NOT NULL,
	`overall_score` integer NOT NULL,
	`critical_floor` integer NOT NULL,
	`dimension_floor` integer NOT NULL,
	`p0_count` integer DEFAULT 0 NOT NULL,
	`p1_count` integer DEFAULT 0 NOT NULL,
	`critic_results_json` text NOT NULL,
	`findings_json` text DEFAULT '[]' NOT NULL,
	`evidence_hash` text NOT NULL,
	`independent_actor` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_sequential_release_master_eval_uq` ON `v7_sequential_release_assessments` (`master_artifact_id`,`evaluation_number`);--> statement-breakpoint
CREATE INDEX `v7_sequential_release_queue_idx` ON `v7_sequential_release_assessments` (`queue_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `v7_sequential_stage_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`queue_id` text NOT NULL,
	`stage_key` text NOT NULL,
	`sequence` integer NOT NULL,
	`stage_name` text NOT NULL,
	`owner_plane` text NOT NULL,
	`lifecycle_state` text DEFAULT 'BLOCKED_UPSTREAM' NOT NULL,
	`gate_version` text NOT NULL,
	`required_artifacts_json` text DEFAULT '[]' NOT NULL,
	`evidence_summary` text DEFAULT 'No verified artifact' NOT NULL,
	`attempt` integer DEFAULT 0 NOT NULL,
	`blocker` text,
	`frozen_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_sequential_stage_queue_key_uq` ON `v7_sequential_stage_runs` (`queue_id`,`stage_key`);--> statement-breakpoint
CREATE INDEX `v7_sequential_stage_state_idx` ON `v7_sequential_stage_runs` (`queue_id`,`lifecycle_state`);--> statement-breakpoint
INSERT INTO `v7_sequential_programs` (`id`,`channel_id`,`contract_version`,`lifecycle_state`,`execution_mode`,`target_videos`,`current_sequence`,`overall_floor`,`critical_floor`,`dimension_floor`,`p0_tolerance`,`p1_tolerance`,`maximum_repair_loops`,`owner_gate`,`historical_master_policy`,`auto_dispatch`,`auto_publish`)
VALUES ('YTAF-V7-SEQUENTIAL','channel-hidden-systems','V7_V23_4_V281','ACTIVE','ONE_VIDEO_AT_A_TIME',15,1,92,90,86,0,0,2,'OWNER_READY_REQUIRED','REJECTED_HISTORICAL_EVIDENCE',1,0);--> statement-breakpoint
INSERT INTO `v7_sequential_queue` (`id`,`program_id`,`package_id`,`sequence`,`title`,`lifecycle_state`,`active`,`source_brief_hash`,`prior_master_state`)
SELECT 'V7SEQ-' || p.id,'YTAF-V7-SEQUENTIAL',p.id,c.sequence,p.title,
  CASE WHEN c.sequence=1 THEN 'DESIGN_REQUIRED' ELSE 'BLOCKED_PREVIOUS_VIDEO' END,
  CASE WHEN c.sequence=1 THEN 1 ELSE 0 END,p.content_hash,'REJECTED_QUALITY'
FROM `production_v2_packages` p
JOIN `content_episode_concepts_v2` c ON c.id=p.episode_concept_id
WHERE p.channel_id='channel-hidden-systems'
ORDER BY c.sequence;--> statement-breakpoint
UPDATE `production_v2_packages`
SET lifecycle_state='REJECTED_QUALITY'
WHERE channel_id='channel-hidden-systems' AND lifecycle_state='READY_FOR_PUBLISHING';--> statement-breakpoint
WITH stage_contracts(stage_key,sequence,stage_name,owner_plane,gate_version,required_artifacts) AS (VALUES
  ('00',0,'Production authorization & lineage','CONTROL_PLANE','V7','["production policy","canonical brief hash","exclusive lease"]'),
  ('01',1,'Market, audience & episode intelligence','INTELLIGENCE','V7','["episode intelligence dossier","audience job","competitive bar"]'),
  ('02',2,'Reference intelligence','INTELLIGENCE','V7','["reference set","parity matrix","anti-copy constraints"]'),
  ('03',3,'Research & claim graph','INTELLIGENCE','V7','["primary sources","claim-source graph","contradiction ledger"]'),
  ('04',4,'Creative contract tournament','SEMANTIC_DESIGN','V7','["four creative routes","seven-critic decision","frozen champion"]'),
  ('05',5,'Story architecture','SEMANTIC_DESIGN','V7','["story clock","retention spine","claim-beat map"]'),
  ('06',6,'Script development','SEMANTIC_DESIGN','V7','["locked narration","terminology ledger","script critic evidence"]'),
  ('07A',7,'Voice & sound production design','PRODUCTION_DESIGN','V7','["one narrator identity","take tournaments","soundscape contract"]'),
  ('07B',8,'Visual language & source routing','PRODUCTION_DESIGN','V7','["visual grammar","SOURCE MAKE HYBRID routing","provider tournament"]'),
  ('08',9,'Semantic shot orchestration','SEMANTIC_COMPILER','V23.4','["shot contracts","typed scene programs","ENTRY MIDPOINT EXIT"]'),
  ('09',10,'Actual-pixel material production','MEDIA_EXECUTION','V23.4','["stored source bytes","rights lineage","three-frame motion proof"]'),
  ('10',11,'Narration, music, ambience & SFX','MEDIA_EXECUTION','V7','["audio stems","waveform evidence","measured mix"]'),
  ('11',12,'Clean edit & composition','MEDIA_EXECUTION','V23.4','["picture lock","duplicate scan","clean audience render"]'),
  ('12',13,'Pre-master sequence QA','INDEPENDENT_QA','V281','["full timeline scan","mobile legibility","AV sync"]'),
  ('13',14,'Immutable master render','MEDIA_EXECUTION','V23.4','["master bytes","checksum","technical probe"]'),
  ('14',15,'Eight-critic full-master assurance','INDEPENDENT_QA','V281','["full playback","three samples per shot","eight critic consensus"]'),
  ('15',16,'Owner-ready release gate','OWNER_GATE','V281','["score >=92","critical >=90","dimension >=86","P0=0 P1=0"]'),
  ('16',17,'Learning handoff after publish','LEARNING','V7','["publication authority","performance baseline","learning contract"]')
)
INSERT INTO `v7_sequential_stage_runs` (`id`,`queue_id`,`stage_key`,`sequence`,`stage_name`,`owner_plane`,`lifecycle_state`,`gate_version`,`required_artifacts_json`,`evidence_summary`,`blocker`)
SELECT q.id || '-STAGE-' || s.stage_key,q.id,s.stage_key,s.sequence,s.stage_name,s.owner_plane,
  CASE WHEN s.stage_key='00' THEN 'READY' ELSE 'BLOCKED_UPSTREAM' END,
  s.gate_version,s.required_artifacts,
  CASE WHEN s.stage_key='00' THEN 'Sequential production authority is active; compile the video-specific evidence contract.' ELSE 'No verified artifact' END,
  CASE WHEN s.stage_key='00' THEN NULL ELSE 'The preceding stage must freeze with immutable evidence.' END
FROM `v7_sequential_queue` q CROSS JOIN stage_contracts s
WHERE q.program_id='YTAF-V7-SEQUENTIAL' AND q.sequence=1;--> statement-breakpoint
INSERT INTO `v7_sequential_events` (`id`,`program_id`,`queue_id`,`event_type`,`actor_type`,`detail_json`,`evidence_hash`)
SELECT 'YTAF-V7-SEQUENTIAL-ACTIVATED','YTAF-V7-SEQUENTIAL',id,'SEQUENTIAL_REBUILD_ACTIVATED','OWNER_AUTHORIZED_SYSTEM',
  '{"reason":"Owner rejected the 15 Production V2 masters for poor perceived quality","engineLineage":["V7","V23.4","V281"],"executionMode":"ONE_VIDEO_AT_A_TIME","historicalMasters":"REJECTED_HISTORICAL_EVIDENCE","nextVideoBlockedUntilOwnerReady":true}',
  lower(hex(randomblob(32)))
FROM `v7_sequential_queue` WHERE program_id='YTAF-V7-SEQUENTIAL' AND sequence=1;
