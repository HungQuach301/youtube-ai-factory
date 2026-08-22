import { getChatGPTUser } from "@/app/chatgpt-auth";
import { canonicalHash } from "@/lib/canonical-json";
import {
  evaluateFactoryBrowserQaEvidence,
  FACTORY_BROWSER_QA_POLICY_VERSION,
  isOwnerObservableDefect,
  type FactoryBrowserQaEvidence,
} from "@/lib/evaluation-foundation";

export const dynamic = "force-dynamic";
const NO_STORE = { "cache-control": "no-store" };
const CHANNEL_ID = "channel-hidden-systems";
type Row = Record<string, unknown>;
type RunResult = { meta?: { changes?: number } };
type Statement = { bind(...values: unknown[]): Statement; all<T = Row>(): Promise<{ results?: T[] }>; first<T = Row>(): Promise<T | null>; run(): Promise<RunResult> };
type DB = { prepare(query: string): Statement; batch(statements: Statement[]): Promise<RunResult[]> };
type StoredObject = { arrayBuffer(): Promise<ArrayBuffer>; size?: number; body?: ReadableStream; httpMetadata?: { contentType?: string } };
type Bucket = { get(key: string, options?: { range?: { offset: number; length: number } }): Promise<StoredObject | null>; head(key: string): Promise<{ size: number } | null> };
type Env = { DB?: DB; BUCKET?: Bucket; FACTORY_QA_EXECUTOR_TOKEN?: string; FACTORY_EXPERT_EMAILS?: string; FACTORY_AUTOMATION_ACTOR_EMAIL?: string; FACTORY_AUTOMATION_ACTOR_NAME?: string };

class BrowserQaError extends Error { constructor(public code: string, public status: number, message: string) { super(message); } }
const clean = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);
const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const json = <T,>(value: unknown, fallback: T): T => { try { return JSON.parse(clean(value)) as T; } catch { return fallback; } };
async function runtime() { const { env } = await import("cloudflare:workers"); return env as unknown as Env; }
async function first(db: DB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values).first<Row>(); }
async function rows(db: DB, query: string, ...values: unknown[]) { return (await db.prepare(query).bind(...values).all<Row>()).results ?? []; }
async function sha256(value: Uint8Array) { const input = value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer; return [...new Uint8Array(await crypto.subtle.digest("SHA-256", input))].map((part) => part.toString(16).padStart(2, "0")).join(""); }
async function secretMatches(left: string, right: string) { if (!left || !right) return false; const encode = (value: string) => new TextEncoder().encode(value), [a, b] = await Promise.all([crypto.subtle.digest("SHA-256", encode(left)), crypto.subtle.digest("SHA-256", encode(right))]); const av = new Uint8Array(a), bv = new Uint8Array(b); let difference = av.length ^ bv.length; for (let index = 0; index < Math.min(av.length, bv.length); index += 1) difference |= av[index] ^ bv[index]; return difference === 0; }

