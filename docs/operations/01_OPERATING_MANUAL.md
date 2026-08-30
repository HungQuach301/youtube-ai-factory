# AI Factory Operating Manual

Canonical source: HungQuach301/youtube-ai-factory/main  
Uploaded copy purpose: Project orientation only  
Conflict rule: GitHub main wins  
Version: 2.0 — GitHub-first browser-only

## I. Mission

Build and operate an end-to-end YouTube production factory:

research → channel strategy → content planning → script → evidence → visual and
audio production → exact master → publication → measurement → learning.

The system must produce real English-language videos for the US market, improve
from external evidence, preserve commercial rights, and remain usable without
a local workstation.

## II. Operating surfaces

| Surface | Purpose | Authority |
|---|---|---|
| ChatGPT Project | Shared instructions and orientation files | Context only |
| ChatGPT Work chat | One bounded work package | Execution workspace |
| GitHub feature branch | Candidate source | Mutable |
| GitHub pull request | Review and required checks | Candidate verdict |
| GitHub main | Code and documentation SSOT | Canonical |
| GPT Site | Production deployment | Runtime only |
| D1/R2 | Runtime records and bytes | Runtime data |

Project Files are not live mirrors of GitHub. Each work package reads current
GitHub main before acting.

## III. Absolute project boundary

- Repository: HungQuach301/youtube-ai-factory
- Production: youtube-ai-factory.quach-hung.chatgpt.site
- Excluded: HungQuach301/youtube-ai-factory-v2

The excluded repository must not be read, compared, modified, synchronized, or
used as a source of inference.

## IV. Source and deployment rule

The only normal direction is:

GitHub feature branch → PR → required CI → GitHub main → exact-tree Sites deploy.

Sites-to-GitHub source copying is prohibited after the one-time M0-00
reconciliation of checkpoint 0128.

GitHub and Sites do not need identical commit identities. They must have
byte-equivalent source trees, and each deployment must record both identities.

## V. Actor authority

### Owner

May approve strategy, budget, release, publication, access, destructive cleanup,
and other business-authority actions.

### Agent

May inspect, plan, implement, test, refactor inside a work package, create a
branch and PR, read Actions, repair CI failures, and deploy a merged owner-only
version.

The agent does not gain business authority merely because it can edit code or
deploy infrastructure.

### Automation

May run only exact allowlisted commands under a scoped, signed, expiring token.

### Provider callback

May submit a result only for an existing request and must pass signature,
timestamp, nonce, and replay validation.

## VI. Absolute prohibitions

- No direct push to main.
- No production deploy before required CI passes and the PR merges.
- No force push or history rewrite.
- No secret in code, Project Files, logs, screenshots, PR text, D1, or R2 metadata.
- No application write route without authentication and authorization.
- No database mutation in GET.
- No provider dispatch without entitlement, rights, route, reservation,
  idempotency, and authority.
- No PUBLISH, RELEASE, APPROVE, CERTIFY, ACTIVATE, or equivalent command by an
  AGENT unless a separate owner-authorized contract explicitly permits invocation.
- No editing, deletion, reordering, squashing, or identifier reuse of applied
  canonical migrations.
- No multiple work packages in one branch, PR, or production checkpoint.
- No silent waiting when blocked.

## VII. Work package format

Use:

    WP-<milestone>-<number> · <short name>

    Mục tiêu:
    <one observable outcome>

    Đầu vào:
    <exact files, routes, tables, or gates>

    Hành vi:
    - <required change>
    - <required change>

    Nghiệm thu:
    - <machine check>
    - <runtime or data read-back>
    - <quantified expected delta>

    Không làm:
    - <out-of-scope area>
    - không sửa check để né lỗi
    - không deploy trước khi CI PASS

A work package has one primary outcome and should be safely reversible before
data mutation.

## VIII. Standard work-package loop

### 1. Start

- Open a new Work chat in AI Factory Execution.
- Name it WP-<id> · <short name>.
- Paste one work package.
- The agent reads AGENTS.md and only relevant canonical files.

### 2. Candidate implementation

- Create wp/<id>-<slug> from current GitHub main.
- Implement the smallest coherent change.
- Preserve unrelated code and user changes.
- Run focused tests first, then the full required checks.

### 3. Pull request

- Open one PR.
- Summarize scope, risks, tests, migrations, cost, and production verification.
- Read GitHub Actions directly.
- Repair causes on the same branch.
- Never ask the user to copy Actions logs when the GitHub connection can read them.

### 4. Merge decision

Merge only when:

- required checks are green;
- the branch is current with main;
- review conversations are resolved;
- the changed authority is understood;
- any migration has a backup and forward-recovery plan.

### 5. Sites deployment

- Resolve merged GitHub SHA and tree SHA.
- Open the existing Sites lifecycle checkout.
- Make the Sites source tree exactly match the approved GitHub tree.
- Run `npm run verify:deployment-tree -- --github-checkout <github-checkout> --sites-checkout <sites-checkout> --github-commit <merged-sha>`.
- Stop before checkpointing unless the structured result is `preparation_status: READY` and `git_tree_sha` exactly equals `sites_source_tree_sha`.
- Save one immutable version.
- Deploy owner-only unless wider access is explicitly authorized.
- Poll the exact deployment to terminal status.

