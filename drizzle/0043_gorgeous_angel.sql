CREATE TABLE `v7_sequential_artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`queue_id` text NOT NULL,
	`stage_run_id` text NOT NULL,
	`stage_key` text NOT NULL,
	`artifact_type` text NOT NULL,
	`revision` integer NOT NULL,
	`lifecycle_state` text DEFAULT 'PRODUCED' NOT NULL,
	`content_json` text,
	`storage_key` text,
	`mime_type` text DEFAULT 'application/json' NOT NULL,
	`byte_size` integer DEFAULT 0 NOT NULL,
	`sha256` text NOT NULL,
	`parent_artifact_ids_json` text DEFAULT '[]' NOT NULL,
	`lineage_root_hash` text NOT NULL,
	`rights_state` text NOT NULL,
	`cost_state` text NOT NULL,
	`provider` text,
	`provider_request_id` text,
	`verification_json` text,
	`verified_at` text,
	`frozen_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_sequential_artifact_revision_uq` ON `v7_sequential_artifacts` (`queue_id`,`stage_key`,`artifact_type`,`revision`);--> statement-breakpoint
CREATE UNIQUE INDEX `v7_sequential_artifact_hash_uq` ON `v7_sequential_artifacts` (`queue_id`,`sha256`);--> statement-breakpoint
CREATE INDEX `v7_sequential_artifact_stage_state_idx` ON `v7_sequential_artifacts` (`queue_id`,`stage_key`,`lifecycle_state`);--> statement-breakpoint
CREATE TABLE `v7_sequential_budget_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`queue_id` text NOT NULL,
	`version` integer NOT NULL,
	`lifecycle_state` text NOT NULL,
	`stage_scope_json` text NOT NULL,
	`max_spend_usd` real NOT NULL,
	`max_provider_requests` integer NOT NULL,
	`provider_plan_json` text NOT NULL,
	`rights_plan_json` text NOT NULL,
	`actual_spend_usd` real DEFAULT 0 NOT NULL,
	`actual_provider_requests` integer DEFAULT 0 NOT NULL,
	`approved_by` text NOT NULL,
	`approval_evidence_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_sequential_budget_queue_version_uq` ON `v7_sequential_budget_plans` (`queue_id`,`version`);--> statement-breakpoint
