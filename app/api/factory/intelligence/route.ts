import { storeDriveJsonArtifact } from "../../../../lib/google-drive";
import { AI_USAGE_TABLE_SQL, recordOpenAIUsage } from "../../../../lib/ai-usage";

const PROGRAM_ID = "YTAF-V7-GREENFIELD";
const MODEL = "gpt-5.6";
const STAGES = {
  "01": { name: "Market & audience intelligence", threshold: 85, artifactType: "MARKET_AUDIENCE_PACK" },
  "02": { name: "Reference intelligence", threshold: 90, artifactType: "REFERENCE_INTELLIGENCE_PACK" },
  "03": { name: "Research & claim graph", threshold: 92, artifactType: "RESEARCH_CLAIM_GRAPH" },
} as const;

type StageKey = keyof typeof STAGES;
type RuntimeStatement = {
  bind: (...values: unknown[]) => RuntimeStatement;
  run: () => Promise<unknown>;
  all: <T>() => Promise<{ results?: T[] }>;
  first: <T>() => Promise<T | null>;
};
type RuntimeDatabase = {
  prepare: (sql: string) => RuntimeStatement;
  batch: (statements: RuntimeStatement[]) => Promise<unknown>;
};
type RuntimeBucket = {
  put: (key: string, value: string, options?: Record<string, unknown>) => Promise<unknown>;
  head: (key: string) => Promise<unknown>;
};
type RuntimeEnv = { DB?: RuntimeDatabase; BUCKET?: RuntimeBucket; OPENAI_API_KEY?: string; OPENAI_QA_MODEL?: string };
type Source = { id: string; sourceType: string; title: string; publisher: string; url: string; publishedAt: string; authorityTier: string; freshnessState: string };
type Gate = { id: string; label: string; status: "PASS" | "FAIL"; evidence: string };

const schema = [
  AI_USAGE_TABLE_SQL,
  `CREATE TABLE IF NOT EXISTS v7_intelligence_runs (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, stage_key text NOT NULL, attempt integer DEFAULT 1 NOT NULL, status text DEFAULT 'RUNNING' NOT NULL, score integer DEFAULT 0 NOT NULL, threshold integer DEFAULT 90 NOT NULL, model_id text NOT NULL, source_mode text DEFAULT 'OPENAI_WEB_SEARCH' NOT NULL, gate_json text DEFAULT '[]' NOT NULL, started_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, completed_at text)`,
  `CREATE TABLE IF NOT EXISTS v7_intelligence_jobs (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, run_id text NOT NULL, stage_key text NOT NULL, provider_response_id text NOT NULL, provider_status text DEFAULT 'queued' NOT NULL, status text DEFAULT 'ACTIVE' NOT NULL, heartbeat_at text NOT NULL, started_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, finalized_at text, error text)`,
  `CREATE TABLE IF NOT EXISTS v7_intelligence_artifacts (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, run_id text NOT NULL, stage_key text NOT NULL, artifact_type text NOT NULL, title text NOT NULL, lifecycle_state text DEFAULT 'MATERIALIZED' NOT NULL, content_json text NOT NULL, content_hash text NOT NULL, runtime_key text, drive_file_id text, source_count integer DEFAULT 0 NOT NULL, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_intelligence_sources (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, run_id text NOT NULL, stage_key text NOT NULL, source_type text NOT NULL, title text NOT NULL, publisher text NOT NULL, url text NOT NULL, published_at text, authority_tier text NOT NULL, freshness_state text NOT NULL, verification_state text DEFAULT 'WEB_GROUNDED' NOT NULL, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_claim_nodes (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, run_id text NOT NULL, claim_text text NOT NULL, claim_class text NOT NULL, risk_level text NOT NULL, status text DEFAULT 'CONTROLLED' NOT NULL, source_ids_json text NOT NULL, counter_evidence text DEFAULT '' NOT NULL, qualification text DEFAULT '' NOT NULL, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
] as const;

async function runtime() {
  const { env } = await import("cloudflare:workers");
  const value = env as unknown as RuntimeEnv;
  if (!value.DB) throw new Error("V7 intelligence database is unavailable");
  await value.DB.batch(schema.map((statement) => value.DB!.prepare(statement)));
  return value;
}

function outputText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string") return payload.output_text;
  for (const item of Array.isArray(payload.output) ? payload.output : []) {
    const content = item && typeof item === "object" && Array.isArray((item as { content?: unknown[] }).content) ? (item as { content: unknown[] }).content : [];
    for (const block of content) if (block && typeof block === "object" && typeof (block as { text?: unknown }).text === "string") return String((block as { text: string }).text);
  }
  throw new Error("OpenAI returned no structured intelligence artifact");
}

async function startOpenAIResearch(env: RuntimeEnv, name: string, prompt: string, responseSchema: Record<string, unknown>) {
  if (!env.OPENAI_API_KEY) throw new Error("Connect OPENAI_API_KEY before running Wave 2 intelligence");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: env.OPENAI_QA_MODEL || MODEL,
      reasoning: { effort: "high" },
      tools: [{ type: "web_search", return_token_budget: "unlimited" }],
      background: true,
      store: true,
      input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
      text: { format: { type: "json_schema", name, strict: true, schema: responseSchema } },
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 500);
    throw new Error(`OpenAI web-grounded intelligence failed (${response.status})${detail ? ` · ${detail}` : ""}`);
  }
  const payload = await response.json() as Record<string, unknown>;
  if (typeof payload.id !== "string") throw new Error("OpenAI did not return a background response ID");
  return { id: payload.id, status: String(payload.status || "queued") };
}

async function retrieveOpenAIResearch(env: RuntimeEnv, responseId: string) {
  if (!env.OPENAI_API_KEY) throw new Error("Connect OPENAI_API_KEY before resuming Wave 2 intelligence");
  const response = await fetch(`https://api.openai.com/v1/responses/${encodeURIComponent(responseId)}`, {
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 500);
    throw new Error(`OpenAI research status failed (${response.status})${detail ? ` · ${detail}` : ""}`);
  }
  return await response.json() as Record<string, unknown>;
}

