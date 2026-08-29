# AI Factory Enforcement Kit

Canonical source: HungQuach301/youtube-ai-factory/main  
Uploaded copy purpose: Project orientation only  
Conflict rule: GitHub main wins  
Version: 2.0 — Pre-merge enforcement and post-deploy verification

## 1. Design principles

The enforcement system must:

- run before merge;
- inspect exact program structure rather than keywords;
- block new debt immediately;
- permit bounded removal of known debt through a reviewed ratchet;
- distinguish code verification from production verification;
- never push directly to main;
- never treat documentation comments as runtime implementation;
- never rely on a human-entered Sites version as mirror proof.

## 2. Workflow layout

Required:

    .github/workflows/ci.yml
    .github/workflows/security-audit.yml
    .github/workflows/production-surface-smoke.yml
    .github/pull_request_template.md

ci.yml runs on pull_request and merge_group for main. It may also run on pushes
to main for detection, but a push result does not replace the PR gate.

Recommended job groups:

    build-and-test
    architecture-policy
    security-policy

## 3. Candidate CI

The required candidate sequence is:

    npm ci
    npm run build
    npm test
    npm run check:docs
    node scripts/check-auth-coverage.mjs
    node scripts/check-no-write-in-get.mjs
    node scripts/check-actor-separation.mjs
    node scripts/check-migration-safety.mjs
    node scripts/check-gate-status.mjs
    node scripts/check-docs-growth.mjs
    node scripts/check-legacy-shrink.mjs

If the repository uses an existing verified build wrapper, CI uses that wrapper
instead of inventing a weaker command.

## 4. Auth coverage check

### Objective

Verify every exported HTTP handler, not every file.

### Required analysis

The check builds a handler registry containing:

- route path;
- HTTP method;
- source file;
- handler export;
- route classification;
- authentication guard;
- authorization guard for writes;
- explicit public allowlist reference where applicable.

### PASS conditions

- Every exported handler is classified.
- OWNER_READ invokes owner authentication on all paths.
- OWNER_WRITE invokes authentication and authorization before mutation.
- AUTOMATION validates scoped token and exact command.
- PROVIDER_CALLBACK validates signature, timestamp, nonce, and replay.
- PUBLIC_READ and HEALTH appear in an exact reviewed allowlist.

### Invalid evidence

None of these alone counts:

- import of an auth helper;
- unused helper call after mutation;
- token environment-variable name;
- comment;
- string literal;
- auth in a different handler in the same file;
- outer Sites login response.

### Ratchet

The initial baseline lists exact uncovered handler identities. CI fails when:

- a new uncovered handler appears;
- a protected handler loses protection;
- classification becomes ambiguous;
- baseline count increases.

A remediation PR may remove exact entries from the baseline. No PR may add a
baseline entry without an explicit security-debt approval.

At zero, the baseline is an empty array and remains enforced.

## 5. No-write-in-GET check

The check inspects every exported GET handler and its directly invoked
project-owned helpers.

It fails on reachable:

- insert, update, delete, upsert;
- cost reservation or settlement;
- provider dispatch;
- artifact creation;
- seed/bootstrap mutation;
- authority mutation;
- audit records that change business state.

Operational request logging may be allowed only through an exact reviewed
telemetry abstraction that cannot change business authority.

Seeding moves to an explicit authenticated owner command or migration.

## 6. Actor separation check

The check maintains the prohibited AGENT command family:

    CERTIFY_*
    APPROVE_*
    ACTIVATE_*
    COMMIT_*
    RELEASE_*
    PUBLISH_*

For every command handler it verifies:

- actor type is resolved;
- AGENT is denied before state change;
- exact owner/automation authority is required;
- the negative test proves zero mutation;
- audit identity is recorded.

Searching for actorType text is insufficient. The check consumes a structured
command registry or executes contract tests.

## 7. Migration safety check

The migration check fails on:

- duplicate numeric or logical identifiers;
- reordering of canonical applied migrations;
- modification or deletion of a baseline migration;
- reuse of an applied identifier;
- destructive statement without explicit reviewed marker and backup plan;
- schema change without expected read-back;
- migration not included in build output.

The baseline records hashes of applied canonical migration files. A future
compact baseline for a new environment is additive and never rewrites the
production history baseline.

## 8. Gate status check

The check reads a structured gate registry and validates:

- exactly one status per gate;
- issue reference for PARTIAL and NOT_IMPLEMENTED;
- source enforcement reference for IMPLEMENTED;
- positive and negative focused test references for IMPLEMENTED;
- production or qualification evidence reference when required;
- no contradictory status;
- no downstream authority beyond the gate contract.

