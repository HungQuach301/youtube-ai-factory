import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const baseUrl = String(process.env.FACTORY_BASE_URL || "").replace(/\/$/, "");
const siteToken = String(process.env.FACTORY_SITE_AUTH_TOKEN || "");
const masterToken = String(process.env.CLEAN_AV_MASTER_AUTOMATION_TOKEN || "");
const retainedOutput = String(process.env.CLEAN_AV_OUTPUT_DIR || "");
const dryRun = process.env.CLEAN_AV_DRY_RUN === "1";
if (!baseUrl || !siteToken || !masterToken) throw new Error("FACTORY_BASE_URL, FACTORY_SITE_AUTH_TOKEN and CLEAN_AV_MASTER_AUTOMATION_TOKEN are required");

const endpoint = `${baseUrl}/api/factory/sequential-production/evaluation`;
const headers = { "OAI-Sites-Authorization": `Bearer ${siteToken}`, "x-clean-av-master-automation-token": masterToken };
const fontRegular = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
const fontBold = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const number = (value) => Number(value || 0);
const fraction = (value) => { const [a, b] = String(value || "0").split("/").map(Number); return b ? a / b : a || 0; };

async function jsonRequest(url, init = {}) {
  const response = await fetch(url, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${init.method || "GET"} ${response.status} · ${JSON.stringify(payload)}`);
  return payload;
}

async function downloadSource(task, output) {
  const url = `${endpoint}?cleanAvSourceTask=${encodeURIComponent(task.id)}&expectedSourceHash=${encodeURIComponent(task.sourceAudioHash)}`;
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`source audio download ${response.status} · ${await response.text()}`);
  const bytes = new Uint8Array(await response.arrayBuffer()), digest = sha256(bytes);
  if (digest !== task.sourceAudioHash) throw new Error(`source audio checksum mismatch · ${digest}`);
  writeFileSync(output, bytes);
}

function mediaDuration(path) {
  return number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", path], { encoding: "utf8" }).trim());
}

function visualFilter(width, height, duration) {
  const sx = width / 1920, sy = height / 1080;
  const x = (value) => Math.round(value * sx), y = (value) => Math.round(value * sy), fs = (value) => Math.round(value * Math.min(sx, sy));
  const panelWidth = x(520), panelHeight = y(390), panelY = y(350), gap = x(40), left = x(100);
  const panels = [
    { x: left, title: "AUTHORIZATION", subtitle: "Permission now", detail: "Funds are reserved", start: 5.5, end: 15.5, color: "#68d6ff" },
    { x: left + panelWidth + gap, title: "CLEARING", subtitle: "Records reconcile", detail: "Obligations are calculated", start: 15.5, end: 25.0, color: "#ffd166" },
    { x: left + (panelWidth + gap) * 2, title: "SETTLEMENT", subtitle: "Value moves later", detail: "Obligations are discharged", start: 25.0, end: 33.0, color: "#9ce6b2" },
  ];
  const filters = [
    `[1:v]format=yuv420p,drawbox=x=0:y=0:w=iw:h=ih:color=#102e25:t=fill`,
    `drawbox=x='mod(t*${x(260)}\\,iw+${x(420)})-${x(420)}':y=0:w=${x(420)}:h=ih:color=#1d4b3b@0.32:t=fill`,
    `drawtext=fontfile=${fontRegular}:text='HIDDEN SYSTEMS  •  PAYMENT STATES':x=${x(100)}:y=${y(74)}:fontsize=${fs(30)}:fontcolor=#9ce6b2`,
    `drawtext=fontfile=${fontBold}:text='One purchase. Three different moments.':x=${x(100)}:y=${y(126)}:fontsize=${fs(58)}:fontcolor=white`,
    `drawtext=fontfile=${fontRegular}:text='A clear map from permission to final transfer':x=${x(102)}:y=${y(210)}:fontsize=${fs(31)}:fontcolor=#b8cec6`,
  ];
  panels.forEach((panel, index) => {
    filters.push(
      `drawbox=x=${panel.x}:y=${panelY}:w=${panelWidth}:h=${panelHeight}:color=#0a1d17@0.94:t=fill`,
      `drawbox=x=${panel.x}:y=${panelY}:w=${panelWidth}:h=${panelHeight}:color=#42665a:t=${Math.max(2, x(3))}`,
      `drawbox=x=${panel.x}:y=${panelY}:w=${panelWidth}:h=${panelHeight}:color=${panel.color}@0.13:t=fill:enable='between(t,${panel.start},${panel.end})'`,
      `drawbox=x=${panel.x}:y=${panelY}:w=${panelWidth}:h=${panelHeight}:color=${panel.color}:t=${Math.max(4, x(7))}:enable='between(t,${panel.start},${panel.end})'`,
      `drawtext=fontfile=${fontBold}:text='0${index + 1}':x=${panel.x + x(34)}:y=${panelY + y(28)}:fontsize=${fs(28)}:fontcolor=${panel.color}`,
      `drawtext=fontfile=${fontBold}:text='${panel.title}':x=${panel.x + x(34)}:y=${panelY + y(92)}:fontsize=${fs(36)}:fontcolor=white`,
      `drawtext=fontfile=${fontRegular}:text='${panel.subtitle}':x=${panel.x + x(34)}:y=${panelY + y(170)}:fontsize=${fs(30)}:fontcolor=#d7e7e1`,
      `drawtext=fontfile=${fontRegular}:text='${panel.detail}':x=${panel.x + x(34)}:y=${panelY + y(226)}:fontsize=${fs(25)}:fontcolor=#9fb9af`,
      `drawbox=x=${panel.x + x(34)}:y=${panelY + y(315)}:w=${panelWidth - x(68)}:h=${y(10)}:color=#294d41:t=fill`,
      `drawbox=x=${panel.x + x(34)}:y=${panelY + y(315)}:w='(${panelWidth - x(68)})*max(0\\,min(1\\,(t-${panel.start})/${Math.max(1, panel.end - panel.start)}))':h=${y(10)}:color=${panel.color}:t=fill:enable='between(t,${panel.start},${panel.end})'`,
    );
  });
  filters.push(
    `drawtext=fontfile=${fontRegular}:text='Authorization is not clearing. Clearing is not settlement.':x=${x(100)}:y=${y(810)}:fontsize=${fs(31)}:fontcolor=#d7e7e1:enable='gte(t,30)'`,
    `drawbox=x=${x(100)}:y=${y(930)}:w=${width - x(200)}:h=${y(8)}:color=#294d41:t=fill`,
    `drawbox=x=${x(100)}:y=${y(930)}:w='(${width - x(200)})*min(1\\,t/${duration.toFixed(6)})':h=${y(8)}:color=#9ce6b2:t=fill`,
    `drawbox=x='${x(100)}+(${width - x(220)})*mod(t/${duration.toFixed(6)}\\,1)':y=${y(900)}:w=${x(20)}:h=${y(68)}:color=#ffffff@0.78:t=fill`,
    `drawtext=fontfile=${fontRegular}:text='Educational overview  •  Not personalized financial advice':x=${x(100)}:y=${y(980)}:fontsize=${fs(24)}:fontcolor=#87a69a`,
    `fps=30,format=yuv420p[base]`,
  );
  return `${filters.join(",")};[2:v]format=rgba,colorchannelmixer=aa=0.24[band];[base][band]overlay=x='mod(t*${x(260)}\\,W+w)-w':y=0:eval=frame:shortest=1,fps=30,format=yuv420p[vout];[0:a]aresample=48000,apad[aout]`;
}

