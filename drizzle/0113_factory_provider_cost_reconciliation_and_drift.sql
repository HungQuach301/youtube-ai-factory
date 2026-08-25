CREATE TABLE `factory_provider_cost_reservations` (
  `id` text PRIMARY KEY NOT NULL,
  `work_request_id` text NOT NULL,
  `route_decision_id` text NOT NULL,
  `cost_envelope_id` text NOT NULL,
  `binding_id` text NOT NULL,
  `qualification_id` text NOT NULL,
  `idempotency_key` text NOT NULL,
  `reservation_intent_hash` text NOT NULL CHECK (length(`reservation_intent_hash`) = 64),
  `reserved_provider_requests` integer NOT NULL CHECK (`reserved_provider_requests` > 0),
  `reserved_spend_micros` integer NOT NULL CHECK (`reserved_spend_micros` > 0),
  `reservation_state` text NOT NULL CHECK (`reservation_state` = 'RESERVED'),
  `dispatch_authority` integer NOT NULL CHECK (`dispatch_authority` = 0),
  `r22_authority` integer NOT NULL CHECK (`r22_authority` = 0),
  `master_authority` integer NOT NULL CHECK (`master_authority` = 0),
  `release_authority` integer NOT NULL CHECK (`release_authority` = 0),
  `publication_authority` integer NOT NULL CHECK (`publication_authority` = 0),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`work_request_id`) REFERENCES `factory_provider_work_requests`(`id`),
  FOREIGN KEY (`route_decision_id`) REFERENCES `factory_provider_route_decisions`(`id`),
  FOREIGN KEY (`cost_envelope_id`) REFERENCES `factory_cost_envelopes`(`id`),
  FOREIGN KEY (`binding_id`) REFERENCES `factory_provider_bindings`(`id`),
  FOREIGN KEY (`qualification_id`) REFERENCES `factory_capability_qualifications`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_provider_cost_reservation_idempotency_uq` ON `factory_provider_cost_reservations` (`idempotency_key`);
--> statement-breakpoint
CREATE INDEX `factory_provider_cost_reservation_envelope_idx` ON `factory_provider_cost_reservations` (`cost_envelope_id`,`created_at`);
--> statement-breakpoint
CREATE TRIGGER `factory_provider_cost_reservation_budget_guard` BEFORE INSERT ON `factory_provider_cost_reservations`
BEGIN
  SELECT CASE WHEN
    COALESCE((SELECT SUM(`reserved_provider_requests`) FROM `factory_provider_cost_reservations` WHERE `cost_envelope_id` = NEW.`cost_envelope_id`),0) + NEW.`reserved_provider_requests`
      > (SELECT `max_provider_requests` FROM `factory_cost_envelopes` WHERE `id` = NEW.`cost_envelope_id` AND `lifecycle_state` = 'ACTIVE')
    OR
    COALESCE((SELECT SUM(`reserved_spend_micros`) FROM `factory_provider_cost_reservations` WHERE `cost_envelope_id` = NEW.`cost_envelope_id`),0) + NEW.`reserved_spend_micros`
      > (SELECT `max_spend_micros` FROM `factory_cost_envelopes` WHERE `id` = NEW.`cost_envelope_id` AND `lifecycle_state` = 'ACTIVE')
  THEN RAISE(ABORT,'FACTORY_PROVIDER_COST_ENVELOPE_EXCEEDED') END;
END;
--> statement-breakpoint
CREATE TABLE `factory_provider_native_request_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `reservation_id` text NOT NULL,
  `binding_id` text NOT NULL,
  `provider_id` text NOT NULL,
  `native_request_id` text,
  `provider_response_id` text,
  `request_fingerprint` text NOT NULL CHECK (length(`request_fingerprint`) = 64),
  `request_state` text NOT NULL CHECK (`request_state` IN ('NOT_DISPATCHED','UNKNOWN','SUCCEEDED','FAILED')),
  `raw_response_hash` text CHECK (`raw_response_hash` IS NULL OR length(`raw_response_hash`) = 64),
  `usage_json` text NOT NULL CHECK (json_valid(`usage_json`)),
  `actual_provider_requests` integer NOT NULL CHECK (`actual_provider_requests` >= 0),
  `actual_spend_micros` integer NOT NULL CHECK (`actual_spend_micros` >= 0),
  `retry_authority` integer NOT NULL CHECK (`retry_authority` = 0),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `observed_at` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`reservation_id`) REFERENCES `factory_provider_cost_reservations`(`id`),
  FOREIGN KEY (`binding_id`) REFERENCES `factory_provider_bindings`(`id`),
  FOREIGN KEY (`provider_id`) REFERENCES `factory_providers`(`id`),
  CHECK (`request_state` <> 'NOT_DISPATCHED' OR (`native_request_id` IS NULL AND `provider_response_id` IS NULL AND `raw_response_hash` IS NULL AND `actual_provider_requests` = 0 AND `actual_spend_micros` = 0)),
  CHECK (`request_state` = 'NOT_DISPATCHED' OR `native_request_id` IS NOT NULL)
);
--> statement-breakpoint
CREATE INDEX `factory_provider_native_request_reservation_fingerprint_idx` ON `factory_provider_native_request_receipts` (`reservation_id`,`request_fingerprint`,`observed_at`);
--> statement-breakpoint
CREATE INDEX `factory_provider_native_request_provider_id_idx` ON `factory_provider_native_request_receipts` (`provider_id`,`native_request_id`,`observed_at`) WHERE `native_request_id` IS NOT NULL;
--> statement-breakpoint
CREATE TABLE `factory_provider_reconciliation_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `reservation_id` text NOT NULL,
  `native_request_receipt_id` text NOT NULL,
  `reconciliation_key` text NOT NULL,
  `reconciliation_sequence` integer NOT NULL CHECK (`reconciliation_sequence` > 0),
  `outcome` text NOT NULL CHECK (`outcome` IN ('RELEASED_BEFORE_DISPATCH','UNKNOWN_SPEND_RESERVED','SETTLED','ACTUAL_EXCEEDS_RESERVATION')),
  `reserved_provider_requests` integer NOT NULL CHECK (`reserved_provider_requests` > 0),
  `reserved_spend_micros` integer NOT NULL CHECK (`reserved_spend_micros` > 0),
  `actual_provider_requests` integer NOT NULL CHECK (`actual_provider_requests` >= 0),
  `actual_spend_micros` integer NOT NULL CHECK (`actual_spend_micros` >= 0),
  `remaining_reserved_spend_micros` integer NOT NULL CHECK (`remaining_reserved_spend_micros` >= 0),
  `retry_authority` integer NOT NULL CHECK (`retry_authority` = 0),
  `dispatch_authority` integer NOT NULL CHECK (`dispatch_authority` = 0),
  `reconciliation_hash` text NOT NULL CHECK (length(`reconciliation_hash`) = 64),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`reservation_id`) REFERENCES `factory_provider_cost_reservations`(`id`),
  FOREIGN KEY (`native_request_receipt_id`) REFERENCES `factory_provider_native_request_receipts`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_provider_reconciliation_key_uq` ON `factory_provider_reconciliation_receipts` (`reconciliation_key`);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_provider_reconciliation_sequence_uq` ON `factory_provider_reconciliation_receipts` (`reservation_id`,`reconciliation_sequence`);
--> statement-breakpoint
CREATE TABLE `factory_provider_drift_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `binding_id` text NOT NULL,
  `qualification_id` text NOT NULL,
  `observation_key` text NOT NULL,
  `baseline_json` text NOT NULL CHECK (json_valid(`baseline_json`)),
  `observed_json` text NOT NULL CHECK (json_valid(`observed_json`)),
  `drift_dimensions_json` text NOT NULL CHECK (json_valid(`drift_dimensions_json`)),
  `drift_state` text NOT NULL CHECK (`drift_state` IN ('CURRENT','STALE')),
  `invalidates_qualification` integer NOT NULL CHECK (`invalidates_qualification` IN (0,1)),
  `dispatch_authority` integer NOT NULL CHECK (`dispatch_authority` = 0),
  `observation_hash` text NOT NULL CHECK (length(`observation_hash`) = 64),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `observed_at` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`binding_id`) REFERENCES `factory_provider_bindings`(`id`),
  FOREIGN KEY (`qualification_id`) REFERENCES `factory_capability_qualifications`(`id`),
  CHECK ((`drift_state` = 'CURRENT' AND `invalidates_qualification` = 0) OR (`drift_state` = 'STALE' AND `invalidates_qualification` = 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_provider_drift_observation_key_uq` ON `factory_provider_drift_receipts` (`observation_key`);
--> statement-breakpoint
CREATE INDEX `factory_provider_drift_binding_latest_idx` ON `factory_provider_drift_receipts` (`binding_id`,`observed_at`,`created_at`);
--> statement-breakpoint
CREATE TABLE `factory_provider_fallback_authorizations` (
  `id` text PRIMARY KEY NOT NULL,
  `primary_binding_id` text NOT NULL,
  `fallback_binding_id` text NOT NULL,
  `fallback_qualification_id` text NOT NULL,
  `authorization_key` text NOT NULL,
  `reason` text NOT NULL,
  `authorized_by` text NOT NULL,
  `authorization_state` text NOT NULL CHECK (`authorization_state` = 'APPROVED_PLAN_ONLY'),
  `max_provider_requests` integer NOT NULL CHECK (`max_provider_requests` > 0),
  `max_spend_micros` integer NOT NULL CHECK (`max_spend_micros` > 0),
  `one_time_plan` integer NOT NULL CHECK (`one_time_plan` = 1),
  `dispatch_authority` integer NOT NULL CHECK (`dispatch_authority` = 0),
  `r22_authority` integer NOT NULL CHECK (`r22_authority` = 0),
  `expires_at` text NOT NULL,
  `authorization_hash` text NOT NULL CHECK (length(`authorization_hash`) = 64),
  `evidence_hash` text NOT NULL CHECK (length(`evidence_hash`) = 64),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`primary_binding_id`) REFERENCES `factory_provider_bindings`(`id`),
  FOREIGN KEY (`fallback_binding_id`) REFERENCES `factory_provider_bindings`(`id`),
  FOREIGN KEY (`fallback_qualification_id`) REFERENCES `factory_capability_qualifications`(`id`),
  CHECK (`primary_binding_id` <> `fallback_binding_id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factory_provider_fallback_authorization_key_uq` ON `factory_provider_fallback_authorizations` (`authorization_key`);
--> statement-breakpoint
CREATE TRIGGER `factory_provider_cost_reservations_no_update` BEFORE UPDATE ON `factory_provider_cost_reservations` BEGIN SELECT RAISE(ABORT,'FACTORY_PROVIDER_COST_RESERVATIONS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_provider_cost_reservations_no_delete` BEFORE DELETE ON `factory_provider_cost_reservations` BEGIN SELECT RAISE(ABORT,'FACTORY_PROVIDER_COST_RESERVATIONS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_provider_native_request_receipts_no_update` BEFORE UPDATE ON `factory_provider_native_request_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_PROVIDER_NATIVE_REQUEST_RECEIPTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_provider_native_request_receipts_no_delete` BEFORE DELETE ON `factory_provider_native_request_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_PROVIDER_NATIVE_REQUEST_RECEIPTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_provider_reconciliation_receipts_no_update` BEFORE UPDATE ON `factory_provider_reconciliation_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_PROVIDER_RECONCILIATION_RECEIPTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_provider_reconciliation_receipts_no_delete` BEFORE DELETE ON `factory_provider_reconciliation_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_PROVIDER_RECONCILIATION_RECEIPTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_provider_drift_receipts_no_update` BEFORE UPDATE ON `factory_provider_drift_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_PROVIDER_DRIFT_RECEIPTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_provider_drift_receipts_no_delete` BEFORE DELETE ON `factory_provider_drift_receipts` BEGIN SELECT RAISE(ABORT,'FACTORY_PROVIDER_DRIFT_RECEIPTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_provider_fallback_authorizations_no_update` BEFORE UPDATE ON `factory_provider_fallback_authorizations` BEGIN SELECT RAISE(ABORT,'FACTORY_PROVIDER_FALLBACK_AUTHORIZATIONS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER `factory_provider_fallback_authorizations_no_delete` BEFORE DELETE ON `factory_provider_fallback_authorizations` BEGIN SELECT RAISE(ABORT,'FACTORY_PROVIDER_FALLBACK_AUTHORIZATIONS_APPEND_ONLY'); END;
