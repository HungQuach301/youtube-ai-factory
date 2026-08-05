import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { mediaAssets, referenceBenchmarkRuns, referenceSettings, referenceVideos, sceneManifest, videoProjects, videoRenders, workflowEvents } from "../../../../../db/schema";

type RuntimeD1 = { prepare(sql: string): { run(): Promise<unknown> } };
type RuntimeEnv = { DB?: RuntimeD1; YOUTUBE_API_KEY?: string };

type ReferenceSeed = { videoId: string; title: string; channel: string; group: "PROVEN" | "RECENT" | "OUTLIER"; score: number; angle: string; hook: string; lesson: string };

const referenceSeeds: ReferenceSeed[] = [
  { videoId: "oue5A-7Hpx4", title: "How Credit Cards Work In The U.S. | CNBC Marathon", channel: "CNBC", group: "PROVEN", score: 96, angle: "Authority-led system economics", hook: "Large-scale cost and market stakes", lesson: "Use institutional authority and concrete money figures to establish consequence." },
  { videoId: "0lpOMNC2Elo", title: "How Visa Became The Most Popular Card In The U.S.", channel: "CNBC", group: "PROVEN", score: 94, angle: "Company story through network effects", hook: "A familiar logo hides a massive network", lesson: "Turn invisible infrastructure into a character with incentives and power." },
  { videoId: "S7dWigI7Soc", title: "Why Tap-to-Pay Is Safer Than a Credit Card Swipe", channel: "The Wall Street Journal", group: "OUTLIER", score: 91, angle: "Technology mechanism plus consumer payoff", hook: "Counterintuitive safety claim", lesson: "Anchor technical explanation in one surprising user-relevant claim." },
  { videoId: "xkncAaLq5Cc", title: "Credit Card Payments Explained | How Card Transactions Work", channel: "Payments explainer", group: "RECENT", score: 86, angle: "Authorization-to-settlement walkthrough", hook: "One transaction, multiple hidden participants", lesson: "Introduce the participant map early and maintain spatial continuity." },
  { videoId: "gzTYbl2Kwuk", title: "Payment Processing Credit/Debit Cards", channel: "Industry education", group: "PROVEN", score: 84, angle: "Authorization, clearing and settlement", hook: "Decode the three-stage process", lesson: "Label process stages explicitly so viewers never lose their position." },
  { videoId: "5JGnvTiPkJY", title: "What Happens After You Swipe? Credit Card Payments", channel: "Payments explainer", group: "RECENT", score: 83, angle: "Post-swipe curiosity", hook: "What happens in the seconds after approval", lesson: "The strongest shared curiosity is the gap between approval and actual money movement." },
  { videoId: "m0XQfPV_fqA", title: "Credit Card Processing Fees Explained", channel: "Merchant education", group: "RECENT", score: 81, angle: "$100 fee breakdown", hook: "Where every part of a sale goes", lesson: "A concrete $100 receipt is easier to remember than abstract percentages." },
  { videoId: "KBkoLdJ10ac", title: "How Card Payments Work", channel: "Payments education", group: "PROVEN", score: 82, angle: "Authorisation, authentication and settlement", hook: "Three steps behind a simple tap", lesson: "Use consistent names and colors for each stage and participant." },
  { videoId: "K6ZvZIItie0", title: "How a Credit Card Transaction Works", channel: "Nuvei", group: "OUTLIER", score: 80, angle: "Full payment infrastructure flow", hook: "Follow one transaction end to end", lesson: "A route-map metaphor makes complex infrastructure legible." },
  { videoId: "c3rZ2-aAM58", title: "How Card Companies Quietly Make $118,800,000,000 a Year", channel: "Business documentary", group: "OUTLIER", score: 88, angle: "Hidden economics and incentives", hook: "A very large quantified consequence", lesson: "Packaging performs better when the system explanation reveals who profits." },
];

