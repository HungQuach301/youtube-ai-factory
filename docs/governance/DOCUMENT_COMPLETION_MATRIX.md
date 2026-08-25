# Document Completion Matrix

**State:** `ACTIVE_CURRENT_STATE`
**Effective:** 2026-08-25

This matrix records where each approved concern is canonical. It prevents a chat answer or pasted design note from becoming an unindexed parallel specification.

| Concern | Canonical document | Status |
|---|---|---|
| Product boundary and operating planes | `docs/architecture/TARGET_OPERATING_ARCHITECTURE.md` | Complete for design |
| Business capabilities, decision rights, AI/owner/provider operating model, exceptions, economics and portfolio arbitration | `docs/architecture/BUSINESS_OPERATING_MODEL.md` | Complete for design; operational implementation pending |
| Runtime planes, services, state/events, timebase, fencing, observability/replay and UI architecture | `docs/architecture/TECHNICAL_RUNTIME_ARCHITECTURE.md` | Contract/timebase foundation implemented; service integration pending |
| Factory/Channel/Format/Video/Sequence/Shot hierarchy | `docs/architecture/VISUAL_PRODUCTION_OPERATING_MODEL.md` | Complete for design |
| Visual taxonomy, SOURCE/MAKE/HYBRID and `Reality -> Mechanism -> Proof` | `docs/architecture/VISUAL_PRODUCTION_OPERATING_MODEL.md` | Complete for design |
| Blueprint, Shot Contract, Scene Graph and canonical timebase | `docs/architecture/VISUAL_PRODUCTION_OPERATING_MODEL.md` | Schema and deterministic timebase foundation implemented; compilers/render pending |
| AI-first L0-L7 acceptance and four outcomes | `docs/architecture/AI_FIRST_PRODUCTION_ASSURANCE.md` | Complete for design; calibration pending |
| Judge qualification, receipts, cost and Factory QA Cockpit | `docs/architecture/AI_FIRST_PRODUCTION_ASSURANCE.md` | Complete for design; implementation pending |
| Data domains, entities, lineage and D1/R2/Drive authority | `docs/architecture/DATA_AND_PROVIDER_CONTROL_PLANE.md` | Core planning/event/dependency entities implemented; remaining runtime integration pending |
| Provider Gateway, bindings, lifecycle, retry and drift | `docs/architecture/DATA_AND_PROVIDER_CONTROL_PLANE.md` | Complete for design; implementation pending |
| Hidden Systems US/en-US Visual DNA | `docs/continuity/80_HIDDEN_SYSTEMS_VISUAL_DNA_AND_R22_BLUEPRINT.md` | Complete for channel design |
| R22 phase-distinct repair blueprint and canary gate | `docs/continuity/80_HIDDEN_SYSTEMS_VISUAL_DNA_AND_R22_BLUEPRINT.md` | Complete for bounded design; dispatch blocked |
| Unified quality, accessibility, localization and release floors | `docs/continuity/81_VIDEO_PRODUCTION_QUALITY_STANDARD_V3.md` | Active for new production |
| E2E production workflow, DoR, self-check, independent gate, failure owner and handoff | `docs/architecture/E2E_PRODUCTION_GATE_MODEL.md` | Complete for design; implementation pending |
| Full pre-acceptance gate chain and separate release/publication gates | `docs/architecture/E2E_PRODUCTION_GATE_MODEL.md` | Complete for design; implementation pending |
| Diagrams, Sankey, maps, timelines, ledgers, transformations, charts, topology, documentary footage, transitions and motion | `docs/architecture/VISUAL_MOTION_TECHNIQUE_PLAYBOOK.md` | Complete for design; capability qualification pending |
| Multi-channel isolation, experiment validity, learning promotion, scaling and rollback | `docs/architecture/MULTI_CHANNEL_SCALE_AND_LEARNING.md` | Complete for design; implementation/calibration pending |
| Privacy/secrets, Content ID, drift, retention/deletion, SLA/capacity, DR, accessibility/localization and incident containment | `docs/governance/CROSS_CUTTING_CONTROL_STANDARD.md` | Complete for design; enforcement/exercises pending |
| Current R21/R22 runtime truth | `docs/continuity/03_CURRENT_STATE.md` | Reconciled; detailed execution evidence archived |
| Decisions and supersession | `docs/continuity/04_DECISION_LOG.md` | Active ADR-123 through ADR-134 recorded; prior decisions archived |
| Risks and open implementation work | `docs/governance/MASTER_ISSUE_REGISTRY.md` | Current open issues only; closed history archived |
| Implementation sequence | `docs/roadmap/MASTER_ROADMAP.md` | Active Phases 44-48 only; prior roadmap archived |
| Repository SSOT | `docs/governance/REPOSITORY_SOURCE_OF_TRUTH.md` | Active |
| Sites/GitHub SSOT, initial migration, divergence and recovery | `docs/governance/REPOSITORY_SYNC_AND_RECOVERY.md` | Complete; exact-SHA synchronization verified |
| New-chat handoff | `docs/continuity/09_CHAT_ROLLOVER_CAPSULE.md` | Updated |
| Historical plans, execution evidence, diagnostics and snapshots | `docs/archive/README.md` | Read-only; no current authority |

## Not completed by documentation alone

- Phase 45 command/event writers, projections, compilers and runtime integration beyond migration `0106`.
- Visual Grammar Resolver, Provider Gateway, Evidence Lineage and AI Assurance Orchestrator.
- Factory QA Cockpit and UI integration.
- Judge/provider capability qualification.
- R22 provider dispatch, master, QA, Browser, owner freeze, release or publication.

These items remain roadmap work and cannot be described as implemented because their architecture is documented.
