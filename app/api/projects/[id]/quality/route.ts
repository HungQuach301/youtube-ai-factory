import { desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "../../../../../db";
import {
  assemblyRuns,
  contentBriefs,
  criticEvaluations,
  mediaAssets,
  narrationSegments,
  productionProfiles,
  qualityGateRuns,
  qualityGateSettings,
  referenceBenchmarkRuns,
  researchClaims,
  sceneManifest,
  scriptVersions,
  videoProjects,
  videoRenders,
  voiceEvaluations,
  workflowEvents,
} from "../../../../../db/schema";

type RuntimeD1 = { prepare(sql: string): { run(): Promise<unknown> } };
type RuntimeEnv = { DB?: RuntimeD1; FACTORY_EXPERT_EMAILS?: string };
type VerificationMode = "AUTOPILOT" | "EXCEPTIONS" | "MANUAL";
type AdapterKey = "EXPLAINER_DOCUMENTARY" | "SHORTS" | "TUTORIAL" | "COMMENTARY" | "REVIEW_COMPARISON" | "NEWS_CURRENT" | "INTERVIEW_PODCAST" | "STORY_ENTERTAINMENT";

const adapters: Array<{ key: AdapterKey; label: string; focus: string; criteria: string[] }> = [
  { key: "EXPLAINER_DOCUMENTARY", label: "Explainer + mini-documentary", focus: "Accuracy, clarity, information density and visual explanation", criteria: ["Mechanism is correct", "Complexity becomes legible", "Concrete payoff lands", "Visual model stays consistent"] },
  { key: "SHORTS", label: "Shorts", focus: "Immediate hook, single payoff and loopability", criteria: ["First-frame clarity", "One idea only", "Fast visual cadence", "Replay-friendly ending"] },
  { key: "TUTORIAL", label: "Tutorial / how-to", focus: "Task completion, sequencing and proof of result", criteria: ["Outcome shown early", "Steps are executable", "Failure cases covered", "Result is verified"] },
  { key: "COMMENTARY", label: "Commentary / opinion", focus: "Thesis, reasoning, fairness and distinctive voice", criteria: ["Position is explicit", "Evidence supports opinion", "Counterpoint is represented", "Voice is original"] },
  { key: "REVIEW_COMPARISON", label: "Review / comparison", focus: "Decision usefulness, test fairness and disclosed trade-offs", criteria: ["Criteria are explicit", "Testing is comparable", "Trade-offs are concrete", "Conflicts are disclosed"] },
  { key: "NEWS_CURRENT", label: "News / current affairs", focus: "Freshness, verification, context and correction readiness", criteria: ["Timestamp is clear", "Primary sources lead", "Uncertainty is labeled", "Updates can be issued"] },
  { key: "INTERVIEW_PODCAST", label: "Interview / podcast", focus: "Guest value, conversational arc and editorial compression", criteria: ["Guest promise is clear", "Questions compound", "Dead air is removed", "Highlights are earned"] },
  { key: "STORY_ENTERTAINMENT", label: "Story / entertainment", focus: "Character, stakes, escalation and emotional payoff", criteria: ["Desire is visible", "Stakes escalate", "Scenes turn", "Ending resolves emotion"] },
];

const weights = [6, 8, 12, 8, 12, 10, 10, 10, 10, 5, 5, 4];
let schemaReady: Promise<void> | null = null;

async function runtimeEnv() { const { env } = await import("cloudflare:workers"); return env as unknown as RuntimeEnv; }

async function authorizeWriteAccess() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "SIWC_AUTHENTICATION_REQUIRED" }, { status: 401 });
  const env = await runtimeEnv();
  const owners = new Set(String(env.FACTORY_EXPERT_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
  if (!owners.size) return Response.json({ error: "OWNER_WRITE_ALLOWLIST_UNCONFIGURED" }, { status: 503 });
  if (!owners.has(user.email.trim().toLowerCase())) return Response.json({ error: "OWNER_WRITE_AUTHORIZATION_REQUIRED" }, { status: 403 });
  return { user, env };
}

async function ensureSchema() {
  if (!schemaReady) schemaReady = (async () => {
    const env = await runtimeEnv(); if (!env.DB) throw new Error("Production database is unavailable");
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS quality_gate_settings (
      project_id text PRIMARY KEY NOT NULL, verification_mode text DEFAULT 'AUTOPILOT' NOT NULL,
      minimum_score integer DEFAULT 85 NOT NULL, dimension_floor integer DEFAULT 70 NOT NULL,
      critical_floor integer DEFAULT 80 NOT NULL, format_adapter text DEFAULT 'EXPLAINER_DOCUMENTARY' NOT NULL,
      maximum_repair_loops integer DEFAULT 2 NOT NULL, updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`).run();
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS quality_gate_runs (
      id text PRIMARY KEY NOT NULL, project_id text NOT NULL, version integer NOT NULL,
      loop_number integer DEFAULT 0 NOT NULL, status text DEFAULT 'READY' NOT NULL,
      decision text NOT NULL, composite_score integer DEFAULT 0 NOT NULL,
      core_score integer DEFAULT 0 NOT NULL, adapter_score integer DEFAULT 0 NOT NULL,
      format_adapter text NOT NULL, rubric_json text NOT NULL, hard_gates_json text NOT NULL,
      critic_results_json text NOT NULL, repair_plan_json text NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`).run();
  })().catch((error) => { schemaReady = null; throw error; });
  await schemaReady;
}

function clamp(value: number, minimum = 0, maximum = 100) { return Math.max(minimum, Math.min(maximum, Math.round(value))); }
function average(values: number[], fallback = 0) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback; }
function ratioScore(actual: number, target: number, floor = 15) { return clamp(floor + Math.min(1, actual / Math.max(1, target)) * (100 - floor)); }
function scriptWordCount(content?: string) {
  if (!content) return 0;
  try { const parsed = JSON.parse(content) as Array<{ text?: string }>; return parsed.flatMap((section) => (section.text || "").trim().split(/\s+/).filter(Boolean)).length; }
  catch { return content.trim().split(/\s+/).filter(Boolean).length; }
}
function dimension(name: string, weight: number, score: number, evidence: string, action: string, critical = false) {
  return { name, weight, score: clamp(score), critical, status: score >= 85 ? "PASS" : score >= 70 ? "WATCH" : "REVISE", evidence, action };
}