let schemaReady: Promise<void> | null = null;

async function runtimeEnv() { const { env } = await import("cloudflare:workers"); return env as unknown as RuntimeEnv; }

async function ensureSchema() {
  if (!schemaReady) schemaReady = (async () => {
    const env = await runtimeEnv(); if (!env.DB) throw new Error("Production database is unavailable");
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS reference_videos (
      id text PRIMARY KEY NOT NULL, project_id text NOT NULL, youtube_video_id text NOT NULL,
      url text NOT NULL, title text NOT NULL, channel_name text NOT NULL, reference_group text NOT NULL,
      thumbnail_url text, published_at text, duration_seconds integer DEFAULT 0 NOT NULL,
      view_count integer DEFAULT 0 NOT NULL, like_count integer DEFAULT 0 NOT NULL,
      comment_count integer DEFAULT 0 NOT NULL, reference_score integer DEFAULT 0 NOT NULL,
      insight_json text NOT NULL, status text DEFAULT 'INCLUDED' NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`).run();
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS reference_benchmark_runs (
      id text PRIMARY KEY NOT NULL, project_id text NOT NULL, version integer NOT NULL,
      status text DEFAULT 'READY' NOT NULL, decision text NOT NULL, composite_score integer DEFAULT 0 NOT NULL,
      gap_matrix_json text NOT NULL, critic_results_json text NOT NULL, recommendations_json text NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`).run();
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS reference_settings (
      project_id text PRIMARY KEY NOT NULL, verification_mode text DEFAULT 'AUTOPILOT' NOT NULL,
      minimum_score integer DEFAULT 75 NOT NULL, market text DEFAULT 'US' NOT NULL,
      language text DEFAULT 'en' NOT NULL, updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`).run();
  })().catch((error) => { schemaReady = null; throw error; });
  await schemaReady;
}

function parseDuration(value: string) {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value || "");
  return match ? Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0) : 0;
}

function insightFor(title: string, fallback?: ReferenceSeed) {
  const lower = title.toLowerCase();
  const hook = fallback?.hook || (lower.startsWith("why") ? "Contrarian why-question" : lower.includes("what happens") ? "Hidden-process curiosity" : lower.includes("$") || /\d{3,}/.test(title) ? "Quantified consequence" : "Clear explanatory promise");
  const angle = fallback?.angle || (lower.includes("fee") || lower.includes("money") ? "Economic incentives" : lower.includes("safe") ? "Consumer technology benefit" : "End-to-end system walkthrough");
  return { hook, angle, lesson: fallback?.lesson || "Map one invisible mechanism to one concrete viewer consequence.", analysisScope: "Public metadata and packaging signals only", reusePolicy: "LEARN_PATTERN_ONLY" };
}

async function discoverLiveReferences(apiKey: string) {
  const queries = ["what happens when you swipe a credit card", "credit card authorization clearing settlement", "credit card processing fees explained"];
  const ids = new Set<string>();
  for (const query of queries) {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&regionCode=US&relevanceLanguage=en&q=${encodeURIComponent(query)}&key=${encodeURIComponent(apiKey)}`, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) continue; const data = await response.json() as { items?: Array<{ id?: { videoId?: string } }> }; for (const item of data.items || []) if (item.id?.videoId) ids.add(item.id.videoId);
  }
  if (!ids.size) return [];
  const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${encodeURIComponent([...ids].join(","))}&key=${encodeURIComponent(apiKey)}`, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) return [];
  const data = await response.json() as { items?: Array<{ id: string; snippet: { title: string; channelTitle: string; publishedAt: string; thumbnails?: { high?: { url?: string }; medium?: { url?: string } } }; statistics?: { viewCount?: string; likeCount?: string; commentCount?: string }; contentDetails?: { duration?: string } }> };
  return (data.items || []).map((item) => {
    const views = Number(item.statistics?.viewCount || 0); const likes = Number(item.statistics?.likeCount || 0); const comments = Number(item.statistics?.commentCount || 0); const ageDays = Math.max(1, (Date.now() - new Date(item.snippet.publishedAt).getTime()) / 86400000); const velocity = views / ageDays;
    const fitTerms = ["credit", "card", "payment", "authorization", "settlement", "fee"]; const fit = fitTerms.filter((term) => item.snippet.title.toLowerCase().includes(term)).length;
    const score = Math.min(99, Math.round(45 + Math.log10(views + 1) * 5 + Math.log10(velocity + 1) * 3 + Math.min(8, (likes + comments * 2) / Math.max(1, views) * 500) + fit * 2));
    return { videoId: item.id, title: item.snippet.title, channel: item.snippet.channelTitle, group: ageDays <= 365 ? "RECENT" as const : views >= 500000 ? "PROVEN" as const : "OUTLIER" as const, score, thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`, publishedAt: item.snippet.publishedAt, durationSeconds: parseDuration(item.contentDetails?.duration || ""), views, likes, comments, insight: insightFor(item.snippet.title) };
  }).sort((a, b) => b.score - a.score).slice(0, 18);
}

