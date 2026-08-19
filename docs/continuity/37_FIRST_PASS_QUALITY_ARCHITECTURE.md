# First-Pass Quality Architecture

Date: 2026-08-19 (Asia/Bangkok)

Status: authoritative production doctrine for every new or repaired YouTube AI Factory output. This document supplements Documents 30–36. Where an earlier workflow treats an independent QA finding as a normal instruction for repeated output repair, this document is authoritative: production owns the complete Definition of Done, and independent QA confirms a sealed release candidate.

## 1. Outcome

The first output exposed to independent assurance must already be a release candidate that production has proved eligible. A raw model response, first provider result, first renderer frame, first TTS take or first composition is an internal candidate, not a production output.

The target lifecycle is:

```text
certify capability
→ compile executable contract
→ generate bounded internal candidates
→ select a champion
→ run production preflight
→ seal the first release candidate
→ perform one independent confirmation
```

The rejected lifecycle is:

```text
generate
→ expose draft as output
→ QA discovers production defects
→ patch the output
→ QA again
→ repeat
```

No architecture can guarantee that every future independent audit passes. The enforceable commitment is that a failed independent audit is exceptional capability evidence, not a routine editing loop. It stops scale, routes to the owning mechanism and requires requalification before another release candidate is produced.

## 2. Historical failure pattern and systemic correction

| Historical mechanism | Failure observed | Required correction |
|---|---|---|
| Descriptive rather than executable contracts | prompts requested semantic motion while the renderer still emitted flattened dashboards | typed scene, cue and evidence contracts consumed directly by the executor |
| First provider/model response treated as production | semantically broad stock or unstable TTS advanced too early | source, take and composition tournaments inside the production transaction |
| QA learned product requirements after render | visual strategy and sound-design defects surfaced at the master | one versioned Standard Registry shared by production preflight and assurance |
| Metadata substituted for pixels/playback | pan/zoom was counted as motion; contact sheets hid an 80-second slideshow | decoded temporal pixels, exact mix, full playback and mandatory provenance |
| Uncertified capability used on a live episode | renderer and audio mechanisms evolved through video-specific repairs | hardest-first archetype certification before production eligibility |
| Silent fallback | missing B-roll or motion collapsed to still images and camera movement | fail-closed route binding; route changes reopen the owning design stage |
| Placeholder eligibility | procedural tones and generic visuals crossed technical gates | placeholders may test plumbing but can never obtain release eligibility |
| Finding-level repair | a frame or mix defect was patched without fixing the reusable mechanism | root-cause repair must name the changed compiler, renderer, source, audio or QA mechanism |

## 3. First-pass does not mean one raw generation

The first externally visible output is the sealed champion. Internally, production may generate multiple bounded alternatives:

- four creative routes in Stage 04;
- several voice takes for the hardest passages in Stage 07A/10;
- six to twelve source candidates for a SOURCE or HYBRID unit in Stage 09;
- three materially different finished compositions for a critical visual;
- bounded music or SFX candidates where the sound contract requires comparison.

These alternatives are production work. They do not create QA iterations and they are not presented as finished output.

## 4. Definition of Ready

A stage may start only when its predecessor evidence is eligible, not merely present.

Universal readiness checks:

1. exact production context, active brief version and lineage hash;
2. all required predecessor revisions frozen and not superseded;
3. complete typed input schema with no defaulted critical field;
4. resolved M0–M2 standards and route-specific requirements;
5. provider, request, spend and rights plan within the approved envelope;
6. zero conflicting active request or expired unresolved lease;
7. no legacy or rejected artifact hash in candidate eligibility;
8. every required production capability certified for the input archetype.

Stage-specific examples:

- Stage 08 cannot start without locked narration, claim bindings, story beats and frozen sound/visual design.
- Stage 09 cannot dispatch without route, archetype, observable proof, negative constraints, treatment and rights route.
- Stage 10 cannot synthesize without voice identity, pronunciation, performance, cue and mix contracts.
- Stage 11 cannot compose any asset without current-revision bytes, checksum, rights and quality eligibility.

