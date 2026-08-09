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