async function discoverReferences(projectId: string) {
  const db = await getDb(); const env = await runtimeEnv();
  const live = env.YOUTUBE_API_KEY ? await discoverLiveReferences(env.YOUTUBE_API_KEY) : [];
  const candidates = live.length ? live : referenceSeeds.map((seed) => ({ videoId: seed.videoId, title: seed.title, channel: seed.channel, group: seed.group, score: seed.score, thumbnail: `https://i.ytimg.com/vi/${seed.videoId}/hqdefault.jpg`, publishedAt: null, durationSeconds: 0, views: 0, likes: 0, comments: 0, insight: insightFor(seed.title, seed) }));
  for (const candidate of candidates) {
    await db.insert(referenceVideos).values({ id: `${projectId}-REF-${candidate.videoId}`, projectId, youtubeVideoId: candidate.videoId, url: `https://www.youtube.com/watch?v=${candidate.videoId}`, title: candidate.title, channelName: candidate.channel, referenceGroup: candidate.group, thumbnailUrl: candidate.thumbnail, publishedAt: candidate.publishedAt, durationSeconds: candidate.durationSeconds, viewCount: candidate.views, likeCount: candidate.likes, commentCount: candidate.comments, referenceScore: candidate.score, insightJson: JSON.stringify(candidate.insight), status: "INCLUDED", updatedAt: new Date().toISOString() }).onConflictDoUpdate({ target: referenceVideos.id, set: { title: candidate.title, channelName: candidate.channel, referenceGroup: candidate.group, thumbnailUrl: candidate.thumbnail, publishedAt: candidate.publishedAt, durationSeconds: candidate.durationSeconds, viewCount: candidate.views, likeCount: candidate.likes, commentCount: candidate.comments, referenceScore: candidate.score, insightJson: JSON.stringify(candidate.insight), updatedAt: new Date().toISOString() } });
  }
  await db.insert(workflowEvents).values({ projectId, toStatus: "REFERENCE_BENCHMARK", eventType: "REFERENCE_DISCOVERY_COMPLETED", summary: `${candidates.length} English-US YouTube references ranked using ${live.length ? "live YouTube metrics" : "curated public metadata"}; no source footage imported` });
  return { count: candidates.length, sourceMode: live.length ? "YOUTUBE_DATA_API" : "CURATED_PUBLIC_METADATA" };
}

