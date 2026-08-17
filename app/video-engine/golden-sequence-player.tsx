"use client";

import { useEffect, useState } from "react";

type Asset = { role: string; shot_id?: string; temporal_state?: string; url: string };
type Golden = { state: string; durationSeconds: number; manifest: { shots?: { goldenShotId?: string; durationSeconds?: number }[] }; assets: Asset[] };

export function GoldenSequencePlayer() {
  const [golden, setGolden] = useState<Golden | null | undefined>(), [time, setTime] = useState(0);
  useEffect(() => { fetch("/api/factory/sequential-production/quality", { cache: "no-store" }).then((response) => response.ok ? response.json() : Promise.reject()).then((payload) => setGolden(payload.golden)).catch(() => setGolden(null)); }, []);
  const shots = golden?.manifest.shots || [], total = shots.reduce((sum, shot) => sum + Number(shot.durationSeconds || 0), 0); let cursor = 0, active = shots[0], local = 0;
  for (const shot of shots) { const duration = Number(shot.durationSeconds || 1); if (time * total / Math.max(golden?.durationSeconds || 1, 1) <= cursor + duration) { active = shot; local = time * total / Math.max(golden?.durationSeconds || 1, 1) - cursor; break; } cursor += duration; }
  const duration = Number(active?.durationSeconds || 1), state = local < duration / 3 ? "ENTRY" : local < duration * 2 / 3 ? "MIDPOINT" : "EXIT", assets = golden?.assets || [], frame = assets.find((asset) => asset.role === "TEMPORAL_FRAME" && asset.shot_id === active?.goldenShotId && asset.temporal_state === state), mix = assets.find((asset) => asset.role === "AUDIENCE_MIX");
  if (golden === undefined) return <div className="goldenEmpty">Loading pixel evidence…</div>;
  if (!golden) return <div className="goldenEmpty">Golden sequence is not ready.</div>;
  return <div className="goldenPlayer"><div className="goldenFrame">{frame && <img src={frame.url} alt="Golden-sequence frame" />}<b>{golden.state}</b></div>{mix && <audio controls preload="metadata" src={mix.url} onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)} />}<small>{golden.durationSeconds.toFixed(2)} seconds · PNG pixels + 48 kHz mix</small></div>;
}
