# Artifact Manifest Contract

Each manifest record must contain:

- Artifact ID, stage, version and lifecycle state
- SHA-256 over actual stored bytes or canonical serialized content
- Parent lineage and affected descendants
- Runtime key, archive ID and last verification
- Rights/provenance and reuse eligibility
- QA rubric/version, score, findings and critic identity
- Request/run IDs, attempt and cost allocation

Stage 09 composite evidence requires nine hashes: candidate A/B/C × entry/midpoint/exit. Missing hash is a blocking result, never an empty pass.

## Multi-channel commercial UI acceptance artifact

- Durable ledger: `docs/continuity/11_COMMERCIAL_UI_UX_ACCEPTANCE.md`.
- Classification: `RECONSTRUCTED_V1_INTELLIGENCE_NICHE_CONTRACT_GUARD`.
- Current gate: `SUPERSEDED_FOR_INTELLIGENCE_NICHE_BY_DOCUMENT_26`; the original site-wide commercial review remains historical evidence and does not block the scoped Intelligence–Niche production closure.
- Passed evidence: targeted lint, 32/32 boundaries, production build, Sites artifact validation, 95/95 tests and built-worker semantic checks.
- Continuous gates: 47/47 commercial UI static checks, canonical-data primary projections/command contracts, 4/4 rendered loading pages, 4/4 fail-closed recovery APIs, five SIWC-protected zero-spend command rejections, a 500 ms lab server-render ceiling and gzip client budgets are enforced by every verified build.
- User evidence: responsive behavior manually confirmed on 2026-08-15.
- Pending evidence: browser hydration/rendering; recovery presentation; keyboard/focus; zoom/reflow; automated/manual accessibility; visual regression; Web Vitals and field telemetry.

## Intelligence & Niche executable workflow artifacts

- Durable ledger: `docs/continuity/12_INTELLIGENCE_NICHE_EXECUTABLE_CONTRACT.md`.
- GET projection ledger: `docs/continuity/13_INTELLIGENCE_NICHE_GET_WORKFLOW_PROJECTION.md`.
- Expert decision command ledger: `docs/continuity/14_NICHE_EXPERT_DECISION_COMMAND.md`.
- Contract/policy: `INTELLIGENCE_NICHE_WORKFLOW_V1` / `INTELLIGENCE_NICHE_POLICY_V1`.
- Continuous gate: eight lifecycle paths with version, expert, evidence, champion-target and channel-isolation controls.
- Authority: only the SIWC-authenticated, allowlisted `SUBMIT_EXPERT_DECISION` command is routed; every command remains provider requests `0`, spend USD `0`.
- GET integration: canonical program/run/candidate/evidence versions, strict expert binding and Channel Strategy gate are projected without mutation.
- Decision persistence: append-only decision, audit and frozen lineage records with idempotency and optimistic concurrency; no channel niche mutation or Channel Strategy activation.
- Next action: production migration/runtime reconciliation and browser acceptance, then a separate niche-commitment command contract.

## Niche Opportunity Portfolio V2 artifacts

