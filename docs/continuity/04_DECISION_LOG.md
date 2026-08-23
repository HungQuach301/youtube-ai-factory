# Decision Log

## ADR-051 — Continuity is a projection, not duplicate state

The continuity control reads canonical stage, material, evidence, decision and usage records. It may persist immutable snapshots, but it may not create a separately editable current-state model.

## ADR-052 — Reconcile only like-for-like cost scopes

Material-request totals and global AI-usage totals are not compared directly. Cost reconciliation joins records by provider response ID and reports unmatched scopes separately.

## ADR-053 — Forward hash baseline preserves an evidence limitation

Because pre-repair A/B hashes were not stored, current A/B/C entry-mid-exit hashes become the forward immutable baseline. The system records the historical limitation rather than manufacturing a pass.

## ADR-054 — Continuity capture has zero dispatch authority

The continuity route can read evidence, export a pack and store a snapshot. It cannot invoke OpenAI, a media provider, a worker, pilot execution or scale authorization.

## ADR-055 — Controlled release balances speed and semantic quality

Effective 2026-08-10 for Stage 09 stabilized material releases, `CONTROLLED_RELEASE_GATE_V1` adds a controlled tier without converting prior failures into passes. Standard release remains overall ≥92 with every dimension ≥90 and zero P0/P1. Controlled release requires overall ≥88, Semantic Fit ≥82, every other dimension ≥88, zero P0, zero semantic P1 and at most one presentation P1. Scores 84–87 are internal-only; overall <84 or Semantic Fit <82 is blocked. Controlled scale uses a 25% independent QA sample while deterministic and per-unit terminal gates remain mandatory. MP-002 request 85 remains blocked at 84 overall / 68 Semantic Fit; request 86 and batch release are not authorized.

## ADR-056 — Usage evidence is not billing evidence

Effective 2026-08-12, the Factory distinguishes `estimatedCostUsd`, provider-reported usage and `billingVerifiedCostUsd`. A completed OpenAI response ID plus its usage payload proves provider execution and supports a rate-card estimate, but does not prove that the user's OpenAI organization was invoiced. Billing remains `NOT_VERIFIED` until Organization Costs is connected and joined to the same project/time scope. UI and reports may not describe an estimate as an actual charge.

## ADR-057 — Expert decision, niche commitment and strategy activation are separate commands

Effective 2026-08-15, `SUBMIT_EXPERT_DECISION` is the first routed Intelligence/Niche command. It appends an SIWC-attributed, allowlisted, idempotent and version-bound decision plus audit/evidence lineage at zero provider spend. It does not update `channels.niche` and does not activate Channel Strategy. Acceptance creates handoff eligibility only; niche commitment and downstream activation require distinct typed boundaries so automation cannot convert a recommendation or expert review into an irreversible portfolio mutation.

## ADR-058 — Evidence workflow is append-only and cannot grant decision authority

Effective 2026-08-15, Slice 4 provides one versioned support/contradiction/unknown workflow for system-discovered niches and expert-seeded hypotheses. Research planning, bounded validation approval and expert evidence review are durable product capabilities, but none may mutate score, comparison eligibility, system rank, expert priority, selection, commitment or Channel Strategy activation. The current validation command records `APPROVED_NOT_DISPATCHED`; actual provider requests and spend remain zero until a separate typed execution command is implemented and reconciled.

## ADR-059 — Comparison uses evidence sufficiency and lexicographic axes, never a total score

Effective 2026-08-15, Slice 5 records an append-only, latest-evidence-bound assessment shared by system-discovered and expert-seeded niches. The server verifies accepted evidence bindings, support/contradiction/unknown coverage, a primary source and freshness before granting comparison sufficiency. Market Attractiveness, Ability to Win and Evidence Confidence remain independent. System rank orders sufficient assessments lexicographically by eligibility and the three axes; no aggregate score exists. Prerequisite gaps hard-block eligibility, while winning-criterion gaps remain explicit closing/proof work. Expert priority, selection, commitment, `channels.niche` and Channel Strategy activation remain separate capabilities.

## ADR-060 — Expert priority is an atomic versioned portfolio fact, never a rank override

Effective 2026-08-16, Slice 6 records the complete current comparable portfolio as one append-only priority set. Every item binds the canonical program, evidence and scoring versions and contains a unique contiguous rank plus rationale. The command cannot partially prioritize the portfolio and cannot accept research-required opportunities. System rank, the three axes, evidence sufficiency, eligibility and Conditions to Win remain unchanged and queryable beside expert priority. Any later Slice 5 or membership change makes the prior set stale; it is never edited in place. Slice 7 separately owns selection/commitment/governance and Slice 8 owns Channel Strategy activation.
# ADR-062 — Selection and commitment are separate permanent facts

**Decision:** record `SELECTED_PENDING_COMMITMENT` before `COMMITTED`, in separate append-only ledgers bound to the active Slice 6 priority and Slice 5 evidence/scoring lineage. A commitment command without the latest active selection fails closed. Commitment does not activate Channel Strategy; Slice 8 owns that mutation.

**Reason:** governance intent must be independently reviewable, versioned and reversible without rewriting evidence or conflating commitment with downstream execution.

# ADR-063 — Channel Strategy activation is a commitment-bound versioned binding

**Decision:** Slice 8 appends a canonical Channel Strategy binding only through `ACTIVATE_CHANNEL_STRATEGY` and only when the supplied commitment is the latest active Slice 7 commitment. The activation freezes commitment, selection, priority, program, evidence and scoring lineage; uses global and per-channel optimistic versions; and becomes stale rather than rewriting history when an upstream fact changes.

**Reason:** commitment records portfolio governance intent, while activation explicitly authorizes a downstream strategy binding. Keeping them separate prevents selection, ranking or a legacy `channels.niche` value from silently becoming operational strategy. Channel Studio may consume the active binding, but activation has no provider-dispatch, spend, upstream mutation or Content System authority.

# ADR-064 — Intelligence-to-Niche is an append-only typed bridge

**Decision:** keep the frozen Stage 01 Intelligence artifact byte-stable and materialize channel-level `NICHE_OPPORTUNITY` aggregates in a separate versioned bridge ledger with explicit source-artifact lineage. Legacy video-topic candidates are never copied or promoted into Niche Discovery.

**Reason:** Intelligence contains market, audience and competitor evidence, while Niche Discovery owns comparable business territories. A separate aggregate boundary preserves evidence history, makes the relationship inspectable and prevents topic-level research from silently becoming strategy.

# ADR-065 — Production bootstrap authority is bounded to one canonical zero-spend command

**Decision:** use a server-secret, actor-bound route only for `ACTIVATE_CANONICAL_CHANNEL_STRATEGY`. The route composes the existing Slice 4–8 commands, retains all optimistic-version, idempotency, evidence, prerequisite and audit gates, and cannot accept custom candidates, scores or strategy mutations from the caller.

**Reason:** production QA required a real state transition even when SIWC forwarding is unavailable to the agent runtime. Purpose-bounded authority is safer and more auditable than weakening every operator route or spoofing user identity.

# ADR-066 — Intelligence–Niche completion includes production FE and production QA

