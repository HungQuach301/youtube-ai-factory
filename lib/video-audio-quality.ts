export type PcmMeasurement = {
  sampleRate: number;
  channels: number;
  samples: number;
  durationSeconds: number;
  peakDbfs: number;
  rmsDbfs: number;
  integratedLufs: number;
  truePeakDbtp: number;
  silenceRatio: number;
  pauseCount: number;
  medianPauseMs: number;
  estimatedMedianPitchHz: number;
  pitchRangeSemitones: number;
  corruptSampleRatio: number;
};

const db = (value: number) => 20 * Math.log10(Math.max(value, 1e-9));
const median = (values: number[]) => {
  if (!values.length) return 0;
  const ordered = [...values].sort((a, b) => a - b), middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
};

function pitchAt(pcm: Int16Array, sampleRate: number, start: number) {
  const size = Math.min(2048, pcm.length - start);
  if (size < 1024) return 0;
  let energy = 0;
  for (let index = 0; index < size; index += 1) { const value = pcm[start + index] / 32768; energy += value * value; }
  if (energy / size < 0.00008) return 0;
  const minimumLag = Math.floor(sampleRate / 320), maximumLag = Math.min(Math.floor(sampleRate / 70), size - 2);
  let bestLag = 0, best = -Infinity;
  for (let lag = minimumLag; lag <= maximumLag; lag += 2) {
    let correlation = 0;
    for (let index = 0; index < size - lag; index += 1) correlation += pcm[start + index] * pcm[start + index + lag];
    if (correlation > best) { best = correlation; bestLag = lag; }
  }
  return bestLag ? sampleRate / bestLag : 0;
}

export function measurePcm16Mono(pcm: Int16Array, sampleRate: number): PcmMeasurement {
  let peak = 0, sum = 0, silent = 0, corrupt = 0, pauseStart = -1;
  const pauses: number[] = [], pitches: number[] = [];
  for (let index = 0; index < pcm.length; index += 1) {
    const value = Math.abs(pcm[index]) / 32768;
    peak = Math.max(peak, value); sum += value * value;
    if (value < 0.003) { silent += 1; if (pauseStart < 0) pauseStart = index; }
    else if (pauseStart >= 0) { const ms = (index - pauseStart) * 1000 / sampleRate; if (ms >= 80) pauses.push(ms); pauseStart = -1; }
    if (!Number.isFinite(value)) corrupt += 1;
  }
  for (let start = 0; start + 2048 < pcm.length; start += Math.max(2048, Math.floor(sampleRate * 0.25))) {
    const pitch = pitchAt(pcm, sampleRate, start); if (pitch >= 70 && pitch <= 320) pitches.push(pitch);
  }
  const rms = Math.sqrt(sum / Math.max(1, pcm.length)), pitchLow = pitches.length ? Math.min(...pitches) : 0, pitchHigh = pitches.length ? Math.max(...pitches) : 0;
  return {
    sampleRate, channels: 1, samples: pcm.length, durationSeconds: pcm.length / sampleRate,
    peakDbfs: db(peak), rmsDbfs: db(rms), integratedLufs: db(rms) - 0.7,
    truePeakDbtp: db(peak), silenceRatio: silent / Math.max(1, pcm.length), pauseCount: pauses.length,
    medianPauseMs: median(pauses), estimatedMedianPitchHz: median(pitches),
    pitchRangeSemitones: pitchLow && pitchHigh ? 12 * Math.log2(pitchHigh / pitchLow) : 0,
    corruptSampleRatio: corrupt / Math.max(1, pcm.length),
  };
}

export function evaluateVoiceAndMix(input: {
  narration: PcmMeasurement;
  mix: PcmMeasurement;
  words: number;
  transcriptMismatchRatio: number;
  seamDiscontinuities: number;
  pronunciationFailures: string[];
}) {
  const wpm = input.words / Math.max(input.narration.durationSeconds / 60, 1 / 60);
  const checks = [
    { id: "TRANSCRIPT", pass: input.transcriptMismatchRatio < 0.01, value: input.transcriptMismatchRatio, hard: true },
    { id: "PRONUNCIATION", pass: input.pronunciationFailures.length === 0, value: input.pronunciationFailures, hard: true },
    { id: "SEAMS", pass: input.seamDiscontinuities === 0, value: input.seamDiscontinuities, hard: true },
    { id: "CORRUPTION", pass: input.narration.corruptSampleRatio === 0, value: input.narration.corruptSampleRatio, hard: true },
    { id: "WPM", pass: wpm >= 125 && wpm <= 170, value: wpm, hard: false },
    { id: "PITCH_RANGE", pass: input.narration.pitchRangeSemitones >= 2 && input.narration.pitchRangeSemitones <= 12, value: input.narration.pitchRangeSemitones, hard: false },
    { id: "INTEGRATED_LOUDNESS", pass: input.mix.integratedLufs >= -15 && input.mix.integratedLufs <= -13, value: input.mix.integratedLufs, hard: true },
    { id: "TRUE_PEAK", pass: input.mix.truePeakDbtp <= -1, value: input.mix.truePeakDbtp, hard: true },
  ];
  return { status: checks.some((check) => check.hard && !check.pass) ? "FAIL" as const : "PASS" as const, wpm, checks };
}
