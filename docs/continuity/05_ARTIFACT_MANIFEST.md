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
- Passed evidence: targeted lint, 30/30 boundaries, production build, Sites artifact validation, 95/95 tests and built-worker semantic checks.
- Continuous gates: 20/20 commercial UI static checks, canonical-data primary projections/command contracts, 4/4 rendered loading pages, 4/4 fail-closed recovery APIs, one SIWC-protected command rejection, a 500 ms lab server-render ceiling and gzip client budgets are enforced by every verified build.
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
