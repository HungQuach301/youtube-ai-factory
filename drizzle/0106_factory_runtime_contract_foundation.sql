CREATE TABLE `factory_contract_registry` (
  `id` text PRIMARY KEY NOT NULL,
  `contract_key` text NOT NULL,
  `contract_version` text NOT NULL,
  `scope` text NOT NULL CHECK (`scope` IN ('FACTORY','CHANNEL','FORMAT','VIDEO','SEQUENCE','SHOT','ARTIFACT')),
  `schema_json` text NOT NULL CHECK (json_valid(`schema_json`)),
  `schema_hash` text NOT NULL CHECK (length(`schema_hash`) = 64),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('DRAFT','ACTIVE','SUPERSEDED','REVOKED')),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_contract_registry_key_version_uq` ON `factory_contract_registry` (`contract_key`,`contract_version`);
--> statement-breakpoint
CREATE TABLE `factory_canonical_timebases` (
  `id` text PRIMARY KEY NOT NULL,
  `video_id` text NOT NULL,
  `contract_version` text NOT NULL CHECK (`contract_version` = 'FACTORY_RUNTIME_CONTRACT_V1'),
  `frame_rate_numerator` integer NOT NULL CHECK (`frame_rate_numerator` > 0),
  `frame_rate_denominator` integer NOT NULL CHECK (`frame_rate_denominator` > 0),
  `audio_sample_rate_hz` integer NOT NULL CHECK (`audio_sample_rate_hz` > 0),
  `total_frames` integer NOT NULL CHECK (`total_frames` > 0),
  `total_audio_samples` integer NOT NULL CHECK (`total_audio_samples` > 0),
  `rounding_policy` text NOT NULL CHECK (`rounding_policy` = 'HALF_AWAY_FROM_ZERO_V1'),
  `definition_hash` text NOT NULL CHECK (length(`definition_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_canonical_timebase_video_hash_uq` ON `factory_canonical_timebases` (`video_id`,`definition_hash`);
--> statement-breakpoint
CREATE TABLE `factory_runtime_commands` (
  `id` text PRIMARY KEY NOT NULL,
  `stream_type` text NOT NULL,
  `stream_id` text NOT NULL,
  `command_type` text NOT NULL CHECK (`command_type` IN ('START_STAGE','PRODUCE_ARTIFACT','VERIFY_ARTIFACT','FREEZE_STAGE','REOPEN_ROOT_STAGE')),
  `expected_state` text NOT NULL,
  `expected_version` integer NOT NULL CHECK (`expected_version` >= 0),
  `actor_type` text NOT NULL CHECK (`actor_type` IN ('OWNER','OPERATOR','SYSTEM','ASSURANCE')),
  `actor_id` text NOT NULL,
  `lease_id` text NOT NULL,
  `fencing_token` integer NOT NULL CHECK (`fencing_token` > 0),
  `idempotency_key` text NOT NULL,
  `intent_hash` text NOT NULL CHECK (length(`intent_hash`) = 64),
  `policy_versions_json` text NOT NULL CHECK (json_valid(`policy_versions_json`)),
  `cost_scope_json` text NOT NULL CHECK (json_valid(`cost_scope_json`)),
  `rights_scope_json` text NOT NULL CHECK (json_valid(`rights_scope_json`)),
  `received_at` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_runtime_command_idempotency_uq` ON `factory_runtime_commands` (`idempotency_key`);
--> statement-breakpoint
CREATE INDEX `factory_runtime_command_stream_idx` ON `factory_runtime_commands` (`stream_type`,`stream_id`,`expected_version`);
--> statement-breakpoint
CREATE TABLE `factory_runtime_events` (
  `id` text PRIMARY KEY NOT NULL,
  `stream_type` text NOT NULL,
  `stream_id` text NOT NULL,
  `stream_version` integer NOT NULL CHECK (`stream_version` > 0),
  `event_type` text NOT NULL CHECK (`event_type` IN ('CommandAccepted','CommandRejected','WorkReserved','ProviderDispatched','ProviderReconciled','ArtifactMaterialized','ArtifactVerified','StageFrozen','DependencyStale','AssuranceStarted','FindingRecorded','VerdictRecorded','ExceptionRouted','ReleaseReady','Published','PerformanceObserved','LearningCandidateCreated','VersionPromoted','VersionRevoked','VersionRolledBack')),
  `actor_type` text NOT NULL CHECK (`actor_type` IN ('OWNER','OPERATOR','SYSTEM','PROVIDER','JUDGE','BROWSER')),
  `actor_id` text NOT NULL,
  `command_id` text,
  `causation_id` text,
  `correlation_id` text NOT NULL,
  `lease_id` text,
  `fencing_token` integer CHECK (`fencing_token` IS NULL OR `fencing_token` > 0),
  `idempotency_key` text NOT NULL,
  `intent_hash` text NOT NULL CHECK (length(`intent_hash`) = 64),
  `payload_json` text NOT NULL CHECK (json_valid(`payload_json`)),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `occurred_at` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`command_id`) REFERENCES `factory_runtime_commands`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_runtime_event_stream_version_uq` ON `factory_runtime_events` (`stream_type`,`stream_id`,`stream_version`);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_runtime_event_idempotency_uq` ON `factory_runtime_events` (`idempotency_key`);
