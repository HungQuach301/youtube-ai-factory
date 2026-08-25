CREATE TABLE `factory_asset_eligibility_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `video_id` text NOT NULL,
  `artifact_version_id` text NOT NULL,
  `rights_receipt_id` text NOT NULL,
  `source_asset_id` text NOT NULL,
  `storage_key` text NOT NULL,
  `mime_type` text NOT NULL CHECK (`mime_type` LIKE 'image/%' OR `mime_type` LIKE 'video/%'),
  `byte_size` integer NOT NULL CHECK (`byte_size` > 0),
  `source_hash` text NOT NULL CHECK (length(`source_hash`) = 64),
  `readback_hash` text NOT NULL CHECK (length(`readback_hash`) = 64),
  `width` integer CHECK (`width` IS NULL OR `width` > 0),
  `height` integer CHECK (`height` IS NULL OR `height` > 0),
  `duration_ms` integer CHECK (`duration_ms` IS NULL OR `duration_ms` > 0),
  `commercial_use_state` text NOT NULL CHECK (`commercial_use_state` = 'ELIGIBLE'),
  `modification_state` text NOT NULL CHECK (`modification_state` IN ('ALLOWED','NOT_APPLICABLE')),
  `territory_scope` text NOT NULL,
  `verification_state` text NOT NULL CHECK (`verification_state` = 'PASS'),
  `idempotency_key` text NOT NULL,
  `command_id` text NOT NULL,
  `event_id` text NOT NULL,
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`artifact_version_id`) REFERENCES `factory_artifact_versions`(`id`),
  FOREIGN KEY (`rights_receipt_id`) REFERENCES `factory_rights_eligibility_receipts`(`id`),
  FOREIGN KEY (`command_id`) REFERENCES `factory_runtime_commands`(`id`),
  FOREIGN KEY (`event_id`) REFERENCES `factory_runtime_events`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_asset_eligibility_artifact_uq` ON `factory_asset_eligibility_receipts` (`artifact_version_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_asset_eligibility_idempotency_uq` ON `factory_asset_eligibility_receipts` (`idempotency_key`);
--> statement-breakpoint
CREATE TABLE `factory_pixel_compositor_bindings` (
  `id` text PRIMARY KEY NOT NULL,
  `provider_binding_id` text NOT NULL,
  `qualification_id` text NOT NULL,
  `worker_key` text NOT NULL,
  `worker_version` text NOT NULL,
  `compositor_version` text NOT NULL,
  `encoder_version` text NOT NULL,
  `input_schema_hash` text NOT NULL CHECK (length(`input_schema_hash`) = 64),
  `output_schema_hash` text NOT NULL CHECK (length(`output_schema_hash`) = 64),
  `settings_hash` text NOT NULL CHECK (length(`settings_hash`) = 64),
  `output_mime_type` text NOT NULL CHECK (`output_mime_type` = 'video/webm'),
  `output_codec` text NOT NULL CHECK (`output_codec` = 'vp9'),
  `max_frames_per_job` integer NOT NULL CHECK (`max_frames_per_job` BETWEEN 1800 AND 216000),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('ACTIVE','SUSPENDED','REVOKED')),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`provider_binding_id`) REFERENCES `factory_provider_bindings`(`id`),
  FOREIGN KEY (`qualification_id`) REFERENCES `factory_capability_qualifications`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_pixel_compositor_version_uq` ON `factory_pixel_compositor_bindings` (`worker_key`,`worker_version`,`settings_hash`);
--> statement-breakpoint
CREATE INDEX `factory_pixel_compositor_route_idx` ON `factory_pixel_compositor_bindings` (`lifecycle_state`,`compositor_version`);
--> statement-breakpoint
CREATE TABLE `factory_video_composition_jobs` (
  `id` text PRIMARY KEY NOT NULL,
  `video_id` text NOT NULL,
  `render_tape_artifact_version_id` text NOT NULL,
  `compositor_binding_id` text NOT NULL,
  `lease_id` text NOT NULL,
  `fencing_token` integer NOT NULL CHECK (`fencing_token` > 0),
  `frame_start` integer NOT NULL CHECK (`frame_start` >= 0),
  `frame_end_exclusive` integer NOT NULL CHECK (`frame_end_exclusive` > `frame_start`),
  `asset_receipt_ids_json` text NOT NULL CHECK (json_valid(`asset_receipt_ids_json`)),
  `input_hash` text NOT NULL CHECK (length(`input_hash`) = 64),
  `composition_program_hash` text NOT NULL CHECK (length(`composition_program_hash`) = 64),
  `dependency_snapshot_hash` text NOT NULL CHECK (length(`dependency_snapshot_hash`) = 64),
  `output_hash` text NOT NULL CHECK (length(`output_hash`) = 64),
  `storage_key` text NOT NULL,
  `mime_type` text NOT NULL CHECK (`mime_type` = 'video/webm'),
  `byte_size` integer NOT NULL CHECK (`byte_size` > 0),
  `duration_ms` integer NOT NULL CHECK (`duration_ms` BETWEEN 60000 AND 90000),
  `width` integer NOT NULL CHECK (`width` BETWEEN 320 AND 3840),
  `height` integer NOT NULL CHECK (`height` BETWEEN 180 AND 2160),
  `frame_rate_numerator` integer NOT NULL CHECK (`frame_rate_numerator` > 0),
  `frame_rate_denominator` integer NOT NULL CHECK (`frame_rate_denominator` > 0),
  `frame_count` integer NOT NULL CHECK (`frame_count` > 0),
  `idempotency_key` text NOT NULL,
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` = 'MATERIALIZED'),
  `provider_requests` integer NOT NULL CHECK (`provider_requests` = 0),
  `spend_micros` integer NOT NULL CHECK (`spend_micros` = 0),
  `command_id` text NOT NULL,
  `event_id` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`render_tape_artifact_version_id`) REFERENCES `factory_artifact_versions`(`id`),
  FOREIGN KEY (`compositor_binding_id`) REFERENCES `factory_pixel_compositor_bindings`(`id`),
  FOREIGN KEY (`lease_id`) REFERENCES `factory_runtime_leases`(`id`),
  FOREIGN KEY (`command_id`) REFERENCES `factory_runtime_commands`(`id`),
  FOREIGN KEY (`event_id`) REFERENCES `factory_runtime_events`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_video_composition_idempotency_uq` ON `factory_video_composition_jobs` (`idempotency_key`);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_video_composition_output_uq` ON `factory_video_composition_jobs` (`video_id`,`render_tape_artifact_version_id`,`compositor_binding_id`,`frame_start`,`frame_end_exclusive`,`output_hash`);