Failure of readiness costs zero provider spend and never consumes a production attempt.

## 5. Certified Capability Registry

The Factory must version and store qualification for each production capability. A capability is eligible only for the archetypes it has passed.

### 5.1 Visual archetypes

1. `TRANSACTION_STATE_PROOF`
2. `PROCESS_ROUTE`
3. `DATA_VISUALIZATION`
4. `DOCUMENTARY_LIVE_ACTION`
5. `SOURCE_AUTHORED_HYBRID`
6. `ABSTRACT_AUTHORED`
7. `RIGHTS_SENSITIVE`
8. `MOBILE_TEXT_INTENSIVE`

### 5.2 Audio archetypes

1. high-energy hook;
2. number-heavy narration;
3. dense mechanism passage;
4. authorization/clearing/settlement passage;
5. long-section continuity;
6. music transition and arrangement evolution;
7. causal SFX and ambience;
8. silence, consequence and payoff.

### 5.3 Qualification record

Each record binds:

```text
capabilityId
capabilityVersion
archetype
fixtureIds
standardVersion
firstPassYield
sampleSize
p0EscapeCount
qualificationState
evidenceHashes
qualifiedAt
revokedAt
```

An aggregate PASS from an easy fixture cannot authorize an untested archetype. A material code, provider, settings or Standard Registry change invalidates the affected qualification and requires bounded re-certification.

## 6. Executable production contracts

All stage artifacts use a canonical envelope:

```text
artifactId
artifactType
stageKey
revision
parentArtifactIds
productionContextId
canonicalBriefHash
contentHash
storageKeys
claimIds
timelineRange
rightsState
costState
qualityState
createdBy
createdAt
supersedesArtifactId
```

Stage 08 additionally compiles one canonical `ShotCueProgram` for every editorial segment:

```text
shotId
narrationClauseId
claimIds
start/end
narrativeJob
visualRoute and archetype
actors, objects and action
entry, midpoint and exit states
source query and layer specification
visible text and mobile constraints
music, ambience, SFX, silence and ducking functions
required and prohibited evidence
resolved quality bindings
```

Stage 09 and Stage 10 consume the same timeline revision. After actual TTS timing is measured, Stage 08 reconciliation creates a new canonical timing revision; downstream work may not retain stale bindings.

## 7. Quality-owned production transactions

### 7.1 Visual transaction

```text
shot contract
→ deterministic eligibility filters
→ six to twelve source candidates where applicable
→ real-pixel source tournament
→ stored champion bytes and read-back
→ at least three finished compositions for critical units
→ composite tournament
→ entry/midpoint/exit render
→ deterministic and perceptual motion preflight
→ sealed VisualAssetPackage
```

The package includes source clip/window, layered scene graph, renderer identity, temporal states, motion classification, claim bindings, rights, checksum and QA evidence. Camera motion is never semantic motion. SOURCE, MAKE and HYBRID routes cannot silently substitute for one another.

### 7.2 Audio transaction

```text
sound contract
→ hardest-passage take tournament
→ section-bounded narration
→ alignment, pronunciation and seam checks
→ production music/SFX/ambience candidates
→ exact cue placement and sidechain mix
→ deterministic measurement
→ full-duration perceptual preflight
→ sealed AudioStemPackage and audience mix
```

The package includes narration, transcript/alignment, music, SFX, ambience, cue sheet, audience mix, rights, checksums and measurements. A procedural tone may validate plumbing but is never production music or SFX.

## 8. One Standard Registry

Production preflight, stage verification, Golden qualification, independent assurance and the owner-ready gate resolve the same standard version. Independent QA may not invent a new release requirement after render and production may not use a weaker internal rubric.

Current hard examples remain:

- visual: camera-only `<=35%`, layered semantic animation `>=45%`, source video/B-roll `>=20%`, at least three visual treatments, target five to seven;
- visual QA: critical factual semantic fit `>=94`, normal semantic fit `>=90`, supporting dimensions `>=86`, P0/P1 `0/0`;
- audio: transcript mismatch `<1%`, `-14 ±1 LUFS-I`, true peak `<=-1 dBTP`, A/V sync `<=120 ms`;
- perceptual audio: overall `>=92`, every dimension `>=90`, P0/P1 `0/0`;
- independent master assurance: overall `>=92`, factual and semantic `>=94`, every other critical dimension `>=90`, P0/P1 `0/0`.