const sourceSchema = {
  type: "object", additionalProperties: false,
  properties: {
    id: { type: "string" }, sourceType: { type: "string" }, title: { type: "string" }, publisher: { type: "string" },
    url: { type: "string" }, publishedAt: { type: "string" }, authorityTier: { type: "string", enum: ["TIER_1_PRIMARY", "TIER_2_AUTHORITATIVE", "TIER_3_CONTEXT"] },
    freshnessState: { type: "string", enum: ["CURRENT_12M", "CURRENT_36M", "EVERGREEN_PRIMARY"] },
  },
  required: ["id", "sourceType", "title", "publisher", "url", "publishedAt", "authorityTier", "freshnessState"],
};

const stageSchemas: Record<StageKey, Record<string, unknown>> = {
  "01": {
    type: "object", additionalProperties: false,
    properties: {
      channelThesis: { type: "string" }, targetMarket: { type: "string" }, targetLanguage: { type: "string" },
      audienceSegments: { type: "array", minItems: 3, items: { type: "object", additionalProperties: false, properties: { segment: { type: "string" }, tension: { type: "string" }, trigger: { type: "string" }, desiredPayoff: { type: "string" } }, required: ["segment", "tension", "trigger", "desiredPayoff"] } },
      topicClusters: { type: "array", minItems: 5, items: { type: "object", additionalProperties: false, properties: { name: { type: "string" }, demandSignal: { type: "string" }, competitionGap: { type: "string" }, monetizationFit: { type: "string" }, visualPotential: { type: "string" } }, required: ["name", "demandSignal", "competitionGap", "monetizationFit", "visualPotential"] } },
      candidates: { type: "array", minItems: 12, items: { type: "object", additionalProperties: false, properties: { title: { type: "string" }, centralQuestion: { type: "string" }, viewerPromise: { type: "string" }, novelty: { type: "integer", minimum: 0, maximum: 100 }, evergreenFit: { type: "integer", minimum: 0, maximum: 100 }, visualPotential: { type: "integer", minimum: 0, maximum: 100 }, score: { type: "integer", minimum: 0, maximum: 100 } }, required: ["title", "centralQuestion", "viewerPromise", "novelty", "evergreenFit", "visualPotential", "score"] } },
      champion: { type: "object", additionalProperties: false, properties: { title: { type: "string" }, whyNow: { type: "string" }, centralQuestion: { type: "string" }, viewerPromise: { type: "string" }, differentiation: { type: "string" }, risks: { type: "array", minItems: 4, items: { type: "string" } } }, required: ["title", "whyNow", "centralQuestion", "viewerPromise", "differentiation", "risks"] },
      sources: { type: "array", minItems: 10, items: sourceSchema },
    },
    required: ["channelThesis", "targetMarket", "targetLanguage", "audienceSegments", "topicClusters", "candidates", "champion", "sources"],
  },
  "02": {
    type: "object", additionalProperties: false,
    properties: {
      championTitle: { type: "string" },
      references: { type: "array", minItems: 10, items: { type: "object", additionalProperties: false, properties: { id: { type: "string" }, title: { type: "string" }, channel: { type: "string" }, url: { type: "string" }, publishedAt: { type: "string" }, referenceGroup: { type: "string", enum: ["PROVEN", "RECENT", "OUTLIER"] }, whyItWorks: { type: "string" }, hookPattern: { type: "string" }, storyPattern: { type: "string" }, visualPattern: { type: "string" }, packagingPattern: { type: "string" }, doNotCopy: { type: "string" } }, required: ["id", "title", "channel", "url", "publishedAt", "referenceGroup", "whyItWorks", "hookPattern", "storyPattern", "visualPattern", "packagingPattern", "doNotCopy"] } },
      crossReferencePatterns: { type: "array", minItems: 6, items: { type: "string" } },
      antiCloneControls: { type: "array", minItems: 6, items: { type: "string" } },
      gapStatement: { type: "string" },
      sources: { type: "array", minItems: 10, items: sourceSchema },
    },
    required: ["championTitle", "references", "crossReferencePatterns", "antiCloneControls", "gapStatement", "sources"],
  },
  "03": {
    type: "object", additionalProperties: false,
    properties: {
      championTitle: { type: "string" },
      researchQuestions: { type: "array", minItems: 8, items: { type: "string" } },
      sources: { type: "array", minItems: 12, items: sourceSchema },
      claims: { type: "array", minItems: 12, items: { type: "object", additionalProperties: false, properties: { id: { type: "string" }, text: { type: "string" }, claimClass: { type: "string" }, riskLevel: { type: "string", enum: ["P0", "P1", "P2"] }, sourceIds: { type: "array", minItems: 2, items: { type: "string" } }, counterEvidence: { type: "string" }, qualification: { type: "string" } }, required: ["id", "text", "claimClass", "riskLevel", "sourceIds", "counterEvidence", "qualification"] } },
      contradictions: { type: "array", minItems: 3, items: { type: "object", additionalProperties: false, properties: { question: { type: "string" }, resolution: { type: "string" }, sourceIds: { type: "array", minItems: 2, items: { type: "string" } } }, required: ["question", "resolution", "sourceIds"] } },
      uncertaintyLedger: { type: "array", minItems: 5, items: { type: "object", additionalProperties: false, properties: { uncertainty: { type: "string" }, safeLanguage: { type: "string" }, prohibitedOverclaim: { type: "string" } }, required: ["uncertainty", "safeLanguage", "prohibitedOverclaim"] } },
      storyEligibleClaimIds: { type: "array", minItems: 8, items: { type: "string" } }, excludedClaimIds: { type: "array", items: { type: "string" } },
    },
    required: ["championTitle", "researchQuestions", "sources", "claims", "contradictions", "uncertaintyLedger", "storyEligibleClaimIds", "excludedClaimIds"],
  },
};