A literal gate name in source and test is not sufficient.

Adding NOT_IMPLEMENTED makes the gap visible; it does not make the gate
implemented or the production chain complete.

## 9. Documentation and legacy ratchets

Ratchets must measure both existing and new files.

### File-size ratchet

- per-file maximum for known large files;
- aggregate source lines by domain;
- new file included in aggregate;
- reviewed exception has an expiry and issue.

### Documentation ratchet

- canonical document allowlist;
- active versus archive classification;
- new canonical document requires explicit purpose;
- deletion prohibited until constraints are migrated;
- generated execution receipts excluded because they belong in structured storage.

### Legacy ratchet

- exact legacy directories, modules, routes, tables, and tokens;
- count may stay equal or decrease;
- no new dependency from current code to legacy;
- protected legacy capability removed only after replacement evidence.

Baselines are created or changed in a normal pull request. Workflows never
receive contents:write merely to modify baselines.

## 10. Source-tree verification

SITES_VERSION.txt is optional human-readable metadata, not proof.

Before Sites checkpoint preparation, verification calculates:

- expected GitHub commit SHA;
- expected GitHub tree SHA;
- Sites checkout tree SHA or byte manifest;
- changed-file list.

Checkpointing is blocked when trees differ.

After deployment, the receipt records:

- merged GitHub SHA/tree;
- Sites source commit;
- Sites version;
- schema version;
- deployment status.

No script may print OK merely because the latest commit touched
SITES_VERSION.txt.

## 11. Production-surface smoke

GitHub-hosted unauthenticated smoke verifies only public exposure:

- protected endpoints return denial or platform sign-in;
- no private data appears;
- no write occurs;
- health/version surface reveals no secret.

It does not prove application auth behind an owner-only outer firewall.

Authenticated production verification is performed through ChatGPT Work/Sites
using the existing authenticated context and exact deployment. It verifies:

- expected owner read;
- expected unauthorized denial;
- changed bounded command if explicitly authorized;
- idempotent replay;
- D1/R2 read-back;
- provider and cost counts;
- environment cleanup.

## 12. Pull-request template

Every PR records:

    Work package:
    Goal:
    In scope:
    Out of scope:
    Authority change:
    Migration:
    Provider requests planned:
    Spend cap:
    Focused tests:
    Full tests:
    Production verification plan:
    Rollback or forward-recovery plan:
    Documentation changed:

## 13. Baseline bootstrap sequence

1. Add checks in inventory mode on a feature branch.
2. Generate exact structured debt baselines.
3. Review the baselines in the PR.
4. Merge only after ordinary build/tests pass.
5. Enable ratchet mode.
6. Make ratchet checks required.
7. Remediate debt through bounded PRs.
8. Remove baseline entries only when the corresponding gap is fixed.
9. Lock empty baselines when debt reaches zero.

There is no intentional permanently red main branch.

## 14. Required branch rules

- PR required.
- Required checks from expected GitHub Actions workflow source.
- Branch up to date.
- Conversation resolution.
- No force push.
- No deletion.
- No ordinary bypass.

Production-surface smoke is not a candidate PR check because it observes the
currently deployed production, not the candidate branch. It is a post-deploy
verification signal.

## 15. Check-change policy

Changes under scripts/check-* or .github/workflows require:

- explicit enforcement work package;
- explanation of strengthened or changed semantics;
- focused tests for false-positive and false-negative behavior;
- no simultaneous product-code workaround hidden in the same PR;
- owner review.

An ordinary product WP may not weaken, bypass, allowlist, skip, or delete a
failing enforcement rule.

## 16. Initial expected baselines

M0 must measure rather than assume:

- exact uncovered exported handlers;
- GET handlers with reachable writes;
- prohibited-command handlers lacking actor separation;
- migration duplicates and modified history;
- gate status and evidence completeness;
- legacy route/module/table/token inventory;
- canonical documentation count;
- GitHub/Sites source drift.

Counts written in an audit report are hypotheses until the machine inventory
produces an exact reproducible list.

## 17. Enforcement definition of done

The enforcement layer is ready when:

- required checks execute on every PR;
- main ruleset requires them;
- known debt is exact and ratcheted;
- checks contain negative tests proving common bypasses fail;
- the production deployment path verifies exact source;
- no workflow can silently push policy changes to main;
- one complete work package has passed PR, merge, exact-tree deploy, smoke, and
  receipt.

