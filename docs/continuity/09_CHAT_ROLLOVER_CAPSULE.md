# Chat Rollover Handoff

**Policy:** `GIT_REPOSITORY_SSOT_V1`

**Current source classification:** `WAVE_3_PHASE_4_DISPOSITION_SOURCE_READY__PRODUCTION_MIGRATION_NEXT`

**Production URL:** `https://youtube-ai-factory.quach-hung.chatgpt.site`

## Canonical recovery source

The canonical source is `origin/main` of this repository. Project memory and prior chats may help discover context, but a new chat must continue from the tracked knowledge base and exact Git state.

## Required new-chat sequence

1. Read `AGENTS.md`.
2. Read `docs/README.md` and its canonical sequence.
3. Verify `git rev-parse HEAD`, `git status --short --branch` and `git remote -v`.
4. Run `npm run check:docs`.
5. Read the current roadmap wave and only the documents it names.
6. Reconcile production/runtime state before any externally mutating action.

## Current handoff truth

- The latest code baseline before knowledge consolidation is `5b669fc9230f5b012ebe4aa2c0b5c21fa50df890`.
- FP1 truthful operator projection is implemented.
- FP2 Capability Registry mechanism is implemented.
- One of 22 capability/operation bindings is qualified.
- FP3 deterministic ShotCueProgram is sealed: 80.252 seconds, eight typed shots/treatments, zero timing/schema gaps, zero provider requests and zero spend.
- FP3.1 Production Integrity is active. Sites v388 failed safely before publish on duplicate historical default fencing tokens; corrected migration `0050` became active in Sites v389. Sites v390 zero-dispatch runtime acceptance passed with unchanged provider/spend totals. Sites v391 removed the temporary QA source authorization path; its environment key is absent and a retired QA header is rejected with `401`.
- Production currently reports 56 historical provider requests (49 completed, seven failed), zero active requests and actual recorded spend of `$13.247131145833333`; FP3.1 added zero requests and zero spend.
- `VQ-M0-SAFETY-SCOPE` remains `NOT_EVALUATED`. FP3.1 proves the fail-closed infrastructure, not the financial-content safety evidence needed to open dispatch.
- Golden r9 is immutable rejected evidence.
- Golden r10, Stage 11, Videos 2–15 and auto-publish are blocked.
- Paid FP4 authority has not been granted.
- Wave 2 source defines all eight `LEARNING_READY_CONTRACT_PACK_V1` contracts plus migration `0051`, fail-closed validators, operator projection and regression coverage.
- Sites v392 applied `0051` and passed zero-dispatch read-back: eight schema rows, zero rows across nine artifact/receipt tables, zero reservations/traces, no worker errors and unchanged provider totals of 56 requests and `$13.247131145833333`. It creates no actual channel/video artifacts and activates no learning command.
- Wave 3 WP7 corpus byte reconciliation is production-complete. Paid FP4/FP5 remains unauthorized.
- Wave 3 adds `EVALUATION_FOUNDATION_V1`, migration `0052`, candidate/gold verification, correlation control, blinded datasets, eleven defect families and assurance qualification metrics.
- Sites v393 deployed source `100901c1f064d91f3663df9d92bcc38bacd5797c`. Live read-back reports 595 candidate artifacts, 15 rejected packages, zero verified fixtures, zero gold-eligible fixtures, zero sealed datasets and zero release-eligible fixtures.
- Sites v394 is the documentation-only closing checkpoint; it introduces no runtime or data mutation beyond the accepted v393 feature source.
- Sites v395–v397 activated migration `0053`, hardened idempotent form navigation and completed 30 bounded runs. Production read-back reports 595/595 byte-verified, 588 checksum PASS, 583 provenance PASS, 520 rights PASS, 63 rights-pending, 12 blocked and 851,549,647 bytes read.
- Verified fixtures, gold-eligible fixtures, sealed datasets and release-eligible fixtures remain zero. Production provider totals remain 56 historical requests, zero active and `$13.247131145833333`; corpus verification added zero requests and zero spend. M0 Safety Scope is still `NOT_EVALUATED` and Golden r10 remains ineligible.
- The next protected action is to investigate the 12 blocked candidates, collect 63 rights receipts and owner-confirmed labels, then de-duplicate/correlation-control the corpus before any dataset is sealed or assurance provider is called.
- Sites v399 activated blocked-evidence diagnostic v1. Sites v400 field-fact read-back proves seven source/object hash and byte-size divergences plus five checksum-PASS metadata-only binding conflicts. Rights bases are eight incomplete-authorship and four missing-provider-terms records; no identifiers, hashes, byte values or raw metadata are exposed.
- Migration `0054` and `EVALUATION_EVIDENCE_DISPOSITION_V1` are source-ready: append twelve immutable incidents, quarantine seven byte-divergent candidates as `EXCLUDED`, retain five metadata-only candidates as `BLOCKED`, and preserve every R2 object, D1 artifact and verification receipt. Production migration/read-back is pending.
- `OWNER_STANDING_PRODUCTION_AUTHORITY_V1` permits future roadmap-bounded deploy, migration, production QA and provider calls without repeated chat confirmation, but never bypasses capability/settings, budget, rights, safety, idempotency or fencing gates and does not authorize publish/delete/weaken actions.

## Protected no-rerun list

Do not:

- reconstruct or rerun completed Niche, Channel Strategy or Content Planning slices without a new verified defect;
- treat historical Production Engine V2 masters as reusable or release-eligible;
- restore generic fallback, placeholder eligibility or routine QA-guided repair loops;
- render Golden r10 or open Stage 11 before required qualifications pass;
- dispatch providers, migrate production data or deploy without standing/typed authority and runtime reconciliation; publish, delete legacy state or weaken a hard gate without their separate owner-bound command.

## Rollover-ready gate

A material session is ready to roll over only when intended changes are committed, pushed to `origin/main`, documentation checks and relevant regressions are recorded, local HEAD equals the remote and the worktree is clean.

Historical FP2/FP3 bundles and archives remain external derivative recovery exports. They are not required for ordinary continuation and are not project authority.
