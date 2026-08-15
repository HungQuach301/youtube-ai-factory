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

For the multi-channel product surface, continue from `COMMERCIAL_UI_REVIEW_PENDING` using `docs/continuity/11_COMMERCIAL_UI_UX_ACCEPTANCE.md`. Responsive behavior is user-verified. Resume only keyboard/focus, zoom/reflow, primary/recovery interaction, accessibility, assistive-technology, visual-regression and runtime-performance gates when the approved preview/browser surface is reachable. Do not deploy, mutate production/database state, dispatch providers, add command authority or repeat already-passed responsive/semantic/static acceptance unless source changes.

The protected production handoff remains `MOTION_PROOF_REQUIRED` for champion C only after the Continuity Hardening Gate is reconciled. Do not recreate Stage 09 source, candidates, the composite tournament or pilot.