**Decision:** backend activation is necessary but not sufficient to close the Intelligence–Niche stage. Closure requires a decision-legible production UI, responsive behavior, canonical lineage visibility, automated regression and performance gates, live production read-back across Intelligence, Niche Portfolio and Channel Studio, successful route checks and a clean production error-log window. The closed stage must lead with the active decision; append-only history and alternative intake remain available but secondary.

**Reason:** an active database binding that users cannot understand, compare or verify is not a completed product stage. Binding the definition of done to the production experience prevents backend state from being mistaken for operator-ready completion and prevents future sessions from rebuilding an already active decision chain.

## ADR-067 — Content planning is Autopilot-first inside a versioned owner envelope

**Decision:** Content System & Planning supports `FULL_AUTOPILOT`, `EXCEPTIONS_ONLY` and `EXPERT_REVIEW`. Production uses `FULL_AUTOPILOT`: `SYSTEM_AUTOPILOT` compiles routine pillars, series, opportunities, editorial plans and briefs only while the latest Channel Strategy and Automation Policy are active and version-matched. Owner/expert authority configures budgets, cadence, risk, repair, downstream handoff and escalation rules, and retains pause/resume/emergency-stop control.

**Reason:** minimum owner participation should mean high leverage, not absent governance. A versioned envelope and exception inbox give automation room to operate while preventing planning from inheriting strategy mutation, provider dispatch, spend, production or publishing authority.

## ADR-068 — Sequential stage state changes only through five typed commands

**Decision:** the `V7_V23_4_V281` runtime accepts only `START_STAGE`, `PRODUCE_ARTIFACT`, `VERIFY_ARTIFACT`, `FREEZE_STAGE`, and `REOPEN_ROOT_STAGE`. Every command is identity-bound, idempotent, expected-state guarded and recorded by immutable receipt. Stage freeze requires the exact verified artifact set and zero active provider requests.

**Reason:** provider completion, a database row, a UI click or a stored file alone must never imply stage completion. A single command boundary makes state transition, evidence eligibility and audit authority inspectable and fail-closed.

## ADR-069 — Cost/rights approval precedes Stage 08–10 provider dispatch

**Decision:** Stage 08–10 require a versioned approved plan with stage scope, provider allowlist, request ceiling, spend ceiling, rights requirements and a whole-video hard cap. Failed attempts remain in request and cost reconciliation. Usage-derived estimates, provider usage and invoice evidence are reported separately.

**Reason:** provider access is not spending authority, and a provider response is not billing proof. Pre-approval and scope-aware reconciliation prevent hidden retries, unbounded spend and unlicensed media from acquiring production eligibility.

## ADR-070 — Stage 10 duration is a measured hard gate with immutable repair

**Decision:** narration must measure 480–720 seconds before Stage 10 artifacts can verify. A technically valid 863.968-second revision was reopened rather than called PASS. Repair uses an attempt-specific R2 namespace, supersedes prior artifact rows, blocks downstream stages and preserves previous bytes/evidence. Provider-native 24 kHz stems are mezzanine inputs; Stage 11 owns 48 kHz mixing and Stage 13 owns the 48 kHz distribution master.

**Reason:** script intent and provider success do not establish audience runtime or master format. Measuring actual PCM before freeze prevents a 14.4-minute output from bypassing the 8–12 minute product contract and prevents repair from rewriting history.

## ADR-071 — Video Excellence eligibility is separate from control-state freeze

**Decision:** effective 2026-08-17, Document 34 establishes the versioned video-quality hierarchy `Channel → Pillar → Series → Episode → Beat/Shot/Cue` and enforcement levels M0–M4. Control-state `FROZEN` remains immutable evidence that the active command contract completed. It does not, by itself, prove that audience-facing pixels, narration, music, SFX or a mix satisfy Video Excellence. Stage 11 must not start while the current lineage lacks exact narration-duration coverage, decoded motion proof, perceptual voice evidence, production music/SFX and a full-duration measured mix.

**Reason:** the prior runtime could freeze artifacts from record counts, declared state descriptions and hard-coded quality metadata. Separating state history from current quality eligibility preserves audit truth while preventing a technically complete but perceptually weak artifact from acquiring release authority. A descendant content-route contract may tighten the universal standard but may not weaken its M0/M1 gates.

## ADR-072 — First-pass production owns quality; independent assurance confirms one sealed candidate

**Decision:** effective 2026-08-19, Document 37 establishes `FIRST_PASS_QUALITY_V1`. A raw model response, provider result, renderer output, TTS take or composition is an internal candidate and cannot acquire production-output status. Production must use certified archetype-bound capabilities, executable contracts, bounded internal tournaments and shared-standard preflight before sealing the first release candidate. Stage 14 performs one independent confirmation against the immutable master checksum. Its failure stops scale, routes to the owning reusable mechanism and permits at most one requalified root-cause revision; a second failure escalates an architecture incident. Routine multi-round QA-guided output repair, generic fallback, placeholder eligibility and hard-gate compensation by average score are prohibited.

**Reason:** the prior `generate → QA → repair` lifecycle made QA discover requirements that the production engine did not own, producing many expensive video-specific repair waves. Moving the complete Definition of Ready and Definition of Done into production makes quality measurable before handoff, preserves QA independence and allows scale only after the same engine version proves first-pass yield on hardest fixtures and Golden playback.

## ADR-073 — Operator state follows evidence precedence, not stage-row order

**Decision:** effective 2026-08-19, the Video Engine projects one effective production state in this precedence order: owner-ready, root repair required, quality blocked, active production, actionable ready, then upstream blocked. A Golden repair verdict and its visual/audio evidence reopen the owning root stages in the operator projection even when an old downstream stage row remains `READY`. Provider-request and budget telemetry, Definition-of-Ready gaps and the exact next implementation boundary must appear before historical process detail.

**Reason:** presenting `09 READY`, quality blocked and Golden repair as peer statuses left the operator to resolve a contradiction and made unsafe dispatch appear plausible. Evidence precedence turns those facts into one explainable operating state without rewriting immutable history.

## ADR-074 — Capability qualification is a dispatch prerequisite, not a post-production score

**Decision:** effective 2026-08-19, FP2 introduces a versioned Capability Registry and a shared fail-closed dispatch guard. Every production operation must resolve one or more active capability–archetype requirements. Eligibility requires a qualified capability and latest qualification with matching mechanism/standard versions, a settings hash, sufficient fixture samples and evidence hashes, first-pass yield at or above the registered floor, zero P0 escapes and no revocation. Zero requirements is not permissive; it is a configuration failure. Each authorization or block is audit-recorded before provider work, and a block reports zero requests and zero spend.

**Reason:** registering a provider or completing one technically valid output does not prove that the mechanism can repeatedly solve its hardest audience-facing cases. Making qualification a precondition prevents production from using Video #01 as an expensive test fixture, preserves QA independence and gives tool/model/configuration changes an automatic revocation boundary. Registry installation alone does not qualify a mechanism, so the initial runtime remains `QUALIFICATION_REQUIRED` and Golden r10 stays locked.

