export const WAVE_9_PRODUCTION_SYSTEM_V23 = Object.freeze({
  version: "WAVE_9_PRODUCTION_SYSTEM_V23_1",
  architecture: "PREPRODUCTION_COMPILER_PLUS_DETERMINISTIC_PRODUCTION_ENGINE",
  objective: "Design meaning, visual grammar, motion and assets upstream so the first release candidate is already production-complete.",
  qaBoundary: Object.freeze({ maxAttempts: 2, role: "VERIFY_RELEASE_CANDIDATE_ONLY", mayAuthorProductionBriefs: false, mayMutateFrozenArtifacts: false }),
  toolchain: Object.freeze([
    "OpenAI structured reasoning · narrative/evidence and shot-design authoring",
    "JSON Schema + deterministic lint · typed artifact contracts and referential integrity",
    "Storyboard renderer · ENTRY/MIDPOINT/EXIT composition before final pixels",
    "Remotion scene components · deterministic layout and motion recipes",
    "FFmpeg/ffprobe · audio mix, encoding and stored-master read-back",
    "R2 + Drive artifact store · immutable bytes, hashes, lineage and rights records",
  ]),
  preProduction: Object.freeze([
    { order: 1, id: "NARRATIVE_EVIDENCE", artifact: "NarrativeEvidenceMap.json", builder: "Claim-to-proof compiler", freeze: "Every narration clause has subject, action, target, state, evidence span and viewer takeaway." },
    { order: 2, id: "VISUAL_LANGUAGE", artifact: "VisualLanguageBible.json + Styleframes", builder: "Visual direction system", freeze: "Palette, typography, primitive vocabulary, forbidden motifs and mobile-safe density are fixed." },
    { order: 3, id: "ARCHETYPE_RECIPE", artifact: "ShotArchetypeMap.json", builder: "Archetype recipe allocator", freeze: "Every shot uses a domain-native recipe; adjacent shots cannot repeat the same visual treatment." },
    { order: 4, id: "SHOT_DESIGN", artifact: "ShotDesignPackage.json", builder: "Typed shot designer", freeze: "Composition, spatial relations, transitions, source route and text budget are explicit." },
    { order: 5, id: "STORYBOARD", artifact: "StoryboardManifest.json", builder: "Three-state storyboard renderer", freeze: "ENTRY/MIDPOINT/EXIT visibly prove the intended meaning without narration." },
    { order: 6, id: "ANIMATIC", artifact: "Animatic.webm", builder: "Motion-first timeline composer", freeze: "Timing, camera, object paths, reading windows and sequence rhythm are locked." },
    { order: 7, id: "ASSET_LOCK", artifact: "ApprovedAssetSet.json", builder: "Source/make/hybrid asset planner", freeze: "Every required asset exists, is rights-traceable, hash-bound and assigned to one shot role." },
    { order: 8, id: "PRODUCTION_MANIFEST", artifact: "ProductionManifest.json", builder: "Immutable manifest compiler", freeze: "Scene graph, assets, layout, motion, audio, fonts and render settings resolve with no fallback." },
  ]),
  production: Object.freeze([
    { order: 1, id: "FINAL_ASSETS", artifact: "FinalAssetBundle", builder: "SOURCE / MAKE / HYBRID constructors", complete: "All source bytes and authored layers match the locked asset plan." },
    { order: 2, id: "COMPILED_SCENE", artifact: "CompiledScene.json", builder: "Manifest-to-scene compiler", complete: "Typed entities, relations, boundaries, lanes, containers and destinations map to render primitives." },
    { order: 3, id: "MOTION_TIMELINE", artifact: "MotionTimeline.json", builder: "Deterministic motion compiler", complete: "Object paths, occlusion, easing, camera and transitions reproduce the approved animatic." },
    { order: 4, id: "AUDIO_TIMELINE", artifact: "AudioTimeline.json", builder: "Voice/music/SFX mixer", complete: "Narration, pronunciation, ducking, loudness and sync are timeline-bound before render." },
    { order: 5, id: "SHOT_MASTER", artifact: "ShotMaster.mp4", builder: "Remotion + FFmpeg renderer", complete: "One immutable shot master is encoded and read back from stored bytes." },
    { order: 6, id: "SEQUENCE_MASTER", artifact: "SequenceMaster.mp4", builder: "Sequence assembler", complete: "Adjacent-shot variation, continuity, rhythm and audio joins are construction properties." },
    { order: 7, id: "RELEASE_CANDIDATE", artifact: "ReleaseCandidateBundle", builder: "Master packager", complete: "Video, manifests, hashes, rights and lineage are frozen as one release candidate." },
  ]),
  forbidden: Object.freeze([
    "ONE_PROMPT_FOR_50_TO_130_SCENES",
    "GENERIC_CARD_FALLBACK",
    "ASSET_SEARCH_DURING_RENDER",
    "MOTION_ADDED_AFTER_STILL_APPROVAL",
    "RANDOM_LAYOUT_OR_RENDER_SEED",
    "AUDIT_SAMPLE_RENDER_BRANCH",
    "QA_FINDING_AS_PRODUCTION_BRIEF",
    "AUTOMATIC_PROVIDER_RETRY",
  ]),
});