CREATE TABLE `v7_sequential_command_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`command` text NOT NULL,
	`program_id` text NOT NULL,
	`queue_id` text NOT NULL,
	`stage_key` text NOT NULL,
	`actor_type` text NOT NULL,
	`actor_email` text NOT NULL,
	`outcome` text NOT NULL,
	`stage_state` text NOT NULL,
	`artifact_id` text,
	`provider_requests` integer DEFAULT 0 NOT NULL,
	`spend_usd` real DEFAULT 0 NOT NULL,
	`detail_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_sequential_command_idempotency_uq` ON `v7_sequential_command_receipts` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `v7_sequential_leases` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`queue_id` text NOT NULL,
	`stage_key` text NOT NULL,
	`lifecycle_state` text DEFAULT 'ACTIVE' NOT NULL,
	`actor_email` text NOT NULL,
	`acquired_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`released_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `v7_sequential_lease_program_state_idx` ON `v7_sequential_leases` (`program_id`,`lifecycle_state`);--> statement-breakpoint
CREATE TABLE `v7_sequential_provider_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`queue_id` text NOT NULL,
	`stage_key` text NOT NULL,
	`artifact_id` text,
	`provider` text NOT NULL,
	`operation` text NOT NULL,
	`lifecycle_state` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`provider_response_id` text,
	`response_hash` text,
	`rights_state` text NOT NULL,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`error_code` text,
	`started_at` text NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_sequential_provider_idempotency_uq` ON `v7_sequential_provider_requests` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `v7_sequential_provider_queue_state_idx` ON `v7_sequential_provider_requests` (`queue_id`,`lifecycle_state`);--> statement-breakpoint
CREATE TABLE `v7_stage_contract_registry` (
	`id` text PRIMARY KEY NOT NULL,
	`contract_version` text NOT NULL,
	`stage_key` text NOT NULL,
	`sequence` integer NOT NULL,
	`stage_name` text NOT NULL,
	`owner_plane` text NOT NULL,
	`gate_version` text NOT NULL,
	`predecessor_keys_json` text DEFAULT '[]' NOT NULL,
	`required_artifacts_json` text DEFAULT '[]' NOT NULL,
	`allowed_commands_json` text NOT NULL,
	`eligibility_policy_json` text NOT NULL,
	`provider_policy_json` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_stage_contract_version_key_uq` ON `v7_stage_contract_registry` (`contract_version`,`stage_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `v7_stage_contract_version_sequence_uq` ON `v7_stage_contract_registry` (`contract_version`,`sequence`);
--> statement-breakpoint
INSERT INTO `v7_stage_contract_registry` (`id`,`contract_version`,`stage_key`,`sequence`,`stage_name`,`owner_plane`,`gate_version`,`predecessor_keys_json`,`required_artifacts_json`,`allowed_commands_json`,`eligibility_policy_json`,`provider_policy_json`) VALUES
('V7_V23_4_V281:00','V7_V23_4_V281','00',0,'Production authority and lineage','CONTROL_PLANE','V7','[]','["production policy","canonical brief hash","exclusive lease"]','["START_STAGE","PRODUCE_ARTIFACT","VERIFY_ARTIFACT","FREEZE_STAGE","REOPEN_ROOT_STAGE"]','{"minimumArtifacts":3,"requireFrozenPredecessors":false,"requireStoredBytes":false,"rightsStates":["NOT_APPLICABLE"],"costStates":["ZERO_SPEND"]}','{"providerAllowed":false,"budgetPlanRequired":false}'),
('V7_V23_4_V281:01','V7_V23_4_V281','01',1,'Market, audience, and topic intelligence','INTELLIGENCE','V7','["00"]','["episode intelligence dossier","audience job","competitive bar"]','["START_STAGE","PRODUCE_ARTIFACT","VERIFY_ARTIFACT","FREEZE_STAGE","REOPEN_ROOT_STAGE"]','{"minimumArtifacts":3,"requireFrozenPredecessors":true,"requireStoredBytes":false,"rightsStates":["NOT_APPLICABLE","PRIMARY_SOURCES_VERIFIED"],"costStates":["ZERO_SPEND","WITHIN_APPROVED_PLAN"]}','{"providerAllowed":true,"providers":["OPENAI"],"budgetPlanRequired":false,"maxAttemptsPerArtifact":2}'),
('V7_V23_4_V281:02','V7_V23_4_V281','02',2,'Reference analysis','INTELLIGENCE','V7','["01"]','["reference set","parity matrix","anti-copy constraints"]','["START_STAGE","PRODUCE_ARTIFACT","VERIFY_ARTIFACT","FREEZE_STAGE","REOPEN_ROOT_STAGE"]','{"minimumArtifacts":3,"requireFrozenPredecessors":true,"requireStoredBytes":false,"rightsStates":["REFERENCE_ANALYSIS_ONLY"],"costStates":["ZERO_SPEND","WITHIN_APPROVED_PLAN"]}','{"providerAllowed":true,"providers":["OPENAI"],"budgetPlanRequired":false,"maxAttemptsPerArtifact":2}'),
('V7_V23_4_V281:03','V7_V23_4_V281','03',3,'Truth research and claim mapping','INTELLIGENCE','V7','["02"]','["primary sources","claim-source graph","contradiction ledger"]','["START_STAGE","PRODUCE_ARTIFACT","VERIFY_ARTIFACT","FREEZE_STAGE","REOPEN_ROOT_STAGE"]','{"minimumArtifacts":3,"requireFrozenPredecessors":true,"requireStoredBytes":false,"rightsStates":["PRIMARY_SOURCES_VERIFIED"],"costStates":["ZERO_SPEND","WITHIN_APPROVED_PLAN"]}','{"providerAllowed":true,"providers":["OPENAI"],"budgetPlanRequired":false,"maxAttemptsPerArtifact":2}'),
('V7_V23_4_V281:04','V7_V23_4_V281','04',4,'Creative route selection','SEMANTIC_DESIGN','V7','["03"]','["four creative routes","seven-critic decision","frozen champion"]','["START_STAGE","PRODUCE_ARTIFACT","VERIFY_ARTIFACT","FREEZE_STAGE","REOPEN_ROOT_STAGE"]','{"minimumArtifacts":3,"requireFrozenPredecessors":true,"requireStoredBytes":false,"rightsStates":["CHANNEL_OWNED_ORIGINAL"],"costStates":["ZERO_SPEND","WITHIN_APPROVED_PLAN"]}','{"providerAllowed":true,"providers":["OPENAI"],"budgetPlanRequired":false,"maxAttemptsPerArtifact":2}'),
('V7_V23_4_V281:05','V7_V23_4_V281','05',5,'Story architecture','SEMANTIC_DESIGN','V7','["04"]','["story clock","retention spine","claim-beat map"]','["START_STAGE","PRODUCE_ARTIFACT","VERIFY_ARTIFACT","FREEZE_STAGE","REOPEN_ROOT_STAGE"]','{"minimumArtifacts":3,"requireFrozenPredecessors":true,"requireStoredBytes":false,"rightsStates":["CHANNEL_OWNED_ORIGINAL"],"costStates":["ZERO_SPEND","WITHIN_APPROVED_PLAN"]}','{"providerAllowed":true,"providers":["OPENAI"],"budgetPlanRequired":false,"maxAttemptsPerArtifact":2}'),
('V7_V23_4_V281:06','V7_V23_4_V281','06',6,'Script creation and lock','SEMANTIC_DESIGN','V7','["05"]','["locked narration","terminology ledger","script critic evidence"]','["START_STAGE","PRODUCE_ARTIFACT","VERIFY_ARTIFACT","FREEZE_STAGE","REOPEN_ROOT_STAGE"]','{"minimumArtifacts":3,"requireFrozenPredecessors":true,"requireStoredBytes":false,"rightsStates":["CHANNEL_OWNED_ORIGINAL"],"costStates":["ZERO_SPEND","WITHIN_APPROVED_PLAN"]}','{"providerAllowed":true,"providers":["OPENAI"],"budgetPlanRequired":false,"maxAttemptsPerArtifact":2}'),
('V7_V23_4_V281:07A','V7_V23_4_V281','07A',7,'Voice and sound design','PRODUCTION_DESIGN','V7','["06"]','["one narrator identity","take tournaments","soundscape contract"]','["START_STAGE","PRODUCE_ARTIFACT","VERIFY_ARTIFACT","FREEZE_STAGE","REOPEN_ROOT_STAGE"]','{"minimumArtifacts":3,"requireFrozenPredecessors":true,"requireStoredBytes":false,"rightsStates":["CHANNEL_OWNED_ORIGINAL"],"costStates":["ZERO_SPEND","WITHIN_APPROVED_PLAN"]}','{"providerAllowed":true,"providers":["OPENAI"],"budgetPlanRequired":false,"maxAttemptsPerArtifact":2}'),
('V7_V23_4_V281:07B','V7_V23_4_V281','07B',8,'Visual grammar and asset strategy','PRODUCTION_DESIGN','V7','["07A"]','["visual grammar","SOURCE MAKE HYBRID routing","provider tournament"]','["START_STAGE","PRODUCE_ARTIFACT","VERIFY_ARTIFACT","FREEZE_STAGE","REOPEN_ROOT_STAGE"]','{"minimumArtifacts":3,"requireFrozenPredecessors":true,"requireStoredBytes":false,"rightsStates":["CHANNEL_OWNED_ORIGINAL","PROVIDER_RIGHTS_PLAN_VERIFIED"],"costStates":["ZERO_SPEND","WITHIN_APPROVED_PLAN"]}','{"providerAllowed":true,"providers":["OPENAI"],"budgetPlanRequired":false,"maxAttemptsPerArtifact":2}'),
('V7_V23_4_V281:08','V7_V23_4_V281','08',9,'Script-to-shot compilation','SEMANTIC_COMPILER','V23.4','["07A","07B"]','["shot contracts","typed scene programs","ENTRY MIDPOINT EXIT"]','["START_STAGE","PRODUCE_ARTIFACT","VERIFY_ARTIFACT","FREEZE_STAGE","REOPEN_ROOT_STAGE"]','{"minimumArtifacts":3,"requireFrozenPredecessors":true,"requireStoredBytes":false,"rightsStates":["CHANNEL_OWNED_ORIGINAL"],"costStates":["WITHIN_APPROVED_PLAN"]}','{"providerAllowed":true,"providers":["OPENAI"],"budgetPlanRequired":true,"maxAttemptsPerArtifact":2}'),
('V7_V23_4_V281:09','V7_V23_4_V281','09',10,'Visual asset production','MEDIA_EXECUTION','V23.4','["08"]','["stored source bytes","rights lineage","three-frame motion proof"]','["START_STAGE","PRODUCE_ARTIFACT","VERIFY_ARTIFACT","FREEZE_STAGE","REOPEN_ROOT_STAGE"]','{"minimumArtifacts":3,"requireFrozenPredecessors":true,"requireStoredBytes":true,"rightsStates":["COMMERCIAL_LICENSE_VERIFIED","CHANNEL_OWNED_ORIGINAL"],"costStates":["WITHIN_APPROVED_PLAN"]}','{"providerAllowed":true,"providers":["PEXELS","PIXABAY","SHUTTERSTOCK","OPENAI_IMAGE"],"budgetPlanRequired":true,"maxAttemptsPerArtifact":2}'),
('V7_V23_4_V281:10','V7_V23_4_V281','10',11,'Voice, music, and SFX production','MEDIA_EXECUTION','V7','["09"]','["audio stems","waveform evidence","measured mix"]','["START_STAGE","PRODUCE_ARTIFACT","VERIFY_ARTIFACT","FREEZE_STAGE","REOPEN_ROOT_STAGE"]','{"minimumArtifacts":3,"requireFrozenPredecessors":true,"requireStoredBytes":true,"rightsStates":["COMMERCIAL_LICENSE_VERIFIED","CHANNEL_OWNED_ORIGINAL"],"costStates":["WITHIN_APPROVED_PLAN"]}','{"providerAllowed":true,"providers":["ELEVENLABS"],"budgetPlanRequired":true,"maxAttemptsPerArtifact":2}'),
('V7_V23_4_V281:11','V7_V23_4_V281','11',12,'Picture edit and audio composition','MEDIA_EXECUTION','V23.4','["10"]','["picture lock","duplicate scan","clean audience render"]','["START_STAGE","PRODUCE_ARTIFACT","VERIFY_ARTIFACT","FREEZE_STAGE","REOPEN_ROOT_STAGE"]','{"minimumArtifacts":3,"requireFrozenPredecessors":true,"requireStoredBytes":true,"rightsStates":["CHANNEL_OWNED_ORIGINAL"],"costStates":["WITHIN_APPROVED_PLAN"]}','{"providerAllowed":false,"budgetPlanRequired":true}'),
('V7_V23_4_V281:12','V7_V23_4_V281','12',13,'Pre-master timeline verification','INDEPENDENT_QA','V281','["11"]','["full timeline scan","mobile legibility","AV sync"]','["START_STAGE","PRODUCE_ARTIFACT","VERIFY_ARTIFACT","FREEZE_STAGE","REOPEN_ROOT_STAGE"]','{"minimumArtifacts":3,"requireFrozenPredecessors":true,"requireStoredBytes":false,"rightsStates":["NOT_APPLICABLE"],"costStates":["WITHIN_APPROVED_PLAN"]}','{"providerAllowed":false,"budgetPlanRequired":true}'),
('V7_V23_4_V281:13','V7_V23_4_V281','13',14,'Immutable master render','MEDIA_EXECUTION','V23.4','["12"]','["master bytes","checksum","technical probe"]','["START_STAGE","PRODUCE_ARTIFACT","VERIFY_ARTIFACT","FREEZE_STAGE","REOPEN_ROOT_STAGE"]','{"minimumArtifacts":3,"requireFrozenPredecessors":true,"requireStoredBytes":true,"rightsStates":["CHANNEL_OWNED_ORIGINAL"],"costStates":["WITHIN_APPROVED_PLAN"]}','{"providerAllowed":false,"budgetPlanRequired":true}'),
('V7_V23_4_V281:14','V7_V23_4_V281','14',15,'Independent full-video assurance','INDEPENDENT_QA','V281','["13"]','["full playback","three samples per shot","eight critic consensus"]','["START_STAGE","PRODUCE_ARTIFACT","VERIFY_ARTIFACT","FREEZE_STAGE","REOPEN_ROOT_STAGE"]','{"minimumArtifacts":3,"requireFrozenPredecessors":true,"requireStoredBytes":false,"rightsStates":["NOT_APPLICABLE"],"costStates":["WITHIN_APPROVED_PLAN"]}','{"providerAllowed":true,"providers":["OPENAI"],"budgetPlanRequired":true,"maxAttemptsPerArtifact":2}'),
('V7_V23_4_V281:15','V7_V23_4_V281','15',16,'Owner-ready release gate','OWNER_GATE','V281','["14"]','["score >=92","critical >=90","dimension >=86","P0=0 P1=0"]','["START_STAGE","PRODUCE_ARTIFACT","VERIFY_ARTIFACT","FREEZE_STAGE","REOPEN_ROOT_STAGE"]','{"minimumArtifacts":4,"requireFrozenPredecessors":true,"requireStoredBytes":false,"rightsStates":["NOT_APPLICABLE"],"costStates":["RECONCILED"]}','{"providerAllowed":false,"budgetPlanRequired":true}'),
('V7_V23_4_V281:16','V7_V23_4_V281','16',17,'Post-publish learning handoff','LEARNING','V7','["15"]','["publication authority","performance baseline","learning contract"]','["START_STAGE","PRODUCE_ARTIFACT","VERIFY_ARTIFACT","FREEZE_STAGE","REOPEN_ROOT_STAGE"]','{"minimumArtifacts":3,"requireFrozenPredecessors":true,"requireStoredBytes":false,"rightsStates":["NOT_APPLICABLE"],"costStates":["RECONCILED"]}','{"providerAllowed":true,"providers":["YOUTUBE_ANALYTICS"],"budgetPlanRequired":true,"maxAttemptsPerArtifact":2}');
--> statement-breakpoint
UPDATE `v7_sequential_programs` SET `auto_dispatch`=0,`updated_at`=CURRENT_TIMESTAMP WHERE `contract_version`='V7_V23_4_V281';