## ADR-075 — Git repository is the sole project source of truth

**Decision:** effective 2026-08-20, `youtube-ai-factory` on `main` is the sole durable source for source code, architecture, decisions, standards, current state, roadmap and execution evidence. Chats, Personal Context, Library, Drive, scratch workspaces, screenshots and recovery exports are non-authoritative until reconciled and committed. Ordinary chat continuation clones or fetches the Git remote and follows `docs/README.md`; Library-dependent capsule recovery is superseded for normal operation.

**Reason:** fragmented documents and chat-length limits repeatedly created missing, duplicated or stale context. A single versioned source with validation and a fixed reading order makes continuity reproducible, reviewable and independent of any conversation window.

## ADR-076 — Expert assessments enter through a reconciled issue and standards process

**Decision:** expert reviews are preserved with provenance but do not become production standards directly. Each finding is classified in the Master Issue Registry. Confirmed gaps create mandatory roadmap gates; architectural directions create versioned target contracts; numeric thresholds and tool selections require calibration; incorrect or obsolete claims are explicitly corrected. Closure requires code or document change, evidence, validation and a pushed Git checkpoint.

**Reason:** the expert reviews contain high-value architecture findings alongside overlapping items, uncalibrated thresholds and several technical inaccuracies. Reconciliation preserves the insight without allowing a proposal or document label to bypass production evidence.

## ADR-077 — Every production dispatch requires one fenced, reserved integrity decision

**Decision:** effective 2026-08-21 in source, every reachable sequential provider operation must pass one shared authorization boundary before external work. The boundary binds a current monotonic lease fencing token, an intent hash and idempotency key, active capability/settings qualifications, approved plan scope, an atomic request/spend reservation, rights state and—after its owning stage—M0 Safety Scope PASS. Identical idempotency replay is blocked from calling a provider again. Settlement moves reservation evidence and measured provider actuals into the budget ledger in one transaction. `FROZEN` bytes and downstream eligibility are stored independently; historical artifacts migrate blocked pending reconciliation.

**Reason:** qualification alone cannot stop stale workers, concurrent budget overruns, unevaluated safety or replayed provider work. A single fail-closed decision and trace makes every external mutation attributable to the exact lease, budget, capability, safety and rights evidence that authorized it. This ADR does not authorize migration, deployment or provider dispatch; production closure requires separate migration and runtime evidence.

## ADR-078 — Learning-ready commitments precede media and promotion only creates a new version

**Decision:** effective 2026-08-21 in source, the Video Engine defines eight versioned boundaries before paid media production: channel identity, packaging promise, predicted performance, experiment definition, learning candidate, rights/compliance, animatic and master delivery. Channel identity is channel-scoped; packaging binds at Stage 04; prediction is composed across Stages 04/05/08/11; an experiment tests one variable; insufficient evidence cannot be promoted; rights/compliance and animatic must pass before their downstream gates; and the archival master remains distinct from its distribution derivative. `PROMOTE_LEARNING_V1` requires sufficient consistent evidence across at least two independent videos and an owner-bound receipt, and may only create a higher Channel Strategy or production-standard version.

**Reason:** a high-quality single-video pipeline cannot learn safely when it has no sealed prediction, packaging promise, controlled experiment or typed path back into strategy. Defining these contracts before Stage 09–11 avoids a later breaking redesign while preserving zero-spend, fail-closed operation. This decision defines source contracts only; it does not apply migration `0051`, activate the promotion command, create evidence, deploy production or authorize provider dispatch.

## ADR-079 — Standing production authority removes repeated confirmation, not runtime controls

**Decision:** effective 2026-08-21, `OWNER_STANDING_PRODUCTION_AUTHORITY_V1` authorizes roadmap-bounded production deployments, additive migrations, production QA and provider dispatch without requesting duplicate chat confirmation from the owner. Each external operation still requires the active typed operation plan, current capability/settings qualification, atomic request/spend reservation, rights eligibility, Safety Scope PASS where required, idempotency and valid lease fencing. Auto-publish, public publication, historical-evidence deletion and hard-gate weakening remain separately prohibited or owner-bound.

**Reason:** repeated conversation boundaries should not become an operational blocker after the owner has granted durable authority. Persisting the grant in the repository makes it recoverable in a new chat while ensuring authority cannot be mistaken for evidence or used to bypass fail-closed production controls.

## ADR-080 — Rejected history is candidate evidence, never automatic ground truth

**Decision:** effective 2026-08-21, historical failures enter `EVALUATION_FOUNDATION_V1` only as `CANDIDATE_EVIDENCE`. Gold eligibility requires verified bytes, recomputed checksum, provenance, rights, exact owner decision, evidence-bound defect labels, correlation identity and de-duplication. Package-level rejection cannot fabricate an artifact-level master verdict. Evaluation fixtures are permanently release-ineligible. Assurance qualification requires blinded sealed data, independent counts, calibrated P0-family recall floors, zero P0 escapes, measured precision/repeatability and cost evidence.

**Reason:** counting 595 output records or 15 rejected packages as a gold set would create circular, correlated and potentially mislabeled evaluation. The measurement system must be proven against verified ground truth before it can authorize a production quality decision.

## ADR-081 — Corpus verification is bounded byte evidence, not fixture promotion

**Decision:** `CORPUS_VERIFICATION_POLICY_V1` reads at most 20 historical candidates per owner-bound idempotent command and at most 100,000,000 bytes per R2 object. It recomputes SHA-256 and reconciles D1 candidate, source artifact and R2 metadata into a durable evidence receipt. Channel-authored non-provider artifacts may pass the evaluation-use rights check when authorship and object lineage match. Provider-bound audio/video or other provider material requires an explicit rights receipt or terms-version binding. No verification batch can create a provider request, spend, owner verdict, defect label, dataset membership, fixture promotion or release eligibility.

**Reason:** prior storage code performed a write-time read-back, but that historical assertion is not independent current corpus evidence and generic rights declarations cannot prove provider terms. Bounded replayable receipts make the current measurement substrate auditable without loading the entire corpus into one worker or converting technical integrity into semantic ground truth.

## ADR-082 — Blocked-evidence diagnostics select a repair lane but never rewrite evidence

**Decision:** blocked corpus diagnostics are derived from each candidate's latest immutable verification receipt and expose only allowlisted reason codes, byte/checksum/provenance state combinations and candidate-kind counts. Unknown reason text is collapsed. Source IDs, storage keys, hashes, raw R2 metadata and arbitrary receipt content remain server-side. A diagnostic cannot mutate the candidate, overwrite a receipt, change rights or labels, promote a fixture, add dataset membership or create release authority. Any later repair must append new evidence and preserve the losing receipt.

**Reason:** the twelve blocked candidates may represent declaration drift, object corruption, provenance defects or policy mismatches. Choosing one generic repair before reading the production distribution risks normalizing corrupted evidence or rewriting history. A sanitized diagnostic makes the repair decision evidence-based without leaking object lineage or converting observation into mutation authority.

## ADR-083 — Byte divergence is quarantined; metadata-only conflicts require new evidence