async function buildAssessment(projectId: string) {
  const db = await getDb();
  const [briefRows, claims, scripts, scriptCritics, segments, voiceChecks, scenes, assets, assemblies, renders, referenceRuns, priorRuns, settingsRows] = await Promise.all([
    db.select().from(contentBriefs).where(eq(contentBriefs.projectId, projectId)).limit(1),
    db.select().from(researchClaims).where(eq(researchClaims.projectId, projectId)),
    db.select().from(scriptVersions).where(eq(scriptVersions.projectId, projectId)).orderBy(desc(scriptVersions.version)),
    db.select().from(criticEvaluations).where(eq(criticEvaluations.projectId, projectId)),
    db.select().from(narrationSegments).where(eq(narrationSegments.projectId, projectId)),
    db.select().from(voiceEvaluations).where(eq(voiceEvaluations.projectId, projectId)),
    db.select().from(sceneManifest).where(eq(sceneManifest.projectId, projectId)),
    db.select().from(mediaAssets).where(eq(mediaAssets.projectId, projectId)),
    db.select().from(assemblyRuns).where(eq(assemblyRuns.projectId, projectId)).orderBy(desc(assemblyRuns.version)),
    db.select().from(videoRenders).where(eq(videoRenders.projectId, projectId)).orderBy(desc(videoRenders.version)),
    db.select().from(referenceBenchmarkRuns).where(eq(referenceBenchmarkRuns.projectId, projectId)).orderBy(desc(referenceBenchmarkRuns.version)),
    db.select().from(qualityGateRuns).where(eq(qualityGateRuns.projectId, projectId)).orderBy(desc(qualityGateRuns.version)),
    db.select().from(qualityGateSettings).where(eq(qualityGateSettings.projectId, projectId)).limit(1),
  ]);

  const settings = settingsRows[0] || { verificationMode: "AUTOPILOT", minimumScore: 85, dimensionFloor: 70, criticalFloor: 80, formatAdapter: "EXPLAINER_DOCUMENTARY", maximumRepairLoops: 2 };
  const adapter = adapters.find((item) => item.key === settings.formatAdapter) || adapters[0];
  const latestScript = scripts[0]; const latestReference = referenceRuns[0]; const latestAssembly = assemblies[0]; const latestRender = renders[0];
  const supportedClaims = claims.filter((claim) => claim.status === "SUPPORTED").length;
  const claimCoverage = claims.length ? supportedClaims / claims.length : 0;
  const highRiskUnsupported = claims.filter((claim) => claim.riskLevel === "HIGH" && claim.status !== "SUPPORTED");
  const selectedAssets = assets.filter((asset) => asset.status === "APPROVED");
  const rightsVerified = selectedAssets.filter((asset) => asset.rightsStatus === "VERIFIED");
  const rightsCoverage = selectedAssets.length ? rightsVerified.length / selectedAssets.length : 0;
  const motionScenes = new Set(assets.filter((asset) => asset.sourceType === "MOTION_RENDER_WEBM" && asset.status === "APPROVED").map((asset) => asset.sceneId)).size;
  const uniqueAssets = new Set(selectedAssets.map((asset) => asset.storageKey || asset.sourceUrl || asset.id)).size;
  const visualFamilies = new Set(selectedAssets.map((asset) => asset.sourceType)).size;
  const backgroundAudio = assets.filter((asset) => asset.mimeType.startsWith("audio/") && !asset.sourceType.includes("VOICE"));
  const soundEffects = backgroundAudio.filter((asset) => /sfx|effect|transition|sting/i.test(`${asset.name} ${asset.sourceType}`));
  const audioCoverage = segments.length ? segments.filter((segment) => Boolean(segment.audioKey)).length / segments.length : 0;
  const voiceScore = average(voiceChecks.map((check) => average([check.pronunciationScore, check.paceScore, check.consistencyScore])), audioCoverage ? 84 : 0);
  const scriptScore = latestScript?.criticScore || average(scriptCritics.filter((critic) => critic.scriptVersionId === latestScript?.id).map((critic) => critic.score), 82);
  const wordCount = scriptWordCount(latestScript?.content);
  const durationSeconds = latestRender?.durationSeconds || latestAssembly?.totalDuration || Math.max(0, ...scenes.map((scene) => scene.endSeconds || 0));
  const targetDuration = adapter.key === "SHORTS" ? 45 : adapter.key === "INTERVIEW_PODCAST" ? 1200 : 420;
  const minimumDuration = adapter.key === "SHORTS" ? 20 : adapter.key === "INTERVIEW_PODCAST" ? 600 : 300;
  const targetWords = adapter.key === "SHORTS" ? 110 : adapter.key === "INTERVIEW_PODCAST" ? 2200 : 950;
  const targetVisualUnits = adapter.key === "SHORTS" ? 12 : adapter.key === "INTERVIEW_PODCAST" ? 18 : 32;
  const averageSceneLength = scenes.length ? average(scenes.map((scene) => Math.max(0, (scene.endSeconds || 0) - (scene.startSeconds || 0)))) : 20;
  const referencePassed = latestReference?.status === "PASSED";
  const packageNeedsWork = latestReference?.decision === "PACKAGE_ONLY";

  const durationScore = ratioScore(durationSeconds, targetDuration, 10);
  const depthScore = clamp(ratioScore(wordCount, targetWords, 10) * .7 + ratioScore(claims.length, 10, 20) * .3);
  const visualFidelityScore = latestRender ? (latestRender.width >= 1920 && latestRender.height >= 1080 ? 88 : latestRender.width >= 1280 && latestRender.height >= 720 ? 55 : 35) : 20;
  const visualRichnessScore = clamp(ratioScore(uniqueAssets, targetVisualUnits, 15) * .45 + ratioScore(visualFamilies, 5, 15) * .2 + ratioScore(motionScenes, 10, 15) * .25 + ratioScore(scenes.length, targetVisualUnits, 15) * .1);
  const soundscapeScore = clamp((audioCoverage * 35) + (voiceScore * .25) + Math.min(22, backgroundAudio.length * 11) + Math.min(18, soundEffects.length * 6));
  const perceivedProductionScore = Math.round(average([durationScore, depthScore, visualFidelityScore, visualRichnessScore, soundscapeScore]));
  const competitiveParityScore = latestReference ? clamp(perceivedProductionScore * .8 + 12) : clamp(perceivedProductionScore * .75);

  const rubric = [
    dimension("Audience, demand & promise", weights[0], briefRows[0]?.status === "APPROVED" && latestReference ? 86 : 72, latestReference ? "The topic and approval paradox fit a broad English-US audience." : "Audience demand has not been benchmarked fully.", "Keep the topic, but do not confuse a good premise with a good finished video."),
    dimension("Competitive parity", weights[1], competitiveParityScore, `Viewer-perceived production score is ${perceivedProductionScore}/100; metadata benchmarking alone cannot prove parity with leading videos.`, "Benchmark runtime, narrative depth, shot variety, motion density and sound design against at least five references."),
    dimension("Runtime & content depth", weights[2], Math.round(average([durationScore, depthScore])), `${Math.round(durationSeconds)}s runtime and approximately ${wordCount} script words versus a ${Math.round(targetDuration / 60)}–${Math.round((targetDuration + 180) / 60)} minute / ${targetWords}+ word target.`, "Expand to a properly developed mini-documentary with mechanisms, incentives, failure cases and a stronger payoff."),
    dimension("Research & accuracy", weights[3], 58 + claimCoverage * 28, `${supportedClaims}/${claims.length} claims are supported; only ${claims.length} explicit claims currently support the narrative.`, "Add primary-source evidence for fees, timing, participant incentives and settlement risk.", true),
    dimension("Script, value & story", weights[4], Math.round(scriptScore * .45 + depthScore * .4 + durationScore * .15), `Structural critic score is ${Math.round(scriptScore)}, but the script is too short to develop a competitive explanatory arc.`, "Rewrite as a 3-act script: approval paradox, hidden network and where the $100 finally goes."),
    dimension("Retention & pacing", weights[5], Math.round(averageSceneLength <= 8 ? 62 + Math.min(12, motionScenes * 2) : 48), `The ${averageSceneLength.toFixed(1)}s average scene length is acceptable, but brevity substitutes for escalation and pattern development.`, "Design retention beats across a full runtime, not only frequent cuts inside a short video."),
    dimension("Visual fidelity", weights[6], visualFidelityScore, latestRender ? `${latestRender.width}×${latestRender.height} master; competitive long-form delivery requires 1080p and source-resolution verification.` : "No master is available for fidelity review.", "Re-render at 1920×1080 and reject soft, artifacted or low-resolution source assets."),
    dimension("Visual richness & motion", weights[7], visualRichnessScore, `${uniqueAssets} unique approved assets, ${visualFamilies} visual families, ${motionScenes} motion scenes and ${scenes.length} total scenes versus ${targetVisualUnits}+ planned visual units.`, "Build 30–45 distinct visual beats across stock, macro b-roll, UI, diagrams, maps, charts and transitions."),
    dimension("Voice, music & soundscape", weights[8], soundscapeScore, `Narration coverage ${Math.round(audioCoverage * 100)}%, voice QA ${Math.round(voiceScore)}, ${backgroundAudio.length} background audio assets and ${soundEffects.length} detected sound effects.`, "Add a licensed music bed, ambience, transition SFX, emphasis hits and a measured final mix."),
    dimension("Originality & channel language", weights[9], motionScenes >= 3 ? 88 : 78, "The approval-is-not-payment thesis and owned diagrams are distinctive, but the audiovisual language is not yet rich enough to become a channel signature.", "Create a repeatable visual and sonic system for Hidden Systems Behind Money.", true),
    dimension("Legal, policy & monetization", weights[10], selectedAssets.length ? 68 + rightsCoverage * 24 : 45, `${rightsVerified.length}/${selectedAssets.length} selected assets have verified commercial rights.`, "Retain the asset ledger, music license and synthetic-content disclosure.", true),
    dimension("Packaging & session value", weights[11], packageNeedsWork ? 64 : 72, "Packaging is generic and the sequel bridge, playlist destination and end screen are not yet defined.", "Resolve title, thumbnail and next-view path only after recomposition."),
  ];

  const hardGates = [
    { name: "Critical factual claims", category: "COMPLIANCE", status: highRiskUnsupported.length ? "FAIL" : "PASS", evidence: highRiskUnsupported.length ? `${highRiskUnsupported.length} high-risk claims are unsupported.` : "No unsupported high-risk claim detected.", action: "Block publication until every high-risk claim is sourced or removed." },
    { name: "Commercial asset rights", category: "COMPLIANCE", status: selectedAssets.length && rightsCoverage === 1 ? "PASS" : "FAIL", evidence: `${rightsVerified.length}/${selectedAssets.length} selected assets have verified commercial rights.`, action: "Replace or license every unverified production asset." },
    { name: "Runtime and script depth", category: "PRODUCTION", status: durationSeconds >= minimumDuration && wordCount >= targetWords * .75 ? "PASS" : "FAIL", evidence: `${Math.round(durationSeconds)}s and ${wordCount} words do not meet the ${minimumDuration}s / ${Math.round(targetWords * .75)} word minimum.`, action: "Expand and rewrite before recomposition." },
    { name: "Competitive visual fidelity", category: "PRODUCTION", status: latestRender && latestRender.width >= 1920 && latestRender.height >= 1080 ? "PASS" : "FAIL", evidence: latestRender ? `Current master is ${latestRender.width}×${latestRender.height}; 1920×1080 is required.` : "No master is available.", action: "Use verified high-resolution sources and render a 1080p master." },
    { name: "Visual diversity", category: "PRODUCTION", status: uniqueAssets >= targetVisualUnits * .7 && visualFamilies >= 4 ? "PASS" : "FAIL", evidence: `${uniqueAssets} unique visuals across ${visualFamilies} families; target is at least ${Math.ceil(targetVisualUnits * .7)} across 4 families.`, action: "Create a substantially richer visual plan before rendering." },
    { name: "Designed soundscape", category: "PRODUCTION", status: backgroundAudio.length >= 1 && soundEffects.length >= 2 ? "PASS" : "FAIL", evidence: `${backgroundAudio.length} background audio assets and ${soundEffects.length} SFX are detected.`, action: "Add music, ambience, SFX and a measured final mix." },
    { name: "Playback-ready master", category: "TECHNICAL", status: latestRender?.status === "READY" ? "PASS" : "FAIL", evidence: latestRender ? `Final master v${latestRender.version} is ${latestRender.status}.` : "Final master is missing.", action: "Compose and inspect the complete audiovisual master." },
    { name: "Reference originality firewall", category: "ORIGINALITY", status: referencePassed ? "PASS" : "ACTION", evidence: referencePassed ? "Reference benchmark passed with pattern-learning-only controls." : "Reference gate has not been passed yet.", action: "Run and pass Reference Intelligence before final approval." },
  ];

  const coreScore = Math.round(rubric.reduce((sum, item) => sum + item.score * item.weight, 0) / 100);
  const adapterDimensions = adapter.key === "EXPLAINER_DOCUMENTARY" ? [rubric[2].score, rubric[3].score, rubric[4].score, rubric[6].score, rubric[7].score, rubric[8].score] : adapter.key === "SHORTS" ? [rubric[2].score, rubric[5].score, rubric[7].score, rubric[8].score] : adapter.key === "TUTORIAL" ? [rubric[2].score, rubric[3].score, rubric[4].score, rubric[6].score] : adapter.key === "NEWS_CURRENT" ? [rubric[1].score, rubric[3].score, rubric[6].score, rubric[10].score] : [rubric[1].score, rubric[4].score, rubric[5].score, rubric[7].score, rubric[8].score];
  const adapterScore = Math.round(average(adapterDimensions));
  const composite = Math.round(coreScore * .8 + adapterScore * .2);
  const complianceFailure = hardGates.some((gate) => gate.category === "COMPLIANCE" && gate.status === "FAIL");
  const productionFailure = hardGates.some((gate) => gate.category === "PRODUCTION" && gate.status === "FAIL");
  const productionWeak = [rubric[2], rubric[4], rubric[5], rubric[6], rubric[7], rubric[8]].some((item) => item.score < settings.dimensionFloor);
  const criticalWeak = rubric.filter((item) => item.critical).some((item) => item.score < settings.criticalFloor);
  const packageRepair = rubric[11].score < 85 || hardGates.some((gate) => gate.status === "ACTION");
  const decision = complianceFailure || criticalWeak ? "BLOCKED_CRITICAL" : productionFailure || productionWeak || competitiveParityScore < 75 ? "RECOMPOSE" : packageRepair ? "PACKAGE_REPAIR" : composite >= settings.minimumScore ? "PASS" : "REPAIR_REQUIRED";
  const mode = settings.verificationMode as VerificationMode;
  const status = mode === "MANUAL" ? "AWAITING_REVIEW" : mode === "EXCEPTIONS" && decision !== "PASS" ? "AWAITING_EXCEPTION_REVIEW" : decision === "PASS" ? "PASSED" : decision === "PACKAGE_REPAIR" && mode === "AUTOPILOT" ? "AUTO_ROUTED" : "BLOCKED";
  const repairPlan = [
    { owner: "Content architect", type: "AUTO", priority: "P0", status: wordCount >= targetWords * .75 ? "DONE" : "BLOCKED", action: `Rewrite to ${targetWords}–${targetWords + 350} words and ${Math.round(targetDuration / 60)}–${Math.round((targetDuration + 180) / 60)} minutes with a 3-act explanatory arc.` },
    { owner: "Visual director", type: "AUTO", priority: "P0", status: uniqueAssets >= targetVisualUnits * .7 && visualFamilies >= 4 ? "DONE" : "BLOCKED", action: `Plan ${targetVisualUnits}–${targetVisualUnits + 12} visual beats across at least five visual families, then render at 1080p.` },
    { owner: "Sound designer", type: "AUTO", priority: "P0", status: backgroundAudio.length >= 1 && soundEffects.length >= 2 ? "DONE" : "BLOCKED", action: "Design narration, licensed music bed, ambience, transition SFX, emphasis hits and loudness targets before recomposition." },
    { owner: "Competitive analyst", type: "EXCEPTION", priority: "P0", status: competitiveParityScore >= 75 ? "DONE" : "BLOCKED", action: "Create a scene-level parity matrix for duration, content depth, visual density, fidelity and sound design without importing competitor media." },
    { owner: "Production orchestrator", type: "AUTO", priority: "P0", status: decision === "RECOMPOSE" ? "BLOCKED" : "OPEN", action: "Recompose only after content, visual and sound plans meet their minimum gates." },
    { owner: "Packaging agent", type: "PACKAGE", priority: "P1", status: "OPEN", action: "Defer title and thumbnail optimization until the stronger master is complete." },
    { owner: "Evidence auditor", type: "EXCEPTION", priority: "P0", status: highRiskUnsupported.length ? "BLOCKED" : "DONE", action: "Resolve unsupported high-risk claims before publication." },
    { owner: "Rights guard", type: "EXCEPTION", priority: "P0", status: rightsCoverage === 1 ? "DONE" : "BLOCKED", action: "Verify commercial rights for every selected visual and audio asset." },
  ];
  const critics = [
    { critic: "Audience advocate", score: rubric[0].score, decision: rubric[0].status, finding: "The premise is strong, but premise quality must not inflate finished-video quality." },
    { critic: "Evidence auditor", score: rubric[3].score, decision: hardGates[0].status, finding: `${supportedClaims}/${claims.length} claims are supported; qualifiers and source traceability remain visible.` },
    { critic: "Story & depth editor", score: Math.round(average([rubric[2].score, rubric[4].score, rubric[5].score])), decision: productionWeak ? "RECOMPOSE" : "PASS", finding: `${wordCount} words and ${Math.round(durationSeconds)} seconds are insufficient for a competitive mini-documentary.` },
    { critic: "Visual quality director", score: Math.round(average([rubric[6].score, rubric[7].score])), decision: productionFailure ? "RECOMPOSE" : "PASS", finding: `${uniqueAssets} unique visuals and a ${latestRender?.width || 0}×${latestRender?.height || 0} master fall below the visual parity target.` },
    { critic: "Sound director", score: rubric[8].score, decision: soundscapeScore < 70 ? "RECOMPOSE" : "PASS", finding: "Clean narration alone is not a sound design; music, ambience, SFX and mix evidence are required." },
    { critic: "Competitive quality judge", score: competitiveParityScore, decision: competitiveParityScore < 75 ? "BELOW_PARITY" : "PASS", finding: "The current master is materially below the reference set on depth, visual richness, fidelity and soundscape." },
    { critic: "Originality & rights guard", score: Math.round(average([rubric[9].score, rubric[10].score])), decision: complianceFailure ? "BLOCK" : "PASS_WITH_ACTIONS", finding: "Originality is promising, but it cannot compensate for weak execution quality." },
  ];
  const version = (priorRuns[0]?.version || 0) + 1;
  return { settings, adapter, rubric, hardGates, coreScore, adapterScore, composite, decision, status, repairPlan, critics, version, loopNumber: Math.min((priorRuns[0]?.loopNumber || -1) + 1, settings.maximumRepairLoops), latestAssembly, perceivedProductionScore };
}

