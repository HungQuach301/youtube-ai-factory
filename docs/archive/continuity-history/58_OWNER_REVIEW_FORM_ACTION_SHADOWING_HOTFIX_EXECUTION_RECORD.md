# Owner Review Form Action Shadowing Hotfix Execution Record

**Class:** `EXECUTION_EVIDENCE`  
**Date:** 2026-08-22 (Asia/Bangkok)  
**Incident:** `OWNER_REVIEW_FORM_ACTION_NAMED_PROPERTY_SHADOWING`

## Observed production failure

After Sites v417 fixed canonical label normalization, the owner retried sample 1 with three observable defects selected:

- `MOBILE_LEGIBILITY`;
- `NEAR_STATIC_MOTION`; and
- `PRODUCTION_RESIDUE`.

The owner also entered an observable rationale describing a static image rather than a video, missing voice and diagram behavior, slide-like presentation and visible `evidence-bound production proof` residue. The inline preservation behavior worked: Production kept every choice and the note on screen and displayed a friendly retry message. It did not navigate to raw JSON.

Production Worker read-back proves the failed request was:

```text
POST /api/factory/sequential-production/[object HTMLInputElement]
status 404
```

The HTML form contains a required hidden field named `action`. In browser DOM named-property resolution, that control shadows the `HTMLFormElement.action` property. Client code passed `form.action` to `fetch`, which became the input element string rather than the declared route URL. The request never reached the evaluation POST handler, so no owner receipt, defect label or candidate mutation occurred.

The screenshots and chat observation are incident evidence, not a substitute for the identity-bound exact-artifact owner receipt. The owner must resubmit after deployment.

## Root correction

The client now resolves its endpoint only through `form.getAttribute('action')`, with the exact evaluation route as a closed fallback. It never reads the collision-prone named property. A source regression forbids `fetch(form.action` in the owner workflow.

The prior protections remain unchanged:

- explicit `null` for `NOT_APPLICABLE` confidence;
- one normalized label set for request and evidence hashes;
- exact artifact/task binding;
- append-only receipt and defect-label writes;
- idempotent replay redirect;
- inline form/error preservation; and
- zero provider authority and zero spend.

## Verification

- Production incident read-back: exact malformed POST route and `404` proven.
- Endpoint source uses `form.getAttribute('action')`: PASS.
- Regression rejects `fetch(form.action`: PASS.
- Canonical owner-label tests: PASS.
- Full repository regression: `165/165 PASS`.
- Lint, build and performance budgets: PASS.
- Provider requests: zero.
- Slice spend: `$0`.

## Production activation

- Sites version: `v418`.
- Exact source commit: `fce8dbc65da228d21b6526b5dd987716c7fdf3e6`.
- Deployment: `succeeded`.
- Production URL: `https://youtube-ai-factory.quach-hung.chatgpt.site`.
- Post-deploy error-only Worker query: zero events in the latest 30-minute window.
- Provider requests and slice spend: unchanged at zero.

## Next gate

The owner must refresh or reopen the full-screen workflow because JavaScript already loaded in the current tab cannot be changed by deployment, then reselect the three defects and resubmit the rationale. Acceptance requires a successful POST to `/api/factory/sequential-production/evaluation`, one durable receipt and visible transition to `Mẫu 2/82`.
