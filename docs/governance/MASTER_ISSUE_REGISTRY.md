# Master Issue Registry

**Registry version:** `MASTER_ISSUE_REGISTRY_V1`
**Reconciled:** 2026-08-21
**Total original A–G findings:** 47 = 9 P0 + 28 P1 + 10 P2

## Status definitions

- `CONFIRMED_MANDATORY`: verified gap; roadmap and exit evidence required.
- `ACCEPTED_DESIGN`: direction accepted; implementation may be staged.
- `CALIBRATION_REQUIRED`: metric, threshold or tool must be benchmarked first.
- `PARTIAL`: mechanism exists but does not yet satisfy the full requirement.
- `HANDLED`: active source already addresses the substance; retain regression coverage.
- `CORRECTED`: original interpretation was inaccurate; the corrected requirement applies.
- `PRODUCTION_EVIDENCE_REQUIRED`: source inspection is insufficient for closure.

## A — State model and governance

| ID | Priority | Finding | Reconciled disposition | Owning wave |
|---|---:|---|---|---|
| A1 | P0 | `FROZEN` conflates immutable bytes with downstream eligibility | `HANDLED__PRODUCTION_ACTIVE`: independent stored state is active; historical lineage backfills immutable but blocked | FP3.1 |
| A2 | P0 | M0 Safety Scope is not evaluated on financial content | `PARTIAL__PRODUCTION_ACTIVE`: fail-closed state and deterministic lint are active, but actual content evidence remains `NOT_EVALUATED` and dispatch-blocking | FP3.1 |
| A3 | P0 | No automatic supersede when capability/settings version changes | `HANDLED__PRODUCTION_ACTIVE`: authorization supersedes stale capability version or settings hash | FP3.1 |
| A4 | P1 | `NOT_EVALUATED` is presented with `FAIL` | `HANDLED__PRODUCTION_ACTIVE`: stored state, incident projection and blocking semantics are distinct | FP3.1 |
| A5 | P1 | Stage 11 control can appear READY while upstream repair is required | `HANDLED__PRODUCTION_ACTIVE`: effective control projection is `ROOT_REPAIR_REQUIRED` despite stored Stage 09 `READY` | FP3.1 |
| A6 | P1 | Golden first-pass failure escalation lacks owner/SLA | `ACCEPTED_DESIGN`: architecture incident owner and bounded escalation required | FP3.1/WP7 |
| A7 | P1 | Pilot mode exists; scale/sampling rules do not | `CONFIRMED_MANDATORY` before second channel | Scale |
| A8 | P1 | Rejected fixture can be labelled release-ready | `PARTIAL__PRODUCTION_ACTIVE`: all 595 candidates were byte-read; 12 blocked and 63 rights-pending remain ineligible, and all 595 remain zero release-eligible pending owner labels/correlation control | WP7 |
| A9 | P2 | Fifteen videos contracted before Video #1 qualification | `ACCEPTED_DESIGN`: preserve briefs, issue downstream contracts in bounded batches | Video #1/Scale |
| A10 | P1 | R2–Drive reconciliation has no clear owning package | `CONFIRMED_MANDATORY` before master/publish | Technical media |

## B — Measurement validity

| ID | Priority | Finding | Reconciled disposition | Owning wave |
|---|---:|---|---|---|
| B1 | P0 | Assurance capability has no qualified ground truth | `PARTIAL__DIAGNOSTIC_SOURCE_READY`: the 595-object byte substrate is reconciled and blocked-reason aggregation is tested, but production cause read-back, 63 rights receipts, owner labels and independence control remain; no fixture, gold set or assurance capability is qualified | WP7 |
| B2 | P0 | ASR/alignment tool and error floor are not pinned/calibrated | `CONFIRMED_MANDATORY`; exact stack and thresholds require calibration | Technical media/WP7 |
| B3 | P0 | Independent QA is procedural rather than architectural | `PARTIAL__PRODUCTION_ACTIVE`: blinded datasets and accountable label sources are live; independent provider/model-family or human P0 adjudication remains unqualified | WP7 |
| B4 | P1 | Critic repeatability is unmeasured | `PARTIAL__PRODUCTION_ACTIVE`: repeat policy and per-family metric are live; actual provider repeatability remains calibration-required | WP7 |
| B5 | P1 | Three temporal samples cannot detect between-sample artifacts | `HANDLED`: Stage 12 owns full decode; samples remain perceptual evidence only | Regression |
| B6 | P1 | No sealed performance prediction for Stage 16 comparison | `PARTIAL__PRODUCTION_SCHEMA_ACTIVE`: composition/seal schema is deployed; no Video #1 prediction is sealed | Contract Pack |
| B7 | P2 | Creative-route diversity is declared, not measurable | `ACCEPTED_DESIGN`; taxonomy and thresholds require calibration | Upstream quality |
| B8 | P1 | Hybrid-shot classification is undefined | `CONFIRMED_MANDATORY`; motion measurements support but do not solely decide classification | Technical media |
| B9 | P2 | Perceptual audio model could be used for deterministic mix measurements | `HANDLED`: keep BS.1770/FFmpeg deterministic and model scope perceptual | Regression |
| B10 | P1 | Yield is measured without cost per sealed artifact | `CONFIRMED_MANDATORY` | FP3.1/Measurement |

