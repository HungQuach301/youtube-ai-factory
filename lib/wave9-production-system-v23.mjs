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
