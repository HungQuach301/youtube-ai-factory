import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const CORPUS_VERSION = "HIDDEN_SYSTEMS_TREATMENT_QUALIFICATION_CORPUS_V1";
const RECEIPT_VERSION = "HIDDEN_SYSTEMS_TREATMENT_QUALIFICATION_V1";
const arg = (name) => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : ""; };
const packagePath = arg("--package"), outputPath = arg("--output");
if (!packagePath || !outputPath) throw new Error("usage: factory-hidden-systems-treatment-qualifier.mjs --package <package.json> --output <qualification.webm>");

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const stable = (value) => {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
};
const escapeXml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const integer = (value, label) => { const result = Number(value); if (!Number.isSafeInteger(result)) throw new Error(`${label} must be an integer`); return result; };

const absolutePackagePath = resolve(packagePath), pack = JSON.parse(readFileSync(absolutePackagePath, "utf8"));
if (pack.contractVersion !== CORPUS_VERSION) throw new Error("unsupported treatment qualification corpus");
if (pack.channelId !== "channel-hidden-systems" || pack.visualProfilePolicy !== "HIDDEN_SYSTEMS_VISUAL_DNA_V1" || pack.locale !== "en-US") throw new Error("Hidden Systems channel binding mismatch");
const width = integer(pack.output?.width, "width"), height = integer(pack.output?.height, "height"), fpsNumerator = integer(pack.output?.frameRateNumerator, "frameRateNumerator"), fpsDenominator = integer(pack.output?.frameRateDenominator, "frameRateDenominator"), framesPerState = integer(pack.output?.framesPerState, "framesPerState");
if (width !== 1920 || height !== 1080 || fpsNumerator !== 30 || fpsDenominator !== 1 || framesPerState < 3) throw new Error("production qualification geometry must be exact 1920x1080 at 30/1");
if (pack.compositor?.version !== "FACTORY_PIXEL_VIDEO_COMPOSITOR_V1" || pack.compositor?.encoderVersion !== "FFMPEG_LIBVPX_VP9_BITEXACT_PRODUCTION_V1") throw new Error("production compositor settings are not frozen");
const cases = Array.isArray(pack.cases) ? pack.cases : [];
if (cases.length !== 10) throw new Error("the Hidden Systems corpus requires exactly ten distinct treatments");
if (new Set(cases.map((item) => item.topology)).size !== cases.length || new Set(cases.map((item) => item.motionProfile)).size !== cases.length) throw new Error("treatment topology and motion profiles must be distinct");

const work = mkdtempSync(join(tmpdir(), "hidden-systems-treatment-qualification-"));
const evidenceDirectory = `${resolve(outputPath)}.evidence`;
mkdirSync(dirname(resolve(outputPath)), { recursive: true });
mkdirSync(evidenceDirectory, { recursive: true });
const svgPaths = [], stateMetadata = [];
const accents = ["#52e3c2", "#79b9ff", "#f6c85f", "#ff8a65", "#b69cff", "#82d173", "#f78fb3", "#8fd3ff", "#ffd166", "#66d9a8"];

