# Owner Review Canonical Form Hotfix Execution Record

**Class:** `EXECUTION_EVIDENCE`  
**Date:** 2026-08-21 (Asia/Bangkok)  
**Incident:** `OWNER_REVIEW_NOT_APPLICABLE_CONFIDENCE_UNDEFINED`

## Observed production failure

The owner selected `REJECTED_DEFECT_PRESENT`, chose observable defects, entered a note and submitted the first actionable sample. Instead of the next sample, Production returned raw JSON:

```text
CORPUS_VERIFICATION_FAILED
$.labels[3].confidence contains undefined, which is not canonical JSON
```

The owner did not cause the failure. System-owned taxonomy dimensions are correctly submitted as `NOT_APPLICABLE`; those labels do not require a confidence score. The submission route built its request intent from the pre-normalized form labels, so `confidence: undefined` reached `JCS_NFC_V1` before any database insert. Canonicalization correctly failed closed, but the form adapter violated its contract and the error response exposed an unfriendly raw API payload.

Because the exception occurred while computing `requestHash`, before the owner-label receipt insert and transactional batch, this failed submission created no durable owner receipt or defect label. The owner must resubmit the first sample after the fix; browser Back may preserve the note, but preservation is not asserted when browser history has already been discarded.

## Root correction

1. `normalizeOwnerLabelsForReceipt` now converts every `NOT_APPLICABLE` label to the canonical explicit value `confidence: null`, trims identifiers/statuses and deterministically sorts by defect key.
2. Request intent hashing and evidence hashing use the same normalized labels, preventing idempotency drift between transport and durable evidence.
3. A replay of the same successful form intent redirects to the next owner-review sample instead of returning JSON.
4. The browser submits the form asynchronously. A server/network failure remains inline, keeps the current choices and note in the page, and permits a bounded retry.
5. Non-JavaScript form fallback returns a Vietnamese recovery page with an explicit statement that no receipt was stored, rather than raw JSON.

No existing receipt, candidate, taxonomy row, correlation assignment or artifact byte is rewritten.

## Regression and QA

- Canonical-safe normalization with `PRESENT` and multiple `NOT_APPLICABLE` labels: PASS.
- Canonical serializer accepts the normalized owner request intent: PASS.
- Exact-hash, full-taxonomy, observable/system-evidence and idempotency guards remain active: PASS.
- Full repository regression: `165/165 PASS`.
- Lint: PASS.
- Build and performance budgets: PASS without raising a budget.
- Provider requests: zero.
- Slice spend: `$0`.
- Agent-preview browser reached the Video Engine but local D1 intentionally failed closed because canonical Production fixtures are not copied into preview. Therefore no synthetic owner receipt was created and browser interaction on real owner evidence remains a Production verification step.

## Next gate

Deploy the hotfix, verify the exact production version and zero Worker errors, then have the owner reopen the owner-review workflow and resubmit sample 1. The success banner and `Mẫu 2/82` are the human-visible acceptance signals. Do not infer receipt success merely from a button click.
