import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { allocateGoldenMasterFrames, validateGoldenMaster, type GoldenMasterProbe, type GoldenMasterScan } from "../lib/golden-master-contract";

type Asset = { assetId: string; url: string; sha256: string; shotId?: string; temporalState?: string; durationSeconds?: number };
type RenderSpec = { jobId: string; goldenSequenceId: string; revision: number; canonicalDurationSeconds: number; output: { width: number; height: number; fps: number }; frames: Asset[]; audio: Asset; expectedSemanticSamples: number };

const baseUrl = String(process.env.FACTORY_BASE_URL || "").replace(/\/$/, ""), siteToken = String(process.env.FACTORY_SITE_AUTH_TOKEN || ""), executorToken = String(process.env.SEQUENTIAL_EXECUTOR_TOKEN || "");
const retainedOutput = String(process.env.GOLDEN_MASTER_OUTPUT_DIR || "");
if (!baseUrl || !siteToken || !executorToken) throw new Error("FACTORY_BASE_URL, FACTORY_SITE_AUTH_TOKEN and SEQUENTIAL_EXECUTOR_TOKEN are required");
const endpoint = `${baseUrl}/api/factory/sequential-production/quality`, headers = { "OAI-Sites-Authorization": `Bearer ${siteToken}`, "x-sequential-executor-token": executorToken };
const sha256 = (value: Uint8Array) => createHash("sha256").update(value).digest("hex");
const number = (value: unknown) => Number(value || 0);
const fraction = (value: unknown) => { const text = String(value || "0"), [a, b] = text.split("/").map(Number); return b ? a / b : a || 0; };
const encodeHeader = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