**Decision:** when recomputed object bytes differ from the source artifact's declared hash or byte size, the evaluation candidate is append-only quarantined as `EXCLUDED`; neither the object nor its declaration may be normalized to the other. When exact bytes and checksum pass but R2 artifact-ID metadata conflicts with the D1 source binding, the candidate remains `BLOCKED` pending a new evidence-bound re-adjudication receipt. Incidents and quarantine dispositions are immutable, evaluation-only and permanently zero-authority for release.

**Reason:** production v400 proves seven source/object byte divergences and five metadata-only binding conflicts. Treating both groups as one repair would either admit unverifiable bytes or discard potentially valid evidence. Separate fail-closed dispositions preserve the historical corpus while allowing only the metadata-only group a bounded proof path.

## ADR-084 — A stale artifact ID may rebind only through unique exact storage/hash lineage

**Decision:** a checksum-valid metadata-only candidate may append `METADATA_BINDING_RECONCILIATION_V1` evidence only when candidate, source, computed bytes, byte size, storage key, package, hash, engine version and zero-legacy provenance all agree, the observed artifact ID is present but stale, and the storage-key/hash pair uniquely identifies the source D1 row. The new receipt resolves provenance only; rights remain receipt-required and owner labels, fixture promotion, dataset membership and release eligibility remain untouched.

**Reason:** Sites v401 leaves five candidates whose only technical conflict is the R2 artifact-ID field. Rewriting metadata would destroy the losing evidence, while treating the stale ID as fatal would discard byte-exact material. A strict append-only rebind uses the repository's unique storage/hash constraint as proof without weakening rights or semantic ground-truth gates.

## ADR-085 — Rights are re-evaluated separately from provenance and only from explicit authorship

**Decision:** a metadata-rebound evaluation candidate may acquire `CHANNEL_AUTHORED_EVALUATION_USE` rights PASS only through a separate immutable receipt proving accepted declaration, non-audio/non-video media, no provider, explicit channel author/actor/executor and zero legacy sources. Provider-bound material requires an explicit terms or license receipt and cannot use this lane. Rights PASS changes neither candidate-evidence lifecycle nor owner/label/gold/dataset/release state.

**Reason:** Sites v402 correctly moved five candidates to rights-pending rather than allowing technical reconciliation to imply legal authority. Separating rights receipts preserves that boundary while allowing genuinely channel-authored evidence to avoid a fabricated provider-license requirement.

## ADR-086 — Historical provider and composite rights require time-bound exact evidence

**Decision:** a provider artifact may pass rights only when an immutable receipt binds the exact artifact hash to a completed provider request/response, the applicable terms snapshot, and paid-plan evidence covering the generation timestamp. Current terms cannot be applied retroactively. A no-provider master requires an exact parent-rights manifest with PASS coverage for every parent. A rendered clip requires explicit authorship plus its source/render manifest. Package membership, provider family, generic rights declaration and present-day account state are insufficient.

**Reason:** Sites v404 identifies 46 ElevenLabs audio records but historical artifact provenance does not bind a provider request ID. Sixteen no-provider masters also do not bind exact parent sets, and one clip requires source/authorship proof. Inferring from package-level records would turn correlation into legal authority and could falsely validate historical artifacts under newer terms.

## ADR-087 — Owner labels are exact-byte, complete-taxonomy, human-attributed evidence

**Decision:** an evaluation candidate may receive an owner label task only after byte, checksum, provenance and rights verification pass. The task binds the exact artifact SHA-256. Playback recomputes that hash from R2 before presentation. The authenticated allowlisted owner must classify every active defect family and append one internally consistent decision receipt. Automation credentials cannot substitute for the owner. Label acceptance updates only owner/label evidence; it never creates fixture, gold, dataset, assurance or release eligibility.

**Reason:** package-level rejection and inherited labels are correlated historical facts, not artifact-level ground truth. Exact-byte binding prevents judgment from drifting to another revision, complete taxonomy coverage supplies both positive and negative controls, and a separate append-only receipt preserves attribution without allowing UI completion to bypass correlation and dataset gates.

## ADR-088 — Owner attention uses hierarchical exact-byte and lineage representatives

**Decision:** preserve every owner-label task but expose only one `READY_PRIMARY` representative per lineage family. Exact SHA-256 duplicates collapse first. Remaining unique hashes group by shot contract and artifact type, or by package, candidate kind and artifact type when no shot exists. One deterministic evidence-rich representative is independently count-eligible; exact duplicates and correlated variants are deferred rather than deleted. Direct playback and receipt submission must enforce the same assignment.

**Reason:** asking the owner to review all 525 historical artifacts would waste attention on byte-identical copies and correlated revisions, while simply grouping everything by package would incorrectly merge distinct modalities and artifact purposes. Hierarchical grouping preserves defect diversity, constrains statistical independence and leaves deferred evidence available if later taxonomy coverage requires it.

## ADR-089 — Owner review records observations, not technical evidence judgments

**Decision:** `EVALUATION_OWNER_REVIEW_UX_V2` presents only defect families observable from the current candidate's media. Audio, visual, audio-visual, content and packaging defects are mapped fail-closed from candidate kind and MIME type. Rights lineage and master-lineage integrity remain complete-taxonomy entries but are submitted as `NOT_APPLICABLE` to the owner observation and proven through their separate evidence gates. The server enforces the same scope; client manipulation cannot turn a system-owned dimension into an owner label. The owner chooses one plain-language outcome, selects observed defects only when rejecting and supplies a short observable rationale.

**Reason:** the first workflow exposed eleven technical taxonomy rows and required the owner to classify dimensions that cannot be established from playback. This was cognitively heavy and epistemically incorrect. Separating observation from deterministic evidence makes the task understandable without weakening complete-taxonomy coverage, exact-byte binding or append-only attribution.

## ADR-090 — Browser-rendered assurance is an exact-master mandatory gate

**Decision:** every release candidate must pass `BROWSER_ASSURANCE_GATE_V1` after the exact master bytes exist and before release eligibility. Browser assurance is independent from deterministic/static QA and owner semantic evaluation. Its append-only receipt binds the Golden revision, master artifact and SHA-256 and proves continuous playback, pause/resume/seek/end behavior, visible motion, audible audio, keyboard focus, zoom/reflow, visibility and console health. Legacy playback self-attestation is retired. A fixture has no release authority, and missing Browser evidence remains blocking rather than becoming `NOT_APPLICABLE` or an assumed PASS.

**Reason:** codec/decode, browser integration, focus/reflow and perceptual playback defects can survive schema, build and deterministic media checks. Exercising the rendered product as a person catches that class of failure. Exact-byte binding prevents a successful check on a fixture or prior revision from laundering another master into release eligibility; separate evidence lanes keep automation from impersonating owner judgment and keep owner observation from replacing technical proof.

## ADR-091 — Factory first-pass QA precedes owner exceptions

**Decision:** `FACTORY_FIRST_QA_POLICY_V1` treats two exact-byte owner receipts as calibration anchors. The independent reviewer must find every owner-present defect on both before batch execution opens. Subsequent Factory receipts use `INDEPENDENT_REVIEW`, never owner identity or owner-confirmed state. Images use exact-byte vision review; audio and temporal media remain Browser-required. Owner attention is reserved for P0, uncertainty, explicit exceptions and audit samples. Provider requests and spend are bounded by an immutable registry and idempotent runs.

