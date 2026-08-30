import { asc, desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "../../../../../db";
import { evidenceAuditRuns, evidenceBindings, evidenceRecords, productionProfiles, videoProjects, videoRenders, workflowEvents } from "../../../../../db/schema";

type RuntimeObject = { body: ReadableStream; arrayBuffer?: () => Promise<ArrayBuffer>; size: number; httpMetadata?: { contentType?: string } };
type RuntimeBucket = {
  get(key: string, options?: { range?: { offset: number; length: number } }): Promise<RuntimeObject | null>;
  head(key: string): Promise<{ size: number; httpMetadata?: { contentType?: string } } | null>;
  put(key: string, value: ArrayBuffer | Uint8Array, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }): Promise<unknown>;
  delete(keys: string | string[]): Promise<unknown>;
};
type RuntimeEnv = { BUCKET?: RuntimeBucket; ELEVENLABS_API_KEY?: string; FACTORY_EXPERT_EMAILS?: string };

const QA_CHECKS = ["FULL_PLAYBACK", "SINGLE_VOICE", "SYNC", "LOUDNESS", "BLACK_FRAMES", "RIGHTS", "SEMANTIC_FIT", "SOUNDSCAPE"] as const;

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
function jsonObject(value: string | null) { try { return value ? JSON.parse(value) as Record<string, unknown> : {}; } catch { return {}; } }
function validUploadId(value: string) { return /^[a-zA-Z0-9-]{12,80}$/.test(value); }
function safeName(value: string) { return value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 100) || "master-v5.webm"; }
async function hash(bytes: Uint8Array) { const digest = await crypto.subtle.digest("SHA-256", bytes.buffer as ArrayBuffer); return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join(""); }

