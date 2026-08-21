# AI Factory Knowledge Base

This directory is the canonical knowledge base for YouTube AI Factory. The Git repository, its tracked documents, migrations, source code, tests and commit history are the sole source of truth. Chat transcripts, Personal Context, Library files, local scratch folders, screenshots and exported capsules are discovery or recovery aids only.

## Canonical repository

```text
repository: youtube-ai-factory
remote: origin
branch: main
production URL: https://youtube-ai-factory.quach-hung.chatgpt.site
source policy: GIT_REPOSITORY_SSOT_V1
```

The exact current source identity is always the output of:

```bash
git rev-parse HEAD
git status --short --branch
git remote -v
```

Do not copy a commit hash from a chat transcript and treat it as current without running these commands in this repository.

## Authority order

When facts conflict, use this order:

1. Stored production bytes, immutable receipts and reconciled runtime evidence.
2. Reproducible tests, benchmarks and checksums.
3. Deployed source, database migrations and active configuration.
4. Approved architecture decisions in the tracked decision log.
5. Reconciled standards and issue decisions in this knowledge base.
6. Expert proposals awaiting calibration.
7. Historical documents, UI labels, plans and chat summaries.

`READY`, `PASS`, `FROZEN`, a document statement or a UI label never overrides missing runtime evidence.

## Required reading order for a new chat

1. [`../AGENTS.md`](../AGENTS.md)
2. [`governance/REPOSITORY_SOURCE_OF_TRUTH.md`](governance/REPOSITORY_SOURCE_OF_TRUTH.md)
3. [`continuity/03_CURRENT_STATE.md`](continuity/03_CURRENT_STATE.md)
4. [`continuity/09_CHAT_ROLLOVER_CAPSULE.md`](continuity/09_CHAT_ROLLOVER_CAPSULE.md)
5. [`governance/MASTER_ISSUE_REGISTRY.md`](governance/MASTER_ISSUE_REGISTRY.md)
6. [`roadmap/MASTER_ROADMAP.md`](roadmap/MASTER_ROADMAP.md)
7. The stage or product documents named by the current roadmap item.

## Canonical document map