async function runGate(projectId: string) {
  const db = await getDb(); const assessment = await buildAssessment(projectId); const id = `${projectId}-QUALITY-V${assessment.version}`;
  await db.insert(qualityGateRuns).values({ id, projectId, version: assessment.version, loopNumber: assessment.loopNumber, status: assessment.status, decision: assessment.decision, compositeScore: assessment.composite, coreScore: assessment.coreScore, adapterScore: assessment.adapterScore, formatAdapter: assessment.adapter.key, rubricJson: JSON.stringify(assessment.rubric), hardGatesJson: JSON.stringify(assessment.hardGates), criticResultsJson: JSON.stringify(assessment.critics), repairPlanJson: JSON.stringify(assessment.repairPlan) });
  const routed = assessment.status === "AUTO_ROUTED";
  await db.update(videoProjects).set({ nextAction: routed ? "Complete Universal Quality Gate publishing repairs" : assessment.status === "PASSED" ? "Build final QA & publishing package" : "Resolve Universal Quality Gate blockers", updatedAt: new Date().toISOString() }).where(eq(videoProjects.id, projectId));
  await db.insert(workflowEvents).values({ projectId, toStatus: routed ? "QUALITY_REPAIRS_ROUTED" : assessment.status === "PASSED" ? "QUALITY_PASSED" : "QUALITY_REVIEW", eventType: "UNIVERSAL_QUALITY_GATE_COMPLETED", summary: `Universal Quality Gate v${assessment.version} scored ${assessment.composite}/100 with ${assessment.decision}; ${assessment.status}` });
  return { id, version: assessment.version, status: assessment.status, decision: assessment.decision, composite: assessment.composite };
}

