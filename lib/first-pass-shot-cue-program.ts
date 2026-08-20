export const SHOT_CUE_PROGRAM_VERSION = "SHOT_CUE_PROGRAM_V1" as const;
export const SHOT_CUE_COMPILER_VERSION = "DETERMINISTIC_SHOT_CUE_COMPILER_1.0.0" as const;

export type VisualRoute = "SOURCE" | "MAKE" | "HYBRID";
export type VisualArchetype =
  | "TRANSACTION_STATE_PROOF"
  | "PROCESS_ROUTE"
  | "DATA_VISUALIZATION"
  | "DOCUMENTARY_LIVE_ACTION"
  | "SOURCE_AUTHORED_HYBRID"
  | "ABSTRACT_AUTHORED"
  | "RIGHTS_SENSITIVE"
  | "MOBILE_TEXT_INTENSIVE";

export type FrozenParentArtifact = {
  stageKey: "06" | "07A" | "07B";
  artifactId: string;
  contentHash: string;
  lifecycleState: "FROZEN";
};

export type ShotCueCompilerClause = {
  narrationClauseId: string;
  narrationText: string;
  claimIds: string[];
  startSeconds: number;
  endSeconds: number;
  narrativeJob: string;
  visual: {
    route: VisualRoute;
    archetype: VisualArchetype;
    treatmentFamily: string;
    actors: string[];
    objects: string[];
    action: string;
    entryState: string;
    midpointState: string;
    exitState: string;
    sourceQuery: string;
    layers: Array<{ id: string; role: string; treatment: string; motionFunction: string }>;
    visibleText: string[];
    minimumFontPx: number;
  };
  audio: {
    musicFunctions: string[];
    ambienceFunctions: string[];
    sfxFunctions: string[];
    silenceFunctions: string[];
    duckingDb: number;
  };
  requiredEvidence: string[];
  prohibitedEvidence: string[];
  qualityBindingIds: string[];
  rightsState: "CHANNEL_ORIGINATED" | "COMMERCIAL_SOURCE_REQUIRED";
};

export type ShotCueCompilerInput = {
  fixtureId: string;
  productionContextId: string;
  canonicalBriefHash: string;
  durationSeconds: number;
  parentArtifacts: FrozenParentArtifact[];
  visualGrammar: {
    version: string;
    minimumTreatmentFamilies: number;
    maximumCameraOnlyRatio: number;
    fallbackAllowed: false;
    treatmentFamilies: string[];
  };
  clauses: ShotCueCompilerClause[];
};

export type ShotCue = ShotCueCompilerClause & {
  shotId: string;
  ordinal: number;
  midpointSeconds: number;
  acceptanceTests: {
    entry: string[];
    midpoint: string[];
    exit: string[];
  };
  fallbackAllowed: false;
};

export type ShotCueProgram = {
  artifactType: "SHOT_CUE_PROGRAM";
  programVersion: typeof SHOT_CUE_PROGRAM_VERSION;
  compilerVersion: typeof SHOT_CUE_COMPILER_VERSION;
  standardVersion: "FIRST_PASS_QUALITY_V1";
  fixtureId: string;
  productionContextId: string;
  canonicalBriefHash: string;
  durationSeconds: number;
  shotCount: number;
  treatmentFamilies: string[];
  parentArtifacts: FrozenParentArtifact[];
  providerPlan: { mode: "ZERO_DISPATCH"; requestBudget: 0; spendBudgetUsd: 0 };
  fallbackAllowed: false;
  shots: ShotCue[];
};

export type ShotCueProgramLint = {
  passed: boolean;
  exactDuration: boolean;
  gapCount: number;
  overlapCount: number;
  schemaGapCount: number;
  treatmentFamilyCount: number;
  providerRequests: 0;
  spendUsd: 0;
  errors: string[];
};

