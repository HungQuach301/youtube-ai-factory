# Source and Deployment Policy

Status: Canonical after first merge  
Applies to: HungQuach301/youtube-ai-factory  
Excludes: HungQuach301/youtube-ai-factory-v2

## 1. Purpose

This policy prevents source split-brain between GitHub and GPT Sites while
supporting a browser-only operating model with no local workstation.

## 2. Authoritative topology

| Asset | Authority |
|---|---|
| Code and documentation | GitHub main |
| Work in progress | GitHub feature branch and pull request |
| Candidate verdict | Required GitHub Actions checks |
| Production artifact | Immutable GPT Sites version |
| Runtime configuration and secrets | GPT Sites environment |
| Runtime data | D1 and R2 |
| Deployment identity | Deployment receipt |

GitHub main is the only code SSOT. Sites may use a different internal commit
identity, but the deployed Git source tree must be byte-equivalent to the
approved GitHub tree.

## 3. One-time reconciliation

The only permitted Sites-to-GitHub synchronization is M0-00:

- GitHub main baseline: checkpoint 0127.
- Sites saved source baseline: version 569 / checkpoint 0128.
- Create branch reconcile/sites-0128 from GitHub main.
- Import the exact Sites 0128 content into that branch.
- Do not deploy, mutate D1/R2, or change environment variables.
- Compare full file manifests and Git tree hashes.
- Open a pull request and merge only after review and checks.

After M0-00, Sites-originated source changes are prohibited.

## 4. Normal change path

Every work package follows:

1. Create wp/<id>-<slug> from current GitHub main.
2. Implement only the bounded work package.
3. Run focused tests, full tests, production build, and documentation checks.
4. Open a pull request.
5. Required checks must pass.
6. Merge into main without force push.
7. Resolve the merged GitHub commit SHA and Git tree SHA.
8. Open the existing Sites lifecycle checkout.
9. Make its source tree exactly match the merged GitHub tree.
10. Verify the tree before checkpoint preparation.
11. Prepare and save one immutable Sites version.
12. Deploy owner-only unless the work package explicitly authorizes a wider audience.
13. Verify terminal deployment status.
14. Perform production verification and record the receipt.

No production deployment may occur before step 6.

## 5. Required GitHub protections

Main must enforce:

- pull request required;
- required status checks;
- branch must be up to date before merge;
- conversation resolution;
- branch deletion blocked;
- force push blocked;
- bypass disabled for ordinary actors.

One human approval is recommended when pull requests are authored by an agent
or bot. Do not require self-approval when the repository has only one human
account and that account authored the pull request.

## 6. Candidate CI versus production verification

Candidate CI runs before merge and evaluates the candidate source:

- dependency install;
- production build;
- unit and integration tests;
- documentation checks;
- auth coverage;
- actor separation;
- migration safety;
- route semantics;
- secret scan;
- gate status.

Production verification runs after deployment and evaluates the deployed
runtime:

- terminal deployment succeeded;
- expected source identity is present;
- anonymous requests receive the expected denial;
- authenticated read-only smoke passes;
- changed write path passes an idempotent bounded canary when authorized;
- D1/R2 read-back matches expected rows or bytes;
- actual provider requests and spend match the work package;
- temporary flags and tokens are absent.

Production verification never substitutes for pre-merge CI.

## 7. Deployment receipt

Every deployment receipt must contain:

| Field | Requirement |
|---|---|
| work_package_id | Required |
| pull_request | Required |
| github_commit_sha | Required |
| github_tree_sha | Required |
| sites_version | Required |
| sites_source_commit | Required |
| schema_version | Required |
| environment_revision | Required |
| deployment_status | SUCCEEDED |
| production_smoke | PASS |
| d1_readback | PASS, NOT_APPLICABLE, or exact failure |
| r2_readback | PASS, NOT_APPLICABLE, or exact failure |
| provider_requests | Exact integer |
| actual_spend_micros | Exact integer |
| temporary_controls_removed | true |
| verified_at | UTC timestamp |

The receipt belongs in a runtime control table or GitHub Deployment record. Do
not create a new narrative document for every deployment.

## 8. Failure and rollback policy

### Before merge

- Repair on the same feature branch.
- Never edit CI or policy scripts merely to make the check green.
- Split the work package if three repair loops do not converge.

### After merge, before deploy

- Do not deploy a mismatched tree.
- Create a corrective pull request or revert pull request.

### After deploy without data mutation

- A previous compatible Sites version may be redeployed after evidence review.

### After schema or data mutation

- Do not assume a code rollback reverses data.
- Stop additional writes.
- Preserve evidence.
- Apply the documented forward-fix or compensating migration.
- Verify D1/R2 before reopening writers.

## 9. Break-glass

Direct Sites source editing is permitted only for a production incident where
waiting for the normal path creates greater immediate harm.

Break-glass requires:

- owner authorization;
- exact incident scope;
- no destructive history operation;
- immediate capture of the changed tree;
- a GitHub reconciliation pull request before any later deployment;
- an incident receipt.

Break-glass is never used for routine feature delivery.

## 10. Definition of synchronized

GitHub and Sites are synchronized only when all are true:

- the expected GitHub commit is known;
- the expected Git tree is known;
- Sites source tree is byte-equivalent;
- the immutable Sites version was saved from that source;
- the deployed version matches the saved version;
- production verification passed.

A matching version number, filename, commit message, or SITES_VERSION.txt value
alone is not synchronization proof.

