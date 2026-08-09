import { storeDriveJsonArtifact } from "../../../../lib/google-drive";
import { AI_USAGE_TABLE_SQL, recordOpenAIUsage } from "../../../../lib/ai-usage";

const PROGRAM_ID = "YTAF-V7-GREENFIELD";
const STAGE = "04";
const THRESHOLD = 90;
const MODEL = "gpt-5.6";

type Statement = { bind: (...values: unknown[]) => Statement; run: () => Promise<unknown>; all: <T>() => Promise<{ results?: T[] }>; first: <T>() => Promise<T | null> };
type Database = { prepare: (sql: string) => Statement; batch: (statements: Statement[]) => Promise<unknown> };
type Bucket = { put: (key: string, value: string, options?: Record<string, unknown>) => Promise<unknown>; head: (key: string) => Promise<unknown> };
type Runtime = { DB?: Database; BUCKET?: Bucket; OPENAI_API_KEY?: string; OPENAI_QA_MODEL?: string };
type Gate = { id: string; label: string; status: "PASS" | "FAIL"; evidence: string };

const tables = [
  AI_USAGE_TABLE_SQL,
  `CREATE TABLE IF NOT EXISTS v7_creative_runs (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, attempt integer DEFAULT 1 NOT NULL, status text DEFAULT 'RUNNING' NOT NULL, score integer DEFAULT 0 NOT NULL, threshold integer DEFAULT 90 NOT NULL, model_id text NOT NULL, gate_json text DEFAULT '[]' NOT NULL, started_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, completed_at text)`,
  `CREATE TABLE IF NOT EXISTS v7_creative_jobs (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, run_id text NOT NULL, provider_response_id text NOT NULL, provider_status text DEFAULT 'queued' NOT NULL, status text DEFAULT 'ACTIVE' NOT NULL, heartbeat_at text NOT NULL, started_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, finalized_at text, error text)`,
  `CREATE TABLE IF NOT EXISTS v7_creative_artifacts (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, run_id text NOT NULL, lifecycle_state text DEFAULT 'MATERIALIZED' NOT NULL, content_json text NOT NULL, content_hash text NOT NULL, runtime_key text, drive_file_id text, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
] as const;

async function runtime() {
  const { env } = await import("cloudflare:workers");
  const value = env as unknown as Runtime;
  if (!value.DB) throw new Error("Creative Contract database is unavailable");
  await value.DB.batch(tables.map((sql) => value.DB!.prepare(sql)));
  return value;
}

const scoreFields = {
  promise: { type: "integer", minimum: 0, maximum: 100 }, originality: { type: "integer", minimum: 0, maximum: 100 },
  evidenceFit: { type: "integer", minimum: 0, maximum: 100 }, retentionPotential: { type: "integer", minimum: 0, maximum: 100 },
  visualPotential: { type: "integer", minimum: 0, maximum: 100 }, soundPotential: { type: "integer", minimum: 0, maximum: 100 },
};

const creativeSchema = {
  type: "object", additionalProperties: false,
  properties: {
    publicWorkingTitle: { type: "string" }, primaryViewer: { type: "string" }, transformation: { type: "string" }, centralQuestion: { type: "string" },
    candidates: { type: "array", minItems: 4, maxItems: 4, items: { type: "object", additionalProperties: false, properties: {
      id: { type: "string" }, name: { type: "string" }, oneSentencePromise: { type: "string" }, thesis: { type: "string" }, storyEngine: { type: "string" }, emotionalArc: { type: "string" },
      stakes: { type: "string" }, payoff: { type: "string" }, visualEngine: { type: "string" }, soundEngine: { type: "string" }, differentiation: { type: "string" },
      claimIds: { type: "array", minItems: 8, items: { type: "string" } }, scores: { type: "object", additionalProperties: false, properties: scoreFields, required: Object.keys(scoreFields) }, totalScore: { type: "integer", minimum: 0, maximum: 100 },
    }, required: ["id","name","oneSentencePromise","thesis","storyEngine","emotionalArc","stakes","payoff","visualEngine","soundEngine","differentiation","claimIds","scores","totalScore"] } },
    championId: { type: "string" }, championRationale: { type: "string" },
    contract: { type: "object", additionalProperties: false, properties: {
      audiencePromise: { type: "string" }, thesis: { type: "string" }, storyEngine: { type: "string" }, emotionalArc: { type: "string" }, stakes: { type: "string" }, payoff: { type: "string" },
      runtimeTargetSeconds: { type: "integer", minimum: 420, maximum: 600 }, spokenWordRange: { type: "string" }, hookContract: { type: "string" }, midpointContract: { type: "string" }, endingContract: { type: "string" },
      visualEngine: { type: "string" }, visualFamilies: { type: "array", minItems: 6, items: { type: "string" } }, visualProhibitions: { type: "array", minItems: 6, items: { type: "string" } },
      soundEngine: { type: "string" }, soundMotifs: { type: "array", minItems: 5, items: { type: "string" } }, soundProhibitions: { type: "array", minItems: 4, items: { type: "string" } },
      evidenceClaimIds: { type: "array", minItems: 8, items: { type: "string" } }, originalityControls: { type: "array", minItems: 6, items: { type: "string" } }, exclusions: { type: "array", minItems: 6, items: { type: "string" } }, acceptanceTests: { type: "array", minItems: 10, items: { type: "string" } },
    }, required: ["audiencePromise","thesis","storyEngine","emotionalArc","stakes","payoff","runtimeTargetSeconds","spokenWordRange","hookContract","midpointContract","endingContract","visualEngine","visualFamilies","visualProhibitions","soundEngine","soundMotifs","soundProhibitions","evidenceClaimIds","originalityControls","exclusions","acceptanceTests"] },
    critics: { type: "array", minItems: 7, items: { type: "object", additionalProperties: false, properties: { role: { type: "string" }, score: { type: "integer", minimum: 0, maximum: 100 }, verdict: { type: "string" }, strongestRisk: { type: "string" }, requiredControl: { type: "string" } }, required: ["role","score","verdict","strongestRisk","requiredControl"] } },
    adversarialRisks: { type: "array", minItems: 6, items: { type: "object", additionalProperties: false, properties: { risk: { type: "string" }, severity: { type: "string", enum: ["P0","P1","P2"] }, resolution: { type: "string" }, acceptanceTest: { type: "string" }, status: { type: "string", enum: ["RESOLVED","OPEN"] } }, required: ["risk","severity","resolution","acceptanceTest","status"] } },
  }, required: ["publicWorkingTitle","primaryViewer","transformation","centralQuestion","candidates","championId","championRationale","contract","critics","adversarialRisks"],
};

function arr(value: unknown) { return Array.isArray(value) ? value : []; }
function record(value: unknown) { return value && typeof value === "object" ? value as Record<string, unknown> : {}; }
const scoreKeys = Object.keys(scoreFields);
function clampScore(value: unknown) { return Math.max(0, Math.min(100, Math.round(Number(value) || 0))); }
function usesTenPointScale(artifact: Record<string, unknown>) {
  const values = arr(artifact.candidates).flatMap((candidate) => scoreKeys.map((key) => Number(record(record(candidate).scores)[key] || 0)));
  return values.length > 0 && values.every((value) => Number.isFinite(value) && value >= 0 && value <= 10);
}
function normalizeCandidateScores(artifact: Record<string, unknown>) {
  const tenPointScale = usesTenPointScale(artifact);
  return { ...artifact, candidates: arr(artifact.candidates).map((value) => {
    const candidate = record(value); const rawScores = record(candidate.scores);
    const scores = Object.fromEntries(scoreKeys.map((key) => [key, clampScore(Number(rawScores[key] || 0) * (tenPointScale ? 10 : 1))]));
    const totalScore = Math.round(scoreKeys.reduce((sum, key) => sum + Number(scores[key]), 0) / scoreKeys.length);
    return { ...candidate, scores, totalScore };
  }) };
}
function textOutput(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string") return payload.output_text;
  for (const item of arr(payload.output)) for (const block of arr(record(item).content)) if (typeof record(block).text === "string") return String(record(block).text);
  throw new Error("OpenAI returned no structured Creative Contract");
}

async function startProvider(env: Runtime, prompt: string) {
  if (!env.OPENAI_API_KEY) throw new Error("Connect OPENAI_API_KEY before running Stage 04");
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({
    model: env.OPENAI_QA_MODEL || MODEL, reasoning: { effort: "high" }, background: true, store: true,
    input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }], text: { format: { type: "json_schema", name: "v7_creative_contract", strict: true, schema: creativeSchema } },
  }), signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`OpenAI Creative Contract failed (${response.status}) · ${(await response.text()).replace(/\s+/g," ").slice(0,400)}`);
  const payload = await response.json() as Record<string, unknown>;
  if (typeof payload.id !== "string") throw new Error("OpenAI did not return a background response ID");
  return { id: payload.id, status: String(payload.status || "queued") };
}

async function retrieveProvider(env: Runtime, id: string) {
  if (!env.OPENAI_API_KEY) throw new Error("Connect OPENAI_API_KEY before resuming Stage 04");
  const response = await fetch(`https://api.openai.com/v1/responses/${encodeURIComponent(id)}`, { headers: { authorization: `Bearer ${env.OPENAI_API_KEY}` }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`OpenAI Creative status failed (${response.status}) · ${(await response.text()).replace(/\s+/g," ").slice(0,400)}`);
  return response.json() as Promise<Record<string, unknown>>;
}

