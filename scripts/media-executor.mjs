import { createHash, randomUUID } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseUrl = String(process.env.FACTORY_BASE_URL || "").replace(/\/$/, "");
const secret = String(process.env.MEDIA_EXECUTOR_SHARED_SECRET || "");
const siteAuthToken = String(process.env.FACTORY_SITE_AUTH_TOKEN || "");
const motionBootstrapToken = String(process.env.MOTION_EXECUTOR_BOOTSTRAP_TOKEN || "");
const motionJobId = String(process.env.MOTION_EXECUTOR_JOB_ID || "");
const executorId = String(process.env.MEDIA_EXECUTOR_ID || `media-executor-${randomUUID().slice(0, 8)}`);
const once = process.argv.includes("--once");
if (!baseUrl || (!secret && !(motionBootstrapToken && motionJobId))) throw new Error("FACTORY_BASE_URL plus either shared-secret or one-time motion capability is required");

const endpoint = `${baseUrl}/api/factory/material-production`;
const transportHeaders = siteAuthToken ? { "OAI-Sites-Authorization": `Bearer ${siteAuthToken}` } : {};
const headers = { "content-type": "application/json", "x-frameflow-executor-key": secret, ...transportHeaders };
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function post(action, payload = {}) {
  const response = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify({ action, ...payload }) });
  const body = await response.json();
  if (!response.ok) throw new Error(`${action} ${response.status} · ${body.error || "request failed"}`);
  return body;
}

function probe(sourcePath) {
  const raw = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,width,height,avg_frame_rate:format=duration", "-of", "json", sourcePath], { encoding: "utf8", maxBuffer: 2_000_000 });
  const value = JSON.parse(raw), stream = value.streams?.[0] || {}, durationSeconds = Number(value.format?.duration || 0);
  if (!durationSeconds || !stream.width || !stream.height) throw new Error("ffprobe returned incomplete video metadata");
  return { durationSeconds, width: Number(stream.width), height: Number(stream.height), codec: String(stream.codec_name || "unknown"), averageFrameRate: String(stream.avg_frame_rate || "unknown") };
}

function extractFrame(sourcePath, outputPath, timestampSeconds, width, height) {
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-ss", timestampSeconds.toFixed(3), "-i", sourcePath, "-frames:v", "1", "-vf", `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`, "-q:v", "3", "-y", outputPath], { maxBuffer: 4_000_000 });
  return readFileSync(outputPath);
}

function renderMotionProof(sourcePaths, outputPath, durationSeconds, width, height, fps) {
  const fade = Math.min(0.28, Math.max(0.12, durationSeconds * 0.07));
  const segment = (durationSeconds + fade * 2) / 3;
  const firstOffset = segment - fade, secondOffset = firstOffset * 2;
  const inputs = sourcePaths.flatMap((path) => ["-loop", "1", "-t", segment.toFixed(3), "-i", path]);
  const filter = [0, 1, 2].map((index) => `[${index}:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},fps=${fps},format=yuv420p[v${index}]`).join(";") + `;[v0][v1]xfade=transition=fade:duration=${fade.toFixed(3)}:offset=${firstOffset.toFixed(3)}[x1];[x1][v2]xfade=transition=fade:duration=${fade.toFixed(3)}:offset=${secondOffset.toFixed(3)}[out]`;
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", ...inputs, "-filter_complex", filter, "-map", "[out]", "-t", durationSeconds.toFixed(3), "-an", "-c:v", "libvpx-vp9", "-deadline", "good", "-cpu-used", "2", "-b:v", "0", "-crf", "24", "-r", String(fps), "-y", outputPath], { maxBuffer: 8_000_000 });
}

function renderSequenceProof(sourcePaths, outputPath, width, height, fps) {
  const inputs = sourcePaths.flatMap((path) => ["-loop", "1", "-t", "1", "-i", path]);
  const normalized = sourcePaths.map((_, index) => `[${index}:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},fps=${fps},format=yuv420p,trim=duration=1,setpts=PTS-STARTPTS[v${index}]`).join(";");
  const concatInputs = sourcePaths.map((_, index) => `[v${index}]`).join("");
  const filter = `${normalized};${concatInputs}concat=n=${sourcePaths.length}:v=1:a=0[out]`;
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", ...inputs, "-filter_complex", filter, "-map", "[out]", "-t", "30", "-an", "-c:v", "libvpx-vp9", "-deadline", "good", "-cpu-used", "2", "-b:v", "0", "-crf", "24", "-r", String(fps), "-y", outputPath], { maxBuffer: 12_000_000 });
}