--> statement-breakpoint
CREATE INDEX `factory_runtime_event_correlation_idx` ON `factory_runtime_events` (`correlation_id`,`occurred_at`);
--> statement-breakpoint
CREATE TABLE `factory_channel_visual_profile_versions` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `version` integer NOT NULL CHECK (`version` > 0),
  `policy_version` text NOT NULL,
  `market` text NOT NULL,
  `language` text NOT NULL,
  `profile_json` text NOT NULL CHECK (json_valid(`profile_json`)),
  `input_hash` text NOT NULL CHECK (length(`input_hash`) = 64),
  `content_hash` text NOT NULL CHECK (length(`content_hash`) = 64),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('DRAFT','FROZEN','SUPERSEDED','REVOKED')),
  `created_by` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_visual_profile_channel_version_uq` ON `factory_channel_visual_profile_versions` (`channel_id`,`version`);
--> statement-breakpoint
CREATE TABLE `factory_series_format_versions` (
  `id` text PRIMARY KEY NOT NULL,
  `channel_id` text NOT NULL,
  `format_key` text NOT NULL,
  `version` integer NOT NULL CHECK (`version` > 0),
  `format_json` text NOT NULL CHECK (json_valid(`format_json`)),
  `input_hash` text NOT NULL CHECK (length(`input_hash`) = 64),
  `content_hash` text NOT NULL CHECK (length(`content_hash`) = 64),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('DRAFT','FROZEN','SUPERSEDED','REVOKED')),
  `created_by` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_series_format_key_version_uq` ON `factory_series_format_versions` (`channel_id`,`format_key`,`version`);
--> statement-breakpoint
CREATE TABLE `factory_video_blueprints` (
  `id` text PRIMARY KEY NOT NULL,
  `video_id` text NOT NULL,
  `version` integer NOT NULL CHECK (`version` > 0),
  `channel_visual_profile_version_id` text NOT NULL,
  `series_format_version_id` text NOT NULL,
  `canonical_timebase_id` text NOT NULL,
  `claim_graph_hash` text NOT NULL CHECK (length(`claim_graph_hash`) = 64),
  `narration_hash` text NOT NULL CHECK (length(`narration_hash`) = 64),
  `blueprint_json` text NOT NULL CHECK (json_valid(`blueprint_json`)),
  `input_hash` text NOT NULL CHECK (length(`input_hash`) = 64),
  `content_hash` text NOT NULL CHECK (length(`content_hash`) = 64),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('DRAFT','COMPILED','FROZEN','SUPERSEDED','REVOKED')),
  `created_by` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`channel_visual_profile_version_id`) REFERENCES `factory_channel_visual_profile_versions`(`id`),
  FOREIGN KEY (`series_format_version_id`) REFERENCES `factory_series_format_versions`(`id`),
  FOREIGN KEY (`canonical_timebase_id`) REFERENCES `factory_canonical_timebases`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_video_blueprint_video_version_uq` ON `factory_video_blueprints` (`video_id`,`version`);
--> statement-breakpoint
CREATE TABLE `factory_shot_contracts` (
  `id` text PRIMARY KEY NOT NULL,
  `video_blueprint_id` text NOT NULL,
  `canonical_timebase_id` text NOT NULL,
  `sequence` integer NOT NULL CHECK (`sequence` > 0),
  `claim_id` text,
  `narration_segment_id` text NOT NULL,
  `start_frame` integer NOT NULL CHECK (`start_frame` >= 0),
  `end_frame_exclusive` integer NOT NULL CHECK (`end_frame_exclusive` > `start_frame`),
  `visual_job` text NOT NULL CHECK (`visual_job` IN ('REALITY_ANCHOR','MECHANISM_EXPLANATION','QUANTITATIVE_PROOF','GEOGRAPHIC_PROOF','TEMPORAL_PROOF','DECISION_PROOF')),
  `route` text NOT NULL CHECK (`route` IN ('SOURCE','MAKE','HYBRID')),
  `treatment_family` text NOT NULL,
  `contract_json` text NOT NULL CHECK (json_valid(`contract_json`)),
  `input_hash` text NOT NULL CHECK (length(`input_hash`) = 64),
  `content_hash` text NOT NULL CHECK (length(`content_hash`) = 64),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('COMPILED','FROZEN','SUPERSEDED','REVOKED')),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`video_blueprint_id`) REFERENCES `factory_video_blueprints`(`id`),
  FOREIGN KEY (`canonical_timebase_id`) REFERENCES `factory_canonical_timebases`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_shot_blueprint_sequence_uq` ON `factory_shot_contracts` (`video_blueprint_id`,`sequence`);