async function rows(db: Database, sql: string, ...bindings: unknown[]) { return (await db.prepare(sql).bind(...bindings).all<Record<string, unknown>>()).results || []; }
async function digest(content: string) { const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content))); return [...bytes].map((b) => b.toString(16).padStart(2,"0")).join(""); }

function evaluate(artifact: Record<string, unknown>) {
  const candidates = arr(artifact.candidates).map(record); const contract = record(artifact.contract); const critics = arr(artifact.critics).map(record); const risks = arr(artifact.adversarialRisks).map(record);
  const champion = candidates.find((candidate) => candidate.id === artifact.championId); const criticFloor = critics.length ? Math.min(...critics.map((critic) => Number(critic.score || 0))) : 0;
  const candidateFloor = candidates.length ? Math.min(...candidates.map((candidate) => Number(candidate.totalScore || 0))) : 0;
  const winnerScore = candidates.length ? Math.max(...candidates.map((candidate) => Number(candidate.totalScore || 0))) : 0;
  const gates: Gate[] = [
    { id:"TOURNAMENT",label:"Four differentiated creative routes",status:candidates.length===4&&new Set(candidates.map((c)=>String(c.name))).size===4?"PASS":"FAIL",evidence:`${candidates.length}/4 candidates · ${new Set(candidates.map((c)=>String(c.name))).size} unique` },
    { id:"CHAMPION",label:"Champion is tournament winner",status:Boolean(champion)&&Number(champion?.totalScore||0)===winnerScore&&winnerScore>=90?"PASS":"FAIL",evidence:`${String(champion?.name||"missing")} · ${Number(champion?.totalScore||0)}/100 · winner floor ≥90` },
    { id:"AUDIENCE",label:"Audience transformation contract",status:String(artifact.primaryViewer||"").length>=30&&String(artifact.transformation||"").length>=40&&String(contract.audiencePromise||"").length>=35?"PASS":"FAIL",evidence:"Viewer, before/after transformation and promise are explicit" },
    { id:"EVIDENCE",label:"Controlled evidence utilization",status:arr(contract.evidenceClaimIds).length>=8?"PASS":"FAIL",evidence:`${arr(contract.evidenceClaimIds).length}/8 claim IDs bound` },
    { id:"RUNTIME",label:"Exact runtime and narrative milestones",status:Number(contract.runtimeTargetSeconds)>=420&&Number(contract.runtimeTargetSeconds)<=600&&["hookContract","midpointContract","endingContract"].every((k)=>String(contract[k]||"").length>=25)?"PASS":"FAIL",evidence:`${contract.runtimeTargetSeconds||0}s target with hook, midpoint and ending` },
    { id:"VISUAL",label:"Ownable visual system",status:arr(contract.visualFamilies).length>=6&&arr(contract.visualProhibitions).length>=6?"PASS":"FAIL",evidence:`${arr(contract.visualFamilies).length} families · ${arr(contract.visualProhibitions).length} anti-template controls` },
    { id:"SOUND",label:"Narrative sound system",status:arr(contract.soundMotifs).length>=5&&arr(contract.soundProhibitions).length>=4?"PASS":"FAIL",evidence:`${arr(contract.soundMotifs).length} motifs · ${arr(contract.soundProhibitions).length} prohibitions` },
    { id:"ORIGINALITY",label:"Originality firewall",status:arr(contract.originalityControls).length>=6?"PASS":"FAIL",evidence:`${arr(contract.originalityControls).length}/6 controls` },
    { id:"CRITICS",label:"Seven independent critics",status:critics.length>=7&&criticFloor>=90?"PASS":"FAIL",evidence:`${critics.length}/7 critics · ${criticFloor}/90 floor` },
    { id:"ADVERSARIAL",label:"Resolved adversarial review",status:risks.length>=6&&risks.every((risk)=>risk.status==="RESOLVED")?"PASS":"FAIL",evidence:`${risks.filter((risk)=>risk.status==="RESOLVED").length}/${risks.length} resolved` },
    { id:"ACCEPTANCE",label:"Downstream acceptance contract",status:arr(contract.acceptanceTests).length>=10?"PASS":"FAIL",evidence:`${arr(contract.acceptanceTests).length}/10 executable tests` },
    { id:"PUBLIC_COPY",label:"Audience-facing brand policy",status:!(/\bAI\b/i.test(String(artifact.publicWorkingTitle||"")))?"PASS":"FAIL",evidence:"No AI reference in public working title" },
  ];
  const score = Math.round(gates.filter((g)=>g.status==="PASS").length/gates.length*100);
  return { gates, score, candidateFloor, criticFloor, passed: gates.every((g)=>g.status==="PASS")&&score>=THRESHOLD };
}

