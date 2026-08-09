# Continuation Pack Protocol

## Session start

1. Read Charter, Architecture, Current State and this protocol.
2. Load the latest immutable continuity snapshot.
3. Reconcile active requests, artifact hashes, provider usage and site-version lineage.
4. Identify stale documents and unresolved evidence.
5. State the one authorized next action and all protected work that must not be rerun.
6. Perform no mutation until material contradictions are resolved.

## Session close

Record completed and incomplete work, artifact/version/hash, provider usage and cost, QA/eval result, new or superseded decisions, blockers, one next action and the protected no-rerun list. Capture an immutable snapshot only when active provider requests are zero.

## Current handoff

Continue from `MOTION_PROOF_REQUIRED` for champion C only after the Continuity Hardening Gate is reconciled. Do not recreate the Stage 09 source, candidates, composite tournament or pilot.