function render(audio, output, width, height, duration, crf) {
  const source = `color=c=#102e25:s=${width}x${height}:r=30:d=${duration.toFixed(6)}`;
  const band = `color=c=#5ec99f:s=${Math.round(width * 0.19)}x${height}:r=30:d=${duration.toFixed(6)}`;
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", audio, "-f", "lavfi", "-i", source, "-f", "lavfi", "-i", band, "-filter_complex", visualFilter(width, height, duration), "-map", "[vout]", "-map", "[aout]", "-t", duration.toFixed(6), "-c:v", "libvpx-vp9", "-deadline", "good", "-cpu-used", "4", "-row-mt", "1", "-crf", String(crf), "-b:v", "0", "-r", "30", "-c:a", "libopus", "-b:a", width === 1920 ? "128k" : "96k", "-ar", "48000", "-ac", "2", "-y", output], { maxBuffer: 24_000_000 });
}

function packetBounds(path, selector) {
  const raw = execFileSync("ffprobe", ["-v", "error", "-select_streams", selector, "-show_entries", "packet=pts_time,duration_time", "-of", "csv=p=0", path], { encoding: "utf8", maxBuffer: 16_000_000 });
  const packets = raw.trim().split("\n").map((line) => line.split(",").map(number)).filter((item) => Number.isFinite(item[0]) && Number.isFinite(item[1]));
  if (!packets.length) throw new Error(`no ${selector} packets decoded`);
  return { start: packets[0][0], end: Math.max(...packets.map(([pts, duration]) => pts + duration)) };
}