**Reason:** correlation control reduced 525 records to 82 primaries but still made the owner perform the Factory's first-pass labor. Two failed samples already establish a usable calibration boundary. Separating machine review from owner authority preserves ground-truth integrity while moving routine corpus triage to automation and keeping unreviewable media fail-closed.

## ADR-092 — Closed deterministic observations augment but never rewrite model evidence

**Decision:** when repeated calibrated vision calls miss a condition that is directly decidable from exact source bytes, the Factory may append a separately versioned immutable adjudication receipt. It may override only the named closed condition and must preserve the raw provider receipt, request/spend evidence and calibration history. `FACTORY_QA_DETERMINISTIC_ADJUDICATION_V1` is limited to the known internal SVG residue phrase and declared SVG text below the 32px full-frame mobile floor. The combined critic applies the same rule to anchors and later batches.

**Reason:** Calibration V1 and V2 both saw near-static motion but missed the same two visible conditions on both anchors, while renderer inspection proved that the review PNG preserved them. Spending on a third prompt retry would not improve measurement validity. Additive exact-byte evidence closes the reproducible gap without laundering a model miss, impersonating the owner or widening deterministic logic into subjective judgment.

## ADR-093 — Same-package correlation cannot prove render lineage

**Decision:** `EVALUATION_RIGHTS_LINEAGE_DIAGNOSTIC_V1` records whether each historical composite/authorship task contains an exact source-manifest and parent-set binding, but it grants no rights PASS. A manifest found in the same package is diagnostic context only. Every new Production V2 pilot or full-master upload must present the exact manifest ID and SHA-256; the runtime reads back those bytes, verifies all parent IDs and hashes against the canonical artifact ledger, and stores that verified lineage with the rendered artifact. Missing or mismatched lineage rejects the upload.

**Reason:** the 16 historical masters and one clip have co-located manifests, but their own provenance does not bind a particular manifest or parent set. Treating package proximity as proof would manufacture authorship and rights evidence. Fixing the write path prevents recurrence while the historical artifacts remain fail-closed pending authoritative evidence.

## ADR-094 — A derived artifact hash is not a provider-native request identity

**Decision:** `EVALUATION_PROVIDER_BINDING_DIAGNOSTIC_V1` may classify a unique historical match between `provider_response_id` and the first 24 characters of the exact artifact SHA-256 only as `LEGACY_SYNTHETIC_RESPONSE_BINDING_DISCOVERED`. It cannot verify a provider-native response ID or create rights authority. Every new ElevenLabs narration must capture the `request-id` header, bind the internal provider request, native ID and full response-byte SHA-256 in artifact provenance, verify R2 read-back and only then mark the request complete. Missing native identity or hash mismatch fails closed. Historical rights additionally require time-bound terms and paid-plan evidence.

**Reason:** all 46 production audio tasks match the old hash-prefix convention, proving that the internal request ledger and artifact bytes correlate. The source code also proves the value was generated locally, so treating it as an ElevenLabs identifier would manufacture external evidence. Separating internal binding from provider-native identity preserves useful lineage while preventing a false legal or assurance PASS.

## ADR-095 — Exact provider audio bytes resolve metadata ambiguity but cannot prove historical plan rights

**Decision:** when provider history returns multiple metadata-compatible items for one historical candidate, the Factory must not choose by timestamp, voice, model or text proximity. `EVALUATION_PROVIDER_AUDIO_HASH_RECOVERY_V1` may download existing history audio in immutable batches of at most 16, with at most two attempts per item, and bind only SHA-256-identical bytes. A unique exact match and an equivalent-byte multi-request set are recorded separately. Neither state grants rights, dataset, assurance or release authority without authoritative terms and paid-plan evidence covering the historical generation time. The current subscription observation is never retroactive evidence.

**Reason:** production recovered 66/66 native request IDs but all 46 candidates remained metadata-ambiguous. Exact bytes are the strongest available technical binding and avoid an invented nearest-time match. Commercial-use eligibility is a separate legal/account fact, so combining these questions would turn technical lineage into false rights authority.

## ADR-096 — A terminal exact-byte no-match closes historical recovery and redirects WP7 to controlled fixtures

**Decision:** when every retained provider-history audio item has a verified SHA-256, no retry remains and every targeted historical candidate has zero exact-byte matches, `EVALUATION_HISTORICAL_RECOVERY_CLOSURE_V1` permanently closes the technical recovery lane as `EXHAUSTED_NO_EXACT_BINDING`. The candidates remain immutable quarantined failure evidence and cannot acquire rights, dataset, assurance or release authority through metadata or present-day account state. `CONTROLLED_FIXTURE_PLAN_V1` replaces that path with thirteen bounded blueprints: one positive for each active defect family and two clean negatives, with all five P0 families planned. Planning creates no fixture or qualification authority; materialization must use provider-native identity, exact response hashes, R2 read-back, time-valid rights and owner ground truth.

**Reason:** production hashed 66/66 retained ElevenLabs history items and found zero exact matches for all 46 candidates. Further nearest-time or metadata matching would manufacture provenance, while repeatedly reading the same closed history cannot add evidence. A small, intentionally labelled corpus with isolated transformations creates measurable ground truth at lower cost and higher validity than attempting to rehabilitate unbound historical outputs.

## ADR-097 — PAYG is not commercial base-plan evidence

**Decision:** `ELEVENLABS_COMMERCIAL_ENTITLEMENT_V1` authorizes new V7 audio synthesis only when the generation-time subscription response has status `active` and an explicit paid base tier: Starter, Creator, Pro, Scale, Business or Enterprise. `payg`, Free, inactive and unknown tiers fail closed. The controlled-fixture, Stage 10 and Golden-audio paths use one shared evaluator, and new cost-rights plans state that PAYG alone is ineligible. Existing audio bytes and receipts remain immutable and rights-pending until generation-time paid-plan evidence is appended; otherwise they must be replaced by a newly generated fixture after an explicit paid plan is active.

**Reason:** ElevenLabs commercial terms distinguish Paid Users from Free Users, while the provider's PAYG documentation explicitly permits PAYG on both free and paid base plans. The former `tier != free` predicate therefore converted a payment mode into legal entitlement and could produce commercially ineligible audio. Explicit allowlisting preserves fail-closed rights evidence and prevents recurrence across active V7 synthesis paths.

## ADR-098 — Replace rights-ambiguous clean audio append-only, then review it independently

**Decision:** `COMMERCIAL_CLEAN_AUDIO_REGENERATION_V1` creates at most one replacement after one generation-time subscription read proves an explicit active paid base plan. The exact subscription response and TTS bytes must be privately stored, hashed and read back from R2; an already verified official Terms snapshot and provider-native request ID are mandatory. The lane permits one TTS request, 700 characters and USD 0.08 reserved spend. The original fixture remains immutable and rights-pending. `FACTORY_AUDIO_QA_POLICY_V1` may then spend at most one `gpt-audio-1.5` request and USD 0.20 to review exact replacement bytes across seven perceptual dimensions. Its receipt is independent review only and cannot set owner truth, dataset membership, capability qualification or release eligibility.

