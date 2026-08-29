# Data and Provider Control Plane

**State:** `ACTIVE_NORMATIVE`
**Policy:** `DATA_PROVIDER_CONTROL_PLANE_V1`
**Effective:** 2026-08-24

## Purpose

The Evidence and Provider Plane prevents stages from calling providers, storing files or inferring rights independently. Every frame must be traceable from audience need through claim, source, narration, visual intent, shot, asset, rights, provider request, render, QA and performance.

## Sources of truth by concern

| Concern | Authority |
|---|---|
| Code, contracts, schemas, policies, decisions and document truth | Git repository and canonical `main` commit |
| Operational state, command receipts, eligibility, cost and QA metadata | Cloudflare D1 |
| Active source bytes, derivatives, renders and raw evidence | Cloudflare R2 |
| User-controlled recovery/archive copy | Google Drive |
| Temporary render and development data | Local scratch only |

Google Drive is `USER_CONTROLLED_RECOVERY_ARCHIVE`, not an engineering SSOT or transactional database. No storage layer silently substitutes for another.

## Data domains

- Factory master data: providers, capabilities, visual grammars, rubrics, policies, cost rates, rights rules, prompts/schemas and qualification.
- Channel data: identity, market/language, audience, Visual DNA, voice, treatments, provider preferences, cost and release policy.
- Video planning: brief, claims, sources, script, narration, visual intents, Blueprint, Shot Contracts and chart/map datasets.
- Production/evidence: assets, derivatives, requests, rights, render jobs, scene graphs, exact master, findings and acceptance receipts.
- Performance/learning: impressions, CTR, retention, timecoded drop-off, treatment/capability yield, comments, experiments and promotions.

## Canonical entities

```text
Factory, Provider, Capability, CapabilityQualification,
Channel, ChannelVisualProfileVersion, SeriesFormat, Video,
Claim, SourceEvidence, NarrationSegment, VisualIntent, VideoBlueprint,
ShotContract, Asset, AssetVersion, RightsReceipt, ProviderRequest,
CostReservation, RenderJob, SceneGraph, Artifact, QaReceipt,
BrowserReceipt, ReleaseReceipt, PerformanceObservation, LearningPromotion
```

Critical link keys are `claim_id`, `canonical_timebase_id`, `artifact_hash` and `rights_receipt_id`. QA and release on one hash cannot authorize another.

## Asset lifecycle

1. `QUARANTINED`: ingest from official sources, owned files, Drive, stock, AI generation or internal engines.
2. Normalize MIME, dimensions, duration, frame rate, sample rate, language, provider identity, units, currency and timestamps.
3. Verify SHA-256, decode, MIME truth, corruption, exact and near duplicates.
4. Verify provenance, creator, license, commercial use, territory, modification permission, expiry, subscription/purchase and consent. `UNKNOWN` fails closed.
5. Register original bytes, locations, lineage, rights, cost, metadata and reuse eligibility.
6. Run the candidate tournament; eligibility alone does not select a winner.
7. Freeze exact bytes, rights receipt, crop/time range, cost and Shot Contract binding.
8. Create derivatives without mutating originals; store parent hash, transform manifest, tool/version and new hash.
9. Bind QA to exact master/source/deployment/evidence.
10. Archive frozen originals, champions, masters and receipts; reconcile D1/R2/Drive checksums and detect orphan/stale/unknown-rights/unmatched-cost state.
11. Bind performance to immutable production identity; promotion creates a new version rather than rewriting history.

## Provider Gateway

Business logic submits a typed work request to one gateway. It never calls a provider SDK directly or stores an API key.

The gateway owns authentication and secret scope, capability lookup, qualified routing, budget reservation, rate limits, idempotency, timeout/retry ceiling, native request ID, raw-response storage, schema validation, output hashing, usage/cost reconciliation, rights/retention policy, health and drift.

Projects reference `connection_id`; secrets do not enter project records, logs, prompts, Git or client-visible output.

## Provider binding contract

Every binding records:

```text
provider_id, capability_id, endpoint/model/version,
input_schema, output_schema, qualification_state,
allowed_archetypes, rights_policy, retention_policy,
rate_limit, unit_cost, timeout, retry_ceiling, max_payload,
fallback_binding, health, last_qualification, revocation_conditions
```

No qualified binding means no dispatch. Fallback is explicit, separately qualified and recorded; it cannot occur silently.

### Current executable boundary