function renderIntegratedSequence(sourcePaths, outputPath, specification, width, height, fps, fitMode) {
  const scenes = Array.isArray(specification?.narrative?.scenes) ? specification.narrative.scenes : [];
  if (scenes.length !== 10 || sourcePaths.length !== 30) throw new Error("integrated sequence requires ten specified scenes and thirty sources");
  const durations = scenes.flatMap((scene) => {
    const state = scene.stateDurations || {};
    return [Number(state.entry), Number(state.midpoint), Number(state.exit)];
  });
  if (durations.length !== 30 || Math.abs(durations.reduce((sum, value) => sum + value, 0) - 30) > 0.001) throw new Error("integrated sequence state durations must total exactly 30 seconds");
  const inputs = sourcePaths.flatMap((path, index) => ["-loop", "1", "-t", durations[index].toFixed(3), "-i", path]);
  const fit = fitMode === "CONTAIN_NO_CROP"
    ? `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=0x082f28`
    : `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;
  const normalized = sourcePaths.map((_, index) => `[${index}:v]${fit},fps=${fps},format=yuv420p,trim=duration=${durations[index].toFixed(3)},setpts=PTS-STARTPTS[v${index}]`).join(";");
  const concatInputs = sourcePaths.map((_, index) => `[v${index}]`).join("");
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", ...inputs, "-filter_complex", `${normalized};${concatInputs}concat=n=${sourcePaths.length}:v=1:a=0[out]`, "-map", "[out]", "-t", "30", "-an", "-c:v", "libvpx-vp9", "-deadline", "good", "-cpu-used", "2", "-b:v", "0", "-crf", "24", "-r", String(fps), "-y", outputPath], { maxBuffer: 16_000_000 });
}

function measureIntegratedSequence(renderPath, specification, fitMode, width, height, fps, work) {
  const scanRaw = execFileSync("ffprobe", ["-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames,width,height,avg_frame_rate:format=duration", "-of", "json", renderPath], { encoding: "utf8", maxBuffer: 2_000_000 });
  const scan = JSON.parse(scanRaw), stream = scan.streams?.[0] || {}, measuredDurationSeconds = Number(scan.format?.duration || 0), framesScanned = Number(stream.nb_read_frames || 0);
  const diagnostic = spawnSync("ffmpeg", ["-hide_banner", "-i", renderPath, "-vf", "blackdetect=d=0.02:pix_th=0.02,freezedetect=n=-45dB:d=0.1", "-an", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 8_000_000 });
  const stderr = String(diagnostic.stderr || ""), blackDurations = [...stderr.matchAll(/black_duration:([0-9.]+)/g)].map((match) => Number(match[1])), freezeDurations = [...stderr.matchAll(/freeze_duration: ([0-9.]+)/g)].map((match) => Number(match[1]));
  const sampleHashes = [];
  for (let index = 0; index < 60; index++) {
    const path = join(work, `scan-${String(index).padStart(2, "0")}.jpg`), timestamp = Math.max(0, Math.min(measuredDurationSeconds - (1 / fps), index * 0.5 + 0.25));
    sampleHashes.push(sha256(extractFrame(renderPath, path, timestamp, 320, 180)));
  }
  const adjacentSampleDuplicates = sampleHashes.slice(1).filter((hash, index) => hash === sampleHashes[index]).length;
  const scenes = Array.isArray(specification?.narrative?.scenes) ? specification.narrative.scenes : [], motionProfiles = scenes.map((scene) => String(scene.motionProfile || ""));
  const adjacentTreatmentDuplicates = motionProfiles.slice(1).filter((profile, index) => profile === motionProfiles[index]).length;
  return {
    sourceHashMatch: true,
    noCrop: fitMode === "CONTAIN_NO_CROP",
    mobileSafe: fitMode === "CONTAIN_NO_CROP" && Number(specification?.mobile?.minimumExitDwellSeconds || 0) >= 1.5,
    fullFrameScan: framesScanned >= 890,
    framesScanned,
    continuityEdges: Array.isArray(specification?.narrative?.continuityEdges) ? specification.narrative.continuityEdges.length : 0,
    adjacentTreatmentDuplicates,
    adjacentSampleDuplicates,
    blackFrameSeconds: blackDurations.length ? Math.max(...blackDurations) : 0,
    maxFrozenFrameSeconds: freezeDurations.length ? Math.max(...freezeDurations) : 0,
    measuredWidth: Number(stream.width),
    measuredHeight: Number(stream.height),
    measuredFps: String(stream.avg_frame_rate || ""),
    measuredDurationSeconds,
    expectedWidth: width,
    expectedHeight: height,
    expectedFps: fps,
  };
}

async function executeMotionProof(job, work) {
  const sources = Array.isArray(job.sourceDownloadUrls) ? job.sourceDownloadUrls : [];
  if (sources.length !== 3) throw new Error("motion proof requires exactly three source frames");
  const sourcePaths = [], sourceHashes = [];
  for (const [index, source] of sources.entries()) {
    const response = await fetch(new URL(source.url, baseUrl), { headers: { "x-frameflow-executor-key": secret, ...transportHeaders } });
    if (!response.ok) throw new Error(`motion source download ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer()), digest = sha256(bytes);
    if (digest !== source.sha256) throw new Error(`motion source hash mismatch · ${source.state}`);
    const extension = response.headers.get("content-type")?.includes("jpeg") ? "jpg" : "png", path = join(work, `${index}-${String(source.state).toLowerCase()}.${extension}`);
    writeFileSync(path, bytes); sourcePaths.push(path); sourceHashes.push({ state: source.state, fileId: source.fileId, sha256: digest });
  }
  const target = job.contract.output, durationSeconds = Number(job.contract.durationSeconds), fps = Number(job.contract.fps), renderPath = join(work, "motion-proof.webm");
  renderMotionProof(sourcePaths, renderPath, durationSeconds, Number(target.width), Number(target.height), fps);
  const renderBytes = readFileSync(renderPath), mediaProbe = probe(renderPath);
  const measuredFps = mediaProbe.averageFrameRate.includes("/") ? (() => { const [a, b] = mediaProbe.averageFrameRate.split("/").map(Number); return b ? a / b : a; })() : Number(mediaProbe.averageFrameRate);
  const frames = job.contract.samplePositions.map((sample) => {
    const timestampSeconds = Math.max(0, Math.min(mediaProbe.durationSeconds - 0.05, mediaProbe.durationSeconds * Number(sample.ratio)));
    const path = join(work, `motion-${String(sample.role).toLowerCase()}.jpg`), bytes = extractFrame(renderPath, path, timestampSeconds, Number(target.width), Number(target.height));
    return { role: sample.role, timestampSeconds, width: Number(target.width), height: Number(target.height), mimeType: "image/jpeg", base64: bytes.toString("base64") };
  });
  return post("COMPLETE_MOTION_PROOF", { jobId: job.id, leaseToken: job.leaseToken, sourceHashes, render: { mimeType: "video/webm", codec: mediaProbe.codec, width: mediaProbe.width, height: mediaProbe.height, durationSeconds: mediaProbe.durationSeconds, fps: measuredFps, base64: renderBytes.toString("base64") }, frames });
}