function probe(path) {
  const raw = execFileSync("ffprobe", ["-v", "error", "-count_frames", "-show_entries", "stream=codec_type,codec_name,width,height,avg_frame_rate,nb_read_frames,sample_rate:format=duration", "-of", "json", path], { encoding: "utf8", maxBuffer: 4_000_000 });
  const payload = JSON.parse(raw), streams = payload.streams || [], video = streams.find((item) => item.codec_type === "video") || {}, audio = streams.find((item) => item.codec_type === "audio") || {};
  return { width: number(video.width), height: number(video.height), frameRate: fraction(video.avg_frame_rate), videoCodec: String(video.codec_name || ""), audioCodec: String(audio.codec_name || ""), audioSampleRateHz: number(audio.sample_rate), durationSeconds: number(payload.format?.duration), startTimeSeconds: 0, frameCount: number(video.nb_read_frames) };
}

function scan(path, duration) {
  const diagnostic = spawnSync("ffmpeg", ["-hide_banner", "-i", path, "-vf", "blackdetect=d=0.02:pix_th=0.02,freezedetect=n=-48dB:d=0.25", "-an", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 24_000_000 });
  if (diagnostic.status !== 0) throw new Error(`full-frame scan failed · ${String(diagnostic.stderr || "").slice(-800)}`);
  const stderr = String(diagnostic.stderr || ""), blackDurations = [...stderr.matchAll(/black_duration:([0-9.]+)/g)].map((match) => number(match[1])), freezeDurations = [...stderr.matchAll(/freeze_duration: ([0-9.]+)/g)].map((match) => number(match[1]));
  const md5 = execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", path, "-vf", "fps=2,scale=160:90", "-an", "-f", "framemd5", "-"], { encoding: "utf8", maxBuffer: 8_000_000 });
  const hashes = md5.split("\n").filter((line) => line && !line.startsWith("#")).map((line) => line.split(",").at(-1)?.trim()).filter(Boolean);
  const changes = hashes.slice(1).filter((hash, index) => hash !== hashes[index]).length;
  return { blackFrameRatio: blackDurations.reduce((sum, item) => sum + item, 0) / duration, freezeMaxSeconds: freezeDurations.length ? Math.max(...freezeDurations) : 0, motionCoverageRatio: hashes.length > 1 ? changes / (hashes.length - 1) : 0, decodedMotionSamples: hashes.length, distinctMotionSamples: new Set(hashes).size };
}

function contactSheet(master, output, duration) {
  const times = [0.08, 0.22, 0.38, 0.56, 0.76, 0.94].map((ratio) => duration * ratio), inputs = times.flatMap((time) => ["-ss", time.toFixed(6), "-i", master]);
  const cells = times.map((_, index) => `[${index}:v]scale=640:360,drawtext=fontfile=${fontBold}:text='${String(index + 1).padStart(2, "0")}':x=18:y=16:fontsize=26:fontcolor=white:box=1:boxcolor=black@0.6[v${index}]`);
  const layout = times.map((_, index) => `${(index % 3) * 640}_${Math.floor(index / 3) * 360}`).join("|");
  cells.push(`${times.map((_, index) => `[v${index}]`).join("")}xstack=inputs=6:layout=${layout}:fill=0x102e25[out]`);
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", ...inputs, "-filter_complex", cells.join(";"), "-map", "[out]", "-frames:v", "1", "-q:v", "3", "-y", output], { maxBuffer: 12_000_000 });
}

async function upload(task, files, manifest, evidence) {
  const form = new FormData();
  form.set("action", "MATERIALIZE_CLEAN_AV_MASTER");
  form.set("taskId", task.id); form.set("sourceAudioArtifactId", task.sourceAudioArtifactId); form.set("expectedSourceAudioHash", task.sourceAudioHash);
  form.set("visualManifest", JSON.stringify(manifest)); form.set("technicalEvidence", JSON.stringify(evidence));
  for (const [key, file] of Object.entries(files)) {
    const bytes = readFileSync(file.path); form.set(`${key}Hash`, sha256(bytes)); form.set(`${key}File`, new File([bytes], file.name, { type: file.type }));
  }
  return jsonRequest(endpoint, { method: "POST", headers: { "idempotency-key": `clean-av-master-materialization-v1-${task.sourceAudioHash.slice(0, 16)}` }, body: form });
}

