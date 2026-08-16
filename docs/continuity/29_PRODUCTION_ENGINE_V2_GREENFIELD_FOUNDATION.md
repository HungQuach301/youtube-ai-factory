# Production Engine V2 — Greenfield Foundation

Status: checkpoint 1 implemented; production deployment and D1 read-back required for closure.

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

## Exact next action

Deploy checkpoint 1, verify deployment success, read production V2 tables and API projection, and close only when production reports 15 packages, 75 valid contracts, zero legacy bindings, zero provider requests and USD 0 actual spend. Then implement the separately bounded golden-pilot execution service.
