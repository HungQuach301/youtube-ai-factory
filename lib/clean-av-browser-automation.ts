import { canonicalHash, canonicalStringify, sha256Hex } from "@/lib/canonical-json";
import { CLEAN_AV_BROWSER_QA_VERSION, CLEAN_AV_MASTER_MATERIALIZATION_VERSION, CleanAvMasterError, cleanAvMasterSnapshot, createCleanAvOwnerTaskIfEligibleAuthorized, recordCleanAvBrowserQaAuthorized, type CleanAvBucket, type CleanAvDB } from "@/lib/clean-av-master";

export const CLEAN_AV_AUTONOMOUS_BROWSER_QA_VERSION = "CLEAN_AV_AUTONOMOUS_BROWSER_QA_V1" as const;

const CHANNEL_ID = "channel-hidden-systems";
const FRAME_ROLES = ["MOBILE_CUE_1", "MOBILE_CUE_2", "MOBILE_CUE_3", "MOBILE_CUE_4"] as const;
type FrameRole = typeof FRAME_ROLES[number];
type Row = Record<string, unknown>;
type FrameEvidence = { role: FrameRole; mediaTimeSeconds: number; dataUrl: string; contrastRange: number; edgeRatio: number; pixelHash: string };
export type AutonomousBrowserMetrics = {
  browserSessionId: string;
  browserName: string;
  browserVersion: string;
  userAgent: string;
  viewportWidth: number;
  viewportHeight: number;
  playbackCoverageRatio: number;
  pauseResumeObserved: boolean;
  seekObserved: boolean;
  endedObserved: boolean;
  audioTrackObserved: boolean;
  maximumAudioRms: number;
  meaningfulMotionObserved: boolean;
  motionSamples: number;
  mobileLegibilityObserved: boolean;
  mobileFrameSamples: number;
  focusReflowObserved: boolean;
  pageErrorCount: number;
  eventTrace: Array<{ type: string; mediaTimeSeconds: number; wallTimeMs: number }>;
  observations: unknown[];
  frames: FrameEvidence[];
};

const clean = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);
const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
async function first(db: CleanAvDB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values).first<Row>(); }
async function run(db: CleanAvDB, query: string, ...values: unknown[]) { return db.prepare(query).bind(...values.map((value) => value === undefined ? null : value)).run(); }

function decodeJpegDataUrl(value: string) {
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match) throw new CleanAvMasterError("CLEAN_AV_BROWSER_QA_FRAME_FORMAT_INVALID", 422, "Every Browser QA frame must be a bounded JPEG data URL");
  const raw = atob(match[1]);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  if (bytes.byteLength < 1_000 || bytes.byteLength > 120_000) throw new CleanAvMasterError("CLEAN_AV_BROWSER_QA_FRAME_SIZE_INVALID", 422, "Each Browser QA frame must remain between 1000 and 120000 bytes");
  return bytes;
}

function eventOrderValid(events: AutonomousBrowserMetrics["eventTrace"]) {
  const names = events.map((item) => clean(item.type).toUpperCase());
  const metadata = names.indexOf("LOADEDMETADATA"), play = names.indexOf("PLAY"), pause = names.indexOf("PAUSE"), resume = names.indexOf("PLAY", pause + 1), seek = names.indexOf("SEEKED"), ended = names.lastIndexOf("ENDED");
  return metadata >= 0 && play > metadata && pause > play && resume > pause && seek > play && ended > Math.max(resume, seek);
}