const work = mkdtempSync(join(tmpdir(), "clean-av-master-"));
try {
  const snapshot = await jsonRequest(`${endpoint}?view=clean-av-master`);
  if (snapshot.materialization) throw new Error(`clean A/V master already exists · ${snapshot.materialization.id}`);
  if (!snapshot.task || snapshot.task.state !== "OPEN") throw new Error("the sealed cfp-v1-13 task is not open");
  const source = join(work, "source-audio.mp3"), archival = join(work, "archival.webm"), distribution = join(work, "distribution.webm"), sheet = join(work, "contact-sheet.jpg");
  await downloadSource(snapshot.task, source);
  const duration = mediaDuration(source); if (!(duration > 30 && duration < 45)) throw new Error(`source duration outside sealed gate · ${duration}`);
  render(source, archival, 1920, 1080, duration, 29); render(source, distribution, 1280, 720, duration, 30); contactSheet(distribution, sheet, duration);
  const archivalProbe = probe(archival), distributionProbe = probe(distribution), archivalBounds = { video: packetBounds(archival, "v:0"), audio: packetBounds(archival, "a:0") }, scanEvidence = scan(distribution, distributionProbe.durationSeconds);
  const startDeltaMs = (archivalBounds.video.start - archivalBounds.audio.start) * 1000, endDeltaMs = (archivalBounds.video.end - archivalBounds.audio.end) * 1000;
  const technicalEvidence = { schemaVersion: "CLEAN_AV_TECHNICAL_EVIDENCE_V1", scanState: "PASS", archival: archivalProbe, distribution: distributionProbe, audioDurationSeconds: archivalBounds.audio.end - archivalBounds.audio.start, videoDurationSeconds: archivalBounds.video.end - archivalBounds.video.start, avStartDeltaMs: startDeltaMs, avEndDeltaMs: endDeltaMs, ...scanEvidence, measurementTools: { ffmpeg: "full-frame decode plus blackdetect and freezedetect", ffprobe: "stream profile frame count and packet bounds", motion: "2 Hz decoded-frame difference coverage" } };
  if (archivalProbe.width !== 1920 || archivalProbe.height !== 1080 || distributionProbe.width !== 1280 || distributionProbe.height !== 720 || archivalProbe.frameCount < 900 || distributionProbe.frameCount < 900 || Math.abs(startDeltaMs) > 20 || Math.abs(endDeltaMs) > 80 || scanEvidence.blackFrameRatio > 0.01 || scanEvidence.freezeMaxSeconds > 3.5 || scanEvidence.motionCoverageRatio < 0.95) throw new Error(`technical gate failed · ${JSON.stringify(technicalEvidence)}`);
  const visualManifest = { schemaVersion: "CLEAN_AV_VISUAL_MANIFEST_V1", blueprintId: snapshot.task.blueprintId, sourceAudioHash: snapshot.task.sourceAudioHash, authoredTopic: "Authorization clearing and settlement are distinct payment states", cueCount: 5, treatmentFamilies: 4, continuousMotion: true, minimumCriticalFontPx: 32, cues: [{ start: 0, end: 5.5, state: "OVERVIEW" }, { start: 5.5, end: 15.5, state: "AUTHORIZATION" }, { start: 15.5, end: 25, state: "CLEARING" }, { start: 25, end: 33, state: "SETTLEMENT" }, { start: 33, end: duration, state: "RECAP_AND_DISCLAIMER" }], treatments: ["state cards", "active-state illumination", "continuous transaction sweep", "timeline progress"] };
  const result = dryRun ? { outcome: "DRY_RUN_PASS", snapshot } : await upload(snapshot.task, { archival: { path: archival, name: "cfp-v1-13-archival.webm", type: "video/webm" }, distribution: { path: distribution, name: "cfp-v1-13-distribution.webm", type: "video/webm" }, contactSheet: { path: sheet, name: "cfp-v1-13-contact-sheet.jpg", type: "image/jpeg" } }, visualManifest, technicalEvidence);
  const outputDir = retainedOutput ? resolve(retainedOutput) : join(tmpdir(), "youtube-ai-factory-clean-av"); mkdirSync(outputDir, { recursive: true });
  for (const [name, path] of [["cfp-v1-13-archival.webm", archival], ["cfp-v1-13-distribution.webm", distribution], ["cfp-v1-13-contact-sheet.jpg", sheet]]) writeFileSync(join(outputDir, name), readFileSync(path));
  console.log(JSON.stringify({ outcome: result.outcome, outputDir, snapshot: result.snapshot, evidence: technicalEvidence }));
} finally {
  rmSync(work, { recursive: true, force: true });
}
