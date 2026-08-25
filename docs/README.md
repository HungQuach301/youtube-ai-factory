# AI Factory Knowledge Base

This directory is the active knowledge source for YouTube AI Factory. Git `main` owns code, contracts, policies, current state and implementation truth. Chat transcripts, Drive, Library, screenshots and local files cannot override it.

## Repository identity

```text
repository: youtube-ai-factory
branch: main
Sites mirror: origin/main
personal GitHub mirror: github/main (HungQuach301/youtube-ai-factory)
policy: GIT_REPOSITORY_SSOT_V1 + DUAL_REMOTE_SINGLE_COMMIT_SSOT_V1
excluded: HungQuach301/youtube-ai-factory-v2
```

The private personal GitHub repository is connected and synchronized with the complete Sites Git history. Repository state is `SYNCHRONIZED`; every later material checkpoint must restore and prove exact SHA equality across local `HEAD`, `origin/main` and `github/main`.

## Required reading order

1. [`../AGENTS.md`](../AGENTS.md)
2. [`governance/REPOSITORY_SOURCE_OF_TRUTH.md`](governance/REPOSITORY_SOURCE_OF_TRUTH.md)
3. [`continuity/03_CURRENT_STATE.md`](continuity/03_CURRENT_STATE.md)
4. [`governance/MASTER_ISSUE_REGISTRY.md`](governance/MASTER_ISSUE_REGISTRY.md)
5. [`roadmap/MASTER_ROADMAP.md`](roadmap/MASTER_ROADMAP.md)
6. Only the active architecture documents named by the current roadmap phase.

Do not read `docs/archive` as current authority. Use it only when investigating history, incidents or exact prior evidence.

## Active canonical documents

| Concern | Canonical document |
|---|---|
| Product and operating planes | [`architecture/TARGET_OPERATING_ARCHITECTURE.md`](architecture/TARGET_OPERATING_ARCHITECTURE.md) |
| Business capabilities, authority and economics | [`architecture/BUSINESS_OPERATING_MODEL.md`](architecture/BUSINESS_OPERATING_MODEL.md) |
| Runtime services, events, timebase, fencing and UI truth | [`architecture/TECHNICAL_RUNTIME_ARCHITECTURE.md`](architecture/TECHNICAL_RUNTIME_ARCHITECTURE.md) |
| Visual hierarchy, grammar, Blueprint/Shot/Scene Graph | [`architecture/VISUAL_PRODUCTION_OPERATING_MODEL.md`](architecture/VISUAL_PRODUCTION_OPERATING_MODEL.md) |
| End-to-end workflow and gates | [`architecture/E2E_PRODUCTION_GATE_MODEL.md`](architecture/E2E_PRODUCTION_GATE_MODEL.md) |
| Visual and motion techniques | [`architecture/VISUAL_MOTION_TECHNIQUE_PLAYBOOK.md`](architecture/VISUAL_MOTION_TECHNIQUE_PLAYBOOK.md) |
| AI-first exact-master assurance | [`architecture/AI_FIRST_PRODUCTION_ASSURANCE.md`](architecture/AI_FIRST_PRODUCTION_ASSURANCE.md) |
| Data lineage, storage and Provider Gateway | [`architecture/DATA_AND_PROVIDER_CONTROL_PLANE.md`](architecture/DATA_AND_PROVIDER_CONTROL_PLANE.md) |
| Multi-channel scale and learning | [`architecture/MULTI_CHANNEL_SCALE_AND_LEARNING.md`](architecture/MULTI_CHANNEL_SCALE_AND_LEARNING.md) |
| Cross-cutting controls | [`governance/CROSS_CUTTING_CONTROL_STANDARD.md`](governance/CROSS_CUTTING_CONTROL_STANDARD.md) |
| Hidden Systems Visual DNA and R22 Blueprint | [`continuity/80_HIDDEN_SYSTEMS_VISUAL_DNA_AND_R22_BLUEPRINT.md`](continuity/80_HIDDEN_SYSTEMS_VISUAL_DNA_AND_R22_BLUEPRINT.md) |
| Active Video Quality Standard V3 | [`continuity/81_VIDEO_PRODUCTION_QUALITY_STANDARD_V3.md`](continuity/81_VIDEO_PRODUCTION_QUALITY_STANDARD_V3.md) |
| Current runtime/project truth | [`continuity/03_CURRENT_STATE.md`](continuity/03_CURRENT_STATE.md) |
| Active decisions | [`continuity/04_DECISION_LOG.md`](continuity/04_DECISION_LOG.md) |
| QA and qualification registry | [`continuity/07_QA_EVAL_REGISTRY.md`](continuity/07_QA_EVAL_REGISTRY.md) |
| Chat continuation protocol and handoff | [`continuity/08_CONTINUATION_PACK.md`](continuity/08_CONTINUATION_PACK.md), [`continuity/09_CHAT_ROLLOVER_CAPSULE.md`](continuity/09_CHAT_ROLLOVER_CAPSULE.md) |
| Open issues | [`governance/MASTER_ISSUE_REGISTRY.md`](governance/MASTER_ISSUE_REGISTRY.md) |
| Current roadmap | [`roadmap/MASTER_ROADMAP.md`](roadmap/MASTER_ROADMAP.md) |
| Document coverage boundary | [`governance/DOCUMENT_COMPLETION_MATRIX.md`](governance/DOCUMENT_COMPLETION_MATRIX.md) |
| Repository synchronization and recovery | [`governance/REPOSITORY_SYNC_AND_RECOVERY.md`](governance/REPOSITORY_SYNC_AND_RECOVERY.md) |

## Archive boundary

[`archive/README.md`](archive/README.md) inventories superseded plans, execution records, diagnostics and prior snapshots. Archived files are tracked for audit and recovery but cannot authorize a command, provider request, PASS, release, publication or current implementation choice.

## Change protocol

Every material change updates the relevant active document in the same commit, runs `npm run check:docs` plus applicable source gates, and preserves a clean exact checkpoint. Historical evidence is append-only: move it to the archive or supersede it; never rewrite it as if it were current.