--> statement-breakpoint
CREATE INDEX `factory_shot_timebase_range_idx` ON `factory_shot_contracts` (`canonical_timebase_id`,`start_frame`,`end_frame_exclusive`);
--> statement-breakpoint
CREATE TABLE `factory_scene_graphs` (
  `id` text PRIMARY KEY NOT NULL,
  `video_blueprint_id` text NOT NULL,
  `canonical_timebase_id` text NOT NULL,
  `version` integer NOT NULL CHECK (`version` > 0),
  `renderer_contract_version` text NOT NULL,
  `graph_json` text NOT NULL CHECK (json_valid(`graph_json`)),
  `input_snapshot_hash` text NOT NULL CHECK (length(`input_snapshot_hash`) = 64),
  `graph_hash` text NOT NULL CHECK (length(`graph_hash`) = 64),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('COMPILED','FROZEN','SUPERSEDED','REVOKED')),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`video_blueprint_id`) REFERENCES `factory_video_blueprints`(`id`),
  FOREIGN KEY (`canonical_timebase_id`) REFERENCES `factory_canonical_timebases`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_scene_graph_blueprint_version_uq` ON `factory_scene_graphs` (`video_blueprint_id`,`version`);
--> statement-breakpoint
CREATE TABLE `factory_artifact_versions` (
  `id` text PRIMARY KEY NOT NULL,
  `artifact_id` text NOT NULL,
  `version` integer NOT NULL CHECK (`version` > 0),
  `artifact_kind` text NOT NULL,
  `source_entity_type` text NOT NULL,
  `source_entity_id` text NOT NULL,
  `content_hash` text NOT NULL CHECK (length(`content_hash`) = 64),
  `storage_key` text,
  `mime_type` text,
  `byte_size` integer CHECK (`byte_size` IS NULL OR `byte_size` >= 0),
  `lineage_json` text NOT NULL CHECK (json_valid(`lineage_json`)),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('PLANNED','MATERIALIZED','VERIFIED','FROZEN','SUPERSEDED','REVOKED')),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_artifact_version_uq` ON `factory_artifact_versions` (`artifact_id`,`version`);