### 6. Production verification

- Confirm expected deployment source.
- Verify anonymous denial where required.
- Run authenticated read-only smoke.
- For an authorized bounded mutation, use one idempotency key and replay.
- Read D1/R2 evidence.
- Confirm provider request and spend counts.
- Remove temporary flags and tokens.
- Redeploy the same source when environment cleanup requires it.
- Seal `DEPLOYMENT_RECEIPT_V1` only from the exact terminal deployment, current
  environment revision, current schema version, and the verified tree evidence.
- POST the sealed evidence once to `/api/factory/deployment-evidence`; replay the
  identical receipt only for read-back, never to replace evidence.
- GET the same projection and require matching receipt hash, Sites version,
  terminal `SUCCEEDED`, and `verification_result: PASS`.

### 7. Completion

Record a deployment receipt and report:

- merged PR and GitHub SHA;
- tree equivalence;
- Sites version and terminal status;
- test and build results;
- D1/R2 read-back;
- provider requests and actual spend;
- environment cleanup;
- remaining issue-register changes.

## IX. Definition of done

A work package is done only when all applicable items pass:

- PR merged;
- required CI green;
- exact merged tree deployed;
- terminal deployment succeeded;
- production verification passed;
- data read-back passed;
- temporary controls removed;
- receipt recorded;
- issue register and milestone status updated in canonical GitHub source.

Saved source, a local build, a green focused test, a deployment launch response,
or a matching filename alone is not completion.

## X. CI principles

CI is a pre-merge enforcement system.

- Known debt uses a ratchet baseline so CI is green while prohibiting regression.
- Partial remediation updates the baseline through review.
- At zero debt, the empty baseline becomes the permanent policy.
- Checks inspect exact handlers and contracts, not keyword presence.
- An implementation claim requires runtime enforcement and tests.
- Baseline creation occurs through a pull request, never a bot push to main.

Production smoke evaluates deployed behavior and is separate from candidate CI.

## XI. Data and migration policy

- New schema changes use a new monotonic migration.
- Applied migrations are immutable.
- Duplicate identifiers or conflicting migration order fail CI.
- Every migration documents expected affected rows and read-back queries.
- Backup and clone rehearsal are mandatory for destructive cleanup.
- Canonical history is not squashed merely to make the repository look smaller.
- After runtime mutation, recovery is forward-fix unless a proven compensating
  operation exists.

## XII. Provider and cost policy

Provider activity defaults to zero.

Before any paid dispatch, verify:

- typed request;
- capability-specific binding;
- current qualification;
- current entitlement;
- current commercial rights;
- current drift evidence;
- exact route;
- active envelope;
- exact reservation;
- dispatch authority;
- idempotency;
- settlement and reconciliation.

Budget caps are maximum authorization, not planned or actual spend.

## XIII. Quality policy

The target is a real video, not a slide sequence.

Mandatory qualities include:

- US English;
- one qualified voice;
- correct pronunciation, pacing, pauses, prosody, seams, music, and SFX;
- diverse visual forms: real footage, diagrams, charts, maps, motion graphics,
  and explanatory animation where semantically appropriate;
- no repetitive template topology;
- readable mobile labels;
- exact audio-visual timing;
- rights-clean exact bytes;
- right-first-time design with bounded QA loops.

Internal judges support decisions but do not replace external audience evidence
or human defect labels.

## XIV. Publication and learning

Technical upload verification and audience learning are separate.

- A technical canary uses a controlled rights-clean asset on a test channel.
- An audience pilot uses a release-eligible production artifact.
- Unlisted is not private.
- A calendar day with no qualified traffic is not learning evidence.
- Retention calibrates engagement hypotheses only.
- Rights, factual accuracy, policy, audio synchronization, and visual correctness
  require their own labels and tests.

Five videos and sixty days are a pilot decision point, not proof of statistical
generalization.

## XV. Documentation policy

Canonical documentation is limited to:

- AGENTS.md;
- program milestones;
- operating manual;
- enforcement kit;
- issue register;
- commercialization specification;
- source/deployment policy;
- auth/secrets/publication specification;
- production gate model.

Do not create one narrative document per execution. Runtime receipts belong in
structured storage or GitHub deployment records. Archive legacy documents only
after their active constraints have been migrated and verified.

## XVI. Blocker protocol

If blocked:

1. stop at a safe, non-mutating state;
2. state what is complete;
3. state what remains;
4. identify the root cause;
5. explain production, data, cost, and security impact;
6. provide the exact next action;
7. do not switch repository, Site, provider, or authority path.

If waiting on a user decision, end the turn with the question instead of
remaining indefinitely in a working state.

## XVII. Project instruction test

Expected:

    CODE_SSOT=HungQuach301/youtube-ai-factory/main
    DEPLOY_TARGET=youtube-ai-factory.quach-hung.chatgpt.site
    EXCLUDED_REPOSITORY=youtube-ai-factory-v2

If the answer differs, repair Project Instructions before starting execution.