No average score may compensate for a failed hard gate.

## 9. Assurance separation

### Production self-check

Runs inside production: schema, claim binding, rights, pixels, motion, audio, tournaments, treatment distribution, duplicate, mobile and perceptual preflight. A failure here means no production artifact is sealed.

### Stage 12 deterministic verification

Measures the exact timeline: black, freeze, drop, silence, clipping, stream shape, caption, safe zone, duration, A/V sync and provenance. It routes failures but does not creatively repair them.

### Stage 14 independent assurance

Evaluates the sealed immutable master through full playback and independent critics. It confirms release quality; it is not a draft-review service.

## 10. Independent failure policy

If the first Stage 14 assurance fails:

1. stop scale and preserve the immutable master and findings;
2. classify the failure as contract, capability, provider/source, integration or standard-gap evidence;
3. route to the owning root stage;
4. change the reusable mechanism, not the isolated output;
5. re-certify the affected capability;
6. produce exactly one new release-candidate revision.

If the new revision fails again, escalate an architecture incident. Do not auto-retry, lower thresholds or continue videos 2–15. The prior generic maximum of two routine repair loops is superseded for independent release assurance by one root-cause revision followed by escalation.

## 11. First-pass metrics

| Metric | Pilot floor | Scale target |
|---|---:|---:|
| Stage artifact first-pass yield | 90% | 95% |
| Visual composite first-pass yield | 90% | 95% |
| Audio section first-pass yield | 90% | 97% |
| Golden first-pass pass rate for a production engine version | 100% before scale | 100% |
| Independent assurance first-pass pass rate | 95% | 98% |
| P0 escape rate | 0% | 0% |
| Generic fallback rate | 0% | 0% |
| QA-driven cosmetic repair count | 0 | 0 |
| Root-cause revisions per video | at most 1 | approaches 0 |
| Duplicate visual content | <=2% | <=2% |

Metrics are segmented by capability version, archetype, provider, renderer, voice/model/settings and treatment family. A capability that falls below its scale floor loses production eligibility until it is requalified.

## 12. Integration with the 18 stages

| Stage | First-pass responsibility |
|---|---|
| 00 | freeze quality, spend, request, rights and stop policy |
| 01–03 | prove audience, reference and claim completeness before creative production |
| 04 | select from four viable creative routes rather than expose a first draft |
| 05 | lint every beat for viewer-state change, escalation and payoff |
| 06 | run factual, terminology and performance-readiness critics before script lock |
| 07A | certify voice and sound archetypes; freeze the sound contract |
| 07B | certify visual families and mixed-treatment design; freeze route policy |
| 08 | compile and statically validate the complete executable ShotCueProgram |
| 09 | run source/composite tournaments and motion preflight before sealing visuals |
| 10 | run voice/music/SFX tournaments and full-mix preflight before sealing audio |
| Golden | qualify the hardest 60–90-second end-to-end sequence before Stage 11 |
| 11 | compile only eligible current-revision media; no creative fallback |
| 12 | verify the complete pre-master deterministically |
| 13 | render and read back one immutable master revision |
| 14 | perform one independent confirmation against the same checksum |
| 15 | reconcile evidence, rights, cost and owner readiness; publication stays separate |
| 16 | bind real post-publish learning to the exact master and capability versions |

## 13. Operator UI requirements

Video Engine must surface:

- effective production state rather than a raw historical stage state;
- exact root owner, blocker and next valid typed command;
- Definition-of-Ready gaps;
- capability certification and version;
- first-pass yield by stage and capability;
- production preflight result;
- active provider requests, spend and rights status;
- root-cause revision count;
- `QA confirmation pending`, never a normal `QA repair loop`;
- historical control state and rejected evidence only as secondary disclosure.