Migration `0108` and `factory-provider-gateway` implement the zero-dispatch routing boundary. Provider, capability, binding, qualification, rights, cost-envelope, typed work-request and route-decision identities are append-only. Routing verifies active/healthy state, exact schema/settings/standard/archetype, qualification sample/yield/P0 floors, expiry, payload limit and commercial rights. `PLAN_ONLY` may return `PLANNED_ZERO_DISPATCH`; stale, unqualified or ineligible input is `BLOCKED`. `DISPATCH_ALLOWED` and automatic fallback remain blocked.

Migration `0113` and `factory-provider-control-plane` make the next paid-request controls executable without enabling a provider call. An atomic positive cost reservation must fit one exact active envelope and route decision; every reservation is structurally plan-only with zero dispatch, R22, master, release and publication authority. Provider-native observations are captured as append-only receipts with the exact native ID, response ID, raw-response hash, usage and actual cost. An unresolved observation becomes `UNKNOWN_SPEND_RESERVED`, never retry authority; only a later exact native reconciliation may settle the request. Binding/model/settings/schema/rights/qualification drift appends a `STALE` receipt that blocks the route. A fallback requires one explicit owner-approved, capability-matched, current-qualified authorization and still grants plan authority only. Conservative reservation accounting never credits budget back automatically; a later settlement-ledger policy must explicitly define release/credit semantics before dispatch can open.

Migration `0110` makes asset eligibility executable independently of provider dispatch. A SOURCE/HYBRID artifact is usable only when its materialized R2 key, MIME, size and SHA-256 read back exactly, its dependency is not stale, and the referenced rights receipt is commercially eligible and current for the declared territory/modification scope. The resulting immutable receipt is then required by the pixel/video canary planner. A provider-level rights receipt alone cannot authorize unknown or changed asset bytes.

Migration `0122` makes terminal historical-rights disposition executable without provider access and is live in owner-only Sites v554. A terms or plan document cannot repair an unavailable exact provider response, and same-package correlation cannot reconstruct an absent exact parent manifest. The classifier accepts only candidate-specific terminal provider no-match evidence or missing-lineage evidence; Production read-back verifies 46 provider failures plus 16 lineage failures, 62 failure-only quarantines and 62 controlled-fixture replacement requirements. It never converts a collection task into a rights receipt or mutates an old candidate.

Migration `0123` makes the zero-dispatch replacement-plan boundary live in owner-only Sites v557. Every `0122` terminal receipt produces one immutable work order with a fresh replacement identity, a unique correlation group and an explicit prohibition on using the historical bytes as a replacement or parent. Production D1 verifies 62 planned orders—46 provider audio and 16 composite master—with 62 unique groups, zero materialization and idempotent replay. Provider audio routes require new native request/response/artifact binding plus generation-time terms and paid-plan evidence. Composite routes require a new immutable exact-parent manifest with current rights coverage for every parent. Planning stores no output bytes, makes no provider request, reserves no spend and grants no downstream authority; materialization requires a separate typed, cost-reserved bounded batch. Temporary runtime values are absent at environment revision 68.

Migration `0126` adds a fail-closed exact-audio certification boundary without opening dispatch. It may register the `CONTROLLED_FIXTURE_CLEAN_AUDIO_SYNTHESIS/V1` ElevenLabs binding only after the old commercial clean-control evidence chain, current R2 bytes, active paid subscription, pinned voice, pinned non-beta model and current official commercial-license source all reconcile. The bounded observation performs three provider metadata GETs and one public rights GET, stores no credential or generation payload, and records zero synthesis requests/spend. A complete observation appends one exact qualification, current rights eligibility and `CURRENT` drift receipt; an incomplete observation appends only `BLOCKED`. Canonical work request, route decision, cost reservation and provider dispatch remain separate and absent.

Migration `0127` makes the next planning boundary executable while retaining zero dispatch. The assurance planner re-reads the immutable `0125` typed contract, exact `0126` binding/qualification/rights/CURRENT-drift identities and active request-scoped envelope, then runs the existing Provider Gateway at the supplied evaluation time. Only an exact `PLANNED_ZERO_DISPATCH` result may atomically freeze one canonical `PLAN_ONLY` work request, one route decision and one reservation for two requests / 80,000 USD micros through the fenced runtime writer. Expired or mismatched evidence appends a `BLOCKED` assurance receipt and no canonical provider row. A reservation neither calls ElevenLabs nor grants dispatch, synthesis, actual spend, retry, R22, master, release or publication authority.