const roundMillis = (value: number) => Math.round(value * 1000) / 1000;
const unique = <T,>(values: T[]) => [...new Set(values)];
const words = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function compileShotCueProgram(input: ShotCueCompilerInput): ShotCueProgram {
  const shots = input.clauses.map((clause, index): ShotCue => ({
    ...clause,
    shotId: `FP3-SHOT-${String(index + 1).padStart(2, "0")}`,
    ordinal: index + 1,
    midpointSeconds: roundMillis((clause.startSeconds + clause.endSeconds) / 2),
    acceptanceTests: {
      entry: [`Observe ${clause.visual.entryState}`, `Bind ${clause.narrationClauseId} at ${clause.startSeconds.toFixed(3)}s`],
      midpoint: [`Observe ${clause.visual.midpointState}`, `Prove ${clause.visual.action}`],
      exit: [`Observe ${clause.visual.exitState}`, `Resolve ${clause.claimIds.join(", ")} before ${clause.endSeconds.toFixed(3)}s`],
    },
    fallbackAllowed: false,
  }));
  return {
    artifactType: "SHOT_CUE_PROGRAM",
    programVersion: SHOT_CUE_PROGRAM_VERSION,
    compilerVersion: SHOT_CUE_COMPILER_VERSION,
    standardVersion: "FIRST_PASS_QUALITY_V1",
    fixtureId: input.fixtureId,
    productionContextId: input.productionContextId,
    canonicalBriefHash: input.canonicalBriefHash,
    durationSeconds: input.durationSeconds,
    shotCount: shots.length,
    treatmentFamilies: unique(shots.map((shot) => shot.visual.treatmentFamily)),
    parentArtifacts: input.parentArtifacts,
    providerPlan: { mode: "ZERO_DISPATCH", requestBudget: 0, spendBudgetUsd: 0 },
    fallbackAllowed: false,
    shots,
  };
}

export function lintShotCueProgram(program: ShotCueProgram): ShotCueProgramLint {
  const errors: string[] = [];
  let gapCount = 0;
  let overlapCount = 0;
  const schemaErrors: string[] = [];
  const pushSchema = (shotId: string, field: string) => schemaErrors.push(`${shotId}:${field}`);
  if (program.durationSeconds < 60 || program.durationSeconds > 90) errors.push("GOLDEN_DURATION_OUTSIDE_60_90_SECONDS");
  if (program.providerPlan.mode !== "ZERO_DISPATCH" || program.providerPlan.requestBudget !== 0 || program.providerPlan.spendBudgetUsd !== 0) errors.push("PROVIDER_DISPATCH_NOT_ZERO");
  if (program.fallbackAllowed !== false) errors.push("FALLBACK_MUST_BE_DISABLED");
  if (program.parentArtifacts.length !== 3 || ["06", "07A", "07B"].some((stageKey) => !program.parentArtifacts.some((parent) => parent.stageKey === stageKey && parent.lifecycleState === "FROZEN" && parent.artifactId && parent.contentHash))) errors.push("FROZEN_PARENT_BINDINGS_INCOMPLETE");
  if (program.shotCount !== program.shots.length || program.shots.length === 0) errors.push("SHOT_COUNT_INVALID");
  if (unique(program.shots.map((shot) => shot.shotId)).length !== program.shots.length) errors.push("SHOT_IDS_NOT_UNIQUE");
  if (unique(program.shots.map((shot) => shot.narrationClauseId)).length !== program.shots.length) errors.push("NARRATION_CLAUSE_IDS_NOT_UNIQUE");

  let cursor = 0;
  for (const shot of program.shots) {
    const start = roundMillis(shot.startSeconds);
    const end = roundMillis(shot.endSeconds);
    if (start > roundMillis(cursor)) gapCount += 1;
    if (start < roundMillis(cursor)) overlapCount += 1;
    cursor = end;
    if (!(end > start) || !(shot.midpointSeconds > start && shot.midpointSeconds < end)) pushSchema(shot.shotId, "TIMING");
    if (!shot.narrationText || !shot.narrativeJob || shot.claimIds.length === 0) pushSchema(shot.shotId, "NARRATION_OR_CLAIM_BINDING");
    if (!shot.visual.route || !shot.visual.archetype || !shot.visual.treatmentFamily) pushSchema(shot.shotId, "VISUAL_ROUTE");
    if (shot.visual.actors.length === 0 || shot.visual.objects.length === 0 || !shot.visual.action) pushSchema(shot.shotId, "SCENE_SEMANTICS");
    if (!shot.visual.entryState || !shot.visual.midpointState || !shot.visual.exitState) pushSchema(shot.shotId, "TEMPORAL_STATES");
    if (shot.visual.route !== "MAKE" && !shot.visual.sourceQuery) pushSchema(shot.shotId, "SOURCE_QUERY");
    if (shot.visual.layers.length < 3 || shot.visual.layers.some((layer) => !layer.id || !layer.role || !layer.treatment || !layer.motionFunction)) pushSchema(shot.shotId, "LAYER_SPECIFICATION");
    if (shot.visual.minimumFontPx < 32 || shot.visual.visibleText.some((line) => words(line) > 12)) pushSchema(shot.shotId, "MOBILE_TEXT_CONSTRAINT");
    if (shot.audio.musicFunctions.length === 0 || shot.audio.duckingDb >= 0) pushSchema(shot.shotId, "AUDIO_FUNCTIONS");
    if (shot.requiredEvidence.length === 0 || shot.prohibitedEvidence.length === 0) pushSchema(shot.shotId, "EVIDENCE_CONSTRAINTS");
    if (!shot.qualityBindingIds.includes("VQ-M1-CANONICAL-COVERAGE") || !shot.qualityBindingIds.includes("VQ-M1-SEMANTIC-ALIGNMENT")) pushSchema(shot.shotId, "QUALITY_BINDINGS");
    if (shot.acceptanceTests.entry.length === 0 || shot.acceptanceTests.midpoint.length === 0 || shot.acceptanceTests.exit.length === 0) pushSchema(shot.shotId, "ACCEPTANCE_TESTS");
    if (shot.fallbackAllowed !== false) pushSchema(shot.shotId, "FALLBACK_DISABLED");
  }
  const exactDuration = program.shots.length > 0 && roundMillis(program.shots[0].startSeconds) === 0 && roundMillis(cursor) === roundMillis(program.durationSeconds) && gapCount === 0 && overlapCount === 0;
  if (!exactDuration) errors.push("TIMELINE_NOT_EXACT_OR_CONTIGUOUS");
  if (program.treatmentFamilies.length < 3) errors.push("MIXED_TREATMENT_FLOOR_NOT_MET");
  errors.push(...schemaErrors);
  return {
    passed: errors.length === 0,
    exactDuration,
    gapCount,
    overlapCount,
    schemaGapCount: schemaErrors.length,
    treatmentFamilyCount: program.treatmentFamilies.length,
    providerRequests: 0,
    spendUsd: 0,
    errors,
  };
}