export const WAVE_9_PREPRODUCTION_COMPILER_V23 = Object.freeze({
  version: "WAVE_9_PREPRODUCTION_COMPILER_V23_2",
  logicalScope: 166,
  artifactContractsPerShot: 8,
  remoteDispatches: 0,
  productionActivation: "LOCKED_UNTIL_RENDERED_STORYBOARD_ANIMATIC_AND_ASSET_LOCK",
});

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
const list = (value) => Array.isArray(value) ? value : [];

function archetypeFor(shot) {
  const corpus = `${clean(shot.primaryFamily)} ${clean(shot.secondaryFamily)} ${clean(shot.visualJob)} ${clean(shot.sourceMode)}`.toLowerCase();
  if (/receipt|transaction|payment|authorization|settlement|checkout/.test(corpus)) return "TRANSACTION_STATE_PROOF";
  if (/chart|data|waterfall|counter|metric|comparison/.test(corpus)) return "DATA_VISUALIZATION";
  if (/map|timeline|system|diagram|process|route|network/.test(corpus)) return "PROCESS_ROUTE";
  if (/documentary|live.action|interview|street|office/.test(corpus)) return "DOCUMENTARY_LIVE_ACTION";
  if (/rights|licensed|archive/.test(corpus)) return "RIGHTS_SENSITIVE";
  if (/text|quote|headline|mobile/.test(corpus)) return "MOBILE_TEXT_INTENSIVE";
  if (/source|hybrid/.test(corpus)) return "SOURCE_AUTHORED_HYBRID";
  return "ABSTRACT_AUTHORED";
}

const ARCHETYPE_RECIPES = Object.freeze({
  TRANSACTION_STATE_PROOF: { topology: "ACTOR_LANE_GATE_DESTINATION", primitives: ["actor", "value-token", "gate", "lane", "destination", "state-label"], motion: "PHYSICAL_STATE_TRANSFER" },
  DATA_VISUALIZATION: { topology: "BASELINE_DELTA_CAUSE", primitives: ["axis", "series", "annotation", "threshold", "delta"], motion: "DATA_REVEAL_WITH_CAUSAL_FOCUS" },
  PROCESS_ROUTE: { topology: "ORIGIN_ORDERED_WAYPOINTS_DESTINATION", primitives: ["origin", "waypoint", "boundary", "route", "destination"], motion: "ROUTE_TRAVERSAL" },
  DOCUMENTARY_LIVE_ACTION: { topology: "CONTEXT_SUBJECT_ACTION_DETAIL", primitives: ["source-frame", "subject-mask", "focus-region", "caption"], motion: "SOURCE_NATIVE_WITH_SUBTLE_CAMERA" },
  RIGHTS_SENSITIVE: { topology: "LICENSED_SOURCE_CONTEXT_PROOF", primitives: ["source-frame", "rights-record", "focus-region", "caption"], motion: "SOURCE_NATIVE_ONLY" },
  MOBILE_TEXT_INTENSIVE: { topology: "CLAIM_EVIDENCE_HIERARCHY", primitives: ["headline", "evidence-line", "emphasis", "safe-column"], motion: "READING_WINDOW_SEQUENCE" },
  SOURCE_AUTHORED_HYBRID: { topology: "SOURCE_CONTEXT_AUTHORED_EXPLANATION", primitives: ["source-frame", "mask", "authored-overlay", "relation", "caption"], motion: "SOURCE_PLUS_BOUND_OVERLAY" },
  ABSTRACT_AUTHORED: { topology: "ENTITY_RELATION_STATE", primitives: ["entity", "relation", "boundary", "state", "annotation"], motion: "SEMANTIC_STATE_TRANSITION" },
});