function array(value: unknown) { return Array.isArray(value) ? value : []; }
function sourcesOf(artifact: Record<string, unknown>) { return array(artifact.sources) as Source[]; }

function evaluate(stage: StageKey, artifact: Record<string, unknown>) {
  const sources = sourcesOf(artifact);
  const tierOne = sources.filter((source) => source.authorityTier === "TIER_1_PRIMARY").length;
  const gates: Gate[] = [];
  if (stage === "01") gates.push(
    { id: "AUDIENCE", label: "Three specific audience segments", status: array(artifact.audienceSegments).length >= 3 ? "PASS" : "FAIL", evidence: `${array(artifact.audienceSegments).length}/3 segments` },
    { id: "CLUSTERS", label: "Five opportunity clusters", status: array(artifact.topicClusters).length >= 5 ? "PASS" : "FAIL", evidence: `${array(artifact.topicClusters).length}/5 clusters` },
    { id: "CANDIDATES", label: "Twelve topic candidates", status: array(artifact.candidates).length >= 12 ? "PASS" : "FAIL", evidence: `${array(artifact.candidates).length}/12 candidates` },
    { id: "SOURCES", label: "Ten web-grounded sources", status: sources.length >= 10 ? "PASS" : "FAIL", evidence: `${sources.length}/10 sources` },
    { id: "PRIMARY", label: "Primary-source floor", status: tierOne >= 3 ? "PASS" : "FAIL", evidence: `${tierOne}/3 primary sources` },
    { id: "CHAMPION", label: "Champion topic contract", status: typeof artifact.champion === "object" && artifact.champion !== null ? "PASS" : "FAIL", evidence: "One differentiated winner with explicit risks" },
  );
  if (stage === "02") {
    const references = array(artifact.references) as Array<{ referenceGroup?: string; url?: string }>;
    const counts = Object.fromEntries(["PROVEN", "RECENT", "OUTLIER"].map((group) => [group, references.filter((item) => item.referenceGroup === group).length]));
    gates.push(
      { id: "DEPTH", label: "Reference-set depth", status: references.length >= 10 ? "PASS" : "FAIL", evidence: `${references.length}/10 references` },
      { id: "PROVEN", label: "Proven exemplars", status: counts.PROVEN >= 4 ? "PASS" : "FAIL", evidence: `${counts.PROVEN}/4 proven` },
      { id: "RECENT", label: "Recent category signals", status: counts.RECENT >= 4 ? "PASS" : "FAIL", evidence: `${counts.RECENT}/4 recent` },
      { id: "OUTLIER", label: "Outlier inspiration", status: counts.OUTLIER >= 2 ? "PASS" : "FAIL", evidence: `${counts.OUTLIER}/2 outliers` },
      { id: "PATTERNS", label: "Cross-reference pattern extraction", status: array(artifact.crossReferencePatterns).length >= 6 ? "PASS" : "FAIL", evidence: `${array(artifact.crossReferencePatterns).length}/6 patterns` },
      { id: "ANTICLONE", label: "Originality firewall", status: array(artifact.antiCloneControls).length >= 6 ? "PASS" : "FAIL", evidence: `${array(artifact.antiCloneControls).length}/6 controls` },
    );
  }
  if (stage === "03") {
    const claims = array(artifact.claims) as Array<{ riskLevel?: string; sourceIds?: unknown[] }>;
    const p0 = claims.filter((claim) => claim.riskLevel === "P0");
    gates.push(
      { id: "SOURCE_DEPTH", label: "Twelve-source research floor", status: sources.length >= 12 ? "PASS" : "FAIL", evidence: `${sources.length}/12 sources` },
      { id: "OFFICIAL", label: "Primary authority coverage", status: tierOne >= 6 ? "PASS" : "FAIL", evidence: `${tierOne}/6 primary sources` },
      { id: "CLAIMS", label: "Controlled claim graph", status: claims.length >= 12 ? "PASS" : "FAIL", evidence: `${claims.length}/12 claims` },
      { id: "CORROBORATION", label: "P0 corroboration", status: p0.length > 0 && p0.every((claim) => array(claim.sourceIds).length >= 2) ? "PASS" : "FAIL", evidence: `${p0.filter((claim) => array(claim.sourceIds).length >= 2).length}/${p0.length} P0 claims corroborated` },
      { id: "CONTRADICTIONS", label: "Adversarial contradiction review", status: array(artifact.contradictions).length >= 3 ? "PASS" : "FAIL", evidence: `${array(artifact.contradictions).length}/3 contradictions` },
      { id: "UNCERTAINTY", label: "Uncertainty ledger", status: array(artifact.uncertaintyLedger).length >= 5 ? "PASS" : "FAIL", evidence: `${array(artifact.uncertaintyLedger).length}/5 bounded uncertainties` },
      { id: "STORY_USE", label: "Story-eligible evidence", status: array(artifact.storyEligibleClaimIds).length >= 8 ? "PASS" : "FAIL", evidence: `${array(artifact.storyEligibleClaimIds).length}/8 eligible claims` },
    );
  }
  const score = Math.round(gates.filter((gate) => gate.status === "PASS").length / Math.max(1, gates.length) * 100);
  return { gates, score, passed: gates.every((gate) => gate.status === "PASS") && score >= STAGES[stage].threshold };
}

