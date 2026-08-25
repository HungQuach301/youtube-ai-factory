import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";

const PACKAGE_VERSION = "FACTORY_PIXEL_VIDEO_COMPOSITOR_PACKAGE_V1";
const WORKER_VERSION = "FACTORY_PIXEL_VIDEO_COMPOSITOR_EXECUTOR_V1";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

const packagePath = argument("--package"), outputPath = argument("--output");
if (!packagePath || !outputPath) throw new Error("usage: factory-pixel-video-compositor.mjs --package <package.json> --output <canary.webm>");
const packageAbsolutePath = resolve(packagePath), packageDirectory = dirname(packageAbsolutePath);

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const exactFile = (path, expectedHash) => {
  const absolutePath = isAbsolute(path) ? path : resolve(packageDirectory, path), bytes = readFileSync(absolutePath);
  const hash = sha256(bytes);
  if (hash !== expectedHash) throw new Error(`exact input hash mismatch: ${basename(path)}`);
  return { path: absolutePath, hash, byteSize: bytes.byteLength };
};
const integer = (value, label) => {
  const result = Number(value);
  if (!Number.isSafeInteger(result)) throw new Error(`${label} must be an integer`);
  return result;
};

const pack = JSON.parse(readFileSync(packageAbsolutePath, "utf8"));
if (pack.contractVersion !== PACKAGE_VERSION) throw new Error("unsupported compositor package contract");
const tapeFile = exactFile(pack.renderTape.path, pack.renderTape.sha256);
const tape = JSON.parse(readFileSync(tapeFile.path, "utf8"));
const frameStart = integer(pack.frameRange?.frameStart, "frameStart"), frameEndExclusive = integer(pack.frameRange?.frameEndExclusive, "frameEndExclusive");
const width = integer(pack.output?.width, "width"), height = integer(pack.output?.height, "height");
const fpsNumerator = integer(pack.output?.frameRateNumerator, "frameRateNumerator"), fpsDenominator = integer(pack.output?.frameRateDenominator, "frameRateDenominator");
const frameCount = frameEndExclusive - frameStart, durationMs = Math.round(frameCount * fpsDenominator * 1000 / fpsNumerator);
if (frameStart < Number(tape.frameRange?.startFrame) || frameEndExclusive > Number(tape.frameRange?.endFrameExclusive)) throw new Error("package frame range is outside the exact render tape");
if (durationMs < 60_000 || durationMs > 90_000) throw new Error("integrated canary must be 60-90 seconds");
if (width !== Number(tape.canvas?.width) || height !== Number(tape.canvas?.height)) throw new Error("package canvas differs from the exact render tape");
if (width < 320 || width > 3840 || height < 180 || height > 2160 || fpsNumerator <= 0 || fpsDenominator <= 0) throw new Error("invalid output geometry or frame rate");
const segments = Array.isArray(pack.segments) ? pack.segments : [];
if (!segments.length) throw new Error("at least one sealed segment is required");
let cursor = frameStart;
const sealed = segments.map((segment, index) => {
  const startFrame = integer(segment.startFrame, `segment ${index} startFrame`), endFrameExclusive = integer(segment.endFrameExclusive, `segment ${index} endFrameExclusive`);
  if (startFrame !== cursor || endFrameExclusive <= startFrame) throw new Error(`segment ${index} breaks complete contiguous coverage`);
  cursor = endFrameExclusive;
  if (!["SOURCE", "MAKE", "HYBRID"].includes(segment.route)) throw new Error(`segment ${index} route is invalid`);
  if (!["PUSH_IN", "PAN_LEFT", "PAN_RIGHT", "PULL_OUT"].includes(segment.motionProfile)) throw new Error(`segment ${index} motion profile is invalid`);
  if (index && segments[index - 1].motionProfile === segment.motionProfile) throw new Error("adjacent segments may not reuse the same motion profile");
  return { ...segment, startFrame, endFrameExclusive, frames: endFrameExclusive - startFrame, source: exactFile(segment.sourceFrame.path, segment.sourceFrame.sha256) };
});
if (cursor !== frameEndExclusive) throw new Error("segments do not cover the complete canary range");

