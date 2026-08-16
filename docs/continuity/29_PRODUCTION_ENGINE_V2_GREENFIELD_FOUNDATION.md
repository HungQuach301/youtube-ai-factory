# Production Engine V2 — Greenfield Foundation

Status: **superseded for release on 2026-08-16**. All four checkpoints remain immutable historical execution evidence, but the owner rejected all 15 masters for poor perceived quality. Their package state is `REJECTED_QUALITY`; none may be published, reused or treated as a quality reference. Document 30 defines the active V7 → V23.4 → V281 sequential rebuild.

## Authority and protected scope

The owner authorized Production Engine V2 implementation, production deployment and bounded paid-provider use. Production execution authority is represented by a separate V2 policy and does not inherit from Channel Strategy or Content Planning. Automatic publishing remains false.

Production Engine V2 consumes only the latest canonical Content Planning V2 briefs. It must not import legacy engine modules, query legacy production tables, bind legacy media, use legacy templates or treat historical QA as release evidence.

## Checkpoint 1 contract

- Engine namespace: `PRODUCTION_ENGINE_V2_GREENFIELD`.
- Policy: full autopilot; USD 25 daily, USD 500 monthly and USD 40 per-video ceilings; one bounded repair; automatic publishing disabled.
- Exact input: 15 canonical production briefs.
- Output: 15 immutable production packages and 75 typed initial shot contracts.
- Every contract owns claim, evidence references, SOURCE/MAKE/HYBRID route, required/prohibited evidence and ENTRY/MIDPOINT/EXIT states.
- Legacy source count, provider requests and actual spend must all be zero.
- Four scale waves are recorded as pilot 1, then 2/4/8; only the pilot is eligible after foundation closure.

## Technical controls

- Append-only D1 schema for policies, packages, contracts, jobs, artifacts, provider requests, QA assessments, bounded repairs, scale waves and audits.
- Static legacy dependency firewall runs during every verified build.
- Projection is fail-closed, no-store and derived only from canonical D1 state.
- Owner UI has Overview, Production packages, Quality & exceptions, Cost & activity and System details.
- Provider request, usage and actual cost require terminal reconciliation before the next unit advances.

## Acceptance

- Full migration chain applies cleanly.
- Production Engine V2 schema contains ten isolated tables.
- Commercial UI contract and control-plane regression include the new route, page, exact-coverage rules and publishing separation.
- Agent preview route and navigation render; canonical data remains fail-closed when the local D1 simulator is not initialized. This preview limitation cannot substitute for production D1 read-back.

## Production closure evidence

- Checkpoint 1 — Greenfield foundation: 15 immutable packages, 75/75 valid contracts, complete traceability, zero legacy code/artifact bindings and a zero-spend foundation audit.
- Checkpoint 2 — Golden pilot: the 30-second, ten-shot motion proof passed technical and perceptual admission before full-video work opened.
- Checkpoint 3 — Full-video canary: episode 1 passed QA1, independent visual review and QA2 before scale waves opened.
- Checkpoint 4 — Controlled scale: wave counts 2/4/8 all completed; all 15 twelve-minute masters are `READY_FOR_PUBLISHING`; every package has a three-frame visual sample and an OpenAI independent visual PASS with P0=0/P1=0.
- Artifact read-back: all 15 master endpoints returned HTTP 200, `video/webm`, a size above 1 MB and a 64-character SHA-256 header. The latest master sizes range from 31,526,666 to 54,583,469 bytes.
- Ledger reconciliation: 99 provider attempts, 10 failed/reconciled attempts retained for audit, zero active requests, USD 79.28 actual spend, zero open owner exceptions and zero legacy sources.
- Publishing boundary: `auto_publish=false`; QA readiness never mutates publishing state.

## Quality incident and permanent controls

Independent visual QA blocked episode 9 because the generated heading “What the Network Earns For” was incomplete. The scene was corrected to “What the Network Earns”, a new immutable master revision was rendered, and QA1 + visual QA + QA2 were rerun successfully. The rejected evidence remains preserved.

The production path now has retry-safe provider idempotency, replay-safe QA assessments and audits, immutable artifact revisions when bytes change, a typed stale-provider reconciliation command, and checkpoint-4 logic that cannot complete until all 15 visual reviews pass with P0=0/P1=0.

## Exact next action

Owner publishing review is the only downstream action. Production packages are complete and safe to inspect; publishing remains deliberately manual and outside Production Engine V2 authority.
