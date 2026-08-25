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
| ADR-139 | `CONCURRENT_GITHUB_TIP_FORWARD_RECONCILIATION_V1`: concurrent merge `03434774…` is retained as a parent for audit but its older source tree and statement that Phase 45 belongs to V2 are non-normative. Reconciliation must use a forward merge with the reviewed canonical tree, never force-push; `youtube-ai-factory-v2` remains excluded. |
| ADR-140 | `ZERO_DISPATCH_PROVIDER_GATEWAY_AND_COMPILER_V1`: typed provider planning may select only an exact active, healthy, rights-eligible, qualified binding and must record zero requests/spend; automatic fallback and dispatch are disabled. Frozen Visual Profile/Format plus one canonical timebase compile deterministically into Blueprint, full-coverage Shot Contracts and Scene Graph, with all records committed atomically through the fenced writer and no renderer-revision branching. |
| ADR-141 | `FORWARD_ONLY_EXACT_OBJECT_SYNC_V1`: the one-time exact-history replacement and temporary workflow authority are exhausted at `3d752ad…`. Later checkpoints create one forward GitHub commit from the verified common parent, recreate the same commit object in Sites from its exact tree/message/identity/timestamp, require SHA equality before moving Sites `main`, and never use merge, rebase, amend or force to conceal divergence. |
| ADR-142 | `DETERMINISTIC_RENDER_TAPE_WORKER_V1`: qualified internal workers render exact canonical per-frame semantic operation tapes through the active lease/fence, verify content-addressed R2 bytes and commit append-only artifact/job/lineage receipts through the single writer. Missing SOURCE/HYBRID assets, stale settings/qualification or stale fences fail closed; render-tape PASS does not imply pixel/video, canary, master, assurance or R22 authority. |
| ADR-143 | `ASSET_QUALIFIED_PIXEL_CANARY_ADMISSION_V1`: SOURCE/HYBRID inputs require an exact artifact read-back plus current commercial-rights receipt before composition. A qualified fenced compositor may record a 60-90 second VP9 canary only when the exact render tape, every asset, full frame coverage, worker/settings version, encoded bytes, deterministic replay hash and entry/midpoint/exit decoded pixels reconcile. Local fixture PASS proves the executor path only; live canary, R22, master and assurance authority remain separate. |
| ADR-144 | `BOUNDED_LIVE_CANARY_RECOVERY_QUALIFICATION_V1`: one fixed non-R22 runner may stage only the frozen exact VP9/PNG/SVG fixture, exercise canonical compiler/render/rights/compositor effects, release its successful fence, reconcile one controlled expired lease and verify exact replay on both streams. One append-only receipt binds all evidence. The runner is separately disabled, zero-spend, idempotent and cannot name or authorize R22, master, assurance, release or publication. |
| ADR-145 | `HIDDEN_SYSTEMS_PRODUCTION_SCALE_TREATMENT_QUALIFICATION_V1`: a frozen ten-case corpus qualifies exact 1920×1080/30fps compositor settings and distinct SOURCE/MAKE/HYBRID treatment/asset-preparation contracts through entry/mutation/exit decoded evidence, mobile/accessibility floors, anti-slide rules and deterministic replay. The append-only package has `INTERNAL_TREATMENT_QUALIFICATION_ONLY` authority; every R22, master, release and publication authority bit is structurally zero. |
| ADR-146 | `BOUNDED_LIVE_HIDDEN_SYSTEMS_TREATMENT_QUALIFICATION_V1`: exactly one owner-authorized v531 live request may store the frozen package and ten case receipts, verify exact R2/D1 read-back and reconcile the same payload as `IDEMPOTENT_REPLAY`. Its writer/qualification flags and credential must be removed immediately and the same source redeployed; the completed receipt grants no reusable runtime, provider, R22, master, release or publication authority. |

## Shared decision constraints

- Hard factual, rights, safety, exact-byte and P0/P1 failures cannot be overridden to PASS.
- Infrastructure observation failure is `ASSURANCE_INCOMPLETE`, not content rejection.
- Repair routes to one root owner and at most one bounded append-only root revision before escalation.
- R21 remains immutable; R22 remains undispatched until implementation and qualification gates pass.
- Publication, destructive historical deletion and hard-gate weakening require separate explicit authority.