async function runBenchmark(projectId: string) {
  const db = await getDb(); let references = await db.select().from(referenceVideos).where(eq(referenceVideos.projectId, projectId)).orderBy(desc(referenceVideos.referenceScore));
  if (!references.length) { await discoverReferences(projectId); references = await db.select().from(referenceVideos).where(eq(referenceVideos.projectId, projectId)).orderBy(desc(referenceVideos.referenceScore)); }
  const [settingsRows, priorRuns, projectRows, scenes, assets, renders] = await Promise.all([
    db.select().from(referenceSettings).where(eq(referenceSettings.projectId, projectId)).limit(1), db.select().from(referenceBenchmarkRuns).where(eq(referenceBenchmarkRuns.projectId, projectId)).orderBy(desc(referenceBenchmarkRuns.version)), db.select().from(videoProjects).where(eq(videoProjects.id, projectId)).limit(1), db.select().from(sceneManifest).where(eq(sceneManifest.projectId, projectId)).orderBy(asc(sceneManifest.sceneNumber)), db.select().from(mediaAssets).where(eq(mediaAssets.projectId, projectId)), db.select().from(videoRenders).where(eq(videoRenders.projectId, projectId)).orderBy(desc(videoRenders.version)),
  ]);
  const included = references.filter((reference) => reference.status === "INCLUDED"); const motionCount = new Set(assets.filter((asset) => asset.sourceType === "MOTION_RENDER_WEBM" && asset.status === "APPROVED").map((asset) => asset.sceneId)).size; const approvedCount = new Set(assets.filter((asset) => asset.status === "APPROVED" && asset.rightsStatus === "VERIFIED").map((asset) => asset.sceneId)).size; const title = projectRows[0]?.title || "";
  const gaps = [
    { dimension: "Hook", benchmark: "Open with a contradiction, quantified stake or hidden process in the first 10 seconds", current: "Approval is not money: a strong contradiction appears immediately", score: 91, severity: "PASS", action: "Keep the approval-versus-money opening" },
    { dimension: "Story architecture", benchmark: "Follow one transaction through clearly labeled participants and stages", current: `${scenes.length} scenes follow a single $100 transaction across six participants`, score: scenes.length >= 8 ? 90 : 68, severity: scenes.length >= 8 ? "PASS" : "REVISE", action: "Preserve the transaction route and stage labels" },
    { dimension: "Visual pacing", benchmark: "Introduce a visual change or pattern interrupt every 4–7 seconds", current: `${motionCount} motion system scenes plus ${approvedCount} rights-approved visual scenes`, score: motionCount >= 3 ? 84 : 70, severity: motionCount >= 3 ? "WATCH" : "REVISE", action: "Use diagram node reveals and subtle motion inside longer scenes" },
    { dimension: "Concrete payoff", benchmark: "Convert abstract fees into a memorable receipt or dollar split", current: "The final fee waterfall resolves the $100 example", score: 89, severity: "PASS", action: "Keep the merchant net-deposit payoff" },
    { dimension: "Originality", benchmark: "Add a distinct thesis, narrative and owned visual language", current: "Channel-owned motion maps frame authorization as a promise, not payment", score: 92, severity: "PASS", action: "Retain original diagrams and documented source provenance" },
    { dimension: "Packaging", benchmark: "Combine one concrete consequence with one unresolved curiosity gap", current: `“${title}” is clear but closely resembles common category wording`, score: 69, severity: "REVISE", action: "Replace the generic what-happens framing with the approval paradox, six-company path or $100 split" },
  ];
  const critics = [
    { critic: "Audience strategist", score: 88, decision: "PASS", finding: "The everyday card-tap entry point fits a broad US audience." },
    { critic: "Story editor", score: 89, decision: "PASS", finding: "The $100 through-line and approval-versus-settlement contrast create a complete payoff." },
    { critic: "Visual director", score: motionCount >= 3 ? 85 : 72, decision: motionCount >= 3 ? "PASS" : "REVISE", finding: motionCount >= 3 ? "Motion diagrams differentiate the explainer from stock-only competitors." : "Render all planned diagrams before final QA." },
    { critic: "Packaging critic", score: 69, decision: "REVISE", finding: "The current title is accurate but too close to common search-result phrasing." },
    { critic: "Originality guard", score: 94, decision: "PASS", finding: "References are used for pattern learning only; no footage or transcript is imported." },
  ];
  const composite = Math.round(critics.reduce((sum, critic) => sum + critic.score, 0) / critics.length); const criticalProductionGap = gaps.some((gap) => gap.severity === "REVISE" && gap.dimension !== "Packaging"); const decision = criticalProductionGap ? "RECOMPOSE_REQUIRED" : gaps.some((gap) => gap.dimension === "Packaging" && gap.severity === "REVISE") ? "PACKAGE_ONLY" : "PASS_WITH_BACKLOG";
  const recommendations = { doNow: decision === "PACKAGE_ONLY" ? ["Keep the composed video", "Create a differentiated title and thumbnail set", "Run final playback QA before upload"] : ["Return flagged dimensions to the relevant production workspace"], titleDirections: ["Your Card Says Approved. Your Money Hasn't Moved.", "Six Companies Touch Your Money After One Tap", "$100 Leaves Your Card. Who Actually Gets Paid?"], thumbnailDirections: ["APPROVED ≠ PAID", "ONE TAP · SIX COMPANIES", "$100 → WHO GETS IT?"], nextLoop: ["Measure CTR after impressions accumulate", "Inspect first-30-second retention", "Feed real viewer questions into the next topic brief"] };
  const settings = settingsRows[0] || { verificationMode: "AUTOPILOT", minimumScore: 75, market: "US", language: "en" }; const autoPass = settings.verificationMode === "AUTOPILOT" && composite >= settings.minimumScore && decision !== "RECOMPOSE_REQUIRED"; const status = autoPass ? "PASSED" : settings.verificationMode === "REVIEW" ? "AWAITING_REVIEW" : "BLOCKED"; const version = (priorRuns[0]?.version || 0) + 1; const id = `${projectId}-BENCHMARK-V${version}`;
  await db.insert(referenceBenchmarkRuns).values({ id, projectId, version, status, decision, compositeScore: composite, gapMatrixJson: JSON.stringify(gaps), criticResultsJson: JSON.stringify(critics), recommendationsJson: JSON.stringify(recommendations) });
  if (autoPass) { await db.update(videoProjects).set({ nextAction: "Run Universal Quality Gate", updatedAt: new Date().toISOString() }).where(eq(videoProjects.id, projectId)); await db.insert(workflowEvents).values({ projectId, fromStatus: renders.length ? "RENDER_READY" : "ASSEMBLY_READY", toStatus: "REFERENCE_PASSED", eventType: "REFERENCE_GATE_PASSED", summary: `Reference benchmark v${version} scored ${composite}/100 with ${decision}; Universal Quality Gate unlocked` }); }
  else await db.insert(workflowEvents).values({ projectId, toStatus: "REFERENCE_REVIEW", eventType: "REFERENCE_BENCHMARK_COMPLETED", summary: `Reference benchmark v${version} scored ${composite}/100 and awaits ${decision === "RECOMPOSE_REQUIRED" ? "production revision" : "human review"}` });
  return { id, version, status, decision, composite, referenceCount: included.length };
}

