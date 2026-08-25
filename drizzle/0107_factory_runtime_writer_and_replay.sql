CREATE TABLE `factory_runtime_streams` (
  `stream_type` text NOT NULL,
  `stream_id` text NOT NULL,
  `current_version` integer NOT NULL DEFAULT 0 CHECK (`current_version` >= 0),
  `current_state` text NOT NULL,
  `head_event_id` text,
  `head_evidence_hash` text CHECK (`head_evidence_hash` IS NULL OR length(`head_evidence_hash`) = 64),
  `active_stage_key` text,
  `active_lease_id` text,
  `active_fencing_token` integer CHECK (`active_fencing_token` IS NULL OR `active_fencing_token` > 0),
  `updated_at` text NOT NULL,
  PRIMARY KEY (`stream_type`,`stream_id`),
  FOREIGN KEY (`head_event_id`) REFERENCES `factory_runtime_events`(`id`)
);
--> statement-breakpoint
CREATE TABLE `factory_runtime_fence_counters` (
  `scope_id` text PRIMARY KEY NOT NULL,
  `next_token` integer NOT NULL CHECK (`next_token` > 0),
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `factory_runtime_leases` (
  `id` text PRIMARY KEY NOT NULL,
  `stream_type` text NOT NULL,
  `stream_id` text NOT NULL,
  `stage_key` text NOT NULL,
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('ACTIVE','RELEASED','ORPHANED','REVOKED')),
  `owner_type` text NOT NULL CHECK (`owner_type` IN ('OWNER','OPERATOR','SYSTEM','ASSURANCE')),
  `owner_id` text NOT NULL,
  `fencing_token` integer NOT NULL CHECK (`fencing_token` > 0),
  `acquired_at` text NOT NULL,
  `heartbeat_at` text NOT NULL,
  `expires_at` text NOT NULL,
  `released_at` text,
  `orphaned_at` text,
  `revoked_at` text,
  `idempotency_key` text NOT NULL,
  `intent_hash` text NOT NULL CHECK (length(`intent_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`stream_type`,`stream_id`) REFERENCES `factory_runtime_streams`(`stream_type`,`stream_id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_runtime_lease_idempotency_uq` ON `factory_runtime_leases` (`idempotency_key`);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_runtime_one_active_lease_uq` ON `factory_runtime_leases` (`stream_type`,`stream_id`) WHERE `lifecycle_state` = 'ACTIVE';
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_runtime_fencing_token_uq` ON `factory_runtime_leases` (`stream_type`,`stream_id`,`fencing_token`);
--> statement-breakpoint
CREATE INDEX `factory_runtime_lease_expiry_idx` ON `factory_runtime_leases` (`lifecycle_state`,`expires_at`);
--> statement-breakpoint
CREATE TABLE `factory_runtime_projection_checkpoints` (
  `id` text PRIMARY KEY NOT NULL,
  `stream_type` text NOT NULL,
  `stream_id` text NOT NULL,
  `stream_version` integer NOT NULL CHECK (`stream_version` > 0),
  `state` text NOT NULL,
  `head_event_id` text NOT NULL,
  `head_evidence_hash` text NOT NULL CHECK (length(`head_evidence_hash`) = 64),
  `projection_json` text NOT NULL CHECK (json_valid(`projection_json`)),
  `projection_hash` text NOT NULL CHECK (length(`projection_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`head_event_id`) REFERENCES `factory_runtime_events`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_runtime_projection_checkpoint_uq` ON `factory_runtime_projection_checkpoints` (`stream_type`,`stream_id`,`stream_version`);
--> statement-breakpoint
CREATE TABLE `factory_artifact_stale_projections` (
  `artifact_version_id` text PRIMARY KEY NOT NULL,
  `lifecycle_state` text NOT NULL CHECK (`lifecycle_state` IN ('CURRENT','STALE')),
  `projection_version` integer NOT NULL CHECK (`projection_version` > 0),
  `stale_event_id` text,
  `reason` text,
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `updated_at` text NOT NULL,
  FOREIGN KEY (`artifact_version_id`) REFERENCES `factory_artifact_versions`(`id`),
  FOREIGN KEY (`stale_event_id`) REFERENCES `factory_runtime_events`(`id`)
);
--> statement-breakpoint
CREATE TABLE `factory_dependency_projection_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `stale_event_id` text NOT NULL,
  `input_artifact_ids_json` text NOT NULL CHECK (json_valid(`input_artifact_ids_json`)),
  `stale_binding_ids_json` text NOT NULL CHECK (json_valid(`stale_binding_ids_json`)),
  `stale_artifact_version_ids_json` text NOT NULL CHECK (json_valid(`stale_artifact_version_ids_json`)),
  `input_hash` text NOT NULL CHECK (length(`input_hash`) = 64),
  `projection_hash` text NOT NULL CHECK (length(`projection_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`stale_event_id`) REFERENCES `factory_runtime_events`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_dependency_projection_event_uq` ON `factory_dependency_projection_receipts` (`stale_event_id`);
--> statement-breakpoint
CREATE TABLE `factory_runtime_replay_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `stream_type` text NOT NULL,
  `stream_id` text NOT NULL,
  `through_stream_version` integer NOT NULL CHECK (`through_stream_version` >= 0),
  `event_count` integer NOT NULL CHECK (`event_count` >= 0),
  `event_stream_hash` text NOT NULL CHECK (length(`event_stream_hash`) = 64),
  `derived_projection_hash` text NOT NULL CHECK (length(`derived_projection_hash`) = 64),
  `stored_projection_hash` text NOT NULL CHECK (length(`stored_projection_hash`) = 64),
  `verification_state` text NOT NULL CHECK (`verification_state` IN ('PASS','FAIL')),
  `failure_reasons_json` text NOT NULL CHECK (json_valid(`failure_reasons_json`)),
  `executor_version` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_runtime_replay_stream_hash_uq` ON `factory_runtime_replay_receipts` (`stream_type`,`stream_id`,`event_stream_hash`);
--> statement-breakpoint
CREATE TRIGGER `factory_runtime_fence_counter_no_delete` BEFORE DELETE ON `factory_runtime_fence_counters` BEGIN SELECT RAISE(ABORT, 'FACTORY_FENCE_COUNTER_DELETE_BLOCKED'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_runtime_fence_counter_monotonic` BEFORE UPDATE ON `factory_runtime_fence_counters`
WHEN NEW.`scope_id` <> OLD.`scope_id` OR NEW.`next_token` <= OLD.`next_token`
BEGIN SELECT RAISE(ABORT, 'FACTORY_FENCING_TOKEN_NOT_MONOTONIC'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_runtime_leases_identity_immutable` BEFORE UPDATE ON `factory_runtime_leases`
WHEN NEW.`id` <> OLD.`id`
  OR NEW.`stream_type` <> OLD.`stream_type`
  OR NEW.`stream_id` <> OLD.`stream_id`
  OR NEW.`stage_key` <> OLD.`stage_key`
  OR NEW.`owner_type` <> OLD.`owner_type`
  OR NEW.`owner_id` <> OLD.`owner_id`
  OR NEW.`fencing_token` <> OLD.`fencing_token`
  OR NEW.`acquired_at` <> OLD.`acquired_at`
  OR NEW.`idempotency_key` <> OLD.`idempotency_key`
  OR NEW.`intent_hash` <> OLD.`intent_hash`
BEGIN SELECT RAISE(ABORT, 'FACTORY_RUNTIME_LEASE_IDENTITY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_runtime_leases_no_delete` BEFORE DELETE ON `factory_runtime_leases` BEGIN SELECT RAISE(ABORT, 'FACTORY_RUNTIME_LEASE_DELETE_BLOCKED'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_runtime_stream_version_guard` BEFORE UPDATE ON `factory_runtime_streams`
WHEN NEW.`current_version` <> OLD.`current_version`
  AND NOT EXISTS (
    SELECT 1 FROM `factory_runtime_events`
    WHERE `stream_type` = NEW.`stream_type`
      AND `stream_id` = NEW.`stream_id`
      AND `stream_version` = NEW.`current_version`
  )
BEGIN SELECT RAISE(ABORT, 'FACTORY_STREAM_VERSION_REQUIRES_EVENT'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_runtime_streams_no_delete` BEFORE DELETE ON `factory_runtime_streams` BEGIN SELECT RAISE(ABORT, 'FACTORY_RUNTIME_STREAM_DELETE_BLOCKED'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_runtime_event_sequence_guard` BEFORE INSERT ON `factory_runtime_events`
WHEN NOT EXISTS (
  SELECT 1 FROM `factory_runtime_streams`
  WHERE `stream_type` = NEW.`stream_type`
    AND `stream_id` = NEW.`stream_id`
    AND `current_version` + 1 = NEW.`stream_version`
)
BEGIN SELECT RAISE(ABORT, 'FACTORY_RUNTIME_EVENT_VERSION_CONFLICT'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_runtime_event_fencing_guard` BEFORE INSERT ON `factory_runtime_events`
WHEN NEW.`event_type` IN ('CommandAccepted','WorkReserved','ArtifactMaterialized','ArtifactVerified','StageFrozen','DependencyStale','AssuranceStarted')
  AND NOT EXISTS (
    SELECT 1
    FROM `factory_runtime_leases` l
    JOIN `factory_runtime_streams` s
      ON s.`stream_type` = l.`stream_type` AND s.`stream_id` = l.`stream_id`
    WHERE l.`id` = NEW.`lease_id`
      AND l.`stream_type` = NEW.`stream_type`
      AND l.`stream_id` = NEW.`stream_id`
      AND l.`lifecycle_state` = 'ACTIVE'
      AND l.`fencing_token` = NEW.`fencing_token`
      AND l.`expires_at` > NEW.`occurred_at`
      AND s.`active_lease_id` = l.`id`
      AND s.`active_fencing_token` = l.`fencing_token`
  )
BEGIN SELECT RAISE(ABORT, 'FACTORY_STALE_OR_INVALID_FENCING_TOKEN'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_runtime_event_projects_stream` AFTER INSERT ON `factory_runtime_events`
BEGIN
  UPDATE `factory_runtime_streams`
  SET `current_version` = NEW.`stream_version`,
      `current_state` = CASE
        WHEN NEW.`event_type` IN ('CommandAccepted','CommandRejected') THEN `current_state`
        ELSE NEW.`event_type`
      END,
      `head_event_id` = NEW.`id`,
      `head_evidence_hash` = NEW.`evidence_hash`,
      `updated_at` = NEW.`occurred_at`
  WHERE `stream_type` = NEW.`stream_type` AND `stream_id` = NEW.`stream_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `factory_runtime_projection_checkpoints_no_update` BEFORE UPDATE ON `factory_runtime_projection_checkpoints` BEGIN SELECT RAISE(ABORT, 'FACTORY_PROJECTION_CHECKPOINT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_runtime_projection_checkpoints_no_delete` BEFORE DELETE ON `factory_runtime_projection_checkpoints` BEGIN SELECT RAISE(ABORT, 'FACTORY_PROJECTION_CHECKPOINT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_dependency_projection_receipts_no_update` BEFORE UPDATE ON `factory_dependency_projection_receipts` BEGIN SELECT RAISE(ABORT, 'FACTORY_DEPENDENCY_PROJECTION_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_dependency_projection_receipts_no_delete` BEFORE DELETE ON `factory_dependency_projection_receipts` BEGIN SELECT RAISE(ABORT, 'FACTORY_DEPENDENCY_PROJECTION_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_runtime_replay_receipts_no_update` BEFORE UPDATE ON `factory_runtime_replay_receipts` BEGIN SELECT RAISE(ABORT, 'FACTORY_RUNTIME_REPLAY_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_runtime_replay_receipts_no_delete` BEFORE DELETE ON `factory_runtime_replay_receipts` BEGIN SELECT RAISE(ABORT, 'FACTORY_RUNTIME_REPLAY_RECEIPT_IMMUTABLE'); END;