- Durable ledger: `docs/continuity/16_NICHE_OPPORTUNITY_PORTFOLIO_V2.md`.
- Slice 2 ledger: `docs/continuity/17_NICHE_PORTFOLIO_READ_ONLY_PROJECTION.md`.
- Slice 3 ledger: `docs/continuity/18_NICHE_EXPERT_HYPOTHESIS_INTAKE.md`.
- Slice 3.1 ledger: `docs/continuity/19_NICHE_IDENTITY_GRANULARITY_REPAIR.md`.
- Slice 4 ledger: `docs/continuity/20_NICHE_EVIDENCE_INTELLIGENCE_VALIDATION.md`.
- Slice 5 ledger: `docs/continuity/21_NICHE_EVIDENCE_SUFFICIENCY_THREE_AXIS_SCORING.md`.
- Slice 6 ledger: `docs/continuity/22_NICHE_EXPERT_PRIORITIZATION.md`.
- Contract/policy: `NICHE_OPPORTUNITY_PORTFOLIO_V2` / `NICHE_OPPORTUNITY_POLICY_V2`.
- Source: `lib/niche-opportunity-portfolio-contract.ts`.
- Continuous gate: `scripts/check-niche-opportunity-portfolio-v2.ts`, executed by every verified build.
- Decision shape: comparable opportunity list; separate Market Attractiveness, Ability to Win and Evidence Confidence; no aggregate score.
- Win contract: prerequisites are hard gates; winning criteria expose capability gaps, close actions, cost/time and proof methods.
- Expert leverage: expert-seeded hypotheses use the same support/contradiction/unknown research path; expert priority remains separate from system rank.
- Authority: hypothesis intake, Slice 4 plan/validation/review, Slice 5 scoring assessment and Slice 6 expert priority are routed with actual provider requests `0` and spend USD `0`; selection, commitment and activation remain separate.
- Portfolio projection: `NICHE_PORTFOLIO_PROJECTION_V2`, `GET /api/factory/niche-portfolio`, typed niche opportunities plus append-only expert hypotheses with truthful assumption/evidence separation. Legacy V1 video topics are excluded and preserved in Channel Studio.
- Expert hypothesis command: `POST /api/factory/niche-hypotheses`, `NICHE_HYPOTHESIS_INTAKE_V1`, migration 0031 and append-only hypothesis/audit/lineage.
- Commercial surface: side-by-side portfolio matrix and expandable market/audience/competitor/Conditions to Win dossiers at `/niche-discovery`.
- Evidence workflow: `POST /api/factory/niche-evidence`, `NICHE_EVIDENCE_WORKFLOW_V1`, migration 0032 and append-only event/audit/frozen-lineage records.
- Scoring workflow: `POST /api/factory/niche-scoring`, `NICHE_SCORING_COMMAND_V1`, migration 0033 and append-only assessment/audit/frozen-lineage records; lexicographic three-axis rank with no total score.
- Priority workflow: `POST /api/factory/niche-priorities`, `NICHE_PRIORITY_COMMAND_V1`, migration 0034 and append-only set/item/audit/frozen-lineage records; complete comparable-set validation and automatic stale-state projection.
- Continuous evidence: 35/35 boundaries, 47/47 commercial UI, 10/10 V2 contract groups, 8 Intelligence/Niche lifecycle paths and 95/95 regression.
- Next action: checkpoint/reconcile Slice 6, create a recovery-tested rollover capsule, then implement permanent Slice 7 commitment/governance. Slice 8 remains Channel Strategy activation.
# Slice 7 artifacts

- `lib/niche-governance-command.ts`: permanent selection/commitment command contract.
- `app/api/factory/niche-governance/route.ts`: SIWC-protected zero-spend route.
- `db/schema.ts` and `drizzle/0035_massive_celestials.sql`: append-only governance ledgers.
- `lib/niche-portfolio-projection.ts`: active/stale governance projection.
- `docs/continuity/23_NICHE_COMMITMENT_GOVERNANCE.md`: authoritative Slice 7 handoff.

# Slice 8 artifacts

- `lib/channel-strategy-activation-command.ts`: commitment-bound activation contract and atomic append-only mutation.
- `app/api/factory/channel-strategy-activations/route.ts`: SIWC-protected JSON/native-form zero-spend route.
- `db/schema.ts` and `drizzle/0036_colossal_master_mold.sql`: activation and audit ledgers.
- `lib/niche-portfolio-projection.ts`: active/stale activation projection and downstream gate.
- `lib/channel-studio-projection.ts`: read-only consumer of the active canonical binding.
- `docs/continuity/24_CHANNEL_STRATEGY_ACTIVATION.md`: authoritative Slice 8 handoff.
- Continuous evidence: 37/37 async boundaries, 57/57 commercial UI, 10/10 V2 groups, 8 lifecycle paths, rendered fail-closed checks, client-budget gate and 95/95 regressions.
- Authority: only the Channel Strategy binding mutates; all upstream facts and legacy `channels.niche` remain immutable; provider requests `0`, spend USD `0`, aggregate score `null`.

# Production Intelligence-to-Channel Strategy artifacts