export async function compileAndSealShotCueProgram(input: ShotCueCompilerInput) {
  const program = compileShotCueProgram(input);
  const lint = lintShotCueProgram(program);
  if (!lint.passed) throw new Error(`SHOT_CUE_PROGRAM_LINT_FAILED:${lint.errors.join("|")}`);
  return { program, lint, contentHash: await sha256Hex(canonicalJson(program)) };
}

const commonQualityBindings = ["VQ-M0-FACTUAL-TRACEABILITY", "VQ-M1-CANONICAL-COVERAGE", "VQ-M1-SEMANTIC-ALIGNMENT"];
const evidence = ["decoded entry/midpoint/exit pixels", "claim-to-pixel binding", "exact timeline proof"];
const prohibited = ["generic fallback", "camera-only semantic motion", "legacy or rejected runtime bytes"];
const layer = (id: string, role: string, treatment: string, motionFunction: string) => ({ id, role, treatment, motionFunction });

export const FP3_GOLDEN_CONTRACT_FIXTURE: ShotCueCompilerInput = {
  fixtureId: "FP3-GOLDEN-CONTRACT-80S-V1",
  productionContextId: "video-01-golden-contract-qualification",
  canonicalBriefHash: "sha256:video-01-active-brief-frozen-for-fp3",
  durationSeconds: 80.252,
  parentArtifacts: [
    { stageKey: "06", artifactId: "VIDEO-01-STAGE-06-FROZEN", contentHash: "sha256:stage-06-frozen-intent", lifecycleState: "FROZEN" },
    { stageKey: "07A", artifactId: "VIDEO-01-STAGE-07A-FROZEN", contentHash: "sha256:stage-07a-frozen-sound-intent", lifecycleState: "FROZEN" },
    { stageKey: "07B", artifactId: "VIDEO-01-STAGE-07B-FROZEN", contentHash: "sha256:stage-07b-frozen-visual-intent", lifecycleState: "FROZEN" },
  ],
  visualGrammar: {
    version: "MIXED_TREATMENT_VISUAL_GRAMMAR_V1",
    minimumTreatmentFamilies: 3,
    maximumCameraOnlyRatio: 0.35,
    fallbackAllowed: false,
    treatmentFamilies: ["LIVE_ACTION", "ACTOR_FLOW", "PROCESS_MAP", "DATA_LEDGER", "LAYERED_HYBRID", "ABSTRACT_CONSEQUENCE", "RIGHTS_PROOF", "MOBILE_PAYOFF"],
  },
  clauses: [
    {
      narrationClauseId: "NARR-001", narrationText: "A card purchase starts a chain, not a single transfer.", claimIds: ["CLAIM-CHAIN-START"], startSeconds: 0, endSeconds: 3.5, narrativeJob: "Open a concrete mystery and establish the transaction anchor.",
      visual: { route: "HYBRID", archetype: "DOCUMENTARY_LIVE_ACTION", treatmentFamily: "LIVE_ACTION", actors: ["customer", "merchant"], objects: ["card", "terminal", "$100 anchor"], action: "customer presents payment and the terminal emits an authorization message", entryState: "customer and merchant share one physical moment", midpointState: "terminal signal separates from the physical card", exitState: "authorization message leaves the merchant", sourceQuery: "commercially licensed close-up card terminal purchase merchant", layers: [layer("source", "documentary source window", "live action", "preserve real hand and terminal motion"), layer("anchor", "$100 transaction anchor", "authored type", "hold amount invariant"), layer("signal", "authorization pulse", "motion graphic", "depart terminal toward processor")], visibleText: ["One purchase. Many institutions."], minimumFontPx: 42 },
      audio: { musicFunctions: ["immediate investigative pulse"], ambienceFunctions: ["subtle retail room tone"], sfxFunctions: ["terminal confirmation onset"], silenceFunctions: [], duckingDb: -12 }, requiredEvidence: evidence, prohibitedEvidence: prohibited, qualityBindingIds: [...commonQualityBindings, "VQ-M2-HOOK-PACING"], rightsState: "COMMERCIAL_SOURCE_REQUIRED",
    },
    {
      narrationClauseId: "NARR-002", narrationText: "The merchant sends the request through a processor and an acquiring bank.", claimIds: ["CLAIM-AUTH-ROUTE"], startSeconds: 3.5, endSeconds: 11, narrativeJob: "Name the first institutional handoffs without conflating their roles.",
      visual: { route: "MAKE", archetype: "PROCESS_ROUTE", treatmentFamily: "PROCESS_MAP", actors: ["merchant", "processor", "acquirer"], objects: ["authorization request", "route ledger"], action: "authorization request crosses two labeled institutional boundaries", entryState: "merchant owns the request", midpointState: "processor validates and routes the message", exitState: "acquirer receives the request with role labels intact", sourceQuery: "", layers: [layer("actors", "institution nodes", "diagram", "activate only the current role"), layer("route", "authorization path", "vector flow", "advance message between boundaries"), layer("legend", "message-versus-money legend", "persistent legend", "keep authorization visibly distinct")], visibleText: ["Merchant", "Processor", "Acquirer"], minimumFontPx: 36 },
      audio: { musicFunctions: ["add a second rhythmic layer"], ambienceFunctions: [], sfxFunctions: ["one soft handoff tick per boundary"], silenceFunctions: [], duckingDb: -11 }, requiredEvidence: evidence, prohibitedEvidence: prohibited, qualityBindingIds: [...commonQualityBindings, "VQ-M2-PILLAR-TRANSACTION-CHAIN", "VQ-M2-PILLAR-FLOW-LEGEND"], rightsState: "CHANNEL_ORIGINATED",
    },
    {
      narrationClauseId: "NARR-003", narrationText: "The card network routes the request to the issuing bank for a decision.", claimIds: ["CLAIM-ISSUER-DECISION"], startSeconds: 11, endSeconds: 21, narrativeJob: "Show who decides and preserve directional responsibility.",
      visual: { route: "MAKE", archetype: "TRANSACTION_STATE_PROOF", treatmentFamily: "ACTOR_FLOW", actors: ["network", "issuer"], objects: ["authorization request", "decision state"], action: "network forwards the request and issuer changes decision state", entryState: "network holds an undecided request", midpointState: "issuer evaluates the request", exitState: "issuer owns an approve-or-decline decision", sourceQuery: "", layers: [layer("network", "network actor", "institution glyph", "forward request only"), layer("issuer", "issuer actor", "state machine", "transition pending to decided"), layer("responsibility", "decision ownership", "highlight", "attach decision label to issuer")], visibleText: ["Issuer decides"], minimumFontPx: 44 },
      audio: { musicFunctions: ["brief tension lift under the decision"], ambienceFunctions: [], sfxFunctions: ["rising route tone", "resolved decision tone"], silenceFunctions: ["120 ms decision pause"], duckingDb: -12 }, requiredEvidence: evidence, prohibitedEvidence: prohibited, qualityBindingIds: [...commonQualityBindings, "VQ-M2-PILLAR-TRANSACTION-CHAIN"], rightsState: "CHANNEL_ORIGINATED",
    },
    {
      narrationClauseId: "NARR-004", narrationText: "Approval is only the first phase; clearing and settlement happen later.", claimIds: ["CLAIM-AUTH-NOT-SETTLEMENT"], startSeconds: 21, endSeconds: 31.5, narrativeJob: "Break the common misconception that approval equals final money movement.",
      visual: { route: "MAKE", archetype: "DATA_VISUALIZATION", treatmentFamily: "DATA_LEDGER", actors: ["authorization ledger", "settlement ledger"], objects: ["approved message", "unsettled amount"], action: "authorization ledger closes while settlement ledger remains pending", entryState: "both ledgers are pending", midpointState: "authorization becomes approved", exitState: "settlement remains explicitly pending", sourceQuery: "", layers: [layer("auth", "authorization ledger", "data table", "change pending to approved"), layer("settle", "settlement ledger", "data table", "hold pending state"), layer("divider", "phase separator", "timeline", "reveal later phase without merging")], visibleText: ["Approved now", "Settled later"], minimumFontPx: 40 },
      audio: { musicFunctions: ["drop percussion to expose the distinction"], ambienceFunctions: [], sfxFunctions: ["authorization stamp", "muted pending pulse"], silenceFunctions: ["180 ms contrast pause"], duckingDb: -13 }, requiredEvidence: evidence, prohibitedEvidence: prohibited, qualityBindingIds: [...commonQualityBindings, "VQ-M2-PILLAR-TRANSACTION-CHAIN"], rightsState: "CHANNEL_ORIGINATED",
    },
    {
      narrationClauseId: "NARR-005", narrationText: "Clearing reconciles records before settlement moves funds between institutions.", claimIds: ["CLAIM-CLEARING-SETTLEMENT"], startSeconds: 31.5, endSeconds: 42.5, narrativeJob: "Demonstrate the causal order of clearing then settlement.",
      visual: { route: "HYBRID", archetype: "SOURCE_AUTHORED_HYBRID", treatmentFamily: "LAYERED_HYBRID", actors: ["acquirer", "network", "issuer"], objects: ["clearing records", "settlement instruction"], action: "records reconcile before a distinct funds-transfer layer activates", entryState: "institution records disagree", midpointState: "clearing aligns the records", exitState: "settlement instruction becomes eligible", sourceQuery: "commercially licensed institutional operations data center payment processing", layers: [layer("source", "institutional operations source", "documentary plate", "show real operational context"), layer("records", "reconciliation overlay", "authored data layer", "align mismatched entries"), layer("funds", "settlement instruction", "separate flow layer", "activate only after reconciliation")], visibleText: ["1. Clearing", "2. Settlement"], minimumFontPx: 40 },
      audio: { musicFunctions: ["reintroduce pulse after reconciliation"], ambienceFunctions: ["low operational room tone"], sfxFunctions: ["record alignment clicks", "single settlement release"], silenceFunctions: [], duckingDb: -11 }, requiredEvidence: [...evidence, "licensed source checksum and window"], prohibitedEvidence: prohibited, qualityBindingIds: [...commonQualityBindings, "VQ-M2-PILLAR-TRANSACTION-CHAIN", "VQ-M1-RIGHTS-LINEAGE"], rightsState: "COMMERCIAL_SOURCE_REQUIRED",
    },
    {
      narrationClauseId: "NARR-006", narrationText: "Fees, timing, and liability can differ by contract and transaction type.", claimIds: ["CLAIM-VARIABILITY-QUALIFIER"], startSeconds: 42.5, endSeconds: 54.5, narrativeJob: "Introduce bounded variability without inventing a universal fee split.",
      visual: { route: "MAKE", archetype: "ABSTRACT_AUTHORED", treatmentFamily: "ABSTRACT_CONSEQUENCE", actors: ["contract terms", "transaction type", "liability rule"], objects: ["fee range", "timing range", "qualifier"], action: "three input conditions reshape a bounded outcome range", entryState: "one misleading fixed outcome is visible", midpointState: "conditions split the outcome into ranges", exitState: "qualifier remains attached to every range", sourceQuery: "", layers: [layer("conditions", "condition controls", "abstract tokens", "separate contractual inputs"), layer("ranges", "bounded outcomes", "range bands", "expand without implying exact universal values"), layer("qualifier", "scope qualifier", "persistent annotation", "remain visible through exit")], visibleText: ["Terms vary", "No universal split"], minimumFontPx: 38 },
      audio: { musicFunctions: ["thin arrangement to support careful qualification"], ambienceFunctions: [], sfxFunctions: ["three restrained condition cues"], silenceFunctions: [], duckingDb: -14 }, requiredEvidence: evidence, prohibitedEvidence: [...prohibited, "unqualified universal fee percentages"], qualityBindingIds: [...commonQualityBindings, "VQ-M2-SERIES-FOLLOW-THE-FEE"], rightsState: "CHANNEL_ORIGINATED",
    },
    {
      narrationClauseId: "NARR-007", narrationText: "A failed or reversed transaction follows a separate responsibility path.", claimIds: ["CLAIM-EXCEPTION-PATH"], startSeconds: 54.5, endSeconds: 67, narrativeJob: "Make the exception path materially visible and rights-safe.",
      visual: { route: "SOURCE", archetype: "RIGHTS_SENSITIVE", treatmentFamily: "RIGHTS_PROOF", actors: ["customer", "merchant support", "issuer support"], objects: ["decline notice", "reversal record", "source license"], action: "a decline or reversal branches away from the successful path", entryState: "successful route is the active baseline", midpointState: "exception event opens a separate branch", exitState: "responsibility branch ends with explicit owner and provenance", sourceQuery: "commercially licensed customer merchant support payment declined documentary footage", layers: [layer("source", "support interaction source", "documentary source", "show authentic consequence"), layer("branch", "exception path", "authored route", "diverge from success path"), layer("provenance", "rights and source proof", "audit-only overlay", "bind checksum and license off audience surface")], visibleText: ["Exception path"], minimumFontPx: 42 },
      audio: { musicFunctions: ["brief low-register consequence turn"], ambienceFunctions: ["subtle support environment"], sfxFunctions: ["branch break cue"], silenceFunctions: ["220 ms consequence pause"], duckingDb: -12 }, requiredEvidence: [...evidence, "license URL", "source checksum", "decoded source window"], prohibitedEvidence: prohibited, qualityBindingIds: [...commonQualityBindings, "VQ-M2-PILLAR-EXCEPTION", "VQ-M1-RIGHTS-LINEAGE"], rightsState: "COMMERCIAL_SOURCE_REQUIRED",
    },
    {
      narrationClauseId: "NARR-008", narrationText: "The useful question is not where one fee goes, but which institution owns each state change.", claimIds: ["CLAIM-OWNERSHIP-PAYOFF"], startSeconds: 67, endSeconds: 80.252, narrativeJob: "Resolve the hook with a reusable mental model and a mobile-readable payoff.",
      visual: { route: "MAKE", archetype: "MOBILE_TEXT_INTENSIVE", treatmentFamily: "MOBILE_PAYOFF", actors: ["merchant", "processor", "acquirer", "network", "issuer"], objects: ["authorization", "clearing", "settlement", "exception"], action: "each phase snaps to its accountable institution", entryState: "all institutions are visible without ownership labels", midpointState: "phase labels attach one by one", exitState: "a compact ownership map remains on screen", sourceQuery: "", layers: [layer("actors", "institution row", "mobile cards", "highlight one owner at a time"), layer("phases", "phase labels", "kinetic type", "attach to accountable institution"), layer("payoff", "ownership question", "hero statement", "resolve into one readable rule")], visibleText: ["Who owns each state change?"], minimumFontPx: 46 },
      audio: { musicFunctions: ["resolve theme with a restrained payoff"], ambienceFunctions: [], sfxFunctions: ["one ownership lock per phase"], silenceFunctions: ["final 300 ms hold"], duckingDb: -12 }, requiredEvidence: evidence, prohibitedEvidence: prohibited, qualityBindingIds: [...commonQualityBindings, "VQ-M1-MOBILE-LEGIBILITY", "VQ-M2-PILLAR-FLOW-LEGEND"], rightsState: "CHANNEL_ORIGINATED",
    },
  ],
};

export const FP3_GOLDEN_CONTRACT_SUMMARY = {
  fixtureId: FP3_GOLDEN_CONTRACT_FIXTURE.fixtureId,
  durationSeconds: FP3_GOLDEN_CONTRACT_FIXTURE.durationSeconds,
  shotCount: FP3_GOLDEN_CONTRACT_FIXTURE.clauses.length,
  treatmentFamilyCount: FP3_GOLDEN_CONTRACT_FIXTURE.visualGrammar.treatmentFamilies.length,
  timelineGaps: 0,
  timelineOverlaps: 0,
  schemaGaps: 0,
  providerRequests: 0,
  spendUsd: 0,
} as const;