## C — Technical standards

| ID | Priority | Finding | Reconciled disposition | Owning wave |
|---|---:|---|---|---|
| C1 | P0 | VP9+Opus distribution render is treated as master | `PARTIAL__PRODUCTION_SCHEMA_ACTIVE`: deployed delivery schema separates archival/mezzanine and distribution; Stage 13 runtime is not qualified | Contract Pack/Technical media |
| C2 | P1 | Fixed 90–180 shot count conflicts with content-derived pacing | `CONFIRMED_MANDATORY`: remove fixed floor; proposed adaptive values need calibration | Upstream quality |
| C3 | P1 | Creative champion floor has no execution headroom | `CALIBRATION_REQUIRED`: do not hard-code 95 without labelled evidence | Upstream quality |
| C4 | P1 | One A/V sync tolerance covers incompatible archetypes | `ACCEPTED_DESIGN`; visible-lip and archetype thresholds require calibration | Technical media |
| C5 | P1 | No source frame-rate conversion policy | `CONFIRMED_MANDATORY` | Technical media |
| C6 | P2 | Contract-to-master duration needs a one-frame bound | `HANDLED`: preserve and test the existing duration constraint | Regression |
| C7 | P2 | The 35/45/20 motion mix creates a narrow feasible boundary | `CALIBRATION_REQUIRED` | Technical media |
| C8 | P2 | Five-word captions may create excessive events and sync risk | `CALIBRATION_REQUIRED`; breath groups are a candidate | Technical media |
| C9 | P2 | Executive Producer and Competitive Editor lack independent floors | `ACCEPTED_DESIGN`; calibrate with packaging/assurance gold sets | WP7 |
| C10 | P2 | Treatment terminology is inconsistent | `CONFIRMED_MANDATORY`: canonical glossary required | Contract Pack |
| C11 | P2 | Stage 01 sources and freshness policy are vague | `CONFIRMED_MANDATORY`; windows remain source-type configurable | Upstream quality |

## D — Tools and capabilities

| ID | Priority | Finding | Reconciled disposition | Owning wave |
|---|---:|---|---|---|
| D1 | P1 | Compositor throughput/cost is unmeasured | `CONFIRMED_MANDATORY`: benchmark every archetype; qualify dependencies first | Technical media |
| D2 | P1 | Rights are fields rather than a versioned licence-lineage object | `PARTIAL__PRODUCTION_ACTIVE`: versioned rights/compliance schema and exact reconciliation are live; 520 candidates pass while 63 require explicit provider receipts, and the 12 blocked candidates have a sanitized diagnostic pending production read-back | Contract Pack/Technical media |
| D3 | P1 | Model aliases and updates can halt or silently change behavior | `PARTIAL__PRODUCTION_ACTIVE`: settings-hash supersede is deployed; immutable provider IDs and shadow qualification remain provider-specific work | FP3.1 |
| D4 | P1 | Production-audio provider decision is incorrectly hidden inside FP5 | `CONFIRMED_MANDATORY`: commercial/legal selection runs before FP5 | Technical media |
| D5 | P1 | FP4 qualifying all visual archetypes at once is big-bang | `CONFIRMED_MANDATORY`: benchmark all, qualify Video #1 dependency order first | FP4 |
| D6 | P2 | Narrator identity has no provider-deprecation continuity | `ACCEPTED_DESIGN`; voice evidence requires rights, privacy and retention controls | Contract Pack |
| D7 | P1 | Failed provider requests are not classified | `PARTIAL__PRODUCTION_ACTIVE`: taxonomy and lineage schema are deployed; zero-dispatch acceptance created no new provider failure to classify, and retention operations remain open | FP3.1 |

## E — Economics

| ID | Priority | Finding | Reconciled disposition | Owning wave |
|---|---:|---|---|---|
| E1 | P0 | Historical $20 plan conflicts with remaining production ambition | `CORRECTED`: the old plan is not FP4 authority; build a bounded cost model and new owner-approved envelope before dispatch | FP3.1/FP4 |

## F — Content and perceived quality

| ID | Priority | Finding | Reconciled disposition | Owning wave |
|---|---:|---|---|---|
| F1 | P0 | Upstream design criteria are misaligned with downstream assurance | `CORRECTED`: alignment gap is real; `V281` is a contract label, not 281 QA iterations | Contract Pack/Upstream quality |
| F2 | P1 | Story/retention/audience fail too late after full media spend | `PARTIAL__PRODUCTION_SCHEMA_ACTIVE`: pre-Stage-09 animatic schema is deployed; no animatic has been produced or accepted | Contract Pack |
| F3 | P1 | Parity rewards similarity without differentiation | `CONFIRMED_MANDATORY`; metric thresholds require calibration | Upstream quality |
| F4 | P1 | Stage 03 lacks a domain-aware source authority ladder | `CONFIRMED_MANDATORY` | Upstream quality |
| F5 | P1 | Personalized financial advice is checked too late | `PARTIAL__PRODUCTION_ACTIVE`: high-precision deterministic Stage 06 lint is deployed; semantic/human safety remains upstream quality work | FP3.1/Upstream quality |

