CREATE TABLE `production_v2_artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`package_id` text NOT NULL,
	`shot_contract_id` text,
	`artifact_type` text NOT NULL,
	`lifecycle_state` text DEFAULT 'STORED' NOT NULL,
	`storage_key` text NOT NULL,
	`mime_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	`sha256` text NOT NULL,
	`rights_state` text NOT NULL,
	`provenance_json` text NOT NULL,
	`engine_version` text DEFAULT 'PRODUCTION_ENGINE_V2_GREENFIELD' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`frozen_at` text,
	FOREIGN KEY (`package_id`) REFERENCES `production_v2_packages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`shot_contract_id`) REFERENCES `production_v2_shot_contracts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `production_v2_artifact_storage_hash_uq` ON `production_v2_artifacts` (`storage_key`,`sha256`);--> statement-breakpoint
CREATE INDEX `production_v2_artifact_package_type_idx` ON `production_v2_artifacts` (`package_id`,`artifact_type`);--> statement-breakpoint
CREATE TABLE `production_v2_audits` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`event_type` text NOT NULL,
	`actor_type` text NOT NULL,
	`actor_email` text,
	`detail_json` text NOT NULL,
	`evidence_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `production_v2_audit_entity_event_uq` ON `production_v2_audits` (`entity_id`,`event_type`);--> statement-breakpoint
CREATE INDEX `production_v2_audit_channel_idx` ON `production_v2_audits` (`channel_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `production_v2_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`package_id` text NOT NULL,
	`shot_contract_id` text,
	`job_type` text NOT NULL,
	`lifecycle_state` text DEFAULT 'SPECIFIED' NOT NULL,
	`attempt` integer DEFAULT 0 NOT NULL,
	`max_attempts` integer DEFAULT 1 NOT NULL,
	`idempotency_key` text NOT NULL,
	`input_hash` text NOT NULL,
	`lease_owner` text,
	`lease_expires_at` text,
	`blocker` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`package_id`) REFERENCES `production_v2_packages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`shot_contract_id`) REFERENCES `production_v2_shot_contracts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `production_v2_job_idempotency_uq` ON `production_v2_jobs` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `production_v2_job_state_idx` ON `production_v2_jobs` (`lifecycle_state`,`created_at`);--> statement-breakpoint
CREATE TABLE `production_v2_packages` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`policy_id` text NOT NULL,
	`source_brief_id` text NOT NULL,
	`episode_concept_id` text NOT NULL,
	`package_version` integer DEFAULT 1 NOT NULL,
	`title` text NOT NULL,
	`lifecycle_state` text DEFAULT 'PRODUCTION_PACKAGE_COMPILED' NOT NULL,
	`target_duration_seconds` integer NOT NULL,
	`shot_count` integer NOT NULL,
	`traceability_complete` integer DEFAULT false NOT NULL,
	`legacy_source_count` integer DEFAULT 0 NOT NULL,
	`provider_requests` integer DEFAULT 0 NOT NULL,
	`spend_usd` real DEFAULT 0 NOT NULL,
	`engine_version` text DEFAULT 'PRODUCTION_ENGINE_V2_GREENFIELD' NOT NULL,
	`content_hash` text NOT NULL,
	`frozen_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`policy_id`) REFERENCES `production_v2_policies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_brief_id`) REFERENCES `production_briefs_v2`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`episode_concept_id`) REFERENCES `content_episode_concepts_v2`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `production_v2_package_brief_version_uq` ON `production_v2_packages` (`source_brief_id`,`package_version`);--> statement-breakpoint