async function upstream(db: Database) {
  const stageRows = await rows(db,"SELECT stage_key,status,artifact_id FROM v7_stage_states WHERE program_id=? AND stage_key IN ('01','02','03','04') ORDER BY sequence",PROGRAM_ID);
  if (["01","02","03"].some((key)=>stageRows.find((row)=>row.stage_key===key)?.status!=="FROZEN")) throw new Error("Stages 01–03 must be frozen before Creative Contract can run");
  const artifacts = await rows(db,"SELECT stage_key,content_json,content_hash,id FROM v7_intelligence_artifacts WHERE program_id=? AND lifecycle_state='FROZEN' AND stage_key IN ('01','02','03') ORDER BY created_at DESC",PROGRAM_ID);
  const latest = Object.fromEntries(["01","02","03"].map((key)=>[key,artifacts.find((row)=>row.stage_key===key)]));
  if (!latest["01"]||!latest["02"]||!latest["03"]) throw new Error("Frozen Wave 2 evidence is incomplete");
  return { stages: stageRows, market: JSON.parse(String(latest["01"].content_json)), references: JSON.parse(String(latest["02"].content_json)), research: JSON.parse(String(latest["03"].content_json)), upstreamEvidenceId: `${latest["03"].id}-EVIDENCE` };
}

