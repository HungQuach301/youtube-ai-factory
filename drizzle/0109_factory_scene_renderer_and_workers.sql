CREATE TABLE `factory_render_worker_bindings` (
  `id` text PRIMARY KEY NOT NULL,
  `provider_binding_id` text NOT NULL,
  `qualification_id` text NOT NULL,
  `worker_key` text NOT NULL,
  `worker_version` text NOT NULL,
  `renderer_version` text NOT NULL,
  `input_schema_hash` text NOT NULL CHECK (length(`input_schema_hash`) = 64),
  `output_schema_hash` text NOT NULL CHECK (length(`output_schema_hash`) = 64),
  `settings_hash` text NOT NULL CHECK (length(`settings_hash`) = 64),
  `max_frames_per_job` integer NOT NULL CHECK (`max_frames_per_job` BETWEEN 1 AND 18000),
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('ACTIVE','SUSPENDED','REVOKED')),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`provider_binding_id`) REFERENCES `factory_provider_bindings`(`id`),
  FOREIGN KEY (`qualification_id`) REFERENCES `factory_capability_qualifications`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_render_worker_version_uq` ON `factory_render_worker_bindings` (`worker_key`,`worker_version`,`settings_hash`);
--> statement-breakpoint
CREATE INDEX `factory_render_worker_route_idx` ON `factory_render_worker_bindings` (`lifecycle_state`,`renderer_version`);
--> statement-breakpoint
CREATE TABLE `factory_scene_render_jobs` (
  `id` text PRIMARY KEY NOT NULL,
  `video_id` text NOT NULL,
  `scene_graph_id` text NOT NULL,
  `worker_binding_id` text NOT NULL,
  `lease_id` text NOT NULL,
  `fencing_token` integer NOT NULL CHECK (`fencing_token` > 0),
  `frame_start` integer NOT NULL CHECK (`frame_start` >= 0),
  `frame_end_exclusive` integer NOT NULL CHECK (`frame_end_exclusive` > `frame_start`),
  `input_hash` text NOT NULL CHECK (length(`input_hash`) = 64),
  `render_program_hash` text NOT NULL CHECK (length(`render_program_hash`) = 64),
  `output_hash` text NOT NULL CHECK (length(`output_hash`) = 64),
  `idempotency_key` text NOT NULL,
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` = 'MATERIALIZED'),
  `provider_requests` integer NOT NULL CHECK (`provider_requests` = 0),
  `spend_micros` integer NOT NULL CHECK (`spend_micros` = 0),
  `command_id` text NOT NULL,
  `event_id` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`scene_graph_id`) REFERENCES `factory_scene_graphs`(`id`),
  FOREIGN KEY (`worker_binding_id`) REFERENCES `factory_render_worker_bindings`(`id`),
  FOREIGN KEY (`lease_id`) REFERENCES `factory_runtime_leases`(`id`),
  FOREIGN KEY (`command_id`) REFERENCES `factory_runtime_commands`(`id`),
  FOREIGN KEY (`event_id`) REFERENCES `factory_runtime_events`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_scene_render_job_idempotency_uq` ON `factory_scene_render_jobs` (`idempotency_key`);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_scene_render_job_output_uq` ON `factory_scene_render_jobs` (`scene_graph_id`,`worker_binding_id`,`frame_start`,`frame_end_exclusive`,`output_hash`);
--> statement-breakpoint
CREATE TABLE `factory_scene_render_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `render_job_id` text NOT NULL,
  `artifact_version_id` text NOT NULL,
  `renderer_version` text NOT NULL,
  `storage_key` text NOT NULL,
  `mime_type` text NOT NULL CHECK (`mime_type` = 'application/vnd.youtube-ai-factory.render-tape+json'),
  `byte_size` integer NOT NULL CHECK (`byte_size` > 0),
  `output_hash` text NOT NULL CHECK (length(`output_hash`) = 64),
  `readback_hash` text NOT NULL CHECK (length(`readback_hash`) = 64),
  `deterministic_replay_hash` text NOT NULL CHECK (length(`deterministic_replay_hash`) = 64),
  `verification_state` text NOT NULL CHECK (`verification_state` = 'PASS'),
  `zero_dispatch` integer NOT NULL CHECK (`zero_dispatch` = 1),
  `provider_requests` integer NOT NULL CHECK (`provider_requests` = 0),
  `spend_micros` integer NOT NULL CHECK (`spend_micros` = 0),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`render_job_id`) REFERENCES `factory_scene_render_jobs`(`id`),
  FOREIGN KEY (`artifact_version_id`) REFERENCES `factory_artifact_versions`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_scene_render_receipt_job_uq` ON `factory_scene_render_receipts` (`render_job_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_scene_render_receipt_artifact_uq` ON `factory_scene_render_receipts` (`artifact_version_id`);
--> statement-breakpoint
CREATE TRIGGER `factory_render_worker_bindings_no_update` BEFORE UPDATE ON `factory_render_worker_bindings` BEGIN SELECT RAISE(ABORT,'FACTORY_RENDER_WORKER_BINDINGS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_render_worker_bindings_no_delete` BEFORE DELETE ON `factory_render_worker_bindings` BEGIN SELECT RAISE(ABORT,'FACTORY_RENDER_WORKER_BINDINGS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_scene_render_jobs_no_update` BEFORE UPDATE ON `factory_scene_render_jobs` BEGIN SELECT RAISE(ABORT,'FACTORY_SCENE_RENDER_JOBS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_scene_render_jobs_no_delete` BEFORE DELETE ON `factory_scene_render_jobs` BEGIN SELECT RAISE(ABORT,'FACTORY_SCENE_RENDER_JOBS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_scene_render_receipts_no_update` BEFORE UPDATE ON `factory_scene_render_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_SCENE_RENDER_RECEIPTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_scene_render_receipts_no_delete` BEFORE DELETE ON `factory_scene_render_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_SCENE_RENDER_RECEIPTS_APPEND_ONLY'); END;