## G — Documentation and runtime consistency

| ID | Priority | Finding | Reconciled disposition | Owning wave |
|---|---:|---|---|---|
| G1 | P1 | “FP2 implemented” can be mistaken for all capabilities qualified | `CORRECTED`: mechanism implemented; qualification content remains one of 22 bindings | Documentation/FP4–FP5 |
| G2 | P1 | Standards emphasize eight visual archetypes but omit audio/control/assurance detail | `CONFIRMED_MANDATORY` | Contract Pack/Technical media |
| G3 | P1 | Root scope was documented as 09/10 instead of 07A/07B/08/09/10 | `HANDLED`: current projection and documents contain all five roots | Regression |

## Cross-cutting findings added by later reviews

| ID | Priority | Finding | Disposition | Owning wave |
|---|---:|---|---|---|
| X1 | P0 | Canonical hashing is not unified across material lineage paths | `HANDLED__PRODUCTION_ACTIVE`: `JCS_NFC_V1` is shared by command, artifact, intent and lineage paths with property regressions | FP3.1 |
| X2 | P0 | Expiring leases do not prevent stale writers | `HANDLED__PRODUCTION_ACTIVE`: monotonic fencing, heartbeat and reconciliation are deployed; a stale/fake production heartbeat was rejected with `409` | FP3.1 |
| X3 | P0 | Spend is recorded after provider completion without atomic reservation | `HANDLED__PRODUCTION_ACTIVE`: transactional reservation and actual-cost ceilings are deployed and concurrency-tested; zero-dispatch acceptance preserved totals exactly | FP3.1 |
| X4 | P1 | End-to-end trace/span and provider-failure evidence are incomplete | `PARTIAL__PRODUCTION_ACTIVE`: redacted trace, reservation, lease and failure lineage are deployed; zero-dispatch acceptance correctly produced no trace, while retention/encryption operations remain open | FP3.1 |
| X5 | P0 | Packaging and publishing are absent from the authoritative video path | `PARTIAL__PRODUCTION_SCHEMA_ACTIVE`: packaging promise schema is deployed; metadata and typed publishing runtime remain open | Contract Pack/Video #1 |
| X6 | P0 | Learning loop lacks prediction and typed promotion | `PARTIAL__PRODUCTION_SCHEMA_ACTIVE`: prediction, candidate and promotion receipt schemas are deployed; runtime command and actual evidence remain open | Contract Pack/Learning |
| X7 | P1 | Experiment discipline is absent and N=1 can create false learning | `PARTIAL__PRODUCTION_SCHEMA_ACTIVE`: one-variable experiment schema is deployed; no experiment evidence exists | Contract Pack/Learning |
| X8 | P1 | Voice/visual/music identity is decided at video rather than channel level | `PARTIAL__PRODUCTION_SCHEMA_ACTIVE`: channel-scoped identity schema is deployed; no identity artifact is sealed | Contract Pack |
| X9 | P1 | Rejected-output quarantine is conflated with qualified asset reuse | `ACCEPTED_DESIGN`: preserve quarantine and build a separate qualified library | Scale |
| X10 | P1 | Platform compliance is not a separate channel-level risk plane | `PARTIAL__PRODUCTION_SCHEMA_ACTIVE`: compliance manifest schema is deployed; platform evidence and runtime gate remain open | Contract Pack/Video #1 |
| X11 | P1 | Exclusive one-video mode has no portfolio-scale successor | `ACCEPTED_DESIGN` before second channel | Scale |
| X12 | P1 | Owner approval has no explicit attention budget | `PARTIAL__PRODUCTION_ACTIVE`: Sites v409 reduces the WP7 queue from 525 immutable tasks to 82 actionable primaries while preserving 443 correlated variants; scale-wide delegation and escalation budgets remain open | Evaluation/Scale |
| X13 | P1 | External documentation and chat continuity were fragmented | `CONFIRMED_MANDATORY`; addressed by `GIT_REPOSITORY_SSOT_V1` | Wave 0 |
| X14 | P1 | Owner-label UI exposes technical taxonomy and asks humans to judge non-observable evidence | `PARTIAL__PRODUCTION_ACTIVE`: Sites v411 runs the three-step observable-media V2 and server-enforces system-evidence separation; first-owner-sample usability evidence remains pending | Evaluation |
| X15 | P0 | No mandatory browser-rendered exact-master acceptance gate exists before release | `PARTIAL__SOURCE_IMPLEMENTED`: `BROWSER_ASSURANCE_GATE_V1`, exact-hash task/receipt binding and fail-closed Browser UI are implemented under migration `0060`; fixture playback/motion/focus pass, while audible-audio and zoom/reflow qualification and production activation remain pending | Video #1/Assurance |

## Closure rule

No issue closes from a plan, schema description, UI label or chat statement. Closure requires the named code/document change, relevant test or benchmark, stored evidence, decision-log update, roadmap update and a pushed Git checkpoint.
