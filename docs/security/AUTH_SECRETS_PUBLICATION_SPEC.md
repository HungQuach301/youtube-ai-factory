# Authentication, Secrets, Provider, and Publication Specification

Status: Canonical after first merge  
Applies to: YouTube AI Factory original production

## 1. Security model

Network-level Sites access and application-level authorization are separate
controls. Passing or failing one does not prove the other.

Every route must be classified as exactly one of:

| Class | Requirement |
|---|---|
| OWNER_READ | Authenticated ChatGPT owner |
| OWNER_WRITE | Authenticated owner plus write authorization |
| AUTOMATION | Scoped signed automation token and allowlisted command |
| PROVIDER_CALLBACK | Provider signature, timestamp, nonce, and replay protection |
| PUBLIC_READ | Explicit allowlist entry and no private data |
| HEALTH | Non-sensitive version/availability only |

No unclassified route may merge.

## 2. Handler requirements

Each exported HTTP handler is evaluated independently.

- GET must not perform business writes, seed data, reserve cost, dispatch work,
  create artifacts, or mutate control state.
- POST, PUT, PATCH, and DELETE require authentication, authorization,
  idempotency, validation, and an audit receipt.
- A helper imported but not invoked does not count as authentication.
- A token name, comment, string literal, or unrelated handler does not count as
  coverage.
- Multi-action handlers must authorize each action before mutation.

## 3. Actors and authority

| Actor | Permitted | Prohibited without separate authority |
|---|---|---|
| OWNER | Read, approve bounded work, manage deployment | None inside documented owner scope |
| AGENT | Plan, implement, test, open PR, deploy approved owner-only source | CERTIFY, APPROVE, ACTIVATE, RELEASE, PUBLISH |
| AUTOMATION | Exact allowlisted command with scoped token | Arbitrary command, scope escalation |
| PROVIDER_CALLBACK | Submit verified result for an existing request | Create request, reserve cost, approve output |

Authority is command-specific, time-bounded, environment-bound, and
non-transferable. An owner session does not automatically grant an agent
business publication authority.

## 4. Token contract

Automation and internal command tokens require:

- issuer;
- subject;
- actor_type;
- exact command allowlist;
- resource or work-package scope;
- environment;
- issued_at;
- expires_at;
- unique nonce;
- signature;
- replay ledger;
- revocation status.

Long-lived shared bearer tokens are legacy and must be retired through an
inventory and replacement plan.

## 5. Secret storage

Secrets may exist only in:

- GPT Sites secret environment variables;
- GitHub Actions encrypted secrets when a workflow genuinely requires them.

Secrets must never appear in:

- Git history;
- Project Files;
- AGENTS.md or documentation;
- issue or pull-request text;
- logs;
- screenshots;
- test fixtures;
- D1 rows;
- R2 object metadata.

Every secret must have an owner, purpose, scope, rotation procedure, revocation
procedure, and last-verified date.

## 6. Provider dispatch preconditions

A provider call is permitted only when all are current and exact:

1. typed work request;
2. qualified provider binding for the requested capability;
3. current entitlement;
4. current commercial-rights evidence;
5. current drift observation;
6. exact route decision;
7. active cost envelope;
8. exact cost reservation;
9. dispatch authority;
10. idempotency key;
11. correlation group;
12. settlement and reconciliation plan.

If any precondition is absent, expired, mismatched, or ambiguous, dispatch is
blocked with zero provider request and zero spend.

## 7. Cost control

Cost values use integer micros. Every paid request must:

- reserve before dispatch;
- never exceed request and spend caps;
- reconcile provider receipt after completion;
- release unused reservation;
- distinguish planned, reserved, committed, reconciled, and actual spend;
- preserve provider request IDs and evidence.

Retry uses the same business idempotency identity where safe and never creates
an independent unbounded reservation.

## 8. YouTube OAuth

The production OAuth design uses:

- a dedicated Google Cloud project;
- YouTube Data API v3;
- YouTube Analytics API;
- a Web application OAuth client;
- exact redirect URI;
- state validation;
- least-privilege scopes;
- encrypted refresh token storage;
- token rotation and revocation.

Required scopes:

- https://www.googleapis.com/auth/youtube.upload
- https://www.googleapis.com/auth/yt-analytics.readonly

OAuth Playground may be used only as a bootstrap with the project's own OAuth
client credentials. It is not a substitute for the production authorization
and revocation design.

An API key is added only for an explicit public-data use case. OAuth upload and
owner analytics must not depend on an unnecessary API key.

## 9. Publication command

A generic unaudited POST /api/publish is prohibited. Publication uses a typed
command with:

- owner publication authorization;
- target channel allowlist;
- exact master artifact ID;
- exact byte hash and R2 read-back;
- rights eligibility PASS;
- factual and policy assurance PASS;
- exact metadata version;
- privacy status fixed by the command;
- idempotency key;
- upload session state;
- YouTube response receipt;
- saved youtube_video_id;
- post-upload verification.

The default technical canary target is a dedicated test channel and privacy
status unlisted. Unlisted is not private and is never described as private.

The AGENT may prepare the publication command but may not invoke it unless the
work package contains explicit owner publication authority.

## 10. External-signal experiment

Two experiments are separate:

### Technical upload canary

- Uses a controlled, rights-clean canary artifact.
- Proves OAuth, upload, idempotency, receipt storage, and status read-back.
- Does not claim audience-quality evidence.

### Audience pilot

- Uses an imperfect but release-eligible production artifact.
- Has a declared distribution plan.
- Declares a minimum valid traffic/sample condition before launch.
- Separates organic and owner/test views where possible.
- Does not treat seven calendar rows with zero traffic as usable evidence.

An artifact labeled immutable rejected evidence is not used as the initial
audience-quality benchmark.

## 11. Analytics

measurement_daily stores:

- channel_id;
- youtube_video_id;
- metric_date;
- views;
- impressions when available;
- click-through rate when available;
- watch time;
- average view duration;
- retention curve or referenced retention artifact;
- traffic qualification;
- data availability status;
- fetched_at;
- source request receipt.

Retention is an engagement label. It does not validate factual accuracy,
commercial rights, audio synchronization, policy compliance, or visual defect
absence. Judge calibration requires separate human and technical labels for
those dimensions.

## 12. Incident response

On suspected unauthorized write, secret exposure, duplicate dispatch, or
publication mismatch:

1. close writers and dispatch gates;
2. revoke affected credentials;
3. preserve logs and receipts;
4. stop retries;
5. read D1/R2/provider state;
6. classify financial and publication impact;
7. apply forward repair;
8. rotate secrets;
9. verify replay resistance;
10. record the incident and control improvement.