CREATE INDEX `production_v2_package_channel_state_idx` ON `production_v2_packages` (`channel_id`,`lifecycle_state`,`created_at`);--> statement-breakpoint
CREATE TABLE `production_v2_policies` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`policy_version` integer NOT NULL,
	`lifecycle_state` text DEFAULT 'ACTIVE' NOT NULL,
	`mode` text DEFAULT 'FULL_AUTOPILOT' NOT NULL,
	`daily_budget_usd` real NOT NULL,
	`monthly_budget_usd` real NOT NULL,
	`per_video_budget_usd` real NOT NULL,
	`max_remote_requests` integer NOT NULL,
	`max_repair_attempts` integer DEFAULT 1 NOT NULL,
	`auto_dispatch` integer DEFAULT false NOT NULL,
	`auto_publish` integer DEFAULT false NOT NULL,
	`legacy_reuse_policy` text DEFAULT 'ZERO_CODE_ZERO_ARTIFACT' NOT NULL,
	`stop_rules_json` text NOT NULL,
	`actor_email` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `production_v2_policy_channel_version_uq` ON `production_v2_policies` (`channel_id`,`policy_version`);--> statement-breakpoint
CREATE UNIQUE INDEX `production_v2_policy_idempotency_uq` ON `production_v2_policies` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `production_v2_provider_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`policy_id` text NOT NULL,
	`package_id` text NOT NULL,
	`job_id` text,
	`provider` text NOT NULL,
	`operation` text NOT NULL,
	`lifecycle_state` text DEFAULT 'CREATED' NOT NULL,
	`provider_response_id` text,
	`idempotency_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`error_code` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`policy_id`) REFERENCES `production_v2_policies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`package_id`) REFERENCES `production_v2_packages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `production_v2_jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `production_v2_provider_idempotency_uq` ON `production_v2_provider_requests` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `production_v2_provider_package_state_idx` ON `production_v2_provider_requests` (`package_id`,`lifecycle_state`);--> statement-breakpoint
CREATE TABLE `production_v2_quality_assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`package_id` text NOT NULL,
	`artifact_id` text,
	`assessment_type` text NOT NULL,
	`evaluation_number` integer NOT NULL,
	`lifecycle_state` text NOT NULL,
	`score` integer NOT NULL,
	`p0_count` integer DEFAULT 0 NOT NULL,
	`p1_count` integer DEFAULT 0 NOT NULL,
	`dimensions_json` text NOT NULL,
	`findings_json` text NOT NULL,
	`evidence_hash` text NOT NULL,
	`independent_actor` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`package_id`) REFERENCES `production_v2_packages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`artifact_id`) REFERENCES `production_v2_artifacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `production_v2_assessment_artifact_eval_uq` ON `production_v2_quality_assessments` (`artifact_id`,`assessment_type`,`evaluation_number`);--> statement-breakpoint
