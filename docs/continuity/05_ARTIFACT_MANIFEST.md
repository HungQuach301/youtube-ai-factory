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