**Reason:** the original one-fixture ceiling correctly prevented silent retries but also means paid-plan activation cannot repair the earlier artifact's missing generation-time entitlement. An append-only replacement preserves evidence while closing the rights gap. Factory-first listening removes routine perceptual triage from the owner without allowing machine judgment to impersonate the owner or bypass downstream gates.

## ADR-099 — A pre-dispatch schema defect earns one evidence-bound recovery, not a reset

**Decision:** `COMMERCIAL_CLEAN_AUDIO_RECOVERY_V1` may authorize one additional regeneration attempt only when an immutable prior run proves `FAILED`, exactly one subscription read, zero TTS requests, `UNEXPECTED_COMMERCIAL_CLEAN_AUDIO_FAILURE` and no replacement artifact. The authorization and its consumption binding are append-only. The repair maps the eligible classifier state `PAID_SUBSCRIPTION_CONFIRMED` to the receipt contract's canonical `EXPLICIT_ACTIVE_PAID_BASE_PLAN` while retaining the classifier state in the evidence hash. It does not relax entitlement, rights, request, spend, owner, dataset, assurance or release gates.

**Reason:** the production failure was caused by our internal vocabulary boundary before TTS dispatch, not by provider output quality or an exhausted synthesis attempt. Rewriting the failed run would destroy evidence; permanently consuming the unused TTS allowance would convert an implementation defect into an artificial dead end. One signature-bound recovery preserves both immutability and the original one-TTS risk ceiling.

## ADR-100 — Audio QA evidence uses one forced function and captures the provider response before parsing

**Decision:** `FACTORY_AUDIO_QA_RECOVERY_V1` may authorize one additional `gpt-audio-1.5` request only when the original run proves `FAILED`, exactly one provider request, `FACTORY_AUDIO_QA_RESPONSE_INVALID` and no QA receipt. The recovery must force `record_factory_audio_qa`, capture exact provider-response bytes, hash and R2 read-back plus usage and actual spend before parsing tool arguments, then validate the full policy contract. The failed request remains immutable and its unknown actual spend is conservatively reserved at USD 0.20; one recovery adds USD 0.20 for a cumulative reserved ceiling of USD 0.40. The result is independent review only and grants no owner, dataset, assurance or release authority.

**Reason:** `gpt-audio-1.5` supports function calling but not Structured Outputs. Free-form JSON produced a valid provider response that could not satisfy the Factory evidence parser, while the old capture order also prevented sealing response bytes and usage on that failure. A forced function plus capture-before-parse aligns the contract with supported model behavior and preserves financial/evidence truth without turning a malformed response into an unlimited retry loop.

## ADR-101 — A likely-clean Factory receipt opens one owner task but never becomes owner truth

**Decision:** `CLEAN_AUDIO_OWNER_GROUND_TRUTH_V1` conditionally opens exactly one task only when commercial rights PASS and the same exact audio hash has an independent `LIKELY_CLEAN` receipt with P0=0 and P1=0. The allowlisted SIWC owner must attest full playback and choose `CLEAN_CONFIRMED` with zero defects or `DEFECT_REJECTED` with at least one allowlisted audio-observable defect and rationale. Submission re-reads and hashes R2 bytes. The append-only receipt has `OWNER_GROUND_TRUTH_ONLY` authority and zero provider, spend, dataset, assurance or release authority.

**Reason:** independent QA reduces routine owner attention but cannot establish a human label. Conversely, an owner decision on unbound or partially heard audio would not be defensible ground truth. One exact-byte, full-listen gate preserves epistemic separation while giving the controlled-fixture program the minimum human evidence needed for the next separately governed eligibility decision.

**Production acceptance:** Sites v458 activated migration `0078`. The allowlisted owner recorded the only `CLEAN_CONFIRMED` decision after full playback; request `a2f797499ff47a53` completed successfully, exact audio read-back remained available and Worker errors were zero. The receipt retains `OWNER_GROUND_TRUTH_ONLY` authority, so no downstream gate changes state by implication.

## ADR-102 — Owner-confirmed clean audio becomes a reference only through a separate exact-byte eligibility receipt

**Decision:** `CLEAN_AUDIO_CONTROL_ELIGIBILITY_V1` may recognize exactly one `ELIGIBLE_CLEAN_CONTROL_REFERENCE` only when the sealed clean-audio blueprint, provider-native provenance, commercial Rights PASS receipt, independent `LIKELY_CLEAN` P0/P1-free Factory receipt and full-listen `CLEAN_CONFIRMED` owner receipt all bind the same artifact SHA-256. Execution re-reads R2 and rejects byte-size or hash drift. The immutable receipt records all eight owner-observable audio defects as absent, is independent-count/reference eligible and has `CLEAN_CONTROL_REFERENCE_ONLY` authority. It cannot set dataset eligibility, seal a dataset, qualify assurance or release media.

**Reason:** owner truth and independent review establish the meaning of the exact audio, but corpus membership is a separate governed decision that also requires blueprint, provenance, rights, checksum and de-duplication evidence. Keeping eligibility append-only prevents a human receipt from silently changing downstream state. One clean negative improves the readiness projection, but three owner-confirmed references, zero controlled injections and 0/5 P0 coverage remain insufficient.

## ADR-103 — Machine-verifiable gates are operator-automated; owner attention is reserved for human authority

**Decision:** after the owner supplies any required perceptual or legal ground truth, deterministic follow-on actions should be executed by the Factory operator through the narrowest server credential possible. The clean-control credential is accepted only when the requested action is exactly `EVALUATE_CLEAN_AUDIO_CONTROL_ELIGIBILITY`; it cannot authenticate provider recovery, corpus mutation, owner labels, production, publishing, deletion or access changes. The automation identity remains allowlisted, and every exact-byte, rights, provenance, QA, idempotency and downstream-authority check remains mandatory.

**Reason:** requiring the owner to repeatedly press buttons for deterministic evidence transitions adds attention cost without adding epistemic value. Scoped automation preserves least privilege and auditability while keeping genuinely human judgments—full-listen quality confirmation, rights assertions and release/publication decisions—separate.

**Production acceptance:** Sites v461 accepted the scoped credential only for the clean-control action and recorded the sole eligibility receipt with exact R2 read-back, checksum/provenance/rights PASS, Factory `LIKELY_CLEAN`, owner `CLEAN_CONFIRMED`, zero provider requests and zero spend. The resulting authority remains `CLEAN_CONTROL_REFERENCE_ONLY`; readiness remains `INSUFFICIENT_GROUND_TRUTH`.

## ADR-104 — Controlled-fixture ground truth uses the authority that can actually observe the defect