async function authorized(request: Request) {
  const env = await runtime();
  if (!env.DB || !env.BUCKET) throw new BrowserQaError("FACTORY_BROWSER_QA_RUNTIME_UNAVAILABLE", 503, "Canonical D1 and R2 are required");
  let user = await getChatGPTUser();
  if (!user && await secretMatches(request.headers.get("x-factory-qa-executor-token") || "", env.FACTORY_QA_EXECUTOR_TOKEN || "")) {
    const email = clean(env.FACTORY_AUTOMATION_ACTOR_EMAIL);
    if (email) user = { email, displayName: clean(env.FACTORY_AUTOMATION_ACTOR_NAME) || email, fullName: null };
  }
  if (!user) throw new BrowserQaError("FACTORY_BROWSER_QA_AUTHENTICATION_REQUIRED", 401, "Owner or scoped Factory QA authentication is required");
  const allowlist = new Set(clean(env.FACTORY_EXPERT_EMAILS).split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
  if (!allowlist.has(user.email.toLowerCase())) throw new BrowserQaError("FACTORY_BROWSER_QA_AUTHORIZATION_REQUIRED", 403, "This identity cannot run Factory Browser QA");
  return { env: env as Required<Pick<Env, "DB" | "BUCKET">> & Env, actor: user.email.toLowerCase() };
}

function observableTaxonomy(taxonomy: Row[], task: Row) {
  return taxonomy.filter((item) => isOwnerObservableDefect({ defectModality: clean(item.modality), candidateKind: clean(task.candidate_kind), mimeType: clean(task.mime_type) }));
}

async function status(db: DB) {
  const summary = await first(db, `SELECT COUNT(*) tasks,
    COALESCE(SUM(CASE WHEN lifecycle_state='PENDING' THEN 1 ELSE 0 END),0) pending,
    COALESCE(SUM(CASE WHEN lifecycle_state='LIKELY_DEFECT_PRESENT' THEN 1 ELSE 0 END),0) likely_defect,
    COALESCE(SUM(CASE WHEN lifecycle_state='LIKELY_CLEAN' THEN 1 ELSE 0 END),0) likely_clean,
    COALESCE(SUM(CASE WHEN lifecycle_state='NEEDS_OWNER' THEN 1 ELSE 0 END),0) needs_owner
    FROM v7_evaluation_factory_browser_qa_tasks WHERE channel_id=? AND policy_version=?`, CHANNEL_ID, FACTORY_BROWSER_QA_POLICY_VERSION);
  const modality = await rows(db, `SELECT CASE WHEN mime_type LIKE 'audio/%' THEN 'AUDIO' ELSE 'VIDEO' END modality,COUNT(*) count
    FROM v7_evaluation_factory_browser_qa_tasks WHERE channel_id=? AND policy_version=? GROUP BY modality ORDER BY modality`, CHANNEL_ID, FACTORY_BROWSER_QA_POLICY_VERSION);
  return { policyVersion: FACTORY_BROWSER_QA_POLICY_VERSION, authorityBoundary: "INDEPENDENT_REVIEW_ONLY", tasks: number(summary?.tasks), pending: number(summary?.pending), likelyDefect: number(summary?.likely_defect), likelyClean: number(summary?.likely_clean), needsOwner: number(summary?.needs_owner), modality: modality.map((item) => ({ modality: clean(item.modality), count: number(item.count) })), providerRequests: 0, spendUsd: 0 };
}

async function nextTask(env: Required<Pick<Env, "DB" | "BUCKET">> & Env) {
  const task = await first(env.DB, `SELECT t.*,c.storage_key FROM v7_evaluation_factory_browser_qa_tasks t
    JOIN v7_evaluation_candidates c ON c.id=t.candidate_id
    WHERE t.channel_id=? AND t.policy_version=? AND t.lifecycle_state='PENDING'
    ORDER BY CASE WHEN t.candidate_kind='MASTER' THEN 0 WHEN t.candidate_kind='CLIP' THEN 1 ELSE 2 END,t.created_at,t.id LIMIT 1`, CHANNEL_ID, FACTORY_BROWSER_QA_POLICY_VERSION);
  if (!task) return null;
  const object = await env.BUCKET.get(clean(task.storage_key));
  if (!object) throw new BrowserQaError("FACTORY_BROWSER_QA_ARTIFACT_MISSING", 404, "The exact media object is missing");
  const bytes = new Uint8Array(await object.arrayBuffer());
  if (await sha256(bytes) !== clean(task.exact_artifact_hash).toLowerCase()) throw new BrowserQaError("FACTORY_BROWSER_QA_ARTIFACT_HASH_MISMATCH", 409, "R2 bytes no longer match the exact task hash");
  return task;
}

async function serveAsset(env: Required<Pick<Env, "DB" | "BUCKET">> & Env, request: Request, taskId: string) {
  const task = await first(env.DB, `SELECT t.*,c.storage_key,c.byte_size FROM v7_evaluation_factory_browser_qa_tasks t JOIN v7_evaluation_candidates c ON c.id=t.candidate_id WHERE t.id=? AND t.channel_id=?`, taskId, CHANNEL_ID);
  if (!task) throw new BrowserQaError("FACTORY_BROWSER_QA_TASK_NOT_FOUND", 404, "Browser QA task not found");
  const key = clean(task.storage_key), mime = clean(task.mime_type), range = request.headers.get("range"), head = await env.BUCKET.head(key);
  if (!head) throw new BrowserQaError("FACTORY_BROWSER_QA_ARTIFACT_MISSING", 404, "The exact media object is missing");
  if (range) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(range);
    if (!match) return new Response("Invalid range", { status: 416, headers: { "content-range": `bytes */${head.size}` } });
    const start = Number(match[1]), end = Math.min(match[2] ? Number(match[2]) : head.size - 1, head.size - 1);
    if (start > end || start >= head.size) return new Response("Invalid range", { status: 416, headers: { "content-range": `bytes */${head.size}` } });
    const object = await env.BUCKET.get(key, { range: { offset: start, length: end - start + 1 } });
    if (!object) throw new BrowserQaError("FACTORY_BROWSER_QA_ARTIFACT_MISSING", 404, "The exact media object is missing");
    return new Response(object.body || await object.arrayBuffer(), { status: 206, headers: { "content-type": mime, "content-range": `bytes ${start}-${end}/${head.size}`, "content-length": String(end-start+1), "accept-ranges": "bytes", "cache-control": "private, max-age=300" } });
  }
  const object = await env.BUCKET.get(key);
  if (!object) throw new BrowserQaError("FACTORY_BROWSER_QA_ARTIFACT_MISSING", 404, "The exact media object is missing");
  return new Response(object.body || await object.arrayBuffer(), { headers: { "content-type": mime, "content-length": String(head.size), "accept-ranges": "bytes", "cache-control": "private, max-age=300" } });
}

