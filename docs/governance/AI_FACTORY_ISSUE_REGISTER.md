# AI Factory Issue Register

Canonical source: HungQuach301/youtube-ai-factory/main  
Uploaded copy purpose: Project orientation only  
Conflict rule: GitHub main wins  
Baseline date: 2026-08-29

## 1. Priority definitions

| Priority | Meaning |
|---|---|
| P0 | Production, security, source authority, or program trajectory is invalid |
| P1 | Major capability or reliability gap; next milestone is constrained |
| P2 | Material maintainability, quality, or efficiency debt |
| P3 | Improvement not currently constraining the program |

## 2. Open P0 — exactly five

| ID | Name | Evidence | Exit condition |
|---|---|---|---|
| SX-11 | GitHub–Sites split-brain | GitHub at 0127; Sites saved source at 0128; merge does not deploy | M0-00 exact reconciliation and GitHub-first policy enforced |
| KT-01 | Production write routes lack complete application authorization | Known write routes can mutate or call providers without proven owner auth | Zero uncovered write handler |
| GV-01 | Production can change before required CI | Current Sites-first/manual-mirror loop runs Actions after production | Main ruleset and exact-tree post-merge deployment |
| NV-05 | Publish–measurement–learning loop is absent | No production YouTube publication and qualified Analytics loop | Technical canary plus qualified audience pilot and measurement_daily |
| SX-02 | Visual production quality blocks the first eligible video | R21 visual score 67; static slide patterns and missing visual forms | Release-eligible master with bounded QA and assurance PASS |

The Project Instructions test must return only these five IDs and names.

## 3. P1 — security and control

| ID | Issue | Required action |
|---|---|---|
| KT-02 | Route coverage is counted by files instead of exported handlers | Build exact handler registry |
| KT-03 | Outer Sites access can mask missing application auth | Separate network and app-layer tests |
| KT-04 | GET /api/projects performs writes or seeding | Move mutation to explicit owner command/migration |
| KT-05 | Legacy standing tokens have unclear scope and last use | Inventory, replace, revoke |
| KT-06 | Actor separation is not uniformly enforced | Structured command registry and negative tests |
| KT-07 | Provider callbacks need exact signature and replay controls | Callback contract |
| KT-08 | Secret lifecycle and rotation ownership are incomplete | Secret registry without values |
| KT-09 | Provider entitlement, rights, and drift may be inferred from generic binding | Capability-specific evidence |
| KT-10 | Publication authority is not yet implemented | Typed owner publication command |

## 4. P1 — source, CI, and data

| ID | Issue | Required action |
|---|---|---|
| SC-01 | No required pre-merge CI on canonical main | Add workflows and ruleset |
| SC-02 | Manual file copying cannot prove byte equality | Exact tree/manifest verification |
| SC-03 | SITES_VERSION.txt can produce false sync confidence | Deployment receipt with SHA/tree |
| SC-04 | Baseline workflows can push directly to main | Baselines through PR |
| SC-05 | Auth keyword scan can produce false green | Handler-level analysis |
| SC-06 | Gate literal/comment scan can produce false implementation claim | Structured evidence registry |
| DB-01 | Duplicate migration identifiers exist | Inventory and append-only correction |
| DB-02 | Migration squash risks rewriting applied history | Preserve canonical history |
| DB-03 | Code rollback does not reverse D1/R2 mutation | Forward-recovery plans |
| DB-04 | Runtime receipts are spread across narrative docs | Structured receipt storage |

## 5. P1 — product and quality

| ID | Issue | Required action |
|---|---|---|
| SX-01 | Zero release-eligible published videos | Complete M4–M6 |
| SX-03 | Output resembles static slides | Visual intent, animatic, form coverage |
| SX-04 | Real footage, diagram, chart, map, and motion diversity is not assured | Coverage contract |
| SX-05 | Mobile labels and visual hierarchy are inconsistent | Mobile visual QA |
| SX-06 | Repetitive topology and template residue persist | Prohibited-pattern checks |
| AU-01 | Voice/model qualification is not equal to finished audio quality | Full audio acceptance |
| AU-02 | Music, SFX, seams, prosody, and full-duration mix lack one exact gate | Audio capability and master assurance |
| RT-01 | Historical rights evidence cannot bind exact bytes | Controlled replacement and exact-byte rights |
| LN-01 | Composite lineage may lack exact parent manifests | Exact master gate |

## 6. P1 — external signal and commercialization

| ID | Issue | Required action |
|---|---|---|
| EX-01 | Technical upload and audience experiment are conflated | Separate canary and pilot |
| EX-02 | Unlisted is treated as if it automatically generates retention | Distribution and sample plan |
| EX-03 | Seven calendar rows can be empty or anonymized | Qualified-data exit condition |
| EX-04 | Retention is proposed as a label for unrelated quality dimensions | Multi-label calibration |
| EX-05 | Five videos are too few for general judge calibration | Treat as pilot evidence |
| CM-01 | Business model decision thresholds are hypotheses | Predeclare and update with evidence |
| CM-02 | SaaS path lacks tenant/security readiness | Do not choose SaaS before C-readiness |

## 7. P2 — maintainability

| ID | Issue | Required action |
|---|---|---|
| MT-01 | Large files and domains have accumulated without boundaries | Domain ratchets and reviewed exceptions |
| MT-02 | New files can bypass per-file growth baselines | Aggregate domain measurement |
| MT-03 | Documentation volume obscures current constraints | Canonical allowlist and archive |
| MT-04 | Execution records are narrative and repetitive | Structured receipts |
| MT-05 | Legacy routes, tables, fixtures, and tokens are not fully inventoried | M3 inventory |
| MT-06 | Removing legacy may also remove unique production capability | Preserve and prove before deletion |
| MT-07 | UI/backend projections can disagree | Projection contract and end-to-end read-back |
| MT-08 | Long-running chats may appear stuck | Explicit blocker/termination protocol |

## 8. Issue lifecycle

Status values:

- OPEN
- IN_PROGRESS
- BLOCKED
- VERIFIED_FIXED
- ACCEPTED_RISK
- DEPRECATED

Closing an issue requires:

- fixing PR;
- machine acceptance evidence;
- production evidence where applicable;
- no regression in required checks;
- issue-register update on GitHub main.

An agent may propose closure. Only evidence and the repository workflow establish
VERIFIED_FIXED.

## 9. Execution order

1. SX-11 and GV-01.
2. KT-01 and related handler inventory.
3. Source and migration safety checks.
4. Honest gate registry.
5. Technical YouTube connectivity.
6. Visual quality blocker.
7. Controlled audience pilot.
8. Legacy reduction and commercialization.

Do not use external publication to bypass rights, security, or source-control P0s.
Do not use more internal controls to postpone the direct visual blocker after
M0 and M1 are stable.

