import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
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

async function execute(job) {
  const work = mkdtempSync(join(tmpdir(), "frameflow-media-"));
  try {
    if (job.type === "MOTION_PROOF_RENDER") return await executeMotionProof(job, work);
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
  await post("EXECUTOR_HEARTBEAT", { executorId, version: "1.1.0", capabilities: ["ffprobe", "ffmpeg", "sha256", "jpeg-frame-extraction", "960x540-cover", "vp9-motion-proof", "three-state-crossfade"] });
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