- `lib/canonical-channel-strategy-bootstrap.ts`: deterministic canonical bridge and existing-command orchestrator.
- `app/api/factory/canonical-channel-strategy-bootstrap/route.ts`: secret-bound, single-action production automation boundary.
- `db/schema.ts` and `drizzle/0037_intelligence_niche_bridge.sql`: append-only bridge run and typed niche ledgers.
- `lib/niche-portfolio-projection.ts`: reads typed bridge opportunities beside expert-seeded hypotheses.
- `scripts/check-canonical-channel-strategy-bootstrap.ts`: three-niche boundary, balanced evidence and no-topic-promotion contract.
- Production source: Sites v308, commit `f534d5e4cb9c70f65d127b3522f7e400a681337f`.
- Production outcome: three niches, two comparable/eligible, priority/selection/commitment/activation v1, strategy `ACTIVE`.
- Selected binding: `Everyday Payment and Pricing Infrastructure` for `channel-hidden-systems`.
- Immutable controls: frozen Stage 01 hash preserved; 17 legacy topics excluded; provider requests `0`; spend `$0`; aggregate score `null`.
- Acceptance ledger: `docs/continuity/25_INTELLIGENCE_TO_ACTIVE_CHANNEL_STRATEGY_PRODUCTION.md`.

# Intelligence–Niche production FE acceptance artifact

- Durable ledger: `docs/continuity/26_INTELLIGENCE_NICHE_FE_PRODUCTION_ACCEPTANCE.md`.
- Functional source: Sites v311, commit `c292871bb210fc293327b01f82afb2253443b3fc`.
- Intelligence surface: evidence summary, compact thesis, market/audience/competitor decision domains, lineage disclosure and explicit handoff to Niche Discovery.
- Niche surface: active strategy summary, selected niche, responsive three-axis comparison cards, evidence dossiers, locked active priority and secondary governance/intake disclosures.
- Optimization: `/niche-discovery` consumes one canonical API projection and performs no duplicate server-side D1 projection.
- Continuous evidence: 38 async boundaries, 57/57 commercial UI checks, 8 Intelligence/Niche paths, 10/10 V2 groups, verified build, 95/95 regressions and bounded client budgets.
- Production evidence: Intelligence, Niche Portfolio and Channel Studio integrity `READY`; decision `CHANNEL_STRATEGY_ACTIVATED`; downstream `ACTIVATED`; strategy `ACTIVE`; identical activation ID; all three pages HTTP 200; zero recent error-only Worker events.
- Closure: `INTELLIGENCE_NICHE_STAGE=CLOSED_PRODUCTION_FE_QA`.

# Content System & Planning Autopilot production artifact

- Durable ledger: `docs/continuity/27_CONTENT_SYSTEM_PLANNING_AUTOPILOT_PRODUCTION_ACCEPTANCE.md`.
- Contracts: `CONTENT_SYSTEM_PLANNING_PROJECTION_V1` and `CONTENT_AUTOPILOT_COMMAND_V1`.
- Persistence: migration 0038; ten append-only/versioned policy, run, system, opportunity, plan, brief, exception and audit tables.
- Commands: configure policy, run, pause, resume and emergency stop; SIWC/allowlist, idempotency and optimistic versions.
- Production state: `FULL_AUTOPILOT` policy v3, complete run v2, 4 pillars, 8 series, 8 opportunities, 8 plan items, 8 ready briefs and zero open exceptions.
- Authority: strategy mutation, provider dispatch, spend, production mutation and publishing mutation remain false; production handoff is separately authorized and publishing remains closed.
- Continuous evidence: 40 async boundaries, 69/69 commercial UI checks, verified build, 96/96 regressions and bounded client budgets.
- Production evidence: normal, emergency stop, resume, stale detection and recompile passed; Channel Strategy v1 lineage unchanged; integrity `READY`; handoff `READY_FOR_PRODUCTION`.

# Sequential production Stage 00–10 artifacts