function wavTone(role: "MUSIC" | "AMBIENCE" | "SFX", index: number) {
  const sampleRate = 24000; const seconds = role === "MUSIC" ? 12 : role === "AMBIENCE" ? 10 : .8; const samples = Math.floor(sampleRate * seconds);
  const bytes = new Uint8Array(44 + samples * 2); const view = new DataView(bytes.buffer);
  const write = (offset: number, text: string) => [...text].forEach((character, position) => view.setUint8(offset + position, character.charCodeAt(0)));
  write(0, "RIFF"); view.setUint32(4, 36 + samples * 2, true); write(8, "WAVEfmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); write(36, "data"); view.setUint32(40, samples * 2, true);
  let noise = 811 + index * 97;
  for (let sample = 0; sample < samples; sample += 1) {
    const time = sample / sampleRate; noise = (noise * 1664525 + 1013904223) >>> 0; const random = noise / 4294967296 * 2 - 1;
    const fade = Math.min(1, time * 3, (seconds - time) * 3);
    let value = 0;
    if (role === "MUSIC") { const root = [55, 61.74, 65.41, 73.42, 82.41][index % 5]; value = Math.sin(time * Math.PI * 2 * root) * .18 + Math.sin(time * Math.PI * 2 * root * 1.5) * .08 + Math.sin(time * Math.PI * 2 * 1.5) * .03; }
    else if (role === "AMBIENCE") value = random * .045 + Math.sin(time * Math.PI * 2 * (.18 + index * .03)) * .025;
    else value = (Math.sin(time * Math.PI * 2 * (180 + index * 65) * Math.exp(-time * 3)) * .38 + random * .08) * Math.exp(-time * 5);
    view.setInt16(44 + sample * 2, Math.max(-1, Math.min(1, value * fade)) * 32767, true);
  }
  return bytes;
}

async function serveObject(request: Request, key: string, mimeType: string, fallbackSize: number) {
  const bucket = (await runtimeEnv()).BUCKET; if (!bucket) return new Response("Media vault unavailable", { status: 424 });
  const range = request.headers.get("range");
  if (range) {
    const head = await bucket.head(key); if (!head) return new Response("Evidence object not found", { status: 404 });
    const match = /^bytes=(\d+)-(\d*)$/.exec(range); if (!match) return new Response("Invalid range", { status: 416 });
    const start = Number(match[1]); const end = Math.min(match[2] ? Number(match[2]) : head.size - 1, head.size - 1); if (start > end || start >= head.size) return new Response("Invalid range", { status: 416 });
    const object = await bucket.get(key, { range: { offset: start, length: end - start + 1 } }); if (!object) return new Response("Evidence object not found", { status: 404 });
    return new Response(object.body, { status: 206, headers: { "content-type": object.httpMetadata?.contentType || mimeType, "content-range": `bytes ${start}-${end}/${head.size}`, "content-length": String(end - start + 1), "accept-ranges": "bytes", "cache-control": "private, max-age=3600" } });
  }
  const object = await bucket.get(key); if (!object) return new Response("Evidence object not found", { status: 404 });
  return new Response(object.body, { headers: { "content-type": object.httpMetadata?.contentType || mimeType, "content-length": String(object.size || fallbackSize), "accept-ranges": "bytes", "cache-control": "private, max-age=3600" } });
}

async function snapshot(projectId: string) {
  const db = await getDb();
  const [profiles, records, bindings, audits, renders] = await Promise.all([
    db.select().from(productionProfiles).where(eq(productionProfiles.projectId, projectId)).limit(1),
    db.select().from(evidenceRecords).where(eq(evidenceRecords.projectId, projectId)),
    db.select().from(evidenceBindings).where(eq(evidenceBindings.projectId, projectId)),
    db.select().from(evidenceAuditRuns).where(eq(evidenceAuditRuns.projectId, projectId)).orderBy(desc(evidenceAuditRuns.createdAt)).limit(1),
    db.select().from(videoRenders).where(eq(videoRenders.projectId, projectId)).orderBy(desc(videoRenders.version)),
  ]);
  const map = new Map(records.map((record) => [record.id, record]));
  const v51Shots = records.filter((record) => record.entityType === "SHOT" && Number(jsonObject(record.settingsJson).productionExpansionVersion) === 51);
  const activeExpansionVersion = v51Shots.length === 144 ? 51 : 5;
  const v52AssetIds = new Set(records.filter((record) => record.entityType === "MEDIA_ASSET" && Number(jsonObject(record.settingsJson).repairVersion) === 52 && record.lifecycleState === "BOUND" && record.storageKey && record.contentHash).map((record) => record.id));
  const shotRecords = records.filter((record) => record.entityType === "SHOT" && Number(jsonObject(record.settingsJson).productionExpansionVersion) === activeExpansionVersion).sort((a, b) => Number(jsonObject(a.settingsJson).startSeconds || 0) - Number(jsonObject(b.settingsJson).startSeconds || 0));
  const activeVisualBindings = bindings.filter((binding) => binding.status === "ACTIVE" && binding.relationship === (activeExpansionVersion === 51 ? "V51_VISUAL_FOR_SHOT" : "VISUAL_FOR_SHOT"));
  const shots = shotRecords.map((shot) => {
    const settings = jsonObject(shot.settingsJson); const binding = activeVisualBindings.find((item) => item.toRecordId === shot.id); const asset = binding ? map.get(binding.fromRecordId) : null;
    return { id: shot.id, title: shot.title, startSeconds: Number(settings.startSeconds || 0), endSeconds: Number(settings.endSeconds || 0), family: String(settings.primaryFamily || "MACRO_REALITY"), narrativeFunction: String(settings.narrativeFunction || "EXPLAIN"), emphasis: String(settings.emphasis || "BASE"), semanticScore: asset?.semanticScore || 0, asset: asset ? { id: asset.id, title: asset.title, mimeType: asset.mimeType || "application/octet-stream", provider: asset.provider || "Unknown", url: `/api/projects/${projectId}/master-v5?asset=${encodeURIComponent(asset.id)}` } : null };
  });
  const audios = records.filter((record) => record.entityType === "AUDIO_ASSET" && ["BOUND", "RENDERED", "AUDITED"].includes(record.lifecycleState) && record.storageKey).map((record) => { const settings = jsonObject(record.settingsJson); return { id: record.id, title: record.title, role: String(settings.role || (record.provider === "ElevenLabs" ? "NARRATION" : "AUDIO")), position: Number(settings.position || 0), durationSeconds: Number(settings.durationSeconds || 0), url: `/api/projects/${projectId}/master-v5?audio=${encodeURIComponent(record.id)}` }; }).sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
  const narration = audios.filter((audio) => audio.role === "NARRATION" || audio.id.includes("OPT-V3")); const v51Audio = audios.filter((audio) => audio.id.includes("-V51-")); const audioPool = v51Audio.length ? v51Audio : audios; const music = audioPool.filter((audio) => audio.role === "MUSIC"); const ambience = audioPool.filter((audio) => audio.role === "AMBIENCE"); const sfx = audioPool.filter((audio) => audio.role === "SFX");
  const latestV5Evidence = records.filter((record) => record.entityType === "RENDER_EVIDENCE" && [5,51,52].includes(Number(jsonObject(record.settingsJson).renderPipelineVersion))).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const latestRenderId = String(latestV5Evidence ? jsonObject(latestV5Evidence.settingsJson).renderId || "" : ""); const locatedRender = renders.find((render) => render.id === latestRenderId) || null; const latestRender = locatedRender?.status.includes("QUARANTINED") ? null : locatedRender;
  const latestAudit = audits[0]; const shotsReady = shots.length === 144 && shots.every((shot) => shot.asset); const gates = { profileV5: profiles[0]?.version === 5, planReady: activeExpansionVersion === 51 ? shots.length === 144 : Boolean(latestAudit?.planReady), materialReady: activeExpansionVersion === 51 ? shotsReady && new Set(shots.map((shot) => shot.asset?.id)).size >= 120 : Boolean(latestAudit?.materialReady), shotsReady, narrationReady: narration.length >= 12, soundscapeReady: activeExpansionVersion === 51 ? music.length >= 3 && ambience.length >= 4 && sfx.length >= 8 : music.length >= 5 && ambience.length >= 4 && sfx.length >= 4 };
  return { profile: profiles[0] || null, productionVersion: activeExpansionVersion === 51 ? (v52AssetIds.size >= 120 ? "5.2" : "5.1") : "5.0", gates, shots, audio: { narration, music, ambience, sfx }, latest: latestRender && latestV5Evidence ? { id: latestRender.id, evidenceId: latestV5Evidence.id, version: latestRender.version, status: latestRender.status, width: latestRender.width, height: latestRender.height, fps: latestRender.fps, durationSeconds: latestRender.durationSeconds, sizeBytes: latestRender.sizeBytes, videoUrl: `/api/projects/${projectId}/render?video=${encodeURIComponent(latestRender.id)}`, downloadUrl: `/api/projects/${projectId}/render?video=${encodeURIComponent(latestRender.id)}&download=1` } : null };
}

async function materializeSoundscape(projectId: string) {
  const db = await getDb(); const env = await runtimeEnv(); const bucket = env.BUCKET; if (!bucket) throw new Error("V5.1 soundscape requires the Factory media vault"); if (!env.ELEVENLABS_API_KEY) throw new Error("Connect ELEVENLABS_API_KEY in Factory Connections before generating the V5.1 soundscape");
  const definitions = [
    ...["Cold-open investigative pulse", "Hidden-network discovery", "Economic reveal and payoff"].map((label,index)=>({ role:"MUSIC" as const,index,label,duration:160,prompt:`Instrumental investigative documentary underscore for ${label.toLowerCase()}. Modern financial technology, restrained tension, clear pulse, no vocals, no melody that competes with narration, seamless editorial bed.` })),
    ...["quiet merchant checkout room tone", "subtle financial operations room ambience", "low data-center air and distant server texture", "calm bank office room tone"].map((prompt,index)=>({ role:"AMBIENCE" as const,index,label:`Ambience zone ${index+1}`,duration:24,prompt })),
    ...["contactless terminal confirmation click", "soft transaction data pulse", "clean route handoff whoosh", "subtle risk decision tick", "paper receipt movement", "clearing batch lock sound", "settlement arrival chime", "final definition reveal impact"].map((prompt,index)=>({ role:"SFX" as const,index,label:`Purposeful SFX ${index+1}`,duration:Math.min(3,1.1+index*.18),prompt })),
  ];
  let generated = 0;
  for (const item of definitions) {
    const id = `${projectId}-V51-${item.role}-${String(item.index + 1).padStart(2, "0")}`; const existing = (await db.select().from(evidenceRecords).where(eq(evidenceRecords.id, id)).limit(1))[0]; if (existing?.storageKey && existing.contentHash) continue;
    const endpoint = item.role === "MUSIC" ? "https://api.elevenlabs.io/v1/music?output_format=mp3_48000_192" : "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128"; const body = item.role === "MUSIC" ? { prompt:item.prompt,music_length_ms:item.duration*1000,force_instrumental:true,model_id:"music_v1" } : { text:item.prompt,duration_seconds:item.duration,loop:item.role === "AMBIENCE",prompt_influence:.65,model_id:"eleven_text_to_sound_v2" }; const response = await fetch(endpoint,{ method:"POST",headers:{ "xi-api-key":env.ELEVENLABS_API_KEY,"content-type":"application/json" },body:JSON.stringify(body),signal:AbortSignal.timeout(item.role === "MUSIC" ? 180000 : 60000) }); if (!response.ok) { const detail = await response.text().catch(()=>""); throw new Error(`ElevenLabs ${item.role.toLowerCase()} generation failed (${response.status})${detail ? `: ${detail.slice(0,180)}` : ""}`); } const bytes = new Uint8Array(await response.arrayBuffer()); if (!bytes.byteLength) throw new Error(`ElevenLabs returned an empty ${item.role.toLowerCase()} file`); const digest = await hash(bytes); const key = `evidence/${projectId}/v51/audio/${id}.mp3`;
    await bucket.put(key, bytes, { httpMetadata: { contentType: "audio/mpeg" }, customMetadata: { projectId, evidenceId: id, role: item.role, sha256: digest, provider: "ElevenLabs" } });
    await db.insert(evidenceRecords).values({ id, projectId, entityType: "AUDIO_ASSET", pipelineVersion: 5, lifecycleState: "BOUND", title: item.label, provider: "ElevenLabs", sourceUrl: `elevenlabs://generated/${id}`, retrievedAt: new Date().toISOString(), contentHash: digest, storageKey: key, mimeType: "audio/mpeg", sizeBytes: bytes.byteLength, licenseStatus: "PROVIDER_TERMS", commercialUseStatus: "ALLOWED", settingsJson: JSON.stringify({ role: item.role, position: item.index + 1, durationSeconds:item.duration, mixTargetLufs:item.role === "MUSIC" ? -24 : item.role === "AMBIENCE" ? -31 : -20, prompt:item.prompt,generatedByProvider:true,proceduralFallback:false,productionVersion:"5.1" }), revalidationStatus: "CURRENT", updatedAt: new Date().toISOString() }).onConflictDoUpdate({ target: evidenceRecords.id, set: { lifecycleState: "BOUND", contentHash: digest, storageKey: key, mimeType: "audio/mpeg", sizeBytes: bytes.byteLength, licenseStatus: "PROVIDER_TERMS", commercialUseStatus: "ALLOWED", settingsJson:JSON.stringify({ role:item.role,position:item.index+1,durationSeconds:item.duration,mixTargetLufs:item.role === "MUSIC" ? -24 : item.role === "AMBIENCE" ? -31 : -20,prompt:item.prompt,generatedByProvider:true,proceduralFallback:false,productionVersion:"5.1" }),updatedAt: new Date().toISOString() } });
    await db.insert(evidenceBindings).values({ id: `${projectId}-V51-${item.role}-BIND-${item.index + 1}`, projectId, fromRecordId: id, toRecordId: `${projectId}-V51-MASTER`, relationship: `${item.role}_FOR_MASTER`, status: "ACTIVE" }).onConflictDoNothing();
    generated += 1;
    break;
  }
  if (generated) await db.insert(workflowEvents).values({ projectId, toStatus: "V51_MASTER_PREFLIGHT", eventType: "V51_SOUNDSCAPE_BATCH_MATERIALIZED", summary: "V5.1 stored one resumable ElevenLabs soundscape asset with checksum, prompt and provider provenance" });
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params; const url = new URL(request.url); const db = await getDb();
    const assetId = url.searchParams.get("asset"); const audioId = url.searchParams.get("audio"); const recordId = assetId || audioId;
    if (recordId) { const record = (await db.select().from(evidenceRecords).where(eq(evidenceRecords.id, recordId)).limit(1))[0]; if (!record || record.projectId !== id || !record.storageKey || !record.contentHash) return new Response("Verified v5 evidence not found", { status: 404 }); return await serveObject(request, record.storageKey, record.mimeType || "application/octet-stream", record.sizeBytes); }
    return Response.json(await snapshot(id));
  } catch (error) { console.error("Master V5 GET failed", error); return Response.json({ error: "Master Render V5 could not be loaded" }, { status: 500 }); }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authorization = await authorizeWriteAccess(); if (authorization instanceof Response) return authorization;
    const { id } = await context.params; const url = new URL(request.url); const bucket = (await runtimeEnv()).BUCKET; if (!bucket) return Response.json({ error: "V5 media vault is unavailable" }, { status: 424 });
    if (url.searchParams.get("upload") === "part") {
      const uploadId = url.searchParams.get("uploadId") || ""; const part = Number(url.searchParams.get("part")); if (!validUploadId(uploadId) || !Number.isInteger(part) || part < 0 || part > 600) return Response.json({ error: "Invalid V5 upload part" }, { status: 400 });
      const bytes = new Uint8Array(await request.arrayBuffer()); if (!bytes.byteLength || bytes.byteLength > 4 * 1024 * 1024) return Response.json({ error: "V5 upload parts must be 4 MB or smaller" }, { status: 413 });
      await bucket.put(`v5-final-uploads/${id}/${uploadId}/${part}.part`, bytes, { httpMetadata: { contentType: "application/octet-stream" }, customMetadata: { projectId: id, uploadId, part: String(part), pipelineVersion: "5" } }); return Response.json({ ok: true, part });
    }
    const payload = await request.json() as { action?: "MATERIALIZE_SOUNDSCAPE" | "FINALIZE_V5" | "COMPLETE_V5_QA" | "REJECT_V5_QA"; uploadId?: string; chunkCount?: number; fileName?: string; sizeBytes?: number; renderId?: string; checks?: string[]; issues?: string[]; telemetry?: { productionVersion?:string;uniqueAssets?:number;visualFamilies?:number;averageSemanticScore?:number;audioPeak?:number;emphasisPeaks?:number;maxShotSeconds?:number } };
    if (payload.action === "MATERIALIZE_SOUNDSCAPE") { await materializeSoundscape(id); return Response.json({ ok: true, master: await snapshot(id) }); }
    const db = await getDb();
    if (payload.action === "COMPLETE_V5_QA") {
      const completed = new Set(payload.checks || []); const missing = QA_CHECKS.filter((check) => !completed.has(check)); if (missing.length) return Response.json({ error: `Full Playback QA incomplete: ${missing.join(", ")}` }, { status: 409 });
      const renderId = String(payload.renderId || ""); const render = (await db.select().from(videoRenders).where(eq(videoRenders.id, renderId)).limit(1))[0]; if (!render || render.projectId !== id || render.status !== "READY_FOR_V5_PLAYBACK_QA") return Response.json({ error: "This V5 master is not awaiting playback QA" }, { status: 409 });
      const qaRuns = await db.select().from(evidenceRecords).where(eq(evidenceRecords.projectId, id)); const latestAiQa = qaRuns.filter((record) => record.entityType === "PERCEPTUAL_QA_RUN").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]; const aiQaSettings = latestAiQa ? jsonObject(latestAiQa.settingsJson) : {}; if (!latestAiQa || aiQaSettings.decision !== "PASS" || aiQaSettings.renderId !== renderId) return Response.json({ error: "AI Perceptual QA must inspect this exact stored master and pass Maximum Quality thresholds before manual Full Playback QA can release it" }, { status: 409 });
      const evidenceId = `V5-RENDER-${render.id}`; const evidence = (await db.select().from(evidenceRecords).where(eq(evidenceRecords.id, evidenceId)).limit(1))[0]; if (!evidence) return Response.json({ error: "V5 master evidence is missing" }, { status: 409 });
      const prior = JSON.parse(render.gateResults) as Array<Record<string, unknown>>; await db.update(videoRenders).set({ status: "QA_PASSED", gateResults: JSON.stringify([...prior, ...QA_CHECKS.map((check) => ({ gate: `V5_${check}`, passed: true }))]) }).where(eq(videoRenders.id, render.id));
      await db.update(evidenceRecords).set({ lifecycleState: "AUDITED", revalidationStatus: "CURRENT", settingsJson: JSON.stringify({ ...jsonObject(evidence.settingsJson), fullPlaybackCompleted: true, technicalQa: "PASS", perceptualQa: "PASS", soundscapeQa: "PASS", auditedAt: new Date().toISOString() }), updatedAt: new Date().toISOString() }).where(eq(evidenceRecords.id, evidenceId));
      await db.insert(workflowEvents).values({ projectId: id, toStatus: "V5_MASTER_AUDITED", eventType: "V5_FULL_PLAYBACK_QA_PASSED", summary: "V5 master passed full playback, voice, sync, loudness, black-frame, rights, semantic-fit and soundscape checks" }); return Response.json({ ok: true, master: await snapshot(id) });
    }
    if (payload.action === "REJECT_V5_QA") { const renderId = String(payload.renderId || ""); const render = (await db.select().from(videoRenders).where(eq(videoRenders.id, renderId)).limit(1))[0]; if (!render || render.projectId !== id) return Response.json({ error: "V5 master not found" }, { status: 404 }); await db.update(videoRenders).set({ status: "V5_QA_REJECTED", gateResults: JSON.stringify([...(JSON.parse(render.gateResults) as Array<Record<string, unknown>>), { gate: "V5_PLAYBACK_REJECTED", passed: false, issues: payload.issues || [] }]) }).where(eq(videoRenders.id, render.id)); await db.insert(workflowEvents).values({ projectId: id, toStatus: "V5_MASTER_REPAIR", eventType: "V5_MASTER_REJECTED", summary: `V5 playback QA rejected: ${(payload.issues || []).join(", ")}` }); return Response.json({ ok: true, master: await snapshot(id) }); }
    if (payload.action !== "FINALIZE_V5") return Response.json({ error: "Unknown Master V5 action" }, { status: 400 });
    const current = await snapshot(id); const failed = Object.entries(current.gates).filter(([, passed]) => !passed).map(([gate]) => gate); if (failed.length) return Response.json({ error: `Master V5 preflight blocked: ${failed.join(", ")}` }, { status: 409 });
    const telemetry=payload.telemetry||{}; if(current.productionVersion==="5.1" || current.productionVersion==="5.2"){ const perceptualFailures=[...(Number(telemetry.uniqueAssets||0)<120?[`unique assets ${telemetry.uniqueAssets||0}/120`]:[]),...(Number(telemetry.visualFamilies||0)<14?[`visual families ${telemetry.visualFamilies||0}/14 minimum`]:[]),...(Number(telemetry.averageSemanticScore||0)<88?[`semantic score ${Number(telemetry.averageSemanticScore||0).toFixed(1)}/88`]:[]),...(Number(telemetry.audioPeak||0)<18?[`measured audio energy ${telemetry.audioPeak||0}/18`]:[]),...(Number(telemetry.emphasisPeaks||0)<7?[`emphasis peaks ${telemetry.emphasisPeaks||0}/7`]:[]),...(Number(telemetry.maxShotSeconds||99)>5.5?[`longest shot ${Number(telemetry.maxShotSeconds||0).toFixed(2)}s/5.5s max`]:[])]; if(perceptualFailures.length) return Response.json({ error:`V${current.productionVersion} measured preflight rejected: ${perceptualFailures.join(", ")}` },{ status:409 }); }
    const uploadId = payload.uploadId || ""; const chunks = Number(payload.chunkCount); if (!validUploadId(uploadId) || !Number.isInteger(chunks) || chunks < 1 || chunks > 600) return Response.json({ error: "Invalid V5 upload manifest" }, { status: 400 });
    const parts: Uint8Array[] = []; const keys: string[] = []; let total = 0; const readBatchSize = 16;
    for (let start = 0; start < chunks; start += readBatchSize) {
      const count = Math.min(readBatchSize, chunks - start);
      const batch = await Promise.all(Array.from({ length: count }, async (_, index) => {
        const part = start + index; const key = `v5-final-uploads/${id}/${uploadId}/${part}.part`; const object = await bucket.get(key);
        if (!object) throw new Error(`V5 upload part ${part + 1}/${chunks} is missing`);
        const bytes = new Uint8Array(object.arrayBuffer ? await object.arrayBuffer() : await new Response(object.body).arrayBuffer()); return { key, bytes };
      }));
      for (const item of batch) { parts.push(item.bytes); keys.push(item.key); total += item.bytes.byteLength; }
    }
    if (payload.sizeBytes && payload.sizeBytes !== total) return Response.json({ error: "V5 master size verification failed" }, { status: 409 }); if (total > 500 * 1024 * 1024) return Response.json({ error: "V5 master exceeds the 500 MB MVP ceiling" }, { status: 413 });
    const joined = new Uint8Array(total); let offset = 0; for (const part of parts) { joined.set(part, offset); offset += part.byteLength; } const digest = await hash(joined);
    const existing = await db.select().from(videoRenders).where(eq(videoRenders.projectId, id)).orderBy(desc(videoRenders.version)); const version = (existing[0]?.version || 0) + 1; const renderId = `${id}-V5-MASTER-${version}`; const name = safeName(payload.fileName || `${id}-master-v5-${version}.webm`); const key = `renders/${id}/v5/${renderId}-${name}`;
    await bucket.put(key, joined, { httpMetadata: { contentType: "video/webm" }, customMetadata: { projectId: id, renderId, version: String(version), pipelineVersion: "5", sha256: digest } });
    const productionVersion=current.productionVersion||"5.0"; const uniqueAssets=new Set(current.shots.map((shot)=>shot.asset?.id).filter(Boolean)).size; const gateResults = [{ gate: "pipelineVersion", passed: true, value: productionVersion }, { gate: "editorialShots", passed: true, value: String(current.shots.length) }, { gate: "uniqueAssets", passed: true, value: String(uniqueAssets) }, { gate: "singleVoice", passed: true, value: "12_STEMS" }, { gate: "soundscape", passed: true, value: `${current.audio.music.length}_MUSIC_${current.audio.ambience.length}_AMBIENCE_${current.audio.sfx.length}_SFX` }, { gate: "frameFit", passed: true, value: "1920x1080_COVER_SAFE" },{ gate:"measuredTelemetry",passed:true,value:JSON.stringify(telemetry)}];
    await db.insert(videoRenders).values({ id: renderId, projectId: id, version, name, storageKey: key, mimeType: "video/webm", sizeBytes: total, durationSeconds: 480, width: 1920, height: 1080, fps: 30, status: "READY_FOR_V5_PLAYBACK_QA", gateResults: JSON.stringify(gateResults) });
    await db.insert(evidenceRecords).values({ id: `V5-RENDER-${renderId}`, projectId: id, entityType: "RENDER_EVIDENCE", pipelineVersion: 5, lifecycleState: "RENDERED", title: `Master Render V${productionVersion} · version ${version}`, provider: `Frameflow V${productionVersion} browser compositor`, retrievedAt: new Date().toISOString(), contentHash: digest, storageKey: key, mimeType: "video/webm", sizeBytes: total, licenseStatus: "AGGREGATE_VERIFIED_INPUTS", commercialUseStatus: "ALLOWED", settingsJson: JSON.stringify({ renderId, renderPipelineVersion:productionVersion==="5.2"?52:productionVersion==="5.1"?51:5,productionVersion,width: 1920, height: 1080, fps: 30, durationSeconds: 480, editorialShots:current.shots.length, uniqueAssets,visualFamilies:new Set(current.shots.map((shot)=>shot.family)).size,telemetry,renderer: "BROWSER_REALTIME_MVP", fullPlaybackRequired: true }), revalidationStatus: "PENDING_PLAYBACK_QA", updatedAt: new Date().toISOString() });
    await db.insert(evidenceBindings).values({ id: `${id}-V5-RENDER-BIND-${version}`, projectId: id, fromRecordId: `V5-RENDER-${renderId}`, toRecordId: `${id}-V5-MASTER`, relationship: "MASTER_RENDER_OUTPUT", status: "ACTIVE" }).onConflictDoNothing();
    await db.update(videoProjects).set({ status: "RENDER_READY", progress: 97, nextAction: "Run V5 Full Playback QA", updatedAt: new Date().toISOString() }).where(eq(videoProjects.id, id)); await db.insert(workflowEvents).values({ projectId: id, toStatus: "V5_MASTER_RENDERED", eventType: "V5_MASTER_RENDERED", summary: `Master Render V5 version ${version} stored with SHA-256 evidence; Full Playback QA remains mandatory` }); await bucket.delete(keys);
    return Response.json({ ok: true, renderId, version, master: await snapshot(id) });
  } catch (error) { console.error("Master V5 POST failed", error); return Response.json({ error: error instanceof Error ? error.message : "Master Render V5 stopped safely" }, { status: 500 }); }
}