`09 READY`, `quality blocked`, `Golden REPAIR_REQUIRED` and `new design package required` may not appear as unconnected peer statuses. The effective state must explain the precedence and route the operator to the root stage.

## 14. Current Video #1 application

Golden revision 9 and its audio are immutable rejected evidence. The next master must not be created until the relevant capability versions are qualified.

Required repair boundary:

1. replace the flat-frame executor with a mixed-treatment layered compositor;
2. implement source-video acquisition and decoded source-window evidence;
3. compile executable visual/audio bindings in Stage 08;
4. replace procedural music/SFX eligibility with production audio;
5. qualify visual and audio archetypes hardest-first;
6. run one 15–20-second integrated canary inside production;
7. produce Golden r10 only after the canary and capability registry pass;
8. use one independent Golden confirmation before unlocking Stage 11.

Stage 11, videos 2–15 and auto-publish remain blocked.

## 15. Ordered implementation plan

| Slice | Work | Provider policy | Exit evidence |
|---|---|---|---|
| FP0 — Contract and continuity | establish this doctrine, ADR and authoritative next action | zero provider calls | Documents 03, 04, 09 and 37 agree |
| FP1 — Truthful operator projection | effective state, root owner, readiness gaps, qualification/yield fields and Video Engine information architecture | zero provider calls | no contradictory status; current action visible in first viewport |
| FP2 — First-pass runtime registry | capability, archetype, fixture, qualification, yield and revocation schemas; shared artifact envelope | zero provider calls | migration and regression tests; no capability without archetype evidence can dispatch |
| FP3 — Executable Stage 07B/08 | mixed-treatment visual grammar and canonical ShotCueProgram with audio/visual bindings | bounded OpenAI only after deterministic lint | complete 60–90-second Golden contract; zero timing/schema gaps |
| FP4 — Visual capability plane | Pexels/Pixabay/Shutterstock video acquisition, layered scene graph, Sharp/FFmpeg compositor and eight archetype fixtures | bounded provider calls under the active plan | all required Golden archetypes certified; motion provenance gates pass |
| FP5 — Audio capability plane | hardest-take tournament, long-section TTS, production music/SFX/ambience, alignment, mix and perceptual preflight | bounded ElevenLabs/OpenAI calls under the active plan | required audio archetypes certified; exact mix passes all floors |
| FP6 — Integrated canary and Golden r10 | one 15–20-second canary, then the hardest 60–90-second master | dispatch only after FP2–FP5 pass | first sealed Golden r10 passes deterministic and one independent audit |
| FP7 — Full video and release chain | Stage 11–15 on the frozen engine and exact master lineage | deterministic 11–13; bounded Stage 14 only | full video first release candidate passes Stage 14 and reaches owner-ready |

Do not create Golden r10 during FP1–FP5. Do not use QA findings as iterative composition prompts. Do not start video #2 until FP7 reaches owner-ready.

### FP1 execution record — Sites v380

FP1 is implemented. The canonical projection now computes an effective production state with explicit precedence over raw historical stage state; derives root-stage ownership from Golden master motion provenance, perceptual audio evidence and unresolved quality ownership; and reports provider-request and approved-budget telemetry. Video Engine now opens on an operator workspace with the next valid implementation boundary, Definition of Ready, root owners and the five-phase view of all 18 stages. Historical state and prior-work reconciliation remain inspectable but secondary.

Current projected boundary:

```text
EFFECTIVE_STATE = ROOT_REPAIR_REQUIRED
ROOT_STAGE_OWNERS = 07A, 07B, 08, 09, 10
CURRENT_SLICE = FP1_IMPLEMENTED
NEXT_SLICE = FP2_CAPABILITY_REGISTRY
PROVIDER_DISPATCH = CLOSED
GOLDEN_R10_ELIGIBLE = FALSE
```

## 16. Change governance

Any future change to this doctrine requires a versioned ADR and explicit regression evidence. Later documents may tighten first-pass floors or add certified archetypes, but may not restore routine multi-round independent-QA repair, generic fallback, placeholder eligibility or average-score compensation for a hard failure.
