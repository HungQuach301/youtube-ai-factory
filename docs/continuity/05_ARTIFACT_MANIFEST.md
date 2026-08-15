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
- Passed evidence: targeted lint, 29/29 boundaries, production build, Sites artifact validation, 95/95 tests and built-worker semantic checks.
- Continuous gates: 14/14 commercial UI static checks, canonical-data primary projections for all four reconstructed slices, 4/4 rendered loading pages, 4/4 fail-closed recovery APIs, a 500 ms lab server-render ceiling and gzip client budgets are enforced by every verified build.
- User evidence: responsive behavior manually confirmed on 2026-08-15.
- Pending evidence: browser hydration/rendering; recovery presentation; keyboard/focus; zoom/reflow; automated/manual accessibility; visual regression; Web Vitals and field telemetry.

## Intelligence & Niche executable contract artifact

- Durable ledger: `docs/continuity/12_INTELLIGENCE_NICHE_EXECUTABLE_CONTRACT.md`.
- Contract/policy: `INTELLIGENCE_NICHE_WORKFLOW_V1` / `INTELLIGENCE_NICHE_POLICY_V1`.
- Continuous gate: eight lifecycle paths with version, expert, evidence, champion-target and channel-isolation controls.
- Authority: all typed commands are `DECLARED_NOT_ROUTED`, provider requests `0`, spend USD `0`.
- Next action: GET-only compiler integration; no command route, migration or deploy.
