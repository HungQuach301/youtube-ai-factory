# Active Decision Log

**State:** `ACTIVE_NORMATIVE_DECISIONS`  
**Effective:** 2026-08-25

Only decisions that govern current and next work remain here. ADR-001 through ADR-122 are preserved in [`../archive/snapshots/04_DECISION_LOG.md`](../archive/snapshots/04_DECISION_LOG.md) and have no authority where they conflict with this log, current state or runtime evidence.

| ADR | Active decision |
|---|---|
| ADR-123 | `VISUAL_PRODUCTION_OPERATING_MODEL_V1`: Factory/Channel/Format/Video/Shot ownership, typed visual jobs, SOURCE/MAKE/HYBRID, candidate tournament, one timebase and code-native Scene Graph. |
| ADR-124 | `AI_FIRST_PRODUCTION_ASSURANCE_V1`: L0-L7 exact-artifact assurance with `AI_ACCEPTED`, `CONTENT_REJECTED`, `HUMAN_ESCALATION_REQUIRED` and `ASSURANCE_INCOMPLETE`; PASS requires qualification. |
| ADR-125 | `DATA_PROVIDER_CONTROL_PLANE_V1`: Git/D1/R2/Drive authority and centralized Provider Gateway for secrets, rights, budget, idempotency, responses and reconciliation. |
| ADR-126 | `VIDEO_PRODUCTION_QUALITY_STANDARD_V3`: governs new production without rewriting V2 or prior receipts. |
| ADR-127 | `DUAL_REMOTE_SINGLE_COMMIT_SSOT_V1`: Sites and the new personal GitHub repo mirror one exact commit; `youtube-ai-factory-v2` is excluded. |
| ADR-128 | `FACTORY_BUSINESS_OPERATING_MODEL_V1`: explicit capability, decision-right, exception, economics and portfolio contracts. |
| ADR-129 | `FACTORY_TECHNICAL_RUNTIME_ARCHITECTURE_V1`: typed events, canonical timebase, worker fencing, one projection truth and evidence-bound replay. |
| ADR-130 | `E2E_PRODUCTION_GATE_MODEL_V1`: every stage has DoR, self-check, independent gate, failure owner and typed handoff; release and publication are separate. |
| ADR-131 | `VISUAL_MOTION_TECHNIQUE_PLAYBOOK_V1`: technique-specific semantic, construction, motion, mobile, accessibility and localization contracts. |
| ADR-132 | `MULTI_CHANNEL_SCALE_AND_LEARNING_V1`: channel isolation and version promotion only from valid minimum evidence; no single-video learning authority. |
| ADR-133 | `CROSS_CUTTING_CONTROL_STANDARD_V1`: privacy, Content ID, drift, retention, SLA, DR, accessibility, localization and incident controls cannot be weakened locally. |
| ADR-134 | `ACTIVE_DOCS_AND_ARCHIVE_BOUNDARY_V1`: only the active index is ordinary development authority; superseded plans, execution records and old snapshots move to a read-only archive while Git history preserves recovery. |
| ADR-135 | `INITIAL_GITHUB_MIRROR_MIGRATION_COMPLETE_V1`: the private personal repo contains the complete canonical Sites history; exact common baseline `2431a800…` was verified, bootstrap artifacts were removed from `main`, and future divergence is `SYNC_BLOCKED`. |
| ADR-136 | `FACTORY_RUNTIME_CONTRACT_FOUNDATION_V1`: new Production planning uses immutable Factory-wide contracts and integer canonical timebase rather than renderer-revision tables; status changes are events, upstream changes append dependency invalidations, and migration `0106` grants no provider, R22 or release authority. |
| ADR-137 | `BOUNDED_DUAL_REMOTE_RECONCILIATION_V1`: when the GitHub API canonicalizes an identical Sites source tree under a different commit identity, preserve the displaced Sites tip on an explicit recovery branch, verify identical tree bytes, and permit one exact-old-SHA `force-with-lease` update of Sites `main`; this receipt grants no standing force-push authority. |
| ADR-138 | `CANONICAL_RUNTIME_SINGLE_WRITER_V1`: all new Factory stream mutation passes through one append-only command/event writer with optimistic expected version/state, exclusive expiring lease, monotonic fencing, persisted rejection, projection checkpoint and exact replay receipt. The public route is SIWC/allowlist protected, disabled by default, zero-spend and R22-blocked until separately authorized. |

## Shared decision constraints

- Hard factual, rights, safety, exact-byte and P0/P1 failures cannot be overridden to PASS.
- Infrastructure observation failure is `ASSURANCE_INCOMPLETE`, not content rejection.
- Repair routes to one root owner and at most one bounded append-only root revision before escalation.
- R21 remains immutable; R22 remains undispatched until implementation and qualification gates pass.
- Publication, destructive historical deletion and hard-gate weakening require separate explicit authority.
