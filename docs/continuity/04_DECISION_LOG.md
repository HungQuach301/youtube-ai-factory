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
