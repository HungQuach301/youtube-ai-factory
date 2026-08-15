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
- Classification: `RECONSTRUCTED_V1_UI_ACCESSIBILITY_REPAIR`.
- Current gate: `COMMERCIAL_UI_REVIEW_PENDING`.
- Passed evidence: targeted lint, 29/29 boundaries, production build, Sites artifact validation, 95/95 tests and built-worker semantic checks.
- Pending evidence: rendered viewport, keyboard/focus, automated/manual accessibility and runtime performance gates.