const fps = `${fpsNumerator}/${fpsDenominator}`, inputs = [], filters = [];
const zoom = {
  PUSH_IN: "min(zoom+0.0008,1.08)",
  PULL_OUT: "if(eq(on,1),1.08,max(1.0,zoom-0.0008))",
  PAN_LEFT: "1.06",
  PAN_RIGHT: "1.06",
};
sealed.forEach((segment, index) => {
  inputs.push("-loop", "1", "-framerate", fps, "-i", segment.source.path);
  const x = segment.motionProfile === "PAN_LEFT" ? "max(0,iw-iw/zoom-(on*iw*0.00002))" : segment.motionProfile === "PAN_RIGHT" ? "min(iw-iw/zoom,on*iw*0.00002)" : "iw/2-(iw/zoom/2)";
  filters.push(`[${index}:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},zoompan=z='${zoom[segment.motionProfile]}':x='${x}':y='ih/2-(ih/zoom/2)':d=${segment.frames}:s=${width}x${height}:fps=${fps},trim=end_frame=${segment.frames},setpts=N/(${fps}*TB),format=yuv420p[v${index}]`);
});
filters.push(`${sealed.map((_, index) => `[v${index}]`).join("")}concat=n=${sealed.length}:v=1:a=0[out]`);

execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...inputs, "-filter_complex", filters.join(";"), "-map", "[out]", "-frames:v", String(frameCount), "-an", "-c:v", "libvpx-vp9", "-deadline", "good", "-cpu-used", "3", "-crf", "28", "-b:v", "0", "-g", String(Math.min(frameCount, fpsNumerator * 10)), "-auto-alt-ref", "0", "-row-mt", "0", "-tile-columns", "0", "-frame-parallel", "0", "-threads", "1", "-fflags", "+bitexact", "-flags:v", "+bitexact", "-metadata", "creation_time=1970-01-01T00:00:00Z", resolve(outputPath)], { maxBuffer: 32_000_000 });

const outputBytes = readFileSync(resolve(outputPath)), outputHash = sha256(outputBytes);
const probeRaw = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-count_frames", "-show_entries", "stream=codec_name,width,height,r_frame_rate,nb_read_frames:format=duration", "-of", "json", resolve(outputPath)], { encoding: "utf8", maxBuffer: 4_000_000 });
const probeJson = JSON.parse(probeRaw), stream = probeJson.streams?.[0] ?? {}, measuredDurationMs = Math.round(Number(probeJson.format?.duration) * 1000), measuredFrames = Number(stream.nb_read_frames);
if (stream.codec_name !== "vp9" || Number(stream.width) !== width || Number(stream.height) !== height || measuredFrames !== frameCount || Math.abs(measuredDurationMs - durationMs) > Math.ceil(2000 * fpsDenominator / fpsNumerator)) throw new Error("encoded canary probe does not match its exact contract");

const evidenceDirectory = `${resolve(outputPath)}.evidence`;
mkdirSync(evidenceDirectory, { recursive: true });
const roles = [["ENTRY", 0], ["MIDPOINT", Math.floor(durationMs / 2)], ["EXIT", Math.max(0, durationMs - Math.ceil(2000 * fpsDenominator / fpsNumerator))]];
const samples = roles.map(([role, timestampMs]) => {
    const path = join(evidenceDirectory, `${String(role).toLowerCase()}.png`);
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-ss", (Number(timestampMs) / 1000).toFixed(6), "-i", resolve(outputPath), "-frames:v", "1", "-c:v", "png", path], { maxBuffer: 8_000_000 });
    const bytes = readFileSync(path);
    return { role, path, storageKey: `STAGE_BEFORE_R2/${basename(path)}`, sha256: sha256(bytes), byteSize: bytes.byteLength, timestampMs: Number(timestampMs), width, height };
  });
process.stdout.write(JSON.stringify({
    contractVersion: "FACTORY_PIXEL_VIDEO_COMPOSITOR_EXECUTION_RECEIPT_V1",
    workerVersion: WORKER_VERSION,
    zeroDispatch: true,
    providerRequests: 0,
    spendMicros: 0,
    renderTape: { sha256: tapeFile.hash, byteSize: tapeFile.byteSize },
    dependencyHashes: sealed.map((segment) => ({ route: segment.route, sourceHash: segment.source.hash, byteSize: segment.source.byteSize })),
    output: { path: resolve(outputPath), mimeType: "video/webm", codec: "vp9", sha256: outputHash, byteSize: outputBytes.byteLength, width, height, frameRateNumerator: fpsNumerator, frameRateDenominator: fpsDenominator, frameCount: measuredFrames, durationMs: measuredDurationMs },
  samples,
}));