async function digest(content: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content)));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function rows(db: RuntimeDatabase, sql: string, ...bindings: unknown[]) {
  return (await db.prepare(sql).bind(...bindings).all<Record<string, unknown>>()).results || [];
}

async function snapshot() {
  const env = await runtime(); const db = env.DB!;
  const program = await db.prepare("SELECT * FROM v7_program_contracts WHERE id=?").bind(PROGRAM_ID).first<Record<string, unknown>>();
  if (program?.production_authorized) await db.prepare("UPDATE v7_stage_states SET status='READY', blocker=null, evidence_summary='Wave 1 passed; Wave 2 intelligence authorized', updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='BLOCKED_UPSTREAM'").bind(`${PROGRAM_ID}-STAGE-01`).run();
  await db.prepare("UPDATE v7_intelligence_runs SET status='FAILED',gate_json='[{\"id\":\"RECOVERY\",\"label\":\"Execution recovery\",\"status\":\"FAIL\",\"evidence\":\"Legacy request was interrupted before a resumable background job existed\"}]',completed_at=CURRENT_TIMESTAMP WHERE program_id=? AND status='RUNNING' AND id NOT IN (SELECT run_id FROM v7_intelligence_jobs WHERE status='ACTIVE')").bind(PROGRAM_ID).run();
  await db.prepare("UPDATE v7_stage_states SET status='REPAIR_REQUIRED',blocker='Previous foreground request was interrupted; resume safely with the background runner',evidence_summary='Resumable execution is ready',updated_at=CURRENT_TIMESTAMP WHERE program_id=? AND stage_key IN ('01','02','03') AND status='RUNNING' AND NOT EXISTS (SELECT 1 FROM v7_intelligence_jobs AS job WHERE job.program_id=? AND job.stage_key=v7_stage_states.stage_key AND job.status='ACTIVE')").bind(PROGRAM_ID, PROGRAM_ID).run();
  const stages = await rows(db, "SELECT * FROM v7_stage_states WHERE program_id=? AND stage_key IN ('01','02','03') ORDER BY sequence", PROGRAM_ID);
  const runs = await rows(db, "SELECT * FROM v7_intelligence_runs WHERE program_id=? ORDER BY started_at DESC", PROGRAM_ID);
  const jobs = await rows(db, "SELECT * FROM v7_intelligence_jobs WHERE program_id=? ORDER BY started_at DESC", PROGRAM_ID);
  const artifacts = await rows(db, "SELECT id,run_id,stage_key,artifact_type,title,lifecycle_state,content_json,content_hash,runtime_key,drive_file_id,source_count,created_at FROM v7_intelligence_artifacts WHERE program_id=? ORDER BY created_at DESC", PROGRAM_ID);
  const sources = await rows(db, "SELECT * FROM v7_intelligence_sources WHERE program_id=? ORDER BY created_at DESC", PROGRAM_ID);
  const claims = await rows(db, "SELECT * FROM v7_claim_nodes WHERE program_id=? ORDER BY created_at DESC", PROGRAM_ID);
  return {
    program: { productionAuthorized: Boolean(program?.production_authorized), executionMode: program?.execution_mode, status: program?.status },
    provider: { connected: Boolean(env.OPENAI_API_KEY), model: env.OPENAI_QA_MODEL || MODEL, sourceMode: "OPENAI_WEB_SEARCH" },
    stages: stages.map((stage) => ({ id: stage.id, stageKey: stage.stage_key, stageName: stage.stage_name, status: stage.status, threshold: stage.threshold, attempt: stage.attempt, blocker: stage.blocker, evidenceSummary: stage.evidence_summary, artifactId: stage.artifact_id })),
    runs: runs.map((run) => ({ id: run.id, stageKey: run.stage_key, attempt: run.attempt, status: run.status, score: run.score, threshold: run.threshold, gates: JSON.parse(String(run.gate_json || "[]")), startedAt: run.started_at, completedAt: run.completed_at })),
    jobs: jobs.map((job) => ({ id: job.id, runId: job.run_id, stageKey: job.stage_key, status: job.status, providerStatus: job.provider_status, heartbeatAt: job.heartbeat_at, startedAt: job.started_at, finalizedAt: job.finalized_at, error: job.error })),
    artifacts: artifacts.map((artifact) => ({ id: artifact.id, runId: artifact.run_id, stageKey: artifact.stage_key, artifactType: artifact.artifact_type, title: artifact.title, lifecycleState: artifact.lifecycle_state, content: JSON.parse(String(artifact.content_json)), contentHash: artifact.content_hash, runtimeKey: artifact.runtime_key, driveFileId: artifact.drive_file_id, sourceCount: artifact.source_count, createdAt: artifact.created_at })),
    sourceCount: sources.length,
    claimCount: claims.length,
  };
}

