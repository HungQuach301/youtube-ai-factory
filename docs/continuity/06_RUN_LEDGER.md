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