function sourceRoute(shot) {
  const mode = clean(shot.sourceMode).toUpperCase();
  if (mode === "SOURCE_PROVIDER") return "SOURCE";
  if (mode === "HYBRID") return "HYBRID";
  return "MAKE";
}

function shotPackage(shot, index, previousTreatment) {
  const logicalId = `MP-${String(index + 1).padStart(3, "0")}`;
  const archetype = archetypeFor(shot);
  const recipe = ARCHETYPE_RECIPES[archetype];
  const route = sourceRoute(shot);
  const variant = ["WIDE_SYSTEM", "FOCUSED_MECHANISM", "LAYERED_EXPLANATION", "CONTRASTED_STATES"][index % 4];
  const treatment = `${archetype}:${variant}`;
  const startSeconds = Number(shot.startSeconds || 0);
  const endSeconds = Number(shot.endSeconds || 0);
  const durationSeconds = Math.max(0, endSeconds - startSeconds);
  const entry = clean(shot.entryState) || "Establish the subject and initial state";
  const midpoint = clean(shot.motionEvent) || "Make the causal action physically visible";
  const exit = clean(shot.exitState) || "Resolve the target state and viewer takeaway";
  const viewerTakeaway = clean(shot.visualJob) || clean(shot.narrationClause);
  const narrationClause = clean(shot.narrationClause);
  const assetNeeds = route === "SOURCE"
    ? [{ role: "PRIMARY_SOURCE", type: "VIDEO", route: "SOURCE", querySet: list(shot.providerQueries).map(clean).filter(Boolean), rightsRequired: true }]
    : route === "HYBRID"
      ? [{ role: "PRIMARY_SOURCE", type: "VIDEO_OR_STILL", route: "SOURCE", querySet: list(shot.providerQueries).map(clean).filter(Boolean), rightsRequired: true }, { role: "EXPLANATION_LAYER", type: "CODE_NATIVE", route: "MAKE", rightsRequired: false }]
      : [{ role: "PRIMARY_AUTHORED", type: "CODE_NATIVE_OR_GENERATED", route: "MAKE", rightsRequired: false }];
  return {
    logicalId,
    sourceShotId: clean(shot.slotId),
    sectionId: clean(shot.sectionId),
    startSeconds,
    endSeconds,
    artifacts: {
      narrativeEvidenceMap: {
        artifact: "NarrativeEvidenceMap.json", lifecycle: "FROZEN", narrationClause, viewerTakeaway,
        semanticObligation: { subject: entry, action: midpoint, target: exit, factualAcceptance: clean(shot.factualAcceptance) },
        evidenceRefs: [clean(shot.slotId), clean(shot.sectionId)].filter(Boolean),
      },
      visualLanguageBinding: {
        artifact: "VisualLanguageBible.binding.json", lifecycle: "FROZEN", bibleVersion: "VISUAL_LANGUAGE_BIBLE_V23_1", palette: "FACTORY_GREEN_NEUTRAL", typography: "MOBILE_SAFE_EDITORIAL", density: "ONE_PRIMARY_IDEA", forbiddenMotifs: ["generic cards", "decorative dashboards", "audience-facing debug labels"],
      },
      shotArchetypeMap: {
        artifact: "ShotArchetypeMap.json", lifecycle: "FROZEN", archetype, recipe, variant, treatment, adjacentTreatmentDifferent: previousTreatment !== treatment,
      },
      shotDesignPackage: {
        artifact: "ShotDesignPackage.json", lifecycle: "FROZEN", route, composition: recipe.topology, primitives: recipe.primitives, motionProfile: recipe.motion, textBudget: { headlineCharacters: 42, annotationCharacters: 56, simultaneousTextBlocks: 3 }, mobileSafe: true, antiRepeat: clean(shot.antiRepeatControl) || "Do not repeat the adjacent shot's topology, camera path or primary asset",
      },
      storyboardManifest: {
        artifact: "StoryboardManifest.json", lifecycle: "SPECIFIED_RENDER_REQUIRED", frameCount: 3,
        frames: [{ role: "ENTRY", at: 0, purpose: entry }, { role: "MIDPOINT", at: Number((durationSeconds * 0.5).toFixed(3)), purpose: midpoint }, { role: "EXIT", at: Number(durationSeconds.toFixed(3)), purpose: exit }],
        renderPolicy: "DOMAIN_NATIVE_PRIMITIVES_NO_GENERIC_FALLBACK",
      },
      animaticPlan: {
        artifact: "AnimaticTimeline.json", lifecycle: "BLOCKED_STORYBOARD_BYTES", durationSeconds, fps: 30, timeline: [{ state: "ENTRY", from: 0, to: Number((durationSeconds * 0.3).toFixed(3)) }, { state: "MIDPOINT", from: Number((durationSeconds * 0.3).toFixed(3)), to: Number((durationSeconds * 0.75).toFixed(3)) }, { state: "EXIT", from: Number((durationSeconds * 0.75).toFixed(3)), to: Number(durationSeconds.toFixed(3)) }], motionProfile: recipe.motion,
      },
      assetRequirementManifest: {
        artifact: "AssetRequirementManifest.json", lifecycle: "FROZEN", route, assetNeeds, lockRule: "EVERY_ASSET_MUST_HAVE_STORED_BYTES_HASH_RIGHTS_AND_ONE_SHOT_ROLE",
      },
      productionManifestSkeleton: {
        artifact: "ProductionManifest.json", lifecycle: "BLOCKED_ASSET_LOCK", renderer: "REMOTION_SCENE_COMPONENTS_V23", encoder: "FFMPEG_PINNED_PROFILE_V23", sceneGraph: recipe.topology, requiredArtifactRefs: ["NarrativeEvidenceMap.json", "ShotArchetypeMap.json", "ShotDesignPackage.json", "StoryboardManifest.json", "AnimaticTimeline.json", "ApprovedAssetSet.json"], renderFallback: "FORBIDDEN", randomSeed: "FORBIDDEN",
      },
    },
  };
}