const safeJson = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");
function browserHtml(config: { fixture: boolean; task: Row; taxonomy: Row[]; source: string }) {
  const defects = config.taxonomy.map((item) => ({ key: clean(item.defect_key), label: clean(item.label), severity: clean(item.severity), description: clean(item.description) }));
  const cfg = safeJson({ fixture: config.fixture, taskId: clean(config.task.id), hash: clean(config.task.exact_artifact_hash), mime: clean(config.task.mime_type), kind: clean(config.task.candidate_kind), artifactType: clean(config.task.artifact_type), source: config.source, defects });
  return new Response(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Factory Browser QA</title><style>
  *{box-sizing:border-box}body{margin:0;background:#07110e;color:#eaf5f0;font:16px/1.5 Arial,sans-serif}main{max-width:1180px;margin:auto;padding:clamp(18px,4vw,46px);display:grid;gap:18px}.eyebrow{color:#8ee0ba;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}h1{margin:4px 0;font:600 clamp(30px,5vw,54px)/1.05 Georgia,serif}.muted{color:#a8bdb4}.panel{background:#0d1b16;border:1px solid #315247;border-radius:18px;padding:18px}.media{width:100%;max-height:66vh;background:#020504;border-radius:12px}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}button{border:1px solid #4c7867;background:#17382c;color:#eaf5f0;border-radius:10px;padding:11px 15px;font-weight:800;cursor:pointer}.primary{background:#a6edcd;color:#092018;border-color:#a6edcd}.checks{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px}.check{border:1px solid #315247;border-radius:14px;padding:14px}.check b{display:block}.statuses{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.statuses label{border:1px solid #36594b;border-radius:999px;padding:6px 9px;cursor:pointer}.statuses input{margin-right:5px}textarea{width:100%;min-height:90px;background:#07110e;color:#edf7f3;border:1px solid #436a5a;border-radius:10px;padding:10px;margin-top:8px}.tech{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px}.tech label{border:1px solid #315247;border-radius:12px;padding:10px}.result{padding:14px;border-radius:12px;background:#15251f}.result.fail{background:#3b1916;color:#ffc2b8}.result.pass{background:#113c2c;color:#bdf5d9}@media(max-width:620px){main{padding:14px}.panel{padding:13px}}
  </style></head><body><main><header><div class="eyebrow">Factory Browser QA · exact-byte independent review</div><h1>Quan sát media như người xem thật.</h1><p class="muted" id="meta"></p></header><section class="panel"><div id="media"></div><div class="actions"><button id="pause">Tạm dừng / phát tiếp</button><button id="seek">Lùi 0,5 giây</button></div></section><section class="panel"><h2>Kiểm tra kỹ thuật bắt buộc</h2><div class="tech"><label><input id="audio" type="checkbox"> Có audio track và âm thanh phát được</label><label><input id="motion" type="checkbox"> Có chuyển động có nghĩa (video)</label><label><input id="focus" type="checkbox"> Điều khiển được bằng bàn phím</label><label><input id="reflow" type="checkbox"> Mobile/zoom không vỡ bố cục</label></div></section><section class="panel"><h2>Đánh giá lỗi quan sát được</h2><p class="muted">Mỗi lỗi phải có một kết luận. Chọn “Không chắc” khi Browser không đủ bằng chứng; Factory sẽ fail-closed.</p><div class="checks" id="checks"></div><label><b>Tóm tắt kết luận</b><textarea id="summary" placeholder="Mô tả ngắn bằng chứng nhìn/nghe thấy trong media."></textarea></label></section><button class="primary" id="submit">Ghi receipt Browser QA</button><div class="result" id="result" role="status">Chưa đánh giá.</div></main><script>
  const cfg=${cfg},root=document.getElementById('media'),media=document.createElement(cfg.mime.startsWith('video/')?'video':'audio');media.className='media';media.controls=true;media.preload='metadata';media.src=cfg.source;root.appendChild(media);document.getElementById('meta').textContent=(cfg.fixture?'QUALIFICATION FIXTURE · không có release authority':cfg.kind+' · '+cfg.artifactType)+' · '+cfg.mime+' · SHA-256 '+cfg.hash.slice(0,16)+'…';
  const checks=document.getElementById('checks');for(const d of cfg.defects){const el=document.createElement('article');el.className='check';el.innerHTML='<b>'+d.label+'</b><small>'+d.severity+' · '+d.description+'</small><div class="statuses">'+['PRESENT:Có lỗi','ABSENT:Không thấy','UNCERTAIN:Không chắc'].map(x=>{const [v,l]=x.split(':');return '<label><input required type="radio" name="defect-'+d.key+'" value="'+v+'">'+l+'</label>'}).join('')+'</div><textarea id="why-'+d.key+'" placeholder="Bằng chứng ngắn cho kết luận này"></textarea>';checks.appendChild(el)}
  const events=[],coverage=new Set();let last=0,watched=0,hidden=0,errors=0,pauseResume=false,seekPassed=false;const add=type=>events.push({type,mediaTimeSeconds:media.currentTime||0,monotonicMilliseconds:performance.now()});media.addEventListener('loadedmetadata',()=>add('LOADED_METADATA'));media.addEventListener('canplay',()=>add('CAN_PLAY'));media.addEventListener('play',()=>add('PLAY'));media.addEventListener('pause',()=>{if(!media.ended)add('PAUSE')});media.addEventListener('seeked',()=>add('SEEKED'));media.addEventListener('ended',()=>add('ENDED'));media.addEventListener('timeupdate',()=>{const current=media.currentTime,delta=current-last;if(!media.seeking&&delta>0&&delta<1.25)watched+=delta;if(!media.seeking&&Number.isFinite(media.duration)){const start=Math.max(0,Math.floor(Math.min(last,current)*4)),end=Math.min(Math.ceil(media.duration*4)-1,Math.floor(Math.max(last,current)*4));for(let i=start;i<=end;i++)coverage.add(i)}last=current});document.addEventListener('visibilitychange',()=>{if(document.hidden&&!media.paused)hidden++});window.addEventListener('error',()=>errors++);window.addEventListener('unhandledrejection',()=>errors++);
  document.getElementById('pause').addEventListener('click',async()=>{if(media.paused){await media.play();pauseResume=events.some(x=>x.type==='PAUSE')}else media.pause()});document.getElementById('seek').addEventListener('click',()=>{if(media.currentTime<.6)return;media.currentTime=Math.max(0,media.currentTime-.5);seekPassed=true});
  document.getElementById('submit').addEventListener('click',async()=>{const labels=[];for(const d of cfg.defects){const selected=document.querySelector('input[name="defect-'+d.key+'"]:checked');if(!selected){document.getElementById('result').className='result fail';document.getElementById('result').textContent='Chưa kết luận đủ taxonomy: '+d.label;return}labels.push({defectKey:d.key,status:selected.value,confidence:selected.value==='UNCERTAIN'?.5:.95,rationale:document.getElementById('why-'+d.key).value.trim()||('Browser observation: '+selected.value)})}const present=labels.filter(x=>x.status==='PRESENT').length,uncertain=labels.filter(x=>x.status==='UNCERTAIN').length,summary=document.getElementById('summary').value.trim(),decisionState=present?'LIKELY_DEFECT_PRESENT':uncertain?'NEEDS_OWNER':'LIKELY_CLEAN',total=Math.max(1,Math.ceil((media.duration||0)*4)),payload={action:'SUBMIT_FACTORY_BROWSER_QA',policyVersion:'FACTORY_BROWSER_QA_POLICY_V1',sessionId:'factory-browser-qa-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,14),taskId:cfg.taskId,exactArtifactHash:cfg.hash,mimeType:cfg.mime,metadataLoaded:media.readyState>=1,playable:media.readyState>=3,ended:media.ended,metadataDurationSeconds:media.duration,watchedSeconds:watched,continuousCoverageRatio:Math.min(1,coverage.size/total),timeProgressed:watched>0,pauseResumePassed:pauseResume,seekPassed,audioTrackObserved:document.getElementById('audio').checked,motionObserved:cfg.mime.startsWith('audio/')||document.getElementById('motion').checked,focusTraversalPassed:document.getElementById('focus').checked,zoomReflowPassed:document.getElementById('reflow').checked,consoleErrorCount:errors,hiddenDuringPlaybackCount:hidden,viewportWidth:innerWidth,viewportHeight:innerHeight,devicePixelRatio:devicePixelRatio||1,userAgent:navigator.userAgent,events,result:{decisionState,summary,labels}};const out=document.getElementById('result');if(summary.length<12){out.className='result fail';out.textContent='Cần tóm tắt ít nhất 12 ký tự.';return}const failures=[];if(!payload.metadataLoaded||!payload.playable||!payload.timeProgressed)failures.push('PLAYBACK_NOT_PROVEN');if(!payload.ended||payload.continuousCoverageRatio<.98)failures.push('CONTINUOUS_PLAYBACK_INCOMPLETE');if(!payload.pauseResumePassed||!payload.seekPassed)failures.push('CONTROLS_FAILED');if(!payload.audioTrackObserved)failures.push('AUDIO_NOT_OBSERVED');if(!payload.motionObserved)failures.push('MOTION_NOT_OBSERVED');if(!payload.focusTraversalPassed||!payload.zoomReflowPassed)failures.push('ACCESSIBILITY_CHECK_FAILED');if(payload.consoleErrorCount||payload.hiddenDuringPlaybackCount)failures.push('BROWSER_RUNTIME_INVALID');const types=events.map(x=>x.type),m=types.indexOf('LOADED_METADATA'),play=types.indexOf('PLAY'),pause=types.indexOf('PAUSE'),resume=pause>=0?types.indexOf('PLAY',pause+1):-1,seek=types.indexOf('SEEKED'),end=types.lastIndexOf('ENDED');if(m<0||play<=m||pause<=play||resume<=pause||seek<=play||end<=Math.max(resume,seek))failures.push('REQUIRED_EVENT_ORDER_MISSING');if(failures.length){out.className='result fail';out.textContent='Browser QA chưa đạt · '+failures.join(' · ');return}if(cfg.fixture){out.className='result pass';out.textContent='Fixture đã hoàn tất ở Browser · không ghi production receipt.';return}const response=await fetch(location.pathname,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}),body=await response.json().catch(()=>({}));out.className='result '+(response.ok?'pass':'fail');out.textContent=response.ok?'Đã lưu receipt · '+body.outcome:'Chưa lưu · '+(body.error?.code||'SUBMISSION_FAILED');if(response.ok)setTimeout(()=>location.reload(),900)});
  </script></body></html>`, { headers: { ...NO_STORE, "content-type": "text/html; charset=utf-8" } });
}

async function submit(env: Required<Pick<Env, "DB" | "BUCKET">> & Env, actor: string, body: Row) {
  const task = await first(env.DB, "SELECT * FROM v7_evaluation_factory_browser_qa_tasks WHERE id=? AND channel_id=?", clean(body.taskId), CHANNEL_ID);
  if (!task) throw new BrowserQaError("FACTORY_BROWSER_QA_TASK_NOT_FOUND", 404, "Browser QA task not found");
  const existing = await first(env.DB, "SELECT * FROM v7_evaluation_factory_browser_qa_receipts WHERE task_id=?", task.id);
  if (existing) return { outcome: "REPLAYED", taskId: task.id, evidenceHash: existing.evidence_hash, decisionState: existing.decision_state, providerRequests: 0, spendUsd: 0 };
  const taxonomy = await rows(env.DB, "SELECT id,defect_key,label,severity,modality,description FROM v7_evaluation_defect_taxonomy WHERE active=1 ORDER BY defect_key"), observable = observableTaxonomy(taxonomy, task);
  const evidence = body as FactoryBrowserQaEvidence, validation = evaluateFactoryBrowserQaEvidence({ evidence, expectedTaskId: clean(task.id), expectedArtifactHash: clean(task.exact_artifact_hash), expectedMimeType: clean(task.mime_type), observableDefectKeys: observable.map((item) => clean(item.defect_key)) });
  if (!validation.eligible) throw new BrowserQaError("FACTORY_BROWSER_QA_EVIDENCE_INVALID", 409, validation.reasons.join("; "));
  const result = evidence.result!, labels = result.labels ?? [], p0 = new Set(observable.filter((item) => clean(item.severity) === "P0").map((item) => clean(item.defect_key)));
  const ownerAttention = validation.uncertainCount || labels.some((label) => clean(label.status) === "PRESENT" && p0.has(clean(label.defectKey))) ? "OWNER_REQUIRED" : "NO_IMMEDIATE_OWNER_ACTION";
  const evidenceHash = await canonicalHash({ policyVersion: FACTORY_BROWSER_QA_POLICY_VERSION, taskId: task.id, candidateId: task.candidate_id, exactArtifactHash: task.exact_artifact_hash, observer: actor, evidence });
  const receiptId = id("evaluation-factory-browser-qa-receipt"), statements: Statement[] = [env.DB.prepare(`INSERT INTO v7_evaluation_factory_browser_qa_receipts
    (id,channel_id,task_id,candidate_id,exact_artifact_hash,policy_version,session_id,decision_state,owner_attention_state,labels_json,summary,browser_evidence_json,evidence_hash,observer_actor)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(receiptId, CHANNEL_ID, task.id, task.candidate_id, task.exact_artifact_hash, FACTORY_BROWSER_QA_POLICY_VERSION, clean(evidence.sessionId), clean(result.decisionState), ownerAttention, JSON.stringify(labels), clean(result.summary), JSON.stringify(evidence), evidenceHash, actor), env.DB.prepare("UPDATE v7_evaluation_factory_browser_qa_tasks SET lifecycle_state=?,latest_evidence_hash=?,completed_at=?,updated_at=? WHERE id=? AND lifecycle_state='PENDING'").bind(clean(result.decisionState), evidenceHash, now(), now(), task.id)];
  const taxonomyIds = new Map(observable.map((item) => [clean(item.defect_key), clean(item.id)]));
  for (const label of labels.filter((item) => ["PRESENT", "ABSENT"].includes(clean(item.status)))) statements.push(env.DB.prepare("INSERT INTO v7_evaluation_defect_labels (id,candidate_id,defect_id,label_source,polarity,confidence,evidence_hash,actor) VALUES (?,?,?,?,?,?,?,?)").bind(id("evaluation-defect-label"), task.candidate_id, taxonomyIds.get(clean(label.defectKey)), "INDEPENDENT_REVIEW", clean(label.status), number(label.confidence), evidenceHash, actor));
  await env.DB.batch(statements);
  const durable = await first(env.DB, "SELECT evidence_hash FROM v7_evaluation_factory_browser_qa_receipts WHERE id=?", receiptId);
  if (!durable) throw new BrowserQaError("FACTORY_BROWSER_QA_RECEIPT_NOT_DURABLE", 503, "Browser QA receipt read-back failed");
  return { outcome: clean(result.decisionState), taskId: task.id, evidenceHash, ownerAttentionState: ownerAttention, providerRequests: 0, spendUsd: 0 };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url), view = clean(url.searchParams.get("view"));
    if (view === "fixture") return browserHtml({ fixture: true, task: { id: "factory-browser-qa-fixture", exact_artifact_hash: "120f895977d2c50214f4bc4f9c2676d81c483f3be1d0e6b137adc8e198c5d55a", mime_type: "video/webm", candidate_kind: "FIXTURE", artifact_type: "CONTROLLED_BROWSER_MEDIA" }, taxonomy: [{ defect_key: "MOBILE_LEGIBILITY", label: "Mobile legibility", severity: "P1", description: "Essential text remains readable at mobile width.", modality: "VISUAL" }, { defect_key: "NEAR_STATIC_MOTION", label: "Meaningful motion", severity: "P1", description: "Video is not a near-static slide.", modality: "VISUAL" }, { defect_key: "AUDIO_SEAM", label: "Audio continuity", severity: "P1", description: "Audio plays without an audible seam.", modality: "AUDIO" }], source: "/qa/browser-assurance-fixture.webm" });
    const { env } = await authorized(request), taskId = clean(url.searchParams.get("asset"));
    if (taskId) return await serveAsset(env, request, taskId);
    if (view === "next") {
      const task = await nextTask(env), taxonomy = task ? observableTaxonomy(await rows(env.DB, "SELECT id,defect_key,label,severity,modality,description FROM v7_evaluation_defect_taxonomy WHERE active=1 ORDER BY defect_key"), task) : [];
      if (!task) return new Response("<!doctype html><html lang='vi'><body style='background:#07110e;color:#eaf5f0;font:18px Arial;padding:40px'><h1>Browser QA queue đã hết</h1><p>Không còn task PENDING trong policy hiện hành.</p></body></html>", { headers: { ...NO_STORE, "content-type": "text/html; charset=utf-8" } });
      return browserHtml({ fixture: false, task, taxonomy, source: `/api/factory/sequential-production/factory-browser-qa?asset=${encodeURIComponent(clean(task.id))}` });
    }
    return Response.json(await status(env.DB), { headers: NO_STORE });
  } catch (error) {
    return Response.json({ error: { code: error instanceof BrowserQaError ? error.code : "FACTORY_BROWSER_QA_FAILED", message: error instanceof Error ? error.message : "Factory Browser QA failed" }, providerRequests: 0, spendUsd: 0 }, { status: error instanceof BrowserQaError ? error.status : 503, headers: NO_STORE });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as Row | null;
    if (clean(body?.action) !== "SUBMIT_FACTORY_BROWSER_QA") throw new BrowserQaError("FACTORY_BROWSER_QA_ACTION_INVALID", 400, "Use SUBMIT_FACTORY_BROWSER_QA");
    const { env, actor } = await authorized(request);
    return Response.json(await submit(env, actor, body || {}), { status: 201, headers: NO_STORE });
  } catch (error) {
    return Response.json({ error: { code: error instanceof BrowserQaError ? error.code : "FACTORY_BROWSER_QA_FAILED", message: error instanceof Error ? error.message : "Factory Browser QA failed" }, providerRequests: 0, spendUsd: 0 }, { status: error instanceof BrowserQaError ? error.status : 503, headers: NO_STORE });
  }
}
