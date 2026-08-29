# AI Factory Commercialization Specification

Canonical source: HungQuach301/youtube-ai-factory/main  
Uploaded copy purpose: Project orientation only  
Conflict rule: GitHub main wins  
Version: 2.0 — Evidence-led pilot

## 1. Objective

Choose a commercial direction only after the factory demonstrates:

- release-eligible output;
- repeatable production;
- controlled cost;
- qualified external demand or engagement evidence;
- acceptable human intervention;
- secure rights and publication operations.

## 2. Candidate models

### A. Owned media portfolio

The factory operates one or more owned channels and monetizes audience,
sponsorship, affiliate, licensing, or related media revenue.

Strengths:

- direct ownership of channel and learning data;
- no customer-facing product requirement;
- fastest path to validate content and production economics.

Risks:

- platform concentration;
- delayed or volatile monetization;
- content-market uncertainty.

### B. Managed production service

The factory produces research-backed videos or channel operations for clients.

Strengths:

- earlier revenue signal;
- human review is compatible with service delivery;
- customer pain can guide productization.

Risks:

- customization and service labor;
- approval delays;
- rights and brand liability.

### C. SaaS or platform

Customers operate isolated factory workspaces.

Strengths:

- recurring software revenue;
- scalable if workflow and infrastructure are stable;
- productized learning across tenants when legally permitted.

Risks:

- tenant isolation;
- per-tenant secrets and channels;
- billing, support, availability, deletion, privacy, and compliance;
- current Sites-first architecture is not sufficient for multi-tenant production.

## 3. Evidence stages

### Stage 0 — technical readiness

Required:

- GitHub-first deployment;
- authentication and actor separation;
- rights and lineage;
- cost reservation and reconciliation;
- YouTube OAuth technical canary;
- daily analytics ingestion.

No business-model decision is made here.

### Stage 1 — production pilot

Required:

- at least five release-eligible published videos;
- exact cost and human-intervention measurement;
- no unresolved production P0;
- at most two QA repair rounds for accepted outputs;
- rights and publication receipts.

Five videos are enough for a pilot review, not broad statistical calibration.

### Stage 2 — external evidence

Required:

- sixty qualified analytics days across the pilot set or an explicitly approved
  alternative observation design;
- traffic-source qualification;
- retention and watch-time evidence with availability status;
- demand evidence such as inbound requests, pilot willingness, or channel growth;
- uncertainty and sample limitations stated.

Calendar rows with no qualified traffic do not satisfy the requirement.

### Stage 3 — commercial experiment

Select one bounded experiment for A, B, or C. Do not build all three.

## 4. Decision matrix

| Question | Evidence | Direction |
|---|---|---|
| Does content retain qualified viewers? | Watch time, retention, repeat views | Supports A |
| Will a client pay for output or operation? | Qualified conversations, paid pilot | Supports B |
| Do multiple users need the same workflow with limited customization? | Repeated demand and stable workflow | Supports C |
| Is human intervention falling? | Minutes and approvals per video | Supports scale |
| Is actual cost controlled? | Reconciled cost/video | Supports all |
| Can rights and security be assured repeatedly? | Receipts and zero critical incident | Mandatory for all |

## 5. Pilot thresholds

Initial hypotheses, subject to evidence:

| Metric | Pilot threshold |
|---|---:|
| Release-eligible videos | ≥5 |
| Qualified analytics observation | ≥60 days or approved equivalent |
| Videos with adequate qualified traffic | ≥3 |
| Median 30-second retention | Record and compare; do not hardcode final viability from five samples |
| Actual cost per video | Within approved unit economics |
| QA repair rounds | ≤2 |
| Unreconciled spend | 0 |
| Rights or publication incident | 0 |
| GitHub/Sites unexplained drift | 0 |

Thresholds are pilot decision aids, not universal truths.

## 6. Model A readiness

Choose an owned-media pilot when:

- the content hypothesis shows credible engagement;
- production throughput and cost are acceptable;
- channel strategy has a defensible winning criterion;
- the team accepts platform concentration risk.

First experiment:

- one channel;
- one content hypothesis;
- bounded video series;
- declared distribution;
- exact learning plan.

## 7. Model B readiness

Choose a managed-service pilot when:

- at least two qualified prospects describe a repeated pain;
- one prospect accepts a paid or formally scoped pilot;
- delivery rights, brand approval, revision limits, and liability are documented;
- production does not require uncontrolled custom engineering.

Pilot contract must define:

- inputs;
- deliverables;
- review and acceptance;
- revision cap;
- rights;
- publication responsibility;
- data handling;
- price and cost cap.

## 8. Model C readiness

Do not choose SaaS until all exist:

- tenant isolation;
- per-tenant authentication and authorization;
- per-tenant secret and OAuth isolation;
- per-tenant D1/R2 or proven row/object isolation;
- billing and quota enforcement;
- audit and deletion;
- portability beyond a single owner's Sites project;
- support and incident model;
- stable repeatable workflow.

The current single-owner GPT Site can validate workflow but is not, by itself,
a commercial multi-tenant architecture.

## 9. Learning and judge calibration

External metrics may calibrate:

- hook strength;
- pacing;
- narrative structure;
- topic relevance;
- visual engagement;
- audience fit.

They do not calibrate:

- factual correctness;
- commercial rights;
- policy compliance;
- audio synchronization;
- exact lineage;
- security.

Those require human defect labels, technical measurements, and rights evidence.
Do not remove a necessary judge merely because it has low correlation with
retention.

## 10. Unit economics

For each video record:

- model and provider cost;
- media licensing;
- compute and storage;
- retries and discarded candidates;
- human review minutes;
- publication and analytics operations;
- actual reconciled total;
- cost per accepted minute;
- cost per qualified view when meaningful.

Planned cap, reserved amount, committed amount, reconciled amount, and actual
spend remain distinct.

## 11. Go, iterate, and stop decisions

### GO

- evidence supports one model;
- production controls are stable;
- unit economics are plausible;
- no unresolved P0.

### ITERATE

- production is safe but content/demand signal is inconclusive;
- a specific evidence-backed treatment can be tested.

### STOP OR PIVOT

- every qualified pilot fails the predeclared engagement hypothesis;
- prospects do not validate willingness to pay;
- rights or security cannot be controlled;
- unit economics remain outside a credible path;
- improvement work repeatedly adds control complexity without improving output.

Stopping is a valid program outcome.

## 12. Commercial decision receipt

The final decision records:

- evidence period;
- videos and traffic qualification;
- production reliability;
- actual unit economics;
- human intervention;
- customer evidence;
- risks;
- selected model;
- rejected alternatives;
- next bounded commercial experiment;
- explicit stop conditions.

