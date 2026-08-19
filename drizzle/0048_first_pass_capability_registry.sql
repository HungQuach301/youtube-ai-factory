CREATE TABLE `v7_first_pass_capabilities` (
  `id` text PRIMARY KEY NOT NULL,
  `capability_key` text NOT NULL,
  `capability_version` text NOT NULL,
  `plane` text NOT NULL,
  `label` text NOT NULL,
  `provider` text NOT NULL,
  `tool_or_model` text NOT NULL,
  `stage_keys_json` text NOT NULL,
  `configuration_json` text NOT NULL,
  `rights_policy` text NOT NULL,
  `cost_policy` text NOT NULL,
  `failure_mode` text NOT NULL,
  `lifecycle_state` text NOT NULL DEFAULT 'QUALIFICATION_REQUIRED',
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_first_pass_capability_key_version_uq` ON `v7_first_pass_capabilities` (`capability_key`,`capability_version`);
--> statement-breakpoint
CREATE INDEX `v7_first_pass_capability_plane_state_idx` ON `v7_first_pass_capabilities` (`plane`,`lifecycle_state`);
--> statement-breakpoint
CREATE TABLE `v7_first_pass_archetypes` (
  `id` text PRIMARY KEY NOT NULL,
  `archetype_key` text NOT NULL,
  `plane` text NOT NULL,
  `label` text NOT NULL,
  `risk_tier` text NOT NULL,
  `definition` text NOT NULL,
  `required_evidence_json` text NOT NULL,
  `minimum_first_pass_yield` real NOT NULL,
  `active` integer DEFAULT 1 NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_first_pass_archetype_key_uq` ON `v7_first_pass_archetypes` (`archetype_key`);
--> statement-breakpoint
CREATE INDEX `v7_first_pass_archetype_plane_idx` ON `v7_first_pass_archetypes` (`plane`,`active`);
--> statement-breakpoint
CREATE TABLE `v7_first_pass_fixtures` (
  `id` text PRIMARY KEY NOT NULL,
  `archetype_id` text NOT NULL,
  `fixture_version` text NOT NULL,
  `label` text NOT NULL,
  `hardest_fixture` integer DEFAULT 1 NOT NULL,
  `input_contract_json` text NOT NULL,
  `expected_evidence_json` text NOT NULL,
  `input_hash` text,
  `lifecycle_state` text NOT NULL DEFAULT 'DESIGNED',
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_first_pass_fixture_archetype_version_uq` ON `v7_first_pass_fixtures` (`archetype_id`,`fixture_version`);
--> statement-breakpoint
CREATE TABLE `v7_first_pass_qualifications` (
  `id` text PRIMARY KEY NOT NULL,
  `capability_id` text NOT NULL,
  `capability_version` text NOT NULL,
  `archetype_id` text NOT NULL,
  `qualification_version` integer NOT NULL,
  `standard_version` text NOT NULL,
  `fixture_ids_json` text NOT NULL,
  `settings_hash` text,
  `sample_size` integer DEFAULT 0 NOT NULL,
  `first_pass_yield` real DEFAULT 0 NOT NULL,
  `p0_escape_count` integer DEFAULT 0 NOT NULL,
  `evidence_hashes_json` text NOT NULL DEFAULT '[]',
  `lifecycle_state` text NOT NULL DEFAULT 'QUALIFICATION_REQUIRED',
  `blocker` text,
  `qualified_at` text,
  `revoked_at` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_first_pass_qualification_version_uq` ON `v7_first_pass_qualifications` (`capability_id`,`archetype_id`,`qualification_version`);
--> statement-breakpoint
CREATE INDEX `v7_first_pass_qualification_lookup_idx` ON `v7_first_pass_qualifications` (`capability_id`,`archetype_id`,`lifecycle_state`,`qualification_version`);
--> statement-breakpoint
CREATE TABLE `v7_first_pass_operation_requirements` (
  `id` text PRIMARY KEY NOT NULL,
  `operation` text NOT NULL,
  `stage_key` text NOT NULL,
  `capability_id` text NOT NULL,
  `archetype_id` text NOT NULL,
  `minimum_sample_size` integer DEFAULT 1 NOT NULL,
  `minimum_first_pass_yield` real NOT NULL,
  `required_standard_version` text NOT NULL,
  `active` integer DEFAULT 1 NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_first_pass_requirement_uq` ON `v7_first_pass_operation_requirements` (`operation`,`stage_key`,`capability_id`,`archetype_id`);
--> statement-breakpoint
CREATE INDEX `v7_first_pass_requirement_operation_idx` ON `v7_first_pass_operation_requirements` (`operation`,`stage_key`,`active`);
--> statement-breakpoint
CREATE TABLE `v7_first_pass_artifact_envelopes` (
  `id` text PRIMARY KEY NOT NULL,
  `program_id` text NOT NULL,
  `queue_id` text NOT NULL,
  `stage_key` text NOT NULL,
  `artifact_id` text,
  `artifact_type` text NOT NULL,
  `revision` integer NOT NULL,
  `lifecycle_state` text NOT NULL,
  `standard_version` text NOT NULL,
  `capability_qualification_ids_json` text NOT NULL,
  `parent_hashes_json` text NOT NULL,
  `artifact_hash` text,
  `rights_state` text NOT NULL,
  `cost_state` text NOT NULL,
  `preflight_state` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `sealed_at` text,
  `superseded_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_first_pass_envelope_revision_uq` ON `v7_first_pass_artifact_envelopes` (`queue_id`,`stage_key`,`artifact_type`,`revision`);
--> statement-breakpoint
CREATE INDEX `v7_first_pass_envelope_state_idx` ON `v7_first_pass_artifact_envelopes` (`queue_id`,`lifecycle_state`,`stage_key`);
--> statement-breakpoint
CREATE TABLE `v7_first_pass_dispatch_audits` (
  `id` text PRIMARY KEY NOT NULL,
  `program_id` text,
  `queue_id` text,
  `operation` text NOT NULL,
  `stage_key` text NOT NULL,
  `decision` text NOT NULL,
  `standard_version` text NOT NULL,
  `requirement_count` integer NOT NULL,
  `eligible_count` integer NOT NULL,
  `gap_json` text NOT NULL,
  `provider_requests` integer DEFAULT 0 NOT NULL,
  `spend_usd` real DEFAULT 0 NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `v7_first_pass_dispatch_operation_idx` ON `v7_first_pass_dispatch_audits` (`operation`,`stage_key`,`created_at`);
--> statement-breakpoint
INSERT INTO `v7_first_pass_capabilities` (`id`,`capability_key`,`capability_version`,`plane`,`label`,`provider`,`tool_or_model`,`stage_keys_json`,`configuration_json`,`rights_policy`,`cost_policy`,`failure_mode`) VALUES
('FPC-CONTROL-COMPILER','CONTROL_ARTIFACT_COMPILER','1.0.0','CONTROL','Control artifact compiler','OPENAI','gpt-5.6','["01","02","03","04","05","06","07A","07B"]','{"structuredOutput":true,"background":true,"legacySources":0}','CURRENT_SOURCES_OR_CHANNEL_ORIGINAL','APPROVED_PLAN_ONLY','FAIL_CLOSED_NO_ARTIFACT'),
('FPC-SHOT-CUE-COMPILER','SHOT_CUE_COMPILER','1.0.0','CONTROL','Executable ShotCueProgram compiler','OPENAI','gpt-5.6','["08"]','{"typedBindings":true,"exactTimeline":true,"fallback":false}','CURRENT_FROZEN_PARENT_ONLY','APPROVED_PLAN_ONLY','FAIL_CLOSED_NO_CONTRACT'),
('FPC-SOURCE-ACQUISITION','SOURCE_VIDEO_ACQUISITION','1.0.0','VISUAL','Rights-safe source video acquisition','PEXELS_PIXABAY_SHUTTERSTOCK','video search and byte acquisition','["09"]','{"videoFirst":true,"decodedWindows":true,"fallback":false}','COMMERCIAL_LICENSE_AND_LINEAGE_REQUIRED','APPROVED_PLAN_ONLY','FAIL_CLOSED_NO_SOURCE'),
('FPC-LAYERED-COMPOSITOR','LAYERED_SCENE_COMPOSITOR','1.0.0','VISUAL','Mixed-treatment layered compositor','INTERNAL','Sharp + FFmpeg','["07B","09","11"]','{"layeredMotion":true,"minimumTreatments":3,"cameraOnlyCeiling":0.35}','CHANNEL_OWNED_OR_VERIFIED_SOURCE','ZERO_OR_APPROVED_PLAN','FAIL_CLOSED_NO_FLAT_FRAME_FALLBACK'),
('FPC-NARRATION','LONG_FORM_NARRATION','1.0.0','AUDIO','Long-form narration engine','ELEVENLABS','eleven_multilingual_v2','["07A","10"]','{"oneVoice":true,"sectionTakes":true,"seamPreflight":true}','NON_FREE_COMMERCIAL_TIER_REQUIRED','APPROVED_PLAN_ONLY','FAIL_CLOSED_NO_SYNTHESIS'),
('FPC-SOUNDSCAPE','PRODUCTION_SOUNDSCAPE','1.0.0','AUDIO','Production music, ambience and SFX engine','TBD_PRODUCTION_AUDIO','licensed source + FFmpeg mix','["07A","10","11"]','{"proceduralPlaceholderEligible":false,"causalCues":true,"fullMix":true}','COMMERCIAL_LICENSE_AND_LINEAGE_REQUIRED','APPROVED_PLAN_ONLY','FAIL_CLOSED_NO_PROCEDURAL_RELEASE_AUDIO'),
('FPC-MASTER-RENDER','IMMUTABLE_MASTER_RENDER','1.0.0','MASTER','Immutable audience-master renderer','INTERNAL','FFmpeg VP9 + Opus','["12","13"]','{"width":1920,"height":1080,"fps":30,"fullDecode":true}','CURRENT_REVISION_BYTES_ONLY','ZERO_SPEND','FAIL_CLOSED_NO_MASTER'),
('FPC-VISUAL-ASSURANCE','INDEPENDENT_VISUAL_ASSURANCE','1.0.0','ASSURANCE','Independent full-master visual assurance','OPENAI','gpt-5.6','["14"]','{"fullMasterChecksum":true,"threeSamplesPerShot":true}','CHANNEL_OWNED_AUDIT_INPUT','APPROVED_PLAN_ONLY','FAIL_CLOSED_NO_VERDICT'),
('FPC-AUDIO-ASSURANCE','INDEPENDENT_AUDIO_ASSURANCE','1.0.0','ASSURANCE','Independent exact-mix audio assurance','OPENAI','gpt-audio-1.5','["14"]','{"exactMixChecksum":true,"oneConfirmation":true}','CHANNEL_OWNED_AUDIT_INPUT','APPROVED_PLAN_ONLY','FAIL_CLOSED_NO_VERDICT');
--> statement-breakpoint
INSERT INTO `v7_first_pass_archetypes` (`id`,`archetype_key`,`plane`,`label`,`risk_tier`,`definition`,`required_evidence_json`,`minimum_first_pass_yield`) VALUES
('FPA-CONTROL','CONTROL_STAGE_ARTIFACT','CONTROL','Control-stage production artifact','HIGH','A versioned evidence-bound control artifact that can be executed without guessing.','["schema lint","source lineage","acceptance tests","P0/P1 preflight"]',0.95),
('FPA-SHOT-CUE','EXECUTABLE_SHOT_CUE_CONTRACT','CONTROL','Executable shot and cue contract','CRITICAL','A complete exact-duration program binding narration, claims, visuals, audio cues and observable tests.','["exact timeline","typed bindings","entry midpoint exit","zero fallback"]',1.0),
('FPA-V01','TRANSACTION_STATE_PROOF','VISUAL','Transaction state proof','CRITICAL','Shows money, message and responsibility state changes without implying a false universal flow.','["decoded temporal pixels","claim binding","direction proof"]',0.95),
('FPA-V02','PROCESS_ROUTE','VISUAL','Process route','CRITICAL','Separates authorization, clearing and settlement with observable transitions.','["stage separation","route transitions","mobile labels"]',0.95),
('FPA-V03','DATA_VISUALIZATION','VISUAL','Data visualization','HIGH','Communicates quantitative evidence with legible scale, units and uncertainty.','["data lineage","axis and unit lint","mobile legibility"]',0.95),
('FPA-V04','DOCUMENTARY_LIVE_ACTION','VISUAL','Documentary live action','HIGH','Uses semantically relevant real-world source video rather than generic financial stock.','["source bytes","decoded source windows","rights lineage"]',0.95),
('FPA-V05','SOURCE_AUTHORED_HYBRID','VISUAL','Source-authored hybrid','CRITICAL','Integrates rights-safe footage with authored explanatory layers and meaningful motion.','["source windows","layer provenance","semantic motion"]',0.95),
('FPA-V06','ABSTRACT_AUTHORED','VISUAL','Abstract authored explanation','HIGH','Uses purposeful authored abstraction with multiple treatments, not decorative particles or flat cards.','["scene graph","meaningful events","treatment diversity"]',0.95),
('FPA-V07','RIGHTS_SENSITIVE','VISUAL','Rights-sensitive visual','CRITICAL','Preserves license, source, transformation and use eligibility at byte level.','["license URL","checksum","provenance manifest"]',1.0),
('FPA-V08','MOBILE_TEXT_INTENSIVE','VISUAL','Mobile text-intensive visual','HIGH','Remains readable on a small viewport while preserving hierarchy and pacing.','["mobile render","font floors","occlusion scan"]',0.95),
('FPA-A01','HIGH_ENERGY_HOOK','AUDIO','High-energy hook','HIGH','Natural opening performance with urgency but no synthetic or clipped delivery.','["take tournament","pitch range","pause timing"]',0.97),
('FPA-A02','NUMBER_HEAVY_NARRATION','AUDIO','Number-heavy narration','CRITICAL','Reads amounts, rates and symbols accurately and naturally.','["verbatim transcript","pronunciation ledger","number audit"]',0.97),
('FPA-A03','DENSE_MECHANISM_PASSAGE','AUDIO','Dense mechanism passage','CRITICAL','Maintains comprehension and prosody through technical institutional content.','["section take","word alignment","prosody metrics"]',0.97),
('FPA-A04','AUTH_CLEAR_SETTLE_PASSAGE','AUDIO','Authorization, clearing and settlement passage','CRITICAL','Differentiates institutional stages with precise terminology and audible phrasing.','["terminology audit","transcript match","listener comprehension"]',0.97),
('FPA-A05','LONG_SECTION_CONTINUITY','AUDIO','Long-section continuity','CRITICAL','Sustains one narrator identity and seamless pacing across long sections.','["voice identity","seam scan","long playback"]',0.97),
('FPA-A06','MUSIC_TRANSITION_EVOLUTION','AUDIO','Music transition and evolution','HIGH','Uses evolving licensed production music with intentional transitions and ducking.','["music provenance","arrangement map","mix automation"]',0.97),
('FPA-A07','CAUSAL_SFX_AMBIENCE','AUDIO','Causal SFX and ambience','HIGH','Places purposeful cues and ambience that support the causal narrative.','["cue bindings","tail integrity","timing audit"]',0.97),
('FPA-A08','SILENCE_CONSEQUENCE_PAYOFF','AUDIO','Silence, consequence and payoff','HIGH','Uses silence and payoff dynamics intentionally without broken pauses.','["pause intent","silence classification","playback evidence"]',0.97),
('FPA-QV','FULL_MASTER_VISUAL_ASSURANCE','ASSURANCE','Full-master visual assurance','CRITICAL','Independently confirms the exact sealed visual master once.','["master checksum","full playback","three samples per shot"]',1.0),
('FPA-QA','FULL_MASTER_AUDIO_ASSURANCE','ASSURANCE','Full-master audio assurance','CRITICAL','Independently confirms the exact sealed audience mix once.','["mix checksum","full playback","perceptual verdict"]',1.0);
--> statement-breakpoint
INSERT INTO `v7_first_pass_fixtures` (`id`,`archetype_id`,`fixture_version`,`label`,`input_contract_json`,`expected_evidence_json`) SELECT 'FPF-' || `archetype_key`,`id`,'1.0.0','Hardest fixture · ' || `label`,'{"source":"FIRST_PASS_QUALITY_V1","scope":"HARDEST_FIRST","providerDispatch":false}','{"required":"all archetype evidence","p0EscapeCount":0,"firstPass":true}' FROM `v7_first_pass_archetypes`;
--> statement-breakpoint
INSERT INTO `v7_first_pass_operation_requirements` (`id`,`operation`,`stage_key`,`capability_id`,`archetype_id`,`minimum_sample_size`,`minimum_first_pass_yield`,`required_standard_version`) VALUES
('FPR-C01','COMPILE_STAGE_BUNDLE','01','FPC-CONTROL-COMPILER','FPA-CONTROL',1,0.95,'FIRST_PASS_QUALITY_V1'),('FPR-C02','COMPILE_STAGE_BUNDLE','02','FPC-CONTROL-COMPILER','FPA-CONTROL',1,0.95,'FIRST_PASS_QUALITY_V1'),('FPR-C03','COMPILE_STAGE_BUNDLE','03','FPC-CONTROL-COMPILER','FPA-CONTROL',1,0.95,'FIRST_PASS_QUALITY_V1'),('FPR-C04','COMPILE_STAGE_BUNDLE','04','FPC-CONTROL-COMPILER','FPA-CONTROL',1,0.95,'FIRST_PASS_QUALITY_V1'),('FPR-C05','COMPILE_STAGE_BUNDLE','05','FPC-CONTROL-COMPILER','FPA-CONTROL',1,0.95,'FIRST_PASS_QUALITY_V1'),('FPR-C06','COMPILE_STAGE_BUNDLE','06','FPC-CONTROL-COMPILER','FPA-CONTROL',1,0.95,'FIRST_PASS_QUALITY_V1'),('FPR-C07A','COMPILE_STAGE_BUNDLE','07A','FPC-CONTROL-COMPILER','FPA-CONTROL',1,0.95,'FIRST_PASS_QUALITY_V1'),('FPR-C07B','COMPILE_STAGE_BUNDLE','07B','FPC-CONTROL-COMPILER','FPA-CONTROL',1,0.95,'FIRST_PASS_QUALITY_V1'),('FPR-C08','COMPILE_STAGE_BUNDLE','08','FPC-SHOT-CUE-COMPILER','FPA-SHOT-CUE',1,1.0,'FIRST_PASS_QUALITY_V1'),
('FPR-V09-1','RUN_STAGE_09_BATCH','09','FPC-LAYERED-COMPOSITOR','FPA-V01',1,0.95,'FIRST_PASS_QUALITY_V1'),('FPR-V09-2','RUN_STAGE_09_BATCH','09','FPC-LAYERED-COMPOSITOR','FPA-V02',1,0.95,'FIRST_PASS_QUALITY_V1'),('FPR-V09-3','RUN_STAGE_09_BATCH','09','FPC-LAYERED-COMPOSITOR','FPA-V03',1,0.95,'FIRST_PASS_QUALITY_V1'),('FPR-V09-4','RUN_STAGE_09_BATCH','09','FPC-SOURCE-ACQUISITION','FPA-V04',1,0.95,'FIRST_PASS_QUALITY_V1'),('FPR-V09-5','RUN_STAGE_09_BATCH','09','FPC-SOURCE-ACQUISITION','FPA-V05',1,0.95,'FIRST_PASS_QUALITY_V1'),('FPR-V09-6','RUN_STAGE_09_BATCH','09','FPC-LAYERED-COMPOSITOR','FPA-V06',1,0.95,'FIRST_PASS_QUALITY_V1'),('FPR-V09-7','RUN_STAGE_09_BATCH','09','FPC-SOURCE-ACQUISITION','FPA-V07',1,1.0,'FIRST_PASS_QUALITY_V1'),('FPR-V09-8','RUN_STAGE_09_BATCH','09','FPC-LAYERED-COMPOSITOR','FPA-V08',1,0.95,'FIRST_PASS_QUALITY_V1'),
('FPR-A10-1','PRODUCE_GOLDEN_AUDIO','10','FPC-NARRATION','FPA-A01',1,0.97,'FIRST_PASS_QUALITY_V1'),('FPR-A10-2','PRODUCE_GOLDEN_AUDIO','10','FPC-NARRATION','FPA-A02',1,0.97,'FIRST_PASS_QUALITY_V1'),('FPR-A10-3','PRODUCE_GOLDEN_AUDIO','10','FPC-NARRATION','FPA-A03',1,0.97,'FIRST_PASS_QUALITY_V1'),('FPR-A10-4','PRODUCE_GOLDEN_AUDIO','10','FPC-NARRATION','FPA-A04',1,0.97,'FIRST_PASS_QUALITY_V1'),('FPR-A10-5','PRODUCE_GOLDEN_AUDIO','10','FPC-NARRATION','FPA-A05',1,0.97,'FIRST_PASS_QUALITY_V1'),('FPR-A10-6','PRODUCE_GOLDEN_AUDIO','10','FPC-SOUNDSCAPE','FPA-A06',1,0.97,'FIRST_PASS_QUALITY_V1'),('FPR-A10-7','PRODUCE_GOLDEN_AUDIO','10','FPC-SOUNDSCAPE','FPA-A07',1,0.97,'FIRST_PASS_QUALITY_V1'),('FPR-A10-8','PRODUCE_GOLDEN_AUDIO','10','FPC-SOUNDSCAPE','FPA-A08',1,0.97,'FIRST_PASS_QUALITY_V1'),
('FPR-M13V','REQUEST_GOLDEN_MASTER_RENDER','13','FPC-MASTER-RENDER','FPA-V05',1,1.0,'FIRST_PASS_QUALITY_V1'),('FPR-M13A','REQUEST_GOLDEN_MASTER_RENDER','13','FPC-MASTER-RENDER','FPA-A05',1,1.0,'FIRST_PASS_QUALITY_V1'),
('FPR-Q14V','GOLDEN_MASTER_INDEPENDENT_AUDIT','14','FPC-VISUAL-ASSURANCE','FPA-QV',1,1.0,'FIRST_PASS_QUALITY_V1'),('FPR-Q14A','GOLDEN_AUDIO_PERCEPTUAL_AUDIT','14','FPC-AUDIO-ASSURANCE','FPA-QA',1,1.0,'FIRST_PASS_QUALITY_V1');
--> statement-breakpoint
INSERT INTO `v7_first_pass_qualifications` (`id`,`capability_id`,`capability_version`,`archetype_id`,`qualification_version`,`standard_version`,`fixture_ids_json`,`sample_size`,`first_pass_yield`,`p0_escape_count`,`evidence_hashes_json`,`lifecycle_state`,`blocker`)
SELECT 'FPQ-' || r.`capability_id` || '-' || r.`archetype_id`,r.`capability_id`,c.`capability_version`,r.`archetype_id`,1,'FIRST_PASS_QUALITY_V1','["FPF-' || a.`archetype_key` || '"]',0,0,0,'[]','QUALIFICATION_REQUIRED','Hardest fixture has not been executed; provider dispatch remains closed'
FROM (SELECT DISTINCT `capability_id`,`archetype_id` FROM `v7_first_pass_operation_requirements`) r JOIN `v7_first_pass_capabilities` c ON c.`id`=r.`capability_id` JOIN `v7_first_pass_archetypes` a ON a.`id`=r.`archetype_id`;