CREATE INDEX `production_v2_assessment_package_idx` ON `production_v2_quality_assessments` (`package_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `production_v2_repair_packages` (
	`id` text PRIMARY KEY NOT NULL,
	`package_id` text NOT NULL,
	`assessment_id` text NOT NULL,
	`root_stage` text NOT NULL,
	`lifecycle_state` text DEFAULT 'AUTHORIZED' NOT NULL,
	`allowed_changes_json` text NOT NULL,
	`regression_tests_json` text NOT NULL,
	`max_remote_requests` integer NOT NULL,
	`max_spend_usd` real NOT NULL,
	`attempt` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`package_id`) REFERENCES `production_v2_packages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assessment_id`) REFERENCES `production_v2_quality_assessments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `production_v2_repair_package_attempt_uq` ON `production_v2_repair_packages` (`package_id`,`attempt`);--> statement-breakpoint
CREATE TABLE `production_v2_scale_waves` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`wave_number` integer NOT NULL,
	`scope_json` text NOT NULL,
	`lifecycle_state` text DEFAULT 'BLOCKED_UPSTREAM' NOT NULL,
	`package_count` integer NOT NULL,
	`completed_count` integer DEFAULT 0 NOT NULL,
	`p0_count` integer DEFAULT 0 NOT NULL,
	`p1_rate` real DEFAULT 0 NOT NULL,
	`duplicate_rate` real DEFAULT 0 NOT NULL,
	`provider_failure_rate` real DEFAULT 0 NOT NULL,
	`cost_variance_rate` real DEFAULT 0 NOT NULL,
	`admission_evidence_hash` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `production_v2_wave_channel_number_uq` ON `production_v2_scale_waves` (`channel_id`,`wave_number`);--> statement-breakpoint
CREATE TABLE `production_v2_shot_contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`package_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`narrative_beat` text NOT NULL,
	`claim` text NOT NULL,
	`evidence_refs_json` text NOT NULL,
	`route` text NOT NULL,
	`visual_job` text NOT NULL,
	`required_evidence_json` text NOT NULL,
	`forbidden_evidence_json` text NOT NULL,
	`entry_state` text NOT NULL,
	`midpoint_state` text NOT NULL,
	`exit_state` text NOT NULL,
	`max_duration_seconds` integer NOT NULL,
	`lifecycle_state` text DEFAULT 'CONTRACT_VALID' NOT NULL,
	`engine_version` text DEFAULT 'PRODUCTION_ENGINE_V2_GREENFIELD' NOT NULL,
	`content_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`package_id`) REFERENCES `production_v2_packages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `production_v2_shot_package_sequence_uq` ON `production_v2_shot_contracts` (`package_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `production_v2_shot_state_idx` ON `production_v2_shot_contracts` (`package_id`,`lifecycle_state`);
--> statement-breakpoint
INSERT INTO production_v2_policies (
	id,channel_id,policy_version,lifecycle_state,mode,daily_budget_usd,monthly_budget_usd,per_video_budget_usd,
	max_remote_requests,max_repair_attempts,auto_dispatch,auto_publish,legacy_reuse_policy,stop_rules_json,
	actor_email,idempotency_key,request_hash
) VALUES (
	'production-v2-policy:channel-hidden-systems:v1','channel-hidden-systems',1,'ACTIVE','FULL_AUTOPILOT',
	25,500,40,300,1,1,0,'ZERO_CODE_ZERO_ARTIFACT',
	'{"p0Tolerance":0,"p1RateMax":0.05,"duplicateRateMax":0.02,"providerFailureRateMax":0.10,"costVarianceRateMax":0.20,"qaEvaluationsMax":2}',
	'hungqv88@gmail.com','production-v2:policy:channel-hidden-systems:v1','prodv2policy0000000000000000000000000000000000000000000000000001'
);
--> statement-breakpoint
INSERT INTO production_v2_packages (
	id,channel_id,policy_id,source_brief_id,episode_concept_id,package_version,title,lifecycle_state,
	target_duration_seconds,shot_count,traceability_complete,legacy_source_count,provider_requests,spend_usd,
	engine_version,content_hash,frozen_at
)
SELECT
	'production-v2:package:' || b.episode_concept_id,
	c.channel_id,
	'production-v2-policy:channel-hidden-systems:v1',
	b.id,
	b.episode_concept_id,
	1,
	c.title,
	'PRODUCTION_PACKAGE_COMPILED',
	b.target_duration_seconds,
	5,
	1,
	0,
	0,
	0,
	'PRODUCTION_ENGINE_V2_GREENFIELD',
	printf('%064x', c.sequence + 1000),
	CURRENT_TIMESTAMP
FROM production_briefs_v2 b
JOIN content_episode_concepts_v2 c ON c.id=b.episode_concept_id
JOIN content_planning_runs r ON r.id=b.run_id
WHERE r.channel_id='channel-hidden-systems'
	AND r.run_version=(SELECT MAX(run_version) FROM content_planning_runs WHERE channel_id='channel-hidden-systems')
	AND b.lifecycle_state='READY_FOR_PRODUCTION';
--> statement-breakpoint
INSERT INTO production_v2_shot_contracts (
	id,package_id,sequence,narrative_beat,claim,evidence_refs_json,route,visual_job,
	required_evidence_json,forbidden_evidence_json,entry_state,midpoint_state,exit_state,
	max_duration_seconds,lifecycle_state,engine_version,content_hash
)
WITH beats(sequence,narrative_beat,route,visual_job,entry_state,midpoint_state,exit_state) AS (
	VALUES
	(1,'AUDIENCE_PROBLEM','SOURCE','Establish the familiar transaction and the viewer tension','A familiar transaction appears simple','The visible price or action is isolated','The hidden-system question is explicit'),
	(2,'INSTITUTIONAL_MAP','MAKE','Map named institutions, roles and directional handoffs','One visible actor owns the frame','Named institutions and directional relations appear','The complete responsibility map is legible'),
	(3,'MONEY_AND_DATA_FLOW','HYBRID','Trace one concrete unit of money or data through the system','The concrete unit enters the system','The unit crosses a meaningful institutional boundary','The unit reaches a reconciled outcome'),
	(4,'COUNTEREVIDENCE','MAKE','Expose uncertainty, counterevidence and prohibited inference','The leading explanation is visible','Counterevidence changes the interpretation','The supported boundary is explicit'),
	(5,'VIEWER_MODEL','HYBRID','Consolidate the durable viewer mental model','The original transaction returns','The model explains the hidden mechanism','The viewer can apply the model without personal advice')
)
SELECT
	p.id || ':shot:' || beats.sequence,
	p.id,
	beats.sequence,
	beats.narrative_beat,
	CASE beats.sequence
		WHEN 1 THEN c.core_question
		WHEN 2 THEN 'Named institutions and their responsibilities must be visually distinct.'
		WHEN 3 THEN 'A concrete money or data unit must visibly cross institutional boundaries.'
		WHEN 4 THEN 'Counterevidence and uncertainty must constrain the conclusion.'
		ELSE 'The episode must end with a durable system model rather than personal-finance advice.'
	END,
	c.evidence_refs_json,
	beats.route,
	beats.visual_job,
	c.evidence_refs_json,
	'["legacy asset or template","URL or filename","debug or QA label","unsupported company accusation","personalized financial advice","generic finance wallpaper"]',
	beats.entry_state,
	beats.midpoint_state,
	beats.exit_state,
	CAST((p.target_duration_seconds + 4) / 5 AS INTEGER),
	'CONTRACT_VALID',
	'PRODUCTION_ENGINE_V2_GREENFIELD',
	printf('%064x', c.sequence * 10 + beats.sequence + 2000)
FROM production_v2_packages p
JOIN content_episode_concepts_v2 c ON c.id=p.episode_concept_id
CROSS JOIN beats;
--> statement-breakpoint
INSERT INTO production_v2_scale_waves (id,channel_id,wave_number,scope_json,lifecycle_state,package_count)
VALUES
	('production-v2:wave:channel-hidden-systems:0','channel-hidden-systems',0,'[1]','READY_FOR_GOLDEN_PILOT',1),
	('production-v2:wave:channel-hidden-systems:1','channel-hidden-systems',1,'[2,3]','BLOCKED_UPSTREAM',2),
	('production-v2:wave:channel-hidden-systems:2','channel-hidden-systems',2,'[4,5,6,7]','BLOCKED_UPSTREAM',4),
	('production-v2:wave:channel-hidden-systems:3','channel-hidden-systems',3,'[8,9,10,11,12,13,14,15]','BLOCKED_UPSTREAM',8);
--> statement-breakpoint
INSERT INTO production_v2_audits (id,channel_id,entity_type,entity_id,event_type,actor_type,actor_email,detail_json,evidence_hash)
VALUES (
	'production-v2:audit:foundation:v1','channel-hidden-systems','PRODUCTION_ENGINE','PRODUCTION_ENGINE_V2_GREENFIELD',
	'GREENFIELD_FOUNDATION_COMPILED','SYSTEM_AUTOPILOT','hungqv88@gmail.com',
	'{"checkpoint":1,"packages":15,"shotsPerPackage":5,"providerRequests":0,"spendUsd":0,"legacyReuse":"ZERO_CODE_ZERO_ARTIFACT","publishingAuthority":false}',
	'foundation000000000000000000000000000000000000000000000000000001'
);