- Architecture and data policy: `docs/continuity/30_V7_V23_4_V281_SEQUENTIAL_PRODUCTION.md`.
- Per-stage techniques, tools and quality controls: `docs/continuity/31_STAGE_TECHNIQUES_TOOLS_QUALITY_CONTROLS.md`.
- Video-01 production record: `docs/continuity/32_VIDEO_01_STAGE_00_10_EXECUTION_RECORD.md`.
- Next implementation plan: `docs/continuity/33_STAGE_11_16_IMPLEMENTATION_PLAN.md`.
- Audience-facing Video Excellence constitution: `docs/continuity/34_VIDEO_PRODUCTION_QUALITY_STANDARD_V2.md`.
- Golden runtime and audit record: `docs/continuity/35_VIDEO_EXCELLENCE_RUNTIME_AND_GOLDEN_AUDIT.md`.
- Full-playback perceptual correction: `docs/continuity/36_FULL_PLAYBACK_PERCEPTUAL_QA.md`.
- First-pass capability, preflight and independent-assurance doctrine: `docs/continuity/37_FIRST_PASS_QUALITY_ARCHITECTURE.md`.
- FP2 runtime and zero-spend execution record: `docs/continuity/38_FP2_CAPABILITY_REGISTRY_EXECUTION_RECORD.md`.
- Capability Registry migration: `drizzle/0048_first_pass_capability_registry.sql`.
- Shared eligibility and dispatch-audit runtime: `lib/first-pass-capability-registry.ts`.
- Current protected boundary: Golden r9 visual/audio remain rejected; Stage 11 and videos 2–15 are blocked; FP1 and FP2 are implemented, but every capability binding remains `QUALIFICATION_REQUIRED`. FP3–FP5 precede any Golden r10 render.
- Video Production Quality Standard V2, content-route playbooks and M0–M4 enforcement registry: `docs/continuity/34_VIDEO_PRODUCTION_QUALITY_STANDARD_V2.md`.
- Registry/eligibility migration: `drizzle/0043_gorgeous_angel.sql`.
- Media/audio migration: `drizzle/0044_adorable_skaar.sql`.
- Typed command engine: `lib/sequential-production-command.ts`.
- Owner/runtime route: `app/api/factory/sequential-production/route.ts`.
- Stage 01–08 compiler: `app/api/factory/sequential-production/executor/route.ts`.
- Cost/rights plan: `app/api/factory/sequential-production/plan/route.ts`.
- Stage 09–10 media/audio execution: `app/api/factory/sequential-production/media/route.ts`.
- Continuous contract tests: `tests/sequential-production-runtime.test.mjs`; 11/11 checks pass inside the verified build.
- Production checkpoint: Sites v350, commit `8f566d0d89037594f6bc8feb608736809389043b`.
- Current control-state evidence: Stage 00–10 frozen, Stage 11 state-ready, 84 media assets, three audio stems, narration 704.447 seconds, 0 active provider requests, $10.812573 estimated OpenAI usage.
- Current quality eligibility: `BLOCKED_VIDEO_STANDARD_V2`; Stage 08 covers only 0–600 seconds, Stage 09 motion proof is text rather than decoded temporal pixels, and Stage 10 lacks perceptual voice evidence, production music/SFX and a full-duration audience mix. Historical revisions remain immutable.

# Evaluation Foundation and Factory-first QA artifacts

- Architecture: `docs/architecture/EVALUATION_FOUNDATION.md`.
- Production ledger: `docs/continuity/59_FACTORY_FIRST_QA_EXECUTION_RECORD.md`.
- Migrations: `drizzle/0052_evaluation_foundation.sql` through `drizzle/0064_factory_qa_deterministic_adjudication.sql`.
- Factory route: `app/api/factory/sequential-production/factory-qa/route.ts`.
- Exact-byte raster/SVG review surface and deterministic closed-condition signals: `lib/image-review-surface.ts`.
- Continuous contract: `tests/evaluation-foundation.test.mjs`.
- Production checkpoint: Sites v425, commit `d267c85e66d7cf01970ed2877de5fec362e12a8f`.
- Production outcome: combined calibration 2/2; 80 non-anchor primaries drained to 33 likely-defect and 47 Browser-required receipts; zero likely-clean and zero owner-attention; 37 provider requests; $0.4314096 measured spend; zero recent Worker errors.
- Protected boundary: Factory evidence is independent triage only. The 47 temporal/audio tasks require a separately qualified Browser lane; fixtures, datasets, assurance and release state remain unchanged.
- Clean-audio commercial-rights evidence: `drizzle/0074_clean_audio_commercial_rights_evidence.sql`, `lib/clean-audio-rights-evidence.ts`, and `docs/continuity/67_CLEAN_AUDIO_COMMERCIAL_RIGHTS_EVIDENCE.md`; four official-source snapshots are exact-byte/R2-bound, while ambiguous `payg` base-plan coverage remains rights-pending with zero promotion authority.
