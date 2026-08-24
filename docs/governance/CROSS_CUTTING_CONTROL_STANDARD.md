# Cross-Cutting Control Standard

**State:** `ACTIVE_NORMATIVE__IMPLEMENTATION_REQUIRED`  
**Policy:** `CROSS_CUTTING_CONTROL_STANDARD_V1`  
**Effective:** 2026-08-24

## Purpose

These controls apply across every Factory, channel, format, video, provider, artifact and environment. A local stage policy may tighten them but cannot weaken them.

## Control registry

| Control | Mandatory rule | Failure disposition |
|---|---|---|
| Privacy and secret isolation | Connections are scoped, least-privileged, server-only and redacted; PII/private provenance has purpose, consent and retention class | Block dispatch; contain and rotate on exposure |
| Rights and Content ID | Every asset/voice/music/SFX has exact rights receipt, commercial scope, territory, term and Content ID behavior | `CONTENT_REJECTED` or legal escalation; unknown fails closed |
| Provider/model drift | Model, endpoint, terms, prompt, rubric, schema and sampler versions are monitored; material drift makes qualification/cache stale | Pause binding; requalify or use explicit qualified fallback |
| Retention and deletion | Data classes define minimum/maximum retention, legal hold, archive and deletion authority; deletion produces tombstone/audit receipt | Block unauthorized deletion; quarantine overdue unknown data |
| Latency, SLA and capacity | Capability SLO, timeout, queue ceiling, concurrency, reservation and degraded-mode policy are versioned | Pause admission, preserve active work and expose breach |
| Disaster recovery | Git, D1, R2 and recovery archive have separate tested restore procedures, checksums, RPO/RTO and owner | `ASSURANCE_INCOMPLETE` until recovered/read back |
| Accessibility | Captions, contrast, non-color encoding, readable mobile type and safe motion are checked under active standard | Hard fail where meaning/safety is lost; otherwise routed defect |
| Localization | Locale contract controls language, voice, dates, currency, units, typography and legal context | New locale artifact/version and re-assurance required |
| Taxonomy/version governance | Schemas, policies, rubrics, prompts, capability names and Visual DNA are immutable/versioned with supersession | Reject unknown/unversioned input; stale dependents |
| Experiment validity | Hypothesis, prediction, window, sample, confounders and stopping rule precede promotion | Advisory only; no automated promotion |
| Learning evidence | Minimum independent evidence and no unresolved P0/P1, drift or rights issue | Candidate remains unpromoted |
| Rollback and incident containment | Exact scope, dependency graph, kill switch, prior version and recovery verification are recorded | Pause affected scope; expand only with shared-dependency evidence |

## Data classification and retention

Minimum classes are `PUBLIC_SOURCE`, `LICENSED_MEDIA`, `PRIVATE_CHANNEL`, `PERSONAL/CONSENT`, `SECRET`, `RAW_PROVIDER_RESPONSE`, `OPERATIONAL_RECEIPT` and `IMMUTABLE_PRODUCTION_EVIDENCE`. Each binding declares storage locations, encryption/access, provider retention, recovery eligibility and deletion authority. Secrets never enter Git, receipts, raw prompts intended for retention, browser screenshots or client logs.

Deletion does not rewrite append-only financial, rights, audit or acceptance history. When bytes must be removed, the ledger retains a non-sensitive tombstone, hash where lawful, reason, actor and affected dependency state.

## Rights and synthetic-media controls

- Search availability is not a license; download is not Production eligibility.
- Music/SFX selection records composition/master rights, subscription/purchase evidence and expected Content ID behavior.
- Voice use records voice identity, consent/entitlement, model and settings.
- Synthetic media is labeled in lineage and cannot impersonate source evidence or a real person's endorsement.
- Rights/terms changes invalidate future eligibility and trigger review of affected unreleased work; published incident handling follows legal policy.

## Reliability and disaster recovery

Capability policies define target availability/latency, queue and spend limits, retry ceiling, RPO/RTO and fallback. An outage never becomes a content defect. Unknown dispatch/spend remains reserved until provider reconciliation. Recovery proves database projection, object checksums, exact master/receipt linkage and remote Git identity before write authority resumes.

At least one periodic exercise covers: loss of one storage copy, stale worker, provider outage, corrupted derivative, secret exposure, D1 restore, Git remote divergence and channel-level rollback. Results create immutable incident/test evidence and remediation owners.

## Incident containment

Classify the root scope as asset, video, channel, provider binding, shared capability or Factory. Stop admission and revoke affected leases/bindings; preserve evidence and active-provider identity; reconcile spend; identify all dependents; then repair once or roll back. Repeated repair loops, silent fallback and hard-gate weakening are prohibited.

## Governance and audit

The Standard Registry owns thresholds and supersession. Factual safety and semantic alignment inherit their active floors; this document creates no parallel score set. Every exception records authority, expiration and compensating controls. Audit samples include false-clean rate, rights completeness, stale qualification use, deletion correctness, recovery success, accessibility/localization failures and cross-channel leakage.

## Current boundary

These controls are normative for new design. Runtime enforcement and recovery exercises remain required before R22 dispatch or autonomous Production authority.
