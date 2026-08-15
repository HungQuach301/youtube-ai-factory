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
- Current gate: `COMMERCIAL_UI_REVIEW_PENDING`.
- Passed evidence: targeted lint, 32/32 boundaries, production build, Sites artifact validation, 95/95 tests and built-worker semantic checks.
- Continuous gates: 40/40 commercial UI static checks, canonical-data primary projections/command contracts, 4/4 rendered loading pages, 4/4 fail-closed recovery APIs, three SIWC-protected zero-spend command rejections, a 500 ms lab server-render ceiling and gzip client budgets are enforced by every verified build.
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
- Contract/policy: `NICHE_OPPORTUNITY_PORTFOLIO_V2` / `NICHE_OPPORTUNITY_POLICY_V2`.
- Source: `lib/niche-opportunity-portfolio-contract.ts`.
- Continuous gate: `scripts/check-niche-opportunity-portfolio-v2.ts`, executed by every verified build.
- Decision shape: comparable opportunity list; separate Market Attractiveness, Ability to Win and Evidence Confidence; no aggregate score.
- Win contract: prerequisites are hard gates; winning criteria expose capability gaps, close actions, cost/time and proof methods.
- Expert leverage: expert-seeded hypotheses use the same support/contradiction/unknown research path; expert priority remains separate from system rank.
- Authority: hypothesis intake plus the Slice 4 plan/validation/review commands are routed with actual provider requests `0` and spend USD `0`; scoring, priority, commitment and activation remain separate.
- Portfolio projection: `NICHE_PORTFOLIO_PROJECTION_V2`, `GET /api/factory/niche-portfolio`, typed niche opportunities plus append-only expert hypotheses with truthful assumption/evidence separation. Legacy V1 video topics are excluded and preserved in Channel Studio.
- Expert hypothesis command: `POST /api/factory/niche-hypotheses`, `NICHE_HYPOTHESIS_INTAKE_V1`, migration 0031 and append-only hypothesis/audit/lineage.
- Commercial surface: side-by-side portfolio matrix and expandable market/audience/competitor/Conditions to Win dossiers at `/niche-discovery`.
- Evidence workflow: `POST /api/factory/niche-evidence`, `NICHE_EVIDENCE_WORKFLOW_V1`, migration 0032 and append-only event/audit/frozen-lineage records.
- Continuous evidence: 33/33 boundaries, 40/40 commercial UI, 10/10 V2 contract groups, 8 Intelligence/Niche lifecycle paths and 95/95 regression.
- Next action: checkpoint/reconcile Slice 4, create a rollover capsule, then implement permanent Slice 5 evidence sufficiency, three-axis scoring and portfolio comparison. Slices 6–8 remain prioritization, commitment/governance and Channel Strategy features.
