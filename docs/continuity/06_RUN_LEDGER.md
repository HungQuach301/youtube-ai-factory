# Run Ledger Contract

The canonical unit is one provider request or one deterministic execution job.

Required fields include request ID, idempotency key, provider response ID, stage, phase, artifact/brief, provider/model, attempt/retry scope, status, tokens/tools, actual cost, error and timestamps.

## Reconciliation rules

1. Resolve active requests before any retry or new dispatch.
2. Enforce unique idempotency keys and provider response IDs.
3. Join request and usage evidence by provider response ID.
4. Compare cost only within matched records.
5. Preserve failed, incomplete, cancelled and wasted attempts.
6. Never infer cancellation from a stopped chat or browser session.

## 2026-08-16 — Canonical Channel Strategy activation run

```text
RUN = prod.hidden-systems.active-strategy.v1
SOURCE = frozen Stage 01 Intelligence artifact
BRIDGE_VERSION = 1
TYPED_NICHE_OPPORTUNITIES = 3
EVIDENCE_SUFFICIENT = 2
ELIGIBLE = 2
PRIORITY_VERSION = 1
SELECTION_VERSION = 1
COMMITMENT_VERSION = 1
ACTIVATION_VERSION = 1
CHANNEL_STRATEGY_VERSION = 1
STATE = ACTIVE
PROVIDER_REQUESTS = 0
SPEND_USD = 0
AGGREGATE_SCORE = null
REPLAY = IDEMPOTENT_SAME_ACTIVATION
RELOAD_READBACK = PASS
BOUNDARY_WRONG_TOKEN = 401_NO_MUTATION
BOUNDARY_INVALID_ACTION = 400_NO_MUTATION
```