async function snapshot() {
  const env=await runtime(); const db=env.DB!; const up=await upstream(db).catch(()=>null);
  const stage=await db.prepare("SELECT * FROM v7_stage_states WHERE id=?").bind(`${PROGRAM_ID}-STAGE-${STAGE}`).first<Record<string,unknown>>();
  const runs=await rows(db,"SELECT * FROM v7_creative_runs WHERE program_id=? ORDER BY started_at DESC",PROGRAM_ID); const jobs=await rows(db,"SELECT * FROM v7_creative_jobs WHERE program_id=? ORDER BY started_at DESC",PROGRAM_ID); const artifacts=await rows(db,"SELECT * FROM v7_creative_artifacts WHERE program_id=? ORDER BY created_at DESC",PROGRAM_ID);
  return { provider:{connected:Boolean(env.OPENAI_API_KEY),model:env.OPENAI_QA_MODEL||MODEL},upstreamReady:Boolean(up),stage:{stageKey:STAGE,stageName:stage?.stage_name||"Creative Contract",status:stage?.status||"BLOCKED_UPSTREAM",threshold:Number(stage?.threshold||THRESHOLD),attempt:Number(stage?.attempt||0),blocker:stage?.blocker||null,evidenceSummary:stage?.evidence_summary||""},runs:runs.map((r)=>({id:r.id,status:r.status,score:Number(r.score),attempt:Number(r.attempt),threshold:Number(r.threshold),gates:JSON.parse(String(r.gate_json||"[]")),startedAt:r.started_at,completedAt:r.completed_at})),jobs:jobs.map((j)=>({id:j.id,runId:j.run_id,status:j.status,providerStatus:j.provider_status,startedAt:j.started_at,heartbeatAt:j.heartbeat_at,error:j.error})),artifacts:artifacts.map((a)=>({id:a.id,lifecycleState:a.lifecycle_state,content:JSON.parse(String(a.content_json)),contentHash:a.content_hash,runtimeKey:a.runtime_key,driveFileId:a.drive_file_id,createdAt:a.created_at})) };
}