**Decision:** `CONTROLLED_DEFECT_DERIVATION_V1` starts with blueprint `cfp-v1-02` and creates exactly one `RIGHTS_LINEAGE_MISSING` P0 fixture by removing only the required `rightsReceiptId` from a copied canonical manifest. The action re-reads the exact clean-parent audio, hashes and R2-verifies both clean and mutated manifests, and proves all remaining payload fields unchanged. Because a rights-reference omission is a system-owned fact, its ground-truth authority is `DETERMINISTIC_SYSTEM_ORACLE`; perceptual or semantic blueprints still require owner-confirmed or hybrid evidence. The receipt may count only as one controlled injection and one covered P0 family. It grants no dataset, assurance, release or publication authority.

**Reason:** asking a human listener to confirm whether a database manifest contains an exact rights receipt is epistemically invalid, while accepting a broad deterministic mutation would create an uncalibrated fixture. A one-key canonical delta gives stronger, reproducible ground truth and preserves the separation between system evidence and owner-observable media judgments.

**Production acceptance:** Sites v463 recorded the only `CONTROLLED_DEFECT_PRESENT` receipt for `RIGHTS_LINEAGE_MISSING`. Exact clean-parent read-back, clean/mutated manifest read-back, one-key isolation and deterministic oracle all passed. WP7 now has one controlled injection and 1/5 P0 coverage, but readiness remains `INSUFFICIENT_GROUND_TRUTH`; provider requests, spend, Worker errors and downstream authority are all zero.

## ADR-105 — A clean A/V master requires four separate evidence authorities

**Decision:** `CLEAN_AV_MASTER_MATERIALIZATION_V1` may compose exactly one `cfp-v1-13` master only from the exact eligible clean-audio parent. It must seal two VP9/Opus renditions, a visual manifest, a contact sheet and measured full-decode/checksum/sync evidence through R2 read-back. One separately scoped `gpt-5.6` contact-sheet review and one independent Browser playback receipt may classify the master as likely clean. Only both likely-clean results open an owner task; neither may write owner ground truth. Every receipt is permanently ineligible for dataset, qualification, release and publication authority by implication.

**Reason:** clean narration does not prove clean pictures or A/V synchronization, while a model contact-sheet review cannot hear the video and browser automation cannot establish the owner's perceptual judgment. Separating technical, model, browser and owner authorities gives each claim to the observer that can actually support it and prevents one convenient PASS from silently opening downstream production.

## ADR-106 — Autonomous Browser QA preserves failed attempts but only exact evidence may consume the receipt

**Decision:** `CLEAN_AV_AUTONOMOUS_BROWSER_QA_V1` permits at most three exact-master browser attempts and only one active attempt at a time. Every run binds the immutable distribution hash. An incomplete or infrastructure-failed attempt is appended as `FAILED` without creating the sole `CLEAN_AV_BROWSER_QA_V1` receipt. A likely-clean receipt requires real-time mobile Chromium playback, played-range coverage of at least 98%, pause/resume/backward-seek/end order, decoded audio RMS, decoded-frame motion, four mobile cue captures, focus/reflow and zero errors. Cue JPEGs must pass SHA-256 R2 read-back and the final receipt must link the canonical evidence-bundle hash. Browser automation may open the owner task only through the existing Factory-plus-Browser conjunction; it may never complete owner ground truth or grant downstream authority.

**Reason:** a cloud-browser connection failure is useful operational evidence but is not media-quality evidence, while an unbounded retry or boolean-only callback could silently convert infrastructure behavior into a clean verdict. Separating append-only run evidence from the one final receipt preserves failure truth, supports bounded recovery and makes the exact pixels, decoded audio and event sequence auditable.

**Production acceptance:** Sites v474 preserves attempt 1 as a no-receipt motion-observation failure, then seals attempt 2 as Browser `LIKELY_CLEAN` from 100% played coverage, decoded RMS 0.1328, four cross-cue motion/mobile samples, focus/reflow PASS, zero page errors and R2-read-back evidence. Only the owner task opens; every downstream authority remains false.

## ADR-107 — Technical clean evidence cannot authorize a YouTube audience master

**Decision:** `YOUTUBE_AUDIENCE_MASTER_STANDARD_V1` is the release constitution above technical materialization, contact-sheet Factory review and Browser playback telemetry. Audience readiness requires an exact full-video stack: weighted score at least 92, Content/Visual/Motion/Audio each at least 90, zero P0/P1, deterministic full-file QA, full-video multimodal review, Browser/device QA, owner perceptual authority, rights/policy PASS and a separate YouTube upload gate. The current `cfp-v1-13` master retains all prior immutable receipts but is reclassified as `TECHNICAL_CLEAN_CONTROL_ONLY` after the owner observed a slide-like, crude, simple presentation with weak motion and mobile typography. The owner rejection does not imply a full-playback attestation. Release remains false.

**Reason:** the prior Factory review inspected a contact sheet and the Browser gate proved playback, decoded audio, pixel change, mobile capture and runtime behavior. Neither observer measured sustained visual richness, semantic motion density, YouTube-scale typography, narrative retention design or the complete audience experience. Treating those receipts as creative acceptance would repeat the category error already identified by the full-playback correction. The repair must begin at blueprint and compositor design: create and qualify a 60–90 second Golden Sequence before any full-video expansion. Historical evidence remains append-only and Production V2 remains untouched.

## ADR-108 — Dual Factory failure authorizes one exact R8 source repair, not a retry loop

**Decision:** `AUDIENCE_GOLDEN_REVISION_8` may be created exactly once only when the same R7 exact master has independent visual FAIL and exact-audio FAIL receipts. The visual repair must express each hold, clearing and settlement fact as completed or pending at the sampled moment; inactive future states cannot use affirmative completed labels. The audio repair must synthesize a new exact narration artifact under the paid-plan/native-request/R2 chain, with lower speed and style, higher stability, compression and at least 3 dBTP target headroom. R7 bytes and failures remain immutable. R8 must pass the complete deterministic, visual and audio gates before Browser/device can open; Browser cannot provide owner truth, and freeze remains owner-bound.

**Reason:** R7 removed the prior amount, record-side and world-diversity defects, but the remaining state comparison encoded time only through circle highlighting while all captions read as accomplished facts. Its separately generated narration also contained click/clipping and pacing/continuity observations. Reusing either failed layer or adding an unbounded QA retry would launder evidence. One dual-failure-bound replacement repairs the owning layers while retaining the full authority, cost, idempotency and publication locks.

## ADR-109 — A systemic composition failure requires a compositor revision, not more overlay polish

**Decision:** `AUDIENCE_GOLDEN_REVISION_9` may be created exactly once only when the same R8 exact master has visual FAIL and exact-audio PASS receipts. R8's audio PASS is preserved as evidence and its safer settings become R9's qualified synthesis/mastering parameters. The visual repair must replace the persistent headline-band grammar with 40 micro-scenes across five alternating composition families, hold no composition longer than 1.9 seconds, use no camera-only transition, visibly transform 12 obligations into one net result, and distinguish `ĐÃ QUA`, `HIỆN TẠI` and `TIẾP THEO` in every state snapshot. R8 bytes and both QA receipts remain immutable. Browser/device stays closed until both R9 Factory layers pass; owner playback and freeze remain separately owner-bound.

