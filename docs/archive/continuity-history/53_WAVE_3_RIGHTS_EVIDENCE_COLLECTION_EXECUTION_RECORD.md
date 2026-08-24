# Wave 3 Rights Evidence Collection Execution Record

**Class:** `EXECUTION_EVIDENCE`  
**Date:** 2026-08-21 (Asia/Bangkok)  
**Policy:** `EVALUATION_RIGHTS_EVIDENCE_POLICY_V1`

## Production basis

Sites v404 classified the 63 rights-pending candidates without exposing raw provenance: 46 direct ElevenLabs audio artifacts and 17 records with no provider declaration, comprising 16 masters and one clip. Rights PASS remains 525. The diagnostic used zero provider requests and zero spend.

The current [ElevenLabs non-EEA Terms of Service](https://elevenlabs.io/terms-of-use) are dated 31 March 2026. They state that commercial use depends on paid-plan access and remains subject to the Terms, Prohibited Use Policy and applicable supplemental terms. This current policy reference cannot prove which plan or terms covered an older generation event.

## Source outcome

Migration `0057_evaluation_rights_evidence_collection.sql` creates an immutable task ledger and three separate proof lanes:

1. `PROVIDER_TERMS_AND_PLAN_RECEIPT` requires a terms snapshot effective at generation time, paid-plan evidence covering that time, a completed provider request/response, exact artifact-hash binding, and voice/model identity.
2. `COMPOSITE_PARENT_RIGHTS_MANIFEST` requires the exact parent set, every parent hash and a PASS rights receipt for every parent.
3. `AUTHORSHIP_SOURCE_RECEIPT` requires the exact artifact hash, accountable authorship basis, source/render manifest where applicable, territory and commercial-use term.

The schema stores provider-level terms/plan receipts separately from candidate-to-request bindings. It also rejects incomplete composite coverage and requires rendered-composite authorship to reference a source manifest.

## Safety boundary

- Current terms are a design reference, never retroactive evidence.
- A package-level provider request cannot establish candidate-level rights.
- No-provider does not mean channel-owned.
- A master cannot pass because its package contains a manifest; the master must bind the exact parent set and every parent must independently pass rights.
- All receipts are append-only; tasks are immutable and close only by accepted evidence.
- Migration `0057` inserts no PASS receipt and performs no candidate-rights update.
- Provider requests, spend, fixture promotion, dataset sealing and release authority remain zero.

## Verification

- Rights-evidence contract and migration tests: PASS.
- Current-terms-after-generation test: rejected.
- Incomplete parent hash/receipt coverage test: rejected.
- Rendered composite without source manifest test: rejected.
- Full application build and commercial/performance gates: PASS.
- Production migration/read-back: PASS in Sites v405.
- Exact task ledger: 46 provider terms/plan, 16 composite parent-rights and one authorship/source task.
- Rights remained 525 PASS / 63 pending; provider requests and spend remained 0 / `$0` for the slice.
- Verified fixtures, gold eligibility, sealed datasets and release eligibility remained zero.

## Next gate

Collect historical ElevenLabs terms and paid-plan evidence from an authoritative account/billing source before any provider candidate can receive a PASS receipt. In parallel, reconstruct exact master parent sets and the one clip's source/authorship basis. Owner-confirmed defect labels remain downstream of durable rights evidence.