| Concern | Canonical document |
|---|---|
| Product charter | [`continuity/00_AI_FACTORY_CHARTER.md`](continuity/00_AI_FACTORY_CHARTER.md) |
| Architecture principles | [`continuity/01_ARCHITECTURE_AND_PRINCIPLES.md`](continuity/01_ARCHITECTURE_AND_PRINCIPLES.md) |
| Target multi-channel architecture | [`architecture/TARGET_OPERATING_ARCHITECTURE.md`](architecture/TARGET_OPERATING_ARCHITECTURE.md) |
| Current production truth | [`continuity/03_CURRENT_STATE.md`](continuity/03_CURRENT_STATE.md) |
| Approved decisions | [`continuity/04_DECISION_LOG.md`](continuity/04_DECISION_LOG.md) |
| Master risks and findings | [`governance/MASTER_ISSUE_REGISTRY.md`](governance/MASTER_ISSUE_REGISTRY.md) |
| Program roadmap and gates | [`roadmap/MASTER_ROADMAP.md`](roadmap/MASTER_ROADMAP.md) |
| Chat continuation | [`continuity/09_CHAT_ROLLOVER_CAPSULE.md`](continuity/09_CHAT_ROLLOVER_CAPSULE.md) |
| Sequential Video Engine | [`continuity/30_V7_V23_4_V281_SEQUENTIAL_PRODUCTION.md`](continuity/30_V7_V23_4_V281_SEQUENTIAL_PRODUCTION.md) |
| Stage techniques and tools | [`continuity/31_STAGE_TECHNIQUES_TOOLS_QUALITY_CONTROLS.md`](continuity/31_STAGE_TECHNIQUES_TOOLS_QUALITY_CONTROLS.md) |
| Video quality standard | [`continuity/34_VIDEO_PRODUCTION_QUALITY_STANDARD_V2.md`](continuity/34_VIDEO_PRODUCTION_QUALITY_STANDARD_V2.md) |
| First-pass architecture | [`continuity/37_FIRST_PASS_QUALITY_ARCHITECTURE.md`](continuity/37_FIRST_PASS_QUALITY_ARCHITECTURE.md) |
| Learning-ready Contract Pack | [`architecture/LEARNING_READY_CONTRACT_PACK.md`](architecture/LEARNING_READY_CONTRACT_PACK.md) |
| Evaluation Foundation | [`architecture/EVALUATION_FOUNDATION.md`](architecture/EVALUATION_FOUNDATION.md) |
| Capability Registry evidence | [`continuity/38_FP2_CAPABILITY_REGISTRY_EXECUTION_RECORD.md`](continuity/38_FP2_CAPABILITY_REGISTRY_EXECUTION_RECORD.md) |
| FP3 ShotCueProgram evidence | [`continuity/39_FP3_EXECUTABLE_SHOT_CUE_PROGRAM_EXECUTION_RECORD.md`](continuity/39_FP3_EXECUTABLE_SHOT_CUE_PROGRAM_EXECUTION_RECORD.md) |
| FP3.1 source implementation evidence | [`continuity/41_FP3_1_PRODUCTION_INTEGRITY_EXECUTION_RECORD.md`](continuity/41_FP3_1_PRODUCTION_INTEGRITY_EXECUTION_RECORD.md) |
| FP3.1 production runtime acceptance | [`continuity/42_FP3_1_PRODUCTION_RUNTIME_ACCEPTANCE.md`](continuity/42_FP3_1_PRODUCTION_RUNTIME_ACCEPTANCE.md) |
| Wave 2 source implementation evidence | [`continuity/43_WAVE_2_LEARNING_READY_CONTRACT_PACK_EXECUTION_RECORD.md`](continuity/43_WAVE_2_LEARNING_READY_CONTRACT_PACK_EXECUTION_RECORD.md) |
| Wave 2 production runtime acceptance | [`continuity/44_WAVE_2_PRODUCTION_RUNTIME_ACCEPTANCE.md`](continuity/44_WAVE_2_PRODUCTION_RUNTIME_ACCEPTANCE.md) |
| Wave 3 Evaluation Foundation source evidence | [`continuity/45_WAVE_3_EVALUATION_FOUNDATION_EXECUTION_RECORD.md`](continuity/45_WAVE_3_EVALUATION_FOUNDATION_EXECUTION_RECORD.md) |
| Wave 3 production runtime acceptance | [`continuity/46_WAVE_3_EVALUATION_FOUNDATION_PRODUCTION_ACCEPTANCE.md`](continuity/46_WAVE_3_EVALUATION_FOUNDATION_PRODUCTION_ACCEPTANCE.md) |
| Expert assessment reconciliation | [`expert-assessments/2026-08-20_EXPERT_ASSESSMENT_RECONCILIATION.md`](expert-assessments/2026-08-20_EXPERT_ASSESSMENT_RECONCILIATION.md) |
| External-source migration | [`migration/2026-08-20_EXTERNAL_SOURCE_MIGRATION.md`](migration/2026-08-20_EXTERNAL_SOURCE_MIGRATION.md) |

Documents 10–29 remain canonical for the product slices they explicitly own. Documents 32, 35, 36, 38 and 39 are execution evidence. Earlier claims that conflict with a later approved decision or current runtime evidence are historical, not active authority.

## Document classes

- `NORMATIVE`: approved architecture, policy, contract or standard.
- `CURRENT_STATE`: reconciled operating truth at a named checkpoint.
- `EXECUTION_EVIDENCE`: immutable record of what was actually run and measured.
- `ADVISORY`: expert input that requires a recorded disposition.
- `HISTORICAL`: preserved context with no current mutation or release authority.
- `SUPERSEDED`: retained for lineage but replaced by a named later document or decision.

## Change protocol

Every material change must update the relevant canonical document in the same commit as the source change, record verification truth, and identify the next protected action. A chat is not a durable handoff until the commit is pushed to `origin/main` and the worktree is clean.

Run the documentation control check with:

```bash
npm run check:docs
```