async function responseData(projectId: string) {
  const db = await getDb(); const [settingsRows, runs] = await Promise.all([db.select().from(qualityGateSettings).where(eq(qualityGateSettings.projectId, projectId)).limit(1), db.select().from(qualityGateRuns).where(eq(qualityGateRuns.projectId, projectId)).orderBy(desc(qualityGateRuns.version))]);
  return { adapters, settings: settingsRows[0], runs: runs.map((run) => ({ ...run, rubric: JSON.parse(run.rubricJson), hardGates: JSON.parse(run.hardGatesJson), critics: JSON.parse(run.criticResultsJson), repairPlan: JSON.parse(run.repairPlanJson) })) };
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { const authorization = await authorizeWriteAccess(); if (authorization instanceof Response) return authorization; const { id } = await context.params; await ensureSchema(); const db = await getDb(); await db.insert(qualityGateSettings).values({ projectId: id, verificationMode: "AUTOPILOT", minimumScore: 85, dimensionFloor: 70, criticalFloor: 80, formatAdapter: "EXPLAINER_DOCUMENTARY", maximumRepairLoops: 2 }).onConflictDoNothing(); return Response.json(await responseData(id)); }
  catch (error) { console.error("Universal Quality Gate GET failed", error); return Response.json({ error: "Universal Quality Gate could not be loaded" }, { status: 500 }); }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authorization = await authorizeWriteAccess(); if (authorization instanceof Response) return authorization;
    const { id } = await context.params; await ensureSchema(); const db = await getDb();
    const payload = await request.json() as { action?: "RUN_GATE" | "SET_MODE" | "SET_ADAPTER" | "ROUTE_REPAIRS" | "APPROVE_GATE"; verificationMode?: VerificationMode; formatAdapter?: AdapterKey };
    const [productionProfile] = await db.select().from(productionProfiles).where(eq(productionProfiles.projectId, id)).limit(1);
    if (productionProfile?.version >= 5 && ["RUN_GATE", "ROUTE_REPAIRS", "APPROVE_GATE"].includes(payload.action || "")) {
      return Response.json({ error: "V5_EVIDENCE_QA_REQUIRED", message: "Historical quality scores remain visible but cannot authorize a v5 release. Run the v5 evidence and perceptual gates." }, { status: 409 });
    }
    if (payload.action === "RUN_GATE") return Response.json({ ok: true, ...(await runGate(id)) });
    if (payload.action === "SET_MODE" && payload.verificationMode) { await db.update(qualityGateSettings).set({ verificationMode: payload.verificationMode, updatedAt: new Date().toISOString() }).where(eq(qualityGateSettings.projectId, id)); return Response.json({ ok: true }); }
    if (payload.action === "SET_ADAPTER" && payload.formatAdapter && adapters.some((adapter) => adapter.key === payload.formatAdapter)) { await db.update(qualityGateSettings).set({ formatAdapter: payload.formatAdapter, updatedAt: new Date().toISOString() }).where(eq(qualityGateSettings.projectId, id)); return Response.json({ ok: true }); }
    if (payload.action === "ROUTE_REPAIRS") { const [latest] = await db.select().from(qualityGateRuns).where(eq(qualityGateRuns.projectId, id)).orderBy(desc(qualityGateRuns.version)).limit(1); if (!latest || latest.decision === "BLOCKED_CRITICAL" || latest.decision === "RECOMPOSE") return Response.json({ error: "Critical or production blockers cannot be routed to packaging" }, { status: 409 }); await db.update(qualityGateRuns).set({ status: "REPAIR_ROUTED" }).where(eq(qualityGateRuns.id, latest.id)); await db.update(videoProjects).set({ nextAction: "Complete Universal Quality Gate publishing repairs", updatedAt: new Date().toISOString() }).where(eq(videoProjects.id, id)); await db.insert(workflowEvents).values({ projectId: id, toStatus: "QUALITY_REPAIRS_ROUTED", eventType: "QUALITY_REPAIRS_ROUTED", summary: `Quality Gate v${latest.version} repairs routed to publishing workflow` }); return Response.json({ ok: true }); }
    if (payload.action === "APPROVE_GATE") { const [latest] = await db.select().from(qualityGateRuns).where(eq(qualityGateRuns.projectId, id)).orderBy(desc(qualityGateRuns.version)).limit(1); if (!latest || ["BLOCKED_CRITICAL", "RECOMPOSE"].includes(latest.decision)) return Response.json({ error: "Hard-gate or production blockers must be resolved first" }, { status: 409 }); await db.update(qualityGateRuns).set({ status: "PASSED" }).where(eq(qualityGateRuns.id, latest.id)); await db.update(videoProjects).set({ nextAction: "Build final QA & publishing package", updatedAt: new Date().toISOString() }).where(eq(videoProjects.id, id)); await db.insert(workflowEvents).values({ projectId: id, toStatus: "QUALITY_PASSED", eventType: "QUALITY_GATE_APPROVED", summary: `Universal Quality Gate v${latest.version} approved; final publishing package unlocked` }); return Response.json({ ok: true }); }
    return Response.json({ error: "Unknown quality gate action" }, { status: 400 });
  } catch (error) { console.error("Universal Quality Gate POST failed", error); return Response.json({ error: "Universal Quality Gate action could not be completed" }, { status: 500 }); }
}
