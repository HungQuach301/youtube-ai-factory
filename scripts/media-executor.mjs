import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseUrl = String(process.env.FACTORY_BASE_URL || "").replace(/\/$/, "");
const secret = String(process.env.MEDIA_EXECUTOR_SHARED_SECRET || "");
const executorId = String(process.env.MEDIA_EXECUTOR_ID || `media-executor-${randomUUID().slice(0, 8)}`);
const once = process.argv.includes("--once");
if (!baseUrl || !secret) throw new Error("FACTORY_BASE_URL and MEDIA_EXECUTOR_SHARED_SECRET are required");

const endpoint = `${baseUrl}/api/factory/material-production`;
const headers = { "content-type": "application/json", "x-frameflow-executor-key": secret };
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

async function execute(job) {
  const work = mkdtempSync(join(tmpdir(), "frameflow-media-"));
  try {
    const sourceUrl = new URL(job.sourceDownloadUrl, baseUrl).toString();
    const response = await fetch(sourceUrl, { headers: { "x-frameflow-executor-key": secret } });
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
  await post("EXECUTOR_HEARTBEAT", { executorId, version: "1.0.0", capabilities: ["ffprobe", "ffmpeg", "sha256", "jpeg-frame-extraction", "960x540-cover"] });
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