--> statement-breakpoint
CREATE TABLE `factory_integrated_canary_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `composition_job_id` text NOT NULL,
  `artifact_version_id` text NOT NULL,
  `canary_kind` text NOT NULL CHECK (`canary_kind` = 'INTEGRATED_60_90_SECONDS'),
  `compositor_version` text NOT NULL,
  `encoder_version` text NOT NULL,
  `dependency_snapshot_hash` text NOT NULL CHECK (length(`dependency_snapshot_hash`) = 64),
  `sample_evidence_json` text NOT NULL CHECK (json_valid(`sample_evidence_json`)),
  `output_hash` text NOT NULL CHECK (length(`output_hash`) = 64),
  `readback_hash` text NOT NULL CHECK (length(`readback_hash`) = 64),
  `deterministic_replay_hash` text NOT NULL CHECK (length(`deterministic_replay_hash`) = 64),
  `verification_state` text NOT NULL CHECK (`verification_state` = 'PASS'),
  `zero_dispatch` integer NOT NULL CHECK (`zero_dispatch` = 1),
  `provider_requests` integer NOT NULL CHECK (`provider_requests` = 0),
  `spend_micros` integer NOT NULL CHECK (`spend_micros` = 0),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`composition_job_id`) REFERENCES `factory_video_composition_jobs`(`id`),
  FOREIGN KEY (`artifact_version_id`) REFERENCES `factory_artifact_versions`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_integrated_canary_job_uq` ON `factory_integrated_canary_receipts` (`composition_job_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_integrated_canary_artifact_uq` ON `factory_integrated_canary_receipts` (`artifact_version_id`);
--> statement-breakpoint
CREATE TRIGGER `factory_asset_eligibility_receipts_no_update` BEFORE UPDATE ON `factory_asset_eligibility_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSET_ELIGIBILITY_RECEIPTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_asset_eligibility_receipts_no_delete` BEFORE DELETE ON `factory_asset_eligibility_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_ASSET_ELIGIBILITY_RECEIPTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_pixel_compositor_bindings_no_update` BEFORE UPDATE ON `factory_pixel_compositor_bindings` BEGIN SELECT RAISE(ABORT,'FACTORY_PIXEL_COMPOSITOR_BINDINGS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_pixel_compositor_bindings_no_delete` BEFORE DELETE ON `factory_pixel_compositor_bindings` BEGIN SELECT RAISE(ABORT,'FACTORY_PIXEL_COMPOSITOR_BINDINGS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_video_composition_jobs_no_update` BEFORE UPDATE ON `factory_video_composition_jobs` BEGIN SELECT RAISE(ABORT,'FACTORY_VIDEO_COMPOSITION_JOBS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_video_composition_jobs_no_delete` BEFORE DELETE ON `factory_video_composition_jobs` BEGIN SELECT RAISE(ABORT,'FACTORY_VIDEO_COMPOSITION_JOBS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_integrated_canary_receipts_no_update` BEFORE UPDATE ON `factory_integrated_canary_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_INTEGRATED_CANARY_RECEIPTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_integrated_canary_receipts_no_delete` BEFORE DELETE ON `factory_integrated_canary_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_INTEGRATED_CANARY_RECEIPTS_APPEND_ONLY'); END;