function stagePrompt(stage: StageKey, upstream: Record<string, unknown> | null) {
  const common = `Today is ${new Date().toISOString().slice(0, 10)}. You are the research director of a maximum-quality US English faceless YouTube documentary channel called Hidden Systems Behind Money. Use web search extensively. Every URL must be a real page you found, not a search-result URL. Do not mention AI in audience-facing titles or channel positioning. Cost optimization is deferred. Do not reuse any V5/V6 artifact or wording. Return only the requested JSON.`;
  if (stage === "01") return `${common}\nBuild current market and audience intelligence for US viewers, then generate at least 12 differentiated evergreen topic candidates across at least five clusters. Evidence demand, tension, competition gaps and visual potential. Select one champion suitable for a premium 7–10 minute documentary. Use at least ten sources, at least three Tier-1 primary sources, and favor current signals without confusing popularity with opportunity.`;
  if (stage === "02") return `${common}\nUpstream market artifact: ${JSON.stringify(upstream)}\nBuild reference intelligence for the champion topic. Find at least ten real YouTube videos: at least four proven evergreen references, four recent references and two structural outliers. Analyze patterns only—never import footage, transcripts, scene order, thumbnails or distinctive wording. Extract at least six cross-reference patterns and six explicit anti-cloning controls. Source records must correspond to the referenced pages.`;
  return `${common}\nUpstream reference artifact: ${JSON.stringify(upstream)}\nBuild a primary-source-led research pack and claim graph for the champion topic. Use at least twelve sources including at least six Tier-1 primary or official sources. Create at least twelve controlled claims; every claim needs at least two source IDs and every P0 claim must be corroborated by independent sources. Resolve at least three material contradictions, record at least five uncertainties with safe language and prohibited overclaims, and mark at least eight claims story-eligible. Exclude weak or unresolved claims rather than smoothing them over.`;
}

