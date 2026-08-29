"use client";

import { useState } from "react";

export function AudioPreflightControl() {
  const [state, setState] = useState<"IDLE" | "RUNNING" | "FAILED">("IDLE");
  const [message, setMessage] = useState("");

  async function preflight() {
    setState("RUNNING");
    setMessage("");
    try {
      const response = await fetch("/api/factory/runtime", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "PREFLIGHT_ASSURANCE_CONTROLLED_FIXTURE_AUDIO_BATCH",
          idempotencyKey: "assurance-fixture-audio-preflight-live-0001",
          evaluatedAt: "2026-08-29T00:00:00.000Z",
          providerRequests: 0,
          spendUsd: 0,
        }),
      });
      const result = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message || "Audio preflight failed");
      window.location.reload();
    } catch (error) {
      setState("FAILED");
      setMessage(error instanceof Error ? error.message : "Audio preflight failed");
    }
  }

  return <div className="qaAction">
    <button type="button" onClick={preflight} disabled={state === "RUNNING"}>
      {state === "RUNNING" ? "Recording zero-provider preflight…" : "Record audio preflight"}
    </button>
    <span>Creates one PLAN_ONLY typed contract and cost envelope; no provider request or reservation.</span>
    {state === "FAILED" && <code>{message}</code>}
  </div>;
}