async function jsonRequest(method: string, body?: unknown) {
  const response = await fetch(endpoint, { method, headers: { ...headers, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(`${method} ${response.status} · ${JSON.stringify(payload)}`);
  return payload;
}

async function download(asset: Asset, path: string) {
  const response = await fetch(new URL(asset.url, baseUrl), { headers });
  if (!response.ok) throw new Error(`asset download ${response.status} · ${asset.assetId}`);
  const bytes = new Uint8Array(await response.arrayBuffer()), digest = sha256(bytes);
  if (digest !== asset.sha256) throw new Error(`asset checksum mismatch · ${asset.assetId}`);
  writeFileSync(path, bytes); return bytes;
}

function probe(path: string): GoldenMasterProbe & { audioDurationSeconds: number } {
  const raw = execFileSync("ffprobe", ["-v", "error", "-count_frames", "-show_entries", "stream=codec_type,codec_name,width,height,avg_frame_rate,nb_read_frames,sample_rate,channels,duration:format=duration", "-of", "json", path], { encoding: "utf8", maxBuffer: 4_000_000 });
  const parsed = JSON.parse(raw), streams = Array.isArray(parsed.streams) ? parsed.streams : [], video = streams.find((item: Record<string, unknown>) => item.codec_type === "video") || {}, audio = streams.find((item: Record<string, unknown>) => item.codec_type === "audio") || {};
  return { durationSeconds: number(parsed.format?.duration), width: number(video.width), height: number(video.height), videoCodec: String(video.codec_name || ""), averageFrameRate: fraction(video.avg_frame_rate), videoFrames: number(video.nb_read_frames), audioCodec: String(audio.codec_name || ""), audioSampleRate: number(audio.sample_rate), audioChannels: number(audio.channels), audioDurationSeconds: number(audio.duration || parsed.format?.duration) };
}

function render(spec: RenderSpec, frames: string[], audio: string, output: string) {
  const { counts: frameCounts } = allocateGoldenMasterFrames(spec.frames.map((frame) => number(frame.durationSeconds)), spec.canonicalDurationSeconds, spec.output.fps);
  const inputs = frames.flatMap((path) => ["-loop", "1", "-i", path]);
  inputs.push("-i", audio);
  const filters = frames.map((_, index) => {
    const phase = index % 3, segmentDuration = frameCounts[index] / spec.output.fps, dx = phase === 0 ? `(iw-ow)*(0.15+0.20*t/${segmentDuration.toFixed(6)})` : phase === 1 ? "(iw-ow)*(0.50+0.16*sin(t*0.9))" : `(iw-ow)*(0.82-0.20*t/${segmentDuration.toFixed(6)})`, dy = phase === 1 ? "(ih-oh)*(0.45+0.12*cos(t*0.8))" : "(ih-oh)*0.5";
    return `[${index}:v]scale=2048:1152:force_original_aspect_ratio=increase,crop=1920:1080:x='${dx}':y='${dy}',fps=${spec.output.fps},format=yuv420p,trim=end_frame=${frameCounts[index]},setpts=PTS-STARTPTS[v${index}]`;
  });
  const sequence = frames.map((_, index) => `[v${index}]`).join("");
  filters.push(`${sequence}concat=n=${frames.length}:v=1:a=0[outv]`);
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", ...inputs, "-filter_complex", filters.join(";"), "-map", "[outv]", "-map", `${frames.length}:a:0`, "-t", spec.canonicalDurationSeconds.toFixed(6), "-c:v", "libvpx-vp9", "-deadline", "good", "-cpu-used", "2", "-row-mt", "1", "-crf", "27", "-b:v", "0", "-r", String(spec.output.fps), "-c:a", "libopus", "-b:a", "128k", "-ar", "48000", "-ac", "2", "-y", output], { maxBuffer: 16_000_000 });
}

function extract(path: string, output: string, time: number) {
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-ss", time.toFixed(6), "-i", path, "-frames:v", "1", "-q:v", "3", "-y", output], { maxBuffer: 4_000_000 });
  return sha256(readFileSync(output));
}

function contactSheet(samplePaths: string[], labels: string[], output: string) {
  const inputs = samplePaths.flatMap((path) => ["-i", path]), filters = samplePaths.map((_, index) => `[${index}:v]scale=480:270,drawtext=text='${labels[index]}':x=12:y=12:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.72[v${index}]`), layout = samplePaths.map((_, index) => `${(index % 4) * 480}_${Math.floor(index / 4) * 270}`).join("|");
  filters.push(`${samplePaths.map((_, index) => `[v${index}]`).join("")}xstack=inputs=${samplePaths.length}:layout=${layout}:fill=0x071d18[out]`);
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", ...inputs, "-filter_complex", filters.join(";"), "-map", "[out]", "-frames:v", "1", "-q:v", "3", "-y", output], { maxBuffer: 8_000_000 });
}

function diagnose(master: string) {
  const result = spawnSync("ffmpeg", ["-hide_banner", "-i", master, "-vf", "blackdetect=d=0.02:pix_th=0.02,freezedetect=n=-48dB:d=0.25", "-an", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 16_000_000 }), stderr = String(result.stderr || "");
  if (result.status !== 0) throw new Error(`full-frame decode failed · ${stderr.slice(-500)}`);
  const black = [...stderr.matchAll(/black_duration:([0-9.]+)/g)].map((match) => number(match[1])), freeze = [...stderr.matchAll(/freeze_duration: ([0-9.]+)/g)].map((match) => number(match[1]));
  return { fullFrameScan: true, blackFrameSeconds: black.length ? Math.max(...black) : 0, maxFrozenFrameSeconds: freeze.length ? Math.max(...freeze) : 0 };
}

async function uploadMaster(spec: RenderSpec, path: string, masterProbe: GoldenMasterProbe, scan: GoldenMasterScan) {
  const bytes = readFileSync(path), response = await fetch(`${endpoint}?job=${encodeURIComponent(spec.jobId)}&kind=master`, { method: "PUT", headers: { ...headers, "content-type": "video/webm", "content-length": String(bytes.byteLength), "x-golden-master-sha256": sha256(bytes), "x-golden-master-probe": encodeHeader(masterProbe), "x-golden-master-scan": encodeHeader(scan) }, body: bytes });
  if (!response.ok) throw new Error(`master upload ${response.status} · ${await response.text()}`);
  return response.json();
}

async function uploadSheet(spec: RenderSpec, path: string, index: number, state: string) {
  const bytes = readFileSync(path), response = await fetch(`${endpoint}?job=${encodeURIComponent(spec.jobId)}&kind=contact-sheet&index=${index}`, { method: "PUT", headers: { ...headers, "content-type": "image/jpeg", "content-length": String(bytes.byteLength), "x-golden-master-sha256": sha256(bytes), "x-golden-sheet-metadata": encodeHeader({ index, state, order: "shot ascending row-major", decodedFromMaster: true }) }, body: bytes });
  if (!response.ok) throw new Error(`contact-sheet upload ${response.status} · ${await response.text()}`);
}

const work = mkdtempSync(join(tmpdir(), "golden-master-"));
try {
  const payload = await jsonRequest("POST", { action: "REQUEST_GOLDEN_MASTER_RENDER" }), spec = payload.renderSpec as RenderSpec;
  if (!spec?.frames?.length || !spec.audio) throw new Error("render specification is incomplete");
  const framePaths: string[] = [];
  for (const [index, asset] of spec.frames.entries()) { const path = join(work, `frame-${String(index).padStart(2, "0")}.png`); await download(asset, path); framePaths.push(path); }
  const audioPath = join(work, "audience-mix.wav"); await download(spec.audio, audioPath);
  const masterPath = join(work, "golden-master.webm"); render(spec, framePaths, audioPath, masterPath);
  const masterProbe = probe(masterPath), samplePaths: string[] = [], sampleHashes: string[] = []; let cursor = 0;
  for (const [index, frame] of spec.frames.entries()) { const duration = number(frame.durationSeconds), samplePath = join(work, `decoded-${String(index).padStart(2, "0")}.jpg`); sampleHashes.push(extract(masterPath, samplePath, cursor + duration / 2)); samplePaths.push(samplePath); cursor += duration; }
  const diagnostic = diagnose(masterPath), scan: GoldenMasterScan = { fullFrameScan: diagnostic.fullFrameScan, framesDecoded: masterProbe.videoFrames, blackFrameSeconds: diagnostic.blackFrameSeconds, maxFrozenFrameSeconds: diagnostic.maxFrozenFrameSeconds, decodedSemanticSamples: sampleHashes.length, uniqueSemanticSampleHashes: new Set(sampleHashes).size, expectedSemanticSamples: spec.expectedSemanticSamples, audioVideoDeltaSeconds: masterProbe.durationSeconds - masterProbe.audioDurationSeconds };
  const validation = validateGoldenMaster(masterProbe, scan, spec.canonicalDurationSeconds, spec.output.fps); if (!validation.pass) throw new Error(`master validation failed · ${validation.failures.join(",")} · ${JSON.stringify({ probe: masterProbe, scan })}`);
  await uploadMaster(spec, masterPath, masterProbe, scan);
  for (let stateIndex = 0; stateIndex < 3; stateIndex++) { const indexes = spec.frames.map((_, index) => index).filter((index) => index % 3 === stateIndex), sheetPath = join(work, `sheet-${stateIndex + 1}.jpg`), state = ["ENTRY", "MIDPOINT", "EXIT"][stateIndex]; contactSheet(indexes.map((index) => samplePaths[index]), indexes.map((index) => `${spec.frames[index].shotId} ${state}`), sheetPath); await uploadSheet(spec, sheetPath, stateIndex + 1, state); }
  const outputDir = retainedOutput ? resolve(retainedOutput) : join(tmpdir(), "youtube-ai-factory-golden-master"); mkdirSync(outputDir, { recursive: true }); const retained = join(outputDir, `golden-r${spec.revision}.webm`); writeFileSync(retained, readFileSync(masterPath));
  console.log(JSON.stringify({ outcome: "GOLDEN_MASTER_QA_READY", jobId: spec.jobId, revision: spec.revision, masterPath: retained, sha256: sha256(readFileSync(retained)), probe: masterProbe, scan }));
} finally { rmSync(work, { recursive: true, force: true }); }