async function start() {
  const env=await runtime(); const db=env.DB!; const up=await upstream(db);
  const active=await db.prepare("SELECT id FROM v7_creative_jobs WHERE program_id=? AND status='ACTIVE' LIMIT 1").bind(PROGRAM_ID).first(); if(active)return snapshot();
  const stage=await db.prepare("SELECT status,attempt FROM v7_stage_states WHERE id=?").bind(`${PROGRAM_ID}-STAGE-${STAGE}`).first<{status:string;attempt:number}>();
  if(!stage||!["READY","REPAIR_REQUIRED"].includes(stage.status)) throw new Error("Creative Contract is not ready"); if(stage.attempt>=3) throw new Error("Stage 04 exhausted three automatic attempts and requires senior review");
  const prompt=`You are a seven-member senior creative board for a maximum-quality US-English faceless documentary channel, Hidden Systems Behind Money. Cost optimization is deferred. Use only the frozen evidence supplied below; do not add new factual claims. Generate exactly four materially different creative routes, score them independently, select one champion, then write a production-binding Creative Contract. SCORE CONTRACT: every one of the six candidate score fields is an integer on a 0–100 scale, never a 0–10 scale; totalScore is the rounded arithmetic mean of those six fields, never their sum; championId must identify the candidate with the highest totalScore and that winner must score at least 90. The public title must never mention AI. The contract must prevent the prior failure modes: generic repeated diagrams, stock selected by broad keywords, decorative visuals, missing music/ambience/SFX, weak mobile legibility, and unsupported claims. Visual families must assign different meaning-bearing grammars such as cinematic macro reality, living process maps, numerical charts, annotated documents, comic/doodle counterfactuals, timelines, maps, UI abstractions and economic waterfalls—not mere color swaps. Sound motifs must specify narrative function, not just mood. Every risk must be resolved with an executable acceptance test. Return only JSON.\n\nMARKET:\n${JSON.stringify(up.market)}\n\nREFERENCE PATTERNS (learn structure, never clone):\n${JSON.stringify(up.references)}\n\nCONTROLLED CLAIM GRAPH:\n${JSON.stringify(up.research)}`;
  const provider=await startProvider(env,prompt); const attempt=stage.attempt+1; const runId=`${PROGRAM_ID}-CREATIVE-${Date.now()}`; const jobId=`${runId}-JOB`; const now=new Date().toISOString();
  await db.batch([db.prepare("INSERT INTO v7_creative_runs (id,program_id,attempt,status,score,threshold,model_id,gate_json,started_at) VALUES (?, ?, ?, 'RUNNING',0,?,?,'[]',?)").bind(runId,PROGRAM_ID,attempt,THRESHOLD,env.OPENAI_QA_MODEL||MODEL,now),db.prepare("INSERT INTO v7_creative_jobs (id,program_id,run_id,provider_response_id,provider_status,status,heartbeat_at,started_at) VALUES (?,?,?,?,?,'ACTIVE',?,?)").bind(jobId,PROGRAM_ID,runId,provider.id,provider.status,now,now),db.prepare("UPDATE v7_stage_states SET status='RUNNING',attempt=?,blocker=null,evidence_summary='Creative tournament accepted · background adjudication active',updated_at=? WHERE id=?").bind(attempt,now,`${PROGRAM_ID}-STAGE-${STAGE}`)]);
  return snapshot();
}