--> statement-breakpoint
CREATE INDEX `factory_artifact_content_hash_idx` ON `factory_artifact_versions` (`content_hash`,`artifact_kind`);
--> statement-breakpoint
CREATE TABLE `factory_dependency_bindings` (
  `id` text PRIMARY KEY NOT NULL,
  `upstream_artifact_version_id` text NOT NULL,
  `downstream_artifact_version_id` text NOT NULL,
  `dependency_type` text NOT NULL,
  `binding_hash` text NOT NULL CHECK (length(`binding_hash`) = 64),
  `created_by_event_id` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (`upstream_artifact_version_id` <> `downstream_artifact_version_id`),
  FOREIGN KEY (`upstream_artifact_version_id`) REFERENCES `factory_artifact_versions`(`id`),
  FOREIGN KEY (`downstream_artifact_version_id`) REFERENCES `factory_artifact_versions`(`id`),
  FOREIGN KEY (`created_by_event_id`) REFERENCES `factory_runtime_events`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_dependency_binding_uq` ON `factory_dependency_bindings` (`upstream_artifact_version_id`,`downstream_artifact_version_id`,`dependency_type`);
--> statement-breakpoint
CREATE INDEX `factory_dependency_downstream_idx` ON `factory_dependency_bindings` (`downstream_artifact_version_id`);
--> statement-breakpoint
CREATE TABLE `factory_dependency_invalidations` (
  `id` text PRIMARY KEY NOT NULL,
  `dependency_binding_id` text NOT NULL,
  `stale_event_id` text NOT NULL,
  `reason` text NOT NULL,
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`dependency_binding_id`) REFERENCES `factory_dependency_bindings`(`id`),
  FOREIGN KEY (`stale_event_id`) REFERENCES `factory_runtime_events`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_dependency_invalidation_uq` ON `factory_dependency_invalidations` (`dependency_binding_id`,`stale_event_id`);
--> statement-breakpoint
CREATE TRIGGER `factory_contract_registry_no_update` BEFORE UPDATE ON `factory_contract_registry` BEGIN SELECT RAISE(ABORT, 'FACTORY_CONTRACT_REGISTRY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_contract_registry_no_delete` BEFORE DELETE ON `factory_contract_registry` BEGIN SELECT RAISE(ABORT, 'FACTORY_CONTRACT_REGISTRY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_canonical_timebases_no_update` BEFORE UPDATE ON `factory_canonical_timebases` BEGIN SELECT RAISE(ABORT, 'FACTORY_TIMEBASE_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_canonical_timebases_no_delete` BEFORE DELETE ON `factory_canonical_timebases` BEGIN SELECT RAISE(ABORT, 'FACTORY_TIMEBASE_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_runtime_commands_no_update` BEFORE UPDATE ON `factory_runtime_commands` BEGIN SELECT RAISE(ABORT, 'FACTORY_RUNTIME_COMMAND_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_runtime_commands_no_delete` BEFORE DELETE ON `factory_runtime_commands` BEGIN SELECT RAISE(ABORT, 'FACTORY_RUNTIME_COMMAND_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_runtime_events_no_update` BEFORE UPDATE ON `factory_runtime_events` BEGIN SELECT RAISE(ABORT, 'FACTORY_RUNTIME_EVENT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_runtime_events_no_delete` BEFORE DELETE ON `factory_runtime_events` BEGIN SELECT RAISE(ABORT, 'FACTORY_RUNTIME_EVENT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_visual_profiles_no_update` BEFORE UPDATE ON `factory_channel_visual_profile_versions` BEGIN SELECT RAISE(ABORT, 'FACTORY_VISUAL_PROFILE_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_visual_profiles_no_delete` BEFORE DELETE ON `factory_channel_visual_profile_versions` BEGIN SELECT RAISE(ABORT, 'FACTORY_VISUAL_PROFILE_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_series_formats_no_update` BEFORE UPDATE ON `factory_series_format_versions` BEGIN SELECT RAISE(ABORT, 'FACTORY_SERIES_FORMAT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_series_formats_no_delete` BEFORE DELETE ON `factory_series_format_versions` BEGIN SELECT RAISE(ABORT, 'FACTORY_SERIES_FORMAT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_video_blueprints_no_update` BEFORE UPDATE ON `factory_video_blueprints` BEGIN SELECT RAISE(ABORT, 'FACTORY_VIDEO_BLUEPRINT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_video_blueprints_no_delete` BEFORE DELETE ON `factory_video_blueprints` BEGIN SELECT RAISE(ABORT, 'FACTORY_VIDEO_BLUEPRINT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_shot_contracts_no_update` BEFORE UPDATE ON `factory_shot_contracts` BEGIN SELECT RAISE(ABORT, 'FACTORY_SHOT_CONTRACT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_shot_contracts_no_delete` BEFORE DELETE ON `factory_shot_contracts` BEGIN SELECT RAISE(ABORT, 'FACTORY_SHOT_CONTRACT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_scene_graphs_no_update` BEFORE UPDATE ON `factory_scene_graphs` BEGIN SELECT RAISE(ABORT, 'FACTORY_SCENE_GRAPH_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_scene_graphs_no_delete` BEFORE DELETE ON `factory_scene_graphs` BEGIN SELECT RAISE(ABORT, 'FACTORY_SCENE_GRAPH_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_artifact_versions_no_update` BEFORE UPDATE ON `factory_artifact_versions` BEGIN SELECT RAISE(ABORT, 'FACTORY_ARTIFACT_VERSION_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_artifact_versions_no_delete` BEFORE DELETE ON `factory_artifact_versions` BEGIN SELECT RAISE(ABORT, 'FACTORY_ARTIFACT_VERSION_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_dependency_bindings_no_update` BEFORE UPDATE ON `factory_dependency_bindings` BEGIN SELECT RAISE(ABORT, 'FACTORY_DEPENDENCY_BINDING_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_dependency_bindings_no_delete` BEFORE DELETE ON `factory_dependency_bindings` BEGIN SELECT RAISE(ABORT, 'FACTORY_DEPENDENCY_BINDING_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_dependency_invalidations_no_update` BEFORE UPDATE ON `factory_dependency_invalidations` BEGIN SELECT RAISE(ABORT, 'FACTORY_DEPENDENCY_INVALIDATION_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_dependency_invalidations_no_delete` BEFORE DELETE ON `factory_dependency_invalidations` BEGIN SELECT RAISE(ABORT, 'FACTORY_DEPENDENCY_INVALIDATION_IMMUTABLE'); END;