**Reason:** R8 corrected the time-local wording and audio defects, but Factory visual QA identified the root problem as systemic composition rather than a missing caption. Adding another headline, badge or decorative token would preserve the slide-deck grammar and spend another review without changing the audience experience. A bounded compositor-level replacement addresses the owning layer while retaining exact evidence, thresholds, rights, cost and publication locks.

## ADR-110 — Layout variation does not repair a slide grammar; R10 must make objects carry the explanation

**Decision:** `AUDIENCE_GOLDEN_REVISION_10` may be created exactly once only when the same R9 exact master has visual FAIL and exact-audio PASS receipts. The explanatory runtime must contain no persistent title card, lower-third text block or dotted-route grammar; the inherited image world is limited to hook and payoff. Thirty-six full-frame scenes must express the transaction through object transformation. Clearing actors remain visibly labeled `MERCHANT` and `NETWORK`; hold, matched, moving and settled each receive one full-frame current state; and cancellation, hold expiry, refund and dispute each receive a resolved outcome before recap. R9 bytes and receipts remain immutable. Factory, Browser, owner and freeze authority remain separate.

**Reason:** R9 changed crops and panel geometry every 1.9 seconds yet Factory QA scored it lower because every variation still inherited the same diorama/title-card/route vocabulary. The evidence demonstrates that cut density and layout count are not audience richness. R10 therefore changes the visual language itself: objects, amounts, actors and transformations become the primary explanation while text is reduced to large labels. This repairs the owning compositor layer without weakening thresholds or laundering R9's valid audio PASS.

## ADR-111 — Isolated object frames do not prove continuous motion; R11 must bind before/after pixels

**Decision:** `AUDIENCE_GOLDEN_REVISION_11` may be created exactly once only when the same R10 exact master has visual FAIL and exact-audio PASS receipts. R10's audio PASS and qualified settings remain evidence, but R11 must replace its repeated gradient/centered-object/progress-chrome composition with sixteen mixed-media continuous transformations. Persistent headings, bottom progress chrome and repeated template backgrounds are forbidden. Essential text is Vietnamese and mobile-safe. The four QA atlases must contain sixteen ordered before/after pairs from those same sequences so stored pixels expose meaning-changing object motion. R10 bytes and receipts remain immutable; Factory, Browser, owner and freeze authority remain separate.

**Reason:** R10 removed the earlier diorama/title-card/dotted-route vocabulary yet Factory visual QA fell to 84 because the replacement still behaved as static infographic slides. The sampled frames showed object substitution, not continuous causal transformation, and retained small or mixed-language labels. Another layout-only adjustment would repeat the same failure. R11 therefore changes both the visual medium and the evidence sampling without weakening the acceptance threshold or spending on an unexamined retry.

## ADR-112 — Paired motion samples can preserve card pacing; R12 must be one chronological journey

**Decision:** `AUDIENCE_GOLDEN_REVISION_12` may be created exactly once only when the same R11 exact master has visual FAIL and exact-audio PASS receipts. R11's audio PASS and qualified settings remain evidence. R12 replaces sixteen discrete sequences with six continuous acts joined by one persistent transaction token. Each act must transform object geometry and semantic state internally; persistent heading, caption/progress bar, repeated centered composition and adjacent near-identical evidence pairs are forbidden. The state rail must draw each exception directly from its owning endpoint. Critical text is designed at the equivalent of at least 108 px at 1080p. The four QA atlases contain 32 uniformly spaced chronological frames and truthfully remain image evidence; they never claim native-video observation. R11 bytes and receipts remain immutable; Factory, Browser, owner and freeze authority remain separate.

**Reason:** R11 increased visual richness and motion score, but Factory QA still found one P1 across the entire runtime because sixteen icon/caption scenes and paired near-identical samples preserved slide-deck rhythm. Its state rail and exception hub also formed two taxonomies without visible mapping, while small obligation and branch labels weakened mobile reading. A six-act continuous journey repairs the temporal and semantic grammar at the compositor layer. Uniform chronological frames expose whether the journey actually evolves without misrepresenting the image-only capability of the active reviewer.

## ADR-113 — A nearly complete journey still fails when arithmetic is implicit or one map repeats

**Decision:** `AUDIENCE_GOLDEN_REVISION_13` may be created exactly once only when the same R12 exact master has visual FAIL and exact-audio PASS receipts. It preserves the six-act journey but must render `2,00 + phí mạng 0,05 = 2,05` before any matched conclusion, replace twelve tiny obligation markers with large actor-and-amount groups, and replace the thirteen-second state rail with four distinct full-frame state compositions followed by a state-bound exception quartet. R13 also adds executor resume from a complete work directory so an interrupted orchestration shell cannot force re-rendering or alter already-created bytes. R12 bytes and receipts remain immutable; Factory, Browser, owner and freeze authority remain separate.

**Reason:** The R12 failure is localized and evidence-specific, not permission to redesign unrelated passing acts or weaken the gate. Explicit arithmetic repairs semantic causality; labeled groups repair mobile identification; distinct state frames repair retention pacing. Resume reuses the exact local master/audio/atlas files and relies on idempotent server chunk keys, preserving append-only evidence after a transport interruption.

## ADR-114 — Correct content held too long is still a slide; R14 binds one causal state to each evidence position

**Decision:** `AUDIENCE_GOLDEN_REVISION_14` may be created exactly once only when the same R13 exact master has visual FAIL and exact-audio PASS receipts. The 32 uniformly spaced evidence positions must map to 32 different causal states and compositions; no equation or panel may occupy adjacent samples. Authorization must visibly reach `ĐÃ CHO PHÉP` before the hold changes the available balance. Clearing and netting each require four different transformation states. `GIỮ`, `KHỚP`, `CHUYỂN` and `XONG` remain separate full frames, and cancellation, expiry, refund and dispute each receive a separate progressing branch. R13 bytes and receipts remain immutable; Factory, Browser, owner and freeze authority remain separate.

**Reason:** R13 repaired the facts but scored lower because it presented those facts as prolonged panels. The independent result proves semantic correctness and mobile labels cannot compensate for stagnant temporal grammar. R14 therefore treats each sampled moment as a different causal event in the same transaction world rather than a new caption on the same slide.

## ADR-115 — Distinct slides are still slides; R15 is one spatial world with one immutable transaction

**Decision:** `AUDIENCE_GOLDEN_REVISION_15` may be created exactly once only when the same R14 exact master has visual FAIL and audio FAIL receipts. R15 must use one continuous 14,400 px world and a camera following `TX-01 · 2,00`; title-card/poster composition is forbidden. Fee `0,05` and final record `2,05` must never replace the principal identity. A camera crop may contain at most two actors and two monetary values, transfer rails must sit behind values, settlement hops and exception branches must be sequential. Audio must be regenerated with sealed conservative settings and pass continuous resampling plus de-click mastering. R14 bytes and receipts remain immutable; Factory, Browser, owner and freeze authority remain separate.

**Reason:** R14 proved that maximizing composition count does not create cinematic continuity: independent QA still saw 32 poster-like screens and also found a concrete identity break. Audio independently exposed a click and two continuity/pacing observations. The repair therefore changes the spatial and audio systems rather than adding more screens or weakening thresholds.