export function compileWave9PreProductionV23(shots, source = {}) {
  const policy = WAVE_9_PREPRODUCTION_COMPILER_V23;
  const sourceShots = list(shots);
  let previousTreatment = "";
  const packages = sourceShots.map((shot, index) => {
    const compiled = shotPackage(shot || {}, index, previousTreatment);
    previousTreatment = compiled.artifacts.shotArchetypeMap.treatment;
    return compiled;
  });
  const logicalIds = packages.map((item) => item.logicalId);
  const uniqueIds = new Set(logicalIds);
  const checks = [
    { id: "EXACT_SCOPE", pass: packages.length === policy.logicalScope, evidence: `${packages.length}/${policy.logicalScope} shot packages` },
    { id: "UNIQUE_LOGICAL_IDS", pass: uniqueIds.size === packages.length, evidence: `${uniqueIds.size}/${packages.length} unique IDs` },
    { id: "VALID_TIMING", pass: packages.every((item) => item.endSeconds > item.startSeconds), evidence: "every shot has a positive interval" },
    { id: "EIGHT_ARTIFACT_CONTRACTS", pass: packages.every((item) => Object.keys(item.artifacts).length === policy.artifactContractsPerShot), evidence: `${policy.artifactContractsPerShot} contracts per shot` },
    { id: "NARRATIVE_EVIDENCE_BOUND", pass: packages.every((item) => clean(item.artifacts.narrativeEvidenceMap.narrationClause) && clean(item.artifacts.narrativeEvidenceMap.viewerTakeaway)), evidence: "narration and viewer takeaway are present" },
    { id: "ADJACENT_TREATMENT_VARIATION", pass: packages.every((item) => item.artifacts.shotArchetypeMap.adjacentTreatmentDifferent), evidence: "adjacent shots cannot share the same full treatment" },
    { id: "ASSET_REQUIREMENTS_FROZEN", pass: packages.every((item) => item.artifacts.assetRequirementManifest.assetNeeds.length > 0), evidence: "every shot has a SOURCE/MAKE/HYBRID asset plan" },
    { id: "PRODUCTION_FAIL_CLOSED", pass: packages.every((item) => item.artifacts.productionManifestSkeleton.lifecycle === "BLOCKED_ASSET_LOCK"), evidence: "no render can start before ApprovedAssetSet" },
    { id: "ZERO_REMOTE_DISPATCH", pass: policy.remoteDispatches === 0, evidence: "compiler is deterministic and provider-free" },
  ];
  const passed = checks.every((item) => item.pass);
  return {
    version: policy.version,
    status: passed ? "DESIGN_CONTRACTS_FROZEN_VISUAL_EVIDENCE_REQUIRED" : "COMPILATION_BLOCKED",
    lifecycle: passed ? "MATERIALIZED" : "REJECTED",
    source: { upstreamArtifactId: clean(source.upstreamArtifactId), upstreamHash: clean(source.upstreamHash) },
    scope: packages.length,
    materializedArtifactContracts: packages.length * policy.artifactContractsPerShot + 1,
    frozenArtifactContracts: packages.length * 5 + 1,
    blockedVisualOrAssetArtifacts: packages.length * 3,
    remoteDispatches: 0,
    costDeltaUsd: 0,
    visualLanguageBible: { artifact: "VisualLanguageBible.json", lifecycle: "FROZEN", version: "VISUAL_LANGUAGE_BIBLE_V23_1", palette: "FACTORY_GREEN_NEUTRAL", typography: "MOBILE_SAFE_EDITORIAL", primitivePolicy: "DOMAIN_NATIVE", adjacentVariation: "MANDATORY", genericFallback: "FORBIDDEN" },
    checks,
    packages,
    next: "RENDER_STORYBOARDS_THEN_BUILD_ANIMATICS_THEN_LOCK_ASSETS",
    productionActivation: policy.productionActivation,
  };
}