async function upstreamArtifact(db: RuntimeDatabase, stage: StageKey) {
  if (stage === "01") return null;
  const previous = stage === "02" ? "01" : "02";
  const row = await db.prepare("SELECT content_json FROM v7_intelligence_artifacts WHERE program_id=? AND stage_key=? AND lifecycle_state='FROZEN' ORDER BY created_at DESC LIMIT 1").bind(PROGRAM_ID, previous).first<{ content_json: string }>();
  if (!row) throw new Error(`Frozen Stage ${previous} artifact is missing`);
  return JSON.parse(row.content_json) as Record<string, unknown>;
}

async function startStage(stage: StageKey) {
  const env = await runtime(); const db = env.DB!;
  const active = await db.prepare("SELECT id FROM v7_intelligence_jobs WHERE program_id=? AND stage_key=? AND status='ACTIVE' ORDER BY started_at DESC LIMIT 1").bind(PROGRAM_ID, stage).first<{ id: string }>();
  if (active) return snapshot();
  const program = await db.prepare("SELECT production_authorized FROM v7_program_contracts WHERE id=?").bind(PROGRAM_ID).first<{ production_authorized: number }>();
  if (!program?.production_authorized) throw new Error("Wave 1 foundation must pass before Wave 2 can run");
  const state = await db.prepare("SELECT status,attempt FROM v7_stage_states WHERE id=?").bind(`${PROGRAM_ID}-STAGE-${stage}`).first<{ status: string; attempt: number }>();
  if (!state || !["READY", "REPAIR_REQUIRED"].includes(state.status)) throw new Error(`${STAGES[stage].name} is not ready; complete its upstream stage first`);
  if (state.attempt >= 3) throw new Error(`${STAGES[stage].name} exhausted three automatic attempts and requires senior human review`);
  const upstream = await upstreamArtifact(db, stage);
  const provider = await startOpenAIResearch(env, `v7_intelligence_stage_${stage}`, stagePrompt(stage, upstream), stageSchemas[stage]);
  const attempt = state.attempt + 1; const runId = `${PROGRAM_ID}-INT-${stage}-${Date.now()}`; const jobId = `${runId}-JOB`; const now = new Date().toISOString();
  await db.batch([
    db.prepare("INSERT INTO v7_intelligence_runs (id,program_id,stage_key,attempt,status,score,threshold,model_id,source_mode,gate_json,started_at) VALUES (?,?,?,?, 'RUNNING',0,?,?, 'OPENAI_WEB_SEARCH','[]',?)").bind(runId, PROGRAM_ID, stage, attempt, STAGES[stage].threshold, env.OPENAI_QA_MODEL || MODEL, now),
    db.prepare("INSERT INTO v7_intelligence_jobs (id,program_id,run_id,stage_key,provider_response_id,provider_status,status,heartbeat_at,started_at) VALUES (?,?,?,?,?,?,'ACTIVE',?,?)").bind(jobId, PROGRAM_ID, runId, stage, provider.id, provider.status, now, now),
    db.prepare("UPDATE v7_stage_states SET status='RUNNING',attempt=?,blocker=null,evidence_summary='Background research accepted · polling provider status',updated_at=? WHERE id=?").bind(attempt, now, `${PROGRAM_ID}-STAGE-${stage}`),
  ]);
  return snapshot();
}

async function failJob(db: RuntimeDatabase, stage: StageKey, runId: string, jobId: string, message: string) {
  const now = new Date().toISOString();
  await db.batch([
    db.prepare("UPDATE v7_intelligence_jobs SET status='FAILED',provider_status='failed',heartbeat_at=?,finalized_at=?,error=? WHERE id=?").bind(now, now, message, jobId),
    db.prepare("UPDATE v7_intelligence_runs SET status='FAILED',gate_json=?,completed_at=? WHERE id=?").bind(JSON.stringify([{ id: "EXECUTION", label: "Execution integrity", status: "FAIL", evidence: message }]), now, runId),
    db.prepare("UPDATE v7_stage_states SET status='REPAIR_REQUIRED',blocker=?,evidence_summary='Background job stopped safely; no frozen artifact produced',updated_at=? WHERE id=?").bind(message, now, `${PROGRAM_ID}-STAGE-${stage}`),
  ]);
}