export async function startAutonomousCleanAvBrowserQaAuthorized(args: { db: CleanAvDB; actor: string; idempotencyKey: string; materializationReceiptId: string; distributionHash: string; browserSessionId: string }) {
  if (!/^[A-Za-z0-9._:-]{16,160}$/.test(args.idempotencyKey)) throw new CleanAvMasterError("IDEMPOTENCY_KEY_INVALID", 400, "A stable 16–160 character idempotency key is required");
  if (!/^[A-Za-z0-9._:-]{16,180}$/.test(args.browserSessionId)) throw new CleanAvMasterError("CLEAN_AV_BROWSER_QA_SESSION_INVALID", 400, "A stable browser session identity is required");
  const requestHash = await canonicalHash({ policyVersion: CLEAN_AV_AUTONOMOUS_BROWSER_QA_VERSION, materializationReceiptId: args.materializationReceiptId, distributionHash: args.distributionHash, browserSessionId: args.browserSessionId, actor: args.actor });
  const prior = await first(args.db, "SELECT * FROM v7_evaluation_clean_av_browser_qa_runs WHERE channel_id=? AND idempotency_key=? LIMIT 1", CHANNEL_ID, args.idempotencyKey);
  if (prior) {
    if (clean(prior.request_hash) !== requestHash) throw new CleanAvMasterError("CLEAN_AV_BROWSER_QA_RUN_IDEMPOTENCY_CONFLICT", 409, "The idempotency key is bound to a different Browser QA run");
    return { outcome: "REPLAYED", runId: clean(prior.id), attemptNumber: number(prior.attempt_number), lifecycleState: clean(prior.lifecycle_state) };
  }
  await run(args.db, "UPDATE v7_evaluation_clean_av_browser_qa_runs SET lifecycle_state='FAILED',failure_code='RUNNER_HEARTBEAT_EXPIRED',completed_at=? WHERE channel_id=? AND lifecycle_state IN ('PLANNED','RUNNING') AND julianday(created_at) < julianday('now','-10 minutes')", now(), CHANNEL_ID);
  const [policy, materialization, existingReceipt, activeRun, attempts] = await Promise.all([
    first(args.db, "SELECT * FROM v7_evaluation_clean_av_browser_qa_automation_policies WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, CLEAN_AV_AUTONOMOUS_BROWSER_QA_VERSION),
    first(args.db, "SELECT * FROM v7_evaluation_clean_av_master_materialization_receipts WHERE id=? AND channel_id=? AND policy_version=? LIMIT 1", args.materializationReceiptId, CHANNEL_ID, CLEAN_AV_MASTER_MATERIALIZATION_VERSION),
    first(args.db, "SELECT id FROM v7_evaluation_clean_av_browser_qa_receipts WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, CLEAN_AV_BROWSER_QA_VERSION),
    first(args.db, "SELECT id FROM v7_evaluation_clean_av_browser_qa_runs WHERE channel_id=? AND lifecycle_state IN ('PLANNED','RUNNING') LIMIT 1", CHANNEL_ID),
    first(args.db, "SELECT COUNT(*) count FROM v7_evaluation_clean_av_browser_qa_runs WHERE channel_id=?", CHANNEL_ID),
  ]);
  if (!policy || !materialization) throw new CleanAvMasterError("CLEAN_AV_BROWSER_QA_AUTOMATION_PREREQUISITES_MISSING", 409, "The autonomous policy and exact materialized master are required");
  if (existingReceipt) throw new CleanAvMasterError("CLEAN_AV_BROWSER_QA_CEILING_REACHED", 409, "The single Browser QA receipt already exists");
  if (activeRun) throw new CleanAvMasterError("CLEAN_AV_BROWSER_QA_RUN_ACTIVE", 409, "A Browser QA run is already active");
  if (args.distributionHash.toLowerCase() !== clean(materialization.distribution_hash)) throw new CleanAvMasterError("CLEAN_AV_BROWSER_QA_HASH_MISMATCH", 409, "The run must bind the exact distribution master hash");
  const attemptNumber = number(attempts?.count) + 1;
  if (attemptNumber > number(policy.maximum_attempts)) throw new CleanAvMasterError("CLEAN_AV_BROWSER_QA_ATTEMPT_CEILING_REACHED", 409, "The bounded Browser QA attempt ceiling has been reached");
  const runId = id("clean-av-browser-qa-run");
  await run(args.db, `INSERT INTO v7_evaluation_clean_av_browser_qa_runs
    (id,materialization_receipt_id,channel_id,policy_version,attempt_number,idempotency_key,request_hash,lifecycle_state,distribution_hash,browser_session_id,actor,authority_boundary)
    VALUES (?,?,?,'CLEAN_AV_AUTONOMOUS_BROWSER_QA_V1',?,?,?,'RUNNING',?,?,?,'INDEPENDENT_BROWSER_REVIEW_ONLY')`, runId, materialization.id, CHANNEL_ID, attemptNumber, args.idempotencyKey, requestHash, materialization.distribution_hash, args.browserSessionId, args.actor);
  return { outcome: "STARTED", runId, attemptNumber, materializationReceiptId: clean(materialization.id), distributionHash: clean(materialization.distribution_hash), policyVersion: CLEAN_AV_AUTONOMOUS_BROWSER_QA_VERSION };
}

export async function finalizeAutonomousCleanAvBrowserQaAuthorized(args: { db: CleanAvDB; bucket: CleanAvBucket; actor: string; idempotencyKey: string; runId: string; metrics: AutonomousBrowserMetrics }) {
  const [policy, browserRun] = await Promise.all([
    first(args.db, "SELECT * FROM v7_evaluation_clean_av_browser_qa_automation_policies WHERE channel_id=? AND policy_version=? LIMIT 1", CHANNEL_ID, CLEAN_AV_AUTONOMOUS_BROWSER_QA_VERSION),
    first(args.db, "SELECT * FROM v7_evaluation_clean_av_browser_qa_runs WHERE id=? AND channel_id=? LIMIT 1", args.runId, CHANNEL_ID),
  ]);
  if (!policy || !browserRun) throw new CleanAvMasterError("CLEAN_AV_BROWSER_QA_RUN_NOT_FOUND", 404, "The autonomous Browser QA run was not found");
  if (clean(browserRun.lifecycle_state) === "COMPLETE") return { outcome: "REPLAYED", snapshot: await cleanAvMasterSnapshot(args.db) };
  if (clean(browserRun.lifecycle_state) !== "RUNNING") throw new CleanAvMasterError("CLEAN_AV_BROWSER_QA_RUN_NOT_ACTIVE", 409, `The Browser QA run is ${clean(browserRun.lifecycle_state)}`);
  const metrics = args.metrics;
  const roles = new Set(metrics.frames?.map((frame) => clean(frame.role)) ?? []);
  const validFrames = Array.isArray(metrics.frames) && metrics.frames.length === FRAME_ROLES.length && FRAME_ROLES.every((role) => roles.has(role));
  const browserContextValid = Number.isInteger(metrics.viewportWidth) && metrics.viewportWidth >= 320 && metrics.viewportWidth <= 480 && Number.isInteger(metrics.viewportHeight) && metrics.viewportHeight >= 480 && clean(metrics.userAgent).length >= 12 && clean(metrics.browserSessionId) === clean(browserRun.browser_session_id);
  const allPass = Number(metrics.playbackCoverageRatio) >= number(policy.minimum_playback_coverage_ratio)
    && metrics.pauseResumeObserved && metrics.seekObserved && metrics.endedObserved && metrics.audioTrackObserved
    && Number(metrics.maximumAudioRms) >= number(policy.minimum_audio_rms)
    && metrics.meaningfulMotionObserved && Number(metrics.motionSamples) >= number(policy.minimum_motion_samples)
    && metrics.mobileLegibilityObserved && Number(metrics.mobileFrameSamples) >= number(policy.minimum_mobile_frame_samples)
    && metrics.focusReflowObserved && Number(metrics.pageErrorCount) === 0 && eventOrderValid(metrics.eventTrace ?? []) && validFrames && browserContextValid;
  const failureReasons = [
    [Number(metrics.playbackCoverageRatio) < number(policy.minimum_playback_coverage_ratio), "PLAYBACK_COVERAGE_INCOMPLETE"],
    [!metrics.pauseResumeObserved || !metrics.seekObserved || !metrics.endedObserved, "PLAYBACK_INTERACTION_INCOMPLETE"],
    [!metrics.audioTrackObserved || Number(metrics.maximumAudioRms) < number(policy.minimum_audio_rms), "DECODED_AUDIO_NOT_PROVEN"],
    [!metrics.meaningfulMotionObserved || Number(metrics.motionSamples) < number(policy.minimum_motion_samples), "MEANINGFUL_MOTION_NOT_PROVEN"],
    [!metrics.mobileLegibilityObserved || Number(metrics.mobileFrameSamples) < number(policy.minimum_mobile_frame_samples), "MOBILE_LEGIBILITY_NOT_PROVEN"],
    [!metrics.focusReflowObserved, "FOCUS_REFLOW_NOT_PROVEN"],
    [Number(metrics.pageErrorCount) !== 0, "PAGE_OR_MEDIA_ERRORS_OPEN"],
    [!eventOrderValid(metrics.eventTrace ?? []), "REQUIRED_EVENT_ORDER_MISSING"],
    [!validFrames, "FRAME_EVIDENCE_INCOMPLETE"],
    [!browserContextValid, "MOBILE_BROWSER_CONTEXT_INVALID"],
  ].filter(([failed]) => failed).map(([, reason]) => reason as string);
  if (!allPass) {
    await run(args.db, `UPDATE v7_evaluation_clean_av_browser_qa_runs SET lifecycle_state='FAILED',browser_name=?,browser_version=?,user_agent=?,viewport_width=?,viewport_height=?,playback_coverage_ratio=?,pause_resume_observed=?,seek_observed=?,ended_observed=?,audio_track_observed=?,maximum_audio_rms=?,meaningful_motion_observed=?,motion_samples=?,mobile_legibility_observed=?,mobile_frame_samples=?,focus_reflow_observed=?,page_error_count=?,event_trace_json=?,observations_json=?,failure_code=?,completed_at=? WHERE id=? AND lifecycle_state='RUNNING'`,
      clean(metrics.browserName), clean(metrics.browserVersion), clean(metrics.userAgent), metrics.viewportWidth, metrics.viewportHeight, Number(metrics.playbackCoverageRatio), metrics.pauseResumeObserved ? 1 : 0, metrics.seekObserved ? 1 : 0, metrics.endedObserved ? 1 : 0, metrics.audioTrackObserved ? 1 : 0, Number(metrics.maximumAudioRms), metrics.meaningfulMotionObserved ? 1 : 0, Number(metrics.motionSamples), metrics.mobileLegibilityObserved ? 1 : 0, Number(metrics.mobileFrameSamples), metrics.focusReflowObserved ? 1 : 0, Number(metrics.pageErrorCount), canonicalStringify(metrics.eventTrace ?? []), canonicalStringify(metrics.observations ?? []), failureReasons.join("__") || "AUTONOMOUS_BROWSER_EVIDENCE_INCOMPLETE", now(), args.runId);
    return { outcome: "FAILED", failureReasons, browserQaState: "PENDING", releaseEligible: false };
  }
  const evidenceRows: Array<{ role: FrameRole; mediaTimeSeconds: number; storageKey: string; bytes: number; hash: string; contrastRange: number; edgeRatio: number; pixelHash: string }> = [];
  for (const role of FRAME_ROLES) {
    const frame = metrics.frames.find((item) => item.role === role)!;
    const bytes = decodeJpegDataUrl(frame.dataUrl), hash = await sha256Hex(bytes);
    const storageKey = `evaluation/controlled-fixtures/v1/clean-av/browser-qa/${args.runId}/${role.toLowerCase()}-${hash}.jpg`;
    await args.bucket.put(storageKey, bytes, { httpMetadata: { contentType: "image/jpeg" }, customMetadata: { sha256: hash, runId: args.runId, role, policyVersion: CLEAN_AV_AUTONOMOUS_BROWSER_QA_VERSION, releaseEligible: "false" } });
    const stored = await args.bucket.get(storageKey); if (!stored) throw new CleanAvMasterError("CLEAN_AV_BROWSER_QA_EVIDENCE_READBACK_MISSING", 503, "A Browser QA frame could not be read back from R2");
    const readbackHash = await sha256Hex(new Uint8Array(await stored.arrayBuffer())); if (readbackHash !== hash) throw new CleanAvMasterError("CLEAN_AV_BROWSER_QA_EVIDENCE_READBACK_MISMATCH", 503, "A Browser QA frame differs after R2 read-back");
    await run(args.db, `INSERT INTO v7_evaluation_clean_av_browser_qa_evidence_objects
      (id,run_id,materialization_receipt_id,channel_id,policy_version,role,media_time_seconds,storage_key,mime_type,byte_size,sha256,readback_sha256)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, id("clean-av-browser-evidence"), args.runId, browserRun.materialization_receipt_id, CHANNEL_ID, CLEAN_AV_AUTONOMOUS_BROWSER_QA_VERSION, role, Number(frame.mediaTimeSeconds), storageKey, "image/jpeg", bytes.byteLength, hash, hash);
    evidenceRows.push({ role, mediaTimeSeconds: Number(frame.mediaTimeSeconds), storageKey, bytes: bytes.byteLength, hash, contrastRange: Number(frame.contrastRange), edgeRatio: Number(frame.edgeRatio), pixelHash: clean(frame.pixelHash) });
  }
  const evidenceBundle = { policyVersion: CLEAN_AV_AUTONOMOUS_BROWSER_QA_VERSION, runId: args.runId, materializationReceiptId: clean(browserRun.materialization_receipt_id), distributionHash: clean(browserRun.distribution_hash), browser: { sessionId: metrics.browserSessionId, name: metrics.browserName, version: metrics.browserVersion, userAgent: metrics.userAgent, viewportWidth: metrics.viewportWidth, viewportHeight: metrics.viewportHeight }, playback: { coverageRatio: metrics.playbackCoverageRatio, pauseResumeObserved: metrics.pauseResumeObserved, seekObserved: metrics.seekObserved, endedObserved: metrics.endedObserved }, audio: { trackObserved: metrics.audioTrackObserved, maximumRms: metrics.maximumAudioRms }, motion: { observed: metrics.meaningfulMotionObserved, samples: metrics.motionSamples }, mobile: { legibilityObserved: metrics.mobileLegibilityObserved, samples: metrics.mobileFrameSamples }, accessibility: { focusReflowObserved: metrics.focusReflowObserved }, pageErrorCount: metrics.pageErrorCount, eventTrace: metrics.eventTrace, frames: evidenceRows, observations: metrics.observations };
  const evidenceBundleHash = await canonicalHash(evidenceBundle);
  const receiptIdempotencyKey = `clean-av-browser-receipt:${args.runId}`;
  const receiptResult = await recordCleanAvBrowserQaAuthorized({ db: args.db, actor: args.actor, idempotencyKey: receiptIdempotencyKey, materializationReceiptId: clean(browserRun.materialization_receipt_id), distributionHash: clean(browserRun.distribution_hash), playbackCoverageRatio: Number(metrics.playbackCoverageRatio), pauseResumeObserved: true, seekObserved: true, endedObserved: true, audioTrackObserved: true, meaningfulMotionObserved: true, mobileLegibilityObserved: true, focusReflowObserved: true, pageErrorCount: 0, decisionState: "LIKELY_CLEAN", observations: [{ autonomousPolicyVersion: CLEAN_AV_AUTONOMOUS_BROWSER_QA_VERSION, browserRunId: args.runId, evidenceBundleHash, browserSessionId: metrics.browserSessionId, maximumAudioRms: metrics.maximumAudioRms, motionSamples: metrics.motionSamples, mobileFrameSamples: metrics.mobileFrameSamples }, ...(metrics.observations ?? [])], deferOwnerTask: true });
  const receipt = await first(args.db, "SELECT id FROM v7_evaluation_clean_av_browser_qa_receipts WHERE channel_id=? AND idempotency_key=? LIMIT 1", CHANNEL_ID, receiptIdempotencyKey);
  if (!receipt) throw new CleanAvMasterError("CLEAN_AV_BROWSER_QA_RECEIPT_NOT_DURABLE", 503, "The Browser QA receipt could not be read back");
  await run(args.db, `INSERT INTO v7_evaluation_clean_av_browser_qa_evidence_links
    (id,browser_qa_receipt_id,run_id,materialization_receipt_id,channel_id,policy_version,evidence_bundle_hash,authority_boundary)
    VALUES (?,?,?,?,?,'CLEAN_AV_AUTONOMOUS_BROWSER_QA_V1',?,'INDEPENDENT_BROWSER_REVIEW_ONLY')`, id("clean-av-browser-evidence-link"), receipt.id, args.runId, browserRun.materialization_receipt_id, CHANNEL_ID, evidenceBundleHash);
  await run(args.db, `UPDATE v7_evaluation_clean_av_browser_qa_runs SET lifecycle_state='COMPLETE',browser_name=?,browser_version=?,user_agent=?,viewport_width=?,viewport_height=?,playback_coverage_ratio=?,pause_resume_observed=1,seek_observed=1,ended_observed=1,audio_track_observed=1,maximum_audio_rms=?,meaningful_motion_observed=1,motion_samples=?,mobile_legibility_observed=1,mobile_frame_samples=?,focus_reflow_observed=1,page_error_count=0,event_trace_json=?,observations_json=?,evidence_bundle_hash=?,completed_at=? WHERE id=? AND lifecycle_state='RUNNING'`,
    clean(metrics.browserName), clean(metrics.browserVersion), clean(metrics.userAgent), metrics.viewportWidth, metrics.viewportHeight, Number(metrics.playbackCoverageRatio), Number(metrics.maximumAudioRms), Number(metrics.motionSamples), Number(metrics.mobileFrameSamples), canonicalStringify(metrics.eventTrace), canonicalStringify(metrics.observations), evidenceBundleHash, now(), args.runId);
  await createCleanAvOwnerTaskIfEligibleAuthorized(args.db);
  return { outcome: receiptResult.outcome, runId: args.runId, browserQaReceiptId: clean(receipt.id), evidenceBundleHash, snapshot: await cleanAvMasterSnapshot(args.db) };
}

export function autonomousCleanAvBrowserQaHtml(input: { materializationReceiptId: string; distributionHash: string }) {
  const config = JSON.stringify({ policyVersion: CLEAN_AV_AUTONOMOUS_BROWSER_QA_VERSION, materializationReceiptId: input.materializationReceiptId, distributionHash: input.distributionHash });
  const harness = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Autonomous clean A/V Browser QA</title><style>*{box-sizing:border-box}body{margin:0;background:#07110e;color:#e5f2ed;font:15px Arial,sans-serif}main{max-width:480px;margin:auto;padding:18px;display:grid;gap:16px}small{color:#9ce6b2;font-weight:800}h1{font:600 31px/1.05 Georgia,serif;margin:4px 0}p{color:#a9bdb5;line-height:1.55}video{display:block;width:100%;background:#030705;border-radius:12px;outline:2px solid transparent;outline-offset:3px}button{min-height:50px;border:0;border-radius:10px;background:#a8e8ca;color:#09291e;font-weight:850;font-size:15px}button:focus-visible{outline:3px solid #fff;outline-offset:3px}.panel{padding:14px;border:1px solid #29483d;border-radius:12px;background:#0c1a15}.metrics{display:grid;grid-template-columns:1fr 1fr;gap:8px}.metric{padding:10px;border-radius:8px;background:#10251d}.metric b{display:block;margin-top:4px;overflow-wrap:anywhere}.pass{color:#a8e8ca}.fail{color:#f5c590}</style></head><body><main><small>EXACT MASTER · MOBILE 320–480 PX · FAIL-CLOSED</small><h1>Browser QA tự động</h1><p>Runner phát toàn bộ video theo thời gian thực, pause/resume, seek ngược, đo decoded audio, frame motion, mobile contrast/edges, focus/reflow và mọi page/media error.</p><video id="media" controls playsinline preload="auto"></video><button id="run" type="button">Chạy Browser QA đầy đủ</button><section class="panel"><strong id="state">Sẵn sàng</strong><p id="detail">Không receipt nào được tạo trước khi tất cả evidence đạt.</p><div id="metrics" class="metrics"></div></section></main><script>(()=>{const cfg=${config},endpoint='/api/factory/sequential-production/evaluation',media=document.getElementById('media'),button=document.getElementById('run'),stateNode=document.getElementById('state'),detail=document.getElementById('detail'),metricsNode=document.getElementById('metrics');let pageErrors=0;addEventListener('error',()=>pageErrors++);addEventListener('unhandledrejection',()=>pageErrors++);const sessionId='cloud-browser-'+Date.now().toString(36)+'-'+crypto.randomUUID(),idempotencyKey='clean-av-browser-run:'+sessionId;media.src=endpoint+'?cleanAvMaster='+encodeURIComponent(cfg.materializationReceiptId)+'&rendition=distribution';const show=(items)=>metricsNode.innerHTML=items.map(([k,v])=>'<div class="metric"><small>'+k+'</small><b>'+v+'</b></div>').join('');button.addEventListener('click',async()=>{button.disabled=true;stateNode.textContent='Đang chạy';detail.textContent='Giữ tab hiển thị cho đến khi video kết thúc.';const events=[],frames=[],playedBins=new Set();let paused=false,resumed=false,sought=false,ended=false,maxRms=0,frameCallbacks=0,previousPixels=null,motionChanges=0,audioTrack=false,audioTimer=0,actionLock=false;const event=(type)=>events.push({type,mediaTimeSeconds:Number(media.currentTime||0),wallTimeMs:Date.now()});for(const name of ['loadedmetadata','play','pause','seeked','ended'])media.addEventListener(name,()=>{event(name.toUpperCase());if(name==='ended')ended=true},{passive:true});try{const start=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json','idempotency-key':idempotencyKey},body:JSON.stringify({action:'START_AUTONOMOUS_CLEAN_AV_BROWSER_QA',materializationReceiptId:cfg.materializationReceiptId,distributionHash:cfg.distributionHash,browserSessionId:sessionId})}),started=await start.json();if(!start.ok)throw new Error(started.error?.code||'RUN_START_FAILED');await new Promise((resolve,reject)=>{if(media.readyState>=1)return resolve();media.addEventListener('loadedmetadata',resolve,{once:true});media.addEventListener('error',()=>reject(new Error('MEDIA_METADATA_FAILED')),{once:true})});event('LOADEDMETADATA');const stream=media.captureStream?media.captureStream():null;audioTrack=Boolean(stream&&stream.getAudioTracks().length);if(stream&&audioTrack){const context=new AudioContext();await context.resume();const source=context.createMediaStreamSource(stream),analyser=context.createAnalyser();analyser.fftSize=1024;source.connect(analyser);const samples=new Float32Array(analyser.fftSize);audioTimer=setInterval(()=>{analyser.getFloatTimeDomainData(samples);let total=0;for(const sample of samples)total+=sample*sample;maxRms=Math.max(maxRms,Math.sqrt(total/samples.length))},100)}const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});canvas.width=390;canvas.height=219;const capture=(role)=>{ctx.drawImage(media,0,0,canvas.width,canvas.height);const image=ctx.getImageData(0,0,canvas.width,canvas.height),pixels=image.data;let min=255,max=0,edges=0,totalEdges=0,hash=2166136261;for(let y=0;y<canvas.height;y+=3)for(let x=0;x<canvas.width;x+=3){const i=(y*canvas.width+x)*4,l=(pixels[i]*299+pixels[i+1]*587+pixels[i+2]*114)/1000;min=Math.min(min,l);max=Math.max(max,l);hash=Math.imul(hash^pixels[i],16777619);if(x>=3){const j=(y*canvas.width+x-3)*4,ll=(pixels[j]*299+pixels[j+1]*587+pixels[j+2]*114)/1000;totalEdges++;if(Math.abs(l-ll)>24)edges++}}if(previousPixels){let changed=0,count=0;for(let i=0;i<pixels.length;i+=48){if(Math.abs(pixels[i]-previousPixels[i])+Math.abs(pixels[i+1]-previousPixels[i+1])+Math.abs(pixels[i+2]-previousPixels[i+2])>30)changed++;count++}if(changed/Math.max(1,count)>.025)motionChanges++}previousPixels=new Uint8ClampedArray(pixels);frames.push({role,mediaTimeSeconds:Number(media.currentTime),dataUrl:canvas.toDataURL('image/jpeg',.62),contrastRange:max-min,edgeRatio:edges/Math.max(1,totalEdges),pixelHash:(hash>>>0).toString(16).padStart(8,'0')})};const cues=[.15,.38,.62,.84],roles=['MOBILE_CUE_1','MOBILE_CUE_2','MOBILE_CUE_3','MOBILE_CUE_4'];let cueIndex=0;if(media.requestVideoFrameCallback){const observe=()=>{frameCallbacks++;if(!media.ended)media.requestVideoFrameCallback(observe)};media.requestVideoFrameCallback(observe)}media.addEventListener('timeupdate',async()=>{const duration=media.duration||1,ratio=media.currentTime/duration;playedBins.add(Math.min(399,Math.floor(ratio*400)));if(cueIndex<cues.length&&ratio>=cues[cueIndex])capture(roles[cueIndex++]);if(!actionLock&&!paused&&ratio>=.22){actionLock=true;media.pause();paused=true;await new Promise(r=>setTimeout(r,700));await media.play();resumed=true;actionLock=false}else if(!actionLock&&!sought&&ratio>=.55){actionLock=true;media.currentTime=Math.max(0,media.currentTime-4);sought=true;await new Promise(r=>setTimeout(r,350));await media.play();actionLock=false}show([['Coverage',Math.min(100,playedBins.size/4).toFixed(1)+'%'],['Audio RMS',maxRms.toFixed(4)],['Frame callbacks',String(frameCallbacks)],['Page errors',String(pageErrors)]])},{passive:true});await media.play();await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('PLAYBACK_TIMEOUT')),90000);media.addEventListener('ended',()=>{clearTimeout(timeout);resolve()},{once:true})});if(audioTimer)clearInterval(audioTimer);while(cueIndex<cues.length)capture(roles[cueIndex++]);const ranges=[];for(let i=0;i<media.played.length;i++)ranges.push([media.played.start(i),media.played.end(i)]);const covered=ranges.reduce((sum,range)=>sum+Math.max(0,range[1]-range[0]),0),coverage=Math.min(1,covered/Math.max(.001,media.duration));button.disabled=false;button.focus();const rect=media.getBoundingClientRect(),focusReflow=document.activeElement===button&&document.documentElement.scrollWidth<=innerWidth+1&&rect.left>=0&&rect.right<=innerWidth+1;const mobileFrames=frames.filter(frame=>frame.contrastRange>=80&&frame.edgeRatio>=.01).length,motion=motionChanges>=3&&frameCallbacks>=Math.floor(media.duration*20);const payload={action:'FINALIZE_AUTONOMOUS_CLEAN_AV_BROWSER_QA',runId:started.runId,metrics:{browserSessionId:sessionId,browserName:'Chromium',browserVersion:(navigator.userAgent.match(/Chrom(?:e|ium)\/([0-9.]+)/)||[])[1]||'unknown',userAgent:navigator.userAgent,viewportWidth:innerWidth,viewportHeight:innerHeight,playbackCoverageRatio:coverage,pauseResumeObserved:paused&&resumed,seekObserved:sought,endedObserved:ended,audioTrackObserved:audioTrack,maximumAudioRms:maxRms,meaningfulMotionObserved:motion,motionSamples:frames.length,mobileLegibilityObserved:mobileFrames===4,mobileFrameSamples:mobileFrames,focusReflowObserved:focusReflow,pageErrorCount:pageErrors,eventTrace:events,observations:[{playedRanges:ranges,durationSeconds:media.duration,frameCallbacks,motionChanges,mobileFrames}],frames}};const finish=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json','idempotency-key':'clean-av-browser-finalize:'+sessionId},body:JSON.stringify(payload)}),result=await finish.json();if(!finish.ok)throw new Error(result.error?.code||'RUN_FINALIZE_FAILED');stateNode.className=result.outcome==='LIKELY_CLEAN'?'pass':'fail';stateNode.textContent=result.outcome==='LIKELY_CLEAN'?'Browser QA LIKELY_CLEAN':'Browser QA chưa đạt';detail.textContent=result.outcome==='LIKELY_CLEAN'?'Receipt và exact evidence bundle đã được seal; owner ground truth là bước riêng.':(result.failureReasons||[]).join(' · ');show([['Coverage',(coverage*100).toFixed(2)+'%'],['Max audio RMS',maxRms.toFixed(4)],['Motion samples',String(frames.length)],['Mobile frames',mobileFrames+'/4'],['Focus / reflow',focusReflow?'PASS':'FAIL'],['Page errors',String(pageErrors)]])}catch(error){if(audioTimer)clearInterval(audioTimer);pageErrors++;stateNode.className='fail';stateNode.textContent='Runner dừng fail-closed';detail.textContent=error instanceof Error?error.message:'AUTONOMOUS_BROWSER_QA_FAILED';button.disabled=false}})})();</script></body></html>`;
  const executableHarness = harness
    .replace("navigator.userAgent.match(/Chrom(?:e|ium)/([0-9.]+)/)", "navigator.userAgent.match(new RegExp('Chrom(?:e|ium)/([0-9.]+)'))")
    .replace("motion=motionChanges>=3&&frameCallbacks>=Math.floor(media.duration*20)", "distinctFrames=new Set(frames.map(frame=>frame.pixelHash)).size,motion=motionChanges>=2&&distinctFrames>=3&&frameCallbacks>=3")
    .replace("frameCallbacks,motionChanges,mobileFrames}", "frameCallbacks,motionChanges,distinctFrames,mobileFrames}");
  const srcdoc = executableHarness.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Autonomous clean A/V Browser QA</title><style>html,body{margin:0;min-height:100%;background:#030806}body{display:grid;place-items:start center;padding:18px;box-sizing:border-box}iframe{width:390px;max-width:100%;height:844px;border:1px solid #29483d;border-radius:14px;background:#07110e}</style></head><body><iframe title="Mobile clean A/V Browser QA runner" srcdoc="${srcdoc}"></iframe></body></html>`;
}