async function fail(db:Database,runId:string,jobId:string,message:string){const now=new Date().toISOString();await db.batch([db.prepare("UPDATE v7_creative_jobs SET status='FAILED',provider_status='failed',heartbeat_at=?,finalized_at=?,error=? WHERE id=?").bind(now,now,message,jobId),db.prepare("UPDATE v7_creative_runs SET status='FAILED',gate_json=?,completed_at=? WHERE id=?").bind(JSON.stringify([{id:"EXECUTION",label:"Execution integrity",status:"FAIL",evidence:message}]),now,runId),db.prepare("UPDATE v7_stage_states SET status='REPAIR_REQUIRED',blocker=?,evidence_summary='No Creative Contract frozen',updated_at=? WHERE id=?").bind(message,now,`${PROGRAM_ID}-STAGE-${STAGE}`)]);}

async function finalize(env:Runtime,runId:string,jobId:string,payload:Record<string,unknown>){const db=env.DB!;const now=new Date().toISOString();const artifact=normalizeCandidateScores(JSON.parse(textOutput(payload)) as Record<string,unknown>);const review=evaluate(artifact);const envelope=JSON.stringify({pipelineVersion:7,stage:STAGE,generatedAt:now,artifact},null,2);const hash=await digest(envelope);const artifactId=`${runId}-ARTIFACT`;const runtimeKey=`v7/creative/${artifactId}.json`;if(!env.BUCKET)throw new Error("Runtime object storage is unavailable");await env.BUCKET.put(runtimeKey,envelope,{httpMetadata:{contentType:"application/json"},customMetadata:{pipelineVersion:"7",stage:STAGE,contentHash:hash}});if(!(await env.BUCKET.head(runtimeKey)))throw new Error("Creative artifact read-back failed");const drive=await storeDriveJsonArtifact({folderPath:["Channels","Hidden Systems","Projects","V7 Greenfield Pilot","Creative"],fileName:`04-creative-contract-${runId.slice(-13)}.json`,content:envelope,artifactId,contentHash:hash});const state=review.passed?"FROZEN":"REPAIR_REQUIRED";const up=await upstream(db);
  await db.batch([db.prepare("INSERT INTO v7_creative_artifacts (id,program_id,run_id,lifecycle_state,content_json,content_hash,runtime_key,drive_file_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(artifactId,PROGRAM_ID,runId,state,JSON.stringify(artifact),hash,runtimeKey,drive.id,now,now),db.prepare("UPDATE v7_creative_runs SET status=?,score=?,gate_json=?,completed_at=? WHERE id=?").bind(review.passed?"PASS":"REPAIR_REQUIRED",review.score,JSON.stringify(review.gates),now,runId),db.prepare("UPDATE v7_creative_jobs SET status='COMPLETED',provider_status='completed',heartbeat_at=?,finalized_at=?,error=null WHERE id=?").bind(now,now,jobId),db.prepare("UPDATE v7_stage_states SET status=?,artifact_id=?,blocker=?,evidence_summary=?,frozen_at=?,updated_at=? WHERE id=?").bind(state,artifactId,review.passed?null:"One or more Creative Contract hard gates failed",`${review.score}/100 · candidate floor ${review.candidateFloor} · critic floor ${review.criticFloor} · R2 and Drive verified`,review.passed?now:null,now,`${PROGRAM_ID}-STAGE-${STAGE}`),db.prepare("INSERT INTO v7_evidence_lineage (id,program_id,entity_type,title,lifecycle_state,upstream_evidence_id,artifact_key,content_hash,storage_state,rights_state,cost_state,quarantine_state,pipeline_version,updated_at) VALUES (?,?,?,?,?,?,?,?, 'R2_AND_DRIVE_VERIFIED','INTERNAL_ORIGINAL','MEASURED','CLEAR',7,?)").bind(`${artifactId}-EVIDENCE`,PROGRAM_ID,"CREATIVE_CONTRACT","Stage 04 Creative Contract",state,up.upstreamEvidenceId,runtimeKey,hash,now)]);
  await recordOpenAIUsage({db,programId:PROGRAM_ID,runId,stageKey:STAGE,costType:"CREATIVE_TOURNAMENT",payload,fallbackModel:MODEL});
  if(review.passed){await db.batch([db.prepare("UPDATE v7_stage_states SET status='READY',blocker=null,evidence_summary='Stage 04 frozen; Creative Contract accepted',updated_at=? WHERE id=? AND status='BLOCKED_UPSTREAM'").bind(now,`${PROGRAM_ID}-STAGE-05`),db.prepare("UPDATE v7_program_contracts SET status='STAGE_04_FROZEN',updated_at=? WHERE id=?").bind(now,PROGRAM_ID)]);}
}

async function repairScoringContract(){
  const env=await runtime(); const db=env.DB!; const now=new Date().toISOString();
  const row=await db.prepare("SELECT * FROM v7_creative_artifacts WHERE program_id=? AND lifecycle_state='REPAIR_REQUIRED' ORDER BY created_at DESC LIMIT 1").bind(PROGRAM_ID).first<Record<string,unknown>>();
  if(!row)throw new Error("No repairable Creative Contract was found");
  const prior=JSON.parse(String(row.content_json)) as Record<string,unknown>;
  if(!usesTenPointScale(prior))throw new Error("The latest Creative Contract does not have the known 0–10 scoring-scale defect");
  const artifact=normalizeCandidateScores(prior); const review=evaluate(artifact);
  if(!review.passed)throw new Error("Deterministic scoring repair completed, but another hard gate still blocks Stage 04");
  const envelope=JSON.stringify({pipelineVersion:7,stage:STAGE,generatedAt:now,repair:"DETERMINISTIC_SCORE_NORMALIZATION",supersedesHash:String(row.content_hash),artifact},null,2);
  const hash=await digest(envelope); const runtimeKey=String(row.runtime_key); const artifactId=String(row.id); const runId=String(row.run_id);
  if(!env.BUCKET)throw new Error("Runtime object storage is unavailable");
  await env.BUCKET.put(runtimeKey,envelope,{httpMetadata:{contentType:"application/json"},customMetadata:{pipelineVersion:"7",stage:STAGE,contentHash:hash,repair:"score-normalization"}});
  if(!(await env.BUCKET.head(runtimeKey)))throw new Error("Repaired Creative artifact read-back failed");
  const drive=await storeDriveJsonArtifact({folderPath:["Channels","Hidden Systems","Projects","V7 Greenfield Pilot","Creative"],fileName:`04-creative-contract-scoring-repair-${runId.slice(-13)}.json`,content:envelope,artifactId,contentHash:hash});
  await db.batch([
    db.prepare("UPDATE v7_creative_artifacts SET lifecycle_state='FROZEN',content_json=?,content_hash=?,drive_file_id=?,updated_at=? WHERE id=?").bind(JSON.stringify(artifact),hash,drive.id,now,artifactId),
    db.prepare("UPDATE v7_creative_runs SET status='PASS',score=?,gate_json=?,completed_at=? WHERE id=?").bind(review.score,JSON.stringify(review.gates),now,runId),
    db.prepare("UPDATE v7_stage_states SET status='FROZEN',artifact_id=?,blocker=null,evidence_summary=?,frozen_at=?,updated_at=? WHERE id=?").bind(artifactId,`${review.score}/100 · deterministic 0–100 scoring repair · candidate floor ${review.candidateFloor} · critic floor ${review.criticFloor} · R2 and Drive verified`,now,now,`${PROGRAM_ID}-STAGE-${STAGE}`),
    db.prepare("UPDATE v7_evidence_lineage SET lifecycle_state='FROZEN',content_hash=?,storage_state='R2_AND_DRIVE_VERIFIED',updated_at=? WHERE id=?").bind(hash,now,`${artifactId}-EVIDENCE`),
    db.prepare("UPDATE v7_stage_states SET status='READY',blocker=null,evidence_summary='Stage 04 frozen; Creative Contract accepted',updated_at=? WHERE id=? AND status='BLOCKED_UPSTREAM'").bind(now,`${PROGRAM_ID}-STAGE-05`),
    db.prepare("UPDATE v7_program_contracts SET status='STAGE_04_FROZEN',updated_at=? WHERE id=?").bind(now,PROGRAM_ID),
  ]);
  return snapshot();
}

async function poll(){const env=await runtime();const db=env.DB!;const job=await db.prepare("SELECT id,run_id,provider_response_id FROM v7_creative_jobs WHERE program_id=? AND status='ACTIVE' ORDER BY started_at DESC LIMIT 1").bind(PROGRAM_ID).first<{id:string;run_id:string;provider_response_id:string}>();if(!job)return snapshot();let payload:Record<string,unknown>;try{payload=await retrieveProvider(env,job.provider_response_id);}catch(error){const message=error instanceof Error?error.message:"Provider status unavailable";await db.prepare("UPDATE v7_creative_jobs SET heartbeat_at=?,error=? WHERE id=?").bind(new Date().toISOString(),message,job.id).run();throw new Error(`${message}. The job remains resumable.`);}try{const status=String(payload.status||"unknown");const now=new Date().toISOString();await db.batch([db.prepare("UPDATE v7_creative_jobs SET provider_status=?,heartbeat_at=? WHERE id=?").bind(status,now,job.id),db.prepare("UPDATE v7_stage_states SET evidence_summary=?,updated_at=? WHERE id=?").bind(`Creative board · ${status.replaceAll("_"," ")} · heartbeat ${now.slice(11,19)} UTC`,now,`${PROGRAM_ID}-STAGE-${STAGE}`)]);if(["queued","in_progress"].includes(status))return await snapshot();if(status!=="completed"){await recordOpenAIUsage({db,programId:PROGRAM_ID,runId:job.run_id,stageKey:STAGE,costType:"CREATIVE_TOURNAMENT",payload,fallbackModel:MODEL});await fail(db,job.run_id,job.id,`Provider ended with status ${status}`);return await snapshot();}await finalize(env,job.run_id,job.id,payload);return await snapshot();}catch(error){const message=error instanceof Error?error.message:"Creative Contract finalization failed";await fail(db,job.run_id,job.id,message);throw error;}}

export async function GET(){try{return Response.json(await snapshot());}catch(error){return Response.json({error:error instanceof Error?error.message:"Creative Contract could not load"},{status:500});}}
export async function POST(request:Request){try{const body=await request.json() as {action?:string};if(body.action==="RUN")return Response.json(await start(),{status:202});if(body.action==="POLL")return Response.json(await poll());if(body.action==="REPAIR_SCORING")return Response.json(await repairScoringContract());return Response.json({error:"Unsupported Creative Contract action"},{status:400});}catch(error){const message=error instanceof Error?error.message:"Creative Contract failed";return Response.json({error:message},{status:message.includes("not ready")||message.includes("must be frozen")||message.includes("repairable")?409:500});}}
