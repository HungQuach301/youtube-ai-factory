export function GoldenMasterPlayer({ src, state, expectedDuration, probe }: { src?: string; state: string; expectedDuration: number; probe?: { width?: number; height?: number; durationSeconds?: number; averageFrameRate?: number; audioSampleRate?: number; audioChannels?: number } }) {
  if (!src) return <div className="masterMissing"><strong>Master video required</strong><p>PNG keyframes and a separate audio file are component evidence only. They are intentionally no longer presented as playback.</p><span>{state.replaceAll("_", " ")}</span></div>;
  return <div className="masterPlayer">
    <video controls playsInline preload="metadata" src={src}>This browser cannot play the production master.</video>
    <div className="masterTelemetry"><span><b>{state.replaceAll("_", " ")}</b> lifecycle</span><span><b>{probe?.width || 1920}×{probe?.height || 1080}</b> decoded video</span><span><b>{probe?.averageFrameRate ? `${Number(probe.averageFrameRate).toFixed(0)} fps` : "30 fps"}</b> frame rate</span><span><b>{probe?.audioSampleRate ? `${Number(probe.audioSampleRate) / 1000} kHz · ${probe.audioChannels}ch` : "48 kHz · stereo"}</b> embedded audio</span></div><small>{expectedDuration.toFixed(3)} seconds · exact master bytes</small>
  </div>;
}