async function finalizeStage(env: RuntimeEnv, stage: StageKey, runId: string, jobId: string, payload: Record<string, unknown>) {
  const db = env.DB!; const now = new Date().toISOString();
  const artifact = JSON.parse(outputText(payload)) as Record<string, unknown>;
  const evaluation = evaluate(stage, artifact); const content = JSON.stringify({ pipelineVersion: 7, stage, generatedAt: now, artifact }, null, 2); const contentHash = await digest(content);
  const artifactId = `${runId}-ARTIFACT`; const runtimeKey = `v7/intelligence/${stage}/${artifactId}.json`;
  if (!env.BUCKET) throw new Error("Runtime object storage is unavailable");
  await env.BUCKET.put(runtimeKey, content, { httpMetadata: { contentType: "application/json" }, customMetadata: { pipelineVersion: "7", stage, contentHash } });
  if (!(await env.BUCKET.head(runtimeKey))) throw new Error("Runtime artifact read-back failed");
  const drive = await storeDriveJsonArtifact({ folderPath: ["Channels", "Hidden Systems", "Projects", "V7 Greenfield Pilot", "Intelligence"], fileName: `${stage}-${STAGES[stage].artifactType.toLowerCase()}-${runId.slice(-13)}.json`, content, artifactId, contentHash });
  const artifactState = evaluation.passed ? "FROZEN" : "REPAIR_REQUIRED";
  await db.prepare("INSERT INTO v7_intelligence_artifacts (id,program_id,run_id,stage_key,artifact_type,title,lifecycle_state,content_json,content_hash,runtime_key,drive_file_id,source_count,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .bind(artifactId, PROGRAM_ID, runId, stage, STAGES[stage].artifactType, STAGES[stage].name, artifactState, JSON.stringify(artifact), contentHash, runtimeKey, drive.id, sourcesOf(artifact).length, now, now).run();
  for (const [index, source] of sourcesOf(artifact).entries()) await db.prepare("INSERT INTO v7_intelligence_sources (id,program_id,run_id,stage_key,source_type,title,publisher,url,published_at,authority_tier,freshness_state,verification_state) VALUES (?,?,?,?,?,?,?,?,?,?,?,'WEB_GROUNDED')")
    .bind(`${runId}-SRC-${String(index + 1).padStart(2, "0")}`, PROGRAM_ID, runId, stage, source.sourceType, source.title, source.publisher, source.url, source.publishedAt || null, source.authorityTier, source.freshnessState).run();
  if (stage === "03") for (const claim of array(artifact.claims) as Array<{ id: string; text: string; claimClass: string; riskLevel: string; sourceIds: string[]; counterEvidence: string; qualification: string }>) await db.prepare("INSERT INTO v7_claim_nodes (id,program_id,run_id,claim_text,claim_class,risk_level,status,source_ids_json,counter_evidence,qualification) VALUES (?,?,?,?,?,?,'CONTROLLED',?,?,?)")
    .bind(`${runId}-${claim.id}`, PROGRAM_ID, runId, claim.text, claim.claimClass, claim.riskLevel, JSON.stringify(claim.sourceIds), claim.counterEvidence, claim.qualification).run();
  const upstreamEvidence = stage === "01" ? `${PROGRAM_ID}-EVIDENCE-PROGRAM` : await db.prepare("SELECT id FROM v7_evidence_lineage WHERE program_id=? AND entity_type=? AND lifecycle_state='FROZEN' ORDER BY updated_at DESC LIMIT 1").bind(PROGRAM_ID, STAGES[stage === "02" ? "01" : "02"].artifactType).first<{ id: string }>();
  await db.batch([
    db.prepare("UPDATE v7_intelligence_runs SET status=?,score=?,gate_json=?,completed_at=? WHERE id=?").bind(evaluation.passed ? "PASS" : "REPAIR_REQUIRED", evaluation.score, JSON.stringify(evaluation.gates), now, runId),
    db.prepare("UPDATE v7_intelligence_jobs SET status='COMPLETED',provider_status='completed',heartbeat_at=?,finalized_at=?,error=null WHERE id=?").bind(now, now, jobId),
    db.prepare("UPDATE v7_stage_states SET status=?,artifact_id=?,blocker=?,evidence_summary=?,frozen_at=?,updated_at=? WHERE id=?").bind(evaluation.passed ? "FROZEN" : "REPAIR_REQUIRED", artifactId, evaluation.passed ? null : "One or more intelligence hard gates failed", `${evaluation.score}/100 · ${sourcesOf(artifact).length} web-grounded sources · R2 and Google Drive verified`, evaluation.passed ? now : null, now, `${PROGRAM_ID}-STAGE-${stage}`),
    db.prepare("INSERT INTO v7_evidence_lineage (id,program_id,entity_type,title,lifecycle_state,upstream_evidence_id,artifact_key,content_hash,storage_state,rights_state,cost_state,quarantine_state,pipeline_version,updated_at) VALUES (?,?,?,?,?,?,?,?, 'R2_AND_DRIVE_VERIFIED','RESEARCH_USE','MEASURED','CLEAR',7,?)").bind(`${artifactId}-EVIDENCE`, PROGRAM_ID, STAGES[stage].artifactType, STAGES[stage].name, artifactState, typeof upstreamEvidence === "string" ? upstreamEvidence : upstreamEvidence?.id || `${PROGRAM_ID}-EVIDENCE-PROGRAM`, runtimeKey, contentHash, now),
  ]);
  await recordOpenAIUsage({ db, programId: PROGRAM_ID, runId, stageKey: stage, costType: "WEB_GROUNDED_INTELLIGENCE", payload, fallbackModel: MODEL });
  if (evaluation.passed) {
    const next = stage === "01" ? "02" : stage === "02" ? "03" : "04";
    await db.prepare("UPDATE v7_stage_states SET status='READY',blocker=null,evidence_summary=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='BLOCKED_UPSTREAM'").bind(`Stage ${stage} frozen; upstream evidence accepted`, `${PROGRAM_ID}-STAGE-${next}`).run();
    if (stage === "03") await db.prepare("UPDATE v7_program_contracts SET status='WAVE_2_FROZEN',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(PROGRAM_ID).run();
  }
}

async function pollStage(stage: StageKey) {
  const env = await runtime(); const db = env.DB!;
  const job = await db.prepare("SELECT id,run_id,provider_response_id FROM v7_intelligence_jobs WHERE program_id=? AND stage_key=? AND status='ACTIVE' ORDER BY started_at DESC LIMIT 1").bind(PROGRAM_ID, stage).first<{ id: string; run_id: string; provider_response_id: string }>();
  if (!job) return snapshot();
  let payload: Record<string, unknown>;
  try {
    payload = await retrieveOpenAIResearch(env, job.provider_response_id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provider status is temporarily unavailable";
    await db.prepare("UPDATE v7_intelligence_jobs SET heartbeat_at=?,error=? WHERE id=?").bind(new Date().toISOString(), message, job.id).run();
    throw new Error(`${message}. The background job remains active and can be resumed.`);
  }
  try {
    const providerStatus = String(payload.status || "unknown"); const now = new Date().toISOString();
    await db.prepare("UPDATE v7_intelligence_jobs SET provider_status=?,heartbeat_at=? WHERE id=?").bind(providerStatus, now, job.id).run();
    await db.prepare("UPDATE v7_stage_states SET evidence_summary=?,updated_at=? WHERE id=?").bind(`Background research · ${providerStatus.replaceAll("_", " ")} · heartbeat ${now.slice(11, 19)} UTC`, now, `${PROGRAM_ID}-STAGE-${stage}`).run();
    if (["queued", "in_progress"].includes(providerStatus)) return snapshot();
    if (providerStatus !== "completed") {
      const detail = payload.error && typeof payload.error === "object" ? JSON.stringify(payload.error) : `Provider ended with status ${providerStatus}`;
      await recordOpenAIUsage({ db, programId: PROGRAM_ID, runId: job.run_id, stageKey: stage, costType: "WEB_GROUNDED_INTELLIGENCE", payload, fallbackModel: MODEL });
      await failJob(db, stage, job.run_id, job.id, detail); return snapshot();
    }
    await finalizeStage(env, stage, job.run_id, job.id, payload); return snapshot();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Wave 2 artifact finalization failed";
    await failJob(db, stage, job.run_id, job.id, message); throw error;
  }
}

export async function GET() {
  try { return Response.json(await snapshot()); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Wave 2 intelligence could not load" }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: string; stage?: string };
    if (!body.stage || !(body.stage in STAGES)) return Response.json({ error: "Unsupported Wave 2 stage" }, { status: 400 });
    if (body.action === "RUN_STAGE") return Response.json(await startStage(body.stage as StageKey), { status: 202 });
    if (body.action === "POLL_STAGE") return Response.json(await pollStage(body.stage as StageKey));
    return Response.json({ error: "Unsupported Wave 2 action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Wave 2 intelligence failed";
    return Response.json({ error: message }, { status: message.includes("not ready") || message.includes("must pass") ? 409 : 500 });
  }
}