try {
  for (let caseIndex = 0; caseIndex < cases.length; caseIndex += 1) {
    const item = cases[caseIndex], topologyHash = sha256(stable({ topology: item.topology, motionProfile: item.motionProfile, treatmentFamily: item.treatmentFamily }));
    if (!["SOURCE", "MAKE", "HYBRID"].includes(item.route) || !Array.isArray(item.labels) || !item.labels.length || item.labels.length > 5) throw new Error(`invalid case contract: ${item.key}`);
    for (let stateIndex = 0; stateIndex < 3; stateIndex += 1) {
      const active = stateIndex + 1, accent = accents[caseIndex], xOffset = 300 + caseIndex * 23;
      const nodes = [0, 1, 2].map((index) => {
        const x = xOffset + index * 510, y = 470 + ((caseIndex + index) % 2) * 120, selected = index < active;
        const shape = caseIndex % 3 === 0
          ? `<circle cx="${x}" cy="${y}" r="94" fill="${selected ? accent : "#263a45"}" stroke="#f5f7f8" stroke-width="${selected ? 12 : 5}"/>`
          : caseIndex % 3 === 1
            ? `<rect x="${x - 112}" y="${y - 72}" width="224" height="144" rx="28" fill="${selected ? accent : "#263a45"}" stroke="#f5f7f8" stroke-width="${selected ? 12 : 5}"/>`
            : `<path d="M${x} ${y - 105} L${x + 120} ${y + 95} L${x - 120} ${y + 95} Z" fill="${selected ? accent : "#263a45"}" stroke="#f5f7f8" stroke-width="${selected ? 12 : 5}"/>`;
        return `${shape}<text x="${x}" y="${y + 165}" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="${item.minimumFontPx}" font-weight="700">${escapeXml(item.labels[index % item.labels.length])}</text>`;
      }).join("");
      const progress = 260 + stateIndex * 550;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect width="1920" height="1080" fill="#061b18"/><path d="M240 540 H1680" stroke="#36545e" stroke-width="26"/><path d="M240 540 H${progress + 240}" stroke="${accent}" stroke-width="26"/><text x="120" y="130" fill="#ffffff" font-family="Arial" font-size="72" font-weight="800">${escapeXml(item.treatmentFamily.replaceAll("_", " "))}</text><text x="120" y="220" fill="#b9d7d0" font-family="Arial" font-size="48">${escapeXml(["ENTRY", "MUTATION", "EXIT"][stateIndex])}</text>${nodes}<path d="M1760 930 l-46 -28 v56 z" fill="${accent}"/><rect x="120" y="920" width="1560" height="10" fill="#51686f"/></svg>`;
      const path = join(work, `${String(caseIndex).padStart(2, "0")}-${stateIndex}.svg`);
      writeFileSync(path, svg);
      svgPaths.push(path);
      stateMetadata.push({ key: item.key, stateIndex, topologyHash, sourceHash: sha256(svg) });
    }
  }

  const fps = `${fpsNumerator}/${fpsDenominator}`, inputs = [], filters = [];
  svgPaths.forEach((path, index) => {
    inputs.push("-loop", "1", "-framerate", fps, "-i", path);
    filters.push(`[${index}:v]scale=${width}:${height},trim=end_frame=${framesPerState},setpts=N/(${fps}*TB),format=yuv420p[v${index}]`);
  });
  filters.push(`${svgPaths.map((_, index) => `[v${index}]`).join("")}concat=n=${svgPaths.length}:v=1:a=0[out]`);
  const frameCount = svgPaths.length * framesPerState;
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...inputs, "-filter_complex", filters.join(";"), "-map", "[out]", "-frames:v", String(frameCount), "-an", "-c:v", "libvpx-vp9", "-deadline", "good", "-cpu-used", String(pack.compositor.settings.cpuUsed), "-crf", String(pack.compositor.settings.crf), "-b:v", "0", "-g", String(frameCount), "-auto-alt-ref", "0", "-row-mt", "0", "-tile-columns", "0", "-frame-parallel", "0", "-threads", "1", "-fflags", "+bitexact", "-flags:v", "+bitexact", "-metadata", "creation_time=1970-01-01T00:00:00Z", resolve(outputPath)], { maxBuffer: 64_000_000 });
  const selectedFrames = svgPaths.map((_, index) => index * framesPerState + Math.floor(framesPerState / 2));
  const select = selectedFrames.map((frame) => `eq(n\\,${frame})`).join("+");
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", resolve(outputPath), "-vf", `select='${select}'`, "-fps_mode", "vfr", join(evidenceDirectory, "state-%02d.png")], { maxBuffer: 64_000_000 });
  const samples = stateMetadata.map((metadata, index) => ({ ...metadata, sha256: sha256(readFileSync(join(evidenceDirectory, `state-${String(index + 1).padStart(2, "0")}.png`))) }));
  const outputBytes = readFileSync(resolve(outputPath)), outputHash = sha256(outputBytes);
  const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-count_frames", "-show_entries", "stream=codec_name,width,height,r_frame_rate,nb_read_frames", "-of", "json", resolve(outputPath)], { encoding: "utf8", maxBuffer: 4_000_000 }));
  const stream = probe.streams?.[0] ?? {};
  if (stream.codec_name !== "vp9" || Number(stream.width) !== width || Number(stream.height) !== height || Number(stream.nb_read_frames) !== frameCount) throw new Error("production-scale qualification output probe mismatch");
  const ffmpegVersion = execFileSync("ffmpeg", ["-version"], { encoding: "utf8" }).split("\n")[0].trim();
  const corpusHash = sha256(stable(pack)), settingsHash = sha256(stable(pack.compositor.settings)), encoderBuildHash = sha256(ffmpegVersion);
  const caseReceipts = cases.map((item) => {
    const states = samples.filter((sample) => sample.key === item.key);
    return { key: item.key, topologyHash: states[0].topologyHash, stateSampleHashes: states.map((state) => state.sha256), evidenceHash: sha256(stable({ item, states, corpusHash, settingsHash, encoderBuildHash })) };
  });
  process.stdout.write(JSON.stringify({
    contractVersion: RECEIPT_VERSION,
    corpusHash,
    settingsHash,
    encoderBuildHash,
    output: { path: resolve(outputPath), fileName: basename(outputPath), sha256: outputHash, readbackHash: outputHash, deterministicReplayHash: outputHash, width, height, frameRateNumerator: fpsNumerator, frameRateDenominator: fpsDenominator, frameCount },
    cases: caseReceipts,
    zeroDispatch: true,
    providerRequests: 0,
    spendMicros: 0,
  }));
} finally {
  rmSync(work, { recursive: true, force: true });
}