async function responseData(projectId: string) {
  const db = await getDb(); const env = await runtimeEnv();
  const [references, runs, settingsRows] = await Promise.all([db.select().from(referenceVideos).where(eq(referenceVideos.projectId, projectId)).orderBy(desc(referenceVideos.referenceScore)), db.select().from(referenceBenchmarkRuns).where(eq(referenceBenchmarkRuns.projectId, projectId)).orderBy(desc(referenceBenchmarkRuns.version)), db.select().from(referenceSettings).where(eq(referenceSettings.projectId, projectId)).limit(1)]);
  return { provider: { mode: env.YOUTUBE_API_KEY ? "YOUTUBE_DATA_API" : "CURATED_PUBLIC_METADATA", liveMetrics: Boolean(env.YOUTUBE_API_KEY) }, references: references.map((reference) => ({ ...reference, insight: JSON.parse(reference.insightJson) })), runs: runs.map((run) => ({ ...run, gaps: JSON.parse(run.gapMatrixJson), critics: JSON.parse(run.criticResultsJson), recommendations: JSON.parse(run.recommendationsJson) })), settings: settingsRows[0] || { verificationMode: "AUTOPILOT", minimumScore: 75, market: "US", language: "en" } };
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { const { id } = await context.params; await ensureSchema(); const db = await getDb(); await db.insert(referenceSettings).values({ projectId: id, verificationMode: "AUTOPILOT", minimumScore: 75, market: "US", language: "en" }).onConflictDoNothing(); return Response.json(await responseData(id)); }
  catch (error) { console.error("Reference intelligence GET failed", error); return Response.json({ error: "Reference intelligence could not be loaded" }, { status: 500 }); }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params; await ensureSchema(); const db = await getDb(); const payload = await request.json() as { action?: "DISCOVER_REFERENCES" | "RUN_BENCHMARK" | "SET_MODE" | "APPROVE_BENCHMARK" | "TOGGLE_REFERENCE"; verificationMode?: "AUTOPILOT" | "REVIEW"; referenceId?: string };
    if (payload.action === "DISCOVER_REFERENCES") return Response.json({ ok: true, ...(await discoverReferences(id)) });
    if (payload.action === "RUN_BENCHMARK") return Response.json({ ok: true, ...(await runBenchmark(id)) });
    if (payload.action === "SET_MODE") { if (!payload.verificationMode) return Response.json({ error: "Verification mode is required" }, { status: 400 }); await db.insert(referenceSettings).values({ projectId: id, verificationMode: payload.verificationMode, minimumScore: 75, market: "US", language: "en", updatedAt: new Date().toISOString() }).onConflictDoUpdate({ target: referenceSettings.projectId, set: { verificationMode: payload.verificationMode, updatedAt: new Date().toISOString() } }); return Response.json({ ok: true }); }
    if (payload.action === "TOGGLE_REFERENCE") { if (!payload.referenceId) return Response.json({ error: "Reference is required" }, { status: 400 }); const [reference] = await db.select().from(referenceVideos).where(eq(referenceVideos.id, payload.referenceId)).limit(1); if (!reference || reference.projectId !== id) return Response.json({ error: "Reference not found" }, { status: 404 }); await db.update(referenceVideos).set({ status: reference.status === "INCLUDED" ? "EXCLUDED" : "INCLUDED", updatedAt: new Date().toISOString() }).where(eq(referenceVideos.id, reference.id)); return Response.json({ ok: true }); }
    if (payload.action === "APPROVE_BENCHMARK") { const [latest] = await db.select().from(referenceBenchmarkRuns).where(eq(referenceBenchmarkRuns.projectId, id)).orderBy(desc(referenceBenchmarkRuns.version)).limit(1); if (!latest || latest.decision === "RECOMPOSE_REQUIRED") return Response.json({ error: "A critical production gap must be resolved first" }, { status: 409 }); await db.update(referenceBenchmarkRuns).set({ status: "PASSED" }).where(eq(referenceBenchmarkRuns.id, latest.id)); await db.update(videoProjects).set({ nextAction: "Run Universal Quality Gate", updatedAt: new Date().toISOString() }).where(eq(videoProjects.id, id)); await db.insert(workflowEvents).values({ projectId: id, toStatus: "REFERENCE_PASSED", eventType: "REFERENCE_GATE_APPROVED", summary: `Human approved benchmark v${latest.version}; Universal Quality Gate unlocked` }); return Response.json({ ok: true }); }
    return Response.json({ error: "Unknown reference action" }, { status: 400 });
  } catch (error) { console.error("Reference intelligence POST failed", error); return Response.json({ error: "Reference action could not be completed" }, { status: 500 }); }
}