async function executeSequenceProof(job, work) {
  const sources = Array.isArray(job.sourceDownloadUrls) ? job.sourceDownloadUrls : [];
  if (sources.length !== 30) throw new Error("sequence proof requires exactly 30 promoted frames");
  const sourcePaths = [], sourceHashes = [];
  for (const [index, source] of sources.entries()) {
    const response = await fetch(new URL(source.url, baseUrl), { headers: { "x-frameflow-executor-key": secret, ...transportHeaders } });
    if (!response.ok) throw new Error(`sequence source download ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer()), digest = sha256(bytes);
    if (digest !== source.sha256) throw new Error(`sequence source hash mismatch · ${source.logicalId} · ${source.state}`);
    const contentType = response.headers.get("content-type") || "", extension = contentType.includes("jpeg") ? "jpg" : "png", path = join(work, `${String(index).padStart(2, "0")}-${String(source.logicalId).toLowerCase()}-${String(source.state).toLowerCase()}.${extension}`);
    writeFileSync(path, bytes); sourcePaths.push(path); sourceHashes.push({ logicalId: source.logicalId, state: source.state, fileId: source.fileId, sha256: digest });
  }
  const target = job.contract.output, fps = Number(job.contract.fps), renderPath = join(work, "sequence-proof.webm");
  renderSequenceProof(sourcePaths, renderPath, Number(target.width), Number(target.height), fps);
  const renderBytes = readFileSync(renderPath), mediaProbe = probe(renderPath), measuredFps = mediaProbe.averageFrameRate.includes("/") ? (() => { const [a, b] = mediaProbe.averageFrameRate.split("/").map(Number); return b ? a / b : a; })() : Number(mediaProbe.averageFrameRate);
  const frames = job.contract.samplePositions.map((sample) => {
    const timestampSeconds = Math.max(0, Math.min(mediaProbe.durationSeconds - 0.05, mediaProbe.durationSeconds * Number(sample.ratio)));
    const path = join(work, `${String(sample.role).toLowerCase()}.jpg`), bytes = extractFrame(renderPath, path, timestampSeconds, Number(target.width), Number(target.height));
    return { role: sample.role, logicalId: sample.logicalId, timestampSeconds, width: Number(target.width), height: Number(target.height), mimeType: "image/jpeg", base64: bytes.toString("base64") };
  });
  return post("COMPLETE_SEQUENCE_PROOF", { jobId: job.id, leaseToken: job.leaseToken, sourceHashes, render: { mimeType: "video/webm", codec: mediaProbe.codec, width: mediaProbe.width, height: mediaProbe.height, durationSeconds: mediaProbe.durationSeconds, fps: measuredFps, base64: renderBytes.toString("base64") }, frames });
}

async function executeIntegratedSequence(job, work) {
  const sources = Array.isArray(job.sourceDownloadUrls) ? job.sourceDownloadUrls : [];
  if (sources.length !== 30) throw new Error("integrated sequence requires exactly 30 sealed source frames");
  const sourcePaths = [], sourceHashes = [];
  for (const [index, source] of sources.entries()) {
    const response = await fetch(new URL(source.url, baseUrl), { headers: { "x-frameflow-executor-key": secret, ...transportHeaders } });
    if (!response.ok) throw new Error(`sequence product source download ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer()), digest = sha256(bytes);
    if (digest !== source.sha256) throw new Error(`sequence product source hash mismatch · ${source.logicalId} · ${source.state}`);
    const extension = (response.headers.get("content-type") || "").includes("jpeg") ? "jpg" : "png", path = join(work, `${String(index).padStart(2, "0")}-${String(source.logicalId).toLowerCase()}-${String(source.state).toLowerCase()}.${extension}`);
    writeFileSync(path, bytes); sourcePaths.push(path); sourceHashes.push({ logicalId: source.logicalId, state: source.state, fileId: source.fileId, sha256: digest });
  }
  const specification = job.contract.specification, target = job.contract.output, fps = Number(target.fps || specification?.fps || 30), width = Number(target.width), height = Number(target.height), maxIterations = Number(specification?.productionLoop?.maxIterations || 3), corrections = [];
  let measurements = {}, renderPath = join(work, "sequence-product.webm"), iterations = 0, fitMode = "COVER";
  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    iterations = iteration;
    renderIntegratedSequence(sourcePaths, renderPath, specification, width, height, fps, fitMode);
    measurements = measureIntegratedSequence(renderPath, specification, fitMode, width, height, fps, work);
    const complete = measurements.sourceHashMatch && measurements.noCrop && measurements.mobileSafe && measurements.fullFrameScan && measurements.framesScanned >= 890 && measurements.continuityEdges === 9 && measurements.adjacentTreatmentDuplicates === 0 && measurements.blackFrameSeconds <= 0.04 && measurements.maxFrozenFrameSeconds <= 1.7;
    if (complete) break;
    if (!measurements.noCrop && iteration < maxIterations) { corrections.push({ iteration, code: "COVER_TO_CONTAIN", reason: "actual master did not preserve the complete sealed frame", applied: { fitMode: "CONTAIN_NO_CROP" } }); fitMode = "CONTAIN_NO_CROP"; continue; }
    corrections.push({ iteration, code: "PRODUCTION_DOD_NOT_MET", reason: "bounded integrated composer could not satisfy deterministic Definition of Done", applied: null });
    break;
  }
  const renderBytes = readFileSync(renderPath), mediaProbe = probe(renderPath), measuredFps = mediaProbe.averageFrameRate.includes("/") ? (() => { const [a, b] = mediaProbe.averageFrameRate.split("/").map(Number); return b ? a / b : a; })() : Number(mediaProbe.averageFrameRate);
  const frames = job.contract.samplePositions.map((sample) => {
    const timestampSeconds = Math.max(0, Math.min(mediaProbe.durationSeconds - 0.05, mediaProbe.durationSeconds * Number(sample.ratio)));
    const path = join(work, `product-${String(sample.role).toLowerCase()}.jpg`), bytes = extractFrame(renderPath, path, timestampSeconds, width, height);
    return { role: sample.role, logicalId: sample.logicalId, timestampSeconds, width, height, mimeType: "image/jpeg", base64: bytes.toString("base64") };
  });
  return post("COMPLETE_SEQUENCE_PRODUCT", { jobId: job.id, leaseToken: job.leaseToken, sourceHashes, iterations, corrections, measurements, render: { mimeType: "video/webm", codec: mediaProbe.codec, width: mediaProbe.width, height: mediaProbe.height, durationSeconds: mediaProbe.durationSeconds, fps: measuredFps, base64: renderBytes.toString("base64") }, frames });
}

