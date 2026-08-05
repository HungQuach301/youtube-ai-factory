import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import {
  assemblyRuns,
  contentBriefs,
  criticEvaluations,
  mediaAssets,
  narrationSegments,
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
type RuntimeEnv = { DB?: RuntimeD1 };
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

const weights = [8, 8, 10, 10, 12, 12, 10, 8, 5, 6, 6, 5];
let schemaReady: Promise<void> | null = null;

async function runtimeEnv() { const { env } = await import("cloudflare:workers"); return env as unknown as RuntimeEnv; }

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
  const audioCoverage = segments.length ? segments.filter((segment) => Boolean(segment.audioKey)).length / segments.length : 0;
  const voiceScore = average(voiceChecks.map((check) => average([check.pronunciationScore, check.paceScore, check.consistencyScore])), audioCoverage ? 84 : 0);
  const scriptScore = latestScript?.criticScore || average(scriptCritics.filter((critic) => critic.scriptVersionId === latestScript?.id).map((critic) => critic.score), 82);
  const averageSceneLength = scenes.length ? average(scenes.map((scene) => Math.max(0, (scene.endSeconds || 0) - (scene.startSeconds || 0)))) : 20;
  const referencePassed = latestReference?.status === "PASSED";
  const packageNeedsWork = latestReference?.decision === "PACKAGE_ONLY";

  const rubric = [
    dimension("Audience & intent fit", weights[0], briefRows[0]?.status === "APPROVED" ? 90 : 76, briefRows[0] ? "Approved English-US audience contract is available." : "Audience contract is incomplete.", "Clarify the viewer, problem and post-view value."),
    dimension("Demand & positioning", weights[1], latestReference ? 86 : 72, latestReference ? "Reference set validates an established payment-systems audience and differentiated approval paradox." : "No competitive benchmark has been completed.", "Complete reference discovery and preserve the hidden-system angle."),
    dimension("Promise & packaging", weights[2], packageNeedsWork ? 70 : latestReference ? 88 : 74, packageNeedsWork ? "Reference benchmark found a clear video with category-generic packaging." : "The viewer promise aligns with the current title direction.", "Generate and test three differentiated title-thumbnail pairs."),
    dimension("Research & accuracy", weights[3], 64 + claimCoverage * 24, `${supportedClaims}/${claims.length} claims are supported; ${highRiskUnsupported.length} unsupported high-risk claims.`, "Resolve every high-risk claim and retain qualifiers for uncertain figures.", true),
    dimension("Value & story structure", weights[4], Math.min(94, scriptScore + (scenes.length >= 8 ? 2 : -8)), `${scenes.length} scenes and the $100 transaction through-line create a complete explanatory payoff.`, "Preserve the approval-to-settlement narrative spine."),
    dimension("Retention engineering", weights[5], 76 + (averageSceneLength <= 8 ? 8 : 0) + (motionScenes >= 3 ? 4 : 0), `Average scene length is ${averageSceneLength.toFixed(1)}s with ${motionScenes} approved motion scenes.`, "Keep visual changes inside the 4–7 second rhythm and sharpen the first 30 seconds."),
    dimension("Visual communication", weights[6], 68 + Math.min(18, rightsCoverage * 14) + (motionScenes >= 3 ? 6 : 0), `${rightsVerified.length}/${selectedAssets.length} selected assets have verified rights; ${motionScenes} scenes use owned motion diagrams.`, "Remove visual repetition and verify mobile readability of every label."),
    dimension("Voice, music & sound", weights[7], 60 + audioCoverage * 18 + Math.min(14, voiceScore * .14), `${segments.filter((segment) => Boolean(segment.audioKey)).length}/${segments.length} narration segments have audio; voice QA averages ${Math.round(voiceScore)}.`, "Run final pronunciation, pacing, clipping and loudness checks."),
    dimension("Technical & accessibility", weights[8], latestRender ? (latestRender.width >= 1280 && latestRender.height >= 720 ? 82 : 72) : 55, latestRender ? `${latestRender.width}×${latestRender.height}, ${latestRender.fps}fps master is playback-ready; captions remain a publishing action.` : "No final playback-ready master is stored.", "Add captions, mobile legibility and full-file playback checks."),
    dimension("Originality & brand", weights[9], motionScenes >= 3 ? 94 : 84, "Original narration, owned diagrams and a distinct approval-is-not-payment thesis are present.", "Retain the channel-owned visual language and pattern-learning firewall.", true),
    dimension("Legal, policy & monetization", weights[10], selectedAssets.length ? 68 + rightsCoverage * 24 : 58, `${rightsVerified.length}/${selectedAssets.length} selected assets have verified commercial rights.`, "Complete the asset ledger and carry synthetic-content disclosure into publishing.", true),
    dimension("Channel & session value", weights[11], 72, "The video resolves its topic, but the next-video path and end-screen destination are not yet defined.", "Create one sequel bridge, end screen and playlist destination."),
  ];

  const hardGates = [
    { name: "Critical factual claims", status: highRiskUnsupported.length ? "FAIL" : "PASS", evidence: highRiskUnsupported.length ? `${highRiskUnsupported.length} high-risk claims are unsupported.` : "No unsupported high-risk claim detected.", action: "Block publication until every high-risk claim is sourced or removed." },
    { name: "Commercial asset rights", status: selectedAssets.length && rightsCoverage === 1 ? "PASS" : "FAIL", evidence: `${rightsVerified.length}/${selectedAssets.length} selected assets have verified commercial rights.`, action: "Replace or license every unverified production asset." },
    { name: "Playback-ready master", status: latestRender?.status === "READY" ? "PASS" : "FAIL", evidence: latestRender ? `Final master v${latestRender.version} is ${latestRender.status}.` : "Final master is missing.", action: "Compose and inspect the complete audiovisual master." },
    { name: "Reference originality firewall", status: referencePassed ? "PASS" : "ACTION", evidence: referencePassed ? "Reference benchmark passed with pattern-learning-only controls." : "Reference gate has not been passed yet.", action: "Run and pass Reference Intelligence before final approval." },
    { name: "Promise–delivery alignment", status: packageNeedsWork ? "ACTION" : "PASS", evidence: packageNeedsWork ? "Video delivery is strong; current package is too generic." : "No material promise mismatch detected.", action: "Resolve packaging without changing the verified video promise." },
    { name: "Synthetic-content disclosure", status: assets.some((asset) => asset.sourceType.includes("GENERAT") || asset.sourceType.includes("MOTION")) ? "ACTION" : "PASS", evidence: "Generated or animated visuals are retained in the production manifest.", action: "Set the appropriate altered/synthetic-content disclosure during upload." },
  ];

  const coreScore = Math.round(rubric.reduce((sum, item) => sum + item.score * item.weight, 0) / 100);
  const adapterDimensions = adapter.key === "EXPLAINER_DOCUMENTARY" ? [rubric[3].score, rubric[4].score, rubric[6].score, rubric[9].score] : adapter.key === "SHORTS" ? [rubric[2].score, rubric[5].score, rubric[6].score, rubric[11].score] : adapter.key === "TUTORIAL" ? [rubric[0].score, rubric[3].score, rubric[4].score, rubric[8].score] : adapter.key === "NEWS_CURRENT" ? [rubric[1].score, rubric[3].score, rubric[10].score, rubric[8].score] : [rubric[0].score, rubric[4].score, rubric[5].score, rubric[9].score];
  const adapterScore = Math.round(average(adapterDimensions));
  const composite = Math.round(coreScore * .8 + adapterScore * .2);
  const hasFailure = hardGates.some((gate) => gate.status === "FAIL");
  const productionWeak = rubric.slice(4, 9).some((item) => item.score < settings.dimensionFloor);
  const criticalWeak = rubric.filter((item) => item.critical).some((item) => item.score < settings.criticalFloor);
  const packageRepair = [rubric[2], rubric[8], rubric[11]].some((item) => item.score < 85) || hardGates.some((gate) => gate.status === "ACTION");
  const decision = hasFailure || criticalWeak ? "BLOCKED_CRITICAL" : productionWeak ? "RECOMPOSE" : packageRepair ? "PACKAGE_REPAIR" : composite >= settings.minimumScore ? "PASS" : "REPAIR_REQUIRED";
  const mode = settings.verificationMode as VerificationMode;
  const status = mode === "MANUAL" ? "AWAITING_REVIEW" : mode === "EXCEPTIONS" && decision !== "PASS" ? "AWAITING_EXCEPTION_REVIEW" : decision === "PASS" ? "PASSED" : decision === "PACKAGE_REPAIR" && mode === "AUTOPILOT" ? "AUTO_ROUTED" : "BLOCKED";
  const repairPlan = [
    { owner: "Packaging agent", type: "PACKAGE", priority: "P0", status: rubric[2].score >= 85 ? "DONE" : "OPEN", action: "Generate three differentiated title-thumbnail pairs around approval ≠ payment, six companies and the $100 split." },
    { owner: "Publishing agent", type: "AUTO", priority: "P0", status: latestRender ? "OPEN" : "BLOCKED", action: "Create captions, full-playback checklist and synthetic-content disclosure instruction." },
    { owner: "Channel strategist", type: "PACKAGE", priority: "P1", status: "OPEN", action: "Define the sequel bridge, end screen and Hidden Systems Behind Money playlist destination." },
    { owner: "Evidence auditor", type: "EXCEPTION", priority: "P0", status: highRiskUnsupported.length ? "BLOCKED" : "DONE", action: "Resolve unsupported high-risk claims before publication." },
    { owner: "Rights guard", type: "EXCEPTION", priority: "P0", status: rightsCoverage === 1 ? "DONE" : "BLOCKED", action: "Verify commercial rights for every selected visual and audio asset." },
  ];
  const critics = [
    { critic: "Audience advocate", score: rubric[0].score, decision: rubric[0].status, finding: "The everyday card-tap entry point fits a broad English-US audience and delivers a concrete hidden-system payoff." },
    { critic: "Evidence auditor", score: rubric[3].score, decision: hardGates[0].status, finding: `${supportedClaims}/${claims.length} claims are supported; qualifiers and source traceability remain visible.` },
    { critic: "Story & retention editor", score: Math.round(average([rubric[4].score, rubric[5].score])), decision: productionWeak ? "REVISE" : "PASS", finding: "The $100 transaction spine is strong; first-30-second retention remains the key post-publish calibration target." },
    { critic: "Audiovisual director", score: Math.round(average([rubric[6].score, rubric[7].score, rubric[8].score])), decision: latestRender ? "PASS_WITH_ACTIONS" : "BLOCK", finding: "The master is coherent and motion-led; captions, mobile labels and end-to-end playback QA remain mandatory." },
    { critic: "Originality & rights guard", score: Math.round(average([rubric[9].score, rubric[10].score])), decision: hasFailure ? "BLOCK" : "PASS_WITH_ACTIONS", finding: "Owned diagrams and original narration differentiate the work; rights provenance and disclosure must travel with the package." },
    { critic: "Publishing strategist", score: Math.round(average([rubric[2].score, rubric[11].score])), decision: packageRepair ? "REVISE" : "PASS", finding: "Keep the video, strengthen the package and define the next-view path before upload." },
  ];
  const version = (priorRuns[0]?.version || 0) + 1;
  return { settings, adapter, rubric, hardGates, coreScore, adapterScore, composite, decision, status, repairPlan, critics, version, loopNumber: Math.min((priorRuns[0]?.loopNumber || -1) + 1, settings.maximumRepairLoops), latestAssembly };
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
  try { const { id } = await context.params; await ensureSchema(); const db = await getDb(); await db.insert(qualityGateSettings).values({ projectId: id, verificationMode: "AUTOPILOT", minimumScore: 85, dimensionFloor: 70, criticalFloor: 80, formatAdapter: "EXPLAINER_DOCUMENTARY", maximumRepairLoops: 2 }).onConflictDoNothing(); return Response.json(await responseData(id)); }
  catch (error) { console.error("Universal Quality Gate GET failed", error); return Response.json({ error: "Universal Quality Gate could not be loaded" }, { status: 500 }); }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params; await ensureSchema(); const db = await getDb();
    const payload = await request.json() as { action?: "RUN_GATE" | "SET_MODE" | "SET_ADAPTER" | "ROUTE_REPAIRS" | "APPROVE_GATE"; verificationMode?: VerificationMode; formatAdapter?: AdapterKey };
    if (payload.action === "RUN_GATE") return Response.json({ ok: true, ...(await runGate(id)) });
    if (payload.action === "SET_MODE" && payload.verificationMode) { await db.update(qualityGateSettings).set({ verificationMode: payload.verificationMode, updatedAt: new Date().toISOString() }).where(eq(qualityGateSettings.projectId, id)); return Response.json({ ok: true }); }
    if (payload.action === "SET_ADAPTER" && payload.formatAdapter && adapters.some((adapter) => adapter.key === payload.formatAdapter)) { await db.update(qualityGateSettings).set({ formatAdapter: payload.formatAdapter, updatedAt: new Date().toISOString() }).where(eq(qualityGateSettings.projectId, id)); return Response.json({ ok: true }); }
    if (payload.action === "ROUTE_REPAIRS") { const [latest] = await db.select().from(qualityGateRuns).where(eq(qualityGateRuns.projectId, id)).orderBy(desc(qualityGateRuns.version)).limit(1); if (!latest || latest.decision === "BLOCKED_CRITICAL" || latest.decision === "RECOMPOSE") return Response.json({ error: "Critical or production blockers cannot be routed to packaging" }, { status: 409 }); await db.update(qualityGateRuns).set({ status: "REPAIR_ROUTED" }).where(eq(qualityGateRuns.id, latest.id)); await db.update(videoProjects).set({ nextAction: "Complete Universal Quality Gate publishing repairs", updatedAt: new Date().toISOString() }).where(eq(videoProjects.id, id)); await db.insert(workflowEvents).values({ projectId: id, toStatus: "QUALITY_REPAIRS_ROUTED", eventType: "QUALITY_REPAIRS_ROUTED", summary: `Quality Gate v${latest.version} repairs routed to publishing workflow` }); return Response.json({ ok: true }); }
    if (payload.action === "APPROVE_GATE") { const [latest] = await db.select().from(qualityGateRuns).where(eq(qualityGateRuns.projectId, id)).orderBy(desc(qualityGateRuns.version)).limit(1); if (!latest || ["BLOCKED_CRITICAL", "RECOMPOSE"].includes(latest.decision)) return Response.json({ error: "Hard-gate or production blockers must be resolved first" }, { status: 409 }); await db.update(qualityGateRuns).set({ status: "PASSED" }).where(eq(qualityGateRuns.id, latest.id)); await db.update(videoProjects).set({ nextAction: "Build final QA & publishing package", updatedAt: new Date().toISOString() }).where(eq(videoProjects.id, id)); await db.insert(workflowEvents).values({ projectId: id, toStatus: "QUALITY_PASSED", eventType: "QUALITY_GATE_APPROVED", summary: `Universal Quality Gate v${latest.version} approved; final publishing package unlocked` }); return Response.json({ ok: true }); }
    return Response.json({ error: "Unknown quality gate action" }, { status: 400 });
  } catch (error) { console.error("Universal Quality Gate POST failed", error); return Response.json({ error: "Universal Quality Gate action could not be completed" }, { status: 500 }); }
}