Migration `0128` makes the paid-dispatch authorization boundary executable without performing dispatch. The authorizer binds only to the exact `0127` work request, route decision and reservation; rechecks current qualification, commercial rights, latest CURRENT drift, active request envelope and zero provider-native/reconciliation rows; then observes the current paid subscription, pinned voice, pinned non-beta model and official commercial-license source. Exact subscription and official-rights response bytes must survive R2 read-back before one 15-minute authorization can grant one request / 80,000 micros. The authorization action records zero synthesis, zero actual provider requests and zero actual spend. A later typed executor must consume the exact authorization, capture the native request identity and exact bytes, and reconcile actual cost; no retry or fallback is implied.

## Approved capability plan

| Capability | Preferred route | Control boundary |
|---|---|---|
| Reasoning, vision and structured QA | OpenAI | Structured receipts; no AI-generated exact charts/maps/evidence |
| Stable en-US narration | ElevenLabs | Frozen voice/model/settings/dictionary and commercial entitlement |
| Paid hero/reality footage | Shutterstock | Search and license are separate; store license receipt and exact bytes |
| Supporting B-roll | Pexels/Pixabay | Source/creator/license snapshot; no hotlink Production dependency |
| Owned media and archive | Google Drive | Hash, rights/consent, registry and tournament still required |
| Diagrams/charts/maps/ledgers | Internal SVG/Canvas/D3/MapLibre engines | Verified data, arithmetic and code-native rendering |
| Composition/render | Scene Graph compositor and FFmpeg | Deterministic timebase, lineage and worker fencing |
| Music/SFX | Owned licensed library, then qualified stock | Music contract, Content ID risk, loudness and ducking |
| Browser evidence | Controlled browser runtime | Evidence only; no release authority |
| Publishing/analytics | YouTube APIs after Release Gate | Connection separated from Production and QA |

Provider/model names may change; the qualified binding and its version, not brand familiarity, is authoritative.

## Paid request lifecycle

```text
PLAN -> RESERVE_COST -> CHECK_QUALIFICATION -> CHECK_RIGHTS_SAFETY
-> CLAIM_IDEMPOTENCY -> DISPATCH -> CAPTURE_NATIVE_ID
-> STORE_RAW_RESPONSE -> PARSE_VALIDATE -> HASH_OUTPUT
-> RECONCILE_ACTUAL_COST -> COMPLETE_OR_FAIL
```

On timeout, reconcile provider status before retry. A known active request waits; pre-dispatch failure may retry within ceiling; unknown state becomes `UNKNOWN_SPEND_RESERVED`. Never create a second request merely because the caller timed out.

The current implementation reaches a source-qualified short-lived dispatch authorization but still stops before `DISPATCH`: no synthesis client call, paid request or retry path is exposed by `0128`. Secret-scoped execution, exact output storage/read-back, native identity capture, live rate-card reconciliation and accepted-output unit economics require the next separate implementation and qualification.

## Data-quality gates

| Gate | Required evidence |
|---|---|
| Source | Stable URL/ID, retrieval time, publisher/creator |
| Claim | Evidence binding, confidence and contradiction state |
| Asset | Exact hash, decode, rights and provenance |
| Chart/map | Source dataset, unit/date and arithmetic/spatial validation |
| Provider | Qualified binding, native request ID and schema-valid output |
| Cost | Reserved, actual and reconciled |
| Render | Parent lineage, transform manifest and exact hash |
| QA | Exact-artifact binding, timecoded evidence and judge qualification |
| Archive | D1/R2/Drive checksum reconciliation |
| Learning | Minimum evidence, controlled comparison and no single-video promotion |

## Reliability, privacy and recovery

- Append-only command and evidence records; deterministic state transitions.
- Exclusive leases, fencing tokens, bounded retries and emergency stop.
- Structured logs and traces without secrets or raw private provenance in operator UI.
- Provider drift and rate-card changes make dependent qualifications stale.
- Retention/deletion follows policy and preserves required legal/audit evidence.
- Recovery restores Git identity first, then reconciles D1 metadata, R2 bytes and Drive archive; no archive can override runtime evidence.

## R22 data package

R22 requires Channel Visual DNA V1, exact R21 failure receipts, claim graph, narration segments, visual intents, Video Blueprint, Shot Contracts, candidate/rights manifests, chart/ledger datasets, Scene Graph, exact audio, exact master, AI QA and Browser evidence. No R22 provider dispatch is authorized until the bounded plan, qualification, rights, cost, idempotency and safety gates pass.
