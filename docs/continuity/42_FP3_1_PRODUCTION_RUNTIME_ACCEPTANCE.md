# FP3.1 Production Runtime Acceptance

**Class:** `EXECUTION_EVIDENCE`  
**Date:** 2026-08-21 (Asia/Bangkok)  
**Production URL:** `https://youtube-ai-factory.quach-hung.chatgpt.site`  
**Production source:** `3e8d1ce1d330eecc2483eb99695b2da540604666`  
**Closing deployment:** `Sites v391`  
**Result:** `PASS_ZERO_DISPATCH__CONTENT_SAFETY_GATE_REMAINS_BLOCKED`

## Authority and safety boundary

The owner authorized the bounded production deployment and runtime verification of FP3.1. The work did not authorize paid provider dispatch, capability qualification, Golden r10, Stage 11, publishing, historical deletion or Videos 2–15. Every runtime probe was required to leave provider-request and spend totals unchanged.

## Deployment sequence

1. Sites v388 failed before publication because production history contained repeated default fencing token `0` values. Production remained on the prior version and no provider request was created.
2. Source commit `7da37f9b95aad789bdf7419b5f8705a3f482e408` corrected migration `0050` by assigning deterministic unique historical fencing tokens, orphaning expired active leases, restoring a current active stage token when one exists and initializing the counter from the maximum token.
3. Sites v389 applied corrected migration `0050` successfully.
4. Sites v390 ran the bounded zero-dispatch runtime acceptance through a temporary integrity-endpoint-only QA credential.
5. Sites v391 deployed source commit `3e8d1ce1d330eecc2483eb99695b2da540604666`, removed the temporary source authorization branch and projected FP3.1 as production-runtime accepted.

The v388 failure is retained as evidence that the migration failed closed before publish and that production history, not the in-memory replay alone, was necessary to reveal the compatibility defect.

## Production read-back

```text
MIGRATION_0050 = ACTIVE
HISTORICAL_LEASES = 14
ACTIVE_LEASES = 0
COST_RESERVATIONS = 0
DISPATCH_TRACES = 0
OPEN_INTEGRITY_INCIDENTS = 1
OPEN_INCIDENT = SAFETY_SCOPE_NOT_EVALUATED
SAFETY_SCOPE_STATE = NOT_EVALUATED
SAFETY_SCOPE_EVIDENCE_HASH = ABSENT
```

The empty reservation and trace ledgers are expected for this zero-dispatch acceptance. They do not prove future provider execution; they prove that the migration is readable and that no work was accidentally opened during hardening.

## Runtime probes

| Probe | Result | Evidence |
|---|---|---|
| Integrity read-back | `200 PASS` | Migrated rows and open Safety Scope incident returned without mutation |
| Stale/fake lease heartbeat | `409 BLOCKED` | `ACTIVE_LEASE_MISSING` and `STAGE_FENCING_TOKEN_MISMATCH` |
| Expired-lease reconciliation | `200 NO_ACTIVE_LEASE` | No lease or stage state was opened |
| Dispatch-firewall self-test | `200 BLOCKED_AS_EXPECTED` | Seven independent fail-closed reasons; zero provider requests and spend |

The firewall rejected the synthetic dispatch for all of the following reasons:

- `CAPABILITY_NOT_QUALIFIED`
- `CAPABILITY_SETTINGS_SUPERSEDED`
- `FENCED_LEASE_REQUIRED`
- `ATOMIC_RESERVATION_REQUIRED`
- `RIGHTS_INELIGIBLE`
- `IDEMPOTENCY_KEY_INVALID`
- `SAFETY_SCOPE_NOT_EVALUATED`

The self-test invokes the authorization policy only. It does not call a provider, reserve money or create media.

## Zero-dispatch accounting proof

The same totals were observed immediately before and after the probes:

```text
ACTIVE_PROVIDER_REQUESTS = 0 -> 0
COMPLETED_PROVIDER_REQUESTS = 49 -> 49
FAILED_PROVIDER_REQUESTS = 7 -> 7
ACTUAL_PROVIDER_REQUESTS = 56 -> 56
ACTUAL_SPEND_USD = 13.247131145833333 -> 13.247131145833333
FP3_1_PROVIDER_REQUEST_DELTA = 0
FP3_1_SPEND_USD_DELTA = 0
```

The 56 requests and recorded spend predate FP3.1. They are not evidence of dispatch by this slice.

## Credential closure

The temporary environment key `FP3_1_RUNTIME_QA_TOKEN` is absent from production environment revision 30. The v391 source contains no temporary-header authorization branch. A request carrying only the retired QA header receives `401 SIWC_AUTHENTICATION_REQUIRED`. Owner, SIWC and explicitly scoped sequential-executor authorization remain the only integrity-endpoint access paths.

Production Worker logs record the retired-header request as `401` with Worker outcome `ok`, and the public sequential-production projection as `200` with outcome `ok`; neither request produced a runtime exception.

## Regression and build evidence

```text
FULL_REPOSITORY_TESTS = PASS_139_OF_139
VERIFIED_BUILD = PASS
DOCUMENTATION_SSOT_BEFORE_RUNTIME_RECORD = PASS_53_MARKDOWN_FILES
CHANGED_SCOPE_LINT = PASS_0_ERRORS_0_WARNINGS
FULL_REPOSITORY_LINT = FAIL_24_LEGACY_ERRORS_OUTSIDE_FP3_1_SCOPE
CLIENT_BUDGETS_GZIP = CSS_60971_OF_62000__PAGE_JS_46388_OF_50000__TOTAL_309913_OF_310000
```

The legacy full-repository lint debt is not reclassified as an FP3.1 failure and remains outside the changed scope. It must not be hidden or presented as a clean global lint result.

## Accepted and still blocked

FP3.1 infrastructure is production-accepted: independent immutability/eligibility, fencing, reservation ceilings, settings supersede, failure taxonomy, redacted lineage and the shared dispatch firewall are active.

This does **not** close the content-safety finding. `VQ-M0-SAFETY-SCOPE` is still `NOT_EVALUATED`, has no evidence hash and keeps provider dispatch ineligible. Capability qualification remains one of 22 bindings. Golden r10, Stage 11, paid FP4/FP5, Videos 2–15 and auto-publish remain blocked.

## Exact next protected action

Begin Wave 2 Learning-ready Contract Pack as zero-spend schema, policy and regression work. Deliver channel identity, packaging promise, predicted performance, experiment/learning, rights/compliance, animatic and archival/distribution contracts before any paid capability work. Preserve the M0 fail-closed condition until actual financial-content Safety Scope evidence is produced and approved.