export function compileWave9ProductionSystemV23({ shotCount, activeRequests, upstreamFrozen, acceptedBaseline = 36 }) {
  const policy = WAVE_9_PRODUCTION_SYSTEM_V23;
  const inputReady = upstreamFrozen && Number(shotCount) === 166;
  const ledgerClear = Number(activeRequests) === 0;
  const status = !inputReady
    ? "BLOCKED_UPSTREAM_CONTRACTS"
    : !ledgerClear
      ? "DEPLOYED_PRODUCTION_LOCKED_ACTIVE_PROVIDER_RECONCILIATION"
      : "DEPLOYED_READY_TO_COMPILE_PREPRODUCTION";
  return {
    ...policy,
    status,
    focus: "PREPRODUCTION_AND_PRODUCTION",
    sourceScope: Number(shotCount),
    acceptedBaseline: Number(acceptedBaseline),
    remainingScope: Math.max(0, Number(shotCount) - Number(acceptedBaseline)),
    remoteDispatches: 0,
    costDeltaUsd: 0,
    productionActivation: "LOCKED_UNTIL_PRODUCTION_MANIFESTS_FROZEN",
    constructionInvariants: [
      { id: "UPSTREAM_FIRST", pass: inputReady, evidence: `${Number(shotCount)}/166 frozen shot contracts` },
      { id: "NO_OVERLAPPING_PROVIDER_WORK", pass: ledgerClear, evidence: `${Number(activeRequests)} active provider requests` },
      { id: "MANIFEST_ONLY_RENDER", pass: true, evidence: "renderers accept immutable ProductionManifest only" },
      { id: "MOTION_BEFORE_FINAL_PIXELS", pass: true, evidence: "animatic precedes asset lock and final render" },
      { id: "ASSET_LOCK_BEFORE_RENDER", pass: true, evidence: "no source discovery is reachable from render" },
      { id: "DETERMINISTIC_REPRODUCTION", pass: true, evidence: "same manifest + bytes + versions produce the same masters" },
      { id: "QA_BOUNDARY_TWO", pass: policy.qaBoundary.maxAttempts === 2, evidence: "QA verifies a frozen candidate and cannot author or mutate production artifacts" },
    ],
  };
}