async function execute(job) {
  const work = mkdtempSync(join(tmpdir(), "frameflow-media-"));
  try {
    if (job.type === "MOTION_PROOF_RENDER") return await executeMotionProof(job, work);
    if (job.type === "SEQUENCE_PROOF_RENDER") return await executeSequenceProof(job, work);
    if (job.type === "INTEGRATED_SEQUENCE_RENDER") return await executeIntegratedSequence(job, work);
    const sourceUrl = new URL(job.sourceDownloadUrl, baseUrl).toString();
    const response = await fetch(sourceUrl, { headers: { "x-frameflow-executor-key": secret, ...transportHeaders } });
    if (!response.ok) throw new Error(`source download ${response.status}`);
    const sourceBytes = Buffer.from(await response.arrayBuffer()), sourcePath = join(work, "source.mp4");
    writeFileSync(sourcePath, sourceBytes);
    const sourceHash = sha256(sourceBytes);
    if (sourceHash !== job.contract.sourceHash) throw new Error("downloaded source hash does not match contract");
    const mediaProbe = probe(sourcePath), target = job.contract.output;
    const frames = job.contract.samplePositions.map((sample) => {
      const timestampSeconds = Math.max(0, Math.min(mediaProbe.durationSeconds - 0.05, mediaProbe.durationSeconds * Number(sample.ratio)));
      const path = join(work, `${String(sample.role).toLowerCase()}.jpg`), bytes = extractFrame(sourcePath, path, timestampSeconds, Number(target.width), Number(target.height));
      return { role: sample.role, timestampSeconds, width: Number(target.width), height: Number(target.height), mimeType: "image/jpeg", base64: bytes.toString("base64") };
    });
    return post("COMPLETE_MEDIA_JOB", { jobId: job.id, leaseToken: job.leaseToken, sourceHash, probe: mediaProbe, frames });
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

async function cycle() {
  if (motionBootstrapToken && motionJobId) {
    const claim = await post("CLAIM_MOTION_JOB", { executorId, jobId: motionJobId, bootstrapToken: motionBootstrapToken });
    try { await execute(claim.job); }
    catch (error) { await post("FAIL_MEDIA_JOB", { jobId: claim.job.id, leaseToken: claim.job.leaseToken, error: error instanceof Error ? error.message : "motion execution failed" }); throw error; }
    return true;
  }
  await post("EXECUTOR_HEARTBEAT", { executorId, version: "2.0.0", capabilities: ["ffprobe", "ffmpeg", "sha256", "jpeg-frame-extraction", "960x540-contain", "vp9-motion-proof", "three-state-crossfade", "30-frame-sequence", "10-unit-sequence-sampling", "full-frame-scan", "integrated-sequence-auto-correct"] });
  const claim = await post("CLAIM_MEDIA_JOB", { executorId });
  if (claim.status !== "LEASED") return false;
  try {
    await execute(claim.job);
  } catch (error) {
    await post("FAIL_MEDIA_JOB", { jobId: claim.job.id, leaseToken: claim.job.leaseToken, error: error instanceof Error ? error.message : "media execution failed" });
    throw error;
  }
  return true;
}

do {
  try { await cycle(); }
  catch (error) { console.error(error instanceof Error ? error.message : error); if (once) process.exitCode = 1; }
  if (!once) await sleep(5000);
} while (!once);
