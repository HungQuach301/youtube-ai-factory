# Historical Documentation Archive

**State:** `HISTORICAL_READ_ONLY`  
**Policy:** `ACTIVE_DOCS_AND_ARCHIVE_BOUNDARY_V1`

This directory preserves prior plans, execution evidence, diagnostics and snapshots for audit and recovery. It is intentionally excluded from the active reading order and cannot authorize current implementation, provider dispatch, QA PASS, release or publication.

## Contents

| Directory | Contents | Current authority |
|---|---|---|
| `continuity-history/` | Documents 10-79: completed slices, execution records, diagnostics, superseded standards and Production evidence | Historical evidence only |
| `architecture-history/` | Earlier Evaluation/Learning contract packs and Stage 09 architecture | Superseded/reference only |
| `advisory-history/` | Expert assessment and its reconciliation after accepted decisions were promoted | Advisory history only |
| `migration-history/` | Completed external-source migration record | Historical evidence only |
| `snapshots/` | Pre-cleanup Current State, Decision Log, manifests, run ledger, rollover, roadmap and issue registry | Point-in-time recovery only |

## Use rules

- Begin ordinary work from `docs/README.md`, never from this directory.
- When an archived statement conflicts with active documents or runtime evidence, the active/reconciled source wins.
- Do not edit archived evidence to make it look current. Corrections belong in an active decision or incident record.
- Git history is the recovery mechanism; archived paths are not a second SSOT.
